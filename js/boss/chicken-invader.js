// ═══════════════════════════════════════════════════════════════
// boss/chicken-invader.js — BOSS Map ẩn 10 (Phi cơ bắn gà / Chicken Invaders)
// Tách khỏi main.js, nạp TRƯỚC main.js (dùng chung global scope).
// ═══════════════════════════════════════════════════════════════

/* ══════════════════════════════════════════
   MAP ẨN 10 — BOSS BATTLE
══════════════════════════════════════════ */
const BOSS_TIME=90, BOSS_TOTAL_WAVES=3;

let bossMode=false, bossRAF=null, bossLast=0, bossElapsed=0;
let bossDogX=180, bossDogLives=3;
let bossChickens=[], bossProjectiles=[], bossVenom=[];
let bossFx=[], bossScore=0, bossFireTimer=0, bossVenomTimer=0;
let bossWave=0, bossWaveCleared=true;

const BOSCV=()=>document.getElementById('boss-canvas');

function triggerBossUnlock(){
  markMapCleared('stack');
  pendingUnlock='boss';
  document.getElementById('unlock-title').textContent='🐔 MAP ẨN 10 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    '🚀 <b>Phi Cơ Bắn Gà!</b><br><br>'+
    'Điều khiển phi cơ bắn hạ đàn gà xâm lăng!<br>'+
    'Kéo ngón tay để lái — phi cơ tự động bắn liên tục!<br>'+
    'Né trứng gà rơi xuống — bạn có <b>3 mạng ❤️</b>!<br>'+
    'Tiêu diệt hết <b>'+BOSS_TOTAL_WAVES+' đợt gà</b> trước <b>'+BOSS_TIME+'s</b> để chiến thắng!';
  document.getElementById('unlock-btn').textContent='🐔 CHIẾN ĐẤU!';
  showUnlockOverlay();
}

function enterBossMode(){
  setActiveHiddenMap('boss');
  endDrag();
  sfxUnlock();
  startBgm('action');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Kéo ngón tay để lái phi cơ! Tự động bắn — né trứng gà rơi!';
  BOSCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🐔 MAP ẨN 10';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='🐔 Đợt 0/'+BOSS_TOTAL_WAVES;
  bossMode=true;
  initBoss();
  bossLast=performance.now();
  bossRAF=requestAnimationFrame(bossLoop);
}

function spawnChickenWave(){
  bossWave++;
  bossWaveCleared=false;
  bossChickens=[];
  const cols=6, rows=2+(bossWave>1?1:0);
  const speed=18+bossWave*10;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      bossChickens.push({x:35+c*50, y:45+r*44, dir:1, speed, emoji: Math.random()<0.15?'🐓':'🐔'});
    }
  }
}

function initBoss(){
  const cv=BOSCV();
  bossDogX=180; bossDogLives=3;
  bossChickens=[]; bossProjectiles=[]; bossVenom=[]; bossFx=[];
  bossScore=0; bossElapsed=0; bossFireTimer=0; bossVenomTimer=0;
  bossWave=0; bossWaveCleared=true;
}

function bossLoop(now){
  if(!bossMode){ bossRAF=null; return; }
  const dt=Math.min(0.08,Math.max(0,(now-(bossLast||now))/1000));
  bossLast=now;
  bossElapsed+=dt;

  const cv=BOSCV(), W=360, H=460;

  if(bossWaveCleared && bossWave<BOSS_TOTAL_WAVES){
    spawnChickenWave();
  }

  // player plane auto-fires
  bossFireTimer+=dt;
  if(bossFireTimer>=0.3){
    bossFireTimer=0;
    bossProjectiles.push({x:bossDogX, y:H-60, vy:-320});
    if(!sfxMuted) sfxBossShoot();
  }
  bossProjectiles.forEach(p=>p.y+=p.vy*dt);
  bossProjectiles=bossProjectiles.filter(p=>p.y>0);

  // chickens move side to side, descend on wall bounce
  let hitWall=false;
  for(const c of bossChickens){
    c.x+=c.dir*c.speed*dt;
    if(c.x>W-25||c.x<25) hitWall=true;
  }
  if(hitWall){ for(const c of bossChickens){ c.dir*=-1; c.y+=16; } }

  // chickens drop eggs
  const eggInterval=Math.max(0.5, 1.4-bossWave*0.2);
  bossVenomTimer+=dt;
  if(bossVenomTimer>=eggInterval && bossChickens.length>0){
    bossVenomTimer=0;
    const c=bossChickens[Math.floor(Math.random()*bossChickens.length)];
    bossVenom.push({x:c.x, y:c.y+14, vy:110+bossWave*15});
    if(!sfxMuted) sfxVenomFire();
  }
  bossVenom.forEach(v=>v.y+=v.vy*dt);
  bossVenom=bossVenom.filter(v=>v.y<H);

  // bullet vs chicken collision
  bulletLoop:
  for(let bi=bossProjectiles.length-1;bi>=0;bi--){
    const p=bossProjectiles[bi];
    for(let ci=bossChickens.length-1;ci>=0;ci--){
      const c=bossChickens[ci];
      if(Math.abs(p.x-c.x)<20 && Math.abs(p.y-c.y)<20){
        bossProjectiles.splice(bi,1);
        bossChickens.splice(ci,1);
        bossScore+=1; score+=1; // 1 điểm/con gà bị bắn hạ
        if(best<score) best=score;
        updateScoreUI();
        bossFx.push({x:c.x,y:c.y,t:0,type:'hit'});
        if(!sfxMuted) sfxBossHit();
        continue bulletLoop;
      }
    }
  }

  if(bossChickens.length===0 && !bossWaveCleared){
    bossWaveCleared=true;
  }

  // egg hits plane
  bossVenom=bossVenom.filter(v=>{
    if(v.y>H-70 && Math.abs(v.x-bossDogX)<28){
      bossDogLives--;
      bossFx.push({x:bossDogX,y:H-60,t:0,type:'dmg'});
      sfxDogStung();
      return false;
    }
    return true;
  });

  // chicken reaches bottom → hits plane
  for(let ci=bossChickens.length-1;ci>=0;ci--){
    if(bossChickens[ci].y>H-90){
      bossDogLives--;
      bossFx.push({x:bossDogX,y:H-60,t:0,type:'dmg'});
      sfxDogStung();
      bossChickens.splice(ci,1);
      break;
    }
  }

  // update fx
  bossFx.forEach(f=>f.t+=dt);
  bossFx=bossFx.filter(f=>f.t<0.5);

  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  drawBoss(ctx,W,H);

  const timeLeft=Math.max(0,BOSS_TIME-bossElapsed);
  document.getElementById('burst-count').textContent='🐔 Đợt '+Math.min(bossWave,BOSS_TOTAL_WAVES)+'/'+BOSS_TOTAL_WAVES+'  ❤️×'+Math.max(0,bossDogLives);

  // win/lose conditions
  if(bossWave>=BOSS_TOTAL_WAVES && bossWaveCleared){
    bossDone(true); return;
  }
  if(bossDogLives<=0){
    bossDone(false); return;
  }
  if(timeLeft<=0){
    bossDone(false); return;
  }
  bossRAF=requestAnimationFrame(bossLoop);
}

