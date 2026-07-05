// ═══════════════════════════════════════════════════════════════
// effects.js — Lớp HIỆU ỨNG hình ảnh tách khỏi main.js
// Gồm: particle (tia/hạt), fire (viền lửa), glow (viền sáng), combo (flash/ring),
//       explosion (pháo hoa/sóng nổ) — cho bàn cờ chính, map ẩn 1, và các map ẩn.
// NẠP TRƯỚC main.js: chỉ chứa ĐỊNH NGHĨA hàm (không chạy gì lúc load); các hàm chỉ
// tham chiếu biến/hàm game lúc CHẠY nên dùng chung phạm vi global an toàn.
// ═══════════════════════════════════════════════════════════════

function mainBurstFX(cells, streak){
  const big = streak >= 2;
  // Lấy màu đại diện từ ô đầu tiên trong cụm
  const firstCell = cells[0] ? getCell(cells[0][0], cells[0][1]) : null;
  const baseColor = (firstCell && firstCell.style.background) ? firstCell.style.background : '#ffd24a';

  // 1) Pháo hoa viền (dùng lại spawnBorderFireworks nhưng truyền màu map thường)
  const fx = document.getElementById('sc-fx');
  const wrap = document.getElementById('grid-wrap');
  if(fx && wrap){
    fx.classList.add('active');
    const W=wrap.clientWidth, H=wrap.clientHeight;
    const palette=[baseColor, '#ffd24a', '#ff7a3c', '#ffffff', '#ffe9a8', baseColor];
    const N = big ? 55 : 28;
    for(let i=0;i<N;i++){
      const side=i%4; const t=Math.random();
      let x,y,ang;
      if(side===0){x=t*W;y=0;ang=90;}
      else if(side===1){x=W;y=t*H;ang=180;}
      else if(side===2){x=t*W;y=H;ang=-90;}
      else{x=0;y=t*H;ang=0;}
      ang+=Math.random()*60-30;
      const dist=(big?28:18)+Math.random()*(big?55:38);
      const len=14+Math.random()*20;
      const dur=420+Math.random()*320;
      const col=palette[(Math.random()*palette.length)|0];
      const s=document.createElement('div'); s.className='spark';
      s.style.left=x+'px'; s.style.top=y+'px';
      s.style.setProperty('--ang',ang+'deg');
      s.style.setProperty('--dist',dist+'px');
      s.style.setProperty('--len',len+'px');
      s.style.setProperty('--col',col);
      s.style.animationDuration=dur+'ms';
      fx.appendChild(s);
      setTimeout(()=>{ s.remove(); if(!fx.children.length) fx.classList.remove('active'); }, dur+60);
    }
  }

  // 2) Tia lấp lánh tại từng ô nổ
  const root=document.getElementById('game-root'); if(!root) return;
  const rr=root.getBoundingClientRect();
  let budget=big?50:30;
  const per=cells.length>14?1:(cells.length>7?2:3);
  for(const [gr,gc] of cells){
    if(budget<=0) break;
    const cell=getCell(gr,gc); if(!cell) continue;
    const cr=cell.getBoundingClientRect();
    const cx=cr.left-rr.left+cr.width/2, cy=cr.top-rr.top+cr.height/2;
    const n=Math.min(per,budget); budget-=n;
    for(let k=0;k<n;k++){
      const t=document.createElement('div'); t.className='twinkle';
      t.style.left=cx+'px'; t.style.top=cy+'px';
      const col2=k%3===0?'#fff':(k%3===1?baseColor:'#ffe9a8');
      t.style.setProperty('--tc',col2);
      t.style.setProperty('--tx',(Math.random()*28-14)+'px');
      t.style.setProperty('--ty',(Math.random()*28-14)+'px');
      t.style.animationDelay=(Math.random()*0.12)+'s';
      root.appendChild(t);
      setTimeout(()=>t.remove(),740);
    }
  }
}

