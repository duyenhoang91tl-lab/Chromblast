// ═══════════════════════════════════════════════════════════════
// js/loot-crates.js — Hệ thống rương (Thẻ trò chơi → tab "Đổi quà").
// 8 loại rương: 3 rương tiền tệ (Bạc/Vàng/Kim cương) + 5 rương vật phẩm
// (Bong bóng chat/Kỹ năng/Gạch/Map/Hiệu ứng tên) — mỗi rương vật phẩm random
// 1 món CHƯA SỞ HỮU trong đúng kho có sẵn (brick-skins.js/map-boards.js/
// chat-bubble-skins.js/name-effect-skins.js/inventory.js POWER_INFO), không
// tạo vật phẩm mới ngoài các hệ đã có.
// Trừ Rương Bạc, tất cả bán bằng kim cương. Rương Bạc/Vàng/Gạch/Map có thêm
// lượt MỞ MIỄN PHÍ 1 lần/ngày (xem QC) — 4 rương còn lại (Kim cương/Bong
// bóng/Kỹ năng/Hiệu ứng) chỉ mua bằng kim cương, không có lượt free.
// Nạp SAU inventory.js, brick-skins.js, map-boards.js, chat-bubble-skins.js,
// name-effect-skins.js.
// ═══════════════════════════════════════════════════════════════

