'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'caretaker-'));
for (const k of ['SARVAM_API_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM', 'LLM_API_KEY']) delete process.env[k];
const { createApp } = require('../server/app');
const store = require('../server/store');

let server; let base;
test.before(async () => {
  store.load();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });

test('healthz, main website, tour, and mobile app modules', async () => {
  assert.deepEqual(await (await fetch(base + '/healthz')).json(), { ok: true });
  const html = await (await fetch(base + '/')).text();
  assert.match(html, /Care Taker/);
  assert.match(html, /#tour/);
  assert.match(html, /#mobile/);
  for (const mod of ['/js/screens/home.js', '/js/screens/tour.js', '/js/screens/mobile.js']) {
    const r = await fetch(base + mod);
    assert.equal(r.status, 200, mod);
  }
});

test('seeded on first start', async () => {
  const patients = await (await fetch(base + '/api/patients')).json();
  assert.deepEqual(patients.map((p) => p.name), ['Lakshmi Devi', 'Arjun', 'Meena']);
});

test('new patient needs consent, prescription and verify before calls', async () => {
  let r = await post('/api/patients', { name: 'Test Person', lang: 'hi', consent: { calls: true } });
  assert.equal(r.status, 400);
  r = await post('/api/patients', { name: 'Test Person', lang: 'hi', consent: { calls: true, stopInfo: true, recordedBy: 'Nurse A' } });
  const p = await r.json();
  assert.equal((await post('/api/slots/next', { patientId: p.id })).status, 400);
  assert.equal((await post(`/api/verify/${p.id}`)).status, 400, 'no prescription yet');
  await post('/api/prescriptions', { patientId: p.id, medicine: 'Paracetamol', dose: '650 mg', slots: ['breakfast', 'dinner'], days: 5 });
  assert.equal((await post(`/api/verify/${p.id}`)).status, 200);
  const slots = await (await fetch(`${base}/api/slots?patientId=${p.id}`)).json();
  assert.equal(slots.length, 10);
});

test('keyed features say key not set', async () => {
  const r = await post('/api/tts', { text: 'hi', lang: 'te' });
  assert.equal(r.status, 503);
  assert.match((await r.json()).error, /key not set/);
  assert.equal((await post('/api/twilio/call/nobody')).status, 503);
  const cfg = await (await fetch(base + '/api/config')).json();
  assert.equal(cfg.keys.sarvam, false);
});

test('family report respects share with family', async () => {
  const patients = await (await fetch(base + '/api/patients')).json();
  const id = (n) => patients.find((p) => p.name.startsWith(n)).id;
  assert.equal((await fetch(`${base}/api/report/${id('Arjun')}?view=family`)).status, 403);
  const r = await (await fetch(`${base}/api/report/${id('Lakshmi')}?view=family`)).json();
  assert.ok(r.summary.length);
});

test('reset reseeds', async () => {
  await post('/api/reset');
  const patients = await (await fetch(base + '/api/patients')).json();
  assert.equal(patients.length, 3);
});

test('health devices: add a sample watch, add a spoken reading, out of range reaches the nurse board', async () => {
  await post('/api/reset');
  const patients = await (await fetch(base + '/api/patients')).json();
  const meena = patients.find((p) => p.name === 'Meena');
  const dev = await (await post('/api/devices', { patientId: meena.id, kind: 'appleWatch', via: 'sample' })).json();
  assert.equal(dev.via, 'sample');
  const h = await (await fetch(`${base}/api/health/${meena.id}`)).json();
  assert.ok(h.devices.some((d) => d.id === dev.id));
  assert.ok(h.feedback.length > 0);
  const r = await (await post('/api/readings', { patientId: meena.id, text: 'BP 172 by 104', source: 'voice' })).json();
  assert.equal(r.reading.type, 'bp');
  assert.equal(r.flag.type, 'reading');
  const flags = await (await fetch(`${base}/api/flags?status=open`)).json();
  assert.equal(flags[0].type === 'urgent' || flags.some((f) => f.type === 'reading' && f.patientId === meena.id), true);
  assert.equal((await post('/api/readings', { patientId: meena.id, text: 'hello there' })).status, 400);
  const arjun = patients.find((p) => p.name === 'Arjun');
  assert.equal((await fetch(`${base}/api/health/${arjun.id}?view=family`)).status, 403, 'family view respects sharing');
  const del = await fetch(`${base}/api/devices/${dev.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
});
