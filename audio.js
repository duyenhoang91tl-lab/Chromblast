/* ══════════════════════════════════════════
   BGM ENGINE - Nhạc nền tổng hợp theo chủ đề
══════════════════════════════════════════ */
let bgmInterval = null;
let bgmStep = 0;
let bgmCurrentTheme = null;
const NOTES = {
  C4: 261.63, E4: 329.63, G4: 392.00, B4: 493.88,
  A3: 220.00, D4: 293.66, F4: 349.23, C5: 523.25,
  G3: 196.00, B3: 246.94, E3: 164.81, A4: 440.00
};
const BGM_THEMES = {
  'main': [NOTES.C4, NOTES.E4, NOTES.G4, NOTES.E4, NOTES.B4, NOTES.G4, NOTES.E4, NOTES.G4],
  'action': [NOTES.A3, NOTES.C4, NOTES.E4, NOTES.A3, NOTES.D4, NOTES.F4, NOTES.A3, NOTES.E4],
  'space': [NOTES.G3, NOTES.D4, NOTES.G3, NOTES.C5, NOTES.G3, NOTES.B4, NOTES.G3, NOTES.A4],
  'mystery': [NOTES.E3, NOTES.G3, NOTES.B3, NOTES.E4, NOTES.G3, NOTES.B3, NOTES.D4, NOTES.B3]
};
function startBgm(type) {
  if(bgmCurrentTheme===type && bgmInterval) return; // đã phát đúng nhạc nền này rồi, khỏi khởi động lại (tránh giật nhịp)
  stopBgm();
  bgmCurrentTheme=type;
  if (sfxMuted) return;
  bgmStep = 0;
  const melody = BGM_THEMES[type] || BGM_THEMES['main'];
  const tempo = (type === 'action') ? 250 : 450;
  bgmInterval = setInterval(() => {
    if (sfxMuted) return;
    const freq = melody[bgmStep % melody.length];
    playTone(freq, 'triangle', 0.5, 0.04);
    bgmStep++;
  }, tempo);
}
function stopBgm() {
  if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
  bgmCurrentTheme = null;
}

