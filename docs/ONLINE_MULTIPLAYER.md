# ChromaBlast — Online 1v1 & Bảng xếp hạng (CH Play)

Hướng dẫn bật **tạo phòng · tìm đối thủ · đấu online · BXH PvP** khi phát hành lên Google Play.

## Kiến trúc

| Thành phần | File |
|------------|------|
| Cấu hình Firebase | `js/firebase-config.js` |
| Auth, phòng, matchmaking, BXH | `js/online-services.js` |
| Giao diện online | `js/online-ui.js` |
| Đồng bộ trận 1v1 | `js/versus.js` + `js/online-ui.js` |
| BXH 3 tab (thiết bị / solo / PvP) | `js/leaderboard.js` |

**Lưu ý:** Google Play Games **không còn API multiplayer** cho game mới. Dùng **Firebase** cho phòng & matchmaking; tuỳ chọn thêm Play Games cho đăng nhập/BXH native sau.

---

## Bước 1 — Firebase Console (project `chromblast-5cf77`)

Đã cấu hình sẵn trong repo:
- `android/app/google-services.json`
- `js/firebase-config.js`

**Bạn cần làm thủ công trên [Firebase Console](https://console.firebase.google.com/project/chromblast-5cf77):**

### 1a. Thêm Web app (khuyến nghị)
Project settings → **Add app** → Web `</>` → copy `appId` dạng `1:470820469898:web:...`  
→ thay vào `js/firebase-config.js` dòng `appId` (hiện đang dùng tạm Android appId).

### 1b. Authentication
**Build → Authentication → Sign-in method:**
| Provider | Trạng thái |
|----------|------------|
| Anonymous | **Bật** (bắt buộc — vào phòng nhanh) |
| Google | **Bật** (app Android + web) |

**Authorized domains** (Authentication → Settings):
- Luôn có: `localhost`
- App Android dùng **Google Sign-In native** (`@capgo/capacitor-social-login`) → Firebase `signInWithCredential` — không phụ thuộc Authorized domains như popup web.

**Google Sign-In trên Android (CH Play) — checklist:**
1. Firebase Console → Project settings → Android app `com.duyenhoang91tl.chromblast`
2. Thêm **SHA-1** (và SHA-256) của:
   - keystore **debug** (máy test)
   - keystore **release / Play App Signing** (khi lên CH Play)
3. Tải lại `google-services.json` → `android/app/google-services.json`
4. Trong Google Cloud / Firebase phải có:
   - OAuth **Android** client (package + SHA-1)
   - OAuth **Web** client → dùng làm `GOOGLE_WEB_CLIENT_ID` trong `js/firebase-config.js` (**không** dùng Android client ID)
5. `npm run cap:sync` → Rebuild APK

Lấy SHA-1 debug:
```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Nếu thấy lỗi `auth/unauthorized-domain` trên **web**: thêm domain vào Authorized domains.
Nếu lỗi Google trên **app**: gần như chắc thiếu/sai SHA-1 hoặc dùng nhầm client ID.

### 1c. Firestore Database
**Build → Firestore Database → Create database**
- Chế độ: **Production** (hoặc Test khi dev)
- Region: gần VN nhất (vd. `asia-southeast1`)

### 1d. Deploy Security Rules
Cài Firebase CLI (một lần):
```bash
npm install -g firebase-tools
firebase login
firebase use chromblast-5cf77
firebase deploy --only firestore:rules
```
File rules: `firestore.rules` (đã có trong repo).

### 1e. SHA fingerprint (cho Google Sign-In trên APK)
```bash
# Debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```
Project settings → Android app → **Add fingerprint** → dán SHA-1 và SHA-256.

---

## Bước 1 — Firebase Console (chi tiết chung)

1. Tạo project tại [Firebase Console](https://console.firebase.google.com/)
2. Thêm **Web app** → copy `firebaseConfig`
3. Dán vào `js/firebase-config.js` (hoặc copy từ `js/firebase-config.example.js`)
4. Bật **Authentication** → Anonymous + Google
5. Tạo **Firestore Database** (chế độ production)
6. Deploy rules từ `firestore.rules`

```bash
firebase deploy --only firestore:rules
```

### Firestore indexes cần tạo

Firebase sẽ gợi ý link khi chạy lần đầu. Tạo thủ công nếu cần:

- `rooms`: `code` ASC + `status` ASC
- `rooms`: `gameType` ASC + `status` ASC (danh sách phòng Caro chờ)
- `matchQueue`: `createdAt` ASC
- `players`: `pvpPoints` DESC
- `players`: `bestScore` DESC

---

## Bước 2 — Android (Capacitor)

1. Firebase Console → thêm app **Android**  
   Package: `com.duyenhoang91tl.chromblast`
2. Tải `google-services.json` → đặt vào `android/app/google-services.json`  
   (mẫu: `android/app/google-services.json.example`)
3. Lấy **SHA-1 / SHA-256** signing key:

```bash
keytool -list -v -keystore your-release.keystore -alias your-alias
```

4. Thêm fingerprint vào Firebase + Play Console (OAuth)
5. Build:

```bash
npm run cap:sync
```

---

## Bước 3 — Play Console

1. **Data safety**: khai báo thu thập ID người chơi, điểm, tên hiển thị
2. **Permissions**: `INTERNET` đã có trong manifest
3. Tuỳ chọn **Play Games Services v2** cho BXH/achievement native (không bắt buộc — app đã có BXH Firebase)

---

## Luồng người chơi (Lv.10+)

1. ⚔️ Đấu 1-1 → tab **Online**
2. **Tạo phòng** → chia mã 6 ký tự cho bạn
3. **Vào phòng** → nhập mã
4. **Tìm đối thủ** → hàng đợi tự ghép cặp
5. Host bấm **Bắt đầu trận** (hoặc tự bắt sau matchmaking)
6. Đấu 90s — nước đi đồng bộ qua Firestore
7. Kết quả cập nhật **BXH PvP** (+30 thắng, +5 hòa)

---

## Chế độ offline

Nếu `firebase-config.js` để trống `projectId`:

- 1v1 **cùng máy** vẫn chơi bình thường
- BXH chỉ tab **Thiết bị**
- Tab Toàn cầu / PvP hiện thông báo chưa kết nối

---

## Bảo mật & chống gian lận (khuyến nghị tiếp theo)

- Cloud Functions validate kết quả trận từ move log
- Chỉ host được ghi `finalizeOnlineMatch` (rules hiện tại cho phép client — nên siết sau)
- Rate limit tạo phòng / queue

---

## Kiểm thử nhanh

1. Điền `firebase-config.js` trên 2 trình duyệt/thiết bị
2. Lv.10 → Online → Tạo phòng / Vào phòng
3. Kiểm tra đồng bộ đặt khối + thẻ chướng ngại
4. Mở 🏆 → tab PvP xem điểm sau trận
