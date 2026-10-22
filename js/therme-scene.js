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
    '<p class="ride__dots" aria-hidden="true"><span>01</span><span>02</span><span>03</span></p>' +
    '<a class="btn btn--gold ride__cta"></a></div>';
  const cta = ride.querySelector('.ride__cta');
  cta.href = chain.dataset.cta || '#check';
  cta.textContent = chain.dataset.ctaLabel || 'Sichtbarkeit prüfen';
  chain.before(ride);
  const stage = ride.firstElementChild;
  stage.insertBefore(chain, stage.querySelector('.ride__dots'));
  chain.classList.add('chain--ride');
  items[0].classList.add('is-active');
  const canvas = stage.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const dots = [...stage.querySelectorAll('.ride__dots span')];

  // gold for the land, a pale blue for the water (the blue hour), warm for light, white mist
  const INK = '#0c0e0d', GOLD = '198,164,92', SOFT = '230,212,168', WARM = '232,182,96', WATER = '150,192,210', STEAM = '214,226,230';
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
    const w = Math.exp(-((x - PX - 0.12) ** 2 / (2 * 0.62 ** 2) + (z - PZ - 0.08) ** 2 / (2 * 0.36 ** 2)));
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
  // the pavilion behind the pool: a thin flat roof slab, a glass front, a slatted side
  const VX0 = PX + 0.08, VX1 = PX + 0.62, VZ0 = PZ + PW / 2 + 0.06, VZ1 = VZ0 + 0.2, VH = 0.085;
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
  let P = null, f = 0;
  const Pv = v => P(v[0], v[1], v[2]);
  const seg = (A, B, a, w = 1, rgb = SOFT) => { const s = Pv(A), t = Pv(B); if (!s || !t) return; ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke(); };
  const poly = vs => { const q = vs.map(Pv); if (q.some(v => !v)) return null; ctx.beginPath(); q.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y))); ctx.closePath(); return q; };
  const boxOf = q => [Math.min(...q.map(v => v.x)), Math.max(...q.map(v => v.x)), Math.max(...q.map(v => v.y))];
  // the rows in front must hide an object's foot: they fill down to its lowest point
  const raise = (box, cols) => { if (!box) return; for (let k = Math.max(0, Math.floor(box[0] / COL)); k <= Math.min(cols - 1, Math.ceil(box[1] / COL)); k++) env[k] = Math.max(env[k], box[2]); };

  function draw(p) {
    const phone = Wd < 768, e = ease(p);
    // the camera: from high above the mountains' foot to in front of the pool, a little above it
    // (phones: pool and pavilion together in the screen's middle)
    const end = [PX + (phone ? -0.04 : 0.1), HP + 0.48, PZ - (phone ? 1.3 : 1.15)];
    const cam = { x: -0.15 + e * (end[0] + 0.15), y: 1.05 + e * (end[1] - 1.05), z: -1.3 + e * (end[2] + 1.3) };
    f = Math.min(Wd, Hd * 1.6) * (phone ? 0.95 : 0.66);
    const horizon = Hd * ((phone ? 0.3 : 0.42) - 0.08 * e), cx = Wd * (phone ? 0.5 : 0.64);
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
    // lights under the water come on one by one
    const lit = clamp((p - 0.15) / 0.6);
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
    const b = [[VX0, HP, VZ0], [VX1, HP, VZ0], [VX1, HP, VZ1], [VX0, HP, VZ1]];
    const t = b.map(([x, , z]) => [x, HP + VH, z]);
    const front = poly([b[0], b[1], t[1], t[0]]); if (!front) return null;
    ctx.fillStyle = INK; ctx.fill();
    // the glass front: tall panes, lit warm from inside more and more
    const panes = 7, glowA = 0.15 + 0.35 * clamp((p - 0.1) / 0.5);
    for (let i = 0; i < panes; i++) {
      const xa = VX0 + 0.02 + (VX1 - VX0 - 0.04) * i / panes, xb = VX0 + 0.02 + (VX1 - VX0 - 0.04) * (i + 1) / panes - 0.006;
      const g = poly([[xa, HP + 0.008, VZ0], [xb, HP + 0.008, VZ0], [xb, HP + VH - 0.01, VZ0], [xa, HP + VH - 0.01, VZ0]]); if (!g) continue;
      const grad = ctx.createLinearGradient(0, g[2].y, 0, g[0].y);
      grad.addColorStop(0, `rgba(${WARM},${(glowA * 0.4).toFixed(3)})`); grad.addColorStop(1, `rgba(${WARM},${glowA.toFixed(3)})`);
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = `rgba(${WARM},.7)`; ctx.lineWidth = 0.6; ctx.stroke();
    }
    const side = poly([b[1], b[2], t[2], t[1]]);
    if (side) { ctx.fillStyle = INK; ctx.fill(); for (let i = 0; i <= 20; i++) { const z = VZ0 + (VZ1 - VZ0) * i / 20; seg([VX1, HP, z], [VX1, HP + VH, z], 0.35, 0.5); } }
    // the roof slab: thin, overhanging, its front edge in light
    const o = 0.05, r0 = [VX0 - o, HP + VH, VZ0 - o], r1 = [VX1 + o, HP + VH, VZ0 - o], r2 = [VX1 + o, HP + VH, VZ1 + o], r3 = [VX0 - o, HP + VH, VZ1 + o];
    const roof = poly([r0, r1, r2, r3]); if (roof) { ctx.fillStyle = INK; ctx.fill(); ctx.strokeStyle = `rgba(${SOFT},.85)`; ctx.lineWidth = 1; ctx.stroke(); }
    const dn = v => [v[0], v[1] + 0.012, v[2]];
    seg(dn(r0), dn(r1), 0.9, 1.1); seg(r0, dn(r0), 0.7); seg(r1, dn(r1), 0.7);
    seg(b[0], b[1], 0.8, 1);
    const m = P((VX0 + VX1) / 2, YW, VZ0 - 0.06); if (m) glow(m.x, m.y, 0.25 / m.d * f, WARM, 0.24 * glowA);
    return boxOf(front.concat(side || [], roof || []));
  }

  function steam(p) {
    // a fine mist that thickens through the scene and drifts as the visitor scrolls
    const amount = 0.35 + 0.65 * clamp(p / 0.8);
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
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
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
