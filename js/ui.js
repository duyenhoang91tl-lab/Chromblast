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
  setTimeout(()=>{ el.textContent=t('hintDefault'); },1600);
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
  // Cho phép tạm dừng ở CẢ bàn chính lẫn map ẩn (bàn chính không có vòng lặp
  // RAF nào cần dừng — chỉ hiện overlay + dừng nhạc).
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
// Người chơi chỉ đọc được cơ chế của các vòng ĐÃ CHẠM tới (tới vòng nào biết vòng đó).
function showRoundGuide(){
  const reached = (typeof highestReachedTier==='function') ? highestReachedTier() : 0;
  const cur = (typeof mainHardTier!=='undefined' ? (mainHardTier|0) : 0);
  const maxTier = reached;
  const title = document.getElementById('roundguide-title');
  const body  = document.getElementById('roundguide-body');
  title.textContent = t('roundGuideTitle');
  if(maxTier < 1){
    body.innerHTML = '<p style="font-size:13px;line-height:1.5;color:#dfe6f2;">'+t('rgNone')+'</p>';
    document.getElementById('roundguide-panel').classList.add('show');
    return;
  }
  let html = '<p style="font-size:12px;color:#9aa7bd;margin:0 0 10px;">'+t('rgYouAt', cur||1)+'</p>';
  for(let v=1; v<=maxTier; v++){
    const desc = roundMechDescFor(v);
    if(!desc) continue;
    const isCur = (v===cur);
    html += '<div class="roundguide-item'+(isCur?' cur':'')+'">'+
      '<h4>'+(isCur?'▶ ':'')+t('roundN',v)+' <span class="rg-tier">'+
        (v<=20?t('rgSingle'):v<=40?t('rgCombo'):t('rgSpecial'))+(isCur?t('rgPlaying'):'')+'</span></h4>'+
      '<p>'+desc+'</p></div>';
  }
  body.innerHTML = html;
  document.getElementById('roundguide-panel').classList.add('show');
}

