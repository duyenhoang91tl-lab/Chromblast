// ═══════════════════════════════════════════════════════════════
// js/caro.js — CỜ CARO 15×15 (X vs O · ô vuông)
// Luật: 5 quân liên tiếp thắng — CHẶN HAI ĐẦU thì không tính thắng.
// Host = X, Guest = O. Online dùng Firebase rooms/moves (gameType:'caro').
// ═══════════════════════════════════════════════════════════════

const CARO_MIN_LEVEL = 1;
const CARO_SIZE = 15;
const CARO_EMPTY = 0;
const CARO_X = 1; // host
const CARO_O = 2; // guest
const CARO_BLACK = CARO_X; // alias cũ
const CARO_WHITE = CARO_O;
const CARO_PREFS_KEY = 'chromablast_caro_prefs';
const CARO_TURN_NORMAL = 15;
const CARO_TURN_FAST = 10;

/** Cấu hình AI theo độ khó — depth càng cao càng “đọc” nước trước.
 *  pickBand: biên độ (theo % điểm cao nhất) cho phép random giữa các nước gần-tốt-nhất —
 *  0 = luôn chọn đúng nước tốt nhất (chỉ random khi thật sự hòa điểm tuyệt đối). */
const CARO_AI_LEVELS = {
  easy:     { id:'easy',     thinkMs:320, mistakeRate:0.28, radius:2, depth:1, topN:8,  pickBand:0.15 },
  medium:   { id:'medium',   thinkMs:500, mistakeRate:0.03, radius:3, depth:3, topN:10, pickBand:0.05 },
  hard:     { id:'hard',     thinkMs:700, mistakeRate:0,    radius:4, depth:4, topN:12, pickBand:0.015 },
  extreme:  { id:'extreme',  thinkMs:900, mistakeRate:0,    radius:5, depth:5, topN:8,  pickBand:0 },
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
  sweet:   { bg:['#FFB6C8','#C9B6FF'], cell:'rgba(255,255,255,0.28)', line:'rgba(120,60,120,0.2)',   x:'#E91E63', o:'#3F51B5', pad:'#b08ad8' },
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
let _caroLastOpenRooms = [];
// Trạng thái phóng to / thu nhỏ bàn cờ bằng 2 ngón tay (pinch-to-zoom)
let _caroZoom = { scale: 1, tx: 0, ty: 0 };
const CARO_ZOOM_MIN = 1;
const CARO_ZOOM_MAX = 3;

function _caroBoardSkinUnlocked(id){
  if(!id || !CARO_THEMES[id]) return false;
  if(typeof isBoardSkinUnlocked === 'function') return !!isBoardSkinUnlocked(id);
  // Fallback nếu map-boards chưa nạp: chỉ cho classic/slate (starter)
  return id === 'classic' || id === 'slate';
}

function _caroDefaultUnlockedSkin(){
  try{
    if(typeof getActiveBoardSkin === 'function'){
      const a = getActiveBoardSkin();
      if(_caroBoardSkinUnlocked(a)) return a;
    }
  }catch(e){}
  if(_caroBoardSkinUnlocked('slate')) return 'slate';
  if(_caroBoardSkinUnlocked('classic')) return 'classic';
  if(typeof getUnlockedBoardSkinIds === 'function'){
    const ids = getUnlockedBoardSkinIds() || [];
    const hit = ids.find(id => CARO_THEMES[id]);
    if(hit) return hit;
  }
  return 'slate';
}

function getCaroPrefs(){
  let p = { turnSec: CARO_TURN_NORMAL, skin: _caroDefaultUnlockedSkin() };
  try{
    const raw = (typeof safeGet === 'function' ? safeGet(CARO_PREFS_KEY) : null) || localStorage.getItem(CARO_PREFS_KEY);
    if(raw){
      const j = JSON.parse(raw);
      if(j.turnSec === 10 || j.turnSec === 15) p.turnSec = j.turnSec;
      let skin = j.skin === 'candy' ? 'sweet' : j.skin;
      if(skin && CARO_THEMES[skin] && _caroBoardSkinUnlocked(skin)) p.skin = skin;
    }
  }catch(e){}
  // Đồng bộ nền map đang dùng nếu chưa có prefs riêng và nền đó đã mở
  try{
    if(!localStorage.getItem(CARO_PREFS_KEY)){
      const active = document.documentElement.getAttribute('data-board-skin');
      if(active && CARO_THEMES[active] && _caroBoardSkinUnlocked(active)) p.skin = active;
    }
  }catch(e){}
  if(!_caroBoardSkinUnlocked(p.skin)) p.skin = _caroDefaultUnlockedSkin();
  return p;
}

function setCaroPrefs(patch){
  const p = Object.assign(getCaroPrefs(), patch || {});
  if(p.turnSec !== 10 && p.turnSec !== 15) p.turnSec = CARO_TURN_NORMAL;
  if(!CARO_THEMES[p.skin] || !_caroBoardSkinUnlocked(p.skin)) p.skin = _caroDefaultUnlockedSkin();
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
  const rect = wrap ? wrap.getBoundingClientRect() : null;
  const maxW = (rect && rect.width) || (wrap && wrap.clientWidth) || window.innerWidth || 400;
  const maxH = (rect && rect.height) || (wrap && wrap.clientHeight) || (window.innerHeight - 110) || 400;
  // An toàn: không bao giờ để cssSize = 0/NaN (tránh mất hẳn bàn cờ khi layout chưa ổn định)
  const cssSize = Math.floor(Math.min(maxW, maxH)) || Math.floor(Math.min(window.innerWidth, window.innerHeight - 110)) || 400;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);
  canvas.style.width = cssSize + 'px';
  canvas.style.height = cssSize + 'px';
  const pad = Math.max(8, cssSize * 0.035) * dpr;
  const inner = cssSize * dpr - pad * 2;
  const cell = inner / CARO_SIZE;
  const gap = 0; // Các ô chạm nhau, chỉ ngăn cách bằng kẻ vạch — không còn khe hở giữa ô
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
  // Bảo vệ cuối: nếu vì lý do gì đó vẫn đo ra kích thước bất thường (khung ẩn/0),
  // không vẽ bàn cờ méo — thử đo lại ở frame kế tiếp thay vì để trống.
  if(!m.px || m.px < 20){
    requestAnimationFrame(()=>{ if(caroMode) _caroDrawBoard(); });
    return;
  }
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

 // 1. Tô nền chung cho toàn bộ bàn cờ Caro
  ctx.fillStyle = theme.cell;
  ctx.fillRect(m.pad, m.pad, m.cell * CARO_SIZE, m.cell * CARO_SIZE);

  // 2. Kẻ các vạch ngang và dọc phân ô
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = Math.max(1, m.dpr * 0.8);
  ctx.beginPath();

  for (let i = 0; i <= CARO_SIZE; i++) {
    // Vạch dọc
    const x = m.pad + i * m.cell;
    ctx.moveTo(x, m.pad);
    ctx.lineTo(x, m.pad + CARO_SIZE * m.cell);

    // Vạch ngang
    const y = m.pad + i * m.cell;
    ctx.moveTo(m.pad, y);
    ctx.lineTo(m.pad + CARO_SIZE * m.cell, y);
  }
  ctx.stroke();

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

const _caroActivePointers = new Map();
let _caroPlaceTimer = null;

function _caroOnPointerDown(ev){
  if(!caroMode || !_caro || _caro.winner || _caro.aiThinking) return;
  ev.preventDefault();
  _caroActivePointers.set(ev.pointerId, true);
  if(_caroPlaceTimer){ clearTimeout(_caroPlaceTimer); _caroPlaceTimer = null; }
  // Nếu có từ 2 ngón tay trở lên đang chạm (đang chụm để zoom) thì không đặt quân
  if(_caroActivePointers.size > 1) return;
  const pos = _caroPointerPos(ev);
  if(!pos || !_caro.metrics) return;
  const cell = _caroCellAt(pos.px, pos.py, _caro.metrics);
  if(!cell) return;
  // Đợi một nhịp ngắn để chắc chắn đây là chạm 1 ngón (không phải vừa bắt đầu chụm 2 ngón)
  _caroPlaceTimer = setTimeout(()=>{
    _caroPlaceTimer = null;
    if(_caroActivePointers.size > 1) return;
    if(_caro.turn !== _caro.mySlot) return;
    _caroApplyMove(cell.r, cell.c, _caro.mySlot, false);
  }, 60);
}

function _caroOnPointerUp(ev){
  _caroActivePointers.delete(ev.pointerId);
}

function _caroApplyZoomTransform(){
  const canvas = _caroGetCanvas();
  if(!canvas) return;
  const z = _caroZoom;
  canvas.style.transformOrigin = '0 0';
  canvas.style.transform = `translate(${z.tx}px, ${z.ty}px) scale(${z.scale})`;
}

function _caroZoomClampPan(){
  const canvas = _caroGetCanvas();
  const wrap = canvas && canvas.parentElement;
  if(!canvas || !wrap) return;
  const z = _caroZoom;
  const baseW = canvas.clientWidth || canvas.offsetWidth;
  const baseH = canvas.clientHeight || canvas.offsetHeight;
  if(!baseW || !baseH) return;
  const scaledW = baseW * z.scale;
  const scaledH = baseH * z.scale;
  const wrapW = wrap.clientWidth;
  const wrapH = wrap.clientHeight;
  // Vị trí canvas gốc (chưa transform) đã được canh giữa bởi flex, nên offset gốc là (wrapW-baseW)/2
  const baseLeft = (wrapW - baseW) / 2;
  const baseTop = (wrapH - baseH) / 2;
  const minTx = Math.min(0, wrapW - scaledW - baseLeft) - baseLeft;
  const maxTx = Math.max(0, -baseLeft);
  const minTy = Math.min(0, wrapH - scaledH - baseTop) - baseTop;
  const maxTy = Math.max(0, -baseTop);
  z.tx = Math.min(Math.max(z.tx, minTx), maxTx);
  z.ty = Math.min(Math.max(z.ty, minTy), maxTy);
}

function _caroResetZoom(){
  _caroZoom = { scale: 1, tx: 0, ty: 0 };
  const canvas = _caroGetCanvas();
  if(canvas){ canvas.style.transform = ''; canvas.style.transformOrigin = ''; }
}

function _caroDist(t0, t1){
  const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY;
  return Math.hypot(dx, dy);
}

function _caroBindPinchZoom(){
  const canvas = _caroGetCanvas();
  const wrap = canvas && canvas.parentElement;
  if(!canvas || !wrap) return;
  let pinch = null; // { startDist, startScale, startTx, startTy, midX, midY }
  let panTouch = null; // 1 ngón khi đã zoom, để kéo bàn cờ xem các phần bị che

  wrap.addEventListener('touchstart', (ev)=>{
    if(!caroMode) return;
    if(ev.touches.length === 2){
      ev.preventDefault();
      panTouch = null;
      const rect = wrap.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const baseW = canvas.clientWidth || canvas.offsetWidth;
      const baseH = canvas.clientHeight || canvas.offsetHeight;
      const t0 = ev.touches[0], t1 = ev.touches[1];
      pinch = {
        startDist: _caroDist(t0, t1),
        startScale: _caroZoom.scale,
        startTx: _caroZoom.tx,
        startTy: _caroZoom.ty,
        // Vị trí tự nhiên (chưa transform) của canvas trong khung, dùng để quy đổi toạ độ
        baseLeft: (canvasRect.left - rect.left) - _caroZoom.tx,
        baseTop: (canvasRect.top - rect.top) - _caroZoom.ty,
        midX: (t0.clientX + t1.clientX) / 2 - rect.left,
        midY: (t0.clientY + t1.clientY) / 2 - rect.top
      };
    } else if(ev.touches.length === 1 && _caroZoom.scale > 1){
      panTouch = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, startTx: _caroZoom.tx, startTy: _caroZoom.ty };
    }
  }, { passive: false });

  wrap.addEventListener('touchmove', (ev)=>{
    if(!caroMode) return;
    if(pinch && ev.touches.length === 2){
      ev.preventDefault();
      const t0 = ev.touches[0], t1 = ev.touches[1];
      const dist = _caroDist(t0, t1);
      const ratio = dist / (pinch.startDist || dist);
      let scale = pinch.startScale * ratio;
      scale = Math.min(Math.max(scale, CARO_ZOOM_MIN), CARO_ZOOM_MAX);
      // Giữ nguyên điểm giữa 2 ngón tay khi phóng to / thu nhỏ (quy đổi theo vị trí gốc của canvas)
      const scaleDelta = scale / pinch.startScale;
      _caroZoom.scale = scale;
      _caroZoom.tx = (pinch.midX - pinch.baseLeft) * (1 - scaleDelta) + pinch.startTx * scaleDelta;
      _caroZoom.ty = (pinch.midY - pinch.baseTop) * (1 - scaleDelta) + pinch.startTy * scaleDelta;
      _caroZoomClampPan();
      _caroApplyZoomTransform();
    } else if(panTouch && ev.touches.length === 1){
      ev.preventDefault();
      const t = ev.touches[0];
      _caroZoom.tx = panTouch.startTx + (t.clientX - panTouch.x);
      _caroZoom.ty = panTouch.startTy + (t.clientY - panTouch.y);
      _caroZoomClampPan();
      _caroApplyZoomTransform();
    }
  }, { passive: false });

  const endTouch = (ev)=>{
    if(ev.touches.length < 2) pinch = null;
    if(ev.touches.length === 0){
      panTouch = null;
      // Về gần 1x thì snap lại đúng vị trí gốc cho gọn gàng
      if(_caroZoom.scale <= CARO_ZOOM_MIN + 0.02) _caroResetZoom();
    }
  };
  wrap.addEventListener('touchend', endTouch, { passive: true });
  wrap.addEventListener('touchcancel', endTouch, { passive: true });
}

