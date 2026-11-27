// Motion: smooth wheel scrolling plus quiet scroll reveals, on every screen.
// - [data-reveal] (up, left, right) rises 24px over 0.4s.
// - [data-reveal-group] children rise 18px over 0.35s, 60ms apart (the numbered index rows).
// - Each starts when its top reaches 85% of the viewport and plays once.
// - prefers-reduced-motion: no smooth scroll and no reveals, everything is simply visible.
// Older blocks that use the .ct-reveal class join the same system.

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let io = null;
let lenis = null;

function scan() {
  if (!io) return;
  document.querySelectorAll('.ct-reveal:not([data-reveal])').forEach((n) => n.setAttribute('data-reveal', 'up'));
  document.querySelectorAll('.ct-revealed:not([data-revealed])').forEach((n) => n.setAttribute('data-revealed', ''));
  document.querySelectorAll('[data-reveal]:not([data-revealed]):not([data-watched]), [data-reveal-group]:not([data-revealed]):not([data-watched])')
    .forEach((n) => { n.setAttribute('data-watched', ''); io.observe(n); });
}

export function initMotion() {
  if (reduced() || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('ct-motion');
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.setAttribute('data-revealed', '');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
  scan();
  let queued = 0;
  new MutationObserver(() => {
    if (queued) return;
    queued = requestAnimationFrame(() => { queued = 0; scan(); });
  }).observe(document.body, { childList: true, subtree: true });

  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.115, autoRaf: true, allowNestedScroll: true });
    // In-page anchors (not routes) glide to their section and keep the route in the address bar.
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = e.target.closest('a[href^="#"]');
      const id = a && a.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(Math.round(target.getBoundingClientRect().top + window.scrollY - 96));
      if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
    });
  }
}

// Route changes jump to the top at once.
export function resetScroll() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
}

// Smooth scroll to a page position (Lenis when present).
export function scrollToY(y) {
  if (lenis) lenis.scrollTo(Math.round(y));
  else window.scrollTo({ top: Math.round(y), behavior: 'smooth' });
}
