/* ============ BLAUE STUNDE — menu on phones and tablets ============
   Up to 1000px the <nav> in the header becomes a full-screen menu behind the toggle
   (.nav--menu in style.css; without JS only the CTA shows there). The bar stays fixed
   and visible; over a cine scene it drops its background (.nav--over-cine).
   Own file, like evidence.js: an error here cannot stop the scroll engine. Loaded after
   main.js, so window.lenis exists when smooth scrolling is on.
   =================================================================== */
(() => {
  const bar = document.getElementById('nav');
  const menu = document.getElementById('menu');
  const toggle = bar && bar.querySelector('.nav__toggle');
  if (!menu || !toggle) return;
  const narrow = matchMedia('(max-width: 1000px)');
  const lenis = window.lenis;
  const links = [...menu.querySelectorAll('a')];

  bar.classList.add('nav--menu');
  toggle.hidden = false;

  const isOpen = () => bar.classList.contains('nav--open');
  function setOpen(open) {
    bar.classList.toggle('nav--open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    // the page behind the menu does not scroll
    document.documentElement.classList.toggle('menu-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
  }

  toggle.addEventListener('click', () => {
    setOpen(!isOpen());
    if (isOpen()) links[0].focus();
  });
  // a link closes the menu first (capture phase), so the smooth scroll in main.js runs
  // with Lenis started again
  menu.addEventListener('click', e => {
    if (isOpen() && e.target.closest('a')) setOpen(false);
  }, true);
  // Escape closes; Tab stays between the toggle and the menu links while open
  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { setOpen(false); toggle.focus(); return; }
    if (e.key !== 'Tab') return;
    const ring = [toggle, ...links], i = ring.indexOf(document.activeElement);
    const next = ring[(i + (e.shiftKey ? -1 : 1) + ring.length) % ring.length];
    e.preventDefault();
    next.focus();
  });
  narrow.addEventListener('change', () => { if (!narrow.matches && isOpen()) setOpen(false); });

  // over a cine scene the bar has no background, only a soft shade behind brand and
  // toggle, so the frames stay whole (.nav--over-cine, up to 1000px in style.css);
  // elsewhere it keeps its translucent bar
  const stages = [...document.querySelectorAll('.cine__stage')];
  const onScroll = () => {
    const h = bar.offsetHeight;
    bar.classList.toggle('nav--over-cine', stages.some(s => {
      const r = s.getBoundingClientRect();
      return r.top <= 0 && r.bottom >= h;
    }));
  };
  if (lenis) lenis.on('scroll', onScroll);
  else window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
