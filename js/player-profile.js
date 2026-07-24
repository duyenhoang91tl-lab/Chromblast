// ═══════════════════════════════════════════════════════════════
// js/player-profile.js — Nickname + style (màu / đậm / nghiêng / nhạt)
// Đổi tên lần 1 miễn phí; các lần sau + đổi style cần xem QC.
// Nạp SAU save.js + leaderboard.js, TRƯỚC ui.js / auth.js.
// ═══════════════════════════════════════════════════════════════

const PLAYER_PROFILE_KEY = 'chromablast_player_profile';
const NICK_MAX_LEN = 24;
const NICK_MIN_LEN = 1;

function _ppDefault(){
  return {
    nick: '',
    color: '#ffffff',
    bold: false,
    italic: false,
    light: false,
    renameCount: 0,
    styleUnlocked: false // đã xem QC để mở quyền đổi style lần đầu trong phiên lưu
  };
}

function getPlayerProfile(){
  let p = _ppDefault();
  try{
    const raw = (typeof safeGet === 'function' ? safeGet(PLAYER_PROFILE_KEY) : null) || localStorage.getItem(PLAYER_PROFILE_KEY);
    if(raw){
      const j = JSON.parse(raw);
      if(j && typeof j === 'object'){
        if(typeof j.nick === 'string') p.nick = j.nick.slice(0, NICK_MAX_LEN);
        if(typeof j.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(j.color)) p.color = j.color;
        p.bold = !!j.bold;
        p.italic = !!j.italic;
        p.light = !!j.light;
        p.renameCount = Math.max(0, Number(j.renameCount) || 0);
        p.styleUnlocked = !!j.styleUnlocked;
      }
    }
  }catch(e){}
  // Đồng bộ guest name cũ nếu chưa có nick
  if(!p.nick){
    try{
      const g = typeof safeGet === 'function' ? safeGet('chromablast_guest_name') : null;
      if(g) p.nick = String(g).slice(0, NICK_MAX_LEN);
    }catch(e){}
  }
  return p;
}

