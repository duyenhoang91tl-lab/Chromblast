// ═══════════════════════════════════════════════════════════════
// maps/map08.js — MAP ẨN 8: Bắn bong bóng (Bubble Pop)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const BUBBLE_TIME=60, BUBBLE_KPI=50;
const BUBBLE_COLS=8, BUBBLE_ROWS=10;
const BUBBLE_COLORS=['#ff8a8a','#7ec8f5','#8fe0a8','#ffd97a','#c9a0f0','#ffb47a'];
const BUBBLE_R=18; // radius of each bubble
const BUBBLE_OX=(360-BUBBLE_COLS*BUBBLE_R*2)/2; // căn giữa lưới bong bóng theo chiều ngang

let bubbleMode=false, bubbleRAF=null, bubbleLast=0, bubbleElapsed=0;
let bubbleGrid=[], bubbleShooter={color:'#e84040',angle:-Math.PI/2};
let bubbleFlying=null, bubbleScore=0, bubbleFx=[], bubbleStreak=0;
let bubbleFallTimer=0;

const BBCV=()=>document.getElementById('bubble-canvas');

function triggerBubbleUnlock(){
  markMapCleared('memory');
  pendingUnlock='bubble';
  document.getElementById('unlock-title').textContent='🫧 MAP ẨN 8 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    '🫧 <b>Bắn Bong Bóng!</b><br><br>'+
    'Lưới bong bóng màu sắc trên nền sáng nhẹ nhàng.<br>'+
    'Chạm → bắn bong bóng về hướng đó! 3+ bong bóng cùng màu → Nổ!<br>'+
    'Gom <b>'+BUBBLE_KPI+' điểm</b> trong <b>'+BUBBLE_TIME+'s</b> hoặc dọn sạch bảng để thắng!<br>'+
    'Cứ 8 giây bong bóng lại rơi xuống 1 hàng — cẩn thận!';
  document.getElementById('unlock-btn').textContent='🫧 BẮN THÔI!';
  showUnlockOverlay();
}

function enterBubbleMode(){
  setActiveHiddenMap('bubble');
  endDrag();
  sfxUnlock();
  startBgm('main');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Chạm vào màn hình để nhắm và bắn bong bóng!';
  BBCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🫧 MAP ẨN 8';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='🫧 0đ / '+BUBBLE_KPI+'đ';
  bubbleMode=true;
  initBubble();
  bubbleLast=performance.now();
  bubbleRAF=requestAnimationFrame(bubbleLoop);
}

function initBubble(){
  bubbleScore=0; bubbleElapsed=0; bubbleFlying=null; bubbleFx=[]; bubbleStreak=0;
  bubbleFallTimer=0;
  // fill top 5 rows with bubbles
  bubbleGrid=[];
  for(let r=0;r<BUBBLE_ROWS;r++){
    const row=[];
    for(let c=0;c<BUBBLE_COLS;c++){
      if(r<5) row.push(BUBBLE_COLORS[Math.floor(Math.random()*BUBBLE_COLORS.length)]);
      else row.push(null);
    }
    bubbleGrid.push(row);
  }
  bubbleShooter={color:BUBBLE_COLORS[Math.floor(Math.random()*BUBBLE_COLORS.length)], angle:-Math.PI/2};
}

