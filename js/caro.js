// ═══════════════════════════════════════════════════════════════
// js/caro.js — CỜ CARO 15×15 (X vs O · ô vuông)
// Luật: 5 quân liên tiếp thắng — CHẶN HAI ĐẦU thì không tính thắng.
// Host = X, Guest = O. Online dùng Firebase rooms/moves (gameType:'caro').
// ═══════════════════════════════════════════════════════════════

const CARO_MIN_LEVEL = 3;
const CARO_SIZE = 15;
const CARO_EMPTY = 0;
const CARO_X = 1; // host
const CARO_O = 2; // guest
const CARO_BLACK = CARO_X; // alias cũ
const CARO_WHITE = CARO_O;
const CARO_PREFS_KEY = 'chromablast_caro_prefs';
const CARO_TURN_NORMAL = 15;
const CARO_TURN_FAST = 10;

/** Cấu hình AI theo độ khó */
const CARO_AI_LEVELS = {
  easy:   { id:'easy',   thinkMs:280, mistakeRate:0.55, radius:2 },
  medium: { id:'medium', thinkMs:420, mistakeRate:0.15, radius:3 },
  hard:   { id:'hard',   thinkMs:560, mistakeRate:0.02, radius:3 },
};

/** Nền map xếp hình + màu X/O nổi bật theo từng nền */
const CARO_THEMES = {
  classic: { bg:['#2a2a3a','#1e1e2c'], cell:'rgba(255,255,255,0.06)', line:'rgba(255,255,255,0.18)', x:'#FF5A7A', o:'#4DE1FF', pad:'#161622' },
  slate:   { bg:['#4A4458','#2E2A3A'], cell:'rgba(255,255,255,0.07)', line:'rgba(255,255,255,0.2)',  x:'#FF6B8A', o:'#7CF5C8', pad:'#1c1826' },
  wood:    { bg:['#C9956A','#8B5E3C'], cell:'rgba(255,255,255,0.12)', line:'rgba(70,40,15,0.35)',   x:'#C41E3A', o:'#1E5AA8', pad:'#6a3e22' },
  garden:  { bg:['#3D7A4A','#1E4028'], cell:'rgba(255,255,255,0.1)',  line:'rgba(255,255,255,0.22)', x:'#FF4D6D', o:'#FFE566', pad:'#14301c' },
  ocean:   { bg:['#1A5F8A','#072438'], cell:'rgba(255,255,255,0.1)',  line:'rgba(180,230,255,0.25)', x:'#FF6B4A', o:'#FFE566', pad:'#041828' },
  night:   { bg:['#0B1026','#050812'], cell:'rgba(255,255,255,0.08)', line:'rgba(180,200,255,0.2)',  x:'#FF5CAD', o:'#7CFFB2', pad:'#03050e' },
  sunset:  { bg:['#FF8A5C','#2A1A40'], cell:'rgba(255,255,255,0.12)', line:'rgba(255,255,255,0.25)', x:'#FFF05A', o:'#5AD0FF', pad:'#1a1030' },
  ice:     { bg:['#E8F7FF','#7AB8D8'], cell:'rgba(255,255,255,0.35)', line:'rgba(30,80,120,0.25)',   x:'#E63946', o:'#1D3557', pad:'#5a9ab8' },
  lava:    { bg:['#2A0A00','#1A0500'], cell:'rgba(255,120,0,0.12)',   line:'rgba(255,140,40,0.35)',  x:'#FFE566', o:'#4DE1FF', pad:'#100300' },
  candy:   { bg:['#FFB6C8','#C9B6FF'], cell:'rgba(255,255,255,0.28)', line:'rgba(120,60,120,0.2)',   x:'#E91E63', o:'#3F51B5', pad:'#b08ad8' },
  neon:    { bg:['#0A0A14','#12102A'], cell:'rgba(0,255,200,0.06)',   line:'rgba(0,255,200,0.28)',   x:'#FF2D95', o:'#00FFC8', pad:'#060610' },
  sand:    { bg:['#E8D5A8','#C4A06A'], cell:'rgba(255,255,255,0.2)',  line:'rgba(90,60,20,0.28)',    x:'#C62828', o:'#1565C0', pad:'#a88850' },
  marble:  { bg:['#F5F0EA','#D8D0C8'], cell:'rgba(255,255,255,0.35)', line:'rgba(80,70,60,0.22)',    x:'#D32F2F', o:'#1976D2', pad:'#c0b8b0' },
  metal:   { bg:['#D8DCE2','#8A929C'], cell:'rgba(255,255,255,0.18)', line:'rgba(40,45,55,0.28)',    x:'#C62828', o:'#0D47A1', pad:'#6e7680' },
  paper:   { bg:['#F3E9D8','#E8D9C0'], cell:'rgba(255,255,255,0.3)',  line:'rgba(100,80,50,0.25)',   x:'#B71C1C', o:'#0D47A1', pad:'#d4c4a8' },
  pixel:   { bg:['#3A3A5A','#2A2A42'], cell:'rgba(255,255,255,0.08)', line:'rgba(255,255,255,0.22)', x:'#FF5252', o:'#40C4FF', pad:'#1e1e30' },
  forest:  { bg:['#1E3A22','#0F2214'], cell:'rgba(255,255,255,0.08)', line:'rgba(180,255,180,0.2)',  x:'#FF7043', o:'#FFEB3B', pad:'#0a160c' },
  sakura:  { bg:['#FFE4EC','#E8A0B8'], cell:'rgba(255,255,255,0.35)', line:'rgba(140,60,90,0.22)',   x:'#C2185B', o:'#4527A0', pad:'#d888a8' },
  aurora:  { bg:['#0E2A3A','#1A1040'], cell:'rgba(120,255,200,0.08)', line:'rgba(180,255,230,0.22)', x:'#FF4081', o:'#69F0AE', pad:'#0a1028' },
  retro:   { bg:['#1A0A2A','#220E34'], cell:'rgba(255,80,180,0.08)',  line:'rgba(255,120,200,0.28)', x:'#00E5FF', o:'#FFEA00', pad:'#12061e' },
  cloud:   { bg:['#87CEEB','#B0E0F0'], cell:'rgba(255,255,255,0.35)', line:'rgba(40,80,120,0.22)',   x:'#E53935', o:'#1E88E5', pad:'#6eb4d0' },
  ink:     { bg:['#2A2A3A','#000000'], cell:'rgba(255,255,255,0.06)', line:'rgba(255,255,255,0.18)', x:'#FF5252', o:'#40C4FF', pad:'#000' },
  gold:    { bg:['#FFF0C0','#8A6810'], cell:'rgba(255,255,255,0.2)',  line:'rgba(80,50,0,0.3)',      x:'#B71C1C', o:'#0D47A1', pad:'#6e5010' },
  mint:    { bg:['#C8F5E4','#3AA888'], cell:'rgba(255,255,255,0.28)', line:'rgba(20,80,60,0.25)',    x:'#D50000', o:'#1A237E', pad:'#2e8870' },
  berry:   { bg:['#8A2A4A','#2A0A18'], cell:'rgba(255,255,255,0.1)',  line:'rgba(255,180,200,0.22)', x:'#FFE566', o:'#80D8FF', pad:'#1a0610' },
  desert:  { bg:['#F0C878','#B07830'], cell:'rgba(255,255,255,0.18)', line:'rgba(90,50,10,0.28)',    x:'#C62828', o:'#1565C0', pad:'#906020' },
  coral:   { bg:['#FF7A6A','#2A6A8A'], cell:'rgba(255,255,255,0.15)', line:'rgba(255,255,255,0.28)', x:'#FFF176', o:'#E0F7FA', pad:'#1e4860' },
  storm:   { bg:['#3A4A6A','#0A101C'], cell:'rgba(255,255,255,0.08)', line:'rgba(180,200,255,0.22)', x:'#FF6E40', o:'#69F0AE', pad:'#060a12' },
  honey:   { bg:['#F5C84A','#A87810'], cell:'rgba(255,255,255,0.18)', line:'rgba(80,50,0,0.28)',     x:'#B71C1C', o:'#0D47A1', pad:'#886010' },
  violet:  { bg:['#5A2A8A','#1A0A30'], cell:'rgba(255,255,255,0.1)',  line:'rgba(220,180,255,0.25)', x:'#FFEA00', o:'#00E5FF', pad:'#100620' },
};

