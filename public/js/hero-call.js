// Hero story, one loop per call: a doctor writes the prescription on an Rx pad, the handwriting
// lifts off as words that travel along the dotted stream to the phone, the phone calls the
// patient, and the call fills the Care cards for the nurse, doctor and family.
// Two calls alternate: Lakshmi confirms her dose, Arjun says he feels dizzy.
// data-phase on the scene drives the doctor and the stream (idle, write, send, call, fade, static);
// data-state on .ct-hcall drives the phone (idle, ringing, speaking, listening, processing, done, urgent).
import { esc, icon } from './lib.js';
import { logo } from './logo.js';
import { careCard } from './care-card.js';

const CALLS = [
  {
    who: 'Lakshmi Devi', name: 'Lakshmi', slot: 'After breakfast, 09:00', clock: '9:02', next: 'Next call 09:00',
    rx: 'Paracetamol 650   •   after breakfast and dinner   •   5 days',
    lines: [
      { from: 'bot', text: 'మీ ఉదయం మాత్రలు వేసుకున్నారా?', gloss: 'Have you taken your breakfast tablets?' },
      { from: 'patient', text: 'ఆ... వేసుకున్నాను', gloss: 'Yes, I have taken it' },
      { from: 'bot', text: 'మీరు 09:02కి వేసుకున్నారు. సరేనా?', gloss: 'You took it at 09:02. Is that right?' },
      { from: 'patient', text: 'అవును', gloss: 'Yes' },
    ],
    result: ['taken', 'check', 'Dose confirmed, 09:02'],
    // Care card states: [state, text, time]. "start" before the call, numbers after that line,
    // "report" when the report is written, "settle" a moment later.
    cards: {
      start: { nurse: ['scheduled', 'Breakfast dose at 09:00'], doctor: ['scheduled', 'Paracetamol 650, 5 days'], family: ['scheduled', 'News after the call'] },
      1: { nurse: ['received', 'Lakshmi says she took it', '09:02'] },
      3: { nurse: ['logged', 'Logged after her yes', '09:02'] },
      report: { doctor: ['reviewing', 'Course day 2 of 5', '09:03'], family: ['received', 'Breakfast dose confirmed', '09:03'] },
      settle: { family: ['shared', 'Shared with her son', '09:03'] },
    },
  },
  {
    who: 'Arjun', name: 'Arjun', slot: 'Night, 22:00', clock: '22:01', next: 'Next call 22:00',
    rx: 'Amlodipine 5 mg   •   at night   •   30 days',
    lines: [
      { from: 'bot', text: 'रात की दवाई ले ली?', gloss: 'Have you taken your night tablet?' },
      { from: 'patient', text: 'haan le li, lekin chakkar aa raha hai', gloss: 'Took it, but feeling dizzy' },
      { from: 'bot', text: 'कुछ ही मिनटों में एक नर्स आपको कॉल करेंगी.', gloss: 'A nurse will call you in a few minutes.' },
    ],
    result: ['urgent', 'alert', 'Urgent: nurse calls back'],
    cards: {
      start: { nurse: ['scheduled', 'Night dose at 22:00'], doctor: ['scheduled', 'Amlodipine 5 mg, 30 days'], family: ['scheduled', 'News after the call'] },
      1: { nurse: ['urgent', 'Arjun says he feels dizzy', '22:01'] },
      2: { doctor: ['reviewing', 'His exact words are saved', '22:01'] },
      report: { family: ['private', 'Arjun keeps this private', '22:02'] },
    },
  },
];
const ROLES = ['nurse', 'doctor', 'family'];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let scene = null;
let root = null;
let token = 0;
let ro = null;
let queued = 0;

