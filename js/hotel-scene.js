/* ============ BLAUE STUNDE — hotel scene: the evidence chain as the way to the house ============
   On Hotels & Resorts (D-77): the three links of <ol class="chain"> become the stations of a
   scene drawn in gold lines on a <canvas>, like the Bergfahrt (js/bergfahrt.js): a valley in
   topographic ridgelines, a slatted alpine hotel on its shoulder and a dotted road that the
   scroll lays down from the valley to the entrance, with guests travelling up it. The camera
   moves from the valley to the house; its windows light up as the scroll goes on ("the house
   fills"). Each station shows its link (.is-active), the calculator CTA appears at the end.
   Reuses the Bergfahrt's markup and CSS (.ride, .chain--ride). Without JS or with reduced
   motion the list stays as it is. Own file: an error here cannot stop the scroll engine.
   ================================================================================================ */
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
  cta.href = chain.dataset.cta || '#rechner';
  cta.textContent = chain.dataset.ctaLabel || 'Potenzial berechnen';
  chain.before(ride);
  const stage = ride.firstElementChild;
  stage.insertBefore(chain, cta);   // no 01-03 progress on the right any more (Nicky, 2026-11-09)
  chain.classList.add('chain--ride');
  items[0].classList.add('is-active');
  const canvas = stage.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const INK = '#10141A', GOLD = '209,168,81', SOFT = '236,214,162', WARM = '232,182,96';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = u => u * u * (3 - 2 * u);
  const bump = (x, z, cx, cz, s, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // fixed, so every visit looks the same

  // ---- terrain: a valley in front, the hotel on a shoulder, mountains behind; flattened
  // around the house so it stands level
  const BX = 0.2, BZ = 1.15;
  const raw = (x, z) =>
    0.42 * clamp((z - 0.55) / 1.1) +
    bump(x, z, -1.0, 2.4, 0.55, 1.15) + bump(x, z, 0.5, 2.75, 0.55, 1.35) + bump(x, z, 1.7, 2.3, 0.5, 1.0) +
    bump(x, z, -2.0, 1.8, 0.45, 0.6) +
    0.025 * Math.sin(x * 8 + z * 3) * Math.cos(z * 5);
  const HB = raw(BX, BZ);
  const height = (x, z) => { const w = Math.exp(-((x - BX) ** 2 + (z - BZ) ** 2) / (2 * 0.3 ** 2)); return raw(x, z) * (1 - w) + HB * w; };
  const COLS = 150, ROWS = 60, X0 = -3, X1 = 3, Z0 = 0.05, Z1 = 3.6;
  const ridges = [];
  for (let r = 0; r < ROWS; r++) {
    const z = Z0 + (Z1 - Z0) * (r / (ROWS - 1)), row = [];
    for (let c = 0; c <= COLS; c++) { const x = X0 + (X1 - X0) * (c / COLS); row.push([x, height(x, z), z]); }
    ridges.push(row);
  }

  // ---- the hotel in its own frame (u along the long side, v across), turned by TH: an alpine
  // house (Nicky, 2026-11-09: "less blocky, more mountain hotel"): a stone base, two floors of
  // larch slats with wooden balconies all round, a steeper gable roof with chimneys, and a
  // cross gable over the entrance that stands out of the front with its own roof and balcony
  const TH = 0.42, W = 0.6, D = 0.2, FL = 0.05, FLOORS = 3, ROOF = 0.09, EAVE = 0.045;
  const CW = 0.15, PJ = 0.045, CE = 0.03;   // cross gable: width, how far it stands out, roof overhang
  const Y0 = HB, YT = HB + FL * FLOORS;
  const at = (u, v, y) => [BX + u * Math.cos(TH) - v * Math.sin(TH), y, BZ + u * Math.sin(TH) + v * Math.cos(TH)];
  const WALLS = [
    { a: [-W / 2, -D / 2], d: [1, 0], L: W, bays: 9, front: true },
    { a: [W / 2, -D / 2], d: [0, 1], L: D, bays: 3 },
    { a: [W / 2, D / 2], d: [-1, 0], L: W, bays: 9 },
    { a: [-W / 2, D / 2], d: [0, -1], L: D, bays: 3 },
  ];
  // the cross gable's walls: its front with the entrance and a balcony on the top floor, its sides
  const CWALLS = [
    { a: [-CW / 2, -D / 2 - PJ], d: [1, 0], L: CW, bays: 2, door: true, balc: [2] },
    { a: [-CW / 2, -D / 2], d: [0, -1], L: PJ, bays: 1, balc: [] },
    { a: [CW / 2, -D / 2 - PJ], d: [0, 1], L: PJ, bays: 1, balc: [] },
  ];
  for (const w of [...WALLS, ...CWALLS]) w.order = Array.from({ length: FLOORS * w.bays }, rnd);   // when each window lights up
  // the rows under the hotel's footprint are drawn after it, so it stands on the ground
  const ZMIN = BZ - (W / 2 * Math.sin(TH) + (D / 2 + PJ) * Math.cos(TH)) - EAVE;
  const HOTEL_ROW = Math.max(0, Math.floor((ZMIN - Z0) / (Z1 - Z0) * (ROWS - 1)));

  // ---- the guests' road: from the valley up to the entrance, two rows of points (its edges)
  // that the scroll lays down one by one, and a faint centre line
  const START = [0.12, 0.5], ENTRY = at(0, -D / 2 - PJ - 0.035, 0), C1 = [0.5, 0.66], C2 = [-0.2, 0.8];
  const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  const ROAD = [];
  for (let i = 0, N = 150; i <= N; i++) {
    const t = i / N;
    ROAD.push({ x: bez(START[0], C1[0], C2[0], ENTRY[0], t), z: bez(START[1], C1[1], C2[1], ENTRY[2], t) });
  }
  ROAD.forEach((r, i) => {
    const a = ROAD[Math.max(0, i - 1)], b = ROAD[Math.min(ROAD.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * 0.014, nz = dx / l * 0.014;
    r.edges = [[r.x + nx, r.z + nz], [r.x - nx, r.z - nz]].map(([x, z]) => [x, height(x, z) + 0.003, z]);
    r.mid = [r.x, height(r.x, r.z) + 0.006, r.z];
  });

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
  let P = null, cam = null, f = 0;
  const Pv = v => P(v[0], v[1], v[2]);

  function draw(p) {
    const phone = Wd < 768, e = ease(p);
    // the camera: from high above the valley to in front of the house, a little above its roof
    // (phones: straight in front of the house, which sits in the screen's middle)
    // (wide screens: the house to the right of the stations' copy)
    const end = at(phone ? -0.65 : -0.62, phone ? -1.45 : -1.25, YT + 0.17);
    // the start: lower and straight in line with the house, so it begins nearer the middle of
    // the picture, not at the bottom right (Nicky, 2026-11-09)
    const SX = 0.1, SY = 0.72, SZ = -1.3;
    cam = { x: SX + e * (end[0] - SX), y: SY + e * (end[1] - SY), z: SZ + e * (end[2] - SZ) };
    f = Math.min(Wd, Hd * 1.6) * (phone ? 0.95 : 0.66);
    const horizon = Hd * (phone ? 0.3 : 0.42), cx = Wd * (phone ? 0.5 : 0.64);
    P = (x, y, z) => { const d = z - cam.z; return d <= 0.04 ? null : { x: cx + (x - cam.x) / d * f, y: horizon - (y - cam.y) / d * f, d }; };

    ctx.fillStyle = INK; ctx.fillRect(0, 0, Wd, Hd);
    // ridgelines back to front; each fills, in the page colour, only the band between itself and
    // the lowest line drawn so far (env), which hides what lies behind (see bergfahrt.js)
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
      if (r === HOTEL_ROW) hotel(p, cols);
    }
    road(p);
  }

  function hotel(p, cols) {
    const lit = clamp((p - 0.2) / 0.7);
    const seg = (A, B, a, w = 1, rgb = SOFT) => { const s = Pv(A), t = Pv(B); if (!s || !t) return; ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke(); };
    const quad = vs => { const q = vs.map(Pv); if (q.some(v => !v)) return null; ctx.beginPath(); q.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y))); ctx.closePath(); return q; };
    const area = q => q.reduce((s, v, i) => { const w = q[(i + 1) % q.length]; return s + v.x * w.y - w.x * v.y; }, 0);
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;   // the hotel's screen box, for env
    const grow = q => { for (const v of q) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y); } };
    const dn = v => [v[0], v[1] - 0.007, v[2]];
    const rv = D / 2 + EAVE, k = ROOF / rv;   // the roof's overhang across and its pitch (rise per run)
    const warm = (g, a0, a1) => {   // a lit pane: warm gradient and a soft glow
      const grad = ctx.createLinearGradient(0, g[3].y, 0, g[0].y);
      grad.addColorStop(0, `rgba(${WARM},${a0})`); grad.addColorStop(1, `rgba(${WARM},${a1})`);
      ctx.fillStyle = grad; ctx.fill();
      glow((g[0].x + g[2].x) / 2, (g[0].y + g[2].y) / 2, Math.hypot(g[2].x - g[0].x, g[2].y - g[0].y) * 1.1, WARM, 0.16);
    };
    const byDist = list => list.map(w => {
      const A = [w.a[0], w.a[1]], B = [w.a[0] + w.d[0] * w.L, w.a[1] + w.d[1] * w.L];
      const mid = at((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, Y0);
      return { w, A, B, dist: Math.hypot(mid[0] - cam.x, mid[2] - cam.z) };
    }).sort((a, b) => b.dist - a.dist);

    // one wall, if it faces the camera: stone base, windows, larch slats above the base,
    // floor lines, wooden balconies (o.balc: the floors; o.gap: a stretch without), a door
    function wall({ w, A, B, dist }, o) {
      const q = quad([at(...A, Y0), at(...B, Y0), at(...B, YT), at(...A, YT)]);
      if (!q || area(q) > 0) return false;
      grow(q);
      ctx.fillStyle = INK; ctx.fill();
      const pt = (s, y) => at(A[0] + w.d[0] * s, A[1] + w.d[1] * s, y);
      const nU = w.d[1], nV = -w.d[0];   // outward
      const ptO = (s, y, out) => at(A[0] + w.d[0] * s + nU * out, A[1] + w.d[1] * s + nV * out, y);
      const near = clamp(1.6 - dist), bw = w.L / w.bays, L = w.L;
      // stone base: four courses with staggered joints
      for (let r = 0; r < 4; r++) {
        const y0 = Y0 + FL * r / 4, y1 = Y0 + FL * (r + 1) / 4;
        if (r) seg(pt(0, y0), pt(L, y0), (0.12 + 0.12 * near).toFixed(3), 0.5);
        for (let s = (r % 2) * 0.011 + 0.011; s < L; s += 0.022) seg(pt(s, y0), pt(s, y1), (0.08 + 0.1 * near).toFixed(3), 0.45);
      }
      // windows: wide ones in the base, French windows above (the balconies cover their foot)
      for (let fl = 0; fl < FLOORS; fl++) for (let b = 0; b < w.bays; b++) {
        if (o.door && fl === 0) continue;
        const m = fl ? 0.2 : 0.14;
        const s0 = bw * b + bw * m, s1 = bw * (b + 1) - bw * m;
        const ya = Y0 + FL * fl + FL * (fl ? 0.06 : 0.2), yb = Y0 + FL * (fl + 1) - FL * 0.12;
        const g = quad([pt(s0, ya), pt(s1, ya), pt(s1, yb), pt(s0, yb)]); if (!g) continue;
        const on = lit > w.order[fl * w.bays + b];
        if (on) {
          warm(g, 0.1, 0.42);
          seg(pt((s0 + s1) / 2, ya), pt((s0 + s1) / 2, yb), 0.75, 0.6, WARM);
          quad([pt(s0, ya), pt(s1, ya), pt(s1, yb), pt(s0, yb)]);
        } else { ctx.fillStyle = INK; ctx.fill(); }
        ctx.strokeStyle = `rgba(${on ? WARM : GOLD},${on ? 0.9 : 0.3})`; ctx.lineWidth = 0.7; ctx.stroke();
        if (!fl) seg(pt(s0 - bw * 0.04, ya - 0.003), pt(s1 + bw * 0.04, ya - 0.003), 0.55, 0.8);   // stone sill
      }
      // vertical larch slats on the timber floors
      const n = Math.round(L / 0.0075);
      for (let i = 0; i <= n; i++) { const s = L * i / n; seg(pt(s, Y0 + FL), pt(s, YT), (0.12 + 0.24 * near).toFixed(3), 0.45); }
      for (let fl = 0; fl <= FLOORS; fl++) seg(pt(0, Y0 + FL * fl), pt(L, Y0 + FL * fl), 0.85, fl === 0 || fl === 1 || fl === FLOORS ? 1.1 : 0.8);
      // the entrance: a lit double door under a small canopy
      if (o.door) {
        const s0 = L * 0.3, s1 = L * 0.7, yb = Y0 + FL * 0.78;
        const g = quad([pt(s0, Y0), pt(s1, Y0), pt(s1, yb), pt(s0, yb)]);
        if (g) {
          warm(g, 0.22, 0.6);
          ctx.strokeStyle = `rgba(${WARM},.95)`; ctx.lineWidth = 0.8; quad([pt(s0, Y0), pt(s1, Y0), pt(s1, yb), pt(s0, yb)]); ctx.stroke();
          seg(pt((s0 + s1) / 2, Y0), pt((s0 + s1) / 2, yb), 0.8, 0.6, WARM);
        }
        const c0 = s0 - 0.012, c1 = s1 + 0.012, yc = yb + 0.012;
        seg(ptO(c0, yc - 0.004, 0.026), ptO(c1, yc - 0.004, 0.026), 0.9, 1);
        seg(pt(c0, yc + 0.004), ptO(c0, yc - 0.004, 0.026), 0.7, 0.8); seg(pt(c1, yc + 0.004), ptO(c1, yc - 0.004, 0.026), 0.7, 0.8);
        seg(pt(c0, yc + 0.004), pt(c1, yc + 0.004), 0.7, 0.8);
      }
      // wooden balconies: a dark balustrade of close balusters, a handrail, a fascia board below
      for (const fl of o.balc || []) {
        const out = 0.03, ys = Y0 + FL * fl, yr = ys + FL * 0.46;
        const runs = o.gap ? [[0, o.gap[0]], [o.gap[1], L]] : [[0, L]];
        for (const [r0, r1] of runs) {
          if (r1 - r0 < 0.01) continue;
          if (quad([ptO(r0, ys, out), ptO(r1, ys, out), ptO(r1, yr, out), ptO(r0, yr, out)])) { ctx.fillStyle = 'rgba(16,20,26,.62)'; ctx.fill(); }
          const nb = Math.round((r1 - r0) / 0.0055);
          for (let i = 1; i < nb; i++) { const s = r0 + (r1 - r0) * i / nb; seg(ptO(s, ys, out), ptO(s, yr, out), (0.22 + 0.22 * near).toFixed(3), 0.5); }
          seg(ptO(r0, yr, out), ptO(r1, yr, out), 0.9, 1.1);
          seg(ptO(r0, ys, out), ptO(r1, ys, out), 0.8, 1);
          seg(ptO(r0, ys - 0.007, out), ptO(r1, ys - 0.007, out), 0.5, 0.8);
          for (const s of [r0, r1]) { seg(pt(s, ys), ptO(s, ys, out), 0.6, 0.8); seg(pt(s, yr), ptO(s, yr, out), 0.6, 0.8); }
        }
      }
      seg(pt(0, Y0), pt(0, YT), 0.9, 1.1); seg(pt(L, Y0), pt(L, YT), 0.9, 1.1);
      return true;
    }

    // the main house: walls far to near, balconies all round except where the cross gable stands
    const ends = [];
    for (const it of byDist(WALLS)) {
      const gap = it.w.front ? [W / 2 - CW / 2 - 0.004, W / 2 + CW / 2 + 0.004] : null;
      if (wall(it, { balc: [1, 2], gap }) && it.w.bays === 3) ends.push(Math.sign(it.A[0]));
    }
    // the gable walls of the visible ends, slatted, with two attic windows
    const ru = W / 2 + EAVE, YR = YT + ROOF, YG = YT + ROOF * (D / 2) / rv;
    for (const s of ends) {
      const u = s * W / 2; const tq = quad([at(u, -D / 2, YT), at(u, D / 2, YT), at(u, 0, YG)]); if (!tq) continue;
      ctx.fillStyle = INK; ctx.fill(); grow(tq);
      for (let i = 1; i < 26; i++) { const v = -D / 2 + D * i / 26; seg(at(u, v, YT), at(u, v, YT + (YG - YT) * (1 - Math.abs(v) / (D / 2))), 0.3, 0.45); }
      for (const v0 of [-0.032, 0.012]) {
        const g = quad([at(u, v0, YT + 0.01), at(u, v0 + 0.02, YT + 0.01), at(u, v0 + 0.02, YT + 0.032), at(u, v0, YT + 0.032)]); if (!g) continue;
        if (lit > 0.55) warm(g, 0.1, 0.4); else { ctx.fillStyle = INK; ctx.fill(); }
        ctx.strokeStyle = `rgba(${lit > 0.55 ? WARM : GOLD},.8)`; ctx.lineWidth = 0.7; ctx.stroke();
      }
      seg(at(u, -D / 2, YT), at(u, 0, YG), 0.7, 0.9); seg(at(u, D / 2, YT), at(u, 0, YG), 0.7, 0.9);
    }
    // the main roof: a steeper gable with a deep overhang, rafters, a ridge cap and barge boards
    for (const pl of [
      [at(-ru, -rv, YT), at(ru, -rv, YT), at(ru, 0, YR), at(-ru, 0, YR)],
      [at(ru, rv, YT), at(-ru, rv, YT), at(-ru, 0, YR), at(ru, 0, YR)],
    ]) {
      const q = quad(pl); if (!q || area(q) > 0) continue;
      ctx.fillStyle = INK; ctx.fill(); grow(q);
      for (let i = 0; i <= 48; i++) { const t = i / 48; seg(pl[0].map((v, j) => v + (pl[1][j] - v) * t), pl[3].map((v, j) => v + (pl[2][j] - v) * t), 0.15, 0.5); }
      seg(pl[0], pl[1], 0.95, 1.2); seg(pl[3], pl[2], 0.95, 1.4); seg(pl[0], pl[3], 0.85, 1.1); seg(pl[1], pl[2], 0.85, 1.1);
      seg(dn(pl[0]), dn(pl[1]), 0.5, 0.8); seg(dn(pl[0]), dn(pl[3]), 0.45, 0.7); seg(dn(pl[1]), dn(pl[2]), 0.45, 0.7);
    }
    // two chimneys on the front roof plane (their -u and front faces face the camera)
    const roofY = v => YT + ROOF * (1 - Math.abs(v) / rv);
    for (const [u0, v0] of [[-0.19, -0.045], [0.2, -0.06]]) {
      const c = 0.009, ul = u0 - c, ur = u0 + c, vf = v0 - c, vb = v0 + c, yt = YR + 0.028;
      const faces = [
        [at(ul, vb, roofY(vb)), at(ul, vf, roofY(vf)), at(ul, vf, yt), at(ul, vb, yt)],
        [at(ul, vf, roofY(vf)), at(ur, vf, roofY(vf)), at(ur, vf, yt), at(ul, vf, yt)],
      ];
      for (const f of faces) { const q = quad(f); if (!q) continue; ctx.fillStyle = INK; ctx.fill(); ctx.strokeStyle = `rgba(${SOFT},.8)`; ctx.lineWidth = 0.9; ctx.stroke(); grow(q); }
      for (let i = 1; i < 4; i++) { const y = roofY(vf) + (yt - roofY(vf)) * i / 4; seg(at(ul, vf, y), at(ur, vf, y), 0.3, 0.5); }
      const e = 0.003;   // the cap
      if (quad([at(ul - e, vf - e, yt), at(ur + e, vf - e, yt), at(ur + e, vb + e, yt), at(ul - e, vb + e, yt)])) { ctx.fillStyle = INK; ctx.fill(); ctx.strokeStyle = `rgba(${SOFT},.9)`; ctx.lineWidth = 1; ctx.stroke(); }
    }

    // the cross gable over the entrance: its walls, then its roof planes (far one, gable
    // triangle, near one), whose back edges run into the main roof along the valleys
    for (const it of byDist(CWALLS)) wall(it, { balc: it.w.balc, door: it.w.door });
    const vF = -D / 2 - PJ, cw = CW / 2 + CE, vf = vF - CE, YCR = YT + k * cw, vS = -rv * (1 - (YCR - YT) / ROOF), ap = YT + k * CW / 2;
    const planes = [-1, 1].map(sg => ({ sg, pl: [at(sg * cw, vf, YT), at(sg * cw, -rv, YT), at(0, vS, YCR), at(0, vf, YCR)] }))
      .map(o => { const m = at(o.sg * cw / 2, (vf + vS) / 2, YT); return { ...o, dist: Math.hypot(m[0] - cam.x, m[2] - cam.z) }; })
      .sort((a, b) => b.dist - a.dist);
    const crossRoof = ({ sg, pl }) => {
      const q = quad(pl); if (!q) return;
      ctx.fillStyle = INK; ctx.fill(); grow(q);
      for (let i = 1, N = 16; i < N; i++) {   // rafters, down the fall line
        const v = vf + (vS - vf) * i / N;
        const t = (v + rv) / (vS + rv);
        const from = v <= -rv ? at(sg * cw, v, YT) : at(sg * cw * (1 - t), v, YT + t * (YCR - YT));
        seg(from, at(0, v, YCR), 0.16, 0.5);
      }
      seg(pl[0], pl[1], 0.95, 1.2); seg(pl[1], pl[2], 0.7, 0.9); seg(pl[2], pl[3], 0.95, 1.4); seg(pl[3], pl[0], 0.95, 1.2);
      seg(dn(pl[3]), dn(pl[0]), 0.5, 0.8);
    };
    crossRoof(planes[0]);
    const tri = quad([at(-CW / 2, vF, YT), at(CW / 2, vF, YT), at(0, vF, ap)]);
    if (tri && area(tri) <= 0) {
      ctx.fillStyle = INK; ctx.fill(); grow(tri);
      for (let i = 1; i < 18; i++) { const u = -CW / 2 + CW * i / 18; seg(at(u, vF, YT), at(u, vF, YT + (ap - YT) * (1 - Math.abs(u) / (CW / 2))), 0.3, 0.45); }
      const g = quad([at(-0.014, vF, YT + 0.008), at(0.014, vF, YT + 0.008), at(0.014, vF, YT + 0.03), at(-0.014, vF, YT + 0.03)]);
      if (g) {
        if (lit > 0.35) warm(g, 0.12, 0.5); else { ctx.fillStyle = INK; ctx.fill(); }
        ctx.strokeStyle = `rgba(${lit > 0.35 ? WARM : GOLD},.85)`; ctx.lineWidth = 0.7; ctx.stroke();
        seg(at(0, vF, YT + 0.008), at(0, vF, YT + 0.03), 0.6, 0.5, lit > 0.35 ? WARM : GOLD);
      }
      seg(at(-CW / 2, vF, YT), at(0, vF, ap), 0.7, 0.9); seg(at(CW / 2, vF, YT), at(0, vF, ap), 0.7, 0.9);
    }
    crossRoof(planes[1]);

    // from afar: one point of light where the house is
    const far = clamp(1 - p / 0.22), c = Pv(at(0, vF, YT));
    if (c && far > 0) glow(c.x, c.y, 30, WARM, 0.75 * far);
    // the rows in front must hide the hotel's foot: they fill down to its lowest point
    if (maxY > -Infinity) for (let j = Math.max(0, Math.floor(minX / COL)); j <= Math.min(cols - 1, Math.ceil(maxX / COL)); j++) env[j] = Math.max(env[j], maxY);
  }

  function road(p) {
    const built = clamp((p - 0.04) / 0.84), n = ROAD.length - 1, head = built * n;
    for (let i = 0; i <= Math.min(n, Math.floor(head)); i++) {
      const fresh = clamp((head - i) / 6);   // the newest points grow in
      for (const e of ROAD[i].edges) {
        const q = Pv(e); if (!q) continue;
        const r = Math.max(0.55, Math.min(2.2, 0.004 / q.d * f * 0.35));
        ctx.fillStyle = `rgba(${SOFT},${(0.75 * fresh).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(q.x, q.y, r * (0.4 + 0.6 * fresh), 0, Math.PI * 2); ctx.fill();
      }
      if (i % 3 === 0) {
        const q = Pv(ROAD[i].mid); if (!q) continue;
        ctx.fillStyle = `rgba(${GOLD},${(0.35 * fresh).toFixed(3)})`; ctx.fillRect(q.x - 0.5, q.y - 0.5, 1, 1);
      }
    }
    if (built > 0 && built < 1) {   // the light that lays the road
      const q = Pv(ROAD[Math.round(head)].mid);
      if (q) { glow(q.x, q.y, 18, WARM, 0.6); ctx.fillStyle = `rgb(${SOFT})`; ctx.beginPath(); ctx.arc(q.x, q.y, 2.2, 0, Math.PI * 2); ctx.fill(); }
    }
    for (let k = 0; k < 5; k++) {   // guests travelling up the part already built
      const t = ((p * 2.2 + k / 5) % 1) * built;
      if (t <= 0.01 || built < 0.08) continue;
      const q = Pv(ROAD[Math.round(t * n)].mid); if (!q) continue;
      glow(q.x, q.y, 9, WARM, 0.5); ctx.fillStyle = `rgba(${WARM},.95)`; ctx.beginPath(); ctx.arc(q.x, q.y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- loop: only while the section is on screen; redraw only when progress or size changed
  // (the same timing as the Bergfahrt, so both pages feel alike)
  const STATIONS = [0, 0.5, 1];
  let running = false, last = -1, lastW = 0, lastH = 0;
  function frame() {
    if (!running) return;
    if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) { size(); lastW = Wd; lastH = Hd; last = -1; }
    const r = ride.getBoundingClientRect();
    // the pin range: the stage's height, not innerHeight, which jumps as a phone's toolbar hides
    const p = Math.min(1, Math.max(0, -r.top / (r.height - stage.offsetHeight)));
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
