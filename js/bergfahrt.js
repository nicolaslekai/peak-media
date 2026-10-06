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
  const ride = document.createElement('div');
  ride.className = 'ride';
  ride.innerHTML =
    '<div class="ride__stage"><canvas aria-hidden="true"></canvas>' +
    '<p class="ride__dots" aria-hidden="true"><span>01</span><span>02</span><span>03</span></p>' +
    '<a class="btn btn--gold ride__cta" href="#rechner">Potenzial berechnen</a></div>';
  chain.before(ride);
  const stage = ride.firstElementChild;
  stage.insertBefore(chain, stage.querySelector('.ride__dots'));
  chain.classList.add('chain--ride');
  items[0].classList.add('is-active');
  const canvas = stage.querySelector('canvas');
  const ctx = canvas.getContext('2d');
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
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const INK = '#0c0e0d', GOLD = '198,164,92', SOFT = '230,212,168';
  function draw(p) {
    const phone = W < 768, t = cabinT(p);
    // the camera rises and moves towards the summit with the cabin
    const cam = { x: -0.15 - p * 0.25 + (phone ? -0.35 : 0.35), y: 0.55 + p * 0.45, z: -1.05 + p * 0.55 };
    const f = Math.min(W, H * 1.6) * 0.62, horizon = H * (phone ? 0.34 : 0.42) + p * 40, cx = W * (phone ? 0.5 : 0.8);
    const P = (x, y, z) => { const d = z - cam.z; return d <= 0.05 ? null : { x: cx + (x - cam.x) / d * f, y: horizon - (y - cam.y) / d * f, d }; };

    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
    // ridgelines back to front: fill below in the page colour (hides what is behind),
    // stroke in gold, fainter with depth
    for (let r = ROWS - 1; r >= 0; r--) {
      const pts = [];
      for (const [x, y, z] of ridges[r]) { const q = P(x, y, z); if (q) pts.push(q); }
      if (pts.length < 2) continue;
      ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.lineTo(pts.at(-1).x, H + 10); ctx.lineTo(pts[0].x, H + 10); ctx.closePath();
      ctx.fillStyle = INK; ctx.fill();
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
      ctx.beginPath(); ctx.arc(top.x, top.y, on ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = on ? `rgb(${SOFT})` : `rgba(${SOFT},.4)`;
      ctx.shadowColor = `rgb(${SOFT})`; ctx.shadowBlur = on ? 16 : 0; ctx.fill(); ctx.shadowBlur = 0;
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
      ctx.fillStyle = `rgba(230,180,90,${(0.15 + 0.8 * lit).toFixed(2)})`;
      ctx.shadowColor = '#e6b45a'; ctx.shadowBlur = 18 * lit;
      ctx.fillRect(hut.x - k * 0.35, hut.y - k * 0.65, k * 0.7, k * 0.45); ctx.shadowBlur = 0;
    }

    // cabin: hanger and a rounded glass body with a warm light inside
    const c = cableAt(t), a = P(c.x, c.y, c.z), b = P(c.x, c.y - 0.075, c.z);
    if (a && b) {
      const s = Math.max(10, 0.045 / a.d * f);
      ctx.strokeStyle = `rgb(${SOFT})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(b.x - s * 0.6, b.y, s * 1.2, s, s * 0.25);
      ctx.fillStyle = 'rgba(12,14,13,.95)'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(230,180,90,.85)'; ctx.shadowColor = '#e6b45a'; ctx.shadowBlur = 14;
      ctx.fillRect(b.x - s * 0.45, b.y + s * 0.2, s * 0.9, s * 0.45); ctx.shadowBlur = 0;
    }
  }

  // ---- loop: only while the section is on screen; redraw only when progress or size changed
  let running = false, last = -1, lastW = 0, lastH = 0;
  function frame() {
    if (!running) return;
    if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) { size(); lastW = W; lastH = H; last = -1; }
    const r = ride.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
    if (Math.abs(p - last) > 0.0004) {
      draw(p); last = p;
      const active = p < 0.25 ? 0 : p < 0.75 ? 1 : 2;
      items.forEach((li, i) => li.classList.toggle('is-active', i === active));
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