function secretBurstFX(ci, big){
  const grid=document.getElementById('secret-grid');
  if(grid){
    // bàn cờ sáng lên một nhịp (restart animation)
    grid.classList.remove('board-flash'); void grid.offsetWidth; grid.classList.add('board-flash');
  }
  spawnBorderFireworks(ci, big);
}

function spawnBorderFireworks(ci, big){
  const fx=document.getElementById('sc-fx');
  const wrap=document.getElementById('grid-wrap');
  if(!fx||!wrap) return;
  fx.classList.add('active');
  const W=wrap.clientWidth, H=wrap.clientHeight;
  const base=(ci!=null && SECRET_COLORS[ci]) ? SECRET_COLORS[ci] : '#ffd24a';
  const palette=[base, base, '#ffd24a', '#ff7a3c', '#ffffff', '#ffe9a8', '#a8f0ff', '#ff88dd'];
  const N = big ? 40 : 22; // giảm còn một nửa để đỡ giật máy
  for(let i=0;i<N;i++){
    const side=i%4;
    const t=Math.random();
    let x,y,ang;
    // angles now point OUTWARD from the border
    if(side===0){ x=t*W; y=0;     ang=-90; }   // top → shoot upward
    else if(side===1){ x=W; y=t*H; ang=0;   }   // right → shoot right
    else if(side===2){ x=t*W; y=H; ang=90;  }   // bottom → shoot downward
    else           { x=0;   y=t*H; ang=180; }   // left → shoot left
    ang += Math.random()*50-25;                  // spread ±25°
    const dist=(big?55:35)+Math.random()*(big?90:60);
    const len =14+Math.random()*28;
    const dur =400+Math.random()*350;
    const col =palette[(Math.random()*palette.length)|0];
    const s=document.createElement('div');
    s.className='spark';
    s.style.left=x+'px'; s.style.top=y+'px';
    s.style.setProperty('--ang', ang+'deg');
    s.style.setProperty('--dist', dist+'px');
    s.style.setProperty('--len', len+'px');
    s.style.setProperty('--col', col);
    s.style.animationDuration=dur+'ms';
    fx.appendChild(s);
    setTimeout(()=>s.remove(), dur+60);
  }
}

function spawnContinuousBorderSparks(){
  const wrap=document.getElementById('grid-wrap');
  const cbDiv=document.getElementById('combo-border-sparks');
  if(!wrap||!cbDiv) return;
  const W=wrap.clientWidth, H=wrap.clientHeight;
  const streakColors=secretUltra
    ? ['#ffffff','#fffde0','#ffd700','#ffec5c','#fff5a0','#ffcc00']
    : ['#ffffff','#fffde0','#ffd700','#ffec5c','#fff5a0','#ffcc00'];
  const n = secretUltra ? 16 : 8;
  for(let i=0;i<n;i++){
    const side=Math.floor(Math.random()*4);
    const t=Math.random();
    let x,y,ang;
    if(side===0){      x=t*W; y=2;   ang=-90; }
    else if(side===1){ x=W-2; y=t*H; ang=0;   }
    else if(side===2){ x=t*W; y=H-2; ang=90;  }
    else             { x=2;   y=t*H; ang=180; }
    ang += Math.random()*120-60;
    const dist=20+Math.random()*50;
    const len=3+Math.random()*5;
    const dur=120+Math.random()*200;
    const col=streakColors[(Math.random()*streakColors.length)|0];
    const s=document.createElement('div');
    s.className='cb-spark';
    s.style.left=x+'px'; s.style.top=y+'px';
    s.style.setProperty('--ang', ang+'deg');
    s.style.setProperty('--dist', dist+'px');
    s.style.setProperty('--len', len+'px');
    s.style.setProperty('--col', col);
    s.style.setProperty('--dur', dur+'ms');
    cbDiv.appendChild(s);
    setTimeout(()=>s.remove(), dur+80);
  }
}

