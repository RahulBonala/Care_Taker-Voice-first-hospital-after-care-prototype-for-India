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
