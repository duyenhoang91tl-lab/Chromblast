// ═══════════════════════════════════════════════════════════════
// js/online-services.js — Firebase Auth, phòng, matchmaking, BXH PvP
// Nạp SAU firebase-config.js + CDN Firebase compat, TRƯỚC leaderboard.js
// ═══════════════════════════════════════════════════════════════

let _onlineDb = null;
let _onlineAuth = null;
let _onlineUid = null;
let _onlineDisplayName = '';
let _onlineReady = false;
let _matchmakingUnsub = null;
let _roomUnsub = null;
let _movesUnsub = null;

const ONLINE_ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function isOnlineServicesEnabled(){
  const c = window.FIREBASE_CONFIG;
  return !!(c && c.projectId && c.apiKey && typeof firebase !== 'undefined');
}

function getOnlineUid(){ return _onlineUid; }
// Fallback dùng _localPlayerName() (không gọi currentPlayerName()) để tránh đệ quy vô hạn
// currentPlayerName() <-> getOnlineDisplayName() khi _onlineDisplayName chưa kịp gán.
function getOnlineDisplayName(){
  try{
    if(typeof getPlayerNickname === 'function'){
      const n = getPlayerNickname();
      if(n) return n;
    }
  }catch(e){}
  return _onlineDisplayName || (typeof _localPlayerName === 'function' ? _localPlayerName() : 'Player');
}

function _roomCode(){
  let s = '';
  for(let i=0;i<6;i++) s += ONLINE_ROOM_CODE_CHARS[Math.floor(Math.random()*ONLINE_ROOM_CODE_CHARS.length)];
  return s;
}

async function initOnlineServices(){
  if(_onlineReady) return isOnlineServicesEnabled();
  if(!isOnlineServicesEnabled()) return false;
  try{
    if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    _onlineAuth = firebase.auth();
    _onlineDb = firebase.firestore();
    await _onlineAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    _onlineAuth.onAuthStateChanged(user => {
      _onlineUid = user ? user.uid : null;
      if(user){
        try{ startPresenceHeartbeat(); }catch(e){}
        try{ startInviteListener(); }catch(e){}
      } else {
        try{ stopPresenceHeartbeat(); }catch(e){}
        try{ stopInviteListener(); }catch(e){}
      }
    });
    if(!_onlineAuth.currentUser) await _onlineAuth.signInAnonymously();
    _onlineUid = _onlineAuth.currentUser.uid;
    _onlineDisplayName = getOnlineDisplayName();
    await _upsertPlayerProfile();
    _onlineReady = true;
    try{ bindOnlineRoomUnloadCleanup(); }catch(e){}
    try{ startPresenceHeartbeat(); }catch(e){}
    try{ startInviteListener(); }catch(e){}
    return true;
  }catch(e){
    console.warn('[online] init failed', e);
    return false;
  }
}

async function ensureOnlineAuth(){
  const ok = await initOnlineServices();
  if(!ok) throw new Error('online_disabled');
  if(!_onlineAuth.currentUser) await _onlineAuth.signInAnonymously();
  _onlineUid = _onlineAuth.currentUser.uid;
  _onlineDisplayName = getOnlineDisplayName();
  await _upsertPlayerProfile();
  return _onlineUid;
}

