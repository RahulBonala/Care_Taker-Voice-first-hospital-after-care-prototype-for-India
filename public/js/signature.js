// Footer signature: one calm loop that tells the product.
//   rest      the phone with a heart and the "Care Taker" wordmark; on the left a dotted reply line
//             loops for ever, carrying "I took my tablet at 1:00 pm" in several languages
//   dissolve  the wordmark letters turn into dots, travel left past the phone and close the gap
//             in the dotted line right after "1:00 pm"
//   tick      once the dots connect, the phone shows a tick
//   heart     the heart comes back with one soft beat
//   checked   a check-in badge on the phone, and "Checked in" with a mark replaces the wordmark
//   reset     back to the logo and the wordmark
// The reply line is the clock: every loop the gap after "1:00 pm" arrives at the same spot just as
// the dots land. Runs only while the footer is on screen. Reduced motion keeps the static logo.
import { esc } from './lib.js';

const LOOP = 9.6; // seconds per loop
// Phase starts, in seconds from the moment the last dot lands in the line.
const AT = { dissolve: -1.96, tick: 0.12, heart: 0.8, checked: 1.45, reset: 4.4, rest: 5.2 };
const ORDER = ['dissolve', 'tick', 'heart', 'checked', 'reset', 'rest'];
const WORD = 'Care Taker';
const DOTS = [...WORD].filter((c) => c !== ' ').length;
const STEP = 70;    // ms between one letter leaving and the next
const FLY = 900;    // ms a dot is in flight
const APPEAR = 500; // ms a letter takes to become a dot before it leaves

const EN = 'I took my tablet at 1:00 pm';
const OTHERS = [
  ['te', 'మాత్ర వేసుకున్నాను, 1 గంటకు'],
  ['hi', 'haan, ek baje dawai le li'],
  ['ta', 'மாத்திரை எடுத்துட்டேன்'],
];

