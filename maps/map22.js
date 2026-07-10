// ═══════════════════════════════════════════════════════════════
// maps/map22.js — MAP ẨN 22: "Cẩu cứu heo mùa lũ"
// Lấy cảm hứng từ clip viral TQ: cẩu móc từng con heo trôi giữa dòng lũ.
// Kéo ngón tay để di chuyển xe cẩu ngang trên ray, chạm để thả móc xuống
// vớt heo đang trôi. Vớt trúng rác (gỗ/lốp/thùng) thì mất giờ, để heo
// trôi mất quá nhiều lần thì thua. Chuẩn plugin: chỉ init/update/draw.
// ═══════════════════════════════════════════════════════════════

registerMapModule({
  id: 22,
  name: 'Cẩu cứu heo mùa lũ',
  bgm: 'action',

  init(api){
    this.t = 0;
    this.timeLeft = 28;
    this.goal = 12;
    this.saved = 0;
    this.missed = 0;
    this.maxMissed = 5;

    this.railY = 42;
    this.grabY = 262;
    this.minX = 34;
    this.maxX = 326;

    this.craneX = api.W / 2;
    this.targetX = this.craneX;
    this.clawState = 'idle'; // idle | down | up
    this.clawProgress = 0;
    this.clawY = this.railY;
    this.cooldown = 0;
    this.carrying = null;

    this.objects = [];
    this.spawnTimer = 0.6;
    this.spawnInterval = 1.15;
    this.speed = 70;

    this.rain = Array.from({length: 26}, () => ({
      x: Math.random() * api.W, y: Math.random() * api.H, s: 4 + Math.random() * 5,
    }));

    this.msgTimer = 2.2;
    this.msg = '🌧️ Kéo cẩu, chạm để vớt heo khỏi lũ!';
  },

  spawn(api){
    const roll = Math.random();
    let type, emoji;
    if (roll < 0.62) { type = 'pig'; emoji = '🐷'; }
    else if (roll < 0.72) { type = 'pigGold'; emoji = '🐷'; }
    else {
      const junk = ['🪵', '🛞', '🗑️', '🛢️'];
      type = 'junk'; emoji = junk[Math.floor(Math.random() * junk.length)];
    }
    this.objects.push({
      type, emoji, x: api.W + 24, phase: Math.random() * Math.PI * 2, caught: false,
    });
  },

  update(dt, api){
    this.t += dt;
    this.timeLeft -= dt;
    if (this.msgTimer > 0) this.msgTimer -= dt;

    // ── tốc độ dòng lũ & tần suất trôi tăng dần theo thời gian ──
    this.speed = 70 + Math.min(80, this.t * 2.4);
    this.spawnInterval = Math.max(0.55, 1.15 - this.t * 0.018);

    // ── input: kéo ngón tay để nhắm xe cẩu (chỉ khi móc đang rảnh) ──
    if (this.clawState === 'idle') {
      this.targetX = Math.max(this.minX, Math.min(this.maxX, api.input.x));
      this.craneX += (this.targetX - this.craneX) * Math.min(1, dt * 7);
      if (this.cooldown > 0) this.cooldown -= dt;
    }

    // ── chạm màn hình: thoát hoặc thả móc ──
    if (api.input.tapX != null) {
      const tx = api.input.tapX, ty = api.input.tapY;
      if (tx < 60 && ty < 40) {
        api.input.tapX = api.input.tapY = null;
        api.finish(false);
        return;
      }
      if (this.clawState === 'idle' && this.cooldown <= 0) {
        this.clawState = 'down'; this.clawProgress = 0;
        api.sfx('RopeDrop');
      }
      api.input.tapX = api.input.tapY = null;
    }

    // ── máy trạng thái của móc cẩu ──
    if (this.clawState === 'down') {
      this.clawProgress = Math.min(1, this.clawProgress + dt / 0.32);
      const e = this.clawProgress * (2 - this.clawProgress); // ease-out
      this.clawY = this.railY + (this.grabY - this.railY) * e;
      if (this.clawProgress >= 1) {
        // kiểm tra vớt trúng gì tại vị trí móc
        let best = null, bestD = 26;
        for (const o of this.objects) {
          if (o.caught) continue;
          const d = Math.abs(o.x - this.craneX);
          if (d < bestD) { bestD = d; best = o; }
        }
        if (best) {
          best.caught = true;
          this.carrying = best;
          this.objects.splice(this.objects.indexOf(best), 1);
        } else {
          this.carrying = null;
        }
        this.clawState = 'up'; this.clawProgress = 0;
        api.sfx('RopePull');
      }
    } else if (this.clawState === 'up') {
      this.clawProgress = Math.min(1, this.clawProgress + dt / 0.3);
      const e = this.clawProgress * (2 - this.clawProgress);
      this.clawY = this.grabY + (this.railY - this.grabY) * e;
      if (this.clawProgress >= 1) {
        if (this.carrying) {
          if (this.carrying.type === 'junk') {
            this.timeLeft -= 1.2;
            api.sfx('CatchMiss');
            api.flash('🪵 Vướng rác, mất giờ!');
          } else {
            const gold = this.carrying.type === 'pigGold';
            this.saved++;
            api.addScore(gold ? 20 : 8);
            api.sfx(gold ? 'GoldCollect' : 'CatchGood');
            if (gold) api.flash('✨ Heo vàng! +20');
          }
          this.carrying = null;
        } else {
          api.sfx('CatchMiss');
        }
        this.clawState = 'idle'; this.cooldown = 0.15;
      }
    }

    // ── trôi vật thể trên dòng lũ ──
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawn(api); this.spawnTimer = this.spawnInterval; }

    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i];
      o.x -= this.speed * dt;
      o.phase += dt * 3;
      if (o.x < -24) {
        if (o.type === 'pig' || o.type === 'pigGold') {
          this.missed++;
          if (this.missed % 2 === 0) api.flash('😢 Heo trôi mất rồi!');
        }
        this.objects.splice(i, 1);
      }
    }

    // ── điều kiện thắng / thua ──
    if (this.saved >= this.goal) {
      api.flash('🏆 Cứu đủ ' + this.goal + ' chú heo!');
      api.finish(true);
    } else if (this.missed >= this.maxMissed) {
      api.flash('🌊 Lũ cuốn heo đi mất rồi!');
      api.finish(false);
    } else if (this.timeLeft <= 0) {
      api.flash('⏱ Hết giờ! Cứu ' + this.saved + '/' + this.goal);
      api.finish(this.saved >= this.goal);
    }
  },

  draw(ctx, api){
    const W = api.W, H = api.H;

    // ── trời mưa bão ──
    const sky = ctx.createLinearGradient(0, 0, 0, 130);
    sky.addColorStop(0, '#1b2436'); sky.addColorStop(1, '#33455e');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 130);

    // ── mặt nước lũ đục ngầu ──
    const water = ctx.createLinearGradient(0, 130, 0, H);
    water.addColorStop(0, '#6b5330'); water.addColorStop(1, '#3a2c18');
    ctx.fillStyle = water; ctx.fillRect(0, 130, W, H - 130);

    // gợn sóng
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const y = 160 + i * 60;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const yy = y + Math.sin((x + this.t * 80) * 0.05 + i) * 4;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    // mưa
    ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.lineWidth = 1.5;
    for (const r of this.rain) {
      r.y += r.s * 6 * (1/60);
      if (r.y > H) { r.y = -5; r.x = Math.random() * W; }
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 4, r.y + 10); ctx.stroke();
    }

    // ── vật thể trôi ──
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const o of this.objects) {
      const y = this.grabY + Math.sin(o.phase) * 6;
      if (o.type === 'pigGold') {
        ctx.beginPath(); ctx.fillStyle = 'rgba(255,215,80,0.35)';
        ctx.arc(o.x, y, 20, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = '26px sans-serif';
      ctx.fillText(o.emoji, o.x, y);
    }

    // ── cẩu: ray + xe trượt + dây + móc ──
    ctx.fillStyle = '#7d8798'; ctx.fillRect(0, this.railY - 6, W, 6);
    ctx.fillStyle = '#c8ccd4'; ctx.fillRect(this.craneX - 16, this.railY - 14, 32, 14);

    ctx.strokeStyle = '#cfd3da'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(this.craneX, this.railY); ctx.lineTo(this.craneX, this.clawY); ctx.stroke();

    const open = this.clawState !== 'up' || !this.carrying;
    ctx.strokeStyle = '#e3e6ec'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.craneX - (open ? 12 : 5), this.clawY + 4);
    ctx.lineTo(this.craneX, this.clawY + 12);
    ctx.lineTo(this.craneX + (open ? 12 : 5), this.clawY + 4);
    ctx.stroke();

    if (this.carrying) {
      ctx.font = '24px sans-serif';
      ctx.fillText(this.carrying.emoji, this.craneX, this.clawY + 16);
    }

    // ── thông báo mở màn ──
    if (this.msgTimer > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 190, W - 40, 40);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui';
      ctx.fillText(this.msg, W / 2, 210);
    }

    // ── HUD ──
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'left'; ctx.fillText('✕', 12, 10);
    ctx.textAlign = 'center';
    ctx.fillText('🐷 ' + this.saved + '/' + this.goal + '   😢 ' + this.missed + '/' + this.maxMissed, W / 2, 10);
    ctx.textAlign = 'right'; ctx.fillText('⏱ ' + Math.max(0, Math.ceil(this.timeLeft)) + 's', W - 12, 10);
  },
});
