// ═══════════════════════════════════════════════════════════════
// js/loot-crates.js — Hệ thống rương (menu chính → "Rương bảo vật").
// 10 loại rương: 4 rương tiền tệ (Gỗ/Bạc/Vàng/Kim cương) + 6 rương vật phẩm
// (Bong bóng chat/Kỹ năng/Gạch/Map/Hiệu ứng tên/Bạch Kim) — mỗi rương vật
// phẩm random 1 món CHƯA SỞ HỮU trong đúng kho có sẵn (brick-skins.js/
// map-boards.js/chat-bubble-skins.js/name-effect-skins.js/inventory.js
// POWER_INFO), không tạo vật phẩm mới ngoài các hệ đã có. Rương Bạch Kim
// (item-any) là "đại thưởng" — random 1 món từ BẤT KỲ trong 5 kho vật phẩm
// trên, giá cao nhất.
// Trừ Rương Gỗ/Bạc, tất cả bán bằng kim cương. Không còn lượt mở miễn phí.
// Nạp SAU inventory.js, brick-skins.js, map-boards.js, chat-bubble-skins.js,
// name-effect-skins.js.
// ═══════════════════════════════════════════════════════════════

const LOOT_CRATES = [
  { id:'wood',    name:'Rương Gỗ',        icon:'🪵', tint:'#8a5a30', price:5,  priceType:'gold',    freeDaily:false, kind:'currency-gold',    min:8,  max:20  },
  { id:'silver',  name:'Rương Bạc',       icon:'📦', tint:'#c9ced6', price:25, priceType:'gold',    freeDaily:false, kind:'currency-gold',    min:15, max:40  },
  { id:'gold',    name:'Rương Vàng',      icon:'🎁', tint:'#ffd54a', price:8,  priceType:'diamond', freeDaily:false, kind:'currency-gold',    min:60, max:150 },
  { id:'diamond', name:'Rương Kim Cương', icon:'💎', tint:'#7ee8fa', price:20, priceType:'diamond', freeDaily:false, kind:'currency-diamond', min:2,  max:8   },
  { id:'bubble',  name:'Rương Bong Bóng', icon:'💬', tint:'#8ecae6', price:15, priceType:'diamond', freeDaily:false, kind:'item-bubble' },
  { id:'skill',   name:'Rương Kỹ Năng',   icon:'⚡', tint:'#ffb703', price:10, priceType:'diamond', freeDaily:false, kind:'item-skill'  },
  { id:'brick',   name:'Rương Gạch',      icon:'🧱', tint:'#e2725b', price:12, priceType:'diamond', freeDaily:false, kind:'item-brick'  },
  { id:'map',     name:'Rương Map',       icon:'🗺️', tint:'#8fd694', price:12, priceType:'diamond', freeDaily:false, kind:'item-map'    },
  { id:'effect',  name:'Rương Hiệu Ứng',  icon:'✨', tint:'#e0aaff', price:15, priceType:'diamond', freeDaily:false, kind:'item-effect' },
  // "Đại thưởng" — random 1 món CHƯA SỞ HỮU trong BẤT KỲ kho vật phẩm nào (gạch/
  // map/bong bóng/hiệu ứng) hoặc thẻ kỹ năng — KHÔNG phải rương tiền tệ nên cấp
  // cục bộ an toàn (giống 5 rương vật phẩm ở trên). Giá cao nhất trong 10 rương.
  { id:'platinum', name:'Rương Bạch Kim', icon:'👑', tint:'#e6e6f5', price:40, priceType:'diamond', freeDaily:false, kind:'item-any' },
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

/** Mọi lần trừ tiền RƯƠNG VẬT PHẨM (không phải tiền tệ) đều qua Cloud Function
 *  spendCurrency — server tự kiểm tra số dư thật, không tin client. Rương
 *  tiền tệ (Bạc/Vàng/Kim cương) KHÔNG dùng hàm này nữa — xem openLootCrate,
 *  chúng gọi thẳng openCurrencyCrate (functions/index.js), server tự trừ +
 *  random + cộng thưởng trong CÙNG 1 transaction, đóng hoàn toàn lỗ hổng
 *  "trừ qua server rồi cộng thưởng cục bộ, bị đồng bộ ghi đè mất". */
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

/** Rương tiền tệ (Bạc/Vàng/Kim cương) — gọi thẳng Cloud Function
 *  openCurrencyCrate: trừ giá + random + cộng thưởng trong 1 transaction duy
 *  nhất ở server, không còn bước cộng cục bộ nào — sync ví ngay sau đó là đủ
 *  để hiển thị đúng, không có gì để "mất". */
async function _openCurrencyCrateServer(id, useFree){
  if(typeof _getOnlineFunctions !== 'function') return { ok:false, reason:'offline' };
  const fns = _getOnlineFunctions();
  if(!fns) return { ok:false, reason:'offline' };
  try{
    const res = await fns.httpsCallable('openCurrencyCrate')({ crateId:id, useFree:!!useFree });
    return { ok:true, data: res.data };
  }catch(e){
    return { ok:false, reason: (e && e.code) || 'error' };
  }
}

/** Random đúng phần thưởng VẬT PHẨM (không phải tiền tệ) cho 1 rương, KHÔNG
 *  thu tiền — dùng lại cho cả nút mở tay (openLootCrate) lẫn quà cấp thẳng
 *  (Hành trình/mốc điểm danh dài ngày, xem grantItemCrate). Rương "đại thưởng"
 *  item-any (Bạch Kim) tự chọn ngẫu nhiên 1 kind item-* rồi đệ quy vào đây. */
function _rollItemCrateReward(crate){
  if(crate.kind === 'item-any'){
    const kinds = ['item-brick', 'item-map', 'item-bubble', 'item-effect', 'item-skill'];
    const pick = kinds[Math.floor(Math.random() * kinds.length)];
    return _rollItemCrateReward(Object.assign({}, crate, { kind: pick }));
  }
  const reasonText = crate.name;
  if(crate.kind === 'item-brick'){
    const skin = typeof BRICK_SKINS !== 'undefined' ? _pickUnownedSkin(BRICK_SKINS, isBrickSkinUnlocked) : null;
    if(skin){ unlockBrickSkin(skin.id); return { type:'brick', id:skin.id, label:'🧱 ' + skin.name }; }
    if(typeof grantGold === 'function') grantGold(30, reasonText);
    return { type:'gold', amount:30, label:'🪙 +30 (đã đủ gạch)' };
  }
  if(crate.kind === 'item-map'){
    const skin = typeof BOARD_SKINS !== 'undefined' ? _pickUnownedSkin(BOARD_SKINS, isBoardSkinUnlocked) : null;
    if(skin){ unlockBoardSkin(skin.id); return { type:'map', id:skin.id, label:'🗺️ ' + skin.name }; }
    if(typeof grantGold === 'function') grantGold(30, reasonText);
    return { type:'gold', amount:30, label:'🪙 +30 (đã đủ map)' };
  }
  if(crate.kind === 'item-bubble'){
    const skin = typeof CHAT_BUBBLE_SKINS !== 'undefined' ? _pickUnownedSkin(CHAT_BUBBLE_SKINS, isBubbleSkinUnlocked) : null;
    if(skin){ unlockBubbleSkin(skin.id); return { type:'bubble', id:skin.id, label:'💬 ' + skin.name }; }
    if(typeof grantDiamonds === 'function') grantDiamonds(3, reasonText);
    return { type:'diamond', amount:3, label:'💎 +3 (đã đủ bong bóng)' };
  }
  if(crate.kind === 'item-effect'){
    const skin = typeof NAME_EFFECT_SKINS !== 'undefined' ? _pickUnownedSkin(NAME_EFFECT_SKINS, isNameFxUnlocked) : null;
    if(skin){ unlockNameFx(skin.id); return { type:'effect', id:skin.id, label:'✨ ' + skin.name }; }
    if(typeof grantDiamonds === 'function') grantDiamonds(3, reasonText);
    return { type:'diamond', amount:3, label:'💎 +3 (đã đủ hiệu ứng)' };
  }
  if(crate.kind === 'item-skill'){
    const types = ['fire', 'bubble', 'wind'];
    const type = types[Math.floor(Math.random() * types.length)];
    const n = _randInt(2, 5);
    if(typeof grantSkillCharge === 'function') grantSkillCharge(type, n, reasonText);
    const icon = type === 'fire' ? '🔥' : (type === 'bubble' ? '🫧' : '💨');
    return { type:'skill', skillType:type, amount:n, label:icon + ' +' + n };
  }
  return null;
}

/** Cấp THẲNG 1 rương VẬT PHẨM (không phải tiền tệ) — không thu tiền. Dùng cho
 *  quà mốc Hành trình / mốc điểm danh dài ngày (7/14/21/30). KHÔNG dùng được
 *  cho rương tiền tệ (Gỗ/Bạc/Vàng/Kim Cương) — 4 rương đó bắt buộc qua Cloud
 *  Function openCurrencyCrate để tránh lỗ hổng cộng cục bộ, và hàm đó hiện chỉ
 *  có chế độ "mua", không có chế độ "cấp thẳng miễn phí" an toàn.
 *  Trả về { ok, reward } hoặc { ok:false, reason }. */
function grantItemCrate(id, reasonText){
  const crate = getCrate(id);
  if(!crate) return { ok:false, reason:'not-found' };
  if(crate.kind === 'currency-gold' || crate.kind === 'currency-diamond'){
    return { ok:false, reason:'currency-crate-needs-server' };
  }
  const reward = _rollItemCrateReward(reasonText ? Object.assign({}, crate, { name: reasonText }) : crate);
  try{ if(typeof logGameEvent === 'function') logGameEvent('crate_grant', { crate_id:id, reward_type: reward && reward.type }); }catch(e){}
  return { ok:true, reward };
}

/** Mở rương — trừ tiền (trừ khi useFree=true, đã kiểm tra hạn mức free ở nơi
 *  gọi), random phần thưởng theo đúng "kind", tự cộng vào đúng kho tương ứng.
 *  Trả về { ok, reward:{label,...} } hoặc { ok:false, reason }. */
async function openLootCrate(id, useFree){
  const crate = getCrate(id);
  if(!crate) return { ok:false, reason:'not-found' };

  const isCurrencyCrate = crate.kind === 'currency-gold' || crate.kind === 'currency-diamond';

  if(isCurrencyCrate){
    if(useFree && !crateFreeAvailable(id)) return { ok:false, reason:'free-used' };
    const res = await _openCurrencyCrateServer(id, useFree);
    if(!res.ok){
      const reason = res.reason === 'failed-precondition' ? (crate.priceType === 'gold' ? 'gold' : 'diamond')
        : res.reason === 'already-exists' ? 'free-used'
        : res.reason;
      return { ok:false, reason };
    }
    try{ if(typeof syncWalletFromServer === 'function') await syncWalletFromServer(); }catch(e){}
    if(useFree) _markCrateFreeUsed(id);
    const data = res.data || {};
    const icon = data.rewardType === 'diamond' ? '💎' : '🪙';
    const reward = { type: data.rewardType, amount: data.rewardAmount, label: icon + ' +' + data.rewardAmount };
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

  const reward = _rollItemCrateReward(crate);

  if(useFree) _markCrateFreeUsed(id);
  try{ if(typeof logGameEvent === 'function') logGameEvent('crate_open', { crate_id:id, free:!!useFree, reward_type: reward && reward.type }); }catch(e){}
  return { ok:true, reward };
}