let caroMode = false;
let _caro = null;
let _caroLobby = null;
let _caroCanvasBound = false;
let _caroTimerId = null;
let _caroPrefsDraft = null;

function getCaroPrefs(){
  let p = { turnSec: CARO_TURN_NORMAL, skin: 'wood' };
  try{
    const raw = (typeof safeGet === 'function' ? safeGet(CARO_PREFS_KEY) : null) || localStorage.getItem(CARO_PREFS_KEY);
    if(raw){
      const j = JSON.parse(raw);
      if(j.turnSec === 10 || j.turnSec === 15) p.turnSec = j.turnSec;
      if(j.skin && CARO_THEMES[j.skin]) p.skin = j.skin;
    }
  }catch(e){}
  // Đồng bộ nền map đang dùng nếu có
  try{
    const active = document.documentElement.getAttribute('data-board-skin');
    if(active && CARO_THEMES[active] && !localStorage.getItem(CARO_PREFS_KEY)) p.skin = active;
  }catch(e){}
  return p;
}

function setCaroPrefs(patch){
  const p = Object.assign(getCaroPrefs(), patch || {});
  if(p.turnSec !== 10 && p.turnSec !== 15) p.turnSec = CARO_TURN_NORMAL;
  if(!CARO_THEMES[p.skin]) p.skin = 'wood';
  try{
    const s = JSON.stringify(p);
    if(typeof safeSet === 'function') safeSet(CARO_PREFS_KEY, s);
    else localStorage.setItem(CARO_PREFS_KEY, s);
  }catch(e){}
  _caroSyncPrefUI(p);
  return p;
}

