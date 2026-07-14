// ═══════════════════════════════════════════════════════════════
// js/i18n.js — ĐA NGÔN NGỮ (vi · en · ko · ja · zh · es)
// - t(key, ...args): lấy chuỗi theo ngôn ngữ hiện tại; {0},{1}... là tham số.
// - Phần tử HTML gắn data-i18n / data-i18n-title / data-i18n-html sẽ được
//   applyI18nDom() thay chữ tự động khi đổi ngôn ngữ.
// - Ngôn ngữ lưu ở localStorage 'chromablast_lang'; lần đầu tự chọn theo máy.
// - Thiếu key ở ngôn ngữ nào → tự rơi về tiếng Anh, rồi tiếng Việt (gốc).
// Nạp ĐẦU TIÊN (trước mọi file js khác) để t() sẵn sàng ở khắp nơi.
// ═══════════════════════════════════════════════════════════════

const I18N = {

vi: {
  langName:'Tiếng Việt',
  // Màn hình đăng nhập
  authSub:'🔐 Đăng nhập để bắt đầu chơi',
  guestPlay:'▶ CHƠI NGAY (KHÔNG CẦN ĐĂNG NHẬP)',
  orDivider:'— hoặc —',
  lblUsername:'Tên đăng nhập', lblPassword:'Mật khẩu', lblPassword2:'Nhập lại mật khẩu',
  btnLogin:'ĐĂNG NHẬP', btnRegister:'ĐĂNG KÝ',
  noAccount:'Chưa có tài khoản?', linkRegister:'Đăng ký ngay',
  hasAccount:'Đã có tài khoản?', linkLogin:'Đăng nhập',
  errFillAll:'Vui lòng nhập đầy đủ thông tin.',
  errWrongLogin:'Sai tên đăng nhập hoặc mật khẩu.',
  errUserShort:'Tên đăng nhập cần tối thiểu 3 ký tự.',
  errPassShort:'Mật khẩu cần tối thiểu 4 ký tự.',
  errPassMismatch:'Mật khẩu nhập lại không khớp.',
  errUserExists:'Tên đăng nhập đã tồn tại.',
  // Màn hình bắt đầu
  startSubtitle:'🎮 Phá màu · Khám phá · Chinh phục',
  startBtn:'▶ BẮT ĐẦU CHƠI', startHint:'Chạm hoặc nhấp để bắt đầu',
  // HUD
  scoreLabel:'ĐIỂM SỐ', bestLabel:'Kỷ lục: {0}', levelLabel:'Cấp độ {0}',
  badgeNormal:'BÌNH THƯỜNG',
  burstCount:'Chuỗi nổ: {0}/3', progress:'Tiến độ: {0}/{1}đ',
  unlockReady:'🔥 Mở khóa sẵn sàng!', unlockWaiting:'🔓 Map ẩn đang chờ — nhấn để chơi!',
  passReady:'🎉 Sẵn sàng qua màn — Level {0}!', passProgress:'Level {0}: {1}/{2}đ',
  hintDefault:'Chạm khối → ghost hiện · Di ngón → ghost bám · Thả trên ô → đặt · Thả vùng trống → xoay',
  levelUp:'🎉 LÊN CẤP {0}!',
  // Tạm dừng / hết lượt
  pauseTitle:'⏸ TẠM DỪNG', resumeBtn:'▶ Tiếp tục',
  gameOverTitle:'🎮 Hết lượt!', restartBtn:'Chơi lại', finalScore:'Điểm: {0}',
  // Tiêu đề / nút panel
  accountTitle:'👤 Tài khoản', leaderboardTitle:'🏆 Bảng xếp hạng',
  lbSub:'Điểm cao nhất của người chơi trên thiết bị này.',
  lbEmpty:'Chưa có điểm nào — chơi để lên bảng đầu tiên!',
  lbMyRank:'Hạng của bạn: #{0} / {1} — {2} điểm',
  lbNoRank:'Bạn chưa có điểm nào trên bảng xếp hạng — chơi 1 ván để lên bảng!',
  dailyTitle:'🎁 Điểm danh hàng ngày',
  hiddenMapTitle:'🗺️ Map ẩn đã chơi qua',
  roundGuideTitle:'📖 Hướng dẫn cơ chế vòng của bạn',
  mapHelpTitle:'📖 Cách chơi', helpTitle:'📖 Hướng dẫn chơi',
  logoutBtn:'🚪 Đăng xuất',
  // Tooltip nút
  ttHiddenMap:'Chọn map ẩn đã chơi qua', ttDaily:'Điểm danh nhận quà',
  ttLeaderboard:'Bảng xếp hạng', ttRoundGuide:'Hướng dẫn cơ chế vòng hiện tại',
  ttAdventure:'Chế độ Adventure', ttAccount:'Tài khoản', ttMute:'Tắt/bật âm thanh',
  ttPause:'Tạm dừng', ttHelp:'Hướng dẫn chơi', ttMapHelp:'Cách chơi map ẩn này',
  // Khác
  langPickLabel:'🌐 Ngôn ngữ',
},

en: {
  langName:'English',
  authSub:'🔐 Sign in to start playing',
  guestPlay:'▶ PLAY NOW (NO SIGN-IN NEEDED)',
  orDivider:'— or —',
  lblUsername:'Username', lblPassword:'Password', lblPassword2:'Confirm password',
  btnLogin:'SIGN IN', btnRegister:'SIGN UP',
  noAccount:'No account yet?', linkRegister:'Sign up now',
  hasAccount:'Already have an account?', linkLogin:'Sign in',
  errFillAll:'Please fill in all fields.',
  errWrongLogin:'Wrong username or password.',
  errUserShort:'Username must be at least 3 characters.',
  errPassShort:'Password must be at least 4 characters.',
  errPassMismatch:'Passwords do not match.',
  errUserExists:'Username already exists.',
  startSubtitle:'🎮 Blast colors · Explore · Conquer',
  startBtn:'▶ START GAME', startHint:'Tap or click to begin',
  scoreLabel:'SCORE', bestLabel:'Best: {0}', levelLabel:'Level {0}',
  badgeNormal:'NORMAL',
  burstCount:'Blast chain: {0}/3', progress:'Progress: {0}/{1} pts',
  unlockReady:'🔥 Unlock ready!', unlockWaiting:'🔓 Hidden map waiting — tap to play!',
  passReady:'🎉 Ready to clear — Level {0}!', passProgress:'Level {0}: {1}/{2} pts',
  hintDefault:'Tap a piece → ghost appears · Drag → ghost follows · Drop on board → place · Drop on empty area → rotate',
  levelUp:'🎉 LEVEL UP {0}!',
  pauseTitle:'⏸ PAUSED', resumeBtn:'▶ Resume',
  gameOverTitle:'🎮 Out of moves!', restartBtn:'Play again', finalScore:'Score: {0}',
  accountTitle:'👤 Account', leaderboardTitle:'🏆 Leaderboard',
  lbSub:'Top scores of players on this device.',
  lbEmpty:'No scores yet — play to be the first on the board!',
  lbMyRank:'Your rank: #{0} / {1} — {2} pts',
  lbNoRank:'You have no score on the board yet — play a round to get listed!',
  dailyTitle:'🎁 Daily check-in',
  hiddenMapTitle:'🗺️ Hidden maps you cleared',
  roundGuideTitle:'📖 Your round mechanics guide',
  mapHelpTitle:'📖 How to play', helpTitle:'📖 How to play',
  logoutBtn:'🚪 Sign out',
  ttHiddenMap:'Replay cleared hidden maps', ttDaily:'Daily check-in rewards',
  ttLeaderboard:'Leaderboard', ttRoundGuide:'Current round mechanics guide',
  ttAdventure:'Adventure mode', ttAccount:'Account', ttMute:'Toggle sound',
  ttPause:'Pause', ttHelp:'How to play', ttMapHelp:'How to play this hidden map',
  langPickLabel:'🌐 Language',
},

ko: {
  langName:'한국어',
  authSub:'🔐 로그인하고 게임을 시작하세요',
  guestPlay:'▶ 바로 플레이 (로그인 불필요)',
  orDivider:'— 또는 —',
  lblUsername:'아이디', lblPassword:'비밀번호', lblPassword2:'비밀번호 확인',
  btnLogin:'로그인', btnRegister:'회원가입',
  noAccount:'계정이 없으신가요?', linkRegister:'지금 가입하기',
  hasAccount:'이미 계정이 있으신가요?', linkLogin:'로그인',
  errFillAll:'모든 항목을 입력해 주세요.',
  errWrongLogin:'아이디 또는 비밀번호가 올바르지 않습니다.',
  errUserShort:'아이디는 3자 이상이어야 합니다.',
  errPassShort:'비밀번호는 4자 이상이어야 합니다.',
  errPassMismatch:'비밀번호가 일치하지 않습니다.',
  errUserExists:'이미 존재하는 아이디입니다.',
  startSubtitle:'🎮 컬러 블라스트 · 탐험 · 정복',
  startBtn:'▶ 게임 시작', startHint:'화면을 탭하거나 클릭하세요',
  scoreLabel:'점수', bestLabel:'최고 기록: {0}', levelLabel:'레벨 {0}',
  badgeNormal:'일반 모드',
  burstCount:'연쇄 폭발: {0}/3', progress:'진행도: {0}/{1}점',
  unlockReady:'🔥 잠금 해제 준비 완료!', unlockWaiting:'🔓 히든 맵 대기 중 — 탭해서 플레이!',
  passReady:'🎉 스테이지 클리어 준비 — 레벨 {0}!', passProgress:'레벨 {0}: {1}/{2}점',
  hintDefault:'블록 탭 → 고스트 표시 · 드래그 → 고스트 이동 · 보드에 놓기 → 배치 · 빈 곳에 놓기 → 회전',
  levelUp:'🎉 레벨 업 {0}!',
  pauseTitle:'⏸ 일시 정지', resumeBtn:'▶ 계속하기',
  gameOverTitle:'🎮 더 이상 둘 수 없어요!', restartBtn:'다시 하기', finalScore:'점수: {0}',
  accountTitle:'👤 계정', leaderboardTitle:'🏆 리더보드',
  lbSub:'이 기기 플레이어들의 최고 점수입니다.',
  lbEmpty:'아직 점수가 없어요 — 첫 번째 기록을 세워 보세요!',
  lbMyRank:'내 순위: #{0} / {1} — {2}점',
  lbNoRank:'아직 리더보드에 점수가 없어요 — 한 판 플레이해 보세요!',
  dailyTitle:'🎁 일일 출석 체크',
  hiddenMapTitle:'🗺️ 클리어한 히든 맵',
  roundGuideTitle:'📖 라운드 기믹 가이드',
  mapHelpTitle:'📖 플레이 방법', helpTitle:'📖 플레이 방법',
  logoutBtn:'🚪 로그아웃',
  ttHiddenMap:'클리어한 히든 맵 다시 플레이', ttDaily:'출석 체크 보상',
  ttLeaderboard:'리더보드', ttRoundGuide:'현재 라운드 기믹 가이드',
  ttAdventure:'어드벤처 모드', ttAccount:'계정', ttMute:'소리 켜기/끄기',
  ttPause:'일시 정지', ttHelp:'플레이 방법', ttMapHelp:'이 히든 맵 플레이 방법',
  langPickLabel:'🌐 언어',
},

ja: {
  langName:'日本語',
  authSub:'🔐 ログインしてプレイ開始',
  guestPlay:'▶ 今すぐプレイ（ログイン不要）',
  orDivider:'— または —',
  lblUsername:'ユーザー名', lblPassword:'パスワード', lblPassword2:'パスワード（確認）',
  btnLogin:'ログイン', btnRegister:'新規登録',
  noAccount:'アカウントをお持ちでないですか？', linkRegister:'今すぐ登録',
  hasAccount:'すでにアカウントをお持ちですか？', linkLogin:'ログイン',
  errFillAll:'すべての項目を入力してください。',
  errWrongLogin:'ユーザー名またはパスワードが違います。',
  errUserShort:'ユーザー名は3文字以上で入力してください。',
  errPassShort:'パスワードは4文字以上で入力してください。',
  errPassMismatch:'パスワードが一致しません。',
  errUserExists:'このユーザー名は既に使われています。',
  startSubtitle:'🎮 カラーブラスト · 探検 · 制覇',
  startBtn:'▶ ゲームスタート', startHint:'タップまたはクリックで開始',
  scoreLabel:'スコア', bestLabel:'ベスト: {0}', levelLabel:'レベル {0}',
  badgeNormal:'ノーマル',
  burstCount:'連鎖: {0}/3', progress:'進行度: {0}/{1}点',
  unlockReady:'🔥 アンロック準備完了！', unlockWaiting:'🔓 隠しマップ待機中 — タップしてプレイ！',
  passReady:'🎉 ステージクリア目前 — レベル {0}！', passProgress:'レベル {0}: {1}/{2}点',
  hintDefault:'ブロックをタップ → ゴースト表示 · ドラッグ → ゴースト追従 · マスに置く → 配置 · 空きへ離す → 回転',
  levelUp:'🎉 レベルアップ {0}！',
  pauseTitle:'⏸ 一時停止', resumeBtn:'▶ 再開',
  gameOverTitle:'🎮 手詰まり！', restartBtn:'もう一度', finalScore:'スコア: {0}',
  accountTitle:'👤 アカウント', leaderboardTitle:'🏆 ランキング',
  lbSub:'この端末のプレイヤーのハイスコアです。',
  lbEmpty:'まだ記録がありません — 最初の記録を作ろう！',
  lbMyRank:'あなたの順位: #{0} / {1} — {2}点',
  lbNoRank:'まだランキングに記録がありません — 1回プレイしてみよう！',
  dailyTitle:'🎁 デイリーログインボーナス',
  hiddenMapTitle:'🗺️ クリアした隠しマップ',
  roundGuideTitle:'📖 ラウンドギミックガイド',
  mapHelpTitle:'📖 遊び方', helpTitle:'📖 遊び方',
  logoutBtn:'🚪 ログアウト',
  ttHiddenMap:'クリア済み隠しマップを再プレイ', ttDaily:'ログインボーナス',
  ttLeaderboard:'ランキング', ttRoundGuide:'現在のラウンドギミックガイド',
  ttAdventure:'アドベンチャーモード', ttAccount:'アカウント', ttMute:'サウンド切替',
  ttPause:'一時停止', ttHelp:'遊び方', ttMapHelp:'この隠しマップの遊び方',
  langPickLabel:'🌐 言語',
},

zh: {
  langName:'中文',
  authSub:'🔐 登录后开始游戏',
  guestPlay:'▶ 立即游玩（无需登录）',
  orDivider:'— 或 —',
  lblUsername:'用户名', lblPassword:'密码', lblPassword2:'确认密码',
  btnLogin:'登录', btnRegister:'注册',
  noAccount:'还没有账号？', linkRegister:'立即注册',
  hasAccount:'已有账号？', linkLogin:'登录',
  errFillAll:'请填写所有信息。',
  errWrongLogin:'用户名或密码错误。',
  errUserShort:'用户名至少需要3个字符。',
  errPassShort:'密码至少需要4个字符。',
  errPassMismatch:'两次输入的密码不一致。',
  errUserExists:'该用户名已存在。',
  startSubtitle:'🎮 消除色块 · 探索 · 征服',
  startBtn:'▶ 开始游戏', startHint:'点击屏幕开始',
  scoreLabel:'得分', bestLabel:'最高纪录: {0}', levelLabel:'等级 {0}',
  badgeNormal:'普通模式',
  burstCount:'连爆: {0}/3', progress:'进度: {0}/{1}分',
  unlockReady:'🔥 解锁就绪！', unlockWaiting:'🔓 隐藏关卡等待中 — 点击开始！',
  passReady:'🎉 即将过关 — 等级 {0}！', passProgress:'等级 {0}: {1}/{2}分',
  hintDefault:'点击方块 → 显示虚影 · 拖动 → 虚影跟随 · 放到棋盘 → 放置 · 放到空白处 → 旋转',
  levelUp:'🎉 升级到 {0} 级！',
  pauseTitle:'⏸ 暂停', resumeBtn:'▶ 继续',
  gameOverTitle:'🎮 无路可走！', restartBtn:'再来一局', finalScore:'得分: {0}',
  accountTitle:'👤 账号', leaderboardTitle:'🏆 排行榜',
  lbSub:'本设备玩家的最高分。',
  lbEmpty:'暂无记录 — 快来创造第一个纪录吧！',
  lbMyRank:'我的排名: #{0} / {1} — {2}分',
  lbNoRank:'你还没有上榜 — 玩一局即可上榜！',
  dailyTitle:'🎁 每日签到',
  hiddenMapTitle:'🗺️ 已通关的隐藏关卡',
  roundGuideTitle:'📖 回合机制指南',
  mapHelpTitle:'📖 玩法说明', helpTitle:'📖 玩法说明',
  logoutBtn:'🚪 退出登录',
  ttHiddenMap:'重玩已通关的隐藏关卡', ttDaily:'每日签到奖励',
  ttLeaderboard:'排行榜', ttRoundGuide:'当前回合机制指南',
  ttAdventure:'冒险模式', ttAccount:'账号', ttMute:'开/关声音',
  ttPause:'暂停', ttHelp:'玩法说明', ttMapHelp:'本隐藏关卡玩法',
  langPickLabel:'🌐 语言',
},

es: {
  langName:'Español',
  authSub:'🔐 Inicia sesión para jugar',
  guestPlay:'▶ JUGAR AHORA (SIN CUENTA)',
  orDivider:'— o —',
  lblUsername:'Usuario', lblPassword:'Contraseña', lblPassword2:'Confirmar contraseña',
  btnLogin:'INICIAR SESIÓN', btnRegister:'REGISTRARSE',
  noAccount:'¿No tienes cuenta?', linkRegister:'Regístrate ahora',
  hasAccount:'¿Ya tienes cuenta?', linkLogin:'Inicia sesión',
  errFillAll:'Por favor completa todos los campos.',
  errWrongLogin:'Usuario o contraseña incorrectos.',
  errUserShort:'El usuario debe tener al menos 3 caracteres.',
  errPassShort:'La contraseña debe tener al menos 4 caracteres.',
  errPassMismatch:'Las contraseñas no coinciden.',
  errUserExists:'El usuario ya existe.',
  startSubtitle:'🎮 Explota colores · Explora · Conquista',
  startBtn:'▶ EMPEZAR A JUGAR', startHint:'Toca o haz clic para empezar',
  scoreLabel:'PUNTOS', bestLabel:'Récord: {0}', levelLabel:'Nivel {0}',
  badgeNormal:'NORMAL',
  burstCount:'Cadena: {0}/3', progress:'Progreso: {0}/{1} pts',
  unlockReady:'🔥 ¡Desbloqueo listo!', unlockWaiting:'🔓 Mapa oculto esperando — ¡toca para jugar!',
  passReady:'🎉 ¡Listo para pasar — Nivel {0}!', passProgress:'Nivel {0}: {1}/{2} pts',
  hintDefault:'Toca una pieza → aparece la guía · Arrastra → la guía sigue · Suelta en el tablero → colocar · Suelta en zona vacía → rotar',
  levelUp:'🎉 ¡SUBISTE AL NIVEL {0}!',
  pauseTitle:'⏸ PAUSA', resumeBtn:'▶ Continuar',
  gameOverTitle:'🎮 ¡Sin movimientos!', restartBtn:'Jugar de nuevo', finalScore:'Puntos: {0}',
  accountTitle:'👤 Cuenta', leaderboardTitle:'🏆 Clasificación',
  lbSub:'Mejores puntuaciones de los jugadores en este dispositivo.',
  lbEmpty:'Aún no hay puntuaciones — ¡juega y sé el primero!',
  lbMyRank:'Tu puesto: #{0} / {1} — {2} pts',
  lbNoRank:'Aún no tienes puntuación — ¡juega una partida para entrar!',
  dailyTitle:'🎁 Recompensa diaria',
  hiddenMapTitle:'🗺️ Mapas ocultos superados',
  roundGuideTitle:'📖 Guía de mecánicas de ronda',
  mapHelpTitle:'📖 Cómo jugar', helpTitle:'📖 Cómo jugar',
  logoutBtn:'🚪 Cerrar sesión',
  ttHiddenMap:'Rejugar mapas ocultos superados', ttDaily:'Recompensa diaria',
  ttLeaderboard:'Clasificación', ttRoundGuide:'Guía de mecánicas de la ronda actual',
  ttAdventure:'Modo aventura', ttAccount:'Cuenta', ttMute:'Activar/desactivar sonido',
  ttPause:'Pausa', ttHelp:'Cómo jugar', ttMapHelp:'Cómo jugar este mapa oculto',
  langPickLabel:'🌐 Idioma',
},

};

