// ═══════════════════════════════════════════════════════════════
// maps/map15.js — MAP ẨN 15: Phá gạch (Brick Breaker)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const BRICK_COLS=8, BRICK_ROWS=3;
const BrCV=()=>document.getElementById('brick-canvas');

// (đã chuyển khai báo biến mode lên đầu file để tránh lỗi TDZ)
let brickBall={x:180,y:360,vx:180,vy:-220,launched:false,r:8};
let brickPaddleX=180, brickPaddleW=80, brickPaddleH=14;
let brickBricks=[], brickLives=3, brickScore=0, brickFx=[];
let brickWidePaddleTimer=0;
let brickCombo=0, brickComboTimer=0;
let brickPointerActive=false;

function triggerBrickUnlock(){
  markMapCleared('snake');
  pendingUnlock='brick';
  document.getElementById('unlock-title').textContent='🧱 MAP ẨN 15 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML='Phá gạch kiểu Arkanoid! Bóng nảy phá 24 viên gạch. 3 mạng ❤️❤️❤️';
  document.getElementById('unlock-btn').textContent='🧱 PHÁ THÔI!';
  showUnlockOverlay();
  sfxUnlock();
}

function initBricks(){
  brickBricks=[];
  const bw=38, bh=22, gap=4;
  const startX=(360-(BRICK_COLS*bw+(BRICK_COLS-1)*gap))/2;
  const colors=['#e84040','#f7c948','#4080e8'];
  const hps=[1,2,1];
  for(let row=0;row<BRICK_ROWS;row++){
    for(let col=0;col<BRICK_COLS;col++){
      brickBricks.push({
        x:startX+col*(bw+gap), y:65+row*30,
        w:bw, h:bh, hp:hps[row], maxHp:hps[row],
        color:colors[row], alive:true
      });
    }
  }
}

function enterBrickMode(){
  setActiveHiddenMap('brick');
  endDrag();
  sfxUnlock();
  startBgm('main');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  BrCV().classList.add('active');
  document.getElementById('mode-badge').textContent='🧱 MAP ẨN 15';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='🧱 Gạch: 24/24';
  document.getElementById('hint-bar').textContent='Chạm/kéo để điều khiển vợt · Chạm để bắt đầu';
  document.getElementById('grid-wrap').classList.add('secret-mode');
  initBricks();
  brickBall={x:180,y:360,vx:180,vy:-220,launched:false,r:8};
  brickPaddleX=180; brickPaddleW=80; brickLives=3; brickScore=0; brickFx=[];
  brickWidePaddleTimer=0;
  brickCombo=0; if(brickComboTimer){clearTimeout(brickComboTimer); brickComboTimer=0;}
  document.getElementById('combo-box').textContent='';
  brickMode=true;
  brickLast=performance.now();
  brickRAF=requestAnimationFrame(brickLoop);
}

function brickLoop(now){
  if(!brickMode){ brickRAF=null; return; }
  const dt=Math.min(0.05,Math.max(0,(now-(brickLast||now))/1000));
  brickLast=now;
  const cv=BrCV(), W=360, H=460;
  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);

  brickWidePaddleTimer=Math.max(0,brickWidePaddleTimer-dt);
  const pw=brickWidePaddleTimer>0?110:brickPaddleW;
  const paddleY=H-50;

  if(brickBall.launched){
    brickBall.x+=brickBall.vx*dt;
    brickBall.y+=brickBall.vy*dt;
    // wall bounces
    if(brickBall.x<=brickBall.r){ brickBall.x=brickBall.r; brickBall.vx=Math.abs(brickBall.vx); sfxBallWall(); }
    if(brickBall.x>=W-brickBall.r){ brickBall.x=W-brickBall.r; brickBall.vx=-Math.abs(brickBall.vx); sfxBallWall(); }
    if(brickBall.y<=brickBall.r){ brickBall.y=brickBall.r; brickBall.vy=Math.abs(brickBall.vy); sfxBallWall(); }
    // paddle collision
    const halfPW=pw/2;
    if(brickBall.y+brickBall.r>=paddleY && brickBall.y+brickBall.r<=paddleY+brickPaddleH+5 &&
       brickBall.x>=brickPaddleX-halfPW && brickBall.x<=brickPaddleX+halfPW && brickBall.vy>0){
      brickBall.vy=-Math.abs(brickBall.vy);
      brickBall.vx+=(brickBall.x-brickPaddleX)*3;
      const spd=Math.hypot(brickBall.vx,brickBall.vy);
      const norm=280/spd;
      brickBall.vx*=norm; brickBall.vy*=norm;
      brickBall.y=paddleY-brickBall.r-1;
      sfxBallPaddle();
    }
    // brick collisions
    for(let b of brickBricks){
      if(!b.alive) continue;
      if(brickBall.x+brickBall.r>b.x && brickBall.x-brickBall.r<b.x+b.w &&
         brickBall.y+brickBall.r>b.y && brickBall.y-brickBall.r<b.y+b.h){
        // figure out bounce direction
        const overlapL=brickBall.x+brickBall.r-b.x;
        const overlapR=b.x+b.w-brickBall.x+brickBall.r;
        const overlapT=brickBall.y+brickBall.r-b.y;
        const overlapB=b.y+b.h-brickBall.y+brickBall.r;
        const minH=Math.min(overlapL,overlapR);
        const minV=Math.min(overlapT,overlapB);
        if(minH<minV) brickBall.vx=-brickBall.vx;
        else brickBall.vy=-brickBall.vy;
        b.hp--;
        if(b.hp<=0){
          b.alive=false;
          brickCombo++;
          if(brickComboTimer) clearTimeout(brickComboTimer);
          brickComboTimer=setTimeout(()=>{ brickCombo=0; brickComboTimer=0; document.getElementById('combo-box').textContent=''; },1000);
          const basePts=b.maxHp===2?2:1;
          const pts=basePts*comboScoreMultiplier(brickCombo);
          brickScore+=pts; score+=pts; if(best<score) best=score;
          brickFx.push({x:b.x+b.w/2,y:b.y+b.h/2,t:0,text:'+'+pts+(brickCombo>1?' x'+brickCombo:'')});
          document.getElementById('combo-box').textContent=brickCombo>1?'🧱 x'+brickCombo:'';
          if(!sfxMuted) sfxComboUp(brickCombo);
          if(brickCombo>=3) showComboFlash(0,false,'💥 COMBO x'+brickCombo+'!');
          sfxBrickBreak();
        } else {
          brickScore+=1; score+=1; if(best<score) best=score;
          sfxBallBrick();
        }
        updateScoreUI();
        const alive=brickBricks.filter(b=>b.alive).length;
        document.getElementById('burst-count').textContent='🧱 Gạch: '+alive+'/'+(BRICK_COLS*BRICK_ROWS);
        break;
      }
    }
    // ball falls off bottom
    if(brickBall.y>H+10){
      brickLives--;
      brickCombo=0; if(brickComboTimer){clearTimeout(brickComboTimer); brickComboTimer=0;} document.getElementById('combo-box').textContent='';
      if(brickLives<=0){ brickDone(false); return; }
      sfxPenalty();
      brickBall={x:brickPaddleX,y:paddleY-brickBall.r-2,vx:180+(Math.random()-0.5)*60,vy:-220,launched:false,r:8};
    }
    // win check
    if(brickBricks.every(b=>!b.alive)){ brickDone(true); return; }
  } else {
    brickBall.x=brickPaddleX;
    brickBall.y=paddleY-brickBall.r-2;
  }

  brickFx=brickFx.filter(f=>{ f.t+=dt; return f.t<1; });
  drawBrick(ctx,W,H,pw,paddleY);
  brickRAF=requestAnimationFrame(brickLoop);
}

