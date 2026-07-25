// ═══════════════════════════════════════════════════════════════
// boss-manager.js — Điều phối các BOSS (map ẩn 10 & 20)
// Nạp SAU các file boss/*.js (để tham chiếu được hàm của chúng) và TRƯỚC main.js.
// Cung cấp registry tập trung + tiện ích reset dùng chung global scope.
// ═══════════════════════════════════════════════════════════════

// Registry mô tả từng boss: khoá mở-khoá, tên, canvas, và các hàm vòng đời.
const BOSS_REGISTRY = {
  boss: {   // Map ẩn 10
    key: 'boss',
    name: 'Gà Nổi Loạn (Feather Storm)',
    canvasId: 'boss-canvas',
    trigger: (typeof triggerBossUnlock === 'function') ? triggerBossUnlock : null,
    enter:   (typeof enterBossMode    === 'function') ? enterBossMode    : null,
    exit:    (typeof exitBossToMain   === 'function') ? exitBossToMain   : null,
    isActive: () => (typeof bossMode !== 'undefined' && bossMode),
    stopRAF:  () => { if (typeof bossRAF !== 'undefined' && bossRAF) { cancelAnimationFrame(bossRAF); bossRAF = null; } if (typeof bossMode !== 'undefined') bossMode = false; },
  },
  mega: {   // Map ẩn 20
    key: 'mega',
    name: 'Dũng sĩ diệt rồng',
    canvasId: 'mega-canvas',
    trigger: (typeof triggerMegaUnlock === 'function') ? triggerMegaUnlock : null,
    enter:   (typeof enterMegaMode     === 'function') ? enterMegaMode     : null,
    exit:    (typeof exitMegaToMain    === 'function') ? exitMegaToMain    : null,
    isActive: () => (typeof megaMode !== 'undefined' && megaMode),
    stopRAF:  () => { if (typeof megaRAF !== 'undefined' && megaRAF) { cancelAnimationFrame(megaRAF); megaRAF = null; } if (typeof megaMode !== 'undefined') megaMode = false; },
  },
};

// Dừng & tắt cờ mọi boss — gọi từ hardResetAllModes để dọn sạch khi chuyển map.
function resetAllBosses() {
  Object.keys(BOSS_REGISTRY).forEach(k => { try { BOSS_REGISTRY[k].stopRAF(); } catch (e) {} });
}

// Tiện ích tra cứu (dùng cho admin/menu nếu cần).
function getBoss(key) { return BOSS_REGISTRY[key] || null; }
function isAnyBossActive() { return Object.keys(BOSS_REGISTRY).some(k => { try { return BOSS_REGISTRY[k].isActive(); } catch (e) { return false; } }); }
