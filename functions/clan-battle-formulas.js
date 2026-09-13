// clan-battle-formulas.js (functions/) — bản CommonJS dùng cho Cloud Functions.
// LƯU Ý: đây là bản sao của js/clan-battle-formulas.js, viết lại dạng
// require/module.exports vì functions/ chạy Node CommonJS, còn js/ chạy
// thẳng trong trình duyệt qua <script> (window.ClanBattleFormulas).
// Khi đổi công thức, phải sửa ĐỒNG THỜI cả 2 file này cho khớp.
// Nguồn: spec "Đấu Clan — Muông Thú Đại Chiến" (bản chốt), mục 2-6.

const BASE_HP = 30;
const HP_LOSS_ON_EATEN = 2;
const HP_GAIN_ON_EAT = 1;
const SKILL_CHARGE_MAX = 3;
const CLAN_BATTLE_WIN_ACTIVITY = 10;

function canEat(eater, target) {
  return eater.eatCount > target.eatCount;
}

function applyEatResult(eater, target) {
  const newEater = {
    ...eater,
    currentHP: eater.currentHP + HP_GAIN_ON_EAT,
    eatCount: eater.eatCount + 1,
    skillCharge: Math.min(SKILL_CHARGE_MAX, eater.skillCharge + 1),
  };
  const newTargetHP = target.currentHP - HP_LOSS_ON_EATEN;
  const newTarget = { ...target, currentHP: newTargetHP, alive: newTargetHP > 0 };
  return { eater: newEater, target: newTarget };
}

function applyFruitEat(player) {
  return {
    ...player,
    currentHP: player.currentHP + HP_GAIN_ON_EAT,
    eatCount: player.eatCount + 1,
    skillCharge: Math.min(SKILL_CHARGE_MAX, player.skillCharge + 1),
  };
}

function useSkill(player) {
  if (player.skillCharge < SKILL_CHARGE_MAX) {
    throw new Error('Chưa đủ 3 vạch để dùng kỹ năng');
  }
  return { ...player, skillCharge: 0 };
}

// QUAN TRỌNG: không reset skillCharge khi bị trúng skill đối thủ (mục 6).
function applySkillDamage(player, damage) {
  const newHP = player.currentHP - damage;
  return { ...player, currentHP: newHP, alive: newHP > 0 };
}

// ── Hiệu ứng theo thời gian: khiên/phản đòn/tăng tốc (buff tự hết hạn qua
// expiresAt, không cần vòng lặp riêng) + độc (DOT, dồn tick qua nextTickAt)
// + choáng (stunnedUntil). Dùng chung cho Rùa/Nhím/Thỏ/Rắn/Gấu trúc.

function applyBuff(player, buffType, value, durationMs, now = Date.now()) {
  return { ...player, activeBuff: { type: buffType, value, expiresAt: now + durationMs } };
}

function isBuffActive(player, buffType, now = Date.now()) {
  return !!(player.activeBuff && player.activeBuff.type === buffType && player.activeBuff.expiresAt > now);
}

// Sát thương có tính khiên (Rùa) + phản đòn (Nhím). Trả {attacker, target}
// vì phản đòn khiến attacker nhận sát thương thay vì target.
function resolveIncomingDamage(attacker, target, rawDamage, now = Date.now()) {
  if (isBuffActive(target, 'reflect', now)) {
    const reflected = Math.round(rawDamage * target.activeBuff.value);
    return { attacker: applySkillDamage(attacker, reflected), target };
  }
  const finalDamage = isBuffActive(target, 'defense', now)
    ? Math.max(0, Math.round(rawDamage * (1 - target.activeBuff.value)))
    : rawDamage;
  return { attacker, target: applySkillDamage(target, finalDamage) };
}

// Giống applyEatResult nhưng tôn trọng khiên của Rùa khi bị ăn.
function applyEatResultWithDefense(eater, target, now = Date.now()) {
  const loss = isBuffActive(target, 'defense', now)
    ? Math.max(0, Math.round(HP_LOSS_ON_EATEN * (1 - target.activeBuff.value)))
    : HP_LOSS_ON_EATEN;
  const newEater = {
    ...eater,
    currentHP: eater.currentHP + HP_GAIN_ON_EAT,
    eatCount: eater.eatCount + 1,
    skillCharge: Math.min(SKILL_CHARGE_MAX, eater.skillCharge + 1),
  };
  const newTargetHP = target.currentHP - loss;
  const newTarget = { ...target, currentHP: newTargetHP, alive: newTargetHP > 0 };
  return { eater: newEater, target: newTarget };
}

