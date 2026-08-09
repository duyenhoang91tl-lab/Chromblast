const { setGlobalOptions } = require('firebase-functions/v2');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { filterText, containsProfanity } = require('./profanity-filter.js');
const crypto = require('crypto');
initializeApp();
// Dùng API modular (getFirestore/FieldValue) thay vì admin.firestore() namespace cũ —
// trên firebase-admin@14 kiểu namespace cũ báo lỗi "admin.firestore is not a function"
// (namespace không còn tự đăng ký khi chỉ require('firebase-admin') trơn).
const db = getFirestore();
const auth = getAuth();
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

/** Port 1:1 từ js/lb-period.js — nhận quà là nhận cho kỳ VỪA KẾT THÚC (hôm qua/tuần
 * trước/tháng trước), không phải kỳ đang chạy dở. Client gọi claimPeriodRewardOnline
 * cũng hiểu theo nghĩa này (xem previousPeriodKey ở lb-period.js) — 2 bên phải khớp
 * kỳ thì rank tính ra mới đúng cái người chơi đang xem trên màn hình. */
function previousPeriodKey(kind) {
  const now = new Date();
  if (kind === 'day') return periodKey('day', new Date(now.getTime() - 86400000));
  if (kind === 'week') return periodKey('week', new Date(now.getTime() - 7 * 86400000));
  if (kind === 'month') {
    const y = now.getUTCFullYear(), m = now.getUTCMonth();
    const prev = m === 0 ? new Date(Date.UTC(y - 1, 11, 15)) : new Date(Date.UTC(y, m - 1, 15));
    return periodKey('month', prev);
  }
  return periodKey(kind);
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
  const level = playerData.level || 1;

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
        uid, name: displayName, avatar, score, level, country, continent,
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
        referralRewardDiamond: FieldValue.increment(1)
      }, { merge: true });
      tx.set(playerRef, {
        referralRewardDiamond: FieldValue.increment(1)
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
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const gold = data.referralRewardGold || 0;
    const diamond = data.referralRewardDiamond || 0;
    if (gold <= 0 && diamond <= 0) return { gold: 0, diamond: 0 };
    // Cộng thẳng vào ví server — trước đây hàm này chỉ trả số về cho client tự
    // grantGold/grantDiamonds vào localStorage; từ nay localStorage không còn là nơi
    // giữ tiền thật nữa (xem VÍ SERVER-SIDE bên dưới), nên phải cộng ở đây luôn.
    tx.set(ref, {
      referralRewardGold: FieldValue.increment(-gold),
      referralRewardDiamond: FieldValue.increment(-diamond),
      gold: FieldValue.increment(gold),
      diamonds: FieldValue.increment(diamond)
    }, { merge: true });
    return { gold, diamond };
  });
});

// ═══════════════════════════════════════════════════════════════
// VÍ SERVER-SIDE: vàng (gold) / kim cương (diamonds) / tim (hearts)
// Trước đây 100% ở localStorage (js/inventory.js) — ai mở Console trình duyệt gọi
// thẳng grantGold()/grantDiamonds() (hàm global bình thường, không phải module) là có
// tiền vô hạn ngay, không gì chặn. Từ khi có IAP (js/iap.js, RevenueCat) thì lỗ này
// đụng thẳng tiền thật: mua kim cương xong vẫn có thể tự cộng thêm miễn phí.
// Từ đây gold/diamonds/hearts + heartsAt là field trên players/{uid}, CHỈ Cloud
// Function (Admin SDK) ghi được (xem firestore.rules: walletFieldsUnchanged()).
// Client chỉ ĐỌC 3 field này để hiển thị + gọi các function dưới để tiêu/nhận.
// PHẠM VI ĐÃ LÀM: bản thân số dư (tiêu, đổi, hồi tim, quà BXH kỳ đã xác thực rank
// thật, mailbox referral, mua IAP qua webhook) — tất cả các đường này giờ không thể
// giả mạo được số dư. CÒN LẠI (nói thẳng, chưa làm hết trong lượt này): nhiệm vụ,
// điểm danh, thưởng lên cấp, xem QC vẫn gọi grantGold/grantDiamonds cục bộ như cũ —
// những đường này vẫn "tự khai" (chưa xác thực được là có thật sự làm nhiệm vụ/xem
// QC hay không), nhưng ít nhất KHÔNG THỂ tự phóng to số dư vô hạn nữa vì mọi chỗ TIÊU
// (mua skin/vật phẩm) và HIỂN THỊ giờ đọc từ server — gọi grantGold cục bộ chỉ còn
// đổi số trong localStorage, không đổi được số dư thật để tiêu.
// ═══════════════════════════════════════════════════════════════
const MAX_HEARTS = 5;                    // khớp js/inventory.js: MAX_HEARTS
const HEART_REGEN_MS = 30 * 60 * 1000;   // khớp js/inventory.js: HEART_REGEN_MS
const GOLD_PER_DIAMOND = 100;            // khớp js/inventory.js: GOLD_PER_DIAMOND

function walletOf(data) {
  const d = data || {};
  return {
    gold: Math.max(0, Math.floor(d.gold || 0)),
    diamonds: Math.max(0, Math.floor(d.diamonds || 0)),
    hearts: Math.max(0, Number(d.hearts != null ? d.hearts : MAX_HEARTS))
  };
}

