// ═══════════════════════════════════════════════════════════════
// js/saga-map.js — Màn phụ kiểu Candy Crush (episode) cho map ẩn 1–4
// Vườn hoa + linh vật Samoyed → chọn màn 1-2-3-4 → Chơi.
// Nạp SAU map-manager.js (dùng startMap / HIDDEN_MAP_LIST lúc chạy).
// ═══════════════════════════════════════════════════════════════

const SAGA_LEVELS = [
  {
    id: 1,
    key: 'secret',
    listKey: 'secret1',
    title: 'Map 1 — Đấu màu bí ẩn',
    blurb: 'Bạn có thể tìm đường ra khỏi khu vườn không? Hãy nổ các ô cùng màu để tìm manh mối…',
    playLabel: 'Chơi',
  },
  {
    id: 2,
    key: 'dodge',
    listKey: 'dodge',
    title: 'Map 2 — Rùa né cà rốt',
    blurb: 'Thỏ đang bắn cà rốt lung tung! Điều khiển rùa né đạn càng lâu càng nhiều điểm.',
    playLabel: 'Chơi',
  },
  {
    id: 3,
    key: 'fruit',
    listKey: 'fruit',
    title: 'Map 3 — Chém hoa quả',
    blurb: 'Hoa quả bay lên khắp vườn — chém thật nhiều, tránh bom, săn CRITICAL ×5!',
    playLabel: 'Chơi',
  },
  {
    id: 4,
    key: 'bee',
    listKey: 'bee',
    title: 'Map 4 — Chó trốn ong',
    blurb: 'Samoyed đang chơi giữa vườn hoa. Chỉ đường chạy giúp chó và đập ong bay đi!',
    playLabel: 'Chơi',
  },
];

const SAGA_KEYS = new Set(SAGA_LEVELS.map(l => l.key));

let _sagaSelectedId = 1;
let _sagaFromUnlock = false;
let _sagaBound = false;

function isSagaMapKey(key){
  return !!(key && SAGA_KEYS.has(key));
}

function sagaLevelByKey(key){
  return SAGA_LEVELS.find(l => l.key === key || l.listKey === key) || null;
}

function sagaIsCleared(lv){
  try{
    if(typeof clearedHiddenMaps !== 'undefined' && clearedHiddenMaps){
      return clearedHiddenMaps.has(lv.listKey) || clearedHiddenMaps.has(lv.key);
    }
  }catch(e){}
  return false;
}

/** Id map cao nhất (1–4) người chơi được chọn chơi. */
function sagaMaxUnlockedId(){
  let max = 0;
  try{
    const gate = (typeof unlockGateStageIndex === 'number') ? unlockGateStageIndex : 0;
    // Các map đã qua cổng tiến trình (đã mở / đã chơi xong vòng đó)
    max = Math.max(max, gate);
  }catch(e){}
  try{
    if(typeof pendingUnlock === 'string' && pendingUnlock){
      const p = sagaLevelByKey(pendingUnlock);
      if(p) max = Math.max(max, p.id);
    }
  }catch(e){}
  for(const lv of SAGA_LEVELS){
    if(sagaIsCleared(lv)) max = Math.max(max, lv.id);
  }
  return Math.max(0, Math.min(4, max|0));
}

function sagaIsUnlocked(lv){
  return lv.id <= sagaMaxUnlockedId();
}

function sagaClearedCount(){
  return SAGA_LEVELS.reduce((n, lv) => n + (sagaIsCleared(lv) ? 1 : 0), 0);
}

function hideSagaMapScreen(){
  const el = document.getElementById('saga-map-screen');
  if(!el) return;
  el.classList.remove('show');
  el.setAttribute('aria-hidden', 'true');
}

