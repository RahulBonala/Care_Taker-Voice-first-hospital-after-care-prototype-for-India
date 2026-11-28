'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'caretaker-contract-'));
for (const k of ['SARVAM_API_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM', 'LLM_API_KEY']) delete process.env[k];
const { createApp } = require('../server/app');
const store = require('../server/store');

let server;
let base;
test.before(async () => {
  store.load();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const post = async (p, body) => (await fetch(base + p, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body || {}),
})).json();

test('call, patient, and report endpoints expose required Round 2 fields', async () => {
  await post('/api/reset');
  const patients = await (await fetch(base + '/api/patients')).json();
  for (const p of patients) {
    assert.equal(typeof p.phone, 'string');
    assert.equal(typeof p.lang, 'string');
    assert.equal(typeof p.shareWithFamily, 'boolean');
  }

  const lakshmi = patients.find((p) => p.name.startsWith('Lakshmi'));
  let call = await post('/api/slots/next', { patientId: lakshmi.id });
  call = await post(`/api/calls/${call.id}/answer`);
  call = await post(`/api/calls/${call.id}/reply`, { text: 'వేసుకున్నాను' });

  for (const k of ['status', 'stage', 'outcome', 'pendingTaken', 'transcript']) {
    assert.ok(k in call, `POST reply missing ${k}`);
  }
  assert.equal(call.stage, 'confirm');
  assert.ok(call.pendingTaken && call.pendingTaken.at);

  const list = await (await fetch(`${base}/api/calls?patientId=${encodeURIComponent(lakshmi.id)}&limit=1`)).json();
  assert.equal(list.length, 1);
  for (const k of ['status', 'stage', 'outcome', 'pendingTaken', 'transcript']) {
    assert.ok(k in list[0], `GET /api/calls missing ${k}`);
  }
  assert.equal(list[0].stage, 'confirm');

  const done = await post(`/api/calls/${call.id}/reply`, { text: 'అవును' });
  assert.equal(done.outcome, 'taken');

  const rep = await (await fetch(`${base}/api/report/${encodeURIComponent(lakshmi.id)}`)).json();
  assert.ok(Array.isArray(rep.today));
  assert.ok(rep.todaySummary && typeof rep.todaySummary === 'object');
  assert.equal(typeof rep.todaySummary.due, 'number');
  assert.equal(typeof rep.todaySummary.confirmed, 'number');
});
