// ═══════════════════════════════════════════════════════════════
// maps/map19.js — MAP ẨN 19: Thoát khỏi mê cung
// Mê cung nhỏ hơn, đường rộng hơn; cỏ dày che tường (phải nhớ đường);
// linh vật Samoyed. Nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const MZC=()=>document.getElementById('maze-canvas');
let mazeState={};

function triggerMazeUnlock(){
  markMapCleared('rhythm');
  pendingUnlock='maze';
  document.getElementById('unlock-title').textContent='🌀 BẢN ĐỒ 19 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    '<b>Thoát khỏi mê cung</b><br>'+
    'Dẫn chú Samoyed tìm lối thoát trong 90 giây!<br>'+
    'Một số đoạn bị <b>cỏ dày</b> che — phải nhớ chỗ nào đi tiếp được.';
  document.getElementById('unlock-btn').textContent='VÀO MÊ CUNG!';
  showUnlockOverlay();
}

function enterMazeMode(){
  setActiveHiddenMap('maze');
  endDrag(); sfxUnlock();
  startBgm('space');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').textContent='Vuốt/phím mũi tên. Ô cỏ dày che tường — nhớ đường, tránh đi nhầm!';
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🌀 MAP ẨN 19';
  document.getElementById('mode-badge').classList.add('secret');
  MZC().classList.add('active');
  mazeMode=true; mazeWon=false;
  initMazeGame();
}

