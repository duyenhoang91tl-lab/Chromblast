// ═══════════════════════════════════════════════════════════════
// js/versus-ui.js — UI/RENDER/INPUT cho chế độ Đấu 1-1 (js/versus.js)
// Tách từ versus.js: các hàm dựng DOM, vẽ lại bàn/khay, kéo-thả, chat UI,
// bảng chọn skin. Dùng chung global scope với versus.js (nạp NGAY SAU).
// ═══════════════════════════════════════════════════════════════

function _vsLocalSkinKey(slot){ return 'chromablast_vs_local_skin_p'+slot; }

function _vsLocalFallbackBoardSkin(){
  try{
    const active=(typeof getActiveBoardSkin==='function')?getActiveBoardSkin():null;
    if(active && typeof isBoardSkinUnlocked==='function' && isBoardSkinUnlocked(active)) return active;
    if(typeof getUnlockedBoardSkinIds==='function'){
      const ids=getUnlockedBoardSkinIds()||[];
      if(ids.length) return ids[0];
    }
  }catch(e){}
  return 'classic';
}

function _vsLocalFallbackBrickSkin(){
  try{
    const active=(typeof getActiveBrickSkin==='function')?getActiveBrickSkin():null;
    if(active && typeof isBrickSkinUnlocked==='function' && isBrickSkinUnlocked(active)) return active;
    if(typeof getUnlockedBrickSkins==='function'){
      const ids=getUnlockedBrickSkins()||[];
      if(ids.length) return ids[0];
    }
  }catch(e){}
  return 'plush';
}

function _vsGetLocalSkinPrefs(slot){
  let p={ board:_vsLocalFallbackBoardSkin(), brick:_vsLocalFallbackBrickSkin() };
  try{
    const raw=localStorage.getItem(_vsLocalSkinKey(slot));
    if(raw){
      const j=JSON.parse(raw);
      if(j && typeof j.board==='string' && typeof isBoardSkinUnlocked==='function' && isBoardSkinUnlocked(j.board)) p.board=j.board;
      if(j && typeof j.brick==='string' && typeof isBrickSkinUnlocked==='function' && isBrickSkinUnlocked(j.brick)) p.brick=j.brick;
    }
  }catch(e){}
  return p;
}

function _vsSetLocalSkinPref(slot,type,id){
  const p=_vsGetLocalSkinPrefs(slot);
  p[type]=id;
  try{ localStorage.setItem(_vsLocalSkinKey(slot), JSON.stringify(p)); }catch(e){}
  return p;
}

function _vsFillLocalSkinPicker(slot){
  const prefs=_vsGetLocalSkinPrefs(slot);
  const nenEl=document.getElementById('vs-nen-p'+slot);
  const gachEl=document.getElementById('vs-gach-p'+slot);
  if(nenEl && typeof BOARD_SKINS!=='undefined' && Array.isArray(BOARD_SKINS)){
    nenEl.innerHTML='';
    BOARD_SKINS.forEach(skin=>{
      if(typeof isBoardSkinUnlocked==='function' && !isBoardSkinUnlocked(skin.id)) return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='vs-skin-pick'+(prefs.board===skin.id?' active':'');
      btn.title=skin.name;
      const sw=document.createElement('div');
      sw.className='board-swatch';
      sw.setAttribute('data-board-skin', skin.id);
      btn.appendChild(sw);
      btn.addEventListener('click',()=>{
        try{ sfxClick(); }catch(e){}
        _vsSetLocalSkinPref(slot,'board',skin.id);
        nenEl.querySelectorAll('.vs-skin-pick').forEach(c=>c.classList.toggle('active', c===btn));
      });
      nenEl.appendChild(btn);
    });
  }
  if(gachEl && typeof BRICK_SKINS!=='undefined' && Array.isArray(BRICK_SKINS)){
    gachEl.innerHTML='';
    BRICK_SKINS.forEach(skin=>{
      if(typeof isBrickSkinUnlocked==='function' && !isBrickSkinUnlocked(skin.id)) return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='vs-skin-pick'+(prefs.brick===skin.id?' active':'');
      btn.title=skin.name;
      const sw=document.createElement('div');
      sw.className='brick-swatch';
      sw.style.setProperty('--cc','#8b93ff');
      sw.setAttribute('data-brick-skin', skin.id);
      btn.appendChild(sw);
      btn.addEventListener('click',()=>{
        try{ sfxClick(); }catch(e){}
        _vsSetLocalSkinPref(slot,'brick',skin.id);
        gachEl.querySelectorAll('.vs-skin-pick').forEach(c=>c.classList.toggle('active', c===btn));
      });
      gachEl.appendChild(btn);
    });
  }
}

// ── Khởi tạo trận ──

