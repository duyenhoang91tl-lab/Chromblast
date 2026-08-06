# Ghi chú tiến độ: nối inventory.js vào ví server-side

Bối cảnh: `functions/index.js` đã xây xong 6 Cloud Function (`regenHearts`,
`spendCurrency`, `exchangeCurrency`, `claimPeriodReward`, `giftHeart`,
`revenuecatWebhook`) + `firestore.rules: walletFieldsUnchanged()` khoá hoàn
toàn client ghi trực tiếp `gold`/`diamonds`/`hearts`/`heartsAt` trên
`players/{uid}` — CHỈ Cloud Function (Admin SDK) ghi được sau lần khởi tạo
đầu. Nhưng **game chưa hề gọi 6 function này** — `js/inventory.js` vẫn 100%
chạy trên `localStorage` y như cũ, `grantGold()` vẫn gọi được vô hạn từ
Console trình duyệt. Tức là đã xây xong két sắt nhưng chưa ai bỏ tiền vào /
chưa bắt máy tiêu qua nó — lỗ hổng gốc vẫn còn nguyên trên thực tế.

## Vì sao phải đi từng bước nhỏ

- `js/inventory.js` gắn đồng bộ (không async) rất sâu — vd `applyHeartRegen()`
  chạy ngay trong getter `hearts`, đọc ở đâu cũng kích hoạt, rải ~10 file
  (`engine.js`, `ui.js`, `caro.js`, `versus.js`, `chat.js`, `lucky-spin.js`...).
  Chuyển sang gọi server đúng cách đòi hỏi các điểm này thành `await` — sửa
  sai một chỗ là vỡ luồng chơi (VD chặn nhầm không cho vào ván dù đủ tim).
- **Không có cách tự động chơi thử game thật trong môi trường này** (không
  trình duyệt/thiết bị Android) — mọi kiểm tra ở đây chỉ tĩnh: `node --check`,
  đối chiếu Firestore Rules bằng mắt, `npm run build:www` xem có lỗi build
  không. Sau mỗi bước nên tự bấm thử trên app/web thật trước khi làm bước kế.
- Repo có nhiều nguồn cùng push `main` song song — **luôn fetch + rebase
  trước khi push**, kiểm tra diff cẩn thận (xem mục "Bài học" bên dưới, một
  lần rebase từng làm rớt mất 2 khối code khi tự viết lại 1 hàm).

## Nguyên tắc đã chọn cho toàn bộ việc nối này

1. **Không bao giờ "đọc ví server rồi ghi đè thẳng lên `inv.*` cục bộ"**
   trước khi chắc chắn ví server đã có số đúng — ghi đè bằng số 0/mặc định
   sẽ xoá sạch tiến trình đang có của người chơi hiện tại. Ví server hiện
   **KHÔNG kế thừa** số dư `localStorage` cũ — `firestore.rules` chỉ cho
   phép ghi đúng giá trị khởi tạo cố định (gold=20/diamonds=0/hearts=5,
   khớp `START_GOLD`/`MAX_HEARTS`), không nhận số client tự báo. Đây là
   quyết định đã có sẵn trong rules (không phải việc tự quyết định thêm) —
   người chơi cũ sẽ được ví server "sạch" bắt đầu lại từ mốc mặc định.
2. Ưu tiên bước nào **chỉ ghi thêm ở phía server**, không đụng dòng chảy
   đồng bộ cục bộ hiện có → an toàn tuyệt đối cho luồng chơi, dù chưa test
   được bằng tay.
3. Khi phải sửa 1 hàm dùng chung nhiều nơi (`grantGold`, `spendGold`...),
   tách thành bước RIÊNG, có thể revert độc lập — không gộp nhiều thay đổi
   rủi ro vào 1 commit.

## Đã làm (đã push lên main)

**Bước 1 — khởi tạo ví server đúng lần đầu + mốc hồi tim** (`js/online-services.js:
_upsertPlayerProfile()`):
- Trước khi `.set(patch, {merge:true})`, đọc thử doc hiện tại; nếu CHƯA có cả
  3 field `gold`/`diamonds`/`hearts` thì thêm đúng giá trị khởi tạo cố định
  (`START_GOLD`/`0`/`MAX_HEARTS`) vào patch — khớp chính xác những gì
  `firestore.rules: walletField()` cho phép ghi lần đầu. Nếu đã có rồi thì
  **không đưa 3 field này vào patch nữa** (quan trọng: đưa vào mà giá trị
  không khớp bản trên server là cả patch bị rules từ chối hết, kể cả
  displayName/avatar/level — vì đây là 1 lệnh `set` atomic).
  Không tự set `heartsAt` (field này `fieldLocked`, chỉ Cloud Function ghi
  được) — sau `.set()`, gọi `regenHearts()` một lần (bỏ qua nếu lỗi mạng) để
  nó tự khởi tạo mốc hồi tim khi chưa có.