const glyphs = [...WORD].map((ch) => `<span class="ct-sig__glyph">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');

function markup() {
  return `
    <div class="ct-sig" data-phase="rest" aria-hidden="true">
      <svg class="ct-sig__stream" focusable="false">
        <defs>
          <path id="ct-sig-path" d="M0 0"/>
          <linearGradient id="ct-sig-fade" gradientUnits="userSpaceOnUse" x1="0" x2="1"><stop offset="0" stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient>
          <mask id="ct-sig-mask" maskUnits="userSpaceOnUse"><rect class="ct-sig__veil" fill="url(#ct-sig-fade)" width="1" height="1"/></mask>
        </defs>
        <g mask="url(#ct-sig-mask)">
          <path class="ct-sig__track" d="M0 0"/>
          <text class="ct-sig__say"><textPath href="#ct-sig-path"></textPath></text>
        </g>
      </svg>
      <span class="ct-sig__room"></span>
      <span class="ct-sig__device">
        <svg class="ct-sig__phone" viewBox="6.5 1 19 30" focusable="false">
          <rect class="ct-sig__frame" x="8.5" y="3" width="15" height="26" rx="3.6"/>
          <g class="ct-sig__beat"><path class="ct-sig__heart" d="M16 19.6l-3.7-3.5a2.4 2.4 0 0 1 3.3-3.4l.4.4.4-.4a2.4 2.4 0 0 1 3.3 3.4z"/></g>
          <path class="ct-sig__tick" pathLength="1" d="M12.3 16.2l2.6 2.6 4.9-5.3"/>
          <path class="ct-sig__slot" d="M14 25.3h4"/>
          <g class="ct-sig__badge"><circle cx="23.4" cy="4.2" r="3.9"/><path pathLength="1" d="M21.7 4.3l1.2 1.2 2.3-2.5"/></g>
        </svg>
      </span>
      <span class="ct-sig__label">
        <span class="ct-sig__name">${glyphs}</span>
        <span class="ct-sig__status">
          <svg class="ct-sig__mark" viewBox="0 0 24 24" focusable="false"><circle pathLength="1" cx="12" cy="12" r="9.5"/><path pathLength="1" d="M7.8 12.4l2.8 2.8 5.6-6"/></svg>
          <span class="ct-sig__checked">Checked in</span>
        </span>
      </span>
      <span class="ct-sig__dots">${'<i class="ct-sig__dot"><b></b></i>'.repeat(DOTS)}</span>
    </div>`;
}

let host = null;
let staticHtml = '';
let root = null;
let geo = null;          // measured geometry of the reply line
let p = 5.6 / LOOP;      // progress in loops; a whole number is the moment the dots land
let phase = 'rest';
let raf = 0;
let last = 0;
let visible = false;
let anims = [];          // dot and letter animations of the current loop
let returns = [];        // letters coming back in reset

const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const frac = (x) => x - Math.floor(x);

// Builds the loop curve from the room left of the phone, lays the phrases along it with a
// blank gap after every "1:00 pm", and draws the dots of the line between phrases.
function layout() {
  if (!root) return;
  const box = root.getBoundingClientRect();
  if (!box.width || !box.height) { geo = null; return; }
  const svg = root.querySelector('.ct-sig__stream');
  const path = root.querySelector('#ct-sig-path');
  const track = root.querySelector('.ct-sig__track');
  const tp = root.querySelector('textPath');
  const say = root.querySelector('.ct-sig__say');
  const frame = root.querySelector('.ct-sig__frame').getBoundingClientRect();
  const W = box.width;
  const H = box.height;
  const fs = parseFloat(getComputedStyle(say).fontSize) || 16;
  svg.setAttribute('viewBox', `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`);

  // The line ends just inside the phone, a little below its middle.
  const E = { x: frame.left - box.left + frame.width * 0.12, y: frame.top - box.top + frame.height * 0.69 };
  const lead = W < 520 ? 10 : 40;
  const s = Math.max(0.3, Math.min((E.y - 2) / 87, (H - E.y - 2) / 26, (E.x - fs * 4.5) / (lead + 90), fs * 0.075));
  const ax = lead * s;
  const ay = E.y - 92 * s;
  const X = (x) => (ax + s * (x - 60)).toFixed(1);
  const Y = (y) => (ay + s * y).toFixed(1);
  const bx = ax + 90 * s;
  const by = ay + 118 * s;
  const run = E.x - bx;
  const d = `M ${X(60 - lead)} ${Y(98)} C ${X(60 - lead * 0.4)} ${Y(101)} ${X(92)} ${Y(95)} ${X(122)} ${Y(78)} `
    + `C ${X(158)} ${Y(58)} ${X(166)} ${Y(22)} ${X(138)} ${Y(10)} C ${X(110)} ${Y(-2)} ${X(72)} ${Y(10)} ${X(66)} ${Y(44)} `
    + `C ${X(60)} ${Y(78)} ${X(90)} ${Y(110)} ${X(150)} ${Y(118)} `
    + `C ${(bx + run * 0.3).toFixed(1)} ${(by + 10 * s).toFixed(1)} ${(E.x - run * 0.35).toFixed(1)} ${(E.y + 12 * s).toFixed(1)} ${E.x.toFixed(1)} ${E.y.toFixed(1)}`;
  path.setAttribute('d', d);
  track.setAttribute('d', d);
  // The line fades in at its left end instead of starting on a hard edge.
  root.querySelector('#ct-sig-fade').setAttribute('x2', Math.max(8, ax * 0.9).toFixed(1));
  const veil = root.querySelector('.ct-sig__veil');
  veil.setAttribute('width', W.toFixed(1));
  veil.setAttribute('height', H.toFixed(1));
  const P = path.getTotalLength();

  // Measure one English phrase and each other phrase once, then lay out equal segments:
  // [English][gap the dots fill][dots][other language][dots], so every loop lands the same way.
  tp.innerHTML = [EN, ...OTHERS.map((o) => o[1])].map((t) => `<tspan>${esc(t)}</tspan>`).join('');
  const lens = [...tp.children].map((t) => t.getComputedTextLength());
  const enLen = lens[0];
  const others = lens.slice(1);
  const step = fs * 0.5;           // space between dots on the line
  const gap = step * (DOTS + 1);   // the gap after "1:00 pm"
  const sep = step * 4;            // dots before and after each other phrase
  const S = enLen + gap + sep + Math.max(...others) + sep;
  const U = S * OTHERS.length;
  const join = P - gap - step * 3; // where "pm" ends when the dots land
  const m0 = Math.ceil((join - enLen) / S + OTHERS.length);
  const base0 = join - enLen - m0 * S;
  const copies = Math.max(2, Math.ceil((P - base0) / U) + 1);

  const parts = [];
  for (let c = 0; c < copies; c++) {
    OTHERS.forEach(([lang, text], j) => {
      const before = c === 0 && j === 0 ? 0 : S - (enLen + gap + sep + others[(j + OTHERS.length - 1) % OTHERS.length]);
      parts.push(`<tspan lang="en" dx="${before.toFixed(2)}">${esc(EN)}</tspan>`);
      parts.push(`<tspan lang="${lang}" dx="${(gap + sep).toFixed(2)}">${esc(text)}</tspan>`);
    });
  }
  tp.innerHTML = parts.join('');

  // Dots of the line, as positions inside one unit of three segments.
  const dots = [];
  others.forEach((len, j) => {
    const at = j * S;
    for (let k = 0; k < 4; k++) dots.push(at + enLen + gap + k * step);
    for (let q = at + enLen + gap + sep + len + step; q < at + S - step * 0.9; q += step) dots.push(q);
  });
  const dash = [];
  dots.forEach((q, i) => { dash.push(0, ((dots[i + 1] ?? dots[0] + U) - q).toFixed(2)); });
  track.setAttribute('stroke-dasharray', dash.join(' '));

  const fly = root.querySelector('.ct-sig__dot b');
  const flySize = fly.getBoundingClientRect().width || 6;
  const lineDot = parseFloat(getComputedStyle(track).strokeWidth) || 3;
  geo = { path, track, tp, P, S, U, enLen, step, join, base0, q0: dots[0], v: S / LOOP, shrink: Math.min(1, lineDot / flySize) };
  paint();
}

function paint() {
  if (!geo) return;
  const off = geo.base0 + frac(p / OTHERS.length) * geo.U;
  geo.tp.setAttribute('startOffset', off.toFixed(2));
  geo.track.setAttribute('stroke-dashoffset', (-(off + geo.q0)).toFixed(2));
}

function phaseAt(x) {
  const rel = frac(x - AT.dissolve / LOOP) * LOOP + AT.dissolve;
  let cur = ORDER[0];
  for (const k of ORDER) if (AT[k] <= rel) cur = k;
  return cur;
}

function cancel(list) { list.forEach((a) => a.cancel()); list.length = 0; }

// Each letter becomes a dot, flies left past the phone, lands in its slot after "1:00 pm"
// and rides the line into the phone.
function launch(now) {
  const box = root.getBoundingClientRect();
  const J = now + (Math.ceil(p) - p) * LOOP * 1000;
  const inOut = token('--ease-in-out', 'ease-in-out');
  const out = token('--ease-out', 'ease-out');
  const letters = [...root.querySelectorAll('.ct-sig__glyph')].filter((g) => g.textContent.trim());
  const dots = [...root.querySelectorAll('.ct-sig__dot')];
  const tr = (x, y) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  letters.forEach((g, i) => {
    const r = g.getBoundingClientRect();
    const ox = r.left - box.left + r.width / 2;
    const oy = r.top - box.top + r.height * 0.58;
    const arrive = J - (DOTS - 1 - i) * STEP;
    const depart = arrive - FLY;
    const appear = depart - APPEAR;
    const land = geo.join + (geo.v * (arrive - J)) / 1000 + (i + 1) * geo.step;
    const ride = Math.max(0, ((geo.P - land) / geo.v) * 1000);
    const end = arrive + ride;
    const total = Math.max(1, end - now);
    const at = (t) => Math.min(1, Math.max(0, (t - now) / total));
    const pt = (L) => geo.path.getPointAtLength(Math.min(Math.max(L, 0), geo.P));
    const tgt = pt(land);
    const turn = `rotate(${((Math.atan2(tgt.y - oy, tgt.x - ox) * 180) / Math.PI).toFixed(1)}deg)`;

    const move = [
      { offset: 0, transform: tr(ox, oy) },
      { offset: at(depart), transform: tr(ox, oy), easing: inOut },
      { offset: at(arrive), transform: tr(tgt.x, tgt.y), easing: 'linear' },
    ];
    const n = Math.max(1, Math.ceil(ride / 120));
    for (let k = 1; k <= n; k++) {
      const t = arrive + (ride * k) / n;
      const q = pt(land + (geo.v * (t - arrive)) / 1000);
      move.push({ offset: at(t), transform: tr(q.x, q.y), easing: 'linear' });
    }
    const look = [
      { offset: 0, opacity: 0, transform: `${turn} scale(0.4)` },
      { offset: at(appear), opacity: 0, transform: `${turn} scale(0.4)`, easing: out },
      { offset: at(appear + 350), opacity: 1, transform: `${turn} scale(1)` },
      { offset: at(depart), opacity: 1, transform: `${turn} scale(1)`, easing: inOut },
      { offset: at(depart + FLY * 0.5), opacity: 1, transform: `${turn} scale(2.6, 0.8)`, easing: inOut },
      { offset: at(arrive), opacity: 1, transform: `${turn} scale(${geo.shrink.toFixed(2)})` },
      { offset: at(Math.max(arrive, end - 140)), opacity: 1, transform: `${turn} scale(${geo.shrink.toFixed(2)})` },
      { offset: 1, opacity: 0, transform: `${turn} scale(${geo.shrink.toFixed(2)})` },
    ];
    anims.push(dots[i].animate(move, { duration: total, fill: 'none' }));
    anims.push(dots[i].firstElementChild.animate(look, { duration: total, fill: 'none' }));
    anims.push(g.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.5)' }],
      { duration: 420, delay: Math.max(0, appear - now), easing: out, fill: 'both' },
    ));
  });
}

function welcomeBack() {
  const out = token('--ease-out', 'ease-out');
  cancel(returns);
  [...root.querySelectorAll('.ct-sig__glyph')].forEach((g, i) => {
    returns.push(g.animate(
      [{ opacity: 0, transform: 'translateY(0.12em)' }, { opacity: 1, transform: 'none' }],
      { duration: 560, delay: 150 + i * 36, easing: out, fill: 'backwards' },
    ));
  });
}

function setPhase(next) {
  phase = next;
  root.dataset.phase = next;
}

// Back to the resting logo at once, with the line clock moved to the rest of the current loop.
function settle() {
  cancel(anims);
  cancel(returns);
  if (phase !== 'rest') p = Math.floor(p - AT.dissolve / LOOP) + (AT.rest + 0.2) / LOOP;
  if (root) setPhase('rest');
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  if (last) p += (now - last) / 1000 / LOOP;
  last = now;
  if (!geo) return;
  paint();
  const next = phaseAt(p);
  if (next === phase) return;
  const expected = ORDER[(ORDER.indexOf(phase) + 1) % ORDER.length];
  if (next !== expected) { settle(); return; }
  if (next === 'dissolve') launch(now);
  if (next === 'reset') { cancel(anims); welcomeBack(); }
  setPhase(next);
}

function start() {
  if (raf || !visible || document.hidden || !root) return;
  last = 0;
  raf = requestAnimationFrame(frame);
}

function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  settle();
  paint();
}

export function mountSignature() {
  host = document.querySelector('.ct-signature');
  if (!host) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  staticHtml = host.innerHTML;
  let extSvg = '';
  const mount = () => {
    if (reduce.matches) return; // the static logo and wordmark stay
    if (extSvg) {
      stop();
      root = null;
      geo = null;
      host.innerHTML = `<img class="ct-sig-svg" src="${extSvg}" width="1440" height="360" alt="Care Taker closing loop ending in Checked in" decoding="async">`;
      return;
    }
    host.innerHTML = markup();
    root = host.querySelector('.ct-sig');
    phase = 'rest';
    layout();
  };
  mount();
  (async () => {
    try {
      const mRes = await fetch('/img/manifest.json', { cache: 'no-cache' });
      if (!mRes.ok) return;
      const slots = (await mRes.json()).slots || {};
      if (slots['footer-loop'] && slots['footer-loop'].type === 'svg') {
        const hRes = await fetch('/brand/footer-loop.svg', { method: 'HEAD' });
        if (hRes.ok) {
          extSvg = '/brand/footer-loop.svg';
          mount();
        }
      }
    } catch { /* keep coded signature loop */ }
  })();
  reduce.addEventListener('change', () => {
    if (reduce.matches) { stop(); root = null; geo = null; host.innerHTML = staticHtml; }
    else { mount(); start(); }
  });

  let size = '';
  new ResizeObserver(() => {
    if (!root) return;
    const r = root.getBoundingClientRect();
    const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (key === size) return;
    size = key;
    settle();
    layout();
  }).observe(host);
  if (document.fonts) {
    document.fonts.ready.then(() => { settle(); layout(); });
    document.fonts.addEventListener('loadingdone', () => { settle(); layout(); });
  }
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start(); else stop();
  }).observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
}
