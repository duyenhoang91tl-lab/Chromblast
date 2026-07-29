// ═══════════════════════════════════════════════════════════════
// js/engine-powers.js — Hệ thống skill/logo đặc biệt (fire/bubble/wind),
// tách từ engine.js. Dùng chung global scope với engine.js (nạp NGAY SAU).
// ═══════════════════════════════════════════════════════════════

const POWER_SPAWN_EVERY = 15;      // số lần phá để tự sinh 1 logo

const POWER_KINDS = ['fire','bubble','wind'];

const powerCells = new Map();      // 'r,c' → 'fire' | 'bubble' | 'wind'

let powerClearWaves = 0;           // đếm số lần phá (chỉ map thường)
var pendingSkill = null;           // 'fire'|'bubble'|'wind' | null — skill đang nhắm

let powerBusy = false;             // đang chạy hàng đợi skill / logo

/** Bắt đầu nhắm skill: chạm ô trên bàn để kích hoạt ngay */

function beginSkillAim(type){
  if(secretMode || powerBusy) return;
  if(!POWER_KINDS.includes(type)) return;
  pendingSkill = type;
  if(selected!==null) endDrag();
  const wrap=document.getElementById('grid-wrap');
  if(wrap){
    wrap.classList.add('skill-aiming');
    wrap.dataset.skillAim=type;
  }
  if(typeof renderInventoryHud==='function') renderInventoryHud();
  const msg = type==='fire' ? '🔥 Chạm 1 ô để đốt 3×3'
            : type==='bubble' ? '🫧 Chạm ô màu để nổ cùng màu'
            : '💨 Chạm 1 ô để thổi hàng/cột';
  try{ showHint(msg, { sticky:true, aim:true }); }catch(e){}
}

function cancelSkillAim(){
  if(!pendingSkill) return;
  pendingSkill = null;
  const wrap=document.getElementById('grid-wrap');
  if(wrap){
    wrap.classList.remove('skill-aiming');
    delete wrap.dataset.skillAim;
  }
  if(typeof renderInventoryHud==='function') renderInventoryHud();
  try{ if(typeof clearHintFlash==='function') clearHintFlash(); }catch(e){}
}

/** Skill người chơi: tiêu 1 vật phẩm và kích hoạt ngay tại ô (r,c) */

function castPlayerSkill(r, c){
  if(!pendingSkill || secretMode || powerBusy) return;
  const type = pendingSkill;
  if(r<0||r>=ROWS||c<0||c>=COLS) return;
  if(type==='bubble'){
    if(board[r][c]==null){
      try{ showHint('🫧 Chạm ô có màu'); }catch(e){}
      return;
    }
  }
  if(typeof spendPower!=='function' || !spendPower(type, 1)){
    cancelSkillAim();
    return;
  }
  cancelSkillAim();
  powerBusy = true;
  const queue = [{ type, r, c, color: board[r][c] }];
  try{ sfxPowerUp(); }catch(e){}
  runPowerQueue(queue);
}

function powerEligibleKeys(){
  const out=[];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const k=`${r},${c}`;
    if(board[r][c]==null) continue;
    if(powerCells.has(k) || pendingClearKeys.has(k)) continue;
    // tránh đè logo lên ô đặc biệt đang có hiệu ứng riêng
    if(thornCells.has(k) || iceCells.has(k) || slimeCells.has(k) || bittenCells.has(k)) continue;
    out.push(k);
  }
  return out;
}

/** Sinh logo `type` (không truyền → random) lên 1 ô gạch ngẫu nhiên. Trả key hoặc null. */

function spawnPowerCell(type){
  const keys=powerEligibleKeys();
  if(!keys.length) return null;
  const k=keys[rnd(keys.length)];
  powerCells.set(k, POWER_KINDS.includes(type) ? type : POWER_KINDS[rnd(POWER_KINDS.length)]);
  renderGrid();
  return k;
}

/** Danh sách ô bị hiệu ứng quét trúng */

function powerTargets(p){
  const keys=new Set();
  if(p.type==='fire'){
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      const r=p.r+dr, c=p.c+dc;
      if(r>=0&&r<ROWS&&c>=0&&c<COLS) keys.add(`${r},${c}`);
    }
  } else if(p.type==='bubble'){
    if(p.color) for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
      if(board[r][c]===p.color) keys.add(`${r},${c}`);
  } else { // wind — hàng ngang vs cột dọc: chọn bên nhiều ô hơn
    let rowN=0, colN=0;
    for(let c=0;c<COLS;c++) if(board[p.r][c]!=null) rowN++;
    for(let r=0;r<ROWS;r++) if(board[r][p.c]!=null) colN++;
    if(rowN>=colN){ for(let c=0;c<COLS;c++) keys.add(`${p.r},${c}`); }
    else { for(let r=0;r<ROWS;r++) keys.add(`${r},${p.c}`); }
  }
  return keys;
}

