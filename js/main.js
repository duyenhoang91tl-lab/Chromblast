
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
  }
  window.addEventListener('resize', fitGameRoot);
  window.addEventListener('orientationchange', ()=>setTimeout(fitGameRoot,150));
  window.addEventListener('load', fitGameRoot);
  document.addEventListener('DOMContentLoaded', fitGameRoot);
  setInterval(fitGameRoot, 1000);
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
const COLOR_BURST_MIN = 9;   // min cells in a CONNECTED same-colour group to clear (map chính)
const SECRET_WINDOW = 2500;  // ms — khoảng thời gian giữa 2 lần nổ trong map ẩn (ấn chậm hơn sẽ thoát)
const SECRET_ULTRA  = 9;     // streak to trigger ultra
const TEST_UNLOCK_SCORE = 100; // 🧪 ngưỡng điểm để mở khoá map ẩn — ĐANG GIẢM ĐỂ TEST (bình thường là 1000)

/* ══════════════════════════════════════════════════════
   HỆ THỐNG MỞ KHÓA MAP ẨN THEO MỐC ĐIỂM TĂNG DẦN
   Map thường 100đ → Map ẩn 1. Thắng map ẩn N → về map thường
   đạt thêm 100*(N+1) đ (tính từ mốc lúc vừa thắng) → mở map ẩn N+1.
══════════════════════════════════════════════════════ */
/* ══════ CHẾ ĐỘ ADVENTURE — mở khóa khi đạt 10.000 điểm ══════ */
const ADVENTURE_UNLOCK_SCORE = 10000;
let adventureUnlocked = getAdventureUnlocked();
let adventureThemeOn = false;
function checkAdventureUnlock(){
  if(adventureUnlocked || score<ADVENTURE_UNLOCK_SCORE) return;
  adventureUnlocked=true;
  saveAdventureUnlocked();
  const btn=document.getElementById('adventure-toggle-btn'); if(btn) btn.style.display='inline-block';
  showComboFlash(0,false,'🚀 ADVENTURE 1 MỞ KHÓA!');
  sfxUnlock();
}
function setAdventureTheme(on){
  adventureThemeOn=on;
  document.getElementById('game-root').classList.toggle('theme-adventure', on);
  document.getElementById('adventure-avatar').style.display = on?'block':'none';
  const btn=document.getElementById('adventure-toggle-btn');
  if(btn) btn.textContent = on ? '🚀 ADV: BẬT' : '🚀 ADV';
}

let hiddenMapEntryScore=0; // mốc điểm lúc vào map ẩn (chỉ còn để tham khảo)
function forfeitHiddenMapScore(){
  // (đã gỡ theo yêu cầu) thua map ẩn KHÔNG thu hồi điểm nữa — người chơi giữ nguyên
  // toàn bộ điểm đã kiếm được, chỉ quay về map thường
  if(typeof updateScoreUI==='function') updateScoreUI();
}
const UNLOCK_STAGE_ORDER = ['secret','dodge','fruit','bee','gold','mole','memory','bubble','stack','boss','catch','flood','arena','snake','brick','runner','space','rhythm','maze','mega'];
function unlockThresholdForStage(stageNum){ return 100*stageNum; } // stageNum 1-indexed (map ẩn thứ mấy)
let unlockGateStageIndex = 0;   // index (0-based) trong UNLOCK_STAGE_ORDER của map ẩn TIẾP THEO cần mở
let unlockGateBaseline = 0;     // mốc điểm map thường lúc bắt đầu chờ
let unlockGateActive = true;    // đang tích điểm map thường để mở map ẩn tiếp theo?
function triggerStageUnlock(stageKey){
  switch(stageKey){
    case 'secret': return triggerUnlock();
    case 'dodge': return triggerDodgeUnlock();
    case 'fruit': return triggerFruitUnlock();
    case 'bee': return triggerBeeUnlock();
    case 'gold': return triggerGoldUnlock();
    case 'mole': return triggerMoleUnlock();
    case 'memory': return triggerMemoryUnlock();
    case 'bubble': return triggerBubbleUnlock();
    case 'stack': return triggerStackUnlock();
    case 'boss': return triggerBossUnlock();
    case 'catch': return triggerCatchUnlock();
    case 'flood': return triggerFloodUnlock();
    case 'arena': return triggerArenaUnlock();
    case 'snake': return triggerSnakeUnlock();
    case 'brick': return triggerBrickUnlock();
    case 'runner': return triggerRunnerUnlock();
    case 'space': return triggerSpaceUnlock();
    case 'rhythm': return triggerRhythmUnlock();
    case 'maze': return triggerMazeUnlock();
    case 'mega': return triggerMegaUnlock();
  }
}
// Gọi khi vừa THẮNG map ẩn ở vị trí clearedIdx (0-based) trong UNLOCK_STAGE_ORDER —
// bắt đầu đếm điểm map thường để mở map ẩn kế tiếp.
function startUnlockGate(clearedIdx){
  markMapCleared(UNLOCK_STAGE_ORDER[clearedIdx]);
  unlockGateStageIndex = clearedIdx+1;
  unlockGateBaseline = score;
  unlockGateActive = (unlockGateStageIndex < UNLOCK_STAGE_ORDER.length);
  consecutiveBursts=0; updateBurstCount();
  // Mỗi vòng map ẩn thắng xong → map thường khó thêm một bậc:
  // khối gạch to/khó xếp xuất hiện nhiều hơn + rải thêm ô chướng ngại lên bàn cờ
  mainHardTier=unlockGateStageIndex;
  resetMechanicState(); // tắt cơ chế của vòng trước — mỗi vòng chỉ có đúng 1 cơ chế mới
  applyRoundMechanics(); // vòng 1: dây gai · vòng 2: núi · vòng 3: sóc trộm ô · ...
  addPlayerXP(30+clearedIdx*10); // thưởng XP mỗi lần phá đảo một map ẩn — vòng càng sâu thưởng càng lớn
  // 🌗 Vừa thắng map ẩn CUỐI CÙNG (Mega, vòng 20) → không còn map ẩn nào nữa,
  // bắt đầu tiến trình vòng cơ chế đôi 21-40 ngay trên bàn cờ thường (tuần tự, không nhảy cóc).
  if(!unlockGateActive){
    comboGateActive=true;
    comboGateBaseline=score;
    if(mainHardTier>maxComboTierReached){ maxComboTierReached=mainHardTier; saveComboProgress(); }
  }
}

/* ══════════════════════════════════════════
   HỆ THỐNG ĐIỂM KINH NGHIỆM & LEVEL NGƯỜI CHƠI
   Mỗi điểm ghi được = 1 XP; thắng map ẩn có thưởng thêm.
   Level và XP lưu bền vững qua localStorage.
══════════════════════════════════════════ */
let playerXP=0, playerLevel=1, _xpLastScore=0;
(function loadPlayerXP(){
  const s=getSavedPlayerData();
  if(s.xp>0) playerXP=s.xp;
  if(s.level>0) playerLevel=s.level;
})();
function xpNeeded(lv){ return 100+(lv-1)*50; } // cấp càng cao càng cần nhiều XP
function addPlayerXP(n){
  if(!(n>0)) return;
  playerXP+=n;
  let leveled=false;
  while(playerXP>=xpNeeded(playerLevel)){ playerXP-=xpNeeded(playerLevel); playerLevel++; leveled=true; }
  if(leveled){
    try{ sfxUnlock(); }catch(e){}
    try{ showComboFlash(0,false,'🎉 LÊN CẤP '+playerLevel+'!'); }catch(e){}
  }
  savePlayerXP(); renderPlayerXP();
}
function renderPlayerXP(){
  const el=document.getElementById('player-level-box'); if(!el) return;
  const need=xpNeeded(playerLevel);
  el.innerHTML='⭐ Lv.'+playerLevel+
    ' <span style="display:inline-block;width:44px;height:5px;background:rgba(255,255,255,0.15);border-radius:3px;vertical-align:middle;overflow:hidden;">'+
    '<span style="display:block;height:100%;width:'+Math.min(100,Math.round(playerXP/need*100))+'%;background:linear-gradient(90deg,#ffd700,#ff9900);border-radius:3px;"></span></span>';
}
renderPlayerXP(); // hiển thị ngay khi tải trang (script nằm cuối body nên phần tử đã tồn tại)

// Mode A state
let board, pieces, selected, score=0, best=0, linesCleared=0, level=1, combo=0;
// Load persisted data
(function loadSaved(){
  const saved = getSavedGameData();
  if(saved.best) best = saved.best;
})();
let consecutiveBursts = 0; // counts chain explosions toward unlock

/* ══════════════════════════════════════════
   ACHIEVEMENT SYSTEM
══════════════════════════════════════════ */
const ACHIEVEMENTS = {
  first_burst: { id:'first_burst', label:'💥 Vụ nổ đầu tiên!',   desc:'Phá được nhóm màu đầu tiên',    done:false },
  combo5:      { id:'combo5',      label:'🔥 Combo x5!',          desc:'Đạt combo 5 lần liên tiếp',     done:false },
  score1000:   { id:'score1000',   label:'⭐ 1000 điểm!',         desc:'Ghi được 1000 điểm',            done:false },
  score5000:   { id:'score5000',   label:'🌟 5000 điểm!',         desc:'Ghi được 5000 điểm',            done:false },
  secret1:     { id:'secret1',     label:'🔥 Map ẩn 1 mở khóa!', desc:'Khám phá map bí mật đầu tiên',  done:false },
  ultra:       { id:'ultra',       label:'⚡ ULTRA MODE!',         desc:'Đạt Ultra trong map ẩn 1',      done:false },
  fruit50:     { id:'fruit50',     label:'🍉 50 quả đã chém!',    desc:'Chém 50 trái cây',              done:false },
  survive60:   { id:'survive60',   label:'🐢 Sống sót 60 giây!',  desc:'Tồn tại 60 giây trong map 2',  done:false },
  level5:      { id:'level5',      label:'📈 Cấp độ 5!',          desc:'Đạt cấp độ 5 trong map thường', done:false },
  level10:     { id:'level10',     label:'🏆 Cấp độ 10!',         desc:'Đạt cấp độ 10 — chuyên gia!',  done:false },
};
let fruitSlicedTotal = 0;
let survive60Unlocked = false;

