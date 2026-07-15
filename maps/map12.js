// ═══════════════════════════════════════════════════════════════
// maps/map12.js — MAP ẨN 12: Tràn màu (Color Flood)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const FLOOD_COLORS=['#e84040','#4080e8','#40c040','#e8c040','#9040c8','#e88040'];
const FLOOD_MAX_MOVES=25, FLOOD_GRID_SIZE=10;

let floodMode=false, floodRAF=null;
let floodGrid=[], floodMoves=FLOOD_MAX_MOVES, floodAnimating=false;
let floodFx=[], floodScore=0;

const FLCV=()=>document.getElementById('flood-canvas');

function triggerFloodUnlock(){
  markMapCleared('catch');
  pendingUnlock='flood';
  document.getElementById('unlock-title').textContent='🎨 MAP ẨN 12 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    '🎨 <b>Tràn Màu!</b><br><br>'+
    'Lưới 10×10 màu sắc — nhấn nút màu để tràn từ góc trên trái!<br>'+
    'Mục tiêu: phủ đầy <b>toàn bộ</b> bảng trong <b>'+FLOOD_MAX_MOVES+' bước</b>!<br>'+
    'Thắng sớm nhận nhiều điểm thưởng!';
  document.getElementById('unlock-btn').textContent='🎨 TÔ THÔI!';
  showUnlockOverlay();
}

function enterFloodMode(){
  setActiveHiddenMap('flood');
  endDrag();
  sfxUnlock();
  startBgm('main');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Nhấn nút màu để tràn màu từ góc trên-trái!';
  FLCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🎨 MAP ẨN 12';
  document.getElementById('mode-badge').classList.add('secret');
  floodMode=true;
  initFlood();
  floodRAF=requestAnimationFrame(floodLoop);
}

function initFlood(){
  floodGrid=[];
  for(let r=0;r<FLOOD_GRID_SIZE;r++){
    floodGrid[r]=[];
    for(let c=0;c<FLOOD_GRID_SIZE;c++){
      floodGrid[r][c]=Math.floor(Math.random()*FLOOD_COLORS.length);
    }
  }
  floodMoves=FLOOD_MAX_MOVES; floodAnimating=false;
  floodFx=[]; floodScore=0;
}

function getFloodRegion(){
  const base=floodGrid[0][0];
  const visited=Array.from({length:FLOOD_GRID_SIZE},()=>new Array(FLOOD_GRID_SIZE).fill(false));
  const queue=[[0,0]]; visited[0][0]=true; const cells=[];
  while(queue.length){
    const [r,c]=queue.shift(); cells.push([r,c]);
    [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc])=>{
      if(nr>=0&&nr<FLOOD_GRID_SIZE&&nc>=0&&nc<FLOOD_GRID_SIZE&&!visited[nr][nc]&&floodGrid[nr][nc]===base){
        visited[nr][nc]=true; queue.push([nr,nc]);
      }
    });
  }
  return cells;
}

function countFlooded(){
  const base=floodGrid[0][0];
  const visited=Array.from({length:FLOOD_GRID_SIZE},()=>new Array(FLOOD_GRID_SIZE).fill(false));
  const queue=[[0,0]]; visited[0][0]=true; let count=0;
  while(queue.length){
    const [r,c]=queue.shift(); count++;
    [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc])=>{
      if(nr>=0&&nr<FLOOD_GRID_SIZE&&nc>=0&&nc<FLOOD_GRID_SIZE&&!visited[nr][nc]&&floodGrid[nr][nc]===base){
        visited[nr][nc]=true; queue.push([nr,nc]);
      }
    });
  }
  return count;
}

function doFlood(newColorIdx){
  if(floodAnimating||floodMoves<=0) return;
  const baseColor=floodGrid[0][0];
  if(newColorIdx===baseColor) return;
  // BFS collect current region
  const region=getFloodRegion();
  // Change all region cells to new color
  region.forEach(([r,c])=>{ floodGrid[r][c]=newColorIdx; });
  // Expand: collect adjacent cells of newColor and absorb them
  let changed=true;
  while(changed){
    changed=false;
    const regionSet=new Set(region.map(([r,c])=>r+','+c));
    region.slice().forEach(([r,c])=>{
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc])=>{
        const key=nr+','+nc;
        if(nr>=0&&nr<FLOOD_GRID_SIZE&&nc>=0&&nc<FLOOD_GRID_SIZE&&!regionSet.has(key)&&floodGrid[nr][nc]===newColorIdx){
          region.push([nr,nc]); regionSet.add(key); changed=true;
        }
      });
    });
  }
  floodMoves--;
  // FX
  floodFx.push({t:0,colorIdx:newColorIdx});
  if(!sfxMuted){ if(region.length>20) sfxFloodBig(); else sfxFloodMove(); }
  // Check win
  const flooded=countFlooded();
  if(flooded>=FLOOD_GRID_SIZE*FLOOD_GRID_SIZE){
    const bonus=20+floodMoves*2;
    floodScore=bonus; score+=bonus;
    if(best<score) best=score;
    updateScoreUI();
    floodDone(true);
  } else if(floodMoves<=0){
    const partial=Math.floor(flooded/5);
    floodScore=partial; score+=partial;
    if(best<score) best=score;
    updateScoreUI();
    floodDone(false);
  }
}

