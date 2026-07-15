// ═══════════════════════════════════════════════════════════════
// maps/map03.js — MAP ẨN 3: Chém hoa quả (Fruit Ninja)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js. (fruitSlicedTotal — biến
// đếm dùng chung cho reset — vẫn ở main.js; map gọi lúc chạy.)
// ═══════════════════════════════════════════════════════════════

let fruitMode=false, fruitRAF=null, fruitLast=0, fruitElapsed=0, fruitSpawnTimer=0;
let fruits=[], fruitTrail=[], fruitTimeLeft=60;
let fruitCombo=0, fruitComboTimer=0;
let fruitMissStreak=0; // số lần chém trượt (quả rơi hết màn hình mà không chém trúng) liên tiếp
let fruitLives=5; // chém trúng bom trừ 1 mạng thay vì thua ngay
let fruitFx=[]; // slice effects: juice drops + petals + slash lines
let fruitMissPopups=[]; // floating "-10" text khi chém trượt
let fruitTrailPetals=[]; // flower petal particles that fall along the slash trail
const TRAIL_PETAL_COLORS=['#ffb3cc','#ff80aa','#ffd6e7','#ff99bb','#ffe0ec','#ffaad4','#ff66a3'];
const FRUIT_TYPES=[
  {emoji:'🍉',r:38,pts:1,color:'#e74c3c',juice:'#ff6b6b',petals:['#ff8a80','#ff5252','#ff1744']},
  {emoji:'🍊',r:28,pts:1,color:'#e67e22',juice:'#f39c12',petals:['#ffcc02','#ff9800','#ffa726']},
  {emoji:'🍎',r:28,pts:1,color:'#c0392b',juice:'#e74c3c',petals:['#ef9a9a','#e53935','#b71c1c']},
  {emoji:'🍓',r:22,pts:1,color:'#e91e63',juice:'#ff4081',petals:['#f48fb1','#ec407a','#ad1457']},
  {emoji:'🍍',r:33,pts:1,color:'#f1c40f',juice:'#f39c12',petals:['#fff176','#ffee58','#f9a825']},
  {emoji:'🥝',r:22,pts:1,color:'#27ae60',juice:'#2ecc71',petals:['#a5d6a7','#66bb6a','#2e7d32']},
  {emoji:'🍋',r:24,pts:1,color:'#f1c40f',juice:'#f9e231',petals:['#fff9c4','#fff176','#f57f17']},
  {emoji:'🍌',r:28,pts:1,color:'#f1c40f',juice:'#ffe066',petals:['#fff59d','#ffee58','#f9a825']},
];
const FCV = () => document.getElementById('fruit-canvas');

function triggerFruitUnlock(){
  markMapCleared('dodge');
  pendingUnlock='fruit';
  document.getElementById('unlock-title').textContent='🍉 MAP ẨN 3 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    'Bạn đã ghi thêm <b>'+TEST_UNLOCK_SCORE+' điểm</b> ở map thường!<br><br>'+
    '🍉 Hoa quả bay lên liên tục trong <b>60 giây</b>!<br>'+
    'Vuốt ngón tay/chuột để <b>chém</b> quả, ghi điểm.<br>'+
    'Cẩn thận <b>💣 BOM</b> — chém trúng bom là <b>thua ngay</b>!<br>'+
    'Qua được 60s (hoặc dính bom) → về map thường, ghi thêm điểm để mở <b>Map ẩn 4</b>!';
  document.getElementById('unlock-btn').textContent='🍉 CHÉM THÔI!';
  showUnlockOverlay();
}

function enterFruitMode(){
  setActiveHiddenMap('fruit');
  endDrag();
  sfxUnlock();
  startBgm('action');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Vuốt để chém quả — tránh chém vào 💣 bom!';
  FCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🍉 MAP ẨN 3';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='🍉 Chém quả: 60s';

  fruitMode=true;
  initFruit();
  fruitLast=performance.now();
  fruitRAF=requestAnimationFrame(fruitLoop);
}

function initFruit(){
  fruits=[]; fruitTrail=[]; fruitFx=[]; fruitTrailPetals=[]; fruitMissPopups=[];
  fruitElapsed=0; fruitSpawnTimer=0; fruitTimeLeft=60; fruitMissStreak=0;
  fruitLives=5; // 5 mạng — chém trúng bom chỉ trừ 1 mạng thay vì thua ngay
}

