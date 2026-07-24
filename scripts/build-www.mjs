// Gom các file game tĩnh vào www/ để Capacitor đóng gói vào APK.
// Chạy: npm run build:www
import { rmSync, mkdirSync, cpSync } from 'node:fs';
const items = ['index.html', 'main.css', 'nick-fonts.css', 'brick-skins.css', 'map-boards.css', 'js', 'maps', 'fonts'];
rmSync('www', { recursive: true, force: true });
mkdirSync('www', { recursive: true });
for (const it of items) cpSync(it, 'www/' + it, { recursive: true });
console.log('www/ built:', items.join(', '));
