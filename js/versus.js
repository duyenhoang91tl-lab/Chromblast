// ═══════════════════════════════════════════════════════════════
// js/versus.js — ĐẤU 1-1 SONG SONG (mở khoá từ Level 10)
// Hai bàn cờ 7×7 trên cùng màn hình (bàn trên xoay 180° — 2 người ngồi đối
// diện). Cùng chuỗi khối từ CÙNG hạt giống (PRNG riêng mỗi người → công bằng
// tuyệt đối dù tốc độ đặt khác nhau).
// Xoay/đặt giống map thường: chạm chọn · chạm lại xoay · kéo ghost + ô mờ · thả đặt.
// Nổ khi lấp đầy 1 hàng/cột, hoặc cụm cùng màu >= VS_GROUP_MIN (8) ô nối liền.
// Cứ 3 lần ăn (không cần liên tiếp) → rút thẻ chướng ngại lên bàn ĐỐI THỦ.
// ⛰️ núi đá · 🌪️ lốc xoáy · 🧊 băng giá · 🌫️ sương mù · 🐿️ sóc ăn ô · 💣 bom.
// Tự chứa 100%: không đụng board/pieces/score của bàn chính.
// GHI CHÚ ONLINE: đồng bộ {seed, nước đi, thẻ} qua server là đấu được 2 máy.
// Nạp SAU main.js. ═══════════════════════════════════════════════
const VERSUS_TIME = 90;        // giây mỗi trận
const VERSUS_MIN_LEVEL = 10;   // cấp (XP) tối thiểu để mở phòng
const VERSUS_WIN_XP = 30;
const VS_N = 7;                // bàn 7×7
const VS_COLORS = COLORS.slice(0, 5);
const VS_GROUP_MIN = 8;        // cụm cùng màu >= 8 ô mới nổ (5 quá dễ — vừa đặt vào đã phá)
const VS_CARD_EVERY = 3;       // cứ 3 lần ăn (không cần liên tiếp) → rút thẻ
// Bộ chướng ngại: id ↔ chỉ số tên trong MECH_NAME (i18n sẵn có)
const VS_OBSTACLES = [
  { id:'mountain', nameIdx:2,  emoji:'⛰️' },
  { id:'tornado',  nameIdx:7,  emoji:'🌪️' },
  { id:'ice',      nameIdx:4,  emoji:'🧊' },
  { id:'fog',      nameIdx:5,  emoji:'🌫️' },
  { id:'squirrel', nameIdx:3,  emoji:'🐿️' },
  { id:'bomb',     nameIdx:6,  emoji:'💣' },
];

let versusMode = false;
let _vs = null; // {seed,names,players:[P,P],timeLeft,timer}

function _mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canHostVersus(){ return (typeof playerLevel!=='undefined' && playerLevel >= VERSUS_MIN_LEVEL); }
function _vsShow(id){ const el=document.getElementById(id); if(el) el.classList.add('show'); }
function _vsHide(id){ const el=document.getElementById(id); if(el) el.classList.remove('show'); }

/** Hiện/ẩn nút ⚔️ theo Lv.10 — gọi khi vào game và mỗi lần lên cấp */
function refreshVersusButton(){
  const ok=canHostVersus();
  const btn=document.getElementById('versus-btn');
  if(btn){
    btn.classList.toggle('vs-unlocked', ok);
    btn.setAttribute('aria-hidden', ok ? 'false' : 'true');
    btn.title = ok
      ? (typeof t==='function' ? t('ttVersus') : 'Đấu 1-1')
      : (typeof t==='function' ? t('vsNeedLevel', VERSUS_MIN_LEVEL) : ('Đạt Lv.'+VERSUS_MIN_LEVEL+' để mở'));
  }
  const setBtn=document.getElementById('set-btn-versus');
  if(setBtn) setBtn.style.display = ok ? '' : 'none';
}

// ── Sinh khối: mỗi người 1 PRNG cùng seed → cùng chuỗi khối ──
function _vsMakePiece(P){
  const R = P.prng;
  const wantHard = R() < 0.55;
  const pool = SHAPES.filter(s => wantHard ? s.length>=4 : s.length<=3);
  const shape = pool[Math.floor(R()*pool.length)];
  return { shape, color: VS_COLORS[Math.floor(R()*VS_COLORS.length)], used:false, rot:0 };
}
function _vsRefill(P){ P.pieces=[_vsMakePiece(P),_vsMakePiece(P),_vsMakePiece(P)]; P.selected=-1; }

