// ═══════════════════════════════════════════════════════════════
// js/round-mechanics.js — 20 CƠ CHẾ ĐỘ KHÓ CỦA MAP THƯỜNG (vòng 1-20 + 41 Gương)
// Tách verbatim khỏi main.js. State + hàm spawn/step của dây gai, núi, sóc, băng,
// sương mù, bom, lốc, trứng, nhện, mây, tắc kè, hố đen, ma, ốc, tường, sét, rắn,
// núi lửa, cổng, Vua Rồng, Thế giới gương + applyRoundMechanics/resetMechanicState.
// Nạp TRƯỚC main.js (chia sẻ global scope; hàm tham chiếu board/renderGrid/rnd/MCFG
// của main.js lúc CHẠY nên an toàn).
// ═══════════════════════════════════════════════════════════════

// 🌿 Vòng 1 — dây gai: ô không được phá sau N bước sẽ bị gai quấn, phải nổ ô kề bên để gỡ
let thornMode = false;
let thornPlacementCount = 0;
let thornWave = 0;
let thornThreshold = 6;
let thornCells = new Set();
let cellBurstCount = {};
// Tuổi ô: gai CHỈ quấn ô đã nằm trên bàn QUÁ 5 lượt đặt khối mà vẫn chưa bị phá
let placeCounter = 0;      // tổng số lượt đặt khối trong ván
let cellPlacedAt = {};     // key "r,c" -> lượt mà ô nhận màu (đặt/dịch chuyển tới)
const THORN_MIN_AGE = 5;

// ⛰️ Vòng 2 — ngọn núi: mọc từ 1 chấm, cứ 10 bước không bào mòn lại lan thêm 1 ô,
// che ô nào nuốt ô đó; nổ nhóm CẠNH núi sẽ bào mòn núi 1 ô
let mountainCells = new Set();
let mountainStepCount = 0;
let mountainRespawn = 0; // đếm lùi số bước để núi mọc lại sau khi bị san phẳng

// 🐿️ Vòng 3 — con sóc: vài bước lại nhảy tới trộm 1 ô màu; nổ trúng ô nó đứng để trừ HP;
// để nó trộm đủ giới hạn là thua luôn ván map thường
let squirrel = null; // {r, c, hp}
let squirrelStepCount = 0;
let squirrelMoveCount = 0; // đếm số lượt sóc đã DI CHUYỂN (1 ô/lượt) — cứ 3 lượt di chuyển mới ăn 1 ô
let squirrelStolen = 0;
let squirrelRespawn = 0; // đếm lùi số bước sau khi sóc chết — hết 6 bước mà chưa phá xong ô nào thì sóc mới xuất hiện
let bittenCells = new Set(); // khung các ô đã bị sóc gặm — hiện rõ trên bàn, chặn đặt khối, diệt sóc sẽ phục hồi

// 🧊 Vòng 4 — băng giá: thỉnh thoảng 1 ô màu bị đóng băng, phải nổ 2 lần mới vỡ
let iceCells = new Map(); // key -> 2 (băng cứng) | 1 (đã nứt)
let iceStepCount = 0;

// 🌫️ Vòng 5 — sương mù 3×3 trôi trên bàn, che màu ô; nổ ô trong sương làm sương tan tạm
let fogCenter = null; // {r,c}
let fogStepCount = 0, fogCooldown = 0;

// 💣 Vòng 6 — bom hẹn giờ: đếm ngược theo bước, nổ mất vùng 3×3; gỡ bằng nổ ô kề bên
let bombCell = null; // {r,c}
let bombTimer = 0, bombRespawn = 0;

// 🌪️ Vòng 7 — lốc xoáy: mỗi 15 bước càn qua 1 hàng/cột, xáo trộn vị trí ô màu
let tornadoStepCount = 0;

// 🥚 Vòng 8 — trứng rồng: nở sau 12 bước → thiêu rụi cả hàng; đập vỡ trước bằng 2 lần nổ kề bên
let dragonEgg = null; // {r,c,shell,hatch}
let eggRespawn = 0;
const EGG_SHELL = 2;

