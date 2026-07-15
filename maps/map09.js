// ═══════════════════════════════════════════════════════════════
// maps/map09.js — MAP ẨN 9: Xếp tháp (Stack Tower)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const STACK_TIME=90, STACK_KPI=15;
const STACK_COLORS=['#e84040','#e88040','#e8c040','#40c040','#4080e8','#9040c8','#e84080','#40c8c8'];
const BLOCK_H=28, BLOCK_BASE_W=180;

let stackMode=false, stackRAF=null, stackLast=0, stackElapsed=0;
let stackBlocks=[], stackMoving={x:0,w:0,color:'#e84040'};
let stackDir=1, stackSpeed=80, stackScore=0, stackCount=0, stackPerfectStreak=0;
let stackCameraY=0, stackFx=[];

const STCV=()=>document.getElementById('stack-canvas');

function triggerStackUnlock(){
  markMapCleared('bubble');
  pendingUnlock='stack';
  document.getElementById('unlock-title').textContent='🏗️ MAP ẨN 9 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    '🏗️ <b>Xếp Tháp!</b><br><br>'+
    'Một khối đang di chuyển qua lại. Chạm → thả xuống!<br>'+
    'Phần thừa bị cắt đi. Trượt hết → game over!<br>'+
    'Xếp <b>'+STACK_KPI+' tầng</b> trong <b>'+STACK_TIME+'s</b> để thắng!<br>'+
    'Căn giữa hoàn hảo → Thưởng điểm PERFECT!';
  document.getElementById('unlock-btn').textContent='🏗️ XẾP THÔI!';
  showUnlockOverlay();
}

function enterStackMode(){
  setActiveHiddenMap('stack');
  endDrag();
  sfxUnlock();
  startBgm('main');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Chạm vào màn hình để thả khối xuống!';
  STCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🏗️ MAP ẨN 9';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='🏗️ 0/'+STACK_KPI+' tầng';
  stackMode=true;
  initStack();
  stackLast=performance.now();
  stackRAF=requestAnimationFrame(stackLoop);
}

function initStack(){
  const cv=STCV(), W=360, H=460;
  stackScore=0; stackCount=0; stackElapsed=0; stackFx=[]; stackCameraY=0; stackPerfectStreak=0;
  stackDir=1; stackSpeed=80;
  // base block at bottom
  stackBlocks=[{x:(W-BLOCK_BASE_W)/2, y:H-BLOCK_H, w:BLOCK_BASE_W, color:'#888'}];
  stackMoving={x:0, w:BLOCK_BASE_W, color:STACK_COLORS[0]};
}

function stackLoop(now){
  if(!stackMode){ stackRAF=null; return; }
  const dt=Math.min(0.08,Math.max(0,(now-(stackLast||now))/1000));
  stackLast=now;
  stackElapsed+=dt;

  const cv=STCV(), W=360;
  // move the platform
  stackMoving.x+=stackDir*stackSpeed*dt;
  if(stackMoving.x+stackMoving.w>W){ stackMoving.x=W-stackMoving.w; stackDir=-1; }
  if(stackMoving.x<0){ stackMoving.x=0; stackDir=1; }

  // update fx
  stackFx.forEach(f=>{ f.t+=dt; f.y+=f.vy*dt; f.vy+=200*dt; });
  stackFx=stackFx.filter(f=>f.t<1.2);

  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  drawStack(ctx,W,460);

  const timeLeft=Math.max(0,STACK_TIME-stackElapsed);
  document.getElementById('burst-count').textContent='🏗️ '+stackCount+'/'+STACK_KPI+'  ⏱'+timeLeft.toFixed(0)+'s';

  if(timeLeft<=0 || stackCount>=STACK_KPI){
    stackDone(stackCount>=STACK_KPI); return;
  }
  stackRAF=requestAnimationFrame(stackLoop);
}

