/* ═══════════════════════════════════════════════════════════════
   map-boards.js — 30 nền bàn cờ + chọn lúc mở đầu + mở khóa map ẩn / spin
   Nạp SAU brick-skins.js (cùng nhóm save), TRƯỚC ui.js / main.js
═══════════════════════════════════════════════════════════════ */
(function (g) {
  "use strict";

  const KEY = "chromablast_board_skins";

  const BOARD_SKINS = [
    { id: "classic", name: "Classic", desc: "Nền tối phẳng cổ điển", starter: true },
    { id: "slate", name: "Slate", desc: "Nền xám tím hiện tại", starter: true },
    { id: "wood", name: "Wood", desc: "Ván gỗ ấm" },
    { id: "garden", name: "Garden", desc: "Vườn xanh" },
    { id: "ocean", name: "Ocean", desc: "Đại dương" },
    { id: "night", name: "Night", desc: "Đêm sao" },
    { id: "sunset", name: "Sunset", desc: "Hoàng hôn" },
    { id: "ice", name: "Ice", desc: "Băng giá" },
    { id: "lava", name: "Lava", desc: "Nham thạch" },
    { id: "candy", name: "Candy", desc: "Kẹo ngọt" },
    { id: "neon", name: "Neon", desc: "Neon city" },
    { id: "sand", name: "Sand", desc: "Cát vàng" },
    { id: "marble", name: "Marble", desc: "Cẩm thạch" },
    { id: "metal", name: "Metal", desc: "Kim loại" },
    { id: "paper", name: "Paper", desc: "Giấy kraft" },
    { id: "pixel", name: "Pixel", desc: "Pixel grid" },
    { id: "forest", name: "Forest", desc: "Rừng sâu" },
    { id: "sakura", name: "Sakura", desc: "Hoa anh đào" },
    { id: "aurora", name: "Aurora", desc: "Cực quang" },
    { id: "retro", name: "Retro", desc: "Retro arcade" },
    { id: "cloud", name: "Cloud", desc: "Mây trời" },
    { id: "ink", name: "Ink", desc: "Mực đen" },
    { id: "gold", name: "Gold", desc: "Hoàng kim" },
    { id: "mint", name: "Mint", desc: "Bạc hà" },
    { id: "berry", name: "Berry", desc: "Quả mọng" },
    { id: "desert", name: "Desert", desc: "Sa mạc" },
    { id: "coral", name: "Coral", desc: "San hô" },
    { id: "storm", name: "Storm", desc: "Bão tố" },
    { id: "honey", name: "Honey", desc: "Mật ong" },
    { id: "violet", name: "Violet", desc: "Tím huyền" },
  ];

  const STARTER_IDS = BOARD_SKINS.filter(function (s) {
    return s.starter;
  }).map(function (s) {
    return s.id;
  });
  const UNLOCK_ORDER = BOARD_SKINS.filter(function (s) {
    return !s.starter;
  }).map(function (s) {
    return s.id;
  });

  let state = {
    active: "slate",
    unlocked: STARTER_IDS.slice(),
    starterPicked: false,
  };

  function loadState() {
    try {
      const raw = JSON.parse(
        (typeof safeGet === "function" ? safeGet(KEY) : null) ||
          localStorage.getItem(KEY) ||
          "{}"
      );
      if (!raw || typeof raw !== "object") return;
      if (typeof raw.active === "string") state.active = raw.active;
      if (Array.isArray(raw.unlocked)) {
        state.unlocked = Array.from(
          new Set(STARTER_IDS.concat(raw.unlocked.filter(Boolean)))
        );
      }
      state.starterPicked = !!raw.starterPicked;
      if (state.unlocked.indexOf(state.active) < 0) state.active = "slate";
    } catch (_) {}
  }

  function saveState() {
    try {
      const payload = JSON.stringify({
        active: state.active,
        unlocked: state.unlocked,
        starterPicked: !!state.starterPicked,
      });
      if (typeof safeSet === "function") safeSet(KEY, payload);
      else localStorage.setItem(KEY, payload);
    } catch (_) {}
  }

  function getSkin(id) {
    return BOARD_SKINS.find(function (s) {
      return s.id === id;
    });
  }

  function isUnlocked(id) {
    return state.unlocked.indexOf(id) >= 0;
  }

  function applyBoardSkin(id) {
    if (!getSkin(id)) id = "slate";
    state.active = id;
    document.documentElement.setAttribute("data-board-skin", id);
    const root = document.getElementById("game-root");
    if (root) root.setAttribute("data-board-skin", id);
    saveState();
  }

  function unlockBoardSkin(id) {
    if (!getSkin(id) || isUnlocked(id)) return false;
    state.unlocked.push(id);
    saveState();
    return true;
  }

  function nextLockedSkinId() {
    for (let i = 0; i < UNLOCK_ORDER.length; i++) {
      if (!isUnlocked(UNLOCK_ORDER[i])) return UNLOCK_ORDER[i];
    }
    return null;
  }

  function makePreview(skinId) {
    const d = document.createElement("div");
    d.className = "board-swatch";
    d.setAttribute("data-board-skin", skinId);
    return d;
  }

  function makeSkinCard(skin, opts) {
    opts = opts || {};
    const card = document.createElement("button");
    card.type = "button";
    card.className =
      "board-skin-card" +
      (opts.locked ? " locked" : "") +
      (opts.active ? " active" : "") +
      (opts.hl ? " highlight" : "");
    card.dataset.id = skin.id;
    if (opts.locked) card.disabled = true;

    const preview = document.createElement("div");
    preview.className = "board-skin-preview";
    preview.appendChild(makePreview(skin.id));

    const name = document.createElement("div");
    name.className = "board-skin-name";
    name.textContent = skin.name;

    const desc = document.createElement("div");
    desc.className = "board-skin-desc";
    desc.textContent = opts.locked ? "🔒 Chưa mở khóa" : skin.desc;

    card.appendChild(preview);
    card.appendChild(name);
    card.appendChild(desc);
    if (!opts.locked && typeof opts.onPick === "function") {
      card.addEventListener("click", function () {
        try {
          if (typeof sfxClick === "function") sfxClick();
        } catch (_) {}
        opts.onPick(skin.id);
      });
    }
    return card;
  }

  function ensurePanel() {
    let panel = document.getElementById("board-skin-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "board-skin-panel";
    panel.className = "board-skin-overlay";
    panel.innerHTML =
      '<div class="board-skin-modal" role="dialog" aria-modal="true">' +
      '<button type="button" class="board-skin-x" id="board-skin-close" aria-label="Close">✕</button>' +
      '<div class="board-skin-title" id="board-skin-title">Chọn nền bàn</div>' +
      '<div class="board-skin-sub" id="board-skin-sub"></div>' +
      '<div class="board-skin-grid" id="board-skin-grid"></div>' +
      '<button type="button" class="board-skin-ok" id="board-skin-ok">Xong</button>' +
      "</div>";
    document.body.appendChild(panel);
    panel.addEventListener("click", function (e) {
      if (e.target === panel && panel.dataset.mode !== "starter") {
        closeBoardSkinPanel();
      }
    });
    document.getElementById("board-skin-close").addEventListener("click", function () {
      if (panel.dataset.mode === "starter") return;
      closeBoardSkinPanel();
    });
    document.getElementById("board-skin-ok").addEventListener("click", function () {
      try {
        if (typeof sfxClick === "function") sfxClick();
      } catch (_) {}
      closeBoardSkinPanel();
      if (panel.dataset.mode === "starter" && typeof panel._onStarterDone === "function") {
        const cb = panel._onStarterDone;
        panel._onStarterDone = null;
        cb();
      }
    });
    return panel;
  }

  function fillGrid(mode, highlightId) {
    const grid = document.getElementById("board-skin-grid");
    const title = document.getElementById("board-skin-title");
    const sub = document.getElementById("board-skin-sub");
    const ok = document.getElementById("board-skin-ok");
    const closeBtn = document.getElementById("board-skin-close");
    if (!grid) return;

    grid.innerHTML = "";
    if (mode === "starter") {
      title.textContent = "Chọn nền bàn khởi đầu";
      sub.textContent = "Classic (tối phẳng) hoặc Slate (nền hiện tại)";
      ok.style.display = "none";
      closeBtn.style.display = "none";
      STARTER_IDS.forEach(function (id) {
        const skin = getSkin(id);
        grid.appendChild(
          makeSkinCard(skin, {
            active: state.active === id,
            onPick: function (sid) {
              state.starterPicked = true;
              applyBoardSkin(sid);
              closeBoardSkinPanel();
              const panel = document.getElementById("board-skin-panel");
              if (panel && typeof panel._onStarterDone === "function") {
                const cb = panel._onStarterDone;
                panel._onStarterDone = null;
                cb();
              }
            },
          })
        );
      });
      return;
    }

    if (mode === "unlock") {
      const neu = getSkin(highlightId);
      title.textContent = "🗺️ Nền bàn mới!";
      sub.textContent = neu
        ? "Mở khóa: " + neu.name + " — chọn để dùng hoặc giữ nền hiện tại"
        : "Chọn nền bàn";
      ok.textContent = "Tiếp tục";
      ok.style.display = "block";
      closeBtn.style.display = "block";
    } else {
      title.textContent = "Kho nền bàn";
      sub.textContent =
        "Đã mở " + state.unlocked.length + "/" + BOARD_SKINS.length;
      ok.textContent = "Xong";
      ok.style.display = "block";
      closeBtn.style.display = "block";
    }

    BOARD_SKINS.forEach(function (skin) {
      const locked = !isUnlocked(skin.id);
      grid.appendChild(
        makeSkinCard(skin, {
          locked: locked,
          active: state.active === skin.id,
          hl: highlightId === skin.id,
          onPick: function (sid) {
            applyBoardSkin(sid);
            fillGrid(mode, highlightId);
          },
        })
      );
    });
  }

  function openBoardSkinPanel(mode, highlightId, onStarterDone) {
    const panel = ensurePanel();
    panel.dataset.mode = mode || "browse";
    panel._onStarterDone = onStarterDone || null;
    fillGrid(mode || "browse", highlightId);
    panel.classList.add("show");
  }

  function closeBoardSkinPanel() {
    const panel = document.getElementById("board-skin-panel");
    if (panel) panel.classList.remove("show");
  }

  function maybeShowStarterBoardPicker(thenFn) {
    if (state.starterPicked) {
      if (typeof thenFn === "function") thenFn();
      return;
    }
    openBoardSkinPanel("starter", null, thenFn);
  }

  function onHiddenMapClearedForBoard() {
    let mapsLeft = 0;
    try {
      const total =
        typeof HIDDEN_MAP_LIST !== "undefined" && HIDDEN_MAP_LIST
          ? HIDDEN_MAP_LIST.length
          : 21;
      const cleared =
        typeof clearedHiddenMaps !== "undefined" && clearedHiddenMaps
          ? clearedHiddenMaps.size
          : 0;
      mapsLeft = Math.max(0, total - cleared);
    } catch (_) {
      mapsLeft = 0;
    }
    const remaining = UNLOCK_ORDER.filter(function (id) {
      return !isUnlocked(id);
    }).length;
    let n = 1;
    if (remaining > mapsLeft + 1) n = 2;

    let last = null;
    for (let i = 0; i < n; i++) {
      const next = nextLockedSkinId();
      if (!next) break;
      unlockBoardSkin(next);
      last = next;
    }
    if (!last) return null;

    // Trễ hơn picker gạch để không chồng modal
    setTimeout(function () {
      openBoardSkinPanel("unlock", last);
      try {
        if (typeof sfxUnlock === "function") sfxUnlock();
      } catch (_) {}
      try {
        if (typeof showComboFlash === "function") {
          const s = getSkin(last);
          showComboFlash(0, false, "🗺️ Mở khóa nền: " + (s ? s.name : last));
        }
      } catch (_) {}
    }, 3200);
    return last;
  }

  function tryUnlockRandomBoardFromSpin(chance, quiet) {
    if (typeof chance !== "number") chance = 0.02;
    if (Math.random() >= chance) return null;
    const locked = UNLOCK_ORDER.filter(function (id) {
      return !isUnlocked(id);
    });
    const pool =
      locked.length > 0
        ? locked
        : BOARD_SKINS.map(function (s) {
            return s.id;
          }).filter(function (id) {
            return !isUnlocked(id);
          });
    if (!pool.length) return null;
    const id = pool[Math.floor(Math.random() * pool.length)];
    if (!unlockBoardSkin(id)) return null;
    if (quiet) return id;
    setTimeout(function () {
      openBoardSkinPanel("unlock", id);
      try {
        if (typeof sfxUnlock === "function") sfxUnlock();
      } catch (_) {}
      try {
        if (typeof showComboFlash === "function") {
          const s = getSkin(id);
          showComboFlash(
            0,
            false,
            "🗺️ Spin hiếm! Nền bàn: " + (s ? s.name : id)
          );
        }
      } catch (_) {}
    }, 1400);
    return id;
  }

  function initBoardSkins() {
    loadState();
    applyBoardSkin(state.active);
    ensurePanel();
    document.getElementById("board-skin-btn")?.addEventListener("click", function () {
      try {
        if (typeof sfxClick === "function") sfxClick();
      } catch (_) {}
      openBoardSkinPanel("browse");
    });
    document.getElementById("set-btn-boards")?.addEventListener("click", function () {
      try {
        if (typeof sfxClick === "function") sfxClick();
      } catch (_) {}
      try {
        if (typeof closeAllSettingsOverlays === "function") closeAllSettingsOverlays();
      } catch (_) {}
      openBoardSkinPanel("browse");
    });
  }

  g.BOARD_SKINS = BOARD_SKINS;
  g.applyBoardSkin = applyBoardSkin;
  g.unlockBoardSkin = unlockBoardSkin;
  g.openBoardSkinPanel = openBoardSkinPanel;
  g.closeBoardSkinPanel = closeBoardSkinPanel;
  g.maybeShowStarterBoardPicker = maybeShowStarterBoardPicker;
  g.onHiddenMapClearedForBoard = onHiddenMapClearedForBoard;
  g.tryUnlockRandomBoardFromSpin = tryUnlockRandomBoardFromSpin;
  g.initBoardSkins = initBoardSkins;
  g.getActiveBoardSkin = function () {
    return state.active;
  };

  loadState();
  if (document.documentElement) {
    document.documentElement.setAttribute("data-board-skin", state.active);
  }
})(typeof window !== "undefined" ? window : globalThis);
