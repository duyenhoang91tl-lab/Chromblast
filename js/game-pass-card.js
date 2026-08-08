/* ══════════════════════════════════════════
   THẺ TRÒ CHƠI (game-pass-card) — khung sườn màn hình mới.
   Giai đoạn 1: header cố định trên cùng (icon thẻ, cấp độ, thanh tiến trình
   dạng viên thuốc, số điểm, nút Nâng cấp).
   Giai đoạn 2: thanh 4 tab ngang dưới header (Phần thưởng/Nhiệm vụ/Đi đổi/
   Bảng xếp hạng).
   Giai đoạn 3: bấm tab mở panel trượt toàn màn hình tương ứng (.gpcard-subpanel),
   nút back ở góc trên trái mỗi panel chỉ đóng riêng panel đó. Nội dung từng
   panel (đổ vào #gpcard-rewards/quests/redeem/leaderboard) nối ở bước sau.
   Dùng nguyên field playerLevel/playerXP/xpNeeded() đã có sẵn ở
   js/progression.js — không tạo field cấp độ/điểm riêng cho thẻ này.
══════════════════════════════════════════ */

function renderGamePassHeader(){
  const lvEl = document.getElementById('gpcard-level-num');
  const fillEl = document.getElementById('gpcard-xp-fill');
  const xpEl = document.getElementById('gpcard-xp-num');
  if(!lvEl || !fillEl || !xpEl) return;
  if(typeof playerLevel === 'undefined' || typeof playerXP === 'undefined' || typeof xpNeeded !== 'function') return;
  const need = xpNeeded(playerLevel);
  const pct = need > 0 ? Math.max(0, Math.min(100, Math.round(playerXP / need * 100))) : 0;
  lvEl.textContent = playerLevel;
  fillEl.style.width = pct + '%';
  xpEl.textContent = playerXP.toLocaleString() + '/' + need.toLocaleString();
}

function openGamePassCard(){
  renderGamePassHeader();
  document.getElementById('game-pass-card')?.classList.add('show');
}
function closeGamePassCard(){
  document.getElementById('game-pass-card')?.classList.remove('show');
}

// Giai đoạn 3: bấm 1 trong 4 tab → mở panel trượt toàn màn hình tương ứng
// (.gpcard-subpanel[data-panel=...]), các panel khác tự đóng lại. Nút back
// trên mỗi panel chỉ đóng riêng panel đó, không đóng cả Thẻ trò chơi.
const GPCARD_TABS = ['rewards','quests','redeem','leaderboard'];
function setGamePassTab(tabName){
  if(GPCARD_TABS.indexOf(tabName) < 0) return;
  GPCARD_TABS.forEach(name=>{
    const btn = document.getElementById('gpcard-tab-' + name);
    if(btn) btn.classList.toggle('active', name === tabName);
    const panel = document.querySelector('.gpcard-subpanel[data-panel="' + name + '"]');
    if(panel) panel.classList.toggle('show', name === tabName);
  });
}
function closeGamePassSubpanel(tabName){
  const panel = document.querySelector('.gpcard-subpanel[data-panel="' + tabName + '"]');
  if(panel) panel.classList.remove('show');
}

(function initGamePassCard(){
  function bind(){
    document.getElementById('gpcard-close-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeGamePassCard();
    });
    GPCARD_TABS.forEach(name=>{
      document.getElementById('gpcard-tab-' + name)?.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        setGamePassTab(name);
      });
      document.querySelector('.gpcard-back[data-panel-back="' + name + '"]')?.addEventListener('click', ()=>{
        try{ sfxClick(); }catch(e){}
        closeGamePassSubpanel(name);
      });
    });
    setGamePassTab('leaderboard');
    renderGamePassHeader();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// Giữ header của thẻ luôn khớp cấp/điểm mới nhất mỗi khi progression.js cập
// nhật thanh XP gốc (lên cấp, cộng điểm...) — bọc thêm thay vì sửa trực tiếp
// progression.js để không đụng vào logic gốc.
(function hookXpRenderForGamePassCard(){
  if(typeof renderPlayerXP !== 'function') return;
  const orig = renderPlayerXP;
  window.renderPlayerXP = function(){
    orig.apply(this, arguments);
    try{ renderGamePassHeader(); }catch(e){}
  };
})();
