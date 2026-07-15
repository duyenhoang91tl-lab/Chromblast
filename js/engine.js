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
  placeCounter=0; cellPlacedAt={};
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
  const k=r+c;
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
    if(cell.style.background!==bg) cell.style.background=bg;
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
    d.className='g-cell';
    d.style.width=g.cell+'px';
    d.style.height=g.cell+'px';
    if(color){ d.style.background=color; }
    else { d.style.visibility='hidden'; }
    ghostEl.appendChild(d);
  });
}

function showGhost(piece){ buildGhost(piece); ghostEl.classList.add('active'); }
function hideGhost(){ ghostEl.classList.remove('active'); ghostEl.innerHTML=''; }

function moveGhost(x,y){
  if(selected===null) return;
  const {bbH}=pieceBox(pieces[selected]);
  const [ax,ay]=ghostAnchor(x,y,bbH);
  ghostEl.style.left=ax+'px';
  ghostEl.style.top=ay+'px';
}

let previewedCells = []; // ô đang được tô preview — tránh phải quét lại toàn bộ DOM mỗi lần di chuột
function clearPreview(){
  for(const c of previewedCells){ c.classList.remove('preview-ok'); c.style.background=''; }
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
    if(cell){ cell.classList.add('preview-ok'); cell.style.background=piece.color; previewedCells.push(cell); }
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
}

/* ── bộ xử lý pointer ── */
function onSlotPointerDown(e, idx){
  if(secretMode) return;
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

  // Kéo thật hoặc tap vào lưới -> thả nếu đáp vào chỗ hợp lệ
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

// Tap trên nền lưới (không phải ô cụ thể) khi đang giữ khối -> không xoay nữa (đã chuyển vào onSlotPointerDown)
document.getElementById('grid').addEventListener('pointerdown', e=>{
  if(e.target.classList.contains('cell')) return;
});

function showRotateBar(show){
  // Thanh xoay đã bị tắt
}
document.addEventListener('pointerdown', e => {
  if (selected === null || secretMode) return;
  // Nếu chạm vào nền (không phải slot, không phải lưới, không phải UI buttons) -> Bỏ chọn
  if (!e.target.closest('.piece-slot') && !e.target.closest('.cell') && !e.target.closest('#game-controls')) {
    endDrag();
  }
});

document.addEventListener('pointermove', onDocPointerMove, {passive:false});
document.addEventListener('pointerup', onDocPointerUp);
document.addEventListener('pointercancel', onDocPointerCancel);

// Chạm vào ô lưới (sau khi đã chọn khối) → đặt tại ô vừa chạm
function onCellClick(e){
  if(selected===null) return;
  const piece=pieces[selected];
  if(piece.used) return;
  const o=originFromPointer(e.clientX,e.clientY,piece,'mouse');
  const R=o?o.R:+e.currentTarget.dataset.r;
  const C=o?o.C:+e.currentTarget.dataset.c;
  if(!canPlace(piece,R,C)){ sfxInvalid(); showHint(t('hintCantPlace')); return; }
  placeAt(R,C);
}

function processClears(){
  let lineKeys=new Set();
  for(let r=0;r<ROWS;r++)
    if(board[r].every(v=>v!==null))
      for(let c=0;c<COLS;c++) lineKeys.add(`${r},${c}`);
  for(let c=0;c<COLS;c++)
    if(Array.from({length:ROWS},(_,r)=>board[r][c]).every(v=>v!==null))
      for(let r=0;r<ROWS;r++) lineKeys.add(`${r},${c}`);

  // Nổ màu: một CỤM cùng màu NỐI LIỀN nhau (4 hướng), tối thiểu COLOR_BURST_MIN ô.
  let colorKeys=new Set();
  const seen=new Set();
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const color=board[r][c];
    const key=`${r},${c}`;
    if(!color || seen.has(key)) continue;
    if(thornCells.has(key)){ seen.add(key); continue; } // thorn cell cannot start or join a burst
    const comp=[[r,c]]; const q=[[r,c]]; seen.add(key);   // BFS cụm cùng màu liền kề
    while(q.length){
      const [cr,cc]=q.shift();
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const nr=cr+dr, nc=cc+dc, nk=`${nr},${nc}`;
        if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!seen.has(nk)&&board[nr][nc]===color&&!thornCells.has(nk)){
          seen.add(nk); q.push([nr,nc]); comp.push([nr,nc]);
        }
      }
    }
    if(comp.length>=getMinBurst()) comp.forEach(([gr,gc])=>colorKeys.add(`${gr},${gc}`));
  }

  const totalKeys=new Set([...lineKeys,...colorKeys]);

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
  unlockAchievement('first_burst'); // first burst ever

  combo++;
  if(combo>=5) unlockAchievement('combo5');
  // Quy tắc: phá 1 ô = 1 điểm. Phá liên tiếp (combo) từ lần thứ 3 → x2 điểm, từ lần thứ 6 → x3 điểm.
  const scoreMult=comboScoreMultiplier(combo);
  const pts=totalKeys.size*scoreMult;
  sfxMatch(colorKeys.size); if(combo>1) sfxComboUp(combo, pIdx(consecutiveBursts));
  score+=pts; if(score>best) best=score;
  if(score>=1000 && score-pts<1000) unlockAchievement('score1000');
  if(score>=5000 && score-pts<5000) unlockAchievement('score5000');
  const clearedRows=new Set([...lineKeys].map(k=>k.split(',')[0]));
  linesCleared+=clearedRows.size;
  const prevLevel=level; level=Math.floor(linesCleared/5)+1;
  if(level>prevLevel) setTimeout(()=>applyLevelDifficulty(), 600);
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
      d.className='p-cell';
      
      // --- CHỈNH SỬA TẠI ĐÂY: Ép tỷ lệ ô luôn luôn vuông 1:1 ---
      d.style.aspectRatio='1 / 1';
      d.style.width='100%';
      d.style.height='100%';
      
      d.style.background=color||'#0f0f23';
      d.style.border=color?'none':'1px solid #2a2a4a';
      g.appendChild(d);
    });
    slot.appendChild(g);
    const label=document.createElement('div');
    label.style.cssText='font-size:10px;color:#555;margin-top:4px;';
    const ci=COLORS.indexOf(piece.color);
    label.textContent=ci>=0?COLOR_NAMES[ci]:'';
    slot.appendChild(label);
    area.appendChild(slot);
    slotEls.push(slot);
  });
}