function bubbleLoop(now){
  if(!bubbleMode){ bubbleRAF=null; return; }
  const dt=Math.min(0.08,Math.max(0,(now-(bubbleLast||now))/1000));
  bubbleLast=now;
  bubbleElapsed+=dt;
  bubbleFallTimer+=dt;

  // move flying bubble
  if(bubbleFlying){
    bubbleFlying.x+=bubbleFlying.vx*dt;
    bubbleFlying.y+=bubbleFlying.vy*dt;
    const cv=BBCV(), W=360;
    // bounce off walls
    if(bubbleFlying.x-BUBBLE_R<0){ bubbleFlying.x=BUBBLE_R; bubbleFlying.vx*=-1; if(!sfxMuted) sfxBubbleBounce(); }
    if(bubbleFlying.x+BUBBLE_R>W){ bubbleFlying.x=W-BUBBLE_R; bubbleFlying.vx*=-1; if(!sfxMuted) sfxBubbleBounce(); }
    // check grid collision
    const landRow=bubbleLandRow(bubbleFlying.x, bubbleFlying.y);
    if(landRow!==null){
      const col=Math.round((bubbleFlying.x - BUBBLE_OX - BUBBLE_R) / (BUBBLE_R*2));
      const safeCol=Math.max(0,Math.min(BUBBLE_COLS-1,col));
      if(landRow>=0 && landRow<BUBBLE_ROWS && bubbleGrid[landRow][safeCol]===null){
        bubbleGrid[landRow][safeCol]=bubbleFlying.color;
        checkBubblePop(landRow,safeCol);
      }
      bubbleFlying=null;
      bubbleShooter.color=BUBBLE_COLORS[Math.floor(Math.random()*BUBBLE_COLORS.length)];
    }
    // reached top
    if(bubbleFlying && bubbleFlying.y-BUBBLE_R<0){
      const col=Math.round((bubbleFlying.x - BUBBLE_OX - BUBBLE_R) / (BUBBLE_R*2));
      const safeCol=Math.max(0,Math.min(BUBBLE_COLS-1,col));
      if(bubbleGrid[0][safeCol]===null) bubbleGrid[0][safeCol]=bubbleFlying.color;
      bubbleFlying=null;
      bubbleShooter.color=BUBBLE_COLORS[Math.floor(Math.random()*BUBBLE_COLORS.length)];
    }
  }

  // pressure: fall every 8 seconds
  if(bubbleFallTimer>=8){
    bubbleFallTimer=0;
    bubbleGrid.pop(); // remove bottom row
    bubbleGrid.unshift(Array(BUBBLE_COLS).fill(null).map(()=>BUBBLE_COLORS[Math.floor(Math.random()*BUBBLE_COLORS.length)]));
    if(!sfxMuted) sfxBubblePressure();
  }

  // update fx
  bubbleFx.forEach(f=>f.t+=dt);
  bubbleFx=bubbleFx.filter(f=>f.t<0.6);

  const cv=BBCV(), W=360, H=460;
  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  drawBubble(ctx,W,H);

  const timeLeft=Math.max(0,BUBBLE_TIME-bubbleElapsed);
  document.getElementById('burst-count').textContent='🫧 '+bubbleScore+'đ / '+BUBBLE_KPI+'đ  ⏱'+timeLeft.toFixed(0)+'s';

  // check win/lose
  const allClear=bubbleGrid.every(r=>r.every(c=>c===null));
  const bottomFull=bubbleGrid[BUBBLE_ROWS-1].some(c=>c!==null);
  if(timeLeft<=0 || bottomFull || (allClear && bubbleScore>0) || bubbleScore>=BUBBLE_KPI){
    bubbleDone(bubbleScore>=BUBBLE_KPI||allClear); return;
  }
  bubbleRAF=requestAnimationFrame(bubbleLoop);
}

function bubbleLandRow(fx,fy){
  const cv=BBCV(), H=460;
  const cellH=(H-80)/BUBBLE_ROWS;
  const col=Math.round((fx - BUBBLE_OX - BUBBLE_R) / (BUBBLE_R*2));
  const safeCol=Math.max(0,Math.min(BUBBLE_COLS-1,col));
  let row=Math.floor((fy-40)/cellH);
  if(row<0) row=0;
  if(row>=BUBBLE_ROWS) return null; // still in flight, hasn't reached grid yet
  // Đụng trực diện 1 ô đã có bóng → dán ngay phía dưới ô đó (tìm hàng trống gần nhất nếu cần)
  if(bubbleGrid[row][safeCol]!==null){
    let target=row+1;
    while(target<BUBBLE_ROWS && bubbleGrid[target][safeCol]!==null) target++;
    return target<BUBBLE_ROWS ? target : null;
  }
  // Hàng ngay phía dưới đã có bóng → dừng lại, dán lên trên nó
  if(row+1<BUBBLE_ROWS && bubbleGrid[row+1][safeCol]!==null) return row;
  // Chạm tường trên cùng mà cột này còn trống hoàn toàn → dán vào hàng 0
  if(fy-BUBBLE_R<=40) return 0;
  return null; // chưa có gì để dán, tiếp tục bay
}

function checkBubblePop(row,col){
  const color=bubbleGrid[row][col];
  if(!color) return;
  // BFS flood fill same-color neighbors
  const visited=new Set();
  const queue=[[row,col]];
  visited.add(row+','+col);
  while(queue.length){
    const [r,c]=queue.shift();
    const neighbors=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    for(const [nr,nc] of neighbors){
      if(nr>=0&&nr<BUBBLE_ROWS&&nc>=0&&nc<BUBBLE_COLS&&!visited.has(nr+','+nc)&&bubbleGrid[nr][nc]===color){
        visited.add(nr+','+nc);
        queue.push([nr,nc]);
      }
    }
  }
  if(visited.size>=3){
    const cv=BBCV(), W=360, H=460;
    const cellH=(H-80)/BUBBLE_ROWS;
    visited.forEach(key=>{
      const [r,c]=key.split(',').map(Number);
      const fx=BUBBLE_OX+BUBBLE_R+c*BUBBLE_R*2;
      const fy=40+r*cellH+BUBBLE_R;
      bubbleFx.push({x:fx,y:fy,color,t:0,type:'pop'});
      bubbleGrid[r][c]=null;
    });
    bubbleStreak++;
    // 1 điểm/bóng nổ, liên tiếp 3 lần bắn trúng → x2, 6 lần → x3
    const pts=visited.size*comboScoreMultiplier(bubbleStreak);
    bubbleScore+=pts;
    score+=pts;
    if(best<score){best=score;}
    updateScoreUI();
    if(!sfxMuted) sfxBubblePop();
    sfxWaveWin();
    // Drop disconnected (orphaned) bubbles not connected to top row
    dropOrphanedBubbles();
  } else {
    bubbleStreak=0;
  }
}

