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
    const N = big ? 32 : 18;
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
  let budget=big?28:16;
  const per=cells.length>14?1:(cells.length>7?1:2);
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
    const p=toGameRootXY(cr.left+cr.width/2, cr.top+cr.height/2);
    const n=Math.min(per,budget); budget-=n;
    spots.push([p.x, p.y, n]);
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

  // 3) Vài bông hoa nhỏ tung ra từ các ô vừa phá (map thường)
  try{ spawnClearFlowers(cells); }catch(e){}
}

function secretBurstFX(ci, big, streak){
  // Map ẩn 1: không burst pháo/tia DOM — chỉ CSS glow qua updateFireBorder.
  return;
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
/**
 * Map ẩn 1: đã bỏ chùm tia sparkler DOM (gây lag nặng ở combo cao).
 * Giữ hàm no-op + dọn particle còn sót để chỗ gọi cũ không vỡ.
 */

function spawnSparklerBorder(){
  const cbDiv=document.getElementById('combo-border-sparks');
  if(!cbDiv) return;
  if(cbDiv.childElementCount){
    cbDiv.innerHTML='';
    cbDiv.classList.remove('active');
  }
}

function spawnBorderFireworks(ci, big, streak){
  const fx=document.getElementById('sc-fx');
  const wrap=document.getElementById('grid-wrap');
  if(!fx||!wrap) return;
  if(fx.childElementCount > 36) return; // tránh chồng pháo khi spam nổ
  fx.classList.add('active');
  const W=wrap.clientWidth, H=wrap.clientHeight;
  const st = streak||1;
  const base=(ci!=null && SECRET_COLORS[ci]) ? SECRET_COLORS[ci] : '#ffd24a';
  const palette=[base, '#ffd24a', '#ff7a3c', '#ffffff', '#ffe9a8'];
  const N = big ? Math.min(16 + st*2, 28) : Math.min(10 + st, 18);
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
    ang += Math.random()*40-20;
    const dist=(big?48:28)+Math.random()*(big?70:42);
    const len =12+Math.random()*18;
    const dur =360+Math.random()*280;
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
  // Dừng interval + dọn tia DOM (không còn spawn particle — chỉ CSS glow)
  if(fireInterval){ clearInterval(fireInterval); fireInterval=null; }
  spawnSparklerBorder();
  if(!secretMode){
    wrap.classList.remove('fire-low','fire-mid','fire-high','fire-max');
    return;
  }
  const st = Math.max(0, (typeof secretStreak==='number' ? secretStreak : 0)|0);
  let cls = '';
  if(st >= 12 || secretUltra) cls = 'fire-max';
  else if(st >= 8) cls = 'fire-high';
  else if(st >= 5) cls = 'fire-mid';
  else if(st >= 1) cls = 'fire-low';

  ['fire-low','fire-mid','fire-high','fire-max'].forEach(c=>{
    if(c !== cls) wrap.classList.remove(c);
  });
  if(cls) wrap.classList.add(cls);
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

/** Hiện điểm thật vừa cộng (1 ong = 1đ; ×2 → +2; ×3 → +3) — khớp score+=pts */

function beeShowComboFloat(x,y,mult,pts){
  const el=document.createElement('div');
  el.className='bee-combo-float';
  const m=(mult|0)>1?mult:1;
  const p=Math.max(1, pts|0);
  el.textContent=(m>1?('x'+m+' '):'')+'+'+p;
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
  // Map ẩn 1: không spawn tia DOM ở viền (tránh lag)
  if(streak>=2 && !secretMode) spawnComboBorderSparks(streak);
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
  const N = Math.min(4 + streak*3, 36);  // đủ cảm giác combo, tránh tạo quá nhiều DOM
  const frag=document.createDocumentFragment();
  const sparks=[];
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
    frag.appendChild(s);
    sparks.push(s);
  }
  cbs.appendChild(frag);
  sparks.forEach(s=>setTimeout(()=>{ s.remove(); if(!cbs.children.length) cbs.classList.remove('active'); }, 900));
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
  const N=24;
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

const PRAISE = ['COOL','GOOD','GREAT','IMPRESSIVE','AMAZING','PERFECT','SPECTACULAR','UNREAL','LEGENDARY'];
// Colors escalate: teal → blue → purple → gold → red → pink → blaze → fire

const PRAISE_COLOR = ['#5DCAA5','#378ADD','#7F77DD','#4dd0e1','#ab47bc','#EF9F27','#E24B4A','#D4537E','#f7c948'];
// level = số lần nổ liên tiếp (combo streak). Hiệu ứng glow khi ghép combo: lần nổ ĐẦU TIÊN (streak 1)
// chỉ là 1 pha bình thường, chưa tính là combo nên KHÔNG có câu khen — câu khen chỉ bắt đầu
// từ lần nổ liên tiếp thứ 2 trở đi (streak 2 → 'COOL', streak 3 → 'GOOD', ...).

function pIdx(level){ return Math.min(Math.max((level||1)-1,1),PRAISE.length)-1; }

function hexToRgba(hex,a){
  const n=parseInt(hex.replace('#',''),16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

/** Tỷ lệ scale hiện tại của #game-root (fitGameRoot). getBoundingClientRect đã nhân scale,
 *  còn left/top của con absolute vẫn theo hệ chưa scale — phải chia lại. */

function gameRootScale(){
  const root=document.getElementById('game-root');
  if(!root) return 1;
  const w=root.offsetWidth;
  if(!w) return 1;
  const rw=root.getBoundingClientRect().width;
  return (rw/w) || 1;
}

/** Viewport client → toạ độ cục bộ trong #game-root (đã bù scale). */

function toGameRootXY(clientX, clientY){
  const root=document.getElementById('game-root');
  if(!root) return { x:0, y:0 };
  const r=root.getBoundingClientRect();
  const s=gameRootScale() || 1;
  return { x:(clientX - r.left)/s, y:(clientY - r.top)/s };
}

// Trọng tâm (theo toạ độ #game-root) của các ô vừa phá

function clearCentroid(coords, getter){
  let sx=0,sy=0,n=0;
  coords.forEach(([r,c])=>{
    const el=getter(r,c);
    if(el){
      const b=el.getBoundingClientRect();
      const p=toGameRootXY(b.left+b.width/2, b.top+b.height/2);
      sx+=p.x; sy+=p.y; n++;
    }
  });
  if(!n){
    const gw=document.getElementById('grid-wrap');
    if(!gw) return { x:160, y:240 };
    const b=gw.getBoundingClientRect();
    return toGameRootXY(b.left+b.width/2, b.top+b.height/2);
  }
  return { x: sx/n, y: sy/n };
}

// "+N" điểm bay lên ngay tại chỗ phá — tách riêng điểm GỐC (trắng) và điểm THƯỞNG combo (màu, nếu có nhân)

function showScorePop(basePoints, totalPoints, x, y, level){
  const root=document.getElementById('game-root');
  if(!root) return;
  const shown = Math.round(totalPoints > 0 ? totalPoints : basePoints);
  if(!(shown > 0)) return;
  const i=pIdx(level);
  const bonus=Math.max(0, Math.round(totalPoints - basePoints));

  // 1) Điểm cộng chính — hiện tổng điểm vừa nhận (+N)
  const d=document.createElement('div');
  d.className='score-pop';
  d.textContent='+'+shown;
  d.style.left=x+'px'; d.style.top=y+'px';
  root.appendChild(d);
  setTimeout(()=>d.remove(), 1100);

  // 2) Điểm thưởng combo — chỉ hiện khi có nhân (x2/x3...), bay chậm hơn 1 nhịp
  if(bonus>0){
    const b=document.createElement('div');
    b.className='score-pop score-pop-bonus';
    b.textContent='+'+bonus+' 🔥';
    b.style.left=x+'px'; b.style.top=(y+28)+'px';
    b.style.fontSize=(18+i*2)+'px';
    b.style.color=i>=2?PRAISE_COLOR[i]:'#ffd24a';
    root.appendChild(b);
    setTimeout(()=>b.remove(), 1200);
  }
}

/** Tung vài bông hoa nhỏ từ các ô vừa phá (map thường + map ẩn 1) */

function spawnClearFlowers(cells){
  if(typeof versusMode!=='undefined' && versusMode) return;
  const root=document.getElementById('game-root');
  if(!root || !cells || !cells.length) return;
  const inSecret = !!(typeof secretMode!=='undefined' && secretMode);
  const cellAt = (r,c)=>{
    if(inSecret && typeof getSC==='function') return getSC(r,c);
    if(typeof getCell==='function') return getCell(r,c);
    return null;
  };
  const FLOWERS=['🌸','🌺','🌼','💮','🌷'];
  const pick = cells.length <= 4 ? cells : cells.filter((_,i)=> i%Math.ceil(cells.length/4)===0).slice(0,4);
  const frag=document.createDocumentFragment();
  const nodes=[];
  pick.forEach(([r,c])=>{
    const cell = cellAt(r,c);
    if(!cell) return;
    const b=cell.getBoundingClientRect();
    const origin=toGameRootXY(b.left+b.width/2, b.top+b.height/2);
    const count = 1 + ((Math.random()*2)|0); // 1–2 hoa / ô
    for(let i=0;i<count;i++){
      const f=document.createElement('div');
      f.className='clear-flower';
      f.textContent=FLOWERS[(Math.random()*FLOWERS.length)|0];
      f.style.left=origin.x+'px';
      f.style.top=origin.y+'px';
      const fx = (Math.random()*70 - 35);
      // Tung ra phía dưới / xung quanh ô rồi bay nhẹ lên
      const fy = 18 + Math.random()*46;
      f.style.setProperty('--fx', fx+'px');
      f.style.setProperty('--fy', fy+'px');
      f.style.setProperty('--rot', ((Math.random()*160)-80)+'deg');
      f.style.animationDelay=(Math.random()*0.08)+'s';
      f.style.fontSize=(11 + Math.random()*6)+'px';
      frag.appendChild(f);
      nodes.push(f);
    }
  });
  root.appendChild(frag);
  nodes.forEach(f=>setTimeout(()=>f.remove(), 1100));
}

// Vòng sáng nổ — to & sáng dần theo level

/* ── Viền toả sáng lấp lánh theo combo — cả map thường lẫn map ẩn ── */

// Câu khen leo thang mạnh dần theo các cấp độ PRAISE

function showPraise(level){
  const el=document.getElementById('combo-flash');
  const i=pIdx(level);
  const c=PRAISE_COLOR[i];
  el.textContent=PRAISE[i]+'!';
  el.style.color=c;

  // Lồng tiếng
  speakPraise(level);

  // Font size: nhỏ ở COOL, to dần tới LEGENDARY
  const base=22+i*9;  // 22 → ~94px
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

  // Screen shake ở 2 cấp cao nhất (UNREAL / LEGENDARY)
  if(i>=7){
    const root=document.getElementById('game-root');
    root.classList.remove('screen-shake');
    void root.offsetWidth;
    root.classList.add('screen-shake');
    setTimeout(()=>root.classList.remove('screen-shake'), 500);
  }
}