/** Hồi tim theo thời gian THẬT đã trôi (server), không phải đồng hồ máy client —
 * gọi khi mở app / mở màn chơi, cùng cơ chế currentRunStartedAt đã dùng cho solo. */
exports.regenHearts = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  const ref = db.collection('players').doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const w = walletOf(data);
    const now = Timestamp.now();
    if (w.hearts >= MAX_HEARTS) {
      if (!data.heartsAt) tx.set(ref, { heartsAt: now }, { merge: true });
      return { hearts: w.hearts };
    }
    const anchorMs = data.heartsAt ? data.heartsAt.toMillis() : now.toMillis();
    const elapsedMs = Math.max(0, now.toMillis() - anchorMs);
    const gained = Math.floor(elapsedMs / HEART_REGEN_MS);
    if (gained <= 0) {
      if (!data.heartsAt) tx.set(ref, { heartsAt: now }, { merge: true });
      return { hearts: w.hearts };
    }
    const newHearts = Math.min(MAX_HEARTS, w.hearts + gained);
    const newAnchorMs = newHearts >= MAX_HEARTS ? now.toMillis() : anchorMs + gained * HEART_REGEN_MS;
    tx.set(ref, { hearts: newHearts, heartsAt: Timestamp.fromMillis(newAnchorMs) }, { merge: true });
    return { hearts: newHearts };
  });
});

/**
 * Tiêu vàng/kim cương/tim — kiểm tra đủ số dư THẬT trên server bằng transaction rồi
 * mới trừ. data: { cost: {gold?, diamonds?, hearts?}, reason? }. Chỉ trừ — đổi tiền
 * tệ dùng exchangeCurrency; nhận thưởng dùng các hàm claim..reward/grant.. riêng bên dưới.
 */
exports.spendCurrency = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  const cost = (request.data && request.data.cost) || {};
  const g = Math.max(0, Math.floor(cost.gold || 0));
  const d = Math.max(0, Math.floor(cost.diamonds || 0));
  const h = Math.max(0, Number(cost.hearts || 0));
  if (g <= 0 && d <= 0 && h <= 0) throw new HttpsError('invalid-argument', 'Không có gì để tiêu.');
  const ref = db.collection('players').doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('failed-precondition', 'Chưa có ví.');
    const w = walletOf(snap.data());
    if (w.gold < g || w.diamonds < d || w.hearts < h) {
      throw new HttpsError('failed-precondition', 'Không đủ số dư.');
    }
    tx.set(ref, {
      gold: FieldValue.increment(-g),
      diamonds: FieldValue.increment(-d),
      hearts: FieldValue.increment(-h)
    }, { merge: true });
    return { gold: w.gold - g, diamonds: w.diamonds - d, hearts: w.hearts - h };
  });
});

/** Đổi vàng -> kim cương theo tỉ giá CỐ ĐỊNH trên server (không tin tỉ giá client
 * gửi lên). data: { direction: 'goldToDiamond', count }
 * LƯU Ý: chiều 'diamondToGold' đã bị BỎ có chủ đích (không còn nhận) — kim cương
 * mua bằng tiền thật (IAP) không được phép quy đổi ngược thành vàng, vì vàng có
 * thể dùng để đặt cược 1-1 (escrowWager/applyMatchResult) — nếu vẫn cho đổi
 * kim cương→vàng thì coi như mở đường tiền thật → vàng → cược ăn thua giữa 2
 * người chơi, rủi ro pháp lý (cờ bạc trá hình). Vàng chỉ được nạp qua chơi
 * game/nhiệm vụ/xem QC/thắng cược — không mua được bằng tiền thật. */
exports.exchangeCurrency = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  const direction = request.data && request.data.direction;
  const count = Math.max(1, Math.floor((request.data && request.data.count) || 1));
  if (direction !== 'goldToDiamond') {
    throw new HttpsError('invalid-argument', 'Hướng đổi không hợp lệ hoặc không còn hỗ trợ.');
  }
  const ref = db.collection('players').doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('failed-precondition', 'Chưa có ví.');
    const w = walletOf(snap.data());
    const goldCost = count * GOLD_PER_DIAMOND;
    if (w.gold < goldCost) throw new HttpsError('failed-precondition', 'Không đủ vàng.');
    tx.set(ref, { gold: FieldValue.increment(-goldCost), diamonds: FieldValue.increment(count) }, { merge: true });
    return { gold: w.gold - goldCost, diamonds: w.diamonds + count };
  });
});

/**
 * Đặt cược vàng/kim cương khi vào trận Đấu 1-1 online (Caro hoặc Versus) — trừ
 * đúng số dư THẬT của người gọi (transaction, không tin số dư client báo) VÀ
 * đánh dấu đã đặt cược ngay trên chính room đó, atomic trong CÙNG 1 transaction
 * (tránh trường hợp trừ tiền xong nhưng mất mạng giữa chừng không kịp ghi nhận
 * vào room — applyMatchResult sẽ không biết để hoàn lại). Gọi 1 lần/người/phòng,
 * gọi lại lần 2 chỉ trả về already:true, không trừ thêm.
 * data: { roomId }
 */
