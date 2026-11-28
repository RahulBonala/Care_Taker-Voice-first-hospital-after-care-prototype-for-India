// Languages: every supported language as a pill on a ring around the Care Taker phone.
// Angles come from CSS: the ring class carries the count (ct-lring--n11), nth-child rules
// carry each index, so there are no inline styles. Big rings split into two staggered rings.
import { esc, icon } from '../lib.js';
import { logo } from '../logo.js';

const MIN = 4;
const MAX = 16;
let io = null;

function pill(l, showReview) {
  const review = showReview && !l.reviewed;
  const en = l.name && l.name !== l.nativeName ? `<span class="ct-lring__en">${esc(l.name)}</span>` : '';
  const attrs = review ? ' tabindex="0" data-tip="Under review"' : '';
  return `<li class="ct-lring__item"><span class="ct-lring__turn"><span class="ct-lring__pill${review ? ' ct-lring__pill--review' : ''}"${attrs}>`
    + `<span class="ct-lring__native" lang="${esc(l.code)}">${esc(l.nativeName)}</span>${en}`
    + (review ? '<span class="ct-lring__dot" aria-hidden="true"></span><span class="visually-hidden">, under review</span>' : '')
    + '</span></span></li>';
}

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
    <section class="ct-band ct-band--surface" id="languages" aria-labelledby="lang-title">
      <div class="ct-page">
        <div class="ct-split2 ct-langsplit">
          <div data-reveal="up">
            <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>Your language</span>
            <h2 id="lang-title" class="ct-section-title-lg">Speak your language. Care Taker answers in it.</h2>
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
            <p class="ct-lring__line">One call, every language</p>
          </div>
        </div>
      </div>
    </section>`;
}

export function mountLanguages(root) {
  unmountLanguages();
  const ring = root && root.querySelector('[data-lring]');
  if (!ring) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) return;
  ring.setAttribute('data-armed', '');
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.setAttribute('data-in', '');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -15% 0px', threshold: 0.2 });
  io.observe(ring);
}

export function unmountLanguages() {
  if (io) io.disconnect();
  io = null;
}