function _rotShape(s){
  const maxR=Math.max(...s.map(([r])=>r));
  let next=s.map(([r,c])=>[c, maxR-r]);
  // Chuẩn hoá như map thường: góc trên-trái về (0,0)
  const minR=Math.min(...next.map(([r])=>r));
  const minC=Math.min(...next.map(([,c])=>c));
  return next.map(([r,c])=>[r-minR, c-minC]);
}

// ── Khởi tạo trận ──
function openVersusSetup(){
  try{ sfxClick(); }catch(e){}
  if(!canHostVersus()){
    try{ showComboFlash(0,false,t('vsNeedLevel', VERSUS_MIN_LEVEL)); }catch(e){}
    try{ showHint(t('vsNeedLevel', VERSUS_MIN_LEVEL)); }catch(e){}
    return;
  }
  const p1=document.getElementById('vs-name1');
  if(p1 && typeof currentUser!=='undefined' && currentUser && currentUser.username) p1.value=currentUser.username;
  _vsShow('versus-setup-panel');
}

function startVersusMatch(){
  const n1=(document.getElementById('vs-name1').value.trim()||t('vsP1'));
  const n2=(document.getElementById('vs-name2').value.trim()||t('vsP2'));
  _vsHide('versus-setup-panel');
  if(typeof hardResetAllModes==='function') hardResetAllModes();
  const seed=(Date.now() ^ (Math.random()*0xFFFFFFF))>>>0;
  _vs={ seed, names:[n1,n2], timeLeft:VERSUS_TIME, timer:null,
        players:[_vsNewPlayer(0,seed), _vsNewPlayer(1,seed)] };
  versusMode=true;
  _vsBuildArena();
  _vs.players.forEach(P=>{ _vsRefill(P); _vsRenderAll(P); });
  // đếm ngược 3-2-1 rồi bắt đầu
  let cd=3;
  const cdEl=document.getElementById('vs-countdown');
  cdEl.style.display='flex'; cdEl.textContent=cd;
  const ci=setInterval(()=>{
    cd--;
    if(cd>0){ cdEl.textContent=cd; try{ sfxClick(); }catch(e){} return; }
    clearInterval(ci); cdEl.style.display='none';
    _vs.timer=setInterval(_vsTick,1000); _vsTick();
    try{ startBgm('action'); }catch(e){}
  },800);
}

function _vsNewPlayer(idx,seed){
  return { idx, prng:_mulberry32(seed), board:Array.from({length:VS_N},()=>Array(VS_N).fill(null)),
    pieces:[], selected:-1, score:0, combo:0, clears:0, nextCardAt:VS_CARD_EVERY,
    rocks:new Set(), ice:new Set(), fogUntil:0, done:false, el:{} };
}

// Nút trợ giúp ❓ nổi (z-index cao hơn đấu trường) đè lên điểm người chơi trên
// thanh HUD chung → ẩn đi trong suốt trận đấu, trả lại khi trận kết thúc.
function _vsToggleGlobalUI(hide){
  ['help-btn','hiddenmap-help-btn'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    if(hide){ el.dataset.vsHidden=el.style.display||''; el.style.display='none'; }
    else if('vsHidden' in el.dataset){ el.style.display=el.dataset.vsHidden; delete el.dataset.vsHidden; }
  });
}

