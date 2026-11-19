/* ============ BLAUE STUNDE — hotel scene: the evidence chain as a model of the house ============
   On Hotels & Resorts (D-77): the three links of <ol class="chain"> become the stations of one
   pinned picture, in the style "Raum" (as js/styles/therme-3.js): an architect's presentation
   model on a block of dark stone, seen from a raised three-quarter view through a long lens,
   raw WebGL, no library. The house: a symmetric alpine hotel, gable to the front, a stone
   ground floor, two timber floors with balconies, a calm roof with deep eaves, the entrance on
   the axis. In front of it the forecourt with its parking bays, the drive on the axis and the
   road along the block's front; behind it the folded ridge with the two summits of the logo.

   The picture stands still; each station says its line through light and small actors
   - station 1 "Wer Sie nicht kennt, bucht beim Portal": blue hour, the house almost dark, the
     drive unlit, the forecourt all but empty; a car comes along the road and drives past
   - station 2 "Wer Sie kennt, bucht bei Ihnen": the windows come on one by one, the entrance
     and the lanterns along the drive glow, smoke rises; a car turns in and drives up to the door
   - station 3 "Direkt gebucht, keine Provision": the evening sun in the saddle, every window
     warm, every parking bay taken
   The scroll gives the station (and pushes the camera in by a few percent, never up or
   sideways), time moves the actors. Reuses the Bergfahrt's markup and CSS (.ride, .chain--ride).
   Without JS, without WebGL or with reduced motion the list stays as it is; a lost context
   leaves the band ink. Own file: an error here cannot stop the scroll engine.
   ================================================================================================ */
