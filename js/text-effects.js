// ═══════════════════════════════════════════════════════════════
// js/text-effects.js — Hiệu ứng chữ bán trong Shop (chỉ trả kim cương), áp lên
// NỘI DUNG tin nhắn chat (khác name-effects.js là áp lên TÊN người chơi).
// Cùng kiểu sở hữu-rồi-trang bị (equip) như name-effects.js, không phải kiểu
// "sở hữu rồi chọn lúc dùng" như bong bóng chat.
// Nạp SAU player-profile.js + inventory.js, TRƯỚC economy-shop.js.
// ═══════════════════════════════════════════════════════════════
(function(g){
  "use strict";

  const TEXT_EFFECTS = [
    { id:'glow',      name:'Chữ sáng nhẹ',       diaPrice: 8  },
    { id:'goldsweep', name:'Ánh vàng đi qua',     diaPrice: 15 },
    { id:'platinum',  name:'Ánh Bạch Kim đi qua', diaPrice: 18 },
    { id:'flowers',   name:'Hoa bay ra nhẹ',      diaPrice: 20 }
  ];

  function ownedTextEffectIds(){
    const p = (typeof getPlayerProfile === 'function') ? getPlayerProfile() : {};
    return Array.isArray(p.ownedTextEffects) ? p.ownedTextEffects.slice() : [];
  }

  function isTextEffectOwned(id){
    return ownedTextEffectIds().indexOf(id) >= 0;
  }

  function equippedTextEffect(){
    const p = (typeof getPlayerProfile === 'function') ? getPlayerProfile() : {};
    return p.textEffect || '';
  }

  function equipTextEffect(id){
    if(id && !isTextEffectOwned(id)) return { ok:false, reason:'owned' };
    if(typeof savePlayerProfile === 'function') savePlayerProfile({ textEffect: id || '' });
    return { ok:true };
  }

  async function buyTextEffect(id, diaCost){
    if(isTextEffectOwned(id)) return { ok:false, reason:'owned' };
    if(typeof _getOnlineFunctions !== 'function') return { ok:false, reason:'offline' };
    const fns = _getOnlineFunctions();
    if(!fns) return { ok:false, reason:'offline' };
    try{
      await fns.httpsCallable('spendCurrency')({ cost: { diamonds: diaCost } });
    }catch(e){
      return { ok:false, reason:'diamond' };
    }
    const list = ownedTextEffectIds();
    list.push(id);
    if(typeof savePlayerProfile === 'function') savePlayerProfile({ ownedTextEffects: list });
    try{ if(typeof syncWalletFromServer === 'function') await syncWalletFromServer(); }catch(e){}
    return { ok:true };
  }

  // Hầu hết hiệu ứng chỉ cần 1 class CSS (.text-fx-<id>) áp lên span nội dung
  // tin nhắn. Riêng 'flowers' cần thêm vài span hoa trang trí ĐỨNG CẠNH (không
  // chèn vào) nội dung gốc, để không đụng tới msg.text thật (chỗ khác còn dùng
  // để dịch/copy nguyên văn).
  function textFxClass(id){
    return id ? ' text-fx-'+id : '';
  }
  function textFxDecoHtml(id){
    if(id !== 'flowers') return '';
    return '<span class="text-fx-flower f1">🌸</span>'
      + '<span class="text-fx-flower f2">🌸</span>'
      + '<span class="text-fx-flower f3">🌸</span>';
  }

  g.TEXT_EFFECTS = TEXT_EFFECTS;
  g.isTextEffectOwned = isTextEffectOwned;
  g.equippedTextEffect = equippedTextEffect;
  g.equipTextEffect = equipTextEffect;
  g.buyTextEffect = buyTextEffect;
  g.textFxClass = textFxClass;
  g.textFxDecoHtml = textFxDecoHtml;
})(typeof window !== 'undefined' ? window : this);
