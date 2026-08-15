// ═══════════════════════════════════════════════════════════════
// js/online-ui.js — Giao diện phòng / matchmaking / lobby online
// Nạp SAU online-services.js và versus.js
// ═══════════════════════════════════════════════════════════════

let _onlineLobby = null; // { roomId, code, role:'host'|'guest', roomData }
let _onlineLastOpenRooms = [];
let _wagerOn = false;
const _wagerCurrency = 'gold'; // Cược chỉ dùng vàng — vàng/kim cương không liên quan nhau.
let _wagerAmount = 0;
const WAGER_PRESETS = [5, 10, 15, 20, 30];

function _onlineShow(id){ const el=document.getElementById(id); if(el) el.classList.add('show'); }
function _onlineHide(id){ const el=document.getElementById(id); if(el) el.classList.remove('show'); }

function _onlineStatus(msg, isErr){
  const el=document.getElementById('online-status');
  if(!el) return;
  el.textContent=msg||'';
  el.className='online-status'+(isErr?' err':'');
}

async function _onlineRequireEnabled(){
  if(!isOnlineServicesEnabled()){
    _onlineStatus(typeof t==='function'?t('onlineDisabled'):'Chưa cấu hình Firebase', true);
    return false;
  }
  try{
    await ensureOnlineAuth();
    _onlineStatus((typeof t==='function'?t('caroConnected', getOnlineDisplayName()):null) || ('Đã kết nối · '+getOnlineDisplayName()));
    return true;
  }catch(e){
    const msg = (typeof friendlyOnlineAuthError==='function' ? friendlyOnlineAuthError(e) : null) || e.message;
    _onlineStatus(msg || 'Không kết nối được server', true);
    return false;
  }
}

let _onlineRoomListenWanted = false;

function _onlineStartRoomListListen(){
  _onlineRoomListenWanted = true;
  // Tab/app đang ở nền: khoan nghe, đợi quay lại mới bật (đỡ tốn đọc Firestore
  // trong lúc người chơi khoá máy/chuyển app mà vẫn còn đứng ở sảnh/lobby).
  if(document.hidden) return;
  if(typeof listenOpenVersusRooms !== 'function') return;
  listenOpenVersusRooms(_onlineRenderOpenRoomLists);
}
function _onlineStopRoomListListen(){
  _onlineRoomListenWanted = false;
  if(typeof stopListeningOpenVersusRooms === 'function') stopListeningOpenVersusRooms();
}
document.addEventListener('visibilitychange', ()=>{
  if(!_onlineRoomListenWanted) return;
  if(document.hidden){
    if(typeof stopListeningOpenVersusRooms === 'function') stopListeningOpenVersusRooms();
  }else{
    _onlineStartRoomListListen();
  }
});

function _onlineRenderOpenRoomLists(rooms){
  _onlineLastOpenRooms = rooms || [];
  const open = _onlineLastOpenRooms.filter(r => r.status === 'open' && !r.guestId);
  const countEl = document.getElementById('online-room-list-count');
  if(countEl) countEl.textContent = open.length ? '(' + open.length + ')' : '';
  _onlineRenderRoomListTo('online-room-list', 'online-room-list-empty', open);
  _onlineRenderRoomListTo('online-lobby-room-list', null, open);
  if(_onlineLobby){
    const idx = open.findIndex(r => r.roomId === _onlineLobby.roomId);
    const noEl = document.getElementById('online-lobby-room-no');
    if(noEl){
      noEl.textContent = idx >= 0
        ? '· ' + (typeof t==='function'?t('onlineRoomNo', idx+1):('Phòng '+(idx+1)))
        : (_onlineLobby.code ? '· '+_onlineLobby.code : '');
    }
  }
}

function _onlineRenderRoomListTo(listId, emptyId, rooms){
  const list = document.getElementById(listId);
  const empty = emptyId ? document.getElementById(emptyId) : null;
  if(!list) return;
  const uid = typeof getOnlineUid === 'function' ? getOnlineUid() : null;
  const hereId = _onlineLobby && _onlineLobby.roomId;
  if(empty) empty.style.display = rooms.length ? 'none' : 'block';
  if(!rooms.length){ list.innerHTML = ''; return; }
  list.innerHTML = rooms.map((r, i) => {
    const no = i + 1;
    const mine = uid && r.hostId === uid;
    const here = hereId && r.roomId === hereId;
    const name = escapeHtml(r.hostName || 'Host');
    const wagerBadge = (Number(r.wagerAmount) > 0 && (r.wagerCurrency === 'gold' || r.wagerCurrency === 'diamond'))
      ? ' <span class="online-room-wager-badge">'+(r.wagerCurrency==='gold'?'🪙':'💎')+' '+r.wagerAmount+'</span>'
      : '';
    const joinLabel = here
      ? (typeof t==='function'?t('onlineRoomHere'):'Đang ở')
      : (mine ? (typeof t==='function'?t('caroRoomMine'):'Của bạn') : (typeof t==='function'?t('caroRoomJoin'):'Vào'));
    return '<button type="button" class="caro-room-row'+(mine||here?' mine':'')+'" data-room="'+r.roomId+'">'+
      '<span class="caro-room-no">#'+no+'</span>'+
      '<span class="caro-room-info"><b>'+name+wagerBadge+(here?' <span class="online-you-here">'+(typeof t==='function'?t('onlineYouHere'):'Bạn')+'</span>':'')+'</b>'+
      '<small>'+(r.code ? escapeHtml(r.code) : '')+'</small></span>'+
      '<span class="caro-room-action">'+joinLabel+'</span></button>';
  }).join('');
  list.querySelectorAll('.caro-room-row').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const rid = btn.dataset.room;
      if(!rid) return;
      const room = rooms.find(x => x.roomId === rid);
      if(!room) return;
      if(hereId && hereId === rid) return; // đã ở phòng này
      onSwitchToRoom(room);
    });
  });
}

