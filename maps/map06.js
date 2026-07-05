// ═══════════════════════════════════════════════════════════════
// maps/map06.js — MAP ẨN 6: Đập thú (Whack-a-Mole)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const MOLE_ANIMALS = [
  {emoji:'🦫', name:'Capybara', pts:4,  color:'#8B6914'},
  {emoji:'🐰', name:'Thỏ',      pts:1,  color:'#ff9ac8'},
  {emoji:'🐢', name:'Rùa',      pts:2,  color:'#4a9a40'},
  {emoji:'🐶', name:'Samoyed',  pts:6,  color:'#ffffff'},
  {emoji:'🐱', name:'Mèo',      pts:3,  color:'#ff9f40'},
  {emoji:'🦔', name:'Nhím',     pts:-4, color:'#8B4513'},
  {emoji:'🐍', name:'Rắn',      pts:-8, color:'#2d8a2d'},
];
const MOLE_COLS=4, MOLE_ROWS=2, MOLE_HOLES=8;
const MOLE_TIME=45, MOLE_KPI=32;

let moleMode=false, moleRAF=null, moleLast=0, moleElapsed=0;
let moleHoles=[], moleFx=[], moleScore=0;
let moleComboCount=0, moleLastHitTime=0;
let moleLives=3, moleMissStreak=0; // đập trượt liên tiếp 3 phát → trừ 1 tim, tổng 3 tim
let moleHammerX=0, moleHammerY=0, moleHammerVis=false, moleHammerAnim=0;
const MCV=()=>document.getElementById('mole-canvas');

function triggerMoleUnlock(){
  markMapCleared('gold');
  pendingUnlock='mole';
  document.getElementById('unlock-title').textContent='🔨 MAP ẨN 6 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    '🌿 <b>Vườn thú bí ẩn!</b><br><br>'+
    '8 ô trong vườn — động vật ẩn hiện. <b>Chạm/ấn</b> để đập!<br>'+
    '🦫+20 🐰+5 🐢+10 🐶+30 🐱+15 🦔-20 🐍-40<br>'+
    '⚠️ Đập nhím hoặc rắn bị <b>trừ điểm</b>! Cần <b>'+MOLE_KPI+' điểm</b> trong '+MOLE_TIME+'s!';
  document.getElementById('unlock-btn').textContent='🔨 ĐẬP THÔI!';
  showUnlockOverlay();
}

function enterMoleMode(){
  setActiveHiddenMap('mole');
  endDrag();
  sfxUnlock();
  startBgm('action');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Chạm/ấn vào con vật để đập! Tránh nhím 🦔 và rắn 🐍!';
  MCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🔨 MAP ẨN 6';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='🔨 0/'+MOLE_KPI+'đ';
  moleMode=true;
  initMole();
  moleLast=performance.now();
  moleRAF=requestAnimationFrame(moleLoop);
}

function initMole(){
  const cv=MCV(), W=360, H=460;
  moleScore=0; moleFx=[]; moleElapsed=0; moleComboCount=0; moleLastHitTime=0;
  moleLives=3; moleMissStreak=0;
  // 8 holes in a 4×2 grid in lower 2/3 of canvas
  moleHoles=[];
  const hx0=W*0.14, hxStep=W*0.24;
  const hy0=H*0.46, hyStep=H*0.24;
  for(let r=0;r<MOLE_ROWS;r++){
    for(let c=0;c<MOLE_COLS;c++){
      moleHoles.push({
        x: hx0+c*hxStep, y: hy0+r*hyStep,
        r: 28,
        animal: null,   // current animal object or null
        showT: 0,       // time animal has been visible (s)
        maxShow: 0,     // how long it stays up
        riseT: 0,       // animation: 0→1 rise in
        fallT: -1,      // animation: -1=not falling, else 0→1
        hit: false,     // was tapped this show
        nextSpawn: Math.random()*3+0.5, // countdown to next spawn
      });
    }
  }
}

