// clan-battle-skill-effects.js (functions/) — bản CommonJS RÚT GỌN cho Cloud Functions.
// Chỉ chứa các kỹ năng loại "gây sát thương trực tiếp" để CF có thể xác thực/áp
// dụng sát thương phía server (nguồn xác thực chính thức). Các loại buff/DOT/stun
// đầy đủ vẫn ở js/clan-battle-skills.js (client) — CHƯA đồng bộ 2 chiều với server;
// đây là phần thu hẹp phạm vi có chủ đích cho Task 9, cần mở rộng ở task sau khi
// bảng kỹ năng gốc (mục 6 spec) được xác nhận đầy đủ.
//
// CẦN XÁC NHẬN LẠI: số liệu damage dưới đây là PLACEHOLDER, giống hệt
// js/clan-battle-skills.js — phải sửa đồng thời cả 2 file khi có số liệu thật.

const DIRECT_DAMAGE_SKILLS = {
  ga: { damage: 3 },
  ech: { damage: 5 },
  gau_truc: { damage: 4 },
  meo: { damage: 2 },
  cho: { damage: 6 },
  rong: { damage: 10 },
};

function getDirectSkillDamage(animalId) {
  const def = DIRECT_DAMAGE_SKILLS[animalId];
  return def ? def.damage : 0;
}

module.exports = { DIRECT_DAMAGE_SKILLS, getDirectSkillDamage };
