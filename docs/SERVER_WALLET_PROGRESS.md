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

## Bước tiếp theo (chưa làm — làm sau, kiểm tra tay xong Bước 1 trước)

**Bước 2 đề xuất — nối `giftHeart` (tặng tim bạn bè), vì đây là lỗ hổng rõ
và dễ khoanh vùng nhất còn lại:**

Hiện `js/chat.js` xử lý tặng/nhận tim **hoàn toàn cục bộ, không xác thực**:
- Gửi (`chat.js` ~dòng 866-881): `canSendHeartGift`/`markHeartGiftSent`
  (`inventory.js`) chỉ chặn dựa trên 1 mảng UID lưu trong `localStorage`
  (`chromablast_heart_gifts`) — xoá key này là gửi lại vô hạn được ngay.
- Nhận (`chat.js` ~dòng 305-324): thấy 1 tin nhắn chat `kind:'heart_gift'`
  không phải của mình trong tab bạn bè là gọi thẳng `grantHearts(1,...)`,
  chặn nhận trùng bằng mảng ID tin nhắn trong `localStorage`
  (`chromablast_heart_recv`) — cũng xoá key là nhận lại được, hoặc tệ hơn,
  tự dựng 1 object tin nhắn giả có `kind:'heart_gift'` là có tim free.

`giftHeart` Cloud Function đã có sẵn, xác thực đúng 2 điều chỗ hổng trên bỏ
sót: (1) 2 người phải là bạn bè thật (đọc `players/{uid}/friends/{toUid}`),
(2) tối đa 1 tim/người tặng/ngày qua doc `claims` (không dựa `localStorage`
nên không xoá cache để tặng lại được), và tăng tim thẳng trên ví server —
KHÔNG cộng vào `inv.hearts` cục bộ (đây chính là việc "bắt máy tiêu/nhận
qua két sắt thay vì tự khai" mà Bước 1 mới chỉ chuẩn bị nền, chưa làm).

Việc cần làm ở Bước 2 (thứ tự gợi ý, mỗi ý nên là 1 commit riêng):
1. Tìm chỗ chat.js hiện GỬI tin nhắn `kind:'heart_gift'` (chưa đọc — cần đọc
   trước khi sửa) — sau khi gửi tin nhắn thành công, GỌI THÊM
   `giftHeart({toUid})` (không thay thế tin nhắn chat, tin nhắn vẫn là
   thông báo UI bình thường; `giftHeart` mới là thứ THẬT SỰ cộng tim).
2. Sửa nhánh NHẬN ở `appendMsg()` (dòng ~311-323): **bỏ hẳn**
   `grantHearts(1,...)` cục bộ khi thấy tin nhắn `heart_gift` — tin nhắn chỉ
   nên là hiệu ứng hiển thị (hiện toast/animation), KHÔNG tự cộng tim nữa,
   vì `giftHeart` (do người GỬI gọi ở bước 1) đã cộng thẳng vào ví server
   của người NHẬN rồi — cộng thêm ở đây là nhân đôi.
3. Vấn đề cần giải trước khi làm bước 2: **tim vẫn đang hiển thị từ
   `inv.hearts` cục bộ** (chưa đọc server) — nếu chỉ đổi bước 1+2 ở trên,
   người nhận tim sẽ KHÔNG THẤY tim mới trên HUD (vì HUD vẫn đọc
   `inv.hearts`, còn tim thật giờ nằm ở server). Cần đồng thời: sau khi
   `giftHeart` (người gửi) hoặc khi phát hiện có tim mới (người nhận, có
   thể qua Firestore `onSnapshot` lắng nghe field `hearts` trên
   `players/{uid}` của chính mình) → gọi `grantHearts()` cục bộ với ĐÚNG
   phần chênh lệch (không phải ghi đè toàn bộ ví, theo đúng nguyên tắc #1 ở
   trên) để đồng bộ hiển thị. Đây là điểm phức tạp nhất của Bước 2, cần
   thiết kế kỹ trước khi sửa code — CHƯA có câu trả lời sẵn, để lại đúng
   như vậy cho lượt làm tiếp theo.

**Sau Bước 2** (chưa cần nghĩ kỹ bây giờ, chỉ ghi hướng): `exchangeCurrency`
(đổi vàng/kim cương ở `js/economy-shop.js` hoặc tương tự) và `spendCurrency`
(mua vật phẩm) là 2 bước rủi ro cao hơn hẳn — chúng cần server biết ĐÚNG số
dư hiện tại để chặn mua vượt quá, mà ví server (Bước 1) chỉ có số ĐÚNG cho
tài khoản MỚI (số dư cũ trong `localStorage` không được mang sang — xem
nguyên tắc #1). Cần quyết định trước: chấp nhận ví server bắt đầu lại từ đầu
cho MỌI người chơi hiện có (kể cả người đã tích luỹ nhiều), hay cần thêm 1
cơ chế khác (ngoài phạm vi ghi chú này) trước khi khoá luôn các đường TIÊU
theo ví server.
