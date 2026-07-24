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

  function renderShop(tab) {
    tab = tab || "boards";
    const body = document.getElementById("shop-body");
    const goldRow = document.getElementById("shop-gold-row");
    if (goldRow) goldRow.textContent = "🪙 " + gold() + " · 💎 " + diamonds();
    if (!body) return;
    body.innerHTML = "";

    if (tab === "diamond") {
      const rate = typeof GOLD_PER_DIAMOND === "number" ? GOLD_PER_DIAMOND : 100;
      const box = document.createElement("div");
      box.className = "shop-hearts-box";
      box.innerHTML =
        '<p class="shop-hint">' +
        tt("shopDiamondHint", "100 vàng = 1 kim cương. Item ≥100 vàng có thể mua bằng kim cương. KC thưởng top 1–3 BXH.") +
        "</p>" +
        '<button type="button" class="auth-submit-btn" id="shop-ex-1">💎 +1 · 🪙 ' + rate + "</button>" +
        '<button type="button" class="auth-submit-btn" id="shop-ex-5">💎 +5 · 🪙 ' + rate * 5 + "</button>";
      body.appendChild(box);
      function doEx(n) {
        try { sfxClick(); } catch (e) {}
        const r = typeof exchangeGoldForDiamonds === "function" ? exchangeGoldForDiamonds(n) : { ok: false };
        if (!r.ok) {
          try { showComboFlash(0, false, tt("shopNotEnoughGold", "Không đủ vàng")); } catch (e) {}
        }
        renderShop("diamond");
      }
      document.getElementById("shop-ex-1")?.addEventListener("click", function () { doEx(1); });
      document.getElementById("shop-ex-5")?.addEventListener("click", function () { doEx(5); });
      return;
    }

    if (tab === "hearts") {
      const box = document.createElement("div");
      box.className = "shop-hearts-box";
      const left = typeof adHeartViewsLeft === "function" ? adHeartViewsLeft() : 0;
      const gLeft = typeof adGoldViewsLeft === "function" ? adGoldViewsLeft() : 0;
      const nextG = typeof nextAdGoldReward === "function" ? nextAdGoldReward() : 0;
      let heartStatus = "";
      try {
        if (typeof Inventory !== "undefined") {
          if (typeof Inventory.applyHeartRegen === "function") Inventory.applyHeartRegen();
          const h =
            typeof Inventory.formatHearts === "function"
              ? Inventory.formatHearts(Inventory.hearts)
              : String(Inventory.hearts);
          const maxH = Inventory.MAX_HEARTS || 5;
          const rem =
            typeof Inventory.heartRegenRemainingMs === "function"
              ? Inventory.heartRegenRemainingMs()
              : 0;
          if (Number(Inventory.hearts) + 1e-9 >= maxH) {
            heartStatus = "❤️ " + h + " / " + maxH + " · " + tt("shopHeartFull", "Đầy");
          } else if (rem > 0) {
            const sec = Math.ceil(rem / 1000);
            const mm = Math.floor(sec / 60);
            const ss = sec % 60;
            const pad = (n) => (n < 10 ? "0" : "") + n;
            heartStatus =
              "❤️ " + h + " / " + maxH + " · +" + tt("shopHeartNext", "1 sau") + " " + pad(mm) + ":" + pad(ss);
          } else {
            heartStatus = "❤️ " + h + " / " + maxH;
          }
        }
      } catch (e) {}
      box.innerHTML =
        '<p class="shop-hint">' +
        tt("shopHeartHint", "Tim tự hồi +1 mỗi 30 phút (tối đa 5). Thêm tim: mua vàng, xem QC (5/ngày), quay thưởng, bạn bè, lên level.") +
        "</p>" +
        (heartStatus ? '<p class="shop-heart-status">' + heartStatus + "</p>" : "") +
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
        try { sfxClick(); } catch (e) {}
        if (typeof buyHeartWithGold !== "function") return;
        const r = buyHeartWithGold(HEART_PACK, HEART_GOLD_PRICE);
        if (!r || !r.ok) {
          try { showComboFlash(0, false, tt("shopNotEnoughGold", "Không đủ vàng")); } catch (e) {}
        }
        renderShop("hearts");
      });
      document.getElementById("shop-ad-gold")?.addEventListener("click", function () {
        try { sfxClick(); } catch (e) {}
        if (typeof watchAdForGold === "function") watchAdForGold(function () { renderShop("hearts"); });
      });
      document.getElementById("shop-ad-heart")?.addEventListener("click", function () {
        try { sfxClick(); } catch (e) {}
        if (typeof watchAdForHeart === "function") watchAdForHeart();
        setTimeout(function () { renderShop("hearts"); }, 800);
      });
      return;
    }

    const isBoard = tab === "boards";
    const list = isBoard
      ? typeof BOARD_SKINS !== "undefined" ? BOARD_SKINS : []
      : typeof BRICK_SKINS !== "undefined" ? BRICK_SKINS : [];
    const unlockedFn = isBoard
      ? typeof isBoardSkinUnlocked === "function" ? isBoardSkinUnlocked : function () { return true; }
      : typeof isBrickSkinUnlocked === "function" ? isBrickSkinUnlocked : function () { return true; };

    const grid = document.createElement("div");
    grid.className = "shop-grid";
    list.forEach(function (skin) {
      if (!skin || skin.starter) return;
      const owned = unlockedFn(skin.id);
      const price = skin.price | 0 || 20;
      const diaCost =
        typeof diamondPriceForGold === "function" ? diamondPriceForGold(price) : price >= 100 ? Math.ceil(price / 100) : 0;
      const card = document.createElement("div");
      card.className = "shop-item" + (owned ? " owned" : "");
      card.innerHTML =
        '<div class="shop-item-ico">' + (isBoard ? "🗺️" : "🧱") + "</div>" +
        '<div class="shop-item-name">' + (skin.name || skin.id) + "</div>" +
        '<div class="shop-item-price">' +
        (owned ? tt("shopOwned", "Đã sở hữu") : "🪙 " + price + (diaCost ? " / 💎 " + diaCost : "")) +
        "</div>";
      if (!owned) {
        const row = document.createElement("div");
        row.className = "shop-item-actions";
        const bGold = document.createElement("button");
        bGold.type = "button";
        bGold.className = "shop-mini-btn";
        bGold.textContent = "🪙";
        bGold.title = "Mua bằng vàng";
        bGold.addEventListener("click", function () {
          try { sfxClick(); } catch (e) {}
          const r = isBoard ? buyBoardWithGold(skin.id, price) : buyBrickWithGold(skin.id, price);
          flashBuy(r, skin, price, false);
          renderShop(tab);
        });
        row.appendChild(bGold);
        if (diaCost > 0) {
          const bDia = document.createElement("button");
          bDia.type = "button";
          bDia.className = "shop-mini-btn shop-mini-dia";
          bDia.textContent = "💎";
          bDia.title = "Mua bằng kim cương";
          bDia.addEventListener("click", function () {
            try { sfxClick(); } catch (e) {}
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
    try { if (typeof sfxUnlock === "function") sfxUnlock(); } catch (e) {}
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
