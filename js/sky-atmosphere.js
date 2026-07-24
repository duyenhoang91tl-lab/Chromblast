// ═══════════════════════════════════════════════════════════════
// js/sky-atmosphere.js — Thiên hà: sao dày · lóe chậm · cánh đào gió trái
// Nạp sớm (sau DOM atmosphere trong index.html).
// ═══════════════════════════════════════════════════════════════

(function(){
  function spawnStars(){
    const box = document.getElementById('sky-stars');
    if(!box || box.dataset.ready) return;
    box.dataset.ready = '1';
    const frag = document.createDocumentFragment();
    // Field dày: nhiều sao nhỏ + vài sao sáng/lóe
    const n = 260;
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

      if(flare){
        // Lóe chậm: chu kỳ 14–28s
        const dur = 14 + Math.random() * 14;
        s.style.animationDuration = dur + 's';
        s.style.animationDelay = (-Math.random() * dur) + 's';
      } else {
        const dur = bright
          ? (4.5 + Math.random() * 5)
          : (5.5 + Math.random() * 7);
        s.style.animationDuration = dur + 's';
        s.style.animationDelay = (-Math.random() * dur) + 's';
        if(!bright && Math.random() > 0.55){
          s.style.animationDuration = (9 + Math.random() * 10) + 's';
        }
      }
      frag.appendChild(s);
    }
    box.appendChild(frag);
  }

  function spawnPetals(){
    const box = document.getElementById('sky-petals');
    if(!box || box.dataset.ready) return;
    box.dataset.ready = '1';
    const count = 26;
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'sky-petal';
      // Kích thước đa dạng (độ sâu)
      const size = 8 + Math.random() * 12;
      p.style.width = size + 'px';
      p.style.height = (size * 0.86) + 'px';
      // Từ giữa–phải, bay theo gió sang trái
      p.style.left = (42 + Math.random() * 58) + '%';
      p.style.top = (-8 - Math.random() * 40) + 'vh';
      // Gió trái: -28vw … -75vw
      p.style.setProperty('--windX', (-(28 + Math.random() * 47)) + 'vw');
      p.style.setProperty('--sway', (6 + Math.random() * 16) + 'px');
      p.style.setProperty('--spin', (-(90 + Math.random() * 180)) + 'deg');
      p.style.animationDuration = (16 + Math.random() * 18) + 's';
      p.style.animationDelay = (-Math.random() * 28) + 's';
      p.style.opacity = String(0.78 + Math.random() * 0.2);
      if(Math.random() > 0.4){
        p.style.background = 'linear-gradient(135deg, #fff0f5 0%, #ffb3cc 48%, #ff7aaa 100%)';
      }
      if(size < 11){
        p.style.filter = 'brightness(0.92)';
      }
      box.appendChild(p);
    }
  }

  function spawnMeteor(){
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

  function init(){
    spawnStars();
    spawnPetals();
    scheduleMeteors();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
