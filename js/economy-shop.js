// ═══════════════════════════════════════════════════════════════
// economy-shop.js — Cửa hàng vàng: nền bàn, mẫu gạch, mua tim, QC vàng
// Nạp SAU inventory.js + map-boards/brick-skins, TRƯỚC ui.js / chat.js
// ═══════════════════════════════════════════════════════════════
(function (g) {
  "use strict";

  function tt() {
    try {
      if (typeof t === "function") return t.apply(null, arguments);
    } catch (e) {}
    return arguments[1] != null ? arguments[1] : arguments[0];
  }

  const HEART_GOLD_PRICE = 8;
  const HEART_PACK = 1;

  function gold() {
    return typeof getGold === "function" ? getGold() : 0;
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
      '<div class="shop-gold-row" id="shop-gold-row">🪙 0</div>' +
      '<div class="shop-tabs">' +
      '<button type="button" class="shop-tab active" data-shop-tab="boards">🗺️ Nền</button>' +
      '<button type="button" class="shop-tab" data-shop-tab="bricks">🧱 Gạch</button>' +
      '<button type="button" class="shop-tab" data-shop-tab="hearts">❤️ Tim</button>' +
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

  function renderShop(tab) {
    tab = tab || "boards";
    const body = document.getElementById("shop-body");
    const goldRow = document.getElementById("shop-gold-row");
    if (goldRow) goldRow.textContent = "🪙 " + gold();
    if (!body) return;
    body.innerHTML = "";

    if (tab === "hearts") {
      const box = document.createElement("div");
      box.className = "shop-hearts-box";
      const left = typeof adHeartViewsLeft === "function" ? adHeartViewsLeft() : 0;
      const gLeft = typeof adGoldViewsLeft === "function" ? adGoldViewsLeft() : 0;
      const nextG = typeof nextAdGoldReward === "function" ? nextAdGoldReward() : 0;
      box.innerHTML =
        '<p class="shop-hint">' +
        tt("shopHeartHint", "Mua tim bằng vàng hoặc xem quảng cáo (tối đa 5 lượt/ngày mỗi loại).") +
        "</p>" +
        '<button type="button" class="auth-submit-btn shop-buy-heart" id="shop-buy-heart">' +
        "❤️ +" +
        HEART_PACK +
        " · 🪙 " +
        HEART_GOLD_PRICE +
        "</button>" +
        '<button type="button" class="auth-submit-btn shop-ad-gold" id="shop-ad-gold" ' +
        (gLeft < 1 ? "disabled" : "") +
        ">" +
        (gLeft < 1
          ? tt("shopAdGoldCap", "Đã hết lượt QC vàng hôm nay")
          : tt("shopAdGold", "📺 Xem QC +" + nextG + " vàng (" + gLeft + "/5)")) +
        "</button>" +
        '<button type="button" class="auth-submit-btn shop-ad-heart" id="shop-ad-heart" ' +
        (left < 1 ? "disabled" : "") +
        ">" +
        (left < 1
          ? tt("shopAdHeartCap", "Đã hết lượt QC tim hôm nay")
          : tt("shopAdHeart", "📺 Xem QC +1 tim (" + left + "/5)")) +
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
            showComboFlash(0, false, tt("shopNotEnoughGold", "Không đủ vàng"));
          } catch (e) {}
        }
        renderShop("hearts");
      });
      document.getElementById("shop-ad-gold")?.addEventListener("click", function () {
        try {
          sfxClick();
        } catch (e) {}
        if (typeof watchAdForGold === "function") watchAdForGold(function () {
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
    const buyFn = isBoard ? buyBoardWithGold : buyBrickWithGold;

    const grid = document.createElement("div");
    grid.className = "shop-grid";
    list.forEach(function (skin) {
      if (!skin || skin.starter) return;
      const owned = unlockedFn(skin.id);
      const price = skin.price | 0 || 20;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "shop-item" + (owned ? " owned" : "");
      card.innerHTML =
        '<div class="shop-item-ico">' +
        (isBoard ? "🗺️" : "🧱") +
        "</div>" +
        '<div class="shop-item-name">' +
        (skin.name || skin.id) +
        "</div>" +
        '<div class="shop-item-price">' +
        (owned ? tt("shopOwned", "Đã sở hữu") : "🪙 " + price) +
        "</div>";
      if (!owned) {
        card.addEventListener("click", function () {
          try {
            sfxClick();
          } catch (e) {}
          const r = buyFn(skin.id, price);
          if (!r || !r.ok) {
            try {
              showComboFlash(
                0,
                false,
                r && r.reason === "owned"
                  ? tt("shopOwned", "Đã sở hữu")
                  : tt("shopNotEnoughGold", "Không đủ vàng")
              );
            } catch (e) {}
          } else {
            try {
              showComboFlash(0, false, "🪙 −" + price + " · " + (skin.name || skin.id));
            } catch (e) {}
            try {
              if (typeof sfxUnlock === "function") sfxUnlock();
            } catch (e) {}
          }
          renderShop(tab);
        });
      } else {
        card.disabled = true;
      }
      grid.appendChild(card);
    });
    body.appendChild(grid);
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
    // Khi mở kho gạch/nền mà chưa mua — nhắc shop
    document.getElementById("brick-skin-btn")?.addEventListener(
      "click",
      function () {
        /* giữ picker cũ để chọn skin đã mua */
      },
      true
    );
  }

  g.openShop = openShop;
  g.closeShop = closeShop;
  g.buyBoardWithGold = buyBoardWithGold;
  g.buyBrickWithGold = buyBrickWithGold;
  g.HEART_GOLD_PRICE = HEART_GOLD_PRICE;

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initShopUI);
  else initShopUI();
})(typeof window !== "undefined" ? window : this);
