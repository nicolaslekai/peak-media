/* ============ BLAUE STUNDE — enquiry form ============
   On the Kontakt page (kontakt/): shows the extra fields for the chosen business
   type, validates in German, takes over the calculator values from the home page
   ("Mit diesen Werten anfragen") and confirms with a dialog. Delivery is not set up yet (D-04): while ENDPOINT is empty nothing is
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

  // the page is opened with ?typ=hotel|bergbahn|therme from a segment page or the
  // calculator; with werte=1 the calculator values follow from js/evidence.js
  // (sessionStorage "bs-rechner"): the size range and a one-line summary
  const params = new URLSearchParams(location.search);
  if ([...type.options].some(o => o.value && o.value === params.get('typ'))) {
    type.value = params.get('typ');
    showGroup();
  }
  const SIZE_FIELD = { hotel: 'zimmer', thermen: 'besuche' };
  let fromCalc = null;
  if (params.get('werte') === '1') {
    try { fromCalc = JSON.parse(sessionStorage.getItem('bs-rechner')); } catch { /* blocked or invalid */ }
  }
  if (fromCalc && fromCalc.summary) {
    const field = form.elements[SIZE_FIELD[fromCalc.model]];
    if (field && fromCalc.size) pickRange(field, fromCalc.size);
    form.elements.rechner.value = fromCalc.summary;
    calcNote.querySelector('span').textContent = fromCalc.summary;
    calcNote.hidden = false;
  }

  const reset = () => {
    form.reset();
    showGroup();
    form.elements.rechner.value = '';
    calcNote.hidden = true;
    try { sessionStorage.removeItem('bs-rechner'); } catch { /* nothing to remove */ }
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
