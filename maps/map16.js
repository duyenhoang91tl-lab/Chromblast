// ═══════════════════════════════════════════════════════════════
// maps/map16.js — MAP ẨN 16: Chạy vô tận (Infinite Runner)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const RUNNER_GROUND_Y_FRAC=0.82;
const RuCV=()=>document.getElementById('runner-canvas');
const RUNNER_GRAVITY=800, RUNNER_JUMP_VY=-380, RUNNER_JUMP2_VY=-300;
const RUNNER_JUMP_BUFFER=0.1; // ấn sớm trong 0.1s trước khi chạm đất vẫn được tính, nhảy tiếp ngay khi đáp
let runnerJumpBuffer=0;
function runnerTryJump(){
  if(runnerJumps===0){ runnerDogVY=RUNNER_JUMP_VY; runnerJumps=1; sfxRunnerJump(); }
  else if(runnerJumps===1){ runnerDogVY=RUNNER_JUMP2_VY; runnerJumps=2; sfxRunnerDoubleJump(); }
  else { runnerJumpBuffer=RUNNER_JUMP_BUFFER; } // đang hết lượt nhảy → ghi nhớ cú ấn, đáp đất sẽ bật lại ngay
}

// (đã chuyển khai báo biến mode lên đầu file để tránh lỗi TDZ)
let runnerDogY=0, runnerDogVY=0, runnerJumps=0;
let runnerObstacles=[], runnerStars=[], runnerFx=[];
let runnerSpeed=180, runnerScore=0, runnerLives=2;
let runnerSpawnTimer=0, runnerInvincible=0;
let runnerScrollX=0;
let runnerStarSpawnTimer=0;

function triggerRunnerUnlock(){
  markMapCleared('brick');
  pendingUnlock='runner';
  document.getElementById('unlock-title').textContent='🏃 MAP ẨN 16 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML='Chạy vô tận! Chó tự chạy, chạm để nhảy né chướng ngại vật.<br>Nhảy đôi: chạm 2 lần! Sống sót <b>60 giây</b>!';
  document.getElementById('unlock-btn').textContent='🏃 CHẠY THÔI!';
  showUnlockOverlay();
  sfxUnlock();
}

function enterRunnerMode(){
  setActiveHiddenMap('runner');
  endDrag();
  sfxUnlock();
  startBgm('action');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  RuCV().classList.add('active');
  document.getElementById('mode-badge').textContent='🏃 MAP ẨN 16';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='⏱ 60s';
  document.getElementById('hint-bar').textContent='Chạm để nhảy · Chạm 2 lần = nhảy đôi';
  document.getElementById('grid-wrap').classList.add('secret-mode');
  const cv=RuCV();
  const H=460;
  runnerElapsed=0; runnerScore=0; runnerLives=2; runnerSpeed=180;
  runnerDogY=H*RUNNER_GROUND_Y_FRAC-36;
  runnerDogVY=0; runnerJumps=0; runnerJumpBuffer=0;
  runnerObstacles=[]; runnerStars=[]; runnerFx=[];
  runnerSpawnTimer=1.5;
  runnerStarSpawnTimer=1.0;
  runnerInvincible=0;
  runnerScrollX=0;
  runnerMode=true;
  runnerLast=performance.now();
  runnerRAF=requestAnimationFrame(runnerLoop);
}

function runnerLoop(now){
  if(!runnerMode){ runnerRAF=null; return; }
  const dt=Math.min(0.05,Math.max(0,(now-(runnerLast||now))/1000));
  runnerLast=now;
  const cv=RuCV(), W=360, H=460;
  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  const GROUND=H*RUNNER_GROUND_Y_FRAC-36;

  runnerElapsed+=dt;
  const timeLeft=Math.max(0,60-runnerElapsed);
  runnerScore+=dt*1; // 1 điểm/giây chạy được
  runnerSpeed=Math.min(400, 180+runnerElapsed*2);
  runnerScrollX+=runnerSpeed*dt;

  // Physics
  runnerDogVY+=RUNNER_GRAVITY*dt;
  runnerDogY+=runnerDogVY*dt;
  if(runnerJumpBuffer>0) runnerJumpBuffer=Math.max(0,runnerJumpBuffer-dt);
  if(runnerDogY>=GROUND){
    if(runnerDogVY>50) sfxRunnerLand();
    runnerDogY=GROUND; runnerDogVY=0; runnerJumps=0;
    if(runnerJumpBuffer>0){ runnerJumpBuffer=0; runnerTryJump(); } // cú ấn đệm → bật nhảy ngay khi đáp
  }

  // Spawn obstacles
  runnerSpawnTimer-=dt;
  if(runnerSpawnTimer<=0){
    const types=['🌵','🪨','🌵','🪨','🌵'];
    runnerObstacles.push({x:W+20, y:H*RUNNER_GROUND_Y_FRAC, emoji:types[Math.floor(Math.random()*types.length)]});
    runnerSpawnTimer=(0.8+Math.random()*0.8)/(runnerSpeed/180);
  }
  // Spawn stars
  runnerStarSpawnTimer-=dt;
  if(runnerStarSpawnTimer<=0){
    runnerStars.push({x:W+10, y:20+Math.random()*(H*RUNNER_GROUND_Y_FRAC*0.6)});
    runnerStarSpawnTimer=0.4+Math.random()*0.8;
  }

  // Move obstacles
  runnerObstacles=runnerObstacles.filter(o=>{ o.x-=runnerSpeed*dt; return o.x>-40; });
  runnerStars=runnerStars.filter(s=>{
    s.x-=runnerSpeed*0.6*dt;
    if(Math.abs(s.x-80)<20 && Math.abs(s.y-runnerDogY)<24){
      const pts=1; runnerScore+=pts; score+=pts; if(best<score) best=score;
      runnerFx.push({x:s.x,y:s.y,t:0,text:'+'+pts});
      sfxRunnerStar(); updateScoreUI(); return false;
    }
    return s.x>-20;
  });

  // Invincible timer
  const wasInvinc=runnerInvincible>0;
  runnerInvincible=Math.max(0,runnerInvincible-dt);
  if(wasInvinc && runnerInvincible<=0) sfxInvincEnd();

  // Collision
  const dogHB={x:80-14, y:runnerDogY, w:28, h:30};
  for(let o of runnerObstacles){
    const ob={x:o.x-14, y:o.y-28, w:28, h:28};
    if(dogHB.x<ob.x+ob.w && dogHB.x+dogHB.w>ob.x &&
       dogHB.y<ob.y+ob.h && dogHB.y+dogHB.h>ob.y){
      if(runnerInvincible<=0){
        runnerLives--;
        runnerInvincible=2;
        sfxPenalty();
        runnerFx.push({x:80,y:runnerDogY,t:0,text:'💔 -1'});
        if(runnerLives<=0){ runnerDone(false); return; }
      }
    }
  }

  // Update fx
  runnerFx=runnerFx.filter(f=>{ f.t+=dt; return f.t<1; });

  // Win
  if(timeLeft<=0){ runnerDone(true); return; }

  document.getElementById('burst-count').textContent='⏱ '+Math.ceil(timeLeft)+'s';

  drawRunner(ctx,W,H,timeLeft);
  runnerRAF=requestAnimationFrame(runnerLoop);
}

