'use strict';
// The dose call as a state machine. The server owns it so every screen sees the same call,
// and so a real phone line (Twilio) can drive the same flow as the browser phone.
//
// Stages: ask -> (confirm | takeNow | callbackWhen | reason | keypad) -> ended
// Rule: a dose is logged only after a spoken "yes" or a pressed 1 at the read-back.
const T = require('./time');
const M = require('./model');
const lang = require('./lang');
const { parse, LABELS } = require('./intents');

const MAX_RINGS = 3;      // rings before a slot is missed
const RETRY_MINUTES = 10; // simulated gap between rings
const MAX_POSTPONES = 3;
const OFFER_MINUTES = 30;

class FlowError extends Error {}

function nextSlotFor(db, patientId) {
  return db.slots
    .filter((s) => s.patientId === patientId && (s.status === 'pending' || s.status === 'postponed'))
    .sort((a, b) => a.due.localeCompare(b.due))[0] || null;
}

function activeCall(db, patientId) {
  return db.calls.find((c) => c.patientId === patientId && c.status !== 'ended') || null;
}

function note(call, db, text) { call.transcript.push({ who: 'system', text, at: db.clock }); }

// "Next slot": move the clock to this patient's next dose and ring the phone.
function startNext(db, patientId) {
  const p = M.patient(db, patientId);
  if (!p) throw new FlowError('Patient not found');
  if (!p.verified) throw new FlowError('A nurse has not verified this patient yet');
  if (p.callsStopped) throw new FlowError('This patient asked to stop calls');
  const open = activeCall(db, patientId);
  if (open) return open;
  const s = nextSlotFor(db, patientId);
  if (!s) throw new FlowError('No doses left in this course');
  if (s.due > db.clock) db.clock = s.due;
  s.status = 'calling';
  const call = {
    id: M.nextId(db, 'call'), patientId, slotId: s.id, status: 'ringing', rings: 1, answered: false,
    startedAt: db.clock, endedAt: null, outcome: null, stage: null, unclear: 0, keypadMode: false,
    seq: 0, turn: null, transcript: [], via: 'browser',
  };
  note(call, db, `Ringing at ${T.timeOf(db.clock)} for the ${s.slot} dose, day ${s.day}`);
  db.calls.push(call);
  return call;
}

function decline(db, call, why = 'Declined') {
  if (call.status !== 'ringing') throw new FlowError('Call is not ringing');
  note(call, db, `${why} (ring ${call.rings} of ${MAX_RINGS})`);
  if (call.rings < MAX_RINGS) {
    call.rings += 1;
    db.clock = T.addMinutes(db.clock, RETRY_MINUTES);
    note(call, db, `Ringing again at ${T.timeOf(db.clock)}`);
    return call;
  }
  const s = M.slot(db, call.slotId);
  missSlot(db, s, `Rang ${MAX_RINGS} times, no answer`);
  call.status = 'ended';
  call.outcome = 'missed';
  call.endedAt = db.clock;
  return call;
}

function missSlot(db, s, reason) {
  s.status = 'missed';
  M.addFlag(db, { patientId: s.patientId, slotId: s.id, type: 'missed', reason });
  const prev = db.slots
    .filter((x) => x.patientId === s.patientId && x.due < s.due && x.id !== s.id && x.status !== 'pending' && x.status !== 'cancelled')
    .sort((a, b) => b.due.localeCompare(a.due))[0];
  const alreadyOpen = db.flags.some((f) => f.patientId === s.patientId && f.type === 'notReachable' && f.status === 'open');
  if (prev && prev.status === 'missed' && !alreadyOpen) {
    const p = M.patient(db, s.patientId);
    const fam = p.family && p.family.name ? ` Family: ${p.family.name} (${p.family.relation}), ${p.family.phone}.` : '';
    M.addFlag(db, { patientId: s.patientId, slotId: s.id, type: 'notReachable', reason: `2 doses missed in a row.${fam}` });
  }
}

// ---- turns -------------------------------------------------------------

function ctx(db, call) {
  const p = M.patient(db, call.patientId);
  const s = M.slot(db, call.slotId);
  const rx = M.rxOf(db, s.prescriptionId);
  return { p, s, rx, code: p.lang };
}

function say(db, call, lines, expect) {
  call.seq += 1;
  call.turn = { seq: call.seq, say: lines, expect, stage: call.stage };
  for (const l of lines) call.transcript.push({ who: 'bot', lineId: l.lineId, text: l.text, en: l.en, at: db.clock });
  return call;
}

