'use strict';
// Family and doctor views: progress, a 7-day record and the patient's own words.
const T = require('./time');
const M = require('./model');
const { LABELS } = require('./intents');

const MISSED = ['missed', 'stopped', 'flagged', 'cancelled'];

function courseStats(db, rx) {
  const slots = db.slots.filter((s) => s.prescriptionId === rx.id);
  const total = slots.length || rx.days * rx.slots.length;
  const taken = slots.filter((s) => s.status === 'taken').length;
  const resolved = slots.filter((s) => s.status === 'taken' || MISSED.includes(s.status)).length;
  return {
    prescriptionId: rx.id, medicine: rx.medicine, dose: rx.dose, slots: rx.slots, days: rx.days, verified: !!rx.verified,
    day: M.currentDay(db, rx), totalDoses: total, taken, resolved,
    missed: slots.filter((s) => MISSED.includes(s.status)).length,
    completionPct: total ? Math.round((taken / total) * 100) : 0,
    adherencePct: resolved ? Math.round((taken / resolved) * 100) : null,
  };
}

function quotesFor(db, patientId, fromDate) {
  const quotes = [];
  for (const c of db.calls.filter((x) => x.patientId === patientId)) {
    for (const t of c.transcript) {
      if (t.who === 'patient' && t.via !== 'key' && t.via !== 'silence' && t.text && T.dateOf(t.at) >= fromDate) {
        quotes.push({ at: t.at, words: t.text, intent: t.intent, label: t.label || LABELS[t.intent] });
      }
    }
  }
  for (const l of db.doseLogs.filter((x) => x.patientId === patientId && !x.callId && T.dateOf(x.takenAt) >= fromDate)) {
    quotes.push({ at: l.takenAt, words: l.words, intent: 'taken', label: LABELS.taken });
  }
  return quotes.sort((a, b) => b.at.localeCompare(a.at));
}

function report(db, patientId) {
  const p = M.patient(db, patientId);
  if (!p) return null;
  const today = T.dateOf(db.clock);
  const from = T.addDays(today, -6);
  const courses = db.prescriptions.filter((r) => r.patientId === p.id).map((rx) => courseStats(db, rx));
  const slots = db.slots.filter((s) => s.patientId === p.id);
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const date = T.addDays(today, -i);
    const day = slots.filter((s) => s.date === date);
    week.push({ date, due: day.length, taken: day.filter((s) => s.status === 'taken').length,
      missed: day.filter((s) => MISSED.includes(s.status)).length,
      open: day.filter((s) => ['pending', 'postponed', 'calling'].includes(s.status)).length });
  }
  const flags = M.sortFlags(db.flags.filter((f) => f.patientId === p.id));
  const weekTaken = week.reduce((a, d) => a + d.taken, 0);
  const weekDone = week.reduce((a, d) => a + d.taken + d.missed, 0);
  const first = p.name.split(' ')[0];
  const summary = [];
  if (courses[0]) summary.push(`${first} is on day ${courses[0].day} of ${courses[0].days} of ${courses[0].medicine}.`);
  summary.push(`This week ${first} confirmed ${weekTaken} of ${weekDone} doses that were due.`);
  const openFlags = flags.filter((f) => f.status === 'open');
  if (openFlags.length) summary.push(`The care team is following up on ${openFlags.length} open ${openFlags.length === 1 ? 'item' : 'items'}.`);
  if (p.callsStopped) summary.push(`${first} asked to stop the calls on ${T.dateOf(p.callsStoppedAt)}.`);
  return {
    patient: p, courses, week, summary, flags,
    quotes: quotesFor(db, p.id, from).slice(0, 20),
    today: slots.filter((s) => s.date === today).sort((a, b) => a.due.localeCompare(b.due)),
  };
}

function measures(db) {
  const resolved = db.slots.filter((s) => s.status === 'taken' || MISSED.includes(s.status));
  const taken = resolved.filter((s) => s.status === 'taken').length;
  const logsWithoutYes = db.doseLogs.filter((l) => !l.confirmWords).length;
  const answered = db.calls.filter((c) => c.answered).length;
  const open = db.flags.filter((f) => f.status === 'open');
  const byType = {};
  for (const t of Object.keys(M.FLAG_ORDER)) byType[t] = open.filter((f) => f.type === t).length;
  return {
    activePatients: db.patients.filter((p) => p.verified && !p.callsStopped).length,
    awaitingVerify: db.patients.filter((p) => !p.verified).length,
    dosesResolved: resolved.length, taken,
    takenPct: resolved.length ? Math.round((taken / resolved.length) * 100) : 0,
    missed: resolved.length - taken,
    logsWithoutYes,
    calls: db.calls.length, answered,
    answerPct: db.calls.length ? Math.round((answered / db.calls.length) * 100) : null,
    openFlags: open.length, flagsByType: byType,
    misheard: db.misheard.length,
  };
}

module.exports = { report, measures, courseStats };
