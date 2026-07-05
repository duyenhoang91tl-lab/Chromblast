// ═══════════════════════════════════════════════════════════════
// maps/map05.js — MAP ẨN 5: Mèo đào vàng (Gold Miner)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

let goldMode=false, goldRAF=null, goldLast=0, goldElapsed=0;
let goldTimeLeft=30, goldWave=1, goldSessionScore=0;
let awaitingGoldUnlock=false, goldUnlockBaseline=0;
let awaitingMoleUnlock=false, moleUnlockBaseline=0;
const GCV = () => document.getElementById('gold-canvas');
const GOLD_TIME=30, GOLD_KPI_SCORE=30;

const GM_COLS=8, GM_ROWS=10, GM_GT=40;
let gmCW=45, gmCH=42;
let gmGrid=[], gmPts=[];
let gmCatX=180, gmCatY=40+42*1.5, gmCatTX=180, gmCatTY=40+42*1.5;
let gmDigging=false, gmDigTimer=0, gmDigCol=-1, gmDigRow=-1;
let gmMouse={x:-60,y:200,vx:60,on:false,timer:0,interval:7,caught:false,catchAlpha:0};
let gmMouseY0=0, gmMouseY1=0;
const gmValues={dirt:0,gs:1,gb:2,gem:3,dia:5,chest:8};
const gmColors={gs:'#FFD700',gb:'#FFA000',gem:'#E040FB',dia:'#4FC3F7',chest:'#FF6D00'};

function initGoldGrid(){
  gmGrid=[];
  for(let r=0;r<GM_ROWS;r++){
    gmGrid[r]=[];
    for(let c=0;c<GM_COLS;c++){
      let tp='dirt';
      const d=r/GM_ROWS, rn=Math.random();
      if(d<0.2){ if(rn<0.06) tp='gs'; else if(rn<0.08) tp='gem'; }
      else if(d<0.5){ if(rn<0.1) tp='gs'; else if(rn<0.17) tp='gb'; else if(rn<0.21) tp='gem'; else if(rn<0.24) tp='dia'; }
      else if(d<0.8){ if(rn<0.1) tp='gs'; else if(rn<0.2) tp='gb'; else if(rn<0.27) tp='gem'; else if(rn<0.33) tp='dia'; else if(rn<0.36) tp='chest'; }
      else{ if(rn<0.08) tp='gs'; else if(rn<0.2) tp='gb'; else if(rn<0.28) tp='gem'; else if(rn<0.36) tp='dia'; else if(rn<0.4) tp='chest'; }
      gmGrid[r][c]={tp, dug:r<2, reveal:r<2?1:0};
    }
  }
}

function triggerGoldUnlock(){
  markMapCleared('bee');
  pendingUnlock='gold';
  document.getElementById('unlock-title').textContent='⛏️ MAP ẨN 5 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    'Bạn đã bảo vệ chó xong! Phần thưởng: mỏ vàng bí ẩn!<br><br>'+
    '🐱 <b>Mèo đào vàng — đào 30 giây!</b><br>'+
    'Chạm ô đất gần mèo để <b>đào</b> lấy vàng/đá quý. Chạm xa hơn để dẫn mèo di chuyển.<br>'+
    '🐭 Bắt được <b>chuột mang kim cương</b> chạy qua → thưởng lớn +150!<br>'+
    'Cần đạt <b>'+GOLD_KPI_SCORE+' điểm</b> để qua màn!';
  document.getElementById('unlock-btn').textContent='⛏️ ĐÀO THÔI!';
  showUnlockOverlay();
}

function enterGoldMode(){
  setActiveHiddenMap('gold');
  endDrag();
  sfxUnlock();
  startBgm('main');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Chạm đất gần mèo để đào! Bắt chuột mang kim cương +150!';
  GCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='⛏️ MAP ẨN 5';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='⛏️ 0/'+GOLD_KPI_SCORE;

  goldMode=true;
  initGold();
  goldLast=performance.now();
  goldRAF=requestAnimationFrame(goldLoop);
}

