// ═══════════════════════════════════════════════════════════════
// js/caro-daily.js — Điểm danh hàng ngày riêng cho chế độ Caro
// Tách biệt với js/daily-rewards.js (điểm danh chung); dùng lại các
// hàm phụ trợ toàn cục todayStr/safeGet/safeSet/addPlayerXP/grantGold
// (đã nạp qua js/save.js + js/progression.js + js/daily-rewards.js).
// ═══════════════════════════════════════════════════════════════

const CARO_DAILY_XP = [15, 20, 30, 45, 60, 90, 150];
const CARO_DAILY_KEY_PREFIX = 'chromablast_carodaily_';

function caroDailyStorageKey(){
  const who = (typeof currentUser !== 'undefined' && currentUser && currentUser.username) ? currentUser.username : '_guest';
  return CARO_DAILY_KEY_PREFIX + who;
}

function caroDailyTodayStr(){
  if(typeof todayStr === 'function') return todayStr();
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getCaroDailyState(){
  try{ return JSON.parse(safeGet(caroDailyStorageKey()) || '{}'); }
  catch(e){ return {}; }
}
function saveCaroDailyState(st){ safeSet(caroDailyStorageKey(), JSON.stringify(st)); }

// { streakDay: 1-7, alreadyClaimedToday, canClaim }
function getCaroDailyStatus(){
  const st = getCaroDailyState();
  const today = caroDailyTodayStr();
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

function claimCaroDailyReward(){
  const status = getCaroDailyStatus();
  if(!status.canClaim) return null;
  const xp = CARO_DAILY_XP[(status.streakDay - 1) % 7];
  const gold = 1;
  const st = getCaroDailyState();
  st.lastClaim = caroDailyTodayStr();
  st.streak = status.streakDay;
  saveCaroDailyState(st);
  if(typeof addPlayerXP === 'function') addPlayerXP(xp);
  if(typeof grantGold === 'function') grantGold(gold, 'Điểm danh Caro');
  return { xp, gold, day: status.streakDay };
}

function renderCaroDailyPanel(){
  const status = getCaroDailyStatus();
  const list = document.getElementById('caro-daily-list');
  if(list){
    list.innerHTML = '';
    for(let i=1; i<=7; i++){
      const xp = CARO_DAILY_XP[i-1];
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
  const btn = document.getElementById('caro-daily-claim-btn');
  if(btn){
    if(status.alreadyClaimedToday){
      btn.textContent = '✅ Đã nhận hôm nay — quay lại vào ngày mai';
      btn.disabled = true;
    } else {
      const xp = CARO_DAILY_XP[(status.streakDay-1)%7];
      btn.textContent = '🎁 Nhận quà ngày ' + status.streakDay + ' (+' + xp + ' XP)';
      btn.disabled = false;
    }
  }
}

function updateCaroDailyBadge(){
  const status = getCaroDailyStatus();
  const badge = document.getElementById('caro-menu-daily-badge');
  if(badge) badge.hidden = !status.canClaim;
}
window.updateCaroDailyBadge = updateCaroDailyBadge;

function openCaroDailyPanel(){
  try{ sfxClick(); }catch(e){}
  renderCaroDailyPanel();
  document.getElementById('caro-daily-panel')?.classList.add('show');
}
window.openCaroDailyPanel = openCaroDailyPanel;

function initCaroDailyPanel(){
  const panel = document.getElementById('caro-daily-panel');
  if(!panel) return;
  document.getElementById('caro-daily-close-btn')?.addEventListener('click', ()=> panel.classList.remove('show'));
  panel.addEventListener('click', (e)=>{ if(e.target === panel) panel.classList.remove('show'); });
  document.getElementById('caro-daily-claim-btn')?.addEventListener('click', ()=>{
    const res = claimCaroDailyReward();
    if(res){
      if(typeof showComboFlash === 'function'){
        showComboFlash(0, false, '🎁 +'+res.xp+' XP · 🪙 +'+res.gold+' (ngày '+res.day+'/7)');
      }
      if(typeof sfxUnlock === 'function') sfxUnlock();
      renderCaroDailyPanel();
      updateCaroDailyBadge();
    }
  });
  updateCaroDailyBadge();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initCaroDailyPanel);
} else initCaroDailyPanel();