let mechAnnounced={};
function announceMech(key,msg,delay){
  if(mechAnnounced[key]) return;
  mechAnnounced[key]=true;
  setTimeout(()=>showComboFlash(0,false,msg), delay);
}
// 💥 Điểm phạt mỗi Ô MÀU (không tính ô trống) bị PHÁ trực tiếp bởi cơ chế của map
// (núi nuốt ô, sóc trộm ô, hố đen nuốt ô, sét đánh, rắn thần nuốt ô, trứng rồng
// thiêu rụi hàng, Vua Rồng ra đòn...). Bom hẹn giờ dùng mức phạt riêng (MCFG bomb.phat).
const MECH_CELL_DESTROY_PENALTY = 5;
// destroyedCount: số ô màu thực sự vừa bị phá. Trừ điểm tương ứng (không để điểm âm),
// trả về số điểm đã trừ (0 nếu không có ô nào bị phá / hết điểm để trừ).
function penalizeMechDestroy(destroyedCount){
  if(!destroyedCount || destroyedCount<=0) return 0;
  const lost=Math.min(score, destroyedCount*MECH_CELL_DESTROY_PENALTY);
  if(lost<=0) return 0;
  score-=lost; updateScoreUI();
  try{ sfxPenalty(); }catch(e){}
  return lost;
}
function randEmptyKey(){
  const empties=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!board[r][c] && !cellBlockedForPlacement(r,c)) empties.push([r,c]);
  }
  return empties.length? empties[rnd(empties.length)] : null;
}
function freezeRandomCell(){
  const cands=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const k=r+','+c;
    if(board[r][c] && !iceCells.has(k) && !thornCells.has(k)) cands.push(k);
  }
  if(!cands.length) return;
  iceCells.set(cands[rnd(cands.length)], 2);
  renderGrid();
}
function spawnFog(){
  fogCenter={r:1+rnd(ROWS-2), c:1+rnd(COLS-2)};
  fogStepCount=0;
  renderGrid();
}
function driftFog(){
  if(!fogCenter) return;
  fogCenter.r=Math.max(1,Math.min(ROWS-2,fogCenter.r+rnd(3)-1));
  fogCenter.c=Math.max(1,Math.min(COLS-2,fogCenter.c+rnd(3)-1));
  renderGrid();
}
function spawnBomb(){
  const p=randEmptyKey(); if(!p) return;
  bombCell={r:p[0], c:p[1]}; bombTimer=MCFG('bomb','nhip');
  renderGrid();
}
function bombExplode(){
  const {r,c}=bombCell;
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    const nr=r+dr,nc=c+dc;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS) continue;
    const k=nr+','+nc;
    if(mountainCells.has(k)) continue;
    board[nr][nc]=null; thornCells.delete(k); iceCells.delete(k);
  }
  bombCell=null; bombRespawn=10;
  // Bom nổ = phạt điểm (không phải thua ngay) — trừ điểm nhưng không để điểm âm
  const bPh=MCFG('bomb','phat');
  const lost=Math.min(score, bPh);
  score-=lost; updateScoreUI();
  try{ sfxPenalty(); }catch(e){}
  showComboFlash(0,false,t('fxBombExplode', lost));
  renderGrid();
}
function tornadoSweep(){
  const isRow=Math.random()<0.5, idx=rnd(isRow?ROWS:COLS);
  const cells=[], colors=[];
  for(let i=0;i<(isRow?COLS:ROWS);i++){
    const r=isRow?idx:i, c=isRow?i:idx, k=r+','+c;
    if(mountainCells.has(k)||thornCells.has(k)||iceCells.has(k)||bittenCells.has(k)) continue;
    if(bombCell&&bombCell.r===r&&bombCell.c===c) continue;
    if(dragonEgg&&dragonEgg.r===r&&dragonEgg.c===c) continue;
    cells.push([r,c]);
    if(board[r][c]) colors.push(board[r][c]);
  }
  if(!colors.length) return;
  cells.forEach(([r,c])=>{ board[r][c]=null; delete cellPlacedAt[r+','+c]; });
  const spots=cells.slice();
  while(colors.length && spots.length){
    const [r,c]=spots.splice(rnd(spots.length),1)[0];
    board[r][c]=colors.pop();
    cellPlacedAt[r+','+c]=placeCounter; // ô vừa bị lốc thổi tới — tính là mới
  }
  showComboFlash(0,false,t('fxTornado', idx+1, isRow?t('rowWord'):t('colWord')));
  renderGrid();
}
function spawnEgg(){
  const p=randEmptyKey(); if(!p) return;
  dragonEgg={r:p[0], c:p[1], shell:EGG_SHELL, hatch:MCFG('egg','nhip')};
  renderGrid();
}
function eggHatchBurn(){
  const row=dragonEgg.r;
  let destroyed=0;
  for(let c=0;c<COLS;c++){
    const k=row+','+c;
    if(mountainCells.has(k)) continue;
    if(board[row][c]) destroyed++;
    board[row][c]=null; thornCells.delete(k); iceCells.delete(k);
  }
  dragonEgg=null; eggRespawn=12;
  const lost=penalizeMechDestroy(destroyed);
  try{ sfxGameOver(); }catch(e){}
  showComboFlash(0,false,t('fxEggHatch', row+1, lost>0?' (-'+lost+')':''));
  renderGrid();
}

/* ── VÒNG 9-20 — các cơ chế nâng cao, cộng dồn và hiểm dần ── */
// 🕷️ V9 — nhện: giăng tơ KHÓA 1 khối trong khay 3 bước; nổ trúng ô nhện 5 lần để diệt
let spider=null; // {r,c,hp}
let spiderStepCount=0, spiderRespawn=0, spiderWebbedIdx=-1, spiderWebbedLeft=0;
const SPIDER_WEB_LOCK=3;
// 🌧️ V10 — mây mưa: rửa trôi màu 1 ô trong cột nó đứng → ô xám chết (chỉ xóa bằng hàng)
let cloudCol=-1, cloudStepCount=0;
const WASHED_COLOR='#8a8f98';
// 🦎 V11 — tắc kè: lén đổi màu 2 ô mỗi 8 bước
let chamStepCount=0;
// 🕳️ V12 — hố đen: nuốt ô màu gần nhất mỗi 10 bước; nổ kề 3 lần để phong ấn
let blackHole=null; // {r,c,eaten,seals}
let bhStepCount=0, bhRespawn=0;
const BH_SEALS=3;
// 👻 V13 — bóng ma: nhập vào 1 ô và HIỂN THỊ MÀU GIẢ; nổ trúng để trừ tà
let ghostCell=null; // {r,c,disguise}
let ghostStepCount=0, ghostRespawn=0;
// 🐌 V14 — ốc sên: bò 1 ô/bước, để vệt nhớt chặn đặt khối 4 bước; nổ kề 2 lần để diệt
let snail=null; // {r,c,hits}
let slimeCells=new Map(); // key -> số bước còn dính
let snailRespawn=0;
const SLIME_LAST=4, SNAIL_HITS=2;
// 🧱 V15 — tường gạch: mỗi 14 bước rơi 1 đoạn tường 1×3; bào mòn như núi
let wallCells=new Set();
let wallStepCount=0;
// ⚡ V16 — sét: cảnh báo trước 3 bước rồi đánh sạch vùng 2×2 (không gỡ được)
let lightning=null; // {r,c,countdown}
let lightningStepCount=0;
const LIGHTNING_WARN=3;
// 🐍 V17 — rắn thần: thân 3 ô trườn mỗi bước, ăn ô màu nó bò lên; nổ trúng thân 5 lần
let snakeSpirit=null; // {cells:[[r,c]...], hp}
let snakeSpiritRespawn=0;
// 🌋 V18 — núi lửa: khi còn núi, mỗi 15 bước phun 3 tảng đá thành tường
let volcanoStepCount=0;
// 🌀 V19 — cổng dịch chuyển: mỗi 5 bước dịch 1 ô màu đi chỗ khác; nổ kề cổng 3 lần để đóng
let portalA=null, portalB=null, portalHits=0;
let portalStepCount=0, portalRespawn=0;
const PORTAL_SEALS=3;
// 🐲 V20 — VUA RỒNG: mỗi 12 bước tung 1 đòn ngẫu nhiên; nổ trúng 15 lần để hạ
let dragonKing=null; // {r,c,hp}
let dkStepCount=0, dkRespawn=0;

