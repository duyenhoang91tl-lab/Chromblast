// ═══════════════════════════════════════════════════════════════
// js/chat.js — Chat thế giới · bạn bè · trong trận (+ presence / mời phòng)
// Nạp SAU online-services.js + player-profile.js
// ═══════════════════════════════════════════════════════════════

(function(){
  const TL_KEY = 'chromablast_gchat_tl';
  const state = {
    tab: 'world',
    friendUid: null,
    friendName: '',
    friendAvatar: '🐶',
    friendOnline: false,
    presence: {},
    seen: { world: new Set(), friends: new Set(), game: new Set() },
    roomCb: null,
    ready: false,
    tlLang: '',
    tlCache: Object.create(null)
  };

  function $(id){ return document.getElementById(id); }

  function tt(key, fallback){
    try{ if(typeof t === 'function'){ const v = t(key); if(v && v !== key) return v; } }catch(e){}
    return fallback || key;
  }

  function loadTlPref(){
    try{
      const v = localStorage.getItem(TL_KEY);
      state.tlLang = v || '';
    }catch(e){ state.tlLang = ''; }
    const sel = $('gchat-tl-lang');
    if(sel) sel.value = state.tlLang;
  }

  function saveTlPref(code){
    state.tlLang = code || '';
    try{
      if(state.tlLang) localStorage.setItem(TL_KEY, state.tlLang);
      else localStorage.removeItem(TL_KEY);
    }catch(e){}
  }

  function pad2(n){ return String(n).padStart(2, '0'); }

  function msgDate(ts){
    if(!ts) return null;
    try{
      if(typeof ts.toDate === 'function') return ts.toDate();
      if(typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
      if(typeof ts === 'number') return new Date(ts);
      if(ts instanceof Date) return ts;
    }catch(e){}
    return null;
  }

  function formatMsgTime(ts){
    const d = msgDate(ts);
    if(!d || isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay = d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
    const hm = pad2(d.getHours())+':'+pad2(d.getMinutes());
    if(sameDay) return hm;
    return pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(-2)+' '+hm;
  }

  function isMine(msg){
    try{
      return !!(msg && msg.uid && typeof getOnlineUid === 'function' && msg.uid === getOnlineUid());
    }catch(e){ return false; }
  }

  async function translateText(text, tl){
    const raw = String(text || '').trim();
    if(!raw || !tl) return raw;
    const key = tl+'|'+raw;
    if(state.tlCache[key]) return state.tlCache[key];

    // 1) MyMemory Translated (API công khai, có điều khoản sử dụng)
    try{
      const url = 'https://api.mymemory.translated.net/get?q='+encodeURIComponent(raw)
        +'&langpair=autodetect|'+encodeURIComponent(tl);
      const res = await fetch(url);
      if(res.ok){
        const data = await res.json();
        const out = data && data.responseData && data.responseData.translatedText;
        if(out && !/INVALID SOURCE LANGUAGE|PLEASE SELECT|MYMEMORY WARNING/i.test(out)){
          state.tlCache[key] = out;
          return out;
        }
      }
    }catch(e){}

    // 2) LibreTranslate (instance công khai Argos) — fallback
    try{
      const res = await fetch('https://translate.argosopentech.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: raw, source: 'auto', target: tl, format: 'text' })
      });
      if(res.ok){
        const data = await res.json();
        const out = data && data.translatedText;
        if(out){ state.tlCache[key] = out; return out; }
      }
    }catch(e){}

    throw new Error('translate_fail');
  }

  function applyTranslateToRow(row){
    if(!row) return;
    const body = row.querySelector('.gchat-text');
    if(!body) return;
    const orig = body.dataset.orig || body.textContent || '';
    body.dataset.orig = orig;
    let tr = row.querySelector('.gchat-tr');
    if(!state.tlLang || !orig.trim()){
      if(tr) tr.remove();
      return;
    }
    if(!tr){
      tr = document.createElement('span');
      tr.className = 'gchat-tr';
      body.insertAdjacentElement('afterend', tr);
    }
    tr.classList.add('pending');
    tr.classList.remove('err');
    tr.textContent = tt('gchatTranslating', 'Đang dịch...');
    translateText(orig, state.tlLang).then(out=>{
      if(!tr.isConnected) return;
      tr.classList.remove('pending','err');
      tr.textContent = out;
    }).catch(()=>{
      if(!tr.isConnected) return;
      tr.classList.remove('pending');
      tr.classList.add('err');
      tr.textContent = tt('gchatTranslateFail', 'Không dịch được');
    });
  }

  function refreshWorldTranslations(){
    const log = $('gchat-world-log');
    if(!log) return;
    log.querySelectorAll('.gchat-row').forEach(applyTranslateToRow);
  }

  function appendMsg(logEl, msg, bucket){
    if(!logEl || !msg || !msg.id) return;
    const set = state.seen[bucket];
    if(set && set.has(msg.id)) return;
    if(set) set.add(msg.id);
    const mine = isMine(msg);
    if(msg.kind === 'heart_gift' && !mine && bucket === 'friends'){
      try{
        const key = 'chromablast_heart_recv';
        let claimed = [];
        try{ claimed = JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){ claimed=[]; }
        if(!Array.isArray(claimed)) claimed = [];
        if(claimed.indexOf(msg.id) < 0){
          claimed.push(msg.id);
          if(claimed.length > 80) claimed = claimed.slice(-80);
          try{ localStorage.setItem(key, JSON.stringify(claimed)); }catch(e){}
          if(typeof grantHearts === 'function') grantHearts(1, tt('gchatHeartReceived','Tim từ bạn'));
        }
      }catch(e){}
    }
    const row = document.createElement('div');
    row.className = 'gchat-row'+(mine?' mine':'');
    row.dataset.msgId = msg.id;

    const head = document.createElement('div');
    head.className = 'gchat-who';
    const name = document.createElement('span');
    name.textContent = (msg.avatar || '🐶')+' '+(msg.name || 'Player');
    head.appendChild(name);
    const when = formatMsgTime(msg.ts);
    if(when){
      const timeEl = document.createElement('span');
      timeEl.className = 'gchat-time';
      timeEl.textContent = '· '+when;
      head.appendChild(timeEl);
    }
    row.appendChild(head);

    const body = document.createElement('span');
    body.className = 'gchat-text';
    body.dataset.orig = msg.text || '';
    body.textContent = msg.text || '';
    row.appendChild(body);

    const isInvite = msg.kind === 'room_invite' && msg.roomId;
    if(isInvite){
      const card = document.createElement('div');
      card.className = 'gchat-invite-card';
      const lab = document.createElement('div');
      lab.className = 'gchat-invite-card-lab';
      lab.textContent = (msg.gameType === 'versus' ? 'Versus' : 'Caro')+' · '+(msg.code || '');
      card.appendChild(lab);
      if(!mine){
        const join = document.createElement('button');
        join.type = 'button';
        join.className = 'gchat-invite-join';
        join.textContent = tt('gchatInviteAccept', 'Vào');
        join.addEventListener('click', async ()=>{
          try{ sfxClick(); }catch(e){}
          join.disabled = true;
          try{
            closeChatPanel();
            await joinFromInvite({
              gameType: msg.gameType === 'versus' ? 'versus' : 'caro',
              roomId: msg.roomId,
              code: msg.code
            });
          }catch(err){
            console.warn('[gchat join]', err);
            join.disabled = false;
            setStatus(tt('gchatInviteFail','Không mời được'), true);
          }
        });
        card.appendChild(join);
      } else {
        const note = document.createElement('div');
        note.className = 'gchat-invite-card-note';
        note.textContent = tt('gchatInviteWaiting','Đang chờ người vào...');
        card.appendChild(note);
      }
      row.appendChild(card);
    } else if(!mine && msg.uid && (bucket === 'world' || bucket === 'friends')){
      const actions = document.createElement('div');
      actions.className = 'gchat-msg-actions';
      const mk = (gameType, label)=>{
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gchat-msg-invite';
        b.textContent = label;
        b.addEventListener('click', async ()=>{
          try{ sfxClick(); }catch(e){}
          b.disabled = true;
          try{ await invitePlayer(msg.uid, gameType, msg.name || 'Player'); }
          finally{ b.disabled = false; }
        });
        return b;
      };
      actions.appendChild(mk('caro', tt('gchatInviteCaroShort','Mời Caro')));
      actions.appendChild(mk('versus', tt('gchatInviteVersusShort','Mời Versus')));
      row.appendChild(actions);
    }

    logEl.appendChild(row);
    if(bucket === 'world') applyTranslateToRow(row);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clearLog(id, bucket){
    const el = $(id);
    if(el) el.innerHTML = '';
    if(bucket && state.seen[bucket]) state.seen[bucket].clear();
  }

  function setStatus(text, isErr){
    const el = $('gchat-status');
    if(el){
      el.textContent = text || '';
      el.classList.toggle('err', !!isErr);
    }
    const fp = $('friends-panel');
    if(fp && fp.classList.contains('show')) setFriendsStatus(text, isErr);
  }

  function setFriendsStatus(text, isErr){
    const el = $('friends-status');
    if(!el) return;
    el.textContent = text || '';
    el.classList.toggle('err', !!isErr);
  }

  function currentRoomId(){
    return (typeof getActiveOnlineRoomId === 'function') ? getActiveOnlineRoomId() : null;
  }

  function showTab(tab){
    state.tab = tab;
    document.querySelectorAll('.gchat-tab').forEach(b=>{
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.gchat-pane').forEach(p=>{
      p.classList.toggle('active', p.dataset.pane === tab);
    });
    if(tab === 'world') startWorld();
    if(tab === 'friends') renderFriendsList();
    if(tab === 'game') startGameChat();
  }

  async function ensureOnline(){
    if(typeof isOnlineServicesEnabled === 'function' && !isOnlineServicesEnabled()){
      setStatus(tt('gchatNeedOnline', 'Cần bật online / Firebase'), true);
      return false;
    }
    try{
      if(typeof ensureOnlineAuth === 'function') await ensureOnlineAuth();
      setStatus('');
      return true;
    }catch(e){
      setStatus(tt('gchatAuthFail', 'Đăng nhập online thất bại'), true);
      return false;
    }
  }

  async function startWorld(){
    if(!(await ensureOnline())) return;
    if(typeof listenWorldChat !== 'function') return;
    listenWorldChat(msg => appendMsg($('gchat-world-log'), msg, 'world'));
  }

  function presenceDot(online){
    return '<span class="gchat-dot '+(online?'on':'off')+'" title="'+(online?tt('gchatOnline','Online'):tt('gchatOffline','Offline'))+'"></span>';
  }

  async function renderFriendsList(){
    const list = $('gchat-friends-list');
    const thread = $('gchat-friends-thread');
    const cap = $('gchat-friend-cap');
    if(cap){
      const n = (typeof getFriendsList === 'function') ? getFriendsList().length : 0;
      const max = (typeof maxFriendsForLevel === 'function')
        ? maxFriendsForLevel(typeof playerLevel==='number'?playerLevel:1)
        : 20;
      const gifts = (typeof getHeartGiftState === 'function') ? getHeartGiftState() : { sentTo:[] };
      const giftMax = (typeof Inventory !== 'undefined' && Inventory.MAX_HEART_GIFT_PEOPLE) || 10;
      cap.textContent = tt('gchatFriendCap','Bạn bè')+': '+n+'/'+max+
        ' · '+tt('gchatHeartGiftLeft','Tim gửi')+': '+(gifts.sentTo.length)+'/'+giftMax;
    }
    if(!list) return;
    list.innerHTML = '';
    if(state.friendUid){
      list.hidden = true;
      return;
    }
    list.hidden = false;
    const friends = (typeof getFriendsList === 'function') ? getFriendsList() : [];
    if(!friends.length){
      list.innerHTML = '<div class="gchat-empty">'+tt('gchatNoFriends','Chưa có bạn — gửi lời mời từ hồ sơ đối thủ Caro')+'</div>';
      if(thread) thread.hidden = true;
      return;
    }

    // Skeleton trước, rồi cập nhật presence
    friends.forEach(f=>{
      if(!f || !f.uid) return;
      const online = !!(state.presence[f.uid] && state.presence[f.uid].online);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gchat-friend'+(state.friendUid===f.uid?' active':'');
      btn.dataset.uid = f.uid;
      btn.innerHTML =
        '<span class="gchat-friend-av-wrap">'+presenceDot(online)+'<span class="gchat-friend-av">'+(f.avatar||'🐶')+'</span></span>'+
        '<span class="gchat-friend-meta">'+
          '<span class="gchat-friend-name">'+escapeHtml(f.name||'Player')+'</span>'+
          '<span class="gchat-friend-status">'+(online?tt('gchatOnline','Online'):tt('gchatOffline','Offline'))+'</span>'+
        '</span>';
      btn.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        openFriendThread(f);
      });
      list.appendChild(btn);
    });

    if(await ensureOnline()){
      try{
        if(typeof fetchFriendsPresence === 'function'){
          state.presence = await fetchFriendsPresence(friends);
          list.querySelectorAll('.gchat-friend').forEach(btn=>{
            const uid = btn.dataset.uid;
            const p = state.presence[uid];
            if(!p) return;
            const online = !!p.online;
            const av = btn.querySelector('.gchat-friend-av-wrap');
            const st = btn.querySelector('.gchat-friend-status');
            if(av) av.innerHTML = presenceDot(online)+'<span class="gchat-friend-av">'+(p.avatar||'🐶')+'</span>';
            if(st) st.textContent = online ? tt('gchatOnline','Online') : tt('gchatOffline','Offline');
          });
        }
      }catch(e){}
    }
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  async function openFriendThread(friend){
    state.friendUid = friend.uid;
    state.friendName = friend.name || 'Player';
    state.friendAvatar = friend.avatar || '🐶';
    const p = state.presence[friend.uid];
    state.friendOnline = !!(p && p.online);
    renderFriendsList();
    const thread = $('gchat-friends-thread');
    const title = $('gchat-friend-title');
    const presence = $('gchat-friend-presence');
    if(title) title.textContent = (friend.avatar||'🐶')+' '+(friend.name||'Player');
    if(presence){
      presence.className = 'gchat-presence-lab '+(state.friendOnline?'on':'off');
      presence.textContent = state.friendOnline ? tt('gchatOnline','Online') : tt('gchatOffline','Offline');
    }
    if(thread) thread.hidden = false;
    clearLog('gchat-friends-log', 'friends');
    if(!(await ensureOnline())) return;
    // Refresh presence for this friend
    try{
      if(typeof fetchPlayerPublicProfile === 'function' && typeof isFriendOnline === 'function'){
        const prof = await fetchPlayerPublicProfile(friend.uid);
        state.friendOnline = isFriendOnline(prof);
        if(presence){
          presence.className = 'gchat-presence-lab '+(state.friendOnline?'on':'off');
          presence.textContent = state.friendOnline ? tt('gchatOnline','Online') : tt('gchatOffline','Offline');
        }
      }
    }catch(e){}
    if(typeof listenFriendChat !== 'function') return;
    listenFriendChat(friend.uid, msg => appendMsg($('gchat-friends-log'), msg, 'friends'));
  }

  async function invitePlayer(toUid, gameType, displayName){
    if(!toUid){
      setStatus(tt('gchatPickFriend','Chọn một người bạn'), true);
      return;
    }
    if(!(await ensureOnline())) return;
    setStatus(tt('gchatInviting','Đang gửi lời mời...'));
    try{
      await inviteFriendToRoom(toUid, gameType);
      closeChatPanel();
      setStatus(tt('gchatInviteSent','Đã gửi lời mời'));
      try{ showAchievementToast({ label: tt('gchatInviteSent','Đã gửi lời mời'), desc: displayName || '' }); }catch(e){}
    }catch(err){
      console.warn('[invite]', err);
      setStatus(tt('gchatInviteFail','Không mời được'), true);
    }
  }

  async function inviteFriend(gameType){
    return invitePlayer(state.friendUid, gameType, state.friendName);
  }

  /** Tạo phòng + đăng thẻ mời lên chat thế giới để ai cũng vào được */
  async function createWorldRoomInvite(gameType){
    if(!(await ensureOnline())) return;
    setStatus(tt('gchatInviting','Đang gửi lời mời...'));
    try{
      if(typeof postWorldRoomInvite !== 'function') throw new Error('no_post');
      const res = await postWorldRoomInvite(gameType);
      setStatus(tt('gchatRoomPosted','Đã tạo phòng — đăng lên Thế giới'));
      try{
        showAchievementToast({
          label: tt('gchatRoomPosted','Đã tạo phòng — đăng lên Thế giới'),
          desc: (res && res.lobby && res.lobby.code) || ''
        });
      }catch(e){}
      closeChatPanel();
    }catch(err){
      console.warn('[world invite]', err);
      setStatus(tt('gchatInviteFail','Không mời được'), true);
    }
  }

  async function startGameChat(){
    const roomId = currentRoomId();
    const note = $('gchat-game-note');
    const form = $('gchat-game-form');
    if(!roomId){
      if(note) note.textContent = tt('gchatNoMatch','Chưa trong phòng online (Caro / Versus)');
      if(form) form.style.display = 'none';
      clearLog('gchat-game-log', 'game');
      if(state.roomCb && typeof unlistenRoomChat === 'function'){
        unlistenRoomChat(state.roomCb);
        state.roomCb = null;
      }
      return;
    }
    if(note) note.textContent = tt('gchatInMatch','Đang chat trong phòng');
    if(form) form.style.display = '';
    if(!(await ensureOnline())) return;
    if(state.roomCb && typeof unlistenRoomChat === 'function') unlistenRoomChat(state.roomCb);
    state.roomCb = function(msg){ appendMsg($('gchat-game-log'), msg, 'game'); };
    if(typeof listenRoomChat === 'function') listenRoomChat(roomId, state.roomCb);
  }

  async function sendCurrent(e){
    if(e) e.preventDefault();
    const map = {
      world: { input:'gchat-world-input', send: sendWorldChat },
      friends: { input:'gchat-friends-input', send: async (text)=> sendFriendChat(state.friendUid, text) },
      game: { input:'gchat-game-input', send: async (text)=>{
        const roomId = currentRoomId();
        if(!roomId) throw new Error('no_room');
        return sendRoomChat(roomId, text);
      }}
    };
    const cfg = map[state.tab];
    if(!cfg) return;
    if(state.tab === 'friends' && !state.friendUid){
      setStatus(tt('gchatPickFriend','Chọn một người bạn'), true);
      return;
    }
    const input = $(cfg.input);
    if(!input) return;
    const text = input.value;
    input.value = '';
    try{
      if(!(await ensureOnline())) return;
      await cfg.send(text);
      setStatus('');
    }catch(err){
      console.warn('[gchat]', err);
      setStatus(tt('gchatSendFail','Không gửi được'), true);
    }
  }

  function preferredChatTab(explicit){
    if(explicit) return explicit;
    if(currentRoomId()) return 'game';
    return state.tab || 'world';
  }

  function syncChatFabVisibility(){
    const fab = $('gchat-fab');
    if(fab){
      // Màn chính dùng #chat-btn trên header — FAB dưới luôn tắt
      fab.hidden = true;
      fab.style.display = 'none';
      fab.setAttribute('aria-hidden', 'true');
    }
    const panelOpen = !!$('gchat-panel')?.classList.contains('show');
    document.body.classList.toggle('gchat-open', panelOpen);
  }

  function positionChatFab(){
    // no-op: FAB đã bỏ trên màn chính
  }

  function openChatPanel(tab){
    const panel = $('gchat-panel');
    if(!panel) return;
    panel.classList.add('show');
    showTab(preferredChatTab(tab));
    syncChatFabVisibility();
    try{ if(typeof applyI18nDom === 'function') applyI18nDom(); }catch(e){}
  }

  function closeChatPanel(){
    const panel = $('gchat-panel');
    if(panel) panel.classList.remove('show');
    syncChatFabVisibility();
    try{ if(typeof stopListeningWorldChat === 'function') stopListeningWorldChat(); }catch(e){}
    try{ if(typeof stopListeningDmChat === 'function') stopListeningDmChat(); }catch(e){}
  }

  function showInviteToast(invite){
    if(!invite) return;
    document.querySelectorAll('.gchat-invite-toast').forEach(el=>el.remove());
    const gameLabel = invite.gameType === 'versus' ? 'Versus' : 'Caro';
    const toast = document.createElement('div');
    toast.className = 'gchat-invite-toast';
    toast.innerHTML =
      '<div class="gchat-invite-toast-body">'+
        '<div class="gchat-invite-toast-title">'+tt('gchatInviteIncoming','Lời mời phòng')+'</div>'+
        '<div class="gchat-invite-toast-desc">'+escapeHtml((invite.fromAvatar||'🐶')+' '+(invite.fromName||'Player'))+
          ' · '+gameLabel+' · '+escapeHtml(invite.code||'')+'</div>'+
      '</div>'+
      '<div class="gchat-invite-toast-actions">'+
        '<button type="button" class="gchat-invite-accept">'+tt('gchatInviteAccept','Vào')+'</button>'+
        '<button type="button" class="gchat-invite-decline">'+tt('gchatInviteDecline','Từ chối')+'</button>'+
      '</div>';
    document.body.appendChild(toast);
    const accept = toast.querySelector('.gchat-invite-accept');
    const decline = toast.querySelector('.gchat-invite-decline');
    const cleanup = ()=>{ try{ toast.remove(); }catch(e){} };
    accept?.addEventListener('click', async ()=>{
      try{ sfxClick(); }catch(e){}
      accept.disabled = true;
      try{
        const data = await respondRoomInvite(invite.id, true);
        cleanup();
        await joinFromInvite(data || invite);
      }catch(err){
        console.warn('[invite accept]', err);
        accept.disabled = false;
        try{ showAchievementToast({ label: tt('gchatInviteFail','Không mời được'), desc: String(err.message||'') }); }catch(e){}
      }
    });
    decline?.addEventListener('click', async ()=>{
      try{ sfxClick(); }catch(e){}
      try{ await respondRoomInvite(invite.id, false); }catch(e){}
      cleanup();
    });
    setTimeout(cleanup, 45000);
  }

  async function joinFromInvite(invite){
    if(!invite) return;
    if(invite.gameType === 'versus'){
      if(typeof openOnlineHub === 'function') openOnlineHub();
      if(typeof joinOnlineRoomById === 'function' && typeof openOnlineLobby === 'function'){
        const data = await joinOnlineRoomById(invite.roomId, { gameType:'versus' });
        openOnlineLobby(data.roomId, data.code || invite.code, 'guest', data);
      }
    } else {
      if(typeof ensureCaroLoaded === 'function'){
        try{ await ensureCaroLoaded(); }catch(e){ console.error('[chat]', e); }
      }
      if(typeof openCaroHub === 'function') openCaroHub();
      if(typeof caroJoinRoomById === 'function') await caroJoinRoomById(invite.roomId);
    }
  }

  window.onRoomInviteReceived = function(invite){
    showInviteToast(invite);
  };

  function showFriendRequestToast(req){
    if(!req || !req.fromUid) return;
    document.querySelectorAll('.gchat-friend-req-toast').forEach(el=>el.remove());
    const toast = document.createElement('div');
    toast.className = 'gchat-invite-toast gchat-friend-req-toast';
    toast.innerHTML =
      '<div class="gchat-invite-toast-body">'+
        '<div class="gchat-invite-toast-title">'+tt('gchatFriendReq','Lời mời kết bạn')+'</div>'+
        '<div class="gchat-invite-toast-desc">'+escapeHtml((req.fromAvatar||'🐶')+' '+(req.fromName||'Player'))+'</div>'+
      '</div>'+
      '<div class="gchat-invite-toast-actions">'+
        '<button type="button" class="gchat-invite-accept">'+tt('gchatFriendAccept','Chấp nhận')+'</button>'+
        '<button type="button" class="gchat-invite-decline">'+tt('gchatFriendDecline','Từ chối')+'</button>'+
      '</div>';
    document.body.appendChild(toast);
    const accept = toast.querySelector('.gchat-invite-accept');
    const decline = toast.querySelector('.gchat-invite-decline');
    const cleanup = ()=>{ try{ toast.remove(); }catch(e){} };
    accept?.addEventListener('click', async ()=>{
      try{ sfxClick(); }catch(e){}
      accept.disabled = true;
      try{
        const res = await respondFriendRequest(req.fromUid, true);
        cleanup();
        if(res && res.ok){
          try{ showComboFlash(0,false,'🤝 '+tt('gchatFriendAccepted','Đã kết bạn')); }catch(e){}
          renderFriendsList();
        } else if(res && res.reason === 'cap'){
          try{ showComboFlash(0,false, tt('gchatFriendCapFull','Đã đủ số bạn tối đa')); }catch(e){}
        }
      }catch(err){ cleanup(); }
    });
    decline?.addEventListener('click', async ()=>{
      try{ sfxClick(); }catch(e){}
      try{ await respondFriendRequest(req.fromUid, false); }catch(e){}
      cleanup();
    });
    setTimeout(cleanup, 60000);
  }

  window.onFriendRequestIncoming = function(req){
    showFriendRequestToast(req);
  };

  async function sendHeartToFriend(){
    if(!state.friendUid){
      setStatus(tt('gchatPickFriend','Chọn một người bạn'), true);
      return;
    }
    const check = (typeof canSendHeartGift === 'function')
      ? canSendHeartGift(state.friendUid)
      : { ok:false };
    if(!check.ok){
      const msg = check.reason === 'already'
        ? tt('gchatHeartAlready','Đã gửi tim người này hôm nay')
        : check.reason === 'cap'
          ? tt('gchatHeartCap','Tối đa 10 người/ngày')
          : tt('gchatHeartFail','Không gửi được');
      setStatus(msg, true);
      return;
    }
    if(!(await ensureOnline())) return;
    try{
      await sendFriendChat(state.friendUid, '❤️ '+tt('gchatHeartGiftText','Gửi bạn một trái tim'), { kind: 'heart_gift' });
      if(typeof markHeartGiftSent === 'function') markHeartGiftSent(state.friendUid);
      setStatus(tt('gchatHeartSent','Đã gửi tim'));
      renderFriendsList();
    }catch(err){
      console.warn('[heart gift]', err);
      setStatus(tt('gchatHeartFail','Không gửi được'), true);
    }
  }

  function initGlobalChat(){
    if(state.ready) return;
    state.ready = true;
    const openBtn = ()=>{
      try{ sfxClick(); }catch(e){}
      openChatPanel();
    };
    $('chat-btn')?.addEventListener('click', openBtn);
    $('gchat-fab')?.addEventListener('click', openBtn);
    $('gchat-close')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeChatPanel();
    });
    document.querySelectorAll('.gchat-tab').forEach(b=>{
      b.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        showTab(b.dataset.tab);
      });
    });
    ['gchat-world-form','gchat-friends-form','gchat-game-form'].forEach(id=>{
      $(id)?.addEventListener('submit', sendCurrent);
    });
    $('gchat-friend-back')?.addEventListener('click', ()=>{
      state.friendUid = null;
      try{ if(typeof stopListeningDmChat === 'function') stopListeningDmChat(); }catch(e){}
      const thread = $('gchat-friends-thread');
      if(thread) thread.hidden = true;
      const list = $('gchat-friends-list');
      if(list) list.hidden = false;
      renderFriendsList();
    });
    $('gchat-invite-caro')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} inviteFriend('caro'); });
    $('gchat-invite-versus')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} inviteFriend('versus'); });
    $('gchat-send-heart')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} sendHeartToFriend(); });
    $('gchat-world-caro')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} createWorldRoomInvite('caro'); });
    $('gchat-world-versus')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} createWorldRoomInvite('versus'); });
    loadTlPref();
    $('gchat-tl-lang')?.addEventListener('change', (e)=>{
      saveTlPref(e.target.value || '');
      try{ sfxClick(); }catch(err){}
      refreshWorldTranslations();
      if(state.tlLang) setStatus(tt('gchatTranslateOn','Đã bật dịch tự động'));
      else setStatus('');
    });
    syncChatFabVisibility();
    window.addEventListener('resize', ()=>{ try{ positionChatFab(); }catch(e){} });
    window.addEventListener('orientationchange', ()=>{
      setTimeout(()=>{ try{ positionChatFab(); }catch(e){} }, 120);
    });
    $('friends-close-btn')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} closeFriendsPanel(); });
    $('friends-open-chat')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} closeFriendsPanel(); openChatPanel('friends'); });
    $('set-btn-friends')?.addEventListener('click', ()=>{
      try{sfxClick();}catch(e){}
      openFriendsPanel();
    });
    $('friends-search-btn')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} runFriendsSearch(); });
    $('friends-search-input')?.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){ e.preventDefault(); try{sfxClick();}catch(err){} runFriendsSearch(); }
    });
    $('friends-suggest-refresh')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} loadFriendsSuggestions(true); });
    $('friends-suggest-invite')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} inviteSelectedSuggestions(); });
  }

  // friends panel helpers declared before init uses them
  let _friendSuggestCache = [];

  function closeFriendsPanel(){
    const panel = $('friends-panel');
    if(!panel) return;
    panel.classList.remove('show');
    panel.setAttribute('aria-hidden', 'true');
  }
  function openFriendsPanel(){
    const panel = $('friends-panel');
    if(!panel) return;
    // Đóng menu + overlay khác → màn Bạn bè là màn hình mới hoàn toàn
    try{ if(typeof closeAllSettingsOverlays==='function') closeAllSettingsOverlays(); }catch(e){}
    try{ if(typeof closeSettingsHub==='function') closeSettingsHub(); }catch(e){}
    ['daily-panel','shop-panel','quests-screen','account-panel','player-profile-panel','leaderboard-panel']
      .forEach(id=>{ document.getElementById(id)?.classList.remove('show'); });
    panel.classList.add('show');
    panel.setAttribute('aria-hidden', 'false');
    const sr = $('friends-search-result');
    if(sr) sr.innerHTML = '';
    setFriendsStatus('');
    renderFriendsPanelList();
    loadFriendsSuggestions(false);
    try{ if(typeof applyI18nDom==='function') applyI18nDom(); }catch(e){}
  }

  window.openChatPanel = openChatPanel;
  window.closeChatPanel = closeChatPanel;
  window.syncChatFabVisibility = syncChatFabVisibility;
  window.positionChatFab = positionChatFab;
  window.initGlobalChat = initGlobalChat;
  window.showInviteToast = showInviteToast;

  async function renderFriendsPanelList(){
    const list = $('friends-panel-list');
    const cap = $('friends-cap-line');
    if(!list) return;
    const friends = (typeof getFriendsList === 'function') ? getFriendsList() : [];
    const max = (typeof maxFriendsForLevel === 'function')
      ? maxFriendsForLevel(typeof playerLevel==='number'?playerLevel:1) : 20;
    if(cap){
      const gifts = (typeof getHeartGiftState === 'function') ? getHeartGiftState() : { sentTo:[] };
      const giftMax = (typeof Inventory !== 'undefined' && Inventory.MAX_HEART_GIFT_PEOPLE) || 10;
      cap.textContent = tt('gchatFriendCap','Bạn bè')+': '+friends.length+'/'+max+
        ' · '+tt('gchatHeartGiftLeft','Tim gửi')+': '+gifts.sentTo.length+'/'+giftMax;
    }
    list.innerHTML = '';
    if(!friends.length){
      list.innerHTML = '<div class="gchat-empty">'+tt('gchatNoFriends','Chưa có bạn — tìm theo tên/ID hoặc gửi lời mời bên dưới')+'</div>';
      return;
    }
    let presence = {};
    try{
      if(typeof fetchFriendsPresence === 'function' && await ensureOnline()){
        presence = await fetchFriendsPresence(friends) || {};
      }
    }catch(e){}
    friends.forEach(f=>{
      if(!f || !f.uid) return;
      const online = !!(presence[f.uid] && presence[f.uid].online);
      const row = document.createElement('div');
      row.className = 'friends-panel-row';
      row.innerHTML =
        '<span class="gchat-friend-av-wrap">'+presenceDot(online)+'<span class="gchat-friend-av">'+(f.avatar||'🐶')+'</span></span>'+
        '<span class="friends-panel-meta">'+
          '<span class="gchat-friend-name">'+escapeHtml(f.name||'Player')+'</span>'+
          '<span class="gchat-friend-status">'+(online?tt('gchatOnline','Online'):tt('gchatOffline','Offline'))+'</span>'+
        '</span>'+
        '<button type="button" class="friends-panel-chat">💬</button>';
      row.querySelector('.friends-panel-chat')?.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        closeFriendsPanel();
        openChatPanel('friends');
        openFriendThread(f);
      });
      list.appendChild(row);
    });
  }

  function _friendResultRow(p, opts){
    opts = opts || {};
    const row = document.createElement('div');
    row.className = 'friends-panel-row friends-suggest-row';
    const name = p.displayName || p.name || 'Player';
    const av = p.avatar || '🐶';
    const checked = opts.checked !== false;
    row.innerHTML =
      (opts.check
        ? '<label class="friends-suggest-check"><input type="checkbox" '+(checked?'checked':'')+' data-uid="'+escapeHtml(p.uid)+'"><span class="gchat-friend-av">'+escapeHtml(av)+'</span></label>'
        : '<span class="gchat-friend-av">'+escapeHtml(av)+'</span>')+
      '<span class="friends-panel-meta">'+
        '<span class="gchat-friend-name">'+escapeHtml(name)+'</span>'+
        '<span class="gchat-friend-status">'+(p.online?tt('gchatOnline','Online'):tt('gchatOffline','Offline'))+'</span>'+
      '</span>'+
      '<button type="button" class="friends-panel-add">'+tt('friendsAdd','Kết bạn')+'</button>';
    row.querySelector('.friends-panel-add')?.addEventListener('click', async ()=>{
      try{ sfxClick(); }catch(e){}
      await sendOneFriendInvite({ uid: p.uid, name, avatar: av });
    });
    return row;
  }

  async function sendOneFriendInvite(friend){
    if(!friend || !friend.uid) return;
    try{
      if(typeof isFriend === 'function' && isFriend(friend.uid)){
        setStatus(tt('gchatFriendAccepted','Đã là bạn'));
        return;
      }
      if(!(await ensureOnline())){
        setStatus(tt('gchatNeedOnline','Cần đăng nhập online'));
        return;
      }
      const res = typeof sendFriendRequest === 'function'
        ? await sendFriendRequest(friend)
        : { ok:false };
      if(res && res.ok){
        setStatus(tt('gchatFriendReq','Đã gửi lời mời kết bạn'));
      } else if(res && res.reason === 'cap'){
        setStatus(tt('gchatFriendCapFull','Đã đủ số bạn tối đa'));
      } else if(res && res.reason === 'already'){
        setStatus(tt('gchatFriendAlready','Đã gửi / đã là bạn'));
      } else {
        setStatus(tt('gchatFriendFail','Không gửi được lời mời'));
      }
    }catch(e){
      setStatus(tt('gchatFriendFail','Không gửi được lời mời'));
    }
  }

  async function runFriendsSearch(){
    const input = $('friends-search-input');
    const box = $('friends-search-result');
    if(!input || !box) return;
    const q = String(input.value || '').trim();
    box.innerHTML = '<div class="gchat-empty">…</div>';
    if(q.length < 2){
      box.innerHTML = '<div class="gchat-empty">'+tt('friendsSearchShort','Nhập ít nhất 2 ký tự')+'</div>';
      return;
    }
    if(!(await ensureOnline())){
      box.innerHTML = '<div class="gchat-empty">'+tt('gchatNeedOnline','Cần đăng nhập online')+'</div>';
      return;
    }
    let results = [];
    const looksLikeId = /^CB[A-Z0-9]{6}$/i.test(q) || q.length >= 12;
    try{
      if(looksLikeId && typeof findPlayerByPublicId === 'function'){
        const one = await findPlayerByPublicId(q);
        if(one) results = [one];
      }
      if(!results.length && typeof searchPlayersByName === 'function'){
        results = await searchPlayersByName(q) || [];
      }
      // Thử ID sau khi name không ra
      if(!results.length && !looksLikeId && typeof findPlayerByPublicId === 'function'){
        const one = await findPlayerByPublicId(q);
        if(one) results = [one];
      }
    }catch(e){}
    box.innerHTML = '';
    if(!results.length){
      box.innerHTML = '<div class="gchat-empty">'+tt('friendsSearchEmpty','Không tìm thấy')+'</div>';
      return;
    }
    results.forEach(p=>{
      if(!p || !p.uid) return;
      if(typeof getOnlineUid === 'function' && p.uid === getOnlineUid()) return;
      box.appendChild(_friendResultRow(p, { check:false }));
    });
  }

  async function loadFriendsSuggestions(force){
    const list = $('friends-suggest-list');
    if(!list) return;
    if(!force && _friendSuggestCache.length){
      renderFriendsSuggestions(_friendSuggestCache);
      return;
    }
    list.innerHTML = '<div class="gchat-empty">…</div>';
    if(!(await ensureOnline())){
      list.innerHTML = '<div class="gchat-empty">'+tt('gchatNeedOnline','Cần đăng nhập online')+'</div>';
      return;
    }
    let rows = [];
    try{
      if(typeof fetchRandomPlayers === 'function') rows = await fetchRandomPlayers(20) || [];
    }catch(e){}
    _friendSuggestCache = rows;
    renderFriendsSuggestions(rows);
  }

  function renderFriendsSuggestions(rows){
    const list = $('friends-suggest-list');
    if(!list) return;
    list.innerHTML = '';
    if(!rows || !rows.length){
      list.innerHTML = '<div class="gchat-empty">'+tt('friendsSuggestEmpty','Chưa có gợi ý')+'</div>';
      return;
    }
    rows.forEach(p=>{
      if(!p || !p.uid) return;
      list.appendChild(_friendResultRow(p, { check:true, checked:true }));
    });
  }

  async function inviteSelectedSuggestions(){
    const list = $('friends-suggest-list');
    if(!list) return;
    const boxes = list.querySelectorAll('input[type="checkbox"][data-uid]:checked');
    if(!boxes.length){
      setStatus(tt('friendsPickSome','Chọn ít nhất 1 người'));
      return;
    }
    if(!(await ensureOnline())){
      setStatus(tt('gchatNeedOnline','Cần đăng nhập online'));
      return;
    }
    let sent = 0, fail = 0;
    for(const box of boxes){
      const uid = box.getAttribute('data-uid');
      const row = _friendSuggestCache.find(x=>x && x.uid === uid) || { uid, displayName:'Player', avatar:'🐶' };
      try{
        const res = typeof sendFriendRequest === 'function'
          ? await sendFriendRequest({ uid, name: row.displayName || row.name || 'Player', avatar: row.avatar || '🐶' })
          : { ok:false };
        if(res && res.ok) sent++;
        else fail++;
      }catch(e){ fail++; }
    }
    setStatus(tt('friendsInviteDone','Đã gửi {0} lời mời').replace('{0}', String(sent)) +
      (fail ? (' · '+fail+' lỗi') : ''));
    renderFriendsPanelList();
  }

  window.openFriendsPanel = openFriendsPanel;
  window.closeFriendsPanel = closeFriendsPanel;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGlobalChat);
  else initGlobalChat();
})();