function dropOrphanedBubbles(){
  // BFS from all filled cells in top row to find all connected bubbles
  const connected=new Set();
  const queue=[];
  for(let c=0;c<BUBBLE_COLS;c++){
    if(bubbleGrid[0][c]!==null){
      const key='0,'+c;
      connected.add(key);
      queue.push([0,c]);
    }
  }
  while(queue.length){
    const [r,c]=queue.shift();
    const neighbors=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    for(const [nr,nc] of neighbors){
      if(nr>=0&&nr<BUBBLE_ROWS&&nc>=0&&nc<BUBBLE_COLS){
        const key=nr+','+nc;
        if(!connected.has(key)&&bubbleGrid[nr][nc]!==null){
          connected.add(key);
          queue.push([nr,nc]);
        }
      }
    }
  }
  // Remove orphaned bubbles and add score
  const cv=BBCV(), H=460;
  const cellH=(H-80)/BUBBLE_ROWS;
  let orphanCount=0;
  for(let r=0;r<BUBBLE_ROWS;r++){
    for(let c=0;c<BUBBLE_COLS;c++){
      if(bubbleGrid[r][c]!==null&&!connected.has(r+','+c)){
        const fx=BUBBLE_OX+BUBBLE_R+c*BUBBLE_R*2;
        const fy=40+r*cellH+BUBBLE_R;
        bubbleFx.push({x:fx,y:fy,color:bubbleGrid[r][c],t:0,type:'pop'});
        bubbleGrid[r][c]=null;
        orphanCount++;
      }
    }
  }
  if(orphanCount>0){
    const pts=orphanCount*1;
    bubbleScore+=pts; score+=pts;
    if(best<score){best=score;}
    updateScoreUI();
  }
}

