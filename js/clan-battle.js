/* ══════════════════════════════════════════
   ĐẤU CLAN — "Muông Thú Đại Chiến" (js/clan-battle.js)
   Phase 1 (xem SPEC mục 8):
   - Task 1: tạo collection clanBattles/{battleId} + UI "Thách đấu clan" cho
     leader/deputy — chọn mode, tạo phòng chờ mã 6 ký tự.
   - Task 2: luồng JOIN phòng thách đấu clan đối phương — qua nhập mã 6 ký tự
     HOẶC chọn từ danh sách phòng "open" công khai. Ghép xong (status→'matched')
     do chính rule cbJoinOk() (firestore.rules) xác thực, không tin client.
   Gắn battleId vào ván Caro/Versus thật (Task 3) và Cloud Function xác nhận
   thắng/cộng điểm (Task 4) làm ở các task sau — file này CHƯA tự cộng điểm/
   kết thúc trận, chỉ dựng đúng phần phòng chờ + ghép cặp.

   Tái dùng: getOnlineUid/getOnlineDisplayName/getOnlineAvatar/ensureOnlineAuth
   (js/online-services.js), state guild đã nạp sẵn ở _acgrpState (js/account-
   groups.js) — file này KHÔNG tự đọc lại guild, chỉ đọc state đó cho nhẹ.
   Modal dựng bằng JS (không đụng index.html/css/main.css ngoài 1 dòng script
   include) để tránh rủi ro sửa nhầm 2 file rất lớn đó; style tái dùng gần hết
   class .acgrp-* / .crb-* đã có sẵn trong css/main.css.
══════════════════════════════════════════ */

const CB_MODES = [
  { id: 'caro',   icon: '⭕❌', name: 'Caro' },
  { id: 'versus', icon: '⚔️',  name: 'Đấu 1-1 (Versus)' }
];

// tab: 'create' (Task 1) | 'join' (Task 2). role: 'host'|'guest' của battle
// đang mở màn chờ (quyết định nút Huỷ/Rời hiển thị ở _cbShowWaitView).
let _cbState = { mode: 'caro', tab: 'create', battleId: null, code: null, role: null, unsub: null, listUnsub: null };

