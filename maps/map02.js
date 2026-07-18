// ═══════════════════════════════════════════════════════════════
// maps/map02.js — MAP ẨN 2: Rùa né cà rốt (Dodge)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope). Helper nền
// dùng chung (cuteDayBg/cuteGardenStrip...) vẫn ở main.js — map gọi lúc chạy.
// ═══════════════════════════════════════════════════════════════

let dodgeMode=false, dodgeRAF=null, dodgeLast=0, dodgeElapsed=0, dodgeSpawnTimer=0, dodgeAccum=0;
let turtle=null, rabbit=null, carrots=[];
let turtlePanicLevel=0;
let dodgePowerUps=[];
let dodgePowerSpawnTimer=0;
let dodgeShield=0, dodgeSlowTime=0;
const DODGE_POWERUPS=[
  { type:'shield', emoji:'🛡️', color:'#44aaff', label:'Khiên!',      duration:4 },
  { type:'slow',   emoji:'⏳', color:'#cc44ff', label:'Chậm!',       duration:3 },
];
let dodgeStreak=0;
const dodgeKeys={left:false,right:false};
let secret1Gained=0;              // điểm kiếm được trong map ẩn 1
let secret1GoalShown=false;       // đã hiện thông báo "đạt đủ điểm" 1 lần chưa
let pendingUnlock='secret';       // 'secret' | 'dodge' | 'fruit' | 'bee' — overlay mở khoá đang chờ
let awaitingFruitUnlock=false;    // đang chờ +điểm ở map thường sau khi chết map ẩn 2 → mở Map ẩn 3
let fruitUnlockBaseline=0;        // điểm mốc lúc vừa rời map ẩn 2
let awaitingBeeUnlock=false;      // đang chờ +điểm ở map thường sau khi rời map ẩn 3 → mở Map ẩn 4
let beeUnlockBaseline=0;          // điểm mốc lúc vừa rời map ẩn 3
const DCV = () => document.getElementById('dodge-canvas');

function triggerDodgeUnlock(){
  markMapCleared('secret');
  pendingUnlock='dodge';
  document.getElementById('unlock-title').textContent='🐢 MAP ẨN 2 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    'Bạn đã ghi <b>'+TEST_UNLOCK_SCORE+'+ điểm</b> ở map ẩn!<br><br>'+
    '🐢 Điều khiển <b>Rùa</b> ở dưới, né <b>cà rốt</b> do 🐰 Thỏ bắn ra.<br>'+
    'Kéo trái/phải trên màn hình hoặc bấm ◀ ▶.<br>'+
    'Đạn càng lúc càng <b>nhanh & nhiều</b> — sống càng lâu điểm càng cao!';
  document.getElementById('unlock-btn').textContent='🐢 BẮT ĐẦU NÉ!';
  showUnlockOverlay();
}

function enterDodgeMode(){
  setActiveHiddenMap('dodge');
  endDrag();
  sfxUnlock();
  startBgm('space');
  secretMode=false; clearSecretTimer();
  // dọn UI map ẩn 1
  const sg=document.getElementById('secret-grid');
  sg.classList.remove('active'); sg.innerHTML=''; secretCells=null;
  document.getElementById('secret-stage')?.classList.remove('active');
  document.getElementById('grid-wrap').classList.remove('theme-garden');
  document.getElementById('timer-bar-wrap').classList.remove('active');
  document.getElementById('secret-streak-bar').classList.remove('active');
  document.getElementById('grid-wrap').classList.remove('ultra-glow');
  // ẩn map chính
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  // hiện canvas + nút điều khiển
  DCV().classList.add('active');
  document.getElementById('dodge-controls').classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🐢 MAP ẨN 2';
  document.getElementById('mode-badge').classList.add('secret');
  const hb=document.getElementById('hint-bar');
  hb.style.display=''; hb.textContent='Kéo trái/phải (hoặc ◀ ▶) để né cà rốt!';
  document.getElementById('burst-count').textContent='🐢 Né cà rốt';

  dodgeMode=true;
  initDodge();
  dodgeLast=performance.now();
  dodgeRAF=requestAnimationFrame(dodgeLoop);
}

function initDodge(){
  const cv=DCV(), W=360, H=460;
  turtle={ x:W/2-24, y:H-52, w:48, h:36, target:W/2 };
  rabbit={ x:W/2-26, y:16, w:52, h:42, dir:1 };
  carrots=[];
  dodgePowerUps=[]; dodgePowerSpawnTimer=5;
  dodgeShield=0; dodgeSlowTime=0;
  dodgeElapsed=0; dodgeSpawnTimer=0; dodgeAccum=0;
  survive60Unlocked=false; survive120Unlocked=false; survive300Unlocked=false;
  dodgeKeys.left=dodgeKeys.right=false;
}

function dodgeDiff(){
  const t=dodgeElapsed/1000;
  return {
    carrotSpeed:  130 + t*9,                      // px/s — nhanh dần
    spawnInterval: Math.max(260, 900 - t*22),     // ms — bắn dày dần
    burst:        Math.min(4, 1 + Math.floor(t/12)), // số đạn mỗi đợt — nhiều dần
    turtleSpeed:  240 + t*11,                      // px/s — rùa nhanh dần tương ứng
    rabbitSpeed:  80 + t*6
  };
}

