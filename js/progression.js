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
    try{ showComboFlash(0,false,t('levelUp', playerLevel)); }catch(e){}
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
