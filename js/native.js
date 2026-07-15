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
  const AdMob = cap.Plugins && cap.Plugins.AdMob;

  // Khởi tạo AdMob
  if(AdMob) {
    try {
      await AdMob.initialize({
        testingDevices: [], // để trống khi đã publish thật
        initializeForTesting: false, // ĐANG TEST — đổi thành false khi publish thật
      });
    } catch (e) {
      console.error('AdMob Initialization Error:', e);
    }
  }

  // Hàm hiển thị quảng cáo interstitial
  window.showInterstitialAd = async function() {
    if (!AdMob) return;
    try {
      await AdMob.prepareInterstitial({
        adId: 'ca-app-pub-9093176034842025/6573161096',
        isTesting: false, // ĐANG TEST — đổi false khi publish thật
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
        adId: 'ca-app-pub-9093176034842025/6573161096',
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
    'daily-panel','leaderboard-panel','account-panel','help-panel','unlock-overlay',
    'settings-panel','settings-more-panel','settings-lang-panel','settings-cup-panel','settings-text-panel',
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
    // 1. Đóng panel đang mở
    for(const id of CLOSABLE_PANELS){
      const el=document.getElementById(id);
      if(el && el.classList.contains('show')){ el.classList.remove('show'); return; }
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
