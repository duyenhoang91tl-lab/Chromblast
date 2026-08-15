// ═══════════════════════════════════════════════════════════════
// js/loot-crates.js — Hệ thống rương (Thẻ trò chơi → tab "Đổi quà").
// 7 loại rương: 5 rương BẬC trộn nhiều loại thưởng (Gỗ/Bạc/Vàng/Bạch Kim/Kim
// Cương — vàng/tim/kim cương/gạch/nền/hiệu ứng tên trong CÙNG 1 rương, tỷ lệ
// theo bậc: Gỗ/Bạc/Vàng chỉ ra vàng-tim-gạch/nền RẺ; Bạch Kim/Kim Cương mới
// có cơ hội kim cương + hiệu ứng tên + gạch/nền CAO CẤP) + 2 rương chuyên biệt
// giữ nguyên (Bong Bóng chat/Kỹ Năng — rương Kỹ Năng giờ rút ngẫu nhiên trong
// cả 13 loại kỹ năng đã ổn định ở inventory.js: ALL_SKILL_TYPES).
// "Rẻ" = skin có field price (mua vàng), "cao cấp" = skin có field diaPrice
// (chỉ mua kim cương) — khớp đúng cách phân loại sẵn có ở BOARD_SKINS/
// BRICK_SKINS/NAME_EFFECT_SKINS. Phần vàng/tim/kim cương của rương BẬC luôn
// đi qua Cloud Function openTierCrate (functions/index.js) — trừ giá + random
// + cộng thưởng trong 1 transaction server duy nhất, không có bước cộng cục
// bộ nào để "mất" khi đồng bộ lại ví.
// Nạp SAU inventory.js, brick-skins.js, map-boards.js, chat-bubble-skins.js,
// name-effect-skins.js.
// ═══════════════════════════════════════════════════════════════

const LOOT_CRATES = [
  { id:'wood',     name:'Rương Gỗ',        icon:'🪵', tint:'#b98a5c', price:10, priceType:'gold',    freeDaily:true,  kind:'tier' },
  { id:'silver',   name:'Rương Bạc',       icon:'📦', tint:'#c9ced6', price:25, priceType:'gold',    freeDaily:true,  kind:'tier' },
  { id:'gold',     name:'Rương Vàng',      icon:'🎁', tint:'#ffd54a', price:8,  priceType:'diamond', freeDaily:true,  kind:'tier' },
  { id:'platinum', name:'Rương Bạch Kim',  icon:'🏆', tint:'#d7e6ee', price:15, priceType:'diamond', freeDaily:false, kind:'tier' },
  { id:'diamond',  name:'Rương Kim Cương', icon:'💎', tint:'#7ee8fa', price:20, priceType:'diamond', freeDaily:false, kind:'tier' },
  { id:'bubble',   name:'Rương Bong Bóng', icon:'💬', tint:'#8ecae6', price:15, priceType:'diamond', freeDaily:false, kind:'item-bubble' },
  { id:'skill',    name:'Rương Kỹ Năng',   icon:'⚡', tint:'#ffb703', price:10, priceType:'diamond', freeDaily:false, kind:'item-skill'  },
];

function getCrate(id){ return LOOT_CRATES.find(c => c.id === id); }

function _crateFreeKey(id){ return 'chromablast_crate_free_' + id; }
function crateFreeAvailable(id){
  const crate = getCrate(id);
  if(!crate || !crate.freeDaily) return false;
  try{ return safeGet(_crateFreeKey(id)) !== todayStr(); }catch(e){ return false; }
}
function _markCrateFreeUsed(id){
  try{ safeSet(_crateFreeKey(id), todayStr()); }catch(e){}
}

function _randInt(min, max){ return min + Math.floor(Math.random() * (max - min + 1)); }

/** Chọn ngẫu nhiên 1 id CHƯA sở hữu trong 1 danh sách skin (brick/map/bubble/
 *  hiệu ứng) — trả về null nếu đã sở hữu hết (mở rương lúc đó quy đổi ra vàng
 *  để không "mất trắng"). */