function unlockAchievement(id){
  const a = ACHIEVEMENTS[id];
  if(!a || a.done) return;
  a.done = true;
  showAchievementToast(a);
  try { sfxScoreMilestone(); } catch(e){ try { sfxStreak(5); } catch(e2){} }
}

function showAchievementToast(a){
  if(!document.getElementById('toast-style')){
    const st = document.createElement('style');
    st.id = 'toast-style';
    st.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(30px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}' +
      '@keyframes toastOut{from{opacity:1}to{opacity:0;transform:translateX(-50%) translateY(-10px)}}';
    document.head.appendChild(st);
  }
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);' +
    'background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #ffd700;border-radius:12px;padding:10px 18px;' +
    'color:#fff;font-size:14px;font-weight:700;z-index:99999;box-shadow:0 0 20px rgba(255,215,0,0.4);' +
    'max-width:280px;text-align:center;animation:toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;pointer-events:none;';
  toast.innerHTML = '<div style="font-size:16px">'+a.label+'</div>' +
    '<div style="font-size:11px;opacity:0.7;margin-top:3px">'+a.desc+'</div>';
  document.body.appendChild(toast);
  setTimeout(()=>{ toast.style.animation='toastOut 0.4s ease-in forwards'; setTimeout(()=>toast.remove(),400); }, 2800);
}

/* ── Quy tắc tính điểm chung: 1 ô = 1 điểm; phá liên tiếp 3 lần → x2; 6 lần → x3 ──
   Dùng chung cho map thường và mọi map ẩn để thang điểm đồng nhất. */
function comboScoreMultiplier(streak){
  return streak>=6 ? 3 : streak>=3 ? 2 : 1;
}

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

/* ══════════════════════════════════════════
   ⚙️ MỤC NHỊP & THƯỞNG — cấu hình trung tâm cho 20 cơ chế độ khó map thường
   nhịp  = số bước đặt khối giữa 2 lần cơ chế hoạt động (nhỏ hơn = khó hơn)
   thưởng = điểm nhận khi hóa giải cơ chế
   Chỉnh trực tiếp trong panel admin "⚙️ Nhịp & Thưởng" — lưu bền qua localStorage.
══════════════════════════════════════════ */
const MECH_DEFAULTS={
  mountain:   {label:'⛰️ Núi lan rộng',      nhip:10},
  squirrel:   {label:'🐿️ Sóc trộm ô',        nhip:3,  thuong:50, hp:10, limit:15},
  ice:        {label:'🧊 Băng giá',           nhip:7},
  fog:        {label:'🌫️ Sương mù trôi',      nhip:4},
  bomb:       {label:'💣 Bom hẹn giờ',        nhip:8,  thuong:20, phat:15},
  tornado:    {label:'🌪️ Lốc xoáy',           nhip:15},
  egg:        {label:'🥚 Trứng rồng nở',      nhip:12, thuong:40},
  spider:     {label:'🕷️ Nhện giăng tơ',      nhip:6,  thuong:30, hp:5},
  cloud:      {label:'🌧️ Mây mưa rửa màu',    nhip:6},
  cham:       {label:'🦎 Tắc kè đổi màu',     nhip:8},
  bh:         {label:'🕳️ Hố đen nuốt ô',      nhip:10, thuong:35},
  ghost:      {label:'👻 Bóng ma đội lốt',    nhip:7,  thuong:25},
  snail:      {label:'🐌 Ốc sên nhớt',                 thuong:30},
  wall:       {label:'🧱 Tường gạch rơi',     nhip:14},
  lightning:  {label:'⚡ Sét đánh',           nhip:9},
  snakeSpirit:{label:'🐍 Rắn thần',                    thuong:60, hp:5},
  volcano:    {label:'🌋 Núi lửa phun đá',    nhip:15},
  portal:     {label:'🌀 Cổng dịch chuyển',   nhip:5,  thuong:40},
  dk:         {label:'🐲 Vua Rồng',           nhip:12, thuong:100, hp:15},
};
let MECH_CFG=JSON.parse(JSON.stringify(MECH_DEFAULTS));
(function loadMechCfg(){
  const saved=getSavedMechCfg();
  Object.keys(saved).forEach(k=>{
    if(!MECH_CFG[k]) return;
    ['nhip','thuong','phat'].forEach(fld=>{
      const v=parseInt(saved[k]&&saved[k][fld],10);
      if(!isNaN(v)&&v>=0) MECH_CFG[k][fld]=v;
    });
  });
})();
function MCFG(k,fld){ return MECH_CFG[k][fld]; }
function renderMechCfg(){
  const list=document.getElementById('mechcfg-list'); if(!list) return;
  list.innerHTML='';
  Object.keys(MECH_CFG).forEach(k=>{
    const m=MECH_CFG[k];
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px solid rgba(255,255,255,0.08);font-size:12px;color:#ddd;';
    let html='<span style="flex:1;text-align:left;">'+m.label+'</span>';
    if(m.nhip!=null) html+='<label style="color:#8fd3ff;">Nhịp <input data-k="'+k+'" data-f="nhip" type="number" min="1" max="99" value="'+m.nhip+'" style="width:44px;background:#1a1a2e;color:#fff;border:1px solid rgba(255,255,255,0.25);border-radius:5px;padding:2px 4px;"></label>';
    if(m.thuong!=null) html+='<label style="color:#ffd700;">Thưởng <input data-k="'+k+'" data-f="thuong" type="number" min="0" max="999" value="'+m.thuong+'" style="width:52px;background:#1a1a2e;color:#fff;border:1px solid rgba(255,255,255,0.25);border-radius:5px;padding:2px 4px;"></label>';
    if(m.phat!=null) html+='<label style="color:#ff6b6b;">Phạt <input data-k="'+k+'" data-f="phat" type="number" min="0" max="999" value="'+m.phat+'" style="width:52px;background:#1a1a2e;color:#fff;border:1px solid rgba(255,255,255,0.25);border-radius:5px;padding:2px 4px;"></label>';
    row.innerHTML=html;
    list.appendChild(row);
  });
  list.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('change',()=>{
      const k=inp.dataset.k, fld=inp.dataset.f;
      let v=parseInt(inp.value,10);
      if(isNaN(v)) v=MECH_DEFAULTS[k][fld];
      v=Math.max(fld==='nhip'?1:0, Math.min(999,v));
      inp.value=v; MECH_CFG[k][fld]=v;
      saveMechCfg();
    });
  });
}

// 🌿 Vòng 1 — dây gai: ô không được phá sau N bước sẽ bị gai quấn, phải nổ ô kề bên để gỡ
let thornMode = false;
let thornPlacementCount = 0;
let thornWave = 0;
let thornThreshold = 6;
let thornCells = new Set();
let cellBurstCount = {};
// Tuổi ô: gai CHỈ quấn ô đã nằm trên bàn QUÁ 5 lượt đặt khối mà vẫn chưa bị phá
let placeCounter = 0;      // tổng số lượt đặt khối trong ván
let cellPlacedAt = {};     // key "r,c" -> lượt mà ô nhận màu (đặt/dịch chuyển tới)
const THORN_MIN_AGE = 5;

// ⛰️ Vòng 2 — ngọn núi: mọc từ 1 chấm, cứ 10 bước không bào mòn lại lan thêm 1 ô,
// che ô nào nuốt ô đó; nổ nhóm CẠNH núi sẽ bào mòn núi 1 ô
let mountainCells = new Set();
let mountainStepCount = 0;
let mountainRespawn = 0; // đếm lùi số bước để núi mọc lại sau khi bị san phẳng

// 🐿️ Vòng 3 — con sóc: vài bước lại nhảy tới trộm 1 ô màu; nổ trúng ô nó đứng để trừ HP;
// để nó trộm đủ giới hạn là thua luôn ván map thường
let squirrel = null; // {r, c, hp}
let squirrelStepCount = 0;
let squirrelMoveCount = 0; // đếm số lượt sóc đã DI CHUYỂN (1 ô/lượt) — cứ 3 lượt di chuyển mới ăn 1 ô
let squirrelStolen = 0;
let squirrelRespawn = 0; // đếm lùi số bước sau khi sóc chết — hết 6 bước mà chưa phá xong ô nào thì sóc mới xuất hiện
let bittenCells = new Set(); // khung các ô đã bị sóc gặm — hiện rõ trên bàn, chặn đặt khối, diệt sóc sẽ phục hồi

// 🧊 Vòng 4 — băng giá: thỉnh thoảng 1 ô màu bị đóng băng, phải nổ 2 lần mới vỡ
let iceCells = new Map(); // key -> 2 (băng cứng) | 1 (đã nứt)
let iceStepCount = 0;

// 🌫️ Vòng 5 — sương mù 3×3 trôi trên bàn, che màu ô; nổ ô trong sương làm sương tan tạm
let fogCenter = null; // {r,c}
let fogStepCount = 0, fogCooldown = 0;

// 💣 Vòng 6 — bom hẹn giờ: đếm ngược theo bước, nổ mất vùng 3×3; gỡ bằng nổ ô kề bên
let bombCell = null; // {r,c}
let bombTimer = 0, bombRespawn = 0;

// 🌪️ Vòng 7 — lốc xoáy: mỗi 15 bước càn qua 1 hàng/cột, xáo trộn vị trí ô màu
let tornadoStepCount = 0;

// 🥚 Vòng 8 — trứng rồng: nở sau 12 bước → thiêu rụi cả hàng; đập vỡ trước bằng 2 lần nổ kề bên
let dragonEgg = null; // {r,c,shell,hatch}
let eggRespawn = 0;
const EGG_SHELL = 2;

