/* ══════════════════════════════════════════════════════════════════════════
   save.js — TOÀN BỘ CHỨC NĂNG LƯU / TẢI DỮ LIỆU CỦA CHROMABLAST
   (localStorage, save game, load game, cài đặt, mở khóa map, high score,
   tài khoản đăng nhập/đăng ký...)

   File này PHẢI được nạp TRƯỚC js/main.js (xem thẻ <script> trong index.html).
   main.js chỉ GỌI các hàm ở đây, không tự đọc/ghi localStorage trực tiếp nữa.
   Không đổi tên bất kỳ hàm/biến công khai nào đang được main.js sử dụng —
   chỉ di dời phần thân xử lý lưu trữ sang file riêng này.
══════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   LỚP BỌC AN TOÀN CHO localStorage
   Một số trình duyệt/khung xem trước (vd: xem trực tiếp trong khung chat)
   chặn localStorage và ném lỗi. Khi đó ta tự chuyển sang lưu tạm trong bộ
   nhớ để các chức năng vẫn hoạt động được trong phiên hiện tại (chỉ mất
   khi tải lại trang).
────────────────────────────────────────── */
const memoryStore = {};
let storageBlocked = false;
function safeGet(key){
  try { return localStorage.getItem(key); }
  catch(e){ storageBlocked = true; return (key in memoryStore) ? memoryStore[key] : null; }
}
function safeSet(key, value){
  try { localStorage.setItem(key, value); }
  catch(e){ storageBlocked = true; memoryStore[key] = value; }
}
function safeRemove(key){
  try { localStorage.removeItem(key); }
  catch(e){ storageBlocked = true; delete memoryStore[key]; }
}

/* ──────────────────────────────────────────
   🚀 CHẾ ĐỘ ADVENTURE — mở khóa khi đạt 10.000 điểm
────────────────────────────────────────── */
function getAdventureUnlocked(){ return localStorage.getItem('adventureUnlocked')==='1'; }
function saveAdventureUnlocked(){ localStorage.setItem('adventureUnlocked','1'); }

/* ──────────────────────────────────────────
   ⭐ XP & LEVEL NGƯỜI CHƠI (chromablast_player)
────────────────────────────────────────── */
function getSavedPlayerData(){
  try{ return JSON.parse(localStorage.getItem('chromablast_player')||'{}'); }
  catch(e){ return {}; }
}
function savePlayerXP(){
  try{ localStorage.setItem('chromablast_player', JSON.stringify({xp:playerXP, level:playerLevel})); }catch(e){}
}

/* ──────────────────────────────────────────
   🏆 ĐIỂM SỐ / KỶ LỤC (chromablast_save: best, highScore)
────────────────────────────────────────── */
function getSavedGameData(){
  try { return JSON.parse(localStorage.getItem('chromablast_save')||'{}'); }
  catch(e){ return {}; }
}
let _lastSaveAt=0;
function saveProgress(force){
  const now=performance.now();
  if(!force && now-_lastSaveAt<500) return; // tránh ghi localStorage liên tục mỗi frame gây giật
  _lastSaveAt=now;
  try {
    const save = JSON.parse(localStorage.getItem('chromablast_save')||'{}');
    save.best = best;
    save.highScore = score > (save.highScore||0) ? score : save.highScore;
    localStorage.setItem('chromablast_save', JSON.stringify(save));
  } catch(e){}
}

/* ──────────────────────────────────────────
   ⚙️ CÀI ĐẶT NHỊP & THƯỞNG (chromablast_mechcfg)
────────────────────────────────────────── */
function getSavedMechCfg(){
  try{ return JSON.parse(localStorage.getItem('chromablast_mechcfg')||'{}'); }
  catch(e){ return {}; }
}
function saveMechCfg(){
  try{
    const o={};
    Object.keys(MECH_CFG).forEach(k=>{ o[k]={nhip:MECH_CFG[k].nhip, thuong:MECH_CFG[k].thuong, phat:MECH_CFG[k].phat}; });
    localStorage.setItem('chromablast_mechcfg', JSON.stringify(o));
  }catch(e){}
}

