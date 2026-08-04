// ═══════════════════════════════════════════════════════════════
// js/iap.js — Mua hàng trong app (RevenueCat, chỉ chạy trên app Android
// native — trên web/GitHub Pages các hàm dưới đây tự no-op an toàn).
//
// CÁC BƯỚC CẦN LÀM THỦ CÔNG (ngoài code, không tự động được):
//  1) Tạo tài khoản RevenueCat (revenuecat.com) — miễn phí cho tới khi
//     doanh thu vượt ngưỡng, xem giá mới nhất trên trang của họ.
//  2) RevenueCat Dashboard → New Project → liên kết app Android
//     (com.duyenhoang91tl.chromblast) → liên kết Google Play qua
//     service-account JSON (RevenueCat hướng dẫn từng bước).
//  3) Vào Google Play Console → Sản phẩm trong ứng dụng, tạo ĐÚNG các
//     Product ID sau (chữ thường, gạch dưới, KHÔNG được đổi tên vì code
//     bên dưới tham chiếu trực tiếp):
//       - diamonds_small   (sản phẩm dùng 1 lần / có thể mua lại nhiều lần)
//       - diamonds_medium  (nt — gắn nhãn "Hời nhất" trong shop)
//       - diamonds_large   (nt)
//       - remove_ads       (sản phẩm mua 1 lần, KHÔNG tiêu hao)
//       - starter_pack     (sản phẩm mua 1 lần — chỉ hiện cho người
//                           chơi chưa từng mua gì, xem shouldShowStarterPack())
//     Giá cụ thể tự đặt trong Play Console, code không hardcode giá.
//  4) RevenueCat Dashboard → Products, import các Product ID trên từ
//     Play Console → gộp vào 1 Offering tên "default" → tạo 1
//     Entitlement tên "remove_ads", gắn 2 sản phẩm remove_ads +
//     starter_pack vào entitlement này (vì cả 2 đều nên tắt quảng cáo).
//  5) RevenueCat Dashboard → API keys → copy khoá Android (khoá PUBLIC,
//     an toàn để commit) → dán vào js/iap-config.js.
// ═══════════════════════════════════════════════════════════════
(function(){
  // Số kim cương nhận được cho mỗi sản phẩm tiêu hao — sửa nếu đổi giá trị gói.
  const DIAMOND_GRANTS = {
    diamonds_small: 60,
    diamonds_medium: 330,
    diamonds_large: 700,
    starter_pack: 200 // starter_pack còn kèm remove_ads (qua entitlement, không cộng ở đây)
  };
  const ENTITLEMENT_REMOVE_ADS = 'remove_ads';

  let _Purchases = null;
  let _ready = false;
  let _removeAdsActive = false;
  let _offeringsCache = null;

  function _plugin(){
    try{
      const cap = window.Capacitor;
      if(!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
      return (cap.Plugins && cap.Plugins.Purchases) || null;
    }catch(e){ return null; }
  }

  // Cache "đã bỏ quảng cáo" xuống localStorage để native.js đọc được ngay,
  // không cần chờ RevenueCat trả lời mỗi lần mở app (offline-first).
  function _persistRemoveAds(active){
    _removeAdsActive = !!active;
    try{ localStorage.setItem('cb_remove_ads', _removeAdsActive ? '1' : '0'); }catch(e){}
  }

  window.hasRemoveAds = function(){
    if(_removeAdsActive) return true;
    try{ return localStorage.getItem('cb_remove_ads') === '1'; }catch(e){ return false; }
  };

  window.initIAP = async function(){
    try{
      _Purchases = _plugin();
      if(!_Purchases) return; // web / chưa cài plugin native — bỏ qua êm
      const key = window.REVENUECAT_ANDROID_KEY;
      if(!key || key.indexOf('REPLACE_WITH')===0){ console.warn('[iap] Chưa cấu hình REVENUECAT_ANDROID_KEY — xem js/iap-config.js'); return; }
      await _Purchases.configure({ apiKey: key });
      _ready = true;
      await window.refreshEntitlements();
    }catch(e){ console.warn('[iap] init lỗi:', e); }
  };

  window.refreshEntitlements = async function(){
    if(!_Purchases || !_ready) return;
    try{
      const { customerInfo } = await _Purchases.getCustomerInfo();
      const ent = customerInfo && customerInfo.entitlements && customerInfo.entitlements.active;
      _persistRemoveAds(!!(ent && ent[ENTITLEMENT_REMOVE_ADS] && ent[ENTITLEMENT_REMOVE_ADS].isActive));
    }catch(e){ console.warn('[iap] refreshEntitlements lỗi:', e); }
  };

  /** Trả về mảng PurchasesPackage của Offering hiện tại ("current"). */
  window.getShopOfferings = async function(){
    if(!_Purchases || !_ready) return [];
    try{
      if(_offeringsCache) return _offeringsCache;
      const offerings = await _Purchases.getOfferings();
      const cur = offerings.current;
      _offeringsCache = (cur && cur.availablePackages) || [];
      return _offeringsCache;
    }catch(e){ console.warn('[iap] getShopOfferings lỗi:', e); return []; }
  };

  /**
   * Mua 1 package theo identifier (vd 'diamonds_medium').
   * onGrant(kind, amount) được gọi khi thành công, để shop UI cập nhật ngay.
   */
  window.purchaseIAP = async function(identifier, onGrant){
    if(!_Purchases || !_ready){
      try{ showComboFlash(0, false, (typeof t==='function'?t('iapUnavailable'):null)||'Mua hàng chỉ khả dụng trên app Android'); }catch(e){}
      return { ok:false, reason:'unavailable' };
    }
    try{ if(typeof logGameEvent==='function') logGameEvent('purchase_started', { product_id:identifier }); }catch(e){}
    try{
      const pkgs = await window.getShopOfferings();
      const pkg = pkgs.find(p=>p.identifier===identifier || (p.product && p.product.identifier===identifier));
      if(!pkg) throw new Error('Không tìm thấy gói: '+identifier);

      const { customerInfo } = await _Purchases.purchasePackage({ aPackage: pkg });

      const ent = customerInfo && customerInfo.entitlements && customerInfo.entitlements.active;
      if(ent && ent[ENTITLEMENT_REMOVE_ADS] && ent[ENTITLEMENT_REMOVE_ADS].isActive) _persistRemoveAds(true);

      const diamonds = DIAMOND_GRANTS[identifier];
      if(diamonds && typeof grantDiamonds==='function') grantDiamonds(diamonds, 'Mua: '+identifier);

      try{ if(typeof logGameEvent==='function') logGameEvent('purchase_completed', { product_id:identifier, diamonds:diamonds||0 }); }catch(e){}
      if(typeof onGrant==='function') onGrant(identifier, diamonds||0);
      return { ok:true, diamonds:diamonds||0 };
    }catch(e){
      const cancelled = !!(e && (e.userCancelled || e.code==='PURCHASE_CANCELLED'));
      try{ if(typeof logGameEvent==='function') logGameEvent(cancelled?'purchase_cancelled':'purchase_failed', { product_id:identifier }); }catch(e2){}
      if(!cancelled) console.warn('[iap] purchase lỗi:', e);
      return { ok:false, reason: cancelled?'cancelled':'error' };
    }
  };

  window.restoreIAP = async function(){
    if(!_Purchases || !_ready) return { ok:false };
    try{
      const { customerInfo } = await _Purchases.restorePurchases();
      const ent = customerInfo && customerInfo.entitlements && customerInfo.entitlements.active;
      const active = !!(ent && ent[ENTITLEMENT_REMOVE_ADS] && ent[ENTITLEMENT_REMOVE_ADS].isActive);
      _persistRemoveAds(active);
      try{ if(typeof logGameEvent==='function') logGameEvent('purchase_restored', { remove_ads:active }); }catch(e){}
      return { ok:true, removeAds:active };
    }catch(e){ console.warn('[iap] restore lỗi:', e); return { ok:false }; }
  };

  /** Gói khởi đầu chỉ nên hiện cho người chơi CHƯA từng mua gì. */
  window.shouldShowStarterPack = function(){
    try{ return !window.hasRemoveAds() && localStorage.getItem('cb_starter_pack_seen') !== '1'; }
    catch(e){ return !window.hasRemoveAds(); }
  };
  /** Gọi sau khi đã hiện gói khởi đầu 1 lần (mua hoặc bấm bỏ qua) để không hiện lại. */
  window.markStarterPackSeen = function(){
    try{ localStorage.setItem('cb_starter_pack_seen', '1'); }catch(e){}
  };

  // Khởi tạo ngay khi mọi thứ đã nạp xong (an toàn kể cả trên web).
  if(document.readyState==='complete' || document.readyState==='interactive') setTimeout(window.initIAP, 0);
  else document.addEventListener('DOMContentLoaded', ()=>window.initIAP());
})();
