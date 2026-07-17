// ═══════════════════════════════════════════════════════════════
// inventory.js — Tim / năng lượng / cưa + kỹ năng theo level & combo
// Nạp SAU save.js + progression.js, TRƯỚC ui.js / engine.js
// ═══════════════════════════════════════════════════════════════

const INV_KEY = 'chromablast_inventory';
const DAILY_HEARTS = 5;

let inv = { hearts: 5, energy: 0, saws: 0, skill10: false, skill20: false, lastHeartDay: '', combo5Seen: false, combo10Seen: false };

(function loadInventory(){
  try{
    const s = JSON.parse(safeGet(INV_KEY) || '{}');
    if(s && typeof s === 'object'){
      inv.hearts = Math.max(0, s.hearts|0);
      inv.energy = Math.max(0, s.energy|0);
      inv.saws = Math.max(0, s.saws|0);
      inv.skill10 = !!s.skill10;
      inv.skill20 = !!s.skill20;
      inv.lastHeartDay = s.lastHeartDay || '';
      inv.combo5Seen = !!s.combo5Seen;
      inv.combo10Seen = !!s.combo10Seen;
    }
  }catch(e){}
  // Đồng bộ skill theo level đã lưu
  if(typeof playerLevel === 'number'){
    if(playerLevel >= 10) inv.skill10 = true;
    if(playerLevel >= 20) inv.skill20 = true;
  }
})();

function saveInventory(){
  try{
    safeSet(INV_KEY, JSON.stringify({
      hearts: inv.hearts|0,
      energy: inv.energy|0,
      saws: inv.saws|0,
      skill10: !!inv.skill10,
      skill20: !!inv.skill20,
      lastHeartDay: inv.lastHeartDay || '',
      combo5Seen: !!inv.combo5Seen,
      combo10Seen: !!inv.combo10Seen
    }));
  }catch(e){}
}

function grantHearts(n, reason){
  if(!(n>0)) return;
  inv.hearts = (inv.hearts|0) + (n|0);
  saveInventory();
  renderInventoryHud();
  try{
    if(reason) showComboFlash(0, false, '❤️ +'+n+(reason?(' · '+reason):''));
  }catch(e){}
}

function grantEnergy(n, reason){
  if(!(n>0)) return;
  inv.energy = (inv.energy|0) + (n|0);
  saveInventory();
  renderInventoryHud();
  try{ if(reason) showComboFlash(0, false, '⚡ +'+n+(reason?(' · '+reason):'')); }catch(e){}
}

function grantSaws(n, reason){
  if(!(n>0)) return;
  inv.saws = (inv.saws|0) + (n|0);
  saveInventory();
  renderInventoryHud();
  try{ if(reason) showComboFlash(0, false, '🪚 +'+n+(reason?(' · '+reason):'')); }catch(e){}
}

function spendHearts(n){
  n = n|0;
  if(n<=0) return true;
  if((inv.hearts|0) < n) return false;
  inv.hearts -= n;
  saveInventory();
  renderInventoryHud();
  return true;
}

function spendEnergy(n){
  n = n|0;
  if((inv.energy|0) < n) return false;
  inv.energy -= n;
  saveInventory();
  renderInventoryHud();
  return true;
}

function spendSaws(n){
  n = n|0;
  if((inv.saws|0) < n) return false;
  inv.saws -= n;
  saveInventory();
  renderInventoryHud();
  return true;
}

/** +5 tim mỗi ngày (1 lần/ngày, tự nhận khi vào game / mở inventory) */
function grantDailyHeartsIfNeeded(){
  const day = (typeof todayStr==='function') ? todayStr() : new Date().toISOString().slice(0,10);
  if(inv.lastHeartDay === day) return false;
  inv.lastHeartDay = day;
  inv.hearts = (inv.hearts|0) + DAILY_HEARTS;
  saveInventory();
  renderInventoryHud();
  return true;
}

