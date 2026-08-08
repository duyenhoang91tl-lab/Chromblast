// "Thẻ trò chơi" (game-pass-card) — khung sườn điểm vào mới cho mục Xếp hạng.
// Chỉ lo phần khung: header cấp/XP, 4 tab, mở/đóng panel toàn màn hình trượt từ
// phải sang. Nội dung bên trong mỗi tab (#gpcard-rewards/quests/redeem/
// leaderboard) do các phần việc riêng đổ vào — file này KHÔNG render nội dung đó.

const GPCARD_TABS = ['rewards', 'quests', 'redeem', 'leaderboard'];

function _gpcardRenderHeader(){
  const lvEl = document.getElementById('gpcard-lv');
  const fillEl = document.getElementById('gpcard-xp-fill');
  const textEl = document.getElementById('gpcard-xp-text');
  if(!lvEl || !fillEl || !textEl) return;
  const lv = (typeof playerLevel === 'number') ? playerLevel : 1;
  const xp = (typeof playerXP === 'number') ? playerXP : 0;
  const need = (typeof xpNeeded === 'function') ? xpNeeded(lv) : 100;
  lvEl.textContent = 'Lv.' + lv;
  fillEl.style.width = Math.max(0, Math.min(100, Math.round(xp / need * 100))) + '%';
  textEl.textContent = xp + ' / ' + need;
}

function _gpcardCloseSub(tab){
  const sub = document.getElementById('gpcard-sub-' + tab);
  if(sub) sub.classList.remove('show');
}

function _gpcardOpenSub(tab){
  if(GPCARD_TABS.indexOf(tab) < 0) return;
  document.querySelectorAll('#gpcard-panel .gpcard-tab').forEach(b=>{
    b.classList.toggle('active', b.dataset.gpcardTab === tab);
  });
  GPCARD_TABS.forEach(id=>{ if(id !== tab) _gpcardCloseSub(id); });
  const sub = document.getElementById('gpcard-sub-' + tab);
  if(sub) sub.classList.add('show');
}

/** Mở "Thẻ trò chơi", mặc định mở sẵn tab truyền vào (hoặc 'leaderboard' nếu
 * không truyền — giữ hành vi cũ cho người quen bấm nút Xếp hạng). */
function openGpcardPanel(defaultTab){
  const panel = document.getElementById('gpcard-panel');
  if(!panel) return;
  try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
  _gpcardRenderHeader();
  panel.classList.add('show');
  _gpcardOpenSub(defaultTab || 'leaderboard');
}

function closeGpcardPanel(){
  const panel = document.getElementById('gpcard-panel');
  if(!panel) return;
  GPCARD_TABS.forEach(_gpcardCloseSub);
  panel.classList.remove('show');
}

function initGpcardPanel(){
  const panel = document.getElementById('gpcard-panel');
  if(!panel) return;

  document.querySelectorAll('#gpcard-panel .gpcard-tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
      _gpcardOpenSub(btn.dataset.gpcardTab);
    });
  });
  document.querySelectorAll('#gpcard-panel .gpcard-back-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
      const sub = btn.closest('.gpcard-sub');
      if(sub) sub.classList.remove('show');
    });
  });
  document.getElementById('gpcard-close-btn')?.addEventListener('click', closeGpcardPanel);
  document.getElementById('gpcard-upgrade-btn')?.addEventListener('click', ()=>{
    try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
    try{ if(typeof openShop === 'function') openShop(); }catch(e){}
  });

  // Nút Xếp hạng hiện tại của game (header chính + Settings Hub) giờ mở "Thẻ
  // trò chơi" (mặc định tab Bảng xếp hạng) thay vì mở thẳng #leaderboard-panel
  // như trước — giữ đúng hành vi cũ cho người dùng quen tay (yêu cầu mục 5).
  document.getElementById('leaderboard-btn')?.addEventListener('click', ()=>{
    openGpcardPanel('leaderboard');
  });
  document.getElementById('set-btn-leaderboard')?.addEventListener('click', ()=>{
    document.getElementById('settings-panel')?.classList.remove('show');
    openGpcardPanel('leaderboard');
  });
}

document.addEventListener('DOMContentLoaded', initGpcardPanel);