function _caroTheme(){
  const skin = (_caro && _caro.skin) || getCaroPrefs().skin;
  return CARO_THEMES[skin] || CARO_THEMES.wood;
}

function _caroGetCanvas(){
  return document.getElementById('caro-canvas');
}

/** Layout ô vuông 15×15 (không còn kiểu giao điểm Go) */
function _caroMeasure(){
  const canvas = _caroGetCanvas();
  if(!canvas) return null;
  const wrap = canvas.parentElement;
  const maxW = Math.min((wrap && wrap.clientWidth) || 400, 460);
  const maxH = Math.min(window.innerHeight - 110, maxW);
  const cssSize = Math.floor(Math.min(maxW, maxH));
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);
  canvas.style.width = cssSize + 'px';
  canvas.style.height = cssSize + 'px';
  const pad = Math.max(8, cssSize * 0.035) * dpr;
  const inner = cssSize * dpr - pad * 2;
  const cell = inner / CARO_SIZE;
  const gap = Math.max(1, cell * 0.06);
  return { dpr, pad, cell, gap, px: cssSize * dpr };
}

function _caroCellRect(r, c, m){
  const x = m.pad + c * m.cell;
  const y = m.pad + r * m.cell;
  return { x, y, s: m.cell, inset: m.gap };
}

function _caroCellAt(px, py, m){
  const c = Math.floor((px - m.pad) / m.cell);
  const r = Math.floor((py - m.pad) / m.cell);
  if(r < 0 || r >= CARO_SIZE || c < 0 || c >= CARO_SIZE) return null;
  return { r, c };
}

