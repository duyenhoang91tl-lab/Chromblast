// "Thẻ trò chơi" (game-pass-card) — điểm vào cho mục Xếp hạng.
// Trước đây có 1 màn trung gian (header + hàng tab) rồi mới trượt sang màn
// xếp hạng, nhưng vì chỉ còn ĐÚNG 1 tab "leaderboard" (Hành trình/Đổi quà đã
// tách thành 2 màn hình riêng mở từ Menu chính — set-btn-journey/set-btn-redeem,
// xem js/gpcard-rewards.js, js/gpcard-redeem.js; Nhiệm vụ dùng lại #quests-screen
// có sẵn, xem js/quests.js, js/account-hub.js) nên màn trung gian đó thừa 1
// bước bấm — đã bỏ. #gpcard-sub-leaderboard giờ là màn DUY NHẤT, tự chứa luôn
// header cấp/XP ở trên cùng. File này chỉ lo phần khung: header cấp/XP, mở/
// đóng màn toàn màn hình trượt từ phải sang. Nội dung #gpcard-leaderboard bên
// trong do phần việc riêng đổ vào — file này KHÔNG render nội dung đó.

function _gpcardRenderHeader(){
  const lvEl = document.getElementById('gpcard-lv');
  const fillEl = document.getElementById('gpcard-xp-fill');
  const textEl = document.getElementById('gpcard-xp-text');
  if(!lvEl || !fillEl || !textEl) return;
  const lv = (typeof playerLevel === 'number') ? playerLevel : 1;
  const xp = (typeof playerXP === 'number') ? playerXP : 0;
  const need = (typeof xpNeeded === 'function') ? xpNeeded(lv) : 100;
  lvEl.textContent = 'Lv.' + lv;
  fillEl.style.width = Math.max(0, Math.min(100, Math.round(xp / need * 100))) + '%';
  textEl.textContent = xp + ' / ' + need;
}

/** Mở thẳng màn "Bảng xếp hạng" (không còn màn trung gian). Tham số defaultTab
 * giữ lại cho tương thích ngược (chỗ gọi cũ có thể vẫn truyền 'leaderboard'),
 * nhưng không còn ý nghĩa gì vì chỉ có đúng 1 màn để mở. */
function openGpcardPanel(defaultTab){
  const sub = document.getElementById('gpcard-sub-leaderboard');
  if(!sub) return;
  try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
  _gpcardRenderHeader();
  sub.classList.add('show');
}

function closeGpcardPanel(){
  document.getElementById('gpcard-sub-leaderboard')?.classList.remove('show');
}

function initGpcardPanel(){
  const sub = document.getElementById('gpcard-sub-leaderboard');
  if(!sub) return;

  document.getElementById('gpcard-close-btn')?.addEventListener('click', ()=>{
    try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
    closeGpcardPanel();
  });
  document.getElementById('gpcard-upgrade-btn')?.addEventListener('click', ()=>{
    try{ if(typeof sfxClick === 'function') sfxClick(); }catch(e){}
    try{ if(typeof openShop === 'function') openShop(); }catch(e){}
  });

  // Nút Xếp hạng hiện tại của game (header chính + Settings Hub) mở thẳng màn
  // "Bảng xếp hạng" này — giữ đúng hành vi cũ cho người dùng quen tay.
  document.getElementById('leaderboard-btn')?.addEventListener('click', ()=>{
    openGpcardPanel('leaderboard');
  });
  document.getElementById('set-btn-leaderboard')?.addEventListener('click', ()=>{
    document.getElementById('settings-panel')?.classList.remove('show');
    openGpcardPanel('leaderboard');
  });
}

document.addEventListener('DOMContentLoaded', initGpcardPanel);
