// ═══════════════════════════════════════════════════════════════
// maps/map11.js — MAP ẨN 11: Bắt thú (Animal Catch)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const CATCH_TIME=50, CATCH_KPI=60;
const CATCH_GOOD=[
  {emoji:'🦫',pts:4,color:'#8B6914'},
  {emoji:'🐰',pts:2,color:'#ff9ac8'},
  {emoji:'🐢',pts:3,color:'#4a9a40'},
  {emoji:'🐶',pts:8,color:'#e8e8e8'},
  {emoji:'🐱',pts:5,color:'#ff9f40'},
];
const CATCH_BAD=[
  {emoji:'🦔',color:'#8B4513'},
  {emoji:'🐍',color:'#2d8a2d'},
];

let catchMode=false, catchRAF=null, catchLast=0, catchElapsed=0;
let catchAnimals=[], catchBasketX=180, catchLives=3, catchScore=0, catchStreak=0;
let catchFx=[], catchSpawnTimer=0;

const CATCV=()=>document.getElementById('catch-canvas');

function triggerCatchUnlock(){
  markMapCleared('boss');
  pendingUnlock='catch';
  document.getElementById('unlock-title').textContent='🧺 MAP ẨN 11 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    '🧺 <b>Bắt Thú Vui!</b><br><br>'+
    'Thú cưng đang rơi từ trên trời! Hứng rổ để bắt chúng!<br>'+
    '🦫(+20) 🐰(+10) 🐢(+15) 🐶(+40) 🐱(+25)<br>'+
    '⚠️ Tránh 🦔 và 🐍 — chúng sẽ lấy mạng bạn!<br>'+
    'Ghi <b>'+CATCH_KPI+' điểm</b> trong <b>'+CATCH_TIME+'s</b> để thắng!';
  document.getElementById('unlock-btn').textContent='🧺 BẮT THÔI!';
  showUnlockOverlay();
}

function enterCatchMode(){
  setActiveHiddenMap('catch');
  endDrag();
  sfxUnlock();
  startBgm('main');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Vuốt ngang để di rổ! Bắt thú tốt, tránh thú xấu!';
  CATCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🧺 MAP ẨN 11';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='🧺 Điểm: 0  ❤️×3';
  catchMode=true;
  initCatch();
  catchLast=performance.now();
  catchRAF=requestAnimationFrame(catchLoop);
}

function initCatch(){
  const cv=CATCV();
  catchAnimals=[]; catchFx=[]; catchScore=0; catchElapsed=0; catchStreak=0;
  catchLives=3; catchSpawnTimer=0;
  catchBasketX=180;
}

function spawnCatchAnimal(){
  const cv=CATCV();
  const isBad=Math.random()<0.25;
  const pool=isBad?CATCH_BAD:CATCH_GOOD;
  const tmpl=pool[Math.floor(Math.random()*pool.length)];
  const speedBonus=Math.min(catchElapsed/CATCH_TIME,1)*80;
  catchAnimals.push({
    x:40+Math.random()*(360-80),
    y:-30,
    vy:90+Math.random()*40+speedBonus,
    emoji:tmpl.emoji,
    pts:tmpl.pts||0,
    color:tmpl.color,
    isBad:isBad,
    rot:0,
    rotV:(Math.random()-0.5)*3
  });
}

function catchLoop(now){
  if(!catchMode){ catchRAF=null; return; }
  const dt=Math.min(0.08,Math.max(0,(now-(catchLast||now))/1000));
  catchLast=now;
  catchElapsed+=dt;

  const cv=CATCV(), W=360, H=460;
  const spawnInterval=Math.max(0.5,1.2-catchElapsed/CATCH_TIME*0.7);
  catchSpawnTimer+=dt;
  if(catchSpawnTimer>=spawnInterval){ catchSpawnTimer=0; spawnCatchAnimal(); }

  const basketY=H-50, basketW=80, basketH=30;

  catchAnimals.forEach(a=>{
    a.y+=a.vy*dt;
    a.rot+=a.rotV*dt;
  });

  // check basket collisions
  catchAnimals=catchAnimals.filter(a=>{
    if(a.y>=basketY-basketH/2 && a.y<=basketY+basketH && Math.abs(a.x-catchBasketX)<basketW/2+26){
      if(a.isBad){
        catchLives--;
        catchStreak=0;
        catchFx.push({x:a.x,y:basketY,t:0,type:'bad'});
        sfxPenalty();
        if(!sfxMuted) sfxDogStung();
      } else {
        catchStreak++;
        // liên tiếp bắt trúng 3 lần → x2, 6 lần → x3
        const pts=a.pts*comboScoreMultiplier(catchStreak);
        catchScore+=pts; score+=pts;
        if(best<score) best=score;
        updateScoreUI();
        catchFx.push({x:a.x,y:basketY,t:0,type:'good',pts});
        if(!sfxMuted) sfxCatchGood();
      }
      return false;
    }
    if(a.y>H+30){ catchStreak=0; if(!sfxMuted) sfxCatchMiss(); return false; }
    return true;
  });

  catchFx.forEach(f=>f.t+=dt);
  catchFx=catchFx.filter(f=>f.t<0.7);

  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  drawCatch(ctx,W,H,basketY,basketW,basketH);

  const timeLeft=Math.max(0,CATCH_TIME-catchElapsed);
  document.getElementById('burst-count').textContent='🧺 Điểm: '+catchScore+'  ❤️×'+catchLives+'  ⏱'+Math.ceil(timeLeft)+'s';

  if(catchLives<=0){ catchDone(catchScore>=CATCH_KPI); return; }
  if(timeLeft<=0){ catchDone(catchScore>=CATCH_KPI); return; }
  catchRAF=requestAnimationFrame(catchLoop);
}

