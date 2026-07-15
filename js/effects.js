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
    const frag=document.createDocumentFragment();
    const sparks=[];
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
      frag.appendChild(s);
      sparks.push([s,dur]);
    }
    fx.appendChild(frag); // 1 lần chèn DOM duy nhất thay vì N lần appendChild riêng lẻ
    sparks.forEach(([s,dur])=>{
      setTimeout(()=>{ s.remove(); if(!fx.children.length) fx.classList.remove('active'); }, dur+60);
    });
  }

  // 2) Tia lấp lánh tại từng ô nổ
  const root=document.getElementById('game-root'); if(!root) return;
  const rr=root.getBoundingClientRect();
  let budget=big?50:30;
  const per=cells.length>14?1:(cells.length>7?2:3);
  // Đọc vị trí TẤT CẢ ô cần hiệu ứng trước (1 lượt), rồi mới tạo/chèn phần tử (1 lượt).
  // TRƯỚC ĐÂY: đọc getBoundingClientRect() rồi appendChild() xen kẽ NGAY trong vòng lặp
  // — mỗi appendChild làm layout "bẩn", nên lần đọc kế tiếp lại buộc trình duyệt reflow
  // lại toàn trang (layout thrashing). Với cụm nổ nhiều ô (combo lớn) đây là chỗ dễ giật
  // đúng vào khoảnh khắc "đã tay" nhất của người chơi.
  const spots=[];
  for(const [gr,gc] of cells){
    if(budget<=0) break;
    const cell=getCell(gr,gc); if(!cell) continue;
    const cr=cell.getBoundingClientRect();
    const n=Math.min(per,budget); budget-=n;
    spots.push([cr.left-rr.left+cr.width/2, cr.top-rr.top+cr.height/2, n]);
  }
  const tFrag=document.createDocumentFragment();
  const twinkles=[];
  spots.forEach(([cx,cy,n])=>{
    for(let k=0;k<n;k++){
      const t=document.createElement('div'); t.className='twinkle';
      t.style.left=cx+'px'; t.style.top=cy+'px';
      const col2=k%3===0?'#fff':(k%3===1?baseColor:'#ffe9a8');
      t.style.setProperty('--tc',col2);
      t.style.setProperty('--tx',(Math.random()*28-14)+'px');
      t.style.setProperty('--ty',(Math.random()*28-14)+'px');
      t.style.animationDelay=(Math.random()*0.12)+'s';
      tFrag.appendChild(t);
      twinkles.push(t);
    }
  });
  root.appendChild(tFrag);
  twinkles.forEach(t=>setTimeout(()=>t.remove(),740));
}

function secretBurstFX(ci, big, streak){
  const grid=document.getElementById('secret-grid');
  if(grid){
    // bàn cờ sáng lên một nhịp (restart animation)
    grid.classList.remove('board-flash'); void grid.offsetWidth; grid.classList.add('board-flash');
  }
  const st = streak|| (typeof secretStreak==='number' ? secretStreak : 1);
  // Chỉ pháo sáng ở VIỀN — không nổ giữa bàn (rối mắt + giật)
  spawnBorderFireworks(ci, big || st>=3, st);
}

/** Điểm trên chu vi khung (t = 0..1), kèm góc bắn ra ngoài */
function perimeterPoint(W, H, t){
  const peri = 2*(W+H);
  let d = ((t%1)+1)%1 * peri;
  if(d < W) return { x:d, y:0, ang:-90 };
  d -= W;
  if(d < H) return { x:W, y:d, ang:0 };
  d -= H;
  if(d < W) return { x:W-d, y:H, ang:90 };
  d -= W;
  return { x:0, y:H-d, ang:180 };
}

