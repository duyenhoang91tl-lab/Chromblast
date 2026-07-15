// ═══════════════════════════════════════════════════════════════
// js/daily-rewards.js — ĐIỂM DANH HÀNG NGÀY
// Chuỗi 7 ngày, thưởng XP tăng dần, đứt chuỗi nếu bỏ lỡ 1 ngày (quay về ngày 1).
// Nạp SAU save.js + progression.js (dùng safeGet/safeSet, addPlayerXP),
// TRƯỚC main.js. Lưu riêng theo từng tài khoản (currentUser.username) để
// không lẫn quà giữa nhiều người chơi dùng chung máy/trình duyệt.
// ═══════════════════════════════════════════════════════════════

const DAILY_REWARD_XP = [20, 30, 40, 60, 80, 120, 200]; // thưởng ngày 1..7, lặp lại theo chu kỳ
const DAILY_KEY_PREFIX = 'chromablast_daily_';

function dailyStorageKey(){
  const who = (typeof currentUser !== 'undefined' && currentUser && currentUser.username) ? currentUser.username : '_guest';
  return DAILY_KEY_PREFIX + who;
}

function todayStr(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getDailyState(){
  try{ return JSON.parse(safeGet(dailyStorageKey()) || '{}'); }
  catch(e){ return {}; }
}
function saveDailyState(st){ safeSet(dailyStorageKey(), JSON.stringify(st)); }

// { streakDay: 1-7, alreadyClaimedToday, canClaim }
function getDailyStatus(){
  const st = getDailyState();
  const today = todayStr();
  if(st.lastClaim === today){
    return { streakDay: st.streak || 1, alreadyClaimedToday: true, canClaim: false };
  }
  let streak = 1;
  if(st.lastClaim){
    const last = new Date(st.lastClaim + 'T00:00:00');
    const now  = new Date(today + 'T00:00:00');
    const diffDays = Math.round((now - last) / 86400000);
    streak = (diffDays === 1) ? (((st.streak || 0) % 7) + 1) : 1; // đúng 1 ngày sau → nối chuỗi; ngược lại → reset
  }
  return { streakDay: streak, alreadyClaimedToday: false, canClaim: true };
}

function claimDailyReward(){
  const status = getDailyStatus();
  if(!status.canClaim) return null;
  const xp = DAILY_REWARD_XP[(status.streakDay - 1) % 7];
  const st = getDailyState();
  st.lastClaim = todayStr();
  st.streak = status.streakDay;
  saveDailyState(st);
  if(typeof addPlayerXP === 'function') addPlayerXP(xp);
  try{ if(typeof noteCupLoginClaim==='function') noteCupLoginClaim(); }catch(e){}
  return { day: status.streakDay, xp };
}

function updateDailyBadge(){
  const btn = document.getElementById('daily-btn');
  if(!btn) return;
  btn.classList.toggle('has-reward', getDailyStatus().canClaim);
}

function renderDailyPanel(){
  const status = getDailyStatus();
  const list = document.getElementById('daily-reward-list');
  if(list){
    list.innerHTML = '';
    for(let i=1; i<=7; i++){
      const xp = DAILY_REWARD_XP[i-1];
      const div = document.createElement('div');
      let cls = 'daily-day';
      if(i < status.streakDay || (i === status.streakDay && status.alreadyClaimedToday)) cls += ' claimed';
      else if(i === status.streakDay) cls += ' today';
      else cls += ' locked';
      div.className = cls;
      div.innerHTML = '<div class="daily-day-num">Ngày '+i+'</div><div class="daily-day-xp">+'+xp+' XP</div>';
      list.appendChild(div);
    }
  }
  const btn = document.getElementById('daily-claim-btn');
  if(btn){
    if(status.alreadyClaimedToday){
      btn.textContent = '✅ Đã nhận hôm nay — quay lại vào ngày mai';
      btn.disabled = true;
    } else {
      btn.textContent = '🎁 Nhận quà ngày ' + status.streakDay + ' (+' + DAILY_REWARD_XP[(status.streakDay-1)%7] + ' XP)';
      btn.disabled = false;
    }
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
      if(typeof showComboFlash === 'function') showComboFlash(0, false, '🎁 +'+res.xp+' XP (ngày '+res.day+'/7)');
      if(typeof sfxUnlock === 'function') sfxUnlock();
      renderDailyPanel();
      updateDailyBadge();
    }
  });

  updateDailyBadge();
}
