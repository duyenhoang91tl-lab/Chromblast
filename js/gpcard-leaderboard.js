/* ══════════════════════════════════════════
   Thẻ trò chơi — tab "Bảng xếp hạng" (#gpcard-leaderboard).
   Chỉ trình bày lại giao diện; toàn bộ dữ liệu/logic (điểm, hạng, quà theo
   hạng, nhận thưởng) vẫn dùng nguyên fetchPeriodLeaderboard/claimPeriodReward/
   rewardForRank/rewardPreviewRows/REWARD_TABLE trong js/lb-period.js —
   không đổi cách tính điểm/hạng/thưởng.
   Dự án chưa có khái niệm "người nổi tiếng"/hall of fame nên chỉ hiển thị
   nội dung kỳ hiện tại (không có tab phụ trên cùng).
   Khung sườn (#gpcard-panel, mở/đóng, chuyển tab) do js/gpcard.js quản lý —
   file này chỉ đổ nội dung vào đúng #gpcard-leaderboard đã có sẵn.
   Nạp SAU js/lb-period.js + js/leaderboard.js.
══════════════════════════════════════════ */

let _gpcardLbPeriod = 'day'; // day | week | month — chọn kỳ để xem/nhận thưởng

function _gpcardLbMedal(rank){
  if(rank === 1) return '🥇';
  if(rank === 2) return '🥈';
  if(rank === 3) return '🥉';
  return String(rank);
}

function _gpcardLbEscapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/** Hạng 1 làm banner riêng nổi bật, các dải hạng còn lại gộp thành chip nhỏ —
 *  lấy đúng số liệu từ rewardPreviewRows() (đọc thẳng REWARD_TABLE), không tự
 *  chế số thưởng mới. */
function _gpcardLbBannersHtml(kind){
  if(typeof rewardPreviewRows !== 'function') return '';
  const rows = rewardPreviewRows(kind);
  if(!rows.length) return '';
  const first = rows[0];
  const rest = rows.slice(1);
  const diaFirst = first.diamond > 0 ? (' · 💎' + first.diamond) : '';
  let html = '<div class="gpcard-lb-banner-top">'
    + '<span class="gpcard-lb-banner-top-rank">🥇 #1</span>'
    + '<span class="gpcard-lb-banner-top-reward">🪙' + first.gold + diaFirst + '</span>'
    + '</div>';
  if(rest.length){
    html += '<div class="gpcard-lb-banner-row">' + rest.map(r => {
      const dia = r.diamond > 0 ? (' · 💎' + r.diamond) : '';
      return '<span class="gpcard-lb-banner-chip">' + r.label + ': 🪙' + r.gold + dia + '</span>';
    }).join('') + '</div>';
  }
  return html;
}

function _gpcardLbRowsHtml(entries, myName){
  if(!entries.length){
    return '<div class="gpcard-lb-empty">' + (typeof t === 'function' ? t('lbEmpty') : '') + '</div>';
  }
  return entries.map(e => {
    const isMe = e.name === myName || (typeof getOnlineUid === 'function' && e.playerId === getOnlineUid());
    const topClass = e.rank <= 3 ? (' gpcard-lb-rank-top gpcard-lb-rank-' + e.rank) : '';
    return '<div class="gpcard-lb-row' + (isMe ? ' me' : '') + '">'
      + '<span class="gpcard-lb-rank' + topClass + '">' + _gpcardLbMedal(e.rank) + '</span>'
      + '<span class="gpcard-lb-avatar">' + (e.avatar || '🐶') + '</span>'
      + '<span class="gpcard-lb-name">' + _gpcardLbEscapeHtml(e.name) + '</span>'
      + '<span class="gpcard-lb-score">' + (e.score | 0).toLocaleString() + '</span>'
      + '</div>';
  }).join('');
}