// ── Dựng giao diện 2 nửa màn ──
function _vsBuildArena(){
  let arena=document.getElementById('versus-arena');
  if(arena) arena.remove();
  _vsToggleGlobalUI(true);
  arena=document.createElement('div'); arena.id='versus-arena';
  
  // TẠO THANH GIAO DIỆN CHUNG BÊN TRÊN CÙNG
  arena.innerHTML =
    '<div id="vs-top-hud" style="position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; align-items: center; z-index: 999; background: rgba(0,0,0,0.7); padding: 8px 15px; border-radius: 8px; color: white; font-family: Nunito,system-ui,sans-serif;">'+
      '<div style="font-weight: bold; font-size: 16px; color: #ff4d4d;">'+escapeHtml(_vs.names[1])+': <span id="vs-global-score1">0</span> <span id="vs-global-combo1" style="color:#ffcc00"></span></div>'+
      '<div style="display: flex; align-items: center; gap: 20px;">'+
        '<div style="font-weight: bold; font-size: 16px; color: #4da6ff;">'+escapeHtml(_vs.names[0])+': <span id="vs-global-score0">0</span> <span id="vs-global-combo0" style="color:#ffcc00"></span></div>'+
        '<div id="vs-mid-timer" style="font-size: 22px; font-weight: bold; color: #ffd700;">'+VERSUS_TIME+'</div>'+
        '<button id="vs-quit-btn" style="position: static; transform: none; width: auto; height: auto; background: #ff4444; border: none; color: white; border-radius: 4px; padding: 4px 10px; font-weight: bold; cursor: pointer;">✕</button>'+
      '</div>'+
    '</div>'+
    '<div id="vs-countdown"></div>';

  document.body.appendChild(arena);
  _vs.players.forEach((P,i)=>{
    const half=document.createElement('div');
    half.className='vs-half'+(i===0?' vs-top':' vs-bottom');
    
    // Ẩn HUD cũ của từng nửa màn hình
    half.innerHTML=
      '<div class="vs-hud" style="display:none;"><span class="vs-name">'+escapeHtml(_vs.names[i])+'</span>'+
      '<span class="vs-score">0</span><span class="vs-combo"></span></div>'+
      '<div class="vs-grid"></div>'+
      '<div class="vs-tray"></div>'+
      '<div class="vs-cards"></div>'+
      '<div class="vs-note"></div>';
      
    arena.appendChild(half);
    P.el.half=half;
    P.el.score=half.querySelector('.vs-score');
    P.el.combo=half.querySelector('.vs-combo');
    P.el.grid=half.querySelector('.vs-grid');
    P.el.tray=half.querySelector('.vs-tray');
    P.el.cards=half.querySelector('.vs-cards');
    P.el.note=half.querySelector('.vs-note');
    
    // lưới ô — pointerdown bắt đầu kéo tinh chỉnh khi đã chọn khối (giống map thường)
    P.el.cells=[];
    for(let r=0;r<VS_N;r++){ P.el.cells[r]=[];
      for(let c=0;c<VS_N;c++){
        const d=document.createElement('div'); d.className='vs-cell';
        d.addEventListener('pointerdown',ev=>{
          if(!versusMode||P.done||P.selected<0) return;
          if(P.el.cards.classList.contains('show')) return;
          ev.preventDefault();
          _vsBeginDrag(P, ev);
        });
        P.el.grid.appendChild(d); P.el.cells[r][c]=d;
      }
    }
    // Ghost kéo-thả riêng cho mỗi nửa bàn (nửa trên xoay 180°)
    const ghost=document.createElement('div');
    ghost.className='vs-ghost';
    half.appendChild(ghost);
    P.el.ghost=ghost;
  });
  document.getElementById('vs-quit-btn').addEventListener('click',()=>{ if(confirm('Thoát trận?')) _vsAbort(); });
}

function _vsAbort(){
  if(_vs && _vs.timer) clearInterval(_vs.timer);
  const a=document.getElementById('versus-arena'); if(a) a.remove();
  _vsToggleGlobalUI(false);
  versusMode=false; _vs=null;
  try{ startBgm('main'); }catch(e){}
}

// ── Render ──
function _vsRenderAll(P){ _vsRenderGrid(P); _vsRenderTray(P); _vsRenderHud(P); }
function _vsRenderHud(P){
  P.el.score.textContent=P.score.toLocaleString();
  P.el.combo.textContent=P.combo>=2?('🔥x'+P.combo):'';
  
  // Đồng bộ lên thanh HUD chung
  const globalScore = document.getElementById('vs-global-score' + P.idx);
  const globalCombo = document.getElementById('vs-global-combo' + P.idx);
  if(globalScore) globalScore.textContent = P.score.toLocaleString();
  if(globalCombo) globalCombo.textContent = P.combo>=2?(' 🔥x'+P.combo):'';
}
function _vsRenderGrid(P){
  const fog = Date.now()<P.fogUntil;
  for(let r=0;r<VS_N;r++)for(let c=0;c<VS_N;c++){
    const d=P.el.cells[r][c], k=r+','+c, v=P.board[r][c];
    d.className='vs-cell';
    d.textContent='';
    d.style.background='';
    d.style.removeProperty('--cc');
    if(P.rocks.has(k)){ d.classList.add('vs-rock'); d.textContent='⛰️'; }
    else if(v){
      d.classList.add('vs-filled');
      d.style.setProperty('--cc', fog ? '#5a5f6e' : v);
      if(P.ice.has(k)){ d.classList.add('vs-ice'); d.textContent='🧊'; }
    }
  }
}
function _vsRenderTray(P){
  P.el.tray.innerHTML='';
  P.pieces.forEach((pc,i)=>{
    const s=document.createElement('div');
    s.className='vs-piece'+(pc.used?' used':'')+(P.selected===i?' sel':'');
    
    // Vẽ mini khối: mọi viên gạch dùng CÙNG một kích thước cố định (như khay map
    // thường) — trước đây dùng track `1fr` trong khung 34×30 cố định nên viên gạch
    // to/nhỏ khác nhau tuỳ hình khối, thậm chí chồng lên nhau làm khối "mất ô".
    const mini=document.createElement('div'); mini.className='vs-mini';
    const cells=pc.shape;
    const maxR=Math.max(...cells.map(x=>x[0])), maxC=Math.max(...cells.map(x=>x[1]));
    const CS=9; // px mỗi viên — khối dài nhất 4 ô: 4×9 + 3×2 khe = 42px, vừa khay 52×44
    mini.style.gridTemplateRows='repeat('+(maxR+1)+','+CS+'px)';
    mini.style.gridTemplateColumns='repeat('+(maxC+1)+','+CS+'px)';
    for(let r=0;r<=maxR;r++)for(let c=0;c<=maxC;c++){
      const b=document.createElement('div');
      if(cells.some(([rr,cc])=>rr===r&&cc===c)){ 
         b.className='vs-mini-candy';
         b.style.setProperty('--cc',pc.color);
      }
      mini.appendChild(b);
    }
    s.appendChild(mini);
    s.addEventListener('pointerdown',ev=>{ ev.preventDefault(); _vsPieceTap(P,i,ev); });
    P.el.tray.appendChild(s);
  });
}

