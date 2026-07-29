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

## Việc còn lại (chưa làm)

Theo thứ tự file lớn tăng dần, áp dụng đúng quy trình ở trên:

- [ ] `js/chat.js` (~1171 dòng trước khi tách các file khác — kiểm tra lại
      dòng hiện tại trước khi bắt đầu)
- [ ] `js/i18n-content.js` (~1499 dòng)
- [ ] `js/online-services.js` (~2055 dòng) — **cẩn thận**: file này đụng
      trực tiếp Firestore/network, rủi ro cao hơn các file UI thuần tuý,
      nên rà kỹ phần nào là logic đồng bộ mạng (giữ nguyên 1 chỗ) trước
      khi tách phần UI-only ra.
- [ ] `js/caro.js` (~2230 dòng) — file lớn nhất, đã có `js/caro-social.js`
      tách sẵn từ trước và cơ chế lazy-load qua `js/caro-loader.js`, cần
      xem kỹ trước khi tách thêm để không phá cơ chế lazy-load hiện có.

## Chưa làm / cần quyết định thêm (mục 2, 4 trong 6 hạng mục gốc)

- **Code lặp**: `js/profanity-filter.js` và `functions/profanity-filter.js`
  gần như giống hệt nhau (chỉ khác dòng export). Muốn gộp thành 1 nguồn
  và tự động copy lúc deploy Cloud Functions — CHƯA làm vì đụng pipeline
  deploy Functions (rủi ro cao hơn, cần xác nhận trước khi sửa).
- **Naming**: tên file khá nhất quán (kebab-case); naming bên trong code
  (biến/hàm) chưa rà kỹ do khối lượng lớn — có thể làm riêng theo từng
  file khi tách, nếu cần.