exports.escrowWager = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  const roomId = request.data && request.data.roomId;
  if (!roomId || typeof roomId !== 'string') throw new HttpsError('invalid-argument', 'Thiếu roomId.');

  const roomRef = db.collection('rooms').doc(roomId);
  const playerRef = db.collection('players').doc(uid);

  return db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) throw new HttpsError('not-found', 'Phòng không tồn tại.');
    const room = roomSnap.data();

    if (room.status === 'finished') throw new HttpsError('failed-precondition', 'Trận đã kết thúc.');
    const isHost = room.hostId === uid;
    const isGuest = room.guestId === uid;
    if (!isHost && !isGuest) throw new HttpsError('permission-denied', 'Bạn không phải người chơi trong phòng này.');

    const amount = Math.floor(Number(room.wagerAmount) || 0);
    const currency = room.wagerCurrency;
    if (!(amount > 0) || (currency !== 'gold' && currency !== 'diamond')) {
      throw new HttpsError('failed-precondition', 'Phòng này không đặt cược.');
    }

    const escrowKey = isHost ? 'hostEscrowed' : 'guestEscrowed';
    if (room[escrowKey]) return { ok: true, already: true };

    const playerSnap = await tx.get(playerRef);
    if (!playerSnap.exists) throw new HttpsError('failed-precondition', 'Chưa có ví.');
    const w = walletOf(playerSnap.data());
    const balance = currency === 'gold' ? w.gold : w.diamonds;
    if (balance < amount) {
      throw new HttpsError(
        'failed-precondition',
        currency === 'gold' ? 'Không đủ vàng để đặt cược.' : 'Không đủ kim cương để đặt cược.'
      );
    }

    const field = currency === 'gold' ? 'gold' : 'diamonds';
    tx.set(playerRef, { [field]: FieldValue.increment(-amount) }, { merge: true });
    tx.set(roomRef, { [escrowKey]: true }, { merge: true });
    return { ok: true, already: false, balanceAfter: balance - amount };
  });
});

/** Bảng quà theo hạng BXH kỳ — port 1:1 từ js/lb-period.js (REWARD_TABLE). Kim
 * cương chỉ top 1–3, vàng tới top 100. */
const PERIOD_REWARD_TABLE = {
  day: [
    { max: 1, gold: 20, diamond: 3 }, { max: 2, gold: 10, diamond: 2 }, { max: 3, gold: 8, diamond: 1 },
    { max: 10, gold: 6, diamond: 0 }, { max: 20, gold: 4, diamond: 0 }, { max: 40, gold: 3, diamond: 0 },
    { max: 60, gold: 2, diamond: 0 }, { max: 80, gold: 1, diamond: 0 }, { max: 100, gold: 1, diamond: 0 }
  ],
  week: [
    { max: 1, gold: 40, diamond: 6 }, { max: 2, gold: 30, diamond: 3 }, { max: 3, gold: 20, diamond: 2 },
    { max: 10, gold: 10, diamond: 0 }, { max: 20, gold: 8, diamond: 0 }, { max: 40, gold: 6, diamond: 0 },
    { max: 60, gold: 4, diamond: 0 }, { max: 80, gold: 2, diamond: 0 }, { max: 100, gold: 1, diamond: 0 }
  ],
  month: [
    { max: 1, gold: 100, diamond: 10 }, { max: 2, gold: 80, diamond: 5 }, { max: 3, gold: 60, diamond: 3 },
    { max: 10, gold: 40, diamond: 0 }, { max: 20, gold: 30, diamond: 0 }, { max: 40, gold: 18, diamond: 0 },
    { max: 60, gold: 11, diamond: 0 }, { max: 80, gold: 7, diamond: 0 }, { max: 100, gold: 4, diamond: 0 }
  ]
};
function periodRewardForRank(kind, rank) {
  if (!rank || rank < 1 || rank > 100) return null;
  const table = PERIOD_REWARD_TABLE[kind] || PERIOD_REWARD_TABLE.day;
  for (const row of table) if (rank <= row.max) return { gold: row.gold | 0, diamond: row.diamond | 0 };
  return null;
}

/**
 * Nhận quà BXH kỳ VỪA KẾT THÚC (hôm qua/tuần trước/tháng trước — previousPeriodKey,
 * khớp với những gì client đang hiển thị cho người chơi xem trước khi bấm nhận,
 * KHÔNG phải kỳ đang chạy dở) — KHÔNG tin rank client tự báo: tự đếm lại số người
 * có điểm cao hơn trong chính periodScores (đã server-authoritative sẵn từ
 * submitSoloScore) để suy ra rank thật, rồi tra bảng thưởng. Chỉ nhận được 1 lần/kỳ
 * nhờ doc players/{uid}/claims/{periodId} tạo bằng transaction (rules đã khoá
 * claims: client không tự tạo/xoá được để nhận lại). Hiện chỉ hỗ trợ scope 'world'.
 */
