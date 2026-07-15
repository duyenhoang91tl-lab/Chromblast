// ═══════════════════════════════════════════════════════════════
// maps/map13.js — MAP ẨN 13: Đấu trường sinh tồn (Survival Arena)
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const ARENA_TIME=90, ARENA_KPI=150;
const ARENA_WAVE_TIMES=[0,20,40,60];

let arenaMode=false, arenaRAF=null, arenaLast=0, arenaElapsed=0;
let arenaDogX=180, arenaDogY=380, arenaDogLives=5;
let arenaInvincible=0, arenaBees=[], arenaCarrots=[], arenaSnake={x:180,y:80,hp:100,vx:80,fireTimer:0};
let arenaVenom=[], arenaFx=[], arenaScore=0, arenaWave=0, arenaKillStreak=0, arenaScoreAccum=0;
let arenaSpawnTimer=0, arenaCarrotTimer=0, arenaWaveFlash=0, arenaWaveFlashText='';
let arenaPointerX=null, arenaPointerY=null;
let arenaPetals=[];

const ARCV=()=>document.getElementById('arena-canvas');

function triggerArenaUnlock(){
  markMapCleared('flood');
  pendingUnlock='arena';
  document.getElementById('unlock-title').textContent='🌊 MAP ẨN 13 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML=
    '🌊 <b>Đấu Trường Sinh Tồn!</b><br><br>'+
    'Trận chiến cuối cùng — vượt qua 4 làn sóng kẻ thù!<br>'+
    'Kéo để di chuyển chú chó 🐶 tránh đòn tấn công!<br>'+
    'Chạm vào 🐝/🥕 để tiêu diệt (+15 điểm)!<br>'+
    'Sống sót <b>'+ARENA_TIME+'s</b> hoặc đạt <b>'+ARENA_KPI+' điểm</b> để CHIẾN THẮNG!';
  document.getElementById('unlock-btn').textContent='🌊 VÀO TRẬN!';
  showUnlockOverlay();
}

function enterArenaMode(){
  setActiveHiddenMap('arena');
  endDrag();
  sfxUnlock();
  startBgm('action');
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').style.display='';
  document.getElementById('hint-bar').textContent='Kéo để di chuyển! Chạm vào ong/cà rốt để tiêu diệt!';
  ARCV().classList.add('active');
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🌊 MAP ẨN 13';
  document.getElementById('mode-badge').classList.add('secret');
  arenaMode=true;
  initArena();
  arenaLast=performance.now();
  arenaRAF=requestAnimationFrame(arenaLoop);
}

function initArena(){
  const cv=ARCV();
  arenaDogX=180; arenaDogY=460-80;
  arenaDogLives=5; arenaInvincible=0;
  arenaBees=[]; arenaCarrots=[]; arenaVenom=[]; arenaFx=[];
  arenaScore=0; arenaElapsed=0; arenaWave=0; arenaKillStreak=0; arenaScoreAccum=0;
  arenaSpawnTimer=0; arenaCarrotTimer=0;
  arenaWaveFlash=0; arenaWaveFlashText='';
  arenaSnake={x:180,y:80,hp:100,vx:80,fireTimer:0};
  arenaPointerX=null; arenaPointerY=null;
  arenaPetals=[];
  for(let i=0;i<28;i++){
    arenaPetals.push({
      x:Math.random()*360, y:Math.random()*460,
      speed:14+Math.random()*18, drift:6+Math.random()*10,
      phase:Math.random()*Math.PI*2, size:5+Math.random()*5,
      spin:Math.random()*Math.PI*2, spinSpeed:(Math.random()-0.5)*2,
      hue:Math.random()<0.5?'#ffc0d9':'#ffd7e6',
    });
  }
}

function updateArenaPetals(dt,W,H){
  arenaPetals.forEach(p=>{
    p.phase+=dt*1.2;
    p.y+=p.speed*dt;
    p.x+=Math.sin(p.phase)*p.drift*dt;
    p.spin+=p.spinSpeed*dt;
    if(p.y>H+10){ p.y=-10; p.x=Math.random()*W; }
    if(p.x<-10) p.x=W+10; else if(p.x>W+10) p.x=-10;
  });
}

const ARENA_WAVE_LABELS=['SÓNG 1: ONG TẤN CÔNG!','SÓNG 2: CÀ RỐT ĐỔ BỘ!','SÓNG 3: RẮN BOSS!','SÓNG 4: TẤT CẢ KẺ THÙ!'];

