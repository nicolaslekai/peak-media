/* ============ BLAUE STUNDE — thermal-bath scene: one model, three things it says ============
   On Wellness & Thermen (D-80): the three links of <ol class="chain"> become the stations of a
   scene on a <canvas>. Since 2026-11-19 the scene is style 3 of the style lab, "Raum" (Nicky
   chose it for all scenes): the bath as an architect's presentation model, raw WebGL, no
   library. One block of dark stone with the mountains folded out of its back, the bath house
   on a timber platform, the basin cut into the deck, seen from a raised three-quarter view
   through a long lens. The picture stands still; each station adds what its line says:
     01 Entdecken        the blue hour: the stars come out as you scroll, quiet water, a few wisps of steam
     02 Bei jedem Wetter clouds in the flanks, rain, wet stone, warmer windows, more steam
     03 Ruhige Monate    the low sun in the saddle, long shadows towards us, its path on the
                         water, the basin's lamps on
   Water, steam, rain and the lamps move with time, and the camera drifts by about a degree;
   the scroll blends the stations and pushes the camera in by a few percent, never up or
   sideways (Nicky, 2026-11-09).

   How it is made
   - one static mesh, built here in code (boxes, cones, a folded ridge), shaded per face:
     light from the sky, the lamps of the hall falling out through the glazed front, and for
     station 3 a low sun from behind with one shadow map (rendered once)
   - the water is one quad with its own shader: it traces the mirrored ray against the front
     of the house, so the lit hall stands in the basin and wavers with the ripples
   Reuses the Bergfahrt's markup and CSS (.ride, .chain--ride). Without JS, with reduced
   motion, without WebGL or with a shader that does not compile the list stays as it is: the
   ride is only built once the model is ready. Own file: an error here cannot stop the scroll
   engine.
   ================================================================================================ */
