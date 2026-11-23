/* ============ BLAUE STUNDE — the two tools as models in the Raum style (3D) ============
   For <section class="tools" id="werkzeuge"> (home page, "Das richtige Werkzeug"). Each side
   gets one small model above its text, made like the process model (js/steps.js: a tray of
   dark stone, raised three-quarter view through a long lens, raw WebGL, no library):

   Von Hand   a film camera on its tripod and one film light, pointed at the logo's ridge:
              two summits, the bigger one left, the low sun in the saddle. A red lamp on the
              camera: it is recording.
   Mit KI     the week of the editorial plan as an object: a board with seven tiles in a row.
              Three are lit (posted), four are outlined in brass (planned), and a line of
              brass between the third and the fourth is today. The words (Mo to So, heute,
              the legend) are HTML over the canvas, taken from the flat picture's own text.

   How it is made
   - one static mesh per side (boxes, sticks, a barrel, a folded ridge), shaded per face:
     light from the sky and the warm lamps that are switched on
   - contact shadows, the brass line and the tiles' outlines are drawn by the shaders
   - both pictures share one view and one scale, so the two trays stand on one line
   - each draws in once when it scrolls into view (about three seconds: the film light and
     the red lamp come on and the sun rises into the saddle; the three posted tiles light one
     after the other, then today's line is drawn), then it rests: a camera drift of half a
     degree, the red lamp blinks
   - it runs only while on screen; reduced motion: the finished picture at once, nothing moves
   The flat pictures (<svg class="tools__art">) stay in the page. A side whose model is ready
   gets .tools__side--raum, which hides its flat picture (style.css); no WebGL, a shader that
   does not compile, or a lost context: no canvas, and the flat picture shows as before,
   drawn in by .tools--in. Own file: an error here cannot stop the scroll engine.
   ====================================================================================== */
