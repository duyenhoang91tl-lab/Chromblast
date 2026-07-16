/* Lucky Spin — 1 free spin / day. Prizes: heart, energy, saw ×2/×3. */
(function (g) {
  "use strict";

  const KEY_SPIN = "chromablast_lucky_spin";
  const SEGMENTS = [
    { kind: "energy", amount: 2, label: "⚡×2", color: "#c4b5fd" },
    { kind: "saw", amount: 2, label: "🪚×2", color: "#f8fafc" },
    { kind: "heart", amount: 2, label: "❤️×2", color: "#ddd6fe" },
    { kind: "energy", amount: 3, label: "⚡×3", color: "#f8fafc" },
    { kind: "saw", amount: 3, label: "🪚×3", color: "#c4b5fd" },
    { kind: "heart", amount: 3, label: "❤️×3", color: "#f8fafc" },
  ];
  const SEG = 360 / SEGMENTS.length;

  let spinning = false;

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

  function updateSpinUi() {
    const free = hasFreeSpin();
    const btn = document.getElementById("spin-btn");
    const hint = document.getElementById("spin-hint");
    const timer = document.getElementById("spin-timer");
    if (btn) {
      btn.disabled = spinning || !free;
      btn.textContent = free ? "Quay" : "Hết lượt";
    }
    if (hint) {
      hint.textContent = free
        ? "1 lượt quay miễn phí mỗi ngày · 2% ra gạch mới"
        : "Quay lại vào ngày mai để nhận lượt miễn phí";
    }
    if (timer) {
      timer.textContent = formatHms(remainingMs());
    }
  }

  function grantPrize(seg) {
    if (!g.Inventory) return;
    if (seg.kind === "heart") g.Inventory.addHearts(seg.amount, "spin");
    else if (seg.kind === "energy") g.Inventory.addEnergy(seg.amount);
    else if (seg.kind === "saw") g.Inventory.addSaws(seg.amount);
  }

  function spin() {
    if (spinning || !hasFreeSpin()) return;
    const wheel = document.getElementById("spin-wheel");
    if (!wheel) return;
    spinning = true;
    updateSpinUi();

    const idx = Math.floor(Math.random() * SEGMENTS.length);
    const seg = SEGMENTS[idx];
    /* Pointer at top; segment centers at -90 + (i+0.5)*SEG in CSS conic from -90deg */
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
      spinning = false;
      updateSpinUi();
      try {
        if (typeof g.showComboFlash === "function") {
          g.showComboFlash(0, false, "🎡 Nhận " + seg.label + "!");
        }
      } catch (_) {}
      try {
        if (typeof g.sfxUnlock === "function") g.sfxUnlock();
      } catch (_) {}
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
    const panel = document.getElementById("spin-panel");
    if (panel) panel.classList.remove("show");
  }

  function initLuckySpin() {
    buildWheel();
    const btn = document.getElementById("spin-btn");
    if (btn) btn.addEventListener("click", spin);
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
