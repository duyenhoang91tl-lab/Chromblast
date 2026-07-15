
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
    // #game-root vừa co giãn lại — toạ độ getBoundingClientRect() của lưới (cache trong
    // engine.js) không còn đúng nữa, phải tính lại ở lần kéo-thả kế tiếp.
    if(typeof invalidateGridGeom==='function') invalidateGridGeom();
  }
  window.addEventListener('resize', fitGameRoot);
  window.addEventListener('orientationchange', ()=>setTimeout(fitGameRoot,150));
  window.addEventListener('load', fitGameRoot);
  document.addEventListener('DOMContentLoaded', fitGameRoot);
  // TRƯỚC ĐÂY: setInterval(fitGameRoot, 1000) ép tính lại MỖI GIÂY dù không có gì
  // đổi — mỗi lần lại ghi transform:none rồi đọc scrollHeight ngay (layout thrashing),
  // gây giật nhẹ đều đặn suốt ván chơi. Giờ dùng ResizeObserver: chỉ tính lại khi
  // NỘI DUNG #game-root thực sự đổi kích thước (mở modal, đổi ngôn ngữ dài/ngắn...).
  if('ResizeObserver' in window){
    let pending=false;
    new ResizeObserver(()=>{
      if(pending) return;
      pending=true;
      requestAnimationFrame(()=>{ pending=false; fitGameRoot(); });
    }).observe(root);
  } else {
    setInterval(fitGameRoot, 1000); // fallback cho trình duyệt cũ không có ResizeObserver
  }
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
const COLOR_BURST_MIN = 12;   // Tăng ngưỡng nổ màu (từ 9 lên 12) để tránh nổ quá sớm khi chưa đầy hàng/cột
const SECRET_WINDOW = 2500;  // ms — khoảng thời gian giữa 2 lần nổ trong map ẩn (ấn chậm hơn sẽ thoát)
const SECRET_ULTRA  = 9;     // streak to trigger ultra
const TEST_UNLOCK_SCORE = 100; // ngưỡng điểm mở khoá Map ẩn 1 (và mốc thắng trong Map ẩn 1)


// Mode A state
let board, pieces, selected, score=0, best=0, linesCleared=0, level=1, combo=0;
// Load persisted data
(function loadSaved(){
  const saved = getSavedGameData();
  if(saved.best) best = saved.best;
})();
let consecutiveBursts = 0; // counts chain explosions toward unlock


/* ── Quy tắc tính điểm chung: 1 ô = 1 điểm; phá liên tiếp 3 lần → x2; 6 lần → x3 ──
   Dùng chung cho map thường và mọi map ẩn để thang điểm đồng nhất. */
function comboScoreMultiplier(streak){
  return streak>=6 ? 3 : streak>=3 ? 2 : 1;
}

/* ── Câu khen chỉ hiện mỗi khi đạt MỐC 5 lần nổ liên tiếp — không phải cứ nổ là khen ──
   streak 5 → 'COOL', streak 10 → 'GOOD', streak 15 → 'GREAT'... càng khó càng khen to. */
