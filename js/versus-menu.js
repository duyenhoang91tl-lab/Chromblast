// ═══════════════════════════════════════════════════════════════
// js/versus-menu.js — Màn hình menu chính khi vào chế độ Versus
// (6 ô icon KHÔNG chữ: Xếp hạng / Bạn bè / Chroma Blast / Điểm danh /
// Caro / Chọn nền, và 6 nút lớn: Chơi nhanh / Chơi với bạn / Vào phòng /
// Đấu hạng / Giải đấu / Đấu với máy). Cùng khuôn mẫu js/caro-menu.js.
//
// GHI CHÚ VỀ 3 MỤC CHƯA CÓ HỆ THỐNG RIÊNG CHO VERSUS (dùng phương án tạm):
//  - Điểm danh: chưa có hệ thống điểm danh riêng cho Versus (chỉ Caro có).
//    Nút hiện disable + báo "sắp ra mắt" thay vì dùng nhầm điểm danh của Caro.
//  - Đấu hạng: chưa có hàng đợi ghép trận theo hạng RIÊNG (tách khỏi Chơi
//    nhanh) — tạm dùng chung luồng Tìm đối thủ như Chơi nhanh.
//  - Giải đấu: chưa có hệ thống giải đấu cho Versus (chỉ Caro có). Nút hiện
//    disable + báo "sắp ra mắt".
// ═══════════════════════════════════════════════════════════════

function openVersusMenu(){
  try{ sfxClick(); }catch(e){}
  document.getElementById('versus-menu-panel')?.classList.add('show');
}
function closeVersusMenu(){
  document.getElementById('versus-menu-panel')?.classList.remove('show');
}
window.openVersusMenu = openVersusMenu;
window.closeVersusMenu = closeVersusMenu;

function _versusMenuOpenLeaderboard(){
  document.getElementById('leaderboard-btn')?.click();
  setTimeout(()=>{
    document.querySelector('.lb-tab[data-lb-mode="global-versus"]')?.click();
  }, 150);
}

function _versusMenuOpenOnlineThen(btnId){
  if(typeof openOnlineHub === 'function') openOnlineHub();
  setTimeout(()=> document.getElementById(btnId)?.click(), 150);
}

function _versusMenuComingSoon(){
  try{ sfxClick(); }catch(e){}
  try{ showComboFlash(0, false, (typeof t==='function' ? t('comingSoon') : 'Sắp ra mắt — đang phát triển!')); }catch(e){}
}

function initVersusMenu(){
  const panel = document.getElementById('versus-menu-panel');
  if(!panel) return;

  document.getElementById('versus-menu-back-btn')?.addEventListener('click', closeVersusMenu);

  document.getElementById('versus-menu-rank-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    _versusMenuOpenLeaderboard();
  });

  document.getElementById('versus-menu-friends-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    if(typeof window.openFriendsPanel === 'function') window.openFriendsPanel();
  });

  document.getElementById('versus-menu-chroma-btn')?.addEventListener('click', ()=>{
    closeVersusMenu();
  });

  document.getElementById('versus-menu-daily-btn')?.addEventListener('click', _versusMenuComingSoon);

  document.getElementById('versus-menu-caro-btn')?.addEventListener('click', ()=>{
    closeVersusMenu();
    if(typeof window.openCaroMenu === 'function') window.openCaroMenu();
  });

  document.getElementById('versus-menu-skin-btn')?.addEventListener('click', ()=>{
    if(typeof openVersusSetup === 'function') openVersusSetup();
  });

  document.getElementById('versus-menu-quick-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    closeVersusMenu();
    _versusMenuOpenOnlineThen('online-find-btn');
  });

  document.getElementById('versus-menu-withfriend-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    closeVersusMenu();
    _versusMenuOpenOnlineThen('online-create-btn');
  });

  document.getElementById('versus-menu-join-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    closeVersusMenu();
    if(typeof openOnlineHub === 'function') openOnlineHub();
    setTimeout(()=> document.getElementById('online-join-code')?.focus(), 150);
  });

  // Chưa có hàng đợi ghép trận theo hạng riêng — tạm dùng chung luồng Tìm đối
  // thủ (xem ghi chú đầu file).
  document.getElementById('versus-menu-ranked-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    closeVersusMenu();
    _versusMenuOpenOnlineThen('online-find-btn');
  });

  document.getElementById('versus-menu-tour-btn')?.addEventListener('click', _versusMenuComingSoon);

  document.getElementById('versus-menu-ai-btn')?.addEventListener('click', ()=>{
    closeVersusMenu();
    if(typeof openVersusSetup === 'function') openVersusSetup();
  });

  panel.addEventListener('click', (e)=>{ if(e.target === panel) closeVersusMenu(); });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initVersusMenu);
} else initVersusMenu();
