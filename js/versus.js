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
// Bộ chướng ngại: id ↔ chỉ số tên trong MECH_NAME (i18n sẵn có). "free:true" là
// thẻ mặc định ai cũng rút được ngay; còn lại phải mua mở khoá trong Shop (tab
// "vscards") mới xuất hiện trong bộ bài rút của MÌNH — không ảnh hưởng gì tới
// việc mở khoá cơ chế đó ở chế độ 1 người chơi (2 hệ độc lập, dùng chung emoji/
// tên hiển thị qua MECH_NAME nhưng khác nhau về "sở hữu").
const VS_OBSTACLES = [
  { id:'mountain', nameIdx:2,  emoji:'⛰️', free:false, price:80,  diaPrice:0 },
  { id:'tornado',  nameIdx:7,  emoji:'🌪️', free:true },
  { id:'ice',      nameIdx:4,  emoji:'🧊', free:false, price:80,  diaPrice:0 },
  { id:'fog',      nameIdx:5,  emoji:'🌫️', free:false, price:60,  diaPrice:0 },
  { id:'squirrel', nameIdx:3,  emoji:'🐿️', free:true },
  { id:'bomb',     nameIdx:6,  emoji:'💣', free:true },
  { id:'blackhole',nameIdx:12, emoji:'🕳️', free:false, price:0,   diaPrice:15 },
  { id:'wall',     nameIdx:15, emoji:'🧱', free:false, price:100, diaPrice:0 },
  { id:'lightning',nameIdx:16, emoji:'⚡', free:false, price:0,   diaPrice:15 },
  { id:'egg',      nameIdx:8,  emoji:'🥚', free:false, price:90,  diaPrice:0 },
  { id:'ghost',    nameIdx:13, emoji:'👻', free:false, price:70,  diaPrice:0 },
  { id:'raincloud',nameIdx:10, emoji:'🌧️', free:false, price:0,  diaPrice:12 },
  { id:'portal',   nameIdx:19, emoji:'🌀', free:false, price:50,  diaPrice:0 },
];

const VS_CARD_UNLOCK_KEY = 'unlockedVsCards';

/** Thẻ này đã dùng được chưa (miễn phí sẵn hoặc đã mua mở khoá)? */
function isVsCardUnlocked(id){
  const ob = VS_OBSTACLES.find(o=>o.id===id);
  if(!ob) return false;
  if(ob.free) return true;
  const p = (typeof getPlayerProfile==='function') ? getPlayerProfile() : {};
  const list = Array.isArray(p[VS_CARD_UNLOCK_KEY]) ? p[VS_CARD_UNLOCK_KEY] : [];
  return list.indexOf(id) >= 0;
}
function _vsUnlockCard(id){
  const p = (typeof getPlayerProfile==='function') ? getPlayerProfile() : {};
  const list = Array.isArray(p[VS_CARD_UNLOCK_KEY]) ? p[VS_CARD_UNLOCK_KEY].slice() : [];
  if(list.indexOf(id) < 0){
    list.push(id);
    if(typeof savePlayerProfile==='function') savePlayerProfile({ [VS_CARD_UNLOCK_KEY]: list });
  }
}
/** Trừ tiền qua Cloud Function spendCurrency dùng chung — giống hệt
    _bubbleSpendCurrency (js/chat-bubble-skins.js), server xác thực số dư. */
