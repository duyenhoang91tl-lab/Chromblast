// ═══════════════════════════════════════════════════════════════
// maps/map09.js — MAP ẨN 9: Xếp tháp (Stack Tower)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const STACK_TIME=90, STACK_KPI=15;
const STACK_COLORS=['#e84040','#e88040','#e8c040','#40c040','#4080e8','#9040c8','#e84080','#40c8c8'];
const BLOCK_H=28, BLOCK_BASE_W=180;
/** Độ khó lắc tháp bắt đầu từ viên gạch thứ 20 (đếm từ đáy, gồm nền) */
const STACK_SWAY_START_LEN=20;
const STACK_SWAY_BASE_AMP=14;
const STACK_SWAY_AMP_PER_TIER=1.35;
const STACK_SWAY_SPEED_BASE=1.35;

let stackMode=false, stackRAF=null, stackLast=0, stackElapsed=0;
let stackBlocks=[], stackMoving={x:0,w:0,color:'#e84040'};
let stackDir=1, stackSpeed=80, stackScore=0, stackCount=0, stackPerfectStreak=0;
let stackCameraY=0, stackFx=[], stackSwayPhase=0;

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
    'Từ <b>gạch thứ 20</b> gió thổi — tháp lắc lư, càng cao càng khó canh!<br>'+
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
  stackSwayPhase=0;
  stackDir=1; stackSpeed=80;
  // base block at bottom
  stackBlocks=[{x:(W-BLOCK_BASE_W)/2, y:H-BLOCK_H, w:BLOCK_BASE_W, color:'#888'}];
  stackMoving={x:0, w:BLOCK_BASE_W, color:STACK_COLORS[0]};
}

/** Lắc tháp theo gió — bắt đầu khi xếp gạch thứ 20, càng cao càng mạnh */
function getStackSway(dt){
  const n=stackBlocks.length;
  const swayMinLen=STACK_SWAY_START_LEN-1; // 19 tầng → đang xếp gạch thứ 20
  if(n<swayMinLen) return {x:0, amp:0, active:false};
  if(dt>0){
    const tiersAbove=Math.max(1, n-swayMinLen+1);
    const speed=STACK_SWAY_SPEED_BASE+tiersAbove*0.07;
    stackSwayPhase+=dt*speed;
  }
  const tiersAbove=Math.max(1, n-swayMinLen+1);
  const amp=STACK_SWAY_BASE_AMP+tiersAbove*STACK_SWAY_AMP_PER_TIER;
  const gust=0.82+0.18*Math.sin(stackSwayPhase*0.37+1.1);
  return {x:Math.sin(stackSwayPhase)*amp*gust, amp, active:true};
}

/** Độ lệch ngang của từng tầng (chân tháp cố định, đỉnh lắc mạnh nhất) */
function stackBlockSwayX(blockIdx, swayX){
  const n=stackBlocks.length;
  if(n<=1 || !swayX) return 0;
  return swayX*(blockIdx/(n-1));
}