// 🪞 V41 — THẾ GIỚI GƯƠNG: mỗi khối người chơi đặt xuống sẽ tự sinh 1 khối đối xứng
// qua trục dọc giữa bàn cờ (cột c ↔ cột COLS-1-c). Nếu khối đối xứng không có chỗ đặt → thua.
let mirrorCells=new Set();       // các ô do khối đối xứng (không phải người chơi) lấp vào — để tô viền riêng
let mirrorCombo=0;               // số lần liên tiếp khối đối xứng đặt thành công (dùng để thưởng Mirror Break)
let mirrorBreakCharges=0;        // số lượt "Mirror Break" người chơi đang có sẵn để dùng
let mirrorBreakPending=false;    // đã bấm dùng Mirror Break cho LƯỢT ĐẶT KẾ TIẾP hay chưa
const MIRROR_COMBO_FOR_CHARGE=4; // cứ 4 lần đối xứng thành công liên tiếp → +1 Mirror Break

function mirrorCol(c){ return COLS-1-c; }

// API đề xuất: được gọi ngay sau khi placeAt() đặt khối của người chơi thành công.
// placedCells: mảng [r,c] các ô vừa được người chơi lấp; color: màu khối vừa đặt.
function placePlayerPiece(placedCells,color){
  updateMirrorBreakUI();
  if(mirrorBreakPending){
    mirrorBreakPending=false;
    showComboFlash(0,false,t('fxMirrorUse'));
    updateMirrorBreakUI();
    return;
  }
  spawnMirrorPiece(placedCells,color);
}

// Sinh khối đối xứng: phản chiếu từng ô vừa đặt qua trục dọc giữa bàn cờ.
function spawnMirrorPiece(placedCells,color){
  const placedSet=new Set(placedCells.map(([r,c])=>r+','+c));
  const mirrorTarget=placedCells
    .map(([r,c])=>[r,mirrorCol(c)])
    .filter(([r,c])=>!placedSet.has(r+','+c)); // ô trùng tâm đối xứng thì đã tự đúng, khỏi cần lấp lại
  if(!checkMirrorCollision(mirrorTarget)){
    triggerMirrorGameOver();
    return;
  }
  placeCounter++;
  mirrorTarget.forEach(([r,c])=>{
    board[r][c]=color;
    cellPlacedAt[r+','+c]=placeCounter;
    mirrorCells.add(r+','+c);
  });
  renderGrid();
  updateMirrorCombo(true);
}

// Trả về true nếu TOÀN BỘ ô của khối đối xứng đều còn trống & không bị mechanic khác chiếm.
function checkMirrorCollision(mirrorTarget){
  return mirrorTarget.every(([r,c])=>
    r>=0&&r<ROWS&&c>=0&&c<COLS&&!board[r][c]&&!cellBlockedForPlacement(r,c));
}

function triggerMirrorGameOver(){
  sfxGameOver();
  document.getElementById('go-score').textContent=t('finalScore', score.toLocaleString())+' — 🪞';
  document.getElementById('game-over-overlay').classList.add('show');
}

// Theo dõi chuỗi đặt-đối-xứng-thành-công liên tiếp; cứ đủ mốc lại thưởng 1 Mirror Break.
function updateMirrorCombo(success){
  if(success){
    mirrorCombo++;
    if(mirrorCombo>0 && mirrorCombo%MIRROR_COMBO_FOR_CHARGE===0){
      mirrorBreakCharges++;
      showComboFlash(0,false,t('fxMirrorGain'));
    }
  } else {
    mirrorCombo=0;
  }
  updateMirrorBreakUI();
}

function useMirrorBreak(){
  if(mirrorBreakCharges<=0||mirrorBreakPending) return;
  mirrorBreakCharges--; mirrorBreakPending=true;
  showHint('🪞 Đã kích hoạt Mirror Break — lượt đặt tiếp theo sẽ không sinh khối đối xứng!');
  updateMirrorBreakUI();
}

function updateMirrorBreakUI(){
  const btn=document.getElementById('mirror-break-btn');
  if(!btn) return;
  const active=tierActive(21);
  btn.style.display=active?'flex':'none';
  if(!active) return;
  btn.disabled=mirrorBreakCharges<=0||mirrorBreakPending;
  btn.textContent=mirrorBreakPending?'🪞 Đang chờ áp dụng…':'🪞 Mirror Break ×'+mirrorBreakCharges;
}