/* Tự co giãn toàn bộ khung game để vừa màn hình khi xoay ngang (landscape) —
   tránh bị cắt mất một phần khung do chiều cao viewport quá thấp so với nội dung. */
(function(){
  const root=document.getElementById('game-root');
  function fitGameRoot(){
    root.style.transform='none';
    const availH=window.innerHeight-16;
    const contentH=root.scrollHeight;
    if(contentH>availH && availH>0){
      const scale=Math.max(0.55, availH/contentH);
      root.style.transform='scale('+scale+')';
    }
    // #game-root vừa co giãn lại — toạ độ getBoundingClientRect() của lưới (cache trong
    // engine.js) không còn đúng nữa, phải tính lại ở lần kéo-thả kế tiếp.
    if(typeof invalidateGridGeom==='function') invalidateGridGeom();
  }
  window.addEventListener('resize', fitGameRoot);
  window.addEventListener('orientationchange', ()=>setTimeout(fitGameRoot,150));
  window.addEventListener('load', fitGameRoot);
  document.addEventListener('DOMContentLoaded', fitGameRoot);
  // TRƯỚC ĐÂY: setInterval(fitGameRoot, 1000) ép tính lại MỖI GIÂY dù không có gì
  // đổi — mỗi lần lại ghi transform:none rồi đọc scrollHeight ngay (layout thrashing),
  // gây giật nhẹ đều đặn suốt ván chơi. Giờ dùng ResizeObserver: chỉ tính lại khi
  // NỘI DUNG #game-root thực sự đổi kích thước (mở modal, đổi ngôn ngữ dài/ngắn...).
  if('ResizeObserver' in window){
    let pending=false;
    new ResizeObserver(()=>{
      if(pending) return;
      pending=true;
      requestAnimationFrame(()=>{ pending=false; fitGameRoot(); });
    }).observe(root);
  } else {
    setInterval(fitGameRoot, 1000); // fallback cho trình duyệt cũ không có ResizeObserver
  }
})();
/* ══════════════════════════════════════════
   CONSTANTS & STATE
══════════════════════════════════════════ */
const COLS=8, ROWS=8;
const COLORS=['#E24B4A','#378ADD','#1D9E75','#EF9F27','#D4537E','#7F77DD','#D85A30','#5DCAA5'];
const COLOR_NAMES=['Đỏ','Xanh dương','Xanh lá','Cam','Hồng','Tím','Da cam','Ngọc'];
const SHAPES=[
  [[0,0],[1,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[1,1]],
  [[0,0],[0,1],[1,1],[1,2]],[[1,0],[0,1],[1,1],[0,2]],
  [[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]],
  [[0,0],[1,0],[1,1],[2,1]],[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],
  [[0,0],[1,0],[2,0],[0,1]],[[0,0],[1,0],[0,1],[0,2]],
  [[0,0],[1,0],[2,0],[2,1]],[[0,0],[0,1],[0,2],[1,2]],
  [[0,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[0,1],[1,1],[0,2]],
  [[0,0],[1,0],[2,0],[0,1],[2,1]],
];
const SECRET_COLORS = COLORS.slice(0,4); // 4 màu đầu giống map thường
const COLOR_BURST_MIN = 12;   // Tăng ngưỡng nổ màu (từ 9 lên 12) để tránh nổ quá sớm khi chưa đầy hàng/cột
const SECRET_WINDOW = 2500;  // ms — khoảng thời gian giữa 2 lần nổ trong map ẩn (ấn chậm hơn sẽ thoát)
const SECRET_ULTRA  = 9;     // streak to trigger ultra
const TEST_UNLOCK_SCORE = 100; // ngưỡng điểm mở khoá Map ẩn 1 (và mốc thắng trong Map ẩn 1)


// Mode A state
let board, pieces, selected, score=0, best=0, linesCleared=0, level=1, combo=0;
// Load persisted data
(function loadSaved(){
  const saved = getSavedGameData();
  if(saved.best) best = saved.best;
})();
let consecutiveBursts = 0; // counts chain explosions toward unlock


/* ── Quy tắc tính điểm chung: 1 ô = 1 điểm; phá liên tiếp 3 lần → x2; 6 lần → x3 ──
   Dùng chung cho map thường và mọi map ẩn để thang điểm đồng nhất. */
function comboScoreMultiplier(streak){
  return streak>=6 ? 3 : streak>=3 ? 2 : 1;
}

/* ── Câu khen chỉ hiện mỗi khi đạt MỐC 5 lần nổ liên tiếp — không phải cứ nổ là khen ──
   streak 5 → 'COOL', streak 10 → 'GOOD', streak 15 → 'GREAT'... càng khó càng khen to. */
const COMBO_PRAISE_STEP = 5;
function shouldPraise(streak){ return streak>0 && streak % COMBO_PRAISE_STEP === 0; }
function praiseLevelForStreak(streak){ return Math.floor(streak/COMBO_PRAISE_STEP)+1; } // dùng cho pIdx

/* ── Dynamic burst threshold based on level ── */
function getMinBurst(){
  if(level >= 7) return COLOR_BURST_MIN + 2;
  if(level >= 4) return COLOR_BURST_MIN + 1;
  return COLOR_BURST_MIN;
}

/* ── Level-up fanfare ── */
function applyLevelDifficulty(){
  try { sfxUnlock(); } catch(e){}
  const lb = document.getElementById('level-box');
  if(lb){
    lb.style.transition = 'all 0.3s';
    lb.style.color = '#ffdd00';
    lb.style.textShadow = '0 0 10px #ffdd00';
    lb.style.transform = 'scale(1.3)';
    setTimeout(()=>{ lb.style.color=''; lb.style.textShadow=''; lb.style.transform=''; }, 800);
  }
  if(level === 5)  unlockAchievement('level5');
  if(level === 10) unlockAchievement('level10');
}

let awaitingSecretUnlock=true;  // mở map ẩn 1 khi đạt TEST_UNLOCK_SCORE điểm từ map thường
let secretUnlockBaseline=0;     // mốc điểm lúc bắt đầu đếm





// Mode B state
let secretBoard = [];        // 8x8 color indices
let secretMode = false;
// (Khai báo sớm các biến mode bị dùng trong startGame() trước khi đoạn code khai báo gốc của chúng chạy tới —
//  nếu không sẽ bị lỗi "Cannot access before initialization" (TDZ) làm crash startGame() ngay từ đầu,
//  khiến bàn cờ và các viên gạch không bao giờ được vẽ ra.)
let snakeMode=false, snakeRAF=null, snakeLast=0;
let brickMode=false, brickRAF=null, brickLast=0;
let runnerMode=false, runnerRAF=null, runnerLast=0, runnerElapsed=0, runnerWon=false;
let spaceMode=false, spaceRAF=null, spaceWon=false;
let rhythmMode=false, rhythmRAF=null, rhythmWon=false;
let mazeMode=false, mazeRAF=null, mazeWon=false;
let gamePaused = false;
let secretStreak = 0;
let secretMultiplier = 1;
let secretTimer = null;
let secretUltra = false;
let secretTimerEnd = 0;
let timerRAF = null;
let secretLives = 3;       // 3 tim — bấm sai liên tiếp 3 lần mất 1 tim, hết tim thì thua về map thường
let secretMissStreak = 0;  // đếm số lần bấm sai liên tiếp
let borderSparkInterval = null; // continuous outward sparks during secret mode
let fireInterval = null; // fire border particles for Map ẩn 1 combo


let mainHardTier=0; // số vòng map ẩn đã thắng — map thường khó dần theo mỗi vòng
// 🌗 Cổng tiến trình cho vòng 21-40: phải kiếm đủ điểm ở vòng hiện tại mới được
// bước sang vòng kế tiếp — tuần tự từng vòng một, không nhảy cóc.
let comboGateActive=false;   // đang đếm điểm để vượt qua vòng cơ chế đôi hiện tại?
let comboGateBaseline=0;     // mốc điểm map thường lúc bắt đầu vòng hiện tại
let maxComboTierReached=getSavedComboTier();  // vòng cơ chế đôi cao nhất người chơi từng ĐẠT TỚI (dùng để mở khoá hướng dẫn)
function comboThresholdForTier(tier){ // điểm cần kiếm THÊM ở vòng `tier` để mở vòng tier+1
  return 200 + (tier-20)*50; // vòng 20→21 cần 200đ, càng về sau càng khó (mỗi vòng +50đ)
}


let unlockDeferred=false; // true khi người chơi chọn "quay lại map thường" thay vì vào map ẩn ngay

function updateBurstCount(){
  const bc=document.getElementById('burst-count');
  if(unlockDeferred){
    bc.textContent=t('unlockWaiting');
    bc.classList.add('unlock-pending');
    return;
  }
  bc.classList.remove('unlock-pending');
  if(unlockGateActive && !secretMode){
    const need=unlockThresholdForStage(unlockGateStageIndex+1);
    const earned=Math.min(Math.round(score-unlockGateBaseline), need);
    bc.textContent=
      earned>=need?t('unlockReady'):
      t('progress', earned, need);
  } else if(comboGateActive && !secretMode && mainHardTier>=20 && mainHardTier<41){
    // Các level KHÔNG có map ẩn: đạt đủ điểm map thường → "qua màn", lên level kế tiếp.
    const need=comboThresholdForTier(mainHardTier);
    const earned=Math.min(Math.round(score-comboGateBaseline), need);
    bc.textContent=
      earned>=need?t('passReady', mainHardTier):
      t('passProgress', mainHardTier, earned, need);
  } else {
    bc.textContent=
      consecutiveBursts>=3?t('unlockReady'):t('burstCount', consecutiveBursts);
  }
}

function afterPlace(){
  // Refill trước nếu cần
  if(pieces.every(p=>p.used)){
    refillPieces(); renderPieces();
  }
  checkAdventureUnlock();

  // Đạt đủ điểm map thường (mốc tăng dần 100đ mỗi map ẩn) → mở map ẩn tiếp theo
  if(unlockGateActive && !secretMode && unlockGateStageIndex<UNLOCK_STAGE_ORDER.length &&
     score-unlockGateBaseline>=unlockThresholdForStage(unlockGateStageIndex+1)){
    unlockGateActive=false;
    consecutiveBursts=0; updateBurstCount();
    const stageKey=UNLOCK_STAGE_ORDER[unlockGateStageIndex];
    setTimeout(()=>triggerStageUnlock(stageKey), 250);
    return;
  }
  // 🌗 Đã thắng đủ 20/20 map ẩn → tiến trình vòng cơ chế đôi 21→40, PHẢI vượt qua vòng
  // trước (đạt đủ điểm mốc) mới được mở vòng kế tiếp — tuần tự, không nhảy cóc.
  if(comboGateActive && !secretMode && mainHardTier>=20 && mainHardTier<41 &&
     score-comboGateBaseline>=comboThresholdForTier(mainHardTier)){
    const passedTier=mainHardTier;
    mainHardTier++;
    comboGateBaseline=score;
    if(mainHardTier>maxComboTierReached){ maxComboTierReached=mainHardTier; saveComboProgress(); }
    resetMechanicState();
    applyRoundMechanics();
    if(mainHardTier>=41) comboGateActive=false; // đã vào vòng cuối cùng hiện có (41 — Thế giới gương) — hết tiến trình tự động
    if(isComboTier(mainHardTier)){
      const [na,nb]=comboPairForTier(mainHardTier);
      setTimeout(()=>showComboFlash(0,false,t('passLevel', passedTier, mainHardTier, MECH_NAME(na)+' + '+MECH_NAME(nb))), 300);
    } else {
      setTimeout(()=>showComboFlash(0,false,t('passLevel', passedTier, mainHardTier, MECH_NAME(21))), 300);
    }
  }
  if(pieces.every(p=>p.used)){
    consecutiveBursts=0; updateBurstCount();
    setTimeout(()=>{ refillPieces(); renderPieces(); checkGameOverA(); }, 220);
  } else {
    checkGameOverA();
  }
}

/* ══════════════════════════════════════════
   UNLOCK TRANSITION
══════════════════════════════════════════ */
let autoSkipHiddenMaps = getAutoSkipHiddenMaps();
document.getElementById('unlock-autoskip-chk').addEventListener('change', e=>{
  autoSkipHiddenMaps=e.target.checked;
  saveAutoSkipHiddenMaps(autoSkipHiddenMaps);
});
function triggerUnlock(){
  // 🐛 FIX: nhánh này (combo≥3) trước đây bỏ qua checkGameOverA() hoàn toàn — nếu quân
  // vừa đặt lấp kín bàn cờ ĐÚNG lúc đạt combo mở khoá, game sẽ chỉ hiện popup mở khoá
  // (hoặc treo im nếu popup bị bỏ qua) mà không bao giờ báo thua. Phải kiểm tra trước.
  if(checkGameOverA()) return; // đã hiện Game Over overlay — không hiện popup mở khoá nữa
  pendingUnlock='secret';
  document.getElementById('unlock-title').textContent=t('unlockTitle');
  document.getElementById('unlock-desc').innerHTML=t('unlockDesc', TEST_UNLOCK_SCORE);
  document.getElementById('unlock-btn').textContent=t('unlockBtn');
  showUnlockOverlay();
}

document.getElementById('unlock-btn').addEventListener('click',()=>{
  sfxClick();
  document.getElementById('unlock-overlay').classList.remove('show');
  hiddenMapEntryScore=score; // ghi nhớ mốc điểm — thua map ẩn này sẽ mất hết điểm kiếm thêm trong ván
  // Dispatch qua MapManager (đã thay chuỗi if(pendingUnlock==='...') cũ).
  if(!startMap(pendingUnlock)) enterSecretMode();
});

document.getElementById('unlock-later-btn').addEventListener('click',()=>{
  sfxClick();
  const chk=document.getElementById('unlock-autoskip-chk');
  if(chk){ autoSkipHiddenMaps=chk.checked; saveAutoSkipHiddenMaps(autoSkipHiddenMaps); }
  document.getElementById('unlock-overlay').classList.remove('show');
  unlockDeferred=true;
  updateBurstCount();
});

document.getElementById('burst-count').addEventListener('click',()=>{
  if(!unlockDeferred) return;
  sfxClick();
  unlockDeferred=false;
  showUnlockOverlay();
});


/* ══════════════════════════════════════════
   MAP ẨN 2 — RÙA NÉ CÀ RỐT (canvas, thời gian thực)
══════════════════════════════════════════ */



(function bindDodgeButtons(){
  const bind=(id,side)=>{
    const b=document.getElementById(id);
    const on=e=>{ e.preventDefault(); dodgeKeys[side]=true; };
    const off=()=>{ dodgeKeys[side]=false; };
    b.addEventListener('pointerdown',on);
    b.addEventListener('pointerup',off);
    b.addEventListener('pointerleave',off);
    b.addEventListener('pointercancel',off);
  };
  bind('dctrl-left','left'); bind('dctrl-right','right');
})();

document.addEventListener('keydown', e=>{
  if(dodgeMode){
    if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') dodgeKeys.left=true;
    if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') dodgeKeys.right=true;
  }
  if(typeof snakeMode!=='undefined'&&snakeMode){
    if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'){ e.preventDefault(); setSnakeDir(0,-1); }
    else if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){ e.preventDefault(); setSnakeDir(0,1); }
    else if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){ e.preventDefault(); setSnakeDir(-1,0); }
    else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){ e.preventDefault(); setSnakeDir(1,0); }
  }
  if(typeof brickMode!=='undefined'&&brickMode){
    if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){ e.preventDefault(); brickPaddleX=Math.max(brickPaddleW/2,brickPaddleX-30); }
    else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){ const cv=BrCV(); e.preventDefault(); brickPaddleX=Math.min(360-brickPaddleW/2,brickPaddleX+30); }
    else if(e.key===' '){ e.preventDefault(); brickBall.launched=true; }
  }
  if(typeof runnerMode!=='undefined'&&runnerMode){
    if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W'){
      e.preventDefault();
      if(e.repeat) return;
      runnerTryJump();
    }
  }
});
document.addEventListener('keyup', e=>{
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') dodgeKeys.left=false;
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') dodgeKeys.right=false;
});

