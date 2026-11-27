'use strict';
// The phrases from the original brief. These must always pass.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('../server/intents');

const CASES = [
  ['వేసుకున్నాను', 'te', 'taken'],
  ['le li', 'hi', 'taken'],
  ['nahi li hai', 'hi', 'notTaken'],
  ['వేసుకోలేదు', 'te', 'notTaken'],
  ['haan le li, lekin chakkar aa raha hai', 'hi', 'unwell'],
  ['tabiyat theek nahi', 'hi', 'unwell'],
  ['20 minutes tarvata call cheyandi', 'te', 'later', 20],
  ['aadha ghanta', 'hi', 'later', 30],
  ['I feel fine, I have stopped', 'en', 'stopped'],
];

for (const [text, lang, intent, minutes] of CASES) {
  test(`acceptance: "${text}" (${lang}) is ${intent}${minutes ? ' ' + minutes : ''}`, () => {
    const r = parse(text, { lang });
    assert.equal(r.intent, intent);
    if (minutes) assert.equal(r.minutes, minutes);
  });
}

test('low confidence is unclear even when a keyword matches', () => {
  assert.equal(parse('వేసుకున్నాను', { lang: 'te', confidence: 0.4 }).intent, 'unclear');
  assert.equal(parse('వేసుకున్నాను', { lang: 'te', confidence: 0.9 }).intent, 'taken');
});

test('silence and noise are unclear, never taken', () => {
  for (const t of ['', '   ', 'hmm', 'aaa', 'ok ok ok?'.replace(/ok/g, 'uh'), 'radio song playing']) {
    assert.notEqual(parse(t, { lang: 'hi' }).intent, 'taken');
  }
  assert.equal(parse('', { lang: 'te' }).intent, 'unclear');
});

test('later minutes default to 30 and are clamped to 10..90', () => {
  assert.equal(parse('baad mein', { lang: 'hi' }).minutes, 30);
  assert.equal(parse('call me in 5 minutes', { lang: 'en' }).minutes, 10);
  assert.equal(parse('call me in 3 hours', { lang: 'en' }).minutes, 90);
});

test('stop calls comes right after unwell', () => {
  assert.equal(parse('calls band karo', { lang: 'hi' }).intent, 'optOut');
  assert.equal(parse('కాల్స్ ఆపండి', { lang: 'te' }).intent, 'optOut');
  assert.equal(parse('stop calls, I feel dizzy', { lang: 'en' }).intent, 'unwell');
});