- **Không đụng** vào bất kỳ trong ~10 chỗ đọc/ghi `inv.hearts`/`inv.gold`/
  `inv.diamonds` cục bộ — bước này chỉ ghi thêm ở phía server, cục bộ vẫn
  chạy y hệt trước đó. Rủi ro vỡ luồng chơi ở bước này gần như bằng 0.
- Đã kiểm tra tĩnh: `node --check js/online-services.js`, `npm run
  build:www` thành công, soi file minify xác nhận đúng logic.
- **Chưa kiểm tra bằng tay**: đăng nhập lần đầu thật (tài khoản mới) có tạo
  đúng field gold=20/diamonds=0/hearts=5 trên Firestore Console không; gọi
  lại lần 2 (tài khoản cũ) có bị rules từ chối oan không.

## Bài học (đọc trước khi sửa `_upsertPlayerProfile` hay hàm dài tương tự)

Lúc viết Bước 1, sửa hàm bằng cách thay `old_str`/`new_str` một lần đã lỡ
LÀM MẤT 2 khối code không liên quan (`couplePartnerName`/`visMaps`) vì
`old_str` lấy từ bản xem trước đó, không phải bản mới nhất — phát hiện kịp
nhờ xem lại toàn bộ hàm sau khi sửa. **Luôn `view` lại NGUYÊN VẸN hàm/khối
vừa sửa sau mỗi lần `str_replace`, đối chiếu số dòng/nội dung với bản trước
khi sửa**, đừng chỉ tin `old_str` mình nhớ là đúng 100%.

## Đã làm — Bước 2 (đã push lên main)

**Nối `giftHeart` (tặng tim bạn bè) — bỏ hoàn toàn niềm tin vào nội dung tin
nhắn chat, chuyển sang server xác thực + client tự phát hiện qua ví:**

- `js/chat.js: sendHeartToFriend()` — vẫn giữ `canSendHeartGift()` làm bước
  chặn nhanh phía UX (đỡ gọi mạng vô ích), nhưng **thêm** gọi thật Cloud
  Function `giftHeart({toUid})` NGAY SAU đó — đây mới là nơi chặn THẬT (bạn
  bè thật + 1 lần/người/ngày, server-side). Chỉ gửi tin nhắn thông báo
  (`kind:'heart_gift'`, hiệu ứng UI) và `markHeartGiftSent()` (giờ chỉ còn
  ý nghĩa UX) NẾU `giftHeart` thành công thật; lỗi có `err.code` cụ thể
  (`already-exists` = đã tặng hôm nay, `failed-precondition` = không phải
  bạn bè/người nhận đầy tim) để báo đúng lý do.
- `js/chat.js: appendMsg()` — **bỏ hẳn** `grantHearts(1,...)` khi thấy tin
  nhắn `heart_gift` (nội dung tin nhắn tự dựng được, không phải nguồn xác
  thực — đây chính là lỗ hổng cũ). Tin nhắn giờ chỉ còn là hiệu ứng hiển thị.