/* ══════════════════════════════════════════
   MAP ẨN 3 — CHÉM HOA QUẢ 60 GIÂY (kiểu Fruit Ninja)
   Vuốt/kéo để chém quả bay lên — chạm vào BOM sẽ "nổ", thua ngay.
   Hết 60s mà không trúng bom → qua màn, cả 2 trường hợp đều về map thường,
   ghi thêm điểm ở map thường sẽ mở khoá Map ẩn 4.
══════════════════════════════════════════ */



/* ══════════════════════════════════════════
   MAP ẨN 5 — MÈO ĐÀO VÀNG
   Chạm ô đất kề bên mèo để đào lấy vàng/đá quý.
   Chạm xa hơn để dẫn mèo di chuyển tới gần.
   Chuột chạy qua mang theo kim cương — chạm trúng để bắt, +150 điểm!
   KPI: đạt đủ điểm trong 30 giây.
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   MAP ẨN 6 — ĐẬP ĐỘNG VẬT (WHACK-A-MOLE)
   8 ô trong vườn, chạm đầu để đập.
   KPI: 200 điểm trong 45 giây.
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   MAP ẨN 7 — LẬT THẺ KÝ ỨC (MEMORY MATCH)
   4×3 grid, 6 animal pairs, 60s KPI: match all 6 pairs.
   Score: each match = 50 pts + remaining seconds × 3.
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   MAP ẨN 8 — BUBBLE POP
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   MAP ẨN 9 — STACK TOWER
══════════════════════════════════════════ */


