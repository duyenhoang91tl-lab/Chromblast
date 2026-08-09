/* ══════════════════════════════════════════
   Thẻ trò chơi — tab "Đổi quà" (#gpcard-redeem).
   Hiển thị 8 rương (js/loot-crates.js) — mua bằng vàng/kim cương hoặc mở
   miễn phí 1 lần/ngày (rương Bạc/Vàng/Gạch/Map). Toàn bộ logic random/trừ
   tiền/cộng vật phẩm nằm ở loot-crates.js, file này chỉ vẽ giao diện + gọi.
   Nạp SAU js/loot-crates.js.
══════════════════════════════════════════ */

function _gpcardCratePriceHtml(crate){
  const icon = crate.priceType === 'gold' ? '🪙' : '💎';
  return icon + ' ' + crate.price;
}

function _gpcardCrateCardHtml(crate){
  const freeNow = typeof crateFreeAvailable === 'function' && crateFreeAvailable(crate.id);
  const freeBtn = crate.freeDaily
    ? ('<button type="button" class="gpcard-crate-free-btn' + (freeNow ? '' : ' disabled') + '" data-gpcard-crate="' + crate.id + '" data-gpcard-free="1"' + (freeNow ? '' : ' disabled') + '>'
        + (freeNow ? '🎁 Miễn phí' : '✅ Đã dùng hôm nay') + '</button>')
    : '';
  return '<div class="gpcard-crate-card">'
    + '<div class="gpcard-crate-icon">' + crate.icon + '</div>'
    + '<div class="gpcard-crate-name">' + crate.name + '</div>'
    + '<button type="button" class="gpcard-crate-buy-btn" data-gpcard-crate="' + crate.id + '">' + _gpcardCratePriceHtml(crate) + ' · Mở</button>'
    + freeBtn
    + '</div>';
}

function renderGpcardRedeem(){
  const root = document.getElementById('gpcard-redeem');
  if(!root) return;
  if(typeof LOOT_CRATES === 'undefined'){
    root.innerHTML = '<div class="gpcard-card">…</div>';
    return;
  }
  root.innerHTML = '<div class="gpcard-card gpcard-crate-grid">'
    + LOOT_CRATES.map(_gpcardCrateCardHtml).join('')
    + '</div>';

  root.querySelectorAll('[data-gpcard-crate]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.gpcardCrate;
      const useFree = btn.dataset.gpcardFree === '1';
      if(btn.disabled) return;
      try{ sfxClick(); }catch(e){}
      btn.disabled = true;
      const res = typeof openLootCrate === 'function' ? await openLootCrate(id, useFree) : { ok:false };
      if(res.ok){
        try{ showComboFlash(0, false, res.reward ? res.reward.label : '🎉'); }catch(e){}
        try{ if(typeof sfxUnlock === 'function') sfxUnlock(); }catch(e){}
      } else {
        const msg = res.reason === 'gold' ? (typeof t === 'function' ? t('shopNotEnoughGold') : 'Không đủ vàng')
          : res.reason === 'diamond' ? (typeof t === 'function' ? t('shopNotEnoughDiamond') : 'Không đủ kim cương')
          : res.reason === 'free-used' ? 'Đã dùng lượt miễn phí hôm nay'
          : 'Không mở được';
        try{ showComboFlash(0, false, msg); }catch(e){}
      }
      renderGpcardRedeem();
    });
  });
}

(function bindGpcardRedeemTab(){
  function bind(){
    const tabBtn = document.querySelector('.gpcard-tab[data-gpcard-tab="redeem"]');
    if(tabBtn) tabBtn.addEventListener('click', renderGpcardRedeem);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
