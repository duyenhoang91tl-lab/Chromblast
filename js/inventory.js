// ═══════════════════════════════════════════════════════════════
// inventory.js — Tim + vàng + vật phẩm 🔥 Lửa / 🫧 Bóng bóng / 💨 Gió
// Nạp SAU save.js + progression.js, TRƯỚC ui.js / engine.js
// ═══════════════════════════════════════════════════════════════

const INV_KEY = 'chromablast_inventory';
const HEART_GIFTS_KEY = 'chromablast_heart_gifts';
/** Cap tim trên HUD / hồi theo thời gian. Lần đầu vào game = 5 tim. */
const MAX_HEARTS = 5;
/** 30 phút / 1 tim — chuẩn lives game hiện tại. */
const HEART_REGEN_MS = 30 * 60 * 1000;
/** Hồi tim tối đa 5/ngày — hết ngân sách thì chờ ngày mới (không cộng dồn). */
const MAX_REGEN_HEARTS_PER_DAY = 5;
/** Tim nhận từ nhiệm vụ/điểm danh mỗi ngày tối đa 5. */
const MAX_DAILY_QUEST_HEARTS = 5;
const START_GOLD = 20;
const MAX_AD_HEART_VIEWS = 5;
const MAX_AD_GOLD_VIEWS = 5;
const AD_GOLD_REWARDS = [1, 2, 3, 4, 5]; // lần 1..5 trong ngày
const MAX_HEART_GIFT_PEOPLE = 10;

let inv = {
  hearts: MAX_HEARTS,
  gold: START_GOLD,
  diamonds: 0,
  fires: 1,
  bubbles: 1,
  winds: 1,
  /** Timestamp ms khi hồi +1 tim; 0 khi đầy cap hoặc hết ngân sách hồi ngày */
  nextHeartAt: 0,
  combo5Seen: false,
  combo10Seen: false,
  goldBootstrapped: false,
  heartsBootstrapped: true,
  adHeartDay: '',
  adHeartViews: 0,
  adGoldDay: '',
  adGoldViews: 0,
  regenDay: '',
  regenToday: 0,
  dailyQuestDay: '',
  dailyQuestHearts: 0
};
let _heartRegenTimer = null;

/** Tim dùng nửa đơn vị (0.5) — Caro PvP trừ 1/2 khi thua */
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
    if(s && typeof s === 'object' && Object.keys(s).length){
      if('hearts' in s){
        inv.hearts = roundHalf(s.hearts);
        inv.heartsBootstrapped = true;
      } else {
        // Lần đầu / save cũ không có tim → mặc định 5
        inv.hearts = MAX_HEARTS;
        inv.heartsBootstrapped = true;
      }
      if('fires' in s) inv.fires = Math.max(0, s.fires|0);
      if('bubbles' in s) inv.bubbles = Math.max(0, s.bubbles|0);
      if('winds' in s) inv.winds = Math.max(0, s.winds|0);
      if(s.energy|0) inv.fires += Math.max(0, s.energy|0);
      if(s.saws|0) inv.winds += Math.max(0, s.saws|0);
      const nh = Number(s.nextHeartAt);
      inv.nextHeartAt = (Number.isFinite(nh) && nh > 0) ? Math.floor(nh) : 0;
      inv.combo5Seen = !!s.combo5Seen;
      inv.combo10Seen = !!s.combo10Seen;
      inv.adHeartDay = s.adHeartDay || '';
      inv.adHeartViews = Math.max(0, s.adHeartViews|0);
      inv.adGoldDay = s.adGoldDay || '';
      inv.adGoldViews = Math.max(0, s.adGoldViews|0);
      inv.regenDay = s.regenDay || '';
      inv.regenToday = Math.max(0, s.regenToday|0);
      inv.dailyQuestDay = s.dailyQuestDay || '';
      inv.dailyQuestHearts = Math.max(0, s.dailyQuestHearts|0);
      if('gold' in s && Number.isFinite(Number(s.gold))){
        inv.gold = Math.max(0, Math.floor(Number(s.gold)));
        inv.goldBootstrapped = true;
      } else {
        inv.gold = START_GOLD;
        inv.goldBootstrapped = true;
      }
      if('diamonds' in s && Number.isFinite(Number(s.diamonds))){
        inv.diamonds = Math.max(0, Math.floor(Number(s.diamonds)));
      }
    } else {
      // Lần đầu vào game: 5 tim + vàng khởi đầu
      inv.hearts = MAX_HEARTS;
      inv.heartsBootstrapped = true;
      inv.gold = START_GOLD;
      inv.goldBootstrapped = true;
    }
  }catch(e){
    inv.hearts = MAX_HEARTS;
    inv.heartsBootstrapped = true;
    inv.gold = START_GOLD;
    inv.goldBootstrapped = true;
  }
})();

