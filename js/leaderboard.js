// ═══════════════════════════════════════════════════════════════
// js/leaderboard.js — BXH local / thế giới / châu lục / đất nước / bạn bè
// + kỳ ngày·tuần·tháng + nhận thưởng top 1–100
// Nạp SAU save.js + online-services.js + lb-period.js
// ═══════════════════════════════════════════════════════════════

const LEADERBOARD_KEY = 'chromablast_leaderboard_local';
const LEADERBOARD_DEV_SEED = [
  {name:'Minh',        score: 4820},
  {name:'Huyền Trang',  score: 3960},
  {name:'Quang',        score: 3510},
  {name:'Bảo Anh',      score: 2870},
  {name:'Nam',          score: 2340},
];

let _lbMode = 'period'; // 'local' | 'period' | 'global-solo' | 'global-caro' | 'friends-alltime'
let _lbScope = 'world'; // world | continent | country | friends
let _lbPeriod = 'day';  // day | week | month

function getLeaderboardEntries(){
  let entries = [];
  try{
    const raw = safeGet(LEADERBOARD_KEY);
    if(raw) entries = JSON.parse(raw) || [];
  }catch(e){ entries = []; }
  const cleaned = entries.filter(e => !LEADERBOARD_DEV_SEED.some(s => s.name===e.name && s.score===e.score));
  if(cleaned.length !== entries.length) safeSet(LEADERBOARD_KEY, JSON.stringify(cleaned));
  return cleaned;
}

function _localPlayerName(){
  if(typeof currentUser !== 'undefined' && currentUser && currentUser.username) return currentUser.username;
  let gid = safeGet('chromablast_guest_name');
  if(!gid){
    gid = 'Khách#' + Math.floor(1000 + Math.random()*9000);
    safeSet('chromablast_guest_name', gid);
  }
  return gid;
}

function currentPlayerName(){
  try{
    if(typeof getPlayerNickname === 'function'){
      const n = getPlayerNickname();
      if(n) return n;
    }
  }catch(e){}
  if(typeof getOnlineDisplayName === 'function' && typeof isOnlineServicesEnabled === 'function' && isOnlineServicesEnabled() && getOnlineUid()){
    const on = getOnlineDisplayName();
    if(on) return on;
  }
  return _localPlayerName();
}

function submitScoreToLeaderboard(score){
  if(!score || score <= 0) return;
  const name = currentPlayerName();
  let entries = getLeaderboardEntries();
  const idx = entries.findIndex(e => e.name === name);
  if(idx >= 0){
    if(score > entries[idx].score) entries[idx].score = score;
  } else {
    entries.push({name, score});
  }
  entries.sort((a,b) => b.score - a.score);
  entries = entries.slice(0, 100);
  safeSet(LEADERBOARD_KEY, JSON.stringify(entries));
  if(typeof submitGlobalSoloScore === 'function'){
    submitGlobalSoloScore(score).catch(()=>{});
  }
  try{ if(typeof submitPeriodScore === 'function') submitPeriodScore(score); }catch(e){}
}

function fetchTopScores(limit){
  const entries = getLeaderboardEntries().slice().sort((a,b) => b.score - a.score);
  return entries.slice(0, limit || 10);
}

