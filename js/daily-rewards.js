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

// Mốc thưởng THÊM theo chuỗi điểm danh DÀI (không lặp lại mỗi 7 ngày như
// DAILY_REWARD_XP ở trên) — 7 ngày/2 tuần/3 tuần/1 tháng, lặp lại theo chu kỳ
// 30 ngày. Đứt chuỗi (bỏ lỡ 1 ngày) thì mốc dài này cũng reset về 0 giống
// streak thường. Chỉ dùng vàng/kim cương (grantGold/grantDiamonds — đã dùng
// sẵn ngay trong file này cho quà điểm danh thường) + rương VẬT PHẨM qua
// grantItemCrate() (js/loot-crates.js) — cố tình KHÔNG dùng rương tiền tệ
// (Gỗ/Bạc/Vàng/Kim cương) ở đây vì 4 rương đó bắt buộc phải mở qua Cloud
// Function openCurrencyCrate (chống lỗ hổng cộng cục bộ), không có đường "cấp
// thẳng miễn phí" an toàn nào cho chúng ngoài luồng mua ở Shop/Rương bảo vật.
const DAILY_MILESTONE_CRATES = {
  7:  { gold: 150, crateId: 'brick' },
  14: { gold: 300, crateId: 'map' },
  21: { diamonds: 10, crateId: 'bubble' },
  30: { diamonds: 25, crateId: 'platinum' },
};

function _dailyMilestoneRewardFor(milestoneDay){
  const day30 = ((milestoneDay - 1) % 30) + 1; // lặp lại theo chu kỳ 30 ngày
  return DAILY_MILESTONE_CRATES[day30] || null;
}

function claimDailyReward(){
  const status = getDailyStatus();
  if(!status.canClaim) return null;
  const xp = DAILY_REWARD_XP[(status.streakDay - 1) % 7];
  const gold = 1; // nhiệm vụ ngày: đăng nhập +1 vàng
  const heartWant = 1; // +1 tim / điểm danh (tổng nhiệm vụ ngày ≤ 5 tim)
  const st = getDailyState();
  let continued = false;
  if(st.lastClaim){
    const last = new Date(st.lastClaim + 'T00:00:00');
    const now  = new Date(todayStr() + 'T00:00:00');
    continued = Math.round((now - last) / 86400000) === 1;
  }
  const milestoneDay = continued ? (st.milestoneStreak || 0) + 1 : 1;
  st.lastClaim = todayStr();
  st.streak = status.streakDay;
  st.milestoneStreak = milestoneDay;
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
  // Mốc dài 7/14/21/30 ngày liên tục — chỉ trúng ĐÚNG ngày chạm mốc.
  let milestone = null;
  const mr = _dailyMilestoneRewardFor(milestoneDay);
  if(mr){
    const reasonText = (typeof t==='function'?t('dailyGold'):'Điểm danh') + ' ' + milestoneDay;
    if(mr.gold && typeof grantGold === 'function') grantGold(mr.gold, reasonText);
    if(mr.diamonds && typeof grantDiamonds === 'function') grantDiamonds(mr.diamonds, reasonText);
    let crateReward = null;
    if(mr.crateId && typeof grantItemCrate === 'function'){
      const res = grantItemCrate(mr.crateId, reasonText);
      if(res && res.ok) crateReward = res.reward;
    }
    milestone = { day: milestoneDay, gold: mr.gold||0, diamonds: mr.diamonds||0, crate: crateReward };
  }
  try{ if(typeof noteCupLoginClaim==='function') noteCupLoginClaim(); }catch(e){}
  try{ if(typeof noteQuestEvent==='function') noteQuestEvent('checkin', 1); }catch(e){}
  try{ if(typeof logGameEvent==='function') logGameEvent('daily_reward_claim', { streak_day: status.streakDay, milestone_day: milestoneDay, xp, gold }); }catch(e){}
  return { day: status.streakDay, xp, gold, hearts, milestone };
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
      div.innerHTML = '<div class="daily-day-num">'+(typeof t==='function'?t('dailyDay', i):('Ngày '+i))+'</div><div class="daily-day-xp">+'+xp+' XP</div>';
      list.appendChild(div);
    }
  }
  const btn = document.getElementById('daily-claim-btn');
  if(btn){
    if(status.alreadyClaimedToday){
      btn.textContent = typeof t==='function' ? t('dailyClaimed') : '✅ Đã nhận hôm nay — quay lại vào ngày mai';
      btn.disabled = true;
    } else {
      const xp = DAILY_REWARD_XP[(status.streakDay-1)%7];
      btn.textContent = typeof t==='function' ? t('dailyClaim', status.streakDay, xp) : ('🎁 Nhận quà ngày ' + status.streakDay + ' (+' + xp + ' XP)');
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
      if(typeof showComboFlash === 'function'){
        const h = res.hearts|0;
        let msg = typeof t==='function'
          ? t('dailyFlash', res.xp, res.day, h)
          : ('🎁 +'+res.xp+' XP · 🪙 +'+(res.gold||1)+(h?(' · ❤️ +'+h):'')+' (ngày '+res.day+'/7)');
        if(res.milestone){
          msg += ' · ' + (typeof t==='function'?t('dailyMilestoneFlash', res.milestone.day):('Mốc '+res.milestone.day+' ngày!'));
          if(res.milestone.gold) msg += ' 🪙+'+res.milestone.gold;
          if(res.milestone.diamonds) msg += ' 💎+'+res.milestone.diamonds;
          if(res.milestone.crate) msg += ' '+res.milestone.crate.label;
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
