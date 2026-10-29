/* ============ BLAUE STUNDE — enquiry form ============
   On the Kontakt page (kontakt/), one form for the whole site in four steps (D-74, D-97):
   the business type, one question for that type, the social channels, contact. The first
   three are one click each and move on by themselves. Shows one step at a time and only
   the question of the chosen type ("Etwas anderes" has none and skips it), validates each step in German,
   takes over ?typ= from a segment page and the calculator values ("Mit diesen Werten
   anfragen") and confirms with a dialog. Delivery: api/senden.php on the server mails it
   to service@ (D-04, D-86); with ENDPOINT empty nothing would be sent and the dialog
   would say so. Without JS every step shows at once. Own file, like evidence.js: an error here cannot stop the scroll engine.
   ===================================================== */
(() => {
  const form = document.getElementById('enquiry');
  if (!form) return;

  // the PHP script on Hostinger that mails the enquiry (D-04, api/senden.php); a local
  // preview without PHP gets an error here and shows the form's error note
  const ENDPOINT = '../api/senden.php';

  const steps = [...form.querySelectorAll('.wizard__step')];
  const marks = [...form.querySelectorAll('.wizard__progress li')];
  const groups = [...form.querySelectorAll('.contact__extra')];
  const calcNote = form.querySelector('.contact__calc');
  const error = form.querySelector('.contact__error');
  const dialog = document.getElementById('enquiry-sent');
  const propLabel = form.querySelector('label[for="f-prop"]');
  const propDefault = propLabel.textContent;
  const type = () => form.elements.betriebsart.value;
  // each step is checked on "Weiter", so the browser's own check on submit stays off
  form.noValidate = true;

  // only the question of the chosen type is visible; the others are disabled
  // <fieldset>s, so their answers are neither validated nor sent. The name field speaks
  // to the type ("Name des Hotels") where the label has a data-<type>
  const showGroup = () => {
    for (const g of groups) g.hidden = g.disabled = g.dataset.for !== type();
    propLabel.textContent = propLabel.dataset[type()] || propDefault;
  };
  // a step of per-type questions with none for this type ("Etwas anderes") is skipped
  const empty = i => steps[i].querySelector('.contact__extra') && !steps[i].querySelector('.contact__extra:not([hidden])');

  let current = 0;
  const show = (i, focus = true) => {
    current = i;
    steps.forEach((s, k) => { s.hidden = k !== i; });
    marks.forEach((m, k) => {
      m.classList.toggle('is-done', k < i);
      if (k === i) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
    });
    if (focus) {
      const title = [...steps[i].querySelectorAll('.wizard__title')].find(t => !t.closest('[hidden]'));
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

  // one step on or back, past a step with nothing to ask
  const go = dir => {
    let i = current + dir;
    while (empty(i)) i += dir;
    show(i);
  };
  form.addEventListener('click', e => {
    if (e.target.closest('[data-next]') && valid(steps[current])) go(1);
    if (e.target.closest('[data-back]')) go(-1);
  });
  // each one-click question is the whole step: on to the next at once. On click, not
  // change: after "Zurück", a click on the answer already chosen fires no change
  form.addEventListener('click', e => {
    const el = e.target;
    if (el.type !== 'radio' || !steps[current].contains(el)) return;
    if (el.name === 'betriebsart') showGroup();
    // pointer only (detail > 0): arrow keys also "click" radios, and keyboard users
    // move through the answers first and go on with "Weiter"
    const from = current;
    if (e.detail > 0) setTimeout(() => { if (current === from) go(1); }, 180);   // the answer lights up first
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
    show(preset ? (empty(1) ? 2 : 1) : 0, false);
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
    if (current < steps.length - 1) { if (valid(steps[current])) go(1); return; }
    // every step once more, in order: the first incomplete one is shown again
    const complete = step => [...step.querySelectorAll('input, textarea')].every(el => el.disabled || el.checkValidity());
    const first = steps.findIndex(s => !complete(s));
    if (first !== -1) { show(first); valid(steps[first]); return; }
    error.hidden = true;
    // a filled honeypot means a bot: pretend success, send nothing
    if (form.elements.website.value) { reset(); return; }
    if (ENDPOINT) {
      // one request per click: the button waits until the server has answered
      const send = form.querySelector('[type="submit"]');
      send.disabled = true;
      try {
        const res = await fetch(ENDPOINT, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
      } catch {
        error.hidden = false;
        return;
      } finally {
        send.disabled = false;
      }
    }
    dialog.querySelector('.dialog__test').hidden = Boolean(ENDPOINT);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    reset();
  });
})();