function fetchMyRank(){
  const name = currentPlayerName();
  const entries = getLeaderboardEntries().slice().sort((a,b) => b.score - a.score);
  const idx = entries.findIndex(e => e.name === name);
  return idx >= 0 ? { rank: idx+1, score: entries[idx].score, total: entries.length } : null;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/** Danh sách khung hạng (band) theo REWARD_TABLE của 1 kỳ — [{from,to,gold,diamond}]. */
function _lbBandsFor(kind){
  const table = (typeof REWARD_TABLE !== 'undefined' && REWARD_TABLE[kind]) || [];
  let from = 1;
  return table.map(row=>{
    const band = { from, to: row.max, gold: row.gold, diamond: row.diamond };
    from = row.max + 1;
    return band;
  });
}

function _renderLbFramedRows(list, top, myName, kind){
  list.innerHTML = '';
  if(!top.length){
    list.innerHTML = '<div class="lb-empty">'+(typeof t==='function'?t('lbEmpty'):'Trống')+'</div>';
    return;
  }
  const bands = _lbBandsFor(kind);
  bands.forEach(band=>{
    const rowsInBand = top.filter(e=>{
      const rank = e.rank || 0;
      return rank >= band.from && rank <= band.to;
    });
    if(!rowsInBand.length) return;

    const frame = document.createElement('div');
    frame.className = 'lb-frame';
    const titleTxt = band.from === band.to
      ? ('#'+band.from)
      : ('#'+band.from+' – #'+band.to);
    const giftTxt = '🪙'+band.gold + (band.diamond>0 ? (' · 💎'+band.diamond) : '');
    frame.innerHTML = '<div class="lb-frame-title"><span>'+titleTxt+'</span><span class="lb-frame-gift">'+giftTxt+'</span></div>';

    rowsInBand.forEach(e=>{
      const row = document.createElement('div');
      const rank = e.rank || 0;
      const isMe = e.name === myName;
      row.className = 'lb-row' + (isMe ? ' me' : '');
      const medal = rank===1 ? '🥇' : rank===2 ? '🥈' : rank===3 ? '🥉' : '';
      const geo = e.country ? (' <span class="lb-geo">'+escapeHtml(e.country)+'</span>') : '';
      row.innerHTML = '<span class="lb-rank">'+(medal?medal+' ':'')+'#'+rank+'</span>'
        + '<span class="lb-name">'+escapeHtml(e.name)+geo+'</span>'
        + '<span class="lb-level">Lv.'+(e.level||1)+'</span>'
        + '<span class="lb-gift">'+giftTxt+'</span>';
      if(e.playerId){
        const nameEl = row.querySelector('.lb-name');
        if(nameEl){
          nameEl.classList.add('lb-name-tappable');
          nameEl.setAttribute('role', 'button');
          nameEl.setAttribute('tabindex', '0');
          const openThisCard = ()=>{
            try{ sfxClick(); }catch(e){}
            const opts = { uid: e.playerId, name: e.name, self: isMe };
            if(typeof openPlayerCard === 'function'){ openPlayerCard(opts); return; }
            if(typeof window.ensureCaroLoaded === 'function'){
              window.ensureCaroLoaded().then(()=>{ if(typeof openPlayerCard === 'function') openPlayerCard(opts); }).catch(()=>{});
            }
          };
          nameEl.addEventListener('click', ev=>{ ev.stopPropagation(); openThisCard(); });
          nameEl.addEventListener('keydown', ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); openThisCard(); } });
        }
      }
      frame.appendChild(row);
    });
    list.appendChild(frame);
  });
}

function _syncLbTabUi(){
  document.querySelectorAll('.lb-tab').forEach(x=>{
    x.classList.toggle('active', x.dataset.lbMode === _lbMode);
  });
  document.querySelectorAll('.lb-scope-tab').forEach(x=>{
    x.classList.toggle('active', x.dataset.lbScope === _lbScope);
  });
  document.querySelectorAll('.lb-period-tab').forEach(x=>{
    x.classList.toggle('active', x.dataset.lbPeriod === _lbPeriod);
  });
  const scopeRow = document.getElementById('lb-scope-tabs');
  const periodRow = document.getElementById('lb-period-tabs');
  const showPeriod = _lbMode === 'period';
  if(scopeRow) scopeRow.style.display = showPeriod ? '' : 'none';
  if(periodRow) periodRow.style.display = showPeriod ? '' : 'none';
  const claimWrap = document.getElementById('lb-claim-wrap');
  if(claimWrap) claimWrap.style.display = showPeriod ? '' : 'none';
  const rewards = document.getElementById('lb-reward-preview');
  if(rewards) rewards.style.display = showPeriod ? '' : 'none';
}

function _renderRewardPreview(){
  const el = document.getElementById('lb-reward-preview');
  if(!el || typeof rewardPreviewRows !== 'function') return;
  const rows = rewardPreviewRows(_lbPeriod);
  el.innerHTML = '<div class="lb-reward-title">'+(typeof t==='function'?t('lbRewardTitle'):'Quà top (kỳ trước)')+'</div>'+
    rows.map(r=>{
      const dia = r.diamond > 0 ? (' · 💎'+r.diamond) : '';
      return '<span class="lb-reward-chip">'+r.label+': 🪙'+r.gold+dia+'</span>';
    }).join('');
}

