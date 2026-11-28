// Shared markup for the pinned scroll stories (How it works, Features), plus the device frames
// and sequenced rows their screens are built from.
import { esc, icon } from '../lib.js';

// One role screen inside a device that fits the role: phone, keypad, laptop or tablet.
//   frame('laptop', screenHtml, { icon: 'flag', caption: 'Nurse board, on a laptop' })
export function frame(kind, screen, { icon: ic = '', caption = '' } = {}) {
  return `
    <figure class="ct-frame ct-frame--${kind}">
      <div class="ct-frame__body">
        ${kind === 'phone' ? '<span class="ct-frame__island" aria-hidden="true"></span>' : ''}
        <div class="ct-frame__screen">${screen}</div>
      </div>
      ${kind === 'laptop' ? '<span class="ct-frame__base" aria-hidden="true"></span>' : ''}
      ${caption ? `<figcaption class="ct-frame__caption">${ic ? icon(ic) : ''}${esc(caption)}</figcaption>` : ''}
    </figure>`;
}

// App bar at the top of a screen: icon, title, optional line under it, and something on the right.
export const bar = (ic, title, sub = '', right = '') => `
  <div class="ct-scr__bar">
    <span class="ct-scr__title">${icon(ic)}<span><strong>${esc(title)}</strong>${sub ? `<span>${esc(sub)}</span>` : ''}</span></span>
    ${right}
  </div>`;

// Phone status bar.
export const statusBar = (time) => `<div class="ct-scr__status" aria-hidden="true"><span>${esc(time)}</span><span class="ct-scr__signal"><span></span><span></span><span></span><span></span></span></div>`;

// A value that changes in place when the step plays: `from` gives way to `to` at delay step d.
export const swap = (from, to, d) => `<span class="ct-swap" data-d="${d}"><span class="ct-swap__a">${from}</span><span class="ct-swap__b">${to}</span></span>`;

export function story({ id, title, eyebrow, items, card, size, links = false }) {
  return `
  <section class="ct-story ${size} ct-story--${id}" data-story id="${id}" aria-labelledby="${id}-title">
    <div class="ct-story__sticky">
      <div class="ct-story__head">
        <span class="ct-eyebrow"><span class="ct-eyebrow__dot" aria-hidden="true"></span>${esc(eyebrow)}</span>
        <h2 id="${id}-title" class="ct-section-title-lg">${esc(title)}</h2>
      </div>
      <div class="ct-story__body">
        <ol class="ct-story__tabs" aria-label="${esc(title)}">
          ${items.map((it, i) => `<li><button type="button" class="ct-story__tab${i === 0 ? ' is-active' : ''}" data-i="${i}">${icon(it.icon)}<span>${esc(it.title)}</span></button></li>`).join('')}
        </ol>
        <div class="ct-story__stage">
          ${items.map((it, i) => `
          <article class="ct-story__panel${i === 0 ? ' is-active' : ''}" data-i="${i}" id="${id}-step-${i + 1}" aria-labelledby="${id}-step-${i + 1}-title">
            <div class="ct-story__copy">
              <span class="ct-story__step">${icon(it.icon)}${i + 1} of ${items.length}, ${esc(it.title)}</span>
              <h3 id="${id}-step-${i + 1}-title">${esc(it.lead)}</h3>
              ${it.text ? `<p>${esc(it.text)}</p>` : ''}
              <ul>${it.points.map((p) => `<li>${icon('tick')}<span>${esc(p)}</span></li>`).join('')}</ul>
              ${links && it.key ? `<a class="ct-btn ct-btn--on-dark" href="#${it.key}">Open ${esc(it.title)}${icon('arrow-right')}</a>` : ''}
            </div>
            <div class="ct-story__visual">${card(it.key)}</div>
          </article>`).join('')}
        </div>
      </div>
    </div>
  </section>`;
}