function saveInventory(){
  try{
    safeSet(INV_KEY, JSON.stringify({
      hearts: roundHalf(inv.hearts),
      gold: Math.max(0, inv.gold|0),
      diamonds: Math.max(0, inv.diamonds|0),
      fires: inv.fires|0,
      bubbles: inv.bubbles|0,
      winds: inv.winds|0,
      nextHeartAt: inv.nextHeartAt > 0 ? (inv.nextHeartAt|0) : 0,
      combo5Seen: !!inv.combo5Seen,
      combo10Seen: !!inv.combo10Seen,
      goldBootstrapped: true,
      heartsBootstrapped: true,
      adHeartDay: inv.adHeartDay || '',
      adHeartViews: inv.adHeartViews|0,
      adGoldDay: inv.adGoldDay || '',
      adGoldViews: inv.adGoldViews|0,
      regenDay: inv.regenDay || '',
      regenToday: inv.regenToday|0,
      dailyQuestDay: inv.dailyQuestDay || '',
      dailyQuestHearts: inv.dailyQuestHearts|0
    }));
  }catch(e){}
}

function heartsBelowMax(){
  return roundHalf(inv.hearts) + 1e-9 < MAX_HEARTS;
}

function formatHeartRegen(ms){
  ms = Math.max(0, ms|0);
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n)=> (n < 10 ? '0' : '') + n;
  if(h > 0) return h + ':' + pad(m) + ':' + pad(s);
  return pad(m) + ':' + pad(s);
}

/** Đổi ngày → reset ngân sách hồi (không cộng dồn sang hôm sau). */
function _rollRegenDay(now){
  const day = _invDay();
  if(inv.regenDay === day) return false;
  inv.regenDay = day;
  inv.regenToday = 0;
  // Timer cũ từ hôm qua không mang sang — bắt đầu đếm lại trong ngày mới
  if(heartsBelowMax()){
    inv.nextHeartAt = (now || Date.now()) + HEART_REGEN_MS;
  } else {
    inv.nextHeartAt = 0;
  }
  return true;
}

function regenHeartsLeftToday(){
  _rollRegenDay();
  return Math.max(0, MAX_REGEN_HEARTS_PER_DAY - (inv.regenToday|0));
}

function heartRegenRemainingMs(){
  _rollRegenDay();
  if(!heartsBelowMax()) return 0;
  if(regenHeartsLeftToday() < 1) return 0;
  if(!(inv.nextHeartAt > 0)) return 0;
  return Math.max(0, (inv.nextHeartAt|0) - Date.now());
}