function openVersusSetup(){
  try{ sfxClick(); }catch(e){}
  const p1=document.getElementById('vs-name1');
  if(p1){
    const nick = (typeof getPlayerNickname==='function') ? getPlayerNickname() : '';
    p1.value = nick || (typeof currentUser!=='undefined' && currentUser && currentUser.username) || '';
  }
  try{ _vsFillLocalSkinPicker(1); }catch(e){}
  const boostChk = document.getElementById('vs-layout-boost');
  if(boostChk) boostChk.checked = _vsGetLayoutBoost();
  _vsShow('versus-setup-panel');
  _vsHide('online-hub-panel');
  const hint=document.getElementById('vs-online-locked-note');
  if(hint) hint.style.display = canHostVersus() ? 'none' : '';
}

function _vsToggleGlobalUI(hide){
  ['help-btn','hiddenmap-help-btn'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    if(hide){ el.dataset.vsHidden=el.style.display||''; el.style.display='none'; }
    else if('vsHidden' in el.dataset){ el.style.display=el.dataset.vsHidden; delete el.dataset.vsHidden; }
  });
}

// ── Dựng giao diện 2 nửa màn ──

function _vsBuildArena(){
  let arena=document.getElementById('versus-arena');
  if(arena) arena.remove();
  _vsToggleGlobalUI(true);
  try{ if(typeof setExclusivePlayMode === 'function') setExclusivePlayMode('versus'); }catch(e){}
  arena=document.createElement('div'); arena.id='versus-arena';
  const online = !!( _vs && _vs.online && _vs.online.roomId );
  if(!online) arena.classList.add('vs-ai-mode');
  if(_vs && typeof _vs.layoutBoost !== 'boolean') _vs.layoutBoost = _vsGetLayoutBoost();
  if(_vs && _vs.layoutBoost) arena.classList.add('vs-boost');
  const nTop = escapeHtml(_vs.names[0] || 'P1');
  const nBot = escapeHtml(_vs.names[1] || 'P2');
  const avTop = escapeHtml((_vs.avatars && _vs.avatars[0]) || '🐶');
  const avBot = escapeHtml((_vs.avatars && _vs.avatars[1]) || '🐱');
  const quitLbl = (typeof t === 'function' ? t('vsQuit') : null) || 'Thoát';

  // Rank Versus của mình (luôn có) và của đối thủ (chỉ khi đấu online — máy AI không có rank).
  const myVsPoints = (typeof getLocalVersusStats==='function') ? (getLocalVersusStats().points||0) : 0;
  const myVsRank = (typeof getVersusRank==='function') ? getVersusRank(myVsPoints) : null;
  const oppVsPoints = (_vs.online && _vs.online.oppVersusPoints!=null) ? _vs.online.oppVersusPoints : null;
  const oppVsRank = (online && oppVsPoints!=null && typeof getVersusRank==='function') ? getVersusRank(oppVsPoints) : null;
  const rankTopHtml = myVsRank ? ('<span class="vs-chip-rank" id="vs-chip-rank0">'+escapeHtml(myVsRank.icon+' '+myVsRank.name)+'</span>') : '';
  const rankBotHtml = oppVsRank ? ('<span class="vs-chip-rank" id="vs-chip-rank1">'+escapeHtml(oppVsRank.icon+' '+oppVsRank.name)+'</span>') : '';

  // Bạn đời (nếu có kết đôi) — của mình luôn hiện; của đối thủ CHỈ hiện khi đúng
  // là người mình đã kết đôi đang đấu (không thể biết trạng thái kết đôi của
  // người khác nói chung, xem renderCoupleHud trong caro-social.js).
  const myCouple = (typeof getMyCoupleInfo === 'function') ? getMyCoupleInfo() : null;
  const coupleTopHtml = myCouple
    ? ('<span class="vs-chip-couple" id="vs-chip-couple0">💍 '+escapeHtml(myCouple.partnerName||'…')+'</span>')
    : '';
  const oppIsMyPartner = !!(myCouple && online && _vs.online && _vs.online.oppUid && _vs.online.oppUid === myCouple.partnerUid);
  const coupleBotHtml = oppIsMyPartner
    ? ('<span class="vs-chip-couple" id="vs-chip-couple1">💍 '+escapeHtml(myCouple.partnerName||'…')+'</span>')
    : '';

  // Chip kiểu Caro: avatar + tên + điểm — giờ được chèn NGAY TRONG mỗi bàn (.vs-half)
  // thay vì nổi riêng theo cả màn hình, xem vòng lặp half bên dưới.
  const chipHtml0 =
    '<div id="vs-top-chip" class="vs-player-chip vs-chip-top" aria-label="'+nTop+'">'+
      '<span class="vs-chip-avatar caro-me-avatar" id="vs-chip-avatar0">'+avTop+'</span>'+
      '<div class="vs-chip-meta">'+
        '<span class="vs-chip-name" id="vs-chip-name0">'+nTop+'</span>'+
        coupleTopHtml+
        rankTopHtml+
        '<span class="vs-chip-scoreline"><span class="vs-chip-score" id="vs-global-score0">0</span>'+
        '<span id="vs-global-combo0" class="vs-chip-combo"></span></span>'+
      '</div>'+
    '</div>';
  const chipHtml1 =
    '<div id="vs-bottom-chip" class="vs-player-chip vs-chip-bottom" aria-label="'+nBot+'">'+
      '<span class="vs-chip-avatar caro-opp-avatar" id="vs-chip-avatar1">'+avBot+'</span>'+
      '<div class="vs-chip-meta">'+
        '<span class="vs-chip-name" id="vs-chip-name1">'+nBot+'</span>'+
        coupleBotHtml+
        rankBotHtml+
        '<span class="vs-chip-scoreline"><span class="vs-chip-score" id="vs-global-score1">0</span>'+
        '<span id="vs-global-combo1" class="vs-chip-combo"></span></span>'+
      '</div>'+
    '</div>';

  // Topbar: chat trái | đổi cỡ bàn + đồng hồ bấm giờ + Thoát phải (nốt đổi cỡ đứng cạnh đồng hồ)
  arena.innerHTML =
    '<div id="vs-topbar" class="vs-topbar">'+
      '<button type="button" id="vs-chat-fab" class="vs-chat-fab" title="Chat" aria-label="Chat">💬</button>'+
      '<div class="vs-topbar-right">'+
        '<button type="button" id="vs-layout-toggle-btn" class="vs-layout-toggle-btn" title="'+((typeof t==='function'?t('vsLayoutBoost'):null)||'Đổi cỡ bàn')+'" aria-pressed="'+(arena.classList.contains('vs-boost')?'true':'false')+'">📐</button>'+
        '<div id="vs-mid-timer" class="vs-mid-timer" title="Thời gian" aria-label="Đồng hồ">'+
          '<span class="vs-timer-crown" aria-hidden="true"></span>'+
          '<span class="vs-timer-knob" aria-hidden="true"></span>'+
          '<span class="vs-timer-num">'+VERSUS_TIME+'</span>'+
        '</div>'+
        '<button type="button" id="vs-quit-btn" class="vs-quit-btn" title="'+quitLbl+'">'+escapeHtml(quitLbl)+'</button>'+
      '</div>'+
    '</div>'+
    '<div id="vs-countdown"></div>'+
    '<div id="vs-chat" class="vs-chat" hidden>'+
      '<div class="vs-chat-head"><span>'+(typeof t==='function'?t('caroChatTitle'):'💬 Chat')+'</span>'+
      '<button type="button" id="vs-chat-close" class="vs-chat-close" aria-label="Close">✕</button></div>'+
      '<div id="vs-fx-bar" class="caro-fx-bar" aria-label="Tương tác"></div>'+
      '<div id="vs-bubble-picker" class="caro-bubble-picker" aria-label="Mẫu bong bóng"></div>'+
      (online
        ? '<div id="vs-chat-log" class="vs-chat-log" aria-live="polite"></div>'+
          '<form id="vs-chat-form" class="vs-chat-form" autocomplete="off">'+
            '<input id="vs-chat-input" type="text" maxlength="120" placeholder="'+(typeof t==='function'?t('caroChatPlaceholder'):'Nhắn đối thủ...')+'" />'+
            '<button type="submit">'+(typeof t==='function'?t('caroChatSend'):'Gửi')+'</button>'+
          '</form>'
        : '')+
    '</div>';

  document.body.appendChild(arena);
  const myBrickSkin = (typeof getActiveBrickSkin === 'function') ? getActiveBrickSkin() : 'plush';
  const myBoardSkin  = (typeof getActiveBoardSkin === 'function') ? getActiveBoardSkin() : 'classic';
  const oppSkins = (_vs && _vs.online && _vs.online.oppSkins) || null;
  const localSkins = (!online && _vs && _vs.localSkins) || null;
  _vs.players.forEach((P,i)=>{
    const half=document.createElement('div');
    half.className='vs-half'+(i===0?' vs-top':' vs-bottom');
    // P.idx===0 luôn là "mình" (xem enterOnlineVersusMatch: names=[myName,oppName]).
    // Online: đối thủ dùng skin họ tự chọn (đồng bộ qua room) — nếu không có dữ liệu thì dùng skin của mình.
    // Cùng máy (đấu với máy): chỉ người chơi tự chọn nền/gạch riêng ở màn thiết lập (vs-nen-p1, vs-gach-p1);
    // bàn của máy dùng skin đã mở khoá mặc định.
    let brickSkin, boardSkin;
    if(localSkins && i===0){
      brickSkin = localSkins.brick || myBrickSkin;
      boardSkin = localSkins.board || myBoardSkin;
    } else if(localSkins){
      brickSkin = (typeof _vsLocalFallbackBrickSkin === 'function') ? _vsLocalFallbackBrickSkin() : myBrickSkin;
      boardSkin = (typeof _vsLocalFallbackBoardSkin === 'function') ? _vsLocalFallbackBoardSkin() : myBoardSkin;
    } else {
      brickSkin = (i===0) ? myBrickSkin : (oppSkins ? oppSkins.brickSkin : myBrickSkin);
      boardSkin  = (i===0) ? myBoardSkin  : (oppSkins ? oppSkins.boardSkin  : myBoardSkin);
    }
    half.setAttribute('data-brick-skin', brickSkin || 'plush');
    half.setAttribute('data-board-skin', boardSkin || 'classic');

    // Thẻ tên của đúng bàn này (chip0 cho vs-top="mình", chip1 cho vs-bottom="máy/đối thủ")
    // + bàn (bọc trong .vs-grid-wrap để tự co vừa khoảng trống còn lại, không tràn/không lệch)
    // + khay gạch NGAY DƯỚI bàn của chính nó (+ HUD ẩn dự phòng)
    half.innerHTML=
      (i===0 ? chipHtml0 : chipHtml1)+
      '<div class="vs-hud" hidden aria-hidden="true"><span class="vs-name">'+escapeHtml(_vs.names[i])+'</span>'+
      '<span class="vs-score">0</span><span class="vs-combo"></span></div>'+
      '<div class="vs-grid-wrap"><div class="vs-grid"></div></div>'+
      '<div class="vs-tray"></div>'+
      '<div class="vs-cards"></div>'+
      '<div class="vs-note"></div>';

    arena.appendChild(half);
    P.el.half=half;
    P.el.score=half.querySelector('.vs-score');
    P.el.combo=half.querySelector('.vs-combo');
    P.el.grid=half.querySelector('.vs-grid');
    P.el.tray=half.querySelector('.vs-tray');
    P.el.cards=half.querySelector('.vs-cards');
    P.el.note=half.querySelector('.vs-note');

    // lưới ô — pointerdown bắt đầu kéo tinh chỉnh khi đã chọn khối (giống map thường)
    P.el.cells=[];
    for(let r=0;r<VS_N;r++){ P.el.cells[r]=[];
      for(let c=0;c<VS_N;c++){
        const d=document.createElement('div'); d.className='vs-cell';
        d.addEventListener('pointerdown',ev=>{
          if(!versusMode||P.done||P.selected<0) return;
          if(typeof _vsAiControls==='function' && _vsAiControls(P)) return;
          if(P.el.cards.classList.contains('show')) return;
          ev.preventDefault();
          _vsBeginDrag(P, ev);
        });
        P.el.grid.appendChild(d); P.el.cells[r][c]=d;
      }
    }
    // Ghost kéo-thả riêng cho mỗi nửa bàn (nửa trên xoay 180°)
    const ghost=document.createElement('div');
    ghost.className='vs-ghost';
    half.appendChild(ghost);
    P.el.ghost=ghost;
  });
  document.getElementById('vs-quit-btn').addEventListener('click',()=>{
    const msg = (typeof t==='function'?t('caroQuitConfirm'):null) || 'Thoát trận?';
    if(confirm(msg)) _vsAbort();
  });
  document.getElementById('vs-chat-fab')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    _vsToggleChat();
  });
  document.getElementById('vs-layout-toggle-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    document.getElementById('versus-arena').classList.toggle('vs-boost');
    const nowBoost = document.getElementById('versus-arena').classList.contains('vs-boost');
    if(_vs) _vs.layoutBoost = nowBoost;
    _vsSetLayoutBoost(nowBoost);
    const btn = document.getElementById('vs-layout-toggle-btn');
    if(btn) btn.setAttribute('aria-pressed', nowBoost ? 'true' : 'false');
    requestAnimationFrame(()=>{ _vsReflowGrids(); });
  });
  document.getElementById('vs-chat-close')?.addEventListener('click', ()=> _vsToggleChat(false));
  if(online){
    document.getElementById('vs-chat-form')?.addEventListener('submit', _vsSendChat);
  }
  try{
    if(window.VersusSocial){
      VersusSocial.renderFxBar();
      VersusSocial.renderBubblePicker();
    }
  }catch(e){}
  requestAnimationFrame(()=>{ _vsReflowGrids(); });
}