function spawnFireBorder(ultra){
  const wrap = document.getElementById('grid-wrap');
  const cbDiv = document.getElementById('combo-border-sparks');
  if(!wrap || !cbDiv) return;
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const lowCols  = ['#ff4400','#ff6600','#ff8800','#ffaa00','#ff2200'];
  const highCols = ['#ffffff','#ffff88','#ffee00','#ffcc00','#ff9900','#fffde0'];
  const cols = ultra ? highCols : lowCols;
  const count = ultra ? 8 : 4; // giảm số hạt để đỡ giật máy
  for(let i = 0; i < count; i++){
    const side = Math.floor(Math.random() * 4);
    const t = Math.random();
    let x, y;
    if(side===0){ x=t*W; y=0; }
    else if(side===1){ x=W; y=t*H; }
    else if(side===2){ x=t*W; y=H; }
    else { x=0; y=t*H; }

    const size = ultra ? (12+Math.random()*18) : (6+Math.random()*12);
    const dur  = ultra ? (0.5+Math.random()*0.5) : (0.4+Math.random()*0.4);
    const outward = ultra ? -(30+Math.random()*50) : -(15+Math.random()*30);
    const col = cols[Math.floor(Math.random()*cols.length)];
    const frot = (Math.random()*30-15)+'deg';

    const f = document.createElement('div');
    f.className = 'fire-particle';
    f.style.left   = x+'px';
    f.style.top    = y+'px';
    f.style.width  = size+'px';
    f.style.height = (size*1.6)+'px';
    f.style.background = `radial-gradient(ellipse at 50% 80%, ${col}, transparent 70%)`;
    f.style.filter = ultra ? 'blur(1px) brightness(2)' : 'blur(1.5px) brightness(1.4)';
    f.style.setProperty('--fdur', dur+'s');
    f.style.setProperty('--fdy', outward+'px');
    const fdx = (Math.random()*20-10)+'px';
    f.style.setProperty('--fdx', fdx);
    f.style.setProperty('--frot', frot);
    cbDiv.appendChild(f);
    setTimeout(()=>f.remove(), dur*1000+80);
  }
}

function updateFireBorder(){
  const wrap = document.getElementById('grid-wrap');
  if(!wrap) return;
  const wasHigh = wrap.classList.contains('fire-high');
  const wasLow  = wrap.classList.contains('fire-low');
  if(!secretMode){
    wrap.classList.remove('fire-low','fire-high');
    if(fireInterval){ clearInterval(fireInterval); fireInterval=null; }
    return;
  }
  if(secretStreak >= 4 || secretUltra){
    if(!wasHigh){
      wrap.classList.remove('fire-low'); wrap.classList.add('fire-high');
      if(fireInterval){ clearInterval(fireInterval); fireInterval=null; }
      fireInterval = setInterval(()=>{ if(secretMode) spawnFireBorder(true); }, 130);
    }
  } else if(secretStreak >= 1){
    if(!wasLow){
      wrap.classList.remove('fire-high'); wrap.classList.add('fire-low');
      if(fireInterval){ clearInterval(fireInterval); fireInterval=null; }
      fireInterval = setInterval(()=>{ if(secretMode) spawnFireBorder(false); }, 220);
    }
  } else {
    wrap.classList.remove('fire-low','fire-high');
    if(fireInterval){ clearInterval(fireInterval); fireInterval=null; }
  }
}

