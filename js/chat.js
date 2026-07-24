// ═══════════════════════════════════════════════════════════════
// js/chat.js — Chat thế giới · bạn bè · trong trận (+ presence / mời phòng)
// Nạp SAU online-services.js + player-profile.js
// ═══════════════════════════════════════════════════════════════

(function(){
  const state = {
    tab: 'world',
    friendUid: null,
    friendName: '',
    friendAvatar: '🐶',
    friendOnline: false,
    presence: {},
    seen: { world: new Set(), friends: new Set(), game: new Set() },
    roomCb: null,
    ready: false
  };

  function $(id){ return document.getElementById(id); }

  function tt(key, fallback){
    try{ if(typeof t === 'function'){ const v = t(key); if(v && v !== key) return v; } }catch(e){}
    return fallback || key;
  }

  function isMine(msg){
    try{
      return !!(msg && msg.uid && typeof getOnlineUid === 'function' && msg.uid === getOnlineUid());
    }catch(e){ return false; }
  }

  function appendMsg(logEl, msg, bucket){
    if(!logEl || !msg || !msg.id) return;
    const set = state.seen[bucket];
    if(set && set.has(msg.id)) return;
    if(set) set.add(msg.id);
    const row = document.createElement('div');
    row.className = 'gchat-row'+(isMine(msg)?' mine':'');
    const who = document.createElement('span');
    who.className = 'gchat-who';
    who.textContent = (msg.avatar || '🐶')+' '+(msg.name || 'Player');
    const body = document.createElement('span');
    body.className = 'gchat-text';
    body.textContent = msg.text || '';
    row.appendChild(who);
    row.appendChild(body);
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clearLog(id, bucket){
    const el = $(id);
    if(el) el.innerHTML = '';
    if(bucket && state.seen[bucket]) state.seen[bucket].clear();
  }

  function setStatus(text, isErr){
    const el = $('gchat-status');
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
    if(!list) return;
    list.innerHTML = '';
    if(state.friendUid){
      list.hidden = true;
      return;
    }
    list.hidden = false;
    const friends = (typeof getFriendsList === 'function') ? getFriendsList() : [];
    if(!friends.length){
      list.innerHTML = '<div class="gchat-empty">'+tt('gchatNoFriends','Chưa có bạn — kết bạn từ hồ sơ đối thủ Caro')+'</div>';
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

  async function inviteFriend(gameType){
    if(!state.friendUid){
      setStatus(tt('gchatPickFriend','Chọn một người bạn'), true);
      return;
    }
    if(!(await ensureOnline())) return;
    setStatus(tt('gchatInviting','Đang gửi lời mời...'));
    try{
      if(typeof closeChatPanel === 'function') closeChatPanel();
      await inviteFriendToRoom(state.friendUid, gameType);
      setStatus(tt('gchatInviteSent','Đã gửi lời mời'));
      try{ showAchievementToast({ label: tt('gchatInviteSent','Đã gửi lời mời'), desc: state.friendName }); }catch(e){}
    }catch(err){
      console.warn('[invite]', err);
      setStatus(tt('gchatInviteFail','Không mời được'), true);
    }
  }

  async function startGameChat(){
    const roomId = currentRoomId();
    const note = $('gchat-game-note');
    const form = $('gchat-game-form');
    if(!roomId){
      if(note) note.textContent = tt('gchatNoMatch','Chưa trong trận online (Caro / Versus)');
      if(form) form.style.display = 'none';
      clearLog('gchat-game-log', 'game');
      if(state.roomCb && typeof unlistenRoomChat === 'function'){
        unlistenRoomChat(state.roomCb);
        state.roomCb = null;
      }
      return;
    }
    if(note) note.textContent = tt('gchatInMatch','Đang chat trong trận');
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

  function openChatPanel(tab){
    const panel = $('gchat-panel');
    if(!panel) return;
    panel.classList.add('show');
    showTab(tab || state.tab || 'world');
    try{ if(typeof applyI18nDom === 'function') applyI18nDom(); }catch(e){}
  }

  function closeChatPanel(){
    const panel = $('gchat-panel');
    if(panel) panel.classList.remove('show');
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
      if(typeof openCaroHub === 'function') openCaroHub();
      if(typeof caroJoinRoomById === 'function') await caroJoinRoomById(invite.roomId);
    }
  }

  window.onRoomInviteReceived = function(invite){
    showInviteToast(invite);
  };

  function initGlobalChat(){
    if(state.ready) return;
    state.ready = true;
    $('chat-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      openChatPanel('world');
    });
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
  }

  window.openChatPanel = openChatPanel;
  window.closeChatPanel = closeChatPanel;
  window.initGlobalChat = initGlobalChat;
  window.showInviteToast = showInviteToast;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGlobalChat);
  else initGlobalChat();
})();
