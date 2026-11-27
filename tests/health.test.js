'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { seed } = require('../server/seed');
const H = require('../server/health');
const { parseReading } = require('../server/readingparse');

const fresh = () => seed(new Date('2026-11-28T03:00:00Z'));
const pid = (db, n) => db.patients.find((p) => p.name.startsWith(n)).id;

test('seed has devices for every patient and one reading to review', () => {
  const db = fresh();
  assert.equal(db.devices.length, 4);
  const flags = db.flags.filter((f) => f.type === 'reading' && f.status === 'open');
  assert.equal(flags.length, 1);
  assert.match(flags[0].reason, /162\/98/);
});

test('reading inside the range raises nothing, outside raises one flag per type', () => {
  const db = fresh();
  const id = pid(db, 'Arjun');
  assert.equal(H.addReading(db, { patientId: id, type: 'bp', value: { sys: 118, dia: 76 } }).flag, null);
  const a = H.addReading(db, { patientId: id, type: 'bp', value: { sys: 170, dia: 100 } });
  assert.equal(a.flag.type, 'reading');
  const b = H.addReading(db, { patientId: id, type: 'bp', value: { sys: 175, dia: 104 } });
  assert.equal(b.flag.id, a.flag.id, 'same open flag is updated');
  assert.match(b.flag.reason, /175\/104/);
});

test('glucose uses the fasting or after meal limit', () => {
  const db = fresh();
  const id = pid(db, 'Meena');
  assert.ok(H.addReading(db, { patientId: id, type: 'glucose', value: { mgdl: 150, context: 'fasting' } }).flag);
  const db2 = fresh();
  assert.equal(H.addReading(db2, { patientId: pid(db2, 'Meena'), type: 'glucose', value: { mgdl: 150, context: 'after meal' } }).flag, null);
});

test('impossible readings are refused', () => {
  const db = fresh();
  assert.throws(() => H.addReading(db, { patientId: pid(db, 'Meena'), type: 'bp', value: { sys: 80, dia: 120 } }), /outside what a device/);
});

test('daily totals replace the same day value instead of adding a row', () => {
  const db = fresh();
  const id = pid(db, 'Meena');
  const dev = db.devices.find((d) => d.patientId === id);
  const before = db.readings.length;
  H.syncSample(db, dev);
  assert.equal(db.readings.filter((r) => r.type === 'steps' && r.deviceId === dev.id).length, 7);
  assert.ok(db.readings.length - before < 5);
});

test('feedback states facts and never gives advice', () => {
  const db = fresh();
  const banned = /\b(should|must|try|reduce|increase|avoid|eat|drink|stop taking|take more|exercise more|walk more|medicine|dose)\b/i;
  for (const p of db.patients) {
    const s = H.summary(db, p.id);
    for (const f of s.feedback) assert.doesNotMatch(f.text, banned, f.text);
    for (const f of s.feedback.filter((x) => x.kind === 'flag')) assert.match(f.text, /nurse|care team/);
  }
});

test('steps feedback compares with the doctor goal', () => {
  const db = fresh();
  const s = H.summary(db, pid(db, 'Arjun'));
  assert.ok(s.feedback.some((f) => /goal is 7,000/.test(f.text)));
});

test('doctor ranges are validated', () => {
  const db = fresh();
  const id = pid(db, 'Lakshmi');
  const r = H.setRanges(db, id, { bpSysMax: 150, stepsGoal: 3000 }, 'Dr. Rao');
  assert.equal(r.bpSysMax, 150);
  assert.throws(() => H.setRanges(db, id, { bpSysMin: 160 }, 'Dr. Rao'), /lower limit/);
});

test('spoken and typed readings', () => {
  assert.deepEqual(parseReading('BP 130 by 85'), { type: 'bp', value: { sys: 130, dia: 85 } });
  assert.deepEqual(parseReading('pressure 140 over 90 pulse 72'), { type: 'bp', value: { sys: 140, dia: 90, pulse: 72 } });
  assert.deepEqual(parseReading('sugar 145 after food'), { type: 'glucose', value: { mgdl: 145, context: 'after meal' } });
  assert.deepEqual(parseReading('fasting sugar 110'), { type: 'glucose', value: { mgdl: 110, context: 'fasting' } });
  assert.deepEqual(parseReading('शुगर 150 खाने के बाद'), { type: 'glucose', value: { mgdl: 150, context: 'after meal' } });
  assert.equal(parseReading('hello'), null);
});

test('Bluetooth health formats are decoded', async () => {
  const ble = await import('../public/js/ble.js');
  assert.equal(ble.sfloat(0x0078), 120);
  assert.equal(ble.sfloat(0xF4D2), 123.4);
  // Blood pressure: flags 0x04 (mmHg, pulse present), 128/82, MAP 97, pulse 70
  const bp = new DataView(new Uint8Array([0x04, 0x80, 0x00, 0x52, 0x00, 0x61, 0x00, 0x46, 0x00]).buffer);
  assert.deepEqual({ ...ble.parseBloodPressure(bp), time: undefined }, { sys: 128, dia: 82, pulse: 70, time: undefined });
  // Heart rate: uint8 format, 72
  assert.equal(ble.parseHeartRate(new DataView(new Uint8Array([0x00, 72]).buffer)).bpm, 72);
  // Glucose: flags 0x02 (concentration present, kg/L), seq 1, time 2026-11-27 08:00:00, 0.00110 kg/L = 110 mg/dL
  const g = new Uint8Array([0x02, 0x01, 0x00, 0xEA, 0x07, 11, 27, 8, 0, 0, 0x6E, 0xB0, 0x11]);
  assert.equal(ble.parseGlucose(new DataView(g.buffer)).mgdl, 110);
});
