// ═══════════════════════════════════════════════════════════════
// maps/map18.js — MAP ẨN 18: Phiêu theo âm nhạc
// Tách verbatim khỏi main.js, nạp TRƯỚC main.js (global scope).
// ═══════════════════════════════════════════════════════════════

const RHY=()=>document.getElementById('rhythm-canvas');
// (đã chuyển khai báo biến mode lên đầu file để tránh lỗi TDZ)
let rhythmState={};
let rhythmStars=[], rhythmNotes=[];

function updateRhythmBg(W,H){
  rhythmStars.forEach(s=>{ s.phase+=0.03*s.speed; });
  rhythmNotes.forEach(n=>{
    n.phase+=0.02;
    n.y-=n.speed/60;
    n.x+=Math.sin(n.phase)*n.drift/60;
    if(n.y<-20){ n.y=H+20; n.x=Math.random()*W; }
  });
}

function drawRhythmBg(ctx,W,H){
  // Sân khấu tiệc ánh sáng Map 4
  scenicPartyBg(ctx,W,H,Date.now()*0.001);
  rhythmStars.forEach(s=>{
    const tw=0.5+0.5*Math.sin(s.phase);
    ctx.fillStyle=`rgba(255,255,255,${0.25+tw*0.5})`;
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
  });
  ctx.textAlign='center'; ctx.textBaseline='middle';
  rhythmNotes.forEach(n=>{
    ctx.save();
    ctx.globalAlpha=0.55;
    ctx.fillStyle=n.hue;
    ctx.font='800 '+n.size+'px Nunito,system-ui';
    ctx.fillText(n.glyph,n.x,n.y);
    ctx.restore();
  });
}

// Nhạc nền tươi sáng, vui nhộn cho Map ẩn 18 — hợp âm trưởng vòng lặp arpeggio
let rhythmBgmInterval=null, rhythmBgmStep=0;
const RHYTHM_BGM_NOTES=[523.25,659.25,783.99,1046.5,783.99,659.25,987.77,880.0];
function startRhythmBgm(){
  stopRhythmBgm();
  rhythmBgmStep=0;
  rhythmBgmInterval=setInterval(()=>{
    if(!sfxMuted){
      playTone(RHYTHM_BGM_NOTES[rhythmBgmStep%RHYTHM_BGM_NOTES.length],'triangle',0.28,0.06);
    }
    rhythmBgmStep++;
  }, 260);
}
function stopRhythmBgm(){
  if(rhythmBgmInterval){ clearInterval(rhythmBgmInterval); rhythmBgmInterval=null; }
}
function triggerRhythmUnlock(){
  markMapCleared('space');
  pendingUnlock='rhythm';
  document.getElementById('unlock-title').textContent='🎵 BẢN ĐỒ 18 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML='<b>Phiêu theo âm nhạc</b><br>Gõ theo nhịp điệu — PERFECT để ghi điểm cao!';
  document.getElementById('unlock-btn').textContent='CHIẾN ĐẤU!';
  showUnlockOverlay();
}

function enterRhythmMode(){
  setActiveHiddenMap('rhythm');
  endDrag(); sfxUnlock();
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  document.getElementById('hint-bar').textContent='Tap vào tâm khi vòng ngoài chạm đúng nhịp!';
  document.getElementById('grid-wrap').classList.add('secret-mode');
  document.getElementById('mode-badge').textContent='🎵 MAP ẨN 18';
  document.getElementById('mode-badge').classList.add('secret');
  RHY().classList.add('active');
  rhythmMode=true; rhythmWon=false;
  stopBgm();
  startRhythmBgm();
  initRhythmGame();
}

