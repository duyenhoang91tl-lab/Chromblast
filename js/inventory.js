// ═══════════════════════════════════════════════════════════════
// inventory.js — Tim + vàng + vật phẩm 🔥 Lửa / 🫧 Bóng bóng / 💨 Gió
// Nạp SAU save.js + progression.js, TRƯỚC ui.js / engine.js
// ═══════════════════════════════════════════════════════════════

const INV_KEY = 'chromablast_inventory';
const HEART_GIFTS_KEY = 'chromablast_heart_gifts';
const DAILY_HEARTS = 5;
const START_GOLD = 20;
const MAX_AD_HEART_VIEWS = 5;
const MAX_AD_GOLD_VIEWS = 5;
const AD_GOLD_REWARDS = [1, 2, 3, 4, 5]; // lần 1..5 trong ngày
const MAX_HEART_GIFT_PEOPLE = 10;

let inv = {
  hearts: 5,
  gold: START_GOLD,
  fires: 1,
  bubbles: 1,
  winds: 1,
  lastHeartDay: '',
  combo5Seen: false,
  combo10Seen: false,
  goldBootstrapped: false,
  adHeartDay: '',
  adHeartViews: 0,
  adGoldDay: '',
  adGoldViews: 0
};

/** Tim dùng nửa đơn vị (0.5) — dùng chung Chromablast + Caro PvP */
function roundHalf(n){
  const x = Number(n);
  if(!isFinite(x)) return 0;
  return Math.round(Math.max(0, x) * 2) / 2;
}
function formatHearts(n){
  const v = roundHalf(n);
  return (Math.abs(v % 1) < 1e-9) ? String(Math.round(v)) : v.toFixed(1);
}

function _invDay(){
  return (typeof todayStr==='function') ? todayStr() : new Date().toISOString().slice(0,10);
}

(function loadInventory(){
  try{
    const s = JSON.parse(safeGet(INV_KEY) || '{}');
    if(s && typeof s === 'object'){
      if('hearts' in s) inv.hearts = roundHalf(s.hearts);
      if('fires' in s) inv.fires = Math.max(0, s.fires|0);
      if('bubbles' in s) inv.bubbles = Math.max(0, s.bubbles|0);
      if('winds' in s) inv.winds = Math.max(0, s.winds|0);
      if(s.energy|0) inv.fires += Math.max(0, s.energy|0);
      if(s.saws|0) inv.winds += Math.max(0, s.saws|0);
      inv.lastHeartDay = s.lastHeartDay || '';
      inv.combo5Seen = !!s.combo5Seen;
      inv.combo10Seen = !!s.combo10Seen;
      inv.adHeartDay = s.adHeartDay || '';
      inv.adHeartViews = Math.max(0, s.adHeartViews|0);
      inv.adGoldDay = s.adGoldDay || '';
      inv.adGoldViews = Math.max(0, s.adGoldViews|0);
      if('gold' in s && Number.isFinite(Number(s.gold))){
        inv.gold = Math.max(0, Math.floor(Number(s.gold)));
        inv.goldBootstrapped = true;
      } else {
        // Người chơi cũ chưa có vàng → tặng đúng mức khởi điểm một lần
        inv.gold = START_GOLD;
        inv.goldBootstrapped = true;
      }
    } else {
      inv.gold = START_GOLD;
      inv.goldBootstrapped = true;
    }
  }catch(e){
    inv.gold = START_GOLD;
    inv.goldBootstrapped = true;
  }
})();

function saveInventory(){
  try{
    safeSet(INV_KEY, JSON.stringify({
      hearts: roundHalf(inv.hearts),
      gold: Math.max(0, inv.gold|0),
      fires: inv.fires|0,
      bubbles: inv.bubbles|0,
      winds: inv.winds|0,
      lastHeartDay: inv.lastHeartDay || '',
      combo5Seen: !!inv.combo5Seen,
      combo10Seen: !!inv.combo10Seen,
      goldBootstrapped: true,
      adHeartDay: inv.adHeartDay || '',
      adHeartViews: inv.adHeartViews|0,
      adGoldDay: inv.adGoldDay || '',
      adGoldViews: inv.adGoldViews|0
    }));
  }catch(e){}
}

