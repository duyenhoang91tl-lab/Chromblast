const { setGlobalOptions } = require('firebase-functions/v2');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { filterText, containsProfanity } = require('./profanity-filter.js');
const crypto = require('crypto');
initializeApp();
// Dùng API modular (getFirestore/FieldValue) thay vì admin.firestore() namespace cũ —
// trên firebase-admin@14 kiểu namespace cũ báo lỗi "admin.firestore is not a function"
// (namespace không còn tự đăng ký khi chỉ require('firebase-admin') trơn).
const db = getFirestore();
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
    moderatedAt: FieldValue.serverTimestamp()
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
  await db.collection('players').doc(uid).set({
    currentRunStartedAt: FieldValue.serverTimestamp()
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
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  const kinds = ['day', 'week', 'month'];
  const overtakeNotifs = [];
  await Promise.all(kinds.map(async (kind) => {
    const pid = periodKey(kind);
    const entryRef = db.collection('periodScores').doc(pid).collection('entries').doc(uid);
    const entrySnap = await entryRef.get();
    const prev = entrySnap.exists ? (entrySnap.data().score || 0) : 0;
    if (score > prev) {
      await entryRef.set({
        uid, name: displayName, avatar, score, country, continent,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      // Chỉ xét "vượt hạng" khi đã từng có điểm trong kỳ này trước đó (prev > 0) —
      // tránh spam thông báo cho cả trăm người khi kỳ mới bắt đầu và ai đó nộp
      // điểm đầu tiên (lúc đó "khoảng cách" 0→score sẽ trùng gần hết bảng xếp hạng).
      if (prev > 0) {
        try {
          const passedSnap = await db.collection('periodScores').doc(pid).collection('entries')
            .where('score', '>', prev)
            .where('score', '<=', score)
            .limit(6)
            .get();
          passedSnap.forEach((doc) => {
            if (doc.id === uid) return;
            overtakeNotifs.push({ overtakenUid: doc.id, kind, pid });
          });
        } catch (e) {
          // Không chặn việc nộp điểm nếu bước thông báo lỗi (vd: index chưa sẵn sàng).
        }
      }
    }
  }));

  if (overtakeNotifs.length) {
    const batch = db.batch();
    overtakeNotifs.forEach((n) => {
      const ref = db.collection('players').doc(n.overtakenUid).collection('notifications').doc();
      batch.set(ref, {
        type: 'lb_overtaken',
        kind: n.kind,
        periodId: n.pid,
        byUid: uid,
        byName: displayName,
        byAvatar: avatar,
        byScore: score,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });
    });
    await batch.commit().catch(() => {});
  }

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

    const hostId = after.hostId, guestId = after.guestId;
    if (!hostId || !guestId) return null;

    if (after.gameType === 'caro') {
      const winnerId = after.winnerId || null;
      const isDraw = !!after.isDraw;
      const applyPlayer = async (uid, outcome) => {
        if (!uid) return;
        const patch = { updatedAt: FieldValue.serverTimestamp() };
        if (outcome === 'win') {
          patch.caroWins = FieldValue.increment(1);
          patch.caroPoints = FieldValue.increment(25);
        } else if (outcome === 'loss') {
          patch.caroLosses = FieldValue.increment(1);
          // Thua trừ điểm đối xứng với thắng (-25), nhưng không cho xuống âm — Firestore
          // increment() không tự chặn được ở 0 nên phải đọc điểm hiện tại rồi tính bằng tay.
          const playerRef = db.collection('players').doc(uid);
          const playerSnap = await playerRef.get();
          const currentPts = (playerSnap.exists && Number(playerSnap.data().caroPoints)) || 0;
          patch.caroPoints = Math.max(0, currentPts - 25);
        } else if (outcome === 'draw') {
          patch.caroDraws = FieldValue.increment(1);
          patch.caroPoints = FieldValue.increment(8);
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
        const ref = db.collection('players').doc(u.id);
        const snap = await ref.get();
        const prevBest = snap.exists ? (snap.data().bestPvpScore || 0) : 0;
        const patch = {
          pvpWins: FieldValue.increment(u.win ? 1 : 0),
          pvpLosses: FieldValue.increment(!u.win && !u.draw ? 1 : 0),
          pvpDraws: FieldValue.increment(u.draw ? 1 : 0),
          updatedAt: FieldValue.serverTimestamp()
        };
        if (u.win) {
          patch.pvpPoints = FieldValue.increment(25);
        } else if (!u.draw) {
          // Thua trừ điểm đối xứng với thắng (-25), sàn 0 — giống công thức Caro,
          // phải đọc điểm hiện tại rồi tính bằng tay vì increment() không tự chặn ở 0.
          const currentPts = (snap.exists && Number(snap.data().pvpPoints)) || 0;
          patch.pvpPoints = Math.max(0, currentPts - 25);
        }
        // Hoà: +0 điểm, không cần patch.pvpPoints.
        if (u.score > prevBest) patch.bestPvpScore = u.score;
        await ref.set(patch, { merge: true });
      }));
    }

    await event.data.after.ref.set({ statsApplied: true }, { merge: true }).catch(() => {});
    return null;
  }
);

// ═══════════════════════════════════════════════════════════════
// TÀI KHOẢN ĐĂNG NHẬP CỤC BỘ (js/auth.js) — nay lưu ở Firestore (localAccounts)
// thay vì chỉ localStorage, để không mất khi xoá cache/dùng ẩn danh.
// Mật khẩu & câu trả lời bảo mật KHÔNG bao giờ lưu ở dạng chữ thường/đọc được —
// chỉ lưu hash (scrypt + salt riêng từng tài khoản). Toàn bộ đọc/ghi collection
// này chỉ chạy qua Admin SDK ở đây; client không có quyền đọc/ghi trực tiếp
// (xem firestore.rules: match /localAccounts/{doc} { allow read, write: if false }).
// ═══════════════════════════════════════════════════════════════
const ACCOUNTS_COLLECTION = 'localAccounts';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // khoá tạm 15 phút sau khi sai quá 5 lần

function _isLocked(u) {
  return !!(u.lockedUntil && typeof u.lockedUntil.toMillis === 'function' && u.lockedUntil.toMillis() > Date.now());
}
/** Ghi nhận 1 lần nhập sai (mật khẩu hoặc câu trả lời bảo mật) — khoá tạm nếu chạm mốc 5 lần. */
async function _recordFailedAttempt(ref, u) {
  const attempts = (u.failedAttempts || 0) + 1;
  const patch = { failedAttempts: attempts };
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    patch.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }
  await ref.update(patch).catch(() => {});
}
/** Xoá đếm sai sau khi xác thực đúng (đăng nhập / đổi mật khẩu / quên mật khẩu thành công). */
async function _clearFailedAttempts(ref) {
  await ref.update({ failedAttempts: 0, lockedUntil: FieldValue.delete() }).catch(() => {});
}