/** Hồi tim theo nextHeartAt; tối đa MAX_HEARTS và tối đa 5 tim/ngày. */
function applyHeartRegen(){
  const now = Date.now();
  let changed = _rollRegenDay(now);
  while(
    heartsBelowMax() &&
    regenHeartsLeftToday() > 0 &&
    inv.nextHeartAt > 0 &&
    now >= inv.nextHeartAt
  ){
    const cur = roundHalf(inv.hearts);
    inv.hearts = roundHalf(Math.min(MAX_HEARTS, cur + 1));
    inv.regenToday = (inv.regenToday|0) + 1;
    changed = true;
    if(heartsBelowMax() && regenHeartsLeftToday() > 0){
      inv.nextHeartAt = (inv.nextHeartAt|0) + HEART_REGEN_MS;
    } else {
      inv.nextHeartAt = 0;
      break;
    }
  }
  if(heartsBelowMax() && regenHeartsLeftToday() > 0){
    if(!(inv.nextHeartAt > 0)){
      inv.nextHeartAt = now + HEART_REGEN_MS;
      changed = true;
    }
  } else if(inv.nextHeartAt){
    // Đầy tim hoặc hết ngân sách hồi ngày → dừng đếm
    inv.nextHeartAt = 0;
    changed = true;
  }
  if(changed) saveInventory();
  return changed;
}

function syncHeartRegenAfterChange(){
  _rollRegenDay();
  if(heartsBelowMax() && regenHeartsLeftToday() > 0){
    if(!(inv.nextHeartAt > 0)) inv.nextHeartAt = Date.now() + HEART_REGEN_MS;
  } else {
    inv.nextHeartAt = 0;
  }
}

function _rollDailyQuestHearts(){
  const day = _invDay();
  if(inv.dailyQuestDay !== day){
    inv.dailyQuestDay = day;
    inv.dailyQuestHearts = 0;
    return true;
  }
  return false;
}

function dailyQuestHeartsLeft(){
  _rollDailyQuestHearts();
  return Math.max(0, MAX_DAILY_QUEST_HEARTS - (inv.dailyQuestHearts|0));
}

/** Tim từ điểm danh / nhiệm vụ ngày — tối đa 5/ngày. */
function grantDailyQuestHearts(n, reason){
  n = roundHalf(n);
  if(!(n > 0)) return 0;
  _rollDailyQuestHearts();
  const left = dailyQuestHeartsLeft();
  const give = roundHalf(Math.min(n, left));
  if(!(give > 0)) return 0;
  inv.dailyQuestHearts = roundHalf((inv.dailyQuestHearts|0) + give);
  grantHearts(give, reason);
  return give;
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
  if(typeof logGameEvent === 'function') logGameEvent('earn_virtual_currency', { virtual_currency_name:'gold', value:n, reason: reason||'' });
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
  if(typeof logGameEvent === 'function') logGameEvent('spend_virtual_currency', { virtual_currency_name:'gold', value:n });
  return true;
}

const GOLD_PER_DIAMOND = 100;
function getDiamonds(){ return Math.max(0, inv.diamonds|0); }
function grantDiamonds(n, reason){
  n = Math.floor(Number(n)||0);
  if(!(n>0)) return;
  inv.diamonds = (inv.diamonds|0) + n;
  saveInventory();
  renderInventoryHud();
  if(typeof logGameEvent === 'function') logGameEvent('earn_virtual_currency', { virtual_currency_name:'diamond', value:n, reason: reason||'' });
  try{ if(reason) showComboFlash(0, false, '💎 +'+n+(reason?(' · '+reason):'')); }catch(e){}
}
function spendDiamonds(n){
  n = Math.floor(Number(n)||0);
  if(n<=0) return true;
  if((inv.diamonds|0) < n) return false;
  inv.diamonds = (inv.diamonds|0) - n;
  saveInventory();
  renderInventoryHud();
  if(typeof logGameEvent === 'function') logGameEvent('spend_virtual_currency', { virtual_currency_name:'diamond', value:n });
  return true;
}
/** Đổi vàng → kim cương: 100 vàng = 1 kim cương */
function exchangeGoldForDiamonds(count){
  count = Math.max(1, count|0);
  const cost = count * GOLD_PER_DIAMOND;
  if(!spendGold(cost)) return { ok:false, reason:'gold' };
  grantDiamonds(count, typeof t==='function'?t('shopDiamondExchange'):'Đổi vàng');
  return { ok:true, diamonds:count, gold:cost };
}
/** Đổi kim cương → vàng: 1 kim cương = 100 vàng */
function exchangeDiamondsForGold(count){
  count = Math.max(1, count|0);
  const gain = count * GOLD_PER_DIAMOND;
  if(!spendDiamonds(count)) return { ok:false, reason:'diamond' };
  grantGold(gain, typeof t==='function'?t('shopGoldExchange'):'Đổi kim cương');
  return { ok:true, diamonds:count, gold:gain };
}
function diamondPriceForGold(goldPrice){
  const p = Math.max(0, goldPrice|0);
  if(p < GOLD_PER_DIAMOND) return 0;
  return Math.ceil(p / GOLD_PER_DIAMOND);
}

