// ═══════════════════════════════════════════════════════════════
// js/leaderboard.js — BXH local + toàn cầu (Firebase) khi đã cấu hình
// Nạp SAU save.js + online-services.js, TRƯỚC main.js.
// ═══════════════════════════════════════════════════════════════

const LEADERBOARD_KEY = 'chromablast_leaderboard_local';
const LEADERBOARD_DEV_SEED = [
  {name:'Minh',        score: 4820},
  {name:'Huyền Trang',  score: 3960},
  {name:'Quang',        score: 3510},
  {name:'Bảo Anh',      score: 2870},
  {name:'Nam',          score: 2340},
];

let _lbMode = 'local'; // 'local' | 'global-solo' | 'global-pvp'

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

function currentPlayerName(){
  if(typeof getOnlineDisplayName === 'function' && typeof isOnlineServicesEnabled === 'function' && isOnlineServicesEnabled() && getOnlineUid()){
    const on = getOnlineDisplayName();
    if(on) return on;
  }
  if(typeof currentUser !== 'undefined' && currentUser && currentUser.username) return currentUser.username;
  let gid = safeGet('chromablast_guest_name');
  if(!gid){
    gid = 'Khách#' + Math.floor(1000 + Math.random()*9000);
    safeSet('chromablast_guest_name', gid);
  }
  return gid;
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

function _renderLbRows(list, top, myName){
  list.innerHTML = '';
  if(!top.length){
    list.innerHTML = '<div class="lb-empty">'+t('lbEmpty')+'</div>';
    return;
  }
  top.forEach((e,i) => {
    const row = document.createElement('div');
    row.className = 'lb-row' + (e.name === myName ? ' me' : '');
    const medal = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : String(i+1);
    row.innerHTML = '<span class="lb-rank">'+medal+'</span>'
      + '<span class="lb-name">'+escapeHtml(e.name)+'</span>'
      + '<span class="lb-score">'+e.score.toLocaleString()+'</span>';
    list.appendChild(row);
  });
}

async function renderLeaderboardPanel(){
  const list = document.getElementById('leaderboard-list');
  const myRankBox = document.getElementById('leaderboard-my-rank');
  const sub = document.getElementById('leaderboard-sub');
  const myName = currentPlayerName();

  if(sub){
    if(_lbMode === 'local') sub.textContent = t('lbSub');
    else if(_lbMode === 'global-pvp') sub.textContent = t('lbSubPvp');
    else sub.textContent = t('lbSubGlobal');
  }

  if(!list) return;
  list.innerHTML = '<div class="lb-empty">'+t('lbLoading')+'</div>';

  let top = [], mine = null;
  if(_lbMode === 'local'){
    top = fetchTopScores(20);
    mine = fetchMyRank();
  } else if(typeof fetchGlobalLeaderboard === 'function' && isOnlineServicesEnabled()){
    const mode = _lbMode === 'global-pvp' ? 'pvp' : 'solo';
    top = await fetchGlobalLeaderboard(20, mode) || [];
    mine = await fetchMyGlobalRank(mode);
  } else {
    list.innerHTML = '<div class="lb-empty">'+t('lbOfflineGlobal')+'</div>';
    if(myRankBox) myRankBox.textContent = '';
    return;
  }

  _renderLbRows(list, top, myName);
  if(myRankBox){
    myRankBox.textContent = mine
      ? t('lbMyRank', mine.rank, mine.total, mine.score.toLocaleString())
      : t('lbNoRank');
  }
}

function initLeaderboardPanel(){
  const btn = document.getElementById('leaderboard-btn');
  const panel = document.getElementById('leaderboard-panel');
  if(!btn || !panel) return;

  document.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.lb-tab').forEach(x => x.classList.remove('active'));
      tab.classList.add('active');
      _lbMode = tab.dataset.lbMode || 'local';
      renderLeaderboardPanel();
    });
  });

  function openPanel(){
    if(typeof sfxClick === 'function') sfxClick();
    renderLeaderboardPanel();
    panel.classList.add('show');
  }
  function closePanel(){ panel.classList.remove('show'); }
  btn.addEventListener('click', openPanel);
  document.getElementById('leaderboard-close-btn').addEventListener('click', closePanel);
  panel.addEventListener('click', (e) => { if(e.target === panel) closePanel(); });
}
