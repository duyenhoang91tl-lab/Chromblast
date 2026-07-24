// ═══════════════════════════════════════════════════════════════
// maps/map04.js — MAP ẨN 4: Bảo vệ chó khỏi ong (Bee)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

/* ══════════════════════════════════════════
   MAP ẨN 4 — CHÓ TRỐN ONG (VƯỜN HOA)
   Chó Samoyed tự động né ong, chạm màn hình để chỉ đường chạy giúp chó.
   Chạm vào ong để đập bay chúng — ghi điểm + chuỗi combo!
   Ong chạm chó → mất 1 tim. Hết tim → thua, về map thường.
══════════════════════════════════════════ */
let beeMode=false, beeRAF=null, beeLast=0, beeElapsed=0;
let bees=[], beeParticles=[], butterflies=[], gardenFlowers=[];
let gdHearts=3, gdMaxHearts=3, gdWave=1, gdWaveTimer=0, gdWaveDuration=13, gdSpawnTimer=0;
const GD_MAX_WAVE=10;
let beeCombo=0, beeComboTimer=0;
let gdShakeX=0, gdShakeY=0, gdShakeDur=0, gdDogHit=0, gdGameTime=0;
let gdPointerDown=false;
let dog=null;
const BCV = () => document.getElementById('bee-canvas');

function triggerBeeUnlock(){
  markMapCleared('fruit');
  pendingUnlock='bee';
  if(typeof showSagaUnlock==='function' && showSagaUnlock('bee')) return;
  document.getElementById('unlock-title').textContent='🐝 MAP ẨN 4 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    'Bạn đã ghi thêm <b>'+TEST_UNLOCK_SCORE+' điểm</b> ở map thường!<br><br>'+
    '🐕🌸🐝 <b>Chó Trốn Ong — Vườn Hoa!</b><br>'+
    'Chó Samoyed sẽ tự né ong, nhưng hãy chạm màn hình để <b>chỉ đường chạy</b> giúp chó.<br>'+
    'Chạm vào ong để <b>đập bay</b> chúng, ghi điểm combo!<br>'+
    'Ong chọc chó quá nhiều lần → <b>thua, về map thường</b>.';
  document.getElementById('unlock-btn').textContent='🐕 CHƠI NGAY!';
  showUnlockOverlay();
}

function enterBeeMode(){
  setActiveHiddenMap('bee');
  endDrag();
  sfxUnlock();
  startBgm('action');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Chạm màn hình để chỉ đường · Chạm ong để đập bay!';
  BCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🐝 MAP ẨN 4';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').style.display='none';
  document.getElementById('bee-hearts').style.display='flex';
  document.getElementById('bee-scoreUI').style.display='';
  document.getElementById('bee-waveUI').style.display='';
  document.getElementById('bee-stamina-label').style.display='';
  document.getElementById('bee-stamina-wrap').style.display='';

  beeMode=true;
  initBee();
  beeLast=performance.now();
  beeRAF=requestAnimationFrame(beeLoop);
}

function initBeeFlowers(W,H){
  gardenFlowers=[];
  const types=['tulip','daisy','rose','sunflower','tulip','daisy','daisy'];
  const colors=['#FF6B8A','#FF4466','#FFD700','#FF69B4','#FF8C42','#DA70D6','#FF6347','#E040FB','#FFAB40'];
  for(let i=0;i<35;i++){
    gardenFlowers.push({
      x: 10+Math.random()*(W-20),
      y: H*0.48+Math.random()*(H*0.42),
      type: types[Math.floor(Math.random()*types.length)],
      size: 6+Math.random()*10,
      color: colors[Math.floor(Math.random()*colors.length)],
      phase: Math.random()*Math.PI*2,
      speed: 0.6+Math.random()*1.2,
      stemH: 15+Math.random()*20,
    });
  }
  gardenFlowers.sort((a,b)=>a.y-b.y);
}

function initBeeButterflies(W,H){
  butterflies=[];
  const bColors=['#FF8A65','#CE93D8','#81D4FA','#FFD54F','#A5D6A7'];
  for(let i=0;i<5;i++){
    butterflies.push({
      x: Math.random()*W, y: H*0.15+Math.random()*H*0.35,
      vx: (Math.random()-0.5)*30, vy: (Math.random()-0.5)*20,
      color: bColors[i%bColors.length],
      phase: Math.random()*Math.PI*2, size: 4+Math.random()*4,
    });
  }
}

