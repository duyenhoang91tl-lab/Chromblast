// ═══════════════════════════════════════════════════════════════
// js/daily-rewards.js — ĐIỂM DANH THEO THÁNG
// Lưới cả tháng (30/31 ngày), mỗi ngày điểm danh độc lập theo dayOfMonth.
// Rương đặc biệt: ngày 3 = Gỗ, 7 = Bạc, 14 = Vàng, 21 = Bạch Kim,
// 30 (tháng 30 ngày) / 31 (tháng 31 ngày) = Kim Cương.
// Nạp SAU save.js + progression.js (dùng safeGet/safeSet, addPlayerXP),
// TRƯỚC main.js. Lưu riêng theo từng tài khoản (currentUser.username) để
// không lẫn quà giữa nhiều người chơi dùng chung máy/trình duyệt.
// ═══════════════════════════════════════════════════════════════

const DAILY_KEY_PREFIX = 'chromablast_daily_';

// Thưởng XP theo ngày trong tháng (tăng dần về cuối tháng, có cao điểm cuối).
const DAILY_REWARD_XP = (function () {
  const base = [20, 22, 25, 28, 30, 34, 38, 42, 46, 50, 55, 60, 65, 70, 76,
    82, 88, 95, 102, 110, 118, 126, 135, 145, 155, 166, 178, 190, 203, 218, 240];
  return base;
})();

/** Rương đặc biệt trong tháng: loại rương → thông tin hiển thị. */
const CHECKIN_CHEST_DEFS = {
  wood:     { key: 'wood',     name: 'Rương Gỗ',        icon: '🪵', tint: '#b98a5c' },
  silver:   { key: 'silver',   name: 'Rương Bạc',       icon: '📦', tint: '#c9ced6' },
  gold:     { key: 'gold',     name: 'Rương Vàng',      icon: '🎁', tint: '#ffd54a' },
  platinum: { key: 'platinum', name: 'Rương Bạch Kim',  icon: '🏆', tint: '#d7e6ee' },
  diamond:  { key: 'diamond',  name: 'Rương Kim Cương', icon: '💎', tint: '#7ee8fa' },
};

/** dayOfMonth → loại rương. Ngày 30/31 cùng lấy rương Kim Cương. */
const CHECKIN_CHEST_DAYS = { 3: 'wood', 7: 'silver', 14: 'gold', 21: 'platinum', 30: 'diamond', 31: 'diamond' };

/** dayOfMonth → phần thưởng thêm của rương (không lặp lại, tính theo ngày trong tháng). */
const CHECKIN_CHEST_REWARDS = {
  3:  { gold: 30 },
  7:  { gold: 80 },
  14: { diamonds: 12 },
  21: { diamonds: 18 },
  30: { diamonds: 30 },
  31: { diamonds: 30 },
};

function dailyStorageKey(){
  const who = (typeof currentUser !== 'undefined' && currentUser && currentUser.username) ? currentUser.username : '_guest';
  return DAILY_KEY_PREFIX + who;
}

function todayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

/** "YYYY-MM" — khoá reset an toàn mỗi tháng. */
function monthKey(){
  return todayStr().slice(0, 7);
}

/** dayOfMonth hôm nay. */
function dayOfMonth(){
  return new Date().getDate();
}

