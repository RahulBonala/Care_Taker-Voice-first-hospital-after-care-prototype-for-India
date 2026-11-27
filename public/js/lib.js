// Shared helpers: API calls, escaping, icons, status pills, toasts, formatting.

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
export const post = (path, body = {}) => api(path, { method: 'POST', body });

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const icon = (name, cls = '') => `<svg class="ct-icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const STATUS = {
  taken: ['taken', 'check', 'Taken'],
  later: ['later', 'clock', 'Later'],
  urgent: ['urgent', 'alert', 'Urgent'],
  stopped: ['stopped', 'stop', 'Stopped early'],
  missed: ['missed', 'missed', 'Missed'],
  unclear: ['unclear', 'question', 'Unclear'],
  pending: ['pending', 'pending', 'Pending'],
};
export function status(kind, label) {
  const [cls, ic, text] = STATUS[kind] || STATUS.pending;
  return `<span class="ct-status ct-status--${cls}">${icon(ic)}${esc(label || text)}</span>`;
}

// Dose slot status -> pill
export function slotStatus(s) {
  switch (s.status) {
    case 'taken': return status('taken', `Taken ${s.takenAt ? hm(s.takenAt) : ''}`.trim());
    case 'postponed': return status('later', `Later, ${hm(s.due)}`);
    case 'flagged': return status('urgent', 'Nurse to call');
    case 'stopped': return status('stopped');
    case 'missed': return status('missed');
    case 'cancelled': return status('missed', 'Cancelled');
    case 'calling': return status('pending', 'Calling now');
    default: return status('pending', `Pending, ${hm(s.due)}`);
  }
}

// Reply intent -> pill
const INTENT_KIND = { taken: 'taken', yes: 'taken', key1: 'taken', later: 'later', notEaten: 'later', someoneElse: 'later', key2: 'later',
  unwell: 'urgent', wantPerson: 'urgent', key3: 'urgent', stopped: 'stopped', optOut: 'stopped', key9: 'stopped',
  notTaken: 'missed', no: 'missed', unclear: 'unclear' };
export const intentStatus = (intent, label) => status(INTENT_KIND[intent] || 'unclear', label);

// Flag type -> pill
const FLAG_KIND = { urgent: ['urgent', 'Urgent'], reading: ['later', 'Reading to review'], stoppedEarly: ['stopped', 'Stopped early'], notReachable: ['missed', 'Not reachable'], missed: ['missed', 'Missed'] };
export const flagStatus = (f) => status(...(FLAG_KIND[f.type] || ['missed', f.type]));

const IST = { timeZone: 'Asia/Kolkata' };
export const hm = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { ...IST, hour: '2-digit', minute: '2-digit' }) : '');
export const dayName = (date) => new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
export const dateShort = (iso) => new Date(iso).toLocaleDateString('en-GB', { ...IST, day: 'numeric', month: 'short' });
export const when = (iso) => `<time datetime="${esc(iso)}">${esc(dateShort(iso))}, ${esc(hm(iso))}</time>`;

export const SLOT_LABEL = { breakfast: 'After breakfast', lunch: 'After lunch', dinner: 'After dinner', night: 'Bedtime' };

export function toast(message, kind = 'ok') {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `ct-toast${kind === 'error' ? ' ct-toast--error' : ''}`;
  el.innerHTML = `${icon(kind === 'error' ? 'alert' : 'check')}<span>${esc(message)}</span>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

export function progress(value, max, label, right = '', accent = false) {
  return `<div class="ct-progress${accent ? ' ct-progress--accent' : ''}">
    <div class="ct-progress__label"><strong>${esc(label)}</strong><span>${esc(right)}</span></div>
    <progress max="${Number(max) || 1}" value="${Number(value) || 0}">${esc(label)}</progress></div>`;
}

export function empty(text, iconName = 'check', action = '') {
  return `<div class="ct-empty">${icon(iconName)}<p>${esc(text)}</p>${action}</div>`;
}

// Runs an async action with a loading state on the button.
export async function busy(btn, fn) {
  if (btn) { btn.classList.add('ct-btn--loading'); btn.setAttribute('aria-busy', 'true'); }
  try { return await fn(); }
  finally { if (btn) { btn.classList.remove('ct-btn--loading'); btn.removeAttribute('aria-busy'); } }
}

// Shared config (languages, keys), loaded once.
let configPromise = null;
export const config = () => (configPromise ||= api('/api/config'));
export async function langInfo(code) {
  const c = await config();
  return c.langs.find((l) => l.code === code) || c.langs.find((l) => l.code === 'en');
}
export function langTag(l) {
  return l && !l.reviewed ? `<span class="ct-tag" title="Lines and keywords not yet checked by a native speaker">Language under review</span>` : '';
}

export function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch { return null; }
  return value;
}
