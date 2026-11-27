'use strict';
// Copies the self-hosted Noto Sans files from node_modules into public/fonts so the app works offline.
// Runs on npm install (postinstall) and again before start, so Docker and local runs both have the fonts.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'fonts');
const wanted = [
  ['noto-sans', 'noto-sans-latin'],
  ['noto-sans-telugu', 'noto-sans-telugu-telugu'],
  ['noto-sans-devanagari', 'noto-sans-devanagari-devanagari'],
  ['noto-sans-tamil', 'noto-sans-tamil-tamil'],
];
fs.mkdirSync(out, { recursive: true });
let copied = 0;
for (const [pkg, prefix] of wanted) {
  const dir = path.join(root, 'node_modules', '@fontsource', pkg, 'files');
  if (!fs.existsSync(dir)) { console.warn(`fonts: ${pkg} not installed, using system fonts`); continue; }
  for (const w of [400, 500, 700]) {
    const file = `${prefix}-${w}-normal.woff2`;
    const src = path.join(dir, file);
    if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(out, file)); copied++; }
  }
}
console.log(`fonts: ${copied} files in public/fonts`);