async function onSwitchToRoom(room){
  if(!await _onlineRequireEnabled()) return;
  const uid = getOnlineUid();
  try{
    // Rời phòng hiện tại trước khi vào phòng khác
    if(_onlineLobby && _onlineLobby.roomId && _onlineLobby.roomId !== room.roomId){
      const prev = _onlineLobby.roomId;
      stopListeningRoom();
      _onlineLobby = null;
      await leaveOnlineRoom(prev);
    }
    if(uid && room.hostId === uid){
      openOnlineLobby(room.roomId, room.code, 'host', room);
      return;
    }
    const data = await joinOnlineRoomById(room.roomId, { gameType: 'versus' });
    openOnlineLobby(data.roomId, data.code, 'guest', data);
    _onlineStatus(t('onlineJoined'));
  }catch(e){
    const msg = e.message==='room_not_found' ? t('onlineRoomNotFound')
      : e.message==='room_full' ? (typeof t==='function'?t('caroRoomFull'):e.message)
      : e.message==='room_not_open' ? (typeof t==='function'?t('caroRoomNotOpen'):e.message)
      : e.message==='already_hosting' ? t('onlineAlreadyHosting')
      : e.message;
    _onlineStatus(msg, true);
  }
}

function openOnlineHub(){
  try{ sfxClick(); }catch(e){}
  if(!canHostVersus()){
    try{ showComboFlash(0,false,t('vsNeedLevel', VERSUS_MIN_LEVEL)); }catch(e){}
    return;
  }
  try{ if(typeof unlockOrientation==='function') unlockOrientation(); }catch(e){}
  _onlineHide('versus-setup-panel');
  _onlineShow('online-hub-panel');
  const on = isOnlineServicesEnabled();
  document.getElementById('online-disabled-note').style.display = on ? 'none' : 'block';
  if(on){
    _onlineRequireEnabled().then(ok => { if(ok) _onlineStartRoomListListen(); });
    if(typeof fetchMyVersusStats === 'function') fetchMyVersusStats().catch(()=>{});
  }
}

function closeOnlineHub(){
  try{ if(typeof lockPortraitOrientation==='function') lockPortraitOrientation(); }catch(e){}
  cancelMatchmaking();
  _onlineStopRoomListListen();
  if(_onlineLobby) leaveOnlineRoom(_onlineLobby.roomId).catch(()=>{});
  _onlineLobby=null;
  stopListeningRoom();
  _onlineHide('online-hub-panel');
  _onlineHide('online-lobby-panel');
  _onlineHide('online-matchmaking-panel');
}