function drawBrick(ctx,W,H,pw,paddleY){
  // đêm Map 4 giàu chi tiết
  scenicNightFull(ctx,W,H,Date.now()*0.001);
  // Bricks — kẹo bông mềm
  brickBricks.forEach(b=>{
    if(!b.alive) return;
    drawSoftCandyCell(ctx,b.x+1,b.y+1,b.w-2,b.h-2,b.color,{r:7,glowBlur:3});
    if(b.maxHp===2&&b.hp===2){
      ctx.fillStyle='rgba(255,255,255,0.92)';
      ctx.font='bold 11px Nunito,system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('2',b.x+b.w/2,b.y+b.h/2);
    }
  });
  // Ball
  ctx.shadowBlur=12; ctx.shadowColor='#fff';
  ctx.fillStyle='#ffffff';
  ctx.beginPath();
  ctx.arc(brickBall.x,brickBall.y,brickBall.r,0,Math.PI*2);
  ctx.fill();
  ctx.shadowBlur=0;
  // Paddle
  const halfPW=pw/2;
  const pg=ctx.createLinearGradient(brickPaddleX-halfPW,paddleY,brickPaddleX+halfPW,paddleY+brickPaddleH);
  pg.addColorStop(0,'#4488ff'); pg.addColorStop(1,'#aaccff');
  ctx.fillStyle=pg;
  ctx.beginPath();
  ctx.roundRect(brickPaddleX-halfPW,paddleY,pw,brickPaddleH,7);
  ctx.fill();
  drawHudTop(ctx,W,{left:'❤️'.repeat(Math.max(0,brickLives)), right:'⭐ '+brickScore});
  // Fx
  brickFx.forEach(f=>{
    ctx.globalAlpha=1-f.t;
    ctx.fillStyle='#ffcc00'; ctx.font='bold 14px Nunito,system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(f.text,f.x,f.y-f.t*30);
    ctx.globalAlpha=1;
  });
}

function brickDone(won){
  brickMode=false;
  if(brickRAF){ cancelAnimationFrame(brickRAF); brickRAF=null; }
  if(won){
    sfxWaveWin();
    updateScoreUI();
    showComboFlash(0,false,'🧱 ALL CLEAR!');
    setTimeout(()=>startUnlockGate(14),1500);
  } else {
    forfeitHiddenMapScore();
    setTimeout(exitBrickToMain, 800);
  }
}

function exitBrickToMain(){
  setActiveHiddenMap(null);
  brickMode=false;
  startBgm('main');
  brickCombo=0; if(brickComboTimer){clearTimeout(brickComboTimer); brickComboTimer=0;}
  if(brickRAF){ cancelAnimationFrame(brickRAF); brickRAF=null; }
  BrCV().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('hint-bar').textContent=(typeof t==='function'?t('hintDefault'):'');
  document.getElementById('combo-box').textContent='';
  renderPieces(); checkGameOverA();
}

BrCV().addEventListener('pointermove', e=>{
  if(!brickMode) return;
  const r=BrCV().getBoundingClientRect();
  brickPaddleX=(e.clientX-r.left)*(360/r.width);
  brickPaddleX=Math.max(brickPaddleW/2+4, Math.min(360-brickPaddleW/2-4, brickPaddleX));
});
BrCV().addEventListener('pointerdown', e=>{
  if(!brickMode) return;
  const r=BrCV().getBoundingClientRect();
  brickPaddleX=(e.clientX-r.left)*(360/r.width);
  brickPaddleX=Math.max(brickPaddleW/2+4, Math.min(360-brickPaddleW/2-4, brickPaddleX));
  if(!brickBall.launched){ brickBall.launched=true; }
});