function _caroRoundRect(ctx, x, y, w, h, rad){
  const r = Math.min(rad, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function _caroDrawMark(ctx, x, y, s, mark, theme, alpha){
  const inset = s * 0.18;
  const cx = x + s/2, cy = y + s/2;
  const size = s - inset * 2;
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Nền viên dễ thương
  _caroRoundRect(ctx, x + s*0.08, y + s*0.08, s*0.84, s*0.84, s*0.18);
  ctx.fillStyle = mark === CARO_X ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.18)';
  ctx.fill();

  const strokeMain = mark === CARO_X ? theme.x : theme.o;
  const lw = Math.max(2.5, s * 0.14);

  // Viền trắng để nổi trên mọi nền
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = lw + Math.max(2, s * 0.08);
  if(mark === CARO_X){
    ctx.beginPath();
    ctx.moveTo(cx - size*0.32, cy - size*0.32);
    ctx.lineTo(cx + size*0.32, cy + size*0.32);
    ctx.moveTo(cx + size*0.32, cy - size*0.32);
    ctx.lineTo(cx - size*0.32, cy + size*0.32);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw;
  if(mark === CARO_X){
    ctx.beginPath();
    ctx.moveTo(cx - size*0.32, cy - size*0.32);
    ctx.lineTo(cx + size*0.32, cy + size*0.32);
    ctx.moveTo(cx + size*0.32, cy - size*0.32);
    ctx.lineTo(cx - size*0.32, cy + size*0.32);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
    ctx.stroke();
  }
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
  const theme = _caroTheme();

  // Nền map
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, theme.bg[0]);
  g.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Khung bo góc
  const frame = Math.max(4, m.dpr * 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = frame;
  _caroRoundRect(ctx, frame, frame, W - frame*2, H - frame*2, m.dpr * 14);
  ctx.stroke();

  // Ô vuông
  for(let r = 0; r < CARO_SIZE; r++){
    for(let c = 0; c < CARO_SIZE; c++){
      const { x, y, s, inset } = _caroCellRect(r, c, m);
      _caroRoundRect(ctx, x + inset, y + inset, s - inset*2, s - inset*2, Math.max(2, s * 0.14));
      ctx.fillStyle = theme.cell;
      ctx.fill();
      ctx.strokeStyle = theme.line;
      ctx.lineWidth = Math.max(1, m.dpr * 0.8);
      ctx.stroke();
    }
  }

  // Quân X / O
  for(let r = 0; r < CARO_SIZE; r++){
    for(let c = 0; c < CARO_SIZE; c++){
      const v = _caro.board[r][c];
      if(!v) continue;
      const { x, y, s } = _caroCellRect(r, c, m);
      _caroDrawMark(ctx, x, y, s, v, theme, 1);
    }
  }

  // Preview
  if(_caro.hover && !_caro.winner && !_caro.aiThinking && _caro.turn === _caro.mySlot && !_caro.board[_caro.hover.r][_caro.hover.c]){
    const { x, y, s } = _caroCellRect(_caro.hover.r, _caro.hover.c, m);
    _caroDrawMark(ctx, x, y, s, _caroStone(_caro.mySlot), theme, 0.4);
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
  _caroUpdateMarks();
  _caroUpdateTimerUI();

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

function _caroUpdateMarks(){
  const el = document.getElementById('caro-marks');
  if(!el || !_caro) return;
  const meX = _caro.mySlot === 'host';
  const theme = _caroTheme();
  el.innerHTML = meX
    ? ('Bạn <b class="caro-x">X</b> · '+escapeHtml(_caro.names[1])+' <b class="caro-o">O</b>')
    : (escapeHtml(_caro.names[0])+' <b class="caro-x">X</b> · Bạn <b class="caro-o">O</b>');
  const x = el.querySelector('.caro-x');
  const o = el.querySelector('.caro-o');
  if(x) x.style.color = theme.x;
  if(o) o.style.color = theme.o;
}

function _caroStopTimer(){
  if(_caroTimerId){ clearInterval(_caroTimerId); _caroTimerId = null; }
}

function _caroUpdateTimerUI(){
  const el = document.getElementById('caro-timer');
  if(!el || !_caro) return;
  const left = Math.max(0, _caro.turnLeft == null ? (_caro.turnSec||15) : _caro.turnLeft);
  el.textContent = String(left);
  el.classList.toggle('danger', left <= 5);
  el.classList.toggle('mine', !_caro.winner && _caro.turn === _caro.mySlot && !_caro.aiThinking);
}

function _caroStartTurnTimer(){
  _caroStopTimer();
  if(!_caro || _caro.winner) return;
  const sec = _caro.turnSec || getCaroPrefs().turnSec || CARO_TURN_NORMAL;
  _caro.turnSec = sec;
  _caro.turnLeft = sec;
  _caro.turnEndsAt = Date.now() + sec * 1000;
  _caroUpdateTimerUI();
  _caroTimerId = setInterval(()=>{
    if(!_caro || _caro.winner){ _caroStopTimer(); return; }
    const left = Math.max(0, Math.ceil((_caro.turnEndsAt - Date.now()) / 1000));
    _caro.turnLeft = left;
    _caroUpdateTimerUI();
    if(left <= 0){
      _caroStopTimer();
      // AI không bị xử thua vì hết giờ suy nghĩ
      if(_caro.ai && _caro.turn !== _caro.mySlot){
        _caro.turnLeft = 0;
        return;
      }
      const loser = _caro.turn;
      const winner = _caroOpp(loser);
      _caroEndGame(winner);
    }
  }, 200);
}

function _caroApplyStageTheme(){
  const stage = document.getElementById('caro-stage');
  if(!stage) return;
  const theme = _caroTheme();
  stage.style.background = 'linear-gradient(165deg, '+theme.pad+' 0%, #0a0a12 100%)';
}

function _caroSyncRoomPrefsFromData(d){
  if(!d) return;
  const patch = {};
  if(d.turnSec === 10 || d.turnSec === 15) patch.turnSec = d.turnSec;
  if(d.boardSkin && CARO_THEMES[d.boardSkin]) patch.skin = d.boardSkin;
  if(Object.keys(patch).length) setCaroPrefs(patch);
}

function _caroApplyRoomMetaToGame(d){
  if(!_caro || !d) return;
  let changed = false;
  if(d.boardSkin && CARO_THEMES[d.boardSkin] && _caro.skin !== d.boardSkin){
    _caro.skin = d.boardSkin;
    changed = true;
  }
  if((d.turnSec === 10 || d.turnSec === 15) && _caro.turnSec !== d.turnSec){
    _caro.turnSec = d.turnSec;
    changed = true;
  }
  if(!changed) return;
  _caroApplyStageTheme();
  _caroStartTurnTimer();
  _caroRender();
}

function _caroSyncPrefUI(p){
  p = p || getCaroPrefs();
  document.querySelectorAll('.caro-seg-btn[data-turn]').forEach(btn=>{
    btn.classList.toggle('active', Number(btn.dataset.turn) === p.turnSec);
  });
  document.querySelectorAll('.caro-skin-chip').forEach(chip=>{
    chip.classList.toggle('active', chip.dataset.skin === p.skin);
  });
}

function canPlayCaro(){
  return typeof playerLevel !== 'undefined' && playerLevel >= CARO_MIN_LEVEL;
}

function refreshCaroButton(){
  const btn = document.getElementById('caro-btn');
  if(!btn) return;
  // Luôn hiện nút Caro — luyện máy không cần Lv.3; online vẫn khoá trong hub
  btn.style.display = 'flex';
  if(canPlayCaro()){
    btn.classList.add('caro-unlocked');
    btn.title = t('ttCaro');
  } else {
    btn.classList.remove('caro-unlocked');
    btn.title = t('ttCaroAi');
  }
}

function _caroShow(id){
  const el=document.getElementById(id);
  if(!el) return;
  el.classList.add('show');
  el.style.display = 'flex';
  if(id === 'caro-settings-panel') el.style.zIndex = '10070';
}
function _caroHide(id){
  const el=document.getElementById(id);
  if(!el) return;
  el.classList.remove('show');
  el.style.display = 'none';
}

function _caroStatus(msg, err){
  const el=document.getElementById('caro-online-status');
  if(!el) return;
  el.textContent = msg || '';
  el.className = 'online-status' + (err ? ' err' : '');
}

function _caroNewBoard(){
  return Array.from({length:CARO_SIZE}, ()=>Array(CARO_SIZE).fill(CARO_EMPTY));
}

function _caroStone(slot){ return slot === 'host' ? CARO_X : CARO_O; }
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
  const prefs = getCaroPrefs();

  // Đóng mọi panel Caro trước (ép display:none — tránh panel đè bàn cờ)
  ['caro-hub-panel','caro-ai-panel','caro-lobby-panel','caro-mm-panel','caro-result-panel','caro-rank-panel','caro-settings-panel']
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
    hover: null,
    turnSec: prefs.turnSec,
    skin: prefs.skin,
    turnLeft: prefs.turnSec
  };
  caroMode = true;
  _caroToggleChrome(true);
  _caroApplyStageTheme();

  const stage = document.getElementById('caro-stage');
  if(!stage){
    console.error('[caro-ai] thiếu #caro-stage trong DOM');
    try{ alert('Lỗi Caro: thiếu bàn cờ (#caro-stage)'); }catch(e){}
    return;
  }
  stage.classList.add('active');
  stage.style.display = 'flex';
  stage.style.zIndex = '10060';
  document.getElementById('grid-wrap')?.classList.add('secret-mode');
  const badge = document.getElementById('mode-badge');
  if(badge){
    badge.textContent = '⬛ CARO';
    badge.classList.add('secret');
  }

  const paint = ()=>{ try{ _caroRender(); }catch(e){ console.warn('[caro]', e); } };
  paint();
  requestAnimationFrame(()=>{ paint(); requestAnimationFrame(paint); });
  _caroStartTurnTimer();
  try{ startBgm('action'); }catch(e){}
}

function caroStartAI(levelId){
  // Chống double-fire (touchend + click)
  const now = Date.now();
  if(caroStartAI._last && now - caroStartAI._last < 600) return false;
  caroStartAI._last = now;
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
  _caroStartTurnTimer();

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
  const prefs = getCaroPrefs();
  const turnSec = roomData.turnSec === 10 || roomData.turnSec === 15 ? roomData.turnSec : prefs.turnSec;
  const skin = (roomData.boardSkin && CARO_THEMES[roomData.boardSkin]) ? roomData.boardSkin : prefs.skin;
  _caro = {
    board: _caroNewBoard(),
    turn: 'host',
    mySlot,
    roomId: roomData.roomId || _caroLobby?.roomId,
    online: true,
    moveSeq: 0,
    names: [roomData.hostName||'Host', roomData.guestName||'Guest'],
    winner: null,
    turnSec,
    skin,
    turnLeft: turnSec
  };
  caroMode = true;
  _caroHide('caro-lobby-panel');
  _caroHide('caro-hub-panel');
  _caroToggleChrome(true);
  _caroApplyStageTheme();
  const stage = document.getElementById('caro-stage');
  if(stage){
    stage.classList.add('active');
    stage.style.display = 'flex';
    stage.style.zIndex = '10060';
  }
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
    _caroStartTurnTimer();
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
    _caroApplyRoomMetaToGame(d);
    if(d.status==='finished' && d.winnerId){
      const winSlot = d.winnerId===d.hostId ? 'host' : 'guest';
      if(!_caro.winner) _caroEndGame(winSlot, true);
    }
  });

  _caroRender();
  _caroStartTurnTimer();
  try{ startBgm('action'); }catch(e){}
}