function secretSparkleBurst(group, ci){
  const root=document.getElementById('game-root'); if(!root) return;
  const rr=root.getBoundingClientRect();
  const col=(ci!=null && SECRET_COLORS[ci])?SECRET_COLORS[ci]:'#fff';
  let budget=22;                                   // trần tổng số tia (giữ mượt)
  const per = group.length>14 ? 1 : (group.length>7 ? 2 : 3);
  for(const [gr,gc] of group){
    if(budget<=0) break;
    const cell=getSC(gr,gc); if(!cell) continue;
    const cr=cell.getBoundingClientRect();
    const cx=cr.left-rr.left+cr.width/2, cy=cr.top-rr.top+cr.height/2;
    const n=Math.min(per,budget); budget-=n;
    for(let k=0;k<n;k++){
      const t=document.createElement('div'); t.className='twinkle';
      t.style.left=cx+'px'; t.style.top=cy+'px';
      const tc = k%3===0?'#fff':(k%3===1?col:'#ffe9a8');
      t.style.setProperty('--tc',tc);
      t.style.setProperty('--tx',(Math.random()*28-14)+'px');
      t.style.setProperty('--ty',(Math.random()*28-14)+'px');
      t.style.animationDelay=(Math.random()*0.12)+'s';
      root.appendChild(t);
      setTimeout(()=>t.remove(),740);
    }
  }
}

function secretColorRing(x,y,ci){
  const root=document.getElementById('game-root'); if(!root) return;
  const r=document.createElement('div'); r.className='cring';
  r.style.left=x+'px'; r.style.top=y+'px';
  r.style.setProperty('--cc',(ci!=null && SECRET_COLORS[ci])?SECRET_COLORS[ci]:'#fff');
  root.appendChild(r);
  setTimeout(()=>r.remove(),640);
}

function spawnSliceFx(x,y,juice,petals,ptA,ptB){
  const particles=[];
  // juice drops: burst outward in slash direction + random
  const slashAngle=Math.atan2(ptB.y-ptA.y,ptB.x-ptA.x);
  for(let i=0;i<18;i++){
    const ang=slashAngle + (Math.random()-0.5)*Math.PI*1.6;
    const spd=120+Math.random()*220;
    particles.push({
      type:'juice', x, y,
      vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd - 60,
      r:2+Math.random()*4,
      color:juice, life:0.38+Math.random()*0.22
    });
  }
  // petals: float upward slowly
  const petalColors=petals.length?petals:['#fff','#ffd'];
  for(let i=0;i<10;i++){
    const ang=-Math.PI*0.5+(Math.random()-0.5)*Math.PI;
    const spd=60+Math.random()*110;
    particles.push({
      type:'petal', x:x+(Math.random()-0.5)*30, y:y+(Math.random()-0.5)*20,
      vx:Math.cos(ang)*spd*(0.5+Math.random()), vy:-80-Math.random()*160,
      rot:Math.random()*Math.PI*2, rotSpeed:(Math.random()-0.5)*12,
      rx:4+Math.random()*7, ry:2+Math.random()*4,
      color:petalColors[Math.floor(Math.random()*petalColors.length)],
      life:0.55+Math.random()*0.35
    });
  }
  // slash line flash
  fruitFx.push({t:0, slashA:ptA, slashB:ptB, slashLife:0.12, particles});
}

function spawnBoomFx(x,y){
  const particles=[];
  for(let i=0;i<20;i++){
    const ang=Math.random()*Math.PI*2, spd=100+Math.random()*200;
    particles.push({type:'boom',x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r:3+Math.random()*5,color:'#f39c12',life:0.5});
  }
  fruitFx.push({t:0,particles,boom:true,boomX:x,boomY:y});
}

function spawnSwatParticles(x,y){
  const colors=['#FFD700','#FFA000','#FFEB3B','#FFF176','#FF8F00'];
  for(let i=0;i<10;i++){
    const a=(i/10)*Math.PI*2+Math.random()*0.5;
    const sp=60+Math.random()*100;
    beeParticles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.4+Math.random()*0.3,maxLife:0.4+Math.random()*0.3,size:2+Math.random()*3,color:colors[Math.floor(Math.random()*colors.length)],type:'star'});
  }
  beeParticles.push({x,y,vx:0,vy:0,life:0.35,maxLife:0.35,size:5,color:'#FFD700',type:'ring'});
}

