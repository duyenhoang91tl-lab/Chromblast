/* ══════════════════════════════════════════
   Thẻ trò chơi — tab "Hành trình" (#gpcard-rewards).
   Mỗi mốc = 1 map ẩn trong UNLOCK_STAGE_ORDER (js/progression.js) — mốc N mở
   khi unlockGateStageIndex >= N (đã đi qua N map ẩn). Không tính lại tiến trình
   map ẩn ở đây, chỉ đọc unlockGateStageIndex đã có sẵn.
   2 nhánh thưởng mỗi mốc: Bản miễn phí (luôn nhận được khi đủ mốc) và Bản nâng
   cấp (cần sở hữu Thẻ trò chơi nâng cấp — hiện CHƯA có gói mua thật nào gắn với
   việc này, nút "Nâng cấp" mở Shop giống nút ở header, không giả lập mở khoá).
   Thưởng dùng đúng hệ thống có sẵn: grantGold/grantDiamonds/grantHearts/
   grantPower (js/inventory.js) + addPlayerXP (js/progression.js).
   Trạng thái đã nhận lưu riêng trong localStorage (không đụng inventory/save
   chính) — key GPCARD_JOURNEY_KEY.
   Khung sườn (#gpcard-panel, mở/đóng, chuyển tab) do js/gpcard.js quản lý — file
   này chỉ đổ nội dung vào đúng #gpcard-rewards đã có sẵn.
   Nạp SAU js/progression.js + js/inventory.js.
══════════════════════════════════════════ */

const GPCARD_JOURNEY_KEY = 'chromablast_journey_claims_v1';

function _gpcardJourneyTierCount(){
  return (typeof UNLOCK_STAGE_ORDER !== 'undefined' && UNLOCK_STAGE_ORDER.length) ? UNLOCK_STAGE_ORDER.length : 21;
}
function _gpcardJourneyReached(){
  return (typeof unlockGateStageIndex === 'number') ? unlockGateStageIndex : 0;
}
function _gpcardJourneyHasPremium(){
  try{ return !!(typeof hasGamePassPremium === 'function' && hasGamePassPremium()); }catch(e){ return false; }
}

function _gpcardJourneyLoadState(){
  let st = null;
  try{ st = JSON.parse(localStorage.getItem(GPCARD_JOURNEY_KEY) || 'null'); }catch(e){ st = null; }
  if(!st || typeof st !== 'object') st = {};
  if(!Array.isArray(st.free)) st.free = [];
  if(!Array.isArray(st.premium)) st.premium = [];
  return st;
}
function _gpcardJourneySaveState(st){
  try{ localStorage.setItem(GPCARD_JOURNEY_KEY, JSON.stringify(st)); }catch(e){}
}

/** Thưởng theo mốc — xen kẽ vàng/kim cương/tim/vật phẩm/XP cho đa dạng, tăng dần
 * theo mốc, mốc chẵn 5 (5/10/15/20) là mốc lớn + mốc cuối cùng thưởng đậm nhất.
 * Trả về 1 object hoặc mảng object { type, amount, power?, icon }. */
function _gpcardJourneyRewardFor(tierNum, track, totalTiers){
  const big = (tierNum % 5 === 0);
  const last = (tierNum === totalTiers);
  const cyclePos = (tierNum - 1) % 4;
  const powerKinds = ['fire', 'bubble', 'wind'];
  const pw = powerKinds[tierNum % powerKinds.length];

  if(track === 'free'){
    if(last) return [
      { type:'diamond', amount: 20, icon:'💎' },
      { type:'gold', amount: 300, icon:'🪙' }
    ];
    if(big) return { type:'diamond', amount: 4 + Math.floor(tierNum / 5) * 2, icon:'💎' };
    const cycle = [
      { type:'gold', amount: 30 + tierNum * 4, icon:'🪙' },
      { type:'hearts', amount: 1, icon:'❤️' },
      { type:'power', power: pw, amount: 1, icon:'✨' },
      { type:'xp', amount: 15 + tierNum * 2, icon:'⭐' }
    ];
    return cycle[cyclePos];
  }

  // premium — luôn nhỉnh hơn bản miễn phí cùng mốc
  if(last) return [
    { type:'diamond', amount: 60, icon:'💎' },
    { type:'gold', amount: 800, icon:'🪙' },
    { type:'hearts', amount: 3, icon:'❤️' }
  ];
  if(big) return [
    { type:'diamond', amount: 12 + Math.floor(tierNum / 5) * 4, icon:'💎' },
    { type:'gold', amount: 150 + tierNum * 8, icon:'🪙' }
  ];
  const cycleP = [
    { type:'gold', amount: 100 + tierNum * 10, icon:'🪙' },
    { type:'hearts', amount: 2, icon:'❤️' },
    { type:'power', power: pw, amount: 2, icon:'✨' },
    { type:'diamond', amount: 3 + Math.floor(tierNum / 3), icon:'💎' }
  ];
  return cycleP[cyclePos];
}