(() => {
  const chain = document.querySelector('.chain');
  if (!chain || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [...chain.children];
  if (items.length !== 3) return;

  // the canvas and its context first: no WebGL, no ride (the page is not touched)
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let gl = null;
  try { gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: true, stencil: false }); } catch (err) { gl = null; }
  if (!gl) return;

  let Wd = 0, Hd = 0, dpr = 1;   // the stage in CSS px, device pixels per CSS px
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const ease = u => u * u * (3 - 2 * u);
  let seed = 31;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // fixed, so every visit looks the same
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lin = (r, g, b) => [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];   // site colours into linear light

  // ---- the model, in metres or so: x along the front, y up, z towards us; the house's axis is x = 0,
  // the hall's glass front is z = 0. Everything sits on a 0.9 grid (the paving).
  const PX = 7.2, ZB = -9.8, ZF = 6.4, BASE = -0.7;                     // the block
  const POOL = { x: 3.6, z0: 1.9, z1: 5.5, level: -0.15 };
  const HALL = 2.6, BAYS = 7, BAY = 2 * HALL / BAYS, HALL_H = 1.9, WING = 5.5, WING_H = 1.3, DECK = 0.1, EAVE = 0.62;
  const LAMP_Y = 1.0, LAMP_Z = -0.6;                                    // pendant lamps, hung low so they show under the eave
  const AZ = 18 * Math.PI / 180, EL = 27 * Math.PI / 180, EL_PHONE = 33 * Math.PI / 180, DIST = 60;   // the view: from the right, raised, far away
  const TARGET = [0, 1.2, -1.6];
  const RIDGE_Z = -7.2, MX = RIDGE_Z * Math.tan(AZ) + 0.5;              // the ridge is shifted so that, seen from there, the saddle stands over the hall
  // the ridge line, left to right as seen: the big summit, the saddle, the smaller summit (the logo)
  const CREST = [[-5.36, 2.2], [-4.5, 3.3], [-3.6, 4.6], [-2.7, 5.4], [-1.9, 4.5], [-0.9, 3.2], [0.2, 2.5], [1.2, 2.85], [2.2, 3.7],
    [3.0, 4.3], [3.9, 3.55], [5.0, 2.8], [6.2, 2.2], [7.5, 1.7], [9.04, 1.2]];
  const SADDLE = [0.2 + MX, 2.5, RIDGE_Z];
  const TREES = [[-6.5, -1.9, 2.5], [-6.0, -3.05, 3.2], [-6.75, -0.5, 1.9], [6.35, -2.8, 2.9], [6.75, -1.4, 2.1], [-6.4, 5.4, 2.2]];

  // materials: albedo in linear light
  const C = {
    stone: [0.13, 0.145, 0.165], side: [0.075, 0.085, 0.10], roof: [0.23, 0.245, 0.27], dark: [0.03, 0.03, 0.035],
    timber: [0.24, 0.15, 0.085], boards: [0.30, 0.20, 0.11], bed: [0.24, 0.18, 0.115], tree: [0.045, 0.08, 0.07],
    room: [0.50, 0.40, 0.27], wall: [0.46, 0.30, 0.16], glass: [0.84, 0.50, 0.14], lamp: [1.0, 0.78, 0.46],
    basin: [0.17, 0.35, 0.42], bath: [0.065, 0.19, 0.245],
  };
  // material ids, read by the shader
  const M = { plain: 0, timber: 1, stone: 2, room: 3, light: 4, rock: 5, table: 6, side: 7, boards: 8, pool: 9, bath: 10 };

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

  let nCast = 0, nAll = 0;
  const fitPts = [], crestLine = [];
  function build() {
    V = []; seed = 31;
    const H0 = DECK, HH = HALL_H;
    // --- what throws a shadow: the house, the trees, the day beds
    box(-5.9, 0, -3.3, 5.9, H0, 1.1, C.timber, M.plain, { top: C.boards, mTop: M.boards, b: 0.7, t: 0.9 });       // the timber platform
    box(-1.5, 0, 1.1, 1.5, H0 / 2, 1.42, C.timber, M.plain, { top: C.boards, mTop: M.boards, b: 0.7 });           // one step down to the basin
    box(-HALL, H0, -3.0, HALL, HH, -2.9, C.side, M.plain, { b: 0.9, t: 0.6 });                                      // the hall: back wall
    for (const d of [-1, 1]) box(d * (HALL - 0.1), H0, -2.9, d * HALL, HH, 0, C.side, M.plain, { b: 0.9, t: 0.6 }); // its cheeks
    for (let i = 0; i <= BAYS; i++) {                                                                               // posts on a regular grid
      const x = -HALL + BAY * i, w = i === 0 || i === BAYS ? 0.05 : 0.026;
      box(x - w, H0, -0.07, x + w, HH, 0, C.dark, M.plain);
    }
    box(-HALL, HH - 0.1, -0.08, HALL, HH, 0, C.dark, M.plain);
    box(-HALL, H0, -0.07, HALL, H0 + 0.035, 0, C.dark, M.plain);
    box(-HALL - 0.45, HH, -3.4, HALL + 0.45, HH + 0.12, EAVE, C.roof, M.plain, { b: 0.5, t: 0.62 });               // thin roof slab, deep eave in front
    for (let i = 0; i < BAYS; i++) { const x = -HALL + BAY * (i + 0.5); box(x - 0.006, LAMP_Y + 0.04, LAMP_Z - 0.006, x + 0.006, HH, LAMP_Z + 0.006, C.dark, M.plain); }
    for (const d of [-1, 1]) {
      // a wing: timber boards, a ribbon window set back into them, a roof slab that overhangs outwards
      box(d * HALL, H0, -2.7, d * WING, WING_H, -0.42, C.timber, M.timber, { b: 0.85, t: 0.55 });
      box(d * HALL, H0, -0.42, d * WING, 0.55, -0.3, C.timber, M.timber, { b: 0.9, t: 0.8 });
      box(d * HALL, 0.92, -0.42, d * WING, WING_H, -0.3, C.timber, M.timber, { b: 0.8, t: 0.5 });
      box(d * HALL, 0.55, -0.42, d * 3.0, 0.92, -0.3, C.timber, M.timber, { b: 0.8, t: 0.8 });
      box(d * 5.1, 0.55, -0.42, d * WING, 0.92, -0.3, C.timber, M.timber, { b: 0.8, t: 0.8 });
      for (let i = 1; i < 5; i++) { const x = d * (3.0 + 2.1 * i / 5); box(x - 0.016, 0.55, -0.41, x + 0.016, 0.92, -0.37, C.dark, M.plain); }
      box(d * (HALL - 0.2), WING_H, -3.05, d * (WING + 0.55), WING_H + 0.1, 0.25, C.roof, M.plain, { b: 0.5, t: 0.62 });
      // day beds beside the basin, feet to the water
      for (const z of [2.75, 3.95]) {
        box(d * 4.55, 0, z, d * 6.15, 0.12, z + 0.62, C.bed, M.plain, { b: 0.55 });
        box(d * 5.72, 0.12, z, d * 6.15, 0.2, z + 0.62, C.bed, M.plain);
      }
    }
    for (const [x, z, h] of TREES) fir(x, z, h);
    nCast = V.length / 11;

    // --- the block: stone on top (with the basin cut out), cut faces around
    const top = (x0, z0, x1, z1) => quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], C.stone, M.stone);
    top(-PX, ZB, -POOL.x, ZF); top(POOL.x, ZB, PX, ZF); top(-POOL.x, ZB, POOL.x, POOL.z0); top(-POOL.x, POOL.z1, POOL.x, ZF);
    const g = [1, 1, 0.35, 0.35];
    quad([-PX, 0, ZF], [-PX, BASE, ZF], [PX, BASE, ZF], [PX, 0, ZF], C.side, M.side, g);
    quad([PX, 0, ZF], [PX, BASE, ZF], [PX, BASE, ZB], [PX, 0, ZB], C.side, M.side, g);
    quad([-PX, 0, ZB], [-PX, BASE, ZB], [-PX, BASE, ZF], [-PX, 0, ZF], C.side, M.side, g);
    quad([PX, 0, ZB], [PX, BASE, ZB], [-PX, BASE, ZB], [-PX, 0, ZB], C.side, M.side, g);
    // the basin's walls (only a finger of them shows above the water)
    const pw = [1.3, 1.3, 0.45, 0.45], d0 = -0.4;   // lit from the water below, dark under the coping
    quad([-POOL.x, d0, POOL.z0], [POOL.x, d0, POOL.z0], [POOL.x, 0, POOL.z0], [-POOL.x, 0, POOL.z0], C.basin, M.pool, pw);
    quad([-POOL.x, d0, POOL.z1], [-POOL.x, d0, POOL.z0], [-POOL.x, 0, POOL.z0], [-POOL.x, 0, POOL.z1], C.basin, M.pool, pw);
    quad([POOL.x, d0, POOL.z0], [POOL.x, d0, POOL.z1], [POOL.x, 0, POOL.z1], [POOL.x, 0, POOL.z0], C.basin, M.pool, pw);
    quad([POOL.x, d0, POOL.z1], [-POOL.x, d0, POOL.z1], [-POOL.x, 0, POOL.z1], [POOL.x, 0, POOL.z1], C.basin, M.pool, pw);

    // --- the mountains: one folded ridge, four rows from the foot to the crest, ribs and gullies in turn
    const n = CREST.length, cols = [];
    fitPts.length = 0; crestLine.length = 0;
    for (let i = 0; i < n; i++) {
      const end = i === 0 || i === n - 1, x = i === 0 ? -PX : i === n - 1 ? PX : CREST[i][0] + MX, h = CREST[i][1];
      const rib = i % 2 === 0, j = end ? 0 : 1;
      const zc = RIDGE_Z + (rib ? 0.26 : -0.2) + (rnd() - 0.5) * 0.3, zf = -3.95 + (rib ? 0.2 : -0.16);
      const at = (f, hf, jx) => [x + j * (rnd() - 0.5) * jx, h * hf, zf + (zc - zf) * f];
      cols.push([at(0, 0, 0.3), at(rib ? 0.36 : 0.47, rib ? 0.33 : 0.25, 0.5), at(rib ? 0.7 : 0.8, rib ? 0.7 : 0.6, 0.4), [x, h, zc], [x, h * 0.5, ZB]]);
      fitPts.push([x, h, zc]); crestLine.push(x, h + 0.012, zc + 0.012);
    }
    const rock = p => { const u = Math.min(1, p[1] / 5.4), v = u * u; return [0.05 + 0.07 * u + 0.07 * v, 0.062 + 0.08 * u + 0.075 * v, 0.085 + 0.09 * u + 0.08 * v]; };
    for (let i = 0; i < n - 1; i++) for (let r = 0; r < 4; r++) {
      const a = cols[i][r], b = cols[i + 1][r], c = cols[i + 1][r + 1], d = cols[i][r + 1], out = [0, 1, r < 3 ? 0.4 : -0.4];
      if ((i + r) % 2 === 0) { tri(a, b, c, rock(a), rock(b), rock(c), M.rock, out); tri(a, c, d, rock(a), rock(c), rock(d), M.rock, out); }
      else { tri(a, b, d, rock(a), rock(b), rock(d), M.rock, out); tri(b, c, d, rock(b), rock(c), rock(d), M.rock, out); }
    }
    // where the block is cut, the ridge shows in section
    for (const [col, sx] of [[cols[0], -1], [cols[n - 1], 1]]) for (let r = 0; r < 4; r++) {
      const a = col[r], b = col[r + 1], a0 = [a[0], 0, a[2]], b0 = [b[0], 0, b[2]];
      tri(a, b, b0, C.side, C.side, C.side, M.side, [sx, 0, 0]); tri(a, b0, a0, C.side, C.side, C.side, M.side, [sx, 0, 0]);
    }

    // --- inside the hall: floor, back wall, cheeks, a bath, the lamps; the windows of the wings
    quad([-HALL + 0.1, H0 + 0.002, 0], [HALL - 0.1, H0 + 0.002, 0], [HALL - 0.1, H0 + 0.002, -2.9], [-HALL + 0.1, H0 + 0.002, -2.9], C.room, M.room);
    const ra = [0.8, 0.8, 1, 1];
    quad([-HALL + 0.1, H0, -2.899], [HALL - 0.1, H0, -2.899], [HALL - 0.1, HH, -2.899], [-HALL + 0.1, HH, -2.899], C.wall, M.room, ra);
    quad([-HALL + 0.101, H0, 0], [-HALL + 0.101, H0, -2.9], [-HALL + 0.101, HH, -2.9], [-HALL + 0.101, HH, 0], C.wall, M.room, ra);
    quad([HALL - 0.101, H0, -2.9], [HALL - 0.101, H0, 0], [HALL - 0.101, HH, 0], [HALL - 0.101, HH, -2.9], C.wall, M.room, ra);
    quad([-1.5, H0 + 0.004, -0.95], [1.5, H0 + 0.004, -0.95], [1.5, H0 + 0.004, -2.25], [-1.5, H0 + 0.004, -2.25], C.bath, M.bath);
    for (let i = 0; i < BAYS; i++) { const x = -HALL + BAY * (i + 0.5); box(x - 0.045, LAMP_Y - 0.045, LAMP_Z - 0.045, x + 0.045, LAMP_Y + 0.045, LAMP_Z + 0.045, C.lamp, M.light, { b: 3.2, t: 3.2 }); }
    for (const d of [-1, 1]) {
      const xa = Math.min(d * 3.0, d * 5.1), xb = Math.max(d * 3.0, d * 5.1);
      quad([xa, 0.55, -0.419], [xb, 0.55, -0.419], [xb, 0.92, -0.419], [xa, 0.92, -0.419], C.glass, M.light, [0.95, 0.95, 0.6, 0.6]);
      // the hall rises above the wings; that strip is glass too
      const x = d * (HALL + 0.001), s = [0.5, 0.5, 0.32, 0.32];
      if (d > 0) quad([x, WING_H + 0.16, -0.15], [x, WING_H + 0.16, -2.75], [x, HH - 0.07, -2.75], [x, HH - 0.07, -0.15], C.glass, M.light, s);
      else quad([x, WING_H + 0.16, -2.75], [x, WING_H + 0.16, -0.15], [x, HH - 0.07, -0.15], [x, HH - 0.07, -2.75], C.glass, M.light, s);
    }
    // the table under the block (drawn first, only its shadow shows)
    quad([-90, BASE, 90], [90, BASE, 90], [90, BASE, -90], [-90, BASE, -90], C.side, M.table);
    nAll = V.length / 11;
    for (const x of [-PX, PX]) for (const z of [ZB, ZF]) { fitPts.push([x, 0, z]); fitPts.push([x, BASE, z]); }
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
  // what the lit front of the house looks like along a ray: the hall's glass with its posts and lamps,
  // the wings' windows, and the dark mass around them (for mirror images in water and wet stone)
  const FACADE = `
const float HALLX = ${HALL.toFixed(3)};
const float BAY = ${BAY.toFixed(5)};
const vec2 POOLC = vec2(0.0, ${((POOL.z0 + POOL.z1) / 2).toFixed(3)});
const vec2 POOLH = vec2(${POOL.x.toFixed(3)}, ${((POOL.z1 - POOL.z0) / 2).toFixed(3)});
uniform vec3 uWarm;
uniform float uGl;
vec3 facade(vec3 P, vec3 R, float blur, out float mass) {
  mass = 0.0;
  if (R.z > -0.02) return vec3(0.0);
  float t = -P.z / R.z; vec3 h = P + R * t;
  float bx = 0.02 + blur * t * 0.35, by = 0.02 + blur * t, ax = abs(h.x);
  float inx = 1.0 - smoothstep(HALLX - bx, HALLX + bx, ax);
  float iny = smoothstep(0.1 - by, 0.1 + by, h.y) * (1.0 - smoothstep(1.8 - by, 1.8 + by, h.y));
  float cell = fract(h.x / BAY + 0.5), e = min(cell, 1.0 - cell) * BAY;
  float post = smoothstep(0.015, 0.05 + bx, e);
  float dx = (cell - 0.5) * BAY, dy = h.y - ${(LAMP_Y + LAMP_Z * 0.53).toFixed(2)};   // the lamps hang behind the glass
  float lamp = exp(-(dx * dx + dy * dy) / (0.004 + bx * bx * 0.4));
  vec3 c = (uWarm * (0.40 + 0.42 * smoothstep(1.8, 0.1, h.y)) * mix(0.3, 1.0, post) + vec3(1.0, 0.82, 0.52) * lamp * 1.0) * inx * iny;
  float t2 = (-0.42 - P.z) / R.z; vec3 h2 = P + R * t2; float a2 = abs(h2.x);
  float win = smoothstep(3.0 - bx, 3.0 + bx, a2) * (1.0 - smoothstep(5.1 - bx, 5.1 + bx, a2))
    * smoothstep(0.55 - by, 0.55 + by, h2.y) * (1.0 - smoothstep(0.92 - by, 0.92 + by, h2.y));
  c += uWarm * 0.5 * win;
  float mh = (1.0 - smoothstep(3.05 - bx, 3.05 + bx, ax)) * (1.0 - smoothstep(2.02 - by, 2.02 + by, h.y));
  float mw = (1.0 - smoothstep(6.05 - bx, 6.05 + bx, a2)) * (1.0 - smoothstep(1.4 - by, 1.4 + by, h2.y));
  mass = max(mh, mw);
  return c * uGl;
}`;

  const VS_MESH = `
attribute vec3 aP, aN, aC;
attribute vec2 aM;
uniform mat4 uVP, uLight;
varying vec3 vP, vN, vC, vSh;
varying vec2 vM;
void main() {
  vP = aP; vN = aN; vC = aC; vM = aM;
  vSh = (uLight * vec4(aP, 1.0)).xyz * 0.5 + 0.5;
  gl_Position = uVP * vec4(aP, 1.0);
}`;
  const FS_MESH = HEAD + `
varying vec3 vP, vN, vC, vSh;
varying vec2 vM;
uniform vec3 uEye, uW, uSky, uKey, uSun, uSunDir, uInk;
uniform vec4 uLift;
uniform float uWet, uPx, uLights, uPool, uShTex;
uniform sampler2D uShadow;
uniform vec3 uTree[6];
` + FINISH + FACADE + `
const vec3 KEY = vec3(-0.720, 0.500, 0.481);   // a cool key from the upper left, so every face has its own value
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
float shadow() {
  vec3 s = vSh;
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) return 1.0;
  float sum = 0.0;
  for (int i = -1; i <= 2; i++) for (int j = -1; j <= 2; j++) {
    vec2 o = (vec2(float(i), float(j)) - 0.5) * uShTex * 1.7;
    sum += step(s.z + 0.0005, unpack(texture2D(uShadow, s.xy + o)));
  }
  return sum / 16.0;
}
// the hall's lamps: inside they light the room, outside only what they see through the glass front
float lamps(vec3 P, vec3 N, float inside) {
  float e = 0.0;
  for (int i = 0; i < 7; i++) {
    vec3 S = vec3((float(i) - 3.0) * BAY, ${LAMP_Y.toFixed(2)}, ${LAMP_Z.toFixed(2)}), d = S - P;
    float r2 = dot(d, d), nl = dot(N, d) * inversesqrt(r2);
    if (inside > 0.5) { e += (0.15 + 0.85 * max(nl, 0.0)) / (r2 + 0.3); continue; }
    float u = P.z / (P.z - S.z), xc = P.x + d.x * u, yc = P.y + d.y * u, pen = 0.05 + 0.11 * P.z;
    float open = (1.0 - smoothstep(HALLX - pen, HALLX + pen, abs(xc))) * (1.0 - smoothstep(1.8 - pen, 1.8 + pen, yc));
    e += max(nl, 0.0) / (r2 + 1.2) * open;
  }
  return e;
}
float windows(vec3 P, vec3 N) {   // the wings' ribbon windows, two points each
  float e = 0.0;
  for (int i = 0; i < 4; i++) {
    float k = float(i);
    vec3 S = vec3((k < 2.0 ? -1.0 : 1.0) * (3.5 + 1.1 * mod(k, 2.0)), 0.74, -0.42), d = S - P;
    float r2 = dot(d, d), il = inversesqrt(r2);
    e += max(dot(N, d) * il, 0.0) * max(-d.z * il, 0.0) / (r2 + 0.5);
  }
  return e;
}
void main() {
  vec3 N = normalize(vN), V = normalize(uEye - vP), alb = vC, col;
  float m = vM.x, ao = vM.y;
  if (m > 3.5 && m < 4.5) col = alb * ao * uGl;                                   // windows and lamps
  else if (m > 8.5 && m < 9.5) col = alb * ao * (0.45 * uPool + 0.55 * uLights); // the basin's walls
  else if (m > 9.5) col = alb * (0.55 + 0.25 * uGl) * (0.5 + 0.5 * boxS(vP.xz, vec2(-1.5, -2.25), vec2(1.5, -0.95), 0.2));
  else if (m > 5.5 && m < 6.5) {                                                  // the table: only a soft shadow under the block
    vec2 p = vP.xz, lo = vec2(-${PX.toFixed(2)}, ${ZB.toFixed(2)}), hi = vec2(${PX.toFixed(2)}, ${ZF.toFixed(2)});
    // the lift around the model is measured on the screen and is gone before the band's edges, so the
    // canvas never shows as a lighter box (Nicky, 2026-11-19, on a phone)
    vec2 q = (gl_FragCoord.xy - uLift.xy) * uLift.zw;
    float lift = 1.0 - smoothstep(0.3, 1.0, length(q));
    col = uInk * (1.0 + 1.5 * lift) * (1.0 - 0.5 * boxS(p, lo - 0.6, hi + 0.6, 2.6)) * (1.0 - 0.62 * boxS(p, lo - 0.35, hi + 0.35, 0.55));
  } else {
    vec3 extra = vec3(0.0);
    float up = N.y, inside = 0.0;
    if (m < 0.5 && up > 0.5 && vP.y > 1.35) {   // the roof slabs: their arrises catch the light, the wings' lie in the hall's shade
      float ax = abs(vP.x), e;
      if (vP.y > 1.8) e = min(min(3.05 - ax, vP.z + 3.4), ${EAVE.toFixed(2)} - vP.z);
      else { e = min(min(6.05 - ax, vP.z + 3.05), 0.25 - vP.z); ao *= 0.62 + 0.38 * smoothstep(3.05, 3.9, ax); }
      alb *= 1.0 + 0.4 * (1.0 - smoothstep(0.0, 0.04 + uPx, e));
    } else if (m > 0.5 && m < 1.5) {       // timber: upright boards
      float s = abs(N.z) > 0.5 ? vP.x : vP.z;
      alb *= 1.0 - 0.5 * joint(s, 0.13, 0.02, 1.0) * step(abs(up), 0.5);
    } else if (m > 1.5 && m < 2.5) {       // stone: paving on the grid, a coping round the basin, wet it mirrors the house
      float j = max(joint(vP.x, 0.9, 0.02, 1.0), joint(vP.z - 1.9, 0.9, 0.02, 2.2));
      vec2 q = abs(vP.xz - POOLC) - POOLH; float d = max(q.x, q.y);
      float cop = 1.0 - smoothstep(0.29, 0.31, d);
      j = max(j * (1.0 - cop), joint(d - 0.3, 100.0, 0.02, 1.6));
      alb *= (1.0 + 0.25 * cop) * (1.0 - 0.5 * j) * (1.0 - 0.3 * uWet);
      ao *= 1.0 - 0.55 * boxS(vP.xz, vec2(-5.9, -3.3), vec2(5.9, 1.1), 0.4);
      for (int i = 0; i < 6; i++) { vec2 dd = vP.xz - uTree[i].xy; ao *= 1.0 - 0.6 * exp(-dot(dd, dd) / uTree[i].z); }
      for (int i = 0; i < 4; i++) {
        float k = float(i); vec2 c = vec2((k < 2.0 ? -1.0 : 1.0) * 5.35, 3.06 + 1.2 * mod(k, 2.0));
        ao *= 1.0 - 0.5 * boxS(vP.xz, c - vec2(0.8, 0.31), c + vec2(0.8, 0.31), 0.22);
      }
      float mass; vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0));
      extra = facade(vP, R, 0.14, mass) * (0.42 + 0.58 * pow(1.0 - max(V.y, 0.0), 3.0)) * uWet;
    } else if (m > 2.5 && m < 3.5) inside = 1.0;
    else if (m > 7.5 && m < 8.5) {         // the platform's boards run out from the house
      alb *= 1.0 - 0.4 * joint(vP.x, 0.2, 0.02, 1.0);
      ao *= 0.6 + 0.4 * smoothstep(-0.45, 0.5, vP.z);
    } else if (m > 6.5 && m < 7.5) alb *= 1.0 + 1.2 * smoothstep(-0.05, -0.012, vP.y) * step(vP.y, 0.001);   // the block's top edge catches the light
    float rock = m > 4.5 && m < 5.5 ? 1.0 : 0.0;   // the folded ridge takes more of the key light: each facet its own value
    vec3 light = (uSky * mix(0.16, 1.0, 0.5 + 0.5 * up) * (1.0 - 0.45 * rock) + uKey * max(dot(N, KEY), 0.0) * (1.0 + 1.8 * rock)) * ao;
    if (uW.z > 0.004) light += uSun * max(dot(N, uSunDir), 0.0) * shadow();
    if (inside > 0.5) light = uWarm * lamps(vP, N, 1.0) * 0.6 * uGl * ao;
    else {
      if (vP.z > 0.0) light += uWarm * lamps(vP, N, 0.0) * 3.4 * uGl;
      if (vP.z > -0.42) light += uWarm * windows(vP, N) * 0.5 * uGl;
      // the glass strips above the wings wash their roofs
      if (up > 0.5 && vP.y > 1.35 && vP.y < 1.5) light += uWarm * 0.16 * uGl * exp(-(abs(vP.x) - HALLX) * 1.7) * boxS(vP.zz, vec2(-2.9), vec2(-0.1), 0.3);
    }
    col = alb * light + extra;
    if (m > 4.5 && m < 5.5) col = mix(col, uSky * 0.11, 0.55 * exp(-vP.y * 0.9));   // haze at the foot of the mountains
  }
  gl_FragColor = vec4(finish(col), 1.0);
}`;

  const VS_WATER = `
attribute vec3 aP;
uniform mat4 uVP;
varying vec3 vP;
void main() { vP = aP; gl_Position = uVP * vec4(aP, 1.0); }`;
  const FS_WATER = HEAD + `
varying vec3 vP;
uniform vec3 uEye, uW, uHor, uZen, uSunR, uDeep;
uniform float uT, uRipple, uRain, uPool, uLights;
` + FINISH + FACADE + `
float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
  vec2 p = vP.xz;
  vec3 V = normalize(uEye - vP);
  // quiet ripples: three slow wave trains tilt the surface
  vec2 g = vec2(0.80, 0.60) * sin(dot(p, vec2(0.80, 0.60)) * 4.6 + uT * 0.80)
    + vec2(-0.50, 0.866) * sin(dot(p, vec2(-0.50, 0.866)) * 7.9 - uT * 1.10) * 0.6
    + vec2(0.26, -0.966) * sin(dot(p, vec2(0.26, -0.966)) * 12.7 + uT * 1.45) * 0.35;
  g *= uRipple;
  // rain: rings that open and fade, each at a new place every time
  if (uRain > 0.01) for (int i = 0; i < 9; i++) {
    float n = float(i), cyc = uT * (0.42 + 0.05 * n) + n * 0.377, k = floor(cyc), age = cyc - k;
    vec2 c = POOLC + POOLH * 0.92 * (vec2(hash(n * 7.13 + k * 3.7), hash(n * 3.31 + k * 9.2)) * 2.0 - 1.0);
    vec2 dv = p - c; float d = length(dv) + 0.0001, q = (d - age * 1.15) * 7.0;
    g += dv / d * sin(q * 3.6) * exp(-q * q) * (1.0 - age) * (1.0 - age) * 0.10 * uRain;
  }
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 R = reflect(-V, n); R.y = abs(R.y);
  // the mirror image: sky, the dark house, its lit windows
  float mass; vec3 fc = facade(vP, R, 0.025, mass);
  vec3 env = mix(mix(uHor, uZen, smoothstep(0.0, 0.8, R.y)), vec3(0.005, 0.006, 0.008), mass) + fc;
  // the evening sun lays a path of glints on the water, below itself: finer ripples catch it
  if (uW.z > 0.004) {
    vec2 f = vec2(0.20, 0.98) * sin(dot(p, vec2(0.20, 0.98)) * 17.0 + uT * 1.9) + vec2(-0.26, 0.966) * sin(dot(p, vec2(-0.26, 0.966)) * 27.0 - uT * 2.4) * 0.8
      + vec2(0.05, 0.999) * sin(dot(p, vec2(0.05, 0.999)) * 41.0 + uT * 3.1) * 0.6 + vec2(0.71, 0.71) * sin(dot(p, vec2(0.71, 0.71)) * 11.0 - uT * 1.3) * 0.5;
    vec3 Rs = reflect(-V, normalize(vec3(-(g.x * 0.3 + f.x * 0.005), 1.0, -(g.y * 0.3 + f.y * 0.005))));
    float daz = Rs.x * uSunR.z - Rs.z * uSunR.x, del = Rs.y - uSunR.y, free = 1.0 - mass;
    float col = exp(-daz * daz / 0.00016);   // the path's width; along it only the slopes that face the sun flash
    env += vec3(1.0, 0.72, 0.38) * (col * exp(-del * del / 0.00005) * 1.7 + col * 0.10 + exp(-daz * daz / 0.003) * 0.05) * free * uW.z;
  }
  // the basin glows from within, brighter along its walls; lamps under water on the long sides throw fans of light
  vec2 pr = p + g * 6.0, q2 = POOLH - abs(pr - POOLC);
  float de = max(min(q2.x, q2.y), 0.0);
  vec3 body = uDeep + vec3(0.05, 0.14, 0.20) * (0.16 + 0.84 * exp(-de * 2.1)) * uPool;
  float dx = (fract(pr.x / 1.44 + 0.5) - 0.5) * 1.44, zf = max(pr.y - (POOLC.y - POOLH.y), 0.0), zn = max((POOLC.y + POOLH.y) - pr.y, 0.0);
  float fan = exp(-dx * dx / (0.03 + 0.2 * zf * zf)) * exp(-zf * 1.1) + 0.55 * exp(-dx * dx / (0.03 + 0.2 * zn * zn)) * exp(-zn * 1.1);
  body += (vec3(0.11, 0.33, 0.43) * fan + vec3(0.9, 0.95, 0.8) * exp(-(dx * dx + zf * zf) * 110.0)) * uLights;
  float F = mix(0.42, 0.92, pow(1.0 - max(dot(V, n), 0.0), 3.0));
  gl_FragColor = vec4(finish(mix(body, env, F)), 1.0);
}`;

  // the ridge line, drawn once more as a hairline of gold: the logo's line, and the sun's rim in station 3
  const VS_LINE = `
attribute vec3 aP;
uniform mat4 uVP;
void main() { gl_Position = uVP * vec4(aP, 1.0); }`;
  const FS_LINE = HEAD + `
uniform vec4 uCol;
void main() { gl_FragColor = vec4(uCol.rgb * uCol.a, uCol.a); }`;

  // depth from the sun, packed into a colour texture (works everywhere)
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

  // steam, two kinds from one shader: a low veil of soft puffs on the water, and single wisps that
  // rise from it in a slow S and thin out (a brush stroke more than a cloud); warm where the hall lights them
  const VS_STEAM = `
attribute vec4 aS;   // x, z on the water, phase, speed
attribute vec3 aQ;   // corner, and a number of its own
uniform mat4 uVP;
uniform vec3 uR, uU;
uniform vec4 uTA;    // time, how many show (0..1), the hall's glow, kind (0 veil, 1 wisp)
varying vec3 vQ;
varying vec2 vA;
void main() {
  float wisp = step(0.5, uTA.w), k = aQ.z * 53.0, u = fract(aS.z + uTA.x * aS.w * mix(0.05, 0.028, wisp));
  vec3 c = mix(vec3(aS.x + 0.3 * sin(k + u * 4.0), -0.1 + 1.1 * u, aS.y + 0.25 * sin(k * 1.7 + u * 3.0)),
    vec3(aS.x + 0.2 * sin(k + u * 3.0), 0.75 + 0.2 * sin(k * 2.3) + 0.8 * u, aS.y - 0.25 * u), wisp);
  vec2 size = mix(vec2(0.45 + 0.9 * u), vec2(1.0, 1.0 + 0.2 * sin(k * 2.3) + 0.25 * u), wisp);
  vQ = vec3(aQ.xy, k + uTA.x * 0.3);
  vA.x = pow(sin(3.14159 * u), 1.2) * (1.0 - smoothstep(uTA.y - 0.12, uTA.y, aQ.z));
  vA.y = exp(-max(c.z, 0.0) * 0.6) * (1.0 - smoothstep(1.5, 4.0, abs(c.x))) * uTA.z;
  gl_Position = uVP * vec4(c + uR * aQ.x * size.x + mix(uU, vec3(0.0, 1.0, 0.0), wisp) * aQ.y * size.y, 1.0);
}`;
  const FS_STEAM = HEAD + `
varying vec3 vQ;
varying vec2 vA;
uniform vec3 uTint;
uniform float uKind;
void main() {
  float a;
  if (uKind > 0.5) {
    float h = vQ.y * 0.5 + 0.5;   // 0 at the water, 1 at the top
    float xc = (0.5 * sin(h * 6.4 + vQ.z) + 0.14 * sin(h * 12.5 + vQ.z * 1.7)) * (0.1 + 0.9 * h) - 0.22 * h * h, w = 0.07 + 0.26 * h, d = (vQ.x - xc) / w;
    a = exp(-d * d) * pow(h, 0.8) * pow(1.0 - h, 1.5) * vA.x * 1.0;
  } else a = max(exp(-dot(vQ.xy, vQ.xy) * 3.4) - 0.033, 0.0) * vA.x * 0.06;
  vec3 c = mix(uTint, vec3(0.925, 0.729, 0.408), min(vA.y * 0.55, 0.6));
  gl_FragColor = vec4(c * a, a);
}`;

  // rain: thin streaks over the block, a little brighter where they fall through the hall's light
  const VS_RAIN = `
attribute vec4 aS;   // x, z, phase, speed
attribute vec3 aQ;   // end, side, length
uniform mat4 uVP;
uniform vec3 uR;
uniform float uT, uPx;
varying float vA;
void main() {
  float u = fract(aS.z + uT * aS.w * 0.8);
  float y = max(11.0 - u * 11.5 - aQ.x * aQ.z, 0.0);
  vec3 p = vec3(aS.x + y * 0.13, y, aS.y);
  float lit = exp(-max(p.z, 0.0) * 0.5) * (1.0 - smoothstep(2.0, 4.5, abs(p.x))) * (1.0 - smoothstep(0.5, 3.0, p.y)) * step(0.0, p.z);
  vA = (0.5 + 1.2 * lit) * smoothstep(11.0, 8.0, y);
  gl_Position = uVP * vec4(p + uR * aQ.y * uPx * 0.65, 1.0);
}`;
  const FS_RAIN = HEAD + `
varying float vA;
uniform float uA;
void main() { float a = vA * uA; gl_FragColor = vec4(vec3(0.69, 0.784, 0.855) * a, a); }`;

  // stars: points in the picture's own frame, behind everything
  const VS_STAR = `
attribute vec4 aS;   // x, y in picture widths from its middle, size, phase
uniform vec4 uFrame;
uniform vec3 uTDA;   // time, device pixels, alpha
uniform float uOut;  // how far the stars have come out (the scroll through station 1)
varying float vA;
void main() {
  // each star has its own moment; the sky turns a little as they come out
  float on = smoothstep(0.0, 0.07, uOut - fract(aS.w * 0.159155) * 0.92);
  gl_Position = vec4(uFrame.xy + (aS.xy + vec2(-0.045, 0.018) * uOut) * uFrame.zw, 0.9995, 1.0);
  gl_PointSize = aS.z * uTDA.y * (0.8 + 0.4 * on);
  vA = (0.55 + 0.4 * sin(uTDA.x * 1.1 + aS.w)) * uTDA.z * on;
}`;
  const FS_STAR = HEAD + `
varying float vA;
void main() {
  float a = (1.0 - smoothstep(0.25, 1.0, length(gl_PointCoord - 0.5) * 2.0)) * vA;
  gl_FragColor = vec4(vec3(0.925, 0.839, 0.635) * a, 0.0);
}`;

  // clouds: low banks of flat, soft puffs that hang in the flanks of the mountains and drift in for the rain
  const VS_MIST = `
attribute vec4 aS;   // the puff's place and size
attribute vec3 aQ;   // corner, and where it comes from
uniform mat4 uVP;
uniform vec3 uR, uU;
uniform vec2 uIn;    // how far in (0..1), time
varying vec2 vQ;
void main() {
  vec3 c = aS.xyz; c.x += aQ.z * (1.0 - uIn.x) + 0.25 * sin(uIn.y * 0.06 + aS.y * 2.0 + aS.z);
  vQ = aQ.xy;
  gl_Position = uVP * vec4(c + (uR * aQ.x * 1.75 + uU * aQ.y * 0.6) * aS.w, 1.0);
}`;
  const FS_MIST = HEAD + `
varying vec2 vQ;
uniform vec4 uCol;   // colour, alpha
void main() {
  float a = max(exp(-dot(vQ, vQ) * 3.2) - 0.041, 0.0) * uCol.a;
  gl_FragColor = vec4(uCol.rgb * (0.74 + 0.26 * vQ.y) * a, a);   // a little lighter on top
}`;

  // ---- GL plumbing
  function program(vs, fs, attribs, uniforms) {
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('therme-3 shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('therme-3 link: ' + gl.getProgramInfoLog(p));
    const a = {}, u = {};
    for (const k of attribs) a[k] = gl.getAttribLocation(p, k);
    for (const k of uniforms) u[k] = gl.getUniformLocation(p, k);
    return { p, a, u };
  }

  // ---- small matrix kit (column-major, as GL wants it); nothing is allocated per frame
  const view = new Float32Array(16), proj = new Float32Array(16), VP = new Float32Array(16), light = new Float32Array(16);
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
  function camera(az, el) {   // fills view, eye, right, up (no arrays made here: it runs every frame)
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

  // the sun: seen from the standing camera it sits in the saddle; its light comes low from behind
  const SUN_AT = [SADDLE[0], SADDLE[1] + 0.5, SADDLE[2]], SUN_POS = [0, 0, 0], SUN_REFL = [0, 0, 0], SE = 24 * Math.PI / 180;
  let elNow = EL;
  function placeSun(el) {
    elNow = el; camera(AZ, el);
    for (let i = 0; i < 3; i++) SUN_POS[i] = eye[i] + (SUN_AT[i] - eye[i]) * 1.13;
    // where its mirror image lies on the water: on the line from us to the sun, in the near half of the basin
    const gz = 4.6, gx = SUN_AT[0] + (eye[0] - SUN_AT[0]) * (gz - SUN_AT[2]) / (eye[2] - SUN_AT[2]);
    const gv = norm([gx - eye[0], POOL.level - eye[1], gz - eye[2]]);
    SUN_REFL[0] = gv[0]; SUN_REFL[1] = -gv[1]; SUN_REFL[2] = gv[2];
  }
  placeSun(EL);
  const hd = norm([SUN_AT[0] - eye[0], 0, SUN_AT[2] - eye[2]]);
  const SUN_DIR = [hd[0] * Math.cos(SE), Math.sin(SE), hd[2] * Math.cos(SE)];

  // ---- what lives on the GPU; made again if the context comes back
  let R = null;
  const SH = 2048;
  function buffer(data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); return b; }
  function bind(pr, buf, stride, layout) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (let i = 0; i < layout.length; i++) {
      const l = pr.a[layout[i][0]]; if (l < 0) continue;
      gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, layout[i][1], gl.FLOAT, false, stride * 4, layout[i][2] * 4);
    }
  }
  function unbind(pr, layout) { for (let i = 0; i < layout.length; i++) if (pr.a[layout[i][0]] >= 0) gl.disableVertexAttribArray(pr.a[layout[i][0]]); }
  const L_MESH = [['aP', 3, 0], ['aN', 3, 3], ['aC', 3, 6], ['aM', 2, 9]], L_POS = [['aP', 3, 0]], L_DISC = [['aQ', 2, 0]],
    L_PART = [['aS', 4, 0], ['aQ', 3, 4]], L_STAR = [['aS', 4, 0]];
  const N_STEAM = 70, N_WISP = 26, N_RAIN = 300, N_STAR = 190;
  let nMist = 0;

  function setup() {
    build();
    const r = {};
    r.mesh = program(VS_MESH, FS_MESH, ['aP', 'aN', 'aC', 'aM'], ['uVP', 'uLight', 'uEye', 'uW', 'uSky', 'uKey', 'uSun', 'uSunDir', 'uInk', 'uLift', 'uWet', 'uPx', 'uLights', 'uPool', 'uShTex', 'uShadow', 'uTree', 'uWarm', 'uGl']);
    r.water = program(VS_WATER, FS_WATER, ['aP'], ['uVP', 'uEye', 'uW', 'uHor', 'uZen', 'uSunR', 'uDeep', 'uT', 'uRipple', 'uRain', 'uPool', 'uLights', 'uWarm', 'uGl']);
    r.depth = program(VS_DEPTH, FS_DEPTH, ['aP'], ['uLight']);
    r.disc = program(VS_DISC, FS_DISC, ['aQ'], ['uVP', 'uC', 'uR', 'uU', 'uSize', 'uCol', 'uKind']);
    r.steam = program(VS_STEAM, FS_STEAM, ['aS', 'aQ'], ['uVP', 'uR', 'uU', 'uTA', 'uTint', 'uKind']);
    r.rain = program(VS_RAIN, FS_RAIN, ['aS', 'aQ'], ['uVP', 'uR', 'uT', 'uPx', 'uA']);
    r.star = program(VS_STAR, FS_STAR, ['aS'], ['uFrame', 'uTDA', 'uOut']);
    r.mist = program(VS_MIST, FS_MIST, ['aS', 'aQ'], ['uVP', 'uR', 'uU', 'uIn', 'uCol']);
    r.line = program(VS_LINE, FS_LINE, ['aP'], ['uVP', 'uCol']);

    r.bMesh = buffer(V); V = [];
    r.bCrest = buffer(crestLine);
    const y = POOL.level;
    r.bWater = buffer([-POOL.x, y, POOL.z1, POOL.x, y, POOL.z1, POOL.x, y, POOL.z0, -POOL.x, y, POOL.z1, POOL.x, y, POOL.z0, -POOL.x, y, POOL.z0]);
    r.bDisc = buffer([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
    const Q = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    seed = 77;
    let d = [];
    for (let i = 0; i < N_STEAM; i++) {
      const x = (rnd() * 2 - 1) * 3.2, z = POOL.z0 + 0.25 + rnd() * (POOL.z1 - POOL.z0 - 0.5), ph = rnd(), sp = 0.6 + rnd() * 0.8, id = (i + 0.5) / N_STEAM;
      for (const q of Q) d.push(x, z, ph, sp, q[0], q[1], id);
    }
    r.bSteam = buffer(d); d = [];
    for (let i = 0; i < N_WISP; i++) {
      const x = (rnd() * 2 - 1) * 3.0, z = POOL.z0 + 0.3 + rnd() * (POOL.z1 - POOL.z0 - 0.7), ph = rnd(), sp = 0.7 + rnd() * 0.6, id = (i + 0.5) / N_WISP;
      for (const q of Q) d.push(x, z, ph, sp, q[0], q[1], id);
    }
    r.bWisp = buffer(d); d = [];
    for (let i = 0; i < N_RAIN; i++) {
      const x = (rnd() * 2 - 1) * (PX - 0.2), z = ZB + 0.3 + rnd() * (ZF - ZB - 0.6), ph = rnd(), sp = 0.8 + rnd() * 0.5, len = 0.45 + rnd() * 0.45;
      for (const q of Q) d.push(x, z, ph, sp, q[1] > 0 ? 0 : 1, q[0], len);
    }
    r.bRain = buffer(d); d = [];
    // stars: above and beside the mountains, thinner towards the copy
    for (let i = 0; i < N_STAR; i++) {
      let x = -0.5 + rnd() * 1.5; const yy = -0.02 + rnd() * 0.44;
      if (x < -0.2 && rnd() < 0.5) x = -x * 0.9;
      d.push(x, yy, 1.4 + rnd() * 1.5, rnd() * 6.3);
    }
    r.bStar = buffer(d); d = [];
    // cloud banks: [from x, to x, height, z, puffs, size, where it drifts in from]
    const BANKS = [[-6.6, -2.4, 3.3, -5.2, 9, 0.95, 8], [-1.2, 4.6, 2.35, -4.9, 11, 0.9, 10], [-4.4, -1.6, 4.5, -6.0, 6, 0.7, 12], [3.6, 6.6, 1.45, -4.5, 6, 0.65, 7]];
    nMist = 0;
    for (const [xa, xb, yb, z, n, size, from] of BANKS) for (let i = 0; i < n; i++) {
      const x = xa + (xb - xa) * (i + rnd() * 0.8) / n, yy = yb + (rnd() - 0.5) * 0.24, zz = z + (rnd() - 0.5) * 0.5, s = size * (0.7 + 0.6 * rnd());
      for (const q of Q) d.push(x, yy, zz, s, q[0], q[1], from);
      nMist += 6;
    }
    r.bMist = buffer(d);

    // the sun's shadow map: the house, the trees and the day beds, seen from the sun, once
    const lv = new Float32Array(16), lp = new Float32Array(16), c = [0, 0.5, -1], e = [c[0] + SUN_DIR[0] * 40, c[1] + SUN_DIR[1] * 40, c[2] + SUN_DIR[2] * 40];
    lookAt(lv, e, c);
    const ex = 14, ne = 5, fa = 80;
    lp.set([1 / ex, 0, 0, 0, 0, 1 / ex, 0, 0, 0, 0, -2 / (fa - ne), 0, 0, 0, -(fa + ne) / (fa - ne), 1]);
    mul(light, lp, lv);
    r.shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, r.shTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SH, SH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(), rb = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, r.shTex, 0);
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SH, SH);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    gl.viewport(0, 0, SH, SH); gl.clearColor(1, 1, 1, 1); gl.clearDepth(1); gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
      gl.useProgram(r.depth.p); gl.uniformMatrix4fv(r.depth.u.uLight, false, light);
      bind(r.depth, r.bMesh, 11, L_POS); gl.drawArrays(gl.TRIANGLES, 0, nCast); unbind(r.depth, L_POS);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb); gl.deleteRenderbuffer(rb);
    gl.cullFace(gl.BACK);
    R = r;
  }
  // a shader that does not compile (an exotic driver): no ride, the list stays
  try { setup(); } catch (err) { if (window.console) console.warn(err.message || err); return; }
  gl.clearColor(16 / 255, 20 / 255, 26 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  // a lost context: stop drawing and hide the canvas (the band is ink then), come back if it does
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); R = null; canvas.style.visibility = 'hidden'; });
  canvas.addEventListener('webglcontextrestored', () => { try { setup(); canvas.style.visibility = ''; } catch (err) { R = null; } });

  // ---- where the picture goes: the block and the summits fitted into the band, right of the copy and
  // clear of the band's faded edges (phones: the lower part, the copy stands above it). The scroll
  // pushes in by a few percent; the fit leaves room for that.
  const PUSH = 0.04;
  let K0 = 1, K = 1, OX = 0, OY = 0, CX = 0, CY = 0, BW = 1, midX = 0, midY = 0;
  function fit() {
    const phone = Wd < 768;
    placeSun(phone ? EL_PHONE : EL);   // phones look from a little higher: the picture gets taller, not wider
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of fitPts) {
      const zv = view[2] * p[0] + view[6] * p[1] + view[10] * p[2] + view[14];
      const sx = DIST * (view[0] * p[0] + view[4] * p[1] + view[8] * p[2] + view[12]) / -zv, sy = DIST * (view[1] * p[0] + view[5] * p[1] + view[9] * p[2] + view[13]) / -zv;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    K0 = Math.min((phone ? 0.95 : 0.38) * Wd / (x1 - x0), (phone ? 0.44 : 0.80) * Hd / (y1 - y0)) / (1 + PUSH);
    BW = (x1 - x0) * K0; midX = (x0 + x1) / 2; midY = (y0 + y1) / 2;
    CX = 2 * (phone ? 0.5 : 0.7) - 1; CY = 1 - 2 * (phone ? 0.69 : 0.5);
    const ne = DIST - 34, fa = DIST + 70;
    proj.fill(0);
    proj[10] = (fa + ne) / (ne - fa); proj[11] = -1; proj[14] = 2 * fa * ne / (ne - fa);
    push(1);
  }
  // the lens: K pixels a metre at the model's middle, and that middle stays where it is
  function push(f) {
    K = K0 * f; OX = CX - 2 * K * midX / Wd; OY = CY - 2 * K * midY / Hd;
    proj[0] = 2 * K * DIST / Wd; proj[5] = 2 * K * DIST / Hd; proj[8] = -OX; proj[9] = -OY;
  }

  // ---- the three stations: sky light, key light, what the water mirrors (linear light)
  const SKY = [[0.110, 0.150, 0.215], [0.080, 0.100, 0.130], [0.115, 0.125, 0.170]];
  const KEYL = [[0.050, 0.065, 0.090], [0.030, 0.037, 0.046], [0.030, 0.032, 0.042]];
  const HOR = [[0.040, 0.068, 0.110], [0.036, 0.046, 0.060], [0.150, 0.095, 0.065]];
  const ZEN = [[0.014, 0.024, 0.042], [0.022, 0.028, 0.038], [0.022, 0.030, 0.050]];
  const WARMS = [lin(236, 186, 104), [0.90, 0.47, 0.115], lin(236, 186, 104)];
  const INK = lin(16, 20, 26);
  const v3 = new Float32Array(3), treeData = new Float32Array(18);
  TREES.forEach(([x, z, h], i) => { treeData[i * 3] = x; treeData[i * 3 + 1] = z; treeData[i * 3 + 2] = (0.14 * h + 0.14) ** 2; });
  const mix3 = (a, w) => { for (let i = 0; i < 3; i++) v3[i] = a[0][i] * w[0] + a[1][i] * w[1] + a[2][i] * w[2]; return v3; };
  const sunAt = [0, 0, 0];

  function disc(r, at, size, cr, cg, cb, sharp, solid) {
    gl.uniform3f(r.disc.u.uC, at[0], at[1], at[2]); gl.uniform1f(r.disc.u.uSize, size);
    gl.uniform3f(r.disc.u.uCol, cr, cg, cb); gl.uniform2f(r.disc.u.uKind, sharp, solid);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // the scroll blends the stations as the copy changes: 1 until p 0.32, into 2 by 0.50, 2 until 0.66, into 3 by 0.86
  const WG = [1, 0, 0];
  function draw(pos, t) {
    const r = R;
    if (!r || Wd < 2 || Hd < 2) return;
    const a12 = ease(clamp((pos - 0.32) / 0.18)), a23 = ease(clamp((pos - 0.66) / 0.20));
    WG[0] = 1 - a12; WG[1] = a12 * (1 - a23); WG[2] = a23;
    const W = Wd, H = Hd, w = WG, w1 = w[0], w2 = w[1], w3 = w[2];
    push(1 + PUSH * ease(pos));   // forward only, a few percent
    // the camera drifts by about a degree, so the depth is felt
    camera(AZ + 0.02 * Math.sin(t * 0.11), elNow + 0.005 * Math.sin(t * 0.083 + 1.3));
    mul(VP, proj, view);
    const glow = 0.9 * w1 + 1.2 * w2 + 1.0 * w3, lights = 0.4 * w1 + 0.55 * w2 + 1.0 * w3, pool = 0.55 * w1 + 0.6 * w2 + 0.8 * w3;
    const px = 1 / (K * dpr), in2 = ease(w2), in3 = ease(w3);

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(16 / 255, 20 / 255, 26 / 255, 1); gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.BLEND);

    // the model: first the table's shadow (no depth), then everything solid
    let p = r.mesh;
    gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniformMatrix4fv(p.u.uLight, false, light);
    gl.uniform3f(p.u.uEye, eye[0], eye[1], eye[2]); gl.uniform3f(p.u.uW, w1, w2, w3);
    gl.uniform3fv(p.u.uSky, mix3(SKY, w)); gl.uniform3fv(p.u.uKey, mix3(KEYL, w)); gl.uniform3fv(p.u.uWarm, mix3(WARMS, w));
    gl.uniform3f(p.u.uSun, 2.0 * in3, 1.02 * in3, 0.42 * in3); gl.uniform3f(p.u.uSunDir, SUN_DIR[0], SUN_DIR[1], SUN_DIR[2]);
    gl.uniform3f(p.u.uInk, INK[0], INK[1], INK[2]);
    {   // the table's lift: centre and reach in device px (see the shader)
      const cyp = (CY * 0.5 + 0.5) * H * dpr, ry = 0.88 * Math.min(cyp, H * dpr - cyp), rx = Math.max(BW * dpr, 2 * ry);
      gl.uniform4f(p.u.uLift, (CX * 0.5 + 0.5) * W * dpr, cyp, 1 / rx, 1 / ry);
    }
    gl.uniform1f(p.u.uWet, 0.10 * w1 + 0.62 * w2 + 0.12 * w3); gl.uniform1f(p.u.uPx, px);
    gl.uniform1f(p.u.uLights, lights); gl.uniform1f(p.u.uPool, pool); gl.uniform1f(p.u.uGl, glow); gl.uniform1f(p.u.uShTex, 1 / SH);
    gl.uniform3fv(p.u.uTree, treeData);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, r.shTex); gl.uniform1i(p.u.uShadow, 0);
    bind(p, r.bMesh, 11, L_MESH);
    gl.disable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLES, nAll - 6, 6);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.drawArrays(gl.TRIANGLES, 0, nAll - 6);
    unbind(p, L_MESH);

    // the water
    p = r.water;
    gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform3f(p.u.uEye, eye[0], eye[1], eye[2]); gl.uniform3f(p.u.uW, w1, w2, in3);
    gl.uniform3fv(p.u.uHor, mix3(HOR, w)); gl.uniform3fv(p.u.uZen, mix3(ZEN, w)); gl.uniform3fv(p.u.uWarm, mix3(WARMS, w));
    gl.uniform3f(p.u.uSunR, SUN_REFL[0], SUN_REFL[1], SUN_REFL[2]); gl.uniform3f(p.u.uDeep, 0.006, 0.016, 0.024);
    gl.uniform1f(p.u.uT, t); gl.uniform1f(p.u.uRipple, 0.010 * w1 + 0.017 * w2 + 0.012 * w3); gl.uniform1f(p.u.uRain, w2);
    gl.uniform1f(p.u.uPool, pool); gl.uniform1f(p.u.uLights, lights); gl.uniform1f(p.u.uGl, glow);
    bind(p, r.bWater, 3, L_POS); gl.drawArrays(gl.TRIANGLES, 0, 6); unbind(p, L_POS);

    // from here on: light and air, laid over the model (colour already multiplied by its alpha)
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);

    const stars = w1 + 0.3 * w3;
    if (stars > 0.01) {
      p = r.star; gl.useProgram(p.p);
      gl.uniform4f(p.u.uFrame, CX, CY, 2 * BW / W, 2 * BW / H); gl.uniform3f(p.u.uTDA, t, dpr, stars); gl.uniform1f(p.u.uOut, 0.2 + 0.9 * clamp(pos / 0.3));
      bind(p, r.bStar, 4, L_STAR); gl.drawArrays(gl.POINTS, 0, N_STAR); unbind(p, L_STAR);
    }

    // the evening sun rises into the saddle, behind the ridge
    p = r.disc; gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform3f(p.u.uR, right[0], right[1], right[2]); gl.uniform3f(p.u.uU, upv[0], upv[1], upv[2]);
    bind(p, r.bDisc, 2, L_DISC);
    if (w3 > 0.004) {
      sunAt[0] = SUN_POS[0]; sunAt[1] = SUN_POS[1] - (1 - in3) * 2.2; sunAt[2] = SUN_POS[2];
      disc(r, sunAt, 9.5, 0.925 * 0.26 * w3, 0.729 * 0.26 * w3, 0.408 * 0.26 * w3, 0, 0);
      disc(r, sunAt, 3.4, 0.925 * 0.34 * w3, 0.80 * 0.34 * w3, 0.55 * 0.34 * w3, 0, 0);
      disc(r, sunAt, 1.0, 0.975 * w3, 0.83 * w3, 0.56 * w3, 1, w3);
    }
    unbind(p, L_DISC);

    // the ridge's gold hairline; it lights up when the sun stands behind it
    p = r.line; gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform4f(p.u.uCol, 0.925, 0.80 + 0.04 * w3, 0.55, 0.26 * w1 + 0.12 * w2 + 0.8 * w3);
    bind(p, r.bCrest, 3, L_POS); gl.drawArrays(gl.LINE_STRIP, 0, CREST.length); unbind(p, L_POS);

    if (w2 > 0.004) {
      p = r.mist; gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform3f(p.u.uR, right[0], right[1], right[2]); gl.uniform3f(p.u.uU, upv[0], upv[1], upv[2]);
      gl.uniform2f(p.u.uIn, in2, t); gl.uniform4f(p.u.uCol, 0.37, 0.42, 0.48, 0.3 * w2);
      bind(p, r.bMist, 7, L_PART); gl.drawArrays(gl.TRIANGLES, 0, nMist); unbind(p, L_PART);
    }

    p = r.steam; gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform3f(p.u.uR, right[0], right[1], right[2]); gl.uniform3f(p.u.uU, upv[0], upv[1], upv[2]);
    const steam = 0.55 * w1 + 1.12 * w2 + 0.5 * w3;
    gl.uniform3f(p.u.uTint, 0.839 - 0.02 * w3, 0.886 - 0.08 * w3, 0.902 - 0.2 * w3);
    gl.uniform4f(p.u.uTA, t, steam, glow, 0); gl.uniform1f(p.u.uKind, 0);
    bind(p, r.bSteam, 7, L_PART); gl.drawArrays(gl.TRIANGLES, 0, N_STEAM * 6);
    gl.uniform4f(p.u.uTA, t, steam, glow, 1); gl.uniform1f(p.u.uKind, 1);
    bind(p, r.bWisp, 7, L_PART); gl.drawArrays(gl.TRIANGLES, 0, N_WISP * 6); unbind(p, L_PART);

    if (w2 > 0.004) {
      p = r.rain; gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform3f(p.u.uR, right[0], right[1], right[2]);
      gl.uniform1f(p.u.uT, t); gl.uniform1f(p.u.uPx, 1 / K); gl.uniform1f(p.u.uA, 0.3 * w2);
      bind(p, r.bRain, 7, L_PART); gl.drawArrays(gl.TRIANGLES, 0, N_RAIN * 6); unbind(p, L_PART);
    }

    // a breath of glow in the air in front of the hall, and the sun's glare over the ridge
    gl.disable(gl.DEPTH_TEST);
    p = r.disc; gl.useProgram(p.p); bind(p, r.bDisc, 2, L_DISC);
    v3[0] = 0; v3[1] = 0.9; v3[2] = 0.4;
    disc(r, v3, 6.0, 0.925 * 0.07 * glow, 0.729 * 0.07 * glow, 0.408 * 0.07 * glow, 0, 0);
    if (w3 > 0.004) disc(r, sunAt, 4.6, 0.925 * 0.11 * w3, 0.729 * 0.11 * w3, 0.408 * 0.11 * w3, 0, 0);
    unbind(p, L_DISC);
    gl.depthMask(true);
  }

  // ---- markup: tall section > pinned stage > canvas + the list + CTA (as bergfahrt.js)
  const ride = document.createElement('div');
  ride.className = 'ride';
  ride.innerHTML = '<div class="ride__stage"><a class="btn btn--gold ride__cta"></a></div>';
  const cta = ride.querySelector('.ride__cta');
  cta.href = chain.dataset.cta || '#check';
  cta.textContent = chain.dataset.ctaLabel || 'Sichtbarkeit prüfen';
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

  const BUDGET = 4.2e6;   // canvas pixels, as in the Bergfahrt
  function size() {
    Wd = canvas.clientWidth; Hd = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(BUDGET / Math.max(1, Wd * Hd)));
    canvas.width = Math.round(Wd * dpr); canvas.height = Math.round(Hd * dpr);
    fit();
  }

  // ---- loop: only while the section is on screen, about 30 pictures a second (water, steam
  // and rain move with time); the copy follows the scroll as in the Bergfahrt
  const STATIONS = [0, 0.47, 0.85];
  let running = false, last = -1, lastW = 0, lastH = 0, lastT = 0;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (now - lastT < 30) return;
    lastT = now;
    if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) { size(); lastW = Wd; lastH = Hd; last = -1; }
    const r = ride.getBoundingClientRect();
    // the pin range: the stage's height, not innerHeight, which jumps as a phone's toolbar hides
    const p = Math.min(1, Math.max(0, ((parseFloat(getComputedStyle(stage).top) || 0) - r.top) / (r.height - stage.offsetHeight)));
    draw(p, now / 1000);
    if (Math.abs(p - last) > 0.0004) {
      last = p;
      const k = (a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
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
