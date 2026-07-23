// ═══════════════════════════════════════════════════════════════
// js/caro.js — CỜ CARO 15×15 online (mở khóa Lv.3)
// Luật: 5 quân liên tiếp thắng — CHẶN HAI ĐẦU thì không tính thắng.
// Host = ● đen, Guest = ○ trắng. Dùng Firebase rooms/moves (gameType:'caro').
// ═══════════════════════════════════════════════════════════════

const CARO_MIN_LEVEL = 3;
const CARO_SIZE = 15;
const CARO_EMPTY = 0;
const CARO_BLACK = 1; // host
const CARO_WHITE = 2; // guest

let caroMode = false;
let _caro = null; // { board, turn, mySlot, roomId, online, moveSeq, names, winner, hover, metrics }
let _caroLobby = null;
let _caroCanvasBound = false;

function _caroGetCanvas(){
  return document.getElementById('caro-canvas');
}

/** Tính layout canvas (giao điểm cổ điển 15×15) */
function _caroMeasure(){
  const canvas = _caroGetCanvas();
  if(!canvas) return null;
  const wrap = canvas.parentElement;
  const maxW = Math.min((wrap && wrap.clientWidth) || 400, 440);
  const maxH = Math.min(window.innerHeight - 120, maxW);
  const cssSize = Math.floor(Math.min(maxW, maxH));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);
  canvas.style.width = cssSize + 'px';
  canvas.style.height = cssSize + 'px';
  const pad = cssSize * 0.06 * dpr;
  const inner = cssSize * dpr - pad * 2;
  const step = inner / (CARO_SIZE - 1);
  const stoneR = step * 0.42;
  return { dpr, pad, step, stoneR, px: cssSize * dpr };
}

function _caroXY(r, c, m){
  return { x: m.pad + c * m.step, y: m.pad + r * m.step };
}

function _caroCellAt(px, py, m){
  const c = Math.round((px - m.pad) / m.step);
  const r = Math.round((py - m.pad) / m.step);
  if(r < 0 || r >= CARO_SIZE || c < 0 || c >= CARO_SIZE) return null;
  const { x, y } = _caroXY(r, c, m);
  const hit = m.step * 0.48;
  if(Math.abs(px - x) > hit || Math.abs(py - y) > hit) return null;
  return { r, c };
}

function _caroDrawStone(ctx, x, y, r, color){
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = r * 0.35;
  ctx.shadowOffsetY = r * 0.12;
  const g = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.1, x, y, r);
  if(color === CARO_BLACK){
    g.addColorStop(0, '#555');
    g.addColorStop(0.45, '#1a1a1a');
    g.addColorStop(1, '#000');
  } else {
    g.addColorStop(0, '#fff');
    g.addColorStop(0.5, '#e8e8e8');
    g.addColorStop(1, '#bbb');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color === CARO_BLACK ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.stroke();
  ctx.restore();
}