function openOnlineLobby(roomId, code, role, roomData){
  _onlineLobby={ roomId, code, role, roomData };
  _onlineHide('online-hub-panel');
  _onlineHide('online-matchmaking-panel');
  _onlineShow('online-lobby-panel');
  document.getElementById('online-room-code').textContent=code;
  _renderLobby(roomData);
  _onlineStartRoomListListen();

  listenOnlineRoom(roomId, ev => {
    if(ev.type==='deleted'){
      // Phòng bị xóa → về hub, vẫn xem danh sách phòng khác
      try{ if(typeof sfxRoomLeave==='function') sfxRoomLeave(); }catch(e){}
      stopListeningRoom();
      _onlineLobby=null;
      _onlineHide('online-lobby-panel');
      _onlineShow('online-hub-panel');
      _onlineStartRoomListListen();
      return;
    }
    const d=ev.data;
    const myUid = typeof getOnlineUid === 'function' ? getOnlineUid() : null;
    if(_onlineLobby && _onlineLobby.role === 'guest' && myUid && d.kickedGuestId === myUid){
      stopListeningRoom();
      _onlineLobby=null;
      _onlineHide('online-lobby-panel');
      _onlineShow('online-hub-panel');
      _onlineStartRoomListListen();
      try{ _onlineStatus(t('roomKickedMsg', d.hostName || '?')); }catch(e){}
      return;
    }
    const prevGuestId = _onlineLobby && _onlineLobby.roomData ? _onlineLobby.roomData.guestId : null;
    // Chủ phòng cũ rời phòng chờ, mình (đang là khách) được tự động thăng làm chủ phòng
    // mới (xem leaveOnlineRoom) — cập nhật lại role + báo cho mình biết.
    const becameHost = _onlineLobby && _onlineLobby.role === 'guest' && myUid && d.hostId === myUid;
    _onlineLobby.roomData=d;
    _renderLobby(d);
    // Tiếng báo có người vào/rời phòng chờ — chỉ khi còn ở sảnh (chưa vào trận); lúc đang
    // chơi thì có tiếng riêng ở _vsHandleOpponentLeft.
    if(d.status !== 'playing'){
      if(!prevGuestId && d.guestId){ try{ if(typeof sfxRoomJoin==='function') sfxRoomJoin(); }catch(e){} }
      else if(prevGuestId && !d.guestId){ try{ if(typeof sfxRoomLeave==='function') sfxRoomLeave(); }catch(e){} }
    }
    if(becameHost){
      _onlineLobby.role = 'host';
      try{ _onlineStatus((typeof t==='function'?t('becameHostMsg'):null) || '👑 Bạn đã trở thành chủ phòng!'); }catch(e){}
    }
    if(d.status==='playing' && d.seed!=null && !versusMode){
      enterOnlineVersusMatch(roomId, d);
    }
  });
}

function _renderLobby(d){
  const host=d.hostName||'?';
  const waiting = typeof t==='function'?t('onlineWaiting'):'Đang chờ...';
  const totalVsTiers = (typeof VERSUS_RANKS!=='undefined') ? VERSUS_RANKS.length : 10;
  const hostVsTier = (typeof getVersusRank==='function' && d.hostVersusPoints!=null) ? getVersusRank(d.hostVersusPoints).tier : null;
  const guestVsTier = (typeof getVersusRank==='function' && d.guestName && d.guestVersusPoints!=null) ? getVersusRank(d.guestVersusPoints).tier : null;
  const hostNameHtml = (hostVsTier!=null && hostVsTier>0 && typeof rankNameFxHtml==='function') ? rankNameFxHtml(host, hostVsTier, totalVsTiers) : escapeHtml(host);
  const guestNameHtml = (guestVsTier!=null && guestVsTier>0 && typeof rankNameFxHtml==='function') ? rankNameFxHtml(d.guestName, guestVsTier, totalVsTiers) : escapeHtml(d.guestName||'');
  const guest = d.guestName
    ? guestNameHtml
    : '<span class="online-wait">'+escapeHtml(waiting)+'</span>';
  // Danh hiệu Đấu 1-1 hiển thị ngay trên tên — lấy từ điểm đã lưu kèm room doc lúc
  // tạo/vào phòng (không đọc thêm Firestore chỉ để hiển thị badge này).
  const hostRankHtml = (typeof getVersusRank === 'function' && d.hostVersusPoints != null)
    ? '<div class="versus-seat-rank">'+escapeHtml(getVersusRank(d.hostVersusPoints).icon+' '+getVersusRank(d.hostVersusPoints).name)+'</div>'
    : '';
  const guestRankHtml = (typeof getVersusRank === 'function' && d.guestName && d.guestVersusPoints != null)
    ? '<div class="versus-seat-rank">'+escapeHtml(getVersusRank(d.guestVersusPoints).icon+' '+getVersusRank(d.guestVersusPoints).name)+'</div>'
    : '';
  const isHost = _onlineLobby && _onlineLobby.role==='host';
  const kickBtnHtml = (isHost && d.guestName)
    ? '<button type="button" class="caro-kick-btn" id="online-kick-guest-btn" data-name="'+escapeHtml(d.guestName)+'">'+escapeHtml(t('roomKickBtn'))+'</button>'
    : '';
  const hostReadyIcon = d.hostReady!==false ? '✅' : '⏳';
  const guestReadyIcon = d.guestName ? (d.guestReady ? '✅' : '⏳') : '';
  document.getElementById('online-lobby-players').innerHTML=
    '<div class="online-player">'+hostRankHtml+'<span>👑</span> '+hostNameHtml+' '+hostReadyIcon+'</div>'+
    '<div class="online-player">'+guestRankHtml+'<span>⚔️</span> '+guest+' '+guestReadyIcon+kickBtnHtml+'</div>';
  const wagerEl = document.getElementById('online-lobby-wager');
  if(wagerEl){
    if(Number(d.wagerAmount) > 0 && (d.wagerCurrency==='gold' || d.wagerCurrency==='diamond')){
      const label = typeof t==='function' ? t('onlineLobbyWager') : 'Cược:';
      wagerEl.textContent = label + ' ' + (d.wagerCurrency==='gold' ? '🪙 ' : '💎 ') + d.wagerAmount + ' (' + (typeof t==='function'?t('onlineLobbyWagerPot','thắng ăn x2'):'thắng ăn x2') + ')';
      wagerEl.style.display = '';
    } else {
      wagerEl.style.display = 'none';
    }
  }

  document.getElementById('online-kick-guest-btn')?.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    const gName = e.currentTarget.dataset.name || '?';
    if(!confirm(t('roomKickConfirm', gName))) return;
    if(typeof kickRoomGuest === 'function' && _onlineLobby && _onlineLobby.roomId){
      kickRoomGuest(_onlineLobby.roomId).catch(()=>{});
    }
  });
  const startBtn=document.getElementById('online-start-btn');
  if(startBtn){
    startBtn.style.display = (isHost && d.guestId && d.hostReady!==false && d.guestReady) ? 'block' : 'none';
  }
  const readyBtn=document.getElementById('online-lobby-ready');
  if(readyBtn){
    const myUid = getOnlineUid();
    const meReady = d.hostId===myUid ? d.hostReady!==false : d.guestId===myUid ? !!d.guestReady : true;
    readyBtn.textContent = meReady ? ('✅ ' + t('vsReadyOn')) : ('☐ ' + t('vsReady'));
    readyBtn.classList.toggle('btn-ghost', meReady);
    readyBtn.dataset.ready = meReady ? '0' : '1'; // gia tri se chuyen sang khi bam
  }
  const mmNote=document.getElementById('online-mm-auto-note');
  if(mmNote) mmNote.style.display = d.matchmaking ? 'block' : 'none';
  _onlineRenderOpenRoomLists(_onlineLastOpenRooms);
}