const I18N_LANGS = ['vi','en','ko','ja','zh','es'];
let currentLang = (function(){
  try{
    const saved = localStorage.getItem('chromablast_lang');
    if(saved && I18N[saved]) return saved;
    const nav = (navigator.language||'vi').toLowerCase();
    for(const l of I18N_LANGS){ if(nav.startsWith(l)) return l; }
  }catch(e){}
  return 'vi';
})();

// Lấy chuỗi dịch; {0},{1}... thay bằng tham số. Thiếu key → en → vi.
function t(key){
  const args = Array.prototype.slice.call(arguments, 1);
  let s = (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || I18N.vi[key] || key;
  args.forEach((a,i)=>{ s = s.split('{'+i+'}').join(a); });
  return s;
}

// Quét DOM và thay chữ theo ngôn ngữ hiện tại.
function applyI18nDom(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{ el.title = t(el.dataset.i18nTitle); });
  document.documentElement.lang = currentLang;
  // các nhãn động đang hiển thị
  const badge=document.getElementById('mode-badge');
  if(badge && !badge.classList.contains('secret')) badge.textContent = t('badgeNormal');
  if(typeof updateScoreUI==='function') try{ updateScoreUI(); }catch(e){}
  if(typeof updateBurstCount==='function') try{ updateBurstCount(); }catch(e){}
  const hb=document.getElementById('hint-bar');
  if(hb) hb.textContent = t('hintDefault');
}

function setLang(code){
  if(!I18N[code]) return;
  currentLang = code;
  try{ localStorage.setItem('chromablast_lang', code); }catch(e){}
  applyI18nDom();
  document.querySelectorAll('.lang-pick-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.lang===code);
  });
}

// Dựng hàng nút chọn ngôn ngữ vào phần tử chứa (auth screen + panel tài khoản).
function buildLangPicker(containerId){
  const box=document.getElementById(containerId); if(!box) return;
  box.innerHTML='';
  const FLAGS={vi:'🇻🇳',en:'🇬🇧',ko:'🇰🇷',ja:'🇯🇵',zh:'🇨🇳',es:'🇪🇸'};
  I18N_LANGS.forEach(code=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='lang-pick-btn'+(code===currentLang?' active':'');
    b.dataset.lang=code;
    b.textContent=FLAGS[code]+' '+I18N[code].langName;
    b.addEventListener('click', ()=>{ setLang(code); try{ sfxClick(); }catch(e){} });
    box.appendChild(b);
  });
}

// Tự áp dụng ngay khi tải (script nằm cuối body nên DOM đã sẵn sàng).
applyI18nDom();
buildLangPicker('lang-picker-auth');
buildLangPicker('lang-picker-account');
