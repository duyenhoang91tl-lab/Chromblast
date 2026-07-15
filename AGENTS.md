# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
ChromaBlast is a **vanilla HTML/CSS/JS color-block puzzle game** (`index.html`, `main.css`,
`js/`, `maps/`, `fonts/`, `sounds/`). It is fully client-side — game state, auth
(register/login), saves, and the leaderboard all use `localStorage`, and there is **no backend
or network call** in the game itself. Capacitor is used only to package the same web assets into
an Android app.

### Running the game (dev)
- Serve the repo root with any static file server and open `index.html`, e.g.
  `python3 -m http.server 8080` then browse to `http://localhost:8080/index.html`.
- No login is needed to play: click **"▶ CHƠI NGAY (KHÔNG CẦN ĐĂNG NHẬP)"** (guest play) →
  **"▶ START GAME"** to reach the board. It's a drag-and-drop block puzzle (drag pieces from the
  bottom tray onto the 8×8 grid).

### Build / package
- `npm run build:www` copies the web assets into `www/` (what Capacitor bundles). `www/` is
  git-ignored and regenerated each run — do not edit it by hand.
- `npm run cap:sync` runs `build:www` then `npx cap sync android`.
- The native Android build (`android/gradlew assembleDebug` / `bundleRelease`) needs the Android
  SDK + JDK 21 and is **not** part of the web dev loop; CI handles it
  (`.github/workflows/android-build.yml`). CI also deploys the game to GitHub Pages
  (`.github/workflows/pages.yml`).

### Lint / test
There is no lint config and no automated test suite in this repo.

### Dependencies
`npm install` (Capacitor CLI + plugins) is only needed for the build/package commands, not to
play the game. It is handled by the Cloud environment update script.
