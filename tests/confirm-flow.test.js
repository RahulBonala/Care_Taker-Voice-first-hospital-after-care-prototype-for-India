'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { seed } = require('../server/seed');
const flow = require('../server/flow');

const fresh = () => seed(new Date('2026-11-28T03:00:00Z'));
const pid = (db, name) => db.patients.find((p) => p.name.startsWith(name)).id;
const ringAndAnswer = (db, name) => flow.answer(db, flow.startNext(db, pid(db, name)));

test('Telugu taken then yes logs one dose with voice via and confirmWords', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Lakshmi');
  flow.reply(db, call, { text: 'వేసుకున్నాను' });
  assert.equal(call.status, 'active');
  assert.equal(call.stage, 'confirm');
  assert.ok(call.pendingTaken && call.pendingTaken.at);
  assert.equal(call.pendingTaken.words, 'వేసుకున్నాను');
  assert.equal(db.doseLogs.filter((l) => l.callId === call.id).length, 0);

  flow.reply(db, call, { text: 'అవును' });
  assert.equal(call.status, 'ended');
  assert.equal(call.outcome, 'taken');
  const logs = db.doseLogs.filter((l) => l.callId === call.id);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].via, 'voice');
  assert.equal(logs[0].confirmWords, 'అవును');
  assert.equal(logs[0].words, 'వేసుకున్నాను');
});

test('taken then kaadu returns to ask stage, clears pendingTaken, and logs nothing', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Lakshmi');
  flow.reply(db, call, { text: 'వేసుకున్నాను' });
  assert.equal(call.stage, 'confirm');
  assert.ok(call.pendingTaken);

  flow.reply(db, call, { text: 'kaadu' });
  assert.equal(call.status, 'active');
  assert.equal(call.stage, 'ask');
  assert.equal(call.pendingTaken, null);
  assert.equal(db.doseLogs.filter((l) => l.callId === call.id).length, 0);
});

test('taken then hmm stays in confirm stage with pendingTaken set and zero logs', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Lakshmi');
  flow.reply(db, call, { text: 'వేసుకున్నాను' });
  assert.equal(call.stage, 'confirm');

  flow.reply(db, call, { text: 'hmm' });
  assert.equal(call.status, 'active');
  assert.equal(call.stage, 'confirm');
  assert.ok(call.pendingTaken);
  assert.equal(db.doseLogs.filter((l) => l.callId === call.id).length, 0);
});

test('taken then two silences moves to keypad, rejects reply, then key 1 twice logs dose', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Lakshmi');
  flow.reply(db, call, { text: 'వేసుకున్నాను' });
  flow.reply(db, call, { silence: true });
  flow.reply(db, call, { silence: true });
  assert.equal(call.status, 'active');
  assert.equal(call.stage, 'keypad');
  assert.equal(call.keypadMode, true);
  assert.ok(call.pendingTaken);
  assert.equal(db.doseLogs.filter((l) => l.callId === call.id).length, 0);

  assert.throws(() => flow.reply(db, call, { text: 'అవును' }), (err) => {
    assert.ok(err instanceof flow.FlowError);
    assert.match(err.message, /Waiting for a key press/);
    return true;
  });

  flow.key(db, call, '1');
  assert.equal(call.status, 'active');
  assert.equal(call.stage, 'confirm');
  assert.equal(db.doseLogs.filter((l) => l.callId === call.id).length, 0);

  flow.key(db, call, '1');
  assert.equal(call.status, 'ended');
  assert.equal(call.outcome, 'taken');
  const logs = db.doseLogs.filter((l) => l.callId === call.id);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].via, 'key');
  assert.equal(logs[0].confirmWords, 'Pressed 1');
});

test('keypad timeout ends call as missed with zero logs', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Lakshmi');
  flow.reply(db, call, { text: 'వేసుకున్నాను' });
  flow.reply(db, call, { silence: true });
  flow.reply(db, call, { silence: true });
  assert.equal(call.stage, 'keypad');

  flow.key(db, call, null);
  assert.equal(call.status, 'ended');
  assert.equal(call.outcome, 'missed');
  assert.ok(call.pendingTaken);
  assert.equal(db.doseLogs.filter((l) => l.callId === call.id).length, 0);
});

test('key 9 during confirm ends call as optOut, stops calls, and logs nothing', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Lakshmi');
  flow.reply(db, call, { text: 'వేసుకున్నాను' });
  assert.equal(call.stage, 'confirm');

  flow.key(db, call, '9');
  assert.equal(call.status, 'ended');
  assert.equal(call.outcome, 'optOut');
  assert.equal(db.doseLogs.filter((l) => l.callId === call.id).length, 0);
  const lakshmi = db.patients.find((p) => p.id === call.patientId);
  assert.equal(lakshmi.callsStopped, true);
});

test('Arjun unwell plus taken ends as urgent with zero logs and an urgent flag', () => {
  const db = fresh();
  const flagsBefore = db.flags.length;
  const call = ringAndAnswer(db, 'Arjun');
  flow.reply(db, call, { text: 'haan le li, lekin chakkar aa raha hai' });
  assert.equal(call.status, 'ended');
  assert.equal(call.outcome, 'urgent');
  assert.equal(call.pendingTaken || null, null);
  assert.equal(db.doseLogs.filter((l) => l.callId === call.id).length, 0);
  assert.equal(db.flags.length, flagsBefore + 1);
  const flag = db.flags.find((f) => f.slotId === call.slotId && f.type === 'urgent');
  assert.ok(flag);
  assert.equal(flag.words, 'haan le li, lekin chakkar aa raha hai');
});

test('flow.reply on an ended call throws FlowError', () => {
  const db = fresh();
  const call = ringAndAnswer(db, 'Lakshmi');
  flow.reply(db, call, { text: 'వేసుకున్నాను' });
  flow.reply(db, call, { text: 'అవును' });
  assert.equal(call.status, 'ended');
  assert.throws(() => flow.reply(db, call, { text: 'అవును' }), (err) => {
    assert.ok(err instanceof flow.FlowError);
    assert.match(err.message, /Call is not active/);
    return true;
  });
});
