/* ============ PEAK STORIES — canvas frame-sequence scroll engine ============
   The smooth "3D scroll" technique: preload numbered JPGs and paint the frame
   matched to scroll progress onto a <canvas>. No <video> seeking = no jank.
   ============================================================================ */

// Phones cap decoded-image memory, so serve a lighter frame set there.
const IS_MOBILE = window.matchMedia('(max-width: 767px)').matches;
const frameCfg = (section, name, bg, focalX = 0.5, focalY = 0.5) => {
  const dir = IS_MOBILE ? `assets/framesm/${name}` : `assets/frames/${name}`;
  const frameCount = IS_MOBILE ? 60 : 120;
  return { section, frameCount, bg, focalX, focalY, path: i => `${dir}/frame_${String(i).padStart(4, '0')}.webp` };
};
const SCRUB_SECTIONS = [
  frameCfg('#hero', 'hero', '#0c0e0d', 0.62, 0.5),      // keep the sun + pool in frame
  frameCfg('#scene-spa', 'spa', '#0a0c12', 0.5, 0.42),  // keep the starry window in frame
  frameCfg('#scene-ski', 'skilift', '#0c0e0d', 0.5, 0.5),
];

function smoothstep(a, b, x) {
  if (a === b) return x < a ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const TAIL_FRAMES = 8;   // last N frames double as the hand-off into the next section

function initScrub(cfg) {
  const section = document.querySelector(cfg.section);
  if (!section) return null;
  const canvas = section.querySelector('canvas');
  const stage = section.querySelector('.cine__stage');
  const ctx = canvas.getContext('2d', { alpha: false });
  const lines = [...section.querySelectorAll('.cine-line')];
  const bg = cfg.bg || '#0c0e0d';
  const images = [];
  let firstDrawn = false;
  const tailStart = (cfg.frameCount - TAIL_FRAMES) / (cfg.frameCount - 1);

  for (let i = 0; i < cfg.frameCount; i++) {
    const img = new Image();
    img.decoding = 'async';
    img.src = cfg.path(i + 1);
    img.onload = () => { if (!firstDrawn) { firstDrawn = true; draw(0); } };
    images[i] = img;
  }

  // draw() takes a FLOAT frame position and cross-blends the two neighbouring
  // frames by the fraction — the scrub has no visible stepping between frames.
  function draw(pos) {
    const i0 = Math.max(0, Math.min(cfg.frameCount - 1, Math.floor(pos)));
    const f = Math.min(1, Math.max(0, pos - i0));
    const base = images[i0];
    if (!base || !base.complete || !base.naturalWidth) return false;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const ir = base.naturalWidth / base.naturalHeight, cr = cw / ch;
    let dw, dh, dx, dy;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
    ctx.save();
    if (IS_MOBILE) {
      // taller crop, centered, caption overlaid — fills more of the phone, smaller bands
      const boxH = Math.min(ch, cw * 1.4), boxY = (ch - boxH) / 2;
      dh = boxH; dw = boxH * ir; dx = (cw - dw) * (cfg.focalX ?? 0.5); dy = boxY;
      ctx.beginPath(); ctx.rect(0, boxY, cw, boxH); ctx.clip();
    } else if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
    else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    ctx.drawImage(base, dx, dy, dw, dh);
    const nxt = images[i0 + 1];
    if (f > 0.01 && nxt && nxt.complete && nxt.naturalWidth) {
      ctx.globalAlpha = f;
      ctx.drawImage(nxt, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
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
  let shown = -1;   // interpolated (float) frame position, eased toward the scroll target
  let drawn = -1;   // float position of the last successful paint
  function update() {
    // if the canvas box changed size (viewport/toolbar/orientation), re-sync the backing buffer to avoid stretch
    if (canvas.clientWidth !== cssW || canvas.clientHeight !== cssH) resize();
    const rect = section.getBoundingClientRect();
    if (rect.bottom < -window.innerHeight || rect.top > window.innerHeight) return;
    const scrollable = rect.height - window.innerHeight;
    const p = Math.min(Math.max(-rect.top / scrollable, 0), 1);
    const target = p * (cfg.frameCount - 1);
    if (shown < 0) shown = target;
    shown += (target - shown) * 0.15;                 // ease toward target = smooth, jerk-free scrub
    if (Math.abs(target - shown) < 0.002) shown = target;
    if (Math.abs(shown - drawn) > 0.002 && draw(shown)) drawn = shown;
    if (stage && !IS_MOBILE) {
      // desktop: gentle parallax lift at the very end — the image stays visible while the
      // next section slides up behind it, so there's never a black hole in the hand-off.
      // mobile skips this — the stage is exactly the 4:5 crop and scrolls off naturally.
      const t = p > tailStart ? (p - tailStart) / (1 - tailStart) : 0;
      const e = t * t * (3 - 2 * t);
      stage.style.transform = t > 0 ? `translate3d(0,${(-e * window.innerHeight * 0.22).toFixed(1)}px,0)` : '';
      stage.style.opacity = t > 0 ? (1 - e * 0.4).toFixed(3) : '';
    }
    // trapezoidal caption fade: in early, hold, out late — wide bands + a short
    // travel distance keep the text drifting gently instead of popping
    for (const el of lines) {
      const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
      const fade = 0.16;
      const o = smoothstep(a, a + fade, p) * (1 - smoothstep(b - fade, b, p));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${((1 - o) * 24).toFixed(1)}px)`;
    }
  }
  window.addEventListener('resize', resize);
  resize();
  return { update, resize };
}

function __boot() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scrubs = SCRUB_SECTIONS.map(initScrub).filter(Boolean);

  /* Lenis smooth scroll — also drives the canvas update loop */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9 });
    window.lenis = lenis;
  }
  const updateAll = () => { for (const s of scrubs) s.update(); };
  function raf(t) {
    if (lenis) lenis.raf(t);
    updateAll();
    requestAnimationFrame(raf);   // always keep the loop alive
  }
  requestAnimationFrame(raf);
  // NOTE: the rAF loop is the SOLE driver of the frame interpolation — do not also call
  // updateAll() on scroll events, or the lerp advances several times per frame and jitters.

  /* nav bg + scroll cue */
  const nav = document.getElementById('nav');
  const onScroll = (y) => {
    nav.classList.toggle('scrolled', y > 60);
    document.querySelectorAll('.hero__cue').forEach(h => h.style.opacity = y > 80 ? '0' : '');
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  onScroll(0);

  /* smooth anchor links */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { duration: 1.3 });
      else el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* reveals + counters */
  if (reduce) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    document.querySelectorAll('[data-count]').forEach(animateCount);
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        if (en.target.hasAttribute('data-count')) animateCount(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.reveal, [data-count]').forEach((el, i) => {
      if (el.classList.contains('reveal')) el.style.transitionDelay = (i % 4) * 0.06 + 's';
      io.observe(el);
    });
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __boot);
else __boot();

function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.dec || '0', 10);
  const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
  const dur = 1600, t0 = performance.now();
  const de = (v) => v.toFixed(dec).replace('.', ',');   // German decimal comma
  function step(now) {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = pre + de(target * e) + suf;
    if (k < 1) requestAnimationFrame(step);
    else el.textContent = pre + de(target) + suf;
  }
  requestAnimationFrame(step);
}
