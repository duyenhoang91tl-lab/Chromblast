// ═══════════════════════════════════════════════════════════════
// boss/mega-dragon.js — BOSS Map ẩn 20 (MEGA BOSS — Rồng huyền thoại)
// Tách khỏi main.js, nạp TRƯỚC main.js (dùng chung global scope).
// ═══════════════════════════════════════════════════════════════

let megaMode=false, megaRAF=null, megaWon=false;

/* ═══════════════════════════════════════════════════════
   MAP 20 — MEGA BOSS FINAL BATTLE 💀
═══════════════════════════════════════════════════════ */
const MGC=()=>document.getElementById('mega-canvas');
// (đã chuyển khai báo biến mode lên đầu file để tránh lỗi TDZ)
let megaState={};
let megaStars=[], megaNebulas=[];

function initMegaBg(W,H){
  megaStars=[];
  for(let i=0;i<70;i++){
    megaStars.push({x:Math.random()*W,y:Math.random()*H,r:0.5+Math.random()*1.8,speed:12+Math.random()*40,phase:Math.random()*Math.PI*2});
  }
  megaNebulas=[
    {x:W*0.2,y:H*0.25,r:120,hue:'rgba(120,20,90,0.35)'},
    {x:W*0.8,y:H*0.5,r:150,hue:'rgba(60,10,120,0.3)'},
    {x:W*0.5,y:H*0.85,r:130,hue:'rgba(150,10,40,0.28)'},
  ];
}

function updateMegaBg(dt,W,H){
  megaStars.forEach(s=>{
    s.y+=s.speed*dt;
    if(s.y>H){ s.y=-2; s.x=Math.random()*W; }
  });
}

function drawMegaBg(ctx,W,H,now){
  // đêm lavender pastel dễ thương + trăng cười (đồng bộ phong cách Map ẩn 4)
  scenicNightFull(ctx,W,H,now*0.001);

  megaNebulas.forEach(n=>{
    const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);
    g.addColorStop(0,n.hue); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
  });

  megaStars.forEach(s=>{
    const tw=0.5+0.5*Math.sin(now*0.003+s.phase);
    ctx.fillStyle=`rgba(255,235,245,${0.3+tw*0.6})`;
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
  });
}

function triggerMegaUnlock(){
  markMapCleared('maze');
  pendingUnlock='mega';
  document.getElementById('unlock-title').textContent='💀 BẢN ĐỒ 20 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML='<b>MEGA BOSS Final Battle</b><br>Trận chiến cuối cùng! Hạ gục Rồng Huyền Thoại!';
  document.getElementById('unlock-btn').textContent='CHIẾN ĐẤU!';
  showUnlockOverlay();
}

function enterMegaMode(){
  setActiveHiddenMap('mega');
  endDrag(); sfxUnlock();
  startBgm('action');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').textContent='Di chuyển ngón → né đạn! Tự bắn! Hạ gục Rồng!';
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='💀 MAP ẨN 20';
  document.getElementById('mode-badge').classList.add('secret');
  MGC().classList.add('active');
  megaMode=true; megaWon=false;
  initMegaGame();
}

function initMegaGame(){
  const cv=MGC(), W=360, H=460;
  megaState={
    W,H,
    boss:{x:180,y:100,hp:500,maxHp:500,phase:1,dir:1,speed:1.2,shootTimer:0,homingTimer:0,laserTimer:0,laserActive:false,laserAngle:0,laserSweep:0,flashTimer:0},
    ship:{x:180,y:400,w:36,h:28},
    bullets:[],
    bossShots:[],
    homingMissiles:[],
    lives:3,
    score:0,
    gameOver:false,
    won:false,
    invincible:0,
    shootCooldown:0,
    pointerX:180,
    phaseChanged:false,
    phaseFlash:0
  };
  const s=megaState;
  cv.onpointermove=ev=>{
    const rect=cv.getBoundingClientRect();
    s.pointerX=(ev.clientX-rect.left)*(W/rect.width);
  };
  cv.ontouchmove=ev=>{
    ev.preventDefault();
    const rect=cv.getBoundingClientRect();
    s.pointerX=(ev.touches[0].clientX-rect.left)*(W/rect.width);
  };
  cv.onclick=()=>{ if(!s.gameOver&&!s.won) megaShoot(); };
  cv.ontouchstart=ev=>{
    ev.preventDefault();
    const rect=cv.getBoundingClientRect();
    s.pointerX=(ev.touches[0].clientX-rect.left)*(W/rect.width);
    if(!s.gameOver&&!s.won) megaShoot();
  };
  initMegaBg(W,H);
  sfxMegaBossRoar();
  if(megaRAF) cancelAnimationFrame(megaRAF);
  megaRAF=requestAnimationFrame(megaLoop);
}

