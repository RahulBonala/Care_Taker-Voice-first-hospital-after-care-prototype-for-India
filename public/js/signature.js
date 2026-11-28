// Footer signature: one calm loop that tells the product, drawn on one line across the footer.
//   rest      a solid line enters from the left edge and turns into a dotted reply line that loops
//             and runs into the phone; it leaves the phone on the right, through the "Care Taker"
//             wordmark, and out to the right edge. The reply line carries one reply per loop:
//             "I took my tablet at 1:00 pm", then the same reply in Telugu, Hindi or Tamil
//   dissolve  each wordmark letter unravels into a short line on the right-hand line; the lines join
//             end to end into one solid stroke, which flows left into the phone just as the reply
//             reaches the phone from the other side
//   tick      the phone shows a tick
//   heart     the heart comes back with one soft beat
//   checked   a check-in badge on the phone, and "Checked in" with a mark replaces the wordmark
//   reset     back to the logo and the wordmark
// Replies are spaced so that no two ever meet where the loop crosses itself. Runs only while the
// footer is on screen. Reduced motion keeps the static logo.
import { esc } from './lib.js';

const LOOP = 9.6; // seconds per loop
// Phase starts, in seconds from the moment the stroke and the reply are both inside the phone.
const AT = { dissolve: -2.12, tick: 0.12, heart: 0.8, checked: 1.45, reset: 4.4, rest: 5.2 };
const ORDER = ['dissolve', 'tick', 'heart', 'checked', 'reset', 'rest'];
const WORD = 'Care Taker';
const STAG = 45;    // ms between one letter unravelling and the next
const DRAW = 380;   // ms a letter takes to unravel into its line
const JOIN = 280;   // ms the lines take to close up end to end
const HOLD = 160;   // ms the joined stroke draws back a hair before it is pulled
const SLIDE = 900;  // ms the stroke takes to flow into the phone

const EN = 'I took my tablet at 1:00 pm';
// One reply per loop, English every other loop.
const PHRASES = [
  ['en', EN],
  ['te', 'మాత్ర వేసుకున్నాను, 1 గంటకు'],
  ['en', EN],
  ['hi', 'haan, ek baje dawai le li'],
  ['en', EN],
  ['ta', 'மாத்திரை எடுத்துட்டேன்'],
];
const SLOTS = PHRASES.length;
const LETTERS = [...WORD].filter((c) => c !== ' ').length;

