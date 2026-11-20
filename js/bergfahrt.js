/* ============ BLAUE STUNDE — "Bergfahrt": the cable car ride as a presentation model (3D) ============
   The three links of <ol class="chain"> become the stations of a cable car. The section pins like
   the cine scenes; the picture is an architect's model in raw WebGL (no library, no images), in the
   same hand as the Wellness scene (js/therme-scene.js): one block of dark stone, the massif
   folded out of it (two summits and a saddle, the bigger one left: the logo), a valley station at
   its foot, two pylons, the cable, a hut with a terrace on the shoulder under the smaller summit.

   What moves
   - with the scroll: the cabin rides up the cable; the season and the light change with the station;
     the camera pushes in a little (forward only)
   - with time: snow falling, a slight sway of the cabin, a camera drift of about one degree
   Everything else stands still.
   - station 1, Winter: blue hour, snow on the faces, snowfall, ski tracks, the valley station lit
   - station 2, Sommer: the snow is gone, warm daylight with real shadows, meadows on the lower faces,
     a path with a few markers, the cabin half way
   - station 3, Am Gipfel: the low sun in the saddle, long shadows towards us, the hut's windows and
     the lights of its terrace on, the cabin arriving

   How it is made: one static mesh shaded per face in linear light (sky, a cool key, the lamps, two
   suns with a shadow map each, rendered once), a small mesh for the cabin, hairlines as ribbons
   (crest, cable, tracks, path), a few sprites (snow, sun, glows).
   Without WebGL, without JS or with reduced motion the list stays as it is (vertical rail,
   style.css). A lost context: the band stays ink. Own file, like evidence.js: an error here cannot
   stop the scroll engine.
   ================================================================================================= */