function _caroDrawBoard(){
  const canvas = _caroGetCanvas();
  if(!canvas || !_caro) return;
  const ctx = canvas.getContext('2d');
  const m = _caroMeasure();
  if(!m) return;
  _caro.metrics = m;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const W = canvas.width, H = canvas.height;

  // Nền gỗ
  const wood = ctx.createLinearGradient(0, 0, W, H);
  wood.addColorStop(0, '#d4a855');
  wood.addColorStop(0.5, '#c4956a');
  wood.addColorStop(1, '#a67c52');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, W, H);

  // Viền bàn
  ctx.strokeStyle = '#5c3d1e';
  ctx.lineWidth = Math.max(2, m.dpr * 2);
  ctx.strokeRect(m.pad * 0.65, m.pad * 0.65, W - m.pad * 1.3, H - m.pad * 1.3);

  // Lưới
  ctx.strokeStyle = 'rgba(40,30,20,0.55)';
  ctx.lineWidth = Math.max(1, m.dpr * 0.9);
  for(let i = 0; i < CARO_SIZE; i++){
    const x0 = m.pad, y0 = m.pad + i * m.step;
    const x1 = W - m.pad, y1 = y0;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const x2 = m.pad + i * m.step, y2 = m.pad;
    const x3 = x2, y3 = H - m.pad;
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
  }

  // Điểm sao (giao lộ quan trọng)
  const stars = [[3,3],[3,11],[11,3],[11,11],[7,7]];
  ctx.fillStyle = 'rgba(30,20,10,0.65)';
  stars.forEach(([sr, sc]) => {
    const { x, y } = _caroXY(sr, sc, m);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, m.step * 0.1), 0, Math.PI * 2);
    ctx.fill();
  });

  // Quân cờ
  for(let r = 0; r < CARO_SIZE; r++){
    for(let c = 0; c < CARO_SIZE; c++){
      const v = _caro.board[r][c];
      if(!v) continue;
      const { x, y } = _caroXY(r, c, m);
      _caroDrawStone(ctx, x, y, m.stoneR, v);
    }
  }

  // Preview ô chọn (lượt mình)
  if(_caro.hover && !_caro.winner && _caro.turn === _caro.mySlot && !_caro.board[_caro.hover.r][_caro.hover.c]){
    const { x, y } = _caroXY(_caro.hover.r, _caro.hover.c, m);
    const preview = _caroStone(_caro.mySlot);
    ctx.globalAlpha = 0.38;
    _caroDrawStone(ctx, x, y, m.stoneR * 0.92, preview);
    ctx.globalAlpha = 1;
  }
}

function _caroPointerPos(ev){
  const canvas = _caroGetCanvas();
  if(!canvas || !_caro.metrics) return null;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = ev.clientX !== undefined ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0);
  const clientY = ev.clientY !== undefined ? ev.clientY : (ev.touches && ev.touches[0] ? ev.touches[0].clientY : 0);
  return {
    px: (clientX - rect.left) * scaleX,
    py: (clientY - rect.top) * scaleY
  };
}

function _caroOnPointerMove(ev){
  if(!caroMode || !_caro || _caro.winner) return;
  const pos = _caroPointerPos(ev);
  if(!pos || !_caro.metrics) return;
  const cell = _caroCellAt(pos.px, pos.py, _caro.metrics);
  const prev = _caro.hover;
  _caro.hover = cell;
  if((prev?.r !== cell?.r) || (prev?.c !== cell?.c)) _caroDrawBoard();
}

function _caroOnPointerDown(ev){
  if(!caroMode || !_caro || _caro.winner) return;
  ev.preventDefault();
  const pos = _caroPointerPos(ev);
  if(!pos || !_caro.metrics) return;
  const cell = _caroCellAt(pos.px, pos.py, _caro.metrics);
  if(!cell) return;
  if(_caro.turn !== _caro.mySlot) return;
  _caroApplyMove(cell.r, cell.c, _caro.mySlot, false);
}

function _caroBindCanvas(){
  if(_caroCanvasBound) return;
  const canvas = _caroGetCanvas();
  if(!canvas) return;
  _caroCanvasBound = true;
  canvas.addEventListener('pointerdown', _caroOnPointerDown);
  canvas.addEventListener('pointermove', _caroOnPointerMove);
  canvas.addEventListener('pointerleave', ()=>{
    if(_caro && _caro.hover){ _caro.hover = null; _caroDrawBoard(); }
  });
  window.addEventListener('resize', ()=>{ if(caroMode) _caroDrawBoard(); });
  window.addEventListener('orientationchange', ()=>setTimeout(()=>{ if(caroMode) _caroDrawBoard(); }, 120));
}

