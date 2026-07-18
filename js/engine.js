// ═══════════════════════════════════════════════════════════════
// js/engine.js — ENGINE BÀN CỜ MAP THƯỜNG (MODE A)
// Board/piece/kéo-thả-ghost/đặt khối/nổ hàng-cột-cụm/game-over/render.
// Tách verbatim khỏi main.js. Nạp TRƯỚC main.js (chia sẻ global scope; tham chiếu
// state board/pieces/score & hàm tiến trình/cơ chế của main.js + roundMechanics lúc CHẠY).
// ═══════════════════════════════════════════════════════════════

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function rnd(n){ return Math.floor(Math.random()*n); }
function rndColor(){ return COLORS[rnd(COLORS.length)]; }
function rndCI(){ return rnd(COLORS.length); }
// Cache trực tiếp tham chiếu DOM theo [r][c] thay vì querySelector mỗi lần gọi
// (querySelector(`[data-r][data-c]`) phải quét lại toàn bộ DOM — rất tốn khi gọi liên tục lúc kéo-thả)
function getCell(r,c){ return gridCells && gridCells[r] ? gridCells[r][c] : null; }
function getSC(r,c){ return secretCells && secretCells[r] ? secretCells[r][c] : null; }

/* ══════════════════════════════════════════
   MODE A — MAIN GAME
══════════════════════════════════════════ */
function initBoard(){
  board=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  placeCounter=0; cellPlacedAt={}; pendingClearKeys.clear();
  powerCells.clear(); powerClearWaves=0; // 🔥🫧💨 ván mới — logo cũ không mang theo
  powerBusy=false;
  if(typeof cancelSkillAim==='function') cancelSkillAim();
  resetMechanicState();
  // ván mới vẫn giữ tier đã đạt — kích hoạt lại ĐÚNG 1 cơ chế của vòng đó
  if(typeof mainHardTier!=='undefined' && mainHardTier>0) setTimeout(()=>applyRoundMechanics(), 50);
}
// Nguồn ngẫu nhiên cho SINH KHỐI — chế độ Đấu 1-1 (versus.js) cắm PRNG có hạt giống
// vào đây để 2 người chơi nhận CÙNG một chuỗi khối (công bằng tuyệt đối).
let _pieceRand = null; // null = Math.random như bình thường
function setPieceRand(f){ _pieceRand = f || null; }
function makePiece(){
  const R = _pieceRand || Math.random;
  // Càng qua nhiều vòng map ẩn, khối càng thiên về hình to/khó xếp
  // (mặc định ~55% khối lớn giống tỉ lệ cũ, mỗi vòng +3%, tối đa 90%)
  const hardP=Math.min(0.9, 0.55+mainHardTier*0.03);
  const wantHard=R()<hardP;
  const pool=SHAPES.filter(s=> wantHard ? s.length>=4 : s.length<=3);
  const shape=pool.length?pool[Math.floor(R()*pool.length)]:SHAPES[Math.floor(R()*SHAPES.length)];
  return {shape, color:COLORS[Math.floor(R()*COLORS.length)], used:false};
}
function refillPieces(){ pieces=[makePiece(),makePiece(),makePiece()]; selected=null; spiderWebbedIdx=-1; spiderWebbedLeft=0; }

// Xoay shape 90° theo chiều kim đồng hồ: (r,c) → (c, maxR-r)
function rotatePiece(idx){
  if(idx===null||idx===undefined) return;
  const piece=pieces[idx];
  if(!piece||piece.used) return;
  sfxRotate();
  const maxR=Math.max(...piece.shape.map(([r])=>r));
  piece.shape=piece.shape.map(([r,c])=>[c, maxR-r]);
  // normalise: shift so min row/col = 0
  const minR=Math.min(...piece.shape.map(([r])=>r));
  const minC=Math.min(...piece.shape.map(([,c])=>c));
  piece.shape=piece.shape.map(([r,c])=>[r-minR, c-minC]);
  renderPieces();
  if(selected===idx){ showGhost(piece); updatePreview(lastMouseX||0, lastMouseY||0); }
  showHint(t('hintRotated'));
}

// Ô bị chặn không đặt khối lên được (do các cơ chế độ khó chiếm giữ)
function cellBlockedForPlacement(r,c){
  const k=r+','+c;
  if(mountainCells.has(k)||wallCells.has(k)) return true;
  if(slimeCells.has(k)) return true;
  if(bittenCells.has(k)) return true; // ô đã bị sóc gặm — hỏng, không đặt được
  if(bombCell&&bombCell.r===r&&bombCell.c===c) return true;
  if(dragonEgg&&dragonEgg.r===r&&dragonEgg.c===c) return true;
  if(blackHole&&blackHole.r===r&&blackHole.c===c) return true;
  if(portalA&&portalA.r===r&&portalA.c===c) return true;
  if(portalB&&portalB.r===r&&portalB.c===c) return true;
  if(snakeSpirit&&snakeSpirit.cells.some(([sr,sc])=>sr===r&&sc===c)) return true;
  if(dragonKing&&dragonKing.r===r&&dragonKing.c===c) return true;
  return false;
}
function canPlace(piece,r,c){
  return piece.shape.every(([dr,dc])=>{
    const nr=r+dr,nc=c+dc;
    return nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!board[nr][nc]&&!cellBlockedForPlacement(nr,nc);
  });
}

