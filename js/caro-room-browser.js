/* ══════════════════════════════════════════
   PHÒNG (caro-room-browser) — màn toàn màn hình xem/vào danh sách phòng
   Caro online. KHÔNG viết lại logic phòng — chỉ dựng thêm 1 lớp giao diện
   toàn màn hình, dùng lại đúng dữ liệu/hàm đã có ở js/caro.js:
   _caroLastOpenRooms, _caroRenderRoomListTo(), caroCreateRoom(),
   caroFindOpponent(), listenOpenCaroRooms(). Số tiền cược mỗi phòng (nếu có
   đặt cược) tự hiện theo — _caroRenderRoomListTo đã tự vẽ badge 🪙 wagerAmount
   sẵn, không cần thêm gì ở đây; chỉ chỉnh lại màu badge cho hợp nền sáng.
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

function renderCrbRoomList(){
  const rooms = _crbFilterRooms(typeof _caroLastOpenRooms !== 'undefined' ? _caroLastOpenRooms : []);
  if(typeof _caroRenderRoomListTo === 'function'){
    _caroRenderRoomListTo('crb-room-list', 'crb-room-list-empty', rooms);
  }
}

// Bấm vào 1 phòng bất kỳ trong danh sách sẽ dẫn sang phòng chờ/trận đấu (panel
// khác, z-index thấp hơn màn "Phòng" này) — đóng màn "Phòng" TRƯỚC khi hành vi
// bấm gốc (đã gắn sẵn bởi _caroRenderRoomListTo) chạy, dùng capture phase nên
// không cần đụng/viết lại logic vào phòng gốc ở js/caro.js.
(function _crbCloseOnRoomRowTap(){
  document.getElementById('crb-room-list')?.addEventListener('click', e=>{
    if(e.target.closest('.caro-room-row')) closeCaroRoomBrowser();
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
      if(typeof window.caroStartAI === 'function') window.caroStartAI('medium');
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
