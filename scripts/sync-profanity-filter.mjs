// Đồng bộ functions/profanity-filter.js từ js/profanity-filter.js.
// Nguồn duy nhất cần sửa là js/profanity-filter.js — file trong
// functions/ được sinh tự động (predeploy hook trong firebase.json),
// không sửa tay để tránh 2 bản lệch nhau.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'js', 'profanity-filter.js');
const dest = join(root, 'functions', 'profanity-filter.js');

const banner = '// File này được sinh tự động từ js/profanity-filter.js\n' +
  '// (chạy scripts/sync-profanity-filter.mjs). Không sửa tay ở đây.\n\n';

copyFileSync(src, dest);
writeFileSync(dest, banner + readFileSync(dest, 'utf8'));

console.log('Đã đồng bộ functions/profanity-filter.js từ js/profanity-filter.js');
