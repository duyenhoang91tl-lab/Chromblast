// ═══════════════════════════════════════════════════════════════
// js/saga-map.js — Màn saga: vườn hoa + Samoyed (map 4) + cầu vồng 7 màu
// Kéo cầu vồng xem map đã qua (trái) / chưa phá (phải, có bông hoa).
// Nạp SAU map-manager.js + maps/map04.js (dùng drawDog lúc chạy).
// ═══════════════════════════════════════════════════════════════

const SAGA_BLURBS = {
  1: 'Bạn có thể tìm đường ra khỏi khu vườn không? Hãy nổ các ô cùng màu để tìm manh mối…',
  2: 'Thỏ đang bắn cà rốt lung tung! Điều khiển rùa né đạn càng lâu càng nhiều điểm.',
  3: 'Hoa quả bay lên khắp vườn — chém thật nhiều, tránh bom, săn CRITICAL ×5!',
  4: 'Samoyed đang chơi giữa vườn hoa. Chỉ đường chạy giúp chó và đập ong bay đi!',
  21: 'Ao sen nhìn từ trên xuống — ếch ngồi giữa lá sen, căn thời gian phóng lưỡi bắt ong, dế, châu chấu, bướm và cánh cứng!',
};
const SAGA_RAINBOW = ['#ff4d6d','#ff8c42','#ffd60a','#70e000','#4cc9f0','#7b2cbf','#f72585'];
/** Mỗi 4 map ẩn = 1 chặng Samoyed (nền khác nhau). */
const SAGA_EPISODES = [
  { id:0, from:1,  to:4,  theme:'garden', title:'Vườn hoa', speech:'Xin chào! Cùng chơi trong vườn hoa nhé 🌸' },
  { id:1, from:5,  to:8,  theme:'forest', title:'Khu rừng', speech:'Rừng sâu có nhiều bí mật — đi nào! 🌲' },
  { id:2, from:9,  to:12, theme:'castle', title:'Lâu đài', speech:'Lâu đài cổ đang chờ bạn khám phá! 🏰' },
  { id:3, from:13, to:16, theme:'ocean',  title:'Bờ biển', speech:'Sóng biển và kho báu đang chờ! 🌊' },
  { id:4, from:17, to:21, theme:'sky',    title:'Trời mây', speech:'Bay lên bầu trời cùng Samoyed! ☁️' },
];

let _sagaSelectedId = 1;
let _sagaFromUnlock = false;
let _sagaBound = false;
let _sagaRAF = null;
let _sagaScroll = 0;          // offset map (float) — kéo để xoay cầu vồng
let _sagaScrollVel = 0;
let _sagaDrag = null;         // {x0, scroll0}
let _sagaHitNodes = [];
let _sagaFlowers = [];
let _sagaButterflies = [];
let _sagaDog = null;
let _sagaT0 = 0;
let _sagaLevelsCache = null;
let _sagaEpisode = SAGA_EPISODES[0];

function sagaEpisodeForMapId(id){
  const n = Math.max(1, Math.min(21, id|0));
  return SAGA_EPISODES.find(e => n >= e.from && n <= e.to) || SAGA_EPISODES[0];
}
function sagaEpisodeLevels(ep){
  const e = ep || _sagaEpisode || SAGA_EPISODES[0];
  return sagaLevels().filter(l => l.id >= e.from && l.id <= e.to);
}

function sagaBuildLevels(){
  const out = [];
  for(let id = 1; id <= 21; id++){
    let key = 'map'+id, name = 'Map '+id;
    try{
      const d = (typeof getMap === 'function') ? getMap(id)
        : ((typeof MAP_REGISTRY !== 'undefined' && MAP_REGISTRY) ? MAP_REGISTRY[id] : null);
      if(d){
        if(d.key) key = d.key;
        if(d.name) name = d.name;
      }
    }catch(e){}
    out.push({
      id,
      key,
      listKey: (id === 1) ? 'secret1' : key,
      title: 'Map '+id+' — '+name,
      blurb: SAGA_BLURBS[id] || ('Tiếp tục hành trình qua khu vườn cầu vồng — Map '+id+' đang chờ!'),
      playLabel: 'Chơi',
    });
  }
  return out;
}