function initGold(){
  const cv=GCV(), W=360, H=460;
  gmCW=W/GM_COLS; gmCH=(H-GM_GT)/GM_ROWS;
  goldElapsed=0; goldTimeLeft=GOLD_TIME; goldSessionScore=0;
  gmPts=[];
  gmCatX=W/2; gmCatY=GM_GT+gmCH*1.5; gmCatTX=gmCatX; gmCatTY=gmCatY;
  gmDigging=false; gmDigTimer=0; gmDigCol=-1; gmDigRow=-1;
  gmMouse={x:-60,y:200,vx:60,on:false,timer:5,interval:7,caught:false,catchAlpha:0};
  gmMouseY0=GM_GT+gmCH*2; gmMouseY1=GM_GT+gmCH*7;
  initGoldGrid();
  updateGoldHUD();
}

function updateGoldHUD(){
  document.getElementById('burst-count').textContent='⛏️ '+goldSessionScore+'/'+GOLD_KPI_SCORE;
}

function gmFloatText(x,y,txt,color,size){
  const el=document.createElement('div');
  el.className='fl'; el.textContent=txt;
  el.style.position='absolute'; el.style.left=(x/360*100)+'%'; el.style.top=((GM_GT>0?y:y)/460*100)+'%';
  el.style.color=color||'#FFD700'; el.style.fontSize=(size||16)+'px'; el.style.fontWeight='900';
  el.style.pointerEvents='none'; el.style.zIndex=8; el.style.textShadow='0 1px 6px rgba(0,0,0,0.6)';
  el.style.transition='transform .9s ease-out, opacity .9s ease-out';
  document.getElementById('wrap')?document.getElementById('wrap').appendChild(el):document.body.appendChild(el);
  requestAnimationFrame(()=>{ el.style.transform='translateY(-50px) scale(0.8)'; el.style.opacity='0'; });
  setTimeout(()=>el.remove(),900);
}
function gmMouseAlert(){
  const old=document.querySelector('.gm-mouse-alert'); if(old) old.remove();
  const el=document.createElement('div');
  el.className='gm-mouse-alert';
  el.textContent='🐭 Chuột cắp kim cương!';
  el.style.position='absolute'; el.style.top='50px'; el.style.left='50%'; el.style.transform='translateX(-50%)';
  el.style.zIndex=6; el.style.background='rgba(100,50,200,0.85)'; el.style.color='#fff';
  el.style.padding='5px 16px'; el.style.borderRadius='20px'; el.style.fontSize='12px'; el.style.fontWeight='700';
  el.style.pointerEvents='none'; el.style.whiteSpace='nowrap';
  const wrapEl=document.getElementById('wrap')||document.body;
  wrapEl.style.position=wrapEl.style.position||'relative';
  wrapEl.appendChild(el);
  setTimeout(()=>el.remove(),2000);
}