function initRhythmGame(){
  const cv=RHY(), W=360, H=460;
  rhythmState={
    W,H,
    circles:[],
    feedbacks:[],
    totalCircles:20,
    spawned:0,
    completed:0,
    score:0,
    gameOver:false,
    won:false,
    spawnTimer:0,
    spawnInterval:110,
    shrinkSpeed:0.45,
    startRadius:70,
    ringWidth:12,
    streak:0
  };
  rhythmStars=[];
  for(let i=0;i<40;i++){
    rhythmStars.push({x:Math.random()*W,y:Math.random()*H,r:0.6+Math.random()*1.6,phase:Math.random()*Math.PI*2,speed:1+Math.random()*2});
  }
  rhythmNotes=[];
  for(let i=0;i<10;i++){
    rhythmNotes.push({
      x:Math.random()*W, y:Math.random()*H,
      speed:18+Math.random()*20, drift:8+Math.random()*14,
      phase:Math.random()*Math.PI*2, size:12+Math.random()*8,
      glyph:['♪','♫','♬'][Math.floor(Math.random()*3)],
      hue:`hsl(${280+Math.random()*80},85%,${70+Math.random()*15}%)`,
    });
  }
  const s=rhythmState;
  cv.onclick=ev=>{
    if(s.gameOver||s.won) return;
    const rect=cv.getBoundingClientRect();
    const scaleX=W/rect.width;
    const scaleY=H/rect.height;
    const tx=(ev.clientX-rect.left)*scaleX;
    const ty=(ev.clientY-rect.top)*scaleY;
    rhythmTap(tx,ty);
  };
  cv.ontouchstart=ev=>{
    ev.preventDefault();
    if(s.gameOver||s.won) return;
    const rect=cv.getBoundingClientRect();
    const scaleX=W/rect.width;
    const scaleY=H/rect.height;
    const tx=(ev.touches[0].clientX-rect.left)*scaleX;
    const ty=(ev.touches[0].clientY-rect.top)*scaleY;
    rhythmTap(tx,ty);
  };
  if(rhythmRAF) cancelAnimationFrame(rhythmRAF);
  rhythmRAF=requestAnimationFrame(rhythmLoop);
}

function rhythmTap(tx,ty){
  const s=rhythmState;
  let hit=false;
  for(let i=s.circles.length-1;i>=0;i--){
    const c=s.circles[i];
    const dist=Math.hypot(tx-c.x,ty-c.y);
    if(dist<c.baseRadius+s.ringWidth*2){
      // Vòng ngoài co nhỏ dần lại — chạm đúng lúc nó khớp với vòng chính (baseRadius) là PERFECT
      const diff=Math.abs(c.ringRadius-c.baseRadius);
      let pts=0, label='';
      // 5 mức chính xác giảm dần: PERFECT > GREAT > COOL > BAD > MISS
      if(diff<5){ s.streak++; pts=3*comboScoreMultiplier(s.streak); label='PERFECT!'; sfxRhythmPerfect(); }
      else if(diff<12){ s.streak++; pts=2*comboScoreMultiplier(s.streak); label='GREAT'; sfxRhythmPerfect(); }
      else if(diff<20){ s.streak++; pts=1*comboScoreMultiplier(s.streak); label='COOL'; sfxRhythmGood(); }
      else if(diff<32){ s.streak=0; pts=1; label='BAD'; sfxRhythmGood(); }
      else { s.streak=0; pts=0; label='MISS'; sfxRhythmMiss(); }
      s.score+=pts;
      s.feedbacks.push({x:tx,y:ty,text:label,life:60,pts});
      s.circles.splice(i,1);
      s.completed++;
      hit=true;
      break;
    }
  }
  // Chạm vào chỗ trống không tính là miss — tránh hiện 2 chữ MISS liền (1 do nốt hết giờ, 1 do chạm hụt)
}

