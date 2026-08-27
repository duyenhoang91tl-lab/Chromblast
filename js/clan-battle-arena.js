/* ══════════════════════════════════════════
   ĐẤU CLAN 2v2/3v3 — "Muông Thú Đại Chiến" — MÀN CHƠI THẬT (js/clan-battle-arena.js)
   Task 10 hoàn thiện: nơi DUY NHẤT thật sự gọi tới joystick.js / skill-button.js /
   health-bar.js / orientation-lock(-fallback).js.

   Vào từ js/clan-battle-team.js khi muongThuBattles/{id}.rtdbBattleId xuất hiện:
     openMuongThuArena(rtdbBattleId, myTeamId)

   Luồng: màn chọn nhân vật (mục 7, đếm ngược 10s) -> trận đấu thật (canvas +
   joystick + skill + đồng bộ RTDB ~10 lần/giây theo mục 1) -> màn kết quả
   (đọc clanBattles/{rtdbBattleId} do onClanBattleEventCreated/
   finalizeClanBattleOnTimeout — functions/index.js — ghi khi trận kết thúc).

   QUAN TRỌNG: client chỉ TỰ DỰ ĐOÁN (optimistic) va chạm ăn/skill để phản hồi
   nhanh trên canvas + gửi event lên RTDB; máu/eatCount/skillCharge HIỂN THỊ
   luôn đọc từ players/{uid}/state do Cloud Function ghi (nguồn xác thực duy
   nhất — mục 1 spec), không tự cộng máu ở client.

   Dùng riêng tiền tố _mtdcArena / mtdc-arena- để không đụng
   _mtdc / mtdc- của js/clan-battle-team.js.
══════════════════════════════════════════ */

let _mtdcArena = null;

function _mtdcRtdb() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    return firebase.database();
  } catch (e) {
    console.warn('[mtdc-arena] không khởi tạo được Realtime Database', e);
    return null;
  }
}

(function _mtdcArenaInjectStyleOnce() {
  if (document.getElementById('mtdc-arena-style')) return;
  const s = document.createElement('style');
  s.id = 'mtdc-arena-style';
  s.textContent = ''
    + '#mtdc-arena-root{position:fixed;inset:0;z-index:9700;background:#0a1410;overflow:hidden;font-family:sans-serif;}'
    + '#mtdc-arena-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;}'
    + '#mtdc-joystick-zone{position:absolute;left:0;bottom:0;width:45%;height:55%;z-index:2;}'
    + '#mtdc-skill-btn{position:absolute;right:24px;bottom:24px;z-index:3;}'
    + '#mtdc-roster-hud{position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;'
    + 'gap:12px;z-index:3;pointer-events:none;flex-wrap:wrap;}'
    + '.mtdc-hud-slot{pointer-events:none;}'
    + '#mtdc-timer{position:absolute;top:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:20px;'
    + 'font-weight:800;text-shadow:0 2px 4px rgba(0,0,0,.8);z-index:3;background:rgba(0,0,0,.35);'
    + 'padding:4px 14px;border-radius:10px;}'
    + '#mtdc-selection-view,#mtdc-result-view{position:absolute;inset:0;display:none;flex-direction:column;'
    + 'align-items:center;justify-content:center;background:rgba(5,8,12,.96);color:#fff;z-index:5;padding:20px;}'
    + '#mtdc-selection-view h2,#mtdc-result-view h2{font-size:20px;margin-bottom:6px;}'
    + '#mtdc-selection-countdown{font-size:32px;font-weight:800;color:#ffb703;margin-bottom:14px;}'
    + '#mtdc-selection-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;max-width:520px;width:100%;}'
    + '.mtdc-animal-btn{background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.15);border-radius:10px;'
    + 'color:#fff;padding:10px 4px;cursor:pointer;font-size:11px;}'
    + '.mtdc-animal-btn.picked{border-color:#4fd1c5;background:rgba(79,209,197,.22);}'
    + '.mtdc-animal-btn.taken{opacity:.35;cursor:not-allowed;}'
    + '.mtdc-animal-btn:disabled{cursor:default;}'
    + '.mtdc-animal-name{font-weight:700;margin-bottom:2px;}'
    + '.mtdc-animal-price{opacity:.7;font-size:10px;}'
    + '#mtdc-result-score{font-size:16px;margin:10px 0 18px;opacity:.85;}'
    + '#mtdc-result-close{padding:10px 24px;border-radius:10px;border:none;background:#a855f7;color:#fff;'
    + 'font-weight:700;cursor:pointer;}';
  document.head.appendChild(s);
})();