function dodgeLoop(now){
  if(!dodgeMode) return;
  const dt=Math.min(0.05,Math.max(0,(now-dodgeLast)/1000));
  dodgeLast=now; dodgeElapsed+=dt*1000;
  if(dodgeElapsed>=120000 && !survive120Unlocked){ survive120Unlocked=true; unlockAchievement('survive120'); }
  if(dodgeElapsed>=300000 && !survive300Unlocked){ survive300Unlocked=true; unlockAchievement('survive300'); }
  // legacy flag (không còn cup 60s — giữ biến để không lỗi chỗ khác)
  if(dodgeElapsed>=60000 && !survive60Unlocked){ survive60Unlocked=true; }
  const cv=DCV(), ctx=cv.getContext('2d'), W=360, H=460; ctx.setTransform(2,0,0,2,0,0);
  const d=dodgeDiff();

  // điểm sống sót — 1 điểm/giây, đồng bộ thang điểm map thường
  dodgeAccum+=dt;
  if(dodgeAccum>=1){ score+=1; if(score>best)best=score; dodgeAccum-=1; }

  // thỏ di chuyển + bắn
  rabbit.x+=rabbit.dir*d.rabbitSpeed*dt;
  if(rabbit.x<4){ rabbit.x=4; rabbit.dir=1; }
  if(rabbit.x>W-rabbit.w-4){ rabbit.x=W-rabbit.w-4; rabbit.dir=-1; }
  dodgeSpawnTimer+=dt*1000;
  if(dodgeSpawnTimer>=d.spawnInterval){
    dodgeSpawnTimer=0;
    for(let i=0;i<d.burst;i++){
      const cx=rabbit.x+rabbit.w/2 + (Math.random()*2-1)*(rabbit.w/2 + i*10);
      carrots.push({ x:Math.max(10,Math.min(W-10,cx)), y:rabbit.y+rabbit.h-4,
                     vy:d.carrotSpeed*(0.85+Math.random()*0.4), r:11 });
    }
  }

  // rùa di chuyển
  const turtlePrevX=turtle.x;
  if(dodgeKeys.left||dodgeKeys.right){
    const dir=(dodgeKeys.right?1:0)-(dodgeKeys.left?1:0);
    turtle.x+=dir*d.turtleSpeed*dt; turtle.target=turtle.x+turtle.w/2;
  } else {
    const cx=turtle.x+turtle.w/2, diff=turtle.target-cx, step=d.turtleSpeed*dt;
    if(Math.abs(diff)<=step) turtle.x=turtle.target-turtle.w/2;
    else turtle.x+=Math.sign(diff)*step;
  }
  turtle.x=Math.max(0,Math.min(W-turtle.w,turtle.x));
  turtle.vx = dt>0 ? (turtle.x-turtlePrevX)/dt : 0;

  // mức độ hoảng loạn: dựa vào cà rốt gần nhất phía trên rùa
  {
    const tcx=turtle.x+turtle.w/2, tcy=turtle.y+turtle.h/2;
    let nearestD=Infinity;
    for(const c of carrots){
      const dd=Math.hypot(c.x-tcx,c.y-tcy);
      if(dd<nearestD) nearestD=dd;
    }
    const PANIC_R=90, SAFE_R=200;
    const target=nearestD<SAFE_R ? Math.max(0,Math.min(1,1-(nearestD-PANIC_R)/(SAFE_R-PANIC_R))) : 0;
    turtlePanicLevel += (target-turtlePanicLevel)*Math.min(1,dt*6);
  }

  // power-up spawn timer
  dodgePowerSpawnTimer-=dt;
  if(dodgePowerSpawnTimer<=0){
    dodgePowerSpawnTimer=8+Math.random()*7;
    const pu=DODGE_POWERUPS[Math.floor(Math.random()*DODGE_POWERUPS.length)];
    dodgePowerUps.push({
      type:pu.type, emoji:pu.emoji, color:pu.color, label:pu.label, duration:pu.duration,
      x:30+Math.random()*(W-60), y:-30, r:18,
      speed:80+Math.random()*40
    });
  }

  // cà rốt rơi + tính điểm né
  const speedMult=dodgeSlowTime>0?0.35:1;
  for(const c of carrots) c.y+=c.vy*dt*speedMult;
  carrots=carrots.filter(c=>{
    if(c.y<H+20) return true;
    dodgeStreak++;
    score+=1*comboScoreMultiplier(dodgeStreak); if(score>best)best=score; // né được 1 viên = 1đ, x2/x3 theo chuỗi liên tiếp
    sfxDodge();
    if(dodgeStreak===3||dodgeStreak===6) sfxScoreMilestone();
    return false;
  });
  updateScoreUI();

  // power-up timers
  if(dodgeShield>0) dodgeShield-=dt;
  if(dodgeSlowTime>0) dodgeSlowTime-=dt;

  // move & collect power-ups
  for(let i=dodgePowerUps.length-1;i>=0;i--){
    const pu=dodgePowerUps[i];
    pu.y+=pu.speed*dt*speedMult;
    const tx=turtle.x+turtle.w/2, ty=turtle.y+turtle.h/2;
    const dist=Math.hypot(pu.x-tx, pu.y-ty);
    if(dist<pu.r+20){
      if(pu.type==='shield')  dodgeShield=pu.duration;
      if(pu.type==='slow')    dodgeSlowTime=pu.duration;
      showComboFlash(0,false,pu.label);
      sfxGoldCollect();
      dodgePowerUps.splice(i,1);
      continue;
    }
    if(pu.y>H+40) dodgePowerUps.splice(i,1);
  }

  // va chạm (hộp rùa thu nhỏ cho công bằng)
  const tb={x:turtle.x+7,y:turtle.y+6,w:turtle.w-14,h:turtle.h-10};
  let hit=false;
  for(const c of carrots){
    const nx=Math.max(tb.x,Math.min(c.x,tb.x+tb.w));
    const ny=Math.max(tb.y,Math.min(c.y,tb.y+tb.h));
    const dx=c.x-nx, dy=c.y-ny, rr=c.r*0.7;
    if(dx*dx+dy*dy < rr*rr){ hit=true; break; }
  }

  drawDodge(ctx,W,H);

  if(hit){
    if(dodgeShield>0){
      dodgeShield=0;
      showComboFlash(0,false,'🛡️ Khiên đỡ!');
      sfxStreak(3);
      // remove the carrot that hit
      const tb2={x:turtle.x+7,y:turtle.y+6,w:turtle.w-14,h:turtle.h-10};
      carrots=carrots.filter(c=>{
        const nx=Math.max(tb2.x,Math.min(c.x,tb2.x+tb2.w));
        const ny=Math.max(tb2.y,Math.min(c.y,tb2.y+tb2.h));
        const dx=c.x-nx, dy=c.y-ny, rr=c.r*0.7;
        return !(dx*dx+dy*dy<rr*rr);
      });
    } else {
      dodgeStreak=0; dodgeGameOver(); return;
    }
  }
  dodgeRAF=requestAnimationFrame(dodgeLoop);
}

