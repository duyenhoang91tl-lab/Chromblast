/* ══════════════════════════════════════════
   Màn "Rương bảo vật" (#gpcard-redeem, vào từ menu chính) — hiển thị 9 rương
   (js/loot-crates.js), mua bằng vàng/kim cương. Hàm renderCrateGridInto() ở
   đây dùng CHUNG cho cả tab Rương trong Cửa hàng (js/economy-shop.js) và tab
   Rương trong Túi của tôi (js/account-bag.js) — đảm bảo icon/dữ liệu khớp
   tuyệt đối ở cả 3 nơi. Toàn bộ logic random/trừ tiền/cộng vật phẩm nằm ở
   loot-crates.js, file này chỉ vẽ giao diện + gọi.
   Nạp SAU js/loot-crates.js.
══════════════════════════════════════════ */

/** Icon lớn cho modal phần thưởng theo đúng reward.type mà openLootCrate()
 * (js/loot-crates.js) trả về. */
function _crateRewardIcon(reward){
  if(!reward) return '🎁';
  switch(reward.type){
    case 'gold': return '🪙';
    case 'diamond': return '💎';
    case 'hearts': return '❤️';
    case 'brick': return '🧱';
    case 'board': return '🗺️';
    case 'effect': return '✨';
    case 'bubble': return '💬';
    case 'skill': return (typeof POWER_INFO !== 'undefined' && reward.skillType && POWER_INFO[reward.skillType])
      ? POWER_INFO[reward.skillType].icon : '⚡';
    default: return '🎁';
  }
}

/** Modal "mở rương" toàn màn hình — hiện icon + tên phần thưởng vừa random
 * được, đóng lại bằng nút Nhận hoặc bấm ra ngoài overlay. Dùng chung cho mọi
 * chỗ mở rương (renderCrateGridInto ở dưới dùng chung cho cả 3 nơi hiển thị
 * rương như đã ghi ở trên). */
function showRewardPopup(rewards){
  const overlay = document.getElementById('crate-reward-overlay');
  if(!overlay || !rewards) return;
  const list = Array.isArray(rewards) ? rewards.filter(Boolean) : [rewards];
  if(!list.length) return;

  const first = list[0];
  const iconEl = document.getElementById('crate-reward-icon');
  const labelEl = document.getElementById('crate-reward-label');
  if(iconEl) iconEl.textContent = _crateRewardIcon(first);
  if(labelEl) labelEl.textContent = first.label || '';

  // Danh sách đầy đủ phần thưởng — tạo 1 lần rồi tái sử dụng cho mỗi lần mở.
  let listEl = overlay.querySelector('.reward-list');
  if(!listEl){
    listEl = document.createElement('div');
    listEl.className = 'reward-list';
    const btn = document.getElementById('crate-reward-claim-btn');
    const modal = overlay.querySelector('.crate-reward-modal');
    if(btn) btn.parentNode.insertBefore(listEl, btn);
    else if(modal) modal.appendChild(listEl);
  }
  listEl.innerHTML = list.map(r=>(
    '<div class="reward-item">'
    + '<span class="reward-item-icon">' + _crateRewardIcon(r) + '</span>'
    + '<span class="reward-item-label">' + (r && r.label ? r.label : '') + '</span>'
    + '</div>'
  )).join('');
  // Chỉ hiện danh sách khi có TỪ 2 phần thưởng trở lên — 1 phần thưởng giữ
  // đúng giao diện icon/tên to như bản cũ.
  listEl.style.display = list.length > 1 ? '' : 'none';

  overlay.hidden = false;
  requestAnimationFrame(()=>{ overlay.classList.add('show'); });
}
function closeRewardPopup(){
  const overlay = document.getElementById('crate-reward-overlay');
  if(!overlay) return;
  overlay.classList.remove('show');
  setTimeout(()=>{ overlay.hidden = true; }, 200);
}
(function _bindRewardPopup(){
  function bind(){
    document.getElementById('crate-reward-claim-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeRewardPopup();
    });
    document.getElementById('crate-reward-overlay')?.addEventListener('click', (e)=>{
      if(e.target && e.target.id === 'crate-reward-overlay') closeRewardPopup();
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


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
  return '<div class="gpcard-crate-card">'
    + '<div class="gpcard-crate-icon">' + _chestIconHtml(crate.tint) + '</div>'
    + '<div class="gpcard-crate-name">' + crate.name + '</div>'
    + '<button type="button" class="gpcard-crate-buy-btn" data-gpcard-crate="' + crate.id + '">' + _gpcardCratePriceHtml(crate) + ' · Mở</button>'
    + '</div>';
}

/** Vẽ lưới rương + gán sự kiện mua/mở vào 1 khung chứa bất kỳ — dùng chung cho
 * cả 3 nơi hiển thị rương (màn "Rương bảo vật" riêng, tab Rương trong Cửa
 * hàng, tab Rương trong Túi của tôi) để icon/dữ liệu/hành vi luôn khớp tuyệt
 * đối, không có 3 bản copy dễ lệch nhau. Gọi lại đúng root đó sau khi mở
 * xong để cập nhật trạng thái (vd giá/số dư đổi). */
function renderCrateGridInto(root){
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
      if(btn.disabled) return;
      try{ sfxClick(); }catch(e){}
      btn.disabled = true;
      const id = btn.dataset.gpcardCrate;
      const res = typeof openLootCrate === 'function' ? await openLootCrate(id, false) : { ok:false };
      if(res.ok){
        const rewards = (res.rewards && res.rewards.length) ? res.rewards : (res.reward ? [res.reward] : null);
        if(rewards && rewards.length) showRewardPopup(rewards);
        try{ if(typeof sfxUnlock === 'function') sfxUnlock(); }catch(e){}
      } else {
        const msg = res.reason === 'gold' ? (typeof t === 'function' ? t('shopNotEnoughGold') : 'Không đủ vàng')
          : res.reason === 'diamond' ? (typeof t === 'function' ? t('shopNotEnoughDiamond') : 'Không đủ kim cương')
          : 'Không mở được';
        try{ showComboFlash(0, false, msg); }catch(e){}
      }
      renderCrateGridInto(root);
    });
  });

  // Badge số lượng/tình trạng trên từng thẻ rương (rương miễn phí hôm nay, số
  // sạc kỹ năng đang sở hữu) — hàm chung ở js/loot-crates.js, vẽ lại mỗi lần
  // render nên không bị mất sau khi mở rương.
  try{ if(typeof decorateCrateCards === 'function') decorateCrateCards(root); }catch(e){}
}

function renderGpcardRedeem(){
  renderCrateGridInto(document.getElementById('gpcard-redeem'));
}

// Trước đây là tab "Đi đổi" trong Thẻ trò chơi, giờ tách thành màn hình riêng
// "Đổi quà" vào thẳng từ menu chính (set-btn-redeem) — dùng lại nguyên nội
// dung/dữ liệu, chỉ đổi nơi mở.
function openGpcardRedeemScreen(){
  try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
  renderGpcardRedeem();
  document.getElementById('gpcard-redeem-screen')?.classList.add('show');
}
function closeGpcardRedeemScreen(){
  document.getElementById('gpcard-redeem-screen')?.classList.remove('show');
}
(function bindGpcardRedeemScreen(){
  function bind(){
    document.getElementById('set-btn-redeem')?.addEventListener('click', ()=>{
      document.getElementById('settings-panel')?.classList.remove('show');
      openGpcardRedeemScreen();
    });
    document.getElementById('gpcard-redeem-screen-back')?.addEventListener('click', ()=>{
      try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
      closeGpcardRedeemScreen();
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
