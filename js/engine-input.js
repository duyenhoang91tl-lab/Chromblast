// ═══════════════════════════════════════════════════════════════
// js/engine-input.js — Kéo-thả/chạm chọn/ghost/preview cho bàn cờ chính,
// tách từ engine.js. Dùng chung global scope với engine.js (nạp NGAY SAU).
// ═══════════════════════════════════════════════════════════════

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

let _dragBox=null, _dragBoxPiece=null; // cache hình học khối đang kéo

function invalidateDragBox(){ _dragBox=null; _dragBoxPiece=null; }

function invalidateGridGeom(){ _gridGeomCache=null; invalidateDragBox(); }

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

// Cache hình học khối đang kéo — tránh pieceBox() 2 lần/khung (moveGhost + updatePreview).

function activePieceBox(piece){
  if(_dragBox && _dragBoxPiece===piece && _gridGeomCache) return _dragBox;
  _dragBoxPiece=piece;
  return (_dragBox=pieceBox(piece));
}

// Quy đổi vị trí con trỏ → ô gốc (góc trên-trái khung bao của khối).

function originFromPointer(x,y,piece,forceType){
  const {g,bbW,bbH,maxR,maxC}=activePieceBox(piece);
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
    d.className='g-cell'+(color?' sweet':'');
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
  invalidateDragBox();
  _previewKey='';
  buildGhost(piece);
  ghostEl.classList.add('active');
  document.body.classList.add('is-dragging');
}

function hideGhost(){
  ghostEl.classList.remove('active');
  ghostEl.innerHTML='';
  ghostEl.style.transform='';
  invalidateDragBox();
  _previewKey='';
  document.body.classList.remove('is-dragging');
}

function moveGhost(x,y){
  if(selected===null) return;
  const {bbH}=activePieceBox(pieces[selected]);
  const [ax,ay]=ghostAnchor(x,y,bbH);
  // transform (compositor) thay vì left/top (layout) → kéo mượt hơn rõ trên mobile
  ghostEl.style.transform='translate3d('+ax+'px,'+ay+'px,0) translate(-50%,-50%)';
}

let previewedCells = []; // ô đang được tô preview — tránh phải quét lại toàn bộ DOM mỗi lần di chuột

let _previewKey='';      // cache key origin+valid — bỏ rewrite DOM khi ngón tay vẫn trong cùng ô

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
  _previewKey='';
}

// Làm mờ các ô khối sẽ đáp xuống. Vị trí KHÔNG đặt được → giữ nguyên mọi ô, không đụng tới.

function updatePreview(x,y){
  if(selected===null){ clearPreview(); return; }
  const piece=pieces[selected];
  if(!piece||piece.used){ clearPreview(); return; }
  const o=originFromPointer(x,y,piece);
  const ok=!!(o && canPlace(piece,o.R,o.C));
  const key=ok ? (selected+':'+o.R+','+o.C) : '';
  if(key===_previewKey) return; // cùng ô đích — chỉ cần moveGhost, không đụng DOM preview
  clearPreview();
  if(!ok) return;
  _previewKey=key;
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
  const placePts=piece.shape.length;
  score+=placePts; if(score>best) best=score; updateScoreUI();
  try{
    if(typeof showScorePop==='function' && typeof clearCentroid==='function'){
      const ctr=clearCentroid(_mirrorPlacedCells, getCell);
      showScorePop(placePts, placePts, ctr.x, ctr.y, 1);
    }
  }catch(e){}
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
