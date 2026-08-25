// clan-battle-reward.js (functions/) — Task 4 (Phase 1: 1v1 qua Caro/Versus).
// Các hàm THUẦN quyết định "có nên cộng điểm năng động clan cho trận này
// không, và cộng bao nhiêu cho ai" — tách khỏi Firestore để dễ kiểm tra logic,
// rồi ghép vào Cloud Function onClanBattleCompleted bên index.js.
//
// Dùng chung CLAN_BATTLE_WIN_ACTIVITY với clan-battle-formulas.js (Task 9) để
// khỏi lệch số liệu giữa 1v1 (Phase 1) và 2v2/3v3 (Phase 2) — mục 5 spec quy
// định cùng 1 hằng số áp dụng chung cho cả 2.
//
// Shape tài liệu clanBattles/{battleId} cho luồng 1v1 (tham khảo, không bắt buộc):
//   { clanIdA, clanIdB, mode: '1v1', status: 'pending'|'in_progress'|'completed',
//     winnerClanId: string|null, activityAwarded?: boolean }

const { CLAN_BATTLE_WIN_ACTIVITY } = require('./clan-battle-formulas.js');

/**
 * Xác định trận có nên được cộng điểm năng động clan ngay bây giờ không.
 * Trả về null nếu KHÔNG nên cộng (chưa xong / đã cộng rồi / hoà / dữ liệu bất thường).
 * @param {{status:string, winnerClanId:string|null, clanIdA:string, clanIdB:string, activityAwarded?:boolean}} battleDoc
 * @returns {{winnerClanId:string, loserClanId:string, amount:number}|null}
 */
function resolveActivityAward(battleDoc) {
  if (!battleDoc) return null;
  if (battleDoc.status !== 'completed') return null;
  if (battleDoc.activityAwarded === true) return null;
  if (!battleDoc.winnerClanId) return null;

  const { winnerClanId, clanIdA, clanIdB } = battleDoc;
  if (winnerClanId !== clanIdA && winnerClanId !== clanIdB) return null;

  const loserClanId = winnerClanId === clanIdA ? clanIdB : clanIdA;
  return { winnerClanId, loserClanId, amount: CLAN_BATTLE_WIN_ACTIVITY };
}

/** true nếu doc vừa chuyển status -> 'completed' (before -> after), để tránh chạy
 *  transaction cho mọi lần ghi doc không liên quan (vd. cập nhật vị trí realtime). */
function didBattleJustComplete(before, after) {
  if (!after) return false;
  const wasCompleted = before && before.status === 'completed';
  const isCompleted = after.status === 'completed';
  return isCompleted && !wasCompleted;
}

module.exports = { resolveActivityAward, didBattleJustComplete };
