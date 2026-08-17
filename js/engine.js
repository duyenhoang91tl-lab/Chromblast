// ═══════════════════════════════════════════════════════════════
// js/engine.js — ENGINE BÀN CỜ MAP THƯỜNG (MODE A)
// Board/piece/kéo-thả-ghost/đặt khối/nổ hàng-cột-cụm/game-over/render.
// Tách verbatim khỏi main.js. Nạp TRƯỚC main.js (chia sẻ global scope; tham chiếu
// state board/pieces/score & hàm tiến trình/cơ chế của main.js + js/round-mechanics.js
// lúc CHẠY).
// ═══════════════════════════════════════════════════════════════

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */

function rnd(n){ return Math.floor(Math.random()*n); }

function rndColor(){ return COLORS[rnd(COLORS.length)]; }

function rndCI(){ return rnd(COLORS.length); }
// Cache trực tiếp tham chiếu DOM theo [r][c] thay vì querySelector mỗi lần gọi
// (querySelector(`[data-r][data-c]`) phải quét lại toàn bộ DOM — rất tốn khi gọi liên tục lúc kéo-thả)

function getCell(r,c){ return gridCells && gridCells[r] ? gridCells[r][c] : null; }

function getSC(r,c){ return secretCells && secretCells[r] ? secretCells[r][c] : null; }

/* ══════════════════════════════════════════
   MODE A — MAIN GAME
══════════════════════════════════════════ */

function initBoard(){
  board=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  placeCounter=0; cellPlacedAt={}; pendingClearKeys.clear();
  powerCells.clear(); powerClearWaves=0; // 🔥🫧💨 ván mới — logo cũ không mang theo
  powerBusy=false;
  if(typeof cancelSkillAim==='function') cancelSkillAim();
  resetMechanicState();
  // ván mới vẫn giữ tier đã đạt — kích hoạt lại ĐÚNG 1 cơ chế của vòng đó
  if(typeof mainHardTier!=='undefined' && mainHardTier>0) setTimeout(()=>applyRoundMechanics(), 50);
}
// Nguồn ngẫu nhiên cho SINH KHỐI — chế độ Đấu 1-1 (versus.js) cắm PRNG có hạt giống
// vào đây để 2 người chơi nhận CÙNG một chuỗi khối (công bằng tuyệt đối).

let _pieceRand = null; // null = Math.random như bình thường

function setPieceRand(f){ _pieceRand = f || null; }

function makePiece(){
  const R = _pieceRand || Math.random;
  // Map thường càng cao (mainHardTier = Map N - 1), khối càng thiên về hình to/khó xếp
  // (mặc định ~55% khối lớn giống tỉ lệ cũ, mỗi bậc +3%, tối đa 90%)
  const hardP=Math.min(0.9, 0.55+mainHardTier*0.03);
  const wantHard=R()<hardP;
  const pool=SHAPES.filter(s=> wantHard ? s.length>=4 : s.length<=3);
  const shape=pool.length?pool[Math.floor(R()*pool.length)]:SHAPES[Math.floor(R()*SHAPES.length)];
  return {shape, color:COLORS[Math.floor(R()*COLORS.length)], used:false};
}

function refillPieces(){ pieces=[makePiece(),makePiece(),makePiece()]; selected=null; spiderWebbedIdx=-1; spiderWebbedLeft=0; }

// Xoay shape 90° theo chiều kim đồng hồ: (r,c) → (c, maxR-r)

function rotatePiece(idx){
  if(idx===null||idx===undefined) return;
  const piece=pieces[idx];
  if(!piece||piece.used) return;
  sfxRotate();
  const maxR=Math.max(...piece.shape.map(([r])=>r));
  piece.shape=piece.shape.map(([r,c])=>[c, maxR-r]);
  // normalise: shift so min row/col = 0
  const minR=Math.min(...piece.shape.map(([r])=>r));
  const minC=Math.min(...piece.shape.map(([,c])=>c));
  piece.shape=piece.shape.map(([r,c])=>[r-minR, c-minC]);
  invalidateDragBox();
  renderPieces();
  if(selected===idx){ showGhost(piece); moveGhost(lastMouseX||0, lastMouseY||0); updatePreview(lastMouseX||0, lastMouseY||0); }
}

// Ô bị chặn không đặt khối lên được (do các cơ chế độ khó chiếm giữ)