function arenaLoop(now){
  if(!arenaMode){ arenaRAF=null; return; }
  const dt=Math.min(0.08,Math.max(0,(now-(arenaLast||now))/1000));
  arenaLast=now;
  arenaElapsed+=dt;

  const cv=ARCV(), W=360, H=460;

  // Wave transitions
  let newWave=0;
  for(let i=ARENA_WAVE_TIMES.length-1;i>=0;i--){ if(arenaElapsed>=ARENA_WAVE_TIMES[i]){ newWave=i; break; } }
  if(newWave!==arenaWave){
    arenaWave=newWave;
    arenaWaveFlash=2; arenaWaveFlashText=ARENA_WAVE_LABELS[arenaWave]||'';
    if(arenaWave===2){ arenaSnake={x:W/2,y:80,hp:100,vx:80,fireTimer:0}; }
    if(arenaWave===3){ if(!arenaSnake||arenaSnake.hp<=0) arenaSnake={x:W/2,y:80,hp:100,vx:80,fireTimer:0}; }
    if(!sfxMuted) sfxWaveStart();
  }
  arenaWaveFlash=Math.max(0,arenaWaveFlash-dt);

  // Score per second — dùng bộ đệm để cộng điểm nguyên, tránh số thập phân dài
  arenaScoreAccum+=dt;
  if(arenaScoreAccum>=1){
    arenaScoreAccum-=1;
    arenaScore+=1; score+=1;
    if(best<score) best=score;
  }

  // Invincibility countdown
  const _prevInvinc=arenaInvincible;
  arenaInvincible=Math.max(0,arenaInvincible-dt);
  if(_prevInvinc>0 && arenaInvincible===0 && !sfxMuted) sfxInvincEnd();

  // Move dog toward pointer
  if(arenaPointerX!==null){
    const dx=arenaPointerX-arenaDogX, dy=arenaPointerY-arenaDogY;
    const spd=300*dt;
    const dist=Math.hypot(dx,dy);
    if(dist>spd){ arenaDogX+=dx/dist*spd; arenaDogY+=dy/dist*spd; }
    else { arenaDogX=arenaPointerX; arenaDogY=arenaPointerY; }
  }
  arenaDogX=Math.max(25,Math.min(W-25,arenaDogX));
  arenaDogY=Math.max(25,Math.min(H-25,arenaDogY));

  // Wave 1 & 4: Bees chase dog
  if(arenaWave===0||arenaWave===3){
    arenaSpawnTimer+=dt;
    if(arenaSpawnTimer>=2.0){ arenaSpawnTimer=0;
      const side=Math.floor(Math.random()*4);
      let bx,by;
      if(side===0){bx=Math.random()*W;by=-20;}
      else if(side===1){bx=W+20;by=Math.random()*H;}
      else if(side===2){bx=Math.random()*W;by=H+20;}
      else{bx=-20;by=Math.random()*H;}
      arenaBees.push({x:bx,y:by,t:0});
    }
  }
  arenaBees.forEach(b=>{
    b.t+=dt;
    const dx=arenaDogX-b.x, dy=arenaDogY-b.y, d=Math.hypot(dx,dy)||1;
    b.x+=dx/d*90*dt; b.y+=dy/d*90*dt;
  });

  // Wave 2 & 4: Carrots fall
  if(arenaWave===1||arenaWave===3){
    arenaCarrotTimer+=dt;
    if(arenaCarrotTimer>=0.8){ arenaCarrotTimer=0;
      arenaCarrots.push({x:30+Math.random()*(W-60),y:-20,vy:130+Math.random()*50});
    }
  }
  arenaCarrots.forEach(c=>c.y+=c.vy*dt);
  arenaCarrots=arenaCarrots.filter(c=>c.y<H+30);

  // Wave 3 & 4: Snake boss
  if((arenaWave===2||arenaWave===3)&&arenaSnake&&arenaSnake.hp>0){
    arenaSnake.x+=arenaSnake.vx*dt;
    if(arenaSnake.x>W-40){arenaSnake.x=W-40;arenaSnake.vx=-Math.abs(arenaSnake.vx);}
    if(arenaSnake.x<40){arenaSnake.x=40;arenaSnake.vx=Math.abs(arenaSnake.vx);}
    arenaSnake.fireTimer+=dt;
    if(arenaSnake.fireTimer>=1.5){ arenaSnake.fireTimer=0;
      arenaVenom.push({x:arenaSnake.x+(Math.random()-0.5)*40,y:arenaSnake.y+40,vy:140+Math.random()*40});
    }
    // Dog can hit snake by tapping (handled in pointerdown)
  }
  arenaVenom.forEach(v=>v.y+=v.vy*dt);
  arenaVenom=arenaVenom.filter(v=>v.y<H+30);

  // Collision: bees hit dog
  if(arenaInvincible<=0){
    arenaBees=arenaBees.filter(b=>{
      if(Math.hypot(b.x-arenaDogX,b.y-arenaDogY)<28){
        arenaDogLives--; arenaInvincible=2; arenaKillStreak=0;
        arenaFx.push({x:arenaDogX,y:arenaDogY,t:0,type:'dmg'});
        sfxDogStung(); return false;
      }
      return true;
    });
    // Carrots hit dog
    if(arenaInvincible<=0){
      arenaCarrots=arenaCarrots.filter(c=>{
        if(Math.hypot(c.x-arenaDogX,c.y-arenaDogY)<28){
          arenaDogLives--; arenaInvincible=2; arenaKillStreak=0;
          arenaFx.push({x:arenaDogX,y:arenaDogY,t:0,type:'dmg'});
          sfxDogStung(); return false;
        }
        return true;
      });
    }
    // Venom hits dog
    if(arenaInvincible<=0){
      arenaVenom=arenaVenom.filter(v=>{
        if(Math.hypot(v.x-arenaDogX,v.y-arenaDogY)<24){
          arenaDogLives--; arenaInvincible=2; arenaKillStreak=0;
          arenaFx.push({x:arenaDogX,y:arenaDogY,t:0,type:'dmg'});
          sfxDogStung(); return false;
        }
        return true;
      });
    }
  }

  arenaFx.forEach(f=>f.t+=dt);
  arenaFx=arenaFx.filter(f=>f.t<0.6);
  updateArenaPetals(dt,W,H);

  const ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  drawArena(ctx,W,H);

  const timeLeft=Math.max(0,ARENA_TIME-arenaElapsed);
  document.getElementById('burst-count').textContent='🌊 '+Math.floor(arenaScore)+' pts  ❤️×'+arenaDogLives+'  ⏱'+Math.ceil(timeLeft)+'s';
  updateScoreUI();

  if(arenaDogLives<=0){ arenaDone(false); return; }
  if(timeLeft<=0||arenaScore>=ARENA_KPI){ arenaDone(true); return; }
  arenaRAF=requestAnimationFrame(arenaLoop);
}

