// ═══════════════════════════════════════════════════════════════
// js/versus.js — ĐẤU 1-1 SONG SONG (Cùng máy = đấu AI, luôn mở; Online từ Level 3)
// Hai bàn cờ 7×7 trên cùng màn hình, cùng chiều (bàn của máy/đối thủ bên trái,
// bàn của mình bên phải). Cùng chuỗi khối từ CÙNG hạt giống (PRNG riêng mỗi
// người → công bằng tuyệt đối dù tốc độ đặt khác nhau).
// Xoay/đặt giống map thường: chạm chọn · chạm lại xoay · kéo ghost + ô mờ · thả đặt.
// Nổ khi lấp đầy 1 hàng/cột, hoặc cụm cùng màu >= VS_GROUP_MIN (8) ô nối liền.
// Cứ 3 lần ăn (không cần liên tiếp) → rút thẻ chướng ngại lên bàn ĐỐI THỦ.
// ⛰️ núi đá · 🌪️ lốc xoáy · 🧊 băng giá · 🌫️ sương mù · 🐿️ sóc ăn ô · 💣 bom.
// Tự chứa 100%: không đụng board/pieces/score của bàn chính.
// GHI CHÚ ONLINE: đồng bộ {seed, nước đi, thẻ} qua server là đấu được 2 máy.
// Nạp SAU main.js. ═══════════════════════════════════════════════

const VERSUS_TIME = 90;        // giây mỗi trận

const VERSUS_MIN_LEVEL = 3;    // cấp (XP) tối thiểu để mở phòng online

const VERSUS_WIN_XP = 30;

const VS_N = 7;                // bàn 7×7

// Chế độ hiển thị "ưu tiên bàn của tôi" — áp dụng cho cả Cùng máy lẫn Online, cả
// dọc lẫn ngang màn hình. Mặc định 2 bàn bằng nhau; nếu bật thì bàn của mình to
// hơn (ngang: 3/4, dọc: 2/3), bàn kia nhỏ lại tương ứng. Bật/tắt riêng từng máy
// qua nút 📐 trong trận (versus-ui.js), không cần đồng bộ với đối thủ.
const VS_LAYOUT_KEY = 'vs_layout_boost';
function _vsGetLayoutBoost(){
  try{ return localStorage.getItem(VS_LAYOUT_KEY) === '1'; }catch(e){ return false; }
}
function _vsSetLayoutBoost(v){
  try{ localStorage.setItem(VS_LAYOUT_KEY, v ? '1' : '0'); }catch(e){}
}

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
  { id:'blackhole',nameIdx:12, emoji:'🕳️' },
  { id:'wall',     nameIdx:15, emoji:'🧱' },
  { id:'lightning',nameIdx:16, emoji:'⚡' },
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

/** Nút ⚔️ luôn mở — "Cùng máy" (đấu với AI) không giới hạn cấp. Chỉ "Online" cần Lv.3 (xem canHostVersus). */