function _caroEndGame(winnerSlot, fromRemote){
  if(!_caro) return;
  _caro.winner = winnerSlot;
  _caro.aiThinking = false;
  _caroStopTimer();
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
      '<div style="font-size:13px;color:#ccc;margin-bottom:8px;">'+escapeHtml(_caro.names[0])+' (<b class="caro-x">X</b>) vs '+escapeHtml(_caro.names[1])+' (<b class="caro-o">O</b>)</div>'+
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
      '<div style="font-size:13px;color:#ccc;margin-bottom:8px;">'+escapeHtml(_caro.names[0])+' (<b class="caro-x">X</b>) vs '+escapeHtml(_caro.names[1])+' (<b class="caro-o">O</b>)</div>'+
      '<div class="caro-result-rank">'+rank.icon+' <b>'+escapeHtml(rank.name)+'</b> · '+ptsDelta+' '+t('caroPts')+'</div>'+
      '<div class="caro-result-wld">'+t('caroWins')+': '+statsAfter.wins+' · '+t('caroLosses')+': '+statsAfter.losses+' · '+t('caroDraws')+': '+statsAfter.draws+' · '+t('caroWinRate', statsAfter.winRate)+'</div>';
    _caroRefreshHubStats();
  }

  setTimeout(()=>{
    const rp = document.getElementById('caro-result-panel');
    if(rp) rp.style.zIndex = '10070';
    _caroShow('caro-result-panel');
  }, 600);
  stopListeningRoom();
}

