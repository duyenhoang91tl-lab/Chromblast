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
  guestPlay:'Chơi Ngay',
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
  startSubtitle:'Phá màu · Combo · Chinh phục',
  startBtn:'BẮT ĐẦU', startHint:'Chạm để bắt đầu',
  // HUD
  scoreLabel:'ĐIỂM SỐ', bestLabel:'Kỷ lục: {0}', levelLabel:'Cấp độ {0}',
  badgeNormal:'BÌNH THƯỜNG',
  burstCount:'Chuỗi nổ: {0}/3', progress:'Tiến độ: {0}/{1}đ',
  unlockReady:'🔥 Mở khóa sẵn sàng!', unlockWaiting:'🔓 Map ẩn đang chờ — nhấn để chơi!',
  passReady:'🎉 Sẵn sàng qua màn — Level {0}!', passProgress:'Level {0}: {1}/{2}đ',
  hintDefault:'',
  levelUp:'🎉 LÊN CẤP {0}!',
  // Tạm dừng / hết lượt
  pauseTitle:'⏸ TẠM DỪNG', resumeBtn:'▶ Tiếp tục',
  gameOverTitle:'Hết lượt!', restartBtn:'Chơi lại', finalScore:'Điểm: {0}',
  // Tiêu đề / nút panel
  accountTitle:'👤 Tài khoản', leaderboardTitle:'🏆 Bảng xếp hạng',
  lbSub:'Điểm cao nhất của người chơi trên thiết bị này.',
  lbSubGlobal:'Điểm solo cao nhất toàn cầu (cần Firebase).',
  lbSubPvp:'Điểm PvP 1v1 online — thắng +30, hòa +5.',
  lbTabLocal:'📱 Thiết bị', lbTabGlobal:'🌐 Toàn cầu', lbTabPvp:'⚔️ PvP', lbTabCaro:'❌⭕ Caro',
  lbSubCaro:'BXH Cờ Caro — danh hiệu, tỷ lệ thắng/thua/hòa.',
  lbLoading:'Đang tải...', lbOfflineGlobal:'Chưa kết nối server — cấu hình Firebase để xem BXH toàn cầu.',
  lbEmpty:'Chưa có điểm nào — chơi để lên bảng đầu tiên!',
  lbMyRank:'Hạng của bạn: #{0} / {1} — {2} điểm',
  lbNoRank:'Bạn chưa có điểm nào trên bảng xếp hạng — chơi 1 ván để lên bảng!',
  dailyTitle:'🎁 Điểm danh hàng ngày',
  hiddenMapTitle:'🗺️ Map ẩn đã chơi qua',
  roundGuideTitle:'Hướng dẫn vòng hiện tại',
  mapHelpTitle:'Cách chơi', helpTitle:'Cách chơi',
  logoutBtn:'🚪 Đăng xuất',
  // Tooltip nút
  ttHiddenMap:'Chọn map ẩn đã chơi qua', ttDaily:'Điểm danh nhận quà',
  ttLeaderboard:'Bảng xếp hạng', ttRoundGuide:'Hướng dẫn cơ chế vòng hiện tại',
  ttAdventure:'Chế độ Adventure', ttAccount:'Tài khoản', ttMute:'Tắt/bật âm thanh',
  ttPause:'Tạm dừng', ttHelp:'Hướng dẫn chơi', ttMapHelp:'Cách chơi map ẩn này',
  // Khác
  langPickLabel:'🌐 Ngôn ngữ',
  ttSettings:'Cài đặt',
  settingsTitle:'Cài đặt',
  setSound:'Âm thanh', setBgm:'Nhạc nền',
  setAccount:'Tài khoản', setLanguage:'Ngôn ngữ', setMap:'Map ẩn', setCup:'Cúp',
  setBricks:'Gạch', ttBricks:'Kho gạch',
  setBoards:'Nền bàn', ttBoards:'Kho nền bàn',
  setSpin:'Vòng quay', spinTitle:'Vòng quay may mắn', ttSpin:'Vòng quay may mắn',
  setMore:'Cài đặt thêm', setHome:'Trang chủ', setReplay:'Chơi lại',
  setMoreTitle:'Cài đặt thêm', setContact:'Liên hệ', setShare:'Chia sẻ bạn bè',
  setTerms:'Điều khoản', setPrivacy:'Chính sách riêng tư', setAbout:'Về chúng tôi',
  setCupTitle:'Thành tích', setAwards:'Huân chương', setHelp:'Hướng dẫn',
  cupHighestCombo:'Combo cao nhất', cupBestScore:'Điểm cao nhất', cupRounds:'Vòng map', cupLoginDays:'Ngày đăng nhập',
  ppProfile:'Hồ sơ', ppEdit:'Đổi tên / kiểu chữ', ppTitle:'🪪 Hồ sơ người chơi',
  ppSub:'Nickname tùy ý · ký tự đặc biệt được phép', ppPreview:'Xem trước',
  ppNickLabel:'Đổi tên', ppRenameFree:'Đổi tên lần 1 miễn phí',
  ppRenameAd:'Đổi tên tiếp theo: xem quảng cáo', ppSaveNick:'✓ Lưu tên',
  ppStyleTitle:'🎨 Màu & kiểu chữ', ppStyleAdHint:'Đổi màu / đậm / nghiêng / font cần xem quảng cáo',
  ppColor:'Màu chữ', ppBold:'Đậm', ppItalic:'Nghiêng', ppFont:'Font chữ',
  ppSaveStyle:'📺 Áp dụng kiểu chữ (xem QC)', ppSaved:'Đã lưu',
  ppStyleSaved:'Đã áp dụng kiểu chữ (đã xem QC)', ppNickShort:'Nhập nickname',
  ppAdFail:'Quảng cáo chưa sẵn sàng — thử lại sau',
  ppLevel:'Cấp', ppMaps:'Map đã qua', ppCaro:'Caro',
  ppCaroWLD:'{0}T/{1}H/{2}Hòa · {3}%',
  ppAvatar:'Avatar', ppAvatarHint:'Chọn thú làm ảnh đại diện',
  caroJoinedRoom:'✓ Đã vào phòng', caroYouLabel:'Bạn',
  caroOppCardTitle:'Hồ sơ đối thủ', caroAddFriend:'🤝 Kết bạn',
  caroFriendAdded:'Đã thêm bạn', caroAlreadyFriend:'Đã là bạn',
  caroFriendNeedId:'Không lấy được ID đối thủ',
  caroWinRateLabel:'Tỷ lệ thắng', caroNoStats:'Chưa có thống kê',
},