// ── DODGE: shooting star state ──
if(!window.dodgeShootingStars) window.dodgeShootingStars=[];
function spawnShootingStar(W,H){
  const x=Math.random()*W*0.8;
  const y=Math.random()*H*0.35;
  window.dodgeShootingStars.push({x,y,vx:180+Math.random()*140,vy:90+Math.random()*80,life:1,maxLife:1,tail:[]});
}

function drawDodge(ctx,W,H){
  ctx.clearRect(0,0,W,H);

  // ── sân vườn Map 4 đầy đủ ──
  scenicDayFull(ctx,W,H,dodgeElapsed*0.001,{hillY:H-70,fenceY:H-8,stripY:H-6,butterflies:true});

  drawRabbit(ctx,rabbit.x,rabbit.y,rabbit.w,rabbit.h,dodgeElapsed*0.001);
  for(const c of carrots) drawCarrot(ctx,c.x,c.y,c.r);

  // draw power-ups
  for(const pu of dodgePowerUps){
    ctx.save();
    const grad=ctx.createRadialGradient(pu.x,pu.y,0,pu.x,pu.y,pu.r);
    grad.addColorStop(0,pu.color+'cc');
    grad.addColorStop(1,pu.color+'22');
    ctx.beginPath(); ctx.arc(pu.x,pu.y,pu.r,0,Math.PI*2);
    ctx.fillStyle=grad;
    ctx.shadowColor=pu.color; ctx.shadowBlur=15;
    ctx.fill();
    ctx.strokeStyle=pu.color; ctx.lineWidth=2;
    ctx.stroke();
    ctx.font='20px Nunito,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowBlur=0;
    ctx.fillText(pu.emoji,pu.x,pu.y);
    ctx.restore();
  }

  // shield ring on turtle
  if(dodgeShield>0){
    ctx.save();
    ctx.beginPath();
    ctx.arc(turtle.x+turtle.w/2,turtle.y+turtle.h/2,turtle.w*0.8,0,Math.PI*2);
    ctx.strokeStyle=`rgba(68,170,255,${Math.min(1,dodgeShield)})`;
    ctx.lineWidth=3;
    ctx.shadowColor='#44aaff'; ctx.shadowBlur=12;
    ctx.stroke();
    ctx.restore();
  }

  // slow-time overlay
  if(dodgeSlowTime>0){
    ctx.save();
    ctx.fillStyle=`rgba(100,0,180,${Math.min(0.12,dodgeSlowTime*0.04)})`;
    ctx.fillRect(0,0,W,H);
    ctx.font='bold 14px Nunito,sans-serif'; ctx.fillStyle='#cc88ff';
    ctx.textAlign='center'; ctx.shadowBlur=0;
    ctx.fillText(`⏳ ${dodgeSlowTime.toFixed(1)}s`,W/2,30);
    ctx.restore();
  }

  drawTurtle(ctx,turtle.x,turtle.y,turtle.w,turtle.h,dodgeElapsed*0.001,turtle.vx||0,turtlePanicLevel);

  drawHudTop(ctx,W,{left:'⏱ '+(dodgeElapsed/1000).toFixed(1)+'s'});
}

function roundRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

// Thanh HUD chuẩn dùng chung cho mọi map ẩn: 1 dải bo góc trên cùng canvas,
// chữ trắng 800 14px Nunito, tối đa 3 mục trái/giữa/phải, có thể kèm vạch tiến trình.
function drawHudTop(ctx,W,opts){
  const barH=26, y=8, x=10, w=W-20;
  ctx.save();
  ctx.beginPath(); roundRect(ctx,x,y,w,barH,8);
  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.fill();
  if(opts.progress!=null){
    ctx.save();
    ctx.beginPath(); roundRect(ctx,x,y,w,barH,8); ctx.clip();
    ctx.fillStyle=opts.progressColor||'#44dd44';
    ctx.fillRect(x,y,w*Math.max(0,Math.min(1,opts.progress)),barH);
    ctx.restore();
  }
  ctx.fillStyle='#ffffff';
  ctx.font='800 14px Nunito,system-ui';
  ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=3;
  const ty=y+barH/2;
  if(opts.left){ ctx.textAlign='left'; ctx.fillText(opts.left, x+8, ty); }
  if(opts.center){ ctx.textAlign='center'; ctx.fillText(opts.center, W/2, ty); }
  if(opts.right){ ctx.textAlign='right'; ctx.fillText(opts.right, x+w-8, ty); }
  ctx.restore();
}

