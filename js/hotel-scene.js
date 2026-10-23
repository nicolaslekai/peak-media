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
    '<p class="ride__dots" aria-hidden="true"><span>01</span><span>02</span><span>03</span></p>' +
    '<a class="btn btn--gold ride__cta"></a></div>';
  const cta = ride.querySelector('.ride__cta');
  cta.href = chain.dataset.cta || '#rechner';
  cta.textContent = chain.dataset.ctaLabel || 'Potenzial berechnen';
  chain.before(ride);
  const stage = ride.firstElementChild;
  stage.insertBefore(chain, stage.querySelector('.ride__dots'));
  chain.classList.add('chain--ride');
  items[0].classList.add('is-active');
  const canvas = stage.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const dots = [...stage.querySelectorAll('.ride__dots span')];

  const INK = '#0c0e0d', GOLD = '198,164,92', SOFT = '230,212,168', WARM = '232,182,96';
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

  // ---- the hotel in its own frame (u along the long side, v across), turned by TH: three
  // floors of glass bays behind vertical larch slats, balconies, a low gable roof
  const TH = 0.42, W = 0.6, D = 0.2, FL = 0.05, FLOORS = 3, ROOF = 0.075, EAVE = 0.045;
  const Y0 = HB, YT = HB + FL * FLOORS;
  const at = (u, v, y) => [BX + u * Math.cos(TH) - v * Math.sin(TH), y, BZ + u * Math.sin(TH) + v * Math.cos(TH)];
  const WALLS = [
    { a: [-W / 2, -D / 2], d: [1, 0], L: W, bays: 9 },
    { a: [W / 2, -D / 2], d: [0, 1], L: D, bays: 3 },
    { a: [W / 2, D / 2], d: [-1, 0], L: W, bays: 9 },
    { a: [-W / 2, D / 2], d: [0, -1], L: D, bays: 3 },
  ];
  for (const w of WALLS) w.order = Array.from({ length: FLOORS * w.bays }, rnd);   // when each window lights up
  // the rows under the hotel's footprint are drawn after it, so it stands on the ground
  const ZMIN = BZ - (W / 2 * Math.sin(TH) + D / 2 * Math.cos(TH)) - EAVE;
  const HOTEL_ROW = Math.max(0, Math.floor((ZMIN - Z0) / (Z1 - Z0) * (ROWS - 1)));

  // ---- the guests' road: from the valley up to the entrance, two rows of points (its edges)
  // that the scroll lays down one by one, and a faint centre line
  const START = [0.12, 0.5], ENTRY = at(0.05, -D / 2 - 0.07, 0), C1 = [0.5, 0.66], C2 = [-0.2, 0.8];
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
    cam = { x: -0.5 + e * (end[0] + 0.5), y: 1.0 + e * (end[1] - 1.0), z: -1.3 + e * (end[2] + 1.3) };
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

    // walls far to near, only the ones facing the camera
    const walls = WALLS.map(w => {
      const A = [w.a[0], w.a[1]], B = [w.a[0] + w.d[0] * w.L, w.a[1] + w.d[1] * w.L];
      const mid = at((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, Y0);
      return { ...w, A, B, dist: Math.hypot(mid[0] - cam.x, mid[2] - cam.z) };
    }).sort((a, b) => b.dist - a.dist);
    const ends = [];
    for (const w of walls) {
      const q = quad([at(...w.A, Y0), at(...w.B, Y0), at(...w.B, YT), at(...w.A, YT)]);
      if (!q || area(q) > 0) continue;
      grow(q);
      if (w.bays === 3) ends.push(Math.sign(w.A[0]));
      ctx.fillStyle = INK; ctx.fill();
      const pt = (s, y) => at(w.A[0] + w.d[0] * s, w.A[1] + w.d[1] * s, y);
      const near = clamp(1.6 - w.dist), bw = w.L / w.bays;
      // glass bays: lit ones warm behind a mullion, the rest a hairline frame
      for (let fl = 0; fl < FLOORS; fl++) for (let b = 0; b < w.bays; b++) {
        const s0 = bw * b + bw * 0.18, s1 = bw * (b + 1) - bw * 0.18, ya = Y0 + FL * fl + FL * 0.12, yb = Y0 + FL * (fl + 1) - FL * 0.1;
        const g = quad([pt(s0, ya), pt(s1, ya), pt(s1, yb), pt(s0, yb)]); if (!g) continue;
        const on = lit > w.order[fl * w.bays + b];
        if (on) {
          const grad = ctx.createLinearGradient(0, g[3].y, 0, g[0].y);
          grad.addColorStop(0, `rgba(${WARM},.1)`); grad.addColorStop(1, `rgba(${WARM},.42)`);
          ctx.fillStyle = grad; ctx.fill();
          glow((g[0].x + g[2].x) / 2, (g[0].y + g[2].y) / 2, Math.hypot(g[2].x - g[0].x, g[2].y - g[0].y) * 1.1, WARM, 0.16);
          seg(pt((s0 + s1) / 2, ya), pt((s0 + s1) / 2, yb), 0.75, 0.6, WARM);
          quad([pt(s0, ya), pt(s1, ya), pt(s1, yb), pt(s0, yb)]);
        }
        ctx.strokeStyle = `rgba(${on ? WARM : GOLD},${on ? 0.9 : 0.28})`; ctx.lineWidth = 0.7; ctx.stroke();
      }
      // vertical larch slats over the whole wall
      const n = Math.round(w.L / 0.0075);
      for (let i = 0; i <= n; i++) { const s = w.L * i / n; seg(pt(s, Y0), pt(s, YT), (0.14 + 0.26 * near).toFixed(3), 0.45); }
      for (let fl = 0; fl <= FLOORS; fl++) seg(pt(0, Y0 + FL * fl), pt(w.L, Y0 + FL * fl), 0.85, fl === 0 || fl === FLOORS ? 1.1 : 0.9);
      if (w.bays > 3) for (let fl = 1; fl < FLOORS; fl++) {   // balconies with glass rails on the long sides
        const out = 0.028, nU = w.d[1], nV = -w.d[0];
        const ptO = (s, y) => at(w.A[0] + w.d[0] * s + nU * out, w.A[1] + w.d[1] * s + nV * out, y);
        const ys = Y0 + FL * fl, yr = ys + FL * 0.42;
        seg(ptO(0, ys), ptO(w.L, ys), 0.7, 0.9); seg(ptO(0, yr), ptO(w.L, yr), 0.55, 0.8);
        seg(pt(0, ys), ptO(0, ys), 0.6, 0.8); seg(pt(w.L, ys), ptO(w.L, ys), 0.6, 0.8);
        for (let i = 0; i <= w.bays; i++) seg(ptO(bw * i, ys), ptO(bw * i, yr), 0.4, 0.6);
      }
      seg(pt(0, Y0), pt(0, YT), 0.9, 1.1); seg(pt(w.L, Y0), pt(w.L, YT), 0.9, 1.1);
    }
    // the gable walls of the visible ends, slatted like the walls
    const ru = W / 2 + EAVE, rv = D / 2 + EAVE, YR = YT + ROOF, YG = YT + ROOF * (D / 2) / rv;
    for (const s of ends) {
      const u = s * W / 2; if (!quad([at(u, -D / 2, YT), at(u, D / 2, YT), at(u, 0, YG)])) continue;
      ctx.fillStyle = INK; ctx.fill();
      for (let i = 1; i < 26; i++) { const v = -D / 2 + D * i / 26; seg(at(u, v, YT), at(u, v, YT + (YG - YT) * (1 - Math.abs(v) / (D / 2))), 0.3, 0.45); }
      seg(at(u, -D / 2, YT), at(u, 0, YG), 0.7, 0.9); seg(at(u, D / 2, YT), at(u, 0, YG), 0.7, 0.9);
    }
    // the roof: a low gable with a deep overhang, rafters on the visible plane
    for (const pl of [
      [at(-ru, -rv, YT), at(ru, -rv, YT), at(ru, 0, YR), at(-ru, 0, YR)],
      [at(ru, rv, YT), at(-ru, rv, YT), at(-ru, 0, YR), at(ru, 0, YR)],
    ]) {
      const q = quad(pl); if (!q || area(q) > 0) continue;
      ctx.fillStyle = INK; ctx.fill();
      for (let i = 0; i <= 40; i++) { const t = i / 40; seg(pl[0].map((v, k) => v + (pl[1][k] - v) * t), pl[3].map((v, k) => v + (pl[2][k] - v) * t), 0.16, 0.5); }
      seg(pl[0], pl[1], 0.95, 1.2); seg(pl[3], pl[2], 0.9, 1.1); seg(pl[0], pl[3], 0.8, 1); seg(pl[1], pl[2], 0.8, 1);
      const dn = v => [v[0], v[1] - 0.007, v[2]]; seg(dn(pl[0]), dn(pl[1]), 0.5, 0.8);
    }
    // from afar: one point of light where the house is
    const far = clamp(1 - p / 0.22), c = Pv(at(0, -D / 2, YT));
    if (c && far > 0) glow(c.x, c.y, 30, WARM, 0.75 * far);
    // the rows in front must hide the hotel's foot: they fill down to its lowest point
    if (maxY > -Infinity) for (let k = Math.max(0, Math.floor(minX / COL)); k <= Math.min(cols - 1, Math.ceil(maxX / COL)); k++) env[k] = Math.max(env[k], maxY);
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
