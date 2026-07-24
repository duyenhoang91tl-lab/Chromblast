// ═══════════════════════════════════════════════════════════════
// js/progression.js — TIẾN TRÌNH: mở khoá map ẩn (cổng điểm tăng dần), Adventure,
// XP/level người chơi, cột mốc điểm, hệ thống thành tựu. Tách verbatim khỏi main.js.
// Nạp SAU save.js, TRƯỚC main.js. Tham chiếu score/board & UI của main.js lúc CHẠY.
// ═══════════════════════════════════════════════════════════════

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
  showComboFlash(0,false,t('adventureUnlock'));
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
  window._adStageCount = (window._adStageCount||0) + 1;
  if(typeof showInterstitialAd==='function' && window._adStageCount % 2 === 0) showInterstitialAd();
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
  const prevLevel=playerLevel;
  playerXP+=n;
  let leveled=false;
  while(playerXP>=xpNeeded(playerLevel)){ playerXP-=xpNeeded(playerLevel); playerLevel++; leveled=true; }
  if(leveled){
    try{ sfxUnlock(); }catch(e){}
    try{ showComboFlash(0,false,t('levelUp', playerLevel)); }catch(e){}
    try{ if(typeof grantHearts==='function') grantHearts(1, 'Lên cấp'); }catch(e){}
    try{
      // Thưởng vàng mỗi cấp lên: 2 + floor(lv/10)
      let goldGain = 0;
      for(let lv = prevLevel + 1; lv <= playerLevel; lv++){
        goldGain += 2 + Math.floor(lv / 10);
      }
      if(goldGain>0 && typeof grantGold==='function') grantGold(goldGain, 'Lên cấp');
    }catch(e){}
    try{ if(typeof unlockSkillByLevel==='function') unlockSkillByLevel(playerLevel); }catch(e){}
    try{ if(typeof refreshVersusButton==='function') refreshVersusButton(); }catch(e){}
    try{ if(typeof refreshCaroButton==='function') refreshCaroButton(); }catch(e){}
    if(prevLevel < 3 && playerLevel >= 3){
      try{ showComboFlash(0,false,'❌⭕ Cờ Caro online đã mở khóa!'); }catch(e){}
    }
    if(prevLevel < 10 && playerLevel >= 10){
      try{ showComboFlash(0,false,'⚔️ Đấu 1-1 đã mở khóa!'); }catch(e){}
    }
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

let lastMilestoneScore = 0; // mốc điểm tròn gần nhất đã ăn mừng (banner + confetti)
const MILESTONE_STEP = 1000; // cứ mỗi 1000 điểm lại ăn mừng 1 lần
// Câu chúc cột mốc đa ngôn ngữ: xem MILESTONE_MSG (js/i18n-content.js).
function milestoneMsgFor(tier){ return MILESTONE_MSG(tier); }
/* ══════════════════════════════════════════
   ACHIEVEMENT / CUP SYSTEM (~30 thử thách khó)
   Lưu bền trong localStorage — không reset mỗi ván.
══════════════════════════════════════════ */
const CUP_KEY = 'chromablast_cups';
const ACHIEVEMENTS = {
  combo10:     { id:'combo10',     icon:'🔥', label:'Combo x10',           desc:'Đạt combo 10 liên tiếp trong 1 ván', done:false },
  combo15:     { id:'combo15',     icon:'🔥', label:'Combo x15',           desc:'Đạt combo 15 liên tiếp trong 1 ván', done:false },
  combo20:     { id:'combo20',     icon:'💥', label:'Combo x20',           desc:'Đạt combo 20 liên tiếp trong 1 ván', done:false },
  combo25:     { id:'combo25',     icon:'🌪️', label:'Combo x25',           desc:'Đạt combo 25 liên tiếp trong 1 ván', done:false },
  score10k:    { id:'score10k',    icon:'⭐', label:'10.000 điểm',         desc:'Ghi 10.000 điểm trong 1 ván', done:false },
  score25k:    { id:'score25k',    icon:'🌟', label:'25.000 điểm',         desc:'Ghi 25.000 điểm trong 1 ván', done:false },
  score50k:    { id:'score50k',    icon:'✨', label:'50.000 điểm',         desc:'Ghi 50.000 điểm trong 1 ván', done:false },
  score100k:   { id:'score100k',   icon:'💫', label:'100.000 điểm',        desc:'Ghi 100.000 điểm trong 1 ván', done:false },
  best25k:     { id:'best25k',     icon:'🏅', label:'Kỷ lục 25K',          desc:'Đạt kỷ lục 25.000 điểm', done:false },
  best50k:     { id:'best50k',     icon:'🥇', label:'Kỷ lục 50K',          desc:'Đạt kỷ lục 50.000 điểm', done:false },
  level15:     { id:'level15',     icon:'📈', label:'Level 15',            desc:'Đạt cấp 15 map thường trong 1 ván', done:false },
  level25:     { id:'level25',     icon:'📊', label:'Level 25',            desc:'Đạt cấp 25 map thường trong 1 ván', done:false },
  level40:     { id:'level40',     icon:'🏆', label:'Level 40',            desc:'Đạt cấp 40 map thường trong 1 ván', done:false },
  player15:    { id:'player15',    icon:'⭐', label:'Người chơi Lv.15',    desc:'Đạt cấp tài khoản 15', done:false },
  player25:    { id:'player25',    icon:'🌟', label:'Người chơi Lv.25',    desc:'Đạt cấp tài khoản 25', done:false },
  player40:    { id:'player40',    icon:'👑', label:'Người chơi Lv.40',    desc:'Đạt cấp tài khoản 40', done:false },
  ultra:       { id:'ultra',       icon:'⚡', label:'ULTRA MODE',          desc:'Kích hoạt Ultra ở map ẩn 1', done:false },
  secret12:    { id:'secret12',    icon:'🔥', label:'Streak x12',          desc:'Chuỗi nổ 12 ở map ẩn 1', done:false },
  fruit150:    { id:'fruit150',    icon:'🍉', label:'150 quả',             desc:'Chém 150 trái cây trong 1 lần chơi map 3', done:false },
  fruit400:    { id:'fruit400',    icon:'🍎', label:'400 quả',             desc:'Chém 400 trái cây trong 1 lần chơi map 3', done:false },
  survive120:  { id:'survive120',  icon:'🐢', label:'Sống 2 phút',         desc:'Sống sót 120 giây ở map ẩn 2', done:false },
  survive300:  { id:'survive300',  icon:'🛡️', label:'Sống 5 phút',         desc:'Sống sót 300 giây ở map ẩn 2', done:false },
  maps5:       { id:'maps5',       icon:'🗺️', label:'5 map ẩn',            desc:'Thắng 5 map ẩn khác nhau', done:false },
  maps10:      { id:'maps10',      icon:'🧭', label:'10 map ẩn',           desc:'Thắng 10 map ẩn khác nhau', done:false },
  maps15:      { id:'maps15',      icon:'🌌', label:'15 map ẩn',           desc:'Thắng 15 map ẩn khác nhau', done:false },
  maps20:      { id:'maps20',      icon:'🚀', label:'20 map ẩn',           desc:'Thắng 20 map ẩn khác nhau', done:false },
  login7:      { id:'login7',      icon:'📅', label:'Điểm danh 7 ngày',    desc:'Chuỗi điểm danh đủ 7 ngày', done:false },
  login21:     { id:'login21',     icon:'🗓️', label:'21 lần điểm danh',    desc:'Tổng cộng điểm danh 21 lần', done:false },
  lines200:    { id:'lines200',    icon:'🧱', label:'200 hàng',            desc:'Xóa 200 hàng trong 1 ván', done:false },
  burst50:     { id:'burst50',     icon:'💥', label:'50 nổ liên tiếp',     desc:'Chuỗi 50 vụ nổ liên tiếp không đứt', done:false },

  // ── 20 cup ẩn mới ──
  combo5:      { id:'combo5',      icon:'🎯', label:'Combo x5',            desc:'Đạt combo 5 liên tiếp trong 1 ván', done:false },
  combo30:     { id:'combo30',     icon:'🌈', label:'Combo x30',           desc:'Đạt combo 30 liên tiếp trong 1 ván', done:false },
  score5k:     { id:'score5k',     icon:'🎯', label:'5.000 điểm',          desc:'Ghi 5.000 điểm trong 1 ván', done:false },
  score150k:   { id:'score150k',   icon:'💎', label:'150.000 điểm',        desc:'Ghi 150.000 điểm trong 1 ván', done:false },
  score200k:   { id:'score200k',   icon:'👑', label:'200.000 điểm',        desc:'Ghi 200.000 điểm trong 1 ván', done:false },
  best75k:     { id:'best75k',     icon:'🏆', label:'Kỷ lục 75K',          desc:'Đạt kỷ lục 75.000 điểm', done:false },
  best100k:    { id:'best100k',    icon:'💎', label:'Kỷ lục 100K',         desc:'Đạt kỷ lục 100.000 điểm', done:false },
  level10:     { id:'level10',     icon:'🔰', label:'Level 10',            desc:'Đạt cấp 10 map thường trong 1 ván', done:false },
  level20:     { id:'level20',     icon:'📶', label:'Level 20',            desc:'Đạt cấp 20 map thường trong 1 ván', done:false },
  level30:     { id:'level30',     icon:'🚀', label:'Level 30',            desc:'Đạt cấp 30 map thường trong 1 ván', done:false },
  level50:     { id:'level50',     icon:'🌠', label:'Level 50',            desc:'Đạt cấp 50 map thường trong 1 ván', done:false },
  player10:    { id:'player10',    icon:'🔰', label:'Người chơi Lv.10',    desc:'Đạt cấp tài khoản 10', done:false },
  player20:    { id:'player20',    icon:'📶', label:'Người chơi Lv.20',    desc:'Đạt cấp tài khoản 20', done:false },
  player30:    { id:'player30',    icon:'🚀', label:'Người chơi Lv.30',    desc:'Đạt cấp tài khoản 30', done:false },
  player50:    { id:'player50',    icon:'👑', label:'Người chơi Lv.50',    desc:'Đạt cấp tài khoản 50', done:false },
  survive60:   { id:'survive60',   icon:'🐣', label:'Sống 1 phút',         desc:'Sống sót 60 giây ở map ẩn 2', done:false },
  survive180:  { id:'survive180',  icon:'🦉', label:'Sống 3 phút',         desc:'Sống sót 180 giây ở map ẩn 2', done:false },
  lines100:    { id:'lines100',    icon:'🧱', label:'100 hàng',            desc:'Xóa 100 hàng trong 1 ván', done:false },
  lines500:    { id:'lines500',    icon:'🏗️', label:'500 hàng',            desc:'Xóa 500 hàng trong 1 ván', done:false },
  maps1:       { id:'maps1',       icon:'🗝️', label:'Map ẩn đầu tiên',     desc:'Thắng map ẩn đầu tiên', done:false },
};
let fruitSlicedTotal = 0;
let survive60Unlocked = false;
let survive180Unlocked = false;
let survive120Unlocked = false;
let survive300Unlocked = false;
let cupLoginClaims = 0;

(function loadCups(){
  try{
    const raw = JSON.parse((typeof safeGet==='function' ? safeGet(CUP_KEY) : null) || localStorage.getItem(CUP_KEY) || '{}');
    if(raw && raw.done){
      Object.keys(raw.done).forEach(id=>{
        if(ACHIEVEMENTS[id] && raw.done[id]) ACHIEVEMENTS[id].done = true;
      });
    }
    if(raw && raw.seen){
      Object.keys(raw.seen).forEach(id=>{
        if(ACHIEVEMENTS[id] && raw.seen[id]) ACHIEVEMENTS[id].seen = true;
      });
    }
    // Cup đã xong từ bản cũ (chưa có seen) → coi như chưa xem để còn dấu đỏ
    Object.keys(ACHIEVEMENTS).forEach(id=>{
      if(ACHIEVEMENTS[id].done && ACHIEVEMENTS[id].seen==null) ACHIEVEMENTS[id].seen = false;
    });
    cupLoginClaims = Math.max(0, (raw && raw.loginClaims)|0);
  }catch(e){}
})();

function saveCups(){
  try{
    const done = {}, seen = {};
    Object.keys(ACHIEVEMENTS).forEach(id=>{
      done[id] = !!ACHIEVEMENTS[id].done;
      seen[id] = !!ACHIEVEMENTS[id].seen;
    });
    const payload = JSON.stringify({ done, seen, loginClaims: cupLoginClaims|0 });
    if(typeof safeSet==='function') safeSet(CUP_KEY, payload);
    else localStorage.setItem(CUP_KEY, payload);
  }catch(e){}
}

function unlockAchievement(id){
  const a = ACHIEVEMENTS[id];
  if(!a || a.done) return;
  a.done = true;
  a.seen = false; // dấu đỏ cho đến khi người chơi bấm xem giải thích
  saveCups();
  try{ showAchievementToast(a); }catch(e){}
  try { sfxScoreMilestone(); } catch(e){ try { sfxStreak(5); } catch(e2){} }
  try{
    const g = (typeof cupGoldReward==='function') ? cupGoldReward(id) : 3;
    if(g>0 && typeof grantGold==='function') grantGold(g, '🏆 '+(a.label||id));
  }catch(e){}
}

/** Vàng theo độ khó cup */
function cupGoldReward(id){
  const hard = {
    combo25:12, combo30:18, score100k:16, score150k:20, score200k:28,
    best100k:18, level50:20, player50:22, maps20:18, burst50:14, lines500:14,
    fruit400:12, survive300:12, combo20:10, score50k:10, maps15:12, player40:14
  };
  const mid = {
    combo15:6, combo10:4, score25k:7, score10k:4, best50k:8, best75k:10,
    level25:8, level40:10, player25:8, player30:10, maps10:8, survive180:6,
    fruit150:5, lines200:6, login21:5, secret12:6
  };
  const easy = {
    combo5:2, score5k:2, maps1:2, login7:2, survive60:2, lines100:2,
    level10:3, player10:3, maps5:4, best25k:5, level15:4, player15:4,
    survive120:5, ultra:4
  };
  if(hard[id]!=null) return hard[id];
  if(mid[id]!=null) return mid[id];
  if(easy[id]!=null) return easy[id];
  return 3;
}

/** Đánh dấu cup đã xem → gỡ dấu đỏ */
function markCupSeen(id){
  const a = ACHIEVEMENTS[id];
  if(!a || !a.done || a.seen) return false;
  a.seen = true;
  saveCups();
  return true;
}

/** Kiểm tra cup theo tiến trình bền (kỷ lục, map, cấp TK, điểm danh) */
function checkPersistentCups(){
  try{
    const bestN = (typeof best==='number') ? best : 0;
    if(bestN >= 25000) unlockAchievement('best25k');
    if(bestN >= 50000) unlockAchievement('best50k');
    if(bestN >= 75000) unlockAchievement('best75k');
    if(bestN >= 100000) unlockAchievement('best100k');
  }catch(e){}
  try{
    if(typeof playerLevel==='number'){
      if(playerLevel >= 10) unlockAchievement('player10');
      if(playerLevel >= 15) unlockAchievement('player15');
      if(playerLevel >= 20) unlockAchievement('player20');
      if(playerLevel >= 25) unlockAchievement('player25');
      if(playerLevel >= 30) unlockAchievement('player30');
      if(playerLevel >= 40) unlockAchievement('player40');
      if(playerLevel >= 50) unlockAchievement('player50');
    }
  }catch(e){}
  try{
    const n = (typeof clearedHiddenMaps!=='undefined' && clearedHiddenMaps) ? clearedHiddenMaps.size : 0;
    if(n >= 1) unlockAchievement('maps1');
    if(n >= 5) unlockAchievement('maps5');
    if(n >= 10) unlockAchievement('maps10');
    if(n >= 15) unlockAchievement('maps15');
    if(n >= 20) unlockAchievement('maps20');
  }catch(e){}
  try{
    if(typeof getDailyStatus==='function'){
      const st = getDailyStatus();
      if(st && st.streakDay >= 7) unlockAchievement('login7');
    }
    if((cupLoginClaims|0) >= 21) unlockAchievement('login21');
  }catch(e){}
}

/** Gọi sau mỗi vụ nổ / lên cấp map để xét cup trong ván */
function checkRunCups(){
  try{
    const c = (typeof combo==='number') ? combo : 0;
    if(c >= 10) unlockAchievement('combo10');
    if(c >= 15) unlockAchievement('combo15');
    if(c >= 20) unlockAchievement('combo20');
    if(c >= 25) unlockAchievement('combo25');
    if(c >= 30) unlockAchievement('combo30');
  }catch(e){}
  try{
    const s = (typeof score==='number') ? score : 0;
    if(s >= 5000) unlockAchievement('score5k');
    if(s >= 10000) unlockAchievement('score10k');
    if(s >= 25000) unlockAchievement('score25k');
    if(s >= 50000) unlockAchievement('score50k');
    if(s >= 100000) unlockAchievement('score100k');
    if(s >= 150000) unlockAchievement('score150k');
    if(s >= 200000) unlockAchievement('score200k');
  }catch(e){}
  try{
    const lv = (typeof level==='number') ? level : 0;
    if(lv >= 10) unlockAchievement('level10');
    if(lv >= 15) unlockAchievement('level15');
    if(lv >= 20) unlockAchievement('level20');
    if(lv >= 25) unlockAchievement('level25');
    if(lv >= 30) unlockAchievement('level30');
    if(lv >= 40) unlockAchievement('level40');
    if(lv >= 50) unlockAchievement('level50');
  }catch(e){}
  try{
    const lines = (typeof linesCleared==='number') ? linesCleared : 0;
    if(lines >= 100) unlockAchievement('lines100');
    if(lines >= 200) unlockAchievement('lines200');
    if(lines >= 500) unlockAchievement('lines500');
  }catch(e){}
  try{
    const b = (typeof consecutiveBursts==='number') ? consecutiveBursts : 0;
    if(b >= 50) unlockAchievement('burst50');
  }catch(e){}
  try{
    const ss = (typeof secretStreak==='number') ? secretStreak : 0;
    if(ss >= 12) unlockAchievement('secret12');
  }catch(e){}
  checkPersistentCups();
}

function noteCupLoginClaim(){
  cupLoginClaims = (cupLoginClaims|0) + 1;
  saveCups();
  if(cupLoginClaims >= 21) unlockAchievement('login21');
  try{
    const st = (typeof getDailyStatus==='function') ? getDailyStatus() : null;
    // sau claim, streak đã lưu — đọc lại state
    const raw = (typeof getDailyState==='function') ? getDailyState() : null;
    if(raw && (raw.streak|0) >= 7) unlockAchievement('login7');
  }catch(e){}
  checkPersistentCups();
}
