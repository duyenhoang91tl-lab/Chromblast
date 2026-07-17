// ═══════════════════════════════════════════════════════════════
// inventory.js — Tim + vật phẩm 🔥 Lửa / 🫧 Bong bóng / 💨 Gió
// Nạp SAU save.js + progression.js, TRƯỚC ui.js / engine.js
//
// Vật phẩm (power):
//  - 🔥 Lửa: cháy cụm 3×3 quanh ô chứa logo (gồm cả chướng ngại) — tính như 1 lần phá
//  - 🫧 Bong bóng: nổ toàn bộ ô cùng màu với ô chứa logo
//  - 💨 Gió: thổi bay hàng ngang/dọc chứa logo (ưu tiên hàng nhiều ô hơn)
// Cách dùng: bấm nút → đặt logo lên 1 ô gạch ngẫu nhiên trên bàn;
// phá ô chứa logo để kích hoạt. Mỗi ô chỉ có tối đa 1 logo.
// Nhận vật phẩm: mỗi 15 lần phá tự sinh 1 logo trên bàn (engine.js),
// combo x5/x10 tặng random 1 vật phẩm, và Vòng quay may mắn.
// ═══════════════════════════════════════════════════════════════

const INV_KEY = 'chromablast_inventory';
const DAILY_HEARTS = 5;

let inv = { hearts: 5, fires: 1, bubbles: 1, winds: 1, lastHeartDay: '', combo5Seen: false, combo10Seen: false };

(function loadInventory(){
  try{
    const s = JSON.parse(safeGet(INV_KEY) || '{}');
    if(s && typeof s === 'object'){
      if('hearts' in s) inv.hearts = Math.max(0, s.hearts|0);
      if('fires' in s) inv.fires = Math.max(0, s.fires|0);
      if('bubbles' in s) inv.bubbles = Math.max(0, s.bubbles|0);
      if('winds' in s) inv.winds = Math.max(0, s.winds|0);
      // Chuyển đổi tồn kho cũ: ⚡ năng lượng → 🔥 lửa, 🪚 cưa → 💨 gió
      if(s.energy|0) inv.fires += Math.max(0, s.energy|0);
      if(s.saws|0) inv.winds += Math.max(0, s.saws|0);
      inv.lastHeartDay = s.lastHeartDay || '';
      inv.combo5Seen = !!s.combo5Seen;
      inv.combo10Seen = !!s.combo10Seen;
    }
  }catch(e){}
})();

function saveInventory(){
  try{
    safeSet(INV_KEY, JSON.stringify({
      hearts: inv.hearts|0,
      fires: inv.fires|0,
      bubbles: inv.bubbles|0,
      winds: inv.winds|0,
      lastHeartDay: inv.lastHeartDay || '',
      combo5Seen: !!inv.combo5Seen,
      combo10Seen: !!inv.combo10Seen
    }));
  }catch(e){}
}

const POWER_INFO = {
  fire:   { field:'fires',   icon:'🔥', name:'Lửa' },
  bubble: { field:'bubbles', icon:'🫧', name:'Bong bóng' },
  wind:   { field:'winds',   icon:'💨', name:'Gió' },
};

function grantHearts(n, reason){
  if(!(n>0)) return;
  inv.hearts = (inv.hearts|0) + (n|0);
  saveInventory();
  renderInventoryHud();
  try{
    if(reason) showComboFlash(0, false, '❤️ +'+n+(reason?(' · '+reason):''));
  }catch(e){}
}

function grantPower(type, n, reason){
  const info = POWER_INFO[type];
  if(!info || !(n>0)) return;
  inv[info.field] = (inv[info.field]|0) + (n|0);
  saveInventory();
  renderInventoryHud();
  try{ if(reason) showComboFlash(0, false, info.icon+' +'+n+' '+info.name+(reason?(' · '+reason):'')); }catch(e){}
}

function grantRandomPower(reason){
  const kinds = ['fire','bubble','wind'];
  const type = kinds[Math.floor(Math.random()*kinds.length)];
  grantPower(type, 1, reason);
  return type;
}

function spendHearts(n){
  n = n|0;
  if(n<=0) return true;
  if((inv.hearts|0) < n) return false;
  inv.hearts -= n;
  saveInventory();
  renderInventoryHud();
  return true;
}

function spendPower(type, n){
  const info = POWER_INFO[type];
  if(!info) return false;
  n = (n|0) || 1;
  if((inv[info.field]|0) < n) return false;
  inv[info.field] -= n;
  saveInventory();
  renderInventoryHud();
  return true;
}

/** +5 tim mỗi ngày (1 lần/ngày, tự nhận khi vào game / mở inventory) */
function grantDailyHeartsIfNeeded(){
  const day = (typeof todayStr==='function') ? todayStr() : new Date().toISOString().slice(0,10);
  if(inv.lastHeartDay === day) return false;
  inv.lastHeartDay = day;
  inv.hearts = (inv.hearts|0) + DAILY_HEARTS;
  saveInventory();
  renderInventoryHud();
  return true;
}

/** Giữ tương thích cũ (progression.js gọi khi lên level) — không còn khóa theo level */
function unlockSkillByLevel(){ return null; }

/** Thưởng khi đạt combo x5 / x10 trong ván: random 1 vật phẩm */
function onComboSkillMilestone(streak){
  if(streak === 5){
    grantRandomPower('Combo x5');
    if(!inv.combo5Seen){ inv.combo5Seen = true; saveInventory(); }
  } else if(streak === 10){
    grantRandomPower('Combo x10');
    if(!inv.combo10Seen){ inv.combo10Seen = true; saveInventory(); }
  }
}

