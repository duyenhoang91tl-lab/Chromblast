/* ══════════════════════════════════════════
   Thẻ trò chơi — tab "Đi đổi" (#gpcard-redeem).
   Trình bày lại giao diện cửa hàng hiện có (js/economy-shop.js) dạng lưới thẻ
   2 cột: skin bàn/gạch, mua tim bằng vàng. Không tạo loại tiền tệ mới, không
   tự trừ vàng/kim cương cục bộ — mọi giao dịch đi qua Cloud Function
   spendCurrency (functions/index.js) rồi đồng bộ lại số dư thật qua
   syncWalletFromServer(), giống hệt cách claimPendingReferralRewards() đang
   dùng syncWalletFromServer() sau khi server đã cộng/trừ xong.
   Khung sườn (#gpcard-panel) do js/gpcard.js quản lý — file này chỉ đổ nội
   dung vào #gpcard-redeem đã có sẵn.
   Nạp SAU js/economy-shop.js + js/online-services.js + js/inventory.js +
   js/map-boards.js + js/brick-skins.js.
══════════════════════════════════════════ */

const GPCARD_REDEEM_BRICK_PREVIEW_COLORS = ["#E24B4A", "#378ADD", "#1D9E75", "#EF9F27"];

function _gpcardRedeemEscapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function _gpcardRedeemDiaCost(skin){
  const goldPrice = skin.price | 0;
  if(skin.diaPrice) return skin.diaPrice | 0;
  if(typeof diamondPriceForGold === 'function') return diamondPriceForGold(goldPrice || 20);
  return (goldPrice || 20) >= 100 ? Math.ceil((goldPrice || 20) / 100) : 0;
}

function _gpcardRedeemBoardPreviewHtml(skinId){
  return '<div class="board-swatch gpcard-redeem-swatch" data-board-skin="'+_gpcardRedeemEscapeHtml(skinId||'classic')+'"></div>';
}

function _gpcardRedeemBrickPreviewHtml(skinId){
  return '<div class="brick-skin-preview gpcard-redeem-swatch">'
    + GPCARD_REDEEM_BRICK_PREVIEW_COLORS.map(c =>
        '<div class="brick-swatch" data-brick-skin="'+_gpcardRedeemEscapeHtml(skinId||'classic')+'" style="--cc:'+c+'"></div>'
      ).join('')
    + '</div>';
}

/** Mọi lần trừ tiền đều qua Cloud Function spendCurrency — server tự kiểm tra số
 * dư thật, không tin client. cost: {gold:n} hoặc {diamonds:n}. */
async function _gpcardRedeemSpend(cost){
  if(typeof _getOnlineFunctions !== 'function') return { ok:false, reason:'offline' };
  const fns = _getOnlineFunctions();
  if(!fns) return { ok:false, reason:'offline' };
  try{
    await fns.httpsCallable('spendCurrency')({ cost });
    return { ok:true };
  }catch(e){
    return { ok:false, reason: (e && e.message) || 'error' };
  }
}