function _vsPositionChatFab(){
  // Chat đã cố định trên topbar — giữ stub để không lỗi listener cũ
}

function _vsSetupChat(online){
  const fab = document.getElementById('vs-chat-fab');
  const panel = document.getElementById('vs-chat');
  const log = document.getElementById('vs-chat-log');
  if(fab) fab.style.display = '';
  if(panel){ panel.hidden = true; panel.classList.remove('open'); }
  if(log) log.innerHTML = '';
  if(!online || !_vs || !_vs.online || !_vs.online.roomId) return;
  if(typeof listenRoomChat !== 'function') return;
  const seen = new Set();
  listenRoomChat(_vs.online.roomId, msg=>{
    if(!msg || !msg.id || seen.has(msg.id)) return;
    seen.add(msg.id);
    _vsAppendChat(msg);
  });
}

function _vsAppendChat(msg){
  const log = document.getElementById('vs-chat-log');
  if(!log || !msg) return;
  const mine = msg.uid && typeof getOnlineUid === 'function' && msg.uid === getOnlineUid();
  const row = document.createElement('div');
  row.className = 'vs-chat-row'+(mine?' mine':'');
  const who = document.createElement('span');
  who.className = 'vs-chat-who';
  who.textContent = (msg.avatar || '')+' '+(msg.name || 'Player');
  const body = document.createElement('span');
  body.className = 'vs-chat-text'+(msg.kind==='fx'?' caro-chat-fx':'');
  body.textContent = msg.text || '';
  row.appendChild(who);
  row.appendChild(body);
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
  try{
    if(window.VersusSocial && typeof VersusSocial.onChatMessage === 'function') VersusSocial.onChatMessage(msg);
  }catch(e){}
}

