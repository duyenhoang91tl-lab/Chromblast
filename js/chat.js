// ═══════════════════════════════════════════════════════════════
// js/chat.js — Chat thế giới · bạn bè · trong trận (Caro/Versus)
// Nạp SAU online-services.js + player-profile.js
// ═══════════════════════════════════════════════════════════════

(function(){
  const state = {
    tab: 'world',          // world | friends | game
    friendUid: null,
    friendName: '',
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
    // Chỉ gắn listener 1 lần khi mở tab; clear log khi mở lần đầu trong phiên panel
    listenWorldChat(msg => appendMsg($('gchat-world-log'), msg, 'world'));
  }

  function renderFriendsList(){
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
    friends.forEach(f=>{
      if(!f || !f.uid) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gchat-friend'+(state.friendUid===f.uid?' active':'');
      btn.innerHTML = '<span class="gchat-friend-av">'+(f.avatar||'🐶')+'</span><span class="gchat-friend-name">'+escapeHtml(f.name||'Player')+'</span>';
      btn.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        openFriendThread(f);
      });
      list.appendChild(btn);
    });
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  async function openFriendThread(friend){
    state.friendUid = friend.uid;
    state.friendName = friend.name || 'Player';
    renderFriendsList();
    const thread = $('gchat-friends-thread');
    const title = $('gchat-friend-title');
    if(title) title.textContent = (friend.avatar||'🐶')+' '+(friend.name||'Player');
    if(thread) thread.hidden = false;
    clearLog('gchat-friends-log', 'friends');
    if(!(await ensureOnline())) return;
    if(typeof listenFriendChat !== 'function') return;
    listenFriendChat(friend.uid, msg => appendMsg($('gchat-friends-log'), msg, 'friends'));
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
    // Giữ room chat (Caro overlay vẫn cần)
  }

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
  }

  window.openChatPanel = openChatPanel;
  window.closeChatPanel = closeChatPanel;
  window.initGlobalChat = initGlobalChat;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGlobalChat);
  else initGlobalChat();
})();