function drawArenaPetal(ctx,p){
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(p.spin);
  ctx.fillStyle=p.hue;
  ctx.beginPath();
  ctx.moveTo(0,-p.size);
  ctx.quadraticCurveTo(p.size*0.8,-p.size*0.3,0,p.size*0.15);
  ctx.quadraticCurveTo(-p.size*0.8,-p.size*0.3,0,-p.size);
  ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(0,-p.size*0.15,p.size*0.18,p.size*0.4,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawArena(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  // Nền vườn anh đào phong cách Map 4
  scenicPartyBg(ctx,W,H,Date.now()*0.001);
  // Vòng tròn ánh sáng dịu nhẹ thay cho ring đấu trường cũ
  const rings=[[W/2,H/2,80],[W/2,H/2,140],[W/2,H/2,210],[W/2,H/2,290]];
  rings.forEach(([cx,cy,r],i)=>{
    ctx.strokeStyle=`rgba(255,255,255,${[0.25,0.2,0.15,0.1][i]})`;
    ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  });
  // Cánh hoa anh đào rơi
  arenaPetals.forEach(p=>drawArenaPetal(ctx,p));
  // bướm dạo chơi trong vườn anh đào
  {
    const bt=Date.now()*0.001;
    ctx.font='14px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🦋', W*0.25+Math.sin(bt*0.8)*W*0.18, H*0.14+Math.sin(bt*2.2)*12);
    ctx.fillText('🦋', W*0.75+Math.sin(bt*0.6+2)*W*0.16, H*0.2+Math.sin(bt*1.8+1)*10);
  }

  // Bees — bỏ shadowBlur (rất tốn hiệu năng khi có nhiều con cùng lúc → giật máy)
  ctx.font='28px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  arenaBees.forEach(b=>{ ctx.fillText('🐝',b.x,b.y); });

  // Carrots
  arenaCarrots.forEach(c=>{ ctx.fillText('🥕',c.x,c.y); });

  // Snake boss
  if((arenaWave===2||arenaWave===3)&&arenaSnake&&arenaSnake.hp>0){
    ctx.font='60px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🐍',arenaSnake.x,arenaSnake.y);
    // HP bar
    const hpPct=arenaSnake.hp/100;
    ctx.fillStyle='rgba(200,0,0,0.4)'; ctx.fillRect(arenaSnake.x-40,arenaSnake.y-50,80,8);
    ctx.fillStyle='#ff4444'; ctx.fillRect(arenaSnake.x-40,arenaSnake.y-50,80*hpPct,8);
  }

  // Venom
  arenaVenom.forEach(v=>{
    ctx.fillStyle='rgba(0,200,0,0.8)';
    ctx.beginPath(); ctx.arc(v.x,v.y,8,0,Math.PI*2); ctx.fill();
  });

  // Dog (with invincibility blink)
  if(arenaInvincible<=0||Math.floor(arenaInvincible*8)%2===0){
    ctx.font='44px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🐶',arenaDogX,arenaDogY);
  }

  // FX
  arenaFx.forEach(f=>{
    const prog=f.t/0.6;
    ctx.globalAlpha=Math.max(0,1-prog);
    ctx.font='bold 28px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('💥',f.x,f.y-prog*40);
    ctx.globalAlpha=1;
  });

  // Wave flash
  if(arenaWaveFlash>0){
    const alpha=Math.min(1,arenaWaveFlash);
    ctx.globalAlpha=alpha;
    ctx.fillStyle='rgba(255,200,0,0.15)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff';
    ctx.font='bold 22px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='#ff8800'; ctx.shadowBlur=20;
    ctx.fillText(arenaWaveFlashText,W/2,H/2);
    ctx.shadowBlur=0;
    ctx.globalAlpha=1;
  }

  const wavePct=Math.min(arenaElapsed/ARENA_TIME,1);
  const wLabel=['Sóng 1: Ong','Sóng 2: Cà Rốt','Sóng 3: Rắn Boss','Sóng 4: Tất cả!'][arenaWave]||'';
  drawHudTop(ctx,W,{left:'🌊 '+wLabel, center:'⭐ '+Math.floor(arenaScore), right:'❤️×'+arenaDogLives, progress:wavePct, progressColor:'#ff40ff'});
}