function dropStack(){
  if(!stackMode||stackMoving.w<=0) return;
  const cv=STCV(), W=360, H=460;
  // top block
  const top=stackBlocks[stackBlocks.length-1];
  const overlapL=Math.max(stackMoving.x, top.x);
  const overlapR=Math.min(stackMoving.x+stackMoving.w, top.x+top.w);
  const overlapW=overlapR-overlapL;
  if(overlapW<=0){
    // missed completely
    stackDone(false); return;
  }
  const newY=top.y-BLOCK_H;
  // camera scroll
  if(newY-stackCameraY<H*0.4) stackCameraY=newY-H*0.4;

  // check perfect alignment
  const center1=stackMoving.x+stackMoving.w/2;
  const center2=top.x+top.w/2;
  const isPerfect=Math.abs(center1-center2)<5;

  const newBlock={x:overlapL, y:newY, w:overlapW, color:STACK_COLORS[stackCount%STACK_COLORS.length]};
  stackBlocks.push(newBlock);
  stackCount++;
  stackSpeed=80+stackCount*5; // increase speed

  // 1 điểm/tầng xếp được; xếp "perfect" liên tiếp 3 lần → x2, 6 lần → x3
  let pts=1;
  if(isPerfect){
    stackPerfectStreak++;
    pts+=1*comboScoreMultiplier(stackPerfectStreak);
    stackFx.push({x:overlapL+overlapW/2,y:newY,t:0,type:'perfect',vy:-80});
    showComboFlash(0,false,'✨ PERFECT!');
    if(!sfxMuted) sfxStackPerfect();
  } else {
    stackPerfectStreak=0;
    if(!sfxMuted) sfxStackDrop();
  }
  stackScore+=pts;
  score+=pts;
  if(best<score){ best=score; }
  updateScoreUI();
  sfxWaveWin();

  // cut piece falls off
  const hasCut=(stackMoving.x<top.x)||(stackMoving.x+stackMoving.w>top.x+top.w);
  if(hasCut && !isPerfect && !sfxMuted) sfxStackCut();
  if(stackMoving.x<top.x){
    stackFx.push({x:stackMoving.x, y:newY, w:top.x-stackMoving.x, color:newBlock.color, t:0, type:'cut', vy:-20});
  }
  if(stackMoving.x+stackMoving.w>top.x+top.w){
    const cx=top.x+top.w;
    stackFx.push({x:cx, y:newY, w:(stackMoving.x+stackMoving.w)-cx, color:newBlock.color, t:0, type:'cut', vy:-20});
  }

  // next moving block same width as new block
  stackMoving={x:0, w:overlapW, color:STACK_COLORS[stackCount%STACK_COLORS.length]};
}

function drawStack(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  // Sky + sân vườn Map 4, giữ dãy nhà pastel phía sau
  cuteDayBg(ctx,W,H,stackElapsed);
  scenicHills(ctx,W,H,H*0.72);
  scenicGrass(ctx,W,H,H*0.72);
  scenicFence(ctx,W,H,H*0.98);
  // dãy nhà pastel dễ thương với cửa sổ vàng
  [['#b8a8e0',10,380,40,80],['#a8c8e8',60,360,30,100],['#e8b8c8',100,370,50,90],['#a8d8c0',160,350,35,110],['#e8d0a8',210,380,40,80],['#b8c8e8',260,355,45,105],['#d8b8e0',310,370,30,90]].forEach(([col,bx,by,bw,bh])=>{
    ctx.fillStyle=col; ctx.globalAlpha=0.55;
    ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle='#ffe9a8';
    for(let wy=by+8;wy<by+bh-6;wy+=16) for(let wx=bx+6;wx<bx+bw-5;wx+=14) ctx.fillRect(wx,wy,5,7);
    ctx.globalAlpha=1;
  });
  cuteGardenStrip(ctx,W,H,stackElapsed,H-8,true);

  const camOff=stackCameraY;

  // draw stacked blocks — kẹo bông mềm
  stackBlocks.forEach(b=>{
    const by=b.y-camOff;
    drawSoftCandyCell(ctx,b.x,by,b.w,BLOCK_H,b.color,{r:8,glowBlur:4});
  });

  // draw moving block with glow
  const mb=stackMoving;
  const mby=stackBlocks[stackBlocks.length-1].y-BLOCK_H*1.5-camOff;
  drawSoftCandyCell(ctx,mb.x,mby,mb.w,BLOCK_H,mb.color,{r:8,glow:true,glowBlur:12});

  // fx
  stackFx.forEach(f=>{
    if(f.type==='cut'){
      ctx.globalAlpha=Math.max(0,1-f.t);
      ctx.fillStyle=f.color;
      ctx.fillRect(f.x,f.y-camOff,f.w,BLOCK_H);
      ctx.globalAlpha=1;
    } else if(f.type==='perfect'){
      ctx.globalAlpha=Math.max(0,1-f.t*1.5);
      ctx.fillStyle='#ffe060';
      ctx.font='bold 20px system-ui';
      ctx.textAlign='center';
      ctx.fillText('✨',f.x,f.y-camOff);
      ctx.globalAlpha=1;
    }
  });

  const sTimeLeft=Math.max(0,STACK_TIME-stackElapsed);
  drawHudTop(ctx,W,{left:'🏗️ '+stackCount+'/'+STACK_KPI+' tầng', right:'⏱ '+sTimeLeft.toFixed(0)+'s'});
}

function stackDone(won){
  if(stackRAF){ cancelAnimationFrame(stackRAF); stackRAF=null; }
  stackMode=false;
  if(won){
    sfxWaveWin();
    showComboFlash(0,false,'🏆 '+stackCount+' tầng! Tháp hoàn thành!');
  } else {
    forfeitHiddenMapScore();
  }
  setTimeout(exitStackToMain, 600);
  if(won) setTimeout(()=>startUnlockGate(8), 500);
}

function exitStackToMain(){
  setActiveHiddenMap(null);
  stackMode=false;
  startBgm('main');
  if(stackRAF){ cancelAnimationFrame(stackRAF); stackRAF=null; }
  STCV().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  consecutiveBursts=0; updateBurstCount();
  document.getElementById('hint-bar').textContent='Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay';
  renderPieces(); checkGameOverA();
}

STCV().addEventListener('pointerdown', e=>{
  if(!stackMode) return;
  e.preventDefault();
  dropStack();
});