function goldLoop(now){
  if(!goldMode) return;
  const dt=Math.min(0.05,Math.max(0,(now-goldLast)/1000));
  goldLast=now; goldElapsed+=dt*1000;
  goldTimeLeft=Math.max(0,GOLD_TIME-goldElapsed/1000);
  const cv=GCV(), ctx=cv.getContext('2d'), W=360, H=460; ctx.setTransform(2,0,0,2,0,0);

  if(goldTimeLeft<=0){ goldGameOver(goldSessionScore>=GOLD_KPI_SCORE); return; }

  // mèo di chuyển về đích
  const dx=gmCatTX-gmCatX, dy=gmCatTY-gmCatY, ds=Math.sqrt(dx*dx+dy*dy);
  if(ds>2){ const sp=Math.min(200,ds*6); gmCatX+=dx/ds*sp*dt; gmCatY+=dy/ds*sp*dt; }

  // đào
  if(gmDigging){
    gmDigTimer-=dt;
    if(gmDigTimer<=0){
      gmDigging=false;
      const cl=gmGrid[gmDigRow] && gmGrid[gmDigRow][gmDigCol];
      if(cl && !cl.dug){
        cl.dug=true; cl.reveal=0;
        const v=gmValues[cl.tp]||0;
        if(v>0){
          score+=v; if(score>best) best=score; goldSessionScore+=v;
          updateScoreUI(); updateGoldHUD();
          const px=gmDigCol*gmCW+gmCW/2, py=GM_GT+gmDigRow*gmCH+gmCH/2, color=gmColors[cl.tp]||'#FFD700';
          gmSpawnDigFx(px,py,color);
          gmFloatText(px,py,'+'+v,color,v>=100?22:16);
          if(cl.tp==='dia'||cl.tp==='chest'){ gmSpawnCatchFx(px,py); sfxDiamondCollect(); }
          else sfxGoldCollect();
        } else {
          sfxHammer();
        }
      }
    }
  }

  // reveal animation
  for(let r=0;r<GM_ROWS;r++) for(let c=0;c<GM_COLS;c++){
    const cl=gmGrid[r][c];
    if(cl.dug && cl.reveal<1) cl.reveal=Math.min(1,cl.reveal+dt*4);
  }

  // chuột
  gmMouse.timer+=dt;
  if(!gmMouse.on && !gmMouse.caught && gmMouse.timer>=gmMouse.interval){
    gmMouse.timer=0; gmMouse.on=true; gmMouse.caught=false; gmMouse.catchAlpha=0;
    const fromLeft=Math.random()<0.5;
    gmMouse.x=fromLeft?-30:W+30;
    gmMouse.vx=fromLeft?(60+Math.random()*40):-(60+Math.random()*40);
    gmMouse.y=gmMouseY0+Math.random()*(gmMouseY1-gmMouseY0);
    gmMouseAlert();
  }
  if(gmMouse.on){
    gmMouse.x+=gmMouse.vx*dt;
    if((gmMouse.vx>0 && gmMouse.x>W+40) || (gmMouse.vx<0 && gmMouse.x<-40)) gmMouse.on=false;
  }
  if(gmMouse.caught){
    gmMouse.catchAlpha-=dt*2;
    if(gmMouse.catchAlpha<=0){ gmMouse.caught=false; gmMouse.catchAlpha=0; }
  }

  drawGold(ctx,W,H,now/1000);
  goldRAF=requestAnimationFrame(goldLoop);
}

function drawGold(ctx,W,H,t){
  ctx.clearRect(0,0,W,H);
  // dải trời pastel ban ngày phía trên hầm mỏ (đồng bộ phong cách Map ẩn 4)
  const g=ctx.createLinearGradient(0,0,0,GM_GT);
  g.addColorStop(0,'#7EC8E3'); g.addColorStop(0.6,'#ADE0F2'); g.addColorStop(1,'#D4F0FF');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,GM_GT);

  for(let r=0;r<GM_ROWS;r++){
    for(let c=0;c<GM_COLS;c++){
      const x=c*gmCW, y=GM_GT+r*gmCH, cl=gmGrid[r][c];
      if(!cl.dug){
        gmDrawDirt(ctx,x,y,gmCW,gmCH,r,c);
        if(gmDigging && gmDigCol===c && gmDigRow===r){
          const pr=1-(gmDigTimer/0.3);
          ctx.save(); ctx.globalAlpha=pr*0.5; ctx.strokeStyle='#5D4037'; ctx.lineWidth=1;
          for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(x+gmCW*0.2+i*gmCW*0.2,y); ctx.lineTo(x+gmCW*0.3+i*gmCW*0.15,y+gmCH); ctx.stroke(); }
          ctx.restore();
        }
      } else {
        gmDrawDug(ctx,x,y,gmCW,gmCH);
        if(cl.tp!=='dirt' && cl.reveal>0) gmDrawTreasure(ctx,cl,x,y,gmCW,gmCH,t);
      }
    }
  }

  gmDrawCat(ctx,t);
  gmDrawMouse(ctx,t);
  gmDrawParticles(ctx,1/60);

  drawHudTop(ctx,W,{left:'💎 '+goldSessionScore, right:'⏱ '+Math.ceil(goldTimeLeft)+'s'});
}