function _caroBindCanvas(){
  if(_caroCanvasBound) return;
  const canvas = _caroGetCanvas();
  if(!canvas) return;
  _caroCanvasBound = true;
  canvas.addEventListener('pointerdown', _caroOnPointerDown);
  canvas.addEventListener('pointermove', _caroOnPointerMove);
  canvas.addEventListener('pointerup', _caroOnPointerUp);
  canvas.addEventListener('pointercancel', _caroOnPointerUp);
  canvas.addEventListener('pointerleave', ()=>{
    if(_caro && _caro.hover){ _caro.hover = null; _caroDrawBoard(); }
  });
  const _caroRedrawSafe = ()=>{
    if(!caroMode) return;
    _caroResetZoom();
    _caroDrawBoard();
    // Vẽ lại thêm 2 frame sau để tự sửa nếu phép đo layout ban đầu bị lệch (0/tạm thời)
    requestAnimationFrame(()=>{ if(caroMode) _caroDrawBoard(); requestAnimationFrame(()=>{ if(caroMode) _caroDrawBoard(); }); });
  };
  window.addEventListener('resize', _caroRedrawSafe);
  window.addEventListener('orientationchange', ()=>setTimeout(_caroRedrawSafe, 120));
  // Trình duyệt tablet/desktop: khi đổi tab rồi quay lại, hoặc kéo giãn cửa sổ,
  // layout có thể đo lệch một nhịp — theo dõi trực tiếp khung chứa để tự vẽ lại,
  // đáng tin cậy hơn nhiều so với chỉ nghe sự kiện 'resize' của window.
  const wrapEl = canvas.parentElement;
  if(wrapEl && typeof ResizeObserver !== 'undefined'){
    let _caroRoTimer = null;
    const ro = new ResizeObserver(()=>{
      if(!caroMode) return;
      clearTimeout(_caroRoTimer);
      _caroRoTimer = setTimeout(_caroRedrawSafe, 30);
    });
    ro.observe(wrapEl);
  }
  document.addEventListener('visibilitychange', ()=>{
    if(!document.hidden && caroMode) _caroRedrawSafe();
  });
  _caroBindPinchZoom();
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
  _caroUpdateOppChip();
}

function _caroOppSlot(){
  if(!_caro) return 'guest';
  return _caro.mySlot === 'host' ? 'guest' : 'host';
}

function _caroUpdateOppChip(){
  if(!_caro) return;
  const opp = _caroOppSlot();
  const idx = opp === 'host' ? 0 : 1;
  const name = _caro.names[idx] || '—';
  const av = (_caro.avatars && _caro.avatars[idx]) || '🐶';
  const uid = (_caro.ids && _caro.ids[idx]) || null;
  const avBtn = document.getElementById('caro-opp-avatar');
  const nameEl = document.getElementById('caro-opp-name');
  const chip = document.getElementById('caro-opp-chip');
  if(avBtn){
    if(typeof applyAvatarElement === 'function') applyAvatarElement(avBtn, av);
    else avBtn.textContent = av;
    avBtn.dataset.uid = uid || '';
    avBtn.dataset.name = name;
    avBtn.dataset.avatar = isCustomPlayerAvatar && isCustomPlayerAvatar(av) ? '📷' : av;
    avBtn.disabled = !!_caro.ai || !uid;
  }
  if(nameEl) nameEl.textContent = name;
  if(chip) chip.classList.toggle('tappable', !_caro.ai && !!uid);
  _caroUpdateMeChip();
  try{ if(window.CaroSocial && CaroSocial.renderCoupleHud) CaroSocial.renderCoupleHud(); }catch(e){}
}

