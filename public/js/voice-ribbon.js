// Voice to report: spoken words appear on the left, the pill listens and processes,
// the clean report runs out on the dark band, and the report card shows it was created.
// Wide screens draw it as a ribbon; narrow screens stack the same steps.
import { esc, icon } from './lib.js';

const SCENES = [
  {
    key: 'te', lang: 'Telugu', who: 'Lakshmi Devi', time: '09:02',
    raw: 'ఆ... అవును, టిఫిన్ అయ్యాక మాత్ర వేసుకున్నాను',
    gloss: 'Yes, I took the tablet after breakfast',
    clean: 'Lakshmi Devi · Breakfast dose taken 09:02 · Said yes',
    intent: ['taken', 'check', 'Taken'],
    action: 'Read back, patient said yes, dose logged',
    to: 'Nurse board, doctor, family',
  },
  {
    key: 'hi', lang: 'Hindi', who: 'Arjun', time: '22:01',
    raw: 'haan... raat wali goli le li, lekin chakkar aa raha hai',
    gloss: 'Took the night tablet, but feeling dizzy',
    clean: 'Arjun · Feels dizzy · Urgent nurse callback · Not logged',
    intent: ['urgent', 'alert', 'Urgent'],
    action: 'Unwell outranks taken, urgent flag raised',
    to: 'Nurse board first, then doctor',
  },
  {
    key: 'ta', lang: 'Tamil', who: 'Meena', time: '09:00',
    raw: 'innum saapidala... oru 20 nimisham apram call pannunga',
    gloss: 'Not eaten yet, call in 20 minutes',
    clean: 'Meena · Not eaten yet · Call moved to 09:20 · Not logged',
    intent: ['later', 'clock', 'Later'],
    action: 'Call rescheduled by the minutes heard',
    to: 'Nurse board',
  },
  {
    key: 'en', lang: 'English and Hindi', who: 'Arjun', time: '22:00',
    raw: 'I feel fine now... maine dawai band kar di',
    gloss: 'I feel fine, I stopped the medicine',
    clean: 'Arjun · Stopped early · Reason saved · Care team told',
    intent: ['stopped', 'stop', 'Stopped early'],
    action: 'Asked why, reason saved, stopped early flag',
    to: 'Nurse board, doctor',
  },
];

const WORD_MS = 260;
const PROCESS_MS = 1400;
const CLEAN_WORD_MS = 90;
const HOLD_MS = 3800;

let root = null;
let token = 0;
let sceneIdx = 0;
let paused = false;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => s.split(/\s+/).filter(Boolean);

export function markup() {
  const bars = Array.from({ length: 13 }, () => '<span></span>').join('');
  return `
  <section class="ct-v2r" aria-labelledby="v2r-title" data-state="idle">
    <h2 class="visually-hidden" id="v2r-title">From a spoken reply to a report</h2>
    <div class="ct-v2r__stage" aria-hidden="true">
      <svg class="ct-v2r__svg" viewBox="0 0 1440 340" preserveAspectRatio="xMidYMid meet" focusable="false">
        <defs>
          <path id="v2r-in" d="M -40 110 C 150 104 230 250 420 246 C 520 244 570 236 630 236"/>
          <path id="v2r-out" d="M 790 236 C 990 238 1190 170 1480 64"/>
        </defs>
        <use href="#v2r-in" class="ct-v2r__guide"/>
        <text class="ct-v2r__raw"><textPath href="#v2r-in" startOffset="100%" text-anchor="end" id="v2r-raw-path"></textPath></text>
        <use href="#v2r-out" class="ct-v2r__band"/>
        <text class="ct-v2r__clean" dy="7"><textPath href="#v2r-out" startOffset="3%" id="v2r-clean-path"></textPath></text>
      </svg>
      <div class="ct-v2r__lang" id="v2r-lang"></div>
      <div class="ct-v2r__pill"><span class="ct-v2r__bars">${bars}</span></div>
      <div class="ct-v2r__status" id="v2r-status"></div>
    </div>

    <div class="ct-v2r__stack" aria-hidden="true">
      <p class="ct-v2r__stack-label" id="v2r-s-lang"></p>
      <p class="ct-v2r__stack-raw" id="v2r-s-raw"></p>
      <div class="ct-v2r__stack-mid"><div class="ct-v2r__pill ct-v2r__pill--inline"><span class="ct-v2r__bars">${bars}</span></div><span class="ct-v2r__status ct-v2r__status--inline" id="v2r-s-status"></span></div>
      <p class="ct-v2r__stack-clean" id="v2r-s-clean"></p>
    </div>

    <div class="ct-v2r__report-wrap">
      <article class="ct-v2r__report" id="v2r-report" aria-live="polite">
        <header class="ct-v2r__report-head">
          <span class="ct-v2r__report-brand"><span class="ct-pill-brand__bars" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></span>Care Taker</span>
          <span class="ct-v2r__report-made" id="v2r-made">Waiting for a reply</span>
        </header>
        <dl class="ct-v2r__report-body" id="v2r-body"></dl>
      </article>
      <div class="ct-v2r__controls">
        <div class="ct-choices" role="group" aria-label="Choose an example call">
          ${SCENES.map((s, i) => `<button type="button" class="ct-chip ct-v2r__chip" data-scene="${i}">${esc(s.lang)}</button>`).join('')}
        </div>
        <button type="button" class="ct-btn ct-btn--ghost ct-btn--sm" id="v2r-pause">${icon('stop')}<span>Pause</span></button>
      </div>
    </div>
  </section>`;
}