/* ══════════════════════════════════════════════
   SOUND ENGINE — Web Audio API synthesized sounds
══════════════════════════════════════════════ */
let _sfxCtx = null;
let sfxMuted = false;
function getSfxCtx(){
  if(!_sfxCtx) _sfxCtx = new (window.AudioContext||window.webkitAudioContext)();
  return _sfxCtx;
}
function playTone(freq, type, duration, vol=0.3, startDelay=0){
  if(sfxMuted) return;
  try{
    const ctx=getSfxCtx();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type=type; osc.frequency.value=freq;
    const t=ctx.currentTime+startDelay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t+duration);
    osc.start(t); osc.stop(t+duration+0.01);
  }catch(e){}
}
function playNoise(duration, vol=0.15){
  if(sfxMuted) return;
  try{
    const ctx=getSfxCtx();
    const buf=ctx.createBuffer(1,ctx.sampleRate*duration,ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
    const src=ctx.createBufferSource();
    const gain=ctx.createGain();
    const filt=ctx.createBiquadFilter();
    src.buffer=buf; filt.type='bandpass'; filt.frequency.value=3000;
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(vol,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+duration);
    src.start(); src.stop(ctx.currentTime+duration+0.01);
  }catch(e){}
}
function sfxMatch(groupSize){
  const f = 300 + groupSize*40;
  playTone(f,'sine',0.15, 0.25);
  playTone(f*1.5,'sine',0.12, 0.15, 0.08);
}
function sfxComboUp(combo, praiseLevel){
  // Âm thanh tăng dần theo độ dài combo VÀ theo mức khen (cool→...→god like) — càng cao càng vang, càng chói
  const lvl = praiseLevel||0;
  const base=440;
  const vol=Math.min(0.55, 0.28+lvl*0.035);
  playTone(base*(1+combo*0.1)*(1+lvl*0.06),'triangle',0.2+lvl*0.015, vol);
  if(lvl>=3) playTone(base*1.5*(1+lvl*0.06),'sine',0.15,vol*0.6,0.05);
}
function sfxStreak(streak){
  playTone(440+streak*55,'sine',0.18, 0.28);
}
function sfxUltra(){
  playTone(220,'sawtooth',0.05,0.2,0);
  playTone(330,'sawtooth',0.05,0.2,0.05);
  playTone(440,'sawtooth',0.05,0.25,0.1);
  playTone(660,'sine',0.2,0.3,0.15);
  playTone(880,'sine',0.18,0.25,0.25);
}
function sfxFruitSlice(){
  playNoise(0.08, 0.18);
  playTone(600,'sine',0.05, 0.1);
}
function sfxBomb(){
  playTone(80,'sawtooth',0.3, 0.4);
  playNoise(0.3, 0.25);
}
function sfxBeeKill(){
  playTone(800,'square',0.04, 0.2);
  playTone(400,'square',0.04, 0.15, 0.03);
}
function sfxDogStung(){
  playTone(350,'sine',0.1, 0.3);
  playTone(280,'sine',0.15, 0.25, 0.1);
}
function sfxDodge(){
  playNoise(0.06, 0.12);
}
function sfxGoldCollect(){
  playTone(660,'sine',0.1, 0.3);
  playTone(880,'sine',0.1, 0.25, 0.08);
}
function sfxDiamondCollect(){
  playTone(880,'sine',0.08,0.3,0);
  playTone(1100,'sine',0.08,0.3,0.06);
  playTone(1320,'sine',0.1,0.35,0.12);
}
function sfxGameOver(){
  playTone(400,'triangle',0.3,0.3,0);
  playTone(320,'triangle',0.3,0.3,0.15);
  playTone(240,'triangle',0.35,0.3,0.3);
  playTone(160,'triangle',0.5,0.25,0.5);
}
function sfxUnlock(){
  playTone(523,'sine',0.1,0.3,0);
  playTone(659,'sine',0.1,0.3,0.1);
  playTone(784,'sine',0.1,0.3,0.2);
  playTone(1047,'sine',0.2,0.35,0.3);
}
function sfxScoreMilestone(){
  playTone(660,'triangle',0.12,0.3,0);
  playTone(880,'triangle',0.12,0.3,0.08);
  playTone(1100,'triangle',0.15,0.3,0.16);
}
function sfxPlacePiece(){
  playTone(1200,'sine',0.07,0.06);
  playTone(900,'sine',0.04,0.05,0.03);
}
function sfxBeeBuzz(){
  // ngắn, lặp lại tạo tiếng vo ve
  playTone(180,'sawtooth',0.04,0.08);
  playTone(220,'sawtooth',0.03,0.06,0.02);
}
function sfxSelect(){
  playTone(440,'sine',0.04,0.12);
}
function sfxRotate(){
  playTone(500,'sine',0.05,0.15,0);
  playTone(700,'sine',0.05,0.15,0.04);
}
function sfxInvalid(){
  playTone(150,'square',0.12,0.2);
}
function sfxClick(){
  playTone(600,'sine',0.04,0.15);
}
function sfxThorn(){
  playTone(180,'sawtooth',0.15,0.2);
  playTone(120,'sawtooth',0.15,0.18,0.08);
}
function sfxWaveWin(){
  playTone(523,'triangle',0.1,0.3,0);
  playTone(659,'triangle',0.1,0.3,0.08);
  playTone(880,'triangle',0.15,0.35,0.16);
}
function sfxRopeDrop(){
  playTone(900,'sine',0.05,0.15,0);
  playTone(500,'sine',0.12,0.18,0.04);
}
function sfxRopePull(){
  playTone(220,'sawtooth',0.08,0.1);
}
function sfxHammer(){
  playTone(300,'triangle',0.18,0.08);
  playNoise(0.12,0.06);
}
function sfxPenalty(){
  playTone(120,'sawtooth',0.2,0.25);
  playTone(90,'sawtooth',0.18,0.2,0.1);
}
function sfxMoleAppear(){
  playTone(600,'sine',0.05,0.1);
  playTone(750,'sine',0.04,0.08,0.04);
}
function sfxDogBurned(){
  playNoise(0.35, 0.2);
  playTone(150,'sawtooth',0.4, 0.25, 0);
  playTone(90,'sawtooth',0.45, 0.2, 0.15);
}
// Map 7 — Memory Match
function sfxMemoryFlip(){
  if(sfxMuted) return;
  playTone(800,'sine',0.06,0.12); playTone(1200,'sine',0.04,0.08,0.04);
}
function sfxMemoryMatch(){
  if(sfxMuted) return;
  playTone(660,'sine',0.1,0.25); playTone(880,'sine',0.1,0.25,0.08); playTone(1100,'sine',0.12,0.3,0.16);
}
function sfxMemoryMiss(){
  if(sfxMuted) return;
  playTone(200,'triangle',0.15,0.2); playTone(150,'triangle',0.15,0.18,0.08);
}
// Map 8 — Bubble Pop
function sfxBubbleShoot(){
  if(sfxMuted) return;
  playTone(400,'sine',0.05,0.12); playTone(600,'sine',0.04,0.1,0.03);
}
function sfxBubblePop(){
  if(sfxMuted) return;
  playNoise(0.08,0.15); playTone(500,'sine',0.06,0.2); playTone(700,'sine',0.05,0.15,0.04);
}
function sfxBubbleBounce(){
  if(sfxMuted) return;
  playTone(300,'sine',0.03,0.08);
}
function sfxBubblePressure(){
  if(sfxMuted) return;
  playTone(150,'sawtooth',0.1,0.15); playTone(120,'sawtooth',0.08,0.12,0.06);
}
// Map 9 — Stack Tower
function sfxStackDrop(){
  if(sfxMuted) return;
  playTone(180,'triangle',0.12,0.3); playNoise(0.08,0.1);
}
function sfxStackPerfect(){
  if(sfxMuted) return;
  playTone(880,'sine',0.08,0.3); playTone(1100,'sine',0.08,0.3,0.06); playTone(1320,'sine',0.1,0.35,0.12);
}
function sfxStackCut(){
  if(sfxMuted) return;
  playTone(200,'sawtooth',0.08,0.2); playNoise(0.06,0.12);
}
// Map 10 — Boss Battle
function sfxBossShoot(){
  if(sfxMuted) return;
  playTone(600,'square',0.03,0.1); playTone(900,'square',0.02,0.08,0.02);
}
function sfxBossHit(){
  if(sfxMuted) return;
  playTone(300,'sawtooth',0.08,0.25); playNoise(0.05,0.1);
}
function sfxVenomFire(){
  if(sfxMuted) return;
  playTone(100,'sawtooth',0.12,0.2); playTone(80,'sawtooth',0.1,0.18,0.06);
}
// Map 11 — Animal Catch
function sfxCatchGood(){
  if(sfxMuted) return;
  playTone(660,'sine',0.08,0.25); playTone(880,'sine',0.08,0.25,0.06);
}
function sfxCatchMiss(){
  if(sfxMuted) return;
  playNoise(0.06,0.08);
}
// Map 12 — Color Flood
function sfxFloodMove(){
  if(sfxMuted) return;
  playTone(440,'sine',0.04,0.15); playTone(550,'sine',0.03,0.1,0.03);
}
function sfxFloodBig(){
  if(sfxMuted) return;
  playTone(330,'triangle',0.1,0.25); playTone(440,'triangle',0.1,0.25,0.06); playTone(550,'triangle',0.12,0.3,0.12);
}
// Map 13 — Survival Arena
function sfxWaveStart(){
  if(sfxMuted) return;
  playTone(440,'triangle',0.15,0.3,0); playTone(550,'triangle',0.15,0.3,0.1); playTone(660,'sine',0.2,0.35,0.2);
}
function sfxArenaKill(){
  if(sfxMuted) return;
  playTone(500,'square',0.05,0.18); playNoise(0.06,0.1);
}
function sfxInvincEnd(){
  if(sfxMuted) return;
  playTone(800,'sine',0.06,0.15);
}
// Maps 14-16 SFX
function sfxSnakeEat(){ if(sfxMuted)return; playTone(500,'sine',0.06,0.2); playTone(700,'sine',0.05,0.18,0.04); }
function sfxSnakeSpecial(){ if(sfxMuted)return; playTone(660,'sine',0.08,0.25); playTone(880,'sine',0.08,0.25,0.06); playTone(1100,'sine',0.1,0.3,0.12); }
function sfxSnakeDie(){ if(sfxMuted)return; playTone(200,'triangle',0.2,0.3); playTone(150,'triangle',0.2,0.25,0.12); }
function sfxSnakeTurn(){ if(sfxMuted)return; playTone(350,'sine',0.02,0.06); }
function sfxBallPaddle(){ if(sfxMuted)return; playTone(300,'sine',0.06,0.2); }
function sfxBallBrick(){ if(sfxMuted)return; playTone(500,'square',0.04,0.18); playNoise(0.04,0.08); }
function sfxBrickBreak(){ if(sfxMuted)return; playNoise(0.1,0.18); playTone(400,'sawtooth',0.08,0.2); }
function sfxBallWall(){ if(sfxMuted)return; playTone(200,'sine',0.03,0.1); }
function sfxPowerUp(){ if(sfxMuted)return; playTone(660,'sine',0.08,0.25); playTone(880,'sine',0.08,0.28,0.07); }
function sfxRunnerJump(){ if(sfxMuted)return; playTone(400,'sine',0.08,0.2); playTone(600,'sine',0.06,0.15,0.04); }
function sfxRunnerDoubleJump(){ if(sfxMuted)return; playTone(500,'sine',0.06,0.18); playTone(800,'sine',0.08,0.2,0.04); playTone(1000,'sine',0.06,0.15,0.08); }
function sfxRunnerLand(){ if(sfxMuted)return; playNoise(0.04,0.1); playTone(120,'triangle',0.06,0.15); }
function sfxRunnerStar(){ if(sfxMuted)return; playTone(880,'sine',0.06,0.2); playTone(1100,'sine',0.06,0.22,0.05); }
function sfxSpaceShoot(){if(sfxMuted)return; playTone(880,'square',0.1,0.3); }
function sfxSpaceHit(){if(sfxMuted)return; playTone(220,'sawtooth',0.15,0.4); playTone(110,'sawtooth',0.1,0.3,0.05); }
function sfxSpaceAlienFire(){if(sfxMuted)return; playTone(440,'square',0.12,0.25); playTone(330,'square',0.1,0.2,0.06); }
function sfxSpaceDogHit(){if(sfxMuted)return; playNoise(0.2,0.5); playTone(150,'sawtooth',0.3,0.4,0.05); }
function sfxRhythmSpawn(){if(sfxMuted)return; playTone(523,'sine',0.08,0.2); }
function sfxRhythmPerfect(){if(sfxMuted)return; playTone(1047,'sine',0.1,0.4); playTone(1319,'sine',0.1,0.35,0.1); playTone(1568,'sine',0.15,0.3,0.2); }
function sfxRhythmGood(){if(sfxMuted)return; playTone(660,'sine',0.1,0.3); playTone(784,'sine',0.1,0.25,0.1); }
function sfxRhythmMiss(){if(sfxMuted)return; playNoise(0.15,0.3); }
function sfxMazeStep(){if(sfxMuted)return; playTone(330,'square',0.05,0.15); }
function sfxMazeWall(){if(sfxMuted)return; playNoise(0.08,0.3); }
function sfxMazeSolve(){if(sfxMuted)return; playTone(523,'sine',0.1,0.4); playTone(659,'sine',0.1,0.4,0.12); playTone(784,'sine',0.1,0.4,0.24); playTone(1047,'sine',0.3,0.5,0.36); }
function sfxMegaBossRoar(){if(sfxMuted)return; playTone(55,'sawtooth',0.4,0.6); playTone(41,'sawtooth',0.4,0.5,0.1); playNoise(0.5,0.4); }
function sfxMegaShoot(){if(sfxMuted)return; playTone(1200,'square',0.08,0.3); playTone(800,'square',0.06,0.2,0.05); }
function sfxMegaLaser(){if(sfxMuted)return; playNoise(0.3,0.5); playTone(200,'sawtooth',0.3,0.4,0.05); }
function sfxMegaPhaseChange(){if(sfxMuted)return; playTone(110,'square',0.2,0.5); playTone(146,'square',0.2,0.45,0.15); playTone(165,'square',0.2,0.4,0.3); playNoise(0.5,0.4); }

// Lồng tiếng câu khen bằng file audio thu sẵn (sounds/) — mỗi cấp khen 1 file .wav riêng,
// khớp thứ tự với mảng PRAISE. Được preload 1 lần khi trang tải xong.
const PRAISE_SOUND_FILES = [
  'not_bad.wav','cool.wav','good.wav','great.wav','impressive.wav',
  'amazing.wav','perfect.wav','spectacular.wav','unreal.wav','legendary.wav','godlike.wav'
];
const PRAISE_AUDIO = PRAISE_SOUND_FILES.map(f=>{
  const a = new Audio('sounds/'+f);
  a.preload = 'auto';
  return a;
});

function speakPraise(level) {
  if (typeof sfxMuted !== 'undefined' && sfxMuted) return;
  try {
    const i = pIdx(level);
    const audio = PRAISE_AUDIO[i];
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 1;
    audio.play().catch(()=>{}); // trình duyệt có thể chặn autoplay trước tương tác đầu tiên — bỏ qua lỗi
    // Ở 2 cấp cao nhất (Legendary/Godlike), hô lại lần 2 dồn dập hơn cho khí thế
    if (i>=8) {
      setTimeout(()=>{
        const a2 = PRAISE_AUDIO[i];
        a2.currentTime = 0;
        a2.volume = 0.85;
        a2.play().catch(()=>{});
      }, 300);
    }
  } catch(e) {}
}
