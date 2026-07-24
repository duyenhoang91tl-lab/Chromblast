// ═══════════════════════════════════════════════════════════════
// js/sky-atmosphere.js — Sao twinkle + cánh đào rơi (lớp nền chung)
// Nạp sớm (sau DOM atmosphere trong index.html).
// ═══════════════════════════════════════════════════════════════

(function(){
  function spawnStars(){
    const box = document.getElementById('sky-stars');
    if(!box || box.dataset.ready) return;
    box.dataset.ready = '1';
    const frag = document.createDocumentFragment();
    const n = 110;
    for(let i=0;i<n;i++){
      const s = document.createElement('div');
      const roll = Math.random();
      const bright = roll > 0.82;
      const warm = !bright && roll < 0.18;
      const cool = !bright && !warm && roll > 0.7;
      s.className = 'sky-star' + (bright ? ' bright' : '') + (warm ? ' warm' : '') + (cool ? ' cool' : '');

      // Sao sáng lớn hơn một chút; sao thường vẫn nhỏ như hạt
      const size = bright
        ? (2.2 + Math.random() * 2.4)
        : (1.1 + Math.random() * 1.8);
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.left = (Math.random() * 100) + '%';
      // Nhiều sao hơn ở nửa trên bầu trời
      s.style.top = (Math.random() * Math.random() * 72) + '%';

      // Nhịp nhấp nháy lệch nhau — nhanh/chậm như sao thật
      const dur = bright
        ? (1.6 + Math.random() * 2.4)
        : (2.2 + Math.random() * 4.5);
      s.style.animationDuration = dur + 's';
      s.style.animationDelay = (-Math.random() * dur) + 's';
      // Một số sao nhấp chậm hơn (đổi timing riêng)
      if(!bright && Math.random() > 0.65){
        s.style.animationDuration = (4.5 + Math.random() * 5) + 's';
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
      const size = 7 + Math.random() * 8;
      p.style.width = size + 'px';
      p.style.height = size * 0.85 + 'px';
      p.style.left = (Math.random() * 100) + '%';
      p.style.setProperty('--drift', ((Math.random() * 120) - 40) + 'px');
      p.style.setProperty('--spin', (180 + Math.random() * 400) + 'deg');
      p.style.animationDuration = (9 + Math.random() * 12) + 's';
      p.style.animationDelay = (-Math.random() * 14) + 's';
      p.style.opacity = String(0.45 + Math.random() * 0.4);
      if(Math.random() > 0.55){
        p.style.background = 'linear-gradient(135deg, #ffe8f0 0%, #ffb0cc 50%, #ff7aaa 100%)';
      }
      box.appendChild(p);
    }
  }

  function init(){
    spawnStars();
    spawnPetals();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