function _hashSecret(raw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(raw), salt, 64).toString('hex');
  return { hash, salt };
}
function _verifySecret(raw, hash, salt) {
  if (!hash || !salt) return false;
  try {
    const check = crypto.scryptSync(String(raw), salt, 64);
    const stored = Buffer.from(hash, 'hex');
    return stored.length === check.length && crypto.timingSafeEqual(stored, check);
  } catch (e) { return false; }
}

/** Đăng ký tài khoản mới. Trả về {ok, username, role}. */
exports.registerAccount = onCall({ region: 'asia-southeast1' }, async (request) => {
  const data = request.data || {};
  const username = typeof data.username === 'string' ? data.username.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';
  const secQ = typeof data.secQ === 'string' ? data.secQ : '';
  const secA = typeof data.secA === 'string' ? data.secA.trim().toLowerCase() : '';

  if (username.length < 3) throw new HttpsError('invalid-argument', 'errUserShort');
  if (password.length < 6) throw new HttpsError('invalid-argument', 'errPassShort');
  if (!secA) throw new HttpsError('invalid-argument', 'errFillAll');

  const key = username.toLowerCase();
  const ref = db.collection(ACCOUNTS_COLLECTION).doc(key);
  const snap = await ref.get();
  if (snap.exists) throw new HttpsError('already-exists', 'errUserExists');

  const pw = _hashSecret(password);
  const sa = _hashSecret(secA);
  await ref.set({
    username, role: 'user', secQ,
    passwordHash: pw.hash, passwordSalt: pw.salt,
    secAHash: sa.hash, secASalt: sa.salt,
    createdAt: FieldValue.serverTimestamp()
  });
  return { ok: true, username, role: 'user' };
});

