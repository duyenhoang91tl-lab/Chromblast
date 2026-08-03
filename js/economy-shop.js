// ═══════════════════════════════════════════════════════════════
// economy-shop.js — Cửa hàng vàng: nền bàn, mẫu gạch, mua tim, QC vàng
// Nạp SAU inventory.js + map-boards/brick-skins, TRƯỚC ui.js / chat.js
// ═══════════════════════════════════════════════════════════════
(function (g) {
  "use strict";

  function tt(key, fallback) {
    try {
      if (typeof t === "function") {
        const v = t(key);
        if (v != null && v !== key) return v;
      }
    } catch (e) {}
    return fallback != null ? fallback : key;
  }

  /** i18n với placeholder {0},{1}… (không dùng chuỗi fallback làm arg) */
  function ttf(key, fallback) {
    const args = Array.prototype.slice.call(arguments, 2);
    try {
      if (typeof t === "function") {
        const v = t.apply(null, [key].concat(args));
        if (v != null && v !== key) return v;
      }
    } catch (e) {}
    let s = fallback != null ? String(fallback) : String(key);
    args.forEach(function (a, i) {
      s = s.split("{" + i + "}").join(a);
    });
    return s;
  }

  const HEART_GOLD_PRICE = 8;
  const HEART_PACK = 1;
  const BRICK_PREVIEW_COLORS = ["#E24B4A", "#378ADD", "#1D9E75", "#EF9F27"];

  function gold() {
    return typeof getGold === "function" ? getGold() : 0;
  }
  function diamonds() {
    return typeof getDiamonds === "function" ? getDiamonds() : 0;
  }

  function ensureShopPanel() {
    let panel = document.getElementById("shop-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "shop-panel";
    panel.className = "admin-panel-like shop-panel";
    panel.innerHTML =
      '<div class="admin-card shop-card">' +
      '<div class="admin-title"><span data-i18n="shopTitle">🛒 Cửa hàng</span>' +
      '<button type="button" class="admin-close" id="shop-close-btn">✕</button></div>' +
      '<div class="shop-gold-row" id="shop-gold-row">🪙 0 · 💎 0</div>' +
      '<div class="shop-tabs">' +
      '<button type="button" class="shop-tab active" data-shop-tab="boards">🗺️ Nền</button>' +
      '<button type="button" class="shop-tab" data-shop-tab="bricks">🧱 Gạch</button>' +
      '<button type="button" class="shop-tab" data-shop-tab="hearts">❤️ Tim</button>' +
      '<button type="button" class="shop-tab" data-shop-tab="diamond">💎 KC</button>' +
      "</div>" +
      '<div id="shop-body" class="shop-body"></div>' +
      "</div>";
    document.body.appendChild(panel);
    panel.addEventListener("click", function (e) {
      if (e.target === panel) closeShop();
    });
    document.getElementById("shop-close-btn").addEventListener("click", closeShop);
    panel.querySelectorAll(".shop-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        try {
          sfxClick();
        } catch (e) {}
        panel.querySelectorAll(".shop-tab").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        renderShop(btn.getAttribute("data-shop-tab"));
      });
    });
    return panel;
  }

  function makeBoardPreviewEl(skinId) {
    const wrap = document.createElement("div");
    wrap.className = "shop-item-preview shop-board-preview";
    const sw = document.createElement("div");
    sw.className = "board-swatch";
    sw.setAttribute("data-board-skin", skinId || "classic");
    wrap.appendChild(sw);
    return wrap;
  }

  function makeBrickPreviewEl(skinId) {
    const wrap = document.createElement("div");
    wrap.className = "shop-item-preview shop-brick-preview brick-skin-preview";
    BRICK_PREVIEW_COLORS.forEach(function (c) {
      const d = document.createElement("div");
      d.className = "brick-swatch";
      d.setAttribute("data-brick-skin", skinId || "classic");
      d.style.setProperty("--cc", c);
      wrap.appendChild(d);
    });
    return wrap;
  }

  function makeQtyRow(idPrefix, initial) {
    const row = document.createElement("div");
    row.className = "shop-qty-row";
    row.innerHTML =
      '<button type="button" class="shop-qty-btn" data-qty-delta="-1" aria-label="-">−</button>' +
      '<input type="number" class="shop-qty-input" id="' +
      idPrefix +
      '-qty" min="1" max="99" value="' +
      (initial || 1) +
      '" inputmode="numeric">' +
      '<button type="button" class="shop-qty-btn" data-qty-delta="1" aria-label="+">+</button>';
    const input = row.querySelector("input");
    function clamp() {
      let n = Math.floor(Number(input.value) || 1);
      if (n < 1) n = 1;
      if (n > 99) n = 99;
      input.value = String(n);
      return n;
    }
    row.querySelectorAll("[data-qty-delta]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        try {
          sfxClick();
        } catch (e) {}
        const d = Number(btn.getAttribute("data-qty-delta")) || 0;
        input.value = String(clamp() + d);
        clamp();
        row.dispatchEvent(new CustomEvent("shop-qty-change", { bubbles: true }));
      });
    });
    input.addEventListener("change", function () {
      clamp();
      row.dispatchEvent(new CustomEvent("shop-qty-change", { bubbles: true }));
    });
    row.getQty = clamp;
    return row;
  }

  function renderDiamondExchange() {
    const body = document.getElementById("shop-body");
    if (!body) return;
    const rate = typeof GOLD_PER_DIAMOND === "number" ? GOLD_PER_DIAMOND : 100;
    const box = document.createElement("div");
    box.className = "shop-exchange-box";
    box.innerHTML =
      '<div class="shop-exchange-grid">' +
      '<div class="shop-exchange-card" id="shop-ex-to-dia">' +
      '<div class="shop-ex-top"><span class="shop-ex-ico">💎</span><span class="shop-ex-amt" data-ex-gain>×1</span></div>' +
      '<div class="shop-ex-arrow">↓</div>' +
      '<div class="shop-ex-bot"><span class="shop-ex-ico">🪙</span><span class="shop-ex-amt" data-ex-cost>' +
      rate +
      " " +
      tt("shopGoldUnit", "vàng") +
      "</span></div>" +
      '<div class="shop-ex-label">' +
      tt("shopExGoldToDia", "Đổi vàng → KC") +
      "</div>" +
      '<div class="shop-ex-qty-host" data-qty-host="to-dia"></div>' +
      '<button type="button" class="auth-submit-btn shop-ex-go" id="shop-ex-to-dia-btn">' +
      tt("shopExchange", "Đổi") +
      "</button>" +
      "</div>" +
      '<div class="shop-exchange-card" id="shop-ex-to-gold">' +
      '<div class="shop-ex-top"><span class="shop-ex-ico">🪙</span><span class="shop-ex-amt" data-ex-gain>' +
      rate +
      " " +
      tt("shopGoldUnit", "vàng") +
      "</span></div>" +
      '<div class="shop-ex-arrow">↓</div>' +
      '<div class="shop-ex-bot"><span class="shop-ex-ico">💎</span><span class="shop-ex-amt" data-ex-cost>×1</span></div>' +
      '<div class="shop-ex-label">' +
      tt("shopExDiaToGold", "Đổi KC → vàng") +
      "</div>" +
      '<div class="shop-ex-qty-host" data-qty-host="to-gold"></div>' +
      '<button type="button" class="auth-submit-btn shop-ex-go" id="shop-ex-to-gold-btn">' +
      tt("shopExchange", "Đổi") +
      "</button>" +
      "</div>" +
      "</div>";
    body.appendChild(box);

    const qtyToDia = makeQtyRow("shop-ex-to-dia", 1);
    const qtyToGold = makeQtyRow("shop-ex-to-gold", 1);
    box.querySelector('[data-qty-host="to-dia"]').appendChild(qtyToDia);
    box.querySelector('[data-qty-host="to-gold"]').appendChild(qtyToGold);

    function syncLabels() {
      const n1 = qtyToDia.getQty();
      const n2 = qtyToGold.getQty();
      const card1 = box.querySelector("#shop-ex-to-dia");
      const card2 = box.querySelector("#shop-ex-to-gold");
      if (card1) {
        card1.querySelector("[data-ex-gain]").textContent = "×" + n1;
        card1.querySelector("[data-ex-cost]").textContent =
          n1 * rate + " " + tt("shopGoldUnit", "vàng");
      }
      if (card2) {
        card2.querySelector("[data-ex-gain]").textContent =
          n2 * rate + " " + tt("shopGoldUnit", "vàng");
        card2.querySelector("[data-ex-cost]").textContent = "×" + n2;
      }
    }
    box.addEventListener("shop-qty-change", syncLabels);
    syncLabels();

    document.getElementById("shop-ex-to-dia-btn")?.addEventListener("click", function () {
      try {
        sfxClick();
      } catch (e) {}
      const n = qtyToDia.getQty();
      const r =
        typeof exchangeGoldForDiamonds === "function"
          ? exchangeGoldForDiamonds(n)
          : { ok: false };
      if (!r.ok) {
        try {
          showComboFlash(0, false, tt("shopNotEnoughGold", "Không đủ vàng"));
        } catch (e) {}
      }
      renderShop("diamond");
    });
    document.getElementById("shop-ex-to-gold-btn")?.addEventListener("click", function () {
      try {
        sfxClick();
      } catch (e) {}
      const n = qtyToGold.getQty();
      const fn =
        typeof exchangeDiamondsForGold === "function"
          ? exchangeDiamondsForGold
          : typeof Inventory !== "undefined" && Inventory.exchangeDiamondsForGold
            ? Inventory.exchangeDiamondsForGold
            : null;
      const r = fn ? fn(n) : { ok: false };
      if (!r.ok) {
        try {
          showComboFlash(0, false, tt("shopNotEnoughDiamond", "Không đủ kim cương"));
        } catch (e) {}
      }
      renderShop("diamond");
    });
  }

  function renderShop(tab) {
    tab = tab || "boards";
    const body = document.getElementById("shop-body");
    const goldRow = document.getElementById("shop-gold-row");
    if (goldRow) goldRow.textContent = "🪙 " + gold() + " · 💎 " + diamonds();
    if (!body) return;
    body.innerHTML = "";

    if (tab === "diamond") {
      renderDiamondExchange();
      return;
    }

    if (tab === "hearts") {
      const box = document.createElement("div");
      box.className = "shop-hearts-box";
      const adMax = 5;
      const left = typeof adHeartViewsLeft === "function" ? adHeartViewsLeft() : adMax;
      const gLeft = typeof adGoldViewsLeft === "function" ? adGoldViewsLeft() : adMax;
      const nextG = typeof nextAdGoldReward === "function" ? nextAdGoldReward() : 1;
      let heartStatus = "";
      try {
        if (typeof Inventory !== "undefined") {
          if (typeof Inventory.applyHeartRegen === "function") Inventory.applyHeartRegen();
          const h =
            typeof Inventory.formatHearts === "function"
              ? Inventory.formatHearts(Inventory.hearts)
              : String(Inventory.hearts);
          const maxH = Inventory.MAX_HEARTS || 5;
          heartStatus = "❤️ " + h + " / " + maxH;
        }
      } catch (e) {}
      const goldAdTitle =
        gLeft < 1
          ? tt("shopAdGoldCap", "Hết lượt xem ad vàng hôm nay")
          : ttf("shopAdGold", "📺 Xem ad để +{0} vàng", nextG || 1);
      const goldAdLeft =
        gLeft < 1
          ? ttf("shopAdLeftZero", "còn 0/{0} · reset mỗi ngày", adMax)
          : ttf("shopAdLeft", "còn {0}/{1} · reset mỗi ngày", gLeft, adMax);
      const heartAdTitle =
        left < 1
          ? tt("shopAdHeartCap", "Hết lượt xem ad tim hôm nay")
          : tt("shopAdHeart", "📺 Xem ad để +1 tim");
      const heartAdLeft =
        left < 1
          ? ttf("shopAdLeftZero", "còn 0/{0} · reset mỗi ngày", adMax)
          : ttf("shopAdLeft", "còn {0}/{1} · reset mỗi ngày", left, adMax);
      box.innerHTML =
        (heartStatus ? '<p class="shop-heart-status">' + heartStatus + "</p>" : "") +
        '<button type="button" class="auth-submit-btn shop-buy-heart" id="shop-buy-heart">' +
        "❤️ +" +
        HEART_PACK +
        " · 🪙 " +
        HEART_GOLD_PRICE +
        "</button>" +
        '<button type="button" class="auth-submit-btn shop-ad-btn shop-ad-gold" id="shop-ad-gold" ' +
        (gLeft < 1 ? "disabled" : "") +
        ">" +
        '<span class="shop-ad-title">' +
        goldAdTitle +
        "</span>" +
        '<span class="shop-ad-left">' +
        goldAdLeft +
        "</span>" +
        "</button>" +
        '<button type="button" class="auth-submit-btn shop-ad-btn shop-ad-heart" id="shop-ad-heart" ' +
        (left < 1 ? "disabled" : "") +
        ">" +
        '<span class="shop-ad-title">' +
        heartAdTitle +
        "</span>" +
        '<span class="shop-ad-left">' +
        heartAdLeft +
        "</span>" +
        "</button>";
      body.appendChild(box);
      document.getElementById("shop-buy-heart")?.addEventListener("click", function () {
        try {
          sfxClick();
        } catch (e) {}
        if (typeof buyHeartWithGold !== "function") return;
        const r = buyHeartWithGold(HEART_PACK, HEART_GOLD_PRICE);
        if (!r || !r.ok) {
          try {
            showComboFlash(0, false, r && r.reason === 'max'
              ? tt("shopHeartFull", "Đầy")
              : tt("shopNotEnoughGold", "Không đủ vàng"));
          } catch (e) {}
        }
        renderShop("hearts");
      });
      document.getElementById("shop-ad-gold")?.addEventListener("click", function () {
        try {
          sfxClick();
        } catch (e) {}
        if (typeof watchAdForGold === "function")
          watchAdForGold(function () {
            renderShop("hearts");
          });
      });
      document.getElementById("shop-ad-heart")?.addEventListener("click", function () {
        try {
          sfxClick();
        } catch (e) {}
        if (typeof watchAdForHeart === "function") watchAdForHeart();
        setTimeout(function () {
          renderShop("hearts");
        }, 800);
      });
      return;
    }

    const isBoard = tab === "boards";
    const list = isBoard
      ? typeof BOARD_SKINS !== "undefined"
        ? BOARD_SKINS
        : []
      : typeof BRICK_SKINS !== "undefined"
        ? BRICK_SKINS
        : [];
    const unlockedFn = isBoard
      ? typeof isBoardSkinUnlocked === "function"
        ? isBoardSkinUnlocked
        : function () {
            return true;
          }
      : typeof isBrickSkinUnlocked === "function"
        ? isBrickSkinUnlocked
        : function () {
            return true;
          };

    const grid = document.createElement("div");
    grid.className = "shop-grid";
    list.forEach(function (skin) {
      if (!skin || skin.starter) return;
      const owned = unlockedFn(skin.id);
      const price = skin.price | 0 || 20;
      const diaCost =
        typeof diamondPriceForGold === "function"
          ? diamondPriceForGold(price)
          : price >= 100
            ? Math.ceil(price / 100)
            : 0;
      const card = document.createElement("div");
      card.className = "shop-item" + (owned ? " owned" : "");

      card.appendChild(isBoard ? makeBoardPreviewEl(skin.id) : makeBrickPreviewEl(skin.id));

      const nameEl = document.createElement("div");
      nameEl.className = "shop-item-name";
      nameEl.textContent = skin.name || skin.id;
      card.appendChild(nameEl);

      const priceEl = document.createElement("div");
      priceEl.className = "shop-item-price";
      priceEl.textContent = owned
        ? tt("shopOwned", "Đã sở hữu")
        : "🪙 " + price + (diaCost ? " / 💎 " + diaCost : "");
      card.appendChild(priceEl);

      if (!owned) {
        const row = document.createElement("div");
        row.className = "shop-item-actions";
        const bGold = document.createElement("button");
        bGold.type = "button";
        bGold.className = "shop-buy-btn";
        bGold.textContent = tt("shopBuy", "Mua");
        bGold.title = tt("shopBuyGold", "Mua bằng vàng");
        bGold.addEventListener("click", function () {
          try {
            sfxClick();
          } catch (e) {}
          const r = isBoard
            ? buyBoardWithGold(skin.id, price)
            : buyBrickWithGold(skin.id, price);
          flashBuy(r, skin, price, false);
          renderShop(tab);
        });
        row.appendChild(bGold);
        if (diaCost > 0) {
          const bDia = document.createElement("button");
          bDia.type = "button";
          bDia.className = "shop-buy-btn shop-buy-dia";
          bDia.textContent = tt("shopBuyDia", "KC");
          bDia.title = tt("shopBuyWithDia", "Mua bằng kim cương");
          bDia.addEventListener("click", function () {
            try {
              sfxClick();
            } catch (e) {}
            const r = isBoard
              ? buyBoardWithDiamond(skin.id, diaCost)
              : buyBrickWithDiamond(skin.id, diaCost);
            flashBuy(r, skin, diaCost, true);
            renderShop(tab);
          });
          row.appendChild(bDia);
        }
        card.appendChild(row);
      }
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  function flashBuy(r, skin, cost, isDia) {
    if (!r || !r.ok) {
      try {
        showComboFlash(
          0,
          false,
          r && r.reason === "owned"
            ? tt("shopOwned", "Đã sở hữu")
            : isDia
              ? tt("shopNotEnoughDiamond", "Không đủ kim cương")
              : tt("shopNotEnoughGold", "Không đủ vàng")
        );
      } catch (e) {}
      return;
    }
    try {
      showComboFlash(0, false, (isDia ? "💎 −" : "🪙 −") + cost + " · " + (skin.name || skin.id));
    } catch (e) {}
    try {
      if (typeof sfxUnlock === "function") sfxUnlock();
    } catch (e) {}
  }

  function buyBoardWithGold(id, price) {
    if (typeof isBoardSkinUnlocked === "function" && isBoardSkinUnlocked(id))
      return { ok: false, reason: "owned" };
    if (typeof spendGold !== "function" || !spendGold(price))
      return { ok: false, reason: "gold" };
    if (typeof unlockBoardSkin === "function") unlockBoardSkin(id);
    return { ok: true };
  }

  function buyBrickWithGold(id, price) {
    if (typeof isBrickSkinUnlocked === "function" && isBrickSkinUnlocked(id))
      return { ok: false, reason: "owned" };
    if (typeof spendGold !== "function" || !spendGold(price))
      return { ok: false, reason: "gold" };
    if (typeof unlockBrickSkin === "function") unlockBrickSkin(id);
    return { ok: true };
  }

  function buyBoardWithDiamond(id, diaCost) {
    if (typeof isBoardSkinUnlocked === "function" && isBoardSkinUnlocked(id))
      return { ok: false, reason: "owned" };
    if (typeof spendDiamonds !== "function" || !spendDiamonds(diaCost))
      return { ok: false, reason: "diamond" };
    if (typeof unlockBoardSkin === "function") unlockBoardSkin(id);
    return { ok: true };
  }

  function buyBrickWithDiamond(id, diaCost) {
    if (typeof isBrickSkinUnlocked === "function" && isBrickSkinUnlocked(id))
      return { ok: false, reason: "owned" };
    if (typeof spendDiamonds !== "function" || !spendDiamonds(diaCost))
      return { ok: false, reason: "diamond" };
    if (typeof unlockBrickSkin === "function") unlockBrickSkin(id);
    return { ok: true };
  }

  function openShop(tab) {
    ensureShopPanel();
    const panel = document.getElementById("shop-panel");
    panel.querySelectorAll(".shop-tab").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-shop-tab") === (tab || "boards"));
    });
    renderShop(tab || "boards");
    panel.classList.add("show");
    try {
      if (typeof applyI18nDom === "function") applyI18nDom();
    } catch (e) {}
  }

  function closeShop() {
    const panel = document.getElementById("shop-panel");
    if (panel) panel.classList.remove("show");
  }

  function initShopUI() {
    const hdr = document.getElementById("shop-btn");
    if (hdr) {
      hdr.addEventListener("click", function () {
        try {
          sfxClick();
        } catch (e) {}
        openShop("boards");
      });
    }
    const setBtn = document.getElementById("set-btn-shop");
    if (setBtn) {
      setBtn.addEventListener("click", function () {
        try {
          sfxClick();
        } catch (e) {}
        try {
          if (typeof closeSettingsHub === "function") closeSettingsHub();
        } catch (e) {}
        openShop("boards");
      });
    }
  }

  g.openShop = openShop;
  g.closeShop = closeShop;
  g.buyBoardWithGold = buyBoardWithGold;
  g.buyBrickWithGold = buyBrickWithGold;
  g.exchangeDiamondsForGold = function (n) {
    if (typeof exchangeDiamondsForGold === "function") return exchangeDiamondsForGold(n);
    return { ok: false };
  };
  g.HEART_GOLD_PRICE = HEART_GOLD_PRICE;

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initShopUI);
  else initShopUI();
})(typeof window !== "undefined" ? window : this);