function finish(db, call, outcome, lines) {
  const { p, code } = ctx(db, call);
  const next = p.callsStopped ? null : nextSlotFor(db, p.id);
  const bye = p.callsStopped ? [] : next ? [lang.line(code, 'goodbye', { time: T.timeOf(next.due) })] : [lang.line(code, 'goodbyeDone')];
  call.stage = 'ended';
  call.status = 'ended';
  call.outcome = outcome;
  call.endedAt = db.clock;
  return say(db, call, [...lines, ...bye], 'none');
}

function answer(db, call) {
  if (call.status !== 'ringing') throw new FlowError('Call is not ringing');
  const { p, s, rx, code } = ctx(db, call);
  call.status = 'active';
  call.answered = true;
  call.stage = 'ask';
  note(call, db, `Answered at ${T.timeOf(db.clock)}`);
  const lines = [lang.line(code, 'greeting', { name: p.name.split(' ')[0] })];
  // From the halfway day on, remind the patient to finish the course.
  if (s.day >= Math.ceil(rx.days / 2)) lines.push(lang.line(code, 'progress', { n: s.day, total: rx.days }));
  lines.push(lang.line(code, 'askTaken', { slot: s.slot }));
  return say(db, call, lines, 'speech');
}

function readback(db, call, words) {
  const { s, code } = ctx(db, call);
  call.stage = 'confirm';
  call.unclear = 0;
  call.pendingTaken = { at: db.clock, words };
  return say(db, call, [lang.line(code, 'readback', { slot: s.slot, time: T.timeOf(db.clock) })], call.keypadMode ? 'key' : 'speech');
}

function logDose(db, call, confirmWords, via) {
  const { s, code } = ctx(db, call);
  s.status = 'taken';
  s.takenAt = call.pendingTaken.at;
  db.doseLogs.push({
    id: M.nextId(db, 'log'), slotId: s.id, patientId: s.patientId, prescriptionId: s.prescriptionId,
    medicine: s.medicine, slot: s.slot, day: s.day, takenAt: s.takenAt, loggedAt: db.clock,
    words: call.pendingTaken.words, confirmWords, via, callId: call.id,
  });
  return finish(db, call, 'taken', [lang.line(code, 'confirmed')]);
}

function postpone(db, call, minutes, { count = true, lineId = 'postponeOk' } = {}) {
  const { s, code } = ctx(db, call);
  if (count && s.postpones >= MAX_POSTPONES) {
    missSlot(db, s, `Postponed ${MAX_POSTPONES} times`);
    return finish(db, call, 'missed', [lang.line(code, 'postponeLimit')]);
  }
  if (count) s.postpones += 1;
  s.status = 'postponed';
  s.due = T.addMinutes(db.clock, minutes);
  return finish(db, call, 'postponed', [lang.line(code, lineId, { minutes })]);
}

function urgent(db, call, r) {
  const { s, code } = ctx(db, call);
  s.status = 'flagged';
  M.addFlag(db, { patientId: s.patientId, slotId: s.id, type: 'urgent',
    reason: r.intent === 'unwell' ? 'Says they feel unwell' : 'Asked to talk to a person', words: r.text || null, intent: r.intent });
  return finish(db, call, 'urgent', [lang.line(code, 'nurseComing')]);
}

function optOut(db, call, r) {
  const { p, s, code } = ctx(db, call);
  p.callsStopped = true;
  p.callsStoppedAt = db.clock;
  for (const x of db.slots) if (x.patientId === p.id && (x.status === 'pending' || x.status === 'postponed')) x.status = 'cancelled';
  s.status = 'cancelled';
  M.addFlag(db, { patientId: p.id, slotId: s.id, type: 'stoppedEarly', reason: 'Asked to stop the calls', words: r.text || null, intent: 'optOut' });
  return finish(db, call, 'optOut', [lang.line(code, 'optOut')]);
}

function unclear(db, call) {
  const { s, code } = ctx(db, call);
  call.unclear += 1;
  if (call.unclear >= 2) {
    call.stage = 'keypad';
    call.keypadMode = true;
    return say(db, call, [lang.line(code, 'keypad')], 'key');
  }
  const lineId = call.stage === 'confirm' ? 'readback' : 'unclear';
  return say(db, call, [lang.line(code, lineId, { slot: s.slot, time: T.timeOf(call.pendingTaken ? call.pendingTaken.at : db.clock) })], 'speech');
}

