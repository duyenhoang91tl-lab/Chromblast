// ═══════════════════════════════════════════════════════════════
// maps/map07.js — MAP ẨN 7: Lật thẻ ký ức (Memory Match)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const MEMORY_TIME=60, MEMORY_KPI_PAIRS=6;
const MEMORY_ANIMALS=[
  {emoji:'🦫',name:'Capybara',color:'#c4893a'},
  {emoji:'🐰',name:'Thỏ',    color:'#ff9ac8'},
  {emoji:'🐢',name:'Rùa',    color:'#4a9a40'},
  {emoji:'🐶',name:'Samoyed',color:'#e8e0d0'},
  {emoji:'🐱',name:'Mèo',    color:'#ff9f40'},
  {emoji:'🦔',name:'Nhím',   color:'#a0623a'},
];

let memoryMode=false, memoryRAF=null, memoryLast=0, memoryElapsed=0;
let memoryCards=[], memoryFlipped=[], memoryMatched=0, memoryScore=0, memoryStreak=0;
/** Dây so sánh tạm giữa 2 thẻ đang mở — gỡ khi khớp (đổi sang Eve loop) hoặc sai (úp lại). */
let memoryCable=null; // {a,b,life,maxLife,mode:'compare'|'snap'}
/** Vòng ivy (Eve loop) buộc cặp đã khớp — mỗi phần tử {c0,c1,t} */
let memoryEveLoops=[];

const MMCV=()=>document.getElementById('memory-canvas');

function memoryCardCenter(c,W){
  const cardW=76, cardH=100, gapX=8, gapY=8;
  const totalW=4*cardW+3*gapX;
  const startX=(W-totalW)/2, startY=70;
  return {
    x:startX+c.col*(cardW+gapX)+cardW/2,
    y:startY+c.row*(cardH+gapY)+cardH/2,
  };
}