/* ══════════════════════════════════════════
   MAP ẨN 11 — ANIMAL CATCH 🧺
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   MAP ẨN 12 — COLOR FLOOD 🎨
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   MAP ẨN 13 — SURVIVAL ARENA 🌊
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   SHARED UI
══════════════════════════════════════════ */
function updateScoreUI(){
  document.getElementById('score-box').textContent=Math.round(score).toLocaleString();
  document.getElementById('best-box').textContent=t('bestLabel', Math.round(best).toLocaleString());
  document.getElementById('lines-cleared').textContent='Hàng xóa: '+linesCleared;
  document.getElementById('level-box').textContent=t('levelLabel', level);
  // mỗi điểm ghi thêm = 1 XP người chơi (điểm giảm/reset không trừ XP)
  if(score>_xpLastScore) addPlayerXP(score-_xpLastScore);
  _xpLastScore=score;
  checkScoreMilestone();
  if(unlockGateActive && !secretMode) updateBurstCount();
  saveProgress();
}

// Mốc điểm tròn (1000, 2000, 3000...) → banner ăn mừng lớn giữa màn hình + confetti
function checkScoreMilestone(){
  const tier=Math.floor(score/MILESTONE_STEP);
  if(tier>0 && tier*MILESTONE_STEP>lastMilestoneScore){
    lastMilestoneScore=tier*MILESTONE_STEP;
    showMilestoneBanner(lastMilestoneScore, milestoneMsgFor(tier));
  }
}

