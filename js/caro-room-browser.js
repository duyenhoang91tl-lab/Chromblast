/* ══════════════════════════════════════════
   PHÒNG (caro-room-browser) — màn toàn màn hình xem/vào danh sách phòng
   Caro online. KHÔNG viết lại logic vào phòng/làm chủ phòng — tái dùng đúng
   caroJoinRoomById()/_caroOpenLobby() đã có ở js/caro.js. Chỉ phần GIAO DIỆN
   hiển thị đổi thành lưới ô vuông (_crbRenderRoomGrid/_crbRoomTileHtml) thay
   vì danh sách hàng ngang — KHÔNG đổi hàm dùng chung _caroRenderRoomListTo
   (đang được Caro Hub/Lobby cũ tái sử dụng, đổi ở đó sẽ ảnh hưởng cả 2 màn đó).
   Số tiền cược mỗi phòng (nếu có đặt cược) vẽ theo đúng field wagerAmount có
   sẵn trên mỗi phòng, không tính lại.
   Bộ lọc 3 tab dựa đúng theo field guestId/status thật của phòng:
   - Tất cả: mọi phòng đang mở lấy được từ listenOpenCaroRooms
   - Còn trống: guestId trống (chưa ai vào)
   - Chưa bắt đầu: status vẫn là 'open' (chưa chuyển sang ready/playing) —
     KHÔNG bịa thêm trạng thái nào ngoài các trạng thái đã có trong code.
══════════════════════════════════════════ */

let _crbTab = 'all';

function _crbFilterRooms(rooms){
  const list = rooms || [];
  if(_crbTab === 'open') return list.filter(r => !r.guestId);
  if(_crbTab === 'notstarted') return list.filter(r => r.status === 'open');
  return list;
}

function _crbRoomTileHtml(r, uid){
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
    + '<div class="crb-tile-icon">⭕❌</div>'
    + '<div class="crb-tile-name">'+name+'</div>'
    + '<div class="crb-tile-sub">'+turn+(r.code ? ' · '+escapeHtml(r.code) : '')+'</div>'
    + '</button>';
}

function _crbRenderRoomGrid(listId, emptyId, rooms){
  const list = document.getElementById(listId);
  const empty = emptyId ? document.getElementById(emptyId) : null;
  if(!list) return;
  if(empty) empty.style.display = rooms.length ? 'none' : 'block';
  if(!rooms.length){ list.innerHTML = ''; return; }
  const uid = typeof getOnlineUid === 'function' ? getOnlineUid() : null;
  list.innerHTML = rooms.map(r => _crbRoomTileHtml(r, uid)).join('');
  // Vào phòng/về đúng phòng của mình — tái dùng đúng logic đã có (không viết
  // lại), giống hệt nhánh xử lý bên trong _caroRenderRoomListTo (js/caro.js).
  list.querySelectorAll('.crb-tile').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const rid = btn.dataset.room;
      if(!rid) return;
      const room = rooms.find(r => r.roomId === rid);
      if(!room) return;
      if(uid && room.hostId === uid){
        if(_caroLobby && _caroLobby.roomId === rid) return;
        _caroOpenLobby(rid, room.code, 'host', room);
        return;
      }
      caroJoinRoomById(rid);
    });
  });
}

function renderCrbRoomList(){
  const rooms = _crbFilterRooms(typeof _caroLastOpenRooms !== 'undefined' ? _caroLastOpenRooms : []);
  _crbRenderRoomGrid('crb-room-list', 'crb-room-list-empty', rooms);
}

// Bấm vào 1 phòng bất kỳ trong danh sách sẽ dẫn sang phòng chờ/trận đấu (panel
// khác, z-index thấp hơn màn "Phòng" này) — đóng màn "Phòng" TRƯỚC khi hành vi
// bấm gốc (đã gắn sẵn bởi _caroRenderRoomListTo) chạy, dùng capture phase nên
// không cần đụng/viết lại logic vào phòng gốc ở js/caro.js.
(function _crbCloseOnRoomRowTap(){
  document.getElementById('crb-room-list')?.addEventListener('click', e=>{
    if(e.target.closest('.crb-tile')) closeCaroRoomBrowser();
  }, true);
})();

