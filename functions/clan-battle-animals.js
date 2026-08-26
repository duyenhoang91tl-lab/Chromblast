// clan-battle-animals.js (functions/) — chỉ danh sách id hợp lệ, dùng để xác
// thực selectionRequests phía server. Bảng đầy đủ (tên/giá/skillSummary) sống
// ở js/clan-battle-character-selection.js (client) — sửa danh sách con vật ở
// đâu thì phải sửa đồng thời cả 2 nơi cho khớp.

const VALID_ANIMAL_IDS = [
  'rua', 'ga', 'nhim', 'tho', 'cho', 'ech', 'gau_truc', 'meo', 'ran', 'rong',
];

const FREE_ANIMAL_IDS = ['rua', 'ga'];

function isValidAnimalId(animalId) {
  return VALID_ANIMAL_IDS.includes(animalId);
}

module.exports = { VALID_ANIMAL_IDS, FREE_ANIMAL_IDS, isValidAnimalId };
