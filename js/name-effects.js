// ═══════════════════════════════════════════════════════════════
// js/name-effects.js — Hiệu ứng tên bán trong Shop (chỉ trả kim cương).
// Khác chat-bubble-skins.js ở chỗ hiệu ứng tên là CHỈ MỘT được trang bị tại
// 1 thời điểm (equip), không phải kiểu "sở hữu rồi chọn lúc dùng" như bong
// bóng chat — nên ngoài sở hữu còn có hàm trang bị/tháo riêng.
// Nạp SAU player-profile.js + inventory.js, TRƯỚC economy-shop.js.
// ═══════════════════════════════════════════════════════════════
(function(g){
  "use strict";

  const NAME_EFFECTS = [
    { id:'blink',    name:'Nhấp nháy',        diaPrice: 6  },
    { id:'glow',     name:'Loé sáng nhẹ',     diaPrice: 8  },
    { id:'runlight', name:'Tia sáng chạy ngang', diaPrice: 10 },
    { id:'wave',     name:'Chạy lượn sóng',   diaPrice: 12 },
    { id:'goldsweep',name:'Tia vàng lướt qua', diaPrice: 15 },
    { id:'platinum', name:'Ánh bạch kim',     diaPrice: 18 }
  ];

  function ownedNameEffectIds(){
    const p = (typeof getPlayerProfile === 'function') ? getPlayerProfile() : {};
    return Array.isArray(p.ownedNameEffects) ? p.ownedNameEffects.slice() : [];
  }

  function isNameEffectOwned(id){
    return ownedNameEffectIds().indexOf(id) >= 0;
  }

  function equippedNameEffect(){
    const p = (typeof getPlayerProfile === 'function') ? getPlayerProfile() : {};
    return p.nameEffect || '';
  }

  function equipNameEffect(id){
    if(id && !isNameEffectOwned(id)) return { ok:false, reason:'owned' };
    if(typeof savePlayerProfile === 'function') savePlayerProfile({ nameEffect: id || '' });
    return { ok:true };
  }

  async function buyNameEffect(id, diaCost){
    if(isNameEffectOwned(id)) return { ok:false, reason:'owned' };
    if(typeof _getOnlineFunctions !== 'function') return { ok:false, reason:'offline' };
    const fns = _getOnlineFunctions();
    if(!fns) return { ok:false, reason:'offline' };
    try{
      await fns.httpsCallable('spendCurrency')({ cost: { diamonds: diaCost } });
    }catch(e){
      return { ok:false, reason:'diamond' };
    }
    const list = ownedNameEffectIds();
    list.push(id);
    if(typeof savePlayerProfile === 'function') savePlayerProfile({ ownedNameEffects: list });
    try{ if(typeof syncWalletFromServer === 'function') await syncWalletFromServer(); }catch(e){}
    return { ok:true };
  }

  g.NAME_EFFECTS = NAME_EFFECTS;
  g.isNameEffectOwned = isNameEffectOwned;
  g.equippedNameEffect = equippedNameEffect;
  g.equipNameEffect = equipNameEffect;
  g.buyNameEffect = buyNameEffect;
})(typeof window !== 'undefined' ? window : this);
