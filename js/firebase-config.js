// Firebase Web app: chromblast-web (project chromblast-5cf77)
// Game dùng Firebase compat CDN trong index.html — KHÔNG cần npm install firebase.
window.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDUFxuIdICTCVIx_latyFTCzCtYsze9Xnw',
  authDomain: 'chromblast-5cf77.firebaseapp.com',
  projectId: 'chromblast-5cf77',
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
