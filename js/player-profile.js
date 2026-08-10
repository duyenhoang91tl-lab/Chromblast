// ═══════════════════════════════════════════════════════════════
// js/player-profile.js — Nickname + style (màu / đậm / nghiêng / font)
// Đổi tên lần 1 miễn phí; các lần sau + đổi style cần xem QC.
// Nạp SAU save.js + leaderboard.js, TRƯỚC ui.js / auth.js.
// ═══════════════════════════════════════════════════════════════

const PLAYER_PROFILE_KEY = 'chromablast_player_profile';
const NICK_MAX_LEN = 24;
const NICK_MIN_LEN = 1;

/** Quyền riêng tư hồ sơ: mục nào được phép ẩn với đối thủ khi họ bấm xem hồ sơ.
 *  Tên, Level và Tình trạng kết đôi KHÔNG có ở đây vì luôn bắt buộc hiển thị. */
const PROFILE_VIS_KEY = 'chromablast_profile_visibility';
function _profileVisDefault(){
  return { maps: true, caroRank: true, versusRank: true };
}
function getProfileVisibility(){
  try{
    const raw = safeGet(PROFILE_VIS_KEY);
    if(!raw) return _profileVisDefault();
    return Object.assign(_profileVisDefault(), JSON.parse(raw) || {});
  }catch(e){ return _profileVisDefault(); }
}
function setProfileVisibility(patch){
  const next = Object.assign(getProfileVisibility(), patch || {});
  try{ safeSet(PROFILE_VIS_KEY, JSON.stringify(next)); }catch(e){}
  return next;
}
function _ppSetVisToggle(id, on){
  const btn = document.getElementById(id);
  if(!btn) return;
  btn.classList.toggle('active', !!on);
  btn.textContent = on
    ? (typeof t==='function'?t('ppVisOn'):'Bật')
    : (typeof t==='function'?t('ppVisOff'):'Tắt');
}

/** ~10 font đặc biệt cho nickname (local woff2 trong css/nick-fonts.css) */
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
const FRIEND_REQ_OUT_KEY = 'chromablast_friend_req_out';

/** Lv < 10: 20 bạn; mỗi +10 level → +20 slot */
function maxFriendsForLevel(level){
  const lv = Math.max(1, Number(level) || (typeof playerLevel === 'number' ? playerLevel : 1));
  return 20 + Math.floor(lv / 10) * 20;
}
function friendSlotsLeft(){
  const max = maxFriendsForLevel(typeof playerLevel === 'number' ? playerLevel : 1);
  return Math.max(0, max - getFriendsList().length);
}

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
    styleUnlocked: false,
    nameEffect: '',
    ownedNameEffects: [],
    /** Thẻ chướng ngại Versus đã mua mở khoá (xem VS_OBSTACLES/isVsCardUnlocked
     *  trong js/versus.js) — 3 thẻ free không cần liệt kê ở đây. */
    unlockedVsCards: [],
    /** ID công khai ngắn — chỉ hiện trong hồ sơ, dùng để tìm bạn */
    publicId: ''
  };
}

function _ppMakePublicId(){
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'CB';
  for(let i=0;i<6;i++) out += alphabet[Math.floor(Math.random()*alphabet.length)];
  return out;
}

/** Sinh / trả về ID riêng không trùng (local); đồng bộ lên server khi online. */
function ensurePublicPlayerId(){
  const p = getPlayerProfile();
  if(p.publicId && /^CB[A-Z0-9]{6}$/.test(p.publicId)) return p.publicId;
  const id = _ppMakePublicId();
  savePlayerProfile({ publicId: id });
  try{
    if(typeof registerPublicPlayerIdOnline === 'function') registerPublicPlayerIdOnline(id);
  }catch(e){}
  return id;
}

function getPublicPlayerId(){
  return ensurePublicPlayerId();
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
  if(isFriend(friend.uid)) return { ok:true, already:true, list:getFriendsList() };
  const max = maxFriendsForLevel(typeof playerLevel === 'number' ? playerLevel : 1);
  const list = getFriendsList().filter(f => f && f.uid !== friend.uid);
  if(list.length >= max) return { ok:false, reason:'cap', max, list };
  list.unshift({
    uid: friend.uid,
    name: String(friend.name || 'Player').slice(0, 32),
    avatar: friend.avatar || '🐶',
    at: Date.now()
  });
  try{
    const s = JSON.stringify(list.slice(0, max));
    if(typeof safeSet === 'function') safeSet(FRIENDS_KEY, s);
    else localStorage.setItem(FRIENDS_KEY, s);
  }catch(e){}
  return { ok:true, already:false, list, max };
}

