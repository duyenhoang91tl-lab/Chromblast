// ═══════════════════════════════════════════════════════════════
// js/ui-settings.js — Menu Cài đặt (hub + More + Cup + Ngôn ngữ),
// tách từ ui.js. Dùng chung global scope với ui.js (nạp NGAY SAU).
// ═══════════════════════════════════════════════════════════════

function closeAllSettingsOverlays(){
  ['settings-panel','settings-more-panel','settings-lang-panel','settings-cup-panel','settings-text-panel','spin-panel']
    .forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.remove('show'); });
  try{ if(typeof closeBrickSkinPanel==='function') closeBrickSkinPanel(); }catch(e){}
  try{ if(typeof closeBoardSkinPanel==='function') closeBoardSkinPanel(); }catch(e){}
}
/** Alias — shop/friends/quests gọi tên này khi mở màn riêng từ Menu */

function closeSettingsHub(){ closeAllSettingsOverlays(); }

function openSettingsPanel(){
  syncSettingsToggles();
  try{ if(typeof applyI18nDom==='function') applyI18nDom(); }catch(e){}
  try{ if(typeof renderSettingsPlayerInfo==='function') renderSettingsPlayerInfo(); }catch(e){}
  document.getElementById('settings-panel')?.classList.add('show');
}

function syncSettingsToggles(){
  const sfxBtn=document.getElementById('set-sfx-toggle');
  const bgmBtn=document.getElementById('set-bgm-toggle');
  const vibBtn=document.getElementById('set-vibrate-toggle');
  const sfxIco=document.getElementById('set-sfx-ico');
  const bgmIco=document.getElementById('set-bgm-ico');
  const vibIco=document.getElementById('set-vibrate-ico');
  const muted=!!(typeof sfxMuted!=='undefined' && sfxMuted);
  const bgmOff=!!(typeof bgmMuted!=='undefined' && bgmMuted);
  const vibOff=!(typeof vibrateEnabled==='undefined' ? true : vibrateEnabled);
  if(sfxBtn) sfxBtn.classList.toggle('is-off', muted);
  if(bgmBtn) bgmBtn.classList.toggle('is-off', bgmOff);
  if(vibBtn) vibBtn.classList.toggle('is-off', vibOff);
  if(sfxIco) sfxIco.textContent = muted ? '🔇' : '🔊';
  if(bgmIco) bgmIco.textContent = bgmOff ? '🎵' : '🎵';
  if(vibIco) vibIco.textContent = vibOff ? '📴' : '📳';
  const muteBtn=document.getElementById('mute-btn');
  if(muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
}

function toggleSfxSetting(){
  if(typeof sfxMuted==='undefined') return;
  sfxMuted=!sfxMuted;
  if(sfxMuted){ try{ stopBgm(); stopRhythmBgm(); }catch(e){} }
  else { try{ if(!bgmMuted && typeof resumeContextBgm==='function') resumeContextBgm(); }catch(e){} }
  syncSettingsToggles();
  try{ sfxClick(); }catch(e){}
}

function toggleBgmSetting(){
  if(typeof bgmMuted==='undefined') return;
  bgmMuted=!bgmMuted;
  if(bgmMuted){ try{ stopBgm(); stopRhythmBgm(); }catch(e){} }
  else if(!sfxMuted){ try{ if(typeof resumeContextBgm==='function') resumeContextBgm(); }catch(e){} }
  syncSettingsToggles();
  try{ sfxClick(); }catch(e){}
}

function toggleVibrateSetting(){
  const next = !(typeof vibrateEnabled!=='undefined' && vibrateEnabled);
  if(typeof setVibrateEnabled==='function') setVibrateEnabled(next);
  else vibrateEnabled = next;
  syncSettingsToggles();
  try{ sfxClick(); }catch(e){}
  if(next){ try{ vibrateCombo(3); }catch(e){} }
}

function openSettingsAccount(){
  closeAllSettingsOverlays();
  const panel=document.getElementById('account-panel');
  if(!panel) return;
  const msg=document.getElementById('cp-msg');
  if(msg){ msg.textContent=''; msg.className='account-msg'; }
  panel.classList.add('show');
}

function openSettingsLang(){
  document.getElementById('settings-panel')?.classList.remove('show');
  if(!document.getElementById('lang-picker-settings')?.childElementCount){
    try{ buildLangPicker('lang-picker-settings'); }catch(e){}
  }
  document.getElementById('settings-lang-panel')?.classList.add('show');
}

function openSettingsMap(){
  closeAllSettingsOverlays();
  try{ renderHiddenMapMenu(); }catch(e){}
  document.getElementById('hiddenmap-menu-panel')?.classList.add('show');
}

function renderCupPanel(){
  try{ if(typeof checkPersistentCups==='function') checkPersistentCups(); }catch(e){}
  const stats=document.getElementById('cup-stats');
  const awards=document.getElementById('cup-awards');
  if(!stats||!awards) return;
  let loginDays=1;
  try{
    const st=(typeof getDailyStatus==='function')?getDailyStatus():null;
    if(st && st.streakDay) loginDays=st.streakDay;
  }catch(e){}
  const bestN=Math.round(typeof best==='number'?best:0);
  const rounds=(typeof clearedHiddenMaps!=='undefined' && clearedHiddenMaps)?clearedHiddenMaps.size:0;
  const comboHi=Math.max(
    (typeof consecutiveBursts==='number'?consecutiveBursts:0),
    (typeof combo==='number'?combo:0),
    (typeof secretStreak==='number'?secretStreak:0)
  );
  const doneN=(typeof ACHIEVEMENTS==='object' && ACHIEVEMENTS)
    ? Object.values(ACHIEVEMENTS).filter(a=>a.done).length : 0;
  const totalN=(typeof ACHIEVEMENTS==='object' && ACHIEVEMENTS)
    ? Object.keys(ACHIEVEMENTS).length : 0;
  stats.innerHTML=
    '<div class="cup-stat"><div class="cup-stat-num">'+doneN+'/'+totalN+'</div><div class="cup-stat-lab">'+(t('setAwards')||'Cups')+'</div></div>'+
    '<div class="cup-stat"><div class="cup-stat-num">'+comboHi+'</div><div class="cup-stat-lab">'+(t('cupHighestCombo')||'Highest Combo')+'</div></div>'+
    '<div class="cup-stat"><div class="cup-stat-num">'+bestN.toLocaleString()+'</div><div class="cup-stat-lab">'+(t('cupBestScore')||'Best Score')+'</div></div>'+
    '<div class="cup-stat"><div class="cup-stat-num">'+rounds+'</div><div class="cup-stat-lab">'+(t('cupRounds')||'Rounds')+'</div></div>'+
    '<div class="cup-stat"><div class="cup-stat-num">'+loginDays+'</div><div class="cup-stat-lab">'+(t('cupLoginDays')||'Login Days')+'</div></div>';

  const list=(typeof ACHIEVEMENTS==='object' && ACHIEVEMENTS)?Object.values(ACHIEVEMENTS):[];
  awards.innerHTML=list.map(a=>{
    const done=!!a.done;
    const showDot=done && !a.seen;
    const ico=a.icon||'🎖️';
    return '<button type="button" class="cup-award'+(done?' is-done':'')+'" data-cup-id="'+a.id+'" aria-label="'+(a.label||a.id)+'">'+
      '<div class="cup-badge'+(done?' done':'')+'">'+ico+(showDot?'<span class="set-dot"></span>':'')+'</div>'+
      '<div class="cup-award-name">'+(a.label||a.id)+'</div>'+
      '<div class="cup-award-prog">'+(done?'✓':'…')+'</div>'+
    '</button>';
  }).join('');

  awards.querySelectorAll('[data-cup-id]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id=el.getAttribute('data-cup-id');
      const a=(typeof ACHIEVEMENTS==='object' && ACHIEVEMENTS)?ACHIEVEMENTS[id]:null;
      if(!a) return;
      try{ sfxClick(); }catch(e){}
      // Hiện giải thích ý nghĩa cup
      try{
        showAchievementToast({
          label:(a.icon?a.icon+' ':'')+(a.label||a.id),
          desc:a.desc||'',
        });
      }catch(e){
        try{ showComboFlash(0,false,(a.label||'')+' — '+(a.desc||'')); }catch(e2){}
      }
      // Có dấu đỏ → đánh dấu đã xem và gỡ dấu
      if(typeof markCupSeen==='function' && markCupSeen(id)){
        el.querySelector('.set-dot')?.remove();
      }
    });
  });
}

