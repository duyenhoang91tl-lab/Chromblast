/* ══════════════════════════════════════════
   PHÒNG VERSUS (versus-room-browser) — màn toàn màn hình xem/vào danh sách
   phòng Đấu 1-1 (Versus) online, theo đúng khuôn mẫu js/caro-room-browser.js.
   - Tái dùng 100% class CSS .crb-* đã có trong css/main.css (không viết CSS trùng).
   - KHÔNG viết lại logic vào phòng/làm chủ phòng — dùng lại nguyên vẹn các hàm
     của online-ui.js/online-services.js: onSwitchToRoom() (host → openOnlineLobby,
     guest → joinOnlineRoomById), onFindOpponent(), onCreateRoom().
   - Bộ lọc 3 tab dựa đúng theo field guestId/status thật của phòng (giống Caro):
       Tất cả          → mọi phòng đang mở (listenOpenVersusRooms)
       Còn trống       → guestId trống (chưa ai vào)
       Chưa bắt đầu    → status vẫn là 'open'
   - Danh sách phòng lấy từ _onlineLastOpenRooms (đã được online-ui.js cập nhật
     qua listenOpenVersusRooms) — hook vào _onlineRenderOpenRoomLists để lưới
     này cập nhật theo thời gian thực y hệt màn Caro.
   Nạp SAU online-ui.js + versus.js (các hàm trên đã tồn tại khi file này chạy).
══════════════════════════════════════════ */

let _vsbTab = 'all';

function _vsbFilterRooms(rooms){
  const list = rooms || [];
  if(_vsbTab === 'open') return list.filter(r => !r.guestId);
  if(_vsbTab === 'notstarted') return list.filter(r => r.status === 'open');
  return list;
}

function _vsbRoomTileHtml(r, uid){
  const mine = uid && r.hostId === uid;
  const name = escapeHtml(r.hostName || 'Host');
  const full = !!r.guestId;
  const turn = r.turnSec === 10 ? '10s' : '15s';
  const wagerBadge = (Number(r.wagerAmount) > 0 && r.wagerCurrency === 'gold')
    ? '<span class="crb-tile-badge">🪙 '+r.wagerAmount+'</span>' : '';
  const stateBadge = mine
    ? '<span class="crb-tile-mine-badge">'+escapeHtml(t('caroRoomMine'))+'</span>'
    : (full ? '<span class="crb-tile-lock">🔒</span>' : '');
  return '<button type="button" class="crb-tile'+(mine?' mine':'')+'" data-room="'+r.roomId+'">'
    + wagerBadge + stateBadge
    + '<div class="crb-tile-icon">⚔️</div>'
    + '<div class="crb-tile-name">'+name+'</div>'
    + '<div class="crb-tile-sub">'+turn+(r.code ? ' · '+escapeHtml(r.code) : '')+'</div>'
    + '</button>';
}

function _vsbRenderRoomGrid(listId, emptyId, rooms){
  const list = document.getElementById(listId);
  const empty = emptyId ? document.getElementById(emptyId) : null;
  if(!list) return;
  if(empty) empty.style.display = rooms.length ? 'none' : 'block';
  if(!rooms.length){ list.innerHTML = ''; return; }
  const uid = typeof getOnlineUid === 'function' ? getOnlineUid() : null;
  list.innerHTML = rooms.map(r => _vsbRoomTileHtml(r, uid)).join('');
  // Vào phòng/về đúng phòng của mình — tái dùng nguyên logic online-ui.js
  // (onSwitchToRoom: host → openOnlineLobby, guest → joinOnlineRoomById).
  list.querySelectorAll('.crb-tile').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      closeVersusRoomBrowser();
      const rid = btn.dataset.room;
      if(!rid) return;
      const room = rooms.find(r => r.roomId === rid);
      if(!room) return;
      if(typeof onSwitchToRoom === 'function') onSwitchToRoom(room);
    });
  });
}

function renderVsbRoomList(){
  const rooms = _vsbFilterRooms(typeof _onlineLastOpenRooms !== 'undefined' ? _onlineLastOpenRooms : []);
  _vsbRenderRoomGrid('vsb-room-list', 'vsb-room-list-empty', rooms);
}