async function _upsertPlayerProfile(){
  if(!_onlineDb || !_onlineUid) return;
  const name = getOnlineDisplayName();
  const avatar = (typeof getPlayerAvatar === 'function') ? getPlayerAvatar() : '🐶';
  const patch = {
    displayName: name,
    avatar,
    level: (typeof playerLevel !== 'undefined' ? playerLevel : 1),
    online: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try{
    if(typeof getLocalCaroStats === 'function'){
      const s = getLocalCaroStats();
      patch.caroWins = s.wins || 0;
      patch.caroLosses = s.losses || 0;
      patch.caroDraws = s.draws || 0;
      patch.caroPoints = s.points || 0;
    }
  }catch(e){}
  await _onlineDb.collection('players').doc(_onlineUid).set(patch, { merge: true });
}

function getOnlineAvatar(){
  try{
    if(typeof getPlayerAvatar === 'function') return getPlayerAvatar();
  }catch(e){}
  return '🐶';
}

async function fetchPlayerPublicProfile(uid){
  if(!uid) return null;
  try{
    if(!_onlineDb){
      if(typeof initOnlineServices === 'function') await initOnlineServices();
    }
    if(!_onlineDb) return null;
    const snap = await _onlineDb.collection('players').doc(uid).get();
    if(!snap.exists) return { uid, displayName: 'Player', avatar: '🐶' };
    const d = snap.data() || {};
    const stats = (typeof normalizeCaroStats === 'function') ? normalizeCaroStats(d) : {
      wins: d.caroWins||0, losses: d.caroLosses||0, draws: d.caroDraws||0,
      points: d.caroPoints||0, winRate: 0, total: 0
    };
    return {
      uid,
      displayName: d.displayName || 'Player',
      avatar: d.avatar || '🐶',
      online: !!d.online,
      lastSeen: d.lastSeen || null,
      stats
    };
  }catch(e){
    console.warn('[online] fetchPlayerPublicProfile', e);
    return null;
  }
}

async function addOnlineFriend(friend){
  const local = (typeof addFriendLocal === 'function') ? addFriendLocal(friend) : { ok:false };
  if(!local.ok) return local;
  if(local.already) return local;
  try{
    if(!_onlineDb || !_onlineUid || !friend || !friend.uid) return local;
    await _onlineDb.collection('players').doc(_onlineUid)
      .collection('friends').doc(friend.uid)
      .set({
        name: friend.name || 'Player',
        avatar: friend.avatar || '🐶',
        addedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
  }catch(e){ console.warn('[online] addFriend', e); }
  return local;
}

// ── Presence (online / offline) ───────────────────────────────
const PRESENCE_ONLINE_MS = 70000;
let _presenceTimer = null;
let _presenceBound = false;

function _lastSeenMs(lastSeen){
  if(!lastSeen) return 0;
  if(typeof lastSeen.toMillis === 'function') return lastSeen.toMillis();
  if(lastSeen.seconds) return lastSeen.seconds * 1000;
  if(typeof lastSeen === 'number') return lastSeen;
  return 0;
}

function isFriendOnline(profile){
  if(!profile) return false;
  const ms = _lastSeenMs(profile.lastSeen);
  if(!ms) return false;
  return !!(profile.online && (Date.now() - ms) < PRESENCE_ONLINE_MS);
}

async function _writePresence(online){
  if(!_onlineDb || !_onlineUid) return;
  try{
    await _onlineDb.collection('players').doc(_onlineUid).set({
      online: !!online,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }catch(e){}
}

function startPresenceHeartbeat(){
  if(!_onlineUid || !_onlineDb) return;
  _writePresence(true);
  if(_presenceTimer) clearInterval(_presenceTimer);
  _presenceTimer = setInterval(()=>{ _writePresence(true); }, 25000);
  if(!_presenceBound){
    _presenceBound = true;
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState === 'hidden') _writePresence(false);
      else _writePresence(true);
    });
    window.addEventListener('pagehide', ()=>{ _writePresence(false); });
  }
}

function stopPresenceHeartbeat(){
  if(_presenceTimer){ clearInterval(_presenceTimer); _presenceTimer = null; }
  _writePresence(false);
}

async function fetchFriendsPresence(friends){
  const list = Array.isArray(friends) ? friends : [];
  const out = {};
  await Promise.all(list.map(async f=>{
    if(!f || !f.uid) return;
    const p = await fetchPlayerPublicProfile(f.uid);
    out[f.uid] = {
      online: isFriendOnline(p),
      displayName: (p && p.displayName) || f.name || 'Player',
      avatar: (p && p.avatar) || f.avatar || '🐶'
    };
  }));
  return out;
}

// ── Room invites ──────────────────────────────────────────────
let _invitesUnsub = null;
const _seenInviteIds = new Set();

function stopInviteListener(){
  if(_invitesUnsub){ _invitesUnsub(); _invitesUnsub = null; }
}

function startInviteListener(){
  stopInviteListener();
  if(!_onlineDb || !_onlineUid) return;
  _invitesUnsub = _onlineDb.collection('players').doc(_onlineUid).collection('invites')
    .where('status', '==', 'pending')
    .onSnapshot(snap => {
      snap.docChanges().forEach(chg => {
        if(chg.type !== 'added') return;
        const id = chg.doc.id;
        if(_seenInviteIds.has(id)) return;
        _seenInviteIds.add(id);
        const data = { id, ...chg.doc.data() };
        try{
          if(typeof onRoomInviteReceived === 'function') onRoomInviteReceived(data);
        }catch(e){ console.warn('[invite]', e); }
      });
    }, err => console.warn('[online] invites', err));
}

async function sendRoomInvite(opts){
  opts = opts || {};
  await ensureOnlineAuth();
  const toUid = opts.toUid;
  if(!toUid || toUid === _onlineUid) throw new Error('bad_friend');
  if(!opts.roomId || !opts.code) throw new Error('no_room');
  const gameType = opts.gameType === 'versus' ? 'versus' : 'caro';
  const ref = _onlineDb.collection('players').doc(toUid).collection('invites').doc();
  const payload = {
    fromUid: _onlineUid,
    fromName: getOnlineDisplayName(),
    fromAvatar: getOnlineAvatar(),
    toUid,
    gameType,
    roomId: opts.roomId,
    code: String(opts.code || '').toUpperCase(),
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

async function respondRoomInvite(inviteId, accept){
  await ensureOnlineAuth();
  if(!inviteId) return null;
  const ref = _onlineDb.collection('players').doc(_onlineUid).collection('invites').doc(inviteId);
  await ref.set({
    status: accept ? 'accepted' : 'declined',
    respondedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  const snap = await ref.get();
  return snap.exists ? { id: inviteId, ...snap.data() } : null;
}

/** Host đang mở lobby Caro/Versus (nếu có) */
function getHostableLobby(){
  try{
    if(typeof _caroLobby !== 'undefined' && _caroLobby && _caroLobby.role === 'host' && _caroLobby.roomId){
      return { gameType:'caro', roomId:_caroLobby.roomId, code:_caroLobby.code };
    }
  }catch(e){}
  try{
    if(typeof _onlineLobby !== 'undefined' && _onlineLobby && _onlineLobby.role === 'host' && _onlineLobby.roomId){
      return { gameType:'versus', roomId:_onlineLobby.roomId, code:_onlineLobby.code };
    }
  }catch(e){}
  return null;
}

/**
 * Mời bạn vào phòng. Nếu chưa host lobby → tạo phòng Caro (mặc định) rồi mời.
 * gameType: 'caro' | 'versus'
 */
async function inviteFriendToRoom(friendUid, gameType){
  await ensureOnlineAuth();
  if(!friendUid) throw new Error('bad_friend');
  gameType = gameType === 'versus' ? 'versus' : 'caro';

  let lobby = getHostableLobby();
  if(lobby && lobby.gameType !== gameType) lobby = null;

  if(!lobby){
    if(gameType === 'caro'){
      if(typeof caroCreateRoom === 'function') await caroCreateRoom();
      lobby = getHostableLobby();
    } else {
      if(typeof onCreateRoom === 'function') await onCreateRoom();
      else if(typeof createOnlineRoom === 'function'){
        const created = await createOnlineRoom({ gameType:'versus' });
        if(typeof openOnlineLobby === 'function'){
          openOnlineLobby(created.roomId, created.code, 'host', created.room || {});
        }
      }
      lobby = getHostableLobby();
    }
  }
  if(!lobby || !lobby.roomId) throw new Error('no_room');
  return sendRoomInvite({
    toUid: friendUid,
    gameType: lobby.gameType,
    roomId: lobby.roomId,
    code: lobby.code
  });
}

async function signInWithGoogle(){
  // Web: không await async trước signInWithPopup (giữ user gesture).
  // Android: dùng Google Sign-In native (Capgo SocialLogin) → Firebase credential.
  if(!isOnlineServicesEnabled()) throw new Error('online_disabled');

  if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
  if(!_onlineAuth) _onlineAuth = firebase.auth();
  if(!_onlineDb) _onlineDb = firebase.firestore();

  if(_isNativeCapacitor()){
    await _signInWithGoogleNative();
  } else {
    const provider = new firebase.auth.GoogleAuthProvider();
    await _onlineAuth.signInWithPopup(provider);
  }

  if(!_onlineAuth.currentUser) throw new Error('auth_no_user');
  _onlineUid = _onlineAuth.currentUser.uid;
  const name = _onlineAuth.currentUser.displayName;
  if(name) _onlineDisplayName = name;
  try{
    if(typeof getPlayerProfile === 'function' && typeof savePlayerProfile === 'function'){
      const p = getPlayerProfile();
      if(name && (!p.nick || /^Khách#/.test(p.nick))) savePlayerProfile({ nick: name });
    }
  }catch(e){}
  _onlineReady = true;
  await _upsertPlayerProfile();
  return _onlineUid;
}

function _isNativeCapacitor(){
  try{
    return !!(window.Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform());
  }catch(e){ return false; }
}

async function _ensureSocialLoginGoogle(){
  const SocialLogin = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.SocialLogin;
  if(!SocialLogin) throw Object.assign(new Error('google_plugin_missing'), { code: 'google_plugin_missing' });
  const webClientId = window.GOOGLE_WEB_CLIENT_ID;
  if(!webClientId) throw Object.assign(new Error('google_web_client_missing'), { code: 'google_web_client_missing' });
  if(!_ensureSocialLoginGoogle._inited){
    if(!window.__socialLoginGoogleReady){
      await SocialLogin.initialize({
        google: { webClientId, mode: 'online' }
      });
    }
    _ensureSocialLoginGoogle._inited = true;
  }
  return SocialLogin;
}

async function _signInWithGoogleNative(){
  const SocialLogin = await _ensureSocialLoginGoogle();
  const login = await SocialLogin.login({
    provider: 'google',
    options: { scopes: ['email', 'profile'] }
  });
  const idToken = login && login.result && login.result.idToken;
  if(!idToken){
    throw Object.assign(new Error('google_no_id_token'), { code: 'google_no_id_token' });
  }
  const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
  // Giữ cùng uid nếu đang là anonymous → điểm Caro/PvP không mất
  if(_onlineAuth.currentUser && _onlineAuth.currentUser.isAnonymous){
    try{
      await _onlineAuth.currentUser.linkWithCredential(credential);
      return;
    }catch(e){
      // Tài khoản Google đã tồn tại → đăng nhập bằng Google (đổi uid)
      if(!String(e.code||e.message||'').includes('credential-already-in-use')
         && !String(e.code||e.message||'').includes('email-already-in-use')){
        throw e;
      }
    }
  }
  await _onlineAuth.signInWithCredential(credential);
}

function friendlyOnlineAuthError(e){
  const code = String((e && (e.code || e.message)) || '');
  if(code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) return null;
  if(code.includes('12501') || /sign.?in.?canceled|user.?canceled|cancel/i.test(code)) return null;
  if(code.includes('unauthorized-domain')){
    return (typeof t==='function' ? t('onlineAuthDomain') : null)
      || 'Domain chưa được phép trên Firebase. Console → Authentication → Settings → Authorized domains → thêm localhost';
  }
  if(code.includes('google_plugin_missing') || code.includes('google_web_client_missing')){
    return (typeof t==='function' ? t('onlineAuthNativeSetup') : null)
      || 'Thiếu cấu hình Google Sign-In trên app — chạy npm run cap:sync và kiểm tra GOOGLE_WEB_CLIENT_ID';
  }
  if(code.includes('google_no_id_token') || code.includes('Developer console is not set up') || code.includes('28444')){
    return (typeof t==='function' ? t('onlineAuthSha') : null)
      || 'Google Sign-In chưa khớp SHA-1. Thêm SHA-1 debug/release vào Firebase Android app rồi tải lại google-services.json';
  }
  if(code.includes('network-request-failed')){
    return (typeof t==='function' ? t('onlineAuthNetwork') : null) || 'Mất mạng — kiểm tra kết nối rồi thử lại';
  }
  if(code.includes('online_disabled')){
    return (typeof t==='function' ? t('onlineDisabled') : null) || 'Chưa cấu hình Firebase';
  }
  if(code.startsWith('Firebase:') || code.includes('auth/')){
    return (typeof t==='function' ? t('onlineAuthFail') : null) || 'Đăng nhập Google chưa thành công — vẫn chơi online bằng tài khoản ẩn danh được';
  }
  return (e && e.message) ? String(e.message) : String(e || 'Error');
}

// ── Phòng ─────────────────────────────────────────────────────
// Mỗi người chỉ host được 1 phòng đang sống (open/ready/playing) tại một thời điểm.
const ROOM_STALE_MS = 45 * 60 * 1000; // phòng playing/ready treo quá lâu → coi như bỏ

async function _listHostedRooms(uid){
  if(!_onlineDb || !uid) return [];
  const snap = await _onlineDb.collection('rooms').where('hostId', '==', uid).limit(30).get();
  return snap.docs.map(doc => ({ roomId: doc.id, ...doc.data() }));
}

function _isLiveRoomStatus(status){
  return status === 'open' || status === 'ready' || status === 'playing';
}

function _roomAgeMs(r){
  const t = r.updatedAt || r.startedAt || r.createdAt;
  if(!t) return Infinity;
  try{
    if(typeof t.toMillis === 'function') return Date.now() - t.toMillis();
    if(t.seconds) return Date.now() - t.seconds * 1000;
  }catch(e){}
  return Infinity;
}

async function _deleteRoomDoc(roomId){
  if(!_onlineDb || !roomId) return;
  try{ await _onlineDb.collection('rooms').doc(roomId).delete(); }catch(e){}
}

async function _endRoomDoc(roomId){
  if(!_onlineDb || !roomId) return;
  try{
    await _onlineDb.collection('rooms').doc(roomId).update({
      status: 'finished',
      endedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }catch(e){}
}

/** Sửa trạng thái phòng treo (F5 / thoát đột ngột) và trả về bản đã làm sạch. */
async function _sanitizeHostedRoom(r){
  if(!r || !_onlineDb) return r;
  const ref = _onlineDb.collection('rooms').doc(r.roomId);
  const age = _roomAgeMs(r);

  // Playing treo lâu → kết thúc (không chặn tạo phòng mới)
  if(r.status === 'playing' && age > ROOM_STALE_MS){
    await _endRoomDoc(r.roomId);
    return null;
  }

  // ready nhưng không còn guest → về open
  if(r.status === 'ready' && !r.guestId){
    try{ await ref.update({ status: 'open', guestReady: false }); }catch(e){}
    return Object.assign({}, r, { status: 'open', guestReady: false, guestId: null });
  }

  // open nhưng còn ghost guestId → xóa ghost
  if(r.status === 'open' && r.guestId){
    try{
      await ref.update({
        guestId: null, guestName: null, guestAvatar: null, guestReady: false
      });
    }catch(e){}
    return Object.assign({}, r, {
      guestId: null, guestName: null, guestAvatar: null, guestReady: false
    });
  }

  // ready + guest nhưng treo lâu → đá guest, về open
  if(r.status === 'ready' && r.guestId && age > ROOM_STALE_MS){
    try{
      await ref.update({
        guestId: null, guestName: null, guestAvatar: null, guestReady: false, status: 'open'
      });
    }catch(e){}
    return Object.assign({}, r, {
      guestId: null, guestName: null, guestAvatar: null, guestReady: false, status: 'open'
    });
  }

  return r;
}

/** Xóa các phòng trống (không guest) do mình host — trừ exceptRoomId. */
async function abandonMyEmptyHostedRooms(exceptRoomId){
  const uid = _onlineUid || (await ensureOnlineAuth().catch(()=>null));
  if(!uid || !_onlineDb) return;
  const mine = await _listHostedRooms(uid);
  await Promise.all(mine.map(async r => {
    if(exceptRoomId && r.roomId === exceptRoomId) return;
    if(!_isLiveRoomStatus(r.status)) return;
    if(r.status === 'playing'){
      if(_roomAgeMs(r) > ROOM_STALE_MS) await _endRoomDoc(r.roomId);
      return;
    }
    if(r.guestId){
      // ready/open treo lâu có guest ghost → dọn
      if(_roomAgeMs(r) > ROOM_STALE_MS){
        await _deleteRoomDoc(r.roomId);
      }
      return;
    }
    await _deleteRoomDoc(r.roomId);
  }));
}

/** Lấy phòng đang host (cùng gameType) sau khi dọn treo — dùng để hiện lại lobby sau F5. */
async function findMyLiveHostedRoom(gameType){
  const uid = await ensureOnlineAuth();
  const mine = await _listHostedRooms(uid);
  const cleaned = [];
  for(const r of mine){
    if(!_isLiveRoomStatus(r.status)) continue;
    if(gameType && (r.gameType || 'versus') !== gameType) continue;
    const s = await _sanitizeHostedRoom(r);
    if(s && _isLiveRoomStatus(s.status)) cleaned.push(s);
  }
  cleaned.sort((a, b) => _roomAgeMs(a) - _roomAgeMs(b));
  return cleaned[0] || null;
}

async function createOnlineRoom(opts){
  opts = opts || {};
  const gameType = opts.gameType || 'versus';
  const uid = await ensureOnlineAuth();
  const name = getOnlineDisplayName();
  const avatar = getOnlineAvatar();

  const mine = await _listHostedRooms(uid);
  const live = [];
  for(const r of mine){
    if(!_isLiveRoomStatus(r.status)) continue;
    const s = await _sanitizeHostedRoom(r);
    if(s && _isLiveRoomStatus(s.status)) live.push(s);
  }

  // Đang chơi trận còn "tươi" → không tạo thêm; gọi lại sẽ tái vào phòng đó ở UI
  const playing = live.find(r => r.status === 'playing' && (r.gameType || 'versus') === gameType);
  if(playing){
    return {
      roomId: playing.roomId,
      code: playing.code,
      reused: true,
      playing: true,
      room: playing
    };
  }

  // Đã có phòng cùng loại (open/ready) → luôn tái dùng / mở lại lobby (kể cả đang có khách)
  const same = live.filter(r =>
    (r.gameType || 'versus') === gameType && (r.status === 'open' || r.status === 'ready')
  );
  if(same.length){
    same.sort((a, b) => {
      const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
      return ta - tb;
    });
    const keep = same[0];
    await Promise.all(same.slice(1).map(async extra => {
      if(extra.guestId && _roomAgeMs(extra) < ROOM_STALE_MS) return;
      await _deleteRoomDoc(extra.roomId);
    }));
    // Dọn phòng loại khác đang trống
    await Promise.all(live.map(async r => {
      if(r.roomId === keep.roomId) return;
      if((r.gameType || 'versus') === gameType) return;
      if(r.status === 'playing' && _roomAgeMs(r) < ROOM_STALE_MS) return;
      if(r.guestId && _roomAgeMs(r) < ROOM_STALE_MS) return;
      await _deleteRoomDoc(r.roomId);
    }));
    try{
      await _onlineDb.collection('rooms').doc(keep.roomId).update({
        hostName: name,
        hostAvatar: avatar
      });
    }catch(e){}
    return { roomId: keep.roomId, code: keep.code, reused: true, room: keep };
  }

  // Còn phòng loại khác đang có khách / đang chơi → chặn
  const blocked = live.find(r =>
    (r.status === 'playing' && _roomAgeMs(r) < ROOM_STALE_MS) ||
    (r.status === 'ready' && r.guestId && _roomAgeMs(r) < ROOM_STALE_MS)
  );
  if(blocked) throw new Error('already_hosting');

  // Dọn phòng trống cũ rồi tạo mới
  await abandonMyEmptyHostedRooms(null);

  const code = _roomCode();
  const ref = _onlineDb.collection('rooms').doc();
  const roomData = {
    code,
    gameType,
    hostId: uid,
    guestId: null,
    hostName: name,
    guestName: null,
    hostAvatar: avatar,
    guestAvatar: null,
    status: 'open',
    mode: 'casual',
    seed: null,
    currentTurn: null,
    hostReady: true,
    guestReady: false,
    hostScore: 0,
    guestScore: 0,
    startedAt: null,
    endedAt: null,
    winnerId: null,
    turnSec: opts.turnSec === 10 ? 10 : (opts.turnSec === 15 ? 15 : null),
    boardSkin: opts.boardSkin || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  await ref.set(roomData);
  return { roomId: ref.id, code, reused: false, room: Object.assign({ roomId: ref.id }, roomData) };
}

/** Chặn vào phòng khác khi đang host trận / phòng đã có khách. */
async function _assertCanJoinAsGuest(exceptRoomId){
  const uid = _onlineUid || (await ensureOnlineAuth());
  const live = (await _listHostedRooms(uid)).filter(r => _isLiveRoomStatus(r.status));
  const busy = live.find(r =>
    r.roomId !== exceptRoomId &&
    (r.status === 'playing' || !!r.guestId)
  );
  if(busy) throw new Error('already_hosting');
  await abandonMyEmptyHostedRooms(exceptRoomId);
}

async function joinOnlineRoomByCode(code, opts){
  opts = opts || {};
  const gameType = opts.gameType || null;
  const uid = await ensureOnlineAuth();
  const name = getOnlineDisplayName();
  const avatar = getOnlineAvatar();
  const snap = await _onlineDb.collection('rooms')
    .where('code', '==', String(code||'').trim().toUpperCase())
    .where('status', 'in', ['open', 'ready'])
    .limit(1).get();
  if(snap.empty) throw new Error('room_not_found');
  const doc = snap.docs[0];
  const data = doc.data();
  if(gameType && data.gameType && data.gameType !== gameType) throw new Error('wrong_game_type');
  if(data.hostId === uid) return { roomId: doc.id, ...data };
  if(data.guestId && data.guestId !== uid) throw new Error('room_full');
  await _assertCanJoinAsGuest(doc.id);
  await doc.ref.update({
    guestId: uid,
    guestName: name,
    guestAvatar: avatar,
    guestReady: true,
    status: 'ready'
  });
  return { roomId: doc.id, ...(await (await doc.ref.get()).data()) };
}

async function joinOnlineRoomById(roomId, opts){
  opts = opts || {};
  const gameType = opts.gameType || null;
  const uid = await ensureOnlineAuth();
  const name = getOnlineDisplayName();
  const avatar = getOnlineAvatar();
  const ref = _onlineDb.collection('rooms').doc(roomId);
  await _assertCanJoinAsGuest(roomId);
  return _onlineDb.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if(!snap.exists) throw new Error('room_not_found');
    const d = snap.data();
    if(gameType && d.gameType && d.gameType !== gameType) throw new Error('wrong_game_type');
    if(d.hostId === uid) return { roomId, ...d };
    if(d.guestId && d.guestId !== uid) throw new Error('room_full');
    if(d.status !== 'open') throw new Error('room_not_open');
    tx.update(ref, {
      guestId: uid,
      guestName: name,
      guestAvatar: avatar,
      guestReady: true,
      status: 'ready'
    });
    return {
      roomId,
      ...d,
      guestId: uid,
      guestName: name,
      guestAvatar: avatar,
      guestReady: true,
      status: 'ready'
    };
  });
}

async function leaveOnlineRoom(roomId){
  if(!_onlineDb || !roomId) return;
  const ref = _onlineDb.collection('rooms').doc(roomId);
  const snap = await ref.get();
  if(!snap.exists) return;
  const d = snap.data();
  const uid = _onlineUid;
  if(d.hostId === uid){
    if(d.guestId) await ref.update({
      hostId: d.guestId, hostName: d.guestName, hostAvatar: d.guestAvatar || null,
      guestId: null, guestName: null, guestAvatar: null, status: 'open', guestReady: false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    else await ref.delete();
  } else if(d.guestId === uid){
    await ref.update({
      guestId: null, guestName: null, guestAvatar: null, guestReady: false, status: 'open',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  stopListeningRoom();
}

/** Best-effort: F5 / đóng tab → xóa phòng trống đang host (tránh phòng ma). */
function bindOnlineRoomUnloadCleanup(){
  if(bindOnlineRoomUnloadCleanup._done) return;
  bindOnlineRoomUnloadCleanup._done = true;
  const flush = ()=>{
    try{
      const uid = _onlineUid;
      const db = _onlineDb;
      if(!uid || !db || typeof db.collection !== 'function') return;
      // Chỉ dọn khi không trong trận đang chơi (caroMode / versusMode)
      const inMatch = (typeof caroMode !== 'undefined' && caroMode) ||
        (typeof versusMode !== 'undefined' && versusMode);
      if(inMatch) return;
      db.collection('rooms').where('hostId', '==', uid).limit(10).get().then(snap=>{
        snap.docs.forEach(doc=>{
          const d = doc.data() || {};
          if(d.status === 'playing') return;
          if(d.guestId) return;
          if(d.status === 'open' || d.status === 'ready'){
            doc.ref.delete().catch(()=>{});
          }
        });
      }).catch(()=>{});
    }catch(e){}
  };
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
}

async function startOnlineRoomMatch(roomId, opts){
  opts = opts || {};
  const uid = await ensureOnlineAuth();
  const ref = _onlineDb.collection('rooms').doc(roomId);
  const snap = await ref.get();
  if(!snap.exists) throw new Error('room_not_found');
  const d = snap.data();
  if(d.hostId !== uid) throw new Error('host_only');
  if(!d.guestId) throw new Error('waiting_guest');
  if(d.gameType === 'caro'){
    const patch = {
      status: 'playing',
      currentTurn: 'host',
      startedAt: firebase.firestore.FieldValue.serverTimestamp(),
      moveSeq: 0
    };
    if(opts.turnSec === 10 || opts.turnSec === 15) patch.turnSec = opts.turnSec;
    if(opts.boardSkin) patch.boardSkin = opts.boardSkin;
    await ref.update(patch);
    return null;
  }
  const seed = (Date.now() ^ (Math.random()*0xFFFFFFF))>>>0;
  await ref.update({
    status: 'playing',
    seed,
    startedAt: firebase.firestore.FieldValue.serverTimestamp(),
    moveSeq: 0
  });
  return seed;
}

function listenOnlineRoom(roomId, cb){
  stopListeningRoomDoc();
  if(!_onlineDb) return;
  _roomUnsub = _onlineDb.collection('rooms').doc(roomId).onSnapshot(doc => {
    if(!doc.exists){ cb({ type:'deleted' }); return; }
    cb({ type:'room', data: { roomId: doc.id, ...doc.data() } });
  });
}

function listenOnlineMoves(roomId, cb){
  stopListeningMoves();
  if(!_onlineDb) return;
  _movesUnsub = _onlineDb.collection('rooms').doc(roomId).collection('moves')
    .orderBy('seq', 'asc')
    .onSnapshot(snap => {
      snap.docChanges().forEach(chg => {
        if(chg.type === 'added') cb(chg.doc.data());
      });
    }, err => console.warn('[online] moves listen', err));
}

/** Chỉ hủy listener document phòng — KHÔNG hủy moves (tránh mất sync nước đi). */
function stopListeningRoomDoc(){
  if(_roomUnsub){ _roomUnsub(); _roomUnsub = null; }
}

function stopListeningMoves(){
  if(_movesUnsub){ _movesUnsub(); _movesUnsub = null; }
}

let _chatUnsub = null;
let _roomChatCbs = new Set();
let _roomChatId = null;
let _worldChatUnsub = null;
let _dmChatUnsub = null;

function stopListeningChat(){
  if(_chatUnsub){ _chatUnsub(); _chatUnsub = null; }
  _roomChatId = null;
  _roomChatCbs.clear();
}

function stopListeningWorldChat(){
  if(_worldChatUnsub){ _worldChatUnsub(); _worldChatUnsub = null; }
}

function stopListeningDmChat(){
  if(_dmChatUnsub){ _dmChatUnsub(); _dmChatUnsub = null; }
}

function stopListeningRoom(){
  stopListeningRoomDoc();
  stopListeningMoves();
  stopListeningChat();
}

function _chatMsgPayload(text){
  const raw = String(text || '').trim().slice(0, 120);
  if(!raw) return null;
  return {
    uid: _onlineUid,
    name: getOnlineDisplayName(),
    avatar: (typeof getPlayerAvatar === 'function') ? getPlayerAvatar() : '🐶',
    text: raw,
    ts: firebase.firestore.FieldValue.serverTimestamp()
  };
}

/** Chat trong phòng (Caro / Versus) — hỗ trợ nhiều listener */
async function sendRoomChat(roomId, text){
  if(!_onlineDb || !roomId) return null;
  const payload = _chatMsgPayload(text);
  if(!payload) return null;
  const ref = _onlineDb.collection('rooms').doc(roomId).collection('chat').doc();
  await ref.set(payload);
  return payload;
}

function listenRoomChat(roomId, cb){
  if(typeof cb === 'function') _roomChatCbs.add(cb);
  if(!_onlineDb || !roomId) return;
  if(_roomChatId === roomId && _chatUnsub) return;
  // Chỉ hủy snapshot cũ, giữ danh sách callback
  if(_chatUnsub){ _chatUnsub(); _chatUnsub = null; }
  _roomChatId = roomId;
  _chatUnsub = _onlineDb.collection('rooms').doc(roomId).collection('chat')
    .orderBy('ts', 'asc')
    .limitToLast(50)
    .onSnapshot(snap => {
      snap.docChanges().forEach(chg => {
        if(chg.type !== 'added') return;
        const msg = { id: chg.doc.id, ...chg.doc.data() };
        _roomChatCbs.forEach(fn => { try{ fn(msg); }catch(e){} });
      });
    }, err => console.warn('[online] room chat', err));
}

function unlistenRoomChat(cb){
  if(cb) _roomChatCbs.delete(cb);
}

/** Chat thế giới */
async function sendWorldChat(text){
  if(!_onlineDb) return null;
  await ensureOnlineAuth();
  const payload = _chatMsgPayload(text);
  if(!payload) return null;
  const ref = _onlineDb.collection('worldChat').doc('global').collection('messages').doc();
  await ref.set(payload);
  return payload;
}

function listenWorldChat(cb){
  stopListeningWorldChat();
  if(!_onlineDb) return;
  _worldChatUnsub = _onlineDb.collection('worldChat').doc('global').collection('messages')
    .orderBy('ts', 'asc')
    .limitToLast(60)
    .onSnapshot(snap => {
      snap.docChanges().forEach(chg => {
        if(chg.type === 'added' && typeof cb === 'function'){
          cb({ id: chg.doc.id, ...chg.doc.data() });
        }
      });
    }, err => console.warn('[online] world chat', err));
}

function dmIdFor(uidA, uidB){
  return [String(uidA||''), String(uidB||'')].sort().join('_');
}

async function ensureDmDoc(friendUid){
  await ensureOnlineAuth();
  if(!_onlineDb || !_onlineUid || !friendUid) return null;
  const dmId = dmIdFor(_onlineUid, friendUid);
  const ref = _onlineDb.collection('dms').doc(dmId);
  const snap = await ref.get();
  if(!snap.exists){
    await ref.set({
      members: [_onlineUid, friendUid].sort(),
      lastText: '',
      lastAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastUid: _onlineUid
    });
  }
  return dmId;
}

async function sendFriendChat(friendUid, text){
  if(!friendUid) return null;
  const dmId = await ensureDmDoc(friendUid);
  if(!dmId) return null;
  const payload = _chatMsgPayload(text);
  if(!payload) return null;
  const ref = _onlineDb.collection('dms').doc(dmId);
  const msgRef = ref.collection('messages').doc();
  await msgRef.set(payload);
  await ref.set({
    lastText: payload.text,
    lastAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastUid: _onlineUid
  }, { merge: true });
  return payload;
}

function listenFriendChat(friendUid, cb){
  stopListeningDmChat();
  if(!_onlineDb || !_onlineUid || !friendUid) return;
  const dmId = dmIdFor(_onlineUid, friendUid);
  // Đảm bảo doc tồn tại rồi mới listen messages
  ensureDmDoc(friendUid).then(()=>{
    if(_dmChatUnsub){ _dmChatUnsub(); _dmChatUnsub = null; }
    _dmChatUnsub = _onlineDb.collection('dms').doc(dmId).collection('messages')
      .orderBy('ts', 'asc')
      .limitToLast(50)
      .onSnapshot(snap => {
        snap.docChanges().forEach(chg => {
          if(chg.type === 'added' && typeof cb === 'function'){
            cb({ id: chg.doc.id, ...chg.doc.data() });
          }
        });
      }, err => console.warn('[online] dm chat', err));
  }).catch(err => console.warn('[online] ensure dm', err));
}

/** roomId phòng/trận online đang mở (lobby hoặc match — Caro / Versus) */
function getActiveOnlineRoomId(){
  try{
    if(typeof _caro !== 'undefined' && _caro && _caro.online && _caro.roomId) return _caro.roomId;
  }catch(e){}
  try{
    if(typeof _vs !== 'undefined' && _vs && _vs.online && _vs.online.roomId) return _vs.online.roomId;
  }catch(e){}
  try{
    if(typeof _caroLobby !== 'undefined' && _caroLobby && _caroLobby.roomId) return _caroLobby.roomId;
  }catch(e){}
  try{
    if(typeof _onlineLobby !== 'undefined' && _onlineLobby && _onlineLobby.roomId) return _onlineLobby.roomId;
  }catch(e){}
  return null;
}

async function fetchAllOnlineMoves(roomId){
  if(!_onlineDb || !roomId) return [];
  const snap = await _onlineDb.collection('rooms').doc(roomId).collection('moves')
    .orderBy('seq', 'asc').get();
  return snap.docs.map(d => d.data());
}

async function updateOnlineRoomTurn(roomId, currentTurn){
  if(!_onlineDb || !roomId) return;
  await _onlineDb.collection('rooms').doc(roomId).update({ currentTurn });
}

async function updateOnlineRoomMeta(roomId, meta){
  if(!_onlineDb || !roomId || !meta) return;
  const patch = {};
  if(meta.turnSec === 10 || meta.turnSec === 15) patch.turnSec = meta.turnSec;
  if(meta.boardSkin) patch.boardSkin = meta.boardSkin;
  if(!Object.keys(patch).length) return;
  await _onlineDb.collection('rooms').doc(roomId).update(patch);
}

async function sendOnlineMove(roomId, payload){
  if(!_onlineDb || !roomId) return null;
  const ref = _onlineDb.collection('rooms').doc(roomId);
  let seqOut = null;
  await _onlineDb.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if(!snap.exists) return;
    const seq = (snap.data().moveSeq || 0) + 1;
    seqOut = seq;
    tx.update(ref, { moveSeq: seq, currentTurn: payload && payload.nextTurn != null ? payload.nextTurn : (snap.data().currentTurn || null) });
    const moveRef = ref.collection('moves').doc();
    tx.set(moveRef, {
      ...payload,
      seq,
      playerId: _onlineUid,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
  return seqOut;
}

async function updateOnlineScores(roomId, hostScore, guestScore){
  if(!_onlineDb || !roomId) return;
  await _onlineDb.collection('rooms').doc(roomId).update({ hostScore, guestScore });
}

// ── Matchmaking ───────────────────────────────────────────────
async function startMatchmaking(onMatched, opts){
  opts = opts || {};
  const gameType = opts.gameType || 'versus';
  const uid = await ensureOnlineAuth();
  const name = getOnlineDisplayName();
  // Đang host phòng có khách / đang chơi → không tìm đối thủ (1 phòng / người)
  const live = (await _listHostedRooms(uid)).filter(r => _isLiveRoomStatus(r.status));
  if(live.some(r => r.status === 'playing' || (r.status === 'ready' && r.guestId))){
    throw new Error('already_hosting');
  }
  await abandonMyEmptyHostedRooms(null);
  const qRef = _onlineDb.collection('matchQueue').doc(uid);
  await qRef.set({
    uid,
    displayName: name,
    level: (typeof playerLevel !== 'undefined' ? playerLevel : 1),
    mode: 'casual',
    gameType,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const tryPair = async () => {
    const mine = await qRef.get();
    if(!mine.exists) return;
    const all = await _onlineDb.collection('matchQueue').orderBy('createdAt', 'asc').limit(20).get();
    const other = all.docs.find(d => d.id !== uid && (d.data().gameType || 'versus') === gameType);
    if(!other) return;
    const roomRef = _onlineDb.collection('rooms').doc();
    try{
      await _onlineDb.runTransaction(async tx => {
        const myQ = await tx.get(qRef);
        const theirQ = await tx.get(other.ref);
        if(!myQ.exists || !theirQ.exists) return;
        const hostDoc = myQ.data().createdAt <= theirQ.data().createdAt ? myQ : theirQ;
        const guestDoc = hostDoc === myQ ? theirQ : myQ;
        const roomData = {
          code: _roomCode(),
          gameType,
          hostId: hostDoc.id,
          guestId: guestDoc.id,
          hostName: hostDoc.data().displayName,
          guestName: guestDoc.data().displayName,
          status: 'ready',
          mode: 'casual',
          seed: null,
          currentTurn: null,
          hostReady: true,
          guestReady: true,
          hostScore: 0,
          guestScore: 0,
          startedAt: null,
          endedAt: null,
          winnerId: null,
          matchmaking: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if(opts.turnSec === 10 || opts.turnSec === 15) roomData.turnSec = opts.turnSec;
        if(opts.boardSkin) roomData.boardSkin = opts.boardSkin;
        tx.set(roomRef, roomData);
        tx.delete(qRef);
        tx.delete(other.ref);
      });
      const roomSnap = await roomRef.get();
      if(roomSnap.exists){
        cancelMatchmaking();
        onMatched({ roomId: roomRef.id, ...roomSnap.data() });
      }
    }catch(e){ /* race — thử lại */ }
  };

  tryPair();
  _matchmakingUnsub = _onlineDb.collection('matchQueue').onSnapshot(() => { tryPair(); });
  _matchmakingTimer = setInterval(tryPair, 2000);
}

let _matchmakingTimer = null;
function cancelMatchmaking(){
  if(_matchmakingTimer){ clearInterval(_matchmakingTimer); _matchmakingTimer = null; }
  if(_matchmakingUnsub){ _matchmakingUnsub(); _matchmakingUnsub = null; }
  if(_onlineDb && _onlineUid){
    _onlineDb.collection('matchQueue').doc(_onlineUid).delete().catch(()=>{});
  }
}

let _openCaroRoomsUnsub = null;
function listenOpenCaroRooms(onUpdate){
  return listenOpenRoomsByGameType('caro', onUpdate, '_openCaroRoomsUnsub');
}
function stopListeningOpenCaroRooms(){
  if(_openCaroRoomsUnsub){ _openCaroRoomsUnsub(); _openCaroRoomsUnsub = null; }
}

let _openVersusRoomsUnsub = null;
function listenOpenVersusRooms(onUpdate){
  return listenOpenRoomsByGameType('versus', onUpdate, '_openVersusRoomsUnsub');
}
function stopListeningOpenVersusRooms(){
  if(_openVersusRoomsUnsub){ _openVersusRoomsUnsub(); _openVersusRoomsUnsub = null; }
}

function listenOpenRoomsByGameType(gameType, onUpdate, unsubKey){
  if(unsubKey === '_openCaroRoomsUnsub') stopListeningOpenCaroRooms();
  if(unsubKey === '_openVersusRoomsUnsub') stopListeningOpenVersusRooms();
  if(!_onlineDb) return;
  const q = _onlineDb.collection('rooms')
    .where('gameType', '==', gameType)
    .where('status', '==', 'open')
    .limit(30);
  const unsub = q.onSnapshot(snap => {
    const rooms = snap.docs.map(doc => ({ roomId: doc.id, ...doc.data() }));
    rooms.sort((a, b) => {
      const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
      return ta - tb;
    });
    if(typeof onUpdate === 'function') onUpdate(rooms);
  }, err => {
    console.warn('['+gameType+'-rooms]', err);
    if(typeof onUpdate === 'function') onUpdate([]);
  });
  if(unsubKey === '_openCaroRoomsUnsub') _openCaroRoomsUnsub = unsub;
  else if(unsubKey === '_openVersusRoomsUnsub') _openVersusRoomsUnsub = unsub;
}

// ── Kết quả & BXH Caro ────────────────────────────────────────
async function finalizeCaroMatch(roomId, winnerSlot){
  if(!_onlineDb || !roomId) return;
  const ref = _onlineDb.collection('rooms').doc(roomId);
  let hostId, guestId;
  try{
    await _onlineDb.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if(!snap.exists || snap.data().status === 'finished') return;
      const d = snap.data();
      hostId = d.hostId;
      guestId = d.guestId;
      const winnerId = winnerSlot === 'host' ? d.hostId : (winnerSlot === 'guest' ? d.guestId : null);
      tx.update(ref, {
        status: 'finished',
        winnerId: winnerId || null,
        isDraw: winnerSlot === 'draw',
        endedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  }catch(e){ return; }

  const applyPlayer = async (uid, outcome) => {
    if(!uid) return;
    const patch = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    if(outcome === 'win'){
      patch.caroWins = firebase.firestore.FieldValue.increment(1);
      patch.caroPoints = firebase.firestore.FieldValue.increment(25);
    } else if(outcome === 'loss'){
      patch.caroLosses = firebase.firestore.FieldValue.increment(1);
    } else if(outcome === 'draw'){
      patch.caroDraws = firebase.firestore.FieldValue.increment(1);
      patch.caroPoints = firebase.firestore.FieldValue.increment(8);
    }
    await _onlineDb.collection('players').doc(uid).set(patch, { merge: true });
  };

  if(winnerSlot === 'draw'){
    await applyPlayer(hostId, 'draw');
    await applyPlayer(guestId, 'draw');
  } else if(winnerSlot === 'host'){
    await applyPlayer(hostId, 'win');
    await applyPlayer(guestId, 'loss');
  } else if(winnerSlot === 'guest'){
    await applyPlayer(guestId, 'win');
    await applyPlayer(hostId, 'loss');
  }
}

async function finalizeOnlineMatch(roomId, hostScore, guestScore){
  if(!_onlineDb || !roomId) return;
  const ref = _onlineDb.collection('rooms').doc(roomId);
  const snap = await ref.get();
  if(!snap.exists) return;
  const d = snap.data();
  if(d.status === 'finished') return;
  const hostId = d.hostId, guestId = d.guestId;
  let winnerId = null;
  if(hostScore > guestScore) winnerId = hostId;
  else if(guestScore > hostScore) winnerId = guestId;

  await ref.update({
    status: 'finished',
    hostScore,
    guestScore,
    winnerId,
    endedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const updates = [
    { id: hostId, win: winnerId === hostId, draw: !winnerId, score: hostScore },
    { id: guestId, win: winnerId === guestId, draw: !winnerId, score: guestScore }
  ];
  for(const u of updates){
    if(!u.id) continue;
    const pts = u.win ? 30 : (u.draw ? 5 : 0);
    await _onlineDb.collection('players').doc(u.id).set({
      pvpPoints: firebase.firestore.FieldValue.increment(pts),
      wins: firebase.firestore.FieldValue.increment(u.win ? 1 : 0),
      losses: firebase.firestore.FieldValue.increment(!u.win && !u.draw ? 1 : 0),
      draws: firebase.firestore.FieldValue.increment(u.draw ? 1 : 0),
      bestPvpScore: u.score,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    // bestPvpScore: chỉ cập nhật nếu cao hơn — Firestore không hỗ trợ max trong increment; client merge đơn giản
  }
}

async function fetchGlobalLeaderboard(limit, mode){
  if(!await initOnlineServices()) return null;
  const col = _onlineDb.collection('players');
  const field = mode === 'pvp' ? 'pvpPoints' : 'bestScore';
  const snap = await col.orderBy(field, 'desc').limit(limit || 20).get();
  return snap.docs.map((doc, i) => {
    const d = doc.data();
    return {
      name: d.displayName || 'Player',
      score: d[field] || 0,
      rank: i + 1,
      playerId: doc.id
    };
  }).filter(e => e.score > 0);
}

async function fetchMyGlobalRank(mode){
  if(!await initOnlineServices() || !_onlineUid) return null;
  const field = mode === 'pvp' ? 'pvpPoints' : 'bestScore';
  const mine = await _onlineDb.collection('players').doc(_onlineUid).get();
  const myScore = mine.exists ? (mine.data()[field] || 0) : 0;
  if(!myScore) return null;
  const higher = await _onlineDb.collection('players').where(field, '>', myScore).get();
  const total = await _onlineDb.collection('players').where(field, '>', 0).get();
  return { rank: higher.size + 1, score: myScore, total: total.size };
}

async function submitGlobalSoloScore(score){
  if(!score || score <= 0) return;
  if(!await initOnlineServices()) return;
  const ref = _onlineDb.collection('players').doc(_onlineUid);
  const snap = await ref.get();
  const prev = snap.exists ? (snap.data().bestScore || 0) : 0;
  if(score > prev){
    await ref.set({
      displayName: getOnlineDisplayName(),
      bestScore: score,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
}