function _cbDb(){
  if(typeof _acgrpDb === 'function') return _acgrpDb();
  if(typeof _onlineDb !== 'undefined' && _onlineDb) return _onlineDb;
  if(typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
  return null;
}
function _cbEsc(s){ return (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }
function _cbToast(msg){
  try{ if(typeof showComboFlash === 'function'){ showComboFlash(0, false, msg); return; } }catch(e){}
  try{ if(typeof showHint === 'function') showHint(msg); }catch(e){}
}
// Mã phòng 6 ký tự — dùng lại đúng bộ ký tự/độ dài của phòng Caro/Versus
// (js/online-services.js _roomCode) để đồng nhất trải nghiệm, không bịa quy
// ước mới; fallback tự sinh nếu vì lý do gì đó _roomCode chưa nạp.
function _cbGenCode(){
  if(typeof _roomCode === 'function') return _roomCode();
  const chars = (typeof ONLINE_ROOM_CODE_CHARS !== 'undefined') ? ONLINE_ROOM_CODE_CHARS : 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

// Style dùng cho thẻ trong dashboard (nằm ngoài #cb-modal nên không dùng
// chung <style> của modal — modal chỉ dựng khi mở, còn thẻ này hiện ngay khi
// vào tab Hội nhóm). Chỉ inject 1 lần.
(function _cbInjectCardStyleOnce(){
  if(document.getElementById('cb-card-style')) return;
  const s = document.createElement('style');
  s.id = 'cb-card-style';
  s.textContent = '.cb-card-row{display:flex;gap:8px;margin-top:8px;}.cb-card-row button{flex:1;}';
  document.head.appendChild(s);
})();

/* ── Thẻ "Đấu clan" gắn trong dashboard nhóm (js/account-groups.js) ── */
function renderClanBattleCard(canMod, guildId, guildName){
  if(!canMod){
    return '<div class="acgrp-section-title">⚔️ Đấu clan</div>'
      + '<div class="acgrp-note">Chỉ ' + _cbEsc('Trưởng nhóm/Phó nhóm') + ' mới thách đấu clan khác được.</div>';
  }
  return '<div class="acgrp-section-title">⚔️ Đấu clan</div>'
    + '<div class="acgrp-card">'
    + '<div class="acgrp-empty-sub">Thách đấu 1 clan khác — thắng trận được cộng điểm năng động cho clan.</div>'
    + '<div class="cb-card-row">'
    +   '<button type="button" class="acgrp-btn purple" id="acgrp-clan-battle-btn">🔥 Thách đấu clan</button>'
    +   '<button type="button" class="acgrp-btn ghost" id="acgrp-clan-battle-join-btn">🔎 Tham gia đấu clan</button>'
    + '</div>'
    + '</div>';
}
function bindClanBattleCard(container){
  container.querySelector('#acgrp-clan-battle-btn')?.addEventListener('click', ()=>{
    try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
    openClanBattleModal('create');
  });
  container.querySelector('#acgrp-clan-battle-join-btn')?.addEventListener('click', ()=>{
    try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
    openClanBattleModal('join');
  });
}

/* ── Modal: tab "Tạo phòng" (Task 1) + tab "Tham gia" (Task 2) + màn chờ ── */
function _cbEnsureModalEl(){
  let el = document.getElementById('cb-modal');
  if(el) return el;
  el = document.createElement('div');
  el.id = 'cb-modal';
  el.innerHTML =
    '<style>'
    + '#cb-modal{position:fixed;inset:0;z-index:9600;display:none;align-items:center;justify-content:center;'
    + 'background:rgba(0,0,0,.6);}'
    + '#cb-modal.show{display:flex;}'
    + '#cb-modal .cb-box{width:min(420px,92vw);max-height:86vh;overflow:auto;background:#1c1f2b;border-radius:16px;'
    + 'padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.5);}'
    + '#cb-modal .cb-title{font-size:18px;font-weight:700;color:#fff;margin-bottom:10px;text-align:center;}'
    + '#cb-modal .cb-tab-row{display:flex;gap:8px;margin-bottom:14px;}'
    + '#cb-modal .cb-tab-btn{flex:1;padding:9px 6px;border-radius:10px;border:1px solid rgba(255,255,255,.12);'
    + 'background:transparent;color:rgba(255,255,255,.7);cursor:pointer;font-size:13px;}'
    + '#cb-modal .cb-tab-btn.active{background:rgba(168,85,247,.22);border-color:#a855f7;color:#fff;font-weight:700;}'
    + '#cb-modal .cb-mode-row{display:flex;gap:10px;margin-bottom:14px;}'
    + '#cb-modal .cb-mode-btn{flex:1;padding:12px 8px;border-radius:12px;border:2px solid rgba(255,255,255,.12);'
    + 'background:rgba(255,255,255,.06);color:#fff;text-align:center;cursor:pointer;font-size:13px;}'
    + '#cb-modal .cb-mode-btn.active{border-color:#a855f7;background:rgba(168,85,247,.22);}'
    + '#cb-modal .cb-mode-ico{font-size:22px;display:block;margin-bottom:4px;}'
    + '#cb-modal .cb-code{font-size:32px;font-weight:800;letter-spacing:4px;color:#fff;text-align:center;'
    + 'padding:14px 0;background:rgba(255,255,255,.06);border-radius:12px;margin-bottom:12px;}'
    + '#cb-modal .cb-note{color:rgba(255,255,255,.7);font-size:12px;text-align:center;margin-bottom:12px;}'
    + '#cb-modal .cb-actions{display:flex;gap:10px;}'
    + '#cb-modal .cb-actions button{flex:1;}'
    + '#cb-modal .cb-join-row{display:flex;gap:8px;margin-bottom:12px;}'
    + '#cb-modal .cb-join-row input{flex:1;text-transform:uppercase;letter-spacing:2px;text-align:center;}'
    + '#cb-modal .cb-list-head{display:flex;align-items:center;justify-content:space-between;margin:14px 0 6px;}'
    + '#cb-modal .cb-list-head span{color:rgba(255,255,255,.7);font-size:12px;}'
    + '#cb-modal .cb-list{max-height:180px;overflow:auto;display:flex;flex-direction:column;gap:6px;}'
    + '#cb-modal .cb-list-empty{color:rgba(255,255,255,.5);font-size:12px;text-align:center;padding:10px 0;}'
    + '#cb-modal .cb-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;'
    + 'background:rgba(255,255,255,.06);}'
    + '#cb-modal .cb-row-main{flex:1;min-width:0;}'
    + '#cb-modal .cb-row-name{color:#fff;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
    + '#cb-modal .cb-row-sub{color:rgba(255,255,255,.6);font-size:11px;}'
    + '#cb-modal .cb-row button{flex:none;padding:6px 12px;font-size:12px;}'
    + '</style>'
    + '<div class="cb-box">'
    +   '<div class="cb-title">⚔️ Đấu clan</div>'
    +   '<div class="cb-tab-row" id="cb-tab-row">'
    +     '<button type="button" class="cb-tab-btn" data-tab="create">🔥 Tạo phòng</button>'
    +     '<button type="button" class="cb-tab-btn" data-tab="join">🔎 Tham gia</button>'
    +   '</div>'
    +   '<div id="cb-create-view">'
    +     '<div class="cb-mode-row" id="cb-mode-row"></div>'
    +     '<div class="cb-actions">'
    +       '<button type="button" class="acgrp-btn ghost" id="cb-close-btn">Đóng</button>'
    +       '<button type="button" class="acgrp-btn purple" id="cb-create-btn">Tạo phòng chờ</button>'
    +     '</div>'
    +   '</div>'
    +   '<div id="cb-join-view" style="display:none;">'
    +     '<div class="cb-join-row">'
    +       '<input type="text" id="cb-join-code-in" maxlength="6" placeholder="Nhập mã 6 ký tự">'
    +       '<button type="button" class="acgrp-btn purple" id="cb-join-code-btn">Vào</button>'
    +     '</div>'
    +     '<div class="cb-list-head"><span>Phòng đang chờ đối thủ</span>'
    +       '<button type="button" class="acgrp-btn ghost" id="cb-list-refresh-btn" style="padding:4px 10px;font-size:11px;">🔄</button>'
    +     '</div>'
    +     '<div class="cb-list" id="cb-list"></div>'
    +     '<div class="cb-actions" style="margin-top:12px;">'
    +       '<button type="button" class="acgrp-btn ghost" id="cb-close-btn-2">Đóng</button>'
    +     '</div>'
    +   '</div>'
    +   '<div id="cb-wait-view" style="display:none;">'
    +     '<div class="cb-note" id="cb-wait-hint">Gửi mã này cho clan đối thủ để họ vào phòng thách đấu:</div>'
    +     '<div class="cb-code" id="cb-code-display">------</div>'
    +     '<div class="cb-note" id="cb-wait-status">Đang chờ clan khác vào phòng…</div>'
    +     '<div class="cb-actions">'
    +       '<button type="button" class="acgrp-btn danger" id="cb-cancel-btn">Huỷ phòng</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(el);
  el.addEventListener('click', e=>{ if(e.target === el) closeClanBattleModal(); });
  el.querySelector('#cb-close-btn')?.addEventListener('click', closeClanBattleModal);
  el.querySelector('#cb-close-btn-2')?.addEventListener('click', closeClanBattleModal);
  el.querySelector('#cb-cancel-btn')?.addEventListener('click', cbCancelChallenge);
  el.querySelector('#cb-create-btn')?.addEventListener('click', ()=> clanBattleCreateChallenge(_cbState.mode));
  el.querySelector('#cb-join-code-btn')?.addEventListener('click', ()=>{
    const v = (el.querySelector('#cb-join-code-in').value || '').trim().toUpperCase();
    if(v.length < 4){ _cbToast('⚠️ Nhập đủ mã phòng'); return; }
    cbJoinByCode(v);
  });
  el.querySelector('#cb-list-refresh-btn')?.addEventListener('click', ()=> cbLoadOpenList());
  el.querySelectorAll('.cb-tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
      _cbSwitchTab(btn.dataset.tab);
    });
  });
  const row = el.querySelector('#cb-mode-row');
  row.innerHTML = CB_MODES.map(m =>
    '<button type="button" class="cb-mode-btn' + (m.id === _cbState.mode ? ' active' : '') + '" data-mode="' + m.id + '">'
    + '<span class="cb-mode-ico">' + m.icon + '</span>' + _cbEsc(m.name) + '</button>'
  ).join('');
  row.querySelectorAll('.cb-mode-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      _cbState.mode = btn.dataset.mode;
      row.querySelectorAll('.cb-mode-btn').forEach(b=> b.classList.toggle('active', b === btn));
    });
  });
  return el;
}

