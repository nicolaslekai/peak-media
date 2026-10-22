/* ============ BLAUE STUNDE — enquiry form ============
   On the Kontakt page (kontakt/), one form for the whole site in three steps (D-74):
   the business type, a few one-click questions for that type, contact. Shows one step
   at a time and only the questions of the chosen type, validates each step in German,
   takes over ?typ= from a segment page and the calculator values ("Mit diesen Werten
   anfragen") and confirms with a dialog. Delivery is not set up yet (D-04): while
   ENDPOINT is empty nothing is sent and the dialog says so. Without JS every step shows
   at once. Own file, like evidence.js: an error here cannot stop the scroll engine.
   ===================================================== */
(() => {
  const form = document.getElementById('enquiry');
  if (!form) return;

  // form service or function URL, set once hosting and mail exist (D-04)
  const ENDPOINT = '';

  const steps = [...form.querySelectorAll('.wizard__step')];
  const marks = [...form.querySelectorAll('.wizard__progress li')];
  const groups = [...form.querySelectorAll('.contact__extra')];
  const calcNote = form.querySelector('.contact__calc');
  const error = form.querySelector('.contact__error');
  const dialog = document.getElementById('enquiry-sent');
  const type = () => form.elements.betriebsart.value;
  // each step is checked on "Weiter", so the browser's own check on submit stays off
  form.noValidate = true;

  // only the questions of the chosen type are visible; the others are disabled
  // <fieldset>s, so their answers are neither validated nor sent
  const showGroup = () => {
    for (const g of groups) g.hidden = g.disabled = g.dataset.for !== type();
  };

  let current = 0;
  const show = (i, focus = true) => {
    current = i;
    steps.forEach((s, k) => { s.hidden = k !== i; });
    marks.forEach((m, k) => {
      m.classList.toggle('is-done', k < i);
      if (k === i) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
    });
    if (focus) {
      const title = steps[i].querySelector('.wizard__title');
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
      const top = form.getBoundingClientRect().top + scrollY - 120;
      if (scrollY > top) (window.lenis ? lenis.scrollTo(top) : scrollTo({ top, behavior: 'smooth' }));
    }
  };

  // validation messages in German instead of the browser's language (A3)
  const message = el => {
    const v = el.validity;
    if (v.valueMissing) return el.type === 'radio' ? 'Bitte wählen Sie eine Option.' : 'Bitte füllen Sie dieses Feld aus.';
    if (v.typeMismatch || v.patternMismatch) return 'Bitte geben Sie eine gültige E-Mail-Adresse ein, z. B. name@hotel.de.';
    return '';
  };
  // (a radio group reports on its first radio: choosing any radio clears the whole group)
  const peers = el => el.type === 'radio' ? form.querySelectorAll(`input[name="${el.name}"]`) : [el];
  for (const el of form.querySelectorAll('input, textarea')) {
    el.addEventListener('invalid', () => el.setCustomValidity(message(el)));
    el.addEventListener('input', () => el.setCustomValidity(''));
    el.addEventListener('change', () => { for (const p of peers(el)) p.setCustomValidity(''); });
  }
  // the first invalid field of a step reports itself; true when the step is complete
  const valid = step => {
    const bad = [...step.querySelectorAll('input, textarea')].find(el => !el.disabled && !el.checkValidity());
    if (bad) { bad.reportValidity(); return false; }
    return true;
  };

  form.addEventListener('click', e => {
    if (e.target.closest('[data-next]') && valid(steps[current])) show(current + 1);
    if (e.target.closest('[data-back]')) show(current - 1);
  });
  // choosing the type is the whole first step: on to the questions at once. On click, not
  // change: after "Zurück", a click on the card already chosen fires no change
  form.addEventListener('click', e => {
    if (e.target.name !== 'betriebsart') return;
    showGroup();
    // pointer only (detail > 0): arrow keys also "click" radios, and keyboard users
    // move through the cards first and go on with "Weiter"
    if (current === 0 && e.detail > 0) setTimeout(() => show(1), 180);   // the card lights up first
  });

  // the size questions are ranges: a calculator number picks the first option whose
  // data-max covers it, the last option ("über …") takes the rest
  const pickRange = (name, n) => {
    const opts = [...form.querySelectorAll(`input[name="${name}"]`)];
    const o = opts.find(x => n <= Number(x.dataset.max)) || opts[opts.length - 1];
    if (o) o.checked = true;
  };

  // the page is opened with ?typ=hotel|bergbahn|therme from a segment page or the
  // calculator: the type is chosen, the form starts at step 2. With werte=1 the
  // calculator values follow from js/evidence.js (sessionStorage "bs-rechner")
  const params = new URLSearchParams(location.search);
  const preset = form.querySelector(`input[name="betriebsart"][value="${CSS.escape(params.get('typ') || '')}"]`);
  const start = () => {
    if (preset) preset.checked = true;
    showGroup();
    show(preset ? 1 : 0, false);
  };
  start();
  const SIZE_FIELD = { hotel: 'zimmer', thermen: 'besuche' };
  let fromCalc = null;
  if (params.get('werte') === '1') {
    try { fromCalc = JSON.parse(sessionStorage.getItem('bs-rechner')); } catch { /* blocked or invalid */ }
  }
  if (fromCalc && fromCalc.summary) {
    if (SIZE_FIELD[fromCalc.model] && fromCalc.size) pickRange(SIZE_FIELD[fromCalc.model], fromCalc.size);
    form.elements.rechner.value = fromCalc.summary;
    calcNote.querySelector('span').textContent = fromCalc.summary;
    calcNote.hidden = false;
  }

  const reset = () => {
    form.reset();
    form.elements.rechner.value = '';
    calcNote.hidden = true;
    try { sessionStorage.removeItem('bs-rechner'); } catch { /* nothing to remove */ }
    start();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Enter in an earlier step moves on instead of sending
    if (current < steps.length - 1) { if (valid(steps[current])) show(current + 1); return; }
    // every step once more, in order: the first incomplete one is shown again
    const complete = step => [...step.querySelectorAll('input, textarea')].every(el => el.disabled || el.checkValidity());
    const first = steps.findIndex(s => !complete(s));
    if (first !== -1) { show(first); valid(steps[first]); return; }
    error.hidden = true;
    // a filled honeypot means a bot: pretend success, send nothing
    if (form.elements.website.value) { reset(); return; }
    if (ENDPOINT) {
      try {
        const res = await fetch(ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
      } catch {
        error.hidden = false;
        return;
      }
    }
    dialog.querySelector('.dialog__test').hidden = Boolean(ENDPOINT);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    reset();
  });
})();
