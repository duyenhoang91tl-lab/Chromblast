/* ═══════════════════════════════════════════════════════════════
   map-boards.js — 30 nền bàn cờ + chọn lúc mở đầu + mở khóa map ẩn / spin
   Nạp SAU brick-skins.js (cùng nhóm save), TRƯỚC ui.js / main.js
═══════════════════════════════════════════════════════════════ */
(function (g) {
  "use strict";

  const KEY = "chromablast_board_skins";
  function tt(key){
    try{ if(typeof t==='function') return t.apply(null, arguments); }catch(e){}
    return key;
  }
  function skinDesc(skin){
    const d=skin && skin.desc;
    if(d && typeof d==='object'){
      const lang=(typeof currentLang!=='undefined' && currentLang) || 'vi';
      if(d[lang]) return d[lang];
      if(lang!=='vi' && d.en) return d.en;
      return d.vi || d.en || '';
    }
    return d || '';
  }


  const BOARD_SKINS = [
    { id: "classic", name: "Classic", desc: { vi: 'Nền tối phẳng cổ điển', en: 'Flat classic dark board' }, starter: true  },
    { id: "slate", name: "Slate", desc: { vi: 'Nền xám tím hiện tại', en: 'Current slate purple board' }, starter: true  },
    { id: "wood", name: "Wood", desc: { vi: 'Ván gỗ ấm', en: 'Warm wood planks' }, price: 8 },
    { id: "garden", name: "Garden", desc: { vi: 'Vườn xanh', en: 'Green garden' }, price: 10 },
    { id: "ocean", name: "Ocean", desc: { vi: 'Đại dương', en: 'Ocean depths' }, price: 14 },
    { id: "night", name: "Night", desc: { vi: 'Đêm sao', en: 'Starry night' }, price: 16 },
    { id: "sunset", name: "Sunset", desc: { vi: 'Hoàng hôn', en: 'Sunset glow' }, price: 18 },
    { id: "ice", name: "Ice", desc: { vi: 'Băng giá', en: 'Icy frost' }, price: 20 },
    { id: "lava", name: "Lava", desc: { vi: 'Nham thạch', en: 'Molten lava' }, price: 28 },
    { id: "candy", name: "Candy", desc: { vi: 'Kẹo ngọt', en: 'Sweet candy' }, price: 24 },
    { id: "neon", name: "Neon", desc: { vi: 'Neon city', en: 'Neon city' }, price: 36 },
    { id: "sand", name: "Sand", desc: { vi: 'Cát vàng', en: 'Golden sand' }, price: 12 },
    { id: "marble", name: "Marble", desc: { vi: 'Cẩm thạch', en: 'Marble stone' }, price: 48 },
    { id: "metal", name: "Metal", desc: { vi: 'Kim loại', en: 'Brushed metal' }, price: 32 },
    { id: "paper", name: "Paper", desc: { vi: 'Giấy kraft', en: 'Kraft paper' }, price: 10 },
    { id: "pixel", name: "Pixel", desc: { vi: 'Pixel grid', en: 'Pixel grid' }, price: 22 },
    { id: "forest", name: "Forest", desc: { vi: 'Rừng sâu', en: 'Deep forest' }, price: 26 },
    { id: "sakura", name: "Sakura", desc: { vi: 'Hoa anh đào', en: 'Cherry blossoms' }, price: 55 },
    { id: "aurora", name: "Aurora", desc: { vi: 'Cực quang', en: 'Northern lights' }, price: 72 },
    { id: "retro", name: "Retro", desc: { vi: 'Retro arcade', en: 'Retro arcade' }, price: 30 },
    { id: "cloud", name: "Cloud", desc: { vi: 'Mây trời', en: 'Sky clouds' }, price: 15 },
    { id: "ink", name: "Ink", desc: { vi: 'Mực đen', en: 'Black ink' }, price: 40 },
    { id: "gold", name: "Gold", desc: { vi: 'Hoàng kim', en: 'Royal gold' }, price: 100 },
    { id: "mint", name: "Mint", desc: { vi: 'Bạc hà', en: 'Fresh mint' }, price: 18 },
    { id: "berry", name: "Berry", desc: { vi: 'Quả mọng', en: 'Berry tones' }, price: 22 },
    { id: "desert", name: "Desert", desc: { vi: 'Sa mạc', en: 'Desert dunes' }, price: 16 },
    { id: "coral", name: "Coral", desc: { vi: 'San hô', en: 'Coral reef' }, price: 58 },
    { id: "storm", name: "Storm", desc: { vi: 'Bão tố', en: 'Stormy skies' }, price: 64 },
    { id: "honey", name: "Honey", desc: { vi: 'Mật ong', en: 'Honey amber' }, price: 42 },
    { id: "violet", name: "Violet", desc: { vi: 'Tím huyền', en: 'Mystic violet' }, price: 80 },
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
    // Chỉ áp dụng nền đã mở khóa ở map xếp hình chính
    if (!isUnlocked(id)) {
      id = isUnlocked(state.active) ? state.active : "slate";
      if (!isUnlocked(id)) id = STARTER_IDS[0] || "classic";
    }
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
    const price = skin.price | 0;
    const shopLocked = !!(opts.locked && price > 0);
    card.className =
      "board-skin-card" +
      (opts.locked ? " locked" : "") +
      (opts.active ? " active" : "") +
      (opts.hl ? " highlight" : "") +
      (shopLocked ? " shop-buyable" : "");
    card.dataset.id = skin.id;
    // Cho phép bấm khi khóa để mua trong shop / mua nhanh
    if (opts.locked && !shopLocked) card.disabled = true;

    const preview = document.createElement("div");
    preview.className = "board-skin-preview";
    preview.appendChild(makePreview(skin.id));

    const name = document.createElement("div");
    name.className = "board-skin-name";
    name.textContent = skin.name;

    const desc = document.createElement("div");
    desc.className = "board-skin-desc";
    if (opts.locked && price > 0) {
      desc.textContent = "🪙 " + price + " · " + tt("boardSkinBuyShop", "Mua trong Shop");
    } else {
      desc.textContent = opts.locked ? tt("boardSkinLocked") : skinDesc(skin);
    }

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
    } else if (shopLocked) {
      card.addEventListener("click", function () {
        try {
          if (typeof sfxClick === "function") sfxClick();
        } catch (_) {}
        if (typeof openShop === "function") openShop("boards");
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
      '<div class="board-skin-title" id="board-skin-title"></div>' +
      '<div class="board-skin-sub" id="board-skin-sub"></div>' +
      '<div class="board-skin-grid" id="board-skin-grid"></div>' +
      '<button type="button" class="board-skin-ok" id="board-skin-ok"></button>' +
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
      title.textContent = tt("boardSkinStarter");
      sub.textContent = "";
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
      title.textContent = tt("boardSkinNew");
      sub.textContent = neu
        ? tt("boardSkinUnlock", neu.name)
        : tt("boardSkinPick");
      ok.textContent = tt("boardSkinContinue");
      ok.style.display = "block";
      closeBtn.style.display = "block";
    } else {
      title.textContent = tt("boardSkinTitle");
      sub.textContent =
        tt("boardSkinOwned", state.unlocked.length, BOARD_SKINS.length);
      ok.textContent = tt("boardSkinDone");
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
    // Nền bàn chỉ mua bằng vàng trong Shop — không tặng khi phá map ẩn
    return null;
  }

  function tryUnlockRandomBoardFromSpin(chance, quiet) {
    // Không mở nền bằng vòng quay — chỉ Shop
    return null;
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
  g.isBoardSkinUnlocked = isUnlocked;
  g.getUnlockedBoardSkinIds = function () {
    return state.unlocked.slice();
  };
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
