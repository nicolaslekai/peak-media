/* ============ BLAUE STUNDE — calculator ============
   Progressive enhancement for #rechner: the markup already shows the default result,
   so this file only adds the live calculation, the tabs and the hand-off to the Kontakt
   page. (The charts it also drove were removed with the figures, D-68.) Its own file on
   purpose: an error here cannot stop the scroll engine in main.js (and vice versa).
   ==================================================== */
(() => {
  const num1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const num0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  const num2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* calculators: one panel per business type, switched by the tabs above them.
     Each panel declares its inputs (name + data-format) and outputs in the markup;
     MODELS holds the formulas. Results are rounded, they are examples. */
  const money = x => `≈ ${num0.format(Math.round(x / 100) * 100)} €`;
  const count = x => num0.format(x >= 1000 ? Math.round(x / 100) * 100 : Math.round(x / 10) * 10);
  const FORMAT = {
    int: x => num0.format(x),
    pct: x => `${x} %`,
    pct1: x => `${num1.format(x)} %`,
    eur: x => `${num0.format(x)} €`,
    eur2: x => `${num2.format(x)} €`,
    plus: x => `+${x} %`,
  };
  // each panel leads with what the business gains per year (Nicolas, 2026-10-22: what a
  // visitor pays today, or might pay, scared people); the parts follow below the sliders
  const MODELS = {
    // hotel: commission saved by direct bookings + room revenue in the three weakest months;
    // shift and low come from the chosen scenario (D-85), not from sliders
    hotel: v => {
      const otaNights = v.rooms * 365 * (v.occ / 100) * (v.ota / 100);
      const otaRevenue = otaNights * v.adr;
      const saving = otaRevenue * (v.shift / 100) * Math.max(0, (v.com - v.dir) / 100);
      const lowNights = v.rooms * 90 * (v.low / 100);   // three weakest months ≈ 90 nights per room
      return {
        total: `<b>${money(saving + lowNights * v.adr)}</b> weniger Provision und mehr Zimmerumsatz`,
        outs: [
          [money(saving), `≈ ${count(otaNights * v.shift / 100)} Zimmernächte direkt statt über Portale (${v.shift} % Ihrer Portal-Buchungen)`],
          [money(lowNights * v.adr), `≈ ${count(lowNights)} zusätzliche Zimmernächte in den drei schwächsten Monaten (+${v.low} Punkte Auslastung)`],
        ],
      };
    },
    // bergbahn: extra guests × revenue per guest (ticket + gastronomy) at almost unchanged cost
    bahn: v => {
      const perGuest = v.ticket + v.gastro;
      const extra = v.guests * (v.more / 100);
      return {
        total: `<b>${money(extra * perGuest)}</b> zusätzlicher Umsatz`,
        outs: [[`≈ ${count(extra)} Gäste mehr`, `je Gast ≈ ${num0.format(perGuest)} €: Ticket ${FORMAT.eur(v.ticket)} + Gastronomie ${FORMAT.eur(v.gastro)}`]],
      };
    },
    // thermal baths: the client's own numbers only (no defensible public defaults):
    // extra visits in the quiet months × revenue per visit
    thermen: v => {
      const quiet = v.visits * (v.quiet / 100);
      const extra = quiet * (v.more / 100);
      return {
        total: `<b>${money(extra * v.spend)}</b> zusätzlicher Umsatz`,
        outs: [[`≈ ${count(extra)} Besuche mehr`, `je Besuch ${FORMAT.eur(v.spend)}; heute ≈ ${count(quiet)} von ${num0.format(v.visits)} Besuchen in diesen Monaten`]],
      };
    },
    // region: Kurbeitrag and guest spending per extra overnight stay (no panel since D-57)
    region: v => {
      const extra = v.nights * (v.more / 100);
      return {
        total: `<b>≈ ${num0.format(v.spend + v.kur)} €</b> Ausgaben ${FORMAT.eur(v.spend)} + Kurbeitrag ${FORMAT.eur2(v.kur)}`,
        outs: [
          [money(extra * v.spend), `≈ ${count(extra)} zusätzliche Übernachtungen`],
          [money(extra * v.kur), `für die Gemeinde, bei ${FORMAT.eur2(v.kur)} pro Nacht`],
        ],
      };
    },
  };

  document.querySelectorAll('.calc[data-model]').forEach(panel => {
    const model = MODELS[panel.dataset.model];
    const inputs = [...panel.querySelectorAll('input[type="range"]')];
    // scenario buttons: the checked one hands its data-* values to the model
    const picks = [...panel.querySelectorAll('input[type="radio"]')];
    const total = panel.querySelector('.calc__total');
    const outs = [...panel.querySelectorAll('.calc__out')];
    if (!model || !total) return;
    const update = () => {
      const v = {};
      for (const el of inputs) {
        v[el.name] = parseFloat(el.value);
        el.style.setProperty('--p', `${((v[el.name] - el.min) / (el.max - el.min)) * 100}%`);
        el.parentElement.querySelector('output').textContent = FORMAT[el.dataset.format](v[el.name]);
      }
      for (const el of picks) if (el.checked) for (const [k, x] of Object.entries(el.dataset)) v[k] = parseFloat(x);
      const r = model(v);
      total.innerHTML = r.total;
      r.outs.forEach(([value, note], i) => {
        outs[i].querySelector('b').textContent = value;
        outs[i].querySelector('small').textContent = note;
      });
    };
    inputs.forEach(el => el.addEventListener('input', update));
    picks.forEach(el => el.addEventListener('change', update));
    update();
  });

  // tabs (home page): show one calculator panel at a time; a segment page has its own panel
  // and no tabs
  const tabs = [...document.querySelectorAll('.calc-tabs button')];
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(o => {
        const on = o === tab;
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
        document.getElementById(o.getAttribute('aria-controls')).hidden = !on;
      });
    });
  });

  /* calculator → Kontakt page: "Mit diesen Werten anfragen" keeps the values in this
     browser tab (sessionStorage, key "bs-rechner"); js/contact.js fills the form with them
     when the link carries werte=1. Nothing leaves the browser until the form is sent (D-04). */
  const clean = el => el.textContent.replace(/\s+/g, ' ').trim();
  // the input that picks the form's size range (the Bergbahn panel counts summer guests,
  // the form asks for the year, so it hands over no size)
  const SIZE = { hotel: 'rooms', thermen: 'visits' };
  document.querySelectorAll('.calc[data-model] .calc__result a[href*="werte=1"]').forEach(link => {
    link.addEventListener('click', () => {
      const panel = link.closest('.calc');
      const model = panel.dataset.model;
      const size = panel.querySelector(`input[name="${SIZE[model]}"]`);
      const summary = [
        ...[...panel.querySelectorAll('.range')].map(r => `${clean(r.querySelector('label'))} ${clean(r.querySelector('output'))}`),
        ...[...panel.querySelectorAll('input[type="radio"]:checked')].map(r => `Szenario ${clean(r.nextElementSibling)}`),
        clean(panel.querySelector('.calc__total')),
        ...[...panel.querySelectorAll('.calc__out b')].map(clean),
      ].join(' · ');
      try {
        sessionStorage.setItem('bs-rechner', JSON.stringify({ model, size: size ? Number(size.value) : null, summary }));
      } catch { /* storage blocked: the form opens without the values */ }
    });
  });
})();
