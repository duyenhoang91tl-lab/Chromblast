# Google Play — Data safety (ChromaBlast)

Hướng dẫn khai báo **Data safety** đối chiếu trực tiếp với code (cập nhật 29/07/2026).  
Nguồn đối chiếu: `privacy-policy.html`, `package.json`, `index.html` (script Firebase SDK nạp), `js/native.js`, `js/online-services.js`, `js/chat.js`, `js/player-profile.js`, `js/caro-social.js`, `firestore.rules`.

> **Lưu ý về thuật ngữ trên form:** Play Console phân biệt **"Collected"** (dữ liệu về máy chủ/SDK của bạn, kể cả khi máy chủ đó là Firebase — Firebase là hạ tầng do chính bạn cấu hình nên tính là "của bạn", không phải bên thứ ba) và **"Shared"** (dữ liệu rời khỏi hệ thống của bạn tới một bên thứ ba KHÔNG phải nhà cung cấp dịch vụ xử lý hộ bạn, ví dụ mạng quảng cáo, API dịch bên ngoài). Bảng dưới đây khai theo đúng phân biệt này. Đây là tài liệu nội bộ hỗ trợ điền form, không phải tư vấn pháp lý — trước khi submit, đối chiếu lại với đúng UI/định nghĩa hiện tại trong Play Console vì Google có thể thay đổi.

## 1. Personal info (Thông tin cá nhân)

| Loại dữ liệu | Thu thập? | Chia sẻ bên thứ 3? | Hiển thị công khai trong app? | Mục đích | Ghi chú / nguồn |
|---|---|---|---|---|---|
| Name (nickname hiển thị) | Có | Không | **Có** — chat, BXH, danh sách bạn | Chức năng app | `player-profile.js` (`nick`); đồng bộ khi online |
| Email address | Có, **chỉ khi** đăng nhập Google | Không (chỉ tới Google với vai trò nhà cung cấp đăng nhập) | Không | Quản lý tài khoản | `online-services.js: signInWithGoogle()` — scope `email`, `profile`; Firebase Auth lưu email trong hồ sơ đăng nhập. Người chơi ẩn danh (mặc định) **không** có bước này |
| User IDs (Firebase UID, ID công khai `CBxxxxxx`) | Có | Không | ID công khai `CBxxxxxx` hiển thị khi tìm bạn qua ID | Chức năng app, chống gian lận BXH | `player-profile.js: ensurePublicPlayerId()`; Firebase UID là khoá doc, không hiển thị trực tiếp |

## 2. Messages (Tin nhắn)

| Loại dữ liệu | Thu thập? | Chia sẻ bên thứ 3? | Mục đích | Ghi chú |
|---|---|---|---|---|
| Tin nhắn trong app (chat thế giới / bạn bè / trong phòng) | Có | **Có, nếu** người chơi bật dịch tự động | Chức năng app (giao tiếp) | Firestore lưu tin nhắn (`worldChat`, `dms`, `rooms/{id}/chat` — của bạn, không tính "shared"). Nếu bật dịch: nội dung gửi tới `api.mymemory.translated.net` rồi fallback `translate.argosopentech.com` (`chat.js: translateText()`) — **đây là bên thứ 3 thật, phải khai "Shared"** |

## 3. Photos or videos (Ảnh / video)

| Loại dữ liệu | Thu thập? | Ghi chú |
|---|---|---|
| Ảnh avatar tự chọn | **Không** | Đã kiểm tra lại code: `customAvatar` (resize canvas + base64) chỉ lưu trong `localStorage` trên máy (`player-profile.js`, `caro-social.js: setupAvatarUpload()`), **không xuất hiện ở bất kỳ đâu trong `online-services.js`** → không gửi lên Firestore hay server nào. Avatar đồng bộ online chỉ là **emoji** có sẵn (`getPlayerAvatar()`), không phải ảnh thật. *(Bản ghi cũ của file này từng ghi "Có thể" — sai, đã sửa lại theo code.)* |

## 4. App activity (Hoạt động trong app)

| Loại dữ liệu | Thu thập? | Chia sẻ bên thứ 3? | Hiển thị công khai? | Mục đích | Ghi chú |
|---|---|---|---|---|---|
| Nội dung do người dùng tạo — điểm số BXH + quốc gia/châu lục | Có | Không | **Có** — mọi user đã đăng nhập (kể cả ẩn danh) đọc được toàn bộ BXH | Chức năng app | `online-services.js: submitPeriodScoreOnline()`, `submitGlobalSoloScore()` → Firestore `periodScores`, `players`; `firestore.rules: allow read: if signedIn()` |

