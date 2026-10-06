/* ============ BLAUE STUNDE — process line as one mountain profile ============
   Option for <ol class="steps" data-line="profile">. The logo ridge (both mountains,
   real proportions) becomes the line:
   - wide screens (five columns): one profile across the steps, small summit on the
     4th dot, every dot on the line, raised dots with a drop line to their number
     (.steps--profile in style.css);
   - phones and tablets: the profile becomes the navigation, ringed dots with their
     number above them along the ridge as a route (foot, halfway up, both summits,
     other foot), and the list shows one step at a time: tap a number, tap the line
     under the step that names the next one, or swipe (.steps--tabs, .steps__nav,
     .steps__next).
   Without JS each step keeps its own ridge. Own file, like evidence.js: an error here
   cannot stop the scroll engine.
   ============================================================================ */
(() => {
  const ol = document.querySelector('.steps[data-line="profile"]');
  if (!ol) return;
  const items = [...ol.children];
  const wide = matchMedia('(min-width: 1001px)');   // five columns in style.css

  const S = 170 / 78.7;     // px per logo unit on wide screens (ridge 170px tall)
  const DOT = 4.5;          // dot centre from the step's left edge (style.css)

  // logo ridge in logo units (blaue-stunde-logo-white.svg): the big mountain until it
  // meets the small one, then the small one. Feet at x 4 and 236 on y 169, summits at
  // x 98 and 181 (83 apart). Each segment runs left to right.
  const RIDGE = [
    [[4, 169], [33.9, 138.1], [82, 90.3], [98, 90.3]],
    [[98, 90.3], [110.9, 90.3], [139.1, 125.6], [151, 137.19]],
    [[151, 137.19], [160.7, 131.6], [169, 120.7], [181, 120.7]],
    [[181, 120.7], [193, 120.7], [213.8, 146.8], [236, 169]],
  ];
  const bez = (a, b, c, d, t) => {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
  };
  // height of the ridge above its feet at logo x (0 outside the mountain)
  const riseAt = x => {
    for (const [p0, p1, p2, p3] of RIDGE) {
      if (x < p0[0] || x > p3[0]) continue;
      let lo = 0, hi = 1;
      for (let i = 0; i < 30; i++) {
        const m = (lo + hi) / 2;
        if (bez(p0[0], p1[0], p2[0], p3[0], m) < x) lo = m; else hi = m;
      }
      return 169 - bez(p0[1], p1[1], p2[1], p3[1], lo);
    }
    return 0;
  };
  const f = n => +n.toFixed(1);

  // the line as an SVG background: flat, the ridge at scale s with its small summit at
  // x4 (px), flat again up to width. The base runs at y = h + 0.5.
  function profile(width, s, x4) {
    const h = 78.7 * s, left = x4 - 177 * s;
    const X = x => f(left + (x - 4) * s);
    const Y = y => f((y - 90.3) * s + 0.5);
    let d = `M0 ${f(h + 0.5)}H${X(4)}`;
    for (const [, a, b, c] of RIDGE) d += `C${X(a[0])} ${Y(a[1])} ${X(b[0])} ${Y(b[1])} ${X(c[0])} ${Y(c[1])}`;
    d += `H${f(width)}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f(width)}" height="${Math.ceil(h + 1)}">` +
      `<path d="${d}" fill="none" stroke="#c6a45c" stroke-opacity=".28"/></svg>`;
    return {
      h,
      url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      rise: x => riseAt((x - left) / s + 4) * s,
    };
  }

  // ---- phones and tablets: numbered dots on the ridge + one step at a time ----
  const nav = document.createElement('div');
  nav.className = 'steps__nav';
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', 'Schritt wählen');
  const dots = items.map((li, i) => {
    li.id ||= `schritt-${i + 1}`;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(i + 1).padStart(2, '0');
    b.setAttribute('aria-controls', li.id);
    b.setAttribute('aria-label', `Schritt ${i + 1}: ${li.querySelector('h3').textContent}`);
    b.addEventListener('click', () => show(i));
    nav.append(b);
    return b;
  });
  // under the panel, one quiet line names the next step (tap to go on); after the
  // last step it leads back to the first
  const onward = document.createElement('button');
  onward.type = 'button';
  onward.className = 'steps__next';
  const onwardLabel = document.createElement('span');
  const onwardTitle = document.createTextNode('');
  const arrow = document.createElement('i');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';
  onward.append(onwardLabel, onwardTitle, arrow);
  onward.addEventListener('click', () => show(current < items.length - 1 ? current + 1 : 0));
  ol.before(nav);
  ol.after(onward);

  let current = 0;
  function show(i) {
    current = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((li, k) => li.classList.toggle('is-active', k === current));
    dots.forEach((b, k) => b.setAttribute('aria-pressed', String(k === current)));
    const last = current === items.length - 1;
    onwardLabel.textContent = last ? 'Von vorn' : 'Weiter';
    onwardTitle.textContent = items[last ? 0 : current + 1].querySelector('h3').textContent;
  }
  show(0);

  // swipe on the panel: left = next step, right = previous
  let x0 = null, y0 = 0;
  ol.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  ol.addEventListener('touchend', e => {
    if (x0 === null || !ol.classList.contains('steps--tabs')) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // the dots as a route over the mountain, in logo x: foot, halfway up, big summit,
  // small summit, other foot
  const ROUTE = [4, 50, 98, 181, 236];

  function drawNav() {
    // pad: room for a ringed dot at the sides; above, room for the number over the summit
    const W = nav.clientWidth, pad = 16, top = 44;
    // as wide as the column allows (at most the wide-screen size), centred
    const s = Math.min(S, (W - 2 * pad) / 232);
    const left = (W - 232 * s) / 2;
    const xs = ROUTE.map(u => left + (u - 4) * s);
    const p = profile(W, s, xs[3]);
    const base = Math.ceil(p.h) + top;
    nav.style.height = `${base + pad}px`;
    nav.style.setProperty('--profile', p.url);
    nav.style.setProperty('--ridge-top', `${f(base - p.h - 0.5)}px`);
    dots.forEach((b, i) => { b.style.left = `${f(xs[i])}px`; b.style.top = `${f(base - p.rise(xs[i]))}px`; });
  }

  // ---- wide screens: the profile along the five columns ----
  function drawLine() {
    const box = ol.getBoundingClientRect();
    const xs = items.map(li => li.getBoundingClientRect().left - box.left + DOT);
    const p = profile(box.width, S, xs[3]);
    ol.style.setProperty('--profile', p.url);
    items.forEach((li, i) => {
      const rise = p.rise(xs[i]);
      li.style.setProperty('--rise', `${f(rise)}px`);
      li.style.setProperty('--drop', rise > 12 ? '18px' : '0px');
    });
  }

  let last = '';
  function draw() {
    const tabs = !wide.matches;
    const key = `${tabs}:${ol.parentElement.clientWidth}`;
    if (key === last) return;           // height-only changes (fonts, panel): nothing to redraw
    last = key;
    ol.classList.toggle('steps--profile', !tabs);
    ol.classList.toggle('steps--tabs', tabs);
    nav.hidden = onward.hidden = !tabs;
    if (tabs) drawNav(); else drawLine();
  }

  // first call on observe, then on every width change of the section
  new ResizeObserver(draw).observe(ol.parentElement);
})();