const POWER_INFO = {
  fire:   { field:'fires',   icon:'🔥', nameKey:'invFire' },
  bubble: { field:'bubbles', icon:'🫧', nameKey:'invBubble' },
  wind:   { field:'winds',   icon:'💨', nameKey:'invWind' },
};
function powerName(type){
  const info = POWER_INFO[type];
  if(!info) return type;
  try{ if(typeof t==='function') return t(info.nameKey); }catch(e){}
  return info.nameKey;
}

function getGold(){ return Math.max(0, inv.gold|0); }

function grantGold(n, reason){
  n = Math.floor(Number(n)||0);
  if(!(n>0)) return;
  inv.gold = (inv.gold|0) + n;
  saveInventory();
  renderInventoryHud();
  try{
    if(reason) showComboFlash(0, false, '🪙 +'+n+(reason?(' · '+reason):''));
  }catch(e){}
}

function spendGold(n){
  n = Math.floor(Number(n)||0);
  if(n<=0) return true;
  if((inv.gold|0) < n) return false;
  inv.gold = (inv.gold|0) - n;
  saveInventory();
  renderInventoryHud();
  return true;
}

function grantHearts(n, reason){
  n = roundHalf(n);
  if(!(n>0)) return;
  inv.hearts = roundHalf(roundHalf(inv.hearts) + n);
  saveInventory();
  renderInventoryHud();
  try{
    if(reason) showComboFlash(0, false, '❤️ +'+formatHearts(n)+(reason?(' · '+reason):''));
  }catch(e){}
}

function grantPower(type, n, reason){
  const info = POWER_INFO[type];
  if(!info || !(n>0)) return;
  inv[info.field] = (inv[info.field]|0) + (n|0);
  saveInventory();
  renderInventoryHud();
  try{ if(reason) showComboFlash(0, false, info.icon+' +'+n+' '+powerName(type)+(reason?(' · '+reason):'')); }catch(e){}
}

function grantRandomPower(reason){
  const kinds = ['fire','bubble','wind'];
  const type = kinds[Math.floor(Math.random()*kinds.length)];
  grantPower(type, 1, reason);
  return type;
}

/** Trừ tim (hỗ trợ 0.5). allowPartial=true: trừ tối đa số đang có. */
function spendHearts(n, opts){
  opts = opts || {};
  n = roundHalf(n);
  if(n<=0) return true;
  const cur = roundHalf(inv.hearts);
  if(!opts.allowPartial && cur + 1e-9 < n) return false;
  const spent = Math.min(cur, n);
  inv.hearts = roundHalf(cur - spent);
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
  const day = _invDay();
  if(inv.lastHeartDay === day) return false;
  inv.lastHeartDay = day;
  inv.hearts = roundHalf(roundHalf(inv.hearts) + DAILY_HEARTS);
  saveInventory();
  renderInventoryHud();
  return true;
}

function unlockSkillByLevel(){ return null; }

function onComboSkillMilestone(streak){
  if(streak === 5){
    grantRandomPower('Combo x5');
    if(!inv.combo5Seen){ inv.combo5Seen = true; saveInventory(); }
  } else if(streak === 10){
    grantRandomPower('Combo x10');
    if(!inv.combo10Seen){ inv.combo10Seen = true; saveInventory(); }
  }
}

function _rollAdDay(kind){
  const day = _invDay();
  if(kind === 'heart'){
    if(inv.adHeartDay !== day){ inv.adHeartDay = day; inv.adHeartViews = 0; }
  } else {
    if(inv.adGoldDay !== day){ inv.adGoldDay = day; inv.adGoldViews = 0; }
  }
}

function adHeartViewsLeft(){
  _rollAdDay('heart');
  return Math.max(0, MAX_AD_HEART_VIEWS - (inv.adHeartViews|0));
}
function adGoldViewsLeft(){
  _rollAdDay('gold');
  return Math.max(0, MAX_AD_GOLD_VIEWS - (inv.adGoldViews|0));
}
function nextAdGoldReward(){
  _rollAdDay('gold');
  const i = inv.adGoldViews|0;
  if(i >= AD_GOLD_REWARDS.length) return 0;
  return AD_GOLD_REWARDS[i];
}