let mechAnnounced={};
function announceMech(key,msg,delay){
  if(mechAnnounced[key]) return;
  mechAnnounced[key]=true;
  setTimeout(()=>showComboFlash(0,false,msg), delay);
}
function randEmptyKey(){
  const empties=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!board[r][c] && !cellBlockedForPlacement(r,c)) empties.push([r,c]);
  }
  return empties.length? empties[rnd(empties.length)] : null;
}
function freezeRandomCell(){
  const cands=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const k=r+','+c;
    if(board[r][c] && !iceCells.has(k) && !thornCells.has(k)) cands.push(k);
  }
  if(!cands.length) return;
  iceCells.set(cands[rnd(cands.length)], 2);
  renderGrid();
}
function spawnFog(){
  fogCenter={r:1+rnd(ROWS-2), c:1+rnd(COLS-2)};
  fogStepCount=0;
  renderGrid();
}
function driftFog(){
  if(!fogCenter) return;
  fogCenter.r=Math.max(1,Math.min(ROWS-2,fogCenter.r+rnd(3)-1));
  fogCenter.c=Math.max(1,Math.min(COLS-2,fogCenter.c+rnd(3)-1));
  renderGrid();
}
function spawnBomb(){
  const p=randEmptyKey(); if(!p) return;
  bombCell={r:p[0], c:p[1]}; bombTimer=MCFG('bomb','nhip');
  renderGrid();
}
function bombExplode(){
  const {r,c}=bombCell;
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    const nr=r+dr,nc=c+dc;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS) continue;
    const k=nr+','+nc;
    if(mountainCells.has(k)) continue;
    board[nr][nc]=null; thornCells.delete(k); iceCells.delete(k);
  }
  bombCell=null; bombRespawn=10;
  // Bom nổ = phạt điểm (không phải thua ngay) — trừ điểm nhưng không để điểm âm
  const bPh=MCFG('bomb','phat');
  const lost=Math.min(score, bPh);
  score-=lost; updateScoreUI();
  try{ sfxPenalty(); }catch(e){}
  showComboFlash(0,false,'💥 Bom nổ — mất vùng 3×3 & -'+lost+'đ!');
  renderGrid();
}
function tornadoSweep(){
  const isRow=Math.random()<0.5, idx=rnd(isRow?ROWS:COLS);
  const cells=[], colors=[];
  for(let i=0;i<(isRow?COLS:ROWS);i++){
    const r=isRow?idx:i, c=isRow?i:idx, k=r+','+c;
    if(mountainCells.has(k)||thornCells.has(k)||iceCells.has(k)||bittenCells.has(k)) continue;
    if(bombCell&&bombCell.r===r&&bombCell.c===c) continue;
    if(dragonEgg&&dragonEgg.r===r&&dragonEgg.c===c) continue;
    cells.push([r,c]);
    if(board[r][c]) colors.push(board[r][c]);
  }
  if(!colors.length) return;
  cells.forEach(([r,c])=>{ board[r][c]=null; delete cellPlacedAt[r+','+c]; });
  const spots=cells.slice();
  while(colors.length && spots.length){
    const [r,c]=spots.splice(rnd(spots.length),1)[0];
    board[r][c]=colors.pop();
    cellPlacedAt[r+','+c]=placeCounter; // ô vừa bị lốc thổi tới — tính là mới
  }
  showComboFlash(0,false,'🌪️ Lốc xoáy càn qua '+(isRow?'hàng':'cột')+' '+(idx+1)+'!');
  renderGrid();
}
function spawnEgg(){
  const p=randEmptyKey(); if(!p) return;
  dragonEgg={r:p[0], c:p[1], shell:EGG_SHELL, hatch:MCFG('egg','nhip')};
  renderGrid();
}
function eggHatchBurn(){
  const row=dragonEgg.r;
  for(let c=0;c<COLS;c++){
    const k=row+','+c;
    if(mountainCells.has(k)) continue;
    board[row][c]=null; thornCells.delete(k); iceCells.delete(k);
  }
  dragonEgg=null; eggRespawn=12;
  try{ sfxGameOver(); }catch(e){}
  showComboFlash(0,false,'🐲 Rồng con nở — thiêu rụi cả hàng '+(row+1)+'!');
  renderGrid();
}

/* ── VÒNG 9-20 — các cơ chế nâng cao, cộng dồn và hiểm dần ── */
// 🕷️ V9 — nhện: giăng tơ KHÓA 1 khối trong khay 3 bước; nổ trúng ô nhện 5 lần để diệt
let spider=null; // {r,c,hp}
let spiderStepCount=0, spiderRespawn=0, spiderWebbedIdx=-1, spiderWebbedLeft=0;
const SPIDER_WEB_LOCK=3;
// 🌧️ V10 — mây mưa: rửa trôi màu 1 ô trong cột nó đứng → ô xám chết (chỉ xóa bằng hàng)
let cloudCol=-1, cloudStepCount=0;
const WASHED_COLOR='#8a8f98';
// 🦎 V11 — tắc kè: lén đổi màu 2 ô mỗi 8 bước
let chamStepCount=0;
// 🕳️ V12 — hố đen: nuốt ô màu gần nhất mỗi 10 bước; nổ kề 3 lần để phong ấn
let blackHole=null; // {r,c,eaten,seals}
let bhStepCount=0, bhRespawn=0;
const BH_SEALS=3;
// 👻 V13 — bóng ma: nhập vào 1 ô và HIỂN THỊ MÀU GIẢ; nổ trúng để trừ tà
let ghostCell=null; // {r,c,disguise}
let ghostStepCount=0, ghostRespawn=0;
// 🐌 V14 — ốc sên: bò 1 ô/bước, để vệt nhớt chặn đặt khối 4 bước; nổ kề 2 lần để diệt
let snail=null; // {r,c,hits}
let slimeCells=new Map(); // key -> số bước còn dính
let snailRespawn=0;
const SLIME_LAST=4, SNAIL_HITS=2;
// 🧱 V15 — tường gạch: mỗi 14 bước rơi 1 đoạn tường 1×3; bào mòn như núi
let wallCells=new Set();
let wallStepCount=0;
// ⚡ V16 — sét: cảnh báo trước 3 bước rồi đánh sạch vùng 2×2 (không gỡ được)
let lightning=null; // {r,c,countdown}
let lightningStepCount=0;
const LIGHTNING_WARN=3;
// 🐍 V17 — rắn thần: thân 3 ô trườn mỗi bước, ăn ô màu nó bò lên; nổ trúng thân 5 lần
let snakeSpirit=null; // {cells:[[r,c]...], hp}
let snakeSpiritRespawn=0;
// 🌋 V18 — núi lửa: khi còn núi, mỗi 15 bước phun 3 tảng đá thành tường
let volcanoStepCount=0;
// 🌀 V19 — cổng dịch chuyển: mỗi 5 bước dịch 1 ô màu đi chỗ khác; nổ kề cổng 3 lần để đóng
let portalA=null, portalB=null, portalHits=0;
let portalStepCount=0, portalRespawn=0;
const PORTAL_SEALS=3;
// 🐲 V20 — VUA RỒNG: mỗi 12 bước tung 1 đòn ngẫu nhiên; nổ trúng 15 lần để hạ
let dragonKing=null; // {r,c,hp}
let dkStepCount=0, dkRespawn=0;

// 🪞 V41 — THẾ GIỚI GƯƠNG: mỗi khối người chơi đặt xuống sẽ tự sinh 1 khối đối xứng
// qua trục dọc giữa bàn cờ (cột c ↔ cột COLS-1-c). Nếu khối đối xứng không có chỗ đặt → thua.
let mirrorCells=new Set();       // các ô do khối đối xứng (không phải người chơi) lấp vào — để tô viền riêng
let mirrorCombo=0;               // số lần liên tiếp khối đối xứng đặt thành công (dùng để thưởng Mirror Break)
let mirrorBreakCharges=0;        // số lượt "Mirror Break" người chơi đang có sẵn để dùng
let mirrorBreakPending=false;    // đã bấm dùng Mirror Break cho LƯỢT ĐẶT KẾ TIẾP hay chưa
const MIRROR_COMBO_FOR_CHARGE=4; // cứ 4 lần đối xứng thành công liên tiếp → +1 Mirror Break

function mirrorCol(c){ return COLS-1-c; }

// API đề xuất: được gọi ngay sau khi placeAt() đặt khối của người chơi thành công.
// placedCells: mảng [r,c] các ô vừa được người chơi lấp; color: màu khối vừa đặt.
function placePlayerPiece(placedCells,color){
  updateMirrorBreakUI();
  if(mirrorBreakPending){
    mirrorBreakPending=false;
    showComboFlash(0,false,'🪞 Mirror Break — lượt này không sinh khối đối xứng!');
    updateMirrorBreakUI();
    return;
  }
  spawnMirrorPiece(placedCells,color);
}

// Sinh khối đối xứng: phản chiếu từng ô vừa đặt qua trục dọc giữa bàn cờ.
function spawnMirrorPiece(placedCells,color){
  const placedSet=new Set(placedCells.map(([r,c])=>r+','+c));
  const mirrorTarget=placedCells
    .map(([r,c])=>[r,mirrorCol(c)])
    .filter(([r,c])=>!placedSet.has(r+','+c)); // ô trùng tâm đối xứng thì đã tự đúng, khỏi cần lấp lại
  if(!checkMirrorCollision(mirrorTarget)){
    triggerMirrorGameOver();
    return;
  }
  placeCounter++;
  mirrorTarget.forEach(([r,c])=>{
    board[r][c]=color;
    cellPlacedAt[r+','+c]=placeCounter;
    mirrorCells.add(r+','+c);
  });
  renderGrid();
  updateMirrorCombo(true);
}

// Trả về true nếu TOÀN BỘ ô của khối đối xứng đều còn trống & không bị mechanic khác chiếm.
function checkMirrorCollision(mirrorTarget){
  return mirrorTarget.every(([r,c])=>
    r>=0&&r<ROWS&&c>=0&&c<COLS&&!board[r][c]&&!cellBlockedForPlacement(r,c));
}

function triggerMirrorGameOver(){
  sfxGameOver();
  document.getElementById('go-score').textContent='Điểm của bạn: '+score.toLocaleString()+' — 🪞 Khối đối xứng không còn chỗ đặt!';
  document.getElementById('game-over-overlay').classList.add('show');
}

// Theo dõi chuỗi đặt-đối-xứng-thành-công liên tiếp; cứ đủ mốc lại thưởng 1 Mirror Break.
function updateMirrorCombo(success){
  if(success){
    mirrorCombo++;
    if(mirrorCombo>0 && mirrorCombo%MIRROR_COMBO_FOR_CHARGE===0){
      mirrorBreakCharges++;
      showComboFlash(0,false,'🪞 Nhận được 1 Mirror Break!');
    }
  } else {
    mirrorCombo=0;
  }
  updateMirrorBreakUI();
}