function sagaLevels(){
  if(!_sagaLevelsCache) _sagaLevelsCache = sagaBuildLevels();
  return _sagaLevelsCache;
}

function isSagaMapKey(key){
  if(!key) return false;
  try{
    if(typeof UNLOCK_STAGE_ORDER !== 'undefined' && UNLOCK_STAGE_ORDER && UNLOCK_STAGE_ORDER.indexOf(key) >= 0) return true;
  }catch(e){}
  return !!sagaLevelByKey(key);
}

function sagaLevelByKey(key){
  return sagaLevels().find(l => l.key === key || l.listKey === key) || null;
}

function sagaIsCleared(lv){
  try{
    if(typeof clearedHiddenMaps !== 'undefined' && clearedHiddenMaps){
      return clearedHiddenMaps.has(lv.listKey) || clearedHiddenMaps.has(lv.key);
    }
  }catch(e){}
  return false;
}

/** Id map cao nhất được chơi (1–21). */
function sagaMaxUnlockedId(){
  let max = 0;
  try{
    const gate = (typeof unlockGateStageIndex === 'number') ? unlockGateStageIndex : 0;
    max = Math.max(max, gate);
  }catch(e){}
  try{
    if(typeof pendingUnlock === 'string' && pendingUnlock){
      const p = sagaLevelByKey(pendingUnlock);
      if(p) max = Math.max(max, p.id);
    }
  }catch(e){}
  for(const lv of sagaLevels()){
    if(sagaIsCleared(lv)) max = Math.max(max, lv.id);
  }
  return Math.max(0, Math.min(21, max|0));
}

function sagaIsUnlocked(lv){
  return lv.id <= sagaMaxUnlockedId();
}

function sagaClearedCount(){
  return sagaEpisodeLevels().reduce((n, lv) => n + (sagaIsCleared(lv) ? 1 : 0), 0);
}

function hideSagaMapScreen(){
  const el = document.getElementById('saga-map-screen');
  if(!el) return;
  el.classList.remove('show');
  el.setAttribute('aria-hidden', 'true');
  _sagaStopLoop();
}

function _sagaStopLoop(){
  if(_sagaRAF){ cancelAnimationFrame(_sagaRAF); _sagaRAF = null; }
}

function _sagaPickDefaultId(opts){
  const o = opts || {};
  if(o.unlockKey){
    const lv = sagaLevelByKey(o.unlockKey);
    if(lv) return lv.id;
  }
  if(typeof o.afterClear === 'number' && o.afterClear >= 0){
    const nextId = Math.min(21, (o.afterClear|0) + 2);
    const maxU = sagaMaxUnlockedId();
    if(nextId <= maxU) return nextId;
    return Math.max(1, maxU || 1);
  }
  const maxU = sagaMaxUnlockedId();
  if(maxU <= 0) return 1;
  for(const lv of sagaLevels()){
    if(lv.id <= maxU && !sagaIsCleared(lv)) return lv.id;
  }
  return maxU;
}

function _sagaInitScene(W, H){
  _sagaFlowers = [];
  const colors = ['#FF6B8A','#FF4466','#FFD700','#FF69B4','#FF8C42','#DA70D6','#FF6347','#E040FB','#FFAB40','#7CFC00'];
  const types = ['tulip','daisy','rose','sunflower','daisy','tulip'];
  for(let i = 0; i < 42; i++){
    _sagaFlowers.push({
      x: 8 + Math.random() * (W - 16),
      y: H * 0.62 + Math.random() * (H * 0.34),
      type: types[i % types.length],
      size: 7 + Math.random() * 11,
      color: colors[i % colors.length],
      phase: Math.random() * Math.PI * 2,
      speed: 0.7 + Math.random() * 1.1,
      stemH: 14 + Math.random() * 22,
    });
  }
  _sagaFlowers.sort((a,b)=>a.y-b.y);

  _sagaButterflies = [];
  const bColors = ['#FF8A65','#CE93D8','#81D4FA','#FFD54F','#A5D6A7','#F48FB1'];
  for(let i = 0; i < 7; i++){
    _sagaButterflies.push({
      x: Math.random() * W,
      y: H * 0.12 + Math.random() * H * 0.38,
      vx: (Math.random() - 0.5) * 36,
      vy: (Math.random() - 0.5) * 22,
      color: bColors[i % bColors.length],
      phase: Math.random() * Math.PI * 2,
      size: 5 + Math.random() * 4,
    });
  }

  _sagaDog = {
    x: W * 0.5,
    y: H * 0.42,
    vx: 0, vy: 0,
    facing: 1,
    panicLevel: 0,
    running: false,
  };
}

