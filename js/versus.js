// ═══════════════════════════════════════════════════════════════
// js/versus.js — ĐẤU 1-1 SONG SONG (Cùng máy = đấu AI, luôn mở; Online từ Level 3)
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

const VERSUS_MIN_LEVEL = 3;    // cấp (XP) tối thiểu để mở phòng online

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

/** Nút ⚔️ luôn mở — "Cùng máy" (đấu với AI) không giới hạn cấp. Chỉ "Online" cần Lv.3 (xem canHostVersus). */

function refreshVersusButton(){
  const btn=document.getElementById('versus-btn');
  if(btn){
    btn.classList.add('vs-unlocked');
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
  const n1=(document.getElementById('vs-name1').value.trim()||t('vsP1'));
  const n2=(document.getElementById('vs-name2').value.trim()||t('vsP2'));
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
  _vs={ seed, names:[n1,n2], avatars:[avMe, '🐱'], timeLeft:VERSUS_TIME, timer:null,
        localSkins:[_vsGetLocalSkinPrefs(1), _vsGetLocalSkinPrefs(2)],
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
    try{ if(typeof _vsAiStart==='function') _vsAiStart(); }catch(e){}
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

function _vsAbort(){
  if(_vs && _vs.timer) clearInterval(_vs.timer);
  try{ if(typeof _vsAiStop==='function') _vsAiStop(); }catch(e){}
  try{
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
  if(!_vsCanPlace(P,pc.shape,R,C)){ try{ sfxInvalid(); }catch(e){} return; }
  const pieceIndex=P.selected;
  const shapeSnap=pc.shape.map(([r,c])=>[r,c]);
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
  if(!fromNetwork && _vs && _vs.online && P.idx===0){
    _vsBroadcastMove('place', { pieceIndex, R, C, shape: shapeSnap });
  }
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
  const n1Html = (myVsTier > 0 && typeof rankNameFxHtml==='function') ? rankNameFxHtml(n1, myVsTier) : escapeHtml(n1);

  document.getElementById('vs-result-body').innerHTML=
    '<div class="lb-row'+(s1>=s2?' me':'')+'"><span class="lb-rank">'+(s1>=s2?'🥇':'🥈')+'</span><span class="lb-name">'+n1Html+'</span><span class="lb-score">'+s1.toLocaleString()+'</span></div>'+
    '<div class="lb-row'+(s2>s1?' me':'')+'"><span class="lb-rank">'+(s2>s1?'🥇':'🥈')+'</span><span class="lb-name">'+escapeHtml(n2)+'</span><span class="lb-score">'+s2.toLocaleString()+'</span></div>'+
    rankHtml+
    '<div style="font-size:11px;color:#9aa7bd;margin-top:8px;">'+t('vsXpNote', VERSUS_WIN_XP)+'</div>';
  try{ submitScoreToLeaderboard(Math.max(s1,s2)); }catch(e){}
  _vsShow('versus-result-panel');
}

// ── wiring ──
(function initVersus(){
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
})();