function _cbSwitchTab(tab){
  const el = _cbEnsureModalEl();
  _cbState.tab = tab;
  el.querySelectorAll('.cb-tab-btn').forEach(b=> b.classList.toggle('active', b.dataset.tab === tab));
  el.querySelector('#cb-create-view').style.display = (tab === 'create') ? '' : 'none';
  el.querySelector('#cb-join-view').style.display = (tab === 'join') ? '' : 'none';
  if(tab === 'join') cbLoadOpenList();
}

function openClanBattleModal(tab){
  const el = _cbEnsureModalEl();
  // Nếu đang có phòng của mình còn mở/đã ghép (mở lại panel Hội nhóm rồi bấm
  // lại) → hiện lại đúng màn chờ thay vì cho tạo/tham gia phòng khác.
  if(_cbState.battleId && _cbState.code){
    _cbShowWaitView();
  } else {
    el.querySelector('#cb-wait-view').style.display = 'none';
    _cbSwitchTab(tab === 'join' ? 'join' : 'create');
  }
  el.classList.add('show');
}
function closeClanBattleModal(){
  document.getElementById('cb-modal')?.classList.remove('show');
  try{ if(_cbState.listUnsub) _cbState.listUnsub(); }catch(e){}
  _cbState.listUnsub = null;
}
function _cbShowWaitView(){
  const el = _cbEnsureModalEl();
  el.querySelector('#cb-create-view').style.display = 'none';
  el.querySelector('#cb-join-view').style.display = 'none';
  el.querySelector('#cb-wait-view').style.display = '';
  el.querySelector('#cb-code-display').textContent = _cbState.code || '------';
  const hint = el.querySelector('#cb-wait-hint');
  const cancelBtn = el.querySelector('#cb-cancel-btn');
  if(_cbState.role === 'guest'){
    if(hint) hint.textContent = 'Bạn đã tham gia phòng thách đấu này:';
    if(cancelBtn){ cancelBtn.textContent = 'Rời màn hình chờ'; }
  } else {
    if(hint) hint.textContent = 'Gửi mã này cho clan đối thủ để họ vào phòng thách đấu:';
    if(cancelBtn){ cancelBtn.textContent = 'Huỷ phòng'; }
  }
}