let gridCells = null; // ROWS x COLS cache — dựng 1 lần, tái sử dụng ở mọi lần render
function renderGrid(){
  const grid=document.getElementById('grid');
  if(!gridCells){
    // Dựng DOM 1 lần duy nhất. Dùng event delegation (1 listener trên #grid)
    // thay vì gắn listener riêng cho từng ô mỗi lần render → tránh rò rỉ listener + giảm việc tạo node.
    grid.style.gridTemplateColumns=`repeat(${COLS},44px)`;
    grid.innerHTML='';
    gridCells=Array.from({length:ROWS},()=>Array(COLS).fill(null));
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const cell=document.createElement('div');
      cell.dataset.r=r; cell.dataset.c=c;
      grid.appendChild(cell);
      gridCells[r][c]=cell;
    }
    grid.addEventListener('click', e=>{
      const cell=e.target.closest('.cell');
      if(cell) onCellClick({clientX:e.clientX, clientY:e.clientY, currentTarget:cell});
    });
  }
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const cell=gridCells[r][c];
    const thornKey=`${r},${c}`;
    const inFog=fogCenter && Math.abs(fogCenter.r-r)<=1 && Math.abs(fogCenter.c-c)<=1;
    const inLightning=lightning && r>=lightning.r && r<=lightning.r+1 && c>=lightning.c && c<=lightning.c+1;
    const snakeIdx=snakeSpirit? snakeSpirit.cells.findIndex(([sr,sc])=>sr===r&&sc===c) : -1;
    const cls='cell'+(board[r][c]?' filled':'')+(thornCells.has(thornKey)?' thorn-cell':'')
      +(mountainCells.has(thornKey)?' mountain-cell':'')
      +(wallCells.has(thornKey)?' wall-cell':'')
      +(squirrel&&squirrel.r===r&&squirrel.c===c?' squirrel-cell':'')
      +(bittenCells.has(thornKey)?' bitten-cell':'')
      +(iceCells.has(thornKey)?(iceCells.get(thornKey)>=2?' ice-cell':' ice-cell ice-cracked'):'')
      +(inFog?' fog-cell':'')
      +(bombCell&&bombCell.r===r&&bombCell.c===c?' bomb-cell':'')
      +(dragonEgg&&dragonEgg.r===r&&dragonEgg.c===c?(dragonEgg.shell<EGG_SHELL?' egg-cell egg-cracked':' egg-cell'):'')
      +(spider&&spider.r===r&&spider.c===c?' spider-cell':'')
      +(tierActive(10)&&c===cloudCol&&r===0?' cloud-cell':'')
      +(blackHole&&blackHole.r===r&&blackHole.c===c?' blackhole-cell':'')
      +(ghostCell&&ghostCell.r===r&&ghostCell.c===c?' ghost-cell':'')
      +(snail&&snail.r===r&&snail.c===c?' snail-cell':'')
      +(slimeCells.has(thornKey)?' slime-cell':'')
      +(inLightning?' lightning-warn':'')
      +(snakeIdx===0?' snakehead-cell':snakeIdx>0?' snakebody-cell':'')
      +((portalA&&portalA.r===r&&portalA.c===c)||(portalB&&portalB.r===r&&portalB.c===c)?' portal-cell':'')
      +(dragonKing&&dragonKing.r===r&&dragonKing.c===c?' dragonking-cell':'')
      +(mirrorCells.has(thornKey)?' mirror-cell':'');
    if(cell.className!==cls) cell.className=cls;
    if(bombCell&&bombCell.r===r&&bombCell.c===c){
      if(cell.dataset.bomb!==String(bombTimer)) cell.dataset.bomb=bombTimer;
    } else if(cell.dataset.bomb) delete cell.dataset.bomb;
    // thanh HP của sóc ngay trên ô nó đứng
    if(squirrel&&squirrel.r===r&&squirrel.c===c){
      cell.style.setProperty('--sqhp', Math.round(squirrel.hp/MCFG('squirrel','hp')*100)+'%');
    }
    // 👻 ô bị ma nhập hiển thị MÀU GIẢ — logic game vẫn dùng màu thật trong board
    let bg=board[r][c]||'';
    if(ghostCell&&ghostCell.r===r&&ghostCell.c===c&&bg) bg=ghostCell.disguise;
    // Màu qua --cc để CSS vẽ kiểu kẹo bông (không ghi đè background shorthand)
    const prev=cell.style.getPropertyValue('--cc');
    if(bg){
      if(prev!==bg){ cell.style.setProperty('--cc',bg); cell.style.background=''; }
      const ci=COLORS.indexOf(bg);
      if(ci>=0) cell.dataset.ci=String(ci);
      else delete cell.dataset.ci;
    } else if(prev || cell.style.background || cell.dataset.ci){
      cell.style.removeProperty('--cc');
      cell.style.background='';
      delete cell.dataset.ci;
    }
    // 🔥🫧💨 logo vật phẩm trên ô gạch
    if(board[r][c] && powerCells.has(thornKey)){
      const pw=powerCells.get(thornKey);
      if(cell.dataset.power!==pw) cell.dataset.power=pw;
    } else {
      if(cell.dataset.power) delete cell.dataset.power;
      if(!board[r][c]) powerCells.delete(thornKey); // dọn logo mồ côi (ô bị sóc ăn, lốc cuốn...)
    }
  }
}

/* ──────────────────────────────────────────
   KÉO–THẢ  (ghost bám theo con trỏ/ngón tay + preview mờ)
────────────────────────────────────────── */
const ghostEl = document.getElementById('drag-ghost');
let slotEls = [];                 // các ô khối hiện tại dưới khay
let hoverMode = false;            // đã chọn bằng chạm → ghost bám theo chuột (desktop)
let lastMouseX=0, lastMouseY=0;   // vị trí con trỏ cuối — dùng khi xoay để update preview
const drag = { active:false, moved:false, sx:0, sy:0, wasSelected:false, pointerType:'mouse' };
let rotateLocked=false;           // true sau khi bấm ✓ — chạm nền lưới sẽ KHÔNG xoay nhầm nữa

// Hình học lưới theo toạ độ viewport. TRƯỚC ĐÂY: gọi getBoundingClientRect() 3 lần
// MỖI LẦN gridGeom() được gọi — và nó được gọi 2 lần mỗi sự kiện pointermove khi
// kéo khối (qua moveGhost + updatePreview) → 6 lần ép reflow đồng bộ trên mỗi
// pixel di chuyển của ngón tay, đây là nguyên nhân chính gây giật khi kéo-thả.
// Giờ CACHE lại, chỉ tính lại khi bố cục thực sự có thể đổi (resize/xoay màn/cuộn/
// #game-root co giãn lại qua fitGameRoot — xem invalidateGridGeom() gọi từ main.js).
let _gridGeomCache=null;
function invalidateGridGeom(){ _gridGeomCache=null; }
function gridGeom(){
  if(_gridGeomCache) return _gridGeomCache;
  const a=getCell(0,0).getBoundingClientRect();
  const b=getCell(0,1).getBoundingClientRect();
  const c=getCell(1,0).getBoundingClientRect();
  return _gridGeomCache={ x0:a.left, y0:a.top, cell:a.width,
           stepX:(b.left-a.left)||a.width, stepY:(c.top-a.top)||a.height };
}
window.addEventListener('resize', invalidateGridGeom);
window.addEventListener('orientationchange', invalidateGridGeom);
window.addEventListener('scroll', invalidateGridGeom, true);

// Vị trí ghost so với con trỏ. Cảm ứng: nâng khối lên trên ngón tay để không bị che.
function ghostAnchor(x,y,bbH,ptype){
  const t=ptype||drag.pointerType;
  if(t==='touch') return [x, y - 40 - bbH/2];
  return [x, y];
}

function pieceBox(piece){
  const maxR=Math.max(...piece.shape.map(p=>p[0]));
  const maxC=Math.max(...piece.shape.map(p=>p[1]));
  const g=gridGeom();
  return { maxR, maxC, g, bbW:maxC*g.stepX+g.cell, bbH:maxR*g.stepY+g.cell };
}

// Quy đổi vị trí con trỏ → ô gốc (góc trên-trái khung bao của khối).
function originFromPointer(x,y,piece,forceType){
  const {g,bbW,bbH,maxR,maxC}=pieceBox(piece);
  const [ax,ay]=ghostAnchor(x,y,bbH,forceType);
  const ox=ax-bbW/2, oy=ay-bbH/2;             // góc trên-trái khung bao của khối trong viewport
  let C=Math.round((ox-g.x0)/g.stepX);
  let R=Math.round((oy-g.y0)/g.stepY);
  if(R<-1-maxR||C<-1-maxC||R>ROWS+maxR||C>COLS+maxC) return null; // con trỏ ở xa lưới
  // Ghim khối vào trong biên lưới gần nhất — quan trọng sau khi XOAY, vì bao của khối
  // đổi chiều (ngang↔dọc) nên tâm con trỏ cũ có thể đẩy khối ra ngoài mép dù vẫn còn chỗ đặt.
  R=Math.max(0,Math.min(ROWS-1-maxR,R));
  C=Math.max(0,Math.min(COLS-1-maxC,C));
  return { R, C };
}