function refreshVersusButton(){
  const btn=document.getElementById('versus-btn');
  if(btn){
    btn.classList.add('vs-unlocked');
    btn.style.display = 'flex';
    btn.setAttribute('aria-hidden', 'false');
    btn.title = (typeof t==='function' ? t('ttVersus') : 'Đấu 1-1');
  }
  const setBtn=document.getElementById('set-btn-versus');
  if(setBtn) setBtn.style.display = '';
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

// ── Nền (board skin) + Gạch (brick skin) RIÊNG cho mỗi người khi đấu CÙNG MÁY ──
// Chế độ online đã đồng bộ qua room (hostBoardSkin/guestBoardSkin — xem online-services.js).
// Còn "Cùng máy" (2 người ngồi đối diện, xoay 180°) trước đây cả 2 nửa đều dùng
// chung skin đang equip của TÀI KHOẢN — Người chơi 2 không có cách chọn khác.
// Bổ sung: mỗi người tự chọn nền/gạch riêng (chỉ trong số đã sở hữu), lưu theo
// từng ô (P1/P2) qua localStorage, độc lập với skin solo đang active.

function startVersusMatch(){
  try{ if(typeof unlockOrientation==='function') unlockOrientation(); }catch(e){}
  const n1=(document.getElementById('vs-name1').value.trim()||(typeof getPlayerNickname==='function'?getPlayerNickname():'')||t('vsP1'));
  const n2=t('vsP2');
  const boostChk = document.getElementById('vs-layout-boost');
  const layoutBoost = !!(boostChk && boostChk.checked);
  _vsSetLayoutBoost(layoutBoost);
  _vsHide('versus-setup-panel');
  if(typeof hardResetAllModes==='function') hardResetAllModes();
  try{
    if(typeof caroMode !== 'undefined' && caroMode && typeof _caroQuit === 'function') _caroQuit();
    else {
      const st=document.getElementById('caro-stage');
      if(st){ st.classList.remove('active'); st.style.display='none'; }
    }
  }catch(e){}
  const seed=(Date.now() ^ (Math.random()*0xFFFFFFF))>>>0;
  const avMe = (typeof getPlayerAvatar === 'function') ? getPlayerAvatar() : '🐶';
  _vs={ seed, names:[n1,n2], avatars:[avMe, '🤖'], timeLeft:VERSUS_TIME, timer:null,
        localSkins:_vsGetLocalSkinPrefs(1), layoutBoost,
        players:[_vsNewPlayer(0,seed), _vsNewPlayer(1,seed)] };
  versusMode=true;
  try{ if(typeof logGameEvent==='function') logGameEvent('versus_match_start', { mode:'ai', board_boost:layoutBoost }); }catch(e){}
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
    try{ if(typeof _vsAiStart==='function') _vsAiStart(); }catch(e){}
    try{ startBgm('action'); }catch(e){}
  },800);
}

function _vsNewPlayer(idx,seed){
  return { idx, prng:_mulberry32(seed), board:Array.from({length:VS_N},()=>Array(VS_N).fill(null)),
    pieces:[], selected:-1, score:0, combo:0, clears:0, nextCardAt:VS_CARD_EVERY,
    rocks:new Set(), ice:new Set(), bomb:null, fogUntil:0, done:false, el:{} };
}

// Nút trợ giúp ❓ nổi (z-index cao hơn đấu trường) đè lên điểm người chơi trên
// thanh HUD chung → ẩn đi trong suốt trận đấu, trả lại khi trận kết thúc.

function _vsAbort(){
  if(_vs && _vs.timer) clearInterval(_vs.timer);
  try{ if(typeof _vsAiStop==='function') _vsAiStop(); }catch(e){}
  // Thoát trận online giữa chừng → mặc định xử thua ngay cho mình (đối thủ mặc định
  // thắng), báo thẳng lên Firestore không so điểm — giống lúc 1 ván kết thúc bình
  // thường. Không xoá/định lại phòng nữa (forfeitOnlineMatch đã đưa phòng về trạng
  // thái 'finished' với kết quả đã ghi, giữ nguyên như vậy).
  try{
    if(_vs && _vs.online && _vs.online.roomId && typeof forfeitOnlineMatch === 'function'){
      forfeitOnlineMatch(_vs.online.roomId, !!_vs.online.isHost).catch(()=>{});
    }
    if(_vs && _vs.online && typeof stopListeningRoom === 'function') stopListeningRoom();
    else if(typeof stopListeningChat === 'function') stopListeningChat();
  }catch(e){}
  try{ window.removeEventListener('resize', _vsPositionChatFab); }catch(e){}
  const a=document.getElementById('versus-arena'); if(a) a.remove();
  _vsToggleGlobalUI(false);
  versusMode=false; _vs=null;
  try{ if(typeof setExclusivePlayMode === 'function') setExclusivePlayMode(null); }catch(e){}
  try{ startBgm('main'); }catch(e){}
}

/** Đối thủ rời trận online giữa chừng (bấm Thoát/đóng tab/mất kết nối) — huỷ trận NGAY
 * cho người còn lại thay vì bắt họ chơi tới hết giờ. Tự báo hộ thua cho đối thủ ở đây
 * (mình mặc định thắng) phòng trường hợp họ đóng tab đột ngột không kịp tự báo —
 * forfeitOnlineMatch an toàn khi gọi 2 lần nhờ kiểm tra status đã 'finished' chưa. */
