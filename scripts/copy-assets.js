'use strict';
// Copies self-hosted fonts and the smooth scroll script from node_modules into public/ so the app
// works offline with no build step. Runs on npm install (postinstall), before start, and in Docker.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'fonts');
const wanted = [
  ['noto-sans', 'noto-sans-latin'],
  ['noto-sans-telugu', 'noto-sans-telugu-telugu'],
  ['noto-sans-devanagari', 'noto-sans-devanagari-devanagari'],
  ['noto-sans-tamil', 'noto-sans-tamil-tamil'],
  ['noto-sans-kannada', 'noto-sans-kannada-kannada'],
  ['noto-sans-malayalam', 'noto-sans-malayalam-malayalam'],
  ['noto-sans-bengali', 'noto-sans-bengali-bengali'],
  ['noto-sans-gujarati', 'noto-sans-gujarati-gujarati'],
  ['noto-sans-gurmukhi', 'noto-sans-gurmukhi-gurmukhi'],
  ['noto-sans-oriya', 'noto-sans-oriya-oriya'],
  ['newsreader', 'newsreader-latin'],
];
fs.mkdirSync(out, { recursive: true });
let copied = 0;
for (const [pkg, prefix] of wanted) {
  const dir = path.join(root, 'node_modules', '@fontsource', pkg, 'files');
  if (!fs.existsSync(dir)) { console.warn(`fonts: ${pkg} not installed, using system fonts`); continue; }
  for (const w of [400, 500, 700]) {
    for (const style of ['normal', 'italic']) {
      const file = `${prefix}-${w}-${style}.woff2`;
      const src = path.join(dir, file);
      if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(out, file)); copied++; }
    }
  }
}
console.log(`fonts: ${copied} files in public/fonts`);

const vendor = path.join(root, 'public', 'vendor');
fs.mkdirSync(vendor, { recursive: true });
const lenis = path.join(root, 'node_modules', 'lenis', 'dist', 'lenis.min.js');
if (fs.existsSync(lenis)) { fs.copyFileSync(lenis, path.join(vendor, 'lenis.min.js')); console.log('vendor: lenis.min.js in public/vendor'); }
else console.warn('vendor: lenis not installed, native scrolling is used');