function drawCatch(ctx,W,H,basketY,basketW,basketH){
  ctx.clearRect(0,0,W,H);
  // Sân vườn Map 4 đầy đủ
  scenicDayFull(ctx,W,H,Date.now()*0.001,{hillY:H*0.7,fence:false,stripY:H-18,butterflies:true});
  // Animals
  catchAnimals.forEach(a=>{
    ctx.save();
    ctx.translate(a.x,a.y);
    const boxSize=52;
    const drew=drawCuteAnimal(ctx,a.emoji,-boxSize/2,-boxSize/2,boxSize,boxSize,Date.now()*0.001);
    if(!drew){
      // Icon con vật giữ nguyên hướng, không còn vòng tròn nền che phía sau
      ctx.font='40px Nunito,system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.shadowColor=a.isBad?'rgba(220,50,50,0.55)':'rgba(0,0,0,0.4)';
      ctx.shadowBlur=a.isBad?8:5; ctx.shadowOffsetY=1;
      ctx.fillText(a.emoji,0,0);
      ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    }
    ctx.restore();
  });
  // Basket
  ctx.fillStyle='#8B4513';
  const bx=catchBasketX-basketW/2, by=basketY-basketH/2;
  ctx.beginPath();
  ctx.roundRect(bx,by,basketW,basketH,8);
  ctx.fill();
  ctx.fillStyle='#a0522d';
  ctx.beginPath(); ctx.roundRect(bx+4,by+4,basketW-8,6,4); ctx.fill();
  // FX
  catchFx.forEach(f=>{
    const prog=f.t/0.7;
    ctx.globalAlpha=Math.max(0,1-prog);
    if(f.type==='good'){
      ctx.font='bold 18px Nunito,system-ui'; ctx.textAlign='center';
      ctx.fillStyle='#ffdd00';
      ctx.fillText('+'+f.pts, f.x, basketY-30-prog*40);
      ctx.font='16px Nunito,system-ui';
      ['⭐','⭐','⭐'].forEach((_,i)=>{
        const ang=f.t*6+i*2.1;
        ctx.fillText('⭐',f.x+Math.cos(ang)*20*prog*2,basketY+Math.sin(ang)*15*prog*2);
      });
    } else {
      ctx.font='bold 20px Nunito,system-ui'; ctx.textAlign='center';
      ctx.fillStyle='#ff4444';
      ctx.fillText('💥', f.x, basketY-prog*35);
    }
    ctx.globalAlpha=1;
  });
  drawHudTop(ctx,W,{left:'🧺 '+catchScore+'/'+CATCH_KPI, right:'❤️'.repeat(Math.max(0,catchLives))});
}

function catchDone(won){
  if(catchRAF){ cancelAnimationFrame(catchRAF); catchRAF=null; }
  catchMode=false;
  if(won){
    sfxWaveWin();
    showComboFlash(0,false,'🧺 Bắt thú thành công! +'+catchScore+' điểm!');
    setTimeout(()=>startUnlockGate(10), 500);
  } else {
    forfeitHiddenMapScore();
  }
  setTimeout(exitCatchToMain, 600);
}

function exitCatchToMain(){
  setActiveHiddenMap(null);
  catchMode=false;
  startBgm('main');
  if(catchRAF){ cancelAnimationFrame(catchRAF); catchRAF=null; }
  CATCV().classList.remove('active');
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

CATCV().addEventListener('pointermove', e=>{
  if(!catchMode) return;
  e.preventDefault();
  const rect=CATCV().getBoundingClientRect();
  const scaleX=360/rect.width;
  catchBasketX=Math.max(40,Math.min(320,(e.clientX-rect.left)*scaleX));
});
CATCV().addEventListener('pointerdown', e=>{
  if(!catchMode) return;
  e.preventDefault();
  const rect=CATCV().getBoundingClientRect();
  const scaleX=360/rect.width;
  catchBasketX=Math.max(40,Math.min(320,(e.clientX-rect.left)*scaleX));
});