function drawBeeParticles(ctx,dt){
  beeParticles.forEach(p=>{
    p.life-=dt;
    if(p.type==='star'){
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=80*dt;
      const alpha=Math.max(0,p.life/p.maxLife);
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.life*5); ctx.globalAlpha=alpha;
      beeDrawStar(ctx,0,0,p.size,p.size*0.4,4); ctx.fillStyle=p.color; ctx.fill();
      ctx.globalAlpha=1; ctx.restore();
    } else if(p.type==='ring'){
      const alpha=Math.max(0,p.life/p.maxLife);
      const r=(1-alpha)*35+5;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
      ctx.strokeStyle=p.color; ctx.globalAlpha=alpha*0.6; ctx.lineWidth=2; ctx.stroke(); ctx.globalAlpha=1;
    }
  });
  beeParticles=beeParticles.filter(p=>p.life>0);
}

function beeShowComboFloat(x,y,c){
  const el=document.createElement('div');
  el.className='bee-combo-float';
  el.textContent='x'+c+' +'+(10*Math.min(c,10));
  el.style.left=(x/360*100)+'%'; el.style.top=(y/460*100)+'%';
  document.getElementById('grid-wrap').appendChild(el);
  setTimeout(()=>el.remove(),800);
}

function gmSpawnDigFx(x,y,color){
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2+Math.random()*0.5, s=40+Math.random()*60;
    gmPts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,l:0.5,ml:0.5,size:2+Math.random()*2,color,type:'d'});
  }
}

function gmSpawnCatchFx(x,y){
  const cs=['#4FC3F7','#81D4FA','#E1F5FE','#FFF','#B3E5FC'];
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2, s=60+Math.random()*80;
    gmPts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,l:0.7,ml:0.7,size:2+Math.random()*3,color:cs[i%5],type:'s'});
  }
  gmPts.push({x,y,vx:0,vy:0,l:0.5,ml:0.5,size:10,color:'#4FC3F7',type:'r'});
}

function gmDrawParticles(ctx,dt){
  for(let i=gmPts.length-1;i>=0;i--){
    const p=gmPts[i]; p.l-=dt;
    if(p.l<=0){ gmPts.splice(i,1); continue; }
    if(p.type==='d' || p.type==='s'){
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=100*dt;
      const al=p.l/p.ml;
      ctx.save(); ctx.translate(p.x,p.y); ctx.globalAlpha=al;
      if(p.type==='s'){
        ctx.rotate(p.l*6); ctx.beginPath();
        for(let j=0;j<8;j++){ const r=j%2===0?p.size:p.size*0.4, a2=j/8*Math.PI*2-Math.PI/2; if(j===0) ctx.moveTo(Math.cos(a2)*r,Math.sin(a2)*r); else ctx.lineTo(Math.cos(a2)*r,Math.sin(a2)*r); }
        ctx.closePath();
      } else { ctx.beginPath(); ctx.arc(0,0,p.size,0,Math.PI*2); }
      ctx.fillStyle=p.color; ctx.fill(); ctx.globalAlpha=1; ctx.restore();
    } else if(p.type==='r'){
      const al2=p.l/p.ml, r2=(1-al2)*50+5;
      ctx.beginPath(); ctx.arc(p.x,p.y,r2,0,Math.PI*2);
      ctx.strokeStyle=p.color; ctx.globalAlpha=al2*0.5; ctx.lineWidth=2; ctx.stroke(); ctx.globalAlpha=1;
    }
  }
}

function showShockwave(x, y, level){
  const d=document.createElement('div');
  const i=pIdx(level);
  d.className='shockwave';
  d.style.left=x+'px'; d.style.top=y+'px';
  d.style.setProperty('--sw', (50+i*36)+'px');   // 50 → 338px
  d.style.setProperty('--swc', hexToRgba(PRAISE_COLOR[i], 0.7+i*0.03));
  document.getElementById('game-root').appendChild(d);
  setTimeout(()=>d.remove(), 600);
}