function buildGhost(piece){
  const maxC=Math.max(...piece.shape.map(p=>p[1]));
  const maxR=Math.max(...piece.shape.map(p=>p[0]));
  const g=gridGeom();
  // SỬA: Phải dùng g.cell (kích thước ô) thay vì g.stepX (ô + khoảng cách) cho track size
  ghostEl.style.gridTemplateColumns=`repeat(${maxC+1},${g.cell}px)`;
  ghostEl.style.gap=`${g.stepX - g.cell}px`;
  ghostEl.innerHTML='';
  const cells=Array((maxR+1)*(maxC+1)).fill(null);
  piece.shape.forEach(([r,c])=>cells[r*(maxC+1)+c]=piece.color);
  cells.forEach(color=>{
    const d=document.createElement('div');
    d.className='g-cell'+(color?' candy':'');
    d.style.width=g.cell+'px';
    d.style.height=g.cell+'px';
    if(color){
      d.style.setProperty('--cc',color);
      const ci=COLORS.indexOf(color);
      if(ci>=0) d.dataset.ci=String(ci);
    }
    else { d.style.visibility='hidden'; }
    ghostEl.appendChild(d);
  });
}

function showGhost(piece){
  buildGhost(piece);
  ghostEl.classList.add('active');
  document.body.classList.add('is-dragging');
}
function hideGhost(){
  ghostEl.classList.remove('active');
  ghostEl.innerHTML='';
  document.body.classList.remove('is-dragging');
}

function moveGhost(x,y){
  if(selected===null) return;
  const {bbH}=pieceBox(pieces[selected]);
  const [ax,ay]=ghostAnchor(x,y,bbH);
  ghostEl.style.left=ax+'px';
  ghostEl.style.top=ay+'px';
}

let previewedCells = []; // ô đang được tô preview — tránh phải quét lại toàn bộ DOM mỗi lần di chuột
function clearPreview(){
  for(const c of previewedCells){
    c.classList.remove('preview-ok');
    if(!c.classList.contains('filled')){
      c.style.removeProperty('--cc');
      c.style.background='';
      delete c.dataset.ci;
    }
  }
  previewedCells.length=0;
}

// Làm mờ các ô khối sẽ đáp xuống. Vị trí KHÔNG đặt được → giữ nguyên mọi ô, không đụng tới.
function updatePreview(x,y){
  clearPreview();
  if(selected===null) return;
  const piece=pieces[selected];
  if(!piece||piece.used) return;
  const o=originFromPointer(x,y,piece);
  if(!o || !canPlace(piece,o.R,o.C)) return;
  piece.shape.forEach(([dr,dc])=>{
    const cell=getCell(o.R+dr,o.C+dc);
    if(cell){
      cell.classList.add('preview-ok');
      cell.style.setProperty('--cc',piece.color);
      cell.style.background='';
      const ci=COLORS.indexOf(piece.color);
      if(ci>=0) cell.dataset.ci=String(ci);
      else delete cell.dataset.ci;
      previewedCells.push(cell);
    }
  });
}

function highlightSlot(idx){
  slotEls.forEach((el,i)=>{ if(el) el.classList.toggle('selected', idx!==null && i===idx); });
}

// Thả khối đang chọn xuống ô gốc (R,C). Trả về true nếu đặt thành công.
function placeAt(R,C){
  if(selected===null) return false;
  const piece=pieces[selected];
  if(!piece||piece.used||!canPlace(piece,R,C)) return false;
  placeCounter++;
  const _mirrorPlacedCells=piece.shape.map(([dr,dc])=>[R+dr,C+dc]); // 🪞 lưu lại để sinh khối đối xứng (V41)
  const _mirrorPlacedColor=piece.color;
  piece.shape.forEach(([dr,dc])=>{ board[R+dr][C+dc]=piece.color; cellPlacedAt[(R+dr)+','+(C+dc)]=placeCounter; });
  piece.used=true;
  sfxPlacePiece();
  // Đặt khối lên bàn cờ cũng được cộng điểm — bằng đúng số ô của khối vừa đặt
  score+=piece.shape.length; if(score>best) best=score; updateScoreUI();
  endDrag();                 // xoá chọn + ghost + preview
  stepRoundMechanics(_mirrorPlacedCells,_mirrorPlacedColor);
  renderGrid(); renderPieces();
  setTimeout(()=>processClears(), 90);
  return true;
}

// Reset toàn bộ trạng thái kéo/chọn.
function endDrag(){
  drag.active=false; hoverMode=false; selected=null; rotateLocked=false;
  hideGhost(); clearPreview(); highlightSlot(null);
  showRotateBar(false);
  document.body.classList.remove('is-dragging');
  document.querySelectorAll('.piece-slot.dragging-src').forEach(el=>el.classList.remove('dragging-src'));
}

/* ── bộ xử lý pointer ── */
function onSlotPointerDown(e, idx){
  if(secretMode) return;
  if(pendingSkill) cancelSkillAim();
  const piece=pieces[idx];
  if(piece.used) return;
  if(spiderWebbedIdx===idx && spiderWebbedLeft>0){
    showHint(t('hintWebbed', spiderWebbedLeft));
    try{ sfxPenalty(); }catch(err){}
    return;
  }
  e.preventDefault();
  e.stopPropagation(); // Ngăn sự kiện chạm lan ra nền để không bị bỏ chọn nhầm

  if (selected === idx) {
    // Nếu chạm vào chính khối đang chọn -> Xoay khối
    rotatePiece(idx);
    // Vẫn tiếp tục xử lý drag để người chơi có thể kéo sau khi xoay
  }

  const isTouch=(e.pointerType==='touch'||e.pointerType==='pen');
  drag.active=true; drag.moved=false;
  drag.sx=e.clientX; drag.sy=e.clientY;
  drag.pointerType=e.pointerType||'mouse';
  selected=idx;
  rotateLocked=false;
  sfxSelect();
  document.querySelectorAll('.piece-slot.dragging-src').forEach(el=>el.classList.remove('dragging-src'));
  if(slotEls[idx]) slotEls[idx].classList.add('dragging-src');

  // Touch: chọn ngay + ghost hiện ngay (không cần giữ/kéo)
  hoverMode=isTouch;
  highlightSlot(idx);
  showGhost(piece);
  moveGhost(e.clientX,e.clientY);
  updatePreview(e.clientX,e.clientY);
}

// TRƯỚC ĐÂY: xử lý NGAY mỗi sự kiện pointermove — trên máy có cảm ứng lấy mẫu
// >60Hz (Android hay coalesce nhiều sự kiện/khung hình) thì moveGhost+updatePreview
// (đọc/ghi style liên tục) chạy nhiều lần hơn cần thiết trong 1 khung hình → giật khi
// kéo khối. Giờ chỉ giữ lại toạ độ mới nhất và xử lý 1 lần/khung hình qua rAF.
let _pmScheduled=false, _pmX=0, _pmY=0;
function onDocPointerMove(e){
  if(selected===null) return;
  if(!drag.active && !hoverMode) return;
  if(drag.active && !drag.moved && Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy)>6) drag.moved=true;
  _pmX=e.clientX; _pmY=e.clientY;
  if(_pmScheduled) return;
  _pmScheduled=true;
  requestAnimationFrame(()=>{
    _pmScheduled=false;
    if(selected===null) return;
    lastMouseX=_pmX; lastMouseY=_pmY;
    moveGhost(_pmX,_pmY);
    updatePreview(_pmX,_pmY);
  });
}

