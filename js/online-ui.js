// ═══════════════════════════════════════════════════════════════
// js/online-ui.js — Giao diện phòng / matchmaking / lobby online
// Nạp SAU online-services.js và versus.js
// ═══════════════════════════════════════════════════════════════

let _onlineLobby = null; // { roomId, code, role:'host'|'guest', roomData }

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

function openOnlineHub(){
  try{ sfxClick(); }catch(e){}
  if(!canHostVersus()){
    try{ showComboFlash(0,false,t('vsNeedLevel', VERSUS_MIN_LEVEL)); }catch(e){}
    return;
  }
  _onlineHide('versus-setup-panel');
  _onlineShow('online-hub-panel');
  const on = isOnlineServicesEnabled();
  document.getElementById('online-disabled-note').style.display = on ? 'none' : 'block';
  if(on) _onlineRequireEnabled();
}

function closeOnlineHub(){
  cancelMatchmaking();
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

  listenOnlineRoom(roomId, ev => {
    if(ev.type==='deleted'){ closeOnlineHub(); return; }
    const d=ev.data;
    _onlineLobby.roomData=d;
    _renderLobby(d);
    if(d.status==='playing' && d.seed!=null && !versusMode){
      enterOnlineVersusMatch(roomId, d);
    }
  });
}

function _renderLobby(d){
  const host=d.hostName||'?';
  const guest=d.guestName||t('onlineWaiting');
  document.getElementById('online-lobby-players').innerHTML=
    '<div class="online-player"><span>👑</span> '+escapeHtml(host)+'</div>'+
    '<div class="online-player"><span>⚔️</span> '+escapeHtml(guest)+'</div>';
  const startBtn=document.getElementById('online-start-btn');
  const isHost=_onlineLobby && _onlineLobby.role==='host';
  if(startBtn){
    startBtn.style.display = (isHost && d.status==='ready' && d.guestId) ? 'block' : 'none';
  }
  const mmNote=document.getElementById('online-mm-auto-note');
  if(mmNote) mmNote.style.display = d.matchmaking ? 'block' : 'none';
}

async function onCreateRoom(){
  if(!await _onlineRequireEnabled()) return;
  try{
    const { roomId, code } = await createOnlineRoom();
    openOnlineLobby(roomId, code, 'host', { status:'open', hostName:getOnlineDisplayName() });
    _onlineStatus(t('onlineRoomCreated', code));
  }catch(e){ _onlineStatus(e.message, true); }
}

async function onJoinRoom(){
  if(!await _onlineRequireEnabled()) return;
  const code=(document.getElementById('online-join-code').value||'').trim().toUpperCase();
  if(code.length<4){ _onlineStatus(t('onlineCodeShort'), true); return; }
  try{
    const data=await joinOnlineRoomByCode(code);
    openOnlineLobby(data.roomId, data.code, 'guest', data);
    _onlineStatus(t('onlineJoined'));
  }catch(e){
    const msg = e.message==='room_not_found' ? t('onlineRoomNotFound') : e.message;
    _onlineStatus(msg, true);
  }
}

async function onFindOpponent(){
  if(!await _onlineRequireEnabled()) return;
  _onlineHide('online-hub-panel');
  _onlineShow('online-matchmaking-panel');
  document.getElementById('online-mm-status').textContent=t('onlineSearching');
  startMatchmaking(room => {
    _onlineHide('online-matchmaking-panel');
    const role = room.hostId===getOnlineUid() ? 'host' : 'guest';
    openOnlineLobby(room.roomId, room.code, role, room);
    if(room.matchmaking && role==='host'){
      startOnlineRoomMatch(room.roomId).catch(()=>{});
    }
  });
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

  _vsHide('versus-setup-panel');
  _vs={ seed: roomData.seed, names:[myName, oppName], timeLeft:VERSUS_TIME, timer:null,
        players:[_vsNewPlayer(0,roomData.seed), _vsNewPlayer(1,roomData.seed)],
        online:{ roomId, mySlot, appliedSeq:0, isHost, startedAtMs } };
  versusMode=true;
  _vsBuildArena();
  _vs.players.forEach(P=>{ _vsRefill(P); _vsRenderAll(P); });

  listenOnlineMoves(roomId, move => {
    if(!_vs || !_vs.online) return;
    if(move.seq <= _vs.online.appliedSeq) return;
    _vs.online.appliedSeq = move.seq;
    _vsApplyNetworkMove(move);
  });

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
  if(_vs.online.isHost){
    updateOnlineScores(_vs.online.roomId, P0.score, P1.score).catch(()=>{});
  }
  document.getElementById('burst-count').textContent='⚔️ '+P0.score+' vs '+P1.score+'  ⏱'+_vs.timeLeft+'s';
}