function openSettingsCup(){
  document.getElementById('settings-panel')?.classList.remove('show');
  renderCupPanel();
  document.getElementById('settings-cup-panel')?.classList.add('show');
}

function openSettingsMore(){
  document.getElementById('settings-panel')?.classList.remove('show');
  syncSettingsToggles();
  document.getElementById('settings-more-panel')?.classList.add('show');
}

function openSettingsText(title, body){
  document.getElementById('settings-more-panel')?.classList.remove('show');
  const tEl=document.getElementById('settings-text-title');
  const bEl=document.getElementById('settings-text-body');
  if(tEl) tEl.textContent=title;
  if(bEl) bEl.textContent=body;
  document.getElementById('settings-text-panel')?.classList.add('show');
}

function settingsGoHome(){
  closeAllSettingsOverlays();
  try{ hardResetAllModes(); }catch(e){}
  const screen=document.getElementById('start-screen');
  if(screen){
    screen.style.display='flex';
    screen.classList.remove('hide');
    screen.classList.remove('hidden');
  }
  if(typeof syncMenuOpenState === 'function') syncMenuOpenState();
}

function settingsReplay(){
  closeAllSettingsOverlays();
  try{ sfxClick(); }catch(e){}
  // Trong map ẩn: chơi lại đúng màn đó; map thường: chơi lại bàn chính
  if(isPlayingHiddenMap() && replayActiveHiddenMap()) return;
  if(typeof startGame==='function') startGame();
}

