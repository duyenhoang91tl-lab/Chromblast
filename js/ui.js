// ═══════════════════════════════════════════════════════════════
// ui.js — Lớp giao diện (UI) tách khỏi main.js
// Gồm: popup/overlay, menu bắt đầu, tạm dừng, cài đặt (đổi mật khẩu),
//       bảng admin/tài khoản/hướng dẫn, và menu CHỌN MAP ẩn.
// NẠP TRƯỚC main.js: file này chỉ chứa ĐỊNH NGHĨA hàm (không chạy gì lúc load),
// nên khi main.js chạy chuỗi khởi động thì mọi hàm UI đã sẵn sàng. Các hàm ở
// đây chỉ tham chiếu biến/hàm game lúc CHẠY (runtime) nên không cần main.js load trước.
// Dùng chung phạm vi global với audio.js / save.js / main.js (không phải module).
// ═══════════════════════════════════════════════════════════════

/**
 * Chế độ chơi toàn màn — chỉ hiện UI của mode đó, ẩn Chromablast / mode khác.
 * mode: null | 'caro' | 'versus'
 */

function setExclusivePlayMode(mode){
  const m = mode === 'caro' || mode === 'versus' ? mode : null;
  document.body.classList.toggle('mode-caro', m === 'caro');
  document.body.classList.toggle('mode-versus', m === 'versus');
  document.body.classList.toggle('mode-exclusive', !!m);
  try{ if(typeof syncChatFabVisibility === 'function') syncChatFabVisibility(); }catch(e){}
}
try{ window.setExclusivePlayMode = setExclusivePlayMode; }catch(e){}

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

function showHint(msg, opts){
  const el=document.getElementById('hint-bar');
  if(!el) return;
  const hold=(opts&&opts.hold)|0 || 1800;
  const sticky=!!(opts&&opts.sticky);
  const aim=!!(opts&&opts.aim);
  const text = (msg == null ? '' : String(msg)).trim();
  if(!text){
    el.textContent='';
    el.classList.remove('hint-flash','hint-aim');
    return;
  }
  el.classList.remove('hint-flash','hint-aim');
  void el.offsetWidth;
  el.textContent=text;
  el.classList.add('hint-flash');
  if(aim) el.classList.add('hint-aim');
  if(window._hintTimer) clearTimeout(window._hintTimer);
  if(sticky) return;
  window._hintTimer=setTimeout(()=>{
    if(typeof pendingSkill!=='undefined' && pendingSkill) return;
    el.textContent='';
    el.classList.remove('hint-flash','hint-aim');
  }, hold);
}

function clearHintFlash(){
  const el=document.getElementById('hint-bar');
  if(!el) return;
  if(window._hintTimer) clearTimeout(window._hintTimer);
  el.textContent='';
  el.classList.remove('hint-flash','hint-aim');
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
    if(typeof syncMenuOpenState === 'function') syncMenuOpenState();
    setTimeout(()=>{
      screen.style.display='none';
      if(typeof syncMenuOpenState === 'function') syncMenuOpenState();
    }, 500);
  }
  function beginFromStart(){
    if(!preGameGatesReady()){
      maybeShowPreGameGates();
      return;
    }
    sfxClick();
    function afterCosmetics(){ hideStart(); }
    function afterBricks(){
      if(typeof maybeShowStarterBoardPicker==='function'){
        maybeShowStarterBoardPicker(afterCosmetics);
      } else {
        afterCosmetics();
      }
    }
    if(typeof maybeShowStarterBrickPicker==='function'){
      maybeShowStarterBrickPicker(afterBricks);
    } else {
      afterBricks();
    }
  }
  if(btn) btn.addEventListener('click', function(e){ e.stopPropagation(); beginFromStart(); });
  if(screen) screen.addEventListener('click', function(e){
    if(e.target.closest && e.target.closest('#start-btn')) return;
    beginFromStart();
  });
  try{ initPreGameGates(); }catch(e){}
}

function isPlayingHiddenMap(){
  return !!(typeof activeHiddenMapKey!=='undefined' && activeHiddenMapKey);
}