function _vsToggleChat(forceOpen){
  const panel = document.getElementById('vs-chat');
  if(!panel) return;
  const open = forceOpen != null ? !!forceOpen : panel.hidden;
  panel.hidden = !open;
  panel.classList.toggle('open', open);
  if(open){
    const input = document.getElementById('vs-chat-input');
    if(input) setTimeout(()=> input.focus(), 50);
    try{
      if(window.VersusSocial){
        VersusSocial.renderFxBar();
        VersusSocial.renderBubblePicker();
      }
    }catch(e){}
  }
}

async function _vsSendChat(e){
  if(e) e.preventDefault();
  if(!_vs || !_vs.online || !_vs.online.roomId) return;
  const input = document.getElementById('vs-chat-input');
  if(!input) return;
  const text = input.value;
  input.value = '';
  try{
    const extra = {};
    try{
      if(window.VersusSocial && VersusSocial.currentBubbleStyle) extra.bubbleStyle = VersusSocial.currentBubbleStyle();
    }catch(e2){}
    if(typeof sendRoomChat === 'function') await sendRoomChat(_vs.online.roomId, text, extra);
  }catch(err){
    console.warn('[vs-chat]', err);
    try{ showComboFlash(0,false, typeof t==='function'?t('caroChatFail'):'Không gửi được chat'); }catch(e2){}
  }
}

