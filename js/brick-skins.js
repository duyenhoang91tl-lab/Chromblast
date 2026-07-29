/* ═══════════════════════════════════════════════════════════════
   brick-skins.js — 30 kiểu gạch + chọn lúc mở đầu + mở khóa khi thắng map ẩn
   Nạp SAU save.js, TRƯỚC ui.js / main.js
═══════════════════════════════════════════════════════════════ */
(function (g) {
  "use strict";

  const KEY = "chromablast_brick_skins";
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


  /** classic + plush mở sẵn; còn lại chỉ mua bằng vàng trong Shop */
  const BRICK_SKINS = [
    { id: "classic", name: "Classic", desc: { vi: 'Gạch bevel cổ điển', en: 'Classic beveled bricks' }, starter: true  },
    { id: "plush", name: "Plush", desc: { vi: 'Bông xù hiện tại', en: 'Current plush style' }, starter: true  },
    { id: "paper", name: "Paper", desc: { vi: 'Giấy gấp', en: 'Folded paper' }, price: 10 },
    { id: "chalk", name: "Chalk", desc: { vi: 'Phấn bảng', en: 'Chalkboard' }, price: 15 },
    { id: "stone", name: "Stone", desc: { vi: 'Đá thô', en: 'Rough stone' }, price: 15 },
    { id: "pixel", name: "Pixel", desc: { vi: 'Pixel 8-bit', en: 'Pixel' }, price: 20 },
    { id: "matte", name: "Matte", desc: { vi: 'Nhám mờ', en: 'Matte finish' }, price: 20 },
    { id: "ice", name: "Ice", desc: { vi: 'Băng giá', en: 'Icy frost' }, price: 25 },
    { id: "glossy", name: "Glossy", desc: { vi: 'Bóng gương', en: 'Mirror gloss' }, price: 25 },
    { id: "jelly", name: "Jelly", desc: { vi: 'Thạch mềm', en: 'Soft jelly' }, price: 25 },
    { id: "pastel", name: "Pastel", desc: { vi: 'Pastel dịu', en: 'Soft pastel' }, price: 25 },
    { id: "retro", name: "Retro", desc: { vi: 'Retro phẳng', en: 'Flat retro' }, price: 25 },
    { id: "glass", name: "Glass", desc: { vi: 'Thủy tinh trong', en: 'Clear glass' }, price: 30 },
    { id: "metal", name: "Metal", desc: { vi: 'Kim loại xước', en: 'Brushed metal' }, price: 30 },
    { id: "lava", name: "Lava", desc: { vi: 'Nham thạch', en: 'Molten lava' }, price: 30 },
    { id: "watercolor", name: "Watercolor", desc: { vi: 'Màu nước', en: 'Watercolor wash' }, price: 30 },
    { id: "ceramic", name: "Ceramic", desc: { vi: 'Sứ men', en: 'Glazed ceramic' }, price: 30 },
    { id: "wood", name: "Wood", desc: { vi: 'Gỗ vân ấm', en: 'Warm wood grain' }, price: 35 },
    { id: "leather", name: "Leather", desc: { vi: 'Da thật', en: 'Real leather' }, price: 35 },
    { id: "felt", name: "Felt", desc: { vi: 'Nỉ mềm', en: 'Soft felt' }, price: 35 },
    { id: "rubber", name: "Rubber", desc: { vi: 'Cao su', en: 'Rubber' }, price: 35 },
    { id: "bubble", name: "Bubble", desc: { vi: 'Bong bóng', en: 'Bubbly' }, price: 35 },
    { id: "neon", name: "Neon", desc: { vi: 'Ô neon + thú màu gạch thường', en: 'Neon tiles + pet icons' }, price: 40 },
    { id: "silver", name: "Silver", desc: { vi: 'Bạc lạnh', en: 'Cool silver' }, price: 40 },
    { id: "chroma", name: "Chroma", desc: { vi: 'Bóng ngọt + icon', en: 'Sweet gloss + icons' }, price: 45 },
    { id: "marble", name: "Marble", desc: { vi: 'Cẩm thạch', en: 'Marble stone' }, price: 50 },
    { id: "crystal", name: "Crystal", desc: { vi: 'Pha lê đa giác', en: 'Crystal facets' }, price: 55 },
    { id: "holo", name: "Holo", desc: { vi: 'Hologram', en: 'Holo' }, price: 70 },
    { id: "galaxy", name: "Galaxy", desc: { vi: 'Thiên hà', en: 'Galaxy space' }, price: 80 },
    { id: "gold", name: "Gold", desc: { vi: 'Vàng bóng', en: 'Shiny gold' }, price: 90 },
    { id: "chrome", name: "Chrome", desc: { vi: 'Chrome gương', en: 'Mirror chrome' }, price: 100 },
  ];

  const STARTER_IDS = BRICK_SKINS.filter(function (s) {
    return s.starter;
  }).map(function (s) {
    return s.id;
  });
  /** Tuần tự mỗi map ẩn — không gồm skin gắn map cụ thể (vd. chroma → map 7) */
  const UNLOCK_ORDER = BRICK_SKINS.filter(function (s) {
    return !s.starter && !s.unlockMap;
  }).map(function (s) {
    return s.id;
  });

  const SAMPLE_COLORS = ["#E24B4A", "#378ADD", "#1D9E75", "#EF9F27", "#7F77DD", "#D4537E"];

  let state = {
    active: "plush",
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
      if (state.unlocked.indexOf(state.active) < 0) state.active = "plush";
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
    return BRICK_SKINS.find(function (s) {
      return s.id === id;
    });
  }

  function isUnlocked(id) {
    return state.unlocked.indexOf(id) >= 0;
  }

  function applyBrickSkin(id) {
    if (!getSkin(id)) id = "plush";
    state.active = id;
    document.documentElement.setAttribute("data-brick-skin", id);
    const root = document.getElementById("game-root");
    if (root) root.setAttribute("data-brick-skin", id);
    saveState();
    try {
      if (typeof renderGrid === "function") renderGrid();
    } catch (_) {}
    try {
      if (typeof renderPieces === "function") renderPieces();
    } catch (_) {}
  }

  function unlockBrickSkin(id) {
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

  function isHiddenMapCleared(key) {
    if (typeof clearedHiddenMaps === "undefined" || !clearedHiddenMaps) return false;
    if (clearedHiddenMaps.has(key)) return true;
    try {
      if (typeof CLEARED_MAPS_ALIAS !== "undefined" && CLEARED_MAPS_ALIAS) {
        if (CLEARED_MAPS_ALIAS[key] && clearedHiddenMaps.has(CLEARED_MAPS_ALIAS[key]))
          return true;
        for (const k in CLEARED_MAPS_ALIAS) {
          if (CLEARED_MAPS_ALIAS[k] === key && clearedHiddenMaps.has(k)) return true;
        }
      }
    } catch (_) {}
    return false;
  }

  /** Không còn mở gạch bằng map ẩn — chỉ Shop */
  function syncMapGatedBrickSkins() {
    return null;
  }

  function announceBrickUnlock(id) {
    if (!id) return;
    setTimeout(function () {
      openBrickSkinPanel("unlock", id);
      try {
        if (typeof sfxUnlock === "function") sfxUnlock();
      } catch (_) {}
      try {
        if (typeof showComboFlash === "function") {
          const s = getSkin(id);
          showComboFlash(0, false, tt("brickUnlockFlash", s ? s.name : id));
        }
      } catch (_) {}
    }, 600);
  }

  function makeSwatch(skinId, color) {
    const d = document.createElement("div");
    d.className = "brick-swatch";
    d.setAttribute("data-brick-skin", skinId);
    const cc = color || SAMPLE_COLORS[0];
    d.style.setProperty("--cc", cc);
    const palette = typeof COLORS !== "undefined" ? COLORS : SAMPLE_COLORS;
    const ci = palette.indexOf(cc);
    if (ci >= 0) d.dataset.ci = String(ci);
    return d;
  }

  function makeSkinCard(skin, opts) {
    opts = opts || {};
    const card = document.createElement("button");
    card.type = "button";
    const price = skin.price | 0;
    const shopLocked = !!(opts.locked && price > 0);
    card.className =
      "brick-skin-card" +
      (opts.locked ? " locked" : "") +
      (opts.active ? " active" : "") +
      (opts.hl ? " highlight" : "") +
      (shopLocked ? " shop-buyable" : "");
    card.dataset.id = skin.id;
    if (opts.locked && !shopLocked) card.disabled = true;

    const preview = document.createElement("div");
    preview.className = "brick-skin-preview";
    SAMPLE_COLORS.slice(0, 4).forEach(function (c) {
      preview.appendChild(makeSwatch(skin.id, c));
    });

    const name = document.createElement("div");
    name.className = "brick-skin-name";
    name.textContent = skin.name;

    const desc = document.createElement("div");
    desc.className = "brick-skin-desc";
    if (opts.locked && price > 0) {
      desc.textContent = "🪙 " + price + " · " + tt("brickSkinBuyShop", "Mua trong Shop");
    } else if (opts.locked) {
      desc.textContent = tt("brickSkinLocked");
    } else {
      desc.textContent = skinDesc(skin);
    }

    card.appendChild(preview);
    card.appendChild(name);
    if (!opts.hideDesc) card.appendChild(desc);
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
        if (typeof openShop === "function") openShop("bricks");
      });
    }
    return card;
  }

  function ensurePanel() {
    let panel = document.getElementById("brick-skin-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "brick-skin-panel";
    panel.className = "brick-skin-overlay";
    panel.innerHTML =
      '<div class="brick-skin-modal" role="dialog" aria-modal="true">' +
      '<button type="button" class="brick-skin-x" id="brick-skin-close" aria-label="Close">✕</button>' +
      '<div class="brick-skin-title" id="brick-skin-title"></div>' +
      '<div class="brick-skin-sub" id="brick-skin-sub"></div>' +
      '<div class="brick-skin-grid" id="brick-skin-grid"></div>' +
      '<button type="button" class="brick-skin-ok" id="brick-skin-ok"></button>' +
      "</div>";
    document.body.appendChild(panel);
    panel.addEventListener("click", function (e) {
      if (e.target === panel && panel.dataset.mode !== "starter") {
        closeBrickSkinPanel();
      }
    });
    document.getElementById("brick-skin-close").addEventListener("click", function () {
      if (panel.dataset.mode === "starter") return;
      closeBrickSkinPanel();
    });
    document.getElementById("brick-skin-ok").addEventListener("click", function () {
      try {
        if (typeof sfxClick === "function") sfxClick();
      } catch (_) {}
      closeBrickSkinPanel();
      if (panel.dataset.mode === "starter" && typeof panel._onStarterDone === "function") {
        const cb = panel._onStarterDone;
        panel._onStarterDone = null;
        cb();
      }
    });
    return panel;
  }

  function fillGrid(mode, highlightId) {
    const grid = document.getElementById("brick-skin-grid");
    const title = document.getElementById("brick-skin-title");
    const sub = document.getElementById("brick-skin-sub");
    const ok = document.getElementById("brick-skin-ok");
    const closeBtn = document.getElementById("brick-skin-close");
    if (!grid) return;

    grid.innerHTML = "";
    if (mode === "starter") {
      title.textContent = tt("brickSkinStarter");
      sub.textContent = "";
      ok.textContent = tt("brickSkinStart");
      ok.style.display = "none";
      closeBtn.style.display = "none";
      STARTER_IDS.forEach(function (id) {
        const skin = getSkin(id);
        grid.appendChild(
          makeSkinCard(skin, {
            active: state.active === id,
            hideDesc: true,
            onPick: function (sid) {
              state.starterPicked = true;
              applyBrickSkin(sid);
              closeBrickSkinPanel();
              const panel = document.getElementById("brick-skin-panel");
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
      title.textContent = tt("brickSkinNew");
      sub.textContent = neu
        ? tt("brickSkinGot", neu.name)
        : tt("brickSkinPick");
      ok.textContent = tt("brickSkinContinue");
      ok.style.display = "block";
      closeBtn.style.display = "block";
    } else {
      title.textContent = tt("brickSkinTitle");
      sub.textContent = tt(
        "brickSkinOwned",
        state.unlocked.length,
        BRICK_SKINS.length
      );
      ok.textContent = tt("brickSkinDone");
      ok.style.display = "block";
      closeBtn.style.display = "block";
    }

    BRICK_SKINS.forEach(function (skin) {
      const locked = !isUnlocked(skin.id);
      grid.appendChild(
        makeSkinCard(skin, {
          locked: locked,
          active: state.active === skin.id,
          hl: highlightId === skin.id,
          onPick: function (sid) {
            applyBrickSkin(sid);
            fillGrid(mode, highlightId);
          },
        })
      );
    });
  }

  function openBrickSkinPanel(mode, highlightId, onStarterDone) {
    const panel = ensurePanel();
    panel.dataset.mode = mode || "browse";
    panel._onStarterDone = onStarterDone || null;
    fillGrid(mode || "browse", highlightId);
    panel.classList.add("show");
  }

  function closeBrickSkinPanel() {
    const panel = document.getElementById("brick-skin-panel");
    if (panel) panel.classList.remove("show");
  }

  /** Lần đầu: bắt buộc chọn classic / plush trước khi vào game */
  function maybeShowStarterBrickPicker(thenFn) {
    if (state.starterPicked) {
      if (typeof thenFn === "function") thenFn();
      return;
    }
    openBrickSkinPanel("starter", null, thenFn);
  }

  /** Gạch chỉ mua bằng vàng trong Shop — không tặng khi phá map ẩn */
  function onHiddenMapClearedForBrick(mapKey) {
    return null;
  }

  function initBrickSkins() {
    loadState();
    applyBrickSkin(state.active);
    ensurePanel();
    document.getElementById("brick-skin-btn")?.addEventListener("click", function () {
      try {
        if (typeof sfxClick === "function") sfxClick();
      } catch (_) {}
      openBrickSkinPanel("browse");
    });
    document.getElementById("set-btn-bricks")?.addEventListener("click", function () {
      try {
        if (typeof sfxClick === "function") sfxClick();
      } catch (_) {}
      try {
        if (typeof closeAllSettingsOverlays === "function") closeAllSettingsOverlays();
      } catch (_) {}
      openBrickSkinPanel("browse");
    });
  }

  /** Ô gạch trên vòng quay — mở skin kế tiếp chưa có (chance=1 khi trúng ô). */
  function tryUnlockRandomBrickFromSpin(chance, quiet) {
    if (Math.random() > (chance == null ? 1 : Number(chance))) return null;
    const id = nextLockedSkinId();
    if (!id) return null;
    if (!unlockBrickSkin(id)) return null;
    if (!quiet) {
      try {
        announceBrickUnlock(id);
      } catch (_) {}
    }
    return id;
  }

  g.BRICK_SKINS = BRICK_SKINS;
  g.applyBrickSkin = applyBrickSkin;
  g.unlockBrickSkin = unlockBrickSkin;
  g.isBrickSkinUnlocked = isUnlocked;
  g.openBrickSkinPanel = openBrickSkinPanel;
  g.closeBrickSkinPanel = closeBrickSkinPanel;
  g.maybeShowStarterBrickPicker = maybeShowStarterBrickPicker;
  g.onHiddenMapClearedForBrick = onHiddenMapClearedForBrick;
  g.tryUnlockRandomBrickFromSpin = tryUnlockRandomBrickFromSpin;
  g.initBrickSkins = initBrickSkins;
  g.getActiveBrickSkin = function () {
    return state.active;
  };
  g.getUnlockedBrickSkins = function () {
    return state.unlocked.slice();
  };

  loadState();
  if (document.documentElement) {
    document.documentElement.setAttribute("data-brick-skin", state.active);
  }
})(typeof window !== "undefined" ? window : globalThis);
