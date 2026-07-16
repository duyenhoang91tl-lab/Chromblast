// ═══════════════════════════════════════════════════════════════
// maps/map22.js — MAP ẨN 22: "Cẩu cứu heo mùa lũ"
// Heo dễ thương: bắt trúng → cười + bắn tim; trượt → khóc.
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

    this.railY = 48;
    this.grabY = 268;
    this.minX = 36;
    this.maxX = 324;

    this.craneX = api.W / 2;
    this.targetX = this.craneX;
    this.clawState = 'idle'; // idle | down | up
    this.clawProgress = 0;
    this.clawY = this.railY;
    this.cooldown = 0;
    this.carrying = null;

    this.objects = [];
    this.fx = []; // tim / nước mắt bay
    this.spawnTimer = 0.55;
    this.spawnInterval = 1.15;
    this.speed = 70;

    this.rain = Array.from({length: 22}, () => ({
      x: Math.random() * api.W,
      y: Math.random() * api.H,
      s: 3.5 + Math.random() * 4.5,
    }));

    this.msgTimer = 2.4;
    this.msg = '🌧️ Kéo cẩu · Chạm để cứu heo!';
    this.pop = null; // {text, life, color}
  },

  spawn(api){
    const roll = Math.random();
    let type;
    if (roll < 0.62) type = 'pig';
    else if (roll < 0.74) type = 'pigGold';
    else type = 'junk';
    const junkKinds = ['wood', 'tire', 'barrel'];
    this.objects.push({
      type,
      junkKind: type === 'junk' ? junkKinds[(Math.random() * junkKinds.length) | 0] : null,
      x: api.W + 28,
      phase: Math.random() * Math.PI * 2,
      caught: false,
      mood: 'normal', // normal | happy | cry
      moodT: 0,
      bob: 0.85 + Math.random() * 0.3,
      scale: type === 'pigGold' ? 1.08 : 1,
    });
  },

  addHearts(x, y, n){
    for (let i = 0; i < n; i++) {
      this.fx.push({
        kind: 'heart',
        x: x + (Math.random() * 16 - 8),
        y: y + (Math.random() * 8 - 4),
        vx: (Math.random() - 0.5) * 70,
        vy: -90 - Math.random() * 90,
        life: 0.7 + Math.random() * 0.45,
        max: 0.7 + Math.random() * 0.45,
        s: 0.7 + Math.random() * 0.55,
        rot: (Math.random() - 0.5) * 0.8,
      });
    }
  },

  addTears(x, y, n){
    for (let i = 0; i < n; i++) {
      this.fx.push({
        kind: 'tear',
        x: x + (Math.random() * 10 - 5),
        y: y - 4,
        vx: (Math.random() - 0.5) * 20,
        vy: 30 + Math.random() * 50,
        life: 0.55 + Math.random() * 0.3,
        max: 0.55 + Math.random() * 0.3,
        s: 0.8 + Math.random() * 0.4,
      });
    }
  },

  showPop(text, color){
    this.pop = { text, life: 1.2, color: color || '#fff' };
  },

  update(dt, api){
    this.t += dt;
    this.timeLeft -= dt;
    if (this.msgTimer > 0) this.msgTimer -= dt;
    if (this.pop) {
      this.pop.life -= dt;
      if (this.pop.life <= 0) this.pop = null;
    }

    this.speed = 70 + Math.min(80, this.t * 2.4);
    this.spawnInterval = Math.max(0.55, 1.15 - this.t * 0.018);

    if (this.clawState === 'idle') {
      this.targetX = Math.max(this.minX, Math.min(this.maxX, api.input.x));
      this.craneX += (this.targetX - this.craneX) * Math.min(1, dt * 8);
      if (this.cooldown > 0) this.cooldown -= dt;
    }

    if (api.input.tapX != null) {
      const tx = api.input.tapX, ty = api.input.tapY;
      if (tx < 60 && ty < 42) {
        api.input.tapX = api.input.tapY = null;
        api.finish(false);
        return;
      }
      if (this.clawState === 'idle' && this.cooldown <= 0) {
        this.clawState = 'down';
        this.clawProgress = 0;
        api.sfx('RopeDrop');
      }
      api.input.tapX = api.input.tapY = null;
    }

    if (this.clawState === 'down') {
      this.clawProgress = Math.min(1, this.clawProgress + dt / 0.3);
      const e = this.clawProgress * (2 - this.clawProgress);
      this.clawY = this.railY + (this.grabY - this.railY) * e;
      if (this.clawProgress >= 1) {
        let best = null, bestD = 30;
        for (const o of this.objects) {
          if (o.caught) continue;
          const d = Math.abs(o.x - this.craneX);
          if (d < bestD) { bestD = d; best = o; }
        }
        if (best) {
          best.caught = true;
          this.carrying = best;
          this.objects.splice(this.objects.indexOf(best), 1);
          if (best.type === 'pig' || best.type === 'pigGold') {
            best.mood = 'happy';
            best.moodT = 1.2;
            this.addHearts(this.craneX, this.clawY + 18, best.type === 'pigGold' ? 8 : 5);
          }
        } else {
          this.carrying = null;
        }
        this.clawState = 'up';
        this.clawProgress = 0;
        api.sfx('RopePull');
      }
    } else if (this.clawState === 'up') {
      this.clawProgress = Math.min(1, this.clawProgress + dt / 0.28);
      const e = this.clawProgress * (2 - this.clawProgress);
      this.clawY = this.grabY + (this.railY - this.grabY) * e;
      if (this.carrying && (this.carrying.type === 'pig' || this.carrying.type === 'pigGold')) {
        // tim liên tục khi kéo lên
        if (Math.random() < dt * 8) {
          this.addHearts(this.craneX + (Math.random() * 10 - 5), this.clawY + 14, 1);
        }
      }
      if (this.clawProgress >= 1) {
        if (this.carrying) {
          if (this.carrying.type === 'junk') {
            this.timeLeft -= 1.2;
            api.sfx('CatchMiss');
            this.showPop('🪵 Vướng rác −1.2s', '#ffb080');
          } else {
            const gold = this.carrying.type === 'pigGold';
            this.saved++;
            api.addScore(gold ? 20 : 8);
            api.sfx(gold ? 'GoldCollect' : 'CatchGood');
            this.addHearts(this.craneX, this.railY + 20, gold ? 10 : 6);
            this.showPop(gold ? '✨ Heo vàng! +20' : '🐷 Cứu được rồi! +8', gold ? '#ffe566' : '#ff9ec8');
          }
          this.carrying = null;
        } else {
          api.sfx('CatchMiss');
        }
        this.clawState = 'idle';
        this.cooldown = 0.12;
      }
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn(api);
      this.spawnTimer = this.spawnInterval;
    }

    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i];
      o.x -= this.speed * dt;
      o.phase += dt * 2.6;
      if (o.moodT > 0) o.moodT -= dt;
      if (o.x < -30) {
        if (o.type === 'pig' || o.type === 'pigGold') {
          this.missed++;
          o.mood = 'cry';
          this.addTears(8, this.grabY, 6);
          this.showPop('😢 Heo trôi mất…', '#9ec8ff');
          api.sfx('CatchMiss');
        }
        this.objects.splice(i, 1);
      }
    }

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const p = this.fx[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'heart') p.vy += 40 * dt;
      else p.vy += 90 * dt;
      if (p.life <= 0) this.fx.splice(i, 1);
    }

    if (this.saved >= this.goal) {
      this.showPop('🏆 Cứu đủ ' + this.goal + ' chú heo!', '#ffe566');
      api.finish(true);
    } else if (this.missed >= this.maxMissed) {
      this.showPop('🌊 Lũ cuốn heo đi mất!', '#ff8a8a');
      api.finish(false);
    } else if (this.timeLeft <= 0) {
      this.showPop('⏱ Hết giờ! ' + this.saved + '/' + this.goal, '#fff');
      api.finish(this.saved >= this.goal);
    }
  },

  /** Vẽ heo dễ thương — mood: normal | happy | cry */
  drawPig(ctx, x, y, opts){
    opts = opts || {};
    const gold = !!opts.gold;
    const mood = opts.mood || 'normal';
    const s = (opts.scale || 1) * 1.05;
    const t = opts.t || 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (mood === 'happy') ctx.rotate(Math.sin(t * 10) * 0.08);
    if (mood === 'cry') ctx.rotate(Math.sin(t * 6) * 0.05);

    // bóng dưới nước
    ctx.fillStyle = 'rgba(20,30,50,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // glow heo vàng
    if (gold) {
      ctx.fillStyle = 'rgba(255,215,80,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    const body = gold
      ? ['#FFE08A', '#F5C84A', '#E8A820']
      : ['#FFB6C8', '#FF8FAB', '#F07090'];

    // tai
    const ear = (ox, flip) => {
      ctx.save();
      ctx.translate(ox, -12);
      ctx.scale(flip, 1);
      ctx.rotate(-0.35);
      ctx.fillStyle = body[1];
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gold ? '#FFD0A0' : '#FF9EBE';
      ctx.beginPath();
      ctx.ellipse(0, 1, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    ear(-11, 1);
    ear(11, -1);

    // thân
    const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, 18);
    g.addColorStop(0, body[0]);
    g.addColorStop(0.55, body[1]);
    g.addColorStop(1, body[2]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 1, 16, 14.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // má hồng
    ctx.fillStyle = gold ? 'rgba(255,160,80,0.35)' : 'rgba(255,120,150,0.4)';
    ctx.beginPath(); ctx.ellipse(-9, 3, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, 3, 4, 3, 0, 0, Math.PI * 2); ctx.fill();

    // mắt
    if (mood === 'happy') {
      // cười nheo mắt ^ ^
      ctx.strokeStyle = '#3a2040';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-5.5, -2, 3.2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(5.5, -2, 3.2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === 'cry') {
      // mắt khóc hình giọt
      ctx.fillStyle = '#3a2040';
      ctx.beginPath(); ctx.ellipse(-5.5, -1.5, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5.5, -1.5, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-6.2, -2.5, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4.8, -2.5, 1, 0, Math.PI * 2); ctx.fill();
      // nước mắt
      ctx.fillStyle = 'rgba(120,190,255,0.9)';
      ctx.beginPath(); ctx.ellipse(-5.5, 5 + Math.sin(t * 8) * 1.5, 1.6, 3.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5.5, 6 + Math.cos(t * 7) * 1.5, 1.6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // mắt tròn dễ thương
      ctx.fillStyle = '#3a2040';
      ctx.beginPath(); ctx.arc(-5.5, -2, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5.5, -2, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-6.3, -2.9, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4.7, -2.9, 1.1, 0, Math.PI * 2); ctx.fill();
    }

    // mõm
    ctx.fillStyle = gold ? '#FFE8B8' : '#FFD0DC';
    ctx.beginPath();
    ctx.ellipse(0, 6, 7.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gold ? '#E8A860' : '#E888A8';
    ctx.beginPath(); ctx.ellipse(-2.4, 6, 1.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.4, 6, 1.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();

    // miệng
    ctx.strokeStyle = gold ? '#C87830' : '#D06080';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (mood === 'happy') {
      ctx.arc(0, 8.5, 3.2, 0.15, Math.PI - 0.15);
    } else if (mood === 'cry') {
      ctx.arc(0, 11, 2.8, Math.PI + 0.2, -0.2);
    } else {
      ctx.moveTo(-2.5, 9.5);
      ctx.quadraticCurveTo(0, 10.5, 2.5, 9.5);
    }
    ctx.stroke();

    // ngôi sao heo vàng
    if (gold) {
      ctx.fillStyle = '#fff6b0';
      ctx.font = 'bold 10px Nunito,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 10, -12);
    }

    ctx.restore();
  },

  drawJunk(ctx, x, y, kind, phase){
    ctx.save();
    ctx.translate(x, y + Math.sin(phase) * 3);
    ctx.rotate(Math.sin(phase * 0.7) * 0.12);
    if (kind === 'wood') {
      ctx.fillStyle = '#A67C52';
      ctx.fillRect(-14, -5, 28, 10);
      ctx.fillStyle = '#8B5E3C';
      ctx.fillRect(-14, -5, 28, 3);
      ctx.strokeStyle = 'rgba(60,30,10,0.35)';
      ctx.strokeRect(-14, -5, 28, 10);
    } else if (kind === 'tire') {
      ctx.fillStyle = '#2a2a32';
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a4a55';
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#5A7A8A';
      ctx.fillRect(-8, -11, 16, 20);
      ctx.fillStyle = '#3A5060';
      ctx.fillRect(-9, -13, 18, 4);
    }
    ctx.restore();
  },

  drawHeart(ctx, x, y, s, a){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#FF5A8A';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-8, -2, -8, -8, -3, -8);
    ctx.bezierCurveTo(0, -8, 0, -5, 0, -5);
    ctx.bezierCurveTo(0, -5, 0, -8, 3, -8);
    ctx.bezierCurveTo(8, -8, 8, -2, 0, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-2.5, -5, 1.5, 1, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  drawCrane(ctx){
    const x = this.craneX;
    const ry = this.railY;

    // ray
    ctx.fillStyle = '#9AA8BC';
    ctx.fillRect(0, ry - 5, 360, 5);
    ctx.fillStyle = '#C5D0E0';
    ctx.fillRect(0, ry - 8, 360, 3);
    // chốt ray
    for (let i = 20; i < 360; i += 40) {
      ctx.fillStyle = '#7A889C';
      ctx.fillRect(i - 2, ry - 10, 4, 8);
    }

    // cabin dễ thương
    const cabY = ry - 22;
    ctx.fillStyle = '#FF8FAB';
    roundRect(ctx, x - 18, cabY, 36, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#FFE0EA';
    roundRect(ctx, x - 12, cabY + 4, 14, 8, 3);
    ctx.fill();
    // đèn
    ctx.fillStyle = '#FFE566';
    ctx.beginPath(); ctx.arc(x + 12, cabY + 8, 3, 0, Math.PI * 2); ctx.fill();

    // cần
    ctx.strokeStyle = '#D0D8E8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, ry);
    ctx.lineTo(x, this.clawY);
    ctx.stroke();
    // highlight dây
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 1, ry);
    ctx.lineTo(x - 1, this.clawY);
    ctx.stroke();

    // móc
    const open = this.clawState !== 'up' || !this.carrying;
    const spread = open ? 13 : 5;
    ctx.strokeStyle = '#F0F4FA';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - spread, this.clawY + 2);
    ctx.quadraticCurveTo(x - 4, this.clawY + 14, x, this.clawY + 16);
    ctx.quadraticCurveTo(x + 4, this.clawY + 14, x + spread, this.clawY + 2);
    ctx.stroke();
    // chấm móc
    ctx.fillStyle = '#FFD24A';
    ctx.beginPath();
    ctx.arc(x, this.clawY + 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  },

  drawHud(ctx, api){
    const W = api.W;
    // top bar soft
    ctx.fillStyle = 'rgba(15,20,40,0.45)';
    roundRect(ctx, 8, 6, W - 16, 30, 12);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Nunito,system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', 18, 21);

    // saved pill
    ctx.fillStyle = 'rgba(255,140,180,0.35)';
    roundRect(ctx, W / 2 - 88, 10, 72, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Nunito,system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🐷 ' + this.saved + '/' + this.goal, W / 2 - 52, 21);

    // missed pill
    ctx.fillStyle = 'rgba(120,170,255,0.3)';
    roundRect(ctx, W / 2 - 8, 10, 72, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('😢 ' + this.missed + '/' + this.maxMissed, W / 2 + 28, 21);

    // timer
    ctx.textAlign = 'right';
    ctx.fillStyle = this.timeLeft < 8 ? '#ffb0b0' : '#fff';
    ctx.fillText('⏱ ' + Math.max(0, Math.ceil(this.timeLeft)) + 's', W - 18, 21);
  },

  draw(ctx, api){
    const W = api.W, H = api.H;

    // nền bão mềm hơn
    scenicStormBg(ctx, W, H, this.t);
    // lớp nước sáng hơn ở mặt
    const foam = ctx.createLinearGradient(0, this.grabY - 40, 0, this.grabY + 50);
    foam.addColorStop(0, 'rgba(180,210,255,0)');
    foam.addColorStop(0.45, 'rgba(200,230,255,0.12)');
    foam.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = foam;
    ctx.fillRect(0, this.grabY - 40, W, 100);

    // mưa nhẹ
    ctx.strokeStyle = 'rgba(210,230,255,0.28)';
    ctx.lineWidth = 1.2;
    for (const r of this.rain) {
      r.y += r.s * 5.5 * (1 / 60);
      if (r.y > H) { r.y = -6; r.x = Math.random() * W; }
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 3, r.y + 9);
      ctx.stroke();
    }

    // vật thể
    for (const o of this.objects) {
      const y = this.grabY + Math.sin(o.phase) * 7 * o.bob;
      if (o.type === 'junk') {
        this.drawJunk(ctx, o.x, y, o.junkKind, o.phase);
      } else {
        let mood = o.mood;
        if (mood !== 'normal' && o.moodT <= 0) mood = 'normal';
        // sắp trôi mất → sắp khóc
        if (mood === 'normal' && o.x < 55) mood = 'cry';
        this.drawPig(ctx, o.x, y, {
          gold: o.type === 'pigGold',
          mood,
          scale: o.scale,
          t: this.t + o.phase,
        });
      }
    }

    // cẩu
    this.drawCrane(ctx);

    // heo đang gắp
    if (this.carrying) {
      if (this.carrying.type === 'junk') {
        this.drawJunk(ctx, this.craneX, this.clawY + 22, this.carrying.junkKind, this.t * 4);
      } else {
        this.drawPig(ctx, this.craneX, this.clawY + 24, {
          gold: this.carrying.type === 'pigGold',
          mood: 'happy',
          scale: (this.carrying.scale || 1) * 1.05,
          t: this.t,
        });
      }
    }

    // FX tim / nước mắt
    for (const p of this.fx) {
      const a = Math.max(0, p.life / p.max);
      if (p.kind === 'heart') {
        this.drawHeart(ctx, p.x, p.y, p.s, a);
      } else {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#7EC8FF';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 2.2 * p.s, 3.8 * p.s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // hướng dẫn mở màn
    if (this.msgTimer > 0) {
      const a = Math.min(1, this.msgTimer);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(20,15,40,0.62)';
      roundRect(ctx, 28, 178, W - 56, 44, 14);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Nunito,system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.msg, W / 2, 200);
      ctx.restore();
    }

    // popup thưởng / miss
    if (this.pop) {
      const a = Math.min(1, this.pop.life * 2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      roundRect(ctx, 50, 130, W - 100, 36, 12);
      ctx.fill();
      ctx.fillStyle = this.pop.color;
      ctx.font = 'bold 15px Nunito,system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.pop.text, W / 2, 148);
      ctx.restore();
    }

    this.drawHud(ctx, api);
  },
});

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