(() => {
  const chain = document.querySelector('.chain');
  if (!chain || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [...chain.children];
  if (items.length !== 3) return;

  // the canvas first, not yet in the page: without WebGL nothing is touched
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let gl = null;
  try { gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: true, stencil: false }); } catch (err) { gl = null; }
  if (!gl) return;

  const ease = u => u * u * (3 - 2 * u);
  const clamp = u => Math.min(1, Math.max(0, u));
  const ss = (a, b, x) => ease(clamp((x - a) / (b - a)));
  let seed = 31;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // fixed, so every visit looks the same
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lin = (r, g, b) => [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];   // site colours into linear light

  // ---- the model: x along the front, y up, z towards us. The valley floor is y = 0.
  const PX = 7.0, ZB = -5.4, ZF = 3.8, BASE = -0.6;                      // the block
  const RIDGE_Z = -3.9, FOOT_Z = 0.9, HMAX = 5.4;                        // the massif: crest line, foot line, the big summit
  const YT = 2.35, HH = 1.02;                                            // the hut's floor, on the shoulder; a storey under the roofs
  const AZ = 18 * Math.PI / 180, EL = 27 * Math.PI / 180, EL_PHONE = 33 * Math.PI / 180, DIST = 60;   // the view: from the right, raised, far away
  const TARGET = [0, 1.6, -0.6], PUSH = 2.6;                             // the scroll moves the camera this far forward
  // the crest, left to right: the big summit, the saddle, the smaller summit (the logo)
  const CREST = [[-7.0, 1.9], [-6.2, 2.7], [-5.4, 3.7], [-4.6, 4.65], [-3.7, 5.4], [-2.8, 4.3], [-1.9, 3.2], [-1.0, 2.6], [-0.1, 2.4],
    [0.8, 2.75], [1.7, 3.4], [2.55, 4.1], [3.4, 4.8], [4.3, 4.0], [5.2, 3.2], [6.1, 2.55], [7.0, 2.05]];
  // the shoulder under the smaller summit, where the hut stands: heights of the two upper rows per column
  const BENCH = { 10: [1.5, 2.0], 11: [2.0, 2.2], 12: [2.0, 2.2], 13: [2.0, 2.2], 14: [1.95, 2.15], 15: [1.4, 1.9] };
  // the cable: from the valley station's roof edge to the hut's, over two pylons at the thirds
  const CA = [-4.0, 0.98, 1.9], CB = [2.2, YT + HH - 0.07, -2.95], SAG = 0.06, CAB_DZ = 0.3;
  const U0 = 0.062, U1 = 0.955;                                          // where the cabin waits and where it arrives
  const TREES = [[-6.45, 0.55, 0.95], [-5.85, 0.3, 1.2], [-6.3, -0.25, 0.85], [-5.2, 0.45, 0.8],
    [5.3, 2.2, 1.0], [6.05, 1.6, 1.3], [6.4, 2.75, 0.85], [4.7, 1.45, 0.8], [5.75, 3.15, 0.7]];
  // lamps, read by the shader too
  const VL = { x0: -5.12, x1: -4.5, y: 0.74, z: 2.25 };                  // the valley hall's pendants
  const HL = { x0: 2.55, x1: 2.9, y: YT + 0.78, z: -2.86 };              // the arrival bay's pendants
  const TL = { x0: 2.32, dx: 0.52, n: 7, y: YT + 0.4, z: -1.78 };        // the terrace lights

  // materials: albedo in linear light
  const C = {
    stone: [0.13, 0.145, 0.165], side: [0.075, 0.085, 0.10], roof: [0.23, 0.245, 0.27], dark: [0.03, 0.03, 0.035],
    timber: [0.24, 0.15, 0.085], boards: [0.30, 0.20, 0.11], bed: [0.24, 0.18, 0.115], tree: [0.045, 0.08, 0.07],
    glass: [0.84, 0.50, 0.14], lamp: [1.0, 0.78, 0.46], steel: [0.20, 0.215, 0.24], plinth: [0.10, 0.11, 0.125],
    cabin: [0.05, 0.055, 0.065], mark: [0.85, 0.66, 0.30],
  };
  // material ids, read by the shader
  const M = { plain: 0, timber: 1, stone: 2, light: 4, rock: 5, table: 6, side: 7, boards: 8, roof: 9, hut: 11, terrace: 12, cabin: 13, mark: 14 };

  // ---- mesh: 11 floats a corner (place, normal, colour, material, occlusion)
  let V = [];
  const put = (p, n, c, m, ao) => { V.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], m, ao); };
  function quad(a, b, c, d, col, m, ao) {   // a..d counter-clockwise seen from outside
    const n = norm(cross(sub(b, a), sub(c, a))), o = ao || [1, 1, 1, 1];
    put(a, n, col, m, o[0]); put(b, n, col, m, o[1]); put(c, n, col, m, o[2]);
    put(a, n, col, m, o[0]); put(c, n, col, m, o[2]); put(d, n, col, m, o[3]);
  }
  function tri(a, b, c, ca, cb, cc, m, out) {   // flat, turned so it faces `out`
    let n = norm(cross(sub(b, a), sub(c, a)));
    if (dot(n, out) < 0) { n = [-n[0], -n[1], -n[2]]; put(a, n, ca, m, 1); put(c, n, cc, m, 1); put(b, n, cb, m, 1); }
    else { put(a, n, ca, m, 1); put(b, n, cb, m, 1); put(c, n, cc, m, 1); }
    return n;
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
  const post = (x, z, y0, y1, w, col) => box(x - w, y0, z - w, x + w, y1, z + w, col || C.dark, M.plain);
  // a fir, as a model maker turns it: a slim cone on a pin
  function fir(x, g, z, h) {
    const r = h * 0.16, y0 = g + h * 0.14, n = 14, hh = h * 0.86, top = [x, g + h, z];
    box(x - 0.025, g - 0.1, z - 0.025, x + 0.025, y0 + 0.04, z + 0.025, C.dark, M.plain);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, am = (a0 + a1) / 2;
      const p0 = [x + r * Math.cos(a0), y0, z + r * Math.sin(a0)], p1 = [x + r * Math.cos(a1), y0, z + r * Math.sin(a1)];
      const n0 = norm([Math.cos(a0) * hh, r, Math.sin(a0) * hh]), n1 = norm([Math.cos(a1) * hh, r, Math.sin(a1) * hh]), nm = norm([Math.cos(am) * hh, r, Math.sin(am) * hh]);
      put(p1, n1, C.tree, M.plain, 0.55); put(p0, n0, C.tree, M.plain, 0.55); put(top, nm, C.tree, M.plain, 1);
    }
  }
  // a pylon's mast: a slim square pin that tapers
  function mast(x, z, y0, y1, r0, r1) {
    const ring = (r, y) => [[x - r, y, z + r], [x + r, y, z + r], [x + r, y, z - r], [x - r, y, z - r]];
    const b = ring(r0, y0), t = ring(r1, y1);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(b[i], b[j], t[j], t[i], C.steel, M.plain, [0.6, 0.6, 1, 1]); }
  }

  // the cable's place at u (0 at the valley roof, 1 at the hut's); it sags a little in each span
  function cableAt(u, out, dz) {
    const c = clamp(u), v = (c * 3) % 1;
    out[0] = CA[0] + (CB[0] - CA[0]) * u; out[1] = CA[1] + (CB[1] - CA[1]) * c - SAG * 4 * v * (1 - v); out[2] = CA[2] + (CB[2] - CA[2]) * u + dz;
    return out;
  }
  // the terrain's height at a place (the rock's triangles are kept for this)
  const rockTris = [];
  function ground(x, z) {
    let y = 0;
    for (let i = 0; i < rockTris.length; i++) {
      const a = rockTris[i][0], b = rockTris[i][1], c = rockTris[i][2];
      const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
      if (Math.abs(d) < 1e-9) continue;
      const l1 = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d, l2 = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d, l3 = 1 - l1 - l2;
      if (l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6) y = Math.max(y, l1 * a[1] + l2 * b[1] + l3 * c[1]);
    }
    return y;
  }

  // hairlines: ribbons that face the camera, 8 floats a corner (place, direction, side, alpha)
  let L = [];
  function ribbon(pts, alpha) {
    const n = pts.length, T = i => norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
    const v = (p, t, s, a) => L.push(p[0], p[1], p[2], t[0], t[1], t[2], s, a);
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1], ta = T(i), tb = T(i + 1), aa = alpha ? alpha(i / (n - 1)) : 1, ab = alpha ? alpha((i + 1) / (n - 1)) : 1;
      v(a, ta, -1, aa); v(a, ta, 1, aa); v(b, tb, 1, ab); v(a, ta, -1, aa); v(b, tb, 1, ab); v(b, tb, -1, ab);
    }
  }
  // a ski track: a bent fall line with turns swung around it, laid on the snow
  function track(p0, pc, p1, turns, amp, ph) {
    const pts = [], n = 120;
    for (let i = 0; i <= n; i++) {
      const s = i / n, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s;
      const x = a * p0[0] + b * pc[0] + c * p1[0], z = a * p0[1] + b * pc[1] + c * p1[1];
      const dx = (1 - s) * (pc[0] - p0[0]) + s * (p1[0] - pc[0]), dz = (1 - s) * (pc[1] - p0[1]) + s * (p1[1] - pc[1]), l = Math.hypot(dx, dz) || 1;
      const o = amp * Math.sin(s * turns * 6.2832 + ph) * Math.min(1, s * 6, (1 - s) * 5 + 0.25);
      const X = x - dz / l * o, Z = z + dx / l * o;
      pts.push([X, ground(X, Z) + 0.035, Z]);
    }
    return pts;
  }
  // a path: straight legs with rounded turns (corners cut three times), laid on the ground
  function path(legs) {
    let p = legs;
    for (let k = 0; k < 3; k++) {
      const q = [p[0]];
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i], b = p[i + 1];
        q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      q.push(p[p.length - 1]); p = q;
    }
    const pts = [];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.07));
      for (let j = 0; j < n; j++) { const x = a[0] + (b[0] - a[0]) * j / n, z = a[1] + (b[1] - a[1]) * j / n; pts.push([x, ground(x, z) + 0.035, z]); }
    }
    return pts;
  }

  let nCast = 0, nAll = 0, nCabin = 0, meshData = null, cabinData = null, lineData = null;
  const fitPts = [], lines = {}, floorTrees = [], SADDLE = [0, 0, 0];
  function build() {
    V = []; L = []; seed = 31;
    // --- the massif: one folded surface, five rows from the foot to the crest, ribs and gullies in turn
    const n = CREST.length, cols = [], crest = [];
    for (let i = 0; i < n; i++) {
      const end = i === 0 || i === n - 1, x = CREST[i][0], h = CREST[i][1], rib = i % 2 === 0, j = end ? 0 : 1, bench = BENCH[i];
      const zc = bench ? RIDGE_Z - 0.25 : RIDGE_Z + (rib ? 0.26 : -0.2) + (rnd() - 0.5) * 0.3, zf = FOOT_Z + (rib ? 0.25 : -0.2);
      const f = rib ? [0, 0.24, 0.5, 0.77] : [0, 0.31, 0.57, 0.84], hf = rib ? [0, 0.22, 0.5, 0.78] : [0, 0.16, 0.4, 0.7], col = [];
      for (let r = 0; r < 4; r++) col.push([x + j * (rnd() - 0.5) * (r ? 0.45 : 0.25), h * hf[r], zf + (zc - zf) * f[r]]);
      if (bench) { col[2][1] = bench[0]; col[2][2] = -1.25 + (rib ? 0.2 : -0.15); col[3][0] = x; col[3][1] = bench[1]; col[3][2] = -3.74; }
      col.push([x, h, zc], [x, h * 0.5, ZB]);
      cols.push(col);
      fitPts.push([x, h, zc]); crest.push([x, h + 0.012, zc + 0.012]);
      if (i === 8) { SADDLE[0] = x; SADDLE[1] = h; SADDLE[2] = zc; }
    }
    // a face's colour holds: its height, how much snow lies on it, how much meadow grows on it
    const rockTri = (a, b, c, out) => {
      const nn = norm(cross(sub(b, a), sub(c, a))), up = Math.abs(nn[1]), uc = (a[1] + b[1] + c[1]) / 3 / HMAX;
      const sn = 0.2 + 0.8 * ss(0.38, 0.68, up), md = (1 - ss(0.3, 0.62, uc)) * ss(0.45, 0.7, up);
      const col = p => [Math.min(1, p[1] / HMAX), sn, md];
      tri(a, b, c, col(a), col(b), col(c), M.rock, out);
      rockTris.push([a, b, c]);
    };
    for (let i = 0; i < n - 1; i++) for (let r = 0; r < 5; r++) {
      const a = cols[i][r], b = cols[i + 1][r], c = cols[i + 1][r + 1], d = cols[i][r + 1], out = [0, 1, r < 4 ? 0.4 : -0.4];
      if ((i + r) % 2 === 0) { rockTri(a, b, c, out); rockTri(a, c, d, out); }
      else { rockTri(a, b, d, out); rockTri(b, c, d, out); }
    }
    // where the block is cut, the massif shows in section
    for (const [col, sx] of [[cols[0], -1], [cols[n - 1], 1]]) for (let r = 0; r < 5; r++) {
      const a = col[r], b = col[r + 1], a0 = [a[0], 0, a[2]], b0 = [b[0], 0, b[2]];
      tri(a, b, b0, C.side, C.side, C.side, M.side, [sx, 0, 0]); tri(a, b0, a0, C.side, C.side, C.side, M.side, [sx, 0, 0]);
    }

    // --- the valley station: a timber wing and an open hall under one thin roof, on a deck
    box(-6.9, 0, 1.15, -4.0, 0.08, 2.75, C.timber, M.plain, { top: C.boards, mTop: M.boards, b: 0.7, t: 0.9 });
    box(-6.7, 0.08, 1.3, -5.5, 0.98, 2.55, C.timber, M.timber, { b: 0.85, t: 0.55 });
    box(-5.5, 0.08, 1.3, -4.15, 0.98, 1.38, C.side, M.plain, { b: 0.9, t: 0.6 });
    for (const x of [-4.83, -4.18]) post(x, 2.52, 0.08, 0.98, 0.028);
    post(-4.18, 1.34, 0.08, 0.98, 0.028);
    box(-6.95, 0.98, 1.1, -3.95, 1.08, 2.98, C.roof, M.roof, { b: 0.5, t: 0.62 });
    for (const x of [-6.1, -5.86]) box(x - 0.012, 0.42, 2.55, x + 0.012, 0.74, 2.565, C.dark, M.plain);
    for (const x of [VL.x0, VL.x1]) box(x - 0.005, VL.y + 0.03, VL.z - 0.005, x + 0.005, 0.98, VL.z + 0.005, C.dark, M.plain);

    // --- the pylons: a mast and a cross arm, the two ropes on its ends
    const c3 = [0, 0, 0];
    for (const u of [1 / 3, 2 / 3]) {
      cableAt(u, c3, 0);
      mast(c3[0], c3[2], ground(c3[0], c3[2]) - 0.15, c3[1] - 0.05, 0.075, 0.04);
      box(c3[0] - 0.04, c3[1] - 0.055, c3[2] - 0.4, c3[0] + 0.04, c3[1] - 0.005, c3[2] + 0.4, C.steel, M.plain);
    }

    // --- the hut on the shoulder: a stone plinth, a timber deck that stands out over the slope on posts,
    // the house and the open arrival bay under one thin roof
    box(2.3, 0.6, -3.7, 5.5, YT, -2.5, C.plinth, M.plain, { top: C.stone, b: 0.7, t: 1 });
    box(2.2, YT - 0.05, -3.55, 5.5, YT + 0.06, -1.75, C.timber, M.plain, { top: C.boards, mTop: M.boards, b: 0.6, t: 0.9 });
    for (let i = 0; i < 5; i++) { const x = 2.26 + i * 0.795; post(x, -1.81, ground(x, -1.81) - 0.2, YT - 0.05, 0.028); }
    for (const z of [-2.68, -3.48]) post(2.26, z, ground(2.26, z) - 0.2, YT - 0.05, 0.028);
    box(3.1, YT + 0.06, -3.5, 5.2, YT + HH, -2.6, C.timber, M.timber, { b: 0.85, t: 0.55 });
    box(2.3, YT + 0.06, -3.5, 3.1, YT + HH, -3.42, C.side, M.plain, { b: 0.9, t: 0.6 });
    for (const z of [-2.63, -3.47]) post(2.33, z, YT + 0.06, YT + HH, 0.028);
    box(2.2, YT + HH, -3.6, 5.45, YT + HH + 0.1, -2.2, C.roof, M.roof, { b: 0.5, t: 0.62 });
    for (let i = 1; i < 4; i++) { const x = 3.3 + 1.7 * i / 4; box(x - 0.012, YT + 0.36, -2.6, x + 0.012, YT + 0.8, -2.585, C.dark, M.plain); }
    for (const x of [HL.x0, HL.x1]) box(x - 0.005, HL.y + 0.03, HL.z - 0.005, x + 0.005, YT + HH, HL.z + 0.005, C.dark, M.plain);
    // the terrace: a rail along its edge with a lamp on every pin, two tables
    box(2.24, YT + 0.335, -1.795, 5.48, YT + 0.355, -1.765, C.dark, M.plain);
    for (let i = 0; i < TL.n; i++) post(TL.x0 + i * TL.dx, TL.z, YT + 0.06, TL.y - 0.025, 0.011);
    for (const x of [3.45, 4.4]) box(x, YT + 0.06, -2.22, x + 0.48, YT + 0.19, -2.0, C.bed, M.plain, { b: 0.55 });

    // --- firs at the foot, the markers of the path
    for (const [x, z, h] of TREES) { const g = ground(x, z); fir(x, g, z, h); if (g < 0.02) floorTrees.push(x, z, (0.16 * h + 0.1) ** 2); }
    const LEGS = [[-3.75, 1.5], [-1.45, 0.72], [-2.35, -0.22], [-0.55, -0.78], [-1.25, -1.5], [0.72, -1.72], [2.12, -1.98]];
    for (let i = 1; i < LEGS.length - 1; i++) { const x = LEGS[i][0], z = LEGS[i][1], g = ground(x, z); post(x, z, g - 0.05, g + 0.18, 0.01); }
    nCast = V.length / 11;

    // --- the block: stone on top, cut faces around
    quad([-PX, 0, ZF], [PX, 0, ZF], [PX, 0, ZB], [-PX, 0, ZB], C.stone, M.stone);
    const g4 = [1, 1, 0.35, 0.35];
    quad([-PX, 0, ZF], [-PX, BASE, ZF], [PX, BASE, ZF], [PX, 0, ZF], C.side, M.side, g4);
    quad([PX, 0, ZF], [PX, BASE, ZF], [PX, BASE, ZB], [PX, 0, ZB], C.side, M.side, g4);
    quad([-PX, 0, ZB], [-PX, BASE, ZB], [-PX, BASE, ZF], [-PX, 0, ZF], C.side, M.side, g4);
    quad([PX, 0, ZB], [PX, BASE, ZB], [-PX, BASE, ZB], [-PX, 0, ZB], C.side, M.side, g4);

    // --- what glows: windows, lamps, the terrace lights, the markers' heads
    const wa = [0.95, 0.95, 0.6, 0.6];
    quad([-6.35, 0.42, 2.552], [-5.62, 0.42, 2.552], [-5.62, 0.74, 2.552], [-6.35, 0.74, 2.552], C.glass, M.light, wa);
    for (const x of [VL.x0, VL.x1]) box(x - 0.04, VL.y - 0.04, VL.z - 0.04, x + 0.04, VL.y + 0.04, VL.z + 0.04, C.lamp, M.light, { b: 3.2, t: 3.2 });
    quad([3.3, YT + 0.36, -2.598], [5.0, YT + 0.36, -2.598], [5.0, YT + 0.8, -2.598], [3.3, YT + 0.8, -2.598], C.glass, M.hut, wa);
    quad([5.202, YT + 0.36, -2.8], [5.202, YT + 0.36, -3.3], [5.202, YT + 0.8, -3.3], [5.202, YT + 0.8, -2.8], C.glass, M.hut, [0.7, 0.7, 0.45, 0.45]);
    for (const x of [HL.x0, HL.x1]) box(x - 0.04, HL.y - 0.04, HL.z - 0.04, x + 0.04, HL.y + 0.04, HL.z + 0.04, C.lamp, M.hut, { b: 3.2, t: 3.2 });
    for (let i = 0; i < TL.n; i++) { const x = TL.x0 + i * TL.dx; box(x - 0.03, TL.y - 0.03, TL.z - 0.03, x + 0.03, TL.y + 0.03, TL.z + 0.03, C.lamp, M.terrace, { b: 3.2, t: 3.2 }); }
    for (let i = 1; i < LEGS.length - 1; i++) { const x = LEGS[i][0], z = LEGS[i][1], g = ground(x, z) + 0.2; box(x - 0.027, g - 0.027, z - 0.027, x + 0.027, g + 0.027, z + 0.027, C.mark, M.mark, { b: 1.5, t: 1.5 }); }
    // the table under the block (drawn first, only its shadow shows)
    quad([-90, BASE, 90], [90, BASE, 90], [90, BASE, -90], [-90, BASE, -90], C.side, M.table);
    nAll = V.length / 11;
    meshData = new Float32Array(V);
    for (const x of [-PX, PX]) for (const z of [ZB, ZF]) { fitPts.push([x, 0, z]); fitPts.push([x, BASE, z]); }
    fitPts.push([5.45, YT + HH + 0.1, -2.2]);

    // --- the cabin, around its grip on the rope: a hanger, a thin roof, a dark body with a lit band of windows
    V = [];
    box(-0.07, -0.02, -0.035, 0.07, 0.035, 0.035, C.steel, M.plain);
    box(-0.016, -0.25, -0.016, 0.016, -0.02, 0.016, C.steel, M.plain);
    box(-0.275, -0.29, -0.215, 0.275, -0.25, 0.215, C.roof, M.plain, { b: 0.6, t: 0.8 });
    box(-0.25, -0.71, -0.19, 0.25, -0.29, 0.19, C.cabin, M.plain, { b: 1, t: 0.7 });
    const y0 = -0.53, y1 = -0.335, ca = [1, 1, 0.75, 0.75];
    quad([-0.22, y0, 0.192], [0.22, y0, 0.192], [0.22, y1, 0.192], [-0.22, y1, 0.192], C.glass, M.cabin, ca);
    quad([0.22, y0, -0.192], [-0.22, y0, -0.192], [-0.22, y1, -0.192], [0.22, y1, -0.192], C.glass, M.cabin, ca);
    quad([0.252, y0, 0.16], [0.252, y0, -0.16], [0.252, y1, -0.16], [0.252, y1, 0.16], C.glass, M.cabin, ca);
    quad([-0.252, y0, -0.16], [-0.252, y0, 0.16], [-0.252, y1, 0.16], [-0.252, y1, -0.16], C.glass, M.cabin, ca);
    for (const x of [-0.075, 0.075]) box(x - 0.009, y0, 0.19, x + 0.009, y1, 0.197, C.dark, M.plain);
    box(0.25, y0, -0.009, 0.257, y1, 0.009, C.dark, M.plain);
    nCabin = V.length / 11;
    cabinData = new Float32Array(V); V = [];

    // --- the hairlines: the crest, the two ropes, the ski tracks, the path
    const mark = (name, fn) => { const s = L.length / 8; fn(); lines[name] = [s, L.length / 8 - s]; };
    mark('crest', () => ribbon(crest));
    const rope = dz => { const pts = []; for (let i = -3; i <= 93; i++) pts.push(cableAt(i / 90, [0, 0, 0], dz)); return pts; };
    mark('rope', () => ribbon(rope(CAB_DZ)));
    mark('rope2', () => ribbon(rope(-CAB_DZ)));
    const fade = s => Math.min(1, s * 7, (1 - s) * 7);
    mark('tracks', () => {
      ribbon(track([-0.8, -1.6], [-1.8, -0.6], [-3.05, 1.4], 3, 0.12, 0), fade);
      ribbon(track([-1.6, -1.9], [-2.6, -0.8], [-3.45, 1.3], 3, 0.12, 0.9), fade);
      ribbon(track([-2.8, -1.7], [-3.3, -0.6], [-3.85, 1.05], 2.5, 0.1, 2.6), fade);
    });
    mark('path', () => ribbon(path(LEGS), s => Math.min(1, s * 20, (1 - s) * 20)));
    lineData = new Float32Array(L); L = [];
  }
  build();
  const NT = floorTrees.length / 3;

  // ---- shaders
  const f2 = v => v.toFixed(3);
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
attribute vec3 aP, aN, aC;
attribute vec2 aM;
uniform mat4 uVP, uM, uL2, uL3;
varying vec3 vP, vN, vC, vS2, vS3;
varying vec2 vM;
void main() {
  vec4 p = uM * vec4(aP, 1.0);
  vP = p.xyz; vN = (uM * vec4(aN, 0.0)).xyz; vC = aC; vM = aM;
  vS2 = (uL2 * p).xyz * 0.5 + 0.5; vS3 = (uL3 * p).xyz * 0.5 + 0.5;
  gl_Position = uVP * p;
}`;
  const FS_MESH = HEAD + `
