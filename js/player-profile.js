// ═══════════════════════════════════════════════════════════════
// js/player-profile.js — Nickname + style (màu / đậm / nghiêng / font)
// Đổi tên lần 1 miễn phí; các lần sau + đổi style cần xem QC.
// Nạp SAU save.js + leaderboard.js, TRƯỚC ui.js / auth.js.
// ═══════════════════════════════════════════════════════════════

const PLAYER_PROFILE_KEY = 'chromablast_player_profile';
const NICK_MAX_LEN = 24;
const NICK_MIN_LEN = 1;

/** ~10 font đặc biệt cho nickname (local woff2 trong nick-fonts.css) */
const NICK_FONTS = [
  { id: 'nunito',    family: "'Nunito', system-ui, sans-serif", label: 'Nunito' },
  { id: 'pacifico',  family: "'Pacifico', cursive",            label: 'Pacifico' },
  { id: 'lobster',   family: "'Lobster', cursive",             label: 'Lobster' },
  { id: 'comfortaa', family: "'Comfortaa', sans-serif",        label: 'Comfortaa' },
  { id: 'fredoka',   family: "'Fredoka', sans-serif",          label: 'Fredoka' },
  { id: 'caveat',    family: "'Caveat', cursive",              label: 'Caveat' },
  { id: 'dancing',   family: "'Dancing Script', cursive",      label: 'Dancing' },
  { id: 'quicksand', family: "'Quicksand', sans-serif",        label: 'Quicksand' },
  { id: 'josefin',   family: "'Josefin Sans', sans-serif",     label: 'Josefin' },
  { id: 'bvietnam',  family: "'Be Vietnam Pro', sans-serif",   label: 'Be Vietnam' },
  { id: 'righteous', family: "'Righteous', cursive",           label: 'Righteous' },
];

function _ppFontById(id){
  return NICK_FONTS.find(f => f.id === id) || NICK_FONTS[0];
}

/** Avatar thú trong game (emoji) */
const PLAYER_AVATARS = ['🐶','🐱','🐰','🐢','🦫','🦔','🐍','🐕','🐝','🐔','🐿️','🦎'];
const FRIENDS_KEY = 'chromablast_friends';

function _ppDefault(){
  return {
    nick: '',
    color: '#ffffff',
    bold: false,
    italic: false,
    fontId: 'nunito',
    avatar: '🐶',
    customAvatar: '',
    bubbleStyle: 'classic',
    unlockedFx: [],
    unlockedBubbles: ['classic'],
    renameCount: 0,
    styleUnlocked: false
  };
}

function getPlayerAvatar(){
  const p = getPlayerProfile();
  const a = p.avatar || '🐶';
  return PLAYER_AVATARS.includes(a) ? a : '🐶';
}

/** Avatar hiện thị local (ưu tiên ảnh up); mạng vẫn dùng emoji getPlayerAvatar() */
function getPlayerAvatarDisplay(){
  const p = getPlayerProfile();
  if(p.customAvatar && String(p.customAvatar).startsWith('data:image')) return p.customAvatar;
  return getPlayerAvatar();
}

function isCustomPlayerAvatar(av){
  return !!(av && String(av).startsWith('data:image'));
}

function applyAvatarElement(el, avatar){
  if(!el) return;
  const av = avatar != null ? avatar : getPlayerAvatarDisplay();
  if(isCustomPlayerAvatar(av)){
    el.textContent = '';
    el.style.backgroundImage = 'url('+av+')';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.classList.add('avatar-img');
  } else {
    el.style.backgroundImage = '';
    el.textContent = av || '🐶';
    el.classList.remove('avatar-img');
  }
}

function getFriendsList(){
  try{
    const raw = (typeof safeGet === 'function' ? safeGet(FRIENDS_KEY) : null) || localStorage.getItem(FRIENDS_KEY);
    const j = raw ? JSON.parse(raw) : [];
    return Array.isArray(j) ? j : [];
  }catch(e){ return []; }
}