function drawBubble(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  // Nền sáng nhẹ nhàng — bầu trời pastel
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#eaf7ff'); bg.addColorStop(0.55,'#dff1fb'); bg.addColorStop(1,'#cfe9f7');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  // nắng + mây bồng bềnh nhẹ nhàng (phong cách Map ẩn 4)
  beeDrawSun(ctx,bubbleElapsed);
  ctx.fillStyle='rgba(255,255,255,0.55)';
  const clouds=[[40,50,1.0],[300,80,0.7],[110,130,0.55],[250,180,0.8]];
  clouds.forEach(([cx,cy,s])=>{
    [[0,0,14],[-11,3,9],[11,3,9],[0,-5,9]].forEach(([dx,dy,r])=>{
      ctx.beginPath(); ctx.arc(cx+dx*s,cy+dy*s,r*s,0,Math.PI*2); ctx.fill();
    });
  });
  // lấp lánh nhẹ rải rác
  ctx.fillStyle='rgba(255,255,255,0.8)';
  for(let i=0;i<24;i++){
    const sx=((i*137+17)%W), sy=((i*79+31)%H);
    ctx.beginPath(); ctx.arc(sx,sy,1,0,Math.PI*2); ctx.fill();
  }

  const cellH=(H-80)/BUBBLE_ROWS;
  // draw grid bubbles
  for(let r=0;r<BUBBLE_ROWS;r++){
    for(let c=0;c<BUBBLE_COLS;c++){
      const col=bubbleGrid[r][c];
      if(!col) continue;
      const bx=BUBBLE_OX+BUBBLE_R+c*BUBBLE_R*2;
      const by=40+r*cellH+BUBBLE_R;
      drawBubbleCircle(ctx,bx,by,BUBBLE_R-1,col);
    }
  }

  // flying bubble
  if(bubbleFlying){
    drawBubbleCircle(ctx,bubbleFlying.x,bubbleFlying.y,BUBBLE_R,bubbleFlying.color);
    // trail
    ctx.fillStyle='rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(bubbleFlying.x-bubbleFlying.vx*0.03, bubbleFlying.y-bubbleFlying.vy*0.03, BUBBLE_R*0.6,0,Math.PI*2); ctx.fill();
  }

  // shooter / cannon at bottom
  const shooterX=W/2, shooterY=H-30;
  // aim line
  ctx.setLineDash([4,6]);
  ctx.strokeStyle='rgba(60,80,110,0.35)';
  ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.moveTo(shooterX, shooterY);
  ctx.lineTo(shooterX+Math.cos(bubbleShooter.angle)*60, shooterY+Math.sin(bubbleShooter.angle)*60);
  ctx.stroke();
  ctx.setLineDash([]);
  // cannon body
  ctx.fillStyle='#555';
  ctx.beginPath();
  ctx.arc(shooterX,shooterY,20,0,Math.PI*2);
  ctx.fill();
  // next bubble in cannon
  drawBubbleCircle(ctx,shooterX,shooterY,14,bubbleShooter.color);

  // fx
  bubbleFx.forEach(f=>{
    const prog=f.t/0.6;
    if(f.type==='pop'){
      ctx.strokeStyle=f.color;
      ctx.lineWidth=2*(1-prog);
      ctx.globalAlpha=1-prog;
      ctx.beginPath(); ctx.arc(f.x,f.y,BUBBLE_R*(1+prog*2),0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1;
    }
  });

  const bTimeLeft=Math.max(0,BUBBLE_TIME-bubbleElapsed);
  drawHudTop(ctx,W,{left:'🫧 '+bubbleScore+'/'+BUBBLE_KPI, right:'⏱ '+bTimeLeft.toFixed(0)+'s'});
}

function drawBubbleCircle(ctx,x,y,r,color){
  ctx.save();
  // (bỏ shadowBlur — vẽ ~40 bóng/frame có shadow là điểm nghẽn hiệu năng lớn nhất của map này)
  const grad=ctx.createRadialGradient(x-r*0.35,y-r*0.4,r*0.05,x,y,r*1.05);
  grad.addColorStop(0,'rgba(255,255,255,0.95)');
  grad.addColorStop(0.32,color);
  grad.addColorStop(0.85,color);
  grad.addColorStop(1,'rgba(0,0,0,0.15)');
  ctx.fillStyle=grad;
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.restore();
  // viền sáng mềm
  ctx.strokeStyle='rgba(255,255,255,0.7)';
  ctx.lineWidth=1.3;
  ctx.stroke();
  // chấm phản chiếu nhỏ tạo cảm giác bóng tròn 3D
  ctx.fillStyle='rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(x-r*0.35,y-r*0.4,r*0.22,r*0.14,-0.5,0,Math.PI*2); ctx.fill();
}

function bubbleDone(won){
  if(bubbleRAF){ cancelAnimationFrame(bubbleRAF); bubbleRAF=null; }
  bubbleMode=false;
  if(won){
    sfxWaveWin();
    showComboFlash(0,false,'🏆 '+bubbleScore+'đ! Bóng nổ tung!');
  } else {
    forfeitHiddenMapScore();
  }
  setTimeout(exitBubbleToMain, 600);
  if(won) setTimeout(()=>startUnlockGate(7), 500);
}

function exitBubbleToMain(){
  setActiveHiddenMap(null);
  bubbleMode=false;
  startBgm('main');
  if(bubbleRAF){ cancelAnimationFrame(bubbleRAF); bubbleRAF=null; }
  BBCV().classList.remove('active');
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

BBCV().addEventListener('pointerdown', e=>{
  if(!bubbleMode) return;
  e.preventDefault();
  const rect=BBCV().getBoundingClientRect();
  const scaleX=360/rect.width, scaleY=460/rect.height;
  const tx=(e.clientX-rect.left)*scaleX;
  const ty=(e.clientY-rect.top)*scaleY;
  const cv=BBCV(), W=360, H=460;
  const shooterX=W/2, shooterY=H-30;
  const dx=tx-shooterX, dy=ty-shooterY;
  if(dx===0&&dy===0) return;
  bubbleShooter.angle=Math.atan2(dy,dx);
  // clamp to upper hemisphere
  if(bubbleShooter.angle>-0.2) bubbleShooter.angle=-0.2;
  if(bubbleShooter.angle<-Math.PI+0.2) bubbleShooter.angle=-Math.PI+0.2;
  if(!bubbleFlying){
    const spd=320;
    bubbleFlying={
      x:shooterX, y:shooterY,
      vx:Math.cos(bubbleShooter.angle)*spd,
      vy:Math.sin(bubbleShooter.angle)*spd,
      color:bubbleShooter.color
    };
    if(!sfxMuted) sfxBubbleShoot();
  }
});
