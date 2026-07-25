// ═══════════════════════════════════════════════════════════════
// map-manager.js — Trình quản lý MAP tập trung
// Thay cho các chuỗi if(map==N) / switch(stageKey): mọi map được đăng ký
// vào MAP_REGISTRY theo SỐ (1-21+) và theo KHOÁ ('secret'...'frog'...).
//   startMap(10) / startMap('boss')  → vào map (tự lazy-load maps/mapN.js nếu là map ngoài)
//   triggerMapUnlock('boss')         → hiện overlay mở khoá của map
// Map mới chỉ cần bỏ file vào maps/mapNN.js rồi đăng ký — KHÔNG cần sửa switch.
// Nạp SAU main.js + boss/* để tham chiếu được mọi hàm enter*/trigger*.
// ═══════════════════════════════════════════════════════════════

const MAP_REGISTRY = {}; // id(number) và key(string) đều trỏ về cùng 1 descriptor

function registerMap(desc){
  MAP_REGISTRY[desc.id] = desc;
  if(desc.key) MAP_REGISTRY[desc.key] = desc;
}

// ── 20 map "builtin" (đã nạp sẵn trong main.js / boss/*) ──
// enter/trigger tham chiếu trực tiếp; secret dùng triggerUnlock (đặc biệt).
[
  {id:1,  key:'secret', name:'Đấu màu bí ẩn',     enter:enterSecretMode, trigger:triggerUnlock},
  {id:2,  key:'dodge',  name:'Rùa né cà rốt',      enter:enterDodgeMode,  trigger:triggerDodgeUnlock},
  {id:3,  key:'fruit',  name:'Vườn Trái Cây',      enter:enterFruitMode,  trigger:triggerFruitUnlock},
  {id:4,  key:'bee',    name:'Bảo vệ chó khỏi ong',enter:enterBeeMode,    trigger:triggerBeeUnlock},
  {id:5,  key:'gold',   name:'Truy tìm kho báu',   enter:enterGoldMode,   trigger:triggerGoldUnlock},
  {id:6,  key:'mole',   name:'Đánh thú',           enter:enterMoleMode,   trigger:triggerMoleUnlock},
  {id:7,  key:'memory', name:'Lật thẻ ký ức',      enter:enterMemoryMode, trigger:triggerMemoryUnlock},
  {id:8,  key:'bubble', name:'Bắn bong bóng',      enter:enterBubbleMode, trigger:triggerBubbleUnlock},
  {id:9,  key:'stack',  name:'Xếp tháp',           enter:enterStackMode,  trigger:triggerStackUnlock},
  {id:10, key:'boss',   name:'Gà Nổi Loạn',        enter:enterBossMode,   trigger:triggerBossUnlock},
  {id:11, key:'catch',  name:'Bắt thú',            enter:enterCatchMode,  trigger:triggerCatchUnlock},
  {id:12, key:'flood',  name:'Tràn màu',           enter:enterFloodMode,  trigger:triggerFloodUnlock},
  {id:13, key:'arena',  name:'Đấu trường sinh tồn',enter:enterArenaMode,  trigger:triggerArenaUnlock},
  {id:14, key:'snake',  name:'Rắn',                enter:enterSnakeMode,  trigger:triggerSnakeUnlock},
  {id:15, key:'brick',  name:'Bắn gạch',           enter:enterBrickMode,  trigger:triggerBrickUnlock},
  {id:16, key:'runner', name:'Chạy vô tận',        enter:enterRunnerMode, trigger:triggerRunnerUnlock},
  {id:17, key:'space',  name:'Space Shooter',      enter:enterSpaceMode,  trigger:triggerSpaceUnlock},
  {id:18, key:'rhythm', name:'Phiêu theo âm nhạc', enter:enterRhythmMode, trigger:triggerRhythmUnlock},
  {id:19, key:'maze',   name:'Thoát khỏi mê cung', enter:enterMazeMode,   trigger:triggerMazeUnlock},
  {id:20, key:'mega',   name:'Dũng sĩ diệt rồng',  enter:enterMegaMode,   trigger:triggerMegaUnlock},
].forEach(registerMap);