/** Kích hoạt 1 vật phẩm — tính như 1 lần phá (1 combo).
 *  Chướng ngại bảo vệ ô màu giống nổ thường:
 *  🌿 dây leo/gai → chỉ gỡ gai, giữ gạch
 *  🧊 băng → lần 1 nứt, lần 2 mới vỡ kèm gạch
 *  🔥 lửa vẫn đốt núi/tường (chướng ngại nặng không phải lớp giáp trên gạch)
 */

function activatePower(p, queue){
  const keys=powerTargets(p);
  let cleared=0;
  const clearedCells=[];
  keys.forEach(k=>{
    const [r,c]=k.split(',').map(Number);
    // dây chuyền: quét trúng logo khác → kích hoạt tiếp sau
    if(powerCells.has(k) && !(r===p.r && c===p.c)){
      queue.push({ type:powerCells.get(k), r, c, color:board[r][c] });
    }
    powerCells.delete(k);

    // 🌿 dây leo: 1 lần phá chỉ gỡ gai — chưa đụng gạch bên dưới
    if(thornCells.has(k)){
      thornCells.delete(k);
      cleared++; clearedCells.push([r,c]);
      return;
    }
    // 🧊 băng: lần đầu chỉ nứt; lần sau mới vỡ và xóa ô màu
    if(iceCells.has(k)){
      const stage=iceCells.get(k);
      if(stage>=2){
        iceCells.set(k,1);
        cleared++; clearedCells.push([r,c]);
        try{ sfxClick(); }catch(e){}
        return;
      }
      iceCells.delete(k);
      // stage 1 → rơi xuống xóa gạch bên dưới
    }

    let obstacleRemoved=false;
    if(p.type==='fire'){ // lửa đốt chướng ngại nặng (núi / tường) trong vùng 3×3
      if(mountainCells.has(k)){ mountainCells.delete(k); obstacleRemoved=true; }
      if(wallCells.has(k)){ wallCells.delete(k); obstacleRemoved=true; }
    }
    if(slimeCells.has(k)){ slimeCells.delete(k); obstacleRemoved=true; }
    if(bittenCells.has(k)){ bittenCells.delete(k); }
    mirrorCells.delete(k);
    if(board[r][c]!=null){
      board[r][c]=null;
      delete cellPlacedAt[k];
      pendingClearKeys.delete(k);
      cleared++; clearedCells.push([r,c]);
      const cell=getCell(r,c);
      if(cell){ cell.classList.remove('filled'); cell.classList.add('pop-color'); }
    } else if(obstacleRemoved){
      cleared++; clearedCells.push([r,c]);
    }
  });
  if(cleared<=0) return false;

  // "tính như 1 lần phá": nối chuỗi combo + điểm theo hệ số hiện hành
  consecutiveBursts++; combo++;
  updateBurstCount();
  if(combo>=5) unlockAchievement('combo5');
  try{ if(typeof onComboSkillMilestone==='function') onComboSkillMilestone(combo); }catch(e){}
  const pts=cleared*comboScoreMultiplier(combo);
  score+=pts; if(score>best) best=score;
  updateScoreUI(); updateComboUI();
  try{ sfxMatch(cleared); if(combo>1) sfxComboUp(combo, pIdx(consecutiveBursts)); }catch(e){}
  const ctr=clearCentroid(clearedCells, getCell);
  showScorePop(cleared, pts, ctr.x, ctr.y, consecutiveBursts);
  showShockwave(ctr.x, ctr.y, consecutiveBursts);
  showComboCountFlash(combo);
  updateComboBorderGlow(consecutiveBursts);
  try{ mainBurstFX(clearedCells, consecutiveBursts); }catch(e){}
  const label = p.type==='fire' ? '🔥 Lửa cháy 3×3!'
              : p.type==='bubble' ? '🫧 Nổ sạch một màu!'
              : '💨 Gió thổi bay cả hàng!';
  try{ showComboFlash(0,false,label+' +'+pts); }catch(e){}
  return true;
}

/** Chạy lần lượt các vật phẩm vừa bị phá trúng, xong quay lại chuỗi nổ thường */

function runPowerQueue(queue){
  if(!queue.length){
    powerBusy = false;
    setTimeout(()=>{
      renderGrid();
      // Mở map ẩn theo cổng ★★★ (2 map thường), không còn combo×3
      processClears({ chain: true });
    }, 120);
    return;
  }
  powerBusy = true;
  const p=queue.shift();
  activatePower(p, queue);
  setTimeout(()=>{ renderGrid(); setTimeout(()=>runPowerQueue(queue), 200); }, 320);
}
/** Kiểm tra nổ hàng/cột/cụm màu.
 *  opts.chain = true: tiếp nối sau một đợt nổ thành công — nếu hết chuỗi thì
 *  GIỮ combo (không đứt). Chỉ đặt khối mà không nổ mới reset combo. */
