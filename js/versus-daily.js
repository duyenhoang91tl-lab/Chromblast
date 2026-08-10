// ═══════════════════════════════════════════════════════════════
// js/versus-daily.js — Điểm danh hàng ngày riêng cho chế độ Versus
// Tách biệt với js/daily-rewards.js (điểm danh chung) và js/caro-daily.js
// (điểm danh riêng Caro); dùng lại các hàm phụ trợ toàn cục
// todayStr/safeGet/safeSet/addPlayerXP/grantGold (đã nạp qua js/save.js +
// js/progression.js + js/daily-rewards.js).
// ═══════════════════════════════════════════════════════════════

const VERSUS_DAILY_XP = [15, 20, 30, 45, 60, 90, 150];
const VERSUS_DAILY_KEY_PREFIX = 'chromablast_versusdaily_';

function versusDailyStorageKey(){
  const who = (typeof currentUser !== 'undefined' && currentUser && currentUser.username) ? currentUser.username : '_guest';
  return VERSUS_DAILY_KEY_PREFIX + who;
}

function versusDailyTodayStr(){
  if(typeof todayStr === 'function') return todayStr();
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getVersusDailyState(){
  try{ return JSON.parse(safeGet(versusDailyStorageKey()) || '{}'); }
  catch(e){ return {}; }
}
function saveVersusDailyState(st){ safeSet(versusDailyStorageKey(), JSON.stringify(st)); }

// { streakDay: 1-7, alreadyClaimedToday, canClaim }
function getVersusDailyStatus(){
  const st = getVersusDailyState();
  const today = versusDailyTodayStr();
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

function claimVersusDailyReward(){
  const status = getVersusDailyStatus();
  if(!status.canClaim) return null;
  const xp = VERSUS_DAILY_XP[(status.streakDay - 1) % 7];
  const gold = 1;
  const st = getVersusDailyState();
  st.lastClaim = versusDailyTodayStr();
  st.streak = status.streakDay;
  saveVersusDailyState(st);
  if(typeof addPlayerXP === 'function') addPlayerXP(xp);
  if(typeof grantGold === 'function') grantGold(gold, 'Điểm danh Versus');
  return { xp, gold, day: status.streakDay };
}

function renderVersusDailyPanel(){
  const status = getVersusDailyStatus();
  const list = document.getElementById('versus-daily-list');
  if(list){
    list.innerHTML = '';
    for(let i=1; i<=7; i++){
      const xp = VERSUS_DAILY_XP[i-1];
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
  const btn = document.getElementById('versus-daily-claim-btn');
  if(btn){
    if(status.alreadyClaimedToday){
      btn.textContent = '✅ Đã nhận hôm nay — quay lại vào ngày mai';
      btn.disabled = true;
    } else {
      const xp = VERSUS_DAILY_XP[(status.streakDay-1)%7];
      btn.textContent = '🎁 Nhận quà ngày ' + status.streakDay + ' (+' + xp + ' XP)';
      btn.disabled = false;
    }
  }
}

function updateVersusDailyBadge(){
  const status = getVersusDailyStatus();
  const badge = document.getElementById('versus-menu-daily-badge');
  if(badge) badge.hidden = !status.canClaim;
}
window.updateVersusDailyBadge = updateVersusDailyBadge;

function openVersusDailyPanel(){
  try{ sfxClick(); }catch(e){}
  renderVersusDailyPanel();
  document.getElementById('versus-daily-panel')?.classList.add('show');
}
window.openVersusDailyPanel = openVersusDailyPanel;

function initVersusDailyPanel(){
  const panel = document.getElementById('versus-daily-panel');
  if(!panel) return;
  document.getElementById('versus-daily-close-btn')?.addEventListener('click', ()=> panel.classList.remove('show'));
  panel.addEventListener('click', (e)=>{ if(e.target === panel) panel.classList.remove('show'); });
  document.getElementById('versus-daily-claim-btn')?.addEventListener('click', ()=>{
    const res = claimVersusDailyReward();
    if(res){
      if(typeof showComboFlash === 'function'){
        showComboFlash(0, false, '🎁 +'+res.xp+' XP · 🪙 +'+res.gold+' (ngày '+res.day+'/7)');
      }
      if(typeof sfxUnlock === 'function') sfxUnlock();
      renderVersusDailyPanel();
      updateVersusDailyBadge();
    }
  });
  updateVersusDailyBadge();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initVersusDailyPanel);
} else initVersusDailyPanel();
