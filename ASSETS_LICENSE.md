# ASSETS_LICENSE — ChromaBlast / Chromblast

Ngày cập nhật: 2026-07-25  
Nguồn đối chiếu: `sounds/ASSET_SOURCES.md`, `package.json`, `index.html`, CSS/JS trong repo.

Tài liệu này liệt kê font, âm thanh, thư viện và dịch vụ bên thứ ba đang dùng.  
**Không** thay thế tư vấn pháp lý; cần review trước khi phát hành CH Play / bản thương mại.

---

## 1. Font Nunito (UI chính)

| Mục | Chi tiết |
|---|---|
| File | `fonts/nunito-latin.woff2`, `fonts/nunito-vietnamese.woff2` |
| Nạp qua | `@font-face` trong `main.css` (offline, không CDN) |
| License | **SIL Open Font License 1.1 (OFL)** |
| Credit (theo OFL) | **Nunito** Copyright © 2014 The Nunito Project Authors  
  ([https://github.com/googlefonts/nunito](https://github.com/googlefonts/nunito))  
  This Font Software is licensed under the SIL Open Font License, Version 1.1.  
  License text: [https://openfontlicense.org](https://openfontlicense.org) / [OFL.txt](https://scripts.sil.org/OFL) |

OFL cho phép nhúng font vào app/game (kể cả thương mại), miễn là:
- không bán font đơn lẻ;
- giữ notice/license khi phân phối lại font;
- không dùng tên dành riêng của font theo cách gây nhầm lẫn về nguồn gốc (Reserved Font Name — xem OFL).

---

## 2. Âm thanh trong `sounds/`

Phân loại theo `sounds/ASSET_SOURCES.md` (bằng chứng git/metadata tại thời điểm 2026-07-25).

### 2.1. Âm thanh AI-generated (theo ASSET_SOURCES.md)

**Danh sách hiện tại: trống (0 file).**  
`ASSET_SOURCES.md` không xác nhận file `.wav` nào do AI tạo trong các lần chat Cursor/Claude.

Khi có file được xác nhận là AI-generated, ghi nhận theo mẫu:

> Tạo bằng AI hỗ trợ trong Cursor, Claude chưa xác minh thương mại — cần review trước khi phát hành.

### 2.2. Giọng đọc tự thu âm (voice recording gốc)

**Danh sách hiện tại: trống (0 file).**  
Chưa có bằng chứng git/metadata đủ để khẳng định file nào là bạn tự thu.

Khi có file được xác nhận là tự thu âm, ghi nhận:

> Sở hữu gốc của nhà phát triển.

### 2.3. Âm thanh — nguồn chưa rõ (đang dùng trong game)

Theo `ASSET_SOURCES.md`, **toàn bộ 10 file** hiện có thuộc nhóm này.  
Dùng làm lồng tiếng khen combo (`js/audio.js` → `PRAISE_SOUND_FILES`).

| File | Ghi chú license / rủi ro |
|---|---|
| `sounds/amazing.wav` | Nguồn chưa rõ — **cần review trước khi phát hành** |
| `sounds/cool.wav` | Nguồn chưa rõ — **cần review trước khi phát hành** |
| `sounds/godlike.wav` | Nguồn chưa rõ — **cần review trước khi phát hành** |
| `sounds/good.wav` | Nguồn chưa rõ — **cần review trước khi phát hành** |
| `sounds/great.wav` | Nguồn chưa rõ — **cần review trước khi phát hành** |
| `sounds/impressive.wav` | Nguồn chưa rõ — **cần review trước khi phát hành** |
| `sounds/legendary.wav` | Nguồn chưa rõ — **cần review trước khi phát hành** |
| `sounds/perfect.wav` | Nguồn chưa rõ — **cần review trước khi phát hành** |
| `sounds/spectacular.wav` | Nguồn chưa rõ — **cần review trước khi phát hành** |
| `sounds/unreal.wav` | Nguồn chưa rõ — **cần review trước khi phát hành** |

Nếu sau này xác nhận file nào là AI-generated: áp dụng disclaimer ở mục 2.1.  
Nếu xác nhận tự thu âm: chuyển sang mục 2.2 — *sở hữu gốc của nhà phát triển*.

Chi tiết provenance: xem `sounds/ASSET_SOURCES.md`.

---

## 3. Font nickname khác (local `fonts/nick/` + `nick-fonts.css`)

Nạp offline qua `nick-fonts.css` (không `<link>` Google Fonts trong `index.html`).  
Các họ font Google Fonts / OFL thường gặp — cần giữ credit OFL khi phân phối font:

| Font | File (ví dụ) | License (thường gặp) |
|---|---|---|
| Be Vietnam Pro | `fonts/nick/be-vietnam-pro-700-*.woff2` | OFL 1.1 |
| Caveat | `fonts/nick/caveat-600-*.woff2` | OFL 1.1 |
| Comfortaa | `fonts/nick/comfortaa-700-*.woff2` | OFL 1.1 |
| Dancing Script | `fonts/nick/dancing-script-700-*.woff2` | OFL 1.1 |
| Fredoka | `fonts/nick/fredoka-600-*.woff2` | OFL 1.1 |
| Josefin Sans | `fonts/nick/josefin-sans-600-*.woff2` | OFL 1.1 |
| Lobster | `fonts/nick/lobster-400-*.woff2` | OFL 1.1 |
| Pacifico | `fonts/nick/pacifico-400-*.woff2` | OFL 1.1 |
| Quicksand | `fonts/nick/quicksand-700-*.woff2` | OFL 1.1 |
| Righteous | `fonts/nick/righteous-400-*.woff2` | OFL 1.1 |

Credit gộp (OFL): mỗi font thuộc dự án Google Fonts / tác giả tương ứng; phân phối theo SIL Open Font License 1.1.  
Danh sách dùng trong UI: `js/player-profile.js` → `NICK_FONTS`.

---

## 4. Thư viện / SDK / dịch vụ bên ngoài

### 4.1. CDN trong `index.html`

| Tài nguyên | URL / phiên bản | Mục đích | License / điều khoản |
|---|---|---|---|
| Firebase App (compat) | `https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js` | Backend app | [Firebase / Google Terms](https://firebase.google.com/terms) |
| Firebase Auth (compat) | `…/firebase-auth-compat.js` | Đăng nhập | như trên |
| Firebase Firestore (compat) | `…/firebase-firestore-compat.js` | Database online | như trên |

Không thấy `<link>` tới Google Fonts CDN trong `index.html` (font đã bundle offline).  
`privacy-policy.html` vẫn còn câu “tải phông chữ từ Google Fonts” — **lệch thực tế hiện tại**, nên cập nhật riêng khi sửa policy.

### 4.2. npm / Capacitor (`package.json`)

| Gói | Vai trò | License (npm điển hình) |
|---|---|---|
| `@capacitor/core` | Runtime Capacitor | MIT |
| `@capacitor/android` | Build Android | MIT |
| `@capacitor/app` | Vòng đời app | MIT |
| `@capacitor/cli` (dev) | CLI | MIT |
| `@capacitor-community/admob` | Quảng cáo AdMob | MIT (plugin); nội dung QC theo **Google AdMob** |
| `@capgo/capacitor-social-login` | Google Sign-In native | Xem license gói Capgo; Google Sign-In theo điều khoản Google |

### 4.3. API runtime trong JS (không phải asset đóng gói)

| API | File | Mục đích | Ghi chú |
|---|---|---|---|
| Google Translate (gtx unofficial) | `js/chat.js` | Dịch chat | Endpoint không chính thức — rủi ro ToS/ổn định; cân nhắc thay bằng API có license |
| MyMemory Translated | `js/chat.js` | Fallback dịch | Theo điều khoản MyMemory |

### 4.4. Icon / hình ảnh / UI khác

| Loại | Nguồn trong project | Ghi chú |
|---|---|---|
| Icon app / splash | `resources/icon.png`, `resources/splash.png`, `resources/splash-dark.png`, `resources/play-store/` | Coi là asset nhà phát triển trừ khi có nguồn khác — cần xác nhận provenance |
| Icon nút menu / UI | Emoji Unicode trong HTML/JS (🛒 🤝 🧱 …) | Emoji là ký tự Unicode do font hệ thống vẽ — không phải file icon bên thứ ba trong repo |
| SVG trang trí vòng quay | Inline SVG trong `index.html` (`spin-vine-svg`, …) | Coi là mã/đồ họa trong repo — xác nhận sở hữu nhà phát triển nếu tự vẽ / AI-assisted |
| Liên kết mạng xã hội | `index.html` (TikTok/Discord/X/Facebook/YouTube) | Chỉ là URL ngoài; logo hiển thị bằng ký tự/text CSS, không nhúng file trademark riêng |

---

## 5. Âm thanh tổng hợp trong code (không phải file `sounds/`)

`js/audio.js` tạo SFX/BGM bằng **Web Audio API** (oscillator / noise) — mã nguồn trong repo, không dùng sample WAV bên ngoài cho phần đó.  
Praise bằng file WAV ở mục 2; trước đây Claude từng thử **Web Speech API** (không còn là file trong `sounds/`).

---

## 6. Checklist trước phát hành

- [ ] Xác nhận từng file trong `sounds/` (tự thu / AI / mua stock) và cập nhật mục 2 + `ASSET_SOURCES.md`
- [ ] Giữ OFL credit cho Nunito + font nickname khi phân phối font
- [ ] Rà điều khoản Firebase, AdMob, Google Sign-In cho Data safety / Privacy
- [ ] Quyết định giữ hay thay API dịch chat (Google gtx / MyMemory)
- [ ] Đồng bộ `privacy-policy.html` với việc font đã offline
