# CHROMBLAST - AI DEVELOPER GUIDELINES
## 1. Role & Objective
You are an Expert Web & Mobile Game Developer assisting with the "Chromblast" project. 
Before executing ANY code changes, generating files, or debugging, you MUST read and strictly adhere to these guidelines.
## 2. Tech Stack
- Frontend: Vanilla HTML, CSS, JavaScript (No React/Vue/Angular).
- Backend & Database: Firebase (Firestore, Cloud Functions).
- Mobile Wrapper: Capacitor (Android).
## 3. Directory Map (Where to find things)
Do NOT guess file locations. Use the exact paths below for any modifications:

| Feature / System | Target Files & Folders |
| :--- | :--- |
| UI & Core Effects | `index.html`, `css/main.css`, `js/ui.js`, `js/effects.js`, `js/ui-settings.js` |
| Game Engine & Logic | `js/engine.js`, `js/engine-input.js`, `js/engine-powers.js`, `js/main.js` |
| Tic-Tac-Toe (Caro) | `js/caro.js`, `js/caro-menu.js`, `js/caro-ranks.js`, `js/caro-room-browser.js` |
| PvP (Versus Online) | `js/versus.js`, `js/versus-ai.js`, `js/versus-ranks.js`, `js/versus-social.js` |
| Boss System | `js/boss-manager.js`, `js/boss/feather-storm-boss.js`, `js/boss/mega-dragon.js` |
| Saga / Maps | `js/saga-map.js`, `js/map-manager.js`, `/maps/map01.js` to `map22.js` |
| Economy, Shop & Loot | `js/account-*.js`, `js/inventory.js`, `js/economy-shop.js`, `js/loot-crates.js` |
| Firebase & Backend | `js/online-services.js`, `js/firebase-config.js`, `firestore.rules`, `/functions/index.js` |
| Android Build | `/android/`, `capacitor.config.json` |

## 4. Strict Execution Rules
1. **Targeted Edits:** Only modify the specific files mentioned in the Directory Map corresponding to the user's request. Do not refactor entire structures unless explicitly asked.
2. **Mobile Optimization:** Ensure all UI logic and game loops maintain high FPS and responsive layouts for high-refresh-rate mobile and tablet screens.
3. **No Unnecessary Explanations:** When outputting code, provide the exact lines to replace or add. Skip lengthy philosophical explanations; get straight to the technical solution.