/** Chơi lại đúng map ẩn đang chơi (chỉ map ẩn). */

function replayActiveHiddenMap(){
  const key = (typeof activeHiddenMapKey!=='undefined') ? activeHiddenMapKey : null;
  if(!key) return false;
  const maps = (typeof HIDDEN_MAP_LIST!=='undefined') ? HIDDEN_MAP_LIST : [];
  const m = maps.find(x=>x && x.key===key);
  if(!m || typeof m.run!=='function') return false;
  try{ sfxClick(); }catch(e){}
  // Thoát pause sạch (không resume loop map cũ)
  gamePaused = false;
  const overlay = document.getElementById('pause-overlay');
  const btn = document.getElementById('pause-btn');
  if(overlay) overlay.style.display = 'none';
  if(btn) btn.textContent = '⏸';
  const replayBtn = document.getElementById('pause-replay-btn');
  if(replayBtn) replayBtn.style.display = 'none';
  try{ hardResetAllModes(); }catch(e){}
  try{ if(typeof startGame==='function') startGame(); }catch(e){}
  try{ m.run(); }catch(e){}
  return true;
}

/** Chơi lại từ nút tạm dừng — map ẩn: đúng map ẩn đó; map thường: khởi động lại
    bàn hiện tại từ đầu (điểm/độ khó của ván đang chơi, không phải tiến trình đã lưu). */
function replayFromPause(){
  if(isPlayingHiddenMap()) return replayActiveHiddenMap();
  try{ sfxClick(); }catch(e){}
  gamePaused = false;
  const overlay = document.getElementById('pause-overlay');
  const btn = document.getElementById('pause-btn');
  if(overlay) overlay.style.display = 'none';
  if(btn) btn.textContent = '⏸';
  const replayBtn = document.getElementById('pause-replay-btn');
  if(replayBtn) replayBtn.style.display = 'none';
  try{ hardResetAllModes(); }catch(e){}
  try{ if(typeof startGame==='function') startGame(); }catch(e){}
  return true;
}

