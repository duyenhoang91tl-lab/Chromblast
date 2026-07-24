// ═══════════════════════════════════════════════════════════════
// js/sky-atmosphere.js — Sao twinkle/lóe · sao chổi · cánh đào bay nhẹ
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
      // ~8% sao thỉnh thoảng lóe tia sáng
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
        // Chu kỳ dài: vài giây mới lóe một lần
        const dur = 7 + Math.random() * 10;
        s.style.animationDuration = dur + 's';
        s.style.animationDelay = (-Math.random() * dur) + 's';
      } else {
        const dur = bright
          ? (1.8 + Math.random() * 2.6)
          : (2.4 + Math.random() * 4.5);
        s.style.animationDuration = dur + 's';
        s.style.animationDelay = (-Math.random() * dur) + 's';
        if(!bright && Math.random() > 0.65){
          s.style.animationDuration = (4.5 + Math.random() * 5) + 's';
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
    const count = 14;
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'sky-petal';
      const size = 11 + Math.random() * 7;
      p.style.width = size + 'px';
      p.style.height = (size * 0.86) + 'px';
      p.style.left = (Math.random() * 100) + '%';
      // Drift nhẹ, xoay chậm — bay dịu hơn
      p.style.setProperty('--drift', ((Math.random() * 70) - 20) + 'px');
      p.style.setProperty('--spin', (90 + Math.random() * 200) + 'deg');
      p.style.animationDuration = (16 + Math.random() * 14) + 's';
      p.style.animationDelay = (-Math.random() * 18) + 's';
      p.style.opacity = String(0.82 + Math.random() * 0.16);
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
    // Sao chổi thỉnh thoảng vụt qua (8–22 giây / lần)
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
