
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
  // Thua map ẩn KHÔNG thu hồi điểm — người chơi giữ nguyên toàn bộ điểm đã kiếm.
  // Và tiến trình VẪN đi tiếp: thua map ẩn N cũng mở đường sang map ẩn N+1
  // (đạt mốc điểm map thường kế tiếp — 200, 300, 400... — sẽ mở map ẩn tiếp theo),
  // giống hệt khi thắng, chỉ KHÔNG ghi "đã phá đảo" và KHÔNG thưởng XP.
  if(typeof updateScoreUI==='function') updateScoreUI();
  advanceHiddenGate(unlockGateStageIndex);
}
const UNLOCK_STAGE_ORDER = ['secret','dodge','fruit','bee','gold','mole','memory','bubble','stack','boss','catch','flood','arena','snake','brick','runner','space','rhythm','maze','mega'];
function unlockThresholdForStage(stageNum){ return 100*stageNum; } // stageNum 1-indexed (map ẩn thứ mấy)
let unlockGateStageIndex = 0;   // index (0-based) trong UNLOCK_STAGE_ORDER của map ẩn TIẾP THEO cần mở
let unlockGateBaseline = 0;     // mốc điểm map thường lúc bắt đầu chờ
let unlockGateActive = true;    // đang tích điểm map thường để mở map ẩn tiếp theo?
function triggerStageUnlock(stageKey){
  // Dispatch qua MapManager (đã thay chuỗi switch cũ).
  return triggerMapUnlock(stageKey);
}
// Gọi khi vừa THẮNG map ẩn ở vị trí clearedIdx (0-based) trong UNLOCK_STAGE_ORDER —
// bắt đầu đếm điểm map thường để mở map ẩn kế tiếp.
function startUnlockGate(clearedIdx){
  markMapCleared(UNLOCK_STAGE_ORDER[clearedIdx]);           // ghi "đã phá đảo" (chỉ khi THẮNG)
  addPlayerXP(30+clearedIdx*10); // thưởng XP mỗi lần phá đảo một map ẩn — vòng càng sâu thưởng càng lớn (chỉ khi THẮNG)
  advanceHiddenGate(clearedIdx);
}
// Đẩy tiến trình sang map ẩn kế tiếp — dùng chung cho cả THẮNG (startUnlockGate)
// lẫn THUA (forfeitHiddenMapScore): sau map ẩn thứ `playedIdx` (0-based), mốc điểm
// map thường để mở map ẩn tiếp theo tăng dần 200 → 300 → 400 ... Thắng hay thua đều tiến.
function advanceHiddenGate(playedIdx){
  unlockGateStageIndex = playedIdx+1;
  unlockGateBaseline = score;
  unlockGateActive = (unlockGateStageIndex < UNLOCK_STAGE_ORDER.length);
  consecutiveBursts=0; updateBurstCount();
  // Mỗi vòng map ẩn xong → map thường khó thêm một bậc:
  // khối gạch to/khó xếp xuất hiện nhiều hơn + rải thêm ô chướng ngại lên bàn cờ
  mainHardTier=unlockGateStageIndex;
  resetMechanicState(); // tắt cơ chế của vòng trước — mỗi vòng chỉ có đúng 1 cơ chế mới
  applyRoundMechanics(); // vòng 1: dây gai · vòng 2: núi · vòng 3: sóc trộm ô · ...
  // 🌗 Vừa qua map ẩn CUỐI CÙNG (Mega, vòng 20) → không còn map ẩn nào nữa,
  // bắt đầu tiến trình "qua màn" cho các level không có map ẩn (21-41) ngay trên bàn cờ thường.
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
let lastMilestoneScore = 0; // mốc điểm tròn gần nhất đã ăn mừng (banner + confetti)
const MILESTONE_STEP = 1000; // cứ mỗi 1000 điểm lại ăn mừng 1 lần
const MILESTONE_MSGS = ['Khởi đầu tốt!','Đà tiến ấn tượng!','Không thể ngăn cản!','Phong độ đỉnh cao!',
  'Cực kỳ xuất sắc!','Siêu phàm!','Thần sầu!','Huyền thoại sống!','Vô đối thiên hạ!','Thần thoại sống!'];
function milestoneMsgFor(tier){ return MILESTONE_MSGS[Math.min(tier-1, MILESTONE_MSGS.length-1)]; }

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
    // Các level KHÔNG có map ẩn: đạt đủ điểm map thường → "qua màn", lên level kế tiếp.
    const need=comboThresholdForTier(mainHardTier);
    const earned=Math.min(Math.round(score-comboGateBaseline), need);
    bc.textContent=
      earned>=need?'🎉 Sẵn sàng qua màn — Level '+mainHardTier+'!':
      `Level ${mainHardTier}: ${earned}/${need}đ`;
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
        '🎉 QUA MÀN — Level '+passedTier+'! Lên Level '+mainHardTier+' — Cơ chế đôi: '
        +ROUND_MECH_NAMES[na]+' + '+ROUND_MECH_NAMES[nb]+'!'), 300);
    } else {
      setTimeout(()=>showComboFlash(0,false,
        '🎉 QUA MÀN — Level '+passedTier+'! Lên Level '+mainHardTier+' — '
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
  document.getElementById('best-box').textContent='Kỷ lục: '+Math.round(best).toLocaleString();
  document.getElementById('lines-cleared').textContent='Hàng xóa: '+linesCleared;
  document.getElementById('level-box').textContent='Cấp độ '+level;
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
    document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
const ADMIN_MAPS = [
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
];
let clearedHiddenMaps = new Set(getSavedClearedMaps());

// ═══════════ Hướng dẫn riêng từng map ẩn — chỉ đọc được khi đã chơi tới ═══════════
const MAP_HELP = {
  secret1: { title:'🔥 Map ẩn 1 — Nổ màu bí mật', body:'Bấm vào <b>3+ ô cùng màu liền kề</b> để nổ. Nổ liên tiếp trong <b>2.5 giây</b> (1.25s khi vào chế độ lửa) sẽ tăng combo và nhân điểm x2/x3.<br>Bấm sai 3 lần liên tiếp (5 lần khi đang chế độ lửa) hoặc hết giờ mà chưa nổ kịp → <b>mất 1 tim</b>.<br>Có <b>3 tim ❤️❤️❤️</b> — chỉ thua & về map thường khi hết sạch cả 3 tim. Đạt đủ điểm mốc thì cứ chơi tiếp, khi hết tim sẽ tự thắng và mở Map ẩn 2.<br><b>⭐ Tính điểm:</b> mỗi ô nổ = 1đ. Nổ liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3. Đạt chuỗi <b>9 lần liên tiếp</b> vào "chế độ Ultra" → nhân đôi thêm điểm.' },
  dodge: { title:'🐢 Map ẩn 2 — Rùa né cà rốt', body:'Điều khiển <b>Rùa</b> ở dưới màn hình, né <b>cà rốt</b> do 🐰 Thỏ bắn ra. Kéo trái/phải trên màn hình hoặc bấm nút ◀ ▶.<br>Đạn càng lúc càng nhanh & nhiều — sống càng lâu điểm càng cao.<br><b>⭐ Tính điểm:</b> +1đ mỗi giây sống sót, cộng thêm +1đ mỗi quả cà rốt né được (né liên tiếp không trúng: từ lần 3 → x2, từ lần 6 → x3).' },
  fruit: { title:'🍉 Map ẩn 3 — Chém hoa quả', body:'Hoa quả bay lên liên tục trong <b>60 giây</b>. Vuốt ngón tay/chuột để chém quả, ghi điểm.<br>Cẩn thận <b>💣 BOM</b> — chém trúng bom là thua ngay. Qua được 60s (hoặc dính bom) sẽ về map thường.<br><b>⭐ Tính điểm:</b> mỗi quả chém trúng = 1đ, chém liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3. Để quả rơi hết màn hình mà không chém (trượt) sẽ bị <b>phạt 10đ × số lần trượt liên tiếp</b>; trượt quá <b>5 lần liên tiếp</b> → thua ngay.' },
  bee: { title:'🐝 Map ẩn 4 — Chó trốn ong', body:'Chó Samoyed tự né ong, chạm màn hình để chỉ đường chạy giúp chó. Chạm vào ong để đập bay, ghi điểm combo.<br>Ong chọc chó quá nhiều lần → thua, về map thường.<br><b>⭐ Tính điểm:</b> mỗi con ong đập trúng = 1đ, đập liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3.' },
  gold: { title:'⛏️ Map ẩn 5 — Mèo đào vàng', body:'Đào vàng trong <b>30 giây</b>. Chạm ô đất gần mèo để đào lấy vàng/đá quý, chạm xa hơn để dẫn mèo di chuyển.<br>Bắt được chuột mang kim cương chạy qua → thưởng lớn +150. Cần đạt đủ điểm mốc để qua màn.<br><b>⭐ Tính điểm:</b> đào trúng đất thường = 0đ, đá quý nhỏ = 1đ, đá quý lớn = 2đ, ngọc = 3đ, kim cương = 5đ, rương báu = 8đ. Bắt chuột mang kim cương = <b>+150đ</b>. Về đích đúng hạn còn dư giờ → thưởng thêm 10đ mỗi giây còn lại.' },
  mole: { title:'🔨 Map ẩn 6 — Vườn thú bí ẩn', body:'8 ô trong vườn, động vật ẩn hiện ngẫu nhiên — chạm/ấn để đập.<br>🦫+20 🐰+5 🐢+10 🐶+30 🐱+15 🦔−20 🐍−40. Đập nhím hoặc rắn bị trừ điểm, tránh đập nhầm! Cần đủ điểm trong thời gian giới hạn.<br><b>⭐ Tính điểm:</b> có <b>3 tim ❤️❤️❤️</b> — đập trượt (hụt) liên tiếp 3 lần sẽ mất 1 tim, hết tim là thua ngay dù chưa đủ điểm mốc.' },
  memory: { title:'🃏 Map ẩn 7 — Lật thẻ ký ức', body:'Lưới 4×3 gồm 6 cặp động vật bị trộn. Chạm để lật thẻ, tìm 2 thẻ giống nhau để ghép cặp — sai thì cả 2 úp lại.<br>Ghép đủ 6 cặp trong thời gian giới hạn để thắng. Mỗi cặp = 50đ + điểm thưởng theo giây còn lại.<br><b>⭐ Tính điểm:</b> mỗi cặp ghép đúng = 50đ; hoàn thành xong 6 cặp còn được cộng thêm điểm dựa trên số giây còn dư — càng nhanh thưởng càng nhiều.' },
  bubble: { title:'🫧 Map ẩn 8 — Bắn bong bóng', body:'Chạm để bắn bong bóng về hướng đó — 3+ bong bóng cùng màu liền kề sẽ nổ.<br>Gom đủ điểm hoặc dọn sạch bảng để thắng. Cứ vài giây bong bóng lại rơi xuống thêm 1 hàng — cẩn thận tràn bảng!<br><b>⭐ Tính điểm:</b> mỗi bóng nổ = 1đ, bắn trúng cụm liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3. Các bóng bị "mồ côi" (mất kết nối) rơi theo cũng được tính +1đ/bóng.' },
  stack: { title:'🏗️ Map ẩn 9 — Xếp tháp', body:'Một khối di chuyển qua lại phía trên tháp, chạm để thả xuống — phần thừa so với tầng dưới sẽ bị cắt đi.<br>Trượt hết khối (căn lệch hoàn toàn) → game over. Căn giữa hoàn hảo được thưởng điểm PERFECT. Xếp đủ số tầng trong thời gian giới hạn để thắng.<br><b>⭐ Tính điểm:</b> mỗi tầng xếp được = 1đ; căn <b>PERFECT</b> (khớp hoàn toàn tầng dưới) cộng thêm điểm nhân theo chuỗi PERFECT liên tiếp: từ lần 3 → x2, từ lần 6 → x3.' },
  boss: { title:'🐔 Map ẩn 10 — Phi cơ bắn gà', body:'Kéo ngón tay để lái phi cơ, tự động bắn liên tục vào đàn gà xâm lăng. Né trứng gà rơi xuống — có <b>3 mạng ❤️</b>.<br>Tiêu diệt hết các đợt gà trước khi hết giờ để chiến thắng.<br><b>⭐ Tính điểm:</b> mỗi con gà bắn hạ = 1đ.' },
  catch: { title:'🧺 Map ẩn 11 — Hứng thú cưng', body:'Thú cưng rơi từ trên trời, di chuyển rổ để hứng: 🦫(+20) 🐰(+10) 🐢(+15) 🐶(+40) 🐱(+25).<br>Tránh 🦔 và 🐍 — chúng sẽ lấy mạng bạn. Ghi đủ điểm trong thời gian giới hạn để thắng.<br><b>⭐ Tính điểm:</b> hứng đúng liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3. Hứng trúng vật xấu (🦔/🐍) mất 1 mạng và đứt chuỗi combo.' },
  flood: { title:'🎨 Map ẩn 12 — Tràn màu', body:'Lưới 10×10 ô màu — nhấn nút màu để "tràn" màu đó lan ra từ góc trên trái, nối các ô liền kề cùng màu mới.<br>Mục tiêu: phủ đầy toàn bộ bảng trong số bước giới hạn. Thắng càng sớm (dùng ít bước) càng được thưởng nhiều điểm.<br><b>⭐ Tính điểm:</b> phủ đầy bảng thành công = <b>+20đ</b>, cộng thêm <b>+2đ cho mỗi bước còn dư</b> chưa dùng tới. Hết bước mà chưa phủ xong → tính điểm an ủi bằng số ô đã phủ chia 5 (làm tròn xuống).' },
  arena: { title:'🌊 Map ẩn 13 — Đấu trường sinh tồn', body:'Kéo để di chuyển chú chó 🐶 né đòn tấn công qua 4 làn sóng kẻ thù. Chạm vào 🐝/🥕 để tiêu diệt.<br>Sống sót đủ thời gian hoặc đạt đủ điểm mốc để chiến thắng.<br><b>⭐ Tính điểm:</b> +1đ mỗi giây sống sót, cộng +1đ mỗi lần hạ 🐝/🥕 (hạ liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3). Từ sóng 2 xuất hiện <b>Rắn boss 100 máu</b> — mỗi lần chạm trúng trừ 20 máu (5 lần hạ gục), hạ gục xong thưởng thêm +5đ.' },
  snake: { title:'🐍 Map ẩn 14 — Rắn săn mồi', body:'Rắn cổ điển: ăn trái cây để lớn dần. Vuốt/chạm để đổi hướng, tránh đâm vào tường & đuôi của chính mình.<br>Có <b>3 mạng ❤️❤️❤️</b>. Mục tiêu: đạt độ dài 20.<br><b>⭐ Tính điểm:</b> mỗi quả thường ăn được = 1đ, quả đặc biệt (hiếm, sáng hơn) = 3đ.' },
  brick: { title:'🧱 Map ẩn 15 — Phá gạch', body:'Kiểu Arkanoid cổ điển: điều khiển thanh đỡ để bóng nảy phá vỡ 24 viên gạch phía trên.<br>Có <b>3 mạng ❤️❤️❤️</b> — để bóng rơi xuống đáy sẽ mất 1 mạng.<br><b>⭐ Tính điểm:</b> mỗi lần bóng trúng gạch chưa vỡ = +1đ; gạch vỡ hẳn (gạch thường 1đ, gạch 2 máu 2đ) được nhân thêm theo chuỗi phá liên tiếp: từ lần 3 → x2, từ lần 6 → x3.' },
  runner: { title:'🏃 Map ẩn 16 — Chạy vô tận', body:'Chó tự động chạy về phía trước, chạm màn hình để nhảy né chướng ngại vật. Chạm 2 lần liên tiếp để nhảy đôi (nhảy cao hơn/xa hơn).<br>Sống sót đủ <b>60 giây</b> để thắng.<br><b>⭐ Tính điểm:</b> mỗi ngôi sao ⭐ nhặt được trên đường chạy = +1đ.' },
  space: { title:'🚀 Map ẩn 17 — Space Shooter', body:'Di chuyển ngón tay để lái tàu vũ trụ theo, chạm để bắn (hoặc bật Tự bắn ở góc trái).<br>Mỗi quái tiêu diệt được +1 điểm. Bắn hết toàn bộ các đợt (wave) quái xâm lăng để chiến thắng.<br><b>⭐ Tính điểm:</b> mỗi quái bị bắn hạ = +1đ, không giới hạn combo.' },
  rhythm: { title:'🎵 Map ẩn 18 — Rhythm Tap', body:'Các vòng tròn thu nhỏ dần xuất hiện quanh tâm — chạm vào tâm đúng lúc vòng ngoài khớp với vòng trong để ghi điểm.<br>Gõ càng chính xác (PERFECT) chuỗi điểm càng cao; gõ trễ/hụt sẽ mất chuỗi. Hoàn thành hết số vòng để thắng.<br><b>⭐ Tính điểm:</b> 5 mức chính xác — <b>PERFECT</b>=3đ, <b>GREAT</b>=2đ, <b>COOL</b>=1đ (3 mức này nhân theo chuỗi trúng liên tiếp: từ lần 3 → x2, từ lần 6 → x3), <b>BAD</b>=1đ (không nhân, đứt chuỗi), <b>MISS</b>=0đ (đứt chuỗi).' },
  maze: { title:'🌀 Map ẩn 19 — Maze Runner', body:'Vuốt hoặc dùng phím mũi tên để dẫn chú chó tìm đường thoát khỏi mê cung trong <b>60 giây</b>.<br>Nhặt vật phẩm trên đường đi: +10 điểm hoặc +5 giây. Đến được ô đích (góc dưới phải) để thắng.<br><b>⭐ Tính điểm:</b> vật phẩm điểm = +10đ, vật phẩm đồng hồ = +5 giây (không cộng điểm trực tiếp nhưng giúp có thêm thời gian ghi điểm).' },
  mega: { title:'💀 Map ẩn 20 — MEGA BOSS (trận cuối)', body:'Trận chiến cuối cùng — hạ gục Rồng Huyền Thoại! Di chuyển ngón tay để né đạn, tàu tự động bắn liên tục vào Rồng.<br>Bắn trúng Rồng để trừ máu (HP) — hạ HP về 0 để chiến thắng và hoàn thành toàn bộ trò chơi!<br><b>⭐ Tính điểm:</b> mỗi phát đạn trúng Rồng = +1đ, không giới hạn combo.' },
};
// Ánh xạ vòng 1-20 (0-based) sang khoá cơ chế trong MECH_CFG, để tra điểm thưởng/phạt LUÔN ĐÚNG
// theo giá trị hiện tại (kể cả khi admin chỉnh trong panel "⚙️ Nhịp & Thưởng"). Vòng 1 (dây gai)
// không có mục cấu hình riêng nên để null.
const ROUND_MECH_KEY = ['thorn','mountain','squirrel','ice','fog','bomb','tornado','egg','spider','cloud','cham','bh','ghost','snail','wall','lightning','snakeSpirit','volcano','portal','dk'];
function roundScoreLine(key){
  if(!key || !MECH_CFG[key]){
    return '⭐ <b>Tính điểm:</b> không có thưởng/phạt điểm riêng cho cơ chế này — chỉ tính điểm nổ ô bình thường như mọi lúc chơi map thường.';
  }
  const m=MECH_CFG[key];
  const parts=[];
  if(m.hp!=null) parts.push('có <b>'+m.hp+' máu</b> — mỗi lần nổ trúng (hoặc nổ ô liền kề, tuỳ cơ chế) trừ 1 máu, hạ hết máu mới hóa giải xong');
  if(m.thuong!=null) parts.push('hóa giải/hạ gục thành công thưởng <b>+'+m.thuong+'đ</b>');
  if(m.phat!=null) parts.push('không xử lý kịp sẽ bị phạt <b>−'+m.phat+'đ</b>');
  if(m.limit!=null) parts.push('để nó lộng hành đủ <b>'+m.limit+'</b> ô sẽ thua cả ván map thường');
  if(!parts.length) parts.push('không có thưởng/phạt điểm riêng — chỉ tính điểm nổ ô bình thường như mọi lúc chơi map thường');
  return '⭐ <b>Tính điểm:</b> '+parts.join('; ')+'.';
}
const ROUND_HELP = [
  { title:'🌿 Vòng 1 — Dây gai', body:'Ô nào để lâu quá vài lượt đặt khối mà chưa bị phá sẽ bị <b>dây gai</b> quấn kín — ô đó không nổ được nữa, cũng không tính vào cụm màu. Muốn gỡ, hãy nổ trúng ô <b>liền kề</b> ô bị gai quấn.' },
  { title:'⛰️ Vòng 2 — Núi đá', body:'Một ngọn núi nhỏ mọc lên ở ô trống ngẫu nhiên và sẽ <b>lớn dần</b> lan sang các ô trống xung quanh theo thời gian nếu bị bỏ mặc. Ô có núi không đặt khối và không nổ được — đừng để nó chiếm hết bàn cờ!' },
  { title:'🐿️ Vòng 3 — Sóc trộm ô', body:'Một con sóc xuất hiện, mỗi lượt <b>chỉ di chuyển 1 ô</b> theo hướng ngẫu nhiên (trên/dưới/trái/phải) và <b>không bao giờ nhảy vào ô nó đã gặm</b>. Cứ <b>3 lượt di chuyển</b>, khi sóc rời khỏi ô đang đứng thì <b>ô đó mới bị gặm</b> (xoá màu, để lại dấu cắn khiến ô đó tạm thời không đặt khối được). Nổ trúng ô sóc đang đứng <b>hoặc ô liền kề nó</b> để trừ máu — hạ hết máu để đuổi sóc đi, <b>tất cả ô đã bị gặm sẽ được khôi phục</b>. Nếu 6 bước sau đó bàn cờ vẫn chưa "sạch", một con sóc khác sẽ xuất hiện.' },
  { title:'🧊 Vòng 4 — Băng giá', body:'Một số ô màu bị đóng băng theo chu kỳ. Phải nổ trúng cụm chứa ô đó <b>2 lần</b> — lần 1 làm nứt băng, lần 2 mới vỡ hẳn và phá được màu bên trong.' },
  { title:'🌫️ Vòng 5 — Sương mù', body:'Một vùng trên bàn bị sương mù che khuất màu ô. Hãy ghi nhớ màu trước khi bị che, hoặc suy đoán dựa vào các ô lân cận không bị che.' },
  { title:'💣 Vòng 6 — Bom hẹn giờ', body:'Một ô mang quả bom đếm ngược theo số bước bạn đặt khối. Hết giờ, bom nổ và xoá sạch vùng <b>3×3</b> quanh nó. Nổ trúng ô <b>liền kề</b> quả bom để gỡ bom trước khi nó phát nổ.' },
  { title:'🌪️ Vòng 7 — Lốc xoáy', body:'Thỉnh thoảng một hàng hoặc cột bị lốc xoáy cuốn qua, xáo trộn ngẫu nhiên vị trí các ô màu trong hàng/cột đó.' },
  { title:'🥚 Vòng 8 — Trứng rồng', body:'Trứng rồng xuất hiện và đếm ngược. Không đập vỡ (nổ trúng) kịp trước khi nở → rồng con nở ra, <b>thiêu rụi cả hàng</b> chứa quả trứng.' },
  { title:'🕷️ Vòng 9 — Nhện giăng tơ', body:'Nhện giăng tơ khoá 1 khối trong khay đặt khối của bạn trong vài lượt — khối đó tạm thời không dùng được cho tới khi tơ tự đứt.' },
  { title:'🌧️ Vòng 10 — Mây mưa', body:'Một đám mây di chuyển qua các cột, biến ô màu nó đi qua thành <b>ô xám</b> (mất màu, coi như bị "rửa trôi"). Nổ để dọn sạch ô xám đó.' },
  { title:'🦎 Vòng 11 — Tắc kè hoa', body:'Tắc kè lén đổi màu ngẫu nhiên của 1-2 ô có sẵn trên bàn, có thể phá hỏng kế hoạch ghép cụm màu của bạn bất ngờ — quan sát kỹ trước khi đặt khối!' },
  { title:'🕳️ Vòng 12 — Hố đen', body:'Hố đen xuất hiện và mỗi lượt sẽ hút 1 ô màu gần nó nhất. Nổ trúng gần hố đen đủ số lần cần thiết để hố "no nê" và tự biến mất.' },
  { title:'👻 Vòng 13 — Bóng ma', body:'Một ô giả dạng thành <b>màu khác</b> với màu thật của nó, đánh lừa thị giác — đừng vội tin vào mắt mình khi ghép cụm gần khu vực nghi ngờ.' },
  { title:'🐌 Vòng 14 — Ốc sên', body:'Ốc sên bò quanh bàn cờ, để lại vệt nhớt trên các ô trống nó đi qua — ô dính nhớt tạm thời không đặt khối được.' },
  { title:'🧱 Vòng 15 — Tường gạch', body:'Từng cụm 3 viên gạch thỉnh thoảng rơi xuống chiếm chỗ trên bàn. Gạch không phá được — chỉ có thể tránh đặt khối đè lên khu vực đó.' },
  { title:'⚡ Vòng 16 — Sét đánh', body:'Có cảnh báo trước rồi sét đánh trúng 1 vùng <b>2×2</b>, xoá sạch màu trong vùng bị đánh — tránh xa vùng cảnh báo nếu không muốn mất ô đã ghép.' },
  { title:'🐍 Vòng 17 — Rắn thần', body:'Một con rắn 3 đốt trườn qua bàn cờ theo thời gian, "nuốt" (xoá màu) các ô nó bò qua.' },
  { title:'🌋 Vòng 18 — Núi lửa', body:'Núi đá cũ hoá thành núi lửa và phun đá xuống 3 ô ngẫu nhiên trên bàn (giống cơ chế tường gạch) — các ô bị đá rơi trúng không đặt khối được.' },
  { title:'🌀 Vòng 19 — Cổng dịch chuyển', body:'Hai cổng dịch chuyển xuất hiện trên bàn, thỉnh thoảng tráo đổi vị trí 1 ô màu và 1 ô trống cho nhau — bàn cờ có thể thay đổi bất ngờ.' },
  { title:'🐲 Vòng 20 — Vua Rồng giáng thế', body:'Thử thách tối thượng của map thường! Vua Rồng tung ra nhiều đòn tấn công ngẫu nhiên: thiêu rụi cả một hàng, đóng băng nhiều ô, gieo thêm dây gai, hoặc cướp mất vài ô màu trên bàn cùng lúc.' },
];
// 🌗 Vòng 21-40 — hướng dẫn cơ chế đôi, tự ghép từ mô tả 2 vòng gốc liền kề (không lặp tay, luôn khớp comboPairForTier)
for(let v=21; v<=40; v++){
  const [a,b]=comboPairForTier(v);
  const ra=ROUND_HELP[a-1], rb=ROUND_HELP[b-1];
  const nameA=ra.title.split('— ')[1], nameB=rb.title.split('— ')[1];
  ROUND_HELP.push({
    title:'🌗 Vòng '+v+' — Cơ chế đôi: '+nameA+' + '+nameB,
    body:'<b>Vòng này có CÙNG LÚC 2 cơ chế của vòng '+a+' và vòng '+b+' hoạt động song song:</b><br><br>'
      +'<b>① '+nameA+':</b> '+ra.body+'<br><br>'
      +'<b>② '+nameB+':</b> '+rb.body
  });
}
function renderRoundHelp(){
  const list = document.getElementById('round-help-list');
  if(!list) return;
  const reached = clearedHiddenMaps.size; // số map ẩn từng thắng ~ số vòng cơ chế từng mở khoá
  list.innerHTML='';
  ROUND_HELP.forEach((r,i)=>{
    // Vòng 1-20 (i<20): mở dần từng vòng theo số map ẩn đã thắng.
    // Vòng 21-40 (i>=20, cơ chế đôi): mở TUẦN TỰ từng vòng một — phải vượt qua vòng
    // trước (đạt đủ điểm mốc trên bàn cờ thường) mới mở khoá vòng kế tiếp.
    const unlocked = i<20 ? (i<reached) : (reached>=20 && (i+1)<=maxComboTierReached);
    if(unlocked){
      const det = document.createElement('details');
      // Vòng 1-20: 1 dòng tính điểm theo cơ chế của vòng đó.
      // Vòng 21-40 (cơ chế đôi): ghép tính điểm của CẢ 2 cơ chế gốc, tra theo giá trị MCFG hiện tại.
      let scoreHtml;
      if(i<20){
        scoreHtml = '<div class="map-detail-score">'+roundScoreLine(ROUND_MECH_KEY[i])+'</div>';
      } else {
        const [a,b]=comboPairForTier(i+1);
        scoreHtml = '<div class="map-detail-score">① '+roundScoreLine(ROUND_MECH_KEY[a-1])+'</div>'
          +'<div class="map-detail-score">② '+roundScoreLine(ROUND_MECH_KEY[b-1])+'</div>';
      }
      det.innerHTML = '<summary>'+r.title+'</summary><div class="map-detail-body">'+r.body+scoreHtml+'</div>';
      list.appendChild(det);
    } else {
      const locked = document.createElement('div');
      locked.className='admin-map-btn locked';
      locked.style.cursor='default';
      locked.innerHTML = i<20
        ? '🔒 Vòng '+(i+1)+' — chơi tới đây để mở khoá hướng dẫn'
        : (reached>=20
            ? '🔒 Vòng '+(i+1)+' [cơ chế đôi] — vượt qua vòng '+i+' để mở khoá'
            : '🔒 Vòng '+(i+1)+' [cơ chế đôi] — thắng đủ 20/20 map ẩn trước để bắt đầu tiến trình này');
      list.appendChild(locked);
    }
  });
}
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
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
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
initAdminPanel();
initAccountPanel();

initHelpPanel();
initStartScreen();
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
document.getElementById('best-box').textContent='Kỷ lục: '+best.toLocaleString();

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

