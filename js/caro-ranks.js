// ═══════════════════════════════════════════════════════════════
// js/caro-ranks.js — Danh hiệu Caro, điểm, thống kê W/L/D, BXH
// Nạp SAU online-services.js, TRƯỚC caro.js
// ═══════════════════════════════════════════════════════════════

const CARO_STATS_KEY = 'chromablast_caro_stats';
const CARO_WIN_PTS = 25;
const CARO_DRAW_PTS = 8;
const CARO_LOSS_PTS = -25; // đối xứng với thắng — điểm không xuống dưới 0 (xem applyLocalCaroResult)

/** Bậc danh hiệu theo tổng điểm Caro */
const CARO_RANKS = [
  { id:'novice',    min:0,    icon:'❌⭕', vi:'Tân thủ',    en:'Novice' },
  { id:'beginner',  min:50,   icon:'📘', vi:'Nhập môn',   en:'Beginner' },
  { id:'skilled',   min:150,  icon:'♟️', vi:'Thạo cờ',    en:'Skilled' },
  { id:'expert',    min:350,  icon:'⚔️', vi:'Cao thủ',    en:'Expert' },
  { id:'master',    min:700,  icon:'🏆', vi:'Kỳ thủ',    en:'Master' },
  { id:'grand',     min:1200, icon:'👑', vi:'Đại sư',    en:'Grandmaster' },
  { id:'platinum',  min:1800, icon:'🤍', vi:'Bạch kim',   en:'Platinum' },
  { id:'diamond',   min:2500, icon:'💎', vi:'Kim cương',  en:'Diamond' },
  { id:'elite',     min:3300, icon:'⭐', vi:'Tinh anh',   en:'Elite' },
  { id:'legend',    min:4200, icon:'🌟', vi:'Huyền thoại', en:'Legend' },
  { id:'mythic',    min:5200, icon:'✨', vi:'Thần thoại', en:'Mythic' },
  { id:'warlord',   min:6500, icon:'🔥', vi:'Chiến thần', en:'Warlord' },
];

function getCaroRank(points){
  const pts = Math.max(0, points || 0);
  let rank = CARO_RANKS[0];
  for(const r of CARO_RANKS){
    if(pts >= r.min) rank = r;
  }
  const idx = CARO_RANKS.indexOf(rank);
  const next = CARO_RANKS[idx + 1] || null;
  return {
    ...rank,
    points: pts,
    tier: idx,
    name: t('caroRank_' + rank.id),
    nextMin: next ? next.min : null,
    nextName: next ? t('caroRank_' + next.id) : null,
    progress: next ? Math.min(100, Math.round((pts - rank.min) / (next.min - rank.min) * 100)) : 100
  };
}

function normalizeCaroStats(raw){
  const d = raw || {};
  const wins = d.caroWins || d.wins || 0;
  const losses = d.caroLosses || d.losses || 0;
  const draws = d.caroDraws || d.draws || 0;
  const points = d.caroPoints || d.points || 0;
  const total = wins + losses + draws;
  const winRate = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;
  return { wins, losses, draws, points, total, winRate, rank: getCaroRank(points) };
}

function getLocalCaroStats(){
  try{
    const raw = safeGet(CARO_STATS_KEY);
    if(raw) return normalizeCaroStats(JSON.parse(raw));
  }catch(e){}
  return normalizeCaroStats({});
}

function saveLocalCaroStats(stats){
  safeSet(CARO_STATS_KEY, JSON.stringify({
    caroWins: stats.wins,
    caroLosses: stats.losses,
    caroDraws: stats.draws,
    caroPoints: stats.points
  }));
}

function applyLocalCaroResult(outcome){
  const s = getLocalCaroStats();
  if(outcome === 'win'){ s.wins++; s.points += CARO_WIN_PTS; }
  else if(outcome === 'loss'){ s.losses++; s.points = Math.max(0, s.points + CARO_LOSS_PTS); }
  else if(outcome === 'draw'){ s.draws++; s.points += CARO_DRAW_PTS; }
  s.total = s.wins + s.losses + s.draws;
  s.winRate = s.total > 0 ? Math.round((s.wins / s.total) * 1000) / 10 : 0;
  s.rank = getCaroRank(s.points);
  saveLocalCaroStats(s);
  return s;
}

async function fetchMyCaroStats(){
  if(typeof initOnlineServices === 'function' && await initOnlineServices() && typeof getOnlineUid === 'function' && getOnlineUid()){
    try{
      const snap = await firebase.firestore().collection('players').doc(getOnlineUid()).get();
      if(snap.exists){
        const stats = normalizeCaroStats(snap.data());
        saveLocalCaroStats(stats);
        return stats;
      }
    }catch(e){}
  }
  return getLocalCaroStats();
}