/** Sau xoay màn / resize: ép lưới 7×7 tính lại kích thước ô (tránh ô đè nhau). */

function _vsReflowGrids(){
  if(!versusMode||!_vs) return;
  _vs.players.forEach(P=>{
    const g=P.el&&P.el.grid;
    if(!g) return;
    g.style.display='none';
    void g.offsetHeight;
    g.style.display='';
  });
  try{ _vsPositionChatFab(); }catch(e){}
}

function _vsRenderAll(P){ _vsRenderGrid(P); _vsRenderTray(P); _vsRenderHud(P); }

function _vsRenderHud(P){
  if(P.el.score) P.el.score.textContent=P.score.toLocaleString();
  if(P.el.combo) P.el.combo.textContent=P.combo>=2?('🔥x'+P.combo):'';

  const globalScore = document.getElementById('vs-global-score' + P.idx);
  const globalCombo = document.getElementById('vs-global-combo' + P.idx);
  if(globalScore) globalScore.textContent = P.score.toLocaleString();
  if(globalCombo) globalCombo.textContent = P.combo>=2?('🔥x'+P.combo):'';
}

function _vsRenderGrid(P){
  const fog = Date.now()<P.fogUntil;
  for(let r=0;r<VS_N;r++)for(let c=0;c<VS_N;c++){
    const d=P.el.cells[r][c], k=r+','+c, v=P.board[r][c];
    d.className='vs-cell';
    d.textContent='';
    d.style.background='';
    d.style.removeProperty('--cc');
    delete d.dataset.ci;
    if(P.rocks.has(k)){ d.classList.add('vs-rock'); d.textContent='⛰️'; }
    else if(v){
      d.classList.add('vs-filled');
      d.style.setProperty('--cc', fog ? '#5a5f6e' : v);
      if(!fog){
        const ci=COLORS.indexOf(v);
        if(ci>=0) d.dataset.ci=String(ci);
      }
      if(P.ice.has(k)){ d.classList.add('vs-ice'); d.textContent='🧊'; }
    }
  }
}

