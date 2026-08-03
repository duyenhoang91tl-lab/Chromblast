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

  // Mốc "đã chơi 1 ván" — kích hoạt thưởng referral nếu người này được ai đó mời.
  // Đặt tại đây (không phải lúc nhập mã) để tránh tạo tài khoản ảo nhập mã rồi
  // thoát ngay farm thưởng — phải chơi xong 1 ván nộp điểm thật mới được cộng.
  if (playerData.referredBy && playerData.referralRewardPending) {
    const referrerUid = playerData.referredBy;
    const today = new Date().toISOString().slice(0, 10);
    const capRef = db.collection('referralCaps').doc(referrerUid + '_' + today);
    await db.runTransaction(async (tx) => {
      const capSnap = await tx.get(capRef);
      const count = capSnap.exists ? (capSnap.data().count || 0) : 0;
      tx.set(playerRef, { referralRewardPending: false }, { merge: true });
      if (count >= 20) return; // vượt giới hạn 20 lượt thưởng/ngày cho 1 người mời — chặn farm
      tx.set(db.collection('players').doc(referrerUid), {
        referralRewardGold: FieldValue.increment(20)
      }, { merge: true });
      tx.set(playerRef, {
        referralRewardGold: FieldValue.increment(30)
      }, { merge: true });
      tx.set(capRef, { count: count + 1 }, { merge: true });
    });
  }

  return { ok: true, bestScore: Math.max(score, prevBest) };
});

// ═══════════════════════════════════════════════════════════════
// MỜI BẠN (referral) — thưởng 2 chiều, gate theo mốc "đã chơi xong 1 ván"
// (xem khối referral trong submitSoloScore ở trên), không thưởng ngay lúc
// nhập mã để tránh tạo tài khoản ảo farm thưởng. Mô hình "hộp thư chờ":
// server chỉ ghi số tiền sẽ cộng (referralRewardGold/Diamond), client tự
// rút về ví local qua grantGold/grantDiamonds sẵn có (claimPendingRewards).
// ═══════════════════════════════════════════════════════════════

/**
 * Người chơi mới nhập mã mời (CBxxxxxx) của người giới thiệu.
 * Chỉ đánh dấu "chờ thưởng" — tiền thật được cấp khi đạt mốc (xem submitSoloScore).
 */
exports.claimReferral = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');

  const code = String((request.data && request.data.code) || '').trim().toUpperCase();
  if (!/^CB[A-Z0-9]{6}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Mã mời không hợp lệ.');
  }

  const meRef = db.collection('players').doc(uid);
  const meSnap = await meRef.get();
  if (meSnap.exists && meSnap.data().referredBy) {
    throw new HttpsError('already-exists', 'Bạn đã nhập mã mời rồi.');
  }

  const idSnap = await db.collection('playerIds').doc(code).get();
  if (!idSnap.exists) throw new HttpsError('not-found', 'Mã mời không tồn tại.');
  const referrerUid = idSnap.data().uid;
  if (!referrerUid || referrerUid === uid) {
    throw new HttpsError('invalid-argument', 'Không thể tự mời chính mình.');
  }

  await meRef.set({
    referredBy: referrerUid,
    referralRewardPending: true
  }, { merge: true });

  return { ok: true };
});

/**
 * Client gọi khi mở app / vào màn hình có thể nhận thưởng — rút "hộp thư
 * chờ" referral về ví local qua grantGold/grantDiamonds phía client.
 */
exports.claimPendingRewards = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  const ref = db.collection('players').doc(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const gold = data.referralRewardGold || 0;
  const diamond = data.referralRewardDiamond || 0;
  if (gold > 0 || diamond > 0) {
    await ref.set({
      referralRewardGold: FieldValue.increment(-gold),
      referralRewardDiamond: FieldValue.increment(-diamond)
    }, { merge: true });
  }
  return { gold, diamond };
});

/**
 * Cộng điểm/thắng-thua sau khi trận đấu kết thúc (Caro & Versus).
 * Kích hoạt khi doc rooms chuyển trạng thái sang 'finished'; chạy bằng
 * Admin SDK để không phụ thuộc quyền ghi của client trên players/{uid}.
 */

// ═══════════════════════════════════════════════════════════════
// CHẤM LẠI VÁN CARO TỪ LỊCH SỬ NƯỚC ĐI (không tin thẳng winnerId/isDraw
// client tự báo trong doc rooms — firestore.rules chỉ mới khoá được "tốc độ
// + trần điểm", còn AI THẮNG THẬT vẫn phải suy ra từ chính các nước đi đã
// ghi ở rooms/{roomId}/moves). Toàn bộ hàm dưới đây là bản port 1:1 từ luật
// trong js/caro.js (CARO_SIZE, _caroCheckWin) — cùng 1 bàn 15×15, cùng luật
// chặn 2 đầu, để kết quả chấm lại khớp tuyệt đối với luật client đang chơi.
// ═══════════════════════════════════════════════════════════════
const CARO_SIZE = 15;
const CARO_EMPTY = 0, CARO_X = 1, CARO_O = 2; // X = host, O = guest (xem js/caro.js: _caroStone)

