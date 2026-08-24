/* ══════════════════════════════════════════
   TÀI KHOẢN → "Hội nhóm" (#account-groups) — HỆ THỐNG GUILD.
   Dữ liệu đọc trực tiếp từ Firestore (firestore.rules chỉ cho thành viên đọc
   guilds/*; người chưa có nhóm duyệt danh sách qua guildIndex công khai).
   MỌI thao tác ghi (tạo/join/leave/đóng góp/nâng cấp/nhiệm vụ/kick/promote)
   đều đi qua Cloud Function ở functions/index.js — client không tự sửa field
   nhạy cảm qua SDK.
   Cấu trúc: chưa có nhóm → màn tạo/tìm; đã có nhóm → dashboard (header + sức
   chứa + kho/nâng cấp + đóng góp ngày + nhiệm vụ tuần + đua top + thành viên).
══════════════════════════════════════════ */

// Hằng số (khớp functions/index.js — không hardcode rải rác)
const ACGRP_UPGRADE_COST = [
  { gold: 100,  diamonds: 20  },   // Lv1→2
  { gold: 200,  diamonds: 40  },   // Lv2→3
  { gold: 400,  diamonds: 80  },   // Lv3→4
  { gold: 800,  diamonds: 160 },   // Lv4→5
  { gold: 1600, diamonds: 320 },   // Lv5→6
  { gold: 3200, diamonds: 640 }    // Lv6→7
];
const ACGRP_DAILY_CAP = { gold: 10, diamonds: 1 };
const ACGRP_ROLE_MULT = { member: 1, deputy: 2, leader: 3 };
const ACGRP_RANK_META = [
  { key: 'members',  labelKey: 'guildRankMembers',  field: 'memberCount' },
  { key: 'activity', labelKey: 'guildRankActivity', field: 'weeklyActivity' },
  { key: 'gold',     labelKey: 'guildRankGold',     field: 'weeklyGold' },
  { key: 'diamond',  labelKey: 'guildRankDiamond',  field: 'weeklyDiamond' }
];
const ACGRP_QUEST_ICON = { caro_win_streak: '❌⭕', versus_win_streak: '⚔️', hidden_map_clear: '🗺️', daily_checkin: '📅' };
const ACGRP_QUEST_NAME = {
  caro_win_streak: 'Thắng liên tiếp 2 ván Caro',
  versus_win_streak: 'Thắng liên tiếp 2 trận Versus',
  hidden_map_clear: 'Vượt map ẩn 1',
  daily_checkin: 'Điểm danh hôm nay'
};

let _acgrpState = { guildId: null, guild: null, members: [], quests: [], me: null, lbTab: 'members' };

