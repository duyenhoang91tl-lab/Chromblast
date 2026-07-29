// ═══════════════════════════════════════════════════════════════
// js/effects-scenery.js — Nền cảnh (scenery) dùng chung, tách từ effects.js
// Gồm: mặt trời/mây/hoa (bee), nền ngày/đêm/tiệc/bão, đồi/cỏ/hàng rào.
// Dùng chung global scope với effects.js (nạp NGAY SAU).
// ═══════════════════════════════════════════════════════════════

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

function drawSoftSweetCell(ctx,x,y,w,h,color,opts){
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
