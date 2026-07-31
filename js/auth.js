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

function doRegister(username, password, password2, secQ, secA){
  const errBox = document.getElementById('register-error');
  errBox.textContent = '';
  if(!username || !password || !password2 || !secA){ errBox.textContent = t('errFillAll'); return; }
  if(username.length < 3){ errBox.textContent = t('errUserShort'); return; }
  if(password.length < 4){ errBox.textContent = t('errPassShort'); return; }
  if(password !== password2){ errBox.textContent = t('errPassMismatch'); return; }
  const users = loadUsers();
  if(users[username]){ errBox.textContent = t('errUserExists'); return; }
  users[username] = { password, role: 'user', secQ, secA: secA.trim().toLowerCase() };
  saveUsers(users);
  applyLoggedInUser(username);
  hideAuthScreen();
}

/** Bước 1 khôi phục mật khẩu: tìm tài khoản, trả về câu hỏi bảo mật nếu có. */
function doForgotFind(username){
  const errBox = document.getElementById('forgot-step1-error');
  errBox.textContent = '';
  if(!username){ errBox.textContent = t('errFillAll'); return; }
  const users = loadUsers();
  const u = users[username];
  if(!u){ errBox.textContent = t('errUserNotFound'); return; }
  if(!u.secQ || !u.secA){ errBox.textContent = t('errNoSecurityQ'); return; }
  document.getElementById('forgot-question-label').textContent = t(u.secQ) || t('lblSecurityA');
  document.getElementById('forgot-step1').style.display = 'none';
  document.getElementById('forgot-step2').style.display = '';
  document.getElementById('forgot-step2').dataset.username = username;
}

/** Bước 2 khôi phục mật khẩu: xác minh câu trả lời rồi đặt mật khẩu mới. */
function doForgotReset(answer, newPassword, newPassword2){
  const errBox = document.getElementById('forgot-step2-error');
  errBox.textContent = '';
  const username = document.getElementById('forgot-step2').dataset.username;
  const users = loadUsers();
  const u = users[username];
  if(!u){ errBox.textContent = t('errUserNotFound'); return; }
  if(!answer || (answer.trim().toLowerCase() !== u.secA)){ errBox.textContent = t('errWrongAnswer'); return; }
  if(!newPassword || newPassword.length < 4){ errBox.textContent = t('errPassShort'); return; }
  if(newPassword !== newPassword2){ errBox.textContent = t('errPassMismatch'); return; }
  u.password = newPassword;
  saveUsers(users);
  const loginErr = document.getElementById('login-error');
  if(loginErr) loginErr.textContent = '';
  document.getElementById('login-username').value = username;
  alert(t('forgotResetSuccess'));
  showAuthForm('login');
}

/** Chuyển giữa 3 form của màn auth: login / register / forgot. */
function showAuthForm(which){
  const forms = { login: document.getElementById('login-form'), register: document.getElementById('register-form'), forgot: document.getElementById('forgot-form') };
  Object.keys(forms).forEach(k=>{ if(forms[k]) forms[k].classList.toggle('active', k===which); });
  if(which !== 'forgot'){
    // Reset về bước 1 mỗi lần rời form quên mật khẩu
    const s1 = document.getElementById('forgot-step1'), s2 = document.getElementById('forgot-step2');
    if(s1) s1.style.display = '';
    if(s2){ s2.style.display = 'none'; delete s2.dataset.username; }
    const fu = document.getElementById('forgot-username'); if(fu) fu.value='';
    const fa = document.getElementById('forgot-answer'); if(fa) fa.value='';
    const fp1 = document.getElementById('forgot-new-password'); if(fp1) fp1.value='';
    const fp2 = document.getElementById('forgot-new-password2'); if(fp2) fp2.value='';
    const e1 = document.getElementById('forgot-step1-error'); if(e1) e1.textContent='';
    const e2 = document.getElementById('forgot-step2-error'); if(e2) e2.textContent='';
  }
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
      +'⚠️ Trình duyệt đang chặn lưu trữ lâu dài — tài khoản vẫn giữ khi tải lại trang (F5) nhưng sẽ mất nếu đóng tab/cửa sổ này.</div>');
  }

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const forgotForm = document.getElementById('forgot-form');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const showForgot = document.getElementById('show-forgot');
  const showLoginFromForgot = document.getElementById('show-login-from-forgot');
  const guestBtn = document.getElementById('guest-play-btn');

  guestBtn.addEventListener('click', ()=>{
    sfxClick();
    currentUser = null;
    if(typeof updateDailyBadge === 'function') updateDailyBadge();
    hideAuthScreen();
  });

  showRegister.addEventListener('click', ()=> showAuthForm('register'));
  showLogin.addEventListener('click', ()=> showAuthForm('login'));
  if(showForgot) showForgot.addEventListener('click', ()=> showAuthForm('forgot'));
  if(showLoginFromForgot) showLoginFromForgot.addEventListener('click', ()=> showAuthForm('login'));

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
      document.getElementById('register-password2').value,
      document.getElementById('register-secq').value,
      document.getElementById('register-seca').value
    );
  });
  document.getElementById('forgot-find-btn')?.addEventListener('click', ()=>{
    doForgotFind(document.getElementById('forgot-username').value.trim());
  });
  if(forgotForm) forgotForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    doForgotReset(
      document.getElementById('forgot-answer').value,
      document.getElementById('forgot-new-password').value,
      document.getElementById('forgot-new-password2').value
    );
  });

  // Luồng chuẩn: Đăng nhập → Điều khoản → Thông báo → Menu Bắt đầu
  const authScreen = document.getElementById('auth-screen');
  const savedSession = getSession();
  if(savedSession && loadUsers()[savedSession]){
    applyLoggedInUser(savedSession);
    if(authScreen){
      authScreen.style.display = 'none';
      authScreen.classList.add('hide');
    }
  } else {
    currentUser = null;
    if(typeof updateDailyBadge === 'function') updateDailyBadge();
    if(authScreen){
      authScreen.style.display = 'flex';
      authScreen.classList.remove('hide');
    }
    try{ document.getElementById('login-username')?.focus(); }catch(e){}
  }

  if(typeof syncMenuOpenState === 'function') syncMenuOpenState();
  // Chỉ sang điều khoản/thông báo khi đã xong (hoặc bỏ qua) màn đăng nhập
  if(authScreen?.style.display === 'none' || authScreen?.classList.contains('hide')){
    try{ if(typeof maybeShowPreGameGates==='function') maybeShowPreGameGates(); }catch(e){}
  }
}

function doLogout(){
  clearSession();
  currentUser = null;
  location.reload(); // tải lại trang để đưa về màn hình đăng nhập, dọn sạch trạng thái game
}
