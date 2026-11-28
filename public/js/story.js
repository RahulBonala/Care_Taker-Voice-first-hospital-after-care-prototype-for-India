// Pinned scroll story. The section stays on screen while its steps advance with the scroll,
// one screen per step. Under 900px, or with reduced motion, the steps simply stack.
//   <section class="ct-story ct-story--4" data-story>
//     <div class="ct-story__sticky"> ... .ct-story__tab[data-i] ... .ct-story__panel[data-i] ... </div>
//   </section>
// A step becomes active by adding .is-active to its panel; CSS then plays its .ct-seq rows in turn.
// Pinned: the active step follows the scroll, and the section fires `ct:story` with { index }.
// Stacked: each panel becomes active once, when it scrolls into view (all at once with reduced motion).
import { scrollToY } from './motion.js';

const mq = (q) => window.matchMedia(q).matches;
const reduced = () => mq('(prefers-reduced-motion: reduce)');
export const isStacked = () => mq('(max-width: 899px), (prefers-reduced-motion: reduce)');
let stories = [];
let raf = 0;

// Page position that shows step i of a pinned story (the middle of its scroll range).
export function storyStepY(s, i) {
  const n = s.querySelectorAll('.ct-story__panel').length;
  const sticky = s.querySelector('.ct-story__sticky');
  const total = s.offsetHeight - sticky.offsetHeight;
  return s.getBoundingClientRect().top + window.scrollY + total * ((i + 0.5) / n);
}

function update() {
  raf = 0;
  for (const s of stories) {
    const panels = s.querySelectorAll('.ct-story__panel');
    const mode = isStacked() ? 'stacked' : 'pinned';
    if (s.dataset.mode !== mode) { s.dataset.mode = mode; delete s.dataset.active; }
    if (mode === 'stacked') {
      const line = window.innerHeight * 0.8;
      panels.forEach((p) => {
        if (reduced() || p.querySelector('.ct-story__visual').getBoundingClientRect().top < line) p.classList.add('is-active');
      });
      continue;
    }
    const sticky = s.querySelector('.ct-story__sticky');
    const total = Math.max(1, s.offsetHeight - sticky.offsetHeight);
    const progress = Math.min(1, Math.max(0, -s.getBoundingClientRect().top / total));
    const n = panels.length;
    const idx = Math.min(n - 1, Math.floor(progress * n));
    if (s.dataset.active === String(idx)) continue;
    s.dataset.active = String(idx);
    panels.forEach((p, i) => p.classList.toggle('is-active', i === idx));
    s.querySelectorAll('.ct-story__tab').forEach((tab, i) => {
      tab.classList.toggle('is-active', i === idx);
      tab.classList.toggle('is-done', i < idx);
      if (i === idx) tab.setAttribute('aria-current', 'step'); else tab.removeAttribute('aria-current');
    });
    s.dispatchEvent(new CustomEvent('ct:story', { detail: { index: idx, count: n } }));
  }
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

export function mountStories(container) {
  stories = [...container.querySelectorAll('[data-story]')];
  for (const s of stories) {
    // Stacked panels start hidden until they scroll into view; the first pinned one starts active.
    if (isStacked() && !reduced()) s.querySelectorAll('.ct-story__panel').forEach((p) => p.classList.remove('is-active'));
    s.querySelectorAll('.ct-story__tab').forEach((tab, i) => tab.addEventListener('click', () => {
      if (isStacked()) { s.querySelectorAll('.ct-story__panel')[i].scrollIntoView({ block: 'start' }); return; }
      scrollToY(storyStepY(s, i));
    }));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

export function unmountStories() {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onScroll);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  stories = [];
}