function onDocPointerUp(e){
  if(!drag.active) return;
  drag.active=false;
  if(selected===null) return;
  const piece=pieces[selected];

  // Nếu là tap (không di chuyển) vào slot thì không làm gì (vì đã xoay ở PointerDown)
  if(!drag.moved && e.target.closest('.piece-slot')) return;
  // Tap (không kéo) vào lưới → để sự kiện 'click' của #grid xử lý (onCellClick đặt
  // ĐÚNG tại ô vừa chạm, không dùng anchor nâng khối của cảm ứng).
  if(!drag.moved && e.target.closest('#grid')) return;

  // Kéo thật -> thả nếu đáp vào chỗ hợp lệ (vị trí trùng khớp với ô mờ đang hiện)
  const o=originFromPointer(e.clientX,e.clientY,piece);
  if(o && canPlace(piece,o.R,o.C)) placeAt(o.R,o.C);
  else if (drag.moved) { sfxInvalid(); endDrag(); }
  // Nếu tap vào lưới mà không đặt được thì vẫn giữ piece đang chọn (không gọi endDrag)
}

function onDocPointerCancel(){ if(drag.active||hoverMode) endDrag(); }

// Rotate button (vẫn giữ cho mouse/desktop)
document.getElementById('rotate-btn').addEventListener('click', ()=>{ rotatePiece(selected); });
document.getElementById('mirror-break-btn').addEventListener('click', useMirrorBreak);

// Nút ✓ — khoá xoay lại: giữ khối đang chọn + ghost, chỉ ẩn thanh xoay và tắt
// việc "chạm nền lưới → xoay" để kéo-thả vào bàn không bị xoay nhầm nữa.
document.getElementById('rotate-confirm-btn').addEventListener('click', (e)=>{
  e.stopPropagation();
  if(selected===null) return;
  rotateLocked=true;
  showRotateBar(false);
  showHint(t('hintRotateLocked'));
});

// Chạm/nhấn xuống LƯỚI khi đã chọn khối → bắt đầu "kéo tinh chỉnh": ô mờ bám theo
// con trỏ và THẢ RA LÀ ĐẶT. Trước đây pointerup bị bỏ qua (drag.active=false vì kéo
// không bắt đầu từ khay) nên căn ô mờ xong thả ra không đặt được — mất hẳn cơ chế
// nhắm bằng ô mờ như bản cũ.
document.getElementById('grid').addEventListener('pointerdown', e=>{
  if(selected===null || secretMode) return;
  const piece=pieces[selected];
  if(!piece || piece.used) return;
  drag.active=true; drag.moved=false;
  drag.sx=e.clientX; drag.sy=e.clientY;
  drag.pointerType=e.pointerType||'mouse';
  moveGhost(e.clientX,e.clientY);
  updatePreview(e.clientX,e.clientY);
});

function showRotateBar(show){
  // Thanh xoay đã bị tắt
}
document.addEventListener('pointerdown', e => {
  if (secretMode) return;
  // Đang nhắm skill: chạm ngoài bàn / ngoài skill-bar → hủy
  if (pendingSkill) {
    if (!e.target.closest('#grid-wrap') && !e.target.closest('#skill-bar')) {
      cancelSkillAim();
      try{ showHint('Đã hủy'); }catch(err){}
    }
    return;
  }
  if (selected === null) return;
  // Nếu chạm vào nền (không phải slot, không phải VÙNG lưới, không phải UI buttons) -> Bỏ chọn.
  // Dùng #grid-wrap thay vì .cell: chạm vào khe/viền giữa các ô (đệm 10px + khe 3px của
  // lưới) trước đây cũng bị tính là "nền" và huỷ chọn ngay — không căn ô mờ để đặt được.
  if (!e.target.closest('.piece-slot') && !e.target.closest('#grid-wrap') && !e.target.closest('#game-controls')) {
    endDrag();
  }
});

document.addEventListener('pointermove', onDocPointerMove, {passive:false});
document.addEventListener('pointerup', onDocPointerUp);
document.addEventListener('pointercancel', onDocPointerCancel);

// Chạm vào ô lưới: skill đang nhắm → kích hoạt ngay; hoặc đặt khối đã chọn
function onCellClick(e){
  const R=+e.currentTarget.dataset.r;
  const C=+e.currentTarget.dataset.c;
  if(pendingSkill){
    castPlayerSkill(R, C);
    return;
  }
  if(selected===null) return;
  const piece=pieces[selected];
  if(piece.used) return;
  const o=originFromPointer(e.clientX,e.clientY,piece,'mouse');
  const placeR=o?o.R:R;
  const placeC=o?o.C:C;
  if(!canPlace(piece,placeR,placeC)){ sfxInvalid(); showHint(t('hintCantPlace')); return; }
  placeAt(placeR,placeC);
}

// Ô đã được tính nổ và đang chờ animation gỡ khỏi board (board vẫn giữ màu suốt
// 360-500ms để hiệu ứng pop chạy xong). Nếu người chơi đặt khối tiếp NGAY trong lúc
// đó, lần tính nổ mới phải coi các ô này là TRỐNG — nếu không, hàng/cột/cụm "đầy ảo"
// nhờ các ô sắp biến mất sẽ nổ oan, làm mất cả những ô của hàng CHƯA đủ gạch.
const pendingClearKeys=new Set();

/* ══════════════════════════════════════════
   🔥🫧💨 Ô VẬT PHẨM (power cells) — map thường
   - Mỗi 15 lần phá tự sinh 1 logo lên ô gạch ngẫu nhiên (tối đa 1 logo/ô)
   - Phá ô chứa logo → kích hoạt:
     🔥 lửa: cháy 3×3 quanh ô (gồm cả chướng ngại) — tính như 1 lần phá
     🫧 bong bóng: nổ toàn bộ ô cùng màu
     💨 gió: thổi bay hàng ngang/dọc chứa ô (ưu tiên hàng nhiều ô hơn)
   - Nút 🔥/🫧/💨 dưới khay (skill người chơi): bấm → chạm ô → kích hoạt NGAY
══════════════════════════════════════════ */
const POWER_SPAWN_EVERY = 15;      // số lần phá để tự sinh 1 logo
const POWER_KINDS = ['fire','bubble','wind'];
const powerCells = new Map();      // 'r,c' → 'fire' | 'bubble' | 'wind'
let powerClearWaves = 0;           // đếm số lần phá (chỉ map thường)
var pendingSkill = null;           // 'fire'|'bubble'|'wind' | null — skill đang nhắm
let powerBusy = false;             // đang chạy hàng đợi skill / logo

/** Bắt đầu nhắm skill: chạm ô trên bàn để kích hoạt ngay */
function beginSkillAim(type){
  if(secretMode || powerBusy) return;
  if(!POWER_KINDS.includes(type)) return;
  pendingSkill = type;
  if(selected!==null) endDrag();
  const wrap=document.getElementById('grid-wrap');
  if(wrap){
    wrap.classList.add('skill-aiming');
    wrap.dataset.skillAim=type;
  }
  if(typeof renderInventoryHud==='function') renderInventoryHud();
  const msg = type==='fire' ? '🔥 Chạm 1 ô để đốt 3×3'
            : type==='bubble' ? '🫧 Chạm ô màu để nổ cùng màu'
            : '💨 Chạm 1 ô để thổi hàng/cột';
  try{ showHint(msg, { sticky:true, aim:true }); }catch(e){}
}