function renderInventoryHud(){
  const el = document.getElementById('inv-hud');
  if(el){
    el.innerHTML =
      '<span class="inv-chip inv-heart" title="Tim">❤️ '+(inv.hearts|0)+'</span>'+
      '<span class="inv-chip inv-fire" title="Lửa">🔥 '+(inv.fires|0)+'</span>'+
      '<span class="inv-chip inv-bubble" title="Bong bóng">🫧 '+(inv.bubbles|0)+'</span>'+
      '<span class="inv-chip inv-wind" title="Gió">💨 '+(inv.winds|0)+'</span>';
  }
  const sk = document.getElementById('skill-bar');
  if(sk){
    sk.style.display = 'flex';
    const btns = [
      ['skill-btn-fire',   'fire'],
      ['skill-btn-bubble', 'bubble'],
      ['skill-btn-wind',   'wind'],
    ];
    btns.forEach(([id, type])=>{
      const b = document.getElementById(id);
      if(!b) return;
      const info = POWER_INFO[type];
      const cnt = inv[info.field]|0;
      b.disabled = false; // nút disabled nuốt click → không phản hồi; luôn cho bấm để hiện lý do
      b.classList.toggle('no-res', cnt<1);
      const lab = b.querySelector('.skill-lab');
      if(lab) lab.textContent = info.name.split(' ')[0]+' ×'+cnt;
    });
    // Nút xem QC +1 tim: chỉ hiện khi HẾT TIM để người chơi lựa chọn
    const adBtn = document.getElementById('inv-ad-heart-btn');
    if(adBtn) adBtn.style.display = (inv.hearts|0)<=0 ? '' : 'none';
  }
}

/** Bấm nút vật phẩm → đặt logo lên 1 ô gạch ngẫu nhiên trên bàn chính */
function usePowerItem(type){
  const info = POWER_INFO[type];
  if(!info) return;
  const inHidden = (typeof secretMode!=='undefined' && secretMode) ||
                   (typeof activeHiddenMapKey!=='undefined' && activeHiddenMapKey) ||
                   (typeof versusMode!=='undefined' && versusMode);
  if(inHidden){ try{ showComboFlash(0,false,'Chỉ dùng ở bàn chính'); }catch(e){} return; }
  if((inv[info.field]|0) < 1){
    try{ showComboFlash(0,false,'Thiếu '+info.icon+' — đạt combo x5/x10, phá 15 lần hoặc Vòng quay 🎡'); }catch(e){}
    return;
  }
  if(typeof spawnPowerCell !== 'function'){ return; }
  const k = spawnPowerCell(type);
  if(!k){
    try{ showComboFlash(0,false,'Bàn chưa có ô gạch trống logo để đặt '+info.icon); }catch(e){}
    return;
  }
  spendPower(type, 1);
  try{ sfxPowerUp(); showComboFlash(0,false,info.icon+' Đã đặt lên bàn — phá ô đó để kích hoạt!'); }catch(e){}
}

let _adHeartBusy = false;
let _adHeartFallbackAt = 0;
const AD_HEART_FALLBACK_COOLDOWN = 90 * 1000; // QC lỗi vẫn +1 tim, tối đa ~1 lần/90s

function watchAdForHeart(){
  if(_adHeartBusy) return; // chặn bấm liên tục khi QC đang mở
  const btn = document.getElementById('inv-ad-heart-btn');
  const setBusy = (b)=>{
    _adHeartBusy = b;
    if(btn) btn.classList.toggle('no-res', b);
  };
  const done = ()=>{ setBusy(false); grantHearts(1, 'Xem quảng cáo'); };
  const fail = ()=>{
    setBusy(false);
    // QC chưa cấu hình xong / không có fill: vẫn tặng tim nhưng giới hạn
    // tần suất để nút không bị lạm dụng vô hạn.
    const now = Date.now();
    if(now - _adHeartFallbackAt >= AD_HEART_FALLBACK_COOLDOWN){
      _adHeartFallbackAt = now;
      grantHearts(1, 'Tặng thêm');
    } else {
      try{ showComboFlash(0,false,'Quảng cáo chưa sẵn sàng — thử lại sau nhé'); }catch(e){}
    }
  };
  setBusy(true);
  if(typeof showRewardedAd==='function'){
    showRewardedAd(done, fail);
  } else {
    // Web/không có AdMob: giả lập xem QC thành công
    setTimeout(done, 600);
  }
}

function initInventoryUI(){
  grantDailyHeartsIfNeeded();
  renderInventoryHud();
  document.getElementById('skill-btn-fire')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} usePowerItem('fire'); });
  document.getElementById('skill-btn-bubble')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} usePowerItem('bubble'); });
  document.getElementById('skill-btn-wind')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} usePowerItem('wind'); });
  document.getElementById('inv-ad-heart-btn')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} watchAdForHeart(); });
}

/** API cho lucky-spin.js và script khác */
window.Inventory = {
  get hearts(){ return inv.hearts|0; },
  get fires(){ return inv.fires|0; },
  get bubbles(){ return inv.bubbles|0; },
  get winds(){ return inv.winds|0; },
  addHearts: function(n, reason){ grantHearts(n, reason||''); },
  addFires: function(n, reason){ grantPower('fire', n, reason||''); },
  addBubbles: function(n, reason){ grantPower('bubble', n, reason||''); },
  addWinds: function(n, reason){ grantPower('wind', n, reason||''); },
  // alias tương thích cũ
  addEnergy: function(n, reason){ grantPower('fire', n, reason||''); },
  addSaws: function(n, reason){ grantPower('wind', n, reason||''); },
  grantDailyHeartsIfNeeded: grantDailyHeartsIfNeeded,
  unlockSkillByLevel: unlockSkillByLevel,
  onComboSkillMilestone: onComboSkillMilestone,
  render: renderInventoryHud
};
