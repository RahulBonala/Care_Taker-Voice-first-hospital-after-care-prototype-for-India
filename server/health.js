'use strict';
// Health devices: blood pressure monitors, glucose meters, heart rate straps, smartwatches and smart rings.
// Readings are compared only with the ranges the doctor set. Feedback states facts and never gives advice:
// anything outside a range goes to a nurse.
const T = require('./time');
const M = require('./model');
const Lang = require('./lang');

const EN_FB = Lang.get('en').feedback;
const CONTEXT_KEY = { fasting: 'fasting', 'after meal': 'afterMeal' };

const KINDS = {
  bp: { label: 'Blood pressure monitor', metrics: ['bp', 'heartRate'], via: 'bluetooth', service: 'blood_pressure' },
  glucose: { label: 'Glucose meter', metrics: ['glucose'], via: 'bluetooth', service: 'glucose' },
  hr: { label: 'Heart rate strap or band', metrics: ['heartRate'], via: 'bluetooth', service: 'heart_rate' },
  appleWatch: { label: 'Apple Watch', metrics: ['steps', 'activeCalories', 'calories', 'heartRate', 'sleep', 'spo2'], via: 'healthApp', app: 'Apple Health' },
  androidWatch: { label: 'Android smartwatch', metrics: ['steps', 'activeCalories', 'calories', 'heartRate', 'sleep', 'spo2'], via: 'healthApp', app: 'Health Connect' },
  ring: { label: 'Smart ring', metrics: ['steps', 'activeCalories', 'calories', 'heartRate', 'sleep', 'spo2'], via: 'healthApp', app: 'Apple Health or Health Connect' },
};
const DAILY = ['steps', 'activeCalories', 'calories', 'sleep'];
const DEFAULT_RANGES = {
  bpSysMax: 140, bpSysMin: 90, bpDiaMax: 90, bpDiaMin: 60,
  glucoseMin: 70, glucoseFastingMax: 130, glucoseAfterMealMax: 180,
  heartRateMin: 50, heartRateMax: 110, spo2Min: 94, stepsGoal: 3000,
};
const RANGE_KEYS = Object.keys(DEFAULT_RANGES);

class HealthError extends Error {}

function ranges(p) { return { ...DEFAULT_RANGES, ...(p.ranges || {}) }; }

// ---- readings ------------------------------------------------------------------

function validate(type, v) {
  const n = (x) => typeof x === 'number' && Number.isFinite(x);
  const ok = {
    bp: () => n(v.sys) && n(v.dia) && v.sys >= 50 && v.sys <= 260 && v.dia >= 30 && v.dia <= 180 && v.sys > v.dia,
    glucose: () => n(v.mgdl) && v.mgdl >= 20 && v.mgdl <= 600,
    heartRate: () => n(v.bpm) && v.bpm >= 25 && v.bpm <= 230,
    spo2: () => n(v.pct) && v.pct >= 50 && v.pct <= 100,
    steps: () => n(v.count) && v.count >= 0 && v.count <= 100000,
    activeCalories: () => n(v.kcal) && v.kcal >= 0 && v.kcal <= 10000,
    calories: () => n(v.kcal) && v.kcal >= 0 && v.kcal <= 15000,
    sleep: () => n(v.minutes) && v.minutes >= 0 && v.minutes <= 1440,
  }[type];
  if (!ok) throw new HealthError(`Unknown reading type: ${type}`);
  if (!ok()) throw new HealthError('That reading is outside what a device can measure. Check the numbers.');
}

// Is a reading outside the doctor's range? Returns a plain sentence for the nurse, or null.
function outOfRange(type, v, r) {
  if (type === 'bp') {
    if (v.sys > r.bpSysMax || v.dia > r.bpDiaMax) return `Blood pressure ${v.sys}/${v.dia} is above the range the doctor set (up to ${r.bpSysMax}/${r.bpDiaMax})`;
    if (v.sys < r.bpSysMin || v.dia < r.bpDiaMin) return `Blood pressure ${v.sys}/${v.dia} is below the range the doctor set (from ${r.bpSysMin}/${r.bpDiaMin})`;
  }
  if (type === 'glucose') {
    const max = v.context === 'fasting' ? r.glucoseFastingMax : r.glucoseAfterMealMax;
    if (v.mgdl > max) return `Sugar ${v.mgdl} mg/dL${v.context ? ` (${v.context})` : ''} is above the range the doctor set (up to ${max})`;
    if (v.mgdl < r.glucoseMin) return `Sugar ${v.mgdl} mg/dL is below the range the doctor set (from ${r.glucoseMin})`;
  }
  if (type === 'heartRate') {
    if (v.bpm > r.heartRateMax) return `Heart rate ${v.bpm} is above the range the doctor set (up to ${r.heartRateMax})`;
    if (v.bpm < r.heartRateMin) return `Heart rate ${v.bpm} is below the range the doctor set (from ${r.heartRateMin})`;
  }
  if (type === 'spo2' && v.pct < r.spo2Min) return `Oxygen ${v.pct}% is below the range the doctor set (from ${r.spo2Min}%)`;
  return null;
}