async function _updateClaimButton(){
  const btn = document.getElementById('lb-claim-btn');
  const note = document.getElementById('lb-claim-note');
  if(!btn) return;
  if(_lbMode !== 'period' || typeof findMyPeriodRank !== 'function'){
    btn.disabled = true;
    return;
  }
  // Hiển thị hạng theo đúng tab đang xem (bạn bè/khu vực/thế giới) — chỉ để
  // tham khảo, không quyết định điều kiện nhận thưởng.
  const mine = await findMyPeriodRank(_lbPeriod, _lbScope, { previous: true });
  if(note){
    note.textContent = mine.rank
      ? ((typeof t==='function'?t('lbPrevRank'):'Hạng kỳ trước')+': #'+mine.rank+' · '+(mine.score||0).toLocaleString())
      : (typeof t==='function'?t('lbPrevNoRank'):'Kỳ trước chưa vào top');
  }
  // Điều kiện + trạng thái "đã nhận" luôn xét theo hạng THẾ GIỚI — Cloud
  // Function claimPeriodReward (functions/index.js) chỉ tính hạng từ
  // periodScores toàn server (không có khái niệm scope bạn bè/khu vực), nên
  // phải dùng đúng world ở đây, bất kể đang xem tab nào, để không hiện sai
  // trạng thái nút (VD đang xem tab bạn bè, hạng bạn bè #500 nhưng hạng thế
  // giới thực tế #50 vẫn đủ điều kiện nhận thưởng).
  const world = _lbScope === 'world' ? mine : await findMyPeriodRank(_lbPeriod, 'world', { previous: true });
  const claimed = typeof hasClaimedPeriod === 'function' && hasClaimedPeriod(world.periodId, 'world');
  if(!world.rank || world.rank > 100){
    // Chưa vào top 100 kỳ trước — ẩn hẳn nút (không hiện nút mờ kèm chữ
    // "chưa đủ điều kiện"), dòng hạng kỳ trước ở trên vẫn còn để tham khảo.
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  if(claimed){
    btn.disabled = true;
    btn.textContent = (typeof t==='function'?t('lbClaimed'):'✅ Đã nhận thưởng kỳ trước');
    return;
  }
  const reward = typeof rewardForRank === 'function' ? rewardForRank(_lbPeriod, world.rank) : null;
  btn.disabled = false;
  const dia = reward && reward.diamond ? (' + 💎'+reward.diamond) : '';
  btn.textContent = (typeof t==='function'?t('lbClaimBtn'):'🎁 Nhận thưởng')+
    ' · #'+world.rank+' · 🪙'+(reward?reward.gold:0)+dia;
}

async function renderLeaderboardPanel(){
  const list = document.getElementById('leaderboard-list');
  const myRankBox = document.getElementById('leaderboard-my-rank');
  const sub = document.getElementById('leaderboard-sub');
  const myName = currentPlayerName();
  _syncLbTabUi();
  _renderRewardPreview();

  const region = typeof getPlayerRegion === 'function' ? getPlayerRegion() : { country:'VN', continent:'AS' };
  if(sub){
    if(_lbMode === 'global-caro') sub.textContent = typeof t==='function'?t('lbSubCaro'):'';
    else if(_lbMode === 'global-versus') sub.textContent = typeof t==='function'?t('lbSubVersus'):'';
    else {
      const scopeLab = {
        world: typeof t==='function'?t('lbScopeWorld'):'Thế giới',
        continent: (typeof labelContinent==='function'?labelContinent(region.continent):region.continent),
        country: (typeof labelCountry==='function'?labelCountry(region.country):region.country),
        friends: typeof t==='function'?t('lbScopeFriends'):'Bạn bè'
      }[_lbScope] || _lbScope;
      const perLab = { day:'Ngày', week:'Tuần', month:'Tháng' }[_lbPeriod];
      sub.textContent = '🏆 '+scopeLab+' · '+perLab+' · Top 100';
    }
  }

  if(!list) return;
  list.innerHTML = '<div class="lb-empty">'+(typeof t==='function'?t('lbLoading'):'…')+'</div>';

  if(_lbMode === 'global-caro'){
    if(typeof fetchCaroLeaderboard !== 'function' || !isOnlineServicesEnabled()){
      list.innerHTML = '<div class="lb-empty">'+(typeof t==='function'?t('lbOfflineGlobal'):'')+'</div>';
      if(myRankBox) myRankBox.textContent = '';
      return;
    }
    const rows = await fetchCaroLeaderboard(20);
    renderCaroLeaderboardList(list, rows, myName);
    const mine = rows.find(r => r.name === myName);
    const stats = await fetchMyCaroStats();
    if(myRankBox){
      myRankBox.textContent = mine
        ? t('caroLbMyRank', mine.rank, rows.length, mine.wins, mine.losses, mine.draws, mine.winRate, mine.points)
        : (stats.total > 0 ? t('caroLbMyStats', stats.wins, stats.losses, stats.draws, stats.winRate, stats.points) : t('caroLbNoPlay'));
    }
    return;
  }

  if(_lbMode === 'global-versus'){
    if(typeof fetchVersusLeaderboard !== 'function' || !isOnlineServicesEnabled()){
      list.innerHTML = '<div class="lb-empty">'+(typeof t==='function'?t('lbOfflineGlobal'):'')+'</div>';
      if(myRankBox) myRankBox.textContent = '';
      return;
    }
    const rows = await fetchVersusLeaderboard(20);
    renderVersusLeaderboardList(list, rows, myName);
    const mine = rows.find(r => r.name === myName);
    const stats = await fetchMyVersusStats();
    if(myRankBox){
      myRankBox.textContent = mine
        ? t('caroLbMyRank', mine.rank, rows.length, mine.wins, mine.losses, mine.draws, mine.winRate, mine.points)
        : (stats.total > 0 ? t('caroLbMyStats', stats.wins, stats.losses, stats.draws, stats.winRate, stats.points) : t('caroLbNoPlay'));
    }
    return;
  }

  if(_lbMode === 'period' && typeof fetchPeriodLeaderboard === 'function'){
    const board = await fetchPeriodLeaderboard(_lbPeriod, _lbScope, { previous: false });
    _renderLbFramedRows(list, board.entries.slice(0, 100), myName, _lbPeriod);
    const mine = board.entries.find(e => e.name === myName || (typeof getOnlineUid==='function' && e.playerId===getOnlineUid()));
    if(myRankBox){
      myRankBox.textContent = mine
        ? (typeof t==='function'?t('lbMyRank', mine.rank, board.entries.length, mine.score.toLocaleString()):('#'+mine.rank))
        : (typeof t==='function'?t('lbNoRank'):'');
    }
    await _updateClaimButton();
    return;
  }
}

function initLeaderboardPanel(){
  const btn = document.getElementById('leaderboard-btn');
  const panel = document.getElementById('leaderboard-panel');
  if(!btn || !panel) return;

  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _lbMode = tab.dataset.lbMode || 'period';
      renderLeaderboardPanel();
    });
  });
  document.querySelectorAll('.lb-scope-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _lbScope = tab.dataset.lbScope || 'world';
      renderLeaderboardPanel();
    });
  });
  document.querySelectorAll('.lb-period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _lbPeriod = tab.dataset.lbPeriod || 'day';
      renderLeaderboardPanel();
    });
  });

  document.getElementById('lb-claim-btn')?.addEventListener('click', async ()=>{
    try{ sfxClick(); }catch(e){}
    if(typeof claimPeriodReward !== 'function') return;
    const res = await claimPeriodReward(_lbPeriod, _lbScope);
    if(res && res.ok){
      try{
        showComboFlash(0, false, '🎁 Top '+res.rank+' · 🪙'+res.gold+(res.diamond?(' · 💎'+res.diamond):''));
      }catch(e){}
      try{ if(typeof sfxUnlock==='function') sfxUnlock(); }catch(e){}
    } else {
      try{
        showComboFlash(0, false, res && res.reason==='claimed'
          ? (typeof t==='function'?t('lbClaimed'):'Đã nhận')
          : (typeof t==='function'?t('lbClaimUnavailable'):'Chưa nhận được'));
      }catch(e){}
    }
    await _updateClaimButton();
  });

  function openPanel(){
    if(typeof sfxClick === 'function') sfxClick();
    renderLeaderboardPanel();
    panel.classList.add('show');
  }
  function closePanel(){ panel.classList.remove('show'); }
  // leaderboard-btn / set-btn-leaderboard giờ mở "Thẻ trò chơi" (xem
  // js/gpcard.js: openGpcardPanel) thay vì gọi thẳng openPanel() ở đây — không
  // còn gắn listener ở 2 nút đó nữa để tránh mở chồng 2 panel cùng lúc.
  document.getElementById('leaderboard-close-btn').addEventListener('click', closePanel);
  panel.addEventListener('click', (e) => { if(e.target === panel) closePanel(); });
}
