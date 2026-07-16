// ═══════════════════════════════════════════════════════════════
// maps/map22.js — MAP ẨN 22: "Cẩu cứu heo mùa lũ"
// Heo đốm +3 · Heo hồng +10 · Heo vàng +30
// Cá sấu giả heo −10 · Rác −3 · Khung cửa −5
// Bắt heo thật → cười + bắn tim; trượt → khóc.
// ═══════════════════════════════════════════════════════════════

registerMapModule({
  id: 22,
  name: 'Cẩu cứu heo mùa lũ',
  bgm: 'action',

  // Bảng điểm
  SCORE: {
    pigSpot: 3,
    pigPink: 10,
    pigGold: 30,
    crocPig: -10,
    junk: -3,
    door: -5,
  },

  init(api){
    this.t = 0;
    this.timeLeft = 32;
    this.goal = 12; // cứu đủ số heo thật
    this.saved = 0;
    this.missed = 0;
    this.maxMissed = 5;
    this.scoreSum = 0;

    this.railY = 48;
    this.grabY = 268;
    this.minX = 36;
    this.maxX = 324;

    this.craneX = api.W / 2;
    this.targetX = this.craneX;
    this.clawState = 'idle';
    this.clawProgress = 0;
    this.clawY = this.railY;
    this.cooldown = 0;
    this.carrying = null;

    this.objects = [];
    this.fx = [];
    this.spawnTimer = 0.5;
    this.spawnInterval = 1.1;
    this.speed = 70;

    this.rain = Array.from({length: 22}, () => ({
      x: Math.random() * api.W,
      y: Math.random() * api.H,
      s: 3.5 + Math.random() * 4.5,
    }));

    this.msgTimer = 2.8;
    this.msg = '🐷 Đốm+3 · Hồng+10 · Vàng+30 · ⚠️ Giả−10 · Rác−3 · Cửa−5';
    this.pop = null;
  },

  isRealPig(type){
    return type === 'pigSpot' || type === 'pigPink' || type === 'pigGold';
  },

  spawn(api){
    const roll = Math.random();
    let type;
    // Tỉ lệ: đốm nhiều · hồng vừa · vàng hiếm · cá sấu · rác · cửa
    if (roll < 0.28) type = 'pigSpot';
    else if (roll < 0.50) type = 'pigPink';
    else if (roll < 0.60) type = 'pigGold';
    else if (roll < 0.74) type = 'crocPig';
    else if (roll < 0.88) type = 'junk';
    else type = 'door';

    const junkKinds = ['wood', 'tire', 'barrel'];
    this.objects.push({
      type,
      junkKind: type === 'junk' ? junkKinds[(Math.random() * junkKinds.length) | 0] : null,
      x: api.W + 30,
      phase: Math.random() * Math.PI * 2,
      caught: false,
      mood: 'normal',
      moodT: 0,
      bob: 0.85 + Math.random() * 0.3,
      scale: type === 'pigGold' ? 1.1 : (type === 'pigSpot' ? 0.95 : 1),
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

  addAnger(x, y, n){
    for (let i = 0; i < n; i++) {
      this.fx.push({
        kind: 'anger',
        x: x + (Math.random() * 14 - 7),
        y: y - 6,
        vx: (Math.random() - 0.5) * 40,
        vy: -50 - Math.random() * 40,
        life: 0.5 + Math.random() * 0.25,
        max: 0.5 + Math.random() * 0.25,
        s: 0.9,
      });
    }
  },

  showPop(text, color){
    this.pop = { text, life: 1.15, color: color || '#fff' };
  },

  applyCatch(api, o){
    const pts = this.SCORE[o.type] || 0;
    this.scoreSum += pts;
    if (pts !== 0) api.addScore(pts);

    if (this.isRealPig(o.type)) {
      this.saved++;
      o.mood = 'happy';
      const hearts = o.type === 'pigGold' ? 10 : (o.type === 'pigPink' ? 6 : 4);
      this.addHearts(this.craneX, this.railY + 18, hearts);
      api.sfx(o.type === 'pigGold' ? 'GoldCollect' : 'CatchGood');
      const label =
        o.type === 'pigGold' ? '✨ Heo vàng +30' :
        o.type === 'pigPink' ? '🐷 Heo hồng +10' :
        '🖤 Heo đốm +3';
      this.showPop(label, o.type === 'pigGold' ? '#ffe566' : '#ff9ec8');
    } else if (o.type === 'crocPig') {
      o.mood = 'angry';
      this.addAnger(this.craneX, this.railY + 16, 5);
      api.sfx('CatchMiss');
      this.showPop('🐊 Cá sấu giả heo −10!', '#ff6b6b');
    } else if (o.type === 'junk') {
      api.sfx('CatchMiss');
      this.showPop('🗑️ Rác −3', '#ffb080');
    } else if (o.type === 'door') {
      api.sfx('CatchMiss');
      this.showPop('🚪 Khung cửa −5', '#c0a080');
    }
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
    this.spawnInterval = Math.max(0.52, 1.1 - this.t * 0.018);

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
        let best = null, bestD = 32;
        for (const o of this.objects) {
          if (o.caught) continue;
          const d = Math.abs(o.x - this.craneX);
          if (d < bestD) { bestD = d; best = o; }
        }
        if (best) {
          best.caught = true;
          this.carrying = best;
          this.objects.splice(this.objects.indexOf(best), 1);
          if (this.isRealPig(best.type)) {
            best.mood = 'happy';
            best.moodT = 1.2;
            this.addHearts(this.craneX, this.clawY + 18, best.type === 'pigGold' ? 7 : 4);
          } else if (best.type === 'crocPig') {
            best.mood = 'anger';
            best.moodT = 1.2;
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
      if (this.carrying && this.isRealPig(this.carrying.type)) {
        if (Math.random() < dt * 8) {
          this.addHearts(this.craneX + (Math.random() * 10 - 5), this.clawY + 14, 1);
        }
      }
      if (this.clawProgress >= 1) {
        if (this.carrying) this.applyCatch(api, this.carrying);
        else api.sfx('CatchMiss');
        this.carrying = null;
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
      if (o.x < -36) {
        if (this.isRealPig(o.type)) {
          this.missed++;
          this.addTears(10, this.grabY, 6);
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
      if (p.kind === 'heart' || p.kind === 'anger') p.vy += 40 * dt;
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

  /**
   * variant: pink | spot | gold | croc
   * mood: normal | happy | cry | anger
   */
  drawPig(ctx, x, y, opts){
    opts = opts || {};
    const variant = opts.variant || 'pink';
    const mood = opts.mood || 'normal';
    const s = (opts.scale || 1) * 1.05;
    const t = opts.t || 0;
    const isGold = variant === 'gold';
    const isSpot = variant === 'spot';
    const isCroc = variant === 'croc';

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (mood === 'happy') ctx.rotate(Math.sin(t * 10) * 0.08);
    if (mood === 'cry') ctx.rotate(Math.sin(t * 6) * 0.05);
    if (mood === 'anger') ctx.rotate(Math.sin(t * 14) * 0.1);

    // bóng
    ctx.fillStyle = 'rgba(20,30,50,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isGold) {
      ctx.fillStyle = 'rgba(255,215,80,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    // đuôi cá sấu (vẽ trước thân, phía sau)
    if (isCroc) {
      ctx.fillStyle = '#3D8B4A';
      ctx.beginPath();
      ctx.moveTo(12, 4);
      ctx.quadraticCurveTo(28, 2, 34, 10);
      ctx.quadraticCurveTo(30, 14, 18, 12);
      ctx.quadraticCurveTo(14, 10, 12, 6);
      ctx.closePath();
      ctx.fill();
      // gai đuôi
      ctx.fillStyle = '#2A6A35';
      for (let i = 0; i < 3; i++) {
        const tx = 18 + i * 5;
        const ty = 3 + i * 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + 2, ty - 5);
        ctx.lineTo(tx + 4, ty + 1);
        ctx.closePath();
        ctx.fill();
      }
      // vằn đuôi
      ctx.strokeStyle = 'rgba(20,60,30,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(16, 6); ctx.lineTo(20, 11);
      ctx.moveTo(22, 7); ctx.lineTo(26, 12);
      ctx.stroke();
    }

    let body;
    if (isGold) body = ['#FFE08A', '#F5C84A', '#E8A820'];
    else if (isSpot) body = ['#F5F5F5', '#E8E8E8', '#D0D0D0'];
    else body = ['#FFB6C8', '#FF8FAB', '#F07090'];

    // tai
    const earInner = isGold ? '#FFD0A0' : (isSpot ? '#FFB0C0' : '#FF9EBE');
    const ear = (ox, flip) => {
      ctx.save();
      ctx.translate(ox, -12);
      ctx.scale(flip, 1);
      ctx.rotate(-0.35);
      ctx.fillStyle = isSpot ? '#2A2A2A' : body[1];
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = earInner;
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

    // đốm đen trắng
    if (isSpot) {
      ctx.fillStyle = '#2A2A2A';
      [[-7, -4, 5, 4.5], [6, 2, 4.5, 4], [-2, 8, 3.5, 3], [8, -6, 3, 2.8]].forEach(([sx, sy, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(sx, sy, rx, ry, 0.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // má
    if (!isSpot) {
      ctx.fillStyle = isGold ? 'rgba(255,160,80,0.35)' : 'rgba(255,120,150,0.4)';
      ctx.beginPath(); ctx.ellipse(-9, 3, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, 3, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,140,160,0.35)';
      ctx.beginPath(); ctx.ellipse(-9, 3, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, 3, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }

    // mắt
    if (mood === 'happy') {
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
      ctx.fillStyle = '#3a2040';
      ctx.beginPath(); ctx.ellipse(-5.5, -1.5, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5.5, -1.5, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-6.2, -2.5, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4.8, -2.5, 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(120,190,255,0.9)';
      ctx.beginPath(); ctx.ellipse(-5.5, 5 + Math.sin(t * 8) * 1.5, 1.6, 3.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5.5, 6 + Math.cos(t * 7) * 1.5, 1.6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    } else if (mood === 'anger') {
      // mắt cá sấu giận
      ctx.fillStyle = '#1a3020';
      ctx.beginPath(); ctx.ellipse(-5.5, -2, 3.2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5.5, -2, 3.2, 2.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7CFF4A';
      ctx.beginPath(); ctx.arc(-5.5, -2, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5.5, -2, 1.4, 0, Math.PI * 2); ctx.fill();
      // lông mày giận
      ctx.strokeStyle = '#1a3020';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-3, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, -6); ctx.lineTo(3, -4); ctx.stroke();
    } else {
      ctx.fillStyle = isCroc ? '#1a3020' : '#3a2040';
      ctx.beginPath(); ctx.arc(-5.5, -2, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5.5, -2, 2.8, 0, Math.PI * 2); ctx.fill();
      if (isCroc) {
        ctx.fillStyle = '#7CFF4A';
        ctx.beginPath(); ctx.arc(-5.5, -2, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(5.5, -2, 1.2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-6.3, -2.9, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4.7, -2.9, 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }

    // mõm
    ctx.fillStyle = isGold ? '#FFE8B8' : (isSpot ? '#FFD0DC' : '#FFD0DC');
    ctx.beginPath();
    ctx.ellipse(0, 6, 7.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isGold ? '#E8A860' : '#E888A8';
    ctx.beginPath(); ctx.ellipse(-2.4, 6, 1.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.4, 6, 1.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();

    // miệng / răng cá sấu
    ctx.strokeStyle = isGold ? '#C87830' : '#D06080';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (mood === 'happy') {
      ctx.arc(0, 8.5, 3.2, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else if (mood === 'cry') {
      ctx.arc(0, 11, 2.8, Math.PI + 0.2, -0.2);
      ctx.stroke();
    } else if (isCroc || mood === 'anger') {
      ctx.strokeStyle = '#1a3020';
      ctx.moveTo(-4, 9.5); ctx.lineTo(4, 9.5);
      ctx.stroke();
      // răng nhỏ
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(-3, 9.5); ctx.lineTo(-2, 12); ctx.lineTo(-1, 9.5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1, 9.5); ctx.lineTo(2, 12); ctx.lineTo(3, 9.5); ctx.fill();
    } else {
      ctx.moveTo(-2.5, 9.5);
      ctx.quadraticCurveTo(0, 10.5, 2.5, 9.5);
      ctx.stroke();
    }

    if (isGold) {
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
    // nhãn −3
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, -10, 12, 20, 11, 4);
    ctx.fill();
    ctx.fillStyle = '#ffb0a0';
    ctx.font = 'bold 9px Nunito,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('−3', 0, 17.5);
    ctx.restore();
  },

  drawDoor(ctx, x, y, phase){
    ctx.save();
    ctx.translate(x, y + Math.sin(phase) * 4);
    ctx.rotate(Math.sin(phase * 0.5) * 0.08);
    // khung cửa gỗ
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-14, -18, 6, 36);
    ctx.fillRect(8, -18, 6, 36);
    ctx.fillRect(-14, -18, 28, 6);
    ctx.fillRect(-14, 12, 28, 6);
    // lỗ giữa
    ctx.fillStyle = 'rgba(40,60,90,0.35)';
    ctx.fillRect(-8, -12, 16, 24);
    // tay nắm
    ctx.fillStyle = '#E8C860';
    ctx.beginPath(); ctx.arc(4, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    // nhãn −5
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, -12, 20, 24, 12, 4);
    ctx.fill();
    ctx.fillStyle = '#ffd0a0';
    ctx.font = 'bold 9px Nunito,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('−5', 0, 26);
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

  pigVariant(type){
    if (type === 'pigSpot') return 'spot';
    if (type === 'pigGold') return 'gold';
    if (type === 'crocPig') return 'croc';
    return 'pink';
  },

  drawObject(ctx, o, x, y){
    if (o.type === 'junk') {
      this.drawJunk(ctx, x, y, o.junkKind, o.phase);
      return;
    }
    if (o.type === 'door') {
      this.drawDoor(ctx, x, y, o.phase);
      return;
    }
    let mood = o.mood;
    if (mood !== 'normal' && o.moodT <= 0) mood = 'normal';
    if (this.isRealPig(o.type) && mood === 'normal' && o.x < 55) mood = 'cry';
    this.drawPig(ctx, x, y, {
      variant: this.pigVariant(o.type),
      mood,
      scale: o.scale,
      t: this.t + o.phase,
    });
  },

  drawCrane(ctx){
    const x = this.craneX;
    const ry = this.railY;

    ctx.fillStyle = '#9AA8BC';
    ctx.fillRect(0, ry - 5, 360, 5);
    ctx.fillStyle = '#C5D0E0';
    ctx.fillRect(0, ry - 8, 360, 3);
    for (let i = 20; i < 360; i += 40) {
      ctx.fillStyle = '#7A889C';
      ctx.fillRect(i - 2, ry - 10, 4, 8);
    }

    const cabY = ry - 22;
    ctx.fillStyle = '#FF8FAB';
    roundRect(ctx, x - 18, cabY, 36, 18, 6);
    ctx.fill();
    ctx.fillStyle = '#FFE0EA';
    roundRect(ctx, x - 12, cabY + 4, 14, 8, 3);
    ctx.fill();
    ctx.fillStyle = '#FFE566';
    ctx.beginPath(); ctx.arc(x + 12, cabY + 8, 3, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#D0D8E8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, ry);
    ctx.lineTo(x, this.clawY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 1, ry);
    ctx.lineTo(x - 1, this.clawY);
    ctx.stroke();

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
    ctx.fillStyle = '#FFD24A';
    ctx.beginPath();
    ctx.arc(x, this.clawY + 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  },

  drawHud(ctx, api){
    const W = api.W;
    ctx.fillStyle = 'rgba(15,20,40,0.48)';
    roundRect(ctx, 8, 6, W - 16, 30, 12);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Nunito,system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', 18, 21);

    ctx.fillStyle = 'rgba(255,140,180,0.35)';
    roundRect(ctx, W / 2 - 100, 10, 70, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Nunito,system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🐷 ' + this.saved + '/' + this.goal, W / 2 - 65, 21);

    ctx.fillStyle = 'rgba(120,170,255,0.3)';
    roundRect(ctx, W / 2 - 24, 10, 62, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('😢 ' + this.missed + '/' + this.maxMissed, W / 2 + 7, 21);

    ctx.textAlign = 'right';
    ctx.fillStyle = this.timeLeft < 8 ? '#ffb0b0' : '#fff';
    ctx.fillText('⏱ ' + Math.max(0, Math.ceil(this.timeLeft)) + 's', W - 18, 21);
  },

  draw(ctx, api){
    const W = api.W, H = api.H;

    scenicStormBg(ctx, W, H, this.t);
    const foam = ctx.createLinearGradient(0, this.grabY - 40, 0, this.grabY + 50);
    foam.addColorStop(0, 'rgba(180,210,255,0)');
    foam.addColorStop(0.45, 'rgba(200,230,255,0.12)');
    foam.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = foam;
    ctx.fillRect(0, this.grabY - 40, W, 100);

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

    for (const o of this.objects) {
      const y = this.grabY + Math.sin(o.phase) * 7 * o.bob;
      this.drawObject(ctx, o, o.x, y);
    }

    this.drawCrane(ctx);

    if (this.carrying) {
      this.drawObject(ctx, this.carrying, this.craneX, this.clawY + 24);
    }

    for (const p of this.fx) {
      const a = Math.max(0, p.life / p.max);
      if (p.kind === 'heart') {
        this.drawHeart(ctx, p.x, p.y, p.s, a);
      } else if (p.kind === 'anger') {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold ' + (12 * p.s) + 'px Nunito,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💢', p.x, p.y);
        ctx.restore();
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

    if (this.msgTimer > 0) {
      const a = Math.min(1, this.msgTimer);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(20,15,40,0.65)';
      roundRect(ctx, 16, 168, W - 32, 52, 14);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Nunito,system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.msg, W / 2, 186);
      ctx.font = 'bold 11px Nunito,system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('🗑️ Rác −3 · 🚪 Cửa −5 · Kéo & chạm để gắp', W / 2, 206);
      ctx.restore();
    }

    if (this.pop) {
      const a = Math.min(1, this.pop.life * 2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      roundRect(ctx, 40, 128, W - 80, 36, 12);
      ctx.fill();
      ctx.fillStyle = this.pop.color;
      ctx.font = 'bold 14px Nunito,system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.pop.text, W / 2, 146);
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
