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
  document.getElementById('admin-btn').style.display = (currentUser.role === 'admin') ? 'flex' : 'none';
  const nameBox = document.getElementById('account-username-box');
  if(nameBox) nameBox.textContent = username + (currentUser.role === 'admin' ? ' (admin)' : '');
  if(typeof updateDailyBadge === 'function') updateDailyBadge(); // khoá lưu quà đổi theo tài khoản
  return true;
}

function doLogin(username, password){
  const errBox = document.getElementById('login-error');
  errBox.textContent = '';
  if(!username || !password){ errBox.textContent = 'Vui lòng nhập đầy đủ thông tin.'; return; }
  const users = loadUsers();
  const u = users[username];
  if(!u || u.password !== password){
    errBox.textContent = 'Sai tên đăng nhập hoặc mật khẩu.';
    return;
  }
  applyLoggedInUser(username);
  hideAuthScreen();
}

function doRegister(username, password, password2){
  const errBox = document.getElementById('register-error');
  errBox.textContent = '';
  if(!username || !password || !password2){ errBox.textContent = 'Vui lòng nhập đầy đủ thông tin.'; return; }
  if(username.length < 3){ errBox.textContent = 'Tên đăng nhập cần tối thiểu 3 ký tự.'; return; }
  if(password.length < 4){ errBox.textContent = 'Mật khẩu cần tối thiểu 4 ký tự.'; return; }
  if(password !== password2){ errBox.textContent = 'Mật khẩu nhập lại không khớp.'; return; }
  const users = loadUsers();
  if(users[username]){ errBox.textContent = 'Tên đăng nhập đã tồn tại.'; return; }
  users[username] = { password, role: 'user' };
  saveUsers(users);
  applyLoggedInUser(username);
  hideAuthScreen();
}

function hideAuthScreen(){
  const authScreen = document.getElementById('auth-screen');
  authScreen.classList.add('hide');
  setTimeout(()=>{ authScreen.style.display='none'; }, 500);
}

function initAuthScreen(){
  loadUsers(); // seed tài khoản admin/admin mặc định nếu chưa có

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

  // Nếu đã đăng nhập trước đó (còn phiên) → bỏ qua màn hình đăng nhập
  const savedSession = getSession();
  if(savedSession && loadUsers()[savedSession]){
    applyLoggedInUser(savedSession);
    document.getElementById('auth-screen').style.display = 'none';
  } else {
    document.getElementById('login-username').focus();
  }
}

function doLogout(){
  clearSession();
  currentUser = null;
  location.reload(); // tải lại trang để đưa về màn hình đăng nhập, dọn sạch trạng thái game
}