function updateComboUI(){
  document.getElementById('combo-box').textContent=combo>1?'🔥 Combo x'+combo:'';
}


// Chữ "Combo xN" phong cách Woodoku — hiện riêng, không đè lên câu khen (showPraise)




/* ══════════════════════════════════════════
   START / RESTART
══════════════════════════════════════════ */
function startGame(){
  startBgm('main');
  // Reset achievements for new game session
  Object.values(ACHIEVEMENTS).forEach(a=>{ a.done=false; });
  fruitSlicedTotal=0; survive60Unlocked=false;
  score=0; linesCleared=0; level=1; combo=0; consecutiveBursts=0; _xpLastScore=0; lastMilestoneScore=0;
  hiddenMapEntryScore=0;
  secretStreak=0; secretMultiplier=1; secretUltra=false;
  secret1Gained=0; pendingUnlock='secret';
  unlockGateStageIndex=0; unlockGateBaseline=0; unlockGateActive=true;
  memoryMode=false; if(memoryRAF){cancelAnimationFrame(memoryRAF);memoryRAF=null;}
  bubbleMode=false; if(typeof bubbleRAF!=='undefined'&&bubbleRAF){cancelAnimationFrame(bubbleRAF);bubbleRAF=null;}
  stackMode=false; if(typeof stackRAF!=='undefined'&&stackRAF){cancelAnimationFrame(stackRAF);stackRAF=null;}
  bossMode=false; if(typeof bossRAF!=='undefined'&&bossRAF){cancelAnimationFrame(bossRAF);bossRAF=null;}
  catchMode=false; if(typeof catchRAF!=='undefined'&&catchRAF){cancelAnimationFrame(catchRAF);catchRAF=null;}
  floodMode=false; if(typeof floodRAF!=='undefined'&&floodRAF){cancelAnimationFrame(floodRAF);floodRAF=null;}
  arenaMode=false; if(typeof arenaRAF!=='undefined'&&arenaRAF){cancelAnimationFrame(arenaRAF);arenaRAF=null;}
  snakeMode=false; if(typeof snakeRAF!=='undefined'&&snakeRAF){cancelAnimationFrame(snakeRAF);snakeRAF=null;}
  brickMode=false; if(typeof brickRAF!=='undefined'&&brickRAF){cancelAnimationFrame(brickRAF);brickRAF=null;}
  runnerMode=false; if(typeof runnerRAF!=='undefined'&&runnerRAF){cancelAnimationFrame(runnerRAF);runnerRAF=null;}
  goldWave=1;
  clearSecretTimer();
  endDrag();

  // Force-exit map ẩn 3 nếu đang chơi
  if(fruitMode || fruitRAF){
    fruitMode=false;
    if(fruitRAF){ cancelAnimationFrame(fruitRAF); fruitRAF=null; }
    FCV().classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }

  // Force-exit map ẩn 5 nếu đang chơi
  if(goldMode || goldRAF){
    goldMode=false;
    if(goldRAF){ cancelAnimationFrame(goldRAF); goldRAF=null; }
    GCV().classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }

  // Force-exit map ẩn 4 nếu đang chơi
  if(beeMode || beeRAF){
    beeMode=false;
    if(beeRAF){ cancelAnimationFrame(beeRAF); beeRAF=null; }
    BCV().classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }

  // Force-exit map ẩn 2 nếu đang chơi
  if(dodgeMode || dodgeRAF){
    dodgeMode=false;
    if(dodgeRAF){ cancelAnimationFrame(dodgeRAF); dodgeRAF=null; }
    DCV().classList.remove('active');
    document.getElementById('dodge-controls').classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }

  if(secretMode){
    // Force exit secret mode first
    secretMode=false;
    document.getElementById('secret-grid').classList.remove('active');
    document.getElementById('secret-grid').innerHTML=''; secretCells=null;
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('timer-bar-wrap').classList.remove('active');
    document.getElementById('secret-streak-bar').classList.remove('active');
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('hint-bar').style.display='';
  }

  // Force-exit map ẩn 8 nếu đang chơi
  if(typeof bubbleMode!=='undefined'&&(bubbleMode||bubbleRAF)){
    bubbleMode=false;
    if(typeof bubbleRAF!=='undefined'&&bubbleRAF){cancelAnimationFrame(bubbleRAF);bubbleRAF=null;}
    const bcv=document.getElementById('bubble-canvas'); if(bcv) bcv.classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }
  // Force-exit map ẩn 9 nếu đang chơi
  if(typeof stackMode!=='undefined'&&(stackMode||stackRAF)){
    stackMode=false;
    if(typeof stackRAF!=='undefined'&&stackRAF){cancelAnimationFrame(stackRAF);stackRAF=null;}
    const scv=document.getElementById('stack-canvas'); if(scv) scv.classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }
  // Force-exit map ẩn 10 nếu đang chơi
  if(typeof bossMode!=='undefined'&&(bossMode||bossRAF)){
    bossMode=false;
    if(typeof bossRAF!=='undefined'&&bossRAF){cancelAnimationFrame(bossRAF);bossRAF=null;}
    const boscv=document.getElementById('boss-canvas'); if(boscv) boscv.classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }
  // Force-exit map ẩn 11 nếu đang chơi
  if(typeof catchMode!=='undefined'&&(catchMode||catchRAF)){
    catchMode=false;
    if(typeof catchRAF!=='undefined'&&catchRAF){cancelAnimationFrame(catchRAF);catchRAF=null;}
    const catcv=document.getElementById('catch-canvas'); if(catcv) catcv.classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }
  // Force-exit map ẩn 12 nếu đang chơi
  if(typeof floodMode!=='undefined'&&(floodMode||floodRAF)){
    floodMode=false;
    if(typeof floodRAF!=='undefined'&&floodRAF){cancelAnimationFrame(floodRAF);floodRAF=null;}
    const flcv=document.getElementById('flood-canvas'); if(flcv) flcv.classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }
  // Force-exit map ẩn 13 nếu đang chơi
  if(typeof arenaMode!=='undefined'&&(arenaMode||arenaRAF)){
    arenaMode=false;
    if(typeof arenaRAF!=='undefined'&&arenaRAF){cancelAnimationFrame(arenaRAF);arenaRAF=null;}
    const arcv=document.getElementById('arena-canvas'); if(arcv) arcv.classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }
  // Force-exit map ẩn 14 nếu đang chơi
  if(typeof snakeMode!=='undefined'&&(snakeMode||snakeRAF)){
    snakeMode=false;
    if(typeof snakeRAF!=='undefined'&&snakeRAF){cancelAnimationFrame(snakeRAF);snakeRAF=null;}
    const sncv=document.getElementById('snake-canvas'); if(sncv) sncv.classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }
  // Force-exit map ẩn 15 nếu đang chơi
  if(typeof brickMode!=='undefined'&&(brickMode||brickRAF)){
    brickMode=false;
    if(typeof brickRAF!=='undefined'&&brickRAF){cancelAnimationFrame(brickRAF);brickRAF=null;}
    const brcv=document.getElementById('brick-canvas'); if(brcv) brcv.classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }
  // Force-exit map ẩn 16 nếu đang chơi
  if(typeof runnerMode!=='undefined'&&(runnerMode||runnerRAF)){
    runnerMode=false;
    if(typeof runnerRAF!=='undefined'&&runnerRAF){cancelAnimationFrame(runnerRAF);runnerRAF=null;}
    const rncv=document.getElementById('runner-canvas'); if(rncv) rncv.classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('grid').style.display='';
    document.getElementById('pieces-area').style.display='';
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }

  document.getElementById('game-over-overlay').classList.remove('show');
  document.getElementById('unlock-overlay').classList.remove('show');
  updateScoreUI(); updateComboUI(); updateBurstCount();
  initBoard(); refillPieces(); renderGrid(); renderPieces();
}