function _caroUpdateMeChip(){
  if(!_caro) return;
  const nameEl = document.getElementById('caro-me-name');
  const avBtn = document.getElementById('caro-me-avatar');
  const nick = (typeof getPlayerNickname === 'function' ? getPlayerNickname() : null)
    || (_caro.mySlot === 'host' ? _caro.names[0] : _caro.names[1])
    || 'Bạn';
  const av = (typeof getPlayerAvatarDisplay === 'function'
    ? getPlayerAvatarDisplay()
    : (typeof getPlayerAvatar === 'function' ? getPlayerAvatar() : '🐶'));
  if(nameEl) nameEl.textContent = nick;
  if(avBtn){
    if(typeof applyAvatarElement === 'function') applyAvatarElement(avBtn, av);
    else avBtn.textContent = (typeof getPlayerAvatar === 'function' ? getPlayerAvatar() : '🐶');
  }
  try{
    if(window.CaroSocial && CaroSocial.renderFxBar) CaroSocial.renderFxBar();
  }catch(e){}
}

async function openPlayerCard(opts){
  opts = opts || {};
  const panel = document.getElementById('player-card-panel');
  if(!panel) return;
  const uid = opts.uid || null;
  const fallbackName = opts.name || 'Player';
  const fallbackAv = opts.avatar || '🐶';
  document.getElementById('pc-avatar').textContent = fallbackAv;
  document.getElementById('pc-name').textContent = fallbackName;
  document.getElementById('pc-stats').textContent = (typeof t==='function'?t('caroNoStats'):'…');
  const friendBtn = document.getElementById('pc-friend-btn');
  const msg = document.getElementById('pc-msg');
  if(msg) msg.textContent = '';
  if(friendBtn){
    friendBtn.dataset.uid = uid || '';
    friendBtn.dataset.name = fallbackName;
    friendBtn.dataset.avatar = fallbackAv;
    const already = uid && typeof isFriend === 'function' && isFriend(uid);
    const pending = uid && typeof hasOutgoingFriendRequest === 'function' && hasOutgoingFriendRequest(uid);
    friendBtn.disabled = !uid || already || pending;
    friendBtn.textContent = already
      ? (typeof t==='function'?t('caroAlreadyFriend'):'Đã là bạn')
      : pending
        ? (typeof t==='function'?t('caroFriendRequestedShort'):'Đã mời')
        : (typeof t==='function'?t('caroAddFriend'):'🤝 Kết bạn');
  }
  panel.classList.add('show');
  if(!uid || typeof fetchPlayerPublicProfile !== 'function') return;
  try{
    const prof = await fetchPlayerPublicProfile(uid);
    if(!prof) return;
    document.getElementById('pc-avatar').textContent = prof.avatar || fallbackAv;
    document.getElementById('pc-name').textContent = prof.displayName || fallbackName;
    const s = prof.stats || {};
    const rate = s.winRate != null ? s.winRate : 0;
    const line = (typeof t==='function'
      ? (t('caroWinRateLabel')+': '+rate+'% · '+t('ppCaroWLD', s.wins||0, s.losses||0, s.draws||0, rate))
      : (rate+'%'));
    document.getElementById('pc-stats').textContent = (s.total > 0 || s.points > 0) ? line : (typeof t==='function'?t('caroNoStats'):'Chưa có thống kê');
    if(friendBtn){
      friendBtn.dataset.name = prof.displayName || fallbackName;
      friendBtn.dataset.avatar = prof.avatar || fallbackAv;
    }
  }catch(e){}
}

function closePlayerCard(){
  document.getElementById('player-card-panel')?.classList.remove('show');
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

function _caroCaroOverlayIds(){
  return [
    'caro-stage',
    'caro-hub-panel',
    'caro-lobby-panel',
    'caro-mm-panel',
    'caro-ai-panel',
    'caro-settings-panel',
    'caro-result-panel',
    'caro-rank-panel',
    'player-card-panel'
  ];
}

function _caroApplyStageTheme(){
  const stage = document.getElementById('caro-stage');
  if(!stage) return;
  // Nền đục — CSS body.mode-caro / sky-atmosphere đảm bảo không lộ Chromablast
  stage.style.background = '';
}

function _caroSetGameRootHidden(hide){
  const root = document.getElementById('game-root');
  if(!root) return;
  // #caro-stage và panel Caro nằm TRONG #game-root — ẩn root bằng
  // visibility:hidden + body.mode-caro ẩn cứng HUD/bàn gạch; con Caro vẫn hiện.
  if(hide){
    try{ if(typeof setExclusivePlayMode === 'function') setExclusivePlayMode('caro'); }catch(e){}
    root.dataset.caroPrevVis = root.style.visibility || '';
    root.style.visibility = 'hidden';
    _caroCaroOverlayIds().forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      if(!('caroPrevVis' in el.dataset)){
        el.dataset.caroPrevVis = el.style.visibility || '';
      }
      el.style.visibility = 'visible';
    });
    // Gỡ glow vàng secret-mode / combo để không lộ vạch hai bên
    const gw = document.getElementById('grid-wrap');
    if(gw){
      gw.classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5','fire-low','fire-mid','fire-high','fire-max');
    }
  } else {
    try{
      if(typeof setExclusivePlayMode === 'function'){
        setExclusivePlayMode(document.body.classList.contains('mode-versus') ? 'versus' : null);
      }
    }catch(e){}
    if('caroPrevVis' in root.dataset){
      root.style.visibility = root.dataset.caroPrevVis;
      delete root.dataset.caroPrevVis;
    } else {
      root.style.visibility = '';
    }
    _caroCaroOverlayIds().forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      if('caroPrevVis' in el.dataset){
        el.style.visibility = el.dataset.caroPrevVis;
        delete el.dataset.caroPrevVis;
      } else {
        el.style.visibility = '';
      }
    });
  }
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
  if(d.hostName || d.guestName){
    _caro.names = [d.hostName || _caro.names[0], d.guestName || _caro.names[1]];
    changed = true;
  }
  if(d.hostAvatar || d.guestAvatar){
    _caro.avatars = [
      d.hostAvatar || (_caro.avatars && _caro.avatars[0]) || '🐶',
      d.guestAvatar || (_caro.avatars && _caro.avatars[1]) || '🐱'
    ];
    changed = true;
  }
  if(d.hostId || d.guestId){
    _caro.ids = [d.hostId || null, d.guestId || null];
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
  el.style.visibility = 'visible';
  if(id === 'caro-settings-panel' || id === 'caro-result-panel' || id === 'caro-rank-panel' || id === 'player-card-panel'){
    el.style.zIndex = '10070';
  }
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
  if(len >= 5) return 1000000;
  if(len === 4) return openEnds === 2 ? 80000 : (openEnds === 1 ? 18000 : 200);
  if(len === 3) return openEnds === 2 ? 4500 : (openEnds === 1 ? 420 : 40);
  if(len === 2) return openEnds === 2 ? 220 : (openEnds === 1 ? 45 : 8);
  return 3;
}

/** Phân tích đe dọa sau khi đặt quân tại (r,c) */
function _caroAnalyzePlace(board, r, c, color){
  const b = _caroCloneBoard(board);
  b[r][c] = color;
  if(_caroCheckWin(b, r, c, color)){
    return { win:true, openFour:0, halfFour:0, openThree:0, halfThree:0, score:1000000 };
  }
  let score = 0, openFour = 0, halfFour = 0, openThree = 0, halfThree = 0;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for(const [dr,dc] of dirs){
    const cells = _caroExtendLine(b, r, c, dr, dc, color);
    const open = _caroOpenEnds(b, cells, dr, dc);
    const len = cells.length;
    score += _caroPatternValue(len, open);
    if(len >= 4 && open >= 1){ if(open === 2) openFour++; else halfFour++; }
    else if(len === 3 && open === 2) openThree++;
    else if(len === 3 && open === 1) halfThree++;
  }
  const cr = (CARO_SIZE - 1) / 2;
  score += Math.max(0, 12 - (Math.abs(r-cr) + Math.abs(c-cr)));
  return { win:false, openFour, halfFour, openThree, halfThree, score };
}

function _caroScoreCell(board, r, c, color){
  return _caroAnalyzePlace(board, r, c, color).score;
}

function _caroEvaluateMove(board, r, c, color, oppColor){
  const atk = _caroAnalyzePlace(board, r, c, color);
  const def = _caroAnalyzePlace(board, r, c, oppColor);
  let score = atk.score + def.score * 1.15;
  // Đe dọa kép / sống rất mạnh
  if(atk.openFour >= 1) score += 200000;
  if(atk.halfFour >= 2 || (atk.halfFour >= 1 && atk.openThree >= 1)) score += 150000;
  if(atk.openThree >= 2) score += 90000;
  if(def.openFour >= 1) score += 190000;
  if(def.halfFour >= 2 || (def.halfFour >= 1 && def.openThree >= 1)) score += 140000;
  if(def.openThree >= 2) score += 85000;
  return score;
}

