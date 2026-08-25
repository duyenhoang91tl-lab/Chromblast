/**
 * orientation-lock-fallback.js
 *
 * !! LƯU Ý: Spec mục 1 nói rõ "tái sử dụng js/orientation-lock.js" đã có sẵn trong repo.
 * File này CHỈ là bản dự phòng dùng để mình test/demo Task 10 vì không có quyền truy cập
 * file gốc của bạn. Nếu js/orientation-lock.js đã tồn tại và hoạt động tốt — dùng file đó,
 * bỏ qua file này (đừng include cả 2 cùng lúc, dễ đụng độ listener).
 *
 * Chức năng: khoá màn hình ở chế độ ngang cho "Muông Thú Đại Chiến".
 * - Thử gọi Screen Orientation API (chỉ hoạt động khi đã fullscreen trên hầu hết trình duyệt).
 * - Fallback: hiện overlay toàn màn hình yêu cầu xoay ngang khi phát hiện đang ở chế độ dọc,
 *   dùng matchMedia('(orientation: portrait)') để lắng nghe thay đổi.
 *
 * Dùng:
 *   const lock = initOrientationLock({ overlayMessage: 'Xoay ngang màn hình để chơi' });
 *   // ... rời màn chơi:
 *   lock.destroy();
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.initOrientationLock = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function initOrientationLock(options = {}) {
    const message = options.overlayMessage || 'Vui lòng xoay ngang màn hình để chơi';
    const overlayClass = options.overlayClass || 'orientation-lock-overlay';

    // 1) Thử khoá cứng qua Screen Orientation API (best-effort, nhiều trình duyệt
    //    chỉ cho phép khi đang ở chế độ fullscreen, nên không throw nếu lỗi).
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      screen.orientation.lock('landscape').catch(() => {
        // Bị từ chối (chưa fullscreen / trình duyệt không hỗ trợ) -> dựa vào overlay fallback bên dưới.
      });
    }

    // 2) Overlay fallback: hiện thông báo xoay máy khi đang dọc.
    const overlay = document.createElement('div');
    overlay.className = overlayClass;
    overlay.innerHTML = `
      <div class="orientation-lock-icon" aria-hidden="true">⟳</div>
      <div class="orientation-lock-message">${message}</div>
    `;
    overlay.style.display = 'none';
    document.body.appendChild(overlay);

    const mediaQuery = window.matchMedia('(orientation: portrait)');

    function syncOverlay(isPortrait) {
      overlay.style.display = isPortrait ? 'flex' : 'none';
    }

    function handleChange(evt) {
      syncOverlay(evt.matches);
    }

    // API cũ addListener vs mới addEventListener — hỗ trợ cả 2 cho trình duyệt cũ.
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    syncOverlay(mediaQuery.matches);

    return {
      destroy() {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange);
        } else {
          mediaQuery.removeListener(handleChange);
        }
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
          try {
            screen.orientation.unlock();
          } catch (e) {
            // bỏ qua nếu trình duyệt không cho unlock ngoài fullscreen
          }
        }
      },
    };
  }

  return initOrientationLock;
});
