// ═══════════════════════════════════════════════════════════════
// maps/map01.js — MAP ẨN 1: Đấu màu bí ẩn (Secret Color Match)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

/* ══════════════════════════════════════════
   MODE B — SECRET COLOR MATCH
══════════════════════════════════════════ */
function renderSecretHearts(){
  const el=document.getElementById('secret-hearts');
  if(!el) return;
  el.textContent='❤️'.repeat(Math.max(0,secretLives))+'🖤'.repeat(Math.max(0,3-secretLives));
  if(typeof refreshArcadeHud==='function' && secretMode) refreshArcadeHud();
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

  // Show mode B UI — sân vườn cùng phong cách Map 4 (chó / ong)
  document.getElementById('grid-wrap').classList.add('theme-garden');
  const sg=document.getElementById('secret-grid');
  sg.classList.add('active');
  document.getElementById('secret-stage')?.classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('timer-bar-wrap').classList.add('active');
  document.getElementById('secret-streak-bar').classList.add('active');
  document.getElementById('mode-badge').textContent='🔥 MAP ẨN';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='Nhân: x1';

  // HUD arcade dùng chung (SCORE / LEVEL / TARGETS)
  if(typeof enableArcadeHud==='function') enableArcadeHud();
  // Xoá sạch pháo cũ còn sót trên bàn
  const fx=document.getElementById('sc-fx');
  if(fx){ fx.innerHTML=''; fx.classList.remove('active'); }
  const cbs=document.getElementById('combo-border-sparks');
  if(cbs) cbs.innerHTML='';
  document.getElementById('combo-flash')?.classList.remove('show');
  document.getElementById('combo-count-flash')?.classList.remove('show');

  // reset fire on enter
  if(fireInterval){ clearInterval(fireInterval); fireInterval=null; }
  document.getElementById('grid-wrap').classList.remove('fire-low','fire-mid','fire-high','fire-max');
  _sparklerT=0;

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
  document.getElementById('grid-wrap').classList.remove('fire-low','fire-mid','fire-high','fire-max');
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
  document.getElementById('secret-stage')?.classList.remove('active');
  document.getElementById('grid-wrap').classList.remove('theme-garden');
  const fx=document.getElementById('sc-fx');
  if(fx){ fx.classList.remove('active'); fx.innerHTML=''; }
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('timer-bar-wrap').classList.remove('active');
  document.getElementById('secret-streak-bar').classList.remove('active');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  updateBurstCount();

  // Giữ HUD arcade — chỉ làm mới TARGETS về map thường
  if(typeof enableArcadeHud==='function') enableArcadeHud();
  else if(typeof refreshArcadeHud==='function') refreshArcadeHud();

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
    if(ci===null){ d.style.background=''; d.style.border=''; d.style.removeProperty('--cc'); } // ô trống: style từ CSS sân vườn
    else { const col=SECRET_COLORS[ci]; d.style.border=''; d.style.background=''; d.style.setProperty('--cc',col); }
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





/* ✨ Tia lấp lánh bắn ra tại mỗi ô + 💠 vòng sóng màu từ tâm vụ nổ */

// Kết thúc ván Map ẩn 1 khi HẾT TIM (secretLives<=0) — quyết định THẮNG hay THUA
// dựa trên việc đã đạt đủ điểm (TEST_UNLOCK_SCORE) hay chưa tại thời điểm hết tim.
// Không còn thoát giữa chừng chỉ vì đạt đủ điểm — người chơi được chơi tiếp tới khi hết tim.
function secret1Finish(){
  if(secret1Gained>=TEST_UNLOCK_SCORE){
    clearSecretTimer();
    sfxWaveWin();
    showComboFlash(0,false,'🏆 '+secret1Gained+' điểm! THẮNG!');
    setTimeout(()=>{
      exitSecretMode();
      startUnlockGate(0);
    }, 310);
  } else {
    forfeitHiddenMapScore();
    exitSecretMode();
  }
}

function onSCClick(e){
  if(!secretMode) return;
  const r=+e.currentTarget.dataset.r, c=+e.currentTarget.dataset.c;
  const group=findGroup(r,c);
  if(group.length<3){
    showHint('⚠️ Cần ít nhất 3 ô cùng màu liền kề!');
    // Shake visual
    const cell=getSC(r,c);
    if(cell){ cell.style.animation='none'; void cell.offsetWidth; cell.style.animation=''; }
    secretMissStreak++;
    if(secretUltra){
      // Chế độ lửa (thanh vàng đầy): bấm sai liên tiếp 5 phát → mất 1 tim, thoát chế độ lửa.
      // Chỉ thua & về map thường khi HẾT TIM (secretLives<=0) — trước đây bấm sai 5 phát
      // trong chế độ lửa ép thoát ngay lập tức, bỏ qua số tim còn lại. Đây là lỗi đã sửa.
      if(secretMissStreak>=5){
        secretMissStreak=0;
        secretStreak=0; secretUltra=false; secretMultiplier=1;
        document.getElementById('grid-wrap').classList.remove('ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
        renderStreakDots();
        secretLives--;
        renderSecretHearts();
        sfxPenalty();
        if(secretLives<=0){
          secret1Finish();
        } else {
          showComboFlash(0,false,'🔥 Sai 5 phát! Mất 1 tim — còn '+secretLives+' tim.');
          resetSecretTimer();
        }
      } else if(secretMissStreak>=3){
        showHint('🔥 Sai '+secretMissStreak+'/5 — sai 5 phát mất 1 tim!');
      }
      return;
    }
    // Map thường (chưa lửa): bấm sai liên tiếp 3 lần → mất 1 tim; hết tim → thua, về map thường
    if(secretMissStreak>=3){
      secretMissStreak=0;
      secretLives--;
      renderSecretHearts();
      sfxPenalty();
      if(secretLives<=0){
        secret1Finish();
      }
    }
    return;
  }
  secretMissStreak=0;

  // Valid blast — 1 điểm/ô, đồng bộ quy tắc map thường
  const ci=secretBoard[r][c];
  const basePoints=group.length;

  // Check timer — is this within SECRET_WINDOW of last blast?
  const now=Date.now();
  let withinWindow=secretTimerEnd>0 && now<secretTimerEnd;

  if(withinWindow){
    secretStreak++;
    sfxStreak(secretStreak);
  } else {
    secretStreak=1;
    secretUltra=false;
    document.getElementById('grid-wrap').classList.remove('ultra-glow');
  }
  try{ if(typeof onComboSkillMilestone==='function') onComboSkillMilestone(secretStreak); }catch(e){}
  secretMultiplier=comboScoreMultiplier(secretStreak); // x2 từ streak 3, x3 từ streak 6

  // Ultra mode: 9 consecutive hits
  let ultraJustTriggered=false;
  if(secretStreak>=SECRET_ULTRA && !secretUltra){
    secretUltra=true; ultraJustTriggered=true;
    document.getElementById('grid-wrap').classList.add('ultra-glow');
    unlockAchievement('ultra');
    sfxUltra();
  }

  const finalPts=Math.round(basePoints*secretMultiplier*(secretUltra?2:1));
  score+=finalPts; if(score>best) best=score;
  // Không showComboCountFlash giữa bàn — streak đã hiện ở thanh chấm
  sfxMatch(group.length);
  secret1Gained+=finalPts;
  if(secret1Gained>=TEST_UNLOCK_SCORE && !secret1GoalShown){
    secret1GoalShown=true;
    showHint('🏆 Đã đạt đủ điểm mở khoá! Cứ chơi tiếp — chỉ về khi hết tim.');
  }
  updateScoreUI();
  updateBurstCount();
  document.getElementById('burst-count').textContent=
    `Nhân: x${secretMultiplier}${secretUltra?' 🌟':''}`;

  renderStreakDots();
  updateComboBorderGlow(secretStreak);
  updateFireBorder();
  const _ctr=clearCentroid(group, getSC);
  showScorePop(basePoints, finalPts, _ctr.x, _ctr.y, secretStreak);
  // Map ẩn 1: KHÔNG pháo/chữ nổ giữa bàn — chỉ sparkler viền (updateFireBorder)
  // Giữ lồng tiếng khen, bỏ flash chữ giữa lưới
  if(!ultraJustTriggered && shouldPraise(secretStreak)){
    try{ speakPraise(praiseLevelForStreak(secretStreak)); }catch(e){}
  }
  refreshArcadeHud();

  // Animate pop
  group.forEach(([gr,gc])=>{
    const cell=getSC(gr,gc);
    if(cell){ cell.classList.add('pop-sc'); }
    secretBoard[gr][gc]=null;
  });

  // Đạt đủ điểm trong ván map ẩn 1 (TEST_UNLOCK_SCORE) — KHÔNG còn tự thoát giữa chừng nữa.
  // Người chơi được chơi tiếp cho tới khi HẾT TIM; lúc đó secret1Finish() sẽ tự xét thắng/thua
  // dựa trên secret1Gained>=TEST_UNLOCK_SCORE.

  // Start/reset timer
  resetSecretTimer();

  // After animation, drop tiles
  setTimeout(()=>{
    dropSecretTiles();
    renderSecretGrid();
  }, 310);
}

function dropSecretTiles(){
  // For each column, shift non-null down, fill top with new randoms
  for(let c=0;c<COLS;c++){
    let col=[];
    for(let r=0;r<ROWS;r++) if(secretBoard[r][c]!==null) col.push(secretBoard[r][c]);
    while(col.length<ROWS) col.unshift(Math.floor(Math.random()*SECRET_COLORS.length)); // new tiles fall from top
    for(let r=0;r<ROWS;r++) secretBoard[r][c]=col[r];
  }
  // Không dùng hiệu ứng rơi vào (fall-in) cho map ẩn 1
}

// Timer management
function resetSecretTimer(){
  clearSecretTimer();
  // Đang ở chế độ lửa (ultra) → thời gian giảm nhanh GẤP ĐÔI bình thường (cửa sổ còn 1/2)
  const windowMs = secretUltra ? SECRET_WINDOW/2 : SECRET_WINDOW;
  secretTimerEnd=Date.now()+windowMs;
  animateTimerBar();

  secretTimer=setTimeout(()=>{
    // Hết giờ (không bấm đúng kịp trong cửa sổ) — coi như 1 lần hụt giống bấm sai:
    // đứt chuỗi/nhân điểm và MẤT 1 TIM. Chỉ thua & thoát về map thường khi HẾT TIM (secretLives<=0).
    // (Trước đây hết giờ luôn ép thoát ngay cả khi vẫn còn tim — đây là lỗi cần sửa.)
    secretStreak=0; secretUltra=false; secretMultiplier=1;
    document.getElementById('grid-wrap').classList.remove('ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    renderStreakDots();
    secretMissStreak=0;
    secretLives--;
    renderSecretHearts();
    sfxPenalty();
    if(secretLives<=0){
      secret1Finish();
    } else {
      showHint('⏱ Hết giờ! Mất 1 tim — còn '+secretLives+' tim.');
      resetSecretTimer();
    }
  }, windowMs);
}

function clearSecretTimer(){
  if(secretTimer) clearTimeout(secretTimer);
  secretTimer=null;
  if(timerRAF) cancelAnimationFrame(timerRAF);
  timerRAF=null;
}

function animateTimerBar(){
  const bar=document.getElementById('timer-bar');
  const windowMs = secretUltra ? SECRET_WINDOW/2 : SECRET_WINDOW; // phải khớp với resetSecretTimer
  function frame(){
    const now=Date.now();
    const remaining=Math.max(0, secretTimerEnd-now);
    const pct=remaining/windowMs;
    bar.style.transform=`scaleX(${pct})`;
    bar.classList.toggle('danger', pct<0.3);
    if(remaining>0) timerRAF=requestAnimationFrame(frame);
  }
  timerRAF=requestAnimationFrame(frame);
}

function renderStreakDots(){
  const bar=document.getElementById('secret-streak-bar');
  // Keep label, rebuild dots
  bar.innerHTML='<span style="font-size:11px;color:#888;">Chuỗi:</span>';
  for(let i=0;i<SECRET_ULTRA;i++){
    const dot=document.createElement('div');
    dot.className='streak-dot'+(i<secretStreak?(secretUltra?' ultra':' lit'):'');
    bar.appendChild(dot);
  }
}