function showMapHelp(key){
  const info = MAP_HELP_FOR(key);
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
  HIDDEN_MAP_LIST.forEach(m=>{
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

// Khởi tạo các panel dùng chung của game (menu map ẩn, hướng dẫn, adventure).
// Bản phát hành CH Play: đã GỠ toàn bộ bảng admin / test vòng / chỉnh "Nhịp & Thưởng".
function initGamePanels(){
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
  // Nút ⚙️ mở Settings hub (không mở thẳng account)
  const accountBtn = document.getElementById('account-btn');
  const panel = document.getElementById('account-panel');
  if(accountBtn){
    accountBtn.addEventListener('click', ()=>{
      sfxClick();
      if(typeof openSettingsPanel==='function') openSettingsPanel();
      else panel.classList.add('show');
    });
  }
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
  if(typeof initSettingsMenu==='function') initSettingsMenu();
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

// Hướng dẫn từng map ẩn đa ngôn ngữ: xem js/i18n-content.js (MAP_HELP_FOR).
// Ánh xạ vòng 1-20 (0-based) sang khoá cơ chế trong MECH_CFG, để tra điểm thưởng/phạt LUÔN ĐÚNG
const ROUND_HELP = []; // dựng từ MECH_NAME/MECH_DESC (i18n-content.js) theo NGÔN NGỮ hiện tại
let _roundHelpLang = null;
function ensureComboRoundHelp(){
  if(typeof comboPairForTier!=='function' || typeof MECH_DESC!=='function') return;
  if(_roundHelpLang === currentLang) return; // đã dựng đúng ngôn ngữ này rồi
  _roundHelpLang = currentLang;
  ROUND_HELP.length = 0;
  for(let v=1; v<=20; v++) ROUND_HELP.push({ title:t('roundN',v)+' — '+MECH_NAME(v), body:MECH_DESC(v) });
  for(let v=21; v<=40; v++){
    const [a,b]=comboPairForTier(v);
    ROUND_HELP.push({
      title:'🌗 '+t('roundN',v)+' — '+MECH_NAME(a)+' + '+MECH_NAME(b),
      body:t('comboBoth')+'<br>① <b>'+MECH_NAME(a)+':</b> '+MECH_DESC(a)
        +'<br>② <b>'+MECH_NAME(b)+':</b> '+MECH_DESC(b)
    });
  }
}
function renderRoundHelp(){
  ensureComboRoundHelp();
  const list = document.getElementById('round-help-list');
  if(!list) return;
  const reached = clearedHiddenMaps.size; // số map ẩn từng thắng ~ số vòng cơ chế từng mở khoá
  list.innerHTML='';
  ROUND_HELP.forEach((r,i)=>{
    // Vòng 1-20 (i<20): mở dần từng vòng theo số map ẩn đã thắng.
    // Vòng 21-40 (i>=20, cơ chế đôi): mở TUẦN TỰ từng vòng một — phải vượt qua vòng
    // trước (đạt đủ điểm mốc trên bàn cờ thường) mới mở khoá vòng kế tiếp.
    const unlocked = i<20 ? (i<reached) : (reached>=20 && (i+1)<=maxComboTierReached);
    if(unlocked){
      const det = document.createElement('details');
      det.innerHTML = '<summary>'+r.title+'</summary><div class="map-detail-body">'+r.body+'</div>';
      list.appendChild(det);
    } else {
      const locked = document.createElement('div');
      locked.className='admin-map-btn locked';
      locked.style.cursor='default';
      locked.innerHTML = i<20
        ? t('lockedPlay', i+1)
        : (reached>=20 ? t('lockedPass', i+1, i) : t('lockedAll', i+1));
      list.appendChild(locked);
    }
  });
}

/* ════════════════════════════════════════════════════════
   HUD ARCADE — dùng chung map thường + mọi map ẩn
   (SCORE / LEVEL badge / TARGETS / pause · cài đặt · mute)
════════════════════════════════════════════════════════ */
function enableArcadeHud(){
  const root=document.getElementById('game-root');
  if(!root) return;
  root.classList.add('hud-arcade');
  const acc=document.getElementById('account-btn');
  if(acc){
    acc.textContent='⚙️';
    acc.title=(typeof t==='function'?t('ttSettings'):'Cài đặt');
    acc.dataset.arcadeOn='1';
  }
  refreshArcadeHud();
}

function refreshArcadeHud(){
  const root=document.getElementById('game-root');
  if(!root || !root.classList.contains('hud-arcade')) return;

  // Map ẩn 1: đánh dấu để CSS ẩn pháo giữa bàn
  root.classList.toggle('map-secret1', !!(typeof secretMode!=='undefined' && secretMode));

  const cap=document.getElementById('level-cap');
  if(cap) cap.style.display='block';
  const lb=document.getElementById('level-box');
  if(lb) lb.textContent=String(typeof playerLevel==='number' ? playerLevel : (typeof level==='number' ? level : 1));

  const targets=document.getElementById('header-targets');
  if(!targets) return;

  let val='';
  if(typeof secretMode!=='undefined' && secretMode){
    const need=typeof TEST_UNLOCK_SCORE==='number' ? TEST_UNLOCK_SCORE : 100;
    const got=Math.min((typeof secret1Gained==='number' ? secret1Gained : 0)|0, need);
    const lives=(typeof secretLives==='number' ? secretLives : 3)|0;
    val='❤️ '+lives+'/3 · '+got.toLocaleString()+'/'+need.toLocaleString();
  } else if(document.getElementById('grid-wrap')?.classList.contains('secret-mode')){
    const badge=document.getElementById('mode-badge');
    val=(badge && badge.textContent ? badge.textContent.replace(/^🧩\s*/,'').trim() : 'MAP ẨN') || 'MAP ẨN';
  } else {
    const bc=document.getElementById('burst-count');
    const progress=(bc && bc.textContent && bc.style.display!=='none') ? bc.textContent.trim() : '';
    const bestN=Math.round(typeof best==='number' ? best : 0).toLocaleString();
    val=progress || ('🏆 Best '+bestN);
  }

  targets.innerHTML=
    '<div class="arcade-targets">'+
      '<span class="arcade-targets-label">TARGETS</span>'+
      '<span class="arcade-targets-val">'+val+'</span>'+
    '</div>';
}

/* ════════════════════════════════════════════════════════
   SETTINGS MENU — hub + More Settings + Cup + Language
════════════════════════════════════════════════════════ */
function closeAllSettingsOverlays(){
  ['settings-panel','settings-more-panel','settings-lang-panel','settings-cup-panel','settings-text-panel','spin-panel']
    .forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.remove('show'); });
}

function openSettingsPanel(){
  syncSettingsToggles();
  document.getElementById('settings-panel')?.classList.add('show');
}

function syncSettingsToggles(){
  const sfxBtn=document.getElementById('set-sfx-toggle');
  const bgmBtn=document.getElementById('set-bgm-toggle');
  const sfxIco=document.getElementById('set-sfx-ico');
  const bgmIco=document.getElementById('set-bgm-ico');
  const muted=!!(typeof sfxMuted!=='undefined' && sfxMuted);
  const bgmOff=!!(typeof bgmMuted!=='undefined' && bgmMuted);
  if(sfxBtn) sfxBtn.classList.toggle('is-off', muted);
  if(bgmBtn) bgmBtn.classList.toggle('is-off', bgmOff);
  if(sfxIco) sfxIco.textContent = muted ? '🔇' : '🔊';
  if(bgmIco) bgmIco.textContent = bgmOff ? '🎵' : '🎵';
  const muteBtn=document.getElementById('mute-btn');
  if(muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
}

function toggleSfxSetting(){
  if(typeof sfxMuted==='undefined') return;
  sfxMuted=!sfxMuted;
  if(sfxMuted){ try{ stopBgm(); stopRhythmBgm(); }catch(e){} }
  else { try{ if(!bgmMuted && typeof resumeContextBgm==='function') resumeContextBgm(); }catch(e){} }
  syncSettingsToggles();
  try{ sfxClick(); }catch(e){}
}

function toggleBgmSetting(){
  if(typeof bgmMuted==='undefined') return;
  bgmMuted=!bgmMuted;
  if(bgmMuted){ try{ stopBgm(); stopRhythmBgm(); }catch(e){} }
  else if(!sfxMuted){ try{ if(typeof resumeContextBgm==='function') resumeContextBgm(); }catch(e){} }
  syncSettingsToggles();
  try{ sfxClick(); }catch(e){}
}

function openSettingsAccount(){
  closeAllSettingsOverlays();
  const panel=document.getElementById('account-panel');
  if(!panel) return;
  const msg=document.getElementById('cp-msg');
  if(msg){ msg.textContent=''; msg.className='account-msg'; }
  panel.classList.add('show');
}

function openSettingsLang(){
  document.getElementById('settings-panel')?.classList.remove('show');
  if(!document.getElementById('lang-picker-settings')?.childElementCount){
    try{ buildLangPicker('lang-picker-settings'); }catch(e){}
  }
  document.getElementById('settings-lang-panel')?.classList.add('show');
}

function openSettingsMap(){
  closeAllSettingsOverlays();
  try{ renderHiddenMapMenu(); }catch(e){}
  document.getElementById('hiddenmap-menu-panel')?.classList.add('show');
}

function renderCupPanel(){
  const stats=document.getElementById('cup-stats');
  const awards=document.getElementById('cup-awards');
  if(!stats||!awards) return;
  let loginDays=1;
  try{
    const st=(typeof getDailyStatus==='function')?getDailyStatus():null;
    if(st && st.streakDay) loginDays=st.streakDay;
  }catch(e){}
  const bestN=Math.round(typeof best==='number'?best:0);
  const rounds=(typeof clearedHiddenMaps!=='undefined' && clearedHiddenMaps)?clearedHiddenMaps.size:0;
  const comboHi=Math.max(
    (typeof consecutiveBursts==='number'?consecutiveBursts:0),
    (typeof combo==='number'?combo:0),
    (typeof secretStreak==='number'?secretStreak:0)
  );
  stats.innerHTML=
    '<div class="cup-stat"><div class="cup-stat-num">'+comboHi+'</div><div class="cup-stat-lab">'+(t('cupHighestCombo')||'Highest Combo')+'</div></div>'+
    '<div class="cup-stat"><div class="cup-stat-num">'+bestN.toLocaleString()+'</div><div class="cup-stat-lab">'+(t('cupBestScore')||'Best Score')+'</div></div>'+
    '<div class="cup-stat"><div class="cup-stat-num">'+rounds+'</div><div class="cup-stat-lab">'+(t('cupRounds')||'Rounds')+'</div></div>'+
    '<div class="cup-stat"><div class="cup-stat-num">'+loginDays+'</div><div class="cup-stat-lab">'+(t('cupLoginDays')||'Login Days')+'</div></div>';

  const icons={
    first_burst:'💥', combo5:'🔥', score1000:'⭐', score5000:'🌟',
    secret1:'🗺️', ultra:'⚡', fruit50:'🍉', survive60:'🐢',
    level5:'📈', level10:'🏆'
  };
  const list=(typeof ACHIEVEMENTS==='object' && ACHIEVEMENTS)?Object.values(ACHIEVEMENTS):[];
  awards.innerHTML=list.map(a=>{
    const done=!!a.done;
    return '<div class="cup-award">'+
      '<div class="cup-badge'+(done?' done':'')+'">'+(icons[a.id]||'🎖️')+(done?'<span class="set-dot"></span>':'')+'</div>'+
      '<div class="cup-award-name">'+a.label.replace(/^[^A-Za-zÀ-ỹ0-9]+/,'')+'</div>'+
      '<div class="cup-award-prog">'+(done?'1/1':'0/1')+'</div>'+
    '</div>';
  }).join('');
}

function openSettingsCup(){
  document.getElementById('settings-panel')?.classList.remove('show');
  renderCupPanel();
  document.getElementById('settings-cup-panel')?.classList.add('show');
}

function openSettingsMore(){
  document.getElementById('settings-panel')?.classList.remove('show');
  document.getElementById('settings-more-panel')?.classList.add('show');
}

function openSettingsText(title, body){
  document.getElementById('settings-more-panel')?.classList.remove('show');
  const tEl=document.getElementById('settings-text-title');
  const bEl=document.getElementById('settings-text-body');
  if(tEl) tEl.textContent=title;
  if(bEl) bEl.textContent=body;
  document.getElementById('settings-text-panel')?.classList.add('show');
}

function settingsGoHome(){
  closeAllSettingsOverlays();
  try{ hardResetAllModes(); }catch(e){}
  const screen=document.getElementById('start-screen');
  if(screen){ screen.style.display='flex'; screen.classList.remove('hidden'); }
}

function settingsReplay(){
  closeAllSettingsOverlays();
  try{ sfxClick(); }catch(e){}
  if(typeof startGame==='function') startGame();
}

function initSettingsMenu(){
  const close=id=>()=>{ document.getElementById(id)?.classList.remove('show'); };
  document.getElementById('settings-close-btn')?.addEventListener('click', close('settings-panel'));
  document.getElementById('settings-more-close-btn')?.addEventListener('click', ()=>{
    close('settings-more-panel')();
    openSettingsPanel();
  });
  document.getElementById('settings-lang-close-btn')?.addEventListener('click', ()=>{
    close('settings-lang-panel')();
    openSettingsPanel();
  });
  document.getElementById('settings-cup-close-btn')?.addEventListener('click', close('settings-cup-panel'));
  document.getElementById('settings-cup-back-btn')?.addEventListener('click', ()=>{
    close('settings-cup-panel')();
    openSettingsPanel();
  });
  document.getElementById('settings-text-close-btn')?.addEventListener('click', ()=>{
    close('settings-text-panel')();
    document.getElementById('settings-more-panel')?.classList.add('show');
  });

  document.getElementById('set-sfx-toggle')?.addEventListener('click', toggleSfxSetting);
  document.getElementById('set-bgm-toggle')?.addEventListener('click', toggleBgmSetting);
  document.getElementById('set-btn-account')?.addEventListener('click', ()=>{ sfxClick(); openSettingsAccount(); });
  document.getElementById('set-btn-lang')?.addEventListener('click', ()=>{ sfxClick(); openSettingsLang(); });
  document.getElementById('set-btn-map')?.addEventListener('click', ()=>{ sfxClick(); openSettingsMap(); });
  document.getElementById('set-btn-cup')?.addEventListener('click', ()=>{ sfxClick(); openSettingsCup(); });
  document.getElementById('set-btn-spin')?.addEventListener('click', ()=>{
    sfxClick();
    if(typeof openLuckySpin==='function') openLuckySpin();
  });
  document.getElementById('set-btn-more')?.addEventListener('click', ()=>{ sfxClick(); openSettingsMore(); });
  document.getElementById('set-btn-home')?.addEventListener('click', ()=>{ sfxClick(); settingsGoHome(); });
  document.getElementById('set-btn-replay')?.addEventListener('click', settingsReplay);

  document.getElementById('set-contact-btn')?.addEventListener('click', ()=>{
    sfxClick();
    openSettingsText(t('setContact')||'Contact Us', 'Email: duyenhoang.tl@gmail.com\nChromaBlast support');
  });
  document.getElementById('set-share-btn')?.addEventListener('click', ()=>{
    sfxClick();
    const text='Play ChromaBlast with me!';
    if(navigator.share){ navigator.share({ title:'ChromaBlast', text }).catch(()=>{}); }
    else { try{ navigator.clipboard.writeText(text); }catch(e){} openSettingsText(t('setShare')||'Share', text); }
  });
  document.getElementById('set-terms-btn')?.addEventListener('click', ()=>{
    sfxClick();
    openSettingsText(t('setTerms')||'Terms of Service',
      'ChromaBlast is provided for entertainment.\nPlease play fairly and respect other players.\nLocal progress is stored on your device.');
  });
  document.getElementById('set-privacy-btn')?.addEventListener('click', ()=>{
    sfxClick();
    window.open('privacy-policy.html', '_blank', 'noopener');
  });
  document.getElementById('set-about-btn')?.addEventListener('click', ()=>{
    sfxClick();
    openSettingsText(t('setAbout')||'About Us',
      'ChromaBlast\nVersion 1.0.0\nA colorful block puzzle adventure with hidden mini-games.\nThanks for playing!');
  });

  // click backdrop to close
  ['settings-panel','settings-more-panel','settings-lang-panel','settings-cup-panel','settings-text-panel','spin-panel'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('click', e=>{ if(e.target===el) el.classList.remove('show'); });
  });

  try{ buildLangPicker('lang-picker-settings'); }catch(e){}
  syncSettingsToggles();
}