function drawBoss(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  // sân vườn nông trại Map 4
  scenicDayFull(ctx,W,H,bossElapsed,{hillY:H*0.82,fenceY:H*0.96,stripY:H-8,butterflies:false});

  const timePct=Math.max(0,1-bossElapsed/BOSS_TIME);
  drawHudTop(ctx,W,{left:'🐔 ĐỢT '+Math.min(bossWave,BOSS_TOTAL_WAVES)+'/'+BOSS_TOTAL_WAVES, center:'⭐ '+bossScore, right:'❤️'.repeat(Math.max(0,bossDogLives)), progress:timePct, progressColor:'#ffd700'});

  // chickens
  ctx.font='30px system-ui';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  bossChickens.forEach(c=>{ ctx.fillText(c.emoji, c.x, c.y); });

  // bullets
  bossProjectiles.forEach(p=>{
    ctx.shadowColor='#ff9500'; ctx.shadowBlur=8;
    ctx.fillStyle='#ff7b2e'; // cam đậm — nổi rõ trên nền trời pastel sáng
    ctx.fillRect(p.x-2,p.y-8,4,14);
    ctx.shadowBlur=0;
  });

  // falling eggs
  ctx.font='18px system-ui';
  bossVenom.forEach(v=>{ ctx.fillText('🥚', v.x, v.y); });

  // player plane at bottom
  ctx.font='42px system-ui';
  ctx.fillText('🛩️', bossDogX, H-40);


  // fx
  bossFx.forEach(f=>{
    const prog=f.t/0.5;
    ctx.globalAlpha=Math.max(0,1-prog);
    if(f.type==='hit'){
      ctx.strokeStyle='#ffdd00'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(f.x,f.y,18*(1+prog),0,Math.PI*2); ctx.stroke();
    } else if(f.type==='dmg'){
      ctx.fillStyle='#ff4444';
      ctx.font='bold 22px system-ui';
      ctx.textAlign='center';
      ctx.fillText('💥', f.x, f.y-prog*28);
    }
    ctx.globalAlpha=1;
  });
}

function bossDone(won){
  if(bossRAF){ cancelAnimationFrame(bossRAF); bossRAF=null; }
  bossMode=false;
  if(won){
    sfxWaveWin();
    showComboFlash(0,false,'🏆 Tiêu diệt hết đàn gà!');
    setTimeout(()=>startUnlockGate(9), 500);
  } else {
    forfeitHiddenMapScore();
  }
  setTimeout(exitBossToMain, 600);
}

function exitBossToMain(){
  setActiveHiddenMap(null);
  bossMode=false;
  startBgm('main');
  if(bossRAF){ cancelAnimationFrame(bossRAF); bossRAF=null; }
  BOSCV().classList.remove('active');
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

function bossHandlePointer(e){
  if(!bossMode) return;
  e.preventDefault();
  const rect=BOSCV().getBoundingClientRect();
  const scaleX=360/rect.width;
  const tx=(e.clientX-rect.left)*scaleX;
  bossDogX=Math.max(30,Math.min(330,tx));
}
BOSCV().addEventListener('pointerdown', bossHandlePointer);
BOSCV().addEventListener('pointermove', bossHandlePointer);