function useMirrorBreak(){
  if(mirrorBreakCharges<=0||mirrorBreakPending) return;
  mirrorBreakCharges--; mirrorBreakPending=true;
  showHint('🪞 Đã kích hoạt Mirror Break — lượt đặt tiếp theo sẽ không sinh khối đối xứng!');
  updateMirrorBreakUI();
}

function updateMirrorBreakUI(){
  const btn=document.getElementById('mirror-break-btn');
  if(!btn) return;
  const active=tierActive(21);
  btn.style.display=active?'flex':'none';
  if(!active) return;
  btn.disabled=mirrorBreakCharges<=0||mirrorBreakPending;
  btn.textContent=mirrorBreakPending?'🪞 Đang chờ áp dụng…':'🪞 Mirror Break ×'+mirrorBreakCharges;
}

function spawnSpider(){ const p=randEmptyKey(); if(!p) return; spider={r:p[0],c:p[1],hp:MCFG('spider','hp')}; spiderStepCount=0; renderGrid(); }
function spiderWebPiece(){
  const cands=pieces.map((p,i)=>(!p.used&&i!==spiderWebbedIdx)?i:-1).filter(i=>i>=0);
  if(!cands.length) return;
  spiderWebbedIdx=cands[rnd(cands.length)]; spiderWebbedLeft=SPIDER_WEB_LOCK;
  showHint('🕷️ Nhện giăng tơ khóa 1 khối — chờ '+SPIDER_WEB_LOCK+' bước hoặc diệt nhện!');
  renderPieces();
}
function cloudWash(){
  if(cloudCol<0) cloudCol=rnd(COLS);
  const cands=[];
  for(let r=0;r<ROWS;r++){
    const k=r+','+cloudCol;
    if(board[r][cloudCol] && board[r][cloudCol]!==WASHED_COLOR && !iceCells.has(k) && !thornCells.has(k)) cands.push(r);
  }
  if(cands.length){ board[cands[rnd(cands.length)]][cloudCol]=WASHED_COLOR; }
  cloudCol=rnd(COLS); // mây trôi sang cột khác
  renderGrid();
}
function chameleonRepaint(){
  const cands=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const k=r+','+c;
    if(board[r][c] && board[r][c]!==WASHED_COLOR && !iceCells.has(k) && !thornCells.has(k)) cands.push([r,c]);
  }
  for(let i=0;i<2 && cands.length;i++){
    const [r,c]=cands.splice(rnd(cands.length),1)[0];
    board[r][c]=rndColor();
  }
  renderGrid();
}
function spawnBlackHole(){ const p=randEmptyKey(); if(!p) return; blackHole={r:p[0],c:p[1],eaten:0,seals:0}; bhStepCount=0; renderGrid(); }
function blackHoleSwallow(){
  let bestD=1e9,best=null;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!board[r][c]) continue;
    const d=Math.abs(r-blackHole.r)+Math.abs(c-blackHole.c);
    if(d<bestD){ bestD=d; best=[r,c]; }
  }
  if(best){
    const k=best[0]+','+best[1];
    board[best[0]][best[1]]=null; thornCells.delete(k); iceCells.delete(k);
    blackHole.eaten++;
    if(blackHole.eaten>=6){ blackHole=null; bhRespawn=15; showComboFlash(0,false,'🕳️ Hố đen no nê rồi biến mất!'); }
  }
  renderGrid();
}
function spawnGhost(){
  const cands=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(board[r][c]&&board[r][c]!==WASHED_COLOR) cands.push([r,c]);
  if(!cands.length){ ghostRespawn=3; return; }
  const [r,c]=cands[rnd(cands.length)];
  let dis; do{ dis=rndColor(); }while(dis===board[r][c]);
  ghostCell={r,c,disguise:dis};
  ghostStepCount=0; renderGrid();
}
function spawnSnail(){ const p=randEmptyKey(); if(!p) return; snail={r:p[0],c:p[1],hits:0}; renderGrid(); }
function snailCrawl(){
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dr,dc])=>{
    const nr=snail.r+dr,nc=snail.c+dc;
    return nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!mountainCells.has(nr+','+nc)&&!wallCells.has(nr+','+nc);
  });
  if(dirs.length){
    const [dr,dc]=dirs[rnd(dirs.length)];
    snail.r+=dr; snail.c+=dc;
    const k=snail.r+','+snail.c;
    if(!board[snail.r][snail.c]) slimeCells.set(k,SLIME_LAST); // nhớt chỉ dính ô trống
  }
  renderGrid();
}
function dropWall(){
  const isRow=Math.random()<0.5;
  const r0=rnd(ROWS), c0=rnd(COLS);
  let placed=0;
  for(let i=0;i<3;i++){
    const r=isRow?r0:Math.min(ROWS-1,r0+i), c=isRow?Math.min(COLS-1,c0+i):c0;
    const k=r+','+c;
    if(!board[r][c] && !mountainCells.has(k) && !wallCells.has(k) && !bittenCells.has(k)
       && !(bombCell&&bombCell.r===r&&bombCell.c===c) && !(dragonEgg&&dragonEgg.r===r&&dragonEgg.c===c)
       && !(blackHole&&blackHole.r===r&&blackHole.c===c)){ wallCells.add(k); placed++; }
  }
  if(placed) renderGrid();
}
function lightningStrike(){
  for(let dr=0;dr<2;dr++)for(let dc=0;dc<2;dc++){
    const nr=lightning.r+dr,nc=lightning.c+dc;
    if(nr>=ROWS||nc>=COLS) continue;
    const k=nr+','+nc;
    if(mountainCells.has(k)||wallCells.has(k)) continue;
    board[nr][nc]=null; thornCells.delete(k); iceCells.delete(k);
  }
  lightning=null;
  try{ sfxPenalty(); }catch(e){}
  showComboFlash(0,false,'⚡ Sét đánh trúng bàn cờ!');
  renderGrid();
}
function spawnSnakeSpirit(){
  const p=randEmptyKey(); if(!p) return;
  snakeSpirit={cells:[[p[0],p[1]],[p[0],p[1]],[p[0],p[1]]], hp:MCFG('snakeSpirit','hp')};
  renderGrid();
}
function snakeSpiritSlither(){
  const [hr,hc]=snakeSpirit.cells[0];
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dr,dc])=>{
    const nr=hr+dr,nc=hc+dc;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS) return false;
    const k=nr+','+nc;
    if(mountainCells.has(k)||wallCells.has(k)) return false;
    return !snakeSpirit.cells.some(([sr,sc])=>sr===nr&&sc===nc);
  });
  if(!dirs.length) return;
  const [dr,dc]=dirs[rnd(dirs.length)];
  const nr=hr+dr,nc=hc+dc;
  if(board[nr][nc]){ board[nr][nc]=null; thornCells.delete(nr+','+nc); iceCells.delete(nr+','+nc); } // ăn ô màu
  snakeSpirit.cells.unshift([nr,nc]); snakeSpirit.cells.pop();
  renderGrid();
}
function volcanoErupt(){
  let dropped=0;
  for(let i=0;i<3;i++){
    const p=randEmptyKey(); if(!p) break;
    wallCells.add(p[0]+','+p[1]); dropped++;
  }
  if(dropped){
    try{ sfxPenalty(); }catch(e){}
    showComboFlash(0,false,'🌋 Núi lửa phun '+dropped+' tảng đá!');
    renderGrid();
  }
}
function spawnPortals(){
  const a=randEmptyKey(); if(!a) return;
  portalA={r:a[0],c:a[1]};
  const b=randEmptyKey();
  if(!b){ portalA=null; return; }
  portalB={r:b[0],c:b[1]};
  portalHits=0; portalStepCount=0;
  renderGrid();
}
function portalTeleport(){
  const filled=[], empt=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const k=r+','+c;
    if(board[r][c]&&!iceCells.has(k)&&!thornCells.has(k)) filled.push([r,c]);
    else if(!board[r][c]&&!cellBlockedForPlacement(r,c)) empt.push([r,c]);
  }
  if(!filled.length||!empt.length) return;
  const [fr,fc]=filled[rnd(filled.length)];
  const [er,ec]=empt[rnd(empt.length)];
  board[er][ec]=board[fr][fc]; board[fr][fc]=null;
  cellPlacedAt[er+','+ec]=placeCounter; delete cellPlacedAt[fr+','+fc]; // ô dịch chuyển tới tính là mới
  renderGrid();
}
function spawnDragonKing(){
  const p=randEmptyKey(); if(!p) return;
  dragonKing={r:p[0],c:p[1],hp:MCFG('dk','hp')};
  dkStepCount=0; renderGrid();
}
function dragonKingAttack(){
  const atk=rnd(4);
  if(atk===0){ // đốt 1 hàng ngẫu nhiên
    const row=rnd(ROWS);
    for(let c=0;c<COLS;c++){
      const k=row+','+c;
      if(mountainCells.has(k)||wallCells.has(k)) continue;
      board[row][c]=null; thornCells.delete(k); iceCells.delete(k);
    }
    showComboFlash(0,false,'🐲 Vua Rồng thiêu rụi hàng '+(row+1)+'!');
  } else if(atk===1){ // đóng băng 3 ô
    for(let i=0;i<3;i++) freezeRandomCell();
    showComboFlash(0,false,'🐲 Vua Rồng thổi băng giá!');
  } else if(atk===2){ // gieo 2 gai
    const cands=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const k=r+','+c;
      if(board[r][c]&&!thornCells.has(k)&&!iceCells.has(k)) cands.push(k);
    }
    for(let i=0;i<2&&cands.length;i++) thornCells.add(cands.splice(rnd(cands.length),1)[0]);
    showComboFlash(0,false,'🐲 Vua Rồng gieo dây gai!');
  } else { // trộm 3 ô màu
    for(let i=0;i<3;i++){
      const cands=[];
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(board[r][c]) cands.push([r,c]);
      if(!cands.length) break;
      const [r,c]=cands[rnd(cands.length)];
      board[r][c]=null; thornCells.delete(r+','+c); iceCells.delete(r+','+c);
    }
    showComboFlash(0,false,'🐲 Vua Rồng cướp ô màu!');
  }
  try{ sfxPenalty(); }catch(e){}
  renderGrid();
}

