// ═══════════════════════════════════════════════════════════════
// maps/map21.js — MAP ẨN 21: Ếch ộp ham ăn
// Ao sen nhìn từ trên xuống (canvas). Ếch ngồi giữa lá sen, phóng lưỡi
// bắt: ong · dế mèn · châu chấu · bươm bướm · cánh cứng.
// api: W/H 360×460 · input · addScore · sfx · flash · finish(won)
// ═══════════════════════════════════════════════════════════════

function triggerFrogUnlock(){
  markMapCleared('mega');
  pendingUnlock = 'frog';
  document.getElementById('unlock-title').textContent = '🐸 BẢN ĐỒ 21 MỞ KHÓA!';
  document.getElementById('unlock-desc').innerHTML =
    '<b>Ếch ộp ham ăn</b><br>Căn thời gian — phóng lưỡi cho ếch ộp no bụng: ong, dế, châu chấu, bướm và cánh cứng!';
  document.getElementById('unlock-btn').textContent = 'BẮT ĐẦU!';
  showUnlockOverlay();
}

registerMapModule({
  id: 21,
  key: 'frog',
  name: 'Ếch ộp ham ăn',
  bgm: 'action',

  GOAL: 12,
  TIME: 60,
  TONGUE_SPEED: 980,
  TONGUE_MAX_FRAC: 0.42,
  SPAWN_EVERY: 0.85,
  MAX_BUGS: 8,

  KINDS: [
    { id: 'bee', name: 'Ong', color: '#f0c040' },
    { id: 'cricket', name: 'Dế mèn', color: '#6a8f3c' },
    { id: 'grasshopper', name: 'Châu chấu', color: '#8bc34a' },
    { id: 'butterfly', name: 'Bướm', color: '#e91e8c' },
    { id: 'beetle', name: 'Cánh cứng', color: '#5d4037' },
  ],

  init(api){
    if (typeof setActiveHiddenMap === 'function') setActiveHiddenMap('frog');
    this.t = 0;
    this.timeLeft = this.TIME;
    this.scoreCatch = 0;
    this.ended = false;
    this.spawnT = 0.25;
    this.bugs = [];
    this.particles = [];
    this.ripples = [];
    this.tongue = null;
    this.pop = null;
    this.frog = { x: api.W * 0.5, y: api.H * 0.52, r: 22, blink: 2 };
    this.buildScene(api);
    for (let i = 0; i < 4; i++) this.spawnBug(api);
    this.msgTimer = 2.6;
    this.msg = '🐸 Chạm để phóng lưỡi — căn lúc côn trùng bay gần!';
  },

  buildScene(api){
    const fx = this.frog.x, fy = this.frog.y;
    const R = Math.min(api.W, api.H);
    this.pads = [];
    this.flowers = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const r = R * (0.16 + Math.random() * 0.28);
      this.pads.push({
        x: Math.max(28, Math.min(api.W - 28, fx + Math.cos(a) * r)),
        y: Math.max(28, Math.min(api.H - 28, fy + Math.sin(a) * r * 0.85)),
        r: 16 + Math.random() * 22,
        rot: Math.random() * Math.PI * 2,
        notch: 0.35 + Math.random() * 0.35,
        home: false,
      });
    }
    this.pads.push({ x: fx, y: fy, r: this.frog.r * 2.35, rot: -0.35, notch: 0.55, home: true });
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = R * (0.12 + Math.random() * 0.32);
      this.flowers.push({
        x: Math.max(36, Math.min(api.W - 36, fx + Math.cos(a) * r)),
        y: Math.max(36, Math.min(api.H - 36, fy + Math.sin(a) * r * 0.9)),
        s: 0.65 + Math.random() * 0.5,
        rot: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  },

  pick(arr){ return arr[(Math.random() * arr.length) | 0]; },

  spawnBug(api){
    if (this.bugs.length >= this.MAX_BUGS) return;
    const kind = this.pick(this.KINDS);
    const side = (Math.random() * 4) | 0;
    let x, y;
    if (side === 0) { x = Math.random() * api.W; y = -18; }
    else if (side === 1) { x = api.W + 18; y = Math.random() * api.H; }
    else if (side === 2) { x = Math.random() * api.W; y = api.H + 18; }
    else { x = -18; y = Math.random() * api.H; }
    const hop = (kind.id === 'cricket' || kind.id === 'grasshopper');
    this.bugs.push({
      kind,
      x, y,
      vx: 0, vy: 0,
      ang: Math.atan2(y - this.frog.y, x - this.frog.x),
      orbitR: Math.min(api.W, api.H) * (0.16 + Math.random() * 0.2),
      orbitSpeed: (0.55 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1),
      hopT: Math.random() * Math.PI * 2,
      hopAmp: hop ? (10 + Math.random() * 12) : (3 + Math.random() * 5),
      flap: Math.random() * Math.PI * 2,
      r: kind.id === 'butterfly' ? 13 : kind.id === 'beetle' ? 11 : 10,
      alive: true,
      enter: 0.5,
    });
  },

  fireTongue(tx, ty, api){
    if (this.ended || this.tongue) return;
    const dx = tx - this.frog.x;
    const dy = ty - this.frog.y;
    const len = Math.hypot(dx, dy) || 1;
    const maxLen = Math.min(api.W, api.H) * this.TONGUE_MAX_FRAC;
    this.tongue = {
      ux: dx / len,
      uy: dy / len,
      len: 0,
      max: Math.min(len, maxLen),
      out: true,
      hit: false,
    };
    api.sfx('Click');
  },

  catchBug(b, api){
    b.alive = false;
    this.scoreCatch++;
    api.addScore(8);
    this.pop = { text: '+' + this.scoreCatch + ' · ' + b.kind.name, life: 0.85, color: '#fff59d' };
    for (let i = 0; i < 9; i++) {
      this.particles.push({
        x: b.x, y: b.y,
        vx: (Math.random() - 0.5) * 220,
        vy: -40 - Math.random() * 140,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        color: b.kind.color,
      });
    }
    api.sfx('Match');
    if (this.scoreCatch >= this.GOAL) {
      this.ended = true;
      api.flash('🏆 Bắt đủ ' + this.GOAL + ' côn trùng!');
      api.finish(true);
    }
  },

  update(dt, api){
    if (this.ended) return;
    this.t += dt;
    this.timeLeft -= dt;
    if (this.msgTimer > 0) this.msgTimer -= dt;
    if (this.pop) {
      this.pop.life -= dt;
      if (this.pop.life <= 0) this.pop = null;
    }

    this.frog.blink -= dt;
    if (this.frog.blink < -0.1) this.frog.blink = 1.6 + Math.random() * 1.8;

    // Thoát (góc trên trái) hoặc phóng lưỡi
    if (api.input.tapX != null) {
      const tx = api.input.tapX, ty = api.input.tapY;
      api.input.tapX = api.input.tapY = null;
      if (tx < 56 && ty < 40) {
        this.ended = true;
        api.finish(false);
        return;
      }
      this.fireTongue(tx, ty, api);
    }

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnBug(api);
      this.spawnT = this.SPAWN_EVERY * (0.75 + Math.random() * 0.5);
    }

    for (let i = this.bugs.length - 1; i >= 0; i--) {
      const b = this.bugs[i];
      if (!b.alive) { this.bugs.splice(i, 1); continue; }
      if (b.enter > 0) b.enter -= dt;
      b.ang += b.orbitSpeed * dt;
      const hopFast = b.kind.id === 'cricket' || b.kind.id === 'grasshopper';
      b.hopT += dt * (hopFast ? 7 : 3.2);
      b.flap += dt * (b.kind.id === 'butterfly' ? 14 : b.kind.id === 'bee' ? 22 : 8);
      const hop = Math.sin(b.hopT) * b.hopAmp;
      let tx = this.frog.x + Math.cos(b.ang) * b.orbitR;
      let ty = this.frog.y + Math.sin(b.ang) * b.orbitR * 0.82 + hop;
      if (b.kind.id === 'bee') {
        tx += Math.sin(b.flap * 0.7) * 14;
        ty += Math.cos(b.flap * 0.9) * 10;
      }
      const dx = tx - b.x, dy = ty - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = b.enter > 0 ? 200 : 145;
      b.x += (dx / d) * speed * dt;
      b.y += (dy / d) * speed * dt;
      b.vx = (dx / d) * speed;
      b.vy = (dy / d) * speed;
    }

    if (this.tongue) {
      const tong = this.tongue;
      if (tong.out) {
        tong.len += this.TONGUE_SPEED * dt;
        if (tong.len >= tong.max) { tong.len = tong.max; tong.out = false; }
      } else {
        tong.len -= this.TONGUE_SPEED * 1.15 * dt;
        if (tong.len <= 0) this.tongue = null;
      }
      if (this.tongue && tong.out && !tong.hit) {
        const tipX = this.frog.x + tong.ux * tong.len;
        const tipY = this.frog.y + tong.uy * tong.len;
        for (const b of this.bugs) {
          if (!b.alive) continue;
          if (Math.hypot(tipX - b.x, tipY - b.y) < b.r + 9) {
            tong.hit = true;
            tong.out = false;
            tong.max = tong.len;
            this.catchBug(b, api);
            break;
          }
        }
      }
    }

    if (Math.random() < dt * 0.7) {
      this.ripples.push({
        x: 20 + Math.random() * (api.W - 40),
        y: 20 + Math.random() * (api.H - 40),
        t: 0,
        life: 1.2 + Math.random(),
      });
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].t += dt;
      if (this.ripples[i].t > this.ripples[i].life) this.ripples.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.ended = true;
      const win = this.scoreCatch >= this.GOAL;
      api.flash(win ? '🏆 Thắng!' : ('⏱ Hết giờ — ' + this.scoreCatch + '/' + this.GOAL));
      api.finish(win);
    }
  },

  onExit(won){
    if (won && typeof startUnlockGate === 'function') startUnlockGate(20);
  },

  drawPad(ctx, pad){
    ctx.save();
    ctx.translate(pad.x, pad.y);
    ctx.rotate(pad.rot);
    ctx.beginPath();
    ctx.arc(0, 0, pad.r, pad.notch, Math.PI * 2 - pad.notch * 0.12);
    ctx.lineTo(0, 0);
    ctx.closePath();
    const g = ctx.createRadialGradient(-pad.r * 0.2, -pad.r * 0.2, 2, 0, 0, pad.r);
    if (pad.home) {
      g.addColorStop(0, '#7dca4a');
      g.addColorStop(1, '#3f8f2e');
    } else {
      g.addColorStop(0, '#5cb84a');
      g.addColorStop(1, '#2f7a32');
    }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,60,30,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },

  drawFlower(ctx, f){
    const bob = Math.sin(this.t * 1.4 + f.phase) * 1.8;
    ctx.save();
    ctx.translate(f.x, f.y + bob);
    ctx.rotate(f.rot);
    ctx.scale(f.s, f.s);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 7, 4, a, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? '#ff6b9d' : '#ff8fb8';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe066';
    ctx.fill();
    ctx.restore();
  },

  drawFrog(ctx){
    const f = this.frog, r = f.r;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.beginPath();
    ctx.ellipse(0, 2, r * 1.05, r * 0.85, 0, 0, Math.PI * 2);
    const body = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 2, 0, 0, r * 1.15);
    body.addColorStop(0, '#8fd84a');
    body.addColorStop(1, '#3d9a2e');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 0.55, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#d8f2a8';
    ctx.fill();
    const eyes = [[-r * 0.45, -r * 0.55], [r * 0.45, -r * 0.55]];
    for (const e of eyes) {
      ctx.beginPath();
      ctx.arc(e[0], e[1], r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#2e7d32';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(e[0], e[1], r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      if (f.blink > 0) {
        ctx.beginPath();
        ctx.arc(e[0] + 1.5, e[1] + 1, r * 0.09, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(e[0], e[1], r * 0.2, 1.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#2e7d32';
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.32, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = '#2a6b24';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  },

  drawTongue(ctx){
    if (!this.tongue) return;
    const tipX = this.frog.x + this.tongue.ux * this.tongue.len;
    const tipY = this.frog.y + this.tongue.uy * this.tongue.len;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.frog.x, this.frog.y + this.frog.r * 0.18);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = '#e85a7a';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.frog.x, this.frog.y + this.frog.r * 0.18);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = '#ff8aa8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tipX, tipY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6b8a';
    ctx.fill();
    ctx.restore();
  },

  drawBug(ctx, b){
    const k = b.kind.id;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx || 1));
    if (k === 'bee') {
      ctx.fillStyle = '#f0c040';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(-3, -5.5, 2.2, 11);
      ctx.fillRect(1, -5.5, 2.2, 11);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(-2, -7, 4.5, 2.5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(2, -7, 4.5, 2.5, 0.4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (k === 'butterfly') {
      const flap = 0.55 + Math.sin(b.flap) * 0.35;
      ctx.fillStyle = b.kind.color;
      ctx.beginPath();
      ctx.ellipse(-7, -2, 7 * flap, 9, -0.4, 0, Math.PI * 2);
      ctx.ellipse(7, -2, 7 * flap, 9, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a2a6a';
      ctx.fillRect(-1.2, -7, 2.4, 14);
    } else if (k === 'beetle') {
      ctx.fillStyle = '#4e342e';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2d1b16';
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.lineTo(0, 6.5);
      ctx.stroke();
      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.arc(-5.5, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (k === 'cricket') {
      ctx.fillStyle = '#6a8f3c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a6b28';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.quadraticCurveTo(11, -9, 14, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-1, -2);
      ctx.lineTo(-7, -9);
      ctx.moveTo(1, -2);
      ctx.lineTo(5, -9);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#8bc34a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#558b2f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(12, -12, 16, 5);
      ctx.stroke();
      ctx.fillStyle = '#689f38';
      ctx.beginPath();
      ctx.arc(-6.5, -1, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  draw(ctx, api){
    // Nước ao
    const g = ctx.createLinearGradient(0, 0, 0, api.H);
    g.addColorStop(0, '#1a6b7a');
    g.addColorStop(0.45, '#148a78');
    g.addColorStop(1, '#0d5c62');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, api.W, api.H);

    const soft = ctx.createRadialGradient(api.W * 0.3, api.H * 0.22, 8, api.W * 0.3, api.H * 0.22, api.W * 0.5);
    soft.addColorStop(0, 'rgba(180,230,220,0.16)');
    soft.addColorStop(1, 'rgba(180,230,220,0)');
    ctx.fillStyle = soft;
    ctx.fillRect(0, 0, api.W, api.H);

    for (const rp of this.ripples) {
      const k = rp.t / rp.life;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, 6 + k * 28, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(220,255,250,' + (0.32 * (1 - k)).toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    for (const pad of this.pads) this.drawPad(ctx, pad);
    for (const f of this.flowers) this.drawFlower(ctx, f);
    for (const b of this.bugs) this.drawBug(ctx, b);
    this.drawTongue(ctx);
    this.drawFrog(ctx);

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px Nunito,system-ui';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('✕', 12, 10);
    ctx.textAlign = 'center';
    ctx.fillText('🐸 ' + this.scoreCatch + '/' + this.GOAL, api.W / 2, 10);
    ctx.textAlign = 'right';
    ctx.fillText('⏱ ' + Math.max(0, Math.ceil(this.timeLeft)) + 's', api.W - 12, 10);

    ctx.textAlign = 'center';
    ctx.font = '600 12px Nunito,system-ui';
    ctx.fillStyle = 'rgba(255,255,240,0.85)';
    ctx.fillText('Chạm để phóng lưỡi', api.W / 2, api.H - 16);

    if (this.msgTimer > 0) {
      ctx.globalAlpha = Math.min(1, this.msgTimer);
      ctx.font = '600 12px Nunito,system-ui';
      ctx.fillStyle = '#fffde7';
      ctx.fillText(this.msg, api.W / 2, 36);
      ctx.globalAlpha = 1;
    }
    if (this.pop) {
      ctx.globalAlpha = Math.min(1, this.pop.life * 2);
      ctx.font = '800 18px Nunito,system-ui';
      ctx.fillStyle = this.pop.color;
      ctx.fillText(this.pop.text, api.W / 2, 58);
      ctx.globalAlpha = 1;
    }
  },
});
