# ASSETS_LICENSE — ChromaBlast / Chromblast

Ngày cập nhật: 2026-08-02 (rà lại lần 2 — xác minh license qua `npm view`, kiểm tra icon/nội dung game, đối chiếu font thực tế)  
Nguồn đối chiếu: `sounds/ASSET_SOURCES.md`, `package.json`, `index.html`, CSS/JS trong repo.

Tài liệu này liệt kê font, âm thanh, thư viện và dịch vụ bên thứ ba đang dùng.

### Tổng kết `sounds/`

| Nhóm | Số file |
|---|---:|
| Tự thu âm (voice recording gốc) | **9** |
| Nguồn chưa rõ / bên thứ ba | **0** |

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

**Credit đóng gói:** `fonts/OFL.txt` (toàn văn SIL OFL 1.1) + `fonts/FONT_CREDITS.md` (danh sách Nunito + font nickname).

---

## 2. Âm thanh trong `sounds/`

**`sounds/` — toàn bộ là giọng đọc tự thu âm bởi nhà phát triển, sở hữu gốc 100%, không dính license bên thứ ba.**

Phân loại theo `sounds/ASSET_SOURCES.md` (xác nhận nhà phát triển, 2026-07-25).  
Dùng làm lồng tiếng khen combo (`js/audio.js` → `PRAISE_SOUND_FILES`).

| File | Ownership |
|---|---|
| `sounds/amazing.wav` | Tự thu âm — sở hữu gốc nhà phát triển |
| `sounds/cool.wav` | Tự thu âm — sở hữu gốc nhà phát triển |
| `sounds/good.wav` | Tự thu âm — sở hữu gốc nhà phát triển |
| `sounds/great.wav` | Tự thu âm — sở hữu gốc nhà phát triển |
| `sounds/impressive.wav` | Tự thu âm — sở hữu gốc nhà phát triển |
| `sounds/legendary.wav` | Tự thu âm — sở hữu gốc nhà phát triển |
| `sounds/perfect.wav` | Tự thu âm — sở hữu gốc nhà phát triển |
| `sounds/spectacular.wav` | Tự thu âm — sở hữu gốc nhà phát triển |
| `sounds/unreal.wav` | Tự thu âm — sở hữu gốc nhà phát triển |

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
Chi tiết + `OFL.txt`: xem `fonts/FONT_CREDITS.md`.

---

## 4. Thư viện / SDK / dịch vụ bên ngoài

### 4.1. CDN trong `index.html`

| Tài nguyên | URL / phiên bản | Mục đích | License / điều khoản |
|---|---|---|---|
| Firebase App (compat) | `https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js` | Backend app | [Firebase / Google Terms](https://firebase.google.com/terms) |
| Firebase Auth (compat) | `…/firebase-auth-compat.js` | Đăng nhập | như trên |
| Firebase Firestore (compat) | `…/firebase-firestore-compat.js` | Database online | như trên |

Không thấy `<link>` tới Google Fonts CDN trong `index.html` (font đã bundle offline).  
`privacy-policy.html` đã mô tả font offline (cập nhật 25/07/2026).

### 4.2. npm / Capacitor (`package.json`)

| Gói | Vai trò | License (npm điển hình) |
|---|---|---|
| `@capacitor/core` | Runtime Capacitor | MIT |
| `@capacitor/android` | Build Android | MIT |
| `@capacitor/app` | Vòng đời app | MIT |
| `@capacitor/cli` (dev) | CLI | MIT |
| `@capacitor-community/admob` | Quảng cáo AdMob | MIT (plugin); nội dung QC theo **Google AdMob** |
| `@capgo/capacitor-social-login` | Google Sign-In native | **MPL-2.0** (xác minh qua `npm view`, 2026-08-02) — dùng nguyên gói qua npm (không sửa source của thư viện) thì an toàn cho app đóng gói/thương mại: chỉ cần giữ notice license, không bắt buộc mở nguồn code riêng của app. Google Sign-In (dịch vụ) theo điều khoản Google. |

### 4.2b. Cloud Functions (`functions/package.json`)

| Gói | Vai trò | License (xác minh qua `npm view`, 2026-08-02) |
|---|---|---|
| `firebase-admin` | SDK server-side (kiểm duyệt chat) | Apache-2.0 |
| `firebase-functions` | Runtime Cloud Functions | MIT |

### 4.3. API runtime trong JS (không phải asset đóng gói)

| API | File | Mục đích | Ghi chú |
|---|---|---|---|
| MyMemory Translated | `js/chat.js` | Dịch chat (chính) | Theo điều khoản MyMemory |
| LibreTranslate (Argos public) | `js/chat.js` | Dịch chat (fallback) | Instance công khai; theo điều khoản nhà vận hành |

### 4.4. Icon / hình ảnh / UI khác

| Loại | Nguồn trong project | Ghi chú |
|---|---|---|
| Icon app / splash | `resources/icon.png`, `resources/splash.png`, `resources/splash-dark.png`, `resources/play-store/` | Coi là asset nhà phát triển trừ khi có nguồn khác — cần xác nhận provenance |
| Icon nút menu / UI | Emoji Unicode trong HTML/JS (🛒 🤝 ⚙️ …) | Emoji là ký tự Unicode do font hệ thống vẽ — không phải file icon bên thứ ba trong repo |
| SVG trang trí vòng quay | Inline SVG trong `index.html` (`spin-vine-svg`, …) | Coi là mã/đồ họa trong repo — xác nhận sở hữu nhà phát triển nếu tự vẽ |
| Liên kết mạng xã hội | `index.html` (TikTok/Discord/X/Facebook/YouTube) | Chỉ là URL ngoài; logo hiển thị bằng ký tự/text CSS, không nhúng file trademark riêng |

---

## 5. Âm thanh tổng hợp trong code (không phải file `sounds/`)

`js/audio.js` tạo SFX/BGM bằng **Web Audio API** (oscillator / noise) — mã nguồn trong repo, không dùng sample WAV bên ngoài cho phần đó.  
Praise bằng file WAV ở mục 2.

---

## 6. Checklist trước phát hành

- [x] Xác nhận `sounds/` — 9 file tự thu âm, sở hữu gốc nhà phát triển (2026-07-25; đã bỏ `godlike.wav`)
- [x] OFL credit: `fonts/OFL.txt` + `fonts/FONT_CREDITS.md` — đối chiếu file thực tế trong `fonts/nick/` khớp 100% với bảng credit (2026-08-02)
- [x] Đồng bộ `privacy-policy.html` (Firebase / AdMob / Sign-In / dịch chat / font offline)
- [x] Data safety guide: `PLAY_STORE_DATA_SAFETY.md`
- [x] Dịch chat: bỏ gtx — MyMemory + LibreTranslate
- [x] Rà tên nhân vật/boss/map/skin trong game — không trùng IP có sẵn (Pokémon, Disney, v.v.), toàn bộ là tên chung chung (2026-08-02)
- [x] Rà icon app/splash — phong cách nhất quán, không trùng nhân vật/mascot có sẵn nào mà mình nhận ra được; **vẫn cần nhà phát triển tự xác nhận nguồn gốc vẽ/tạo** (ảnh không có metadata phần mềm) (2026-08-02)
- [x] Link mạng xã hội (`index.html`) — chỉ là URL + ký tự Unicode/CSS, không nhúng file logo thương hiệu nào (2026-08-02)
- [ ] Rà lại form Data safety trên Play Console trước khi submit
