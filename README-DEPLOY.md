# Hướng dẫn upload & deploy — Khóa ghi điểm số client-side

## 1. Vị trí đặt file trong repo
- `firestore.rules` → root repo (đè file cũ)
- `functions/index.js` → `functions/index.js` (đè file cũ — `functions/profanity-filter.js` giữ nguyên, không đụng)
- `js/online-services.js` → `js/online-services.js` (đè file cũ)

## 2. Cần thêm 1 dòng vào index.html (không có sẵn trong file gửi cho mình)
Tìm dòng đang nạp `firebase-firestore-compat.js`, thêm ngay dưới nó — **giữ đúng số phiên bản hiện có trong file của bạn**:
```html
<script src="https://www.gstatic.com/firebasejs/<PHIÊN_BẢN_HIỆN_TẠI>/firebase-functions-compat.js"></script>
```
Thiếu dòng này thì `firebase.functions` sẽ là `undefined` — code sẽ im lặng bỏ qua việc ghi điểm (không lỗi, nhưng điểm không lên BXH).

## 3. THỨ TỰ DEPLOY BẮT BUỘC (rất quan trọng)

1. Upload `functions/index.js` lên GitHub → deploy Cloud Functions trước:
   ```bash
   firebase deploy --only functions
   ```
   Chờ deploy xong, mở Firebase Console → Functions, kiểm tra `submitSoloScore` và `applyMatchResult` không lỗi.

2. Upload `firestore.rules` → deploy rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

3. Upload `js/online-services.js` + sửa `index.html` → build lại app / deploy web.

**Nếu làm ngược thứ tự (rules trước functions):** toàn bộ tính năng ghi điểm và cả đăng nhập/upsert player sẽ bị Firestore từ chối ngay lập tức, vì lúc đó Cloud Function xử lý điểm chưa tồn tại.

## 4. Kiểm thử sau khi deploy xong cả 3 bước
- [ ] Đăng nhập (kể cả ẩn danh) vẫn vào được app bình thường, không có lỗi permission-denied trong console
- [ ] Chơi 1 ván solo, ghi điểm → kiểm tra Firebase Console: `players/{uid}.bestScore` và `periodScores/d-YYYY-MM-DD/entries/{uid}` được cập nhật
- [ ] Chơi 1 trận Caro/Versus xong → kiểm tra `players/{uid}.caroWins` (hoặc `wins`/`pvpPoints`) tăng đúng, và doc `rooms/{roomId}` có field `statsApplied: true`
- [ ] Thử sửa code JS trong DevTools để tự gọi `_onlineDb.collection('players').doc(uid).update({bestScore: 999999999})` trực tiếp → phải bị Firestore từ chối (permission-denied)

## 5. Ghi chú
- Function `applyMatchResult` có cờ `statsApplied` để tránh cộng điểm 2 lần nếu trigger chạy lại (retry).
- `submitSoloScore` validate `score` phải > 0 và ≤ 100,000,000 để chặn giá trị rác/quá lớn.
- Rule `scoreFieldsUnchanged()` chỉ khóa đúng các field điểm số, các field khác (`displayName`, `avatar`, `online`, `lastSeen`, `country`...) vẫn ghi bình thường từ client như trước.
