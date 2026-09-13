// Root policy documents must be explicitly included in the Expo web export.
// Emit directory routes as well as .html URLs so static hosting needs no JS.
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.argv[2] || 'dist');
for (const page of ['delete-account', 'privacy-policy']) {
  const source = resolve(root, `${page}.html`);
  mkdirSync(resolve(output, page), { recursive: true });
  copyFileSync(source, resolve(output, `${page}.html`));
  copyFileSync(source, resolve(output, page, 'index.html'));
}