function drawRunner(ctx,W,H,timeLeft){
  const GROUND_Y=H*RUNNER_GROUND_Y_FRAC;

  // Sky Map 4
  cuteDayBg(ctx,W,GROUND_Y,Date.now()*0.001);
  beeDrawCloud(ctx,110+Math.sin(Date.now()*0.00008)*18,42,1.0);
  // Far mountains (parallax 0.3x) — tím pastel xa xăm
  ctx.fillStyle='#b8b0e0';
  for(let i=0;i<6;i++){
    const mx=((i*120 - (runnerScrollX*0.3)%720 + 720) % 720);
    ctx.beginPath();
    ctx.moveTo(mx-60,GROUND_Y); ctx.lineTo(mx,GROUND_Y-70); ctx.lineTo(mx+60,GROUND_Y);
    ctx.fill();
  }
  // Near mountains (0.5x) — xanh ngọc pastel
  ctx.fillStyle='#8fc8a8';
  for(let i=0;i<8;i++){
    const mx=((i*90 - (runnerScrollX*0.5)%720 + 720) % 720);
    ctx.beginPath();
    ctx.moveTo(mx-45,GROUND_Y); ctx.lineTo(mx,GROUND_Y-45); ctx.lineTo(mx+45,GROUND_Y);
    ctx.fill();
  }

  // Ground Map 4
  scenicGrass(ctx,W,H,GROUND_Y);
  cuteGardenStrip(ctx,W,H,Date.now()*0.001,H-6,false);
  ctx.fillStyle='#3d8020';
  ctx.fillRect(0,GROUND_Y,W,6);

  // Stars
  ctx.font='20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  runnerStars.forEach(s=> ctx.fillText('⭐',s.x,s.y));

  // Obstacles
  ctx.font='28px serif';
  runnerObstacles.forEach(o=> ctx.fillText(o.emoji,o.x,o.y));

  // Dog (invincible: flicker)
  if(runnerInvincible<=0 || Math.floor(runnerInvincible*8)%2===0){
    ctx.font='36px serif'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('🐶',80,runnerDogY+36);
  }

  const timePct=Math.max(0,timeLeft/60);
  const timeCol=timeLeft>20?'#44cc44':timeLeft>10?'#ffcc00':'#ff4444';
  drawHudTop(ctx,W,{left:'❤️'.repeat(Math.max(0,runnerLives)), center:'⏱ '+Math.ceil(timeLeft)+'s', right:'⭐ '+Math.floor(runnerScore), progress:timePct, progressColor:timeCol});

  // Fx
  runnerFx.forEach(f=>{
    ctx.globalAlpha=1-f.t;
    ctx.fillStyle='#ff4444'; ctx.font='bold 14px Nunito,system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(f.text,f.x,f.y-f.t*40);
    ctx.globalAlpha=1;
  });
}

function runnerDone(won){
  runnerMode=false;
  runnerWon=won;
  if(runnerRAF){ cancelAnimationFrame(runnerRAF); runnerRAF=null; }
  if(won){
    sfxWaveWin();
    score+=Math.floor(runnerScore); if(best<score) best=score;
    updateScoreUI();
    showComboFlash(0,false,'🏆 TRUYỀN THUYẾT CHROMABLAST! 16 BẢN ĐỒ!');
    setTimeout(exitRunnerToMain, 3500);
  } else {
    forfeitHiddenMapScore();
    setTimeout(exitRunnerToMain, 800);
  }
}

function exitRunnerToMain(){
  setActiveHiddenMap(null);
  runnerMode=false;
  startBgm('main');
  if(runnerRAF){ cancelAnimationFrame(runnerRAF); runnerRAF=null; }
  RuCV().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('hint-bar').textContent='Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay';
  renderPieces(); checkGameOverA();
  if(runnerWon) setTimeout(()=>startUnlockGate(15), 1500);
}

RuCV().addEventListener('pointerdown', e=>{
  if(!runnerMode) return;
  e.preventDefault();
  runnerTryJump();
},{passive:false});