document.getElementById('restart-btn').addEventListener('click', ()=>{ sfxClick(); startGame(); });



/* ══════════════════════════════════════════
   AUTH — Đăng nhập / Đăng ký / Admin
══════════════════════════════════════════ */
// Danh sách 20 map ẩn: {key, label, run}
const HIDDEN_MAP_LIST = [
  { key:'secret1', label:'Map ẩn 1 — Đấu màu bí ẩn',        run: enterSecretMode },
  { key:'dodge',   label:'Map ẩn 2 — Rùa né cà rốt',         run: enterDodgeMode },
  { key:'fruit',   label:'Map ẩn 3 — Chém hoa quả',          run: enterFruitMode },
  { key:'bee',     label:'Map ẩn 4 — Bảo vệ chó khỏi ong',   run: enterBeeMode },
  { key:'gold',    label:'Map ẩn 5 — Đào vàng (Gold Miner)', run: enterGoldMode },
  { key:'mole',    label:'Map ẩn 6 — Đập thú (Whack-a-Mole)',run: enterMoleMode },
  { key:'memory',  label:'Map ẩn 7 — Lật thẻ ký ức',         run: enterMemoryMode },
  { key:'bubble',  label:'Map ẩn 8 — Bắn bong bóng',         run: enterBubbleMode },
  { key:'stack',   label:'Map ẩn 9 — Xếp tháp',              run: enterStackMode },
  { key:'boss',    label:'Map ẩn 10 — Đại chiến Boss',       run: enterBossMode },
  { key:'catch',   label:'Map ẩn 11 — Bắt thú',              run: enterCatchMode },
  { key:'flood',   label:'Map ẩn 12 — Tràn màu (Color Flood)',run: enterFloodMode },
  { key:'arena',   label:'Map ẩn 13 — Đấu trường sinh tồn',  run: enterArenaMode },
  { key:'snake',   label:'Map ẩn 14 — Rắn (Snake)',          run: enterSnakeMode },
  { key:'brick',   label:'Map ẩn 15 — Bắn gạch (Brick Breaker)',run: enterBrickMode },
  { key:'runner',  label:'Map ẩn 16 — Chạy vô tận (Runner)', run: enterRunnerMode },
  { key:'space',   label:'Map ẩn 17 — Space Shooter',        run: enterSpaceMode },
  { key:'rhythm',  label:'Map ẩn 18 — Rhythm Tap',           run: enterRhythmMode },
  { key:'maze',    label:'Map ẩn 19 — Mê cung (Maze)',       run: enterMazeMode },
  { key:'mega',    label:'Map ẩn 20 — MEGA BOSS cuối cùng',  run: enterMegaMode },
  { key:'floodpig',label:'Map ẩn 22 — Cẩu cứu heo mùa lũ',   run: () => startMap('floodpig') },
];
let clearedHiddenMaps = new Set(getSavedClearedMaps());

