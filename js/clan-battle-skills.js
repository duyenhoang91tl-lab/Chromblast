// ═══════════════════════════════════════════════════════════════
// clan-battle-skills.js — Hệ thống kỹ năng "Muông Thú Đại Chiến" (Task 8)
// Nạp SAU clan-battle-formulas.js + clan-battle-character-selection.js
// Nguồn: spec "Đấu Clan — Muông Thú Đại Chiến" (bản chốt), mục 6.
//
// QUAN TRỌNG — CẦN XÁC NHẬN LẠI TRƯỚC KHI CÂN BẰNG SỐ LIỆU:
// Tài liệu spec chỉ nói "Bảng 10 con vật + kỹ năng giữ nguyên như bản thiết
// kế gốc" nhưng KHÔNG kèm theo bảng số liệu gốc (sát thương/thời gian hồi/
// thời lượng hiệu ứng cụ thể cho từng con). Các con số damage/duration dưới
// đây là PLACEHOLDER suy ra từ skillSummary trong clan-battle-character-
// selection.js — cần bạn xác nhận hoặc cung cấp bảng thiết kế gốc trước khi
// đưa vào cân bằng số liệu chính thức / merge production.
// ═══════════════════════════════════════════════════════════════

const { SKILL_CHARGE_MAX, useSkill, applySkillDamage } = window.ClanBattleFormulas;

// Các loại hiệu ứng kỹ năng hỗ trợ.
const CB_SKILL_EFFECT_TYPES = {
  DAMAGE: 'damage', // sát thương trực tiếp lên (các) mục tiêu trong tầm
  DOT: 'dot', // sát thương theo thời gian (poison/DOT)
  STUN: 'stun', // làm choáng mục tiêu trong thời gian ngắn
  DASH_DAMAGE: 'dash_damage', // lao tới + gây sát thương khi trúng
  DEFENSE_BUFF: 'defense_buff', // giảm % sát thương nhận vào trong thời gian ngắn
  SPEED_BUFF: 'speed_buff', // tăng tốc độ né tránh trong thời gian ngắn
  REFLECT: 'reflect', // phản sát thương khi bị va chạm gần trong thời gian hiệu lực
};

// Bảng hiệu ứng theo từng con — PLACEHOLDER, chờ xác nhận số liệu gốc.
const CB_SKILL_EFFECTS = {
  rua: { type: CB_SKILL_EFFECT_TYPES.DEFENSE_BUFF, damageReductionPct: 0.5, durationMs: 3000 },
  ga: { type: CB_SKILL_EFFECT_TYPES.DAMAGE, damage: 3, radius: 0.3, hits: 3 },
  nhim: { type: CB_SKILL_EFFECT_TYPES.REFLECT, reflectPct: 1.0, durationMs: 2500 },
  tho: { type: CB_SKILL_EFFECT_TYPES.SPEED_BUFF, speedMultiplier: 1.8, durationMs: 2000 },
  cho: { type: CB_SKILL_EFFECT_TYPES.DASH_DAMAGE, damage: 6, dashDistance: 1.5 },
  ech: { type: CB_SKILL_EFFECT_TYPES.DAMAGE, damage: 5, radius: 0.4, hits: 1 },
  gau_truc: { type: CB_SKILL_EFFECT_TYPES.STUN, damage: 4, stunDurationMs: 1200 },
  meo: { type: CB_SKILL_EFFECT_TYPES.DAMAGE, damage: 2, hits: 4 },
  ran: { type: CB_SKILL_EFFECT_TYPES.DOT, damagePerTick: 2, tickIntervalMs: 1000, tickCount: 4 },
  rong: { type: CB_SKILL_EFFECT_TYPES.DAMAGE, damage: 10, radius: 0.6, hits: 1 },
};

function cbGetSkillEffectDefinition(animalId) {
  return CB_SKILL_EFFECTS[animalId] || null;
}

// true nếu người chơi còn sống và đã đủ 3 vạch để dùng kỹ năng.
function cbCanUseSkill(player) {
  return !!player.alive && player.skillCharge >= SKILL_CHARGE_MAX;
}

/**
 * Kích hoạt kỹ năng của casterPlayer (animalId đã chọn ở màn chọn nhân vật).
 * - Reset thanh nạp của caster về 0 (mục 6).
 * - KHÔNG đụng vào skillCharge của targets dù họ bị trúng sát thương/hiệu ứng
 *   (mục 6: thanh nạp chỉ reset khi CHÍNH người chơi đó chủ động dùng kỹ năng).
 *
 * @param {string} animalId
 * @param {object} casterPlayer
 * @param {object[]} targets - danh sách người chơi đang trong tầm ảnh hưởng (đã lọc theo va chạm/khoảng cách ở tầng gọi)
 * @returns {{caster: object, targets: object[], effect: object}}
 */
