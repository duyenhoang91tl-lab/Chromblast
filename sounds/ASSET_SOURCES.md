# Báo cáo nguồn gốc asset — `sounds/`

Ngày lập: 2026-07-25  
Cập nhật: 2026-07-25 — xác nhận nhà phát triển: giọng tự thu âm; đã gỡ `godlike.wav` khỏi game.  
Phạm vi: toàn bộ file hiện có trong `sounds/`.

## Tóm tắt phân loại

| Nhóm | Số file | Kết luận |
|---|---:|---|
| 1. Giọng đọc tự thu âm (voice recording gốc) | **9** | Sở hữu của nhà phát triển |
| 2. Không rõ nguồn gốc | **0** | — |

### Xác nhận sở hữu
- **Nhà phát triển xác nhận (2026-07-25):** các file `.wav` trong `sounds/` là giọng đọc do nhà phát triển tự thu âm — sở hữu gốc 100%, không license bên thứ ba.
- Lịch sử git: lần đầu upload `4ecb5cb` (2026-07-04) → chuyển vào `sounds/` ở `633e95c` → bản trim hiện tại `f527171`.
- Không có commit agent/bot tạo hoặc sửa các file `.wav` này (trừ khi xóa theo yêu cầu nhà phát triển).
- Format kỹ thuật đồng nhất: PCM 16-bit, mono, 44100 Hz (không có metadata software tag).

---

## Bảng chi tiết (9 file hiện có)

| Tên file | Nguồn gốc | Ngày tạo (git — lần đầu thêm) | Ngày bản hiện tại (git) | Ghi chú |
|---|---|---|---|---|
| `amazing.wav` | tự thu âm (voice recording gốc) — sở hữu của nhà phát triển | 2026-07-04 (`4ecb5cb`; `633e95c` → `sounds/`) | 2026-07-04 (`f527171`) | PCM mono 44.1 kHz ~0.62s. Praise tier trong `PRAISE_SOUND_FILES`. |
| `cool.wav` | tự thu âm (voice recording gốc) — sở hữu của nhà phát triển | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | PCM mono 44.1 kHz ~0.32s. |
| `good.wav` | tự thu âm (voice recording gốc) — sở hữu của nhà phát triển | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | PCM mono 44.1 kHz ~0.22s. |
| `great.wav` | tự thu âm (voice recording gốc) — sở hữu của nhà phát triển | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | PCM mono 44.1 kHz ~0.19s. |
| `impressive.wav` | tự thu âm (voice recording gốc) — sở hữu của nhà phát triển | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | PCM mono 44.1 kHz ~0.69s. |
| `legendary.wav` | tự thu âm (voice recording gốc) — sở hữu của nhà phát triển | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | PCM mono 44.1 kHz ~0.68s. |
| `perfect.wav` | tự thu âm (voice recording gốc) — sở hữu của nhà phát triển | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | PCM mono 44.1 kHz ~0.43s. |
| `spectacular.wav` | tự thu âm (voice recording gốc) — sở hữu của nhà phát triển | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | PCM mono 44.1 kHz ~0.72s. |
| `unreal.wav` | tự thu âm (voice recording gốc) — sở hữu của nhà phát triển | 2026-07-04 (`4ecb5cb` / `633e95c`) | 2026-07-04 (`f527171`) | PCM mono 44.1 kHz ~0.63s. |

---

## Nhóm 1 — Giọng đọc tự thu âm (voice recording gốc)

Toàn bộ 9 file ở bảng trên.  
Sở hữu gốc 100% của nhà phát triển.

## Nhóm 2 — Không rõ nguồn gốc

*(trống — 0 file)*

---

## Lịch sử liên quan (không còn trong thư mục)

| Tên file | Trạng thái | Ghi chú |
|---|---|---|
| `not_bad.wav` | Đã xóa | Từng có trong batch 2026-07-04; xóa ở commit `6d4c4ba` (2026-07-09). |
| `godlike.wav` | Đã xóa | Từng dùng làm cấp khen cao nhất; gỡ khỏi game theo yêu cầu nhà phát triển (2026-07-25). |

---

## Cách dùng trong game

`js/audio.js` → `PRAISE_SOUND_FILES` / `speakPraise()`: phát file WAV tương ứng cấp khen combo (Cool → Legendary).