function stackLoop(now){
  if(!stackMode){ stackRAF=null; return; }
  const dt=Math.min(0.08,Math.max(0,(now-(stackLast||now))/1000));
  stackLast=now;
  stackElapsed+=dt;

  const sway=getStackSway(dt);

  const cv=STCV(), W=360;
  // move the platform
  stackMoving.x+=stackDir*stackSpeed*dt;
  if(stackMoving.x+stackMoving.w>W){ stackMoving.x=W-stackMoving.w; stackDir=-1; }
  if(stackMoving.x<0){ stackMoving.x=0; stackDir=1; }

  // update fx
  stackFx.forEach(f=>{ f.t+=dt; f.y+=f.vy*dt; f.vy+=200*dt; });
  stackFx=stackFx.filter(f=>f.t<1.2);

  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  drawStack(ctx,W,460,sway);

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
  const sway=getStackSway(0);
  // top block (tính lệch gió khi canh khối)
  const top=stackBlocks[stackBlocks.length-1];
  const topIdx=stackBlocks.length-1;
  const topX=top.x+stackBlockSwayX(topIdx, sway.x);
  const overlapL=Math.max(stackMoving.x, topX);
  const overlapR=Math.min(stackMoving.x+stackMoving.w, topX+top.w);
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
  const center2=topX+top.w/2;
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
  const hasCut=(stackMoving.x<topX)||(stackMoving.x+stackMoving.w>topX+top.w);
  if(hasCut && !isPerfect && !sfxMuted) sfxStackCut();
  if(stackMoving.x<topX){
    stackFx.push({x:stackMoving.x, y:newY, w:topX-stackMoving.x, color:newBlock.color, t:0, type:'cut', vy:-20});
  }
  if(stackMoving.x+stackMoving.w>topX+top.w){
    const cx=topX+top.w;
    stackFx.push({x:cx, y:newY, w:(stackMoving.x+stackMoving.w)-cx, color:newBlock.color, t:0, type:'cut', vy:-20});
  }

  if(sway.active && stackCount===STACK_SWAY_START_LEN-2){
    try{ showComboFlash(0,false,'💨 Gió thổi! Canh theo nhịp lắc tháp'); }catch(e){}
  }

  // next moving block same width as new block
  stackMoving={x:0, w:overlapW, color:STACK_COLORS[stackCount%STACK_COLORS.length]};
}

function drawStack(ctx,W,H,sway){
  sway=sway||getStackSway(0);
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

  // gió nhẹ khi tháp cao — gợi ý độ khó
  if(sway.active){
    const windA=Math.min(0.22, sway.amp/120);
    ctx.save();
    ctx.globalAlpha=windA;
    ctx.strokeStyle='rgba(200,235,255,0.85)';
    ctx.lineWidth=1.5;
    for(let i=0;i<4;i++){
      const wy=H*0.12+i*H*0.08+Math.sin(stackSwayPhase*1.4+i)*6;
      const wx=W*0.08+((stackSwayPhase*40+i*70)% (W*0.84));
      ctx.beginPath();
      ctx.moveTo(wx,wy);
      ctx.quadraticCurveTo(wx+18+sway.amp*0.2, wy-4, wx+36+sway.amp*0.35, wy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // draw stacked blocks — kẹo bông mềm (lắc từ chân tháp, đỉnh lệch nhiều nhất)
  stackBlocks.forEach((b,i)=>{
    const by=b.y-camOff;
    const bx=b.x+stackBlockSwayX(i, sway.x);
    drawSoftCandyCell(ctx,bx,by,b.w,BLOCK_H,b.color,{r:8,glowBlur:4});
  });

  // draw moving block with glow
  const mb=stackMoving;
  const topIdx=stackBlocks.length-1;
  const mby=stackBlocks[topIdx].y-BLOCK_H*1.5-camOff;
  drawSoftCandyCell(ctx,mb.x,mby,mb.w,BLOCK_H,mb.color,{r:8,glow:true,glowBlur:12});

  // fx
  stackFx.forEach(f=>{
    if(f.type==='cut'){
      ctx.globalAlpha=Math.max(0,1-f.t);
      ctx.fillStyle=f.color;
      const cutSway=stackBlockSwayX(topIdx, sway.x);
      ctx.fillRect(f.x+cutSway,f.y-camOff,f.w,BLOCK_H);
      ctx.globalAlpha=1;
    } else if(f.type==='perfect'){
      ctx.globalAlpha=Math.max(0,1-f.t*1.5);
      ctx.fillStyle='#ffe060';
      ctx.font='bold 20px Nunito,system-ui';
      ctx.textAlign='center';
      ctx.fillText('✨',f.x,f.y-camOff);
      ctx.globalAlpha=1;
    }
  });

  const sTimeLeft=Math.max(0,STACK_TIME-stackElapsed);
  drawHudTop(ctx,W,{
    left:'🏗️ '+stackCount+'/'+STACK_KPI+' tầng',
    right:(sway.active?'💨 ':'⏱ ')+sTimeLeft.toFixed(0)+'s',
  });
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