async function onCreateRoom(){
  if(!await _onlineRequireEnabled()) return;
  try{
    // Nếu đang guest trong phòng khác → rời; host thì giữ để tái dùng (1 phòng)
    if(_onlineLobby && _onlineLobby.roomId){
      const prev = _onlineLobby.roomId;
      const wasHost = _onlineLobby.role === 'host';
      stopListeningRoom();
      _onlineLobby = null;
      if(!wasHost) await leaveOnlineRoom(prev);
    }
    const wagerOpts = _wagerOn && _wagerAmount > 0
      ? { wagerCurrency: _wagerCurrency, wagerAmount: _wagerAmount }
      : {};
    const created = await createOnlineRoom(Object.assign({ gameType:'versus' }, wagerOpts));
    const room = created.room || { status:'open', hostName:getOnlineDisplayName(), gameType:'versus' };
    openOnlineLobby(created.roomId, created.code, 'host', Object.assign({}, room, {
      roomId: created.roomId,
      code: created.code,
      hostName: room.hostName || getOnlineDisplayName(),
      gameType: 'versus'
    }));
    _onlineStatus(t(created.reused ? 'onlineRoomReuse' : 'onlineRoomCreated', created.code));
  }catch(e){
    if(e.message === 'already_hosting' && typeof findMyLiveHostedRoom === 'function'){
      try{
        const mine = await findMyLiveHostedRoom('versus');
        if(mine){
          openOnlineLobby(mine.roomId, mine.code, 'host', mine);
          _onlineStatus(t('onlineRoomReuse', mine.code));
          return;
        }
      }catch(e2){}
    }
    const msg = e.message==='already_hosting' ? t('onlineAlreadyHosting') : e.message;
    _onlineStatus(msg, true);
  }
}

async function onJoinRoom(){
  if(!await _onlineRequireEnabled()) return;
  const code=(document.getElementById('online-join-code').value||'').trim().toUpperCase();
  if(code.length<4){ _onlineStatus(t('onlineCodeShort'), true); return; }
  try{
    if(_onlineLobby && _onlineLobby.roomId){
      const prev = _onlineLobby.roomId;
      stopListeningRoom();
      _onlineLobby = null;
      await leaveOnlineRoom(prev);
    }
    const data=await joinOnlineRoomByCode(code, { gameType:'versus' });
    openOnlineLobby(data.roomId, data.code, 'guest', data);
    _onlineStatus(t('onlineJoined'));
  }catch(e){
    const msg = e.message==='room_not_found' ? t('onlineRoomNotFound')
      : e.message==='wrong_game_type' ? (typeof t==='function'?t('caroWrongRoom'):e.message)
      : e.message==='already_hosting' ? t('onlineAlreadyHosting')
      : e.message;
    _onlineStatus(msg, true);
  }
}

async function onFindOpponent(){
  if(!await _onlineRequireEnabled()) return;
  _onlineHide('online-hub-panel');
  _onlineShow('online-matchmaking-panel');
  document.getElementById('online-mm-status').textContent=t('onlineSearching');
  try{
    await startMatchmaking(room => {
      _onlineHide('online-matchmaking-panel');
      const role = room.hostId===getOnlineUid() ? 'host' : 'guest';
      openOnlineLobby(room.roomId, room.code, role, room);
      if(room.matchmaking && role==='host'){
        startOnlineRoomMatch(room.roomId).catch(()=>{});
      }
    });
  }catch(e){
    _onlineHide('online-matchmaking-panel');
    _onlineShow('online-hub-panel');
    const msg = e.message==='already_hosting' ? t('onlineAlreadyHosting') : e.message;
    _onlineStatus(msg, true);
  }
}