function grantHearts(n, reason){
  n = roundHalf(n);
  if(!(n>0)) return;
  applyHeartRegen();
  // Giới hạn cứng tại đây (thay vì ở từng nơi gọi) để MỌI nguồn cộng tim — quà tặng bạn
  // bè, điểm danh, lên cấp, nhiệm vụ, xem quảng cáo, mua bằng vàng — đều không thể vượt
  // quá MAX_HEARTS. Trước đây không giới hạn, tim có thể vượt 5/5 (VD mua tim lúc đã đầy).
  inv.hearts = roundHalf(Math.min(MAX_HEARTS, roundHalf(inv.hearts) + n));
  syncHeartRegenAfterChange();
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
  applyHeartRegen();
  const cur = roundHalf(inv.hearts);
  if(!opts.allowPartial && cur + 1e-9 < n) return false;
  const spent = Math.min(cur, n);
  inv.hearts = roundHalf(cur - spent);
  syncHeartRegenAfterChange();
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
  // Chặn mua khi tim đã đầy — trước đây không kiểm tra, khiến người chơi mất vàng
  // oan mà tim vẫn vượt quá MAX_HEARTS (VD 5/5 mua vẫn lên 6, sai luật giới hạn tim).
  applyHeartRegen();
  if(!heartsBelowMax()) return { ok:false, reason:'max' };
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

function heartHudLabel(){
  applyHeartRegen();
  const h = formatHearts(inv.hearts);
  if(!heartsBelowMax()) return '❤️ '+h;
  if(regenHeartsLeftToday() < 1) return '❤️ '+h;
  const left = heartRegenRemainingMs();
  if(left <= 0) return '❤️ '+h;
  return '❤️ '+h+' · '+formatHeartRegen(left);
}

function renderInventoryHud(){
  applyHeartRegen();
  const el = document.getElementById('inv-hud');
  if(el){
    let regenTip = '';
    if(!heartsBelowMax()) regenTip = ' · đủ '+MAX_HEARTS;
    else if(regenHeartsLeftToday() < 1) regenTip = ' · hết hồi hôm nay ('+MAX_REGEN_HEARTS_PER_DAY+'/'+MAX_REGEN_HEARTS_PER_DAY+')';
    else regenTip = ' · hồi +1 / '+Math.round(HEART_REGEN_MS/60000)+' phút · còn '+regenHeartsLeftToday()+'/'+MAX_REGEN_HEARTS_PER_DAY+' hôm nay';
    el.innerHTML =
      '<span class="inv-chip inv-heart" title="Tim'+regenTip+'">'+heartHudLabel()+'</span>'+
      '<span class="inv-chip inv-gold" title="Vàng">🪙 '+getGold()+'</span>'+
      '<span class="inv-chip inv-diamond" title="Kim cương">💎 '+getDiamonds()+'</span>';
  }
  const caroHud = document.getElementById('caro-hearts-hud');
  if(caroHud){
    caroHud.textContent = heartHudLabel();
    if(!heartsBelowMax()) caroHud.title = 'Tim';
    else if(regenHeartsLeftToday() < 1) caroHud.title = 'Tim · hết hồi hôm nay';
    else caroHud.title = 'Tim · hồi +1 sau '+formatHeartRegen(heartRegenRemainingMs());
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
      const left = adHeartViewsLeft();
      const show = left > 0 && heartsBelowMax();
      adBtn.style.display = show ? '' : 'none';
      adBtn.disabled = left < 1;
      adBtn.title = left > 0
        ? ('📺 +❤️ ('+left+'/5)')
        : 'Đã hết lượt QC tim hôm nay';
    }
  }
  try{ if(typeof positionChatFab === 'function') positionChatFab(); }catch(e){}
}

