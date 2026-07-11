# ChromaBlast — Chuẩn bị Google Play

## 1. Thêm các tệp trong gói này vào thư mục gốc của dự án

`appId` hiện là `com.duyenhoang91tl.chromblast`. Đây là mã nhận diện duy nhất và không thể thay đổi sau lần phát hành đầu tiên. Đổi mã này trước khi tạo Android nếu bạn muốn một tên khác.

## 2. Tạo dự án Android

Yêu cầu Node.js LTS và Android Studio đã được cài đặt.

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Lệnh đồng bộ tự sao chép các tệp HTML, CSS, JavaScript và assets hiện có từ thư mục gốc vào `www/`, rồi Capacitor đóng gói chúng thành ứng dụng Android. Không sửa trực tiếp tệp trong `www/` vì nó sẽ được tạo lại mỗi lần đồng bộ.

## 3. Chỉnh trong Android Studio

Mở `android/` rồi chỉnh các giá trị sau trong cấu hình module `app`:

| Mục | Giá trị phát hành đầu tiên |
| --- | --- |
| `namespace` / `applicationId` | `com.duyenhoang91tl.chromblast` |
| `versionCode` | `1` |
| `versionName` | `1.0.0` |
| `minSdk` | `23` |
| `targetSdk` / `compileSdk` | `35` hoặc cao hơn |

Thêm biểu tượng ứng dụng thích ứng vào `mipmap-*`, kiểm tra tên hiển thị là **ChromaBlast**, và thay splash screen mặc định trước khi ký bản phát hành.

## 4. Kiểm thử trước khi xuất bản

1. Cài bản debug lên thiết bị Android thật, kiểm tra màn hình dọc, thao tác chạm/kéo, âm thanh, tạm dừng và chế độ máy bay.
2. Kiểm tra đăng ký/đăng nhập sau khi đóng mở lại ứng dụng. Dữ liệu hiện lưu cục bộ nên không được mô tả là đồng bộ đám mây.
3. Đăng chính sách tại một URL HTTPS công khai. Cập nhật email liên hệ trong `privacy-policy.html` trước khi xuất bản.
4. Trong Play Console, trả lời biểu mẫu **Data safety** theo đúng hành vi bản phát hành thực tế. Nếu giữ Google Fonts từ mạng, cần rà soát chính sách của Google Fonts và khai báo phù hợp.

## 5. Xuất App Bundle

Trong Android Studio chọn **Build > Generate Signed Bundle / APK > Android App Bundle**, tạo hoặc chọn keystore, sau đó chọn biến thể `release`. Giữ keystore và mật khẩu ở nơi an toàn; không đưa chúng vào Git.

Tải tệp `.aab` lên kênh **Internal testing** trước. Chỉ phát hành Production sau khi thử nghiệm xong.

## Bắt buộc trên Google Play

- Ứng dụng mới phải tải dưới dạng Android App Bundle (`.aab`).
- Target API phải là API 35 trở lên tại thời điểm tài liệu này.
- Cần chính sách quyền riêng tư công khai, email liên hệ, phân loại nội dung, ảnh biểu tượng và ảnh chụp màn hình.
- Không được tuyên bố có bảng xếp hạng toàn cầu vì giao diện hiện ghi rõ tính năng đó chỉ lưu cục bộ.
