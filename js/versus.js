// ═══════════════════════════════════════════════════════════════
// js/versus.js — ĐẤU 1-1 (mở khoá từ Level 10)
// Hai người chơi thi đấu TRÊN CÙNG THIẾT BỊ (chuyền tay): tạo phòng, mỗi người
// chơi 1 lượt blitz VERSUS_TIME giây trên bàn chính với CÙNG chuỗi khối
// (PRNG cùng hạt giống — công bằng tuyệt đối). Điểm cao hơn thắng, +XP thưởng.
// Trong lúc đấu: tắt mở khoá map ẩn + cơ chế vòng; kết thúc trận khôi phục
// nguyên trạng ván đang chơi dở.
// GHI CHÚ NÂNG CẤP ONLINE: mọi logic vòng đấu nằm trong startVersusRound/
// endVersusRound — muốn đấu qua mạng chỉ cần đồng bộ {seed, điểm} qua server,
// không phải sửa engine.
// Nạp SAU main.js. ═══════════════════════════════════════════════
const VERSUS_TIME = 90;        // giây mỗi lượt đấu
const VERSUS_MIN_LEVEL = 10;   // cấp người chơi (XP) tối thiểu để mở phòng
const VERSUS_WIN_XP = 30, VERSUS_LOSE_XP = 10;

let versusMode = false;
let _vs = null; // {seed, phase, names:[a,b], scores:[x,y], timeLeft, timer, snapshot}

// PRNG mulberry32 — cùng seed cho cả 2 lượt đấu
function _mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _vsSnapshot(){
  return {
    score, best, board: JSON.parse(JSON.stringify(board||null)),
    pieces: JSON.parse(JSON.stringify(pieces||null)), selected,
    mainHardTier, unlockGateActive, unlockGateStageIndex, unlockGateBaseline,
    comboGateActive, comboGateBaseline, unlockDeferred, consecutiveBursts,
  };
}
function _vsRestore(s){
  score=s.score; best=s.best; selected=null;
  mainHardTier=s.mainHardTier;
  unlockGateActive=s.unlockGateActive; unlockGateStageIndex=s.unlockGateStageIndex; unlockGateBaseline=s.unlockGateBaseline;
  comboGateActive=s.comboGateActive; comboGateBaseline=s.comboGateBaseline;
  unlockDeferred=s.unlockDeferred; consecutiveBursts=s.consecutiveBursts;
  if(s.board){ board=s.board; }
  if(s.pieces){ pieces=s.pieces; }
  resetMechanicState();
  if(mainHardTier>0) applyRoundMechanics();
  renderGrid(); renderPieces(); updateScoreUI(); updateBurstCount();
}

function canHostVersus(){ return (typeof playerLevel!=='undefined' && playerLevel >= VERSUS_MIN_LEVEL); }

// ── UI helpers ──
function _vsShow(id){ const el=document.getElementById(id); if(el) el.classList.add('show'); }
function _vsHide(id){ const el=document.getElementById(id); if(el) el.classList.remove('show'); }
function _vsTimerEl(){ return document.getElementById('versus-timer'); }

function openVersusSetup(){
  try{ sfxClick(); }catch(e){}
  if(!canHostVersus()){
    showHint(t('vsNeedLevel', VERSUS_MIN_LEVEL));
    try{ showComboFlash(0,false,t('vsNeedLevel', VERSUS_MIN_LEVEL)); }catch(e){}
    return;
  }
  const p1=document.getElementById('vs-name1');
  if(p1 && typeof currentUser!=='undefined' && currentUser && currentUser.username) p1.value=currentUser.username;
  _vsShow('versus-setup-panel');
}

function startVersusMatch(){
  const n1=(document.getElementById('vs-name1').value.trim()||t('vsP1'));
  const n2=(document.getElementById('vs-name2').value.trim()||t('vsP2'));
  _vsHide('versus-setup-panel');
  if(typeof hardResetAllModes==='function') hardResetAllModes();
  _vs = {
    seed: (Date.now() ^ (Math.random()*0xFFFFFFF)) >>> 0,
    phase: 0, names:[n1,n2], scores:[0,0], timeLeft: 0, timer: null,
    snapshot: _vsSnapshot(),
  };
  _vsHandoff(0);
}

// Màn "đưa máy cho người chơi X"
function _vsHandoff(phase){
  _vs.phase = phase;
  document.getElementById('vs-handoff-title').textContent = t('vsHandoffTitle', _vs.names[phase]);
  document.getElementById('vs-handoff-desc').textContent =
    phase===0 ? t('vsHandoffFirst', VERSUS_TIME) : t('vsHandoffSecond', _vs.names[0], _vs.scores[0]);
  _vsShow('versus-handoff-panel');
}

function _vsBeginRound(){
  _vsHide('versus-handoff-panel');
  startVersusRound(_vs.phase);
}

