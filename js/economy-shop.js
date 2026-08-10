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

  const HEART_GOLD_PRICE = 24;
  const HEART_PACK = 1;
  const BRICK_PREVIEW_COLORS = ["#E24B4A", "#378ADD", "#1D9E75", "#EF9F27"];
  let shopCurrencyFilter = "all"; // "all" | "gold" | "diamond" — loc mua theo vang/kim cuong o tab Nen/Gach

  function gold() {
    return typeof getGold === "function" ? getGold() : 0;
  }
  function diamonds() {
    return typeof getDiamonds === "function" ? getDiamonds() : 0;
  }
  function hearts() {
    try {
      if (typeof Inventory !== "undefined") {
        if (typeof Inventory.applyHeartRegen === "function") Inventory.applyHeartRegen();
        return Inventory.hearts || 0;
      }
    } catch (e) {}
    return 0;
  }

  // Danh sách ô của màn hình gốc Cửa hàng (shop2-grid). 6 mục đầu dùng đúng
  // dữ liệu/logic mua đã có (renderShop(tab) không đổi gì). 5 mục "locked" chưa
  // có vật phẩm/giá nào trong code — không tự đặt ra, chỉ hiện ô khoá "Sắp ra
  // mắt" chờ có dữ liệu thật.
  const SHOP2_TILES = [
    { tab: "topup", ico: "💳", key: "shopTabTopup", fb: "Nạp" },
    { tab: "boards", ico: "🖼️", key: "shopTabBoards", fb: "Nền" },
    { tab: "bricks", ico: "🧱", key: "shopTabBricks", fb: "Gạch" },
    { tab: "bubbles", ico: "💬", key: "shopTabBubbles", fb: "Bong bóng" },
    { tab: "hearts", ico: "❤️", key: "shopTabHearts", fb: "Tim" },
    { tab: "diamond", ico: "💎", key: "shopTabDiamond", fb: "Kim cương" },
    { tab: "nameeffects", ico: "✨", key: "shopTabNameeffects", fb: "Hiệu ứng tên" },
    { tab: "chests", ico: '<svg viewBox="0 0 48 48" width="60" height="60" aria-hidden="true"><path d="M6 21 Q6 8 24 8 Q42 8 42 21 L42 25 L6 25 Z" fill="#8a5a30"/><path d="M6 21 Q6 8 24 8 Q42 8 42 21" fill="none" stroke="#ffd54a" stroke-width="2"/><rect x="6" y="25" width="36" height="17" rx="3" fill="#a5713e"/><rect x="6" y="25" width="36" height="17" rx="3" fill="none" stroke="#6b4423" stroke-width="1"/><line x1="6" y1="33.5" x2="42" y2="33.5" stroke="#6b4423" stroke-width="1.4"/><rect x="9" y="8" width="4.5" height="34" fill="#ffd54a" opacity="0.9"/><rect x="34.5" y="8" width="4.5" height="34" fill="#ffd54a" opacity="0.9"/><rect x="19.5" y="26" width="9" height="10" rx="2" fill="#ffd54a"/><circle cx="24" cy="30.5" r="1.7" fill="#4a2f14"/></svg>', key: "shopTabChests", fb: "Rương" },
    { tab: "skills", ico: "🌀", key: "shopTabSkills", fb: "Kỹ năng", locked: true },
    { tab: "textfx", ico: "💫", key: "shopTabTextfx", fb: "Hiệu ứng chữ" },
    { tab: "vscards", ico: "⚔️", key: "shopTabVsCards", fb: "Thẻ đấu" },
  ];

  function refreshShopBalance() {
    const h = document.getElementById("shop2-bal-heart");
    const d = document.getElementById("shop2-bal-dia");
    const gEl = document.getElementById("shop2-bal-gold");
    if (h) h.textContent = String(hearts());
    if (d) d.textContent = String(diamonds());
    if (gEl) gEl.textContent = String(gold());
  }

  function renderShop2Grid() {
    const grid = document.getElementById("shop2-grid");
    if (!grid) return;
    grid.innerHTML = "";
    SHOP2_TILES.forEach(function (item) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "shop2-tile" + (item.locked ? " locked" : "");
      tile.innerHTML =
        (item.locked ? '<span class="shop2-tile-lock">🔒</span>' : "") +
        '<span class="shop2-tile-ico">' + item.ico + "</span>" +
        '<span class="shop2-tile-label">' + tt(item.key, item.fb) + "</span>" +
        (item.locked ? '<span class="shop2-tile-soon">' + tt("shopComingSoon", "Sắp ra mắt") + "</span>" : "");
      tile.addEventListener("click", function () {
        try {
          sfxClick();
        } catch (e) {}
        if (item.locked) {
          try {
            showComboFlash(0, false, tt("shopComingSoon", "Sắp ra mắt"));
          } catch (e) {}
          return;
        }
        openShop2Sub(item.tab, tt(item.key, item.fb));
      });
      grid.appendChild(tile);
    });
  }

  function openShop2Sub(tab, title) {
    const panel = document.getElementById("shop-panel");
    if (!panel) return;
    const titleEl = document.getElementById("shop2-sub-title");
    if (titleEl) titleEl.textContent = title || "";
    panel.classList.add("shop2-sub-open");
    renderShop(tab);
  }

  function ensureShopPanel() {
    let panel = document.getElementById("shop-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "shop-panel";
    panel.className = "admin-panel-like shop-panel shop2";
    panel.innerHTML =
      '<div class="shop2-hub" id="shop2-hub">' +
      '<div class="shop2-hub-top">' +
      '<div class="shop2-hub-title"><span data-i18n="shopTitle">🛒 Cửa hàng</span></div>' +
      '<button type="button" class="shop2-close" id="shop-close-btn">✕</button>' +
      "</div>" +
      '<div class="shop2-balance-row">' +
      '<span class="shop2-bal-chip">❤️ <b id="shop2-bal-heart">0</b></span>' +
      '<span class="shop2-bal-chip">💎 <b id="shop2-bal-dia">0</b></span>' +
      '<span class="shop2-bal-chip">🪙 <b id="shop2-bal-gold">0</b></span>' +
      "</div>" +
      '<div class="shop2-grid" id="shop2-grid"></div>' +
      "</div>" +
      '<div class="shop2-sub" id="shop2-sub">' +
      '<div class="shop2-sub-top">' +
      '<button type="button" class="shop2-back" id="shop2-back-btn">‹</button>' +
      '<div class="shop2-sub-title" id="shop2-sub-title"></div>' +
      "</div>" +
      '<div id="shop-body" class="shop-body"></div>' +
      "</div>";
    document.body.appendChild(panel);
    panel.addEventListener("click", function (e) {
      if (e.target === panel) closeShop();
    });
    document.getElementById("shop-close-btn").addEventListener("click", closeShop);
    document.getElementById("shop2-back-btn").addEventListener("click", function () {
      try {
        sfxClick();
      } catch (e) {}
      panel.classList.remove("shop2-sub-open");
      refreshShopBalance();
    });
    renderShop2Grid();
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

  // renderDiamondExchange (đổi kim cương → vàng) đã BỎ có chủ đích: kim cương mua
  // bằng tiền thật (IAP) không còn được quy đổi ngược thành vàng, vì vàng dùng để
  // đặt cược 1-1 với người chơi khác (js/caro.js escrowMyWager) — chặn đường tiền
  // thật → vàng → cược ăn thua giữa 2 tài khoản. Chiều vàng → kim cương vẫn giữ
  // nguyên (exchangeGoldForDiamonds, js/inventory.js), chỉ không có màn hình riêng
  // vì hiện chưa nơi nào trong UI gọi tới.
  function renderDiamondInfo() {
    const body = document.getElementById("shop-body");
    if (!body) return;
    const box = document.createElement("div");
    box.className = "shop-exchange-box shop-exchange-box-single";
    box.innerHTML =
      '<div class="shop-diamond-info">' +
      '<div class="shop-ex-top" style="justify-content:center;"><span class="shop-ex-ico">💎</span></div>' +
      '<div class="admin-sub" style="text-align:center;margin-top:8px;">' +
      tt("shopDiamondUseInfo", "Kim cương dùng để mua nền, gạch, hiệu ứng và vật phẩm trong Cửa hàng — xem các tab Nền / Gạch / Bong bóng...") +
      "</div>" +
      "</div>";
    body.appendChild(box);
  }

  function renderTopUp() {
    const body = document.getElementById("shop-body");
    if (!body) return;
    const box = document.createElement("div");
    box.className = "shop-topup-box";

    if (typeof getShopOfferings !== "function") {
      box.innerHTML =
        '<div class="shop-topup-empty">' +
        tt("shopIapUnavailable", "Nạp thêm chỉ khả dụng trên app Android.") +
        "</div>";
      body.appendChild(box);
      return;
    }

    box.innerHTML = '<div class="shop-topup-loading">' + tt("shopLoading", "Đang tải...") + "</div>";
    body.appendChild(box);

    getShopOfferings().then(function (pkgs) {
      box.innerHTML = "";
      if (!pkgs || !pkgs.length) {
        box.innerHTML =
          '<div class="shop-topup-empty">' +
          tt("shopIapEmpty", "Chưa có gói nào — thử lại sau nhé.") +
          "</div>";
        return;
      }
      const byId = {};
      pkgs.forEach(function (p) {
        byId[p.identifier] = p;
      });

      const cards = [];
      const showStarter = typeof shouldShowStarterPack === "function" && shouldShowStarterPack();
      if (showStarter && byId["starter_pack"]) {
        cards.push({
          id: "starter_pack", icon: "🎁", featured: true,
          title: tt("shopStarterPack", "Gói khởi đầu"),
          desc: tt("shopStarterDesc", "200 💎 + Bỏ quảng cáo vĩnh viễn — chỉ 1 lần"),
        });
      }
      [
        { id: "diamonds_small", icon: "💎", title: tt("shopDiaSmall", "60 kim cương") },
        { id: "diamonds_medium", icon: "💎", best: true, title: tt("shopDiaMedium", "330 kim cương") },
        { id: "diamonds_large", icon: "💎", title: tt("shopDiaLarge", "700 kim cương") },
        { id: "remove_ads", icon: "🚫📺", title: tt("shopRemoveAds", "Bỏ quảng cáo vĩnh viễn") },
      ].forEach(function (c) {
        if (byId[c.id]) cards.push(c);
      });

      cards.forEach(function (c) {
        const pkg = byId[c.id];
        const price = (pkg.product && pkg.product.priceString) || "—";
        const card = document.createElement("div");
        card.className = "shop-topup-card" + (c.featured ? " shop-topup-featured" : "");
        card.innerHTML =
          (c.best ? '<div class="shop-topup-badge">' + tt("shopBestValue", "Hời nhất") + "</div>" : "") +
          '<div class="shop-topup-ico">' + c.icon + "</div>" +
          '<div class="shop-topup-title">' + c.title + "</div>" +
          (c.desc ? '<div class="shop-topup-desc">' + c.desc + "</div>" : "") +
          '<button type="button" class="auth-submit-btn shop-topup-buy">' + price + "</button>";
        card.querySelector(".shop-topup-buy").addEventListener("click", function () {
          try { sfxClick(); } catch (e) {}
          if (c.id === "starter_pack" && typeof markStarterPackSeen === "function") markStarterPackSeen();
          purchaseIAP(c.id, function () {
            try { showComboFlash(0, true, tt("shopPurchaseOk", "Cảm ơn bạn đã ủng hộ! 🎉")); } catch (e) {}
            renderShop("topup");
          }).then(function (r) {
            if (!r.ok && r.reason === "error") {
              try { showComboFlash(0, false, tt("shopPurchaseFail", "Giao dịch không thành công")); } catch (e) {}
            }
          });
        });
        box.appendChild(card);
      });

      const restoreBtn = document.createElement("button");
      restoreBtn.type = "button";
      restoreBtn.className = "shop-topup-restore";
      restoreBtn.textContent = tt("shopRestore", "Khôi phục giao dịch đã mua");
      restoreBtn.addEventListener("click", function () {
        try { sfxClick(); } catch (e) {}
        restoreIAP().then(function (r) {
          showComboFlash(0, !!(r && r.ok), r && r.ok
            ? tt("shopRestoreOk", "Đã khôi phục")
            : tt("shopRestoreFail", "Không tìm thấy giao dịch nào"));
        });
      });
      box.appendChild(restoreBtn);
    });
  }

  function renderShop(tab) {
    tab = tab || "boards";
    const body = document.getElementById("shop-body");
    refreshShopBalance();
    if (!body) return;
    body.innerHTML = "";

    if (tab === "diamond") {
      renderDiamondInfo();
      return;
    }

    if (tab === "topup") {
      renderTopUp();
      return;
    }

    if (tab === "chests") {
      if (typeof renderCrateGridInto === "function") renderCrateGridInto(body);
      return;
    }

    if (tab === "vscards") {
      renderVsCardShopTab(body);
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
      document.getElementById("shop-buy-heart")?.addEventListener("click", async function () {
        try {
          sfxClick();
        } catch (e) {}
        if (typeof buyHeartWithGold !== "function") return;
        this.disabled = true;
        const r = await buyHeartWithGold(HEART_PACK, HEART_GOLD_PRICE);
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

    if (tab === "bubbles") {
      renderBubbleShopTab(body);
      return;
    }

    if (tab === "nameeffects") {
      renderNameEffectShopTab(body);
      return;
    }

    if (tab === "textfx") {
      renderTextEffectShopTab(body);
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

    const filterBar = document.createElement("div");
    filterBar.className = "shop-currency-filter";
    [
      { key: "all", label: tt("shopFilterAll", "Tất cả") },
      { key: "gold", label: "🪙 " + tt("shopFilterGold", "Vàng") },
      { key: "diamond", label: "💎 " + tt("shopFilterDia", "Kim cương") },
    ].forEach(function (f) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "shop-currency-btn" + (shopCurrencyFilter === f.key ? " active" : "");
      b.textContent = f.label;
      b.addEventListener("click", function () {
        try { sfxClick(); } catch (e) {}
        shopCurrencyFilter = f.key;
        renderShop(tab);
      });
      filterBar.appendChild(b);
    });
    body.appendChild(filterBar);

    const grid = document.createElement("div");
    grid.className = "shop-grid";
    list.forEach(function (skin) {
      if (!skin || skin.starter) return;
      const owned = unlockedFn(skin.id);
      const goldPrice = skin.price | 0;
      const diaCost = skin.diaPrice
        ? skin.diaPrice | 0
        : typeof diamondPriceForGold === "function"
          ? diamondPriceForGold(goldPrice || 20)
          : (goldPrice || 20) >= 100
            ? Math.ceil((goldPrice || 20) / 100)
            : 0;
      if (!owned) {
        if (shopCurrencyFilter === "gold" && goldPrice <= 0) return;
        if (shopCurrencyFilter === "diamond" && diaCost <= 0) return;
      }
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
        : shopCurrencyFilter === "gold"
          ? "🪙 " + goldPrice
          : shopCurrencyFilter === "diamond"
            ? "💎 " + diaCost
            : goldPrice
              ? "🪙 " + goldPrice + (diaCost ? " / 💎 " + diaCost : "")
              : "💎 " + diaCost;
      card.appendChild(priceEl);

      if (!owned) {
        const row = document.createElement("div");
        row.className = "shop-item-actions";
        if (goldPrice > 0 && shopCurrencyFilter !== "diamond") {
          const bGold = document.createElement("button");
          bGold.type = "button";
          bGold.className = "shop-buy-btn";
          bGold.textContent = tt("shopBuy", "Mua");
          bGold.title = tt("shopBuyGold", "Mua bằng vàng");
          bGold.addEventListener("click", async function () {
            try {
              sfxClick();
            } catch (e) {}
            bGold.disabled = true;
            const r = isBoard
              ? await buyBoardWithGold(skin.id, goldPrice)
              : await buyBrickWithGold(skin.id, goldPrice);
            flashBuy(r, skin, goldPrice, false);
            renderShop(tab);
          });
          row.appendChild(bGold);
        }
        if (diaCost > 0 && shopCurrencyFilter !== "gold") {
          const bDia = document.createElement("button");
          bDia.type = "button";
          bDia.className = "shop-buy-btn shop-buy-dia";
          bDia.textContent = tt("shopBuyDia", "KC");
          bDia.title = tt("shopBuyWithDia", "Mua bằng kim cương");
          bDia.addEventListener("click", async function () {
            try {
              sfxClick();
            } catch (e) {}
            bDia.disabled = true;
            const r = isBoard
              ? await buyBoardWithDiamond(skin.id, diaCost)
              : await buyBrickWithDiamond(skin.id, diaCost);
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

  /** Mọi lần trừ tiền đều qua Cloud Function spendCurrency — server tự kiểm tra
   * số dư thật, không tin client (giống hệt cách js/gpcard-redeem.js đang làm).
   * cost: {gold:n} hoặc {diamonds:n}. */
  async function _shopSpendCurrency(cost) {
    if (typeof _getOnlineFunctions !== "function") return { ok: false, reason: "offline" };
    const fns = _getOnlineFunctions();
    if (!fns) return { ok: false, reason: "offline" };
    try {
      await fns.httpsCallable("spendCurrency")({ cost });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: (e && e.message) || "error" };
    }
  }

  function flashBuy(r, skin, cost, isDia) {
    if (!r || !r.ok) {
      try {
        showComboFlash(
          0,
          false,
          r && r.reason === "owned"
            ? tt("shopOwned", "Đã sở hữu")
            : r && (r.reason === "offline" || r.reason === "error")
              ? tt("errNetwork", "Lỗi kết nối mạng — vui lòng thử lại.")
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

  function makeBubblePreviewEl(id) {
    const wrap = document.createElement("div");
    wrap.className = "shop-item-preview shop-bubble-preview";
    const b = document.createElement("span");
    b.className = "caro-chat-text bubble-" + id;
    b.textContent = tt("shopBubblePreviewText", "Chào bạn! 👋");
    wrap.appendChild(b);
    return wrap;
  }

  function renderBubbleShopTab(body) {
    const list = typeof CHAT_BUBBLE_SKINS !== "undefined" ? CHAT_BUBBLE_SKINS : [];
    const unlockedFn = typeof isBubbleSkinUnlocked === "function" ? isBubbleSkinUnlocked : function () { return true; };

    const filterBar = document.createElement("div");
    filterBar.className = "shop-currency-filter";
    [
      { key: "all", label: tt("shopFilterAll", "Tất cả") },
      { key: "gold", label: "🪙 " + tt("shopFilterGold", "Vàng") },
      { key: "diamond", label: "💎 " + tt("shopFilterDia", "Kim cương") },
    ].forEach(function (f) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "shop-currency-btn" + (shopCurrencyFilter === f.key ? " active" : "");
      b.textContent = f.label;
      b.addEventListener("click", function () {
        try { sfxClick(); } catch (e) {}
        shopCurrencyFilter = f.key;
        renderShop("bubbles");
      });
      filterBar.appendChild(b);
    });
    body.appendChild(filterBar);

    const grid = document.createElement("div");
    grid.className = "shop-grid";
    list.forEach(function (skin) {
      const owned = unlockedFn(skin.id);
      const goldPrice = skin.price | 0;
      const diaCost = skin.diaPrice | 0;
      if (!owned) {
        if (shopCurrencyFilter === "gold" && goldPrice <= 0) return;
        if (shopCurrencyFilter === "diamond" && diaCost <= 0) return;
      }
      const card = document.createElement("div");
      card.className = "shop-item" + (owned ? " owned" : "") + (goldPrice <= 0 && diaCost > 0 ? " shop-item-premium" : "");
      card.appendChild(makeBubblePreviewEl(skin.id));

      const nameEl = document.createElement("div");
      nameEl.className = "shop-item-name";
      nameEl.textContent = skin.name || skin.id;
      card.appendChild(nameEl);

      const priceEl = document.createElement("div");
      priceEl.className = "shop-item-price";
      priceEl.textContent = owned
        ? tt("shopOwned", "Đã sở hữu")
        : goldPrice
          ? "🪙 " + goldPrice
          : "💎 " + diaCost;
      card.appendChild(priceEl);

      if (!owned) {
        const row = document.createElement("div");
        row.className = "shop-item-actions";
        if (goldPrice > 0) {
          const bGold = document.createElement("button");
          bGold.type = "button";
          bGold.className = "shop-buy-btn";
          bGold.textContent = tt("shopBuy", "Mua");
          bGold.title = tt("shopBuyGold", "Mua bằng vàng");
          bGold.addEventListener("click", async function () {
            try { sfxClick(); } catch (e) {}
            bGold.disabled = true;
            const r = await buyBubbleSkinWithGold(skin.id, goldPrice);
            flashBuy(r, skin, goldPrice, false);
            renderShop("bubbles");
          });
          row.appendChild(bGold);
        }
        if (diaCost > 0) {
          const bDia = document.createElement("button");
          bDia.type = "button";
          bDia.className = "shop-buy-btn shop-buy-dia";
          bDia.textContent = tt("shopBuyDia", "KC");
          bDia.title = tt("shopBuyWithDia", "Mua bằng kim cương");
          bDia.addEventListener("click", async function () {
            try { sfxClick(); } catch (e) {}
            bDia.disabled = true;
            const r = await buyBubbleSkinWithDiamond(skin.id, diaCost);
            flashBuy(r, skin, diaCost, true);
            renderShop("bubbles");
          });
          row.appendChild(bDia);
        }
        card.appendChild(row);
      }
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  function renderVsCardShopTab(body) {
    const list = typeof VS_OBSTACLES !== "undefined" ? VS_OBSTACLES : [];
    const unlockedFn = typeof isVsCardUnlocked === "function" ? isVsCardUnlocked : function () { return true; };

    const note = document.createElement("div");
    note.className = "shop-vscard-note";
    note.textContent = tt("shopVsCardNote", "Thẻ mở khoá sẽ xuất hiện trong bộ bài rút khi chơi Đấu 1-1 (Versus).");
    body.appendChild(note);

    const grid = document.createElement("div");
    grid.className = "shop-grid";
    list.forEach(function (ob) {
      const owned = unlockedFn(ob.id);
      const goldPrice = ob.price | 0;
      const diaCost = ob.diaPrice | 0;
      const card = document.createElement("div");
      card.className = "shop-item" + (owned ? " owned" : "") + (goldPrice <= 0 && diaCost > 0 ? " shop-item-premium" : "");

      const preview = document.createElement("div");
      preview.className = "shop-item-preview shop-vscard-preview";
      preview.textContent = ob.emoji;
      card.appendChild(preview);

      const nameEl = document.createElement("div");
      nameEl.className = "shop-item-name";
      nameEl.textContent = (typeof MECH_NAME === "function" ? MECH_NAME(ob.nameIdx) : ob.id).replace(/^\S+\s/, "");
      card.appendChild(nameEl);

      const priceEl = document.createElement("div");
      priceEl.className = "shop-item-price";
      priceEl.textContent = ob.free
        ? tt("shopFree", "Miễn phí")
        : owned
          ? tt("shopOwned", "Đã sở hữu")
          : goldPrice
            ? "🪙 " + goldPrice
            : "💎 " + diaCost;
      card.appendChild(priceEl);

      const displayName = (typeof MECH_NAME === "function" ? MECH_NAME(ob.nameIdx) : ob.id).replace(/^\S+\s/, "");
      if (!owned && !ob.free) {
        const row = document.createElement("div");
        row.className = "shop-item-actions";
        if (goldPrice > 0) {
          const bGold = document.createElement("button");
          bGold.type = "button";
          bGold.className = "shop-buy-btn";
          bGold.textContent = tt("shopBuy", "Mua");
          bGold.title = tt("shopBuyGold", "Mua bằng vàng");
          bGold.addEventListener("click", async function () {
            try { sfxClick(); } catch (e) {}
            bGold.disabled = true;
            const r = await buyVsCardWithGold(ob.id, goldPrice);
            flashBuy(r, { name: displayName }, goldPrice, false);
            renderShop("vscards");
          });
          row.appendChild(bGold);
        }
        if (diaCost > 0) {
          const bDia = document.createElement("button");
          bDia.type = "button";
          bDia.className = "shop-buy-btn shop-buy-dia";
          bDia.textContent = tt("shopBuyDia", "KC");
          bDia.title = tt("shopBuyWithDia", "Mua bằng kim cương");
          bDia.addEventListener("click", async function () {
            try { sfxClick(); } catch (e) {}
            bDia.disabled = true;
            const r = await buyVsCardWithDiamond(ob.id, diaCost);
            flashBuy(r, { name: displayName }, diaCost, true);
            renderShop("vscards");
          });
          row.appendChild(bDia);
        }
        card.appendChild(row);
      }
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  function makeNameEffectPreviewEl(id) {
    const wrap = document.createElement("div");
    wrap.className = "shop-item-preview shop-nameeffect-preview";
    const nick = tt("shopNameEffectPreviewText", "Người chơi");
    const style = Object.assign({}, (typeof getPlayerNameStyle === "function" ? getPlayerNameStyle() : {}), { effect: id });
    wrap.innerHTML = (typeof formatPlayerNameStyledHtml === "function")
      ? formatPlayerNameStyledHtml(nick, style)
      : nick;
    return wrap;
  }

  function renderNameEffectShopTab(body) {
    const list = typeof NAME_EFFECTS !== "undefined" ? NAME_EFFECTS : [];
    const ownedFn = typeof isNameEffectOwned === "function" ? isNameEffectOwned : function () { return false; };
    const equipped = typeof equippedNameEffect === "function" ? equippedNameEffect() : "";

    const grid = document.createElement("div");
    grid.className = "shop-grid";
    list.forEach(function (fx) {
      const owned = ownedFn(fx.id);
      const isEquipped = owned && equipped === fx.id;
      const diaCost = fx.diaPrice | 0;

      const card = document.createElement("div");
      card.className = "shop-item shop-item-premium" + (isEquipped ? " equipped" : "");
      card.appendChild(makeNameEffectPreviewEl(fx.id));

      const nameEl = document.createElement("div");
      nameEl.className = "shop-item-name";
      nameEl.textContent = fx.name || fx.id;
      card.appendChild(nameEl);

      const priceEl = document.createElement("div");
      priceEl.className = "shop-item-price";
      priceEl.textContent = owned ? tt("shopOwned", "Đã sở hữu") : "💎 " + diaCost;
      card.appendChild(priceEl);

      const row = document.createElement("div");
      row.className = "shop-item-actions";
      if (!owned) {
        const bDia = document.createElement("button");
        bDia.type = "button";
        bDia.className = "shop-buy-btn shop-buy-dia";
        bDia.textContent = tt("shopBuyDia", "KC");
        bDia.title = tt("shopBuyWithDia", "Mua bằng kim cương");
        bDia.addEventListener("click", async function () {
          try { sfxClick(); } catch (e) {}
          bDia.disabled = true;
          const r = await buyNameEffect(fx.id, diaCost);
          flashBuy(r, fx, diaCost, true);
          renderShop("nameeffects");
        });
        row.appendChild(bDia);
      } else {
        const bEquip = document.createElement("button");
        bEquip.type = "button";
        bEquip.className = "shop-buy-btn" + (isEquipped ? " shop-equipped-btn" : "");
        bEquip.textContent = isEquipped ? tt("shopUnequip", "Tháo ra") : tt("shopEquip", "Trang bị");
        bEquip.addEventListener("click", function () {
          try { sfxClick(); } catch (e) {}
          equipNameEffect(isEquipped ? "" : fx.id);
          try { if (typeof refreshArcadeHud === "function") refreshArcadeHud(); } catch (e) {}
          renderShop("nameeffects");
        });
        row.appendChild(bEquip);
      }
      card.appendChild(row);
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  function makeTextEffectPreviewEl(id) {
    const wrap = document.createElement("div");
    wrap.className = "shop-item-preview shop-nameeffect-preview";
    const sample = tt("shopTextEffectPreviewText", "Chào mừng bạn!");
    const span = document.createElement("span");
    span.className = "gchat-text" + (typeof textFxClass === "function" ? textFxClass(id) : "");
    span.textContent = sample;
    wrap.appendChild(span);
    if (id === "flowers" && typeof textFxDecoHtml === "function") {
      const deco = document.createElement("span");
      deco.className = "text-fx-flowers-wrap";
      deco.setAttribute("aria-hidden", "true");
      deco.innerHTML = textFxDecoHtml("flowers");
      wrap.appendChild(deco);
    }
    return wrap;
  }

  function renderTextEffectShopTab(body) {
    const list = typeof TEXT_EFFECTS !== "undefined" ? TEXT_EFFECTS : [];
    const ownedFn = typeof isTextEffectOwned === "function" ? isTextEffectOwned : function () { return false; };
    const equipped = typeof equippedTextEffect === "function" ? equippedTextEffect() : "";

    const grid = document.createElement("div");
    grid.className = "shop-grid";
    list.forEach(function (fx) {
      const owned = ownedFn(fx.id);
      const isEquipped = owned && equipped === fx.id;
      const diaCost = fx.diaPrice | 0;

      const card = document.createElement("div");
      card.className = "shop-item shop-item-premium" + (isEquipped ? " equipped" : "");
      card.appendChild(makeTextEffectPreviewEl(fx.id));

      const nameEl = document.createElement("div");
      nameEl.className = "shop-item-name";
      nameEl.textContent = fx.name || fx.id;
      card.appendChild(nameEl);

      const priceEl = document.createElement("div");
      priceEl.className = "shop-item-price";
      priceEl.textContent = owned ? tt("shopOwned", "Đã sở hữu") : "💎 " + diaCost;
      card.appendChild(priceEl);

      const row = document.createElement("div");
      row.className = "shop-item-actions";
      if (!owned) {
        const bDia = document.createElement("button");
        bDia.type = "button";
        bDia.className = "shop-buy-btn shop-buy-dia";
        bDia.textContent = tt("shopBuyDia", "KC");
        bDia.title = tt("shopBuyWithDia", "Mua bằng kim cương");
        bDia.addEventListener("click", async function () {
          try { sfxClick(); } catch (e) {}
          bDia.disabled = true;
          const r = await buyTextEffect(fx.id, diaCost);
          flashBuy(r, fx, diaCost, true);
          renderShop("textfx");
        });
        row.appendChild(bDia);
      } else {
        const bEquip = document.createElement("button");
        bEquip.type = "button";
        bEquip.className = "shop-buy-btn" + (isEquipped ? " shop-equipped-btn" : "");
        bEquip.textContent = isEquipped ? tt("shopUnequip", "Tháo ra") : tt("shopEquip", "Trang bị");
        bEquip.addEventListener("click", function () {
          try { sfxClick(); } catch (e) {}
          equipTextEffect(isEquipped ? "" : fx.id);
          renderShop("textfx");
        });
        row.appendChild(bEquip);
      }
      card.appendChild(row);
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }
  async function buyBoardWithGold(id, price) {
    if (typeof isBoardSkinUnlocked === "function" && isBoardSkinUnlocked(id))
      return { ok: false, reason: "owned" };
    const r = await _shopSpendCurrency({ gold: price });
    if (!r.ok) return { ok: false, reason: r.reason === "offline" ? "offline" : "gold" };
    if (typeof unlockBoardSkin === "function") unlockBoardSkin(id);
    try { if (typeof syncWalletFromServer === "function") await syncWalletFromServer(); } catch (e) {}
    return { ok: true };
  }

  async function buyBrickWithGold(id, price) {
    if (typeof isBrickSkinUnlocked === "function" && isBrickSkinUnlocked(id))
      return { ok: false, reason: "owned" };
    const r = await _shopSpendCurrency({ gold: price });
    if (!r.ok) return { ok: false, reason: r.reason === "offline" ? "offline" : "gold" };
    if (typeof unlockBrickSkin === "function") unlockBrickSkin(id);
    try { if (typeof syncWalletFromServer === "function") await syncWalletFromServer(); } catch (e) {}
    return { ok: true };
  }

  async function buyBoardWithDiamond(id, diaCost) {
    if (typeof isBoardSkinUnlocked === "function" && isBoardSkinUnlocked(id))
      return { ok: false, reason: "owned" };
    const r = await _shopSpendCurrency({ diamonds: diaCost });
    if (!r.ok) return { ok: false, reason: r.reason === "offline" ? "offline" : "diamond" };
    if (typeof unlockBoardSkin === "function") unlockBoardSkin(id);
    try { if (typeof syncWalletFromServer === "function") await syncWalletFromServer(); } catch (e) {}
    return { ok: true };
  }

  async function buyBrickWithDiamond(id, diaCost) {
    if (typeof isBrickSkinUnlocked === "function" && isBrickSkinUnlocked(id))
      return { ok: false, reason: "owned" };
    const r = await _shopSpendCurrency({ diamonds: diaCost });
    if (!r.ok) return { ok: false, reason: r.reason === "offline" ? "offline" : "diamond" };
    if (typeof unlockBrickSkin === "function") unlockBrickSkin(id);
    try { if (typeof syncWalletFromServer === "function") await syncWalletFromServer(); } catch (e) {}
    return { ok: true };
  }

  function openShop(tab) {
    ensureShopPanel();
    const panel = document.getElementById("shop-panel");
    refreshShopBalance();
    if (tab) {
      const item = SHOP2_TILES.filter(function (x) { return x.tab === tab; })[0];
      openShop2Sub(tab, item ? tt(item.key, item.fb) : "");
    } else {
      panel.classList.remove("shop2-sub-open");
      renderShop2Grid();
    }
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
        openShop();
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
        openShop();
      });
    }
  }

  g.openShop = openShop;
  g.closeShop = closeShop;
  g.buyBoardWithGold = buyBoardWithGold;
  g.buyBrickWithGold = buyBrickWithGold;
  // g.exchangeDiamondsForGold: ĐÃ BỎ có chủ đích cùng với chiều đổi kim cương→vàng
  // (xem renderDiamondInfo phía trên + functions/index.js exchangeCurrency).
  g.HEART_GOLD_PRICE = HEART_GOLD_PRICE;

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initShopUI);
  else initShopUI();
})(typeof window !== "undefined" ? window : this);