function buyHeartWithGold(n, priceEach){
  n = Math.max(1, n|0);
  const price = Math.max(1, (priceEach|0) || (typeof HEART_GOLD_PRICE==='number'?HEART_GOLD_PRICE:8));
  const total = price * n;
  if(!spendGold(total)) return { ok:false, reason:'gold' };
  grantHearts(n, typeof t==='function'?t('shopHeartBought'):'Mua bằng vàng');
  return { ok:true };
}

function getHeartGiftState(){
  const day = _invDay();
  try{
    const raw = JSON.parse((typeof safeGet==='function'?safeGet(HEART_GIFTS_KEY):null) || localStorage.getItem(HEART_GIFTS_KEY) || '{}');
    if(raw && raw.day === day && Array.isArray(raw.sentTo)){
      return { day, sentTo: raw.sentTo.filter(Boolean).slice(0, MAX_HEART_GIFT_PEOPLE) };
    }
  }catch(e){}
  return { day, sentTo: [] };
}
function saveHeartGiftState(st){
  try{
    const payload = JSON.stringify({ day: st.day || _invDay(), sentTo: (st.sentTo||[]).slice(0, MAX_HEART_GIFT_PEOPLE) });
    if(typeof safeSet==='function') safeSet(HEART_GIFTS_KEY, payload);
    else localStorage.setItem(HEART_GIFTS_KEY, payload);
  }catch(e){}
}
function canSendHeartGift(toUid){
  if(!toUid) return { ok:false, reason:'need_id' };
  const st = getHeartGiftState();
  if(st.sentTo.indexOf(toUid) >= 0) return { ok:false, reason:'already' };
  if(st.sentTo.length >= MAX_HEART_GIFT_PEOPLE) return { ok:false, reason:'cap' };
  return { ok:true, state: st };
}
function markHeartGiftSent(toUid){
  const check = canSendHeartGift(toUid);
  if(!check.ok) return check;
  const st = check.state;
  st.sentTo.push(toUid);
  saveHeartGiftState(st);
  return { ok:true, left: MAX_HEART_GIFT_PEOPLE - st.sentTo.length };
}

function renderInventoryHud(){
  const el = document.getElementById('inv-hud');
  if(el){
    el.innerHTML =
      '<span class="inv-chip inv-heart" title="Tim (chung với Caro)">❤️ '+formatHearts(inv.hearts)+'</span>'+
      '<span class="inv-chip inv-gold" title="Vàng">🪙 '+getGold()+'</span>';
  }
  const caroHud = document.getElementById('caro-hearts-hud');
  if(caroHud){
    caroHud.textContent = '❤️ '+formatHearts(inv.hearts);
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
      b.disabled = false;
      b.classList.toggle('no-res', cnt<1);
      b.classList.toggle('aiming', typeof pendingSkill!=='undefined' && pendingSkill===type);
      const lab = b.querySelector('.skill-lab');
      if(lab) lab.textContent = powerName(type).split(' ')[0]+' ×'+cnt;
    });
    const adBtn = document.getElementById('inv-ad-heart-btn');
    if(adBtn){
      const show = roundHalf(inv.hearts)<=0 && adHeartViewsLeft()>0;
      adBtn.style.display = show ? '' : 'none';
      adBtn.disabled = adHeartViewsLeft()<1;
      adBtn.title = adHeartViewsLeft()>0
        ? ('📺 +❤️ ('+adHeartViewsLeft()+'/5)')
        : 'Đã hết lượt QC tim hôm nay';
    }
  }
}

function usePowerItem(type){
  const info = POWER_INFO[type];
  if(!info) return;
  const inHidden = (typeof secretMode!=='undefined' && secretMode) ||
                   (typeof activeHiddenMapKey!=='undefined' && activeHiddenMapKey) ||
                   (typeof versusMode!=='undefined' && versusMode);
  if(inHidden){ try{ showComboFlash(0,false, typeof t==='function'?t('invMainOnly'):'Chỉ dùng ở bàn chính'); }catch(e){} return; }
  if((inv[info.field]|0) < 1){
    try{ showComboFlash(0,false, typeof t==='function'?t('invMissing', info.icon):('Thiếu '+info.icon+' — combo x5/x10, phá 15 lần hoặc 🎡')); }catch(e){}
    return;
  }
  if(typeof beginSkillAim!=='function'){ return; }
  if(typeof pendingSkill!=='undefined' && pendingSkill===type){
    cancelSkillAim();
    try{ showHint(typeof t==='function'?t('invCancel'):'Đã hủy'); }catch(e){}
    return;
  }
  beginSkillAim(type);
}

