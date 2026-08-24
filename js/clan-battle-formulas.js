// ═══════════════════════════════════════════════════════════════
// clan-battle-formulas.js — Công thức cốt lõi "Muông Thú Đại Chiến" (2v2/3v3)
// Nạp SAU online-services.js, TRƯỚC clan-battle-collision.js
// Nguồn: spec "Đấu Clan — Muông Thú Đại Chiến" (bản chốt), mục 2-5.
// ═══════════════════════════════════════════════════════════════

const CB_BASE_HP = 30;
const CB_HP_LOSS_ON_EATEN = 2;
const CB_HP_GAIN_ON_EAT = 1;
const CB_SPEED_LOSS_PER_HP_ABOVE_BASE = 0.001; // 0.1% mỗi điểm HP tăng thêm so với baseHP
const CB_MIN_SPEED_RATIO = 0.3; // đề xuất tạm — CẦN XÁC NHẬN LẠI (mục 4 spec)
const CB_SKILL_CHARGE_MAX = 3;
const CLAN_BATTLE_WIN_ACTIVITY = 10; // điểm năng động clan cho đội thắng, tính theo trận

// player = { id, teamId, currentHP, eatCount, baseSize, baseSpeed, skillCharge, alive }

function cbCreateInitialPlayerState(id, teamId, opts = {}) {
  return {
    id,
    teamId,
    currentHP: CB_BASE_HP,
    eatCount: 0,
    baseSize: opts.baseSize ?? 1,
    baseSpeed: opts.baseSpeed ?? 1,
    skillCharge: 0,
    alive: true,
  };
}

// Mục 3 — ai ăn được ai: chỉ theo eatCount, bằng nhau thì va chạm thường không gây sát thương.
function cbCanEat(eater, target) {
  return eater.eatCount > target.eatCount;
}

// Mục 4 — kích thước / tốc độ
function cbGetSizeRatio(currentHP) {
  return currentHP / CB_BASE_HP;
}

function cbGetCurrentSize(baseSize, currentHP) {
  return baseSize * cbGetSizeRatio(currentHP);
}

function cbGetCurrentSpeed(baseSpeed, currentHP) {
  const hpAboveBase = Math.max(0, currentHP - CB_BASE_HP);
  const speedRatio = Math.max(
    CB_MIN_SPEED_RATIO,
    1 - CB_SPEED_LOSS_PER_HP_ABOVE_BASE * hpAboveBase
  );
  return baseSpeed * speedRatio;
}

// Áp dụng kết quả "eater ăn được target". Caller phải tự gọi cbCanEat() trước.
function cbApplyEatResult(eater, target) {
  const newEater = {
    ...eater,
    currentHP: eater.currentHP + CB_HP_GAIN_ON_EAT,
    eatCount: eater.eatCount + 1,
    skillCharge: Math.min(CB_SKILL_CHARGE_MAX, eater.skillCharge + 1),
  };

  const newTargetHP = target.currentHP - CB_HP_LOSS_ON_EATEN;
  const newTarget = {
    ...target,
    currentHP: newTargetHP,
    alive: newTargetHP > 0,
  };

  return { eater: newEater, target: newTarget };
}

// Mục 6 — kỹ năng: KHÔNG reset thanh nạp khi bị trúng skill đối thủ.
function cbUseSkill(player) {
  if (player.skillCharge < CB_SKILL_CHARGE_MAX) {
    throw new Error('Chưa đủ 3 vạch để dùng kỹ năng');
  }
  return { ...player, skillCharge: 0 };
}

function cbApplySkillDamage(player, damage) {
  const newHP = player.currentHP - damage;
  return {
    ...player,
    currentHP: newHP,
    alive: newHP > 0,
    // skillCharge giữ nguyên — không reset khi bị tác động từ đối thủ
  };
}

// Mục 5 — điều kiện thắng & điểm thưởng clan
function cbGetTeamScore(teamPlayers) {
  return teamPlayers.reduce((sum, p) => sum + p.eatCount, 0);
}

function cbIsTeamEliminated(teamPlayers) {
  return teamPlayers.length > 0 && teamPlayers.every((p) => !p.alive);
}

function cbResolveBattleResult(teamAPlayers, teamBPlayers, context = { timeUp: false }) {
  const aEliminated = cbIsTeamEliminated(teamAPlayers);
  const bEliminated = cbIsTeamEliminated(teamBPlayers);

  if (aEliminated && !bEliminated) return { winner: 'B', reason: 'team_a_eliminated' };
  if (bEliminated && !aEliminated) return { winner: 'A', reason: 'team_b_eliminated' };

  if (aEliminated && bEliminated) {
    const scoreA = cbGetTeamScore(teamAPlayers);
    const scoreB = cbGetTeamScore(teamBPlayers);
    if (scoreA === scoreB) return { winner: 'draw', reason: 'both_eliminated_equal_score' };
    return { winner: scoreA > scoreB ? 'A' : 'B', reason: 'both_eliminated_score_tiebreak' };
  }

  if (context.timeUp) {
    const scoreA = cbGetTeamScore(teamAPlayers);
    const scoreB = cbGetTeamScore(teamBPlayers);
    if (scoreA === scoreB) return { winner: 'draw', reason: 'time_up_equal_score' };
    return { winner: scoreA > scoreB ? 'A' : 'B', reason: 'time_up_score' };
  }

  return { winner: null, reason: 'battle_ongoing' };
}

function cbGetClanActivityReward(winner) {
  if (winner === 'A') return { teamA: CLAN_BATTLE_WIN_ACTIVITY, teamB: 0 };
  if (winner === 'B') return { teamA: 0, teamB: CLAN_BATTLE_WIN_ACTIVITY };
  return { teamA: 0, teamB: 0 }; // hoà hoặc chưa kết thúc -> không thưởng
}

window.ClanBattleFormulas = {
  BASE_HP: CB_BASE_HP,
  HP_LOSS_ON_EATEN: CB_HP_LOSS_ON_EATEN,
  HP_GAIN_ON_EAT: CB_HP_GAIN_ON_EAT,
  SPEED_LOSS_PER_HP_ABOVE_BASE: CB_SPEED_LOSS_PER_HP_ABOVE_BASE,
  MIN_SPEED_RATIO: CB_MIN_SPEED_RATIO,
  SKILL_CHARGE_MAX: CB_SKILL_CHARGE_MAX,
  CLAN_BATTLE_WIN_ACTIVITY,
  createInitialPlayerState: cbCreateInitialPlayerState,
  canEat: cbCanEat,
  getSizeRatio: cbGetSizeRatio,
  getCurrentSize: cbGetCurrentSize,
  getCurrentSpeed: cbGetCurrentSpeed,
  applyEatResult: cbApplyEatResult,
  useSkill: cbUseSkill,
  applySkillDamage: cbApplySkillDamage,
  getTeamScore: cbGetTeamScore,
  isTeamEliminated: cbIsTeamEliminated,
  resolveBattleResult: cbResolveBattleResult,
  getClanActivityReward: cbGetClanActivityReward,
};
