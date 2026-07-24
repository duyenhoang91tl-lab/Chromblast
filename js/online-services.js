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
    });
    if(!_onlineAuth.currentUser) await _onlineAuth.signInAnonymously();
    _onlineUid = _onlineAuth.currentUser.uid;
    _onlineDisplayName = getOnlineDisplayName();
    await _upsertPlayerProfile();
    _onlineReady = true;
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
async function _listHostedRooms(uid){
  if(!_onlineDb || !uid) return [];
  const snap = await _onlineDb.collection('rooms').where('hostId', '==', uid).limit(30).get();
  return snap.docs.map(doc => ({ roomId: doc.id, ...doc.data() }));
}

function _isLiveRoomStatus(status){
  return status === 'open' || status === 'ready' || status === 'playing';
}

/** Xóa các phòng trống (không guest) do mình host — trừ exceptRoomId. */
async function abandonMyEmptyHostedRooms(exceptRoomId){
  const uid = _onlineUid || (await ensureOnlineAuth().catch(()=>null));
  if(!uid || !_onlineDb) return;
  const mine = await _listHostedRooms(uid);
  await Promise.all(mine.map(async r => {
    if(exceptRoomId && r.roomId === exceptRoomId) return;
    if(!_isLiveRoomStatus(r.status)) return;
    if(r.status === 'playing') return;
    if(r.guestId) return;
    try{ await _onlineDb.collection('rooms').doc(r.roomId).delete(); }catch(e){}
  }));
}

async function createOnlineRoom(opts){
  opts = opts || {};
  const gameType = opts.gameType || 'versus';
  const uid = await ensureOnlineAuth();
  const name = getOnlineDisplayName();
  const avatar = getOnlineAvatar();

  const mine = await _listHostedRooms(uid);
  const live = mine.filter(r => _isLiveRoomStatus(r.status));
  if(live.some(r => r.status === 'playing')){
    throw new Error('already_hosting');
  }

  // Đã có phòng cùng loại (open/ready) → tái dùng, không tạo thêm
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
    // Phòng đã có khách → không được tạo phòng thứ 2
    if(keep.guestId) throw new Error('already_hosting');
    await Promise.all(same.slice(1).map(async extra => {
      if(extra.guestId) return;
      try{ await _onlineDb.collection('rooms').doc(extra.roomId).delete(); }catch(e){}
    }));
    await abandonMyEmptyHostedRooms(keep.roomId);
    // Cập nhật tên/avatar host nếu đổi
    try{
      await _onlineDb.collection('rooms').doc(keep.roomId).update({
        hostName: name,
        hostAvatar: avatar
      });
    }catch(e){}
    return { roomId: keep.roomId, code: keep.code, reused: true };
  }

  // Còn phòng loại khác / sẵn sàng có khách → chặn
  const blocked = live.find(r => r.status === 'ready' && r.guestId);
  if(blocked) throw new Error('already_hosting');

  // Dọn phòng trống cũ rồi tạo mới
  await abandonMyEmptyHostedRooms(null);

  const code = _roomCode();
  const ref = _onlineDb.collection('rooms').doc();
  await ref.set({
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
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return { roomId: ref.id, code, reused: false };
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
      guestId: null, guestName: null, guestAvatar: null, status: 'open', guestReady: false
    });
    else await ref.delete();
  } else if(d.guestId === uid){
    await ref.update({ guestId: null, guestName: null, guestAvatar: null, guestReady: false, status: 'open' });
  }
  stopListeningRoom();
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

function stopListeningRoom(){
  stopListeningRoomDoc();
  stopListeningMoves();
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
