/* ══════════════════════════════════════════
   ĐẤU CLAN 2v2/3v3 — "Muông Thú Đại Chiến" (js/clan-battle-team.js)
   Tương đương Task 1/2 (js/clan-battle.js) nhưng cho đội hình nhiều người:
   - Trưởng/phó nhóm tạo phòng chờ mã 6 ký tự, chọn 2v2 hoặc 3v3.
   - Thành viên CÙNG clan tham gia đội A, clan đối thủ tham gia đội B, tới khi
     đủ người (onMuongThuBattleFull, functions/index.js) tự tạo trận thật trên
     Realtime Database rồi bàn giao cho js/clan-battle-arena.js.
   Nạp SAU js/clan-battle.js (dùng lại _cbDb/_cbEsc/_cbToast/_cbGenCode) và
   SAU js/clan-battle-character-selection.js. Dùng riêng tiền tố _mtdc / mtdc-
   cho mọi biến/DOM id để không đụng _cb / cb- của clan-battle.js.
══════════════════════════════════════════ */

const MTDC_MODES = [
  { id: '2v2', icon: '👥', name: '2 vs 2', teamSize: 2 },
  { id: '3v3', icon: '👥👤', name: '3 vs 3', teamSize: 3 },
];

let _mtdcState = { mode: '2v2', tab: 'create', battleId: null, code: null, unsub: null, listUnsub: null };

function _mtdcTeamSizeOf(mode) {
  const m = MTDC_MODES.find((x) => x.id === mode);
  return m ? m.teamSize : 2;
}

(function _mtdcInjectCardStyleOnce() {
  if (document.getElementById('mtdc-card-style')) return;
  const s = document.createElement('style');
  s.id = 'mtdc-card-style';
  s.textContent = '.mtdc-card-row{display:flex;gap:8px;margin-top:8px;}.mtdc-card-row button{flex:1;}'
    + '.mtdc-roster{display:flex;flex-direction:column;gap:4px;margin:10px 0;}'
    + '.mtdc-roster-team{font-size:11px;color:rgba(255,255,255,.6);margin-top:6px;}'
    + '.mtdc-roster-slot{display:flex;align-items:center;gap:6px;font-size:13px;color:#fff;padding:4px 8px;'
    + 'background:rgba(255,255,255,.05);border-radius:8px;}';
  document.head.appendChild(s);
})();

/* ── Thẻ trong dashboard nhóm — gắn cạnh renderClanBattleCard (account-groups.js) ── */
function renderMuongThuBattleCard(canMod, guildId, guildName) {
  if (!canMod) {
    return '<div class="acgrp-section-title">🐾 Muông Thú Đại Chiến (2v2/3v3)</div>'
      + '<div class="acgrp-note">Chỉ Trưởng nhóm/Phó nhóm mới thách đấu clan khác được.</div>';
  }
  return '<div class="acgrp-section-title">🐾 Muông Thú Đại Chiến (2v2/3v3)</div>'
    + '<div class="acgrp-card">'
    + '<div class="acgrp-empty-sub">Rủ đồng đội cùng clan đấu 2v2/3v3 với clan khác.</div>'
    + '<div class="mtdc-card-row">'
    + '<button type="button" class="acgrp-btn purple" id="acgrp-mtdc-btn">🔥 Tạo đội</button>'
    + '<button type="button" class="acgrp-btn ghost" id="acgrp-mtdc-join-btn">🔎 Tham gia</button>'
    + '</div>'
    + '</div>';
}
function bindMuongThuBattleCard(container) {
  container.querySelector('#acgrp-mtdc-btn')?.addEventListener('click', () => {
    try { if (typeof sfxClick === 'function') sfxClick(); } catch (e) {}
    openMuongThuTeamModal('create');
  });
  container.querySelector('#acgrp-mtdc-join-btn')?.addEventListener('click', () => {
    try { if (typeof sfxClick === 'function') sfxClick(); } catch (e) {}
    openMuongThuTeamModal('join');
  });
}