const glyphs = [...WORD].map((ch) => `<span class="ct-sig__glyph">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');

function markup() {
  return `
    <div class="ct-sig" data-phase="rest" aria-hidden="true">
      <svg class="ct-sig__stream" focusable="false">
        <defs>
          <path id="ct-sig-path" d="M0 0"/>
          <linearGradient id="ct-sig-fade" gradientUnits="userSpaceOnUse" x1="0" x2="1"><stop offset="0" stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient>
          <linearGradient id="ct-sig-hand" gradientUnits="userSpaceOnUse" x1="0" x2="1"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>
          <mask id="ct-sig-mask" class="ct-sig__clip" maskUnits="userSpaceOnUse"><rect class="ct-sig__veil" fill="url(#ct-sig-fade)" width="1" height="1"/></mask>
          <mask id="ct-sig-mask-in" class="ct-sig__clip" maskUnits="userSpaceOnUse"><rect class="ct-sig__veil" fill="url(#ct-sig-hand)" width="1" height="1"/></mask>
        </defs>
        <path class="ct-sig__wire ct-sig__wire--in" mask="url(#ct-sig-mask-in)" d="M0 0"/>
        <g mask="url(#ct-sig-mask)">
          <path class="ct-sig__track" d="M0 0"/>
          <text class="ct-sig__say"><textPath href="#ct-sig-path"></textPath></text>
        </g>
        <path class="ct-sig__wire ct-sig__wire--near" d="M0 0"/>
        <path class="ct-sig__wire ct-sig__wire--under" pathLength="1" d="M0 0"/>
        <path class="ct-sig__wire ct-sig__wire--tail" pathLength="1" d="M0 0"/>
        <path class="ct-sig__wire ct-sig__wire--out" d="M0 0"/>
        <g class="ct-sig__threads">${'<path class="ct-sig__thread" d="M0 0"/>'.repeat(LETTERS)}</g>
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
    </div>`;
}

let host = null;
let staticHtml = '';
let root = null;
let geo = null;          // measured geometry of the line, the replies and the stroke
let p = 5.6 / LOOP;      // progress in loops; a whole number is the moment both reach the phone
let phase = 'rest';
let raf = 0;
let last = 0;
let visible = false;
let anims = [];          // letter and stroke animations of the current loop
let returns = [];        // letters coming back in reset

const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const frac = (x) => x - Math.floor(x);
const mod = (n, m) => ((n % m) + m) % m;
const f1 = (n) => n.toFixed(1);

// ---- curve helpers: a curve is a list of cubic segments [p0, c1, c2, p3] ----
function bez(g, t) {
  const u = 1 - t;
  const a = u * u * u; const b = 3 * u * u * t; const c = 3 * u * t * t; const d = t * t * t;
  return [a * g[0][0] + b * g[1][0] + c * g[2][0] + d * g[3][0], a * g[0][1] + b * g[1][1] + c * g[2][1] + d * g[3][1]];
}
function sample(segs, n = 100) {
  const pts = [{ x: segs[0][0][0], y: segs[0][0][1], L: 0, seg: 0 }];
  let L = 0;
  segs.forEach((g, si) => {
    let prev = g[0];
    for (let i = 1; i <= n; i++) {
      const q = bez(g, i / n);
      L += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
      prev = q;
      pts.push({ x: q[0], y: q[1], L, seg: si });
    }
  });
  return pts;
}
const cmds = (segs) => segs.map((g) => `C ${g.slice(1).map((q) => `${f1(q[0])} ${f1(q[1])}`).join(' ')}`).join(' ');
const toD = (segs) => `M ${f1(segs[0][0][0])} ${f1(segs[0][0][1])} ${cmds(segs)}`;
const hline = (y, a, b) => `M ${f1(a)} ${f1(y)} L ${f1(b)} ${f1(y)}`;
// Where the curve crosses itself: path lengths of both passes.
function crossing(pts) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]; const b = pts[i + 1];
    for (let j = i + 6; j < pts.length - 1; j++) {
      const c = pts[j]; const d = pts[j + 1];
      const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
      if (!den) continue;
      const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
      const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { L1: a.L + t * (b.L - a.L), L2: c.L + u * (d.L - c.L) };
    }
  }
  return null;
}

// Builds the line across the footer: the solid lead-in from the left edge, the reply loop into the
// phone, and the line out of the phone through the wordmark to the right edge. Replies are spaced
// so none sits on the crossing while another passes it.
function layout() {
  if (!root) return;
  const box = root.getBoundingClientRect();
  if (!box.width || !box.height) { geo = null; return; }
  const $ = (sel) => root.querySelector(sel);
  const svg = $('.ct-sig__stream');
  const path = $('#ct-sig-path');
  const track = $('.ct-sig__track');
  const tp = $('textPath');
  const say = $('.ct-sig__say');
  const threads = [...root.querySelectorAll('.ct-sig__thread')];
  const frame = $('.ct-sig__frame').getBoundingClientRect();
  const label = $('.ct-sig__label').getBoundingClientRect();
  const W = box.width;
  const H = box.height;
  const fs = parseFloat(getComputedStyle(say).fontSize) || 16;
  const labelFs = parseFloat(getComputedStyle(root).fontSize) || 48;
  const edgeL = -box.left;                                         // page edges, in box space
  const edgeR = document.documentElement.clientWidth - box.left;
  svg.setAttribute('viewBox', `0 0 ${f1(W)} ${f1(H)}`);

  // Reply lengths.
  const uniq = [...new Set(PHRASES.map((ph) => ph[1]))];
  tp.innerHTML = uniq.map((t) => `<tspan>${esc(t)}</tspan>`).join('');
  const lenOf = new Map(uniq.map((t, i) => [t, tp.children[i].getComputedTextLength()]));
  const T = PHRASES.map((ph) => lenOf.get(ph[1]));
  const Tmax = Math.max(...T);
  const clear = fs * 0.95; // room a reply needs on each side of the crossing

  // The wordmark letters, and the height of the line: through the middle of the lowercase letters,
  // straight through the phone.
  const letters = [...root.querySelectorAll('.ct-sig__glyph')].filter((g) => g.textContent.trim());
  const rects = letters.map((g) => g.getBoundingClientRect());
  const y = rects[0].top - box.top + rects[0].height * 0.6;
  const E = { x: frame.left - box.left + frame.width * 0.12, y };
  const lead = W < 520 ? 10 : 40;
  const s = Math.max(0.3, Math.min((H - 4) / 116, (E.x - fs * 4.5) / (lead + 90), fs * 0.075));
  const ay = 2 - 5 * s;
  // Widen the loop only when a reply would not fit round it.
  const curve = (kx) => {
    const ax = lead * s * kx;
    const P = (x, yy) => [ax + s * kx * (x - 60), ay + s * yy];
    const [bx, by] = P(150, 118);
    const run = E.x - bx;
    const segs = [
      [P(60 - lead, 98), P(60 - lead * 0.4, 101), P(92, 95), P(122, 78)],
      [P(122, 78), P(158, 58), P(166, 22), P(138, 10)],
      [P(138, 10), P(110, -2), P(72, 10), P(66, 44)],
      [P(66, 44), P(60, 78), P(90, 110), [bx, by]],
      [[bx, by], [bx + run * 0.35, by + 4 * s], [E.x - run * 0.4, E.y], [E.x, E.y]],
    ];
    const pts = sample(segs);
    const right = Math.max(...pts.filter((q) => q.seg < 4).map((q) => q.x));
    return { ax, segs, pts, right, cross: crossing(pts) };
  };
  let c = curve(1);
  for (let kx = 1.05; kx < 1.61 && !(c.cross && Tmax <= c.cross.L2 - c.cross.L1 - 2 * clear); kx += 0.05) {
    const next = curve(kx);
    if (next.right > E.x - fs * 5) break;
    c = next;
  }
  const d = toD(c.segs);
  path.setAttribute('d', d);
  track.setAttribute('d', d);
  // At the left the solid line hands over to the dotted reply line: one fades out as the other fades in.
  const hand = f1(Math.max(8, c.ax * 0.9));
  $('#ct-sig-fade').setAttribute('x2', hand);
  $('#ct-sig-hand').setAttribute('x2', hand);
  root.querySelectorAll('.ct-sig__veil, .ct-sig__clip').forEach((v) => {
    v.setAttribute('x', f1(edgeL));
    v.setAttribute('y', '0');
    v.setAttribute('width', f1(edgeR - edgeL));
    v.setAttribute('height', f1(H));
  });
  const [x0, y0] = c.segs[0][0];
  $('.ct-sig__wire--in').setAttribute('d', `${hline(y0, edgeL, x0)} ${cmds([c.segs[0]])}`);
  const P = path.getTotalLength();
  const k = P / c.pts[c.pts.length - 1].L;
  const cross = c.cross ? { L1: c.cross.L1 * k, L2: c.cross.L2 * k } : { L1: 0, L2: 0 };

  // ---- the line out of the phone, and the stroke the wordmark becomes ----
  const w0 = parseFloat(getComputedStyle(threads[0]).strokeWidth) || 4;
  const space = labelFs * 0.12;
  const inset = labelFs * 0.05;
  const exit = frame.right - box.left - frame.width * 0.12;
  // The wordmark and "Checked in" share one cell; the line stops just short of whichever is showing.
  const lx = label.left - box.left - space;
  const ends = [...root.querySelectorAll('.ct-sig__glyph, .ct-sig__mark, .ct-sig__checked')].map((e) => e.getBoundingClientRect().right - box.left);
  const nx = rects[rects.length - 1].right - box.left + space;
  const rx = Math.max(nx, ...ends.map((e) => e + space));
  $('.ct-sig__wire--near').setAttribute('d', hline(y, exit, lx));
  $('.ct-sig__wire--under').setAttribute('d', hline(y, lx, nx));
  $('.ct-sig__wire--tail').setAttribute('d', hline(y, nx, Math.max(nx + 0.1, rx)));
  $('.ct-sig__wire--out').setAttribute('d', hline(y, rx, edgeR));
  // The stroke path runs right to left, from just past the wordmark into the middle of the phone.
  const xs = rects[rects.length - 1].right - box.left + labelFs * 0.15;
  const xe = frame.left - box.left + frame.width * 0.5;
  threads.forEach((t) => t.setAttribute('d', hline(y, xs, xe)));
  const rest = rects.map((r) => ({ s0: xs - (r.right - box.left) + w0 / 2 + inset, l0: Math.max(1, r.width - w0 - inset * 2) }));

  // ---- replies along the loop ----
  // A reply's end reaches the phone when its loop's stroke does. Replies are one loop (S) apart and
  // the space between two replies is longer than the loop round the crossing, so the two passes of
  // the crossing never carry text at the same time.
  const step = fs * 0.5;
  const K = P;
  const delta = cross.L2 - cross.L1;
  const S = Math.max(Tmax + delta + 2 * clear + step, Tmax + step * 8);
  const nLo = Math.floor(-(P - K + Tmax) / S) - 1;
  const nHi = Math.ceil(SLOTS + K / S) + 1;
  const parts = [];
  for (let n = nHi; n >= nLo; n--) {
    const [lang, text] = PHRASES[mod(n, SLOTS)];
    const dx = n === nHi ? '' : ` dx="${(S - T[mod(n, SLOTS)]).toFixed(2)}"`;
    parts.push(`<tspan lang="${lang}"${dx}>${esc(text)}</tspan>`);
  }
  // A loop too small for any reply to pass the crossing alone carries dots only.
  const fits = c.cross && Tmax <= delta - 2 * clear;
  tp.innerHTML = fits ? parts.join('') : '';
  const u0 = K - nHi * S - T[mod(nHi, SLOTS)];

  // Dots between replies, as positions inside one cycle of all replies.
  const dots = [];
  for (let n = SLOTS - 1; n >= 0; n--) {
    const from = -(n + 1) * S + step;
    const to = fits ? -n * S - T[n] - step : -n * S - step * 0.5;
    for (let q = from; q <= to + 0.01; q += step) dots.push(q);
  }
  const U = S * SLOTS;
  const dash = [];
  dots.forEach((q, i) => { dash.push(0, ((dots[i + 1] ?? dots[0] + U) - q).toFixed(2)); });
  track.setAttribute('stroke-dasharray', dash.join(' '));

  geo = {
    tp, track, threads, under: $('.ct-sig__wire--under'), S, K, u0, q0: dots[0], labelFs,
    stroke: { rest, w0, len: xs - xe, enter: xs - exit },
  };
  paint();
}

function paint() {
  if (!geo) return;
  const r = frac(p / SLOTS) * SLOTS;
  geo.tp.setAttribute('startOffset', (geo.u0 + r * geo.S).toFixed(2));
  geo.track.setAttribute('stroke-dashoffset', (-(geo.K + r * geo.S + geo.q0)).toFixed(2));
}

function phaseAt(x) {
  const rel = frac(x - AT.dissolve / LOOP) * LOOP + AT.dissolve;
  let cur = ORDER[0];
  for (const k of ORDER) if (AT[k] <= rel) cur = k;
  return cur;
}

function cancel(list) { list.forEach((a) => a.cancel()); list.length = 0; }

// Each letter unravels into a line where it stands; the lines close up end to end into one solid
// stroke, which is pulled left along the line into the phone.
function launch(now) {
  const J = now + (Math.ceil(p) - p) * LOOP * 1000;
  const inOut = token('--ease-in-out', 'ease-in-out');
  const out = token('--ease-out', 'ease-out');
  const { rest, w0, len, enter } = geo.stroke;
  const letters = [...root.querySelectorAll('.ct-sig__glyph')].filter((g) => g.textContent.trim());
  const n = letters.length;
  const pull = J - SLIDE;
  const joined = pull - HOLD;
  const join = joined - JOIN;
  const total = Math.max(1, J + 60 - now);
  const at = (t) => Math.min(1, Math.max(0, (t - now) / total));
  const big = Math.ceil(len * 4 + 100); // gap after each dash, long enough that it never repeats
  const ant = geo.labelFs * 0.04;
  // Joined: the first letter stays put, the others close up behind it.
  const tight = [];
  let acc = rest[0].s0;
  rest.forEach((r, i) => { if (i) acc -= r.l0; tight[i] = acc; });
  // Pulled until the tail of the stroke has gone behind the edge of the phone.
  const shift = enter - tight[n - 1] + w0;

  letters.forEach((g, i) => {
    const appear = join - DRAW - (n - 1 - i) * STAG;
    const { s0, l0 } = rest[i];
    const kf = (t, pos, l, opacity, easing) => ({
      offset: at(t),
      strokeDasharray: `${l.toFixed(2)} ${big}`,
      strokeDashoffset: (-pos).toFixed(2),
      opacity,
      easing,
    });
    anims.push(geo.threads[i].animate([
      kf(now, s0, 0.01, 0, 'linear'),
      kf(appear, s0, 0.01, 0, out),
      kf(appear + DRAW, s0, l0, 1, 'linear'),
      kf(join, s0, l0, 1, inOut),
      kf(joined, tight[i], l0, 1, out),
      kf(pull, tight[i] - ant, l0, 1, inOut),
      kf(J, tight[i] + shift, l0, 1, 'linear'),
      kf(J + 60, tight[i] + shift, l0, 0, 'linear'),
    ], { duration: total, fill: 'none' }));
    anims.push(g.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.96, 0.1)' }],
      { duration: DRAW, delay: Math.max(0, appear - now), easing: inOut, fill: 'both' },
    ));
  });
  // The line under the wordmark shows through the gaps as the letters go.
  const shade = getComputedStyle(root.querySelector('.ct-sig__wire--near')).opacity;
  anims.push(geo.under.animate(
    [{ opacity: 0 }, { opacity: shade }],
    { duration: 420, delay: Math.max(0, join - DRAW * 0.4 - now), easing: out, fill: 'both' },
  ));
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
  coded(reduce);
}

function coded(reduce) {
  const mount = () => {
    if (reduce.matches) return; // the static logo and wordmark stay
    host.innerHTML = markup();
    root = host.querySelector('.ct-sig');
    phase = 'rest';
    layout();
  };
  mount();
  reduce.addEventListener('change', () => {
    if (reduce.matches) { stop(); root = null; geo = null; host.innerHTML = staticHtml; }
    else { mount(); start(); }
  });

  let size = '';
  const relayout = () => { settle(); layout(); };
  new ResizeObserver(() => {
    if (!root) return;
    const r = root.getBoundingClientRect();
    const key = `${Math.round(r.width)}x${Math.round(r.height)}x${document.documentElement.clientWidth}`;
    if (key === size) return;
    size = key;
    relayout();
  }).observe(host);
  window.addEventListener('resize', () => { if (root) relayout(); });
  if (document.fonts) {
    document.fonts.ready.then(relayout);
    document.fonts.addEventListener('loadingdone', relayout);
  }
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) start(); else stop();
  }).observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
}
