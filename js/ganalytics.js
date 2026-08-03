// ═══════════════════════════════════════════════════════════════
// js/ganalytics.js — Lớp bọc AN TOÀN cho Firebase Analytics (GA4).
// Project đã có measurementId (GA4) sẵn trong firebase-config.js, nhưng
// SDK analytics chưa từng được nạp/gọi — file này là chỗ DUY NHẤT gọi
// firebase.analytics() trong toàn bộ code, mọi nơi khác chỉ gọi
// logGameEvent(...) (không bao giờ throw, im lặng bỏ qua nếu bị chặn
// bởi adblock/không có mạng/chạy trong context không hỗ trợ).
//
// Nạp SAU firebase-config.js + firebase-analytics-compat.js,
// TRƯỚC các file game (main.js, caro.js, versus.js, quests.js...).
// ═══════════════════════════════════════════════════════════════
(function(){
  let _ga = null;
  try{
    if(window.firebase && firebase.apps && !firebase.apps.length){
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    if(window.firebase && typeof firebase.analytics === 'function'){
      _ga = firebase.analytics();
    }
  }catch(e){ console.warn('[ganalytics] init lỗi (bỏ qua, không ảnh hưởng game):', e); }

  // Nền tảng: phân biệt traffic chạy trong app Android (WebView/Capacitor)
  // với traffic chạy trực tuyến qua trình duyệt thường (GitHub Pages).
  const _platform = (function(){
    try{ return (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ? 'android_app' : 'web'; }
    catch(e){ return 'web'; }
  })();

  /**
   * Ghi 1 sự kiện GA4. KHÔNG BAO GIỜ throw — an toàn để gọi ở bất kỳ đâu,
   * kể cả khi analytics chưa init xong hoặc bị adblock chặn.
   * @param {string} name   tên sự kiện, snake_case (vd: 'level_start')
   * @param {object} params tham số đi kèm — KHÔNG đưa PII (không tên/email/SĐT thật)
   */
  window.logGameEvent = function(name, params){
    try{
      if(!_ga || !name) return;
      _ga.logEvent(name, Object.assign({ platform:_platform }, params||{}));
    }catch(e){ /* im lặng — analytics không bao giờ được làm hỏng trải nghiệm game */ }
  };

  /** Gắn 1 thuộc tính người dùng (vd cấp độ, ngôn ngữ) — cũng an toàn tuyệt đối. */
  window.setGameUserProperty = function(name, value){
    try{ if(_ga && name) _ga.setUserProperties({ [name]: value }); }catch(e){}
  };
})();
