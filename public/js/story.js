// Pinned scroll story. The section stays on screen while its steps advance with the scroll,
// one screen per step. Under 900px, or with reduced motion, the steps simply stack.
//   <section class="ct-story ct-story--4" data-story>
//     <div class="ct-story__sticky"> ... .ct-story__tab[data-i] ... .ct-story__panel[data-i] ... </div>
//   </section>
import { scrollToY } from './motion.js';

const stacked = () => window.matchMedia('(max-width: 899px), (prefers-reduced-motion: reduce)').matches;
let stories = [];
let raf = 0;

function update() {
  raf = 0;
  for (const s of stories) {
    const panels = s.querySelectorAll('.ct-story__panel');
    if (stacked()) { panels.forEach((p) => p.classList.add('is-active')); continue; }
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
    const count = s.querySelector('.ct-story__count');
    if (count) count.textContent = `${idx + 1} of ${n}`;
  }
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

export function mountStories(container) {
  stories = [...container.querySelectorAll('[data-story]')];
  for (const s of stories) {
    s.querySelectorAll('.ct-story__tab').forEach((tab, i, all) => tab.addEventListener('click', () => {
      if (stacked()) { s.querySelectorAll('.ct-story__panel')[i].scrollIntoView({ block: 'start' }); return; }
      const sticky = s.querySelector('.ct-story__sticky');
      const total = s.offsetHeight - sticky.offsetHeight;
      scrollToY(s.getBoundingClientRect().top + window.scrollY + total * ((i + 0.5) / all.length));
    }));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

export function unmountStories() {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onScroll);
  stories = [];
}
