// ═══════════════════════════════════════════════════════════════
// js/sky-atmosphere.js — Thiên hà: sao dày · lóe chậm rồi tắt dần
// · cánh đào gió trái · tự giảm chất lượng máy yếu · tự ẩn phần
// tử bị bàn cờ/UI che khuất.
// Nạp sớm (sau DOM atmosphere trong index.html).
// ═══════════════════════════════════════════════════════════════

(function(){

  // ── PHẦN 1: PHÁT HIỆN MÁY YẾU ────────────────────────────────
  // Gán html.fx-low để CSS tự giảm blur/tia lóe/sao chổi/cánh đào.
  // Kết hợp chỉ số tĩnh (cores/RAM/reduced-motion) với đo frame
  // -time thực tế, vì hai chỉ số tĩnh có thể thiếu trên một số
  // trình duyệt/thiết bị.
  function setFxLow(on){
    document.documentElement.classList.toggle('fx-low', !!on);
  }

  function detectWeakDeviceStatic(){
    try{
      if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        return true;
      }
      if(typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4){
        return true;
      }
      if(typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4){
        return true;
      }
    }catch(e){}
    return false;
  }

  // Đo ~24 khung hình đầu để phát hiện máy giật dù chỉ số tĩnh ổn
  // (ví dụ máy nhiều core nhưng GPU yếu). Chỉ nâng cấp lên fx-low,
  // không tự tắt lại — tránh nhấp nháy chất lượng qua lại.
  function watchFrameTiming(){
    let last = performance.now();
    let samples = 0;
    let slow = 0;
    const MAX_SAMPLES = 24;
    function tick(now){
      const dt = now - last;
      last = now;
      samples++;
      if(dt > 33) slow++; // dưới ~30fps cho khung đó
      if(samples >= MAX_SAMPLES){
        if(slow / samples > 0.35) setFxLow(true);
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(function(now){ last = now; requestAnimationFrame(tick); });
  }

  function initWeakDeviceDetection(){
    if(detectWeakDeviceStatic()){
      setFxLow(true);
      return; // đã chắc chắn máy yếu, khỏi cần đo thêm
    }
    watchFrameTiming();
  }

  // ── Sinh phần tử nền ─────────────────────────────────────────
  function spawnStars(){
    const box = document.getElementById('sky-stars');
    if(!box || box.dataset.ready) return;
    box.dataset.ready = '1';
    const frag = document.createDocumentFragment();
    // Field vừa đủ dày — cắt ~40% so với 260 để nền bớt tranh GPU với gameplay
    const n = 150;
    for(let i=0;i<n;i++){
      const s = document.createElement('div');
      const roll = Math.random();
      const bright = roll > 0.88;
      const warm = !bright && roll < 0.12;
      const cool = !bright && !warm && roll > 0.78;
      const flare = !warm && Math.random() < 0.055;
      s.className = 'sky-star'
        + (bright ? ' bright' : '')
        + (warm ? ' warm' : '')
        + (cool ? ' cool' : '')
        + (flare ? ' flare' : '');

      const size = flare
        ? (2.4 + Math.random() * 2.2)
        : bright
          ? (2.0 + Math.random() * 2.0)
          : (0.7 + Math.random() * 1.5);
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.left = (Math.random() * 100) + '%';
      // Phân bố toàn khung, hơi dày phía trên
      s.style.top = (Math.random() * Math.random() * 92) + '%';

      // Lóe chậm rồi tắt dần: chu kỳ dài, lệch pha ngẫu nhiên để
      // các sao không lóe đồng loạt — "lâu lâu" mới sáng 1 phát,
      // không nhấp nháy liên tục.
      if(flare){
        const dur = 16 + Math.random() * 16; // 16–32s
        s.style.animationDuration = dur + 's';
        s.style.animationDelay = (-Math.random() * dur) + 's';
      } else {
        const dur = bright
          ? (18 + Math.random() * 12)   // 18–30s
          : (20 + Math.random() * 16);  // 20–36s
        s.style.animationDuration = dur + 's';
        s.style.animationDelay = (-Math.random() * dur) + 's';
      }
      frag.appendChild(s);
    }
    box.appendChild(frag);
  }

  function spawnPetals(){
    const box = document.getElementById('sky-petals');
    if(!box || box.dataset.ready) return;
    box.dataset.ready = '1';
    const count = 18;
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'sky-petal';
      // Kích thước đa dạng (độ sâu)
      const size = 8 + Math.random() * 12;
      p.style.width = size + 'px';
      p.style.height = (size * 0.86) + 'px';
      // Rải khắp khung hình, bay theo gió sang trái
      p.style.left = (Math.random() * 100) + '%';
      p.style.top = (-8 - Math.random() * 55) + 'vh';
      // Gió trái: -28vw … -75vw
      p.style.setProperty('--windX', (-(28 + Math.random() * 47)) + 'vw');
      p.style.setProperty('--sway', (6 + Math.random() * 16) + 'px');
      p.style.setProperty('--spin', (-(90 + Math.random() * 180)) + 'deg');
      p.style.animationDuration = (16 + Math.random() * 18) + 's';
      p.style.animationDelay = (-Math.random() * 28) + 's';
      p.style.opacity = String(0.78 + Math.random() * 0.2);
      if(Math.random() > 0.4){
        p.style.background = 'linear-gradient(135deg, #fff0f5 0%, #ffb3cc 48%, #ff7aaa 100%)';
      } else {
        p.style.background = 'linear-gradient(135deg, #ffe4ef 0%, #ff9ec0 42%, #f06a9a 100%)';
      }
      if(size < 11){
        p.style.filter = 'brightness(0.92)';
      }
      box.appendChild(p);
    }
  }

  function spawnMeteor(){
    if(document.documentElement.classList.contains('fx-low')) return; // máy yếu: bỏ sao chổi
    const box = document.getElementById('sky-meteors');
    if(!box) return;
    const m = document.createElement('div');
    m.className = 'sky-meteor';
    m.style.left = (Math.random() * 70) + '%';
    m.style.top = (4 + Math.random() * 42) + '%';
    const ang = -28 - Math.random() * 18;
    m.style.transform = 'rotate(' + ang + 'deg)';
    const len = 70 + Math.random() * 50;
    m.style.width = len + 'px';
    box.appendChild(m);
    setTimeout(function(){ m.remove(); }, 1300);
  }

  function scheduleMeteors(){
    const next = function(){
      spawnMeteor();
      setTimeout(next, 8000 + Math.random() * 14000);
    };
    setTimeout(next, 4000 + Math.random() * 6000);
  }

  // ── PHẦN 3: TỰ ẨN PHẦN TỬ BỊ CHE BỞI BÀN CỜ / UI ───────────────
  // So vị trí (theo % viewport) của từng sao/cánh đào với vùng
  // chiếm chỗ thực tế của các khối UI đang hiển thị, gán/gỡ
  // .sky-occluded tương ứng.
  var OCCLUDER_SELECTOR = '#grid-wrap, .skill-bar, #hint-bar, #pieces-area';

  function getOccluderRects(){
    const rects = [];
    document.querySelectorAll(OCCLUDER_SELECTOR).forEach(function(el){
      if(!el || el.offsetParent === null) return; // phần tử đang ẩn thì bỏ qua
      const r = el.getBoundingClientRect();
      if(r.width > 0 && r.height > 0) rects.push(r);
    });
    return rects;
  }

  function updateOcclusion(){
    const rects = getOccluderRects();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if(!vw || !vh) return;

    function isCovered(leftPct, topPct){
      const x = (leftPct / 100) * vw;
      const y = (topPct / 100) * vh;
      for(let i = 0; i < rects.length; i++){
        const r = rects[i];
        if(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
      }
      return false;
    }

    function applyTo(selector){
      document.querySelectorAll(selector).forEach(function(el){
        const left = parseFloat(el.style.left);
        const top = parseFloat(el.style.top);
        if(isNaN(left) || isNaN(top)) return;
        el.classList.toggle('sky-occluded', isCovered(left, top));
      });
    }

    applyTo('#sky-stars .sky-star');
    applyTo('#sky-petals .sky-petal');
  }

  function scheduleOcclusionUpdate(){
    if(scheduleOcclusionUpdate._raf) cancelAnimationFrame(scheduleOcclusionUpdate._raf);
    scheduleOcclusionUpdate._raf = requestAnimationFrame(updateOcclusion);
  }

  function initOcclusionTracking(){
    // Chạy lần đầu sau khi layout ổn định
    scheduleOcclusionUpdate();
    setTimeout(scheduleOcclusionUpdate, 300);

    window.addEventListener('resize', scheduleOcclusionUpdate, { passive: true });
    window.addEventListener('orientationchange', scheduleOcclusionUpdate, { passive: true });

    // Bàn cờ/HUD có thể đổi hiện/ẩn khi chuyển màn hình (start ↔ game
    // ↔ versus...) mà không resize cửa sổ — theo dõi thay đổi DOM/class
    // trên body để cập nhật lại vùng che khuất.
    if('MutationObserver' in window){
      const mo = new MutationObserver(scheduleOcclusionUpdate);
      mo.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'], subtree: false, childList: true });
    }

    // Lưới an toàn nhẹ: kiểm tra định kỳ, chi phí rất thấp
    // (chỉ vài chục phần tử, không truy vấn DOM nặng).
    setInterval(scheduleOcclusionUpdate, 2000);
  }

  function init(){
    initWeakDeviceDetection();
    spawnStars();
    spawnPetals();
    scheduleMeteors();
    initOcclusionTracking();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
