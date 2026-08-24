// ═══════════════════════════════════════════════════════════════
// clan-battle-character-selection.js — Màn chọn nhân vật "Muông Thú Đại Chiến"
// Nạp SAU clan-battle-formulas.js
// Nguồn: spec "Đấu Clan — Muông Thú Đại Chiến" (bản chốt), mục 7.
//
// LƯU Ý: Giá 8 con trả phí + skillSummary dưới đây là ĐỀ XUẤT dựa trên suy
// đoán độ mạnh kỹ năng theo tên gọi — CẦN XÁC NHẬN LẠI với bảng kỹ năng gốc
// đầy đủ (mục 6 spec) trước khi merge phần shop / cân bằng số liệu thật.
// ═══════════════════════════════════════════════════════════════

const CB_SELECTION_COUNTDOWN_SECONDS = 10;

const CB_ANIMALS = [
  // --- Miễn phí ---
  { id: 'rua', name: 'Rùa', free: true, price: 0,
    skillSummary: 'Thu mình phòng thủ, giảm sát thương nhận vào tạm thời' },
  { id: 'ga', name: 'Gà', free: true, price: 0,
    skillSummary: 'Mổ liên tục gây sát thương nhỏ, hồi chiêu nhanh' },

  // --- Trả phí, giá tăng dần theo độ mạnh đề xuất ---
  { id: 'nhim', name: 'Nhím', free: false, price: 20,
    skillSummary: 'Xù gai phản sát thương khi bị va chạm gần' },
  { id: 'tho', name: 'Thỏ', free: false, price: 25,
    skillSummary: 'Bứt tốc né tránh trong thời gian ngắn' },
  { id: 'cho', name: 'Chó', free: false, price: 28,
    skillSummary: 'Lao tới cắn mục tiêu gần nhất, sát thương trung bình' },
  { id: 'ech', name: 'Ếch', free: false, price: 32,
    skillSummary: 'Nhảy vọt qua chướng ngại, đáp xuống gây sát thương diện hẹp' },
  { id: 'gau_truc', name: 'Gấu trúc', free: false, price: 36,
    skillSummary: 'Lăn người húc văng + làm choáng ngắn các mục tiêu trúng phải' },
  { id: 'meo', name: 'Mèo', free: false, price: 40,
    skillSummary: 'Cào liên hoàn nhiều đòn nhanh, tổng sát thương cao' },
  { id: 'ran', name: 'Rắn', free: false, price: 45,
    skillSummary: 'Cắn gây độc, sát thương theo thời gian (DOT)' },
  { id: 'rong', name: 'Rồng', free: false, price: 50,
    skillSummary: 'Phun lửa diện rộng, sát thương/CD mạnh nhất trong 10 con' },
];

const CB_FREE_ANIMAL_IDS = CB_ANIMALS.filter((a) => a.free).map((a) => a.id);

function cbGetAnimalById(animalId) {
  return CB_ANIMALS.find((a) => a.id === animalId) || null;
}

// selectionState = { teams: { [teamId]: { [playerId]: animalId | null } } }

function cbCreateSelectionState(teamPlayerIds) {
  const teams = {};
  for (const [teamId, playerIds] of Object.entries(teamPlayerIds)) {
    teams[teamId] = {};
    for (const playerId of playerIds) {
      teams[teamId][playerId] = null;
    }
  }
  return { teams };
}

function cbGetTakenAnimalIdsInTeam(state, teamId, excludePlayerId) {
  const team = state.teams[teamId];
  if (!team) return [];
  return Object.entries(team)
    .filter(([playerId, animalId]) => playerId !== excludePlayerId && animalId)
    .map(([, animalId]) => animalId);
}

function cbGetAvailableAnimalsForPlayer(state, teamId, playerId) {
  const taken = cbGetTakenAnimalIdsInTeam(state, teamId, playerId);
  return CB_ANIMALS.filter((a) => !taken.includes(a.id));
}

/**
 * Chọn nhân vật cho 1 người chơi. Ném lỗi nếu animal không tồn tại,
 * hoặc đã bị đồng đội (khác player) chọn.
 */
function cbSelectAnimal(state, teamId, playerId, animalId) {
  const animal = cbGetAnimalById(animalId);
  if (!animal) {
    throw new Error(`Con vật không tồn tại: ${animalId}`);
  }
  if (!state.teams[teamId] || !(playerId in state.teams[teamId])) {
    throw new Error(`Người chơi ${playerId} không thuộc đội ${teamId}`);
  }

  const taken = cbGetTakenAnimalIdsInTeam(state, teamId, playerId);
  if (taken.includes(animalId)) {
    throw new Error(`Con vật ${animalId} đã bị đồng đội chọn trong đội ${teamId}`);
  }

  return {
    ...state,
    teams: {
      ...state.teams,
      [teamId]: {
        ...state.teams[teamId],
        [playerId]: animalId,
      },
    },
  };
}

/**
 * Tự động chọn khi hết 10s đếm ngược. Ưu tiên 2 con miễn phí trước nếu còn
 * trống trong đội, sau đó random trong các con còn lại chưa bị đồng đội chọn.
 */
function cbAutoPickOnTimeout(state, teamId, playerId, rng = Math.random) {
  const current = state.teams[teamId] && state.teams[teamId][playerId];
  if (current) return state; // đã chọn rồi thì không auto-pick

  const available = cbGetAvailableAnimalsForPlayer(state, teamId, playerId);
  if (available.length === 0) {
    throw new Error(`Không còn con vật nào để auto-pick cho ${playerId} trong đội ${teamId}`);
  }

  const availableFree = available.filter((a) => CB_FREE_ANIMAL_IDS.includes(a.id));
  const pool = availableFree.length > 0 ? availableFree : available;
  const pick = pool[Math.floor(rng() * pool.length)];

  return cbSelectAnimal(state, teamId, playerId, pick.id);
}

function cbIsSelectionComplete(state) {
  return Object.values(state.teams).every((team) =>
    Object.values(team).every((animalId) => animalId !== null)
  );
}

window.ClanBattleCharacterSelection = {
  SELECTION_COUNTDOWN_SECONDS: CB_SELECTION_COUNTDOWN_SECONDS,
  ANIMALS: CB_ANIMALS,
  FREE_ANIMAL_IDS: CB_FREE_ANIMAL_IDS,
  getAnimalById: cbGetAnimalById,
  createSelectionState: cbCreateSelectionState,
  getTakenAnimalIdsInTeam: cbGetTakenAnimalIdsInTeam,
  getAvailableAnimalsForPlayer: cbGetAvailableAnimalsForPlayer,
  selectAnimal: cbSelectAnimal,
  autoPickOnTimeout: cbAutoPickOnTimeout,
  isSelectionComplete: cbIsSelectionComplete,
};