// ── Thao tác — giống map thường: chạm chọn / chạm lại xoay / kéo ghost + ô mờ / thả đặt ──
function _vsPieceTap(P,i,ev){
  if(!versusMode||P.done||P.pieces[i].used) return;
  if(P.el.cards.classList.contains('show')) return;
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }

  if(P.selected===i){
    // Chạm lại khối đang chọn → xoay (như map thường)
    P.pieces[i].shape=_rotShape(P.pieces[i].shape);
    try{ sfxRotate(); }catch(e){ try{ sfxClick(); }catch(e2){} }
  } else {
    P.selected=i;
    try{ sfxSelect(); }catch(e){ try{ sfxClick(); }catch(e2){} }
  }
  _vsRenderTray(P);
  if(ev) _vsBeginDrag(P, ev);
}

/* ── Kéo-thả + ghost + ô mờ (mỗi người 1 pointerId) ── */
const _vsDrags=new Map(); // pointerId -> {P, sx, sy, moved, pointerType}

function _vsGridGeom(P){
  const a=P.el.cells[0][0].getBoundingClientRect();
  const b=P.el.cells[0][1].getBoundingClientRect();
  const c=P.el.cells[1][0].getBoundingClientRect();
  return {
    x0:a.left, y0:a.top, cell:a.width,
    stepX:(b.left-a.left)||a.width,
    stepY:(c.top-a.top)||a.height,
  };
}
function _vsPieceBox(P,pc){
  const maxR=Math.max(...pc.shape.map(p=>p[0]));
  const maxC=Math.max(...pc.shape.map(p=>p[1]));
  const g=_vsGridGeom(P);
  const stepX=Math.abs(g.stepX), stepY=Math.abs(g.stepY);
  return { maxR, maxC, g, stepX, stepY, bbW:maxC*stepX+g.cell, bbH:maxR*stepY+g.cell };
}
function _vsGhostAnchor(x,y,bbH,ptype){
  if(ptype==='touch'||ptype==='pen') return [x, y-40-bbH/2];
  return [x, y];
}
/** Quy đổi con trỏ → ô gốc (góc trên-trái khung bao) — cùng công thức map thường */
function _vsOriginFromPointer(P,x,y,ptype){
  if(P.selected<0) return null;
  const pc=P.pieces[P.selected];
  if(!pc||pc.used) return null;
  const {g,bbW,bbH,maxR,maxC}=_vsPieceBox(P,pc);
  const [ax,ay]=_vsGhostAnchor(x,y,bbH,ptype);
  const ox=ax-bbW/2, oy=ay-bbH/2;
  let C=Math.round((ox-g.x0)/g.stepX);
  let R=Math.round((oy-g.y0)/g.stepY);
  if(R<-1-maxR||C<-1-maxC||R>VS_N+maxR||C>VS_N+maxC) return null;
  R=Math.max(0,Math.min(VS_N-1-maxR,R));
  C=Math.max(0,Math.min(VS_N-1-maxC,C));
  return {R,C};
}