function _caroQuit(){
  caroMode = false;
  _caroStopTimer();
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
  const stage = document.getElementById('caro-stage');
  if(stage){
    stage.classList.remove('active');
    stage.style.display = 'none';
    stage.style.zIndex = '';
    stage.style.background = '';
  }
  document.getElementById('grid-wrap')?.classList.remove('secret-mode');
  const badge = document.getElementById('mode-badge');
  if(badge){
    badge.textContent = typeof t === 'function' ? t('badgeNormal') : 'BÌNH THƯỜNG';
    badge.classList.remove('secret');
  }
  ['caro-hub-panel','caro-lobby-panel','caro-mm-panel','caro-result-panel','caro-rank-panel','caro-ai-panel','caro-settings-panel']
    .forEach(id=>{
      const el=document.getElementById(id);
      if(el){ el.classList.remove('show'); el.style.display=''; }
    });
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
  _caroSyncPrefUI(getCaroPrefs());
  const locked = !canPlayCaro();
  _caroSetOnlineLocked(locked);
  if(locked) return;
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
    _caroSyncRoomPrefsFromData(d);
    _caroRenderLobby(d);
    if(d.status==='playing' && !caroMode) _caroEnterGame({ roomId, ...d });
  });
}

function _caroRenderLobby(d){
  const host = d.hostName || '?';
  const guest = d.guestName || t('onlineWaiting');
  document.getElementById('caro-lobby-players').innerHTML =
    '<div class="online-player"><span class="caro-x">X</span> '+escapeHtml(host)+'</div>'+
    '<div class="online-player"><span class="caro-o">O</span> '+escapeHtml(guest)+'</div>';
  const startBtn = document.getElementById('caro-start-btn');
  const isHost = _caroLobby && _caroLobby.role==='host';
  if(startBtn) startBtn.style.display = (isHost && d.status==='ready' && d.guestId) ? 'block' : 'none';
  _caroSyncPrefUI(getCaroPrefs());
}