function initBee(){
  const cv=BCV(), W=360, H=460;
  dog={
    x: W/2, y: H*0.75, vx:0, vy:0,
    targetX:null, targetY:null,
    speed:130, stamina:100, maxStamina:100,
    staminaDrain:25, staminaRegen:12,
    facing:1, panicLevel:0, runFrame:0,
  };
  bees=[]; beeParticles=[];
  beeElapsed=0; gdSpawnTimer=0;
  gdHearts=gdMaxHearts; gdWave=1; gdWaveTimer=0;
  beeCombo=0; beeComboTimer=0;
  gdShakeX=0; gdShakeY=0; gdShakeDur=0; gdDogHit=0; gdGameTime=0;
  gdPointerDown=false;
  initBeeFlowers(W,H); initBeeButterflies(W,H);
  updateBeeHUD();
  document.getElementById('bee-staminaFill').style.width='100%';
}

function updateBeeHUD(){
  document.getElementById('bee-scoreUI').textContent=Math.round(score).toLocaleString();
  document.getElementById('bee-waveUI').textContent='Đợt '+gdWave;
  const el=document.getElementById('bee-hearts'); el.innerHTML='';
  for(let i=0;i<gdMaxHearts;i++){
    const span=document.createElement('span');
    span.textContent = i<gdHearts ? '❤️' : '🖤';
    el.appendChild(span);
  }
}

function spawnBee(W,H){
  const side=Math.floor(Math.random()*4);
  let x,y;
  if(side===0){ x=-20; y=40+Math.random()*(H*0.5); }
  else if(side===1){ x=W+20; y=40+Math.random()*(H*0.5); }
  else if(side===2){ x=Math.random()*W; y=-20; }
  else { x=Math.random()*W; y=H+20; }
  const waveEff=Math.min(gdWave, GD_MAX_WAVE);
  const speed=35+waveEff*5+Math.random()*20;
  bees.push({
    x,y,speed, wobbleAmp:15+Math.random()*20,
    wobbleFreq:2+Math.random()*3,
    wobblePhase:Math.random()*Math.PI*2,
    wingPhase:Math.random()*Math.PI*2,
    size:10+Math.random()*4, alive:true, angle:0, trail:[],
  });
}

/* ── nền vườn hoa ── */
function beeDrawSky(ctx,W,H){
  const g=ctx.createLinearGradient(0,0,0,H*0.55);
  g.addColorStop(0,'#7EC8E3'); g.addColorStop(0.4,'#ADE0F2');
  g.addColorStop(0.8,'#D4F0FF'); g.addColorStop(1,'#E8F8E0');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H*0.58);
}
function beeDrawClouds(ctx,t,W){
  beeDrawCloud(ctx,110+Math.sin(t*0.08)*18,38,1.0);
  beeDrawCloud(ctx,260+Math.sin(t*0.06+1)*22,65,0.7);
  beeDrawCloud(ctx,185+Math.sin(t*0.1+3)*14,25,0.5);
}
function beeDrawHills(ctx,W,H){
  ctx.beginPath(); ctx.moveTo(-10,H*0.56);
  ctx.bezierCurveTo(W*0.15,H*0.42,W*0.35,H*0.48,W*0.5,H*0.53);
  ctx.bezierCurveTo(W*0.7,H*0.44,W*0.85,H*0.46,W+10,H*0.52);
  ctx.lineTo(W+10,H*0.6); ctx.lineTo(-10,H*0.6); ctx.closePath();
  ctx.fillStyle='#7EC882'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10,H*0.59);
  ctx.bezierCurveTo(W*0.2,H*0.52,W*0.45,H*0.55,W*0.65,H*0.53);
  ctx.bezierCurveTo(W*0.8,H*0.50,W*0.95,H*0.54,W+10,H*0.56);
  ctx.lineTo(W+10,H*0.65); ctx.lineTo(-10,H*0.65); ctx.closePath();
  ctx.fillStyle='#5EB862'; ctx.fill();
}
function beeDrawGrass(ctx,W,H){
  const g=ctx.createLinearGradient(0,H*0.56,0,H);
  g.addColorStop(0,'#4CAF50'); g.addColorStop(0.2,'#43A047');
  g.addColorStop(0.6,'#388E3C'); g.addColorStop(1,'#2E7D32');
  ctx.fillStyle=g; ctx.fillRect(0,H*0.56,W,H*0.44);
}
function beeDrawFence(ctx,W,H){
  const fy=H*0.93, posts=7, pw=6, ph=28, spacing=W/(posts+1);
  ctx.fillStyle='#A0784A'; ctx.fillRect(0,fy-18,W,4); ctx.fillRect(0,fy-6,W,4);
  for(let i=1;i<=posts;i++){
    const px=spacing*i-pw/2;
    ctx.fillStyle='#8B6539'; ctx.fillRect(px,fy-ph,pw,ph);
    ctx.beginPath(); ctx.moveTo(px,fy-ph); ctx.lineTo(px+pw/2,fy-ph-5); ctx.lineTo(px+pw,fy-ph); ctx.closePath();
    ctx.fillStyle='#7A5830'; ctx.fill();
  }
}

