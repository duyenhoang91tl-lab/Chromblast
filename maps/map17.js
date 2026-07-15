// ═══════════════════════════════════════════════════════════════
// maps/map17.js — MAP ẨN 17: Space Shooter
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const SPC=()=>document.getElementById('space-canvas');
// (đã chuyển khai báo biến mode lên đầu file để tránh lỗi TDZ)
let spaceState={};

function triggerSpaceUnlock(){
  markMapCleared('runner');
  pendingUnlock='space';
  document.getElementById('unlock-title').textContent='🚀 BẢN ĐỒ 17 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML='<b>Space Shooter</b><br>Bay vào vũ trụ, tiêu diệt quân xâm lăng!';
  document.getElementById('unlock-btn').textContent='CHIẾN ĐẤU!';
  showUnlockOverlay();
}

function enterSpaceMode(){
  setActiveHiddenMap('space');
  endDrag(); sfxUnlock();
  startBgm('space');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').textContent='Di chuyển ngón tay → tàu theo! Chạm để bắn, hoặc bật Tự bắn ở góc trái!';
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🚀 MAP ẨN 17';
  document.getElementById('mode-badge').classList.add('secret');
  SPC().classList.add('active');
  const afBtn0=document.getElementById('space-autofire-btn'); if(afBtn0) afBtn0.style.display='block';
  spaceMode=true; spaceWon=false;
  initSpaceGame();
}

function initSpaceGame(){
  const cv=SPC(), W=360, H=460;
  spaceState={
    W,H,
    ship:{x:180,y:400,w:40,h:30,speed:4},
    bullets:[],
    aliens:[],
    alienBullets:[],
    lives:3,
    wave:0,
    waveCleared:true,
    score:0,
    gameOver:false,
    won:false,
    shootCooldown:0,
    alienShootTimer:0,
    pointerX:180,
    invincible:0,
    flashTimer:0,
    totalWaves:3,
    autoFire:false
  };
  const s=spaceState;
  cv.onpointermove=ev=>{
    const rect=cv.getBoundingClientRect();
    const scaleX=W/rect.width;
    s.pointerX=(ev.clientX-rect.left)*scaleX;
  };
  cv.ontouchmove=ev=>{
    ev.preventDefault();
    const rect=cv.getBoundingClientRect();
    const scaleX=W/rect.width;
    s.pointerX=(ev.touches[0].clientX-rect.left)*scaleX;
  };
  cv.onclick=ev=>{
    if(!s.gameOver && !s.won) spaceShoot();
  };
  cv.ontouchstart=ev=>{
    ev.preventDefault();
    const rect=cv.getBoundingClientRect();
    const scaleX=W/rect.width;
    s.pointerX=(ev.touches[0].clientX-rect.left)*scaleX;
    if(!s.gameOver && !s.won) spaceShoot();
  };
  const afBtn=document.getElementById('space-autofire-btn');
  if(afBtn){
    afBtn.textContent='🔫 Tự bắn: TẮT';
    afBtn.onclick=()=>{
      s.autoFire=!s.autoFire;
      afBtn.textContent='🔫 Tự bắn: '+(s.autoFire?'BẬT':'TẮT');
      sfxClick();
    };
  }
  if(spaceRAF) cancelAnimationFrame(spaceRAF);
  spaceRAF=requestAnimationFrame(spaceLoop);
}

function spawnWave(){
  const s=spaceState;
  s.wave++;
  s.waveCleared=false;
  s.aliens=[];
  const cols=6, rows=2+(s.wave>1?1:0);
  const speed=0.5+s.wave*0.4;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      s.aliens.push({
        x:40+c*50, y:50+r*48,
        w:32, h:32,
        hp:1, speed,
        dir:1,
        emoji:'👾'
      });
    }
  }
}

function spaceShoot(){
  const s=spaceState;
  if(s.shootCooldown>0) return;
  s.bullets.push({x:s.ship.x,y:s.ship.y-20,speed:10});
  s.shootCooldown=12;
  sfxSpaceShoot();
}