function _caroRender(){
  const info = document.getElementById('caro-turn-info');
  if(!_caro) return;
  _caroBindCanvas();
  _caroDrawBoard();

  if(info){
    if(_caro.winner){
      info.textContent = _caro.winner==='draw' ? t('caroDraw') :
        (_caro.winner===_caro.mySlot ? t('caroYouWin') : t('caroYouLose'));
    } else {
      const mine = _caro.turn === _caro.mySlot;
      const who = _caro.turn==='host' ? _caro.names[0] : _caro.names[1];
      info.textContent = mine ? t('caroYourTurn') : t('caroOppTurn', who);
    }
  }
}

function canPlayCaro(){
  return typeof playerLevel !== 'undefined' && playerLevel >= CARO_MIN_LEVEL;
}

function refreshCaroButton(){
  const btn = document.getElementById('caro-btn');
  if(!btn) return;
  if(canPlayCaro()){
    btn.classList.add('caro-unlocked');
    btn.title = t('ttCaro');
  } else {
    btn.classList.remove('caro-unlocked');
    btn.title = t('caroNeedLevel', CARO_MIN_LEVEL);
  }
}

function _caroShow(id){ const el=document.getElementById(id); if(el) el.classList.add('show'); }
function _caroHide(id){ const el=document.getElementById(id); if(el) el.classList.remove('show'); }

function _caroStatus(msg, err){
  const el=document.getElementById('caro-online-status');
  if(!el) return;
  el.textContent = msg || '';
  el.className = 'online-status' + (err ? ' err' : '');
}

function _caroNewBoard(){
  return Array.from({length:CARO_SIZE}, ()=>Array(CARO_SIZE).fill(CARO_EMPTY));
}

function _caroStone(slot){ return slot === 'host' ? CARO_BLACK : CARO_WHITE; }
function _caroOpp(slot){ return slot === 'host' ? 'guest' : 'host'; }

/** Luật chặn hai đầu: 5 quân thắng chỉ khi KHÔNG bị chặn cả 2 đầu bởi đối phương hoặc biên */
function _caroCheckWin(board, r, c, color){
  const opp = color === CARO_BLACK ? CARO_WHITE : CARO_BLACK;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for(const [dr,dc] of dirs){
    const cells = [[r,c]];
    let nr = r-dr, nc = c-dc;
    while(nr>=0 && nr<CARO_SIZE && nc>=0 && nc<CARO_SIZE && board[nr][nc]===color){
      cells.unshift([nr,nc]); nr-=dr; nc-=dc;
    }
    nr = r+dr; nc = c+dc;
    while(nr>=0 && nr<CARO_SIZE && nc>=0 && nc<CARO_SIZE && board[nr][nc]===color){
      cells.push([nr,nc]); nr+=dr; nc+=dc;
    }
    if(cells.length < 5) continue;
    for(let i=0; i<=cells.length-5; i++){
      const five = cells.slice(i, i+5);
      if(!five.some(([fr,fc])=>fr===r && fc===c)) continue;
      const [r0,c0]=five[0], [r4,c4]=five[4];
      const br=r0-dr, bc=c0-dc, ar=r4+dr, ac=c4+dc;
      const blockedBefore = br<0||bc<0||br>=CARO_SIZE||bc>=CARO_SIZE||board[br][bc]===opp;
      const blockedAfter = ar<0||ac<0||ar>=CARO_SIZE||ac>=CARO_SIZE||board[ar][ac]===opp;
      if(!(blockedBefore && blockedAfter)) return true;
    }
  }
  return false;
}

function _caroBoardFull(board){
  for(let r=0;r<CARO_SIZE;r++) for(let c=0;c<CARO_SIZE;c++) if(!board[r][c]) return false;
  return true;
}