/* ── Modal ── */
function _mtdcEnsureModalEl() {
  let el = document.getElementById('mtdc-modal');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'mtdc-modal';
  el.innerHTML =
    '<style>'
    + '#mtdc-modal{position:fixed;inset:0;z-index:9600;display:none;align-items:center;justify-content:center;'
    + 'background:rgba(0,0,0,.6);}'
    + '#mtdc-modal.show{display:flex;}'
    + '#mtdc-modal .mtdc-box{width:min(420px,92vw);max-height:86vh;overflow:auto;background:#1c1f2b;border-radius:16px;'
    + 'padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.5);}'
    + '#mtdc-modal .mtdc-title{font-size:18px;font-weight:700;color:#fff;margin-bottom:10px;text-align:center;}'
    + '#mtdc-modal .mtdc-tab-row{display:flex;gap:8px;margin-bottom:14px;}'
    + '#mtdc-modal .mtdc-tab-btn{flex:1;padding:9px 6px;border-radius:10px;border:1px solid rgba(255,255,255,.12);'
    + 'background:transparent;color:rgba(255,255,255,.7);cursor:pointer;font-size:13px;}'
    + '#mtdc-modal .mtdc-tab-btn.active{background:rgba(168,85,247,.22);border-color:#a855f7;color:#fff;font-weight:700;}'
    + '#mtdc-modal .mtdc-mode-row{display:flex;gap:10px;margin-bottom:14px;}'
    + '#mtdc-modal .mtdc-mode-btn{flex:1;padding:12px 8px;border-radius:12px;border:2px solid rgba(255,255,255,.12);'
    + 'background:rgba(255,255,255,.06);color:#fff;text-align:center;cursor:pointer;font-size:13px;}'
    + '#mtdc-modal .mtdc-mode-btn.active{border-color:#a855f7;background:rgba(168,85,247,.22);}'
    + '#mtdc-modal .mtdc-code{font-size:32px;font-weight:800;letter-spacing:4px;color:#fff;text-align:center;'
    + 'padding:14px 0;background:rgba(255,255,255,.06);border-radius:12px;margin-bottom:12px;}'
    + '#mtdc-modal .mtdc-note{color:rgba(255,255,255,.7);font-size:12px;text-align:center;margin-bottom:12px;}'
    + '#mtdc-modal .mtdc-actions{display:flex;gap:10px;}'
    + '#mtdc-modal .mtdc-actions button{flex:1;}'
    + '#mtdc-modal .mtdc-join-row{display:flex;gap:8px;margin-bottom:12px;}'
    + '#mtdc-modal .mtdc-join-row input{flex:1;text-transform:uppercase;letter-spacing:2px;text-align:center;}'
    + '#mtdc-modal .mtdc-list-head{display:flex;align-items:center;justify-content:space-between;margin:14px 0 6px;}'
    + '#mtdc-modal .mtdc-list-head span{color:rgba(255,255,255,.7);font-size:12px;}'
    + '#mtdc-modal .mtdc-list{max-height:180px;overflow:auto;display:flex;flex-direction:column;gap:6px;}'
    + '#mtdc-modal .mtdc-list-empty{color:rgba(255,255,255,.5);font-size:12px;text-align:center;padding:10px 0;}'
    + '#mtdc-modal .mtdc-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;'
    + 'background:rgba(255,255,255,.06);}'
    + '#mtdc-modal .mtdc-row-main{flex:1;min-width:0;}'
    + '#mtdc-modal .mtdc-row-name{color:#fff;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
    + '#mtdc-modal .mtdc-row-sub{color:rgba(255,255,255,.6);font-size:11px;}'
    + '#mtdc-modal .mtdc-row button{flex:none;padding:6px 12px;font-size:12px;}'
    + '</style>'
    + '<div class="mtdc-box">'
    +   '<div class="mtdc-title">🐾 Muông Thú Đại Chiến</div>'
    +   '<div class="mtdc-tab-row" id="mtdc-tab-row">'
    +     '<button type="button" class="mtdc-tab-btn" data-tab="create">🔥 Tạo đội</button>'
    +     '<button type="button" class="mtdc-tab-btn" data-tab="join">🔎 Tham gia</button>'
    +   '</div>'
    +   '<div id="mtdc-create-view">'
    +     '<div class="mtdc-mode-row" id="mtdc-mode-row"></div>'
    +     '<div class="mtdc-actions">'
    +       '<button type="button" class="acgrp-btn ghost" id="mtdc-close-btn">Đóng</button>'
    +       '<button type="button" class="acgrp-btn purple" id="mtdc-create-btn">Tạo phòng chờ</button>'
    +     '</div>'
    +   '</div>'
    +   '<div id="mtdc-join-view" style="display:none;">'
    +     '<div class="mtdc-join-row">'
    +       '<input type="text" id="mtdc-join-code-in" maxlength="6" placeholder="Nhập mã 6 ký tự">'
    +       '<button type="button" class="acgrp-btn purple" id="mtdc-join-code-btn">Vào</button>'
    +     '</div>'
    +     '<div class="mtdc-list-head"><span>Phòng đang chờ đối thủ</span>'
    +       '<button type="button" class="acgrp-btn ghost" id="mtdc-list-refresh-btn" style="padding:4px 10px;font-size:11px;">🔄</button>'
    +     '</div>'
    +     '<div class="mtdc-list" id="mtdc-list"></div>'
    +     '<div class="mtdc-actions" style="margin-top:12px;">'
    +       '<button type="button" class="acgrp-btn ghost" id="mtdc-close-btn-2">Đóng</button>'
    +     '</div>'
    +   '</div>'
    +   '<div id="mtdc-wait-view" style="display:none;">'
    +     '<div class="mtdc-note" id="mtdc-wait-hint">Gửi mã này cho đồng đội và clan đối thủ:</div>'
    +     '<div class="mtdc-code" id="mtdc-code-display">------</div>'
    +     '<div class="mtdc-roster" id="mtdc-roster"></div>'
    +     '<div class="mtdc-note" id="mtdc-wait-status">Đang chờ đủ người…</div>'
    +     '<div class="mtdc-actions">'
    +       '<button type="button" class="acgrp-btn danger" id="mtdc-cancel-btn">Huỷ phòng</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(el);
  el.addEventListener('click', (e) => { if (e.target === el) closeMuongThuTeamModal(); });
  el.querySelector('#mtdc-close-btn')?.addEventListener('click', closeMuongThuTeamModal);
  el.querySelector('#mtdc-close-btn-2')?.addEventListener('click', closeMuongThuTeamModal);
  el.querySelector('#mtdc-cancel-btn')?.addEventListener('click', _mtdcCancelChallenge);
  el.querySelector('#mtdc-create-btn')?.addEventListener('click', () => _mtdcCreateChallenge(_mtdcState.mode));
  el.querySelector('#mtdc-join-code-btn')?.addEventListener('click', () => {
    const v = (el.querySelector('#mtdc-join-code-in').value || '').trim().toUpperCase();
    if (v.length < 4) { _cbToast('⚠️ Nhập đủ mã phòng'); return; }
    _mtdcJoinByCode(v);
  });
  el.querySelector('#mtdc-list-refresh-btn')?.addEventListener('click', () => _mtdcLoadOpenList());
  el.querySelectorAll('.mtdc-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      try { if (typeof sfxClick === 'function') sfxClick(); } catch (e) {}
      _mtdcSwitchTab(btn.dataset.tab);
    });
  });
  const row = el.querySelector('#mtdc-mode-row');
  row.innerHTML = MTDC_MODES.map((m) =>
    '<button type="button" class="mtdc-mode-btn' + (m.id === _mtdcState.mode ? ' active' : '') + '" data-mode="' + m.id + '">'
    + '<span class="cb-mode-ico">' + m.icon + '</span>' + _cbEsc(m.name) + '</button>'
  ).join('');
  row.querySelectorAll('.mtdc-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      _mtdcState.mode = btn.dataset.mode;
      row.querySelectorAll('.mtdc-mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });
  return el;
}

function _mtdcSwitchTab(tab) {
  const el = _mtdcEnsureModalEl();
  _mtdcState.tab = tab;
  el.querySelectorAll('.mtdc-tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  el.querySelector('#mtdc-create-view').style.display = (tab === 'create') ? '' : 'none';
  el.querySelector('#mtdc-join-view').style.display = (tab === 'join') ? '' : 'none';
  if (tab === 'join') _mtdcLoadOpenList();
}

function openMuongThuTeamModal(tab) {
  const el = _mtdcEnsureModalEl();
  if (_mtdcState.battleId && _mtdcState.code) {
    _mtdcShowWaitView();
  } else {
    el.querySelector('#mtdc-wait-view').style.display = 'none';
    _mtdcSwitchTab(tab === 'join' ? 'join' : 'create');
  }
  el.classList.add('show');
}
function closeMuongThuTeamModal() {
  document.getElementById('mtdc-modal')?.classList.remove('show');
  try { if (_mtdcState.listUnsub) _mtdcState.listUnsub(); } catch (e) {}
  _mtdcState.listUnsub = null;
}
function _mtdcShowWaitView() {
  const el = _mtdcEnsureModalEl();
  el.querySelector('#mtdc-create-view').style.display = 'none';
  el.querySelector('#mtdc-join-view').style.display = 'none';
  el.querySelector('#mtdc-wait-view').style.display = '';
  el.querySelector('#mtdc-code-display').textContent = _mtdcState.code || '------';
}
function _mtdcRenderRoster(data) {
  const el = document.getElementById('mtdc-roster');
  if (!el || !data) return;
  const teamSize = data.teamSize || 2;
  const slots = Array.isArray(data.slots) ? data.slots : [];
  const teamA = slots.filter((s) => s.teamId === 'A');
  const teamB = slots.filter((s) => s.teamId === 'B');
  const rowHtml = (s) => '<div class="mtdc-roster-slot">🐾 ' + _cbEsc(s.name || '?') + '</div>';
  const emptyHtml = '<div class="mtdc-roster-slot" style="opacity:.4;">— trống —</div>';
  const teamHtml = (label, team) => '<div class="mtdc-roster-team">' + label + ' (' + team.length + '/' + teamSize + ')</div>'
    + team.map(rowHtml).join('') + (team.length < teamSize ? emptyHtml.repeat(teamSize - team.length) : '');
  el.innerHTML = teamHtml(_cbEsc(data.hostClanName || 'Đội A'), teamA)
    + teamHtml(_cbEsc(data.guestClanName || 'Đội B (đang chờ)'), teamB);
}

/* ── Tạo challenge: collection muongThuBattles/{battleId} ── */
async function _mtdcCreateChallenge(mode) {
  try {
    if (!await _acgrpEnsureOnline()) { _cbToast('⚠️ Cần đăng nhập online'); return; }
    const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
    const guildId = (typeof _acgrpState !== 'undefined') ? _acgrpState.guildId : null;
    const guild = (typeof _acgrpState !== 'undefined') ? _acgrpState.guild : null;
    const myRole = (typeof _acgrpState !== 'undefined' && _acgrpState.me) ? _acgrpState.me.role : null;
    if (!uid || !guildId || !guild) { _cbToast('⚠️ Bạn chưa ở trong clan nào'); return; }
    if (myRole !== 'leader' && myRole !== 'deputy') { _cbToast('⚠️ Chỉ trưởng/phó nhóm mới tạo đội đấu clan được'); return; }
    const db = _cbDb();
    if (!db) { _cbToast('⚠️ Không kết nối được máy chủ'); return; }

    const code = _cbGenCode();
    const teamSize = _mtdcTeamSizeOf(mode);
    const ref = db.collection('muongThuBattles').doc();
    await ref.set({
      code,
      mode: (mode === '3v3') ? '3v3' : '2v2',
      teamSize,
      status: 'open',
      hostClanId: guildId,
      hostClanName: guild.name || '',
      guestClanId: null,
      guestClanName: null,
      rtdbBattleId: null,
      slots: [{
        uid,
        teamId: 'A',
        clanId: guildId,
        name: (typeof getOnlineDisplayName === 'function') ? getOnlineDisplayName() : '',
        avatar: (typeof getOnlineAvatar === 'function') ? getOnlineAvatar() : null,
      }],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    _mtdcState.battleId = ref.id;
    _mtdcState.code = code;
    _mtdcListenBattle(ref.id);
    _mtdcShowWaitView();
  } catch (e) {
    _cbToast('⚠️ ' + ((e && e.message) || 'Tạo đội thất bại'));
  }
}

async function _mtdcLoadOpenList() {
  const el = document.getElementById('mtdc-modal');
  const listEl = el && el.querySelector('#mtdc-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="mtdc-list-empty">Đang tải…</div>';
  try {
    if (!await _acgrpEnsureOnline()) { listEl.innerHTML = '<div class="mtdc-list-empty">⚠️ Cần đăng nhập online</div>'; return; }
    const db = _cbDb();
    if (!db) { listEl.innerHTML = '<div class="mtdc-list-empty">⚠️ Không kết nối được máy chủ</div>'; return; }
    const myGuildId = (typeof _acgrpState !== 'undefined') ? _acgrpState.guildId : null;
    const snap = await db.collection('muongThuBattles')
      .where('status', '==', 'open').orderBy('createdAt', 'desc').limit(20).get();
    const rooms = snap.docs
      .map((d) => Object.assign({ battleId: d.id }, d.data()))
      .filter((r) => r.hostClanId !== myGuildId);
    if (!rooms.length) { listEl.innerHTML = '<div class="mtdc-list-empty">Chưa có clan nào đang tạo đội.</div>'; return; }
    listEl.innerHTML = rooms.map(_mtdcRoomRowHtml).join('');
    listEl.querySelectorAll('.mtdc-row [data-join]').forEach((btn) => {
      btn.addEventListener('click', () => _mtdcJoinBattle(btn.dataset.join));
    });
  } catch (e) {
    listEl.innerHTML = '<div class="mtdc-list-empty">⚠️ ' + _cbEsc((e && e.message) || 'Lỗi tải danh sách') + '</div>';
  }
}
function _mtdcRoomRowHtml(r) {
  const modeInfo = MTDC_MODES.find((m) => m.id === r.mode) || MTDC_MODES[0];
  const filled = Array.isArray(r.slots) ? r.slots.length : 0;
  return '<div class="mtdc-row">'
    + '<div class="mtdc-row-main">'
    +   '<div class="mtdc-row-name">' + _cbEsc(r.hostClanName || '?') + '</div>'
    +   '<div class="mtdc-row-sub">' + modeInfo.icon + ' ' + _cbEsc(modeInfo.name) + ' · ' + filled + '/' + (r.teamSize * 2) + ' người · ' + _cbEsc(r.code || '') + '</div>'
    + '</div>'
    + '<button type="button" class="acgrp-btn purple" data-join="' + r.battleId + '">Vào</button>'
    + '</div>';
}

async function _mtdcJoinByCode(code) {
  try {
    if (!await _acgrpEnsureOnline()) { _cbToast('⚠️ Cần đăng nhập online'); return; }
    const db = _cbDb();
    if (!db) { _cbToast('⚠️ Không kết nối được máy chủ'); return; }
    const snap = await db.collection('muongThuBattles')
      .where('code', '==', code).where('status', '==', 'open').limit(1).get();
    if (snap.empty) { _cbToast('⚠️ Không tìm thấy phòng (mã sai hoặc đã đủ người)'); return; }
    await _mtdcJoinBattle(snap.docs[0].id);
  } catch (e) {
    _cbToast('⚠️ ' + ((e && e.message) || 'Vào phòng thất bại'));
  }
}

// Ghép vào 1 team battle cụ thể — transaction đọc lại slots ngay trước khi ghi
// để 2 người bấm cùng lúc không đè mất slot của nhau (mtdcJoinOk ở
// firestore.rules xác thực lại lần nữa ở tầng server, không chỉ tin transaction).
async function _mtdcJoinBattle(battleId) {
  try {
    if (!await _acgrpEnsureOnline()) { _cbToast('⚠️ Cần đăng nhập online'); return; }
    const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
    const guildId = (typeof _acgrpState !== 'undefined') ? _acgrpState.guildId : null;
    if (!uid || !guildId) { _cbToast('⚠️ Bạn chưa ở trong clan nào'); return; }
    const db = _cbDb();
    if (!db) { _cbToast('⚠️ Không kết nối được máy chủ'); return; }

    const ref = db.collection('muongThuBattles').doc(battleId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Phòng không tồn tại');
      const data = snap.data();
      if (data.status !== 'open') throw new Error('Phòng đã đủ người hoặc đã bắt đầu');
      const slots = Array.isArray(data.slots) ? data.slots : [];
      if (slots.some((s) => s.uid === uid)) throw new Error('Bạn đã ở trong đội này rồi');

      const teamId = (guildId === data.hostClanId) ? 'A' : 'B';
      if (teamId === 'B' && data.guestClanId && data.guestClanId !== guildId) {
        throw new Error('Đội B đã có clan khác ghép rồi');
      }
      const teamCount = slots.filter((s) => s.teamId === teamId).length;
      if (teamCount >= data.teamSize) throw new Error('Đội này đã đủ người');

      const newSlot = {
        uid,
        teamId,
        clanId: guildId,
        name: (typeof getOnlineDisplayName === 'function') ? getOnlineDisplayName() : '',
        avatar: (typeof getOnlineAvatar === 'function') ? getOnlineAvatar() : null,
      };
      const newSlots = slots.concat([newSlot]);
      const patch = {
        slots: newSlots,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (teamId === 'B' && !data.guestClanId) {
        patch.guestClanId = guildId;
        patch.guestClanName = (typeof _acgrpState !== 'undefined' && _acgrpState.guild) ? _acgrpState.guild.name || '' : '';
      }
      if (newSlots.length === data.teamSize * 2) patch.status = 'full';
      tx.update(ref, patch);
    });

    _mtdcState.battleId = battleId;
    const snap = await ref.get();
    _mtdcState.code = snap.data() && snap.data().code;
    _mtdcListenBattle(battleId);
    _mtdcShowWaitView();
  } catch (e) {
    _cbToast('⚠️ ' + ((e && e.message) || 'Vào phòng thất bại'));
  }
}

function _mtdcListenBattle(battleId) {
  try { if (_mtdcState.unsub) _mtdcState.unsub(); } catch (e) {}
  const db = _cbDb();
  if (!db) return;
  _mtdcState.unsub = db.collection('muongThuBattles').doc(battleId).onSnapshot((doc) => {
    if (!doc.exists) { _mtdcResetState(); closeMuongThuTeamModal(); return; }
    const data = doc.data();
    _mtdcRenderRoster(data);
    const statusEl = document.getElementById('mtdc-wait-status');
    if (statusEl) {
      const filled = Array.isArray(data.slots) ? data.slots.length : 0;
      statusEl.textContent = data.status === 'open'
        ? ('Đang chờ đủ người… (' + filled + '/' + (data.teamSize * 2) + ')')
        : 'Đủ người! Đang chuẩn bị trận đấu…';
    }
    if (data.rtdbBattleId) {
      closeMuongThuTeamModal();
      const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
      const mySlot = (data.slots || []).find((s) => s.uid === uid);
      _mtdcResetState();
      if (typeof openMuongThuArena === 'function' && mySlot) {
        openMuongThuArena(data.rtdbBattleId, mySlot.teamId);
      }
    }
  });
}

async function _mtdcCancelChallenge() {
  const battleId = _mtdcState.battleId;
  if (!battleId) { closeMuongThuTeamModal(); return; }
  try {
    const db = _cbDb();
    if (db) await db.collection('muongThuBattles').doc(battleId).delete().catch(() => {});
  } catch (e) {}
  _mtdcResetState();
  closeMuongThuTeamModal();
}
function _mtdcResetState() {
  try { if (_mtdcState.unsub) _mtdcState.unsub(); } catch (e) {}
  _mtdcState = { mode: _mtdcState.mode, tab: 'create', battleId: null, code: null, unsub: null, listUnsub: null };
}