function savePlayerProfile(patch){
  const p = Object.assign(getPlayerProfile(), patch || {});
  p.nick = String(p.nick || '').slice(0, NICK_MAX_LEN);
  if(!/^#[0-9A-Fa-f]{6}$/.test(p.color)) p.color = '#ffffff';
  try{
    const s = JSON.stringify(p);
    if(typeof safeSet === 'function') safeSet(PLAYER_PROFILE_KEY, s);
    else localStorage.setItem(PLAYER_PROFILE_KEY, s);
  }catch(e){}
  try{ if(p.nick) safeSet('chromablast_guest_name', p.nick); }catch(e){}
  try{ if(typeof _onlineDisplayName !== 'undefined'){ /* sync online below */ } }catch(e){}
  _ppSyncOnlineName(p.nick);
  _ppRefreshUI();
  return p;
}

function _ppSyncOnlineName(nick){
  if(!nick) return;
  try{
    if(typeof _onlineDisplayName !== 'undefined') _onlineDisplayName = nick;
  }catch(e){}
  try{
    if(typeof _upsertPlayerProfile === 'function') _upsertPlayerProfile();
  }catch(e){}
}

function getPlayerNickname(){
  const p = getPlayerProfile();
  if(p.nick) return p.nick;
  if(typeof currentUser !== 'undefined' && currentUser && currentUser.username) return currentUser.username;
  return (typeof _localPlayerName === 'function' ? _localPlayerName() : 'Player');
}

function getPlayerNameStyle(){
  const p = getPlayerProfile();
  return {
    color: p.color || '#ffffff',
    bold: !!p.bold,
    italic: !!p.italic,
    light: !!p.light
  };
}

function formatPlayerNameHtml(name, style){
  const st = style || getPlayerNameStyle();
  const n = (typeof escapeHtml === 'function' ? escapeHtml(name) : String(name||''));
  const css = [
    'color:'+(st.color||'#ffffff'),
    'font-weight:'+(st.bold ? '900' : (st.light ? '300' : '700')),
    st.italic ? 'font-style:italic' : 'font-style:normal'
  ].join(';');
  return '<span class="player-nick" style="'+css+'">'+n+'</span>';
}

function canRenameFree(){
  return getPlayerProfile().renameCount < 1;
}

function _ppWatchAd(onOk, onFail){
  const fail = ()=>{ if(typeof onFail === 'function') onFail(); };
  const ok = ()=>{ if(typeof onOk === 'function') onOk(); };
  if(typeof showRewardedAd === 'function'){
    showRewardedAd(ok, ()=>{
      // Web/không AdMob: giả lập thành công; trên app QC lỗi → báo fail
      try{
        if(typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()){
          setTimeout(ok, 500);
          return;
        }
      }catch(e){}
      fail();
    });
  } else {
    setTimeout(ok, 500);
  }
}

function applyNicknameChange(newNick, opts){
  opts = opts || {};
  const nick = String(newNick || '').trim().slice(0, NICK_MAX_LEN);
  if(nick.length < NICK_MIN_LEN) return Promise.reject(new Error('nick_short'));
  const cur = getPlayerProfile();
  if(nick === cur.nick) return Promise.resolve(cur);

  const doSave = ()=>{
    const next = savePlayerProfile({ nick, renameCount: (cur.renameCount || 0) + 1 });
    return next;
  };

  if(canRenameFree() || opts.forceFree){
    return Promise.resolve(doSave());
  }
  return new Promise((resolve, reject)=>{
    _ppWatchAd(()=> resolve(doSave()), ()=> reject(new Error('ad_failed')));
  });
}

function applyNameStyleChange(patch){
  const cur = getPlayerProfile();
  const nextStyle = {
    color: patch.color != null ? patch.color : cur.color,
    bold: patch.bold != null ? !!patch.bold : cur.bold,
    italic: patch.italic != null ? !!patch.italic : cur.italic,
    light: patch.light != null ? !!patch.light : cur.light
  };
  const changed =
    nextStyle.color !== cur.color ||
    nextStyle.bold !== cur.bold ||
    nextStyle.italic !== cur.italic ||
    nextStyle.light !== cur.light;
  if(!changed) return Promise.resolve(cur);

  const doSave = ()=> savePlayerProfile(Object.assign({}, nextStyle, { styleUnlocked: true }));

  // Đổi style luôn cần xem QC (kể cả lần đầu)
  return new Promise((resolve, reject)=>{
    _ppWatchAd(()=> resolve(doSave()), ()=> reject(new Error('ad_failed')));
  });
}

function getPlayerInfoStats(){
  const level = (typeof playerLevel !== 'undefined') ? playerLevel : 1;
  let maps = 0;
  try{
    if(typeof clearedHiddenMaps !== 'undefined' && clearedHiddenMaps && typeof clearedHiddenMaps.size === 'number'){
      maps = clearedHiddenMaps.size;
    } else if(typeof getSavedClearedMaps === 'function'){
      maps = (getSavedClearedMaps() || []).length;
    }
  }catch(e){}
  let caro = { wins:0, losses:0, draws:0, points:0, total:0, winRate:0, rank:null };
  try{
    if(typeof getLocalCaroStats === 'function') caro = getLocalCaroStats();
  }catch(e){}
  return { level, maps, caro, nick: getPlayerNickname(), style: getPlayerNameStyle() };
}

function _ppRefreshUI(){
  const nick = getPlayerNickname();
  const style = getPlayerNameStyle();
  const box = document.getElementById('account-username-box');
  if(box) box.innerHTML = formatPlayerNameHtml(nick, style);
  const preview = document.getElementById('pp-nick-preview');
  if(preview) preview.innerHTML = formatPlayerNameHtml(nick, style);
  const hubNick = document.getElementById('settings-player-nick');
  if(hubNick) hubNick.innerHTML = formatPlayerNameHtml(nick, style);
  renderSettingsPlayerInfo();
}

function renderSettingsPlayerInfo(){
  const box = document.getElementById('settings-player-info');
  if(!box) return;
  const info = getPlayerInfoStats();
  const caro = info.caro || {};
  const rankName = (caro.rank && caro.rank.name) ? caro.rank.name : '';
  const rankIcon = (caro.rank && caro.rank.icon) ? caro.rank.icon + ' ' : '';
  box.innerHTML =
    '<div class="pp-info-row"><span data-i18n-skip>👤</span> <b id="settings-player-nick">'+formatPlayerNameHtml(info.nick, info.style)+'</b></div>'+
    '<div class="pp-info-grid">'+
      '<div class="pp-stat"><small>'+(typeof t==='function'?t('ppLevel'):'Cấp')+'</small><b>Lv.'+info.level+'</b></div>'+
      '<div class="pp-stat"><small>'+(typeof t==='function'?t('ppMaps'):'Map đã qua')+'</small><b>'+info.maps+'</b></div>'+
      '<div class="pp-stat"><small>'+(typeof t==='function'?t('ppCaro'):'Caro')+'</small><b>'+rankIcon+(caro.points||0)+'đ</b></div>'+
    '</div>'+
    '<div class="pp-caro-line">'+(typeof t==='function'?t('ppCaroWLD', caro.wins||0, caro.losses||0, caro.draws||0, caro.winRate||0):((caro.wins||0)+'T/'+(caro.losses||0)+'H/'+(caro.draws||0)+'Hòa · '+(caro.winRate||0)+'%'))+(rankName?' · '+rankName:'')+'</div>';
}

function openPlayerProfilePanel(){
  try{ sfxClick(); }catch(e){}
  const p = getPlayerProfile();
  const nickIn = document.getElementById('pp-nick-input');
  const colorIn = document.getElementById('pp-color-input');
  if(nickIn) nickIn.value = p.nick || getPlayerNickname();
  if(colorIn) colorIn.value = p.color || '#ffffff';
  document.getElementById('pp-bold')?.classList.toggle('active', !!p.bold);
  document.getElementById('pp-italic')?.classList.toggle('active', !!p.italic);
  document.getElementById('pp-light')?.classList.toggle('active', !!p.light);
  const hint = document.getElementById('pp-rename-hint');
  if(hint){
    hint.textContent = canRenameFree()
      ? (typeof t==='function'?t('ppRenameFree'):'Đổi tên lần 1 miễn phí')
      : (typeof t==='function'?t('ppRenameAd'):'Đổi tên tiếp theo: xem quảng cáo');
  }
  const msg = document.getElementById('pp-msg');
  if(msg){ msg.textContent=''; msg.className='account-msg'; }
  _ppRefreshUI();
  try{ if(typeof closeAllSettingsOverlays==='function') closeAllSettingsOverlays(); }catch(e){}
  document.getElementById('player-profile-panel')?.classList.add('show');
}

function closePlayerProfilePanel(){
  document.getElementById('player-profile-panel')?.classList.remove('show');
}

function initPlayerProfileUI(){
  const saveNick = document.getElementById('pp-save-nick');
  const saveStyle = document.getElementById('pp-save-style');
  const closeBtn = document.getElementById('pp-close-btn');
  const bold = document.getElementById('pp-bold');
  const italic = document.getElementById('pp-italic');
  const light = document.getElementById('pp-light');
  const colorIn = document.getElementById('pp-color-input');

  closeBtn?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} closePlayerProfilePanel(); });

  [bold, italic, light].forEach(btn=>{
    btn?.addEventListener('click', ()=>{
      try{sfxClick();}catch(e){}
      btn.classList.toggle('active');
      if(btn === bold && btn.classList.contains('active')) light?.classList.remove('active');
      if(btn === light && btn.classList.contains('active')) bold?.classList.remove('active');
      const preview = document.getElementById('pp-nick-preview');
      if(preview){
        const nick = (document.getElementById('pp-nick-input')?.value || getPlayerNickname()).trim();
        preview.innerHTML = formatPlayerNameHtml(nick, {
          color: colorIn?.value || '#ffffff',
          bold: !!bold?.classList.contains('active'),
          italic: !!italic?.classList.contains('active'),
          light: !!light?.classList.contains('active')
        });
      }
    });
  });

  colorIn?.addEventListener('input', ()=>{
    const preview = document.getElementById('pp-nick-preview');
    if(!preview) return;
    const nick = (document.getElementById('pp-nick-input')?.value || getPlayerNickname()).trim();
    preview.innerHTML = formatPlayerNameHtml(nick, {
      color: colorIn.value || '#ffffff',
      bold: !!bold?.classList.contains('active'),
      italic: !!italic?.classList.contains('active'),
      light: !!light?.classList.contains('active')
    });
  });

  document.getElementById('pp-nick-input')?.addEventListener('input', (e)=>{
    const preview = document.getElementById('pp-nick-preview');
    if(!preview) return;
    preview.innerHTML = formatPlayerNameHtml(e.target.value.trim() || getPlayerNickname(), {
      color: colorIn?.value || '#ffffff',
      bold: !!bold?.classList.contains('active'),
      italic: !!italic?.classList.contains('active'),
      light: !!light?.classList.contains('active')
    });
  });

  saveNick?.addEventListener('click', async ()=>{
    try{sfxClick();}catch(e){}
    const msg = document.getElementById('pp-msg');
    const val = document.getElementById('pp-nick-input')?.value || '';
    try{
      await applyNicknameChange(val);
      if(msg){ msg.textContent = typeof t==='function'?t('ppSaved'):'Đã lưu'; msg.className='account-msg ok'; }
      const hint = document.getElementById('pp-rename-hint');
      if(hint) hint.textContent = typeof t==='function'?t('ppRenameAd'):'Đổi tên tiếp theo: xem quảng cáo';
    }catch(err){
      const m = err && err.message;
      if(msg){
        msg.className = 'account-msg err';
        msg.textContent = m==='nick_short' ? (typeof t==='function'?t('ppNickShort'):'Nhập nickname')
          : m==='ad_failed' ? (typeof t==='function'?t('ppAdFail'):'Quảng cáo chưa sẵn sàng')
          : (m || 'Error');
      }
    }
  });

  saveStyle?.addEventListener('click', async ()=>{
    try{sfxClick();}catch(e){}
    const msg = document.getElementById('pp-msg');
    try{
      await applyNameStyleChange({
        color: colorIn?.value || '#ffffff',
        bold: !!bold?.classList.contains('active'),
        italic: !!italic?.classList.contains('active'),
        light: !!light?.classList.contains('active')
      });
      if(msg){ msg.textContent = typeof t==='function'?t('ppStyleSaved'):'Đã áp dụng style (đã xem QC)'; msg.className='account-msg ok'; }
    }catch(err){
      if(msg){
        msg.className = 'account-msg err';
        msg.textContent = (err && err.message)==='ad_failed'
          ? (typeof t==='function'?t('ppAdFail'):'Quảng cáo chưa sẵn sàng')
          : ((err && err.message) || 'Error');
      }
    }
  });

  document.getElementById('set-btn-profile')?.addEventListener('click', openPlayerProfilePanel);
  document.getElementById('settings-player-edit')?.addEventListener('click', openPlayerProfilePanel);

  // Seed nick từ guest nếu trống
  const p = getPlayerProfile();
  if(!p.nick){
    const n = getPlayerNickname();
    if(n) savePlayerProfile({ nick: n });
  } else {
    _ppRefreshUI();
  }
}

// Ghi đè tên cục bộ ưu tiên nickname profile
(function _ppPatchLocalName(){
  const prev = typeof _localPlayerName === 'function' ? _localPlayerName : null;
  window._localPlayerName = function(){
    try{
      const p = getPlayerProfile();
      if(p && p.nick) return p.nick;
    }catch(e){}
    if(prev) return prev();
    return 'Player';
  };
})();

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', ()=>{ try{ initPlayerProfileUI(); }catch(e){ console.warn('[profile]', e); } });
} else {
  try{ initPlayerProfileUI(); }catch(e){ console.warn('[profile]', e); }
}