function generateMaze(cols,rows){
  const cells=Array.from({length:rows},()=>Array.from({length:cols},()=>({
    visited:false, walls:[true,true,true,true], grass:false
  })));
  const DIRS=[[-1,0,0,2],[0,1,1,3],[1,0,2,0],[0,-1,3,1]];
  function carve(r,c){
    cells[r][c].visited=true;
    const dirs=[...DIRS].sort(()=>Math.random()-0.5);
    for(const [dr,dc,w1,w2] of dirs){
      const nr=r+dr, nc=c+dc;
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

/** Rải cụm cỏ dày (kiểu hang/đường mòn bị phủ) — không phủ start/end */
function plantMazeGrass(cells, cols, rows){
  const blocked=new Set(['0,0', (rows-1)+','+(cols-1)]);
  const seeds=Math.max(3, Math.floor(cols*rows*0.08));
  for(let s=0;s<seeds;s++){
    let r,c;
    do{ r=(Math.random()*rows)|0; c=(Math.random()*cols)|0; } while(blocked.has(r+','+c));
    const radius=1+(Math.random()*2)|0;
    for(let dr=-radius;dr<=radius;dr++){
      for(let dc=-radius;dc<=radius;dc++){
        if(Math.abs(dr)+Math.abs(dc)>radius+1) continue;
        const nr=r+dr, nc=c+dc;
        if(nr<0||nr>=rows||nc<0||nc>=cols) continue;
        if(blocked.has(nr+','+nc)) continue;
        if(Math.random()<0.82) cells[nr][nc].grass=true;
      }
    }
  }
  // tăng mật độ: thêm cỏ rải rác
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(blocked.has(r+','+c)) continue;
      if(!cells[r][c].grass && Math.random()<0.28) cells[r][c].grass=true;
    }
  }
}

function initMazeGame(){
  const cv=MZC(), W=360, H=460;
  // Nhỏ hơn 15×19 → đường rộng hơn trên cùng canvas
  const cols=9, rows=11;
  const cells=generateMaze(cols,rows);
  plantMazeGrass(cells, cols, rows);
  const cellW=Math.floor((W-16)/cols);
  const cellH=Math.floor((H-56)/rows);
  const offX=(W-cols*cellW)/2;
  const offY=48;
  const pickups=[];
  const usedKeys=new Set(['0,0',(rows-1)+','+(cols-1)]);
  for(let i=0;i<4;i++){
    let r,c,key;
    do{ r=(Math.random()*rows)|0; c=(Math.random()*cols)|0; key=r+','+c; } while(usedKeys.has(key));
    usedKeys.add(key);
    pickups.push({r,c,type:'time',taken:false});
  }
  for(let i=0;i<6;i++){
    let r,c,key;
    do{ r=(Math.random()*rows)|0; c=(Math.random()*cols)|0; key=r+','+c; } while(usedKeys.has(key));
    usedKeys.add(key);
    pickups.push({r,c,type:'coin',taken:false});
  }
  if(mazeState._keyHandler) window.removeEventListener('keydown',mazeState._keyHandler);
  if(mazeState._retryKey) window.removeEventListener('keydown',mazeState._retryKey);
  mazeState={
    W,H,cols,rows,cells,cellW,cellH,offX,offY,
    dog:{r:0,c:0},
    timeLeft:90,
    timerTick:0,
    won:false,
    gameOver:false,
    touchStartX:null,
    touchStartY:null,
    pickups,
    score:0,
    // key "r,c,wallIdx" — tường đã "va" trong vùng cỏ (để nhớ đường cụt)
    revealed:Object.create(null),
    visited:Object.create(null)
  };
  mazeState.visited['0,0']=true;
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
    if(Math.abs(dx)>Math.abs(dy)) tryMoveDog(0,dx>0?1:-1);
    else tryMoveDog(dy>0?1:-1,0);
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
  const wallIdx=wallMap[`${dr}${dc}`];
  if(wallIdx===undefined) return;
  const here=cells[dog.r][dog.c];
  if(!here.walls[wallIdx]){
    dog.r+=dr; dog.c+=dc;
    s.visited[dog.r+','+dog.c]=true;
    try{ sfxMazeStep(); }catch(e){}
    const pk=s.pickups.find(p=>!p.taken&&p.r===dog.r&&p.c===dog.c);
    if(pk){
      pk.taken=true;
      if(pk.type==='time'){ s.timeLeft+=5; }
      else { s.score+=10; score+=10; if(score>best) best=score; updateScoreUI(); }
      try{ sfxRhythmSpawn(); }catch(e){}
    }
    if(dog.r===rows-1&&dog.c===cols-1){
      s.won=true; mazeWon=true;
      try{ sfxMazeSolve(); }catch(e){}
    }
  } else {
    // Va tường trong/cạnh cỏ → ghi nhớ hướng cụt
    if(here.grass) s.revealed[dog.r+','+dog.c+','+wallIdx]=true;
    try{ sfxMazeWall(); }catch(e){}
  }
}

function drawMazeBg(ctx,W,H,t){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#1a2f22');
  g.addColorStop(0.45,'#243828');
  g.addColorStop(1,'#152018');
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);
  // sương hang
  for(let i=0;i<18;i++){
    const x=(Math.sin(i*17.3+t*0.4)*0.5+0.5)*W;
    const y=(Math.cos(i*11.1+t*0.35)*0.5+0.5)*H;
    const rg=ctx.createRadialGradient(x,y,0,x,y,40+i%20);
    rg.addColorStop(0,'rgba(180,220,160,0.06)');
    rg.addColorStop(1,'rgba(180,220,160,0)');
    ctx.fillStyle=rg;
    ctx.beginPath(); ctx.arc(x,y,50,0,Math.PI*2); ctx.fill();
  }
}

function drawDenseGrass(ctx,x,y,w,h,seed,t){
  ctx.save();
  ctx.beginPath();
  ctx.rect(x+1,y+1,w-2,h-2);
  ctx.clip();
  // nền đất ẩm dưới cỏ
  ctx.fillStyle='#2a4a28';
  ctx.fillRect(x,y,w,h);
  const blades=Math.max(14, ((w*h)/18)|0);
  for(let i=0;i<blades;i++){
    const sx=x+2+((seed*37+i*17)%Math.max(1,(w-4)));
    const base=y+h-2;
    const len=h*0.45+((seed+i*13)%10);
    const sway=Math.sin(t*2.2+i*0.7+seed)*2.2;
    ctx.strokeStyle=i%3===0?'#3d7a3a':(i%3===1?'#4a9a44':'#2f6b32');
    ctx.lineWidth=1.4;
    ctx.beginPath();
    ctx.moveTo(sx, base);
    ctx.quadraticCurveTo(sx+sway, base-len*0.55, sx+sway*1.4, base-len);
    ctx.stroke();
  }
  // lớp phủ tối — che tường/đường
  ctx.fillStyle='rgba(10,30,12,0.38)';
  ctx.fillRect(x,y,w,h);
  ctx.restore();
}