// 🔒 Xoá sạch trạng thái của MỌI cơ chế. Gọi trước khi kích hoạt cơ chế của vòng mới
// để đảm bảo mỗi vòng chỉ có ĐÚNG 1 cơ chế đang hoạt động, không cộng dồn với vòng trước.
function resetMechanicState(){
  thornMode=false; thornCells=new Set(); cellBurstCount={}; thornPlacementCount=0; thornWave=0; thornThreshold=6;
  mountainCells=new Set(); mountainStepCount=0; mountainRespawn=0;
  squirrel=null; squirrelStepCount=0; squirrelMoveCount=0; squirrelStolen=0; squirrelRespawn=0; bittenCells=new Set();
  iceCells=new Map(); iceStepCount=0;
  fogCenter=null; fogStepCount=0; fogCooldown=0;
  bombCell=null; bombTimer=0; bombRespawn=0;
  tornadoStepCount=0;
  dragonEgg=null; eggRespawn=0;
  spider=null; spiderStepCount=0; spiderRespawn=0; spiderWebbedIdx=-1; spiderWebbedLeft=0;
  cloudCol=-1; cloudStepCount=0;
  chamStepCount=0;
  blackHole=null; bhStepCount=0; bhRespawn=0;
  ghostCell=null; ghostStepCount=0; ghostRespawn=0;
  snail=null; slimeCells=new Map(); snailRespawn=0;
  wallCells=new Set(); wallStepCount=0;
  lightning=null; lightningStepCount=0;
  snakeSpirit=null; snakeSpiritRespawn=0;
  volcanoStepCount=0;
  portalA=null; portalB=null; portalHits=0; portalStepCount=0; portalRespawn=0;
  dragonKing=null; dkStepCount=0; dkRespawn=0;
  mirrorCells=new Set(); mirrorCombo=0; mirrorBreakCharges=0; mirrorBreakPending=false;
  renderGrid();
  updateMirrorBreakUI();
}
// Mỗi vòng (v1→v20) chỉ có ĐÚNG MỘT cơ chế ẩn mới, không trùng/cộng dồn với vòng trước.
// vòng 1: dây gai · vòng 2: núi · vòng 3: sóc trộm ô · ... · vòng 20: Vua Rồng
function applyRoundMechanics(){
  if(tierActive(1) && !thornMode){
    thornMode=true; thornPlacementCount=0; thornWave=0; thornThreshold=6;
    thornCells=new Set(); cellBurstCount={};
    setTimeout(()=>showComboFlash(0,false,'🌿 Dây gai xuất hiện trên bàn cờ!'), 900);
  }
  if(tierActive(2) && mountainCells.size===0 && mountainRespawn<=0){
    spawnMountain();
    setTimeout(()=>showComboFlash(0,false,'⛰️ Ngọn núi nhỏ xuất hiện — đừng để nó lớn!'), 1600);
  }
  if(tierActive(3) && !squirrel){
    spawnSquirrel();
    setTimeout(()=>showComboFlash(0,false,'🐿️ Con sóc trộm ô xuất hiện — nổ trúng nó hoặc ô kề bên '+MCFG('squirrel','hp')+' lần!'), 2300);
  }
  if(tierActive(4)) announceMech('ice','🧊 Băng giá: ô đóng băng phải nổ 2 lần mới vỡ!', 3000);
  if(tierActive(5)){
    if(!fogCenter && fogCooldown<=0) spawnFog();
    announceMech('fog','🌫️ Sương mù che khuất màu — hãy ghi nhớ!', 3700);
  }
  if(tierActive(6)){
    if(!bombCell && bombRespawn<=0) spawnBomb();
    announceMech('bomb','💣 Bom hẹn giờ! Nổ ô kề bên để gỡ trước khi nổ!', 4400);
  }
  if(tierActive(7)) announceMech('tornado','🌪️ Coi chừng lốc xoáy xáo trộn bàn cờ!', 5100);
  if(tierActive(8)){
    if(!dragonEgg && eggRespawn<=0) spawnEgg();
    announceMech('egg','🥚 Trứng rồng xuất hiện — đập vỡ trước khi nó nở!', 5800);
  }
  if(tierActive(9)){
    if(!spider && spiderRespawn<=0) spawnSpider();
    announceMech('spider','🕷️ Nhện giăng tơ khóa khối gạch của bạn!', 6500);
  }
  if(tierActive(10)){
    if(cloudCol<0) cloudCol=rnd(COLS);
    announceMech('cloud','🌧️ Mây mưa rửa trôi màu ô thành ô xám!', 7200);
  }
  if(tierActive(11)) announceMech('cham','🦎 Tắc kè lén đổi màu ô — cẩn thận!', 7900);
  if(tierActive(12)){
    if(!blackHole && bhRespawn<=0) spawnBlackHole();
    announceMech('bh','🕳️ Hố đen nuốt ô — nổ kề bên 3 lần để phong ấn!', 8600);
  }
  if(tierActive(13)){
    if(!ghostCell && ghostRespawn<=0) spawnGhost();
    announceMech('ghost','👻 Bóng ma giả dạng màu ô — đừng tin vào mắt mình!', 9300);
  }
  if(tierActive(14)){
    if(!snail && snailRespawn<=0) spawnSnail();
    announceMech('snail','🐌 Ốc sên để lại vệt nhớt chặn ô trống!', 10000);
  }
  if(tierActive(15)) announceMech('wall','🧱 Tường gạch sẽ rơi xuống bàn cờ!', 10700);
  if(tierActive(16)) announceMech('lightning','⚡ Sét đánh — tránh xa vùng cảnh báo!', 11400);
  if(tierActive(17)){
    if(!snakeSpirit && snakeSpiritRespawn<=0) spawnSnakeSpirit();
    announceMech('snakespirit','🐍 Rắn thần trườn qua nuốt ô màu!', 12100);
  }
  if(tierActive(18)){
    if(mountainCells.size===0 && mountainRespawn<=0) spawnMountain(); // đỉnh núi lửa riêng của vòng 18
    announceMech('volcano','🌋 Núi lửa xuất hiện — sẽ phun đá quanh bàn cờ!', 12800);
  }
  if(tierActive(19)){
    if(!portalA && portalRespawn<=0) spawnPortals();
    announceMech('portal','🌀 Cổng dịch chuyển tráo đổi ô màu!', 13500);
  }
  if(tierActive(20)){
    if(!dragonKing && dkRespawn<=0) spawnDragonKing();
    announceMech('dk','🐲 VUA RỒNG GIÁNG THẾ — thử thách tối thượng!', 14200);
  }
  if(tierActive(21)){
    updateMirrorBreakUI();
    announceMech('mirror','🪞 THẾ GIỚI GƯƠNG — mỗi khối bạn đặt sẽ tự sinh 1 khối đối xứng qua trục giữa. Đối xứng không có chỗ đặt → thua!', 14900);
  }
  if(isComboTier(mainHardTier)){
    const [a,b]=comboPairForTier(mainHardTier);
    announceMech('combo'+mainHardTier,
      '🌗 Vòng '+mainHardTier+' — Cơ chế đôi: '+ROUND_MECH_NAMES[a]+' + '+ROUND_MECH_NAMES[b]+'!', 700);
  }
}
function spawnMountain(){
  const empties=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(!board[r][c]) empties.push(r+','+c);
  if(!empties.length) return;
  mountainCells=new Set([empties[rnd(empties.length)]]);
  mountainStepCount=0;
  renderGrid();
}
function growMountain(){
  const cands=[];
  mountainCells.forEach(k=>{
    const [r,c]=k.split(',').map(Number);
    for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const nr=r+dr,nc=c+dc,nk=nr+','+nc;
      if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!mountainCells.has(nk)) cands.push(nk);
    }
  });
  if(!cands.length) return;
  const nk=cands[rnd(cands.length)];
  mountainCells.add(nk);
  const [r,c]=nk.split(',').map(Number);
  board[r][c]=null; // núi lan tới đâu nuốt ô tới đó
  thornCells.delete(nk); iceCells.delete(nk);
  renderGrid();
}
function spawnSquirrel(){
  squirrel={r:rnd(ROWS), c:rnd(COLS), hp:MCFG('squirrel','hp')};
  squirrelStepCount=0; squirrelMoveCount=0; squirrelStolen=0;
  renderGrid();
}
// Sóc di chuyển ngẫu nhiên, mỗi lượt chỉ đi 1 ô (lên/xuống/trái/phải, không đi chéo, không ra ngoài bàn cờ,
// và KHÔNG được nhảy vào ô đã bị gặm trước đó). Trả về true nếu di chuyển được, false nếu hoàn toàn không còn chỗ đi.
function squirrelStepTo1AdjacentCell(){
  if(!squirrel) return false;
  const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
  const options=[];
  for(const [dr,dc] of dirs){
    const nr=squirrel.r+dr, nc=squirrel.c+dc;
    if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS && !bittenCells.has(nr+','+nc)) options.push([nr,nc]);
  }
  if(options.length){
    const [nr,nc]=options[rnd(options.length)];
    squirrel.r=nr; squirrel.c=nc;
    return true;
  }
  // Bị vây tứ phía toàn ô đã gặm → sóc dịch chuyển sang 1 ô bất kỳ còn lại trên bàn cờ (chưa bị gặm)
  const free=[];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(!(r===squirrel.r && c===squirrel.c) && !bittenCells.has(r+','+c)) free.push([r,c]);
  }
  if(free.length){
    const [nr,nc]=free[rnd(free.length)];
    squirrel.r=nr; squirrel.c=nc;
    return true;
  }
  return false; // cả bàn cờ đã bị gặm hết (gần như không thể xảy ra) → đứng yên
}
// Gặm 1 ô cụ thể — dùng cho ô sóc VỪA RỜI ĐI (không phải ô nó đang đứng)
function squirrelBiteCell(r,c){
  if(!board[r][c] || mountainCells.has(r+','+c)) return; // ô trống/có núi → không có gì để gặm
  const k=r+','+c;
  board[r][c]=null; thornCells.delete(k); iceCells.delete(k); // trộm mất ô màu
  bittenCells.add(k); // để lại khung ô đã bị gặm — không đặt khối lên được nữa, sóc cũng không quay lại ô này nữa
  squirrelStolen=bittenCells.size;
  try{ sfxPenalty(); }catch(e){}
  showHint('🐿️ Sóc đã gặm '+bittenCells.size+'/'+MCFG('squirrel','limit')+' ô — diệt nó để phục hồi!');
  if(bittenCells.size>=MCFG('squirrel','limit')){
    renderGrid();
    sfxGameOver();
    showComboFlash(0,false,'🐿️ Sóc đã gặm nát bàn cờ!');
    document.getElementById('go-score').textContent='Điểm của bạn: '+score.toLocaleString();
    document.getElementById('game-over-overlay').classList.add('show');
  }
}
function squirrelMoveAndSteal(){
  if(!squirrel) return;
  const prevR=squirrel.r, prevC=squirrel.c;
  const moved=squirrelStepTo1AdjacentCell();
  if(!moved){ renderGrid(); return; } // bị vây bởi các ô đã gặm → đứng yên, không tính vào 3 lượt di chuyển
  squirrelMoveCount++;
  if(squirrelMoveCount>=3){
    squirrelMoveCount=0;
    squirrelBiteCell(prevR,prevC); // gặm đúng ô nó VỪA RỜI ĐI, không phải ô mới tới
  }
  renderGrid();
}



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
let megaMode=false, megaRAF=null, megaWon=false;
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
let mainHardTier=0; // số vòng map ẩn đã thắng — map thường khó dần theo mỗi vòng
// ══════════════════════════════════════════
// 🌗 VÒNG 21-40 — CƠ CHẾ ĐÔI (kết hợp 2 cơ chế đơn liền kề của vòng 1-20)
// vòng 21 = cơ chế(1)+cơ chế(2) · vòng 22 = cơ chế(2)+cơ chế(3) · ... ·
// vòng 39 = cơ chế(19)+cơ chế(20) · vòng 40 = cơ chế(20)+cơ chế(1)  → 20 cặp, không cặp nào trùng nhau.
const ROUND_MECH_NAMES=['','🌿 Dây gai','⛰️ Núi đá','🐿️ Sóc trộm ô','🧊 Băng giá','🌫️ Sương mù','💣 Bom hẹn giờ','🌪️ Lốc xoáy','🥚 Trứng rồng','🕷️ Nhện giăng tơ','🌧️ Mây mưa','🦎 Tắc kè hoa','🕳️ Hố đen','👻 Bóng ma','🐌 Ốc sên','🧱 Tường gạch','⚡ Sét đánh','🐍 Rắn thần','🌋 Núi lửa','🌀 Cổng dịch chuyển','🐲 Vua Rồng','🪞 Thế giới gương'];
function comboPairForTier(t){ // t trong 21..40 → [a,b] là 2 vòng cơ chế gốc (1-20)
  const i=t-21, a=i+1, b=(i+1)%20+1;
  return [a,b];
}
function isComboTier(t){ return t>=21 && t<=40; }
// Trả về true nếu cơ chế gốc số baseN đang cần hoạt động ở vòng hiện tại (đơn hoặc đôi)
function tierActive(baseN){
  if(baseN===21) return mainHardTier===41; // 🪞 Thế giới gương — vòng đơn 41 (sau khi hết 20 vòng đôi 21-40)
  if(mainHardTier===baseN) return true;
  if(isComboTier(mainHardTier)){
    const [a,b]=comboPairForTier(mainHardTier);
    return baseN===a || baseN===b;
  }
  return false;
}
// 🌗 Cổng tiến trình cho vòng 21-40: phải kiếm đủ điểm ở vòng hiện tại mới được
// bước sang vòng kế tiếp — tuần tự từng vòng một, không nhảy cóc.
let comboGateActive=false;   // đang đếm điểm để vượt qua vòng cơ chế đôi hiện tại?
let comboGateBaseline=0;     // mốc điểm map thường lúc bắt đầu vòng hiện tại
let maxComboTierReached=getSavedComboTier();  // vòng cơ chế đôi cao nhất người chơi từng ĐẠT TỚI (dùng để mở khoá hướng dẫn)
function comboThresholdForTier(tier){ // điểm cần kiếm THÊM ở vòng `tier` để mở vòng tier+1
  return 200 + (tier-20)*50; // vòng 20→21 cần 200đ, càng về sau càng khó (mỗi vòng +50đ)
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
  if(thornMode){
    thornPlacementCount++;
    if(thornPlacementCount>=thornThreshold){
      thornPlacementCount=0;
      thornWave++;
      thornThreshold=Math.max(3,6-thornWave);
      spawnThorns();
    }
  }
  // ⛰️ núi lớn dần theo bước đặt khối (CHỈ vòng 2)
  if(tierActive(2)){
    if(mountainCells.size>0){
      mountainStepCount++;
      if(mountainStepCount>=MCFG('mountain','nhip')){ mountainStepCount=0; growMountain(); }
    } else if(mountainRespawn>0 && --mountainRespawn<=0){
      spawnMountain();
    }
  }
  // 🐿️ sóc di chuyển & trộm ô theo bước (CHỈ vòng 3)
  if(tierActive(3)){
    if(squirrel){
      squirrelStepCount++;
      if(squirrelStepCount>=MCFG('squirrel','nhip')){ squirrelStepCount=0; squirrelMoveAndSteal(); }
    } else if(squirrelRespawn>0 && --squirrelRespawn<=0){
      // Sóc đã bị diệt — nếu 6 bước trôi qua mà không có sóc mới thì tự xuất hiện con khác
      spawnSquirrel();
      showComboFlash(0,false,'🐿️ Một con sóc khác lại xuất hiện!');
    }
  }
  // 🧊 đóng băng ô mới theo chu kỳ (CHỈ vòng 4)
  if(tierActive(4)){
    iceStepCount++;
    if(iceStepCount>=MCFG('ice','nhip')){ iceStepCount=0; freezeRandomCell(); }
  }
  // 🌫️ sương mù trôi / tan rồi tụ lại (CHỈ vòng 5)
  if(tierActive(5)){
    if(fogCenter){
      fogStepCount++;
      if(fogStepCount>=MCFG('fog','nhip')){ fogStepCount=0; driftFog(); }
    } else if(fogCooldown>0 && --fogCooldown<=0){
      spawnFog();
    }
  }
  // 💣 bom đếm ngược / mọc lại (CHỈ vòng 6)
  if(tierActive(6)){
    if(bombCell){
      bombTimer--;
      if(bombTimer<=0) bombExplode();
    } else if(bombRespawn>0 && --bombRespawn<=0){
      spawnBomb();
    }
  }
  // 🌪️ lốc xoáy theo chu kỳ (CHỈ vòng 7)
  if(tierActive(7)){
    tornadoStepCount++;
    if(tornadoStepCount>=MCFG('tornado','nhip')){ tornadoStepCount=0; tornadoSweep(); }
  }
  // 🥚 trứng rồng ấp / mọc lại (CHỈ vòng 8)
  if(tierActive(8)){
    if(dragonEgg){
      dragonEgg.hatch--;
      if(dragonEgg.hatch<=0) eggHatchBurn();
    } else if(eggRespawn>0 && --eggRespawn<=0){
      spawnEgg();
    }
  }
  // 🕷️ nhện giăng tơ khay + gỡ tơ dần (CHỈ vòng 9)
  if(tierActive(9)){
    if(spiderWebbedLeft>0 && --spiderWebbedLeft<=0){ spiderWebbedIdx=-1; renderPieces(); }
    if(spider){
      spiderStepCount++;
      if(spiderStepCount>=MCFG('spider','nhip')){ spiderStepCount=0; spiderWebPiece(); }
    } else if(spiderRespawn>0 && --spiderRespawn<=0){
      spawnSpider();
    }
  }
  // 🌧️ mây mưa rửa màu (CHỈ vòng 10)
  if(tierActive(10)){
    cloudStepCount++;
    if(cloudStepCount>=MCFG('cloud','nhip')){ cloudStepCount=0; cloudWash(); }
  }
  // 🦎 tắc kè đổi màu lén (CHỈ vòng 11)
  if(tierActive(11)){
    chamStepCount++;
    if(chamStepCount>=MCFG('cham','nhip')){ chamStepCount=0; chameleonRepaint(); }
  }
  // 🕳️ hố đen nuốt ô (CHỈ vòng 12)
  if(tierActive(12)){
    if(blackHole){
      bhStepCount++;
      if(bhStepCount>=MCFG('bh','nhip')){ bhStepCount=0; blackHoleSwallow(); }
    } else if(bhRespawn>0 && --bhRespawn<=0){
      spawnBlackHole();
    }
  }
  // 👻 bóng ma di chuyển / đổi màu giả (CHỈ vòng 13)
  if(tierActive(13)){
    if(ghostCell){
      if(!board[ghostCell.r][ghostCell.c]){ ghostCell=null; ghostRespawn=3; } // ô ma nhập đã biến mất
      else {
        ghostStepCount++;
        if(ghostStepCount>=MCFG('ghost','nhip')){ ghostStepCount=0; spawnGhost(); }
      }
    } else if(ghostRespawn>0 && --ghostRespawn<=0){
      spawnGhost();
    }
  }
  // 🐌 ốc sên bò + nhớt bay hơi (CHỈ vòng 14)
  if(tierActive(14)){
    slimeCells.forEach((v,k)=>{ if(v<=1) slimeCells.delete(k); else slimeCells.set(k,v-1); });
    if(snail) snailCrawl();
    else if(snailRespawn>0 && --snailRespawn<=0) spawnSnail();
  }
  // 🧱 tường rơi (CHỈ vòng 15)
  if(tierActive(15)){
    wallStepCount++;
    if(wallStepCount>=MCFG('wall','nhip')){ wallStepCount=0; dropWall(); }
  }
  // ⚡ sét: cảnh báo rồi đánh (CHỈ vòng 16)
  if(tierActive(16)){
    if(lightning){
      lightning.countdown--;
      if(lightning.countdown<=0) lightningStrike();
      else renderGrid();
    } else {
      lightningStepCount++;
      if(lightningStepCount>=MCFG('lightning','nhip')){
        lightningStepCount=0;
        lightning={r:rnd(ROWS-1), c:rnd(COLS-1), countdown:LIGHTNING_WARN};
        renderGrid();
      }
    }
  }
  // 🐍 rắn thần trườn (CHỈ vòng 17)
  if(tierActive(17)){
    if(snakeSpirit) snakeSpiritSlither();
    else if(snakeSpiritRespawn>0 && --snakeSpiritRespawn<=0) spawnSnakeSpirit();
  }
  // 🌋 núi lửa phun đá / mọc lại đỉnh (CHỈ vòng 18 — có núi riêng, không cần vòng 2)
  if(tierActive(18)){
    if(mountainCells.size>0){
      volcanoStepCount++;
      if(volcanoStepCount>=MCFG('volcano','nhip')){ volcanoStepCount=0; volcanoErupt(); }
    } else if(mountainRespawn>0 && --mountainRespawn<=0){
      spawnMountain();
    }
  }
  // 🌀 cổng dịch chuyển (CHỈ vòng 19)
  if(tierActive(19)){
    if(portalA){
      portalStepCount++;
      if(portalStepCount>=MCFG('portal','nhip')){ portalStepCount=0; portalTeleport(); }
    } else if(portalRespawn>0 && --portalRespawn<=0){
      spawnPortals();
    }
  }
  // 🐲 Vua Rồng ra đòn (CHỈ vòng 20)
  if(tierActive(20)){
    if(dragonKing){
      dkStepCount++;
      if(dkStepCount>=MCFG('dk','nhip')){ dkStepCount=0; dragonKingAttack(); }
    } else if(dkRespawn>0 && --dkRespawn<=0){
      spawnDragonKing();
    }
  }
  // 🪞 Thế giới gương (CHỈ vòng 41) — sinh khối đối xứng ngay sau khi khối của người chơi được đặt
  if(tierActive(21)){
    placePlayerPiece(_mirrorPlacedCells,_mirrorPlacedColor);
  }
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
  showScorePop(pts, _ctr.x, _ctr.y, consecutiveBursts);
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
function spawnThorns(){
  let newThorns=0;
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const key=`${r},${c}`;
      // chỉ quấn gai ô đã nằm QUÁ 5 lượt đặt khối mà chưa bị phá — khối mới đặt được tha
      const age=placeCounter-(cellPlacedAt[key]!==undefined?cellPlacedAt[key]:placeCounter);
      if(!cellBurstCount[key] && board[r][c]!==null && !thornCells.has(key) && age>THORN_MIN_AGE){
        thornCells.add(key);
        newThorns++;
      }
    }
  }
  renderGrid();
  if(newThorns>0){
    sfxThorn();
    const msg='🌿 Dây gai xuất hiện! ('+newThorns+' ô bị phong toả)';
    showComboFlash(0,false,msg);
  }
}