/**
 * Nhận thưởng "Thẻ trò chơi" (tab Hành trình + tab Nhiệm vụ) — CHỈ phần vàng/kim
 * cương/tim (3 trường ví thật players/{uid}.gold|diamonds|hearts). Sức mạnh (power)
 * và XP vẫn cộng cục bộ ở client như cũ (không phải tiền tệ, không cần khoá server).
 *
 * Vì sao cần hàm này: trước đây gpcard-rewards.js/quests.js gọi thẳng
 * grantGold/grantDiamonds/grantHearts cục bộ — số tiền chỉ nằm ở localStorage,
 * KHÔNG được ghi vào players/{uid} nên: (1) biến mất sau lần syncWalletFromServer()
 * kế tiếp, (2) không tiêu được ở tab "Đi đổi" vì spendCurrency kiểm tra đúng số dư
 * thật trên server. Hàm này khắc phục bằng cách: server tự tính lại đúng số tiền
 * theo bảng thưởng cố định bên dưới (KHÔNG tin số tiền client gửi lên) rồi cộng
 * thẳng vào players/{uid}, dùng ledger players/{uid}/claims/{claimId} để chống
 * nhận lại nhiều lần (giống hệt claimPeriodReward ở trên).
 *
 * ⚠️ Bảng thưởng dưới đây PHẢI khớp với 2 nơi client:
 *   - Hành trình: js/gpcard-rewards.js hàm _gpcardJourneyRewardFor (chỉ phần
 *     gold/diamond/hearts — power/xp không nằm ở đây).
 *   - Nhiệm vụ: js/quests.js QUEST_DEFS (trường reward.gold/reward.hearts).
 *   Sửa 1 bên nhớ sửa cả 2 bên, không thì UI hiện 1 số nhưng ví thật nhận số khác.
 *
 * data: { kind: 'journey', tier, track: 'free'|'premium' }
 *    hoặc { kind: 'quest', period: 'day'|'week'|'month', id, periodKey }
 *       periodKey: chuỗi định danh chu kỳ hiện tại (vd '2026-08-09' cho day,
 *       do CLIENT tự tính bằng đúng logic todayStr()/weekBounds()/monthBounds()
 *       đã có ở js/quests.js) — ghép vào claimId nên nhiệm vụ tự "mở lại" được
 *       ở chu kỳ mới mà không cần dọn ledger cũ.
 */
const GPCARD_JOURNEY_TOTAL_TIERS = 21; // khớp UNLOCK_STAGE_ORDER.length (js/progression.js) hiện tại

function journeyWalletReward(tierNum, track) {
  const big = (tierNum % 5 === 0);
  const last = (tierNum === GPCARD_JOURNEY_TOTAL_TIERS);
  const cyclePos = (tierNum - 1) % 4;
  if (track === 'free') {
    if (last) return { gold: 300, diamonds: 20, hearts: 0 };
    if (big) return { gold: 0, diamonds: 4 + Math.floor(tierNum / 5) * 2, hearts: 0 };
    if (cyclePos === 0) return { gold: 30 + tierNum * 4, diamonds: 0, hearts: 0 };
    if (cyclePos === 1) return { gold: 0, diamonds: 0, hearts: 1 };
    return { gold: 0, diamonds: 0, hearts: 0 }; // cyclePos 2/3 = power/xp, không thuộc ví
  }
  // premium — hiện CHƯA có gói mua thật nào gắn với việc mở khoá nhánh này
  // (xem js/gpcard-rewards.js: hasGamePassPremium chưa tồn tại) nên nhánh này
  // chỉ có tác dụng khi tính năng đó được bật sau này, và requirePremium bên
  // dưới sẽ luôn từ chối cho tới lúc đó.
  if (last) return { gold: 800, diamonds: 60, hearts: 3 };
  if (big) return { gold: 150 + tierNum * 8, diamonds: 12 + Math.floor(tierNum / 5) * 4, hearts: 0 };
  if (cyclePos === 0) return { gold: 100 + tierNum * 10, diamonds: 0, hearts: 0 };
  if (cyclePos === 1) return { gold: 0, diamonds: 0, hearts: 2 };
  if (cyclePos === 3) return { gold: 0, diamonds: 3 + Math.floor(tierNum / 3), hearts: 0 };
  return { gold: 0, diamonds: 0, hearts: 0 }; // cyclePos 2 = power
}

// Chỉ phần gold/hearts (quests.js không có nhiệm vụ nào thưởng kim cương).
const GPCARD_QUEST_WALLET_REWARDS = {
  day: {
    checkin: { gold: 0, hearts: 0 },
    play1: { gold: 1, hearts: 0 },
    clear3: { gold: 1, hearts: 0 },
    score300: { gold: 1, hearts: 0 },
    spin1: { gold: 1, hearts: 0 }
  },
  week: {
    play5: { gold: 3, hearts: 1 },
    clear30: { gold: 4, hearts: 1 },
    login3: { gold: 3, hearts: 1 },
    combo5: { gold: 3, hearts: 0 }
  },
  month: {
    login15: { gold: 10, hearts: 2 },
    play20: { gold: 8, hearts: 2 },
    clear100: { gold: 12, hearts: 2 },
    combo8: { gold: 6, hearts: 1 }
  }
};