function drawStoneWalls(ctx,s){
  const {cols,rows,cells,cellW,cellH,offX,offY,revealed}=s;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  // tường rõ chỉ khi ô không phải cỏ (hoặc đã lộ vì va)
  ctx.beginPath();
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const cell=cells[r][c];
      const x=offX+c*cellW, y=offY+r*cellH;
      const w=cell.walls;
      for(let wi=0;wi<4;wi++){
        if(!w[wi]) continue;
        const hideByGrass=cell.grass && !revealed[r+','+c+','+wi];
        if(hideByGrass) continue;
        if(wi===0){ ctx.moveTo(x+1,y); ctx.lineTo(x+cellW-1,y); }
        else if(wi===1){ ctx.moveTo(x+cellW,y+1); ctx.lineTo(x+cellW,y+cellH-1); }
        else if(wi===2){ ctx.moveTo(x+1,y+cellH); ctx.lineTo(x+cellW-1,y+cellH); }
        else { ctx.moveTo(x,y+1); ctx.lineTo(x,y+cellH-1); }
      }
    }
  }
  ctx.strokeStyle='#e8d9a8';
  ctx.lineWidth=3.2;
  ctx.stroke();
  ctx.strokeStyle='rgba(90,70,30,0.55)';
  ctx.lineWidth=1.4;
  ctx.stroke();
}

function drawRevealedMarks(ctx,s){
  const {cols,rows,cells,cellW,cellH,offX,offY,revealed,dog}=s;
  ctx.fillStyle='rgba(255,80,60,0.85)';
  ctx.strokeStyle='rgba(255,120,90,0.9)';
  ctx.lineWidth=1.5;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(!cells[r][c].grass) continue;
      const x=offX+c*cellW, y=offY+r*cellH;
      for(let wi=0;wi<4;wi++){
        if(!revealed[r+','+c+','+wi]) continue;
        let mx=x+cellW/2, my=y+cellH/2;
        if(wi===0) my=y+5;
        if(wi===1) mx=x+cellW-5;
        if(wi===2) my=y+cellH-5;
        if(wi===3) mx=x+5;
        ctx.beginPath();
        ctx.moveTo(mx-3,my-3); ctx.lineTo(mx+3,my+3);
        ctx.moveTo(mx+3,my-3); ctx.lineTo(mx-3,my+3);
        ctx.stroke();
      }
      // viền nhạt ô cỏ đang đứng
      if(dog.r===r&&dog.c===c){
        ctx.strokeStyle='rgba(255,255,180,0.35)';
        ctx.strokeRect(x+2,y+2,cellW-4,cellH-4);
        ctx.strokeStyle='rgba(255,120,90,0.9)';
      }
    }
  }
}