function cellBlockedForPlacement(r,c){
  const k=r+','+c;
  if(mountainCells.has(k)||wallCells.has(k)) return true;
  if(slimeCells.has(k)) return true;
  if(bittenCells.has(k)) return true; // ô đã bị sóc gặm — hỏng, không đặt được
  if(bombCell&&bombCell.r===r&&bombCell.c===c) return true;
  if(dragonEgg&&dragonEgg.r===r&&dragonEgg.c===c) return true;
  if(blackHole&&blackHole.r===r&&blackHole.c===c) return true;
  if(portalA&&portalA.r===r&&portalA.c===c) return true;
  if(portalB&&portalB.r===r&&portalB.c===c) return true;
  if(snakeSpirit&&snakeSpirit.cells.some(([sr,sc])=>sr===r&&sc===c)) return true;
  if(dragonKing&&dragonKing.r===r&&dragonKing.c===c) return true;
  return false;
}

function canPlace(piece,r,c){
  return piece.shape.every(([dr,dc])=>{
    const nr=r+dr,nc=c+dc;
    return nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!board[nr][nc]&&!cellBlockedForPlacement(nr,nc);
  });
}

let gridCells = null; // ROWS x COLS cache — dựng 1 lần, tái sử dụng ở mọi lần render

function renderGrid(){
  const grid=document.getElementById('grid');
  if(!gridCells){
    // Dựng DOM 1 lần duy nhất. Dùng event delegation (1 listener trên #grid)
    // thay vì gắn listener riêng cho từng ô mỗi lần render → tránh rò rỉ listener + giảm việc tạo node.
    grid.style.gridTemplateColumns=`repeat(${COLS},minmax(0,1fr))`;
    grid.innerHTML='';
    gridCells=Array.from({length:ROWS},()=>Array(COLS).fill(null));
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const cell=document.createElement('div');
      cell.dataset.r=r; cell.dataset.c=c;
      grid.appendChild(cell);
      gridCells[r][c]=cell;
    }
    grid.addEventListener('click', e=>{
      const cell=e.target.closest('.cell');
      if(cell) onCellClick({clientX:e.clientX, clientY:e.clientY, currentTarget:cell});
    });
  }
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const cell=gridCells[r][c];
    const thornKey=`${r},${c}`;
    const inFog=fogCenter && Math.abs(fogCenter.r-r)<=1 && Math.abs(fogCenter.c-c)<=1;
    const inLightning=lightning && r>=lightning.r && r<=lightning.r+1 && c>=lightning.c && c<=lightning.c+1;
    const snakeIdx=snakeSpirit? snakeSpirit.cells.findIndex(([sr,sc])=>sr===r&&sc===c) : -1;
    const cls='cell'+(board[r][c]?' filled':'')+(thornCells.has(thornKey)?' thorn-cell':'')
      +(mountainCells.has(thornKey)?' mountain-cell':'')
      +(wallCells.has(thornKey)?' wall-cell':'')
      +(squirrel&&squirrel.r===r&&squirrel.c===c?' squirrel-cell':'')
      +(bittenCells.has(thornKey)?' bitten-cell':'')
      +(iceCells.has(thornKey)?(iceCells.get(thornKey)>=2?' ice-cell':' ice-cell ice-cracked'):'')
      +(inFog?' fog-cell':'')
      +(bombCell&&bombCell.r===r&&bombCell.c===c?' bomb-cell':'')
      +(dragonEgg&&dragonEgg.r===r&&dragonEgg.c===c?(dragonEgg.shell<EGG_SHELL?' egg-cell egg-cracked':' egg-cell'):'')
      +(spider&&spider.r===r&&spider.c===c?' spider-cell':'')
      +(tierActive(10)&&c===cloudCol&&r===0?' cloud-cell':'')
      +(blackHole&&blackHole.r===r&&blackHole.c===c?' blackhole-cell':'')
      +(ghostCell&&ghostCell.r===r&&ghostCell.c===c?' ghost-cell':'')
      +(snail&&snail.r===r&&snail.c===c?' snail-cell':'')
      +(slimeCells.has(thornKey)?' slime-cell':'')
      +(inLightning?' lightning-warn':'')
      +(snakeIdx===0?' snakehead-cell':snakeIdx>0?' snakebody-cell':'')
      +((portalA&&portalA.r===r&&portalA.c===c)||(portalB&&portalB.r===r&&portalB.c===c)?' portal-cell':'')
      +(dragonKing&&dragonKing.r===r&&dragonKing.c===c?' dragonking-cell':'')
      +(mirrorCells.has(thornKey)?' mirror-cell':'');
    if(cell.className!==cls) cell.className=cls;
    if(bombCell&&bombCell.r===r&&bombCell.c===c){
      if(cell.dataset.bomb!==String(bombTimer)) cell.dataset.bomb=bombTimer;
    } else if(cell.dataset.bomb) delete cell.dataset.bomb;
    // thanh HP của sóc ngay trên ô nó đứng
    if(squirrel&&squirrel.r===r&&squirrel.c===c){
      cell.style.setProperty('--sqhp', Math.round(squirrel.hp/MCFG('squirrel','hp')*100)+'%');
    }
    // 👻 ô bị ma nhập hiển thị MÀU GIẢ — logic game vẫn dùng màu thật trong board
    let bg=board[r][c]||'';
    if(ghostCell&&ghostCell.r===r&&ghostCell.c===c&&bg) bg=ghostCell.disguise;
    // Màu qua --cc để CSS vẽ kiểu kẹo bông (không ghi đè background shorthand)
    const prev=cell.style.getPropertyValue('--cc');
    if(bg){
      if(prev!==bg){ cell.style.setProperty('--cc',bg); cell.style.background=''; }
      const ci=COLORS.indexOf(bg);
      if(ci>=0) cell.dataset.ci=String(ci);
      else delete cell.dataset.ci;
    } else if(prev || cell.style.background || cell.dataset.ci){
      cell.style.removeProperty('--cc');
      cell.style.background='';
      delete cell.dataset.ci;
    }
    // 🔥🫧💨 logo vật phẩm trên ô gạch
    if(board[r][c] && powerCells.has(thornKey)){
      const pw=powerCells.get(thornKey);
      if(cell.dataset.power!==pw) cell.dataset.power=pw;
    } else {
      if(cell.dataset.power) delete cell.dataset.power;
      if(!board[r][c]) powerCells.delete(thornKey); // dọn logo mồ côi (ô bị sóc ăn, lốc cuốn...)
    }
  }
}