function renderCrbTopbar(){
  const avEl = document.getElementById('crb-avatar');
  if(avEl && typeof applyAvatarElement === 'function'){
    applyAvatarElement(avEl, typeof getPlayerAvatarDisplay === 'function' ? getPlayerAvatarDisplay() : null);
  }
  const heartsEl = document.getElementById('crb-hearts');
  if(heartsEl){
    const h = (typeof inv !== 'undefined' && inv) ? inv.hearts : 0;
    heartsEl.textContent = (typeof formatHearts === 'function') ? formatHearts(h) : Math.round(h||0);
  }
  const goldEl = document.getElementById('crb-gold');
  if(goldEl) goldEl.textContent = ((typeof inv !== 'undefined' && inv) ? Math.floor(inv.gold||0) : 0).toLocaleString();
}

let _crbHookInstalled = false;
function _crbInstallRoomListHook(){
  if(_crbHookInstalled) return;
  if(typeof _caroRenderOpenRoomLists !== 'function') return;
  _crbHookInstalled = true;
  const orig = _caroRenderOpenRoomLists;
  window._caroRenderOpenRoomLists = function(rooms){
    orig.apply(this, arguments);
    try{
      if(document.getElementById('caro-room-browser')?.classList.contains('show')) renderCrbRoomList();
    }catch(e){}
  };
}

function openCaroRoomBrowser(){
  try{ sfxClick(); }catch(e){}
  // Chỉ gắn hook vào _caroRenderOpenRoomLists LÚC NÀY (không phải lúc file này
  // vừa nạp) — vì js/caro.js được nạp trễ (lazy-load), còn màn "Phòng" này chỉ
  // mở được SAU KHI Caro đã nạp xong nên _caroRenderOpenRoomLists chắc chắn đã
  // tồn tại ở đây. Gắn hook sớm hơn (lúc file vừa nạp) sẽ luôn thất bại vì hàm
  // gốc chưa có, hoặc tệ hơn là ép nạp caro.js sớm cho MỌI người chơi kể cả ai
  // chưa từng mở Caro.
  _crbInstallRoomListHook();
  // Bộ lắng nghe danh sách phòng (_caroStartRoomListListen) trước đây chỉ được
  // bật bên trong openCaroHub() — giờ "Chọn phòng" ở Caro Menu vào thẳng màn
  // này, bỏ qua Caro Hub cũ hẳn (không còn hiện rồi ẩn ngay nữa), gọi thẳng
  // _caroHubSetup() (phần thiết lập tách riêng khỏi openCaroHub(), xem
  // js/caro.js) để chạy đúng phần thiết lập/bật lắng nghe đó.
  if(typeof _caroHubSetup === 'function') _caroHubSetup();
  renderCrbTopbar();
  renderCrbRoomList();
  document.getElementById('caro-room-browser')?.classList.add('show');
}
function closeCaroRoomBrowser(){
  document.getElementById('caro-room-browser')?.classList.remove('show');
}

(function initCaroRoomBrowser(){
  function bind(){
    document.getElementById('caro-open-room-browser-btn')?.addEventListener('click', openCaroRoomBrowser);
    document.getElementById('crb-exit-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeCaroRoomBrowser();
    });

    document.getElementById('crb-chat-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeCaroRoomBrowser();
      if(typeof openChatPanel === 'function') openChatPanel();
    });
    document.getElementById('crb-settings-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeCaroRoomBrowser();
      if(typeof openCaroSettings === 'function') openCaroSettings(false);
    });

    document.getElementById('crb-find-btn')?.addEventListener('click', ()=>{
      closeCaroRoomBrowser();
      if(typeof caroFindOpponent === 'function') caroFindOpponent();
    });
    document.getElementById('crb-create-btn')?.addEventListener('click', ()=>{
      closeCaroRoomBrowser();
      if(typeof caroCreateRoom === 'function') caroCreateRoom();
    });

    document.querySelectorAll('.crb-tab').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        _crbTab = btn.dataset.crbTab || 'all';
        document.querySelectorAll('.crb-tab').forEach(b=> b.classList.toggle('active', b===btn));
        renderCrbRoomList();
      });
    });

    document.getElementById('crb-vs-ai-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeCaroRoomBrowser();
      if(typeof window.caroStartAI === 'function') window.caroStartAI('extreme');
    });
    document.getElementById('crb-friends-btn')?.addEventListener('click', ()=>{
      closeCaroRoomBrowser();
      if(typeof openFriendsPanel === 'function') openFriendsPanel();
    });
    document.getElementById('crb-rank-btn')?.addEventListener('click', ()=>{
      closeCaroRoomBrowser();
      document.getElementById('caro-rank-btn')?.click();
    });
    document.getElementById('crb-watch-ad-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      if(typeof watchAdForHeart === 'function') watchAdForHeart();
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
