/* ══════════════════════════════════════════
   TÀI KHOẢN → "Hội nhóm" (#account-groups).
   Dự án hiện không có tính năng nhóm nhiều thành viên (guild/club) — chỉ có
   bạn bè 1-1 (đã có màn riêng "Bạn bè") và ghép đôi 1-1 (couple). Màn này chỉ
   là 1 trạng thái "sắp ra mắt" đơn giản, không kết nối dữ liệu/API nào — tránh
   dựng 1 hệ thống nhóm mới khi chưa có quyết định thiết kế dữ liệu cho nó.
══════════════════════════════════════════ */

function renderAccountGroups(){
  const container = document.getElementById('account-groups');
  if(!container) return;

  const tt = (k) => (typeof t === 'function' ? t(k) : k);
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s) : String(s||''));

  container.innerHTML =
    '<div class="acgrp-empty">'
    + '<div class="acgrp-empty-icon">👥</div>'
    + '<div class="acgrp-empty-title">' + esc(tt('acgrpSoonTitle')) + '</div>'
    + '<div class="acgrp-empty-sub">' + esc(tt('acgrpSoonSub')) + '</div>'
    + '</div>';
}

(function initAccountGroups(){
  function bind(){
    document.getElementById('acchub-row-groups')?.addEventListener('click', renderAccountGroups);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
