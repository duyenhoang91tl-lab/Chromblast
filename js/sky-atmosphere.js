// ═══════════════════════════════════════════════════════════════
// js/sky-atmosphere.js — Sao twinkle/lóe chậm · sao chổi · cánh đào theo gió trái
// Nạp sớm (sau DOM atmosphere trong index.html).
// ═══════════════════════════════════════════════════════════════

(function(){
  function spawnStars(){
    const box = document.getElementById('sky-stars');
    if(!box || box.dataset.ready) return;
    box.dataset.ready = '1';
    const frag = document.createDocumentFragment();
    const n = 120;
    for(let i=0;i<n;i++){
      const s = document.createElement('div');
      const roll = Math.random();
      const bright = roll > 0.84;
      const warm = !bright && roll < 0.16;
      const cool = !bright && !warm && roll > 0.72;
      const flare = !warm && Math.random() < 0.08;
      s.className = 'sky-star'
        + (bright ? ' bright' : '')
        + (warm ? ' warm' : '')
        + (cool ? ' cool' : '')
        + (flare ? ' flare' : '');

      const size = flare
        ? (2.4 + Math.random() * 2.2)
        : bright
          ? (2.2 + Math.random() * 2.2)
          : (1.1 + Math.random() * 1.7);
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.left = (Math.random() * 100) + '%';
      s.style.top = (Math.random() * Math.random() * 78) + '%';

      if(flare){
        // Lóe chậm hơn: chu kỳ 14–28s, chỉ sáng ngắn ở cuối chu kỳ
        const dur = 14 + Math.random() * 14;
        s.style.animationDuration = dur + 's';
        s.style.animationDelay = (-Math.random() * dur) + 's';
      } else {
        // Twinkle thường cũng chậm hơn
        const dur = bright
          ? (3.5 + Math.random() * 4)
          : (4.5 + Math.random() * 6);
        s.style.animationDuration = dur + 's';
        s.style.animationDelay = (-Math.random() * dur) + 's';
        if(!bright && Math.random() > 0.6){
          s.style.animationDuration = (8 + Math.random() * 8) + 's';
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
    const count = 16;
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'sky-petal';
      const size = 11 + Math.random() * 7;
      p.style.width = size + 'px';
      p.style.height = (size * 0.86) + 'px';
      // Xuất hiện từ giữa–phải, bay theo gió sang trái
      p.style.left = (48 + Math.random() * 52) + '%';
      // Gió trái: -28vw … -70vw
      p.style.setProperty('--windX', (-(28 + Math.random() * 42)) + 'vw');
      // Biên độ phất phơ ngang
      p.style.setProperty('--sway', (6 + Math.random() * 14) + 'px');
      // Xoay nhẹ theo gió
      p.style.setProperty('--spin', (-(100 + Math.random() * 160)) + 'deg');
      // Bay chậm, dịu
      p.style.animationDuration = (18 + Math.random() * 16) + 's';
      p.style.animationDelay = (-Math.random() * 22) + 's';
      p.style.opacity = String(0.85 + Math.random() * 0.14);
      if(Math.random() > 0.45){
        p.style.background = 'linear-gradient(135deg, #fff0f5 0%, #ffb3cc 48%, #ff7aaa 100%)';
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
