'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRx } = require('../server/rxparse');

test('dictation from the brief fills the form', () => {
  assert.deepEqual(parseRx('Paracetamol 650, after breakfast and dinner, 5 days'),
    { medicine: 'Paracetamol', dose: '650 mg', slots: ['breakfast', 'dinner'], days: 5, relation: 'after' });
});
test('frequency words and weeks', () => {
  const r = parseRx('Amoxiclav 625mg thrice daily for two weeks');
  assert.equal(r.medicine, 'Amoxiclav');
  assert.deepEqual(r.slots, ['breakfast', 'lunch', 'dinner']);
  assert.equal(r.days, 14);
});
test('night only, no dose number', () => {
  const r = parseRx('Isotretinoin at night for 60 days');
  assert.equal(r.medicine, 'Isotretinoin');
  assert.equal(r.dose, null);
  assert.deepEqual(r.slots, ['night']);
  assert.equal(r.days, 60);
});
