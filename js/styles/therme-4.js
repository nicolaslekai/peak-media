/* ============ BLAUE STUNDE — style lab, Wellness scene, style 4: plan ============
   The scene as an architect's sheet: the bath house in elevation with the pool cut below
   it, the pool again in plan underneath on the same axis, in hairlines of two weights.
   Everything is measured in one unit (10 cm, so the sheet is M 1:200) and the building
   stands on a 3 m module; the module is a whole, even number of device pixels, so every
   post, board and edge falls on a pixel and the house is symmetric to the pixel.
   The view looks west (ANSICHT OST), which is where the evening star and the June sun at
   20:00 (azimuth 293°, 11° up, 23° right of the axis) really are in Füssen.
   The stations are told as on a drawing: 01 the sheet at the blue hour, 02 rain as a
   hatch that falls, rings in the plan and the hall's light on the water, 03 the sun over
   the saddle with its path, its rays through the pool and the pool's lights.
   The sheet is drawn once per size into four layers (the sheet itself and what each
   station adds); per picture only rain, steam, ripples and the lights are drawn.
   ================================================================================== */
(() => {
  if (!window.SceneStyles) return;
  SceneStyles.register({ id: 4, label: 'Plan', create(canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const INK = [16, 20, 26], PALE = [222, 228, 228], GOLD = [209, 168, 81], SOFT = [236, 214, 162],
      WARM = [236, 186, 104], WATER = [150, 192, 210], STEAM = [214, 226, 230], RAIN = [176, 200, 218];
    const FONT = 'Manrope, system-ui, sans-serif';
    const css = c => `rgb(${c.join(',')})`;
    const INK_C = css(INK), SOFT_C = css(SOFT), WARM_C = css(WARM), WATER_C = css(WATER), RAIN_C = css(RAIN);
    // a line colour as it looks on the ink, opaque: crossing lines do not add up to bright knots
    const tone = (c, a) => `rgb(${c.map((v, i) => Math.round(INK[i] + (v - INK[i]) * a)).join(',')})`;
    const veil = (c, a) => `rgba(${c.join(',')},${a})`;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const rs = v => (v < 0 ? -Math.round(-v) : Math.round(v));   // rounds the same way left and right of the axis
    let seed = 41;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // fixed, so every visit looks the same

    // ---- the sheet, in units of 10 cm: x from the axis, y down from the ground line
    const M = 30;                                      // the module: 3 m
    const HALL = 105, HALL_H = 72, WING = 225, WING_H = 48, EAVE = 12;   // 7 bays of glass, 4 bays of timber each side
    const POOL = 135, DEPTH = 15, PLAN0 = 75, PLAN1 = 165;               // the pool: 27 m by 9 m, 1.5 m deep
    const TOP = -236, BOT = 214, DIM = 40;
    const SUN = { x: 75, y: -136, r: 12 };             // above the saddle, on the line of a post
    const RAY = Math.tan(23 * Math.PI / 180);          // the sun stands 23° right of the axis
    // the ridge as a surveyed profile: two summits and the saddle between them, the bigger one left
    const RIDGE = [[-500, -58], [-424, -78], [-356, -68], [-268, -104], [-222, -100], [-150, -152], [-118, -162], [-78, -196],
      [-44, -168], [-8, -152], [75, -116], [128, -138], [150, -140], [192, -160], [228, -136], [268, -122], [318, -92],
      [372, -100], [430, -74], [500, -60]];
    const TREES = [[-258, 56, 100], [-282, 80, 128], [-312, 46, 92], [304, 74, 98], [334, 50, 124]];   // x, height, depth in plan
    const TREES_PHONE = [[-257, 56, 100], [257, 66, 132]];   // the narrow sheet: one each side

    // what moves: steam lines over the water, ripple rings in the plan
    const STEAMS = [-110, -66, -22, 22, 66, 110, -88, -44, 44, 88].map((x, i) => ({
      x: x + (rnd() - 0.5) * 8, h: 112 + rnd() * 38, ph: rnd() * 6.3, amp: 1.7 + rnd() * 0.7, extra: i > 5, grad: null }));
    const RINGS = [];
    while (RINGS.length < 16) {
      const r = { x: (rnd() * 2 - 1) * (POOL - 18), v: PLAN0 + 14 + rnd() * (PLAN1 - PLAN0 - 28), ph: rnd(), sp: 0.16 + rnd() * 0.1, calm: RINGS.length < 3 };
      if (r.x < -28 && r.v > PLAN1 - 52) continue;    // not on the pool's label
      RINGS.push(r);
    }
    const NODASH = [], rainDash = [0, 0];

    // ---- the layout of one size
    let fontsIn = 0, fontsDrawn = -1;
    let Wd = 0, Hd = 0, dpr = 1, phone = false, lean = false;   // lean: a small sheet, most of the lettering left out
    let k = 1, ax = 0, gy = 0, half = 327, fine = 1, heavy = 2, fs = 10, pitch = 4, slabH = 5, slabW = 4;
    let lx = 0, ly = 0, lw = 1, lh = 1, firs = TREES, hallGlow = null;
    const layers = [0, 1, 2, 3].map(() => document.createElement('canvas'));
    let c = ctx;                                       // where the helpers draw
    const X = u => ax + rs(u * k), Y = v => gy + rs(v * k);
    const U = n => Math.max(1, Math.round(n * dpr));  // CSS px as whole device px

    // crisp rules over whole pixels
    const hl = (x0, x1, y, w = fine) => c.fillRect(x0, y - (w >> 1), x1 - x0 + 1, w);
    const vl = (x, y0, y1, w = fine) => c.fillRect(x - (w >> 1), y0, w, y1 - y0 + 1);
    function box(x0, y0, x1, y1, w = fine) { hl(x0, x1, y0, w); hl(x0, x1, y1, w); vl(x0, y0, y1, w); vl(x1, y0, y1, w); }
    function dashV(x, y0, y1, pat, w = fine) {
      for (let y = y0, i = 0; y <= y1; y += pat[i++ % pat.length]) if (i % 2 === 0) c.fillRect(x - (w >> 1), y, w, Math.min(pat[i % pat.length], y1 - y + 1));
    }
    function dashH(x0, x1, y, pat, w = fine) {
      for (let x = x0, i = 0; x <= x1; x += pat[i++ % pat.length]) if (i % 2 === 0) c.fillRect(x, y - (w >> 1), Math.min(pat[i % pat.length], x1 - x + 1), w);
    }
    // slanted and round lines: through pixel centres
    function seg(x0, y0, x1, y1) { c.beginPath(); c.moveTo(x0 + 0.5, y0 + 0.5); c.lineTo(x1 + 0.5, y1 + 0.5); c.stroke(); }
    function ring(x, y, r) { c.beginPath(); c.arc(x + 0.5, y + 0.5, r, 0, 6.2832); c.stroke(); }
    function dot(x, y, r) { c.beginPath(); c.arc(x + 0.5, y + 0.5, r, 0, 6.2832); c.fill(); }
    // small tracked capitals, set letter by letter so the spacing is the same in every browser
    // plate: a patch of ink behind the word, so that no line runs through it
    function put(str, x, y, align, style, size = fs, track = 0.14, plate = 0) {
      c.font = `500 ${size}px ${FONT}`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      const tr = track * size;
      let w = -tr;
      for (const ch of str) w += c.measureText(ch).width + tr;
      let px = Math.round(align === 0 ? x - w / 2 : align > 0 ? x - w : x);
      if (plate) { c.fillStyle = INK_C; c.fillRect(px - plate, y - cap() - U(4), Math.ceil(w) + 2 * plate, cap() + U(8)); }
      c.fillStyle = style;
      for (const ch of str) { c.fillText(ch, px, y); px += c.measureText(ch).width + tr; }
      return w;
    }
    const cap = () => Math.round(fs * 0.72);           // height of a capital

    function layout(st) {
      dpr = st.dpr; phone = st.phone; Wd = canvas.width; Hd = canvas.height;
      const W = st.W, H = st.H;
      let bot = phone ? PLAN1 + 30 : BOT;             // phones carry no title block: the sheet ends under the pool's name
      const fit = () => {
        const want = dpr * (phone ? Math.min(W * 0.94 / 540, H * 0.6 / (bot - TOP)) : Math.min(W * 0.5 / 654, H * 0.9 / (bot - TOP)));
        // the module in device px: even (the axis falls on a pixel), and a whole number of boards wide
        let b = Math.max(10, Math.floor(want * M + 0.02));
        for (; b > 10; b--) {
          if (b % 2) continue;
          pitch = 0;
          for (let n = 2; n <= b; n++) { const p = b / n; if (b % n === 0 && p >= 3.4 * dpr && p <= 7.5 * dpr && (!pitch || Math.abs(p - 4.6 * dpr) < Math.abs(pitch - 4.6 * dpr))) pitch = p; }
          if (pitch) break;
        }
        if (!pitch) pitch = Math.max(2, Math.round(b / 6));
        k = b / M;
      };
      fit(); lean = phone || k / dpr < 0.8;
      if (lean && !phone) { bot = PLAN1 + 30; fit(); }   // a small sheet on a wide screen: as on phones
      fine = Math.max(1, Math.round(dpr)); heavy = Math.max(2, Math.round(1.9 * dpr));
      fs = Math.round((phone ? 9 : clamp(10 * k / dpr / 1.2, 9.5, 13)) * dpr * 2) / 2;
      half = phone ? Math.floor(W * dpr * 0.47 / k) : clamp(Math.floor(W * dpr * 0.2455 / k), 300, 470);
      ax = Math.round(Wd * (phone ? 0.5 : 0.7));
      // on phones a little below 36 %: the rain's top edge clears the band's number
      gy = Math.round(Hd * (phone ? 0.4 : 0.5) - (TOP + bot) / 2 * k);
      firs = phone ? TREES_PHONE : TREES;
      slabH = Math.max(3 * fine, rs(4 * k)); slabW = Math.max(3 * fine, rs(3 * k));
      const pad = U(22);
      lx = X(-half) - pad; ly = Y(TOP) - pad; lw = X(half) - X(-half) + 2 * pad + 1; lh = Y(BOT) - Y(TOP) + 2 * pad + 1;
      [sheet, station1, station2, station3].forEach((paint, i) => {
        const cv = layers[i]; cv.width = lw; cv.height = lh;
        c = cv.getContext('2d'); c.translate(-lx, -ly); c.lineCap = 'butt'; c.lineJoin = 'round';
        paint();
      });
      c = ctx;
      // the hall's light: warm behind the glass, strongest at the floor
      hallGlow = ctx.createLinearGradient(0, Y(-HALL_H), 0, gy);
      hallGlow.addColorStop(0, veil(WARM, 0.38)); hallGlow.addColorStop(1, veil(WARM, 1));
      for (const q of STEAMS) {
        const g = ctx.createLinearGradient(0, gy, 0, Y(-q.h));
        // faint in front of the glass, clear above the roof, gone at the top
        const f = (HALL_H + 2) / q.h;
        g.addColorStop(0, veil(STEAM, 0)); g.addColorStop(0.1, veil(STEAM, 0.2)); g.addColorStop(f, veil(STEAM, 0.22)); g.addColorStop(f + 0.07, veil(STEAM, 0.66));
        g.addColorStop(0.84, veil(STEAM, 0.4)); g.addColorStop(1, veil(STEAM, 0));
        q.grad = g;
      }
      rainDash[0] = U(17); rainDash[1] = U(40);
    }

    // ---- the sheet: what stands in every station
    function sheet() {
      const xl = X(-half), xr = X(half), yt = Y(TOP), yb = Y(BOT), g0 = gy - (heavy >> 1);

      // crop marks outside the corners, the axis as a chain line
      if (!lean) {
        c.fillStyle = tone(PALE, 0.5);
        for (const [x, dx] of [[xl, -1], [xr, 1]]) for (const [y, dy] of [[yt, -1], [yb, 1]]) {
          hl(Math.min(x + dx * U(5), x + dx * U(15)), Math.max(x + dx * U(5), x + dx * U(15)), y);
          vl(x, Math.min(y + dy * U(5), y + dy * U(15)), Math.max(y + dy * U(5), y + dy * U(15)));
        }
      }
      c.fillStyle = tone(PALE, 0.24);
      dashV(ax, yt, lean ? Y(PLAN1) + rs(4 * k) + U(4) : yb, [U(18), U(4), U(2), U(4)]);

      // the ridge, one line
      c.save(); c.beginPath(); c.rect(xl, yt, xr - xl + 1, yb - yt); c.clip();
      c.beginPath(); RIDGE.forEach(([u, v], i) => (i ? c.lineTo(ax + u * k + 0.5, gy + v * k + 0.5) : c.moveTo(ax + u * k + 0.5, gy + v * k + 0.5)));
      c.strokeStyle = tone(PALE, 0.4); c.lineWidth = fine; c.stroke();
      c.restore();

      // firs: a triangle on a stem
      for (const [u, h] of firs) {
        const wd = h * 0.17;
        if (Math.abs(u) + wd > half - 4) continue;
        const x = X(u), xa = X(u - wd), xb = X(u + wd), y1 = Y(-h * 0.14), y0 = Y(-h);
        c.beginPath(); c.moveTo(x + 0.5, y0 + 0.5); c.lineTo(xb + 0.5, y1 + 0.5); c.lineTo(xa + 0.5, y1 + 0.5); c.closePath();
        c.fillStyle = INK_C; c.fill(); c.strokeStyle = tone(PALE, 0.5); c.lineWidth = fine; c.stroke();
        c.fillStyle = tone(PALE, 0.5); vl(x, y1, g0 - 1);
      }

      // the ground, cut: a heavy line, the basin below it, the water level with the deck
      const pa = X(-POOL), pb = X(POOL), pf = Y(DEPTH);
      c.fillStyle = veil(WATER, 0.07); c.fillRect(pa, gy, pb - pa, pf - gy);
      c.fillStyle = tone(WATER, 0.34);
      dashH(pa + U(10), pb - U(10), Y(DEPTH * 0.36), [U(12), U(6)]); dashH(pa + U(19), pb - U(19), Y(DEPTH * 0.68), [U(12), U(6)]);
      c.fillStyle = tone(PALE, 0.9);
      hl(xl, pa, gy, heavy); hl(pb, xr, gy, heavy); vl(pa, gy, pf, heavy); vl(pb, gy, pf, heavy); hl(pa, pb, pf, heavy);
      c.fillStyle = tone(WATER, 0.95); hl(pa + heavy, pb - heavy, g0);

      // the wings: timber boards, a thin roof slab that overhangs outwards
      for (const d of [-1, 1]) {
        const xa = Math.min(X(d * HALL), X(d * WING)), xb = Math.max(X(d * HALL), X(d * WING)), yw = Y(-WING_H);
        c.fillStyle = INK_C; c.fillRect(xa, yw, xb - xa + 1, g0 - yw);
        c.fillStyle = tone(PALE, 0.17);
        for (let x = xa + pitch; x < xb; x += pitch) vl(x, yw + slabW, g0 - 1);
        c.fillStyle = tone(PALE, 0.8); vl(X(d * WING), yw, g0 - 1);
        const ra = Math.min(X(d * HALL), X(d * (WING + EAVE))), rb = Math.max(X(d * HALL), X(d * (WING + EAVE)));
        c.fillStyle = INK_C; c.fillRect(ra, yw, rb - ra + 1, slabW);
        c.fillStyle = tone(PALE, 0.92); box(ra, yw, rb, yw + slabW - 1);
      }
      // the hall: glass from floor to roof on the module, a rail level with the wings' roofs,
      // a lamp in every bay; its light is drawn underneath, per picture
      const ha = X(-HALL), hb = X(HALL), yh = Y(-HALL_H), yr = Y(-WING_H);
      c.fillStyle = tone(SOFT, 0.42); hl(ha, hb, yr);
      c.fillStyle = tone(SOFT, 0.86);
      for (let i = 0; i <= 7; i++) vl(X(-HALL + i * M), yh + slabH, g0 - 1);
      const yl = Math.round((yh + slabH + yr) / 2);
      for (let i = 0; i < 7; i++) {
        const x = X(-HALL + (i + 0.5) * M);
        c.fillStyle = tone(SOFT, 0.4); vl(x, yh + slabH, yl - U(4));
        c.strokeStyle = tone(GOLD, 0.95); c.lineWidth = fine; ring(x, yl, U(3));
      }
      c.fillStyle = INK_C; c.fillRect(X(-HALL - EAVE), yh, X(HALL + EAVE) - X(-HALL - EAVE) + 1, slabH);
      c.fillStyle = tone(PALE, 0.95); box(X(-HALL - EAVE), yh, X(HALL + EAVE), yh + slabH - 1);

      // one chain of dimensions under the house, the hall named below it
      const yd = Y(DIM);
      if (!lean) {
        c.fillStyle = tone(PALE, 0.36); hl(X(-WING) - U(7), X(WING) + U(7), yd);
        for (const u of [-WING, -HALL, HALL, WING]) vl(X(u), Y(DEPTH + 9), yd + U(4));
        c.strokeStyle = tone(PALE, 0.85); c.lineWidth = fine;
        for (const u of [-WING, -HALL, HALL, WING]) seg(X(u) - U(4), yd + U(4), X(u) + U(4), yd - U(4));
        for (const [u, n] of [[-165, '12,00'], [0, '21,00'], [165, '12,00']]) put(n, X(u), yd - U(6), 0, tone(PALE, 0.74), fs, 0.06, u ? 0 : U(5));
        put('HALLE', ax, yd + U(7) + cap(), 0, tone(PALE, 0.5), fs, 0.14, U(5));   // on the axis, on a plate
        // levels, right of the house
        const xm = X(252);
        c.fillStyle = tone(PALE, 0.3); dashH(X(HALL + EAVE) + U(6), xm + U(7), yh, [U(3), U(3)]);
        c.strokeStyle = tone(PALE, 0.7);
        for (const [y, txt] of [[yh, '+7,20'], [g0, '±0,00']]) {
          c.beginPath(); c.moveTo(xm - U(4) + 0.5, y - U(6) + 0.5); c.lineTo(xm + U(4) + 0.5, y - U(6) + 0.5); c.lineTo(xm + 0.5, y + 0.5); c.closePath(); c.stroke();
          put(txt, xm + U(9), y - U(5), -1, tone(PALE, 0.62), fs, 0.06, U(3));
        }
        // steam, with a leader
        const sx = X(STEAMS[1].x), sy = Y(-104);
        c.strokeStyle = tone(PALE, 0.5); seg(sx, sy, sx - U(16), sy - U(16));
        c.fillStyle = tone(PALE, 0.5); hl(sx - U(16) - U(8), sx - U(16), sy - U(16)); dot(sx, sy, 1.4 * dpr);
        put('DAMPF', sx - U(16) - U(13), sy - U(16) + (cap() >> 1), 1, tone(PALE, 0.62), fs, 0.14, U(4));
      }

      // the pool in plan, under its section: the water's edge, the coping around it
      const p0 = Y(PLAN0), p1 = Y(PLAN1), o = rs(4 * k);
      c.fillStyle = veil(WATER, 0.07); c.fillRect(pa, p0, pb - pa, p1 - p0);
      c.fillStyle = tone(PALE, 0.32); box(pa - o, p0 - o, pb + o, p1 + o);
      c.fillStyle = tone(WATER, 0.9); box(pa, p0, pb, p1);
      c.strokeStyle = tone(GOLD, 0.55); c.lineWidth = fine;
      for (let u = -120; u <= 120; u += M) ring(X(u), Y(PLAN1 - 7), U(2.5));
      if (lean) {   // its name under it, in one line; nothing else on a small sheet
        const w = put('AUSSENBECKEN', pa - o, p1 + o + U(9) + cap(), -1, tone(WATER, 0.92));
        put('34 °C', pa - o + Math.round(w) + U(9), p1 + o + U(9) + cap(), -1, tone(SOFT, 0.95), fs, 0.08);
        return;
      }
      const lxp = X(-120) - U(3), lyp = Y(PLAN1 - 7) - U(15);   // on the line of the first light
      put('AUSSENBECKEN', lxp, lyp - Math.round(fs * 1.55), -1, tone(WATER, 0.92));
      put('34 °C', lxp, lyp, -1, tone(SOFT, 0.95), fs, 0.08);
      // the firs from above, on the lines of the firs in the elevation
      c.strokeStyle = tone(PALE, 0.42);
      for (const [u, h, v] of firs) {
        const r = h * 0.17 * k;
        if (Math.abs(u) + h * 0.17 > half - 4) continue;
        ring(X(u), Y(v), r); c.fillStyle = tone(PALE, 0.42); hl(X(u) - U(2), X(u) + U(2), Y(v)); vl(X(u), Y(v) - U(2), Y(v) + U(2));
      }

      // north (the view looks west), a scale bar, the title block
      const nx = X(WING), ny = Y((PLAN0 + PLAN1) / 2), nr = rs(9 * k);   // on the line of the wing's end wall
      c.strokeStyle = tone(PALE, 0.5); ring(nx, ny, nr);
      c.fillStyle = tone(PALE, 0.5); hl(nx - nr, nx + nr + U(8), ny);
      c.beginPath(); c.moveTo(nx + nr + U(8) + 0.5, ny + 0.5); c.lineTo(nx + nr + 0.5, ny - U(3) + 0.5); c.lineTo(nx + nr + 0.5, ny + U(3) + 1.5); c.closePath();
      c.fillStyle = tone(PALE, 0.7); c.fill();
      put('N', nx + nr + U(14), ny + (cap() >> 1), -1, tone(PALE, 0.62));

      c.fillStyle = tone(PALE, 0.5);
      hl(pa, X(-POOL + 100), yb); for (const u of [0, 50, 100]) vl(X(-POOL + u), yb - U(4), yb);
      put('0', pa, yb - U(8), -1, tone(PALE, 0.55), fs, 0.06); put('10 m', X(-POOL + 100), yb - U(8), 0, tone(PALE, 0.55), fs, 0.06);

      const t = block();
      c.fillStyle = tone(PALE, 0.34); hl(t.x0, t.x1, t.y0); hl(t.x0, t.x1, t.ym); hl(t.x0, t.x1, t.y1); vl(t.xm, t.y0, t.y1);
      put('ANSICHT OST', t.x0 + U(1), t.b0, -1, tone(PALE, 0.7)); put('M 1:200', t.xm + U(9), t.b0, -1, tone(PALE, 0.7));
    }
    // the title block's lines and baselines, bottom right
    function block() {
      // two columns, at least as wide as their words; on the usual sheet they start on the pool's edge and the wing's end wall
      const x1 = X(half), wr = Math.max(X(half) - X(half - 102), Math.round(fs * 8.4)), wl = Math.max(rs(90 * k), Math.round(fs * 10.8));
      const onLines = half - POOL >= 184 && half - POOL <= 200 && wl === rs(90 * k);
      const xm = onLines ? X(WING) : x1 - wr, x0 = onLines ? X(POOL) : xm - wl;
      const y1 = Y(BOT), rh = Math.round(fs * 1.9), ym = y1 - rh, y0 = ym - rh, off = Math.round((rh + cap()) / 2);
      return { x0, x1, xm, y0, ym, y1, b0: y0 + off, b1: ym + off };
    }
    // the station's name and number in the title block
    function stamp(name, n) {
      if (lean) return;
      const t = block();
      put(name, t.x0 + U(1), t.b1, -1, tone(SOFT, 0.95)); put(`BLATT ${n}/3`, t.xm + U(9), t.b1, -1, tone(PALE, 0.7));
    }
    const skyX = () => X(Math.min(304, half - 24));    // where the sky's sign stands: star, rain; over the fir on the right

    // ---- 01: the blue hour. The evening star in the west
    function station1() {
      const x = skyX(), y = Y(-204);
      c.fillStyle = tone(SOFT, 1); dot(x, y, 1.5 * dpr);
      c.fillStyle = tone(SOFT, 0.8);
      hl(x + U(4), x + U(8), y); hl(x - U(8), x - U(4), y); vl(x, y + U(4), y + U(8)); vl(x, y - U(8), y - U(4));
      put('ABENDSTERN', x - U(17), y + (cap() >> 1), 1, tone(PALE, 0.62));
      stamp('BLAUE STUNDE', 1);
    }

    // ---- 02: rain. Its sign and name; the hall's light falls further onto the water
    function station2() {
      const x = skyX(), y = Y(-204);
      c.fillStyle = INK_C; c.fillRect(x - U(11), y - U(11), U(22), U(22));   // a quiet plate in the rain, the word's plate joins it
      put('REGEN', x - U(17), y + (cap() >> 1), 1, tone(RAIN, 0.95), fs, 0.14, U(8));
      c.fillStyle = tone(RAIN, 1);
      dot(x - U(4), y + U(3), 1.5 * dpr); dot(x + U(4), y + U(3), 1.5 * dpr); dot(x, y - U(4), 1.5 * dpr);   // the weather map's sign for steady rain
      // the lit bays on the water: in the section as a warm line, in the plan as marks from the far edge
      const g0 = gy - (heavy >> 1);
      c.fillStyle = tone(WARM, 0.95);
      for (let i = 0; i < 7; i++) hl(X(-HALL + i * M) + U(5), X(-HALL + (i + 1) * M) - U(5), g0 + heavy + fine, fine);
      c.fillStyle = tone(WARM, 0.6);
      for (let i = 0; i < 7; i++) dashV(X(-HALL + (i + 0.5) * M), Y(PLAN0) + U(5), Y(PLAN0 + 46), [U(7), U(4)]);
      stamp('REGEN', 2);
    }

    // ---- 03: a summer evening. The sun over the saddle, its path, its rays on the water, the pool's lights
    function station3() {
      const sx = ax + SUN.x * k, sy = gy + SUN.y * k, r = SUN.r * k;
      // the path: an arc that falls to the right at 41°, hidden behind the ridge after the sun
      const R = 700 * k, a0 = -49 * Math.PI / 180, cx = sx - R * Math.cos(a0), cy = sy - R * Math.sin(a0);
      c.strokeStyle = tone(GOLD, 0.62); c.lineWidth = fine;
      c.beginPath(); c.arc(cx + 0.5, cy + 0.5, R, a0 - 0.172, a0 - r / R - U(5) / R); c.stroke();
      c.setLineDash([U(4), U(4)]); c.beginPath(); c.arc(cx + 0.5, cy + 0.5, R, a0 + r / R + U(9) / R, a0 + 0.052); c.stroke(); c.setLineDash(NODASH);
      // the sun: a circle with its centre lines
      c.fillStyle = veil(WARM, 0.16); c.beginPath(); c.arc(sx + 0.5, sy + 0.5, r, 0, 6.2832); c.fill();
      c.strokeStyle = tone(GOLD, 1); c.lineWidth = Math.max(fine, 1.3 * dpr); ring(Math.round(sx), Math.round(sy), r); c.lineWidth = fine;
      c.fillStyle = tone(GOLD, 0.7);
      const e = Math.round(r) + U(6), cxp = Math.round(sx), cyp = Math.round(sy);
      dashH(cxp - e, cxp + e, cyp, [U(8), U(3), U(2), U(3)]); dashV(cxp, cyp - e, cyp + e, [U(8), U(3), U(2), U(3)]);
      // its note, on a leader
      const q = r * 0.7071, x0 = Math.round(sx + q) + U(2), y0 = Math.round(sy - q) - U(2), d = U(lean ? 12 : 22);
      c.strokeStyle = tone(SOFT, 0.6); seg(x0, y0, x0 + d, y0 - d);
      c.fillStyle = tone(SOFT, 0.6); hl(x0 + d, x0 + d + U(7), y0 - d);
      put('SONNE 20 UHR', x0 + d + U(12), y0 - d + (cap() >> 1), -1, tone(SOFT, 0.95));
      if (!lean) put('HÖHE 11°', x0 + d + U(12), y0 - d + (cap() >> 1) + Math.round(fs * 1.6), -1, tone(PALE, 0.62));

      // the rays in the plan: parallel, 23° off the axis, drawn through the water
      const p0 = Y(PLAN0), p1 = Y(PLAN1), mid = (PLAN0 + PLAN1) / 2;
      c.strokeStyle = tone(GOLD, 0.8);
      for (let j = 0; j < 4; j++) {
        const xu = j * M, at = v => ax + (xu - (v - mid) * RAY) * k;   // the first ray crosses the axis in the pool's middle
        seg(at(PLAN0 - 17), Y(PLAN0 - 17), at(PLAN0) - 0.2, p0 - U(1));
        c.setLineDash([U(6), U(4)]); seg(at(PLAN0), p0 + U(2), at(PLAN1), p1 - U(2)); c.setLineDash(NODASH);
      }
      // the angle between the axis and the first ray
      const ym = Y(mid), ra = 30 * k;
      if (!lean) {
        c.strokeStyle = tone(SOFT, 0.8); c.beginPath(); c.arc(ax + 0.5, ym + 0.5, ra, -Math.PI / 2, -Math.PI / 2 + 23 * Math.PI / 180); c.stroke();
        put('23°', ax - U(7), ym - Math.round(ra) + cap(), 1, tone(SOFT, 0.95), fs, 0.06);
      }
      // and where the sun lies on the water in the section
      c.fillStyle = tone(GOLD, 0.95); hl(X(SUN.x - 14), X(SUN.x + 14), gy - (heavy >> 1) + heavy + fine);
      // the lights along the near edge
      c.strokeStyle = tone(GOLD, 1);
      for (let u = -120; u <= 120; u += M) ring(X(u), Y(PLAN1 - 7), U(2.5));
      if (!lean) put('BECKENLICHT', X(-POOL), p1 + rs(4 * k) + U(8) + cap(), -1, tone(SOFT, 0.9));
      stamp('SOMMERABEND', 3);
    }

    // ---- what moves
    function rain(t, a) {
      if (a < 0.01) return;
      const xl = X(-half), xr = X(half), yt = Y(TOP), yb = gy - heavy;
      const sn = 0.2079, cs = 0.9781, L = (yb - yt) / cs, gap = U(13), P = rainDash[0] + rainDash[1], len = rainDash[0], sp = 150 * dpr;
      ctx.save(); ctx.beginPath(); ctx.rect(xl, yt, xr - xl + 1, yb - yt); ctx.clip();
      ctx.beginPath();
      // parallel strokes on a fixed lattice; the whole hatch slides down its own direction
      for (let i = 0, x0 = xl; x0 < xr + L * sn; i++, x0 += gap) {
        for (let s = ((i * 0.618034) % 1 * P + t * sp) % P - P; s < L; s += P) {
          ctx.moveTo(x0 - s * sn, yt + s * cs); ctx.lineTo(x0 - (s + len) * sn, yt + (s + len) * cs);
        }
      }
      ctx.strokeStyle = RAIN_C; ctx.globalAlpha = 0.38 * a; ctx.lineWidth = fine; ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    }

    function steam(t, w2) {
      // fine waves that travel upwards; they leave the water straight
      ctx.lineWidth = fine;
      const n = 48, kw = 6.2832 / 36;
      for (const q of STEAMS) {
        const a = q.extra ? w2 : 0.82 + 0.18 * w2;
        if (a < 0.01) continue;
        ctx.globalAlpha = a; ctx.strokeStyle = q.grad;
        const x0 = ax + q.x * k + 0.5;
        ctx.beginPath(); ctx.moveTo(x0, gy);
        for (let j = 1; j <= n; j++) { const h = q.h * j / n; ctx.lineTo(x0 + q.amp * k * Math.min(1, h / 30) * Math.sin(kw * (h - t * 5) + q.ph), gy - h * k); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function ripples(t, w2) {
      const pa = X(-POOL), pb = X(POOL), p0 = Y(PLAN0), p1 = Y(PLAN1);
      ctx.save(); ctx.beginPath(); ctx.rect(pa + fine, p0 + fine, pb - pa - fine, p1 - p0 - fine); ctx.clip();
      ctx.strokeStyle = WATER_C; ctx.lineWidth = fine;
      for (const r of RINGS) {
        const a = r.calm ? Math.max(0.4, w2) : w2;
        if (a < 0.01) continue;
        const u = (r.ph + t * r.sp * (r.calm ? 0.55 + 0.45 * w2 : 1)) % 1, x = ax + r.x * k + 0.5, y = gy + r.v * k + 0.5, R = 15 * k;
        for (let i = 0; i < 3; i++) {
          const v = u - i * 0.22;
          if (v <= 0) break;
          ctx.globalAlpha = 0.7 * a * (1 - u) * (1 - i * 0.25); ctx.beginPath(); ctx.arc(x, y, R * v, 0, 6.2832); ctx.stroke();
        }
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    function lights(t, w2, w3) {
      // the lamps in the hall and the lights in the pool breathe slowly
      const yh = Y(-HALL_H), yl = Math.round((yh + slabH + Y(-WING_H)) / 2);
      ctx.fillStyle = SOFT_C; ctx.globalAlpha = clamp(0.62 + 0.3 * Math.max(w2, 0.6 * w3) + 0.08 * Math.sin(t * 0.8), 0, 1);
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(X(-HALL + (i + 0.5) * M) + 0.5, yl + 0.5, 1.4 * dpr, 0, 6.2832); ctx.fill(); }
      ctx.fillStyle = WARM_C;
      const y = Y(PLAN1 - 7) + 0.5;
      for (let i = 0; i < 9; i++) {
        ctx.globalAlpha = clamp((0.22 + 0.78 * w3 + 0.2 * w2) * (0.86 + 0.14 * Math.sin(t * 0.9 + i * 0.7)), 0, 1);
        ctx.beginPath(); ctx.arc(X(-120 + i * M) + 0.5, y, 1.3 * dpr, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function draw(st) {
      if (canvas.width !== Wd || canvas.height !== Hd || st.dpr !== dpr || st.phone !== phone || fontsIn !== fontsDrawn) { fontsDrawn = fontsIn; layout(st); }
      const t = st.t, w2 = st.w[1], w3 = st.w[2];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.fillStyle = INK_C; ctx.fillRect(0, 0, Wd, Hd);
      rain(t, w2);
      // the hall's light behind the glass (no rain in there), stronger in the rain, breathing slowly
      const ha = X(-HALL), yh = Y(-HALL_H);
      ctx.fillStyle = INK_C; ctx.fillRect(ha, yh, X(HALL) - ha, gy - yh);
      ctx.fillStyle = hallGlow; ctx.globalAlpha = 0.25 + 0.16 * w2 + 0.05 * w3 + 0.018 * Math.sin(t * 0.8);
      ctx.fillRect(ha, yh, X(HALL) - ha, gy - yh); ctx.globalAlpha = 1;
      ctx.drawImage(layers[0], lx, ly);
      // a station's notes leave before the next one's come: two words never stand in one place
      for (let i = 0; i < 3; i++) {
        const u = clamp((st.w[i] - 0.4) / 0.6, 0, 1), a = u * u * (3 - 2 * u);
        if (a > 0.004) { ctx.globalAlpha = a; ctx.drawImage(layers[i + 1], lx, ly); }
      }
      ctx.globalAlpha = 1;
      ripples(t, w2);
      lights(t, w2, w3);
      steam(t, w2);
    }

    // the sheet's letters are drawn into the layers: draw them again once Manrope is there
    if (document.fonts && document.fonts.load) {
      document.fonts.load(`500 12px ${FONT}`, 'AÜ±°×').then(() => { fontsIn++; }, () => {});
      if (document.fonts.ready) document.fonts.ready.then(() => { fontsIn++; });
    }

    return { draw };
  } });
})();
