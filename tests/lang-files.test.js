'use strict';
// Every language file must carry every call line, intent list and app wording key that English has,
// so a missing translation fails here instead of showing English inside another language.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'server', 'lang');
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const L = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  test(`${file} is complete`, () => {
    for (const k of ['code', 'name', 'nativeName', 'speechCode', 'aliases', 'slots', 'lines', 'keywords', 'numbers', 'samples', 'ui']) assert.ok(L[k] !== undefined, `${file} is missing ${k}`);
    for (const k of Object.keys(en.lines)) assert.ok(L.lines[k], `${file} is missing line ${k}`);
    for (const k of Object.keys(en.keywords)) assert.ok(Array.isArray(L.keywords[k]) && L.keywords[k].length, `${file} has no keywords for ${k}`);
    for (const k of Object.keys(en.ui)) assert.ok(L.ui[k], `${file} is missing app wording ${k}`);
    for (const k of Object.keys(en.slots)) assert.ok(L.slots[k], `${file} is missing slot ${k}`);
    for (const [k, v] of Object.entries(L.lines)) {
      const placeholders = (en.lines[k] || '').match(/\{\w+\}/g) || [];
      for (const ph of placeholders) assert.ok(v.includes(ph), `${file} line ${k} drops ${ph}`);
    }
  });
}