/* 🎆 Hiệu ứng pháo hoa viền + tia lấp lánh cho map thường */
function mainBurstFX(cells, streak){
  const big = streak >= 2;
  // Lấy màu đại diện từ ô đầu tiên trong cụm
  const firstCell = cells[0] ? getCell(cells[0][0], cells[0][1]) : null;
  const baseColor = (firstCell && firstCell.style.background) ? firstCell.style.background : '#ffd24a';

  // 1) Pháo hoa viền (dùng lại spawnBorderFireworks nhưng truyền màu map thường)
  const fx = document.getElementById('sc-fx');
  const wrap = document.getElementById('grid-wrap');
  if(fx && wrap){
    fx.classList.add('active');
    const W=wrap.clientWidth, H=wrap.clientHeight;
    const palette=[baseColor, '#ffd24a', '#ff7a3c', '#ffffff', '#ffe9a8', baseColor];
    const N = big ? 55 : 28;
    for(let i=0;i<N;i++){
      const side=i%4; const t=Math.random();
      let x,y,ang;
      if(side===0){x=t*W;y=0;ang=90;}
      else if(side===1){x=W;y=t*H;ang=180;}
      else if(side===2){x=t*W;y=H;ang=-90;}
      else{x=0;y=t*H;ang=0;}
      ang+=Math.random()*60-30;
      const dist=(big?28:18)+Math.random()*(big?55:38);
      const len=14+Math.random()*20;
      const dur=420+Math.random()*320;
      const col=palette[(Math.random()*palette.length)|0];
      const s=document.createElement('div'); s.className='spark';
      s.style.left=x+'px'; s.style.top=y+'px';
      s.style.setProperty('--ang',ang+'deg');
      s.style.setProperty('--dist',dist+'px');
      s.style.setProperty('--len',len+'px');
      s.style.setProperty('--col',col);
      s.style.animationDuration=dur+'ms';
      fx.appendChild(s);
      setTimeout(()=>{ s.remove(); if(!fx.children.length) fx.classList.remove('active'); }, dur+60);
    }
  }

  // 2) Tia lấp lánh tại từng ô nổ
  const root=document.getElementById('game-root'); if(!root) return;
  const rr=root.getBoundingClientRect();
  let budget=big?50:30;
  const per=cells.length>14?1:(cells.length>7?2:3);
  for(const [gr,gc] of cells){
    if(budget<=0) break;
    const cell=getCell(gr,gc); if(!cell) continue;
    const cr=cell.getBoundingClientRect();
    const cx=cr.left-rr.left+cr.width/2, cy=cr.top-rr.top+cr.height/2;
    const n=Math.min(per,budget); budget-=n;
    for(let k=0;k<n;k++){
      const t=document.createElement('div'); t.className='twinkle';
      t.style.left=cx+'px'; t.style.top=cy+'px';
      const col2=k%3===0?'#fff':(k%3===1?baseColor:'#ffe9a8');
      t.style.setProperty('--tc',col2);
      t.style.setProperty('--tx',(Math.random()*28-14)+'px');
      t.style.setProperty('--ty',(Math.random()*28-14)+'px');
      t.style.animationDelay=(Math.random()*0.12)+'s';
      root.appendChild(t);
      setTimeout(()=>t.remove(),740);
    }
  }
}