function _vsRenderTray(P){
  P.el.tray.innerHTML='';
  P.pieces.forEach((pc,i)=>{
    const s=document.createElement('div');
    s.className='vs-piece'+(pc.used?' used':'')+(P.selected===i?' sel':'');
    
    // Vẽ mini khối: mọi viên gạch dùng CÙNG một kích thước cố định (như khay map
    // thường) — trước đây dùng track `1fr` trong khung 34×30 cố định nên viên gạch
    // to/nhỏ khác nhau tuỳ hình khối, thậm chí chồng lên nhau làm khối "mất ô".
    const mini=document.createElement('div'); mini.className='vs-mini';
    const cells=pc.shape;
    const maxR=Math.max(...cells.map(x=>x[0])), maxC=Math.max(...cells.map(x=>x[1]));
    const CS=9; // px mỗi viên — khối dài nhất 4 ô: 4×9 + 3×2 khe = 42px, vừa khay 52×44
    mini.style.gridTemplateRows='repeat('+(maxR+1)+','+CS+'px)';
    mini.style.gridTemplateColumns='repeat('+(maxC+1)+','+CS+'px)';
    for(let r=0;r<=maxR;r++)for(let c=0;c<=maxC;c++){
      const b=document.createElement('div');
      if(cells.some(([rr,cc])=>rr===r&&cc===c)){ 
         b.className='vs-mini-sweet';
         b.style.setProperty('--cc',pc.color);
         const ci=COLORS.indexOf(pc.color);
         if(ci>=0) b.dataset.ci=String(ci);
      }
      mini.appendChild(b);
    }
    s.appendChild(mini);
    s.addEventListener('pointerdown',ev=>{ ev.preventDefault(); _vsPieceTap(P,i,ev); });
    P.el.tray.appendChild(s);
  });
}

// ── Thao tác — giống map thường: chạm chọn / chạm lại xoay / kéo ghost + ô mờ / thả đặt ──

function _vsPieceTap(P,i,ev){
  if(!versusMode||P.done||P.pieces[i].used) return;
  if(_vs && _vs.online && P.idx!==0) return;
  if(typeof _vsAiControls==='function' && _vsAiControls(P)) return;
  if(P.el.cards.classList.contains('show')) return;
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }

  if(P.selected===i){
    // Chạm lại khối đang chọn → xoay (như map thường)
    P.pieces[i].shape=_rotShape(P.pieces[i].shape);
    try{ sfxRotate(); }catch(e){ try{ sfxClick(); }catch(e2){} }
  } else {
    P.selected=i;
    try{ sfxSelect(); }catch(e){ try{ sfxClick(); }catch(e2){} }
  }
  _vsRenderTray(P);
  if(ev) _vsBeginDrag(P, ev);
}

/* ── Kéo-thả + ghost + ô mờ (mỗi người 1 pointerId) ── */

const _vsDrags=new Map(); // pointerId -> {P, sx, sy, moved, pointerType}

function _vsGridGeom(P){
  const a=P.el.cells[0][0].getBoundingClientRect();
  const b=P.el.cells[0][1].getBoundingClientRect();
  const c=P.el.cells[1][0].getBoundingClientRect();
  return {
    x0:a.left, y0:a.top, cell:a.width,
    stepX:(b.left-a.left)||a.width,
    stepY:(c.top-a.top)||a.height,
  };
}

function _vsPieceBox(P,pc){
  const maxR=Math.max(...pc.shape.map(p=>p[0]));
  const maxC=Math.max(...pc.shape.map(p=>p[1]));
  const g=_vsGridGeom(P);
  const stepX=Math.abs(g.stepX), stepY=Math.abs(g.stepY);
  return { maxR, maxC, g, stepX, stepY, bbW:maxC*stepX+g.cell, bbH:maxR*stepY+g.cell };
}

function _vsGhostAnchor(x,y,bbH,ptype){
  if(ptype==='touch'||ptype==='pen') return [x, y-40-bbH/2];
  return [x, y];
}
/** Quy đổi con trỏ → ô gốc (góc trên-trái khung bao) — cùng công thức map thường */

function _vsOriginFromPointer(P,x,y,ptype){
  if(P.selected<0) return null;
  const pc=P.pieces[P.selected];
  if(!pc||pc.used) return null;
  const {g,bbW,bbH,maxR,maxC}=_vsPieceBox(P,pc);
  const [ax,ay]=_vsGhostAnchor(x,y,bbH,ptype);
  const ox=ax-bbW/2, oy=ay-bbH/2;
  let C=Math.round((ox-g.x0)/g.stepX);
  let R=Math.round((oy-g.y0)/g.stepY);
  if(R<-1-maxR||C<-1-maxC||R>VS_N+maxR||C>VS_N+maxC) return null;
  R=Math.max(0,Math.min(VS_N-1-maxR,R));
  C=Math.max(0,Math.min(VS_N-1-maxC,C));
  return {R,C};
}