function isFriend(uid){
  if(!uid) return false;
  return getFriendsList().some(f => f && f.uid === uid);
}

function addFriendLocal(friend){
  if(!friend || !friend.uid) return { ok:false, reason:'need_id' };
  const list = getFriendsList().filter(f => f && f.uid !== friend.uid);
  if(isFriend(friend.uid)) return { ok:true, already:true, list:getFriendsList() };
  list.unshift({
    uid: friend.uid,
    name: String(friend.name || 'Player').slice(0, 32),
    avatar: friend.avatar || '🐶',
    at: Date.now()
  });
  try{
    const s = JSON.stringify(list.slice(0, 80));
    if(typeof safeSet === 'function') safeSet(FRIENDS_KEY, s);
    else localStorage.setItem(FRIENDS_KEY, s);
  }catch(e){}
  return { ok:true, already:false, list };
}

function getPlayerProfile(){
  let p = _ppDefault();
  try{
    const raw = (typeof safeGet === 'function' ? safeGet(PLAYER_PROFILE_KEY) : null) || localStorage.getItem(PLAYER_PROFILE_KEY);
    if(raw){
      const j = JSON.parse(raw);
      if(j && typeof j === 'object'){
        if(typeof j.nick === 'string') p.nick = j.nick.slice(0, NICK_MAX_LEN);
        if(typeof j.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(j.color)) p.color = j.color;
        p.bold = !!j.bold;
        p.italic = !!j.italic;
        if(typeof j.fontId === 'string' && _ppFontById(j.fontId).id === j.fontId) p.fontId = j.fontId;
        else if(j.fontId) p.fontId = 'nunito';
        if(typeof j.avatar === 'string' && PLAYER_AVATARS.includes(j.avatar)) p.avatar = j.avatar;
        if(typeof j.customAvatar === 'string' && j.customAvatar.startsWith('data:image') && j.customAvatar.length < 220000){
          p.customAvatar = j.customAvatar;
        }
        if(typeof j.bubbleStyle === 'string') p.bubbleStyle = j.bubbleStyle;
        if(Array.isArray(j.unlockedFx)) p.unlockedFx = j.unlockedFx.filter(x=>typeof x==='string').slice(0, 40);
        if(Array.isArray(j.unlockedBubbles)) p.unlockedBubbles = j.unlockedBubbles.filter(x=>typeof x==='string').slice(0, 20);
        if(!p.unlockedBubbles || !p.unlockedBubbles.length) p.unlockedBubbles = ['classic'];
        p.renameCount = Math.max(0, Number(j.renameCount) || 0);
        p.styleUnlocked = !!j.styleUnlocked;
      }
    }
  }catch(e){}
  if(!p.nick){
    try{
      const g = typeof safeGet === 'function' ? safeGet('chromablast_guest_name') : null;
      if(g) p.nick = String(g).slice(0, NICK_MAX_LEN);
    }catch(e){}
  }
  return p;
}