let _adHeartBusy = false;
let _adGoldBusy = false;

function watchAdForHeart(){
  if(_adHeartBusy) return;
  if(adHeartViewsLeft() < 1){
    try{ showComboFlash(0,false, typeof t==='function'?t('invAdHeartCap'):'Hết lượt QC tim hôm nay (5/5)'); }catch(e){}
    return;
  }
  const btn = document.getElementById('inv-ad-heart-btn');
  const setBusy = (b)=>{
    _adHeartBusy = b;
    if(btn) btn.classList.toggle('no-res', b);
  };
  const done = ()=>{
    setBusy(false);
    _rollAdDay('heart');
    inv.adHeartViews = (inv.adHeartViews|0) + 1;
    saveInventory();
    grantHearts(1, typeof t==='function'?t('invAdGrant'):'Xem quảng cáo');
    renderInventoryHud();
  };
  const fail = ()=>{
    setBusy(false);
    try{ showComboFlash(0,false, typeof t==='function'?t('invAdFail'):'Quảng cáo chưa sẵn sàng — thử lại sau nhé'); }catch(e){}
  };
  setBusy(true);
  if(typeof showRewardedAd==='function'){
    showRewardedAd(done, fail);
  } else {
    setTimeout(done, 600);
  }
}

function watchAdForGold(onDone){
  if(_adGoldBusy) return;
  const reward = nextAdGoldReward();
  if(reward < 1){
    try{ showComboFlash(0,false, typeof t==='function'?t('invAdGoldCap'):'Hết lượt QC vàng hôm nay (5/5)'); }catch(e){}
    return;
  }
  const setBusy = (b)=>{ _adGoldBusy = b; };
  const done = ()=>{
    setBusy(false);
    _rollAdDay('gold');
    inv.adGoldViews = (inv.adGoldViews|0) + 1;
    saveInventory();
    grantGold(reward, typeof t==='function'?t('invAdGoldGrant'):'Xem quảng cáo');
    if(typeof onDone==='function') onDone(reward);
  };
  const fail = ()=>{
    setBusy(false);
    try{ showComboFlash(0,false, typeof t==='function'?t('invAdFail'):'Quảng cáo chưa sẵn sàng — thử lại sau nhé'); }catch(e){}
  };
  setBusy(true);
  if(typeof showRewardedAd==='function'){
    showRewardedAd(done, fail);
  } else {
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
  get hearts(){ return roundHalf(inv.hearts); },
  get gold(){ return getGold(); },
  get fires(){ return inv.fires|0; },
  get bubbles(){ return inv.bubbles|0; },
  get winds(){ return inv.winds|0; },
  formatHearts: formatHearts,
  roundHalf: roundHalf,
  addHearts: function(n, reason){ grantHearts(n, reason||''); },
  spendHearts: spendHearts,
  addGold: function(n, reason){ grantGold(n, reason||''); },
  spendGold: spendGold,
  getGold: getGold,
  addFires: function(n, reason){ grantPower('fire', n, reason||''); },
  addBubbles: function(n, reason){ grantPower('bubble', n, reason||''); },
  addWinds: function(n, reason){ grantPower('wind', n, reason||''); },
  addEnergy: function(n, reason){ grantPower('fire', n, reason||''); },
  addSaws: function(n, reason){ grantPower('wind', n, reason||''); },
  spendPower: spendPower,
  grantDailyHeartsIfNeeded: grantDailyHeartsIfNeeded,
  unlockSkillByLevel: unlockSkillByLevel,
  onComboSkillMilestone: onComboSkillMilestone,
  render: renderInventoryHud,
  adHeartViewsLeft: adHeartViewsLeft,
  adGoldViewsLeft: adGoldViewsLeft,
  nextAdGoldReward: nextAdGoldReward,
  watchAdForGold: watchAdForGold,
  buyHeartWithGold: buyHeartWithGold,
  canSendHeartGift: canSendHeartGift,
  markHeartGiftSent: markHeartGiftSent,
  getHeartGiftState: getHeartGiftState,
  MAX_HEART_GIFT_PEOPLE: MAX_HEART_GIFT_PEOPLE
};