function renderVsbTopbar(){
  const avEl = document.getElementById('vsb-avatar');
  if(avEl && typeof applyAvatarElement === 'function'){
    applyAvatarElement(avEl, typeof getPlayerAvatarDisplay === 'function' ? getPlayerAvatarDisplay() : null);
  }
  const heartsEl = document.getElementById('vsb-hearts');
  if(heartsEl){
    const h = (typeof inv !== 'undefined' && inv) ? inv.hearts : 0;
    heartsEl.textContent = (typeof formatHearts === 'function') ? formatHearts(h) : Math.round(h||0);
  }
  const goldEl = document.getElementById('vsb-gold');
  if(goldEl) goldEl.textContent = ((typeof inv !== 'undefined' && inv) ? Math.floor(inv.gold||0) : 0).toLocaleString();
}

let _vsbHookInstalled = false;
function _vsbInstallRoomListHook(){
  if(_vsbHookInstalled) return;
  if(typeof _onlineRenderOpenRoomLists !== 'function') return;
  _vsbHookInstalled = true;
  const orig = _onlineRenderOpenRoomLists;
  window._onlineRenderOpenRoomLists = function(rooms){
    orig.apply(this, arguments);
    try{
      if(document.getElementById('versus-room-browser')?.classList.contains('show')) renderVsbRoomList();
    }catch(e){}
  };
}

function openVersusRoomBrowser(){
  try{ sfxClick(); }catch(e){}
  if(typeof canHostVersus === 'function' && !canHostVersus()){
    try{ showComboFlash(0, false, t('vsNeedLevel', VERSUS_MIN_LEVEL)); }catch(e){}
    return;
  }
  try{ if(typeof unlockOrientation === 'function') unlockOrientation(); }catch(e){}
  // Hook cập nhật lưới phòng theo thời gian thực (chỉ gắn khi mở — giống Caro).
  _vsbInstallRoomListHook();
  // Bật lắng nghe danh sách phòng (giống openOnlineHub) nếu chưa bật.
  if(typeof _onlineRequireEnabled === 'function'){
    _onlineRequireEnabled().then(ok => {
      if(ok && typeof _onlineStartRoomListListen === 'function') _onlineStartRoomListListen();
    }).catch(()=>{});
  }
  renderVsbTopbar();
  renderVsbRoomList();
  document.getElementById('versus-room-browser')?.classList.add('show');
}
function closeVersusRoomBrowser(){
  document.getElementById('versus-room-browser')?.classList.remove('show');
}
window.openVersusRoomBrowser = openVersusRoomBrowser;
window.closeVersusRoomBrowser = closeVersusRoomBrowser;

(function initVersusRoomBrowser(){
  function bind(){
    document.getElementById('vsb-exit-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeVersusRoomBrowser();
    });

    document.getElementById('vsb-chat-btn')?.addEventListener('click', ()=>{
      closeVersusRoomBrowser();
      if(typeof openChatPanel === 'function') openChatPanel();
    });
    document.getElementById('vsb-settings-btn')?.addEventListener('click', ()=>{
      closeVersusRoomBrowser();
      if(typeof openVersusSetup === 'function') openVersusSetup();
    });

    document.getElementById('vsb-find-btn')?.addEventListener('click', ()=>{
      closeVersusRoomBrowser();
      if(typeof onFindOpponent === 'function') onFindOpponent();
    });
    document.getElementById('vsb-create-btn')?.addEventListener('click', ()=>{
      closeVersusRoomBrowser();
      if(typeof onCreateRoom === 'function') onCreateRoom();
    });

    document.querySelectorAll('#versus-room-browser .crb-tab').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        _vsbTab = btn.dataset.crbTab || 'all';
        document.querySelectorAll('#versus-room-browser .crb-tab').forEach(b=> b.classList.toggle('active', b===btn));
        renderVsbRoomList();
      });
    });

    document.getElementById('vsb-ai-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeVersusRoomBrowser();
      if(typeof openVersusSetup === 'function') openVersusSetup();
    });
    document.getElementById('vsb-friends-btn')?.addEventListener('click', ()=>{
      closeVersusRoomBrowser();
      if(typeof openFriendsPanel === 'function') openFriendsPanel();
    });
    document.getElementById('vsb-leaderboard-btn')?.addEventListener('click', ()=>{
      closeVersusRoomBrowser();
      document.getElementById('leaderboard-btn')?.click();
      setTimeout(()=> document.querySelector('.lb-tab[data-lb-mode="global-versus"]')?.click(), 150);
    });
    document.getElementById('vsb-watch-ad-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      if(typeof watchAdForHeart === 'function') watchAdForHeart();
    });

    const panel = document.getElementById('versus-room-browser');
    if(panel) panel.addEventListener('click', (e)=>{ if(e.target === panel) closeVersusRoomBrowser(); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

