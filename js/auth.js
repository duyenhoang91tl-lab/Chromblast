// ═══════════════════════════════════════════════════════════════
// js/auth.js — ĐĂNG NHẬP / ĐĂNG KÝ / ĐĂNG XUẤT / MÀN HÌNH AUTH
// Tách verbatim khỏi main.js. Nạp TRƯỚC main.js. Dùng chung biến currentUser
// (khai báo trong main.js) + loadUsers/saveUsers/setSession/clearSession (save.js).
// ═══════════════════════════════════════════════════════════════

function applyLoggedInUser(username){
  const users = loadUsers();
  const u = users[username];
  if(!u) return false;
  currentUser = { username, role: u.role || 'user' };
  setSession(username);
  const nameBox = document.getElementById('account-username-box');
  if(nameBox){
    if(typeof formatPlayerNameHtml === 'function') nameBox.innerHTML = formatPlayerNameHtml(typeof getPlayerNickname==='function'?getPlayerNickname():username);
    else nameBox.textContent = username;
  }
  if(typeof updateDailyBadge === 'function') updateDailyBadge(); // khoá lưu quà đổi theo tài khoản
  return true;
}

function doLogin(username, password){
  const errBox = document.getElementById('login-error');
  errBox.textContent = '';
  if(!username || !password){ errBox.textContent = t('errFillAll'); return; }
  const users = loadUsers();
  const u = users[username];
  if(!u || u.password !== password){
    errBox.textContent = t('errWrongLogin');
    return;
  }
  applyLoggedInUser(username);
  hideAuthScreen();
}

function doRegister(username, password, password2){
  const errBox = document.getElementById('register-error');
  errBox.textContent = '';
  if(!username || !password || !password2){ errBox.textContent = t('errFillAll'); return; }
  if(username.length < 3){ errBox.textContent = t('errUserShort'); return; }
  if(password.length < 4){ errBox.textContent = t('errPassShort'); return; }
  if(password !== password2){ errBox.textContent = t('errPassMismatch'); return; }
  const users = loadUsers();
  if(users[username]){ errBox.textContent = t('errUserExists'); return; }
  users[username] = { password, role: 'user' };
  saveUsers(users);
  applyLoggedInUser(username);
  hideAuthScreen();
}

function isOverlayScreenOpen(el){
  if(!el) return false;
  // Chỉ tin style.display inline. Không dùng getComputedStyle:
  // body.auth-open #start-screen { display:none } khiến start bị coi là đóng
  // ngay khi auth vừa tắt → menu-open bị gỡ → lộ #game-root dưới màn Bắt đầu.
  if(el.style.display === 'none') return false;
  if(el.classList.contains('hide')) return false;
  return true;
}

/** Ẩn #game-root khi auth/start/tos đang mở; ẩn #start-screen khi auth đang mở. */
function syncMenuOpenState(){
  const auth = document.getElementById('auth-screen');
  const start = document.getElementById('start-screen');
  const tos = document.getElementById('tos-gate');
  const notif = document.getElementById('notif-gate');
  const authOpen = isOverlayScreenOpen(auth);
  // Gỡ auth-open trước khi đọc start (tránh CSS ẩn start làm lệch trạng thái)
  document.body.classList.toggle('auth-open', !!authOpen);
  const startOpen = isOverlayScreenOpen(start);
  const tosOpen = !!(tos && (tos.classList.contains('show') || tos.style.display === 'flex'));
  const notifOpen = !!(notif && (notif.classList.contains('show') || notif.style.display === 'flex'));
  const menuOpen = !!(authOpen || startOpen || tosOpen || notifOpen);
  document.body.classList.toggle('menu-open', menuOpen);
  document.body.classList.toggle('start-open', !!(!authOpen && startOpen && !tosOpen && !notifOpen));
  document.body.classList.toggle('tos-open', !!(!authOpen && tosOpen));
  document.body.classList.toggle('notif-open', !!(!authOpen && notifOpen));
  try{ if(typeof syncChatFabVisibility === 'function') syncChatFabVisibility(); }catch(e){}
}

function hideAuthScreen(){
  const authScreen = document.getElementById('auth-screen');
  authScreen.classList.add('hide');
  syncMenuOpenState();
  try{ if(typeof maybeShowPreGameGates==='function') maybeShowPreGameGates(); }catch(e){}
  setTimeout(()=>{
    authScreen.style.display='none';
    syncMenuOpenState();
    try{ if(typeof maybeShowPreGameGates==='function') maybeShowPreGameGates(); }catch(e){}
  }, 500);
}

function initAuthScreen(){
  loadUsers();

  if(storageBlocked){
    const sub = document.querySelector('.auth-sub');
    if(sub) sub.insertAdjacentHTML('afterend',
      '<div style="text-align:center;color:#ffcc55;font-size:11px;margin:-14px 0 18px;">'
      +'⚠️ Trình duyệt đang chặn lưu trữ — tài khoản chỉ tồn tại trong phiên này.<br>Tải file về và mở trực tiếp để lưu vĩnh viễn.</div>');
  }

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const guestBtn = document.getElementById('guest-play-btn');

  guestBtn.addEventListener('click', ()=>{
    sfxClick();
    currentUser = null;
    if(typeof updateDailyBadge === 'function') updateDailyBadge();
    hideAuthScreen();
  });

  showRegister.addEventListener('click', ()=>{
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
  });
  showLogin.addEventListener('click', ()=>{
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
  });

  loginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    doLogin(
      document.getElementById('login-username').value.trim(),
      document.getElementById('login-password').value
    );
  });
  registerForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    doRegister(
      document.getElementById('register-username').value.trim(),
      document.getElementById('register-password').value,
      document.getElementById('register-password2').value
    );
  });

  // Khôi phục phiên nếu còn; không chặn bằng màn đăng nhập (guest mặc định)
  const savedSession = getSession();
  if(savedSession && loadUsers()[savedSession]){
    applyLoggedInUser(savedSession);
  } else {
    currentUser = null;
    if(typeof updateDailyBadge === 'function') updateDailyBadge();
  }

  const authScreen = document.getElementById('auth-screen');
  if(authScreen){
    authScreen.style.display = 'none';
    authScreen.classList.add('hide');
  }

  if(typeof syncMenuOpenState === 'function') syncMenuOpenState();
  // Điều khoản + hỏi thông báo trước menu Bắt đầu
  try{ if(typeof maybeShowPreGameGates==='function') maybeShowPreGameGates(); }catch(e){}
}

function doLogout(){
  clearSession();
  currentUser = null;
  location.reload(); // tải lại trang để đưa về màn hình đăng nhập, dọn sạch trạng thái game
}
