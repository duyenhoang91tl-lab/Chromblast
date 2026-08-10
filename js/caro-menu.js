// ═══════════════════════════════════════════════════════════════
// js/caro-menu.js — Màn hình menu chính khi vào chế độ Caro
// (6 ô icon: Xếp hạng / Bạn bè / Đổi trò chơi / Điểm danh / Xem QC /
// Chọn nền, và 5 nút lớn: Chơi nhanh / Chơi với bạn / Chọn bàn /
// Xếp hạng / Giải đấu). Nạp eager (không lazy) nên KHÔNG phụ thuộc
// js/caro.js lúc mở màn hình — chỉ gọi ensureCaroLoaded() khi cần
// hành động sâu (đấu AI, tạo phòng, tìm đối thủ...).
// ═══════════════════════════════════════════════════════════════

function openCaroMenu(){
  try{ sfxClick(); }catch(e){}
  document.getElementById('caro-menu-panel')?.classList.add('show');
}
function closeCaroMenu(){
  document.getElementById('caro-menu-panel')?.classList.remove('show');
}
window.openCaroMenu = openCaroMenu;
window.closeCaroMenu = closeCaroMenu;

function _caroMenuAfterLoad(fn){
  if(typeof window.ensureCaroLoaded === 'function'){
    window.ensureCaroLoaded().then(fn).catch(function(e){ console.error('[caro-menu]', e); });
  } else fn();
}

function initCaroMenu(){
  const panel = document.getElementById('caro-menu-panel');
  if(!panel) return;

  document.getElementById('caro-menu-back-btn')?.addEventListener('click', closeCaroMenu);

  document.getElementById('caro-menu-rank-btn')?.addEventListener('click', ()=>{
    document.getElementById('caro-rank-btn')?.click();
  });
  document.getElementById('caro-menu-rankbtn2')?.addEventListener('click', ()=>{
    _caroMenuAfterLoad(()=>{
      const locked = (typeof canPlayCaro === 'function') && !canPlayCaro();
      const onlineOn = typeof isOnlineServicesEnabled === 'function' && isOnlineServicesEnabled();
      if(locked || !onlineOn || typeof caroFindOpponent !== 'function'){
        try{ showComboFlash(0, false, (typeof t==='function'?t('caroRankNeedsOnline'):null) || 'Cần bật Online để đấu xếp hạng'); }catch(e){}
        return;
      }
      if(typeof openCaroHub === 'function') openCaroHub();
      setTimeout(()=>{ document.getElementById('caro-find-btn')?.click(); }, 150);
    });
  });

  document.getElementById('caro-menu-friends-btn')?.addEventListener('click', ()=>{
    if(typeof window.openFriendsPanel === 'function') window.openFriendsPanel();
  });

  document.getElementById('caro-menu-switch-chroma')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    closeCaroMenu();
  });
  document.getElementById('caro-menu-switch-versus')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    if(typeof window.openVersusSetup === 'function') window.openVersusSetup();
  });

  document.getElementById('caro-menu-ads-btn')?.addEventListener('click', ()=>{
    if(typeof window.showRewardedAd !== 'function') return;
    window.showRewardedAd(function(){
      if(typeof grantGold === 'function') grantGold(1, 'Xem quảng cáo');
      if(typeof showComboFlash === 'function') showComboFlash(0, false, '🪙 +1 vàng — cảm ơn bạn đã xem quảng cáo!');
    }, function(){
      if(typeof showComboFlash === 'function') showComboFlash(0, false, 'Không có quảng cáo lúc này, thử lại sau nhé.');
    });
  });

  document.getElementById('caro-menu-skin-btn')?.addEventListener('click', ()=>{
    _caroMenuAfterLoad(()=> document.getElementById('caro-hub-skin-btn')?.click());
  });

  document.getElementById('caro-menu-quick-btn')?.addEventListener('click', ()=>{
    _caroMenuAfterLoad(()=>{
      if(typeof openCaroHub === 'function') openCaroHub();
      setTimeout(()=>{
        const locked = (typeof canPlayCaro === 'function') && !canPlayCaro();
        const onlineOn = typeof isOnlineServicesEnabled === 'function' && isOnlineServicesEnabled();
        if(!locked && onlineOn && typeof caroFindOpponent === 'function'){
          document.getElementById('caro-find-btn')?.click();
        } else if(typeof caroStartAI === 'function'){
          caroStartAI('extreme');
        }
      }, 150);
    });
  });

  document.getElementById('caro-menu-withfriend-btn')?.addEventListener('click', ()=>{
    _caroMenuAfterLoad(()=>{
      if(typeof openCaroHub === 'function') openCaroHub();
      setTimeout(()=> document.getElementById('caro-create-btn')?.click(), 150);
    });
  });

  document.getElementById('caro-menu-table-btn')?.addEventListener('click', ()=>{
    _caroMenuAfterLoad(()=>{ if(typeof openCaroRoomBrowser === 'function') openCaroRoomBrowser(); });
  });

  document.getElementById('caro-menu-daily-btn')?.addEventListener('click', ()=>{
    if(typeof window.openCaroDailyPanel === 'function') window.openCaroDailyPanel();
  });

  document.getElementById('caro-menu-tour-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    document.getElementById('caro-tour-panel')?.classList.add('show');
  });
  document.getElementById('caro-tour-close-btn')?.addEventListener('click', ()=>{
    document.getElementById('caro-tour-panel')?.classList.remove('show');
  });

  panel.addEventListener('click', (e)=>{
    if(e.target === panel) closeCaroMenu();
  });

  if(typeof window.updateCaroDailyBadge === 'function') window.updateCaroDailyBadge();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initCaroMenu);
} else initCaroMenu();