function cbActivateSkill(animalId, casterPlayer, targets = []) {
  if (!cbCanUseSkill(casterPlayer)) {
    throw new Error('Chưa đủ 3 vạch hoặc người chơi đã bị loại — không thể dùng kỹ năng');
  }
  const effect = cbGetSkillEffectDefinition(animalId);
  if (!effect) {
    throw new Error(`Không tìm thấy định nghĩa kỹ năng cho con vật: ${animalId}`);
  }

  const newCaster = useSkill(casterPlayer);
  let newTargets = targets;

  switch (effect.type) {
    case CB_SKILL_EFFECT_TYPES.DAMAGE:
    case CB_SKILL_EFFECT_TYPES.DASH_DAMAGE:
    case CB_SKILL_EFFECT_TYPES.STUN: {
      const dmg = effect.damage ?? 0;
      newTargets = targets.map((t) => (t.alive ? applySkillDamage(t, dmg) : t));
      break;
    }
    case CB_SKILL_EFFECT_TYPES.DOT: {
      // Sát thương theo thời gian: tầng gọi (game loop) chịu trách nhiệm tick
      // damagePerTick mỗi tickIntervalMs, đủ tickCount lần, dùng applySkillDamage
      // cho mỗi tick. Ở đây chỉ gắn trạng thái DOT lên target, không trừ máu ngay.
      newTargets = targets.map((t) =>
        t.alive
          ? {
              ...t,
              activeDots: [
                ...(t.activeDots || []),
                {
                  sourceAnimal: animalId,
                  damagePerTick: effect.damagePerTick,
                  tickIntervalMs: effect.tickIntervalMs,
                  remainingTicks: effect.tickCount,
                },
              ],
            }
          : t
      );
      break;
    }
    case CB_SKILL_EFFECT_TYPES.DEFENSE_BUFF:
    case CB_SKILL_EFFECT_TYPES.SPEED_BUFF:
    case CB_SKILL_EFFECT_TYPES.REFLECT:
      // Hiệu ứng buff/reflect áp dụng lên chính caster, không lên targets.
      newTargets = targets;
      break;
    default:
      break;
  }

  const casterWithBuff = cbApplySelfBuffIfAny(newCaster, effect);

  return { caster: casterWithBuff, targets: newTargets, effect };
}

// Gắn buff tạm thời (defense/speed/reflect) lên chính người dùng skill.
function cbApplySelfBuffIfAny(caster, effect) {
  const now = Date.now();
  if (effect.type === CB_SKILL_EFFECT_TYPES.DEFENSE_BUFF) {
    return {
      ...caster,
      activeBuff: { type: 'defense', damageReductionPct: effect.damageReductionPct, expiresAt: now + effect.durationMs },
    };
  }
  if (effect.type === CB_SKILL_EFFECT_TYPES.SPEED_BUFF) {
    return {
      ...caster,
      activeBuff: { type: 'speed', speedMultiplier: effect.speedMultiplier, expiresAt: now + effect.durationMs },
    };
  }
  if (effect.type === CB_SKILL_EFFECT_TYPES.REFLECT) {
    return {
      ...caster,
      activeBuff: { type: 'reflect', reflectPct: effect.reflectPct, expiresAt: now + effect.durationMs },
    };
  }
  return caster;
}

// true nếu buff hiện tại của player (nếu có) đã hết hạn tính tới thời điểm `now`.
function cbIsBuffExpired(player, now = Date.now()) {
  return !player.activeBuff || player.activeBuff.expiresAt <= now;
}

// Áp 1 tick DOT cho player (gọi định kỳ từ game loop / Cloud Function - Task 9).
// Không đụng skillCharge (mục 6).
function cbApplyDotTick(player) {
  if (!player.activeDots || player.activeDots.length === 0 || !player.alive) return player;

  let updated = player;
  const remainingDots = [];
  for (const dot of player.activeDots) {
    updated = applySkillDamage(updated, dot.damagePerTick);
    const remaining = dot.remainingTicks - 1;
    if (remaining > 0 && updated.alive) {
      remainingDots.push({ ...dot, remainingTicks: remaining });
    }
  }
  return { ...updated, activeDots: remainingDots };
}

window.ClanBattleSkills = {
  SKILL_EFFECT_TYPES: CB_SKILL_EFFECT_TYPES,
  SKILL_EFFECTS: CB_SKILL_EFFECTS,
  getSkillEffectDefinition: cbGetSkillEffectDefinition,
  canUseSkill: cbCanUseSkill,
  activateSkill: cbActivateSkill,
  isBuffExpired: cbIsBuffExpired,
  applyDotTick: cbApplyDotTick,
};