function _pickUnownedSkin(list, isUnlockedFn){
  const pool = list.filter(s => !s.starter && !isUnlockedFn(s.id));
  if(!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Như trên, nhưng lọc thêm theo bậc giá: wantExpensive=true → chỉ skin có
 *  diaPrice (cao cấp), false → chỉ skin có price (rẻ, mua vàng). */
function _pickUnownedSkinByTier(list, isUnlockedFn, wantExpensive){
  const pool = list.filter(s => !s.starter && !isUnlockedFn(s.id) &&
    (wantExpensive ? (s.diaPrice > 0) : (s.price > 0)));
  if(!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Mọi lần trừ tiền RƯƠNG VẬT PHẨM (không phải tiền tệ) đều qua Cloud Function
 *  spendCurrency — server tự kiểm tra số dư thật, không tin client. Rương
 *  BẬC (Gỗ/Bạc/Vàng/Bạch Kim/Kim cương) KHÔNG dùng hàm này — xem openLootCrate,
 *  chúng gọi thẳng openTierCrate (functions/index.js), server tự trừ + random
 *  + cộng thưởng (phần tiền tệ) trong CÙNG 1 transaction, đóng hoàn toàn lỗ
 *  hổng "trừ qua server rồi cộng thưởng cục bộ, bị đồng bộ ghi đè mất". */
async function _crateSpend(cost){
  if(typeof _getOnlineFunctions !== 'function') return { ok:false, reason:'offline' };
  const fns = _getOnlineFunctions();
  if(!fns) return { ok:false, reason:'offline' };
  try{
    await fns.httpsCallable('spendCurrency')({ cost });
    return { ok:true };
  }catch(e){
    return { ok:false, reason: (e && e.code) || 'error' };
  }
}

/** Rương BẬC (Gỗ/Bạc/Vàng/Bạch Kim/Kim cương) — gọi thẳng Cloud Function
 *  openTierCrate: trừ giá + random loại thưởng (theo tỷ lệ từng bậc) + cộng
 *  thưởng phần tiền tệ trong 1 transaction duy nhất ở server. Trả về
 *  { category, amount } — category là 1 trong: gold/diamonds/hearts (đã cộng
 *  ví rồi, chỉ cần hiển thị) hoặc *-cheap/*-expensive (cosmetic, client tự
 *  chọn skin bên dưới). */
async function _openTierCrateServer(id, useFree){
  if(typeof _getOnlineFunctions !== 'function') return { ok:false, reason:'offline' };
  const fns = _getOnlineFunctions();
  if(!fns) return { ok:false, reason:'offline' };
  try{
    const res = await fns.httpsCallable('openTierCrate')({ crateId:id, useFree:!!useFree });
    return { ok:true, data: res.data };
  }catch(e){
    return { ok:false, reason: (e && e.code) || 'error' };
  }
}

/** Mở rương — trừ tiền (trừ khi useFree=true, đã kiểm tra hạn mức free ở nơi
 *  gọi), random phần thưởng theo đúng "kind", tự cộng vào đúng kho tương ứng.
 *  Trả về { ok, reward:{label,...} } hoặc { ok:false, reason }. */
async function openLootCrate(id, useFree){
  const crate = getCrate(id);
  if(!crate) return { ok:false, reason:'not-found' };

  if(crate.kind === 'tier'){
    if(useFree && !crateFreeAvailable(id)) return { ok:false, reason:'free-used' };
    const res = await _openTierCrateServer(id, useFree);
    if(!res.ok){
      const reason = res.reason === 'failed-precondition' ? (crate.priceType === 'gold' ? 'gold' : 'diamond')
        : res.reason === 'already-exists' ? 'free-used'
        : res.reason;
      return { ok:false, reason };
    }
    try{ if(typeof syncWalletFromServer === 'function') await syncWalletFromServer(); }catch(e){}
    if(useFree) _markCrateFreeUsed(id);

    const data = res.data || {};
    const cat = data.category;
    let reward;
    if(cat === 'gold') reward = { type:'gold', amount:data.amount, label:'🪙 +' + data.amount };
    else if(cat === 'diamonds') reward = { type:'diamond', amount:data.amount, label:'💎 +' + data.amount };
    else if(cat === 'hearts') reward = { type:'hearts', amount:data.amount, label:'❤️ +' + data.amount };
    else {
      // Cosmetic — server chỉ quyết định LOẠI (category), client tự chọn 1
      // skin CHƯA sở hữu trong đúng kho + đúng bậc rồi mở khoá cục bộ (cosmetic
      // trong app này luôn lưu cục bộ, không đồng bộ server — xem player-profile.js).
      const wantExpensive = /-expensive$/.test(cat);
      let skin = null, unlockFn = null, icon = '', kindLabel = '';
      if(cat.indexOf('brick') === 0){
        skin = typeof BRICK_SKINS !== 'undefined' ? _pickUnownedSkinByTier(BRICK_SKINS, isBrickSkinUnlocked, wantExpensive) : null;
        unlockFn = unlockBrickSkin; icon = '🧱'; kindLabel = 'brick';
      } else if(cat.indexOf('board') === 0){
        skin = typeof BOARD_SKINS !== 'undefined' ? _pickUnownedSkinByTier(BOARD_SKINS, isBoardSkinUnlocked, wantExpensive) : null;
        unlockFn = unlockBoardSkin; icon = '🗺️'; kindLabel = 'board';
      } else if(cat.indexOf('nameeffect') === 0){
        skin = typeof NAME_EFFECT_SKINS !== 'undefined' ? _pickUnownedSkinByTier(NAME_EFFECT_SKINS, isNameFxUnlocked, wantExpensive) : null;
        unlockFn = unlockNameFx; icon = '✨'; kindLabel = 'effect';
      }
      if(skin){
        unlockFn(skin.id);
        reward = { type:kindLabel, id:skin.id, label:icon + ' ' + skin.name };
      } else {
        // Đã sở hữu hết đúng bậc đó (hoặc kho rỗng) — quy đổi ra vàng để
        // không "mở trúng mà không nhận được gì".
        const n = wantExpensive ? 40 : 15;
        if(typeof grantGold === 'function') grantGold(n, crate.name);
        reward = { type:'gold', amount:n, label:'🪙 +' + n + ' (đã đủ vật phẩm loại này)' };
      }
    }
    try{ if(typeof logGameEvent === 'function') logGameEvent('crate_open', { crate_id:id, free:!!useFree, reward_type: reward.type }); }catch(e){}
    return { ok:true, reward };
  }

  if(useFree){
    if(!crateFreeAvailable(id)) return { ok:false, reason:'free-used' };
  } else {
    const cost = crate.priceType === 'gold' ? { gold: crate.price } : { diamonds: crate.price };
    const spend = await _crateSpend(cost);
    if(!spend.ok) return { ok:false, reason: spend.reason === 'failed-precondition' ? (crate.priceType === 'gold' ? 'gold' : 'diamond') : spend.reason };
    try{ if(typeof syncWalletFromServer === 'function') await syncWalletFromServer(); }catch(e){}
  }

  let reward = null;
  const reasonText = crate.name;

  if(crate.kind === 'item-bubble'){
    const skin = typeof CHAT_BUBBLE_SKINS !== 'undefined' ? _pickUnownedSkin(CHAT_BUBBLE_SKINS, isBubbleSkinUnlocked) : null;
    if(skin){
      unlockBubbleSkin(skin.id);
      reward = { type:'bubble', id:skin.id, label:'💬 ' + skin.name };
    } else {
      const n = 3; if(typeof grantDiamonds === 'function') grantDiamonds(n, reasonText);
      reward = { type:'diamond', amount:n, label:'💎 +' + n + ' (đã đủ bong bóng)' };
    }
  } else if(crate.kind === 'item-skill'){
    // Rút ngẫu nhiên trong cả 13 loại kỹ năng đã ổn định (ALL_SKILL_TYPES —
    // xem js/inventory.js), không còn giới hạn 3 loại lửa/bong bóng/gió cũ.
    const types = (typeof ALL_SKILL_TYPES !== 'undefined') ? ALL_SKILL_TYPES : ['fire', 'bubble', 'wind'];
    const type = types[Math.floor(Math.random() * types.length)];
    const n = _randInt(2, 5);
    if(typeof grantSkillCharge === 'function') grantSkillCharge(type, n, reasonText);
    const icon = (typeof POWER_INFO !== 'undefined' && POWER_INFO[type]) ? POWER_INFO[type].icon : '⚡';
    reward = { type:'skill', skillType:type, amount:n, label:icon + ' +' + n };
  }

  if(useFree) _markCrateFreeUsed(id);
  try{ if(typeof logGameEvent === 'function') logGameEvent('crate_open', { crate_id:id, free:!!useFree, reward_type: reward && reward.type }); }catch(e){}
  return { ok:true, reward };
}