function savePlayerProfile(patch){
  const p = Object.assign(getPlayerProfile(), patch || {});
  p.nick = String(p.nick || '').slice(0, NICK_MAX_LEN);
  if(!/^#[0-9A-Fa-f]{6}$/.test(p.color)) p.color = '#ffffff';
  if(!_ppFontById(p.fontId) || _ppFontById(p.fontId).id !== p.fontId) p.fontId = 'nunito';
  if(!PLAYER_AVATARS.includes(p.avatar)) p.avatar = '🐶';
  if(p.customAvatar && !(typeof p.customAvatar === 'string' && p.customAvatar.startsWith('data:image') && p.customAvatar.length < 220000)){
    p.customAvatar = '';
  }
  if(!Array.isArray(p.unlockedFx)) p.unlockedFx = [];
  if(!Array.isArray(p.unlockedBubbles) || !p.unlockedBubbles.length) p.unlockedBubbles = ['classic'];
  if(!p.bubbleStyle) p.bubbleStyle = 'classic';
  if(p.unlockedBubbles.indexOf(p.bubbleStyle) < 0) p.bubbleStyle = 'classic';
  try{
    const s = JSON.stringify(p);
    if(typeof safeSet === 'function') safeSet(PLAYER_PROFILE_KEY, s);
    else localStorage.setItem(PLAYER_PROFILE_KEY, s);
  }catch(e){}
  try{ if(p.nick) safeSet('chromablast_guest_name', p.nick); }catch(e){}
  _ppSyncOnlineName(p.nick);
  _ppRefreshUI();
  return p;
}

function _ppSyncOnlineName(nick){
  if(!nick) return;
  try{
    if(typeof _onlineDisplayName !== 'undefined') _onlineDisplayName = nick;
  }catch(e){}
  try{
    if(typeof _upsertPlayerProfile === 'function') _upsertPlayerProfile();
  }catch(e){}
}

function getPlayerNickname(){
  const p = getPlayerProfile();
  if(p.nick) return p.nick;
  if(typeof currentUser !== 'undefined' && currentUser && currentUser.username) return currentUser.username;
  return (typeof _localPlayerName === 'function' ? _localPlayerName() : 'Player');
}

function formatPlayerNameHtml(name, style){
  const st = style || getPlayerNameStyle();
  const n = (typeof escapeHtml === 'function' ? escapeHtml(name) : String(name||''));
  const fam = _ppFontById(st.fontId).family;
  const av = (st.avatar && PLAYER_AVATARS.includes(st.avatar)) ? st.avatar : getPlayerAvatar();
  const css = [
    'color:'+(st.color||'#ffffff'),
    'font-weight:'+(st.bold ? '900' : '700'),
    st.italic ? 'font-style:italic' : 'font-style:normal',
    'font-family:'+fam
  ].join(';');
  return '<span class="player-nick-wrap"><span class="player-avatar" aria-hidden="true">'+av+'</span><span class="player-nick" style="'+css+'">'+n+'</span></span>';
}

function getPlayerNameStyle(){
  const p = getPlayerProfile();
  return {
    color: p.color || '#ffffff',
    bold: !!p.bold,
    italic: !!p.italic,
    fontId: p.fontId || 'nunito',
    avatar: getPlayerAvatar()
  };
}

function canRenameFree(){
  return getPlayerProfile().renameCount < 1;
}

function _ppWatchAd(onOk, onFail){
  const fail = ()=>{ if(typeof onFail === 'function') onFail(); };
  const ok = ()=>{ if(typeof onOk === 'function') onOk(); };
  if(typeof showRewardedAd === 'function'){
    showRewardedAd(ok, ()=>{
      try{
        if(typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()){
          setTimeout(ok, 500);
          return;
        }
      }catch(e){}
      fail();
    });
  } else {
    setTimeout(ok, 500);
  }
}

function applyNicknameChange(newNick, opts){
  opts = opts || {};
  const nick = String(newNick || '').trim().slice(0, NICK_MAX_LEN);
  if(nick.length < NICK_MIN_LEN) return Promise.reject(new Error('nick_short'));
  const cur = getPlayerProfile();
  if(nick === cur.nick) return Promise.resolve(cur);

  const doSave = ()=>{
    const next = savePlayerProfile({ nick, renameCount: (cur.renameCount || 0) + 1 });
    return next;
  };

  if(canRenameFree() || opts.forceFree){
    return Promise.resolve(doSave());
  }
  return new Promise((resolve, reject)=>{
    _ppWatchAd(()=> resolve(doSave()), ()=> reject(new Error('ad_failed')));
  });
}

function applyNameStyleChange(patch){
  const cur = getPlayerProfile();
  const nextStyle = {
    color: patch.color != null ? patch.color : cur.color,
    bold: patch.bold != null ? !!patch.bold : cur.bold,
    italic: patch.italic != null ? !!patch.italic : cur.italic,
    fontId: patch.fontId != null ? patch.fontId : (cur.fontId || 'nunito')
  };
  if(!_ppFontById(nextStyle.fontId) || _ppFontById(nextStyle.fontId).id !== nextStyle.fontId){
    nextStyle.fontId = 'nunito';
  }
  const changed =
    nextStyle.color !== cur.color ||
    nextStyle.bold !== cur.bold ||
    nextStyle.italic !== cur.italic ||
    nextStyle.fontId !== (cur.fontId || 'nunito');
  if(!changed) return Promise.resolve(cur);

  const doSave = ()=> savePlayerProfile(Object.assign({}, nextStyle, { styleUnlocked: true }));

  return new Promise((resolve, reject)=>{
    _ppWatchAd(()=> resolve(doSave()), ()=> reject(new Error('ad_failed')));
  });
}

function getPlayerInfoStats(){
  const level = (typeof playerLevel !== 'undefined') ? playerLevel : 1;
  let maps = 0;
  try{
    if(typeof clearedHiddenMaps !== 'undefined' && clearedHiddenMaps && typeof clearedHiddenMaps.size === 'number'){
      maps = clearedHiddenMaps.size;
    } else if(typeof getSavedClearedMaps === 'function'){
      maps = (getSavedClearedMaps() || []).length;
    }
  }catch(e){}
  let caro = { wins:0, losses:0, draws:0, points:0, total:0, winRate:0, rank:null };
  try{
    if(typeof getLocalCaroStats === 'function') caro = getLocalCaroStats();
  }catch(e){}
  return { level, maps, caro, nick: getPlayerNickname(), style: getPlayerNameStyle() };
}

function _ppSelectedFontId(){
  const active = document.querySelector('#pp-font-list .pp-font-btn.active');
  return (active && active.dataset.fontId) || getPlayerProfile().fontId || 'nunito';
}

function _ppLiveStyle(){
  return {
    color: document.getElementById('pp-color-input')?.value || '#ffffff',
    bold: !!document.getElementById('pp-bold')?.classList.contains('active'),
    italic: !!document.getElementById('pp-italic')?.classList.contains('active'),
    fontId: _ppSelectedFontId()
  };
}

function _ppUpdatePreview(){
  const preview = document.getElementById('pp-nick-preview');
  if(!preview) return;
  const nick = (document.getElementById('pp-nick-input')?.value || getPlayerNickname()).trim();
  preview.innerHTML = formatPlayerNameHtml(nick || '—', _ppLiveStyle());
}

function renderNickFontList(selectedId){
  const box = document.getElementById('pp-font-list');
  if(!box) return;
  const sel = selectedId || getPlayerProfile().fontId || 'nunito';
  const sample = (document.getElementById('pp-nick-input')?.value || getPlayerNickname() || 'Aa').trim().slice(0, 10) || 'Aa';
  box.innerHTML = NICK_FONTS.map(f => {
    const active = f.id === sel ? ' active' : '';
    return '<button type="button" class="pp-font-btn'+active+'" data-font-id="'+f.id+'" style="font-family:'+f.family+'" title="'+f.label+'">'+
      '<span class="pp-font-name">'+f.label+'</span>'+
      '<span class="pp-font-sample">'+ (typeof escapeHtml==='function'?escapeHtml(sample):sample) +'</span>'+
      '</button>';
  }).join('');
  box.querySelectorAll('.pp-font-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      try{sfxClick();}catch(e){}
      box.querySelectorAll('.pp-font-btn').forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      _ppUpdatePreview();
    });
  });
}