/** Bản port 1:1 của _caroCheckWin trong js/caro.js — luật chặn 2 đầu: 5 quân
 * thắng chỉ khi KHÔNG bị chặn cả 2 đầu bởi đối phương hoặc biên bàn cờ. */
function caroCheckWin(board, r, c, color) {
  const opp = color === CARO_X ? CARO_O : CARO_X;
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const cells = [[r, c]];
    let nr = r - dr, nc = c - dc;
    while (nr >= 0 && nr < CARO_SIZE && nc >= 0 && nc < CARO_SIZE && board[nr][nc] === color) {
      cells.unshift([nr, nc]); nr -= dr; nc -= dc;
    }
    nr = r + dr; nc = c + dc;
    while (nr >= 0 && nr < CARO_SIZE && nc >= 0 && nc < CARO_SIZE && board[nr][nc] === color) {
      cells.push([nr, nc]); nr += dr; nc += dc;
    }
    if (cells.length < 5) continue;
    for (let i = 0; i <= cells.length - 5; i++) {
      const five = cells.slice(i, i + 5);
      if (!five.some(([fr, fc]) => fr === r && fc === c)) continue;
      const [r0, c0] = five[0], [r4, c4] = five[4];
      const br = r0 - dr, bc = c0 - dc, ar = r4 + dr, ac = c4 + dc;
      const blockedBefore = br < 0 || bc < 0 || br >= CARO_SIZE || bc >= CARO_SIZE || board[br][bc] === opp;
      const blockedAfter = ar < 0 || ac < 0 || ar >= CARO_SIZE || ac >= CARO_SIZE || board[ar][ac] === opp;
      if (!(blockedBefore && blockedAfter)) return true;
    }
  }
  return false;
}

/**
 * Chấm lại toàn bộ ván từ rooms/{roomId}/moves (chỉ đọc, Admin SDK nên luôn
 * thấy đủ — client không thể xoá bớt nước đi vì firestore.rules chỉ cho
 * phép "create" trên moves, không cho update/delete).
 * Trả về {winnerId, isDraw} THẬT suy từ replay, hoặc null nếu lịch sử nước
 * đi không hợp lệ / chưa đủ để kết luận — khi đó KHÔNG cộng/trừ điểm cho
 * ai (coi như ván không xác thực được, an toàn hơn là tin nhầm).
 * Kiểm tra từng nước: đúng lượt (host đi trước, xen kẽ), toạ độ hợp lệ,
 * ô đang trống, và không còn nước nào sau khi đã có người thắng.
 */
async function replayCaroMatch(roomId, hostId, guestId) {
  const movesSnap = await db.collection('rooms').doc(roomId).collection('moves')
    .orderBy('seq', 'asc').get();
  const board = Array.from({ length: CARO_SIZE }, () => Array(CARO_SIZE).fill(CARO_EMPTY));
  let expectedSlot = 'host'; // host luôn đi trước — xem js/caro.js: turn:'host' lúc khởi tạo
  let winnerSlot = null;
  let placed = 0;
  for (const doc of movesSnap.docs) {
    const m = doc.data();
    if (m.type !== 'caro_place') continue;
    if (winnerSlot) return null; // đã thắng mà vẫn còn nước đi tiếp theo → lịch sử bất thường
    const { slot, r, c } = m;
    if (slot !== expectedSlot) return null;
    if (!(Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < CARO_SIZE && c >= 0 && c < CARO_SIZE)) return null;
    if (board[r][c] !== CARO_EMPTY) return null;
    const color = slot === 'host' ? CARO_X : CARO_O;
    board[r][c] = color;
    placed++;
    if (caroCheckWin(board, r, c, color)) winnerSlot = slot;
    expectedSlot = slot === 'host' ? 'guest' : 'host';
  }
  if (winnerSlot) return { winnerId: winnerSlot === 'host' ? hostId : guestId, isDraw: false };
  if (placed === CARO_SIZE * CARO_SIZE) return { winnerId: null, isDraw: true };
  return null; // chưa đủ nước đi để phân thắng bại/hoà thật — không tính điểm
}

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
      // Không tin thẳng after.winnerId/after.isDraw (client tự ghi được) — chấm lại từ
      // lịch sử nước đi thật (rooms/{roomId}/moves, chỉ Admin SDK mới đọc ở đây, và
      // client chỉ có quyền "create" trên đó nên không tài nào xoá/sửa được).
      const real = await replayCaroMatch(event.params.roomId, hostId, guestId);
      if (!real) {
        // Lịch sử nước đi không đủ để xác nhận thắng/thua/hoà thật (ví dụ báo finished
        // khống mà không hề chơi) → không cộng/trừ điểm cho ai, chỉ đánh dấu đã xử lý.
        await event.data.after.ref.set({ statsApplied: true }, { merge: true }).catch(() => {});
        return null;
      }
      const winnerId = real.winnerId;
      const isDraw = real.isDraw;
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