function _vsBuildGhost(P){
  const gEl=P.el.ghost; if(!gEl||P.selected<0) return;
  const pc=P.pieces[P.selected]; if(!pc||pc.used){ _vsHideGhost(P); return; }
  const {g,maxR,maxC,stepX}=_vsPieceBox(P,pc);
  const gap=Math.max(0, stepX-g.cell);
  gEl.style.gridTemplateColumns=`repeat(${maxC+1},${g.cell}px)`;
  gEl.style.gap=gap+'px';
  gEl.innerHTML='';
  const cells=Array((maxR+1)*(maxC+1)).fill(null);
  pc.shape.forEach(([r,c])=>{ cells[r*(maxC+1)+c]=pc.color; });
  cells.forEach(color=>{
    const d=document.createElement('div');
    d.className='vs-g-cell'+(color?' sweet':'');
    d.style.width=g.cell+'px';
    d.style.height=g.cell+'px';
    if(color){
      d.style.setProperty('--cc',color);
      const ci=COLORS.indexOf(color);
      if(ci>=0) d.dataset.ci=String(ci);
    }
    else d.style.visibility='hidden';
    gEl.appendChild(d);
  });
  gEl.classList.add('active');
  // (Đã bỏ vs-ghost-flip: trước đây bàn trên bị xoay 180° bằng CSS nên ghost
  // phải xoay bù lại cho khớp — nay chỉ đổi THỨ TỰ hiển thị bằng `order`
  // (xem .vs-ai-mode ở css/main.css), không còn xoay bàn nào cả. Giữ flip lại
  // sẽ khiến ghost của NGƯỜI CHƠI THẬT (luôn là P.idx===0) hiển thị ngược
  // 180° so với hướng khối thực sự sẽ đặt xuống — đúng lỗi "xoay rồi đặt
  // ngược hướng".
}

function _vsHideGhost(P){
  const gEl=P.el.ghost; if(!gEl) return;
  gEl.classList.remove('active');
  gEl.innerHTML='';
  gEl.style.transform='';
  P._prevKey='';
}

function _vsMoveGhost(P,x,y,ptype){
  const gEl=P.el.ghost; if(!gEl||!gEl.classList.contains('active')||P.selected<0) return;
  const pc=P.pieces[P.selected]; if(!pc) return;
  const {bbH}=_vsPieceBox(P,pc);
  const [ax,ay]=_vsGhostAnchor(x,y,bbH,ptype);
  gEl.style.transform='translate3d('+ax+'px,'+ay+'px,0) translate(-50%,-50%)';
}

function _vsClearPreview(P){
  if(!P._prev){ P._prevKey=''; return; }
  P._prev.forEach(([r,c])=>{
    const d=P.el.cells[r][c];
    d.classList.remove('vs-prev','vs-filled');
    if(!P.board[r][c]){ d.style.background=''; d.style.removeProperty('--cc'); delete d.dataset.ci; }
  });
  P._prev=null;
  P._prevKey='';
}

function _vsShowPreviewAt(P,R,C){
  const key=P.selected+':'+R+','+C;
  if(P._prevKey===key) return;
  _vsClearPreview(P);
  if(P.selected<0) return;
  const pc=P.pieces[P.selected];
  if(!pc||pc.used) return;
  if(!_vsCanPlace(P,pc.shape,R,C)) return;
  P._prevKey=key;
  P._prev=pc.shape.map(([dr,dc])=>[R+dr,C+dc]);
  P._prev.forEach(([r,c])=>{
    const d=P.el.cells[r][c];
    d.classList.add('vs-prev','vs-filled');
    d.style.setProperty('--cc',pc.color);
    d.style.background='';
    const ci=COLORS.indexOf(pc.color);
    if(ci>=0) d.dataset.ci=String(ci);
    else delete d.dataset.ci;
  });
}

function _vsUpdatePreview(P,x,y,ptype){
  const o=_vsOriginFromPointer(P,x,y,ptype);
  if(!o){ _vsClearPreview(P); return; }
  _vsShowPreviewAt(P,o.R,o.C);
}

function _vsBeginDrag(P,ev){
  if(!versusMode||P.done||P.selected<0) return;
  if(_vs && _vs.online && P.idx!==0) return;
  if(typeof _vsAiControls==='function' && _vsAiControls(P)) return;
  if(P.el.cards.classList.contains('show')) return;
  const id=ev.pointerId!==undefined?ev.pointerId:-1;
  _vsDrags.set(id,{
    P,
    sx:ev.clientX, sy:ev.clientY,
    moved:false,
    pointerType:ev.pointerType||'mouse',
  });
  _vsBuildGhost(P);
  _vsMoveGhost(P,ev.clientX,ev.clientY,ev.pointerType);
  _vsUpdatePreview(P,ev.clientX,ev.clientY,ev.pointerType);
  // Làm mờ khối trên khay khi đang kéo
  P.el.tray.querySelectorAll('.vs-piece').forEach((el,i)=>{
    el.classList.toggle('dragging-src', i===P.selected);
  });
}

/** Bỏ chọn khối — giống endDrag() map thường */

function _vsDeselect(P){
  if(!P) return;
  P.selected=-1;
  _vsClearPreview(P);
  _vsHideGhost(P);
  if(P.el && P.el.tray){
    P.el.tray.querySelectorAll('.vs-piece').forEach(el=>{
      el.classList.remove('dragging-src','sel');
    });
  }
}

