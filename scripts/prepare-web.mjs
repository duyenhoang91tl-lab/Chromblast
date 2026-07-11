import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const webDir = join(root, 'www');
const excluded = new Set([
  '.git', '.github', 'android', 'node_modules', 'www',
  'package.json', 'package-lock.json', 'capacitor.config.ts',
  'PLAY_STORE_RELEASE.md', 'privacy-policy.html', '.gitignore'
]);

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name)) continue;
  await cp(join(root, entry.name), join(webDir, entry.name), { recursive: true });
}

console.log('Web assets copied to www/.');