/** Đăng nhập. Trả về {ok, username, role}. */
exports.loginAccount = onCall({ region: 'asia-southeast1' }, async (request) => {
  const data = request.data || {};
  const username = typeof data.username === 'string' ? data.username.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';
  if (!username || !password) throw new HttpsError('invalid-argument', 'errFillAll');

  const ref = db.collection(ACCOUNTS_COLLECTION).doc(username.toLowerCase());
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'errWrongLogin');
  const u = snap.data();
  if (_isLocked(u)) throw new HttpsError('resource-exhausted', 'errAccountLocked');
  if (!_verifySecret(password, u.passwordHash, u.passwordSalt)) {
    await _recordFailedAttempt(ref, u);
    throw new HttpsError('permission-denied', 'errWrongLogin');
  }
  await _clearFailedAttempts(ref);
  return { ok: true, username: u.username, role: u.role || 'user' };
});

/** Đổi mật khẩu khi đã đăng nhập (biết mật khẩu cũ). */
exports.changeAccountPassword = onCall({ region: 'asia-southeast1' }, async (request) => {
  const data = request.data || {};
  const username = typeof data.username === 'string' ? data.username.trim() : '';
  const oldPassword = typeof data.oldPassword === 'string' ? data.oldPassword : '';
  const newPassword = typeof data.newPassword === 'string' ? data.newPassword : '';
  if (!username || !oldPassword) throw new HttpsError('invalid-argument', 'errFillAll');
  if (newPassword.length < 6) throw new HttpsError('invalid-argument', 'errPassShort');

  const ref = db.collection(ACCOUNTS_COLLECTION).doc(username.toLowerCase());
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'errWrongLogin');
  const u = snap.data();
  if (_isLocked(u)) throw new HttpsError('resource-exhausted', 'errAccountLocked');
  if (!_verifySecret(oldPassword, u.passwordHash, u.passwordSalt)) {
    await _recordFailedAttempt(ref, u);
    throw new HttpsError('permission-denied', 'errWrongLogin');
  }
  await _clearFailedAttempts(ref);
  const pw = _hashSecret(newPassword);
  await ref.update({ passwordHash: pw.hash, passwordSalt: pw.salt });
  return { ok: true };
});

/** Bước 1 quên mật khẩu: trả về câu hỏi bảo mật nếu tài khoản tồn tại. */
exports.findAccountSecurityQuestion = onCall({ region: 'asia-southeast1' }, async (request) => {
  const username = typeof (request.data && request.data.username) === 'string' ? request.data.username.trim() : '';
  if (!username) throw new HttpsError('invalid-argument', 'errFillAll');
  const ref = db.collection(ACCOUNTS_COLLECTION).doc(username.toLowerCase());
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'errUserNotFound');
  const u = snap.data();
  if (_isLocked(u)) throw new HttpsError('resource-exhausted', 'errAccountLocked');
  if (!u.secQ) throw new HttpsError('failed-precondition', 'errNoSecurityQ');
  return { ok: true, secQ: u.secQ };
});

/** Bước 2 quên mật khẩu: xác minh câu trả lời rồi đặt mật khẩu mới. */
exports.resetAccountPassword = onCall({ region: 'asia-southeast1' }, async (request) => {
  const data = request.data || {};
  const username = typeof data.username === 'string' ? data.username.trim() : '';
  const answer = typeof data.answer === 'string' ? data.answer.trim().toLowerCase() : '';
  const newPassword = typeof data.newPassword === 'string' ? data.newPassword : '';
  if (!username) throw new HttpsError('invalid-argument', 'errFillAll');
  if (newPassword.length < 6) throw new HttpsError('invalid-argument', 'errPassShort');

  const ref = db.collection(ACCOUNTS_COLLECTION).doc(username.toLowerCase());
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'errUserNotFound');
  const u = snap.data();
  if (_isLocked(u)) throw new HttpsError('resource-exhausted', 'errAccountLocked');
  if (!_verifySecret(answer, u.secAHash, u.secASalt)) {
    await _recordFailedAttempt(ref, u);
    throw new HttpsError('permission-denied', 'errWrongAnswer');
  }
  await _clearFailedAttempts(ref);
  const pw = _hashSecret(newPassword);
  await ref.update({ passwordHash: pw.hash, passwordSalt: pw.salt });
  return { ok: true };
});