function _sagaPickDefaultId(opts){
  const o = opts || {};
  if(o.unlockKey){
    const lv = sagaLevelByKey(o.unlockKey);
    if(lv) return lv.id;
  }
  if(typeof o.afterClear === 'number' && o.afterClear >= 0){
    const nextId = Math.min(4, (o.afterClear|0) + 2); // clearedIdx 0 → prefer map 2 highlight if unlocked, else 1
    const maxU = sagaMaxUnlockedId();
    if(nextId <= maxU) return nextId;
    return Math.max(1, maxU || 1);
  }
  const maxU = sagaMaxUnlockedId();
  if(maxU <= 0) return 1;
  // Ưu tiên màn đã mở nhưng chưa phá đảo
  for(const lv of SAGA_LEVELS){
    if(lv.id <= maxU && !sagaIsCleared(lv)) return lv.id;
  }
  return maxU;
}

function _sagaRender(){
  const screen = document.getElementById('saga-map-screen');
  if(!screen) return;
  const maxU = sagaMaxUnlockedId();
  const selected = SAGA_LEVELS.find(l => l.id === _sagaSelectedId) || SAGA_LEVELS[0];
  const unlocked = sagaIsUnlocked(selected);

  screen.querySelectorAll('.saga-node').forEach(btn => {
    const id = +(btn.dataset.lv || 0);
    const lv = SAGA_LEVELS.find(l => l.id === id);
    if(!lv) return;
    const cleared = sagaIsCleared(lv);
    const open = sagaIsUnlocked(lv);
    btn.classList.toggle('cleared', cleared);
    btn.classList.toggle('locked', !open);
    btn.classList.toggle('current', id === _sagaSelectedId && open);
    btn.classList.toggle('selected', id === _sagaSelectedId);
    btn.disabled = !open;
    btn.setAttribute('aria-label', lv.title + (cleared ? ' (đã phá đảo)' : open ? '' : ' (khoá)'));
    btn.innerHTML = cleared
      ? '<span class="saga-node-check">✓</span>'
      : (open ? String(id) : '<span class="saga-node-lock">🔒</span>');
  });

  const blurb = document.getElementById('saga-blurb');
  if(blurb){
    blurb.innerHTML = '<div class="saga-blurb-title">'+selected.title+'</div>'+
      '<div class="saga-blurb-text">'+selected.blurb+'</div>';
  }
  const prog = document.getElementById('saga-progress');
  if(prog) prog.textContent = sagaClearedCount() + '/4';

  const playBtn = document.getElementById('saga-play-btn');
  if(playBtn){
    playBtn.disabled = !unlocked;
    playBtn.textContent = unlocked ? (selected.playLabel || 'Chơi') : 'Đang khoá';
  }

  const laterBtn = document.getElementById('saga-later-btn');
  if(laterBtn){
    laterBtn.style.display = _sagaFromUnlock ? '' : 'none';
  }

  // Highlight path fill theo tiến độ
  const fill = document.getElementById('saga-path-fill');
  if(fill){
    const pct = maxU <= 1 ? 18 : maxU === 2 ? 50 : maxU === 3 ? 78 : 100;
    fill.style.width = pct + '%';
  }
}

function showSagaMapScreen(opts){
  const o = opts || {};
  const screen = document.getElementById('saga-map-screen');
  if(!screen) return false;

  // Tôn trọng "tự động bỏ qua map ẩn" khi đang mở khoá mới
  if(o.unlockKey && typeof autoSkipHiddenMaps !== 'undefined' && autoSkipHiddenMaps){
    try{
      unlockDeferred = true;
      if(typeof updateBurstCount === 'function') updateBurstCount();
    }catch(e){}
    return false;
  }

  _sagaFromUnlock = !!o.unlockKey;
  if(o.unlockKey){
    try{ pendingUnlock = o.unlockKey; }catch(e){}
  }
  _sagaSelectedId = _sagaPickDefaultId(o);
  if(_sagaSelectedId < 1) _sagaSelectedId = 1;

  try{ if(typeof sfxUnlock === 'function') sfxUnlock(); }catch(e){}

  _sagaBindOnce();
  _sagaRender();
  screen.classList.add('show');
  screen.setAttribute('aria-hidden', 'false');
  // Nhịp vào màn: mascot bounce
  screen.classList.remove('saga-enter');
  void screen.offsetWidth;
  screen.classList.add('saga-enter');
  return true;
}