let _sparklerT = 0;
/** Pháo hoa đốt chạy quanh viền (kiểu sparkler / ngòi cháy) */
function spawnSparklerBorder(){
  const wrap=document.getElementById('grid-wrap');
  const cbDiv=document.getElementById('combo-border-sparks');
  if(!wrap||!cbDiv||!secretMode) return;
  const W=wrap.clientWidth, H=wrap.clientHeight;
  if(W<8||H<8) return;
  cbDiv.classList.add('active');
  const ultra = secretUltra || secretStreak>=4;
  const speed = ultra ? 0.035 : 0.022;
  _sparklerT = (_sparklerT + speed) % 1;
  const heads = ultra ? 2 : 1;
  const cols = ultra
    ? ['#ffffff','#fffde0','#ffd700','#ffe566','#ff9900','#ffec5c']
    : ['#fff8c8','#ffd700','#ffec5c','#ffffff','#ffb000'];
  const frag=document.createDocumentFragment();
  const doomed=[];
  for(let h=0;h<heads;h++){
    const baseT = (_sparklerT + h*0.5) % 1;
    const nTrail = ultra ? 5 : 3;
    for(let k=0;k<nTrail;k++){
      const pt = perimeterPoint(W, H, baseT - k*0.012);
      const ang = pt.ang + (Math.random()*70-35);
      const dist = (ultra?22:14) + Math.random()*(ultra?48:32);
      const len = (ultra?5:3) + Math.random()*7;
      const dur = 140 + Math.random()*180;
      const s=document.createElement('div');
      s.className='cb-spark sparkler-spark';
      s.style.left=pt.x+'px'; s.style.top=pt.y+'px';
      s.style.setProperty('--ang', ang+'deg');
      s.style.setProperty('--dist', dist+'px');
      s.style.setProperty('--len', len+'px');
      s.style.setProperty('--col', cols[(Math.random()*cols.length)|0]);
      s.style.setProperty('--dur', dur+'ms');
      frag.appendChild(s);
      doomed.push([s, dur]);
    }
    // đốm đầu ngòi cháy
    const head=perimeterPoint(W,H,baseT);
    const tip=document.createElement('div');
    tip.className='sparkler-head';
    tip.style.left=head.x+'px'; tip.style.top=head.y+'px';
    frag.appendChild(tip);
    doomed.push([tip, 160]);
  }
  cbDiv.appendChild(frag);
  doomed.forEach(([el,dur])=>setTimeout(()=>{
    el.remove();
    if(!cbDiv.children.length) cbDiv.classList.remove('active');
  }, dur+40));
}