function onCancelMatchmaking(){
  cancelMatchmaking();
  _onlineHide('online-matchmaking-panel');
  _onlineShow('online-hub-panel');
}

async function onStartOnlineMatch(){
  if(!_onlineLobby) return;
  try{
    await startOnlineRoomMatch(_onlineLobby.roomId);
  }catch(e){ _onlineStatus(e.message, true); }
}

// ── Vào trận online từ room ───────────────────────────────────
function enterOnlineVersusMatch(roomId, roomData){
  if(versusMode) return;
  try{ if(typeof unlockOrientation==='function') unlockOrientation(); }catch(e){}
  const uid=getOnlineUid();
  const isHost = roomData.hostId===uid;
  const myName = isHost ? roomData.hostName : roomData.guestName;
  const oppName = isHost ? roomData.guestName : roomData.hostName;
  const mySlot = isHost ? 'host' : 'guest';
  let startedAtMs = Date.now();
  if(roomData.startedAt){
    if(typeof roomData.startedAt.toMillis === 'function') startedAtMs = roomData.startedAt.toMillis();
    else if(roomData.startedAt.seconds) startedAtMs = roomData.startedAt.seconds * 1000;
  }

  _onlineHide('online-lobby-panel');
  _onlineHide('versus-setup-panel');
  if(typeof hardResetAllModes==='function') hardResetAllModes();
  try{
    if(typeof caroMode !== 'undefined' && caroMode && typeof _caroQuit === 'function') _caroQuit();
    else {
      const st=document.getElementById('caro-stage');
      if(st){ st.classList.remove('active'); st.style.display='none'; }
    }
  }catch(e){}

  _vsHide('versus-setup-panel');
  _vs={ seed: roomData.seed, names:[myName, oppName],
        avatars:[
          isHost
            ? (roomData.hostAvatar || ((typeof getPlayerAvatar==='function')?getPlayerAvatar():'🐶'))
            : (roomData.guestAvatar || ((typeof getPlayerAvatar==='function')?getPlayerAvatar():'🐶')),
          isHost
            ? (roomData.guestAvatar || '🐱')
            : (roomData.hostAvatar || '🐶')
        ],
        timeLeft:VERSUS_TIME, timer:null,
        players:[_vsNewPlayer(0,roomData.seed), _vsNewPlayer(1,roomData.seed)],
        online:{ roomId, mySlot, appliedSeq:0, isHost, startedAtMs,
          matchSeq: roomData.matchSeq || 1,
          oppUid: isHost ? roomData.guestId : roomData.hostId,
          oppVersusPoints: isHost ? roomData.guestVersusPoints : roomData.hostVersusPoints,
          oppSkins: {
            brickSkin: isHost ? roomData.guestBrickSkin : roomData.hostBrickSkin,
            boardSkin:  isHost ? roomData.guestBoardSkin  : roomData.hostBoardSkin
          },
          wager: (Number(roomData.wagerAmount) > 0 && (roomData.wagerCurrency === 'gold' || roomData.wagerCurrency === 'diamond'))
            ? { currency: roomData.wagerCurrency, amount: Math.floor(roomData.wagerAmount) }
            : null
        } };
  versusMode=true;
  try{ if(typeof logGameEvent==='function') logGameEvent('versus_match_start', { mode:'online' }); }catch(e){}
  _vsBuildArena();
  _vs.players.forEach(P=>{ _vsRefill(P); _vsRenderAll(P); });

  // Đặt cược (nếu phòng có) — chạy nền, KHÔNG chặn đếm ngược 3-2-1. Server (escrowWager)
  // tự kiểm tra số dư thật, không tin gì từ client. Nếu trừ được → hiện mức cược lên HUD;
  // nếu KHÔNG trừ được (hết tiền/đổi ví giữa chừng) → huỷ trận ngay cho công bằng, đối thủ
  // (nếu đã trừ được phần của họ) sẽ tự được hoàn lại qua applyMatchResult (không phải cả
  // 2 bên đều escrow thành công thì hoàn, xem functions/index.js).
  if(_vs.online.wager){
    const w = _vs.online.wager;
    try{
      showHint((w.currency==='gold' ? '🪙 ' : '💎 ') + w.amount + ' · ' + (typeof t==='function'?t('vsWagerLive','Đang cược'):'Đang cược'), { hold: 2200 });
    }catch(e){}
    escrowMyWager(roomId).then(res=>{
      if(!_vs || !_vs.online || _vs.online.roomId !== roomId) return; // đã thoát trận trước khi escrow xong
      if(!res.ok){
        try{ showHint((typeof t==='function'?t('vsWagerFail','Không đủ tiền cược — huỷ trận'):'Không đủ tiền cược — huỷ trận'), { hold: 3200 }); }catch(e){}
        _vsAbort({ noForfeit: true });
        try{ if(typeof openVersusSetup === 'function') openVersusSetup(); }catch(e){}
      }
    });
  }

  listenOnlineMoves(roomId, move => {
    if(!_vs || !_vs.online) return;
    // Phòng dùng lại cho nhiều trận (đấu lại không rời phòng) — moves cũ của
    // trận trước vẫn còn trong subcollection, lọc bỏ theo matchSeq để không
    // áp lại nước đi/trạng thái của ván đã kết thúc vào ván mới.
    if(move.matchSeq != null && _vs.online.matchSeq != null && move.matchSeq !== _vs.online.matchSeq) return;
    if(move.seq <= _vs.online.appliedSeq) return;
    _vs.online.appliedSeq = move.seq;
    _vsApplyNetworkMove(move);
  });

  // Phát hiện đối thủ rời trận giữa chừng (bấm Thoát/đóng tab/mất kết nối) để huỷ
  // trận ngay cho mình, thay vì chơi tới hết giờ rồi mới biết — xem _vsHandleOpponentLeft.
  if(typeof listenOnlineRoom === 'function'){
    listenOnlineRoom(roomId, ev => {
      if(!_vs || !_vs.online || _vs.online.roomId !== roomId) return;
      if(ev.type === 'deleted'){ _vsHandleOpponentLeft(); return; }
      const d = ev.data;
      if(d.status === 'finished' && d.endReason === 'forfeit'){ _vsHandleOpponentLeft(); return; }
      if(d.status === 'cancelled'){ _vsHandleMatchCancelled(); return; }
      if(isHost && !d.guestId && d.status !== 'finished'){ _vsHandleOpponentLeft(); return; }
      if(d.status === 'finished' && d.endReason !== 'forfeit'){ _vsRenderPostMatchReady(d); return; }
      if(d.status === 'open' && document.getElementById('versus-result-panel')?.classList.contains('show')){
        // Chủ phòng vừa kích khách ngay ở màn chờ đấu lại — quay lại sảnh phòng
        // chờ khách mới, KHÔNG rời/xoá phòng.
        document.getElementById('vs-again-btn').style.display = '';
        document.getElementById('vs-close-btn').style.display = '';
        document.getElementById('vs-postmatch-block').style.display = 'none';
        _vsHide('versus-result-panel');
        try{ if(typeof openOnlineLobby === 'function') openOnlineLobby(roomId, d.code, 'host', d); }catch(e){}
        _vs = null;
        return;
      }
      if(d.status === 'playing' && d.matchSeq && d.matchSeq !== _vs.online.matchSeq && d.seed != null && !versusMode){
        // Chủ phòng vừa bắt đầu trận tiếp theo trong cùng phòng — vào lại
        // enterOnlineVersusMatch() để dựng đấu trường mới (versusMode đã về
        // false từ _vsEndMatch nên hàm này chạy được bình thường).
        enterOnlineVersusMatch(roomId, d);
      }
      if(!d.guestId && document.getElementById('versus-result-panel')?.classList.contains('show')){
        // Đối thủ đã rời phòng trong lúc chờ ở màn kết quả.
        _vsPostMatchOpponentLeft();
      }
    });
  }

  try{ if(typeof _vsSetupChat === 'function') _vsSetupChat(true); }catch(e){}

  let cd=3;
  const cdEl=document.getElementById('vs-countdown');
  cdEl.style.display='flex'; cdEl.textContent=cd;
  const ci=setInterval(()=>{
    cd--;
    if(cd>0){ cdEl.textContent=cd; try{ sfxClick(); }catch(e){} return; }
    clearInterval(ci); cdEl.style.display='none';
    _vs.timer=setInterval(_vsTickOnline,1000);
    _vsTickOnline();
    try{ startBgm('action'); }catch(e){}
  },800);
}

