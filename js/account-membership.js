/* ══════════════════════════════════════════
   TÀI KHOẢN → "Hội viên" (#account-membership).
   Dự án hiện chỉ có 1 lần mua "bỏ quảng cáo vĩnh viễn" (entitlement remove_ads)
   qua IAP — KHÔNG có gói thuê bao theo kỳ hạn. Màn này chỉ TÓM TẮT trạng thái đã
   có, dùng đúng hasRemoveAds()/purchaseIAP()/restoreIAP()/getShopOfferings() ở
   js/iap.js — không thêm luồng mua/gói mới nào.
══════════════════════════════════════════ */

function _acmemTt(key, fallback){
  try{
    if(typeof t === 'function'){
      const v = t(key);
      if(v != null && v !== key) return v;
    }
  }catch(e){}
  return fallback != null ? fallback : key;
}

function _acmemBuildActiveCard(){
  const tt = _acmemTt;
  return '<div class="acmem-active">'
    + '<div class="acmem-active-icon">👑</div>'
    + '<div class="acmem-active-title">' + tt('acmemActiveTitle', 'Đã bỏ quảng cáo vĩnh viễn') + '</div>'
    + '<div class="acmem-active-sub">' + tt('acmemActiveSub', 'Cảm ơn bạn đã ủng hộ ChromaBlast!') + '</div>'
    + '</div>';
}

function _acmemBuildUnavailableCard(){
  const tt = _acmemTt;
  return '<div class="acmem-empty">' + tt('shopIapUnavailable', 'Nạp thêm chỉ khả dụng trên app Android.') + '</div>';
}

function _acmemBuildIntroCard(priceString){
  const tt = _acmemTt;
  const price = priceString || '—';
  return '<div class="acmem-intro">'
    + '<div class="acmem-intro-icon">🎁</div>'
    + '<div class="acmem-intro-title">' + tt('shopStarterPack', 'Gói khởi đầu') + '</div>'
    + '<div class="acmem-intro-desc">' + tt('shopStarterDesc', '200 💎 + Bỏ quảng cáo vĩnh viễn — chỉ 1 lần') + '</div>'
    + '<button type="button" class="auth-submit-btn acmem-buy-btn" id="acmem-buy-btn">' + price + '</button>'
    + '</div>'
    + '<button type="button" class="acmem-restore-btn" id="acmem-restore-btn">' + tt('shopRestore', 'Khôi phục giao dịch đã mua') + '</button>';
}

function _acmemBindIntroButtons(container){
  const tt = _acmemTt;
  container.querySelector('#acmem-buy-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    if(typeof markStarterPackSeen === 'function') markStarterPackSeen();
    purchaseIAP('starter_pack', ()=>{
      try{ showComboFlash(0, true, tt('shopPurchaseOk', 'Cảm ơn bạn đã ủng hộ! 🎉')); }catch(e){}
      renderAccountMembership();
    }).then(r=>{
      if(r && !r.ok && r.reason === 'error'){
        try{ showComboFlash(0, false, tt('shopPurchaseFail', 'Giao dịch không thành công')); }catch(e){}
      }
    });
  });
  container.querySelector('#acmem-restore-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    restoreIAP().then(r=>{
      showComboFlash(0, !!(r && r.ok), r && r.ok
        ? tt('shopRestoreOk', 'Đã khôi phục')
        : tt('shopRestoreFail', 'Không tìm thấy giao dịch nào'));
      if(r && r.ok && r.removeAds) renderAccountMembership();
    });
  });
}

function renderAccountMembership(){
  const container = document.getElementById('account-membership');
  if(!container) return;

  if(typeof hasRemoveAds === 'function' && hasRemoveAds()){
    container.innerHTML = _acmemBuildActiveCard();
    return;
  }

  if(typeof getShopOfferings !== 'function'){
    container.innerHTML = _acmemBuildUnavailableCard();
    return;
  }

  container.innerHTML = '<div class="acmem-loading">' + _acmemTt('shopLoading', 'Đang tải...') + '</div>';
  getShopOfferings().then(pkgs=>{
    if(typeof hasRemoveAds === 'function' && hasRemoveAds()){
      container.innerHTML = _acmemBuildActiveCard();
      return;
    }
    const pkg = (pkgs || []).find(p=>p.identifier === 'starter_pack' || (p.product && p.product.identifier === 'starter_pack'));
    if(!pkg){
      container.innerHTML = _acmemBuildUnavailableCard();
      return;
    }
    const priceString = (pkg.product && pkg.product.priceString) || null;
    container.innerHTML = _acmemBuildIntroCard(priceString);
    _acmemBindIntroButtons(container);
  });
}

(function initAccountMembership(){
  function bind(){
    document.getElementById('acchub-btn-membership')?.addEventListener('click', renderAccountMembership);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