en: {
  langName:'English',
  authSub:'🔐 Sign in to start playing',
  guestPlay:'Play Now',
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
  startSubtitle:'Blast colors · Combo · Conquer',
  startBtn:'START', startHint:'Tap to begin',
  scoreLabel:'SCORE', bestLabel:'Best: {0}', levelLabel:'Level {0}',
  badgeNormal:'NORMAL',
  burstCount:'Blast chain: {0}/3', progress:'Progress: {0}/{1} pts',
  unlockReady:'🔥 Unlock ready!', unlockWaiting:'🔓 Hidden map waiting — tap to play!',
  passReady:'🎉 Ready to clear — Level {0}!', passProgress:'Level {0}: {1}/{2} pts',
  hintDefault:'',
  levelUp:'🎉 LEVEL UP {0}!',
  pauseTitle:'⏸ PAUSED', resumeBtn:'▶ Resume',
  gameOverTitle:'Out of moves!', restartBtn:'Play again', finalScore:'Score: {0}',
  accountTitle:'👤 Account', leaderboardTitle:'🏆 Leaderboard',
  lbSub:'Top scores of players on this device.',
  lbSubGlobal:'Global solo high scores (requires Firebase).',
  lbSubPvp:'Online 1v1 PvP points — win +30, draw +5.',
  lbTabLocal:'📱 Device', lbTabGlobal:'🌐 Global', lbTabPvp:'⚔️ PvP', lbTabCaro:'❌⭕ Caro',
  lbSubCaro:'Caro leaderboard — titles, win/loss/draw rates.',
  lbLoading:'Loading...', lbOfflineGlobal:'Server not connected — configure Firebase for global leaderboard.',
  lbEmpty:'No scores yet — play to be the first on the board!',
  lbMyRank:'Your rank: #{0} / {1} — {2} pts',
  lbNoRank:'You have no score on the board yet — play a round to get listed!',
  dailyTitle:'🎁 Daily check-in',
  hiddenMapTitle:'🗺️ Hidden maps you cleared',
  roundGuideTitle:'Round guide',
  mapHelpTitle:'How to play', helpTitle:'How to play',
  logoutBtn:'🚪 Sign out',
  ttHiddenMap:'Replay cleared hidden maps', ttDaily:'Daily check-in rewards',
  ttLeaderboard:'Leaderboard', ttRoundGuide:'Current round mechanics guide',
  ttAdventure:'Adventure mode', ttAccount:'Account', ttMute:'Toggle sound',
  ttPause:'Pause', ttHelp:'How to play', ttMapHelp:'How to play this hidden map',
  langPickLabel:'🌐 Language',
  ttSettings:'Settings',
  settingsTitle:'Settings',
  setSound:'Sound', setBgm:'BGM',
  setAccount:'Account', setLanguage:'Language', setMap:'Hidden maps', setCup:'Cups',
  setBricks:'Bricks', ttBricks:'Brick skins',
  setBoards:'Boards', ttBoards:'Board skins',
  setSpin:'Lucky Spin', spinTitle:'Lucky Spin', ttSpin:'Lucky Spin',
  setMore:'More settings', setHome:'Home', setReplay:'Replay',
  setMoreTitle:'More settings', setContact:'Contact us', setShare:'Share with friends',
  setTerms:'Terms of service', setPrivacy:'Privacy policy', setAbout:'About us',
  setCupTitle:'Achievements', setAwards:'Awards', setHelp:'How to play',
  cupHighestCombo:'Highest combo', cupBestScore:'Best score', cupRounds:'Rounds', cupLoginDays:'Login days',
  ppProfile:'Profile', ppEdit:'Edit name / style', ppTitle:'🪪 Player profile',
  ppSub:'Any nickname · special characters allowed', ppPreview:'Preview',
  ppNickLabel:'Rename', ppRenameFree:'First rename is free',
  ppRenameAd:'Next rename: watch an ad', ppSaveNick:'✓ Save name',
  ppStyleTitle:'🎨 Color & style', ppStyleAdHint:'Color / bold / italic / font needs an ad',
  ppColor:'Text color', ppBold:'Bold', ppItalic:'Italic', ppFont:'Font',
  ppSaveStyle:'📺 Apply style (watch ad)', ppSaved:'Saved',
  ppStyleSaved:'Style applied (ad watched)', ppNickShort:'Enter a nickname',
  ppAdFail:'Ad not ready — try again later',
  ppLevel:'Level', ppMaps:'Maps cleared', ppCaro:'Caro',
  ppCaroWLD:'{0}W/{1}L/{2}D · {3}%',
  ppAvatar:'Avatar', ppAvatarHint:'Pick an animal avatar',
  caroJoinedRoom:'✓ Joined room', caroYouLabel:'You',
  caroOppCardTitle:'Opponent profile', caroAddFriend:'🤝 Add friend',
  caroFriendAdded:'Friend added', caroAlreadyFriend:'Already friends',
  caroFriendNeedId:'Cannot get opponent id',
  caroWinRateLabel:'Win rate', caroNoStats:'No stats yet',
},

