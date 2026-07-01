// app.js — small behavioural glue for chromablast.html (refactor branch)
// This file provides minimal interactivity so the page works after refactor:
// - toggles between start/auth screens
// - simple modal open/close for account/admin
// - keyboard accessibility improvements

document.addEventListener('DOMContentLoaded', () => {
  const startScreen = document.getElementById('start-screen');
  const startBtn = document.getElementById('start-btn');
  const guestBtn = document.getElementById('guest-play-btn');
  const authScreen = document.getElementById('auth-screen');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const accountBtn = document.getElementById('account-btn');
  const accountPanel = document.getElementById('account-panel');
  const accountClose = document.getElementById('account-close-btn');
  const adminBtn = document.getElementById('admin-btn');
  const adminPanel = document.getElementById('admin-panel');
  const adminClose = adminPanel && adminPanel.querySelector('.admin-close');
  const muteBtn = document.getElementById('mute-btn');
  const pauseBtn = document.getElementById('pause-btn');

  function hideStart() {
    if (startScreen) startScreen.classList.add('hide');
    if (authScreen) authScreen.classList.add('hide');
  }

  if (startBtn) startBtn.addEventListener('click', () => {
    hideStart();
    // focus game root for keyboard controls
    const gameRoot = document.getElementById('game-root');
    if (gameRoot) gameRoot.focus();
  });

  if (guestBtn) guestBtn.addEventListener('click', (e) => {
    // Guest play hides auth and start screens and starts the game
    e.preventDefault();
    hideStart();
    // placeholder: start game logic would go here
    console.log('Guest play: start game');
  });

  if (showRegister) showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
  });
  if (showLogin) showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
  });

  if (loginForm) loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    if (!user) {
      const err = document.getElementById('login-error');
      if (err) err.textContent = 'Vui lòng nhập tên đăng nhập.';
      return;
    }
    // mock success: close auth and start game
    authScreen.classList.add('hide');
    startScreen.classList.add('hide');
    document.getElementById('account-username-box').textContent = user;
  });

  if (registerForm) registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const p1 = document.getElementById('register-password').value;
    const p2 = document.getElementById('register-password2').value;
    const err = document.getElementById('register-error');
    if (p1 !== p2) {
      if (err) err.textContent = 'Mật khẩu không khớp.';
      return;
    }
    // mock register success
    authScreen.classList.add('hide');
    startScreen.classList.add('hide');
    document.getElementById('account-username-box').textContent = document.getElementById('register-username').value || 'Guest';
  });

  if (accountBtn && accountPanel) {
    accountBtn.addEventListener('click', () => {
      accountPanel.classList.add('show');
      accountPanel.setAttribute('aria-hidden','false');
      // trap focus simply by focusing close button
      const btn = document.getElementById('account-close-btn');
      if (btn) btn.focus();
    });
  }
  if (accountClose) {
    accountClose.addEventListener('click', () => {
      accountPanel.classList.remove('show');
      accountPanel.setAttribute('aria-hidden','true');
      accountBtn.focus();
    });
  }

  if (adminBtn && adminPanel) {
    adminBtn.addEventListener('click', () => {
      adminPanel.classList.add('show');
      adminPanel.setAttribute('aria-hidden','false');
    });
  }
  if (adminClose) adminClose.addEventListener('click', () => {
    adminPanel.classList.remove('show');
    adminPanel.setAttribute('aria-hidden','true');
  });

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const muted = muteBtn.getAttribute('data-muted') === 'true';
      muteBtn.setAttribute('data-muted', (!muted).toString());
      muteBtn.textContent = muted ? '🔊' : '🔈';
    });
  }
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      const paused = pauseBtn.getAttribute('data-paused') === 'true';
      pauseBtn.setAttribute('data-paused', (!paused).toString());
      pauseBtn.textContent = paused ? '⏸' : '▶';
    });
  }

  // keyboard: Enter on start triggers start
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement === document.body) {
      if (startBtn) startBtn.click();
    }
  });

});
