'use strict';
// The simulated clock runs in India Standard Time (UTC+5:30), whatever the host timezone is.
const IST_MS = 330 * 60000;

function shift(iso) { return new Date(new Date(iso).getTime() + IST_MS); }
function pad(n) { return String(n).padStart(2, '0'); }

function dateOf(iso) {
  const d = shift(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function timeOf(iso) {
  const d = shift(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function at(dateStr, hhmm) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, mi) - IST_MS).toISOString();
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
function addMinutes(iso, n) { return new Date(new Date(iso).getTime() + n * 60000).toISOString(); }
function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

// After-meal call times for each slot.
const SLOT_TIMES = { breakfast: '09:00', lunch: '13:30', dinner: '20:30', night: '22:00' };
const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'night'];

module.exports = { dateOf, timeOf, at, addDays, addMinutes, daysBetween, SLOT_TIMES, SLOT_ORDER };
