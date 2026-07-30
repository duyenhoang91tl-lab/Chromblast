# Ghi chú tiến độ dọn code (khả năng bảo trì / mở rộng)

Mục tiêu: rà 6 hạng mục chất lượng code (file thừa, code lặp, khả năng mở
rộng, cấu trúc project, naming, khả năng bảo trì) và tách các file JS quá
lớn thành nhiều file nhỏ theo trách nhiệm rõ ràng — KHÔNG đổi hành vi
runtime, chỉ tổ chức lại code.

## Nguyên tắc khi tách file (đọc trước khi làm tiếp)

- Toàn bộ file JS ở `js/` và `maps/` là **plain `<script>`, không phải ES
  module** — chúng CHIA SẺ GLOBAL SCOPE có chủ đích (xem comment đầu
  `js/engine.js`). Khi tách 1 file thành nhiều file, các file mới phải:
  1. Được nạp bằng `<script src="...">` trong `index.html`, **ngay sau**
     file gốc, đúng thứ tự.
  2. Không cần `export`/`import` gì cả — cứ định nghĩa `function`/`const`
     top-level là các file khác gọi được, miễn nạp đúng thứ tự.
- Khi tách, chỉ **di chuyển nguyên văn khối hàm** sang file mới, không sửa
  logic bên trong. Sau khi tách luôn kiểm tra:
  - `node --check <file>.js` cho từng file mới.
  - Đối chiếu danh sách tên hàm/const/let giữa bản gốc (git show HEAD) và
    tổng các file mới — phải khớp 100%, không thiếu không lặp.
  - Chạy `node scripts/build-www.mjs` (build www/) để chắc chắn không lỗi,
    rồi `rm -rf www` (không commit thư mục này, đã có trong `.gitignore`).
- **Không có cách tự động chạy thử game thật** (không có trình duyệt/thiết
  bị Android trong môi trường làm việc) — mọi kiểm tra ở trên chỉ là kiểm
  tra tĩnh (cú pháp + đối chiếu). Sau mỗi lần tách file lớn, nên tự chơi
  thử tính năng liên quan trên app/web thật trước khi tách file tiếp theo.
- Repo này đang được nhiều nguồn cùng push vào `main` song song — trước
  khi push luôn `git pull origin main --rebase` để tránh mất commit của
  người khác.

## Đã làm xong (đã push lên main)

1. **Cấu trúc project**: gom 6 file CSS ở root (`main.css`,
   `brick-skins.css`, `map-boards.css`, `nick-fonts.css`, `saga-map.css`,
   `sky-atmosphere.css`) vào thư mục `css/`. Đã cập nhật `index.html` và
   `scripts/build-www.mjs`.
2. Tách `js/versus.js` (gốc 1028 dòng) →
   - `js/versus.js`: luật chơi, state, RNG, vòng đời trận đấu Đấu 1-1
   - `js/versus-ui.js`: dựng giao diện, render, kéo-thả, chat, chọn skin
3. Tách `js/effects.js` (gốc 1043 dòng) →
   - `js/effects.js`: hiệu ứng particle/combo/nổ/confetti
   - `js/effects-scenery.js`: vẽ nền cảnh (mặt trời/mây/hoa, nền
     ngày/đêm/tiệc/bão)
4. Tách `js/ui.js` (gốc 1069 dòng) →
   - `js/ui.js`: toast/hint, start screen, pause, menu map ẩn, panel
     tài khoản/help/arcade HUD
   - `js/ui-gates.js`: màn chặn Điều khoản dịch vụ + xin quyền thông báo
   - `js/ui-settings.js`: menu Cài đặt (hub, More, Cup, Ngôn ngữ)
5. Tách `js/engine.js` (gốc 1167 dòng) →
   - `js/engine.js`: board/piece/render/xử lý nổ/game-over
   - `js/engine-input.js`: kéo-thả, ghost, preview, chạm chọn
   - `js/engine-powers.js`: hệ thống skill fire/bubble/wind
6. **Code lặp**: gộp `js/profanity-filter.js` + `functions/profanity-filter.js`
   thành 1 nguồn duy nhất — `js/profanity-filter.js` giờ dùng wrapper UMD
   (chạy được cả khi nạp qua `<script>` trong browser lẫn khi `require()`
   trong Node). `functions/profanity-filter.js` không còn sửa tay: được
   sinh tự động bởi `scripts/sync-profanity-filter.mjs`, chạy tự động qua
   hook `predeploy` trong `firebase.json` mỗi lần deploy Cloud Functions.
   Nếu cần sửa luật lọc từ cấm, chỉ sửa `js/profanity-filter.js`, KHÔNG
   sửa trực tiếp file trong `functions/` (sẽ bị ghi đè ở lần deploy sau).

