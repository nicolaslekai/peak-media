/* ============ BLAUE STUNDE — canvas frame-sequence scroll engine ============
   The smooth "3D scroll" technique: numbered WebP frames painted onto a <canvas>,
   the frame matched to scroll progress. No <video> seeking = no jank.
   Loading and memory (P1, P2, P10): every frame is fetched once and kept compressed
   (~300 KB); only a window of frames around the playhead is decoded (~8 MB each),
   off the main thread, and released again when the playhead moves on. The scene on
   screen loads first, a scene within one screen next, the rest waits; each scene
   loads coarse to fine, so its scrub works after a few frames.
   ============================================================================ */

// Phones cap decoded-image memory, so serve a lighter frame set there.
const IS_MOBILE = window.matchMedia('(max-width: 767px)').matches;
// focalX: the horizontal point kept in view when phones crop the frame's sides
const frameCfg = (section, name, bg, focalX = 0.5) => {
  const dir = IS_MOBILE ? `assets/framesm/${name}` : `assets/frames/${name}`;
  const frameCount = IS_MOBILE ? 60 : 120;
  return { section, frameCount, bg, focalX, path: i => `${dir}/frame_${String(i).padStart(4, '0')}.webp` };
};
const SCRUB_SECTIONS = [
  frameCfg('#hero', 'hero', '#0c0e0d', 0.62),   // keep the sun + pool in frame
  frameCfg('#scene-spa', 'spa', '#0a0c12'),
  frameCfg('#scene-ski', 'skilift', '#0c0e0d'),
];
const WINDOW = IS_MOBILE ? 10 : 8;   // decoded frames kept on each side of the playhead
const MAX_FETCH = 6, MAX_DECODE = 3;