function cancelSkillAim(){
  if(!pendingSkill) return;
  pendingSkill = null;
  const wrap=document.getElementById('grid-wrap');
  if(wrap){
    wrap.classList.remove('skill-aiming');
    delete wrap.dataset.skillAim;
  }
  if(typeof renderInventoryHud==='function') renderInventoryHud();
  try{ if(typeof clearHintFlash==='function') clearHintFlash(); }catch(e){}
}

/** Skill người chơi: tiêu 1 vật phẩm và kích hoạt ngay tại ô (r,c) */
function castPlayerSkill(r, c){
  if(!pendingSkill || secretMode || powerBusy) return;
  const type = pendingSkill;
  if(r<0||r>=ROWS||c<0||c>=COLS) return;
  if(type==='bubble'){
    if(board[r][c]==null){
      try{ showHint('🫧 Chạm ô có màu'); }catch(e){}
      return;
    }
  }
  if(typeof spendPower!=='function' || !spendPower(type, 1)){
    cancelSkillAim();
    return;
  }
  cancelSkillAim();
  powerBusy = true;
  const queue = [{ type, r, c, color: board[r][c] }];
  try{ sfxPowerUp(); }catch(e){}
  runPowerQueue(queue);
}

function powerEligibleKeys(){
  const out=[];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const k=`${r},${c}`;
    if(board[r][c]==null) continue;
    if(powerCells.has(k) || pendingClearKeys.has(k)) continue;
    // tránh đè logo lên ô đặc biệt đang có hiệu ứng riêng
    if(thornCells.has(k) || iceCells.has(k) || slimeCells.has(k) || bittenCells.has(k)) continue;
    out.push(k);
  }
  return out;
}

/** Sinh logo `type` (không truyền → random) lên 1 ô gạch ngẫu nhiên. Trả key hoặc null. */
function spawnPowerCell(type){
  const keys=powerEligibleKeys();
  if(!keys.length) return null;
  const k=keys[rnd(keys.length)];
  powerCells.set(k, POWER_KINDS.includes(type) ? type : POWER_KINDS[rnd(POWER_KINDS.length)]);
  renderGrid();
  return k;
}

/** Danh sách ô bị hiệu ứng quét trúng */
function powerTargets(p){
  const keys=new Set();
  if(p.type==='fire'){
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      const r=p.r+dr, c=p.c+dc;
      if(r>=0&&r<ROWS&&c>=0&&c<COLS) keys.add(`${r},${c}`);
    }
  } else if(p.type==='bubble'){
    if(p.color) for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
      if(board[r][c]===p.color) keys.add(`${r},${c}`);
  } else { // wind — hàng ngang vs cột dọc: chọn bên nhiều ô hơn
    let rowN=0, colN=0;
    for(let c=0;c<COLS;c++) if(board[p.r][c]!=null) rowN++;
    for(let r=0;r<ROWS;r++) if(board[r][p.c]!=null) colN++;
    if(rowN>=colN){ for(let c=0;c<COLS;c++) keys.add(`${p.r},${c}`); }
    else { for(let r=0;r<ROWS;r++) keys.add(`${r},${p.c}`); }
  }
  return keys;
}

/** Kích hoạt 1 vật phẩm — tính như 1 lần phá (1 combo).
 *  Chướng ngại bảo vệ ô màu giống nổ thường:
 *  🌿 dây leo/gai → chỉ gỡ gai, giữ gạch
 *  🧊 băng → lần 1 nứt, lần 2 mới vỡ kèm gạch
 *  🔥 lửa vẫn đốt núi/tường (chướng ngại nặng không phải lớp giáp trên gạch)
 */
function activatePower(p, queue){
  const keys=powerTargets(p);
  let cleared=0;
  const clearedCells=[];
  keys.forEach(k=>{
    const [r,c]=k.split(',').map(Number);
    // dây chuyền: quét trúng logo khác → kích hoạt tiếp sau
    if(powerCells.has(k) && !(r===p.r && c===p.c)){
      queue.push({ type:powerCells.get(k), r, c, color:board[r][c] });
    }
    powerCells.delete(k);

    // 🌿 dây leo: 1 lần phá chỉ gỡ gai — chưa đụng gạch bên dưới
    if(thornCells.has(k)){
      thornCells.delete(k);
      cleared++; clearedCells.push([r,c]);
      return;
    }
    // 🧊 băng: lần đầu chỉ nứt; lần sau mới vỡ và xóa ô màu
    if(iceCells.has(k)){
      const stage=iceCells.get(k);
      if(stage>=2){
        iceCells.set(k,1);
        cleared++; clearedCells.push([r,c]);
        try{ sfxClick(); }catch(e){}
        return;
      }
      iceCells.delete(k);
      // stage 1 → rơi xuống xóa gạch bên dưới
    }

    let obstacleRemoved=false;
    if(p.type==='fire'){ // lửa đốt chướng ngại nặng (núi / tường) trong vùng 3×3
      if(mountainCells.has(k)){ mountainCells.delete(k); obstacleRemoved=true; }
      if(wallCells.has(k)){ wallCells.delete(k); obstacleRemoved=true; }
    }
    if(slimeCells.has(k)){ slimeCells.delete(k); obstacleRemoved=true; }
    if(bittenCells.has(k)){ bittenCells.delete(k); }
    mirrorCells.delete(k);
    if(board[r][c]!=null){
      board[r][c]=null;
      delete cellPlacedAt[k];
      pendingClearKeys.delete(k);
      cleared++; clearedCells.push([r,c]);
      const cell=getCell(r,c);
      if(cell){ cell.classList.remove('filled'); cell.classList.add('pop-color'); }
    } else if(obstacleRemoved){
      cleared++; clearedCells.push([r,c]);
    }
  });
  if(cleared<=0) return false;

  // "tính như 1 lần phá": nối chuỗi combo + điểm theo hệ số hiện hành
  consecutiveBursts++; combo++;
  updateBurstCount();
  if(combo>=5) unlockAchievement('combo5');
  try{ if(typeof onComboSkillMilestone==='function') onComboSkillMilestone(combo); }catch(e){}
  const pts=cleared*comboScoreMultiplier(combo);
  score+=pts; if(score>best) best=score;
  updateScoreUI(); updateComboUI();
  try{ sfxMatch(cleared); if(combo>1) sfxComboUp(combo, pIdx(consecutiveBursts)); }catch(e){}
  const ctr=clearCentroid(clearedCells, getCell);
  showScorePop(cleared, pts, ctr.x, ctr.y, consecutiveBursts);
  showShockwave(ctr.x, ctr.y, consecutiveBursts);
  showComboCountFlash(combo);
  updateComboBorderGlow(consecutiveBursts);
  try{ mainBurstFX(clearedCells, consecutiveBursts); }catch(e){}
  const label = p.type==='fire' ? '🔥 Lửa cháy 3×3!'
              : p.type==='bubble' ? '🫧 Nổ sạch một màu!'
              : '💨 Gió thổi bay cả hàng!';
  try{ showComboFlash(0,false,label+' +'+pts); }catch(e){}
  return true;
}

