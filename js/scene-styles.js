/* ============ BLAUE STUNDE — style lab: one scene in several styles, to choose from ============
   Temporary (Nicky, 2026-11-19: "try four different styles underneath each other, label them
   one, two, three, four"). Each style is its own file (js/styles/<scene>-<n>.js) and registers
   a renderer here; this file builds one band per style in <div class="stylelab__list">, sizes
   its canvas and runs it while it is on screen. The bands are not pinned: the three stations
   of the scene (the <ol class="chain"> on the page) take turns every few seconds.

   A style registers itself with
     SceneStyles.register({ id: 2, label: 'Tusche', create(canvas) { return { draw(state) {} } } })
   create() gets an empty <canvas> and takes whatever context it wants (2d or webgl).
   draw(state) is called for every picture with
     state.W, state.H   size of the band in CSS px (the canvas is W*dpr by H*dpr device px,
                        already set; a 2d style starts with ctx.setTransform(dpr,0,0,dpr,0,0))
     state.dpr          device pixels per CSS px
     state.t            seconds, for what moves with time (water, steam, rain)
     state.w            [w1, w2, w3]: how much of station 1, 2, 3 shows (0..1, they sum to 1)
     state.phone        true below 768px
   Where the picture goes: on wide screens its middle at about 70 % of the width and 50 % of
   the height, at most half the width wide; the left 40 % stays calm, the copy stands there.
   On phones its middle at 50 % / 36 %, at most 60 % of the height; the copy is at the bottom.
   The band's background is the page's ink (#10141A).

   For screenshots: ?stil=2 jumps to that band, &station=1|2|3 holds that station.
   Own file: an error here cannot stop the scroll engine.
   ============================================================================================== */
(() => {
  const list = document.querySelector('.stylelab__list');
  const api = window.SceneStyles = { register };
  if (!list) return;
  const params = new URLSearchParams(location.search);
  const only = parseInt(params.get('stil'), 10) || 0, hold = (parseInt(params.get('station'), 10) || 0) - 1;
  const stations = [...document.querySelectorAll('.chain > li')].slice(0, 3).map(li => ({
    name: (li.querySelector('h3') || {}).textContent || '',
    big: (li.querySelector('.chain__big') || {}).textContent || '',
  }));
  const ease = u => u * u * (3 - 2 * u);
  const HOLD = 4.6, FADE = 1.3, PERIOD = HOLD + FADE;
  const BUDGET = 3.4e6;

  function register(style) {
    const band = document.createElement('div');
    band.className = 'stylelab__band';
    band.dataset.stil = style.id;
    band.innerHTML = `<p class="stylelab__tag"><b>${style.id}</b><span>${style.label}</span></p>` +
      '<canvas aria-hidden="true"></canvas><div class="stylelab__copy"><p class="kicker"></p><p class="stylelab__big"></p></div>';
    const after = [...list.children].find(b => Number(b.dataset.stil) > style.id);
    list.insertBefore(band, after || null);
    const canvas = band.querySelector('canvas'), kicker = band.querySelector('.kicker'), big = band.querySelector('.stylelab__big');
    let view = null, failed = false;
    try { view = style.create(canvas); } catch (err) { failed = true; console.error('style', style.id, err); }

    let running = false, shown = -1, W = 0, H = 0, dpr = 1;
    function frame(now) {
      if (!running || failed) return;
      requestAnimationFrame(frame);
      const t = now / 1000;
      if (canvas.clientWidth !== W || canvas.clientHeight !== H) {
        W = canvas.clientWidth; H = canvas.clientHeight;
        dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(BUDGET / Math.max(1, W * H)));
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      }
      // the stations take turns: hold one, then blend into the next
      const w = [0, 0, 0];
      let s;
      if (hold >= 0 && hold < 3) { s = hold; w[s] = 1; }
      else {
        const u = (t + style.id * 0.7) % (PERIOD * 3), i = Math.floor(u / PERIOD), f = ease(Math.max(0, (u - i * PERIOD - HOLD) / FADE));
        w[i] = 1 - f; w[(i + 1) % 3] = f; s = f > 0.5 ? (i + 1) % 3 : i;
      }
      if (s !== shown && stations[s]) { shown = s; kicker.textContent = `0${s + 1} · ${stations[s].name}`; big.textContent = stations[s].big; }
      try { view.draw({ W, H, dpr, t, w, phone: W < 768 }); } catch (err) { failed = true; console.error('style', style.id, err); }
    }
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
      else if (!e.isIntersecting) running = false;
    }).observe(band);
    if (only === style.id) setTimeout(() => {
      const y = band.getBoundingClientRect().top + scrollY - (innerHeight - band.offsetHeight) / 2;
      if (window.lenis) lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
    }, 600);
  }
})();