function _vsTickOnline(){
  if(!versusMode||!_vs||!_vs.online) return;
  const tm=document.getElementById('vs-mid-timer');
  const roomStarted=_vs.online.startedAtMs;
  if(roomStarted){
    const elapsed=(Date.now()-roomStarted)/1000;
    _vs.timeLeft=Math.max(0, Math.ceil(VERSUS_TIME-elapsed));
  }
  if(tm){ tm.textContent=_vs.timeLeft; tm.classList.toggle('danger',_vs.timeLeft<=10); }
  if(_vs.timeLeft<=0){ _vsEndMatchOnline(); return; }
  const [P0,P1]=_vs.players;
  if(_vs.online.isHost && (P0.score!==_vs.online._lastSentHostScore || P1.score!==_vs.online._lastSentGuestScore)){
    // Chỉ ghi lên server khi điểm THỰC SỰ đổi (thay vì mỗi giây bất kể có gì
    // mới hay không). Ghi ít lần hơn nghĩa là ít va chạm với transaction gửi
    // nước đi (sendOnlineMove) vào CÙNG tài liệu phòng — bớt rủi ro nước đi
    // bị Firestore từ chối do tranh chấp ghi đồng thời.
    _vs.online._lastSentHostScore=P0.score;
    _vs.online._lastSentGuestScore=P1.score;
    updateOnlineScores(_vs.online.roomId, P0.score, P1.score).catch(()=>{});
  }
  document.getElementById('burst-count').textContent='⚔️ '+P0.score+' vs '+P1.score+'  ⏱'+_vs.timeLeft+'s';
}