/** Chạy lần lượt các vật phẩm vừa bị phá trúng, xong quay lại chuỗi nổ thường */
function runPowerQueue(queue){
  if(!queue.length){
    powerBusy = false;
    setTimeout(()=>{
      renderGrid();
      if(consecutiveBursts>=3 && !secretMode) triggerUnlock();
      else processClears();
    }, 120);
    return;
  }
  powerBusy = true;
  const p=queue.shift();
  activatePower(p, queue);
  setTimeout(()=>{ renderGrid(); setTimeout(()=>runPowerQueue(queue), 200); }, 320);
}
function processClears(){
  const cellAlive=(r,c)=> board[r][c]!==null && !pendingClearKeys.has(`${r},${c}`);
  let lineKeys=new Set();
  for(let r=0;r<ROWS;r++)
    if(board[r].every((v,c)=>cellAlive(r,c)))
      for(let c=0;c<COLS;c++) lineKeys.add(`${r},${c}`);
  for(let c=0;c<COLS;c++)
    if(Array.from({length:ROWS},(_,r)=>r).every(r=>cellAlive(r,c)))
      for(let r=0;r<ROWS;r++) lineKeys.add(`${r},${c}`);

  // Nổ màu: một CỤM cùng màu NỐI LIỀN nhau (4 hướng), tối thiểu COLOR_BURST_MIN ô.
  let colorKeys=new Set();
  const seen=new Set();
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const color=board[r][c];
    const key=`${r},${c}`;
    if(!color || seen.has(key) || pendingClearKeys.has(key)) continue;
    if(thornCells.has(key)){ seen.add(key); continue; } // thorn cell cannot start or join a burst
    const comp=[[r,c]]; const q=[[r,c]]; seen.add(key);   // BFS cụm cùng màu liền kề
    while(q.length){
      const [cr,cc]=q.shift();
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const nr=cr+dr, nc=cc+dc, nk=`${nr},${nc}`;
        if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!seen.has(nk)&&board[nr][nc]===color
           &&!thornCells.has(nk)&&!pendingClearKeys.has(nk)){
          seen.add(nk); q.push([nr,nc]); comp.push([nr,nc]);
        }
      }
    }
    if(comp.length>=getMinBurst()) comp.forEach(([gr,gc])=>colorKeys.add(`${gr},${gc}`));
  }

  const totalKeys=new Set([...lineKeys,...colorKeys]);
  totalKeys.forEach(k=>pendingClearKeys.add(k)); // đánh dấu ngay — đợt tính sau coi như trống

  if(totalKeys.size===0){
    // Đặt khối mà không nổ → đứt chuỗi combo, phải tính lại từ đầu (không khen liên tiếp nữa)
    combo=0; consecutiveBursts=0; updateComboUI(); updateBurstCount();
    const wrap=document.getElementById('grid-wrap');
    wrap.classList.remove('combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    afterPlace();
    return;
  }

  // Track consecutive bursts for unlock
  consecutiveBursts++;
  updateBurstCount();
  combo++;
  if(combo>=5) unlockAchievement('combo5');
  try{ if(typeof onComboSkillMilestone==='function') onComboSkillMilestone(combo); }catch(e){}

  // 🔥🫧💨 vật phẩm bị phá trúng trong đợt này → kích hoạt sau khi đợt nổ xong
  const triggeredPowers=[];
  totalKeys.forEach(k=>{
    if(powerCells.has(k)){
      const [pr,pc]=k.split(',').map(Number);
      triggeredPowers.push({ type:powerCells.get(k), r:pr, c:pc, color:board[pr][pc] });
      powerCells.delete(k);
    }
  });
  // Mỗi 15 lần phá ở map thường → tự sinh 1 logo ngẫu nhiên lên bàn
  if(!secretMode){
    powerClearWaves++;
    if(powerClearWaves>=POWER_SPAWN_EVERY){
      powerClearWaves=0;
      setTimeout(()=>{
        const k=spawnPowerCell();
        if(k){ try{ sfxPowerUp(); showComboFlash(0,false,'✨ Ô vật phẩm xuất hiện trên bàn!'); }catch(e){} }
      }, 650);
    }
  }
  // Quy tắc: phá 1 ô = 1 điểm. Phá liên tiếp (combo) từ lần thứ 3 → x2 điểm, từ lần thứ 6 → x3 điểm.
  const scoreMult=comboScoreMultiplier(combo);
  const pts=totalKeys.size*scoreMult;
  sfxMatch(colorKeys.size); if(combo>1) sfxComboUp(combo, pIdx(consecutiveBursts));
  score+=pts; if(score>best) best=score;
  try{ if(typeof checkRunCups==='function') checkRunCups(); }catch(e){}
  try{ if(typeof checkPersistentCups==='function') checkPersistentCups(); }catch(e){}
  const clearedRows=new Set([...lineKeys].map(k=>k.split(',')[0]));
  linesCleared+=clearedRows.size;
  const prevLevel=level; level=Math.floor(linesCleared/5)+1;
  if(level>prevLevel) setTimeout(()=>applyLevelDifficulty(), 600);
  try{ if(typeof checkRunCups==='function') checkRunCups(); }catch(e){}
  updateScoreUI(); updateComboUI();
  const _ctr=clearCentroid([...totalKeys].map(k=>k.split(',').map(Number)), getCell);
  showScorePop(totalKeys.size, pts, _ctr.x, _ctr.y, consecutiveBursts);
  showShockwave(_ctr.x, _ctr.y, consecutiveBursts);
  // Chỉ hiện câu khen (COOL/GOOD/...) khi đạt MỐC 5 lần nổ liên tiếp — không phải cứ nổ
  // là khen ngay, phải thật sự khó (combo dài) mới được khen (tham khảo Block Blast).
  if(shouldPraise(consecutiveBursts)) showPraise(praiseLevelForStreak(consecutiveBursts));
  showComboCountFlash(combo);
  updateComboBorderGlow(consecutiveBursts); // viền sáng theo combo map thường
  // 🎆 Pháo hoa viền + tia lấp lánh cho map thường
  mainBurstFX([...totalKeys].map(k=>k.split(',').map(Number)), consecutiveBursts);

  lineKeys.forEach(key=>{
    const [r,c]=key.split(',').map(Number);
    const cell=getCell(r,c);
    if(cell){ cell.classList.remove('filled'); cell.classList.add('pop-line'); }
  });
  setTimeout(()=>{
    colorKeys.forEach(key=>{
      const [r,c]=key.split(',').map(Number);
      const cell=getCell(r,c);
      if(cell){ cell.classList.remove('filled'); cell.classList.add('pop-color'); }
    });
  }, colorKeys.size>0?80:0);

  const waitTime=colorKeys.size>0?500:360;
  setTimeout(()=>{
    // đợt nổ hoàn tất — gỡ dấu "đang chờ nổ" (kể cả ô sống sót nhờ gai/băng)
    totalKeys.forEach(k=>pendingClearKeys.delete(k));
    let eggHitThisWave=false; // mỗi ĐỢT nổ chỉ làm nứt vỏ trứng 1 lớp, dù nhiều ô cùng kề trứng
    let spiderHitWave=false, bhHitWave=false, snailHitWave=false, snakeHitWave=false, portalHitWave=false, dkHitWave=false, squirrelHitWave=false;
    // 🌿 chụp trước các ô đang có dây gai TẠI THỜI ĐIỂM đợt nổ bắt đầu — các ô này được gai
    // bảo vệ suốt đợt (kể cả khi ô kề bên nổ trong cùng đợt vừa gỡ gai xong): ô màu KHÔNG mất,
    // chỉ mất dây gai nhờ ô kề bên nổ; đợt nổ sau ô mới vỡ như bình thường
    const vineProtected=new Set([...totalKeys].filter(k=>thornCells.has(k)));
    totalKeys.forEach(key=>{
      const [r,c]=key.split(',').map(Number);
      if(vineProtected.has(key)) return; // gai đỡ đòn cho ô màu bên dưới
      // 🧊 ô đóng băng: lần nổ đầu chỉ làm NỨT băng (ô sống sót), lần 2 mới vỡ và xóa
      if(iceCells.has(key)){
        const stage=iceCells.get(key);
        if(stage>=2){ iceCells.set(key,1); try{ sfxClick(); }catch(e){} return; }
        iceCells.delete(key);
      }
      board[r][c]=null;
      delete cellPlacedAt[key];
      mirrorCells.delete(key);
      // 💣 nổ ô kề bom → gỡ bom thành công, thưởng điểm
      if(bombCell && Math.abs(bombCell.r-r)<=1 && Math.abs(bombCell.c-c)<=1 && !(bombCell.r===r&&bombCell.c===c)){
        bombCell=null; bombRespawn=10;
        const bTh=MCFG('bomb','thuong');
        score+=bTh; if(score>best) best=score; updateScoreUI();
        showComboFlash(0,false,t('fxDefuse', bTh));
      }
      // 🥚 nổ ô kề trứng rồng → nứt vỏ; vỡ hẳn thì thưởng điểm
      if(dragonEgg && !eggHitThisWave && Math.abs(dragonEgg.r-r)<=1 && Math.abs(dragonEgg.c-c)<=1 && !(dragonEgg.r===r&&dragonEgg.c===c)){
        eggHitThisWave=true;
        dragonEgg.shell--;
        if(dragonEgg.shell<=0){
          dragonEgg=null; eggRespawn=12;
          const eTh=MCFG('egg','thuong');
          score+=eTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxEggBreak', eTh));
        } else {
          showHint(t('hintEggCracked'));
        }
      }
      // 🌫️ nổ ô trong vùng sương mù → sương tan một lúc
      if(fogCenter && Math.abs(fogCenter.r-r)<=1 && Math.abs(fogCenter.c-c)<=1){
        fogCenter=null; fogCooldown=6;
      }
      // 🕷️ nổ trúng ô nhện → trừ HP, nhện nhảy đi
      if(spider && !spiderHitWave && spider.r===r && spider.c===c){
        spiderHitWave=true;
        spider.hp--;
        if(spider.hp<=0){
          spider=null; spiderRespawn=20; spiderWebbedIdx=-1; spiderWebbedLeft=0;
          const sTh=MCFG('spider','thuong');
          score+=sTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxSpiderKill', sTh));
          renderPieces();
        } else {
          showHint(t('hintSpiderHp', spider.hp, MCFG('spider','hp')));
          const p=randEmptyKey(); if(p){ spider.r=p[0]; spider.c=p[1]; }
        }
      }
      // 🕳️ nổ kề hố đen → tích dấu phong ấn
      if(blackHole && !bhHitWave && Math.abs(blackHole.r-r)<=1 && Math.abs(blackHole.c-c)<=1 && !(blackHole.r===r&&blackHole.c===c)){
        bhHitWave=true;
        blackHole.seals++;
        if(blackHole.seals>=BH_SEALS){
          blackHole=null; bhRespawn=15;
          const hTh=MCFG('bh','thuong');
          score+=hTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxBhSeal', hTh));
        } else {
          showHint(t('hintBhSeal', blackHole.seals, BH_SEALS));
        }
      }
      // 👻 nổ trúng ô ma nhập → trừ tà
      if(ghostCell && ghostCell.r===r && ghostCell.c===c){
        ghostCell=null; ghostRespawn=12;
        const gTh=MCFG('ghost','thuong');
        score+=gTh; if(score>best) best=score; updateScoreUI();
        showComboFlash(0,false,t('fxGhostOut', gTh));
      }
      // 🐌 nổ kề ốc sên → tích đòn
      if(snail && !snailHitWave && Math.abs(snail.r-r)<=1 && Math.abs(snail.c-c)<=1 && !(snail.r===r&&snail.c===c)){
        snailHitWave=true;
        snail.hits++;
        if(snail.hits>=SNAIL_HITS){
          snail=null; snailRespawn=18;
          const oTh=MCFG('snail','thuong');
          score+=oTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxSnailKill', oTh));
        } else {
          showHint(t('hintSnailHit', snail.hits, SNAIL_HITS));
        }
      }
      // 🧱 nổ ô cạnh tường → bào mòn tường (giống núi, mỗi ô nổ bào 1 ô tường)
      if(wallCells.size){
        for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
          const nk=`${r+dr},${c+dc}`;
          if(wallCells.has(nk)){ wallCells.delete(nk); break; }
        }
      }
      // 🐍 nổ trúng thân rắn thần → trừ HP
      if(snakeSpirit && !snakeHitWave && snakeSpirit.cells.some(([sr,sc])=>sr===r&&sc===c)){
        snakeHitWave=true;
        snakeSpirit.hp--;
        if(snakeSpirit.hp<=0){
          snakeSpirit=null; snakeSpiritRespawn=25;
          const rTh=MCFG('snakeSpirit','thuong');
          score+=rTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxSnakeKill', rTh));
        } else {
          showHint(t('hintSnakeHp', snakeSpirit.hp, MCFG('snakeSpirit','hp')));
        }
      }
      // 🌀 nổ kề cổng → tích dấu đóng cổng (cả 2 cổng cùng đóng)
      if(portalA && !portalHitWave){
        const nearA=Math.abs(portalA.r-r)<=1&&Math.abs(portalA.c-c)<=1;
        const nearB=portalB&&Math.abs(portalB.r-r)<=1&&Math.abs(portalB.c-c)<=1;
        if(nearA||nearB){
          portalHitWave=true;
          portalHits++;
          if(portalHits>=PORTAL_SEALS){
            portalA=null; portalB=null; portalRespawn=20;
            const pTh=MCFG('portal','thuong');
            score+=pTh; if(score>best) best=score; updateScoreUI();
            showComboFlash(0,false,t('fxPortalClose', pTh));
          } else {
            showHint(t('hintPortalHit', portalHits, PORTAL_SEALS));
          }
        }
      }
      // 🐲 nổ trúng ô Vua Rồng → trừ HP, hắn bay đi chỗ khác
      if(dragonKing && !dkHitWave && dragonKing.r===r && dragonKing.c===c){
        dkHitWave=true;
        dragonKing.hp--;
        if(dragonKing.hp<=0){
          dragonKing=null; dkRespawn=30;
          const kTh=MCFG('dk','thuong');
          score+=kTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxDkDown', kTh));
        } else {
          showHint('🐲 Trúng Vua Rồng! HP còn '+dragonKing.hp+'/'+MCFG('dk','hp'));
          const p=randEmptyKey(); if(p){ dragonKing.r=p[0]; dragonKing.c=p[1]; }
        }
      }
      // Track burst history and remove adjacent thorns
      if(thornMode){
        cellBurstCount[key]=(cellBurstCount[key]||0)+1;
        thornCells.delete(key); // cleared cells are no longer thorned
        for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
          const nk=`${r+dr},${c+dc}`;
          if(thornCells.has(nk)) thornCells.delete(nk);
        }
      }
      // ⛰️ nổ ô cạnh núi → bào mòn núi 1 ô (mỗi ô nổ bào tối đa 1 ô núi)
      if(mountainCells.size){
        for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
          const nk=`${r+dr},${c+dc}`;
          if(mountainCells.has(nk)){
            mountainCells.delete(nk);
            if(mountainCells.size===0){
              mountainRespawn=15; // san phẳng! 15 bước sau núi mới mọc lại
              showComboFlash(0,false,t('fxMountainFlat'));
            }
            break;
          }
        }
      }
      // 🐿️ nổ trúng ô sóc đang đứng HOẶC ô liền kề nó → trừ HP (mỗi đợt nổ chỉ trừ 1 lần)
      if(squirrel && !squirrelHitWave && Math.abs(squirrel.r-r)<=1 && Math.abs(squirrel.c-c)<=1){
        squirrelHitWave=true;
        squirrel.hp--;
        if(squirrel.hp<=0){
          squirrel=null;
          bittenCells.clear(); squirrelStolen=0; // các ô bị gặm được phục hồi khi sóc chết
          squirrelRespawn=6; // 6 bước sau nếu bàn cờ chưa "sạch" thì sóc mới sẽ xuất hiện
          const bTh=MCFG('squirrel','thuong');
          showComboFlash(0,false,t('fxSquirrelDown', bTh));
          score+=bTh; if(score>best) best=score; updateScoreUI();
        } else {
          showHint('🐿️ Trúng sóc! HP còn '+squirrel.hp+'/'+MCFG('squirrel','hp'));
          // sóc hoảng sợ nhảy sang 1 ô liền kề (vẫn tuân thủ quy tắc chỉ đi 1 ô mỗi lượt)
          squirrelStepTo1AdjacentCell();
        }
      }
    });
    renderGrid();

    // 🔥🫧💨 có vật phẩm bị phá trúng → chạy hiệu ứng trước, xong mới nối chuỗi
    if(triggeredPowers.length){
      setTimeout(()=>runPowerQueue(triggeredPowers), 150);
      return;
    }

    // Check unlock BEFORE continuing chain
    if(consecutiveBursts>=3 && !secretMode){
      setTimeout(()=>triggerUnlock(), 200);
    } else {
      setTimeout(()=>processClears(), 100);
    }
  }, waitTime);
}

