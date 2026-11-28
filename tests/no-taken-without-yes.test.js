'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { seed } = require('../server/seed');
const flow = require('../server/flow');
const lang = require('../server/lang');

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('300 randomized calls never log a dose without a read-back and yes or key 1', () => {
  const rand = mulberry32(42);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const fresh = () => seed(new Date('2026-11-28T03:00:00Z'));

  let db = fresh();
  for (let i = 0; i < 300; i++) {
    let candidates = db.patients.filter((p) => p.verified && !p.callsStopped);
    if (!candidates.length) {
      db = fresh();
      candidates = db.patients.filter((p) => p.verified && !p.callsStopped);
    }
    let p = pick(candidates);
    let call = null;
    try {
      call = flow.startNext(db, p.id);
    } catch (err) {
      if (!(err instanceof flow.FlowError)) throw err;
      db = fresh();
      p = pick(db.patients.filter((x) => x.verified && !x.callsStopped));
      call = flow.startNext(db, p.id);
    }

    const logsBefore = db.doseLogs.length;
    const takenBefore = db.slots.filter((s) => s.status === 'taken').length;
    flow.answer(db, call);

    const samples = (lang.get(p.lang) && lang.get(p.lang).samples) || [];
    const speechPool = [...samples, 'yes', 'no', 'hmm', { silence: true }];
    const keyPool = ['1', '2', '3', '9', null];

    for (let step = 0; step < 8 && call.status !== 'ended'; step++) {
      try {
        if (call.stage === 'keypad') {
          flow.key(db, call, pick(keyPool));
        } else if (rand() < 0.3) {
          flow.key(db, call, pick(keyPool));
        } else {
          const item = pick(speechPool);
          flow.reply(db, call, typeof item === 'string' ? { text: item } : item);
        }
      } catch (err) {
        if (!(err instanceof flow.FlowError)) throw err;
      }
    }

    const newLogs = db.doseLogs.slice(logsBefore);
    const takenAfter = db.slots.filter((s) => s.status === 'taken').length;
    assert.equal(takenAfter - takenBefore, newLogs.length, 'slots changed to taken must equal new logs');

    if (call.outcome !== 'taken') {
      assert.equal(db.doseLogs.filter((l) => l.callId === call.id).length, 0, 'no log when outcome is not taken');
    }

    for (const log of newLogs) {
      assert.ok(typeof log.confirmWords === 'string' && log.confirmWords.trim().length > 0, 'confirmWords must be non-empty');
      assert.ok(['voice', 'key'].includes(log.via), `unexpected via: ${log.via}`);
      const readbackIdx = call.transcript.findIndex((t) => t.who === 'bot' && t.lineId === 'readback');
      assert.ok(readbackIdx >= 0, 'transcript must contain a bot readback line before logging');
    }
  }
});
