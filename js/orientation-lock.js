// ═══════════════════════════════════════════════════════════════
// js/orientation-lock.js — Khóa/mở xoay màn hình (Capacitor).
// Trên web thường (không phải app Android) file này không làm gì
// (window.Capacitor không tồn tại hoặc không phải native platform).
//
// Mặc định: khóa dọc (portrait) toàn app.
// Một số màn được phép xoay tự do (mở khóa): Caro và Đấu 1-1 online.
// ═══════════════════════════════════════════════════════════════
(function(){
  function _plugin(){
    const cap = window.Capacitor;
    if(!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
    return (cap.Plugins && cap.Plugins.ScreenOrientation) || null;
  }

  window.lockPortraitOrientation = async function(){
    const so = _plugin();
    if(!so) return;
    try{ await so.lock({ orientation: 'portrait' }); }
    catch(e){ console.warn('[orientation] lock portrait failed', e); }
  };

  window.unlockOrientation = async function(){
    const so = _plugin();
    if(!so) return;
    try{ await so.unlock(); }
    catch(e){ console.warn('[orientation] unlock failed', e); }
  };

  // Dùng cho các màn cần ép ngang bắt buộc (vd. Đấu Clan "Muông Thú Đại Chiến")
  // trên app native. Trên web thường, dùng js/orientation-lock-fallback.js
  // (overlay yêu cầu xoay máy) vì Capacitor không tồn tại ở đó.
  window.lockLandscapeOrientation = async function(){
    const so = _plugin();
    if(!so) return;
    try{ await so.lock({ orientation: 'landscape' }); }
    catch(e){ console.warn('[orientation] lock landscape failed', e); }
  };

  // Khóa dọc ngay khi app khởi động (mặc định cho toàn bộ các màn,
  // trừ những nơi chủ động gọi unlockOrientation()).
  document.addEventListener('DOMContentLoaded', function(){
    window.lockPortraitOrientation();
  });
})();