## Việc còn lại (chưa làm)

- [ ] `js/online-services.js` (~2055 dòng) — dùng đúng pattern hàm global
      rời rạc (an toàn để tách như các file trước), nhưng đụng trực tiếp
      Firestore/network (đăng nhập, phòng, matchmaking, chống gian lận
      điểm). **Đang tạm dừng ở đây theo yêu cầu — chờ test lại game trước
      khi tách tiếp file này.**
- [ ] `js/caro.js` (~2230 dòng) — file lớn nhất, đã có `js/caro-social.js`
      tách sẵn từ trước và cơ chế lazy-load qua `js/caro-loader.js`, cần
      xem kỹ trước khi tách thêm để không phá cơ chế lazy-load hiện có.

## Đã rà nhưng QUYẾT ĐỊNH KHÔNG TÁCH (rủi ro cao hơn lợi ích)

- **`js/chat.js`** (1171 dòng): toàn bộ code nằm trong 1 khối
  `(function(){...})()` duy nhất, dùng chung 1 object `state` nội bộ +
  các hàm helper private (`$`, `tt`,...), chỉ lộ ra ngoài ~10 hàm qua
  `window.xxx` ở cuối file. Đây LÀ kiểu đóng gói khác hẳn các file đã
  tách (không phải hàm global rời rạc) — nếu tách theo cách cũ, các hàm
  ở 2 file sẽ nằm trong 2 closure khác nhau và KHÔNG gọi được nhau nữa
  (phải tự dò từng chỗ gọi chéo + expose thủ công qua object dùng chung
  → dễ gãy tính năng chat/bạn bè, không có cách test lại ngay). Nếu sau
  này muốn tách, cần làm cẩn thận riêng, không dùng script cắt-khối-hàm
  như các file khác.
- **`js/i18n-content.js`** (1499 dòng): gần như 100% là dữ liệu dịch
  thuật (6 ngôn ngữ: vi/en/ko/ja/zh/es), không phải logic. Cấu trúc lồng
  khá phức tạp (1 object `I18N_CONTENT` chính + 2 khối IIFE bổ sung dữ
  liệu theo từng ngôn ngữ, 1 khối còn đụng tới object `I18N` khác nữa).
  Tách file gần như không giúp gì cho khả năng bảo trì (đã rõ ràng: mỗi
  ngôn ngữ 1 key, dễ tìm), trong khi tách tay trên khối text tiếng
  Việt/emoji khổng lồ dễ gõ nhầm/lệch dấu câu. Khuyến nghị: giữ nguyên,
  không tách.

## Trước khi tách tiếp — cần test lại game thật

Đã tách khá nhiều: `versus.js`, `effects.js`, `ui.js`, `engine.js` (mỗi
file ra 2-3 file con). Nên tự chơi thử trên app/web thật các phần sau
trước khi tách thêm `online-services.js` hoặc `caro.js`:

- [ ] Chơi map thường: đặt khối, xoay, kéo-thả, nổ hàng/cột (đụng
      `engine.js` + `engine-input.js`)
- [ ] Dùng skill đặc biệt fire/bubble/wind (đụng `engine-powers.js`)
- [ ] Hiệu ứng nổ/combo/confetti + nền cảnh các map có scenery (đụng
      `effects.js` + `effects-scenery.js`)
- [ ] Màn hình mở app lần đầu: Điều khoản dịch vụ + xin quyền thông báo
      (đụng `ui-gates.js`)
- [ ] Menu Cài đặt: đổi ngôn ngữ, âm thanh, rung, xem Cup (đụng
      `ui-settings.js`)
- [ ] Đấu 1-1 (Versus) cùng máy VÀ online: dựng bàn, kéo-thả, chat, chọn
      skin, thẻ chướng ngại, kết thúc trận (đụng `versus.js` +
      `versus-ui.js`)
- [ ] Build APK thật (`npm run cap:sync`) nếu có thể, không chỉ
      `build:www`



## Chưa làm / cần quyết định thêm (mục 4 trong 6 hạng mục gốc)

- **Naming**: tên file khá nhất quán (kebab-case); naming bên trong code
  (biến/hàm) chưa rà kỹ do khối lượng lớn — có thể làm riêng theo từng
  file khi tách, nếu cần.