function _gpcardJourneyRewardLabel(rw){
  if(rw.type === 'gold') return rw.icon + ' x' + rw.amount;
  if(rw.type === 'diamond') return rw.icon + ' x' + rw.amount;
  if(rw.type === 'hearts') return rw.icon + ' x' + rw.amount;
  if(rw.type === 'xp') return '⭐ ' + rw.amount + ' XP';
  if(rw.type === 'power') return rw.icon + ' x' + rw.amount;
  return rw.icon || '🎁';
}
/** Gọi Cloud Function claimGpcardReward cho phần vàng/kim cương/tim — server tự
 * tính lại đúng số tiền (không tin rw client tính), rồi mới cộng cục bộ đúng số
 * server trả về. power/xp trong rw vẫn cộng cục bộ như cũ (không phải tiền tệ). */
async function _gpcardJourneyGrant(rw, tier, track, reason){
  const list = Array.isArray(rw) ? rw : [rw];
  let walletRes = null;
  if(typeof _getOnlineFunctions === 'function'){
    const fns = _getOnlineFunctions();
    if(fns){
      try{
        const res = await fns.httpsCallable('claimGpcardReward')({ kind:'journey', tier, track });
        walletRes = (res && res.data) || null;
      }catch(e){
        // already-exists: đã nhận rồi (vd bấm 2 lần liên tiếp) — coi như xong, không
        // cộng cục bộ nữa để tránh nhân đôi. Lỗi khác (mất mạng...): không cộng gì cả,
        // để người chơi thử lại sau thay vì cộng "chui" không có server xác nhận.
        if(e && e.message === 'Đã nhận thưởng này rồi.') return { ok:true };
        return { ok:false };
      }
    }
  }
  if(!walletRes) return { ok:false };
  try{ if(walletRes.gold > 0 && typeof grantGold === 'function') grantGold(walletRes.gold, reason); }catch(e){}
  try{ if(walletRes.diamonds > 0 && typeof grantDiamonds === 'function') grantDiamonds(walletRes.diamonds, reason); }catch(e){}
  try{ if(walletRes.hearts > 0 && typeof grantHearts === 'function') grantHearts(walletRes.hearts, reason); }catch(e){}
  try{ if(typeof syncWalletFromServer === 'function') await syncWalletFromServer(); }catch(e){}
  list.forEach(r=>{
    try{
      if(r.type === 'power' && typeof grantPower === 'function') grantPower(r.power, r.amount, reason);
      else if(r.type === 'xp' && typeof addPlayerXP === 'function') addPlayerXP(r.amount);
    }catch(e){}
  });
  return { ok:true };
}

function _gpcardJourneySlotHtml(tierNum, track, rw, reached, claimedList){
  const claimed = claimedList.indexOf(tierNum) >= 0;
  const locked = track === 'premium' ? !_gpcardJourneyHasPremium() : false;
  const ready = (reached >= tierNum) && !claimed && !locked;
  const rewardArr = Array.isArray(rw) ? rw : [rw];
  const itemsHtml = rewardArr.map(r =>
    '<div class="gpcard-jr-item">' + r.icon + '<b>x' + (r.amount) + '</b></div>'
  ).join('');
  let badge = '';
  if(claimed) badge = '<span class="gpcard-jr-badge done">✓</span>';
  else if(locked) badge = '<span class="gpcard-jr-badge lock">🔒</span>';
  else if(reached < tierNum) badge = '<span class="gpcard-jr-badge lock">🔒</span>';
  return '<button type="button" class="gpcard-jr-slot ' + track
    + (ready ? ' ready' : '') + (claimed ? ' claimed' : '') + (locked && reached >= tierNum ? ' need-premium' : '')
    + '" data-gpcard-jr-slot data-tier="' + tierNum + '" data-track="' + track + '"' + (ready ? '' : ' disabled') + '>'
    + badge + '<div class="gpcard-jr-items">' + itemsHtml + '</div>'
    + '</button>';
}