function _caroApplyMove(r, c, slot, fromNet){
  if(!_caro || _caro.winner) return false;
  if(_caro.board[r][c]) return false;
  if(_caro.turn !== slot) return false;
  if(_caro.online && !fromNet && slot !== _caro.mySlot) return false;

  const color = _caroStone(slot);
  _caro.board[r][c] = color;
  try{ sfxPlacePiece(); }catch(e){ try{ sfxClick(); }catch(e2){} }

  if(_caroCheckWin(_caro.board, r, c, color)){
    _caro.winner = slot;
    _caroEndGame(slot);
    return true;
  }
  if(_caroBoardFull(_caro.board)){
    _caro.winner = 'draw';
    _caroEndGame('draw');
    return true;
  }

  _caro.turn = _caroOpp(slot);
  _caroRender();

  if(!fromNet && _caro.online && _caro.roomId){
    sendOnlineMove(_caro.roomId, { type:'caro_place', slot, r, c }).catch(()=>{});
    updateOnlineRoomTurn(_caro.roomId, _caro.turn).catch(()=>{});
  }
  return true;
}

function _caroRender(){
  const grid = document.getElementById('caro-grid');
  const info = document.getElementById('caro-turn-info');
  if(!grid || !_caro) return;

  grid.innerHTML = '';
  for(let r=0;r<CARO_SIZE;r++){
    for(let c=0;c<CARO_SIZE;c++){
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'caro-cell';
      const v = _caro.board[r][c];
      if(v===CARO_BLACK){ cell.classList.add('black'); cell.textContent='●'; }
      else if(v===CARO_WHITE){ cell.classList.add('white'); cell.textContent='○'; }
      const myTurn = _caro.turn === _caro.mySlot && !_caro.winner;
      const canTap = myTurn && !v && (!_caro.online || _caro.turn === _caro.mySlot);
      if(canTap){
        cell.addEventListener('click', ()=>_caroApplyMove(r,c,_caro.mySlot,false));
      } else if(!v) cell.classList.add('disabled');
      grid.appendChild(cell);
    }
  }

  if(info){
    if(_caro.winner){
      info.textContent = _caro.winner==='draw' ? t('caroDraw') :
        (_caro.winner===_caro.mySlot ? t('caroYouWin') : t('caroYouLose'));
    } else {
      const mine = _caro.turn === _caro.mySlot;
      const who = _caro.turn==='host' ? _caro.names[0] : _caro.names[1];
      info.textContent = mine ? t('caroYourTurn') : t('caroOppTurn', who);
    }
  }
}

function _caroEnterGame(roomData){
  const uid = getOnlineUid();
  const isHost = roomData.hostId === uid;
  const mySlot = isHost ? 'host' : 'guest';
  _caro = {
    board: _caroNewBoard(),
    turn: 'host',
    mySlot,
    roomId: roomData.roomId || _caroLobby?.roomId,
    online: true,
    moveSeq: 0,
    names: [roomData.hostName||'Host', roomData.guestName||'Guest'],
    winner: null
  };
  caroMode = true;
  _caroHide('caro-lobby-panel');
  _caroHide('caro-hub-panel');
  document.getElementById('caro-stage')?.classList.add('active');
  document.getElementById('grid-wrap')?.classList.add('secret-mode');
  document.getElementById('mode-badge').textContent = '⬛ CARO ONLINE';
  document.getElementById('mode-badge').classList.add('secret');

  const roomId = _caro.roomId;
  fetchAllOnlineMoves(roomId).then(moves=>{
    moves.forEach(m=>{
      if(m.type==='caro_place' && m.seq > _caro.moveSeq){
        _caro.moveSeq = m.seq;
        _caro.board[m.r][m.c] = _caroStone(m.slot);
        _caro.turn = _caroOpp(m.slot);
      }
    });
    if(roomData.currentTurn) _caro.turn = roomData.currentTurn;
    _caroRender();
  });

  listenOnlineMoves(roomId, move=>{
    if(!_caro || move.type!=='caro_place') return;
    if(move.seq <= _caro.moveSeq) return;
    _caro.moveSeq = move.seq;
    if(move.slot === _caro.mySlot) return;
    _caroApplyMove(move.r, move.c, move.slot, true);
  });

  listenOnlineRoom(roomId, ev=>{
    if(ev.type==='deleted'){ _caroQuit(); return; }
    const d = ev.data;
    if(d.status==='finished' && d.winnerId){
      const winSlot = d.winnerId===d.hostId ? 'host' : 'guest';
      if(!_caro.winner) _caroEndGame(winSlot, true);
    }
  });

  _caroRender();
  try{ startBgm('action'); }catch(e){}
}