function _mtdcBuildArenaRoot() {
  const root = document.createElement('div');
  root.id = 'mtdc-arena-root';
  root.innerHTML =
      '<canvas id="mtdc-arena-canvas"></canvas>'
    + '<div id="mtdc-timer">--:--</div>'
    + '<div id="mtdc-roster-hud"></div>'
    + '<div id="mtdc-joystick-zone"></div>'
    + '<button type="button" id="mtdc-skill-btn" aria-label="Dùng kỹ năng"></button>'
    + '<div id="mtdc-selection-view">'
    +   '<h2>🐾 Chọn con vật của bạn</h2>'
    +   '<div id="mtdc-selection-countdown">10s</div>'
    +   '<div id="mtdc-selection-grid"></div>'
    + '</div>'
    + '<div id="mtdc-result-view">'
    +   '<h2 id="mtdc-result-title">—</h2>'
    +   '<div id="mtdc-result-score"></div>'
    +   '<button type="button" id="mtdc-result-close">Đóng</button>'
    + '</div>';
  document.body.appendChild(root);
  root.querySelector('#mtdc-result-close').addEventListener('click', closeMuongThuArena);
  _mtdcArena.root = root;
  _mtdcArena.canvas = root.querySelector('#mtdc-arena-canvas');
  _mtdcArena.ctx = _mtdcArena.canvas.getContext('2d');
  _mtdcResizeCanvas();
  window.addEventListener('resize', _mtdcResizeCanvas);
}