function _caroImmediateWins(board, color, candidates){
  const hits = [];
  for(const [r,c] of candidates){
    const b = _caroCloneBoard(board);
    b[r][c] = color;
    if(_caroCheckWin(b, r, c, color)) hits.push([r,c]);
  }
  return hits;
}

/** Nước buộc phải chặn: đối thủ có open-four / half-four / song khai-tam thắng gần như chắc chắn nếu bỏ qua */
function _caroForcedBlocks(board, oppColor, candidates){
  const blocks = [];
  for(const [r,c] of candidates){
    const a = _caroAnalyzePlace(board, r, c, oppColor);
    if(a.win) blocks.push([r, c, 4]);
    else if(a.openFour >= 1) blocks.push([r, c, 3]);
    else if(a.halfFour >= 1 || a.openThree >= 2) blocks.push([r, c, 2]);
  }
  blocks.sort((a,b)=> b[2]-a[2]);
  return blocks.map(([r,c])=>[r,c]);
}

function _caroRankCandidates(board, color, oppColor, candidates, topN){
  const scored = candidates.map(([r,c])=>({
    r, c, score: _caroEvaluateMove(board, r, c, color, oppColor)
  })).sort((a,b)=> b.score - a.score);
  return scored.slice(0, Math.min(scored.length, topN || 12));
}

function _caroBoardStaticEval(board, color, oppColor){
  // Heuristic nhẹ: quét ứng viên quanh quân hiện có
  const cands = _caroGetCandidates(board, 2);
  if(!cands.length) return 0;
  let bestAtk = 0, bestDef = 0;
  for(const [r,c] of cands){
    bestAtk = Math.max(bestAtk, _caroScoreCell(board, r, c, color));
    bestDef = Math.max(bestDef, _caroScoreCell(board, r, c, oppColor));
  }
  return bestAtk - bestDef * 1.05;
}

function _caroNegamax(board, depth, alpha, beta, color, oppColor, profile){
  if(depth <= 0) return _caroBoardStaticEval(board, color, oppColor);
  const radius = profile.radius || 3;
  let candidates = _caroGetCandidates(board, radius);
  if(!candidates.length) return 0;

  // Ưu tiên thắng / chặn ngay trong nhánh
  const wins = _caroImmediateWins(board, color, candidates);
  if(wins.length) return 500000 + depth;
  const blocks = _caroForcedBlocks(board, oppColor, candidates);
  if(blocks.length) candidates = blocks;
  else {
    // Càng đi sâu càng thu hẹp bề rộng — giữ độ sâu cao mà vẫn nhanh
    const ply = Math.max(0, (profile.depth||1) - depth);
    const topNHere = Math.max(6, (profile.topN || 10) - ply*2);
    const ranked = _caroRankCandidates(board, color, oppColor, candidates, topNHere);
    candidates = ranked.map(m => [m.r, m.c]);
  }

  let best = -Infinity;
  for(const [r,c] of candidates){
    const b = _caroCloneBoard(board);
    b[r][c] = color;
    if(_caroCheckWin(b, r, c, color)) return 500000 + depth;
    const val = -_caroNegamax(b, depth-1, -beta, -alpha, oppColor, color, profile);
    if(val > best) best = val;
    if(val > alpha) alpha = val;
    if(alpha >= beta) break;
  }
  return best;
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
    if(!candidates.length){
      const fb = _caroRandomEmptyNear(board, 4);
      return fb ? { r: fb[0], c: fb[1], score: 0 } : null;
    }

    // 1) Thắng ngay
    const winNow = _caroImmediateWins(board, aiColor, candidates);
    if(winNow.length) return { r: winNow[0][0], c: winNow[0][1], score: 1e9 };

    // 2) Chặn đối thủ thắng ngay
    const blockWin = _caroImmediateWins(board, playerColor, candidates);
    if(blockWin.length) return { r: blockWin[0][0], c: blockWin[0][1], score: 5e8 };

    // 3) Chặn open-four / half-four của đối thủ
    const forced = _caroForcedBlocks(board, playerColor, candidates);
    if(forced.length){
      // Trong các nước chặn, chọn nước tốt nhất cho mình
      const rankedBlock = _caroRankCandidates(board, aiColor, playerColor, forced, forced.length);
      if(rankedBlock.length) return { r: rankedBlock[0].r, c: rankedBlock[0].c, score: rankedBlock[0].score };
    }

    // 4) Tạo open-four / đe dọa kép nếu có
    let bestThreat = null;
    for(const [r,c] of candidates){
      const a = _caroAnalyzePlace(board, r, c, aiColor);
      const threat = a.openFour*100 + a.halfFour*40 + a.openThree*15;
      if(threat >= 15){
        const score = _caroEvaluateMove(board, r, c, aiColor, playerColor) + threat*1000;
        if(!bestThreat || score > bestThreat.score) bestThreat = { r, c, score };
      }
    }
    if(bestThreat && bestThreat.score >= 80000) return bestThreat;

    // 5) Heuristic + (medium/hard) lookahead negamax trên top ứng viên
    const depth = Math.max(1, profile.depth|0);
    const ranked = _caroRankCandidates(board, aiColor, playerColor, candidates, profile.topN || 12);
    if(!ranked.length) return null;

    let scored = ranked;
    if(depth >= 2){
      scored = ranked.map(m=>{
        const b = _caroCloneBoard(board);
        b[m.r][m.c] = aiColor;
        // leaf đã thắng được xử lý ở trên; ở đây search phản ứng đối thủ
        const look = -_caroNegamax(b, depth-1, -Infinity, Infinity, playerColor, aiColor, profile);
        return { r:m.r, c:m.c, score: m.score * 0.35 + look };
      }).sort((a,b)=> b.score - a.score);
    }

    if(Math.random() < (profile.mistakeRate || 0)){
      const pool = scored.slice(0, Math.min(scored.length, Math.max(2, Math.ceil(scored.length * 0.35))));
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const top = scored[0].score;
    const bandFrac = profile.pickBand != null ? profile.pickBand : 0.04;
    const band = bandFrac > 0 ? Math.max(Math.abs(top) * bandFrac, 50) : 0;
    const topMoves = scored.filter(m => m.score >= top - band);
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
  // Dọn Versus nếu còn sót (tránh 2 nửa bàn đè dưới Caro)
  try{
    if(typeof versusMode !== 'undefined' && versusMode && typeof _vsAbort === 'function') _vsAbort();
    else document.getElementById('versus-arena')?.remove();
  }catch(e){}

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
    avatars: [(typeof getPlayerAvatar==='function'?getPlayerAvatar():'🐶'), '🤖'],
    ids: [null, null],
    winner: null,
    hover: null,
    turnSec: prefs.turnSec,
    skin: prefs.skin,
    turnLeft: prefs.turnSec
  };
  caroMode = true;
  // FIX: reset pinch-zoom còn sót từ ván trước khi vào ván AI mới
  _caroResetZoom();
  _caroToggleChrome(true);
  _caroSetGameRootHidden(true);
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
  const badge = document.getElementById('mode-badge');
  if(badge){
    badge.textContent = '❌⭕ CARO';
    badge.classList.add('secret');
  }

  const paint = ()=>{ try{ _caroRender(); }catch(e){ console.warn('[caro]', e); } };
  paint();
  requestAnimationFrame(()=>{ paint(); requestAnimationFrame(paint); });
  _caroSetupChat(false);
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
    const nextTurn = _caro.turn;
    sendOnlineMove(_caro.roomId, { type:'caro_place', slot, r, c, nextTurn }).then(seq=>{
      if(seq != null && _caro) _caro.moveSeq = Math.max(_caro.moveSeq || 0, seq);
    }).catch(err=> console.warn('[caro] send move', err));
    updateOnlineRoomTurn(_caro.roomId, nextTurn).catch(err=> console.warn('[caro] turn', err));
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
  try{ if(typeof hardResetAllModes === 'function') hardResetAllModes(); }catch(e){}
  try{
    if(typeof versusMode !== 'undefined' && versusMode && typeof _vsAbort === 'function') _vsAbort();
    else document.getElementById('versus-arena')?.remove();
  }catch(e){}
  _caro = {
    board: _caroNewBoard(),
    turn: 'host',
    mySlot,
    roomId: roomData.roomId || _caroLobby?.roomId,
    online: true,
    moveSeq: 0,
    names: [roomData.hostName||'Host', roomData.guestName||'Guest'],
    avatars: [roomData.hostAvatar||'🐶', roomData.guestAvatar||'🐱'],
    ids: [roomData.hostId||null, roomData.guestId||null],
    winner: null,
    turnSec,
    skin,
    turnLeft: turnSec
  };
  caroMode = true;
  // FIX: reset pinch-zoom còn sót từ ván trước khi vào ván online mới
  _caroResetZoom();
  _caroHide('caro-lobby-panel');
  _caroHide('caro-hub-panel');
  _caroToggleChrome(true);
  _caroSetGameRootHidden(true);
  _caroApplyStageTheme();
  const stage = document.getElementById('caro-stage');
  if(stage){
    stage.classList.add('active');
    stage.style.display = 'flex';
    stage.style.zIndex = '10060';
  }
  const badge = document.getElementById('mode-badge');
  if(badge){
    badge.textContent = '❌⭕ CARO';
    badge.classList.add('secret');
  }

  const roomId = _caro.roomId;
  // Chỉ chủ phòng ghi nhịp tim trong trận — khách phát hiện mất nhịp tim này để biết
  // chủ phòng đã thoát/mất kết nối gần như ngay lập tức thay vì bị treo màn hình chờ.
  if(isHost && typeof startRoomHeartbeat === 'function') startRoomHeartbeat(roomId);

  // Đăng ký room TRƯỚC — stopListeningRoomDoc không được hủy moves
  listenOnlineRoom(roomId, ev=>{
    if(ev.type==='deleted'){ _caroQuit(); _caroHandleHostLeft(); return; }
    const d = ev.data;
    _caroApplyRoomMetaToGame(d);
    if(!_caro || _caro.winner) return;
    // Khách rời trận giữa chừng (đóng tab/thoát) → báo cho chủ phòng và đưa về danh sách,
    // tương tự chiều ngược lại, để chủ phòng không bị treo chờ vô thời hạn.
    if(isHost && !d.guestId && d.status === 'playing'){
      _caroQuit();
      _caroHandleGuestLeft();
      return;
    }
    if(d.currentTurn === 'host' || d.currentTurn === 'guest'){
      let stones = 0;
      for(let r=0;r<CARO_SIZE;r++) for(let c=0;c<CARO_SIZE;c++) if(_caro.board[r][c]) stones++;
      const expectTurn = (stones % 2 === 0) ? 'host' : 'guest';
      if(d.currentTurn === expectTurn && _caro.turn !== d.currentTurn){
        _caro.turn = d.currentTurn;
        _caroRender();
        _caroStartTurnTimer();
      }
    }
    if(d.status==='finished' && d.winnerId){
      const winSlot = d.winnerId===d.hostId ? 'host' : 'guest';
      if(!_caro.winner) _caroEndGame(winSlot, true);
    }
  });

  fetchAllOnlineMoves(roomId).then(moves=>{
    if(!_caro) return;
    moves.forEach(m=>{
      if(m.type==='caro_place' && m.seq > (_caro.moveSeq||0)){
        _caro.moveSeq = m.seq;
        if(!_caro.board[m.r][m.c]) _caro.board[m.r][m.c] = _caroStone(m.slot);
        _caro.turn = _caroOpp(m.slot);
      }
    });
    if(roomData.currentTurn === 'host' || roomData.currentTurn === 'guest') _caro.turn = roomData.currentTurn;
    _caroRender();
    _caroStartTurnTimer();
  }).catch(err=> console.warn('[caro] fetch moves', err));

  listenOnlineMoves(roomId, move=>{
    if(!_caro || move.type!=='caro_place') return;
    if(move.seq != null && move.seq <= (_caro.moveSeq||0)) return;
    if(move.seq != null) _caro.moveSeq = move.seq;
    if(move.slot === _caro.mySlot) return;
    if(_caro.turn !== move.slot) _caro.turn = move.slot;
    const ok = _caroApplyMove(move.r, move.c, move.slot, true);
    if(!ok && move.r != null && move.c != null && !_caro.board[move.r][move.c]){
      _caro.board[move.r][move.c] = _caroStone(move.slot);
      _caro.turn = _caroOpp(move.slot);
      _caroRender();
      _caroStartTurnTimer();
    }
  });

  _caroSetupChat(true);
  _caroRender();
  _caroStartTurnTimer();
  try{ startBgm('action'); }catch(e){}
}

