'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { detect, shouldSwitch } = require('../server/langdetect');
const { seed } = require('../server/seed');
const flow = require('../server/flow');

const cases = [
  ['వేసుకున్నాను', 'te'], ['எடுத்துட்டேன்', 'ta'], ['ತೆಗೆದುಕೊಂಡಿದ್ದೇನೆ', 'kn'], ['ഗുളിക കഴിച്ചു', 'ml'],
  ['খেয়েছি', 'bn'], ['ગોળી લીધી', 'gu'], ['ਲੈ ਲਈ', 'pa'], ['ଖାଇଲି', 'or'],
  ['मैंने दवाई ले ली', 'hi'], ['मी गोळ्या घेतल्या', 'mr'],
  ['tablets vesukunnanu', 'te'], ['tablet pottuten', 'ta'], ['haan le liya', 'hi'],
  ['Tamil please', 'ta'], ['kannada nalli maatadi', 'kn'],
];
for (const [text, lang] of cases) {
  test(`detects ${lang} in "${text}"`, () => assert.equal(detect(text).lang, lang));
}

test('English mixed into an Indian language does not switch the call', () => {
  assert.equal(shouldSwitch(detect('yes'), 'te'), false);
  assert.equal(shouldSwitch(detect('ok ok'), 'hi'), false);
});

test('a call switches language when the patient answers in another one', () => {
  const db = seed(new Date('2026-11-28T03:00:00Z'));
  const p = db.patients.find((x) => x.name === 'Arjun');
  const call = flow.answer(db, flow.startNext(db, p.id));
  flow.reply(db, call, { text: 'நான் எடுத்துட்டேன்' });
  assert.equal(p.lang, 'ta');
  assert.equal(call.lang, 'ta');
  assert.equal(call.stage, 'confirm');
  assert.equal(call.turn.say[0].lang, 'ta', 'read-back is now in Tamil');
  assert.ok(call.transcript.some((t) => t.who === 'system' && /switched from Hindi to Tamil/.test(t.text)));
});

test('naming a language re-asks the question in it without counting as unclear', () => {
  const db = seed(new Date('2026-11-28T03:00:00Z'));
  const p = db.patients.find((x) => x.name === 'Meena');
  const call = flow.answer(db, flow.startNext(db, p.id));
  flow.reply(db, call, { text: 'Kannada please' });
  assert.equal(p.lang, 'kn');
  assert.equal(call.unclear, 0);
  assert.equal(call.turn.say[0].lineId, 'askTaken');
  assert.equal(call.turn.say[0].lang, 'kn');
});