function spawnSpider(){ const p=randEmptyKey(); if(!p) return; spider={r:p[0],c:p[1],hp:MCFG('spider','hp')}; spiderStepCount=0; renderGrid(); }
function spiderWebPiece(){
  const cands=pieces.map((p,i)=>(!p.used&&i!==spiderWebbedIdx)?i:-1).filter(i=>i>=0);
  if(!cands.length) return;
  spiderWebbedIdx=cands[rnd(cands.length)]; spiderWebbedLeft=SPIDER_WEB_LOCK;
  showHint('🕷️ Nhện giăng tơ khóa 1 khối — chờ '+SPIDER_WEB_LOCK+' bước hoặc diệt nhện!');
  renderPieces();
}
function cloudWash(){
  if(cloudCol<0) cloudCol=rnd(COLS);
  const cands=[];
  for(let r=0;r<ROWS;r++){
    const k=r+','+cloudCol;
    if(board[r][cloudCol] && board[r][cloudCol]!==WASHED_COLOR && !iceCells.has(k) && !thornCells.has(k)) cands.push(r);
  }
  if(cands.length){ board[cands[rnd(cands.length)]][cloudCol]=WASHED_COLOR; }
  cloudCol=rnd(COLS); // mây trôi sang cột khác
  renderGrid();
}
function chameleonRepaint(){
  const cands=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const k=r+','+c;
    if(board[r][c] && board[r][c]!==WASHED_COLOR && !iceCells.has(k) && !thornCells.has(k)) cands.push([r,c]);
  }
  for(let i=0;i<2 && cands.length;i++){
    const [r,c]=cands.splice(rnd(cands.length),1)[0];
    board[r][c]=rndColor();
  }
  renderGrid();
}
function spawnBlackHole(){ const p=randEmptyKey(); if(!p) return; blackHole={r:p[0],c:p[1],eaten:0,seals:0}; bhStepCount=0; renderGrid(); }
function blackHoleSwallow(){
  let bestD=1e9,best=null;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!board[r][c]) continue;
    const d=Math.abs(r-blackHole.r)+Math.abs(c-blackHole.c);
    if(d<bestD){ bestD=d; best=[r,c]; }
  }
  if(best){
    const k=best[0]+','+best[1];
    board[best[0]][best[1]]=null; thornCells.delete(k); iceCells.delete(k);
    blackHole.eaten++;
    const lost=penalizeMechDestroy(1);
    if(blackHole.eaten>=6){
      blackHole=null; bhRespawn=15;
      showComboFlash(0,false,t('fxBhFull', lost>0?' (-'+lost+')':''));
    } else if(lost>0){
      showComboFlash(0,false,t('fxBhSwallow', lost));
    }
  }
  renderGrid();
}
function spawnGhost(){
  const cands=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(board[r][c]&&board[r][c]!==WASHED_COLOR) cands.push([r,c]);
  if(!cands.length){ ghostRespawn=3; return; }
  const [r,c]=cands[rnd(cands.length)];
  let dis; do{ dis=rndColor(); }while(dis===board[r][c]);
  ghostCell={r,c,disguise:dis};
  ghostStepCount=0; renderGrid();
}
function spawnSnail(){ const p=randEmptyKey(); if(!p) return; snail={r:p[0],c:p[1],hits:0}; renderGrid(); }
function snailCrawl(){
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dr,dc])=>{
    const nr=snail.r+dr,nc=snail.c+dc;
    return nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!mountainCells.has(nr+','+nc)&&!wallCells.has(nr+','+nc);
  });
  if(dirs.length){
    const [dr,dc]=dirs[rnd(dirs.length)];
    snail.r+=dr; snail.c+=dc;
    const k=snail.r+','+snail.c;
    if(!board[snail.r][snail.c]) slimeCells.set(k,SLIME_LAST); // nhớt chỉ dính ô trống
  }
  renderGrid();
}
function dropWall(){
  const isRow=Math.random()<0.5;
  const r0=rnd(ROWS), c0=rnd(COLS);
  let placed=0;
  for(let i=0;i<3;i++){
    const r=isRow?r0:Math.min(ROWS-1,r0+i), c=isRow?Math.min(COLS-1,c0+i):c0;
    const k=r+','+c;
    if(!board[r][c] && !mountainCells.has(k) && !wallCells.has(k) && !bittenCells.has(k)
       && !(bombCell&&bombCell.r===r&&bombCell.c===c) && !(dragonEgg&&dragonEgg.r===r&&dragonEgg.c===c)
       && !(blackHole&&blackHole.r===r&&blackHole.c===c)){ wallCells.add(k); placed++; }
  }
  if(placed) renderGrid();
}
function lightningStrike(){
  let destroyed=0;
  for(let dr=0;dr<2;dr++)for(let dc=0;dc<2;dc++){
    const nr=lightning.r+dr,nc=lightning.c+dc;
    if(nr>=ROWS||nc>=COLS) continue;
    const k=nr+','+nc;
    if(mountainCells.has(k)||wallCells.has(k)) continue;
    if(board[nr][nc]) destroyed++;
    board[nr][nc]=null; thornCells.delete(k); iceCells.delete(k);
  }
  lightning=null;
  const lost=penalizeMechDestroy(destroyed);
  try{ sfxPenalty(); }catch(e){}
  showComboFlash(0,false,t('fxLightning', lost>0?' (-'+lost+')':''));
  renderGrid();
}
function spawnSnakeSpirit(){
  const p=randEmptyKey(); if(!p) return;
  snakeSpirit={cells:[[p[0],p[1]],[p[0],p[1]],[p[0],p[1]]], hp:MCFG('snakeSpirit','hp')};
  renderGrid();
}
function snakeSpiritSlither(){
  const [hr,hc]=snakeSpirit.cells[0];
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dr,dc])=>{
    const nr=hr+dr,nc=hc+dc;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS) return false;
    const k=nr+','+nc;
    if(mountainCells.has(k)||wallCells.has(k)) return false;
    return !snakeSpirit.cells.some(([sr,sc])=>sr===nr&&sc===nc);
  });
  if(!dirs.length) return;
  const [dr,dc]=dirs[rnd(dirs.length)];
  const nr=hr+dr,nc=hc+dc;
  if(board[nr][nc]){
    board[nr][nc]=null; thornCells.delete(nr+','+nc); iceCells.delete(nr+','+nc); // ăn ô màu
    const lost=penalizeMechDestroy(1);
    if(lost>0) showComboFlash(0,false,t('fxSnakeAte', lost));
  }
  snakeSpirit.cells.unshift([nr,nc]); snakeSpirit.cells.pop();
  renderGrid();
}
function volcanoErupt(){
  let dropped=0;
  for(let i=0;i<3;i++){
    const p=randEmptyKey(); if(!p) break;
    wallCells.add(p[0]+','+p[1]); dropped++;
  }
  if(dropped){
    try{ sfxPenalty(); }catch(e){}
    showComboFlash(0,false,t('fxVolcano', dropped));
    renderGrid();
  }
}
function spawnPortals(){
  const a=randEmptyKey(); if(!a) return;
  portalA={r:a[0],c:a[1]};
  const b=randEmptyKey();
  if(!b){ portalA=null; return; }
  portalB={r:b[0],c:b[1]};
  portalHits=0; portalStepCount=0;
  renderGrid();
}
function portalTeleport(){
  const filled=[], empt=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const k=r+','+c;
    if(board[r][c]&&!iceCells.has(k)&&!thornCells.has(k)) filled.push([r,c]);
    else if(!board[r][c]&&!cellBlockedForPlacement(r,c)) empt.push([r,c]);
  }
  if(!filled.length||!empt.length) return;
  const [fr,fc]=filled[rnd(filled.length)];
  const [er,ec]=empt[rnd(empt.length)];
  board[er][ec]=board[fr][fc]; board[fr][fc]=null;
  cellPlacedAt[er+','+ec]=placeCounter; delete cellPlacedAt[fr+','+fc]; // ô dịch chuyển tới tính là mới
  renderGrid();
}
function spawnDragonKing(){
  const p=randEmptyKey(); if(!p) return;
  dragonKing={r:p[0],c:p[1],hp:MCFG('dk','hp')};
  dkStepCount=0; renderGrid();
}
function dragonKingAttack(){
  const atk=rnd(4);
  if(atk===0){ // đốt 1 hàng ngẫu nhiên
    const row=rnd(ROWS);
    let destroyed=0;
    for(let c=0;c<COLS;c++){
      const k=row+','+c;
      if(mountainCells.has(k)||wallCells.has(k)) continue;
      if(board[row][c]) destroyed++;
      board[row][c]=null; thornCells.delete(k); iceCells.delete(k);
    }
    const lost=penalizeMechDestroy(destroyed);
    showComboFlash(0,false,t('fxDkBurn', row+1, lost>0?' (-'+lost+')':''));
  } else if(atk===1){ // đóng băng 3 ô
    for(let i=0;i<3;i++) freezeRandomCell();
    showComboFlash(0,false,t('fxDkFreeze'));
  } else if(atk===2){ // gieo 2 gai
    const cands=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const k=r+','+c;
      if(board[r][c]&&!thornCells.has(k)&&!iceCells.has(k)) cands.push(k);
    }
    for(let i=0;i<2&&cands.length;i++) thornCells.add(cands.splice(rnd(cands.length),1)[0]);
    showComboFlash(0,false,t('fxDkThorn'));
  } else { // trộm 3 ô màu
    let destroyed=0;
    for(let i=0;i<3;i++){
      const cands=[];
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(board[r][c]) cands.push([r,c]);
      if(!cands.length) break;
      const [r,c]=cands[rnd(cands.length)];
      board[r][c]=null; thornCells.delete(r+','+c); iceCells.delete(r+','+c);
      destroyed++;
    }
    const lost=penalizeMechDestroy(destroyed);
    showComboFlash(0,false,t('fxDkSteal', lost>0?' (-'+lost+')':''));
  }
  try{ sfxPenalty(); }catch(e){}
  renderGrid();
}