function _caroEndGame(winnerSlot, fromRemote){
  if(!_caro) return;
  if(_caro.settled) return;
  _caro.settled = true;
  _caro.winner = winnerSlot;
  _caro.aiThinking = false;
  _caroStopTimer();
  if(_caro.aiTimer){ clearTimeout(_caro.aiTimer); _caro.aiTimer = null; }
  _caroRender();

  const isAI = !!_caro.ai;
  try{
    if(isAI && _caro.ai.id === 'extreme' && winnerSlot === _caro.mySlot){
      window.dispatchEvent(new CustomEvent('caro-ai-win', { detail:{ level:'extreme' } }));
      if(window.CaroSocial && typeof CaroSocial.onExtremeAiWin === 'function') CaroSocial.onExtremeAiWin();
    }
  }catch(e){}

  if(!isAI && !fromRemote && _caro.roomId){
    finalizeCaroMatch(_caro.roomId, winnerSlot).catch(()=>{});
  }

  let msg;
  if(winnerSlot==='draw') msg = t('caroDraw');
  else if(winnerSlot===_caro.mySlot) msg = t('caroYouWin');
  else msg = t('caroYouLose');

  document.getElementById('caro-result-title').textContent = msg;

  let heartNote = '';
  if(isAI){
    document.getElementById('caro-result-body').innerHTML =
      '<div style="font-size:13px;color:#ccc;margin-bottom:8px;">'+escapeHtml(_caro.names[0])+' (<b class="caro-x">X</b>) vs '+escapeHtml(_caro.names[1])+' (<b class="caro-o">O</b>)</div>'+
      '<div class="caro-result-ai-note">'+t('caroAiNoPts')+'</div>';
  } else {
    let localOutcome = 'draw';
    if(winnerSlot !== 'draw'){
      localOutcome = winnerSlot === _caro.mySlot ? 'win' : 'loss';
    }
    // Thua người (PvP online): trừ 1/2 tim — thông báo ngắn (−1/2 tim)
    if(localOutcome === 'loss' && !_caro.heartTaken){
      _caro.heartTaken = true;
      try{
        if(typeof spendHearts === 'function') spendHearts(0.5, { allowPartial: true });
        else if(window.Inventory && typeof Inventory.spendHearts === 'function') Inventory.spendHearts(0.5, { allowPartial: true });
        heartNote = '<div class="caro-result-heart">'+t('caroHeartLoss')+'</div>';
      }catch(e){}
    }
    const statsAfter = applyLocalCaroResult(localOutcome);
    const rank = statsAfter.rank;
    const ptsDelta = localOutcome==='win' ? '+25' : (localOutcome==='draw' ? '+8' : '+0');
    const heartsLeft = (window.Inventory && typeof Inventory.formatHearts === 'function')
      ? Inventory.formatHearts(Inventory.hearts)
      : String(typeof formatHearts==='function' ? formatHearts(typeof inv!=='undefined'?inv.hearts:0) : 0);
    document.getElementById('caro-result-body').innerHTML =
      '<div style="font-size:13px;color:#ccc;margin-bottom:8px;">'+escapeHtml(_caro.names[0])+' (<b class="caro-x">X</b>) vs '+escapeHtml(_caro.names[1])+' (<b class="caro-o">O</b>)</div>'+
      '<div class="caro-result-rank">'+rank.icon+' <b>'+escapeHtml(rank.name)+'</b> · '+ptsDelta+' '+t('caroPts')+'</div>'+
      '<div class="caro-result-wld">'+t('caroWins')+': '+statsAfter.wins+' · '+t('caroLosses')+': '+statsAfter.losses+' · '+t('caroDraws')+': '+statsAfter.draws+' · '+t('caroWinRate', statsAfter.winRate)+'</div>'+
      heartNote+
      '<div class="caro-result-hearts-left">❤️ '+heartsLeft+'</div>';
    _caroRefreshHubStats();
  }

  setTimeout(()=>{
    const rp = document.getElementById('caro-result-panel');
    if(rp) rp.style.zIndex = '10070';
    _caroShow('caro-result-panel');
  }, 600);
  stopListeningRoom();
}

function _caroSetupChat(online){
  const toggle = document.getElementById('caro-chat-toggle');
  const panel = document.getElementById('caro-chat');
  const log = document.getElementById('caro-chat-log');
  if(toggle) toggle.style.display = online ? '' : 'none';
  if(panel){ panel.hidden = true; panel.classList.remove('open'); }
  if(log) log.innerHTML = '';
  try{ if(typeof renderInventoryHud === 'function') renderInventoryHud(); }catch(e){}
  if(!online || !_caro || !_caro.roomId) return;
  if(typeof listenRoomChat !== 'function') return;
  const seen = new Set();
  listenRoomChat(_caro.roomId, msg=>{
    if(!msg || !msg.id || seen.has(msg.id)) return;
    seen.add(msg.id);
    _caroAppendChat(msg);
  });
}

