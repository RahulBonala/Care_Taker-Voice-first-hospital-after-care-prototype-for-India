// Languages: every supported language as a pill on a ring around the Care Taker phone.
// Angles come from CSS: the ring class carries the count (ct-lring--n11), nth-child rules
// carry each index, so there are no inline styles. Big rings split into two staggered rings.
// Motion: the ring turns slowly (CSS animation) and one pill at a time lights up with a thin
// line to the phone while the caption names its language. A pause button stops both; so do
// hover, focus inside the ring, scrolling away and a hidden tab. Reduced motion: none of it.
import { esc, icon } from '../lib.js';
import { logo } from '../logo.js';

const MIN = 4;
const MAX = 16;
const FIRST = 1800;   // first highlight, after the pills have settled
const EVERY = 3600;   // one pill to the next
const LINK = 1700;    // how long the line to the phone stays
const LIT = 2700;     // how long the pill stays lit
const SWAP = 170;     // caption fade out before the text changes
const DEFAULT_LINE = 'One call, every language';
let ctl = null;

function pill(l, showReview) {
  const review = showReview && !l.reviewed;
  const en = l.name && l.name !== l.nativeName ? `<span class="ct-lring__en">${esc(l.name)}</span>` : '';
  const attrs = review ? ' tabindex="0" data-tip="Under review"' : '';
  return `<li class="ct-lring__item" data-code="${esc(l.code)}" data-native="${esc(l.nativeName)}">`
    + '<span class="ct-lring__spoke" aria-hidden="true"></span>'
    + `<span class="ct-lring__turn"><span class="ct-lring__pill${review ? ' ct-lring__pill--review' : ''}"${attrs}>`
    + `<span class="ct-lring__native" lang="${esc(l.code)}">${esc(l.nativeName)}</span>${en}`
    + (review ? '<span class="ct-lring__dot" aria-hidden="true"></span><span class="visually-hidden">, under review</span>' : '')
    + '</span></span></li>';
}

const TOGGLE_ICONS = '<svg class="ct-lring__ico ct-lring__ico--pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/></svg>'
  + '<svg class="ct-lring__ico ct-lring__ico--play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z"/></svg>';