function moleLoop(now){
  if(!moleMode) return;
  const dt=Math.min(0.05,Math.max(0,(now-moleLast)/1000));
  moleLast=now; moleElapsed+=dt*1000;
  const timeLeft=Math.max(0, MOLE_TIME-moleElapsed/1000);
  const cv=MCV(), ctx=cv.getContext('2d'), W=360, H=460; ctx.setTransform(2,0,0,2,0,0);

  // update holes
  for(const h of moleHoles){
    if(!h.animal){
      h.nextSpawn-=dt;
      if(h.nextSpawn<=0){
        // pick random animal
        const difficulty=Math.min(1, moleElapsed/30000);
        // more snakes/hedgehogs as time goes
        const pool=[...MOLE_ANIMALS];
        const weights=pool.map((a,i)=> i>=5 ? 0.04+difficulty*0.14 : 0.2-difficulty*0.03);
        const tot=weights.reduce((s,w)=>s+w,0);
        let rnd=Math.random()*tot;
        let chosen=pool[0];
        for(let i=0;i<pool.length;i++){ rnd-=weights[i]; if(rnd<=0){chosen=pool[i];break;} }
        h.animal=chosen;
        h.showT=0;
        // thời gian con thú "bay lên" hiển thị trên mặt đất — dài hơn để dễ đập,
        // vẫn giảm dần theo độ khó (thời gian chơi càng lâu càng ngắn lại)
        h.maxShow=Math.max(1.6, 3.6-moleElapsed/22000);
        h.riseT=0; h.fallT=-1; h.hit=false;
        if(!sfxMuted) sfxMoleAppear();
      }
    } else {
      if(h.fallT>=0){
        h.fallT+=dt*3;
        if(h.fallT>=1){ h.animal=null; h.nextSpawn=Math.random()*2+0.8; }
      } else {
        // Phase 1 (0→0.3): tease peek — pokes head out a little
        // Phase 2 (0.3→0.5): hụp xuống — ducks back fully out of sight
        // Phase 3 (0.5→1): bay lên — launches fully up to 100%, only now hittable
        const speed = h.riseT < 0.3 ? 1.2 : h.riseT < 0.5 ? 3.0 : 2.0;
        h.riseT=Math.min(1, h.riseT+dt*speed);
        h.showT+=dt;
        if(h.showT>=h.maxShow && !h.hit){ h.fallT=0; }
      }
    }
  }

  // hammer anim decay
  if(moleHammerAnim>0) moleHammerAnim=Math.max(0, moleHammerAnim-dt*5);

  // fx decay
  moleFx.forEach(f=>f.t+=dt);
  moleFx=moleFx.filter(f=>f.t<0.8);

  drawMole(ctx,W,H,now,timeLeft);

  // check time up
  if(timeLeft<=0){
    moleDone(); return;
  }

  document.getElementById('burst-count').textContent='🔨 '+moleScore+'/'+MOLE_KPI+'đ  ⏱'+timeLeft.toFixed(0)+'s';
  moleRAF=requestAnimationFrame(moleLoop);
}

function moleRise(h){
  // Peek (0→0.3): pokes up a little as a tease
  // Hụp xuống (0.3→0.5): ducks back down out of sight completely
  // Bay lên (0.5→1): launches fully up to 100% — only this state is hittable
  if(h.fallT>=0) return 1-easeOut(Math.min(h.fallT,1));
  const t=h.riseT;
  if(t<0.3) return easeOut(t/0.3)*0.18;
  if(t<0.5) return 0.18*(1-easeOut((t-0.3)/0.2));
  return easeOut((t-0.5)/0.5);
}