function _caroAppendChat(msg){
  const log = document.getElementById('caro-chat-log');
  if(!log || !msg) return;
  const mine = msg.uid && typeof getOnlineUid === 'function' && msg.uid === getOnlineUid();
  const row = document.createElement('div');
  row.className = 'caro-chat-row'+(mine?' mine':'');
  const who = document.createElement('span');
  who.className = 'caro-chat-who';
  who.textContent = (msg.avatar || '')+' '+(msg.name || 'Player');
  const body = document.createElement('span');
  body.className = 'caro-chat-text bubble-'+(msg.bubbleStyle || 'classic')+(msg.kind==='fx'?' caro-chat-fx':'');
  body.textContent = msg.text || '';
  row.appendChild(who);
  row.appendChild(body);
  if(msg.kind === 'couple_invite' && !mine){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'caro-couple-accept';
    btn.textContent = '💍 '+(typeof t==='function'?t('caroCoupleAccept'):'Nhận kết đôi');
    btn.addEventListener('click', ()=>{
      try{sfxClick();}catch(e){}
      if(window.CaroSocial && CaroSocial.acceptInvite){
        // fallback via event
      }
      try{
        if(typeof watchAd !== 'undefined'){ /* noop */ }
        window.dispatchEvent(new CustomEvent('caro-couple-accept', { detail: msg }));
      }catch(e){}
      btn.disabled = true;
    });
    row.appendChild(btn);
  }
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
  try{
    if(window.CaroSocial && typeof CaroSocial.onChatMessage === 'function') CaroSocial.onChatMessage(msg);
  }catch(e){}
}

function _caroToggleChat(forceOpen){
  const panel = document.getElementById('caro-chat');
  if(!panel) return;
  const open = forceOpen != null ? !!forceOpen : panel.hidden;
  panel.hidden = !open;
  panel.classList.toggle('open', open);
  if(open){
    const input = document.getElementById('caro-chat-input');
    if(input) setTimeout(()=> input.focus(), 50);
    try{
      if(window.CaroSocial){
        if(CaroSocial.renderFxBar) CaroSocial.renderFxBar();
        if(CaroSocial.renderBubblePicker) CaroSocial.renderBubblePicker();
      }
    }catch(e){}
  }
}

async function _caroSendChat(e){
  if(e) e.preventDefault();
  if(!_caro || !_caro.online || !_caro.roomId) return;
  const input = document.getElementById('caro-chat-input');
  if(!input) return;
  const text = input.value;
  input.value = '';
  try{
    const extra = {};
    try{
      if(window.CaroSocial && CaroSocial.currentBubbleStyle){
        extra.bubbleStyle = CaroSocial.currentBubbleStyle();
      }
    }catch(e2){}
    if(typeof sendRoomChat === 'function') await sendRoomChat(_caro.roomId, text, extra);
  }catch(err){
    console.warn('[caro-chat]', err);
    try{ showComboFlash(0,false, typeof t==='function'?t('caroChatFail'):'Không gửi được chat'); }catch(e2){}
  }
}

function _caroQuit(){
  try{ if(typeof lockPortraitOrientation==='function') lockPortraitOrientation(); }catch(e){}
  // Bấm "Thoát" giữa trận online (hoặc đang bị dọn do phòng đã mất) → báo Firestore ngay:
  // chủ phòng thoát thì xoá phòng thật (đối thủ sẽ nhận sự kiện 'deleted' và được đưa về
  // danh sách phòng), khách thoát thì trả phòng lại trạng thái mở cho chủ phòng.
  if(_caro && _caro.online && _caro.roomId && typeof leaveOnlineRoom === 'function'){
    leaveOnlineRoom(_caro.roomId).catch(()=>{});
  }
  try{ if(typeof stopRoomHeartbeat === 'function') stopRoomHeartbeat(); }catch(e){}
  caroMode = false;
  _caroStopTimer();
  if(_caro && _caro.aiTimer) clearTimeout(_caro.aiTimer);
  _caro = null;
  _caroLobby = null;
  // FIX: dọn zoom khi thoát ván, tránh mang trạng thái zoom sang lần mở caro tiếp theo
  _caroResetZoom();
  stopListeningRoom();
  _caroSetupChat(false);
  _caroToggleChrome(false);
  _caroSetGameRootHidden(false);
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
  try{ if(typeof unlockOrientation==='function') unlockOrientation(); }catch(e){}
  _caroShow('caro-hub-panel');
  _caroSyncPrefUI(getCaroPrefs());
  const locked = !canPlayCaro();
  _caroSetOnlineLocked(locked);
  if(locked) return;
  _caroRefreshHubStats();
  if(isOnlineServicesEnabled()){
    _caroRequireOnline().then(async ok => {
      if(!ok) return;
      // Sau F5: dọn/sửa phòng treo và hiện lại phòng của mình trong list
      try{
        if(typeof findMyLiveHostedRoom === 'function'){
          const mine = await findMyLiveHostedRoom('caro');
          if(mine && (mine.status === 'open' || mine.status === 'ready')){
            _caroLastOpenRooms = _caroMergeMyRoom(_caroLastOpenRooms || [], mine);
            _caroRenderOpenRoomLists(_caroLastOpenRooms);
          }
        }
      }catch(e){}
      _caroStartRoomListListen();
    });
  }
}

function _caroMergeMyRoom(rooms, mine){
  const list = (rooms || []).slice();
  if(!mine || !mine.roomId) return list;
  const i = list.findIndex(r => r.roomId === mine.roomId);
  if(i >= 0) list[i] = Object.assign({}, list[i], mine);
  else list.unshift(mine);
  return list;
}

function _caroStartRoomListListen(){
  if(typeof listenOpenCaroRooms !== 'function') return;
  listenOpenCaroRooms((rooms)=>{
    // Gộp phòng mình đang host (không sanitize lại mỗi snapshot — tránh ghi Firestore liên tục)
    const mergeMine = async ()=>{
      let list = rooms || [];
      try{
        const uid = typeof getOnlineUid === 'function' ? getOnlineUid() : null;
        if(uid && typeof _listHostedRooms === 'function'){
          const mine = (await _listHostedRooms(uid)).filter(r =>
            (r.gameType || 'versus') === 'caro' &&
            (r.status === 'open' || r.status === 'ready')
          );
          mine.forEach(r => { list = _caroMergeMyRoom(list, r); });
        }
      }catch(e){}
      _caroRenderOpenRoomLists(list);
    };
    mergeMine();
  });
}

function _caroStopRoomListListen(){
  if(typeof stopListeningOpenCaroRooms === 'function') stopListeningOpenCaroRooms();
}

function _caroRenderOpenRoomLists(rooms){
  _caroLastOpenRooms = rooms || [];
  // Hiện cả phòng open trống + phòng của mình (kể cả ready) để F5 vẫn thấy
  const uid = typeof getOnlineUid === 'function' ? getOnlineUid() : null;
  const open = _caroLastOpenRooms.filter(r => {
    if(r.status === 'open' && !r.guestId) return true;
    if(uid && r.hostId === uid && (r.status === 'open' || r.status === 'ready')) return true;
    return false;
  });
  const countEl = document.getElementById('caro-room-list-count');
  if(countEl) countEl.textContent = open.length ? '(' + open.length + ')' : '';
  _caroRenderRoomListTo('caro-room-list', 'caro-room-list-empty', open);
  _caroRenderRoomListTo('caro-lobby-room-list', null, open);
  if(_caroLobby){
    const idx = open.findIndex(r => r.roomId === _caroLobby.roomId);
    const noEl = document.getElementById('caro-lobby-room-no');
    if(noEl) noEl.textContent = idx >= 0 ? '· ' + t('caroRoomNo', idx + 1) : '';
  }
}