/* ── Tạo challenge: collection clanBattles/{battleId} ── */
async function clanBattleCreateChallenge(mode){
  try{
    if(!await _acgrpEnsureOnline()){ _cbToast('⚠️ Cần đăng nhập online'); return; }
    const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
    const guildId = (typeof _acgrpState !== 'undefined') ? _acgrpState.guildId : null;
    const guild = (typeof _acgrpState !== 'undefined') ? _acgrpState.guild : null;
    const myRole = (typeof _acgrpState !== 'undefined' && _acgrpState.me) ? _acgrpState.me.role : null;
    if(!uid || !guildId || !guild){ _cbToast('⚠️ Bạn chưa ở trong clan nào'); return; }
    if(myRole !== 'leader' && myRole !== 'deputy'){ _cbToast('⚠️ Chỉ trưởng/phó nhóm mới thách đấu được'); return; }
    const db = _cbDb();
    if(!db){ _cbToast('⚠️ Không kết nối được máy chủ'); return; }

    // Dọn phòng thách đấu cũ của CHÍNH clan này (nếu còn "open" và chưa ai vào)
    // trước khi tạo phòng mới — tránh 1 clan có nhiều phòng chờ song song.
    try{
      const mineSnap = await db.collection('clanBattles')
        .where('hostUid', '==', uid).where('status', '==', 'open').limit(5).get();
      await Promise.all(mineSnap.docs.map(d => d.ref.delete().catch(()=>{})));
    }catch(e){ /* không chặn tạo phòng mới nếu dọn lỗi */ }

    const code = _cbGenCode();
    const ref = db.collection('clanBattles').doc();
    const battleData = {
      code,
      mode: (mode === 'versus') ? 'versus' : 'caro',
      status: 'open',
      hostClanId: guildId,
      hostClanName: guild.name || '',
      hostUid: uid,
      hostName: (typeof getOnlineDisplayName === 'function') ? getOnlineDisplayName() : '',
      hostAvatar: (typeof getOnlineAvatar === 'function') ? getOnlineAvatar() : null,
      hostRole: myRole,
      guestClanId: null,
      guestClanName: null,
      guestUid: null,
      guestName: null,
      guestAvatar: null,
      guestRole: null,
      roomId: null,
      winnerClanId: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(battleData);
    _cbState.battleId = ref.id;
    _cbState.code = code;
    _cbState.role = 'host';
    _cbShowWaitView();
    _cbListenBattle(ref.id);
  }catch(e){
    _cbToast('⚠️ ' + ((e && e.message) || 'Tạo phòng thất bại'));
  }
}

/* ── Task 2: Tham gia phòng thách đấu clan đối phương ── */

// Danh sách công khai các phòng "open" (chưa ai ghép), loại trừ phòng của
// chính clan mình (không tự thách đấu clan mình). Chỉ tải 1 lần/khi bấm làm
// mới hoặc mở tab — không giữ listener realtime cho danh sách để nhẹ đường
// truyền (mỗi phòng vẫn tự cập nhật realtime qua _cbListenBattle khi đã vào).
async function cbLoadOpenList(){
  const el = document.getElementById('cb-modal');
  const listEl = el && el.querySelector('#cb-list');
  if(!listEl) return;
  listEl.innerHTML = '<div class="cb-list-empty">Đang tải…</div>';
  try{
    if(!await _acgrpEnsureOnline()){ listEl.innerHTML = '<div class="cb-list-empty">⚠️ Cần đăng nhập online</div>'; return; }
    const db = _cbDb();
    if(!db){ listEl.innerHTML = '<div class="cb-list-empty">⚠️ Không kết nối được máy chủ</div>'; return; }
    const myGuildId = (typeof _acgrpState !== 'undefined') ? _acgrpState.guildId : null;
    const snap = await db.collection('clanBattles')
      .where('status', '==', 'open').orderBy('createdAt', 'desc').limit(20).get();
    const rooms = snap.docs
      .map(d => Object.assign({ battleId: d.id }, d.data()))
      .filter(r => r.hostClanId !== myGuildId);
    if(!rooms.length){ listEl.innerHTML = '<div class="cb-list-empty">Chưa có clan nào đang thách đấu.</div>'; return; }
    listEl.innerHTML = rooms.map(_cbRoomRowHtml).join('');
    listEl.querySelectorAll('.cb-row [data-join]').forEach(btn=>{
      btn.addEventListener('click', ()=> cbJoinBattle(btn.dataset.join));
    });
  }catch(e){
    listEl.innerHTML = '<div class="cb-list-empty">⚠️ ' + _cbEsc((e && e.message) || 'Lỗi tải danh sách') + '</div>';
  }
}
function _cbRoomRowHtml(r){
  const modeInfo = CB_MODES.find(m => m.id === r.mode) || CB_MODES[0];
  return '<div class="cb-row">'
    + '<div class="cb-row-main">'
    +   '<div class="cb-row-name">' + _cbEsc(r.hostClanName || '?') + '</div>'
    +   '<div class="cb-row-sub">' + modeInfo.icon + ' ' + _cbEsc(modeInfo.name) + ' · ' + _cbEsc(r.code || '') + '</div>'
    + '</div>'
    + '<button type="button" class="acgrp-btn purple" data-join="' + r.battleId + '">Vào</button>'
    + '</div>';
}

async function cbJoinByCode(code){
  try{
    if(!await _acgrpEnsureOnline()){ _cbToast('⚠️ Cần đăng nhập online'); return; }
    const db = _cbDb();
    if(!db){ _cbToast('⚠️ Không kết nối được máy chủ'); return; }
    const snap = await db.collection('clanBattles')
      .where('code', '==', code).where('status', '==', 'open').limit(1).get();
    if(snap.empty){ _cbToast('⚠️ Không tìm thấy phòng (mã sai hoặc đã có người ghép)'); return; }
    await cbJoinBattle(snap.docs[0].id);
  }catch(e){
    _cbToast('⚠️ ' + ((e && e.message) || 'Vào phòng thất bại'));
  }
}

// Ghép vào 1 battle cụ thể — dùng transaction để 2 clan không thể cùng ghép
// vào 1 phòng cùng lúc (transaction đọc lại status ngay trước khi ghi; nếu ai
// đó đã ghép trước, resource.data.status != 'open' nữa → rule cbJoinOk() ở
// firestore.rules cũng chặn lại lần nữa ở tầng server, không chỉ tin transaction).
async function cbJoinBattle(battleId){
  try{
    if(!await _acgrpEnsureOnline()){ _cbToast('⚠️ Cần đăng nhập online'); return; }
    const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
    const guildId = (typeof _acgrpState !== 'undefined') ? _acgrpState.guildId : null;
    const guild = (typeof _acgrpState !== 'undefined') ? _acgrpState.guild : null;
    const myRole = (typeof _acgrpState !== 'undefined' && _acgrpState.me) ? _acgrpState.me.role : null;
    if(!uid || !guildId || !guild){ _cbToast('⚠️ Bạn chưa ở trong clan nào'); return; }
    if(myRole !== 'leader' && myRole !== 'deputy'){ _cbToast('⚠️ Chỉ trưởng/phó nhóm mới tham gia đấu clan được'); return; }
    const db = _cbDb();
    if(!db){ _cbToast('⚠️ Không kết nối được máy chủ'); return; }

    const ref = db.collection('clanBattles').doc(battleId);
    let joinedCode = null;
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if(!snap.exists) throw new Error('Phòng không còn tồn tại');
      const d = snap.data();
      if(d.status !== 'open') throw new Error('Phòng đã có clan khác ghép vào');
      if(d.hostClanId === guildId) throw new Error('Không thể tự thách đấu clan mình');
      joinedCode = d.code;
      tx.update(ref, {
        status: 'matched',
        guestClanId: guildId,
        guestClanName: guild.name || '',
        guestUid: uid,
        guestName: (typeof getOnlineDisplayName === 'function') ? getOnlineDisplayName() : '',
        guestAvatar: (typeof getOnlineAvatar === 'function') ? getOnlineAvatar() : null,
        guestRole: myRole,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    _cbState.battleId = battleId;
    _cbState.code = joinedCode;
    _cbState.role = 'guest';
    _cbShowWaitView();
    _cbListenBattle(battleId);
  }catch(e){
    _cbToast('⚠️ ' + ((e && e.message) || 'Vào phòng thất bại'));
  }
}

function _cbListenBattle(battleId){
  try{ if(_cbState.unsub) _cbState.unsub(); }catch(e){}
  const db = _cbDb();
  if(!db) return;
  _cbState.unsub = db.collection('clanBattles').doc(battleId).onSnapshot(doc=>{
    if(!doc.exists){
      _cbState.battleId = null; _cbState.code = null; _cbState.role = null;
      closeClanBattleModal();
      return;
    }
    const d = doc.data();
    const el = document.getElementById('cb-modal');
    const statusEl = el && el.querySelector('#cb-wait-status');
    if(statusEl && d.status !== 'matched'){
      statusEl.textContent = 'Đang chờ clan khác vào phòng…';
    }
    if(d.status === 'matched'){
      if(d.roomId){
        // Phòng game thật đã có (do host tạo — có thể chính host này hoặc, nếu mình
        // là guest, do host bên kia tạo) → vào thẳng, không cần chờ gì thêm.
        _cbEnterGameRoom(battleId, d);
      } else if(_cbState.role === 'host'){
        // Chỉ HOST của battle này được tạo phòng game thật (khớp rule cbSetRoomIdOk()/
        // roomClanTagOk() ở firestore.rules) — guest chỉ chờ.
        if(statusEl) statusEl.textContent = 'Đã ghép với clan ' + (d.guestClanName || '') + ' — đang mở phòng đấu…';
        _cbHostCreateGameRoom(battleId, d);
      } else if(statusEl){
        statusEl.textContent = 'Đã ghép với clan ' + (d.hostClanName || '') + ' — đang chờ mở phòng đấu…';
      }
    }
  }, ()=>{});
}

// Guard chống gọi tạo phòng 2 lần (Firestore có thể bắn lại snapshot trước khi
// roomId kịp ghi ngược lại clanBattles) và chống mở lobby 2 lần.
let _cbCreatingRoomFor = null;
let _cbEnteredRoomFor = null;

async function _cbHostCreateGameRoom(battleId, battle){
  if(_cbCreatingRoomFor === battleId) return;
  _cbCreatingRoomFor = battleId;
  try{
    if(typeof createClanBattleRoom !== 'function'){ _cbToast('⚠️ Thiếu js/online-services.js (createClanBattleRoom)'); return; }
    const created = await createClanBattleRoom(battle.mode, {
      battleId: battleId,
      hostClanId: battle.hostClanId,
      guestClanId: battle.guestClanId
    });
    const db = _cbDb();
    await db.collection('clanBattles').doc(battleId).update({
      roomId: created.roomId,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    _cbEnterGameRoom(battleId, Object.assign({}, battle, { roomId: created.roomId }));
  }catch(e){
    _cbToast('⚠️ ' + ((e && e.message) || 'Mở phòng đấu thất bại'));
    _cbCreatingRoomFor = null; // cho phép thử lại nếu snapshot bắn lại
  }
}

// Vào thẳng phòng Caro/Versus thật ứng với battle đã ghép — dùng lại NGUYÊN
// luồng vào phòng hiện có (caroJoinRoomById / joinOnlineRoomById+openOnlineLobby):
// cả 2 hàm đó đều tự nhận ra "mình chính là hostId của phòng" và trả về sớm mà
// không đòi hỏi gì thêm — nên gọi chung 1 đường cho CẢ host lẫn guest, không
// cần viết 2 nhánh host/guest riêng.
function _cbEnterGameRoom(battleId, battle){
  if(!battle.roomId || _cbEnteredRoomFor === battle.roomId) return;
  _cbEnteredRoomFor = battle.roomId;
  try{ if(_cbState.unsub) _cbState.unsub(); }catch(e){}
  _cbState.unsub = null;
  closeClanBattleModal();
  try{ if(typeof closeAccountHub === 'function') closeAccountHub(); }catch(e){}
  _cbState.battleId = null; _cbState.code = null; _cbState.role = null;
  _cbCreatingRoomFor = null;
  if(battle.mode === 'versus') _cbEnterVersusRoom(battle.roomId);
  else _cbEnterCaroRoom(battle.roomId);
}

async function _cbEnterCaroRoom(roomId){
  try{
    if(typeof caroJoinRoomById !== 'function'){ _cbToast('⚠️ Thiếu js/caro.js (caroJoinRoomById)'); return; }
    await caroJoinRoomById(roomId);
  }catch(e){ _cbToast('⚠️ ' + ((e && e.message) || 'Không vào được phòng Caro')); }
}

async function _cbEnterVersusRoom(roomId){
  try{
    if(typeof joinOnlineRoomById !== 'function' || typeof openOnlineLobby !== 'function'){
      _cbToast('⚠️ Thiếu js/online-ui.js (openOnlineLobby)'); return;
    }
    const data = await joinOnlineRoomById(roomId, { gameType: 'versus' });
    const uid = (typeof getOnlineUid === 'function') ? getOnlineUid() : null;
    const role = (data.hostId === uid) ? 'host' : 'guest';
    openOnlineLobby(data.roomId, data.code, role, data);
  }catch(e){ _cbToast('⚠️ ' + ((e && e.message) || 'Không vào được phòng Đấu 1-1')); }
}

async function cbCancelChallenge(){
  try{
    // Guest chỉ rời MÀN HÌNH CHỜ cục bộ — rules không cho guest xoá phòng của
    // host (đúng thiết kế: trận đã ghép rồi, phải chờ Task 3/9 xử lý tiếp).
    if(_cbState.battleId && _cbState.role === 'host'){
      const db = _cbDb();
      if(db) await db.collection('clanBattles').doc(_cbState.battleId).delete().catch(()=>{});
    }
  }catch(e){}
  try{ if(_cbState.unsub) _cbState.unsub(); }catch(e){}
  _cbState.unsub = null; _cbState.battleId = null; _cbState.code = null; _cbState.role = null;
  closeClanBattleModal();
}