// The doctor at a desk, writing on an Rx pad. Own line art, colours from hero.css classes.
export function doctorMarkup(variant) {
  return `
  <svg class="ct-doc ct-doc--${variant}" viewBox="0 0 200 150" focusable="false" aria-hidden="true">
    <rect class="d-soft" x="34" y="40" width="78" height="84" rx="16"/>
    <path class="d-coat" d="M38 126 C38 98 45 84 61 79 L87 79 C103 84 110 98 110 126 Z"/>
    <path class="d-teal" d="M66 79 L74 95 L82 79 Z"/>
    <path class="d-line" d="M62 80 L74 104 L86 80"/>
    <path class="d-skin" d="M68 62 L68 80 L80 80 L80 62 Z"/>
    <circle class="d-skin" cx="74" cy="50" r="16"/>
    <path class="d-hair" d="M58 51 C56 35 66 29 75 29 C87 29 93 38 90 50 C86 43 80 40 74 41 C66 41 61 45 58 51 Z"/>
    <circle class="d-thin" cx="68" cy="53" r="4"/><circle class="d-thin" cx="80" cy="53" r="4"/><path class="d-thin" d="M72 53 L76 53"/>
    <path class="d-thin" d="M70 61 Q74 64 78 61"/>
    <path class="d-steth" d="M63 80 C58 96 62 104 70 106 M85 80 C90 96 86 104 78 106"/>
    <circle class="d-steth-head" cx="74" cy="107" r="4"/>
    <path class="d-arm-o" d="M46 94 C42 108 50 114 64 114 L82 114"/>
    <path class="d-arm" d="M46 94 C42 108 50 114 64 114 L82 114"/>
    <circle class="d-skin" cx="87" cy="113" r="5"/>
    <path class="d-paper" d="M128 116 L180 116 L174 66 L134 66 Z"/>
    <path class="d-clip" d="M146 62 L162 62 L162 70 L146 70 Z"/>
    <text class="d-rx" x="139" y="84">Rx</text>
    <g class="ct-doc__writing">
      <path class="d-ink" pathLength="1" d="M156 79 q2 -3 4 0 t4 0 t4 0"/>
      <path class="d-ink" pathLength="1" d="M139 92 q2.5 -3 5 0 t5 0 t5 0 t5 0 t5 0 t4 0"/>
      <path class="d-ink" pathLength="1" d="M139 101 q2.5 -3 5 0 t5 0 t5 0 t5 0 t4 0"/>
    </g>
    <path class="d-desk" d="M6 116 L196 116 L196 124 L6 124 Z"/>
    <path class="d-line" d="M18 124 L18 148 M184 124 L184 148"/>
    <path class="d-arm-o" d="M104 90 C114 100 118 110 128 112 L152 110"/>
    <path class="d-arm" d="M104 90 C114 100 118 110 128 112 L152 110"/>
    <g class="ct-doc__pen">
      <path class="d-pen" d="M161 103 L173 89"/>
      <circle class="d-skin" cx="158" cy="108" r="5.5"/>
    </g>
    <circle class="ct-doc__anchor" cx="176" cy="74" r="1"/>
  </svg>`;
}

// The dotted stream from the Rx pad to the phone. Its path is measured in mountHeroCall.
export function flowMarkup() {
  return `
  <svg class="ct-flow" aria-hidden="true" focusable="false">
    <defs>
      <mask id="ct-flow-mask" maskUnits="userSpaceOnUse"><path class="ct-flow__reveal" data-flow-path pathLength="1" d="M0 0"/></mask>
    </defs>
    <path class="ct-flow__dots" id="ct-flow-path" data-flow-path d="M0 0"/>
    <path class="ct-flow__dots ct-flow__dots--lit" data-flow-path mask="url(#ct-flow-mask)" d="M0 0"/>
    <text class="ct-flow__words" dy="-7"><textPath href="#ct-flow-path" startOffset="-100%" id="ct-flow-text">${esc(CALLS[0].rx)}<animate id="ct-flow-anim" attributeName="startOffset" from="-60%" to="100%" dur="2.8s" begin="indefinite" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.77 0 0.175 1"/></textPath></text>
    <circle class="ct-flow__in" r="5" cx="0" cy="0"/>
  </svg>`;
}

export function markup() {
  const bars = Array.from({ length: 9 }, () => '<span></span>').join('');
  const wave = 'M0 20 Q12.5 6 25 20 T50 20 T75 20 T100 20 T125 20 T150 20 T175 20 T200 20 T225 20 T250 20 T275 20 T300 20 T325 20 T350 20 T375 20 T400 20';
  return `
  <div class="ct-hcall" data-state="idle" aria-hidden="true">
    <div class="ct-hcall__phone">
      <div class="ct-hcall__notch"></div>
      <div class="ct-hcall__screen">
        <div class="ct-hcall__status"><span id="hc-clock">9:02</span><span class="ct-hcall__net"><span></span><span></span><span></span></span></div>
        <div class="ct-hcall__caller">
          <span class="ct-hcall__avatar">${logo()}</span>
          <strong>Care Taker</strong>
          <span class="ct-hcall__sub" id="hc-sub"></span>
        </div>
        <div class="ct-hcall__talk" id="hc-talk"></div>
        <div class="ct-hcall__foot">
          <span class="ct-hcall__bars">${bars}</span>
          <span class="ct-hcall__state" id="hc-state"></span>
        </div>
        <div class="ct-hcall__voice">
          <span class="ct-hcall__wave">
            <svg viewBox="0 0 400 40" preserveAspectRatio="none" focusable="false"><path class="ct-hcall__wave-a" d="${wave}"/><path class="ct-hcall__wave-b" d="${wave}"/></svg>
          </span>
          <span class="ct-hcall__voice-label">${icon('mic')}<span id="hc-voice">Speaking</span></span>
        </div>
      </div>
    </div>
    <ul class="ct-hcall__cards" id="hc-cards">
      ${ROLES.map((r) => `<li class="ct-hcall__card" data-role="${r}"></li>`).join('')}
    </ul>
  </div>`;
}

