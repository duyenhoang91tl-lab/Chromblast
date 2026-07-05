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
function makePiece(){
  // Càng qua nhiều vòng map ẩn, khối càng thiên về hình to/khó xếp
  // (mặc định ~55% khối lớn giống tỉ lệ cũ, mỗi vòng +3%, tối đa 90%)
  const hardP=Math.min(0.9, 0.55+mainHardTier*0.03);
  const wantHard=Math.random()<hardP;
  const pool=SHAPES.filter(s=> wantHard ? s.length>=4 : s.length<=3);
  const shape=pool.length?pool[rnd(pool.length)]:SHAPES[rnd(SHAPES.length)];
  return {shape, color:rndColor(), used:false};
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
  showHint('🔄 Đã xoay!');
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

// Hình học lưới theo toạ độ viewport (đọc trực tiếp để đúng cả khi cuộn/zoom)
function gridGeom(){
  const a=getCell(0,0).getBoundingClientRect();
  const b=getCell(0,1).getBoundingClientRect();
  const c=getCell(1,0).getBoundingClientRect();
  return { x0:a.left, y0:a.top, cell:a.width,
           stepX:(b.left-a.left)||a.width, stepY:(c.top-a.top)||a.height };
}

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
  ghostEl.style.gridTemplateColumns=`repeat(${maxC+1},44px)`;
  ghostEl.innerHTML='';
  const cells=Array((maxR+1)*(maxC+1)).fill(null);
  piece.shape.forEach(([r,c])=>cells[r*(maxC+1)+c]=piece.color);
  cells.forEach(color=>{
    const d=document.createElement('div');
    d.className='g-cell';
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
    showHint('🕸️ Khối này đang bị tơ nhện khóa — còn '+spiderWebbedLeft+' bước nữa!');
    try{ sfxPenalty(); }catch(err){}
    return;
  }
  e.preventDefault();
  const isTouch=(e.pointerType==='touch'||e.pointerType==='pen');
  drag.active=true; drag.moved=false;
  drag.sx=e.clientX; drag.sy=e.clientY;
  drag.pointerType=e.pointerType||'mouse';
  drag.wasSelected=(selected===idx);
  selected=idx;
  rotateLocked=false;
  if(!drag.wasSelected) sfxSelect();
  // Touch: chọn ngay + ghost hiện ngay (không cần giữ/kéo)
  hoverMode=isTouch;
  highlightSlot(idx);
  showRotateBar(true);
  showGhost(piece);
  moveGhost(e.clientX,e.clientY);
  updatePreview(e.clientX,e.clientY);
}

function onDocPointerMove(e){
  if(selected===null) return;
  if(!drag.active && !hoverMode) return;
  if(drag.active && !drag.moved && Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy)>6) drag.moved=true;
  lastMouseX=e.clientX; lastMouseY=e.clientY;
  moveGhost(e.clientX,e.clientY);
  updatePreview(e.clientX,e.clientY);
}

function onDocPointerUp(e){
  if(!drag.active) return;
  drag.active=false;
  if(selected===null) return;
  const piece=pieces[selected];

  if(!drag.moved){
    // Chạm không kéo: nếu touch thì ghost đã hiện (hoverMode=true), giữ nguyên
    if(drag.wasSelected && !(drag.pointerType==='touch'||drag.pointerType==='pen')) endDrag();
    else if(!(drag.pointerType==='touch'||drag.pointerType==='pen')){
      hoverMode=true; moveGhost(e.clientX,e.clientY); updatePreview(e.clientX,e.clientY);
    }
    return;
  }
  // Kéo thật → thả nếu đáp vào chỗ hợp lệ, ngược lại huỷ
  const o=originFromPointer(e.clientX,e.clientY,piece);
  if(o && canPlace(piece,o.R,o.C)) placeAt(o.R,o.C);
  else { sfxInvalid(); endDrag(); }
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
  showHint('✅ Đã khoá xoay — kéo khối vào bàn để đặt!');
});

// Tap trên nền lưới (không phải ô cụ thể) khi đang giữ khối → xoay
// (bỏ qua nếu đã bấm ✓ khoá xoay, để không cản trở thao tác kéo-thả)
document.getElementById('grid').addEventListener('pointerdown', e=>{
  if(e.target.classList.contains('cell')) return;
  if(selected!==null && !secretMode && !rotateLocked){ e.stopPropagation(); rotatePiece(selected); }
});