exports.claimGpcardReward = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  const data = request.data || {};
  const kind = data.kind;

  let claimId, reward;
  if (kind === 'journey') {
    const tier = Math.floor(Number(data.tier));
    const track = data.track;
    if (!(tier >= 1 && tier <= GPCARD_JOURNEY_TOTAL_TIERS) || (track !== 'free' && track !== 'premium')) {
      throw new HttpsError('invalid-argument', 'Mốc hành trình không hợp lệ.');
    }
    claimId = 'journey_' + track + '_' + tier;
    reward = journeyWalletReward(tier, track);
  } else if (kind === 'quest') {
    const period = data.period;
    const id = String(data.id || '');
    const periodKey = String(data.periodKey || '').slice(0, 20);
    if (!['day', 'week', 'month'].includes(period) || !periodKey) {
      throw new HttpsError('invalid-argument', 'Nhiệm vụ không hợp lệ.');
    }
    const table = GPCARD_QUEST_WALLET_REWARDS[period] || {};
    if (!Object.prototype.hasOwnProperty.call(table, id)) {
      throw new HttpsError('invalid-argument', 'Nhiệm vụ không tồn tại.');
    }
    claimId = 'quest_' + period + '_' + id + '_' + periodKey;
    reward = table[id];
  } else {
    throw new HttpsError('invalid-argument', 'Loại thưởng không hợp lệ.');
  }

  if (!reward || ((reward.gold || 0) <= 0 && (reward.diamonds || 0) <= 0 && (reward.hearts || 0) <= 0)) {
    // Mốc/nhiệm vụ hợp lệ nhưng không có phần ví (vd chỉ có power/xp) — không
    // cần ghi ledger, trả về 0 để client biết không phải gọi grantGold gì thêm.
    return { gold: 0, diamonds: 0, hearts: 0 };
  }

  const claimRef = db.collection('players').doc(uid).collection('claims').doc(claimId);
  const playerRef = db.collection('players').doc(uid);
  return db.runTransaction(async (tx) => {
    const claimSnap = await tx.get(claimRef);
    if (claimSnap.exists) throw new HttpsError('already-exists', 'Đã nhận thưởng này rồi.');
    // Tim bị chặn trần MAX_HEARTS (khớp grantHearts cục bộ js/inventory.js) — vàng/kim
    // cương thì cộng thoải mái, không có trần.
    const playerSnap = await tx.get(playerRef);
    const w = walletOf(playerSnap.exists ? playerSnap.data() : {});
    const heartsGain = Math.max(0, Math.min(reward.hearts || 0, MAX_HEARTS - w.hearts));
    tx.set(claimRef, {
      kind, gold: reward.gold || 0, diamonds: reward.diamonds || 0, hearts: heartsGain,
      claimedAt: FieldValue.serverTimestamp()
    });
    tx.set(playerRef, {
      gold: FieldValue.increment(reward.gold || 0),
      diamonds: FieldValue.increment(reward.diamonds || 0),
      hearts: FieldValue.increment(heartsGain)
    }, { merge: true });
    return { gold: reward.gold || 0, diamonds: reward.diamonds || 0, hearts: heartsGain };
  });
});

exports.claimPeriodReward = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  const kind = request.data && request.data.kind;
  if (!['day', 'week', 'month'].includes(kind)) throw new HttpsError('invalid-argument', 'Kỳ không hợp lệ.');
  const pid = previousPeriodKey(kind);
  const entriesRef = db.collection('periodScores').doc(pid).collection('entries');
  const mySnap = await entriesRef.doc(uid).get();
  if (!mySnap.exists) throw new HttpsError('failed-precondition', 'Chưa có điểm trong kỳ vừa kết thúc.');
  const myScore = mySnap.data().score || 0;
  const higherAgg = await entriesRef.where('score', '>', myScore).count().get();
  const rank = higherAgg.data().count + 1;
  const reward = periodRewardForRank(kind, rank);
  if (!reward || (reward.gold <= 0 && reward.diamond <= 0)) {
    throw new HttpsError('failed-precondition', 'Hạng ở kỳ vừa kết thúc chưa đủ để nhận quà.');
  }
  const claimRef = db.collection('players').doc(uid).collection('claims').doc('period_' + pid);
  const playerRef = db.collection('players').doc(uid);
  return db.runTransaction(async (tx) => {
    const claimSnap = await tx.get(claimRef);
    if (claimSnap.exists) throw new HttpsError('already-exists', 'Đã nhận quà kỳ này rồi.');
    tx.set(claimRef, { rank, gold: reward.gold, diamond: reward.diamond, claimedAt: FieldValue.serverTimestamp() });
    tx.set(playerRef, {
      gold: FieldValue.increment(reward.gold),
      diamonds: FieldValue.increment(reward.diamond)
    }, { merge: true });
    return { rank, gold: reward.gold, diamond: reward.diamond };
  });
});

/**
 * Tặng 1 tim cho bạn bè (miễn phí, không trừ của người tặng — khớp hành vi hiện có
 * trong js/chat.js). Chỉ xác thực: 2 người phải là bạn bè của nhau, và mỗi người
 * nhận tối đa 1 tim/người tặng/ngày (đếm bằng doc claims, không dựa vào localStorage
 * nên không xoá cache để tặng lại được). Không tăng quá MAX_HEARTS.
 */
exports.giftHeart = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  const toUid = request.data && request.data.toUid;
  if (typeof toUid !== 'string' || !toUid || toUid === uid) {
    throw new HttpsError('invalid-argument', 'Người nhận không hợp lệ.');
  }
  const friendSnap = await db.collection('players').doc(uid).collection('friends').doc(toUid).get();
  if (!friendSnap.exists) throw new HttpsError('failed-precondition', 'Chỉ tặng được cho bạn bè.');
  const dayKey = periodKey('day');
  const claimRef = db.collection('players').doc(toUid).collection('claims').doc('giftFrom_' + uid + '_' + dayKey);
  const toRef = db.collection('players').doc(toUid);
  return db.runTransaction(async (tx) => {
    const claimSnap = await tx.get(claimRef);
    if (claimSnap.exists) throw new HttpsError('already-exists', 'Hôm nay đã tặng bạn này rồi.');
    const toSnap = await tx.get(toRef);
    if (!toSnap.exists) throw new HttpsError('failed-precondition', 'Không tìm thấy người nhận.');
    const w = walletOf(toSnap.data());
    if (w.hearts >= MAX_HEARTS) throw new HttpsError('failed-precondition', 'Bạn đó đã đầy tim.');
    tx.set(claimRef, { fromUid: uid, ts: FieldValue.serverTimestamp() });
    tx.set(toRef, { hearts: Math.min(MAX_HEARTS, w.hearts + 1) }, { merge: true });
    return { ok: true };
  });
});

