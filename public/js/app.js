// Router, polling and the app bar. Each screen exports mount(el) and refresh().
import { api, esc } from './lib.js';
import * as desk from './screens/desk.js';
import * as nurse from './screens/nurse.js';
import * as phone from './screens/phone.js';
import * as family from './screens/family.js';
import * as doctor from './screens/doctor.js';

const SCREENS = { desk, nurse, phone, family, doctor };
const TITLES = { desk: 'Hospital desk', nurse: 'Nurse board', phone: 'Patient phone', family: 'Family', doctor: 'Doctor' };
const POLL_MS = 2000;
let current = null;
let timer = null;

function route() {
  const name = (location.hash || '#desk').slice(1);
  const key = SCREENS[name] ? name : 'desk';
  for (const a of document.querySelectorAll('.ct-segmented__item')) {
    if (a.getAttribute('href') === `#${key}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (current && current.unmount) current.unmount();
  current = SCREENS[key];
  document.title = `${TITLES[key]} | Care Taker`;
  const view = document.getElementById('view');
  view.innerHTML = '';
  current.mount(view);
  tick();
}

async function tick() {
  clearTimeout(timer);
  try {
    const c = await api('/api/clock');
    document.getElementById('clock').textContent = `${c.time}, ${new Date(c.date + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
    if (current && current.refresh) await current.refresh();
  } catch (err) {
    console.warn('poll failed', err.message);
  }
  timer = setTimeout(tick, POLL_MS);
}

export function setLangIndicator(text) {
  const el = document.getElementById('lang-indicator');
  if (el) el.innerHTML = esc(text || 'English UI');
}
window.addEventListener('ct:lang', (e) => setLangIndicator(e.detail));
window.addEventListener('hashchange', route);
window.addEventListener('ct:refresh', tick);
route();
