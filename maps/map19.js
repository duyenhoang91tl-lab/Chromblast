// ═══════════════════════════════════════════════════════════════
// maps/map19.js — MAP ẨN 19: Mê cung (Maze Runner)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const MZC=()=>document.getElementById('maze-canvas');
// (đã chuyển khai báo biến mode lên đầu file để tránh lỗi TDZ)
let mazeState={};

function triggerMazeUnlock(){
  markMapCleared('rhythm');
  pendingUnlock='maze';
  document.getElementById('unlock-title').textContent='🌀 BẢN ĐỒ 19 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML='<b>Maze Runner</b><br>Tìm đường thoát khỏi mê cung trong 60 giây!';
  document.getElementById('unlock-btn').textContent='CHIẾN ĐẤU!';
  showUnlockOverlay();
}

function enterMazeMode(){
  setActiveHiddenMap('maze');
  endDrag(); sfxUnlock();
  startBgm('space');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').textContent='Vuốt hoặc phím mũi tên để di chuyển qua mê cung!';
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🌀 MAP ẨN 19';
  document.getElementById('mode-badge').classList.add('secret');
  MZC().classList.add('active');
  mazeMode=true; mazeWon=false;
  initMazeGame();
}

function generateMaze(cols,rows){
  const cells=Array.from({length:rows},()=>Array.from({length:cols},()=>({visited:false,walls:[true,true,true,true]})));
  const DIRS=[[-1,0,0,2],[0,1,1,3],[1,0,2,0],[0,-1,3,1]];
  function carve(r,c){
    cells[r][c].visited=true;
    const dirs=[...DIRS].sort(()=>Math.random()-0.5);
    for(const [dr,dc,w1,w2] of dirs){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&!cells[nr][nc].visited){
        cells[r][c].walls[w1]=false;
        cells[nr][nc].walls[w2]=false;
        carve(nr,nc);
      }
    }
  }
  carve(0,0);
  return cells;
}

function initMazeGame(){
  const cv=MZC(), W=360, H=460;
  const cols=15, rows=19;
  const cells=generateMaze(cols,rows);
  const cellW=Math.floor((W-10)/cols);
  const cellH=Math.floor((H-50)/rows);
  const offX=(W-cols*cellW)/2;
  const offY=45;
  // Vật phẩm thu thập: ⏱️ cộng thêm giờ, 💰 cộng điểm — giúp người chơi có cơ hội qua màn hợp lý hơn
  const pickups=[];
  const usedKeys=new Set(['0,0',(rows-1)+','+(cols-1)]);
  for(let i=0;i<7;i++){
    let r,c,key;
    do{ r=Math.floor(Math.random()*rows); c=Math.floor(Math.random()*cols); key=r+','+c; } while(usedKeys.has(key));
    usedKeys.add(key);
    pickups.push({r,c,type:'time',taken:false});
  }
  for(let i=0;i<10;i++){
    let r,c,key;
    do{ r=Math.floor(Math.random()*rows); c=Math.floor(Math.random()*cols); key=r+','+c; } while(usedKeys.has(key));
    usedKeys.add(key);
    pickups.push({r,c,type:'coin',taken:false});
  }
  // gỡ listener của ván trước (nếu có) trước khi thay mazeState — tránh chồng handler khi chơi lại
  if(mazeState._keyHandler) window.removeEventListener('keydown',mazeState._keyHandler);
  if(mazeState._retryKey) window.removeEventListener('keydown',mazeState._retryKey);
  mazeState={
    W,H,cols,rows,cells,cellW,cellH,offX,offY,
    dog:{r:0,c:0},
    timeLeft:90, // tăng thời gian hợp lý hơn để có cơ hội phá đảo mê cung 15x19
    timerTick:0,
    won:false,
    gameOver:false,
    touchStartX:null,
    touchStartY:null,
    pickups,
    score:0
  };
  const s=mazeState;
  s._keyHandler=ev=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(ev.key)){
      ev.preventDefault();
      const map={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
      const [dr,dc]=map[ev.key];
      tryMoveDog(dr,dc);
    }
  };
  window.addEventListener('keydown',s._keyHandler);
  cv.ontouchstart=ev=>{
    ev.preventDefault();
    s.touchStartX=ev.touches[0].clientX;
    s.touchStartY=ev.touches[0].clientY;
  };
  cv.ontouchend=ev=>{
    ev.preventDefault();
    if(s.touchStartX===null) return;
    const dx=ev.changedTouches[0].clientX-s.touchStartX;
    const dy=ev.changedTouches[0].clientY-s.touchStartY;
    if(Math.abs(dx)>Math.abs(dy)){
      tryMoveDog(0,dx>0?1:-1);
    } else {
      tryMoveDog(dy>0?1:-1,0);
    }
    s.touchStartX=null; s.touchStartY=null;
  };
  if(mazeRAF) cancelAnimationFrame(mazeRAF);
  mazeRAF=requestAnimationFrame(mazeLoop);
}

function tryMoveDog(dr,dc){
  const s=mazeState;
  if(s.won||s.gameOver) return;
  const {dog,cells,rows,cols}=s;
  const wallMap={'-10':0,'01':1,'10':2,'0-1':3};
  const key=`${dr}${dc}`;
  const wallIdx=wallMap[key];
  if(wallIdx===undefined) return;
  if(!cells[dog.r][dog.c].walls[wallIdx]){
    dog.r+=dr; dog.c+=dc;
    sfxMazeStep();
    const pk=s.pickups.find(p=>!p.taken&&p.r===dog.r&&p.c===dog.c);
    if(pk){
      pk.taken=true;
      if(pk.type==='time'){ s.timeLeft+=5; }
      else { s.score+=10; score+=10; if(score>best) best=score; updateScoreUI(); }
      sfxRhythmSpawn();
    }
    if(dog.r===rows-1&&dog.c===cols-1){
      s.won=true; mazeWon=true;
      sfxMazeSolve();
    }
  } else {
    sfxMazeWall();
  }
}

