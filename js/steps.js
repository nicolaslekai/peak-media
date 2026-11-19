/* ============ BLAUE STUNDE — the process as one model in the Raum style (3D) ============
   For <ol class="steps" data-line="profile"> (home page, "So arbeiten wir"). The five steps
   are one way through one landscape: a long tray of dark stone, seen like the Wellness model
   (js/therme-scene.js: raised three-quarter view from the right, long lens, raw WebGL,
   no library), with the logo as the mountain behind: two summits, the bigger one left, the
   low sun in the saddle, a hairline of gold along the crest.

   The five places, left to right, linked by one line of brass let into the stone:
   1 the house, its door lit, where the way begins      (Kennenlernen vor Ort)
   2 a camera on its tripod and a film light, by firs    (Shootings)
   3 a low timber house with one lit window              (Ihr Team liefert mit)
   4 a board with a neat row of five lit frames          (Auswählen, bearbeiten, planen)
   5 a beacon at the end, its light goes out in rings    (Posten und messen)

   How it is made
   - one static mesh per layout (boxes, sticks, cones, a folded ridge), shaded per face: light
     from the sky, and the warm lamp of every place that is switched on
   - the line, the rings and the contact shadows are drawn by the stone's shader
   - wide screens (five columns): every place stands above the middle of its column's text;
     tablets and phones: the same model, the places closer together, once above the list
   - it draws in once when it scrolls into view (about three seconds: the line runs from the
     door to the beacon, each place and its text switch on in turn, the sun rises into the
     saddle), then it rests: the beacon's rings, a camera drift of half a degree
   - it runs only while on screen; reduced motion: the finished picture at once, nothing moves
   No WebGL, a shader that does not compile, or a lost context: no canvas, and the list keeps
   its own look from style.css (each step with its small ridge). Own file, like evidence.js:
   an error here cannot stop the scroll engine.
   ====================================================================================== */