function bubble(l) {
  return `<p class="ct-hcall__bubble ct-hcall__bubble--${l.from}"><span>${esc(l.text)}</span><span class="ct-hcall__gloss">${esc(l.gloss)}</span></p>`;
}

function resultChip([kind, ic, label], animate = true) {
  const checkSvg = kind === 'taken'
    ? '<svg class="ct-icon ct-dose-chip__check" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path class="ct-dose-chip__stroke" pathLength="1" d="M8 12.5l2.5 2.5L16 9.5"/></svg>'
    : icon(ic);
  return `<span class="ct-dose-chip ct-dose-chip--hero ct-status ct-status--${esc(kind)}${animate ? ' is-entering' : ''}" data-state="${esc(kind)}">${checkSvg}<strong class="ct-dose-chip__label">${esc(label)}</strong></span>`;
}

function setState(state, label) {
  root.dataset.state = state;
  root.querySelector('#hc-state').innerHTML = label;
}

function setPhase(p) { scene.dataset.phase = p; }

// Update one Care card in place, so its emoji keeps moving and its fade runs smoothly.
function setCard(role, [state, text, time = ''], on) {
  const li = root.querySelector(`.ct-hcall__card[data-role="${role}"]`);
  const tpl = document.createElement('template');
  tpl.innerHTML = careCard({ role, state, text, time, on }).trim();
  const fresh = tpl.content.firstElementChild;
  const card = li.querySelector('.ct-care-card');
  li.classList.toggle('is-on', on);
  if (!card) { li.append(fresh); return; }
  card.className = fresh.className;
  card.dataset.state = fresh.dataset.state;
  card.querySelector('.ct-care-card__body').replaceWith(fresh.querySelector('.ct-care-card__body'));
  card.querySelector('.ct-care-card__meta').replaceWith(fresh.querySelector('.ct-care-card__meta'));
}

function applyCards(step, on = true) {
  if (!step) return;
  for (const role of ROLES) if (step[role]) setCard(role, step[role], on);
}

// Measure the doctor's pad and the phone, then draw the stream between them.
function layoutFlow() {
  queued = 0;
  if (!scene) return;
  const doc = [...scene.querySelectorAll('.ct-doc')].find((d) => d.getClientRects().length);
  const phone = scene.querySelector('.ct-hcall__phone');
  if (!doc || !phone) return;
  const box = scene.getBoundingClientRect();
  const a = doc.querySelector('.ct-doc__anchor').getBoundingClientRect();
  const p = phone.getBoundingClientRect();
  const sx = a.left + a.width / 2 - box.left;
  const sy = a.top + a.height / 2 - box.top;
  const side = p.left - box.left > sx + 200;
  const k = side ? 0.8 : 0.55;
  const r = (n) => Math.round(n * 10) / 10;
  const pt = (x, y) => `${r(sx + x * k)} ${r(sy + y * k)}`;
  const lx = sx + 215 * k;
  const ly = sy + 24 * k;
  let d = `M${r(sx)} ${r(sy)} C${pt(75, 6)} ${pt(135, 0)} ${pt(178, -22)} C${pt(222, -44)} ${pt(232, -84)} ${pt(200, -98)} C${pt(168, -112)} ${pt(122, -98)} ${pt(114, -60)} C${pt(106, -22)} ${pt(142, 14)} ${pt(215, 24)}`;
  let ex;
  let ey;
  if (side) {
    ex = p.left - box.left;
    ey = Math.min(Math.max(ly, p.top - box.top + 96), p.bottom - box.top - 96);
    const dx = ex - lx;
    d += ` C${r(lx + dx * 0.35)} ${r(ly + dx * 0.35 * (10 / 73))} ${r(ex - dx * 0.35)} ${r(ey)} ${r(ex)} ${r(ey)}`;
  } else {
    ex = p.left + p.width / 2 - box.left;
    ey = p.top - box.top;
    const dy = Math.max(24, (ey - ly) * 0.6);
    d += ` C${r(lx + 30)} ${r(ly + 4)} ${r(ex)} ${r(ey - dy)} ${r(ex)} ${r(ey)}`;
  }
  scene.querySelectorAll('[data-flow-path]').forEach((n) => n.setAttribute('d', d));
  const dot = scene.querySelector('.ct-flow__in');
  dot.setAttribute('cx', r(ex));
  dot.setAttribute('cy', r(ey));
  scene.querySelector('.ct-flow').classList.add('is-ready');
}
const queueLayout = () => { if (!queued) queued = requestAnimationFrame(layoutFlow); };