function renderAvatarPicker(selected){
  const box = document.getElementById('pp-avatar-list');
  if(!box) return;
  const sel = (selected && PLAYER_AVATARS.includes(selected)) ? selected : getPlayerAvatar();
  box.innerHTML = PLAYER_AVATARS.map(a =>
    '<button type="button" class="pp-avatar-btn'+(a===sel?' active':'')+'" data-avatar="'+a+'" aria-label="avatar">'+a+'</button>'
  ).join('');
  box.querySelectorAll('.pp-avatar-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      try{sfxClick();}catch(e){}
      const av = btn.dataset.avatar;
      savePlayerProfile({ avatar: av });
      box.querySelectorAll('.pp-avatar-btn').forEach(b=> b.classList.toggle('active', b.dataset.avatar===av));
      _ppUpdatePreview();
    });
  });
}

function _ppRefreshUI(){
  const nick = getPlayerNickname();
  const style = getPlayerNameStyle();
  const box = document.getElementById('account-username-box');
  if(box) box.innerHTML = formatPlayerNameHtml(nick, style);
  const preview = document.getElementById('pp-nick-preview');
  if(preview) preview.innerHTML = formatPlayerNameHtml(nick, style);
  const hubNick = document.getElementById('settings-player-nick');
  if(hubNick) hubNick.innerHTML = formatPlayerNameHtml(nick, style);
  renderSettingsPlayerInfo();
}

