// ═══════════════════════════════════════════════════════════════
// maps/map14.js — MAP ẨN 14: Rắn săn mồi (Snake)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const SNAKE_COLS=18, SNAKE_ROWS=22, SNAKE_CELL=18;
const SNAKE_OX=Math.round((360-SNAKE_COLS*SNAKE_CELL)/2), SNAKE_OY=40; // canh giữa lưới, tránh tràn viền canvas
const SCV=()=>document.getElementById('snake-canvas');

// (đã chuyển khai báo biến mode lên đầu file để tránh lỗi TDZ)
let snakeCells=[], snakeDir={x:1,y:0}, snakeNextDir={x:1,y:0};
let snakeFood={x:5,y:5,emoji:'🍎',special:false};
let snakeLives=3, snakeScore=0, snakeFx=[];
let snakeMoveTimer=0, snakeSpeed=4;
let snakeFoodCount=0;
let snakePointerStart=null;

function triggerSnakeUnlock(){
  markMapCleared('arena');
  pendingUnlock='snake';
  document.getElementById('unlock-title').textContent='🐍 MAP ẨN 14 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML='Rắn cổ điển! Ăn trái cây để lớn dần.<br>Vuốt/chạm để đổi hướng. Tránh tường & đuôi!<br>KPI: đạt độ dài <b>20</b>. 3 mạng ❤️❤️❤️';
  document.getElementById('unlock-btn').textContent='🐍 CHƠI THÔI!';
  showUnlockOverlay();
  sfxUnlock();
}

function placeSnakeFood(){
  const occupied=new Set(snakeCells.map(c=>c.x+','+c.y));
  let x,y,attempts=0;
  do { x=Math.floor(Math.random()*SNAKE_COLS); y=Math.floor(Math.random()*SNAKE_ROWS); attempts++; }
  while(occupied.has(x+','+y) && attempts<200);
  const isSpecial=(snakeFoodCount>0 && snakeFoodCount%5===0);
  const emojis=['🍎','🍊','🍋','🍇','🍓'];
  snakeFood={x,y,emoji:isSpecial?'🌟':emojis[Math.floor(Math.random()*emojis.length)],special:isSpecial};
}

function enterSnakeMode(){
  setActiveHiddenMap('snake');
  endDrag();
  sfxUnlock();
  startBgm('action');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  SCV().classList.add('active');
  document.getElementById('mode-badge').textContent='🐍 MAP ẨN 14';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='🐍 Dài: 3/20';
  document.getElementById('hint-bar').textContent='Vuốt để đổi hướng · Chạm góc để rẽ';
  document.getElementById('grid-wrap').classList.add('secret-mode');
  snakeCells=[{x:9,y:11},{x:8,y:11},{x:7,y:11}];
  snakeDir={x:1,y:0}; snakeNextDir={x:1,y:0};
  snakeLives=3; snakeScore=0; snakeFx=[]; snakeFoodCount=0;
  snakeMoveTimer=0; snakeSpeed=6.5;
  placeSnakeFood();
  snakeMode=true;
  snakeLast=performance.now();
  snakeRAF=requestAnimationFrame(snakeLoop);
}

function setSnakeDir(x,y){ snakeNextDir={x,y}; sfxSnakeTurn(); }

