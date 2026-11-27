// Router, polling and the app bar. Each screen exports mount(el) and optional refresh() / unmount().
import { api } from './lib.js';
import { initMotion, resetScroll } from './motion.js';
import * as home from './screens/home.js';
import * as tour from './screens/tour.js';
import * as mobile from './screens/mobile.js';
import * as desk from './screens/desk.js';
import * as nurse from './screens/nurse.js';
import * as phone from './screens/phone.js';
import * as family from './screens/family.js';
import * as doctor from './screens/doctor.js';

const SCREENS = { home, tour, mobile, desk, nurse, phone, family, doctor };
const TITLES = {
  home: 'Voice-first hospital after-care for India',
  tour: 'Interactive application tour',
  mobile: 'Mobile app prototype',
  desk: 'Hospital desk',
  nurse: 'Nurse board',
  phone: 'Patient phone',
  family: 'Family',
  doctor: 'Doctor',
};
const POLL_MS = 2000;
let current = null;
let currentKey = null;
let timer = null;

function parseHash() {
  const raw = (location.hash || '#home').slice(1);
  const [name, queryStr] = raw.split('?');
  const key = SCREENS[name] ? name : 'home';
  const params = new URLSearchParams(queryStr || '');
  return { key, params };
}

function route() {
  const { key, params } = parseHash();
  for (const a of document.querySelectorAll('.ct-pill-toggle__btn, .ct-pill-roles__link')) {
    if (a.getAttribute('href') === `#${key}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (current && current.unmount) current.unmount();
  current = SCREENS[key];
  currentKey = key;
  document.title = key === 'home' ? `Care Taker: ${TITLES.home}` : `${TITLES[key]} | Care Taker`;
  const view = document.getElementById('view');
  view.className = key === 'home' ? '' : 'ct-page';
  view.innerHTML = '';
  resetScroll();
  current.mount(view, params);
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

export function activeRoute() { return currentKey; }

initMotion();
window.addEventListener('hashchange', route);
window.addEventListener('ct:refresh', tick);
route();
