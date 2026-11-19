/* ============ BLAUE STUNDE — style lab, Wellness scene, style 1: gold line ============
   The scene as it is on the page (js/therme-scene.js), as a renderer for js/scene-styles.js.
   Made from that file; if this style is chosen, the page's scene stays as it is.
   ====================================================================================== */
(() => {
  if (!window.SceneStyles) return;
  SceneStyles.register({ id: 1, label: 'Goldlinie', create(canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    // gold for the land, a pale blue for the water (the blue hour), warm for light, white mist
    const INK = '#10141A', GOLD = '209,168,81', SOFT = '236,214,162', WARM = '236,186,104',
      WATER = '150,192,210', STEAM = '214,226,230', RAIN = '176,200,218';
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const ease = u => u * u * (3 - 2 * u);
    const lerp = (a, b, u) => a + (b - a) * u;
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // fixed, so every visit looks the same

    // ---- the picture, in its own units: x from the bath's axis, y down from the ground line.
    // Two ridges: the far one carries the logo's two summits with a saddle between them
    const g = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
    const far = x => 92 + 150 * g(x, -70, 120) + 118 * g(x, 205, 110) + 95 * g(x, -420, 190) + 80 * g(x, 560, 210) +
      60 * g(x, -800, 260) + 55 * g(x, 900, 240) + 4 * Math.sin(x / 23) + 3 * Math.sin(x / 9 + 2);
    const near = x => 58 + 46 * g(x, -330, 170) + 40 * g(x, 360, 190) + 30 * g(x, -760, 220) + 34 * g(x, 800, 230) +
      5 * Math.sin(x / 31 + 1) + 2.5 * Math.sin(x / 11);
    const SUN_X = 78;
    // the pool: a basin seen from the front, its far edge at the terrace, wider towards us
    const POOL = { y0: 22, y1: 122, h0: 182, h1: 292 };
    const halfAt = y => lerp(POOL.h0, POOL.h1, (y - POOL.y0) / (POOL.y1 - POOL.y0));
    const BAYS = 7, HALL = 110, HALL_H = 92, WING = 232, WING_H = 62;

    const STARS = Array.from({ length: 46 }, () => ({ x: -620 + rnd() * 1240, y: -330 + rnd() * 150, r: 0.5 + rnd() * 0.8, ph: rnd() * 6.3 }));
    const PUFFS = Array.from({ length: 44 }, () => ({ x: -150 + rnd() * 300, ph: rnd(), sp: 0.6 + rnd() * 0.8, dr: rnd() * 6.3, y: 40 + rnd() * 60 }));
    const MIST = Array.from({ length: 170 }, () => ({ x: -170 + rnd() * 340, ph: rnd(), sp: 0.6 + rnd() * 0.9, dr: rnd() * 6.3, y: 30 + rnd() * 80 }));
    const DROPS = Array.from({ length: 150 }, () => ({ x: -560 + rnd() * 1120, ph: rnd(), sp: 0.8 + rnd() * 0.5, len: 15 + rnd() * 12 }));
    const RINGS = Array.from({ length: 12 }, () => ({ u: rnd(), v: 0.12 + rnd() * 0.8, ph: rnd(), sp: 0.5 + rnd() * 0.5 }));
    const TREES = [[-292, 74], [-330, 104], [-372, 82], [-424, 116], [-470, 88], [298, 86], [338, 112], [384, 78], [432, 106], [486, 90]];
    const CLOUDS = [{ x: -190, y: -262, k: 1.25, from: -170 }, { x: 96, y: -292, k: 1.05, from: 150 }, { x: 330, y: -246, k: 0.85, from: 210 }];

    let Wd = 0, Hd = 0, dpr = 1, W2 = 0, W3 = 0;

    let s = 1, px = 1;   // px per unit, and one screen pixel in units (for hairlines)
    const stroke = (rgb, a, w = 1) => { ctx.strokeStyle = `rgba(${rgb},${a})`; ctx.lineWidth = w * px; ctx.stroke(); };
    const line = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); };
    const rect = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); };
    function glow(x, y, r, rgb, a) {
      if (a <= 0.003 || !(r > 0)) return;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    function poolPath(grow = 0) {
      const { y0, y1, h0, h1 } = POOL, r = 16;
      ctx.beginPath(); ctx.moveTo(-h0 - grow + r, y0 - grow);
      ctx.arcTo(h0 + grow, y0 - grow, h1 + grow, y1 + grow, r); ctx.arcTo(h1 + grow, y1 + grow, -h1 - grow, y1 + grow, r);
      ctx.arcTo(-h1 - grow, y1 + grow, -h0 - grow, y0 - grow, r); ctx.arcTo(-h0 - grow, y0 - grow, h0 + grow, y0 - grow, r);
      ctx.closePath();
    }

    function ridge(fn, xa, xb, top, a, w) {
      ctx.beginPath(); ctx.moveTo(xa, 4);
      for (let x = xa; x <= xb; x += 5) ctx.lineTo(x, -fn(x));
      ctx.lineTo(xb, 4); ctx.closePath();
      const gr = ctx.createLinearGradient(0, -260, 0, 0);
      gr.addColorStop(0, top); gr.addColorStop(1, INK);
      ctx.fillStyle = gr; ctx.fill();
      ctx.beginPath();
      for (let x = xa; x <= xb; x += 5) (x === xa ? ctx.moveTo(x, -fn(x)) : ctx.lineTo(x, -fn(x)));
      stroke(GOLD, a, w);
    }

    function tree(x, h) {
      const tiers = 5; ctx.beginPath(); ctx.moveTo(x, -h);
      for (let i = 0; i < tiers; i++) { const y = -h + (i + 1) * h * 0.18, w = (i + 1) * h * 0.075; ctx.lineTo(x + w, y); ctx.lineTo(x + w * 0.45, y); }
      ctx.lineTo(x + h * 0.03, -h * 0.1); ctx.lineTo(x + h * 0.03, 0); ctx.lineTo(x - h * 0.03, 0); ctx.lineTo(x - h * 0.03, -h * 0.1);
      for (let i = tiers - 1; i >= 0; i--) { const y = -h + (i + 1) * h * 0.18, w = (i + 1) * h * 0.075; ctx.lineTo(x - w * 0.45, y); ctx.lineTo(x - w, y); }
      ctx.closePath(); ctx.fillStyle = '#121821'; ctx.fill(); stroke(SOFT, 0.34, 0.9);
    }

    function cloud(c, a) {
      if (a <= 0.01) return;
      const k = c.k, x = c.x + c.from * (1 - a), y = c.y;
      ctx.beginPath(); ctx.moveTo(x - 70 * k, y);
      ctx.bezierCurveTo(x - 92 * k, y, x - 94 * k, y - 28 * k, x - 66 * k, y - 30 * k);
      ctx.bezierCurveTo(x - 62 * k, y - 58 * k, x - 18 * k, y - 62 * k, x - 8 * k, y - 36 * k);
      ctx.bezierCurveTo(x + 4 * k, y - 56 * k, x + 46 * k, y - 52 * k, x + 48 * k, y - 28 * k);
      ctx.bezierCurveTo(x + 78 * k, y - 32 * k, x + 90 * k, y, x + 66 * k, y);
      ctx.closePath();
      ctx.fillStyle = `rgba(24,30,40,${(0.94 * a).toFixed(3)})`; ctx.fill(); stroke(STEAM, 0.42 * a, 1);
    }

    function house(gl) {
      glow(0, -46, 300, WARM, 0.13 * gl);
      // wings: timber, a ribbon window, a thin roof slab that overhangs outwards
      for (const d of [-1, 1]) {
        const xa = d * HALL, xb = d * WING;
        rect(Math.min(xa, xb), -WING_H, Math.max(xa, xb), 0); ctx.fillStyle = '#141a22'; ctx.fill(); stroke(SOFT, 0.8, 1.1);
        ctx.beginPath(); for (let x = Math.min(xa, xb) + 6; x < Math.max(xa, xb); x += 6) { ctx.moveTo(x, -WING_H + 2); ctx.lineTo(x, -2); } stroke(SOFT, 0.13, 0.7);
        const wa = Math.min(xa, xb) + 16, wb = Math.max(xa, xb) - 16;
        rect(wa, -46, wb, -30); ctx.fillStyle = INK; ctx.fill();
        const wg = ctx.createLinearGradient(0, -46, 0, -30); wg.addColorStop(0, `rgba(${WARM},${0.32 * gl})`); wg.addColorStop(1, `rgba(${WARM},${0.7 * gl})`);
        ctx.fillStyle = wg; ctx.fill(); stroke(WARM, 0.75, 0.9);
        ctx.beginPath(); for (let i = 1; i < 5; i++) { const x = lerp(wa, wb, i / 5); ctx.moveTo(x, -46); ctx.lineTo(x, -30); } stroke('20,18,16', 0.7, 1);
        rect(Math.min(xa, xb + d * 14), -WING_H - 6, Math.max(xa, xb + d * 14), -WING_H); ctx.fillStyle = INK; ctx.fill(); stroke(SOFT, 0.95, 1.2);
      }
      // the hall: glass from floor to roof on a regular grid, light inside, pendant lamps
      rect(-HALL, -HALL_H, HALL, 0); ctx.fillStyle = INK; ctx.fill();
      const hg = ctx.createLinearGradient(0, -HALL_H, 0, 0);
      hg.addColorStop(0, `rgba(${WARM},${0.2 * gl})`); hg.addColorStop(0.55, `rgba(${WARM},${0.5 * gl})`); hg.addColorStop(1, `rgba(${WARM},${0.82 * gl})`);
      ctx.fillStyle = hg; ctx.fill();
      const bw = 2 * HALL / BAYS;
      for (let i = 0; i < BAYS; i++) { const x = -HALL + bw * (i + 0.5); glow(x, -66, 14, SOFT, 0.5 * gl); rect(x - 1.1, -67.1, x + 1.1, -64.9); ctx.fillStyle = `rgba(${SOFT},${0.95 * gl})`; ctx.fill(); line(x, -HALL_H, x, -67); stroke(SOFT, 0.35, 0.6); }
      line(-HALL, -HALL_H * 0.78, HALL, -HALL_H * 0.78); stroke(SOFT, 0.5, 0.7);
      ctx.beginPath(); for (let i = 0; i <= BAYS; i++) { const x = -HALL + bw * i; ctx.moveTo(x, -HALL_H); ctx.lineTo(x, 0); } stroke(SOFT, 0.92, 1.2);
      rect(-HALL, -HALL_H, HALL, 0); stroke(SOFT, 0.95, 1.3);
      rect(-HALL - 16, -HALL_H - 8, HALL + 16, -HALL_H); ctx.fillStyle = INK; ctx.fill(); stroke(SOFT, 1, 1.3);
      // terrace: the ground line, the deck's edge, two steps down to the pool
      line(-470, 0, 470, 0); stroke(SOFT, 0.55, 1);
      line(-330, 10, 330, 10); stroke(SOFT, 0.26, 0.8);
      line(-64, 4, 64, 4); stroke(SOFT, 0.4, 0.8); line(-72, 8, 72, 8); stroke(SOFT, 0.3, 0.8);
      // loungers on the deck, left and right of the pool
      for (const d of [-1, 1]) for (const x of [268, 334]) {
        const X = d * x; ctx.beginPath();
        ctx.moveTo(X - d * 22, 2); ctx.lineTo(X + d * 8, 2); ctx.lineTo(X + d * 22, -12);
        ctx.moveTo(X - d * 16, 2); ctx.lineTo(X - d * 16, 9); ctx.moveTo(X + d * 6, 2); ctx.lineTo(X + d * 6, 9);
        stroke(SOFT, 0.6, 1.1);
      }
    }

    function pool(t, gl, sun, lights) {
      const { y0, y1 } = POOL;
      poolPath(); const wg = ctx.createLinearGradient(0, y0, 0, y1);
      wg.addColorStop(0, '#0e1924'); wg.addColorStop(1, '#152a3a'); ctx.fillStyle = wg; ctx.fill();
      ctx.save(); poolPath(); ctx.clip();
      // the windows' light and the sun's on the water: short strokes that waver
      const bw = 2 * HALL / BAYS;
      for (let i = 0; i < BAYS; i++) {
        const bx = -HALL + bw * (i + 0.5);
        for (let j = 0; j < 15; j++) {
          const y = y0 + 2 + j * 5.4, u = (y - y0) / (y1 - y0), x = bx * (1 + u * 0.55) + 3 * Math.sin(t * 1.4 + j * 0.9 + i), w = 11 - j * 0.45;
          line(x - w, y, x + w, y); stroke(WARM, 0.6 * (1 - j / 15) * gl, 1.6);
        }
      }
      if (sun > 0.01) for (let j = 0; j < 18; j++) {
        const y = y0 + 3 + j * 5.4, u = (y - y0) / (y1 - y0), x = SUN_X * (1 + u * 0.55) + 4 * Math.sin(t * 1.1 + j * 0.8), w = 22 - j * 0.5;
        line(x - w, y, x + w, y); stroke(SOFT, 0.5 * (1 - j / 20) * sun, 1.6);
      }
      // the water: fine lines, closer together far away, rippling
      const n = 24;
      for (let k = 1; k < n; k++) {
        const u = (k / n) ** 1.6, y = lerp(y0, y1, u), h = halfAt(y), amp = 0.5 + 1.9 * u;
        ctx.beginPath();
        for (let x = -h; x <= h; x += 8) { const yy = y + amp * Math.sin(x * 0.045 + t * 1.15 + k * 1.7) * Math.cos(x * 0.013 - t * 0.5 + k); (x === -h ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)); }
        stroke(WATER, 0.1 + 0.3 * u, 0.6 + 0.5 * u);
      }
      // lights under the water along the near edge
      for (let i = 0; i < 7; i++) { const x = -234 + 78 * i; glow(x, y1 - 12, 34, WARM, 0.3 * lights); rect(x - 2.4, y1 - 12.8, x + 2.4, y1 - 11.2); ctx.fillStyle = `rgba(${WARM},${0.95 * lights})`; ctx.fill(); }
      ctx.restore();
      poolPath(); stroke(SOFT, 0.9, 1.3);
      poolPath(7); stroke(SOFT, 0.28, 0.8);
      // the handrail into the water, near left
      for (const o of [0, 11]) { ctx.beginPath(); ctx.moveTo(-262 - o, y1 + 6); ctx.lineTo(-262 - o, y1 - 20); ctx.quadraticCurveTo(-262 - o, y1 - 30, -252 - o, y1 - 30); ctx.lineTo(-240 - o, y1 - 30); ctx.quadraticCurveTo(-232 - o, y1 - 30, -232 - o, y1 - 22); ctx.lineTo(-232 - o, y1 - 10); stroke('206,216,222', 0.75, 1.3); }
    }

    function steam(t, amount) {
      for (const q of PUFFS) {
        const u = (q.ph + t * q.sp * 0.045) % 1, x = q.x * (1 + 0.35 * u) + 20 * Math.sin(q.dr + u * 4), y = q.y - u * 210;
        glow(x, y, 20 + 40 * u, STEAM, Math.sin(Math.PI * u) * 0.075 * amount);
      }
      ctx.fillStyle = `rgba(${STEAM},1)`;
      MIST.forEach((q, i) => {
        if (i / MIST.length > amount) return;
        const u = (q.ph + t * q.sp * 0.06) % 1, x = q.x * (1 + 0.3 * u) + 14 * Math.sin(q.dr + u * 5), y = q.y - u * 200;
        ctx.globalAlpha = Math.sin(Math.PI * u) * 0.34; ctx.beginPath(); ctx.arc(x, y, (0.7 + u * 0.7) * Math.max(1, px * 0.8), 0, 6.3); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function rain(t, a) {
      if (a <= 0.01) return;
      ctx.beginPath();
      for (const d of DROPS) { const u = (d.ph + t * d.sp * 1.25) % 1, y = -340 + u * 470, x = d.x - (y + 340) * 0.2; ctx.moveTo(x, y); ctx.lineTo(x - d.len * 0.2, y + d.len); }
      stroke(RAIN, 0.4 * a, 0.9);
      for (const r of RINGS) {
        const u = (r.ph + t * r.sp) % 1, y = lerp(POOL.y0, POOL.y1, r.v), h = halfAt(y) * 0.9, x = lerp(-h, h, r.u), k = 3 + 14 * u * (0.5 + r.v);
        ctx.beginPath(); ctx.ellipse(x, y, k, k * 0.3, 0, 0, 6.3); stroke(RAIN, 0.5 * (1 - u) * a, 0.9);
      }
    }

    function draw(p, t) {
      const phoneScreen = Wd < 768;
      // one fixed view, right of the copy and level with it; on phones on top, the copy below
      const dolly = 1;
      s = (phoneScreen ? Wd * 0.94 / 600 : Math.min(Wd * 0.44 / 600, Hd * 0.92 / 500)) * dolly; px = 1 / s;
      const ox = phoneScreen ? Wd * 0.5 : Wd * 0.7, gy = (phoneScreen ? Hd * 0.3 : Hd * 0.5) + 82 * s;
      const w2 = W2, w3 = W3;
      const gl = 0.86 + 0.14 * Math.max(w2, w3);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = INK; ctx.fillRect(0, 0, Wd, Hd);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * gy);
      const xa = -ox / s, xb = (Wd - ox) / s;

      // sky: stars at the blue hour, the evening sun rising into the saddle (03)
      ctx.fillStyle = `rgba(${SOFT},1)`;
      for (const st of STARS) { ctx.globalAlpha = (0.35 + 0.3 * Math.sin(t * 0.8 + st.ph)) * (1 - w2) * (1 - 0.7 * w3); ctx.beginPath(); ctx.arc(st.x, st.y, st.r * Math.max(1, px * 0.8), 0, 6.3); ctx.fill(); }
      ctx.globalAlpha = 1;
      const sunY = -(far(SUN_X) - 52 + 66 * w3);
      glow(SUN_X, sunY, 330, WARM, 0.2 * w3); glow(SUN_X, sunY, 120, SOFT, 0.28 * w3);
      if (w3 > 0.01) { ctx.beginPath(); ctx.arc(SUN_X, sunY, 40, 0, 6.3); ctx.fillStyle = `rgba(${SOFT},${(0.96 * w3).toFixed(3)})`; ctx.fill(); }

      ridge(far, xa, xb, '#1a2230', 0.42, 1);
      for (const c of CLOUDS) cloud(c, w2);
      ridge(near, xa, xb, '#151c27', 0.3, 0.9);
      for (const [x, h] of TREES) tree(x, h);
      house(gl);
      pool(t, gl, w3, 0.45 + 0.55 * Math.max(w3, w2 * 0.6));
      steam(t, 0.62 + 0.38 * w2);
      rain(t, w2);

      // the copy's side stays clear: the land fades out towards it (and under the copy on phones)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (phoneScreen) {
        const y0 = gy + 150 * s, gr = ctx.createLinearGradient(0, y0, 0, y0 + 40);
        gr.addColorStop(0, 'rgba(16,20,26,0)'); gr.addColorStop(1, INK); ctx.fillStyle = gr; ctx.fillRect(0, y0, Wd, Hd - y0);
      } else {
        const gr = ctx.createLinearGradient(Wd * 0.3, 0, Wd * 0.47, 0);
        gr.addColorStop(0, INK); gr.addColorStop(1, 'rgba(16,20,26,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, Wd * 0.47, Hd);
        const gr2 = ctx.createLinearGradient(Wd - 90, 0, Wd, 0);
        gr2.addColorStop(0, 'rgba(16,20,26,0)'); gr2.addColorStop(1, INK); ctx.fillStyle = gr2; ctx.fillRect(Wd - 90, 0, 90, Hd);
      }
    }


    return { draw(state) { Wd = state.W; Hd = state.H; dpr = state.dpr; W2 = state.w[1]; W3 = state.w[2]; draw(0, state.t); } };
  } });
})();