function gmDrawDirt(ctx,x,y,w,h,r,c){
  const d=r/GM_ROWS, bR=(120-d*40)|0, bG=(80-d*25)|0, bB=(40-d*15)|0;
  const g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,'rgb('+(bR+15)+','+(bG+10)+','+(bB+5)+')');
  g.addColorStop(1,'rgb('+bR+','+bG+','+bB+')');
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.5; ctx.strokeRect(x,y,w,h);
  ctx.fillStyle='rgba(0,0,0,0.08)';
  const sd=r*GM_COLS+c;
  for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(x+((sd*7+i*31)%(w-4))+2,y+((sd*13+i*17)%(h-4))+2,1+(i%2),0,Math.PI*2); ctx.fill(); }
}
function gmDrawDug(ctx,x,y,w,h){
  const g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,'#1a0e05'); g.addColorStop(1,'#120a03');
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(80,50,20,0.3)'; ctx.lineWidth=1; ctx.strokeRect(x+1,y+1,w-2,h-2);
}
function gmDrawTreasure(ctx,cl,x,y,w,h,t){
  const cx2=x+w/2, cy2=y+h/2, s=Math.min(1,cl.reveal*3), sp=Math.sin(t*4+x*0.1)*0.3+0.7;
  ctx.save(); ctx.translate(cx2,cy2); ctx.scale(s,s);
  if(cl.tp==='gs') gmDrawGS(ctx,sp);
  else if(cl.tp==='gb') gmDrawGB(ctx,sp);
  else if(cl.tp==='gem') gmDrawGem(ctx,sp);
  else if(cl.tp==='dia') gmDrawDia(ctx,sp,t);
  else if(cl.tp==='chest') gmDrawChest(ctx,sp,t);
  ctx.restore();
}
function gmDrawGS(ctx,sp){
  ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2);
  const g=ctx.createRadialGradient(-2,-2,1,0,0,8);
  g.addColorStop(0,'#FFF3B0'); g.addColorStop(0.5,'#FFD700'); g.addColorStop(1,'#B8860B');
  ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#996515'; ctx.lineWidth=1; ctx.stroke();
  ctx.beginPath(); ctx.arc(-2,-3,3,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,'+sp*0.5+')'; ctx.fill();
}
function gmDrawGB(ctx,sp){
  ctx.save(); ctx.rotate(-0.3);
  const g=ctx.createLinearGradient(-12,-5,12,5);
  g.addColorStop(0,'#B8860B'); g.addColorStop(0.3,'#FFD700'); g.addColorStop(0.7,'#FFF3B0'); g.addColorStop(1,'#B8860B');
  ctx.fillStyle=g; ctx.fillRect(-14,-5,28,10); ctx.strokeStyle='#8B6914'; ctx.lineWidth=0.8; ctx.strokeRect(-14,-5,28,10);
  ctx.fillStyle='rgba(255,255,255,'+sp*0.4+')'; ctx.fillRect(-10,-4,8,3);
  ctx.restore();
}
function gmDrawGem(ctx,sp){
  ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(8,0); ctx.lineTo(0,10); ctx.lineTo(-8,0); ctx.closePath();
  const g=ctx.createLinearGradient(-8,-10,8,10);
  g.addColorStop(0,'#F48FB1'); g.addColorStop(0.5,'#E040FB'); g.addColorStop(1,'#7B1FA2');
  ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#6A1B9A'; ctx.lineWidth=0.8; ctx.stroke();
  ctx.beginPath(); ctx.arc(-2,-4,2,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,'+sp*0.7+')'; ctx.fill();
}
function gmDrawDia(ctx,sp,t){
  ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(10,-2); ctx.lineTo(6,10); ctx.lineTo(-6,10); ctx.lineTo(-10,-2); ctx.closePath();
  const g=ctx.createLinearGradient(-10,-12,10,10);
  g.addColorStop(0,'#E1F5FE'); g.addColorStop(0.3,'#4FC3F7'); g.addColorStop(0.7,'#81D4FA'); g.addColorStop(1,'#B3E5FC');
  ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#0288D1'; ctx.lineWidth=1; ctx.stroke();
  ctx.save(); ctx.rotate(t*2);
  for(let i=0;i<4;i++){ ctx.rotate(Math.PI/2); ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(1.5,-14); ctx.lineTo(0,-12); ctx.lineTo(-1.5,-14); ctx.closePath(); ctx.fillStyle='rgba(255,255,255,'+sp*0.4+')'; ctx.fill(); }
  ctx.restore();
}
function gmDrawChest(ctx,sp,t){
  ctx.fillStyle='#8D6E63'; ctx.fillRect(-12,-4,24,14); ctx.strokeStyle='#5D4037'; ctx.lineWidth=1; ctx.strokeRect(-12,-4,24,14);
  ctx.fillStyle='#A1887F'; ctx.beginPath(); ctx.moveTo(-13,-4); ctx.quadraticCurveTo(0,-14,13,-4); ctx.lineTo(-13,-4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fillStyle='#FFD700'; ctx.fill(); ctx.strokeStyle='#B8860B'; ctx.lineWidth=0.8; ctx.stroke();
  const gl=ctx.createRadialGradient(0,-2,2,0,-2,18);
  gl.addColorStop(0,'rgba(255,215,0,'+sp*0.3+')'); gl.addColorStop(1,'rgba(255,215,0,0)');
  ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(0,-2,18,0,Math.PI*2); ctx.fill();
}

function gmDrawCat(ctx,t){
  const isD=gmDigging, bob=isD?Math.sin(t*18)*3:Math.sin(t*2)*1;
  const blk=Math.sin(t*0.8)>0.94, tw=Math.sin(t*(isD?10:3))*0.3;
  ctx.save(); ctx.translate(gmCatX,gmCatY+bob);
  ctx.beginPath(); ctx.ellipse(0,16,14,4,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.12)'; ctx.fill();
  ctx.save(); ctx.translate(10,2); ctx.rotate(0.5+tw);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(12,-8,10+Math.sin(t*4)*4,-16);
  ctx.quadraticCurveTo(8,-20,14+Math.sin(t*4)*4,-18); ctx.quadraticCurveTo(10,-14,8,-8); ctx.quadraticCurveTo(6,-2,0,0);
  ctx.fillStyle='#FF9800'; ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.ellipse(0,4,13,10,0,0,Math.PI*2); ctx.fillStyle='#FF9800'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0,7,8,6,0,0,Math.PI*2); ctx.fillStyle='#FFF3E0'; ctx.fill();
  const lo=isD?Math.sin(t*16)*2:0;
  [[-6-lo,12],[6+lo,12]].forEach(([lx,ly])=>{
    ctx.beginPath(); ctx.ellipse(lx,ly,4,3,0,0,Math.PI*2); ctx.fillStyle='#FF9800'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(lx,ly+2.5,4.5,2,0,0,Math.PI*2); ctx.fillStyle='#FFE0B2'; ctx.fill();
  });
  ctx.beginPath(); ctx.arc(0,-12,12,0,Math.PI*2); ctx.fillStyle='#FF9800'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(-6,-9,5,4,0,0,Math.PI*2); ctx.fillStyle='#FFF3E0'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(6,-9,5,4,0,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.rotate(-0.2); ctx.beginPath(); ctx.moveTo(-9,-20); ctx.lineTo(-14,-32); ctx.lineTo(-2,-22); ctx.closePath(); ctx.fillStyle='#FF9800'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8,-21); ctx.lineTo(-12,-29); ctx.lineTo(-4,-22); ctx.closePath(); ctx.fillStyle='#FFB74D'; ctx.fill(); ctx.restore();
  ctx.save(); ctx.rotate(0.2); ctx.beginPath(); ctx.moveTo(9,-20); ctx.lineTo(14,-32); ctx.lineTo(2,-22); ctx.closePath(); ctx.fillStyle='#FF9800'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(8,-21); ctx.lineTo(12,-29); ctx.lineTo(4,-22); ctx.closePath(); ctx.fillStyle='#FFB74D'; ctx.fill(); ctx.restore();
  if(!blk){
    [-4,4].forEach(ex=>{
      ctx.beginPath(); ctx.ellipse(ex,-13,4.5,5,0,0,Math.PI*2); ctx.fillStyle='#FFF'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(ex+0.5,-12.5,3,3.5,0,0,Math.PI*2); ctx.fillStyle='#1a1a1a'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex+2,-14.5,1.5,0,Math.PI*2); ctx.fillStyle='#FFF'; ctx.fill();
    });
  } else {
    ctx.lineWidth=1.5; ctx.lineCap='round'; ctx.strokeStyle='#1a1a1a';
    ctx.beginPath(); ctx.arc(-4,-12,3,0.2,Math.PI-0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(4,-12,3,0.2,Math.PI-0.2); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0,-8.5); ctx.lineTo(-2,-6.5); ctx.lineTo(2,-6.5); ctx.closePath(); ctx.fillStyle='#FF8A80'; ctx.fill();
  if(isD){ ctx.beginPath(); ctx.ellipse(0,-5,3,2.5,0,0,Math.PI*2); ctx.fillStyle='#E57373'; ctx.fill(); }
  else{ ctx.beginPath(); ctx.moveTo(-2,-6.5); ctx.quadraticCurveTo(-1,-4.5,0,-5); ctx.quadraticCurveTo(1,-4.5,2,-6.5); ctx.strokeStyle='#5D4037'; ctx.lineWidth=0.8; ctx.lineCap='round'; ctx.stroke(); }
  ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.6;
  for(let k=-1;k<=1;k+=2){ ctx.beginPath(); ctx.moveTo(k>0?6:-6,-7); ctx.quadraticCurveTo((k>0?16:-16),-8+k*3,(k>0?20:-20),-6+k*2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(-8,-9,2.5,1.5,0,0,Math.PI*2); ctx.fillStyle='rgba(255,120,120,0.3)'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(8,-9,2.5,1.5,0,0,Math.PI*2); ctx.fill();
  const pA=isD?Math.sin(t*18)*0.5-0.3:-0.2;
  ctx.save(); ctx.translate(13,0); ctx.rotate(pA);
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(14,-12); ctx.strokeStyle='#8D6E63'; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12,-11); ctx.lineTo(20,-16); ctx.lineTo(16,-18); ctx.lineTo(8,-13); ctx.closePath(); ctx.fillStyle='#78909C'; ctx.fill(); ctx.strokeStyle='#546E7A'; ctx.lineWidth=0.8; ctx.stroke();
  ctx.restore();
  if(isD){ for(let di=0;di<4;di++){ ctx.beginPath(); ctx.arc(-8+Math.random()*16,14+Math.random()*4,1.5+Math.random()*2,0,Math.PI*2); ctx.fillStyle='rgba(160,120,60,'+(0.2+Math.random()*0.2)+')'; ctx.fill(); } }
  ctx.restore();
}

function gmDrawMouse(ctx,t){
  if(!gmMouse.on && !gmMouse.caught) return;
  const fc=gmMouse.vx>=0?1:-1, rb=Math.sin(t*16)*2;
  ctx.save(); ctx.translate(gmMouse.x,gmMouse.y+rb);
  if(gmMouse.caught){ ctx.globalAlpha=gmMouse.catchAlpha; const cs=1+(1-gmMouse.catchAlpha)*0.5; ctx.scale(cs,cs); }
  ctx.scale(fc,1);
  ctx.beginPath(); ctx.ellipse(0,0,9,7,0,0,Math.PI*2); ctx.fillStyle='#B0BEC5'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(1,2,5,4.5,0,0,Math.PI*2); ctx.fillStyle='#ECEFF1'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(8,-3,7,6.5,0.1,0,Math.PI*2); ctx.fillStyle='#B0BEC5'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(5,-12,4,6,-0.3,0,Math.PI*2); ctx.fillStyle='#B0BEC5'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(11,-11,4,6,0.3,0,Math.PI*2); ctx.fillStyle='#B0BEC5'; ctx.fill();
  [7,11].forEach(ex=>{ ctx.beginPath(); ctx.ellipse(ex,-4,2.5,3,0,0,Math.PI*2); ctx.fillStyle='#1a1a1a'; ctx.fill(); });
  ctx.beginPath(); ctx.arc(14,-2.5,1.5,0,Math.PI*2); ctx.fillStyle='#F48FB1'; ctx.fill();
  // kim cương trên tay
  ctx.save(); ctx.translate(6,2); ctx.rotate(Math.sin(t*3)*0.15);
  const ds=4;
  ctx.beginPath(); ctx.moveTo(0,-ds); ctx.lineTo(ds*0.8,0); ctx.lineTo(ds*0.5,ds); ctx.lineTo(-ds*0.5,ds); ctx.lineTo(-ds*0.8,0); ctx.closePath();
  const dg=ctx.createLinearGradient(-ds,-ds,ds,ds); dg.addColorStop(0,'#E1F5FE'); dg.addColorStop(0.5,'#4FC3F7'); dg.addColorStop(1,'#B3E5FC');
  ctx.fillStyle=dg; ctx.fill(); ctx.strokeStyle='#0288D1'; ctx.lineWidth=0.6; ctx.stroke();
  ctx.restore();
  ctx.restore();
}


function goldGameOver(kpiMet, msg){
  if(goldRAF) cancelAnimationFrame(goldRAF);
  goldRAF=null; goldMode=false;
  if(kpiMet){
    const timeBonus=Math.round(goldTimeLeft*10);
    if(timeBonus>0){ score+=timeBonus; if(score>best)best=score; updateScoreUI(); }
    sfxGameOver();
    showComboFlash(0,false, msg || '🏆 KPI ĐẠT!');
  } else {
    forfeitHiddenMapScore();
  }
  setTimeout(exitGoldToMain, 450);
}

function exitGoldToMain(){
  setActiveHiddenMap(null);
  goldMode=false;
  startBgm('main');
  if(goldRAF){ cancelAnimationFrame(goldRAF); goldRAF=null; }
  GCV().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  consecutiveBursts=0; updateBurstCount();
  document.getElementById('hint-bar').textContent='Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay';
  goldWave=1;
  awaitingGoldUnlock=false;
  // Trigger Map ẩn 6 unlock immediately after Map ẩn 5
  setTimeout(()=>startUnlockGate(4), 400);
  // (dây gai giờ kích hoạt từ vòng 1 qua applyRoundMechanics — không reset lại ở đây nữa)
  renderPieces(); checkGameOverA();
}

/* ── điều khiển: chạm gần mèo → đào / chạm xa → di chuyển / chạm chuột → bắt ── */
function goldCanvasPt(e){
  const cv=GCV(), rect=cv.getBoundingClientRect();
  return {
    x:(e.clientX-rect.left)*(360/rect.width),
    y:(e.clientY-rect.top)*(460/rect.height)
  };
}
GCV().addEventListener('pointerdown', e=>{
  if(!goldMode) return;
  e.preventDefault();
  const pt=goldCanvasPt(e);
  const W=360;

  // bắt chuột
  if(gmMouse.on && !gmMouse.caught){
    const md=Math.hypot(gmMouse.x-pt.x,gmMouse.y-pt.y);
    if(md<25){
      gmMouse.on=false; gmMouse.caught=true; gmMouse.catchAlpha=1;
      score+=150; if(score>best) best=score; goldSessionScore+=150; updateScoreUI(); updateGoldHUD();
      gmSpawnCatchFx(gmMouse.x,gmMouse.y);
      gmFloatText(gmMouse.x,gmMouse.y,'+150','#4FC3F7',24);
      sfxDiamondCollect();
      return;
    }
  }

  // đào đất
  const col=Math.floor(pt.x/gmCW), row=Math.floor((pt.y-GM_GT)/gmCH);
  if(col>=0 && col<GM_COLS && row>=0 && row<GM_ROWS && !gmGrid[row][col].dug && !gmDigging){
    const cc=Math.floor(gmCatX/gmCW), cr=Math.floor((gmCatY-GM_GT)/gmCH);
    const dist=Math.abs(col-cc)+Math.abs(row-cr);
    if(dist<=2){
      gmDigging=true; gmDigTimer=0.3; gmDigCol=col; gmDigRow=row;
      gmCatTX=col*gmCW+gmCW/2; gmCatTY=GM_GT+row*gmCH+gmCH/2;
      sfxRopeDrop();
    } else {
      const tc=Math.max(0,Math.min(GM_COLS-1,col+(col>cc?-1:1)));
      const tr=Math.max(0,Math.min(GM_ROWS-1,row+(row>cr?-1:1)));
      gmCatTX=tc*gmCW+gmCW/2; gmCatTY=GM_GT+tr*gmCH+gmCH/2;
    }
  } else if(row>=0 && row<GM_ROWS){
    gmCatTX=Math.max(gmCW/2,Math.min(W-gmCW/2,pt.x));
    gmCatTY=Math.max(GM_GT+gmCH/2,Math.min(GM_GT+(GM_ROWS-0.5)*gmCH,pt.y));
  }
});