async function fetchCaroLeaderboard(limit){
  if(typeof initOnlineServices === 'function' && await initOnlineServices()){
    try{
      const snap = await firebase.firestore().collection('players')
        .orderBy('caroPoints', 'desc').limit(limit || 30).get();
      const rows = [];
      snap.docs.forEach((doc, i) => {
        const d = doc.data();
        const stats = normalizeCaroStats(d);
        if(stats.total <= 0 && stats.points <= 0) return;
        rows.push({
          rank: i + 1,
          playerId: doc.id,
          name: d.displayName || 'Player',
          ...stats
        });
      });
      return rows;
    }catch(e){ console.warn('[caro] leaderboard', e); }
  }
  return [];
}

function renderCaroStatsCard(container, stats){
  if(!container || !stats) return;
  const r = stats.rank;
  container.innerHTML =
    '<div class="caro-rank-badge">'+
      '<span class="caro-rank-icon">'+r.icon+'</span>'+
      '<div class="caro-rank-info">'+
        '<div class="caro-rank-name">'+escapeHtml(r.name)+'</div>'+
        '<div class="caro-rank-pts">'+stats.points.toLocaleString()+' '+t('caroPts')+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="caro-wld">'+
      '<span class="caro-w">'+t('caroWins')+': <b>'+stats.wins+'</b></span>'+
      '<span class="caro-l">'+t('caroLosses')+': <b>'+stats.losses+'</b></span>'+
      '<span class="caro-d">'+t('caroDraws')+': <b>'+stats.draws+'</b></span>'+
    '</div>'+
    '<div class="caro-rate">'+t('caroWinRate', stats.winRate)+' · '+t('caroPlayed', stats.total)+'</div>'+
    (r.nextMin != null
      ? '<div class="caro-rank-progress"><div class="caro-rank-bar" style="width:'+r.progress+'%"></div></div>'+
        '<div class="caro-rank-next">'+t('caroNextRank', r.nextName, Math.max(0, r.nextMin - stats.points))+'</div>'
      : '<div class="caro-rank-next">'+t('caroMaxRank')+'</div>');
}

function renderCaroLeaderboardList(listEl, rows, myName){
  if(!listEl) return;
  listEl.innerHTML = '';
  if(!rows.length){
    listEl.innerHTML = '<div class="lb-empty">'+t('caroLbEmpty')+'</div>';
    return;
  }
  rows.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row caro-lb-row' + (e.name === myName ? ' me' : '');
    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
    row.innerHTML =
      '<span class="lb-rank">'+medal+'</span>'+
      '<span class="lb-name">'+escapeHtml(e.rank.icon)+' '+
        (typeof rankNameFxHtml==='function' ? rankNameFxHtml(e.name, e.rank.tier) : escapeHtml(e.name))+
        '<span class="caro-lb-title">'+escapeHtml(e.rank.name)+'</span></span>'+
      '<span class="lb-score caro-lb-wld">'+e.wins+'/'+e.losses+'/'+e.draws+
        ' <small>'+e.winRate+'%</small></span>'+
      '<span class="caro-lb-pts">'+e.points+'</span>';
    listEl.appendChild(row);
  });
}

async function renderCaroRankPanel(){
  const statsBox = document.getElementById('caro-my-stats');
  const list = document.getElementById('caro-lb-list');
  const myRankBox = document.getElementById('caro-lb-my-rank');
  const stats = await fetchMyCaroStats();
  renderCaroStatsCard(statsBox, stats);
  const rows = await fetchCaroLeaderboard(25);
  const myName = currentPlayerName();
  renderCaroLeaderboardList(list, rows, myName);
  if(myRankBox){
    const mine = rows.find(r => r.name === myName);
    myRankBox.textContent = mine
      ? t('caroLbMyRank', mine.rank, rows.length, mine.wins, mine.losses, mine.draws, mine.winRate, mine.points)
      : (stats.total > 0 ? t('caroLbMyStats', stats.wins, stats.losses, stats.draws, stats.winRate, stats.points) : t('caroLbNoPlay'));
  }
}

function initCaroRankPanel(){
  const btn = document.getElementById('caro-rank-btn');
  const panel = document.getElementById('caro-rank-panel');
  if(!btn || !panel) return;
  btn.addEventListener('click', ()=>{
    try{ sfxClick(); }catch(e){}
    renderCaroRankPanel();
    panel.classList.add('show');
  });
  document.getElementById('caro-rank-close')?.addEventListener('click', ()=> panel.classList.remove('show'));
  panel.addEventListener('click', e=>{ if(e.target===panel) panel.classList.remove('show'); });
}

(function(){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initCaroRankPanel);
  } else initCaroRankPanel();
})();