function _vsHandleOpponentLeft(){
  if(!_vs || !_vs.online) return;
  try{
    if(_vs.online.roomId && typeof forfeitOnlineMatch === 'function'){
      forfeitOnlineMatch(_vs.online.roomId, !_vs.online.isHost).catch(()=>{});
    }
  }catch(e){}
  try{ showHint((typeof t==='function'?t('vsOpponentLeft'):null) || 'Đối thủ đã rời trận', { hold: 2600 }); }catch(e){}
  _vsAbort();
  try{ if(typeof openVersusSetup === 'function') openVersusSetup(); }catch(e){}
}

// ── Render ──

function _vsCanPlace(P,shape,R,C){
  return shape.every(([dr,dc])=>{
    const r=R+dr,c=C+dc;
    if(r<0||r>=VS_N||c<0||c>=VS_N) return false;
    if(P.board[r][c]) return false;
    if(P.rocks.has(r+','+c)) return false;
    return true;
  });
}

function _vsPlaceAt(P,R,C,fromNetwork){
  if(!versusMode||P.done||P.selected<0) return;
  if(P.el.cards.classList.contains('show')) return;
  const pc=P.pieces[P.selected];
  if(!pc||pc.used) return;
  // Nước đi TỪ MẠNG đã được máy người gửi xác thực hợp lệ rồi — không kiểm
  // tra lại _vsCanPlace ở đây nữa. Trước đây nếu bàn mô phỏng đối thủ trên
  // máy mình lệch dù chỉ 1 ô (đá/băng hết hạn không đúng lúc, độ trễ mạng…),
  // nước đi bị âm thầm huỷ bỏ và mọi nước đi sau đó của đối thủ cũng hỏng
  // theo — người chơi không bao giờ thấy đối thủ đánh gì nữa. Giờ luôn áp
  // dụng nước đi từ mạng, đồng thời dọn sạch mọi thứ đang chặn ô đó (đá/băng
  // lệch cục bộ) để bàn tự đồng bộ lại đúng theo dữ liệu đã xác thực.
  if(!fromNetwork){
    if(!_vsCanPlace(P,pc.shape,R,C)){ try{ sfxInvalid(); }catch(e){} return; }
  }
  const pieceIndex=P.selected;
  const shapeSnap=pc.shape.map(([r,c])=>[r,c]);
  pc.shape.forEach(([dr,dc])=>{
    const rr=R+dr, cc=C+dc;
    if(rr<0||rr>=VS_N||cc<0||cc>=VS_N) return;
    if(fromNetwork){ const kk=rr+','+cc; P.rocks.delete(kk); P.ice.delete(kk); }
    P.board[rr][cc]=pc.color;
  });
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
  if(!fromNetwork && _vs && _vs.online && P.idx===0){
    _vsBroadcastMove('place', { pieceIndex, R, C, shape: shapeSnap });
  }
  if(_vsMarkDoneIfStuck(P)) return;
}


