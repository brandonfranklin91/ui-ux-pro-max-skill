// Bud Haynes — smooth scrolling for the whole page (Lenis).
// Lenis eases the real window scroll position rather than faking it with
// transforms, so sticky pinning, anchor links, keyboard scrolling and the
// scrollbar all keep working. Touch scrolling is left native, and visitors
// who prefer reduced motion get ordinary scrolling.
import Lenis from 'lenis';

const root = document.documentElement;
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !new URLSearchParams(location.search).has('p')) {
  const header = document.getElementById('header');
  const lenis = new Lenis({
    duration: 1.25,
    easing: (t) => 1 - Math.pow(1 - t, 4),
    smoothWheel: true,
    wheelMultiplier: 0.95,
    autoRaf: true,
    anchors: { offset: -(header ? 68 : 0), duration: 1.6 },
  });
  root.classList.add('has-smooth');
  window.__lenis = lenis; // site.js pauses it while the mobile menu is open

  // Gentle depth on imagery: each picture drifts a little slower than the page.
  const pics = [...document.querySelectorAll('.svc__img img, .panel__img img')];
  function parallax() {
    const vh = innerHeight;
    for (const img of pics) {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80 || !r.height) continue;
      const k = ((r.top + r.height / 2) / vh - 0.5) * 2; // -1 (top) … 1 (bottom)
      img.style.setProperty('--py', (k * -4.5).toFixed(2) + '%');
    }
  }
  lenis.on('scroll', parallax);
  addEventListener('resize', parallax);
  parallax();
}