function _caroEndGame(winnerSlot, fromRemote){
  if(!_caro) return;
  _caro.winner = winnerSlot;
  _caroRender();
  const uid = getOnlineUid();
  const roomId = _caro.roomId;
  if(!fromRemote && _caro.roomId && winnerSlot !== 'draw'){
    finalizeCaroMatch(_caro.roomId, winnerSlot).catch(()=>{});
  } else if(!fromRemote && _caro.roomId && winnerSlot === 'draw'){
    const ref = firebase.firestore().collection('rooms').doc(roomId);
    ref.update({ status:'finished', winnerId:null, endedAt:firebase.firestore.FieldValue.serverTimestamp() }).catch(()=>{});
  }

  let msg;
  if(winnerSlot==='draw') msg = t('caroDraw');
  else if(winnerSlot===_caro.mySlot) msg = t('caroYouWin');
  else msg = t('caroYouLose');

  document.getElementById('caro-result-title').textContent = msg;
  document.getElementById('caro-result-body').innerHTML =
    '<div style="font-size:13px;color:#ccc;">'+escapeHtml(_caro.names[0])+' (●) vs '+escapeHtml(_caro.names[1])+' (○)</div>';
  setTimeout(()=>_caroShow('caro-result-panel'), 600);
  stopListeningRoom();
}

