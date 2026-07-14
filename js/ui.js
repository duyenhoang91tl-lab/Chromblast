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
// Người chơi chỉ đọc được cơ chế của các vòng ĐÃ CHẠM tới (tới vòng nào biết vòng đó).
function showRoundGuide(){
  const reached = (typeof highestReachedTier==='function') ? highestReachedTier() : 0;
  const cur = (typeof mainHardTier!=='undefined' ? (mainHardTier|0) : 0);
  const maxTier = reached;
  const title = document.getElementById('roundguide-title');
  const body  = document.getElementById('roundguide-body');
  title.textContent = t('roundGuideTitle');
  if(maxTier < 1){
    body.innerHTML = '<p style="font-size:13px;line-height:1.5;color:#dfe6f2;">Bạn chưa tới vòng nào có cơ chế đặc biệt. '+
      'Mỗi khi qua một map ẩn, map thường sẽ thêm một cơ chế mới — quay lại đây để đọc hướng dẫn nhé!</p>';
    document.getElementById('roundguide-panel').classList.add('show');
    return;
  }
  let html = '<p style="font-size:12px;color:#9aa7bd;margin:0 0 10px;">Bạn đang ở <b style="color:#ffd54a;">Vòng '+
    (cur||1)+'</b>. Dưới đây là cơ chế mọi vòng bạn đã chạm tới.</p>';
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

// ═══════════════════════════════════════════════════════════════
// HƯỚNG DẪN RIÊNG TỪNG MAP ẨN (MAP_HELP) + render danh sách hướng dẫn cơ chế vòng.
// Tách từ main.js — thuộc UI (đi cùng showMapHelp). Dùng clearedHiddenMaps / ROUND_MECH*
// (khai báo nơi khác) lúc CHẠY.
// ═══════════════════════════════════════════════════════════════
// ═══════════ Hướng dẫn riêng từng map ẩn — chỉ đọc được khi đã chơi tới ═══════════
const MAP_HELP = {
  secret1: { title:'🔥 Map ẩn 1 — Nổ màu bí mật', body:'Bấm vào <b>3+ ô cùng màu liền kề</b> để nổ. Nổ tiếp trong 2.5 giây để giữ chuỗi. Bấm sai 3 lần hoặc để hết giờ → mất 1 tim; hết 3 tim ❤️ là kết thúc.' },
  dodge: { title:'🐢 Map ẩn 2 — Rùa né cà rốt', body:'Kéo trái/phải (hoặc bấm ◀ ▶) cho Rùa né cà rốt Thỏ bắn ra. Sống càng lâu càng tốt.' },
  fruit: { title:'🍉 Map ẩn 3 — Chém hoa quả', body:'Vuốt để chém hoa quả bay lên trong 60 giây. Đừng chém trúng 💣 bom — trúng là thua ngay.' },
  bee: { title:'🐝 Map ẩn 4 — Chó trốn ong', body:'Chạm màn hình để chỉ đường cho chó chạy trốn, chạm vào ong để đập bay. Đừng để ong chích chó hết tim.' },
  gold: { title:'⛏️ Map ẩn 5 — Mèo đào vàng', body:'Chạm ô đất cạnh mèo để đào vàng trong 30 giây, chạm xa hơn để dẫn mèo đi. Bắt chuột 💎 được thưởng lớn.' },
  mole: { title:'🔨 Map ẩn 6 — Vườn thú bí ẩn', body:'Thú nhô lên khỏi hố thì chạm để đập. Tránh đập 🦔 nhím và 🐍 rắn. Đập trượt 3 lần liên tiếp mất 1 tim.' },
  memory: { title:'🃏 Map ẩn 7 — Lật thẻ ký ức', body:'Chạm lật 2 thẻ để tìm cặp giống nhau — sai thì cả 2 úp lại. Ghép đủ 6 cặp trước khi hết giờ.' },
  bubble: { title:'🫧 Map ẩn 8 — Bắn bong bóng', body:'Chạm để bắn bong bóng — 3+ bóng cùng màu liền nhau sẽ nổ. Đừng để bóng tràn xuống đáy.' },
  stack: { title:'🏗️ Map ẩn 9 — Xếp tháp', body:'Chạm để thả khối đang chạy qua lại xuống tháp — phần thừa bị cắt. Lệch hoàn toàn là thua. Xếp đủ tầng để thắng.' },
  boss: { title:'🐔 Map ẩn 10 — Phi cơ bắn gà', body:'Kéo ngón tay lái phi cơ (tự động bắn). Né trứng gà rơi — có 3 mạng ❤️. Diệt hết đàn gà trước khi hết giờ.' },
  catch: { title:'🧺 Map ẩn 11 — Hứng thú cưng', body:'Di chuyển rổ để hứng thú cưng rơi xuống. Tránh hứng 🦔 nhím và 🐍 rắn — mất mạng.' },
  flood: { title:'🎨 Map ẩn 12 — Tràn màu', body:'Nhấn nút màu để tràn màu đó từ góc trên trái. Phủ kín cả bảng trước khi hết lượt đi.' },
  arena: { title:'🌊 Map ẩn 13 — Đấu trường sinh tồn', body:'Kéo chú chó 🐶 né đòn tấn công, chạm vào 🐝/🥕 để tiêu diệt. Sống sót qua 4 đợt sóng kẻ thù.' },
  snake: { title:'🐍 Map ẩn 14 — Rắn săn mồi', body:'Vuốt để đổi hướng rắn, ăn trái cây để dài ra. Đừng đâm vào tường hoặc đuôi. Đạt độ dài 20 để thắng.' },
  brick: { title:'🧱 Map ẩn 15 — Phá gạch', body:'Kéo thanh đỡ cho bóng nảy phá gạch. Đừng để bóng rơi xuống đáy — có 3 mạng ❤️. Phá hết gạch để thắng.' },
  runner: { title:'🏃 Map ẩn 16 — Chạy vô tận', body:'Chạm để nhảy qua chướng ngại vật, chạm 2 lần để nhảy đôi. Sống sót 60 giây để thắng.' },
  space: { title:'🚀 Map ẩn 17 — Space Shooter', body:'Di ngón tay để lái tàu, chạm để bắn (hoặc bật Tự bắn). Diệt hết các đợt quái để thắng.' },
  rhythm: { title:'🎵 Map ẩn 18 — Rhythm Tap', body:'Chạm vào tâm đúng lúc vòng ngoài thu nhỏ khớp với vòng trong. Hoàn thành hết số vòng để thắng.' },
  maze: { title:'🌀 Map ẩn 19 — Maze Runner', body:'Vuốt để dẫn chú chó thoát mê cung trong 60 giây. Đến ô đích ở góc dưới phải để thắng.' },
  mega: { title:'💀 Map ẩn 20 — MEGA BOSS (trận cuối)', body:'Trận cuối! Di ngón tay né đạn, tàu tự động bắn Rồng. Bắn cạn máu Rồng để phá đảo toàn bộ game!' },
};
// Ánh xạ vòng 1-20 (0-based) sang khoá cơ chế trong MECH_CFG, để tra điểm thưởng/phạt LUÔN ĐÚNG
const ROUND_HELP = []; // dựng lười từ ROUND_MECH_NAMES + ROUND_MECH_DESC (round-mechanics.js) — 1 nguồn duy nhất
let _roundHelpBuilt = false;
function ensureComboRoundHelp(){
  if(_roundHelpBuilt || typeof comboPairForTier!=='function' || typeof ROUND_MECH_DESC==='undefined') return;
  _roundHelpBuilt = true;
  for(let v=1; v<=20; v++) ROUND_HELP.push({ title:'Vòng '+v+' — '+ROUND_MECH_NAMES[v], body:ROUND_MECH_DESC[v] });
  for(let v=21; v<=40; v++){
    const [a,b]=comboPairForTier(v);
    ROUND_HELP.push({
      title:'🌗 Vòng '+v+' — Cơ chế đôi: '+ROUND_MECH_NAMES[a]+' + '+ROUND_MECH_NAMES[b],
      body:'Vòng này có CÙNG LÚC 2 cơ chế:<br>① <b>'+ROUND_MECH_NAMES[a]+':</b> '+ROUND_MECH_DESC[a]
        +'<br>② <b>'+ROUND_MECH_NAMES[b]+':</b> '+ROUND_MECH_DESC[b]
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
        ? '🔒 Vòng '+(i+1)+' — chơi tới đây để mở khoá hướng dẫn'
        : (reached>=20
            ? '🔒 Vòng '+(i+1)+' [cơ chế đôi] — vượt qua vòng '+i+' để mở khoá'
            : '🔒 Vòng '+(i+1)+' [cơ chế đôi] — thắng đủ 20/20 map ẩn trước để bắt đầu tiến trình này');
      list.appendChild(locked);
    }
  });
}
