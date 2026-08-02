// ═══════════════════════════════════════════════════════════════
// js/versus-ai.js — AI cho "Cùng máy" (đấu 1-1 VỚI MÁY, không phải
// 2 người ngồi chung thiết bị). Chỉ chạy khi !_vs.online — điều
// khiển toàn bộ P.idx===1 (bàn trên): tự chọn khối/xoay/đặt, tự rút
// thẻ kỹ năng khi đủ điều kiện và ném vào bàn người chơi.
// Người chơi KHÔNG chạm được vào bàn/khay của máy — chặn ở
// _vsPieceTap/_vsBeginDrag (versus-ui.js) qua _vsAiControls().
// Nạp SAU versus.js và versus-ui.js.
// ═══════════════════════════════════════════════════════════════

const VS_AI_MOVE_DELAY = [1300, 2600];   // ms giữa các lần máy đặt khối (đã tăng độ trễ)
const VS_AI_CARD_DELAY = [900, 1800];    // ms trước khi máy chọn thẻ (đã tăng độ trễ)

let _vsAiTimer = null;

function _vsAiActive(){
  return !!(versusMode && _vs && !_vs.online);
}

// Dùng ở versus-ui.js để chặn người chơi chạm vào bàn/khay của máy.
function _vsAiControls(P){
  return _vsAiActive() && P && P.idx === 1;
}

function _vsAiStart(){
  _vsAiStop();
  _vsAiScheduleNext();
}

function _vsAiStop(){
  if(_vsAiTimer) clearTimeout(_vsAiTimer);
  _vsAiTimer = null;
}

function _vsAiScheduleNext(){
  if(!_vsAiActive()) return;
  const P = _vs.players[1];
  if(!P || P.done) return;
  const showingCards = !!(P.el && P.el.cards && P.el.cards.classList.contains('show'));
  const range = showingCards ? VS_AI_CARD_DELAY : VS_AI_MOVE_DELAY;
  const wait = range[0] + Math.random() * (range[1] - range[0]);
  _vsAiTimer = setTimeout(_vsAiStep, wait);
}

function _vsAiStep(){
  if(!_vsAiActive()){ _vsAiStop(); return; }
  const P = _vs.players[1];
  if(!P || P.done) return;
  if(P.el && P.el.cards && P.el.cards.classList.contains('show')){
    _vsAiUseCard(P);
  } else {
    _vsAiPlaceBest(P);
  }
  _vsAiScheduleNext();
}

// Chọn ngẫu nhiên 1 trong 3 thẻ đang mở — bấm y hệt người chơi bấm,
// dùng lại đúng listener đã gắn ở _vsOfferCards (không lặp code).
function _vsAiUseCard(P){
  const row = P.el.cards.querySelector('.vs-cards-row');
  if(!row) return;
  const btns = row.querySelectorAll('.vs-card');
  if(!btns.length) return;
  const pick = btns[Math.floor(Math.random() * btns.length)];
  pick.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true }));
}

// ── Chọn nước đặt tốt nhất: duyệt khối chưa dùng × 4 hướng xoay × mọi ô ──

function _vsAiPlaceBest(P){
  if(!versusMode || P.done) return;
  let best = null;
  for(let i=0;i<P.pieces.length;i++){
    const pc = P.pieces[i];
    if(pc.used) continue;
    let shape = pc.shape;
    for(let rot=0; rot<4; rot++){
      for(let r=0;r<VS_N;r++){
        for(let c=0;c<VS_N;c++){
          if(_vsCanPlace(P, shape, r, c)){
            const score = _vsAiScorePlacement(P, shape, pc.color, r, c);
            if(!best || score > best.score) best = { i, shape, r, c, score };
          }
        }
      }
      shape = _rotShape(shape);
    }
  }
  if(!best){
    // Máy hết nước đi — xử lý giống hệt khi người chơi hết chỗ đặt.
    if(!P.done){
      P.done = true;
      if(P.el && P.el.note){ P.el.note.textContent = t('vsNoSpace'); P.el.note.classList.add('show'); }
      if(_vs.players.every(q=>q.done)) _vsEndMatch();
    }
    return;
  }
  P.pieces[best.i].shape = best.shape;
  P.selected = best.i;
  _vsPlaceAt(P, best.r, best.c);
}

// Mô phỏng đặt + nổ trên BẢN SAO bàn (không đụng state thật) để chấm điểm.
function _vsAiSimulate(P, shape, color, R, C){
  const N = VS_N;
  const board = P.board.map(row => row.slice());
  shape.forEach(([dr,dc]) => { board[R+dr][C+dc] = color; });
  const kill = new Set();
  for(let r=0;r<N;r++){ let full=true; for(let c=0;c<N;c++) if(!board[r][c]){ full=false; break; } if(full) for(let c=0;c<N;c++) kill.add(r+','+c); }
  for(let c=0;c<N;c++){ let full=true; for(let r=0;r<N;r++) if(!board[r][c]){ full=false; break; } if(full) for(let r=0;r<N;r++) kill.add(r+','+c); }
  const seen = new Set();
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const k = r+','+c;
    if(seen.has(k) || !board[r][c] || P.ice.has(k)) continue;
    const col = board[r][c], group = [], st = [[r,c]];
    while(st.length){
      const [rr,cc] = st.pop(), kk = rr+','+cc;
      if(seen.has(kk)) continue;
      if(rr<0||rr>=N||cc<0||cc>=N) continue;
      if(board[rr] && board[rr][cc]===col && !P.ice.has(kk)){
        seen.add(kk); group.push(kk);
        st.push([rr+1,cc],[rr-1,cc],[rr,cc+1],[rr,cc-1]);
      }
    }
    if(group.length >= VS_GROUP_MIN) group.forEach(kk => kill.add(kk));
  }
  kill.forEach(k => {
    const [r,c] = k.split(',').map(Number);
    // Đồng bộ với luật thật ở _vsResolveClears: băng bảo vệ ô màu ở lần dọn đầu
    // tiên (chỉ gỡ băng), nên máy không được coi ô đó là "đã dọn sạch" khi ước
    // lượng số ô còn lại — tránh máy đánh giá sai độ đầy bàn của chính nó.
    if(P.ice.has(k)) return;
    board[r][c] = null;
  });
  let filled = 0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++) if(board[r][c]) filled++;
  return { clearedCount: kill.size, filled };
}

// Đếm "lỗ chết" — ô trống bị vây kín cả 4 hướng (khó/không thể lấp
// sau này) → điểm trừ, giúp máy tránh bí bàn sớm.
function _vsAiHoles(P, shape, R, C){
  const N = VS_N;
  const board = P.board.map(row => row.slice());
  shape.forEach(([dr,dc]) => { board[R+dr][C+dc] = 1; });
  let bad = 0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    if(board[r][c]) continue;
    let blocked = 0;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
      const rr=r+dr, cc=c+dc;
      if(rr<0||rr>=N||cc<0||cc>=N||board[rr][cc]) blocked++;
    });
    if(blocked===4) bad++;
  }
  return bad;
}

function _vsAiScorePlacement(P, shape, color, R, C){
  const sim = _vsAiSimulate(P, shape, color, R, C);
  const holes = _vsAiHoles(P, shape, R, C);
  // Ưu tiên nổ nhiều, né tạo lỗ kín, giữ bàn thoáng; thêm chút nhiễu
  // ngẫu nhiên để máy không chơi máy móc y hệt mỗi ván (vẫn có thể thắng).
  return sim.clearedCount * 120 - sim.filled * 1 - holes * 10 + Math.random() * 4;
}