function snakeLoop(now){
  if(!snakeMode){ snakeRAF=null; return; }
  const dt=Math.min(0.08,Math.max(0,(now-(snakeLast||now))/1000));
  snakeLast=now;
  // Vẽ ở độ phân giải gấp đôi (720×920) rồi scale — nét căng trên màn hình điện thoại,
  // toạ độ game vẫn giữ nguyên hệ logic 360×460
  const cv=SCV(), W=360, H=460;
  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  ctx.setTransform(2,0,0,2,0,0);

  snakeMoveTimer+=dt;
  if(snakeMoveTimer>=1/snakeSpeed){
    snakeMoveTimer=0;
    // apply direction (no reversing)
    if(!(snakeNextDir.x===-snakeDir.x && snakeNextDir.y===-snakeDir.y)){
      snakeDir={x:snakeNextDir.x, y:snakeNextDir.y};
    }
    const head=snakeCells[0];
    const nx=head.x+snakeDir.x, ny=head.y+snakeDir.y;
    // wall collision
    if(nx<0||nx>=SNAKE_COLS||ny<0||ny>=SNAKE_ROWS){ snakeDie(); return; }
    // self collision
    if(snakeCells.some(c=>c.x===nx&&c.y===ny)){ snakeDie(); return; }
    snakeCells.unshift({x:nx,y:ny});
    // check food
    if(nx===snakeFood.x&&ny===snakeFood.y){
      snakeFoodCount++;
      const pts=snakeFood.special?3:1;
      snakeScore+=pts;
      score+=pts; if(best<score) best=score;
      snakeFx.push({x:SNAKE_OX+nx*SNAKE_CELL+SNAKE_CELL/2, y:SNAKE_OY+ny*SNAKE_CELL, t:0, text:'+'+pts, special:snakeFood.special});
      if(snakeFood.special) sfxSnakeSpecial(); else sfxSnakeEat();
      snakeSpeed=Math.max(2.2, 7-snakeCells.length*0.18); // dài ra thì bò chậm dần lại theo độ dài
      document.getElementById('burst-count').textContent='🐍 Dài: '+snakeCells.length+'/20';
      updateScoreUI();
      if(snakeCells.length>=20){ snakeDone(true); return; }
      placeSnakeFood();
    } else {
      snakeCells.pop();
    }
  }

  // update fx
  snakeFx=snakeFx.filter(f=>{ f.t+=dt; return f.t<1; });

  drawSnake(ctx, W, H, now);
  snakeRAF=requestAnimationFrame(snakeLoop);
}