function unlockSkillByLevel(lv){
  let unlocked = null;
  if(lv >= 10 && !inv.skill10){
    inv.skill10 = true;
    unlocked = 'lv10';
  }
  if(lv >= 20 && !inv.skill20){
    inv.skill20 = true;
    unlocked = 'lv20';
  }
  if(unlocked){
    saveInventory();
    renderInventoryHud();
    try{
      if(unlocked==='lv10') showComboFlash(0,false,'⚡ Kỹ năng Sét mở khóa (Lv.10)!');
      if(unlocked==='lv20') showComboFlash(0,false,'🪚 Kỹ năng Cưa mở khóa (Lv.20)!');
    }catch(e){}
  }
  return unlocked;
}

/** Thưởng khi đạt combo x5 / x10 trong ván */
function onComboSkillMilestone(streak){
  if(streak === 5){
    grantEnergy(1, 'Combo x5');
    if(!inv.combo5Seen){ inv.combo5Seen = true; saveInventory(); }
  } else if(streak === 10){
    grantHearts(1, 'Combo x10');
    if(!inv.combo10Seen){ inv.combo10Seen = true; saveInventory(); }
  }
}

function renderInventoryHud(){
  const el = document.getElementById('inv-hud');
  if(!el) return;
  el.innerHTML =
    '<span class="inv-chip inv-heart" title="Tim">❤️ '+(inv.hearts|0)+'</span>'+
    '<span class="inv-chip inv-energy" title="Năng lượng">⚡ '+(inv.energy|0)+'</span>'+
    '<span class="inv-chip inv-saw" title="Cưa">🪚 '+(inv.saws|0)+'</span>';
  const sk = document.getElementById('skill-bar');
  if(sk){
    sk.style.display = 'flex';
    const b10 = document.getElementById('skill-btn-10');
    const b20 = document.getElementById('skill-btn-20');
    // KHÔNG dùng disabled — nút disabled nuốt luôn sự kiện click nên bấm vào
    // không có phản hồi gì (người chơi tưởng nút hỏng). Giữ nút bấm được và
    // hiện thông báo lý do trong useSkillLightning/useSkillSaw.
    if(b10){
      b10.disabled = false;
      b10.classList.toggle('locked', !inv.skill10);
      b10.classList.toggle('no-res', inv.skill10 && (inv.energy|0)<1);
      const lab = b10.querySelector('.skill-lab');
      if(lab) lab.textContent = inv.skill10 ? ('Sét ×'+(inv.energy|0)) : 'Sét';
    }
    if(b20){
      b20.disabled = false;
      b20.classList.toggle('locked', !inv.skill20);
      b20.classList.toggle('no-res', inv.skill20 && (inv.saws|0)<1);
      const lab = b20.querySelector('.skill-lab');
      if(lab) lab.textContent = inv.skill20 ? ('Cưa ×'+(inv.saws|0)) : 'Cưa';
    }
  }
}

/** Kỹ năng Lv10: tiêu 1⚡ → +80 điểm */
function useSkillLightning(){
  if(!inv.skill10){ try{ showComboFlash(0,false,'🔒 Cần Lv.10 để mở khóa Sét'); }catch(e){} return; }
  if(!spendEnergy(1)){ try{ showComboFlash(0,false,'Thiếu ⚡ — đạt combo x5 hoặc Vòng quay 🎡'); }catch(e){} return; }
  if(typeof score==='number'){
    score += 80;
    if(score>best) best=score;
    try{ updateScoreUI(); }catch(e){}
  }
  try{ sfxPowerUp(); showComboFlash(0,false,'⚡ Sét! +80 điểm'); }catch(e){}
}

