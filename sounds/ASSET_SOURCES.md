# Báo cáo nguồn gốc asset — `sounds/`

Ngày lập: 2026-07-25  
Cập nhật: 2026-07-25 — nhà phát hành xác nhận toàn bộ 10 file là giọng tự thu âm.  
Phạm vi: toàn bộ file hiện có trong `sounds/` (không sửa/xóa file âm thanh).  
Phương pháp: `git log` / commit GitHub / metadata WAV / xác nhận của nhà phát hành.

## Tóm tắt phân loại

| Nhóm | Số file | Kết luận |
|---|---:|---|
| 1. Giọng đọc tự thu âm (voice recording gốc) | **10** | Nhà phát hành xác nhận: giọng của mình, tự thu âm |
| 2. Âm thanh do AI tạo trong các lần chat trước | **0** | Không có commit/agent nào ghi nhận việc generate các file `.wav` này |
| 3. Không rõ nguồn gốc | **0** | Đã chuyển hết sang nhóm 1 theo xác nhận nhà phát hành |

### Bằng chứng / xác nhận
- **Xác nhận nhà phát hành (2026-07-25):** 10 file `.wav` hiện có là nhà phát hành thu âm (giọng của mình).
- Lần đầu xuất hiện trên git: commit `4ecb5cb` (2026-07-04, author **Grace Dory**, committer **GitHub**) — message `Add files via upload`, file nằm ở root repo.
- Chuyển vào `sounds/`: commit `633e95c` (2026-07-04) — message `âm thanh`.
- Bản hiện tại (đã trim kích thước): commit `f527171` (2026-07-04) — `Add files via upload`.
- **Không** có commit nào từ `cursoragent` / Claude / bot đụng tới các file `.wav` trong `sounds/`.
- Claude (02/07/2026) từng thêm *spoken praise* bằng **Web Speech API** trong code — đó **không** phải các file `.wav` này.
- WAV không có chunk `LIST/INFO` / software tag; format đồng nhất: PCM 16-bit, mono, 44100 Hz.
- `js/audio.js` ghi chú: *“file audio thu sẵn (sounds/)”* — khớp mục đích lồng tiếng khen.

> Ghi chú pháp lý riêng: quyền đối với **bản thu âm** thuộc nhà phát hành. Việc dùng từ khen (Cool…Godlike) trên UI vẫn có thể xem xét về mặt tương đồng wording với game khác — đó là vấn đề tên/cơ chế hiển thị, không phải bản quyền file âm thanh.

---

## Bảng chi tiết (10 file hiện có)

| Tên file | Nguồn gốc | Ngày tạo (git — lần đầu thêm) | Ngày bản hiện tại (git) | Ghi chú license / kỹ thuật |
|---|---|---|---|---|
| `amazing.wav` | tự thu âm (nhà phát hành) | 2026-07-04 (`4ecb5cb` upload root; `633e95c` → `sounds/`) | 2026-07-04 (`f527171`) | Sở hữu gốc nhà phát hành. PCM mono 44.1 kHz ~0.62s. Praise tier trong `PRAISE_SOUND_FILES`. |
| `cool.wav` | tự thu âm (nhà phát hành) | 2026-07-04 (`4ecb5cb`; có thêm `d119aff` Create rồi xóa `00cd41d`, sau đó lại có trong batch `633e95c`) | 2026-07-04 (`f527171`) | Sở hữu gốc nhà phát hành. PCM mono 44.1 kHz ~0.32s. |
| `godlike.wav` | tự thu âm (nhà phát hành) | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Sở hữu gốc nhà phát hành. PCM mono 44.1 kHz ~0.33s. |
| `good.wav` | tự thu âm (nhà phát hành) | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Sở hữu gốc nhà phát hành. PCM mono 44.1 kHz ~0.22s. |
| `great.wav` | tự thu âm (nhà phát hành) | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Sở hữu gốc nhà phát hành. PCM mono 44.1 kHz ~0.19s. |
| `impressive.wav` | tự thu âm (nhà phát hành) | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Sở hữu gốc nhà phát hành. PCM mono 44.1 kHz ~0.69s. |
| `legendary.wav` | tự thu âm (nhà phát hành) | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Sở hữu gốc nhà phát hành. PCM mono 44.1 kHz ~0.68s. |
| `perfect.wav` | tự thu âm (nhà phát hành) | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Sở hữu gốc nhà phát hành. PCM mono 44.1 kHz ~0.43s. |
| `spectacular.wav` | tự thu âm (nhà phát hành) | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Sở hữu gốc nhà phát hành. PCM mono 44.1 kHz ~0.72s. |
| `unreal.wav` | tự thu âm (nhà phát hành) | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | Sở hữu gốc nhà phát hành. PCM mono 44.1 kHz ~0.63s. |

---

## Nhóm 1 — Giọng đọc tự thu âm (voice recording gốc)

Toàn bộ 10 file ở bảng trên.  
Xác nhận: nhà phát hành (2026-07-25) — giọng của mình, tự thu âm.  
License / ownership: **sở hữu gốc của nhà phát triển**.

## Nhóm 2 — AI generate trong các lần chat trước

*(trống đối với file trong `sounds/`)*

Ghi chú liên quan (không phải file trong thư mục này):
- 2026-07-02: Claude thêm praise bằng **Web Speech API** (không tạo `.wav`).
- Các agent Cursor không tạo/sửa file trong `sounds/`.

## Nhóm 3 — Không rõ nguồn gốc

*(trống — đã xác nhận nhóm 1)*

---

## Lịch sử liên quan (không còn trong thư mục)

| Tên file | Trạng thái | Ghi chú |
|---|---|---|
| `not_bad.wav` | Đã xóa | Từng có trong batch 2026-07-04; xóa ở commit `6d4c4ba` (2026-07-09). Không còn trong `sounds/` hiện tại. |

---

## Cách dùng trong game

`js/audio.js` → `PRAISE_SOUND_FILES` / `speakPraise()`: phát file WAV tương ứng cấp khen combo (Cool → Godlike).
