'use strict';
// Shared helpers for the data chain: Patient > Prescription > DoseSlot > Call > DoseLog > Flags.
const T = require('./time');

function nextId(db, prefix) { db.seq = (db.seq || 0) + 1; return `${prefix}_${db.seq}`; }

function patient(db, id) { return db.patients.find((p) => p.id === id); }
function slot(db, id) { return db.slots.find((s) => s.id === id); }
function rxOf(db, id) { return db.prescriptions.find((r) => r.id === id); }

// Creates one DoseSlot per meal slot per day. Only called for verified prescriptions.
function generateSlots(db, rx) {
  if (db.slots.some((s) => s.prescriptionId === rx.id)) return;
  for (let day = 1; day <= rx.days; day++) {
    const date = T.addDays(rx.startDate, day - 1);
    for (const name of T.SLOT_ORDER.filter((s) => rx.slots.includes(s))) {
      db.slots.push({
        id: nextId(db, 'slot'), patientId: rx.patientId, prescriptionId: rx.id, medicine: rx.medicine,
        dose: rx.dose, slot: name, day, date, due: T.at(date, T.SLOT_TIMES[name]),
        status: 'pending', postpones: 0, takenAt: null,
      });
    }
  }
}

const FLAG_ORDER = { urgent: 0, stoppedEarly: 1, notReachable: 2, missed: 3 };
const FLAG_LABELS = { urgent: 'Urgent', stoppedEarly: 'Stopped early', notReachable: 'Not reachable', missed: 'Missed' };

function addFlag(db, f) {
  const flag = { id: nextId(db, 'flag'), status: 'open', createdAt: db.clock, closedAt: null, words: null, ...f };
  db.flags.push(flag);
  return flag;
}

function sortFlags(flags) {
  return [...flags].sort((a, b) => (a.status === b.status ? 0 : a.status === 'open' ? -1 : 1)
    || FLAG_ORDER[a.type] - FLAG_ORDER[b.type] || b.createdAt.localeCompare(a.createdAt));
}

function currentDay(db, rx) {
  const n = T.daysBetween(rx.startDate, T.dateOf(db.clock)) + 1;
  return Math.max(1, Math.min(rx.days, n));
}

module.exports = { nextId, patient, slot, rxOf, generateSlots, addFlag, sortFlags, currentDay, FLAG_ORDER, FLAG_LABELS };