function drawSpaceBg(ctx,W,H){
  const t=Date.now()*0.001;
  // đêm Map 4 giàu chi tiết
  scenicNightFull(ctx,W,H,t);
  // hành tinh kẹo ngọt có vành, góc trên trái
  ctx.save();
  const px=W*0.14, py=H*0.14, pr=20;
  const pg=ctx.createRadialGradient(px-pr*0.3,py-pr*0.3,2,px,py,pr);
  pg.addColorStop(0,'#ffd9ec'); pg.addColorStop(1,'#e88ab8');
  ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(px,py,pr,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,230,245,0.65)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.ellipse(px,py,pr*1.6,pr*0.35,-0.3,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}

function spaceLoop(){
  if(!spaceMode){ spaceRAF=null; return; }
  const s=spaceState;
  const cv=SPC(), ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  const W=s.W, H=s.H;
  if(!s.gameOver && !s.won){
    if(s.waveCleared && s.wave<s.totalWaves){
      spawnWave();
    }
    const dx=s.pointerX-s.ship.x;
    s.ship.x+=dx*0.15;
    s.ship.x=Math.max(20,Math.min(W-20,s.ship.x));
    if(s.shootCooldown>0) s.shootCooldown--;
    if(s.autoFire && s.shootCooldown<=0) spaceShoot();
    for(let i=s.bullets.length-1;i>=0;i--){
      s.bullets[i].y-=s.bullets[i].speed;
      if(s.bullets[i].y<-10) s.bullets.splice(i,1);
    }
    let hitWall=false;
    for(const a of s.aliens){
      a.x+=a.speed*a.dir;
      if(a.x>W-20||a.x<20) hitWall=true;
    }
    if(hitWall){
      for(const a of s.aliens){ a.dir*=-1; a.y+=18; }
    }
    s.alienShootTimer--;
    if(s.alienShootTimer<=0 && s.aliens.length>0){
      s.alienShootTimer=Math.max(30,80-s.wave*15);
      const shooter=s.aliens[Math.floor(Math.random()*s.aliens.length)];
      s.alienBullets.push({x:shooter.x,y:shooter.y+16,speed:3+s.wave});
      sfxSpaceAlienFire();
    }
    for(let i=s.alienBullets.length-1;i>=0;i--){
      s.alienBullets[i].y+=s.alienBullets[i].speed;
      if(s.alienBullets[i].y>H+10) s.alienBullets.splice(i,1);
    }
    for(let bi=s.bullets.length-1;bi>=0;bi--){
      const b=s.bullets[bi];
      for(let ai=s.aliens.length-1;ai>=0;ai--){
        const a=s.aliens[ai];
        if(Math.abs(b.x-a.x)<20&&Math.abs(b.y-a.y)<20){
          s.bullets.splice(bi,1);
          s.aliens.splice(ai,1);
          s.score+=1; // 1 điểm/quái tiêu diệt
          sfxSpaceHit();
          break;
        }
      }
    }
    if(s.aliens.length===0 && !s.waveCleared){
      s.waveCleared=true;
      if(s.wave>=s.totalWaves){
        s.won=true;
        spaceWon=true;
        sfxMazeSolve();
      }
    }
    if(s.invincible<=0){
      for(let i=s.alienBullets.length-1;i>=0;i--){
        const b=s.alienBullets[i];
        if(Math.abs(b.x-s.ship.x)<22&&Math.abs(b.y-s.ship.y)<18){
          s.alienBullets.splice(i,1);
          s.lives--;
          s.invincible=90;
          sfxSpaceDogHit();
          if(s.lives<=0){ s.gameOver=true; }
          break;
        }
      }
      for(const a of s.aliens){
        if(a.y>H-60){
          s.lives--;
          s.invincible=90;
          sfxSpaceDogHit();
          if(s.lives<=0){ s.gameOver=true; }
          break;
        }
      }
    } else {
      s.invincible--;
    }
  }
  drawSpaceBg(ctx,W,H);
  ctx.fillStyle='#ffffff';
  for(let i=0;i<40;i++){
    const sx=(i*137+s.score*0.5)%W;
    const sy=(i*97+(Date.now()*0.02+i*13))%H;
    ctx.fillRect(sx,sy,1,1);
  }
  ctx.font='28px serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  for(const a of s.aliens){
    ctx.fillText(a.emoji,a.x,a.y);
  }
  ctx.fillStyle='#00ffff';
  for(const b of s.bullets){
    ctx.fillRect(b.x-2,b.y-8,4,14);
  }
  ctx.fillStyle='#ff4444';
  for(const b of s.alienBullets){
    ctx.fillRect(b.x-2,b.y-6,4,12);
  }
  if(s.invincible<=0||Math.floor(s.invincible/5)%2===0){
    ctx.font='36px serif';
    ctx.fillText('🚀',s.ship.x,s.ship.y);
  }
  // Thanh sẵn sàng bắn bên trái — đầy = bắn được ngay ("hiện nốt bắn" để tiện canh bắn)
  const readyPct=1-(s.shootCooldown/12);
  ctx.fillStyle='rgba(255,255,255,0.15)';
  ctx.fillRect(4,H*0.35,8,H*0.3);
  ctx.fillStyle=readyPct>=1?'#5cff8a':'#ffcc55';
  ctx.fillRect(4,H*0.35+H*0.3*(1-readyPct),8,H*0.3*readyPct);
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1;
  ctx.strokeRect(4,H*0.35,8,H*0.3);
  drawHudTop(ctx,W,{left:'❤️'.repeat(Math.max(0,s.lives)), center:'SÓNG '+(Math.min(s.wave,s.totalWaves))+'/'+s.totalWaves, right:'⭐ '+s.score});
  if(s.waveCleared && s.wave<s.totalWaves && !s.won){
    ctx.fillStyle='rgba(0,0,50,0.6)';
    ctx.fillRect(0,H/2-40,W,80);
    ctx.fillStyle='#00ffff';
    ctx.font='bold 20px monospace';
    ctx.textAlign='center';
    ctx.fillText('SÓNG '+(s.wave)+' XONG!',W/2,H/2-10);
    ctx.font='14px monospace';
    ctx.fillText('Chuẩn bị sóng tiếp theo...',W/2,H/2+18);
  }
  if(s.gameOver && !s.won){
    if(!s._exited){ s._exited=true; setTimeout(()=>exitSpaceToMain(), 300); }
  } else if(s.won){
    ctx.fillStyle='rgba(0,0,20,0.8)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffd700';
    ctx.font='bold 26px monospace';
    ctx.textAlign='center';
    ctx.fillText('🎖 CHIẾN THẮNG!',W/2,H/2-30);
    ctx.fillStyle='#ffffff';
    ctx.font='16px monospace';
    ctx.fillText('Điểm: '+s.score,W/2,H/2+10);
    setTimeout(()=>exitSpaceToMain(),3000);
    s.won=false; s.gameOver=true;
  }
  spaceRAF=requestAnimationFrame(spaceLoop);
}

function exitSpaceToMain(){
  setActiveHiddenMap(null);
  spaceMode=false;
  startBgm('main');
  if(spaceRAF){cancelAnimationFrame(spaceRAF);spaceRAF=null;}
  if(!spaceWon) forfeitHiddenMapScore();
  else if(spaceState.score){ score+=spaceState.score; if(score>best) best=score; updateScoreUI(); }
  const afBtn1=document.getElementById('space-autofire-btn'); if(afBtn1) afBtn1.style.display='none';
  SPC().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('hint-bar').textContent='Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay';
  renderPieces(); checkGameOverA();
  if(spaceWon) setTimeout(()=>startUnlockGate(16),1500);
}