function smoothstep(a, b, x) {
  if (a === b) return x < a ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// one fetch queue for all scenes: the scene on screen first, then a scene within one
// screen of the viewport; scenes further away are not loaded yet
// The very first frame goes alone, so it does not share the bandwidth with others.
const loader = { scenes: [], active: 0, started: false };
function pump() {
  while (loader.active < (loader.started ? MAX_FETCH : 1)) {
    const s = loader.scenes.find(x => x.visible && x.queue.length) || loader.scenes.find(x => x.near && x.queue.length);
    if (!s) return;
    loader.active++;
    s.fetchFrame(s.queue.shift()).finally(() => { loader.active--; pump(); });
  }
}
// first and last frame, then every 16th, 8th, 4th, … frame
function coarseToFine(n) {
  const order = [0, n - 1], seen = new Set(order);
  for (let step = 16; step >= 1; step >>= 1)
    for (let i = 0; i < n; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  return order;
}
// decode off the main thread; an <img> where createImageBitmap is missing (old Safari)
const decodeBlob = blob => window.createImageBitmap ? createImageBitmap(blob) : new Promise((ok, fail) => {
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(img.src); ok(img); };
  img.onerror = fail;
  img.src = URL.createObjectURL(blob);
});

function initScrub(cfg, wake) {
  const section = document.querySelector(cfg.section);
  if (!section) return null;
  const canvas = section.querySelector('canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { alpha: false });
  const lines = [...section.querySelectorAll('.cine-line')];
  const bg = cfg.bg;
  const n = cfg.frameCount;
  const blobs = new Array(n).fill(null);   // compressed frames, kept once loaded
  const frames = new Map();                // frame index → decoded frame (the window only)
  const decoding = new Set(), failed = new Set();
  const entry = [0, n - 1];                // stay decoded while the scene is near, so it
  let center = 0;                          // shows at once from either side
  let dirty = false;                       // a frame arrived: paint again

  const scene = {
    visible: false, near: false, queue: coarseToFine(n),
    fetchFrame(i) {
      return fetch(cfg.path(i + 1), i === 0 ? { priority: 'high' } : undefined)
        .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.url}`); return r.blob(); })
        .then(b => { blobs[i] = b; refill(); })
        .finally(() => { loader.started = true; })
        .catch(() => {   // one retry, then the scrub uses the nearest frame (T5)
          if (failed.has(i)) return;
          failed.add(i);
          setTimeout(() => { scene.queue.push(i); pump(); }, 1000);
        });
    },
  };

  // on screen: decode the frames around the playhead (nearest first); near: only the
  // entry frames; everything else is released
  function refill() {
    const c = Math.round(center), lo = c - WINDOW, hi = c + WINDOW;
    const keep = i => (scene.visible && i >= lo && i <= hi) || (scene.near && entry.includes(i));
    for (const [i, f] of frames) if (!keep(i)) { if (f.close) f.close(); frames.delete(i); }
    if (!scene.near) return;
    const want = [];
    if (scene.visible) for (let d = 0; d <= WINDOW; d++) want.push(c + d, c - d);
    want.push(...entry);
    for (const i of want) {
      if (decoding.size >= MAX_DECODE) break;
      if (i < 0 || i >= n || !blobs[i] || frames.has(i) || decoding.has(i)) continue;
      decoding.add(i);
      decodeBlob(blobs[i]).then(f => {
        decoding.delete(i);
        if (keep(i)) { frames.set(i, f); dirty = true; wake(); }
        else if (f.close) f.close();
        refill();
      }, () => decoding.delete(i));
    }
  }

  // the nearest decoded frame stands in while the window is still decoding
  function nearest(i) {
    for (let d = 0; d < n; d++) {
      if (frames.has(i - d)) return i - d;
      if (frames.has(i + d)) return i + d;
    }
    return -1;
  }

  // draw() takes a FLOAT frame position and cross-blends the two neighbouring
  // frames by the fraction — the scrub has no visible stepping between frames.
  function draw(pos) {
    const i0 = Math.max(0, Math.min(n - 1, Math.floor(pos)));
    const f = Math.min(1, Math.max(0, pos - i0));
    const k = nearest(i0);
    if (k < 0) return false;
    const base = frames.get(k);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const ir = base.width / base.height, cr = cw / ch;
    let dw, dh, dx, dy;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
    // cover the whole canvas; on phones (full-height portrait stage, so the frame is
    // cropped hard) the scene's focal point stays in view instead of the centre
    if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) * (IS_MOBILE ? cfg.focalX : 0.5); dy = 0; }
    else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    ctx.drawImage(base, dx, dy, dw, dh);
    const nxt = k === i0 && frames.get(i0 + 1);
    if (f > 0.01 && nxt) {
      ctx.globalAlpha = f;
      ctx.drawImage(nxt, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    }
    return true;
  }
  let cssW = 0, cssH = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = canvas.clientWidth; cssH = canvas.clientHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(drawn < 0 ? 0 : drawn);
  }
  let shown = -1;   // float frame position on screen
  let drawn = -1;   // float position of the last paint
  let lastP = -1, lastTarget = -1, rest = 0;
  // returns true while the scrub is still easing toward the scroll position
  function update() {
    // if the canvas box changed size (viewport/toolbar/orientation), re-sync the backing buffer to avoid stretch
    if (canvas.clientWidth !== cssW || canvas.clientHeight !== cssH) resize();
    const rect = section.getBoundingClientRect();
    if (rect.bottom < -window.innerHeight || rect.top > window.innerHeight) return false;
    const scrollable = rect.height - window.innerHeight;
    const p = Math.min(Math.max(-rect.top / scrollable, 0), 1);
    const target = p * (n - 1);
    // the frame follows the scroll directly (Lenis already smooths it; a second easing
    // made the image trail and drift after the scroll stopped, P10). Once the scroll
    // rests, the image settles on the nearest whole frame: a still picture is one sharp
    // frame, never a blend of two
    // at rest = Lenis has stopped (its slow tail must not count as rest, or the image
    // flickers between a blend and a whole frame); without Lenis: the target holds
    const still = window.lenis ? !window.lenis.isScrolling : Math.abs(target - lastTarget) < 0.001;
    rest = still ? rest + 1 : 0;
    lastTarget = target;
    const goal = rest > 2 ? Math.round(target) : target;
    if (shown < 0 || rest <= 2) shown = goal;
    else shown += (goal - shown) * 0.3;
    if (Math.abs(goal - shown) < 0.002) shown = goal;
    if (Math.round(shown) !== Math.round(center)) { center = shown; refill(); }
    if ((dirty || Math.abs(shown - drawn) > 0.002) && draw(shown)) { drawn = shown; dirty = false; }
    // no hand-off effect: the sticky stage stays put until the section ends and then
    // scrolls off with it, so the image edge is the section edge (no black band)
    // trapezoidal caption fade: in early, hold, out late — wide bands + a short
    // travel distance keep the text drifting gently instead of popping
    if (p !== lastP) {
      lastP = p;
      for (const el of lines) {
        const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
        const fade = 0.16;
        const o = smoothstep(a, a + fade, p) * (1 - smoothstep(b - fade, b, p));
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translateY(${((1 - o) * 24).toFixed(1)}px)`;
      }
    }
    return shown !== goal || rest <= 2;
  }
  window.addEventListener('resize', resize);
  resize();

  // near = within one screen of the viewport: load and keep the entry frames decoded;
  // further away the decoded frames are released (the compressed ones stay)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { scene.near = e.isIntersecting; refill(); pump(); }, { rootMargin: '100% 0px' }).observe(section);
    new IntersectionObserver(([e]) => { scene.visible = e.isIntersecting; refill(); pump(); wake(); }).observe(section);
  } else {
    scene.near = scene.visible = true;
  }
  loader.scenes.push(scene);
  pump();
  return { update, resize };
}