function playSelectedSagaLevel(){
  const lv = SAGA_LEVELS.find(l => l.id === _sagaSelectedId);
  if(!lv || !sagaIsUnlocked(lv)) return;
  try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
  hideSagaMapScreen();
  try{
    const uo = document.getElementById('unlock-overlay');
    if(uo) uo.classList.remove('show');
  }catch(e){}
  try{ unlockDeferred = false; }catch(e){}
  try{ pendingUnlock = lv.key; }catch(e){}
  try{ hiddenMapEntryScore = score; }catch(e){}

  // Dọn mode cũ rồi vào map đã chọn
  try{ if(typeof hardResetAllModes === 'function') hardResetAllModes(); }catch(e){}
  try{ if(typeof startGame === 'function') startGame(); }catch(e){}

  let started = false;
  try{
    if(typeof startMap === 'function') started = !!startMap(lv.key);
  }catch(e){ started = false; }
  if(!started){
    try{
      const maps = (typeof HIDDEN_MAP_LIST !== 'undefined') ? HIDDEN_MAP_LIST : [];
      const m = maps.find(x => x && (x.key === lv.listKey || x.key === lv.key));
      if(m && typeof m.run === 'function'){ m.run(); started = true; }
    }catch(e){}
  }
  if(!started){
    try{
      if(lv.key === 'secret' && typeof enterSecretMode === 'function') enterSecretMode();
      else if(lv.key === 'dodge' && typeof enterDodgeMode === 'function') enterDodgeMode();
      else if(lv.key === 'fruit' && typeof enterFruitMode === 'function') enterFruitMode();
      else if(lv.key === 'bee' && typeof enterBeeMode === 'function') enterBeeMode();
    }catch(e){}
  }
}

function _sagaDeferUnlock(){
  try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
  hideSagaMapScreen();
  try{
    const chk = document.getElementById('unlock-autoskip-chk');
    if(chk){ autoSkipHiddenMaps = chk.checked; saveAutoSkipHiddenMaps(autoSkipHiddenMaps); }
  }catch(e){}
  try{
    unlockDeferred = true;
    if(typeof updateBurstCount === 'function') updateBurstCount();
  }catch(e){}
}

function _sagaBindOnce(){
  if(_sagaBound) return;
  _sagaBound = true;
  const screen = document.getElementById('saga-map-screen');
  if(!screen) return;

  screen.querySelectorAll('.saga-node').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = +(btn.dataset.lv || 0);
      const lv = SAGA_LEVELS.find(l => l.id === id);
      if(!lv || !sagaIsUnlocked(lv)) return;
      try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
      _sagaSelectedId = id;
      _sagaRender();
    });
  });

  const playBtn = document.getElementById('saga-play-btn');
  if(playBtn) playBtn.addEventListener('click', playSelectedSagaLevel);

  const laterBtn = document.getElementById('saga-later-btn');
  if(laterBtn) laterBtn.addEventListener('click', _sagaDeferUnlock);

  const closeBtn = document.getElementById('saga-close-btn');
  if(closeBtn){
    closeBtn.addEventListener('click', () => {
      try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
      if(_sagaFromUnlock) _sagaDeferUnlock();
      else hideSagaMapScreen();
    });
  }
}

/** Mở saga thay overlay khoá cũ cho map 1–4. */
function showSagaUnlock(stageKey){
  if(!isSagaMapKey(stageKey)) return false;
  return showSagaMapScreen({ unlockKey: stageKey });
}

/** Sau khi phá đảo map ẩn 1–3 → hiện màn phụ rồi cho chọn màn. */
function showSagaAfterClear(clearedIdx){
  if(!(clearedIdx >= 0 && clearedIdx <= 2)) return false;
  return showSagaMapScreen({ afterClear: clearedIdx|0 });
}

try{
  window.showSagaMapScreen = showSagaMapScreen;
  window.hideSagaMapScreen = hideSagaMapScreen;
  window.showSagaUnlock = showSagaUnlock;
  window.showSagaAfterClear = showSagaAfterClear;
  window.isSagaMapKey = isSagaMapKey;
}catch(e){}