## 5. App info and performance (Hiệu năng / chẩn đoán)

| Loại dữ liệu | Thu thập? | Ghi chú |
|---|---|---|
| Crash log / diagnostics | **Không** | `index.html` chỉ nạp `firebase-app-compat`, `firebase-auth-compat`, `firebase-firestore-compat` — không có Analytics/Crashlytics/Performance SDK. Bản Android trước đây có khai `com.google.firebase:firebase-analytics` trong `build.gradle` nhưng không hề gọi (không có `logEvent` nào trong code) — đã gỡ dependency này (29/07/2026) để khớp đúng với khai báo "không thu thập analytics". Nếu sau này thêm Firebase Analytics/Crashlytics thì phải khai lại mục này |

## 6. Device or other IDs

| Loại dữ liệu | Thu thập? | Chia sẻ bên thứ 3? | Mục đích | Ghi chú |
|---|---|---|---|---|
| Advertising ID | Có (trên Android) | **Có** — với Google AdMob | Quảng cáo | `package.json: @capacitor-community/admob`; `native.js: AdMob.initialize/prepareInterstitial/prepareRewardVideoAd` (interstitial + rewarded video) |

## 7. Không thu thập — không cần khai

Location (vị trí chính xác/tương đối), Financial info, Health & fitness, Audio files, Files and docs, Calendar, Contacts, Web browsing. Không có permission tương ứng trong app cho gameplay chính.

## Câu trả lời mẫu cho các câu hỏi chung trên form

1. **Does your app collect or share any of the required user data types?**  
   → **Yes.**

2. **Is all user data encrypted in transit?**  
   → **Yes** (HTTPS tới Firebase, AdMob, và các API dịch nếu bật).

3. **Do you provide a way for users to request that their data is deleted?**  
   → **Yes.** Trong app: `🌐 Online → 🗑️ Xoá tài khoản online & dữ liệu` (nút trong `online-hub-panel`) gọi `deleteMyAccountOnline()` (`online-services.js`) — xoá `players/{uid}` và các subcollection (`friends`, `blocked`, `friendRequests`, `invites`, `lbClaims`), xoá `playerIds/{publicId}`, xoá điểm BXH kỳ hiện tại + kỳ trước (`periodScores/*/entries/{uid}`), rồi xoá tài khoản Firebase Auth. Dữ liệu local (tiến trình, vật phẩm) xoá riêng qua Cài đặt Android như mục 1. **Giới hạn:** không xoá được điểm BXH của các kỳ cũ hơn kỳ trước liền kề (client không liệt kê được toàn bộ lịch sử periodId) — các bản ghi đó chỉ còn tên/avatar/điểm/quốc gia, không còn gắn với tài khoản đang hoạt động sau khi xoá. Nếu Google yêu cầu xoá triệt để 100%, cần thêm Cloud Function chạy định kỳ dọn các `periodScores` cũ.

4. **Font / Google Fonts CDN**  
   → Font nhúng **offline** trong APK (`nick-fonts.css`) — không khai thu thập qua Google Fonts CDN.

5. **Privacy policy URL**  
   → Đăng `privacy-policy.html` lên HTTPS công khai, dán URL vào Play Console **và** trong app; nội dung privacy policy phải liệt kê đúng các mục ở bảng trên (đặc biệt: BXH công khai, dịch chat gửi bên thứ 3, AdMob).

## Việc cần làm trước khi submit

- [ ] Đăng privacy policy HTTPS và dán URL — nội dung khớp bảng trên (BXH công khai, MyMemory/LibreTranslate, AdMob)
- [ ] Khai Advertising ID — Collected + Shared (AdMob), mục đích Advertising
- [ ] Khai Messages — Shared nếu tính năng dịch tự động vẫn còn bật cho người dùng
- [ ] Khai App activity (BXH) — Collected, không Shared bên thứ 3, nhưng hiển thị công khai trong app
- [ ] Xác nhận lại: KHÔNG khai "Photos or videos" (avatar chỉ local) — tránh khai thừa
- [x] Đã gỡ dependency `firebase-analytics` không dùng khỏi `android/app/build.gradle` (29/07/2026) — nếu sau này thêm lại Firebase Analytics/Crashlytics thì quay lại mục 5 và khai bổ sung
- [x] Nút xoá tài khoản in-app đã thêm (`🌐 Online → 🗑️ Xoá tài khoản online & dữ liệu`)