function _acgrpT(k){ return (typeof t === 'function') ? t(k) : k; }
function _acgrpEsc(s){ return (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }
function _acgrpFmt(k){ const a = Array.prototype.slice.call(arguments, 1); return (typeof t === 'function') ? t(k, ...a) : k; }
function _acgrpToast(msg){
  try{ if(typeof showComboFlash === 'function'){ showComboFlash(0, false, msg); return; } }catch(e){}
  try{ if(typeof showHint === 'function') showHint(msg); }catch(e){}
}

function _acgrpDb(){
  if(typeof _onlineDb !== 'undefined' && _onlineDb) return _onlineDb;
  if(typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
  return null;
}
async function _acgrpCall(name, data){
  if(typeof _getOnlineFunctions !== 'function') return { ok: false, reason: 'offline' };
  const fns = _getOnlineFunctions();
  if(!fns) return { ok: false, reason: 'offline' };
  const res = await fns.httpsCallable(name)(data || {});
  return res.data || {};
}

async function _acgrpEnsureOnline(){
  try{
    if(typeof isOnlineServicesEnabled === 'function' && !isOnlineServicesEnabled()) return false;
    if(typeof initOnlineServices === 'function') await initOnlineServices();
    return true;
  }catch(e){ return false; }
}


function renderAccountGroups(){
  const container = document.getElementById('account-groups');
  if(!container) return;
  container.innerHTML = '<div class="acgrp-note">' + _acgrpT('guildLoading') + '</div>';
  _acgrpRender(container);
}

async function _acgrpRender(container){
  try{
    if(!await _acgrpEnsureOnline()){
      container.innerHTML = _acgrpNoGuildHtml('⚠️ ' + _acgrpT('guildNeedOnline'));
      _acgrpBindNoGuild(container);
      return;
    }
    const my = await _acgrpMyGuild();
    if(!my){
      container.innerHTML = _acgrpNoGuildHtml('');
      _acgrpBindNoGuild(container);
      _acgrpLoadFindList(container);
      return;
    }
    await _acgrpLoadGuild(my.guildId);
    container.innerHTML = _acgrpDashboardHtml();
    _acgrpBindDashboard(container);
  }catch(e){
    console.warn('[groups]', e);
    container.innerHTML = _acgrpNoGuildHtml('⚠️ ' + _acgrpEsc((e && e.message) || ''));
    _acgrpBindNoGuild(container);
  }
}

function _acgrpNoGuildHtml(note){
  return '<div class="acgrp-card">'
    + '<div class="acgrp-card-title">👥 ' + _acgrpT('guildNoGuildTitle') + '</div>'
    + '<div class="acgrp-empty-sub">' + _acgrpT('guildNoGuildSub') + '</div>'
    + '<input type="text" class="acgrp-input" id="acgrp-name-input" maxlength="24" placeholder="' + _acgrpT('guildNamePlaceholder') + '">'
    + '<button type="button" class="acgrp-btn purple" id="acgrp-create-btn">' + _acgrpT('guildCreate') + '</button>'
    + '</div>'
    + '<div class="acgrp-card">'
    + '<div class="acgrp-card-title">🔍 ' + _acgrpT('guildFindTitle') + '</div>'
    + '<div class="acgrp-list" id="acgrp-find-list"></div>'
    + '</div>'
    + (note ? '<div class="acgrp-note">' + note + '</div>' : '');
}

async function _acgrpMyGuild(){
  try{
    const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
    if(!uid) return null;
    const db = _acgrpDb();
    if(!db) return null;
    const pgSnap = await db.collection('playerGuilds').doc(uid).get();
    if(!pgSnap.exists) return null;
    const guildId = pgSnap.data().guildId;
    if(!guildId) return null;
    const gSnap = await db.collection('guilds').doc(guildId).get();
    if(!gSnap.exists) return null;
    return { guildId: guildId, guild: gSnap.data() };
  }catch(e){ return null; }
}

async function _acgrpLoadGuild(guildId){
  const db = _acgrpDb();
  if(!db) return;
  _acgrpState.guildId = guildId;
  const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
  const [gSnap, membersSnap, questsSnap] = await Promise.all([
    db.collection('guilds').doc(guildId).get(),
    db.collection('guilds').doc(guildId).collection('members').get(),
    db.collection('guilds').doc(guildId).collection('quests').get()
  ]);
  _acgrpState.guild = gSnap.exists ? gSnap.data() : null;
  _acgrpState.members = membersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
  _acgrpState.quests = questsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  _acgrpState.me = _acgrpState.members.find(m => m.uid === uid) || null;
}

async function _acgrpLoadFindList(container){
  const listEl = container.querySelector('#acgrp-find-list');
  if(!listEl) return;
  try{
    const db = _acgrpDb();
    if(!db){ listEl.innerHTML = '<div class="acgrp-note">' + _acgrpT('guildNeedOnline') + '</div>'; return; }
    const snap = await db.collection('guildIndex').orderBy('level', 'desc').limit(50).get();
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(g => (g.memberCount || 0) < (g.capacity || 10));
    if(!rows.length){ listEl.innerHTML = '<div class="acgrp-note">' + _acgrpT('guildEmptyRooms') + '</div>'; return; }
    listEl.innerHTML = rows.map(g =>
      '<div class="acgrp-item">'
      + '<div class="acgrp-item-icon">' + _acgrpEsc(g.iconId || '👥') + '</div>'
      + '<div class="acgrp-item-main">'
      +   '<div class="acgrp-item-name">' + _acgrpEsc(g.name) + '</div>'
      +   '<div class="acgrp-item-sub">' + _acgrpFmt('guildMemberCount', g.memberCount || 0, g.capacity || 10) + ' · ' + _acgrpFmt('guildLevel', g.level || 1) + '</div>'
      + '</div>'
      + '<button type="button" class="acgrp-item-btn" data-guild-join="' + _acgrpEsc(g.id) + '">' + _acgrpT('guildJoin') + '</button>'
      + '</div>'
    ).join('');
    listEl.querySelectorAll('[data-guild-join]').forEach(btn=>{
      btn.addEventListener('click', ()=> _acgrpJoinGuild(btn.dataset.guildJoin));
    });
  }catch(e){
    console.warn('[groups] find', e);
    listEl.innerHTML = '<div class="acgrp-note">⚠️ ' + _acgrpEsc((e && e.message) || '') + '</div>';
  }
}


function _acgrpDashboardHtml(){
  const st = _acgrpState;
  const g = st.guild;
  if(!g) return '<div class="acgrp-note">⚠️ ' + _acgrpT('guildNoGuildTitle') + '</div>';
  const myRole = st.me ? st.me.role : 'member';
  const canMod = (myRole === 'leader' || myRole === 'deputy');
  const cap = g.capacity || 10;
  const cnt = g.memberCount || 0;
  const pct = cap > 0 ? Math.min(100, Math.round((cnt / cap) * 100)) : 0;
  const level = g.level || 1;
  const nextCost = ACGRP_UPGRADE_COST[level - 1] || null;
  const atMax = level >= 7;

  const mult = ACGRP_ROLE_MULT[myRole] || 1;
  const capGold = ACGRP_DAILY_CAP.gold * mult;
  const capDia = ACGRP_DAILY_CAP.diamonds * mult;
  const me = st.me || {};
  const usedGold = (me.dailyGoldContributed || 0);
  const usedDia = (me.dailyDiamondContributed || 0);

  let html = '';
  html += '<div class="acgrp-head">'
    + '<div class="acgrp-head-icon">' + _acgrpEsc(g.iconId || '👥') + '</div>'
    + '<div class="acgrp-head-main">'
    +   '<div class="acgrp-head-name">' + _acgrpEsc(g.name) + '</div>'
    +   '<div class="acgrp-head-meta">' + _acgrpFmt('guildLevel', level) + ' · ' + _acgrpFmt('guildMemberCount', cnt, cap) + '</div>'
    +   '<div class="acgrp-cap"><i style="width:' + pct + '%"></i></div>'
    + '</div>'
    + '</div>';
  html += '<div class="acgrp-vault">'
    + '<div class="acgrp-vault-box">🪙 ' + Math.floor(g.vaultGold || 0) + '</div>'
    + '<div class="acgrp-vault-box">💎 ' + Math.floor(g.vaultDiamond || 0) + '</div>'
    + '</div>';
  html += '<div class="acgrp-upgrade-box">';
  if(atMax){
    html += '<div class="acgrp-upgrade-cost">' + _acgrpT('guildCapMax') + '</div>';
    html += '<button type="button" class="acgrp-btn ghost" disabled>' + _acgrpT('guildUpgrade') + '</button>';
  } else if(canMod && nextCost){
    const enough = (g.vaultGold || 0) >= nextCost.gold && (g.vaultDiamond || 0) >= nextCost.diamonds;
    html += '<div class="acgrp-upgrade-cost">' + _acgrpFmt('guildUpgradeCost', level, level + 1, nextCost.gold, nextCost.diamonds) + '</div>';
    html += '<button type="button" class="acgrp-btn purple" id="acgrp-upgrade-btn" ' + (enough ? '' : 'disabled') + '>' + _acgrpT('guildUpgrade') + '</button>';
  } else {
    html += '<div class="acgrp-upgrade-cost">' + _acgrpT('guildRoleLeader') + '/' + _acgrpT('guildRoleDeputy') + ' — ' + _acgrpT('guildUpgrade') + '</div>';
    html += '<button type="button" class="acgrp-btn ghost" disabled>' + _acgrpT('guildUpgrade') + '</button>';
  }
  html += '</div>';
  html += '<div class="acgrp-contribute">'
    + '<div class="acgrp-card-title">' + _acgrpT('guildContribute') + '</div>'
    + '<div class="acgrp-contribute-row">'
    +   '<input type="number" min="0" class="acgrp-input" id="acgrp-gold-in" placeholder="' + _acgrpT('guildGoldPlaceholder') + '">'
    +   '<input type="number" min="0" class="acgrp-input" id="acgrp-dia-in" placeholder="' + _acgrpT('guildDiamondPlaceholder') + '">'
    + '</div>'
    + '<button type="button" class="acgrp-btn green" id="acgrp-contribute-btn">' + _acgrpT('guildContributeBtn') + '</button>'
    + '<div class="acgrp-contribute-note">' + _acgrpFmt('guildContributeToday', Math.min(usedGold, capGold), capGold, Math.min(usedDia, capDia), capDia) + '</div>'
    + '</div>';
  html += '<div class="acgrp-section-title">📋 ' + _acgrpT('guildQuests') + '</div>';
  html += '<div class="acgrp-list">' + (st.quests.length ? st.quests.map(_acgrpQuestHtml).join('') : '<div class="acgrp-note">—</div>') + '</div>';
  html += _acgrpLeaderboardHtml();
  html += '<div class="acgrp-section-title">👥 ' + _acgrpFmt('guildMembers', st.members.length) + '</div>';
  html += '<div class="acgrp-list">' + st.members.map(m => _acgrpMemberHtml(m, myRole)).join('') + '</div>';
  html += '<button type="button" class="acgrp-btn danger" id="acgrp-leave-btn">' + _acgrpT('guildLeave') + '</button>';
  return html;
}


function _acgrpQuestHtml(q){
  const st = _acgrpState;
  const g = st.guild || {};
  const total = (q.type === 'daily_checkin') ? (g.memberCount || 1) : (q.requiredParticipants || 1);
  const done = Array.isArray(q.progressUids) ? q.progressUids.length : 0;
  const name = ACGRP_QUEST_NAME[q.type] || q.type;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const sub = (q.type === 'daily_checkin')
    ? _acgrpFmt('guildCheckinCount', done, g.memberCount || 1)
    : _acgrpFmt('guildQuestProgress', done, total);
  return '<div class="acgrp-quest">'
    + '<div class="acgrp-quest-top">'
    +   '<span class="acgrp-quest-ico">' + (ACGRP_QUEST_ICON[q.type] || '📋') + '</span>'
    +   '<span class="acgrp-quest-name">' + _acgrpEsc(name) + '</span>'
    +   (q.completed ? '<span class="acgrp-quest-done">✅</span>' : '')
    + '</div>'
    + '<div class="acgrp-bar"><i style="width:' + pct + '%"></i></div>'
    + '<div class="acgrp-quest-sub">' + sub + '</div>'
    + '</div>';
}

function _acgrpMemberHtml(m, myRole){
  const me = _acgrpState.me || {};
  const roleLabel = m.role === 'leader' ? _acgrpT('guildRoleLeader')
    : m.role === 'deputy' ? _acgrpT('guildRoleDeputy') : _acgrpT('guildRoleMember');
  let act = '';
  if(m.uid !== me.uid && (myRole === 'leader' || myRole === 'deputy')){
    const canKick = !(m.role === 'leader') && !(myRole === 'deputy' && m.role === 'deputy');
    const canPromote = m.role === 'member' || (myRole === 'leader' && m.role === 'deputy');
    if(canPromote) act += '<button type="button" class="acgrp-member-act promote" data-promote="' + _acgrpEsc(m.uid) + '">' + _acgrpT('guildPromote') + '</button>';
    if(canKick) act += '<button type="button" class="acgrp-member-act kick" data-kick="' + _acgrpEsc(m.uid) + '">' + _acgrpT('guildKick') + '</button>';
  }
  return '<div class="acgrp-member">'
    + '<span class="acgrp-member-role ' + (m.role === 'leader' ? 'leader' : m.role === 'deputy' ? 'deputy' : 'member') + '">' + roleLabel + '</span>'
    + '<span class="acgrp-member-name">' + _acgrpEsc(m.displayName || 'Player') + '</span>'
    + '<span class="acgrp-member-activity">⚡ ' + (m.weeklyActivity || 0) + '</span>'
    + act
    + '</div>';
}


function _acgrpLeaderboardHtml(){
  const tab = _acgrpState.lbTab || 'members';
  const tabs = ACGRP_RANK_META.map(m =>
    '<button type="button" class="acgrp-lb-tab' + (m.key === tab ? ' active' : '') + '" data-lb-tab="' + m.key + '">' + _acgrpT(m.labelKey) + '</button>'
  ).join('');
  return '<div class="acgrp-card" style="margin-top:14px;">'
    + '<div class="acgrp-card-title">🏆 ' + _acgrpT('guildLeaderboard') + '</div>'
    + '<div class="acgrp-lb-tabs">' + tabs + '</div>'
    + '<div id="acgrp-lb-list"><div class="acgrp-note">' + _acgrpT('guildLoading') + '</div></div>'
    + '<div class="acgrp-reset-note">' + _acgrpFmt('guildResetCountdown', _acgrpResetLabel()) + '</div>'
    + '</div>';
}

function _acgrpResetLabel(){
  // Reset 00:00 thứ Hai giờ VN — đếm ngược tới mốc đó
  const now = new Date(Date.now() + 7 * 3600 * 1000); // giờ VN
  const day = now.getUTCDay(); // 0=CN..6=T7
  const daysUntilMonday = (8 - day) % 7; // CN(0)→1, T2(1)→0
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  const diffMs = nextMonday.getTime() - now.getTime();
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return (h > 0 ? h + 'h ' : '') + m + 'm';
}

async function _acgrpLoadLeaderboard(container){
  const listEl = container.querySelector('#acgrp-lb-list');
  if(!listEl) return;
  try{
    const db = _acgrpDb();
    if(!db){ listEl.innerHTML = ''; return; }
    const tab = _acgrpState.lbTab || 'members';
    const meta = ACGRP_RANK_META.find(m => m.key === tab) || ACGRP_RANK_META[0];
    const snap = await db.collection('guildIndex').limit(50).get();
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(g => g && g.memberCount > 0)
      .sort((a, b) => (b[meta.field] || 0) - (a[meta.field] || 0))
      .slice(0, 10);
    if(!rows.length){ listEl.innerHTML = ''; return; }
    const myId = _acgrpState.guildId;
    listEl.innerHTML = rows.map((g, i) =>
      '<div class="acgrp-lb-row' + (g.id === myId ? ' me' : '') + '">'
      + '<span class="acgrp-lb-rank">' + (i + 1) + '</span>'
      + '<span class="acgrp-lb-name">' + _acgrpEsc(g.name) + (g.id === myId ? ' ' + _acgrpT('guildRankMe') : '') + '</span>'
      + '<span class="acgrp-lb-val">' + (g[meta.field] || 0) + '</span>'
      + '</div>'
    ).join('');
  }catch(e){ console.warn('[groups] lb', e); }
}


function _acgrpBindNoGuild(container){
  container.querySelector('#acgrp-create-btn')?.addEventListener('click', async ()=>{
    const input = container.querySelector('#acgrp-name-input');
    const name = input ? input.value.trim() : '';
    if(name.length < 2){ _acgrpToast('⚠️ ' + _acgrpT('guildNamePlaceholder')); return; }
    try{
      const res = await _acgrpCall('createGuild', { name: name, iconId: '👥' });
      if(res.ok){
        _acgrpToast(_acgrpFmt('guildCreated', name));
        renderAccountGroups();
      } else if(res.reason === 'already-in-guild' || (res && res.error)) {
        _acgrpToast(_acgrpT('guildAlreadyIn'));
      } else {
        _acgrpToast(_acgrpT('guildAlreadyIn'));
      }
    }catch(e){ _acgrpToast('⚠️ ' + _acgrpEsc((e && e.message) || '')); }
  });
}

async function _acgrpJoinGuild(guildId){
  try{
    const res = await _acgrpCall('joinGuild', { guildId: guildId });
    if(res.ok){
      _acgrpToast(_acgrpT('guildJoined'));
      renderAccountGroups();
    } else {
      const msg = res.reason === 'resource-exhausted' ? _acgrpT('guildFull')
        : res.reason === 'failed-precondition' ? _acgrpT('guildAlreadyIn')
        : _acgrpT('guildAlreadyIn');
      _acgrpToast(msg);
    }
  }catch(e){ _acgrpToast('⚠️ ' + _acgrpEsc((e && e.message) || '')); }
}

function _acgrpBindDashboard(container){
  const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
  // Đua top: chuyển tab
  container.querySelectorAll('[data-lb-tab]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
      _acgrpState.lbTab = btn.dataset.lbTab;
      container.querySelectorAll('[data-lb-tab]').forEach(b=> b.classList.toggle('active', b === btn));
      _acgrpLoadLeaderboard(container);
    });
  });
  _acgrpLoadLeaderboard(container);

  // Nâng cấp
  container.querySelector('#acgrp-upgrade-btn')?.addEventListener('click', async ()=>{
    try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
    try{
      const res = await _acgrpCall('upgradeGuild', { guildId: _acgrpState.guildId });
      if(res.ok){
        _acgrpToast(_acgrpFmt('guildUpgradeOk', res.level));
        renderAccountGroups();
      } else {
        _acgrpToast(_acgrpT('guildVaultShort'));
      }
    }catch(e){ _acgrpToast('⚠️ ' + _acgrpEsc((e && e.message) || '')); }
  });

  // Đóng góp
  container.querySelector('#acgrp-contribute-btn')?.addEventListener('click', async ()=>{
    const gIn = container.querySelector('#acgrp-gold-in');
    const dIn = container.querySelector('#acgrp-dia-in');
    const gold = Math.max(0, Math.floor(Number(gIn ? gIn.value : 0) || 0));
    const diamonds = Math.max(0, Math.floor(Number(dIn ? dIn.value : 0) || 0));
    if(gold <= 0 && diamonds <= 0) return;
    try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
    try{
      const res = await _acgrpCall('contributeToGuild', { guildId: _acgrpState.guildId, gold: gold, diamond: diamonds });
      if(res.ok){
        _acgrpToast(_acgrpFmt('guildContributeOk', res.gold, res.diamonds));
        if(typeof syncWalletFromServer === 'function'){ try{ await syncWalletFromServer(); }catch(e){} }
        renderAccountGroups();
      } else {
        _acgrpToast(_acgrpT('guildContributeLimit'));
      }
    }catch(e){ _acgrpToast('⚠️ ' + _acgrpEsc((e && e.message) || '')); }
  });

  // Rời nhóm
  container.querySelector('#acgrp-leave-btn')?.addEventListener('click', async ()=>{
    try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
    try{
      const res = await _acgrpCall('leaveGuild', { guildId: _acgrpState.guildId });
      if(res && res.ok){
        _acgrpToast(_acgrpT('guildLeft'));
        renderAccountGroups();
      }
    }catch(e){ _acgrpToast('⚠️ ' + _acgrpEsc((e && e.message) || '')); }
  });

  // Kick / promote
  container.querySelectorAll('[data-kick]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const targetUid = btn.dataset.kick;
      try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
      try{
        const res = await _acgrpCall('kickGuildMember', { guildId: _acgrpState.guildId, targetUid: targetUid });
        if(res && res.ok){ _acgrpToast(_acgrpT('guildKickOk')); renderAccountGroups(); }
        else _acgrpToast(_acgrpT('guildKickSelf'));
      }catch(e){ _acgrpToast('⚠️ ' + _acgrpEsc((e && e.message) || '')); }
    });
  });
  container.querySelectorAll('[data-promote]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const targetUid = btn.dataset.promote;
      try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
      try{
        const res = await _acgrpCall('promoteGuildMember', { guildId: _acgrpState.guildId, targetUid: targetUid });
        if(res && res.ok){ _acgrpToast(_acgrpT('guildPromoteOk')); renderAccountGroups(); }
      }catch(e){ _acgrpToast('⚠️ ' + _acgrpEsc((e && e.message) || '')); }
    });
  });
}

