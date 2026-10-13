/* ============ BLAUE STUNDE — "Bergfahrt": the evidence chain as a cable car ride ============
   The three links of <ol class="chain"> become the stations of a cable car on a mountain
   drawn in gold lines on a <canvas> (no images, no library). The section pins like the
   cine scenes; scroll progress moves the cabin up the cable and flies the camera with it;
   each station shows its link (the <li> itself, .is-active); at the top the summit hut
   lights up and the calculator CTA appears (.ride--top).
   Without JS or with reduced motion the list stays as it is (vertical rail, style.css).
   Own file, like evidence.js: an error here cannot stop the scroll engine.
   ========================================================================================= */
(() => {
  const chain = document.querySelector('.chain');
  if (!chain || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [...chain.children];
  if (items.length !== 3) return;

  // ---- markup: tall section > pinned stage > canvas + the list + progress + CTA ----
  // the CTA goes to the calculator; data-cta on the list says where it is on this page
  const ride = document.createElement('div');
  ride.className = 'ride';
  ride.innerHTML =
    '<div class="ride__stage"><canvas aria-hidden="true"></canvas>' +
    '<p class="ride__dots" aria-hidden="true"><span>01</span><span>02</span><span>03</span></p>' +
    '<a class="btn btn--gold ride__cta">Potenzial berechnen</a></div>';
  ride.querySelector('.ride__cta').href = chain.dataset.cta || '#rechner';
  chain.before(ride);
  const stage = ride.firstElementChild;
  stage.insertBefore(chain, stage.querySelector('.ride__dots'));
  chain.classList.add('chain--ride');
  items[0].classList.add('is-active');
  const canvas = stage.querySelector('canvas');
  // opaque: the ride paints its own background, so the compositor need not blend it
  const ctx = canvas.getContext('2d', { alpha: false });
  const dots = [...stage.querySelectorAll('.ride__dots span')];

  // ---- terrain: the logo's two summits (big left, small right), side ridges, a little noise
  const bump = (x, z, cx, cz, s, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
  const height = (x, z) =>
    bump(x, z, -0.25, 1.35, 0.42, 1.05) + bump(x, z, 0.55, 1.5, 0.33, 0.66) +
    bump(x, z, 1.4, 2.1, 0.5, 0.7) + bump(x, z, -1.4, 2.0, 0.5, 0.75) +
    0.05 * Math.sin(x * 7 + z * 3) * Math.cos(z * 5) + 0.08 * Math.max(0, z - 0.6);
  const COLS = 120, ROWS = 46, X0 = -2.6, X1 = 2.6, Z0 = 0.15, Z1 = 3.2;
  const ridges = [];   // precomputed heights per ridgeline (they never change)
  for (let r = 0; r < ROWS; r++) {
    const z = Z0 + (Z1 - Z0) * (r / (ROWS - 1)), row = [];
    for (let c = 0; c <= COLS; c++) { const x = X0 + (X1 - X0) * (c / COLS); row.push([x, height(x, z), z]); }
    ridges.push(row);
  }

  // ---- the cable: valley, middle and top station (the top one just below the summit)
  const stations = [[-1.25, 0.6], [-0.75, 1.0], [-0.33, 1.28]].map(([x, z]) => ({ x, z, y: height(x, z) + 0.03 }));
  const cableAt = t => {   // t 0..1 over both spans; a natural sag in each span
    const seg = t < 0.5 ? 0 : 1, u = seg ? (t - 0.5) * 2 : t * 2;
    const a = stations[seg], b = stations[seg + 1];
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, y: a.y + (b.y - a.y) * u - 0.06 * Math.sin(Math.PI * u) + 0.07 };
  };
  const ease = u => u * u * (3 - 2 * u);
  // scroll progress → cable position: the cabin slows down at each station
  const cabinT = p => { const s = Math.min(2, p * 2), seg = Math.min(1, Math.floor(s)), u = s - seg; return (seg + ease(u)) / 2; };

  let W = 0, H = 0, dpr = 1;
  // at most ~4.2 million canvas pixels: a 2560×1440 screen keeps 1×, a 1440×900 retina
  // laptop draws at ~1.8× instead of 2× (invisible on these lines, ~20 % less raster work)
  const BUDGET = 4.2e6;
  function size() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(BUDGET / Math.max(1, W * H)));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const INK = '#0c0e0d', GOLD = '198,164,92', SOFT = '230,212,168', WARM = '230,180,90';
  const COL = 8;                   // px between the columns of the hidden-line envelope
  let env = new Float32Array(0);   // per column: the lowest ridge drawn so far (screen y)
  // the soft light around lamps and windows: a radial gradient, not shadowBlur (which
  // blurs in an extra pass on every frame)
  function glow(x, y, r, rgb, a) {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  function draw(p) {
    const phone = W < 768, t = cabinT(p);
    // the camera rises and moves towards the summit with the cabin
    const cam = { x: -0.15 - p * 0.25 + (phone ? -0.35 : 0.35), y: 0.55 + p * 0.45, z: -1.05 + p * 0.55 };
    const f = Math.min(W, H * 1.6) * 0.62, horizon = H * (phone ? 0.34 : 0.42) + p * 40, cx = W * (phone ? 0.5 : 0.8);
    const P = (x, y, z) => { const d = z - cam.z; return d <= 0.05 ? null : { x: cx + (x - cam.x) / d * f, y: horizon - (y - cam.y) / d * f, d }; };

    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
    // ridgelines back to front: each one hides, in the page colour, the lines already drawn
    // below it, then is stroked in gold, fainter with depth. Only the band that hides
    // something is filled: between the ridge and the lowest line drawn so far, column by
    // column (env, every COL px). Filling down to the canvas bottom repainted the whole
    // canvas dozens of times per frame, which made large screens lag
    const cols = Math.ceil(W / COL) + 2;
    if (env.length !== cols) env = new Float32Array(cols);
    env.fill(-1e4);
    for (let r = ROWS - 1; r >= 0; r--) {
      const pts = [];
      for (const [x, y, z] of ridges[r]) { const q = P(x, y, z); if (q) pts.push(q); }
      if (pts.length < 2) continue;
      // the ridge's height at screen x (a row has one depth, so x is evenly spaced)
      const x0 = pts[0].x, x1 = pts.at(-1).x, n = pts.length - 1;
      const yAt = x => { const u = Math.min(n, Math.max(0, (x - x0) / (x1 - x0) * n)), i = Math.min(n - 1, Math.floor(u)); return pts[i].y + (pts[i + 1].y - pts[i].y) * (u - i); };
      const c0 = Math.max(0, Math.ceil(x0 / COL)), c1 = Math.min(cols - 1, Math.floor(x1 / COL));
      ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      // back along the lower edge: the lowest line so far where it is below this ridge
      ctx.lineTo(x1, Math.max(yAt(x1), env[Math.min(cols - 1, Math.round(x1 / COL))]) + 2);
      for (let c = c1; c >= c0; c--) ctx.lineTo(c * COL, Math.max(yAt(c * COL), env[c]) + 2);
      ctx.lineTo(x0, Math.max(yAt(x0), env[Math.max(0, Math.round(x0 / COL))]) + 2);
      ctx.closePath();
      ctx.fillStyle = INK; ctx.fill();
      for (let c = c0; c <= c1; c++) env[c] = Math.max(env[c], yAt(c * COL));
      ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      const near = 1 - r / ROWS;
      ctx.strokeStyle = `rgba(${GOLD},${(0.12 + 0.5 * near * near).toFixed(3)})`;
      ctx.lineWidth = 0.6 + near * 0.6; ctx.stroke();
    }

    // cable
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const c = cableAt(i / 80), q = P(c.x, c.y, c.z); if (q) (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); }
    ctx.strokeStyle = 'rgba(243,237,225,.55)'; ctx.lineWidth = 1; ctx.stroke();

    // stations: pylons with a light that comes on when the cabin arrives
    stations.forEach((s, i) => {
      const top = P(s.x, s.y + 0.07, s.z), foot = P(s.x, s.y - 0.06, s.z);
      if (!top || !foot) return;
      const on = t >= i / 2 - 0.01;
      ctx.strokeStyle = `rgba(${SOFT},${on ? 0.95 : 0.35})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(foot.x, foot.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      if (on) glow(top.x, top.y, 16, SOFT, 0.5);
      ctx.beginPath(); ctx.arc(top.x, top.y, on ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = on ? `rgb(${SOFT})` : `rgba(${SOFT},.4)`;
      ctx.fill();
    });

    // summit hut next to the top station: its window lights up at the end of the ride
    const s3 = stations[2], hut = P(s3.x + 0.1, s3.y + 0.02, s3.z + 0.04);
    if (hut) {
      const k = Math.max(9, 0.05 / hut.d * f), lit = Math.max(0, Math.min(1, (p - 0.88) / 0.1));
      ctx.strokeStyle = `rgba(${SOFT},.85)`; ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(hut.x - k, hut.y); ctx.lineTo(hut.x - k, hut.y - k * 0.8); ctx.lineTo(hut.x, hut.y - k * 1.5);
      ctx.lineTo(hut.x + k, hut.y - k * 0.8); ctx.lineTo(hut.x + k, hut.y); ctx.closePath();
      ctx.fillStyle = INK; ctx.fill(); ctx.stroke();
      glow(hut.x, hut.y - k * 0.42, k * 0.35 + 18, WARM, 0.45 * lit);
      ctx.fillStyle = `rgba(${WARM},${(0.15 + 0.8 * lit).toFixed(2)})`;
      ctx.fillRect(hut.x - k * 0.35, hut.y - k * 0.65, k * 0.7, k * 0.45);
    }

    // cabin: hanger and a rounded glass body with a warm light inside
    const c = cableAt(t), a = P(c.x, c.y, c.z), b = P(c.x, c.y - 0.075, c.z);
    if (a && b) {
      const s = Math.max(10, 0.045 / a.d * f);
      ctx.strokeStyle = `rgb(${SOFT})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(b.x - s * 0.6, b.y, s * 1.2, s, s * 0.25);
      ctx.fillStyle = 'rgba(12,14,13,.95)'; ctx.fill(); ctx.stroke();
      glow(b.x, b.y + s * 0.42, s * 0.45 + 14, WARM, 0.4);
      ctx.fillStyle = `rgba(${WARM},.85)`;
      ctx.fillRect(b.x - s * 0.45, b.y + s * 0.2, s * 0.9, s * 0.45);
    }
  }

  // ---- loop: only while the section is on screen; redraw only when progress or size changed
  const STATIONS = [0, 0.5, 1];   // ride progress at each link's station
  let running = false, last = -1, lastW = 0, lastH = 0;
  function frame() {
    if (!running) return;
    if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) { size(); lastW = W; lastH = H; last = -1; }
    const r = ride.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    if (Math.abs(p - last) > 0.0004) {
      draw(p); last = p;
      // each link fades with the scroll, like the captions over the frames: the current
      // one fades out, a short pause, then the next one fades in and rises (12 % each)
      const k = (a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
      const show = [1 - k(0.12, 0.24), k(0.26, 0.38) * (1 - k(0.62, 0.74)), k(0.76, 0.88)];
      items.forEach((li, i) => {
        const o = show[i], y = p < STATIONS[i] ? (1 - o) * 1.2 : -(1 - o) * 0.6;
        li.style.opacity = o.toFixed(3);
        li.style.transform = o < 1 ? `translateY(${y.toFixed(2)}rem)` : '';
        li.style.visibility = o > 0.005 ? 'visible' : 'hidden';
        li.classList.toggle('is-active', o >= 0.5);
      });
      const active = p < 0.25 ? 0 : p < 0.75 ? 1 : 2;
      dots.forEach((d, i) => d.classList.toggle('on', i <= active));
      ride.classList.toggle('ride--top', p > 0.9);
    }
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
    else if (!e.isIntersecting) running = false;
  }).observe(ride);
})();