// Kiểm tra P còn nước đi không, đồng bộ P.done + note theo đúng trạng thái
// HIỆN TẠI (thay vì chỉ set done=true 1 lần rồi bỏ quên) — sửa lỗi: trước đó
// hết chỗ (done=true) rồi trúng lốc xoáy/chướng ngại dọn trống bàn ra, có ô
// đặt được rồi nhưng vẫn không đặt được vì done chưa bao giờ được reset lại.
// Đồng thời: nếu P hết chỗ mà đối thủ đã vượt điểm (không còn cửa gỡ vì P
// không thể ăn thêm điểm nữa) → xử thua, kết thúc trận luôn thay vì chờ hết giờ.
function _vsMarkDoneIfStuck(P){
  if(!_vs) return false;
  if(_vsAnyMove(P)){
    if(P.done){ P.done=false; if(P.el&&P.el.note) P.el.note.classList.remove('show'); }
    return false;
  }
  if(P.done) return false;
  P.done=true;
  if(P.el&&P.el.note){ P.el.note.textContent=t('vsNoSpace'); P.el.note.classList.add('show'); }
  const foe=_vs.players[1-P.idx];
  if(_vs.players.every(q=>q.done) || (foe&&foe.score>P.score)){ _vsEndMatch(); return true; }
  return false;
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
// chỉ vỡ khi nằm trong hàng/cột nổ — và ngay cả khi đó, lần đầu chỉ GỠ BĂNG
// (giữ nguyên ô màu), phải đầy hàng/cột thêm 1 lần nữa (lúc đó hết băng) mới
// thật sự mất ô — xem chi tiết trong kill.forEach bên dưới.
// Đá chặn hàng/cột (hàng có đá không đầy được màu) → đá tự biến mất sau 12 giây.

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
    // 🧊 Lớp băng bảo vệ: lần dọn đầu tiên chỉ gỡ băng, GIỮ nguyên ô màu bên dưới —
    // đúng quy luật "phá lớp bảo vệ trước rồi mới phá được ô" (như dây gai ở map
    // thường: 1 lần nổ chỉ gỡ gai, phải nổ thêm lần nữa mới mất ô). Trước đây băng
    // và ô màu bị xoá cùng lúc trong 1 lần đầy hàng/cột — không đúng luật bảo vệ.
    if(P.ice.has(k)){ P.ice.delete(k); return; }
    P.board[r][c]=null; P.rocks.delete(k);
  });
  return kill.size;
}

// ── Thẻ chướng ngại — ÚP trước (đối thủ ngồi đối diện không được đọc được).

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
    // 💣 "Bom HẸN GIỜ": phải THẤY được quả bom + có thời gian đếm ngược trước khi
    // nổ (giống map thường), không phải nổ câm ngay lập tức không dấu hiệu gì.
    const cr=1+Math.floor(Math.random()*(VS_N-2)), cc=1+Math.floor(Math.random()*(VS_N-2));
    F.bomb={r:cr,c:cc,left:3};
    const tick=()=>{
      if(!F.bomb||!_vs||!versusMode) return;
      F.bomb.left--;
      if(F.bomb.left<=0){ _vsBombExplode(F); return; }
      _vsRenderGrid(F);
      setTimeout(tick,1000);
    };
    setTimeout(tick,1000);
  } else if(ob.id==='blackhole'){
    // 🕳️ Hố đen: hút mất 2 ô đã lấp (mất luôn, không dịch chuyển như lốc xoáy)
    // rồi biến chính 2 ô đó thành đá chắn tạm 8s — nặng hơn núi đá/sóc lẻ.
    const sucked = take(filledCells,2);
    sucked.forEach(k=>{ const [r,c]=k.split(',').map(Number); F.board[r][c]=null; F.ice.delete(k); F.rocks.add(k); });
    setTimeout(()=>{
      if(_vs&&versusMode){ sucked.forEach(k=>F.rocks.delete(k)); _vsRenderGrid(F); }
    },8000);
  } else if(ob.id==='wall'){
    // 🧱 Tường gạch: chắn NGUYÊN 1 hàng hoặc 1 cột liền mạch (khác núi đá rải rác) — 10s.
    const horizontal = Math.random()<0.5;
    const line = horizontal ? Math.floor(Math.random()*VS_N) : -1;
    const col  = horizontal ? -1 : Math.floor(Math.random()*VS_N);
    const wallCells=[];
    for(let i=0;i<VS_N;i++){
      const r = horizontal ? line : i;
      const c = horizontal ? i : col;
      const k=r+','+c;
      if(F.rocks.has(k)) continue;
      wallCells.push(k); F.rocks.add(k);
    }
    setTimeout(()=>{
      if(_vs&&versusMode){ wallCells.forEach(k=>F.rocks.delete(k)); _vsRenderGrid(F); }
    },10000);
  } else if(ob.id==='lightning'){
    // ⚡ Sét đánh: xoá sạch NGAY 1 cụm 2×2 ô đã lấp — mất điểm tiềm năng, không như
    // lốc xoáy (dịch chuyển chỗ khác) hay sóc (chỉ lấy lẻ tẻ 1 ô).
    const anchors = filledCells.filter(k=>{
      const [r,c]=k.split(',').map(Number);
      return r<VS_N-1 && c<VS_N-1;
    });
    if(anchors.length){
      const [r0,c0] = anchors[Math.floor(Math.random()*anchors.length)].split(',').map(Number);
      for(let dr=0;dr<2;dr++)for(let dc=0;dc<2;dc++){
        const r=r0+dr, c=c0+dc, k=r+','+c;
        F.board[r][c]=null; F.ice.delete(k);
      }
    }
  }
  // báo cho nạn nhân — chỉ rung màn, KHÔNG hiện chữ thông báo (gây rối/che bàn cờ
  // lúc đang thao tác); rung là đủ để người chơi biết vừa bị đối thủ đánh úp.
  F.el.half.classList.add('vs-shake');
  setTimeout(()=>F.el.half.classList.remove('vs-shake'),500);
  _vsRenderGrid(F);
  // nạn nhân hết chỗ (hoặc vừa có chỗ trở lại) vì chướng ngại?
  _vsMarkDoneIfStuck(F);
}