- `js/online-services.js` — thêm `startWalletGiftWatcher()`/
  `stopWalletGiftWatcher()`: lắng nghe (`onSnapshot`) field `hearts` trên
  đúng `players/{uid}` của **chính mình**, so với mốc lần trước đã thấy (lưu
  `localStorage`, theo uid) → server TĂNG thì gọi `grantHearts(delta,...)`
  cục bộ với ĐÚNG phần chênh lệch (không ghi đè cả ví — đúng nguyên tắc #1);
  server GIẢM (dành cho bước sau, VD `spendCurrency`) chỉ cập nhật mốc,
  không tự trừ ở đây. Lần đầu thấy dữ liệu chỉ ghi mốc, không cộng gì (tránh
  hiểu nhầm "hearts hiện có" thành "vừa được tặng"). Gọi hàm start này ở
  đúng 2 chỗ tồn tại sẵn `_upsertPlayerProfile()` (init chính +
  `onAuthStateChanged`), có bảo vệ chống đăng ký `onSnapshot` trùng lặp.
- Đã kiểm tra tĩnh: `node --check` cả 2 file, `npm run build:www` thành
  công, soi file minify xác nhận đúng logic (không còn `grantHearts(1` cứng
  trong chat.js, có `giftHeart`/`startWalletGiftWatcher` trong bản build).
- **Chưa kiểm tra bằng tay**: 2 tài khoản bạn bè thật tặng tim qua lại — HUD
  bên nhận có tự cập nhật đúng +1 không, tặng lần 2 trong ngày có báo đúng
  lỗi "đã tặng hôm nay" không, tặng khi đối phương đầy tim có báo đúng
  không.

## Bước tiếp theo (chưa làm)

**Bước 3 đề xuất — tổng quát hoá watcher sang gold/diamonds rồi nối
`claimPeriodReward` (thưởng BXH kỳ):**

Lý do chọn bước này tiếp theo (không phải `spendCurrency`/`exchangeCurrency`):
cùng nhóm rủi ro thấp với `giftHeart` — **chỉ CỘNG, không cần server biết số
dư hiện tại của người chơi** (không giống mua/đổi tiền, cần biết đúng số dư
để chặn mua vượt quá — mà ví server sau Bước 1 chỉ đúng cho tài khoản MỚI,
xem phần "Sau Bước 3" bên dưới, vẫn còn treo, chưa giải).

`js/lb-period.js: claimPeriodReward(kind, scope)` hiện tính `reward` HOÀN
TOÀN ở client (dựa `mine.rank` do client tự tính từ dữ liệu BXH đọc được) rồi
gọi thẳng `grantGold`/`grantDiamonds` cục bộ — client có thể tự sửa biến
`mine.rank` trước khi gọi hàm để nhận thưởng hạng cao hơn thật. Cloud
Function `claimPeriodReward` mới (đã có, xem `functions/index.js`) tự đếm
lại rank THẬT từ `periodScores` phía server, không tin client báo.

Việc cần làm, gợi ý thứ tự (mỗi ý 1 commit riêng):
1. Đổi `WALLET_HEARTS_SEEN_KEY`/`startWalletGiftWatcher()` (online-services.js)
   thành tổng quát cho cả `gold`/`diamonds`/`hearts` (đổi tên hàm/key cho
   khớp, VD `startWalletWatcher()`/`chromablast_server_wallet_seen`) — mỗi
   field so mốc riêng, tăng thì gọi đúng `grantGold`/`grantDiamonds`/
   `grantHearts` tương ứng với đúng phần chênh lệch.
2. Đọc kỹ chữ ký thật của Cloud Function `claimPeriodReward` trong
   `functions/index.js` (tham số `kind`/`scope` có khớp đúng client đang
   gọi không, throw lỗi gì khi chưa đủ điều kiện nhận) — CHƯA đối chiếu ở
   ghi chú này, cần đọc trước khi sửa.
3. Sửa `js/lb-period.js: claimPeriodReward()` gọi Cloud Function thật thay
   vì tự tính `reward` + `grantGold`/`grantDiamonds` cục bộ trực tiếp — vẫn
   giữ `markClaimed()` cục bộ (chặn UI hiện lại nút nhận), nhưng số tiền
   thật giờ đến từ watcher ở bước 1 (không gọi `grantGold` trực tiếp trong
   `claimPeriodReward()` nữa, tránh cộng 2 lần).

## Sau Bước 3 (chưa nghĩ kỹ, chỉ ghi hướng — vẫn còn treo 1 quyết định)

`exchangeCurrency` (đổi vàng/kim cương) và `spendCurrency` (mua vật phẩm)
rủi ro cao hơn hẳn 2 bước trên — chúng cần server biết ĐÚNG số dư hiện tại
để chặn tiêu vượt quá, mà ví server (Bước 1) chỉ đúng cho tài khoản MỚI (số
dư cũ trong `localStorage` không được mang sang, xem nguyên tắc #1). Với
tài khoản đã chơi lâu, số dư server (VD 20 gold gốc + vài lần cộng từ Bước 2
+ 3) sẽ THẤP HƠN NHIỀU số họ thấy trên HUD (`inv.gold`, tích luỹ từ trước) —
nếu khoá luôn đường TIÊU theo ví server lúc này, người chơi cũ sẽ bị từ chối
mua dù HUD báo đủ tiền, trải nghiệm rất tệ. Cần quyết định trước (việc của
người, không phải kỹ thuật thuần): chấp nhận ví server "bắt đầu lại" cho mọi
người chơi hiện có, hay cần 1 cơ chế khác (ngoài phạm vi ghi chú này) trước
khi làm bước này.