function usePowerItem(type){
  const info = POWER_INFO[type];
  if(!info) return;
  // Map 9 xếp tháp: dùng skill để cứu tháp / canh lại khi trượt hết
  if(typeof stackMode!=='undefined' && stackMode){
    if((inv[info.field]|0) < 1){
      try{ showComboFlash(0,false, typeof t==='function'?t('invMissing', info.icon):('Thiếu '+info.icon)); }catch(e){}
      return;
    }
    if(typeof useStackSkill==='function'){ useStackSkill(type); }
    return;
  }
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
  applyHeartRegen();
  renderInventoryHud();
  if(_heartRegenTimer) clearInterval(_heartRegenTimer);
  _heartRegenTimer = setInterval(function(){
    try{
      const before = roundHalf(inv.hearts);
      const at = inv.nextHeartAt|0;
      applyHeartRegen();
      if(roundHalf(inv.hearts) !== before || (inv.nextHeartAt|0) !== at || heartsBelowMax()){
        renderInventoryHud();
      }
    }catch(e){}
  }, 1000);
  document.getElementById('skill-btn-fire')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} usePowerItem('fire'); });
  document.getElementById('skill-btn-bubble')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} usePowerItem('bubble'); });
  document.getElementById('skill-btn-wind')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} usePowerItem('wind'); });
  document.getElementById('inv-ad-heart-btn')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} watchAdForHeart(); });
}

/** API cho lucky-spin.js và script khác */
window.Inventory = {
  get hearts(){ applyHeartRegen(); return roundHalf(inv.hearts); },
  get gold(){ return getGold(); },
  get diamonds(){ return getDiamonds(); },
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
  addDiamonds: function(n, reason){ grantDiamonds(n, reason||''); },
  spendDiamonds: spendDiamonds,
  getDiamonds: getDiamonds,
  exchangeGoldForDiamonds: exchangeGoldForDiamonds,
  exchangeDiamondsForGold: exchangeDiamondsForGold,
  diamondPriceForGold: diamondPriceForGold,
  GOLD_PER_DIAMOND: GOLD_PER_DIAMOND,
  addFires: function(n, reason){ grantPower('fire', n, reason||''); },
  addBubbles: function(n, reason){ grantPower('bubble', n, reason||''); },
  addWinds: function(n, reason){ grantPower('wind', n, reason||''); },
  addEnergy: function(n, reason){ grantPower('fire', n, reason||''); },
  addSaws: function(n, reason){ grantPower('wind', n, reason||''); },
  spendPower: spendPower,
  applyHeartRegen: applyHeartRegen,
  heartRegenRemainingMs: heartRegenRemainingMs,
  regenHeartsLeftToday: regenHeartsLeftToday,
  grantDailyQuestHearts: grantDailyQuestHearts,
  dailyQuestHeartsLeft: dailyQuestHeartsLeft,
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
  MAX_HEARTS: MAX_HEARTS,
  HEART_REGEN_MS: HEART_REGEN_MS,
  MAX_REGEN_HEARTS_PER_DAY: MAX_REGEN_HEARTS_PER_DAY,
  MAX_DAILY_QUEST_HEARTS: MAX_DAILY_QUEST_HEARTS,
  MAX_HEART_GIFT_PEOPLE: MAX_HEART_GIFT_PEOPLE
};
try{ window.GOLD_PER_DIAMOND = GOLD_PER_DIAMOND; }catch(e){}