function _vsBuildGhost(P){
  const gEl=P.el.ghost; if(!gEl||P.selected<0) return;
  const pc=P.pieces[P.selected]; if(!pc||pc.used){ _vsHideGhost(P); return; }
  const {g,maxR,maxC,stepX}=_vsPieceBox(P,pc);
  const gap=Math.max(0, stepX-g.cell);
  gEl.style.gridTemplateColumns=`repeat(${maxC+1},${g.cell}px)`;
  gEl.style.gap=gap+'px';
  gEl.innerHTML='';
  const cells=Array((maxR+1)*(maxC+1)).fill(null);
  pc.shape.forEach(([r,c])=>{ cells[r*(maxC+1)+c]=pc.color; });
  cells.forEach(color=>{
    const d=document.createElement('div');
    d.className='vs-g-cell'+(color?' candy':'');
    d.style.width=g.cell+'px';
    d.style.height=g.cell+'px';
    if(color) d.style.setProperty('--cc',color);
    else d.style.visibility='hidden';
    gEl.appendChild(d);
  });
  gEl.classList.add('active');
  // Nửa trên xoay 180° — ghost cố định viewport nên xoay lại cho khớp
  gEl.classList.toggle('vs-ghost-flip', P.idx===0);
}
function _vsHideGhost(P){
  const gEl=P.el.ghost; if(!gEl) return;
  gEl.classList.remove('active','vs-ghost-flip');
  gEl.innerHTML='';
}
function _vsMoveGhost(P,x,y,ptype){
  const gEl=P.el.ghost; if(!gEl||!gEl.classList.contains('active')||P.selected<0) return;
  const pc=P.pieces[P.selected]; if(!pc) return;
  const {bbH}=_vsPieceBox(P,pc);
  const [ax,ay]=_vsGhostAnchor(x,y,bbH,ptype);
  gEl.style.left=ax+'px';
  gEl.style.top=ay+'px';
}

function _vsClearPreview(P){
  if(!P._prev) return;
  P._prev.forEach(([r,c])=>{
    const d=P.el.cells[r][c];
    d.classList.remove('vs-prev','vs-filled');
    if(!P.board[r][c]){ d.style.background=''; d.style.removeProperty('--cc'); }
  });
  P._prev=null;
}
function _vsShowPreviewAt(P,R,C){
  _vsClearPreview(P);
  if(P.selected<0) return;
  const pc=P.pieces[P.selected];
  if(!pc||pc.used) return;
  if(!_vsCanPlace(P,pc.shape,R,C)) return;
  P._prev=pc.shape.map(([dr,dc])=>[R+dr,C+dc]);
  P._prev.forEach(([r,c])=>{
    const d=P.el.cells[r][c];
    d.classList.add('vs-prev','vs-filled');
    d.style.setProperty('--cc',pc.color);
    d.style.background='';
  });
}
function _vsUpdatePreview(P,x,y,ptype){
  const o=_vsOriginFromPointer(P,x,y,ptype);
  if(!o){ _vsClearPreview(P); return; }
  _vsShowPreviewAt(P,o.R,o.C);
}

function _vsBeginDrag(P,ev){
  if(!versusMode||P.done||P.selected<0) return;
  if(P.el.cards.classList.contains('show')) return;
  const id=ev.pointerId!==undefined?ev.pointerId:-1;
  _vsDrags.set(id,{
    P,
    sx:ev.clientX, sy:ev.clientY,
    moved:false,
    pointerType:ev.pointerType||'mouse',
  });
  _vsBuildGhost(P);
  _vsMoveGhost(P,ev.clientX,ev.clientY,ev.pointerType);
  _vsUpdatePreview(P,ev.clientX,ev.clientY,ev.pointerType);
  // Làm mờ khối trên khay khi đang kéo
  P.el.tray.querySelectorAll('.vs-piece').forEach((el,i)=>{
    el.classList.toggle('dragging-src', i===P.selected);
  });
}

document.addEventListener('pointermove',ev=>{
  if(!versusMode) return;
  const id=ev.pointerId!==undefined?ev.pointerId:-1;
  const dr=_vsDrags.get(id);
  if(!dr) return;
  if(!dr.moved && Math.hypot(ev.clientX-dr.sx, ev.clientY-dr.sy)>6) dr.moved=true;
  _vsMoveGhost(dr.P, ev.clientX, ev.clientY, dr.pointerType);
  _vsUpdatePreview(dr.P, ev.clientX, ev.clientY, dr.pointerType);
});