let unlockDeferred=false; // true khi người chơi chọn "quay lại map thường" thay vì vào map ẩn ngay

function updateBurstCount(){
  const bc=document.getElementById('burst-count');
  if(unlockDeferred){
    bc.textContent='🔓 Map ẩn đang chờ — nhấn để chơi!';
    bc.classList.add('unlock-pending');
    return;
  }
  bc.classList.remove('unlock-pending');
  if(unlockGateActive && !secretMode){
    const need=unlockThresholdForStage(unlockGateStageIndex+1);
    const earned=Math.min(Math.round(score-unlockGateBaseline), need);
    bc.textContent=
      earned>=need?'🔥 Mở khóa sẵn sàng!':
      `Tiến độ: ${earned}/${need}đ`;
  } else if(comboGateActive && !secretMode && mainHardTier>=20 && mainHardTier<41){
    const need=comboThresholdForTier(mainHardTier);
    const earned=Math.min(Math.round(score-comboGateBaseline), need);
    bc.textContent=
      earned>=need?'🌗 Sẵn sàng vượt vòng '+mainHardTier+'!':
      `Vòng ${mainHardTier}: ${earned}/${need}đ`;
  } else {
    bc.textContent=
      consecutiveBursts>=3?'🔥 Mở khóa sẵn sàng!':`Chuỗi nổ: ${consecutiveBursts}/3`;
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
      setTimeout(()=>showComboFlash(0,false,
        '🎉 Vượt qua vòng '+passedTier+'! Bước vào vòng '+mainHardTier+' — Cơ chế đôi: '
        +ROUND_MECH_NAMES[na]+' + '+ROUND_MECH_NAMES[nb]+'!'), 300);
    } else {
      setTimeout(()=>showComboFlash(0,false,
        '🎉 Vượt qua vòng '+passedTier+'! Bước vào vòng '+mainHardTier+' — '
        +ROUND_MECH_NAMES[21]+'!'), 300);
    }
  }
  if(pieces.every(p=>p.used)){
    consecutiveBursts=0; updateBurstCount();
    setTimeout(()=>{ refillPieces(); renderPieces(); checkGameOverA(); }, 220);
  } else {
    checkGameOverA();
  }
}

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
  }
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

/* ══════════════════════════════════════════
   UNLOCK TRANSITION
══════════════════════════════════════════ */
let autoSkipHiddenMaps = getAutoSkipHiddenMaps();
function showUnlockOverlay(){
  const chk=document.getElementById('unlock-autoskip-chk');
  if(chk) chk.checked=autoSkipHiddenMaps;
  if(autoSkipHiddenMaps){
    // Người chơi đã chọn tự động bỏ qua — không hiện popup nữa, chỉ để chờ mở qua "Map ẩn đang chờ"
    unlockDeferred=true;
    updateBurstCount();
    return;
  }
  document.getElementById('unlock-overlay').classList.add('show');
}
document.getElementById('unlock-autoskip-chk').addEventListener('change', e=>{
  autoSkipHiddenMaps=e.target.checked;
  saveAutoSkipHiddenMaps(autoSkipHiddenMaps);
});
function triggerUnlock(){
  pendingUnlock='secret';
  document.getElementById('unlock-title').textContent='🔥 NHIỆM VỤ ẨN MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    '3 vụ nổ liên tiếp!<br><br>'+
    'Bàn cờ màu bí ẩn xuất hiện.<br>'+
    'Bấm vào <b>3+ ô cùng màu liền kề</b> để nổ.<br>'+
    'Nổ liên tiếp trong <b>2.5 giây</b> sẽ nhân điểm.<br>'+
    'Đạt <b>'+TEST_UNLOCK_SCORE+' điểm</b> ở đây → mở khoá <b>Map ẩn 2</b>!';
  document.getElementById('unlock-btn').textContent='⚡ VÀO ĐẤU!';
  showUnlockOverlay();
}

