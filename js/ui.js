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
// Người chơi chỉ đọc được cơ chế của các vòng ĐÃ CHẠM tới (tới vòng nào biết vòng đó).
function showRoundGuide(){
  const reached = (typeof highestReachedTier==='function') ? highestReachedTier() : 0;
  const cur = (typeof mainHardTier!=='undefined' ? (mainHardTier|0) : 0);
  const maxTier = reached;
  const title = document.getElementById('roundguide-title');
  const body  = document.getElementById('roundguide-body');
  title.textContent = '📖 Hướng dẫn cơ chế vòng của bạn';
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
  secret1: { title:'🔥 Map ẩn 1 — Nổ màu bí mật', body:'Bấm vào <b>3+ ô cùng màu liền kề</b> để nổ. Nổ liên tiếp trong <b>2.5 giây</b> (1.25s khi vào chế độ lửa) sẽ tăng combo và nhân điểm x2/x3.<br>Bấm sai 3 lần liên tiếp (5 lần khi đang chế độ lửa) hoặc hết giờ mà chưa nổ kịp → <b>mất 1 tim</b>.<br>Có <b>3 tim ❤️❤️❤️</b> — chỉ thua & về map thường khi hết sạch cả 3 tim. Đạt đủ điểm mốc thì cứ chơi tiếp, khi hết tim sẽ tự thắng và mở Map ẩn 2.<br><b>⭐ Tính điểm:</b> mỗi ô nổ = 1đ. Nổ liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3. Đạt chuỗi <b>9 lần liên tiếp</b> vào "chế độ Ultra" → nhân đôi thêm điểm.' },
  dodge: { title:'🐢 Map ẩn 2 — Rùa né cà rốt', body:'Điều khiển <b>Rùa</b> ở dưới màn hình, né <b>cà rốt</b> do 🐰 Thỏ bắn ra. Kéo trái/phải trên màn hình hoặc bấm nút ◀ ▶.<br>Đạn càng lúc càng nhanh & nhiều — sống càng lâu điểm càng cao.<br><b>⭐ Tính điểm:</b> +1đ mỗi giây sống sót, cộng thêm +1đ mỗi quả cà rốt né được (né liên tiếp không trúng: từ lần 3 → x2, từ lần 6 → x3).' },
  fruit: { title:'🍉 Map ẩn 3 — Chém hoa quả', body:'Hoa quả bay lên liên tục trong <b>60 giây</b>. Vuốt ngón tay/chuột để chém quả, ghi điểm.<br>Cẩn thận <b>💣 BOM</b> — chém trúng bom là thua ngay. Qua được 60s (hoặc dính bom) sẽ về map thường.<br><b>⭐ Tính điểm:</b> mỗi quả chém trúng = 1đ, chém liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3. Để quả rơi hết màn hình mà không chém (trượt) sẽ bị <b>phạt 10đ × số lần trượt liên tiếp</b>; trượt quá <b>5 lần liên tiếp</b> → thua ngay.' },
  bee: { title:'🐝 Map ẩn 4 — Chó trốn ong', body:'Chó Samoyed tự né ong, chạm màn hình để chỉ đường chạy giúp chó. Chạm vào ong để đập bay, ghi điểm combo.<br>Ong chọc chó quá nhiều lần → thua, về map thường.<br><b>⭐ Tính điểm:</b> mỗi con ong đập trúng = 1đ, đập liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3.' },
  gold: { title:'⛏️ Map ẩn 5 — Mèo đào vàng', body:'Đào vàng trong <b>30 giây</b>. Chạm ô đất gần mèo để đào lấy vàng/đá quý, chạm xa hơn để dẫn mèo di chuyển.<br>Bắt được chuột mang kim cương chạy qua → thưởng lớn +150. Cần đạt đủ điểm mốc để qua màn.<br><b>⭐ Tính điểm:</b> đào trúng đất thường = 0đ, đá quý nhỏ = 1đ, đá quý lớn = 2đ, ngọc = 3đ, kim cương = 5đ, rương báu = 8đ. Bắt chuột mang kim cương = <b>+150đ</b>. Về đích đúng hạn còn dư giờ → thưởng thêm 10đ mỗi giây còn lại.' },
  mole: { title:'🔨 Map ẩn 6 — Vườn thú bí ẩn', body:'8 ô trong vườn, động vật ẩn hiện ngẫu nhiên — chạm/ấn để đập.<br>🦫+20 🐰+5 🐢+10 🐶+30 🐱+15 🦔−20 🐍−40. Đập nhím hoặc rắn bị trừ điểm, tránh đập nhầm! Cần đủ điểm trong thời gian giới hạn.<br><b>⭐ Tính điểm:</b> có <b>3 tim ❤️❤️❤️</b> — đập trượt (hụt) liên tiếp 3 lần sẽ mất 1 tim, hết tim là thua ngay dù chưa đủ điểm mốc.' },
  memory: { title:'🃏 Map ẩn 7 — Lật thẻ ký ức', body:'Lưới 4×3 gồm 6 cặp động vật bị trộn. Chạm để lật thẻ, tìm 2 thẻ giống nhau để ghép cặp — sai thì cả 2 úp lại.<br>Ghép đủ 6 cặp trong thời gian giới hạn để thắng. Mỗi cặp = 50đ + điểm thưởng theo giây còn lại.<br><b>⭐ Tính điểm:</b> mỗi cặp ghép đúng = 50đ; hoàn thành xong 6 cặp còn được cộng thêm điểm dựa trên số giây còn dư — càng nhanh thưởng càng nhiều.' },
  bubble: { title:'🫧 Map ẩn 8 — Bắn bong bóng', body:'Chạm để bắn bong bóng về hướng đó — 3+ bong bóng cùng màu liền kề sẽ nổ.<br>Gom đủ điểm hoặc dọn sạch bảng để thắng. Cứ vài giây bong bóng lại rơi xuống thêm 1 hàng — cẩn thận tràn bảng!<br><b>⭐ Tính điểm:</b> mỗi bóng nổ = 1đ, bắn trúng cụm liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3. Các bóng bị "mồ côi" (mất kết nối) rơi theo cũng được tính +1đ/bóng.' },
  stack: { title:'🏗️ Map ẩn 9 — Xếp tháp', body:'Một khối di chuyển qua lại phía trên tháp, chạm để thả xuống — phần thừa so với tầng dưới sẽ bị cắt đi.<br>Trượt hết khối (căn lệch hoàn toàn) → game over. Căn giữa hoàn hảo được thưởng điểm PERFECT. Xếp đủ số tầng trong thời gian giới hạn để thắng.<br><b>⭐ Tính điểm:</b> mỗi tầng xếp được = 1đ; căn <b>PERFECT</b> (khớp hoàn toàn tầng dưới) cộng thêm điểm nhân theo chuỗi PERFECT liên tiếp: từ lần 3 → x2, từ lần 6 → x3.' },
  boss: { title:'🐔 Map ẩn 10 — Phi cơ bắn gà', body:'Kéo ngón tay để lái phi cơ, tự động bắn liên tục vào đàn gà xâm lăng. Né trứng gà rơi xuống — có <b>3 mạng ❤️</b>.<br>Tiêu diệt hết các đợt gà trước khi hết giờ để chiến thắng.<br><b>⭐ Tính điểm:</b> mỗi con gà bắn hạ = 1đ.' },
  catch: { title:'🧺 Map ẩn 11 — Hứng thú cưng', body:'Thú cưng rơi từ trên trời, di chuyển rổ để hứng: 🦫(+20) 🐰(+10) 🐢(+15) 🐶(+40) 🐱(+25).<br>Tránh 🦔 và 🐍 — chúng sẽ lấy mạng bạn. Ghi đủ điểm trong thời gian giới hạn để thắng.<br><b>⭐ Tính điểm:</b> hứng đúng liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3. Hứng trúng vật xấu (🦔/🐍) mất 1 mạng và đứt chuỗi combo.' },
  flood: { title:'🎨 Map ẩn 12 — Tràn màu', body:'Lưới 10×10 ô màu — nhấn nút màu để "tràn" màu đó lan ra từ góc trên trái, nối các ô liền kề cùng màu mới.<br>Mục tiêu: phủ đầy toàn bộ bảng trong số bước giới hạn. Thắng càng sớm (dùng ít bước) càng được thưởng nhiều điểm.<br><b>⭐ Tính điểm:</b> phủ đầy bảng thành công = <b>+20đ</b>, cộng thêm <b>+2đ cho mỗi bước còn dư</b> chưa dùng tới. Hết bước mà chưa phủ xong → tính điểm an ủi bằng số ô đã phủ chia 5 (làm tròn xuống).' },
  arena: { title:'🌊 Map ẩn 13 — Đấu trường sinh tồn', body:'Kéo để di chuyển chú chó 🐶 né đòn tấn công qua 4 làn sóng kẻ thù. Chạm vào 🐝/🥕 để tiêu diệt.<br>Sống sót đủ thời gian hoặc đạt đủ điểm mốc để chiến thắng.<br><b>⭐ Tính điểm:</b> +1đ mỗi giây sống sót, cộng +1đ mỗi lần hạ 🐝/🥕 (hạ liên tiếp không hụt: từ lần 3 → x2, từ lần 6 → x3). Từ sóng 2 xuất hiện <b>Rắn boss 100 máu</b> — mỗi lần chạm trúng trừ 20 máu (5 lần hạ gục), hạ gục xong thưởng thêm +5đ.' },
  snake: { title:'🐍 Map ẩn 14 — Rắn săn mồi', body:'Rắn cổ điển: ăn trái cây để lớn dần. Vuốt/chạm để đổi hướng, tránh đâm vào tường & đuôi của chính mình.<br>Có <b>3 mạng ❤️❤️❤️</b>. Mục tiêu: đạt độ dài 20.<br><b>⭐ Tính điểm:</b> mỗi quả thường ăn được = 1đ, quả đặc biệt (hiếm, sáng hơn) = 3đ.' },
  brick: { title:'🧱 Map ẩn 15 — Phá gạch', body:'Kiểu Arkanoid cổ điển: điều khiển thanh đỡ để bóng nảy phá vỡ 24 viên gạch phía trên.<br>Có <b>3 mạng ❤️❤️❤️</b> — để bóng rơi xuống đáy sẽ mất 1 mạng.<br><b>⭐ Tính điểm:</b> mỗi lần bóng trúng gạch chưa vỡ = +1đ; gạch vỡ hẳn (gạch thường 1đ, gạch 2 máu 2đ) được nhân thêm theo chuỗi phá liên tiếp: từ lần 3 → x2, từ lần 6 → x3.' },
  runner: { title:'🏃 Map ẩn 16 — Chạy vô tận', body:'Chó tự động chạy về phía trước, chạm màn hình để nhảy né chướng ngại vật. Chạm 2 lần liên tiếp để nhảy đôi (nhảy cao hơn/xa hơn).<br>Sống sót đủ <b>60 giây</b> để thắng.<br><b>⭐ Tính điểm:</b> mỗi ngôi sao ⭐ nhặt được trên đường chạy = +1đ.' },
  space: { title:'🚀 Map ẩn 17 — Space Shooter', body:'Di chuyển ngón tay để lái tàu vũ trụ theo, chạm để bắn (hoặc bật Tự bắn ở góc trái).<br>Mỗi quái tiêu diệt được +1 điểm. Bắn hết toàn bộ các đợt (wave) quái xâm lăng để chiến thắng.<br><b>⭐ Tính điểm:</b> mỗi quái bị bắn hạ = +1đ, không giới hạn combo.' },
  rhythm: { title:'🎵 Map ẩn 18 — Rhythm Tap', body:'Các vòng tròn thu nhỏ dần xuất hiện quanh tâm — chạm vào tâm đúng lúc vòng ngoài khớp với vòng trong để ghi điểm.<br>Gõ càng chính xác (PERFECT) chuỗi điểm càng cao; gõ trễ/hụt sẽ mất chuỗi. Hoàn thành hết số vòng để thắng.<br><b>⭐ Tính điểm:</b> 5 mức chính xác — <b>PERFECT</b>=3đ, <b>GREAT</b>=2đ, <b>COOL</b>=1đ (3 mức này nhân theo chuỗi trúng liên tiếp: từ lần 3 → x2, từ lần 6 → x3), <b>BAD</b>=1đ (không nhân, đứt chuỗi), <b>MISS</b>=0đ (đứt chuỗi).' },
  maze: { title:'🌀 Map ẩn 19 — Maze Runner', body:'Vuốt hoặc dùng phím mũi tên để dẫn chú chó tìm đường thoát khỏi mê cung trong <b>60 giây</b>.<br>Nhặt vật phẩm trên đường đi: +10 điểm hoặc +5 giây. Đến được ô đích (góc dưới phải) để thắng.<br><b>⭐ Tính điểm:</b> vật phẩm điểm = +10đ, vật phẩm đồng hồ = +5 giây (không cộng điểm trực tiếp nhưng giúp có thêm thời gian ghi điểm).' },
  mega: { title:'💀 Map ẩn 20 — MEGA BOSS (trận cuối)', body:'Trận chiến cuối cùng — hạ gục Rồng Huyền Thoại! Di chuyển ngón tay để né đạn, tàu tự động bắn liên tục vào Rồng.<br>Bắn trúng Rồng để trừ máu (HP) — hạ HP về 0 để chiến thắng và hoàn thành toàn bộ trò chơi!<br><b>⭐ Tính điểm:</b> mỗi phát đạn trúng Rồng = +1đ, không giới hạn combo.' },
};
// Ánh xạ vòng 1-20 (0-based) sang khoá cơ chế trong MECH_CFG, để tra điểm thưởng/phạt LUÔN ĐÚNG
// theo giá trị hiện tại (kể cả khi admin chỉnh trong panel "⚙️ Nhịp & Thưởng"). Vòng 1 (dây gai)
// không có mục cấu hình riêng nên để null.
const ROUND_MECH_KEY = ['thorn','mountain','squirrel','ice','fog','bomb','tornado','egg','spider','cloud','cham','bh','ghost','snail','wall','lightning','snakeSpirit','volcano','portal','dk'];
function roundScoreLine(key){
  if(!key || !MECH_CFG[key]){
    return '⭐ <b>Tính điểm:</b> không có thưởng/phạt điểm riêng cho cơ chế này — chỉ tính điểm nổ ô bình thường như mọi lúc chơi map thường.';
  }
  const m=MECH_CFG[key];
  const parts=[];
  if(m.hp!=null) parts.push('có <b>'+m.hp+' máu</b> — mỗi lần nổ trúng (hoặc nổ ô liền kề, tuỳ cơ chế) trừ 1 máu, hạ hết máu mới hóa giải xong');
  if(m.thuong!=null) parts.push('hóa giải/hạ gục thành công thưởng <b>+'+m.thuong+'đ</b>');
  if(m.phat!=null) parts.push('không xử lý kịp sẽ bị phạt <b>−'+m.phat+'đ</b>');
  if(m.limit!=null) parts.push('để nó lộng hành đủ <b>'+m.limit+'</b> ô sẽ thua cả ván map thường');
  if(!parts.length) parts.push('không có thưởng/phạt điểm riêng — chỉ tính điểm nổ ô bình thường như mọi lúc chơi map thường');
  return '⭐ <b>Tính điểm:</b> '+parts.join('; ')+'.';
}
const ROUND_HELP = [
  { title:'🌿 Vòng 1 — Dây gai', body:'Ô nào để lâu quá vài lượt đặt khối mà chưa bị phá sẽ bị <b>dây gai</b> quấn kín — ô đó không nổ được nữa, cũng không tính vào cụm màu. Muốn gỡ, hãy nổ trúng ô <b>liền kề</b> ô bị gai quấn.' },
  { title:'⛰️ Vòng 2 — Núi đá', body:'Một ngọn núi nhỏ mọc lên ở ô trống ngẫu nhiên và sẽ <b>lớn dần</b> lan sang các ô trống xung quanh theo thời gian nếu bị bỏ mặc. Ô có núi không đặt khối và không nổ được — đừng để nó chiếm hết bàn cờ!' },
  { title:'🐿️ Vòng 3 — Sóc trộm ô', body:'Một con sóc xuất hiện, mỗi lượt <b>chỉ di chuyển 1 ô</b> theo hướng ngẫu nhiên (trên/dưới/trái/phải) và <b>không bao giờ nhảy vào ô nó đã gặm</b>. Cứ <b>3 lượt di chuyển</b>, khi sóc rời khỏi ô đang đứng thì <b>ô đó mới bị gặm</b> (xoá màu, để lại dấu cắn khiến ô đó tạm thời không đặt khối được). Nổ trúng ô sóc đang đứng <b>hoặc ô liền kề nó</b> để trừ máu — hạ hết máu để đuổi sóc đi, <b>tất cả ô đã bị gặm sẽ được khôi phục</b>. Nếu 6 bước sau đó bàn cờ vẫn chưa "sạch", một con sóc khác sẽ xuất hiện.' },
  { title:'🧊 Vòng 4 — Băng giá', body:'Một số ô màu bị đóng băng theo chu kỳ. Phải nổ trúng cụm chứa ô đó <b>2 lần</b> — lần 1 làm nứt băng, lần 2 mới vỡ hẳn và phá được màu bên trong.' },
  { title:'🌫️ Vòng 5 — Sương mù', body:'Một vùng trên bàn bị sương mù che khuất màu ô. Hãy ghi nhớ màu trước khi bị che, hoặc suy đoán dựa vào các ô lân cận không bị che.' },
  { title:'💣 Vòng 6 — Bom hẹn giờ', body:'Một ô mang quả bom đếm ngược theo số bước bạn đặt khối. Hết giờ, bom nổ và xoá sạch vùng <b>3×3</b> quanh nó. Nổ trúng ô <b>liền kề</b> quả bom để gỡ bom trước khi nó phát nổ.' },
  { title:'🌪️ Vòng 7 — Lốc xoáy', body:'Thỉnh thoảng một hàng hoặc cột bị lốc xoáy cuốn qua, xáo trộn ngẫu nhiên vị trí các ô màu trong hàng/cột đó.' },
  { title:'🥚 Vòng 8 — Trứng rồng', body:'Trứng rồng xuất hiện và đếm ngược. Không đập vỡ (nổ trúng) kịp trước khi nở → rồng con nở ra, <b>thiêu rụi cả hàng</b> chứa quả trứng.' },
  { title:'🕷️ Vòng 9 — Nhện giăng tơ', body:'Nhện giăng tơ khoá 1 khối trong khay đặt khối của bạn trong vài lượt — khối đó tạm thời không dùng được cho tới khi tơ tự đứt.' },
  { title:'🌧️ Vòng 10 — Mây mưa', body:'Một đám mây di chuyển qua các cột, biến ô màu nó đi qua thành <b>ô xám</b> (mất màu, coi như bị "rửa trôi"). Nổ để dọn sạch ô xám đó.' },
  { title:'🦎 Vòng 11 — Tắc kè hoa', body:'Tắc kè lén đổi màu ngẫu nhiên của 1-2 ô có sẵn trên bàn, có thể phá hỏng kế hoạch ghép cụm màu của bạn bất ngờ — quan sát kỹ trước khi đặt khối!' },
  { title:'🕳️ Vòng 12 — Hố đen', body:'Hố đen xuất hiện và mỗi lượt sẽ hút 1 ô màu gần nó nhất. Nổ trúng gần hố đen đủ số lần cần thiết để hố "no nê" và tự biến mất.' },
  { title:'👻 Vòng 13 — Bóng ma', body:'Một ô giả dạng thành <b>màu khác</b> với màu thật của nó, đánh lừa thị giác — đừng vội tin vào mắt mình khi ghép cụm gần khu vực nghi ngờ.' },
  { title:'🐌 Vòng 14 — Ốc sên', body:'Ốc sên bò quanh bàn cờ, để lại vệt nhớt trên các ô trống nó đi qua — ô dính nhớt tạm thời không đặt khối được.' },
  { title:'🧱 Vòng 15 — Tường gạch', body:'Từng cụm 3 viên gạch thỉnh thoảng rơi xuống chiếm chỗ trên bàn. Gạch không phá được — chỉ có thể tránh đặt khối đè lên khu vực đó.' },
  { title:'⚡ Vòng 16 — Sét đánh', body:'Có cảnh báo trước rồi sét đánh trúng 1 vùng <b>2×2</b>, xoá sạch màu trong vùng bị đánh — tránh xa vùng cảnh báo nếu không muốn mất ô đã ghép.' },
  { title:'🐍 Vòng 17 — Rắn thần', body:'Một con rắn 3 đốt trườn qua bàn cờ theo thời gian, "nuốt" (xoá màu) các ô nó bò qua.' },
  { title:'🌋 Vòng 18 — Núi lửa', body:'Núi đá cũ hoá thành núi lửa và phun đá xuống 3 ô ngẫu nhiên trên bàn (giống cơ chế tường gạch) — các ô bị đá rơi trúng không đặt khối được.' },
  { title:'🌀 Vòng 19 — Cổng dịch chuyển', body:'Hai cổng dịch chuyển xuất hiện trên bàn, thỉnh thoảng tráo đổi vị trí 1 ô màu và 1 ô trống cho nhau — bàn cờ có thể thay đổi bất ngờ.' },
  { title:'🐲 Vòng 20 — Vua Rồng giáng thế', body:'Thử thách tối thượng của map thường! Vua Rồng tung ra nhiều đòn tấn công ngẫu nhiên: thiêu rụi cả một hàng, đóng băng nhiều ô, gieo thêm dây gai, hoặc cướp mất vài ô màu trên bàn cùng lúc.' },
];
// 🌗 Vòng 21-40 — hướng dẫn cơ chế đôi, tự ghép từ mô tả 2 vòng gốc liền kề (luôn khớp comboPairForTier).
// Dựng LƯỜI (lazy) lúc chạy — không dựng ở top-level vì comboPairForTier (round-mechanics.js)
// nạp SAU ui.js; gọi ở đầu renderRoundHelp để đảm bảo mọi phụ thuộc đã sẵn sàng.
let _roundHelpComboBuilt = false;
function ensureComboRoundHelp(){
  if(_roundHelpComboBuilt || typeof comboPairForTier!=='function') return;
  _roundHelpComboBuilt = true;
  for(let v=21; v<=40; v++){
    const [a,b]=comboPairForTier(v);
    const ra=ROUND_HELP[a-1], rb=ROUND_HELP[b-1];
    const nameA=ra.title.split('— ')[1], nameB=rb.title.split('— ')[1];
    ROUND_HELP.push({
      title:'🌗 Vòng '+v+' — Cơ chế đôi: '+nameA+' + '+nameB,
      body:'<b>Vòng này có CÙNG LÚC 2 cơ chế của vòng '+a+' và vòng '+b+' hoạt động song song:</b><br><br>'
        +'<b>① '+nameA+':</b> '+ra.body+'<br><br>'
        +'<b>② '+nameB+':</b> '+rb.body
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
      // Vòng 1-20: 1 dòng tính điểm theo cơ chế của vòng đó.
      // Vòng 21-40 (cơ chế đôi): ghép tính điểm của CẢ 2 cơ chế gốc, tra theo giá trị MCFG hiện tại.
      let scoreHtml;
      if(i<20){
        scoreHtml = '<div class="map-detail-score">'+roundScoreLine(ROUND_MECH_KEY[i])+'</div>';
      } else {
        const [a,b]=comboPairForTier(i+1);
        scoreHtml = '<div class="map-detail-score">① '+roundScoreLine(ROUND_MECH_KEY[a-1])+'</div>'
          +'<div class="map-detail-score">② '+roundScoreLine(ROUND_MECH_KEY[b-1])+'</div>';
      }
      det.innerHTML = '<summary>'+r.title+'</summary><div class="map-detail-body">'+r.body+scoreHtml+'</div>';
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