(() => {
  const section = document.querySelector('.tools');
  if (!section) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 2026-11-23: the section shows one picture (.tools--picture, index.html) instead of the models. Three
  // sketches exist; the page carries sketch 2, ?werkzeug=1 or ?werkzeug=3 swaps in another. Sketch 1 is two
  // trays: on phones each stands above its own text. The picture comes up when it scrolls into view and
  // goes back once it is well off screen, so it comes up again on the way back.
  const fig = section.querySelector('.tools__picture');
  if (fig) {
    const SIZE = {"tools-1-1920.webp": [1920, 570], "tools-1-960.webp": [960, 285], "tools-1-hand-900.webp": [900, 558], "tools-1-ki-900.webp": [900, 550], "tools-2-1920.webp": [1920, 1120], "tools-2-960.webp": [960, 560], "tools-3-1920.webp": [1920, 876], "tools-3-960.webp": [960, 438]};
    const v = (new URLSearchParams(location.search).get('werkzeug') || '').trim();
    const img = fig.querySelector('img');
    if ((v === '1' || v === '3') && img) {
      const at = f => img.getAttribute('src').replace('tools-2-1920.webp', f);
      const wide = `tools-${v}-1920.webp`, small = `tools-${v}-960.webp`;
      img.srcset = `${at(small)} 960w, ${at(wide)} 1920w`; img.src = at(wide);
      img.width = SIZE[wide][0]; img.height = SIZE[wide][1];
      fig.dataset.pic = v; section.dataset.pic = v;
      if (v === '1') for (const [cls, f] of [['hand', 'tools-1-hand-900.webp'], ['ai', 'tools-1-ki-900.webp']]) {
        const side = section.querySelector('.tools__side--' + cls); if (!side) continue;
        const i = new Image(); i.className = 'tools__side-pic'; i.alt = ''; i.decoding = 'async';
        i.width = SIZE[f][0]; i.height = SIZE[f][1]; i.src = at(f);
        side.prepend(i);
      }
    }
    if (still || !('IntersectionObserver' in window)) section.classList.add('tools--shown');
    else {
      new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) section.classList.add('tools--shown'); }, { threshold: 0.2 }).observe(section.querySelector('.tools__split'));
      new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) section.classList.add('tools--shown'); }, { threshold: 0.25 }).observe(fig);
      new IntersectionObserver(es => { if (!es.some(e => e.isIntersecting)) section.classList.remove('tools--shown'); }, { rootMargin: '30% 0px 30% 0px' }).observe(section);
    }
    return;
  }

  // ---- the flat pictures: drawn in once one of them scrolls into view (the CSS holds the
  // hidden start state only while .tools--in is missing). Hidden ones never report, so this
  // only acts where a model is missing or lost.
  const show = () => section.classList.add('tools--in');
  if (still || !('IntersectionObserver' in window)) show();
  else {
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      show(); io.disconnect();
    }, { threshold: 0.4 });
    for (const art of section.querySelectorAll('.tools__art')) io.observe(art);
  }
  if (!('ResizeObserver' in window) || !window.WebGLRenderingContext) return;

  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = u => u * u * (3 - 2 * u);
  let seed = 31;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // fixed, so every visit looks the same
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lin = (r, g, b) => [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];   // site colours into linear light

  // ---- both models, in metres or so: x to the right, y up, z towards us; the tray is the same
  const XL = -3.3, XR = 3.3, ZB = -1.6, ZF = 1.4, BASE = -0.45;          // the tray: left, right, back, front, underside
  const AZ = 6 * Math.PI / 180, EL = 24 * Math.PI / 180, DIST = 150;     // the view: from the right, raised, far away
  const TARGET = [0, 0.5, -0.1];
  // the ridge (left model): the logo's line, foot to foot (u from -1 to 1, height as a share of the big summit)
  const MX = -1.05, MW = 2.2, MH = 2.05, RIDGE_Z = -0.95, FOOT_Z = -0.05;
  const CREST = [[-1, 0], [-0.9, 0.16], [-0.74, 0.29], [-0.56, 0.44], [-0.4, 0.67], [-0.28, 0.89], [-0.19, 1], [-0.1, 0.85],
    [0.02, 0.63], [0.15, 0.46], [0.27, 0.39], [0.36, 0.46], [0.45, 0.56], [0.53, 0.61], [0.62, 0.51], [0.74, 0.34], [0.88, 0.18], [1, 0]];
  const SADDLE = 10;                                                     // its index in CREST
  const CAM = [1.7, 0.6], LIGHT = [2.75, -0.25], LIGHT_Y = 1.9;         // the camera's tripod, the film light's stand and head
  // the board (right model): seven tiles, the first three posted; today's line stands after the third
  const TILE_W = 0.56, TILE_H = 0.84, PITCH = 0.73, TILE_Y = 0.2, BOARD_Z = 0.3, BOARD_TOP = 1.24, LEAN = 0.17, DONE = 3;
  const TODAY_X = (DONE - 3.5) * PITCH;

  // materials: albedo in linear light; what shines is set above 1, so that after the picture's soft
  // shoulder the lit tiles land on the site's warm window light
  const C = {
    stone: [0.13, 0.145, 0.165], side: [0.075, 0.085, 0.10], slab: [0.085, 0.095, 0.115], slabTop: [0.2, 0.215, 0.24],
    dark: [0.03, 0.03, 0.035], metal: [0.25, 0.265, 0.3], panel: [1.25, 0.82, 0.36], brass: [1.0, 0.6, 0.14], rec: [1.7, 0.06, 0.035],
  };
  // material ids, read by the shader
  const M = { plain: 0, stone: 2, light: 4, rock: 5, table: 6, side: 7, tile: 9 };
  const OFF = 7;   // a switch that stays off (the planned tiles)

  // ---- mesh: 12 floats a corner (place, normal, colour, material, occlusion, what switches it on)
  let V = [], G = -1, T = null;
  const put = (p, n, c, m, ao) => { V.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], m, ao, G); };
  const X = p => T ? T(p) : p;   // T moves what is built: a turn, a lean
  const turn = (x, z, a) => { const c = Math.cos(a), s = Math.sin(a); return p => [x + (p[0] - x) * c + (p[2] - z) * s, p[1], z - (p[0] - x) * s + (p[2] - z) * c]; };
  const lean = (z, a) => { const c = Math.cos(a), s = Math.sin(a); return p => [p[0], p[1] * c + (p[2] - z) * s, z - p[1] * s + (p[2] - z) * c]; };
  function quad(a, b, c, d, col, m, ao) {   // a..d counter-clockwise seen from outside
    a = X(a); b = X(b); c = X(c); d = X(d);
    const n = norm(cross(sub(b, a), sub(c, a))), o = ao || [1, 1, 1, 1];
    put(a, n, col, m, o[0]); put(b, n, col, m, o[1]); put(c, n, col, m, o[2]);
    put(a, n, col, m, o[0]); put(c, n, col, m, o[2]); put(d, n, col, m, o[3]);
  }
  function quadO(a, b, c, d, col, m, out) {   // the same, turned so it faces `out` (as built, before T)
    if (dot(cross(sub(b, a), sub(c, a)), out) < 0) quad(a, d, c, b, col, m);
    else quad(a, b, c, d, col, m);
  }
  function tri(a, b, c, ca, cb, cc, m, out) {   // flat, turned so it faces `out`
    let n = norm(cross(sub(b, a), sub(c, a)));
    if (dot(n, out) < 0) { n = [-n[0], -n[1], -n[2]]; put(a, n, ca, m, 1); put(c, n, cc, m, 1); put(b, n, cb, m, 1); }
    else { put(a, n, ca, m, 1); put(b, n, cb, m, 1); put(c, n, cc, m, 1); }
  }
  // a box; o.b / o.t: occlusion at the foot and the top of its walls, o.top: another colour on top
  function box(x0, y0, z0, x1, y1, z1, col, m, o) {
    o = o || {};
    const b = o.b === undefined ? 1 : o.b, t = o.t === undefined ? 1 : o.t, s = [b, b, t, t];
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col, m, s);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, m, s);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, m, s);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, m, s);
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], o.top || col, m);
    quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col, m, [b, b, b, b]);
  }
  // any solid with eight corners: 0-3 one end, 4-7 the other, in the same order
  function solid(p, col, m) {
    const c = [0, 0, 0];
    for (const q of p) { c[0] += q[0] / 8; c[1] += q[1] / 8; c[2] += q[2] / 8; }
    for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) {
      const a = p[f[0]], b = p[f[1]], d = p[f[2]], e = p[f[3]];
      quadO(a, b, d, e, col, m, [(a[0] + b[0] + d[0] + e[0]) / 4 - c[0], (a[1] + b[1] + d[1] + e[1]) / 4 - c[1], (a[2] + b[2] + d[2] + e[2]) / 4 - c[2]]);
    }
  }
  // a thin square rod from a to b (tripod legs, stands)
  function stick(a, b, w, col) {
    const d = norm(sub(b, a)), u = norm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), v = cross(d, u), p = [];
    for (const e of [a, b]) for (const [su, sv] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) p.push(add(add(e, u, su * w), v, sv * w));
    solid(p, col, M.plain);
  }
  // a faceted barrel along x (the lens)
  function barrel(x0, x1, y, z, r, col) {
    const n = 10, at = (x, a) => [x, y + r * Math.sin(a), z + r * Math.cos(a)];
    for (let i = 0; i < n; i++) {
      const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, am = (a0 + a1) / 2;
      quadO(at(x0, a0), at(x1, a0), at(x1, a1), at(x0, a1), col, M.plain, [0, Math.sin(am), Math.cos(am)]);
    }
  }
  // a tile's face: the colour slot carries the place on the face, the shader draws its outline or its light
  function tile(xc, yc, z, g) {
    const hw = TILE_W / 2, hh = TILE_H / 2, c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => [X([xc + su * hw, yc + sv * hh, z]), [su * hw, sv * hh, 0]]);
    const n = norm(cross(sub(c[1][0], c[0][0]), sub(c[2][0], c[0][0]))), g0 = G;
    G = g;
    for (const i of [0, 1, 2, 0, 2, 3]) put(c[i][0], n, c[i][1], M.tile, 1);
    G = g0;
  }

  // ---- small matrix kit (column-major, as GL wants it); nothing is allocated per frame
  const view = new Float32Array(16), VP = new Float32Array(16);
  const eye = [0, 0, 0], right = [0, 0, 0], upv = [0, 0, 1], F = [0, 0, 0];
  function mul(out, a, b) {
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  function camera(az, el) {   // fills view, eye, right, up
    const ce = Math.cos(el);
    F[0] = -Math.sin(az) * ce; F[1] = -Math.sin(el); F[2] = -Math.cos(az) * ce;                 // forward
    eye[0] = TARGET[0] - DIST * F[0]; eye[1] = TARGET[1] - DIST * F[1]; eye[2] = TARGET[2] - DIST * F[2];
    const sl = Math.hypot(F[2], F[0]);
    right[0] = -F[2] / sl; right[1] = 0; right[2] = F[0] / sl;                                  // forward x up
    upv[0] = right[1] * F[2] - right[2] * F[1]; upv[1] = right[2] * F[0] - right[0] * F[2]; upv[2] = right[0] * F[1] - right[1] * F[0];
    view[0] = right[0]; view[1] = upv[0]; view[2] = -F[0]; view[3] = 0;
    view[4] = right[1]; view[5] = upv[1]; view[6] = -F[1]; view[7] = 0;
    view[8] = right[2]; view[9] = upv[2]; view[10] = -F[2]; view[11] = 0;
    view[12] = -(right[0] * eye[0] + right[1] * eye[1] + right[2] * eye[2]);
    view[13] = -(upv[0] * eye[0] + upv[1] * eye[1] + upv[2] * eye[2]);
    view[14] = F[0] * eye[0] + F[1] * eye[1] + F[2] * eye[2]; view[15] = 1;
  }
  // where a point lands in the standing camera's picture, in model units from its middle
  const seen = p => {
    const zv = view[2] * p[0] + view[6] * p[1] + view[10] * p[2] + view[14];
    return [DIST * (view[0] * p[0] + view[4] * p[1] + view[8] * p[2] + view[12]) / -zv, DIST * (view[1] * p[0] + view[5] * p[1] + view[9] * p[2] + view[13]) / -zv];
  };
  // what has to fit into either picture (the same box for both, so the trays stand level):
  // the tray, the big summit, the film light's head
  camera(AZ, EL);
  const BOX = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
  {
    const fit = [[MX - 0.19 * MW, MH, RIDGE_Z], [LIGHT[0], LIGHT_Y + 0.38, LIGHT[1]]];
    for (const x of [XL, XR]) for (const z of [ZB, ZF]) fit.push([x, 0, z], [x, BASE, z]);
    for (const p of fit) { const s = seen(p); BOX.x0 = Math.min(BOX.x0, s[0]); BOX.x1 = Math.max(BOX.x1, s[0]); BOX.y0 = Math.min(BOX.y0, s[1]); BOX.y1 = Math.max(BOX.y1, s[1]); }
  }

  // ---- what both models are made of
  const blank = () => {
    const m = { lp: new Float32Array(9), ld: new Float32Array(12), li: [0, 0, 0], foot: new Float32Array(8), spot: new Float32Array(12), seg: new Float32Array(4), glow: [], mark: 1e4 };
    for (let i = 0; i < 4; i++) { m.spot[i * 3] = 1e4; m.spot[i * 3 + 2] = 1; }
    for (let i = 0; i < 3; i++) m.lp[i * 3 + 1] = 50;   // a lamp that is not there: far away, and off
    m.nl = 0;
    return m;
  };
  // a lamp: where, which way, how much of a spot, how strong; and its glow in the air
  const lamp = (m, p, d, w, power, size) => {
    d = norm(d);
    m.lp.set(p, m.nl * 3); m.ld.set([d[0], d[1], d[2], w], m.nl * 4); m.li[m.nl] = power; m.glow.push([p[0], p[1], p[2], size]); m.nl++;
  };
  const foot = (m, i, x0, z0, x1, z1) => { m.foot.set([(x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2], i * 4); };
  // the tray (stone on top, cut faces around) and, last, the table under it: only its shadow shows
  function tray(m) {
    T = null; G = -1;
    quad([XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], C.stone, M.stone);
    const g = [1, 1, 0.35, 0.35];
    quad([XL, 0, ZF], [XL, BASE, ZF], [XR, BASE, ZF], [XR, 0, ZF], C.side, M.side, g);
    quad([XR, 0, ZF], [XR, BASE, ZF], [XR, BASE, ZB], [XR, 0, ZB], C.side, M.side, g);
    quad([XL, 0, ZB], [XL, BASE, ZB], [XL, BASE, ZF], [XL, 0, ZF], C.side, M.side, g);
    quad([XR, 0, ZB], [XR, BASE, ZB], [XL, BASE, ZB], [XL, 0, ZB], C.side, M.side, g);
    quad([XL - 14, BASE, ZF + 14], [XR + 14, BASE, ZF + 14], [XR + 14, BASE, ZB - 14], [XL - 14, BASE, ZB - 14], C.side, M.table);
    m.n = V.length / 12; m.data = new Float32Array(V); V = [];
    return m;
  }

  // ---- Von Hand: the ridge, the camera, the film light
  function buildHand() {
    V = []; G = -1; T = null; seed = 31;
    camera(AZ, EL);
    const m = blank();
    m.crest = [];

    // the mountain: one folded ridge, four rows from the foot to the crest, ribs and gullies in turn;
    // it lies on the tray like a stone, narrowing to a point at both feet
    const n = CREST.length, cols = [], q = MH / 3.4;
    for (let i = 0; i < n; i++) {
      const end = i === 0 || i === n - 1, x = MX + CREST[i][0] * MW, h = CREST[i][1] * MH, k = Math.min(1, h / (1.2 * q));
      const rib = i % 2 === 0, j = end ? 0 : k * q;
      const zc = RIDGE_Z + ((rib ? 0.22 : -0.18) + (rnd() - 0.5) * 0.26) * k * q;
      const zf = RIDGE_Z + 0.2 * q + (FOOT_Z - RIDGE_Z - 0.2 * q + (rib ? 0.2 : -0.16) * q) * k;
      const at = (f, hf, jx) => [x + j * (rnd() - 0.5) * jx, h * hf, zf + (zc - zf) * f];
      cols.push([at(0, 0, 0.3), at(rib ? 0.36 : 0.47, rib ? 0.33 : 0.25, 0.5), at(rib ? 0.7 : 0.8, rib ? 0.7 : 0.6, 0.4), [x, h, zc], [x, h * 0.5, ZB]]);
      m.crest.push(x, h + 0.008, zc + 0.008);
      if (i === SADDLE) m.saddle = [x, h, zc];
    }
    const rock = p => { const u = Math.min(1, p[1] / MH), v = u * u; return [0.05 + 0.07 * u + 0.07 * v, 0.062 + 0.08 * u + 0.075 * v, 0.085 + 0.09 * u + 0.08 * v]; };
    for (let i = 0; i < n - 1; i++) for (let r = 0; r < 4; r++) {
      const a = cols[i][r], b = cols[i + 1][r], c = cols[i + 1][r + 1], d = cols[i][r + 1], out = [0, 1, r < 3 ? 0.4 : -0.4];
      if ((i + r) % 2 === 0) { tri(a, b, c, rock(a), rock(b), rock(c), M.rock, out); tri(a, c, d, rock(a), rock(c), rock(d), M.rock, out); }
      else { tri(a, b, d, rock(a), rock(b), rock(d), M.rock, out); tri(b, c, d, rock(b), rock(c), rock(d), M.rock, out); }
    }
    foot(m, 0, MX - MW * 0.8, ZB + 0.1, MX + MW * 0.8, FOOT_Z - 0.1);

    // the camera on its tripod; the lens looks at the ridge, we see its side and its back
    {
      const x = CAM[0], z = CAM[1], H = 1.2;
      for (let k = 0; k < 3; k++) { const a = 0.35 + k * 2.0944; stick([x + 0.56 * Math.cos(a), 0, z + 0.56 * Math.sin(a)], [x, H, z], 0.024, C.dark); }
      box(x - 0.08, H - 0.04, z - 0.08, x + 0.08, H + 0.07, z + 0.08, C.dark, M.plain);
      T = turn(x, z, -0.4);
      stick([x + 0.1, H + 0.02, z + 0.03], [x + 0.78, H - 0.26, z + 0.1], 0.016, C.dark);                       // the pan handle
      box(x - 0.36, H + 0.07, z - 0.2, x + 0.46, H + 0.57, z + 0.2, C.metal, M.plain, { b: 0.7 });              // the body
      barrel(x - 0.68, x - 0.36, H + 0.32, z, 0.145, C.dark);                                                   // the lens
      box(x - 0.86, H + 0.1, z - 0.26, x - 0.68, H + 0.54, z + 0.26, C.dark, M.plain);                          // its matte box
      box(x + 0.46, H + 0.13, z - 0.15, x + 0.6, H + 0.49, z + 0.15, C.dark, M.plain);                          // the battery
      for (const d of [-0.16, 0.28]) box(x + d - 0.025, H + 0.57, z - 0.04, x + d + 0.025, H + 0.68, z + 0.04, C.dark, M.plain);
      box(x - 0.21, H + 0.68, z - 0.045, x + 0.33, H + 0.74, z + 0.045, C.dark, M.plain);                       // the handle
      G = 1;
      box(x + 0.3, H + 0.42, z + 0.2, x + 0.38, H + 0.5, z + 0.215, C.rec, M.light);                            // it is recording
      G = -1;
      m.rec = X([x + 0.34, H + 0.46, z + 0.23]);
      T = null;
      m.spot.set([x, z, 0.2], 0);
    }

    // the film light stands beside it and looks towards us: the camera's back is lit, and the ground it stands on
    {
      const lx = LIGHT[0], lz = LIGHT[1], f = norm([-0.6, -0.45, 0.66]), r = norm(cross([0, 1, 0], f)), u = cross(f, r), c = [lx, LIGHT_Y, lz];
      stick([lx, 0, lz], [lx, LIGHT_Y - 0.14, lz], 0.02, C.dark);
      for (let k = 0; k < 3; k++) { const a = 0.5 + k * 2.0944; stick([lx + 0.36 * Math.cos(a), 0, lz + 0.36 * Math.sin(a)], [lx, 0.3, lz], 0.016, C.dark); }
      const at = (su, sv, sf, hw, hh) => add(add(add(c, r, su * hw), u, sv * hh), f, sf);
      solid([at(-1, -1, 0.03, 0.44, 0.32), at(1, -1, 0.03, 0.44, 0.32), at(1, 1, 0.03, 0.44, 0.32), at(-1, 1, 0.03, 0.44, 0.32),
        at(-1, -1, -0.07, 0.44, 0.32), at(1, -1, -0.07, 0.44, 0.32), at(1, 1, -0.07, 0.44, 0.32), at(-1, 1, -0.07, 0.44, 0.32)], C.dark, M.plain);
      G = 0;
      quadO(at(-1, -1, 0.034, 0.39, 0.27), at(1, -1, 0.034, 0.39, 0.27), at(1, 1, 0.034, 0.39, 0.27), at(-1, 1, 0.034, 0.39, 0.27), C.panel, M.light, f);
      G = -1;
      lamp(m, add(c, f, 0.25), f, 0.8, 6.0, 1.5);
      m.spot.set([lx, lz, 0.08], 3);
    }

    // the sun: seen from the standing camera it sits in the saddle, a little behind the tray
    const sa = [m.saddle[0], m.saddle[1] + 0.3, m.saddle[2]];
    m.sun = [eye[0] + (sa[0] - eye[0]) * 1.04, eye[1] + (sa[1] - eye[1]) * 1.04, eye[2] + (sa[2] - eye[2]) * 1.04];
    return tray(m);
  }

  // ---- Mit KI: the week on a board
  function buildPlan() {
    V = []; G = -1; seed = 31;
    camera(AZ, EL);
    const m = blank(), hw = 3 * PITCH + TILE_W / 2 + 0.22, th = 0.16;
    m.days = [];
    T = lean(BOARD_Z, LEAN);   // the board leans back a little, like a board on an easel
    box(-hw, 0, BOARD_Z - th, hw, BOARD_TOP, BOARD_Z, C.slab, M.plain, { b: 0.7, t: 1, top: C.slabTop });
    for (let k = 0; k < 7; k++) {
      const xc = (k - 3) * PITCH, yc = TILE_Y + TILE_H / 2;
      box(xc - TILE_W / 2, TILE_Y, BOARD_Z, xc + TILE_W / 2, TILE_Y + TILE_H, BOARD_Z + 0.03, C.dark, M.plain);
      tile(xc, yc, BOARD_Z + 0.034, k < DONE ? k : OFF);
      if (k < DONE) lamp(m, X([xc, yc, BOARD_Z + 0.22]), [0, -0.35, 1], 0.85, 0.62, 1.5);
      m.days.push(X([xc, BOARD_TOP + 0.13, BOARD_Z]));
    }
    // today: a fin of brass on the board, and on as a line let into the stone, to the tray's front edge
    G = 3;
    box(TODAY_X - 0.017, 0, BOARD_Z, TODAY_X + 0.017, BOARD_TOP + 0.2, BOARD_Z + 0.05, C.brass, M.light);
    G = -1; T = null;
    m.seg.set([TODAY_X, BOARD_Z + 0.05, TODAY_X, ZF]);
    m.mark = TODAY_X;
    m.today = [TODAY_X, BASE, ZF];
    foot(m, 0, -hw, BOARD_Z - th - 0.12, hw, BOARD_Z + 0.06);
    return tray(m);
  }

  // ---- shaders
  const HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;
  const FINISH = `
vec3 finish(vec3 c) {   // soft shoulder, display gamma, a grain of noise against banding in the dark
  c = pow(1.0 - exp(-c), vec3(0.4545));
  return c + (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
}`;
  const VS_MESH = `
attribute vec3 aP, aN, aC, aM;   // aM: material, occlusion, what switches it on
uniform mat4 uVP;
uniform float uOn[8];
varying vec3 vP, vN, vC, vM;
void main() {
  vP = aP; vN = aN; vC = aC;
  vM = vec3(aM.xy, aM.z < -0.5 ? 1.0 : uOn[int(aM.z + 0.5)]);
  gl_Position = uVP * vec4(aP, 1.0);
}`;
  const FS_MESH = HEAD + `
varying vec3 vP, vN, vC, vM;
uniform vec3 uSky, uKey, uInk, uWarm, uSunC, uRes;
uniform float uPx;
uniform vec3 uLp[3];     // the lamps: where
uniform vec4 uLd[3];     // which way, and how much of a spot they are
uniform float uLi[3];    // how strong, now
uniform vec4 uFoot[2];   // soft shadows under the ridge, the board
uniform vec3 uSpot[4];   // and round ones under the tripod and the stand
uniform vec4 uSeg;       // the line of brass let into the stone: from (x, z) to (x, z)
uniform vec2 uDrawn;     // how far it is drawn; the same line down the tray's front face (x, and 1e4 for none)
uniform vec4 uBlk;       // the tray: x0, z0, x1, z1
uniform vec2 uTile;      // half a tile's face
` + FINISH + `
const vec3 KEY = vec3(-0.720, 0.500, 0.481);   // a cool key from the upper left, so every face has its own value
const vec3 GOLD = vec3(0.640, 0.390, 0.083);   // the site's gold, in linear light
const vec3 POSTED = vec3(1.55, 0.84, 0.27);    // a lit tile
float boxS(vec2 p, vec2 lo, vec2 hi, float s) {   // a soft-edged rectangle
  vec2 a = smoothstep(lo - s, lo + s, p) * (1.0 - smoothstep(hi - s, hi + s, p));
  return a.x * a.y;
}
// fine dark joints every per units; never thinner than a pixel, they fade instead
float joint(float s, float per, float wid, float stretch) {
  float e = abs(fract(s / per + 0.5) - 0.5) * per, px = uPx * stretch, w = max(wid, px * 1.1);
  return (wid / w) * (1.0 - smoothstep(0.0, w, e)) * clamp(per / (px * 3.0) - 0.6, 0.0, 1.0);
}
// a hairline, d away: about a pixel wide however small the picture
float hair(float d, float px, float wid) {
  float hw = max(wid, px * 0.62);
  return 1.0 - smoothstep(hw - px * 0.5, hw + px * 0.5, d);
}
float lamps(vec3 P, vec3 N) {
  float e = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 d = uLp[i] - P;
    float r2 = dot(d, d), il = inversesqrt(r2);
    e += uLi[i] * max(dot(N, d) * il, 0.0) * mix(1.0, max(-dot(d, uLd[i].xyz) * il, 0.0), uLd[i].w) / (r2 + 0.22);
  }
  return e;
}
void main() {
  vec3 N = normalize(vN), alb = vC, col;
  float m = vM.x, ao = vM.y;
  if (m > 3.5 && m < 4.5) col = mix(vec3(0.010, 0.012, 0.016), alb * ao, vM.z);   // lamps and brass: dark until they are on
  else if (m > 5.5 && m < 6.5) {                                                  // the table: only a soft shadow under the tray
    vec2 p = vP.xz;
    col = uInk * (1.0 - 0.42 * boxS(p, uBlk.xy - 0.5, uBlk.zw + 0.5, 1.5)) * (1.0 - 0.62 * boxS(p, uBlk.xy - 0.3, uBlk.zw + 0.3, 0.5));
    vec2 e = min(gl_FragCoord.xy, uRes.xy - gl_FragCoord.xy) / uRes.z;            // and none of it at the picture's edge
    col = mix(uInk, col, smoothstep(0.0, 1.0, min(e.x, e.y)));
  } else {
    vec3 extra = vec3(0.0);
    float up = N.y, tile = m > 8.5 ? 1.0 : 0.0;
    if (tile > 0.5) alb = vec3(0.05, 0.056, 0.068);   // a tile's face: dark, until it is posted
    if (m > 1.5 && m < 2.5) {              // stone: soft shadows where things stand, the line of brass
      alb *= 1.0 - 0.26 * max(joint(vP.x - uBlk.x, 1.1, 0.016, 1.0), joint(vP.z - uBlk.w, 1.0, 0.016, 2.45));   // large slabs
      for (int i = 0; i < 2; i++) ao *= 1.0 - 0.5 * boxS(vP.xz, uFoot[i].xy - uFoot[i].zw, uFoot[i].xy + uFoot[i].zw, 0.3);
      for (int i = 0; i < 4; i++) { vec2 dd = vP.xz - uSpot[i].xy; ao *= 1.0 - 0.55 * exp(-dot(dd, dd) / uSpot[i].z); }
      vec2 ab = uSeg.zw - uSeg.xy;
      float len = length(ab);
      if (len > 0.001) {
        float h = clamp(dot(vP.xz - uSeg.xy, ab) / (len * len), 0.0, 1.0), d = length(vP.xz - uSeg.xy - ab * h);
        float drawn = (1.0 - smoothstep(uDrawn.x - 0.12, uDrawn.x, h)) * step(0.001, uDrawn.x);
        extra += GOLD * (1.5 * hair(d, uPx, 0.017) + 0.07 * exp(-d * d / 0.03)) * drawn;
      }
    } else if (m > 6.5 && m < 7.5) {       // the tray's cut faces: the top edge catches the light; today's line runs down the front
      alb *= 1.0 + 1.2 * smoothstep(-0.05, -0.012, vP.y) * step(vP.y, 0.001);
      extra += GOLD * 1.5 * hair(abs(vP.x - uDrawn.y), uPx, 0.017) * step(0.5, N.z) * step(0.999, uDrawn.x) * smoothstep(-0.34, -0.2, vP.y);
    }
    float rock = m > 4.5 && m < 5.5 ? 1.0 : 0.0;   // the folded ridge takes more of the key light: each facet its own value
    vec3 light = (uSky * mix(0.16, 1.0, 0.5 + 0.5 * up) * (1.0 - 0.45 * rock) + uKey * max(dot(N, KEY), 0.0) * (1.0 + 1.8 * rock)) * ao;
    light += uWarm * lamps(vP, N) * 2.2 * (0.5 + 0.5 * ao);
    light += uSunC * rock * max(dot(N, vec3(-0.12, 0.5, -0.86)), 0.0);   // the low sun behind it grazes the ridge
    col = alb * light + extra;
    if (rock > 0.5) col = mix(col, uSky * 0.11, 0.55 * exp(-vP.y * 1.5));   // haze at the foot of the mountain
    if (tile > 0.5) {                      // planned: a hairline of brass round the face; posted: the face is lit
      vec2 q = uTile - abs(vC.xy);
      float e = min(q.x, q.y);
      col += GOLD * 1.25 * hair(abs(e - 0.02), uPx, 0.012);
      col = mix(col, POSTED * (0.8 + 0.2 * (vC.y / uTile.y * 0.5 + 0.5)), vM.z);
    }
  }
  gl_FragColor = vec4(finish(col), 1.0);
}`;

  // the ridge line, drawn once more as a hairline of gold: the logo's line
  const VS_LINE = `
attribute vec3 aP;
uniform mat4 uVP;
void main() { gl_Position = uVP * vec4(aP, 1.0); }`;
  const FS_LINE = HEAD + `
uniform vec4 uCol;
void main() { gl_FragColor = vec4(uCol.rgb * uCol.a, uCol.a); }`;

  // one soft or sharp disc that faces the camera (sun, glows)
  const VS_DISC = `
attribute vec2 aQ;
uniform mat4 uVP;
uniform vec3 uC, uR, uU;
uniform float uSize;
varying vec2 vQ;
void main() { vQ = aQ; gl_Position = uVP * vec4(uC + (uR * aQ.x + uU * aQ.y) * uSize, 1.0); }`;
  const FS_DISC = HEAD + `
varying vec2 vQ;
uniform vec3 uCol;
uniform vec2 uKind;   // x: 1 = a sharp disc, 0 = a glow; y: how solid (1 covers, 0 adds light)
uniform vec3 uRes;
void main() {
  float r = length(vQ);
  float a = uKind.x > 0.5 ? 1.0 - smoothstep(0.94, 1.0, r) : max(exp(-r * r * 4.5) - 0.0111, 0.0);
  vec2 e = min(gl_FragCoord.xy, uRes.xy - gl_FragCoord.xy) / uRes.z;   // a glow never reaches the picture's edge
  if (uKind.x < 0.5) a *= smoothstep(0.0, 1.0, min(e.x, e.y));
  float n = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(uCol * a + n * step(0.002, a), a * uKind.y);
}`;

  const L_MESH = [['aP', 3, 0], ['aN', 3, 3], ['aC', 3, 6], ['aM', 3, 9]], L_POS = [['aP', 3, 0]], L_DISC = [['aQ', 2, 0]];
  const SKY = [0.110, 0.150, 0.215], KEYL = [0.050, 0.065, 0.090], WARM = lin(236, 186, 104), INK = lin(16, 20, 26);
  const BUDGET = 1.3e6;        // device pixels at most, per picture
  const T_END = 3.2;           // the draw-in, in seconds
  const svgText = (side, sel) => [...side.querySelectorAll(sel)].map(el => el.textContent.trim()).filter(Boolean);

  // ---- one side: its canvas, its model, its words, its clock
  function scene(side, kind) {
    const canvas = document.createElement('canvas');
    let gl = null;
    try { gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: true, stencil: false }); } catch (err) { gl = null; }
    if (!gl) return;

    function program(vs, fs, attribs, uniforms) {
      const sh = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('tools shader: ' + gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('tools link: ' + gl.getProgramInfoLog(p));
      const a = {}, u = {};
      for (const k of attribs) a[k] = gl.getAttribLocation(p, k);
      for (const k of uniforms) u[k] = gl.getUniformLocation(p, k);
      return { p, a, u };
    }
    function buffer(data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; }
    function bind(pr, buf, stride, layout) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      for (let i = 0; i < layout.length; i++) {
        const l = pr.a[layout[i][0]]; if (l < 0) continue;
        gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, layout[i][1], gl.FLOAT, false, stride * 4, layout[i][2] * 4);
      }
    }
    function unbind(pr, layout) { for (let i = 0; i < layout.length; i++) if (pr.a[layout[i][0]] >= 0) gl.disableVertexAttribArray(pr.a[layout[i][0]]); }

    // what lives on the GPU; made again if the context comes back
    const m = kind === 'hand' ? buildHand() : buildPlan();
    let R = null;
    function setup() {
      const r = {};
      r.mesh = program(VS_MESH, FS_MESH, ['aP', 'aN', 'aC', 'aM'], ['uVP', 'uOn', 'uSky', 'uKey', 'uInk', 'uWarm', 'uSunC', 'uRes', 'uPx', 'uLp', 'uLd', 'uLi', 'uFoot', 'uSpot', 'uSeg', 'uDrawn', 'uBlk', 'uTile']);
      r.disc = program(VS_DISC, FS_DISC, ['aQ'], ['uVP', 'uC', 'uR', 'uU', 'uSize', 'uCol', 'uKind', 'uRes']);
      r.line = program(VS_LINE, FS_LINE, ['aP'], ['uVP', 'uCol']);
      r.bDisc = buffer(new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]));
      r.bMesh = buffer(m.data);
      if (m.crest) r.bCrest = buffer(new Float32Array(m.crest));
      R = r;
    }
    // a shader that does not compile (an exotic driver): no picture, the flat one stays
    try { setup(); } catch (err) { if (window.console) console.warn(err.message || err); return; }

    // ---- the picture in the page: a box above the side's text, in the flat picture's place
    const fig = document.createElement('div');
    fig.className = 'tools-model tools-model--' + kind;
    fig.setAttribute('aria-hidden', 'true');
    fig.append(canvas);
    const word = (cls, text) => { const el = document.createElement('span'); el.className = cls; el.textContent = text; fig.append(el); return el; };
    let days = [], today = null;
    if (kind === 'plan') {
      const d = svgText(side, '.tools__days text'), l = svgText(side, '.tools__legend text');
      days = (d.length === 7 ? d : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']).map(t => word('tools-model__day', t));
      today = word('tools-model__today', svgText(side, '.tools__today-label')[0] || 'heute');
      const legend = word('tools-model__legend', '');
      for (const [i, t] of [l[0] || 'gepostet', l[1] || 'geplant'].entries()) {
        const k = document.createElement('span');
        k.className = 'tools-model__key' + (i ? '' : ' tools-model__key--done'); k.textContent = t; legend.append(k);
      }
    }
    side.prepend(fig);
    side.classList.add('tools__side--raum');

    const proj = new Float32Array(16);
    let K = 1, scale = 1, key = '', W = 0, H = 0;
    function layout() {
      if (!R) return;
      W = fig.clientWidth;
      if (W < 40) return;
      const padX = 0.3, padTop = 0.3, padBottom = 0.7;
      K = W / (BOX.x1 - BOX.x0 + 2 * padX);
      H = Math.ceil(K * (BOX.y1 - BOX.y0 + padTop + padBottom));
      const s = Math.min(devicePixelRatio || 1, 2, Math.sqrt(BUDGET / (W * H)));
      const k = [W, H, s].join(':');
      if (k === key) return;
      key = k; scale = s;
      fig.style.height = H + 'px';
      canvas.width = Math.round(W * s); canvas.height = Math.round(H * s);
      const ne = DIST - 40, fa = DIST + 60, mid = (BOX.x0 + BOX.x1) / 2, top = K * padTop;
      proj.fill(0);
      proj[0] = 2 * K * DIST / W; proj[5] = 2 * K * DIST / H;
      proj[8] = 2 * K * mid / W; proj[9] = -(1 - 2 * (top + K * BOX.y1) / H);
      proj[10] = (fa + ne) / (ne - fa); proj[11] = -1; proj[14] = 2 * fa * ne / (ne - fa);
      // the words stand where the standing camera sees their places
      camera(AZ, EL);
      const at = (el, p, dy) => { const q = seen(p); el.style.left = (W / 2 + K * (q[0] - mid)).toFixed(1) + 'px'; el.style.top = (top + K * (BOX.y1 - q[1]) + dy).toFixed(1) + 'px'; };
      days.forEach((el, i) => at(el, m.days[i], 0));
      if (today) {
        at(today, m.today, 0);
        const a = seen(m.days[0]), b = seen(m.days[6]);   // the words lie along the board's top edge
        fig.style.setProperty('--tilt', Math.atan2(a[1] - b[1], b[0] - a[0]).toFixed(4) + 'rad');
      }
      paint();
    }

    // ---- the draw-in, in seconds from its start
    let began = still, t0 = 0, rested = still, said = false;
    const on = new Float32Array(8), li3 = new Float32Array(3), v3 = [0, 0, 0];

    function disc(r, at, size, cr, cg, cb, sharp, solid) {
      gl.uniform3f(r.disc.u.uC, at[0], at[1], at[2]); gl.uniform1f(r.disc.u.uSize, size);
      gl.uniform3f(r.disc.u.uCol, cr, cg, cb); gl.uniform2f(r.disc.u.uKind, sharp, solid);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function draw(now) {
      const r = R;
      if (!r || !W || gl.isContextLost()) return;
      const t = still ? 0 : now / 1000, tt = still ? 99 : began ? (now - t0) / 1000 : -1;
      let sun = 0, drawn = 0;
      if (kind === 'hand') {
        // the film light, then the red lamp, then the sun
        on[0] = ease(clamp((tt - 0.2) / 0.7));
        on[1] = tt < 1.0 ? 0 : still || (t % 1.8) < 1.2 ? 1 : 0.12;
        sun = ease(clamp((tt - 0.9) / 1.9));
        li3[0] = m.li[0] * on[0];
      } else {
        // the posted tiles one after the other, then today's line from the top of the board to the tray's edge
        for (let k = 0; k < DONE; k++) { on[k] = ease(clamp((tt - 0.3 - 0.45 * k) / 0.55)); li3[k] = m.li[k] * on[k]; }
        on[3] = ease(clamp((tt - 1.7) / 0.5));
        drawn = ease(clamp((tt - 2.0) / 0.8));
        const s = drawn > 0.8;   // the word comes when the line arrives
        if (s !== said) { said = s; fig.classList.toggle('is-today', s); }
      }
      if (!rested && tt >= T_END) rested = true;

      // the camera drifts by half a degree, so the depth is felt
      camera(AZ + (still ? 0 : 0.009 * Math.sin(t * 0.11)), EL + (still ? 0 : 0.002 * Math.sin(t * 0.083 + 1.3)));
      mul(VP, proj, view);

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(16 / 255, 20 / 255, 26 / 255, 1); gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.BLEND);

      // the model: first the table's shadow (no depth), then everything solid
      let p = r.mesh;
      gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform1fv(p.u.uOn, on);
      gl.uniform3f(p.u.uSky, SKY[0], SKY[1], SKY[2]); gl.uniform3f(p.u.uKey, KEYL[0], KEYL[1], KEYL[2]);
      gl.uniform3f(p.u.uInk, INK[0], INK[1], INK[2]); gl.uniform3f(p.u.uWarm, WARM[0], WARM[1], WARM[2]);
      gl.uniform3f(p.u.uSunC, 0.34 * sun, 0.17 * sun, 0.07 * sun);
      gl.uniform3f(p.u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight, 0.5 * K * scale);
      gl.uniform1f(p.u.uPx, 1 / (K * scale));
      gl.uniform3fv(p.u.uLp, m.lp); gl.uniform4fv(p.u.uLd, m.ld); gl.uniform1fv(p.u.uLi, li3);
      gl.uniform4fv(p.u.uFoot, m.foot); gl.uniform3fv(p.u.uSpot, m.spot);
      gl.uniform4fv(p.u.uSeg, m.seg); gl.uniform2f(p.u.uDrawn, drawn, m.mark);
      gl.uniform4f(p.u.uBlk, XL, ZB, XR, ZF); gl.uniform2f(p.u.uTile, TILE_W / 2, TILE_H / 2);
      bind(p, r.bMesh, 12, L_MESH);
      gl.disable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLES, m.n - 6, 6);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.drawArrays(gl.TRIANGLES, 0, m.n - 6);
      unbind(p, L_MESH);

      // from here on: light and air, laid over the model (colour already multiplied by its alpha)
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);
      const discs = () => {
        p = r.disc; gl.useProgram(p.p);
        gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform3f(p.u.uR, right[0], right[1], right[2]); gl.uniform3f(p.u.uU, upv[0], upv[1], upv[2]);
        gl.uniform3f(p.u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight, 0.5 * K * scale);
        bind(p, r.bDisc, 2, L_DISC);
      };

      if (kind === 'hand') {
        // the sun rises into the saddle, behind the ridge
        discs();
        v3[0] = m.sun[0]; v3[1] = m.sun[1] - (1 - sun) * 1.15; v3[2] = m.sun[2];
        if (sun > 0.004) {
          disc(r, v3, 1.5, 0.925 * 0.22 * sun, 0.729 * 0.22 * sun, 0.408 * 0.22 * sun, 0, 0);
          disc(r, v3, 0.95, 0.925 * 0.3 * sun, 0.80 * 0.3 * sun, 0.55 * 0.3 * sun, 0, 0);
          disc(r, v3, 0.42, 0.975 * sun, 0.83 * sun, 0.56 * sun, 1, sun);
        }
        unbind(p, L_DISC);
        // the ridge's gold hairline; it lights up when the sun stands behind it
        p = r.line; gl.useProgram(p.p);
        gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform4f(p.u.uCol, 0.925, 0.82, 0.55, 0.22 + 0.55 * sun);
        bind(p, r.bCrest, 3, L_POS); gl.drawArrays(gl.LINE_STRIP, 0, CREST.length); unbind(p, L_POS);
      }

      // a breath of glow in the air at every lamp that is on, the sun's glare over the ridge, the red lamp's
      gl.disable(gl.DEPTH_TEST);
      discs();
      for (let i = 0; i < m.nl; i++) {
        const g = m.glow[i], a = 0.075 * li3[i] / m.li[i];
        if (a > 0.001) disc(r, g, g[3], 0.925 * a, 0.729 * a, 0.408 * a, 0, 0);
      }
      if (kind === 'hand') {
        if (sun > 0.004) disc(r, v3, 1.4, 0.925 * 0.08 * sun, 0.729 * 0.08 * sun, 0.408 * 0.08 * sun, 0, 0);
        if (on[1] > 0.004) disc(r, m.rec, 0.2, 0.5 * on[1], 0.05 * on[1], 0.03 * on[1], 0, 0);
      }
      unbind(p, L_DISC);
      gl.depthMask(true);
    }

    // ---- when it runs: only on screen; every frame while it draws in, then a few a second
    let visible = false, raf = 0, last = 0;
    function paint() { if (!raf || rested) draw(performance.now()); }
    function frame(now) {
      raf = 0;
      if (!visible || document.hidden || still || !R) return;
      if (!rested || now - last > 46) { last = now; draw(now); }
      raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf && visible && !still && R) raf = requestAnimationFrame(frame); };
    function begin() {
      if (began) return;
      began = true; t0 = performance.now();
      kick();
    }

    if (still) fig.classList.add('is-today');
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => {
        for (const e of es) { visible = e.isIntersecting; if (e.intersectionRatio >= 0.4) begin(); }
        kick();
      }, { threshold: [0, 0.4] }).observe(fig);
      // replay, as the steps model (js/steps.js): well off screen it goes back to its start
      new IntersectionObserver(es => {
        if (es.some(e => e.isIntersecting) || !began) return;
        began = false; rested = false;
        draw(performance.now());
      }, { rootMargin: '40% 0px 40% 0px' }).observe(fig);
    } else { visible = true; begin(); }
    document.addEventListener('visibilitychange', kick);

    // a lost context: the model goes, the flat picture shows again; back when the context is
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault(); R = null; key = '';
      fig.hidden = true; side.classList.remove('tools__side--raum');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try { setup(); } catch (err) { R = null; return; }
      fig.hidden = false; side.classList.add('tools__side--raum');
      layout(); kick();
    });

    // first call on observe, then on every width change of the side
    new ResizeObserver(layout).observe(side);
    addEventListener('resize', layout);
  }

  for (const [sel, kind] of [['.tools__side--hand', 'hand'], ['.tools__side--ai', 'plan']]) {
    const side = section.querySelector(sel);
    if (!side || !side.querySelector('.tools__art')) continue;
    try { scene(side, kind); } catch (err) { if (window.console) console.warn(err.message || err); }
  }
})();
