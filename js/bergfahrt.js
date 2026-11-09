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
  // the CTA at the top: data-cta on the list says where it leads on this page, data-cta-label
  // what it says (Bergbahnen: the enquiry, D-67); by default the calculator
  const ride = document.createElement('div');
  ride.className = 'ride';
  ride.innerHTML =
    '<div class="ride__stage"><canvas aria-hidden="true"></canvas>' +
    '<a class="btn btn--gold ride__cta"></a></div>';
  const cta = ride.querySelector('.ride__cta');
  cta.href = chain.dataset.cta || '#rechner';
  cta.textContent = chain.dataset.ctaLabel || 'Potenzial berechnen';
  chain.before(ride);
  const stage = ride.firstElementChild;
  stage.insertBefore(chain, cta);   // no 01-03 progress on the right any more (Nicky, 2026-11-09)
  chain.classList.add('chain--ride');
  items[0].classList.add('is-active');
  const canvas = stage.querySelector('canvas');
  // opaque: the ride paints its own background, so the compositor need not blend it
  const ctx = canvas.getContext('2d', { alpha: false });

  // ---- terrain: the logo's two summits (big left, small right), side ridges, a little noise
  const bump = (x, z, cx, cz, s, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
  const height = (x, z) =>
    bump(x, z, -0.25, 1.35, 0.42, 1.05) + bump(x, z, 0.55, 1.5, 0.33, 0.66) +
    bump(x, z, 1.4, 2.1, 0.5, 0.7) + bump(x, z, -1.4, 2.0, 0.5, 0.75) +
    0.05 * Math.sin(x * 7 + z * 3) * Math.cos(z * 5) + 0.08 * Math.max(0, z - 0.6);
  // 300 points a line, stroked as curves: at 120 straight pieces the near ridges showed
  // corners ("low-poly", Nicky, 2026-11-09)
  const COLS = 300, ROWS = 46, X0 = -2.6, X1 = 2.6, Z0 = 0.15, Z1 = 3.2;
  const ridges = [];   // precomputed heights per ridgeline (they never change)
  for (let r = 0; r < ROWS; r++) {
    const z = Z0 + (Z1 - Z0) * (r / (ROWS - 1)), row = [];
    for (let c = 0; c <= COLS; c++) { const x = X0 + (X1 - X0) * (c / COLS); row.push([x, height(x, z), z]); }
    ridges.push(row);
  }

  // ---- the cable: valley, middle and top station (the top one just below the summit)
  // the cable runs into the gables of the valley and the summit station and over the
  // saddle of the tower in the middle (entry: the cable's height there above the station)
  const stations = [[-1.25, 0.6], [-0.75, 1.0], [-0.33, 1.28]].map(([x, z], i) => ({ x, z, y: height(x, z) + 0.03, entry: [0.03, 0.075, 0.012][i] }));
  const SAG = 0.045;
  const cableAt = (t, drop = 0) => {   // t 0..1 over both spans; a parabolic sag in each span
    const seg = t < 0.5 ? 0 : 1, u = seg ? (t - 0.5) * 2 : t * 2;
    const a = stations[seg], b = stations[seg + 1], ya = a.y + a.entry, yb = b.y + b.entry;
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, y: ya + (yb - ya) * u - SAG * 4 * u * (1 - u) - drop };
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

  const INK = '#10141A', GOLD = '209,168,81', SOFT = '236,214,162', WARM = '230,180,90';
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
  // a smooth line through screen points: quadratic pieces between the midpoints
  function curve(pts) {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
    const l = pts.at(-1); ctx.lineTo(l.x, l.y);
  }
  function draw(p) {
    const phone = W < 768, t = cabinT(p);
    // the camera rises and moves towards the summit with the cabin
    // (wide screens: the camera stands further left, so the whole line, valley station
    // included, sits right of the copy — Nicky, 2026-11-09)
    const cam = phone ? { x: -0.5 - p * 0.25, y: 0.55 + p * 0.45, z: -1.05 + p * 0.55 } : { x: -0.45 - p * 0.1, y: 0.55 + p * 0.45, z: -1.05 + p * 0.55 };
    const f = Math.min(W, H * 1.6) * 0.62, horizon = H * (phone ? 0.34 : 0.42) + p * 40, cx = W * (phone ? 0.5 : 0.74);
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
      curve(pts);
      const near = 1 - r / ROWS;
      ctx.strokeStyle = `rgba(${GOLD},${(0.12 + 0.5 * near * near).toFixed(3)})`;
      ctx.lineWidth = 0.6 + near * 0.6; ctx.stroke();
    }

    // ---- helpers for the built parts: a filled outline in 3D, a line in 3D
    const poly = (vs, a = 0.85, w = 1) => {
      const q = vs.map(v => P(...v)); if (q.some(v => !v)) return null;
      ctx.beginPath(); q.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y))); ctx.closePath();
      ctx.fillStyle = INK; ctx.fill(); ctx.strokeStyle = `rgba(${SOFT},${a})`; ctx.lineWidth = w; ctx.stroke();
      return q;
    };
    const line = (A, B, a, w = 1, rgb = SOFT) => { const s = P(...A), e = P(...B); if (!s || !e) return; ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke(); };
    const lightRect = (q, lit) => {   // a window: warm when lit, a hairline when not
      if (!q) return;
      if (lit > 0) {
        ctx.fillStyle = `rgba(${WARM},${(0.2 + 0.65 * lit).toFixed(2)})`; ctx.fill();
        glow((q[0].x + q[2].x) / 2, (q[0].y + q[2].y) / 2, Math.hypot(q[2].x - q[0].x, q[2].y - q[0].y) + 8, WARM, 0.3 * lit);
      }
    };
    // a small alpine building: front and right walls (the camera stands to the right), a
    // gable roof along x with an overhang, a row of windows on the front
    const building = (x, z, w, d, h, rh, wins, lit) => {
      const g = Math.min(height(x - w / 2, z - d / 2), height(x + w / 2, z - d / 2), height(x, z)) - 0.008;
      const xa = x - w / 2, xb = x + w / 2, za = z - d / 2, zb = z + d / 2, y1 = g + h, yr = y1 + rh, e = 0.012;
      poly([[xb, g, za], [xb, g, zb], [xb, y1, zb], [xb, y1, za]], 0.75);
      poly([[xb, y1, za], [xb, y1, zb], [xb, yr, z]], 0.75);
      poly([[xa, g, za], [xb, g, za], [xb, y1, za], [xa, y1, za]], 0.9);
      for (let i = 0; i < wins; i++) {
        const u0 = xa + w * (i + 0.25) / wins, u1 = xa + w * (i + 0.75) / wins;
        const q = poly([[u0, g + h * 0.35, za], [u1, g + h * 0.35, za], [u1, g + h * 0.75, za], [u0, g + h * 0.75, za]], lit > 0 ? 0.9 : 0.4, 0.7);
        lightRect(q, lit);
      }
      poly([[xa - e, y1 - 0.004, za - e], [xb + e, y1 - 0.004, za - e], [xb + e, yr, z], [xa - e, yr, z]], 0.95, 1.1);
      line([xa - e, y1 - 0.009, za - e], [xb + e, y1 - 0.009, za - e], 0.45, 0.8);
      return { g, y1, yr };
    };

    // ---- the cable: carrying rope and, a little lower, the haul rope, both with a smooth sag
    for (const [drop, a, w] of [[0.012, 0.28, 0.8], [0, 0.7, 1.2]]) {
      const pts = [];
      for (let i = 0; i <= 240; i++) { const c = cableAt(i / 240, drop), q = P(c.x, c.y, c.z); if (q) pts.push(q); }
      if (pts.length > 1) { curve(pts); ctx.strokeStyle = `rgba(243,237,225,${a})`; ctx.lineWidth = w; ctx.stroke(); }
    }

    // ---- the tower in the middle: two tapering legs with cross braces, a saddle on top,
    // a light that comes on when the cabin passes
    {
      const s = stations[1], g = height(s.x, s.z) - 0.01, top = s.y + s.entry, on = t >= 0.49;
      const L = (y, k) => [s.x + k * (0.03 - 0.02 * (y - g) / (top - g)), y, s.z];   // a leg at height y (k = -1 / 1)
      line(L(g, -1), L(top - 0.006, -1), 0.85, 1.1); line(L(g, 1), L(top - 0.006, 1), 0.85, 1.1);
      for (let i = 0; i < 4; i++) {
        const ya = g + (top - g) * i / 4, yb = g + (top - g) * (i + 1) / 4;
        line(L(ya, -1), L(yb, 1), 0.35, 0.6); line(L(ya, 1), L(yb, -1), 0.35, 0.6); line(L(yb, -1), L(yb, 1), 0.5, 0.7);
      }
      line([s.x - 0.03, top - 0.004, s.z], [s.x + 0.03, top - 0.004, s.z], 0.95, 1.4);
      const q = P(s.x, top, s.z);
      if (q && on) glow(q.x, q.y, 16, SOFT, 0.5);
    }

    // ---- the valley station, the summit station and the hut next to it, whose windows
    // light up at the end of the ride
    const s1 = stations[0], s3 = stations[2], lit = Math.max(0, Math.min(1, (p - 0.86) / 0.12));
    building(s1.x - 0.02, s1.z, 0.15, 0.09, 0.045, 0.04, 3, 0.35);
    building(s3.x + 0.015, s3.z, 0.12, 0.08, 0.04, 0.038, 2, t > 0.97 ? 0.5 : 0);
    building(s3.x + 0.19, s3.z + 0.03, 0.16, 0.1, 0.05, 0.045, 4, lit);

    // ---- the cabin: grip on the rope, hanger arm, a gondola with a tapered roof, a lit
    // window band with mullions
    const c = cableAt(t), a = P(c.x, c.y, c.z), b = P(c.x, c.y - 0.07, c.z);
    if (a && b) {
      const s = Math.max(16, 0.07 / a.d * f), wB = s * 1.05, hB = s * 1.05, x = b.x, y = b.y;
      ctx.strokeStyle = `rgb(${SOFT})`; ctx.lineWidth = 1.2;
      ctx.fillStyle = `rgb(${SOFT})`; ctx.fillRect(a.x - s * 0.14, a.y - s * 0.05, s * 0.28, s * 0.1);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, a.y + (y - a.y) * 0.55); ctx.lineTo(x + s * 0.12, y - s * 0.02); ctx.lineTo(x, y); ctx.stroke();
      ctx.beginPath();   // roof
      ctx.moveTo(x - wB * 0.3, y); ctx.lineTo(x + wB * 0.3, y); ctx.lineTo(x + wB * 0.48, y + hB * 0.16); ctx.lineTo(x - wB * 0.48, y + hB * 0.16); ctx.closePath();
      ctx.fillStyle = INK; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(x - wB * 0.5, y + hB * 0.16, wB, hB * 0.84, [s * 0.06, s * 0.06, s * 0.2, s * 0.2]);
      ctx.fillStyle = 'rgba(12,14,16,.96)'; ctx.fill(); ctx.stroke();
      glow(x, y + hB * 0.45, s * 0.6 + 14, WARM, 0.42);
      const wy = y + hB * 0.27, wh = hB * 0.36, wx = x - wB * 0.42, ww = wB * 0.84;
      ctx.fillStyle = `rgba(${WARM},.85)`; ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeStyle = 'rgba(12,14,16,.9)'; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); for (const k of [1 / 3, 2 / 3]) { ctx.moveTo(wx + ww * k, wy); ctx.lineTo(wx + ww * k, wy + wh); } ctx.stroke();
      ctx.strokeStyle = `rgba(${SOFT},.5)`; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x - wB * 0.44, y + hB * 0.8); ctx.lineTo(x + wB * 0.44, y + hB * 0.8); ctx.stroke();
    }
  }

  // ---- loop: only while the section is on screen; redraw only when progress or size changed
  const STATIONS = [0, 0.5, 1];   // ride progress at each link's station
  let running = false, last = -1, lastW = 0, lastH = 0;
  function frame() {
    if (!running) return;
    if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) { size(); lastW = W; lastH = H; last = -1; }
    const r = ride.getBoundingClientRect();
    // the pin range: the stage's height, not innerHeight, which jumps as a phone's toolbar hides
    const p = Math.min(1, Math.max(0, -r.top / (r.height - stage.offsetHeight)));
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
      ride.classList.toggle('ride--top', p > 0.9);
    }
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
    else if (!e.isIntersecting) running = false;
  }).observe(ride);
})();