// 💣 Bom hẹn giờ nổ thật sau khi đếm ngược xong — phá vùng 3×3 quanh tâm bom.
function _vsBombExplode(F){
  if(!F.bomb) return;
  const {r,c}=F.bomb;
  F.bomb=null;
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    const nr=r+dr, nc=c+dc;
    if(nr<0||nr>=VS_N||nc<0||nc>=VS_N) continue;
    const k=nr+','+nc;
    F.board[nr][nc]=null; F.ice.delete(k); F.rocks.delete(k);
  }
  if(F.el&&F.el.half){
    F.el.half.classList.add('vs-shake');
    setTimeout(()=>F.el.half.classList.remove('vs-shake'),500);
  }
  _vsRenderGrid(F);
  _vsMarkDoneIfStuck(F);
}

// ── Đồng hồ & kết thúc ──

function _vsTick(){
  if(!versusMode||!_vs) return;
  const tm=document.getElementById('vs-mid-timer');
  if(tm){
    const num = tm.querySelector('.vs-timer-num');
    if(num) num.textContent = String(_vs.timeLeft);
    else tm.textContent = String(_vs.timeLeft);
    tm.classList.toggle('danger',_vs.timeLeft<=10);
  }
  if(_vs.timeLeft<=0){ _vsEndMatch(); return; }
  _vs.timeLeft--;
}