ko: {
  langName:'한국어',
  authSub:'🔐 로그인하고 게임을 시작하세요',
  guestPlay:'지금 플레이',
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
  hintDefault:'',
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
  ttSettings:'설정',
  settingsTitle:'설정',
  setSound:'사운드', setBgm:'BGM',
  setAccount:'계정', setLanguage:'언어', setMap:'히든 맵', setCup:'컵',
  setBricks:'블록 스킨', ttBricks:'블록 스킨',
  setBoards:'보드 스킨', ttBoards:'보드 스킨',
  setSpin:'럭키 스핀', spinTitle:'럭키 스핀', ttSpin:'럭키 스핀',
  setMore:'추가 설정', setHome:'홈', setReplay:'다시 하기',
  setMoreTitle:'추가 설정', setContact:'문의하기', setShare:'친구에게 공유',
  setTerms:'이용약관', setPrivacy:'개인정보 처리방침', setAbout:'정보',
  setCupTitle:'업적', setAwards:'메달', setHelp:'플레이 방법',
  cupHighestCombo:'최고 콤보', cupBestScore:'최고 점수', cupRounds:'라운드', cupLoginDays:'출석 일수',
  ppProfile:'프로필', ppEdit:'이름 / 스타일 변경', ppTitle:'🪪 플레이어 프로필',
  ppSub:'원하는 닉네임 · 특수문자 허용', ppPreview:'미리보기',
  ppNickLabel:'이름 변경', ppRenameFree:'첫 이름 변경은 무료',
  ppRenameAd:'다음 변경: 광고 시청', ppSaveNick:'✓ 이름 저장',
  ppStyleTitle:'🎨 색상 & 스타일', ppStyleAdHint:'색상 / 굵게 / 기울임 / 폰트는 광고 필요',
  ppColor:'글자 색', ppBold:'굵게', ppItalic:'기울임', ppFont:'폰트',
  ppSaveStyle:'📺 스타일 적용 (광고)', ppSaved:'저장됨',
  ppStyleSaved:'스타일 적용됨 (광고 시청)', ppNickShort:'닉네임을 입력하세요',
  ppAdFail:'광고를 불러올 수 없습니다 — 잠시 후 다시 시도',
  ppLevel:'레벨', ppMaps:'클리어 맵', ppCaro:'캐로',
  ppCaroWLD:'{0}승/{1}패/{2}무 · {3}%',
  ppAvatar:'아바타', ppAvatarHint:'동물 아바타를 선택하세요',
  caroJoinedRoom:'✓ 방에 입장했습니다', caroYouLabel:'나',
  caroOppCardTitle:'상대 프로필', caroAddFriend:'🤝 친구 추가',
  caroFriendAdded:'친구 추가됨', caroAlreadyFriend:'이미 친구',
  caroFriendNeedId:'상대 ID를 가져올 수 없음',
  caroWinRateLabel:'승률', caroNoStats:'통계 없음',
},

