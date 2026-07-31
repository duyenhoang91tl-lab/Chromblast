// ═══════════════════════════════════════════════════════════════
// js/versus-ranks.js — Danh hiệu Đấu 1-1 (Versus online), 10 bậc × 5 cấp độ mỗi bậc
// Nạp SAU online-services.js, TRƯỚC online-ui.js
//
// CHỈ tính trận Online (roomId thật) — trận "Cùng máy" (2 người ngồi chung thiết bị)
// KHÔNG cộng điểm/rank.
//
// Field Firestore dùng chung với players/{uid}: pvpWins, pvpLosses, pvpDraws, pvpPoints
// (xem functions/index.js — applyMatchResult, nhánh gameType !== 'caro').
// Thắng +25, thua -25 (sàn 0), hoà +0 — khớp đúng công thức server thật.
// ═══════════════════════════════════════════════════════════════

const VERSUS_STATS_KEY = 'chromablast_versus_stats';
const VS_RANK_WIN_PTS = 25;
const VS_RANK_DRAW_PTS = 0;
const VS_RANK_LOSS_PTS = -25; // đối xứng với thắng — điểm không xuống dưới 0 (xem applyLocalVersusResult)

/** 10 bậc danh hiệu Versus. Mỗi bậc chia làm 5 cấp độ con (5 = mới vào bậc, 1 = sắp
 * lên bậc kế) — ví dụ "Tân thủ 5" → ... → "Tân thủ 1" → "Nhập môn 5" → ...
 * `step` = số điểm cho mỗi cấp độ con trong bậc đó. */
const VERSUS_RANKS = [
  { id:'v_novice',     min:0,     step:20,  icon:'⚔️', vi:'Tân thủ',    en:'Rookie' },
  { id:'v_beginner',   min:100,   step:40,  icon:'🔰', vi:'Nhập môn',   en:'Beginner' },
  { id:'v_fighter',    min:300,   step:60,  icon:'🛡️', vi:'Chiến binh', en:'Fighter' },
  { id:'v_veteran',    min:600,   step:100, icon:'🗡️', vi:'Tinh nhuệ',  en:'Veteran' },
  { id:'v_expert',     min:1100,  step:160, icon:'🎯', vi:'Cao thủ',    en:'Expert' },
  { id:'v_elite',      min:1900,  step:240, icon:'⭐', vi:'Tinh anh',   en:'Elite' },
  { id:'v_master',     min:3100,  step:360, icon:'🏅', vi:'Bậc thầy',   en:'Master' },
  { id:'v_legend',     min:4900,  step:540, icon:'🌟', vi:'Huyền thoại', en:'Legend' },
  { id:'v_unrival',    min:7600,  step:780, icon:'👑', vi:'Vô song',    en:'Unrivaled' },
  { id:'v_invincible', min:11500, step:780, icon:'🔱', vi:'Bất Bại',    en:'Invincible' },
];

/** Trả về {icon, tierName, subLevel, name (vd "Tân thủ 5"), points, ...} cho 1 mức điểm. */
function getVersusRank(points){
  const pts = Math.max(0, points || 0);
  let idx = 0;
  for(let i=0;i<VERSUS_RANKS.length;i++){ if(pts >= VERSUS_RANKS[i].min) idx = i; }
  const tier = VERSUS_RANKS[idx];
  const next = VERSUS_RANKS[idx + 1] || null;
  const offset = pts - tier.min;
  let subIndex = Math.floor(offset / tier.step);
  if(subIndex > 4) subIndex = 4;
  const subLevel = 5 - subIndex;
  const tierName = t('versusRank_' + tier.id);
  const nextSubMin = tier.min + (subIndex + 1) * tier.step;
  const progress = next || subIndex < 4
    ? Math.min(100, Math.round((offset - subIndex*tier.step) / tier.step * 100))
    : 100;
  return {
    ...tier,
    points: pts,
    tier: idx,
    tierName,
    subLevel,
    name: tierName + ' ' + subLevel,
    nextMin: next ? next.min : null,
    nextTierName: next ? t('versusRank_' + next.id) : null,
    nextSubMin,
    progress
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

/** Đồng bộ cache local từ players/{uid} (nguồn thật, do Cloud Function ghi) — gọi khi
 * mở hub Đấu 1-1 online để cache sẵn sàng trước lúc tạo/vào phòng. */
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