(() => {
  const chain = document.querySelector('.chain');
  if (!chain || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = [...chain.children];
  if (items.length !== 3) return;

  // WebGL first: without it nothing is built and the plain list stays as without JS
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let gl = null;
  try { gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: true, stencil: false }); } catch (err) { gl = null; }
  if (!gl) return;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = u => u * u * (3 - 2 * u);
  let seed = 31;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // fixed, so every visit looks the same
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lin = (r, g, b) => [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];   // site colours into linear light
  const f3 = v => v.toFixed(3);

  // ---- the model, in metres or so: x along the front, y up, z towards us; the house's axis is x = 0,
  // its front wall is z = 0
  const PX = 7.2, ZB = -9.8, ZF = 6.4, BASE = -0.7;                       // the block
  const HW = 4.0, HB = -3.3;                                              // the house: half its width, its back wall
  const PL = 0.14, F1 = 1.02, F2 = 1.88, EV = 2.74, TP = 0.38;            // terrace, floor levels, eaves, the roof's pitch (rise per run)
  const PEAK = EV + HW * TP;
  const BAY = 0.82;                                                       // nine window bays across the front
  const RO = 0.62, RF = 0.74, RBK = -3.55, RT = 0.11, XE = HW + RO;       // roof: overhang at the sides and in front, its back edge, thickness
  const BALC = 0.52;                                                      // the balconies' depth
  const DOOR = 0.68, DOOR_H = 0.94, DOOR_Z = -0.14;                       // the entrance: half its width, its height, how far it is set back
  const TX = 4.8, TZ0 = -3.6, TZ1 = 1.3;                                  // the terrace the house stands on
  const CXH = 5.4, CZ0 = 1.3, CZ1 = 3.9;                                  // the forecourt
  const RDC = 5.3, RDH = 0.6, DRIVE = 0.85;                               // the road (middle, half width), the drive's half width
  const SLOT_X = [2.0, 2.85, 3.7, 4.55], SLOT_Z = 2.35, SLOT_W = 0.85;    // parking bays, mirrored left and right of the axis
  const LX = 1.2, LZ0 = 4.3, LDZ = 1.25;                                  // three pairs of lanterns along the drive
  const GX0 = 2 * BAY;                                                    // the first ground floor window beside the door
  const LANE = 5.6, TURN = 1.1, STOP = 2.5;                               // the lane towards the right, the turn's radius, where a guest stops
  const CHIM = [[-1.4, -2.15], [1.4, -2.15]];
  const AZ = 18 * Math.PI / 180, EL = 27 * Math.PI / 180, EL_PHONE = 33 * Math.PI / 180, DIST = 60;   // the view: from the right, raised, far away
  const PUSH = 0.06;                                                      // the scroll brings the camera this much nearer
  const TARGET = [0, 1.2, -1.6];
  const RIDGE_Z = -7.2, MX = RIDGE_Z * Math.tan(AZ) + 0.5;                // the ridge is shifted so that, seen from there, the saddle stands over the house
  // the ridge line, left to right as seen: the big summit, the saddle, the smaller summit (the logo)
  const CS = 1.14;
  const CREST = [[-5.36, 2.2], [-4.5, 3.3], [-3.6, 4.6], [-2.7, 5.4], [-1.9, 4.5], [-0.9, 3.2], [0.2, 2.5], [1.2, 2.85], [2.2, 3.7],
    [3.0, 4.3], [3.9, 3.55], [5.0, 2.8], [6.2, 2.2], [7.5, 1.7], [9.04, 1.2]].map(([x, h]) => [x, h * CS]);
  const SADDLE = [0.2 + MX, 2.5 * CS, RIDGE_Z];
  const TREES = [[-5.75, -1.5, 3.0], [-6.4, -2.8, 3.7], [-6.55, -0.3, 2.3], [5.65, -2.5, 3.3], [6.45, -1.1, 2.4], [-6.45, 0.85, 1.9]];

  // materials: albedo in linear light
  const C = {
    stone: [0.13, 0.145, 0.165], side: [0.075, 0.085, 0.10], roof: [0.23, 0.245, 0.27], dark: [0.03, 0.03, 0.035],
    timber: [0.24, 0.15, 0.085], boards: [0.30, 0.20, 0.11], rail: [0.185, 0.115, 0.065], hand: [0.42, 0.29, 0.165], tree: [0.045, 0.08, 0.07],
    wall: [0.40, 0.39, 0.37], terrace: [0.185, 0.195, 0.21], glass: [0.84, 0.50, 0.14], lamp: [1.0, 0.78, 0.46], car: [0.33, 0.335, 0.35],
  };
  // material ids, read by the shader
  const M = { plain: 0, timber: 1, stone: 2, wall: 3, light: 4, rock: 5, table: 6, side: 7, terrace: 8, roof: 9, balc: 10 };

  // ---- mesh: 11 floats a corner (place, normal, colour, material, a value: occlusion, or for
  // glass and lamps when they come on)
  let V = [];
  const put = (p, n, c, m, ao) => { V.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], m, ao); };
  function quad(a, b, c, d, col, m, ao) {   // a..d counter-clockwise seen from outside
    const n = norm(cross(sub(b, a), sub(c, a))), o = ao || [1, 1, 1, 1];
    put(a, n, col, m, o[0]); put(b, n, col, m, o[1]); put(c, n, col, m, o[2]);
    put(a, n, col, m, o[0]); put(c, n, col, m, o[2]); put(d, n, col, m, o[3]);
  }
  // a quad turned so that it faces `out`; cols: one colour, or two (for a, b and for c, d)
  function face(a, b, c, d, out, cols, m, ao) {
    let n = norm(cross(sub(b, a), sub(c, a)));
    const o = ao === undefined ? [1, 1, 1, 1] : typeof ao === 'number' ? [ao, ao, ao, ao] : ao;
    const two = Array.isArray(cols[0]), c0 = two ? cols[0] : cols, c1 = two ? cols[1] : cols;
    if (dot(n, out) < 0) {
      n = [-n[0], -n[1], -n[2]];
      put(a, n, c0, m, o[0]); put(c, n, c1, m, o[2]); put(b, n, c0, m, o[1]);
      put(a, n, c0, m, o[0]); put(d, n, c1, m, o[3]); put(c, n, c1, m, o[2]);
    } else {
      put(a, n, c0, m, o[0]); put(b, n, c0, m, o[1]); put(c, n, c1, m, o[2]);
      put(a, n, c0, m, o[0]); put(c, n, c1, m, o[2]); put(d, n, c1, m, o[3]);
    }
  }
  function tri(a, b, c, ca, cb, cc, m, out) {   // flat, turned so it faces `out`
    let n = norm(cross(sub(b, a), sub(c, a)));
    if (dot(n, out) < 0) { n = [-n[0], -n[1], -n[2]]; put(a, n, ca, m, 1); put(c, n, cc, m, 1); put(b, n, cb, m, 1); }
    else { put(a, n, ca, m, 1); put(b, n, cb, m, 1); put(c, n, cc, m, 1); }
  }
  // a box; o.b / o.t: occlusion at the foot and the top of its walls, o.top: another colour / material on top,
  // o.v: one value for every corner (lamps)
  function box(x0, y0, z0, x1, y1, z1, col, m, o) {
    o = o || {};
    if (x0 > x1) { const s = x0; x0 = x1; x1 = s; }
    if (z0 > z1) { const s = z0; z0 = z1; z1 = s; }
    const b = o.v !== undefined ? o.v : o.b === undefined ? 1 : o.b, t = o.v !== undefined ? o.v : o.t === undefined ? 1 : o.t, s = [b, b, t, t];
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col, m, s);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, m, s);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, m, s);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, m, s);
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], o.top || col, o.mTop === undefined ? m : o.mTop, [t, t, t, t].map(v => (o.v !== undefined ? v : 1)));
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

  // ---- the windows: wall 0 = the front (u is x), 1 / -1 = the right / left side (u is z). Each has
  // its turn (0..1): the scroll raises one level and a window is lit once the level has passed it.
  // The first four are chosen (the few that are lit at the blue hour), the rest take a seeded order.
  const WINS = [];
  for (const fl of [1, 2]) for (let i = 0; i < 9; i++) WINS.push({ wall: 0, u: (i - 4) * BAY, y0: (fl === 1 ? F1 : F2) + 0.05, y1: (fl === 1 ? F1 : F2) + 0.61, hw: 0.23, fl, bay: i });
  for (const i of [-1, 0, 1]) WINS.push({ wall: 0, u: i * BAY, y0: EV + 0.17, y1: EV + 0.62, hw: 0.19, fl: 3 });
  for (const d of [-1, 1]) for (let i = 0; i < 3; i++) WINS.push({ wall: 0, u: d * (GX0 + BAY * i), y0: PL + 0.22, y1: PL + 0.72, hw: 0.27, fl: 0, g: (d < 0 ? 0 : 3) + i });
  for (let fl = 0; fl < 3; fl++) for (const z of [-0.8, -1.65, -2.5]) {
    const y = [PL, F1, F2][fl];
    WINS.push({ wall: 1, u: z, y0: y + (fl ? 0.14 : 0.22), y1: y + (fl ? 0.6 : 0.72), hw: 0.21, fl });
  }
  (() => {
    seed = 29;
    const first = [WINS.find(w => w.fl === 2 && w.bay === 6), WINS.find(w => w.fl === 1 && w.bay === 1), WINS.find(w => w.g === 4), WINS.find(w => w.wall === 1 && w.fl === 1 && w.u === -1.65)];
    const rest = WINS.filter(w => !first.includes(w)).map(w => [rnd(), w]).sort((a, b) => a[0] - b[0]).map(e => e[1]);
    [...first, ...rest].forEach((w, i, all) => { w.turn = 0.035 + 0.93 * (i + 0.5) / all.length; w.tone = 0.78 + 0.34 * rnd(); });
    for (const w of WINS.filter(w => w.wall === 1)) WINS.push({ ...w, wall: -1 });   // the far side mirrors the near one
  })();
  const GROUND = WINS.filter(w => w.g !== undefined).sort((a, b) => a.g - b.g);
  const lit1 = (turn, level) => ease(clamp((level - turn + 0.012) / 0.024));

  let nCast = 0, nStatic = 0, nCar = 0;
  const fitPts = [], crestLine = [];
  function build() {
    V = []; seed = 31;
    const FR = [0, 0, 1], BK = [0, 0, -1], UP = [0, 1, 0], DN = [0, -1, 0];
    // --- what throws a shadow: the terrace, the house, the lanterns, the trees
    box(-TX, 0, TZ0, TX, PL, TZ1, C.terrace, M.plain, { top: C.terrace, mTop: M.terrace, b: 0.7, t: 0.95 });
    box(-1.15, 0, TZ1, 1.15, PL / 2, TZ1 + 0.22, C.terrace, M.plain, { b: 0.7 });                                   // one step up, on the axis
    // the front: stone below (with the entrance cut out), timber above, up into the gable
    for (const d of [-1, 1]) face([d * DOOR, PL, 0], [d * HW, PL, 0], [d * HW, F1, 0], [d * DOOR, F1, 0], FR, C.wall, M.wall);
    face([-DOOR, DOOR_H, 0], [DOOR, DOOR_H, 0], [DOOR, F1, 0], [-DOOR, F1, 0], FR, C.wall, M.wall);
    face([-HW, F1, 0], [HW, F1, 0], [HW, EV, 0], [-HW, EV, 0], FR, C.timber, M.timber);
    tri([-HW, EV, 0], [HW, EV, 0], [0, PEAK, 0], C.timber, C.timber, C.timber, M.timber, FR);
    for (const d of [-1, 1]) {                                                                                       // the sides
      face([d * HW, PL, 0], [d * HW, PL, HB], [d * HW, F1, HB], [d * HW, F1, 0], [d, 0, 0], C.wall, M.wall);
      face([d * HW, F1, 0], [d * HW, F1, HB], [d * HW, EV, HB], [d * HW, EV, 0], [d, 0, 0], C.timber, M.timber);
    }
    face([-HW, PL, HB], [HW, PL, HB], [HW, EV, HB], [-HW, EV, HB], BK, C.side, M.plain);                            // the back
    tri([-HW, EV, HB], [HW, EV, HB], [0, PEAK, HB], C.side, C.side, C.side, M.plain, BK);
    for (const x of [-0.23, 0.23]) box(x - 0.014, PL, DOOR_Z, x + 0.014, DOOR_H, DOOR_Z + 0.03, C.dark, M.plain);   // the door's posts and rail
    box(-DOOR, 0.76, DOOR_Z, DOOR, 0.78, DOOR_Z + 0.025, C.dark, M.plain);
    // the balconies: a slab, a balustrade of upright boards, a handrail that catches the light
    for (const y of [F1, F2]) {
      box(-HW, y - 0.06, 0, HW, y, BALC, C.timber, M.plain, { b: 0.55, t: 0.8 });
      box(-HW, y, BALC - 0.035, HW, y + 0.29, BALC, C.rail, M.timber, { b: 0.8, t: 1 });
      for (const d of [-1, 1]) box(d * (HW - 0.035), y, 0, d * HW, y + 0.29, BALC - 0.035, C.rail, M.timber, { b: 0.8, t: 1 });
      box(-HW - 0.02, y + 0.29, BALC - 0.06, HW + 0.02, y + 0.33, BALC + 0.025, C.hand, M.plain);
    }
    // the roof: two planes over a ridge, a slab with deep eaves
    const yE = EV - RO * TP;
    for (const d of [-1, 1]) {
      const out = [d * TP, 1, 0];
      face([0, PEAK + RT, RF], [d * XE, yE + RT, RF], [d * XE, yE + RT, RBK], [0, PEAK + RT, RBK], out, C.roof, M.roof);
      face([0, PEAK, RF], [d * XE, yE, RF], [d * XE, yE, RBK], [0, PEAK, RBK], [-d * TP, -1, 0], C.side, M.plain, 0.6);
      face([d * XE, yE, RF], [d * XE, yE + RT, RF], [d * XE, yE + RT, RBK], [d * XE, yE, RBK], [d, 0, 0], C.roof, M.plain, [0.5, 0.62, 0.62, 0.5]);
      face([0, PEAK, RF], [d * XE, yE, RF], [d * XE, yE + RT, RF], [0, PEAK + RT, RF], FR, C.roof, M.plain, [0.5, 0.5, 0.62, 0.62]);
      face([0, PEAK, RBK], [d * XE, yE, RBK], [d * XE, yE + RT, RBK], [0, PEAK + RT, RBK], BK, C.roof, M.plain, 0.5);
    }
    for (const [x, z] of CHIM) {                                                                                     // two chimneys, mirrored
      const y = EV + (HW - Math.abs(x)) * TP;
      box(x - 0.14, y - 0.1, z - 0.14, x + 0.14, PEAK + 0.28, z + 0.14, C.wall, M.plain, { b: 0.6, t: 1 });
      box(x - 0.17, PEAK + 0.28, z - 0.17, x + 0.17, PEAK + 0.315, z + 0.17, C.dark, M.plain);
    }
    // the windows' frames: slim and dark, a sill, one post in the middle
    for (const w of WINS) {
      const bx = (u0, y0, u1, y1, d0, d1) => (w.wall === 0 ? box(u0, y0, d0, u1, y1, d1, C.dark, M.plain) : box(w.wall * (HW + d0), y0, u0, w.wall * (HW + d1), y1, u1, C.dark, M.plain));
      const f = 0.022, a = w.u - w.hw, b = w.u + w.hw;
      bx(a - f, w.y0, a, w.y1, 0, 0.035); bx(b, w.y0, b + f, w.y1, 0, 0.035);
      bx(a - f, w.y1, b + f, w.y1 + f, 0, 0.035); bx(a - f - 0.02, w.y0 - f, b + f + 0.02, w.y0, 0, 0.055);
      bx(w.u - 0.009, w.y0, w.u + 0.009, w.y1, 0, 0.022);
    }
    for (let i = 0; i < 3; i++) for (const d of [-1, 1]) {                                                          // the lanterns' posts
      const x = d * LX, z = LZ0 - LDZ * i;
      box(x - 0.022, 0, z - 0.022, x + 0.022, 0.3, z + 0.022, C.dark, M.plain);
    }
    for (const [x, z, h] of TREES) fir(x, z, h);
    nCast = V.length / 11;

    // --- the block: stone on top, cut faces around
    quad([-PX, 0, ZF], [PX, 0, ZF], [PX, 0, ZB], [-PX, 0, ZB], C.stone, M.stone);
    const g = [1, 1, 0.35, 0.35];
    quad([-PX, 0, ZF], [-PX, BASE, ZF], [PX, BASE, ZF], [PX, 0, ZF], C.side, M.side, g);
    quad([PX, 0, ZF], [PX, BASE, ZF], [PX, BASE, ZB], [PX, 0, ZB], C.side, M.side, g);
    quad([-PX, 0, ZB], [-PX, BASE, ZB], [-PX, BASE, ZF], [-PX, 0, ZF], C.side, M.side, g);
    quad([PX, 0, ZB], [PX, BASE, ZB], [-PX, BASE, ZB], [-PX, 0, ZB], C.side, M.side, g);

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
    const top = 5.4 * CS;
    const rock = p => { const u = Math.min(1, p[1] / top), v = u * u; return [0.05 + 0.07 * u + 0.07 * v, 0.062 + 0.08 * u + 0.075 * v, 0.085 + 0.09 * u + 0.08 * v]; };
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

    // --- what gives light: the windows' glass, the entrance, the lanterns; the balconies' floors, lit by their windows
    for (const w of WINS) {
      const lo = C.glass.map(v => v * w.tone), hi = lo.map(v => v * 0.6), e = 0.004, a = w.u - w.hw, b = w.u + w.hw;
      if (w.wall === 0) face([a, w.y0, e], [b, w.y0, e], [b, w.y1, e], [a, w.y1, e], FR, [lo, hi], M.light, w.turn);
      else { const x = w.wall * (HW + e); face([x, w.y0, a], [x, w.y0, b], [x, w.y1, b], [x, w.y1, a], [w.wall, 0, 0], [lo, hi], M.light, w.turn); }
    }
    const door = [1.0, 0.62, 0.2], reveal = [0.36, 0.22, 0.075];
    face([-DOOR, PL, DOOR_Z], [DOOR, PL, DOOR_Z], [DOOR, DOOR_H, DOOR_Z], [-DOOR, DOOR_H, DOOR_Z], FR, [door, door.map(v => v * 0.7)], M.light, -1);
    for (const d of [-1, 1]) face([d * DOOR, PL, 0], [d * DOOR, PL, DOOR_Z], [d * DOOR, DOOR_H, DOOR_Z], [d * DOOR, DOOR_H, 0], [-d, 0, 0], reveal, M.light, -1);
    face([-DOOR, DOOR_H, 0], [DOOR, DOOR_H, 0], [DOOR, DOOR_H, DOOR_Z], [-DOOR, DOOR_H, DOOR_Z], DN, reveal.map(v => v * 0.7), M.light, -1);
    for (const x of [-0.455, 0, 0.455]) box(x - 0.028, DOOR_H - 0.13, -0.085, x + 0.028, DOOR_H - 0.074, -0.03, C.lamp.map(v => v * 2.6), M.light, { v: -1 });   // three lamps under the porch
    for (let i = 0; i < 3; i++) for (const d of [-1, 1]) {
      const x = d * LX, z = LZ0 - LDZ * i;
      box(x - 0.036, 0.3, z - 0.036, x + 0.036, 0.372, z + 0.036, C.lamp, M.light, { v: 2 });
    }
    for (const w of WINS) if (w.wall === 0 && (w.fl === 1 || w.fl === 2)) {
      const y = (w.fl === 1 ? F1 : F2) + 0.003, x0 = w.bay === 0 ? -HW + 0.035 : w.u - BAY / 2, x1 = w.bay === 8 ? HW - 0.035 : w.u + BAY / 2;
      face([x0, y, BALC - 0.035], [x1, y, BALC - 0.035], [x1, y, 0], [x0, y, 0], UP, C.boards, M.balc, w.turn);
    }
    nStatic = V.length / 11;
    // the table under the block (drawn first, only its shadow shows)
    quad([-90, BASE, 90], [90, BASE, 90], [90, BASE, -90], [-90, BASE, -90], C.side, M.table);

    // --- a car, as a model maker cuts it from a strip of wood: a body, a low cabin. It stands at the
    // origin and looks along x; the shader puts it where it is wanted
    const c0 = V.length / 11, cc = C.car, L = 0.66, HWD = 0.28;
    box(-L, 0.06, -HWD, L, 0.25, HWD, cc, M.plain, { b: 0.45, t: 1 });
    const y0 = 0.25, y1 = 0.4, a0 = -0.42, a1 = 0.27, b0 = -0.29, b1 = 0.09, w0 = 0.255, w1 = 0.215;
    face([b0, y1, w1], [b1, y1, w1], [b1, y1, -w1], [b0, y1, -w1], UP, cc, M.plain);
    face([a1, y0, w0], [a1, y0, -w0], [b1, y1, -w1], [b1, y1, w1], [1, 0.5, 0], cc, M.plain, [0.8, 0.8, 1, 1]);
    face([a0, y0, -w0], [a0, y0, w0], [b0, y1, w1], [b0, y1, -w1], [-1, 0.5, 0], cc, M.plain, [0.8, 0.8, 1, 1]);
    face([a0, y0, w0], [a1, y0, w0], [b1, y1, w1], [b0, y1, w1], [0, 0.3, 1], cc, M.plain, [0.8, 0.8, 1, 1]);
    face([a0, y0, -w0], [a1, y0, -w0], [b1, y1, -w1], [b0, y1, -w1], [0, 0.3, -1], cc, M.plain, [0.8, 0.8, 1, 1]);
    nCar = V.length / 11 - c0;
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

  const VS_MESH = `
attribute vec3 aP, aN, aC;
attribute vec2 aM;
uniform mat4 uVP, uLight;
uniform vec4 uMdl;   // a piece that moves (a car): its place x, z and the cosine, sine of its heading
varying vec3 vP, vN, vC, vSh;
varying vec2 vM;
void main() {
  vec3 p = vec3(uMdl.x + aP.x * uMdl.z - aP.z * uMdl.w, aP.y, uMdl.y + aP.x * uMdl.w + aP.z * uMdl.z);
  vP = p; vC = aC; vM = aM;
  vN = vec3(aN.x * uMdl.z - aN.z * uMdl.w, aN.y, aN.x * uMdl.w + aN.z * uMdl.z);
  vSh = (uLight * vec4(p, 1.0)).xyz * 0.5 + 0.5;
  gl_Position = uVP * vec4(p, 1.0);
}`;
  const FS_MESH = HEAD + `
varying vec3 vP, vN, vC, vSh;
varying vec2 vM;
uniform vec3 uSky, uKey, uSun, uSunDir, uInk, uWarm, uGL, uGR;
uniform float uPx, uShTex, uGl, uLit, uDoor, uLamp, uSunOn, uAl;
uniform sampler2D uShadow;
uniform vec3 uTree[6];
uniform vec4 uSL, uSR, uCar[2];   // parked cars left and right (how much of each shows); two cars that drive: place, heading
uniform vec2 uCarI, uCarA;        // their headlights, how much of them shows
uniform vec3 uCast;               // where the sun throws a shadow on the ground (x, z), and how long a car's is
` + FINISH + `
const vec3 KEY = vec3(-0.720, 0.500, 0.481);   // a cool key from the upper left, so every face has its own value
const float HW = ${f3(HW)}, F1 = ${f3(F1)}, F2 = ${f3(F2)}, EV = ${f3(EV)}, TP = ${f3(TP)}, BAY = ${f3(BAY)};
float boxS(vec2 p, vec2 lo, vec2 hi, float s) {   // a soft-edged rectangle
  vec2 a = smoothstep(lo - s, lo + s, p) * (1.0 - smoothstep(hi - s, hi + s, p));
  return a.x * a.y;
}
// fine dark joints every per units; never thinner than a pixel, they fade instead
float joint(float s, float per, float wid, float stretch) {
  float e = abs(fract(s / per + 0.5) - 0.5) * per, px = uPx * stretch, w = max(wid, px * 1.1);
  return (wid / w) * (1.0 - smoothstep(0.0, w, e)) * clamp(per / (px * 3.0) - 0.6, 0.0, 1.0);
}
float smin(float a, float b, float k) {   // two outlines joined with a rounded inner corner
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
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
// what the balconies and the eaves keep from the walls
float under(vec3 P, vec3 N) {
  if (N.z > 0.5 && P.z < 0.02) {
    if (P.y < F1) return 1.0 - 0.45 * exp(-max(F1 - 0.06 - P.y, 0.0) * 4.0);
    if (P.y < F2) return 1.0 - 0.6 * exp(-max(F2 - 0.06 - P.y, 0.0) * 4.0);
    return 1.0 - 0.62 * exp(-max(EV + (HW - abs(P.x)) * TP - P.y, 0.0) * 2.4);
  }
  if (abs(N.x) > 0.5 && abs(P.x) < HW + 0.02) return 1.0 - 0.55 * exp(-max(EV - P.y, 0.0) * 2.0);
  return 1.0;
}
// a car's headlights: a fan on the ground in front of it, a wash on what stands in its way
float beam(vec3 P, vec3 N, vec4 c) {
  vec2 d = P.xz - (c.xy + c.zw * 0.66);
  float al = dot(d, c.zw), ac = d.x * c.w - d.y * c.z;
  if (al < 0.0) return 0.0;
  float f = exp(-ac * ac / (0.04 + 0.045 * al * al)) * smoothstep(0.0, 0.45, al) / (1.0 + 0.32 * al * al);
  return f * (N.y > 0.5 ? 1.0 : 1.8 * max(-dot(N.xz, c.zw), 0.0));
}
// the warm light near the ground in front of the house: lanterns, ground floor windows, the entrance, headlights
vec3 nearLights(vec3 P, vec3 N) {
  vec3 Q = vec3(abs(P.x), P.y, P.z), Nm = vec3(N.x * sign(P.x), N.y, N.z), e;
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 d = vec3(${f3(LX)}, 0.42, ${f3(LZ0)} - ${f3(LDZ)} * float(i)) - Q; float r2 = dot(d, d);
    s += max(dot(Nm, d) * inversesqrt(r2), 0.0) / (r2 + 0.07);
  }
  e = uWarm * s * 0.11 * uLamp;
  vec3 lv = P.x < 0.0 ? uGL : uGR; s = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 d = vec3(${f3(GX0)} + BAY * float(i), 0.62, 0.0) - Q; float r2 = dot(d, d), il = inversesqrt(r2);
    s += lv[i] * max(dot(Nm, d) * il, 0.0) * max(-d.z * il, 0.0) / (r2 + 0.3);
  }
  e += uWarm * s * 0.36;
  vec3 d = vec3(0.0, 0.85, -0.05) - P; float r2 = dot(d, d), il = inversesqrt(r2);
  e += uWarm * uDoor * 1.7 * max(dot(N, d) * il, 0.0) * max(-d.z * il, 0.0) / (r2 * 0.55 + 0.5);
  e *= uGl;
  for (int i = 0; i < 2; i++) e += vec3(1.0, 0.86, 0.62) * beam(P, N, uCar[i]) * uCarI[i] * 0.55;
  return e;
}
void main() {
  vec3 N = normalize(vN), alb = vC, col;
  float m = vM.x, ao = vM.y;
  if (m > 3.5 && m < 4.5) {                                                       // glass and lamps: dark panes that mirror the sky, or lit
    float on = ao < -0.5 ? uDoor : ao > 1.5 ? uLamp : smoothstep(ao - 0.012, ao + 0.012, uLit);
    vec3 off = vec3(0.007, 0.009, 0.013) + uSky * (ao > 1.5 ? 0.07 : 0.13);
    col = mix(off, alb * uGl * (ao > 1.5 ? 1.6 : 1.0), on);
  } else if (m > 5.5 && m < 6.5) {                                                // the table: only a soft shadow under the block
    vec2 p = vP.xz, lo = vec2(-${PX.toFixed(2)}, ${ZB.toFixed(2)}), hi = vec2(${PX.toFixed(2)}, ${ZF.toFixed(2)});
    vec2 c = p - vec2(0.0, -1.5);
    float lift = exp(-dot(c, c) / 120.0);
    col = uInk * (1.0 + 1.5 * lift) * (1.0 - 0.5 * boxS(p, lo - 0.6, hi + 0.6, 2.6)) * (1.0 - 0.62 * boxS(p, lo - 0.35, hi + 0.35, 0.55));
  } else {
    float up = N.y, sun = 1.0;
    vec3 glow = vec3(0.0);
    if (m > 0.5 && m < 1.5) {              // timber: upright boards
      float s = abs(N.z) > 0.5 ? vP.x : vP.z;
      alb *= 1.0 - 0.5 * joint(s, 0.13, 0.02, 1.0) * step(abs(up), 0.5);
      ao *= under(vP, N);
    } else if (m > 1.5 && m < 2.5) {       // the block's top: stone paving; the road, the drive and the forecourt are one smooth surface
      vec2 p = vP.xz; float ax = abs(p.x), px = uPx * 1.6;
      float dR = abs(p.y - ${f3(RDC)}) - ${f3(RDH)};
      vec2 q = abs(p - vec2(0.0, ${f3((CZ1 + RDC - RDH) / 2)})) - vec2(${f3(DRIVE)}, ${f3((RDC - RDH - CZ1) / 2 + 0.25)}); float dD = max(q.x, q.y);
      q = abs(p - vec2(0.0, ${f3((CZ0 + CZ1) / 2)})) - vec2(${f3(CXH)}, ${f3((CZ1 - CZ0) / 2)}); float dC = max(q.x, q.y);
      float d = min(smin(dR, dD, 0.45), smin(dC, dD, 0.45));
      float way = 1.0 - smoothstep(-px, px, d), kerb = (1.0 - smoothstep(0.075 - px, 0.075 + px, d)) * (1.0 - way);
      float j = max(joint(p.x, 0.9, 0.02, 1.0), joint(p.y - 0.4, 0.9, 0.02, 2.2)) * (1.0 - way) * (1.0 - kerb);
      float cell = (ax - ${f3(SLOT_X[0] - SLOT_W / 2)}) / ${f3(SLOT_W)}, e = abs(fract(cell + 0.5) - 0.5) * ${f3(SLOT_W)};   // the parking bays' lines
      float w = max(0.014, px * 0.9);
      float bay = (0.014 / w) * (1.0 - smoothstep(0.0, w, e)) * step(-0.3, cell) * step(cell, 4.3) * boxS(p.yy, vec2(${f3(SLOT_Z - 0.76)}), vec2(${f3(SLOT_Z + 0.76)}), px);
      alb = mix(alb, alb * vec3(0.60, 0.62, 0.66), way) * (1.0 + 0.3 * kerb) * (1.0 - 0.5 * j) * (1.0 + 0.9 * bay);
      ao *= 1.0 - 0.5 * boxS(p, vec2(-${f3(TX)}, ${f3(TZ0)}), vec2(${f3(TX)}, ${f3(TZ1)}), 0.3);
      for (int i = 0; i < 6; i++) { vec2 dd = p - uTree[i].xy; ao *= 1.0 - 0.6 * exp(-dot(dd, dd) / uTree[i].z); }
      vec4 sl = p.x < 0.0 ? uSL : uSR;
      for (int i = 0; i < 4; i++) {
        vec2 c = vec2(${f3(SLOT_X[0])} + ${f3(SLOT_W)} * float(i), ${f3(SLOT_Z)});
        ao *= 1.0 - 0.62 * sl[i] * boxS(vec2(ax, p.y), c - vec2(0.3, 0.68), c + vec2(0.3, 0.68), 0.15);
        if (uSunOn > 0.004) for (int k = 0; k < 2; k++) {   // the parked cars' shadows in the evening sun, left and right
          vec2 o = p - vec2(k == 0 ? -c.x : c.x, c.y), lo = (o - vec2(0.28, 0.66)) / uCast.xy, hi = (o + vec2(0.28, 0.66)) / uCast.xy;
          float len = min(uCast.z, min(hi.x, hi.y)) - max(0.0, max(lo.x, lo.y));
          sun *= 1.0 - (k == 0 ? uSL[i] : uSR[i]) * smoothstep(0.0, 0.12, len);
        }
      }
      for (int i = 0; i < 2; i++) {
        vec2 dd = p - uCar[i].xy, l = vec2(dot(dd, uCar[i].zw), dd.x * uCar[i].w - dd.y * uCar[i].z);
        ao *= 1.0 - 0.62 * uCarA[i] * boxS(l, vec2(-0.68, -0.3), vec2(0.68, 0.3), 0.15);
      }
    } else if (m > 2.5 && m < 3.5) {       // the ground floor's stone, in courses
      alb *= 1.0 - 0.28 * joint(vP.y - ${f3(PL)}, 0.172, 0.014, 1.0) * step(abs(up), 0.5);
      ao *= under(vP, N);
    } else if (m > 7.5 && m < 8.5) {       // the terrace: finer paving, the house's shade at its foot
      float j = max(joint(vP.x, 0.45, 0.014, 1.0), joint(vP.z - 0.4, 0.45, 0.014, 2.2));
      alb *= 1.0 - 0.4 * j;
      ao *= (1.0 - 0.45 * boxS(vP.xz, vec2(-HW, ${f3(HB)}), vec2(HW, 0.0), 0.3)) * (0.72 + 0.28 * smoothstep(0.1, 0.9, vP.z));
    } else if (m > 8.5 && m < 9.5) {       // the roof: seams down the fall line, its arrises catch the light
      float ax = abs(vP.x), e = min(min(ax, ${f3(XE)} - ax), min(${f3(RF)} - vP.z, vP.z - ${f3(RBK)}));
      alb *= (1.0 - 0.2 * joint(vP.z - 0.11, 0.46, 0.014, 1.0)) * (1.0 + 0.4 * (1.0 - smoothstep(0.0, 0.035 + uPx, e)));
    } else if (m > 9.5) {                  // a balcony's floor: boards, and the light of the window behind it
      float on = smoothstep(ao - 0.012, ao + 0.012, uLit), dx = (fract(vP.x / BAY + 0.5) - 0.5) * BAY;
      alb *= 1.0 - 0.4 * joint(vP.x, 0.2, 0.02, 1.0);
      glow = uWarm * uGl * on * 0.55 * exp(-dx * dx / 0.045) * exp(-vP.z * 2.6);
      ao = 0.5 + 0.5 * smoothstep(0.0, 0.5, vP.z);
    } else if (m > 6.5 && m < 7.5) alb *= 1.0 + 1.2 * smoothstep(-0.05, -0.012, vP.y) * step(vP.y, 0.001);   // the block's top edge catches the light
    float rock = m > 4.5 && m < 5.5 ? 1.0 : 0.0;   // the folded ridge takes more of the key light: each facet its own value
    vec3 light = (uSky * mix(0.16, 1.0, 0.5 + 0.5 * up) * (1.0 - 0.45 * rock) + uKey * max(dot(N, KEY), 0.0) * (1.0 + 1.8 * rock)) * ao;
    if (uSunOn > 0.004) light += uSun * max(dot(N, uSunDir), 0.0) * shadow() * sun;
    if (vP.z > -0.2 && vP.y < 1.0 && vP.y > -0.01) light += nearLights(vP, N);
    col = alb * (light + glow);
    if (rock > 0.5) col = mix(col, uSky * 0.11, 0.55 * exp(-vP.y * 0.9));   // haze at the foot of the mountains
  }
  gl_FragColor = vec4(finish(col) * uAl, uAl);
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

  // one soft or sharp disc that faces the camera (sun, glows, the cars' lamps)
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
  float a = uKind.x > 0.5 ? 1.0 - smoothstep(0.8, 1.0, r) : max(exp(-r * r * 4.5) - 0.0111, 0.0);
  float n = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(uCol * a + n * step(0.002, a), a * uKind.y);
}`;

  // smoke: single wisps that rise from a chimney in a slow S and thin out (a brush stroke more than a cloud)
  const VS_SMOKE = `
attribute vec4 aS;   // the chimney's mouth, phase
attribute vec3 aQ;   // corner, and a number of its own
uniform mat4 uVP;
uniform vec3 uR;
uniform vec2 uTA;    // time, how much shows
varying vec3 vQ;
varying float vA;
void main() {
  float k = aQ.z * 53.0, u = fract(aS.w + uTA.x * 0.04);
  vec2 size = vec2(0.5, 0.72 + 0.12 * sin(k * 2.3) + 0.3 * u);
  vec3 c = aS.xyz + vec3(0.12 + 0.3 * u, size.y - 0.06 + 0.45 * u, 0.0);
  vQ = vec3(aQ.xy, k + uTA.x * 0.3);
  vA = pow(sin(3.14159 * u), 1.2) * uTA.y;
  gl_Position = uVP * vec4(c + uR * aQ.x * size.x + vec3(0.0, 1.0, 0.0) * aQ.y * size.y, 1.0);
}`;
  const FS_SMOKE = HEAD + `
varying vec3 vQ;
varying float vA;
uniform vec3 uTint;
void main() {
  float h = vQ.y * 0.5 + 0.5;   // 0 at the chimney, 1 at the top
  float xc = (0.5 * sin(h * 6.4 + vQ.z) + 0.14 * sin(h * 12.5 + vQ.z * 1.7)) * (0.1 + 0.9 * h) - 0.22 * h * h, w = 0.07 + 0.26 * h, d = (vQ.x - xc) / w;
  float a = exp(-d * d) * pow(h, 0.8) * pow(1.0 - h, 1.5) * vA;
  gl_FragColor = vec4(uTint * a, a);
}`;

  // stars: points in the picture's own frame, behind everything
  const VS_STAR = `
attribute vec4 aS;   // x, y in picture widths from its middle, size, phase
uniform vec4 uFrame;
uniform vec3 uTDA;   // time, device pixels, alpha
varying float vA;
void main() {
  gl_Position = vec4(uFrame.xy + aS.xy * uFrame.zw, 0.9995, 1.0);
  gl_PointSize = aS.z * uTDA.y;
  vA = (0.5 + 0.3 * sin(uTDA.x * 0.8 + aS.w)) * uTDA.z;
}`;
  const FS_STAR = HEAD + `
varying float vA;
void main() {
  float a = (1.0 - smoothstep(0.25, 1.0, length(gl_PointCoord - 0.5) * 2.0)) * vA;
  gl_FragColor = vec4(vec3(0.925, 0.839, 0.635) * a, 0.0);
}`;

  // ---- GL plumbing
  function program(vs, fs, attribs, uniforms) {
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('hotel-scene shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('hotel-scene link: ' + gl.getProgramInfoLog(p));
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

  // the sun: seen from the standing camera it sits in the saddle; its light comes low from behind
  const SUN_AT = [SADDLE[0], SADDLE[1] + 0.5, SADDLE[2]], SUN_POS = [0, 0, 0], SE = 27 * Math.PI / 180;
  let elNow = EL;
  function placeSun(el) {
    elNow = el; camera(AZ, el, DIST);
    for (let i = 0; i < 3; i++) SUN_POS[i] = eye[i] + (SUN_AT[i] - eye[i]) * 1.13;
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
  const N_SMOKE = 6, N_STAR = 90;

  function setup() {
    build();
    const r = {};
    r.mesh = program(VS_MESH, FS_MESH, ['aP', 'aN', 'aC', 'aM'], ['uVP', 'uLight', 'uMdl', 'uSky', 'uKey', 'uSun', 'uSunDir', 'uInk', 'uWarm', 'uGL', 'uGR',
      'uPx', 'uShTex', 'uGl', 'uLit', 'uDoor', 'uLamp', 'uSunOn', 'uAl', 'uShadow', 'uTree', 'uSL', 'uSR', 'uCar', 'uCarI', 'uCarA', 'uCast']);
    r.depth = program(VS_DEPTH, FS_DEPTH, ['aP'], ['uLight']);
    r.disc = program(VS_DISC, FS_DISC, ['aQ'], ['uVP', 'uC', 'uR', 'uU', 'uSize', 'uCol', 'uKind']);
    r.smoke = program(VS_SMOKE, FS_SMOKE, ['aS', 'aQ'], ['uVP', 'uR', 'uTA', 'uTint']);
    r.star = program(VS_STAR, FS_STAR, ['aS'], ['uFrame', 'uTDA']);
    r.line = program(VS_LINE, FS_LINE, ['aP'], ['uVP', 'uCol']);

    r.bMesh = buffer(V); V = [];
    r.bCrest = buffer(crestLine);
    r.bDisc = buffer([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
    const Q = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    seed = 77;
    let d = [];
    for (let i = 0; i < N_SMOKE; i++) {
      const [x, z] = CHIM[i % 2], ph = (Math.floor(i / 2) + (i % 2) * 0.45) / (N_SMOKE / 2), id = rnd();
      for (const q of Q) d.push(x, PEAK + 0.315, z, ph, q[0], q[1], id);
    }
    r.bSmoke = buffer(d); d = [];
    // stars: above and beside the mountains, thinner towards the copy
    for (let i = 0; i < N_STAR; i++) {
      let x = -0.5 + rnd() * 1.08; const yy = -0.02 + rnd() * 0.44;
      if (x < -0.2 && rnd() < 0.5) x = -x * 0.9;
      d.push(x, yy, 1.4 + rnd() * 1.5, rnd() * 6.3);
    }
    r.bStar = buffer(d);

    // the sun's shadow map: the house, the lanterns and the trees, seen from the sun, once
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
  // a shader that does not compile (an exotic driver): nothing is built, the plain list stays
  try { setup(); } catch (err) { if (window.console) console.warn(err.message || err); return; }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); R = null; });
  canvas.addEventListener('webglcontextrestored', () => { try { setup(); } catch (err) { R = null; } });

  // ---- markup: tall section > pinned stage > canvas + the list + CTA (as bergfahrt.js)
  const ride = document.createElement('div');
  ride.className = 'ride';
  ride.innerHTML = '<div class="ride__stage"><a class="btn btn--gold ride__cta"></a></div>';
  const cta = ride.querySelector('.ride__cta');
  cta.href = chain.dataset.cta || '#rechner';
  cta.textContent = chain.dataset.ctaLabel || 'Potenzial berechnen';
  chain.before(ride);
  const stage = ride.firstElementChild;
  stage.insertBefore(canvas, cta);
  stage.insertBefore(chain, cta);   // no 01-03 progress on the right any more (Nicky, 2026-11-09)
  chain.classList.add('chain--ride');
  items[0].classList.add('is-active');

  // ---- where the picture goes: the block and the summits, right of the copy (phones: the upper part).
  // Fitted for the camera at its nearest, so the push never makes it wider than half the screen
  let fitW = 0, fitH = 0, K = 1, OX = 0, OY = 0, CX = 0, CY = 0, BW = 1;
  function fit(W, H, phone) {
    fitW = W; fitH = H;
    placeSun(phone ? EL_PHONE : EL);   // phones look from a little higher: the picture gets taller, not wider
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of fitPts) {
      const zv = view[2] * p[0] + view[6] * p[1] + view[10] * p[2] + view[14];
      const sx = DIST * (view[0] * p[0] + view[4] * p[1] + view[8] * p[2] + view[12]) / -zv, sy = DIST * (view[1] * p[0] + view[5] * p[1] + view[9] * p[2] + view[13]) / -zv;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    // the band's top and bottom fade into the page (the canvas's mask), so the model keeps clear of them
    const cx = phone ? 0.5 : 0.7, cy = phone ? 0.31 : 0.525;
    K = Math.min((phone ? 0.92 : 0.5) * W / (x1 - x0), (phone ? 0.5 : 0.87) * H / (y1 - y0));
    BW = (x1 - x0) * K;
    CX = 2 * cx - 1; CY = 1 - 2 * cy;
    OX = CX - K * (x0 + x1) / W; OY = CY - K * (y0 + y1) / H;
    const ne = DIST - 34, fa = DIST + 74;
    proj.fill(0);
    proj[0] = 2 * K * DIST / W; proj[5] = 2 * K * DIST / H; proj[8] = -OX; proj[9] = -OY;
    proj[10] = (fa + ne) / (ne - fa); proj[11] = -1; proj[14] = 2 * fa * ne / (ne - fa);
  }

  // ---- the three stations: sky light, key light (linear light)
  const SKY = [[0.110, 0.150, 0.215], [0.086, 0.114, 0.168], [0.140, 0.140, 0.172]];
  const KEYL = [[0.050, 0.065, 0.090], [0.036, 0.047, 0.066], [0.030, 0.032, 0.042]];
  const WARM = lin(236, 186, 104), INK = lin(16, 20, 26);
  const v3 = new Float32Array(3), treeData = new Float32Array(18);
  TREES.forEach(([x, z, h], i) => { treeData[i * 3] = x; treeData[i * 3 + 1] = z; treeData[i * 3 + 2] = (0.14 * h + 0.14) ** 2; });
  const mix3 = (a, w) => { for (let i = 0; i < 3; i++) v3[i] = a[0][i] * w[0] + a[1][i] * w[1] + a[2][i] * w[2]; return v3; };
  const sunAt = [0, 0, 0];

  // ---- the actors
  // the way in: along the road, a quarter turn into the drive, up the axis to the steps
  const PATH = [];
  (() => {
    const add = (x, z) => { const q = PATH[PATH.length - 1]; PATH.push({ x, z, s: q ? q.s + Math.hypot(x - q.x, z - q.z) : 0 }); };
    for (let x = -PX; x < -TURN - 0.05; x += 0.1) add(x, LANE);
    for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; add(-TURN + TURN * Math.sin(a), LANE - TURN + TURN * Math.cos(a)); }
    for (let z = LANE - TURN - 0.1; z > STOP + 0.05; z -= 0.1) add(0, z);
    add(0, STOP);
  })();
  const S_TURN = PX - TURN, S_END = PATH[PATH.length - 1].s;
  // two cars that drive: [0] passes by (station 1), [1] turns in (station 2). x, z: place; c, s: heading;
  // a: how much of it shows; lamp: its lights
  const cars = [{ x: -PX, z: LANE, c: 1, s: 0, a: 0, lamp: 1, run: -4.6 }, { x: -PX, z: LANE, c: 1, s: 0, a: 0, lamp: 1, run: 2.6, rest: 0 }];
  function along(car, s) {   // puts a car on the way in, s units from its start
    let i = 1;
    while (i < PATH.length - 1 && PATH[i].s < s) i++;
    const a = PATH[i - 1], b = PATH[i], l = b.s - a.s || 1, u = clamp((s - a.s) / l);
    car.x = a.x + (b.x - a.x) * u; car.z = a.z + (b.z - a.z) * u; car.c = (b.x - a.x) / l; car.s = (b.z - a.z) / l;
  }
  // the parking bays fill in this order (0..3 left of the axis from the middle outwards, 4..7 right)
  const FILL = [6, 1, 4, 3, 5, 0, 7, 2], slotA = new Float32Array(8);
  let station = -1, level = -1, filled = -1;
  function act(dt, w, p) {
    const s = w[0] >= w[1] && w[0] >= w[2] ? 0 : w[1] >= w[2] ? 1 : 2;
    if (s !== station) {   // a station begins: its car is already on its way
      station = s;
      if (s === 0) { cars[0].run = -4.6; cars[0].a = 0; }
      if (s === 1) { cars[1].run = 2.6; cars[1].rest = 0; cars[1].a = 0; }
    }
    // station 1: a car comes along the road, passes the drive and is gone; after a pause, the next one
    const a = cars[0];
    a.run += 2.2 * dt;
    if (a.run > PX + 2.4) a.run = -PX - 0.2;
    a.x = a.run; a.z = LANE; a.c = 1; a.s = 0;
    a.a = clamp(a.a + (a.run > -PX && a.run < PX - 1.5 ? dt / 0.6 : -dt / 0.6));
    // station 2: a car slows down, turns in, drives up the axis and stops at the steps; its lights go out,
    // it stays a while and dissolves as the next one comes along the road
    const b = cars[1];
    if (b.run < S_END) {
      const rem = S_END - b.run;
      let v = 2.2 - 0.95 * ease(clamp((b.run - (S_TURN - 1.5)) / 1.5));
      if (rem < 1.1) v *= Math.max(0.1, Math.sqrt(rem / 1.1));
      b.run = Math.min(S_END, b.run + v * dt);
    } else {
      b.rest += dt;
      if (b.rest > 8.4) { b.run = 0; b.rest = 0; b.a = 0; }
    }
    along(b, b.run);
    b.a = clamp(b.a + (b.rest < 6 ? dt / 0.7 : -dt / 2.2));
    b.lamp = 1 - clamp((b.rest - 2.4) / 1.4);
    // the windows and the parked cars follow the scroll, but never faster than one after the other
    const k = (a0, a1) => clamp((p - a0) / (a1 - a0));
    const lt = 0.12 + 0.40 * k(0.12, 0.38) + 0.16 * k(0.38, 0.62) + 0.34 * k(0.62, 0.88), ft = w[0] + 3 * w[1] + 8 * w[2];
    const f = level < 0 ? 1 : 1 - Math.exp(-dt / 0.45);
    level = level < 0 ? lt : level + (lt - level) * f; filled = filled < 0 ? ft : filled + (ft - filled) * f;
    for (let i = 0; i < 8; i++) slotA[FILL[i]] = ease(clamp(filled - i));
  }

  function disc(r, at, size, cr, cg, cb, sharp, solid) {
    gl.uniform3f(r.disc.u.uC, at[0], at[1], at[2]); gl.uniform1f(r.disc.u.uSize, size);
    gl.uniform3f(r.disc.u.uCol, cr, cg, cb); gl.uniform2f(r.disc.u.uKind, sharp, solid);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  const carU = new Float32Array(8), at3 = [0, 0, 0], show = [0, 0];

  function draw(st) {
    const r = R;
    if (!r || st.W < 2 || st.H < 2) return;
    const W = st.W, H = st.H, t = st.t, w = st.w, w1 = w[0], w2 = w[1], w3 = w[2];
    if (W !== fitW || H !== fitH) fit(W, H, st.phone);
    // the camera drifts by about a degree, so the depth is felt; the scroll brings it a little nearer
    camera(AZ + 0.02 * Math.sin(t * 0.11), elNow + 0.005 * Math.sin(t * 0.083 + 1.3), DIST * (1 + PUSH * (1 - ease(st.p))));
    mul(VP, proj, view);
    const glow = 0.9 * w1 + 1.15 * w2 + 1.1 * w3, door = 0.1 * w1 + w2 + w3, lamp = ease(clamp(1.25 * (w2 + w3))), in3 = ease(w3);
    const px = 1 / (K * st.dpr);
    show[0] = cars[0].a * ease(clamp((w1 - 0.55) / 0.35)); show[1] = cars[1].a * ease(clamp((w2 - 0.55) / 0.35));   // never both on the road

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(16 / 255, 20 / 255, 26 / 255, 1); gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.BLEND);

    // the model: first the table's shadow (no depth), then everything solid
    let p = r.mesh;
    gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniformMatrix4fv(p.u.uLight, false, light);
    gl.uniform3fv(p.u.uSky, mix3(SKY, w)); gl.uniform3fv(p.u.uKey, mix3(KEYL, w)); gl.uniform3f(p.u.uWarm, WARM[0], WARM[1], WARM[2]);
    gl.uniform3f(p.u.uSun, 2.0 * in3, 1.02 * in3, 0.42 * in3); gl.uniform3f(p.u.uSunDir, SUN_DIR[0], SUN_DIR[1], SUN_DIR[2]);
    gl.uniform3f(p.u.uInk, INK[0], INK[1], INK[2]);
    gl.uniform1f(p.u.uPx, px); gl.uniform1f(p.u.uShTex, 1 / SH); gl.uniform1f(p.u.uSunOn, in3);
    gl.uniform1f(p.u.uGl, glow); gl.uniform1f(p.u.uLit, level); gl.uniform1f(p.u.uDoor, door); gl.uniform1f(p.u.uLamp, lamp);
    gl.uniform3f(p.u.uGL, lit1(GROUND[0].turn, level), lit1(GROUND[1].turn, level), lit1(GROUND[2].turn, level));
    gl.uniform3f(p.u.uGR, lit1(GROUND[3].turn, level), lit1(GROUND[4].turn, level), lit1(GROUND[5].turn, level));
    gl.uniform3fv(p.u.uTree, treeData);
    gl.uniform4f(p.u.uSL, slotA[0], slotA[1], slotA[2], slotA[3]); gl.uniform4f(p.u.uSR, slotA[4], slotA[5], slotA[6], slotA[7]);
    for (let i = 0; i < 2; i++) { carU[i * 4] = cars[i].x; carU[i * 4 + 1] = cars[i].z; carU[i * 4 + 2] = cars[i].c; carU[i * 4 + 3] = cars[i].s; }
    gl.uniform4fv(p.u.uCar, carU);
    gl.uniform2f(p.u.uCarI, show[0] * cars[0].lamp, show[1] * cars[1].lamp); gl.uniform2f(p.u.uCarA, show[0], show[1]);
    gl.uniform3f(p.u.uCast, -hd[0], -hd[2], 0.33 / Math.tan(SE));
    gl.uniform4f(p.u.uMdl, 0, 0, 1, 0); gl.uniform1f(p.u.uAl, 1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, r.shTex); gl.uniform1i(p.u.uShadow, 0);
    bind(p, r.bMesh, 11, L_MESH);
    gl.disable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLES, nStatic, 6);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.drawArrays(gl.TRIANGLES, 0, nStatic);
    // the cars: the parked ones nose to the house, then the two that drive (colour already multiplied by its alpha)
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    for (let i = 0; i < 8; i++) if (slotA[i] > 0.004) {
      gl.uniform4f(p.u.uMdl, (i < 4 ? -1 : 1) * SLOT_X[i % 4], SLOT_Z, 0, -1); gl.uniform1f(p.u.uAl, slotA[i]);
      gl.drawArrays(gl.TRIANGLES, nStatic + 6, nCar);
    }
    for (let i = 0; i < 2; i++) if (show[i] > 0.004) {
      gl.uniform4f(p.u.uMdl, cars[i].x, cars[i].z, cars[i].c, cars[i].s); gl.uniform1f(p.u.uAl, show[i]);
      gl.drawArrays(gl.TRIANGLES, nStatic + 6, nCar);
    }
    unbind(p, L_MESH);

    // from here on: light and air, laid over the model
    gl.depthMask(false); gl.disable(gl.CULL_FACE);

    const stars = w1 + 0.55 * w2 + 0.3 * w3;
    p = r.star; gl.useProgram(p.p);
    gl.uniform4f(p.u.uFrame, CX, CY, 2 * BW / W, 2 * BW / H); gl.uniform3f(p.u.uTDA, t, st.dpr, stars);
    bind(p, r.bStar, 4, L_STAR); gl.drawArrays(gl.POINTS, 0, N_STAR); unbind(p, L_STAR);

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
    gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform4f(p.u.uCol, 0.925, 0.80 + 0.04 * w3, 0.55, 0.26 * w1 + 0.2 * w2 + 0.8 * w3);
    bind(p, r.bCrest, 3, L_POS); gl.drawArrays(gl.LINE_STRIP, 0, CREST.length); unbind(p, L_POS);

    // smoke from the chimneys once the house is lived in
    const smoke = 0.5 * w2 + 0.6 * w3;
    if (smoke > 0.004) {
      p = r.smoke; gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uVP, false, VP); gl.uniform3f(p.u.uR, right[0], right[1], right[2]);
      gl.uniform2f(p.u.uTA, t, smoke); gl.uniform3f(p.u.uTint, 0.80 + 0.1 * w3, 0.84 - 0.06 * w3, 0.88 - 0.26 * w3);
      bind(p, r.bSmoke, 7, L_PART); gl.drawArrays(gl.TRIANGLES, 0, N_SMOKE * 6); unbind(p, L_PART);
    }

    // the driving cars' lamps: two in front, two red ones behind
    p = r.disc; gl.useProgram(p.p); bind(p, r.bDisc, 2, L_DISC);
    for (let i = 0; i < 2; i++) {
      const c = cars[i], a = show[i] * c.lamp;
      if (a < 0.004) continue;
      for (let side = -1; side <= 1; side += 2) {
        at3[0] = c.x + c.c * 0.665 - c.s * 0.19 * side; at3[1] = 0.19; at3[2] = c.z + c.s * 0.665 + c.c * 0.19 * side;
        disc(r, at3, 0.34, 0.5 * a, 0.42 * a, 0.28 * a, 0, 0); disc(r, at3, 0.04, a, 0.9 * a, 0.7 * a, 1, a);
        at3[0] = c.x - c.c * 0.665 - c.s * 0.2 * side; at3[2] = c.z - c.s * 0.665 + c.c * 0.2 * side;
        disc(r, at3, 0.2, 0.42 * a, 0.07 * a, 0.03 * a, 0, 0); disc(r, at3, 0.032, 0.85 * a, 0.2 * a, 0.1 * a, 1, a);
      }
    }
    // a breath of glow in the air in front of the entrance, and the sun's glare over the ridge
    gl.disable(gl.DEPTH_TEST);
    v3[0] = 0; v3[1] = 0.9; v3[2] = 0.6;
    const air = glow * (0.035 + 0.035 * door + 0.03 * level);
    disc(r, v3, 6.0, 0.925 * air, 0.729 * air, 0.408 * air, 0, 0);
    if (w3 > 0.004) disc(r, sunAt, 4.6, 0.925 * 0.11 * w3, 0.729 * 0.11 * w3, 0.408 * 0.11 * w3, 0, 0);
    unbind(p, L_DISC);
    gl.depthMask(true);
  }

  // ---- loop: only while the section is on screen. The scroll gives the station and the copy
  // (the same timing as the Bergfahrt, so both pages feel alike), time moves the actors
  const STATIONS = [0, 0.5, 1], BUDGET = 3.4e6;   // canvas pixels
  const W3 = [1, 0, 0], state = { W: 0, H: 0, dpr: 1, t: 0, p: 0, w: W3, phone: false };
  let running = false, failed = false, last = -1, lastW = -1, lastH = -1, before = 0, time = 0;
  function frame(now) {
    if (!running || failed) return;
    requestAnimationFrame(frame);
    if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) {
      lastW = canvas.clientWidth; lastH = canvas.clientHeight;
      state.W = lastW; state.H = lastH; state.phone = lastW < 768;
      state.dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(BUDGET / Math.max(1, lastW * lastH)));
      canvas.width = Math.round(lastW * state.dpr); canvas.height = Math.round(lastH * state.dpr);
    }
    const r = ride.getBoundingClientRect();
    // the pin range: the stage's height, not innerHeight, which jumps as a phone's toolbar hides
    // the stage pins at its sticky top (the band sits in the middle of the screen)
    const p = Math.min(1, Math.max(0, ((parseFloat(getComputedStyle(stage).top) || 0) - r.top) / (r.height - stage.offsetHeight)));
    const k = (a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
    if (Math.abs(p - last) > 0.0004) {
      last = p;
      const show = [1 - k(0.12, 0.24), k(0.26, 0.38) * (1 - k(0.62, 0.74)), k(0.76, 0.88)];
      items.forEach((li, i) => {
        const o = show[i], y = p < STATIONS[i] ? (1 - o) * 1.2 : -(1 - o) * 0.6;
        li.style.opacity = o.toFixed(3);
        li.style.transform = o < 1 ? `translateY(${y.toFixed(2)}rem)` : '';
        li.style.visibility = o > 0.005 ? 'visible' : 'hidden';
        li.classList.toggle('is-active', o >= 0.5);
      });
      ride.classList.toggle('ride--top', p > 0.9);
    }
    // the picture's stations: 1 until p 0.24 or so, 2 in the middle, 3 from about 0.76, blended in between
    const f12 = ease(k(0.12, 0.38)), f23 = ease(k(0.62, 0.88));
    W3[0] = 1 - f12; W3[1] = f12 * (1 - f23); W3[2] = f23;
    const dt = Math.min(0.1, Math.max(0, (now - before) / 1000));
    before = now; time += dt;
    state.t = time; state.p = p;
    try { act(dt, W3, p); draw(state); } catch (err) { failed = true; if (window.console) console.warn(err.message || err); }   // stop quietly
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; before = performance.now(); requestAnimationFrame(frame); }
    else if (!e.isIntersecting) running = false;
  }).observe(ride);
})();