/* ──────────────────────────────────────────
   KÉO–THẢ  (ghost bám theo con trỏ/ngón tay + preview mờ)
────────────────────────────────────────── */

const pendingClearKeys=new Set();

/* ══════════════════════════════════════════
   🔥🫧💨 Ô VẬT PHẨM (power cells) — map thường
   - Mỗi 15 lần phá tự sinh 1 logo lên ô gạch ngẫu nhiên (tối đa 1 logo/ô)
   - Phá ô chứa logo → kích hoạt:
     🔥 lửa: cháy 3×3 quanh ô (gồm cả chướng ngại) — tính như 1 lần phá
     🫧 bong bóng: nổ toàn bộ ô cùng màu
     💨 gió: thổi bay hàng ngang/dọc chứa ô (ưu tiên hàng nhiều ô hơn)
   - Nút 🔥/🫧/💨 dưới khay (skill người chơi): bấm → chạm ô → kích hoạt NGAY
══════════════════════════════════════════ */

function processClears(opts){
  opts = opts || {};
  const cellAlive=(r,c)=> board[r][c]!==null && !pendingClearKeys.has(`${r},${c}`);
  let lineKeys=new Set();
  for(let r=0;r<ROWS;r++)
    if(board[r].every((v,c)=>cellAlive(r,c)))
      for(let c=0;c<COLS;c++) lineKeys.add(`${r},${c}`);
  for(let c=0;c<COLS;c++)
    if(Array.from({length:ROWS},(_,r)=>r).every(r=>cellAlive(r,c)))
      for(let r=0;r<ROWS;r++) lineKeys.add(`${r},${c}`);

  // Nổ màu: một CỤM cùng màu NỐI LIỀN nhau (4 hướng), tối thiểu COLOR_BURST_MIN ô.
  let colorKeys=new Set();
  const seen=new Set();
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const color=board[r][c];
    const key=`${r},${c}`;
    if(!color || seen.has(key) || pendingClearKeys.has(key)) continue;
    if(thornCells.has(key)){ seen.add(key); continue; } // thorn cell cannot start or join a burst
    const comp=[[r,c]]; const q=[[r,c]]; seen.add(key);   // BFS cụm cùng màu liền kề
    while(q.length){
      const [cr,cc]=q.shift();
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const nr=cr+dr, nc=cc+dc, nk=`${nr},${nc}`;
        if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!seen.has(nk)&&board[nr][nc]===color
           &&!thornCells.has(nk)&&!pendingClearKeys.has(nk)){
          seen.add(nk); q.push([nr,nc]); comp.push([nr,nc]);
        }
      }
    }
    if(comp.length>=getMinBurst()) comp.forEach(([gr,gc])=>colorKeys.add(`${gr},${gc}`));
  }

  const totalKeys=new Set([...lineKeys,...colorKeys]);
  totalKeys.forEach(k=>pendingClearKeys.add(k)); // đánh dấu ngay — đợt tính sau coi như trống

  if(totalKeys.size===0){
    // Kết thúc cascade sau đợt nổ thành công → giữ combo.
    // Chỉ đứt combo khi vừa đặt khối mà không có gì nổ.
    if(!opts.chain){
      combo=0; consecutiveBursts=0; updateComboUI(); updateBurstCount();
      const wrap=document.getElementById('grid-wrap');
      wrap.classList.remove('combo-glow-1','combo-glow-2','combo-glow-3','combo-glow-4','combo-glow-5');
    }
    afterPlace();
    return;
  }

  // Track consecutive bursts for unlock
  consecutiveBursts++;
  updateBurstCount();
  combo++;
  if(combo>=5) unlockAchievement('combo5');
  try{ if(typeof onComboSkillMilestone==='function') onComboSkillMilestone(combo); }catch(e){}

  // 🔥🫧💨 vật phẩm bị phá trúng trong đợt này → kích hoạt sau khi đợt nổ xong
  const triggeredPowers=[];
  totalKeys.forEach(k=>{
    if(powerCells.has(k)){
      const [pr,pc]=k.split(',').map(Number);
      triggeredPowers.push({ type:powerCells.get(k), r:pr, c:pc, color:board[pr][pc] });
      powerCells.delete(k);
    }
  });
  // Mỗi 15 lần phá ở map thường → tự sinh 1 logo ngẫu nhiên lên bàn
  if(!secretMode){
    powerClearWaves++;
    if(powerClearWaves>=POWER_SPAWN_EVERY){
      powerClearWaves=0;
      setTimeout(()=>{
        const k=spawnPowerCell();
        if(k){ try{ sfxPowerUp(); showComboFlash(0,false,'✨ Ô vật phẩm xuất hiện trên bàn!'); }catch(e){} }
      }, 650);
    }
  }
  // Quy tắc: phá 1 ô = 1 điểm. Phá liên tiếp (combo) từ lần thứ 3 → x2 điểm, từ lần thứ 6 → x3 điểm.
  const scoreMult=comboScoreMultiplier(combo);
  let pts=totalKeys.size*scoreMult;
  if(typeof pendingScoreMultiplier!=='undefined' && pendingScoreMultiplier>1){
    pts*=pendingScoreMultiplier;
    pendingScoreMultiplier=1;
    try{ showComboFlash(0,false,'🎯 x2!'); }catch(e){}
  }
  sfxMatch(colorKeys.size); if(combo>1) sfxComboUp(combo, pIdx(consecutiveBursts));
  score+=pts; if(score>best) best=score;
  try{ if(typeof checkRunCups==='function') checkRunCups(); }catch(e){}
  try{ if(typeof checkPersistentCups==='function') checkPersistentCups(); }catch(e){}
  const clearedRows=new Set([...lineKeys].map(k=>k.split(',')[0]));
  linesCleared+=clearedRows.size;
  try{ if(typeof noteQuestEvent==='function'){
    noteQuestEvent('clear', clearedRows.size||1);
    noteQuestEvent('score', score);
    noteQuestEvent('combo', consecutiveBursts|0);
  }}catch(e){}
  const prevLevel=level; level=Math.floor(linesCleared/5)+1;
  if(level>prevLevel) setTimeout(()=>applyLevelDifficulty(), 600);
  try{ if(typeof checkRunCups==='function') checkRunCups(); }catch(e){}
  updateScoreUI(); updateComboUI();
  const _ctr=clearCentroid([...totalKeys].map(k=>k.split(',').map(Number)), getCell);
  showScorePop(totalKeys.size, pts, _ctr.x, _ctr.y, consecutiveBursts);
  showShockwave(_ctr.x, _ctr.y, consecutiveBursts);
  // Chỉ hiện câu khen (COOL/GOOD/...) khi đạt MỐC 5 lần nổ liên tiếp — không phải cứ nổ
  // là khen ngay, phải thật sự khó (combo dài) mới được khen.
  if(shouldPraise(consecutiveBursts)) showPraise(praiseLevelForStreak(consecutiveBursts));
  showComboCountFlash(combo);
  updateComboBorderGlow(consecutiveBursts); // viền sáng theo combo map thường
  // 🎆 Pháo hoa viền + tia lấp lánh cho map thường
  mainBurstFX([...totalKeys].map(k=>k.split(',').map(Number)), consecutiveBursts);

  lineKeys.forEach(key=>{
    const [r,c]=key.split(',').map(Number);
    const cell=getCell(r,c);
    if(cell){ cell.classList.remove('filled'); cell.classList.add('pop-line'); }
  });
  setTimeout(()=>{
    colorKeys.forEach(key=>{
      const [r,c]=key.split(',').map(Number);
      const cell=getCell(r,c);
      if(cell){ cell.classList.remove('filled'); cell.classList.add('pop-color'); }
    });
  }, colorKeys.size>0?80:0);

  const waitTime=colorKeys.size>0?500:360;
  setTimeout(()=>{
    // đợt nổ hoàn tất — gỡ dấu "đang chờ nổ" (kể cả ô sống sót nhờ gai/băng)
    totalKeys.forEach(k=>pendingClearKeys.delete(k));
    let eggHitThisWave=false; // mỗi ĐỢT nổ chỉ làm nứt vỏ trứng 1 lớp, dù nhiều ô cùng kề trứng
    let spiderHitWave=false, bhHitWave=false, snailHitWave=false, snakeHitWave=false, portalHitWave=false, dkHitWave=false, squirrelHitWave=false;
    // 🌿 chụp trước các ô đang có dây gai TẠI THỜI ĐIỂM đợt nổ bắt đầu — các ô này được gai
    // bảo vệ suốt đợt (kể cả khi ô kề bên nổ trong cùng đợt vừa gỡ gai xong): ô màu KHÔNG mất,
    // chỉ mất dây gai nhờ ô kề bên nổ; đợt nổ sau ô mới vỡ như bình thường
    const vineProtected=new Set([...totalKeys].filter(k=>thornCells.has(k)));
    totalKeys.forEach(key=>{
      const [r,c]=key.split(',').map(Number);
      if(vineProtected.has(key)) return; // gai đỡ đòn cho ô màu bên dưới
      // 🧊 ô đóng băng: lần nổ đầu chỉ làm NỨT băng (ô sống sót), lần 2 mới vỡ và xóa
      if(iceCells.has(key)){
        const stage=iceCells.get(key);
        if(stage>=2){ iceCells.set(key,1); try{ sfxClick(); }catch(e){} return; }
        iceCells.delete(key);
      }
      board[r][c]=null;
      delete cellPlacedAt[key];
      mirrorCells.delete(key);
      // 💣 nổ ô kề bom → gỡ bom thành công, thưởng điểm
      if(bombCell && Math.abs(bombCell.r-r)<=1 && Math.abs(bombCell.c-c)<=1 && !(bombCell.r===r&&bombCell.c===c)){
        bombCell=null; bombRespawn=10;
        const bTh=MCFG('bomb','thuong');
        score+=bTh; if(score>best) best=score; updateScoreUI();
        showComboFlash(0,false,t('fxDefuse', bTh));
      }
      // 🥚 nổ ô kề trứng rồng → nứt vỏ; vỡ hẳn thì thưởng điểm
      if(dragonEgg && !eggHitThisWave && Math.abs(dragonEgg.r-r)<=1 && Math.abs(dragonEgg.c-c)<=1 && !(dragonEgg.r===r&&dragonEgg.c===c)){
        eggHitThisWave=true;
        dragonEgg.shell--;
        if(dragonEgg.shell<=0){
          dragonEgg=null; eggRespawn=12;
          const eTh=MCFG('egg','thuong');
          score+=eTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxEggBreak', eTh));
        } else {
          showHint(t('hintEggCracked'));
        }
      }
      // 🌫️ nổ ô trong vùng sương mù → sương tan một lúc
      if(fogCenter && Math.abs(fogCenter.r-r)<=1 && Math.abs(fogCenter.c-c)<=1){
        fogCenter=null; fogCooldown=6;
      }
      // 🕷️ nổ trúng ô nhện → trừ HP, nhện nhảy đi
      if(spider && !spiderHitWave && spider.r===r && spider.c===c){
        spiderHitWave=true;
        spider.hp--;
        if(spider.hp<=0){
          spider=null; spiderRespawn=20; spiderWebbedIdx=-1; spiderWebbedLeft=0;
          const sTh=MCFG('spider','thuong');
          score+=sTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxSpiderKill', sTh));
          renderPieces();
        } else {
          showHint(t('hintSpiderHp', spider.hp, MCFG('spider','hp')));
          const p=randEmptyKey(); if(p){ spider.r=p[0]; spider.c=p[1]; }
        }
      }
      // 🕳️ nổ kề hố đen → tích dấu phong ấn
      if(blackHole && !bhHitWave && Math.abs(blackHole.r-r)<=1 && Math.abs(blackHole.c-c)<=1 && !(blackHole.r===r&&blackHole.c===c)){
        bhHitWave=true;
        blackHole.seals++;
        if(blackHole.seals>=BH_SEALS){
          blackHole=null; bhRespawn=15;
          const hTh=MCFG('bh','thuong');
          score+=hTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxBhSeal', hTh));
        } else {
          showHint(t('hintBhSeal', blackHole.seals, BH_SEALS));
        }
      }
      // 👻 nổ trúng ô ma nhập → trừ tà
      if(ghostCell && ghostCell.r===r && ghostCell.c===c){
        ghostCell=null; ghostRespawn=12;
        const gTh=MCFG('ghost','thuong');
        score+=gTh; if(score>best) best=score; updateScoreUI();
        showComboFlash(0,false,t('fxGhostOut', gTh));
      }
      // 🐌 nổ kề ốc sên → tích đòn
      if(snail && !snailHitWave && Math.abs(snail.r-r)<=1 && Math.abs(snail.c-c)<=1 && !(snail.r===r&&snail.c===c)){
        snailHitWave=true;
        snail.hits++;
        if(snail.hits>=SNAIL_HITS){
          snail=null; snailRespawn=18;
          const oTh=MCFG('snail','thuong');
          score+=oTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxSnailKill', oTh));
        } else {
          showHint(t('hintSnailHit', snail.hits, SNAIL_HITS));
        }
      }
      // 🧱 nổ ô cạnh tường → bào mòn tường (giống núi, mỗi ô nổ bào 1 ô tường)
      if(wallCells.size){
        for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
          const nk=`${r+dr},${c+dc}`;
          if(wallCells.has(nk)){ wallCells.delete(nk); break; }
        }
      }
      // 🐍 nổ trúng thân rắn thần → trừ HP
      if(snakeSpirit && !snakeHitWave && snakeSpirit.cells.some(([sr,sc])=>sr===r&&sc===c)){
        snakeHitWave=true;
        snakeSpirit.hp--;
        if(snakeSpirit.hp<=0){
          snakeSpirit=null; snakeSpiritRespawn=25;
          const rTh=MCFG('snakeSpirit','thuong');
          score+=rTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxSnakeKill', rTh));
        } else {
          showHint(t('hintSnakeHp', snakeSpirit.hp, MCFG('snakeSpirit','hp')));
        }
      }
      // 🌀 nổ kề cổng → tích dấu đóng cổng (cả 2 cổng cùng đóng)
      if(portalA && !portalHitWave){
        const nearA=Math.abs(portalA.r-r)<=1&&Math.abs(portalA.c-c)<=1;
        const nearB=portalB&&Math.abs(portalB.r-r)<=1&&Math.abs(portalB.c-c)<=1;
        if(nearA||nearB){
          portalHitWave=true;
          portalHits++;
          if(portalHits>=PORTAL_SEALS){
            portalA=null; portalB=null; portalRespawn=20;
            const pTh=MCFG('portal','thuong');
            score+=pTh; if(score>best) best=score; updateScoreUI();
            showComboFlash(0,false,t('fxPortalClose', pTh));
          } else {
            showHint(t('hintPortalHit', portalHits, PORTAL_SEALS));
          }
        }
      }
      // 🐲 nổ trúng ô Vua Rồng → trừ HP, hắn bay đi chỗ khác
      if(dragonKing && !dkHitWave && dragonKing.r===r && dragonKing.c===c){
        dkHitWave=true;
        dragonKing.hp--;
        if(dragonKing.hp<=0){
          dragonKing=null; dkRespawn=30;
          const kTh=MCFG('dk','thuong');
          score+=kTh; if(score>best) best=score; updateScoreUI();
          showComboFlash(0,false,t('fxDkDown', kTh));
        } else {
          showHint('🐲 Trúng Vua Rồng! HP còn '+dragonKing.hp+'/'+MCFG('dk','hp'));
          const p=randEmptyKey(); if(p){ dragonKing.r=p[0]; dragonKing.c=p[1]; }
        }
      }
      // Track burst history and remove adjacent thorns
      if(thornMode){
        cellBurstCount[key]=(cellBurstCount[key]||0)+1;
        thornCells.delete(key); // cleared cells are no longer thorned
        for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
          const nk=`${r+dr},${c+dc}`;
          if(thornCells.has(nk)) thornCells.delete(nk);
        }
      }
      // ⛰️ nổ ô cạnh núi → bào mòn núi 1 ô (mỗi ô nổ bào tối đa 1 ô núi)
      if(mountainCells.size){
        for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
          const nk=`${r+dr},${c+dc}`;
          if(mountainCells.has(nk)){
            mountainCells.delete(nk);
            if(mountainCells.size===0){
              mountainRespawn=15; // san phẳng! 15 bước sau núi mới mọc lại
              showComboFlash(0,false,t('fxMountainFlat'));
            }
            break;
          }
        }
      }
      // 🐿️ nổ trúng ô sóc đang đứng HOẶC ô liền kề nó → trừ HP (mỗi đợt nổ chỉ trừ 1 lần)
      if(squirrel && !squirrelHitWave && Math.abs(squirrel.r-r)<=1 && Math.abs(squirrel.c-c)<=1){
        squirrelHitWave=true;
        squirrel.hp--;
        if(squirrel.hp<=0){
          squirrel=null;
          bittenCells.clear(); squirrelStolen=0; // các ô bị gặm được phục hồi khi sóc chết
          squirrelRespawn=6; // 6 bước sau nếu bàn cờ chưa "sạch" thì sóc mới sẽ xuất hiện
          const bTh=MCFG('squirrel','thuong');
          showComboFlash(0,false,t('fxSquirrelDown', bTh));
          score+=bTh; if(score>best) best=score; updateScoreUI();
        } else {
          showHint('🐿️ Trúng sóc! HP còn '+squirrel.hp+'/'+MCFG('squirrel','hp'));
          // sóc hoảng sợ nhảy sang 1 ô liền kề (vẫn tuân thủ quy tắc chỉ đi 1 ô mỗi lượt)
          squirrelStepTo1AdjacentCell();
        }
      }
    });
    renderGrid();

    // 🔥🫧💨 có vật phẩm bị phá trúng → chạy hiệu ứng trước, xong mới nối chuỗi
    if(triggeredPowers.length){
      setTimeout(()=>runPowerQueue(triggeredPowers), 150);
      return;
    }

    // Tiếp chuỗi nổ — mở map ẩn do cổng ★★★ (checkNormalMapThreeStars), không còn combo×3
    setTimeout(()=>processClears({ chain: true }), 100);
  }, waitTime);
}

