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
    { id:'glow',       name:'Chữ sáng nhẹ',          diaPrice: 8  },
    { id:'goldsweep',  name:'Ánh vàng đi qua',        diaPrice: 15 },
    { id:'platinum',   name:'Ánh Bạch Kim đi qua',    diaPrice: 18 },
    { id:'flare',      name:'Tia pháo sáng',          diaPrice: 16 },
    { id:'shatter',    name:'Chữ vỡ ra nhẹ',          diaPrice: 14 },
    { id:'flowers',    name:'Hoa bay ra nhẹ',         diaPrice: 20 },
    { id:'bubbles',    name:'Bong bóng xà phòng bay', diaPrice: 20 },
    { id:'hearts',     name:'Trái tim bay',           diaPrice: 20 },
    { id:'snowflakes', name:'Bông tuyết bay',         diaPrice: 20 }
  ];

  // Hiệu ứng "bay ra theo chữ" — mỗi hạt trang trí neo ở mép cuối (phải) của
  // TỪNG ký tự, không phải 1 cụm ở cuối cả câu.
  const TEXT_FX_PARTICLE = { flowers:'🌸', bubbles:'🫧', hearts:'💗', snowflakes:'❄️' };
  // 'shatter' cũng cần bọc riêng từng ký tự (để lắc/xoay nhẹ so le từng chữ)
  // nhưng KHÔNG thêm hạt trang trí — chỉ 'flowers/bubbles/hearts/snowflakes'
  // mới cần thêm hạt.
  const TEXT_FX_NEEDS_LETTERS = ['flowers','bubbles','hearts','snowflakes','shatter'];

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

  // Hiệu ứng "đơn giản" (glow/goldsweep/platinum/flare) chỉ cần 1 class CSS áp
  // lên span nội dung, không cần bọc riêng ký tự.
  function textFxClass(id){
    if(!id || TEXT_FX_NEEDS_LETTERS.indexOf(id) >= 0) return '';
    return ' text-fx-'+id;
  }
  function textFxNeedsLetters(id){
    return TEXT_FX_NEEDS_LETTERS.indexOf(id) >= 0;
  }
  // Bọc riêng từng ký tự của TEXT GỐC (chưa escape) — hạt trang trí (nếu có)
  // neo ở mép cuối (phải) của từng ký tự, so le animation-delay theo thứ tự.
  // KHÔNG được dùng để thay thế msg.text/dataset.orig — chỉ dùng để RENDER,
  // nơi khác vẫn giữ nguyên văn gốc để dịch/copy.
  function textFxLetterHtml(rawText, id){
    const particle = TEXT_FX_PARTICLE[id] || '';
    const cls = 'text-fx-letter text-fx-letter-'+id;
    return Array.from(String(rawText||'')).map(function(ch, i){
      const escCh = (typeof escapeHtml==='function') ? escapeHtml(ch) : ch;
      const shown = ch===' ' ? '&nbsp;' : escCh;
      const delay = (i*0.12).toFixed(2)+'s';
      const deco = particle
        ? '<span class="text-fx-particle" aria-hidden="true" style="animation-delay:'+delay+'">'+particle+'</span>'
        : '';
      return '<span class="'+cls+'" style="animation-delay:'+delay+'">'+shown+deco+'</span>';
    }).join('');
  }

  g.TEXT_EFFECTS = TEXT_EFFECTS;
  g.isTextEffectOwned = isTextEffectOwned;
  g.equippedTextEffect = equippedTextEffect;
  g.equipTextEffect = equipTextEffect;
  g.buyTextEffect = buyTextEffect;
  g.textFxClass = textFxClass;
  g.textFxNeedsLetters = textFxNeedsLetters;
  g.textFxLetterHtml = textFxLetterHtml;
})(typeof window !== 'undefined' ? window : this);
