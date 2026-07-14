// ═══════════════════════════════════════════════════════════════
// maps/map10.js — MAP ẨN 10: Đại chiến Boss (Boss Battle)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

let bossMode=false, bossRAF=null, bossLast=0, bossElapsed=0;
let bossSwitching=false, currentBoss=null, bosses=[], bossIdx=0;
let bossFx=[];

const BCV=()=>document.getElementById('boss-canvas');

function triggerBossUnlock(){
  markMapCleared('stack');
  pendingUnlock='boss';
  document.getElementById('unlock-title').textContent='⚔️ MAP ẨN 10 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML='<b>Đại chiến Boss!</b><br>Đấu tay đôi với các sư phụ! Hạ gục tất cả để thắng!';
  document.getElementById('unlock-btn').textContent='⚔️ CHIẾN ĐẤU!';
  showUnlockOverlay();
}

function enterBossMode(){
  setActiveHiddenMap('boss');
  endDrag();
  sfxUnlock();
  startBgm('action');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').textContent='Di chuyển ngón tay để tránh né, vuốt để tấn công!';
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='⚔️ MAP ẨN 10';
  document.getElementById('mode-badge').classList.add('secret');
  BCV().classList.add('active');
  bossMode=true;
  initBossGame();
  bossLast=performance.now();
  bossRAF=requestAnimationFrame(bossLoop);
}

function initBossGame(){
  bossElapsed=0;
  bosses=[];
  if(typeof initBosses==='function') initBosses();
  bossIdx=0;
  currentBoss=bosses.length>0?bosses[0]:null;
  bossSwitching=false;
  if(typeof startBoss==='function' && currentBoss) startBoss(currentBoss);
}

function bossLoop(){
  if(!bossMode){ bossRAF=null; return; }
  const now=performance.now();
  const dt=Math.min((now-bossLast)/1000, 0.1);
  bossLast=now;
  bossElapsed+=dt;
  
  const cv=BCV(), ctx=cv.getContext('2d'), W=360, H=460;
  ctx.fillStyle='#0a0a1a';
  ctx.fillRect(0,0,W,H);
  
  if(typeof updateBoss==='function') updateBoss(dt, currentBoss);
  if(typeof drawBoss==='function') drawBoss(ctx, W, H, currentBoss);
  
  if(currentBoss && currentBoss.hp<=0 && !bossSwitching){
    bossSwitching=true;
    bossIdx++;
    if(bossIdx>=bosses.length){
      // Thắng hết boss
      setTimeout(()=>{ bossMode=false; exitBossToMain(); },1000);
      return;
    }
    currentBoss=bosses[bossIdx];
    if(typeof startBoss==='function') startBoss(currentBoss);
    bossSwitching=false;
  }
  
  bossRAF=requestAnimationFrame(bossLoop);
}

function exitBossToMain(){
  setActiveHiddenMap(null);
  bossMode=false;
  startBgm('main');
  if(bossRAF){ cancelAnimationFrame(bossRAF); bossRAF=null; }
  markMapCleared('boss');
  if(typeof advanceHiddenGate==='function') advanceHiddenGate(9);
  BCV().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('hint-bar').textContent='Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay';
  renderPieces(); checkGameOverA();
}