async function _vsCardSpendCurrency(cost){
  if(typeof _getOnlineFunctions !== 'function') return { ok:false, reason:'offline' };
  const fns = _getOnlineFunctions();
  if(!fns) return { ok:false, reason:'offline' };
  try{
    await fns.httpsCallable('spendCurrency')({ cost });
    return { ok:true };
  }catch(e){
    return { ok:false, reason: (e && e.message) || 'error' };
  }
}
async function buyVsCardWithGold(id, price){
  if(isVsCardUnlocked(id)) return { ok:false, reason:'owned' };
  const r = await _vsCardSpendCurrency({ gold: price });
  if(!r.ok) return { ok:false, reason: r.reason === 'offline' ? 'offline' : 'gold' };
  _vsUnlockCard(id);
  try{ if(typeof syncWalletFromServer === 'function') await syncWalletFromServer(); }catch(e){}
  return { ok:true };
}
async function buyVsCardWithDiamond(id, diaCost){
  if(isVsCardUnlocked(id)) return { ok:false, reason:'owned' };
  const r = await _vsCardSpendCurrency({ diamonds: diaCost });
  if(!r.ok) return { ok:false, reason: r.reason === 'offline' ? 'offline' : 'diamond' };
  _vsUnlockCard(id);
  try{ if(typeof syncWalletFromServer === 'function') await syncWalletFromServer(); }catch(e){}
  return { ok:true };
}

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
    rocks:new Set(), ice:new Map(), bomb:null, egg:null, fogUntil:0, done:false, el:{} };
}

// Nút trợ giúp ❓ nổi (z-index cao hơn đấu trường) đè lên điểm người chơi trên
// thanh HUD chung → ẩn đi trong suốt trận đấu, trả lại khi trận kết thúc.