// ── Map "ngoài" nạp động (chuẩn plugin init/update/draw) ──
// File maps/mapNN.js chỉ gọi registerMapModule({...}); startMap(NN) sẽ tự lazy-load.
[
  {id:21, key:'frog', name:'Ếch bắt côn trùng', file:'maps/map21.js',
    trigger(){ loadMapModule(MAP_REGISTRY[21], ()=>{ if(typeof triggerFrogUnlock==='function') triggerFrogUnlock(); }); }},
  {id:22, key:'floodpig', name:'Cẩu cứu heo mùa lũ', file:'maps/map22.js'},
].forEach(registerMap);

/* ═══════════════════════════════════════════════════════════════
   RUNTIME PLUGIN-MAP — chạy vòng đời cho map chuẩn { id,name,init,update,draw }
   Map chỉ làm 1 việc: vẽ chính nó. Engine lo canvas/RAF/dt/input/thoát.
   Thêm map mới = tạo maps/mapNN.js + 1 dòng đăng ký ở trên. Không đụng engine/UI.
   ═══════════════════════════════════════════════════════════════ */
let _activeMapModule = null, _pluginRAF = null, _pluginLast = 0;
const PGCV = () => document.getElementById('plugin-canvas');

// maps/mapNN.js gọi hàm này để đăng ký chính nó vào registry.
function registerMapModule(mod){
  if(!mod || mod.id==null) return mod;
  const desc = MAP_REGISTRY[mod.id] || { id: mod.id, key: mod.key || ('map'+mod.id) };
  desc.module = mod;
  desc.name = mod.name || desc.name;
  desc.enter = () => enterMapModule(mod);   // startMap(id) → chạy qua runtime
  registerMap(desc);
  return mod;
}

// API engine trao cho map — mọi thứ (điểm/âm thanh/thoát) đã có sẵn, map chỉ dùng.
function _makeMapApi(mod){
  return {
    W: 360, H: 460,
    input: { x: 180, y: 230, down: false, tapX: null, tapY: null },
    get canvas(){ return PGCV(); },
    get score(){ return (typeof score!=='undefined') ? score : 0; },
    addScore(n){ if(n){ score += n; if(score>best) best=score; if(typeof updateScoreUI==='function') updateScoreUI(); } },
    sfx(name){ const f=window['sfx'+name]; if(typeof f==='function') f(); },
    flash(msg){ if(typeof showComboFlash==='function') showComboFlash(0,false,msg); },
    finish(won){ exitMapModule(mod, won); },   // kết thúc map, về bàn chính
  };
}

function enterMapModule(mod){
  if(typeof endDrag==='function') endDrag();
  if(_pluginRAF){ cancelAnimationFrame(_pluginRAF); _pluginRAF=null; }
  if(typeof hardResetAllModes==='function') hardResetAllModes(); // dừng map builtin đang chạy
  document.getElementById('grid').style.display='none';
  document.getElementById('pieces-area').style.display='none';
  const badge=document.getElementById('mode-badge'); if(badge){ badge.textContent='🧩 '+(mod.name||('MAP '+mod.id)); badge.classList.add('secret'); }
  document.getElementById('grid-wrap').classList.add('secret-mode');
  PGCV().classList.add('active');
  if(typeof startBgm==='function') startBgm(mod.bgm||'action');
  if(typeof enableArcadeHud==='function') enableArcadeHud();
  _activeMapModule = mod;
  mod._api = _makeMapApi(mod);
  if(typeof mod.init==='function') try{ mod.init(mod._api); }catch(e){ console.error('[map '+mod.id+'] init lỗi', e); }
  _pluginLast = performance.now();
  _pluginRAF = requestAnimationFrame(_pluginLoop);
}

function _pluginLoop(now){
  const mod = _activeMapModule; if(!mod){ _pluginRAF=null; return; }
  const dt = Math.min(0.05, Math.max(0,(now-_pluginLast)/1000)); _pluginLast=now;
  const cv=PGCV(), ctx=cv.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
  if(typeof mod.update==='function') try{ mod.update(dt, mod._api); }catch(e){ console.error('[map '+mod.id+'] update lỗi', e); }
  if(_activeMapModule!==mod){ return; }  // map đã tự finish() trong update
  ctx.clearRect(0,0,360,460);
  if(typeof mod.draw==='function') try{ mod.draw(ctx, mod._api); }catch(e){ console.error('[map '+mod.id+'] draw lỗi', e); }
  _pluginRAF = requestAnimationFrame(_pluginLoop);
}