function arenaDone(won){
  arenaMode=false;
  if(arenaRAF){ cancelAnimationFrame(arenaRAF); arenaRAF=null; }
  saveProgress(true);
  if(won){
    sfxWaveWin();
    showComboFlash(0,false,'🏆 CHINH PHỤC ĐẤUTRƯỜNG! MAP ẨN 14 MỞ KHÓA!');
    setTimeout(()=>startUnlockGate(12), 1500);
  } else {
    forfeitHiddenMapScore();
    setTimeout(exitArenaToMain, 800);
  }
}

function exitArenaToMain(){
  setActiveHiddenMap(null);
  arenaMode=false;
  startBgm('main');
  if(arenaRAF){ cancelAnimationFrame(arenaRAF); arenaRAF=null; }
  ARCV().classList.remove('active');
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

ARCV().addEventListener('pointermove', e=>{
  if(!arenaMode) return;
  e.preventDefault();
  const cv=ARCV(), rect=cv.getBoundingClientRect();
  arenaPointerX=(e.clientX-rect.left)*(360/rect.width);
  arenaPointerY=(e.clientY-rect.top)*(460/rect.height);
});
ARCV().addEventListener('pointerdown', e=>{
  if(!arenaMode) return;
  e.preventDefault();
  const cv=ARCV(), rect=cv.getBoundingClientRect();
  const tx=(e.clientX-rect.left)*(360/rect.width);
  const ty=(e.clientY-rect.top)*(460/rect.height);
  arenaPointerX=tx; arenaPointerY=ty;
  // Tap bees to kill
  // 1 điểm/lần hạ gục, liên tiếp 3 lần → x2, 6 lần → x3
  arenaBees=arenaBees.filter(b=>{
    if(Math.hypot(b.x-tx,b.y-ty)<28){
      arenaKillStreak++;
      const pts=1*comboScoreMultiplier(arenaKillStreak);
      arenaScore+=pts; score+=pts; if(best<score) best=score;
      arenaFx.push({x:b.x,y:b.y,t:0,type:'kill'});
      if(!sfxMuted) sfxArenaKill(); return false;
    }
    return true;
  });
  // Tap carrots to kill
  arenaCarrots=arenaCarrots.filter(c=>{
    if(Math.hypot(c.x-tx,c.y-ty)<28){
      arenaKillStreak++;
      const pts=1*comboScoreMultiplier(arenaKillStreak);
      arenaScore+=pts; score+=pts; if(best<score) best=score;
      arenaFx.push({x:c.x,y:c.y,t:0,type:'kill'});
      if(!sfxMuted) sfxArenaKill(); return false;
    }
    return true;
  });
  // Tap snake boss
  if((arenaWave===2||arenaWave===3)&&arenaSnake&&arenaSnake.hp>0){
    if(Math.hypot(arenaSnake.x-tx,arenaSnake.y-ty)<40){
      arenaSnake.hp-=20;
      arenaKillStreak++;
      const hitPts=1*comboScoreMultiplier(arenaKillStreak);
      arenaScore+=hitPts; score+=hitPts; if(best<score) best=score;
      arenaFx.push({x:arenaSnake.x,y:arenaSnake.y,t:0,type:'hit'});
      if(arenaSnake.hp<=0){
        arenaScore+=5; score+=5; if(best<score) best=score;
        arenaFx.push({x:arenaSnake.x,y:arenaSnake.y,t:0,type:'kill'});
      }
      if(!sfxMuted) sfxArenaKill();
    }
  }
  updateScoreUI();
});
ARCV().addEventListener('pointerup', ()=>{ if(!arenaMode) return; arenaPointerX=null; arenaPointerY=null; });
