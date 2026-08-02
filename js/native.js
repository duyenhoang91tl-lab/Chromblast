// ═══════════════════════════════════════════════════════════════
// js/native.js — CẦU NỐI ANDROID (Capacitor). Trên web thường file này
// không làm gì (window.Capacitor không tồn tại).
//
// Nút BACK Android — thứ tự ưu tiên khi bấm:
//   1. Đang mở panel/overlay nào → đóng panel đó
//   2. Đang chơi MAP ẨN → thoát về bàn chính
//   3. Đang chơi bàn chính (chưa pause) → mở TẠM DỪNG
//   4. Còn lại (đang pause / màn hình đầu) → thu nhỏ app (không thoát hẳn)
// ═══════════════════════════════════════════════════════════════
(async function initNativeBridge(){
  const cap = window.Capacitor;
  if(!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
  const App = cap.Plugins && cap.Plugins.App;
  // CÔNG TẮC TẠM TẮT QUẢNG CÁO: đổi thành true khi app đã lên CH Play và sẵn sàng chạy quảng cáo thật.
  const ADS_ENABLED = false;
  const AdMob = ADS_ENABLED ? (cap.Plugins && cap.Plugins.AdMob) : null;

  // ── Thông báo local thật (tim hồi + quà điểm danh) ──
  // Đặt TRƯỚC các await AdMob/SocialLogin bên dưới để window.requestNativeNotificationPermission
  // có sẵn ngay lập tức, tránh trường hợp người chơi bấm "Cho phép" trước khi các await kia xong.
  const LocalNotifications = cap.Plugins && cap.Plugins.LocalNotifications;
  const NOTIF_ID_HEART = 1001;
  const NOTIF_ID_DAILY = 1002;

  /** Gọi từ nút "Cho phép" trong màn hỏi thông báo (ui-gates.js) khi chạy trên native.
   *  Trả về 'granted' | 'denied' | 'default' giống Web Notification API để code cũ dùng chung. */
  window.requestNativeNotificationPermission = async function(){
    if(!LocalNotifications) return 'unsupported';
    try{
      const cur = await LocalNotifications.checkPermissions();
      if(cur && cur.display === 'granted') return 'granted';
      const res = await LocalNotifications.requestPermissions();
      return (res && res.display === 'granted') ? 'granted' : 'denied';
    }catch(e){
      console.warn('[native] requestNativeNotificationPermission', e);
      return 'error';
    }
  };

  async function nativeNotifAllowed(){
    if(!LocalNotifications) return false;
    try{
      const cur = await LocalNotifications.checkPermissions();
      return !!(cur && cur.display === 'granted');
    }catch(e){ return false; }
  }

  /** Nhắc "tim đã hồi" đúng thời điểm tim tiếp theo về — chỉ hữu ích khi app ở nền. */
  window.scheduleHeartReadyNotification = async function(){
    if(!LocalNotifications) return;
    try{
      if(!(await nativeNotifAllowed())) return;
      await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID_HEART }] });
      const inv = window.Inventory;
      if(!inv) return;
      const ms = typeof inv.heartRegenRemainingMs === 'function' ? inv.heartRegenRemainingMs() : 0;
      if(!(ms > 0)) return;
      await LocalNotifications.schedule({
        notifications: [{
          id: NOTIF_ID_HEART,
          title: 'ChromaBlast',
          body: 'Bạn vừa hồi thêm 1 ❤️ tim — vào chơi tiếp thôi!',
          schedule: { at: new Date(Date.now() + ms) },
        }]
      });
    }catch(e){ console.warn('[native] scheduleHeartReadyNotification', e); }
  };

  window.cancelHeartReadyNotification = async function(){
    if(!LocalNotifications) return;
    try{ await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID_HEART }] }); }catch(e){}
  };

  /** Nhắc quà điểm danh mỗi ngày lúc 20:00 giờ máy — lặp lại (repeats: true, every: 'day'). */
  window.scheduleDailyRewardReminder = async function(){
    if(!LocalNotifications) return;
    try{
      if(!(await nativeNotifAllowed())) return;
      await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID_DAILY }] });
      const next = new Date();
      next.setHours(20, 0, 0, 0);
      if(next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
      await LocalNotifications.schedule({
        notifications: [{
          id: NOTIF_ID_DAILY,
          title: 'ChromaBlast',
          body: '🎁 Quà điểm danh hôm nay đang chờ bạn!',
          schedule: { at: next, repeats: true, every: 'day' },
        }]
      });
    }catch(e){ console.warn('[native] scheduleDailyRewardReminder', e); }
  };

  window.cancelDailyRewardReminder = async function(){
    if(!LocalNotifications) return;
    try{ await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID_DAILY }] }); }catch(e){}
  };

  // App xuống nền → đặt lịch nhắc tim hồi (nếu còn thiếu tim); app quay lại → huỷ nhắc tim
  // (đã ở trong app rồi thì không cần thông báo nữa), quà điểm danh vẫn giữ lịch lặp ngày.
  if(App){
    App.addListener('appStateChange', ({ isActive }) => {
      if(isActive){
        try{ window.cancelHeartReadyNotification(); }catch(e){}
      } else {
        try{ window.scheduleHeartReadyNotification(); }catch(e){}
      }
    });
  }

  // Khởi tạo AdMob
  if(AdMob) {
    try {
      await AdMob.initialize({
        testingDevices: [], // để trống khi đã publish thật
        initializeForTesting: false, // false = chạy quảng cáo THẬT (bản publish chính thức)
      });
    } catch (e) {
      console.error('AdMob Initialization Error:', e);
    }
  }

  // Google Sign-In native (Capgo SocialLogin) — warm-up sớm
  try{
    const SocialLogin = cap.Plugins && cap.Plugins.SocialLogin;
    const webClientId = window.GOOGLE_WEB_CLIENT_ID;
    if(SocialLogin && webClientId){
      await SocialLogin.initialize({ google: { webClientId, mode: 'online' } });
      window.__socialLoginGoogleReady = true;
    }
  }catch(e){
    console.warn('[native] SocialLogin init', e);
  }

  // ID đơn vị quảng cáo (AdMob console → Ad units):
  //  - Interstitial và Rewarded dùng 2 ad unit riêng biệt (bắt buộc, dùng
  //    chung id sẽ khiến prepareRewardVideoAd luôn load fail).
  const AD_UNIT_INTERSTITIAL = 'ca-app-pub-9093176034842025/6573161096';
  const AD_UNIT_REWARDED = 'ca-app-pub-9093176034842025/9504131099';
  const AD_UNIT_BANNER = 'ca-app-pub-9093176034842025/4940350921';

  // Hiển thị banner cố định (dải nhỏ dưới màn hình)
  window.showBannerAd = async function() {
    if (!AdMob) return;
    try {
      await AdMob.showBanner({
        adId: AD_UNIT_BANNER,
        adSize: 'ADAPTIVE_BANNER',
        position: 'BOTTOM_CENTER',
        margin: 0,
        isTesting: false,
      });
    } catch (e) {
      console.error('AdMob Banner Error:', e);
    }
  };

  // Ẩn banner (dùng khi cần màn hình full, ví dụ trước khi hiện quảng cáo khác)
  window.hideBannerAd = async function() {
    if (!AdMob) return;
    try {
      await AdMob.hideBanner();
    } catch (e) {
      console.error('AdMob Hide Banner Error:', e);
    }
  };

  // Tự hiện banner ngay khi app khởi động
  window.showBannerAd();

  // Hàm hiển thị quảng cáo interstitial
  window.showInterstitialAd = async function() {
    if (!AdMob) return;
    try {
      await AdMob.prepareInterstitial({
        adId: AD_UNIT_INTERSTITIAL,
        isTesting: false, // false = ID quảng cáo thật, đang ở chế độ phát hành.
                          // Nếu cần test tay trên máy thật, tạm đổi thành true
                          // (hoặc set testDeviceIds) để tránh tự bấm quảng cáo thật
                          // nhiều lần — AdMob có thể khoá tài khoản vì "invalid traffic".
      });
      await AdMob.showInterstitial();
    } catch (e) {
      console.error('AdMob Interstitial Error:', e);
    }
  };

  // Quảng cáo có thưởng (xem để nhận +1 tim)
  window.showRewardedAd = async function(onReward, onFail) {
    if (!AdMob) {
      if (typeof onFail === 'function') onFail();
      return;
    }
    try {
      await AdMob.prepareRewardVideoAd({
        adId: AD_UNIT_REWARDED,
        isTesting: false,
      });
      const result = await AdMob.showRewardVideoAd();
      if (result && (result.rewarded || result.type)) {
        if (typeof onReward === 'function') onReward(result);
      } else if (typeof onReward === 'function') {
        onReward(result);
      }
    } catch (e) {
      console.error('AdMob Rewarded Error:', e);
      if (typeof onFail === 'function') onFail(e);
    }
  };

  if(!App) return;

  const CLOSABLE_PANELS = [
    'maphelp-panel','roundguide-panel','hiddenmap-menu-panel',
    'daily-panel','leaderboard-panel','account-panel','help-panel','unlock-overlay','saga-map-screen',
    'versus-setup-panel','versus-result-panel','online-hub-panel','online-lobby-panel','online-matchmaking-panel',
    'caro-hub-panel','caro-lobby-panel','caro-mm-panel','caro-result-panel','caro-rank-panel','caro-settings-panel',
    'player-profile-panel','player-card-panel',
    'friends-panel','shop-panel','quests-screen',
    'settings-panel','settings-more-panel','settings-lang-panel','settings-cup-panel','settings-text-panel',
    'brick-skin-panel',
    'board-skin-panel',
    'spin-panel',
  ];

  function anyHiddenMapActive(){
    try{
      return !!(
        (typeof secretMode!=='undefined' && secretMode) ||
        (typeof activeHiddenMapKey!=='undefined' && activeHiddenMapKey) ||
        (typeof _activeMapModule!=='undefined' && _activeMapModule)
      );
    }catch(e){ return false; }
  }

  App.addListener('backButton', ()=>{
    // 0. Nhiệm vụ: detail → hub → đóng
    try{
      if(typeof questsHandleBack==='function' && document.getElementById('quests-screen')?.classList.contains('show')){
        questsHandleBack();
        return;
      }
    }catch(e){}
    // 1. Đóng panel đang mở
    for(const id of CLOSABLE_PANELS){
      const el=document.getElementById(id);
      if(el && el.classList.contains('show')){
        // Lần đầu chọn gạch — không đóng bằng nút Back
        if(id==='brick-skin-panel' && el.dataset.mode==='starter') return;
        if(id==='board-skin-panel' && el.dataset.mode==='starter') return;
        if(id==='spin-panel' && el.dataset.rewardPending==='1') return;
        if(id==='caro-hub-panel' || id==='online-hub-panel'){
          try{ if(typeof lockPortraitOrientation==='function') lockPortraitOrientation(); }catch(e2){}
        }
        el.classList.remove('show'); return;
      }
    }
    // 2. Đang trong map ẩn → về bàn chính
    if(anyHiddenMapActive()){
      try{ hardResetAllModes(); }catch(e){}
      return;
    }
    // 3. Đang chơi bàn chính, chưa pause → mở tạm dừng
    try{
      if(typeof gamePaused!=='undefined' && !gamePaused &&
         document.getElementById('game-over-overlay') &&
         !document.getElementById('game-over-overlay').classList.contains('show')){
        const authShown = document.getElementById('auth-screen') &&
          document.getElementById('auth-screen').style.display!=='none' &&
          !document.getElementById('auth-screen').classList.contains('hide');
        if(!authShown){
          try{ togglePause(); return; }catch(e){}
        }
      }
    }catch(e){}
    // 4. Thu nhỏ app thay vì thoát đột ngột
    try{ App.minimizeApp(); }catch(e){}
  });
})();