function renderSettingsPlayerInfo(){
  const box = document.getElementById('settings-player-info');
  if(!box) return;
  const info = getPlayerInfoStats();
  const caro = info.caro || {};
  const rankName = (caro.rank && caro.rank.name) ? caro.rank.name : '';
  const rankIcon = (caro.rank && caro.rank.icon) ? caro.rank.icon + ' ' : '';
  box.innerHTML =
    '<div class="pp-info-row">'+formatPlayerNameHtml(info.nick, info.style)+'</div>'+
    '<div class="pp-info-grid">'+
      '<div class="pp-stat"><small>'+(typeof t==='function'?t('ppLevel'):'Cấp')+'</small><b>Lv.'+info.level+'</b></div>'+
      '<div class="pp-stat"><small>'+(typeof t==='function'?t('ppMaps'):'Map đã qua')+'</small><b>'+info.maps+'</b></div>'+
      '<div class="pp-stat"><small>'+(typeof t==='function'?t('ppCaro'):'Caro')+'</small><b>'+rankIcon+(caro.points||0)+'đ</b></div>'+
    '</div>'+
    '<div class="pp-caro-line">'+(typeof t==='function'?t('ppCaroWLD', caro.wins||0, caro.losses||0, caro.draws||0, caro.winRate||0):((caro.wins||0)+'T/'+(caro.losses||0)+'H/'+(caro.draws||0)+'Hòa · '+(caro.winRate||0)+'%'))+(rankName?' · '+rankName:'')+'</div>';
}

function openPlayerProfilePanel(){
  try{ sfxClick(); }catch(e){}
  const p = getPlayerProfile();
  const nickIn = document.getElementById('pp-nick-input');
  const colorIn = document.getElementById('pp-color-input');
  if(nickIn) nickIn.value = p.nick || getPlayerNickname();
  if(colorIn) colorIn.value = p.color || '#ffffff';
  document.getElementById('pp-bold')?.classList.toggle('active', !!p.bold);
  document.getElementById('pp-italic')?.classList.toggle('active', !!p.italic);
  renderAvatarPicker(p.avatar || getPlayerAvatar());
  renderNickFontList(p.fontId || 'nunito');
  const hint = document.getElementById('pp-rename-hint');
  if(hint){
    hint.textContent = canRenameFree()
      ? (typeof t==='function'?t('ppRenameFree'):'Đổi tên lần 1 miễn phí')
      : (typeof t==='function'?t('ppRenameAd'):'Đổi tên tiếp theo: xem quảng cáo');
  }
  const msg = document.getElementById('pp-msg');
  if(msg){ msg.textContent=''; msg.className='account-msg'; }
  _ppRefreshUI();
  _ppUpdatePreview();
  try{ if(typeof closeAllSettingsOverlays==='function') closeAllSettingsOverlays(); }catch(e){}
  document.getElementById('player-profile-panel')?.classList.add('show');
}