function _vsDragEnd(ev){
  const id=ev.pointerId!==undefined?ev.pointerId:-1;
  const dr=_vsDrags.get(id);
  if(!dr) return;
  _vsDrags.delete(id);
  if(!versusMode) return;
  const P=dr.P;
  _vsClearPreview(P);
  _vsHideGhost(P);
  P.el.tray.querySelectorAll('.vs-piece').forEach(el=>el.classList.remove('dragging-src'));

  // Tap trên khay (không kéo) → đã xoay/chọn ở pointerdown, giữ khối đang chọn
  if(!dr.moved && ev.target && ev.target.closest && ev.target.closest('.vs-piece')) return;

  // Kéo thật → thả đặt nếu hợp lệ (giống map thường)
  if(dr.moved){
    const o=_vsOriginFromPointer(P, ev.clientX, ev.clientY, dr.pointerType);
    if(o && P.selected>=0){
      const pc=P.pieces[P.selected];
      if(pc && !pc.used && _vsCanPlace(P,pc.shape,o.R,o.C)){
        _vsPlaceAt(P,o.R,o.C);
        return;
      }
    }
    try{ sfxInvalid(); }catch(e){}
    return;
  }

  // Tap trên lưới (không kéo) → đặt theo vị trí ô dưới ngón (không dùng lift cảm ứng)
  if(ev.target && ev.target.closest && ev.target.closest('.vs-cell')){
    const o=_vsOriginFromPointer(P, ev.clientX, ev.clientY, 'mouse');
    if(o) _vsPlaceAt(P,o.R,o.C);
  }
}
document.addEventListener('pointerup',_vsDragEnd);
document.addEventListener('pointercancel',ev=>{
  const id=ev.pointerId!==undefined?ev.pointerId:-1;
  const dr=_vsDrags.get(id);
  if(!dr) return;
  _vsDrags.delete(id);
  _vsClearPreview(dr.P);
  _vsHideGhost(dr.P);
  dr.P.el.tray.querySelectorAll('.vs-piece').forEach(el=>el.classList.remove('dragging-src'));
});
function _vsCanPlace(P,shape,R,C){
  return shape.every(([dr,dc])=>{
    const r=R+dr,c=C+dc;
    if(r<0||r>=VS_N||c<0||c>=VS_N) return false;
    if(P.board[r][c]) return false;
    if(P.rocks.has(r+','+c)) return false;
    return true;
  });
}
function _vsPlaceAt(P,R,C){
  if(!versusMode||P.done||P.selected<0) return;
  if(P.el.cards.classList.contains('show')) return;
  const pc=P.pieces[P.selected];
  if(!pc||pc.used) return;
  if(!_vsCanPlace(P,pc.shape,R,C)){ try{ sfxInvalid(); }catch(e){} return; }
  pc.shape.forEach(([dr,dc])=>{ P.board[R+dr][C+dc]=pc.color; });
  pc.used=true; P.selected=-1;
  P.score+=pc.shape.length;
  try{ sfxPlacePiece(); }catch(e){}
  const cleared=_vsResolveClears(P);
  if(cleared>0){
    P.combo++;
    P.clears++;
    const mult=comboScoreMultiplier(P.combo);
    P.score+=cleared*mult;
    try{ sfxMatch(cleared); }catch(e){}
    if(P.clears>=P.nextCardAt){
      P.nextCardAt+=VS_CARD_EVERY;
      _vsOfferCards(P);
    }
  } else P.combo=0;
  if(P.pieces.every(x=>x.used)) _vsRefill(P);
  _vsRenderAll(P);
  if(!_vsAnyMove(P)){ P.done=true; P.el.note.textContent=t('vsNoSpace'); P.el.note.classList.add('show');
    if(_vs.players.every(q=>q.done)) _vsEndMatch();
  }
}
function _vsAnyMove(P){
  for(const pc of P.pieces){ if(pc.used) continue;
    let sh=pc.shape;
    for(let k=0;k<4;k++){
      for(let r=0;r<VS_N;r++)for(let c=0;c<VS_N;c++) if(_vsCanPlace(P,sh,r,c)) return true;
      sh=_rotShape(sh);
    }
  }
  return false;
}
// Nổ hàng/cột đầy + cụm cùng màu >=VS_GROUP_MIN. Ô băng không tính vào cụm,
// chỉ vỡ khi nằm trong hàng/cột nổ. Đá chặn hàng/cột (hàng có đá không đầy được... đá chiếm ô nên hàng chứa đá KHÔNG thể đầy màu → dọn đá bằng cụm màu kề (3 lần)? đơn giản: đá tự biến mất sau 12 giây).
function _vsResolveClears(P){
  const kill=new Set();
  for(let r=0;r<VS_N;r++){ let full=true;
    for(let c=0;c<VS_N;c++) if(!P.board[r][c]){ full=false; break; }
    if(full) for(let c=0;c<VS_N;c++) kill.add(r+','+c);
  }
  for(let c=0;c<VS_N;c++){ let full=true;
    for(let r=0;r<VS_N;r++) if(!P.board[r][c]){ full=false; break; }
    if(full) for(let r=0;r<VS_N;r++) kill.add(r+','+c);
  }
  // cụm màu (bỏ qua ô băng)
  const seen=new Set();
  for(let r=0;r<VS_N;r++)for(let c=0;c<VS_N;c++){
    const k=r+','+c;
    if(seen.has(k)||!P.board[r][c]||P.ice.has(k)) continue;
    const color=P.board[r][c], group=[], st=[[r,c]];
    while(st.length){
      const [rr,cc]=st.pop(), kk=rr+','+cc;
      if(seen.has(kk)) continue;
      if(rr<0||rr>=VS_N||cc<0||cc>=VS_N) continue;
      if(P.board[rr]&&P.board[rr][cc]===color&&!P.ice.has(kk)){
        seen.add(kk); group.push(kk);
        st.push([rr+1,cc],[rr-1,cc],[rr,cc+1],[rr,cc-1]);
      }
    }
    if(group.length>=VS_GROUP_MIN) group.forEach(kk=>kill.add(kk));
  }
  kill.forEach(k=>{
    const [r,c]=k.split(',').map(Number);
    P.board[r][c]=null; P.ice.delete(k); P.rocks.delete(k);
  });
  return kill.size;
}