function tapMole(ex,ey){
  if(!moleMode) return;
  moleHammerX=ex; moleHammerY=ey; moleHammerVis=true; moleHammerAnim=1;
  let hit=false;
  for(const h of moleHoles){
    // chỉ hittable khi con thú đã bay lên đúng 100% ra khỏi hố
    if(!h.animal || h.fallT>=0 || h.hit || h.riseT<1) continue;
    const rise=moleRise(h);
    const yOff=(1-rise)*h.r*1.8;
    const hx=h.x, hy=h.y-yOff;
    if(Math.hypot(ex-hx, ey-hy)<h.r+12){
      h.hit=true; h.fallT=0;
      const basePts=h.animal.pts;
      let pts=basePts;
      if(basePts>0){
        const now2=performance.now();
        if(now2-moleLastHitTime<2000){ moleComboCount++; } else { moleComboCount=1; }
        moleLastHitTime=now2;
        pts=basePts*comboScoreMultiplier(moleComboCount); // liên tiếp 3 lần → x2, 6 lần → x3
        if(moleComboCount===3||moleComboCount===6) showComboFlash(0,false,'COMBO! x'+moleComboCount);
      } else { moleComboCount=0; }
      moleScore+=pts; if(moleScore+score>best) best=moleScore+score;
      if(pts>0){ sfxHammer(); } else { sfxPenalty(); }
      const col=pts>0?'#f7c948':'#ff4444';
      moleFx.push({x:hx,y:hy,t:0,label:(pts>0?'+':'')+pts,color:col,emoji:h.animal.emoji});
      hit=true;
      moleMissStreak=0;
      break;
    }
  }
  if(!hit){
    sfxHammer(); // missed tap
    moleMissStreak++;
    if(moleMissStreak>=3){
      moleMissStreak=0;
      moleLives--;
      showComboFlash(0,false,'💔 Trượt 3 lần! Còn '+Math.max(0,moleLives)+' tim');
      if(moleLives<=0){ moleDone(true); return; }
    }
  }
}

function easeOut(t){ return 1-(1-t)*(1-t); }

