// ═══════════════════════════════════════════════════════════════
// ui.js — Lớp giao diện (UI) tách khỏi main.js
// Gồm: popup/overlay, menu bắt đầu, tạm dừng, cài đặt (đổi mật khẩu),
//       bảng admin/tài khoản/hướng dẫn, và menu CHỌN MAP ẩn.
// NẠP TRƯỚC main.js: file này chỉ chứa ĐỊNH NGHĨA hàm (không chạy gì lúc load),
// nên khi main.js chạy chuỗi khởi động thì mọi hàm UI đã sẵn sàng. Các hàm ở
// đây chỉ tham chiếu biến/hàm game lúc CHẠY (runtime) nên không cần main.js load trước.
// Dùng chung phạm vi global với audio.js / save.js / main.js (không phải module).
// ═══════════════════════════════════════════════════════════════

function showAchievementToast(a){
  if(!document.getElementById('toast-style')){
    const st = document.createElement('style');
    st.id = 'toast-style';
    st.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(30px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}' +
      '@keyframes toastOut{from{opacity:1}to{opacity:0;transform:translateX(-50%) translateY(-10px)}}';
    document.head.appendChild(st);
  }
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);' +
    'background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #ffd700;border-radius:12px;padding:10px 18px;' +
    'color:#fff;font-size:14px;font-weight:700;z-index:99999;box-shadow:0 0 20px rgba(255,215,0,0.4);' +
    'max-width:280px;text-align:center;animation:toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;pointer-events:none;';
  toast.innerHTML = '<div style="font-size:16px">'+a.label+'</div>' +
    '<div style="font-size:11px;opacity:0.7;margin-top:3px">'+a.desc+'</div>';
  document.body.appendChild(toast);
  setTimeout(()=>{ toast.style.animation='toastOut 0.4s ease-in forwards'; setTimeout(()=>toast.remove(),400); }, 2800);
}

function showUnlockOverlay(){
  const chk=document.getElementById('unlock-autoskip-chk');
  if(chk) chk.checked=autoSkipHiddenMaps;
  if(autoSkipHiddenMaps){
    // Người chơi đã chọn tự động bỏ qua — không hiện popup nữa, chỉ để chờ mở qua "Map ẩn đang chờ"
    unlockDeferred=true;
    updateBurstCount();
    return;
  }
  document.getElementById('unlock-overlay').classList.add('show');
}