// Chạm ra ngoài khay/lưới/thẻ/nút → bỏ chọn (giống map thường)
document.addEventListener('pointerdown', ev=>{
  if(!versusMode||!_vs) return;
  const t=ev.target;
  if(!t || !t.closest) return;
  // Giữ chọn khi chạm khối, bàn cờ, thẻ chướng ngại, nút thoát
  if(t.closest('.vs-piece') || t.closest('.vs-grid') || t.closest('.vs-cards') ||
     t.closest('#vs-quit-btn') || t.closest('#vs-topbar') || t.closest('#vs-chat-fab') ||
     t.closest('#vs-top-chip') || t.closest('#vs-bottom-chip') || t.closest('#vs-chat')) return;
  // Huỷ mọi drag đang mở của pointer này
  const id=ev.pointerId!==undefined?ev.pointerId:-1;
  const dr=_vsDrags.get(id);
  if(dr){
    _vsDrags.delete(id);
    _vsDeselect(dr.P);
    return;
  }
  // Bỏ chọn mọi người đang chọn (tap nền / mép màn hình)
  _vs.players.forEach(P=>{
    if(P.selected>=0) _vsDeselect(P);
  });
});

document.addEventListener('pointermove',ev=>{
  if(!versusMode) return;
  const id=ev.pointerId!==undefined?ev.pointerId:-1;
  const dr=_vsDrags.get(id);
  if(!dr) return;
  if(!dr.moved && Math.hypot(ev.clientX-dr.sx, ev.clientY-dr.sy)>6) dr.moved=true;
  _vsMoveGhost(dr.P, ev.clientX, ev.clientY, dr.pointerType);
  _vsUpdatePreview(dr.P, ev.clientX, ev.clientY, dr.pointerType);
});

function _vsDragEnd(ev){
  const id=ev.pointerId!==undefined?ev.pointerId:-1;
  const dr=_vsDrags.get(id);
  if(!dr) return;
  _vsDrags.delete(id);
  if(!versusMode) return;
  const P=dr.P;
  _vsClearPreview(P);
  _vsHideGhost(P);
  P.el.tray.querySelectorAll('.vs-piece').forEach(el=>el.classList.remove('dragging-src'));

  // Tap trên khay (không kéo) → đã xoay/chọn ở pointerdown, giữ khối đang chọn
  if(!dr.moved && ev.target && ev.target.closest && ev.target.closest('.vs-piece')) return;

  // Kéo thật → thả đặt nếu hợp lệ (giống map thường)
  if(dr.moved){
    const o=_vsOriginFromPointer(P, ev.clientX, ev.clientY, dr.pointerType);
    if(o && P.selected>=0){
      const pc=P.pieces[P.selected];
      if(pc && !pc.used && _vsCanPlace(P,pc.shape,o.R,o.C)){
        _vsPlaceAt(P,o.R,o.C);
        return;
      }
    }
    try{ sfxInvalid(); }catch(e){}
    _vsDeselect(P); // thả chỗ không hợp lệ / ra rìa → bỏ chọn như map thường
    return;
  }

  // Tap trên lưới (không kéo) → đặt theo vị trí ô dưới ngón (không dùng lift cảm ứng)
  if(ev.target && ev.target.closest && ev.target.closest('.vs-cell')){
    const o=_vsOriginFromPointer(P, ev.clientX, ev.clientY, 'mouse');
    if(o) _vsPlaceAt(P,o.R,o.C);
  }
}
document.addEventListener('pointerup',_vsDragEnd);
document.addEventListener('pointercancel',ev=>{
  const id=ev.pointerId!==undefined?ev.pointerId:-1;
  const dr=_vsDrags.get(id);
  if(!dr) return;
  _vsDrags.delete(id);
  _vsDeselect(dr.P);
});

function _vsOfferCards(P){
  if(_vs && _vs.online && P.idx!==0) return;
  const picks=[]; const pool=VS_OBSTACLES.slice();
  while(picks.length<3&&pool.length) picks.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  P.el.cards.innerHTML='<div class="vs-cards-title">'+t('vsPickCard')+'</div>'+
    '<div class="vs-cards-row"></div>';
  const row=P.el.cards.querySelector('.vs-cards-row');
  picks.forEach((ob)=>{
    const b=document.createElement('button');
    b.className='vs-card';
    b.innerHTML='<div class="vs-card-inner">'+
      '<div class="vs-card-front"><div class="vs-card-emoji">'+ob.emoji+'</div><div class="vs-card-name">'+MECH_NAME(ob.nameIdx).replace(/^\S+\s/,'')+'</div></div>'+
      '</div>';
    b.addEventListener('pointerdown',ev=>{
      ev.preventDefault();
      P.el.cards.classList.remove('show');
      const foe=_vs.players[1-P.idx];
      _vsApplyObstacle(foe,ob);
      if(_vs.online && P.idx===0) _vsBroadcastMove('card', { cardId: ob.id });
      try{ sfxThorn(); }catch(e){ try{ sfxPenalty(); }catch(e2){} }
    });
    row.appendChild(b);
  });
  P.el.cards.classList.add('show');
}

function _vsCloseResult(rematch){
  _vsHide('versus-result-panel');
  if(rematch){
    const names=_vs.names;
    document.getElementById('vs-name1').value=names[0];
    _vs=null;
    startVersusMatch();
    return;
  }
  _vs=null;
}