function rhythmLoop(){
  if(!rhythmMode){ rhythmRAF=null; return; }
  const s=rhythmState;
  const cv=RHY(), ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  const W=s.W, H=s.H;
  if(!s.gameOver&&!s.won){
    s.spawnTimer++;
    if(s.spawnTimer>=s.spawnInterval && s.spawned<s.totalCircles){
      s.spawnTimer=0;
      const margin=60;
      s.circles.push({
        x:margin+Math.random()*(W-margin*2),
        y:margin+Math.random()*(H-margin*2-60),
        baseRadius:25,
        ringRadius:s.startRadius,
        color:`hsl(${Math.random()*360},80%,60%)`,
        life:220
      });
      s.spawned++;
      sfxRhythmSpawn();
    }
    for(let i=s.circles.length-1;i>=0;i--){
      const c=s.circles[i];
      c.ringRadius-=s.shrinkSpeed; // vòng ngoài nhỏ dần lại, chạm khớp vòng chính thì bấm
      c.life--;
      if(c.ringRadius<=-20||c.life<=0){
        s.circles.splice(i,1);
        s.completed++;
        s.streak=0;
        sfxRhythmMiss();
        s.feedbacks.push({x:c.x,y:c.y,text:'MISS',life:45,pts:0});
      }
    }
    for(let i=s.feedbacks.length-1;i>=0;i--){
      s.feedbacks[i].life--;
      if(s.feedbacks[i].life<=0) s.feedbacks.splice(i,1);
    }
    if(s.spawned>=s.totalCircles && s.circles.length===0 && !s.won){
      s.won=true; rhythmWon=true;
    }
  }
  updateRhythmBg(W,H);
  drawRhythmBg(ctx,W,H);
  for(const c of s.circles){
    ctx.beginPath();
    ctx.arc(c.x,c.y,c.baseRadius,0,Math.PI*2);
    ctx.fillStyle=c.color+'44';
    ctx.fill();
    ctx.strokeStyle=c.color;
    ctx.lineWidth=3;
    ctx.stroke();
    if(c.ringRadius>0){
      ctx.beginPath();
      ctx.arc(c.x,c.y,c.ringRadius,0,Math.PI*2);
      const alpha=Math.max(0,1-Math.abs(c.ringRadius-c.baseRadius)/s.startRadius);
      ctx.strokeStyle=`rgba(255,255,255,${0.4+alpha*0.5})`;
      ctx.lineWidth=s.ringWidth;
      ctx.stroke();
    }
  }
  for(const f of s.feedbacks){
    const alpha=f.life/60;
    ctx.font='bold 18px monospace';
    ctx.textAlign='center';
    ctx.fillStyle=f.text==='PERFECT!'?`rgba(255,215,0,${alpha})`:f.text==='GREAT'?`rgba(150,255,150,${alpha})`:f.text==='COOL'?`rgba(120,200,255,${alpha})`:f.text==='BAD'?`rgba(255,160,80,${alpha})`:`rgba(255,80,80,${alpha})`;
    ctx.fillText(f.text+(f.pts>0?' +'+f.pts:''),f.x,f.y-20+((60-f.life)*0.3));
  }
  drawHudTop(ctx,W,{left:'⭐ '+s.score, right:s.completed+'/'+s.totalCircles, progress:s.completed/s.totalCircles, progressColor:'#ff44ff'});
  if(s.won){
    ctx.fillStyle='rgba(0,0,0,0.8)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffd700';
    ctx.font='bold 26px monospace';
    ctx.textAlign='center';
    ctx.fillText('🎵 HOÀN THÀNH!',W/2,H/2-30);
    ctx.fillStyle='#ffffff';
    ctx.font='18px monospace';
    ctx.fillText('Điểm: '+s.score+' / 60',W/2,H/2+10);
    setTimeout(()=>exitRhythmToMain(),3000);
    s.won=false; s.gameOver=true;
  }
  rhythmRAF=requestAnimationFrame(rhythmLoop);
}

function exitRhythmToMain(){
  setActiveHiddenMap(null);
  rhythmMode=false;
  stopRhythmBgm();
  startBgm('main');
  if(rhythmRAF){cancelAnimationFrame(rhythmRAF);rhythmRAF=null;}
  if(rhythmState.score){ score+=rhythmState.score; if(score>best) best=score; updateScoreUI(); }
  RHY().classList.remove('active');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode','ultra-glow','combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
  document.getElementById('mode-badge').textContent='BÌNH THƯỜNG';
  document.getElementById('mode-badge').classList.remove('secret');
  document.getElementById('burst-count').textContent='Chuỗi nổ: 0/3';
  document.getElementById('hint-bar').textContent=(typeof t==='function'?t('hintDefault'):'');
  renderPieces(); checkGameOverA();
  if(rhythmWon) setTimeout(()=>startUnlockGate(17),1500);
}