function renderGpcardRewards(){
  const root = document.getElementById('gpcard-rewards');
  if(!root) return;

  const total = _gpcardJourneyTierCount();
  const reached = _gpcardJourneyReached();
  const st = _gpcardJourneyLoadState();
  const hasPremium = _gpcardJourneyHasPremium();

  let rowsHtml = '';
  for(let i = 1; i <= total; i++){
    const freeRw = _gpcardJourneyRewardFor(i, 'free', total);
    const premRw = _gpcardJourneyRewardFor(i, 'premium', total);
    rowsHtml +=
      '<div class="gpcard-jr-row' + (i === total ? ' final' : '') + '">'
        + _gpcardJourneySlotHtml(i, 'free', freeRw, reached, st.free)
        + '<div class="gpcard-jr-node' + (reached >= i ? ' passed' : '') + '">' + i + '</div>'
        + _gpcardJourneySlotHtml(i, 'premium', premRw, reached, st.premium)
      + '</div>';
  }

  const claimableCount =
    Array.from({length: total}, (_, k) => k + 1)
      .filter(i => reached >= i && st.free.indexOf(i) < 0).length
    + (hasPremium ? Array.from({length: total}, (_, k) => k + 1)
      .filter(i => reached >= i && st.premium.indexOf(i) < 0).length : 0);

  root.innerHTML =
    '<div class="gpcard-card gpcard-jr-status">'
      + (typeof t === 'function' ? t('gpcardJourneyStatus') : 'Đã qua') + ' <b>' + reached + '/' + total + '</b> '
      + (typeof t === 'function' ? t('gpcardJourneyStatusEnd') : 'map ẩn')
    + '</div>'
    + '<div class="gpcard-card gpcard-jr-card">'
      + '<div class="gpcard-jr-head">'
        + '<div class="gpcard-jr-head-col free">🎫 ' + (typeof t === 'function' ? t('gpcardJourneyFree') : 'Bản miễn phí') + '</div>'
        + '<div class="gpcard-jr-head-col premium">👑 ' + (typeof t === 'function' ? t('gpcardJourneyPremium') : 'Bản nâng cấp') + '</div>'
      + '</div>'
      + '<div class="gpcard-jr-ladder">' + rowsHtml + '</div>'
    + '</div>'
    + '<div class="gpcard-jr-claimall-wrap">'
      + '<button type="button" class="gpcard-jr-claimall-btn" id="gpcard-jr-claimall"' + (claimableCount > 0 ? '' : ' disabled') + '>'
        + (typeof t === 'function' ? t('gpcardJourneyClaimAll') : 'Nhận đồng loạt') + (claimableCount > 0 ? ' (' + claimableCount + ')' : '')
      + '</button>'
    + '</div>';

  root.querySelectorAll('[data-gpcard-jr-slot]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.disabled) return;
      const tier = parseInt(btn.dataset.tier, 10);
      const track = btn.dataset.track;
      _gpcardJourneyClaimOne(tier, track);
    });
  });
  document.getElementById('gpcard-jr-claimall')?.addEventListener('click', ()=>{
    _gpcardJourneyClaimAll();
  });
}

async function _gpcardJourneyClaimOne(tier, track){
  const total = _gpcardJourneyTierCount();
  const reached = _gpcardJourneyReached();
  if(reached < tier) return;
  if(track === 'premium' && !_gpcardJourneyHasPremium()){
    try{ if(typeof closeGpcardPanel === 'function'){} }catch(e){}
    try{ if(typeof openShop === 'function') openShop(); }catch(e){}
    return;
  }
  const st = _gpcardJourneyLoadState();
  const list = track === 'premium' ? st.premium : st.free;
  if(list.indexOf(tier) >= 0) return;
  const rw = _gpcardJourneyRewardFor(tier, track, total);
  try{ sfxClick(); }catch(e){}
  const res = await _gpcardJourneyGrant(rw, tier, track, (typeof t === 'function' ? t('gpcardTabRewards') : 'Hành trình') + ' #' + tier);
  if(!res.ok) return;
  list.push(tier);
  _gpcardJourneySaveState(st);
  try{ if(typeof sfxUnlock === 'function') sfxUnlock(); }catch(e){}
  renderGpcardRewards();
}

async function _gpcardJourneyClaimAll(){
  const total = _gpcardJourneyTierCount();
  const reached = _gpcardJourneyReached();
  const hasPremium = _gpcardJourneyHasPremium();
  const st = _gpcardJourneyLoadState();
  let any = false;
  for(let i = 1; i <= reached && i <= total; i++){
    if(st.free.indexOf(i) < 0){
      const res = await _gpcardJourneyGrant(_gpcardJourneyRewardFor(i, 'free', total), i, 'free', (typeof t === 'function' ? t('gpcardTabRewards') : 'Hành trình') + ' #' + i);
      if(res.ok){ st.free.push(i); any = true; }
    }
    if(hasPremium && st.premium.indexOf(i) < 0){
      const res = await _gpcardJourneyGrant(_gpcardJourneyRewardFor(i, 'premium', total), i, 'premium', (typeof t === 'function' ? t('gpcardTabRewards') : 'Hành trình') + ' #' + i);
      if(res.ok){ st.premium.push(i); any = true; }
    }
  }
  if(any){
    _gpcardJourneySaveState(st);
    try{ sfxClick(); if(typeof sfxUnlock === 'function') sfxUnlock(); }catch(e){}
  }
  renderGpcardRewards();
}

// Trước đây là tab "Hành trình" trong Thẻ trò chơi, giờ tách thành màn hình
// riêng vào thẳng từ menu chính (set-btn-journey) — dùng lại nguyên nội dung/
// dữ liệu, chỉ đổi nơi mở.
function openGpcardRewardsScreen(){
  try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
  renderGpcardRewards();
  document.getElementById('gpcard-rewards-screen')?.classList.add('show');
}
function closeGpcardRewardsScreen(){
  document.getElementById('gpcard-rewards-screen')?.classList.remove('show');
}
(function bindGpcardRewardsScreen(){
  function bind(){
    document.getElementById('set-btn-journey')?.addEventListener('click', ()=>{
      document.getElementById('settings-panel')?.classList.remove('show');
      openGpcardRewardsScreen();
    });
    document.getElementById('gpcard-rewards-screen-back')?.addEventListener('click', ()=>{
      try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
      closeGpcardRewardsScreen();
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
