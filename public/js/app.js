// Router, polling and the app bar. Each screen exports mount(el) and optional refresh() / unmount().
import { api, setClock, clockLabel, icon } from './lib.js';
import { initMotion, resetScroll } from './motion.js';
import { mountSignature } from './signature.js';
import * as home from './screens/home.js';
import * as tour from './screens/tour.js';
import * as mobile from './screens/mobile.js';
import * as desk from './screens/desk.js';
import * as nurse from './screens/nurse.js';
import * as phone from './screens/phone.js';
import * as family from './screens/family.js';
import * as doctor from './screens/doctor.js';
import * as devices from './screens/devices.js';

const SCREENS = { home, tour, mobile, devices, desk, nurse, phone, family, doctor };
const TITLES = {
  home: 'Voice-first hospital after-care for India',
  tour: 'Interactive application tour',
  mobile: 'Mobile app prototype',
  desk: 'Hospital desk',
  nurse: 'Nurse board',
  phone: 'Patient phone',
  family: 'Family',
  doctor: 'Doctor',
  devices: 'Health devices',
};
const POLL_MS = 2000;
const ROLE_SCREENS = ['desk', 'nurse', 'phone', 'family', 'doctor', 'devices'];
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
  for (const a of document.querySelectorAll('.ct-nav-link[href], .ct-nav-dd__item')) {
    if (a.getAttribute('href') === `#${key}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  document.querySelector('.ct-nav-dd__btn').classList.toggle('is-current', ROLE_SCREENS.includes(key) && key !== 'devices');
  closeMenus();
  if (current && current.unmount) current.unmount();
  current = SCREENS[key];
  currentKey = key;
  document.title = key === 'home' ? `Care Taker: ${TITLES.home}` : `${TITLES[key]} | Care Taker`;
  const view = document.getElementById('view');
  view.className = key === 'home' ? '' : 'ct-page';
  view.innerHTML = '';
  resetScroll();
  let root = view;
  if (ROLE_SCREENS.includes(key)) {
    // Role screens run on the simulated clock, so they show it.
    view.innerHTML = `<p class="ct-simclock">${icon('clock')}Simulated time <strong data-clock>${clockLabel()}</strong></p><div></div>`;
    root = view.lastElementChild;
  }
  current.mount(root, params);
  tick();
}

async function tick() {
  clearTimeout(timer);
  try {
    const c = await api('/api/clock');
    setClock(c);
    for (const n of document.querySelectorAll('[data-clock]')) n.textContent = clockLabel();
    if (current && current.refresh) await current.refresh();
  } catch (err) {
    console.warn('poll failed', err.message);
  }
  timer = setTimeout(tick, POLL_MS);
}

export function activeRoute() { return currentKey; }

// ---- top bar menus --------------------------------------------------------------
const navbar = document.querySelector('.ct-pill-navbar');
const ddBtn = document.querySelector('.ct-nav-dd__btn');
const ddPanel = document.getElementById('ct-features-menu');
const menuBtn = document.querySelector('.ct-nav-menu');
const narrow = () => window.matchMedia('(max-width: 899px)').matches;

function setFeatures(open) {
  ddBtn.setAttribute('aria-expanded', String(open));
  ddPanel.hidden = !open;
}
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  navbar.classList.toggle('is-open', open);
  if (open && narrow()) setFeatures(true);
}
function closeMenus() { setFeatures(false); setMenu(false); }

let hoverOpenedAt = 0;
ddBtn.addEventListener('click', () => {
  // A click right after the pointer opened the menu keeps it open instead of closing it.
  if (Date.now() - hoverOpenedAt < 500) return;
  setFeatures(ddBtn.getAttribute('aria-expanded') !== 'true');
});
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('click', (e) => { if (!navbar.contains(e.target)) closeMenus(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const wasOpen = ddBtn.getAttribute('aria-expanded') === 'true' || navbar.classList.contains('is-open');
  closeMenus();
  if (wasOpen) (narrow() ? menuBtn : ddBtn).focus();
});
// Desktop: the Features menu also opens on hover, and closes when the pointer leaves.
const dd = document.querySelector('.ct-nav-dd');
let hoverTimer = null;
dd.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !narrow()) { clearTimeout(hoverTimer); if (ddPanel.hidden) hoverOpenedAt = Date.now(); setFeatures(true); } });
dd.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !narrow()) hoverTimer = setTimeout(() => setFeatures(false), 180); });

initMotion();
mountSignature();
window.addEventListener('hashchange', route);
window.addEventListener('ct:refresh', tick);
route();
