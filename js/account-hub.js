/* ══════════════════════════════════════════
   TÀI KHOẢN (account-hub) — điểm vào duy nhất cho hồ sơ/cài đặt/xã hội.
   Chỉ dựng khung sườn + nối các màn đã có sẵn (đổi tên, cài đặt, bạn bè, cửa
   hàng, nhiệm vụ). 4 panel rỗng (account-status, account-achievements,
   account-bag, account-groups) và account-membership sẽ được đổ nội dung ở
   các lượt sau — không đụng vào từ file này.
   Dùng nguyên getPlayerAvatarDisplay()/getPlayerNickname()/getPublicPlayerId()
   đã có sẵn ở js/player-profile.js — không tạo field hồ sơ mới.
══════════════════════════════════════════ */

function renderAccountHub(){
  const avEl = document.getElementById('acchub-avatar');
  if(avEl && typeof applyAvatarElement === 'function'){
    applyAvatarElement(avEl, typeof getPlayerAvatarDisplay === 'function' ? getPlayerAvatarDisplay() : null);
  }
  const nameEl = document.getElementById('acchub-name');
  if(nameEl) nameEl.textContent = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : '';
  const idEl = document.getElementById('acchub-id');
  if(idEl){
    const pid = (typeof getPublicPlayerId === 'function') ? getPublicPlayerId() : '';
    idEl.textContent = (typeof t === 'function' ? t('acchubIdPrefix') : 'ID:') + ' ' + pid;
  }
}

function openAccountHub(){
  try{ sfxClick(); }catch(e){}
  try{ if(typeof closeAllSettingsOverlays === 'function') closeAllSettingsOverlays(); }catch(e){}
  renderAccountHub();
  document.getElementById('account-hub')?.classList.add('show');
}
function closeAccountHub(){
  document.getElementById('account-hub')?.classList.remove('show');
}

function _acchubOpenSub(panelId){
  try{ sfxClick(); }catch(e){}
  document.getElementById(panelId)?.classList.add('show');
}
function _acchubCloseSub(panelId){
  try{ sfxClick(); }catch(e){}
  document.getElementById(panelId)?.classList.remove('show');
}

(function initAccountHub(){
  function bind(){
    document.getElementById('acchub-close-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeAccountHub();
    });
    // Đóng khi bấm ra ngoài shell (nền mờ), giống các màn toàn màn hình khác
    document.getElementById('account-hub')?.addEventListener('click', e=>{
      if(e.target && e.target.id === 'account-hub') closeAccountHub();
    });

    // Hàng 3 icon
    document.getElementById('acchub-btn-membership')?.addEventListener('click', ()=>{
      _acchubOpenSub('account-membership-panel');
    });
    document.getElementById('acchub-btn-shop')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      if(typeof openShop === 'function') openShop();
    });
    document.getElementById('acchub-btn-quests')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      if(typeof openQuestsScreen === 'function') openQuestsScreen();
    });

    // Danh sách 7 dòng
    document.getElementById('acchub-row-status')?.addEventListener('click', ()=>{
      _acchubOpenSub('account-status-panel');
    });
    document.getElementById('acchub-row-achievements')?.addEventListener('click', ()=>{
      _acchubOpenSub('account-achievements-panel');
    });
    document.getElementById('acchub-row-bag')?.addEventListener('click', ()=>{
      _acchubOpenSub('account-bag-panel');
    });
    document.getElementById('acchub-row-groups')?.addEventListener('click', ()=>{
      _acchubOpenSub('account-groups-panel');
    });
    document.getElementById('acchub-row-rename')?.addEventListener('click', ()=>{
      if(typeof openPlayerProfilePanel === 'function') openPlayerProfilePanel();
    });
    document.getElementById('acchub-row-settings')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      if(typeof openSettingsPanel === 'function') openSettingsPanel();
    });
    document.getElementById('acchub-row-friends')?.addEventListener('click', ()=>{
      if(typeof openFriendsPanel === 'function') openFriendsPanel();
    });

    // Nút "‹" quay lại của 5 panel con rỗng
    document.getElementById('account-status-back')?.addEventListener('click', ()=>{
      _acchubCloseSub('account-status-panel');
    });
    document.getElementById('account-achievements-back')?.addEventListener('click', ()=>{
      _acchubCloseSub('account-achievements-panel');
    });
    document.getElementById('account-bag-back')?.addEventListener('click', ()=>{
      _acchubCloseSub('account-bag-panel');
    });
    document.getElementById('account-groups-back')?.addEventListener('click', ()=>{
      _acchubCloseSub('account-groups-panel');
    });
    document.getElementById('account-membership-back')?.addEventListener('click', ()=>{
      _acchubCloseSub('account-membership-panel');
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