const LOOT_CRATES = [
  { id:'silver',  name:'Rương Bạc',       icon:'📦', price:25, priceType:'gold',    freeDaily:true,  kind:'currency-gold',    min:15, max:40  },
  { id:'gold',    name:'Rương Vàng',      icon:'🎁', price:8,  priceType:'diamond', freeDaily:true,  kind:'currency-gold',    min:60, max:150 },
  { id:'diamond', name:'Rương Kim Cương', icon:'💎', price:20, priceType:'diamond', freeDaily:false, kind:'currency-diamond', min:2,  max:8   },
  { id:'bubble',  name:'Rương Bong Bóng', icon:'💬', price:15, priceType:'diamond', freeDaily:false, kind:'item-bubble' },
  { id:'skill',   name:'Rương Kỹ Năng',   icon:'⚡', price:10, priceType:'diamond', freeDaily:false, kind:'item-skill'  },
  { id:'brick',   name:'Rương Gạch',      icon:'🧱', price:12, priceType:'diamond', freeDaily:true,  kind:'item-brick'  },
  { id:'map',     name:'Rương Map',       icon:'🗺️', price:12, priceType:'diamond', freeDaily:true,  kind:'item-map'    },
  { id:'effect',  name:'Rương Hiệu Ứng',  icon:'✨', price:15, priceType:'diamond', freeDaily:false, kind:'item-effect' },
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

/** Mọi lần trừ tiền đều qua Cloud Function spendCurrency — server tự kiểm tra
 *  số dư thật, không tin client. Giống hệt cách _gpcardRedeemSpend đang dùng
 *  ở luồng mua skin trực tiếp (nếu còn) — cost: {gold:n} hoặc {diamonds:n}. */
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

/** Mở rương — trừ tiền (trừ khi useFree=true, đã kiểm tra hạn mức free ở nơi
 *  gọi), random phần thưởng theo đúng "kind", tự cộng vào đúng kho tương ứng.
 *  Trả về { ok, reward:{label,...} } hoặc { ok:false, reason }. */
async function openLootCrate(id, useFree){
  const crate = getCrate(id);
  if(!crate) return { ok:false, reason:'not-found' };

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

  // ⚠️ GIỚI HẠN ĐÃ BIẾT: 2 nhánh currency-gold/currency-diamond dưới đây cộng
  // thưởng CỤC BỘ (grantGold/grantDiamonds) — không có Cloud Function "cộng
  // tiền ngẫu nhiên theo rương" nào tồn tại để làm việc này an toàn ở server
  // (khác các nhánh item-* bên dưới, vốn chỉ mở khoá cosmetic cục bộ vẫn ổn
  // vì không có gì để đồng bộ ngược). Hệ quả: lần syncWalletFromServer() kế
  // tiếp (mở rương khác, đăng nhập lại...) sẽ ghi đè inv.gold/diamonds bằng
  // đúng số server đang có — KHÔNG bao gồm phần thưởng cục bộ này — coi như
  // mất. Cần 1 Cloud Function mới (kiểu grantCrateReward, random+cộng thẳng
  // trên server) để đóng nốt lỗ hổng này; ngoài phạm vi việc đang làm.
  if(crate.kind === 'currency-gold'){
    const n = _randInt(crate.min, crate.max);
    if(typeof grantGold === 'function') grantGold(n, reasonText);
    reward = { type:'gold', amount:n, label:'🪙 +' + n };
  } else if(crate.kind === 'currency-diamond'){
    const n = _randInt(crate.min, crate.max);
    if(typeof grantDiamonds === 'function') grantDiamonds(n, reasonText);
    reward = { type:'diamond', amount:n, label:'💎 +' + n };
  } else if(crate.kind === 'item-brick'){
    const skin = typeof BRICK_SKINS !== 'undefined' ? _pickUnownedSkin(BRICK_SKINS, isBrickSkinUnlocked) : null;
    if(skin){
      unlockBrickSkin(skin.id);
      reward = { type:'brick', id:skin.id, label:'🧱 ' + skin.name };
    } else {
      const n = 30; if(typeof grantGold === 'function') grantGold(n, reasonText);
      reward = { type:'gold', amount:n, label:'🪙 +' + n + ' (đã đủ gạch)' };
    }
  } else if(crate.kind === 'item-map'){
    const skin = typeof BOARD_SKINS !== 'undefined' ? _pickUnownedSkin(BOARD_SKINS, isBoardSkinUnlocked) : null;
    if(skin){
      unlockBoardSkin(skin.id);
      reward = { type:'map', id:skin.id, label:'🗺️ ' + skin.name };
    } else {
      const n = 30; if(typeof grantGold === 'function') grantGold(n, reasonText);
      reward = { type:'gold', amount:n, label:'🪙 +' + n + ' (đã đủ map)' };
    }
  } else if(crate.kind === 'item-bubble'){
    const skin = typeof CHAT_BUBBLE_SKINS !== 'undefined' ? _pickUnownedSkin(CHAT_BUBBLE_SKINS, isBubbleSkinUnlocked) : null;
    if(skin){
      unlockBubbleSkin(skin.id);
      reward = { type:'bubble', id:skin.id, label:'💬 ' + skin.name };
    } else {
      const n = 3; if(typeof grantDiamonds === 'function') grantDiamonds(n, reasonText);
      reward = { type:'diamond', amount:n, label:'💎 +' + n + ' (đã đủ bong bóng)' };
    }
  } else if(crate.kind === 'item-effect'){
    const skin = typeof NAME_EFFECT_SKINS !== 'undefined' ? _pickUnownedSkin(NAME_EFFECT_SKINS, isNameFxUnlocked) : null;
    if(skin){
      unlockNameFx(skin.id);
      reward = { type:'effect', id:skin.id, label:'✨ ' + skin.name };
    } else {
      const n = 3; if(typeof grantDiamonds === 'function') grantDiamonds(n, reasonText);
      reward = { type:'diamond', amount:n, label:'💎 +' + n + ' (đã đủ hiệu ứng)' };
    }
  } else if(crate.kind === 'item-skill'){
    const types = ['fire', 'bubble', 'wind'];
    const type = types[Math.floor(Math.random() * types.length)];
    const n = _randInt(2, 5);
    if(typeof grantSkillCharge === 'function') grantSkillCharge(type, n, reasonText);
    const icon = type === 'fire' ? '🔥' : (type === 'bubble' ? '🫧' : '💨');
    reward = { type:'skill', skillType:type, amount:n, label:icon + ' +' + n };
  }

  if(useFree) _markCrateFreeUsed(id);
  try{ if(typeof logGameEvent === 'function') logGameEvent('crate_open', { crate_id:id, free:!!useFree, reward_type: reward && reward.type }); }catch(e){}
  return { ok:true, reward };
}
