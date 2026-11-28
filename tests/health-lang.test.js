'use strict';
// Health feedback in the patient's language: every language file carries every feedback template with the
// same placeholders as English, summary() fills them, and the English line always travels alongside.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { seed } = require('../server/seed');
const H = require('../server/health');
const T = require('../server/time');

const dir = path.join(__dirname, '..', 'server', 'lang');
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const en = read('en.json');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
const holes = (s) => (s.match(/\{\w+\}/g) || []).sort();

const fresh = () => seed(new Date('2026-11-28T03:00:00Z'));
const pid = (db, n) => db.patients.find((p) => p.name.startsWith(n)).id;

test('English has a feedback block', () => {
  assert.ok(en.feedback && Object.keys(en.feedback).length >= 20);
});

for (const file of files) {
  test(`${file} has every feedback key with the same placeholders`, () => {
    const L = read(file);
    assert.ok(L.feedback, `${file} has no feedback block`);
    for (const [k, v] of Object.entries(en.feedback)) {
      assert.equal(typeof L.feedback[k], 'string', `${file} is missing feedback ${k}`);
      assert.ok(L.feedback[k].trim(), `${file} feedback ${k} is empty`);
      assert.deepEqual(holes(L.feedback[k]), holes(v), `${file} feedback ${k} placeholders differ`);
      assert.doesNotMatch(L.feedback[k], /[\u2013\u2014]/, `${file} feedback ${k} has a dash`);
    }
    for (const k of Object.keys(L.feedback)) assert.ok(k in en.feedback, `${file} has extra feedback key ${k}`);
  });
}

// A patient with one of every kind of line: steps, calories, sleep, heart rate, blood pressure, sugar, oxygen.
function busyDb() {
  const db = fresh();
  const id = pid(db, 'Lakshmi');
  H.addReading(db, { patientId: id, type: 'steps', value: { count: 4200 } });
  H.addReading(db, { patientId: id, type: 'activeCalories', value: { kcal: 150 } });
  H.addReading(db, { patientId: id, type: 'calories', value: { kcal: 1500 } });
  H.addReading(db, { patientId: id, type: 'sleep', value: { minutes: 400 } });
  H.addReading(db, { patientId: id, type: 'heartRate', value: { bpm: 130 } });
  H.addReading(db, { patientId: id, type: 'spo2', value: { pct: 88 } });
  H.addReading(db, { patientId: id, type: 'bp', value: { sys: 170, dia: 100 } });
  H.addReading(db, { patientId: id, type: 'glucose', value: { mgdl: 240, context: 'after meal' } });
  return { db, id };
}

test('without lang the feedback stays English and text equals en', () => {
  const { db, id } = busyDb();
  const s = H.summary(db, id);
  assert.equal(s.lang, 'en');
  for (const f of s.feedback) assert.equal(f.text, f.en);
  assert.ok(s.feedback.some((f) => /^Last sugar 240 mg\/dL \(after meal\)/.test(f.en)));
});

test('summary with lang returns the translated line and the English line', () => {
  const { db, id } = busyDb();
  const s = H.summary(db, id, { lang: 'hi' });
  assert.equal(s.lang, 'hi');
  const bp = s.feedback.find((f) => /^Last blood pressure 170\/100/.test(f.en));
  assert.ok(bp, 'blood pressure line present');
  assert.equal(bp.kind, 'flag');
  assert.match(bp.text, /ब्लड प्रेशर 170\/100/);
  assert.match(bp.text, /नर्स/);
  const sugar = s.feedback.find((f) => /^Last sugar/.test(f.en));
  assert.match(sugar.text, /खाने के बाद/, 'meal context is translated');
  assert.ok(s.feedback.some((f) => /^आज 4,200 कदम/.test(f.text)), 'numbers stay as digits');
});

test('every language fills every placeholder and keeps the numbers', () => {
  const { db, id } = busyDb();
  const english = H.summary(db, id).feedback;
  for (const file of files) {
    const code = file.replace(/\.json$/, '');
    const s = H.summary(db, id, { lang: code });
    assert.equal(s.feedback.length, english.length, code);
    s.feedback.forEach((f, i) => {
      assert.equal(f.en, english[i].text, `${code} en line ${i}`);
      assert.doesNotMatch(f.text, /\{\w+\}/, `${code}: unfilled placeholder in ${f.text}`);
      for (const n of f.en.match(/\d+(?:[,/:]\d+)*/g) || []) assert.ok(f.text.includes(n), `${code}: ${n} missing from ${f.text}`);
      if (code !== 'en') assert.notEqual(f.text, f.en, `${code} line is still English: ${f.text}`);
    });
  }
});

test('out of range lines in English say who looks at it', () => {
  const { db, id } = busyDb();
  const s = H.summary(db, id);
  const flags = s.feedback.filter((f) => f.kind === 'flag');
  assert.ok(flags.length >= 4);
  for (const f of flags) assert.match(f.en, /nurse|care team/);
  for (const k of Object.keys(en.feedback).filter((x) => /Out/.test(x))) assert.match(en.feedback[k], /nurse|care team/, k);
});

test('unknown lang falls back to English', () => {
  const db = fresh();
  const s = H.summary(db, pid(db, 'Arjun'), { lang: 'xx' });
  assert.equal(s.lang, 'en');
  for (const f of s.feedback) assert.equal(f.text, f.en);
});

test('device lines are translated', () => {
  const db = fresh();
  const id = pid(db, 'Meena');
  H.addDevice(db, { patientId: id, kind: 'bp', via: 'bluetooth', name: 'Omron cuff' });
  const dev = db.devices.find((d) => d.patientId === id && d.via === 'sample');
  dev.lastSync = T.at(T.addDays(T.dateOf(db.clock), -3), '09:00');
  const s = H.summary(db, id, { lang: 'ta' });
  const paired = s.feedback.find((f) => /^Omron cuff is paired/.test(f.en));
  assert.ok(paired && /^Omron cuff இணைக்கப்பட்டுள்ளது/.test(paired.text));
  const stale = s.feedback.find((f) => /has not synced for 3 days/.test(f.en));
  assert.ok(stale && /3 நாட்களாக/.test(stale.text));
});

test('GET /api/health/:id passes lang and stays English without it', async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'caretaker-hl-'));
  const { createApp } = require('../server/app');
  const store = require('../server/store');
  store.load();
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const patients = await (await fetch(`${base}/api/patients`)).json();
    const arjun = patients.find((p) => p.name === 'Arjun');
    const plain = await (await fetch(`${base}/api/health/${arjun.id}`)).json();
    assert.ok(plain.feedback.length);
    for (const f of plain.feedback) assert.equal(f.text, f.en);
    const hi = await (await fetch(`${base}/api/health/${arjun.id}?lang=hi`)).json();
    assert.equal(hi.lang, 'hi');
    assert.ok(hi.feedback.every((f, i) => f.en === plain.feedback[i].en && f.text !== f.en));
  } finally { server.close(); }
});
