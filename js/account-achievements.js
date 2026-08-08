/* ══════════════════════════════════════════
   TÀI KHOẢN → "Thành tích của tôi" (#account-achievements).
   Chỉ HIỂN THỊ mốc tiến trình THẬT đã có sẵn — không tạo hệ thống huy hiệu/
   phần thưởng mới, không tính lại số liệu:
   - Cấp độ/map: playerLevel, normalMapStage, unlockGateStageIndex (js/progression.js)
   - Rank + số trận thắng Caro: getLocalCaroStats() (js/caro-ranks.js)
   - Rank + số trận thắng Versus: getLocalVersusStats() (js/versus-ranks.js)
   - Chuỗi điểm danh: getDailyStatus().streakDay (js/daily-rewards.js) — dự án chỉ
     lưu streak hiện tại, KHÔNG lưu kỷ lục dài nhất, nên nhãn ghi rõ "Chuỗi hiện
     tại" chứ không phải "Kỷ lục" để không sai sự thật.
══════════════════════════════════════════ */

function _acachCardHtml(icon, label, value, sub){
  return '<div class="acach-card">'
    + '<div class="acach-card-icon">'+icon+'</div>'
    + '<div class="acach-card-text">'
    +   '<div class="acach-card-label">'+label+'</div>'
    +   (sub ? '<div class="acach-card-sub">'+sub+'</div>' : '')
    + '</div>'
    + '<div class="acach-card-value">'+value+'</div>'
    + '</div>';
}

function renderAccountAchievements(){
  const container = document.getElementById('account-achievements');
  if(!container) return;

  const tt = (k, ...args) => (typeof t === 'function' ? t(k, ...args) : k);
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s) : String(s||''));

  const level = (typeof playerLevel !== 'undefined') ? playerLevel : 1;
  const mapNormal = (typeof normalMapStage !== 'undefined') ? Math.max(0, (normalMapStage|0) - 1) : 0;
  const mapSecret = (typeof unlockGateStageIndex !== 'undefined') ? (unlockGateStageIndex|0) : 0;
  const caroStats = (typeof getLocalCaroStats === 'function') ? getLocalCaroStats() : null;
  const vsStats = (typeof getLocalVersusStats === 'function') ? getLocalVersusStats() : null;
  const dailyStatus = (typeof getDailyStatus === 'function') ? getDailyStatus() : null;

  let html = '<div class="acach-list">';

  html += _acachCardHtml('🗺️', esc(tt('acachMapNormal')), mapNormal);
  html += _acachCardHtml('🌟', esc(tt('acachMapSecret')), mapSecret);
  html += _acachCardHtml('⭐', esc(tt('acachLevel')), level);

  if(caroStats && caroStats.rank){
    html += _acachCardHtml(
      caroStats.rank.icon || '❌⭕',
      esc(tt('acachRankCaro')) + ' — ' + esc(caroStats.rank.name),
      caroStats.wins,
      esc(tt('acachWins'))
    );
  }
  if(vsStats && vsStats.rank){
    html += _acachCardHtml(
      vsStats.rank.icon || '⚔️',
      esc(tt('acachRankVersus')) + ' — ' + esc(vsStats.rank.name),
      vsStats.wins,
      esc(tt('acachWins'))
    );
  }
  if(dailyStatus && dailyStatus.streakDay){
    html += _acachCardHtml('🔥', esc(tt('acachStreak')), dailyStatus.streakDay, esc(tt('acachStreakSub')));
  }

  html += '</div>';
  container.innerHTML = html;
}

(function initAccountAchievements(){
  function bind(){
    document.getElementById('acchub-row-achievements')?.addEventListener('click', renderAccountAchievements);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