/* 🌿 Thorn vine difficulty mechanic */

/* 🎆 Hiệu ứng pháo hoa viền + tia lấp lánh cho map thường */


function checkGameOverA(){
  // Đang có đợt nổ chờ gỡ ô khỏi board (ô vẫn "đầy ảo" trong lúc animation chạy) —
  // hoãn kết luận; chuỗi processClears sẽ gọi kiểm tra lại sau khi đợt nổ xong.
  if(pendingClearKeys.size>0) return false;
  // khay đã dùng hết khối → bổ sung trước khi kết luận (tránh báo hết lượt oan
  // khi luồng unlock/thoát map ẩn gọi check trước khi refill kịp chạy)
  if(!pieces || !pieces.length || pieces.every(p=>p.used)){ refillPieces(); renderPieces(); }
  const rot=s=>{ const maxR=Math.max(...s.map(([r])=>r)); return s.map(([r,c])=>[c,maxR-r]); };
  const pieceFits=piece=>{
    let sh=piece.shape;
    for(let k=0;k<4;k++){ // người chơi có thể XOAY khối — phải thử đủ 4 hướng
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(canPlace({shape:sh},r,c)) return true;
      sh=rot(sh);
    }
    return false;
  };
  let hasMove=pieces.some((piece,i)=>{
    if(piece.used) return false;
    if(spiderWebbedIdx===i && spiderWebbedLeft>0) return false; // khối bị tơ khóa không tính
    return pieceFits(piece);
  });
  // nước đi duy nhất còn lại nằm ở khối đang bị tơ nhện khóa → gỡ tơ thay vì xử thua
  if(!hasMove && spiderWebbedIdx>=0 && spiderWebbedLeft>0 && pieces[spiderWebbedIdx] &&
     !pieces[spiderWebbedIdx].used && pieceFits(pieces[spiderWebbedIdx])){
    spiderWebbedIdx=-1; spiderWebbedLeft=0;
    renderPieces();
    showHint('🕸️ Tơ nhện tự đứt — khối cuối cùng được giải phóng!');
    hasMove=true;
  }
  if(!hasMove){
    sfxGameOver();
    document.getElementById('go-score').textContent=t('finalScore', score.toLocaleString());
    document.getElementById('game-over-overlay').classList.add('show');
    if(typeof submitScoreToLeaderboard==='function') submitScoreToLeaderboard(score);
   window._adGameOverCount = (window._adGameOverCount||0) + 1;
       if(typeof showInterstitialAd==='function' && window._adGameOverCount % 2 === 0) showInterstitialAd();
    return true; // đã báo thua
  }
  return false;
}