async function caroCreateRoom(){
  if(!canPlayCaro()){ _caroStatus(t('caroNeedLevel', CARO_MIN_LEVEL), true); return; }
  if(!await _caroRequireOnline()) return;
  try{
    const prefs = getCaroPrefs();
    const { roomId, code } = await createOnlineRoom({
      gameType:'caro', turnSec: prefs.turnSec, boardSkin: prefs.skin
    });
    _caroOpenLobby(roomId, code, 'host', {
      status:'open', hostName:getOnlineDisplayName(), gameType:'caro',
      turnSec: prefs.turnSec, boardSkin: prefs.skin
    });
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
    const prefs = getCaroPrefs();
    await startOnlineRoomMatch(_caroLobby.roomId, {
      turnSec: prefs.turnSec,
      boardSkin: prefs.skin
    });
  }catch(e){ _caroStatus(e.message, true); }
}

function _caroSelectSkinDraft(id, container){
  const base = _caroPrefsDraft || getCaroPrefs();
  _caroPrefsDraft = Object.assign({}, base, { skin: id });
  _caroSyncPrefUI(_caroPrefsDraft);
  if(container) container.querySelectorAll('.caro-skin-chip').forEach(c=>c.classList.toggle('active', c.dataset.skin===id));
}

function _caroFillSkinGrid(container){
  if(!container) return;
  const prefs = _caroPrefsDraft || getCaroPrefs();
  const list = (typeof BOARD_SKINS !== 'undefined' && Array.isArray(BOARD_SKINS))
    ? BOARD_SKINS.map(s => s.id).filter(id => CARO_THEMES[id])
    : Object.keys(CARO_THEMES);
  container.innerHTML = '';
  list.forEach(id=>{
    const th = CARO_THEMES[id];
    if(!th) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'caro-skin-chip' + (prefs.skin === id ? ' active' : '');
    btn.dataset.skin = id;
    btn.title = id;
    btn.style.background = 'linear-gradient(135deg,'+th.bg[0]+','+th.bg[1]+')';
    btn.innerHTML = '<span class="caro-skin-xo"><i style="color:'+th.x+'">X</i><i style="color:'+th.o+'">O</i></span><small>'+id+'</small>';
    const pick = (e)=>{
      if(e){ e.preventDefault(); e.stopPropagation(); }
      _caroSelectSkinDraft(id, container);
    };
    btn.addEventListener('click', pick);
    container.appendChild(btn);
  });
}