function startVersusRound(phase){
  // cùng seed cho cả 2 lượt → cùng chuỗi khối
  setPieceRand(_mulberry32(_vs.seed));
  versusMode = true;
  // tắt tiến trình/cơ chế trong lúc đấu
  unlockGateActive=false; comboGateActive=false; unlockDeferred=false;
  mainHardTier=0; resetMechanicState();
  startGame();
  score=0; updateScoreUI();
  const badge=document.getElementById('mode-badge');
  if(badge){ badge.textContent='⚔️ '+_vs.names[phase]; badge.classList.add('secret'); }
  _vs.timeLeft = VERSUS_TIME;
  const tm=_vsTimerEl(); if(tm){ tm.style.display='block'; }
  _vsTick();
  _vs.timer = setInterval(_vsTick, 1000);
}

function _vsTick(){
  if(!versusMode || !_vs) return;
  if(typeof gamePaused!=='undefined' && gamePaused) return; // tạm dừng thì giữ giờ
  const tm=_vsTimerEl();
  if(tm) tm.textContent = '⚔️ '+_vs.names[_vs.phase]+' · '+_vs.timeLeft+'s · '+score;
  // hết chỗ đặt → kết thúc lượt sớm
  const go=document.getElementById('game-over-overlay');
  if(go && go.classList.contains('show')){ go.classList.remove('show'); endVersusRound(); return; }
  if(_vs.timeLeft<=0){ endVersusRound(); return; }
  _vs.timeLeft--;
}

function endVersusRound(){
  if(_vs.timer){ clearInterval(_vs.timer); _vs.timer=null; }
  _vs.scores[_vs.phase] = score;
  setPieceRand(null);
  versusMode = false;
  const tm=_vsTimerEl(); if(tm) tm.style.display='none';
  const badge=document.getElementById('mode-badge');
  if(badge){ badge.textContent=t('badgeNormal'); badge.classList.remove('secret'); }
  if(_vs.phase===0){
    _vsHandoff(1);
  } else {
    _vsFinish();
  }
}

function _vsFinish(){
  const [s1,s2]=_vs.scores, [n1,n2]=_vs.names;
  let msg;
  if(s1===s2){ msg=t('vsDraw'); }
  else {
    const w = s1>s2 ? n1 : n2;
    msg = t('vsWin', w);
    try{ addPlayerXP(VERSUS_WIN_XP); }catch(e){}
  }
  try{ if(s1!==s2) addPlayerXP(VERSUS_LOSE_XP); }catch(e){} // an ủi người thua (cộng chung vì cùng máy)
  document.getElementById('vs-result-title').textContent = msg;
  document.getElementById('vs-result-body').innerHTML =
    '<div class="lb-row'+(s1>=s2?' me':'')+'"><span class="lb-rank">'+(s1>=s2?'🥇':'🥈')+'</span><span class="lb-name">'+escapeHtml(n1)+'</span><span class="lb-score">'+s1.toLocaleString()+'</span></div>'+
    '<div class="lb-row'+(s2>s1?' me':'')+'"><span class="lb-rank">'+(s2>s1?'🥇':'🥈')+'</span><span class="lb-name">'+escapeHtml(n2)+'</span><span class="lb-score">'+s2.toLocaleString()+'</span></div>'+
    '<div style="font-size:11px;color:#9aa7bd;margin-top:8px;">'+t('vsXpNote', VERSUS_WIN_XP)+'</div>';
  // ghi điểm người thắng lên bảng xếp hạng thiết bị
  try{ submitScoreToLeaderboard(Math.max(s1,s2)); }catch(e){}
  _vsShow('versus-result-panel');
}

function _vsCloseResult(rematch){
  _vsHide('versus-result-panel');
  if(rematch){
    _vs.seed=(Date.now() ^ (Math.random()*0xFFFFFFF))>>>0;
    _vs.scores=[0,0];
    _vsHandoff(0);
    return;
  }
  // khôi phục ván chơi dở trước trận đấu
  const snap=_vs.snapshot; _vs=null;
  if(snap) _vsRestore(snap);
}

// ── wiring ──
(function initVersus(){
  const btn=document.getElementById('versus-btn');
  if(btn) btn.addEventListener('click', openVersusSetup);
  const start=document.getElementById('vs-start-btn');
  if(start) start.addEventListener('click', startVersusMatch);
  const cancel=document.getElementById('vs-cancel-btn');
  if(cancel) cancel.addEventListener('click', ()=>_vsHide('versus-setup-panel'));
  const ready=document.getElementById('vs-ready-btn');
  if(ready) ready.addEventListener('click', _vsBeginRound);
  const again=document.getElementById('vs-again-btn');
  if(again) again.addEventListener('click', ()=>_vsCloseResult(true));
  const close=document.getElementById('vs-close-btn');
  if(close) close.addEventListener('click', ()=>_vsCloseResult(false));
})();