ja: {
  langName:'日本語',
  authSub:'🔐 ログインしてプレイ開始',
  guestPlay:'今すぐプレイ',
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
  hintDefault:'',
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
  ttSettings:'設定',
  settingsTitle:'設定',
  setSound:'サウンド', setBgm:'BGM',
  setAccount:'アカウント', setLanguage:'言語', setMap:'隠しマップ', setCup:'カップ',
  setBricks:'ブロック', ttBricks:'ブロックスキン',
  setBoards:'ボード', ttBoards:'ボードスキン',
  setSpin:'ラッキースピン', spinTitle:'ラッキースピン', ttSpin:'ラッキースピン',
  setMore:'その他の設定', setHome:'ホーム', setReplay:'もう一度',
  setMoreTitle:'その他の設定', setContact:'お問い合わせ', setShare:'友達にシェア',
  setTerms:'利用規約', setPrivacy:'プライバシー', setAbout:'このアプリについて',
  setCupTitle:'実績', setAwards:'表彰', setHelp:'遊び方',
  cupHighestCombo:'最高コンボ', cupBestScore:'最高スコア', cupRounds:'ラウンド', cupLoginDays:'ログイン日数',
  ppProfile:'プロフィール', ppEdit:'名前 / スタイル変更', ppTitle:'🪪 プレイヤープロフィール',
  ppSub:'好きなニックネーム · 特殊文字OK', ppPreview:'プレビュー',
  ppNickLabel:'名前変更', ppRenameFree:'初回の名前変更は無料',
  ppRenameAd:'次回変更: 広告視聴', ppSaveNick:'✓ 名前を保存',
  ppStyleTitle:'🎨 色 & スタイル', ppStyleAdHint:'色 / 太字 / 斜体 / フォントは広告が必要',
  ppColor:'文字色', ppBold:'太字', ppItalic:'斜体', ppFont:'フォント',
  ppSaveStyle:'📺 スタイル適用（広告）', ppSaved:'保存しました',
  ppStyleSaved:'スタイルを適用しました（広告視聴済み）', ppNickShort:'ニックネームを入力',
  ppAdFail:'広告の準備ができていません — 後でもう一度',
  ppLevel:'レベル', ppMaps:'クリアマップ', ppCaro:'五目並べ',
  ppCaroWLD:'{0}勝/{1}敗/{2}分 · {3}%',
  ppAvatar:'アバター', ppAvatarHint:'動物アバターを選ぶ',
  caroJoinedRoom:'✓ 部屋に入室しました', caroYouLabel:'自分',
  caroOppCardTitle:'相手プロフィール', caroAddFriend:'🤝 友達追加',
  caroFriendAdded:'友達に追加しました', caroAlreadyFriend:'すでに友達',
  caroFriendNeedId:'相手IDを取得できません',
  caroWinRateLabel:'勝率', caroNoStats:'統計なし',
},

