// ═══════════════════════════════════════════════════════════════
// js/roundMechanics.js — 20 CƠ CHẾ ĐỘ KHÓ CỦA MAP THƯỜNG (vòng 1-20 + 41 Gương)
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
  showComboFlash(0,false,'💥 Bom nổ — mất vùng 3×3 & -'+lost+'đ!');
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
  showComboFlash(0,false,'🌪️ Lốc xoáy càn qua '+(isRow?'hàng':'cột')+' '+(idx+1)+'!');
  renderGrid();
}
function spawnEgg(){
  const p=randEmptyKey(); if(!p) return;
  dragonEgg={r:p[0], c:p[1], shell:EGG_SHELL, hatch:MCFG('egg','nhip')};
  renderGrid();
}
function eggHatchBurn(){
  const row=dragonEgg.r;
  for(let c=0;c<COLS;c++){
    const k=row+','+c;
    if(mountainCells.has(k)) continue;
    board[row][c]=null; thornCells.delete(k); iceCells.delete(k);
  }
  dragonEgg=null; eggRespawn=12;
  try{ sfxGameOver(); }catch(e){}
  showComboFlash(0,false,'🐲 Rồng con nở — thiêu rụi cả hàng '+(row+1)+'!');
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
    showComboFlash(0,false,'🪞 Mirror Break — lượt này không sinh khối đối xứng!');
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
  document.getElementById('go-score').textContent='Điểm của bạn: '+score.toLocaleString()+' — 🪞 Khối đối xứng không còn chỗ đặt!';
  document.getElementById('game-over-overlay').classList.add('show');
}

