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
function getOnlineDisplayName(){ return _onlineDisplayName || (typeof _localPlayerName === 'function' ? _localPlayerName() : 'Player'); }

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
  await _onlineDb.collection('players').doc(_onlineUid).set({
    displayName: name,
    level: (typeof playerLevel !== 'undefined' ? playerLevel : 1),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function signInWithGoogle(){
  await ensureOnlineAuth();
  const provider = new firebase.auth.GoogleAuthProvider();
  await _onlineAuth.signInWithPopup(provider);
  _onlineUid = _onlineAuth.currentUser.uid;
  const name = _onlineAuth.currentUser.displayName;
  if(name) _onlineDisplayName = name;
  await _upsertPlayerProfile();
  return _onlineUid;
}

// ── Phòng ─────────────────────────────────────────────────────
async function createOnlineRoom(opts){
  opts = opts || {};
  const gameType = opts.gameType || 'versus';
  const uid = await ensureOnlineAuth();
  const code = _roomCode();
  const name = getOnlineDisplayName();
  const ref = _onlineDb.collection('rooms').doc();
  await ref.set({
    code,
    gameType,
    hostId: uid,
    guestId: null,
    hostName: name,
    guestName: null,
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
  return { roomId: ref.id, code };
}

async function joinOnlineRoomByCode(code, opts){
  opts = opts || {};
  const gameType = opts.gameType || null;
  const uid = await ensureOnlineAuth();
  const name = getOnlineDisplayName();
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
  await doc.ref.update({
    guestId: uid,
    guestName: name,
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
  const ref = _onlineDb.collection('rooms').doc(roomId);
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
      guestReady: true,
      status: 'ready'
    });
    return {
      roomId,
      ...d,
      guestId: uid,
      guestName: name,
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
    if(d.guestId) await ref.update({ hostId: d.guestId, hostName: d.guestName, guestId: null, guestName: null, status: 'open', guestReady: false });
    else await ref.delete();
  } else if(d.guestId === uid){
    await ref.update({ guestId: null, guestName: null, guestReady: false, status: 'open' });
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
  stopListeningRoom();
  if(!_onlineDb) return;
  _roomUnsub = _onlineDb.collection('rooms').doc(roomId).onSnapshot(doc => {
    if(!doc.exists){ cb({ type:'deleted' }); return; }
    cb({ type:'room', data: { roomId: doc.id, ...doc.data() } });
  });
}

function listenOnlineMoves(roomId, cb){
  if(_movesUnsub) _movesUnsub();
  if(!_onlineDb) return;
  _movesUnsub = _onlineDb.collection('rooms').doc(roomId).collection('moves')
    .orderBy('seq', 'asc')
    .onSnapshot(snap => {
      snap.docChanges().forEach(chg => {
        if(chg.type === 'added') cb(chg.doc.data());
      });
    });
}

function stopListeningRoom(){
  if(_roomUnsub){ _roomUnsub(); _roomUnsub = null; }
  if(_movesUnsub){ _movesUnsub(); _movesUnsub = null; }
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
  if(!_onlineDb || !roomId) return;
  const ref = _onlineDb.collection('rooms').doc(roomId);
  await _onlineDb.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if(!snap.exists) return;
    const seq = (snap.data().moveSeq || 0) + 1;
    tx.update(ref, { moveSeq: seq });
    const moveRef = ref.collection('moves').doc();
    tx.set(moveRef, {
      ...payload,
      seq,
      playerId: _onlineUid,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
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
  stopListeningOpenCaroRooms();
  if(!_onlineDb) return;
  const q = _onlineDb.collection('rooms')
    .where('gameType', '==', 'caro')
    .where('status', '==', 'open')
    .limit(30);
  _openCaroRoomsUnsub = q.onSnapshot(snap => {
    const rooms = snap.docs.map(doc => ({ roomId: doc.id, ...doc.data() }));
    rooms.sort((a, b) => {
      const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
      return ta - tb;
    });
    if(typeof onUpdate === 'function') onUpdate(rooms);
  }, err => {
    console.warn('[caro-rooms]', err);
    if(typeof onUpdate === 'function') onUpdate([]);
  });
}

function stopListeningOpenCaroRooms(){
  if(_openCaroRoomsUnsub){ _openCaroRoomsUnsub(); _openCaroRoomsUnsub = null; }
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