function mazeLoop(){
  if(!mazeMode){ mazeRAF=null; return; }
  const s=mazeState;
  const cv=MZC(), ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  const W=s.W, H=s.H;
  if(!s.won&&!s.gameOver){
    s.timerTick++;
    if(s.timerTick>=60){
      s.timerTick=0;
      s.timeLeft--;
      if(s.timeLeft<=0){ s.gameOver=true; }
    }
  }
  const mzT=Date.now()*0.0005;
  // đêm Map 4 giàu chi tiết
  scenicNightFull(ctx,W,H,mzT*2);
  // hạt sáng huyền ảo trôi nổi
  for(let i=0;i<26;i++){
    const fx=(Math.sin(i*91.7+mzT*0.6)*0.5+0.5)*W;
    const fy=(Math.cos(i*63.1+mzT*0.8)*0.5+0.5)*H;
    const fa=0.2+0.25*Math.sin(mzT*2+i);
    ctx.fillStyle=`rgba(255,240,210,${fa})`;
    ctx.beginPath(); ctx.arc(fx,fy,1.2,0,Math.PI*2); ctx.fill();
  }
  drawHudTop(ctx,W,{left:'⏱ '+s.timeLeft+'s', right:'Vuốt/phím mũi tên'});
  const {cols,rows,cells,cellW,cellH,offX,offY}=s;
  ctx.save();
  // Gom TOÀN BỘ tường vào 1 path + 1 lệnh stroke, bỏ shadowBlur — trước đây mỗi đoạn tường
  // là 1 beginPath/stroke riêng kèm shadow (hàng trăm lệnh vẽ mỗi frame) gây tụt FPS
  ctx.strokeStyle='#fff6d8'; // tường kem sáng — nổi rõ trên nền lavender pastel
  ctx.lineWidth=1.5;
  ctx.beginPath();
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x=offX+c*cellW, y=offY+r*cellH;
      const w=cells[r][c].walls;
      if(w[0]){ ctx.moveTo(x,y); ctx.lineTo(x+cellW,y); }
      if(w[1]){ ctx.moveTo(x+cellW,y); ctx.lineTo(x+cellW,y+cellH); }
      if(w[2]){ ctx.moveTo(x,y+cellH); ctx.lineTo(x+cellW,y+cellH); }
      if(w[3]){ ctx.moveTo(x,y); ctx.lineTo(x,y+cellH); }
    }
  }
  ctx.stroke();
  ctx.restore();
  // quầng sáng cổng ra
  const ex=offX+(cols-1)*cellW+cellW/2, ey=offY+(rows-1)*cellH+cellH/2;
  const glowPulse=0.5+0.5*Math.sin(mzT*3);
  const eg=ctx.createRadialGradient(ex,ey,2,ex,ey,cellW*0.9);
  eg.addColorStop(0,`rgba(255,220,80,${0.3+glowPulse*0.25})`); eg.addColorStop(1,'rgba(255,220,80,0)');
  ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(ex,ey,cellW*0.9,0,Math.PI*2); ctx.fill();
  ctx.font=Math.min(cellW,cellH)*0.8+'px serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText('🚪',ex,ey);
  ctx.font=Math.min(cellW,cellH)*0.6+'px serif';
  s.pickups.forEach(p=>{
    if(p.taken) return;
    const px=offX+p.c*cellW+cellW/2, py=offY+p.r*cellH+cellH/2;
    ctx.fillText(p.type==='time'?'⏱️':'💰',px,py);
  });
  ctx.font=Math.min(cellW,cellH)*0.8+'px serif';
  const dx=offX+s.dog.c*cellW+cellW/2, dy=offY+s.dog.r*cellH+cellH/2;
  ctx.fillText('🐕',dx,dy);
  if(s.won){
    ctx.fillStyle='rgba(0,0,0,0.8)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffd700';
    ctx.font='bold 26px monospace';
    ctx.textAlign='center';
    ctx.textBaseline='alphabetic';
    ctx.fillText('🌀 THOÁT KHỎI MÊ CUNG!',W/2,H/2);
    ctx.fillStyle='#aaaaff';
    ctx.font='16px monospace';
    ctx.fillText('Còn '+s.timeLeft+'s',W/2,H/2+32);
    setTimeout(()=>exitMazeToMain(),3000);
    s.won=false; s.gameOver=true;
  } else if(s.gameOver){
    if(!s._forfeited){
      s._forfeited=true; forfeitHiddenMapScore();
      setTimeout(()=>exitMazeToMain(), 300);
    }
  }
  mazeRAF=requestAnimationFrame(mazeLoop);
}

function exitMazeToMain(){
  setActiveHiddenMap(null);
  mazeMode=false;
  startBgm('main');
  if(mazeRAF){cancelAnimationFrame(mazeRAF);mazeRAF=null;}
  // gỡ listener bàn phím gắn vào window — trước đây thắng/thoát không gỡ,
  // handler cũ tồn tại mãi và mỗi lần vào lại maze lại chồng thêm 1 cái
  if(mazeState._keyHandler) window.removeEventListener('keydown',mazeState._keyHandler);
  if(mazeState._retryKey) window.removeEventListener('keydown',mazeState._retryKey);
  MZC().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('hint-bar').textContent='Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay';
  renderPieces(); checkGameOverA();
  if(mazeWon) setTimeout(()=>startUnlockGate(18),1500);
}
