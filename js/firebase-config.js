// Firebase Web app: chromblast-web (project chromblast-5cf77)
// Game dùng Firebase compat CDN trong index.html — KHÔNG cần npm install firebase.
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDUFxuIdICTCVIx_latyFTCzCtYsze9Xnw',
  authDomain: 'chromblast-5cf77.firebaseapp.com',
  projectId: 'chromblast-5cf77',
  // CẦN XÁC NHẬN LẠI: URL Realtime Database đúng của project chỉ có sau khi
  // bật RTDB trên Firebase Console (console action, không phải code — xem
  // ghi chú database.rules.json). Đây là URL đoán theo đúng quy ước chuẩn
  // của Firebase cho region asia-southeast1 (khớp region Cloud Functions ở
  // functions/index.js) — hãy thay bằng URL thật hiện trong Console sau khi
  // tạo database, nếu khác.
  databaseURL: 'https://chromblast-5cf77-default-rtdb.asia-southeast1.firebasedatabase.app',
  storageBucket: 'chromblast-5cf77.firebasestorage.app',
  messagingSenderId: '470820469898',
  appId: '1:470820469898:web:b3e3fc9d204f732e11c173',
  measurementId: 'G-94SKQYQKBJ'
};

// Web Client ID (OAuth client_type: 3) — dùng cho Google Sign-In native Android
// + Firebase credential. KHÔNG dùng Android client ID ở đây.
// Lấy từ google-services.json → oauth_client client_type 3
// hoặc Google Cloud Console → Credentials → Web client.
window.GOOGLE_WEB_CLIENT_ID = '470820469898-ls6mq1vo8upnlkvqlplh3hajin1i87u7.apps.googleusercontent.com';