(function initAccountGroups(){
  function bind(){
    document.getElementById('acchub-row-groups')?.addEventListener('click', renderAccountGroups);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* ── Hook nhiệm vụ nhóm (Task 4) ──
   Các hệ thống game gọi notifyGuildQuest(type) khi có sự kiện hoàn thành
   (thắng 2 ván Caro/Versus liên tiếp, vượt map ẩn 1, điểm danh hôm nay);
   hàm này tự tra guild của người chơi rồi gọi Cloud Function completeGuildQuest.
   Streak thắng liên tiếp lưu tạm ở localStorage, reset khi thua/hoà, khi đạt 2
   trận thắng liên tiếp thì báo quest 1 lần rồi đếm lại. */
async function notifyGuildQuest(type){
  try{
    const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
    if(!uid) return;
    const db = _acgrpDb();
    if(!db) return;
    const pgSnap = await db.collection('playerGuilds').doc(uid).get();
    if(!pgSnap.exists) return;
    const guildId = pgSnap.data().guildId;
    if(!guildId) return;
    const res = await _acgrpCall('completeGuildQuest', { guildId: guildId, questId: type });
    if(res && res.ok && res.activityGained > 0){
      try{ if(typeof showComboFlash === 'function') showComboFlash(0, false, '⚡ +' + res.activityGained + ' điểm năng động nhóm'); }catch(e){}
    }
  }catch(e){ console.warn('[groups] quest hook', e); }
}
function notifyGuildWinStreak(kind, won){
  const key = 'chromablast_guild_streak_' + kind;
  let cur = 0;
  try{ cur = parseInt(localStorage.getItem(key) || '0', 10) || 0; }catch(e){}
  cur = won ? cur + 1 : 0;
  try{ localStorage.setItem(key, String(cur)); }catch(e){}
  if(won && cur >= 2){
    try{ localStorage.setItem(key, '0'); }catch(e){}
    notifyGuildQuest(kind === 'caro' ? 'caro_win_streak' : 'versus_win_streak');
  }
}
window.notifyGuildQuest = notifyGuildQuest;
window.notifyGuildWinStreak = notifyGuildWinStreak;