document.getElementById('unlock-btn').addEventListener('click',()=>{
  sfxClick();
  document.getElementById('unlock-overlay').classList.remove('show');
  hiddenMapEntryScore=score; // ghi nhớ mốc điểm — thua map ẩn này sẽ mất hết điểm kiếm thêm trong ván
  if(pendingUnlock==='dodge') enterDodgeMode();
  else if(pendingUnlock==='fruit') enterFruitMode();
  else if(pendingUnlock==='bee') enterBeeMode();
  else if(pendingUnlock==='gold') enterGoldMode();
  else if(pendingUnlock==='mole') enterMoleMode();
  else if(pendingUnlock==='memory') enterMemoryMode();
  else if(pendingUnlock==='bubble') enterBubbleMode();
  else if(pendingUnlock==='stack') enterStackMode();
  else if(pendingUnlock==='boss') enterBossMode();
  else if(pendingUnlock==='catch') enterCatchMode();
  else if(pendingUnlock==='flood') enterFloodMode();
  else if(pendingUnlock==='arena') enterArenaMode();
  else if(pendingUnlock==='snake')  enterSnakeMode();
  else if(pendingUnlock==='brick')  enterBrickMode();
  else if(pendingUnlock==='runner') enterRunnerMode();
  else if(pendingUnlock==='space')  enterSpaceMode();
  else if(pendingUnlock==='rhythm') enterRhythmMode();
  else if(pendingUnlock==='maze')   enterMazeMode();
  else if(pendingUnlock==='mega')   enterMegaMode();
  else enterSecretMode();
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
   MODE B — SECRET COLOR MATCH
══════════════════════════════════════════ */
function renderSecretHearts(){
  const el=document.getElementById('secret-hearts');
  if(!el) return;
  el.textContent='❤️'.repeat(Math.max(0,secretLives))+'🖤'.repeat(Math.max(0,3-secretLives));
}

function enterSecretMode(){
  setActiveHiddenMap('secret1');
  unlockAchievement('secret1');
  endDrag();
  sfxUnlock();
  startBgm('mystery');
  secretMode=true;
  secretStreak=0;
  secretMultiplier=1;
  secretUltra=false;
  secret1Gained=0;
  secret1GoalShown=false;
  secretLives=3; secretMissStreak=0;
  document.getElementById('secret-hearts').style.display='block';
  renderSecretHearts();
  awaitingSecretUnlock=false; // đã vào rồi → không trigger lại

  // Hide mode A UI
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='none';
  showRotateBar(false);

  // Show mode B UI
  const sg=document.getElementById('secret-grid');
  sg.classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('timer-bar-wrap').classList.add('active');
  document.getElementById('secret-streak-bar').classList.add('active');
  document.getElementById('mode-badge').textContent='🔥 MAP ẨN';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='Nhân: x1';

  // (đã bỏ vòng lặp lấp lánh viền liên tục 60ms — tốn hiệu năng, gây giật máy ở Map ẩn 1)

  // reset fire on enter
  if(fireInterval){ clearInterval(fireInterval); fireInterval=null; }
  document.getElementById('grid-wrap').classList.remove('fire-low','fire-high');

  initSecretBoard();
  renderSecretGrid();
  renderStreakDots();
}

function exitSecretMode(){
  setActiveHiddenMap(null);
  secretMode=false;
  startBgm('main');
  document.getElementById('secret-hearts').style.display='none';
  if(borderSparkInterval){ clearInterval(borderSparkInterval); borderSparkInterval=null; }
  if(fireInterval){ clearInterval(fireInterval); fireInterval=null; }
  document.getElementById('grid-wrap').classList.remove('fire-low','fire-high');
  clearSecretTimer();
  secretStreak=0;
  secretMultiplier=1;
  secretUltra=false;
  consecutiveBursts=0;

  // Restore mode A
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('hint-bar').style.display='';

  const sg=document.getElementById('secret-grid');
  sg.classList.remove('active','board-flash');
  sg.innerHTML='';
  secretCells=null; // DOM vừa bị xoá thủ công → buộc renderSecretGrid dựng lại cache lần kế tiếp
  const fx=document.getElementById('sc-fx');
  if(fx){ fx.classList.remove('active'); fx.innerHTML=''; }
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('timer-bar-wrap').classList.remove('active');
  document.getElementById('secret-streak-bar').classList.remove('active');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  updateBurstCount();

  renderPieces();
}

// Fill board with random colors (no null) — chỉ dùng 5 màu bí ẩn
function initSecretBoard(){
  secretBoard=Array.from({length:ROWS},()=>Array.from({length:COLS},()=>Math.floor(Math.random()*SECRET_COLORS.length)));
}

let secretCells = null; // ROWS x COLS cache cho map ẩn
function renderSecretGrid(){
  const sg=document.getElementById('secret-grid');
  const glowCls = secretStreak>=9?'glow-5':secretStreak>=7?'glow-4':secretStreak>=5?'glow-3':secretStreak>=3?'glow-2':secretStreak>=1?'glow-1':'';
  if(!secretCells){
    sg.innerHTML='';
    secretCells=Array.from({length:ROWS},()=>Array(COLS).fill(null));
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const d=document.createElement('div');
      d.dataset.r=r; d.dataset.c=c;
      sg.appendChild(d);
      secretCells[r][c]=d;
    }
    // Gán bằng onclick (không addEventListener): mỗi lần thoát map secretCells bị reset về null,
    // vào lại sẽ chạy khối này lần nữa — addEventListener sẽ CHỒNG listener khiến 1 lần bấm
    // tính thành 2-3 lần (nhân đôi điểm/chuỗi/lượt sai). onclick ghi đè nên chỉ có đúng 1 listener.
    sg.onclick = e=>{
      const cell=e.target.closest('.sc');
      if(cell && cell.dataset.gem==='1') onSCClick({currentTarget:cell, clientX:e.clientX, clientY:e.clientY});
    };
  }
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const d=secretCells[r][c];
    const ci=secretBoard[r][c];
    d.className='sc'+(ci===null?'':' gem'+(glowCls?' '+glowCls:''));
    d.dataset.gem = ci===null ? '0' : '1';
    if(ci===null){ d.style.background='#0f0f23'; d.style.border='1px solid #2a2a4a'; }
    else { const col=SECRET_COLORS[ci]; d.style.border=''; d.style.background=col; d.style.setProperty('--cc',col); }
  }
}

// BFS flood-fill to find connected group of same color
function findGroup(r,c){
  const ci=secretBoard[r][c];
  if(ci===null) return [];
  const visited=new Set();
  const queue=[[r,c]];
  visited.add(`${r},${c}`);
  while(queue.length){
    const [cr,cc]=queue.shift();
    for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const nr=cr+dr, nc=cc+dc;
      const key=`${nr},${nc}`;
      if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!visited.has(key)&&secretBoard[nr][nc]===ci){
        visited.add(key); queue.push([nr,nc]);
      }
    }
  }
  return [...visited].map(k=>k.split(',').map(Number));
}

/* ──────────────────────────────────────────
   🎆 Hiệu ứng nổ map ẩn: PHÁO HOA Ở VIỀN + BÀN CỜ SÁNG LÊN
   (thay cho việc nhấp nháy cả màn hình)
────────────────────────────────────────── */
function secretBurstFX(ci, big){
  const grid=document.getElementById('secret-grid');
  if(grid){
    // bàn cờ sáng lên một nhịp (restart animation)
    grid.classList.remove('board-flash'); void grid.offsetWidth; grid.classList.add('board-flash');
  }
  spawnBorderFireworks(ci, big);
}

function spawnBorderFireworks(ci, big){
  const fx=document.getElementById('sc-fx');
  const wrap=document.getElementById('grid-wrap');
  if(!fx||!wrap) return;
  fx.classList.add('active');
  const W=wrap.clientWidth, H=wrap.clientHeight;
  const base=(ci!=null && SECRET_COLORS[ci]) ? SECRET_COLORS[ci] : '#ffd24a';
  const palette=[base, base, '#ffd24a', '#ff7a3c', '#ffffff', '#ffe9a8', '#a8f0ff', '#ff88dd'];
  const N = big ? 40 : 22; // giảm còn một nửa để đỡ giật máy
  for(let i=0;i<N;i++){
    const side=i%4;
    const t=Math.random();
    let x,y,ang;
    // angles now point OUTWARD from the border
    if(side===0){ x=t*W; y=0;     ang=-90; }   // top → shoot upward
    else if(side===1){ x=W; y=t*H; ang=0;   }   // right → shoot right
    else if(side===2){ x=t*W; y=H; ang=90;  }   // bottom → shoot downward
    else           { x=0;   y=t*H; ang=180; }   // left → shoot left
    ang += Math.random()*50-25;                  // spread ±25°
    const dist=(big?55:35)+Math.random()*(big?90:60);
    const len =14+Math.random()*28;
    const dur =400+Math.random()*350;
    const col =palette[(Math.random()*palette.length)|0];
    const s=document.createElement('div');
    s.className='spark';
    s.style.left=x+'px'; s.style.top=y+'px';
    s.style.setProperty('--ang', ang+'deg');
    s.style.setProperty('--dist', dist+'px');
    s.style.setProperty('--len', len+'px');
    s.style.setProperty('--col', col);
    s.style.animationDuration=dur+'ms';
    fx.appendChild(s);
    setTimeout(()=>s.remove(), dur+60);
  }
}

function spawnContinuousBorderSparks(){
  const wrap=document.getElementById('grid-wrap');
  const cbDiv=document.getElementById('combo-border-sparks');
  if(!wrap||!cbDiv) return;
  const W=wrap.clientWidth, H=wrap.clientHeight;
  const streakColors=secretUltra
    ? ['#ffffff','#fffde0','#ffd700','#ffec5c','#fff5a0','#ffcc00']
    : ['#ffffff','#fffde0','#ffd700','#ffec5c','#fff5a0','#ffcc00'];
  const n = secretUltra ? 16 : 8;
  for(let i=0;i<n;i++){
    const side=Math.floor(Math.random()*4);
    const t=Math.random();
    let x,y,ang;
    if(side===0){      x=t*W; y=2;   ang=-90; }
    else if(side===1){ x=W-2; y=t*H; ang=0;   }
    else if(side===2){ x=t*W; y=H-2; ang=90;  }
    else             { x=2;   y=t*H; ang=180; }
    ang += Math.random()*120-60;
    const dist=20+Math.random()*50;
    const len=3+Math.random()*5;
    const dur=120+Math.random()*200;
    const col=streakColors[(Math.random()*streakColors.length)|0];
    const s=document.createElement('div');
    s.className='cb-spark';
    s.style.left=x+'px'; s.style.top=y+'px';
    s.style.setProperty('--ang', ang+'deg');
    s.style.setProperty('--dist', dist+'px');
    s.style.setProperty('--len', len+'px');
    s.style.setProperty('--c