function _caroRenderRoomListTo(listId, emptyId, rooms){
  const list = document.getElementById(listId);
  const empty = emptyId ? document.getElementById(emptyId) : null;
  if(!list) return;
  const uid = typeof getOnlineUid === 'function' ? getOnlineUid() : null;
  if(empty) empty.style.display = rooms.length ? 'none' : 'block';
  if(!rooms.length){ list.innerHTML = ''; return; }
  list.innerHTML = rooms.map((r, i) => {
    const no = i + 1;
    const turn = r.turnSec === 10 ? '10s' : '15s';
    const mine = uid && r.hostId === uid;
    const name = escapeHtml(r.hostName || 'Host');
    const joinLabel = mine ? t('caroRoomMine') : t('caroRoomJoin');
    return '<button type="button" class="caro-room-row'+(mine?' mine':'')+'" data-room="'+r.roomId+'">'+
      '<span class="caro-room-no">#'+no+'</span>'+
      '<span class="caro-room-info"><b>'+name+'</b><small>'+turn+(r.code ? ' · '+escapeHtml(r.code) : '')+'</small></span>'+
      '<span class="caro-room-action">'+joinLabel+'</span></button>';
  }).join('');
  list.querySelectorAll('.caro-room-row').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
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

async function _caroRefreshHubStats(){
  const box = document.getElementById('caro-hub-stats');
  if(!box) return;
  const stats = await fetchMyCaroStats();
  renderCaroStatsCard(box, stats);
}

function closeCaroHub(){
  try{ if(typeof lockPortraitOrientation==='function') lockPortraitOrientation(); }catch(e){}
  cancelMatchmaking();
  _caroStopRoomListListen();
  const leaving = _caroLobby && _caroLobby.roomId ? leaveOnlineRoom(_caroLobby.roomId) : Promise.resolve();
  _caroLobby = null;
  stopListeningRoom();
  _caroHide('caro-hub-panel');
  _caroHide('caro-lobby-panel');
  _caroHide('caro-mm-panel');
  _caroHide('caro-ai-panel');
  // Best-effort: đợi xóa phòng trống (tránh F5 ngay sau khi đóng còn phòng ma)
  leaving.catch(()=>{});
}

function _caroOpenLobby(roomId, code, role, roomData){
  _caroLobby = { roomId, code, role, roomData };
  _caroHide('caro-hub-panel');
  _caroHide('caro-mm-panel');
  _caroShow('caro-lobby-panel');
  document.getElementById('caro-room-code').textContent = code;
  _caroRenderLobby(roomData);
  if(typeof listenOpenCaroRooms === 'function') listenOpenCaroRooms(_caroRenderOpenRoomLists);

  // Chỉ chủ phòng ghi nhịp tim — dùng để mọi người phát hiện phòng "chết" gần như tức thời
  // (xem startRoomHeartbeat/isRoomHostStale trong online-services.js).
  if(typeof startRoomHeartbeat === 'function'){
    if(role === 'host') startRoomHeartbeat(roomId);
    else if(typeof stopRoomHeartbeat === 'function') stopRoomHeartbeat();
  }

  listenOnlineRoom(roomId, ev=>{
    if(ev.type==='deleted'){ closeCaroHub(); _caroHandleHostLeft(); return; }
    const d = ev.data;
    _caroLobby.roomData = d;
    _caroSyncRoomPrefsFromData(d);
    _caroRenderLobby(d);
    if(d.status==='playing' && !caroMode) _caroEnterGame({ roomId, ...d });
  });
}

/** Phòng/trận không còn người chơi kia nữa (họ rời/mất kết nối) trong lúc mình đang chờ
 * hoặc đang chơi: báo bằng thông báo rồi tự động đưa về danh sách phòng — không để bị
 * treo/đứng hình. */
function _caroReturnToRoomList(msg){
  try{ if(typeof stopRoomHeartbeat === 'function') stopRoomHeartbeat(); }catch(e){}
  try{ showHint(msg, { hold: 2600 }); }catch(e){}
  openCaroHub();
}

/** Phòng bị xoá vì chủ phòng đã rời/mất kết nối (trường hợp chính yêu cầu ở đây). */
function _caroHandleHostLeft(){
  _caroReturnToRoomList(typeof t==='function' ? t('caroHostLeftRoom') : 'Chủ phòng đã rời phòng');
}

/** Khách rời/mất kết nối giữa trận — báo cho chủ phòng để không bị treo chờ vô thời hạn. */
function _caroHandleGuestLeft(){
  _caroReturnToRoomList(typeof t==='function' ? t('caroGuestLeftRoom') : 'Đối thủ đã rời trận');
}

function _caroRenderLobby(d){
  const host = d.hostName || '?';
  const guestName = d.guestName || null;
  const guest = guestName || t('onlineWaiting');
  const hostAv = d.hostAvatar || '🐶';
  const guestAv = d.guestAvatar || '🐱';
  const uid = typeof getOnlineUid === 'function' ? getOnlineUid() : null;
  const you = (typeof t==='function'?t('caroYouLabel'):'Bạn');
  const hostIsMe = uid && d.hostId === uid;
  const guestIsMe = uid && d.guestId === uid;
  const hostLabel = hostIsMe ? (escapeHtml(host)+' <small class="online-you-here">'+you+'</small>') : escapeHtml(host);
  const guestLabel = guestName
    ? (guestIsMe ? (escapeHtml(guest)+' <small class="online-you-here">'+you+'</small>') : escapeHtml(guest))
    : '<span class="online-wait">'+escapeHtml(guest)+'</span>';

  // Danh hiệu Caro hiển thị ngay trên tên — lấy từ điểm đã lưu kèm room doc lúc
  // tạo/vào phòng (không đọc thêm Firestore chỉ để hiển thị badge này).
  const hostRankHtml = (typeof getCaroRank === 'function' && d.hostCaroPoints != null)
    ? '<span class="caro-seat-rank">'+escapeHtml(getCaroRank(d.hostCaroPoints).icon+' '+getCaroRank(d.hostCaroPoints).name)+'</span>'
    : '';
  const guestRankHtml = (typeof getCaroRank === 'function' && guestName && d.guestCaroPoints != null)
    ? '<span class="caro-seat-rank">'+escapeHtml(getCaroRank(d.guestCaroPoints).icon+' '+getCaroRank(d.guestCaroPoints).name)+'</span>'
    : '';

  const hostUid = d.hostId || '';
  const guestUid = d.guestId || '';
  document.getElementById('caro-lobby-players').innerHTML =
    '<div class="online-player caro-lobby-seat" data-uid="'+escapeHtml(hostUid)+'" data-name="'+escapeHtml(host)+'" data-avatar="'+hostAv+'">'+
      '<button type="button" class="caro-seat-av" data-uid="'+escapeHtml(hostUid)+'" data-name="'+escapeHtml(host)+'" data-avatar="'+hostAv+'">'+hostAv+'</button>'+
      '<span class="caro-seat-info">'+hostRankHtml+
        '<span class="caro-seat-name-row"><span class="caro-x">X</span> <span class="caro-seat-name">'+hostLabel+'</span></span>'+
      '</span></div>'+
    '<div class="online-player caro-lobby-seat" data-uid="'+escapeHtml(guestUid)+'" data-name="'+escapeHtml(guestName||'')+'" data-avatar="'+guestAv+'">'+
      '<button type="button" class="caro-seat-av" data-uid="'+escapeHtml(guestUid)+'" data-name="'+escapeHtml(guestName||'')+'" data-avatar="'+guestAv+'" '+(guestName?'':'disabled')+'>'+(guestName?guestAv:'❔')+'</button>'+
      '<span class="caro-seat-info">'+guestRankHtml+
        '<span class="caro-seat-name-row"><span class="caro-o">O</span> <span class="caro-seat-name">'+guestLabel+'</span></span>'+
      '</span></div>';

  document.querySelectorAll('#caro-lobby-players .caro-seat-av').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      const id = btn.dataset.uid;
      if(!id || id === uid) return;
      openPlayerCard({ uid: id, name: btn.dataset.name, avatar: btn.dataset.avatar });
    });
  });

  const here = document.getElementById('caro-lobby-here');
  if(here){
    here.style.display = 'block';
    here.textContent = typeof t==='function' ? t('caroJoinedRoom') : '✓ Đã vào phòng';
  }

  const startBtn = document.getElementById('caro-start-btn');
  const isHost = _caroLobby && _caroLobby.role==='host';
  if(startBtn) startBtn.style.display = (isHost && d.status==='ready' && d.guestId) ? 'block' : 'none';
  const hint = document.getElementById('caro-lobby-hint');
  if(hint){
    hint.style.display = (d.status==='ready' && d.guestId) ? 'none' : 'block';
  }
  _caroSyncPrefUI(getCaroPrefs());
  _caroRenderOpenRoomLists(_caroLastOpenRooms || []);
}

