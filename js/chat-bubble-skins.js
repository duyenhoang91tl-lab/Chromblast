// ═══════════════════════════════════════════════════════════════
// js/chat-bubble-skins.js — 10 bong bóng chat bán trong Shop (vàng/kim cương)
// Dùng chung kho "unlockedBubbles" với hệ bong bóng mở-bằng-QC có sẵn trong
// caro-social.js/versus-social.js (getPlayerProfile().unlockedBubbles) — mua ở Shop
// xong là hiện luôn "đã mở" trong bảng chọn bong bóng lúc chơi, không cần đổi gì thêm ở đó.
// Nạp SAU player-profile.js + inventory.js, TRƯỚC economy-shop.js.
// ═══════════════════════════════════════════════════════════════
(function(g){
  "use strict";

  // Giá tăng dần theo độ cầu kỳ hình ảnh (xem css/main.css) — 7 kiểu trả vàng (5-100),
  // 3 kiểu cao cấp nhất trả kim cương (1-5).
  const CHAT_BUBBLE_SKINS = [
    { id:'frost',     name:'Băng giá',     price:5   },
    { id:'mint',      name:'Bạc hà',       price:10  },
    { id:'bubblegum', name:'Kẹo bông gòn', price:15  },
    { id:'sunset',    name:'Hoàng hôn',    price:25  },
    { id:'ocean',     name:'Đại dương',    price:40  },
    { id:'emerald',   name:'Ngọc lục bảo', price:60  },
    { id:'royal',     name:'Hoàng gia',    price:100 },
    { id:'holo',      name:'Ánh cầu vồng', price:0, diaPrice:1 },
    { id:'starlight', name:'Ánh sao',      price:0, diaPrice:3 },
    { id:'legend',    name:'Huyền thoại',  price:0, diaPrice:5 }
  ];

  function unlockedBubbleIds(){
    const p = (typeof getPlayerProfile === 'function') ? getPlayerProfile() : {};
    return Array.isArray(p.unlockedBubbles) ? p.unlockedBubbles.slice() : ['classic'];
  }

  function isBubbleSkinUnlocked(id){
    return unlockedBubbleIds().indexOf(id) >= 0;
  }

  function unlockBubbleSkin(id){
    const list = unlockedBubbleIds();
    if(list.indexOf(id) < 0) list.push(id);
    if(typeof savePlayerProfile === 'function') savePlayerProfile({ unlockedBubbles: list });
  }

  function buyBubbleSkinWithGold(id, price){
    if(isBubbleSkinUnlocked(id)) return { ok:false, reason:'owned' };
    if(typeof spendGold !== 'function' || !spendGold(price)) return { ok:false, reason:'gold' };
    unlockBubbleSkin(id);
    return { ok:true };
  }

  function buyBubbleSkinWithDiamond(id, diaCost){
    if(isBubbleSkinUnlocked(id)) return { ok:false, reason:'owned' };
    if(typeof spendDiamonds !== 'function' || !spendDiamonds(diaCost)) return { ok:false, reason:'diamond' };
    unlockBubbleSkin(id);
    return { ok:true };
  }

  g.CHAT_BUBBLE_SKINS = CHAT_BUBBLE_SKINS;
  g.isBubbleSkinUnlocked = isBubbleSkinUnlocked;
  g.buyBubbleSkinWithGold = buyBubbleSkinWithGold;
  g.buyBubbleSkinWithDiamond = buyBubbleSkinWithDiamond;
})(typeof window !== 'undefined' ? window : this);