async function renderGpcardLeaderboard(){
  const root = document.getElementById('gpcard-leaderboard');
  if(!root) return;
  if(typeof fetchPeriodLeaderboard !== 'function'){
    root.innerHTML = '<div class="gpcard-card">' + (typeof t === 'function' ? t('lbOfflineGlobal') : '') + '</div>';
    return;
  }
  root.innerHTML = '<div class="gpcard-card gpcard-lb-loading">' + (typeof t === 'function' ? t('lbLoading') : '…') + '</div>';

  const periodLabel = { day: 'Ngày', week: 'Tuần', month: 'Tháng' };
  const periodBtnsHtml = ['day', 'week', 'month'].map(k => {
    return '<button type="button" class="gpcard-lb-period-btn' + (k === _gpcardLbPeriod ? ' active' : '') + '" data-gpcard-period="' + k + '">' + periodLabel[k] + '</button>';
  }).join('');

  const myName = typeof currentPlayerName === 'function' ? currentPlayerName() : '';
  const board = await fetchPeriodLeaderboard(_gpcardLbPeriod, 'world', { previous: false });
  const mine = board.entries.find(e => e.name === myName || (typeof getOnlineUid === 'function' && e.playerId === getOnlineUid()));
  const myRankHtml = mine
    ? (typeof t === 'function' ? t('lbMyRank', mine.rank, board.entries.length, mine.score.toLocaleString()) : ('#' + mine.rank))
    : (typeof t === 'function' ? t('lbNoRank') : '');

  // Nút Nhận quà — luôn xét hạng kỳ TRƯỚC + phạm vi THẾ GIỚI, khớp đúng cách
  // claimPeriodReward()/Cloud Function tương ứng đang xác thực (xem
  // js/lb-period.js: claimPeriodReward, _updateClaimButton trong leaderboard.js).
  let claimHtml = '';
  if(typeof findMyPeriodRank === 'function'){
    const world = await findMyPeriodRank(_gpcardLbPeriod, 'world', { previous: true });
    const claimed = typeof hasClaimedPeriod === 'function' && hasClaimedPeriod(world.periodId, 'world');
    if(world.rank && world.rank <= 100){
      if(claimed){
        claimHtml = '<button type="button" class="gpcard-lb-claim-btn" disabled>' + (typeof t === 'function' ? t('lbClaimed') : '') + '</button>';
      } else {
        const reward = typeof rewardForRank === 'function' ? rewardForRank(_gpcardLbPeriod, world.rank) : null;
        const dia = reward && reward.diamond ? (' · 💎' + reward.diamond) : '';
        claimHtml = '<button type="button" class="gpcard-lb-claim-btn" id="gpcard-lb-claim-btn">'
          + (typeof t === 'function' ? t('lbClaimBtn') : '') + ' · #' + world.rank + ' · 🪙' + (reward ? reward.gold : 0) + dia
          + '</button>';
      }
    }
  }

  root.innerHTML =
    '<div class="gpcard-card gpcard-lb-period-row">' + periodBtnsHtml + '</div>'
    + '<div class="gpcard-card gpcard-lb-rewards">' + _gpcardLbBannersHtml(_gpcardLbPeriod) + '</div>'
    + (claimHtml ? '<div class="gpcard-card gpcard-lb-claim-wrap">' + claimHtml + '</div>' : '')
    + '<div class="gpcard-card gpcard-lb-list-card">'
      + '<div class="gpcard-lb-my-rank">' + myRankHtml + '</div>'
      + '<div class="gpcard-lb-list">' + _gpcardLbRowsHtml(board.entries.slice(0, 100), myName) + '</div>'
      + '</div>';

  root.querySelectorAll('[data-gpcard-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      try{ sfxClick(); }catch(e){}
      _gpcardLbPeriod = btn.dataset.gpcardPeriod;
      renderGpcardLeaderboard();
    });
  });
  document.getElementById('gpcard-lb-claim-btn')?.addEventListener('click', async () => {
    try{ sfxClick(); }catch(e){}
    if(typeof claimPeriodReward !== 'function') return;
    const res = await claimPeriodReward(_gpcardLbPeriod, 'world');
    if(res && res.ok){
      try{ showComboFlash(0, false, '🎁 Top ' + res.rank + ' · 🪙' + res.gold + (res.diamond ? (' · 💎' + res.diamond) : '')); }catch(e){}
      try{ if(typeof sfxUnlock === 'function') sfxUnlock(); }catch(e){}
    } else {
      try{
        showComboFlash(0, false, res && res.reason === 'claimed'
          ? (typeof t === 'function' ? t('lbClaimed') : '')
          : (typeof t === 'function' ? t('lbClaimUnavailable') : ''));
      }catch(e){}
    }
    renderGpcardLeaderboard();
  });
}

// Nạp nội dung mỗi lần mở "Bảng xếp hạng" — không sửa js/gpcard.js, chỉ gắn
// thêm listener độc lập lên đúng 2 nút mở màn này đã có sẵn.
(function bindGpcardLeaderboardTab(){
  function bind(){
    document.getElementById('leaderboard-btn')?.addEventListener('click', renderGpcardLeaderboard);
    document.getElementById('set-btn-leaderboard')?.addEventListener('click', renderGpcardLeaderboard);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
