// ═══════════════════════════════════════════════════════════════
// mapManager.js — Trình quản lý MAP tập trung
// Thay cho các chuỗi if(map==N) / switch(stageKey): mọi map được đăng ký
// vào MAP_REGISTRY theo SỐ (1-20) và theo KHOÁ ('secret'...'mega').
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
  {id:3,  key:'fruit',  name:'Chém hoa quả',       enter:enterFruitMode,  trigger:triggerFruitUnlock},
  {id:4,  key:'bee',    name:'Bảo vệ chó khỏi ong',enter:enterBeeMode,    trigger:triggerBeeUnlock},
  {id:5,  key:'gold',   name:'Đào vàng',           enter:enterGoldMode,   trigger:triggerGoldUnlock},
  {id:6,  key:'mole',   name:'Đập thú',            enter:enterMoleMode,   trigger:triggerMoleUnlock},
  {id:7,  key:'memory', name:'Lật thẻ ký ức',      enter:enterMemoryMode, trigger:triggerMemoryUnlock},
  {id:8,  key:'bubble', name:'Bắn bong bóng',      enter:enterBubbleMode, trigger:triggerBubbleUnlock},
  {id:9,  key:'stack',  name:'Xếp tháp',           enter:enterStackMode,  trigger:triggerStackUnlock},
  {id:10, key:'boss',   name:'Phi cơ bắn gà',      enter:enterBossMode,   trigger:triggerBossUnlock},
  {id:11, key:'catch',  name:'Bắt thú',            enter:enterCatchMode,  trigger:triggerCatchUnlock},
  {id:12, key:'flood',  name:'Tràn màu',           enter:enterFloodMode,  trigger:triggerFloodUnlock},
  {id:13, key:'arena',  name:'Đấu trường sinh tồn',enter:enterArenaMode,  trigger:triggerArenaUnlock},
  {id:14, key:'snake',  name:'Rắn',                enter:enterSnakeMode,  trigger:triggerSnakeUnlock},
  {id:15, key:'brick',  name:'Bắn gạch',           enter:enterBrickMode,  trigger:triggerBrickUnlock},
  {id:16, key:'runner', name:'Chạy vô tận',        enter:enterRunnerMode, trigger:triggerRunnerUnlock},
  {id:17, key:'space',  name:'Space Shooter',      enter:enterSpaceMode,  trigger:triggerSpaceUnlock},
  {id:18, key:'rhythm', name:'Rhythm Tap',         enter:enterRhythmMode, trigger:triggerRhythmUnlock},
  {id:19, key:'maze',   name:'Mê cung',            enter:enterMazeMode,   trigger:triggerMazeUnlock},
  {id:20, key:'mega',   name:'MEGA BOSS',          enter:enterMegaMode,   trigger:triggerMegaUnlock},
].forEach(registerMap);

// ── Map "ngoài" nạp động: chỉ cần khai báo file + tên hàm enter ──
// Ví dụ mẫu cho map 21+ (file maps/mapNN.js tự đăng ký hàm enterMapNN vào global).
[
  {id:21, key:'map21', name:'Map mẫu (lazy-load)', file:'maps/map21.js', enterName:'enterMap21'},
].forEach(registerMap);

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
