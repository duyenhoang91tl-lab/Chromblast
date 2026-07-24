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
   ⭐ TIẾN TRÌNH MAP THƯỜNG ★★★ → MỞ MAP ẨN (chromablast_normal_stars)
   Cần phá 2 map thường (mỗi map đủ 3 sao điểm) để mở 1 map ẩn.
────────────────────────────────────────── */
function getSavedNormalStarProgress(){
  try{ return JSON.parse(localStorage.getItem('chromablast_normal_stars')||'{}'); }
  catch(e){ return {}; }
}
function saveNormalStarProgressData(data){
  try{ localStorage.setItem('chromablast_normal_stars', JSON.stringify(data||{})); }catch(e){}
}

/* ──────────────────────────────────────────
   🗺️ MỞ KHÓA MAP ẨN ĐÃ THẮNG (chromablast_cleared_maps)
────────────────────────────────────────── */
const CLEARED_MAPS_ALIAS = { secret:'secret1' }; // 'secret' (khoá nội bộ) === 'secret1' (khoá trong HIDDEN_MAP_LIST)
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
  try{ if(typeof onHiddenMapClearedForBrick==='function') onHiddenMapClearedForBrick(aliased); }catch(e){}
  try{ if(typeof onHiddenMapClearedForBoard==='function') onHiddenMapClearedForBoard(); }catch(e){}
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
  // Gỡ tài khoản admin test (nếu còn từ bản cũ) trước khi lên CH Play
  if(users['admin']){
    delete users['admin'];
    saveUsers(users);
  }
  return users;
}
function saveUsers(users){ safeSet(AUTH_USERS_KEY, JSON.stringify(users)); }

function setSession(username){ safeSet(AUTH_SESSION_KEY, username); }
function getSession(){ return safeGet(AUTH_SESSION_KEY); }
function clearSession(){ safeRemove(AUTH_SESSION_KEY); }
