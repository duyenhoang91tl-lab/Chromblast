/* Lucky Spin — 1 free spin / day. Prizes: heart, fire, bubble, wind ×2/×3. */
(function (g) {
  "use strict";

  const KEY_SPIN = "chromablast_lucky_spin";
  const SEGMENTS = [
    { kind: "fire", amount: 2, label: "🔥×2", color: "#c4b5fd" },
    { kind: "bubble", amount: 2, label: "🫧×2", color: "#f8fafc" },
    { kind: "heart", amount: 2, label: "❤️×2", color: "#ddd6fe" },
    { kind: "wind", amount: 2, label: "💨×2", color: "#f8fafc" },
    { kind: "fire", amount: 3, label: "🔥×3", color: "#c4b5fd" },
    { kind: "heart", amount: 3, label: "❤️×3", color: "#f8fafc" },
  ];
  const SEG = 360 / SEGMENTS.length;

  let spinning = false;
  let awaitingRewardConfirm = false;
  let pendingBonus = null;

  function todayStr() {
    if (typeof g.todayStr === "function") return g.todayStr();
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function loadSpin() {
    try {
      const raw = localStorage.getItem(KEY_SPIN);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { lastFreeDay: "", spinsToday: 0 };
  }

  function saveSpin(data) {
    try {
      localStorage.setItem(KEY_SPIN, JSON.stringify(data));
    } catch (_) {}
  }

  function hasFreeSpin() {
    return loadSpin().lastFreeDay !== todayStr();
  }

  function markFreeSpinUsed() {
    const d = loadSpin();
    d.lastFreeDay = todayStr();
    d.spinsToday = (d.spinsToday || 0) + 1;
    saveSpin(d);
  }

  function remainingMs() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return Math.max(0, next - now);
  }

  function formatHms(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return (
      String(h).padStart(2, "0") +
      ":" +
      String(m).padStart(2, "0") +
      ":" +
      String(sec).padStart(2, "0")
    );
  }

  function prizeDetail(seg) {
    if (seg.kind === "heart") return "+" + seg.amount + " Tim";
    if (seg.kind === "fire") return "+" + seg.amount + " Lửa";
    if (seg.kind === "bubble") return "+" + seg.amount + " Bong bóng";
    if (seg.kind === "wind") return "+" + seg.amount + " Gió";
    return seg.label;
  }

  function invSummary() {
    if (!g.Inventory) return "";
    const h = g.Inventory.hearts | 0;
    const f = g.Inventory.fires | 0;
    const b = g.Inventory.bubbles | 0;
    const w = g.Inventory.winds | 0;
    return "❤️ " + h + "  ·  🔥 " + f + "  ·  🫧 " + b + "  ·  💨 " + w;
  }

  function buildWheel() {
    const wheel = document.getElementById("spin-wheel");
    if (!wheel || wheel.dataset.built === "1") return;
    wheel.dataset.built = "1";
    const stops = SEGMENTS.map((_, i) => {
      const a0 = i * SEG;
      const a1 = (i + 1) * SEG;
      return SEGMENTS[i].color + " " + a0 + "deg " + a1 + "deg";
    }).join(", ");
    wheel.style.background = "conic-gradient(from -90deg, " + stops + ")";

    SEGMENTS.forEach(function (seg, i) {
      const label = document.createElement("div");
      label.className = "spin-seg-label";
      const mid = i * SEG + SEG / 2 - 90;
      label.style.transform =
        "rotate(" + mid + "deg) translateY(-72px) rotate(" + -mid + "deg)";
      label.textContent = seg.label;
      wheel.appendChild(label);
    });
  }

  function setSpinChromeLocked(locked) {
    document.querySelectorAll("[data-close-spin]").forEach(function (el) {
      el.style.visibility = locked ? "hidden" : "";
      el.style.pointerEvents = locked ? "none" : "";
    });
    const panel = document.getElementById("spin-panel");
    if (panel) panel.dataset.rewardPending = locked ? "1" : "0";
  }

  function updateSpinUi() {
    const free = hasFreeSpin();
    const btn = document.getElementById("spin-btn");
    const hint = document.getElementById("spin-hint");
    const timer = document.getElementById("spin-timer");
    if (btn) {
      btn.disabled = spinning || awaitingRewardConfirm || !free;
      btn.textContent = free ? "Quay" : "Hết lượt";
    }
    if (hint) {
      hint.textContent = free
        ? "1 lượt quay miễn phí mỗi ngày · 2% gạch / nền"
        : "Quay lại vào ngày mai để nhận lượt miễn phí";
    }
    if (timer) {
      timer.textContent = formatHms(remainingMs());
    }
  }

  /** Cộng thưởng thẳng vào tài khoản (không flash ngoài popup) */
  function grantPrize(seg) {
    if (!g.Inventory) return;
    if (seg.kind === "heart") g.Inventory.addHearts(seg.amount);
    else if (seg.kind === "fire") g.Inventory.addFires(seg.amount);
    else if (seg.kind === "bubble") g.Inventory.addBubbles(seg.amount);
    else if (seg.kind === "wind") g.Inventory.addWinds(seg.amount);
    try {
      if (typeof g.Inventory.render === "function") g.Inventory.render();
    } catch (_) {}
  }

  function rollBonusQuiet(fn, chance) {
    if (typeof fn !== "function") return null;
    try {
      return fn(chance, true);
    } catch (_) {
      return null;
    }
  }

  function showSpinReward(seg, bonus) {
    const layer = document.getElementById("spin-reward-layer");
    const icon = document.getElementById("spin-reward-icon");
    const text = document.getElementById("spin-reward-text");
    const extra = document.getElementById("spin-reward-extra");
    const inv = document.getElementById("spin-reward-inv");
    if (!layer) return;

    awaitingRewardConfirm = true;
    setSpinChromeLocked(true);
    if (icon) icon.textContent = seg.label;
    if (text) text.textContent = "Đã nhận " + prizeDetail(seg);
    if (extra) {
      const parts = [];
      if (bonus && bonus.brick) {
        parts.push("🧱 Bonus: gạch " + (bonus.brickName || bonus.brick));
      }
      if (bonus && bonus.board) {
        parts.push("🗺️ Bonus: nền " + (bonus.boardName || bonus.board));
      }
      extra.textContent = parts.join(" · ");
    }
    if (inv) inv.textContent = "Tài khoản: " + invSummary();
    layer.hidden = false;
    updateSpinUi();
    try {
      if (typeof g.sfxUnlock === "function") g.sfxUnlock();
    } catch (_) {}
  }

  function hideSpinReward() {
    const layer = document.getElementById("spin-reward-layer");
    if (layer) layer.hidden = true;
    awaitingRewardConfirm = false;
    setSpinChromeLocked(false);
    updateSpinUi();
  }

  function confirmSpinReward() {
    try {
      if (typeof g.sfxClick === "function") g.sfxClick();
    } catch (_) {}
    hideSpinReward();
    const bonus = pendingBonus;
    pendingBonus = null;
    if (!bonus) return;
    setTimeout(function () {
      if (bonus.brick && typeof g.openBrickSkinPanel === "function") {
        g.openBrickSkinPanel("unlock", bonus.brick);
      }
    }, 300);
    setTimeout(function () {
      if (bonus.board && typeof g.openBoardSkinPanel === "function") {
        g.openBoardSkinPanel("unlock", bonus.board);
      }
    }, bonus.brick ? 900 : 300);
  }

  function spin() {
    if (spinning || awaitingRewardConfirm || !hasFreeSpin()) return;
    const wheel = document.getElementById("spin-wheel");
    if (!wheel) return;
    spinning = true;
    pendingBonus = null;
    hideSpinReward();
    updateSpinUi();

    const idx = Math.floor(Math.random() * SEGMENTS.length);
    const seg = SEGMENTS[idx];
    const targetCenter = idx * SEG + SEG / 2;
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const current = parseFloat(wheel.dataset.rot || "0") || 0;
    const next =
      current + extraTurns * 360 + (360 - (targetCenter % 360)) + (Math.random() * 8 - 4);
    wheel.dataset.rot = String(next);
    wheel.style.transition = "transform 4.2s cubic-bezier(0.12, 0.75, 0.12, 1)";
    wheel.style.transform = "rotate(" + next + "deg)";

    setTimeout(function () {
      markFreeSpinUsed();
      grantPrize(seg);

      const bonus = { brick: null, board: null, brickName: "", boardName: "" };
      bonus.brick = rollBonusQuiet(g.tryUnlockRandomBrickFromSpin, 0.02);
      bonus.board = rollBonusQuiet(g.tryUnlockRandomBoardFromSpin, 0.02);
      if (bonus.brick && g.BRICK_SKINS) {
        const s = g.BRICK_SKINS.find(function (x) {
          return x.id === bonus.brick;
        });
        if (s) bonus.brickName = s.name;
      }
      if (bonus.board && g.BOARD_SKINS) {
        const s = g.BOARD_SKINS.find(function (x) {
          return x.id === bonus.board;
        });
        if (s) bonus.boardName = s.name;
      }
      pendingBonus =
        bonus.brick || bonus.board ? bonus : null;

      spinning = false;
      showSpinReward(seg, pendingBonus);
    }, 4300);
  }

  function openLuckySpin() {
    if (typeof g.closeAllSettingsOverlays === "function") g.closeAllSettingsOverlays();
    buildWheel();
    const panel = document.getElementById("spin-panel");
    if (panel) panel.classList.add("show");
    updateSpinUi();
  }

  function closeLuckySpin() {
    if (spinning || awaitingRewardConfirm) return;
    const panel = document.getElementById("spin-panel");
    if (panel) panel.classList.remove("show");
    hideSpinReward();
    pendingBonus = null;
  }

  function initLuckySpin() {
    buildWheel();
    const btn = document.getElementById("spin-btn");
    if (btn) btn.addEventListener("click", spin);
    document.getElementById("spin-reward-ok")?.addEventListener("click", confirmSpinReward);
    document.querySelectorAll("[data-close-spin]").forEach(function (el) {
      el.addEventListener("click", closeLuckySpin);
    });
    setInterval(updateSpinUi, 1000);
    updateSpinUi();
  }

  g.openLuckySpin = openLuckySpin;
  g.closeLuckySpin = closeLuckySpin;
  g.initLuckySpin = initLuckySpin;
  g.hasFreeSpin = hasFreeSpin;
})(typeof window !== "undefined" ? window : globalThis);