/* 🌿 Thorn vine difficulty mechanic */

/* 🎆 Hiệu ứng pháo hoa viền + tia lấp lánh cho map thường */

function checkGameOverA(){
  // Đang có đợt nổ chờ gỡ ô khỏi board (ô vẫn "đầy ảo" trong lúc animation chạy) —
  // hoãn kết luận; chuỗi processClears sẽ gọi kiểm tra lại sau khi đợt nổ xong.
  if(pendingClearKeys.size>0) return false;
  // khay đã dùng hết khối → bổ sung trước khi kết luận (tránh báo hết lượt oan
  // khi luồng unlock/thoát map ẩn gọi check trước khi refill kịp chạy)
  if(!pieces || !pieces.length || pieces.every(p=>p.used)){ refillPieces(); renderPieces(); }
  const rot=s=>{ const maxR=Math.max(...s.map(([r])=>r)); return s.map(([r,c])=>[c,maxR-r]); };
  const pieceFits=piece=>{
    let sh=piece.shape;
    for(let k=0;k<4;k++){ // người chơi có thể XOAY khối — phải thử đủ 4 hướng
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(canPlace({shape:sh},r,c)) return true;
      sh=rot(sh);
    }
    return false;
  };
  let hasMove=pieces.some((piece,i)=>{
    if(piece.used) return false;
    if(spiderWebbedIdx===i && spiderWebbedLeft>0) return false; // khối bị tơ khóa không tính
    return pieceFits(piece);
  });
  // nước đi duy nhất còn lại nằm ở khối đang bị tơ nhện khóa → gỡ tơ thay vì xử thua
  if(!hasMove && spiderWebbedIdx>=0 && spiderWebbedLeft>0 && pieces[spiderWebbedIdx] &&
     !pieces[spiderWebbedIdx].used && pieceFits(pieces[spiderWebbedIdx])){
    spiderWebbedIdx=-1; spiderWebbedLeft=0;
    renderPieces();
    showHint('🕸️ Tơ nhện tự đứt — khối cuối cùng được giải phóng!');
    hasMove=true;
  }
  if(!hasMove){
    // Còn skill 🔥/🫧/💨 chưa dùng → chưa thua: người chơi vẫn phá được bàn
    let skillLeft=0;
    try{
      if(window.Inventory){
        skillLeft=(Inventory.fires|0)+(Inventory.bubbles|0)+(Inventory.winds|0);
      }
    }catch(e){ skillLeft=0; }
    if(skillLeft>0){
      try{
        showHint('Còn skill ×'+skillLeft+' — dùng 🔥 / 🫧 / 💨 để tiếp tục!');
        showComboFlash(0,false,'💫 Còn skill — chưa hết lượt!');
      }catch(e){}
      return false;
    }
    const goEl=document.getElementById('game-over-overlay');
    if(goEl && goEl.classList.contains('show')) return true; // đã thua — tránh trừ tim/ad lặp
    sfxGameOver();
    document.getElementById('go-score').textContent=t('finalScore', score.toLocaleString());
    if(goEl) goEl.classList.add('show');
    if(typeof submitScoreToLeaderboard==='function') submitScoreToLeaderboard(score);
    try{ if(typeof logGameEvent==='function') logGameEvent('level_end', { map_id:'classic', result:'no_moves', score:score, level_reached:level }); }catch(e){}
    // Hết nước đi + hết skill → mất 1 tim
    try{
      if(typeof spendHearts==='function') spendHearts(1, { allowPartial:true });
      else if(window.Inventory && typeof Inventory.spendHearts==='function') Inventory.spendHearts(1, { allowPartial:true });
      if(typeof renderInventoryHud==='function') renderInventoryHud();
    }catch(e){}
    window._adGameOverCount = (window._adGameOverCount||0) + 1;
    if(typeof showInterstitialAd==='function' && window._adGameOverCount % 2 === 0) showInterstitialAd();
    try{ if(typeof noteQuestEvent==='function'){
      noteQuestEvent('play', 1);
      noteQuestEvent('score', score);
    }}catch(e){}
    return true; // đã báo thua
  }
  return false;
}

