// Care cards: the one widget Care Taker uses to show what a call produced for each role.
// Naming: "<Role> card" (Nurse card, Doctor card, Family card, Patient card). Class: ct-care-card.
// Every card has: role emoji, role name, a state chip, one line of what happened, and a time.
// States (fixed list): received, reviewing, urgent, logged, shared, private, scheduled.
import { esc, icon } from './lib.js';

export const ROLES = {
  nurse: { emoji: '\u{1F469}‍⚕️', name: 'Nurse card' },
  doctor: { emoji: '\u{1F9D1}‍⚕️', name: 'Doctor card' },
  family: { emoji: '\u{1F46A}', name: 'Family card' },
  patient: { emoji: '\u{1F475}', name: 'Patient card' },
};
export const STATES = {
  received: ['taken', 'check', 'Received'],
  reviewing: ['unclear', 'pending', 'Reviewing'],
  urgent: ['urgent', 'alert', 'Urgent'],
  logged: ['taken', 'check', 'Logged'],
  shared: ['taken', 'users', 'Shared'],
  private: ['missed', 'lock', 'Private'],
  scheduled: ['later', 'clock', 'Scheduled'],
};

// careCard({ role: 'nurse', state: 'urgent', text: 'Arjun says dizzy', time: '22:01', on: true })
export function careCard({ role, state, text, time = '', on = true }) {
  const r = ROLES[role] || ROLES.patient;
  const [kind, ic, label] = STATES[state] || STATES.received;
  return `<div class="ct-care-card ct-care-card--${esc(role)}${on ? ' is-on' : ''}" data-state="${esc(state)}">
    <span class="ct-care-card__emoji" aria-hidden="true">${r.emoji}</span>
    <span class="ct-care-card__body"><strong>${esc(r.name)}</strong><span>${esc(text)}</span></span>
    <span class="ct-care-card__meta"><span class="ct-status ct-status--${kind}">${icon(ic)}${esc(label)}</span>${time ? `<time class="tabular">${esc(time)}</time>` : ''}</span>
  </div>`;
}