function removeFriendLocal(uid){
  if(!uid) return { ok:false };
  const list = getFriendsList().filter(f => f && f.uid !== uid);
  try{
    const s = JSON.stringify(list);
    if(typeof safeSet === 'function') safeSet(FRIENDS_KEY, s);
    else localStorage.setItem(FRIENDS_KEY, s);
  }catch(e){}
  return { ok:true, list };
}

function getOutgoingFriendRequests(){
  try{
    const raw = (typeof safeGet === 'function' ? safeGet(FRIEND_REQ_OUT_KEY) : null) || localStorage.getItem(FRIEND_REQ_OUT_KEY);
    const j = raw ? JSON.parse(raw) : [];
    return Array.isArray(j) ? j : [];
  }catch(e){ return []; }
}
function saveOutgoingFriendRequests(list){
  try{
    const s = JSON.stringify((list||[]).slice(0, 40));
    if(typeof safeSet === 'function') safeSet(FRIEND_REQ_OUT_KEY, s);
    else localStorage.setItem(FRIEND_REQ_OUT_KEY, s);
  }catch(e){}
}
function markOutgoingFriendRequest(friend){
  if(!friend || !friend.uid) return;
  const list = getOutgoingFriendRequests().filter(f => f && f.uid !== friend.uid);
  list.unshift({ uid: friend.uid, name: friend.name||'Player', avatar: friend.avatar||'🐶', at: Date.now() });
  saveOutgoingFriendRequests(list);
}
function clearOutgoingFriendRequest(uid){
  saveOutgoingFriendRequests(getOutgoingFriendRequests().filter(f => f && f.uid !== uid));
}
function hasOutgoingFriendRequest(uid){
  return !!uid && getOutgoingFriendRequests().some(f => f && f.uid === uid);
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
        if(typeof j.bubbleStyle === 'string') p.bubbleStyle = j.bubbleStyle === 'candy' ? 'sweet' : j.bubbleStyle;
        if(Array.isArray(j.unlockedFx)) p.unlockedFx = j.unlockedFx.filter(x=>typeof x==='string').slice(0, 40);
        if(Array.isArray(j.unlockedBubbles)) p.unlockedBubbles = j.unlockedBubbles.map(x=>x==='candy'?'sweet':x).filter(x=>typeof x==='string').slice(0, 20);
        if(!p.unlockedBubbles || !p.unlockedBubbles.length) p.unlockedBubbles = ['classic'];
        p.renameCount = Math.max(0, Number(j.renameCount) || 0);
        p.styleUnlocked = !!j.styleUnlocked;
        if(typeof j.nameEffect === 'string' && (!j.nameEffect || (typeof NAME_EFFECTS!=='undefined' && NAME_EFFECTS.some(e=>e.id===j.nameEffect)))) p.nameEffect = j.nameEffect;
        if(Array.isArray(j.ownedNameEffects)) p.ownedNameEffects = j.ownedNameEffects.filter(x=>typeof x==='string').slice(0, 20);
        if(Array.isArray(j.unlockedVsCards)) p.unlockedVsCards = j.unlockedVsCards.filter(x=>typeof x==='string').slice(0, 40);
        if(typeof j.publicId === 'string' && /^CB[A-Z0-9]{6}$/.test(j.publicId)) p.publicId = j.publicId;
      }
    }
  }catch(e){}
  if(!p.nick){
    try{
      const g = typeof safeGet === 'function' ? safeGet('chromablast_guest_name') : null;
      if(g) p.nick = String(g).slice(0, NICK_MAX_LEN);
    }catch(e){}
  }
  if(!p.publicId){
    p.publicId = _ppMakePublicId();
    try{
      const s = JSON.stringify(p);
      if(typeof safeSet === 'function') safeSet(PLAYER_PROFILE_KEY, s);
      else localStorage.setItem(PLAYER_PROFILE_KEY, s);
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
  try{ if(typeof refreshArcadeHud==='function') refreshArcadeHud(); }catch(e){}
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

/** Chỉ trả về span tên đã áp màu/đậm/nghiêng/font (không kèm avatar) — dùng ở
 * những nơi tên đứng riêng (HUD, chat...), khác với formatPlayerNameHtml (có avatar). */
/** Hiệu ứng tên mua trong Shop (xem name-effects.js) — 'wave' cần bọc riêng
 * từng ký tự để so le animation-delay, các hiệu ứng khác chỉ cần 1 class CSS
 * (.name-fx-<id>) áp lên cả span tên, không cần đụng vào cấu trúc HTML. */
function _ppNameEffectClass(effectId){
  return effectId ? ' name-fx-'+effectId : '';
}
function _ppNameEffectInner(rawName, escapedName, effectId){
  if(effectId !== 'wave') return escapedName;
  return Array.from(String(rawName||'')).map(function(ch, i){
    const escCh = (typeof escapeHtml==='function') ? escapeHtml(ch) : ch;
    return '<span class="name-fx-letter" style="animation-delay:'+(i*0.08).toFixed(2)+'s">'+(ch===' '?'&nbsp;':escCh)+'</span>';
  }).join('');
}

/** 3 hiệu ứng dùng kỹ thuật gradient quét chữ (background-clip:text +
 * color:transparent, xem CSS .name-fx-goldsweep/runlight/platinum) — tự có
 * tông màu riêng, không thể chồng thêm màu tự chọn (giống cách rank-fx bậc
 * cao vẫn làm), nên bỏ hẳn khai báo color inline cho các hiệu ứng này. */
const PP_NAME_FX_GRADIENT = ['goldsweep','runlight','platinum'];

function formatPlayerNameStyledHtml(name, style){
  const st = style || getPlayerNameStyle();
  const n = (typeof escapeHtml === 'function' ? escapeHtml(name) : String(name||''));
  const fam = _ppFontById(st.fontId).family;
  const isGrad = PP_NAME_FX_GRADIENT.indexOf(st.effect) >= 0;
  const css = [];
  if(!isGrad) css.push('color:'+(st.color||'#ffffff'));
  css.push('font-weight:'+(st.bold ? '900' : '700'));
  css.push(st.italic ? 'font-style:italic' : 'font-style:normal');
  css.push('font-family:'+fam);
  return '<span class="player-nick'+_ppNameEffectClass(st.effect)+'" style="'+css.join(';')+'">'+_ppNameEffectInner(name, n, st.effect)+'</span>';
}

function formatPlayerNameHtml(name, style){
  const st = style || getPlayerNameStyle();
  const n = (typeof escapeHtml === 'function' ? escapeHtml(name) : String(name||''));
  const fam = _ppFontById(st.fontId).family;
  const av = (st.avatar && PLAYER_AVATARS.includes(st.avatar)) ? st.avatar : getPlayerAvatar();
  const isGrad = PP_NAME_FX_GRADIENT.indexOf(st.effect) >= 0;
  const css = [];
  if(!isGrad) css.push('color:'+(st.color||'#ffffff'));
  css.push('font-weight:'+(st.bold ? '900' : '700'));
  css.push(st.italic ? 'font-style:italic' : 'font-style:normal');
  css.push('font-family:'+fam);
  return '<span class="player-nick-wrap"><span class="player-avatar" aria-hidden="true">'+av+'</span><span class="player-nick'+_ppNameEffectClass(st.effect)+'" style="'+css.join(';')+'">'+_ppNameEffectInner(name, n, st.effect)+'</span></span>';
}

/** Bọc tên bằng hiệu ứng theo bậc rank Caro/Versus — rank càng cao tên càng nổi bật:
 * màu rực rỡ hơn, có glow nhẹ, top rank thì lấp lánh động + chữ chạy kiểu bảng ga tàu
 * điện ngầm + nhấp nháy mờ dần chậm.
 * `totalTiers` = tổng số bậc của hệ đang dùng (Caro 12, Versus 10) — dùng để chuẩn hoá
 * về cùng 1 thang hiệu ứng 0-11 (CSS .rank-fx-0..11), để hệ 10 bậc cũng chạm được mức
 * hiệu ứng cao nhất khi người chơi lên tới bậc chót của chính hệ đó (mặc định 12 nếu
 * không truyền, giữ nguyên hành vi cũ cho các chỗ gọi sẵn có của Caro).
 * Dùng ở bảng xếp hạng, phòng chờ, thẻ người chơi, màn kết quả Caro/Versus. */
function rankNameFxHtml(name, tier, totalTiers, style){
  const n = (typeof escapeHtml === 'function' ? escapeHtml(name) : String(name||''));
  const total = Math.max(1, Number(totalTiers) || 12);
  const raw = Math.max(0, Math.min(total - 1, Number(tier) || 0));
  const tr = total > 1 ? Math.round((raw / (total - 1)) * 11) : 11;
  let styleAttr = '';
  let fxClass = '';
  let inner = n;
  if(style){
    const fam = _ppFontById(style.fontId).family;
    const parts = ['font-family:'+fam];
    if(style.italic) parts.push('font-style:italic');
    if(style.bold) parts.push('font-weight:900');
    // Bậc 0-1 (.rank-fx-0/1) chưa có hiệu ứng màu riêng (color:inherit) → áp màu/hiệu
    // ứng tên tự chọn. Từ bậc 2 trở lên, màu/gradient là hiệu ứng theo rank nên giữ
    // nguyên, không đè màu — hiệu ứng tên mua trong Shop cũng bỏ qua để tránh 2
    // gradient/animation chồng nhau trên cùng 1 chữ.
    if(tr < 2){
      const isGrad = style.effect && PP_NAME_FX_GRADIENT.indexOf(style.effect) >= 0;
      if(style.color && !isGrad) parts.push('color:'+style.color);
      if(style.effect){
        fxClass = _ppNameEffectClass(style.effect);
        inner = _ppNameEffectInner(name, n, style.effect);
      }
    }
    styleAttr = ' style="'+parts.join(';')+'"';
  }
  if(tr >= 11){
    return '<span class="rank-fx-marquee-box"><span class="rank-fx rank-fx-'+tr+fxClass+' rank-fx-marquee-text"'+styleAttr+'>'+inner+'</span></span>';
  }
  return '<span class="rank-fx rank-fx-'+tr+fxClass+'"'+styleAttr+'>'+inner+'</span>';
}

function getPlayerNameStyle(){
  const p = getPlayerProfile();
  return {
    color: p.color || '#ffffff',
    bold: !!p.bold,
    italic: !!p.italic,
    fontId: p.fontId || 'nunito',
    avatar: getPlayerAvatar(),
    effect: p.nameEffect || ''
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
  let versus = { wins:0, losses:0, draws:0, points:0, total:0, winRate:0, rank:null };
  try{
    if(typeof getLocalVersusStats === 'function') versus = getLocalVersusStats();
  }catch(e){}
  return { level, maps, caro, versus, nick: getPlayerNickname(), style: getPlayerNameStyle() };
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
  renderSettingsPlayerInfo();
}

function _ppRenderPlayerInfoBox(box, info){
  const caro = info.caro || {};
  const rankName = (caro.rank && caro.rank.name) ? caro.rank.name : '';
  const rankIcon = (caro.rank && caro.rank.icon) ? caro.rank.icon + ' ' : '';
  const versus = info.versus || {};
  const vsRankName = (versus.rank && versus.rank.name) ? versus.rank.name : '';
  const vsRankIcon = (versus.rank && versus.rank.icon) ? versus.rank.icon + ' ' : '';
  const hasVersus = (versus.total > 0 || versus.points > 0);
  box.innerHTML =
    '<div class="pp-info-row">'+formatPlayerNameHtml(info.nick, info.style)+'</div>'+
    '<div class="pp-info-grid">'+
      '<div class="pp-stat"><small>'+(typeof t==='function'?t('ppLevel'):'Cấp')+'</small><b>Lv.'+info.level+'</b></div>'+
      '<div class="pp-stat"><small>'+(typeof t==='function'?t('ppMaps'):'Map đã qua')+'</small><b>'+info.maps+'</b></div>'+
      '<div class="pp-stat"><small>'+(typeof t==='function'?t('ppCaro'):'Caro')+'</small><b>'+rankIcon+(caro.points||0)+'đ</b></div>'+
    '</div>'+
    '<div class="pp-caro-line">'+(typeof t==='function'?t('ppCaroWLD', caro.wins||0, caro.losses||0, caro.draws||0, caro.winRate||0):((caro.wins||0)+'T/'+(caro.losses||0)+'H/'+(caro.draws||0)+'Hòa · '+(caro.winRate||0)+'%'))+(rankName?' · '+rankName:'')+'</div>'+
    (hasVersus
      ? '<div class="pp-caro-line">Versus: '+vsRankIcon+(versus.points||0)+'đ · '+
        (typeof t==='function'?t('ppCaroWLD', versus.wins||0, versus.losses||0, versus.draws||0, versus.winRate||0):((versus.wins||0)+'T/'+(versus.losses||0)+'H/'+(versus.draws||0)+'Hòa · '+(versus.winRate||0)+'%'))+
        (vsRankName?' · '+vsRankName:'')+'</div>'
      : '');
}

function renderSettingsPlayerInfo(){
  const box = document.getElementById('settings-player-info');
  if(!box) return;
  // Vẽ ngay bằng cache local để không có độ trễ/giật màn hình...
  _ppRenderPlayerInfoBox(box, getPlayerInfoStats());
  // ...rồi đối chiếu lại với server ngay sau đó (nguồn thật do Cloud Function
  // applyMatchResult ghi) và vẽ lại nếu có khác biệt. Cache local (getLocalCaroStats/
  // getLocalVersusStats) chỉ là số ước tính ngay sau khi 1 trận kết thúc ở máy mình,
  // có thể lệch với BXH thật nếu bỏ qua bước đồng bộ này.
  Promise.resolve().then(async ()=>{
    try{
      const jobs = [];
      if(typeof fetchMyCaroStats === 'function') jobs.push(fetchMyCaroStats());
      if(typeof fetchMyVersusStats === 'function') jobs.push(fetchMyVersusStats());
      if(!jobs.length) return;
      await Promise.all(jobs);
      const stillOpen = document.getElementById('settings-player-info');
      if(!stillOpen) return; // panel đã đóng, khỏi vẽ lại
      _ppRenderPlayerInfoBox(stillOpen, getPlayerInfoStats());
    }catch(e){}
  });
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
  const vis = getProfileVisibility();
  _ppSetVisToggle('pp-vis-maps', vis.maps);
  _ppSetVisToggle('pp-vis-caro', vis.caroRank);
  _ppSetVisToggle('pp-vis-versus', vis.versusRank);
  const idEl = document.getElementById('pp-player-id');
  if(idEl) idEl.textContent = ensurePublicPlayerId();
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

  document.getElementById('pp-copy-id')?.addEventListener('click', async ()=>{
    try{sfxClick();}catch(e){}
    const id = ensurePublicPlayerId();
    try{
      if(navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(id);
      else {
        const ta = document.createElement('textarea');
        ta.value = id; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      const msg = document.getElementById('pp-msg');
      if(msg){
        msg.textContent = (typeof t==='function'?t('ppIdCopied'):'Đã sao chép ID');
        msg.className = 'account-msg ok';
      }
    }catch(e){}
  });

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

  document.getElementById('settings-player-edit')?.addEventListener('click', ()=>{
    if(typeof openAccountHub === 'function') openAccountHub();
    else openPlayerProfilePanel();
  });
  document.getElementById('account-edit-profile')?.addEventListener('click', openPlayerProfilePanel);

  [['pp-vis-maps','maps'], ['pp-vis-caro','caroRank'], ['pp-vis-versus','versusRank']].forEach(([id, field])=>{
    document.getElementById(id)?.addEventListener('click', async ()=>{
      try{sfxClick();}catch(e){}
      const cur = getProfileVisibility();
      const next = setProfileVisibility({ [field]: !cur[field] });
      _ppSetVisToggle(id, next[field]);
      try{ if(typeof syncProfileVisibilityOnline === 'function') await syncProfileVisibilityOnline(); }catch(e){}
    });
  });

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