const SNAKE_FLOWER_BORDER=[
  // cột hoa bên trái (x=7, ngoài lưới bắt đầu từ x=18)
  [7,55,'#ff88cc'],[7,110,'#ffee44'],[7,165,'#ff7799'],[7,220,'#ffffff'],
  [7,275,'#ffaa44'],[7,330,'#cc88ff'],[7,385,'#88ffcc'],
  // cột hoa bên phải (x=353, ngoài lưới kết thúc ở x=342)
  [353,55,'#cc88ff'],[353,110,'#88ffcc'],[353,165,'#ffcc44'],[353,220,'#ff88cc'],
  [353,275,'#ffee44'],[353,330,'#ff7799'],[353,385,'#ffffff'],
  // hàng hoa dưới cùng (y=445, dưới khung lưới kết thúc ở y=440)
  [45,445,'#ffaa44'],[100,445,'#cc88ff'],[160,445,'#ff88cc'],
  [200,445,'#ffee44'],[260,445,'#88ffcc'],[315,445,'#ff7799'],
];
function drawSnakeFlower(ctx,fx,fy,fc,sway){
  ctx.save();
  ctx.translate(fx,fy+sway);
  for(let k=0;k<5;k++){
    const fa=k/5*Math.PI*2;
    ctx.fillStyle=fc;
    ctx.beginPath(); ctx.ellipse(Math.cos(fa)*4.5,Math.sin(fa)*4.5,3.6,2.2,fa,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle='#ffee88';
  ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
  // lá nhỏ
  ctx.fillStyle='rgba(80,170,60,0.8)';
  ctx.beginPath(); ctx.ellipse(-1,7,2.6,4.5,0.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawSnakeSky(ctx,W,H,t){
  const sky=ctx.createLinearGradient(0,0,0,H*0.4);
  sky.addColorStop(0,'#8fd8f0'); sky.addColorStop(0.6,'#bfe8ee'); sky.addColorStop(1,'#dff6e0');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H*0.4);

  // mặt trời góc trên
  const sx=W-42, sy=48;
  const glow=ctx.createRadialGradient(sx,sy,6,sx,sy,55);
  glow.addColorStop(0,'rgba(255,240,150,0.55)'); glow.addColorStop(1,'rgba(255,220,80,0)');
  ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(sx,sy,55,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx,sy,15,0,Math.PI*2); ctx.fillStyle='#FFE566'; ctx.fill();
  ctx.beginPath(); ctx.arc(sx,sy,11,0,Math.PI*2); ctx.fillStyle='#FFF3B0'; ctx.fill();

  // mây trôi nhẹ
  const clouds=[[60,40,0.7],[150,65,0.5],[250,35,0.55]];
  clouds.forEach(([cx0,cy0,s],ci)=>{
    const cx=cx0+Math.sin(t*0.15+ci*2)*10;
    ctx.save(); ctx.translate(cx,cy0); ctx.scale(s,s);
    ctx.fillStyle='rgba(255,255,255,0.85)';
    [[0,0,14],[-12,3,10],[12,3,10],[0,-6,10]].forEach(([dx,dy,r])=>{
      ctx.beginPath(); ctx.arc(dx,dy,r,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  });

  // đồi xa mờ
  ctx.fillStyle='rgba(120,190,110,0.55)';
  ctx.beginPath();
  ctx.moveTo(0,H*0.32);
  ctx.quadraticCurveTo(W*0.2,H*0.22,W*0.42,H*0.3);
  ctx.quadraticCurveTo(W*0.65,H*0.2,W*0.85,H*0.28);
  ctx.quadraticCurveTo(W*0.95,H*0.24,W,H*0.27);
  ctx.lineTo(W,H*0.4); ctx.lineTo(0,H*0.4); ctx.closePath();
  ctx.fill();

  // bướm bay lượn ngoài khung
  for(let i=0;i<3;i++){
    const bx=30+i*140+Math.sin(t*0.6+i*2)*18;
    const by=(i%2===0?H*0.06:H*0.1)+Math.cos(t*0.8+i)*8;
    const wf=Math.sin(t*9+i)*0.6;
    ctx.save(); ctx.translate(bx,by); ctx.globalAlpha=0.8;
    const bc=['#ff9ac8','#ffd166','#8fd0ff'][i%3];
    ctx.save(); ctx.scale(Math.cos(wf),1);
    ctx.beginPath(); ctx.ellipse(-3,-1,4,3,-0.2,0,Math.PI*2); ctx.fillStyle=bc; ctx.fill(); ctx.restore();
    ctx.save(); ctx.scale(-Math.cos(wf),1);
    ctx.beginPath(); ctx.ellipse(-3,-1,4,3,-0.2,0,Math.PI*2); ctx.fillStyle=bc; ctx.fill(); ctx.restore();
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

function drawSnake(ctx, W, H, now){
  const OX=SNAKE_OX, OY=SNAKE_OY;
  const gridW=SNAKE_COLS*SNAKE_CELL, gridH=SNAKE_ROWS*SNAKE_CELL;
  const t=(now||0)*0.0012;

  // ── sân vườn Map 4 đầy đủ ──
  scenicDayFull(ctx,W,H,t,{hillY:H*0.22,fence:false,stripY:H-6,butterflies:true});

  // hoa trang trí quanh viền, đung đưa nhẹ
  SNAKE_FLOWER_BORDER.forEach(([fx,fy,fc],fi)=>{
    const sway=Math.sin(t*1.3+fi*1.4)*2;
    drawSnakeFlower(ctx,fx,fy,fc,sway);
  });

  // khung sân chơi kiểu luống đất trong vườn, bo góc mềm mại
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,0.2)'; ctx.shadowBlur=10; ctx.shadowOffsetY=3;
  ctx.fillStyle='#2f5d2a';
  ctx.beginPath(); ctx.roundRect(OX-4,OY-4,gridW+8,gridH+8,14); ctx.fill();
  ctx.restore();
  // cỏ trong khung — gradient mềm mại + đốm cỏ nhỏ thay vì caro phẳng
  const grassG=ctx.createLinearGradient(OX,OY,OX,OY+gridH);
  grassG.addColorStop(0,'#4CAF50'); grassG.addColorStop(0.5,'#3d8b3a'); grassG.addColorStop(1,'#2f6e2c');
  ctx.fillStyle=grassG; ctx.fillRect(OX,OY,gridW,gridH);
  // bàn cờ cỏ hai tông kiểu Snake cổ điển — dễ canh ô, nhìn có chiều sâu hơn
  ctx.fillStyle='rgba(255,255,255,0.07)';
  for(let r=0;r<SNAKE_ROWS;r++){
    for(let c=0;c<SNAKE_COLS;c++){
      if((r+c)%2===0) ctx.fillRect(OX+c*SNAKE_CELL, OY+r*SNAKE_CELL, SNAKE_CELL, SNAKE_CELL);
    }
  }
  // vài khóm cỏ nhỏ rải rác cho sinh động
  ctx.strokeStyle='rgba(255,255,255,0.14)'; ctx.lineWidth=1.2; ctx.lineCap='round';
  for(let k=0;k<14;k++){
    const gx=OX+((k*67)%(SNAKE_COLS*SNAKE_CELL-8))+4, gy=OY+((k*113)%(SNAKE_ROWS*SNAKE_CELL-10))+6;
    ctx.beginPath(); ctx.moveTo(gx,gy+4); ctx.quadraticCurveTo(gx-1,gy+1,gx-2,gy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx,gy+4); ctx.quadraticCurveTo(gx+1,gy+1,gx+2,gy-1); ctx.stroke();
  }
  // viền khung hoa văn (hàng rào vườn nhỏ)
  ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.roundRect(OX-4,OY-4,gridW+8,gridH+8,14); ctx.stroke();

  // Draw snake — thân ống mượt mà, nối liền từng đốt
  const headR=10, tailR=5;
  for(let i=snakeCells.length-2;i>=0;i--){
    const a=snakeCells[i], b=snakeCells[i+1];
    const ax=OX+a.x*SNAKE_CELL+SNAKE_CELL/2, ay=OY+a.y*SNAKE_CELL+SNAKE_CELL/2;
    const bx=OX+b.x*SNAKE_CELL+SNAKE_CELL/2, by=OY+b.y*SNAKE_CELL+SNAKE_CELL/2;
    const ratio=i/Math.max(1,snakeCells.length-1);
    const rr=headR-(headR-tailR)*ratio;
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.15)'; ctx.shadowBlur=3; ctx.shadowOffsetY=1;
    ctx.strokeStyle=`hsl(${140+ratio*28},68%,${74-ratio*22}%)`;
    ctx.lineWidth=rr*2; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
    ctx.restore();
    // đốm vảy nhỏ dễ thương giữa mỗi đốt
    if(i%2===0){
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc((ax+bx)/2,(ay+by)/2,rr*0.28,0,Math.PI*2); ctx.fill();
    }
  }
  // đầu rắn — tròn, nổi bật, có mặt dễ thương
  {
    const c=snakeCells[0];
    const x=OX+c.x*SNAKE_CELL, y=OY+c.y*SNAKE_CELL;
    const hg=ctx.createRadialGradient(x+SNAKE_CELL*0.35,y+SNAKE_CELL*0.3,1,x+SNAKE_CELL/2,y+SNAKE_CELL/2,headR);
    hg.addColorStop(0,'#c8ffd6'); hg.addColorStop(1,'#5fd88a');
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.2)'; ctx.shadowBlur=4; ctx.shadowOffsetY=1;
    ctx.fillStyle=hg;
    ctx.beginPath(); ctx.arc(x+SNAKE_CELL/2,y+SNAKE_CELL/2,headR,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // má hồng
    const cheekY=y+SNAKE_CELL/2+3;
    ctx.fillStyle='rgba(255,150,180,0.55)';
    ctx.beginPath(); ctx.ellipse(x+4,cheekY,2.6,1.8,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+SNAKE_CELL-4,cheekY,2.6,1.8,0,0,Math.PI*2); ctx.fill();
    // lưỡi thè ra thi thoảng, nhìn đáng yêu hơn là dữ tợn
    if(Math.sin(t*3)>0.55){
      ctx.strokeStyle='#ff5577'; ctx.lineWidth=1.6; ctx.lineCap='round';
      const tx=x+SNAKE_CELL/2+snakeDir.x*(SNAKE_CELL/2+5), ty=y+SNAKE_CELL/2+snakeDir.y*(SNAKE_CELL/2+5);
      const mx=x+SNAKE_CELL/2+snakeDir.x*(SNAKE_CELL/2+2), my=y+SNAKE_CELL/2+snakeDir.y*(SNAKE_CELL/2+2);
      ctx.beginPath(); ctx.moveTo(x+SNAKE_CELL/2,y+SNAKE_CELL/2); ctx.lineTo(mx,my); ctx.stroke();
      const fork=3;
      ctx.beginPath(); ctx.moveTo(mx,my); ctx.lineTo(tx+(snakeDir.y!==0?fork:0),ty+(snakeDir.x!==0?fork:0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx,my); ctx.lineTo(tx-(snakeDir.y!==0?fork:0),ty-(snakeDir.x!==0?fork:0)); ctx.stroke();
    }
    // mắt to tròn, lấp lánh
    const e1x=snakeDir.y!==0?x+4.5:x+SNAKE_CELL/2-3.5, e1y=snakeDir.x!==0?y+4.5:y+SNAKE_CELL/2-3.5;
    const e2x=snakeDir.y!==0?x+SNAKE_CELL-5.5:x+SNAKE_CELL/2+3.5, e2y=snakeDir.x!==0?y+SNAKE_CELL-5.5:y+SNAKE_CELL/2+3.5;
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(e1x,e1y,3.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2x,e2y,3.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#20301f';
    ctx.beginPath(); ctx.arc(e1x+snakeDir.x*0.8,e1y+snakeDir.y*0.8,1.7,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2x+snakeDir.x*0.8,e2y+snakeDir.y*0.8,1.7,0,Math.PI*2); ctx.fill();
    // tia sáng lấp lánh trong mắt
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(e1x-0.8,e1y-0.8,0.7,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2x-0.8,e2y-0.8,0.7,0,Math.PI*2); ctx.fill();
  }

  // Food — có quầng sáng và nhấp nhô nhẹ
  {
    const fx=OX+snakeFood.x*SNAKE_CELL+SNAKE_CELL/2, fy=OY+snakeFood.y*SNAKE_CELL+SNAKE_CELL/2+Math.sin(t*4)*2;
    const glowR=SNAKE_CELL*0.9;
    const fg=ctx.createRadialGradient(fx,fy,1,fx,fy,glowR);
    fg.addColorStop(0, snakeFood.special?'rgba(255,220,80,0.55)':'rgba(255,255,180,0.35)');
    fg.addColorStop(1,'rgba(255,255,180,0)');
    ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(fx,fy,glowR,0,Math.PI*2); ctx.fill();
    ctx.font=(SNAKE_CELL-2)+'px serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(snakeFood.emoji, fx, fy);
  }

  drawHudTop(ctx,W,{left:'❤️'.repeat(Math.max(0,snakeLives)), right:'⭐ '+snakeScore});

  // Fx
  snakeFx.forEach(f=>{
    const alpha=1-f.t;
    ctx.globalAlpha=alpha;
    ctx.fillStyle=f.special?'#ffcc00':'#2f5d2a';
    ctx.font='bold 14px Nunito,system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(f.text, f.x, f.y-f.t*30);
    ctx.globalAlpha=1;
  });
}

function snakeDie(){
  sfxSnakeDie();
  snakeLives--;
  if(snakeLives<=0){ snakeDone(false); return; }
  // reset snake, keep score
  snakeCells=[{x:9,y:11},{x:8,y:11},{x:7,y:11}];
  snakeDir={x:1,y:0}; snakeNextDir={x:1,y:0};
  snakeMoveTimer=0;
  snakeFx.push({x:180, y:230, t:0, text:'💔 -1 Mạng!', special:false});
}

function snakeDone(won){
  snakeMode=false;
  if(snakeRAF){ cancelAnimationFrame(snakeRAF); snakeRAF=null; }
  if(won){
    sfxWaveWin();
    updateScoreUI();
    showComboFlash(0,false,'🎉 ĐỘ DÀI 20 ĐẠT!');
    setTimeout(()=>startUnlockGate(13),1500);
  } else {
    forfeitHiddenMapScore();
    setTimeout(exitSnakeToMain, 800);
  }
}

function exitSnakeToMain(){
  setActiveHiddenMap(null);
  snakeMode=false;
  startBgm('main');
  if(snakeRAF){ cancelAnimationFrame(snakeRAF); snakeRAF=null; }
  SCV().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('hint-bar').textContent=(typeof t==='function'?t('hintDefault'):'');
  renderPieces(); checkGameOverA();
}

SCV().addEventListener('pointerdown', e=>{
  if(!snakeMode) return;
  const r=SCV().getBoundingClientRect();
  snakePointerStart={x:e.clientX-r.left, y:e.clientY-r.top};
});
SCV().addEventListener('pointerup', e=>{
  if(!snakeMode||!snakePointerStart) return;
  const r=SCV().getBoundingClientRect();
  const dx=(e.clientX-r.left)-snakePointerStart.x;
  const dy=(e.clientY-r.top)-snakePointerStart.y;
  snakePointerStart=null;
  // Luôn chạy theo hướng vuốt (dx,dy) thực tế — không dùng vị trí chạm so với tâm màn hình nữa
  if(Math.abs(dx)<6&&Math.abs(dy)<6) return; // vuốt quá ngắn, bỏ qua tránh nhiễu
  if(Math.abs(dx)>Math.abs(dy)){
    if(dx>0&&snakeDir.x===0) setSnakeDir(1,0);
    else if(dx<0&&snakeDir.x===0) setSnakeDir(-1,0);
  } else {
    if(dy>0&&snakeDir.y===0) setSnakeDir(0,1);
    else if(dy<0&&snakeDir.y===0) setSnakeDir(0,-1);
  }
});