function updateComboBorderGlow(streak){
  const wrap=document.getElementById('grid-wrap');
  wrap.classList.remove('combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  if(streak>=8)      wrap.classList.add('combo-glow-5');
  else if(streak>=6) wrap.classList.add('combo-glow-4');
  else if(streak>=4) wrap.classList.add('combo-glow-3');
  else if(streak>=2) wrap.classList.add('combo-glow-2');
  else if(streak>=1) wrap.classList.add('combo-glow-1');
  // Re-render tiles với glow class mới (chỉ khi đang ở map ẩn)
  if(secretMode) renderSecretGrid();
  if(streak>=2) spawnComboBorderSparks(streak);
}

function spawnComboBorderSparks(streak){
  const cbs=document.getElementById('combo-border-sparks');
  const wrap=document.getElementById('grid-wrap');
  if(!cbs||!wrap) return;
  cbs.classList.add('active');
  const W=wrap.clientWidth+40, H=wrap.clientHeight+40;
  // Màu theo PRAISE_COLOR
  const palettes=[
    ['#5DCAA5','#a8f0da','#fff'],                          // streak 1: ngọc nhẹ
    ['#378ADD','#7fd3ff','#c0e8ff','#fff'],                // streak 2-3: xanh
    ['#7F77DD','#b0a8ff','#378ADD','#fff'],                // streak 4-5: tím
    ['#EF9F27','#ffe060','#ff9900','#fff'],                // streak 6-7: vàng
    ['#E24B4A','#ff88c8','#f7c948','#fff'],                // streak 8-9: đỏ-hồng
    ['#ff6b35','#f7c948','#D4537E','#7F77DD','#00e5ff','#fff'], // streak 10+: rainbow
  ];
  const pi = streak>=10?5:streak>=8?4:streak>=6?3:streak>=4?2:streak>=2?1:0;
  const palette=palettes[pi];
  const N = Math.min(4 + streak*4, 60);  // nhiều tia hơn ở combo cao
  for(let i=0;i<N;i++){
    const side=i%4; const t=Math.random();
    let x,y,ang;
    if(side===0){x=t*W;y=0;ang=70+Math.random()*40;}
    else if(side===1){x=W;y=t*H;ang=160+Math.random()*40;}
    else if(side===2){x=t*W;y=H;ang=-110+Math.random()*40;}
    else{x=0;y=t*H;ang=-20+Math.random()*40;}
    const dist=18+streak*2+Math.random()*40;
    const len=8+streak*1.5+Math.random()*18;
    const dur=(Math.max(0.25, 0.55-streak*0.02)+Math.random()*0.3)+'s';
    const col=palette[(Math.random()*palette.length)|0];
    const s=document.createElement('div'); s.className='cb-spark';
    s.style.left=x+'px'; s.style.top=y+'px';
    s.style.setProperty('--ang',ang+'deg');
    s.style.setProperty('--dist',dist+'px');
    s.style.setProperty('--len',len+'px');
    s.style.setProperty('--col',col);
    s.style.setProperty('--dur',dur);
    cbs.appendChild(s);
    setTimeout(()=>{ s.remove(); if(!cbs.children.length) cbs.classList.remove('active'); }, 900);
  }
}

function showComboCountFlash(n){
  if(n<2) return;
  const el=document.getElementById('combo-count-flash');
  el.textContent='Combo x'+n;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}


// ── Scenery dùng chung (chuyển từ map bee): nắng, mây, hoa — nhiều map dùng làm nền ──
function beeDrawSun(ctx,t){
  const sx=55, sy=50;
  const glow=ctx.createRadialGradient(sx,sy,8,sx,sy,70);
  glow.addColorStop(0,'rgba(255,240,120,0.5)'); glow.addColorStop(0.4,'rgba(255,220,80,0.15)'); glow.addColorStop(1,'rgba(255,200,50,0)');
  ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(sx,sy,70,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx,sy,18,0,Math.PI*2); ctx.fillStyle='#FFE566'; ctx.fill();
  ctx.beginPath(); ctx.arc(sx,sy,14,0,Math.PI*2); ctx.fillStyle='#FFF3B0'; ctx.fill();
  ctx.save(); ctx.translate(sx,sy); ctx.rotate(t*0.15);
  for(let i=0;i<10;i++){
    ctx.rotate(Math.PI/5); ctx.beginPath();
    ctx.moveTo(20,-1.5); ctx.lineTo(32+Math.sin(t*2.5+i)*4,0); ctx.lineTo(20,1.5);
    ctx.closePath(); ctx.fillStyle='rgba(255,230,80,0.4)'; ctx.fill();
  }
  ctx.restore();
}

function beeDrawCloud(ctx,x,y,s){
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  ctx.fillStyle='rgba(255,255,255,0.82)';
  [[0,0,18],[-16,4,13],[16,4,13],[-7,-7,12],[8,-5,14],[20,-2,10],[-20,0,10]].forEach(([cx,cy,r])=>{
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

function beeDrawTulip(ctx,s,color){
  for(let i=-1;i<=1;i++){
    ctx.beginPath(); ctx.ellipse(i*s*0.3,-s*0.3,s*0.35,s*0.6,i*0.25,0,Math.PI*2);
    ctx.fillStyle=color; ctx.fill();
  }
}

function beeDrawDaisy(ctx,s){
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2;
    ctx.save(); ctx.translate(Math.cos(a)*s*0.35,Math.sin(a)*s*0.35); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0,0,s*0.18,s*0.35,0,0,Math.PI*2);
    ctx.fillStyle='#FFF'; ctx.fill(); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0,0,s*0.2,0,Math.PI*2); ctx.fillStyle='#FFD700'; ctx.fill();
  ctx.beginPath(); ctx.arc(0,0,s*0.12,0,Math.PI*2); ctx.fillStyle='#FFA000'; ctx.fill();
}

function beeDrawRose(ctx,s,color){
  for(let i=0;i<5;i++){
    const a=(i/5)*Math.PI*2;
    ctx.beginPath(); ctx.ellipse(Math.cos(a)*s*0.15,Math.sin(a)*s*0.15,s*0.3,s*0.25,a,0,Math.PI*2);
    ctx.fillStyle=color; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(0,0,s*0.15,0,Math.PI*1.5);
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.stroke();
}

function beeDrawSunflower(ctx,s){
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2;
    ctx.save(); ctx.translate(Math.cos(a)*s*0.38,Math.sin(a)*s*0.38); ctx.rotate(a+0.3);
    ctx.beginPath(); ctx.ellipse(0,0,s*0.12,s*0.28,0,0,Math.PI*2);
    ctx.fillStyle='#FFD54F'; ctx.fill(); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0,0,s*0.25,0,Math.PI*2); ctx.fillStyle='#5D4037'; ctx.fill();
}

function beeDrawOneFlower(ctx,f,t){
  const sway=Math.sin(t*f.speed+f.phase)*2.5;
  ctx.save(); ctx.translate(f.x+sway,f.y);
  ctx.beginPath(); ctx.moveTo(0,0);
  ctx.quadraticCurveTo(sway*0.7,-f.stemH*0.5,sway*0.3,-f.stemH);
  ctx.strokeStyle='#388E3C'; ctx.lineWidth=1.8; ctx.stroke();
  ctx.save(); ctx.translate(sway*0.35,-f.stemH*0.45); ctx.rotate(0.4);
  ctx.beginPath(); ctx.ellipse(f.size*0.35,0,f.size*0.3,f.size*0.1,0,0,Math.PI*2);
  ctx.fillStyle='#4CAF50'; ctx.fill(); ctx.restore();
  ctx.translate(sway*0.3,-f.stemH);
  switch(f.type){
    case 'tulip': beeDrawTulip(ctx,f.size,f.color); break;
    case 'daisy': beeDrawDaisy(ctx,f.size); break;
    case 'rose': beeDrawRose(ctx,f.size,f.color); break;
    case 'sunflower': beeDrawSunflower(ctx,f.size); break;
  }
  ctx.restore();
}