function __boot() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = false, quiet = 0;
  function wake() {
    quiet = 0;
    if (!running) { running = true; requestAnimationFrame(raf); }
  }

  // each part is isolated (T1): a broken scene must not stop the others, the scroll
  // or the anchor links
  const scrubs = SCRUB_SECTIONS.map(cfg => {
    try { return initScrub(cfg, wake); } catch (err) { console.error(err); return null; }
  }).filter(Boolean);

  /* Lenis smooth scroll — also drives the canvas update loop */
  let lenis = null;
  if (window.Lenis && !reduce) {
    try {
      lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9 });
      window.lenis = lenis;
      // a scroll started from code must wake the sleeping loop too, or Lenis never moves
      const scrollTo = lenis.scrollTo.bind(lenis);
      lenis.scrollTo = (...args) => { scrollTo(...args); wake(); };
    } catch (err) { console.error(err); }   // native scrolling still works
  }
  const updateAll = () => {
    let busy = false;
    for (const s of scrubs) {
      if (s.failed) continue;
      try { busy = s.update() || busy; } catch (err) { s.failed = true; console.error(err); }   // report once, keep the loop
    }
    return busy;
  };
  // the loop runs only while something moves (P3): Lenis scrolling or a scrub easing.
  // After half a second of stillness it sleeps; any input, scroll, resize or newly
  // decoded frame wakes it again.
  function raf(t) {
    if (lenis) lenis.raf(t);
    const busy = updateAll() || (lenis && (lenis.isScrolling || lenis.animate.isRunning));
    quiet = busy ? 0 : quiet + 1;
    if (quiet > 30) { running = false; return; }
    requestAnimationFrame(raf);
  }
  for (const type of ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown', 'scroll', 'resize'])
    window.addEventListener(type, wake, { passive: true });
  wake();
  // NOTE: the rAF loop is the SOLE driver of the frame interpolation — do not also call
  // updateAll() on scroll events, or the lerp advances several times per frame and jitters.

  /* nav bg + scroll cue */
  const nav = document.getElementById('nav');
  const cue = document.querySelector('.hero__cue');
  const onScroll = (y) => {
    if (nav) nav.classList.toggle('scrolled', y > 60);
    if (cue) cue.classList.toggle('is-gone', y > 80);
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  onScroll(0);

  /* the endless CSS animations (scroll cue, regions marquee, swipe cue) pause while off
     screen: they kept the main thread busy on an idle page (P3) */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { for (const e of es) e.target.classList.toggle('is-offscreen', !e.isIntersecting); });
    document.querySelectorAll('.hero__cue, .regions ul, .phones__hint').forEach(el => io.observe(el));
  }

  /* smooth anchor links */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href === '#') { e.preventDefault(); return; }   // placeholder link (F5): no jump, no error
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      // a section lands on its header (kicker first), clear of the fixed nav: the gap is the
      // header's scroll-margin-top in style.css, which Lenis does not read by itself
      const goal = el.querySelector(':scope > header') || el;
      const gap = parseFloat(getComputedStyle(goal).scrollMarginTop) || 0;
      if (!lenis) { goal.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
      const dest = goal.getBoundingClientRect().top + lenis.animatedScroll - gap;
      const dist = dest - lenis.animatedScroll;
      const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      // soft jump (D-45): up to two screens glide; a longer way is skipped under a short
      // dark veil (no rushing through every scene), then the last two screens glide in
      const glide = window.innerHeight * 2;
      const land = () => lenis.scrollTo(dest, {
        duration: 0.8 + 0.8 * Math.min(1, Math.abs(dist) / glide),
        easing: inOut,
      });
      if (Math.abs(dist) <= glide) { land(); return; }
      const cut = () => lenis.scrollTo(dest - Math.sign(dist) * glide, { immediate: true });
      veil(() => { cut(); land(); });
    });
  });
}

// the dark veil of a long jump (.jump-veil in style.css): fades in, the page moves
// underneath at full dark, then it lifts while the last stretch glides
function veil(atDark) {
  let v = document.querySelector('.jump-veil');
  if (!v) {
    v = document.createElement('div');
    v.className = 'jump-veil';
    document.body.append(v);
  }
  requestAnimationFrame(() => v.classList.add('jump-veil--on'));
  setTimeout(() => { atDark(); v.classList.remove('jump-veil--on'); }, 200);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __boot);
else __boot();
