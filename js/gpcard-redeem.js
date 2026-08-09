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

// Icon rương kiểu rương báu hải tặc (thân gỗ nâu, nắp vòm, đai kim loại + ổ
// khoá tô theo màu riêng của từng loại rương) — thay cho emoji hộp/quà chung
// chung trước đây. 1 hình SVG dùng chung, chỉ đổi màu đai/khoá theo crate.tint.
function _chestIconHtml(tint){
  const c = tint || '#ffd54a';
  return '<svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">'
    + '<path d="M6 21 Q6 8 24 8 Q42 8 42 21 L42 25 L6 25 Z" fill="#8a5a30"/>'
    + '<path d="M6 21 Q6 8 24 8 Q42 8 42 21" fill="none" stroke="'+c+'" stroke-width="2"/>'
    + '<rect x="6" y="25" width="36" height="17" rx="3" fill="#a5713e"/>'
    + '<rect x="6" y="25" width="36" height="17" rx="3" fill="none" stroke="#6b4423" stroke-width="1"/>'
    + '<line x1="6" y1="33.5" x2="42" y2="33.5" stroke="#6b4423" stroke-width="1.4"/>'
    + '<rect x="9" y="8" width="4.5" height="34" fill="'+c+'" opacity="0.9"/>'
    + '<rect x="34.5" y="8" width="4.5" height="34" fill="'+c+'" opacity="0.9"/>'
    + '<rect x="19.5" y="26" width="9" height="10" rx="2" fill="'+c+'"/>'
    + '<circle cx="24" cy="30.5" r="1.7" fill="#4a2f14"/>'
    + '</svg>';
}

function _gpcardCrateCardHtml(crate){
  const freeNow = typeof crateFreeAvailable === 'function' && crateFreeAvailable(crate.id);
  const freeBtn = crate.freeDaily
    ? ('<button type="button" class="gpcard-crate-free-btn' + (freeNow ? '' : ' disabled') + '" data-gpcard-crate="' + crate.id + '" data-gpcard-free="1"' + (freeNow ? '' : ' disabled') + '>'
        + (freeNow ? '🎁 Miễn phí' : '✅ Đã dùng hôm nay') + '</button>')
    : '';
  return '<div class="gpcard-crate-card">'
    + '<div class="gpcard-crate-icon">' + _chestIconHtml(crate.tint) + '</div>'
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
