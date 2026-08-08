/* ══════════════════════════════════════════
   THẺ TRÒ CHƠI (game-pass-card) — khung sườn màn hình mới.
   Giai đoạn 1: chỉ phần header cố định trên cùng (icon thẻ, cấp độ, thanh
   tiến trình dạng viên thuốc, số điểm, nút Nâng cấp). Các tab/panel nội
   dung (Phần thưởng / Nhiệm vụ / Đi đổi / Bảng xếp hạng) sẽ thêm ở bước sau.
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

(function initGamePassCard(){
  function bind(){
    document.getElementById('gpcard-close-btn')?.addEventListener('click', ()=>{
      try{ sfxClick(); }catch(e){}
      closeGamePassCard();
    });
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
