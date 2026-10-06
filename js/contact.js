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

  // only the group of the chosen type is visible; the others are disabled <fieldset>s,
  // so their fields are neither validated nor sent (the markup starts all disabled)
  const showGroup = () => {
    for (const g of groups) g.hidden = g.disabled = g.dataset.for !== type.value;
  };
  type.addEventListener('change', showGroup);
  showGroup();

  // validation messages in German instead of the browser's language (A3)
  const message = el => {
    const v = el.validity;
    if (v.valueMissing) return el.tagName === 'SELECT' ? 'Bitte wählen Sie eine Option.' : 'Bitte füllen Sie dieses Feld aus.';
    if (v.typeMismatch || v.patternMismatch) return 'Bitte geben Sie eine gültige E-Mail-Adresse ein, z. B. name@hotel.de.';
    return '';
  };
  for (const el of form.querySelectorAll('input, select, textarea')) {
    el.addEventListener('invalid', () => el.setCustomValidity(message(el)));
    el.addEventListener('input', () => el.setCustomValidity(''));
    el.addEventListener('change', () => el.setCustomValidity(''));
  }

  // the size fields are ranges: a calculator number picks the first option whose
  // data-max covers it, the last option ("über …") takes the rest
  const pickRange = (select, n) => {
    const opts = [...select.options].filter(o => o.value);
    select.value = (opts.find(o => n <= Number(o.dataset.max)) || opts[opts.length - 1]).value;
  };

  // calculator → form: business type, size range and a one-line summary
  const FROM_CALC = {
    hotel: { type: 'hotel', field: 'zimmer', input: 'rooms' },
    bahn: { type: 'bergbahn', field: 'gaeste', input: 'guests' },
    region: { type: 'region', field: 'uebernachtungen', input: 'nights' },
  };
  document.querySelectorAll('.calc[data-model] .calc__result a[href="#kontakt"]').forEach(link => {
    link.addEventListener('click', () => {
      const panel = link.closest('.calc');
      const map = FROM_CALC[panel.dataset.model];
      if (!map) return;
      type.value = map.type;
      showGroup();
      pickRange(form.elements[map.field], Number(panel.querySelector(`input[name="${map.input}"]`).value));
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
