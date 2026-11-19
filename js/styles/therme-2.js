/* ============ BLAUE STUNDE — style lab, Wellness scene, style 2: Tusche (ink) ============
   The thermal bath as a brush painting: pale and gold ink on the page's dark paper, the way
   gold ink sits on indigo washi. Sumi-e and the woodblock prints of the Alps (Yoshida, Hasui)
   meet a Bavarian bath house: mountains as washes that are bright at the crest and run out
   into mist (bokashi), ridge lines pulled with the side of a brush that runs dry, a lit hall
   with panes like shoji, rain as long straight lines, and a small red seal.

   How it is made
   - brush(): one stroke is a bundle of bristles along a path. Each bristle carries its own
     load of ink and skips where the stroke runs dry, so a stroke starts full and ends in
     streaks. Width follows pressure and tapers at both ends.
   - wash(): a few transparent layers of one shape, each with slightly different edges.
   - bokashi(): a wash under a ridge that fades downwards, column by column.
   Everything that stands still is painted once per size into one picture per station; a
   frame only blends those pictures and paints what moves (stars, water, steam, rain).
   All randomness is seeded, so every visit looks the same.
   ========================================================================================== */
(() => {
  if (!window.SceneStyles) return;
  SceneStyles.register({ id: 2, label: 'Tusche', create(canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const INK = '#10141A', INKRGB = '16,20,26', GOLD = '209,168,81', SOFT = '236,214,162', WARM = '236,186,104',
      WATER = '150,192,210', STEAM = '214,226,230', RAIN = '186,206,220', SEAL = '198,68,44';
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const ease = u => { u = clamp(u); return u * u * (3 - 2 * u); };
    const lerp = (a, b, u) => a + (b - a) * u;
    const rgba = (rgb, a) => `rgba(${rgb},${clamp(a).toFixed(3)})`;
    const mix = (a, b, u) => { const A = a.split(','), B = b.split(','); return A.map((v, i) => Math.round(lerp(+v, +B[i], u))).join(','); };
    // fixed randomness: a generator per subject, and noise that only depends on where it is asked
    const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const hash = (i, k) => { let h = Math.imul(i | 0, 374761393) + Math.imul(k | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const vnoise = (x, k) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i, k) * (1 - u) + hash(i + 1, k) * u; };
    const fbm = (x, k) => vnoise(x, k) * 0.5 + vnoise(x * 2.03, k + 7) * 0.3 + vnoise(x * 4.1, k + 13) * 0.2;

    // ---- the picture, in its own units: x from the bath's axis, y down from the ground line.
    // Ridges are set by hand, point by point, like a cut block; a little noise roughens them.
    const profile = pts => x => {
      if (x <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
      return pts[pts.length - 1][1];
    };
    // the logo's motif: two summits and the saddle between them, the bigger one on the left
    const MAINP = profile([[-400, 0], [-345, 18], [-300, 40], [-268, 54], [-244, 78], [-222, 90], [-204, 112], [-186, 122], [-168, 146], [-150, 170],
      [-136, 190], [-122, 204], [-110, 218], [-102, 224], [-94, 219], [-86, 206], [-76, 198], [-62, 192], [-48, 172], [-34, 158], [-18, 140], [2, 126],
      [24, 119], [40, 117], [54, 121], [66, 132], [78, 140], [90, 154], [104, 164], [118, 174], [130, 180], [140, 177], [152, 170], [164, 158],
      [180, 150], [196, 138], [218, 130], [240, 112], [266, 98], [294, 74], [330, 52], [372, 32], [430, 12], [480, 0]]);
    const FARP = profile([[-470, 0], [-430, 34], [-380, 70], [-330, 92], [-292, 102], [-250, 94], [-200, 80], [-140, 66], [0, 56], [180, 64],
      [228, 84], [262, 112], [290, 134], [312, 150], [324, 146], [344, 122], [372, 102], [396, 110], [412, 104], [450, 70], [500, 30], [540, 0]]);
    const NEARP = profile([[-340, 0], [-300, 12], [-250, 28], [-200, 38], [-150, 34], [-90, 42], [0, 40], [120, 38], [190, 44], [240, 52],
      [290, 40], [340, 22], [400, 4], [430, 0]]);
    const main = x => MAINP(x) + 7 * (fbm(x / 34, 3) - 0.5) + 2.4 * (vnoise(x / 6.5, 5) - 0.5);
    const far = x => FARP(x) + 6 * (fbm(x / 30, 8) - 0.5) + 2 * (vnoise(x / 7, 9) - 0.5);
    const near = x => NEARP(x) + 5 * (fbm(x / 40, 12) - 0.5);
    const SUN_X = 40, SUN_R = 30, SUN_Y = -(main(SUN_X) + 13);
    // the house: a glazed hall under a low gable, a timber wing on each side
    const HALL = 76, EAVE = 56, APEX = 80, WING = 178, WING_H = 38, BAYS = 7, PITCH = (APEX - EAVE) / HALL;
    const roofY = x => -APEX + Math.abs(x) * PITCH;
    // the pool: a basin seen from the front, wider towards us
    const POOL = { y0: 18, y1: 88, h0: 152, h1: 212 };
    const halfAt = y => lerp(POOL.h0, POOL.h1, (y - POOL.y0) / (POOL.y1 - POOL.y0));
    // the picture runs out towards the copy (left) and towards the right edge
    const FADE = [-400, -290, 345, 410];
    // what changes from station to station in the standing picture. faces: how bright the summits'
    // faces are (big summit left and right, small summit left): the light comes from the left at
    // the blue hour and out of the saddle when the sun stands there
    const BLUE = '124,166,198', AMBER = '216,152,80';
    const ST = [
      { sky: '86,130,170', skyA: 0.15, mtn: BLUE, mtnA: 0.3, ridge: SOFT, ridgeA: 0.8, far: WATER, farA: 0.13, tree: mix(STEAM, SOFT, 0.35), treeA: 0.56,
        faces: [0.3, 0.04, 0.24], win: 0.8, halo: 0.1, water: WATER, waterA: 0.15, lights: 0, mist: 0.045, sun: 0 },
      { sky: '92,120,150', skyA: 0.04, mtn: mix(BLUE, STEAM, 0.35), mtnA: 0.17, ridge: STEAM, ridgeA: 0.4, far: WATER, farA: 0.05, tree: mix(STEAM, SOFT, 0.3), treeA: 0.46,
        faces: [0.12, 0.02, 0.1], win: 1, halo: 0.22, water: mix(WATER, STEAM, 0.3), waterA: 0.13, lights: 0.5, mist: 0.09, sun: 0 },
      { sky: WARM, skyA: 0.06, mtn: mix(WARM, GOLD, 0.4), mtnA: 0.3, ridge: mix(GOLD, SOFT, 0.5), ridgeA: 0.88, far: mix(WARM, WATER, 0.35), farA: 0.13, tree: mix(SOFT, WARM, 0.35), treeA: 0.56,
        faces: [0.08, 0.36, 0.34], win: 0.88, halo: 0.12, water: mix(WATER, WARM, 0.4), waterA: 0.17, lights: 1, mist: 0.045, sun: 1 },
    ];

    // what moves: fixed lists, made once
    let r = rng(20);
    const STARS = [];
    while (STARS.length < 38) {
      const x = -250 + 640 * r() ** 0.8, y = -332 + 190 * r() ** 1.3, rad = 0.5 + 0.9 * r() ** 2.2;
      if (y < -(Math.max(main(x), far(x)) + 22)) STARS.push({ x, y, r: rad, ph: r() * 6.3, sp: 0.4 + r() * 0.9, a: (0.5 + 0.5 * r()) * ease((x + 290) / 90) });
    }
    r = rng(21);
    const PUFFS = Array.from({ length: 46 }, () => ({ x: (r() + r() - 1) * 150, y: 26 + r() * 44, ph: r(), sp: 0.6 + r() * 0.8, dr: r() * 6.3, v: Math.floor(r() * 3) }));
    const WISPS = Array.from({ length: 9 }, (_, i) => ({ x: [-34, 58, -96, 112, 8, -146, 150, -62, 86][i] + (r() - 0.5) * 10, y: 32 + r() * 22, h: 84 + r() * 50, amp: 5 + r() * 5,
      k: 5.5 + r() * 3, w: 0.5 + r() * 0.4, ph: r() * 6.3, sp: 0.16 + r() * 0.12, wd: 1.7 + r() * 1.1, lean: r() - 0.5 }));
    r = rng(22);
    const DROPS = Array.from({ length: 104 }, (_, i) => { const x = -300 + r() * 770; return { x, ph: r(), sp: 0.5 + r() * 0.34, len: 50 + r() * 80, k: i % 3 ? 0.2 : 0.155,
      top: -346 + r() * 20, end: 82 + r() * 26, b: x < -205 || x > 385 ? 2 : i % 2 }; });
    const RINGS = Array.from({ length: 10 }, () => ({ u: r(), v: r(), ph: r(), sp: 0.34 + r() * 0.3, g: r() * 6.3 }));
    const RIPPLES = Array.from({ length: 30 }, () => ({ u: r(), v: r() ** 0.8, ph: r() * 6.3, sp: 0.14 + r() * 0.2, len: 10 + r() * 20, v3: Math.floor(r() * 3) }));

    // ---- the view: px per unit and where the axis and the ground line are (device px)
    let V = null, S = 1, OX = 0, GY = 0, px = 1;
    let B = [null, null, null], scratch = null, clouds = null, dabs = null, puffs = null, PAPER = null;
    const CL = { x: -430, y: -348, w: 870, h: 262 };      // the clouds' own sheet, in units
    const DAB = { l: 24, h: 2.4 };                            // a brush dab for the water, in units
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

    function layout(W, H, dpr, phone) {
      // wide: the bath's axis at 70 % of the width, the picture at most half the width; phone: on top
      const s = phone ? Math.min(W / 470, H * 0.6 / 446) : Math.min(W * 0.5 / 640, H * 0.92 / 446);
      const ox = phone ? W * 0.5 : W * 0.7, gy = (phone ? H * 0.36 : H * 0.5) + 112 * s;
      return { W, H, dpr, phone, S: s * dpr, OX: ox * dpr, GY: gy * dpr, Wd: Math.round(W * dpr), Hd: Math.round(H * dpr) };
    }

    // ================= the brush =================
    // points at even steps along a path, with the direction across the stroke at each
    function resample(pts, step) {
      const m = pts.length, cl = [0]; let L = 0;
      for (let i = 1; i < m; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cl.push(L); }
      const n = Math.max(3, Math.ceil(L / step) + 1), X = new Float32Array(n), Y = new Float32Array(n), NX = new Float32Array(n), NY = new Float32Array(n);
      for (let i = 0, j = 1; i < n; i++) {
        const d = L * i / (n - 1); while (j < m - 1 && cl[j] < d) j++;
        const f = (d - cl[j - 1]) / Math.max(1e-6, cl[j] - cl[j - 1]);
        X[i] = lerp(pts[j - 1][0], pts[j][0], f); Y[i] = lerp(pts[j - 1][1], pts[j][1], f);
      }
      for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2), dx = X[b] - X[a], dy = Y[b] - Y[a], l = Math.hypot(dx, dy) || 1;
        NX[i] = -dy / l; NY[i] = dx / l;
      }
      return { n, X, Y, NX, NY, L };
    }

    /* one stroke. o: w (full width, units), rgb, a, tin/tout (how much of the length the brush
       takes to land and to lift), dry (how dry it ends), dryAt (from where), dry0 (dry all along),
       dryFn/press (u, x, y) for a hand-set course, side (1: the stroke hangs below its path, so
       the path is its crisp edge), load (1: that crisp edge carries the ink, the other is dry),
       wob (sideways wander, units), rough (how uneven the width), streak (length of dry streaks) */
    function brush(g, pts, o) {
      const w = Math.max(o.w, (o.min || 0.9) * px), k = o.k || 1;
      const P = resample(pts, Math.max(0.9 * px, Math.min(2.4, w * 0.6))), { n, X, Y, NX, NY, L } = P;
      const tin = o.tin == null ? 0.05 : o.tin, tout = o.tout == null ? 0.25 : o.tout, dry = o.dry || 0, dryAt = o.dryAt == null ? 0.4 : o.dryAt,
        rough = o.rough == null ? 1 : o.rough, streak = o.streak || 26;
      const HW = new Float32Array(n), DR = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        let p = 1; if (tin > 0) p *= Math.min(1, u / tin + 0.04) ** 0.6; if (tout > 0) p *= Math.min(1, (1 - u) / tout) ** 0.85;
        if (o.press) p *= o.press(u, X[i], Y[i]);
        p *= 1 + rough * 0.26 * (vnoise(u * L / 34, k + 5) - 0.5);
        HW[i] = 0.5 * w * p;
        DR[i] = (o.dryFn ? o.dryFn(u, X[i], Y[i]) : dry * ease((u - dryAt) / (1 - dryAt))) + (o.dry0 || 0);
      }
      for (let i = 0; i < n; i++) {
        const d = (o.wob ? o.wob * (fbm(i / (n - 1) * L / 70, k + 9) - 0.5) * 2 : 0) + (o.side || 0) * HW[i];
        X[i] += NX[i] * d; Y[i] += NY[i] * d;
      }
      const nb = Math.max(1, Math.min(o.nb || 30, Math.round(w / px / 1.4))), ds = L / (n - 1);
      g.fillStyle = `rgb(${o.rgb})`;
      for (let j = 0; j < nb; j++) {
        const c = nb === 1 ? 0 : -1 + (2 * j + 1) / nb, th = nb === 1 ? 1 : (1.5 + 0.8 * hash(j, k + 2)) / nb;      // bristles overlap: a wet stroke is solid
        let load = 0.5 + 0.5 * hash(j, k + 3);
        if (o.load) load *= 1 - 0.62 * (o.load > 0 ? (c + 1) / 2 : (1 - c) / 2);
        g.globalAlpha = 1 - (1 - clamp(o.a * (0.6 + 0.4 * load), 0, 0.985)) ** (nb === 1 ? 1 : 0.56);
        g.beginPath();
        for (let i = 0, i0 = -1; i <= n; i++) {
          const on = i < n && vnoise(i * ds / streak + j * 7.31, k + 11 + j) > DR[i] * (1.3 - 0.55 * load);
          if (on) { if (i0 < 0) i0 = i; continue; }
          if (i0 >= 0 && i - i0 > 1) {      // one inked run of this bristle, thinner at its two ends
            const i1 = i - 1;
            for (let q = i0; q <= i1; q++) { const e = Math.min(1, (q - i0 + 0.5) / 2, (i1 - q + 0.5) / 2), f = HW[q] * (c - th * e), x = X[q] + NX[q] * f, y = Y[q] + NY[q] * f; q === i0 ? g.moveTo(x, y) : g.lineTo(x, y); }
            for (let q = i1; q >= i0; q--) { const e = Math.min(1, (q - i0 + 0.5) / 2, (i1 - q + 0.5) / 2), f = HW[q] * (c + th * e); g.lineTo(X[q] + NX[q] * f, Y[q] + NY[q] * f); }
            g.closePath();
          }
          i0 = -1;
        }
        g.fill();
      }
      g.globalAlpha = 1;
    }
    const quad = (a, b, c, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return [v * v * a[0] + 2 * u * v * b[0] + u * u * c[0], v * v * a[1] + 2 * u * v * b[1] + u * u * c[1]]; });
    const along = (fn, xa, xb, step = 3) => { const p = []; for (let x = xa; x <= xb; x += step) p.push([x, -fn(x)]); return p; };

    // a wash: the same shape a few times, thin, each time with slightly different edges
    function wash(g, poly, fill, a, o = {}) {
      const layers = o.layers || 4, j = o.j == null ? 1.2 : o.j, k = o.k || 1, m = poly.length;
      g.fillStyle = fill; g.globalAlpha = 1 - (1 - Math.min(a, 0.985)) ** (1 / layers);
      for (let l = 0; l < layers; l++) {
        g.beginPath();
        for (let i = 0; i < m; i++) {
          const p = poly[i], q = poly[(i + 1) % m], s = k + l * 13;
          const x = p[0] + (hash(i, s) - 0.5) * 2 * j, y = p[1] + (hash(i, s + 5) - 0.5) * 2 * j;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
          g.lineTo((p[0] + q[0]) / 2 + (hash(i, s + 7) - 0.5) * j, (p[1] + q[1]) / 2 + (hash(i, s + 9) - 0.5) * j);
        }
        g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
    }

    // a wash under a ridge: full at the crest, gone some way below it (the mist at the foot)
    function bokashi(g, fn, xa, xb, rgb, aAt, depAt) {
      const cw = V.dpr >= 1.5 ? 2 : 1, gr = g.createLinearGradient(0, 0, 0, 1);
      gr.addColorStop(0, rgba(rgb, 1)); gr.addColorStop(0.1, rgba(rgb, 0.8)); gr.addColorStop(0.3, rgba(rgb, 0.46)); gr.addColorStop(0.6, rgba(rgb, 0.16)); gr.addColorStop(1, rgba(rgb, 0));
      g.fillStyle = gr;
      for (let X = Math.max(0, Math.floor(OX + xa * S)), XE = Math.min(V.Wd, OX + xb * S); X < XE; X += cw) {
        const x = (X + cw / 2 - OX) / S, a = aAt(x); if (a < 0.004) continue;
        g.setTransform(cw, 0, 0, depAt(x) * S, X, GY - fn(x) * S); g.globalAlpha = clamp(a); g.fillRect(0, 0, 1, 1);
      }
      g.globalAlpha = 1; g.setTransform(S, 0, 0, S, OX, GY);
    }
    function glow(g, x, y, rx, ry, rgb, a) {
      if (a < 0.004) return;
      g.save(); g.translate(x, y); g.scale(rx, ry);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, rgba(rgb, a)); gr.addColorStop(0.5, rgba(rgb, a * 0.42)); gr.addColorStop(1, rgba(rgb, 0));
      g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
    }
    function body(g, fn, xa, xb) {      // what a mountain hides: paper colour from its ridge to the ground
      g.beginPath(); g.moveTo(xa, 2);
      for (let x = xa; x <= xb; x += 3) g.lineTo(x, -fn(x));
      g.lineTo(xb, 2); g.closePath(); g.fillStyle = INK; g.fill();
    }

    // a level band of haze, as the old prints draw it: crisp along the top, thinning out below,
    // full in the middle and drawn out to a point at both ends
    function haze(g, x0, x1, y, th, a, k) {
      const top = [], bot = [], n = Math.round((x1 - x0) / 9);
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = lerp(x0, x1, u), e = Math.min(1, Math.sin(Math.PI * u) * 2.4) ** 0.7, yy = y + 2.2 * (fbm(x / 60, k) - 0.5) + (1 - e) * th * 0.35;
        top.push([x, yy]); bot.push([x, yy + th * e * (0.8 + 0.4 * fbm(x / 34, k + 3))]);
      }
      const fg = g.createLinearGradient(0, y - 2, 0, y + th + 2); fg.addColorStop(0, rgba(STEAM, 1)); fg.addColorStop(0.35, rgba(STEAM, 0.5)); fg.addColorStop(1, rgba(STEAM, 0.04));
      glow(g, (x0 + x1) / 2, y + th * 0.6, (x1 - x0) * 0.5, th * 1.5, STEAM, a * 0.22);
      wash(g, top.concat(bot.reverse()), fg, a, { layers: 4, j: 1.2, k });
      brush(g, top.slice(1, -1), { w: 1.6, rgb: STEAM, a: a * 1.5, side: 1, load: 1, tin: 0.25, tout: 0.35, dry: 0.8, dryAt: 0.3, dry0: 0.12, rough: 0.5, k: k + 1 });
    }

    // ================= the standing picture =================
    function sky(g, st, k) {
      // the last light low behind the mountains: a soft oval of colour, no edges anywhere
      glow(g, 16, -128, 450, 205, st.sky, st.skyA * 1.2);
      if (k === 0) glow(g, SUN_X, -128, 300, 150, st.sky, 0.09);
      if (k === 2) {
        // the evening sun in the saddle: a flat disc, cut by hand, its light around it
        glow(g, SUN_X, SUN_Y, 350, 240, WARM, 0.15); glow(g, SUN_X, SUN_Y, 120, 100, SOFT, 0.18);
        const pts = []; for (let i = 0; i < 60; i++) { const a = i / 60 * 6.2832, rr = SUN_R + 0.7 * (vnoise(i / 6, 41) - 0.5); pts.push([SUN_X + rr * Math.cos(a), SUN_Y + rr * Math.sin(a)]); }
        const sg = g.createLinearGradient(0, SUN_Y - SUN_R, 0, SUN_Y + SUN_R);
        sg.addColorStop(0, rgba(SOFT, 1)); sg.addColorStop(1, rgba(mix(SOFT, WARM, 0.75), 0.92));
        wash(g, pts, sg, 0.97, { layers: 2, j: 0.3, k: 43 });
      }
    }

    function mountains(g, st) {
      // far range: only a breath of colour and a thin dry line
      body(g, far, -470, 540);
      bokashi(g, far, -470, 540, st.far, x => st.farA * (0.8 + 0.4 * fbm(x / 70, 31)), x => Math.min(far(x), 46 + 40 * fbm(x / 80, 32)));
      brush(g, along(far, -372, -214), { w: 2.2, rgb: st.far, a: st.farA * 2.4, side: 1, load: 1, tin: 0.2, tout: 0.4, dry: 0.8, dryAt: 0.3, dry0: 0.15, k: 33 });
      brush(g, along(far, 262, 404), { w: 2.4, rgb: st.far, a: st.farA * 2.6, side: 1, load: 1, tin: 0.1, tout: 0.5, dry: 0.9, dryAt: 0.35, dry0: 0.1, k: 34 });

      // the massif: a wash from the crest down that is gone well above the valley, so the
      // mountain stands in mist and the bath in front of it
      body(g, main, -420, 480);
      const lift = x => clamp((main(x) - 62) / 120) ** 1.15;
      bokashi(g, main, -420, 480, st.mtn, x => st.mtnA * (0.22 + 0.78 * lift(x)) * (0.82 + 0.36 * fbm(x / 60, 21)), x => Math.min(main(x) * 0.9, (46 + 58 * fbm(x / 90, 22)) * (0.5 + 0.7 * lift(x))));
      // the summits' faces, cut like the planes of a woodblock: lit ones get a second, paler wash
      const face = (poly, y0, y1, a, k) => {
        if (a < 0.01) return;
        const fg = g.createLinearGradient(0, y0, 0, y1); fg.addColorStop(0, rgba(st.ridge, 1)); fg.addColorStop(0.5, rgba(st.ridge, 0.55)); fg.addColorStop(1, rgba(st.ridge, 0));
        wash(g, poly, fg, a, { j: 1.5, k });
      };
      face(along(main, -186, -102, 4).concat([[-108, -196], [-120, -168], [-138, -142], [-160, -120]]), -224, -114, st.faces[0], 51);
      face(along(main, -101, -10, 4).concat([[-24, -112], [-50, -126], [-66, -146], [-72, -170], [-90, -196]]), -224, -106, st.faces[1], 52);
      face(along(main, 62, 130, 4).concat([[124, -158], [116, -138], [98, -120], [76, -106]]), -180, -102, st.faces[2], 53);
      // rock: the arêtes that part the faces, and two dry strokes down the flanks
      const rock = (pts, a, k) => brush(g, pts, { w: 2.6, rgb: st.ridge, a: st.ridgeA * a, tin: 0.02, tout: 0.5, dry: 0.95, dryAt: 0.1, dry0: 0.14, streak: 15, wob: 0.8, k });
      rock([[-102, -222], [-108, -196], [-120, -168], [-138, -142], [-160, -120]], 0.42, 67);
      rock([[-101, -221], [-90, -196], [-72, -170], [-66, -146], [-50, -126], [-42, -108]], 0.56, 68);
      rock([[130, -178], [124, -158], [116, -138], [98, -120], [84, -104]], 0.5, 69);
      rock([[150, -168], [158, -146], [176, -126]], 0.26, 66);
      rock([[-146, -168], [-158, -142], [-178, -120]], 0.2, 65);
      // the ridge, in two strokes with the side of the brush: up to the big summit and off towards
      // the saddle, running dry; then, after a gap, the second summit. The saddle itself stays open.
      brush(g, along(main, -244, 8, 2.5), { w: 7.2, rgb: st.ridge, a: st.ridgeA, side: 1, load: 1, tin: 0.16, tout: 0.2, k: 71, streak: 19,
        press: (u, x) => 0.42 + 0.58 * Math.exp(-(((x + 102) / 60) ** 2)),
        dryFn: (u, x) => x < -102 ? 0.27 * (1 - Math.exp(-(((x + 102) / 44) ** 2))) : 0.22 + 0.9 * ease((x + 98) / 84) });
      brush(g, along(main, 64, 296, 2.5), { w: 6.4, rgb: st.ridge, a: st.ridgeA * 0.94, side: 1, load: 1, tin: 0.03, tout: 0.3, k: 72, streak: 19,
        press: (u, x) => 0.46 + 0.54 * Math.exp(-(((x - 130) / 56) ** 2)),
        dryFn: (u, x) => x < 130 ? 0.22 * (1 - Math.exp(-(((x - 130) / 38) ** 2))) : 0.24 + 0.9 * ease((x - 134) / 120) });
    }

    function fir(g, x, h, k, rgb, a) {
      const rr = rng(k), lean = (rr() - 0.5) * 0.06 * h;
      brush(g, [[x, 0], [x + lean * 0.35, -h * 0.5], [x + lean, -h]], { w: Math.max(1.1, h * 0.02), rgb, a: a * 0.85, tin: 0.02, tout: 0.5, wob: 0.5, k });
      const tiers = Math.round(h / 6.2);
      for (let i = 0; i < tiers; i++) {
        const f = (i + 0.7) / tiers, y = -h + f * h * 0.9, tx = x + lean * (1 - f);
        for (const d of [-1, 1]) {
          const len = h * (0.045 + 0.2 * f ** 0.85) * (0.72 + 0.56 * rr()), drop = len * (0.4 + 0.3 * rr()), al = a * (0.55 + 0.45 * rr());
          if (rr() < 0.08) continue;      // a branch left out here and there
          brush(g, quad([tx, y], [tx + d * len * 0.55, y + drop * 0.95], [tx + d * len, y + drop * 0.7], 6),
            { w: 1.5 + 3 * f, rgb, a: al, tin: 0.03, tout: 0.8, dry: 0.6, dryAt: 0.25, streak: 7, k: k + i * 2 + (d > 0 ? 1 : 0) });
        }
      }
    }

    function land(g, st) {
      // mist lying between the mountains and the bath: a band of haze across each foot
      haze(g, -336, -66, -76, 9, st.mist * 2.2, 81); haze(g, 112, 372, -88, 8, st.mist * 1.9, 83); glow(g, 20, -96, 220, 8, STEAM, st.mist * 0.7);
      // the wooded foothill behind the house: only a low wash
      body(g, near, -340, 430);
      bokashi(g, near, -340, 430, st.tree, x => 0.12 * (0.7 + 0.6 * fbm(x / 50, 83)), x => Math.min(near(x), 24 + 14 * fbm(x / 60, 84)));
      // firs: three to the right, two smaller to the left
      fir(g, -210, 64, 91, st.tree, st.treeA); fir(g, -231, 44, 92, st.tree, st.treeA * 0.85);
      fir(g, 206, 110, 93, st.tree, st.treeA * 1.08); fir(g, 233, 76, 94, st.tree, st.treeA * 0.95); fir(g, 257, 52, 95, st.tree, st.treeA * 0.8);
    }

    const straight = (g, x0, y0, x1, y1, o) => brush(g, [[x0, y0], [x1, y1]], Object.assign({ rgb: SOFT, a: 0.8, w: 1.2, tin: 0.02, tout: 0.1, rough: 0.35, wob: 0.12, nb: 3 }, o));
    function house(g, st) {
      const gl = st.win, bw = 2 * HALL / BAYS;
      // the light the hall throws into the mist
      glow(g, 0, -38, 200, 96, WARM, st.halo);
      // walls and roofs hide what is behind them
      g.fillStyle = INK;
      g.beginPath(); g.moveTo(-HALL - 16, roofY(HALL + 16) + 1); g.lineTo(0, -APEX - 1.5); g.lineTo(HALL + 16, roofY(HALL + 16) + 1); g.lineTo(HALL, -EAVE + 6); g.lineTo(HALL, 0); g.lineTo(-HALL, 0); g.lineTo(-HALL, -EAVE + 6); g.closePath(); g.fill();
      g.fillRect(-WING - 13, -WING_H - 7, WING - HALL + 13, WING_H + 7); g.fillRect(HALL, -WING_H - 7, WING - HALL + 13, WING_H + 7);

      for (const d of [-1, 1]) {
        // wing: slim timber slats, a low ribbon of light, the roof a thin line that reaches out
        const rr = rng(100 + d), wa = HALL + 18, wb = WING - 16, wy0 = -27.5, wy1 = -16.5;
        for (let x = HALL + 5.4; x < WING - 1; x += 4.3) {
          const top = -WING_H + 2, bot = -1.2 - 4 * rr() * rr(), o = { w: 1.15, a: 0.17 + 0.13 * rr(), dry: 0.7, dryAt: 0.45, tin: 0.03, tout: 0.2, nb: 2, streak: 8, k: 110 + (x | 0) + d };
          if (x > wa - 2.4 && x < wb + 2.4) { straight(g, d * x, top, d * x, wy0 - 2.6, o); straight(g, d * x, wy1 + 2.6, d * x, bot, o); }
          else straight(g, d * x, top, d * x, bot, o);
        }
        const np = 5, pw = (wb - wa) / np, wg = g.createLinearGradient(0, wy0, 0, wy1);
        wg.addColorStop(0, rgba(WARM, 0.36 * gl)); wg.addColorStop(1, rgba(WARM, 0.7 * gl));
        for (let i = 0; i < np; i++) { const xa = d * (wa + i * pw + 0.55), xb = d * (wa + (i + 1) * pw - 0.55); wash(g, [[xa, wy0], [xb, wy0], [xb, wy1], [xa, wy1]], wg, 0.9 * (0.84 + 0.16 * hash(i, 131 + d)), { layers: 2, j: 0.22, k: 130 + i + d }); }
        straight(g, d * WING, -WING_H + 1, d * WING, 0.5, { w: 1, a: 0.5, tout: 0.25, k: 139 + d });
        const ry = x => -WING_H - 4.5 + (x - HALL) / (WING - HALL) * 2;
        wash(g, [[d * (HALL + 1), ry(HALL)], [d * (WING + 12), ry(WING + 12)], [d * (WING + 9), ry(WING + 9) + 3], [d * (HALL + 1), ry(HALL) + 3]], rgba(SOFT, 1), 0.08, { layers: 2, j: 0.3, k: 140 + d });
        straight(g, d * (HALL - 1), ry(HALL - 1), d * (WING + 13), ry(WING + 13), { w: 1.9, a: 0.92, tin: 0.01, tout: 0.16, dry: 0.6, dryAt: 0.6, nb: 4, k: 141 + d });
        straight(g, d * (HALL + 2), ry(HALL) + 3.2, d * (WING + 7), ry(WING + 7) + 3.2, { w: 0.8, a: 0.34, tout: 0.35, k: 143 + d });
      }
      // the hall: panes of warm light with the paper left open between them, like shoji; the light
      // is strongest at the floor and thins out towards the gable
      const hg = g.createLinearGradient(0, -APEX, 0, 0), cg = g.createLinearGradient(0, -32, 0, -1);
      hg.addColorStop(0, rgba(AMBER, 0.14 * gl)); hg.addColorStop(0.45, rgba(mix(AMBER, WARM, 0.6), 0.46 * gl)); hg.addColorStop(1, rgba(mix(WARM, SOFT, 0.3), 0.92 * gl));
      cg.addColorStop(0, rgba(SOFT, 0)); cg.addColorStop(1, rgba(SOFT, 1));
      for (let i = 0; i < BAYS; i++) {
        const xa = -HALL + i * bw + 0.65, xb = xa + bw - 1.3, a = 0.95 * (0.88 + 0.12 * hash(i, 151)) * (1 - 0.2 * Math.abs(i - 3) / 3);
        wash(g, [[xa, roofY(xa) + 4.6], [xb, roofY(xb) + 4.6], [xb, -42.6], [xa, -42.6]], hg, a, { layers: 2, j: 0.22, k: 150 + i });
        wash(g, [[xa, -41.3], [xb, -41.3], [xb, -1.6], [xa, -1.6]], hg, a, { layers: 2, j: 0.22, k: 160 + i });
        // a second, paler wash low in each pane: the lamps stand near the floor
        wash(g, [[xa + 1, -32], [xb - 1, -32], [xb - 1, -2.6], [xa + 1, -2.6]], cg, 0.3 * gl * (0.7 + 0.6 * hash(i, 153)), { layers: 3, j: 0.9, k: 164 + i });
      }
      for (const d of [-1, 1]) {
        straight(g, d * HALL, -EAVE + 4, d * HALL, 0.5, { w: 1.05, a: 0.62, k: 170 + d });
        // the gable roof: pulled from the ridge outwards, a thin line under it
        wash(g, [[0, -APEX], [d * (HALL + 15), roofY(HALL + 15)], [d * (HALL + 12), roofY(HALL + 12) + 3.2], [0, -APEX + 3.2]], rgba(SOFT, 1), 0.09, { layers: 2, j: 0.3, k: 172 + d });
        straight(g, d * -1, -APEX - 0.2, d * (HALL + 16), roofY(HALL + 16), { w: 2.3, a: 0.95, tin: 0.01, tout: 0.14, dry: 0.55, dryAt: 0.62, nb: 5, k: 174 + d });
        straight(g, d * 6, -APEX + 5.2, d * (HALL + 10), roofY(HALL + 10) + 3.4, { w: 0.8, a: 0.36, tout: 0.35, k: 176 + d });
      }
      // light spilling onto the terrace
      glow(g, 0, 5, 132, 13, WARM, st.halo * 0.8);
    }

    function poolShape(grow = 0) {
      const { y0, y1, h0, h1 } = POOL;
      return [[-h0 - grow, y0 - grow], [h0 + grow, y0 - grow], [h1 + grow, y1 + grow], [-h1 - grow, y1 + grow]];
    }
    function ground(g, st) {
      const { y0, y1, h0, h1 } = POOL, bw = 2 * HALL / BAYS;
      // the terrace: one long line, heavier in the middle, dry at its ends
      brush(g, [[-268, 0], [292, 0]], { w: 1.9, rgb: SOFT, a: 0.82, tin: 0.06, tout: 0.3, dry: 0.75, dryAt: 0.6, rough: 0.5, wob: 0.2, nb: 4, k: 181 });
      straight(g, -186, 8, 192, 8, { w: 0.9, a: 0.3, tin: 0.1, tout: 0.4, k: 182 });
      // the water: a pale wash, the hall's light lying in it
      const wg = g.createLinearGradient(0, y0, 0, y1); wg.addColorStop(0, rgba(st.water, 0.3)); wg.addColorStop(1, rgba(st.water, 1));
      wash(g, poolShape(-1.5), wg, st.waterA, { layers: 4, j: 1.3, k: 183 });
      const rg = g.createLinearGradient(0, y0, 0, y0 + 56); rg.addColorStop(0, rgba(WARM, 1)); rg.addColorStop(1, rgba(WARM, 0));
      wash(g, [[-HALL, y0 + 1.5], [HALL, y0 + 1.5], [HALL * 1.34, y0 + 56], [-HALL * 1.34, y0 + 56]], rg, 0.15 * st.win, { layers: 3, j: 2, k: 184 });
      for (let i = 0; i < BAYS; i++) {
        const x = -HALL + bw * (i + 0.5), hw = bw * 0.3;
        wash(g, [[x - hw, y0 + 1.5], [x + hw, y0 + 1.5], [x * 1.3 + hw * 1.2, y0 + 46], [x * 1.3 - hw * 1.2, y0 + 46]], rg, 0.2 * st.win, { layers: 3, j: 1.2, k: 185 + i });
      }
      // the evening sun's path across the water
      if (st.sun > 0) {
        const sg = g.createLinearGradient(0, y0, 0, y1); sg.addColorStop(0, rgba(SOFT, 0.25)); sg.addColorStop(1, rgba(SOFT, 1));
        wash(g, [[SUN_X - 9, y0 + 2], [SUN_X + 9, y0 + 2], [SUN_X * 1.4 + 24, y1 - 3], [SUN_X * 1.4 - 24, y1 - 3]], sg, 0.2 * st.sun, { layers: 4, j: 2.4, k: 188 });
      }
      // lights under the water along the near edge
      if (st.lights > 0) for (let i = 0; i < 5; i++) {
        const x = -156 + 78 * i; glow(g, x, y1 - 10, 30, 10, WARM, 0.4 * st.lights);
        g.fillStyle = rgba(SOFT, 0.9 * st.lights); g.beginPath(); g.ellipse(x, y1 - 10, 2.4, 0.9, 0, 0, 6.3); g.fill();
      }
      // the basin's edge: thin at the far side, a full stroke in front that stops short of the corner
      straight(g, -h0 - 4, y0, h0 + 3, y0, { w: 1.1, a: 0.6, tin: 0.08, tout: 0.2, k: 191 });
      brush(g, [[-h0 + 1, y0 - 1.5], [-h1, y1 + 0.5]], { w: 2, rgb: SOFT, a: 0.74, tin: 0.02, tout: 0.06, press: u => 0.5 + 0.5 * u, rough: 0.5, wob: 0.15, nb: 4, k: 192 });
      brush(g, [[h0, y0], [h1 - 4, y1 - 5]], { w: 2, rgb: SOFT, a: 0.7, tin: 0.02, tout: 0.3, press: u => 0.5 + 0.5 * u, dry: 0.8, dryAt: 0.55, rough: 0.5, wob: 0.15, nb: 4, k: 193 });
      brush(g, [[-h1 - 5, y1], [h1 - 20, y1]], { w: 3.4, rgb: SOFT, a: 0.92, side: 1, load: 1, tin: 0.015, tout: 0.3, dry: 0.95, dryAt: 0.52, rough: 0.6, wob: 0.2, streak: 34, k: 194 });
      // the handrail into the water
      for (const o of [0, 9]) brush(g, [[-176 - o, y1 + 5], [-176 - o, y1 - 9]].concat(quad([-176 - o, y1 - 9], [-176 - o, y1 - 16], [-168 - o, y1 - 16], 6), [[-163 - o, y1 - 15.4], [-161.5 - o, y1 - 9]]),
        { w: 1.25, rgb: STEAM, a: 0.66, tin: 0.03, tout: 0.25, rough: 0.4, nb: 2, k: 196 + o });
      // the seal: the two summits cut out of a small red square
      const hx = 232, hy = 98, hs = 13.5;
      wash(g, [[hx, hy], [hx + hs, hy + 0.3], [hx + hs - 0.3, hy + hs], [hx + 0.2, hy + hs - 0.2]], rgba(SEAL, 1), 0.9, { layers: 3, j: 0.5, k: 198 });
      brush(g, [[hx + 2.2, hy + 10.6], [hx + 5.4, hy + 4], [hx + 7.3, hy + 7.4], [hx + 9, hy + 5.4], [hx + 11.5, hy + 10.6]], { w: 1.5, rgb: INKRGB, a: 0.96, tin: 0.05, tout: 0.1, rough: 0.5, nb: 2, min: 1.1, k: 199 });
      g.fillStyle = INK; g.beginPath(); g.arc(hx + 9.6, hy + 3.3, 0.95, 0, 6.3); g.fill();
    }

    function paint(g, k) {
      const st = ST[k];
      g.setTransform(S, 0, 0, S, OX, GY);
      sky(g, st, k); mountains(g, st); land(g, st); house(g, st); ground(g, st);
    }

    // the picture's sides run out softly (wide screens only; a phone shows it edge to edge)
    function fadeSides(g, ox) {
      if (V.phone) return;
      const a = ox + FADE[0] * S, b = ox + FADE[3] * S, span = FADE[3] - FADE[0], gr = g.createLinearGradient(a, 0, b, 0);
      for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8 * (FADE[1] - FADE[0]) / span, rgba('0,0,0', ease(i / 8)));
      for (let i = 0; i <= 8; i++) gr.addColorStop((FADE[2] - FADE[0] + i / 8 * (FADE[3] - FADE[2])) / span, rgba('0,0,0', 1 - ease(i / 8)));
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in'; g.fillStyle = gr;
      g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.globalCompositeOperation = 'source-over';
    }

    // the paper's grain and fibres, laid over the finished picture so the washes granulate
    function paperTile() {
      const n = 384, c = mk(n, n), g = c.getContext('2d'), rr = rng(77), im = g.createImageData(n, n), d = im.data;
      for (let i = 0; i < n * n; i++) {
        const v = rr();
        if (v < 0.5) d[i * 4 + 3] = v * 2 * 15;
        else { d[i * 4] = 236; d[i * 4 + 1] = 214; d[i * 4 + 2] = 162; d[i * 4 + 3] = (v - 0.5) * 2 * 6; }
      }
      g.putImageData(im, 0, 0); g.lineCap = 'round';
      for (let i = 0; i < 80; i++) {
        const x = rr() * n, y = rr() * n, a = rr() * 6.3, l = 6 + rr() * rr() * 44, b = (rr() - 0.5) * 0.5, al = 0.014 + rr() * 0.026, lw = 0.5 + rr() * 0.6;
        g.strokeStyle = rgba(SOFT, al); g.lineWidth = lw;
        for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
          g.beginPath(); g.moveTo(x + ox, y + oy);
          g.quadraticCurveTo(x + ox + Math.cos(a + b) * l * 0.5, y + oy + Math.sin(a + b) * l * 0.5, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke();
        }
      }
      return c;
    }

    function build(k) {
      const g = scratch.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, V.Wd, V.Hd);
      paint(g, k); fadeSides(g, OX);
      const c = mk(V.Wd, V.Hd), b = c.getContext('2d', { alpha: false });
      b.fillStyle = INK; b.fillRect(0, 0, V.Wd, V.Hd); b.drawImage(scratch, 0, 0);
      b.fillStyle = b.createPattern(PAPER, 'repeat'); b.fillRect(0, 0, V.Wd, V.Hd);
      return c;
    }

    // rain clouds: a veil over the summits, a bank above, and level bands of haze across the peaks
    function buildClouds() {
      const c = mk(CL.w * S, CL.h * S), g = c.getContext('2d');
      g.setTransform(S, 0, 0, S, -CL.x * S, -CL.y * S);
      const vg = g.createLinearGradient(0, -300, 0, -112);
      vg.addColorStop(0, rgba(INKRGB, 0)); vg.addColorStop(0.32, rgba(INKRGB, 0.52)); vg.addColorStop(0.66, rgba(INKRGB, 0.38)); vg.addColorStop(1, rgba(INKRGB, 0));
      g.fillStyle = vg; g.fillRect(CL.x, -300, CL.w, 188);
      glow(g, -110, -322, 210, 34, STEAM, 0.1); glow(g, 100, -306, 240, 40, STEAM, 0.12); glow(g, 262, -324, 170, 30, STEAM, 0.09); glow(g, -6, -288, 160, 22, STEAM, 0.07);
      haze(g, -272, 16, -240, 15, 0.2, 203); haze(g, -150, 92, -221, 7, 0.13, 207); haze(g, -80, 330, -202, 17, 0.19, 211); haze(g, 60, 252, -182, 7, 0.12, 215);
      haze(g, -350, -120, -168, 10, 0.13, 219); haze(g, 160, 400, -156, 11, 0.12, 227); haze(g, 20, 262, -262, 8, 0.1, 235);
      fadeSides(g, -CL.x * S);
      return c;
    }

    // small sprites for what moves: brush dabs for the water (three hands, three inks) and puffs of steam
    function buildSprites() {
      dabs = {};
      for (const [name, rgb] of [['water', WATER], ['warm', WARM], ['sun', SOFT]]) dabs[name] = [0, 1, 2].map(i => {
        const c = mk(DAB.l * S + 2, DAB.h * S + 2), g = c.getContext('2d');
        g.setTransform(S, 0, 0, S, 1, 1 + DAB.h * S / 2);
        brush(g, [[0.5, 0], [DAB.l * 0.5, (i - 1) * 0.16], [DAB.l - 0.5, 0]], { w: DAB.h * 0.56, rgb, a: 1, tin: 0, tout: 0, press: u => Math.sin(Math.PI * u) ** 0.55, dry: 0.75, dryAt: 0.35, dry0: 0.05 * i, streak: 6, min: 1.1, k: 300 + i * 7 });
        return c;
      });
      puffs = [0, 1, 2].map(i => {
        const n = 128, c = mk(n, n), g = c.getContext('2d'), rr = rng(310 + i);
        for (let q = 0; q < 18; q++) { const a = rr() * 6.3, d = rr() * 0.33 * n, rad = n * (0.13 + rr() * 0.1); glow(g, n / 2 + Math.cos(a) * d, n / 2 + Math.sin(a) * d * 0.62, rad, rad * 0.8, STEAM, 0.1); }
        return c;
      });
    }

    function setView(v) {
      V = v; S = v.S; OX = v.OX; GY = v.GY; px = 1 / S;
      B = [null, null, null];
      if (!scratch) scratch = mk(1, 1);
      scratch.width = v.Wd; scratch.height = v.Hd;
      if (!PAPER) PAPER = paperTile();
      buildSprites(); clouds = null;
    }

    // ================= what moves =================
    const WX = new Float32Array(40), WY = new Float32Array(40);      // a wisp's two edges, reused
    function live(t, w1, w2, w3) {
      const { y0, y1 } = POOL, bw = 2 * HALL / BAYS, gl = 0.8 + 0.2 * w2 + 0.08 * w3, one = Math.max(1, V.dpr * 0.8) * px;
      ctx.setTransform(S, 0, 0, S, OX, GY);

      // stars: flecks of gold, out when it rains, few in the evening light
      const sa = w1 + 0.3 * w3;
      if (sa > 0.01) {
        ctx.fillStyle = `rgb(${SOFT})`;
        for (const st of STARS) { ctx.globalAlpha = st.a * sa * (0.62 + 0.38 * Math.sin(t * st.sp + st.ph)); ctx.beginPath(); ctx.arc(st.x, st.y, Math.max(st.r, 0.62 * px), 0, 6.3); ctx.fill(); }
      }
      // rain clouds drift a little
      if (w2 > 0.01) {
        if (!clouds) clouds = buildClouds();
        ctx.globalAlpha = w2; ctx.drawImage(clouds, CL.x + 9 * Math.sin(t * 0.11), CL.y, CL.w, CL.h);
      }

      // the water: everything on it is a short level dab of the brush
      ctx.save();
      ctx.beginPath(); ctx.moveTo(-POOL.h0 + 2, y0 + 1.5); ctx.lineTo(POOL.h0 - 2, y0 + 1.5); ctx.lineTo(POOL.h1 - 4, y1 - 2); ctx.lineTo(-POOL.h1 + 4, y1 - 2); ctx.closePath(); ctx.clip();
      const dab = (set, i, x, y, len, a) => { if (a < 0.01) return; const h = DAB.h * (0.7 + 0.3 * len / DAB.l); ctx.globalAlpha = Math.min(1, a); ctx.drawImage(set[i % 3], x - len / 2, y - h / 2, len, h); };
      const stir = 0.35 + 0.65 * w2 + 0.25 * w3;
      for (const q of RIPPLES) {
        const y = lerp(y0 + 5, y1 - 5, q.v), h = halfAt(y) - 22, x = lerp(-h, h, q.u) + 7 * Math.sin(t * q.sp + q.ph);
        dab(dabs.water, q.v3, x, y + 0.5 * Math.sin(t * q.sp * 2.3 + q.ph), (q.len + 8) * (0.7 + 0.9 * q.v), (0.08 + 0.3 * (0.5 + 0.5 * Math.sin(t * q.sp * 1.7 + q.ph * 2))) * (0.5 + 0.5 * q.v) * (0.75 + 0.5 * stir));
      }
      for (let i = 0; i < BAYS; i++) {
        const bx = -HALL + bw * (i + 0.5);
        for (let j = 0; j < 6; j++) {
          const y = y0 + 6 + j * 7.6, u = (y - y0) / (y1 - y0), h1 = hash(i * 7 + j, 401), h2 = hash(i * 7 + j, 402);      // no two dabs alike
          dab(dabs.warm, i + j, bx * (1 + u * 0.4) + (h1 - 0.5) * 5 + (1.2 + 2.6 * stir) * Math.sin(t * (0.7 + 0.5 * stir) + j * 1.3 + i * 0.9), y + (h2 - 0.5) * 2.4, (19 - j * 1.5) * (0.62 + 0.7 * h2), 0.66 * (1 - j / 6.6) * (0.45 + 0.55 * h1) * gl);
        }
      }
      if (w3 > 0.01) for (let j = 0; j < 14; j++) {
        const y = y0 + 4 + j * 4.9, u = (y - y0) / (y1 - y0);
        dab(dabs.sun, j, SUN_X * (1 + u * 0.4) + 3.4 * Math.sin(t * 1.05 + j * 0.8), y, (10 + 30 * u) * (0.78 + 0.22 * Math.sin(t * 0.9 + j * 2.1)), (0.5 + 0.45 * u) * w3);
      }
      if (w2 > 0.01) {
        ctx.strokeStyle = `rgb(${RAIN})`; ctx.lineWidth = one;
        for (const q of RINGS) {
          const u = (q.ph + t * q.sp) % 1, y = lerp(y0 + 8, y1 - 8, q.v), h = halfAt(y) * 0.86, x = lerp(-h, h, q.u), k = (2 + 11 * u) * (0.55 + 0.6 * q.v);
          ctx.globalAlpha = 0.55 * (1 - u) * w2; ctx.beginPath();
          // a ring is two arcs that do not quite meet
          for (const a0 of [q.g, q.g + 3.25]) { ctx.moveTo(x + k * Math.cos(a0), y + k * 0.3 * Math.sin(a0)); ctx.ellipse(x, y, k, k * 0.3, 0, a0, a0 + 2.65); }
          ctx.stroke();
        }
      }
      ctx.restore();

      // steam: soft puffs, and a few rising lines like the ones on an onsen sign
      const amount = 0.5 + 0.5 * w2 + 0.14 * w3;
      PUFFS.forEach((q, i) => {
        if (i / PUFFS.length > amount) return;
        const u = (q.ph + t * q.sp * 0.034) % 1, x = q.x * (1 + 0.25 * u) + 12 * Math.sin(q.dr + u * 4), y = q.y - u * 126, rad = 30 + 36 * u;
        ctx.globalAlpha = Math.sin(Math.PI * u) ** 1.6 * (1 - 0.4 * u) * 0.34 * (0.65 + 0.35 * amount); ctx.drawImage(puffs[q.v], x - rad * 1.3, y - rad * 0.66, 2.6 * rad, 1.32 * rad);
      });
      ctx.fillStyle = `rgb(${STEAM})`;
      WISPS.forEach((q, i) => {
        if (i / WISPS.length > amount) return;
        const lifeA = (0.5 + 0.5 * Math.sin(t * q.sp + q.ph)) ** 1.4 * 0.26; if (lifeA < 0.01) return;
        const n = 20;
        for (let j = 0; j < n; j++) {
          const v = j / (n - 1);
          WX[j] = q.x + q.amp * Math.sin(v * q.k - t * q.w + q.ph) * (0.2 + 0.8 * v) + q.lean * v * v * 26; WY[j] = q.y - v * q.h;
          WX[j + n] = q.wd * Math.sin(Math.PI * v) ** 0.7 * (0.75 + 0.25 * Math.sin(v * 9 + q.ph)) + 0.3 * px;
        }
        // a wide pale stroke and a narrower one in it
        for (const [m, al] of [[3.2, 0.24], [1.2, 0.42]]) {
          ctx.globalAlpha = lifeA * al; ctx.beginPath(); ctx.moveTo(WX[0], WY[0]);
          for (let j = 1; j < n; j++) ctx.lineTo(WX[j] - WX[j + n] * m, WY[j]);
          for (let j = n - 1; j >= 0; j--) ctx.lineTo(WX[j] + WX[j + n] * m, WY[j]);
          ctx.closePath(); ctx.fill();
        }
      });

      // rain: long straight lines at two slightly different slants, as the woodblocks cut it
      if (w2 > 0.01) {
        ctx.strokeStyle = `rgb(${RAIN})`; ctx.lineWidth = one;
        for (let b = 0; b < 3; b++) {
          ctx.globalAlpha = [0.32, 0.19, 0.1][b] * w2; ctx.beginPath();
          for (const d of DROPS) {
            if (d.b !== b) continue;
            const span = d.end - d.top, head = d.top + ((d.ph + t * d.sp) % 1) * (span + d.len), ya = Math.max(d.top, head - d.len), yb = Math.min(d.end, head);
            if (yb <= ya) continue;
            ctx.moveTo(d.x - d.k * (ya - d.top), ya); ctx.lineTo(d.x - d.k * (yb - d.top), yb);
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    let pend = null, pendN = 0;
    function draw(state) {
      const { W, H, dpr, t, w } = state;
      if (W < 2 || H < 2) return;
      if (!V || V.W !== W || V.H !== H || V.dpr !== dpr) {
        const same = pend && pend.W === W && pend.H === H && pend.dpr === dpr;
        if (!V || (same && ++pendN > 8)) { setView(layout(W, H, dpr, state.phone)); pend = null; }
        else {
          // the size is still changing: show the old picture stretched until it has settled
          if (!same) { pend = { W, H, dpr }; pendN = 0; }
          const old = B[0] || B[1] || B[2];
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = INK; ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (old) ctx.drawImage(old, 0, 0, canvas.width, canvas.height);
          return;
        }
      }
      // the standing pictures: the ones on show now, the others one per frame while nothing fades
      let made = false;
      for (let k = 0; k < 3; k++) if (w[k] > 0.002 && !B[k]) { B[k] = build(k); made = true; }
      if (!made) { const k = B.findIndex(b => !b); if (k >= 0) B[k] = build(k); else if (!clouds) clouds = buildClouds(); }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      let acc = 0;
      for (let k = 0; k < 3; k++) { if (w[k] <= 0.002) continue; acc += w[k]; ctx.globalAlpha = w[k] / acc; ctx.drawImage(B[k], 0, 0); }
      ctx.globalAlpha = 1;
      live(t, w[0], w[1], w[2]);
    }

    return { draw };
  } });
})();