zh: {
  langName:'中文',
  authSub:'🔐 登录后开始游戏',
  guestPlay:'立即游玩',
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
  hintDefault:'',
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
  ttSettings:'设置',
  settingsTitle:'设置',
  setSound:'音效', setBgm:'背景音乐',
  setAccount:'账号', setLanguage:'语言', setMap:'隐藏关卡', setCup:'奖杯',
  setBricks:'方块皮肤', ttBricks:'方块皮肤',
  setBoards:'棋盘皮肤', ttBoards:'棋盘皮肤',
  setSpin:'幸运转盘', spinTitle:'幸运转盘', ttSpin:'幸运转盘',
  setMore:'更多设置', setHome:'主页', setReplay:'再玩一次',
  setMoreTitle:'更多设置', setContact:'联系我们', setShare:'分享给好友',
  setTerms:'服务条款', setPrivacy:'隐私政策', setAbout:'关于我们',
  setCupTitle:'成就', setAwards:'勋章', setHelp:'玩法说明',
  cupHighestCombo:'最高连击', cupBestScore:'最高分', cupRounds:'回合', cupLoginDays:'登录天数',
  ppProfile:'资料', ppEdit:'改名 / 样式', ppTitle:'🪪 玩家资料',
  ppSub:'随意昵称 · 允许特殊字符', ppPreview:'预览',
  ppNickLabel:'改名', ppRenameFree:'首次改名免费',
  ppRenameAd:'下次改名：观看广告', ppSaveNick:'✓ 保存名字',
  ppStyleTitle:'🎨 颜色与样式', ppStyleAdHint:'改颜色 / 加粗 / 斜体 / 字体需要看广告',
  ppColor:'文字颜色', ppBold:'加粗', ppItalic:'斜体', ppFont:'字体',
  ppSaveStyle:'📺 应用样式（看广告）', ppSaved:'已保存',
  ppStyleSaved:'已应用样式（已看广告）', ppNickShort:'请输入昵称',
  ppAdFail:'广告未就绪 — 请稍后重试',
  ppLevel:'等级', ppMaps:'已通关', ppCaro:'五子棋',
  ppCaroWLD:'{0}胜/{1}负/{2}平 · {3}%',
  ppAvatar:'头像', ppAvatarHint:'选择动物头像',
  caroJoinedRoom:'✓ 已进入房间', caroYouLabel:'你',
  caroOppCardTitle:'对手资料', caroAddFriend:'🤝 加好友',
  caroFriendAdded:'已添加好友', caroAlreadyFriend:'已是好友',
  caroFriendNeedId:'无法获取对手ID',
  caroWinRateLabel:'胜率', caroNoStats:'暂无统计',
},