function _vsAbort(opts){
  const noForfeit = !!(opts && opts.noForfeit);
  if(_vs && _vs.timer) clearInterval(_vs.timer);
  try{ if(typeof _vsAiStop==='function') _vsAiStop(); }catch(e){}
  // Thoát trận online giữa chừng → mặc định xử thua ngay cho mình (đối thủ mặc định
  // thắng), báo thẳng lên Firestore không so điểm — giống lúc 1 ván kết thúc bình
  // thường. Không xoá/định lại phòng nữa (forfeitOnlineMatch đã đưa phòng về trạng
  // thái 'finished' với kết quả đã ghi, giữ nguyên như vậy).
  // NGOẠI LỆ (noForfeit=true): huỷ trận trước khi có gameplay thật (VD: cược server
  // từ chối trừ tiền ngay lúc vào trận) — KHÔNG được gọi forfeitOnlineMatch, vì đó là
  // ghi status:'finished'+winnerId (có người thắng-thua thật). 2 lý do: (1) không công
  // bằng khi tuyên bố thắng/thua cho 1 lỗi setup không do người chơi gây ra; (2)
  // roomFinishOk() (firestore.rules) chặn set status:'finished' trong 8s đầu sau khi
  // tạo phòng (chống báo thắng khống tức thời) — ghi kiểu này ở đây LUÔN bị từ chối
  // "Missing or insufficient permissions" vì cược thường fail rất sớm, dưới 8s.
  try{
    if(_vs && _vs.online && _vs.online.roomId){
      if(noForfeit && typeof cancelOnlineMatchNoWinner === 'function'){
        cancelOnlineMatchNoWinner(_vs.online.roomId).catch(()=>{});
      } else if(!noForfeit && typeof forfeitOnlineMatch === 'function'){
        forfeitOnlineMatch(_vs.online.roomId, !!_vs.online.isHost).catch(()=>{});
      }
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
  try{ if(typeof sfxRoomLeave==='function') sfxRoomLeave(); }catch(e){}
  try{
    if(_vs.online.roomId && typeof forfeitOnlineMatch === 'function'){
      forfeitOnlineMatch(_vs.online.roomId, !_vs.online.isHost).catch(()=>{});
    }
  }catch(e){}
  try{ showHint((typeof t==='function'?t('vsOpponentLeft'):null) || 'Đối thủ đã rời trận', { hold: 2600 }); }catch(e){}
  _vsAbort();
  try{ if(typeof openVersusSetup === 'function') openVersusSetup(); }catch(e){}
}

/** Trận bị HUỶ (status:'cancelled', KHÔNG phải forfeit) — VD: cược của đối thủ bị
 * server từ chối ngay lúc vào trận. Không ai thắng/thua, chỉ thoát êm — không gọi
 * forfeitOnlineMatch (đã ghi 'cancelled' rồi, gọi lại cũng vô ích vì roomFinishOk()
 * không cho set 'finished' đè lên nữa nếu chưa đủ 8s, mà bản chất cũng không nên có
 * người thắng ở đây). */
function _vsHandleMatchCancelled(){
  if(!_vs || !_vs.online) return;
  try{ showHint((typeof t==='function'?t('vsMatchCancelled'):null) || 'Trận đấu đã bị huỷ', { hold: 2600 }); }catch(e){}
  _vsAbort({ noForfeit: true });
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
  if(!versusMode||(P.done&&!fromNetwork)||P.selected<0) return;
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
  // FIX: Firestore từ chối "mảng lồng mảng" ([[r,c],[r,c],...]) khi ghi transaction
  // (lỗi "Nested arrays are not supported") — mọi nước đi online từng bị chặn ngay tại
  // đây, không tới được đối thủ. Đổi sang mảng object {r,c} (Firestore chấp nhận được).
  const shapeSnap=pc.shape.map(([r,c])=>({r,c}));
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
    _vsBroadcastMove('place', { pieceIndex, R, C, shape: shapeSnap, color: pc.color });
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
  // Online: trạng thái hết chỗ của đối thủ suy luận trên máy mình có thể lệch do độ
  // trễ đồng bộ mạng — chỉ tự kết thúc sớm dựa vào việc CHÍNH MÌNH (P.idx===0) hết
  // chỗ, tránh 1 phía tự ý kết thúc trận dựa trên suy luận có thể sai về phía đối
  // thủ. Đối thủ thật sự hết chỗ sẽ tự phát hiện trên máy họ và kết thúc từ đó.
  if(_vs.online && P.idx!==0) return false;
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
    // 🧊 Lớp băng bảo vệ: lần dọn đầu tiên (stage 2) chỉ làm NỨT băng, GIỮ nguyên ô màu
    // bên dưới — đúng quy luật "phá lớp bảo vệ trước rồi mới phá được ô" (như dây gai ở
    // map thường: 1 lần nổ chỉ gỡ gai, phải nổ thêm lần nữa mới mất ô). Lần dọn thứ 2
    // (stage 1, đã nứt) mới thực sự gỡ băng VÀ phá luôn ô màu — cùng luật 2 giai đoạn với
    // iceCells ở map thường (js/round-mechanics.js). Trước đây chỉ có 1 giai đoạn (gỡ băng
    // xong là coi như xong, không tính là đã phá ô) nên không khớp luật map chính.
    if(P.ice.has(k)){
      const stage=P.ice.get(k);
      if(stage>=2){ P.ice.set(k,1); return; }
      P.ice.delete(k);
    }
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
    take(filledCells,4).forEach(k=>F.ice.set(k,2));
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
  } else if(ob.id==='egg'){
    // 🥚 Trứng rồng: đặt 1 quả trứng vào 1 hàng, báo trước 3s (giống bom có đếm
    // ngược) rồi "nở" đốt sạch NGUYÊN CẢ HÀNG đó — nặng hơn bom (1 điểm) nhưng
    // có báo trước để đối thủ kịp dọn bớt hàng đó nếu muốn, giống luật map thường.
    const row = Math.floor(Math.random()*VS_N);
    F.egg = { row, left:3 };
    const tick=()=>{
      if(!F.egg||!_vs||!versusMode) return;
      F.egg.left--;
      if(F.egg.left<=0){
        const r=F.egg.row;
        for(let c=0;c<VS_N;c++){
          const k=r+','+c;
          if(F.rocks.has(k)) continue;
          F.board[r][c]=null; F.ice.delete(k);
        }
        F.egg=null;
        _vsRenderGrid(F);
        return;
      }
      _vsRenderGrid(F);
      setTimeout(tick,1000);
    };
    setTimeout(tick,1000);
  } else if(ob.id==='ghost'){
    // 👻 Bóng ma: đổi màu 3 ô đã lấp sang màu KHÁC ngay lập tức — phá vỡ cụm màu
    // đối thủ đang gom dở, không xoá ô (khác lửa/sét), chỉ đánh lừa/phá kế hoạch.
    const targets = take(filledCells,3);
    targets.forEach(k=>{
      const [r,c]=k.split(',').map(Number);
      const cur=F.board[r][c];
      const others=(typeof COLORS!=='undefined'?COLORS:[cur]).filter(cc=>cc!==cur);
      if(others.length) F.board[r][c]=others[Math.floor(Math.random()*others.length)];
    });
  } else if(ob.id==='raincloud'){
    // 🌧️ Mây mưa: rửa trôi 3 ô đã lấp trong CÙNG 1 CỘT thành ô chắn tạm 8s (mượn
    // lại F.rocks như núi đá/tường) — nhắm vào 1 cột nên cản đúng kiểu dựng cột
    // của đối thủ, khác núi đá (rải ngẫu nhiên khắp bàn).
    const col = Math.floor(Math.random()*VS_N);
    const colFilled = filledCells.filter(k=>Number(k.split(',')[1])===col);
    const washed = take(colFilled,3);
    washed.forEach(k=>{ const [r,c]=k.split(',').map(Number); F.board[r][c]=null; F.ice.delete(k); F.rocks.add(k); });
    if(washed.length) setTimeout(()=>{
      if(_vs&&versusMode){ washed.forEach(k=>F.rocks.delete(k)); _vsRenderGrid(F); }
    },8000);
  } else if(ob.id==='portal'){
    // 🌀 Cổng dịch chuyển: hoán đổi 2 ô đã lấp với 2 ô trống ngẫu nhiên — xáo trộn
    // cục bộ, quy mô NHỎ hơn lốc xoáy (lốc đảo toàn bộ màu trên cả bàn).
    const pairs = Math.min(2, filledCells.length, emptyCells.length);
    for(let i=0;i<pairs;i++){
      const fk = filledCells.splice(Math.floor(Math.random()*filledCells.length),1)[0];
      const ek = emptyCells.splice(Math.floor(Math.random()*emptyCells.length),1)[0];
      const [fr,fc]=fk.split(',').map(Number);
      const [er,ec]=ek.split(',').map(Number);
      const col=F.board[fr][fc];
      F.board[fr][fc]=null; F.ice.delete(fk);
      F.board[er][ec]=col;
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
  const bc=document.getElementById('burst-count');
  if(bc){ const [P0,P1]=_vs.players; bc.textContent='⚔️ '+P0.score+' vs '+P1.score+'  ⏱'+_vs.timeLeft+'s'; }
}

function _vsEndMatch(){
  if(!_vs) return;
  try{ if(typeof _vsAiStop==='function') _vsAiStop(); }catch(e){}
  try{ if(typeof lockPortraitOrientation==='function') lockPortraitOrientation(); }catch(e){}
  if(_vs.timer){ clearInterval(_vs.timer); _vs.timer=null; }
  if(_vs.online){
    // KHÔNG stopListeningRoom() ở đây nữa — muốn giữ phòng sống để 2 người có
    // thể ở lại bấm "Sẵn sàng" đấu tiếp (xem _vsRenderPostMatchReady trong
    // online-ui.js). Chỉ thật sự rời phòng khi bấm nút rời tường minh.
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

  // Đối chiếu lại điểm/rank Versus vừa hiển thị (ước tính local) với server sau khi
  // Cloud Function applyMatchResult xử lý xong, tránh lệch với hồ sơ/BXH thật.
  const wasOnlineMatch = !!(_vs.online && _vs.online.roomId);
  if(typeof fetchMyVersusStats === 'function' && wasOnlineMatch){
    setTimeout(async ()=>{
      try{
        const real = await fetchMyVersusStats();
        const rank = real.rank;
        const el = document.querySelector('#vs-result-body .vs-result-rank');
        if(el && rank){
          const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'vi';
          const ptsLabel = lang !== 'vi' ? 'pts' : 'đ';
          el.innerHTML = rank.icon+' <b>'+escapeHtml(rank.name)+'</b> · '+real.points+' '+ptsLabel;
        }
      }catch(e){}
    }, 1800);
  }
}

// ── wiring ──
(function(){
  function bind(){
    const btn=document.getElementById('versus-btn');
    if(btn) btn.addEventListener('click', ()=>{
      if(typeof window.openVersusMenu === 'function'){ window.openVersusMenu(); return; }
      openVersusSetup();
    });
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

