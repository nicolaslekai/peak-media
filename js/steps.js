/* ============ BLAUE STUNDE — process line as one mountain profile ============
   Option for <ol class="steps" data-line="profile">. The logo ridge (both mountains,
   real proportions) becomes the line:
   - wide screens (five columns): the whole logo across the steps, small summit on the
     4th dot, every dot on the line, raised dots with a drop line to their number; the
     line, the rising sun and the arc are drawn while scrolling (.steps--profile,
     .steps--drawing in style.css);
   - phones and tablets: the same pinned drawing over the logo's own ridge, dots as a
     route (foot, halfway up, both summits, other foot); one step at a time, fading
     with the scroll; a dot jumps to its step (.steps--tabs, .steps--scroll,
     .steps__nav). With reduced motion: not pinned, the numbered dots and the line
     under the step choose the step (tap or swipe, .steps__next).
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
    // the name must contain the visible number (WCAG 2.5.3, label in name)
    b.setAttribute('aria-label', `Schritt ${b.textContent}: ${li.querySelector('h3').textContent}`);
    b.addEventListener('click', () => (scrolling ? goTo(i) : show(i)));
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

  // wide screens: the list sits in a pinned stage (like the cine scenes); while it is
  // pinned, scrolling only draws the logo and reveals the steps (.steps-pin--on)
  const host = ol.parentElement;
  const pin = document.createElement('div');
  pin.className = 'steps-pin';
  pin.innerHTML = '<div class="steps-pin__stage"></div>';
  ol.before(pin);
  pin.firstElementChild.append(nav, ol);

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
    if (x0 === null || !ol.classList.contains('steps--tabs') || scrolling) return;
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

  // ---- wide screens: the whole logo along the five columns, drawn while scrolling ----
  // The ridge line runs flat, over both mountains (small summit on the 4th dot) and flat
  // again; above it the sun (the logo's disc, behind the logo's own mountain mask) and the
  // arc. Scrolling draws the line from dot to dot (each step appears when the line reaches
  // it), the sun rises behind the mountains, and the arc closes the logo at the end.
  // Reduced motion: drawn at once.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const logo = document.createElementNS(SVGNS, 'svg');
  logo.classList.add('steps__logo');
  logo.setAttribute('aria-hidden', 'true');
  ol.append(logo);          // last child, so li:nth-child() stays as it is
  const ARC_TOP = 3;        // top of the logo's arc (logo units; the ridge starts at 90.3)
  let line = null, arc = null, sun = null, total = 0, arcLen = 0, dotLen = [];
  let scrolling = false;    // phones and tablets with motion: pinned, steps follow the scroll

  // the logo for the dots at xs (px, the 4th on the small summit) at sL px per logo unit,
  // W wide: ridge line through the dots, the sun behind the mountains and the arc
  function buildLogo(W, xs, sL) {
    const left = xs[3] - 177 * sL, h = 78.7 * sL, top = f((90.3 - ARC_TOP) * sL + 4);
    const X = x => f(left + (x - 4) * sL), Y = y => f((y - 90.3) * sL + top + 0.5);
    const base = f(top + h + 0.5);
    let dl = `M0 ${base}H${X(4)}`;
    for (const [, a, b, c] of RIDGE) dl += `C${X(a[0])} ${Y(a[1])} ${X(b[0])} ${Y(b[1])} ${X(c[0])} ${Y(c[1])}`;
    dl += `H${f(W)}`;
    // logo units → px for the disc and its mask (blaue-stunde-logo-white.svg); the arc and
    // the line are drawn in px, since Chromium dashes a scaled path wrongly
    const m = `matrix(${sL} 0 0 ${sL} ${f(left - 4 * sL)} ${f(top + 0.5 - 90.3 * sL)})`;
    logo.setAttribute('viewBox', `0 0 ${f(W)} ${Math.ceil(base + 1)}`);
    logo.style.height = `${Math.ceil(base + 1)}px`;
    logo.innerHTML = `<defs><mask id="steps-sun" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="172">
        <rect width="240" height="172" fill="#fff"/>
        <g fill="#000" stroke="#000" stroke-width="9" stroke-linejoin="round">
          <path d="M4 169C33.9 138.1 82 90.3 98 90.3C114 90.3 152.1 138.9 178 169L178 172L4 172Z"/>
          <path d="M151 139.9C160.7 131.6 169 120.7 181 120.7C193 120.7 213.8 146.8 236 169L236 172L151 172Z"/>
        </g></mask></defs>
      <g transform="${m}">
        <g mask="url(#steps-sun)"><circle class="steps__sun" cx="150" cy="103" r="62"/></g>
      </g>
      <path class="steps__arc" d="M${X(26)} ${Y(137.2)}A${f(100 * sL)} ${f(100 * sL)} 0 1 1 ${X(214)} ${Y(137.2)}"/>
      <path class="steps__ridge" d="${dl}"/>`;
    line = logo.querySelector('.steps__ridge');
    arc = logo.querySelector('.steps__arc');
    sun = logo.querySelector('.steps__sun');
    total = line.getTotalLength();
    arcLen = arc.getTotalLength();
    // dash = the stroke's length, gap twice that: with a gap equal to the length Chromium
    // drew only the start of the arc
    line.style.strokeDasharray = `${total} ${total * 2}`;
    arc.style.strokeDasharray = `${arcLen} ${arcLen * 2}`;
    // length along the line at each dot (the line runs left to right)
    dotLen = xs.map(x => {
      let lo = 0, hi = total;
      for (let k = 0; k < 28; k++) { const mid = (lo + hi) / 2; if (line.getPointAtLength(mid).x < x) lo = mid; else hi = mid; }
      return lo;
    });
    return { base, left };
  }

  function drawLine() {
    const box = ol.getBoundingClientRect(), W = box.width;
    const xs = items.map(li => li.getBoundingClientRect().left - box.left + DOT);
    // the logo shrinks on short screens so that it and the tallest step fit below the bar
    const textH = Math.max(...items.map(li => li.offsetHeight));
    const sL = still ? S : Math.min(S, Math.max(1.1, (innerHeight - 110 - textH - 40) / 172));
    if (logo.parentNode !== ol) ol.append(logo);
    const { base, left } = buildLogo(W, xs, sL);
    ol.style.paddingTop = `${Math.ceil(base) + 10}px`;
    logo.style.top = '10px';
    items.forEach((li, i) => {
      const rise = riseAt((xs[i] - left) / sL + 4) * sL;
      li.style.setProperty('--rise', `${f(rise)}px`);
      li.style.setProperty('--drop', rise > 12 ? '18px' : '0px');
    });
    ol.classList.toggle('steps--drawing', !still);
    pin.classList.toggle('steps-pin--on', !still);
    progress();
  }

  // phones and tablets: the same logo over the route of dots, in the nav above the list
  function drawScrollNav() {
    const W = nav.clientWidth, pad = 16;
    const s = Math.min(S, (W - 2 * pad) / 232);
    const left = (W - 232 * s) / 2;
    const xs = ROUTE.map(u => left + (u - 4) * s);
    if (logo.parentNode !== nav) nav.prepend(logo);
    const { base } = buildLogo(W, xs, s);
    logo.style.top = '0px';
    nav.style.height = `${Math.ceil(base) + pad}px`;
    nav.style.setProperty('--profile', 'none');   // the drawn line replaces the faint one
    dots.forEach((b, i) => { b.style.left = `${f(xs[i])}px`; b.style.top = `${f(base - riseAt(ROUTE[i]) * s)}px`; });
    progress();
  }

  // phones: each step gets an equal stretch of the line's 80 % (the line reaches dot i at
  // reach()[i]); a step fades out over FADE just before the next dot, the next fades in
  // over FADE just after it, GAP apart
  const FADE = 0.04, GAP = 0.008;
  const reach = () => items.map((_, i) => (i * 0.8) / (items.length - 1));
  function goTo(i) {
    const at = reach(), p = i === 0 ? 0 : at[i] + GAP + FADE;
    const span = (pin.offsetHeight - innerHeight) * 0.9;
    const y = pin.getBoundingClientRect().top + scrollY + p * span + 1;
    if (window.lenis) window.lenis.scrollTo(y, { duration: 0.9 });
    else scrollTo({ top: y, behavior: 'smooth' });
  }

  // scroll progress over the pinned stretch: 0 when the stage pins, 1 after 90 % of it
  // (the finished logo holds for a moment before the page moves on); the line takes
  // 80 %, the arc the last 20 %
  const clamp = v => Math.max(0, Math.min(1, v));
  function progress() {
    if (!line || !(ol.classList.contains('steps--profile') || scrolling)) return;
    const r = pin.getBoundingClientRect();
    const p = still ? 1 : clamp(-r.top / ((r.height - innerHeight) * 0.9));
    const lp = clamp(p / 0.8);
    let len = lp * total;
    if (scrolling) {   // phones: equal stretches, so the line speeds up or slows between dots
      const n = items.length - 1, seg = lp * n, k = Math.min(n - 1, Math.floor(seg));
      len = dotLen[k] + (dotLen[k + 1] - dotLen[k]) * (seg - k) + (total - dotLen[n]) * clamp((p - 0.8) / 0.2);
    }
    line.style.strokeDashoffset = f(total - len);
    const ap = clamp((p - 0.8) / 0.2);
    arc.style.strokeDashoffset = f(arcLen * (1 - ap));
    // a zero-length dash with round caps still paints a dot: hide the arc until it starts
    arc.style.visibility = ap > 0 ? '' : 'hidden';
    // the sun rises from fully behind the mountains (110 logo units lower) to its place
    // ... once the line has passed the big summit, so it never floats over a missing ridge
    const sp = clamp((p - 0.45) / 0.4);
    sun.setAttribute('transform', `translate(0 ${f(110 * (1 - sp * sp * (3 - 2 * sp)))})`);
    if (!scrolling) {
      items.forEach((li, i) => li.classList.toggle('is-on', i === 0 || len >= dotLen[i] - 1));
      return;
    }
    // phones: one step at a time, out before the line reaches the next dot, in after it
    const at = reach();
    let best = 0, top = -1;
    items.forEach((li, i) => {
      const fin = i === 0 ? 1 : clamp((p - at[i] - GAP) / FADE);
      const fout = i === items.length - 1 ? 0 : clamp((p - (at[i + 1] - GAP - FADE)) / FADE);
      const o = fin * (1 - fout), y = fout > 0 ? -(1 - o) * 0.6 : (1 - o) * 1.2;
      li.style.opacity = o.toFixed(3);
      li.style.transform = o < 1 ? `translateY(${f(y)}rem)` : '';
      li.style.visibility = o > 0.005 ? 'visible' : 'hidden';
      if (o > top) { top = o; best = i; }
    });
    dots.forEach((b, k) => b.setAttribute('aria-pressed', String(k === best)));
  }
  let queued = false;
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; progress(); }); } };
  if (window.lenis) window.lenis.on('scroll', onScroll);
  else addEventListener('scroll', onScroll, { passive: true });

  let last = '';
  function draw() {
    const tabs = !wide.matches;
    const key = `${tabs}:${host.clientWidth}:${tabs ? 0 : innerHeight}`;
    if (key === last) return;           // height-only changes (fonts, panel): nothing to redraw
    last = key;
    scrolling = tabs && !still;
    ol.classList.toggle('steps--profile', !tabs);
    ol.classList.toggle('steps--tabs', tabs);
    ol.classList.toggle('steps--scroll', scrolling);
    nav.classList.toggle('steps__nav--scroll', scrolling);
    pin.classList.toggle('steps-pin--tabs', scrolling);
    nav.hidden = !tabs;
    onward.hidden = !tabs || scrolling;
    logo.toggleAttribute('hidden', tabs && !scrolling);   // an <svg> has no .hidden property (T9)
    if (!scrolling) for (const li of items) li.style.opacity = li.style.transform = li.style.visibility = '';
    if (!tabs) { drawLine(); return; }
    ol.style.paddingTop = '';
    ol.classList.remove('steps--drawing');
    pin.classList.toggle('steps-pin--on', scrolling);
    if (scrolling) { drawScrollNav(); return; }
    drawNav();
    show(current);
  }

  // first call on observe, then on every width change of the section
  new ResizeObserver(draw).observe(host);
  addEventListener('resize', draw);
})();
