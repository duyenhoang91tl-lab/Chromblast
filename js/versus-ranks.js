// ═══════════════════════════════════════════════════════════════
// js/versus-ranks.js — Danh hiệu Đấu 1-1 (Versus), điểm, thống kê W/L/D
// Nạp SAU online-services.js, TRƯỚC versus.js
//
// CHỈ tính trận Online (roomId thật, xem _vsEndMatch trong js/versus.js) —
// trận "Cùng máy" (2 người ngồi đối diện cùng thiết bị) KHÔNG cộng điểm/rank.
//
// Field Firestore dùng chung với players/{uid}: pvpWins, pvpLosses, pvpDraws,
// pvpPoints (xem functions/index.js — applyMatchResult, nhánh gameType !=='caro').
// Đặt tên có tiền tố "pvp" để không đụng field wins/losses/draws chung mà
// normalizeCaroStats() cũng đọc fallback — tránh 2 hệ điểm lẫn vào nhau.
//
// TÊN BẬC DANH HIỆU BÊN DƯỚI LÀ TẠM — sẽ đổi tên thật sau.
// ═══════════════════════════════════════════════════════════════

const VERSUS_STATS_KEY = 'chromablast_versus_stats';
const VS_RANK_WIN_PTS = 25;
const VS_RANK_DRAW_PTS = 0;
const VS_RANK_LOSS_PTS = -25; // đối xứng với thắng — điểm không xuống dưới 0 (xem applyLocalVersusResult)

/** Bậc danh hiệu Versus theo tổng điểm — TÊN TẠM, sẽ đổi sau. */
const VERSUS_RANKS = [
  { id:'vs_novice',   min:0,    icon:'🌱', vi:'Tân binh (tạm)',     en:'Recruit (temp)' },
  { id:'vs_beginner', min:50,   icon:'📘', vi:'Nhập môn (tạm)',     en:'Beginner (temp)' },
  { id:'vs_skilled',  min:150,  icon:'⚔️', vi:'Thạo trận (tạm)',    en:'Skilled (temp)' },
  { id:'vs_expert',   min:350,  icon:'🗡️', vi:'Cao thủ (tạm)',      en:'Expert (temp)' },
  { id:'vs_master',   min:700,  icon:'🏆', vi:'Đấu sĩ (tạm)',       en:'Duelist (temp)' },
  { id:'vs_grand',    min:1200, icon:'👑', vi:'Đại tướng (tạm)',    en:'Grandmaster (temp)' },
  { id:'vs_platinum', min:1800, icon:'🤍', vi:'Bạch kim (tạm)',     en:'Platinum (temp)' },
  { id:'vs_diamond',  min:2500, icon:'💎', vi:'Kim cương (tạm)',    en:'Diamond (temp)' },
  { id:'vs_elite',    min:3300, icon:'⭐', vi:'Tinh anh (tạm)',     en:'Elite (temp)' },
  { id:'vs_legend',   min:4200, icon:'🌟', vi:'Huyền thoại (tạm)',  en:'Legend (temp)' },
  { id:'vs_mythic',   min:5200, icon:'✨', vi:'Thần thoại (tạm)',   en:'Mythic (temp)' },
  { id:'vs_warlord',  min:6500, icon:'🔥', vi:'Chiến thần (tạm)',   en:'Warlord (temp)' },
];

/** Tên hiển thị theo ngôn ngữ hiện tại, KHÔNG qua i18n-content.js (tên còn tạm,
 * sẽ đổi sau) — chỉ dùng inline vi/en ngay trong VERSUS_RANKS ở trên. */
function _vsRankLangName(rank){
  try{
    const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'vi';
    if(lang !== 'vi' && rank.en) return rank.en;
  }catch(e){}
  return rank.vi;
}

function getVersusRank(points){
  const pts = Math.max(0, points || 0);
  let rank = VERSUS_RANKS[0];
  for(const r of VERSUS_RANKS){
    if(pts >= r.min) rank = r;
  }
  const idx = VERSUS_RANKS.indexOf(rank);
  const next = VERSUS_RANKS[idx + 1] || null;
  return {
    ...rank,
    points: pts,
    tier: idx,
    name: _vsRankLangName(rank),
    nextMin: next ? next.min : null,
    nextName: next ? _vsRankLangName(next) : null,
    progress: next ? Math.min(100, Math.round((pts - rank.min) / (next.min - rank.min) * 100)) : 100
  };
}

function normalizeVersusStats(raw){
  const d = raw || {};
  const wins = d.pvpWins || 0;
  const losses = d.pvpLosses || 0;
  const draws = d.pvpDraws || 0;
  const points = d.pvpPoints || 0;
  const total = wins + losses + draws;
  const winRate = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;
  return { wins, losses, draws, points, total, winRate, rank: getVersusRank(points) };
}

function getLocalVersusStats(){
  try{
    const raw = safeGet(VERSUS_STATS_KEY);
    if(raw) return normalizeVersusStats(JSON.parse(raw));
  }catch(e){}
  return normalizeVersusStats({});
}

function saveLocalVersusStats(stats){
  safeSet(VERSUS_STATS_KEY, JSON.stringify({
    pvpWins: stats.wins,
    pvpLosses: stats.losses,
    pvpDraws: stats.draws,
    pvpPoints: stats.points
  }));
}

/** Chỉ gọi cho trận ONLINE (xem _vsEndMatch) — trận cùng máy không tính. */
function applyLocalVersusResult(outcome){
  const s = getLocalVersusStats();
  if(outcome === 'win'){ s.wins++; s.points += VS_RANK_WIN_PTS; }
  else if(outcome === 'loss'){ s.losses++; s.points = Math.max(0, s.points + VS_RANK_LOSS_PTS); }
  else if(outcome === 'draw'){ s.draws++; s.points += VS_RANK_DRAW_PTS; }
  s.total = s.wins + s.losses + s.draws;
  s.winRate = s.total > 0 ? Math.round((s.wins / s.total) * 1000) / 10 : 0;
  s.rank = getVersusRank(s.points);
  saveLocalVersusStats(s);
  return s;
}

async function fetchMyVersusStats(){
  if(typeof initOnlineServices === 'function' && await initOnlineServices() && typeof getOnlineUid === 'function' && getOnlineUid()){
    try{
      const snap = await firebase.firestore().collection('players').doc(getOnlineUid()).get();
      if(snap.exists){
        const stats = normalizeVersusStats(snap.data());
        saveLocalVersusStats(stats);
        return stats;
      }
    }catch(e){}
  }
  return getLocalVersusStats();
}