/**
 * Mở 1 trong 3 "rương tiền tệ" (Bạc/Vàng/Kim cương — khớp js/loot-crates.js:
 * LOOT_CRATES, kind currency-gold/currency-diamond) TOÀN BỘ ở server trong 1
 * transaction — trừ giá + random phần thưởng + cộng thưởng CÙNG LÚC. Trước
 * đây client tự trừ qua spendCurrency rồi tự cộng thưởng cục bộ — lần
 * syncWalletFromServer() kế tiếp ghi đè mất phần cộng cục bộ đó (lỗi đã biết,
 * xem docs/SERVER_WALLET_PROGRESS.md). Rương Bạc/Vàng có thêm lượt mở MIỄN
 * PHÍ 1 lần/ngày/rương (doc claims, không dựa localStorage nên không xoá
 * cache để mở lại được). Định nghĩa rương dưới đây PHẢI khớp đúng
 * LOOT_CRATES phía client (giá/khoảng thưởng) — đổi 1 bên nhớ đổi bên kia.
 * Rương vật phẩm (bong bóng/kỹ năng/gạch/map/hiệu ứng) KHÔNG qua đây — chúng
 * chỉ mở khoá cosmetic cục bộ (không có gì để đồng bộ ngược nên không có lỗi
 * tương tự), vẫn dùng spendCurrency + unlock cục bộ như cũ.
 */
const CURRENCY_CRATES = {
  silver:  { price: 25, priceType: 'gold',    freeDaily: true,  rewardType: 'gold',    min: 15, max: 40  },
  gold:    { price: 8,  priceType: 'diamond', freeDaily: true,  rewardType: 'gold',    min: 60, max: 150 },
  diamond: { price: 20, priceType: 'diamond', freeDaily: false, rewardType: 'diamond', min: 2,  max: 8   },
};
exports.openCurrencyCrate = onCall({ region: 'asia-southeast1' }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  const crateId = request.data && request.data.crateId;
  const useFree = !!(request.data && request.data.useFree);
  const crate = CURRENCY_CRATES[crateId];
  if (!crate) throw new HttpsError('invalid-argument', 'Rương không hợp lệ.');
  if (useFree && !crate.freeDaily) throw new HttpsError('invalid-argument', 'Rương này không có lượt miễn phí.');

  const ref = db.collection('players').doc(uid);
  const dayKey = periodKey('day');
  const claimRef = db.collection('players').doc(uid).collection('claims').doc('crateFree_' + crateId + '_' + dayKey);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('failed-precondition', 'Chưa có ví.');
    const w = walletOf(snap.data());

    if (useFree) {
      const claimSnap = await tx.get(claimRef);
      if (claimSnap.exists) throw new HttpsError('already-exists', 'Đã mở miễn phí hôm nay.');
    } else {
      if (crate.priceType === 'gold' && w.gold < crate.price) throw new HttpsError('failed-precondition', 'Không đủ vàng.');
      if (crate.priceType === 'diamond' && w.diamonds < crate.price) throw new HttpsError('failed-precondition', 'Không đủ kim cương.');
    }

    const rewardAmount = crate.min + Math.floor(Math.random() * (crate.max - crate.min + 1));
    let goldDelta = 0, diaDelta = 0;
    if (!useFree) {
      if (crate.priceType === 'gold') goldDelta -= crate.price; else diaDelta -= crate.price;
    }
    if (crate.rewardType === 'gold') goldDelta += rewardAmount; else diaDelta += rewardAmount;

    if (useFree) tx.set(claimRef, { ts: FieldValue.serverTimestamp() });
    tx.set(ref, {
      gold: FieldValue.increment(goldDelta),
      diamonds: FieldValue.increment(diaDelta)
    }, { merge: true });

    return { ok: true, rewardType: crate.rewardType, rewardAmount };
  });
});

/**
 * Webhook RevenueCat (IAP thật) — CHỈ nguồn duy nhất cộng kim cương cho giao dịch mua
 * bằng tiền thật; không tin bất kỳ callable nào client tự gọi báo "đã mua". Cần cấu
 * hình URL function này vào RevenueCat Dashboard → Project → Integrations → Webhooks,
 * kèm Authorization header bí mật đặt trong biến môi trường REVENUECAT_WEBHOOK_SECRET
 * (firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET). Dedupe theo event.id
 * (RevenueCat có thể gửi lại cùng 1 event) để không cộng kim cương 2 lần.
 */