function daysInMonth(){
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function getDailyState(){
  try{ return JSON.parse(safeGet(dailyStorageKey()) || '{}'); }
  catch(e){ return {}; }
}
function saveDailyState(st){ safeSet(dailyStorageKey(), JSON.stringify(st)); }

/** Kiểm tra 1 ngày (dayOfMonth) đã điểm danh trong tháng hiện tại chưa. */
function isClaimedThisMonth(st, day){
  const mk = monthKey();
  return !!(st.months && st.months[mk] && st.months[mk][String(day)]);
}

/** { day, streakDay, alreadyClaimedToday, canClaim } — day = dayOfMonth hôm nay.
 *  streakDay giữ để tương thích bản cũ (account-achievements.js hiển thị chuỗi). */
function getDailyStatus(){
  const st = getDailyState();
  const today = dayOfMonth();
  const claimed = isClaimedThisMonth(st, today);
  return { day: today, streakDay: today, alreadyClaimedToday: claimed, canClaim: !claimed };
}

/** Rương đặc biệt của 1 ngày trong tháng — trả về {tier, reward} hoặc null. */
function checkinChestForDay(day){
  const tierKey = CHECKIN_CHEST_DAYS[day];
  if(!tierKey) return null;
  return { tier: CHECKIN_CHEST_DEFS[tierKey], reward: CHECKIN_CHEST_REWARDS[day] || {} };
}


function claimDailyReward(){
  const status = getDailyStatus();
  if(!status.canClaim) return null;
  const dom = dayOfMonth();
  const xp = DAILY_REWARD_XP[(dom - 1) % DAILY_REWARD_XP.length];
  const gold = 1; // điểm danh: +1 vàng
  const heartWant = 1; // +1 tim / điểm danh (tổng nhiệm vụ ngày ≤ 5 tim)
  const st = getDailyState();

  // Lưu theo dayOfMonth dưới khoá tháng — sang tháng mới tự reset (khoá khác).
  st.lastClaim = todayStr();
  st.streak = dom;
  st.months = st.months || {};
  st.months[monthKey()] = st.months[monthKey()] || {};
  st.months[monthKey()][String(dom)] = 1;
  saveDailyState(st);

  if(typeof addPlayerXP === 'function') addPlayerXP(xp);
  if(typeof grantGold === 'function') grantGold(gold, typeof t==='function'?t('dailyGold'):'Điểm danh');
  let hearts = 0;
  try{
    if(typeof grantDailyQuestHearts === 'function'){
      hearts = grantDailyQuestHearts(heartWant, typeof t==='function'?t('dailyHeart'):'Điểm danh') || 0;
    } else if(typeof grantHearts === 'function'){
      grantHearts(heartWant, typeof t==='function'?t('dailyHeart'):'Điểm danh');
      hearts = heartWant;
    }
  }catch(e){}

  // Rương đặc biệt của ngày (3/7/14/21/30/31).
  let milestone = null;
  const chest = checkinChestForDay(dom);
  if(chest){
    const reasonText = (typeof t==='function'?t('dailyGold'):'Điểm danh') + ' ' + dom;
    if(chest.reward.gold && typeof grantGold === 'function') grantGold(chest.reward.gold, reasonText);
    if(chest.reward.diamonds && typeof grantDiamonds === 'function') grantDiamonds(chest.reward.diamonds, reasonText);
    milestone = { day: dom, gold: chest.reward.gold || 0, diamonds: chest.reward.diamonds || 0, tier: chest.tier };
  }

  try{ if(typeof noteCupLoginClaim==='function') noteCupLoginClaim(); }catch(e){}
  try{ if(typeof noteQuestEvent==='function') noteQuestEvent('checkin', 1); }catch(e){}
  try{ if(typeof logGameEvent==='function') logGameEvent('daily_reward_claim', { day: dom, xp, gold }); }catch(e){}
  return { day: dom, xp, gold, hearts, milestone };
}

function updateDailyBadge(){
  // Điểm danh giờ nằm TRONG màn Nhiệm vụ (#quests-screen, tab Ngày) — badge đỏ
  // báo "có thể điểm danh" gắn vào nút mở màn Nhiệm vụ thay vì nút 🎁 cũ.
  const qbtn = document.getElementById('set-btn-quests');
  if(qbtn) qbtn.classList.toggle('has-quest', getDailyStatus().canClaim);
  const cbtn = document.getElementById('acchub-btn-quests');
  if(cbtn) cbtn.classList.toggle('has-quest', getDailyStatus().canClaim);
}

const DAILY_AUTOSHOW_KEY_PREFIX = 'chromablast_daily_autoshow_';

function dailyAutoShowKey(){
  const who = (typeof currentUser !== 'undefined' && currentUser && currentUser.username) ? currentUser.username : '_guest';
  return DAILY_AUTOSHOW_KEY_PREFIX + who;
}

/** Lần đầu vào game trong ngày: nếu chưa điểm danh thì tự mở màn Nhiệm vụ ở tab
 *  Ngày (nơi duy nhất có lịch điểm danh tháng). Mỗi ngày chỉ tự mở 1 lần. */
function maybeAutoShowDailyPanel(){
  try{
    const today = todayStr();
    if(safeGet(dailyAutoShowKey()) === today) return; // đã tự hiện hôm nay rồi
    safeSet(dailyAutoShowKey(), today);
    if(!getDailyStatus().canClaim) return; // đã điểm danh hôm nay rồi thì khỏi làm phiền
    if(typeof openQuestsScreen === 'function') openQuestsScreen('day');
  }catch(e){}
}