function drawSamoyed(ctx,cx,cy,size,t){
  const s=size*0.48;
  ctx.save();
  ctx.translate(cx, cy+Math.sin(t*3)*1.2);
  // bóng
  ctx.fillStyle='rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0,s*0.85,s*0.55,s*0.18,0,0,Math.PI*2); ctx.fill();
  // thân lông
  ctx.fillStyle='#f7f7f4';
  ctx.beginPath(); ctx.ellipse(0,s*0.15,s*0.62,s*0.55,0,0,Math.PI*2); ctx.fill();
  // đầu
  ctx.beginPath(); ctx.ellipse(0,-s*0.35,s*0.48,s*0.45,0,0,Math.PI*2); ctx.fill();
  // tai
  ctx.fillStyle='#efe8e0';
  ctx.beginPath(); ctx.ellipse(-s*0.38,-s*0.7,s*0.16,s*0.22, -0.4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( s*0.38,-s*0.7,s*0.16,s*0.22,  0.4,0,Math.PI*2); ctx.fill();
  // mắt
  ctx.fillStyle='#222';
  ctx.beginPath(); ctx.arc(-s*0.16,-s*0.38,s*0.07,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( s*0.16,-s*0.38,s*0.07,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(-s*0.13,-s*0.41,s*0.025,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( s*0.19,-s*0.41,s*0.025,0,Math.PI*2); ctx.fill();
  // mũi
  ctx.fillStyle='#333';
  ctx.beginPath(); ctx.ellipse(0,-s*0.22,s*0.1,s*0.07,0,0,Math.PI*2); ctx.fill();
  // má hồng
  ctx.fillStyle='rgba(255,160,170,0.35)';
  ctx.beginPath(); ctx.ellipse(-s*0.28,-s*0.2,s*0.1,s*0.06,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( s*0.28,-s*0.2,s*0.1,s*0.06,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
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
      if(s.timeLeft<=0) s.gameOver=true;
    }
  }
  const t=Date.now()*0.001;
  drawMazeBg(ctx,W,H,t);
  try{ drawHudTop(ctx,W,{left:'⏱ '+s.timeLeft+'s', right:'🌿 Cỏ che đường'}); }catch(e){
    ctx.fillStyle='#fff'; ctx.font='bold 13px Nunito,sans-serif';
    ctx.textAlign='left'; ctx.fillText('⏱ '+s.timeLeft+'s',12,22);
    ctx.textAlign='right'; ctx.fillText('🌿 Cỏ che đường',W-12,22);
  }

  const {cols,rows,cells,cellW,cellH,offX,offY}=s;
  // sàn đường mòn
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x=offX+c*cellW, y=offY+r*cellH;
      if(cells[r][c].grass){
        drawDenseGrass(ctx,x,y,cellW,cellH,r*97+c*13,t);
      } else {
        ctx.fillStyle=(r+c)%2===0?'#3d5c3a':'#355434';
        ctx.fillRect(x+1,y+1,cellW-2,cellH-2);
        ctx.strokeStyle='rgba(255,255,220,0.08)';
        ctx.strokeRect(x+1.5,y+1.5,cellW-3,cellH-3);
      }
    }
  }

  drawStoneWalls(ctx,s);
  drawRevealedMarks(ctx,s);

  // cổng thoát
  const ex=offX+(cols-1)*cellW+cellW/2, ey=offY+(rows-1)*cellH+cellH/2;
  const glow=0.45+0.35*Math.sin(t*3);
  const eg=ctx.createRadialGradient(ex,ey,2,ex,ey,cellW*0.95);
  eg.addColorStop(0,`rgba(255,220,90,${0.35+glow*0.3})`);
  eg.addColorStop(1,'rgba(255,220,90,0)');
  ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(ex,ey,cellW*0.95,0,Math.PI*2); ctx.fill();
  ctx.font=(Math.min(cellW,cellH)*0.72)+'px serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('🚪',ex,ey);

  ctx.font=(Math.min(cellW,cellH)*0.52)+'px serif';
  s.pickups.forEach(p=>{
    if(p.taken) return;
    // ẩn pickup dưới cỏ dày nếu chưa đứng sát (trừ khi đã visit)
    if(cells[p.r][p.c].grass && !s.visited[p.r+','+p.c] && !(s.dog.r===p.r&&s.dog.c===p.c)) return;
    const px=offX+p.c*cellW+cellW/2, py=offY+p.r*cellH+cellH/2;
    ctx.fillText(p.type==='time'?'⏱️':'💰',px,py);
  });

  const dx=offX+s.dog.c*cellW+cellW/2, dy=offY+s.dog.r*cellH+cellH/2;
  drawSamoyed(ctx,dx,dy,Math.min(cellW,cellH),t);

  if(s.won){
    ctx.fillStyle='rgba(0,0,0,0.78)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffd76a';
    ctx.font='bold 24px Nunito,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    ctx.fillText('🌀 THOÁT KHỎI MÊ CUNG!',W/2,H/2);
    ctx.fillStyle='#cde8c8';
    ctx.font='15px Nunito,sans-serif';
    ctx.fillText('Còn '+s.timeLeft+'s',W/2,H/2+30);
    setTimeout(()=>exitMazeToMain(),3000);
    s.won=false; s.gameOver=true;
  } else if(s.gameOver){
    if(!s._forfeited){
      s._forfeited=true;
      try{ forfeitHiddenMapScore(); }catch(e){}
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
  if(mazeState._keyHandler) window.removeEventListener('keydown',mazeState._keyHandler);
  if(mazeState._retryKey) window.removeEventListener('keydown',mazeState._retryKey);
  MZC().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('hint-bar').textContent=(typeof t==='function'?t('hintDefault'):'');
  renderPieces(); checkGameOverA();
  if(mazeWon) setTimeout(()=>startUnlockGate(18),1500);
}