function _vsEndMatchOnline(){
  if(!_vs) return;
  if(_vs.timer){ clearInterval(_vs.timer); _vs.timer=null; }
  const roomId=_vs.online?.roomId;
  const wager=_vs.online?.wager;
  const [P0,P1]=_vs.players;
  const hostScore=P0.score, guestScore=P1.score;
  if(_vs.online?.isHost && roomId){
    finalizeOnlineMatch(roomId, hostScore, guestScore).catch(()=>{});
  }
  // Cược (nếu có) được server (applyMatchResult, Cloud Function trigger khi phòng
  // chuyển 'finished') xử lý — không phải ngay lập tức. Đợi 1 chút rồi kéo lại số dư
  // thật về HUD + báo kết quả, thay vì hỏi ngay lúc chưa kịp xử lý xong.
  if(wager && typeof syncWalletFromServer === 'function'){
    setTimeout(()=>{
      syncWalletFromServer().then(w=>{
        if(!w) return;
        try{
          const label = (wager.currency==='gold' ? '🪙 ' : '💎 ') + (wager.currency==='gold' ? (w.gold|0) : (w.diamonds|0));
          showComboFlash(0, false, label + ' · ' + (typeof t==='function'?t('onlineLobbyWager','Cược:'):'Cược:'));
        }catch(e){}
      });
    }, 2500);
  }
  stopListeningMoves();
  _vsEndMatch();
}

function _vsBroadcastMove(type, payload){
  if(!_vs || !_vs.online || !_vs.online.roomId) return;
  sendOnlineMove(_vs.online.roomId, { type, slot:_vs.online.mySlot, matchSeq:_vs.online.matchSeq, ...payload })
    .catch(e => console.error('[versus] _vsBroadcastMove FAILED —', type, payload, e));
}

function _vsApplyNetworkMove(move){
  if(!_vs || move.slot===_vs.online.mySlot) return;
  if(move.type==='place'){
    _vsApplyRemotePlace(_vs.players[1], move);
  } else if(move.type==='card'){
    const ob=VS_OBSTACLES.find(o=>o.id===move.cardId);
    if(ob) _vsApplyObstacle(_vs.players[0], ob);
  }
}

function _vsApplyRemotePlace(P, move){
  let idx=move.pieceIndex;
  let pc=(idx>=0 && idx<P.pieces.length) ? P.pieces[idx] : null;
  if(!pc || pc.used){
    // Hang cho cua doi thu tren may minh bi lech nhip (VD: 1 nuoc di truoc do
    // mat goi/bi tu choi do tranh chap ghi) khien P.pieces[idx] sai hoac da
    // dung — thay vi am tham bo qua (lam gach doi thu ngung hien vinh vien tu
    // day), dung thang du lieu tu mang (shape+color duoc gui kem) de tu phuc
    // hoi thay vi phu thuoc trang thai cuc bo co the da sai.
    if(!move.shape) return;
    const fresh = { shape: move.shape.map(p=>[p.r,p.c]), color: move.color || VS_COLORS[0], used:false, rot:0 };
    const freeIdx = P.pieces.findIndex(p=>p && !p.used);
    if(freeIdx>=0){ P.pieces[freeIdx]=fresh; idx=freeIdx; }
    else { P.pieces.push(fresh); idx=P.pieces.length-1; }
    pc=fresh;
  } else if(move.shape){
    pc.shape=move.shape.map(p=>[p.r,p.c]);
  }
  P.selected=idx;
  _vsPlaceAt(P, move.R, move.C, true);
}

function onLeaveLobbyToHub(){
  cancelMatchmaking();
  const prev = _onlineLobby && _onlineLobby.roomId;
  stopListeningRoom();
  _onlineLobby = null;
  if(prev) leaveOnlineRoom(prev).catch(()=>{});
  _onlineHide('online-lobby-panel');
  _onlineHide('online-matchmaking-panel');
  _onlineShow('online-hub-panel');
  _onlineStartRoomListListen();
  try{ if(typeof sfxClick==='function') sfxClick(); }catch(e){}
}