// Theo dõi chuỗi đặt-đối-xứng-thành-công liên tiếp; cứ đủ mốc lại thưởng 1 Mirror Break.
function updateMirrorCombo(success){
  if(success){
    mirrorCombo++;
    if(mirrorCombo>0 && mirrorCombo%MIRROR_COMBO_FOR_CHARGE===0){
      mirrorBreakCharges++;
      showComboFlash(0,false,'🪞 Nhận được 1 Mirror Break!');
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
    if(blackHole.eaten>=6){ blackHole=null; bhRespawn=15; showComboFlash(0,false,'🕳️ Hố đen no nê rồi biến mất!'); }
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
  for(let dr=0;dr<2;dr++)for(let dc=0;dc<2;dc++){
    const nr=lightning.r+dr,nc=lightning.c+dc;
    if(nr>=ROWS||nc>=COLS) continue;
    const k=nr+','+nc;
    if(mountainCells.has(k)||wallCells.has(k)) continue;
    board[nr][nc]=null; thornCells.delete(k); iceCells.delete(k);
  }
  lightning=null;
  try{ sfxPenalty(); }catch(e){}
  showComboFlash(0,false,'⚡ Sét đánh trúng bàn cờ!');
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
  if(board[nr][nc]){ board[nr][nc]=null; thornCells.delete(nr+','+nc); iceCells.delete(nr+','+nc); } // ăn ô màu
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
    showComboFlash(0,false,'🌋 Núi lửa phun '+dropped+' tảng đá!');
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
    for(let c=0;c<COLS;c++){
      const k=row+','+c;
      if(mountainCells.has(k)||wallCells.has(k)) continue;
      board[row][c]=null; thornCells.delete(k); iceCells.delete(k);
    }
    showComboFlash(0,false,'🐲 Vua Rồng thiêu rụi hàng '+(row+1)+'!');
  } else if(atk===1){ // đóng băng 3 ô
    for(let i=0;i<3;i++) freezeRandomCell();
    showComboFlash(0,false,'🐲 Vua Rồng thổi băng giá!');
  } else if(atk===2){ // gieo 2 gai
    const cands=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const k=r+','+c;
      if(board[r][c]&&!thornCells.has(k)&&!iceCells.has(k)) cands.push(k);
    }
    for(let i=0;i<2&&cands.length;i++) thornCells.add(cands.splice(rnd(cands.length),1)[0]);
    showComboFlash(0,false,'🐲 Vua Rồng gieo dây gai!');
  } else { // trộm 3 ô màu
    for(let i=0;i<3;i++){
      const cands=[];
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(board[r][c]) cands.push([r,c]);
      if(!cands.length) break;
      const [r,c]=cands[rnd(cands.length)];
      board[r][c]=null; thornCells.delete(r+','+c); iceCells.delete(r+','+c);
    }
    showComboFlash(0,false,'🐲 Vua Rồng cướp ô màu!');
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
// vòng 1: dây gai · vòng 2: núi · vòng 3: sóc trộm ô · ... · vòng 20: Vua Rồng
function applyRoundMechanics(){
  if(tierActive(1) && !thornMode){
    thornMode=true; thornPlacementCount=0; thornWave=0; thornThreshold=6;
    thornCells=new Set(); cellBurstCount={};
    setTimeout(()=>showComboFlash(0,false,'🌿 Dây gai xuất hiện trên bàn cờ!'), 900);
  }
  if(tierActive(2) && mountainCells.size===0 && mountainRespawn<=0){
    spawnMountain();
    setTimeout(()=>showComboFlash(0,false,'⛰️ Ngọn núi nhỏ xuất hiện — đừng để nó lớn!'), 1600);
  }
  if(tierActive(3) && !squirrel){
    spawnSquirrel();
    setTimeout(()=>showComboFlash(0,false,'🐿️ Con sóc trộm ô xuất hiện — nổ trúng nó hoặc ô kề bên '+MCFG('squirrel','hp')+' lần!'), 2300);
  }
  if(tierActive(4)) announceMech('ice','🧊 Băng giá: ô đóng băng phải nổ 2 lần mới vỡ!', 3000);
  if(tierActive(5)){
    if(!fogCenter && fogCooldown<=0) spawnFog();
    announceMech('fog','🌫️ Sương mù che khuất màu — hãy ghi nhớ!', 3700);
  }
  if(tierActive(6)){
    if(!bombCell && bombRespawn<=0) spawnBomb();
    announceMech('bomb','💣 Bom hẹn giờ! Nổ ô kề bên để gỡ trước khi nổ!', 4400);
  }
  if(tierActive(7)) announceMech('tornado','🌪️ Coi chừng lốc xoáy xáo trộn bàn cờ!', 5100);
  if(tierActive(8)){
    if(!dragonEgg && eggRespawn<=0) spawnEgg();
    announceMech('egg','🥚 Trứng rồng xuất hiện — đập vỡ trước khi nó nở!', 5800);
  }
  if(tierActive(9)){
    if(!spider && spiderRespawn<=0) spawnSpider();
    announceMech('spider','🕷️ Nhện giăng tơ khóa khối gạch của bạn!', 6500);
  }
  if(tierActive(10)){
    if(cloudCol<0) cloudCol=rnd(COLS);
    announceMech('cloud','🌧️ Mây mưa rửa trôi màu ô thành ô xám!', 7200);
  }
  if(tierActive(11)) announceMech('cham','🦎 Tắc kè lén đổi màu ô — cẩn thận!', 7900);
  if(tierActive(12)){
    if(!blackHole && bhRespawn<=0) spawnBlackHole();
    announceMech('bh','🕳️ Hố đen nuốt ô — nổ kề bên 3 lần để phong ấn!', 8600);
  }
  if(tierActive(13)){
    if(!ghostCell && ghostRespawn<=0) spawnGhost();
    announceMech('ghost','👻 Bóng ma giả dạng màu ô — đừng tin vào mắt mình!', 9300);
  }
  if(tierActive(14)){
    if(!snail && snailRespawn<=0) spawnSnail();
    announceMech('snail','🐌 Ốc sên để lại vệt nhớt chặn ô trống!', 10000);
  }
  if(tierActive(15)) announceMech('wall','🧱 Tường gạch sẽ rơi xuống bàn cờ!', 10700);
  if(tierActive(16)) announceMech('lightning','⚡ Sét đánh — tránh xa vùng cảnh báo!', 11400);
  if(tierActive(17)){
    if(!snakeSpirit && snakeSpiritRespawn<=0) spawnSnakeSpirit();
    announceMech('snakespirit','🐍 Rắn thần trườn qua nuốt ô màu!', 12100);
  }
  if(tierActive(18)){
    if(mountainCells.size===0 && mountainRespawn<=0) spawnMountain(); // đỉnh núi lửa riêng của vòng 18
    announceMech('volcano','🌋 Núi lửa xuất hiện — sẽ phun đá quanh bàn cờ!', 12800);
  }
  if(tierActive(19)){
    if(!portalA && portalRespawn<=0) spawnPortals();
    announceMech('portal','🌀 Cổng dịch chuyển tráo đổi ô màu!', 13500);
  }
  if(tierActive(20)){
    if(!dragonKing && dkRespawn<=0) spawnDragonKing();
    announceMech('dk','🐲 VUA RỒNG GIÁNG THẾ — thử thách tối thượng!', 14200);
  }
  if(tierActive(21)){
    updateMirrorBreakUI();
    announceMech('mirror','🪞 THẾ GIỚI GƯƠNG — mỗi khối bạn đặt sẽ tự sinh 1 khối đối xứng qua trục giữa. Đối xứng không có chỗ đặt → thua!', 14900);
  }
  if(isComboTier(mainHardTier)){
    const [a,b]=comboPairForTier(mainHardTier);
    announceMech('combo'+mainHardTier,
      '🌗 Vòng '+mainHardTier+' — Cơ chế đôi: '+ROUND_MECH_NAMES[a]+' + '+ROUND_MECH_NAMES[b]+'!', 700);
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
  board[r][c]=null; // núi lan tới đâu nuốt ô tới đó
  thornCells.delete(nk); iceCells.delete(nk);
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
  try{ sfxPenalty(); }catch(e){}
  showHint('🐿️ Sóc đã gặm '+bittenCells.size+'/'+MCFG('squirrel','limit')+' ô — diệt nó để phục hồi!');
  if(bittenCells.size>=MCFG('squirrel','limit')){
    renderGrid();
    sfxGameOver();
    showComboFlash(0,false,'🐿️ Sóc đã gặm nát bàn cờ!');
    document.getElementById('go-score').textContent='Điểm của bạn: '+score.toLocaleString();
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