function describe(type, v) {
  switch (type) {
    case 'bp': return `${v.sys}/${v.dia}${v.pulse ? `, pulse ${v.pulse}` : ''}`;
    case 'glucose': return `${v.mgdl} mg/dL${v.context ? `, ${v.context}` : ''}`;
    case 'heartRate': return `${v.bpm} beats a minute`;
    case 'spo2': return `${v.pct}%`;
    case 'steps': return `${v.count.toLocaleString('en-IN')} steps`;
    case 'activeCalories': case 'calories': return `${v.kcal} kcal`;
    case 'sleep': return `${Math.floor(v.minutes / 60)} h ${v.minutes % 60} min`;
    default: return '';
  }
}

// Adds one reading. Daily totals (steps, calories, sleep) replace that day's value from the same device.
function addReading(db, { patientId, deviceId = null, type, value, at, source = 'manual', words = null }) {
  const p = M.patient(db, patientId);
  if (!p) throw new HealthError('Patient not found');
  validate(type, value);
  const when = at || db.clock;
  if (DAILY.includes(type)) {
    const date = T.dateOf(when);
    const prev = db.readings.find((x) => x.patientId === patientId && x.deviceId === deviceId && x.type === type && T.dateOf(x.at) === date);
    if (prev) { prev.value = value; prev.at = when; return { reading: prev, flag: null }; }
  }
  const reading = { id: M.nextId(db, 'rd'), patientId, deviceId, type, value, at: when, source, words };
  db.readings.push(reading);
  const reason = outOfRange(type, value, ranges(p));
  reading.outOfRange = !!reason;
  let flag = null;
  if (reason) {
    const open = db.flags.find((f) => f.patientId === patientId && f.type === 'reading' && f.readingType === type && f.status === 'open');
    if (open) { open.reason = reason; open.readingId = reading.id; open.words = words; flag = open; }
    else flag = M.addFlag(db, { patientId, type: 'reading', readingType: type, readingId: reading.id, reason, words });
    flag.createdAt = when;
  }
  return { reading, flag };
}

// ---- devices -------------------------------------------------------------------

function addDevice(db, { patientId, kind, via, name }) {
  const p = M.patient(db, patientId);
  if (!p) throw new HealthError('Patient not found');
  const k = KINDS[kind];
  if (!k) throw new HealthError('Unknown device type');
  const mode = via === 'bluetooth' && k.via === 'bluetooth' ? 'bluetooth' : 'sample';
  const device = { id: M.nextId(db, 'dev'), patientId, kind, label: k.label, name: String(name || k.label).slice(0, 60),
    via: mode, app: k.app || null, metrics: k.metrics, pairedAt: db.clock, lastSync: null };
  db.devices.push(device);
  if (mode === 'sample') syncSample(db, device);
  return device;
}

function removeDevice(db, id) {
  const i = db.devices.findIndex((d) => d.id === id);
  if (i < 0) throw new HealthError('Device not found');
  db.devices.splice(i, 1);
  return { ok: true };
}

