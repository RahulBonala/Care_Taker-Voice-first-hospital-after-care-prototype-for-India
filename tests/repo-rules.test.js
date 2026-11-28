'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('vercel.json pins region to bom1', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.deepEqual(vercel.regions, ['bom1']);
});

test('tokens.css defines motion duration and stagger tokens', () => {
  const tokens = read('public/css/tokens.css');
  for (const tok of ['--dur-1', '--dur-2', '--dur-3', '--stagger']) {
    assert.ok(tokens.includes(`${tok}:`), `tokens.css missing ${tok}`);
  }
});

test('index.html links print.css and print.css has @media print', () => {
  const html = read('public/index.html');
  assert.ok(html.includes('/css/print.css'), 'index.html must link /css/print.css');
  const printCss = read('public/css/print.css');
  assert.ok(printCss.includes('@media print'), 'print.css must contain @media print');
});

test('scripts/check.js SKIP_DIRS includes .impeccable and .polish', () => {
  const check = read('scripts/check.js');
  assert.ok(check.includes("'.impeccable'") && check.includes("'.polish'"));
});

test('docker-compose.yml has no required: false and lists all optional .env.example keys', () => {
  const compose = read('docker-compose.yml');
  assert.ok(!compose.includes('required:'), 'docker-compose.yml must not contain required:');
  const envExample = read('.env.example');
  const keys = envExample
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => l.split('=')[0].trim())
    .filter((k) => k !== 'PORT' && k !== 'DATA_DIR');
  assert.ok(keys.length >= 11, 'expected at least 11 optional keys in .env.example');
  for (const k of keys) {
    assert.ok(
      compose.includes(`${k}=\${${k}:-}`),
      `docker-compose.yml missing ${k}=\${${k}:-}`
    );
  }
});

test('DEMO_SCRIPT.md and PITCH_DECK.md match Round 2 polish requirements', () => {
  const demo = read('docs/DEMO_SCRIPT.md');
  assert.ok(!demo.includes('08:55, Fri'), 'DEMO_SCRIPT.md must not reference 08:55, Fri');
  assert.ok(!demo.includes('top banner'), 'DEMO_SCRIPT.md must not reference top banner');
  const deck = read('docs/PITCH_DECK.md');
  assert.ok(!deck.includes('[SOURCE NEEDED'), 'PITCH_DECK.md must not contain [SOURCE NEEDED');
});