function _gpcardRedeemCardHtml(opts){
  // opts: { kind, id, name, previewHtml, goldPrice, diaCost, owned, disabledGold, disabledDia }
  const ownedLabel = typeof t==='function' ? t('shopOwned') : 'Đã sở hữu';
  let bodyHtml;
  if(opts.owned){
    bodyHtml = '<div class="gpcard-redeem-price">'+ownedLabel+'</div>';
  }else{
    const priceParts = [];
    if(opts.goldPrice > 0) priceParts.push('🪙 '+opts.goldPrice);
    if(opts.diaCost > 0) priceParts.push('💎 '+opts.diaCost);
    let btns = '';
    if(opts.goldPrice > 0){
      btns += '<button type="button" class="gpcard-redeem-btn'+(opts.disabledGold?' disabled':'')+'" '
        +'data-gpcard-redeem-kind="'+opts.kind+'" data-gpcard-redeem-id="'+_gpcardRedeemEscapeHtml(opts.id)+'" '
        +'data-gpcard-redeem-cur="gold" data-gpcard-redeem-cost="'+opts.goldPrice+'">'
        +(typeof t==='function'?t('gpcardRedeemBtn'):'Đi đổi')+'</button>';
    }
    if(opts.diaCost > 0){
      btns += '<button type="button" class="gpcard-redeem-btn gpcard-redeem-btn-dia'+(opts.disabledDia?' disabled':'')+'" '
        +'data-gpcard-redeem-kind="'+opts.kind+'" data-gpcard-redeem-id="'+_gpcardRedeemEscapeHtml(opts.id)+'" '
        +'data-gpcard-redeem-cur="diamonds" data-gpcard-redeem-cost="'+opts.diaCost+'">💎 '
        +(typeof t==='function'?t('gpcardRedeemBtn'):'Đi đổi')+'</button>';
    }
    bodyHtml = '<div class="gpcard-redeem-price">'+priceParts.join(' / ')+'</div><div class="gpcard-redeem-actions">'+btns+'</div>';
  }
  return '<div class="gpcard-redeem-card'+(opts.owned?' owned':'')+'">'
    + '<div class="gpcard-redeem-preview">'+opts.previewHtml+'</div>'
    + '<div class="gpcard-redeem-name">'+_gpcardRedeemEscapeHtml(opts.name)+'</div>'
    + bodyHtml
    + '</div>';
}