function addDot(player, dotDef, now = Date.now()) {
  const dots = Array.isArray(player.activeDots) ? player.activeDots.slice() : [];
  dots.push({
    damagePerTick: dotDef.damagePerTick,
    tickIntervalMs: dotDef.tickIntervalMs,
    remainingTicks: dotDef.tickCount,
    nextTickAt: now + dotDef.tickIntervalMs,
  });
  return { ...player, activeDots: dots };
}

// Áp mọi tick độc đã tới hạn tính tới `now` (dồn tick nếu bỏ lỡ do không có
// event nào chạm tới player này trong lúc đó). Gọi mỗi khi đọc lại state.
function resolveDueDots(player, now = Date.now()) {
  if (!Array.isArray(player.activeDots) || player.activeDots.length === 0 || !player.alive) return player;
  let hp = player.currentHP;
  const remainingDots = [];
  for (const dot of player.activeDots) {
    let ticksLeft = dot.remainingTicks;
    let nextTickAt = dot.nextTickAt;
    while (nextTickAt <= now && ticksLeft > 0 && hp > 0) {
      hp -= dot.damagePerTick;
      ticksLeft -= 1;
      nextTickAt += dot.tickIntervalMs;
    }
    if (ticksLeft > 0 && hp > 0) remainingDots.push({ ...dot, remainingTicks: ticksLeft, nextTickAt });
  }
  return { ...player, currentHP: hp, alive: hp > 0, activeDots: remainingDots };
}

function setStun(player, durationMs, now = Date.now()) {
  return { ...player, stunnedUntil: now + durationMs };
}

function isStunned(player, now = Date.now()) {
  return !!(player.stunnedUntil && player.stunnedUntil > now);
}

function getTeamScore(teamPlayers) {
  return teamPlayers.reduce((sum, p) => sum + p.eatCount, 0);
}

function isTeamEliminated(teamPlayers) {
  return teamPlayers.length > 0 && teamPlayers.every((p) => !p.alive);
}

function resolveBattleResult(teamAPlayers, teamBPlayers, context = { timeUp: false }) {
  const aEliminated = isTeamEliminated(teamAPlayers);
  const bEliminated = isTeamEliminated(teamBPlayers);

  if (aEliminated && !bEliminated) return { winner: 'B', reason: 'team_a_eliminated' };
  if (bEliminated && !aEliminated) return { winner: 'A', reason: 'team_b_eliminated' };

  if (aEliminated && bEliminated) {
    const scoreA = getTeamScore(teamAPlayers);
    const scoreB = getTeamScore(teamBPlayers);
    if (scoreA === scoreB) return { winner: 'draw', reason: 'both_eliminated_equal_score' };
    return { winner: scoreA > scoreB ? 'A' : 'B', reason: 'both_eliminated_score_tiebreak' };
  }

  if (context.timeUp) {
    const scoreA = getTeamScore(teamAPlayers);
    const scoreB = getTeamScore(teamBPlayers);
    if (scoreA === scoreB) return { winner: 'draw', reason: 'time_up_equal_score' };
    return { winner: scoreA > scoreB ? 'A' : 'B', reason: 'time_up_score' };
  }

  return { winner: null, reason: 'battle_ongoing' };
}

function getClanActivityReward(winner) {
  if (winner === 'A') return { teamA: CLAN_BATTLE_WIN_ACTIVITY, teamB: 0 };
  if (winner === 'B') return { teamA: 0, teamB: CLAN_BATTLE_WIN_ACTIVITY };
  return { teamA: 0, teamB: 0 };
}

module.exports = {
  BASE_HP,
  HP_LOSS_ON_EATEN,
  HP_GAIN_ON_EAT,
  SKILL_CHARGE_MAX,
  CLAN_BATTLE_WIN_ACTIVITY,
  canEat,
  applyEatResult,
  applyEatResultWithDefense,
  applyFruitEat,
  useSkill,
  applySkillDamage,
  applyBuff,
  isBuffActive,
  resolveIncomingDamage,
  addDot,
  resolveDueDots,
  setStun,
  isStunned,
  getTeamScore,
  isTeamEliminated,
  resolveBattleResult,
  getClanActivityReward,
};