/** Kỹ năng Lv20: tiêu 1🪚 → xóa 1 hàng có nhiều ô nhất trên bàn chính */
function useSkillSaw(){
  if(!inv.skill20){ try{ showComboFlash(0,false,'🔒 Cần Lv.20 để mở khóa Cưa'); }catch(e){} return; }
  if(typeof secretMode!=='undefined' && secretMode){ try{ showComboFlash(0,false,'Chỉ dùng ở map thường'); }catch(e){} return; }
  if(!spendSaws(1)){ try{ showComboFlash(0,false,'Thiếu 🪚 — nhận từ Vòng quay 🎡'); }catch(e){} return; }
  try{
    if(typeof board==='undefined' || !board) return;
    let bestR=0, bestN=-1;
    for(let r=0;r<(typeof ROWS==='number'?ROWS:8);r++){
      let n=0;
      for(let c=0;c<(typeof COLS==='number'?COLS:8);c++) if(board[r][c]!=null) n++;
      if(n>bestN){ bestN=n; bestR=r; }
    }
    if(bestN<=0){ grantSaws(1); showComboFlash(0,false,'Không có hàng để cưa'); return; }
    for(let c=0;c<(typeof COLS==='number'?COLS:8);c++) board[bestR][c]=null;
    if(typeof renderGrid==='function') renderGrid();
    score += bestN;
    if(score>best) best=score;
    if(typeof updateScoreUI==='function') updateScoreUI();
    sfxPowerUp();
    showComboFlash(0,false,'🪚 Cưa hàng! +'+bestN);
  }catch(e){
    grantSaws(1);
  }
}

let _adHeartBusy = false;
let _adHeartFallbackAt = 0;
const AD_HEART_FALLBACK_COOLDOWN = 90 * 1000; // QC lỗi vẫn +1 tim, tối đa ~1 lần/90s

function watchAdForHeart(){
  if(_adHeartBusy) return; // chặn bấm liên tục khi QC đang mở
  const btn = document.getElementById('inv-ad-heart-btn');
  const setBusy = (b)=>{
    _adHeartBusy = b;
    if(btn) btn.classList.toggle('no-res', b);
  };
  const done = ()=>{ setBusy(false); grantHearts(1, 'Xem quảng cáo'); };
  const fail = ()=>{
    setBusy(false);
    // QC chưa cấu hình xong / không có fill: vẫn tặng tim nhưng giới hạn
    // tần suất để nút không bị lạm dụng vô hạn.
    const now = Date.now();
    if(now - _adHeartFallbackAt >= AD_HEART_FALLBACK_COOLDOWN){
      _adHeartFallbackAt = now;
      grantHearts(1, 'Tặng thêm');
    } else {
      try{ showComboFlash(0,false,'Quảng cáo chưa sẵn sàng — thử lại sau nhé'); }catch(e){}
    }
  };
  setBusy(true);
  if(typeof showRewardedAd==='function'){
    showRewardedAd(done, fail);
  } else {
    // Web/không có AdMob: giả lập xem QC thành công
    setTimeout(done, 600);
  }
}

function initInventoryUI(){
  grantDailyHeartsIfNeeded();
  if(typeof playerLevel==='number') unlockSkillByLevel(playerLevel);
  renderInventoryHud();
  document.getElementById('skill-btn-10')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} useSkillLightning(); });
  document.getElementById('skill-btn-20')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} useSkillSaw(); });
  document.getElementById('inv-ad-heart-btn')?.addEventListener('click', ()=>{ try{sfxClick();}catch(e){} watchAdForHeart(); });
}

/** API cho lucky-spin.js và script khác */
window.Inventory = {
  get hearts(){ return inv.hearts|0; },
  get energy(){ return inv.energy|0; },
  get saws(){ return inv.saws|0; },
  addHearts: function(n, reason){ grantHearts(n, reason||''); },
  addEnergy: function(n, reason){ grantEnergy(n, reason||''); },
  addSaws: function(n, reason){ grantSaws(n, reason||''); },
  grantDailyHeartsIfNeeded: grantDailyHeartsIfNeeded,
  unlockSkillByLevel: unlockSkillByLevel,
  onComboSkillMilestone: onComboSkillMilestone,
  render: renderInventoryHud
};