// The travel curve is the --ease-in-out token, read from tokens.css.
function useTokenEase() {
  const m = getComputedStyle(document.documentElement).getPropertyValue('--ease-in-out').match(/cubic-bezier\(([^)]+)\)/);
  if (m) scene.querySelector('#ct-flow-anim').setAttribute('keySplines', m[1].split(',').map((n) => n.trim()).join(' '));
}

function startCall(call) {
  const talk = root.querySelector('#hc-talk');
  talk.innerHTML = '';
  root.querySelector('#hc-clock').textContent = call.clock;
  root.querySelector('#hc-sub').textContent = call.next;
  root.querySelector('#hc-voice').textContent = `${call.name} is speaking`;
  scene.querySelector('#ct-flow-text').firstChild.textContent = call.rx;
  applyCards(call.cards.start, false);
  return talk;
}

async function play(t) {
  let i = 0;
  while (t === token) {
    const call = CALLS[i % CALLS.length];
    const live = () => t === token;
    const talk = startCall(call);
    if (reduced()) {
      setPhase('static');
      scene.querySelector('#ct-flow-text').setAttribute('startOffset', '4%');
      talk.innerHTML = call.lines.slice(-3).map(bubble).join('');
      root.querySelector('#hc-sub').textContent = `Called ${call.who}, ${call.slot}`;
      setState('done', resultChip(call.result, false));
      for (const key of Object.keys(call.cards).filter((k) => k !== 'start')) applyCards(call.cards[key]);
      return;
    }
    setPhase('idle');
    setState('idle', `${icon('clock')}${esc(call.next)}`);
    await wait(500); if (!live()) return;

    setPhase('write');
    await wait(2000); if (!live()) return;

    setPhase('send');
    setState('idle', `${icon('pending')}Dose times arriving`);
    scene.querySelector('#ct-flow-anim').beginElement();
    await wait(2700); if (!live()) return;

    setPhase('call');
    root.querySelector('#hc-sub').textContent = `Calling ${call.who}, ${call.slot}`;
    setState('ringing', `${icon('phone')}Ringing`);
    await wait(1300); if (!live()) return;

    for (const [n, l] of call.lines.entries()) {
      const bot = l.from === 'bot';
      setState(bot ? 'speaking' : 'listening', bot ? `${icon('waveform')}Care Taker speaking` : `${icon('mic')}Listening`);
      talk.insertAdjacentHTML('beforeend', bubble(l));
      while (talk.children.length > 3) talk.firstElementChild.remove();
      await wait(bot ? 1500 : 900); if (!live()) return;
      applyCards(call.cards[n]);
      if (!bot) { await wait(600); if (!live()) return; }
    }
    setState('processing', `${icon('pending')}Writing the report`);
    await wait(900); if (!live()) return;
    setState(call.result[0] === 'taken' ? 'done' : 'urgent', resultChip(call.result, true));
    applyCards(call.cards.report);
    await wait(1400); if (!live()) return;
    applyCards(call.cards.settle);
    await wait(3000); if (!live()) return;

    setPhase('fade');
    await wait(500); if (!live()) return;
    i += 1;
  }
}

export function mountHeroCall(container) {
  scene = container.querySelector('[data-hero-scene]');
  root = scene && scene.querySelector('.ct-hcall');
  if (!root) return;
  token += 1;
  useTokenEase();
  layoutFlow();
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(queueLayout);
    ro.observe(scene);
    scene.querySelectorAll('.ct-doc, .ct-hcall__phone').forEach((n) => ro.observe(n));
  }
  window.addEventListener('resize', queueLayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueLayout);
  play(token);
}

export function stopHeroCall() {
  token += 1;
  if (ro) ro.disconnect();
  ro = null;
  window.removeEventListener('resize', queueLayout);
  if (queued) cancelAnimationFrame(queued);
  queued = 0;
  scene = null;
  root = null;
}