function fruitDiff(){
  const t=fruitElapsed/1000;
  return {
    spawnInterval: Math.max(260, 850 - t*20),       // bay ra rất dày, nhanh ngay từ đầu
    burst: Math.min(9, 3 + Math.floor(t/6.7)),       // số quả mỗi đợt — tăng từ 3 lên tối đa 9 (~40s)
    bombChance: Math.min(0.28, 0.08 + t*0.0035),    // tỉ lệ ra bom tăng dần
  };
}

function spawnFruits(n,bombChance,W,H){
  for(let i=0;i<n;i++){
    const isBomb=Math.random()<bombChance;
    const type=isBomb?{emoji:'💣',r:22,pts:0,color:'#333',juice:'#888',petals:[]}:FRUIT_TYPES[Math.floor(Math.random()*FRUIT_TYPES.length)];
    const x=W*0.18+Math.random()*W*0.64;
    const vx=(Math.random()*2-1)*70;
    const vy=-(580+Math.random()*180);
    fruits.push({x,y:H+30,vx,vy,r:type.r,emoji:type.emoji,pts:type.pts,isBomb,
      color:type.color,juice:type.juice,petals:type.petals||[],
      rot:Math.random()*Math.PI*2,rotSpeed:(Math.random()*2-1)*3.5,sliced:false});
  }
}

function distPtSeg2(px,py,x1,y1,x2,y2){
  const dx=x2-x1, dy=y2-y1;
  const len2=dx*dx+dy*dy;
  let t=len2>0?((px-x1)*dx+(py-y1)*dy)/len2:0;
  t=Math.max(0,Math.min(1,t));
  const nx=x1+t*dx, ny=y1+t*dy;
  return Math.hypot(px-nx,py-ny);
}

function fruitLoop(now){
  if(!fruitMode) return;
  const dt=Math.min(0.05,Math.max(0,(now-fruitLast)/1000));
  fruitLast=now; fruitElapsed+=dt*1000;
  fruitTimeLeft=Math.max(0,60-fruitElapsed/1000);
  const cv=FCV(), ctx=cv.getContext('2d'), W=360, H=460; ctx.setTransform(2,0,0,2,0,0);
  const d=fruitDiff();
  const GRAV=900;

  fruitSpawnTimer+=dt*1000;
  if(fruitSpawnTimer>=d.spawnInterval && fruitTimeLeft>0){
    fruitSpawnTimer=0;
    spawnFruits(d.burst,d.bombChance,W,H);
  }

  for(const f of fruits){
    f.x+=f.vx*dt; f.y+=f.vy*dt; f.vy+=GRAV*dt; f.rot+=f.rotSpeed*dt;
  }
  let missedDie=false;
  fruits=fruits.filter(f=>{
    const alive=!f.sliced && f.y<H+60;
    if(!alive && !f.sliced && !f.isBomb){
      // Quả rơi hết màn hình mà không chém trúng → tính là 1 lần trượt
      fruitMissStreak++;
      const penalty=10*fruitMissStreak; // trừ điểm tăng dần theo số lần trượt liên tiếp
      score=Math.max(0,score-penalty);
      sfxInvalid();
      fruitMissPopups.push({x:f.x, y:H-60, text:'-'+penalty, life:0.9, maxLife:0.9});
      if(fruitMissStreak>5) missedDie=true; // trượt quá 5 lần liên tiếp → thua, về map gốc
    }
    return alive;
  });
  for(const p of fruitMissPopups){ p.y-=40*dt; p.life-=dt; }
  fruitMissPopups=fruitMissPopups.filter(p=>p.life>0);

  // animate fruitFx (juice drops, petals, slash)
  for(const fx of fruitFx){
    fx.t+=dt;
    for(const p of fx.particles){
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=600*dt; p.life-=dt;
    }
    fx.particles=fx.particles.filter(p=>p.life>0);
  }
  fruitFx=fruitFx.filter(fx=>fx.t<0.7);

  // vệt vuốt phai dần
  fruitTrail=fruitTrail.filter(p=>now-p.t<200);

  // update flower petal trail particles
  for(const p of fruitTrailPetals){
    p.vx+=Math.sin(p.life*0.15)*0.03; // gentle swaying
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.vy+=60*dt; // gentle gravity (slower fall)
    p.vx*=Math.pow(0.98,dt*60); // slight air drag
    p.rot+=p.rotSpeed*dt;
    p.life-=dt;
  }
  fruitTrailPetals=fruitTrailPetals.filter(p=>p.life>0);

  // kiểm tra chém: đoạn vệt mới nhất so với từng quả
  let boomed=false;
  if(fruitTrail.length>=2){
    const a=fruitTrail[fruitTrail.length-2], b=fruitTrail[fruitTrail.length-1];
    for(const f of fruits){
      if(f.sliced) continue;
      if(distPtSeg2(f.x,f.y,a.x,a.y,b.x,b.y) < f.r+8){
        f.sliced=true;
        if(f.isBomb){ sfxBomb(); boomed=true; spawnBoomFx(f.x,f.y); }
        else {
          fruitSlicedTotal++;
          if(fruitSlicedTotal===50) unlockAchievement('fruit50');
          fruitMissStreak=0; // chém trúng → reset chuỗi trượt
          fruitCombo++;
          if(fruitComboTimer) clearTimeout(fruitComboTimer);
          fruitComboTimer=setTimeout(()=>{ fruitCombo=0; fruitComboTimer=0; document.getElementById('combo-box').textContent=''; },800);
          document.getElementById('combo-box').textContent=fruitCombo>1?'🍉 x'+fruitCombo:'';
          const earnedPts=f.pts*comboScoreMultiplier(fruitCombo);
          score+=earnedPts; if(score>best) best=score;
          sfxFruitSlice();
          spawnSliceFx(f.x,f.y,f.juice,f.petals,a,b);
        }
      }
    }
  }
  updateScoreUI();

  drawFruit(ctx,W,H,now);

  if(boomed){
    fruitLives--;
    if(fruitLives<=0){ fruitGameOver(false); return; }
    showComboFlash(0,false,'💣 Trúng bom! Còn '+fruitLives+' mạng');
  }
  if(missedDie){ fruitGameOver(false, '😵 Trượt quá 5 lần liên tiếp!'); return; }
  if(fruitTimeLeft<=0 && fruits.every(f=>f.y>H+60||f.sliced)){ fruitGameOver(true); return; }
  fruitRAF=requestAnimationFrame(fruitLoop);
}



