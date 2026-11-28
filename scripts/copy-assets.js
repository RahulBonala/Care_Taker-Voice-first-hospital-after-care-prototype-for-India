'use strict';
// Copies self-hosted fonts and the smooth scroll script from node_modules into public/ so the app
// works offline with no build step. Runs on npm install (postinstall), before start, and in Docker.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'fonts');
const wanted = [
  ['noto-sans', 'noto-sans-latin', 'Noto Sans'],
  ['noto-sans-telugu', 'noto-sans-telugu-telugu', 'Noto Sans Telugu'],
  ['noto-sans-devanagari', 'noto-sans-devanagari-devanagari', 'Noto Sans Devanagari'],
  ['noto-sans-tamil', 'noto-sans-tamil-tamil', 'Noto Sans Tamil'],
  ['noto-sans-kannada', 'noto-sans-kannada-kannada', 'Noto Sans Kannada'],
  ['noto-sans-malayalam', 'noto-sans-malayalam-malayalam', 'Noto Sans Malayalam'],
  ['noto-sans-bengali', 'noto-sans-bengali-bengali', 'Noto Sans Bengali'],
  ['noto-sans-gujarati', 'noto-sans-gujarati-gujarati', 'Noto Sans Gujarati'],
  ['noto-sans-gurmukhi', 'noto-sans-gurmukhi-gurmukhi', 'Noto Sans Gurmukhi'],
  ['noto-sans-oriya', 'noto-sans-oriya-oriya', 'Noto Sans Oriya'],
  ['newsreader', 'newsreader-latin', 'Newsreader'],
];
fs.mkdirSync(out, { recursive: true });
let copied = 0;
const faces = [];
for (const [pkg, prefix, family] of wanted) {
  const dir = path.join(root, 'node_modules', '@fontsource', pkg, 'files');
  for (const w of [400, 500, 700]) {
    for (const style of ['normal', 'italic']) {
      const file = `${prefix}-${w}-${style}.woff2`;
      const dest = path.join(out, file);
      if (fs.existsSync(dir)) {
        const src = path.join(dir, file);
        if (fs.existsSync(src)) { fs.copyFileSync(src, dest); copied++; }
      }
      if (fs.existsSync(dest)) {
        // Keep normal weights (and italic only for Newsreader) so fonts.css only references existing files
        if (style === 'normal' || pkg === 'newsreader') {
          faces.push(`@font-face {\n  font-family: "${family}";\n  font-style: ${style};\n  font-weight: ${w};\n  font-display: swap;\n  src: url("../fonts/${file}") format("woff2");\n}`);
        }
      }
    }
  }
}
fs.writeFileSync(path.join(root, 'public', 'css', 'fonts.css'), faces.join('\n') + '\n');
console.log(`fonts: ${copied} files copied, ${faces.length} @font-face rules in public/css/fonts.css`);

const vendor = path.join(root, 'public', 'vendor');
fs.mkdirSync(vendor, { recursive: true });
const lenis = path.join(root, 'node_modules', 'lenis', 'dist', 'lenis.min.js');
const lenisDest = path.join(vendor, 'lenis.min.js');
if (fs.existsSync(lenis)) {
  fs.copyFileSync(lenis, lenisDest);
  console.log('vendor: lenis.min.js in public/vendor');
} else if (!fs.existsSync(lenisDest)) {
  fs.writeFileSync(lenisDest, '/* optional lenis smooth scroll fallback */\n');
  console.log('vendor: wrote fallback lenis.min.js in public/vendor');
}
