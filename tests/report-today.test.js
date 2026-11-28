'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { seed } = require('../server/seed');
const flow = require('../server/flow');
const { report } = require('../server/report');

const fresh = () => seed(new Date('2026-11-28T03:00:00Z'));

test('report todaySummary tracks due, confirmed, and lastTakenAt for shared and unshared patients', () => {
  const db = fresh();
  const lakshmi = db.patients.find((p) => p.name.startsWith('Lakshmi'));
  const arjun = db.patients.find((p) => p.name.startsWith('Arjun'));

  const before = report(db, lakshmi.id);
  assert.ok(before.todaySummary);
  assert.equal(before.todaySummary.due, 0);
  assert.equal(before.todaySummary.confirmed, 0);
  assert.equal(before.todaySummary.lastTakenAt, null);

  const call = flow.answer(db, flow.startNext(db, lakshmi.id));
  flow.reply(db, call, { text: 'వేసుకున్నాను' });
  const pendingAt = call.pendingTaken.at;
  flow.reply(db, call, { text: 'అవును' });

  const after = report(db, lakshmi.id);
  assert.equal(after.todaySummary.due, 1);
  assert.equal(after.todaySummary.confirmed, before.todaySummary.confirmed + 1);
  assert.equal(after.todaySummary.lastTakenAt, pendingAt);

  const arjunRep = report(db, arjun.id);
  assert.equal(arjun.shareWithFamily, false);
  assert.ok(arjunRep.todaySummary);
  assert.equal(typeof arjunRep.todaySummary.due, 'number');
  assert.equal(typeof arjunRep.todaySummary.confirmed, 'number');
});