(function initOnlineUI(){
  document.getElementById('vs-online-btn')?.addEventListener('click', openOnlineHub);
  function backToVersusLocal(){
    _onlineHide('online-hub-panel');
    _vsShow('versus-setup-panel');
    try{ if(typeof sfxClick==='function') sfxClick(); }catch(e){}
  }
  document.getElementById('vs-local-btn')?.addEventListener('click', backToVersusLocal);
  document.getElementById('online-local-btn')?.addEventListener('click', backToVersusLocal);
  document.getElementById('online-hub-close')?.addEventListener('click', closeOnlineHub);
  function renderWagerAmounts(){
    const box = document.getElementById('online-wager-amounts');
    if(!box) return;
    const presets = WAGER_PRESETS;
    if(presets.indexOf(_wagerAmount) < 0) _wagerAmount = presets[0];
    box.innerHTML = '';
    presets.forEach(function(n){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'online-wager-amt-btn' + (n === _wagerAmount ? ' active' : '');
      b.textContent = '🪙 ' + n;
      b.addEventListener('click', function(){
        try{ sfxClick(); }catch(e){}
        _wagerAmount = n;
        renderWagerAmounts();
      });
      box.appendChild(b);
    });
  }
  document.getElementById('online-wager-toggle')?.addEventListener('click', function(){
    try{ sfxClick(); }catch(e){}
    _wagerOn = !_wagerOn;
    this.classList.toggle('active', _wagerOn);
    const picker = document.getElementById('online-wager-picker');
    if(picker) picker.hidden = !_wagerOn;
    if(_wagerOn){
      renderWagerAmounts();
      const balEl = document.getElementById('online-wager-balance');
      if(balEl){
        balEl.textContent = typeof t==='function' ? t('onlineWagerBalanceLoading','Đang kiểm tra số dư...') : '...';
        if(typeof syncWalletFromServer === 'function'){
          syncWalletFromServer().then(function(w){
            if(!w || !balEl.isConnected) return;
            const label = typeof t==='function' ? t('onlineWagerBalance','Số dư') : 'Số dư';
            balEl.textContent = label + ': 🪙 ' + (w.gold|0);
          });
        }
      }
    }
  });
  document.getElementById('online-create-btn')?.addEventListener('click', onCreateRoom);
  document.getElementById('online-lobby-ready')?.addEventListener('click', (e)=>{
    try{ sfxClick(); }catch(err){}
    if(!_onlineLobby || !_onlineLobby.roomId) return;
    const goingReady = e.currentTarget.dataset.ready !== '0';
    if(typeof setLobbyReady === 'function') setLobbyReady(_onlineLobby.roomId, goingReady);
  });
  document.getElementById('online-join-btn')?.addEventListener('click', onJoinRoom);
  document.getElementById('online-find-btn')?.addEventListener('click', onFindOpponent);
  document.getElementById('online-mm-cancel')?.addEventListener('click', onCancelMatchmaking);
  document.getElementById('online-start-btn')?.addEventListener('click', onStartOnlineMatch);
  document.getElementById('online-lobby-leave')?.addEventListener('click', onLeaveLobbyToHub);
  document.getElementById('online-lobby-invite')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    if(typeof openChatPanel === 'function') openChatPanel('friends');
  });
  document.getElementById('online-delete-account-btn')?.addEventListener('click', async ()=>{
    const btn = document.getElementById('online-delete-account-btn');
    const msgEl = document.getElementById('acchub-msg') || document.getElementById('pp-msg');
    const setMsg = (text, isErr) => { if(msgEl){ msgEl.textContent = text; msgEl.className = 'account-msg' + (isErr ? ' err' : ' ok'); } };
    const label = typeof t === 'function' ? t('onlineDeleteConfirm') : null;
    const confirmMsg = label || 'Xoá vĩnh viễn tài khoản online: hồ sơ, bạn bè, chặn, điểm BXH gần đây, tin nhắn đã gửi vẫn còn ở phía người nhận. Không thể hoàn tác. Tiếp tục?';
    if(!confirm(confirmMsg)) return;
    try{ sfxClick(); }catch(e){}
    if(btn) btn.disabled = true;
    try{
      const res = await deleteMyAccountOnline();
      if(res && res.ok){
        setMsg((typeof t==='function'?t('onlineDeleteDone'):null) || 'Đã xoá tài khoản online.', false);
        const badge = document.getElementById('online-status-badge');
        if(badge) badge.textContent = '📴';
      } else if(res && res.reason === 'requires_recent_login'){
        setMsg((typeof t==='function'?t('onlineDeleteRelogin'):null) || 'Cần đăng nhập lại gần đây để xoá tài khoản Google. Vui lòng đăng nhập lại rồi thử lại.', true);
      } else {
        setMsg((typeof t==='function'?t('onlineDeleteFail'):null) || 'Không xoá được tài khoản, thử lại sau.', true);
      }
    }catch(e){
      console.warn('[online] delete account', e);
      setMsg('Không xoá được tài khoản, thử lại sau.', true);
    }finally{
      if(btn) btn.disabled = false;
    }
  });

  initOnlineServices().then(ok => {
    const badge=document.getElementById('online-status-badge');
    if(badge) badge.textContent = ok ? '🌐 Online' : '📴 Offline';
  });
})();