/** Vẽ móc mồi (bait hook) ở đầu dây — gợi ý có thể “gỡ dây” khi úp thẻ */
function memoryDrawBaitHook(ctx,x,y,ang,alpha){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(ang);
  ctx.globalAlpha=alpha;
  ctx.strokeStyle='#c9a227';
  ctx.fillStyle='#e8c547';
  ctx.lineWidth=2.2;
  ctx.lineCap='round';
  // thân móc
  ctx.beginPath();
  ctx.moveTo(0,-6);
  ctx.quadraticCurveTo(8,-2,6,6);
  ctx.quadraticCurveTo(2,10,-2,6);
  ctx.stroke();
  // mắt móc
  ctx.beginPath();
  ctx.arc(0,-7,2.2,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

/** Dây leo nối 2 thẻ đang so sánh */
function memoryDrawCable(ctx,x1,y1,x2,y2,lifeFrac,snapping){
  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const dx=x2-x1, dy=y2-y1;
  const len=Math.hypot(dx,dy)||1;
  const nx=-dy/len, ny=dx/len;
  const sag=snapping ? 18+ (1-lifeFrac)*40 : 14;
  const cx=mx+nx*sag, cy=my+ny*sag+8;
  const a=Math.max(0, Math.min(1, lifeFrac));
  ctx.save();
  ctx.globalAlpha=a;
  // bóng dây
  ctx.strokeStyle='rgba(40,80,30,0.35)';
  ctx.lineWidth=5;
  ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(cx,cy+2,x2,y2); ctx.stroke();
  // thân dây
  ctx.strokeStyle=snapping ? '#8BC34A' : '#5D8A3A';
  ctx.lineWidth=3.2;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(cx,cy,x2,y2); ctx.stroke();
  // gân sáng
  ctx.strokeStyle='rgba(180,230,120,0.55)';
  ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(cx-nx*2,cy-ny*2,x2,y2); ctx.stroke();
  // lá nhỏ trên dây
  for(let i=1;i<=3;i++){
    const t=i/4;
    const px=(1-t)*(1-t)*x1 + 2*(1-t)*t*cx + t*t*x2;
    const py=(1-t)*(1-t)*y1 + 2*(1-t)*t*cy + t*t*y2;
    ctx.beginPath();
    ctx.ellipse(px,py,4,2.2,t*Math.PI,0,Math.PI*2);
    ctx.fillStyle='rgba(100,170,60,0.75)';
    ctx.fill();
  }
  const ang=Math.atan2(y2-y1,x2-x1);
  memoryDrawBaitHook(ctx,x1,y1,ang+Math.PI*0.15,a);
  memoryDrawBaitHook(ctx,x2,y2,ang+Math.PI+0.15,a);
  ctx.restore();
}

/** Eve loop — vòng ivy buộc cặp đã khớp */
function memoryDrawEveLoop(ctx,x1,y1,x2,y2,pulse){
  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const rx=Math.max(36, Math.abs(x2-x1)*0.55+28);
  const ry=Math.max(28, Math.abs(y2-y1)*0.55+24);
  const rot=Math.atan2(y2-y1,x2-x1);
  ctx.save();
  ctx.translate(mx,my);
  ctx.rotate(rot);
  ctx.globalAlpha=0.85+0.15*Math.sin(pulse*3);
  // vòng ngoài
  ctx.strokeStyle='#6B9E3E';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);
  ctx.stroke();
  // vòng trong sáng
  ctx.strokeStyle='rgba(200,240,140,0.55)';
  ctx.lineWidth=1.4;
  ctx.beginPath();
  ctx.ellipse(0,0,rx-4,ry-3,0,0,Math.PI*2);
  ctx.stroke();
  // lá + hoa quanh vòng
  for(let i=0;i<10;i++){
    const a=(i/10)*Math.PI*2 + pulse*0.4;
    const lx=Math.cos(a)*rx, ly=Math.sin(a)*ry;
    ctx.save();
    ctx.translate(lx,ly);
    ctx.rotate(a+0.4);
    ctx.beginPath();
    ctx.ellipse(0,0,5,2.5,0,0,Math.PI*2);
    ctx.fillStyle=i%3===0 ? '#E8A0C0' : '#7CB342';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function triggerMemoryUnlock(){
  markMapCleared('mole');
  pendingUnlock='memory';
  document.getElementById('unlock-title').textContent='🃏 MAP ẨN 7 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    '🌸 <b>Lật thẻ ký ức!</b><br><br>'+
    'Lưới 4×3 — 6 cặp động vật bị trộn. <b>Chạm</b> để lật thẻ!<br>'+
    'Hai thẻ đang mở được nối bằng <b>dây leo + móc mồi</b> — sai thì dây <b>gỡ</b>, úp lại.<br>'+
    'Khớp đúng → buộc bằng <b>Eve loop</b> (vòng ivy)! Ghép đủ <b>6 cặp</b> trong <b>'+MEMORY_TIME+'s</b>.';
  document.getElementById('unlock-btn').textContent='🃏 LẬT THẺ THÔI!';
  showUnlockOverlay();
}

function enterMemoryMode(){
  setActiveHiddenMap('memory');
  endDrag();
  sfxUnlock();
  startBgm('main');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Lật 2 thẻ · dây nối khi so sánh · khớp = Eve loop · sai = gỡ dây!';
  MMCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🃏 MAP ẨN 7';
  document.getElementById('mode-badge').classList.add('secret');
  document.getElementById('burst-count').textContent='🃏 0/6 cặp';
  memoryMode=true;
  initMemory();
  memoryLast=performance.now();
  memoryRAF=requestAnimationFrame(memoryLoop);
}

function initMemory(){
  memoryScore=0; memoryElapsed=0; memoryMatched=0; memoryFlipped=[]; memoryStreak=0;
  memoryCable=null; memoryEveLoops=[];
  // Create 6 pairs shuffled
  const deck=[];
  MEMORY_ANIMALS.forEach(a=>{ deck.push({...a}); deck.push({...a}); });
  // Fisher-Yates shuffle
  for(let i=deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  // 4 cols × 3 rows = 12 cards
  memoryCards=deck.map((a,idx)=>({
    animal:a, faceUp:false, matched:false, flipT:0,
    col:idx%4, row:Math.floor(idx/4),
  }));
}

function memoryLoop(now){
  if(!memoryMode){ memoryRAF=null; return; }
  const dt=Math.min(0.1,Math.max(0,(now-(memoryLast||now))/1000));
  memoryLast=now;
  memoryElapsed+=dt;

  // Animate flip transitions
  memoryCards.forEach(c=>{
    const target=c.faceUp?1:0;
    const spd=5;
    if(c.flipT<target) c.flipT=Math.min(target,c.flipT+dt*spd);
    else if(c.flipT>target) c.flipT=Math.max(target,c.flipT-dt*spd);
  });

  // Dây so sánh: fade khi snap (gỡ bằng móc sau khi sai)
  if(memoryCable && memoryCable.mode==='snap'){
    memoryCable.life-=dt;
    if(memoryCable.life<=0) memoryCable=null;
  }

  const cv=MMCV(), W=360, H=460;
  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  drawMemory(ctx,W,H);

  const timeLeft=Math.max(0,MEMORY_TIME-memoryElapsed);
  document.getElementById('burst-count').textContent='🃏 '+memoryMatched+'/6 cặp  ⏱'+timeLeft.toFixed(0)+'s';

  if(timeLeft<=0 || memoryMatched>=MEMORY_KPI_PAIRS){
    memoryDone(); return;
  }
  memoryRAF=requestAnimationFrame(memoryLoop);
}

function drawMemory(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  // sân vườn Map 4 đầy đủ
  scenicDayFull(ctx,W,H,memoryElapsed,{hillY:H*0.55,fence:false,stripY:H-8,butterflies:true});

  // Card layout: 4 cols × 3 rows, each ~76×100, gap 8, centered
  const cardW=76, cardH=100, gapX=8, gapY=8;
  const totalW=4*cardW+3*gapX, totalH=3*cardH+2*gapY;
  const startX=(W-totalW)/2, startY=70;

  // Eve loops — vòng ivy buộc cặp đã khớp
  memoryEveLoops.forEach(loop=>{
    const p0=memoryCardCenter(loop.c0,W);
    const p1=memoryCardCenter(loop.c1,W);
    memoryDrawEveLoop(ctx,p0.x,p0.y,p1.x,p1.y,memoryElapsed);
  });

  // Dây cable + bait hooks giữa 2 thẻ đang so sánh / đang gỡ
  if(memoryCable && memoryCable.a && memoryCable.b){
    const p0=memoryCardCenter(memoryCable.a,W);
    const p1=memoryCardCenter(memoryCable.b,W);
    const frac=memoryCable.maxLife>0 ? memoryCable.life/memoryCable.maxLife : 1;
    memoryDrawCable(ctx,p0.x,p0.y,p1.x,p1.y,frac, memoryCable.mode==='snap');
  }

  memoryCards.forEach((c,idx)=>{
    const cx=startX+c.col*(cardW+gapX)+cardW/2;
    const cy=startY+c.row*(cardH+gapY)+cardH/2;

    // Flip animation: scale X from 1→0 (back) then 0→1 (front)
    const t=c.flipT; // 0=back, 1=front
    const scaleX=t<0.5 ? 1-t*2 : (t-0.5)*2;
    const showFront=t>=0.5;

    ctx.save();
    ctx.translate(cx,cy);
    ctx.scale(scaleX,1);

    const r=10; // border radius
    const x2=-cardW/2, y2=-cardH/2;

    if(showFront){
      // Front: colored bg + emoji + name
      const bgCol=c.animal.color;
      // card bg
      ctx.beginPath();
      ctx.moveTo(x2+r,y2); ctx.lineTo(x2+cardW-r,y2);
      ctx.quadraticCurveTo(x2+cardW,y2,x2+cardW,y2+r);
      ctx.lineTo(x2+cardW,y2+cardH-r);
      ctx.quadraticCurveTo(x2+cardW,y2+cardH,x2+cardW-r,y2+cardH);
      ctx.lineTo(x2+r,y2+cardH); ctx.quadraticCurveTo(x2,y2+cardH,x2,y2+cardH-r);
      ctx.lineTo(x2,y2+r); ctx.quadraticCurveTo(x2,y2,x2+r,y2);
      ctx.closePath();
      ctx.fillStyle=bgCol; ctx.fill();

      // golden glow for matched
      if(c.matched){
        ctx.strokeStyle='#f7c948'; ctx.lineWidth=3;
        ctx.shadowColor='#f7c948'; ctx.shadowBlur=10;
        ctx.stroke();
        ctx.shadowBlur=0;
      } else {
        ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1.5; ctx.stroke();
      }

      // hình con vật — vector dễ thương theo phong cách Map 4, fallback emoji nếu chưa có
      {
        const boxSize=52;
        const drew=drawCuteAnimal(ctx,c.animal.emoji,-boxSize/2,-8-boxSize/2,boxSize,boxSize,performance.now()*0.001);
        if(!drew){
          ctx.font='40px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillStyle='#000'; // shadow trick
          ctx.shadowColor='rgba(0,0,0,0.3)'; ctx.shadowBlur=4;
          ctx.fillText(c.animal.emoji,0,-8);
          ctx.shadowBlur=0;
        }
      }

      // name
      ctx.font='bold 11px Nunito,system-ui'; ctx.fillStyle='rgba(0,0,0,0.7)';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(c.animal.name,0,cardH/2-14);
    } else {
      // Back: dark gradient + question pattern
      const grad=ctx.createLinearGradient(x2,y2,x2+cardW,y2+cardH);
      grad.addColorStop(0,'#4a3080'); grad.addColorStop(1,'#2a1a60');
      ctx.beginPath();
      ctx.moveTo(x2+r,y2); ctx.lineTo(x2+cardW-r,y2);
      ctx.quadraticCurveTo(x2+cardW,y2,x2+cardW,y2+r);
      ctx.lineTo(x2+cardW,y2+cardH-r);
      ctx.quadraticCurveTo(x2+cardW,y2+cardH,x2+cardW-r,y2+cardH);
      ctx.lineTo(x2+r,y2+cardH); ctx.quadraticCurveTo(x2,y2+cardH,x2,y2+cardH-r);
      ctx.lineTo(x2,y2+r); ctx.quadraticCurveTo(x2,y2,x2+r,y2);
      ctx.closePath();
      ctx.fillStyle=grad; ctx.fill();
      ctx.strokeStyle='rgba(180,140,255,0.5)'; ctx.lineWidth=1.5; ctx.stroke();

      // "?" pattern
      ctx.font='bold 28px Nunito,system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(180,140,255,0.7)';
      ctx.fillText('?',0,0);
    }
    ctx.restore();
  });

  const timeLeft=Math.max(0,MEMORY_TIME-memoryElapsed);
  drawHudTop(ctx,W,{left:'⏱ '+timeLeft.toFixed(0)+'s', right:'🃏 '+memoryMatched+'/'+MEMORY_KPI_PAIRS});
}

let memoryFlipLock=false;

function memoryAttachCompareCable(a,b){
  memoryCable={ a,b, life:1, maxLife:1, mode:'compare' };
}

function memorySnapCableOff(){
  if(!memoryCable) return;
  memoryCable.mode='snap';
  memoryCable.life=0.45;
  memoryCable.maxLife=0.45;
}

function tapMemory(ex,ey){
  if(!memoryMode || memoryFlipLock) return;
  const cardW=76, cardH=100, gapX=8, gapY=8;
  const startX=(360-4*cardW-3*gapX)/2, startY=70;
  for(let i=0;i<memoryCards.length;i++){
    const c=memoryCards[i];
    if(c.matched || c.faceUp) continue;
    const cx=startX+c.col*(cardW+gapX);
    const cy=startY+c.row*(cardH+gapY);
    if(ex>=cx && ex<=cx+cardW && ey>=cy && ey<=cy+cardH){
      c.faceUp=true;
      if(!sfxMuted) sfxMemoryFlip();
      const openCards=memoryCards.filter(x=>x.faceUp&&!x.matched);
      if(openCards.length===2){
        memoryFlipLock=true;
        memoryAttachCompareCable(openCards[0], openCards[1]);
        if(openCards[0].animal.emoji===openCards[1].animal.emoji){
          // Match! — gỡ dây so sánh, buộc Eve loop
          setTimeout(()=>{
            openCards.forEach(x=>{ x.matched=true; });
            memoryMatched++;
            memoryStreak++;
            memoryCable=null;
            memoryEveLoops.push({ c0:openCards[0], c1:openCards[1] });
            // 1 điểm/cặp ghép đúng, liên tiếp 3 cặp → x2, 6 cặp → x3 (đồng bộ map thường)
            const pts=1*comboScoreMultiplier(memoryStreak);
            memoryScore+=pts;
            score+=pts; if(score>best)best=score; updateScoreUI();
            if(!sfxMuted) sfxMemoryMatch();
            showComboFlash(0,false,'🌿 Eve loop! +'+pts+'đ');
            memoryFlipLock=false;
          },300);
        } else {
          // Mismatch — gỡ dây bằng bait hook (snap), rồi úp thẻ
          memoryStreak=0;
          setTimeout(()=>{
            memorySnapCableOff();
            openCards.forEach(x=>{ x.faceUp=false; });
            if(!sfxMuted) sfxMemoryMiss();
            memoryFlipLock=false;
          },800);
        }
      }
      break;
    }
  }
}

function memoryDone(){
  if(memoryRAF){ cancelAnimationFrame(memoryRAF); memoryRAF=null; }
  memoryMode=false;
  const won=memoryMatched>=MEMORY_KPI_PAIRS;
  if(won){
    sfxWaveWin();
    showComboFlash(0,false,'🏆 '+memoryScore+'đ! Ghép đủ hết!');
  }
  setTimeout(()=>{
    exitMemoryToMain();
    if(won) setTimeout(()=>startUnlockGate(6), 400);
  }, 600);
}

function exitMemoryToMain(){
  setActiveHiddenMap(null);
  memoryMode=false;
  memoryCable=null; memoryEveLoops=[];
  startBgm('main');
  if(memoryRAF){ cancelAnimationFrame(memoryRAF); memoryRAF=null; }
  MMCV().classList.remove('active');
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

/* ── điều khiển Memory: chạm canvas để lật thẻ ── */
MMCV().addEventListener('pointerdown', e=>{
  if(!memoryMode) return;
  e.preventDefault();
  const rect=MMCV().getBoundingClientRect();
  const scaleX=360/rect.width, scaleY=460/rect.height;
  tapMemory((e.clientX-rect.left)*scaleX, (e.clientY-rect.top)*scaleY);
});