async function caroCreateRoom(){
  if(!canPlayCaro()){ _caroStatus(t('caroNeedLevel', CARO_MIN_LEVEL), true); return; }
  if(!await _caroRequireOnline()) return;
  try{
    // Rời phòng hiện tại (nếu đang ở) trước khi tạo/tái dùng
    if(_caroLobby && _caroLobby.roomId){
      const prev = _caroLobby.roomId;
      const wasHost = _caroLobby.role === 'host';
      stopListeningRoom();
      _caroLobby = null;
      // Guest rời hẳn; host giữ phòng để createOnlineRoom tái dùng (1 phòng)
      if(!wasHost) await leaveOnlineRoom(prev);
    }
    const prefs = getCaroPrefs();
    const created = await createOnlineRoom({
      gameType:'caro', turnSec: prefs.turnSec, boardSkin: prefs.skin
    });
    const room = created.room || {
      status:'open', hostName:getOnlineDisplayName(), hostAvatar:getOnlineAvatar(),
      hostId: getOnlineUid(), gameType:'caro',
      turnSec: prefs.turnSec, boardSkin: prefs.skin
    };
    _caroOpenLobby(created.roomId, created.code, 'host', Object.assign({}, room, {
      roomId: created.roomId,
      code: created.code,
      hostName: room.hostName || getOnlineDisplayName(),
      hostAvatar: room.hostAvatar || getOnlineAvatar(),
      hostId: room.hostId || getOnlineUid(),
      gameType: 'caro'
    }));
    if(created.playing){
      _caroStatus(t('onlineRoomReuse', created.code));
    } else {
      _caroStatus(t(created.reused ? 'onlineRoomReuse' : 'onlineRoomCreated', created.code));
    }
  }catch(e){
    // Fallback: nếu vẫn báo đang host → tìm phòng cũ và mở lại
    if(e.message === 'already_hosting' && typeof findMyLiveHostedRoom === 'function'){
      try{
        const mine = await findMyLiveHostedRoom('caro');
        if(mine){
          _caroOpenLobby(mine.roomId, mine.code, 'host', mine);
          _caroStatus(t('onlineRoomReuse', mine.code));
          return;
        }
      }catch(e2){}
    }
    const msg = e.message==='already_hosting' ? t('onlineAlreadyHosting') : e.message;
    _caroStatus(msg, true);
  }
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
      e.message==='wrong_game_type' ? t('caroWrongRoom') :
      e.message==='already_hosting' ? t('onlineAlreadyHosting') : e.message;
    _caroStatus(msg, true);
  }
}

async function caroJoinRoomById(roomId){
  if(!canPlayCaro()){ _caroStatus(t('caroNeedLevel', CARO_MIN_LEVEL), true); return; }
  if(!await _caroRequireOnline()) return;
  try{
    const data = await joinOnlineRoomById(roomId, { gameType:'caro' });
    const role = data.hostId === getOnlineUid() ? 'host' : 'guest';
    _caroOpenLobby(data.roomId, data.code, role, data);
    _caroStatus(t('onlineJoined'));
  }catch(e){
    const msg = e.message==='room_not_found' ? t('onlineRoomNotFound') :
      e.message==='room_full' ? t('caroRoomFull') :
      e.message==='room_not_open' ? t('caroRoomNotOpen') :
      e.message==='wrong_game_type' ? t('caroWrongRoom') :
      e.message==='already_hosting' ? t('onlineAlreadyHosting') : e.message;
    _caroStatus(msg, true);
  }
}

async function caroFindOpponent(){
  if(!canPlayCaro()){ _caroStatus(t('caroNeedLevel', CARO_MIN_LEVEL), true); return; }
  if(!await _caroRequireOnline()) return;
  const prefs = getCaroPrefs();
  _caroHide('caro-hub-panel');
  _caroShow('caro-mm-panel');
  document.getElementById('caro-mm-status').textContent = t('onlineSearching');
  try{
    await startMatchmaking(room=>{
      _caroHide('caro-mm-panel');
      const role = room.hostId===getOnlineUid() ? 'host' : 'guest';
      _caroOpenLobby(room.roomId, room.code, role, room);
      if(room.matchmaking && role==='host'){
        startOnlineRoomMatch(room.roomId, {
          turnSec: prefs.turnSec,
          boardSkin: prefs.skin
        }).catch(()=>{});
      }
    }, { gameType:'caro', turnSec: prefs.turnSec, boardSkin: prefs.skin });
  }catch(e){
    _caroHide('caro-mm-panel');
    _caroShow('caro-hub-panel');
    const msg = e.message==='already_hosting' ? t('onlineAlreadyHosting') : e.message;
    _caroStatus(msg, true);
  }
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
  if(!_caroBoardSkinUnlocked(id)){
    try{
      if(typeof showComboFlash === 'function'){
        showComboFlash(0, false, (typeof t==='function'?t('caroSkinLocked'):null) || '🔒 Mở nền này ở map xếp hình trước');
      } else if(typeof _caroStatus === 'function'){
        _caroStatus((typeof t==='function'?t('caroSkinLocked'):null) || '🔒 Mở nền này ở map xếp hình trước', true);
      }
    }catch(e){}
    return;
  }
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
    const locked = !_caroBoardSkinUnlocked(id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'caro-skin-chip' + (prefs.skin === id ? ' active' : '') + (locked ? ' locked' : '');
    btn.dataset.skin = id;
    btn.disabled = locked;
    btn.title = locked
      ? ((typeof t==='function'?t('caroSkinLocked'):null) || '🔒 Mở ở map xếp hình trước')
      : id;
    btn.style.background = 'linear-gradient(135deg,'+th.bg[0]+','+th.bg[1]+')';
    const skinName = (typeof BOARD_SKINS !== 'undefined' && Array.isArray(BOARD_SKINS))
      ? ((BOARD_SKINS.find(s => s.id === id) || {}).name || id)
      : id;
    btn.innerHTML = '<span class="caro-skin-xo"><i style="color:'+th.x+'">X</i><i style="color:'+th.o+'">O</i></span>'+
      '<small>'+(locked ? '🔒 ' : '')+skinName+'</small>';
    if(!locked){
      const pick = (e)=>{
        if(e){ e.preventDefault(); e.stopPropagation(); }
        _caroSelectSkinDraft(id, container);
      };
      btn.addEventListener('click', pick);
    }
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
  if(!_caroBoardSkinUnlocked(draft.skin)){
    draft.skin = _caroDefaultUnlockedSkin();
    _caroPrefsDraft = draft;
  }
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
    document.getElementById('caro-lobby-invite')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      if(typeof openChatPanel === 'function') openChatPanel('friends');
    });
    document.getElementById('caro-quit-btn')?.addEventListener('click', ()=>{ if(confirm(t('caroQuitConfirm'))) _caroQuit(); });
    document.getElementById('caro-result-close')?.addEventListener('click', _caroQuit);
    document.getElementById('caro-chat-toggle')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} _caroToggleChat(); });
    document.getElementById('caro-chat-close')?.addEventListener('click', ()=> _caroToggleChat(false));
    document.getElementById('caro-chat-form')?.addEventListener('submit', _caroSendChat);
    document.getElementById('caro-opp-avatar')?.addEventListener('click', ()=>{
      const btn = document.getElementById('caro-opp-avatar');
      if(!btn || btn.disabled) return;
      openPlayerCard({ uid: btn.dataset.uid, name: btn.dataset.name, avatar: btn.dataset.avatar });
    });
    document.getElementById('pc-close-btn')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} closePlayerCard(); });
    document.getElementById('pc-friend-btn')?.addEventListener('click', async ()=>{
      try{sfxClick();}catch(e){}
      const btn = document.getElementById('pc-friend-btn');
      const msg = document.getElementById('pc-msg');
      if(!btn || !btn.dataset.uid){
        if(msg) msg.textContent = typeof t==='function'?t('caroFriendNeedId'):'';
        return;
      }
      if(typeof isFriend === 'function' && isFriend(btn.dataset.uid)){
        if(msg) msg.textContent = typeof t==='function'?t('caroAlreadyFriend'):'Đã là bạn';
        btn.disabled = true;
        return;
      }
      if(typeof friendSlotsLeft === 'function' && friendSlotsLeft() < 1){
        if(msg) msg.textContent = typeof t==='function'?t('gchatFriendCapFull'):'Đã đủ số bạn tối đa';
        return;
      }
      const res = typeof sendFriendRequest === 'function'
        ? await sendFriendRequest({ uid: btn.dataset.uid, name: btn.dataset.name, avatar: btn.dataset.avatar })
        : (typeof addOnlineFriend === 'function'
          ? await addOnlineFriend({ uid: btn.dataset.uid, name: btn.dataset.name, avatar: btn.dataset.avatar })
          : { ok:false });
      if(msg){
        if(res.already) msg.textContent = typeof t==='function'?t('caroAlreadyFriend'):'Đã là bạn';
        else if(res.pending || (res.ok && !res.already)) msg.textContent = typeof t==='function'?t('caroFriendRequested'):'Đã gửi lời mời — chờ chấp nhận';
        else if(res.reason === 'cap') msg.textContent = typeof t==='function'?t('gchatFriendCapFull'):'Đã đủ số bạn tối đa';
        else msg.textContent = typeof t==='function'?t('caroFriendNeedId'):'Lỗi';
      }
      if(res.ok || res.pending){
        btn.disabled = true;
        btn.textContent = typeof t==='function'?t('caroFriendRequestedShort'):'Đã mời';
      }
    });
    refreshCaroButton();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
