// Gom các file game tĩnh vào www/ để Capacitor đóng gói vào APK.
// Chạy: npm run build:www
//
// TỐI ƯU HIỆU SUẤT (thêm 25/07/26):
// - Minify toàn bộ .js và .css bằng esbuild trước khi đóng gói.
// - Minify TỪNG FILE RIÊNG LẺ (không gộp/bundle chung 1 file) vì các file
//   js/*.js và maps/*.js là plain <script> — không phải ES module — và
//   CHIA SẺ GLOBAL SCOPE có chủ đích (xem comment đầu js/engine.js).
//   Gộp chung sẽ có rủi ro đụng tên biến top-level giữa các file, nên chỉ
//   minify (bỏ khoảng trắng/comment, rút gọn tên biến local) mà vẫn giữ
//   nguyên số lượng thẻ <script> và thứ tự nạp trong index.html.
// - Kết quả: giảm dung lượng JS/CSS đáng kể (không đổi hành vi runtime),
//   giảm thời gian parse khi WebView khởi động app trên máy yếu.
// - sounds/ (.wav) và fonts/ (.woff2) là binary/audio, không qua minify — chỉ copy nguyên.
import { rmSync, mkdirSync, cpSync, readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as esbuild from 'esbuild';

const items = ['index.html', 'main.css', 'sky-atmosphere.css', 'nick-fonts.css', 'brick-skins.css', 'map-boards.css', 'saga-map.css', 'js', 'maps', 'fonts', 'sounds', 'terms-of-service.html', 'privacy-policy.html'];
// terms-of-service.html + privacy-policy.html thêm 28/07/26: js/ui.js gọi
// window.open('terms-of-service.html') / ('privacy-policy.html') ở cả web lẫn
// app — thiếu 2 file này trong www/ thì 2 nút Điều khoản/Chính sách trong APK
// sẽ mở ra trang trống (file không tồn tại trong bundle).
rmSync('www', { recursive: true, force: true });
mkdirSync('www', { recursive: true });
for (const it of items) cpSync(it, 'www/' + it, { recursive: true });

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, out);
    else if (exts.some(e => name.endsWith(e))) out.push(p);
  }
  return out;
}

let beforeTotal = 0, afterTotal = 0;

// --- Minify JS (mỗi file riêng, giữ nguyên global scope giữa các <script>) ---
const jsFiles = [...walk('www/js', ['.js']), ...walk('www/maps', ['.js'])];
for (const file of jsFiles) {
  const src = readFileSync(file, 'utf8');
  beforeTotal += Buffer.byteLength(src);
  try {
    const { code } = esbuild.transformSync(src, {
      loader: 'js',
      minify: true,
      target: 'es2019', // an toàn cho WebView Android hiện hành
    });
    afterTotal += Buffer.byteLength(code);
    writeFileSync(file, code);
  } catch (err) {
    console.warn(`⚠️  Bỏ qua minify (giữ nguyên bản gốc): ${file}\n   ${err.message.split('\n')[0]}`);
    afterTotal += Buffer.byteLength(src);
  }
}

// --- Minify CSS ---
const cssFiles = walk('www', ['.css']);
for (const file of cssFiles) {
  const src = readFileSync(file, 'utf8');
  beforeTotal += Buffer.byteLength(src);
  try {
    const { code } = esbuild.transformSync(src, { loader: 'css', minify: true });
    afterTotal += Buffer.byteLength(code);
    writeFileSync(file, code);
  } catch (err) {
    console.warn(`⚠️  Bỏ qua minify (giữ nguyên bản gốc): ${file}\n   ${err.message.split('\n')[0]}`);
    afterTotal += Buffer.byteLength(src);
  }
}

const pct = (100 - (afterTotal / beforeTotal) * 100).toFixed(1);
console.log('www/ built:', items.join(', '));
console.log(`Minify JS+CSS: ${(beforeTotal/1024).toFixed(0)}KB → ${(afterTotal/1024).toFixed(0)}KB (giảm ${pct}%)`);

// --- Cache-busting cho CSS (thêm 29/07/26) ---
// Trước đây www/index.html trỏ <link href="main.css"> không có version, nên sau khi
// deploy, trình duyệt/app có thể vẫn phục vụ bản CSS cache cũ (đặc biệt trên
// GitHub Pages/CDN) — sửa CSS xong test không thấy đổi dù đã push đúng. Giờ mỗi lần
// build sẽ gắn ?v=<hash nội dung file> vào các thẻ <link> CSS cục bộ trong
// www/index.html, hash đổi khi nội dung đổi → trình duyệt luôn tải bản mới.
const htmlPath = 'www/index.html';
let html = readFileSync(htmlPath, 'utf8');
const localCssHrefs = [...html.matchAll(/href="([^"?]+\.css)"/g)].map(m => m[1]);
for (const href of new Set(localCssHrefs)) {
  const filePath = path.join('www', href);
  try {
    const hash = createHash('sha1').update(readFileSync(filePath)).digest('hex').slice(0, 8);
    html = html.split(`href="${href}"`).join(`href="${href}?v=${hash}"`);
  } catch (err) {
    console.warn(`⚠️  Bỏ qua cache-busting cho ${href}: ${err.message.split('\n')[0]}`);
  }
}
writeFileSync(htmlPath, html);
console.log('Cache-busting: đã gắn ?v=hash vào', [...new Set(localCssHrefs)].join(', '));