// A spoken (or typed) reply.
function reply(db, call, { text = '', confidence, silence = false, via = 'voice' } = {}) {
  if (call.status !== 'active') throw new FlowError('Call is not active');
  if (call.stage === 'keypad') throw new FlowError('Waiting for a key press');
  const { p, code } = ctx(db, call);
  const r = silence ? { text: '', heard: '', intent: 'unclear', reason: 'silence', confidence: null } : parse(text, { lang: code, confidence });
  call.transcript.push({ who: 'patient', text: r.text, heard: r.heard, intent: r.intent, label: LABELS[r.intent],
    minutes: r.minutes || null, confidence: r.confidence, reason: r.reason || null, via: silence ? 'silence' : via, at: db.clock });

  // The reason for stopping is recorded as said, whatever it is.
  if (call.stage === 'reason') {
    const { s } = ctx(db, call);
    s.status = 'stopped';
    M.addFlag(db, { patientId: p.id, slotId: s.id, type: 'stoppedEarly', reason: 'Stopped the medicine early',
      words: call.stopWords, why: r.text || '(no reason given)', intent: 'stopped' });
    return finish(db, call, 'stopped', [lang.line(code, 'tellingTeam')]);
  }
  if (call.stage === 'callbackWhen') {
    if (r.intent === 'unwell' || r.intent === 'wantPerson') return urgent(db, call, r);
    if (r.intent === 'optOut') return optOut(db, call, r);
    return postpone(db, call, r.minutes || OFFER_MINUTES, { count: false });
  }

  if (r.intent === 'unclear') {
    db.misheard.push({ id: M.nextId(db, 'mis'), patientId: p.id, callId: call.id, lang: code,
      text: r.text || '(silence)', confidence: r.confidence, reason: r.reason, at: db.clock, suggestion: null });
    return unclear(db, call);
  }
  switch (r.intent) {
    case 'unwell': case 'wantPerson': return urgent(db, call, r);
    case 'optOut': return optOut(db, call, r);
    case 'stopped':
      call.stage = 'reason';
      call.stopWords = r.text;
      return say(db, call, [lang.line(code, 'askWhyStopped')], 'speech');
    case 'someoneElse':
      call.stage = 'callbackWhen';
      return say(db, call, [lang.line(code, 'askCallbackWhen')], 'speech');
    case 'notEaten': case 'later':
      return postpone(db, call, r.minutes);
    default: break;
  }
  const { s } = ctx(db, call);
  if (call.stage === 'confirm') {
    if (r.intent === 'yes' || r.intent === 'taken') return logDose(db, call, r.text, via);
    call.stage = 'ask';
    call.pendingTaken = null;
    return say(db, call, [lang.line(code, 'askAgain', { slot: s.slot })], 'speech');
  }
  if (call.stage === 'takeNow') {
    if (r.intent === 'taken') return readback(db, call, r.text);
    if (r.intent === 'yes') return postpone(db, call, OFFER_MINUTES, { lineId: 'takeNow' });
    return postpone(db, call, OFFER_MINUTES);
  }
  // stage ask: "yes" alone is read back and must still be confirmed.
  if (r.intent === 'taken' || r.intent === 'yes') return readback(db, call, r.text);
  call.stage = 'takeNow';
  return say(db, call, [lang.line(code, 'notTakenOffer')], 'speech');
}

// A key press. key === null means no key within 10 seconds.
function key(db, call, k) {
  if (call.status !== 'active') throw new FlowError('Call is not active');
  const { p, s, code } = ctx(db, call);
  call.transcript.push({ who: 'patient', text: k === null ? '(no key)' : `Pressed ${k}`, intent: k === null ? 'unclear' : `key${k}`,
    label: k === null ? 'No key' : `Key ${k}`, via: 'key', at: db.clock });
  if (k === null) {
    if (call.stage !== 'keypad') throw new FlowError('Not waiting for a key');
    missSlot(db, s, 'No reply on the keypad');
    return finish(db, call, 'missed', [lang.line(code, 'noKey')]);
  }
  k = String(k);
  if (k === '9') return optOut(db, call, { text: 'Pressed 9' });
  if (k === '3') return urgent(db, call, { intent: 'wantPerson', text: 'Pressed 3' });
  if (k === '2') return postpone(db, call, OFFER_MINUTES);
  if (k === '1') {
    if (call.stage === 'confirm') return logDose(db, call, 'Pressed 1', 'key');
    call.keypadMode = true;
    return readback(db, call, 'Pressed 1');
  }
  throw new FlowError(`Key ${k} does nothing here`);
}

module.exports = { startNext, decline, answer, reply, key, nextSlotFor, activeCall, FlowError, MAX_RINGS, MAX_POSTPONES, RETRY_MINUTES };