function _sagaDrawFlower(ctx, f, t){
  const sway = Math.sin(t * f.speed + f.phase) * 2.2;
  const x = f.x + sway;
  const y = f.y;
  ctx.strokeStyle = '#3d8b40';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + sway * 0.6, y - f.stemH * 0.5, x, y - f.stemH);
  ctx.stroke();
  const cx = x, cy = y - f.stemH;
  const r = f.size * 0.45;
  if(f.type === 'sunflower'){
    for(let i = 0; i < 10; i++){
      const a = (i / 10) * Math.PI * 2 + t * 0.2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9, r * 0.45, r * 0.22, a, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD54F';
      ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#6D4C41'; ctx.fill();
  } else {
    for(let i = 0; i < 6; i++){
      const a = (i / 6) * Math.PI * 2 + f.phase;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.55, r * 0.28, a, 0, Math.PI * 2);
      ctx.fillStyle = f.color;
      ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF8E7'; ctx.fill();
  }
}

function _sagaDrawButterfly(ctx, b, t){
  const flap = 0.55 + Math.sin(t * 14 + b.phase) * 0.45;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy, b.vx) * 0.25);
  // cánh
  ctx.fillStyle = b.color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(-b.size * flap, -b.size * 0.2, b.size * flap, b.size * 0.7, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(b.size * flap, -b.size * 0.2, b.size * flap, b.size * 0.7, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#333';
  ctx.fillRect(-1, -b.size * 0.6, 2, b.size * 1.2);
  ctx.restore();
}

function _sagaDrawFlowerBadge(ctx, x, y, s, t){
  const bob = Math.sin(t * 3) * 1.2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.font = (s|0) + 'px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🌸', 0, 0);
  ctx.restore();
}

function _sagaNodePos(i, cx, cy, radius, scroll, total){
  // Góc: giữa cung ≈ -90° (đỉnh dưới của nửa trên… dùng nửa cung phía trên)
  // Map nằm trên cung từ trái (~200°) sang phải (~-20°), tâm chọn ở đáy cung (~90° xuống… )
  // Dùng cung mở phía trên: góc từ π+α đến −α, map tăng sang phải.
  const focus = scroll; // map index tại giữa
  const delta = i - focus;
  const spread = 0.42; // rad mỗi map
  const mid = -Math.PI / 2; // đỉnh trên của cung? User wants arc holding maps — classic rainbow is upper semicircle
  // Rainbow sits above dog: upper semicircle, selected near bottom-center of rainbow (= lowest point of upper arc = ends are left/right, center top)
  // Better UX: selected at BOTTOM of rainbow arch (closest to dog), past left, future right.
  // Angle 0 at +x, clockwise in canvas y-down... 
  // For upper semicircle center at (cx, cy+R*0.15): angle from π to 0 (left to right through top)
  // Selected at top of arc (angle -π/2): 
  const ang = -Math.PI / 2 + delta * spread;
  return {
    x: cx + Math.cos(ang) * radius,
    y: cy + Math.sin(ang) * radius,
    ang,
    delta,
  };
}