function _caroQuit(){
  caroMode = false;
  _caro = null;
  _caroLobby = null;
  stopListeningRoom();
  const canvas = _caroGetCanvas();
  if(canvas){
    const ctx = canvas.getContext('2d');
    if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  document.getElementById('caro-stage')?.classList.remove('active');
  document.getElementById('grid-wrap')?.classList.remove('secret-mode');
  document.getElementById('mode-badge').textContent = 'BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  _caroHide('caro-result-panel');
  _caroHide('caro-lobby-panel');
  _caroHide('caro-hub-panel');
  _caroHide('caro-mm-panel');
  try{ startBgm('main'); }catch(e){}
}

// ── Hub / lobby ───────────────────────────────────────────────
async function _caroRequireOnline(){
  if(!isOnlineServicesEnabled()){
    _caroStatus(t('onlineDisabled'), true);
    return false;
  }
  try{
    await ensureOnlineAuth();
    _caroStatus(t('caroConnected', getOnlineDisplayName()));
    return true;
  }catch(e){
    _caroStatus(e.message, true);
    return false;
  }
}

function openCaroHub(){
  try{ sfxClick(); }catch(e){}
  if(!canPlayCaro()){
    try{ showComboFlash(0,false,t('caroNeedLevel', CARO_MIN_LEVEL)); }catch(e){}
    return;
  }
  _caroShow('caro-hub-panel');
  if(isOnlineServicesEnabled()) _caroRequireOnline();
}

function closeCaroHub(){
  cancelMatchmaking();
  if(_caroLobby) leaveOnlineRoom(_caroLobby.roomId).catch(()=>{});
  _caroLobby = null;
  stopListeningRoom();
  _caroHide('caro-hub-panel');
  _caroHide('caro-lobby-panel');
  _caroHide('caro-mm-panel');
}

function _caroOpenLobby(roomId, code, role, roomData){
  _caroLobby = { roomId, code, role, roomData };
  _caroHide('caro-hub-panel');
  _caroHide('caro-mm-panel');
  _caroShow('caro-lobby-panel');
  document.getElementById('caro-room-code').textContent = code;
  _caroRenderLobby(roomData);

  listenOnlineRoom(roomId, ev=>{
    if(ev.type==='deleted'){ closeCaroHub(); return; }
    const d = ev.data;
    _caroLobby.roomData = d;
    _caroRenderLobby(d);
    if(d.status==='playing' && !caroMode) _caroEnterGame({ roomId, ...d });
  });
}

function _caroRenderLobby(d){
  const host = d.hostName || '?';
  const guest = d.guestName || t('onlineWaiting');
  document.getElementById('caro-lobby-players').innerHTML =
    '<div class="online-player"><span>●</span> '+escapeHtml(host)+' (đen)</div>'+
    '<div class="online-player"><span>○</span> '+escapeHtml(guest)+' (trắng)</div>';
  const startBtn = document.getElementById('caro-start-btn');
  const isHost = _caroLobby && _caroLobby.role==='host';
  if(startBtn) startBtn.style.display = (isHost && d.status==='ready' && d.guestId) ? 'block' : 'none';
}

async function caroCreateRoom(){
  if(!await _caroRequireOnline()) return;
  try{
    const { roomId, code } = await createOnlineRoom({ gameType:'caro' });
    _caroOpenLobby(roomId, code, 'host', { status:'open', hostName:getOnlineDisplayName(), gameType:'caro' });
    _caroStatus(t('onlineRoomCreated', code));
  }catch(e){ _caroStatus(e.message, true); }
}

async function caroJoinRoom(){
  if(!await _caroRequireOnline()) return;
  const code = (document.getElementById('caro-join-code').value||'').trim().toUpperCase();
  if(code.length<4){ _caroStatus(t('onlineCodeShort'), true); return; }
  try{
    const data = await joinOnlineRoomByCode(code, { gameType:'caro' });
    _caroOpenLobby(data.roomId, data.code, 'guest', data);
    _caroStatus(t('onlineJoined'));
  }catch(e){
    const msg = e.message==='room_not_found' ? t('onlineRoomNotFound') :
      e.message==='wrong_game_type' ? t('caroWrongRoom') : e.message;
    _caroStatus(msg, true);
  }
}

async function caroFindOpponent(){
  if(!await _caroRequireOnline()) return;
  _caroHide('caro-hub-panel');
  _caroShow('caro-mm-panel');
  document.getElementById('caro-mm-status').textContent = t('onlineSearching');
  startMatchmaking(room=>{
    _caroHide('caro-mm-panel');
    const role = room.hostId===getOnlineUid() ? 'host' : 'guest';
    _caroOpenLobby(room.roomId, room.code, role, room);
    if(room.matchmaking && role==='host'){
      startOnlineRoomMatch(room.roomId).catch(()=>{});
    }
  }, { gameType:'caro' });
}

function caroCancelMM(){
  cancelMatchmaking();
  _caroHide('caro-mm-panel');
  _caroShow('caro-hub-panel');
}

async function caroStartMatch(){
  if(!_caroLobby) return;
  try{
    await startOnlineRoomMatch(_caroLobby.roomId);
  }catch(e){ _caroStatus(e.message, true); }
}

(function initCaro(){
  document.getElementById('caro-btn')?.addEventListener('click', openCaroHub);
  document.getElementById('caro-hub-close')?.addEventListener('click', closeCaroHub);
  document.getElementById('caro-create-btn')?.addEventListener('click', caroCreateRoom);
  document.getElementById('caro-join-btn')?.addEventListener('click', caroJoinRoom);
  document.getElementById('caro-find-btn')?.addEventListener('click', caroFindOpponent);
  document.getElementById('caro-mm-cancel')?.addEventListener('click', caroCancelMM);
  document.getElementById('caro-start-btn')?.addEventListener('click', caroStartMatch);
  document.getElementById('caro-lobby-leave')?.addEventListener('click', closeCaroHub);
  document.getElementById('caro-quit-btn')?.addEventListener('click', ()=>{ if(confirm(t('caroQuitConfirm'))) _caroQuit(); });
  document.getElementById('caro-result-close')?.addEventListener('click', _caroQuit);
  refreshCaroButton();
})();