function openCaroSettings(fromGame){
  try{ sfxClick(); }catch(e){}
  _caroPrefsDraft = Object.assign({}, getCaroPrefs());
  if(_caro && _caro.skin) _caroPrefsDraft.skin = _caro.skin;
  if(_caro && _caro.turnSec) _caroPrefsDraft.turnSec = _caro.turnSec;
  _caroFillSkinGrid(document.getElementById('caro-skin-grid'));
  _caroSyncPrefUI(_caroPrefsDraft);
  _caroShow('caro-settings-panel');
}

function applyCaroSettings(){
  const draft = _caroPrefsDraft || getCaroPrefs();
  const p = setCaroPrefs(draft);
  _caroHide('caro-settings-panel');
  if(_caro && !_caro.winner){
    _caro.skin = p.skin;
    _caro.turnSec = p.turnSec;
    _caroApplyStageTheme();
    _caroStartTurnTimer();
    _caroRender();
  }
  const roomId = (_caro && _caro.roomId) || (_caroLobby && _caroLobby.roomId);
  if(roomId && typeof updateOnlineRoomMeta === 'function'){
    updateOnlineRoomMeta(roomId, { turnSec: p.turnSec, boardSkin: p.skin }).catch(()=>{});
    if(_caroLobby) _caroLobby.roomData = Object.assign({}, _caroLobby.roomData || {}, { turnSec: p.turnSec, boardSkin: p.skin });
  }
  try{ sfxClick(); }catch(e){}
}

(function initCaro(){
  function bindAiButtons(){
    const start = (level)=>{
      try{ caroStartAI(level || 'medium'); }catch(e){ console.error('[caro-ai]', e); }
    };
    const wire = (el, level)=>{
      if(!el || el.dataset.aiWired === '1') return;
      el.dataset.aiWired = '1';
      el.addEventListener('click', (e)=>{
        if(e){ e.stopPropagation(); }
        start(level || el.getAttribute('data-level') || 'medium');
      });
    };
    wire(document.getElementById('caro-ai-start-btn'), 'medium');
    wire(document.getElementById('caro-ai-easy'), 'easy');
    wire(document.getElementById('caro-ai-medium'), 'medium');
    wire(document.getElementById('caro-ai-hard'), 'hard');
    document.querySelectorAll('.caro-ai-level').forEach(btn=>{
      wire(btn, btn.getAttribute('data-level'));
    });
  }

  function bindPrefs(){
    document.querySelectorAll('.caro-hub-turn, .caro-lobby-turn, #caro-turn-15, #caro-turn-10').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const turn = Number(btn.dataset.turn) === 10 ? 10 : 15;
        if(_caroPrefsDraft) _caroPrefsDraft.turnSec = turn;
        const inSettings = document.getElementById('caro-settings-panel')?.classList.contains('show');
        if(inSettings){
          _caroSyncPrefUI(_caroPrefsDraft || getCaroPrefs());
        } else {
          setCaroPrefs({ turnSec: turn });
          const roomId = _caroLobby && _caroLobby.roomId;
          if(roomId && typeof updateOnlineRoomMeta === 'function'){
            updateOnlineRoomMeta(roomId, { turnSec: turn }).catch(()=>{});
          }
        }
        if(_caro && !_caro.winner){
          _caro.turnSec = turn;
          _caroStartTurnTimer();
        }
      });
    });
    document.getElementById('caro-hub-skin-btn')?.addEventListener('click', ()=> openCaroSettings(false));
    document.getElementById('caro-lobby-skin-btn')?.addEventListener('click', ()=> openCaroSettings(false));
    document.getElementById('caro-settings-btn')?.addEventListener('click', ()=> openCaroSettings(true));
    document.getElementById('caro-settings-close')?.addEventListener('click', ()=> _caroHide('caro-settings-panel'));
    document.getElementById('caro-settings-apply')?.addEventListener('click', applyCaroSettings);
    _caroSyncPrefUI(getCaroPrefs());
  }

  function bind(){
    document.getElementById('caro-btn')?.addEventListener('click', openCaroHub);
    document.getElementById('caro-hub-close')?.addEventListener('click', closeCaroHub);
    bindAiButtons();
    bindPrefs();

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
