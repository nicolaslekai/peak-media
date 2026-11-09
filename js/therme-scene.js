/* ============ BLAUE STUNDE — thermal-bath scene: the bath's year as a descent to the water ============
   On Wellness & Thermen (D-80): the three links of <ol class="chain"> become the stations of a
   scene drawn in lines and points on a <canvas>, like the Bergfahrt and the hotel scene: high
   mountains in gold ridgelines, a terrace with an outdoor thermal pool (the water in fine pale
   blue lines, rippling with the scroll), a glass pavilion behind it and steam rising from the
   water as a mist of points. The camera comes down from the mountains to the pool; the lights
   under the water come on one by one, the pavilion fills with warm light, the steam thickens.
   Reuses the Bergfahrt's markup and CSS (.ride, .chain--ride) and its hidden-line envelope.
   Without JS or with reduced motion the list stays. Own file: an error here cannot stop the
   scroll engine.
   ======================================================================================================= */
(() => {
  const chain = document.querySelector('.chain');
  if (!chain || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [...chain.children];
  if (items.length !== 3) return;

  // ---- markup: tall section > pinned stage > canvas + the list + progress + CTA (as bergfahrt.js)
  const ride = document.createElement('div');
  ride.className = 'ride';
  ride.innerHTML =
    '<div class="ride__stage"><canvas aria-hidden="true"></canvas>' +
    '<a class="btn btn--gold ride__cta"></a></div>';
  const cta = ride.querySelector('.ride__cta');
  cta.href = chain.dataset.cta || '#check';
  cta.textContent = chain.dataset.ctaLabel || 'Sichtbarkeit prüfen';
  chain.before(ride);
  const stage = ride.firstElementChild;
  stage.insertBefore(chain, cta);   // no 01-03 progress on the right any more (Nicky, 2026-11-09)
  chain.classList.add('chain--ride');
  items[0].classList.add('is-active');
  const canvas = stage.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // gold for the land, a pale blue for the water (the blue hour), warm for light, white mist
  const INK = '#10141A', GOLD = '209,168,81', SOFT = '236,214,162', WARM = '232,182,96', WATER = '150,192,210', STEAM = '214,226,230';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = u => u * u * (3 - 2 * u);
  const bump = (x, z, cx, cz, s, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // fixed, so every visit looks the same

  // ---- terrain: high mountains behind, a level terrace for the pool and the pavilion
  const PX = 0.25, PZ = 0.95;
  const raw = (x, z) =>
    0.3 * clamp((z - 0.4) / 1.0) +
    bump(x, z, -1.1, 2.3, 0.5, 1.45) + bump(x, z, 0.3, 2.7, 0.55, 1.7) + bump(x, z, 1.6, 2.25, 0.5, 1.3) +
    bump(x, z, -2.1, 1.7, 0.45, 0.8) + bump(x, z, 2.4, 1.6, 0.4, 0.7) +
    0.03 * Math.sin(x * 9 + z * 3) * Math.cos(z * 6);
  const HP = raw(PX, PZ);
  const height = (x, z) => {
    const w = Math.exp(-((x - PX) ** 2 / (2 * 0.62 ** 2) + (z - PZ - 0.16) ** 2 / (2 * 0.45 ** 2)));
    return raw(x, z) * (1 - w) + HP * w;
  };
  const COLS = 150, ROWS = 60, X0 = -3, X1 = 3, Z0 = 0.05, Z1 = 3.6;
  const ridges = [];
  for (let r = 0; r < ROWS; r++) {
    const z = Z0 + (Z1 - Z0) * (r / (ROWS - 1)), row = [];
    for (let c = 0; c <= COLS; c++) { const x = X0 + (X1 - X0) * (c / COLS); row.push([x, height(x, z), z]); }
    ridges.push(row);
  }

  // ---- the pool: a long rounded basin across the view, the water just below the rim
  const PL = 0.95, PW = 0.34, RAD = 0.12, YW = HP - 0.008;
  const halfAt = z => {   // half the pool's width in x at depth z (rounded corners)
    const dz = Math.abs(z - PZ); if (dz > PW / 2) return -1;
    const inner = PW / 2 - RAD; if (dz <= inner) return PL / 2;
    return PL / 2 - RAD + Math.sqrt(Math.max(0, RAD * RAD - (dz - inner) ** 2));
  };
  const RIM = [];
  for (let i = 0; i <= 120; i++) {
    const a = i / 120 * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a);
    RIM.push([PX + Math.sign(cx) * (PL / 2 - RAD) + RAD * cx, HP, PZ + Math.sign(cz) * (PW / 2 - RAD) + RAD * cz]);
  }
  const RIM_OUT = RIM.map(([x, y, z]) => [PX + (x - PX) * 1.04, y, PZ + (z - PZ) * 1.12]);
  const LIGHTS = Array.from({ length: 9 }, (_, i) => ({ x: PX - PL / 2 + 0.08 + (PL - 0.16) * i / 8, z: PZ - PW / 2 + 0.05, order: rnd() }));
  const STEAM_PTS = Array.from({ length: 900 }, () => {
    const z = PZ - PW / 2 + rnd() * PW, h = halfAt(z), x = PX - h + rnd() * 2 * h;
    return { x, z, ph: rnd(), sp: 0.6 + rnd() * 0.8, dr: rnd() * Math.PI * 2 };
  });
  // the bath house behind the pool, on the pool's axis (Nicky, 2026-11-09: "a much nicer house,
  // more architectural rigour, all centred"): a glazed ground floor on a regular column grid
  // under a thin roof slab, and a set-back upper floor in vertical timber with a ribbon window
  const VX0 = PX - 0.4, VX1 = PX + 0.4, VZ0 = PZ + PW / 2 + 0.07, VZ1 = VZ0 + 0.24, VH = 0.075;
  const UX0 = PX - 0.26, UX1 = PX + 0.26, UZ0 = VZ0 + 0.07, UH = 0.058;
  // what the fixed view frames: the pool's outer rim and the house's roofs
  const FRAME_PTS = [[PX - PL / 2 - 0.03, HP, PZ - PW / 2 - 0.03], [PX + PL / 2 + 0.03, HP, PZ - PW / 2 - 0.03],
    [VX0 - 0.035, HP + VH + 0.01, VZ0 - 0.035], [VX1 + 0.035, HP + VH + 0.01, VZ0 - 0.035], [PX, HP + VH + 0.02 + UH, UZ0]];
  const rowOf = z => Math.max(0, Math.floor((z - Z0) / (Z1 - Z0) * (ROWS - 1)));
  const PAV_ROW = rowOf(VZ0 - 0.02), POOL_ROW = rowOf(PZ - PW / 2 - 0.03);

  let Wd = 0, Hd = 0, dpr = 1;
  const BUDGET = 4.2e6;   // canvas pixels, as in the Bergfahrt
  function size() {
    Wd = canvas.clientWidth; Hd = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(BUDGET / Math.max(1, Wd * Hd)));
    canvas.width = Math.round(Wd * dpr); canvas.height = Math.round(Hd * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function glow(x, y, r, rgb, a) {
    if (a <= 0 || !(r > 0)) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }

  const COL = 8;                   // px between the columns of the hidden-line envelope
  let env = new Float32Array(0);   // per column: the lowest line drawn so far (screen y)
  let P = null, f = 0, cam = null;
  const Pv = v => P(v[0], v[1], v[2]);
  const seg = (A, B, a, w = 1, rgb = SOFT) => { const s = Pv(A), t = Pv(B); if (!s || !t) return; ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke(); };
  const poly = vs => { const q = vs.map(Pv); if (q.some(v => !v)) return null; ctx.beginPath(); q.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y))); ctx.closePath(); return q; };
  const boxOf = q => [Math.min(...q.map(v => v.x)), Math.max(...q.map(v => v.x)), Math.max(...q.map(v => v.y))];
  // the rows in front must hide an object's foot: they fill down to its lowest point
  const raise = (box, cols) => { if (!box) return; for (let k = Math.max(0, Math.floor(box[0] / COL)); k <= Math.min(cols - 1, Math.ceil(box[1] / COL)); k++) env[k] = Math.max(env[k], box[2]); };

  function draw(p) {
    const phone = Wd < 768;
    // one fixed view straight down the pool's axis, framed by pool and house: right of the
    // copy, its middle at the copy's height; the scroll moves the camera a little forward,
    // never up, and the water and the steam (Nicky, 2026-11-09)
    const base = { x: PX, y: HP + 0.46, z: PZ - 1.05 };
    const box = c => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const v of FRAME_PTS) { const d = v[2] - c.z, x = (v[0] - c.x) / d, y = -(v[1] - c.y) / d; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return [x0, x1, y0, y1];
    };
    const b0 = box(base);
    f = phone ? Wd * 0.84 / (b0[1] - b0[0]) : Math.min(Wd * 0.4 / (b0[1] - b0[0]), Hd * 0.56 / (b0[3] - b0[2]));
    cam = { ...base, z: base.z + 0.15 * (PZ - base.z) * ease(p) };
    const fb = box(cam);
    const horizon = Hd * (phone ? 0.3 : 0.5) - f * (fb[2] + fb[3]) / 2, cx = Wd * (phone ? 0.5 : 0.68) - f * (fb[0] + fb[1]) / 2;
    P = (x, y, z) => { const d = z - cam.z; return d <= 0.04 ? null : { x: cx + (x - cam.x) / d * f, y: horizon - (y - cam.y) / d * f, d }; };

    ctx.fillStyle = INK; ctx.fillRect(0, 0, Wd, Hd);
    const cols = Math.ceil(Wd / COL) + 2;
    if (env.length !== cols) env = new Float32Array(cols);
    env.fill(-1e4);
    for (let r = ROWS - 1; r >= 0; r--) {
      const pts = [];
      for (const [x, y, z] of ridges[r]) { const q = P(x, y, z); if (q) pts.push(q); }
      if (pts.length > 1) {
        const x0 = pts[0].x, x1 = pts.at(-1).x, n = pts.length - 1;
        const yAt = x => { const u = Math.min(n, Math.max(0, (x - x0) / (x1 - x0) * n)), i = Math.min(n - 1, Math.floor(u)); return pts[i].y + (pts[i + 1].y - pts[i].y) * (u - i); };
        const c0 = Math.max(0, Math.ceil(x0 / COL)), c1 = Math.min(cols - 1, Math.floor(x1 / COL));
        ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.lineTo(x1, Math.max(yAt(x1), env[Math.min(cols - 1, Math.round(x1 / COL))]) + 2);
        for (let c = c1; c >= c0; c--) ctx.lineTo(c * COL, Math.max(yAt(c * COL), env[c]) + 2);
        ctx.lineTo(x0, Math.max(yAt(x0), env[Math.max(0, Math.round(x0 / COL))]) + 2);
        ctx.closePath();
        ctx.fillStyle = INK; ctx.fill();
        for (let c = c0; c <= c1; c++) env[c] = Math.max(env[c], yAt(c * COL));
        ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        const near = 1 - r / ROWS;
        ctx.strokeStyle = `rgba(${GOLD},${(0.06 + 0.4 * near * near).toFixed(3)})`;
        ctx.lineWidth = 0.45 + near * 0.55; ctx.stroke();
      }
      if (r === PAV_ROW) raise(pavilion(p), cols);
      if (r === POOL_ROW) raise(pool(p), cols);
    }
    steam(p);
  }

  function pool(p) {
    const q = poly(RIM); if (!q) return null;
    ctx.fillStyle = INK; ctx.fill();
    // the water: fine lines across, rippling with the scroll; nearer lines brighter
    const n = 46;
    for (let k = 1; k < n; k++) {
      const z = PZ - PW / 2 + PW * k / n, h = halfAt(z); if (h <= 0) continue;
      ctx.beginPath(); let first = true;
      for (let i = 0; i <= 60; i++) {
        const x = PX - h + 2 * h * i / 60;
        const v = P(x, YW + 0.0016 * Math.sin(x * 38 + k * 0.9 + p * 14) * Math.cos(z * 22 + p * 6), z); if (!v) continue;
        if (first) ctx.moveTo(v.x, v.y); else ctx.lineTo(v.x, v.y);
        first = false;
      }
      const near = 1 - k / n;
      ctx.strokeStyle = `rgba(${WATER},${(0.12 + 0.35 * near).toFixed(3)})`; ctx.lineWidth = 0.5 + 0.4 * near; ctx.stroke();
    }
    // lights under the water (all on: the picture stands still, only the water moves)
    const lit = 1;
    for (const l of LIGHTS) {
      if (lit <= l.order) continue;
      const v = P(l.x, YW - 0.004, l.z); if (!v) continue;
      glow(v.x, v.y, 0.028 / v.d * f, WARM, 0.3);
      ctx.fillStyle = `rgba(${WARM},.9)`; ctx.fillRect(v.x - 1.2, v.y - 0.6, 2.4, 1.2);
    }
    // the stone rim: a double line; steps into the water at the near left
    ctx.strokeStyle = `rgba(${SOFT},.85)`; ctx.lineWidth = 1.1; poly(RIM); ctx.stroke();
    const qo = poly(RIM_OUT); ctx.strokeStyle = `rgba(${SOFT},.35)`; ctx.lineWidth = 0.7; ctx.stroke();
    for (let i = 0; i < 4; i++) { const x = PX - PL / 2 + 0.05 + i * 0.012; seg([x, HP, PZ - PW / 2 + 0.01], [x, HP, PZ - PW / 2 + 0.07], 0.5, 0.7); }
    return boxOf(q.concat(qo || []));
  }

  function pavilion(p) {
    const all = [], keep = q => { if (q) all.push(...q); return q; };
    const fill = (q, a = 0.85, w = 1) => { if (!q) return q; ctx.fillStyle = INK; ctx.fill(); ctx.strokeStyle = `rgba(${SOFT},${a})`; ctx.lineWidth = w; ctx.stroke(); return keep(q); };
    const warmPane = (q, a) => {
      if (!q) return;
      const grad = ctx.createLinearGradient(0, q[2].y, 0, q[0].y);
      grad.addColorStop(0, `rgba(${WARM},${(a * 0.45).toFixed(3)})`); grad.addColorStop(1, `rgba(${WARM},${a.toFixed(3)})`);
      ctx.fillStyle = grad; ctx.fill();
    };
    const y0 = HP, y1 = HP + VH, glowA = 0.5;
    // the side the camera sees (it stands on the axis, so mostly neither)
    const side = (x, za, zb, ya, yb, n) => {
      if (!fill(poly([[x, ya, za], [x, ya, zb], [x, yb, zb], [x, yb, za]]), 0.7)) return;
      for (let i = 1; i < n; i++) { const z = za + (zb - za) * i / n; seg([x, ya, z], [x, yb, z], 0.3, 0.5); }
    };
    if (cam.x < VX0) side(VX0, VZ0, VZ1, y0, y1, 18); else if (cam.x > VX1) side(VX1, VZ0, VZ1, y0, y1, 18);

    // ground floor: a regular grid of 10 bays, a column at every bay line, glass between,
    // a transom near the top, a stone plinth line at the foot
    fill(poly([[VX0, y0, VZ0], [VX1, y0, VZ0], [VX1, y1, VZ0], [VX0, y1, VZ0]]), 0.9, 1.1);
    const BAYS = 10, bw = (VX1 - VX0) / BAYS, tr = y0 + VH * 0.8;
    for (let i = 0; i < BAYS; i++) {
      const xa = VX0 + bw * i + 0.004, xb = VX0 + bw * (i + 1) - 0.004;
      warmPane(poly([[xa, y0 + 0.006, VZ0], [xb, y0 + 0.006, VZ0], [xb, y1 - 0.004, VZ0], [xa, y1 - 0.004, VZ0]]), glowA);
      seg([xa, tr, VZ0], [xb, tr, VZ0], 0.45, 0.6, WARM);
    }
    for (let i = 0; i <= BAYS; i++) { const x = VX0 + bw * i; seg([x, y0, VZ0], [x, y1, VZ0], 0.9, i % 5 === 0 ? 1.6 : 1.1); }
    seg([VX0, y0 + 0.006, VZ0], [VX1, y0 + 0.006, VZ0], 0.7, 1);
    // its roof slab: thin, overhanging on three sides, a fascia in light
    const o = 0.035, s0 = [VX0 - o, y1, VZ0 - o], s1 = [VX1 + o, y1, VZ0 - o], s2 = [VX1 + o, y1, VZ1], s3 = [VX0 - o, y1, VZ1];
    const up = v => [v[0], v[1] + 0.01, v[2]];
    fill(poly([s0, s1, up(s1), up(s0)]), 0.95, 1.2);
    fill(poly([up(s0), up(s1), up(s2), up(s3)]), 0.6, 0.8);

    // upper floor, set back: vertical timber, a ribbon window, its own slab
    const u0 = y1 + 0.01, u1 = u0 + UH;
    fill(poly([[UX0, u0, UZ0], [UX1, u0, UZ0], [UX1, u1, UZ0], [UX0, u1, UZ0]]), 0.9, 1.1);
    const n = Math.round((UX1 - UX0) / 0.007);
    for (let i = 1; i < n; i++) { const x = UX0 + (UX1 - UX0) * i / n; seg([x, u0, UZ0], [x, u1, UZ0], 0.22, 0.5); }
    const wa = u0 + UH * 0.32, wb = u0 + UH * 0.7;
    const rib = poly([[UX0 + 0.04, wa, UZ0], [UX1 - 0.04, wa, UZ0], [UX1 - 0.04, wb, UZ0], [UX0 + 0.04, wb, UZ0]]);
    if (rib) { ctx.fillStyle = INK; ctx.fill(); warmPane(rib, glowA * 0.9); ctx.strokeStyle = `rgba(${WARM},.85)`; ctx.lineWidth = 0.8; ctx.stroke(); }
    for (let i = 1; i < 8; i++) { const x = UX0 + 0.04 + (UX1 - UX0 - 0.08) * i / 8; seg([x, wa, UZ0], [x, wb, UZ0], 0.6, 0.6, '20,18,16'); }
    const o2 = 0.025, t0 = [UX0 - o2, u1, UZ0 - o2], t1 = [UX1 + o2, u1, UZ0 - o2], t2 = [UX1 + o2, u1, VZ1], t3 = [UX0 - o2, u1, VZ1];
    fill(poly([t0, t1, up(t1), up(t0)]), 0.95, 1.2);
    fill(poly([up(t0), up(t1), up(t2), up(t3)]), 0.6, 0.8);

    // the terrace between house and pool: a stone edge and three steps down to the pool deck
    seg([VX0 - 0.05, HP + 0.001, VZ0 - 0.05], [VX1 + 0.05, HP + 0.001, VZ0 - 0.05], 0.5, 0.8);
    const m = P(PX, YW, VZ0 - 0.06); if (m) glow(m.x, m.y, 0.3 / m.d * f, WARM, 0.2);
    return all.length ? boxOf(all) : null;
  }

  function steam(p) {
    // a fine mist that thickens through the scene and drifts as the visitor scrolls
    const amount = 0.8;
    STEAM_PTS.forEach((s, i) => {
      if (i / STEAM_PTS.length > amount) return;
      const t = (s.ph + p * s.sp * 1.6) % 1, hgt = 0.004 + t * 0.2;
      const v = P(s.x + Math.sin(s.dr + t * 5) * 0.025 * t, YW + hgt, s.z + 0.03 * t); if (!v) return;
      const a = Math.sin(Math.PI * t) * 0.32 * (1 - t * 0.4);
      ctx.fillStyle = `rgba(${STEAM},${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(v.x, v.y, Math.min(1.4, Math.max(0.45, 0.0016 / v.d * f * (0.6 + t))), 0, Math.PI * 2); ctx.fill();
    });
  }

  // ---- loop: only while the section is on screen; redraw only when progress or size changed
  // (the same timing as the Bergfahrt and the hotel scene)
  const STATIONS = [0, 0.5, 1];
  let running = false, last = -1, lastW = 0, lastH = 0;
  function frame() {
    if (!running) return;
    if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) { size(); lastW = Wd; lastH = Hd; last = -1; }
    const r = ride.getBoundingClientRect();
    // the pin range: the stage's height, not innerHeight, which jumps as a phone's toolbar hides
    // the stage pins at its sticky top (the band sits in the middle of the screen)
    const p = Math.min(1, Math.max(0, ((parseFloat(getComputedStyle(stage).top) || 0) - r.top) / (r.height - stage.offsetHeight)));
    if (Math.abs(p - last) > 0.0004) {
      draw(p); last = p;
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
