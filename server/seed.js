'use strict';
// Sample data only. Three patients at different points of their course, with a little history.
const T = require('./time');
const M = require('./model');

function seed(now = new Date()) {
  const db = { version: 1, seq: 0, clock: null, patients: [], prescriptions: [], slots: [], calls: [], doseLogs: [], flags: [], misheard: [] };
  const today = T.dateOf(now.toISOString());
  db.clock = T.at(today, '08:55');
  const consent = (lang) => ({ calls: true, stopInfo: true, language: lang, recordedBy: 'Nurse Priya', at: T.at(T.addDays(today, -20), '11:00') });

  const people = [
    {
      p: { name: 'Lakshmi Devi', age: 67, lang: 'te', phoneType: 'keypad', phone: '+91 90000 00001',
        notes: 'Lives alone. Son Ravi lives abroad.', shareWithFamily: true,
        family: { name: 'Ravi', relation: 'Son', phone: '+44 7700 900001', note: 'Lives abroad' } },
      rx: { medicine: 'Amoxiclav', dose: '625 mg', slots: ['breakfast', 'lunch', 'dinner'], days: 14, day: 3 },
      words: 'వేసుకున్నాను', yes: 'అవును',
    },
    {
      p: { name: 'Arjun', age: 24, lang: 'hi', phoneType: 'smart', phone: '+91 90000 00002',
        notes: 'Skin course. Says he feels fine.', shareWithFamily: false,
        family: { name: 'Sunita', relation: 'Mother', phone: '+91 90000 00012', note: '' } },
      rx: { medicine: 'Isotretinoin', dose: '20 mg', slots: ['night'], days: 60, day: 15 },
      words: 'haan le li', yes: 'haan',
    },
    {
      p: { name: 'Meena', age: 20, lang: 'ta', phoneType: 'smart', phone: '+91 90000 00003',
        notes: 'College student. Hostel.', shareWithFamily: true,
        family: { name: 'Selvi', relation: 'Mother', phone: '+91 90000 00013', note: '' } },
      rx: { medicine: 'Cefuroxime', dose: '500 mg', slots: ['breakfast', 'dinner'], days: 10, day: 5 },
      words: 'எடுத்துட்டேன்', yes: 'ஆமாம்',
    },
  ];

  for (const { p, rx, words, yes } of people) {
    const patient = { id: M.nextId(db, 'pat'), createdAt: T.at(T.addDays(today, -rx.day), '11:00'),
      verified: true, verifiedAt: T.at(T.addDays(today, -rx.day), '12:00'), verifiedBy: 'Nurse Priya',
      consent: consent(p.lang), callsStopped: false, ...p };
    db.patients.push(patient);
    const pres = { id: M.nextId(db, 'rx'), patientId: patient.id, medicine: rx.medicine, dose: rx.dose,
      slots: rx.slots, days: rx.days, relation: 'after', startDate: T.addDays(today, -(rx.day - 1)),
      verified: true, createdAt: patient.createdAt };
    db.prescriptions.push(pres);
    M.generateSlots(db, pres);

    // History: everything before the sim clock was confirmed, except the cases below.
    const past = db.slots.filter((s) => s.patientId === patient.id && s.due < db.clock);
    past.forEach((s, i) => {
      const missed = (patient.name === 'Lakshmi Devi' && s.day === 2 && s.slot === 'dinner')
        || (patient.name === 'Arjun' && s.day === 9);
      if (missed) {
        s.status = 'missed';
        const flag = M.addFlag(db, { patientId: patient.id, slotId: s.id, type: 'missed',
          reason: 'Rang 3 times, no answer' });
        flag.createdAt = T.addMinutes(s.due, 20);
        if (patient.name === 'Arjun') { flag.status = 'closed'; flag.closedAt = T.addMinutes(s.due, 600); flag.closedBy = 'Nurse Priya'; }
        return;
      }
      const late = i % 5 === 3 ? 30 : 0;
      s.status = 'taken';
      s.postpones = late ? 1 : 0;
      s.takenAt = T.addMinutes(s.due, late + 2);
      db.doseLogs.push({ id: M.nextId(db, 'log'), slotId: s.id, patientId: patient.id, prescriptionId: pres.id,
        medicine: s.medicine, slot: s.slot, day: s.day, takenAt: s.takenAt, loggedAt: T.addMinutes(s.takenAt, 1),
        words, confirmWords: yes, via: 'voice', callId: null });
    });
  }

  const lakshmi = db.patients[0];
  db.misheard.push({ id: M.nextId(db, 'mis'), patientId: lakshmi.id, callId: null, lang: 'te',
    text: 'ఆ... ఎవరు', confidence: 0.38, reason: 'low confidence', at: T.at(T.addDays(today, -1), '13:32'), suggestion: null });
  return db;
}

module.exports = { seed };