es: {
  langName:'Español',
  authSub:'🔐 Inicia sesión para jugar',
  guestPlay:'Jugar ahora',
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
  hintDefault:'',
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
  ttSettings:'Ajustes',
  settingsTitle:'Ajustes',
  setSound:'Sonido', setBgm:'Música',
  setAccount:'Cuenta', setLanguage:'Idioma', setMap:'Mapas ocultos', setCup:'Copas',
  setBricks:'Bloques', ttBricks:'Skins de bloques',
  setBoards:'Tableros', ttBoards:'Skins de tablero',
  setSpin:'Ruleta', spinTitle:'Ruleta de la suerte', ttSpin:'Ruleta de la suerte',
  setMore:'Más ajustes', setHome:'Inicio', setReplay:'Repetir',
  setMoreTitle:'Más ajustes', setContact:'Contacto', setShare:'Compartir',
  setTerms:'Términos', setPrivacy:'Privacidad', setAbout:'Acerca de',
  setCupTitle:'Logros', setAwards:'Premios', setHelp:'Cómo jugar',
  cupHighestCombo:'Mayor combo', cupBestScore:'Mejor puntuación', cupRounds:'Rondas', cupLoginDays:'Días de acceso',
  ppProfile:'Perfil', ppEdit:'Cambiar nombre / estilo', ppTitle:'🪪 Perfil del jugador',
  ppSub:'Cualquier apodo · caracteres especiales permitidos', ppPreview:'Vista previa',
  ppNickLabel:'Cambiar nombre', ppRenameFree:'El primer cambio es gratis',
  ppRenameAd:'Siguiente cambio: ver un anuncio', ppSaveNick:'✓ Guardar nombre',
  ppStyleTitle:'🎨 Color y estilo', ppStyleAdHint:'Color / negrita / cursiva / fuente necesita anuncio',
  ppColor:'Color del texto', ppBold:'Negrita', ppItalic:'Cursiva', ppFont:'Fuente',
  ppSaveStyle:'📺 Aplicar estilo (ver anuncio)', ppSaved:'Guardado',
  ppStyleSaved:'Estilo aplicado (anuncio visto)', ppNickShort:'Introduce un apodo',
  ppAdFail:'Anuncio no listo — inténtalo más tarde',
  ppLevel:'Nivel', ppMaps:'Mapas superados', ppCaro:'Caro',
  ppCaroWLD:'{0}V/{1}D/{2}E · {3}%',
  ppAvatar:'Avatar', ppAvatarHint:'Elige un animal',
  caroJoinedRoom:'✓ Entraste a la sala', caroYouLabel:'Tú',
  caroOppCardTitle:'Perfil del rival', caroAddFriend:'🤝 Agregar amigo',
  caroFriendAdded:'Amigo agregado', caroAlreadyFriend:'Ya son amigos',
  caroFriendNeedId:'No se pudo obtener el ID',
  caroWinRateLabel:'Porcentaje de victorias', caroNoStats:'Sin estadísticas',
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
// Lưu ý: chuỗi rỗng '' là hợp lệ (vd. ẩn hintDefault) — không được fallback sang tên key.
function t(key){
  const args = Array.prototype.slice.call(arguments, 1);
  let s;
  if(I18N[currentLang] && Object.prototype.hasOwnProperty.call(I18N[currentLang], key)){
    s = I18N[currentLang][key];
  } else if(I18N.en && Object.prototype.hasOwnProperty.call(I18N.en, key)){
    s = I18N.en[key];
  } else if(I18N.vi && Object.prototype.hasOwnProperty.call(I18N.vi, key)){
    s = I18N.vi[key];
  } else {
    s = key;
  }
  if(s == null) s = key;
  s = String(s);
  args.forEach((a,i)=>{ s = s.split('{'+i+'}').join(a); });
  return s;
}

// Quét DOM và thay chữ theo ngôn ngữ hiện tại.
function applyI18nDom(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{ el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{ el.title = t(el.dataset.i18nTitle); });
  document.documentElement.lang = currentLang;
  // các nhãn động đang hiển thị
  const badge=document.getElementById('mode-badge');
  if(badge && !badge.classList.contains('secret')) badge.textContent = t('badgeNormal');
  if(typeof updateScoreUI==='function') try{ updateScoreUI(); }catch(e){}
  if(typeof updateBurstCount==='function') try{ updateBurstCount(); }catch(e){}
  const hb=document.getElementById('hint-bar');
  if(hb){
    const def = t('hintDefault');
    hb.textContent = def || '';
    if(!def){ hb.classList.remove('hint-flash','hint-aim'); }
  }
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
