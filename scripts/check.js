'use strict';
// Repo quality check: syntax, tests, line count, tokens, env vars, secrets, dashes and HTML banners.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'data', 'fonts', '.impeccable', '.polish']);
const BINARY_EXT = new Set(['.woff2', '.woff', '.ttf', '.mp3', '.wav', '.png', '.jpg', '.jpeg', '.ico', '.webp', '.webm', '.mp4', '.zip']);

let failed = false;
function pass(msg) { console.log(`PASS  ${msg}`); }
function fail(msg) { console.error(`FAIL  ${msg}`); failed = true; }

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (!BINARY_EXT.has(path.extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

// 1. JS syntax check across server, scripts, tests and public/js
const jsFiles = [
  ...walk(path.join(ROOT, 'server')),
  ...walk(path.join(ROOT, 'scripts')),
  ...walk(path.join(ROOT, 'tests')),
  ...walk(path.join(ROOT, 'public', 'js')),
].filter((f) => f.endsWith('.js'));

let syntaxBad = 0;
for (const f of jsFiles) {
  const isEsm = rel(f).startsWith('public/js/');
  const r = isEsm
    ? spawnSync(process.execPath, ['--check', '--input-type=module'], { input: fs.readFileSync(f, 'utf8'), encoding: 'utf8' })
    : spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) {
    syntaxBad++;
    fail(`Syntax error in ${rel(f)}: ${(r.stderr || '').trim()}`);
  }
}
if (!syntaxBad) pass(`Syntax check passed (${jsFiles.length} JS files)`);

// 2. Pure JS dependencies only (no native addons)
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const bannedDeps = ['better-sqlite3', 'sqlite3', 'bcrypt', 'sharp', 'node-gyp', 'canvas'];
const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const hitDeps = bannedDeps.filter((d) => d in allDeps);
if (hitDeps.length) fail(`Native dependencies found: ${hitDeps.join(', ')}`);
else pass('Pure JS dependencies verified');

// 3. .env.example covers every process.env variable read in server/
const envExamplePath = path.join(ROOT, '.env.example');
if (!fs.existsSync(envExamplePath)) {
  fail('.env.example is missing');
} else {
  const exampleText = fs.readFileSync(envExamplePath, 'utf8');
  const declared = new Set(
    exampleText.split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => l.split('=')[0].trim())
  );
  declared.add('NODE_ENV');
  const used = new Set();
  for (const f of walk(path.join(ROOT, 'server')).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) used.add(m[1]);
  }
  const missing = [...used].filter((k) => !declared.has(k));
  if (missing.length) fail(`.env.example missing variables: ${missing.join(', ')}`);
  else pass(`.env.example lists all ${used.size} server env vars`);
}

// 4. No committed secrets
const secretRe = /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AC[a-f0-9]{32})/;
const secretHits = [];
for (const f of walk(ROOT)) {
  if (rel(f) === 'scripts/check.js' || rel(f).endsWith('submission-check/SKILL.md')) continue;
  const txt = fs.readFileSync(f, 'utf8');
  if (secretRe.test(txt)) secretHits.push(rel(f));
}
if (secretHits.length) fail(`Possible secret in: ${secretHits.join(', ')}`);
else pass('No secret patterns found');

// 5. No em dash or en dash anywhere in repo
const dashHits = [];
for (const f of walk(ROOT)) {
  const txt = fs.readFileSync(f, 'utf8');
  const lines = txt.split('\n');
  lines.forEach((line, idx) => {
    if (/[\u2013\u2014]/.test(line)) dashHits.push(`${rel(f)}:${idx + 1}`);
  });
}
if (dashHits.length) fail(`Banned em/en dash found at: ${dashHits.slice(0, 10).join(', ')}`);
else pass('No em dash or en dash characters found');

// 6. Design tokens only in public/ (no hex colors, no px font-size, no inline style=)
const publicFiles = walk(path.join(ROOT, 'public')).filter((f) => /\.(css|html|js)$/.test(f));
const tokenHits = [];
for (const f of publicFiles) {
  const r = rel(f);
  const txt = fs.readFileSync(f, 'utf8');
  if (r !== 'public/css/tokens.css') {
    const hexMatch = txt.match(/#[0-9a-fA-F]{3,8}\b/);
    if (hexMatch) tokenHits.push(`${r} has raw hex ${hexMatch[0]}`);
    const fontPx = txt.match(/font-size\s*:\s*\d+(\.\d+)?px/i);
    if (fontPx) tokenHits.push(`${r} has raw font-size (${fontPx[0]})`);
  }
  if (/\bstyle\s*=\s*["']/.test(txt)) tokenHits.push(`${r} has inline style attribute`);
}
if (tokenHits.length) fail(`Design system violations: ${tokenHits.join('; ')}`);
else pass('Design token rules verified across public/');

// 7. Banner and legal links on every HTML page
const htmlFiles = publicFiles.filter((f) => f.endsWith('.html'));
const htmlHits = [];
for (const f of htmlFiles) {
  const txt = fs.readFileSync(f, 'utf8');
  if (!txt.includes('Sample data. Not medical advice.')) htmlHits.push(`${rel(f)} missing banner`);
  for (const link of ['/terms.html', '/privacy.html', '/disclaimer.html', '/voice-data.html']) {
    if (!txt.includes(link)) htmlHits.push(`${rel(f)} missing footer link ${link}`);
  }
}
if (htmlHits.length) fail(`HTML checks failed: ${htmlHits.join('; ')}`);
else pass(`Banner and legal footer present on all ${htmlFiles.length} HTML pages`);

// 8. Own code line count >= 300
const codeDirs = ['server', 'public/js', 'public/css', 'tests'];
let totalLines = 0;
const breakdown = [];
for (const d of codeDirs) {
  let count = 0;
  for (const f of walk(path.join(ROOT, d))) {
    if (rel(f).startsWith('public/audio/')) continue;
    count += fs.readFileSync(f, 'utf8').split('\n').length;
  }
  totalLines += count;
  breakdown.push(`${d}: ${count}`);
}
if (totalLines < 300) fail(`Own code is ${totalLines} lines (must be >= 300)`);
else pass(`Own code line count: ${totalLines} (${breakdown.join(', ')})`);

// 9. Unit and API tests
const testFiles = fs.readdirSync(path.join(ROOT, 'tests'))
  .filter((f) => f.endsWith('.test.js'))
  .sort()
  .map((f) => path.join(ROOT, 'tests', f));
const testRun = spawnSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit', cwd: ROOT });
if (testRun.status !== 0) fail('npm test failed');
else pass('All unit and API tests passed');

if (failed) process.exit(1);
