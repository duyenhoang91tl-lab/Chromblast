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
  const btn = document.getElementById('daily-btn');
  if(!btn) return;
  btn.classList.toggle('has-reward', getDailyStatus().canClaim);
}

const DAILY_AUTOSHOW_KEY_PREFIX = 'chromablast_daily_autoshow_';

function dailyAutoShowKey(){
  const who = (typeof currentUser !== 'undefined' && currentUser && currentUser.username) ? currentUser.username : '_guest';
  return DAILY_AUTOSHOW_KEY_PREFIX + who;
}

/** Tự động mở panel điểm danh đúng 1 lần cho lần đầu vào game trong ngày —
 *  kể cả khi người chơi đóng panel mà chưa bấm nhận, các lần mở app tiếp
 *  theo TRONG CÙNG NGÀY sẽ không tự bật lại nữa (chỉ mở tay qua daily-btn
 *  như bình thường). Gọi từ ui-gates.js ngay sau khi start-screen hiện thật. */
function maybeAutoShowDailyPanel(){
  try{
    const today = todayStr();
    if(safeGet(dailyAutoShowKey()) === today) return; // đã tự hiện hôm nay rồi
    safeSet(dailyAutoShowKey(), today);
    if(!getDailyStatus().canClaim) return; // đã điểm danh hôm nay rồi thì khỏi làm phiền
    const btn = document.getElementById('daily-btn');
    if(btn) btn.click(); // tái dùng đúng luồng openPanel() đã có (sfx, render, show)
  }catch(e){}
}

/** Vẽ 1 ngày trong lưới điểm danh tháng. */
function _dailyDayEl(day, dom, isToday){
  const cell = document.createElement('div');
  let cls = 'daily-day';
  if(day < dom) cls += ' claimed';
  else if(day === dom) cls += (isToday ? ' available' : ' claimed');
  else cls += ' locked';
  if(day === dom) cls += ' today';
  cell.className = cls;

  const chest = checkinChestForDay(day);
  let inner = '<div class="daily-day-num">' + day + '</div>';
  inner += '<div class="daily-day-xp">+' + (DAILY_REWARD_XP[(day - 1) % DAILY_REWARD_XP.length] || 0) + ' XP</div>';
  if(chest){
    cls += ' chest';
    cell.className = cls;
    cell.style.setProperty('--chest-tint', chest.tier.tint);
    inner += '<div class="daily-day-chest">' + chest.tier.icon + '</div>';
  }
  cell.innerHTML = inner;
  return cell;
}


function renderDailyPanel(){
  const status = getDailyStatus();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dom = status.day;
  const dim = daysInMonth();
  const firstDow = new Date(y, m, 1).getDay(); // 0 = CN
  const startPad = (firstDow + 6) % 7; // bắt đầu từ Thứ 2

  const monthHead = document.getElementById('daily-month-head');
  if(monthHead){
    monthHead.textContent = (typeof t==='function' && typeof ttf==='function')
      ? ttf('questsCalMonth', 'Tháng {0}/{1}', m+1, y)
      : ('Tháng '+(m+1)+'/'+y);
  }

  const list = document.getElementById('daily-reward-list');
  if(list){
    list.innerHTML = '';
    ['T2','T3','T4','T5','T6','T7','CN'].forEach(function(lab){
      const d = document.createElement('div');
      d.className = 'daily-day-dow';
      d.textContent = lab;
      list.appendChild(d);
    });
    for(let i = 0; i < startPad; i++){
      const blank = document.createElement('div');
      blank.className = 'daily-day empty';
      list.appendChild(blank);
    }
    for(let day = 1; day <= dim; day++){
      list.appendChild(_dailyDayEl(day, dom, status.canClaim));
    }
  }

  const btn = document.getElementById('daily-claim-btn');
  if(btn){
    if(status.alreadyClaimedToday){
      btn.textContent = typeof t==='function' ? t('dailyClaimed') : '✅ Đã điểm danh hôm nay — quay lại vào ngày mai';
      btn.disabled = true;
    } else {
      const xp = DAILY_REWARD_XP[(dom - 1) % DAILY_REWARD_XP.length] || 0;
      btn.textContent = typeof t==='function' ? t('dailyClaim', dom, xp) : ('🎁 Điểm danh ngày ' + dom + ' (+' + xp + ' XP)');
      btn.disabled = false;
    }
  }

  const legend = document.getElementById('daily-chest-legend');
  if(legend){
    legend.innerHTML = Object.keys(CHECKIN_CHEST_DAYS).sort(function(a,b){ return a-b; }).map(function(day){
      const tier = CHECKIN_CHEST_DEFS[CHECKIN_CHEST_DAYS[day]];
      const r = CHECKIN_CHEST_REWARDS[day] || {};
      const parts = [];
      if(r.gold) parts.push('🪙' + r.gold);
      if(r.diamonds) parts.push('💎' + r.diamonds);
      return '<div class="daily-legend-item" style="--chest-tint:'+tier.tint+'"><span class="daily-legend-chest">'+tier.icon+'</span>'
        + '<span class="daily-legend-text">Ngày '+day+' · '+tier.name+(parts.length ? ' · '+parts.join('+') : '')+'</span></div>';
    }).join('');
  }
}

function initDailyRewardPanel(){
  const btn = document.getElementById('daily-btn');
  const panel = document.getElementById('daily-panel');
  if(!btn || !panel) return;

  function openPanel(){
    if(typeof sfxClick === 'function') sfxClick();
    renderDailyPanel();
    panel.classList.add('show');
  }
  function closePanel(){ panel.classList.remove('show'); }

  btn.addEventListener('click', openPanel);
  document.getElementById('daily-close-btn').addEventListener('click', closePanel);
  panel.addEventListener('click', (e)=>{ if(e.target === panel) closePanel(); });

  document.getElementById('daily-claim-btn').addEventListener('click', ()=>{
    const res = claimDailyReward();
    if(res){
      if(typeof showComboFlash === 'function'){
        const h = res.hearts|0;
        let msg = typeof t==='function'
          ? t('dailyFlash', res.xp, res.day, h)
          : ('🎁 +'+res.xp+' XP · 🪙 +'+(res.gold||1)+(h?(' · ❤️ +'+h):'')+' (ngày '+res.day+'/'+daysInMonth()+')');
        if(res.milestone){
          const tier = res.milestone.tier || {};
          msg += ' · ' + (typeof t==='function'?t('dailyMilestoneFlash', res.milestone.day):('Mốc '+res.milestone.day+' ngày!'))
            + (tier.name ? (' '+tier.icon+' '+tier.name) : '');
          if(res.milestone.gold) msg += ' 🪙+'+res.milestone.gold;
          if(res.milestone.diamonds) msg += ' 💎+'+res.milestone.diamonds;
        }
        showComboFlash(0, false, msg);
      }
      if(typeof sfxUnlock === 'function') sfxUnlock();
      renderDailyPanel();
      updateDailyBadge();
    }
  });

  updateDailyBadge();
}