// 🔒 Xoá sạch trạng thái của MỌI cơ chế. Gọi trước khi kích hoạt cơ chế của vòng mới
// để đảm bảo mỗi vòng chỉ có ĐÚNG 1 cơ chế đang hoạt động, không cộng dồn với vòng trước.
function resetMechanicState(){
  thornMode=false; thornCells=new Set(); cellBurstCount={}; thornPlacementCount=0; thornWave=0; thornThreshold=6;
  mountainCells=new Set(); mountainStepCount=0; mountainRespawn=0;
  squirrel=null; squirrelStepCount=0; squirrelMoveCount=0; squirrelStolen=0; squirrelRespawn=0; bittenCells=new Set();
  iceCells=new Map(); iceStepCount=0;
  fogCenter=null; fogStepCount=0; fogCooldown=0;
  bombCell=null; bombTimer=0; bombRespawn=0;
  tornadoStepCount=0;
  dragonEgg=null; eggRespawn=0;
  spider=null; spiderStepCount=0; spiderRespawn=0; spiderWebbedIdx=-1; spiderWebbedLeft=0;
  cloudCol=-1; cloudStepCount=0;
  chamStepCount=0;
  blackHole=null; bhStepCount=0; bhRespawn=0;
  ghostCell=null; ghostStepCount=0; ghostRespawn=0;
  snail=null; slimeCells=new Map(); snailRespawn=0;
  wallCells=new Set(); wallStepCount=0;
  lightning=null; lightningStepCount=0;
  snakeSpirit=null; snakeSpiritRespawn=0;
  volcanoStepCount=0;
  portalA=null; portalB=null; portalHits=0; portalStepCount=0; portalRespawn=0;
  dragonKing=null; dkStepCount=0; dkRespawn=0;
  mirrorCells=new Set(); mirrorCombo=0; mirrorBreakCharges=0; mirrorBreakPending=false;
  renderGrid();
  updateMirrorBreakUI();
}
// Mỗi vòng (v1→v20) chỉ có ĐÚNG MỘT cơ chế ẩn mới, không trùng/cộng dồn với vòng trước.
// vòng 1: tắc kè hoa · vòng 2: núi · vòng 3: sóc trộm ô · ... · vòng 11: dây gai · ... · vòng 20: Vua Rồng
function applyRoundMechanics(){
  if(tierActive(11) && !thornMode){
    thornMode=true; thornPlacementCount=0; thornWave=0; thornThreshold=6;
    thornCells=new Set(); cellBurstCount={};
  }
  if(tierActive(2) && mountainCells.size===0 && mountainRespawn<=0){
    spawnMountain();
  }
  if(tierActive(3) && !squirrel){
    spawnSquirrel();
  }
  if(tierActive(5)){
    if(!fogCenter && fogCooldown<=0) spawnFog();
  }
  if(tierActive(6)){
    if(!bombCell && bombRespawn<=0) spawnBomb();
  }
  if(tierActive(8)){
    if(!dragonEgg && eggRespawn<=0) spawnEgg();
  }
  if(tierActive(9)){
    if(!spider && spiderRespawn<=0) spawnSpider();
  }
  if(tierActive(10)){
    if(cloudCol<0) cloudCol=rnd(COLS);
  }
  if(tierActive(12)){
    if(!blackHole && bhRespawn<=0) spawnBlackHole();
  }
  if(tierActive(13)){
    if(!ghostCell && ghostRespawn<=0) spawnGhost();
  }
  if(tierActive(14)){
    if(!snail && snailRespawn<=0) spawnSnail();
  }
  if(tierActive(17)){
    if(!snakeSpirit && snakeSpiritRespawn<=0) spawnSnakeSpirit();
  }
  if(tierActive(18)){
    if(mountainCells.size===0 && mountainRespawn<=0) spawnMountain(); // đỉnh núi lửa riêng của vòng 18
  }
  if(tierActive(19)){
    if(!portalA && portalRespawn<=0) spawnPortals();
  }
  if(tierActive(20)){
    if(!dragonKing && dkRespawn<=0) spawnDragonKing();
  }
  if(tierActive(21)){
    updateMirrorBreakUI();
  }
}
function spawnMountain(){
  const empties=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(!board[r][c]) empties.push(r+','+c);
  if(!empties.length) return;
  mountainCells=new Set([empties[rnd(empties.length)]]);
  mountainStepCount=0;
  renderGrid();
}
function growMountain(){
  const cands=[];
  mountainCells.forEach(k=>{
    const [r,c]=k.split(',').map(Number);
    for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const nr=r+dr,nc=c+dc,nk=nr+','+nc;
      if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!mountainCells.has(nk)) cands.push(nk);
    }
  });
  if(!cands.length) return;
  const nk=cands[rnd(cands.length)];
  mountainCells.add(nk);
  const [r,c]=nk.split(',').map(Number);
  const hadColor=!!board[r][c];
  board[r][c]=null; // núi lan tới đâu nuốt ô tới đó
  thornCells.delete(nk); iceCells.delete(nk);
  if(hadColor){
    const lost=penalizeMechDestroy(1);
    if(lost>0) showComboFlash(0,false,t('fxMountainAte', lost));
  }
  renderGrid();
}
function spawnSquirrel(){
  squirrel={r:rnd(ROWS), c:rnd(COLS), hp:MCFG('squirrel','hp')};
  squirrelStepCount=0; squirrelMoveCount=0; squirrelStolen=0;
  renderGrid();
}
// Sóc di chuyển ngẫu nhiên, mỗi lượt chỉ đi 1 ô (lên/xuống/trái/phải, không đi chéo, không ra ngoài bàn cờ,
// và KHÔNG được nhảy vào ô đã bị gặm trước đó). Trả về true nếu di chuyển được, false nếu hoàn toàn không còn chỗ đi.
function squirrelStepTo1AdjacentCell(){
  if(!squirrel) return false;
  const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
  const options=[];
  for(const [dr,dc] of dirs){
    const nr=squirrel.r+dr, nc=squirrel.c+dc;
    if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS && !bittenCells.has(nr+','+nc)) options.push([nr,nc]);
  }
  if(options.length){
    const [nr,nc]=options[rnd(options.length)];
    squirrel.r=nr; squirrel.c=nc;
    return true;
  }
  // Bị vây tứ phía toàn ô đã gặm → sóc dịch chuyển sang 1 ô bất kỳ còn lại trên bàn cờ (chưa bị gặm)
  const free=[];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(!(r===squirrel.r && c===squirrel.c) && !bittenCells.has(r+','+c)) free.push([r,c]);
  }
  if(free.length){
    const [nr,nc]=free[rnd(free.length)];
    squirrel.r=nr; squirrel.c=nc;
    return true;
  }
  return false; // cả bàn cờ đã bị gặm hết (gần như không thể xảy ra) → đứng yên
}
// Gặm 1 ô cụ thể — dùng cho ô sóc VỪA RỜI ĐI (không phải ô nó đang đứng)
function squirrelBiteCell(r,c){
  if(!board[r][c] || mountainCells.has(r+','+c)) return; // ô trống/có núi → không có gì để gặm
  const k=r+','+c;
  board[r][c]=null; thornCells.delete(k); iceCells.delete(k); // trộm mất ô màu
  bittenCells.add(k); // để lại khung ô đã bị gặm — không đặt khối lên được nữa, sóc cũng không quay lại ô này nữa
  squirrelStolen=bittenCells.size;
  const lost=penalizeMechDestroy(1);
  try{ sfxPenalty(); }catch(e){}
  showHint('🐿️ Sóc đã gặm '+bittenCells.size+'/'+MCFG('squirrel','limit')+' ô'+(lost>0?' (-'+lost+'đ)':'')+' — diệt nó để phục hồi!');
  if(bittenCells.size>=MCFG('squirrel','limit')){
    renderGrid();
    sfxGameOver();
    showComboFlash(0,false,t('fxSquirrelWreck'));
    document.getElementById('go-score').textContent=t('finalScore', score.toLocaleString());
    document.getElementById('game-over-overlay').classList.add('show');
  }
}
function squirrelMoveAndSteal(){
  if(!squirrel) return;
  const prevR=squirrel.r, prevC=squirrel.c;
  const moved=squirrelStepTo1AdjacentCell();
  if(!moved){ renderGrid(); return; } // bị vây bởi các ô đã gặm → đứng yên, không tính vào 3 lượt di chuyển
  squirrelMoveCount++;
  if(squirrelMoveCount>=3){
    squirrelMoveCount=0;
    squirrelBiteCell(prevR,prevC); // gặm đúng ô nó VỪA RỜI ĐI, không phải ô mới tới
  }
  renderGrid();
}

