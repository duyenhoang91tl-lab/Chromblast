// ═══════════════════════════════════════════════════════════════
// js/ui-gates.js — Màn hình chặn đầu (Điều khoản + xin quyền thông báo),
// tách từ ui.js. Dùng chung global scope với ui.js (nạp NGAY SAU).
// ═══════════════════════════════════════════════════════════════

const TOS_ACCEPT_KEY = 'chromablast_tos_accepted_v1';

const NOTIF_ASKED_KEY = 'chromablast_notif_asked_v1';

const NOTIF_PREF_KEY = 'chromablast_notif_pref_v1';

function _gateGet(key){
  try{
    return (typeof safeGet==='function') ? safeGet(key) : localStorage.getItem(key);
  }catch(e){ return null; }
}

function _gateSet(key, val){
  try{
    if(typeof safeSet==='function') safeSet(key, val);
    else localStorage.setItem(key, val);
  }catch(e){}
}

function hasAcceptedTerms(){ return _gateGet(TOS_ACCEPT_KEY) === '1'; }

function setAcceptedTerms(){ _gateSet(TOS_ACCEPT_KEY, '1'); }

function hasAskedNotifications(){ return _gateGet(NOTIF_ASKED_KEY) === '1'; }

function setNotifAsked(pref){
  _gateSet(NOTIF_ASKED_KEY, '1');
  if(pref) _gateSet(NOTIF_PREF_KEY, pref);
}

function _setGateVisible(id, on){
  const el = document.getElementById(id);
  if(!el) return;
  if(on){
    el.style.display = 'flex';
    el.classList.add('show');
  } else {
    el.classList.remove('show');
    el.style.display = 'none';
  }
}

function hideTermsGate(){ _setGateVisible('tos-gate', false); if(typeof syncMenuOpenState==='function') syncMenuOpenState(); }

function hideNotifGate(){ _setGateVisible('notif-gate', false); if(typeof syncMenuOpenState==='function') syncMenuOpenState(); }

function showTermsGate(){
  try{ if(typeof applyI18nDom==='function') applyI18nDom(); }catch(e){}
  hideNotifGate();
  _setGateVisible('tos-gate', true);
  if(typeof syncMenuOpenState==='function') syncMenuOpenState();
}

function showNotifGate(){
  try{ if(typeof applyI18nDom==='function') applyI18nDom(); }catch(e){}
  hideTermsGate();
  _setGateVisible('notif-gate', true);
  if(typeof syncMenuOpenState==='function') syncMenuOpenState();
}

function setStartScreenVisible(on){
  const start = document.getElementById('start-screen');
  if(!start) return;
  if(on){
    start.style.display = 'flex';
    start.classList.remove('hide');
  } else {
    start.classList.add('hide');
    start.style.display = 'none';
  }
}

function preGameGatesReady(){
  return hasAcceptedTerms() && hasAskedNotifications();
}

/** Auth xong → Điều khoản → Hỏi thông báo → menu Bắt đầu (ẩn start tới khi xong) */

function maybeShowPreGameGates(){
  const auth = document.getElementById('auth-screen');
  // Còn màn đăng nhập → chưa sang bước 2/3/4
  if(auth && auth.style.display !== 'none' && !auth.classList.contains('hide')){
    hideTermsGate();
    hideNotifGate();
    setStartScreenVisible(false);
    if(typeof syncMenuOpenState==='function') syncMenuOpenState();
    return;
  }

  if(!hasAcceptedTerms()){
    setStartScreenVisible(false);
    showTermsGate();
    return;
  }
  hideTermsGate();
  if(!hasAskedNotifications()){
    setStartScreenVisible(false);
    showNotifGate();
    return;
  }
  hideNotifGate();
  setStartScreenVisible(true);
  if(typeof syncMenuOpenState==='function') syncMenuOpenState();
}

async function requestBrowserNotifications(){
  try{
    const cap = window.Capacitor;
    if(cap && cap.isNativePlatform && cap.isNativePlatform()){
      // Trên app Android thật — dùng plugin native (@capacitor/local-notifications),
      // Web Notification API không hoạt động đáng tin cậy trong WebView.
      if(typeof window.requestNativeNotificationPermission === 'function'){
        const perm = await window.requestNativeNotificationPermission();
        if(perm === 'granted' && typeof window.scheduleDailyRewardReminder === 'function'){
          try{ window.scheduleDailyRewardReminder(); }catch(e){}
        }
        return perm;
      }
      return 'unsupported';
    }
    if(typeof Notification === 'undefined') return 'unsupported';
    if(Notification.permission === 'granted') return 'granted';
    if(Notification.permission === 'denied') return 'denied';
    const res = await Notification.requestPermission();
    return res || 'default';
  }catch(e){ return 'error'; }
}

function initPreGameGates(){
  document.getElementById('tos-accept-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    setAcceptedTerms();
    hideTermsGate();
    maybeShowPreGameGates();
  });
  document.getElementById('tos-open-terms')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    window.open('terms-of-service.html', '_blank', 'noopener');
  });
  document.getElementById('tos-open-privacy')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    window.open('privacy-policy.html', '_blank', 'noopener');
  });
  document.getElementById('notif-allow-btn')?.addEventListener('click', async ()=>{
    try{ sfxClick(); }catch(e){}
    const perm = await requestBrowserNotifications();
    setNotifAsked(perm === 'granted' ? 'allow' : 'deny');
    hideNotifGate();
    maybeShowPreGameGates();
  });
  document.getElementById('notif-deny-btn')?.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    setNotifAsked('deny');
    hideNotifGate();
    maybeShowPreGameGates();
  });
  maybeShowPreGameGates();
}