function _vsEndMatchOnline(){
  if(!_vs) return;
  if(_vs.timer){ clearInterval(_vs.timer); _vs.timer=null; }
  const roomId=_vs.online?.roomId;
  const [P0,P1]=_vs.players;
  const hostScore=P0.score, guestScore=P1.score;
  if(_vs.online?.isHost && roomId){
    finalizeOnlineMatch(roomId, hostScore, guestScore).catch(()=>{});
  }
  stopListeningRoom();
  _onlineLobby=null;
  _vsEndMatch();
}

function _vsBroadcastMove(type, payload){
  if(!_vs || !_vs.online || !_vs.online.roomId) return;
  sendOnlineMove(_vs.online.roomId, { type, slot:_vs.online.mySlot, ...payload }).catch(()=>{});
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
  const idx=move.pieceIndex;
  if(idx<0||idx>=P.pieces.length) return;
  const pc=P.pieces[idx];
  if(!pc||pc.used) return;
  P.selected=idx;
  if(move.shape) pc.shape=move.shape.map(([r,c])=>[r,c]);
  _vsPlaceAt(P, move.R, move.C, true);
}

(function initOnlineUI(){
  document.getElementById('vs-online-btn')?.addEventListener('click', openOnlineHub);
  document.getElementById('vs-local-btn')?.addEventListener('click', ()=>{
    _onlineHide('online-hub-panel');
    _vsShow('versus-setup-panel');
  });
  document.getElementById('online-hub-close')?.addEventListener('click', closeOnlineHub);
  document.getElementById('online-create-btn')?.addEventListener('click', onCreateRoom);
  document.getElementById('online-join-btn')?.addEventListener('click', onJoinRoom);
  document.getElementById('online-find-btn')?.addEventListener('click', onFindOpponent);
  document.getElementById('online-mm-cancel')?.addEventListener('click', onCancelMatchmaking);
  document.getElementById('online-start-btn')?.addEventListener('click', onStartOnlineMatch);
  document.getElementById('online-lobby-leave')?.addEventListener('click', closeOnlineHub);
  document.getElementById('online-google-btn')?.addEventListener('click', async ()=>{
    const btn = document.getElementById('online-google-btn');
    if(btn) btn.disabled = true;
    try{
      await signInWithGoogle();
      _onlineStatus('Google · '+getOnlineDisplayName());
    }catch(e){
      const msg = typeof friendlyOnlineAuthError === 'function' ? friendlyOnlineAuthError(e) : (e && e.message);
      if(!msg){ _onlineStatus(''); return; }
      const soft = /unauthorized-domain|google_plugin|google_web_client|google_no_id|28444|SHA/i.test(String((e&&e.code)||e.message||'')+msg);
      const el = document.getElementById('online-status');
      if(el){
        el.textContent = msg;
        el.className = 'online-status' + (soft ? ' warn' : ' err');
      } else {
        _onlineStatus(msg, true);
      }
    }finally{
      if(btn) btn.disabled = false;
    }
  });

  initOnlineServices().then(ok => {
    const badge=document.getElementById('online-status-badge');
    if(badge) badge.textContent = ok ? '🌐 Online' : '📴 Offline';
  });
})();
