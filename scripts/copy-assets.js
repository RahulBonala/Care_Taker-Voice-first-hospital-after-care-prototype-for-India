'use strict';
// Copies self-hosted fonts and the smooth scroll script from node_modules into public/ so the app
// works offline with no build step. Runs on npm install (postinstall), before start, and in Docker.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'fonts');
const wanted = [
  ['noto-sans', 'noto-sans-latin', 'Noto Sans', ''],
  ['noto-sans-telugu', 'noto-sans-telugu-telugu', 'Noto Sans Telugu', 'U+0951-0952, U+0964-0965, U+0C00-0C7F, U+1CDA, U+1CF2, U+200C-200D, U+25CC'],
  ['noto-sans-devanagari', 'noto-sans-devanagari-devanagari', 'Noto Sans Devanagari', 'U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF'],
  ['noto-sans-tamil', 'noto-sans-tamil-tamil', 'Noto Sans Tamil', 'U+0964-0965, U+0B82-0BFA, U+200C-200D, U+20B9, U+25CC'],
  ['noto-sans-kannada', 'noto-sans-kannada-kannada', 'Noto Sans Kannada', 'U+0951-0952, U+0964-0965, U+0C80-0CF3, U+1CD0, U+1CD2-1CD3, U+1CDA, U+1CF2, U+1CF4, U+200C-200D, U+20B9, U+25CC'],
  ['noto-sans-malayalam', 'noto-sans-malayalam-malayalam', 'Noto Sans Malayalam', 'U+0307, U+0323, U+0951-0952, U+0964-0965, U+0D00-0D7F, U+1CDA, U+1CF2, U+200C-200D, U+20B9, U+25CC'],
  ['noto-sans-bengali', 'noto-sans-bengali-bengali', 'Noto Sans Bengali', 'U+0951-0952, U+0964-0965, U+0980-09FE, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, U+1CED, U+1CF2, U+1CF5-1CF7, U+200C-200D, U+20B9, U+25CC, U+A8F1'],
  ['noto-sans-gujarati', 'noto-sans-gujarati-gujarati', 'Noto Sans Gujarati', 'U+0951-0952, U+0964-0965, U+0A80-0AFF, U+200C-200D, U+20B9, U+25CC, U+A830-A839'],
  ['noto-sans-gurmukhi', 'noto-sans-gurmukhi-gurmukhi', 'Noto Sans Gurmukhi', 'U+0951-0952, U+0964-0965, U+0A01-0A76, U+200C-200D, U+20B9, U+25CC, U+262C, U+A830-A839'],
  ['noto-sans-oriya', 'noto-sans-oriya-oriya', 'Noto Sans Oriya', 'U+0951-0952, U+0964-0965, U+0B01-0B77, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, U+1CED, U+1CF2, U+1CF5-1CF7, U+200C-200D, U+20B9, U+25CC'],
  ['newsreader', 'newsreader-latin', 'Newsreader', ''],
];
fs.mkdirSync(out, { recursive: true });
let copied = 0;
const faces = [];
for (const [pkg, prefix, family, range] of wanted) {
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
          const ur = range ? `\n  unicode-range: ${range};` : '';
          faces.push(`@font-face {\n  font-family: "${family}";\n  font-style: ${style};\n  font-weight: ${w};\n  font-display: swap;\n  src: url("../fonts/${file}") format("woff2");${ur}\n}`);
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