varying vec3 vP, vN, vC, vS2, vS3;
varying vec2 vM;
uniform vec3 uW, uSky, uKey, uSun2, uSun2Dir, uSun3, uSun3Dir, uInk, uWarm, uCab;
uniform vec4 uLift;
uniform vec4 uEmit, uCabSh;   // how bright: valley station, hut, terrace lights, cabin; the cabin's shadow on the slope
uniform float uPx, uShTex, uMark;
uniform sampler2D uShadow2, uShadow3;
uniform vec3 uTree[${NT}];
` + FINISH + `
const vec3 KEY = vec3(-0.720, 0.500, 0.481);   // a cool key from the upper left, so every face has its own value
const vec3 FILL = vec3(0.750, 0.200, 0.630);
const vec3 SNOW = vec3(0.50, 0.56, 0.64);
const float YT = ${f2(YT)};
float boxS(vec2 p, vec2 lo, vec2 hi, float s) {   // a soft-edged rectangle
  vec2 a = smoothstep(lo - s, lo + s, p) * (1.0 - smoothstep(hi - s, hi + s, p));
  return a.x * a.y;
}
// fine dark joints every per units; never thinner than a pixel, they fade instead
float joint(float s, float per, float wid, float stretch) {
  float e = abs(fract(s / per + 0.5) - 0.5) * per, px = uPx * stretch, w = max(wid, px * 1.1);
  return (wid / w) * (1.0 - smoothstep(0.0, w, e)) * clamp(per / (px * 3.0) - 0.6, 0.0, 1.0);
}
float unpack(vec4 c) { return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }
float shadow(sampler2D map, vec3 s) {
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) return 1.0;
  float sum = 0.0;
  for (int i = -1; i <= 2; i++) for (int j = -1; j <= 2; j++) {
    vec2 o = (vec2(float(i), float(j)) - 0.5) * uShTex * 1.7;
    sum += step(s.z + 0.0007, unpack(texture2D(map, s.xy + o)));
  }
  return sum / 16.0;
}
float pt(vec3 P, vec3 N, vec3 S, float k) {   // a small lamp at S
  vec3 d = S - P; float r2 = dot(d, d);
  return max(dot(N, d) * inversesqrt(r2), 0.0) / (r2 + k);
}
float win(vec3 P, vec3 N, vec3 S, float k) {   // a window at S that shines towards us
  vec3 d = S - P; float r2 = dot(d, d), il = inversesqrt(r2);
  return max(dot(N, d) * il, 0.0) * max(-d.z * il, 0.0) / (r2 + k);
}
void main() {
  vec3 N = normalize(vN), alb = vC, col;
  float m = vM.x, ao = vM.y;
  if (m > 3.5 && m < 4.5) col = alb * ao * uEmit.x;                               // the valley station's window and lamps
  else if (m > 10.5) col = alb * ao * (m < 11.5 ? uEmit.y : m < 12.5 ? uEmit.z : m < 13.5 ? uEmit.w : uMark);
  else if (m > 5.5 && m < 6.5) {                                                  // the table: only a soft shadow under the block
    vec2 p = vP.xz, lo = vec2(${f2(-PX)}, ${f2(ZB)}), hi = vec2(${f2(PX)}, ${f2(ZF)});
    // the lift around the model is measured on the screen and is gone before the band's edges, so the
    // canvas never shows as a lighter box (Nicky, 2026-11-19, on a phone)
    vec2 q = (gl_FragCoord.xy - uLift.xy) * uLift.zw;
    float lift = 1.0 - smoothstep(0.3, 1.0, length(q));
    col = uInk * (1.0 + 1.5 * lift) * (1.0 - 0.5 * boxS(p, lo - 0.6, hi + 0.6, 2.6)) * (1.0 - 0.62 * boxS(p, lo - 0.35, hi + 0.35, 0.55));
  } else {
    float up = N.y, rock = 0.0, snow = 0.0, sun2 = 1.0, sun3 = 1.0, last = 0.0;
    if (m > 0.5 && m < 1.5) {                // timber: upright boards
      float s = abs(N.z) > 0.5 ? vP.x : vP.z;
      alb *= 1.0 - 0.5 * joint(s, 0.13, 0.02, 1.0) * step(abs(up), 0.5);
    } else if (m > 1.5 && m < 2.5) {         // the valley floor: stone on a grid, under snow in winter
      float j = max(joint(vP.x, 0.9, 0.02, 1.0), joint(vP.z - 0.2, 0.9, 0.02, 2.2));
      alb *= 1.0 - 0.42 * j * (1.0 - 0.85 * uW.x);
      ao *= 1.0 - 0.5 * boxS(vP.xz, vec2(-6.9, 1.15), vec2(-4.0, 2.75), 0.35);
      ao *= 0.74 + 0.26 * smoothstep(0.7, 2.1, vP.z);
      for (int i = 0; i < ${NT}; i++) { vec2 dd = vP.xz - uTree[i].xy; ao *= 1.0 - 0.55 * exp(-dot(dd, dd) / uTree[i].z); }
      snow = 0.92; sun2 = 0.72; sun3 = 0.34;   // the sun reaches the floor through the saddle only as a hint
    } else if (m > 4.5 && m < 5.5) {         // the massif: rock, meadow on the lower faces in summer, snow in winter
      float u = alb.x; rock = 1.0; snow = alb.y;
      vec3 rk = vec3(0.05 + 0.07 * u + 0.07 * u * u, 0.062 + 0.08 * u + 0.075 * u * u, 0.085 + 0.09 * u + 0.08 * u * u);
      alb = mix(rk, mix(rk * vec3(1.42, 1.18, 0.88), vec3(0.085, 0.118, 0.055), alb.z), uW.y + uW.z);
    } else if (m > 6.5 && m < 7.5) alb *= 1.0 + 1.2 * smoothstep(-0.05, -0.012, vP.y) * step(vP.y, 0.001);   // the block's top edge catches the light
    else if (m > 7.5 && m < 8.5) alb *= 1.0 - 0.4 * joint(vP.x, 0.2, 0.02, 1.0);   // deck boards run out from the house
    else if (m > 8.5 && m < 9.5) { snow = 0.9 * step(0.5, up); last = step(YT, vP.y); }   // the roofs carry snow; the hut's keeps the last light
    alb = mix(alb, SNOW, snow * uW.x);
    vec3 light = (uSky * mix(0.16, 1.0, 0.5 + 0.5 * up) * (1.0 - 0.45 * rock) + uKey * max(dot(N, KEY), 0.0) * (1.0 + 1.8 * rock)
      + uSky * 0.2 * rock * max(dot(N, FILL), 0.0)) * ao;   // a little fill from our side, so no face of the massif goes black
    if (uW.y > 0.004) {   // the summer sun, with the cabin's own small shadow
      vec3 dd = vP - uCabSh.xyz;
      light += uSun2 * max(dot(N, uSun2Dir), 0.0) * shadow(uShadow2, vS2) * (1.0 - uCabSh.w * exp(-dot(dd, dd) / 0.045)) * sun2;
    }
    if (uW.z > 0.004) light += uSun3 * max(dot(N, uSun3Dir), 0.0) * max(shadow(uShadow3, vS3), last) * sun3;
    if (vP.x < -1.5 && vP.z > 0.0 && vP.y < 2.2) {   // the valley hall's lamps and the wing's window
      float e = pt(vP, N, vec3(${f2(VL.x0)}, ${f2(VL.y)}, ${f2(VL.z)}), 0.25) + pt(vP, N, vec3(${f2(VL.x1)}, ${f2(VL.y)}, ${f2(VL.z)}), 0.25)
        + 0.6 * win(vP, N, vec3(-5.98, 0.58, 2.56), 0.4);
      light += uWarm * e * 0.8 * uEmit.x;
    }
    if (vP.x > 1.0 && vP.y > YT - 1.2) {           // the hut: its windows, the bay's lamps, the terrace lights
      float e = 1.3 * (pt(vP, N, vec3(${f2(HL.x0)}, ${f2(HL.y)}, ${f2(HL.z)}), 0.25) + pt(vP, N, vec3(${f2(HL.x1)}, ${f2(HL.y)}, ${f2(HL.z)}), 0.25));
      for (int i = 0; i < 3; i++) e += win(vP, N, vec3(3.6 + 0.55 * float(i), YT + 0.58, -2.58), 0.4);
      light += uWarm * e * 0.7 * uEmit.y;
      float tl = 0.0;
      for (int i = 0; i < ${TL.n}; i++) tl += pt(vP, N, vec3(${f2(TL.x0)} + ${f2(TL.dx)} * float(i), ${f2(TL.y)}, ${f2(TL.z)}), 0.04);
      light += uWarm * tl * 0.035 * uEmit.z;
    }
    light += uWarm * pt(vP, N, uCab, 0.2) * 0.12 * uEmit.w;   // the cabin carries its light with it
    col = alb * light;
    if (rock > 0.5) col = mix(col, uSky * 0.11, 0.3 * exp(-vP.y * 0.9));   // haze at the foot of the mountain
  }
  gl_FragColor = vec4(finish(col), 1.0);
}`;

  // hairlines: a ribbon a pixel or so wide that faces the camera, soft at its edges
  const VS_LINE = `