const IAP_DIAMOND_GRANTS = {
  // product_id (App/Play Store) -> số kim cương cộng. Khớp DIAMOND_GRANTS trong js/iap.js.
  diamonds_small: 60, diamonds_medium: 330, diamonds_large: 700, starter_pack: 200
};
exports.revenuecatWebhook = onRequest({ region: 'asia-southeast1' }, async (req, res) => {
  try {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (secret) {
      const auth = req.get('Authorization') || '';
      if (auth !== secret && auth !== 'Bearer ' + secret) {
        res.status(401).send('unauthorized');
        return;
      }
    }
    const event = (req.body && req.body.event) || {};
    const type = event.type;
    if (!['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE', 'RENEWAL'].includes(type)) {
      res.status(200).send('ignored');
      return;
    }
    const uid = event.app_user_id;
    const productId = event.product_id;
    const eventId = event.id || (uid + '_' + productId + '_' + event.purchased_at_ms);
    const diamonds = IAP_DIAMOND_GRANTS[productId] || 0;
    if (!uid || !diamonds) { res.status(200).send('no-op'); return; }
    const dedupeRef = db.collection('iapEvents').doc(String(eventId));
    const playerRef = db.collection('players').doc(uid);
    await db.runTransaction(async (tx) => {
      const dedupeSnap = await tx.get(dedupeRef);
      if (dedupeSnap.exists) return; // đã xử lý event này rồi
      tx.set(dedupeRef, { uid, productId, diamonds, type, ts: FieldValue.serverTimestamp() });
      tx.set(playerRef, { diamonds: FieldValue.increment(diamonds) }, { merge: true });
    });
    res.status(200).send('ok');
  } catch (e) {
    console.error('[revenuecatWebhook]', e);
    res.status(500).send('error');
  }
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
// trong js/caro.js (CARO_MAX_SIZE, _caroCheckWin) — cùng kích thước bàn tối
// đa 25×25 (bàn luôn cấp phát sẵn 25×25 từ đầu ván rồi "mở khoá" hiển thị
// khi có quân đi gần rìa vùng đang hiện — xem CARO_MAX_SIZE trong js/caro.js),
// cùng luật chặn 2 đầu, để kết quả chấm lại khớp tuyệt đối với luật client
// đang chơi. Trước đây hằng số này lệch với client (15 vs khi đó 30), khiến
// mọi ván có quân đi ra ngoài 15×15 gốc bị chấm lại trả về null (không tính
// điểm cho ai) dù có người thắng thật — đã sửa cho khớp lại.
// ═══════════════════════════════════════════════════════════════
const CARO_SIZE = 25;
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

    // Cược vàng/kim cương (nếu phòng có đặt cược, xem escrowWager). Thắng thật: được
    // hoàn cược của mình + 95% cược của đối thủ (net +95% so với mức đã cược, 5%
    // giữ lại làm phí sàn). Thua thật: chỉ được hoàn 5% cược (net -95%). Hoà hoặc
    // không xác định được thắng thua thật thì hoàn lại đúng 100% phần mỗi bên đã
    // đặt (net 0%) — không ai mất tiền oan. Chỉ chạy 1 lần (wagerSettled).
    const settleWager = async (finalWinnerId) => {
      if (after.wagerSettled) return;
      const amount = Math.floor(Number(after.wagerAmount) || 0);
      const currency = after.wagerCurrency;
      if (!(amount > 0) || (currency !== 'gold' && currency !== 'diamond')) return;
      const field = currency === 'gold' ? 'gold' : 'diamonds';
      const hostIn = !!after.hostEscrowed;
      const guestIn = !!after.guestEscrowed;
      if (hostIn && guestIn && (finalWinnerId === hostId || finalWinnerId === guestId)) {
        const loserId = finalWinnerId === hostId ? guestId : hostId;
        const winPayout = Math.round(amount * 1.95);
        const loseRefund = Math.round(amount * 0.05);
        await db.collection('players').doc(finalWinnerId).set(
          { [field]: FieldValue.increment(winPayout) }, { merge: true }
        );
        if (loseRefund > 0) {
          await db.collection('players').doc(loserId).set(
            { [field]: FieldValue.increment(loseRefund) }, { merge: true }
          );
        }
      } else {
        // Hoà, hoặc không xác định được thắng thua thật, hoặc chỉ 1 bên đặt cược
        // thành công (bên kia lỗi/mất mạng giữa chừng) → hoàn đúng phần đã trừ.
        if (hostIn) await db.collection('players').doc(hostId).set({ [field]: FieldValue.increment(amount) }, { merge: true });
        if (guestIn) await db.collection('players').doc(guestId).set({ [field]: FieldValue.increment(amount) }, { merge: true });
      }
      await event.data.after.ref.set({ wagerSettled: true }, { merge: true }).catch(() => {});
    };

    if (after.gameType === 'caro') {
      // Không tin thẳng after.winnerId/after.isDraw (client tự ghi được) — chấm lại từ
      // lịch sử nước đi thật (rooms/{roomId}/moves, chỉ Admin SDK mới đọc ở đây, và
      // client chỉ có quyền "create" trên đó nên không tài nào xoá/sửa được).
      const real = await replayCaroMatch(event.params.roomId, hostId, guestId);
      if (!real) {
        // Lịch sử nước đi không đủ để xác nhận thắng/thua/hoà thật (ví dụ báo finished
        // khống mà không hề chơi) → không cộng/trừ điểm cho ai, hoàn cược nếu có,
        // chỉ đánh dấu đã xử lý.
        await settleWager(null);
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
      await settleWager(isDraw ? null : winnerId);
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
      await settleWager(winnerId);
    }

    await event.data.after.ref.set({ statsApplied: true }, { merge: true }).catch(() => {});
    return null;
  }
);

/**
 * Lưới an toàn: nếu room bị XOÁ (VD dọn phòng "chết" do cả 2 mất mạng — xem
 * firestore.rules: allow delete khi lastSeen im quá 15s) TRƯỚC KHI kịp chuyển
 * 'finished', mà đã có cược escrow chưa được settle, thì hoàn lại đúng phần
 * mỗi bên đã đặt — không để tiền bị trừ mà kẹt lại vĩnh viễn không ai được trả.
 * onDocumentDeleted không có "before/after" như update, chỉ có data() của bản
 * cuối cùng trước khi xoá.
 */
exports.refundAbandonedWager = onDocumentDeleted(
  { document: 'rooms/{roomId}', region: 'asia-southeast1' },
  async (event) => {
    const data = event.data ? event.data.data() : null;
    if (!data) return null;
    if (data.status === 'finished' || data.wagerSettled) return null;
    const amount = Math.floor(Number(data.wagerAmount) || 0);
    const currency = data.wagerCurrency;
    if (!(amount > 0) || (currency !== 'gold' && currency !== 'diamond')) return null;
    const field = currency === 'gold' ? 'gold' : 'diamonds';
    const jobs = [];
    if (data.hostEscrowed && data.hostId) {
      jobs.push(db.collection('players').doc(data.hostId).set({ [field]: FieldValue.increment(amount) }, { merge: true }));
    }
    if (data.guestEscrowed && data.guestId) {
      jobs.push(db.collection('players').doc(data.guestId).set({ [field]: FieldValue.increment(amount) }, { merge: true }));
    }
    await Promise.all(jobs);
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

/**
 * Đăng ký tài khoản mới. Nếu máy đang đăng nhập sẵn Google/Facebook/Play Games
 * (không phải ẩn danh) thì username/mật khẩu mới được GẮN VÀO CHÍNH uid đó thay
 * vì tạo 1 uid riêng — nhờ vậy mở game bằng Google rồi tạo thêm username/mật
 * khẩu vẫn là CHUNG 1 tài khoản, không bị tách tiến trình theo kiểu đăng nhập.
 * Nếu máy đang ẩn danh hoặc chưa đăng nhập gì thì vẫn tạo uid cố định riêng như
 * trước — không đổi hành vi cho người chỉ dùng username/mật khẩu (không social).
 * Trả về {ok, username, role, token}.
 */
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

  // Chỉ dùng lại uid hiện tại khi máy đang đăng nhập THẬT bằng 1 trong 3 social
  // provider dưới đây (không phải ẩn danh, không phải 'custom' từ 1 tài khoản
  // username/mật khẩu khác đang đăng nhập sẵn) — tránh gộp nhầm 2 danh tính.
  const SOCIAL_PROVIDERS = ['google.com', 'facebook.com', 'playgames.google.com'];
  const signInProvider = (request.auth && request.auth.token && request.auth.token.firebase)
    ? request.auth.token.firebase.sign_in_provider : null;
  const linkedUid = (request.auth && SOCIAL_PROVIDERS.includes(signInProvider)) ? request.auth.uid : null;

  const pw = _hashSecret(password);
  const sa = _hashSecret(secA);
  const stableUid = linkedUid || ('acct_' + crypto.randomBytes(16).toString('hex'));
  await ref.set({
    username, role: 'user', secQ,
    passwordHash: pw.hash, passwordSalt: pw.salt,
    secAHash: sa.hash, secASalt: sa.salt,
    uid: stableUid,
    createdAt: FieldValue.serverTimestamp()
  });
  // UID cố định gắn với tài khoản (không phải UID ẩn danh theo thiết bị) — client
  // đăng nhập Firebase Auth bằng token này thì players/{uid} (cấp độ, XP, hạng
  // Caro/Versus, vàng/kim cương...) sẽ đi theo tài khoản, không mất khi đổi máy/
  // dùng ẩn danh/xoá cache.
  // Bọc riêng: phát token chỉ là bước ĐỒNG BỘ THÊM, không phải điều kiện để đăng
  // ký thành công — nếu project thiếu quyền IAM "Service Account Token Creator"
  // (createCustomToken cần quyền này để ký token) thì chỉ bỏ qua bước đồng bộ,
  // KHÔNG được để cả API báo lỗi và chặn mất tài khoản vừa tạo xong.
  let token = null;
  try{
    token = await auth.createCustomToken(stableUid);
  }catch(e){
    console.error('[registerAccount] createCustomToken failed — kiểm tra quyền IAM "Service Account Token Creator" của service account Cloud Functions', e);
  }
  return { ok: true, username, role: 'user', token };
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
  // Tài khoản tạo trước khi có tính năng này chưa có uid cố định — tạo bù 1 lần.
  let stableUid = u.uid;
  if (!stableUid) {
    stableUid = 'acct_' + crypto.randomBytes(16).toString('hex');
    await ref.update({ uid: stableUid }).catch(() => {});
  }
  // Xem chú thích ở registerAccount: phát token là bước đồng bộ thêm, lỗi ở đây
  // (VD thiếu quyền IAM) không được chặn đăng nhập bình thường.
  let token = null;
  try{
    token = await auth.createCustomToken(stableUid);
  }catch(e){
    console.error('[loginAccount] createCustomToken failed — kiểm tra quyền IAM "Service Account Token Creator" của service account Cloud Functions', e);
  }
  return { ok: true, username: u.username, role: u.role || 'user', token };
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
