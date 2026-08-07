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

const items = ['index.html', 'css', 'js', 'maps', 'fonts', 'sounds', 'terms-of-service.html', 'privacy-policy.html'];
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

// --- Cache-busting tự động theo hash nội dung (CSS: từ 29/07/26; JS: từ hôm nay) ---
// Trước đây www/index.html trỏ <link href="main.css"> / <script src="js/x.js">
// không có version, hoặc dùng version ghi TAY (?v=20260801x) — dễ quên tăng khi
// sửa file, khiến trình duyệt/app tiếp tục phục vụ bản CACHE CŨ dù server đã có
// bản mới (đã xảy ra thật với js/online-ui.js + js/versus.js, khiến 1 bản vá lỗi
// Đấu 1-1 online không đến được người chơi dù đã push). Giờ MỌI lần build sẽ tự
// gắn ?v=<hash nội dung file, 8 ký tự> vào TẤT CẢ thẻ <link>/<script> trỏ file
// .css/.js CỤC BỘ trong www/index.html — hash đổi khi và chỉ khi nội dung file
// đổi, nên không cần ai nhớ tăng version tay nữa. Script CDN ngoài (gstatic.com…)
// không khớp pattern (chỉ bắt href/src bắt đầu bằng ký tự thường, không phải
// "http") nên không bị đụng vào.
const htmlPath = 'www/index.html';
let html = readFileSync(htmlPath, 'utf8');

function cacheBustAttr(html, attr, exts) {
  const extPattern = exts.map(e => e.replace('.', '\\.')).join('|');
  const re = new RegExp(`${attr}="([a-zA-Z0-9_./-]+(?:${extPattern}))(\\?v=[a-zA-Z0-9]+)?"`, 'g');
  const touched = new Set();
  html = html.replace(re, (whole, filePath) => {
    const diskPath = path.join('www', filePath);
    try {
      const hash = createHash('sha1').update(readFileSync(diskPath)).digest('hex').slice(0, 8);
      touched.add(filePath);
      return `${attr}="${filePath}?v=${hash}"`;
    } catch (err) {
      console.warn(`⚠️  Bỏ qua cache-busting cho ${filePath}: ${err.message.split('\n')[0]}`);
      return whole;
    }
  });
  return { html, touched };
}

({ html } = cacheBustAttr(html, 'href', ['.css']));
const jsResult = cacheBustAttr(html, 'src', ['.js']);
html = jsResult.html;

writeFileSync(htmlPath, html);
console.log('Cache-busting (hash nội dung): CSS + ' + jsResult.touched.size + ' file JS (js/ + maps/).');