(() => {
  const ol = document.querySelector('.steps[data-line="profile"]');
  if (!ol) return;
  const items = [...ol.children].filter(el => el.tagName === 'LI');
  if (items.length !== 5) return;
  const canvas = document.createElement('canvas');
  let gl = null;
  try { gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: true, stencil: false }); } catch (err) { gl = null; }
  if (!gl) return;

  const wide = matchMedia('(min-width: 1001px)');   // five columns in style.css
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  // ---- the model, in metres or so: x along the way, y up, z towards us; place 3 stands at x = 0
  const ZB = -3.2, ZF = 2.05, BASE = -0.5;                               // the tray: back, front, underside
  const RIDGE_Z = -2.35, FOOT_Z = -0.8, MH = 3.4;                        // the mountain: crest, foot, height
  const PZ = [0.55, 1.4, 0.6, 1.4, 0.7];                                 // where the way passes each place (z)
  const AZ = 6 * Math.PI / 180, EL = 24 * Math.PI / 180, DIST = 150;     // the view: from the right, raised, far away
  const TARGET = [0, 0.8, -0.5];
  // the logo's ridge, foot to foot (u from -1 to 1, height as a share of the big summit)
  const CREST = [[-1, 0], [-0.9, 0.16], [-0.74, 0.29], [-0.56, 0.44], [-0.4, 0.67], [-0.28, 0.89], [-0.19, 1], [-0.1, 0.85],
    [0.02, 0.63], [0.15, 0.46], [0.27, 0.39], [0.36, 0.46], [0.45, 0.56], [0.53, 0.61], [0.62, 0.51], [0.74, 0.34], [0.88, 0.18], [1, 0]];
  const SADDLE = 10;                                                     // its index in CREST
  // firs: [place, x from it, z, height, only when the places stand further apart than this]
  const FIRS = [[1, -2.0, -1.2, 2.2, 0], [1, -2.6, -0.75, 1.5, 4], [1, 1.5, -0.5, 1.6, 4],
    [3, 1.8, -0.45, 1.9, 0], [3, 2.3, -0.1, 1.35, 4], [0, 1.85, -1.15, 2.0, 5]];

  // materials: albedo in linear light; what shines (glass, lamp, frame, panel) is set above 1, so that after
  // the picture's soft shoulder the windows land on the site's warm window light (236, 186, 104)
  const C = {
    stone: [0.13, 0.145, 0.165], side: [0.075, 0.085, 0.10], roof: [0.23, 0.245, 0.27], dark: [0.03, 0.03, 0.035],
    timber: [0.24, 0.15, 0.085], boards: [0.30, 0.20, 0.11], tree: [0.045, 0.08, 0.07], metal: [0.12, 0.13, 0.15],
    glass: [1.5, 0.66, 0.15], lamp: [1.7, 0.86, 0.24], frame: [1.15, 0.58, 0.15], panel: [1.25, 0.82, 0.36],
  };
  // material ids, read by the shader
  const M = { plain: 0, timber: 1, stone: 2, light: 4, rock: 5, table: 6, side: 7, boards: 8 };

  // ---- mesh: 12 floats a corner (place, normal, colour, material, occlusion, what switches it on)
  let V = [], G = -1, T = null;
  const put = (p, n, c, m, ao) => { V.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], m, ao, G); };
  // T turns what is built around an upright axis: [x, z, cos, sin]
  const X = p => T ? [T[0] + (p[0] - T[0]) * T[2] + (p[2] - T[1]) * T[3], p[1], T[1] - (p[0] - T[0]) * T[3] + (p[2] - T[1]) * T[2]] : p;
  function quad(a, b, c, d, col, m, ao) {   // a..d counter-clockwise seen from outside
    a = X(a); b = X(b); c = X(c); d = X(d);
    const n = norm(cross(sub(b, a), sub(c, a))), o = ao || [1, 1, 1, 1];
    put(a, n, col, m, o[0]); put(b, n, col, m, o[1]); put(c, n, col, m, o[2]);
    put(a, n, col, m, o[0]); put(c, n, col, m, o[2]); put(d, n, col, m, o[3]);
  }
  function quadO(a, b, c, d, col, m, out, ao) {   // the same, turned so it faces `out`
    const o = ao || [1, 1, 1, 1];
    if (dot(cross(sub(b, a), sub(c, a)), out) < 0) quad(a, d, c, b, col, m, [o[0], o[3], o[2], o[1]]);
    else quad(a, b, c, d, col, m, o);
  }
  function tri(a, b, c, ca, cb, cc, m, out) {   // flat, turned so it faces `out`
    a = X(a); b = X(b); c = X(c);
    let n = norm(cross(sub(b, a), sub(c, a)));
    if (dot(n, out) < 0) { n = [-n[0], -n[1], -n[2]]; put(a, n, ca, m, 1); put(c, n, cc, m, 1); put(b, n, cb, m, 1); }
    else { put(a, n, ca, m, 1); put(b, n, cb, m, 1); put(c, n, cc, m, 1); }
  }
  // a box; o.b / o.t: occlusion at the foot and the top of its walls, o.top: another colour / material on top
  function box(x0, y0, z0, x1, y1, z1, col, m, o) {
    o = o || {};
    if (x0 > x1) { const s = x0; x0 = x1; x1 = s; }
    const b = o.b === undefined ? 1 : o.b, t = o.t === undefined ? 1 : o.t, s = [b, b, t, t];
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col, m, s);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, m, s);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, m, s);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, m, s);
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], o.top || col, o.mTop === undefined ? m : o.mTop);
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
  // a thin slab under the quad a..d (roofs)
  function slab(a, b, c, d, th, col) {
    const n = norm(cross(sub(b, a), sub(c, a)));
    solid([a, b, c, d, add(a, n, -th), add(b, n, -th), add(c, n, -th), add(d, n, -th)], col, M.plain);
  }
  // a fir, as a model maker turns it: a slim cone on a pin
  function fir(x, z, h) {
    const r = h * 0.15, y0 = h * 0.14, n = 16, hh = h - y0;
    box(x - 0.035, 0, z - 0.035, x + 0.035, y0 + 0.05, z + 0.035, C.dark, M.plain);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, am = (a0 + a1) / 2;
      const p0 = [x + r * Math.cos(a0), y0, z + r * Math.sin(a0)], p1 = [x + r * Math.cos(a1), y0, z + r * Math.sin(a1)];
      const n0 = norm([Math.cos(a0) * hh, r, Math.sin(a0) * hh]), n1 = norm([Math.cos(a1) * hh, r, Math.sin(a1) * hh]), nm = norm([Math.cos(am) * hh, r, Math.sin(am) * hh]);
      put(p1, n1, C.tree, M.plain, 0.55); put(p0, n0, C.tree, M.plain, 0.55); put([x, h, z], nm, C.tree, M.plain, 1);
    }
  }

  // ---- small matrix kit (column-major, as GL wants it); nothing is allocated per frame
  const view = new Float32Array(16), proj = new Float32Array(16), VP = new Float32Array(16);
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

  // ---- one model for a spacing S of the places (as seen: S model units from place to place)
  function build(S) {
    V = []; G = -1; T = null; seed = 31;
    camera(AZ, EL);
    const m = { S, lp: new Float32Array(15), ld: new Float32Array(20), li: [0, 0, 0, 0, 0], foot: new Float32Array(16), tree: new Float32Array(24), glow: [], crest: [] };
    const far = S > 4;   // phones: the places stand close, things between them move in or stay away
    // the places stand so that the standing camera sees them at equal distances
    const c0 = seen([0, 0, PZ[2]])[0];
    const PX = PZ.map((z, i) => {
      let x = (i - 2) * S / Math.cos(AZ);
      for (let k = 0; k < 8; k++) x += (c0 + (i - 2) * S - seen([x, 0, z])[0]) / Math.cos(AZ);
      return x;
    });
    const XL = PX[0] - Math.max(1.6, Math.min(2.7, 0.42 * S)), XR = PX[4] + Math.max(1.55, Math.min(2.6, 0.4 * S));
    m.PX = PX; m.c0 = c0; m.blk = [XL, ZB, XR, ZF];
    let nl = 0, nf = 0;
    const lamp = (p, d, w, power, size) => {   // a place's lamp: where, which way, how much of a spot, how strong; and its glow in the air
      d = norm(d);
      m.lp.set(p, nl * 3); m.ld.set([d[0], d[1], d[2], w], nl * 4); m.li[nl] = power; m.glow.push([p[0], p[1], p[2], size]); nl++;
    };
    const foot = (x0, z0, x1, z1) => { m.foot.set([(x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2], nf * 4); nf++; };

    // --- 1 the house: a broad gable to the front, the door lit, the way begins at its sill
    {
      const x = PX[0], zf = PZ[0] - 0.14, zb = zf - 1.6, w = 0.95, e = 0.95, r = 1.5, ov = 0.26, ye = r - (w + ov) * (r - e) / w;
      box(x - w, 0, zb, x + w, e, zf, C.timber, M.timber, { b: 0.8, t: 0.62 });
      tri([x - w, e, zf], [x + w, e, zf], [x, r, zf], C.timber, C.timber, C.timber, M.timber, [0, 0, 1]);
      tri([x - w, e, zb], [x + w, e, zb], [x, r, zb], C.timber, C.timber, C.timber, M.timber, [0, 0, -1]);
      slab([x, r + 0.03, zf + 0.28], [x + w + ov, ye + 0.03, zf + 0.28], [x + w + ov, ye + 0.03, zb - 0.16], [x, r + 0.03, zb - 0.16], 0.08, C.roof);
      slab([x - w - ov, ye + 0.03, zf + 0.28], [x, r + 0.03, zf + 0.28], [x, r + 0.03, zb - 0.16], [x - w - ov, ye + 0.03, zb - 0.16], 0.08, C.roof);
      G = 0;
      quad([x - 0.18, 0, zf + 0.004], [x + 0.18, 0, zf + 0.004], [x + 0.18, 0.62, zf + 0.004], [x - 0.18, 0.62, zf + 0.004], C.glass, M.light, [0.95, 0.95, 0.6, 0.6]);
      G = -1;
      lamp([x, 0.36, zf + 0.14], [0, -0.3, 1], 0.9, 1.2, 2.5);
      foot(x - w, zb, x + w, zf);
    }

    // --- 2 the shoot: a camera on its tripod; the film light stands behind the set and looks
    // towards us, so the camera is seen against the ground it lights
    {
      const x = PX[1] - 0.45, z = PZ[1] - 0.8, top = [x, 1.0, z];
      for (let k = 0; k < 3; k++) { const a = 1.5708 + k * 2.0944; stick([x + 0.42 * Math.cos(a), 0, z + 0.42 * Math.sin(a)], top, 0.018, C.dark); }
      box(x - 0.045, 0.98, z - 0.045, x + 0.045, 1.05, z + 0.045, C.dark, M.plain);
      T = [x, z, Math.cos(0.3), Math.sin(0.3)];   // the lens looks left, a little towards us
      box(x - 0.24, 1.05, z - 0.125, x + 0.26, 1.34, z + 0.125, C.metal, M.plain, { b: 0.8 });
      box(x - 0.45, 1.11, z - 0.085, x - 0.24, 1.28, z + 0.085, C.dark, M.plain);
      box(x + 0.03, 1.34, z - 0.045, x + 0.18, 1.4, z + 0.045, C.dark, M.plain);
      T = null;
      const lx = PX[1] + 0.55, lz = far ? -1.7 : -0.5, f = norm([-0.28, -0.34, 0.9]), r = norm(cross([0, 1, 0], f)), u = cross(f, r), c = [lx, 1.6, lz];
      stick([lx, 0, lz], [lx, 1.42, lz], 0.017, C.dark);
      for (let k = 0; k < 3; k++) { const a = 0.5 + k * 2.0944; stick([lx + 0.28 * Math.cos(a), 0, lz + 0.28 * Math.sin(a)], [lx, 0.22, lz], 0.014, C.dark); }
      const at = (su, sv, sf, hw, hh) => add(add(add(c, r, su * hw), u, sv * hh), f, sf);
      solid([at(-1, -1, 0.03, 0.32, 0.24), at(1, -1, 0.03, 0.32, 0.24), at(1, 1, 0.03, 0.32, 0.24), at(-1, 1, 0.03, 0.32, 0.24),
        at(-1, -1, -0.05, 0.32, 0.24), at(1, -1, -0.05, 0.32, 0.24), at(1, 1, -0.05, 0.32, 0.24), at(-1, 1, -0.05, 0.32, 0.24)], C.dark, M.plain);
      G = 1;
      quadO(at(-1, -1, 0.034, 0.28, 0.2), at(1, -1, 0.034, 0.28, 0.2), at(1, 1, 0.034, 0.28, 0.2), at(-1, 1, 0.034, 0.28, 0.2), C.panel, M.light, f);
      G = -1;
      lamp(add(c, f, 0.25), f, 0.8, 3.2, 2.6);
    }

    // --- 3 the team's house: low, timber, a flat roof with a deep eave, one lit window, a deck
    {
      const x = PX[2], zf = PZ[2] - 0.62, zb = zf - 1.0, w = 1.05, h = 0.92, D = 0.06;
      box(x - w - 0.2, 0, zb - 0.05, x + w + 0.2, D, zf + 0.44, C.timber, M.plain, { top: C.boards, mTop: M.boards, b: 0.7, t: 0.9 });
      box(x - w, D, zb, x + w, h, zf, C.timber, M.timber, { b: 0.85, t: 0.55 });
      box(x - w - 0.24, h, zb - 0.12, x + w + 0.24, h + 0.1, zf + 0.36, C.roof, M.plain, { b: 0.5, t: 0.62 });
      const x0 = x - 0.78, x1 = x + 0.22;
      for (let i = 1; i < 3; i++) { const xx = x0 + (x1 - x0) * i / 3; box(xx - 0.015, 0.36, zf, xx + 0.015, 0.7, zf + 0.012, C.dark, M.plain); }
      G = 2;
      quad([x0, 0.36, zf + 0.004], [x1, 0.36, zf + 0.004], [x1, 0.7, zf + 0.004], [x0, 0.7, zf + 0.004], C.glass, M.light, [0.95, 0.95, 0.6, 0.6]);
      G = -1;
      lamp([(x0 + x1) / 2, 0.52, zf + 0.12], [0, -0.25, 1], 0.9, 1.2, 2.6);
      foot(x - w - 0.2, zb - 0.05, x + w + 0.2, zf + 0.44);
    }

    // --- 4 the editing board: five frames in a row
    {
      const x = PX[3], z = PZ[3] - 0.62, w = 1.08, y0 = 0.34, y1 = 1.06, p = 0.4, TONE = [0.62, 0.5, 0.7, 1.05, 0.56];   // one of them is the chosen one
      for (const d of [-1, 1]) box(x + d * 0.8 - 0.028, 0, z - 0.065, x + d * 0.8 + 0.028, y0, z - 0.01, C.dark, M.plain);
      box(x - w, y0, z - 0.075, x + w, y1, z, C.side, M.plain, { b: 0.8, t: 1 });
      for (let k = 0; k < 5; k++) {
        const xc = x + (k - 2) * p;
        G = 5 + k;
        quad([xc - 0.16, y0 + 0.13, z + 0.004], [xc + 0.16, y0 + 0.13, z + 0.004], [xc + 0.16, y1 - 0.13, z + 0.004], [xc - 0.16, y1 - 0.13, z + 0.004], C.frame, M.light, [0.8 * TONE[k], 0.8 * TONE[k], TONE[k], TONE[k]]);
      }
      G = -1;
      lamp([x, 0.7, z + 0.2], [0, -0.3, 1], 0.85, 1.3, 2.8);
      foot(x - w, z - 0.14, x + w, z + 0.02);
    }

    // --- 5 the beacon: a slim stele, a lantern on top
    {
      const x = PX[4], z = PZ[4];
      box(x - 0.18, 0, z - 0.18, x + 0.18, 0.07, z + 0.18, C.side, M.plain);
      box(x - 0.09, 0.07, z - 0.09, x + 0.09, 1.75, z + 0.09, C.roof, M.plain, { b: 0.55, t: 1 });
      box(x - 0.21, 2.12, z - 0.21, x + 0.21, 2.17, z + 0.21, C.roof, M.plain);
      G = 4;
      box(x - 0.14, 1.75, z - 0.14, x + 0.14, 2.12, z + 0.14, C.lamp, M.light, { b: 1.0, t: 1.15 });
      G = -1;
      lamp([x, 1.93, z], [0, -1, 0], 0, 2.6, 2.5);
    }

    // --- firs
    let nt = 0;
    for (let i = 0; i < 8; i++) { m.tree[i * 3] = 1e4; m.tree[i * 3 + 2] = 1; }
    for (const [pl, dx, z, h, least] of FIRS) {
      if (S <= least) continue;
      const x = PX[pl] + dx * (far ? 1 : 0.72);
      fir(x, z, h);
      m.tree.set([x, z, (0.14 * h + 0.12) ** 2], nt * 3); nt++;
    }

    // --- the tray: stone on top, cut faces around
    quad([XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], C.stone, M.stone);
    const g = [1, 1, 0.35, 0.35];
    quad([XL, 0, ZF], [XL, BASE, ZF], [XR, BASE, ZF], [XR, 0, ZF], C.side, M.side, g);
    quad([XR, 0, ZF], [XR, BASE, ZF], [XR, BASE, ZB], [XR, 0, ZB], C.side, M.side, g);
    quad([XL, 0, ZB], [XL, BASE, ZB], [XL, BASE, ZF], [XL, 0, ZF], C.side, M.side, g);
    quad([XR, 0, ZB], [XR, BASE, ZB], [XL, BASE, ZB], [XL, 0, ZB], C.side, M.side, g);

    // --- the mountain: one folded ridge, four rows from the foot to the crest, ribs and gullies in turn;
    // it lies on the tray like a stone, narrowing to a point at both feet
    const n = CREST.length, cols = [], MW = Math.max(1.1 * S, 5), cx = PX[2] + 0.32 * S;
    const fit = [];
    for (let i = 0; i < n; i++) {
      const end = i === 0 || i === n - 1, x = cx + CREST[i][0] * MW, h = CREST[i][1] * MH, k = Math.min(1, h / 1.2);
      const rib = i % 2 === 0, j = end ? 0 : k;
      const zc = RIDGE_Z + ((rib ? 0.22 : -0.18) + (rnd() - 0.5) * 0.26) * k;
      const zf = RIDGE_Z + 0.2 + (FOOT_Z - RIDGE_Z - 0.2 + (rib ? 0.2 : -0.16)) * k;
      const at = (f, hf, jx) => [x + j * (rnd() - 0.5) * jx, h * hf, zf + (zc - zf) * f];
      cols.push([at(0, 0, 0.3), at(rib ? 0.36 : 0.47, rib ? 0.33 : 0.25, 0.5), at(rib ? 0.7 : 0.8, rib ? 0.7 : 0.6, 0.4), [x, h, zc], [x, h * 0.5, ZB]]);
      fit.push([x, h, zc]); m.crest.push(x, h + 0.012, zc + 0.012);
      if (i === SADDLE) m.saddle = [x, h, zc];
    }
    const rock = p => { const u = Math.min(1, p[1] / MH), v = u * u; return [0.05 + 0.07 * u + 0.07 * v, 0.062 + 0.08 * u + 0.075 * v, 0.085 + 0.09 * u + 0.08 * v]; };
    for (let i = 0; i < n - 1; i++) for (let r = 0; r < 4; r++) {
      const a = cols[i][r], b = cols[i + 1][r], c = cols[i + 1][r + 1], d = cols[i][r + 1], out = [0, 1, r < 3 ? 0.4 : -0.4];
      if ((i + r) % 2 === 0) { tri(a, b, c, rock(a), rock(b), rock(c), M.rock, out); tri(a, c, d, rock(a), rock(c), rock(d), M.rock, out); }
      else { tri(a, b, d, rock(a), rock(b), rock(d), M.rock, out); tri(b, c, d, rock(b), rock(c), rock(d), M.rock, out); }
    }
    foot(cx - MW * 0.8, ZB + 0.15, cx + MW * 0.8, FOOT_Z - 0.15);   // the fourth soft shadow: the mountain's foot

    // the table under the tray (drawn first, only its shadow shows)
    quad([XL - 14, BASE, ZF + 14], [XR + 14, BASE, ZF + 14], [XR + 14, BASE, ZB - 14], [XL - 14, BASE, ZB - 14], C.side, M.table);
    m.n = V.length / 12; m.data = new Float32Array(V); V = [];

    // what has to fit into the picture: the tray, the crest, the beacon
    for (const x of [XL, XR]) for (const z of [ZB, ZF]) { fit.push([x, 0, z]); fit.push([x, BASE, z]); }
    fit.push([PX[4], 2.25, PZ[4]]);
    m.x0 = m.y0 = 1e9; m.x1 = m.y1 = -1e9;
    for (const p of fit) { const s = seen(p); m.x0 = Math.min(m.x0, s[0]); m.x1 = Math.max(m.x1, s[0]); m.y0 = Math.min(m.y0, s[1]); m.y1 = Math.max(m.y1, s[1]); }
    // the sun: seen from the standing camera it sits in the saddle, a little behind the tray
    const sa = [m.saddle[0], m.saddle[1] + 0.5, m.saddle[2]];
    m.sun = [eye[0] + (sa[0] - eye[0]) * 1.04, eye[1] + (sa[1] - eye[1]) * 1.04, eye[2] + (sa[2] - eye[2]) * 1.04];
    return m;
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
uniform float uOn[10];
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
uniform vec3 uLp[5];     // the places' lamps: where
uniform vec4 uLd[5];     // which way, and how much of a spot they are
uniform float uLi[5];    // how strong, now
uniform vec4 uFoot[4];   // soft shadows under the houses, the board, the mountain
uniform vec3 uTree[8];
uniform float uPX[5];    // the places along the way
uniform float uPZ[5];
uniform vec4 uPath;      // the line's head (x), the line, the head's glow, where the line ends (x)
uniform vec4 uRing;      // the beacon's rings: phase, strength, the first ring's phase, its strength
uniform vec4 uBlk;       // the tray: x0, z0, x1, z1
uniform float uBeacon;   // the beacon is on
` + FINISH + `
const vec3 KEY = vec3(-0.720, 0.500, 0.481);   // a cool key from the upper left, so every face has its own value
const vec3 GOLD = vec3(0.640, 0.390, 0.083);   // the site's gold, in linear light
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
float hair(float d, float px) {
  float hw = max(0.017, px * 0.62);
  return 1.0 - smoothstep(hw - px * 0.5, hw + px * 0.5, d);
}
// the way: z at x, and its slope; it passes every place straight and swings between them
float way(float x, out float sl) {
  float z = uPZ[0]; sl = 0.0;
  for (int k = 0; k < 4; k++) {
    if (x < uPX[k]) continue;
    float w = uPX[k + 1] - uPX[k], f = clamp((x - uPX[k]) / w, 0.0, 1.0);
    z = mix(uPZ[k], uPZ[k + 1], f * f * (3.0 - 2.0 * f));
    sl = (uPZ[k + 1] - uPZ[k]) * 6.0 * f * (1.0 - f) / w;
  }
  return z;
}
float lamps(vec3 P, vec3 N) {
  float e = 0.0;
  for (int i = 0; i < 5; i++) {
    vec3 d = uLp[i] - P;
    float r2 = dot(d, d), il = inversesqrt(r2);
    e += uLi[i] * max(dot(N, d) * il, 0.0) * mix(1.0, max(-dot(d, uLd[i].xyz) * il, 0.0), uLd[i].w) / (r2 + 0.22);
  }
  return e;
}
void main() {
  vec3 N = normalize(vN), alb = vC, col;
  float m = vM.x, ao = vM.y;
  if (m > 3.5 && m < 4.5) col = mix(vec3(0.010, 0.012, 0.016), alb * ao, vM.z);   // doors, windows, lamps: dark until their place is on
  else if (m > 5.5 && m < 6.5) {                                                  // the table: only a soft shadow under the tray
    vec2 p = vP.xz;
    col = uInk * (1.0 - 0.42 * boxS(p, uBlk.xy - 0.5, uBlk.zw + 0.5, 1.5)) * (1.0 - 0.62 * boxS(p, uBlk.xy - 0.3, uBlk.zw + 0.3, 0.5));
    vec2 e = min(gl_FragCoord.xy, uRes.xy - gl_FragCoord.xy) / uRes.z;            // and none of it at the picture's edge
    col = mix(uInk, col, smoothstep(0.0, 1.0, min(e.x, e.y)));
  } else {
    vec3 extra = vec3(0.0);
    float up = N.y;
    if (m > 0.5 && m < 1.5) {              // timber: upright boards
      float s = abs(N.z) > 0.5 ? vP.x : vP.z;
      alb *= 1.0 - 0.5 * joint(s, 0.13, 0.02, 1.0) * step(abs(up), 0.5);
    } else if (m > 1.5 && m < 2.5) {       // stone: soft shadows where things stand, the line of brass, the beacon's rings
      alb *= 1.0 - 0.26 * max(joint(vP.x - uBlk.x, 1.3, 0.016, 1.0), joint(vP.z - uBlk.w, 1.3, 0.016, 2.45));   // large slabs
      for (int i = 0; i < 4; i++) ao *= 1.0 - 0.5 * boxS(vP.xz, uFoot[i].xy - uFoot[i].zw, uFoot[i].xy + uFoot[i].zw, 0.3);
      for (int i = 0; i < 8; i++) { vec2 dd = vP.xz - uTree[i].xy; ao *= 1.0 - 0.6 * exp(-dot(dd, dd) / uTree[i].z); }
      float sl, wz = way(vP.x, sl), d = abs(vP.z - wz) / sqrt(1.0 + sl * sl), pz = uPx * 2.45;
      float span = smoothstep(uPX[0] - 0.03, uPX[0] + 0.03, vP.x) * (1.0 - smoothstep(uPath.w - 0.03, uPath.w + 0.03, vP.x));
      float drawn = (1.0 - smoothstep(uPath.x - 0.25, uPath.x, vP.x)) * span * uPath.y;
      extra += GOLD * (1.5 * hair(d, pz) + 0.07 * exp(-d * d / 0.03)) * drawn;
      float hz = way(uPath.x, sl); vec2 hd = vP.xz - vec2(uPath.x, hz);
      extra += GOLD * 2.2 * exp(-dot(hd, hd) / 0.05) * uPath.z;
      // rings round the beacon: one let into the stone, the others go out and fade
      vec2 q = vP.xz - vec2(uPX[4], uPZ[4]);
      float r = length(q) + 0.0001, pr = uPx * (1.0 + 1.45 * abs(q.y) / r), rings = hair(abs(r - 0.3), pr) * 0.9 * uBeacon;
      for (int k = 0; k < 2; k++) {
        float ph = fract(uRing.x + 0.5 * float(k));
        rings += hair(abs(r - 0.3 - 2.0 * ph), pr) * (1.0 - ph) * (1.0 - ph) * smoothstep(0.0, 0.12, ph) * 0.34 * uRing.y;
      }
      rings += hair(abs(r - 0.3 - 2.0 * uRing.z), pr) * (1.0 - uRing.z) * uRing.w;
      extra += GOLD * 1.5 * rings;
    } else if (m > 7.5 && m < 8.5) alb *= 1.0 - 0.4 * joint(vP.x, 0.2, 0.02, 1.0);   // a deck's boards
    else if (m > 6.5 && m < 7.5) alb *= 1.0 + 1.2 * smoothstep(-0.05, -0.012, vP.y) * step(vP.y, 0.001);   // the tray's top edge catches the light
    float rock = m > 4.5 && m < 5.5 ? 1.0 : 0.0;   // the folded ridge takes more of the key light: each facet its own value
    vec3 light = (uSky * mix(0.16, 1.0, 0.5 + 0.5 * up) * (1.0 - 0.45 * rock) + uKey * max(dot(N, KEY), 0.0) * (1.0 + 1.8 * rock)) * ao;
    light += uWarm * lamps(vP, N) * 2.2 * (0.5 + 0.5 * ao);
    light += uSunC * rock * max(dot(N, vec3(-0.12, 0.5, -0.86)), 0.0);   // the low sun behind it grazes the ridge
    col = alb * light + extra;
    if (rock > 0.5) col = mix(col, uSky * 0.11, 0.55 * exp(-vP.y * 0.9));   // haze at the foot of the mountain
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

  // ---- GL plumbing
  function program(vs, fs, attribs, uniforms) {
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('steps shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('steps link: ' + gl.getProgramInfoLog(p));
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
  const L_MESH = [['aP', 3, 0], ['aN', 3, 3], ['aC', 3, 6], ['aM', 3, 9]], L_POS = [['aP', 3, 0]], L_DISC = [['aQ', 2, 0]];

  // ---- what lives on the GPU; made again if the context comes back
  let R = null;
  const models = {};   // one per spacing, built when first needed
  function setup() {
    const r = {};
    r.mesh = program(VS_MESH, FS_MESH, ['aP', 'aN', 'aC', 'aM'], ['uVP', 'uOn', 'uSky', 'uKey', 'uInk', 'uWarm', 'uSunC', 'uRes', 'uPx', 'uLp', 'uLd', 'uLi', 'uFoot', 'uTree', 'uPX', 'uPZ', 'uPath', 'uRing', 'uBlk', 'uBeacon']);
    r.disc = program(VS_DISC, FS_DISC, ['aQ'], ['uVP', 'uC', 'uR', 'uU', 'uSize', 'uCol', 'uKind', 'uRes']);
    r.line = program(VS_LINE, FS_LINE, ['aP'], ['uVP', 'uCol']);
    r.bDisc = buffer(new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]));
    for (const k in models) delete models[k];
    R = r;
  }
  function model(S) {
    if (!models[S]) {
      const m = build(S);
      m.bMesh = buffer(m.data); m.data = null;
      m.bCrest = buffer(new Float32Array(m.crest));
      models[S] = m;
    }
    return models[S];
  }
  // a shader that does not compile (an exotic driver): no picture, the list stays as it is
  try { setup(); } catch (err) { if (window.console) console.warn(err.message || err); return; }

  // ---- the picture in the page: a box above the list, as wide as the list and the gutters beside it
  const fig = document.createElement('div');
  fig.className = 'steps-model';
  fig.setAttribute('aria-hidden', 'true');
  fig.append(canvas);
  ol.before(fig);
  ol.classList.add('steps--raum');
  const host = ol.parentElement;

  const BUDGET = 2.6e6;        // device pixels at most
  const PITCH = 5.6;           // model units from place to place on wide screens
  let cur = null, K = 1, scale = 1, key = '';
  function layout() {
    if (!R) return;
    const W = fig.clientWidth;
    if (W < 40) return;
    const row = wide.matches && Math.abs(items[0].offsetTop - items[4].offsetTop) < 2;
    let m, X3;
    if (row) {
      // five columns: each place above the middle of its column's text
      const f = fig.getBoundingClientRect();
      const mid = li => { const b = li.getBoundingClientRect(); return b.left - f.left + (b.width - parseFloat(getComputedStyle(li).paddingRight)) / 2; };
      m = model(PITCH);
      K = (mid(items[4]) - mid(items[0])) / (4 * PITCH); X3 = mid(items[2]);
    } else {
      // two columns or one: the places move together, the tray is as wide as the list
      const f = fig.getBoundingClientRect(), b = ol.getBoundingClientRect();
      m = model(b.width >= 620 ? 4.6 : 3.0);
      K = Math.min(b.width / (m.x1 - m.x0), 44); X3 = b.left - f.left + b.width / 2 - K * ((m.x0 + m.x1) / 2 - m.c0);
    }
    const top = K, H = Math.ceil(top + K * (m.y1 - m.y0) + 0.95 * K);
    const s = Math.min(devicePixelRatio || 1, 2, Math.sqrt(BUDGET / (W * H)));
    const k = [m.S, W, H, X3.toFixed(1), K.toFixed(4), s].join(':');
    if (k === key) return;
    key = k; cur = m; scale = s;
    fig.style.height = H + 'px';
    canvas.width = Math.round(W * s); canvas.height = Math.round(H * s);
    const ne = DIST - 40, fa = DIST + 60;
    proj.fill(0);
    proj[0] = 2 * K * DIST / W; proj[5] = 2 * K * DIST / H;
    proj[8] = -(2 * (X3 - K * m.c0) / W - 1); proj[9] = -(1 - 2 * (top + K * m.y1) / H);
    proj[10] = (fa + ne) / (ne - fa); proj[11] = -1; proj[14] = 2 * fa * ne / (ne - fa);
    paint();
  }

  // ---- the draw-in, in seconds from its start
  const T_LINE = 0.3, D_LINE = 1.8, T_SUN = 1.3, D_SUN = 1.6, T_END = 4.2;
  const arrive = i => T_LINE + D_LINE * i / 4;   // when the line reaches place i
  let began = still, t0 = 0, rested = still;
  const on = new Float32Array(10), li5 = new Float32Array(5), v3 = [0, 0, 0];
  const SKY = [0.110, 0.150, 0.215], KEYL = [0.050, 0.065, 0.090], WARM = lin(236, 186, 104), INK = lin(16, 20, 26);
  const lit = [false, false, false, false, false];

  function disc(r, at, size, cr, cg, cb, sharp, solid) {
    gl.uniform3f(r.disc.u.uC, at[0], at[1], at[2]); gl.uniform1f(r.disc.u.uSize, size);
    gl.uniform3f(r.disc.u.uCol, cr, cg, cb); gl.uniform2f(r.disc.u.uKind, sharp, solid);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function draw(now) {
    const r = R, m = cur;
    if (!r || !m || gl.isContextLost()) return;
    const t = still ? 0 : now / 1000, tt = still ? 99 : began ? (now - t0) / 1000 : -1;
    // what is switched on: the door first, then each place as the line reaches it; the board's frames one by one
    const head = clamp((tt - T_LINE) / D_LINE) * 4, hk = Math.min(3, Math.floor(head));
    const headX = tt < T_LINE ? m.PX[0] - 1 : m.PX[hk] + (m.PX[hk + 1] - m.PX[hk]) * (head - hk);
    on[0] = ease(clamp(tt / 0.5));
    for (let i = 1; i < 5; i++) on[i] = ease(clamp((tt - arrive(i) + 0.08) / 0.6));
    for (let k = 0; k < 5; k++) on[5 + k] = ease(clamp((tt - arrive(3) + 0.08 - 0.11 * k) / 0.45));
    const sun = ease(clamp((tt - T_SUN) / D_SUN)), breath = still ? 1 : 1 + 0.05 * Math.sin(t * 0.8);
    on[4] *= breath;
    for (let i = 0; i < 5; i++) {
      li5[i] = m.li[i] * (i === 3 ? (on[5] + on[6] + on[7] + on[8] + on[9]) / 5 : on[i]);
      // the step's text comes up with its place (style.css, .steps--wait)
      const o = on[i] > 0.02;
      if (o !== lit[i]) { lit[i] = o; items[i].classList.toggle('is-on', o); }
    }
    if (!rested && tt >= T_END) { rested = true; ol.classList.remove('steps--wait'); }

    // the camera drifts by half a degree, so the depth is felt
    camera(AZ + (still ? 0 : 0.008 * Math.sin(t * 0.11)), EL + (still ? 0 : 0.002 * Math.sin(t * 0.083 + 1.3)));
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
    gl.uniform3fv(p.u.uLp, m.lp); gl.uniform4fv(p.u.uLd, m.ld); gl.uniform1fv(p.u.uLi, li5);
    gl.uniform4fv(p.u.uFoot, m.foot); gl.uniform3fv(p.u.uTree, m.tree);
    gl.uniform1fv(p.u.uPX, m.PX); gl.uniform1fv(p.u.uPZ, PZ);
    gl.uniform4f(p.u.uPath, headX, tt < T_LINE ? 0 : 1, tt < T_LINE ? 0 : 1 - clamp((tt - T_LINE - D_LINE) / 0.6), m.PX[4] - 0.3);
    // the beacon: one ring goes out when it lights, then a faint one every eleven seconds
    const first = clamp((tt - arrive(4) - 0.15) / 1.9);
    gl.uniform4f(p.u.uRing, still ? 0.4 : (t / 11) % 1, on[4] * clamp((tt - arrive(4) - 1.4) / 1.5), first, first > 0 && first < 1 ? 0.8 : 0);
    gl.uniform1f(p.u.uBeacon, Math.min(1, on[4]));
    gl.uniform4f(p.u.uBlk, m.blk[0], m.blk[1], m.blk[2], m.blk[3]);
    bind(p, m.bMesh, 12, L_MESH);
    gl.disable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLES, m.n - 6, 6);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.drawArrays(gl.TRIANGLES, 0, m.n - 6);
    unbind(p, L_MESH);

    // from here on: light and air, laid over the model (colour already multiplied by its alpha)
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);

    // the sun rises into the saddle, behind the ridge
    p = r.disc; gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform3f(p.u.uR, right[0], right[1], right[2]); gl.uniform3f(p.u.uU, upv[0], upv[1], upv[2]);
    gl.uniform3f(p.u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight, 0.5 * K * scale);
    bind(p, r.bDisc, 2, L_DISC);
    v3[0] = m.sun[0]; v3[1] = m.sun[1] - (1 - sun) * 1.9; v3[2] = m.sun[2];
    if (sun > 0.004) {
      disc(r, v3, 2.4, 0.925 * 0.22 * sun, 0.729 * 0.22 * sun, 0.408 * 0.22 * sun, 0, 0);
      disc(r, v3, 1.5, 0.925 * 0.3 * sun, 0.80 * 0.3 * sun, 0.55 * 0.3 * sun, 0, 0);
      disc(r, v3, 0.66, 0.975 * sun, 0.83 * sun, 0.56 * sun, 1, sun);
    }
    unbind(p, L_DISC);

    // the ridge's gold hairline; it lights up when the sun stands behind it
    p = r.line; gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform4f(p.u.uCol, 0.925, 0.82, 0.55, 0.22 + 0.55 * sun);
    bind(p, m.bCrest, 3, L_POS); gl.drawArrays(gl.LINE_STRIP, 0, CREST.length); unbind(p, L_POS);

    // a breath of glow in the air at every lamp that is on, and the sun's glare over the ridge
    gl.disable(gl.DEPTH_TEST);
    p = r.disc; gl.useProgram(p.p); bind(p, r.bDisc, 2, L_DISC);
    for (let i = 0; i < 5; i++) {
      const g = m.glow[i], a = 0.075 * li5[i] / m.li[i] * (i === 4 ? 1.5 : 1);
      if (a > 0.001) disc(r, g, g[3], 0.925 * a, 0.729 * a, 0.408 * a, 0, 0);
    }
    if (sun > 0.004) disc(r, v3, 2.2, 0.925 * 0.08 * sun, 0.729 * 0.08 * sun, 0.408 * 0.08 * sun, 0, 0);
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

  if (!still && 'IntersectionObserver' in window) {
    ol.classList.add('steps--wait');   // the steps wait dimmed until their place is on (style.css)
    new IntersectionObserver(es => {
      for (const e of es) { visible = e.isIntersecting; if (e.intersectionRatio >= 0.35) begin(); }
      kick();
    }, { threshold: [0, 0.35] }).observe(fig);
  } else if (!still) { visible = true; begin(); }
  document.addEventListener('visibilitychange', kick);

  // a lost context: the picture goes, the list shows its own line again; back when the context is
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); R = null; key = '';
    fig.hidden = true; ol.classList.remove('steps--raum', 'steps--wait');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    try { setup(); } catch (err) { R = null; return; }
    fig.hidden = false; ol.classList.add('steps--raum');
    layout(); kick();
  });

  // first call on observe, then on every width change of the section
  new ResizeObserver(layout).observe(host);
  addEventListener('resize', layout);
})();