function spawnBorderFireworks(ci, big, streak){
  const fx=document.getElementById('sc-fx');
  const wrap=document.getElementById('grid-wrap');
  if(!fx||!wrap) return;
  fx.classList.add('active');
  const W=wrap.clientWidth, H=wrap.clientHeight;
  const st = streak||1;
  const base=(ci!=null && SECRET_COLORS[ci]) ? SECRET_COLORS[ci] : '#ffd24a';
  const palette=[base, base, '#ffd24a', '#ff7a3c', '#ffffff', '#ffe9a8', '#a8f0ff', '#ff88dd'];
  // Combo cao → nhiều tia hơn ở VIỀN (không nổ giữa)
  const N = big ? Math.min(28 + st*3, 48) : Math.min(16 + st*2, 28);
  const frag=document.createDocumentFragment();
  const doomed=[];
  for(let i=0;i<N;i++){
    const side=i%4;
    const t=Math.random();
    let x,y,ang;
    if(side===0){ x=t*W; y=0;     ang=-90; }
    else if(side===1){ x=W; y=t*H; ang=0;   }
    else if(side===2){ x=t*W; y=H; ang=90;  }
    else           { x=0;   y=t*H; ang=180; }
    ang += Math.random()*50-25;
    const dist=(big?60:35)+Math.random()*(big?100:60)+st*3;
    const len =14+Math.random()*28+st;
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
    frag.appendChild(s);
    doomed.push([s,dur]);
  }
  fx.appendChild(frag);
  doomed.forEach(([s,dur])=>setTimeout(()=>{
    s.remove();
    if(!fx.children.length) fx.classList.remove('active');
  }, dur+60));
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
      // Pháo hoa đốt chạy quanh viền + hạt lửa phụ
      fireInterval = setInterval(()=>{
        if(!secretMode) return;
        spawnSparklerBorder();
        spawnFireBorder(true);
      }, 55);
    }
  } else if(secretStreak >= 1){
    if(!wasLow){
      wrap.classList.remove('fire-high'); wrap.classList.add('fire-low');
      if(fireInterval){ clearInterval(fireInterval); fireInterval=null; }
      fireInterval = setInterval(()=>{
        if(!secretMode) return;
        spawnSparklerBorder();
        if(Math.random()<0.45) spawnFireBorder(false);
      }, 70);
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

// ── Mốc điểm tròn: confetti rơi + banner ăn mừng lớn giữa màn hình ──
function spawnConfetti(){
  const layer=document.getElementById('milestone-confetti');
  if(!layer) return;
  const wrap=document.getElementById('grid-wrap');
  const W=(wrap&&wrap.clientWidth)||360, H=(wrap&&wrap.clientHeight)||500;
  const colors=['#ffd700','#ff7a3c','#5DCAA5','#378ADD','#ab47bc','#f7c948','#E24B4A','#ffffff'];
  const N=42;
  for(let i=0;i<N;i++){
    const p=document.createElement('div'); p.className='confetti-piece';
    const size=6+Math.random()*7;
    const round=Math.random()<0.5;
    p.style.width=size+'px'; p.style.height=(round?size:size*1.6)+'px';
    if(round) p.style.borderRadius='50%';
    p.style.left=(Math.random()*W)+'px';
    p.style.background=colors[(Math.random()*colors.length)|0];
    const fall=(H*0.9)+Math.random()*H*0.4;
    const drift=(Math.random()*160-80);
    const spin=(Math.random()*720-360);
    const dur=1400+Math.random()*900;
    p.style.setProperty('--fall',fall+'px');
    p.style.setProperty('--drift',drift+'px');
    p.style.setProperty('--spin',spin+'deg');
    p.style.animationDuration=dur+'ms';
    p.style.animationDelay=(Math.random()*250)+'ms';
    layer.appendChild(p);
    setTimeout(()=>p.remove(), dur+300);
  }
}

function showMilestoneBanner(scoreValue, text){
  const banner=document.getElementById('milestone-banner');
  if(!banner) return;
  document.getElementById('milestone-score').textContent=scoreValue.toLocaleString()+' điểm!';
  document.getElementById('milestone-text').textContent=text;
  spawnConfetti();
  try{ sfxScoreMilestone(); }catch(e){ try{ sfxStreak(5); }catch(e2){} }
  banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
  setTimeout(()=>banner.classList.remove('show'), 2250);
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

// ═══════════════════════════════════════════════════════════════
// NỀN PASTEL DÙNG CHUNG + ĐIỂM BAY / CÂU KHEN (tách từ main.js — đều là hiệu ứng)
// ═══════════════════════════════════════════════════════════════
/* ── Nền pastel dễ thương dùng chung — cùng phong cách Map ẩn 4 (vườn ong) ── */
function cuteDayBg(ctx,W,H,t){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#7EC8E3'); g.addColorStop(0.4,'#ADE0F2'); g.addColorStop(0.75,'#D4F0FF'); g.addColorStop(1,'#E8F8E0');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  beeDrawSun(ctx,t);
  beeDrawCloud(ctx,110+Math.sin(t*0.08)*18,42,1.0);
  beeDrawCloud(ctx,260+Math.sin(t*0.06+1)*22,70,0.7);
  beeDrawCloud(ctx,185+Math.sin(t*0.1+3)*14,112,0.5);
}
// Bản đêm nhưng vẫn dễ thương: tím lavender pastel + trăng cười má hồng + sao kẹo ngọt
function cuteNightBg(ctx,W,H,t){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#4a3f7e'); g.addColorStop(0.5,'#6a55a2'); g.addColorStop(1,'#9878c8');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for(let i=0;i<26;i++){
    const sx=(Math.sin(i*137.5)*0.5+0.5)*W;
    const sy=(Math.cos(i*97.3)*0.5+0.5)*H*0.85;
    const tw=0.35+0.35*Math.sin(t*2+i*1.7);
    ctx.fillStyle=['rgba(255,240,200,','rgba(255,210,230,','rgba(220,235,255,'][i%3]+tw+')';
    ctx.beginPath(); ctx.arc(sx,sy,1+(i%3)*0.5,0,Math.PI*2); ctx.fill();
  }
  const mx=W*0.82,my=H*0.12;
  ctx.save();
  ctx.shadowColor='rgba(255,240,180,0.7)'; ctx.shadowBlur=18;
  ctx.fillStyle='#FFF3B0';
  ctx.beginPath(); ctx.arc(mx,my,19,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle='#b8934a'; ctx.lineWidth=1.6; ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(mx-7,my-3,3.2,Math.PI*1.15,Math.PI*1.85); ctx.stroke(); // mắt trái nhắm cười
  ctx.beginPath(); ctx.arc(mx+7,my-3,3.2,Math.PI*1.15,Math.PI*1.85); ctx.stroke(); // mắt phải
  ctx.beginPath(); ctx.arc(mx,my+4,5.5,0.25,Math.PI-0.25); ctx.stroke();           // miệng cười
  ctx.fillStyle='rgba(255,150,160,0.5)';
  ctx.beginPath(); ctx.arc(mx-11,my+4,2.6,0,Math.PI*2); ctx.fill();                 // má hồng
  ctx.beginPath(); ctx.arc(mx+11,my+4,2.6,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.globalAlpha=0.32;
  beeDrawCloud(ctx,90+Math.sin(t*0.07)*16,66,0.8);
  beeDrawCloud(ctx,250+Math.sin(t*0.05+2)*20,105,0.6);
  ctx.restore();
}

// Dải vườn dễ thương sát đáy canvas: đồi cỏ 2 lớp + hoa lắc lư + bướm (phong cách Map ẩn 4)
let cuteFlowerCache=null;
function cuteGardenStrip(ctx,W,H,t,baseY,withButterflies=true){
  ['#5EB862','#4CAF50'].forEach((col,li)=>{
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.moveTo(0,H);
    for(let x=0;x<=W;x+=8){
      const y=baseY+li*8+Math.sin(x*0.03+li*1.3)*6;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
  });
  if(!cuteFlowerCache) cuteFlowerCache=[
    {x:0.08,type:'tulip',color:'#FF6FA5',size:9,stemH:16,speed:1.1,phase:0.5},
    {x:0.24,type:'daisy',size:8,stemH:13,speed:1.4,phase:2.1},
    {x:0.42,type:'rose',color:'#FF8FB8',size:8,stemH:15,speed:0.9,phase:4.0},
    {x:0.60,type:'sunflower',size:9,stemH:18,speed:1.2,phase:1.2},
    {x:0.78,type:'tulip',color:'#C58FFF',size:8,stemH:14,speed:1.3,phase:3.3},
    {x:0.93,type:'daisy',size:7,stemH:12,speed:1.5,phase:5.1},
  ];
  cuteFlowerCache.forEach(f=>{ beeDrawOneFlower(ctx,{...f,x:f.x*W,y:H-4},t); });
  if(withButterflies){
    ctx.font='13px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🦋', W*0.3+Math.sin(t*0.9)*W*0.22, baseY-24+Math.sin(t*2.1)*10);
    ctx.fillText('🦋', W*0.7+Math.sin(t*0.7+2)*W*0.2, baseY-38+Math.sin(t*1.7+1)*12);
  }
}

function roundRect(ctx,x,y,w,h,r){
  r=Math.min(r||0,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

/* ── Ô plush / pom-pom lông xù (canvas) — giống ảnh tham chiếu ── */
function drawSoftCandyCell(ctx,x,y,w,h,color,opts){
  const o=opts||{};
  const r=o.r!=null?o.r:Math.min(w,h)*0.28;
  const cx=x+w/2, cy=y+h/2;
  ctx.save();
  // bóng đổ mềm dưới chân
  ctx.shadowColor='rgba(40,25,10,0.28)';
  ctx.shadowBlur=Math.max(4,Math.min(w,h)*0.18);
  ctx.shadowOffsetY=Math.max(2,h*0.06);
  roundRect(ctx,x,y,w,h,r);
  ctx.fillStyle=color; ctx.fill();
  ctx.shadowBlur=0; ctx.shadowOffsetY=0;

  // lõi sáng mềm (không phủ đen cứng)
  const core=ctx.createRadialGradient(cx-w*0.12,cy-h*0.18,0,cx,cy,Math.max(w,h)*0.7);
  core.addColorStop(0,'rgba(255,255,255,0.4)');
  core.addColorStop(0.5,'rgba(255,255,255,0.08)');
  core.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=core; roundRect(ctx,x,y,w,h,r); ctx.fill();

  // sợi lông xù quanh viền (nhiều hơn)
  const fibers=o.fibers!=null?o.fibers:Math.max(48,Math.floor((w+h)*1.45));
  const seed=((x*12.9898+y*78.233)|0);
  ctx.strokeStyle=color; ctx.lineCap='round';
  for(let i=0;i<fibers;i++){
    const a=(i/fibers)*Math.PI*2 + ((seed+i*17)%10)*0.02;
    const wobble=0.85+(((seed*i)%7)/20);
    const len=(Math.min(w,h)*0.14+((i*3)%6))*wobble;
    const inset=Math.min(w,h)*0.38;
    const sx=cx+Math.cos(a)*inset;
    const sy=cy+Math.sin(a)*inset;
    const ex=cx+Math.cos(a)*(inset+len);
    const ey=cy+Math.sin(a)*(inset+len);
    ctx.globalAlpha=0.4+((i%5)*0.1);
    ctx.lineWidth=1.1+(i%3===0?1:0.2);
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
  }
  // đốm sợi bên trong
  ctx.fillStyle='rgba(255,255,255,0.4)';
  for(let i=0;i<16;i++){
    const px=x+w*(0.15+((seed+i*13)%75)/100*0.7);
    const py=y+h*(0.15+((seed+i*29)%75)/100*0.7);
    ctx.globalAlpha=0.28+((i%4)*0.1);
    ctx.beginPath(); ctx.arc(px,py,0.8+(i%3)*0.45,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
  // halo lông màu ngoài — mỏng, ít mờ
  if(o.glow!==false){
    ctx.strokeStyle=color; ctx.globalAlpha=0.2;
    ctx.lineWidth=Math.max(1.5,Math.min(w,h)*0.07);
    roundRect(ctx,x-1,y-1,w+2,h+2,r+1); ctx.stroke();
    ctx.globalAlpha=1;
  }
  ctx.restore();
}

/* ── Đồi + hàng rào + sân vườn đầy đủ (cùng chất lượng Map 4) ── */
function scenicHills(ctx,W,H,baseY){
  const y=baseY!=null?baseY:H*0.56;
  ctx.beginPath(); ctx.moveTo(-10,y);
  ctx.bezierCurveTo(W*0.15,y-H*0.14,W*0.35,y-H*0.08,W*0.5,y-H*0.03);
  ctx.bezierCurveTo(W*0.7,y-H*0.12,W*0.85,y-H*0.1,W+10,y-H*0.04);
  ctx.lineTo(W+10,y+H*0.06); ctx.lineTo(-10,y+H*0.06); ctx.closePath();
  ctx.fillStyle='#7EC882'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10,y+H*0.03);
  ctx.bezierCurveTo(W*0.2,y-H*0.04,W*0.45,y-H*0.01,W*0.65,y-H*0.03);
  ctx.bezierCurveTo(W*0.8,y-H*0.06,W*0.95,y-H*0.02,W+10,y);
  ctx.lineTo(W+10,y+H*0.1); ctx.lineTo(-10,y+H*0.1); ctx.closePath();
  ctx.fillStyle='#5EB862'; ctx.fill();
}
function scenicGrass(ctx,W,H,fromY){
  const y=fromY!=null?fromY:H*0.56;
  const g=ctx.createLinearGradient(0,y,0,H);
  g.addColorStop(0,'#4CAF50'); g.addColorStop(0.35,'#43A047');
  g.addColorStop(0.7,'#388E3C'); g.addColorStop(1,'#2E7D32');
  ctx.fillStyle=g; ctx.fillRect(0,y,W,H-y);
}
function scenicFence(ctx,W,H,fy){
  const y=fy!=null?fy:H*0.93, posts=7, pw=6, ph=28, spacing=W/(posts+1);
  ctx.fillStyle='#A0784A'; ctx.fillRect(0,y-18,W,4); ctx.fillRect(0,y-6,W,4);
  for(let i=1;i<=posts;i++){
    const px=spacing*i-pw/2;
    ctx.fillStyle='#8B6539'; ctx.fillRect(px,y-ph,pw,ph);
    ctx.beginPath(); ctx.moveTo(px,y-ph); ctx.lineTo(px+pw/2,y-ph-5); ctx.lineTo(px+pw,y-ph); ctx.closePath();
    ctx.fillStyle='#7A5830'; ctx.fill();
  }
}
// Nền ngày đầy đủ kiểu Map 4: trời + đồi + cỏ + hàng rào + hoa (dùng cho map còn phẳng)
function scenicDayFull(ctx,W,H,t,opts){
  const o=opts||{};
  cuteDayBg(ctx,W,H,t);
  const hillY=o.hillY!=null?o.hillY:H*0.58;
  scenicHills(ctx,W,H,hillY);
  scenicGrass(ctx,W,H,hillY);
  if(o.fence!==false) scenicFence(ctx,W,H,o.fenceY!=null?o.fenceY:H*0.94);
  cuteGardenStrip(ctx,W,H,t,o.stripY!=null?o.stripY:H-10,o.butterflies!==false);
}
// Nền đêm giàu hơn: nebulas + sao lấp lánh + mây tím
function scenicNightFull(ctx,W,H,t){
  cuteNightBg(ctx,W,H,t);
  // sương mù đáy ấm
  const mist=ctx.createLinearGradient(0,H*0.7,0,H);
  mist.addColorStop(0,'rgba(152,120,200,0)'); mist.addColorStop(1,'rgba(80,50,120,0.35)');
  ctx.fillStyle=mist; ctx.fillRect(0,H*0.7,W,H*0.3);
  // đồi đêm silhouette
  ctx.fillStyle='rgba(40,30,70,0.45)';
  ctx.beginPath(); ctx.moveTo(0,H);
  for(let x=0;x<=W;x+=10) ctx.lineTo(x, H*0.78+Math.sin(x*0.02)*10);
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
}
// Sân khấu tiệc ánh sáng (Rhythm) — vẫn cùng ngôn ngữ pastel Map 4
function scenicPartyBg(ctx,W,H,t){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#FF9AD5'); bg.addColorStop(0.35,'#C58BFF');
  bg.addColorStop(0.7,'#7EC8E3'); bg.addColorStop(1,'#B8F0C8');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  beeDrawSun(ctx,t);
  beeDrawCloud(ctx,90+Math.sin(t*0.1)*14,48,0.85);
  beeDrawCloud(ctx,250+Math.sin(t*0.07+1)*18,72,0.65);
  // confetti bay
  for(let i=0;i<18;i++){
    const x=(Math.sin(i*41.3+t*0.4)*0.5+0.5)*W;
    const y=((i*37+t*40)%(H+20))-10;
    ctx.fillStyle=['#FF6B8A','#FFD700','#7EC8E3','#C58FFF','#FF8C42'][i%5];
    ctx.save(); ctx.translate(x,y); ctx.rotate(t+i);
    ctx.fillRect(-3,-2,6,4); ctx.restore();
  }
  scenicHills(ctx,W,H,H*0.72);
  scenicGrass(ctx,W,H,H*0.72);
  cuteGardenStrip(ctx,W,H,t,H-8,true);
}
// Bão lũ giàu chi tiết (Map 22)
function scenicStormBg(ctx,W,H,t){
  const sky=ctx.createLinearGradient(0,0,0,H*0.32);
  sky.addColorStop(0,'#1a2238'); sky.addColorStop(0.6,'#2c3d5c'); sky.addColorStop(1,'#4a5f7a');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H*0.32);
  // mây bão
  ctx.fillStyle='rgba(30,40,60,0.55)';
  [[60,40,50],[160,28,60],[260,48,55],[320,35,40]].forEach(([x,y,r],i)=>{
    ctx.beginPath(); ctx.ellipse(x+Math.sin(t*0.3+i)*6,y,r,r*0.45,0,0,Math.PI*2); ctx.fill();
  });
  // nước lũ đục
  const water=ctx.createLinearGradient(0,H*0.28,0,H);
  water.addColorStop(0,'#8B7355'); water.addColorStop(0.4,'#6B5330'); water.addColorStop(1,'#3A2C18');
  ctx.fillStyle=water; ctx.fillRect(0,H*0.28,W,H*0.72);
  // gợn sóng nhiều lớp
  for(let layer=0;layer<4;layer++){
    ctx.strokeStyle=`rgba(255,255,255,${0.08+layer*0.03})`; ctx.lineWidth=2;
    const y0=H*0.34+layer*38;
    ctx.beginPath();
    for(let x=0;x<=W;x+=8){
      const yy=y0+Math.sin((x+t*70+layer*40)*0.045)*5;
      x===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy);
    }
    ctx.stroke();
  }
}

/* ══════════════════════════════════════════
   ĐIỂM BAY + CÂU KHEN + HIỆU ỨNG PHÁT SÁNG
══════════════════════════════════════════ */
const PRAISE = ['COOL','GOOD','GREAT','IMPRESSIVE','AMAZING','PERFECT','SPECTACULAR','UNREAL','LEGENDARY','GODLIKE'];
// Colors escalate: teal → blue → purple → gold → red → pink → blaze → fire
const PRAISE_COLOR = ['#5DCAA5','#378ADD','#7F77DD','#4dd0e1','#ab47bc','#EF9F27','#E24B4A','#D4537E','#f7c948','#ff6b35'];
// level = số lần nổ liên tiếp (combo streak). Kiểu Block Blast: lần nổ ĐẦU TIÊN (streak 1)
// chỉ là 1 pha bình thường, chưa tính là combo nên KHÔNG có câu khen — câu khen chỉ bắt đầu
// từ lần nổ liên tiếp thứ 2 trở đi (streak 2 → 'COOL', streak 3 → 'GOOD', ...).
function pIdx(level){ return Math.min(Math.max((level||1)-1,1),PRAISE.length)-1; }

function hexToRgba(hex,a){
  const n=parseInt(hex.replace('#',''),16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

// Trọng tâm (theo toạ độ #game-root) của các ô vừa phá
function clearCentroid(coords, getter){
  const root=document.getElementById('game-root').getBoundingClientRect();
  let sx=0,sy=0,n=0;
  coords.forEach(([r,c])=>{
    const el=getter(r,c);
    if(el){ const b=el.getBoundingClientRect(); sx+=b.left+b.width/2-root.left; sy+=b.top+b.height/2-root.top; n++; }
  });
  const gw=document.getElementById('grid-wrap').getBoundingClientRect();
  if(!n) return { x: gw.left-root.left+gw.width/2, y: gw.top-root.top+gw.height/2 };
  return { x: sx/n, y: sy/n };
}

// "+N" điểm bay lên ngay tại chỗ phá — tách riêng điểm GỐC (trắng) và điểm THƯỞNG combo (màu, nếu có nhân)
function showScorePop(basePoints, totalPoints, x, y, level){
  const i=pIdx(level);
  const bonus=Math.round(totalPoints-basePoints);

  // 1) Điểm gốc — luôn trắng, cỡ cố định, bay lên ngay lập tức
  const d=document.createElement('div');
  d.className='score-pop';
  d.textContent='+'+Math.round(basePoints);
  d.style.left=x+'px'; d.style.top=y+'px';
  d.style.fontSize='22px';
  d.style.color='#fff';
  d.style.textShadow='0 2px 8px rgba(0,0,0,0.7)';
  document.getElementById('game-root').appendChild(d);
  setTimeout(()=>d.remove(), 950);

  // 2) Điểm thưởng combo — chỉ hiện khi có nhân (x2/x3...), bay chậm hơn 1 nhịp, màu theo cấp khen
  if(bonus>0){
    const b=document.createElement('div');
    b.className='score-pop score-pop-bonus';
    b.textContent='+'+bonus+' 🔥 combo';
    b.style.left=x+'px'; b.style.top=(y+30)+'px';
    b.style.fontSize=(18+i*3)+'px';
    b.style.color=i>=2?PRAISE_COLOR[i]:'#ffd24a';
    b.style.textShadow=i>=5
      ? `0 2px 8px rgba(0,0,0,0.7), 0 0 ${10+i*4}px ${PRAISE_COLOR[i]}`
      : '0 2px 8px rgba(0,0,0,0.7)';
    document.getElementById('game-root').appendChild(b);
    setTimeout(()=>b.remove(), 1150);
  }
}

// Vòng sáng nổ — to & sáng dần theo level

/* ── Viền toả sáng lấp lánh theo combo — cả map thường lẫn map ẩn ── */


// Câu khen leo thang mạnh dần theo 9 cấp độ
function showPraise(level){
  const el=document.getElementById('combo-flash');
  const i=pIdx(level);
  const c=PRAISE_COLOR[i];
  el.textContent=PRAISE[i]+'!';
  el.style.color=c;

  // Lồng tiếng
  speakPraise(level);

  // Font size: nhỏ ở COOL, siêu to ở GODLIKE
  const base=22+i*9;  // 22 → 94px
  const maxW=(document.getElementById('grid-wrap').clientWidth||360)*0.88;
  const fit=maxW/(el.textContent.length*0.62);
  el.style.fontSize=Math.max(18, Math.min(base, fit))+'px';

  // Text shadow: ngày càng nhiều lớp & sáng hơn
  const g=i>=7?'drop-shadow(0 0 '+(i*6)+'px '+c+') ':'';
  el.style.filter=g;
  if(i<=1){
    el.style.textShadow=`0 1px 8px ${hexToRgba(c,0.7)}`;
  } else if(i<=3){
    el.style.textShadow=`0 2px 12px ${hexToRgba(c,0.9)}, 0 0 ${20+i*8}px ${hexToRgba(c,0.6)}`;
  } else if(i<=5){
    el.style.textShadow=`0 2px 16px ${hexToRgba(c,1)}, 0 0 ${30+i*10}px ${hexToRgba(c,0.8)}, 0 0 ${60+i*14}px ${hexToRgba(c,0.35)}`;
  } else {
    el.style.textShadow=`0 0 10px #fff, 0 2px 20px ${hexToRgba(c,1)}, 0 0 ${50+i*12}px ${hexToRgba(c,0.9)}, 0 0 ${100+i*18}px ${hexToRgba(c,0.5)}, 0 0 ${160+i*22}px ${hexToRgba(c,0.25)}`;
  }

  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');

  // Screen shake at LEGENDARY(7) and GODLIKE(8)
  if(i>=7){
    const root=document.getElementById('game-root');
    root.classList.remove('screen-shake');
    void root.offsetWidth;
    root.classList.add('screen-shake');
    setTimeout(()=>root.classList.remove('screen-shake'), 500);
  }
}
