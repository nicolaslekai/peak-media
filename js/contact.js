/* ============ BLAUE STUNDE — enquiry form ============
   Shows the extra fields for the chosen business type, validates in German, takes
   over the calculator values ("Mit diesen Werten anfragen") and confirms with a
   dialog. Delivery is not set up yet (D-04): while ENDPOINT is empty nothing is
   sent and the dialog says so. Own file, like evidence.js: an error here cannot
   stop the scroll engine.
   ===================================================== */
(() => {
  const form = document.getElementById('enquiry');
  if (!form) return;

  // form service or function URL, set once hosting and mail exist (D-04)
  const ENDPOINT = '';

  const type = form.elements.betriebsart;
  const groups = [...form.querySelectorAll('.contact__extra')];
  const calcNote = form.querySelector('.contact__calc');
  const error = form.querySelector('.contact__error');
  const dialog = document.getElementById('enquiry-sent');

  // only the group of the chosen type is visible; hidden fields are disabled, so they
  // are neither validated nor sent
  const showGroup = () => {
    for (const g of groups) {
      const on = g.dataset.for === type.value;
      g.hidden = !on;
      g.querySelectorAll('input, select').forEach(el => { el.disabled = !on; });
    }
  };
  type.addEventListener('change', showGroup);
  showGroup();

  // validation messages in German instead of the browser's language (A3)
  const message = el => {
    const v = el.validity;
    if (v.valueMissing) return el.tagName === 'SELECT' ? 'Bitte wählen Sie eine Option.' : 'Bitte füllen Sie dieses Feld aus.';
    if (v.typeMismatch || v.patternMismatch) return 'Bitte geben Sie eine gültige E-Mail-Adresse ein, z. B. name@hotel.de.';
    if (v.rangeUnderflow || v.badInput) return 'Bitte geben Sie eine gültige Zahl ein.';
    return '';
  };
  for (const el of form.querySelectorAll('input, select, textarea')) {
    el.addEventListener('invalid', () => el.setCustomValidity(message(el)));
    el.addEventListener('input', () => el.setCustomValidity(''));
    el.addEventListener('change', () => el.setCustomValidity(''));
  }

  // calculator → form: business type, size field and a one-line summary
  const FROM_CALC = {
    hotel: { type: 'hotel', field: 'zimmer', input: 'rooms' },
    bahn: { type: 'bergbahn', field: 'gaeste', input: 'guests' },
    region: { type: 'region', field: 'uebernachtungen', input: 'nights' },
  };
  document.querySelectorAll('.calc[data-model] .calc__result a[href="#contact"]').forEach(link => {
    link.addEventListener('click', () => {
      const panel = link.closest('.calc');
      const map = FROM_CALC[panel.dataset.model];
      if (!map) return;
      type.value = map.type;
      showGroup();
      form.elements[map.field].value = panel.querySelector(`input[name="${map.input}"]`).value;
      const clean = el => el.textContent.replace(/\s+/g, ' ').trim();
      const summary = [
        ...[...panel.querySelectorAll('.range label')].map(clean),
        clean(panel.querySelector('.calc__total')),
        ...[...panel.querySelectorAll('.calc__out b')].map(clean),
      ].join(' · ');
      form.elements.rechner.value = summary;
      calcNote.querySelector('span').textContent = summary;
      calcNote.hidden = false;
    });
  });

  const reset = () => {
    form.reset();
    showGroup();
    form.elements.rechner.value = '';
    calcNote.hidden = true;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
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