function stopActiveMapModule(){
  if(_pluginRAF){ cancelAnimationFrame(_pluginRAF); _pluginRAF=null; }
  _activeMapModule = null;
  const cv = PGCV(); if(cv) cv.classList.remove('active');
}

function exitMapModule(mod, won){
  if(_pluginRAF){ cancelAnimationFrame(_pluginRAF); _pluginRAF=null; }
  _activeMapModule = null;
  PGCV().classList.remove('active');
  if(typeof setActiveHiddenMap==='function') setActiveHiddenMap(null);
  if(typeof startBgm==='function') startBgm('main');
  document.getElementById('grid').style.display='';
  document.getElementById('pieces-area').style.display='';
  document.getElementById('grid-wrap').classList.remove('secret-mode');
  const badge=document.getElementById('mode-badge'); if(badge){ badge.textContent=t('badgeNormal'); badge.classList.remove('secret'); }
  const hb=document.getElementById('hint-bar'); if(hb) hb.textContent=t('hintDefault');
  if(!won && typeof forfeitHiddenMapScore==='function') forfeitHiddenMapScore();
  if(typeof mod.onExit==='function') try{ mod.onExit(won, mod._api); }catch(e){}
  if(typeof renderPieces==='function') renderPieces();
  if(typeof checkGameOverA==='function') checkGameOverA();
  if(typeof enableArcadeHud==='function') enableArcadeHud();
}

// Input dùng chung: pointer trên plugin-canvas → cập nhật api.input + gọi hook map.
(function wirePluginInput(){
  const cv = PGCV(); if(!cv) return;
  const toLogical = e => { const r=cv.getBoundingClientRect(); return { x:(e.clientX-r.left)*(360/r.width), y:(e.clientY-r.top)*(460/r.height) }; };
  cv.addEventListener('pointerdown', e=>{ const m=_activeMapModule; if(!m) return; e.preventDefault(); const p=toLogical(e); const a=m._api.input; a.x=p.x; a.y=p.y; a.down=true; a.tapX=p.x; a.tapY=p.y; if(typeof m.onPointerDown==='function') m.onPointerDown(p.x,p.y,m._api); });
  cv.addEventListener('pointermove', e=>{ const m=_activeMapModule; if(!m) return; const p=toLogical(e); m._api.input.x=p.x; m._api.input.y=p.y; });
  cv.addEventListener('pointerup',  ()=>{ const m=_activeMapModule; if(!m) return; m._api.input.down=false; });
})();

// Nạp động file map (chỉ 1 lần) rồi gọi callback.
function loadMapModule(d, cb){
  if(d._loaded){ cb && cb(); return; }
  const s = document.createElement('script');
  s.src = d.file;
  s.onload = ()=>{
    d._loaded = true;
    if(d.enterName && typeof window[d.enterName]==='function') d.enter = window[d.enterName];
    cb && cb();
  };
  s.onerror = ()=> console.error('[MapManager] Lỗi nạp file map:', d.file);
  document.head.appendChild(s);
}

// Vào chơi 1 map theo id(số) hoặc key(chuỗi). Tự lazy-load nếu là map ngoài.
function startMap(idOrKey){
  const d = MAP_REGISTRY[idOrKey];
  if(!d){ console.warn('[MapManager] Không tìm thấy map:', idOrKey); return false; }
  if(typeof d.enter === 'function'){ d.enter(); return true; }
  if(d.file){ loadMapModule(d, ()=>{ if(typeof d.enter==='function') d.enter(); }); return true; }
  console.warn('[MapManager] Map chưa có hàm enter:', idOrKey); return false;
}

// Hiện overlay mở khoá của 1 map (thay cho switch(stageKey)).
function triggerMapUnlock(idOrKey){
  const d = MAP_REGISTRY[idOrKey];
  if(d && typeof d.trigger === 'function'){ d.trigger(); return true; }
  return false;
}

function getMap(idOrKey){ return MAP_REGISTRY[idOrKey] || null; }
