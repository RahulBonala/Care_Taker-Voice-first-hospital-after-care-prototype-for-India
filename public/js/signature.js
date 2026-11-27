// Footer signature, a loop that tells the product in one line:
// a spoken reply flows into the phone, the phone records it, ticks it, and checks the dose in.
//   rest      phone with a heart, "Care Taker" beside it
//   dissolve  the wordmark breaks into dots that stream into the phone as its input
//   words     the dots become the patient's words, gliding into the phone
//   recorded  the heart steps back and the screen says Recorded
//   tick      a tick draws inside a ring
//   checkin   "Check in" appears beside the phone, letter by letter
//   sweep     the phone slides across "Check in", covering it, with speed lines behind
//   reset     back to the logo and the wordmark
// Runs only while the footer is on screen. Reduced motion shows the resting logo.
import { esc } from './lib.js';

const PHASES = [['rest', 1600], ['dissolve', 900], ['words', 2200], ['recorded', 900], ['tick', 900], ['checkin', 900], ['sweep', 1300], ['reset', 700]];
const LINES = [
  ['en', 'I took my tablet at 1:00 pm'],
  ['te', 'మాత్ర వేసుకున్నాను, 1 గంటకు'],
  ['hi', 'haan, ek baje dawai le li'],
  ['ta', 'மாத்திரை எடுத்துட்டேன்'],
];

const letters = (word, cls) => [...word].map((ch, i) => `<span class="${cls}" data-i="${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');

function markup() {
  return `
    <div class="ct-sig" data-phase="rest" aria-hidden="true">
      <div class="ct-sig__lane">
        <span class="ct-sig__rule"></span>
        <span class="ct-sig__dots">${'<span></span>'.repeat(9)}</span>
        <span class="ct-sig__words"><span class="ct-sig__text" lang="en">${esc(LINES[0][1])}</span></span>
      </div>
      <div class="ct-sig__track">
        <div class="ct-sig__mover">
          <span class="ct-sig__speed"><span></span><span></span><span></span></span>
          <div class="ct-sig__phone">
            <svg class="ct-sig__heart" viewBox="0 0 24 24"><path d="M12 20.2l-6.6-6.3a4.3 4.3 0 0 1 6-6.1l.6.6.6-.6a4.3 4.3 0 0 1 6 6.1z"/></svg>
            <span class="ct-sig__recorded">Recorded</span>
            <svg class="ct-sig__tick" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8 12.4l2.7 2.7L16.2 9.5"/></svg>
            <span class="ct-sig__slot"></span>
          </div>
        </div>
        <span class="ct-sig__label">
          <span class="ct-sig__word">${letters('Care Taker', 'ct-sig__ch')}</span>
          <span class="ct-sig__checkin">${letters('Check in', 'ct-sig__ck')}</span>
        </span>
      </div>
    </div>`;
}

let root = null;
let timer = 0;
let step = 0;
let loop = 0;
let visible = false;

function next() {
  if (!root || !visible || document.hidden) { timer = 0; return; }
  const [phase, ms] = PHASES[step];
  if (phase === 'rest' && step === 0) {
    const [lang, text] = LINES[loop % LINES.length];
    const w = root.querySelector('.ct-sig__text');
    w.textContent = text;
    w.setAttribute('lang', lang);
    loop += 1;
  }
  root.dataset.phase = phase;
  step = (step + 1) % PHASES.length;
  timer = setTimeout(next, ms);
}

function start() { if (!timer) next(); }

export function mountSignature() {
  const host = document.querySelector('.ct-signature');
  if (!host) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // the static logo and wordmark stay
  host.innerHTML = markup();
  root = host.querySelector('.ct-sig');
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start();
  }, { threshold: 0.3 }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });
}