function drawMole(ctx,W,H,now,timeLeft){
  ctx.clearRect(0,0,W,H);

  // ── lush garden background ──
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#87CEEB'); bg.addColorStop(0.45,'#b8e8f0');
  bg.addColorStop(0.46,'#5aaa30'); bg.addColorStop(1,'#2a7010');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  // clouds
  [[W*0.15,H*0.1,45],[W*0.55,H*0.07,55],[W*0.82,H*0.13,38]].forEach(([cx,cy,cr])=>{
    ctx.fillStyle='rgba(255,255,255,0.88)';
    ctx.beginPath(); ctx.arc(cx,cy,cr,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+cr*0.6,cy+5,cr*0.72,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx-cr*0.55,cy+6,cr*0.65,0,Math.PI*2); ctx.fill();
  });

  // grass ground
  ctx.fillStyle='#5aaa30';
  ctx.fillRect(0,H*0.38,W,H*0.62);
  // grass shading
  const gsh=ctx.createLinearGradient(0,H*0.38,0,H*0.55);
  gsh.addColorStop(0,'rgba(255,255,255,0.15)'); gsh.addColorStop(1,'rgba(0,0,0,0.15)');
  ctx.fillStyle=gsh; ctx.fillRect(0,H*0.38,W,H*0.17);

  // flowers scattered
  const flowers=[
    [W*0.06,H*0.40,'#ff88cc'],[W*0.18,H*0.43,'#ffee44'],[W*0.88,H*0.41,'#ff7799'],
    [W*0.76,H*0.44,'#ffffff'],[W*0.32,H*0.95,'#ffaa44'],[W*0.62,H*0.93,'#cc88ff'],
    [W*0.08,H*0.88,'#88ffcc'],[W*0.92,H*0.86,'#ffcc44'],
  ];
  flowers.forEach(([fx,fy,fc])=>{
    ctx.fillStyle=fc;
    for(let k=0;k<5;k++){
      const fa=k/5*Math.PI*2;
      ctx.beginPath(); ctx.ellipse(fx+Math.cos(fa)*5,fy+Math.sin(fa)*5,4,2.5,fa,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='#ffee88';
    ctx.beginPath(); ctx.arc(fx,fy,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#3a8a10';
    ctx.beginPath(); ctx.moveTo(fx,fy+5); ctx.quadraticCurveTo(fx-8,fy+14,fx-4,fy+20); ctx.lineWidth=2; ctx.strokeStyle='#3a8a10'; ctx.stroke();
  });

  // butterflies fluttering across the sky
  ctx.font='14px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const bt=moleElapsed/1000;
  [[W*0.15+Math.sin(bt*1.1)*W*0.3, H*0.22+Math.sin(bt*2.3)*18],
   [W*0.55+Math.sin(bt*0.9+1)*W*0.28, H*0.16+Math.sin(bt*2.1+2)*14],
   [W*0.78+Math.sin(bt*1.3+3)*W*0.18, H*0.26+Math.sin(bt*1.9+1)*16]
  ].forEach(([bx,by])=>{ ctx.fillText('🦋',bx,by); });

  // draw holes (behind animals)
  for(const h of moleHoles){
    const hx=h.x, hy=h.y;
    // hole shadow
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(hx,hy,h.r+4,h.r*0.48,0,0,Math.PI*2); ctx.fill();
    // hole dark
    ctx.fillStyle='#1a0e00';
    ctx.beginPath(); ctx.ellipse(hx,hy,h.r,h.r*0.4,0,0,Math.PI*2); ctx.fill();
    // hole rim
    const rimG=ctx.createRadialGradient(hx,hy,0,hx,hy,h.r);
    rimG.addColorStop(0.6,'rgba(0,0,0,0)'); rimG.addColorStop(1,'rgba(60,35,10,0.55)');
    ctx.fillStyle=rimG; ctx.beginPath(); ctx.ellipse(hx,hy,h.r,h.r*0.45,0,0,Math.PI*2); ctx.fill();
  }

  // draw animals
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const h of moleHoles){
    if(!h.animal) continue;
    // Peek → hụp xuống → bay lên: chỉ 0% hoặc 100%, không dừng lửng ở giữa
    const rise = moleRise(h);
    if(rise<=0) continue;
    const yOff=(1-rise)*h.r*1.8;
    const hx=h.x, hy=h.y-yOff;

    // clip to hole top (grass covers lower part)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(h.x,h.y,h.r,h.r*0.4,0,0,Math.PI,true); // upper half of hole
    ctx.rect(h.x-h.r-5, h.y-80, h.r*2+10, 80);
    ctx.clip();

    // animal body circle
    const col=h.animal.color;
    ctx.fillStyle=col;
    ctx.shadowColor='rgba(0,0,0,0.3)'; ctx.shadowBlur=8; ctx.shadowOffsetY=3;
    ctx.beginPath(); ctx.arc(hx,hy,h.r-2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.shadowOffsetY=0;

    // emoji face
    ctx.font=(h.r*1.4)+'px system-ui';
    ctx.fillText(h.animal.emoji, hx, hy);

    // score badge on animal
    const pts=h.animal.pts;
    const badgeCol=pts>0?'#22cc22':'#cc2222';
    ctx.fillStyle=badgeCol;
    ctx.font='bold 10px system-ui';
    ctx.fillText((pts>0?'+':'')+pts, hx+h.r*0.6, hy-h.r*0.7);

    ctx.restore();

    // hiện viền sáng có thể đập khi đã bay lên đúng 100%
    if(h.riseT>=1 && h.fallT<0 && !h.hit){
      const pulse=0.55+0.45*Math.sin(now*0.008);
      ctx.save();
      ctx.shadowColor=h.animal.pts>0?'rgba(255,230,60,0.9)':'rgba(255,80,80,0.9)';
      ctx.shadowBlur=14*pulse;
      ctx.strokeStyle=h.animal.pts>0?'rgba(255,220,40,0.7)':'rgba(255,80,60,0.7)';
      ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(h.x, h.y-yOff, h.r+2, Math.PI, 0); ctx.stroke();
      ctx.restore();
    }

    // grass rim on top of animal
    ctx.fillStyle='#5aaa30';
    ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r+4,h.r*0.48,0,Math.PI,Math.PI*2); ctx.fill();
    const rimTop=ctx.createLinearGradient(h.x-h.r,h.y,h.x+h.r,h.y);
    rimTop.addColorStop(0,'#3a8a18'); rimTop.addColorStop(0.5,'#6acc38'); rimTop.addColorStop(1,'#3a8a18');
    ctx.fillStyle=rimTop;
    ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r+4,h.r*0.42,0,Math.PI,Math.PI*2); ctx.fill();
  }

  // fx popups
  for(const f of moleFx){
    const a=1-f.t/0.8;
    ctx.save();
    ctx.globalAlpha=a;
    ctx.font='bold 18px system-ui';
    ctx.textAlign='center';
    ctx.fillStyle=f.color;
    ctx.fillText(f.label, f.x, f.y-f.t*60);
    ctx.font='22px system-ui';
    ctx.fillText(f.emoji, f.x, f.y-f.t*60-24);
    ctx.restore();
  }

  // hammer cursor
  if(moleHammerVis){
    ctx.save();
    ctx.translate(moleHammerX, moleHammerY);
    ctx.rotate(-Math.PI/4*(1-moleHammerAnim)*0.6 - Math.PI/6);
    ctx.font='32px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🔨', 0, 0);
    ctx.restore();
  }

  const frac=Math.max(0,timeLeft/MOLE_TIME);
  const barCol=frac>0.4?'#44dd44':frac>0.2?'#ffaa00':'#ff3333';
  drawHudTop(ctx,W,{left:'🔨 '+moleScore+'/'+MOLE_KPI, center:'⏱ '+timeLeft.toFixed(0)+'s', right:'❤️'.repeat(Math.max(0,moleLives)), progress:frac, progressColor:barCol});
}