function showRotateBar(show){
  // visibility (không phải display) — thanh luôn giữ chỗ, hiện/ẩn không làm layout nhảy
  const bar=document.getElementById('rotate-bar');
  bar.style.visibility = show ? 'visible' : 'hidden';
  bar.style.pointerEvents = show ? 'auto' : 'none';
}
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
  if(!canPlace(piece,R,C)){ sfxInvalid(); showHint('❌ Không đặt được ở đây!'); return; }
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
  showPraise(consecutiveBursts);
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
        showComboFlash(0,false,'✂️ Gỡ bom thành công! +'+bTh+'đ');
      }
      // 🥚 nổ ô kề trứng rồng → nứt vỏ; vỡ hẳn thì thưởng điểm
      if(dragonEgg && !eggHitThisWave && Math.abs(dragonEgg.r-r)<=1 && Math.abs(dragonEgg.c-c)<=1 && !(dragonEgg.r===r&&dragonEgg.c===c)){
        eggHitThisWave=true;
        dragonEgg.shell--;
        if(dragonEgg.shell<=0){
          dragonEgg=null; eggRespawn=12;
          const eTh=MCFG('egg','thuong');
          score+=eTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,'🍳 Đập vỡ trứng rồng! +'+eTh+'đ');
        } else {
          showHint('🥚 Vỏ trứng đã nứt — nổ kề bên thêm 1 lần nữa!');
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
          showComboFlash(0,false,'🕷️ Diệt nhện! +'+sTh+'đ');
          renderPieces();
        } else {
          showHint('🕷️ Trúng nhện! HP còn '+spider.hp+'/'+MCFG('spider','hp'));
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
          showComboFlash(0,false,'🕳️ Phong ấn hố đen! +'+hTh+'đ');
        } else {
          showHint('🕳️ Phong ấn '+blackHole.seals+'/'+BH_SEALS);
        }
      }
      // 👻 nổ trúng ô ma nhập → trừ tà
      if(ghostCell && ghostCell.r===r && ghostCell.c===c){
        ghostCell=null; ghostRespawn=12;
        const gTh=MCFG('ghost','thuong');
        score+=gTh; if(score>best) best=score; updateScoreUI();
        showComboFlash(0,false,'👻 Trừ tà thành công! +'+gTh+'đ');
      }
      // 🐌 nổ kề ốc sên → tích đòn
      if(snail && !snailHitWave && Math.abs(snail.r-r)<=1 && Math.abs(snail.c-c)<=1 && !(snail.r===r&&snail.c===c)){
        snailHitWave=true;
        snail.hits++;
        if(snail.hits>=SNAIL_HITS){
          snail=null; snailRespawn=18;
          const oTh=MCFG('snail','thuong');
          score+=oTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,'🐌 Diệt ốc sên! +'+oTh+'đ');
        } else {
          showHint('🐌 Trúng ốc sên '+snail.hits+'/'+SNAIL_HITS);
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
          showComboFlash(0,false,'🐍 Hạ rắn thần! +'+rTh+'đ');
        } else {
          showHint('🐍 Trúng rắn thần! HP còn '+snakeSpirit.hp+'/'+MCFG('snakeSpirit','hp'));
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
            showComboFlash(0,false,'🌀 Đóng cổng dịch chuyển! +'+pTh+'đ');
          } else {
            showHint('🌀 Đóng cổng '+portalHits+'/'+PORTAL_SEALS);
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
          showComboFlash(0,false,'👑 HẠ GỤC VUA RỒNG! +'+kTh+'đ');
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
              showComboFlash(0,false,'⛰️ Núi bị san phẳng!');
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
          showComboFlash(0,false,'🎉 Hạ gục sóc trộm — các ô bị gặm phục hồi! +'+bTh+'đ');
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
    document.getElementById('go-score').textContent='Điểm của bạn: '+score.toLocaleString();
    document.getElementById('game-over-overlay').classList.add('show');
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
    g.style.cssText=`display:grid;grid-template-columns:repeat(${maxC+1},14px);gap:2px;`;
    const cells=Array((maxR+1)*(maxC+1)).fill(null);
    piece.shape.forEach(([r,c])=>cells[r*(maxC+1)+c]=piece.color);
    cells.forEach(color=>{
      const d=document.createElement('div');
      d.className='p-cell';
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
