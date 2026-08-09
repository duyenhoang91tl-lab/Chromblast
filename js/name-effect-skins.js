// ═══════════════════════════════════════════════════════════════
// js/name-effect-skins.js — hiệu ứng tên hiển thị (màu/glow), MUA/MỞ RƯƠNG
// riêng, KHÔNG liên quan .rank-fx-* (hiệu ứng theo bậc rank Caro/Versus,
// tự động theo hạng, không mua được — xem css/main.css, player-profile.js).
// Đây là 1 lớp cosmetic độc lập, áp bằng data-name-fx="<id>" trên phần tử
// hiển thị tên. Dùng chung kho "unlockedNameFx" trên hồ sơ người chơi.
// Nạp SAU player-profile.js + inventory.js.
// ═══════════════════════════════════════════════════════════════
(function(g){
  "use strict";

  const NAME_EFFECT_SKINS = [
    { id:'classic',  name:'Mặc định',      starter:true },
    { id:'mint',     name:'Bạc hà',        price:10 },
    { id:'coral',    name:'San hô',        price:20 },
    { id:'sunset',   name:'Hoàng hôn',     price:35 },
    { id:'ocean',    name:'Đại dương',     price:50 },
    { id:'violet',   name:'Tím huyền',     price:70 },
    { id:'gold',     name:'Ánh vàng',      price:100 },
    { id:'aurora',   name:'Cực quang',     price:0, diaPrice:2 },
    { id:'starlight',name:'Ánh sao lấp lánh', price:0, diaPrice:3 },
    { id:'legend',   name:'Danh hiệu Huyền thoại', price:0, diaPrice:5 },
  ];

  function unlockedIds(){
    const p = (typeof getPlayerProfile === 'function') ? getPlayerProfile() : {};
    const list = Array.isArray(p.unlockedNameFx) ? p.unlockedNameFx.slice() : [];
    if(list.indexOf('classic') < 0) list.unshift('classic');
    return list;
  }

  function isNameFxUnlocked(id){ return unlockedIds().indexOf(id) >= 0; }

  function unlockNameFx(id){
    const list = unlockedIds();
    if(list.indexOf(id) < 0){
      list.push(id);
      if(typeof savePlayerProfile === 'function') savePlayerProfile({ unlockedNameFx: list });
      return true;
    }
    return false;
  }

  function buyNameFxWithGold(id, price){
    if(isNameFxUnlocked(id)) return { ok:false, reason:'owned' };
    if(typeof spendGold !== 'function' || !spendGold(price)) return { ok:false, reason:'gold' };
    unlockNameFx(id);
    return { ok:true };
  }

  function buyNameFxWithDiamond(id, diaCost){
    if(isNameFxUnlocked(id)) return { ok:false, reason:'owned' };
    if(typeof spendDiamonds !== 'function' || !spendDiamonds(diaCost)) return { ok:false, reason:'diamond' };
    unlockNameFx(id);
    return { ok:true };
  }

  function getActiveNameFx(){
    const p = (typeof getPlayerProfile === 'function') ? getPlayerProfile() : {};
    return (p.activeNameFx && isNameFxUnlocked(p.activeNameFx)) ? p.activeNameFx : 'classic';
  }

  function applyNameFx(id){
    if(!isNameFxUnlocked(id)) return false;
    if(typeof savePlayerProfile === 'function') savePlayerProfile({ activeNameFx: id });
    return true;
  }

  g.NAME_EFFECT_SKINS = NAME_EFFECT_SKINS;
  g.isNameFxUnlocked = isNameFxUnlocked;
  g.unlockNameFx = unlockNameFx;
  g.buyNameFxWithGold = buyNameFxWithGold;
  g.buyNameFxWithDiamond = buyNameFxWithDiamond;
  g.getActiveNameFx = getActiveNameFx;
  g.applyNameFx = applyNameFx;
})(window);