function megaShoot(){
  const s=megaState;
  if(s.shootCooldown>0) return;
  s.bullets.push({x:s.ship.x,y:s.ship.y-20,speed:10});
  s.shootCooldown=10;
  sfxMegaShoot();
}

function megaLoop(){
  if(!megaMode){ megaRAF=null; return; }
  const s=megaState;
  const cv=MGC(), ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  const W=s.W, H=s.H;
  const boss=s.boss;
  if(!s.gameOver&&!s.won){
    const newPhase=boss.hp>300?1:boss.hp>150?2:3;
    if(newPhase!==boss.phase){
      boss.phase=newPhase;
      sfxMegaPhaseChange();
      s.phaseFlash=90;
    }
    // rồng bay nhanh dần theo phase — phase 3 lao qua lại dữ dội
    boss.x+=boss.speed*(1+(boss.phase-1)*0.55)*boss.dir;
    if(boss.x>W-60||boss.x<60) boss.dir*=-1;
    const baseInterval=boss.phase===1?65:boss.phase===2?48:30;
    boss.shootTimer--;
    if(boss.shootTimer<=0){
      boss.shootTimer=baseInterval;
      const angles=boss.phase===1?[-0.2,0,0.2]:boss.phase===2?[-0.35,-0.17,0,0.17,0.35]:[-0.5,-0.33,-0.17,0,0.17,0.33,0.5];
      for(const ang of angles){
        s.bossShots.push({x:boss.x,y:boss.y+40,vx:Math.sin(ang)*3,vy:4.5+boss.phase*1.3});
      }
    }
    if(boss.phase>=2){
      boss.homingTimer--;
      if(boss.homingTimer<=0){
        boss.homingTimer=90;
        s.homingMissiles.push({x:boss.x,y:boss.y+40,vx:0,vy:2,hp:3});
      }
    }
    if(boss.phase===3){
      boss.laserTimer--;
      if(boss.laserTimer<=0&&!boss.laserActive){
        boss.laserTimer=150;
        boss.laserActive=true;
        boss.laserSweep=0;
        boss.laserAngle=-0.8;
        sfxMegaLaser();
      }
      if(boss.laserActive){
        boss.laserSweep++;
        boss.laserAngle+=0.03;
        if(boss.laserSweep>60) boss.laserActive=false;
      }
    }
    if(s.shootCooldown>0) s.shootCooldown--;
    for(let i=s.bullets.length-1;i>=0;i--){
      s.bullets[i].y-=s.bullets[i].speed;
      if(s.bullets[i].y<-10) s.bullets.splice(i,1);
    }
    for(let i=s.bossShots.length-1;i>=0;i--){
      const b=s.bossShots[i];
      b.x+=b.vx; b.y+=b.vy;
      if(b.y>H+10||b.x<-10||b.x>W+10) s.bossShots.splice(i,1);
    }
    for(let i=s.homingMissiles.length-1;i>=0;i--){
      const m=s.homingMissiles[i];
      const dx=s.ship.x-m.x, dy=s.ship.y-m.y;
      const dist=Math.hypot(dx,dy);
      if(dist>1){ m.vx+=dx/dist*0.1; m.vy+=dy/dist*0.1; }
      const spd=Math.hypot(m.vx,m.vy);
      if(spd>3.4){ m.vx=m.vx/spd*3.4; m.vy=m.vy/spd*3.4; }
      m.x+=m.vx; m.y+=m.vy;
      if(m.y>H+10) s.homingMissiles.splice(i,1);
    }
    for(let i=s.bullets.length-1;i>=0;i--){
      const b=s.bullets[i];
      if(Math.abs(b.x-boss.x)<55&&Math.abs(b.y-boss.y)<50){
        s.bullets.splice(i,1);
        boss.hp--;
        boss.flashTimer=6;
        s.score+=1; // 1 điểm/lần trúng đòn
        if(boss.hp<=0){
          s.won=true; megaWon=true;
          sfxMazeSolve();
        }
      }
    }
    if(s.invincible<=0){
      for(let i=s.bossShots.length-1;i>=0;i--){
        const b=s.bossShots[i];
        if(Math.abs(b.x-s.ship.x)<22&&Math.abs(b.y-s.ship.y)<20){
          s.bossShots.splice(i,1);
          s.lives--; s.invincible=90;
          sfxSpaceDogHit();
          if(s.lives<=0) s.gameOver=true;
          break;
        }
      }
      for(let i=s.homingMissiles.length-1;i>=0;i--){
        const m=s.homingMissiles[i];
        if(Math.abs(m.x-s.ship.x)<24&&Math.abs(m.y-s.ship.y)<22){
          s.homingMissiles.splice(i,1);
          s.lives--; s.invincible=90;
          sfxSpaceDogHit();
          if(s.lives<=0) s.gameOver=true;
          break;
        }
      }
      if(boss.laserActive){
        const lx=boss.x+Math.sin(boss.laserAngle)*400;
        const ly=boss.y+Math.cos(boss.laserAngle)*400;
        const t=((s.ship.x-boss.x)*(lx-boss.x)+(s.ship.y-boss.y)*(ly-boss.y))/((lx-boss.x)**2+(ly-boss.y)**2);
        const ct=Math.max(0,Math.min(1,t));
        const px=boss.x+ct*(lx-boss.x), py=boss.y+ct*(ly-boss.y);
        if(Math.hypot(s.ship.x-px,s.ship.y-py)<18){
          s.lives--; s.invincible=90;
          sfxSpaceDogHit();
          if(s.lives<=0) s.gameOver=true;
        }
      }
    } else { s.invincible--; }
    s.ship.x+=(s.pointerX-s.ship.x)*0.15;
    s.ship.x=Math.max(20,Math.min(W-20,s.ship.x));
    if(boss.flashTimer>0) boss.flashTimer--;
    if(s.phaseFlash>0) s.phaseFlash--;
  }
  updateMegaBg(1/60,W,H);
  drawMegaBg(ctx,W,H,performance.now());
  if(s.phaseFlash>0){
    ctx.fillStyle=`rgba(255,0,100,${s.phaseFlash/90*0.3})`;
    ctx.fillRect(0,0,W,H);
  }
  const hpRatio=boss.hp/boss.maxHp;
  const hpCol=hpRatio>0.6?'#ff4444':hpRatio>0.3?'#ff8800':'#ff00ff';
  drawHudTop(ctx,W,{left:'❤️'.repeat(Math.max(0,s.lives)), center:'👹 '+boss.hp+'/'+boss.maxHp, right:'⭐ '+s.score, progress:hpRatio, progressColor:hpCol});
  // rồng với hào quang màu theo phase, bồng bềnh nhẹ
  const phaseGlow=boss.phase===3?'rgba(255,0,255,0.8)':boss.phase===2?'rgba(255,140,0,0.75)':'rgba(255,70,70,0.65)';
  const bobY=boss.y+Math.sin(performance.now()*0.004)*4;
  ctx.save();
  ctx.shadowColor=phaseGlow; ctx.shadowBlur=boss.flashTimer>0?34:22;
  ctx.font=boss.flashTimer>0?'72px serif':'64px serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText('🐉',boss.x,bobY);
  ctx.restore();
  ctx.save();
  ctx.font='bold 11px monospace';
  ctx.fillStyle=boss.phase===3?'#ff66ff':boss.phase===2?'#ffaa44':'#ff7777';
  ctx.shadowColor='rgba(0,0,0,0.7)'; ctx.shadowBlur=4;
  ctx.fillText('PHASE '+boss.phase,boss.x,bobY+52);
  ctx.restore();
  if(boss.laserActive){
    ctx.save();
    ctx.translate(boss.x,boss.y+20);
    const lx2=Math.sin(boss.laserAngle)*500, ly2=Math.cos(boss.laserAngle)*500;
    // quầng ngoài → tia đỏ → lõi trắng nóng
    ctx.lineCap='round';
    ctx.strokeStyle='rgba(255,80,120,0.25)'; ctx.lineWidth=24;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(lx2,ly2); ctx.stroke();
    ctx.strokeStyle='rgba(255,30,60,0.85)'; ctx.lineWidth=9;
    ctx.shadowColor='rgba(255,40,80,0.9)'; ctx.shadowBlur=16;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(lx2,ly2); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(lx2,ly2); ctx.stroke();
    ctx.restore();
  }
  // cầu lửa gradient rực rỡ
  for(const b of s.bossShots){
    const fg=ctx.createRadialGradient(b.x-1.5,b.y-1.5,0.5,b.x,b.y,6.5);
    fg.addColorStop(0,'#fff3a0'); fg.addColorStop(0.5,'#ff9933'); fg.addColorStop(1,'#e83a10');
    ctx.fillStyle=fg;
    ctx.beginPath(); ctx.arc(b.x,b.y,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,140,40,0.3)';
    ctx.beginPath(); ctx.arc(b.x-b.vx*1.6,b.y-b.vy*1.6,4,0,Math.PI*2); ctx.fill(); // vệt đuôi
  }
  // tên lửa truy đuổi: vòng cảnh báo đỏ nhấp nháy + vệt khói
  ctx.font='18px serif';
  ctx.textBaseline='middle';
  for(const m of s.homingMissiles){
    ctx.fillStyle='rgba(200,200,220,0.35)';
    ctx.beginPath(); ctx.arc(m.x-m.vx*3,m.y-m.vy*3,3,0,Math.PI*2); ctx.fill();
    const warn=0.4+0.4*Math.sin(performance.now()*0.02);
    ctx.strokeStyle=`rgba(255,60,60,${warn})`; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(m.x,m.y,13,0,Math.PI*2); ctx.stroke();
    ctx.fillText('🎯',m.x,m.y);
  }
  // đạn phi thuyền có glow
  ctx.save();
  ctx.fillStyle='#8ffcff';
  ctx.shadowColor='#00e5ff'; ctx.shadowBlur=8;
  for(const b of s.bullets){
    ctx.fillRect(b.x-2,b.y-10,4,16);
  }
  ctx.restore();
  if(s.invincible<=0||Math.floor(s.invincible/5)%2===0){
    // lửa động cơ phập phồng dưới phi thuyền
    const fl=6+Math.sin(performance.now()*0.03)*3;
    const eg=ctx.createRadialGradient(s.ship.x,s.ship.y+22,1,s.ship.x,s.ship.y+22,fl+6);
    eg.addColorStop(0,'rgba(255,240,150,0.9)'); eg.addColorStop(0.6,'rgba(255,140,40,0.55)'); eg.addColorStop(1,'rgba(255,80,0,0)');
    ctx.fillStyle=eg;
    ctx.beginPath(); ctx.ellipse(s.ship.x,s.ship.y+22,5,fl+5,0,0,Math.PI*2); ctx.fill();
    ctx.font='36px serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('🚀',s.ship.x,s.ship.y);
  }
  if(s.won){
    ctx.fillStyle='rgba(0,0,0,0.85)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffd700';
    ctx.font='bold 18px monospace';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('👑 RỒNG ĐÃ THẤT BẠI!',W/2,H/2-40);
    ctx.fillStyle='#ffffff';
    ctx.font='14px monospace';
    ctx.fillText('Điểm: '+s.score,W/2,H/2);
    ctx.fillStyle='#ffd700';
    ctx.font='bold 13px monospace';
    ctx.fillText('CHROMABLAST HUYỀN THOẠI!',W/2,H/2+32);
    ctx.fillText('20 BẢN ĐỒ HOÀN THÀNH! 👑',W/2,H/2+52);
    setTimeout(()=>exitMegaToMain(),5000);
    s.won=false; s.gameOver=true;
  } else if(s.gameOver){
    if(!s._forfeited){
      s._forfeited=true;
      // Boss CUỐI (Rồng Huyền Thoại) — thua thì KHÔNG được coi là "đã qua vòng 20":
      // mở lại đúng cổng của map Rồng (không advance sang vòng kế) để bắt buộc
      // phải diệt được rồng mới đi tiếp. Vẫn giữ nguyên toàn bộ điểm đã kiếm.
      unlockGateStageIndex = 19; // vẫn là vòng Rồng (index cuối trong UNLOCK_STAGE_ORDER)
      unlockGateBaseline = score;
      unlockGateActive = true;
      consecutiveBursts = 0;
      if(typeof updateBurstCount==='function') updateBurstCount();
      if(typeof updateScoreUI==='function') updateScoreUI();
      setTimeout(()=>exitMegaToMain(), 300);
    }
  }
  megaRAF=requestAnimationFrame(megaLoop);
}

function exitMegaToMain(){
  setActiveHiddenMap(null);
  megaMode=false;
  startBgm('main');
  if(megaRAF){cancelAnimationFrame(megaRAF);megaRAF=null;}
  if(megaWon){
    markMapCleared('mega');
    if(megaState.score){ score+=megaState.score; if(score>best) best=score; updateScoreUI(); }
    // Thắng map ẩn CUỐI (vòng 20) → mở tiến trình "qua màn" cho các level 21+ (không có map ẩn).
    if(typeof advanceHiddenGate==='function') advanceHiddenGate(19);
  }
  MGC().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('hint-bar').textContent=(typeof t==='function'?t('hintDefault'):'');
  renderPieces(); checkGameOverA();
}
