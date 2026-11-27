// Router, polling and the app bar. Each screen exports mount(el) and optional refresh() / unmount().
import { api, esc } from './lib.js';
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
  for (const a of document.querySelectorAll('.ct-primary-nav__link, .ct-segmented__item')) {
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
  window.scrollTo(0, 0);
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

export function setLangIndicator(text) {
  const el = document.getElementById('lang-indicator');
  if (el) el.innerHTML = esc(text || 'English UI');
}
export function activeRoute() { return currentKey; }

function onScroll() {
  const bar = document.querySelector('.ct-pill-navbar');
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  if (bar) {
    if (y > 20) bar.classList.add('ct-pill-navbar--scrolled');
    else bar.classList.remove('ct-pill-navbar--scrolled');
  }
  const prog = document.getElementById('scroll-progress-bar');
  if (prog) {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(100, Math.max(0, (y / max) * 100));
    prog.style.transform = `scaleX(${(pct / 100).toFixed(4)})`;
  }
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('ct:lang', (e) => setLangIndicator(e.detail));
window.addEventListener('hashchange', route);
window.addEventListener('ct:refresh', tick);
route();
