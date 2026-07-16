/* ═══════════════════════════════════════════════════════════════
   brick-skins.js — 30 kiểu gạch + chọn lúc mở đầu + mở khóa khi thắng map ẩn
   Nạp SAU save.js, TRƯỚC ui.js / main.js
═══════════════════════════════════════════════════════════════ */
(function (g) {
  "use strict";

  const KEY = "chromablast_brick_skins";

  /** classic + plush mở sẵn; chroma mở sau map ẩn 7; còn lại mở dần khi phá map ẩn */
  const BRICK_SKINS = [
    { id: "classic", name: "Classic", desc: "Gạch bevel cổ điển", starter: true },
    { id: "plush", name: "Plush", desc: "Bông xù hiện tại", starter: true },
    { id: "chroma", name: "Chroma", desc: "Kẹo bóng + icon — thắng map ẩn 7", unlockMap: "memory" },
    { id: "glass", name: "Glass", desc: "Thủy tinh trong" },
    { id: "neon", name: "Neon", desc: "Viền phát sáng" },
    { id: "metal", name: "Metal", desc: "Kim loại xước" },
    { id: "wood", name: "Wood", desc: "Gỗ vân ấm" },
    { id: "crystal", name: "Crystal", desc: "Pha lê đa giác" },
    { id: "ice", name: "Ice", desc: "Băng giá" },
    { id: "lava", name: "Lava", desc: "Nham thạch" },
    { id: "gold", name: "Gold", desc: "Vàng bóng" },
    { id: "silver", name: "Silver", desc: "Bạc lạnh" },
    { id: "marble", name: "Marble", desc: "Cẩm thạch" },
    { id: "pixel", name: "Pixel", desc: "Pixel 8-bit" },
    { id: "watercolor", name: "Watercolor", desc: "Màu nước" },
    { id: "holo", name: "Holo", desc: "Hologram" },
    { id: "matte", name: "Matte", desc: "Nhám mờ" },
    { id: "glossy", name: "Glossy", desc: "Bóng gương" },
    { id: "chalk", name: "Chalk", desc: "Phấn bảng" },
    { id: "leather", name: "Leather", desc: "Da thật" },
    { id: "felt", name: "Felt", desc: "Nỉ mềm" },
    { id: "ceramic", name: "Ceramic", desc: "Sứ men" },
    { id: "rubber", name: "Rubber", desc: "Cao su" },
    { id: "jelly", name: "Jelly", desc: "Thạch mềm" },
    { id: "pastel", name: "Pastel", desc: "Pastel dịu" },
    { id: "retro", name: "Retro", desc: "Retro phẳng" },
    { id: "galaxy", name: "Galaxy", desc: "Thiên hà" },
    { id: "bubble", name: "Bubble", desc: "Bong bóng" },
    { id: "stone", name: "Stone", desc: "Đá thô" },
    { id: "paper", name: "Paper", desc: "Giấy gấp" },
    { id: "chrome", name: "Chrome", desc: "Chrome gương" },
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

  /** Mở/thu hồi skin gắn map (chroma sau map ẩn 7). Trả id vừa mở khóa hoặc null. */
  function syncMapGatedBrickSkins() {
    let justUnlocked = null;
    BRICK_SKINS.forEach(function (skin) {
      if (!skin.unlockMap) return;
      if (isHiddenMapCleared(skin.unlockMap)) {
        if (unlockBrickSkin(skin.id)) justUnlocked = skin.id;
      } else if (isUnlocked(skin.id)) {
        state.unlocked = state.unlocked.filter(function (id) {
          return id !== skin.id;
        });
        if (state.active === skin.id) {
          state.active = "plush";
          document.documentElement.setAttribute("data-brick-skin", "plush");
          const root = document.getElementById("game-root");
          if (root) root.setAttribute("data-brick-skin", "plush");
        }
        saveState();
      }
    });
    return justUnlocked;
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
          showComboFlash(0, false, "🧱 Mở khóa gạch: " + (s ? s.name : id));
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
    card.className =
      "brick-skin-card" +
      (opts.locked ? " locked" : "") +
      (opts.active ? " active" : "") +
      (opts.hl ? " highlight" : "");
    card.dataset.id = skin.id;
    if (opts.locked) card.disabled = true;

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
    if (opts.locked) {
      desc.textContent = skin.unlockMap
        ? "🔒 Thắng map ẩn 7"
        : "🔒 Chưa mở khóa";
    } else {
      desc.textContent = skin.desc;
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
      '<div class="brick-skin-title" id="brick-skin-title">Chọn gạch</div>' +
      '<div class="brick-skin-sub" id="brick-skin-sub"></div>' +
      '<div class="brick-skin-grid" id="brick-skin-grid"></div>' +
      '<button type="button" class="brick-skin-ok" id="brick-skin-ok">Xong</button>' +
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
      title.textContent = "Chọn gạch khởi đầu";
      sub.textContent = "";
      ok.textContent = "Bắt đầu chơi";
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
      title.textContent = "🎉 Gạch mới mở khóa!";
      sub.textContent = neu
        ? "Bạn nhận được: " + neu.name + " — chọn để dùng ngay hoặc giữ kiểu hiện tại"
        : "Chọn kiểu gạch";
      ok.textContent = "Tiếp tục";
      ok.style.display = "block";
      closeBtn.style.display = "block";
    } else {
      title.textContent = "Kho gạch";
      sub.textContent =
        "Đã mở " +
        state.unlocked.length +
        "/" +
        BRICK_SKINS.length +
        " — chọn kiểu đang dùng";
      ok.textContent = "Xong";
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

  /** Thắng map ẩn mới → mở khóa gạch mới (1–2 kiểu nếu còn nhiều hơn số map còn lại) */
  function onHiddenMapClearedForBrick(mapKey) {
    const gated = syncMapGatedBrickSkins();

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
    const remainingSkins = UNLOCK_ORDER.filter(function (id) {
      return !isUnlocked(id);
    }).length;
    let n = 1;
    if (remainingSkins > mapsLeft + 1) n = 2;

    let last = null;
    for (let i = 0; i < n; i++) {
      const next = nextLockedSkinId();
      if (!next) break;
      unlockBrickSkin(next);
      last = next;
    }

    // Ưu tiên thông báo skin gắn map (chroma sau map 7) nếu vừa mở
    const highlight = gated || last;
    if (!highlight) return null;
    announceBrickUnlock(highlight);
    return highlight;
  }

  function initBrickSkins() {
    loadState();
    syncMapGatedBrickSkins();
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

  /** Lucky Spin: 2% mở khóa 1 gạch chưa có (random). quiet=true → chỉ unlock, không mở panel. */
  function tryUnlockRandomBrickFromSpin(chance, quiet) {
    if (typeof chance !== "number") chance = 0.02;
    if (Math.random() >= chance) return null;
    const locked = UNLOCK_ORDER.filter(function (id) {
      return !isUnlocked(id);
    });
    const pool =
      locked.length > 0
        ? locked
        : BRICK_SKINS.map(function (s) {
            return s.id;
          }).filter(function (id) {
            return !isUnlocked(id);
          });
    if (!pool.length) return null;
    const id = pool[Math.floor(Math.random() * pool.length)];
    if (!unlockBrickSkin(id)) return null;
    if (quiet) return id;
    setTimeout(function () {
      openBrickSkinPanel("unlock", id);
      try {
        if (typeof sfxUnlock === "function") sfxUnlock();
      } catch (_) {}
      try {
        if (typeof showComboFlash === "function") {
          const s = getSkin(id);
          showComboFlash(
            0,
            false,
            "🧱 Spin hiếm! Mở khóa gạch: " + (s ? s.name : id)
          );
        }
      } catch (_) {}
    }, 700);
    return id;
  }

  g.BRICK_SKINS = BRICK_SKINS;
  g.applyBrickSkin = applyBrickSkin;
  g.unlockBrickSkin = unlockBrickSkin;
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
