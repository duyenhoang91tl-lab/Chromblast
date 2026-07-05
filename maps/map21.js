// ═══════════════════════════════════════════════════════════════
// maps/map21.js — MAP CHUẨN PLUGIN (mẫu / template cho map mới)
// Chỉ làm 1 việc: init/update/draw. Engine (mapManager) lo canvas, vòng
// lặp, dt, input, thoát. Thêm map mới = copy file này + 1 dòng đăng ký
// trong mapManager.js. KHÔNG đụng engine / board / UI / audio.
//
//   api.W, api.H          kích thước logic (360×460)
//   api.input.{x,y,down}  vị trí con trỏ; api.input.tapX/tapY: lần chạm mới
//   api.addScore(n)       cộng điểm vào engine
//   api.sfx('Match')      gọi âm thanh sẵn có (sfxMatch...)
//   api.flash('...')      hiện thông báo giữa màn
//   api.finish(won)       kết thúc map, về bàn chính (won=false sẽ hoàn điểm)
// ═══════════════════════════════════════════════════════════════

registerMapModule({
  id: 21,
  name: 'Chạm mục tiêu (mẫu)',
  bgm: 'action',

  init(api){
    this.t = 0;
    this.timeLeft = 20;
    this.hits = 0;
    this.goal = 10;
    this.target = { x: 180, y: 230, r: 26 };
  },

  update(dt, api){
    this.t += dt;
    this.timeLeft -= dt;
    // mục tiêu lượn quanh màn
    this.target.x = 180 + Math.sin(this.t * 1.3) * 120;
    this.target.y = 200 + Math.cos(this.t * 0.9) * 120;

    // xử lý chạm
    if (api.input.tapX != null) {
      const d = Math.hypot(api.input.tapX - this.target.x, api.input.tapY - this.target.y);
      if (d < this.target.r + 8) {
        this.hits++; api.addScore(5); api.sfx('Match');
        if (this.hits >= this.goal) { api.flash('🏆 Đạt ' + this.goal + ' điểm!'); api.finish(true); }
      } else if (this.tapY_isBack(api.input.tapX, api.input.tapY)) {
        api.finish(false); // chạm nút thoát
      }
      api.input.tapX = api.input.tapY = null;
    }

    if (this.timeLeft <= 0) { api.flash('⏱ Hết giờ! ' + this.hits + '/' + this.goal); api.finish(this.hits >= this.goal); }
  },

  tapY_isBack(x, y){ return x != null && x < 60 && y < 40; },

  draw(ctx, api){
    // nền
    const g = ctx.createLinearGradient(0, 0, 0, api.H);
    g.addColorStop(0, '#12203a'); g.addColorStop(1, '#0a1226');
    ctx.fillStyle = g; ctx.fillRect(0, 0, api.W, api.H);

    // mục tiêu
    const tg = ctx.createRadialGradient(this.target.x, this.target.y, 2, this.target.x, this.target.y, this.target.r);
    tg.addColorStop(0, '#fff3a0'); tg.addColorStop(1, '#ff8a3c');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(this.target.x, this.target.y, this.target.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();

    // HUD
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textBaseline = 'top';
    ctx.textAlign = 'left';  ctx.fillText('✕', 12, 10);
    ctx.textAlign = 'center';ctx.fillText('🎯 ' + this.hits + '/' + this.goal, api.W / 2, 10);
    ctx.textAlign = 'right'; ctx.fillText('⏱ ' + Math.max(0, Math.ceil(this.timeLeft)) + 's', api.W - 12, 10);
  },
});