function _sagaDrawRainbow(ctx, cx, cy, radius, t){
  const bands = SAGA_RAINBOW.length;
  const bandW = 10;
  ctx.save();
  ctx.lineCap = 'round';
  for(let i = 0; i < bands; i++){
    const r = radius + (bands / 2 - i) * bandW;
    ctx.beginPath();
    // cung từ trái sang phải (qua đỉnh trên)
    ctx.arc(cx, cy, r, Math.PI * 0.95, Math.PI * 0.05, false);
    const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    const c0 = SAGA_RAINBOW[i];
    const c1 = SAGA_RAINBOW[(i + 1) % bands];
    g.addColorStop(0, c0);
    g.addColorStop(0.5, c1);
    g.addColorStop(1, c0);
    ctx.strokeStyle = g;
    ctx.globalAlpha = 0.82;
    ctx.lineWidth = bandW * 0.92;
    ctx.stroke();
  }
  // viền mềm
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + bands * bandW * 0.5 + 2, Math.PI * 0.95, Math.PI * 0.05, false);
  ctx.stroke();
  ctx.restore();
}

function _sagaDrawNode(ctx, lv, pos, selected, t){
  const cleared = sagaIsCleared(lv);
  const open = sagaIsUnlocked(lv);
  const isSel = selected && open;
  const r = isSel ? 26 : (open ? 20 : 18);
  const scale = Math.max(0.55, 1 - Math.abs(pos.delta) * 0.12);
  const x = pos.x, y = pos.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // bóng
  ctx.beginPath();
  ctx.ellipse(0, r * 0.85, r * 0.7, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(40,60,30,0.18)';
  ctx.fill();

  const grad = ctx.createLinearGradient(0, -r, 0, r);
  if(cleared){
    grad.addColorStop(0, '#ffc14a');
    grad.addColorStop(1, '#ff8a1f');
  } else if(open){
    grad.addColorStop(0, '#ff8fb8');
    grad.addColorStop(1, '#ff3d87');
  } else {
    grad.addColorStop(0, '#e8d5e0');
    grad.addColorStop(1, '#b8a0b0');
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = isSel ? 4 : 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.stroke();

  ctx.fillStyle = open ? '#fff' : '#7a6570';
  ctx.font = '900 '+(isSel ? 20 : 16)+'px Nunito, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if(cleared){
    ctx.fillText('✓', 0, 1);
  } else {
    ctx.fillText(String(lv.id), 0, 1);
  }

  // Map bên phải / chưa phá: bông hoa phía trên (không dùng dấu tích)
  if(!cleared){
    _sagaDrawFlowerBadge(ctx, 0, -r - 12, isSel ? 18 : 15, t + lv.id);
  }

  ctx.restore();
  return { id: lv.id, x, y, r: r * scale };
}

function _sagaUpdateInfo(){
  const levels = sagaEpisodeLevels();
  const selected = levels.find(l => l.id === _sagaSelectedId) || levels[0] || sagaLevels()[0];
  const unlocked = selected ? sagaIsUnlocked(selected) : false;
  const blurb = document.getElementById('saga-blurb');
  if(blurb && selected){
    const epTitle = (_sagaEpisode && _sagaEpisode.title) ? (' · '+_sagaEpisode.title) : '';
    blurb.innerHTML = '<div class="saga-blurb-title">'+selected.title+epTitle+'</div>'+
      '<div class="saga-blurb-text">'+selected.blurb+'</div>';
  }
  const prog = document.getElementById('saga-progress');
  if(prog){
    const total = levels.length || 4;
    prog.textContent = sagaClearedCount() + '/' + total;
  }
  const playBtn = document.getElementById('saga-play-btn');
  if(playBtn){
    playBtn.disabled = !unlocked;
    playBtn.textContent = unlocked ? ((selected && selected.playLabel) || 'Chơi') : 'Đang khoá';
  }
  const laterBtn = document.getElementById('saga-later-btn');
  if(laterBtn) laterBtn.style.display = _sagaFromUnlock ? '' : 'none';
  const speech = document.querySelector('#saga-map-screen .saga-speech');
  if(speech && _sagaEpisode) speech.textContent = _sagaEpisode.speech || speech.textContent;
}

function _sagaDrawThemeBackground(ctx, W, H, t, theme){
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if(theme === 'forest'){
    sky.addColorStop(0, '#1b4332');
    sky.addColorStop(0.45, '#2d6a4f');
    sky.addColorStop(1, '#081c15');
  } else if(theme === 'castle'){
    sky.addColorStop(0, '#3d348b');
    sky.addColorStop(0.4, '#7678ed');
    sky.addColorStop(1, '#2c2a4a');
  } else if(theme === 'ocean'){
    sky.addColorStop(0, '#48cae4');
    sky.addColorStop(0.5, '#00b4d8');
    sky.addColorStop(1, '#0077b6');
  } else if(theme === 'sky'){
    sky.addColorStop(0, '#caf0f8');
    sky.addColorStop(0.5, '#90e0ef');
    sky.addColorStop(1, '#ade8f4');
  } else {
    sky.addColorStop(0, '#7ec8ff');
    sky.addColorStop(0.4, '#b8e4ff');
    sky.addColorStop(0.7, '#dff5c8');
    sky.addColorStop(1, '#8fd86a');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // sun / moon
  ctx.beginPath();
  ctx.arc(W * 0.86, H * 0.1, 26 + Math.sin(t) * 1.5, 0, Math.PI * 2);
  if(theme === 'castle'){
    ctx.fillStyle = '#f8f9fa';
    ctx.shadowColor = 'rgba(200,220,255,0.45)';
  } else {
    ctx.fillStyle = '#ffd84a';
    ctx.shadowColor = 'rgba(255,210,80,0.55)';
  }
  ctx.shadowBlur = 22;
  ctx.fill();
  ctx.shadowBlur = 0;

  if(theme === 'forest'){
    ctx.fillStyle = '#1b4332';
    for(let i = 0; i < 7; i++){
      const x = (i / 6) * W;
      const h = 80 + (i % 3) * 28;
      ctx.beginPath();
      ctx.moveTo(x, H * 0.72);
      ctx.lineTo(x + 28, H * 0.72 - h);
      ctx.lineTo(x + 56, H * 0.72);
      ctx.fill();
    }
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
  } else if(theme === 'castle'){
    ctx.fillStyle = '#4a4e69';
    ctx.fillRect(W * 0.2, H * 0.48, W * 0.6, H * 0.28);
    ctx.fillRect(W * 0.18, H * 0.42, 36, 40);
    ctx.fillRect(W * 0.72, H * 0.42, 36, 40);
    ctx.fillStyle = '#22223b';
    ctx.fillRect(0, H * 0.72, W, H * 0.28);
  } else if(theme === 'ocean'){
    ctx.fillStyle = '#023e8a';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.68);
    for(let x = 0; x <= W; x += 20){
      ctx.lineTo(x, H * 0.68 + Math.sin(x * 0.04 + t * 2) * 8);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#0077b6';
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
  } else if(theme === 'sky'){
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    [[0.2,0.22],[0.55,0.18],[0.78,0.28]].forEach(([px, py], i)=>{
      const cx = W * px, cy = H * py + Math.sin(t + i) * 4;
      ctx.beginPath(); ctx.ellipse(cx, cy, 36, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - 22, cy + 4, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 24, cy + 6, 24, 13, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#b5e48c';
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
  } else {
    ctx.fillStyle = '#6fbe4e';
    ctx.beginPath();
    ctx.ellipse(W * 0.2, H * 0.72, W * 0.45, H * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7bc95a';
    ctx.beginPath();
    ctx.ellipse(W * 0.78, H * 0.74, W * 0.5, H * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8fd86a';
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
  }
}

function _sagaResizeCanvas(){
  const cv = document.getElementById('saga-canvas');
  const screen = document.getElementById('saga-map-screen');
  if(!cv || !screen) return { W: 360, H: 640, dpr: 1 };
  const rect = screen.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = Math.max(280, rect.width || window.innerWidth);
  const cssH = Math.max(420, rect.height || window.innerHeight);
  cv.width = Math.floor(cssW * dpr);
  cv.height = Math.floor(cssH * dpr);
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { W: cssW, H: cssH, dpr, ctx };
}

function _sagaFrame(now){
  const screen = document.getElementById('saga-map-screen');
  if(!screen || !screen.classList.contains('show')){ _sagaRAF = null; return; }
  const { W, H, ctx } = _sagaResizeCanvas();
  if(!ctx){ _sagaRAF = requestAnimationFrame(_sagaFrame); return; }
  if(!_sagaT0) _sagaT0 = now;
  const t = (now - _sagaT0) / 1000;

  // inertia
  if(!_sagaDrag && Math.abs(_sagaScrollVel) > 0.001){
    _sagaScroll += _sagaScrollVel;
    _sagaScrollVel *= 0.9;
  }
  const epClamp = _sagaEpisode || SAGA_EPISODES[0];
  _sagaScroll = Math.max(epClamp.from, Math.min(epClamp.to, _sagaScroll));

  // snap soft toward selected when idle
  if(!_sagaDrag && Math.abs(_sagaScrollVel) < 0.02){
    _sagaScroll += (_sagaSelectedId - _sagaScroll) * 0.08;
  }

  ctx.clearRect(0, 0, W, H);

  const theme = (epClamp && epClamp.theme) || 'garden';
  _sagaDrawThemeBackground(ctx, W, H, t, theme);

  if(!_sagaFlowers.length) _sagaInitScene(W, H);
  if(theme === 'garden' || theme === 'forest'){
    _sagaFlowers.forEach(f => _sagaDrawFlower(ctx, f, t));
  } else if(theme === 'ocean'){
    // sò / đá nhỏ dùng lại flower positions
    _sagaFlowers.forEach((f, i) => {
      if(i % 3 !== 0) return;
      ctx.beginPath();
      ctx.ellipse(f.x, H * 0.78 + (f.y % 20), f.size * 0.5, f.size * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? '#f8bbd0' : '#ffe0b2';
      ctx.fill();
    });
  }

  _sagaButterflies.forEach(b => {
    b.x += b.vx * 0.016;
    b.y += b.vy * 0.016;
    b.phase += 0.016;
    if(Math.random() < 0.008){
      b.vx += (Math.random() - 0.5) * 40;
      b.vy += (Math.random() - 0.5) * 30;
      b.vx = Math.max(-34, Math.min(34, b.vx));
      b.vy = Math.max(-22, Math.min(22, b.vy));
    }
    if(b.x < 8) b.vx = Math.abs(b.vx);
    if(b.x > W - 8) b.vx = -Math.abs(b.vx);
    if(b.y < H * 0.08) b.vy = Math.abs(b.vy);
    if(b.y > H * 0.55) b.vy = -Math.abs(b.vy);
    if(theme === 'garden' || theme === 'forest' || theme === 'sky') _sagaDrawButterfly(ctx, b, t);
  });

  // Rainbow + nodes — chỉ map trong chặng hiện tại (4 map)
  const epLevels = sagaEpisodeLevels();
  const ep = _sagaEpisode || SAGA_EPISODES[0];
  const scrollMin = ep.from;
  const scrollMax = ep.to;
  _sagaScroll = Math.max(scrollMin, Math.min(scrollMax, _sagaScroll));

  const rcx = W * 0.5;
  const rcy = H * 0.38;
  const radius = Math.min(W * 0.42, H * 0.22, 150);
  _sagaDrawRainbow(ctx, rcx, rcy, radius, t);

  _sagaHitNodes = [];
  const order = epLevels.slice().sort((a, b) => {
    return Math.abs(b.id - _sagaScroll) - Math.abs(a.id - _sagaScroll);
  });
  order.forEach(lv => {
    const pos = _sagaNodePos(lv.id, rcx, rcy, radius, _sagaScroll, epLevels.length);
    if(Math.abs(pos.delta) > 3.5) return;
    const hit = _sagaDrawNode(ctx, lv, pos, lv.id === _sagaSelectedId, t);
    _sagaHitNodes.push(hit);
  });

  // Samoyed (map 4 drawDog)
  if(!_sagaDog) _sagaInitScene(W, H);
  _sagaDog.x = W * 0.5;
  _sagaDog.y = Math.min(H * 0.58, rcy + radius * 0.55 + 48);
  _sagaDog.facing = (Math.sin(t * 0.7) > 0) ? 1 : -1;
  try{
    if(typeof drawDog === 'function'){
      ctx.save();
      ctx.translate(0, 0);
      // phóng to nhẹ so với map 4
      ctx.translate(_sagaDog.x, _sagaDog.y);
      ctx.scale(1.55, 1.55);
      ctx.translate(-_sagaDog.x, -_sagaDog.y);
      drawDog(ctx, t, _sagaDog);
      ctx.restore();
    }
  }catch(e){}

  _sagaRAF = requestAnimationFrame(_sagaFrame);
}

function _sagaStartLoop(){
  _sagaStopLoop();
  _sagaT0 = 0;
  const { W, H } = _sagaResizeCanvas();
  _sagaInitScene(W, H);
  _sagaRAF = requestAnimationFrame(_sagaFrame);
}

function _sagaRender(){
  _sagaUpdateInfo();
}

function showSagaMapScreen(opts){
  const o = opts || {};
  const screen = document.getElementById('saga-map-screen');
  if(!screen) return false;

  if(o.unlockKey && typeof autoSkipHiddenMaps !== 'undefined' && autoSkipHiddenMaps){
    try{
      unlockDeferred = true;
      if(typeof syncMainHardTierFromNormalStage === 'function') syncMainHardTierFromNormalStage(true);
      if(typeof updateBurstCount === 'function') updateBurstCount();
    }catch(e){}
    return false;
  }

  _sagaLevelsCache = null;
  _sagaFromUnlock = !!o.unlockKey;
  if(o.unlockKey){
    try{ pendingUnlock = o.unlockKey; }catch(e){}
  }
  _sagaSelectedId = _sagaPickDefaultId(o);
  if(_sagaSelectedId < 1) _sagaSelectedId = 1;
  _sagaEpisode = sagaEpisodeForMapId(_sagaSelectedId);
  // Giữ chọn trong chặng
  _sagaSelectedId = Math.max(_sagaEpisode.from, Math.min(_sagaEpisode.to, _sagaSelectedId));
  _sagaScroll = _sagaSelectedId;
  _sagaScrollVel = 0;

  try{ if(typeof sfxUnlock === 'function') sfxUnlock(); }catch(e){}

  _sagaBindOnce();
  _sagaRender();
  screen.classList.add('show');
  screen.setAttribute('aria-hidden', 'false');
  screen.classList.remove('saga-enter');
  void screen.offsetWidth;
  screen.classList.add('saga-enter');
  _sagaStartLoop();
  return true;
}

function playSelectedSagaLevel(){
  const lv = sagaLevels().find(l => l.id === _sagaSelectedId);
  if(!lv || !sagaIsUnlocked(lv)) return;
  try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
  hideSagaMapScreen();
  try{
    const uo = document.getElementById('unlock-overlay');
    if(uo) uo.classList.remove('show');
  }catch(e){}
  try{ unlockDeferred = false; }catch(e){}
  try{ pendingUnlock = lv.key; }catch(e){}
  try{ hiddenMapEntryScore = score; }catch(e){}

  // Không startGame() — giữ điểm + tiến trình cổng ★★★ / map ẩn
  try{ if(typeof hardResetAllModes === 'function') hardResetAllModes(); }catch(e){}

  let started = false;
  try{
    if(typeof startMap === 'function') started = !!startMap(lv.key);
  }catch(e){ started = false; }
  if(!started){
    try{
      const maps = (typeof HIDDEN_MAP_LIST !== 'undefined') ? HIDDEN_MAP_LIST : [];
      const m = maps.find(x => x && (x.key === lv.listKey || x.key === lv.key));
      if(m && typeof m.run === 'function'){ m.run(); started = true; }
    }catch(e){}
  }
  if(!started){
    try{
      if(lv.key === 'secret' && typeof enterSecretMode === 'function') enterSecretMode();
      else if(lv.key === 'dodge' && typeof enterDodgeMode === 'function') enterDodgeMode();
      else if(lv.key === 'fruit' && typeof enterFruitMode === 'function') enterFruitMode();
      else if(lv.key === 'bee' && typeof enterBeeMode === 'function') enterBeeMode();
    }catch(e){}
  }
}

function _sagaDeferUnlock(){
  try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
  hideSagaMapScreen();
  try{
    const chk = document.getElementById('unlock-autoskip-chk');
    if(chk){ autoSkipHiddenMaps = chk.checked; saveAutoSkipHiddenMaps(autoSkipHiddenMaps); }
  }catch(e){}
  try{
    unlockDeferred = true;
    // Về map thường ngay → áp cơ chế đúng Map N (vd. Map 3 = núi)
    if(typeof syncMainHardTierFromNormalStage === 'function') syncMainHardTierFromNormalStage(true);
    if(typeof updateBurstCount === 'function') updateBurstCount();
  }catch(e){}
}

function _sagaSelectId(id){
  const lv = sagaLevels().find(l => l.id === id);
  if(!lv) return;
  _sagaSelectedId = id;
  _sagaScrollVel = 0;
  _sagaUpdateInfo();
  try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
}

function _sagaBindOnce(){
  if(_sagaBound) return;
  _sagaBound = true;
  const cv = document.getElementById('saga-canvas');
  const screen = document.getElementById('saga-map-screen');

  const onDown = (e) => {
    if(!screen || !screen.classList.contains('show')) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    _sagaDrag = { x0: x, scroll0: _sagaScroll, moved: false };
    _sagaScrollVel = 0;
  };
  const onMove = (e) => {
    if(!_sagaDrag) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const dx = x - _sagaDrag.x0;
    if(Math.abs(dx) > 6) _sagaDrag.moved = true;
    // kéo sang phải → xem map đã qua (id nhỏ hơn) → giảm scroll
    const next = _sagaDrag.scroll0 - dx / 56;
    _sagaScrollVel = next - _sagaScroll;
    _sagaScroll = next;
    if(e.cancelable) e.preventDefault();
  };
  const onUp = (e) => {
    if(!_sagaDrag) return;
    const drag = _sagaDrag;
    _sagaDrag = null;
    const x = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    const y = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
    if(!drag.moved && cv){
      const rect = cv.getBoundingClientRect();
      const lx = x - rect.left;
      const ly = y - rect.top;
      // hit test gần nhất
      let best = null, bestD = 1e9;
      _sagaHitNodes.forEach(n => {
        const d = (n.x - lx) * (n.x - lx) + (n.y - ly) * (n.y - ly);
        if(d < bestD && d < (n.r + 14) * (n.r + 14)){ bestD = d; best = n; }
      });
      if(best){
        _sagaSelectId(best.id);
        return;
      }
    }
    // snap tới map gần nhất trong chặng
    const ep = _sagaEpisode || SAGA_EPISODES[0];
    const snapped = Math.round(_sagaScroll);
    _sagaSelectId(Math.max(ep.from, Math.min(ep.to, snapped)));
    _sagaScroll = _sagaSelectedId;
  };

  if(cv){
    cv.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    cv.addEventListener('touchstart', onDown, { passive: true });
    cv.addEventListener('touchmove', onMove, { passive: false });
    cv.addEventListener('touchend', onUp);
  }

  document.getElementById('saga-play-btn')?.addEventListener('click', playSelectedSagaLevel);
  document.getElementById('saga-later-btn')?.addEventListener('click', _sagaDeferUnlock);
  document.getElementById('saga-close-btn')?.addEventListener('click', () => {
    try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
    if(_sagaFromUnlock) _sagaDeferUnlock();
    else hideSagaMapScreen();
  });

  window.addEventListener('resize', () => {
    if(screen && screen.classList.contains('show')){
      const { W, H } = _sagaResizeCanvas();
      if(!_sagaFlowers.length) _sagaInitScene(W, H);
    }
  });
}

function showSagaUnlock(stageKey){
  if(!isSagaMapKey(stageKey)) return false;
  return showSagaMapScreen({ unlockKey: stageKey });
}

function showSagaAfterClear(clearedIdx){
  if(!(clearedIdx >= 0 && clearedIdx <= 2)) return false;
  return showSagaMapScreen({ afterClear: clearedIdx|0 });
}

try{
  window.showSagaMapScreen = showSagaMapScreen;
  window.hideSagaMapScreen = hideSagaMapScreen;
  window.showSagaUnlock = showSagaUnlock;
  window.showSagaAfterClear = showSagaAfterClear;
  window.isSagaMapKey = isSagaMapKey;
}catch(e){}
