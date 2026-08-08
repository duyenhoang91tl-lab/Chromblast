/* ══════════════════════════════════════════
   TÀI KHOẢN → "Trạng thái của tôi" (#account-status).
   Chỉ HIỂN THỊ — dùng nguyên các nguồn dữ liệu/hàm rank đã có sẵn, không tính
   lại hay tạo số liệu mới:
   - Cấp độ/map: playerLevel, normalMapStage, unlockGateStageIndex (js/progression.js)
   - Rank Caro: getLocalCaroStats()/getCaroRank() (js/caro-ranks.js)
   - Rank Versus: getLocalVersusStats()/getVersusRank() (js/versus-ranks.js)
   - Kết đôi/kết hôn: CaroSocial.getCouple() (js/caro-social.js — nạp trễ qua
     js/caro-loader.js, xem window.ensureCaroLoaded), cùng công thức 7 ngày
     tính "đã kết hôn" như player-card-panel (js/caro.js, _pcRenderCouple).
══════════════════════════════════════════ */

function _acstCardHtml(icon, label, value, sub){
  return '<div class="acst-card">'
    + '<div class="acst-card-icon">'+icon+'</div>'
    + '<div class="acst-card-label">'+label+'</div>'
    + '<div class="acst-card-value">'+value+'</div>'
    + (sub ? '<div class="acst-card-sub">'+sub+'</div>' : '')
    + '</div>';
}

function _acstRenderCouple(el, couple){
  if(!el) return;
  const partnerName = (couple && couple.partnerUid) ? (couple.partnerName || '') : '';
  if(!partnerName){ el.hidden = true; el.innerHTML = ''; return; }
  const days = couple.pairedAt ? Math.floor((Date.now() - couple.pairedAt) / 86400000) : 0;
  const married = days >= 7;
  const ring = married ? '💍👰' : '💍';
  const label = married
    ? (typeof t === 'function' ? t('caroMarriedLine', partnerName) : ('Đã kết hôn với ' + partnerName))
    : (typeof t === 'function' ? t('caroCoupleLine', partnerName) : ('Đã kết đôi với ' + partnerName));
  el.hidden = false;
  el.innerHTML = '<span class="acst-couple-ring">'+ring+'</span><span class="acst-couple-text">'
    + (typeof escapeHtml === 'function' ? escapeHtml(label) : label) + '</span>';
}

function renderAccountStatus(){
  const container = document.getElementById('account-status');
  if(!container) return;

  const level = (typeof playerLevel !== 'undefined') ? playerLevel : 1;
  const mapNormal = (typeof normalMapStage !== 'undefined') ? Math.max(0, (normalMapStage|0) - 1) : 0;
  const mapSecret = (typeof unlockGateStageIndex !== 'undefined') ? (unlockGateStageIndex|0) : 0;
  const caroStats = (typeof getLocalCaroStats === 'function') ? getLocalCaroStats() : { winRate:0, rank:null };
  const vsStats = (typeof getLocalVersusStats === 'function') ? getLocalVersusStats() : { winRate:0, rank:null };
  const name = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : '';

  const tt = (k, ...args) => (typeof t === 'function' ? t(k, ...args) : k);
  const esc = (s) => (typeof escapeHtml === 'function' ? escapeHtml(s) : String(s||''));

  const caroRankLabel = caroStats.rank ? (caroStats.rank.icon + ' ' + caroStats.rank.name) : '—';
  const vsRankLabel = vsStats.rank ? (vsStats.rank.icon + ' ' + vsStats.rank.name) : '—';
  const winRateLabel = tt('caroWinRateLabel');

  let html = '';
  html += '<div class="acst-top">';
  html +=   '<div class="acst-top-avatar" id="acst-avatar"></div>';
  html +=   '<div class="acst-top-text">';
  html +=     '<div class="acst-top-name">'+esc(name)+'</div>';
  html +=     '<div class="acst-top-level">⭐ '+esc(tt('acstLevel', level))+'</div>';
  html +=   '</div>';
  html += '</div>';
  html += '<div class="acst-grid">';
  html +=   _acstCardHtml('🗺️', esc(tt('acstMapNormal')), mapNormal);
  html +=   _acstCardHtml('🌟', esc(tt('acstMapSecret')), mapSecret);
  html +=   _acstCardHtml('❌⭕', esc(tt('acstRankCaro')), esc(caroRankLabel), esc(winRateLabel)+': '+caroStats.winRate+'%');
  html +=   _acstCardHtml('⚔️', esc(tt('acstRankVersus')), esc(vsRankLabel), esc(winRateLabel)+': '+vsStats.winRate+'%');
  html += '</div>';
  html += '<div id="acst-couple" class="acst-couple" hidden></div>';
  container.innerHTML = html;

  const avEl = document.getElementById('acst-avatar');
  if(avEl && typeof applyAvatarElement === 'function'){
    applyAvatarElement(avEl, typeof getPlayerAvatarDisplay === 'function' ? getPlayerAvatarDisplay() : null);
  }

  // Kết đôi/kết hôn: CaroSocial nạp trễ cùng caro.js — nếu chưa nạp thì nạp rồi mới
  // render, chỉ render nếu người chơi vẫn đang đứng ở đúng màn này lúc nạp xong.
  const coupleEl = document.getElementById('acst-couple');
  if(typeof window.CaroSocial !== 'undefined' && window.CaroSocial && typeof window.CaroSocial.getCouple === 'function'){
    _acstRenderCouple(coupleEl, window.CaroSocial.getCouple());
  } else if(typeof window.ensureCaroLoaded === 'function'){
    window.ensureCaroLoaded().then(()=>{
      const stillOpen = document.getElementById('account-status-panel')?.classList.contains('show');
      if(!stillOpen) return;
      const c = (window.CaroSocial && typeof window.CaroSocial.getCouple === 'function') ? window.CaroSocial.getCouple() : null;
      _acstRenderCouple(document.getElementById('acst-couple'), c);
    }).catch(()=>{});
  }
}

(function initAccountStatus(){
  function bind(){
    document.getElementById('acchub-row-status')?.addEventListener('click', renderAccountStatus);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
