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

/** Cấu hình AI theo độ khó */
const CARO_AI_LEVELS = {
  easy:   { id:'easy',   thinkMs:280, mistakeRate:0.55, radius:2 },
  medium: { id:'medium', thinkMs:420, mistakeRate:0.15, radius:3 },
  hard:   { id:'hard',   thinkMs:560, mistakeRate:0.02, radius:3 },
};

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
  if(!caroMode || !_caro || _caro.winner || _caro.aiThinking) return;
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
    } else if(_caro.aiThinking){
      info.textContent = t('caroAiThinking');
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

function _caroCloneBoard(board){
  return board.map(row => row.slice());
}

function _caroCountStones(board){
  let n = 0;
  for(let r=0;r<CARO_SIZE;r++) for(let c=0;c<CARO_SIZE;c++) if(board[r][c]) n++;
  return n;
}

function _caroGetCandidates(board, radius){
  const moves = [];
  const seen = new Set();
  const hasStone = _caroCountStones(board) > 0;
  if(!hasStone){
    const mid = (CARO_SIZE - 1) >> 1;
    return [[mid, mid]];
  }
  for(let r=0;r<CARO_SIZE;r++){
    for(let c=0;c<CARO_SIZE;c++){
      if(board[r][c]) continue;
      let near = false;
      for(let dr=-radius; dr<=radius && !near; dr++){
        for(let dc=-radius; dc<=radius && !near; dc++){
          if(!dr && !dc) continue;
          const nr=r+dr, nc=c+dc;
          if(nr>=0 && nr<CARO_SIZE && nc>=0 && nc<CARO_SIZE && board[nr][nc]) near = true;
        }
      }
      if(near){
        const key = r+','+c;
        if(!seen.has(key)){ seen.add(key); moves.push([r,c]); }
      }
    }
  }
  return moves;
}

function _caroExtendLine(board, r, c, dr, dc, color){
  const cells = [[r,c]];
  let nr = r-dr, nc = c-dc;
  while(nr>=0 && nr<CARO_SIZE && nc>=0 && nc<CARO_SIZE && board[nr][nc]===color){
    cells.unshift([nr,nc]); nr-=dr; nc-=dc;
  }
  nr = r+dr; nc = c+dc;
  while(nr>=0 && nr<CARO_SIZE && nc>=0 && nc<CARO_SIZE && board[nr][nc]===color){
    cells.push([nr,nc]); nr+=dr; nc+=dc;
  }
  return cells;
}

function _caroOpenEnds(board, cells, dr, dc){
  const [r0,c0] = cells[0], [rN,cN] = cells[cells.length-1];
  const br=r0-dr, bc=c0-dc, ar=rN+dr, ac=cN+dc;
  const openAt = (rr,cc)=> rr>=0 && rr<CARO_SIZE && cc>=0 && cc<CARO_SIZE && board[rr][cc]===CARO_EMPTY;
  let open = 0;
  if(openAt(br,bc)) open++;
  if(openAt(ar,ac)) open++;
  return open;
}

function _caroPatternValue(len, openEnds){
  if(len >= 5) return 100000;
  if(len === 4) return openEnds === 2 ? 12000 : (openEnds === 1 ? 3200 : 120);
  if(len === 3) return openEnds === 2 ? 900 : (openEnds === 1 ? 180 : 25);
  if(len === 2) return openEnds === 2 ? 70 : (openEnds === 1 ? 18 : 4);
  return 2;
}

function _caroScoreCell(board, r, c, color){
  const b = _caroCloneBoard(board);
  b[r][c] = color;
  if(_caroCheckWin(b, r, c, color)) return 200000;
  let score = 0;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for(const [dr,dc] of dirs){
    const cells = _caroExtendLine(b, r, c, dr, dc, color);
    score += _caroPatternValue(cells.length, _caroOpenEnds(b, cells, dr, dc));
  }
  const cr = (CARO_SIZE - 1) / 2;
  score += Math.max(0, 10 - (Math.abs(r-cr) + Math.abs(c-cr)));
  return score;
}

function _caroEvaluateMove(board, r, c, color, oppColor){
  return _caroScoreCell(board, r, c, color) + _caroScoreCell(board, r, c, oppColor) * 1.1;
}

function _caroRandomEmptyNear(board, radius){
  const cands = _caroGetCandidates(board, radius);
  if(cands.length) return cands[Math.floor(Math.random() * cands.length)];
  for(let r=0;r<CARO_SIZE;r++) for(let c=0;c<CARO_SIZE;c++) if(!board[r][c]) return [r,c];
  return null;
}

function _caroPickAIMove(profile){
  if(!_caro || !_caro.ai) return null;
  try{
    const aiSlot = _caroOpp(_caro.mySlot);
    const aiColor = _caroStone(aiSlot);
    const playerColor = _caroStone(_caro.mySlot);
    const board = _caro.board;
    const candidates = _caroGetCandidates(board, profile.radius || 3);
    if(!candidates.length) return _caroRandomEmptyNear(board, 4);

    // Ưu tiên thắng ngay / chặn thắng
    for(const [r,c] of candidates){
      const b = _caroCloneBoard(board);
      b[r][c] = aiColor;
      if(_caroCheckWin(b, r, c, aiColor)) return { r, c, score: 1e9 };
    }
    for(const [r,c] of candidates){
      const b = _caroCloneBoard(board);
      b[r][c] = playerColor;
      if(_caroCheckWin(b, r, c, playerColor)) return { r, c, score: 5e8 };
    }

    const scored = candidates.map(([r,c]) => ({
      r, c, score: _caroEvaluateMove(board, r, c, aiColor, playerColor)
    })).sort((a,b)=> b.score - a.score);

    if(!scored.length) return null;
    if(Math.random() < (profile.mistakeRate || 0)){
      const pool = scored.slice(0, Math.min(scored.length, Math.max(3, Math.ceil(scored.length * 0.4))));
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const top = scored[0].score;
    const topMoves = scored.filter(m => m.score >= top * 0.92);
    return topMoves[Math.floor(Math.random() * topMoves.length)];
  }catch(e){
    console.warn('[caro-ai]', e);
    const fallback = _caroRandomEmptyNear(_caro.board, 3);
    return fallback ? { r: fallback[0], c: fallback[1], score: 0 } : null;
  }
}

function _caroScheduleAI(){
  if(!_caro || !_caro.ai || _caro.winner || _caro.turn === _caro.mySlot) return;
  const profile = _caro.ai;
  _caro.aiThinking = true;
  _caroRender();
  if(_caro.aiTimer) clearTimeout(_caro.aiTimer);
  _caro.aiTimer = setTimeout(()=>{
    _caro.aiTimer = null;
    if(!_caro || !_caro.ai || _caro.winner || _caro.turn === _caro.mySlot){
      if(_caro) _caro.aiThinking = false;
      return;
    }
    let move = null;
    try{ move = _caroPickAIMove(profile); }catch(e){ console.warn('[caro-ai]', e); }
    if(!move){
      const fb = _caroRandomEmptyNear(_caro.board, 4);
      if(fb) move = { r: fb[0], c: fb[1] };
    }
    _caro.aiThinking = false;
    if(move) _caroApplyMove(move.r, move.c, _caroOpp(_caro.mySlot), true);
    else _caroRender();
  }, profile.thinkMs || 400);
}

function _caroToggleChrome(hide){
  ['help-btn','hiddenmap-help-btn'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(hide){
      el.dataset.caroHidden = el.style.display || '';
      el.style.display = 'none';
    } else if('caroHidden' in el.dataset){
      el.style.display = el.dataset.caroHidden;
      delete el.dataset.caroHidden;
    }
  });
}

function _caroEnterAIGame(levelId){
  const profile = CARO_AI_LEVELS[levelId] || CARO_AI_LEVELS.medium;
  const pName = (typeof currentPlayerName === 'function' ? currentPlayerName() : null) || 'Bạn';

  // Đóng mọi panel Caro trước
  ['caro-hub-panel','caro-ai-panel','caro-lobby-panel','caro-mm-panel','caro-result-panel','caro-rank-panel']
    .forEach(id => _caroHide(id));

  try{ if(typeof hardResetAllModes === 'function') hardResetAllModes(); }catch(e){}

  _caro = {
    board: _caroNewBoard(),
    turn: 'host',
    mySlot: 'host',
    roomId: null,
    online: false,
    ai: Object.assign({}, profile),
    aiThinking: false,
    aiTimer: null,
    moveSeq: 0,
    names: [pName, t('caroAiName_' + profile.id)],
    winner: null,
    hover: null
  };
  caroMode = true;
  _caroToggleChrome(true);

  const stage = document.getElementById('caro-stage');
  if(stage) stage.classList.add('active');
  document.getElementById('grid-wrap')?.classList.add('secret-mode');
  const badge = document.getElementById('mode-badge');
  if(badge){
    badge.textContent = '⬛ CARO';
    badge.classList.add('secret');
  }

  // Vẽ bàn sau khi layout active
  const paint = ()=>{ try{ _caroRender(); }catch(e){ console.warn('[caro]', e); } };
  paint();
  requestAnimationFrame(()=>{ paint(); requestAnimationFrame(paint); });
  try{ startBgm('action'); }catch(e){}
}

function caroStartAI(levelId){
  try{ sfxClick(); }catch(e){}
  try{
    _caroEnterAIGame(levelId || 'medium');
    return true;
  }catch(e){
    console.error('[caro-ai] start failed', e);
    try{ showComboFlash(0,false,'Caro AI error'); }catch(e2){}
    return false;
  }
}
window.caroStartAI = caroStartAI;

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
  if(!fromNet && _caro.ai && !_caro.winner) _caroScheduleAI();
  return true;
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
  _caroToggleChrome(true);
  document.getElementById('caro-stage')?.classList.add('active');
  document.getElementById('grid-wrap')?.classList.add('secret-mode');
  const badge = document.getElementById('mode-badge');
  if(badge){
    badge.textContent = '⬛ CARO';
    badge.classList.add('secret');
  }

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
  _caro.aiThinking = false;
  if(_caro.aiTimer){ clearTimeout(_caro.aiTimer); _caro.aiTimer = null; }
  _caroRender();

  const isAI = !!_caro.ai;

  if(!isAI && !fromRemote && _caro.roomId){
    finalizeCaroMatch(_caro.roomId, winnerSlot).catch(()=>{});
  }

  let msg;
  if(winnerSlot==='draw') msg = t('caroDraw');
  else if(winnerSlot===_caro.mySlot) msg = t('caroYouWin');
  else msg = t('caroYouLose');

  document.getElementById('caro-result-title').textContent = msg;

  if(isAI){
    document.getElementById('caro-result-body').innerHTML =
      '<div style="font-size:13px;color:#ccc;margin-bottom:8px;">'+escapeHtml(_caro.names[0])+' (●) vs '+escapeHtml(_caro.names[1])+' (○)</div>'+
      '<div class="caro-result-ai-note">'+t('caroAiNoPts')+'</div>';
  } else {
    let localOutcome = 'draw';
    if(winnerSlot !== 'draw'){
      localOutcome = winnerSlot === _caro.mySlot ? 'win' : 'loss';
    }
    const statsAfter = applyLocalCaroResult(localOutcome);
    const rank = statsAfter.rank;
    const ptsDelta = localOutcome==='win' ? '+25' : (localOutcome==='draw' ? '+8' : '+0');
    document.getElementById('caro-result-body').innerHTML =
      '<div style="font-size:13px;color:#ccc;margin-bottom:8px;">'+escapeHtml(_caro.names[0])+' (●) vs '+escapeHtml(_caro.names[1])+' (○)</div>'+
      '<div class="caro-result-rank">'+rank.icon+' <b>'+escapeHtml(rank.name)+'</b> · '+ptsDelta+' '+t('caroPts')+'</div>'+
      '<div class="caro-result-wld">'+t('caroWins')+': '+statsAfter.wins+' · '+t('caroLosses')+': '+statsAfter.losses+' · '+t('caroDraws')+': '+statsAfter.draws+' · '+t('caroWinRate', statsAfter.winRate)+'</div>';
    _caroRefreshHubStats();
  }

  setTimeout(()=>_caroShow('caro-result-panel'), 600);
  stopListeningRoom();
}

