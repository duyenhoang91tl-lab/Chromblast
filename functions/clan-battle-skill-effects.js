// clan-battle-skill-effects.js (functions/) — bản CommonJS ĐẦY ĐỦ cho Cloud
// Functions, mirror 1:1 với CB_SKILL_EFFECTS ở js/clan-battle-skills.js
// (client). Trước đây file này chỉ có 6 con gây sát thương trực tiếp; giờ
// mở rộng đủ 10 con để server áp được cả buff (Rùa/Nhím/Thỏ) và DOT (Rắn),
// vì trước đó 4 con này bấm kỹ năng không có tác dụng gì ở server.
// Sửa 1 nơi phải sửa đồng thời cả 2 file (client + functions) cho khớp.
//
// CẦN XÁC NHẬN LẠI: số liệu damage/duration dưới đây là PLACEHOLDER, giống
// hệt js/clan-battle-skills.js — số liệu cân bằng chính thức chờ bảng gốc.

const SKILL_EFFECT_TYPES = {
  DAMAGE: 'damage',
  DOT: 'dot',
  STUN: 'stun',
  DASH_DAMAGE: 'dash_damage',
  DEFENSE_BUFF: 'defense_buff',
  SPEED_BUFF: 'speed_buff',
  REFLECT: 'reflect',
};

const SKILL_EFFECTS = {
  rua: { type: SKILL_EFFECT_TYPES.DEFENSE_BUFF, damageReductionPct: 0.5, durationMs: 3000 },
  ga: { type: SKILL_EFFECT_TYPES.DAMAGE, damage: 3, radius: 0.3, hits: 3 },
  nhim: { type: SKILL_EFFECT_TYPES.REFLECT, reflectPct: 1.0, durationMs: 2500 },
  tho: { type: SKILL_EFFECT_TYPES.SPEED_BUFF, speedMultiplier: 1.8, durationMs: 2000 },
  cho: { type: SKILL_EFFECT_TYPES.DASH_DAMAGE, damage: 6, dashDistance: 1.5 },
  ech: { type: SKILL_EFFECT_TYPES.DAMAGE, damage: 5, radius: 0.4, hits: 1 },
  gau_truc: { type: SKILL_EFFECT_TYPES.STUN, damage: 4, stunDurationMs: 1200 },
  meo: { type: SKILL_EFFECT_TYPES.DAMAGE, damage: 2, hits: 4 },
  ran: { type: SKILL_EFFECT_TYPES.DOT, damagePerTick: 2, tickIntervalMs: 1000, tickCount: 4 },
  rong: { type: SKILL_EFFECT_TYPES.DAMAGE, damage: 10, radius: 0.6, hits: 1 },
};

function getSkillEffect(animalId) {
  return SKILL_EFFECTS[animalId] || null;
}

// Giữ lại cho tương thích ngược: các con gây sát thương trực tiếp ngay khi
// dùng kỹ năng (damage/dash_damage/stun đều có field `damage` phẳng).
function getDirectSkillDamage(animalId) {
  const def = SKILL_EFFECTS[animalId];
  if (!def) return 0;
  const isDirect = def.type === SKILL_EFFECT_TYPES.DAMAGE
    || def.type === SKILL_EFFECT_TYPES.DASH_DAMAGE
    || def.type === SKILL_EFFECT_TYPES.STUN;
  return isDirect ? (def.damage || 0) : 0;
}

module.exports = { SKILL_EFFECT_TYPES, SKILL_EFFECTS, getSkillEffect, getDirectSkillDamage };