function moleDone(forceLose){
  if(moleRAF){ cancelAnimationFrame(moleRAF); moleRAF=null; }
  moleMode=false;
  const won=!forceLose && moleScore>=MOLE_KPI;
  if(won){
    score+=moleScore; if(score>best)best=score; updateScoreUI();
    sfxWaveWin();
    showComboFlash(0,false,'🏆 '+moleScore+' điểm! THẮNG!');
  }
  setTimeout(()=>{ exitMoleToMain(); setTimeout(()=>startUnlockGate(5), 500); }, 500);
}

function exitMoleToMain(){
  setActiveHiddenMap(null);
  moleMode=false;
  startBgm('main');
  if(moleRAF){ cancelAnimationFrame(moleRAF); moleRAF=null; }
  MCV().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('combo-box').textContent='';
  consecutiveBursts=0; updateBurstCount();
  document.getElementById('hint-bar').textContent='Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay';
  renderPieces(); checkGameOverA();
}

/* ── điều khiển Mole: chạm canvas để đập ── */
MCV().addEventListener('pointerdown', e=>{
  if(!moleMode) return;
  e.preventDefault();
  const rect=MCV().getBoundingClientRect();
  const scaleX=360/rect.width, scaleY=460/rect.height;
  tapMole((e.clientX-rect.left)*scaleX, (e.clientY-rect.top)*scaleY);
});
MCV().addEventListener('pointermove', e=>{
  if(!moleMode) return;
  const rect=MCV().getBoundingClientRect();
  const scaleX=360/rect.width, scaleY=460/rect.height;
  moleHammerX=(e.clientX-rect.left)*scaleX;
  moleHammerY=(e.clientY-rect.top)*scaleY;
  moleHammerVis=true;
});
