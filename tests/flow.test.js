'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { seed } = require('../server/seed');
const flow = require('../server/flow');

const fresh = () => seed(new Date('2026-11-28T03:00:00Z'));
const pid = (db, name) => db.patients.find((p) => p.name.startsWith(name)).id;
const ringAndAnswer = (db, name) => flow.answer(db, flow.startNext(db, pid(db, name)));

test('taken is logged only after yes', () => {
  const db = fresh();
  const logs = db.doseLogs.length;
  const call = ringAndAnswer(db, 'Lakshmi');
  flow.reply(db, call, { text: 'వేసుకున్నాను' });
  assert.equal(call.stage, 'confirm');
  assert.equal(db.doseLogs.length, logs, 'nothing logged before the yes');
  flow.reply(db, call, { text: 'అవును' });
  assert.equal(db.doseLogs.length, logs + 1);
  assert.equal(call.outcome, 'taken');
  assert.match(call.turn.say.at(-1).en, /I will call again at 13:30/);
});

test('no at the read-back asks again and logs nothing', () => {
  const db = fresh();
  const logs = db.doseLogs.length;
  const call = ringAndAnswer(db, 'Lakshmi');
  flow.reply(db, call, { text: 'yes' });
  flow.reply(db, call, { text: 'kaadu' });
  assert.equal(call.stage, 'ask');
  assert.equal(db.doseLogs.length, logs);
});

test('unclear twice goes to keypad, no key flags the care team', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Meena');
  flow.reply(db, call, { text: 'hmm' });
  flow.reply(db, call, { silence: true });
  assert.equal(call.turn.expect, 'key');
  assert.equal(db.misheard.filter((m) => m.callId === call.id).length, 2);
  flow.key(db, call, null);
  assert.equal(call.outcome, 'missed');
  assert.ok(db.flags.some((f) => f.slotId === call.slotId && f.type === 'missed'));
});

test('keypad 1 still needs the read-back confirmation', () => {
  const db = fresh();
  const logs = db.doseLogs.length;
  const call = ringAndAnswer(db, 'Meena');
  flow.key(db, call, '1');
  assert.equal(db.doseLogs.length, logs);
  flow.key(db, call, '1');
  assert.equal(db.doseLogs.length, logs + 1);
});

test('halfway reminder from the middle day of the course', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Meena');
  assert.ok(call.turn.say.some((l) => l.lineId === 'progress'));
  const call2 = ringAndAnswer(db, 'Lakshmi');
  assert.ok(!call2.turn.say.some((l) => l.lineId === 'progress'));
});

test('three rings without answer is missed, two in a row is not reachable', () => {
  const db = fresh();
  const id = pid(db, 'Lakshmi');
  for (let slotN = 0; slotN < 2; slotN++) {
    const call = flow.startNext(db, id);
    for (let i = 0; i < flow.MAX_RINGS; i++) flow.decline(db, call);
    assert.equal(call.outcome, 'missed');
  }
  assert.ok(db.flags.some((f) => f.patientId === id && f.type === 'notReachable' && f.status === 'open'));
});

test('later reschedules by the minutes heard, fourth postpone flags', () => {
  const db = fresh();
  const id = pid(db, 'Arjun');
  let call = ringAndAnswer(db, 'Arjun');
  const before = db.clock;
  flow.reply(db, call, { text: 'aadha ghanta baad' });
  const slot = db.slots.find((s) => s.id === call.slotId);
  assert.equal(slot.status, 'postponed');
  assert.equal(Date.parse(slot.due) - Date.parse(before), 30 * 60000);
  for (let i = 0; i < 3; i++) {
    call = flow.answer(db, flow.startNext(db, id));
    flow.reply(db, call, { text: 'baad mein' });
  }
  assert.equal(slot.status, 'missed');
  assert.ok(db.flags.some((f) => f.slotId === slot.id && /Postponed/.test(f.reason)));
});

test('stopped asks why and flags stopped early with the reason', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Arjun');
  flow.reply(db, call, { text: 'I feel fine, I have stopped' });
  assert.equal(call.stage, 'reason');
  flow.reply(db, call, { text: 'skin is clear now' });
  const f = db.flags.find((x) => x.slotId === call.slotId);
  assert.equal(f.type, 'stoppedEarly');
  assert.equal(f.why, 'skin is clear now');
});

test('unwell raises an urgent flag with the exact words', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Arjun');
  flow.reply(db, call, { text: 'haan le li, lekin chakkar aa raha hai' });
  const f = db.flags.find((x) => x.slotId === call.slotId);
  assert.equal(f.type, 'urgent');
  assert.equal(f.words, 'haan le li, lekin chakkar aa raha hai');
  assert.equal(db.doseLogs.filter((l) => l.callId === call.id).length, 0);
});

test('stop calls cancels future slots and blocks new calls', () => {
  const db = fresh();
  const id = pid(db, 'Meena');
  const call = ringAndAnswer(db, 'Meena');
  flow.key(db, call, '9');
  assert.equal(db.slots.filter((s) => s.patientId === id && s.status === 'pending').length, 0);
  assert.throws(() => flow.startNext(db, id), /stop calls/);
});