/* ── hoa ── */

function beeDrawButterfly(ctx,b,t){
  const wf=Math.sin(t*8+b.phase)*0.6;
  ctx.save(); ctx.translate(b.x,b.y); ctx.globalAlpha=0.7;
  ctx.save(); ctx.scale(Math.cos(wf),1);
  ctx.beginPath(); ctx.ellipse(-b.size*0.5,-b.size*0.2,b.size,b.size*0.7,-0.2,0,Math.PI*2);
  ctx.fillStyle=b.color; ctx.fill(); ctx.restore();
  ctx.save(); ctx.scale(-Math.cos(wf),1);
  ctx.beginPath(); ctx.ellipse(-b.size*0.5,-b.size*0.2,b.size,b.size*0.7,-0.2,0,Math.PI*2);
  ctx.fillStyle=b.color; ctx.fill(); ctx.restore();
  ctx.globalAlpha=1;
  ctx.beginPath(); ctx.ellipse(0,0,1.2,b.size*0.5,0,0,Math.PI*2);
  ctx.fillStyle='#333'; ctx.fill(); ctx.restore();
}

/* ── chó samoyed vẽ động ── */
/* drawDog: vẽ chó vector dùng chung cho mọi map. Truyền `d` = {x,y,vx,vy,facing,panicLevel,hit}
   để dùng ở map khác; bỏ trống thì dùng biến `dog` cục bộ của Map 4 (giữ nguyên hành vi cũ). */
