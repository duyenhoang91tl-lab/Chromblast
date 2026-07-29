# Google Play — Data safety (ChromaBlast)

Hướng dẫn khai báo **Data safety** theo hành vi bản phát hành hiện tại (cập nhật 29/07/2026).  
Đối chiếu: `privacy-policy.html`, `ASSETS_LICENSE.md`, `package.json`, `js/native.js`, `js/online-services.js`, `js/chat.js`.

## Tóm tắt khai báo gợi ý

| Nhóm | Có thu thập / chia sẻ? | Mục đích | Ghi chú |
|---|---|---|---|
| Tên / ID người dùng (Firebase UID, nick) | Có (khi dùng online) | Chức năng app (đăng nhập, phòng, chat) | Firebase Auth + Firestore |
| Điểm số BXH + quốc gia/châu lục | Có (khi dùng online) | Chức năng app (BXH toàn cầu/theo kỳ) | Firestore `periodScores`/`players`; **công khai cho mọi user đã đăng nhập đọc được**, không riêng tư — khai là dữ liệu chia sẻ với người dùng khác |
| Tin nhắn chat | Có (khi chat online) | Chức năng app | Firestore; nếu bật dịch → gửi nội dung tới MyMemory / LibreTranslate |
| Ảnh avatar (nếu user upload) | Có thể | Chức năng app / hồ sơ | Kiểm tra kích thước giới hạn trong app |
| Tiến trình game local | Lưu trên thiết bị | Chức năng app | localStorage — không bắt buộc khai là “collected by developer” nếu chỉ ở thiết bị; nếu sync online thì khai tương ứng |
| Quảng cáo / ID quảng cáo | Có (Android + AdMob) | Quảng cáo | Google AdMob; khai “Advertising or marketing” |
| Dữ liệu chẩn đoán / crash | Tùy Google / Firebase mặc định | (nếu bật Analytics/Crashlytics — hiện chủ yếu Auth/Firestore) | Chỉ khai nếu SDK thực sự gửi |
| Vị trí / danh bạ / micro | Không | — | Không yêu cầu quyền này cho gameplay chính |

## Câu trả lời thường gặp trên form

1. **Does your app collect or share any of the required user data types?**  
   → **Yes** (ít nhất: User IDs khi online; điểm số BXH + quốc gia/châu lục — chia sẻ công khai với user khác; Advertising nếu AdMob; Messages nếu chat).

1b. **Is any data shared with other users (visible in-app to other users)?**  
   → **Yes** — tên hiển thị, avatar, điểm số, quốc gia/châu lục trên BXH toàn cầu/theo kỳ đều hiển thị công khai cho mọi user đã đăng nhập; tin nhắn world chat cũng vậy.

2. **Is all user data encrypted in transit?**  
   → **Yes** (HTTPS tới Firebase / dịch vụ dịch / AdMob).

3. **Do you provide a way for users to request that their data is deleted?**  
   → Có thể trả lời theo thực tế: xóa dữ liệu app trên thiết bị; với tài khoản Firebase cần quy trình xóa qua email hỗ trợ (`duyenhoang91.tl@gmail.com`) nếu chưa có nút in-app.

4. **Font / Google Fonts**  
   → Font **offline** trong APK — **không** khai thu thập qua Google Fonts CDN.

5. **Privacy policy URL**  
   → Đăng `privacy-policy.html` lên HTTPS công khai và dán URL vào Play Console + trong app.

## Việc cần làm trước khi submit

- [ ] Đăng privacy policy HTTPS và dán URL
- [ ] Khai AdMob / Advertising khớp SDK thật
- [ ] Khai Firebase Auth / Firestore nếu bật online
- [ ] Nếu giữ dịch chat: khai Messages có thể được xử lý bởi bên thứ ba (MyMemory / LibreTranslate)
- [ ] Không còn mô tả “chỉ lưu local / không bên thứ ba” (bản privacy cũ đã sửa)