attribute vec3 aP, aT;
attribute vec2 aS;
uniform mat4 uVP;
uniform vec3 uView;   // the band in CSS px, half the line's width in px
varying vec2 vS;
void main() {
  vec4 c = uVP * vec4(aP, 1.0), d = uVP * vec4(aP + aT * 0.1, 1.0);
  vec2 s = (d.xy / d.w - c.xy / c.w) * uView.xy;
  s /= max(length(s), 0.00001);
  c.xy += vec2(-s.y, s.x) * aS.x * uView.z * 2.0 / uView.xy * c.w;
  vS = aS; gl_Position = c;
}`;
  const FS_LINE = HEAD + `
varying vec2 vS;
uniform vec4 uCol;
uniform float uWid;
void main() {
  float a = clamp((1.0 - abs(vS.x)) * uWid, 0.0, 1.0) * vS.y * uCol.a;
  gl_FragColor = vec4(uCol.rgb * a, a);
}`;

  // depth from a sun, packed into a colour texture (works everywhere)
  const VS_DEPTH = `
attribute vec3 aP;
uniform mat4 uLight;
void main() { gl_Position = uLight * vec4(aP, 1.0); }`;
  const FS_DEPTH = HEAD + `
void main() {
  vec4 e = fract(gl_FragCoord.z * vec4(1.0, 255.0, 65025.0, 16581375.0));
  gl_FragColor = e - e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
}`;

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
void main() {
  float r = length(vQ);
  float a = uKind.x > 0.5 ? 1.0 - smoothstep(0.96, 1.0, r) : max(exp(-r * r * 4.5) - 0.0111, 0.0);
  float n = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(uCol * a + n * step(0.002, a), a * uKind.y);
}`;

  // snow: small soft flakes that sink through the model, a little warmer where they pass the valley station's light
  const VS_SNOW = `
attribute vec4 aS;   // x, z, phase, speed
attribute vec3 aQ;   // corner, size in px
uniform mat4 uVP;
uniform vec3 uR, uU;
uniform vec3 uTP;    // time, world units a px, the valley station's light
varying vec2 vQ;
varying vec2 vA;
void main() {
  float u = fract(aS.z + uTP.x * aS.w * 0.03), k = aS.z * 61.0;
  vec3 c = vec3(aS.x + 0.22 * sin(u * 11.0 + k) + 0.5 * u, 7.4 * (1.0 - u), aS.y + 0.15 * sin(u * 7.0 + k * 1.7));
  vec3 d = c - vec3(-4.8, 0.7, 2.6);
  vQ = aQ.xy;
  vA = vec2(smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.93, 1.0, u)), exp(-dot(d, d) / 2.2) * uTP.z);
  gl_Position = uVP * vec4(c + (uR * aQ.x + uU * aQ.y) * aQ.z * uTP.y, 1.0);
}`;
  const FS_SNOW = HEAD + `
varying vec2 vQ;
varying vec2 vA;
uniform float uA;
void main() {
  float a = max(1.0 - dot(vQ, vQ), 0.0); a = a * a * vA.x * uA * (1.0 + 0.8 * vA.y);
  gl_FragColor = vec4(mix(vec3(0.80, 0.86, 0.93), vec3(0.98, 0.82, 0.55), min(vA.y, 0.8)) * a, a);
}`;

  // ---- GL plumbing
  function program(vs, fs, attribs, uniforms) {
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('bergfahrt shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('bergfahrt link: ' + gl.getProgramInfoLog(p));
    const a = {}, u = {};
    for (const k of attribs) a[k] = gl.getAttribLocation(p, k);
    for (const k of uniforms) u[k] = gl.getUniformLocation(p, k);
    return { p, a, u };
  }

  // ---- small matrix kit (column-major, as GL wants it); nothing is allocated per frame
  const view = new Float32Array(16), proj = new Float32Array(16), VP = new Float32Array(16), light2 = new Float32Array(16), light3 = new Float32Array(16);
  const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]), cabM = new Float32Array(IDENT);
  const eye = [0, 0, 0], right = [0, 0, 0], upv = [0, 0, 1];
  function lookAt(out, e, c) {
    const f = norm(sub(c, e)), s = norm(cross(f, [0, 1, 0])), u = cross(s, f);
    out[0] = s[0]; out[1] = u[0]; out[2] = -f[0]; out[3] = 0;
    out[4] = s[1]; out[5] = u[1]; out[6] = -f[1]; out[7] = 0;
    out[8] = s[2]; out[9] = u[2]; out[10] = -f[2]; out[11] = 0;
    out[12] = -dot(s, e); out[13] = -dot(u, e); out[14] = dot(f, e); out[15] = 1;
  }
  function mul(out, a, b) {
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  const F = [0, 0, 0];
  function camera(az, el, dist) {   // fills view, eye, right, up (no arrays made here: it runs every frame)
    const ce = Math.cos(el);
    F[0] = -Math.sin(az) * ce; F[1] = -Math.sin(el); F[2] = -Math.cos(az) * ce;                 // forward
    eye[0] = TARGET[0] - dist * F[0]; eye[1] = TARGET[1] - dist * F[1]; eye[2] = TARGET[2] - dist * F[2];
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

  // the evening sun: seen from the standing camera it sits in the saddle; its light comes low from behind.
  // The summer sun stands high in the front left
  const SUN_AT = [SADDLE[0], SADDLE[1] + 0.42, SADDLE[2]], SUN_POS = [0, 0, 0], SE = 24 * Math.PI / 180;
  let elNow = EL;
  function placeSun(el) {
    elNow = el; camera(AZ, el, DIST);
    for (let i = 0; i < 3; i++) SUN_POS[i] = eye[i] + (SUN_AT[i] - eye[i]) * 1.13;
  }
  placeSun(EL);
  const hd = norm([SUN_AT[0] - eye[0], 0, SUN_AT[2] - eye[2]]);
  const SUN3_DIR = [hd[0] * Math.cos(SE), Math.sin(SE), hd[2] * Math.cos(SE)], SUN2_DIR = norm([-0.62, 0.60, 0.50]);

  // ---- what lives on the GPU; made again if the context comes back
  let R = null;
  const SH = innerWidth < 768 ? 1024 : 2048;   // the shadow maps' size; phones get by with a quarter of the memory
  function buffer(data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; }
  function bind(pr, buf, stride, layout) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (let i = 0; i < layout.length; i++) {
      const l = pr.a[layout[i][0]]; if (l < 0) continue;
      gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, layout[i][1], gl.FLOAT, false, stride * 4, layout[i][2] * 4);
    }
  }
  function unbind(pr, layout) { for (let i = 0; i < layout.length; i++) if (pr.a[layout[i][0]] >= 0) gl.disableVertexAttribArray(pr.a[layout[i][0]]); }
  const L_MESH = [['aP', 3, 0], ['aN', 3, 3], ['aC', 3, 6], ['aM', 2, 9]], L_POS = [['aP', 3, 0]], L_DISC = [['aQ', 2, 0]],
    L_PART = [['aS', 4, 0], ['aQ', 3, 4]], L_LINE = [['aP', 3, 0], ['aT', 3, 3], ['aS', 2, 6]];
  const N_SNOW = 240;

  // one sun's shadow map: everything that stands, seen from the sun, once
  function shadowMap(r, dir, mat) {
    const lv = new Float32Array(16), lp = new Float32Array(16), c = [0, 1.5, -0.8], e = [c[0] + dir[0] * 40, c[1] + dir[1] * 40, c[2] + dir[2] * 40];
    lookAt(lv, e, c);
    const ex = 10.5, ne = 20, fa = 62;
    lp.set([1 / ex, 0, 0, 0, 0, 1 / ex, 0, 0, 0, 0, -2 / (fa - ne), 0, 0, 0, -(fa + ne) / (fa - ne), 1]);
    mul(mat, lp, lv);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SH, SH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(), rb = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SH, SH);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    gl.viewport(0, 0, SH, SH); gl.clearColor(1, 1, 1, 1); gl.clearDepth(1); gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
      gl.useProgram(r.depth.p); gl.uniformMatrix4fv(r.depth.u.uLight, false, mat);
      bind(r.depth, r.bMesh, 11, L_POS); gl.drawArrays(gl.TRIANGLES, 0, nCast); unbind(r.depth, L_POS);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); gl.deleteRenderbuffer(rb);
    gl.cullFace(gl.BACK);
    return tex;
  }

  function setup() {
    const r = {};
    r.mesh = program(VS_MESH, FS_MESH, ['aP', 'aN', 'aC', 'aM'], ['uVP', 'uM', 'uL2', 'uL3', 'uW', 'uSky', 'uKey', 'uSun2', 'uSun2Dir', 'uSun3', 'uSun3Dir',
      'uInk', 'uLift', 'uWarm', 'uCab', 'uEmit', 'uCabSh', 'uPx', 'uShTex', 'uMark', 'uShadow2', 'uShadow3', 'uTree']);
    r.depth = program(VS_DEPTH, FS_DEPTH, ['aP'], ['uLight']);
    r.disc = program(VS_DISC, FS_DISC, ['aQ'], ['uVP', 'uC', 'uR', 'uU', 'uSize', 'uCol', 'uKind']);
    r.snow = program(VS_SNOW, FS_SNOW, ['aS', 'aQ'], ['uVP', 'uR', 'uU', 'uTP', 'uA']);
    r.line = program(VS_LINE, FS_LINE, ['aP', 'aT', 'aS'], ['uVP', 'uView', 'uCol', 'uWid']);
    r.bMesh = buffer(meshData); r.bCabin = buffer(cabinData); r.bLine = buffer(lineData);
    r.bDisc = buffer(new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]));
    const Q = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]], d = [];
    seed = 77;
    for (let i = 0; i < N_SNOW; i++) {
      const x = (rnd() * 2 - 1) * (PX - 0.2) - 0.25, z = ZB + 0.4 + rnd() * (ZF - ZB - 0.6), ph = rnd(), sp = 0.7 + rnd() * 0.7, size = 1.1 + rnd() * 1.3;
      for (const q of Q) d.push(x, z, ph, sp, q[0], q[1], size);
    }
    r.bSnow = buffer(new Float32Array(d));
    r.sh2 = shadowMap(r, SUN2_DIR, light2);
    r.sh3 = shadowMap(r, SUN3_DIR, light3);
    R = r;
  }
  // a shader that does not compile (an exotic driver): the plain list stays, as without WebGL
  try { setup(); } catch (err) { if (window.console) console.warn(err.message || err); return; }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); R = null; });
  canvas.addEventListener('webglcontextrestored', () => { try { setup(); } catch (err) { R = null; } });

  // ---- where the picture goes: the block and the summits, fitted right of the copy (phones: the upper part)
  let fitW = 0, fitH = 0, K = 1, LCX = 0.4, LCY = 0, LBW = 1;   // LC*: the model's middle (clip space) and width (px), for the table's lift
  function fit(W, H, phone) {
    fitW = W; fitH = H;
    placeSun(phone ? EL_PHONE : EL);   // phones look from a little higher: the picture gets taller, not wider
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of fitPts) {
      const zv = view[2] * p[0] + view[6] * p[1] + view[10] * p[2] + view[14];
      const sx = DIST * (view[0] * p[0] + view[4] * p[1] + view[8] * p[2] + view[12]) / -zv, sy = DIST * (view[1] * p[0] + view[5] * p[1] + view[9] * p[2] + view[13]) / -zv;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    // the band's upper and lower edge fade into the page (style.css), so the model keeps clear of them
    const cx = phone ? 0.5 : 0.7, cy = phone ? 0.715 : 0.525;   // phones: the copy stands above the model
    K = Math.min((phone ? 0.92 : 0.5) * W / (x1 - x0), (phone ? 0.46 : 0.775) * H / (y1 - y0));
    const OX = 2 * cx - 1 - K * (x0 + x1) / W, OY = 1 - 2 * cy - K * (y0 + y1) / H;
    LCX = 2 * cx - 1; LCY = 1 - 2 * cy; LBW = (x1 - x0) * K;
    const ne = DIST - 34, fa = DIST + 70;
    proj.fill(0);
    proj[0] = 2 * K * DIST / W; proj[5] = 2 * K * DIST / H; proj[8] = -OX; proj[9] = -OY;
    proj[10] = (fa + ne) / (ne - fa); proj[11] = -1; proj[14] = 2 * fa * ne / (ne - fa);
  }

  // ---- the three stations: sky light, key light, the suns, what is lit (linear light)
  const SKY = [[0.125, 0.165, 0.235], [0.118, 0.122, 0.128], [0.115, 0.125, 0.170]];
  const KEYL = [[0.060, 0.078, 0.108], [0.026, 0.027, 0.030], [0.030, 0.032, 0.042]];
  const EMIT = [[1.0, 0.5, 0.85], [0.13, 0.16, 1.15], [0, 0, 1], [1.0, 0.6, 1.0]];   // valley station, hut, terrace lights, cabin
  const WARM = lin(236, 186, 104), INK = lin(16, 20, 26);
  const v3 = new Float32Array(3), treeData = new Float32Array(floorTrees);
  const mix3 = (a, w) => { for (let i = 0; i < 3; i++) v3[i] = a[0][i] * w[0] + a[1][i] * w[1] + a[2][i] * w[2]; return v3; };
  const wsum = (a, w) => a[0] * w[0] + a[1] * w[1] + a[2] * w[2];
  const sunAt = [0, 0, 0], cab = [0, 0, 0], cabSh = [0, 0, 0, 0], w = [1, 0, 0];
  let shadowP = -1, lineK = 1;
  // scroll progress → the cable: the cabin slows down at each station
  const cabinT = p => { const s = Math.min(2, p * 2), seg = Math.min(1, Math.floor(s)), u = s - seg; return (seg + ease(u)) / 2; };

  // where the cabin's shadow falls in summer: down the sun's ray to the ground (only when the cabin has moved)
  function cabinShadow(p) {
    if (Math.abs(p - shadowP) < 0.0008) return;
    shadowP = p; cabSh[3] = 0;
    let x = cab[0], y = cab[1] - 0.5, z = cab[2];
    for (let i = 0; i < 90; i++) {
      x -= SUN2_DIR[0] * 0.1; y -= SUN2_DIR[1] * 0.1; z -= SUN2_DIR[2] * 0.1;
      if (Math.abs(x) > PX || z < ZB || z > ZF) return;
      if (y <= ground(x, z)) { cabSh[0] = x; cabSh[1] = y; cabSh[2] = z; cabSh[3] = 0.8; return; }
    }
  }

  function disc(r, at, size, cr, cg, cb, sharp, solid) {
    gl.uniform3f(r.disc.u.uC, at[0], at[1], at[2]); gl.uniform1f(r.disc.u.uSize, size);
    gl.uniform3f(r.disc.u.uCol, cr, cg, cb); gl.uniform2f(r.disc.u.uKind, sharp, solid);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function line(r, name, wid, cr, cg, cb, a) {
    if (a < 0.004) return;
    wid = wid * lineK + 0.7;   // half the width in px, with a soft edge
    gl.uniform3f(r.line.u.uView, fitW, fitH, wid); gl.uniform1f(r.line.u.uWid, wid); gl.uniform4f(r.line.u.uCol, cr, cg, cb, a);
    gl.drawArrays(gl.TRIANGLES, lines[name][0], lines[name][1]);
  }

  function draw(p, t, W, H, dpr, phone) {
    const r = R;
    if (!r) { if (!gl.isContextLost()) { gl.clearColor(16 / 255, 20 / 255, 26 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT); } return; }
    if (W < 2 || H < 2) return;
    if (W !== fitW || H !== fitH) fit(W, H, phone);
    // the stations: 1 until p 0.32 (the snow falls for the first third), 2 in the middle, 3 from about 0.88
    const f12 = ease(clamp((p - 0.32) / 0.20)), f23 = ease(clamp((p - 0.66) / 0.22));
    w[0] = 1 - f12; w[1] = f12 * (1 - f23); w[2] = f23;
    const w1 = w[0], w2 = w[1], w3 = w[2], in3 = ease(w3);
    // the camera drifts by about a degree, so the depth is felt, and moves forward with the scroll
    camera(AZ + 0.02 * Math.sin(t * 0.11), elNow + 0.005 * Math.sin(t * 0.083 + 1.3), DIST - PUSH * ease(p));
    mul(VP, proj, view);
    const px = 1 / (K * dpr);
    lineK = phone ? 0.55 : 1;   // the model is small on a phone, its hairlines finer
    const eV = wsum(EMIT[0], w), eH = wsum(EMIT[1], w), eT = wsum(EMIT[2], w), eC = wsum(EMIT[3], w);

    // the cabin: its place on the rope, a slight sway
    const sc = phone ? 1.45 : 1.25, sway = 0.024 * Math.sin(t * 0.9) + 0.01 * Math.sin(t * 1.7 + 1.0);
    cableAt(U0 + (U1 - U0) * cabinT(p), cab, CAB_DZ);
    const cs = Math.cos(sway) * sc, sn = Math.sin(sway) * sc;
    cabM[0] = cs; cabM[1] = sn; cabM[4] = -sn; cabM[5] = cs; cabM[10] = sc; cabM[12] = cab[0]; cabM[13] = cab[1]; cabM[14] = cab[2];
    if (w2 > 0.004) cabinShadow(p);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(16 / 255, 20 / 255, 26 / 255, 1); gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.BLEND);

    // the model: first the table's shadow (no depth), then everything solid, then the cabin
    let pr = r.mesh;
    gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uVP, false, VP); gl.uniformMatrix4fv(pr.u.uM, false, IDENT);
    gl.uniformMatrix4fv(pr.u.uL2, false, light2); gl.uniformMatrix4fv(pr.u.uL3, false, light3);
    gl.uniform3f(pr.u.uW, w1, w2, w3);
    gl.uniform3fv(pr.u.uSky, mix3(SKY, w)); gl.uniform3fv(pr.u.uKey, mix3(KEYL, w)); gl.uniform3f(pr.u.uWarm, WARM[0], WARM[1], WARM[2]);
    gl.uniform3f(pr.u.uSun2, 0.86 * w2, 0.67 * w2, 0.43 * w2); gl.uniform3f(pr.u.uSun2Dir, SUN2_DIR[0], SUN2_DIR[1], SUN2_DIR[2]);
    gl.uniform3f(pr.u.uSun3, 2.0 * in3, 1.02 * in3, 0.42 * in3); gl.uniform3f(pr.u.uSun3Dir, SUN3_DIR[0], SUN3_DIR[1], SUN3_DIR[2]);
    gl.uniform3f(pr.u.uInk, INK[0], INK[1], INK[2]);
    {   // the table's lift: centre and reach in device px (see the shader)
      const cyp = (LCY * 0.5 + 0.5) * H * dpr, ry = 0.88 * Math.min(cyp, H * dpr - cyp), rx = Math.max(LBW * dpr, 2 * ry);
      gl.uniform4f(pr.u.uLift, (LCX * 0.5 + 0.5) * W * dpr, cyp, 1 / rx, 1 / ry);
    }
    gl.uniform3f(pr.u.uCab, cab[0], cab[1] - 0.5 * sc, cab[2]);
    gl.uniform4f(pr.u.uEmit, eV, eH, eT, eC); gl.uniform4f(pr.u.uCabSh, cabSh[0], cabSh[1], cabSh[2], cabSh[3]);
    gl.uniform1f(pr.u.uPx, px); gl.uniform1f(pr.u.uShTex, 1 / SH); gl.uniform1f(pr.u.uMark, 0.05 * w1 + 1.0 * w2 + 0.3 * w3);
    gl.uniform3fv(pr.u.uTree, treeData);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, r.sh3); gl.uniform1i(pr.u.uShadow3, 1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, r.sh2); gl.uniform1i(pr.u.uShadow2, 0);
    bind(pr, r.bMesh, 11, L_MESH);
    gl.disable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLES, nAll - 6, 6);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.drawArrays(gl.TRIANGLES, 0, nAll - 6);
    gl.uniformMatrix4fv(pr.u.uM, false, cabM);
    bind(pr, r.bCabin, 11, L_MESH); gl.drawArrays(gl.TRIANGLES, 0, nCabin);
    unbind(pr, L_MESH);

    // from here on: light and air, laid over the model (colour already multiplied by its alpha)
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);

    // the evening sun rises into the saddle, behind the crest
    pr = r.disc; gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uVP, false, VP); gl.uniform3f(pr.u.uR, right[0], right[1], right[2]); gl.uniform3f(pr.u.uU, upv[0], upv[1], upv[2]);
    bind(pr, r.bDisc, 2, L_DISC);
    if (w3 > 0.004) {
      sunAt[0] = SUN_POS[0]; sunAt[1] = SUN_POS[1] - (1 - in3) * 2.0; sunAt[2] = SUN_POS[2];
      disc(r, sunAt, 8.0, 0.925 * 0.24 * w3, 0.729 * 0.24 * w3, 0.408 * 0.24 * w3, 0, 0);
      disc(r, sunAt, 2.9, 0.925 * 0.34 * w3, 0.80 * 0.34 * w3, 0.55 * 0.34 * w3, 0, 0);
      disc(r, sunAt, 0.86, 0.975 * w3, 0.83 * w3, 0.56 * w3, 1, w3);
    }
    unbind(pr, L_DISC);

    // the hairlines: the crest in gold (it lights up when the sun stands behind it), tracks in the snow,
    // the path in summer, the two ropes
    pr = r.line; gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uVP, false, VP);
    bind(pr, r.bLine, 8, L_LINE);
    line(r, 'crest', 0.5, 0.925, 0.80 + 0.04 * w3, 0.55, 0.34 * w1 + 0.2 * w2 + 0.85 * w3);
    line(r, 'tracks', 0.35, 0.80, 0.87, 0.96, 0.5 * w1);
    line(r, 'path', 0.5, 0.925, 0.82, 0.60, 0.6 * w2 + 0.2 * w3);
    line(r, 'rope2', 0.4, 0.86, 0.82, 0.74, 0.34);
    line(r, 'rope', 0.55, 0.925, 0.86, 0.70, 0.8);
    unbind(pr, L_LINE);

    if (w1 > 0.004) {
      pr = r.snow; gl.useProgram(pr.p);
      gl.uniformMatrix4fv(pr.u.uVP, false, VP); gl.uniform3f(pr.u.uR, right[0], right[1], right[2]); gl.uniform3f(pr.u.uU, upv[0], upv[1], upv[2]);
      gl.uniform3f(pr.u.uTP, t, (phone ? 0.7 : 1) / K, eV); gl.uniform1f(pr.u.uA, 0.55 * w1);
      bind(pr, r.bSnow, 7, L_PART); gl.drawArrays(gl.TRIANGLES, 0, N_SNOW * 6); unbind(pr, L_PART);
    }

    // a breath of glow in the air in front of what is lit, and the sun's glare over the crest
    gl.disable(gl.DEPTH_TEST);
    pr = r.disc; gl.useProgram(pr.p); bind(pr, r.bDisc, 2, L_DISC);
    v3[0] = -4.9; v3[1] = 0.6; v3[2] = 2.9;
    disc(r, v3, 3.4, 0.925 * 0.075 * eV, 0.729 * 0.075 * eV, 0.408 * 0.075 * eV, 0, 0);
    v3[0] = 3.7; v3[1] = YT + 0.5; v3[2] = -2.1;
    disc(r, v3, 3.6, 0.925 * 0.06 * eH, 0.729 * 0.06 * eH, 0.408 * 0.06 * eH, 0, 0);
    v3[0] = cab[0]; v3[1] = cab[1] - 0.5 * sc; v3[2] = cab[2];
    disc(r, v3, 1.2 * sc, 0.925 * 0.13 * eC, 0.729 * 0.13 * eC, 0.408 * 0.13 * eC, 0, 0);
    if (w3 > 0.004) disc(r, sunAt, 4.0, 0.925 * 0.11 * w3, 0.729 * 0.11 * w3, 0.408 * 0.11 * w3, 0, 0);
    unbind(pr, L_DISC);
    gl.depthMask(true);
  }

  // ---- markup: tall section > pinned stage > canvas + the list + CTA ----
  // the CTA at the top: data-cta on the list says where it leads on this page, data-cta-label
  // what it says (Bergbahnen: the enquiry, D-67); by default the calculator
  const ride = document.createElement('div');
  ride.className = 'ride';
  ride.innerHTML = '<div class="ride__stage"><a class="btn btn--gold ride__cta"></a></div>';
  const cta = ride.querySelector('.ride__cta');
  cta.href = chain.dataset.cta || '#rechner';
  cta.textContent = chain.dataset.ctaLabel || 'Potenzial berechnen';
  chain.before(ride);
  const stage = ride.firstElementChild;
  stage.insertBefore(canvas, cta);
  // the copy and, under it, one line that fills with the scroll: it says "read on while you scroll"
  const copy = document.createElement('div');
  copy.className = 'ride__copy';
  copy.innerHTML = '<div class="ride__progress" aria-hidden="true"><i><b></b></i><i><b></b></i><i><b></b></i></div>';   // three dots, one per station; the current one is a pill that fills (2026-11-20: the thin line looked like the lines in the drawings)
  stage.insertBefore(copy, cta);
  copy.prepend(chain);
  const dots = [...copy.querySelectorAll('.ride__progress i')], EDGE = [0, 0.41, 0.79, 1];   // where one station's copy hands over to the next
  chain.classList.add('chain--ride');
  items[0].classList.add('is-active');

  let W = 0, H = 0, dpr = 1;
  // at most ~3.4 million canvas pixels: a retina phone or laptop draws a little under 2x
  const BUDGET = 3.4e6;
  function size() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(BUDGET / Math.max(1, W * H)));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  // ---- loop: only while the section is on screen. The picture is drawn every frame (snow, sway),
  // the copy is touched only when the scroll progress has changed
  const STATIONS = [0, 0.47, 0.85];   // ride progress at each link's station
  let running = false, last = -1;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (canvas.clientWidth !== W || canvas.clientHeight !== H) size();
    const r = ride.getBoundingClientRect();
    // the pin range: the stage's height, not innerHeight, which jumps as a phone's toolbar hides
    // the stage pins at its sticky top (the band sits in the middle of the screen)
    const p = clamp(((parseFloat(getComputedStyle(stage).top) || 0) - r.top) / (r.height - stage.offsetHeight));
    draw(p, now / 1000, W, H, dpr, W < 768);
    if (Math.abs(p - last) > 0.0004) {
      last = p;
      // each link fades with the scroll, like the captions over the frames: the current
      // one fades out, a short pause, then the next one fades in and rises (12 % each)
      const k = (a, b) => clamp((p - a) / (b - a));
      const show = [1 - k(0.30, 0.40), k(0.42, 0.52) * (1 - k(0.68, 0.78)), k(0.80, 0.90)];   // station 1 stays for the first third (Nicky, 2026-11-19: "gone too fast")
      items.forEach((li, i) => {
        const o = show[i], y = p < STATIONS[i] ? (1 - o) * 1.2 : -(1 - o) * 0.6;
        li.style.opacity = o.toFixed(3);
        li.style.transform = o < 1 ? `translateY(${y.toFixed(2)}rem)` : '';
        li.style.visibility = o > 0.005 ? 'visible' : 'hidden';
        li.classList.toggle('is-active', o >= 0.5);
      });
      ride.classList.toggle('ride--top', p > 0.9);
      dots.forEach((d, i) => {
        const f = k(EDGE[i], EDGE[i + 1]);
        d.classList.toggle('is-on', p >= EDGE[i] && (p < EDGE[i + 1] || i === 2));
        d.firstChild.style.transform = `translateX(${(-100 * (1 - Math.max(f, f > 0 || i === 0 ? 0.12 : 0))).toFixed(2)}%)`;
      });
    }
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
    else if (!e.isIntersecting) running = false;
  }).observe(ride);
})();