async function renderGpcardRedeem(){
  const root = document.getElementById('gpcard-redeem');
  if(!root) return;
  root.innerHTML = '<div class="gpcard-lb-loading">'+(typeof t==='function'?t('lbLoading'):'…')+'</div>';

  // Đọc ví thật từ server trước khi vẽ — không đọc localStorage trực tiếp.
  try{ if(typeof syncWalletFromServer === 'function') await syncWalletFromServer(); }catch(e){}
  const myGold = typeof getGold === 'function' ? getGold() : 0;
  const myDia = typeof getDiamonds === 'function' ? getDiamonds() : 0;

  let cardsHtml = '';

  // Gói tim — mua bằng vàng, dùng đúng giá HEART_GOLD_PRICE/HEART_PACK đã có.
  if(typeof buyHeartWithGold === 'function'){
    const price = (typeof HEART_GOLD_PRICE === 'number') ? HEART_GOLD_PRICE : 8;
    const pack = (typeof HEART_PACK === 'number') ? HEART_PACK : 1;
    const heartsFull = (typeof heartsBelowMax === 'function') ? !heartsBelowMax() : false;
    cardsHtml += _gpcardRedeemCardHtml({
      kind: 'heart', id: 'heart', name: '❤️ +'+pack,
      previewHtml: '<div class="gpcard-redeem-heart-preview">❤️</div>',
      goldPrice: price, diaCost: 0, owned: false,
      disabledGold: heartsFull || myGold < price
    });
  }

  const boardList = (typeof BOARD_SKINS !== 'undefined') ? BOARD_SKINS : [];
  const brickList = (typeof BRICK_SKINS !== 'undefined') ? BRICK_SKINS : [];
  let boardsHtml = '';
  boardList.forEach(skin => {
    if(!skin || skin.starter) return;
    const owned = (typeof isBoardSkinUnlocked === 'function') && isBoardSkinUnlocked(skin.id);
    if(owned) return;
    const goldPrice = skin.price | 0;
    const diaCost = _gpcardRedeemDiaCost(skin);
    boardsHtml += _gpcardRedeemCardHtml({
      kind: 'board', id: skin.id, name: skin.name || skin.id,
      previewHtml: _gpcardRedeemBoardPreviewHtml(skin.id),
      goldPrice, diaCost, owned: false,
      disabledGold: goldPrice > 0 && myGold < goldPrice,
      disabledDia: diaCost > 0 && myDia < diaCost
    });
  });
  let bricksHtml = '';
  brickList.forEach(skin => {
    if(!skin || skin.starter) return;
    const owned = (typeof isBrickSkinUnlocked === 'function') && isBrickSkinUnlocked(skin.id);
    if(owned) return;
    const goldPrice = skin.price | 0;
    const diaCost = _gpcardRedeemDiaCost(skin);
    bricksHtml += _gpcardRedeemCardHtml({
      kind: 'brick', id: skin.id, name: skin.name || skin.id,
      previewHtml: _gpcardRedeemBrickPreviewHtml(skin.id),
      goldPrice, diaCost, owned: false,
      disabledGold: goldPrice > 0 && myGold < goldPrice,
      disabledDia: diaCost > 0 && myDia < diaCost
    });
  });

  root.innerHTML =
    '<div class="gpcard-card gpcard-redeem-balance">🪙 '+myGold+' · 💎 '+myDia+'</div>'
    + '<div class="gpcard-card"><div class="gpcard-redeem-grid">'+cardsHtml+boardsHtml+bricksHtml+'</div></div>';

  if(!cardsHtml && !boardsHtml && !bricksHtml){
    root.querySelector('.gpcard-redeem-grid').innerHTML =
      '<div class="gpcard-lb-empty">'+(typeof t==='function'?t('gpcardRedeemAllOwned'):'')+'</div>';
  }

  root.querySelectorAll('.gpcard-redeem-btn').forEach(btn => {
    if(btn.classList.contains('disabled')){
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cur = btn.dataset.gpcardRedeemCur;
        try{ sfxClick(); }catch(err){}
        try{
          showComboFlash(0, false, cur === 'diamonds'
            ? (typeof t==='function'?t('gpcardRedeemNotEnoughDia'):'')
            : (typeof t==='function'?t('gpcardRedeemNotEnoughGold'):''));
        }catch(err){}
      });
      return;
    }
    btn.addEventListener('click', async () => {
      try{ sfxClick(); }catch(e){}
      btn.disabled = true;
      const kind = btn.dataset.gpcardRedeemKind;
      const id = btn.dataset.gpcardRedeemId;
      const cur = btn.dataset.gpcardRedeemCur;
      const cost = Number(btn.dataset.gpcardRedeemCost) || 0;
      const res = await _gpcardRedeemSpend(cur === 'diamonds' ? { diamonds: cost } : { gold: cost });
      if(res.ok){
        if(kind === 'board' && typeof unlockBoardSkin === 'function') unlockBoardSkin(id);
        else if(kind === 'brick' && typeof unlockBrickSkin === 'function') unlockBrickSkin(id);
        else if(kind === 'heart' && typeof grantHearts === 'function') grantHearts(1, typeof t==='function'?t('shopHeartBought'):'Mua bằng vàng');
        try{ if(typeof syncWalletFromServer === 'function') await syncWalletFromServer(); }catch(e){}
        try{ if(typeof sfxUnlock === 'function') sfxUnlock(); }catch(e){}
      } else {
        const msg = res.reason === 'offline'
          ? (typeof t==='function'?t('errNetwork'):'')
          : (cur === 'diamonds' ? (typeof t==='function'?t('gpcardRedeemNotEnoughDia'):'') : (typeof t==='function'?t('gpcardRedeemNotEnoughGold'):''));
        try{ showComboFlash(0, false, msg); }catch(e){}
      }
      renderGpcardRedeem();
    });
  });
}

// Nạp nội dung mỗi lần bấm tab "Đi đổi" — không sửa js/gpcard.js, chỉ gắn thêm
// 1 listener độc lập lên đúng nút tab đã có sẵn trong khung sườn.
(function bindGpcardRedeemTab(){
  function bind(){
    const tabBtn = document.querySelector('.gpcard-tab[data-gpcard-tab="redeem"]');
    if(tabBtn) tabBtn.addEventListener('click', renderGpcardRedeem);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