function floodLoop(){
  if(!floodMode){ floodRAF=null; return; }
  const cv=FLCV(), W=360, H=460;
  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  drawFlood(ctx,W,H);
  floodRAF=requestAnimationFrame(floodLoop);
}

function drawFlood(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  const fT=Date.now()*0.0003;
  // Sân vườn Map 4 + giọt màu trang trí
  scenicDayFull(ctx,W,H,fT*10,{hillY:H*0.82,fence:false,stripY:H-6});
  FLOOD_COLORS.forEach((col,i)=>{
    const dx=(Math.sin(fT*0.7+i*1.7)*0.5+0.5)*W;
    const dy=(Math.cos(fT*0.5+i*2.3)*0.5+0.5)*H*0.22+H*0.02;
    ctx.save(); ctx.globalAlpha=0.18;
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.arc(dx,dy,16+Math.sin(fT*2+i)*4,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });

  const cellSize=32, gap=2, cols=FLOOD_GRID_SIZE, rows=FLOOD_GRID_SIZE;
  const gridW=cols*cellSize+(cols-1)*gap;
  const gridH=rows*cellSize+(rows-1)*gap;
  const offX=(W-gridW)/2, offY=48;

  // Draw grid — ô kẹo bông mềm
  const regionSet=new Set(getFloodRegion().map(([r,c])=>r+','+c));
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x=offX+c*(cellSize+gap), y=offY+r*(cellSize+gap);
      const ci=floodGrid[r][c];
      const isFlooded=regionSet.has(r+','+c);
      drawSoftCandyCell(ctx,x,y,cellSize,cellSize,FLOOD_COLORS[ci],{glow:isFlooded,glowBlur:isFlooded?8:3});
    }
  }

  // Color buttons
  const btnY=offY+gridH+14;
  const btnR=20, btnSpacing=52, btnStartX=(W-(FLOOD_COLORS.length-1)*btnSpacing)/2;
  FLOOD_COLORS.forEach((col,i)=>{
    const bx=btnStartX+i*btnSpacing, by=btnY+btnR;
    ctx.fillStyle=col;
    ctx.shadowColor=col; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(bx,by,btnR,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    if(i===floodGrid[0][0]){
      ctx.strokeStyle='#fff'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(bx,by,btnR+3,0,Math.PI*2); ctx.stroke();
    }
  });

  const flooded=countFlooded();
  drawHudTop(ctx,W,{left:'🎨 '+flooded+'/100', right:'👣 '+floodMoves+'/'+FLOOD_MAX_MOVES});

  // FX
  floodFx.forEach(f=>{
    f.t+=0.05;
    const prog=Math.min(f.t,1);
    ctx.globalAlpha=Math.max(0,1-prog);
    ctx.fillStyle=FLOOD_COLORS[f.colorIdx];
    ctx.font='bold 20px system-ui'; ctx.textAlign='center';
    ctx.fillText('✨', W/2, H/2-prog*30);
    ctx.globalAlpha=1;
  });
  floodFx=floodFx.filter(f=>f.t<1);
}

function floodDone(won){
  floodMode=false;
  if(floodRAF){ cancelAnimationFrame(floodRAF); floodRAF=null; }
  if(won){
    sfxWaveWin();
    showComboFlash(0,false,'🎨 Phủ đầy bảng! +'+floodScore+' điểm!');
    setTimeout(()=>startUnlockGate(11), 500);
  } else {
    forfeitHiddenMapScore();
  }
  setTimeout(exitFloodToMain, 600);
}

function exitFloodToMain(){
  setActiveHiddenMap(null);
  floodMode=false;
  startBgm('main');
  if(floodRAF){ cancelAnimationFrame(floodRAF); floodRAF=null; }
  FLCV().classList.remove('active');
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

FLCV().addEventListener('pointerdown', e=>{
  if(!floodMode) return;
  e.preventDefault();
  const cv=FLCV();
  const rect=cv.getBoundingClientRect();
  const scaleX=360/rect.width, scaleY=460/rect.height;
  const tx=(e.clientX-rect.left)*scaleX, ty=(e.clientY-rect.top)*scaleY;
  // Detect color button taps
  const cellSize=32, gap=2, cols=FLOOD_GRID_SIZE;
  const gridW=cols*cellSize+(cols-1)*gap;
  const offY=48, gridH=FLOOD_GRID_SIZE*cellSize+(FLOOD_GRID_SIZE-1)*gap;
  const btnY=offY+gridH+14;
  const btnR=20, btnSpacing=52, btnStartX=(360-(FLOOD_COLORS.length-1)*btnSpacing)/2;
  FLOOD_COLORS.forEach((col,i)=>{
    const bx=btnStartX+i*btnSpacing, by=btnY+btnR;
    if(Math.hypot(tx-bx,ty-by)<btnR+6){ doFlood(i); }
  });
});
