// ═══════════════════════════════════════════════════════════════
// clan-battle-collision.js — Lõi va chạm/ăn vòng lặp game "Muông Thú Đại Chiến"
// Nạp SAU clan-battle-formulas.js
// Nguồn: spec "Đấu Clan — Muông Thú Đại Chiến" (bản chốt), mục 2-4, 7.
//
// Vị trí (position) tách riêng khỏi player state (HP/eatCount/skillCharge...)
// theo kiến trúc mục 1: vị trí ghi lên RTDB ~10 lần/giây, còn máu/điểm chỉ
// được Cloud Function cập nhật chính thức. Client dùng hàm ở đây để dự đoán
// kết quả va chạm ngay lập tức (optimistic update) trước khi CF xác nhận.
// ═══════════════════════════════════════════════════════════════

const CB_FRUIT_RADIUS = 0.15; // cùng đơn vị baseSize — CẦN XÁC NHẬN LẠI theo tỉ lệ ảnh thật

function cbGetDistance(posA, posB) {
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function cbIsCirclesColliding(posA, radiusA, posB, radiusB) {
  return cbGetDistance(posA, posB) <= radiusA + radiusB;
}

function cbGetPlayerRadius(player) {
  return window.ClanBattleFormulas.getCurrentSize(player.baseSize, player.currentHP);
}

// Va chạm với hoa quả — luôn ăn được nếu chạm (không phụ thuộc eatCount)
function cbCheckFruitCollision(player, playerPos, fruitPos, fruitRadius = CB_FRUIT_RADIUS) {
  if (!player.alive) return false;
  return cbIsCirclesColliding(playerPos, cbGetPlayerRadius(player), fruitPos, fruitRadius);
}

// +1 HP, +1 eatCount, +1 vạch skill
function cbApplyFruitEat(player) {
  return {
    ...player,
    currentHP: player.currentHP + 1,
    eatCount: player.eatCount + 1,
    skillCharge: Math.min(window.ClanBattleFormulas.SKILL_CHARGE_MAX, player.skillCharge + 1),
  };
}

function cbFindCollidingFruitId(player, playerPos, fruits) {
  const hit = fruits.find((fruit) =>
    cbCheckFruitCollision(player, playerPos, fruit.position, fruit.radius ?? CB_FRUIT_RADIUS)
  );
  return hit ? hit.id : null;
}

// Va chạm giữa 2 người chơi — theo ngưỡng eatCount (mục 3)
function cbCheckPlayerCollision(playerA, posA, playerB, posB) {
  if (!playerA.alive || !playerB.alive) return false;
  return cbIsCirclesColliding(posA, cbGetPlayerRadius(playerA), posB, cbGetPlayerRadius(playerB));
}

/**
 * outcome: 'not_colliding' | 'skipped_dead' | 'a_eats_b' | 'b_eats_a' | 'no_effect_equal_score'
 */
function cbResolvePlayerEncounter(playerA, posA, playerB, posB) {
  const { canEat, applyEatResult } = window.ClanBattleFormulas;

  if (!playerA.alive || !playerB.alive) {
    return { a: playerA, b: playerB, outcome: 'skipped_dead' };
  }

  if (!cbCheckPlayerCollision(playerA, posA, playerB, posB)) {
    return { a: playerA, b: playerB, outcome: 'not_colliding' };
  }

  if (canEat(playerA, playerB)) {
    const { eater, target } = applyEatResult(playerA, playerB);
    return { a: eater, b: target, outcome: 'a_eats_b' };
  }

  if (canEat(playerB, playerA)) {
    const { eater, target } = applyEatResult(playerB, playerA);
    return { a: target, b: eater, outcome: 'b_eats_a' };
  }

  // eatCount bằng nhau -> va chạm thường không gây mất máu (mục 3)
  return { a: playerA, b: playerB, outcome: 'no_effect_equal_score' };
}

window.ClanBattleCollision = {
  FRUIT_RADIUS: CB_FRUIT_RADIUS,
  getDistance: cbGetDistance,
  isCirclesColliding: cbIsCirclesColliding,
  getPlayerRadius: cbGetPlayerRadius,
  checkFruitCollision: cbCheckFruitCollision,
  applyFruitEat: cbApplyFruitEat,
  findCollidingFruitId: cbFindCollidingFruitId,
  checkPlayerCollision: cbCheckPlayerCollision,
  resolvePlayerEncounter: cbResolvePlayerEncounter,
};