function renderPieces(){
  const area=document.getElementById('pieces-area');
  area.innerHTML='';
  slotEls=[];
  pieces.forEach((piece,idx)=>{
    const slot=document.createElement('div');
    slot.className='piece-slot'+(piece.used?' used':'')+(selected===idx?' selected':'')
      +(spiderWebbedIdx===idx&&spiderWebbedLeft>0?' webbed':'');
    slot.addEventListener('pointerdown', (e)=>onSlotPointerDown(e, idx));
    const maxR=Math.max(...piece.shape.map(([r])=>r));
    const maxC=Math.max(...piece.shape.map(([,c])=>c));
    const g=document.createElement('div');
    
    // --- CHỈNH SỬA TẠI ĐÂY: Thêm lưới hàng ngang và ép căn giữa ---
    g.style.cssText=`display:grid;grid-template-columns:repeat(${maxC+1},14px);grid-template-rows:repeat(${maxR+1},14px);gap:2px;place-content:center;`;
    
    const cells=Array((maxR+1)*(maxC+1)).fill(null);
    piece.shape.forEach(([r,c])=>cells[r*(maxC+1)+c]=piece.color);
    cells.forEach(color=>{
      const d=document.createElement('div');
      d.className='p-cell'+(color?' candy':'');
      
      // --- CHỈNH SỬA TẠI ĐÂY: Ép tỷ lệ ô luôn luôn vuông 1:1 ---
      d.style.aspectRatio='1 / 1';
      d.style.width='100%';
      d.style.height='100%';
      
      if(color){
        d.style.setProperty('--cc',color); d.style.border='none';
        const pci=COLORS.indexOf(color);
        if(pci>=0) d.dataset.ci=String(pci);
      }
      else { d.style.background='rgba(0,0,0,0.28)'; d.style.border='1px solid rgba(255,255,255,0.06)'; }
      g.appendChild(d);
    });
    slot.appendChild(g);
    const label=document.createElement('div');
    label.style.cssText='font-size:10px;color:#b8b0c8;margin-top:4px;font-weight:700;';
    const ci=COLORS.indexOf(piece.color);
    label.textContent=ci>=0?COLOR_NAMES[ci]:'';
    slot.appendChild(label);
    area.appendChild(slot);
    slotEls.push(slot);
  });
}