function _vsEndMatch(){
  if(!_vs) return;
  try{ if(typeof _vsAiStop==='function') _vsAiStop(); }catch(e){}
  try{ if(typeof lockPortraitOrientation==='function') lockPortraitOrientation(); }catch(e){}
  if(_vs.timer){ clearInterval(_vs.timer); _vs.timer=null; }
  if(_vs.online){
    try{ if(typeof stopListeningRoom === 'function') stopListeningRoom(); }catch(e){}
    try{ if(typeof _onlineLobby !== 'undefined') _onlineLobby=null; }catch(e){}
  } else {
    try{ if(typeof stopListeningChat === 'function') stopListeningChat(); }catch(e){}
  }
  versusMode=false;
  try{ window.removeEventListener('resize', _vsPositionChatFab); }catch(e){}
  const a=document.getElementById('versus-arena'); if(a) a.remove();
  _vsToggleGlobalUI(false);
  try{ if(typeof setExclusivePlayMode === 'function') setExclusivePlayMode(null); }catch(e){}
  try{ startBgm('main'); }catch(e){}
  const [P0,P1]=_vs.players, [n1,n2]=_vs.names;
  const s1=P0.score, s2=P1.score;
  try{
    const result = s1===s2 ? 'draw' : (s1>s2 ? 'win' : 'lose');
    if(typeof logGameEvent==='function') logGameEvent('versus_match_end', { mode:_vs.online?'online':'ai', result, board_boost:!!_vs.layoutBoost, my_score:s1, opp_score:s2 });
  }catch(e){}
  let msg;
  if(s1===s2) msg=t('vsDraw');
  else { msg=t('vsWin', s1>s2?n1:n2); try{ addPlayerXP(VERSUS_WIN_XP); }catch(e){} }
  document.getElementById('vs-result-title').textContent=msg;

  // Rank Versus: CHỈ tính trận online (P0 luôn là "mình" — xem enterOnlineVersusMatch).
  let rankHtml = '';
  let myVsTier = 0;
  if(_vs.online && _vs.online.roomId){
    const isHost = !!_vs.online.isHost;
    const hostScore = isHost ? s1 : s2;
    const guestScore = isHost ? s2 : s1;
    try{ if(typeof finalizeOnlineMatch === 'function') finalizeOnlineMatch(_vs.online.roomId, hostScore, guestScore); }catch(e){}
    try{
      if(typeof applyLocalVersusResult === 'function'){
        const outcome = s1===s2 ? 'draw' : (s1>s2 ? 'win' : 'loss');
        const statsAfter = applyLocalVersusResult(outcome);
        const rank = statsAfter.rank;
        myVsTier = rank.tier || 0;
        const ptsDelta = outcome==='win' ? '+'+VS_RANK_WIN_PTS : (outcome==='draw' ? '+'+VS_RANK_DRAW_PTS : VS_RANK_LOSS_PTS);
        const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'vi';
        const ptsLabel = lang !== 'vi' ? 'pts' : 'đ';
        rankHtml = '<div class="vs-result-rank">'+rank.icon+' <b>'+escapeHtml(rank.name)+'</b> · '+ptsDelta+' '+ptsLabel+'</div>';
      }
    }catch(e){}
  }
  const n1Html = (myVsTier > 0 && typeof rankNameFxHtml==='function') ? rankNameFxHtml(n1, myVsTier, (typeof VERSUS_RANKS!=='undefined'?VERSUS_RANKS.length:10)) : escapeHtml(n1);

  document.getElementById('vs-result-body').innerHTML=
    '<div class="lb-row'+(s1>=s2?' me':'')+'"><span class="lb-rank">'+(s1>=s2?'🥇':'🥈')+'</span><span class="lb-name">'+n1Html+'</span><span class="lb-score">'+s1.toLocaleString()+'</span></div>'+
    '<div class="lb-row'+(s2>s1?' me':'')+'"><span class="lb-rank">'+(s2>s1?'🥇':'🥈')+'</span><span class="lb-name">'+escapeHtml(n2)+'</span><span class="lb-score">'+s2.toLocaleString()+'</span></div>'+
    rankHtml+
    '<div style="font-size:11px;color:#9aa7bd;margin-top:8px;">'+t('vsXpNote', VERSUS_WIN_XP)+'</div>';
  try{ submitScoreToLeaderboard(Math.max(s1,s2)); }catch(e){}
  _vsShow('versus-result-panel');
}

// ── wiring ──
(function(){
  function bind(){
    const btn=document.getElementById('versus-btn');
    if(btn) btn.addEventListener('click', ()=>openVersusSetup());
    const start=document.getElementById('vs-start-btn');
    if(start) start.addEventListener('click', startVersusMatch);
    const cancel=document.getElementById('vs-cancel-btn');
    if(cancel) cancel.addEventListener('click', ()=>_vsHide('versus-setup-panel'));
    const again=document.getElementById('vs-again-btn');
    if(again) again.addEventListener('click', ()=>_vsCloseResult(true));
    const close=document.getElementById('vs-close-btn');
    if(close) close.addEventListener('click', ()=>_vsCloseResult(false));
    let _vsReflowT=0;
    const scheduleReflow=()=>{
      clearTimeout(_vsReflowT);
      _vsReflowT=setTimeout(_vsReflowGrids, 80);
    };
    window.addEventListener('resize', scheduleReflow);
    window.addEventListener('orientationchange', ()=>setTimeout(_vsReflowGrids, 120));
    refreshVersusButton();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

