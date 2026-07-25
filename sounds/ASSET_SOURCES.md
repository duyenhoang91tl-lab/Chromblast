# Báo cáo nguồn gốc asset — `sounds/`

Ngày lập: 2026-07-25  
Phạm vi: toàn bộ file hiện có trong `sounds/` (không sửa/xóa file âm thanh).  
Phương pháp: `git log` / commit GitHub / metadata WAV / comment trong `js/audio.js` / danh sách cloud agent truy cập được trong môi trường này.

## Tóm tắt phân loại

| Nhóm | Số file | Kết luận |
|---|---:|---|
| 1. Giọng đọc tự thu âm (voice recording gốc) | **0** (chưa xác nhận được từ bằng chứng hiện có) | Không có file nào có bằng chứng kỹ thuật/git đủ để khẳng định là bạn tự thu |
| 2. Âm thanh do AI tạo trong các lần chat trước | **0** | Không có commit/agent nào ghi nhận việc generate các file `.wav` này |
| 3. Không rõ nguồn gốc | **10** | Toàn bộ file hiện có — xem bảng dưới |

### Bằng chứng chính
- Lần đầu xuất hiện: commit `4ecb5cb` (2026-07-04, author **Grace Dory**, committer **GitHub**) — message `Add files via upload`, file nằm ở root repo.
- Chuyển vào `sounds/`: commit `633e95c` (2026-07-04) — message `âm thanh`.
- Bản hiện tại (đã trim kích thước): commit `f527171` (2026-07-04) — `Add files via upload`.
- **Không** có commit nào từ `cursoragent` / Claude / bot đụng tới các file `.wav` trong `sounds/`.
- Các cloud agent truy cập được trong môi trường này (3 agent gần đây) **không** liên quan tạo file trong `sounds/`.
- Claude (02/07/2026) từng thêm *spoken praise* bằng **Web Speech API** trong code (`64960e1`, `ec3bc15`) — đó **không** phải các file `.wav` này.
- WAV không có chunk `LIST/INFO` / software tag; format đồng nhất: PCM 16-bit, mono, 44100 Hz.
- `js/audio.js` ghi chú: *“file audio thu sẵn (sounds/)”* — chỉ là mô tả mục đích dùng (lồng tiếng khen), **không** chứng minh ai thu / công cụ nào tạo.
- Trong thư mục **không** có `LICENSE` / credit riêng cho từng file.

> Nếu bạn xác nhận sau (ví dụ: “tôi tự thu bằng điện thoại” hoặc “tôi export từ ElevenLabs/…”), có thể cập nhật lại cột nguồn gốc cho từng dòng.

---

## Bảng chi tiết (10 file hiện có)

| Tên file | Nguồn gốc | Ngày tạo (git — lần đầu thêm) | Ngày bản hiện tại (git) | Ghi chú license / kỹ thuật |
|---|---|---|---|---|
| `amazing.wav` | không rõ | 2026-07-04 (`4ecb5cb` upload root; `633e95c` → `sounds/`) | 2026-07-04 (`f527171`) | Không có license trong repo. PCM mono 44.1 kHz ~0.62s. Dùng làm praise tier trong `PRAISE_SOUND_FILES`. |
| `cool.wav` | không rõ | 2026-07-04 (`4ecb5cb`; có thêm `d119aff` Create rồi xóa `00cd41d`, sau đó lại có trong batch `633e95c`) | 2026-07-04 (`f527171`) | Không có license. PCM mono 44.1 kHz ~0.32s. |
| `godlike.wav` | không rõ | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Không có license. PCM mono 44.1 kHz ~0.33s. |
| `good.wav` | không rõ | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Không có license. PCM mono 44.1 kHz ~0.22s. |
| `great.wav` | không rõ | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Không có license. PCM mono 44.1 kHz ~0.19s. |
| `impressive.wav` | không rõ | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Không có license. PCM mono 44.1 kHz ~0.69s. |
| `legendary.wav` | không rõ | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Không có license. PCM mono 44.1 kHz ~0.68s. |
| `perfect.wav` | không rõ | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Không có license. PCM mono 44.1 kHz ~0.43s. |
| `spectacular.wav` | không rõ | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Không có license. PCM mono 44.1 kHz ~0.72s. |
| `unreal.wav` | không rõ | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Không có license. PCM mono 44.1 kHz ~0.63s. |

---

## Nhóm 1 — Giọng đọc tự thu âm (voice recording gốc)

*(trống — chưa xác nhận được file nào thuộc nhóm này từ git/metadata/agent log)*

## Nhóm 2 — AI generate trong các lần chat trước

*(trống đối với file trong `sounds/`)*

Ghi chú liên quan (không phải file trong thư mục này):
- 2026-07-02: Claude thêm praise bằng **Web Speech API** (không tạo `.wav`).
- Các agent Cursor gần đây truy cập được: không tạo/sửa file trong `sounds/`.

## Nhóm 3 — Không rõ nguồn gốc

Toàn bộ 10 file ở bảng trên.

---

## Lịch sử liên quan (không còn trong thư mục)

| Tên file | Trạng thái | Ghi chú |
|---|---|---|
| `not_bad.wav` | Đã xóa | Từng có trong batch 2026-07-04; xóa ở commit `6d4c4ba` (2026-07-09). Không còn trong `sounds/` hiện tại. |

---

## Cách dùng trong game

`js/audio.js` → `PRAISE_SOUND_FILES` / `speakPraise()`: phát file WAV tương ứng cấp khen combo (Cool → Godlike).