function renderPieces(){
  const area=document.getElementById('pieces-area');
  area.innerHTML='';
  slotEls=[];
  pieces.forEach((piece,idx)=>{
    const slot=document.createElement('div');
    slot.className='piece-slot'+(piece.used?' used':'')+(selected===idx?' selected':'')
      +(spiderWebbedIdx===idx&&spiderWebbedLeft>0?' webbed':'');
    slot.addEventListener('pointerdown', (e)=>onSlotPointerDown(e, idx));
    const maxR=Math.max(...piece.shape.map(([r])=>r));
    const maxC=Math.max(...piece.shape.map(([,c])=>c));
    const g=document.createElement('div');
    
    // --- CHỈNH SỬA TẠI ĐÂY: Thêm lưới hàng ngang và ép căn giữa ---
    g.style.cssText=`display:grid;grid-template-columns:repeat(${maxC+1},14px);grid-template-rows:repeat(${maxR+1},14px);gap:2px;place-content:center;`;
    
    const cells=Array((maxR+1)*(maxC+1)).fill(null);
    piece.shape.forEach(([r,c])=>cells[r*(maxC+1)+c]=piece.color);
    cells.forEach(color=>{
      const d=document.createElement('div');
      d.className='p-cell'+(color?' sweet':'');
      
      // --- CHỈNH SỬA TẠI ĐÂY: Ép tỷ lệ ô luôn luôn vuông 1:1 ---
      d.style.aspectRatio='1 / 1';
      d.style.width='100%';
      d.style.height='100%';
      
      if(color){
        d.style.setProperty('--cc',color); d.style.border='none';
        const pci=COLORS.indexOf(color);
        if(pci>=0) d.dataset.ci=String(pci);
      }
      else { d.style.background='rgba(0,0,0,0.28)'; d.style.border='1px solid rgba(255,255,255,0.06)'; }
      g.appendChild(d);
    });
    slot.appendChild(g);
    const label=document.createElement('div');
    label.style.cssText='font-size:10px;color:#b8b0c8;margin-top:4px;font-weight:700;';
    const ci=COLORS.indexOf(piece.color);
    label.textContent=ci>=0?COLOR_NAMES[ci]:'';
    slot.appendChild(label);
    area.appendChild(slot);
    slotEls.push(slot);
  });
}