function closePlayerProfilePanel(){
  document.getElementById('player-profile-panel')?.classList.remove('show');
}

function initPlayerProfileUI(){
  const saveNick = document.getElementById('pp-save-nick');
  const saveStyle = document.getElementById('pp-save-style');
  const closeBtn = document.getElementById('pp-close-btn');
  const bold = document.getElementById('pp-bold');
  const italic = document.getElementById('pp-italic');
  const colorIn = document.getElementById('pp-color-input');

  closeBtn?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} closePlayerProfilePanel(); });

  [bold, italic].forEach(btn=>{
    btn?.addEventListener('click', ()=>{
      try{sfxClick();}catch(e){}
      btn.classList.toggle('active');
      _ppUpdatePreview();
    });
  });

  colorIn?.addEventListener('input', _ppUpdatePreview);

  document.getElementById('pp-nick-input')?.addEventListener('input', ()=>{
    renderNickFontList(_ppSelectedFontId());
    _ppUpdatePreview();
  });

  saveNick?.addEventListener('click', async ()=>{
    try{sfxClick();}catch(e){}
    const msg = document.getElementById('pp-msg');
    const val = document.getElementById('pp-nick-input')?.value || '';
    try{
      await applyNicknameChange(val);
      if(msg){ msg.textContent = typeof t==='function'?t('ppSaved'):'Đã lưu'; msg.className='account-msg ok'; }
      const hint = document.getElementById('pp-rename-hint');
      if(hint) hint.textContent = typeof t==='function'?t('ppRenameAd'):'Đổi tên tiếp theo: xem quảng cáo';
    }catch(err){
      const m = err && err.message;
      if(msg){
        msg.className = 'account-msg err';
        msg.textContent = m==='nick_short' ? (typeof t==='function'?t('ppNickShort'):'Nhập nickname')
          : m==='ad_failed' ? (typeof t==='function'?t('ppAdFail'):'Quảng cáo chưa sẵn sàng')
          : (m || 'Error');
      }
    }
  });

  saveStyle?.addEventListener('click', async ()=>{
    try{sfxClick();}catch(e){}
    const msg = document.getElementById('pp-msg');
    try{
      await applyNameStyleChange(_ppLiveStyle());
      if(msg){ msg.textContent = typeof t==='function'?t('ppStyleSaved'):'Đã áp dụng kiểu chữ (đã xem QC)'; msg.className='account-msg ok'; }
    }catch(err){
      if(msg){
        msg.className = 'account-msg err';
        msg.textContent = (err && err.message)==='ad_failed'
          ? (typeof t==='function'?t('ppAdFail'):'Quảng cáo chưa sẵn sàng')
          : ((err && err.message) || 'Error');
      }
    }
  });

  document.getElementById('settings-player-edit')?.addEventListener('click', openPlayerProfilePanel);
  document.getElementById('account-edit-profile')?.addEventListener('click', openPlayerProfilePanel);

  const p = getPlayerProfile();
  if(!p.nick){
    const n = getPlayerNickname();
    if(n) savePlayerProfile({ nick: n });
  } else {
    _ppRefreshUI();
  }
}

(function _ppPatchLocalName(){
  const prev = typeof _localPlayerName === 'function' ? _localPlayerName : null;
  window._localPlayerName = function(){
    try{
      const p = getPlayerProfile();
      if(p && p.nick) return p.nick;
    }catch(e){}
    if(prev) return prev();
    return 'Player';
  };
})();

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', ()=>{ try{ initPlayerProfileUI(); }catch(e){ console.warn('[profile]', e); } });
} else {
  try{ initPlayerProfileUI(); }catch(e){ console.warn('[profile]', e); }
}