let activeHiddenMapKey = null; // map ẩn đang chơi hiện tại (null = không ở trong map ẩn nào)
function setActiveHiddenMap(key){
  activeHiddenMapKey = key;
  const btn = document.getElementById('hiddenmap-help-btn');
  if(btn) btn.style.display = key ? 'flex' : 'none';
}

let currentUser = null; // { username, role }


// Dọn dẹp TRIỆT ĐỂ mọi map ẩn đang chạy (kể cả các map startGame() gốc bỏ sót:
// Mole, Memory, Space, Rhythm, Maze, Mega) — tránh 2 map chạy song song gây đơ
// khi admin chuyển map liên tục.
function hardResetAllModes(){
  setActiveHiddenMap(null);
  if(typeof resetAllBosses==='function') resetAllBosses(); // dừng boss map 10 & 20 qua bossManager
  const cancel = (raf)=>{ try{ if(raf) cancelAnimationFrame(raf); }catch(e){} };

  cancel(dodgeRAF);  dodgeRAF=null;  dodgeMode=false;
  cancel(fruitRAF);  fruitRAF=null;  fruitMode=false;
  cancel(beeRAF);    beeRAF=null;    beeMode=false;
  cancel(goldRAF);   goldRAF=null;   goldMode=false;
  cancel(moleRAF);   moleRAF=null;   moleMode=false;
  cancel(memoryRAF); memoryRAF=null; memoryMode=false;
  cancel(spaceRAF);  spaceRAF=null;  spaceMode=false;
  cancel(rhythmRAF); rhythmRAF=null; rhythmMode=false;
  cancel(mazeRAF);   mazeRAF=null;   mazeMode=false;
  // (boss map 10 & 20 đã được resetAllBosses() ở đầu hàm xử lý)
  if(typeof bubbleRAF!=='undefined'){ cancel(bubbleRAF); bubbleRAF=null; bubbleMode=false; }
  if(typeof stackRAF!=='undefined'){  cancel(stackRAF);  stackRAF=null;  stackMode=false; }
  if(typeof catchRAF!=='undefined'){  cancel(catchRAF);  catchRAF=null;  catchMode=false; }
  if(typeof floodRAF!=='undefined'){  cancel(floodRAF);  floodRAF=null;  floodMode=false; }
  if(typeof arenaRAF!=='undefined'){  cancel(arenaRAF);  arenaRAF=null;  arenaMode=false; }
  if(typeof snakeRAF!=='undefined'){  cancel(snakeRAF);  snakeRAF=null;  snakeMode=false; }
  if(typeof brickRAF!=='undefined'){  cancel(brickRAF);  brickRAF=null;  brickMode=false; }
  if(typeof runnerRAF!=='undefined'){ cancel(runnerRAF); runnerRAF=null; runnerMode=false; }

  secretMode=false;
  try{ clearSecretTimer(); }catch(e){}
  if(typeof borderSparkInterval!=='undefined' && borderSparkInterval){ clearInterval(borderSparkInterval); borderSparkInterval=null; }
  if(typeof fireInterval!=='undefined' && fireInterval){ clearInterval(fireInterval); fireInterval=null; }
  try{ endDrag(); }catch(e){}

  // Ẩn hết mọi canvas/khung của map ẩn
  ['secret-grid','dodge-canvas','bee-canvas','fruit-canvas','gold-canvas','mole-canvas',
   'memory-canvas','bubble-canvas','stack-canvas','boss-canvas','catch-canvas','flood-canvas',
   'arena-canvas','snake-canvas','brick-canvas','runner-canvas','space-canvas','rhythm-canvas',
   'maze-canvas','mega-canvas'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.remove('active');
  });
  const dc=document.getElementById('dodge-controls');       if(dc)  dc.classList.remove('active');
  const tbw=document.getElementById('timer-bar-wrap');      if(tbw) tbw.classList.remove('active');
  const ssb=document.getElementById('secret-streak-bar');   if(ssb) ssb.classList.remove('active');
  const sg=document.getElementById('secret-grid');          if(sg){ sg.innerHTML=''; }
  secretCells=null;

  // Trả UI chính về trạng thái mặc định
  const grid=document.getElementById('grid');             if(grid)   grid.style.display='';
  const pieces=document.getElementById('pieces-area');    if(pieces) pieces.style.display='';
  const hint=document.getElementById('hint-bar');         if(hint)   hint.style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow',
    'combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5','fire-low','fire-high');
  document.getElementById('mode-badge').textContent=t('badgeNormal');
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('unlock-overlay').classList.remove('show');
  const pauseOverlay=document.getElementById('pause-overlay');
  if(pauseOverlay) pauseOverlay.style.display='none';
  gamePaused=false;

  // Ẩn các lớp HUD riêng của Map ẩn 4 (tim/điểm/đợt/sức chịu) và Map ẩn 1 (tim) — trước đây bị sót lại
  // đè lên các map khác khi chuyển map trực tiếp qua admin panel / menu chọn map ẩn.
  const burstCount=document.getElementById('burst-count'); if(burstCount) burstCount.style.display='';
  ['bee-hearts','bee-scoreUI','bee-waveUI','bee-stamina-label','bee-stamina-wrap','secret-hearts',
   'space-autofire-btn'].forEach(id=>{ // nút Tự bắn của Map 17 trước đây bị sót, lộ sang map khác khi chuyển map trực tiếp
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
}





initAuthScreen();
initGamePanels();
initAccountPanel();

initHelpPanel();
initStartScreen();
initDailyRewardPanel();
initLeaderboardPanel();
// Chọn đúng nhạc nền theo map đang chơi — dùng khi bật lại âm thanh hoặc thoát tạm dừng
function resumeContextBgm(){
  if(rhythmMode){ startRhythmBgm(); return; }
  stopRhythmBgm();
  if(secretMode) startBgm('mystery');
  else if(dodgeMode||spaceMode||mazeMode) startBgm('space');
  else if(fruitMode||beeMode||moleMode||bossMode||arenaMode||snakeMode||runnerMode||megaMode) startBgm('action');
  else startBgm('main');
}
document.getElementById('mute-btn').addEventListener('click',function(){
  sfxMuted=!sfxMuted;
  this.textContent=sfxMuted?'🔇':'🔊';
  if(sfxMuted){ stopBgm(); stopRhythmBgm(); }
  else { sfxPlacePiece(); resumeContextBgm(); }
});
document.getElementById('pause-btn').addEventListener('click', togglePause);
document.getElementById('resume-btn').addEventListener('click', togglePause);
startGame();
// Show persisted best score immediately after startGame (which resets score but not best)
document.getElementById('best-box').textContent=t('bestLabel', best.toLocaleString());

/* ══ MAP ẨN 14 — SNAKE ══ */

/* ══ MAP ẨN 15 — BRICK BREAKER ══ */

/* ══ MAP ẨN 16 — INFINITE RUNNER ══ */

/* ═══════════════════════════════════════════════════════
   MAP 17 — SPACE SHOOTER 🚀
═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   MAP 18 — RHYTHM TAP 🎵
═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   MAP 19 — MAZE RUNNER 🌀
═══════════════════════════════════════════════════════ */