function drawDog(ctx,t,d){
  const own=!d;
  const src=d||dog;
  const {x,y,vx=0,vy=0,facing=1,panicLevel=0} = src;
  const speed=Math.sqrt(vx*vx+vy*vy);
  const isRunning=src.running!==undefined?src.running:speed>10;
  const bob=isRunning?Math.sin(t*12)*3:Math.sin(t*2.2)*1.2;
  const blink=Math.sin(t*0.7)>0.93;
  const tailWag=Math.sin(t*(isRunning?12:5))*(isRunning?0.4:0.2);
  const legAnim=isRunning?Math.sin(t*14)*8:0;
  const lean=Math.max(-0.15,Math.min(0.15,vx*0.001));

  ctx.save();
  ctx.translate(x,y+bob);
  ctx.scale(facing,1);
  ctx.rotate(lean);

  ctx.beginPath(); ctx.ellipse(0,24,18*(isRunning?0.9:1),5,0,0,Math.PI*2);
  ctx.fillStyle='rgba(0,0,0,0.1)'; ctx.fill();

  const legPairs=[[-7,16],[7,16]];
  legPairs.forEach(([lx,ly],i)=>{
    const legOff=i===0?legAnim:-legAnim;
    ctx.beginPath();
    ctx.ellipse(lx+legOff*0.3,ly+2,4,5,legOff*0.03,0,Math.PI*2);
    ctx.fillStyle='#FFFAF5'; ctx.fill();
    ctx.beginPath();
    ctx.ellipse(lx+legOff*0.6,ly+7,4.5,3,legOff*0.04,0,Math.PI*2);
    ctx.fillStyle='#FFF0E5'; ctx.fill();
    for(let n=-1;n<=1;n++){
      ctx.beginPath(); ctx.arc(lx+legOff*0.6+n*2.5,ly+8.5,1.2,0,Math.PI*2);
      ctx.fillStyle='#F0D8C8'; ctx.fill();
    }
  });

  ctx.save(); ctx.translate(-13,-8); ctx.rotate(-0.6+tailWag);
  [[0,-6,6],[-4,-10,5],[4,-10,5],[-2,-14,4],[2,-14,4],[0,-16,3]].forEach(([tx,ty,tr])=>{
    ctx.beginPath(); ctx.arc(tx,ty,tr,0,Math.PI*2);
    ctx.fillStyle='#FFFAF5'; ctx.fill();
  });
  ctx.restore();

  [[0,0,14],[-7,-3,11],[7,-3,11],[-4,5,12],[4,5,12],[0,-7,10],[-9,1,9],[9,1,9],[0,8,10]].forEach(([bx,by,br])=>{
    ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2);
    ctx.fillStyle='#FFFAF5'; ctx.fill();
  });

  const headShake=panicLevel>0.5?Math.sin(t*20)*panicLevel*2:0;

  [[0,-18,12],[-6,-22,7],[6,-22,7],[0,-25,6],[-8,-16,6],[8,-16,6],[-10,-19,5],[10,-19,5]].forEach(([hx,hy,hr])=>{
    ctx.beginPath(); ctx.arc(hx+headShake,hy,hr,0,Math.PI*2);
    ctx.fillStyle='#FFFAF5'; ctx.fill();
  });

  ctx.beginPath(); ctx.ellipse(-10+headShake,-25,4.5,7,-0.25,0,Math.PI*2);
  ctx.fillStyle='#F5E0D0'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(-10+headShake,-24,3,5,-0.25,0,Math.PI*2);
  ctx.fillStyle='#FFB8B8'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(10+headShake,-25,4.5,7,0.25,0,Math.PI*2);
  ctx.fillStyle='#F5E0D0'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(10+headShake,-24,3,5,0.25,0,Math.PI*2);
  ctx.fillStyle='#FFB8B8'; ctx.fill();

  const eyeScale=1+panicLevel*0.3;
  if(!blink){
    [-4,4].forEach(ex=>{
      ctx.beginPath(); ctx.arc(ex+headShake,-19,3*eyeScale,0,Math.PI*2);
      ctx.fillStyle='#1A1008'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex+headShake+1,-20,1.4,0,Math.PI*2);
      ctx.fillStyle='#FFF'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex+headShake-1,-18,0.7,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fill();
    });
  } else {
    [-4,4].forEach(ex=>{
      ctx.beginPath(); ctx.arc(ex+headShake,-18.5,2.5,0.1,Math.PI-0.1);
      ctx.strokeStyle='#1A1008'; ctx.lineWidth=1.5; ctx.lineCap='round'; ctx.stroke();
    });
  }

  ctx.beginPath(); ctx.ellipse(headShake,-15,2.2,1.8,0,0,Math.PI*2);
  ctx.fillStyle='#1A1008'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(headShake-0.5,-15.8,0.8,0.5,-0.3,0,Math.PI*2);
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fill();

  if(panicLevel>0.3){
    ctx.beginPath(); ctx.ellipse(headShake,-10,3*panicLevel,4*panicLevel,0,0,Math.PI*2);
    ctx.fillStyle='#FF8FA0'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(headShake,-12,2*panicLevel,1,0,0,Math.PI*2);
    ctx.fillStyle='#FF6B8A'; ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(-1.5+headShake,-13.2);
    ctx.quadraticCurveTo(-2.5+headShake,-11,-1+headShake,-10.5);
    ctx.strokeStyle='#1A1008'; ctx.lineWidth=0.8; ctx.lineCap='round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1.5+headShake,-13.2);
    ctx.quadraticCurveTo(2.5+headShake,-11,1+headShake,-10.5);
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(headShake,-9.5,1.8,2.8,0.05,0,Math.PI*2);
    ctx.fillStyle='#FF8FA0'; ctx.fill();
  }

  const cheekAlpha=0.25+panicLevel*0.3;
  [-8,8].forEach(cx=>{
    ctx.beginPath(); ctx.ellipse(cx+headShake,-15,3,1.8,0,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,100,100,${cheekAlpha})`; ctx.fill();
  });

  if(panicLevel>0.6){
    ctx.font='bold 11px Nunito,sans-serif';
    ctx.textAlign='center';
    ctx.fillStyle=`rgba(255,60,60,${panicLevel})`;
    const sweatY=-32+Math.sin(t*6)*2;
    ctx.fillText('!',headShake,sweatY);
    ctx.fillText('!',headShake-6,sweatY+2);
  }

  if(own && gdDogHit>0){
    ctx.globalAlpha=gdDogHit;
    ctx.beginPath(); ctx.arc(0,-8,28,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,60,60,0.5)'; ctx.lineWidth=2; ctx.stroke();
    ctx.font='bold 12px Nunito,sans-serif'; ctx.fillStyle='#FF4444';
    ctx.textAlign='center'; ctx.fillText('Ối!',0,-38);
    ctx.globalAlpha=1;
  } else if(!own && src.hit>0){
    ctx.globalAlpha=src.hit;
    ctx.beginPath(); ctx.arc(0,-8,28,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,60,60,0.5)'; ctx.lineWidth=2; ctx.stroke();
    ctx.globalAlpha=1;
  }

  if(isRunning && (own?beeMode:src.dust)){
    for(let i=0;i<3;i++){
      const dx=-facing*(8+Math.random()*12);
      const dy=18+Math.random()*6;
      const dr=2+Math.random()*3;
      ctx.beginPath(); ctx.arc(dx,dy,dr,0,Math.PI*2);
      ctx.fillStyle=`rgba(180,160,130,${0.2+Math.random()*0.2})`; ctx.fill();
    }
  }

  ctx.restore();
}

/* ── ong vẽ động ── */
function drawBee(ctx,bee,t){
  const {x,y,size,wingPhase,angle} = bee;
  const wf=Math.sin(t*25+wingPhase)*0.5;
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
  ctx.save(); ctx.globalAlpha=0.45;
  ctx.save(); ctx.rotate(-0.4+wf);
  ctx.beginPath(); ctx.ellipse(-size*0.15,-size*0.6,size*0.35,size*0.6,-0.2,0,Math.PI*2);
  ctx.fillStyle='rgba(200,230,255,0.8)'; ctx.fill(); ctx.restore();
  ctx.save(); ctx.rotate(0.4-wf);
  ctx.beginPath(); ctx.ellipse(size*0.15,-size*0.6,size*0.35,size*0.6,0.2,0,Math.PI*2);
  ctx.fillStyle='rgba(200,230,255,0.8)'; ctx.fill(); ctx.restore();
  ctx.globalAlpha=1; ctx.restore();
  ctx.beginPath(); ctx.arc(0,-size*0.4,size*0.38,0,Math.PI*2); ctx.fillStyle='#FFD54F'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0,size*0.15,size*0.35,size*0.55,0,0,Math.PI*2); ctx.fillStyle='#FFD54F'; ctx.fill();
  for(let i=-1;i<=1;i++){
    ctx.beginPath(); ctx.ellipse(0,size*0.15+i*size*0.22,size*0.33,size*0.06,0,0,Math.PI*2);
    ctx.fillStyle='#333'; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(-size*0.14,-size*0.45,size*0.1,0,Math.PI*2); ctx.fillStyle='#1A1008'; ctx.fill();
  ctx.beginPath(); ctx.arc(-size*0.11,-size*0.48,size*0.04,0,Math.PI*2); ctx.fillStyle='#FFF'; ctx.fill();
  ctx.beginPath(); ctx.arc(size*0.14,-size*0.45,size*0.1,0,Math.PI*2); ctx.fillStyle='#1A1008'; ctx.fill();
  ctx.beginPath(); ctx.arc(size*0.17,-size*0.48,size*0.04,0,Math.PI*2); ctx.fillStyle='#FFF'; ctx.fill();
  ctx.beginPath(); ctx.arc(0,-size*0.32,size*0.08,0.1,Math.PI-0.1);
  ctx.strokeStyle='#1A1008'; ctx.lineWidth=0.8; ctx.lineCap='round'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-size*0.15,-size*0.55);
  ctx.quadraticCurveTo(-size*0.4,-size*0.8,-size*0.5,-size*0.7);
  ctx.moveTo(size*0.15,-size*0.55);
  ctx.quadraticCurveTo(size*0.4,-size*0.8,size*0.5,-size*0.7);
  ctx.strokeStyle='#333'; ctx.lineWidth=0.7; ctx.stroke();
  ctx.beginPath(); ctx.arc(-size*0.5,-size*0.7,1,0,Math.PI*2);
  ctx.arc(size*0.5,-size*0.7,1,0,Math.PI*2); ctx.fillStyle='#333'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,size*0.7); ctx.lineTo(-1.5,size*0.9); ctx.lineTo(1.5,size*0.9); ctx.closePath();
  ctx.fillStyle='#333'; ctx.fill();
  ctx.restore();
}

/* ── particles ── */
function beeDrawStar(ctx,cx,cy,outerR,innerR,points){
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const r=i%2===0?outerR:innerR;
    const a=(i/(points*2))*Math.PI*2-Math.PI/2;
    if(i===0) ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
    else ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
  }
  ctx.closePath();
}

/* ── cập nhật: chó tự né + người chơi điều khiển ── */
function beeDogBounds(W,H){
  return { minX:22, maxX:W-22, minY:H*0.38, maxY:H*0.88 };
}
const FLEE_RADIUS=90, PANIC_RADIUS=45;

function updateDog(dt,W,H){
  const bnd=beeDogBounds(W,H);
  let ax=0, ay=0, fleeing=false;

  let nearestDist=Infinity, nearestBee=null;
  bees.forEach(b=>{
    if(!b.alive) return;
    const d=Math.sqrt((b.x-dog.x)**2+(b.y-dog.y)**2);
    if(d<nearestDist){ nearestDist=d; nearestBee=b; }
  });

  if(nearestBee && nearestDist<FLEE_RADIUS){
    fleeing=true;
    const dx=dog.x-nearestBee.x, dy=dog.y-nearestBee.y;
    const dist=Math.max(1,nearestDist);
    const strength=1-(dist/FLEE_RADIUS);
    const fleeForce=200+strength*250;
    ax+=(dx/dist)*fleeForce; ay+=(dy/dist)*fleeForce;
    dog.panicLevel=Math.min(1,Math.max(0,1-(dist-PANIC_RADIUS)/(FLEE_RADIUS-PANIC_RADIUS)));
  } else {
    dog.panicLevel=Math.max(0,dog.panicLevel-dt*3);
  }

  if(dog.targetX!==null && dog.stamina>0){
    const tdx=dog.targetX-dog.x, tdy=dog.targetY-dog.y;
    const tdist=Math.sqrt(tdx*tdx+tdy*tdy);
    if(tdist>5){
      ax+=(tdx/tdist)*280; ay+=(tdy/tdist)*280;
      dog.stamina=Math.max(0,dog.stamina-dog.staminaDrain*dt);
    } else {
      dog.targetX=null; dog.targetY=null;
    }
  } else {
    dog.stamina=Math.min(dog.maxStamina,dog.stamina+dog.staminaRegen*dt);
  }

  if(!fleeing && dog.targetX===null){ ax-=dog.vx*5; ay-=dog.vy*5; }

  const maxSpeed=fleeing?dog.speed*1.3:dog.speed;
  dog.vx+=ax*dt; dog.vy+=ay*dt;
  const spd=Math.sqrt(dog.vx*dog.vx+dog.vy*dog.vy);
  if(spd>maxSpeed){ dog.vx=(dog.vx/spd)*maxSpeed; dog.vy=(dog.vy/spd)*maxSpeed; }
  dog.vx*=(1-3*dt); dog.vy*=(1-3*dt);
  dog.x+=dog.vx*dt; dog.y+=dog.vy*dt;

  dog.x=Math.max(bnd.minX,Math.min(bnd.maxX,dog.x));
  dog.y=Math.max(bnd.minY,Math.min(bnd.maxY,dog.y));
  if(Math.abs(dog.vx)>5) dog.facing=dog.vx>0?1:-1;

  document.getElementById('bee-staminaFill').style.width=dog.stamina+'%';
}

function beeUpdate(dt,W,H){
  gdGameTime+=dt; gdWaveTimer+=dt;

  if(gdWaveTimer>=gdWaveDuration){
    gdWaveTimer=0;
    if(gdWave<GD_MAX_WAVE) gdWave++;
    document.getElementById('bee-waveUI').textContent='Đợt '+gdWave;
  }

  const waveEff=Math.min(gdWave, GD_MAX_WAVE);
  const spawnInterval=Math.max(0.35, 1.8-(waveEff-1)*(1.8-0.35)/(GD_MAX_WAVE-1));
  gdSpawnTimer+=dt;
  if(gdSpawnTimer>=spawnInterval){
    gdSpawnTimer=0;
    spawnBee(W,H); spawnBee(W,H); // gấp đôi số ong mỗi lần sinh
    if(waveEff>=3 && Math.random()<0.3){ spawnBee(W,H); spawnBee(W,H); }
    if(waveEff>=6 && Math.random()<0.3){ spawnBee(W,H); spawnBee(W,H); }
    if(waveEff>=GD_MAX_WAVE && Math.random()<0.4){ spawnBee(W,H); spawnBee(W,H); }
  }

  bees.forEach(bee=>{
    if(!bee.alive) return;
    const dx=dog.x-bee.x, dy=dog.y-bee.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const targetAngle=Math.atan2(dy,dx);
    bee.wobblePhase+=dt*bee.wobbleFreq;
    const wobble=Math.sin(bee.wobblePhase)*bee.wobbleAmp*0.02;
    let angleDiff=targetAngle-bee.angle;
    while(angleDiff>Math.PI) angleDiff-=Math.PI*2;
    while(angleDiff<-Math.PI) angleDiff+=Math.PI*2;
    bee.angle+=angleDiff*3*dt;
    const perpX=-Math.sin(bee.angle), perpY=Math.cos(bee.angle);
    bee.x+=(Math.cos(bee.angle)*bee.speed+perpX*wobble*bee.speed)*dt;
    bee.y+=(Math.sin(bee.angle)*bee.speed+perpY*wobble*bee.speed)*dt;
    bee.trail.push({x:bee.x,y:bee.y,life:0.3});
    if(bee.trail.length>8) bee.trail.shift();
    if(dist<20){
      bee.alive=false; gdHearts--; gdDogHit=1; gdShakeDur=0.3; beeCombo=0;
      updateBeeHUD(); sfxDogStung();
      if(gdHearts<=0){ beeGameOver(); }
    }
  });
  bees=bees.filter(b=>b.alive);
  bees.forEach(b=>{ b.trail.forEach(t=>t.life-=dt); b.trail=b.trail.filter(t=>t.life>0); });

  butterflies.forEach(b=>{
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.phase+=dt;
    if(Math.random()<dt*0.5){ b.vx+=(Math.random()-0.5)*40; b.vy+=(Math.random()-0.5)*30; b.vx=Math.max(-30,Math.min(30,b.vx)); b.vy=Math.max(-20,Math.min(20,b.vy)); }
    if(b.x<10) b.vx=Math.abs(b.vx); if(b.x>W-10) b.vx=-Math.abs(b.vx);
    if(b.y<H*0.1) b.vy=Math.abs(b.vy); if(b.y>H*0.55) b.vy=-Math.abs(b.vy);
  });

  if(beeCombo>0){ beeComboTimer-=dt; if(beeComboTimer<=0) beeCombo=0; }
  if(gdDogHit>0) gdDogHit=Math.max(0,gdDogHit-dt*3);
  if(gdShakeDur>0){ gdShakeDur-=dt; gdShakeX=(Math.random()-0.5)*6; gdShakeY=(Math.random()-0.5)*6; }
  else { gdShakeX=gdShakeY=0; }

  updateDog(dt,W,H);
}

function beeDraw(ctx,W,H,t){
  ctx.clearRect(0,0,W,H);
  ctx.save(); ctx.translate(gdShakeX,gdShakeY);
  beeDrawSky(ctx,W,H); beeDrawSun(ctx,t); beeDrawClouds(ctx,t,W); beeDrawHills(ctx,W,H); beeDrawGrass(ctx,W,H);
  gardenFlowers.forEach(f=>beeDrawOneFlower(ctx,f,t));
  butterflies.forEach(b=>beeDrawButterfly(ctx,b,t));

  const bnd=beeDogBounds(W,H);
  ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
  ctx.setLineDash([4,6]);
  ctx.strokeRect(bnd.minX,bnd.minY,bnd.maxX-bnd.minX,bnd.maxY-bnd.minY);
  ctx.setLineDash([]);

  bees.forEach(b=>{ b.trail.forEach(tr=>{
    ctx.beginPath(); ctx.arc(tr.x,tr.y,2,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,200,0,${tr.life/0.3*0.3})`; ctx.fill();
  });});

  if(dog.targetX!==null && dog.stamina>0){
    ctx.beginPath(); ctx.arc(dog.targetX,dog.targetY,8+Math.sin(t*5)*2,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(dog.targetX,dog.targetY,3,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(dog.x,dog.y); ctx.lineTo(dog.targetX,dog.targetY);
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1; ctx.setLineDash([3,5]); ctx.stroke(); ctx.setLineDash([]);
  }

  beeDrawFence(ctx,W,H);
  drawDog(ctx,t);
  bees.forEach(b=>{ if(b.alive) drawBee(ctx,b,t); });
  drawBeeParticles(ctx,1/60);
  ctx.restore();
}

function beeLoop(now){
  if(!beeMode) return;
  const dt=Math.min(0.05,Math.max(0,(now-beeLast)/1000));
  beeLast=now; beeElapsed+=dt*1000;
  const cv=BCV(), ctx=cv.getContext('2d'), W=360, H=460; ctx.setTransform(2,0,0,2,0,0);
  beeUpdate(dt,W,H);
  beeDraw(ctx,W,H,now/1000);
  if(!beeMode) return;
  beeRAF=requestAnimationFrame(beeLoop);
}

function beeGameOver(){
  if(beeRAF) cancelAnimationFrame(beeRAF);
  beeRAF=null; beeMode=false;
  forfeitHiddenMapScore();
  setTimeout(exitBeeToMain, 400);
}

function exitBeeToMain(){
  setActiveHiddenMap(null);
  beeMode=false;
  startBgm('main');
  if(beeRAF){ cancelAnimationFrame(beeRAF); beeRAF=null; }
  BCV().classList.remove('active');
  document.getElementById('bee-hearts').style.display='none';
  document.getElementById('bee-scoreUI').style.display='none';
  document.getElementById('bee-waveUI').style.display='none';
  document.getElementById('bee-stamina-label').style.display='none';
  document.getElementById('bee-stamina-wrap').style.display='none';
  document.getElementById('burst-count').style.display='';
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  consecutiveBursts=0; updateBurstCount();
  document.getElementById('hint-bar').textContent=(typeof t==='function'?t('hintDefault'):'');
  awaitingGoldUnlock=false;
  renderPieces();
  checkGameOverA();
  setTimeout(()=>startUnlockGate(3), 400);
}

/* ── điều khiển: chạm ong → đập bay / chạm nơi khác → chỉ đường ── */
function beeCanvasPt(e){
  const cv=BCV(), rect=cv.getBoundingClientRect();
  return {
    x:(e.clientX-rect.left)*(360/rect.width),
    y:(e.clientY-rect.top)*(460/rect.height)
  };
}
function beeShowTapHint(px,py){
  const rect=BCV().getBoundingClientRect();
  const wrect=document.getElementById('grid-wrap').getBoundingClientRect();
  const el=document.createElement('div');
  el.className='bee-hint-arrow';
  el.style.left=((px-wrect.left)/wrect.width*100)+'%';
  el.style.top=((py-wrect.top)/wrect.height*100)+'%';
  document.getElementById('grid-wrap').appendChild(el);
  setTimeout(()=>el.remove(),600);
}
function beeHandleTap(clientX,clientY){
  if(!beeMode) return;
  const pt=beeCanvasPt({clientX,clientY});

  let hitBee=null, hitDist=Infinity;
  bees.forEach(b=>{
    if(!b.alive) return;
    const d=Math.sqrt((b.x-pt.x)**2+(b.y-pt.y)**2);
    if(d<b.size+14 && d<hitDist){ hitBee=b; hitDist=d; }
  });

  if(hitBee){
    // 1 ong = 1 điểm; combo ×2/×3 (chuỗi ≥3 / ≥6) → 2 / 3 điểm — cộng vào điểm tổng
    hitBee.alive=false; beeCombo++; beeComboTimer=1.5;
    const mult=(typeof comboScoreMultiplier==='function')?comboScoreMultiplier(beeCombo):1;
    const pts=1*mult;
    score+=pts; if(score>best) best=score;
    updateScoreUI(); updateBeeHUD();
    spawnSwatParticles(hitBee.x,hitBee.y);
    beeShowComboFloat(hitBee.x,hitBee.y,mult,pts);
    sfxBeeKill();
  } else {
    const bnd=beeDogBounds(360,460);
    dog.targetX=Math.max(bnd.minX,Math.min(bnd.maxX,pt.x));
    dog.targetY=Math.max(bnd.minY,Math.min(bnd.maxY,pt.y));
    beeShowTapHint(clientX,clientY);
  }
}
function beePointerDown(e){
  if(!beeMode) return;
  e.preventDefault();
  gdPointerDown=true;
  beeHandleTap(e.clientX,e.clientY);
}
function beePointerMove(e){
  if(!beeMode||!gdPointerDown) return;
  e.preventDefault();
  const pt=beeCanvasPt(e);
  const bnd=beeDogBounds(360,460);
  dog.targetX=Math.max(bnd.minX,Math.min(bnd.maxX,pt.x));
  dog.targetY=Math.max(bnd.minY,Math.min(bnd.maxY,pt.y));
}
function beePointerUp(){ gdPointerDown=false; }
BCV().addEventListener('pointerdown', beePointerDown);
BCV().addEventListener('pointermove', beePointerMove);
BCV().addEventListener('pointerup', beePointerUp);
BCV().addEventListener('pointercancel', beePointerUp);
BCV().addEventListener('pointerleave', beePointerUp);