function _caroQuit(){
  caroMode = false;
  if(_caro && _caro.aiTimer) clearTimeout(_caro.aiTimer);
  _caro = null;
  _caroLobby = null;
  stopListeningRoom();
  _caroToggleChrome(false);
  const canvas = _caroGetCanvas();
  if(canvas){
    const ctx = canvas.getContext('2d');
    if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  document.getElementById('caro-stage')?.classList.remove('active');
  document.getElementById('grid-wrap')?.classList.remove('secret-mode');
  const badge = document.getElementById('mode-badge');
  if(badge){
    badge.textContent = typeof t === 'function' ? t('badgeNormal') : 'BÌNH THƯỜNG';
    badge.classList.remove('secret');
  }
  _caroHide('caro-result-panel');
  _caroHide('caro-lobby-panel');
  _caroHide('caro-hub-panel');
  _caroHide('caro-mm-panel');
  _caroHide('caro-ai-panel');
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

/** Khoá/mở phần online (tạo phòng / vào phòng / tìm đối thủ / BXH) theo Lv.
 *  "Đấu với máy" KHÔNG bị ảnh hưởng — luôn chơi được, kể cả offline. */
function _caroSetOnlineLocked(locked){
  const section = document.getElementById('caro-online-section');
  const note = document.getElementById('caro-online-locked-note');
  if(section) section.style.display = locked ? 'none' : '';
  if(note) note.style.display = locked ? '' : 'none';
}

function openCaroHub(){
  try{ sfxClick(); }catch(e){}
  _caroShow('caro-hub-panel');
  const locked = !canPlayCaro();
  _caroSetOnlineLocked(locked);
  if(locked) return; // vẫn hiện bảng — người chơi bấm "Đấu với máy" bình thường
  _caroRefreshHubStats();
  if(isOnlineServicesEnabled()) _caroRequireOnline();
}

async function _caroRefreshHubStats(){
  const box = document.getElementById('caro-hub-stats');
  if(!box) return;
  const stats = await fetchMyCaroStats();
  renderCaroStatsCard(box, stats);
}

function closeCaroHub(){
  cancelMatchmaking();
  if(_caroLobby) leaveOnlineRoom(_caroLobby.roomId).catch(()=>{});
  _caroLobby = null;
  stopListeningRoom();
  _caroHide('caro-hub-panel');
  _caroHide('caro-lobby-panel');
  _caroHide('caro-mm-panel');
  _caroHide('caro-ai-panel');
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
  if(!canPlayCaro()){ _caroStatus(t('caroNeedLevel', CARO_MIN_LEVEL), true); return; }
  if(!await _caroRequireOnline()) return;
  try{
    const { roomId, code } = await createOnlineRoom({ gameType:'caro' });
    _caroOpenLobby(roomId, code, 'host', { status:'open', hostName:getOnlineDisplayName(), gameType:'caro' });
    _caroStatus(t('onlineRoomCreated', code));
  }catch(e){ _caroStatus(e.message, true); }
}

async function caroJoinRoom(){
  if(!canPlayCaro()){ _caroStatus(t('caroNeedLevel', CARO_MIN_LEVEL), true); return; }
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
  if(!canPlayCaro()){ _caroStatus(t('caroNeedLevel', CARO_MIN_LEVEL), true); return; }
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
  function bind(){
    document.getElementById('caro-btn')?.addEventListener('click', openCaroHub);
    document.getElementById('caro-hub-close')?.addEventListener('click', closeCaroHub);

    // Chọn độ khó ngay trong hub (Dễ / TB / Khó → vào trận luôn)
    const hub = document.getElementById('caro-hub-panel');
    if(hub && !hub.dataset.aiBound){
      hub.dataset.aiBound = '1';
      let lastAiTap = 0;
      hub.addEventListener('click', (e)=>{
        const raw = e.target;
        const el = raw && raw.nodeType === 3 ? raw.parentElement : raw;
        const btn = el && typeof el.closest === 'function' ? el.closest('.caro-ai-level') : null;
        if(!btn || !hub.contains(btn)) return;
        e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        if(now - lastAiTap < 500) return;
        lastAiTap = now;
        caroStartAI(btn.getAttribute('data-level') || 'medium');
      });
    }

    document.getElementById('caro-create-btn')?.addEventListener('click', caroCreateRoom);
    document.getElementById('caro-join-btn')?.addEventListener('click', caroJoinRoom);
    document.getElementById('caro-find-btn')?.addEventListener('click', caroFindOpponent);
    document.getElementById('caro-mm-cancel')?.addEventListener('click', caroCancelMM);
    document.getElementById('caro-start-btn')?.addEventListener('click', caroStartMatch);
    document.getElementById('caro-lobby-leave')?.addEventListener('click', closeCaroHub);
    document.getElementById('caro-quit-btn')?.addEventListener('click', ()=>{ if(confirm(t('caroQuitConfirm'))) _caroQuit(); });
    document.getElementById('caro-result-close')?.addEventListener('click', _caroQuit);
    refreshCaroButton();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
