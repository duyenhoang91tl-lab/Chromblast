const { setGlobalOptions } = require('firebase-functions/v2');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { filterText, containsProfanity } = require('./profanity-filter.js');
admin.initializeApp();
// Đặt vùng mặc định cho toàn bộ function trong file này — nên trùng với
// vùng của Cloud Firestore trong dự án Firebase để giảm độ trễ.
setGlobalOptions({ region: 'asia-southeast1' });
/**
 * Kiểm duyệt 1 tin nhắn chat: nếu chứa từ thô tục, ghi đè lại nội dung đã
 * được che (giữ nguyên độ dài) và đánh dấu moderated=true.
 * Chạy bằng quyền admin nên vẫn xử lý được kể cả khi client bỏ qua bộ lọc
 * ở app (ví dụ do sửa code, gọi thẳng Firestore SDK).
 */
async function moderateMessage(snap) {
  if (!snap) return null;
  const data = snap.data();
  const text = data && typeof data.text === 'string' ? data.text : '';
  if (!text || !containsProfanity(text)) return null;
  const cleaned = filterText(text);
  if (cleaned === text) return null;
  return snap.ref.update({
    text: cleaned,
    moderated: true,
    moderatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
exports.moderateWorldChat = onDocumentCreated(
  'worldChat/global/messages/{msgId}',
  (event) => moderateMessage(event.data)
);
exports.moderateRoomChat = onDocumentCreated(
  'rooms/{roomId}/chat/{msgId}',
  (event) => moderateMessage(event.data)
);
exports.moderateDmChat = onDocumentCreated(
  'dms/{dmId}/messages/{msgId}',
  (event) => moderateMessage(event.data)
);

// ═══════════════════════════════════════════════════════════════
// Ghi điểm số qua Cloud Function (Admin SDK) — client chỉ được đọc
// periodScores/players.<field điểm>, không được ghi trực tiếp nữa.
// Xem firestore.rules: scoreFieldsUnchanged() + periodScores entries create/update: false
// ═══════════════════════════════════════════════════════════════

function pad2(n) { return String(n).padStart(2, '0'); }

function isoWeekId(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return date.getUTCFullYear() + '-W' + pad2(weekNo);
}

function periodKey(kind, when) {
  const d = when ? new Date(when) : new Date();
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  if (kind === 'day') return 'd-' + y + '-' + pad2(m) + '-' + pad2(day);
  if (kind === 'week') return 'w-' + isoWeekId(d);
  if (kind === 'month') return 'm-' + y + '-' + pad2(m);
  return periodKey('day', when);
}

/**
 * Đánh dấu bắt đầu 1 ván chơi đơn — ghi mốc thời gian server (client không sửa được,
 * xem firestore.rules: fieldLocked('currentRunStartedAt')). submitSoloScore dùng mốc
 * này để tính điểm/giây tối đa hợp lý, chặn kiểu gọi thẳng submitSoloScore với điểm
 * khống mà không thực sự chơi.
 */
exports.startSoloRun = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  await admin.firestore().collection('players').doc(uid).set({
    currentRunStartedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return { ok: true };
});

/**
 * Ghi điểm chơi đơn (BXH toàn cầu + BXH kỳ ngày/tuần/tháng).
 * Chạy bằng Admin SDK nên không bị Firestore Rules chặn, kể cả khi
 * client đã bị khoá quyền ghi trực tiếp vào players/periodScores.
 */
exports.submitSoloScore = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');

  const rawScore = Number(request.data && request.data.score);
  const score = Math.floor(rawScore);
  if (!(score > 0) || score > 100000000) {
    throw new HttpsError('invalid-argument', 'Điểm số không hợp lệ.');
  }

  const region = (request.data && request.data.region) || {};
  const country = typeof region.country === 'string' ? region.country.slice(0, 3) : 'VN';
  const continent = typeof region.continent === 'string' ? region.continent.slice(0, 3) : 'AS';

  const db = admin.firestore();
  const playerRef = db.collection('players').doc(uid);
  const playerSnap = await playerRef.get();
  const playerData = playerSnap.exists ? playerSnap.data() : {};

  // Chống báo điểm khống: giới hạn điểm/giây theo thời gian chơi THỰC (tính từ mốc
  // server ghi lúc startSoloRun, client không giả được). Mức 60 điểm/giây đã rất
  // rộng rãi so với tốc độ ghi điểm thật của game (1 ô = 1 điểm, x2/x3 theo combo),
  // chỉ để chặn kiểu gọi thẳng function nộp điểm khống tức thời — không phải verify
  // toàn bộ gameplay (muốn chặn 100% phải chấm lại ván chơi phía server).
  const MAX_POINTS_PER_SEC = 60;
  const startedAt = playerData.currentRunStartedAt;
  const elapsedSec = (startedAt && typeof startedAt.toMillis === 'function')
    ? (Date.now() - startedAt.toMillis()) / 1000
    : 0;
  if (!(elapsedSec > 0) || score > Math.ceil(elapsedSec * MAX_POINTS_PER_SEC)) {
    throw new HttpsError('failed-precondition', 'Điểm không hợp lệ so với thời gian chơi — hãy vào ván mới trước khi nộp điểm.');
  }

  const prevBest = playerData.bestScore || 0;
  const displayName = playerData.displayName || 'Player';
  const avatar = playerData.avatar || '🐶';

  if (score > prevBest) {
    await playerRef.set({
      bestScore: score,
      country, continent,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  const kinds = ['day', 'week', 'month'];
  await Promise.all(kinds.map(async (kind) => {
    const pid = periodKey(kind);
    const entryRef = db.collection('periodScores').doc(pid).collection('entries').doc(uid);
    const entrySnap = await entryRef.get();
    const prev = entrySnap.exists ? (entrySnap.data().score || 0) : 0;
    if (score > prev) {
      await entryRef.set({
        uid, name: displayName, avatar, score, country, continent,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }));

  return { ok: true, bestScore: Math.max(score, prevBest) };
});

/**
 * Cộng điểm/thắng-thua sau khi trận đấu kết thúc (Caro & Versus).
 * Kích hoạt khi doc rooms chuyển trạng thái sang 'finished'; chạy bằng
 * Admin SDK để không phụ thuộc quyền ghi của client trên players/{uid}.
 */
exports.applyMatchResult = onDocumentUpdated(
  { document: 'rooms/{roomId}', region: 'asia-southeast1' },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return null;
    if (before.status === 'finished' || after.status !== 'finished') return null;
    if (after.statsApplied) return null;

    const db = admin.firestore();
    const hostId = after.hostId, guestId = after.guestId;
    if (!hostId || !guestId) return null;

    if (after.gameType === 'caro') {
      const winnerId = after.winnerId || null;
      const isDraw = !!after.isDraw;
      const applyPlayer = async (uid, outcome) => {
        if (!uid) return;
        const patch = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        if (outcome === 'win') {
          patch.caroWins = admin.firestore.FieldValue.increment(1);
          patch.caroPoints = admin.firestore.FieldValue.increment(25);
        } else if (outcome === 'loss') {
          patch.caroLosses = admin.firestore.FieldValue.increment(1);
        } else if (outcome === 'draw') {
          patch.caroDraws = admin.firestore.FieldValue.increment(1);
          patch.caroPoints = admin.firestore.FieldValue.increment(8);
        } else return;
        await db.collection('players').doc(uid).set(patch, { merge: true });
      };
      if (isDraw) {
        await applyPlayer(hostId, 'draw');
        await applyPlayer(guestId, 'draw');
      } else if (winnerId === hostId) {
        await applyPlayer(hostId, 'win');
        await applyPlayer(guestId, 'loss');
      } else if (winnerId === guestId) {
        await applyPlayer(guestId, 'win');
        await applyPlayer(hostId, 'loss');
      }
    } else {
      const hostScore = Number(after.hostScore) || 0;
      const guestScore = Number(after.guestScore) || 0;
      const winnerId = after.winnerId || null;
      const updates = [
        { id: hostId, win: winnerId === hostId, draw: !winnerId, score: hostScore },
        { id: guestId, win: winnerId === guestId, draw: !winnerId, score: guestScore }
      ];
      await Promise.all(updates.map(async (u) => {
        if (!u.id) return;
        const pts = u.win ? 30 : (u.draw ? 5 : 0);
        const ref = db.collection('players').doc(u.id);
        const snap = await ref.get();
        const prevBest = snap.exists ? (snap.data().bestPvpScore || 0) : 0;
        const patch = {
          pvpPoints: admin.firestore.FieldValue.increment(pts),
          wins: admin.firestore.FieldValue.increment(u.win ? 1 : 0),
          losses: admin.firestore.FieldValue.increment(!u.win && !u.draw ? 1 : 0),
          draws: admin.firestore.FieldValue.increment(u.draw ? 1 : 0),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (u.score > prevBest) patch.bestPvpScore = u.score;
        await ref.set(patch, { merge: true });
      }));
    }

    await event.data.after.ref.set({ statsApplied: true }, { merge: true }).catch(() => {});
    return null;
  }
);
