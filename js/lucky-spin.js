/* Lucky Spin — 1 free spin / day. Ô gạch + nền riêng, 10% miss, popup Nhận. */
(function (g) {
  "use strict";

  const KEY_SPIN = "chromablast_lucky_spin";
  /** 10 ô đều nhau → mỗi ô 10% (miss / gạch / nền mỗi cái đúng 10%). */
  const SEGMENTS = [
    { kind: "heart", amount: 1, icon: "❤️", color: "#FDA4AF" },
    { kind: "fire", amount: 2, icon: "🔥", color: "#FF9E80" },
    { kind: "bubble", amount: 2, icon: "🫧", color: "#7DD3FC" },
    { kind: "wind", amount: 2, icon: "💨", color: "#86EFAC" },
    { kind: "brick", amount: 1, icon: "🧱", color: "#FDBA74" },
    { kind: "board", amount: 1, icon: "🗺️", color: "#93C5FD" },
    { kind: "heart", amount: 2, icon: "❤️", color: "#C4B5FD" },
    { kind: "fire", amount: 3, icon: "🔥", color: "#FCD34D" },
    { kind: "heart", amount: 3, icon: "❤️", color: "#F9A8D4" },
    { kind: "miss", amount: 0, icon: "🍀", color: "#A8A29E" },
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

  function prizeDetail(seg, bonus) {
    const tt = typeof t === "function" ? t : function (k) { return k; };
    if (seg.kind === "miss") return tt("prizeMiss", "Chúc bạn may mắn lần sau");
    if (seg.kind === "heart") return tt("prizeHeart", seg.amount);
    if (seg.kind === "fire") return tt("prizeFire", seg.amount);
    if (seg.kind === "bubble") return tt("prizeBubble", seg.amount);
    if (seg.kind === "wind") return tt("prizeWind", seg.amount);
    if (seg.kind === "brick") {
      if (bonus && bonus.brickName) return tt("prizeBrick", bonus.brickName);
      return tt("prizeBrickNone", "Gạch (đã đủ / chưa mở được)");
    }
    if (seg.kind === "board") {
      if (bonus && bonus.boardName) return tt("prizeBoard", bonus.boardName);
      return tt("prizeBoardNone", "Nền bàn (đã đủ / chưa mở được)");
    }
    return seg.icon || "";
  }

  function invSummary() {
    if (!g.Inventory) return "";
    const h =
      typeof g.Inventory.formatHearts === "function"
        ? g.Inventory.formatHearts(g.Inventory.hearts)
        : String(g.Inventory.hearts | 0);
    const f = g.Inventory.fires | 0;
    const b = g.Inventory.bubbles | 0;
    const w = g.Inventory.winds | 0;
    return "❤️ " + h + "  ·  🔥 " + f + "  ·  🫧 " + b + "  ·  💨 " + w;
  }

  function buildWheel() {
    const wheel = document.getElementById("spin-wheel");
    if (!wheel) return;
    // Force rebuild when segment set changes
    if (wheel.dataset.built === "floral-v4") return;
    wheel.innerHTML = "";
    wheel.dataset.built = "floral-v4";
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
      label.style.transform = "rotate(" + mid + "deg) translateY(-70px)";
      let amtHtml = "";
      if (seg.kind === "miss") {
        amtHtml = '<span class="spin-seg-amt spin-seg-miss">?</span>';
      } else if (seg.kind === "brick" || seg.kind === "board") {
        amtHtml = "";
      } else {
        amtHtml = '<span class="spin-seg-amt">×' + seg.amount + "</span>";
      }
      label.innerHTML =
        '<span class="spin-seg-ico" aria-hidden="true">' +
        (seg.icon || "") +
        "</span>" +
        amtHtml;
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
    const tt = typeof t === "function" ? t : function (k) { return k; };
    if (btn) {
      btn.disabled = spinning || awaitingRewardConfirm || !free;
      btn.textContent = free ? tt("spinBtn") : tt("spinNoTurns");
    }
    if (hint) {
      hint.textContent = free ? tt("spinHintFree") : tt("spinHintWait");
    }
    if (timer) {
      timer.textContent = formatHms(remainingMs());
    }
  }

  function grantPrize(seg) {
    if (seg.kind === "miss") return null;
    if (seg.kind === "heart" || seg.kind === "fire" || seg.kind === "bubble" || seg.kind === "wind") {
      if (!g.Inventory) return null;
      if (seg.kind === "heart") g.Inventory.addHearts(seg.amount);
      else if (seg.kind === "fire") g.Inventory.addFires(seg.amount);
      else if (seg.kind === "bubble") g.Inventory.addBubbles(seg.amount);
      else if (seg.kind === "wind") g.Inventory.addWinds(seg.amount);
      try {
        if (typeof g.Inventory.render === "function") g.Inventory.render();
      } catch (_) {}
      return null;
    }
    const bonus = { brick: null, board: null, brickName: "", boardName: "" };
    if (seg.kind === "brick" && typeof g.tryUnlockRandomBrickFromSpin === "function") {
      bonus.brick = g.tryUnlockRandomBrickFromSpin(1, true);
      if (bonus.brick && g.BRICK_SKINS) {
        const s = g.BRICK_SKINS.find(function (x) { return x.id === bonus.brick; });
        if (s) bonus.brickName = s.name;
      }
    }
    if (seg.kind === "board" && typeof g.tryUnlockRandomBoardFromSpin === "function") {
      bonus.board = g.tryUnlockRandomBoardFromSpin(1, true);
      if (bonus.board && g.BOARD_SKINS) {
        const s = g.BOARD_SKINS.find(function (x) { return x.id === bonus.board; });
        if (s) bonus.boardName = s.name;
      }
    }
    return bonus.brick || bonus.board ? bonus : null;
  }

  function showSpinReward(seg, bonus) {
    const layer = document.getElementById("spin-reward-layer");
    const icon = document.getElementById("spin-reward-icon");
    const text = document.getElementById("spin-reward-text");
    const title = document.querySelector(".spin-reward-title");
    const extra = document.getElementById("spin-reward-extra");
    const inv = document.getElementById("spin-reward-inv");
    const ok = document.getElementById("spin-reward-ok");
    if (!layer) return;

    awaitingRewardConfirm = true;
    setSpinChromeLocked(true);
    const tt = typeof t === "function" ? t : function (k, a) { return k; };
    const isMiss = seg.kind === "miss";

    if (title) {
      title.textContent = isMiss
        ? tt("spinMissTitle", "Tiếc quá!")
        : tt("spinCongratsTitle", "Chúc mừng!");
    }
    if (icon) {
      if (isMiss) icon.textContent = seg.icon || "🍀";
      else if (seg.kind === "brick" || seg.kind === "board") icon.textContent = seg.icon || "🎁";
      else icon.textContent = (seg.icon || "") + (seg.amount ? "×" + seg.amount : "");
    }
    if (text) {
      if (isMiss) {
        text.textContent = tt("prizeMiss", "Chúc bạn may mắn lần sau");
      } else {
        text.textContent = tt("spinGot", prizeDetail(seg, bonus));
      }
    }
    if (extra) extra.textContent = "";
    if (inv) {
      inv.textContent = isMiss ? "" : tt("spinInv", invSummary());
      inv.style.display = isMiss ? "none" : "";
    }
    if (ok) ok.textContent = tt("spinClaim", "Nhận");
    layer.hidden = false;
    updateSpinUi();
    try {
      if (!isMiss && typeof g.sfxUnlock === "function") g.sfxUnlock();
      else if (typeof g.sfxClick === "function") g.sfxClick();
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
      const bonus = grantPrize(seg);
      pendingBonus = bonus;
      spinning = false;
      showSpinReward(seg, bonus);
    }, 4300);
  }

  function openLuckySpin() {
    if (typeof g.closeAllSettingsOverlays === "function") g.closeAllSettingsOverlays();
    const wheel = document.getElementById("spin-wheel");
    if (wheel && wheel.dataset.built !== "floral-v4") {
      delete wheel.dataset.built;
    }
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
