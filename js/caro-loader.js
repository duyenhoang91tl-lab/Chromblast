// ═══════════════════════════════════════════════════════════════
// js/caro-loader.js — NẠP TRỄ (lazy-load) js/caro.js + js/caro-social.js
// Mục đích: giảm dung lượng tải ban đầu (~104KB gộp 2 file) cho người
// chơi chưa vào chế độ Caro (mở từ Lv.3). Chỉ nạp thật khi:
//  1) Người chơi bấm nút #caro-btn lần đầu, hoặc
//  2) Có lời mời Caro đến qua chat (js/chat.js gọi ensureCaroLoaded).
// caro-ranks.js KHÔNG phụ thuộc caro.js nên vẫn nạp ngay như cũ.
// Nạp file này SỚM (trước khi người chơi có thể bấm caro-btn), TRƯỚC
// caro.js/caro-social.js (2 file này bị bỏ khỏi danh sách nạp sẵn).
// ═══════════════════════════════════════════════════════════════

(function(){
  var _caroLoadPromise = null;
  // Version cache-busting cho 2 file nạp trễ này — bump khi sửa caro.js/caro-social.js
  // (2 file <script> nạp sẵn khác đã có ?v=... ngay trong index.html, riêng 2 file
  // lazy-load này trước đây KHÔNG có version gì cả nên dễ bị cache cũ dai dẳng).
  var CARO_LAZY_V = '20260807z';

  function loadScriptOnce(src){
    return new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = src + '?v=' + CARO_LAZY_V;
      s.onload = function(){ resolve(); };
      s.onerror = function(){ reject(new Error('Không tải được ' + src)); };
      document.head.appendChild(s);
    });
  }

  // Nạp đúng thứ tự: caro.js trước (định nghĩa biến `_caro` dùng chung),
  // caro-social.js sau (comment gốc: "Nạp SAU caro.js").
  window.ensureCaroLoaded = function(){
    if (typeof openCaroHub === 'function') return Promise.resolve();
    if (_caroLoadPromise) return _caroLoadPromise;
    _caroLoadPromise = loadScriptOnce('js/caro.js')
      .then(function(){ return loadScriptOnce('js/caro-social.js'); })
      .catch(function(err){
        _caroLoadPromise = null; // cho phép thử lại nếu lỗi mạng
        throw err;
      });
    return _caroLoadPromise;
  };

  function bindLazyButton(){
    var btn = document.getElementById('caro-btn');
    if (!btn) return;
    btn.addEventListener('click', function onFirstCaroClick(){
      if (typeof openCaroHub === 'function') { openCaroHub(); return; }
      window.ensureCaroLoaded().then(function(){
        if (typeof openCaroHub === 'function') openCaroHub();
      }).catch(function(err){ console.error('[caro-loader]', err); });
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLazyButton);
  } else {
    bindLazyButton();
  }
})();