function togglePause(){
  // Cho phép tạm dừng ở CẢ bàn chính lẫn map ẩn (bàn chính không có vòng lặp
  // RAF nào cần dừng — chỉ hiện overlay + dừng nhạc).
  sfxClick();
  gamePaused = !gamePaused;
  const overlay = document.getElementById('pause-overlay');
  const btn = document.getElementById('pause-btn');
  const replayBtn = document.getElementById('pause-replay-btn');
  if(gamePaused){
    overlay.style.display = 'flex';
    btn.textContent = '▶';
    if(replayBtn) replayBtn.style.display = '';
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
    if(replayBtn) replayBtn.style.display = 'none';
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
// Chỉ hiện vòng người chơi đã chạm tới.

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
  let html = '';
  html += '<p style="font-size:12px;color:#9aa7bd;margin:0 0 10px;">'+t('rgYouAt', cur||1)+'</p>';
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
  const maps = (typeof HIDDEN_MAP_LIST!=='undefined') ? HIDDEN_MAP_LIST : [];
  btn.style.display = clearedHiddenMaps.size>0 ? 'flex' : 'none';
  list.innerHTML='';
  maps.forEach(m=>{
    const cleared = clearedHiddenMaps.has(m.key);
    const row = document.createElement('div');
    row.className = 'admin-map-row';
    const item = document.createElement('button');
    item.className = 'admin-map-btn'+(cleared?'':' locked');
    item.style.flex = '1 1 auto';
    const parts = (m.label||'').split(' — ');
    item.innerHTML = (cleared?'▶ ':'🔒 ')+'<b>'+(parts[0]||m.key)+'</b>'+(parts[1]?' — '+parts[1]:'');
    if(cleared){
      item.addEventListener('click', ()=>{
        document.getElementById('hiddenmap-menu-panel').classList.remove('show');
        const startScreen = document.getElementById('start-screen');
        if(startScreen){
          startScreen.classList.add('hide');
          if(typeof syncMenuOpenState === 'function') syncMenuOpenState();
          setTimeout(()=>{
            startScreen.style.display='none';
            if(typeof syncMenuOpenState === 'function') syncMenuOpenState();
          }, 500);
        }
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

/** Đã gỡ bảng admin test trước khi lên CH Play. */

function initAdminPanel(){}

// Khởi tạo các panel dùng chung của game (menu map ẩn, hướng dẫn, adventure).

function initGamePanels(){
  document.getElementById('hiddenmap-menu-btn')?.addEventListener('click', ()=>{
    sfxClick();
    renderHiddenMapMenu();
    document.getElementById('hiddenmap-menu-panel')?.classList.add('show');
  });
  document.getElementById('hiddenmap-menu-close-btn')?.addEventListener('click', ()=>{
    document.getElementById('hiddenmap-menu-panel')?.classList.remove('show');
  });
  renderHiddenMapMenu();

  document.getElementById('hiddenmap-help-btn')?.addEventListener('click', ()=>{
    sfxClick();
    if(activeHiddenMapKey) showMapHelp(activeHiddenMapKey);
  });
  document.getElementById('maphelp-close-btn')?.addEventListener('click', ()=>{
    document.getElementById('maphelp-panel')?.classList.remove('show');
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

async function doChangePassword(oldPass, newPass, newPass2){
  const msg = document.getElementById('cp-msg');
  msg.className = 'account-msg';
  msg.textContent = '';
  if(!currentUser){ msg.classList.add('err'); msg.textContent = 'Bạn chưa đăng nhập.'; return; }
  if(!oldPass || !newPass || !newPass2){ msg.classList.add('err'); msg.textContent = 'Vui lòng nhập đầy đủ thông tin.'; return; }
  if(newPass.length < 6){ msg.classList.add('err'); msg.textContent = 'Mật khẩu mới cần tối thiểu 6 ký tự.'; return; }
  if(newPass !== newPass2){ msg.classList.add('err'); msg.textContent = 'Mật khẩu mới nhập lại không khớp.'; return; }
  const fns = (typeof _authFns === 'function') ? _authFns() : null;
  if(!fns){ msg.classList.add('err'); msg.textContent = 'Lỗi kết nối mạng — vui lòng thử lại.'; return; }
  try{
    await fns.httpsCallable('changeAccountPassword')({
      username: currentUser.username, oldPassword: oldPass, newPassword: newPass
    });
    msg.classList.add('ok');
    msg.textContent = 'Đổi mật khẩu thành công!';
    document.getElementById('change-password-form').reset();
  }catch(e){
    msg.classList.add('err');
    msg.textContent = (e && e.message === 'errPassShort') ? 'Mật khẩu mới cần tối thiểu 6 ký tự.'
      : (e && e.message === 'errAccountLocked') ? (typeof t==='function' ? t('errAccountLocked') : 'Tài khoản tạm khoá do sai quá nhiều lần — thử lại sau 15 phút.')
      : 'Mật khẩu hiện tại không đúng.';
  }
}

function initAccountPanel(){
  // Nút ☰ mở Menu (Cài đặt) như cũ — Tài khoản mở từ thẻ người chơi bên trong
  // Cài đặt (#settings-player-edit, xem js/player-profile.js), không phải từ đây.
  const accountBtn = document.getElementById('account-btn');
  const panel = document.getElementById('account-panel');
  if(accountBtn){
    accountBtn.addEventListener('click', ()=>{
      sfxClick();
      if(typeof openSettingsPanel==='function') openSettingsPanel();
      else panel.classList.add('show');
    });
  }
  document.getElementById('account-close-btn')?.addEventListener('click', ()=>{
    panel?.classList.remove('show');
  });
  document.getElementById('account-edit-profile')?.addEventListener('click', ()=>{
    try{sfxClick();}catch(e){}
    panel?.classList.remove('show');
    if(typeof openPlayerProfilePanel==='function') openPlayerProfilePanel();
  });
  document.getElementById('change-password-form')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    doChangePassword(
      document.getElementById('cp-old').value,
      document.getElementById('cp-new').value,
      document.getElementById('cp-new2').value
    );
  });
  document.getElementById('logout-btn')?.addEventListener('click', ()=>{
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
  if(!panel) return;

  function markRead(){
    saveRulesRead();
    if(btn){ btn.classList.add('read'); btn.textContent='✅'; }
  }
  if(isRulesRead()) markRead();

  function openPanel(){
    if(typeof sfxClick==='function') sfxClick();
    if(chk){ chk.checked=false; }
    if(okBtn) okBtn.classList.remove('enabled');
    renderRoundHelp();
    panel.classList.add('show');
  }
  function closePanel(){ panel.classList.remove('show'); }

  window.openHelpPanel = openPanel;
  // Nút ❓ góc màn đã ẩn — mở từ Cài đặt
  if(btn) btn.addEventListener('click', openPanel);
  closeBtn?.addEventListener('click', closePanel);
  panel.addEventListener('click', (e)=>{ if(e.target===panel) closePanel(); });
  chk?.addEventListener('change', ()=>{
    if(okBtn) okBtn.classList.toggle('enabled', chk.checked);
  });
  okBtn?.addEventListener('click', ()=>{
    if(!chk || !chk.checked) return;
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
  // Map 1–20: mở theo Map/cơ chế đã chạm (Map N = cơ chế N)
  const reached = (typeof highestReachedTier==='function')
    ? highestReachedTier()
    : Math.max(
        (typeof mainHardTier==='number' ? mainHardTier|0 : 0),
        (typeof normalMapStage==='number' ? normalMapStage|0 : 0),
        (typeof maxComboTierReached==='number' ? maxComboTierReached|0 : 0)
      );
  const hiddenCleared = (typeof clearedHiddenMaps!=='undefined' && clearedHiddenMaps)
    ? clearedHiddenMaps.size : 0;
  list.innerHTML='';
  ROUND_HELP.forEach((r,i)=>{
    // Map 1-20 (i<20): mở khi đã chơi tới Map/cơ chế đó.
    // Map 21-40 (cơ chế đôi): mở tuần tự sau khi phá đủ map ẩn.
    const unlocked = (i<20
      ? ((i+1) <= reached)
      : (hiddenCleared>=20 && (i+1)<=maxComboTierReached));
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
        : (hiddenCleared>=20 ? t('lockedPass', i+1, i) : t('lockedAll', i+1));
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
    acc.textContent='☰';
    acc.title=(typeof t==='function'?t('ttMenu'):'Menu');
    acc.setAttribute('aria-label','Menu');
    acc.dataset.arcadeOn='1';
  }
  refreshArcadeHud();
}

function arcadeMapLabel(){
  try{
    const key = (typeof activeHiddenMapKey!=='undefined' && activeHiddenMapKey) ? activeHiddenMapKey : null;
    if(key){
      // Chuẩn hoá secret1 → secret để tra MAP_REGISTRY
      const regKey = (key === 'secret1') ? 'secret' : key;
      try{
        if(typeof getMap==='function'){
          const d = getMap(regKey) || getMap(key);
          if(d && d.id != null) return 'Map '+d.id;
        } else if(typeof MAP_REGISTRY!=='undefined' && MAP_REGISTRY){
          const d = MAP_REGISTRY[regKey] || MAP_REGISTRY[key];
          if(d && d.id != null) return 'Map '+d.id;
        }
      }catch(e){}
      if(typeof HIDDEN_MAP_LIST!=='undefined'){
        const idx = HIDDEN_MAP_LIST.findIndex(x=>x && (x.key===key || x.key===regKey));
        if(idx >= 0) return 'Map '+(idx+1);
      }
      return 'Map';
    }
  }catch(e){}
  // Map thường: Map 1 / Map 2 / Map 3… theo normalMapStage (mỗi map cần ★★★★)
  try{
    const n = (typeof normalMapStage === 'number' && normalMapStage > 0)
      ? (normalMapStage|0)
      : 1;
    return (typeof t==='function' ? t('arcadeMapRound', n) : ('Map '+n));
  }catch(e){}
  return 'Map 1';
}

/** Ngưỡng 1★ / 2★ / 3★ / 4★ theo map thường hiện tại (baseline + target cố định). */

function scoreStarThresholds(){
  let target = 220;
  let s = 0;
  try{
    if(typeof normalStarTarget === 'number' && normalStarTarget > 0) target = normalStarTarget|0;
    if(typeof relativeStarScore === 'function') s = relativeStarScore();
    else {
      const base = (typeof normalStarBaseline === 'number') ? normalStarBaseline : 0;
      s = Math.max(0, Math.round(((typeof score==='number'?score:0)||0) - base));
    }
  }catch(e){}
  target = Math.max(100, target|0);
  return {
    score: s,
    target,
    s1: Math.max(1, Math.round(target * 0.25)),
    s2: Math.max(2, Math.round(target * 0.50)),
    s3: Math.max(3, Math.round(target * 0.75)),
    s4: target
  };
}

function updateScoreStarBar(){
  const fill = document.getElementById('score-star-fill');
  const track = document.getElementById('score-star-track');
  if(!fill || !track) return;
  const th = scoreStarThresholds();
  const pct = Math.max(0, Math.min(100, (th.score / th.target) * 100));
  fill.style.width = pct.toFixed(1) + '%';
  const marks = track.querySelectorAll('.score-star');
  const cuts = [th.s1, th.s2, th.s3, th.s4];
  marks.forEach((el, i)=>{
    // Neo sao đúng mốc % trên cùng chiều dài thanh điểm
    const starPct = Math.max(0, Math.min(100, (cuts[i] / th.target) * 100));
    el.style.left = starPct.toFixed(2) + '%';
    const lit = th.score >= cuts[i];
    const was = el.classList.contains('is-lit');
    el.classList.toggle('is-lit', lit);
    if(lit && !was){
      el.classList.remove('is-pop');
      void el.offsetWidth;
      el.classList.add('is-pop');
    }
  });
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

  // Trái: avatar + tên người chơi + map đang chơi
  const avEl=document.getElementById('header-avatar');
  if(avEl){
    try{
      if(typeof applyAvatarElement==='function') applyAvatarElement(avEl);
      else if(typeof getPlayerAvatar==='function') avEl.textContent=getPlayerAvatar();
    }catch(e){}
  }
  const nameEl=document.getElementById('header-player-name');
  if(nameEl){
    let nick='Player';
    try{
      if(typeof getPlayerNickname==='function') nick=getPlayerNickname();
      else if(typeof _localPlayerName==='function') nick=_localPlayerName();
      else if(typeof currentUser!=='undefined' && currentUser && currentUser.username) nick=currentUser.username;
    }catch(e){}
    nick=String(nick||'Player').trim() || 'Player';
    try{
      if(typeof formatPlayerNameStyledHtml==='function'){
        nameEl.innerHTML=formatPlayerNameStyledHtml(nick);
      } else {
        nameEl.textContent=nick;
      }
    }catch(e){ nameEl.textContent=nick; }
  }
  const mapEl=document.getElementById('header-map-label');
  if(mapEl) mapEl.textContent=arcadeMapLabel();

  try{ updateScoreStarBar(); }catch(e){}

  // Đã bỏ mục TARGETS trên HUD arcade
  const targets=document.getElementById('header-targets');
  if(targets) targets.innerHTML='';

  try{ if(typeof refreshVersusButton==='function') refreshVersusButton(); }catch(e){}
}

(function bindHeaderAvatarClick(){
  function openMyCard(){
    function go(){ if(typeof openOwnPlayerCard==='function') openOwnPlayerCard(); }
    if(typeof openOwnPlayerCard==='function'){ go(); return; }
    if(typeof window.ensureCaroLoaded==='function'){ window.ensureCaroLoaded().then(go).catch(()=>{}); }
  }
  function bind(){
    const avEl=document.getElementById('header-avatar');
    if(!avEl) return;
    avEl.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} openMyCard(); });
    avEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); try{sfxClick();}catch(e2){} openMyCard(); } });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

/* ════════════════════════════════════════════════════════
   SETTINGS MENU — hub + More Settings + Cup + Language
════════════════════════════════════════════════════════ */