const COMBO_PRAISE_STEP = 5;
function shouldPraise(streak){ return streak>0 && streak % COMBO_PRAISE_STEP === 0; }
function praiseLevelForStreak(streak){ return Math.floor(streak/COMBO_PRAISE_STEP)+1; } // dùng cho pIdx

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
    bc.textContent=t('unlockWaiting');
    bc.classList.add('unlock-pending');
    return;
  }
  bc.classList.remove('unlock-pending');
  if(unlockGateActive && !secretMode){
    const need=unlockThresholdForStage(unlockGateStageIndex+1);
    const earned=Math.min(Math.round(score-unlockGateBaseline), need);
    bc.textContent=
      earned>=need?t('unlockReady'):
      t('progress', earned, need);
  } else if(comboGateActive && !secretMode && mainHardTier>=20 && mainHardTier<41){
    // Các level KHÔNG có map ẩn: đạt đủ điểm map thường → "qua màn", lên level kế tiếp.
    const need=comboThresholdForTier(mainHardTier);
    const earned=Math.min(Math.round(score-comboGateBaseline), need);
    bc.textContent=
      earned>=need?t('passReady', mainHardTier):
      t('passProgress', mainHardTier, earned, need);
  } else {
    bc.textContent=
      consecutiveBursts>=3?t('unlockReady'):t('burstCount', consecutiveBursts);
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
      setTimeout(()=>showComboFlash(0,false,t('passLevel', passedTier, mainHardTier, MECH_NAME(na)+' + '+MECH_NAME(nb))), 300);
    } else {
      setTimeout(()=>showComboFlash(0,false,t('passLevel', passedTier, mainHardTier, MECH_NAME(21))), 300);
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
  document.getElementById('unlock-title').textContent=t('unlockTitle');
  document.getElementById('unlock-desc').innerHTML=t('unlockDesc', TEST_UNLOCK_SCORE);
  document.getElementById('unlock-btn').textContent=t('unlockBtn');
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
  const el=document.getElementById('score-box');
  const next=Math.round(score).toLocaleString();
  if(el.textContent!==next){
    el.textContent=next;
    el.classList.remove('tick');
    void el.offsetWidth;
    el.classList.add('tick');
    clearTimeout(el._tickT);
    el._tickT=setTimeout(()=>el.classList.remove('tick'), 180);
  }
  document.getElementById('best-box').textContent=t('bestLabel', Math.round(best).toLocaleString());
  document.getElementById('lines-cleared').textContent='Hàng xóa: '+linesCleared;
  if(secretMode && document.getElementById('game-root')?.classList.contains('hud-arcade')){
    const lb=document.getElementById('level-box');
    if(lb) lb.textContent=String(typeof playerLevel==='number'?playerLevel:level);
    if(typeof refreshArcadeHud==='function') refreshArcadeHud();
  } else {
    document.getElementById('level-box').textContent=t('levelLabel', level);
  }
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
    document.getElementById('mode-badge').classList.remove('secret');
  }

  if(secretMode){
    // Force exit secret mode first
    secretMode=false;
    document.getElementById('secret-grid').classList.remove('active');
    document.getElementById('secret-grid').innerHTML=''; secretCells=null;
    document.getElementById('secret-stage')?.classList.remove('active');
    document.getElementById('grid-wrap').classList.remove('theme-garden');
    document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    document.getElementById('timer-bar-wrap').classList.remove('active');
    document.getElementById('secret-streak-bar').classList.remove('active');
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
    document.getElementById('mode-badge').textContent=t('badgeNormal');
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
const HIDDEN_MAP_LIST = [
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
  { key:'floodpig',label:'Map ẩn 22 — Cẩu cứu heo mùa lũ',   run: () => startMap('floodpig') },
];
let clearedHiddenMaps = new Set(getSavedClearedMaps());

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
  const sg=document.getElementById('secret-grid');          if(sg){ sg.innerHTML=''; sg.classList.remove('active'); }
  secretCells=null;
  document.getElementById('secret-stage')?.classList.remove('active');
  document.getElementById('grid-wrap')?.classList.remove('theme-garden');
  document.getElementById('game-root')?.classList.remove('hud-arcade');
  const _acc=document.getElementById('account-btn');
  if(_acc && _acc.dataset.prevEmoji){ _acc.textContent=_acc.dataset.prevEmoji; delete _acc.dataset.prevEmoji; }
  const _targets=document.getElementById('header-targets'); if(_targets) _targets.innerHTML='';
  const _lcap=document.getElementById('level-cap'); if(_lcap) _lcap.style.display='none';

  // Trả UI chính về trạng thái mặc định
  const grid=document.getElementById('grid');             if(grid)   grid.style.display='';
  const pieces=document.getElementById('pieces-area');    if(pieces) pieces.style.display='';
  const hint=document.getElementById('hint-bar');         if(hint)   hint.style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow',
    'combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5','fire-low','fire-high','theme-garden');
  document.getElementById('mode-badge').textContent=t('badgeNormal');
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
initGamePanels();
initAccountPanel();

initHelpPanel();
initStartScreen();
initDailyRewardPanel();
initLeaderboardPanel();
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
document.getElementById('best-box').textContent=t('bestLabel', best.toLocaleString());

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