// ── Thẻ chướng ngại — ÚP trước (đối thủ ngồi đối diện không được đọc được).
function _vsOfferCards(P){
  const picks=[]; const pool=VS_OBSTACLES.slice();
  while(picks.length<3&&pool.length) picks.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  P.el.cards.innerHTML='<div class="vs-cards-title">'+t('vsPickCard')+'</div>'+
    '<div class="vs-cards-row"></div>';
  const row=P.el.cards.querySelector('.vs-cards-row');
  let openIdx=-1;
  picks.forEach((ob,i)=>{
    const b=document.createElement('button');
    b.className='vs-card face-down';
    b.innerHTML='<div class="vs-card-inner">'+
      '<div class="vs-card-back">❓</div>'+
      '<div class="vs-card-front"><div class="vs-card-emoji">'+ob.emoji+'</div><div class="vs-card-name">'+MECH_NAME(ob.nameIdx).replace(/^\S+\s/,'')+'</div></div>'+
      '</div>';
    b.addEventListener('pointerdown',ev=>{
      ev.preventDefault();
      if(openIdx===i){
        // lá đã lật, chạm lần nữa → dùng luôn
        P.el.cards.classList.remove('show');
        const foe=_vs.players[1-P.idx];
        _vsApplyObstacle(foe,ob);
        try{ sfxThorn(); }catch(e){ try{ sfxPenalty(); }catch(e2){} }
        return;
      }
      // úp lá đang mở (nếu có), lật lá vừa chạm
      row.querySelectorAll('.vs-card').forEach(el=>el.classList.add('face-down'));
      b.classList.remove('face-down');
      openIdx=i;
      try{ sfxClick(); }catch(e){}
    });
    row.appendChild(b);
  });
  P.el.cards.classList.add('show');
}

function _vsApplyObstacle(F,ob){
  const emptyCells=[], filledCells=[];
  for(let r=0;r<VS_N;r++)for(let c=0;c<VS_N;c++){
    const k=r+','+c;
    if(F.rocks.has(k)) continue;
    if(F.board[r][c]) filledCells.push(k); else emptyCells.push(k);
  }
  const take=(arr,n)=>{ const out=[]; while(out.length<n&&arr.length) out.push(arr.splice(Math.floor(Math.random()*arr.length),1)[0]); return out; };
  
  if(ob.id==='mountain'){
    // FIX BUG: Xóa đúng các viên đá của thẻ này thay vì xóa sạch cả bàn
    const newRocks = take(emptyCells,3);
    newRocks.forEach(k=>F.rocks.add(k));
    setTimeout(()=>{ 
      if(_vs&&versusMode){ 
        newRocks.forEach(k => F.rocks.delete(k)); 
        _vsRenderGrid(F); 
      } 
    },12000); 
  } else if(ob.id==='tornado'){
    const colors=filledCells.map(k=>{ const [r,c]=k.split(',').map(Number); return F.board[r][c]; });
    filledCells.forEach(k=>{ const [r,c]=k.split(',').map(Number); F.board[r][c]=null; F.ice.delete(k); });
    const spots=emptyCells.concat(filledCells);
    colors.forEach(col=>{ if(!spots.length) return; const k=spots.splice(Math.floor(Math.random()*spots.length),1)[0]; const [r,c]=k.split(',').map(Number); F.board[r][c]=col; });
  } else if(ob.id==='ice'){
    take(filledCells,4).forEach(k=>F.ice.add(k));
  } else if(ob.id==='fog'){
    F.fogUntil=Date.now()+10000;
    setTimeout(()=>{ if(_vs&&versusMode) _vsRenderGrid(F); },10100);
  } else if(ob.id==='squirrel'){
    take(filledCells,3).forEach(k=>{ const [r,c]=k.split(',').map(Number); F.board[r][c]=null; F.ice.delete(k); });
  } else if(ob.id==='bomb'){
    const cr=1+Math.floor(Math.random()*(VS_N-2)), cc=1+Math.floor(Math.random()*(VS_N-2));
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){ const k=(cr+dr)+','+(cc+dc); F.board[cr+dr][cc+dc]=null; F.ice.delete(k); F.rocks.delete(k); }
  }
  // báo cho nạn nhân
  F.el.note.textContent=t('vsHit', ob.emoji+' '+MECH_NAME(ob.nameIdx).replace(/^\S+\s/,''));
  F.el.note.classList.add('show');
  setTimeout(()=>{ if(F.el.note) F.el.note.classList.remove('show'); },2200);
  F.el.half.classList.add('vs-shake');
  setTimeout(()=>F.el.half.classList.remove('vs-shake'),500);
  _vsRenderGrid(F);
  // nạn nhân hết chỗ vì chướng ngại?
  if(!F.done&&!_vsAnyMove(F)){ F.done=true; F.el.note.textContent=t('vsNoSpace'); F.el.note.classList.add('show');
    if(_vs.players.every(q=>q.done)) _vsEndMatch(); }
}