// ═══════════════════════════════════════════════════════════════
// BẢNG TÊN / MÔ TẢ CƠ CHẾ + TIER MATH (vòng đơn 1-20, đôi 21-40, 41 Gương)
// Tách từ main.js để mọi thứ liên quan cơ chế nằm cùng một chỗ.
// ═══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════
// 🌗 VÒNG 21-40 — CƠ CHẾ ĐÔI (kết hợp 2 cơ chế đơn liền kề của vòng 1-20)
// vòng 21 = cơ chế(1)+cơ chế(2) · vòng 22 = cơ chế(2)+cơ chế(3) · ... ·
// vòng 39 = cơ chế(19)+cơ chế(20) · vòng 40 = cơ chế(20)+cơ chế(1)  → 20 cặp, không cặp nào trùng nhau.
// Tên/mô tả cơ chế đa ngôn ngữ: xem js/i18n-content.js (MECH_NAME/MECH_DESC).
// Trả về mô tả cơ chế của một VÒNG bất kỳ (1-41): vòng đơn 1-20, đôi 21-40, 41 = Thế giới gương.
function roundMechDescFor(tier){
  if(tier>=1 && tier<=20) return MECH_NAME(tier)+': '+MECH_DESC(tier);
  if(tier>=21 && tier<=40){
    const [a,b]=comboPairForTier(tier);
    return t('comboPair')+' — '+MECH_NAME(a)+' + '+MECH_NAME(b)+':<br>• '+
      MECH_NAME(a)+': '+MECH_DESC(a)+'<br>• '+MECH_NAME(b)+': '+MECH_DESC(b);
  }
  if(tier===41) return MECH_NAME(21)+': '+MECH_DESC(21);
  return '';
}
// Vòng khó cao nhất người chơi đã CHẠM tới (để giới hạn hướng dẫn cho tài khoản thường).
function highestReachedTier(){
  return Math.max(mainHardTier|0, maxComboTierReached|0); // 0 = chưa tới vòng có cơ chế nào
}
function comboPairForTier(t){ // t trong 21..40 → [a,b] là 2 vòng cơ chế gốc (1-20)
  const i=t-21, a=i+1, b=(i+1)%20+1;
  return [a,b];
}
function isComboTier(t){ return t>=21 && t<=40; }
// Trả về true nếu cơ chế gốc số baseN đang cần hoạt động ở vòng hiện tại (đơn hoặc đôi)
function tierActive(baseN){
  if(baseN===21) return mainHardTier===41; // 🪞 Thế giới gương — vòng đơn 41 (sau khi hết 20 vòng đôi 21-40)
  if(mainHardTier===baseN) return true;
  if(isComboTier(mainHardTier)){
    const [a,b]=comboPairForTier(mainHardTier);
    return baseN===a || baseN===b;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// stepRoundMechanics — chạy MỘT bước tất cả cơ chế đang hoạt động, gọi sau mỗi
// lần người chơi đặt khối (từ placeAt). mirrorCells/mirrorColor: ô & màu khối vừa
// đặt, để cơ chế Thế giới gương (vòng 41) sinh khối đối xứng.
// ═══════════════════════════════════════════════════════════════
function stepRoundMechanics(_mirrorPlacedCells,_mirrorPlacedColor){
  if(thornMode){
    thornPlacementCount++;
    if(thornPlacementCount>=thornThreshold){
      thornPlacementCount=0;
      thornWave++;
      thornThreshold=Math.max(3,6-thornWave);
      spawnThorns();
    }
  }
  // ⛰️ núi lớn dần theo bước đặt khối (CHỈ vòng 2)
  if(tierActive(2)){
    if(mountainCells.size>0){
      mountainStepCount++;
      if(mountainStepCount>=MCFG('mountain','nhip')){ mountainStepCount=0; growMountain(); }
    } else if(mountainRespawn>0 && --mountainRespawn<=0){
      spawnMountain();
    }
  }
  // 🐿️ sóc di chuyển & trộm ô theo bước (CHỈ vòng 3)
  if(tierActive(3)){
    if(squirrel){
      squirrelStepCount++;
      if(squirrelStepCount>=MCFG('squirrel','nhip')){ squirrelStepCount=0; squirrelMoveAndSteal(); }
    } else if(squirrelRespawn>0 && --squirrelRespawn<=0){
      // Sóc đã bị diệt — nếu 6 bước trôi qua mà không có sóc mới thì tự xuất hiện con khác
      spawnSquirrel();
      showComboFlash(0,false,t('fxSquirrelAgain'));
    }
  }
  // 🧊 đóng băng ô mới theo chu kỳ (CHỈ vòng 4)
  if(tierActive(4)){
    iceStepCount++;
    if(iceStepCount>=MCFG('ice','nhip')){ iceStepCount=0; freezeRandomCell(); }
  }
  // 🌫️ sương mù trôi / tan rồi tụ lại (CHỈ vòng 5)
  if(tierActive(5)){
    if(fogCenter){
      fogStepCount++;
      if(fogStepCount>=MCFG('fog','nhip')){ fogStepCount=0; driftFog(); }
    } else if(fogCooldown>0 && --fogCooldown<=0){
      spawnFog();
    }
  }
  // 💣 bom đếm ngược / mọc lại (CHỈ vòng 6)
  if(tierActive(6)){
    if(bombCell){
      bombTimer--;
      if(bombTimer<=0) bombExplode();
    } else if(bombRespawn>0 && --bombRespawn<=0){
      spawnBomb();
    }
  }
  // 🌪️ lốc xoáy theo chu kỳ (CHỈ vòng 7)
  if(tierActive(7)){
    tornadoStepCount++;
    if(tornadoStepCount>=MCFG('tornado','nhip')){ tornadoStepCount=0; tornadoSweep(); }
  }
  // 🥚 trứng rồng ấp / mọc lại (CHỈ vòng 8)
  if(tierActive(8)){
    if(dragonEgg){
      dragonEgg.hatch--;
      if(dragonEgg.hatch<=0) eggHatchBurn();
    } else if(eggRespawn>0 && --eggRespawn<=0){
      spawnEgg();
    }
  }
  // 🕷️ nhện giăng tơ khay + gỡ tơ dần (CHỈ vòng 9)
  if(tierActive(9)){
    if(spiderWebbedLeft>0 && --spiderWebbedLeft<=0){ spiderWebbedIdx=-1; renderPieces(); }
    if(spider){
      spiderStepCount++;
      if(spiderStepCount>=MCFG('spider','nhip')){ spiderStepCount=0; spiderWebPiece(); }
    } else if(spiderRespawn>0 && --spiderRespawn<=0){
      spawnSpider();
    }
  }
  // 🌧️ mây mưa rửa màu (CHỈ vòng 10)
  if(tierActive(10)){
    cloudStepCount++;
    if(cloudStepCount>=MCFG('cloud','nhip')){ cloudStepCount=0; cloudWash(); }
  }
  // 🦎 tắc kè đổi màu lén (CHỈ vòng 1)
  if(tierActive(1)){
    chamStepCount++;
    if(chamStepCount>=MCFG('cham','nhip')){ chamStepCount=0; chameleonRepaint(); }
  }
  // 🕳️ hố đen nuốt ô (CHỈ vòng 12)
  if(tierActive(12)){
    if(blackHole){
      bhStepCount++;
      if(bhStepCount>=MCFG('bh','nhip')){ bhStepCount=0; blackHoleSwallow(); }
    } else if(bhRespawn>0 && --bhRespawn<=0){
      spawnBlackHole();
    }
  }
  // 👻 bóng ma di chuyển / đổi màu giả (CHỈ vòng 13)
  if(tierActive(13)){
    if(ghostCell){
      if(!board[ghostCell.r][ghostCell.c]){ ghostCell=null; ghostRespawn=3; } // ô ma nhập đã biến mất
      else {
        ghostStepCount++;
        if(ghostStepCount>=MCFG('ghost','nhip')){ ghostStepCount=0; spawnGhost(); }
      }
    } else if(ghostRespawn>0 && --ghostRespawn<=0){
      spawnGhost();
    }
  }
  // 🐌 ốc sên bò + nhớt bay hơi (CHỈ vòng 14)
  if(tierActive(14)){
    slimeCells.forEach((v,k)=>{ if(v<=1) slimeCells.delete(k); else slimeCells.set(k,v-1); });
    if(snail) snailCrawl();
    else if(snailRespawn>0 && --snailRespawn<=0) spawnSnail();
  }
  // 🧱 tường rơi (CHỈ vòng 15)
  if(tierActive(15)){
    wallStepCount++;
    if(wallStepCount>=MCFG('wall','nhip')){ wallStepCount=0; dropWall(); }
  }
  // ⚡ sét: cảnh báo rồi đánh (CHỈ vòng 16)
  if(tierActive(16)){
    if(lightning){
      lightning.countdown--;
      if(lightning.countdown<=0) lightningStrike();
      else renderGrid();
    } else {
      lightningStepCount++;
      if(lightningStepCount>=MCFG('lightning','nhip')){
        lightningStepCount=0;
        lightning={r:rnd(ROWS-1), c:rnd(COLS-1), countdown:LIGHTNING_WARN};
        renderGrid();
      }
    }
  }
  // 🐍 rắn thần trườn (CHỈ vòng 17)
  if(tierActive(17)){
    if(snakeSpirit) snakeSpiritSlither();
    else if(snakeSpiritRespawn>0 && --snakeSpiritRespawn<=0) spawnSnakeSpirit();
  }
  // 🌋 núi lửa phun đá / mọc lại đỉnh (CHỈ vòng 18 — có núi riêng, không cần vòng 2)
  if(tierActive(18)){
    if(mountainCells.size>0){
      volcanoStepCount++;
      if(volcanoStepCount>=MCFG('volcano','nhip')){ volcanoStepCount=0; volcanoErupt(); }
    } else if(mountainRespawn>0 && --mountainRespawn<=0){
      spawnMountain();
    }
  }
  // 🌀 cổng dịch chuyển (CHỈ vòng 19)
  if(tierActive(19)){
    if(portalA){
      portalStepCount++;
      if(portalStepCount>=MCFG('portal','nhip')){ portalStepCount=0; portalTeleport(); }
    } else if(portalRespawn>0 && --portalRespawn<=0){
      spawnPortals();
    }
  }
  // 🐲 Vua Rồng ra đòn (CHỈ vòng 20)
  if(tierActive(20)){
    if(dragonKing){
      dkStepCount++;
      if(dkStepCount>=MCFG('dk','nhip')){ dkStepCount=0; dragonKingAttack(); }
    } else if(dkRespawn>0 && --dkRespawn<=0){
      spawnDragonKing();
    }
  }
  // 🪞 Thế giới gương (CHỈ vòng 41) — sinh khối đối xứng ngay sau khi khối của người chơi được đặt
  if(tierActive(21)){
    placePlayerPiece(_mirrorPlacedCells,_mirrorPlacedColor);
  }
}

// ═══════════════════════════════════════════════════════════════
// spawnThorns — vòng 1 (dây gai): quấn gai các ô đã nằm quá 5 lượt chưa bị phá.
// ═══════════════════════════════════════════════════════════════
function spawnThorns(){
  let newThorns=0;
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const key=`${r},${c}`;
      // chỉ quấn gai ô đã nằm QUÁ 5 lượt đặt khối mà chưa bị phá — khối mới đặt được tha
      const age=placeCounter-(cellPlacedAt[key]!==undefined?cellPlacedAt[key]:placeCounter);
      if(!cellBurstCount[key] && board[r][c]!==null && !thornCells.has(key) && age>THORN_MIN_AGE){
        thornCells.add(key);
        newThorns++;
      }
    }
  }
  renderGrid();
  if(newThorns>0){
    sfxThorn();
    showComboFlash(0,false,t('fxThornGrow', newThorns));
  }
}