// Deterministic sample numbers, so the same day always shows the same values.
function rand(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const between = (r, a, b) => Math.round(a + r() * (b - a));

// Sample profiles by age, so a 67 year old and a 24 year old look different.
function profile(p) {
  const older = (p.age || 40) >= 60;
  return older
    ? { steps: [1800, 3600], hr: [66, 82], sys: [124, 138], dia: [76, 88], fasting: [96, 126], meal: [130, 170], sleep: [330, 430] }
    : { steps: [5200, 9800], hr: [58, 76], sys: [108, 124], dia: [68, 80], fasting: [80, 98], meal: [100, 138], sleep: [360, 480] };
}

// Fills a sample device's readings from 7 days ago (or its last sync) up to the simulated clock.
function syncSample(db, device) {
  if (device.via !== 'sample') throw new HealthError('Bluetooth devices send readings when they take one');
  const p = M.patient(db, device.patientId);
  const pr = profile(p);
  const today = T.dateOf(db.clock);
  const from = device.lastSync ? T.dateOf(device.lastSync) : T.addDays(today, -6);
  const nowMin = Number(T.timeOf(db.clock).slice(0, 2)) * 60 + Number(T.timeOf(db.clock).slice(3));
  for (let date = from; date <= today; date = T.addDays(date, 1)) {
    const r = rand(`${device.id}:${date}`);
    const isToday = date === today;
    const at = (hhmm) => T.at(date, hhmm);
    const passed = (hhmm) => !isToday || Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) <= nowMin;
    const put = (type, value, hhmm) => { if (passed(hhmm)) addReading(db, { patientId: p.id, deviceId: device.id, type, value, at: at(hhmm), source: 'sample' }); };
    if (device.kind === 'bp') {
      put('bp', { sys: between(r, ...pr.sys), dia: between(r, ...pr.dia), pulse: between(r, ...pr.hr) }, '08:10');
      put('bp', { sys: between(r, ...pr.sys), dia: between(r, ...pr.dia), pulse: between(r, ...pr.hr) }, '19:40');
    } else if (device.kind === 'glucose') {
      put('glucose', { mgdl: between(r, ...pr.fasting), context: 'fasting' }, '07:30');
      put('glucose', { mgdl: between(r, ...pr.meal), context: 'after meal' }, '15:00');
    } else if (device.kind === 'hr') {
      put('heartRate', { bpm: between(r, ...pr.hr) }, '07:00');
    } else {
      // Watches and rings: daily totals so far, resting heart rate, oxygen and last night's sleep.
      const dayPart = isToday ? Math.max(0, Math.min(1, (nowMin - 420) / (22 * 60 - 420))) : 1;
      const steps = Math.round(between(r, ...pr.steps) * dayPart);
      const active = Math.round(steps * (0.035 + r() * 0.01));
      put('sleep', { minutes: between(r, ...pr.sleep) }, '06:30');
      put('heartRate', { bpm: between(r, ...pr.hr) }, '06:35');
      put('spo2', { pct: between(r, 95, 99) }, '06:35');
      if (!isToday || nowMin >= 420) {
        const hhmm = isToday ? T.timeOf(db.clock) : '22:00';
        put('steps', { count: steps }, hhmm);
        put('activeCalories', { kcal: active }, hhmm);
        put('calories', { kcal: Math.round(1250 + active + r() * 250 * dayPart) }, hhmm);
      }
    }
  }
  device.lastSync = db.clock;
  return device;
}

// ---- summary and feedback --------------------------------------------------------

function latest(list, type) {
  return list.filter((x) => x.type === type).sort((a, b) => b.at.localeCompare(a.at))[0] || null;
}
function dayTotal(list, type, date) {
  const xs = list.filter((x) => x.type === type && T.dateOf(x.at) === date);
  if (!xs.length) return null;
  const key = type === 'steps' ? 'count' : type === 'sleep' ? 'minutes' : 'kcal';
  return Math.max(...xs.map((x) => x.value[key]));
}
const fmt = (n) => Number(n).toLocaleString('en-IN');