function showComboFlash(n, isColor, customText){
  const el=document.getElementById('combo-flash');
  el.style.color=''; el.style.fontSize=''; el.style.textShadow='';   // reset về kiểu mặc định
  if(customText){ el.textContent=customText; }
  else if(isColor&&n>=2){ el.textContent='💎 NỔ MÀU x'+n+'!'; }
  else if(n>=5){ el.textContent='🔥 ULTRA x'+n+'!'; }
  else if(n>=3){ el.textContent='💥 COMBO x'+n+'!'; }
  else if(n>=2){ el.textContent='✨ Combo x'+n; }
  else return;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

function showHint(msg){
  const el=document.getElementById('hint-bar');
  el.style.display='';
  el.textContent=msg;
  setTimeout(()=>{ el.textContent='Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay'; },1600);
}

function initStartScreen(){
  // Generate twinkling stars
  const starDiv = document.getElementById('start-stars');
  if(starDiv){
    for(let i=0;i<60;i++){
      const s = document.createElement('div');
      s.className = 'start-star';
      const sz = 1+Math.random()*2.5;
      s.style.width = sz+'px'; s.style.height = sz+'px';
      s.style.left = Math.random()*100+'%';
      s.style.top  = Math.random()*100+'%';
      s.style.setProperty('--sa', (0.2+Math.random()*0.5).toFixed(2));
      s.style.setProperty('--sd', (1.5+Math.random()*3).toFixed(1)+'s');
      s.style.animationDelay = (Math.random()*3).toFixed(1)+'s';
      starDiv.appendChild(s);
    }
  }
  // Start button / screen click handler
  const btn = document.getElementById('start-btn');
  const screen = document.getElementById('start-screen');
  function hideStart(){
    screen.classList.add('hide');
    setTimeout(()=>{ screen.style.display='none'; }, 500);
  }
  if(btn) btn.addEventListener('click', function(e){ e.stopPropagation(); sfxClick(); hideStart(); });
  if(screen) screen.addEventListener('click', ()=>{ sfxClick(); hideStart(); });
}

function togglePause(){
  if(!secretMode && !dodgeMode && !fruitMode && !beeMode && !goldMode && !moleMode && !memoryMode && !bubbleMode && !stackMode && !bossMode && !catchMode && !floodMode && !arenaMode && !snakeMode && !brickMode && !runnerMode && !spaceRAF && !rhythmRAF && !mazeRAF && !megaRAF) return;
  sfxClick();
  gamePaused = !gamePaused;
  const overlay = document.getElementById('pause-overlay');
  const btn = document.getElementById('pause-btn');
  if(gamePaused){
    overlay.style.display = 'flex';
    btn.textContent = '▶';
    stopRhythmBgm();
    stopBgm();
    if(dodgeRAF){ cancelAnimationFrame(dodgeRAF); dodgeRAF=null; }
    if(fruitRAF){ cancelAnimationFrame(fruitRAF); fruitRAF=null; }
    if(beeRAF){   cancelAnimationFrame(beeRAF);   beeRAF=null;   }
    if(goldRAF){  cancelAnimationFrame(goldRAF);  goldRAF=null;  }
    if(moleRAF){  cancelAnimationFrame(moleRAF);  moleRAF=null;  }
    if(memoryRAF){cancelAnimationFrame(memoryRAF);memoryRAF=null;}
    if(typeof bubbleRAF!=='undefined'&&bubbleRAF){cancelAnimationFrame(bubbleRAF);bubbleRAF=null;}
    if(typeof stackRAF!=='undefined'&&stackRAF){cancelAnimationFrame(stackRAF);stackRAF=null;}
    if(typeof bossRAF!=='undefined'&&bossRAF){cancelAnimationFrame(bossRAF);bossRAF=null;}
    if(typeof catchRAF!=='undefined'&&catchRAF){cancelAnimationFrame(catchRAF);catchRAF=null;}
    if(typeof floodRAF!=='undefined'&&floodRAF){cancelAnimationFrame(floodRAF);floodRAF=null;}
    if(typeof arenaRAF!=='undefined'&&arenaRAF){cancelAnimationFrame(arenaRAF);arenaRAF=null;}
    if(typeof snakeRAF!=='undefined'&&snakeRAF){cancelAnimationFrame(snakeRAF);snakeRAF=null;}
    if(typeof brickRAF!=='undefined'&&brickRAF){cancelAnimationFrame(brickRAF);brickRAF=null;}
    if(typeof runnerRAF!=='undefined'&&runnerRAF){cancelAnimationFrame(runnerRAF);runnerRAF=null;}
    if(typeof spaceRAF!=='undefined'&&spaceRAF){cancelAnimationFrame(spaceRAF);spaceRAF=null;}
    if(typeof rhythmRAF!=='undefined'&&rhythmRAF){cancelAnimationFrame(rhythmRAF);rhythmRAF=null;}
    if(typeof mazeRAF!=='undefined'&&mazeRAF){cancelAnimationFrame(mazeRAF);mazeRAF=null;}
    if(typeof megaRAF!=='undefined'&&megaRAF){cancelAnimationFrame(megaRAF);megaRAF=null;}
    if(timerRAF){ cancelAnimationFrame(timerRAF); timerRAF=null; }
    if(typeof borderSparkInterval !== 'undefined' && borderSparkInterval){ clearInterval(borderSparkInterval); }
    if(typeof fireInterval !== 'undefined' && fireInterval){ clearInterval(fireInterval); }
  } else {
    overlay.style.display = 'none';
    btn.textContent = '⏸';
    if(dodgeMode)  { dodgeLast=0; dodgeRAF=requestAnimationFrame(dodgeLoop); }
    if(fruitMode)  { fruitLast=0; fruitRAF=requestAnimationFrame(fruitLoop); }
    if(beeMode)    { beeLast=0;   beeRAF=requestAnimationFrame(beeLoop);     }
    if(goldMode)   { goldLast=0;  goldRAF=requestAnimationFrame(goldLoop);   }
    if(moleMode)   { moleLast=0;  moleRAF=requestAnimationFrame(moleLoop);   }
    if(memoryMode) { memoryLast=0;memoryRAF=requestAnimationFrame(memoryLoop);}
    if(typeof bubbleMode!=='undefined'&&bubbleMode) { bubbleLast=0;bubbleRAF=requestAnimationFrame(bubbleLoop);}
    if(typeof stackMode!=='undefined'&&stackMode)   { stackLast=0;stackRAF=requestAnimationFrame(stackLoop);}
    if(typeof bossMode!=='undefined'&&bossMode)     { bossLast=0;bossRAF=requestAnimationFrame(bossLoop);}
    if(typeof catchMode!=='undefined'&&catchMode)   { catchLast=0;catchRAF=requestAnimationFrame(catchLoop);}
    if(typeof floodMode!=='undefined'&&floodMode)   { floodRAF=requestAnimationFrame(floodLoop);}
    if(typeof arenaMode!=='undefined'&&arenaMode)   { arenaLast=0;arenaRAF=requestAnimationFrame(arenaLoop);}
    if(typeof snakeMode!=='undefined'&&snakeMode)   { snakeLast=0;snakeRAF=requestAnimationFrame(snakeLoop);}
    if(typeof brickMode!=='undefined'&&brickMode)   { brickLast=0;brickRAF=requestAnimationFrame(brickLoop);}
    if(typeof runnerMode!=='undefined'&&runnerMode) { runnerLast=0;runnerRAF=requestAnimationFrame(runnerLoop);}
    if(typeof spaceMode!=='undefined'&&spaceMode)   { spaceLast=0; spaceRAF=requestAnimationFrame(spaceLoop);}
    if(typeof rhythmMode!=='undefined'&&rhythmMode) { rhythmLast=0;rhythmRAF=requestAnimationFrame(rhythmLoop); }
    if(typeof mazeMode!=='undefined'&&mazeMode)     { mazeLast=0;  mazeRAF=requestAnimationFrame(mazeLoop);}
    if(typeof megaMode!=='undefined'&&megaMode)     { megaLast=0;  megaRAF=requestAnimationFrame(megaLoop);}
    if(secretMode) { resetSecretTimer(); }
    resumeContextBgm();
  }
}

// 📖 Hướng dẫn cơ chế theo VÒNG độ khó của map thường.
// Người chơi thường: chỉ đọc được cơ chế của các vòng ĐÃ CHẠM tới (tới vòng nào biết vòng đó).
// Tài khoản admin: đọc được cơ chế của TẤT CẢ các vòng (1-41).
function showRoundGuide(){
  const isAdmin = !!(currentUser && currentUser.role==='admin');
  const reached = (typeof highestReachedTier==='function') ? highestReachedTier() : 0;
  const cur = (typeof mainHardTier!=='undefined' ? (mainHardTier|0) : 0);
  const maxTier = isAdmin ? 41 : reached;
  const title = document.getElementById('roundguide-title');
  const body  = document.getElementById('roundguide-body');
  title.textContent = isAdmin ? '📖 Cơ chế TẤT CẢ các vòng (admin)' : '📖 Hướng dẫn cơ chế vòng của bạn';
  if(maxTier < 1){
    body.innerHTML = '<p style="font-size:13px;line-height:1.5;color:#dfe6f2;">Bạn chưa tới vòng nào có cơ chế đặc biệt. '+
      'Mỗi khi qua một map ẩn, map thường sẽ thêm một cơ chế mới — quay lại đây để đọc hướng dẫn nhé!</p>';
    document.getElementById('roundguide-panel').classList.add('show');
    return;
  }
  let html = '';
  if(!isAdmin){
    html += '<p style="font-size:12px;color:#9aa7bd;margin:0 0 10px;">Bạn đang ở <b style="color:#ffd54a;">Vòng '+
      (cur||1)+'</b>. Dưới đây là cơ chế mọi vòng bạn đã chạm tới.</p>';
  }
  for(let v=1; v<=maxTier; v++){
    const desc = roundMechDescFor(v);
    if(!desc) continue;
    const isCur = (v===cur);
    html += '<div class="roundguide-item'+(isCur?' cur':'')+'">'+
      '<h4>'+(isCur?'▶ ':'')+'Vòng '+v+' <span class="rg-tier">'+
        (v<=20?'(đơn)':v<=40?'(cơ chế đôi)':'(đặc biệt)')+(isCur?' · đang chơi':'')+'</span></h4>'+
      '<p>'+desc+'</p></div>';
  }
  body.innerHTML = html;
  document.getElementById('roundguide-panel').classList.add('show');
}

function showMapHelp(key){
  const info = MAP_HELP[key];
  if(!info) return;
  document.getElementById('maphelp-title').textContent = info.title;
  document.getElementById('maphelp-body').innerHTML = info.body;
  document.getElementById('maphelp-panel').classList.add('show');
}

function renderHiddenMapMenu(){
  const btn=document.getElementById('hiddenmap-menu-btn');
  const list=document.getElementById('hiddenmap-menu-list');
  if(!btn||!list) return;
  btn.style.display = clearedHiddenMaps.size>0 ? 'flex' : 'none';
  list.innerHTML='';
  ADMIN_MAPS.forEach(m=>{
    const cleared = clearedHiddenMaps.has(m.key);
    const row = document.createElement('div');
    row.className = 'admin-map-row';
    const item = document.createElement('button');
    item.className = 'admin-map-btn'+(cleared?'':' locked');
    item.style.flex = '1 1 auto';
    item.innerHTML = (cleared?'▶ ':'🔒 ')+'<b>'+m.label.split(' — ')[0]+'</b> — '+m.label.split(' — ')[1];
    if(cleared){
      item.addEventListener('click', ()=>{
        document.getElementById('hiddenmap-menu-panel').classList.remove('show');
        const startScreen = document.getElementById('start-screen');
        startScreen.classList.add('hide');
        setTimeout(()=>{ startScreen.style.display='none'; }, 500);
        sfxClick();
        hardResetAllModes();
        startGame();
        m.run();
      });
    }
    row.appendChild(item);
    if(cleared){
      const infoBtn = document.createElement('button');
      infoBtn.className = 'admin-map-help-btn';
      infoBtn.title = 'Xem cách chơi';
      infoBtn.textContent = '❓';
      infoBtn.addEventListener('click', (e)=>{
        e.stopPropagation();
        showMapHelp(m.key);
      });
      row.appendChild(infoBtn);
    }
    list.appendChild(row);
  });
}

function initAdminPanel(){
  const list = document.getElementById('admin-map-list');
  ADMIN_MAPS.forEach(m=>{
    const btn = document.createElement('button');
    btn.className = 'admin-map-btn';
    btn.innerHTML = '<b>'+m.label.split(' — ')[0]+'</b> — '+m.label.split(' — ')[1];
    btn.addEventListener('click', ()=>{
      document.getElementById('admin-panel').classList.remove('show');
      const startScreen = document.getElementById('start-screen');
      startScreen.classList.add('hide');
      setTimeout(()=>{ startScreen.style.display='none'; }, 500);
      sfxClick();
      hardResetAllModes();  // dọn sạch map cũ (kể cả map startGame() gốc bỏ sót) trước khi chuyển
      startGame();          // reset trạng thái game về sạch
      m.run();               // vào thẳng map ẩn được chọn
    });
    list.appendChild(btn);
  });

  document.getElementById('admin-btn').addEventListener('click', ()=>{
    sfxClick();
    document.getElementById('admin-panel').classList.add('show');
  });
  document.getElementById('admin-close-btn').addEventListener('click', ()=>{
    document.getElementById('admin-panel').classList.remove('show');
  });

  // 🎯 Đánh thử map thường theo vòng độ khó 1-41 (1-20 đơn, 21-40 cơ chế đôi, 41 = Thế giới gương — admin test đủ mọi "map")
  const roundList=document.getElementById('admin-round-list');
  for(let v=1; v<=41; v++){
    const rb=document.createElement('button');
    rb.className='admin-map-btn';
    rb.style.cssText='padding:6px 4px;text-align:center;font-size:12px;'+(v>20?'border-color:#c084fc;':'');
    rb.innerHTML='<b>V'+v+'</b>';
    if(v<=20){
      rb.title='Map thường — vòng '+v+' ('+ROUND_MECH_NAMES[v]+')';
    } else if(v<=40){
      const [a,b]=comboPairForTier(v);
      rb.title='Map thường — vòng '+v+' [ĐÔI] '+ROUND_MECH_NAMES[a]+' + '+ROUND_MECH_NAMES[b];
    } else {
      rb.title='Map thường — vòng '+v+' ('+ROUND_MECH_NAMES[21]+')';
    }
    rb.addEventListener('click', ()=>{
      document.getElementById('admin-panel').classList.remove('show');
      const startScreen=document.getElementById('start-screen');
      if(startScreen){
        startScreen.classList.add('hide');
        setTimeout(()=>{ startScreen.style.display='none'; }, 500);
      }
      sfxClick();
      hardResetAllModes();
      startGame();
      mainHardTier=v;
      resetMechanicState();
      applyRoundMechanics();
      if(v<=20) showComboFlash(0,false,'🎯 Test map thường — vòng '+v);
      else if(v<=40){
        const [a,b]=comboPairForTier(v);
        showComboFlash(0,false,'🎯 Test vòng '+v+' [ĐÔI]: '+ROUND_MECH_NAMES[a]+' + '+ROUND_MECH_NAMES[b]);
      } else {
        showComboFlash(0,false,'🎯 Test vòng '+v+': '+ROUND_MECH_NAMES[21]);
      }
    });
    roundList.appendChild(rb);
  }

  // ⚙️ Mục Nhịp & Thưởng
  document.getElementById('mechcfg-open-btn').addEventListener('click', ()=>{
    if(!currentUser || currentUser.role!=='admin') return; // mục cố định — chỉ admin được xem/chỉnh
    sfxClick();
    renderMechCfg();
    document.getElementById('admin-panel').classList.remove('show');
    document.getElementById('mechcfg-panel').classList.add('show');
  });
  document.getElementById('mechcfg-close-btn').addEventListener('click', ()=>{
    document.getElementById('mechcfg-panel').classList.remove('show');
  });
  document.getElementById('mechcfg-reset-btn').addEventListener('click', ()=>{
    sfxClick();
    Object.keys(MECH_DEFAULTS).forEach(k=>{
      MECH_CFG[k].nhip=MECH_DEFAULTS[k].nhip;
      MECH_CFG[k].thuong=MECH_DEFAULTS[k].thuong;
      MECH_CFG[k].phat=MECH_DEFAULTS[k].phat;
    });
    saveMechCfg(); renderMechCfg();
  });

  document.getElementById('hiddenmap-menu-btn').addEventListener('click', ()=>{
    sfxClick();
    renderHiddenMapMenu();
    document.getElementById('hiddenmap-menu-panel').classList.add('show');
  });
  document.getElementById('hiddenmap-menu-close-btn').addEventListener('click', ()=>{
    document.getElementById('hiddenmap-menu-panel').classList.remove('show');
  });
  renderHiddenMapMenu();

  document.getElementById('hiddenmap-help-btn').addEventListener('click', ()=>{
    sfxClick();
    if(activeHiddenMapKey) showMapHelp(activeHiddenMapKey);
  });
  document.getElementById('maphelp-close-btn').addEventListener('click', ()=>{
    document.getElementById('maphelp-panel').classList.remove('show');
  });

  const rgBtn=document.getElementById('roundguide-btn');
  if(rgBtn) rgBtn.addEventListener('click', ()=>{ sfxClick(); showRoundGuide(); });
  const rgClose=document.getElementById('roundguide-close-btn');
  if(rgClose) rgClose.addEventListener('click', ()=>{ document.getElementById('roundguide-panel').classList.remove('show'); });

  const advBtn=document.getElementById('adventure-toggle-btn');
  if(advBtn){
    if(adventureUnlocked) advBtn.style.display='inline-block';
    advBtn.addEventListener('click', ()=>{ sfxClick(); setAdventureTheme(!adventureThemeOn); });
  }
}

function doChangePassword(oldPass, newPass, newPass2){
  const msg = document.getElementById('cp-msg');
  msg.className = 'account-msg';
  msg.textContent = '';
  if(!currentUser){ msg.classList.add('err'); msg.textContent = 'Bạn chưa đăng nhập.'; return; }
  if(!oldPass || !newPass || !newPass2){ msg.classList.add('err'); msg.textContent = 'Vui lòng nhập đầy đủ thông tin.'; return; }
  const users = loadUsers();
  const u = users[currentUser.username];
  if(!u || u.password !== oldPass){ msg.classList.add('err'); msg.textContent = 'Mật khẩu hiện tại không đúng.'; return; }
  if(newPass.length < 4){ msg.classList.add('err'); msg.textContent = 'Mật khẩu mới cần tối thiểu 4 ký tự.'; return; }
  if(newPass !== newPass2){ msg.classList.add('err'); msg.textContent = 'Mật khẩu mới nhập lại không khớp.'; return; }
  u.password = newPass;
  saveUsers(users);
  msg.classList.add('ok');
  msg.textContent = 'Đổi mật khẩu thành công!';
  document.getElementById('change-password-form').reset();
}

function initAccountPanel(){
  const accountBtn = document.getElementById('account-btn');
  const panel = document.getElementById('account-panel');
  accountBtn.addEventListener('click', ()=>{
    sfxClick();
    document.getElementById('cp-msg').textContent = '';
    document.getElementById('cp-msg').className = 'account-msg';
    panel.classList.add('show');
  });
  document.getElementById('account-close-btn').addEventListener('click', ()=>{
    panel.classList.remove('show');
  });
  document.getElementById('change-password-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    doChangePassword(
      document.getElementById('cp-old').value,
      document.getElementById('cp-new').value,
      document.getElementById('cp-new2').value
    );
  });
  document.getElementById('logout-btn').addEventListener('click', ()=>{
    doLogout();
  });
}

function initHelpPanel(){
  const btn = document.getElementById('help-btn');
  const panel = document.getElementById('help-panel');
  const chk = document.getElementById('help-agree-chk');
  const okBtn = document.getElementById('help-ok-btn');
  const closeBtn = document.getElementById('help-close-btn');
  if(!btn || !panel) return;

  function markRead(){
    saveRulesRead();
    btn.classList.add('read');
    btn.textContent='✅';
  }
  if(isRulesRead()) markRead();

  function openPanel(){
    if(typeof sfxClick==='function') sfxClick();
    chk.checked=false;
    okBtn.classList.remove('enabled');
    renderRoundHelp();
    panel.classList.add('show');
  }
  function closePanel(){ panel.classList.remove('show'); }

  btn.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  panel.addEventListener('click', (e)=>{ if(e.target===panel) closePanel(); });
  chk.addEventListener('change', ()=>{
    okBtn.classList.toggle('enabled', chk.checked);
  });
  okBtn.addEventListener('click', ()=>{
    if(!chk.checked) return;
    markRead();
    closePanel();
  });
}
