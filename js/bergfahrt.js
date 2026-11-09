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
  // (the summits lower than before, so the line climbs at about 25°, not 40°: Nicky,
  // 2026-11-09, "not quite as steep")
  const height = (x, z) =>
    bump(x, z, -0.25, 1.1, 0.42, 0.72) + bump(x, z, 0.55, 1.4, 0.33, 0.5) +
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
  // (the line runs across the picture more than into it, so the summit and its hut are not
  // tiny in the distance)
  const stations = [[-1.6, 0.62], [-0.95, 0.84], [-0.33, 1.04]].map(([x, z], i) => ({ x, z, y: height(x, z) + 0.03, entry: [0.03, 0.075, 0.012][i] }));
  // what the fixed view frames: valley station, summit station and the hut beside it
  const [S0, , S2] = stations;
  const FRAME_PTS = [[S0.x - 0.1, S0.y - 0.04, S0.z], [S0.x + 0.1, S0.y + 0.09, S0.z],
    [S2.x - 0.06, S2.y + 0.12, S2.z], [S2.x + 0.12, S2.y + 0.12, S2.z], [S2.x + 0.12, S2.y - 0.03, S2.z]];
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
    // one fixed view of the whole line, framed by valley station, tower and summit hut: right
    // of the copy, its middle at the copy's height; the scroll only moves the cabin and the
    // camera a little forward, never up (Nicky, 2026-11-09)
    const base = { x: -0.95, y: 0.5, z: -0.75 };
    const box = c => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const v of FRAME_PTS) { const d = v[2] - c.z, x = (v[0] - c.x) / d, y = -(v[1] - c.y) / d; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return [x0, x1, y0, y1];
    };
    const b0 = box(base);
    const f = phone ? W * 0.86 / (b0[1] - b0[0]) : Math.min(W * 0.46 / (b0[1] - b0[0]), H * 0.66 / (b0[3] - b0[2]));
    const cam = { ...base, z: base.z + 0.15 * (1.0 - base.z) * ease(p) };
    const fb = box(cam);
    const cx = W * (phone ? 0.5 : 0.68) - f * (fb[0] + fb[1]) / 2, horizon = H * (phone ? 0.3 : 0.5) - f * (fb[2] + fb[3]) / 2;
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
    // an alpine building on the slope (Nicky, 2026-11-09: "a better effort with the huts"):
    // a stone base, timber walls in vertical boards, a roof with a deep overhang and barge
    // boards. ridge 'x': eaves to the front (the stations); ridge 'z': the gable to the front
    // with a balcony, as a mountain hut. The side the camera sees is drawn, not always the right
    const building = o => {
      const { x, z, w, d, h, rh, ridge, wins, lit } = o;
      const g = Math.min(height(x - w / 2, z - d / 2), height(x + w / 2, z - d / 2), height(x - w / 2, z + d / 2), height(x + w / 2, z + d / 2)) - 0.006;
      const xa = x - w / 2, xb = x + w / 2, za = z - d / 2, zb = z + d / 2, y1 = g + h, yr = y1 + rh, e = 0.014, base = g + h * 0.28;
      const sx = cam.x < x ? xa : xb, ox = sx === xa ? xb : xa;   // the side seen, the other one
      const boards = (u0, u1, yA, yB, n, a) => { for (let i = 1; i < n; i++) { const u = u0 + (u1 - u0) * i / n; line([u, yA(u), za], [u, yB(u), za], a, 0.5); } };
      const win = (u0, u1, ya, yb, l) => { const q = poly([[u0, ya, za], [u1, ya, za], [u1, yb, za], [u0, yb, za]], l > 0 ? 0.9 : 0.45, 0.7); lightRect(q, l); if (q) line([(u0 + u1) / 2, ya, za], [(u0 + u1) / 2, yb, za], 0.5, 0.6, l > 0 ? '20,18,16' : SOFT); };
      if (ridge === 'x') {
        poly([[sx, g, za], [sx, g, zb], [sx, y1, zb], [sx, yr, z], [sx, y1, za]], 0.75);
        poly([[xa, g, za], [xb, g, za], [xb, y1, za], [xa, y1, za]], 0.9);
        line([xa, base, za], [xb, base, za], 0.55, 0.8);
        boards(xa, xb, () => base, () => y1, Math.round(w / 0.009), 0.16);
        for (let i = 0; i < wins; i++) win(xa + w * (i + 0.22) / wins, xa + w * (i + 0.78) / wins, base + (y1 - base) * 0.22, base + (y1 - base) * 0.8, lit);
        const r = [[xa - e, y1 - 0.004, za - e], [xb + e, y1 - 0.004, za - e], [xb + e, yr, z], [xa - e, yr, z]];
        poly(r, 0.95, 1.1);
        for (let i = 1; i < 24; i++) { const u = xa - e + (w + 2 * e) * i / 24; line([u, y1 - 0.004, za - e], [u, yr, z], 0.14, 0.5); }
        line([xa - e, y1 - 0.009, za - e], [xb + e, y1 - 0.009, za - e], 0.45, 0.8);
      } else {
        poly([[sx, g, za], [sx, g, zb], [sx, y1, zb], [sx, y1, za]], 0.75);
        for (let i = 1; i < 5; i++) { const zz = za + d * i / 5; line([sx, base, zz], [sx, y1, zz], 0.18, 0.5); }
        poly([[xa, g, za], [xb, g, za], [xb, y1, za], [x, yr, za], [xa, y1, za]], 0.95);
        line([xa, base, za], [xb, base, za], 0.55, 0.8);
        const top = u => y1 + (yr - y1) * (1 - Math.abs(u - x) / (w / 2));
        boards(xa, xb, () => base, top, Math.round(w / 0.008), 0.16);
        // ground floor: door in the middle, a window each side; upstairs: two windows behind
        // the balcony; the gable: a small lit window
        win(xa + w * 0.1, xa + w * 0.3, base + 0.006, y1 - h * 0.42, lit);
        win(xb - w * 0.3, xb - w * 0.1, base + 0.006, y1 - h * 0.42, lit);
        const dq = poly([[x - w * 0.08, g, za], [x + w * 0.08, g, za], [x + w * 0.08, y1 - h * 0.4, za], [x - w * 0.08, y1 - h * 0.4, za]], 0.85, 0.8); lightRect(dq, lit * 0.8);
        win(xa + w * 0.18, xa + w * 0.4, y1 - h * 0.3, y1 - 0.004, lit);
        win(xb - w * 0.4, xb - w * 0.18, y1 - h * 0.3, y1 - 0.004, lit);
        win(x - w * 0.06, x + w * 0.06, y1 + rh * 0.2, y1 + rh * 0.55, lit);
        // the balcony across the front: a dark balustrade of close balusters, a handrail
        const yb = y1 - h * 0.34, yt = yb + h * 0.2, out = 0.02;
        const bq = poly([[xa - 0.006, yb, za - out], [xb + 0.006, yb, za - out], [xb + 0.006, yt, za - out], [xa - 0.006, yt, za - out]], 0.85, 0.9);
        if (bq) { for (let i = 1; i < 28; i++) { const u = xa - 0.006 + (w + 0.012) * i / 28; line([u, yb, za - out], [u, yt, za - out], 0.4, 0.5); } }
        line([xa - 0.006, yb - 0.004, za - out], [xb + 0.006, yb - 0.004, za - out], 0.6, 0.8);
        // the roof: the far plane, then the near one, each with rafters and a barge board
        for (const s of [ox, sx]) {
          const ex = s === xa ? xa - e : xb + e;
          const pl = [[ex, y1 - 0.004, za - e], [ex, y1 - 0.004, zb + e], [x, yr + 0.004, zb + e], [x, yr + 0.004, za - e]];
          if (!poly(pl, 0.9, 1.1)) continue;
          for (let i = 1; i < 10; i++) { const zz = za - e + (d + 2 * e) * i / 10; line([ex, y1 - 0.004, zz], [x, yr + 0.004, zz], 0.14, 0.5); }
          line([ex, y1 - 0.01, za - e], [x, yr - 0.002, za - e], 0.5, 0.8);
        }
        // a chimney through the roof, with a thread of smoke
        if (o.chimney) {
          const cxm = x + (sx === xa ? -1 : 1) * w * 0.22, cz = z + d * 0.15, ch = (yr - y1) * (1 - 0.44) + y1;
          poly([[cxm - 0.006, ch - 0.01, cz], [cxm + 0.006, ch - 0.01, cz], [cxm + 0.006, yr + 0.02, cz], [cxm - 0.006, yr + 0.02, cz]], 0.85, 0.9);
          const s0 = P(cxm, yr + 0.022, cz);
          if (s0) { ctx.strokeStyle = 'rgba(236,214,162,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.bezierCurveTo(s0.x + 6, s0.y - 10, s0.x - 4, s0.y - 18, s0.x + 8, s0.y - 30); ctx.stroke(); }
        }
        // a terrace in front: its edge and a low railing
        const tz = za - 0.05;
        line([xa - 0.03, g + 0.002, tz], [xb + 0.03, g + 0.002, tz], 0.5, 0.8);
        line([xa - 0.03, g + 0.016, tz], [xb + 0.03, g + 0.016, tz], 0.35, 0.6);
        for (let i = 0; i <= 8; i++) { const u = xa - 0.03 + (w + 0.06) * i / 8; line([u, g + 0.002, tz], [u, g + 0.016, tz], 0.35, 0.6); }
      }
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
    // (the picture stands still: the hut is lit from the start, only the cabin moves)
    const s1 = stations[0], s3 = stations[2];
    building({ x: s1.x - 0.02, z: s1.z, w: 0.16, d: 0.09, h: 0.05, rh: 0.042, ridge: 'x', wins: 4, lit: 0.4 });
    building({ x: s3.x + 0.015, z: s3.z, w: 0.12, d: 0.08, h: 0.045, rh: 0.04, ridge: 'x', wins: 3, lit: 0.4 });
    // (the hut beside it is gone: Nicky, 2026-11-09, "weird roof, remove it")

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
    // the stage pins at its sticky top (the band sits in the middle of the screen)
    const p = Math.min(1, Math.max(0, ((parseFloat(getComputedStyle(stage).top) || 0) - r.top) / (r.height - stage.offsetHeight)));
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