function summary(db, patientId, { lang = 'en' } = {}) {
  const p = M.patient(db, patientId);
  if (!p) return null;
  const r = ranges(p);
  const list = db.readings.filter((x) => x.patientId === patientId);
  const today = T.dateOf(db.clock);
  const days = Array.from({ length: 7 }, (_, i) => T.addDays(today, i - 6));
  const week = days.map((date) => ({
    date,
    steps: dayTotal(list, 'steps', date),
    activeCalories: dayTotal(list, 'activeCalories', date),
    calories: dayTotal(list, 'calories', date),
    sleep: dayTotal(list, 'sleep', date),
  }));
  const todayRow = week[6];
  const lastBp = latest(list, 'bp');
  const lastSugar = latest(list, 'glucose');
  const lastHr = latest(list, 'heartRate');
  const lastSpo2 = latest(list, 'spo2');
  const recent = (type) => list.filter((x) => x.type === type && T.dateOf(x.at) >= days[0]).sort((a, b) => b.at.localeCompare(a.at));
  const devices = db.devices.filter((d) => d.patientId === patientId);

  // Feedback: facts only. Out of range always ends with who will act on it.
  // Each line is a template from the "feedback" block of server/lang/<code>.json; en stays English for the care team.
  const fb = Lang.get(lang).feedback || EN_FB;
  const feedback = [];
  const add = (kind, key, vars = {}) => {
    const fill = (f) => Lang.fill(f[key] || EN_FB[key], { ...vars, context: vars.context && (f[CONTEXT_KEY[vars.context]] || EN_FB[CONTEXT_KEY[vars.context]] || vars.context) });
    feedback.push({ kind, text: fill(fb), en: fill(EN_FB) });
  };
  if (todayRow.steps !== null) {
    const met = todayRow.steps >= r.stepsGoal;
    add(met ? 'ok' : 'info', met ? 'stepsTodayMet' : 'stepsToday', { steps: fmt(todayRow.steps), goal: fmt(r.stepsGoal) });
    const stepsDays = week.slice(0, 6).filter((d) => d.steps !== null);
    if (stepsDays.length >= 3) {
      const avg = Math.round(stepsDays.reduce((a, d) => a + d.steps, 0) / stepsDays.length);
      const metDays = stepsDays.filter((d) => d.steps >= r.stepsGoal).length;
      add('info', 'stepsAverage', { days: stepsDays.length, avg: fmt(avg), met: metDays });
    }
  }
  if (todayRow.activeCalories !== null) {
    add('info', todayRow.calories !== null ? 'activeCaloriesTotal' : 'activeCalories', { active: fmt(todayRow.activeCalories), total: todayRow.calories !== null ? fmt(todayRow.calories) : undefined });
  }
  if (todayRow.sleep !== null) add('info', 'sleep', { hours: Math.floor(todayRow.sleep / 60), minutes: todayRow.sleep % 60 });
  if (lastHr) add(lastHr.outOfRange ? 'flag' : 'info', lastHr.outOfRange ? 'heartRateOut' : 'heartRate', { bpm: lastHr.value.bpm, time: T.timeOf(lastHr.at) });
  if (lastBp) add(lastBp.outOfRange ? 'flag' : 'ok', lastBp.outOfRange ? 'bpOut' : 'bpIn', { sys: lastBp.value.sys, dia: lastBp.value.dia, time: T.timeOf(lastBp.at) });
  if (lastSugar) {
    const key = `sugar${lastSugar.outOfRange ? 'Out' : 'In'}${lastSugar.value.context ? 'Context' : ''}`;
    add(lastSugar.outOfRange ? 'flag' : 'ok', key, { mgdl: lastSugar.value.mgdl, context: lastSugar.value.context || undefined, time: T.timeOf(lastSugar.at) });
  }
  if (lastSpo2 && lastSpo2.outOfRange) add('flag', 'oxygenOut', { pct: lastSpo2.value.pct, time: T.timeOf(lastSpo2.at) });
  const outWeek = list.filter((x) => x.outOfRange && T.dateOf(x.at) >= days[0]).length;
  const countWeek = list.filter((x) => (x.type === 'bp' || x.type === 'glucose') && T.dateOf(x.at) >= days[0]).length;
  if (countWeek) {
    const key = countWeek === 1 ? (outWeek ? 'weekOneOut' : 'weekOneIn') : (outWeek ? 'weekSomeOut' : 'weekAllIn');
    add(outWeek ? 'flag' : 'ok', key, { count: countWeek, out: outWeek });
  }
  for (const d of devices) {
    if (!d.lastSync) add('info', 'devicePaired', { device: d.name });
    else if (T.daysBetween(T.dateOf(d.lastSync), today) >= 2) add('info', 'deviceNotSynced', { device: d.name, days: T.daysBetween(T.dateOf(d.lastSync), today) });
  }
  if (!devices.length && !list.length) add('info', 'noDevice');

  return {
    patient: { id: p.id, name: p.name, age: p.age, shareWithFamily: !!p.shareWithFamily },
    ranges: r, rangesSetBy: (p.ranges && p.ranges.setBy) || 'Default ranges, not yet set by a doctor',
    devices, today: todayRow, week,
    last: { bp: lastBp, glucose: lastSugar, heartRate: lastHr, spo2: lastSpo2 },
    bpWeek: recent('bp'), glucoseWeek: recent('glucose'),
    feedback, lang: Lang.get(lang).code,
  };
}

function setRanges(db, patientId, body, doctor) {
  const p = M.patient(db, patientId);
  if (!p) throw new HealthError('Patient not found');
  const next = { ...ranges(p) };
  for (const k of RANGE_KEYS) {
    if (body[k] === undefined || body[k] === '') continue;
    const n = Number(body[k]);
    if (!Number.isFinite(n) || n < 0 || n > 100000) throw new HealthError(`Check the value for ${k}`);
    next[k] = Math.round(n);
  }
  if (next.bpSysMin >= next.bpSysMax || next.bpDiaMin >= next.bpDiaMax || next.glucoseMin >= next.glucoseFastingMax || next.heartRateMin >= next.heartRateMax) {
    throw new HealthError('Each lower limit must be below its upper limit');
  }
  p.ranges = { ...next, setBy: String(doctor || 'Doctor'), setAt: db.clock };
  return p.ranges;
}

module.exports = { KINDS, DEFAULT_RANGES, RANGE_KEYS, HealthError, ranges, addReading, addDevice, removeDevice, syncSample, summary, setRanges, outOfRange, describe };