function drawTurtle(ctx,x,y,w,h,t=0,vx=0,panicLevel=0){
  const cx=x+w/2, cy=y+h/2;
  const isMoving=Math.abs(vx)>15;
  const legWiggle=isMoving?Math.sin(t*16)*3:0;
  const bob=isMoving?Math.abs(Math.sin(t*16))*2:Math.sin(t*1.6)*0.8;

  ctx.save();
  ctx.translate(0,-bob);

  // shadow
  ctx.fillStyle='rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(cx,y+h+4,w*0.38*(isMoving?0.92:1),5,0,0,Math.PI*2); ctx.fill();

  // === 4 chân tròn mũm mĩm (vẫy khi di chuyển) ===
  const legColor='#3dba85';
  ctx.fillStyle=legColor;
  const legs=[
    [cx-w*0.32, cy+h*0.28+legWiggle, 9, 6],   // chân trước trái
    [cx+w*0.16, cy+h*0.28-legWiggle, 9, 6],   // chân trước phải
    [cx-w*0.38, cy+h*0.1-legWiggle,  7, 5],   // chân sau trái
    [cx+w*0.22, cy+h*0.1+legWiggle,  7, 5],   // chân sau phải
  ];
  legs.forEach(([lx,ly,rx,ry])=>{
    ctx.beginPath(); ctx.ellipse(lx,ly,rx,ry,0,0,Math.PI*2); ctx.fill();
  });
  // móng chân nhỏ
  ctx.fillStyle='rgba(20,90,55,0.45)';
  legs.forEach(([lx,ly,rx,ry])=>{
    for(let i=-1;i<=1;i++){
      ctx.beginPath(); ctx.ellipse(lx+i*rx*0.3, ly+ry*0.8, 2, 1.5, 0, 0, Math.PI*2); ctx.fill();
    }
  });

  // === Thân mai rùa ===
  // viền ngoài mai (đậm hơn)
  ctx.fillStyle='#1a8a5a';
  ctx.beginPath(); ctx.ellipse(cx, cy+h*0.05, w*0.46, h*0.34, 0, 0, Math.PI*2); ctx.fill();
  // gradient mai chính
  const sg=ctx.createRadialGradient(cx-w*0.1,cy-h*0.1, 2, cx, cy, w*0.44);
  sg.addColorStop(0,'#8ef5c8');
  sg.addColorStop(0.45,'#3dba85');
  sg.addColorStop(1,'#1a7a50');
  ctx.fillStyle=sg;
  ctx.beginPath(); ctx.ellipse(cx, cy+h*0.02, w*0.42, h*0.3, 0, 0, Math.PI*2); ctx.fill();

  // hoa văn lục giác trên mai
  ctx.strokeStyle='rgba(10,70,40,0.35)'; ctx.lineWidth=1.4;
  const hexPts=[[0,-1],[0.866,-0.5],[0.866,0.5],[0,1],[-0.866,0.5],[-0.866,-0.5]];
  const pr=w*0.14;
  [[0,-pr*0.85],[pr*0.88,pr*0.38],[-pr*0.88,pr*0.38],[0,pr*0.85]].forEach(([ox,oy])=>{
    ctx.beginPath();
    hexPts.forEach(([hx,hy],i)=>{
      const px=cx+ox+hx*pr*0.52, py=cy+h*0.02+oy+hy*pr*0.52;
      i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
    });
    ctx.closePath(); ctx.stroke();
  });
  // shine mai
  ctx.fillStyle='rgba(255,255,255,0.28)';
  ctx.beginPath(); ctx.ellipse(cx-w*0.13, cy-h*0.12, w*0.16, h*0.09, -0.4, 0, Math.PI*2); ctx.fill();

  // đuôi nhỏ
  ctx.fillStyle='#2cb87a';
  ctx.beginPath(); ctx.ellipse(cx+w*0.43, cy+h*0.12, 5, 4, 0.3, 0, Math.PI*2); ctx.fill();

  // === Đầu chibi — tròn mập, không quá to ===
  const hr=w*0.28;
  const headX=cx-w*0.18;
  const headY=cy-h*0.32;
  // cổ
  ctx.fillStyle='#3dba85';
  ctx.beginPath(); ctx.ellipse(headX+hr*0.1, headY+hr*0.75, hr*0.38, hr*0.3, 0, 0, Math.PI*2); ctx.fill();
  // đầu gradient
  const hg=ctx.createRadialGradient(headX-hr*0.2, headY-hr*0.2, 2, headX, headY, hr);
  hg.addColorStop(0,'#8ef5c8');
  hg.addColorStop(1,'#2cb87a');
  ctx.fillStyle=hg;
  ctx.beginPath(); ctx.arc(headX, headY, hr, 0, Math.PI*2); ctx.fill();
  // viền đầu nhẹ
  ctx.strokeStyle='rgba(15,90,50,0.3)'; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.arc(headX, headY, hr, 0, Math.PI*2); ctx.stroke();

  // mắt to chibi — chớp mắt định kỳ, mở to hơn khi hoảng loạn
  const blink=Math.sin(t*0.7)>0.94 && panicLevel<0.5;
  const eyeScale=1+panicLevel*0.35;
  [headX-hr*0.35, headX+hr*0.35].forEach(ex=>{
    const ey=headY+hr*0.08;
    if(blink){
      ctx.strokeStyle='#1a3a28'; ctx.lineWidth=1.6; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(ex, ey, hr*0.2, 0.15, Math.PI-0.15); ctx.stroke();
      return;
    }
    // tròng trắng
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.ellipse(ex, ey, hr*0.23*eyeScale, hr*0.27*eyeScale, 0, 0, Math.PI*2); ctx.fill();
    // con ngươi
    ctx.fillStyle='#1a3a28';
    ctx.beginPath(); ctx.ellipse(ex+0.8, ey+1, hr*0.14*eyeScale, hr*0.18*eyeScale, 0, 0, Math.PI*2); ctx.fill();
    // ánh sáng mắt chính
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(ex+hr*0.07, ey-hr*0.07, hr*0.07, 0, Math.PI*2); ctx.fill();
    // ánh sáng mắt phụ
    ctx.beginPath(); ctx.arc(ex-hr*0.05, ey+hr*0.08, hr*0.03, 0, Math.PI*2); ctx.fill();
  });
  // giọt mồ hôi hoảng loạn khi cà rốt tới gần
  if(panicLevel>0.4){
    ctx.fillStyle=`rgba(120,200,255,${panicLevel})`;
    const sy=headY-hr*1.1+Math.sin(t*8)*2;
    ctx.beginPath();
    ctx.moveTo(headX+hr*0.7,sy);
    ctx.quadraticCurveTo(headX+hr*0.85,sy+hr*0.35,headX+hr*0.7,sy+hr*0.5);
    ctx.quadraticCurveTo(headX+hr*0.55,sy+hr*0.35,headX+hr*0.7,sy);
    ctx.fill();
  }

  // má hồng blush
  ctx.fillStyle='rgba(255,130,130,0.38)';
  ctx.beginPath(); ctx.ellipse(headX-hr*0.6, headY+hr*0.32, hr*0.22, hr*0.13, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(headX+hr*0.6, headY+hr*0.32, hr*0.22, hr*0.13, 0, 0, Math.PI*2); ctx.fill();

  // mũi nhỏ
  ctx.fillStyle='rgba(20,120,70,0.7)';
  ctx.beginPath(); ctx.ellipse(headX, headY+hr*0.28, hr*0.08, hr*0.06, 0, 0, Math.PI*2); ctx.fill();

  // miệng cười nhỏ
  ctx.strokeStyle='rgba(15,80,45,0.65)'; ctx.lineWidth=1.6; ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(headX, headY+hr*0.3, hr*0.16, 0.2, Math.PI-0.2); ctx.stroke();

  // shine đầu
  ctx.fillStyle='rgba(255,255,255,0.32)';
  ctx.beginPath(); ctx.ellipse(headX-hr*0.2, headY-hr*0.28, hr*0.14, hr*0.09, -0.5, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawRabbit(ctx,x,y,w,h,t=0){
  const cx=x+w/2, cy=y+h/2;
  // shadow
  ctx.fillStyle='rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(cx,y+h+4,w*0.38,5,0,0,Math.PI*2); ctx.fill();

  // fluffy ear inner glow
  const earGrad=(ex)=>{
    const g=ctx.createLinearGradient(ex,y-18,ex,y+10);
    g.addColorStop(0,'#fff8ff'); g.addColorStop(1,'#f0e8ff'); return g;
  };
  // ears — chubby rounded, đung đưa nhẹ
  const earWiggle=Math.sin(t*2.4)*0.06;
  ctx.fillStyle='#f5eeff';
  ctx.beginPath(); ctx.ellipse(cx-14,y-8,8,20,-0.15-earWiggle,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+14,y-8,8,20,0.15+earWiggle,0,Math.PI*2); ctx.fill();
  // ear inner pink
  ctx.fillStyle='#ffb6d9';
  ctx.beginPath(); ctx.ellipse(cx-14,y-8,4.5,14,-0.15-earWiggle,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+14,y-8,4.5,14,0.15+earWiggle,0,Math.PI*2); ctx.fill();

  // body — chubby gradient
  const bg=ctx.createRadialGradient(cx-4,cy-4,3,cx,cy+4,w*0.44);
  bg.addColorStop(0,'#fff8ff'); bg.addColorStop(1,'#e8d8f5');
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.ellipse(cx,cy+4,w*0.4,h*0.36,0,0,Math.PI*2); ctx.fill();

  // chibi face — big round head
  const hr=w*0.34;
  const headY=cy-h*0.08;
  const hg=ctx.createRadialGradient(cx-3,headY-3,1,cx,headY,hr);
  hg.addColorStop(0,'#fff8ff'); hg.addColorStop(1,'#ede0f7');
  ctx.fillStyle=hg;
  ctx.beginPath(); ctx.arc(cx,headY,hr,0,Math.PI*2); ctx.fill();

  // big chibi eyes — chớp mắt định kỳ
  const rBlink=Math.sin(t*0.8+2)>0.94;
  [cx-hr*0.36, cx+hr*0.36].forEach(ex=>{
    const ey=headY+hr*0.05;
    if(rBlink){
      ctx.strokeStyle='#2a1a3a'; ctx.lineWidth=1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(ex,ey,hr*0.2,0.15,Math.PI-0.15); ctx.stroke();
      return;
    }
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.ellipse(ex,ey,hr*0.22,hr*0.25,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2a1a3a';
    ctx.beginPath(); ctx.ellipse(ex+1,ey+1,hr*0.14,hr*0.17,0,0,Math.PI*2); ctx.fill();
    // sparkle
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(ex+hr*0.07,ey-hr*0.07,hr*0.07,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex-hr*0.04,ey+hr*0.08,hr*0.03,0,Math.PI*2); ctx.fill();
  });
  // blush
  ctx.fillStyle='rgba(255,120,160,0.4)';
  ctx.beginPath(); ctx.ellipse(cx-hr*0.58,headY+hr*0.28,hr*0.2,hr*0.11,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+hr*0.58,headY+hr*0.28,hr*0.2,hr*0.11,0,0,Math.PI*2); ctx.fill();
  // tiny W nose
  ctx.fillStyle='#ffaacc';
  ctx.beginPath(); ctx.ellipse(cx,headY+hr*0.3,hr*0.09,hr*0.07,0,0,Math.PI*2); ctx.fill();
  // smile
  ctx.strokeStyle='rgba(120,60,80,0.6)'; ctx.lineWidth=1.8; ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(cx,headY+hr*0.28,hr*0.16,0.25,Math.PI-0.25); ctx.stroke();
  // head shine
  ctx.fillStyle='rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(cx-hr*0.2,headY-hr*0.28,hr*0.14,hr*0.08,-0.5,0,Math.PI*2); ctx.fill();
  // fluffy tail
  ctx.fillStyle='rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(cx+w*0.38,cy+h*0.22,7,0,Math.PI*2); ctx.fill();
}

/* ── Capybara chibi — cùng phong cách vẽ vector với drawTurtle/drawRabbit ── */
function drawCapybara(ctx,x,y,w,h,t=0){
  const cx=x+w/2, cy=y+h/2;
  ctx.fillStyle='rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(cx,y+h+4,w*0.4,5,0,0,Math.PI*2); ctx.fill();

  // thân bầu, mập mạp
  const bg=ctx.createRadialGradient(cx-4,cy-2,3,cx,cy+4,w*0.46);
  bg.addColorStop(0,'#c99a5c'); bg.addColorStop(1,'#8B6914');
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.ellipse(cx,cy+6,w*0.44,h*0.32,0,0,Math.PI*2); ctx.fill();

  // đầu to, vuông vức đặc trưng capybara
  const hr=w*0.32;
  const headY=cy-h*0.1;
  const hg=ctx.createRadialGradient(cx-4,headY-4,1,cx,headY,hr);
  hg.addColorStop(0,'#d8ac70'); hg.addColorStop(1,'#a67a3a');
  ctx.fillStyle=hg;
  ctx.beginPath(); ctx.ellipse(cx,headY,hr,hr*0.92,0,0,Math.PI*2); ctx.fill();
  // mõm dẹt phía trước
  ctx.fillStyle='#c99a5c';
  ctx.beginPath(); ctx.ellipse(cx,headY+hr*0.55,hr*0.62,hr*0.4,0,0,Math.PI*2); ctx.fill();

  // tai nhỏ tròn
  ctx.fillStyle='#8B6914';
  ctx.beginPath(); ctx.arc(cx-hr*0.85,headY-hr*0.7,hr*0.22,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+hr*0.85,headY-hr*0.7,hr*0.22,0,Math.PI*2); ctx.fill();

  // mắt nhỏ cao trên đầu — đặc trưng capybara hiền lành
  const blink=Math.sin(t*0.7+1)>0.94;
  [cx-hr*0.4, cx+hr*0.4].forEach(ex=>{
    const ey=headY-hr*0.08;
    if(blink){
      ctx.strokeStyle='#2a1a08'; ctx.lineWidth=1.4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(ex-hr*0.15,ey); ctx.lineTo(ex+hr*0.15,ey); ctx.stroke();
      return;
    }
    ctx.fillStyle='#2a1a08';
    ctx.beginPath(); ctx.ellipse(ex,ey,hr*0.15,hr*0.17,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(ex+hr*0.05,ey-hr*0.05,hr*0.05,0,Math.PI*2); ctx.fill();
  });
  // mũi
  ctx.fillStyle='#3a2410';
  ctx.beginPath(); ctx.ellipse(cx,headY+hr*0.5,hr*0.12,hr*0.08,0,0,Math.PI*2); ctx.fill();
  // miệng hiền, thư giãn
  ctx.strokeStyle='rgba(50,30,10,0.55)'; ctx.lineWidth=1.4; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx-hr*0.18,headY+hr*0.68); ctx.quadraticCurveTo(cx,headY+hr*0.78,cx+hr*0.18,headY+hr*0.68); ctx.stroke();
  // má hồng
  ctx.fillStyle='rgba(255,150,150,0.3)';
  ctx.beginPath(); ctx.ellipse(cx-hr*0.75,headY+hr*0.35,hr*0.18,hr*0.1,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+hr*0.75,headY+hr*0.35,hr*0.18,hr*0.1,0,0,Math.PI*2); ctx.fill();
  // shine
  ctx.fillStyle='rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(cx-hr*0.2,headY-hr*0.35,hr*0.14,hr*0.08,-0.5,0,Math.PI*2); ctx.fill();
}

/* ── Cat chibi ── */
function drawCat(ctx,x,y,w,h,t=0){
  const cx=x+w/2, cy=y+h/2;
  ctx.fillStyle='rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(cx,y+h+4,w*0.36,5,0,0,Math.PI*2); ctx.fill();

  // đuôi cong
  const tailWag=Math.sin(t*3)*0.15;
  ctx.strokeStyle='#ff9f40'; ctx.lineWidth=7; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx+w*0.36,cy+h*0.2);
  ctx.quadraticCurveTo(cx+w*0.58,cy-h*0.05+tailWag*10,cx+w*0.5,cy-h*0.32+tailWag*10);
  ctx.stroke();

  // thân
  const bg=ctx.createRadialGradient(cx-4,cy-2,3,cx,cy+4,w*0.42);
  bg.addColorStop(0,'#ffc478'); bg.addColorStop(1,'#ff9f40');
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.ellipse(cx,cy+5,w*0.38,h*0.34,0,0,Math.PI*2); ctx.fill();

  // tai tam giác
  ctx.fillStyle='#ff9f40';
  ctx.beginPath(); ctx.moveTo(cx-w*0.16,y-2); ctx.lineTo(cx-w*0.28,y+16); ctx.lineTo(cx-w*0.04,y+14); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx+w*0.16,y-2); ctx.lineTo(cx+w*0.28,y+16); ctx.lineTo(cx+w*0.04,y+14); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#ffd6c2';
  ctx.beginPath(); ctx.moveTo(cx-w*0.16,y+4); ctx.lineTo(cx-w*0.24,y+15); ctx.lineTo(cx-w*0.08,y+13); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx+w*0.16,y+4); ctx.lineTo(cx+w*0.24,y+15); ctx.lineTo(cx+w*0.08,y+13); ctx.closePath(); ctx.fill();

  // đầu tròn
  const hr=w*0.33;
  const headY=cy-h*0.08;
  const hg=ctx.createRadialGradient(cx-3,headY-3,1,cx,headY,hr);
  hg.addColorStop(0,'#ffd6a0'); hg.addColorStop(1,'#ff9f40');
  ctx.fillStyle=hg;
  ctx.beginPath(); ctx.arc(cx,headY,hr,0,Math.PI*2); ctx.fill();

  // ria mép
  ctx.strokeStyle='rgba(120,60,20,0.5)'; ctx.lineWidth=1; ctx.lineCap='round';
  [-1,1].forEach(s=>{
    for(let i=0;i<3;i++){
      ctx.beginPath(); ctx.moveTo(cx+s*hr*0.5,headY+hr*0.35+i*3-3);
      ctx.lineTo(cx+s*hr*1.05,headY+hr*0.25+i*4-4); ctx.stroke();
    }
  });

  // mắt to, chớp mắt
  const blink=Math.sin(t*0.8+3)>0.94;
  [cx-hr*0.35, cx+hr*0.35].forEach(ex=>{
    const ey=headY+hr*0.05;
    if(blink){
      ctx.strokeStyle='#2a1a08'; ctx.lineWidth=1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(ex,ey,hr*0.2,0.15,Math.PI-0.15); ctx.stroke();
      return;
    }
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.ellipse(ex,ey,hr*0.22,hr*0.25,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#3a7a3a';
    ctx.beginPath(); ctx.ellipse(ex+1,ey+1,hr*0.13,hr*0.17,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(ex+hr*0.07,ey-hr*0.07,hr*0.07,0,Math.PI*2); ctx.fill();
  });
  // má hồng
  ctx.fillStyle='rgba(255,120,120,0.35)';
  ctx.beginPath(); ctx.ellipse(cx-hr*0.6,headY+hr*0.32,hr*0.18,hr*0.1,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx+hr*0.6,headY+hr*0.32,hr*0.18,hr*0.1,0,0,Math.PI*2); ctx.fill();
  // mũi hồng + miệng chữ W
  ctx.fillStyle='#ff7099';
  ctx.beginPath(); ctx.moveTo(cx-hr*0.08,headY+hr*0.28); ctx.lineTo(cx+hr*0.08,headY+hr*0.28); ctx.lineTo(cx,headY+hr*0.38); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(120,60,40,0.6)'; ctx.lineWidth=1.4; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx,headY+hr*0.38); ctx.quadraticCurveTo(cx-hr*0.14,headY+hr*0.5,cx-hr*0.28,headY+hr*0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,headY+hr*0.38); ctx.quadraticCurveTo(cx+hr*0.14,headY+hr*0.5,cx+hr*0.28,headY+hr*0.4); ctx.stroke();
  // shine
  ctx.fillStyle='rgba(255,255,255,0.32)';
  ctx.beginPath(); ctx.ellipse(cx-hr*0.2,headY-hr*0.28,hr*0.14,hr*0.08,-0.5,0,Math.PI*2); ctx.fill();
}
/* ── Hedgehog chibi ── */
function drawHedgehog(ctx,x,y,w,h,t=0){
  const cx=x+w/2, cy=y+h/2;
  ctx.fillStyle='rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(cx,y+h+4,w*0.38,5,0,0,Math.PI*2); ctx.fill();

  // thân tròn
  const bg=ctx.createRadialGradient(cx-4,cy-2,3,cx,cy+4,w*0.42);
  bg.addColorStop(0,'#c48a5a'); bg.addColorStop(1,'#8B4513');
  ctx.fillStyle=bg;
  ctx.beginPath(); ctx.ellipse(cx,cy+5,w*0.4,h*0.34,0,0,Math.PI*2); ctx.fill();

  // gai nhọn phủ nửa lưng
  ctx.fillStyle='#5a2f0e';
  const spikeCount=9;
  for(let i=0;i<=spikeCount;i++){
    const a=Math.PI*(0.95-i/spikeCount*0.9);
    const bx=cx+Math.cos(a)*w*0.4, by=cy-h*0.06+Math.sin(a)*h*0.34;
    const tx=cx+Math.cos(a)*w*0.56, ty=cy-h*0.2+Math.sin(a)*h*0.5;
    ctx.beginPath();
    ctx.moveTo(bx-3,by); ctx.lineTo(tx,ty); ctx.lineTo(bx+3,by); ctx.closePath(); ctx.fill();
  }

  // mặt tam giác nhỏ phía trước (mõm)
  const hr=w*0.26;
  const headY=cy+h*0.02, headX=cx-w*0.06;
  ctx.fillStyle='#e8c49a';
  ctx.beginPath(); ctx.ellipse(headX,headY,hr,hr*0.85,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(headX-hr*0.3,headY+hr*0.5); ctx.lineTo(headX-hr*1.3,headY+hr*0.75); ctx.lineTo(headX-hr*0.2,headY+hr*0.95); ctx.closePath(); ctx.fill();

  // mắt
  const blink=Math.sin(t*0.9+2)>0.94;
  [headX-hr*0.15, headX+hr*0.45].forEach((ex,i)=>{
    const ey=headY-hr*0.05;
    if(blink){
      ctx.strokeStyle='#2a1608'; ctx.lineWidth=1.3; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(ex,ey,hr*0.18,0.15,Math.PI-0.15); ctx.stroke();
      return;
    }
    ctx.fillStyle='#2a1608';
    ctx.beginPath(); ctx.ellipse(ex,ey,hr*0.16,hr*0.19,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(ex+hr*0.06,ey-hr*0.06,hr*0.06,0,Math.PI*2); ctx.fill();
  });
  // mũi nhỏ đầu mõm
  ctx.fillStyle='#2a1608';
  ctx.beginPath(); ctx.arc(headX-hr*1.25,headY+hr*0.75,hr*0.14,0,Math.PI*2); ctx.fill();
  // má hồng
  ctx.fillStyle='rgba(255,140,140,0.3)';
  ctx.beginPath(); ctx.ellipse(headX+hr*0.55,headY+hr*0.35,hr*0.16,hr*0.09,0,0,Math.PI*2); ctx.fill();
  // shine lưng
  ctx.fillStyle='rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.ellipse(cx+w*0.05,cy-h*0.12,w*0.12,h*0.07,-0.4,0,Math.PI*2); ctx.fill();
}

/* ── Snake chibi — thân cong chữ S bằng các vòng tròn nối tiếp ── */
function drawSnake(ctx,x,y,w,h,t=0){
  const cx=x+w/2, cy=y+h/2;
  ctx.fillStyle='rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(cx,y+h+4,w*0.3,4,0,0,Math.PI*2); ctx.fill();

  // thân uốn lượn chữ S, nhỏ dần về đuôi
  const segs=6;
  for(let i=segs;i>=1;i--){
    const p=i/segs;
    const wob=Math.sin(t*2+i*0.9)*w*0.12;
    const sx=cx+wob*(i%2===0?1:-1)*0.6;
    const sy=y+h*0.3+p*h*0.62;
    const r=w*0.22*(0.55+0.45*(1-p));
    const g=ctx.createRadialGradient(sx-r*0.3,sy-r*0.3,1,sx,sy,r);
    g.addColorStop(0,'#5fcf5f'); g.addColorStop(1,'#2d8a2d');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2); ctx.fill();
  }

  // đầu to, chibi
  const hr=w*0.3;
  const headX=cx+Math.sin(t*2+0.9)*w*0.12*0.6, headY=y+h*0.22;
  const hg=ctx.createRadialGradient(headX-4,headY-4,1,headX,headY,hr);
  hg.addColorStop(0,'#7fe07f'); hg.addColorStop(1,'#2d8a2d');
  ctx.fillStyle=hg;
  ctx.beginPath(); ctx.arc(headX,headY,hr,0,Math.PI*2); ctx.fill();

  // lưỡi chẻ đôi, thè ra
  const tongue=0.6+Math.sin(t*6)*0.4;
  if(tongue>0.3){
    ctx.strokeStyle='#ff5577'; ctx.lineWidth=1.4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(headX,headY+hr*0.85); ctx.lineTo(headX,headY+hr*(0.85+tongue*0.6));
    ctx.moveTo(headX,headY+hr*(0.85+tongue*0.6)); ctx.lineTo(headX-3,headY+hr*(0.95+tongue*0.6));
    ctx.moveTo(headX,headY+hr*(0.85+tongue*0.6)); ctx.lineTo(headX+3,headY+hr*(0.95+tongue*0.6));
    ctx.stroke();
  }

  // mắt to tròn xoe, dễ thương chứ không dữ
  const blink=Math.sin(t*0.85+1)>0.94;
  [headX-hr*0.36, headX+hr*0.36].forEach(ex=>{
    const ey=headY-hr*0.1;
    if(blink){
      ctx.strokeStyle='#0a3a0a'; ctx.lineWidth=1.4; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(ex,ey,hr*0.2,0.15,Math.PI-0.15); ctx.stroke();
      return;
    }
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.ellipse(ex,ey,hr*0.22,hr*0.25,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0a3a0a';
    ctx.beginPath(); ctx.ellipse(ex+1,ey+1,hr*0.13,hr*0.17,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(ex+hr*0.07,ey-hr*0.07,hr*0.07,0,Math.PI*2); ctx.fill();
  });
  // má hồng nhẹ
  ctx.fillStyle='rgba(255,150,150,0.25)';
  ctx.beginPath(); ctx.ellipse(headX-hr*0.6,headY+hr*0.32,hr*0.16,hr*0.09,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(headX+hr*0.6,headY+hr*0.32,hr*0.16,hr*0.09,0,0,Math.PI*2); ctx.fill();
  // shine
  ctx.fillStyle='rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(headX-hr*0.2,headY-hr*0.28,hr*0.14,hr*0.08,-0.5,0,Math.PI*2); ctx.fill();
}

/* ── Điều phối chung: vẽ con vật vector dễ thương theo emoji + khung (x,y,w,h) ──
   Trả về true nếu emoji có bản vẽ vector; false nếu chưa có (nơi gọi tự fallback emoji). */
function drawCuteAnimal(ctx,emoji,x,y,w,h,t){
  switch(emoji){
    case '🐶': {
      const s=Math.min(w,h)/62;
      ctx.save(); ctx.translate(x+w/2,y+h/2); ctx.scale(s,s);
      drawDog(ctx,t,{x:0,y:0,vx:0,vy:0,facing:1,panicLevel:0});
      ctx.restore();
      return true;
    }
    case '🐝': {
      const s=Math.min(w,h)/40;
      drawBee(ctx,{x:x+w/2,y:y+h/2,size:16*s,wingPhase:t*10,angle:0},t);
      return true;
    }
    case '🦫': drawCapybara(ctx,x,y,w,h,t); return true;
    case '🐰': drawRabbit(ctx,x,y,w,h,t); return true;
    case '🐢': drawTurtle(ctx,x,y,w,h,t,0,0); return true;
    case '🐱': drawCat(ctx,x,y,w,h,t); return true;
    case '🦔': drawHedgehog(ctx,x,y,w,h,t); return true;
    case '🐍': drawSnake(ctx,x,y,w,h,t); return true;
    default: return false;
  }
}

function drawCarrot(ctx,x,y,r){
  // shadow
  ctx.fillStyle='rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x,y+r+2,r*0.5,3,0,0,Math.PI*2); ctx.fill();
  // body gradient
  const cg=ctx.createLinearGradient(x-r,y-r,x+r,y+r);
  cg.addColorStop(0,'#ffb347'); cg.addColorStop(0.5,'#EF7A27'); cg.addColorStop(1,'#c85a10');
  ctx.fillStyle=cg;
  ctx.beginPath();
  ctx.moveTo(x-r*0.55,y-r*0.8);
  ctx.bezierCurveTo(x-r*0.7,y-r*0.3, x-r*0.5,y+r*0.3, x,y+r);
  ctx.bezierCurveTo(x+r*0.5,y+r*0.3, x+r*0.7,y-r*0.3, x+r*0.55,y-r*0.8);
  ctx.closePath(); ctx.fill();
  // shine stripe
  ctx.strokeStyle='rgba(255,220,140,0.55)'; ctx.lineWidth=2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x-r*0.15,y-r*0.6); ctx.lineTo(x-r*0.05,y+r*0.3); ctx.stroke();
  // chibi face on carrot
  ctx.fillStyle='rgba(150,70,10,0.5)';
  ctx.beginPath(); ctx.arc(x-r*0.22,y-r*0.05,r*0.1,0,Math.PI*2);
  ctx.arc(x+r*0.22,y-r*0.05,r*0.1,0,Math.PI*2); ctx.fill();
  // leaves — bouncy
  ctx.fillStyle='#2ecc71';
  [[x-r*0.15,y-r,-0.8,x-r*0.5,y-r*1.7],[x,y-r,-0.1,x+r*0.1,y-r*2],[x+r*0.15,y-r,0.7,x+r*0.5,y-r*1.7]].forEach(([sx,sy,rot,ex,ey])=>{
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.quadraticCurveTo((sx+ex)/2+(ey-sy)*0.4,(sy+ey)/2,ex,ey); ctx.lineWidth=3; ctx.strokeStyle='#27ae60'; ctx.lineCap='round'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse((sx+ex)/2,((sy+ey)/2)-3,r*0.22,r*0.1,rot,0,Math.PI*2); ctx.fillStyle='#2ecc71'; ctx.fill();
  });
}

function dodgeGameOver(){
  if(dodgeRAF) cancelAnimationFrame(dodgeRAF);
  dodgeRAF=null; dodgeMode=false;
  forfeitHiddenMapScore(); // thua map ẩn → mất hết điểm kiếm được trong ván này
  setTimeout(exitDodgeToMain, 350);
}

function exitDodgeToMain(){
  setActiveHiddenMap(null);
  dodgeMode=false;
  startBgm('main');
  if(dodgeRAF){ cancelAnimationFrame(dodgeRAF); dodgeRAF=null; }
  DCV().classList.remove('active');
  document.getElementById('dodge-controls').classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  consecutiveBursts=0; updateBurstCount();
  document.getElementById('hint-bar').textContent='Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay';
  // TEST: luôn mở khoá Map ẩn 3 ngay khi rời map ẩn 2 (không cần điểm map thường)
  awaitingFruitUnlock=false;
  renderPieces();
  checkGameOverA();
  setTimeout(()=>startUnlockGate(1), 400);
}

/* ── điều khiển map ẩn 2 ── */
function dodgePointer(e){
  if(!dodgeMode||!turtle) return;
  e.preventDefault();
  const cv=DCV(), rect=cv.getBoundingClientRect();
  const lx=(e.clientX-rect.left)*(360/rect.width);
  turtle.target=Math.max(turtle.w/2, Math.min(360-turtle.w/2, lx));
  dodgeKeys.left=dodgeKeys.right=false;
}
DCV().addEventListener('pointerdown', dodgePointer);
DCV().addEventListener('pointermove', e=>{ if(e.pressure>0||e.buttons||e.pointerType==='touch') dodgePointer(e); });