/* ──────────────────────────────────────────
   🌗 TIẾN TRÌNH VÒNG CƠ CHẾ ĐÔI (chromablast_combo_tier)
────────────────────────────────────────── */
function getSavedComboTier(){
  try{
    const s=parseInt(localStorage.getItem('chromablast_combo_tier')||'20',10);
    if(!isNaN(s) && s>=20 && s<=41) return s;
  }catch(e){}
  return 20;
}
function saveComboProgress(){ try{ localStorage.setItem('chromablast_combo_tier', String(maxComboTierReached)); }catch(e){} }

/* ──────────────────────────────────────────
   🔁 CÀI ĐẶT TỰ ĐỘNG BỎ QUA POPUP MỞ MAP ẨN (autoSkipHiddenMaps)
────────────────────────────────────────── */
function getAutoSkipHiddenMaps(){ return localStorage.getItem('autoSkipHiddenMaps')==='1'; }
function saveAutoSkipHiddenMaps(val){ localStorage.setItem('autoSkipHiddenMaps', val?'1':'0'); }

/* ──────────────────────────────────────────
   📖 ĐÃ ĐỌC LUẬT CHƠI CHƯA (chromablast_rules_read)
────────────────────────────────────────── */
function saveRulesRead(){ safeSet('chromablast_rules_read','1'); }
function isRulesRead(){ return safeGet('chromablast_rules_read')==='1'; }

/* ──────────────────────────────────────────
   🗺️ MỞ KHÓA MAP ẨN ĐÃ THẮNG (chromablast_cleared_maps)
────────────────────────────────────────── */
const CLEARED_MAPS_ALIAS = { secret:'secret1' }; // 'secret' (khoá nội bộ) === 'secret1' (khoá trong ADMIN_MAPS)
function getSavedClearedMaps(){
  try{ return JSON.parse(localStorage.getItem('chromablast_cleared_maps')||'[]'); }
  catch(e){ return []; }
}
function markMapCleared(key){
  const aliased = CLEARED_MAPS_ALIAS[key]||key;
  if(clearedHiddenMaps.has(aliased)) return;
  clearedHiddenMaps.add(aliased);
  localStorage.setItem('chromablast_cleared_maps', JSON.stringify([...clearedHiddenMaps]));
  renderHiddenMapMenu();
}

/* ──────────────────────────────────────────
   AUTH — Tài khoản đăng nhập / đăng ký / phiên đăng nhập
────────────────────────────────────────── */
const AUTH_USERS_KEY = 'chromablast_users';
const AUTH_SESSION_KEY = 'chromablast_session';

function loadUsers(){
  let users;
  try { users = JSON.parse(safeGet(AUTH_USERS_KEY) || 'null'); } catch(e){ users = null; }
  if(!users || typeof users !== 'object'){ users = {}; }
  // Đảm bảo luôn có tài khoản admin mặc định: admin / Admin@291091
  if(!users['admin']){
    users['admin'] = { password: 'Admin@291091', role: 'admin' };
    saveUsers(users);
  } else if(users['admin'].password === 'admin'){
    // nâng cấp mật khẩu mặc định cũ ('admin') sang mật khẩu mới — không đụng tới
    // trường hợp admin đã tự đổi mật khẩu riêng
    users['admin'].password = 'Admin@291091';
    saveUsers(users);
  }
  return users;
}
function saveUsers(users){ safeSet(AUTH_USERS_KEY, JSON.stringify(users)); }

function setSession(username){ safeSet(AUTH_SESSION_KEY, username); }
function getSession(){ return safeGet(AUTH_SESSION_KEY); }
function clearSession(){ safeRemove(AUTH_SESSION_KEY); }