// ── Đồng hồ & kết thúc ──
function _vsTick(){
  if(!versusMode||!_vs) return;
  const tm=document.getElementById('vs-mid-timer');
  if(tm){ tm.textContent=_vs.timeLeft; tm.classList.toggle('danger',_vs.timeLeft<=10); }
  // render lại lưới nếu sương mù vừa tan
  if(_vs.timeLeft<=0){ _vsEndMatch(); return; }
  _vs.timeLeft--;
}

function _vsEndMatch(){
  if(!_vs) return;
  if(_vs.timer){ clearInterval(_vs.timer); _vs.timer=null; }
  versusMode=false;
  const a=document.getElementById('versus-arena'); if(a) a.remove();
  _vsToggleGlobalUI(false);
  try{ startBgm('main'); }catch(e){}
  const [P0,P1]=_vs.players, [n1,n2]=_vs.names;
  const s1=P0.score, s2=P1.score;
  let msg;
  if(s1===s2) msg=t('vsDraw');
  else { msg=t('vsWin', s1>s2?n1:n2); try{ addPlayerXP(VERSUS_WIN_XP); }catch(e){} }
  document.getElementById('vs-result-title').textContent=msg;
  document.getElementById('vs-result-body').innerHTML=
    '<div class="lb-row'+(s1>=s2?' me':'')+'"><span class="lb-rank">'+(s1>=s2?'🥇':'🥈')+'</span><span class="lb-name">'+escapeHtml(n1)+'</span><span class="lb-score">'+s1.toLocaleString()+'</span></div>'+
    '<div class="lb-row'+(s2>s1?' me':'')+'"><span class="lb-rank">'+(s2>s1?'🥇':'🥈')+'</span><span class="lb-name">'+escapeHtml(n2)+'</span><span class="lb-score">'+s2.toLocaleString()+'</span></div>'+
    '<div style="font-size:11px;color:#9aa7bd;margin-top:8px;">'+t('vsXpNote', VERSUS_WIN_XP)+'</div>';
  try{ submitScoreToLeaderboard(Math.max(s1,s2)); }catch(e){}
  if(typeof showInterstitialAd==='function') showInterstitialAd();
  _vsShow('versus-result-panel');
}

function _vsCloseResult(rematch){
  _vsHide('versus-result-panel');
  if(rematch){
    const names=_vs.names;
    document.getElementById('vs-name1').value=names[0];
    document.getElementById('vs-name2').value=names[1];
    _vs=null;
    startVersusMatch();
    return;
  }
  _vs=null;
}

// ── wiring ──
(function initVersus(){
  const btn=document.getElementById('versus-btn');
  if(btn) btn.addEventListener('click', openVersusSetup);
  const start=document.getElementById('vs-start-btn');
  if(start) start.addEventListener('click', startVersusMatch);
  const cancel=document.getElementById('vs-cancel-btn');
  if(cancel) cancel.addEventListener('click', ()=>_vsHide('versus-setup-panel'));
  const again=document.getElementById('vs-again-btn');
  if(again) again.addEventListener('click', ()=>_vsCloseResult(true));
  const close=document.getElementById('vs-close-btn');
  if(close) close.addEventListener('click', ()=>_vsCloseResult(false));
  refreshVersusButton();
})();