export function languagesMarkup(langs) {
  const list = langs.slice(0, MAX);
  const n = Math.max(MIN, list.length);
  const indian = langs.filter((l) => l.code !== 'en').length;
  // A dot on every pill says nothing, so dots appear only when some languages are reviewed.
  const someReviewed = list.some((l) => l.reviewed);
  const showReview = someReviewed && list.some((l) => !l.reviewed);
  const ringCls = [`ct-lring--n${n}`, n % 2 ? 'ct-lring--odd' : '', n >= 8 ? 'ct-lring--many' : '', n >= 13 ? 'ct-lring--lots' : '']
    .filter(Boolean).join(' ');
  const third = someReviewed
    ? 'Lines checked by a native speaker are marked reviewed'
    : 'Every line is being checked by native speakers';
  return `
    <section class="ct-band ct-band--surface ct-langband" id="languages" aria-labelledby="lang-title">
      <div class="ct-page">
        <div class="ct-split2 ct-langsplit">
          <div data-reveal="up">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Your language</span>
            <h2 id="lang-title" class="ct-section-title-lg"><span class="ct-langtitle__line">Speak your language.</span> <span class="ct-langtitle__line"><span class="ct-nowrap">Care Taker</span> answers in it.</span></h2>
            <p class="ct-section-lead">Pick a language or just start talking. Care Taker hears which one you answer in and switches the call and the app to it.</p>
            <ul class="ct-checks">
              <li>${icon('tick')}<span>${indian} Indian languages and English, mixed the way people speak</span></li>
              <li>${icon('tick')}<span>Switches language mid-call, from the reply itself</span></li>
              <li>${icon('tick')}<span>${third}</span></li>
            </ul>
          </div>
          <div class="ct-lring ${ringCls}" data-lring>
            <div class="ct-lring__stage">
              <span class="ct-lring__track" aria-hidden="true"></span>
              <span class="ct-lring__track ct-lring__track--inner" aria-hidden="true"></span>
              <div class="ct-lring__hub" aria-hidden="true">${logo('ct-lring__logo')}</div>
              <ul class="ct-lring__list" role="list" aria-label="Supported languages">
                ${list.map((l) => pill(l, showReview)).join('')}
              </ul>
            </div>
            <p class="ct-lring__line"><span class="visually-hidden">${DEFAULT_LINE}</span><span class="ct-lring__cap" aria-hidden="true">${DEFAULT_LINE}</span></p>
            <div class="ct-lring__ctrl">
              <button type="button" class="ct-lring__toggle" aria-pressed="false" data-lring-toggle hidden>
                ${TOGGLE_ICONS}<span class="visually-hidden">Pause animation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function capMarkup(item) {
  const code = item.getAttribute('data-code') || '';
  const name = item.getAttribute('data-native') || '';
  return `<span class="ct-lring__cap-pre">Care Taker answers in</span> <span class="ct-lring__cap-name" lang="${esc(code)}">${esc(name)}</span>`;
}

// One ring's motion: orbit on/off, the highlight cycle, and every reason to hold still.
function controller(ring, motionQuery) {
  const stage = ring.querySelector('.ct-lring__stage');
  const hub = ring.querySelector('.ct-lring__hub');
  const line = ring.querySelector('.ct-lring__line');
  const cap = ring.querySelector('.ct-lring__cap');
  const toggle = ring.querySelector('[data-lring-toggle]');
  const items = [...ring.querySelectorAll('.ct-lring__item')];
  const why = { user: false, hover: false, focus: false, away: true, hidden: document.hidden };
  const timers = new Set();
  const offs = [];
  let started = false;
  let next = 0;
  let beat = false;
  let cycle = 0;
  let pending = null;

  const on = (target, type, fn) => { target.addEventListener(type, fn); offs.push(() => target.removeEventListener(type, fn)); };
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const clearAll = () => { for (const t of timers) clearTimeout(t); timers.clear(); };
  const still = () => why.user || why.hover || why.focus || why.away || why.hidden;

  function light(item) {
    for (const it of items) { it.removeAttribute('data-active'); it.removeAttribute('data-link'); }
    item.setAttribute('data-active', '');
    item.setAttribute('data-link', '');
    beat = !beat;
    ring.setAttribute('data-beat', beat ? 'a' : 'b');
    // The caption sits on the far side of the phone from the lit pill, so the line never crosses it
    const p = item.querySelector('.ct-lring__pill').getBoundingClientRect();
    const h = hub.getBoundingClientRect();
    const side = p.top + p.height / 2 > h.top + h.height / 2 ? 'top' : 'bottom';
    line.setAttribute('data-swap', '');
    pending = () => {
      cap.innerHTML = capMarkup(item);
      ring.setAttribute('data-side', side);
      line.removeAttribute('data-swap');
    };
    later(flush, SWAP);
    later(() => item.removeAttribute('data-link'), LINK);
    later(() => item.removeAttribute('data-active'), LIT);
  }

  // Run a caption swap now, so a pause never leaves the caption faded out
  function flush() {
    const fn = pending;
    pending = null;
    if (fn) fn();
  }

  function step() {
    if (!items.length) return;
    light(items[next]);
    next = (next + 1) % items.length;
    cycle = later(step, EVERY);
  }

  function sync() {
    const s = still();
    ring.toggleAttribute('data-still', s);
    if (s) { clearAll(); flush(); cycle = 0; return; }
    if (started && !cycle) cycle = later(step, FIRST);
  }

  function start() {
    if (started) return;
    started = true;
    ring.setAttribute('data-orbit', '');
    sync();
  }

  function reset() {
    clearAll();
    pending = null;
    for (const it of items) { it.removeAttribute('data-active'); it.removeAttribute('data-link'); }
    for (const a of ['data-armed', 'data-orbit', 'data-still', 'data-beat', 'data-side']) ring.removeAttribute(a);
    line.removeAttribute('data-swap');
    cap.textContent = DEFAULT_LINE;
    toggle.hidden = true;
  }

  toggle.hidden = false;
  on(toggle, 'click', () => {
    why.user = !why.user;
    toggle.setAttribute('aria-pressed', String(why.user));
    sync();
  });
  on(stage, 'pointerenter', (e) => { if (e.pointerType === 'mouse') { why.hover = true; sync(); } });
  on(stage, 'pointerleave', () => { if (why.hover) { why.hover = false; sync(); } });
  on(stage, 'focusin', () => { why.focus = true; sync(); });
  on(stage, 'focusout', (e) => { if (!stage.contains(e.relatedTarget)) { why.focus = false; sync(); } });
  on(document, 'visibilitychange', () => { why.hidden = document.hidden; sync(); });
  on(motionQuery, 'change', (e) => { if (e.matches) unmountLanguages(); });

  const seen = new IntersectionObserver(([e]) => { why.away = !e.isIntersecting; sync(); }, { threshold: 0 });
  seen.observe(ring);
  const enter = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.setAttribute('data-in', '');
      enter.unobserve(e.target);
      start();
    }
  }, { rootMargin: '0px 0px -15% 0px', threshold: 0.2 });
  enter.observe(ring);

  return () => {
    seen.disconnect();
    enter.disconnect();
    offs.forEach((off) => off());
    reset();
  };
}

export function mountLanguages(root) {
  unmountLanguages();
  const ring = root && root.querySelector('[data-lring]');
  if (!ring) return;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.matches || !('IntersectionObserver' in window)) return;
  ring.setAttribute('data-armed', '');
  ctl = controller(ring, motionQuery);
}

export function unmountLanguages() {
  if (ctl) ctl();
  ctl = null;
}