function initSettingsMenu(){
  const close=id=>()=>{ document.getElementById(id)?.classList.remove('show'); };
  document.getElementById('settings-close-btn')?.addEventListener('click', close('settings-panel'));
  document.getElementById('settings-more-close-btn')?.addEventListener('click', ()=>{
    close('settings-more-panel')();
    openSettingsPanel();
  });
  document.getElementById('settings-more-back-btn')?.addEventListener('click', ()=>{
    close('settings-more-panel')();
    openSettingsPanel();
  });
  document.getElementById('settings-lang-close-btn')?.addEventListener('click', ()=>{
    close('settings-lang-panel')();
    openSettingsPanel();
  });
  document.getElementById('settings-cup-close-btn')?.addEventListener('click', close('settings-cup-panel'));
  document.getElementById('settings-cup-back-btn')?.addEventListener('click', ()=>{
    close('settings-cup-panel')();
    openSettingsPanel();
  });
  document.getElementById('settings-text-close-btn')?.addEventListener('click', ()=>{
    close('settings-text-panel')();
    document.getElementById('settings-more-panel')?.classList.add('show');
  });

  document.getElementById('set-sfx-toggle')?.addEventListener('click', toggleSfxSetting);
  document.getElementById('set-bgm-toggle')?.addEventListener('click', toggleBgmSetting);
  document.getElementById('set-vibrate-toggle')?.addEventListener('click', toggleVibrateSetting);
  document.getElementById('set-btn-account')?.addEventListener('click', ()=>{ sfxClick(); openSettingsAccount(); });
  document.getElementById('set-btn-help')?.addEventListener('click', ()=>{
    sfxClick();
    closeAllSettingsOverlays();
    if(typeof openHelpPanel==='function') openHelpPanel();
  });
  document.getElementById('set-btn-lang')?.addEventListener('click', ()=>{ sfxClick(); openSettingsLang(); });
  document.getElementById('set-btn-map')?.addEventListener('click', ()=>{ sfxClick(); openSettingsMap(); });
  document.getElementById('set-btn-cup')?.addEventListener('click', ()=>{ sfxClick(); openSettingsCup(); });
  document.getElementById('set-btn-spin')?.addEventListener('click', ()=>{
    sfxClick();
    if(typeof openLuckySpin==='function') openLuckySpin();
  });
  document.getElementById('set-btn-versus')?.addEventListener('click', ()=>{
    sfxClick();
    closeAllSettingsOverlays();
    if(typeof openVersusSetup==='function') openVersusSetup();
  });
  document.getElementById('set-btn-more')?.addEventListener('click', ()=>{ sfxClick(); openSettingsMore(); });
  document.getElementById('set-btn-home')?.addEventListener('click', ()=>{ sfxClick(); settingsGoHome(); });
  document.getElementById('set-btn-replay')?.addEventListener('click', settingsReplay);
  document.getElementById('pause-replay-btn')?.addEventListener('click', ()=>{
    if(typeof replayFromPause==='function') replayFromPause();
  });

  document.getElementById('set-contact-btn')?.addEventListener('click', ()=>{
    sfxClick();
    openSettingsText(t('setContact')||'Contact Us', 'Email: duyenhoang91.tl@gmail.com\nChromaBlast support');
  });
  document.getElementById('set-share-btn')?.addEventListener('click', ()=>{
    sfxClick();
    try{ if(typeof logGameEvent==='function') logGameEvent('share_click', { method: navigator.share?'native_share':'clipboard' }); }catch(e){}
    // Dùng đúng bản có mã mời (CBxxxxxx) + nhắc thưởng — trước đây nút này share
    // text tĩnh "Play ChromaBlast with me!", không có mã, không gắn được vào hệ
    // thống thưởng mời bạn (claimPendingReferralRewards) dù backend đã có sẵn.
    if(typeof shareInviteLink==='function'){ shareInviteLink(); return; }
    const text='Play ChromaBlast with me!';
    if(navigator.share){ navigator.share({ title:'ChromaBlast', text }).catch(()=>{}); }
    else { try{ navigator.clipboard.writeText(text); }catch(e){} openSettingsText(t('setShare')||'Share', text); }
  });
  document.getElementById('set-terms-btn')?.addEventListener('click', ()=>{
    sfxClick();
    window.open('terms-of-service.html', '_blank', 'noopener');
  });
  document.getElementById('set-privacy-btn')?.addEventListener('click', ()=>{
    sfxClick();
    window.open('privacy-policy.html', '_blank', 'noopener');
  });
  document.getElementById('set-about-btn')?.addEventListener('click', ()=>{
    sfxClick();
    openSettingsText(t('setAbout')||'About Us',
      'ChromaBlast\nVersion 1.0.0\nA colorful block puzzle adventure with hidden mini-games.\nThanks for playing!');
  });

  // click backdrop to close
  ['settings-panel','settings-more-panel','settings-lang-panel','settings-cup-panel','settings-text-panel','spin-panel'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('click', e=>{ if(e.target===el) el.classList.remove('show'); });
  });

  try{ buildLangPicker('lang-picker-settings'); }catch(e){}
  syncSettingsToggles();
}