function _mtdcResizeCanvas() {
  if (!_mtdcArena || !_mtdcArena.canvas) return;
  const dpr = window.devicePixelRatio || 1;
  _mtdcArena.canvas.width = window.innerWidth * dpr;
  _mtdcArena.canvas.height = window.innerHeight * dpr;
  _mtdcArena.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function openMuongThuArena(rtdbBattleId, myTeamId) {
  if (_mtdcArena) _mtdcArenaCleanup();
  if (!_mtdcRtdb()) { _cbToast('⚠️ Không kết nối được Realtime Database'); return; }
  const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
  if (!uid) { _cbToast('⚠️ Bạn chưa đăng nhập'); return; }

  _mtdcArena = {
    battleId: rtdbBattleId,
    myUid: uid,
    myTeamId,
    meta: null,
    phase: 'loading',
    players: {},
    fruits: {},
    lastEventPushed: {},
    joystickVector: { dx: 0, dy: 0 },
    joystick: null,
    skillButton: null,
    healthBars: {},
    orientationLock: null,
    posWriteInterval: null,
    rafId: null,
    canvas: null,
    ctx: null,
    root: null,
    selectionCountdownInterval: null,
    autoPickCalled: false,
    finalizeCalled: false,
    metaListenerRef: null,
    playersListenerRef: null,
    fruitsListenerRef: null,
    resultUnsub: null,
  };

  _mtdcBuildArenaRoot();
  try { window.lockLandscapeOrientation && window.lockLandscapeOrientation(); } catch (e) {}
  _mtdcArena.orientationLock = (typeof initOrientationLock === 'function')
    ? initOrientationLock({ overlayMessage: 'Xoay ngang màn hình để vào trận Muông Thú Đại Chiến' })
    : null;

  _mtdcListenMeta();
  _mtdcListenPlayers();
  _mtdcListenFruits();
  _mtdcListenResult();
}

function closeMuongThuArena() { _mtdcArenaCleanup(); }

function _mtdcArenaCleanup() {
  if (!_mtdcArena) return;
  _mtdcStopBattleLoop();
  if (_mtdcArena.selectionCountdownInterval) clearInterval(_mtdcArena.selectionCountdownInterval);
  try { _mtdcArena.metaListenerRef && _mtdcArena.metaListenerRef.off(); } catch (e) {}
  try { _mtdcArena.playersListenerRef && _mtdcArena.playersListenerRef.off(); } catch (e) {}
  try { _mtdcArena.fruitsListenerRef && _mtdcArena.fruitsListenerRef.off(); } catch (e) {}
  try { if (_mtdcArena.resultUnsub) _mtdcArena.resultUnsub(); } catch (e) {}
  try { _mtdcArena.joystick && _mtdcArena.joystick.destroy(); } catch (e) {}
  try { _mtdcArena.skillButton && _mtdcArena.skillButton.destroy(); } catch (e) {}
  try { _mtdcArena.orientationLock && _mtdcArena.orientationLock.destroy(); } catch (e) {}
  try { window.unlockOrientation && window.unlockOrientation(); } catch (e) {}
  window.removeEventListener('resize', _mtdcResizeCanvas);
  if (_mtdcArena.root && _mtdcArena.root.parentNode) _mtdcArena.root.parentNode.removeChild(_mtdcArena.root);
  _mtdcArena = null;
}
function _mtdcStopBattleLoop() {
  if (!_mtdcArena) return;
  if (_mtdcArena.rafId) cancelAnimationFrame(_mtdcArena.rafId);
  _mtdcArena.rafId = null;
  if (_mtdcArena.posWriteInterval) clearInterval(_mtdcArena.posWriteInterval);
  _mtdcArena.posWriteInterval = null;
}

/* ── Lắng nghe RTDB ── */
function _mtdcListenMeta() {
  const ref = _mtdcRtdb().ref('battles/' + _mtdcArena.battleId + '/meta');
  _mtdcArena.metaListenerRef = ref;
  ref.on('value', (snap) => {
    if (!_mtdcArena) return;
    const meta = snap.val();
    if (!meta) return;
    const prevStatus = _mtdcArena.meta && _mtdcArena.meta.status;
    _mtdcArena.meta = meta;
    if (meta.status === 'selecting' && prevStatus !== 'selecting') {
      _mtdcArena.phase = 'selecting';
      _mtdcShowSelectionScreen();
    } else if (meta.status === 'active' && prevStatus !== 'active') {
      _mtdcArena.phase = 'battle';
      _mtdcShowBattleScreen();
    } else if (meta.status === 'finished' && prevStatus !== 'finished') {
      _mtdcArena.phase = 'ended';
      _mtdcStopBattleLoop();
    }
  });
}
function _mtdcListenPlayers() {
  const ref = _mtdcRtdb().ref('battles/' + _mtdcArena.battleId + '/players');
  _mtdcArena.playersListenerRef = ref;
  ref.on('value', (snap) => {
    if (!_mtdcArena) return;
    _mtdcArena.players = snap.val() || {};
    _mtdcSyncHealthBars();
    _mtdcSyncSkillButtonFromServer();
    if (_mtdcArena.phase === 'selecting') _mtdcUpdateSelectionPicksDisplay();
  });
}
function _mtdcListenFruits() {
  const ref = _mtdcRtdb().ref('battles/' + _mtdcArena.battleId + '/fruits');
  _mtdcArena.fruitsListenerRef = ref;
  ref.on('value', (snap) => {
    if (!_mtdcArena) return;
    _mtdcArena.fruits = snap.val() || {};
  });
}
function _mtdcListenResult() {
  const db = _cbDb();
  if (!db) return;
  _mtdcArena.resultUnsub = db.collection('clanBattles').doc(_mtdcArena.battleId).onSnapshot((doc) => {
    if (!_mtdcArena || !doc.exists) return;
    const data = doc.data();
    if (data && typeof data.winner !== 'undefined') _mtdcShowResultScreen(data);
  });
}

/* ── Màn chọn nhân vật (mục 7) ── */
function _mtdcShowSelectionScreen() {
  const root = _mtdcArena.root;
  root.querySelector('#mtdc-selection-view').style.display = 'flex';
  const grid = root.querySelector('#mtdc-selection-grid');
  const animals = window.ClanBattleCharacterSelection.ANIMALS;
  grid.innerHTML = animals.map((a) =>
    '<button type="button" class="mtdc-animal-btn" data-animal="' + a.id + '">'
    + '<div class="mtdc-animal-name">' + a.name + '</div>'
    + '<div class="mtdc-animal-price">' + (a.free ? 'Miễn phí' : a.price + ' 💎') + '</div>'
    + '</button>'
  ).join('');
  grid.querySelectorAll('.mtdc-animal-btn').forEach((btn) => {
    btn.addEventListener('click', () => _mtdcSubmitAnimalPick(btn.dataset.animal));
  });
  if (_mtdcArena.selectionCountdownInterval) clearInterval(_mtdcArena.selectionCountdownInterval);
  _mtdcArena.selectionCountdownInterval = setInterval(_mtdcUpdateSelectionCountdownDisplay, 250);
  _mtdcUpdateSelectionCountdownDisplay();
}
function _mtdcUpdateSelectionCountdownDisplay() {
  if (!_mtdcArena || !_mtdcArena.meta) return;
  const el = _mtdcArena.root && _mtdcArena.root.querySelector('#mtdc-selection-countdown');
  const remainMs = _mtdcArena.meta.selectionEndsAt - Date.now();
  if (el) el.textContent = Math.max(0, Math.ceil(remainMs / 1000)) + 's';
  if (remainMs <= 0 && !_mtdcArena.autoPickCalled) {
    _mtdcArena.autoPickCalled = true;
    _mtdcCallAutoPick();
  }
}
async function _mtdcCallAutoPick() {
  try {
    const fn = firebase.functions().httpsCallable('autoPickClanBattleAnimals');
    await fn({ battleId: _mtdcArena.battleId });
  } catch (e) { console.warn('[mtdc-arena] auto-pick thất bại', e); }
}
function _mtdcSubmitAnimalPick(animalId) {
  if (!_mtdcArena) return;
  const ref = _mtdcRtdb().ref('battles/' + _mtdcArena.battleId + '/selectionRequests/' + _mtdcArena.myUid);
  ref.set({ animalId, clientTs: Date.now() }).catch((e) => {
    _cbToast('⚠️ ' + ((e && e.message) || 'Chọn nhân vật thất bại'));
  });
  function onSelfReqChange(snap) {
    if (!_mtdcArena) { ref.off('value', onSelfReqChange); return; }
    const v = snap.val();
    if (v && v.rejected) {
      _cbToast('⚠️ Không chọn được con này: ' + v.rejected);
      ref.off('value', onSelfReqChange);
    } else {
      const me = _mtdcArena.players[_mtdcArena.myUid];
      if (me && me.state && me.state.animalId === animalId) ref.off('value', onSelfReqChange);
    }
  }
  ref.on('value', onSelfReqChange);
}
function _mtdcUpdateSelectionPicksDisplay() {
  if (!_mtdcArena || _mtdcArena.phase !== 'selecting' || !_mtdcArena.meta) return;
  const grid = _mtdcArena.root && _mtdcArena.root.querySelector('#mtdc-selection-grid');
  if (!grid) return;
  const meta = _mtdcArena.meta;
  const myTeamIds = _mtdcArena.myTeamId === 'A' ? meta.teamAPlayerIds : meta.teamBPlayerIds;
  const takenByTeammate = myTeamIds
    .filter((id) => id !== _mtdcArena.myUid)
    .map((id) => _mtdcArena.players[id] && _mtdcArena.players[id].state && _mtdcArena.players[id].state.animalId)
    .filter(Boolean);
  const me = _mtdcArena.players[_mtdcArena.myUid];
  const myPicked = me && me.state ? me.state.animalId : null;
  grid.querySelectorAll('.mtdc-animal-btn').forEach((btn) => {
    const id = btn.dataset.animal;
    const takenByMate = takenByTeammate.includes(id);
    btn.classList.toggle('taken', takenByMate && myPicked !== id);
    btn.classList.toggle('picked', myPicked === id);
    btn.disabled = !!myPicked || takenByMate;
  });
}

/* ── Trận đấu thật ── */
function _mtdcShowBattleScreen() {
  const root = _mtdcArena.root;
  root.querySelector('#mtdc-selection-view').style.display = 'none';
  if (_mtdcArena.selectionCountdownInterval) { clearInterval(_mtdcArena.selectionCountdownInterval); _mtdcArena.selectionCountdownInterval = null; }
  _mtdcSetupHud();
  _mtdcStartPositionWriter();
  _mtdcStartGameLoop();
}
function _mtdcSetupHud() {
  const root = _mtdcArena.root;
  const joyZone = root.querySelector('#mtdc-joystick-zone');
  _mtdcArena.joystick = new BattleJoystick(joyZone, {
    maxRadius: 50,
    onMove: (v) => { _mtdcArena.joystickVector = { dx: v.dx, dy: v.dy }; },
    onEnd: () => { _mtdcArena.joystickVector = { dx: 0, dy: 0 }; },
  });
  const skillEl = root.querySelector('#mtdc-skill-btn');
  _mtdcArena.skillButton = new SkillButton(skillEl, {
    maxCharge: window.ClanBattleFormulas.SKILL_CHARGE_MAX,
    onActivate: _mtdcActivateSkill,
  });

  const rosterEl = root.querySelector('#mtdc-roster-hud');
  rosterEl.innerHTML = '';
  const meta = _mtdcArena.meta;
  const allIds = [].concat(meta.teamAPlayerIds || [], meta.teamBPlayerIds || []);
  allIds.forEach((id) => {
    const el = document.createElement('div');
    el.className = 'mtdc-hud-slot';
    rosterEl.appendChild(el);
    const isOwnTeam = (_mtdcArena.myTeamId === 'A' ? meta.teamAPlayerIds : meta.teamBPlayerIds).includes(id);
    _mtdcArena.healthBars[id] = new HealthBarHUD(el, {
      name: id === _mtdcArena.myUid ? 'Bạn' : id.slice(0, 6),
      maxHP: window.ClanBattleFormulas.BASE_HP,
      isOwnTeam,
    });
  });
  _mtdcSyncHealthBars();
  _mtdcSyncSkillButtonFromServer();
}
function _mtdcSyncHealthBars() {
  if (!_mtdcArena) return;
  Object.keys(_mtdcArena.healthBars).forEach((id) => {
    const p = _mtdcArena.players[id];
    const hp = p && p.state ? p.state.currentHP : window.ClanBattleFormulas.BASE_HP;
    _mtdcArena.healthBars[id].update(hp);
  });
}
function _mtdcSyncSkillButtonFromServer() {
  if (!_mtdcArena || !_mtdcArena.skillButton) return;
  const me = _mtdcArena.players[_mtdcArena.myUid];
  const charge = me && me.state ? (me.state.skillCharge || 0) : 0;
  if (charge !== _mtdcArena.skillButton.charge) {
    _mtdcArena.skillButton.reset();
    if (charge > 0) _mtdcArena.skillButton.addCharge(charge);
  }
}
function _mtdcStartPositionWriter() {
  const ref = _mtdcRtdb().ref('battles/' + _mtdcArena.battleId + '/players/' + _mtdcArena.myUid + '/pos');
  _mtdcArena.posWriteInterval = setInterval(() => {
    if (!_mtdcArena || _mtdcArena.phase !== 'battle') return;
    const me = _mtdcArena.players[_mtdcArena.myUid];
    if (!me || !me.state || me.state.alive === false) return;
    const speed = window.ClanBattleFormulas.getCurrentSpeed(me.state.baseSpeed || 0.15, me.state.currentHP);
    const dt = 0.1;
    let x = (me.pos ? me.pos.x : 0.5) + _mtdcArena.joystickVector.dx * speed * dt;
    let y = (me.pos ? me.pos.y : 0.5) + _mtdcArena.joystickVector.dy * speed * dt;
    x = Math.max(0.02, Math.min(0.98, x));
    y = Math.max(0.02, Math.min(0.98, y));
    const ts = Date.now();
    ref.set({ x, y, ts });
    if (_mtdcArena.players[_mtdcArena.myUid]) _mtdcArena.players[_mtdcArena.myUid].pos = { x, y, ts };
  }, 100);
}
function _mtdcStartGameLoop() {
  function frame() {
    if (!_mtdcArena || _mtdcArena.phase !== 'battle') return;
    _mtdcRenderFrame();
    _mtdcCheckLocalCollisions();
    _mtdcUpdateTimerDisplay();
    _mtdcArena.rafId = requestAnimationFrame(frame);
  }
  _mtdcArena.rafId = requestAnimationFrame(frame);
}
function _mtdcRenderFrame() {
  const ctx = _mtdcArena.ctx;
  const canvas = _mtdcArena.canvas;
  if (!ctx || !canvas) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = Math.min(w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0e2a1f';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ffd54f';
  Object.values(_mtdcArena.fruits || {}).forEach((f) => {
    if (!f || f.active === false || !f.position) return;
    const r = Math.max(3, window.ClanBattleCollision.FRUIT_RADIUS * scale);
    ctx.beginPath();
    ctx.arc(f.position.x * w, f.position.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  });

  const meta = _mtdcArena.meta || {};
  Object.entries(_mtdcArena.players || {}).forEach(([id, p]) => {
    if (!p || !p.pos || !p.state) return;
    const isOwnTeam = (_mtdcArena.myTeamId === 'A' ? (meta.teamAPlayerIds || []) : (meta.teamBPlayerIds || [])).includes(id);
    const radius = Math.max(6, window.ClanBattleCollision.getPlayerRadius({
      baseSize: p.state.baseSize || 0.035, currentHP: p.state.currentHP,
    }) * scale);
    ctx.globalAlpha = p.state.alive === false ? 0.25 : 1;
    ctx.fillStyle = isOwnTeam ? '#4fd1c5' : '#f56565';
    ctx.beginPath();
    ctx.arc(p.pos.x * w, p.pos.y * h, radius, 0, Math.PI * 2);
    ctx.fill();
    if (id === _mtdcArena.myUid) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}
function _mtdcShouldThrottle(key, cooldownMs) {
  const last = _mtdcArena.lastEventPushed[key] || 0;
  if (Date.now() - last < cooldownMs) return true;
  _mtdcArena.lastEventPushed[key] = Date.now();
  return false;
}
function _mtdcPushEvent(data) {
  const ref = _mtdcRtdb().ref('battles/' + _mtdcArena.battleId + '/events').push();
  ref.set(Object.assign({ actorId: _mtdcArena.myUid }, data)).catch((e) => {
    console.warn('[mtdc-arena] gửi event thất bại', e);
  });
}
// Dự đoán va chạm phía client để canvas phản hồi nhanh + báo lên server; server
// (onClanBattleEventCreated, functions/index.js) mới là nơi QUYẾT ĐỊNH thật.
function _mtdcCheckLocalCollisions() {
  const me = _mtdcArena.players[_mtdcArena.myUid];
  if (!me || !me.pos || !me.state || me.state.alive === false) return;
  const myPlayerObj = { baseSize: me.state.baseSize || 0.035, currentHP: me.state.currentHP };

  Object.entries(_mtdcArena.fruits || {}).forEach(([fruitId, f]) => {
    if (!f || f.active === false || !f.position) return;
    if (_mtdcShouldThrottle('fruit:' + fruitId, 600)) return;
    if (window.ClanBattleCollision.checkFruitCollision(myPlayerObj, me.pos, f.position)) {
      _mtdcPushEvent({ type: 'eat_fruit', fruitId, clientTs: Date.now() });
    }
  });

  Object.entries(_mtdcArena.players || {}).forEach(([id, p]) => {
    if (id === _mtdcArena.myUid || !p || !p.pos || !p.state || p.state.alive === false) return;
    if (_mtdcShouldThrottle('player:' + id, 600)) return;
    const oppObj = { baseSize: p.state.baseSize || 0.035, currentHP: p.state.currentHP };
    if (window.ClanBattleCollision.checkPlayerCollision(myPlayerObj, me.pos, oppObj, p.pos)) {
      _mtdcPushEvent({ type: 'eat_player', targetId: id, clientTs: Date.now() });
    }
  });
}
function _mtdcActivateSkill() {
  if (!_mtdcArena) return;
  const me = _mtdcArena.players[_mtdcArena.myUid];
  if (!me || !me.state || !me.state.animalId || !me.pos) return;
  const skillRadius = 0.08; // PLACEHOLDER — tầm ảnh hưởng kỹ năng, cần xác nhận lại theo từng con (mục 6)
  const targetIds = Object.entries(_mtdcArena.players)
    .filter(([id, p]) => id !== _mtdcArena.myUid && p.state && p.state.alive !== false && p.pos
      && window.ClanBattleCollision.getDistance(me.pos, p.pos) <= skillRadius)
    .map(([id]) => id);
  _mtdcPushEvent({ type: 'skill', animalId: me.state.animalId, targetIds, clientTs: Date.now() });
}
function _mtdcUpdateTimerDisplay() {
  if (!_mtdcArena || !_mtdcArena.meta || !_mtdcArena.meta.endsAt) return;
  const el = _mtdcArena.root && _mtdcArena.root.querySelector('#mtdc-timer');
  const remainMs = _mtdcArena.meta.endsAt - Date.now();
  if (el) {
    const s = Math.max(0, Math.ceil(remainMs / 1000));
    el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  if (remainMs <= 0 && !_mtdcArena.finalizeCalled) {
    _mtdcArena.finalizeCalled = true;
    _mtdcCallFinalizeTimeout();
  }
}
async function _mtdcCallFinalizeTimeout() {
  try {
    const fn = firebase.functions().httpsCallable('finalizeClanBattleOnTimeout');
    await fn({ battleId: _mtdcArena.battleId });
  } catch (e) { console.warn('[mtdc-arena] gọi chốt trận theo thời gian thất bại', e); }
}

/* ── Màn kết quả ── */
function _mtdcShowResultScreen(result) {
  if (!_mtdcArena) return;
  _mtdcStopBattleLoop();
  const root = _mtdcArena.root;
  root.querySelector('#mtdc-selection-view').style.display = 'none';
  const rv = root.querySelector('#mtdc-result-view');
  rv.style.display = 'flex';
  const isDraw = result.winner === 'draw';
  const won = result.winner === _mtdcArena.myTeamId;
  rv.querySelector('#mtdc-result-title').textContent = isDraw ? 'Hoà!' : (won ? '🏆 Chiến thắng!' : 'Thua trận');
  rv.querySelector('#mtdc-result-score').textContent = 'Tỉ số: ' + result.teamAScore + ' - ' + result.teamBScore;
}