function setState(state, label) {
  root.dataset.state = state;
  for (const id of ['#v2r-status', '#v2r-s-status']) {
    const n = root.querySelector(id);
    if (n) n.innerHTML = label;
  }
}

function renderRaw(scene, shown) {
  const list = words(scene.raw);
  const path = root.querySelector('#v2r-raw-path');
  path.innerHTML = list.map((w, i) => `<tspan class="${i < shown ? 'is-on' : ''}">${esc(w)} </tspan>`).join('');
  root.querySelector('#v2r-s-raw').innerHTML = list.map((w, i) => `<span class="${i < shown ? 'is-on' : ''}">${esc(w)}</span>`).join(' ');
}

function renderClean(scene, shown) {
  const list = words(scene.clean);
  root.querySelector('#v2r-clean-path').innerHTML = list.map((w, i) => `<tspan class="${i < shown ? 'is-on' : ''}">${esc(w)} </tspan>`).join('');
  root.querySelector('#v2r-s-clean').innerHTML = list.map((w, i) => `<span class="${i < shown ? 'is-on' : ''}">${esc(w)}</span>`).join(' ');
}

function renderReport(scene, made) {
  const [kind, ic, label] = scene.intent;
  root.querySelector('#v2r-made').innerHTML = made ? `${icon('check')}Report created ${esc(scene.time)}` : `${icon('pending')}Listening`;
  root.querySelector('#v2r-report').classList.toggle('is-made', made);
  root.querySelector('#v2r-body').innerHTML = `
    <div><dt>Patient</dt><dd>${esc(scene.who)}, ${esc(scene.lang)}</dd></div>
    <div><dt>Heard</dt><dd><span class="ct-quote">${esc(scene.raw)}</span><span class="ct-v2r__gloss">${esc(scene.gloss)}</span></dd></div>
    <div><dt>Understood</dt><dd>${made ? `<span class="ct-status ct-status--${kind}">${icon(ic)}${esc(label)}</span>` : '<span class="ct-status ct-status--pending">' + icon('pending') + 'Processing</span>'}</dd></div>
    <div><dt>Action</dt><dd>${made ? esc(scene.action) : ''}</dd></div>
    <div><dt>Sent to</dt><dd>${made ? esc(scene.to) : ''}</dd></div>`;
  root.querySelectorAll('.ct-v2r__chip').forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.scene) === sceneIdx)));
  root.querySelector('#v2r-lang').textContent = `Heard in ${scene.lang}`;
  root.querySelector('#v2r-s-lang').textContent = `Heard in ${scene.lang}`;
}

async function play(t) {
  while (t === token) {
    const scene = SCENES[sceneIdx];
    if (reduced()) {
      renderRaw(scene, 99); renderClean(scene, 99); renderReport(scene, true);
      setState('done', `${icon('check')}Report created`);
      return;
    }
    renderRaw(scene, 0); renderClean(scene, 0); renderReport(scene, false);
    setState('listening', `${icon('mic')}Listening`);
    const raw = words(scene.raw);
    for (let i = 1; i <= raw.length; i++) { await wait(WORD_MS); if (t !== token) return; renderRaw(scene, i); }
    setState('processing', `${icon('waveform')}Processing`);
    await wait(PROCESS_MS); if (t !== token) return;
    setState('writing', `${icon('list')}Writing the report`);
    const clean = words(scene.clean);
    for (let i = 1; i <= clean.length; i++) { await wait(CLEAN_WORD_MS); if (t !== token) return; renderClean(scene, i); }
    renderReport(scene, true);
    setState('done', `${icon('check')}Report created`);
    await wait(HOLD_MS); if (t !== token) return;
    while (paused && t === token) await wait(250);
    sceneIdx = (sceneIdx + 1) % SCENES.length;
  }
}

export function mountRibbon(container) {
  root = container.querySelector('.ct-v2r');
  if (!root) return;
  sceneIdx = 0;
  paused = false;
  root.querySelectorAll('.ct-v2r__chip').forEach((c) => c.addEventListener('click', () => {
    sceneIdx = Number(c.dataset.scene);
    token += 1;
    play(token);
  }));
  const pauseBtn = root.querySelector('#v2r-pause');
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.innerHTML = paused ? `${icon('forward')}<span>Play</span>` : `${icon('stop')}<span>Pause</span>`;
  });
  token += 1;
  play(token);
}

export function stopRibbon() { token += 1; root = null; }
