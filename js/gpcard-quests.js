/* ══════════════════════════════════════════
   Thẻ trò chơi — tab "Nhiệm vụ" (#gpcard-quests).
   Chỉ trình bày lại giao diện; toàn bộ dữ liệu/logic (tiến độ, đủ điều kiện,
   nhận thưởng) vẫn dùng nguyên questsLoadState/questsSaveState/questsSyncCheckin/
   questsProgressOf/questsIsClaimed/questsClaim/questsTitleOf/questsRewardText/
   QUEST_DEFS được js/quests.js export riêng cho file này — không tính lại điểm/
   tiến độ/thưởng ở đây.
   3 trạng thái nút hành động khớp đúng 3 trạng thái quests.js đang tính (chưa đủ
   tiến độ / đủ tiến độ nhưng chưa nhận / đã nhận) — giữ nguyên bước "Nhận" để
   không mất luồng nhận thưởng đã có, chỉ đổi nhãn "Hoàn thành" cho đúng trạng
   thái đã nhận theo yêu cầu giao diện mới.
   Khung sườn (#gpcard-panel, mở/đóng, chuyển tab) do js/gpcard.js quản lý — file
   này chỉ đổ nội dung vào đúng #gpcard-quests đã có sẵn.
   Nạp SAU js/quests.js.
══════════════════════════════════════════ */

let _gpcardQuestsCat = 'day'; // day | week | month — mục đang xem trong tab

const _GPCARD_QUEST_ICO_COLOR = {
  checkin: '#ff9f43', play: '#54a0ff', clears: '#ee5a6f', scoreMax: '#feca57',
  spin: '#5f27cd', weekCheckins: '#1dd1a1', comboMax: '#ff6b6b', monthCheckins: '#0abde3'
};
function _gpcardQuestIcoColor(def){
  return _GPCARD_QUEST_ICO_COLOR[def.metric] || '#7a6fae';
}

function _gpcardQuestActionHtml(cat, def, done, claimed){
  if(claimed){
    return '<button type="button" class="gpcard-quest-act done" disabled>'
      + (typeof t === 'function' ? t('gpcardQuestDone') : 'Hoàn thành') + '</button>';
  }
  if(done){
    return '<button type="button" class="gpcard-quest-act claim" data-gpcard-quest-claim'
      + ' data-cat="' + cat + '" data-id="' + def.id + '">'
      + (typeof t === 'function' ? t('questsClaim') : 'Nhận') + '</button>';
  }
  return '<button type="button" class="gpcard-quest-act go" data-gpcard-quest-go>'
    + (typeof t === 'function' ? t('gpcardQuestGo') : 'Đi ngay') + '</button>';
}

function _gpcardQuestRowHtml(cat, def, st){
  const prog = Math.min(def.target, questsProgressOf(st, cat, def));
  const claimed = questsIsClaimed(st, cat, def.id);
  const done = prog >= def.target;
  const pct = Math.min(100, Math.round((prog / def.target) * 100));
  const rewardLine = def.useDailyClaim
    ? (typeof t === 'function' ? t('questsCheckinReward') : 'XP + vàng + tim')
    : questsRewardText(def.reward);
  return '<div class="gpcard-quest-row' + (claimed ? ' claimed' : done ? ' ready' : '') + '">'
    + '<div class="gpcard-quest-ico" style="background:' + _gpcardQuestIcoColor(def) + '">' + def.icon + '</div>'
    + '<div class="gpcard-quest-main">'
      + '<div class="gpcard-quest-title">' + questsTitleOf(def) + '</div>'
      + '<div class="gpcard-quest-reward">' + rewardLine + '</div>'
      + '<div class="gpcard-quest-bar"><i style="width:' + pct + '%"></i></div>'
      + '<div class="gpcard-quest-prog">' + prog + '/' + def.target + '</div>'
    + '</div>'
    + _gpcardQuestActionHtml(cat, def, done, claimed)
    + '</div>';
}

function renderGpcardQuests(){
  const root = document.getElementById('gpcard-quests');
  if(!root) return;
  if(typeof questsLoadState !== 'function' || typeof QUEST_DEFS === 'undefined'){
    root.innerHTML = '<div class="gpcard-card">' + (typeof t === 'function' ? t('lbOfflineGlobal') : '') + '</div>';
    return;
  }

  const st = questsLoadState();
  if(typeof questsSyncCheckin === 'function') questsSyncCheckin(st);
  if(typeof questsSaveState === 'function') questsSaveState(st);

  const catLabel = {
    day: typeof t === 'function' ? t('questsDay') : 'Ngày',
    week: typeof t === 'function' ? t('questsWeek') : 'Tuần',
    month: typeof t === 'function' ? t('questsMonth') : 'Tháng'
  };
  const catBtnsHtml = ['day', 'week', 'month'].map(k => {
    return '<button type="button" class="gpcard-quest-cat-btn' + (k === _gpcardQuestsCat ? ' active' : '') + '"'
      + ' data-gpcard-quest-cat="' + k + '">' + catLabel[k] + '</button>';
  }).join('');

  const defs = QUEST_DEFS[_gpcardQuestsCat] || [];
  const rowsHtml = defs.map(def => _gpcardQuestRowHtml(_gpcardQuestsCat, def, st)).join('');

  root.innerHTML =
    '<div class="gpcard-card gpcard-quest-cat-row">' + catBtnsHtml + '</div>'
    + '<div class="gpcard-card gpcard-quest-list-card">'
      + '<div class="gpcard-quest-list">' + rowsHtml + '</div>'
      + '</div>';

  root.querySelectorAll('[data-gpcard-quest-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      try{ sfxClick(); }catch(e){}
      _gpcardQuestsCat = btn.dataset.gpcardQuestCat;
      renderGpcardQuests();
    });
  });
  root.querySelectorAll('[data-gpcard-quest-claim]').forEach(btn => {
    btn.addEventListener('click', () => {
      try{ sfxClick(); }catch(e){}
      const r = typeof questsClaim === 'function' ? questsClaim(btn.dataset.cat, btn.dataset.id) : null;
      if(r && r.ok){
        try{ if(typeof sfxUnlock === 'function') sfxUnlock(); }catch(e){}
        const rw = r.reward || {};
        try{
          if(typeof showComboFlash === 'function')
            showComboFlash(0, false,
              (typeof t === 'function' ? t('questsClaimFlash') : 'Nhiệm vụ hoàn thành')
              + (rw.xp ? ' · +' + rw.xp + ' XP' : '')
              + (rw.gold ? ' · 🪙 +' + rw.gold : '')
              + (rw.hearts ? ' · ❤️ +' + rw.hearts : ''));
        }catch(e){}
        try{ if(typeof updateQuestsBadge === 'function') updateQuestsBadge(); }catch(e){}
      }
      renderGpcardQuests();
    });
  });
  root.querySelectorAll('[data-gpcard-quest-go]').forEach(btn => {
    btn.addEventListener('click', () => {
      try{ sfxClick(); }catch(e){}
      try{ if(typeof closeGpcardPanel === 'function') closeGpcardPanel(); }catch(e){}
    });
  });
}

// Nạp nội dung mỗi lần bấm tab "Nhiệm vụ" — không sửa js/gpcard.js, chỉ gắn
// thêm 1 listener độc lập lên đúng nút tab đã có sẵn trong khung sườn.
(function bindGpcardQuestsTab(){
  function bind(){
    const tabBtn = document.querySelector('.gpcard-tab[data-gpcard-tab="quests"]');
    if(tabBtn) tabBtn.addEventListener('click', renderGpcardQuests);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