function drawFruit(ctx,W,H,now){
  ctx.clearRect(0,0,W,H);

  // ── sân vườn Map 4 đầy đủ ──
  scenicDayFull(ctx,W,H,now*0.001,{hillY:H*0.78,fence:false,stripY:H-8,butterflies:true});

  // ── draw slice FX (petals, juice, slash) ──
  for(const fx of fruitFx){
    // slash flash — comet-style with color burst
    if(fx.slashA && fx.t<fx.slashLife){
      const a=1-(fx.t/fx.slashLife);
      ctx.save();
      // outer comet glow (wide)
      ctx.strokeStyle=`rgba(200,100,255,${a*0.35})`; ctx.lineWidth=20+a*15;
      ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(fx.slashA.x,fx.slashA.y); ctx.lineTo(fx.slashB.x,fx.slashB.y); ctx.stroke();
      // mid purple-white
      ctx.strokeStyle=`rgba(230,160,255,${a*0.6})`; ctx.lineWidth=10;
      ctx.shadowColor='rgba(220,100,255,0.9)'; ctx.shadowBlur=18*a;
      ctx.beginPath(); ctx.moveTo(fx.slashA.x,fx.slashA.y); ctx.lineTo(fx.slashB.x,fx.slashB.y); ctx.stroke();
      // inner white blade
      ctx.strokeStyle=`rgba(255,255,255,${a*0.98})`; ctx.lineWidth=3.5;
      ctx.shadowColor='rgba(255,200,255,0.95)'; ctx.shadowBlur=10*a;
      ctx.beginPath(); ctx.moveTo(fx.slashA.x,fx.slashA.y); ctx.lineTo(fx.slashB.x,fx.slashB.y); ctx.stroke();
      // sparkle dots along slash
      const dx=fx.slashB.x-fx.slashA.x, dy=fx.slashB.y-fx.slashA.y;
      const len=Math.hypot(dx,dy);
      if(len>10){
        ctx.fillStyle=`rgba(255,220,255,${a*0.9})`;
        ctx.shadowColor='rgba(255,180,255,0.9)'; ctx.shadowBlur=6;
        for(let sp=0.1;sp<=0.9;sp+=0.18){
          ctx.beginPath(); ctx.arc(fx.slashA.x+dx*sp,fx.slashA.y+dy*sp,2.5*a,0,Math.PI*2); ctx.fill();
        }
      }
      ctx.restore();
    }
    // boom ring
    if(fx.boom){
      const prog=fx.t/0.5, alpha=1-prog, r=10+prog*60;
      ctx.strokeStyle=`rgba(255,120,20,${alpha*0.9})`; ctx.lineWidth=3+alpha*4;
      ctx.beginPath(); ctx.arc(fx.boomX,fx.boomY,r,0,Math.PI*2); ctx.stroke();
    }
    // particles
    for(const p of fx.particles){
      const alpha=Math.max(0,p.life/0.6);
      ctx.save(); ctx.globalAlpha=alpha;
      if(p.type==='juice'){
        ctx.fillStyle=p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=p.color+'88';
        ctx.beginPath(); ctx.arc(p.x-p.vx*0.012,p.y-p.vy*0.012,p.r*0.6,0,Math.PI*2); ctx.fill();
      } else if(p.type==='petal'){
        ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        // petal shimmer
        ctx.shadowColor=p.color; ctx.shadowBlur=4*alpha;
        ctx.fillStyle=p.color;
        ctx.beginPath(); ctx.ellipse(0,0,p.rx,p.ry,0,0,Math.PI*2); ctx.fill();
        // petal shine
        ctx.fillStyle='rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.ellipse(-p.rx*0.2,-p.ry*0.2,p.rx*0.35,p.ry*0.3,0,0,Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle=p.color;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── vệt chém — comet star-trail (dải hoa sao chổi) ──
  if(fruitTrail.length>1){
    const n=fruitTrail.length;
    // comet tail: outer nebula glow
    ctx.strokeStyle='rgba(180,80,255,0.18)'; ctx.lineWidth=28; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath();
    fruitTrail.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
    ctx.stroke();
    // mid purple-pink layer
    ctx.strokeStyle='rgba(220,120,255,0.35)'; ctx.lineWidth=14;
    ctx.beginPath();
    fruitTrail.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
    ctx.stroke();
    // inner electric white-cyan core
    ctx.strokeStyle='rgba(230,200,255,0.8)'; ctx.lineWidth=5;
    ctx.shadowColor='rgba(200,100,255,0.9)'; ctx.shadowBlur=16;
    ctx.beginPath();
    fruitTrail.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
    ctx.stroke();
    ctx.shadowBlur=0;
    // bright tip
    const tip=fruitTrail[n-1];
    ctx.save();
    ctx.shadowColor='rgba(255,220,255,1)'; ctx.shadowBlur=18;
    ctx.fillStyle='rgba(255,255,255,0.98)';
    ctx.beginPath(); ctx.arc(tip.x,tip.y,4,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // star sparkles along trail (comet debris)
    for(let i=Math.max(0,n-8);i<n;i+=2){
      const p=fruitTrail[i];
      const age=(n-1-i)/(n-1);
      const alpha=(1-age)*0.7;
      if(alpha<0.1) continue;
      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.fillStyle=age<0.4?'#fff':'rgba(220,180,255,0.9)';
      ctx.shadowColor='rgba(255,200,255,0.8)'; ctx.shadowBlur=6;
      const sr=2.5*(1-age)+0.5;
      // mini 4-point star
      const sa=performance.now()*0.005+i;
      ctx.translate(p.x,p.y); ctx.rotate(sa);
      ctx.beginPath();
      for(let k=0;k<4;k++){
        const ang=k/4*Math.PI*2;
        const ri=k%2===0?sr:sr*0.4;
        if(k===0) ctx.moveTo(Math.cos(ang)*ri,Math.sin(ang)*ri);
        else ctx.lineTo(Math.cos(ang)*ri,Math.sin(ang)*ri);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // ── cánh hoa rơi theo vệt chém ──
  for(const p of fruitTrailPetals){
    const alpha=(p.life/p.maxLife);
    if(alpha<0.02) continue;
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha=p.alpha*(p.life/p.maxLife);

    // Soft glow shadow
    ctx.shadowColor=p.color;
    ctx.shadowBlur=p.size*2.5;

    // Draw petal as a curved teardrop path (more organic than ellipse)
    const w=p.size;
    const h=p.size*1.6;
    ctx.beginPath();
    ctx.moveTo(0,-h/2);
    ctx.bezierCurveTo(w*0.8,-h/2,w*0.8,h*0.3,0,h/2);
    ctx.bezierCurveTo(-w*0.8,h*0.3,-w*0.8,-h/2,0,-h/2);
    ctx.fillStyle=p.color;
    ctx.fill();

    // Add inner highlight for depth
    ctx.globalAlpha=p.alpha*(p.life/p.maxLife)*0.4;
    ctx.fillStyle='#ffffff';
    ctx.beginPath();
    ctx.ellipse(w*0.15,-h*0.1,w*0.25,h*0.2,-0.3,0,Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const f of fruits){
    ctx.save();
    ctx.translate(f.x,f.y); ctx.rotate(f.rot);
    ctx.font=(f.r*1.9)+'px system-ui';
    ctx.shadowColor='rgba(0,0,0,0.7)'; ctx.shadowBlur=8; ctx.shadowOffsetY=3;
    ctx.fillText(f.emoji,0,0);
    ctx.restore();
  }
  ctx.shadowBlur=0;

  drawHudTop(ctx,W,{left:'⏱ '+Math.ceil(fruitTimeLeft)+'s', right:'❤️'.repeat(Math.max(0,fruitLives))});

  // ── floating "-10" popup khi chém trượt ──
  for(const p of fruitMissPopups){
    const a=Math.max(0,p.life/p.maxLife);
    ctx.save();
    ctx.globalAlpha=a;
    ctx.fillStyle='#ff5555';
    ctx.font='bold 22px system-ui';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='rgba(255,0,0,0.7)'; ctx.shadowBlur=8;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }

  // ── cảnh báo chuỗi trượt liên tiếp ──
  if(fruitMissStreak>0){
    ctx.save();
    ctx.fillStyle = fruitMissStreak>=4 ? '#ff3333' : 'rgba(255,180,80,0.9)';
    ctx.font='bold 14px system-ui'; ctx.textAlign='right'; ctx.textBaseline='top';
    ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=6;
    ctx.fillText('Trượt: '+fruitMissStreak+'/5', W-12, 10);
    ctx.restore();
  }
}

function fruitGameOver(success, msg){
  if(fruitRAF) cancelAnimationFrame(fruitRAF);
  fruitRAF=null; fruitMode=false;
  if(!success){
    forfeitHiddenMapScore();
  } else {
    sfxGameOver();
    showComboFlash(0, success, msg || '🍉 Qua màn!');
  }
  setTimeout(exitFruitToMain, 400);
}

function exitFruitToMain(){
  setActiveHiddenMap(null);
  fruitMode=false;
  startBgm('main');
  if(fruitRAF){ cancelAnimationFrame(fruitRAF); fruitRAF=null; }
  FCV().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('combo-box').textContent='';
  consecutiveBursts=0; updateBurstCount();
  document.getElementById('hint-bar').textContent='Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay';
  // TEST: luôn mở khoá Map ẩn 4 ngay khi rời map ẩn 3
  awaitingBeeUnlock=false;
  renderPieces();
  checkGameOverA();
  setTimeout(()=>startUnlockGate(2), 400);
}

/* ── điều khiển vuốt chém map ẩn 3 ── */
function fruitCanvasPt(e){
  const cv=FCV(), rect=cv.getBoundingClientRect();
  return {
    x:(e.clientX-rect.left)*(360/rect.width),
    y:(e.clientY-rect.top)*(460/rect.height)
  };
}
function fruitPointerDown(e){
  if(!fruitMode) return;
  e.preventDefault();
  const pt=fruitCanvasPt(e);
  fruitTrail.push({x:pt.x,y:pt.y,t:performance.now()});
}
function fruitPointerMove(e){
  if(!fruitMode) return;
  if(!(e.pressure>0||e.buttons||e.pointerType==='touch')) return;
  e.preventDefault();
  const pt=fruitCanvasPt(e);
  fruitTrail.push({x:pt.x,y:pt.y,t:performance.now()});
  if(fruitTrail.length>14) fruitTrail.shift();
  // spawn 2-3 flower petals at current pointer position
  const count=2+Math.floor(Math.random()*2);
  for(let i=0;i<count;i++){
    const maxLife=0.9+Math.random()*0.5; // 900–1400ms
    fruitTrailPetals.push({
      x: pt.x+(Math.random()-0.5)*14,
      y: pt.y+(Math.random()-0.5)*14,
      vx: (Math.random()-0.5)*2,   // gentle sideways drift (-1 to +1)
      vy: (Math.random()-0.5)*1,   // nearly horizontal (-0.5 to +0.5)
      rot: Math.random()*Math.PI*2,
      rotSpeed: 0.01+Math.random()*0.03, // slow graceful rotation (0.01–0.04)
      color: TRAIL_PETAL_COLORS[Math.floor(Math.random()*TRAIL_PETAL_COLORS.length)],
      life: maxLife,
      maxLife: maxLife,
      alpha: 0.85+Math.random()*0.15,
      size: 6+Math.random()*6  // bigger, softer (6–12)
    });
  }
}
function fruitPointerUp(){}
FCV().addEventListener('pointerdown', fruitPointerDown);
FCV().addEventListener('pointermove', fruitPointerMove);
FCV().addEventListener('pointerup', fruitPointerUp);
FCV().addEventListener('pointercancel', fruitPointerUp);
