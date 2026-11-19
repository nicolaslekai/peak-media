/* ============ BLAUE STUNDE — font lab (TEMPORARY, preview branch only) ============
   Nicky (2026-11-19): "let's use more modern fonts across the whole page", and he does not
   vote in polls. So the headline fonts can be tried on the real pages: a small bar at the
   bottom switches the headline font everywhere and remembers the choice (localStorage).
   The candidates load from Google Fonts, which is fine for the preview and NOT for the live
   site (the live fonts are self-hosted): this file and its <script> tags come out before
   anything goes to origin/main, and the chosen font gets self-hosted.
   ================================================================================= */
(() => {
  // number, name, Google Fonts family, weight, letter-spacing, serif?
  const OPTS = [
    ['1', 'Cormorant (jetzt)', null],
    ['2', 'Fraunces', 'Fraunces:opsz,wght@9..144,300..600', 400, '-0.02em', true],
    ['3', 'Bodoni Moda', 'Bodoni+Moda:opsz,wght@6..96,400..600', 400, '-0.01em', true],
    ['4', 'Syne', 'Syne:wght@500;600;700', 600, '-0.03em', false],
    ['5', 'Space Grotesk', 'Space+Grotesk:wght@400;500', 500, '-0.035em', false],
    ['6', 'Plus Jakarta Sans', 'Plus+Jakarta+Sans:wght@500;600', 600, '-0.035em', false],
    ['7', 'Hanken Grotesk', 'Hanken+Grotesk:wght@300;400', 300, '-0.03em', false],
    ['8', 'Bebas Neue', 'Bebas+Neue', 400, '0.01em', true],
  ];
  const KEY = 'bs-fontlab';
  const style = document.createElement('style');
  document.head.append(style);
  let link = null;

  const bar = document.createElement('div');
  bar.className = 'fontlab';
  bar.innerHTML = '<span class="fontlab__label">Schrift</span>' +
    OPTS.map(o => `<button type="button" data-n="${o[0]}" title="${o[1]}">${o[0]}</button>`).join('') +
    '<span class="fontlab__name"></span><button type="button" class="fontlab__x" aria-label="Leiste ausblenden">×</button>';
  const css = document.createElement('style');
  css.textContent = `
    .fontlab{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:4px;
      padding:6px 8px 6px 14px;border:1px solid rgba(209,168,81,.45);border-radius:999px;background:rgba(16,20,26,.92);
      backdrop-filter:blur(8px);font:500 12px/1 "Manrope",system-ui,sans-serif;color:#F3EDE1;white-space:nowrap;max-width:calc(100vw - 20px)}
    .fontlab__label{letter-spacing:.2em;text-transform:uppercase;font-size:10px;color:#D1A851;margin-right:6px}
    .fontlab button{width:26px;height:26px;border:0;border-radius:50%;background:none;color:inherit;font:inherit;cursor:pointer}
    .fontlab button[aria-pressed="true"]{background:#D1A851;color:#10141A;font-weight:700}
    .fontlab__name{margin:0 6px;color:rgba(243,237,225,.7)}
    .fontlab .fontlab__x{color:rgba(243,237,225,.5);font-size:16px}
    @media (max-width:560px){.fontlab__name{display:none}.fontlab{padding-left:10px}.fontlab__label{margin-right:2px}}`;
  document.head.append(css);
  document.body.append(bar);
  const name = bar.querySelector('.fontlab__name');

  function apply(n) {
    const o = OPTS.find(x => x[0] === n) || OPTS[0];
    if (link) { link.remove(); link = null; }
    if (!o[2]) {
      style.textContent = '';
    } else {
      link = Object.assign(document.createElement('link'), {
        rel: 'stylesheet',
        href: `https://fonts.googleapis.com/css2?family=${o[2]}&display=swap`,
      });
      document.head.append(link);
      style.textContent = `:root{--serif:"${o[1]}",system-ui,sans-serif}` +
        `h1,h2,h3,.chain__big{font-weight:${o[3]};letter-spacing:${o[4]};font-size-adjust:${o[5] ? 'none' : '0.445'}` +
        (o[1] === 'Bebas Neue' ? ';text-transform:uppercase;line-height:.95' : '') + '}.tools__note{font-style:normal}';
    }
    name.textContent = o[1];
    bar.querySelectorAll('button[data-n]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.n === o[0])));
    try { localStorage.setItem(KEY, o[0]); } catch { /* storage blocked: the choice lasts for this page */ }
  }
  bar.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('fontlab__x')) { bar.remove(); return; }
    apply(b.dataset.n);
  });
  let saved = '1';
  try { saved = localStorage.getItem(KEY) || '1'; } catch { /* default */ }
  apply(saved);
})();
