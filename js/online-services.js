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
        try{ startFriendRequestListener(typeof window.onFriendRequestIncoming==='function'?window.onFriendRequestIncoming:null); }catch(e){}
        try{ loadBlockedList(); }catch(e){}
      } else {
        try{ stopPresenceHeartbeat(); }catch(e){}
        try{ stopInviteListener(); }catch(e){}
        try{ stopFriendRequestListener(); }catch(e){}
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
    try{ startFriendRequestListener(typeof window.onFriendRequestIncoming==='function'?window.onFriendRequestIncoming:null); }catch(e){}
    try{ loadBlockedList(); }catch(e){}
    try{ claimPendingReferralRewards(); }catch(e){}
    return true;
  }catch(e){
    console.warn('[online] init failed', e);
    return false;
  }
}

// ── Xoá tài khoản online (Firebase Auth + toàn bộ dữ liệu thuộc quyền) ─
async function _deleteOwnedSubcollection(uid, sub){
  if(!_onlineDb) return;
  try{
    const snap = await _onlineDb.collection('players').doc(uid).collection(sub).get();
    await Promise.all(snap.docs.map(d => d.ref.delete().catch(()=>{})));
  }catch(e){ console.warn('[online] delete '+sub, e); }
}

async function deleteMyAccountOnline(){
  await ensureOnlineAuth();
  if(!_onlineDb || !_onlineUid || !_onlineAuth || !_onlineAuth.currentUser){
    return { ok:false, reason:'offline' };
  }
  const uid = _onlineUid;
  try{
    try{ stopPresenceHeartbeat(); }catch(e){}
    try{ stopInviteListener(); }catch(e){}
    try{ stopFriendRequestListener(); }catch(e){}
    try{ stopListeningRoom(); }catch(e){}
    try{ stopListeningWorldChat(); }catch(e){}
    try{ stopListeningDmChat(); }catch(e){}

    await Promise.all([
      _deleteOwnedSubcollection(uid, 'friends'),
      _deleteOwnedSubcollection(uid, 'blocked'),
      _deleteOwnedSubcollection(uid, 'friendRequests'),
      _deleteOwnedSubcollection(uid, 'invites'),
      _deleteOwnedSubcollection(uid, 'lbClaims')
    ]);

    // BXH: xoá điểm kỳ hiện tại + kỳ trước (day/week/month). Không thể liệt kê
    // toàn bộ lịch sử kỳ cũ hơn từ client — xem ghi chú trong privacy-policy.html.
    try{
      const kinds = ['day','week','month'];
      const pids = [];
      kinds.forEach(k=>{
        if(typeof periodKey === 'function') pids.push(periodKey(k));
        if(typeof previousPeriodKey === 'function') pids.push(previousPeriodKey(k));
      });
      await Promise.all(pids.map(pid =>
        _onlineDb.collection('periodScores').doc(pid).collection('entries').doc(uid).delete().catch(()=>{})
      ));
    }catch(e){}

    try{
      const prof = (typeof getPlayerProfile === 'function') ? getPlayerProfile() : null;
      if(prof && prof.publicId){
        await _onlineDb.collection('playerIds').doc(prof.publicId).delete().catch(()=>{});
      }
    }catch(e){}

    try{ await _onlineDb.collection('matchQueue').doc(uid).delete(); }catch(e){}
    try{ await _onlineDb.collection('players').doc(uid).delete(); }catch(e){}

    await _onlineAuth.currentUser.delete();

    _onlineUid = null;
    _onlineReady = false;
    _blockedUids.clear();
    return { ok:true };
  }catch(e){
    console.warn('[online] deleteMyAccountOnline', e);
    const code = String((e && e.code) || '');
    if(code.includes('requires-recent-login')) return { ok:false, reason:'requires_recent_login' };
    return { ok:false, reason:'error' };
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
  const region = (typeof getPlayerRegion === 'function') ? getPlayerRegion() : { country:'VN', continent:'AS' };
  let publicId = '';
  try{
    if(typeof ensurePublicPlayerId === 'function') publicId = ensurePublicPlayerId();
  }catch(e){}
  const patch = {
    displayName: name,
    displayNameLower: String(name || '').toLowerCase(),
    avatar,
    level: (typeof playerLevel !== 'undefined' ? playerLevel : 1),
    mapNormal: (typeof normalMapStage !== 'undefined' ? Math.max(0, (normalMapStage|0) - 1) : 0),
    mapSecret: (typeof unlockGateStageIndex !== 'undefined' ? (unlockGateStageIndex|0) : 0),
    country: region.country || 'VN',
    continent: region.continent || 'AS',
    online: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if(publicId) patch.publicId = publicId;
  try{
    const couple = (window.CaroSocial && typeof CaroSocial.getCouple === 'function') ? CaroSocial.getCouple() : null;
    patch.couplePartnerName = (couple && couple.partnerUid) ? (couple.partnerName || '') : '';
    patch.couplePairedAt = (couple && couple.partnerUid) ? (couple.pairedAt || null) : null;
  }catch(e){}
  try{
    const vis = (typeof getProfileVisibility === 'function') ? getProfileVisibility() : null;
    patch.visMaps = vis ? !!vis.maps : true;
    patch.visCaro = vis ? !!vis.caroRank : true;
    patch.visVersus = vis ? !!vis.versusRank : true;
  }catch(e){}
  // Lưu ý: các field điểm số (caroWins/caroLosses/caroDraws/caroPoints/pvpPoints/
  // wins/losses/draws/bestScore/bestPvpScore) KHÔNG còn được đồng bộ từ đây nữa.
  // Firestore Rules chỉ cho phép các field này giữ nguyên hoặc do Cloud Function
  // ghi (xem firestore.rules: scoreFieldsUnchanged(), functions/index.js: applyMatchResult).
  await _onlineDb.collection('players').doc(_onlineUid).set(patch, { merge: true });
  if(publicId){
    try{
      await _onlineDb.collection('playerIds').doc(publicId).set({
        uid: _onlineUid,
        displayName: name,
        avatar,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }catch(e){}
  }
}

/** Gọi khi người chơi bấm bật/tắt 1 mục trong "Quyền riêng tư hồ sơ" (player-profile.js) */
async function syncProfileVisibilityOnline(){
  if(!_onlineDb || !_onlineUid) return;
  try{
    const vis = (typeof getProfileVisibility === 'function') ? getProfileVisibility() : null;
    if(!vis) return;
    await _onlineDb.collection('players').doc(_onlineUid).set({
      visMaps: !!vis.maps,
      visCaro: !!vis.caroRank,
      visVersus: !!vis.versusRank,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }catch(e){}
}

function _genPublicPlayerId(){
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'CB';
  for(let i=0;i<6;i++) out += alphabet[Math.floor(Math.random()*alphabet.length)];
  return out;
}

async function registerPublicPlayerIdOnline(publicId){
  let id = String(publicId || '').trim().toUpperCase();
  if(!id) return;
  try{
    if(!_onlineDb){
      if(typeof initOnlineServices === 'function') await initOnlineServices();
    }
    if(!_onlineDb || !_onlineUid) return;
    // Tránh đụng ID người khác — thử lại tối đa 5 lần
    for(let attempt = 0; attempt < 5; attempt++){
      const ref = _onlineDb.collection('playerIds').doc(id);
      const snap = await ref.get();
      if(snap.exists){
        const owner = (snap.data() || {}).uid;
        if(owner && owner !== _onlineUid){
          id = _genPublicPlayerId();
          continue;
        }
      }
      await ref.set({
        uid: _onlineUid,
        displayName: getOnlineDisplayName(),
        avatar: (typeof getPlayerAvatar === 'function') ? getPlayerAvatar() : '🐶',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      await _onlineDb.collection('players').doc(_onlineUid).set({
        publicId: id,
        displayNameLower: String(getOnlineDisplayName()||'').toLowerCase()
      }, { merge: true });
      if(id !== String(publicId || '').trim().toUpperCase()){
        try{ if(typeof savePlayerProfile === 'function') savePlayerProfile({ publicId: id }); }catch(e){}
      }
      return;
    }
  }catch(e){
    console.warn('[online] registerPublicPlayerIdOnline', e);
  }
}

/** Tìm người chơi theo publicId (CBxxxxxx) hoặc Firebase uid. */
async function findPlayerByPublicId(code){
  const q = String(code || '').trim().toUpperCase();
  if(!q) return null;
  try{
    if(!_onlineDb){
      if(typeof initOnlineServices === 'function') await initOnlineServices();
    }
    if(!_onlineDb) return null;
    // ID công khai CBxxxxxx
    if(/^CB[A-Z0-9]{6}$/.test(q)){
      const idSnap = await _onlineDb.collection('playerIds').doc(q).get();
      if(idSnap.exists){
        const d = idSnap.data() || {};
        if(d.uid){
          const prof = await fetchPlayerPublicProfile(d.uid);
          if(prof){ prof.publicId = q; return prof; }
        }
      }
    }
    // Cho phép dán uid Firebase dài
    if(q.length >= 12){
      const prof = await fetchPlayerPublicProfile(code.trim());
      if(prof) return prof;
    }
  }catch(e){
    console.warn('[online] findPlayerByPublicId', e);
  }
  return null;
}

/** Tìm theo tên (prefix, không phân biệt hoa thường) — tối đa 12 kết quả. */
async function searchPlayersByName(nameQuery){
  const q = String(nameQuery || '').trim().toLowerCase();
  if(q.length < 2) return [];
  try{
    if(!_onlineDb){
      if(typeof initOnlineServices === 'function') await initOnlineServices();
    }
    if(!_onlineDb) return [];
    const end = q + '\uf8ff';
    let snap;
    try{
      snap = await _onlineDb.collection('players')
        .orderBy('displayNameLower')
        .startAt(q).endAt(end)
        .limit(12).get();
    }catch(e){
      // Fallback nếu chưa có index / field: lấy top gần đây rồi lọc client
      snap = await _onlineDb.collection('players')
        .orderBy('lastSeen', 'desc').limit(40).get();
    }
    const me = _onlineUid;
    const out = [];
    snap.forEach(doc=>{
      if(doc.id === me) return;
      const d = doc.data() || {};
      const dn = String(d.displayName || '').toLowerCase();
      const dnl = String(d.displayNameLower || dn);
      if(dnl.indexOf(q) < 0 && dn.indexOf(q) < 0) return;
      out.push({
        uid: doc.id,
        displayName: d.displayName || 'Player',
        avatar: d.avatar || '🐶',
        publicId: d.publicId || '',
        online: !!d.online
      });
    });
    return out.slice(0, 12);
  }catch(e){
    console.warn('[online] searchPlayersByName', e);
    return [];
  }
}

/** 20 người chơi ngẫu nhiên trên server (ưu tiên mới online). */
async function fetchRandomPlayers(limit){
  const n = Math.max(1, Math.min(40, limit|0 || 20));
  try{
    if(!_onlineDb){
      if(typeof initOnlineServices === 'function') await initOnlineServices();
    }
    if(!_onlineDb) return [];
    const snap = await _onlineDb.collection('players')
      .orderBy('lastSeen', 'desc').limit(Math.max(40, n * 3)).get();
    const me = _onlineUid;
    const friends = (typeof getFriendsList === 'function')
      ? new Set(getFriendsList().map(f=>f && f.uid).filter(Boolean))
      : new Set();
    const pool = [];
    snap.forEach(doc=>{
      if(doc.id === me) return;
      if(friends.has(doc.id)) return;
      const d = doc.data() || {};
      pool.push({
        uid: doc.id,
        displayName: d.displayName || 'Player',
        avatar: d.avatar || '🐶',
        publicId: d.publicId || '',
        online: !!d.online
      });
    });
    // Xáo trộn rồi lấy n
    for(let i=pool.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      const t = pool[i]; pool[i]=pool[j]; pool[j]=t;
    }
    return pool.slice(0, n);
  }catch(e){
    console.warn('[online] fetchRandomPlayers', e);
    return [];
  }
}

async function syncPlayerRegionOnline(){
  if(!_onlineDb || !_onlineUid) return;
  const region = (typeof getPlayerRegion === 'function') ? getPlayerRegion() : null;
  if(!region) return;
  try{
    await _onlineDb.collection('players').doc(_onlineUid).set({
      country: region.country,
      continent: region.continent,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }catch(e){}
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
    const versusStats = (typeof normalizeVersusStats === 'function') ? normalizeVersusStats(d) : {
      wins: d.pvpWins||0, losses: d.pvpLosses||0, draws: d.pvpDraws||0,
      points: d.pvpPoints||0, winRate: 0, total: 0
    };
    return {
      uid,
      displayName: d.displayName || 'Player',
      avatar: d.avatar || '🐶',
      online: !!d.online,
      lastSeen: d.lastSeen || null,
      level: d.level || 1,
      mapNormal: d.mapNormal || 0,
      mapSecret: d.mapSecret || 0,
      couplePartnerName: d.couplePartnerName || '',
      couplePairedAt: d.couplePairedAt || null,
      visMaps: d.visMaps !== false,
      visCaro: d.visCaro !== false,
      visVersus: d.visVersus !== false,
      stats,
      versusStats
    };
  }catch(e){
    console.warn('[online] fetchPlayerPublicProfile', e);
    return null;
  }
}

async function _writeFriendDoc(ownerUid, friend){
  if(!_onlineDb || !ownerUid || !friend || !friend.uid) return;
  await _onlineDb.collection('players').doc(ownerUid)
    .collection('friends').doc(friend.uid)
    .set({
      name: friend.name || 'Player',
      avatar: friend.avatar || '🐶',
      addedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

/** Gửi lời mời kết bạn — đối phương chấp nhận / từ chối */
async function sendFriendRequest(friend){
  if(!friend || !friend.uid) return { ok:false, reason:'need_id' };
  if(typeof isFriend === 'function' && isFriend(friend.uid)) return { ok:true, already:true };
  if(typeof friendSlotsLeft === 'function' && friendSlotsLeft() < 1){
    return { ok:false, reason:'cap', max: typeof maxFriendsForLevel==='function'?maxFriendsForLevel(typeof playerLevel==='number'?playerLevel:1):20 };
  }
  if(typeof hasOutgoingFriendRequest === 'function' && hasOutgoingFriendRequest(friend.uid)){
    return { ok:true, pending:true };
  }
  try{
    await ensureOnlineAuth();
    if(!_onlineDb || !_onlineUid) return { ok:false, reason:'offline' };
    if(friend.uid === _onlineUid) return { ok:false, reason:'self' };
    await _onlineDb.collection('players').doc(friend.uid)
      .collection('friendRequests').doc(_onlineUid)
      .set({
        fromUid: _onlineUid,
        fromName: getOnlineDisplayName(),
        fromAvatar: (typeof getPlayerAvatar === 'function') ? getPlayerAvatar() : '🐶',
        toUid: friend.uid,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    if(typeof markOutgoingFriendRequest === 'function'){
      markOutgoingFriendRequest({
        uid: friend.uid,
        name: friend.name || 'Player',
        avatar: friend.avatar || '🐶'
      });
    }
    return { ok:true, pending:true };
  }catch(e){
    console.warn('[online] sendFriendRequest', e);
    return { ok:false, reason:'error' };
  }
}

/** @deprecated — dùng sendFriendRequest; giữ alias để không vỡ chỗ gọi cũ */
async function addOnlineFriend(friend){
  return sendFriendRequest(friend);
}

async function respondFriendRequest(fromUid, accept){
  if(!_onlineDb || !_onlineUid || !fromUid) return { ok:false };
  const ref = _onlineDb.collection('players').doc(_onlineUid).collection('friendRequests').doc(fromUid);
  try{
    const snap = await ref.get();
    if(!snap.exists) return { ok:false, reason:'missing' };
    const data = snap.data() || {};
    if(accept){
      if(typeof friendSlotsLeft === 'function' && friendSlotsLeft() < 1){
        return { ok:false, reason:'cap' };
      }
      const them = {
        uid: fromUid,
        name: data.fromName || 'Player',
        avatar: data.fromAvatar || '🐶'
      };
      const me = {
        uid: _onlineUid,
        name: getOnlineDisplayName(),
        avatar: (typeof getPlayerAvatar === 'function') ? getPlayerAvatar() : '🐶'
      };
      const local = (typeof addFriendLocal === 'function') ? addFriendLocal(them) : { ok:false };
      if(!local.ok && !local.already) return local;
      await _writeFriendDoc(_onlineUid, them);
      await ref.set({ status: 'accepted', respondedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      // Báo cho người gửi — họ tự thêm bạn khi nhận accepted_notice
      try{
        await _onlineDb.collection('players').doc(fromUid)
          .collection('friendRequests').doc(_onlineUid)
          .set({
            fromUid: _onlineUid,
            fromName: me.name,
            fromAvatar: me.avatar,
            toUid: fromUid,
            status: 'accepted_notice',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
      }catch(e2){}
      return { ok:true, accepted:true, friend: them };
    }
    await ref.set({ status: 'declined', respondedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { ok:true, declined:true };
  }catch(e){
    console.warn('[online] respondFriendRequest', e);
    return { ok:false, reason:'error' };
  }
}

let _friendReqUnsub = null;
const _seenFriendReqIds = new Set();

function stopFriendRequestListener(){
  if(_friendReqUnsub){ try{ _friendReqUnsub(); }catch(e){} _friendReqUnsub = null; }
}

function startFriendRequestListener(onIncoming){
  stopFriendRequestListener();
  if(!_onlineDb || !_onlineUid) return;
  _friendReqUnsub = _onlineDb.collection('players').doc(_onlineUid)
    .collection('friendRequests')
    .onSnapshot(snap=>{
      snap.docChanges().forEach(chg=>{
        if(chg.type !== 'added' && chg.type !== 'modified') return;
        const d = chg.doc.data() || {};
        const id = chg.doc.id;
        if(d.status === 'pending' && d.fromUid && d.fromUid !== _onlineUid){
          if(isBlocked(d.fromUid)) return;
          const key = 'p:'+id+':'+(d.createdAt && d.createdAt.seconds ? d.createdAt.seconds : '');
          if(_seenFriendReqIds.has('p:'+id)) return;
          _seenFriendReqIds.add('p:'+id);
          const payload = {
            id,
            fromUid: d.fromUid,
            fromName: d.fromName || 'Player',
            fromAvatar: d.fromAvatar || '🐶'
          };
          const cb = onIncoming || (typeof window.onFriendRequestIncoming === 'function' ? window.onFriendRequestIncoming : null);
          if(typeof cb === 'function') cb(payload);
        }
        if(d.status === 'accepted_notice' && d.fromUid){
          if(_seenFriendReqIds.has('a:'+id)) return;
          _seenFriendReqIds.add('a:'+id);
          if(typeof addFriendLocal === 'function'){
            addFriendLocal({ uid: d.fromUid, name: d.fromName, avatar: d.fromAvatar });
          }
          if(typeof clearOutgoingFriendRequest === 'function') clearOutgoingFriendRequest(d.fromUid);
          try{
            _onlineDb.collection('players').doc(_onlineUid).collection('friends').doc(d.fromUid)
              .set({
                name: d.fromName || 'Player',
                avatar: d.fromAvatar || '🐶',
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true });
          }catch(e){}
          try{ showComboFlash(0,false,'🤝 '+(d.fromName||'Player')+' đã chấp nhận kết bạn'); }catch(e){}
          try{ chg.doc.ref.delete(); }catch(e2){}
        }
      });
    }, err => console.warn('[online] friendRequests', err));
}

// ── Chặn người dùng (block) ────────────────────────────────────
const _blockedUids = new Set();

function isBlocked(uid){
  return !!(uid && _blockedUids.has(uid));
}

function getBlockedList(){
  return Array.from(_blockedUids.values());
}

async function loadBlockedList(){
  if(!_onlineDb || !_onlineUid) return [];
  try{
    const snap = await _onlineDb.collection('players').doc(_onlineUid).collection('blocked').get();
    _blockedUids.clear();
    const out = [];
    snap.forEach(doc=>{
      _blockedUids.add(doc.id);
      const d = doc.data() || {};
      out.push({ uid: doc.id, name: d.name || 'Player', avatar: d.avatar || '🐶' });
    });
    return out;
  }catch(e){
    console.warn('[online] loadBlockedList', e);
    return [];
  }
}

async function blockPlayer(uid, name, avatar){
  if(!uid) return { ok:false, reason:'need_id' };
  try{
    await ensureOnlineAuth();
    if(!_onlineDb || !_onlineUid) return { ok:false, reason:'offline' };
    if(uid === _onlineUid) return { ok:false, reason:'self' };
    await _onlineDb.collection('players').doc(_onlineUid)
      .collection('blocked').doc(uid)
      .set({
        name: name || 'Player',
        avatar: avatar || '🐶',
        blockedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    _blockedUids.add(uid);
    try{ if(typeof removeFriendLocal === 'function') removeFriendLocal(uid); }catch(e){}
    return { ok:true };
  }catch(e){
    console.warn('[online] blockPlayer', e);
    return { ok:false, reason:'error' };
  }
}

async function unblockPlayer(uid){
  if(!uid) return { ok:false, reason:'need_id' };
  try{
    if(!_onlineDb || !_onlineUid) return { ok:false, reason:'offline' };
    await _onlineDb.collection('players').doc(_onlineUid).collection('blocked').doc(uid).delete();
    _blockedUids.delete(uid);
    return { ok:true };
  }catch(e){
    console.warn('[online] unblockPlayer', e);
    return { ok:false, reason:'error' };
  }
}

// ── Báo cáo người dùng / nội dung vi phạm ──────────────────────
async function reportUser(opts){
  opts = opts || {};
  const reportedUid = opts.reportedUid;
  if(!reportedUid) return { ok:false, reason:'need_id' };
  try{
    await ensureOnlineAuth();
    if(!_onlineDb || !_onlineUid) return { ok:false, reason:'offline' };
    if(reportedUid === _onlineUid) return { ok:false, reason:'self' };
    await _onlineDb.collection('reports').add({
      reporterUid: _onlineUid,
      reporterName: getOnlineDisplayName(),
      reportedUid: reportedUid,
      reportedName: String(opts.reportedName || 'Player').slice(0, 60),
      reason: String(opts.reason || 'other').slice(0, 40),
      text: String(opts.text || '').slice(0, 500),
      context: String(opts.context || 'world').slice(0, 20),
      msgId: opts.msgId || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { ok:true };
  }catch(e){
    console.warn('[online] reportUser', e);
    return { ok:false, reason:'error' };
  }
}

async function sendFriendChat(friendUid, text, extra){
  if(!friendUid) return null;
  const dmId = await ensureDmDoc(friendUid);
  if(!dmId) return null;
  const payload = _chatMsgPayload(text);
  if(!payload) return null;
  if(extra && typeof extra === 'object'){
    Object.keys(extra).forEach(k=>{
      if(extra[k] != null && k !== 'ts' && k !== 'uid') payload[k] = extra[k];
    });
  }
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
 * Đảm bảo đang host lobby loại gameType (tạo mới nếu chưa có).
 * Trả về { gameType, roomId, code }.
 */
async function ensureHostLobby(gameType){
  await ensureOnlineAuth();
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
  return lobby;
}

/**
 * Mời bạn vào phòng. Nếu chưa host lobby → tạo phòng rồi mời.
 * gameType: 'caro' | 'versus'
 */
async function inviteFriendToRoom(friendUid, gameType){
  await ensureOnlineAuth();
  if(!friendUid) throw new Error('bad_friend');
  gameType = gameType === 'versus' ? 'versus' : 'caro';
  const lobby = await ensureHostLobby(gameType);
  const invite = await sendRoomInvite({
    toUid: friendUid,
    gameType: lobby.gameType,
    roomId: lobby.roomId,
    code: lobby.code
  });
  try{ await sendFriendRoomInvite(friendUid, lobby); }catch(e){ console.warn('[invite dm]', e); }
  return invite;
}

/** Đăng thẻ mời phòng lên chat thế giới (ai cũng bấm Vào được) */
async function postWorldRoomInvite(gameType){
  const lobby = await ensureHostLobby(gameType);
  await ensureOnlineAuth();
  if(!_onlineDb) throw new Error('online_disabled');
  const label = lobby.gameType === 'versus' ? 'Versus' : 'Caro';
  const text = '🎮 '+label+' · '+String(lobby.code||'')+' — vào phòng!';
  const payload = {
    uid: _onlineUid,
    name: getOnlineDisplayName(),
    avatar: getOnlineAvatar(),
    text: text.slice(0, 120),
    kind: 'room_invite',
    gameType: lobby.gameType,
    roomId: lobby.roomId,
    code: String(lobby.code || '').toUpperCase(),
    ts: firebase.firestore.FieldValue.serverTimestamp()
  };
  const ref = _onlineDb.collection('worldChat').doc('global').collection('messages').doc();
  await ref.set(payload);
  return { lobby, message: { id: ref.id, ...payload } };
}

/** Gửi thẻ mời phòng vào inbox (DM) bạn bè */
async function sendFriendRoomInvite(friendUid, lobby){
  if(!friendUid || !lobby || !lobby.roomId) return null;
  const dmId = await ensureDmDoc(friendUid);
  if(!dmId) return null;
  const label = lobby.gameType === 'versus' ? 'Versus' : 'Caro';
  const text = '🎮 '+label+' · '+String(lobby.code||'')+' — vào phòng!';
  const payload = {
    uid: _onlineUid,
    name: getOnlineDisplayName(),
    avatar: getOnlineAvatar(),
    text: text.slice(0, 120),
    kind: 'room_invite',
    gameType: lobby.gameType === 'versus' ? 'versus' : 'caro',
    roomId: lobby.roomId,
    code: String(lobby.code || '').toUpperCase(),
    ts: firebase.firestore.FieldValue.serverTimestamp()
  };
  const ref = _onlineDb.collection('dms').doc(dmId);
  const msgRef = ref.collection('messages').doc();
  await msgRef.set(payload);
  await ref.set({
    lastText: payload.text,
    lastAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastUid: _onlineUid
  }, { merge: true });
  return { id: msgRef.id, ...payload };
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
const ROOM_STALE_MS = 45 * 60 * 1000; // lưới an toàn chậm — chỉ dùng khi quét lại phòng của mình (F5 vào hub)
const ROOM_HEARTBEAT_MS = 8000;   // chủ phòng ghi "nhịp tim" mỗi 8s trong khi còn ở trong phòng
                                   // (trước là 4s — giảm còn 8s để giảm ~50% lượt ghi Firestore,
                                   // vẫn giữ tỉ lệ an toàn 1:3 so với ROOM_LIVE_STALE_MS như cũ)
const ROOM_LIVE_STALE_MS = 24000; // quá 24s không có nhịp tim → coi như chủ phòng đã mất kết nối/thoát

// ── Nhịp tim của chủ phòng (presence) ───────────────────────────
// Firestore không có onDisconnect() như Realtime Database, nên ta tự mô phỏng bằng
// cách chủ phòng ghi timestamp định kỳ; ai cũng có thể phát hiện + dọn phòng khi
// nhịp tim đó im lặng quá lâu (xem thêm rule "lastSeen" trong firestore.rules).
let _roomHeartbeatTimer = null;
let _roomHeartbeatRoomId = null;

function startRoomHeartbeat(roomId){
  stopRoomHeartbeat();
  if(!_onlineDb || !roomId) return;
  _roomHeartbeatRoomId = roomId;
  const beat = () => {
    if(!_onlineDb || _roomHeartbeatRoomId !== roomId) return;
    _onlineDb.collection('rooms').doc(roomId).update({
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(()=>{});
  };
  beat();
  _roomHeartbeatTimer = setInterval(beat, ROOM_HEARTBEAT_MS);
}

function stopRoomHeartbeat(){
  if(_roomHeartbeatTimer){ clearInterval(_roomHeartbeatTimer); _roomHeartbeatTimer = null; }
  _roomHeartbeatRoomId = null;
}

function _roomLastSeenMs(r){
  const t = r && (r.lastSeen || r.updatedAt || r.startedAt || r.createdAt);
  if(!t) return 0;
  try{
    if(typeof t.toMillis === 'function') return t.toMillis();
    if(t.seconds) return t.seconds * 1000;
  }catch(e){}
  return 0;
}

/** true nếu phòng không còn nhịp tim từ chủ phòng trong ROOM_LIVE_STALE_MS gần đây. */
function isRoomHostStale(r){
  const ms = _roomLastSeenMs(r);
  if(!ms) return false; // chưa có mốc thời gian nào → chưa đủ dữ liệu, tránh xoá nhầm phòng vừa tạo
  return (Date.now() - ms) > ROOM_LIVE_STALE_MS;
}

/** Xoá best-effort một phòng đã xác định là "chết" (chủ phòng hết nhịp tim). */
function deleteOnlineRoom(roomId){
  return _deleteRoomDoc(roomId);
}

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

/** Lấy điểm Caro hiện tại từ cache local (js/caro-ranks.js) một cách an toàn — dùng để
 * lưu kèm vào room doc lúc tạo/vào phòng, tránh phải đọc thêm players/{uid} chỉ để hiển thị
 * danh hiệu trong phòng chờ. */
/** Lấy điểm Versus (Đấu 1-1) hiện tại từ cache local (js/versus-ranks.js) một cách an
 * toàn — dùng để lưu kèm vào room doc lúc tạo/vào phòng, giống cách làm với Caro. */
function _myVersusPointsSafe(){
  try{
    if(typeof getLocalVersusStats === 'function') return getLocalVersusStats().points || 0;
  }catch(e){}
  return null;
}

function _myCaroPointsSafe(){
  try{
    if(typeof getLocalCaroStats === 'function') return getLocalCaroStats().points || 0;
  }catch(e){}
  return null;
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
        hostAvatar: avatar,
        hostCaroPoints: _myCaroPointsSafe(),
        hostVersusPoints: _myVersusPointsSafe()
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
    hostBrickSkin: (typeof getActiveBrickSkin === 'function') ? getActiveBrickSkin() : null,
    hostBoardSkin: (typeof getActiveBoardSkin === 'function') ? getActiveBoardSkin() : null,
    hostCaroPoints: _myCaroPointsSafe(),
    guestCaroPoints: null,
    hostVersusPoints: _myVersusPointsSafe(),
    guestVersusPoints: null,
    guestBrickSkin: null,
    guestBoardSkin: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
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
    guestCaroPoints: _myCaroPointsSafe(),
    guestVersusPoints: _myVersusPointsSafe(),
    guestBrickSkin: (typeof getActiveBrickSkin === 'function') ? getActiveBrickSkin() : null,
    guestBoardSkin: (typeof getActiveBoardSkin === 'function') ? getActiveBoardSkin() : null,
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
      guestCaroPoints: _myCaroPointsSafe(),
      guestVersusPoints: _myVersusPointsSafe(),
      guestBrickSkin: (typeof getActiveBrickSkin === 'function') ? getActiveBrickSkin() : null,
      guestBoardSkin: (typeof getActiveBoardSkin === 'function') ? getActiveBoardSkin() : null,
      guestReady: true,
      status: 'ready'
    });
    return {
      roomId,
      ...d,
      guestId: uid,
      guestName: name,
      guestAvatar: avatar,
      guestCaroPoints: _myCaroPointsSafe(),
      guestVersusPoints: _myVersusPointsSafe(),
      guestBrickSkin: (typeof getActiveBrickSkin === 'function') ? getActiveBrickSkin() : null,
      guestBoardSkin: (typeof getActiveBoardSkin === 'function') ? getActiveBoardSkin() : null,
      guestReady: true,
      status: 'ready'
    };
  });
}

async function leaveOnlineRoom(roomId){
  if(!_onlineDb || !roomId) return;
  // Dừng nhịp tim ngay lập tức nếu đây là phòng mình đang host — không chờ vòng lặp tiếp theo.
  if(_roomHeartbeatRoomId === roomId) stopRoomHeartbeat();
  const ref = _onlineDb.collection('rooms').doc(roomId);
  const snap = await ref.get();
  if(!snap.exists) return;
  const d = snap.data();
  const uid = _onlineUid;
  if(d.hostId === uid){
    // Chủ phòng thoát (đóng tab / bấm thoát / mất kết nối) → luôn xoá phòng ngay lập tức,
    // kể cả khi đang có khách trong phòng. Khách sẽ nhận sự kiện 'deleted' qua listenOnlineRoom
    // và được báo "Chủ phòng đã rời phòng" rồi tự động về danh sách phòng (xem caro.js).
    await ref.delete();
  } else if(d.guestId === uid){
    await ref.update({
      guestId: null, guestName: null, guestAvatar: null, guestReady: false, status: 'open',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  stopListeningRoom();
}

/**
 * Best-effort: đóng tab / F5 / thoát app → xoá NGAY phòng đang host, dù đang có khách
 * hay đang chơi dở (yêu cầu: chủ phòng thoát dưới bất kỳ hình thức nào cũng phải dọn phòng).
 * Đây chỉ là lớp "nhanh nhất có thể" khi trình duyệt còn kịp bắn sự kiện; trường hợp mất
 * mạng đột ngột / crash / kill app không bắn được sự kiện này thì đã có cơ chế nhịp tim
 * (startRoomHeartbeat/isRoomHostStale ở trên) tự dọn trong tối đa ~ROOM_LIVE_STALE_MS.
 */
function bindOnlineRoomUnloadCleanup(){
  if(bindOnlineRoomUnloadCleanup._done) return;
  bindOnlineRoomUnloadCleanup._done = true;
  const flush = ()=>{
    try{
      const uid = _onlineUid;
      const db = _onlineDb;
      if(!uid || !db || typeof db.collection !== 'function') return;
      db.collection('rooms').where('hostId', '==', uid).limit(10).get().then(snap=>{
        snap.docs.forEach(doc=>{
          const d = doc.data() || {};
          if(d.status === 'open' || d.status === 'ready' || d.status === 'playing'){
            doc.ref.delete().catch(()=>{});
          }
        });
      }).catch(()=>{});
    }catch(e){}
  };
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  // Lưu ý: KHÔNG dùng 'visibilitychange' để xoá ngay — chuyển tab/khoá màn hình tạm thời
  // không phải là "thoát phòng". Trường hợp app bị đưa xuống nền hẳn/kill/mất mạng được
  // xử lý bởi nhịp tim (heartbeat) ở trên: timer sẽ bị trình duyệt tạm dừng khi ở nền, nên
  // sau tối đa ~ROOM_LIVE_STALE_MS người khác sẽ tự phát hiện phòng "chết" và dọn.
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
    hostBrickSkin: (typeof getActiveBrickSkin === 'function') ? getActiveBrickSkin() : (d.hostBrickSkin || null),
    hostBoardSkin: (typeof getActiveBoardSkin === 'function') ? getActiveBoardSkin() : (d.hostBoardSkin || null),
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
  let raw = String(text || '').trim().slice(0, 120);
  if(!raw) return null;
  if(typeof ProfanityFilter !== 'undefined'){
    raw = ProfanityFilter.filterText(raw);
  }
  return {
    uid: _onlineUid,
    name: getOnlineDisplayName(),
    avatar: (typeof getPlayerAvatar === 'function') ? getPlayerAvatar() : '🐶',
    text: raw,
    caroPoints: _myCaroPointsSafe(),
    versusPoints: _myVersusPointsSafe(),
    ts: firebase.firestore.FieldValue.serverTimestamp()
  };
}

/** Chat trong phòng (Caro / Versus) — hỗ trợ nhiều listener */
async function sendRoomChat(roomId, text, extra){
  if(!_onlineDb || !roomId) return null;
  const payload = _chatMsgPayload(text);
  if(!payload) return null;
  if(extra && typeof extra === 'object'){
    Object.keys(extra).forEach(k=>{
      if(extra[k] != null && k !== 'ts' && k !== 'uid') payload[k] = extra[k];
    });
  }
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
        if(isBlocked(msg.uid)) return;
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
          const msg = { id: chg.doc.id, ...chg.doc.data() };
          if(isBlocked(msg.uid)) return;
          cb(msg);
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
            const msg = { id: chg.doc.id, ...chg.doc.data() };
            if(isBlocked(msg.uid)) return;
            cb(msg);
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
// Ghép trận Caro theo hạng liền kề (chỉ cho phép chênh lệch tối đa 1 bậc danh hiệu) —
// ĐANG TẮT vì mới ra mắt, cần ghép rộng cho đủ người chơi. Đổi thành true khi đã đông
// người chơi hơn và muốn ghép trận công bằng hơn theo trình độ.
const CARO_RANK_MATCH_RESTRICT = false;

/** Chỉ số bậc danh hiệu (0 = Tân thủ, ...) ứng với 1 mức điểm — dùng cho lọc ghép trận
 * theo hạng liền kề. Đọc trực tiếp mảng CARO_RANKS (js/caro-ranks.js) một cách an toàn. */
function _caroRankIndexSafe(points){
  try{
    if(typeof CARO_RANKS === 'undefined') return null;
    const pts = Math.max(0, points || 0);
    let idx = 0;
    for(let i=0;i<CARO_RANKS.length;i++){ if(pts >= CARO_RANKS[i].min) idx = i; }
    return idx;
  }catch(e){ return null; }
}

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
    caroPoints: gameType === 'caro' ? _myCaroPointsSafe() : null,
    mode: 'casual',
    gameType,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const tryPair = async () => {
    const mine = await qRef.get();
    if(!mine.exists) return;
    const all = await _onlineDb.collection('matchQueue').orderBy('createdAt', 'asc').limit(20).get();
    const candidates = all.docs.filter(d => d.id !== uid && (d.data().gameType || 'versus') === gameType);
    let other;
    if(gameType === 'caro' && CARO_RANK_MATCH_RESTRICT){
      const myIdx = _caroRankIndexSafe(mine.data().caroPoints);
      other = candidates.find(d => {
        const theirIdx = _caroRankIndexSafe(d.data().caroPoints);
        // Nếu thiếu dữ liệu hạng của 1 trong 2 bên (tài khoản cũ chưa có field này) thì vẫn
        // cho ghép, tránh việc không bao giờ tìm được đối thủ chỉ vì thiếu dữ liệu.
        return myIdx == null || theirIdx == null || Math.abs(myIdx - theirIdx) <= 1;
      });
    } else {
      other = candidates[0];
    }
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
  // Lưới an toàn cho trường hợp lỡ sự kiện onSnapshot (race) — onSnapshot đã tự gọi
  // lại tryPair() mỗi khi matchQueue đổi, nên không cần poll dày; 6s là đủ dự phòng
  // mà giảm đáng kể số lượt đọc/ghi Firestore so với 2s trước đây.
  _matchmakingTimer = setInterval(tryPair, 6000);
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
  const _gcAttempted = new Set(); // tránh gửi nhiều lệnh xoá trùng cho cùng 1 phòng chết
  let _lastDocs = [];
  const emit = () => {
    // Phòng mà chủ đã im nhịp tim quá ROOM_LIVE_STALE_MS → coi như đã thoát:
    // ẩn khỏi danh sách NGAY (không đợi xoá xong) + tranh dọn luôn document đó.
    const rooms = _lastDocs.filter(r => {
      if(!isRoomHostStale(r)) return true;
      if(!_gcAttempted.has(r.roomId)){
        _gcAttempted.add(r.roomId);
        deleteOnlineRoom(r.roomId);
      }
      return false;
    });
    rooms.sort((a, b) => {
      const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
      return ta - tb;
    });
    if(typeof onUpdate === 'function') onUpdate(rooms);
  };
  const unsub = q.onSnapshot(snap => {
    _lastDocs = snap.docs.map(doc => ({ roomId: doc.id, ...doc.data() }));
    _gcAttempted.clear(); // dữ liệu mới → cho phép tranh dọn lại nếu vẫn còn phòng chết
    emit();
  }, err => {
    console.warn('['+gameType+'-rooms]', err);
    if(typeof onUpdate === 'function') onUpdate([]);
  });
  // Firestore chỉ bắn snapshot khi dữ liệu đổi — nếu chủ phòng im re bặt (mất mạng) thì
  // không có snapshot mới nào tới cả. Cần tự chấm lại độ "sống" định kỳ để danh sách vẫn
  // ẩn phòng chết đúng lúc, không phải chờ ai đó vô tình làm phòng thay đổi mới cập nhật.
  const staleCheckTimer = setInterval(emit, 3000);
  const unsubAndClear = () => { unsub(); clearInterval(staleCheckTimer); };
  if(unsubKey === '_openCaroRoomsUnsub') _openCaroRoomsUnsub = unsubAndClear;
  else if(unsubKey === '_openVersusRoomsUnsub') _openVersusRoomsUnsub = unsubAndClear;
}

// ── Kết quả & BXH Caro ────────────────────────────────────────
async function finalizeCaroMatch(roomId, winnerSlot){
  if(!_onlineDb || !roomId) return;
  const ref = _onlineDb.collection('rooms').doc(roomId);
  try{
    await _onlineDb.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if(!snap.exists || snap.data().status === 'finished') return;
      const d = snap.data();
      const winnerId = winnerSlot === 'host' ? d.hostId : (winnerSlot === 'guest' ? d.guestId : null);
      tx.update(ref, {
        status: 'finished',
        winnerId: winnerId || null,
        isDraw: winnerSlot === 'draw',
        endedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  }catch(e){ return; }
  // Cộng điểm thắng/thua giờ do Cloud Function applyMatchResult xử lý
  // (kích hoạt tự động khi status của phòng chuyển sang 'finished').
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

  // Cộng điểm thắng/thua giờ do Cloud Function applyMatchResult xử lý
  // (kích hoạt tự động khi status của phòng chuyển sang 'finished').
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

// ── Ghi điểm — nay đi qua Cloud Function (Admin SDK), client không còn
// quyền ghi trực tiếp vào players.bestScore / periodScores/*/entries/{uid}.
// Xem functions/index.js: submitSoloScore; firestore.rules: scoreFieldsUnchanged(),
// periodScores entries create/update: false.
let _onlineFunctions = null;
function _getOnlineFunctions(){
  if(_onlineFunctions) return _onlineFunctions;
  if(typeof firebase === 'undefined' || !firebase.functions) return null;
  _onlineFunctions = firebase.app().functions('asia-southeast1');
  return _onlineFunctions;
}

// Gọi lúc bắt đầu ván chơi đơn — server ghi mốc thời gian (currentRunStartedAt) để
// submitSoloScore tính điểm/giây hợp lý, chặn báo điểm khống. Không chặn game bắt đầu
// nếu lỗi mạng — chỉ đơn giản là lần nộp điểm sau đó sẽ bị Cloud Function từ chối.
async function startSoloRunOnline(){
  try{
    if(!await initOnlineServices()) return;
    const fns = _getOnlineFunctions();
    if(!fns) return;
    await fns.httpsCallable('startSoloRun')();
  }catch(e){
    console.warn('[online] startSoloRunOnline', e);
  }
}

async function submitGlobalSoloScore(score){
  if(!score || score <= 0) return;
  if(!await initOnlineServices()) return;
  const region = (typeof getPlayerRegion === 'function') ? getPlayerRegion() : { country:'VN', continent:'AS' };
  try{
    const fns = _getOnlineFunctions();
    if(!fns) return;
    await fns.httpsCallable('submitSoloScore')({ score: Math.floor(score), region });
  }catch(e){
    console.warn('[online] submitGlobalSoloScore', e);
  }
}

async function submitPeriodScoreOnline(score, region){
  if(!score || score <= 0) return;
  if(!await initOnlineServices() || !_onlineUid) return;
  region = region || (typeof getPlayerRegion === 'function' ? getPlayerRegion() : { country:'VN', continent:'AS' });
  try{
    const fns = _getOnlineFunctions();
    if(!fns) return;
    await fns.httpsCallable('submitSoloScore')({ score: Math.floor(score), region });
  }catch(e){
    console.warn('[online] submitPeriodScoreOnline', e);
  }
}

// ── Mời bạn (referral) — xem functions/index.js: claimReferral/claimPendingRewards.
// Thưởng không cấp ngay lúc nhập mã: server chỉ đánh dấu "chờ", tiền thật được
// cộng vào hộp thư chờ (referralRewardGold/Diamond) khi người được mời chơi xong
// 1 ván (submitSoloScore) — claimPendingReferralRewards() rút hộp thư đó về ví.
async function submitReferralCode(code){
  if(!code) return { ok:false, reason:'empty' };
  if(!await initOnlineServices()) return { ok:false, reason:'offline' };
  try{
    const fns = _getOnlineFunctions();
    if(!fns) return { ok:false, reason:'no_functions' };
    await fns.httpsCallable('claimReferral')({ code: String(code).trim().toUpperCase() });
    return { ok:true };
  }catch(e){
    return { ok:false, reason: (e && e.code) || 'error' };
  }
}

async function claimPendingReferralRewards(){
  if(!await initOnlineServices()) return;
  try{
    const fns = _getOnlineFunctions();
    if(!fns) return;
    const res = await fns.httpsCallable('claimPendingRewards')({});
    const { gold, diamond } = res.data || {};
    if(gold > 0 && typeof grantGold === 'function') grantGold(gold, '🎁 Thưởng mời bạn');
    if(diamond > 0 && typeof grantDiamonds === 'function') grantDiamonds(diamond, '🎁 Thưởng mời bạn');
  }catch(e){
    console.warn('[online] claimPendingReferralRewards', e);
  }
}

/** Dùng Web Share API — Android tự liệt kê Zalo/Messenger/SMS... trong share sheet, không cần SDK riêng. */
function shareInviteLink(){
  const prof = (typeof getPlayerProfile === 'function') ? getPlayerProfile() : null;
  const code = prof && prof.publicId ? prof.publicId : '';
  const text = '🎮 Chơi ChromaBlast cùng mình! Nhập mã mời ' + code + ' để cả 2 nhận thưởng 💎';
  if(navigator.share){
    navigator.share({ text }).catch(()=>{});
  } else if(navigator.clipboard){
    navigator.clipboard.writeText(text).catch(()=>{});
  }
}

async function fetchPeriodLeaderboardOnline(periodId, limit){
  if(!periodId) return [];
  if(!await initOnlineServices()) return [];
  try{
    const snap = await _onlineDb.collection('periodScores').doc(periodId)
      .collection('entries').orderBy('score', 'desc').limit(limit || 100).get();
    return snap.docs.map((doc, i)=>{
      const d = doc.data() || {};
      return {
        rank: i + 1,
        name: d.name || 'Player',
        score: d.score || 0,
        playerId: doc.id,
        avatar: d.avatar || '🐶',
        country: d.country,
        continent: d.continent
      };
    }).filter(e => e.score > 0);
  }catch(e){
    console.warn('[period LB]', e);
    return [];
  }
}

async function claimPeriodRewardOnline(periodId, scope, rank, reward){
  if(!periodId || !await initOnlineServices() || !_onlineUid) return;
  try{
    await _onlineDb.collection('players').doc(_onlineUid)
      .collection('lbClaims').doc(periodId + '_' + (scope||'world'))
      .set({
        periodId,
        scope: scope || 'world',
        rank: rank|0,
        gold: (reward && reward.gold)|0,
        diamond: (reward && reward.diamond)|0,
        claimedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
  }catch(e){}
}

async function fetchFriendsLeaderboard(limit){
  const friends = (typeof getFriendsList === 'function') ? getFriendsList() : [];
  if(!await initOnlineServices()) return [];
  const uids = friends.map(f => f && f.uid).filter(Boolean).slice(0, 60);
  if(_onlineUid) uids.push(_onlineUid);
  const out = [];
  await Promise.all(uids.map(async uid=>{
    try{
      const snap = await _onlineDb.collection('players').doc(uid).get();
      if(!snap.exists) return;
      const d = snap.data() || {};
      const score = d.bestScore || 0;
      if(score <= 0) return;
      out.push({
        name: d.displayName || 'Player',
        score,
        playerId: uid,
        avatar: d.avatar || '🐶',
        country: d.country,
        continent: d.continent
      });
    }catch(e){}
  }));
  out.sort((a,b)=> b.score - a.score);
  return out.slice(0, limit || 100).map((e,i)=> Object.assign(e, { rank: i+1 }));
}
