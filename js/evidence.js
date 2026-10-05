/* ============ BLAUE STUNDE — figures section and calculator ============
   Progressive enhancement for #zahlen and #rechner: the markup already shows every
   chart and the default calculator result, so this file only adds the readouts,
   the view toggle, the bar growth and the live calculation. Its own file on purpose:
   an error here cannot stop the scroll engine in main.js (and vice versa).
   ======================================================================= */
(() => {
  const num1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const num0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  const num2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // bars start at zero and grow once the chart is on screen
  function growOnView(chart) {
    if (reduce || !('IntersectionObserver' in window)) return;
    chart.classList.add('chart--wait');
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      chart.classList.remove('chart--wait');
      io.disconnect();
    }, { threshold: 0.15 });
    io.observe(chart);
  }

  // click / tap selects an item and keeps it in the readout; hover and focus only
  // preview another one and fall back to the selection. The markup's readout text
  // belongs to the item that starts with aria-pressed="true".
  function readout(chart, items, render) {
    const out = chart.querySelector('.chart__readout');
    let selected = out.innerHTML;
    const restore = () => { out.innerHTML = selected; };
    items.forEach(item => {
      if (!item.hasAttribute('aria-pressed')) item.setAttribute('aria-pressed', 'false');
      item.addEventListener('mouseenter', () => { out.innerHTML = render(item); });
      item.addEventListener('focus', () => { out.innerHTML = render(item); });
      item.addEventListener('mouseleave', restore);
      item.addEventListener('blur', restore);
      item.addEventListener('click', () => {
        items.forEach(o => o.setAttribute('aria-pressed', o === item ? 'true' : 'false'));
        selected = render(item);
        restore();
      });
    });
    return { out, restore };
  }

  /* season: share of empty beds per month */
  const season = document.getElementById('season');
  if (season) {
    const months = [...season.querySelectorAll('.month')];
    readout(season, months, m => {
      const v = parseFloat(m.style.getPropertyValue('--v'));
      return `<b>${num1.format(100 - v)} % der Betten leer</b><span>${m.dataset.month} 2025 · ${num1.format(v)} % belegt</span>`;
    });
    growOnView(season);
  }

  /* activity: hits per posting frequency, and a toggle to the growth view */
  const activity = document.getElementById('activity');
  if (activity) {
    const levels = [...activity.querySelectorAll('.level')];
    const hits = readout(activity, levels, l => {
      const med = +l.dataset.med, top = +l.dataset.top;
      if (!top) return '<b>0 Aufrufe</b><span>Ohne Social Media entdeckt Sie dort niemand – auch kein Algorithmus.</span>';
      return `<b>${num0.format(top)} Aufrufe</b><span>${l.dataset.label}: die besten 10 % der Posts – ` +
        `${Math.round(top / med)}× ein typischer Post (${num0.format(med)}).</span>`;
    });
    const growthText = '<b>+14 % statt +6 %</b><span>Follower nach einem Jahr mit 3–5 statt 1–2 Posts pro Woche (hochgerechnet).</span>';

    const toggles = [...activity.querySelectorAll('.toggle button')];
    toggles.forEach(t => {
      t.addEventListener('click', () => {
        toggles.forEach(o => {
          const on = o === t;
          o.setAttribute('aria-pressed', on ? 'true' : 'false');
          document.getElementById(o.getAttribute('aria-controls')).hidden = !on;
        });
        // the readout belongs to the visible view
        if (t.getAttribute('aria-controls') === 'activity-growth') hits.out.innerHTML = growthText;
        else hits.restore();
      });
    });
    growOnView(activity);
  }

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
    pts: x => `+${x} Punkte`,
  };
  const MODELS = {
    // hotel: commission paid today, saving from direct bookings, low-season revenue
    hotel: v => {
      const otaNights = v.rooms * 365 * (v.occ / 100) * (v.ota / 100);
      const otaRevenue = otaNights * v.adr;
      const paid = otaRevenue * (v.com / 100);
      const saving = otaRevenue * (v.shift / 100) * Math.max(0, (v.com - v.dir) / 100);
      const lowNights = v.rooms * 90 * (v.low / 100);   // three weakest months ≈ 90 nights per room
      return {
        total: `<b>${money(paid)}</b> ≈ ${num0.format(Math.round(paid / v.rooms / 10) * 10)} € pro Zimmer und Jahr`,
        outs: [
          [money(saving), `≈ ${count(otaNights * v.shift / 100)} Zimmernächte direkt statt über Portale`],
          [money(lowNights * v.adr), `≈ ${count(lowNights)} zusätzliche Zimmernächte (${num0.format(v.rooms)} Zimmer × 90 Nächte × ${v.low} %)`],
        ],
      };
    },
    // bergbahn: revenue per extra guest (ticket + gastronomy) at almost unchanged cost
    bahn: v => {
      const perGuest = v.ticket + v.gastro;
      const extra = v.guests * (v.more / 100);
      return {
        total: `<b>≈ ${num0.format(perGuest)} €</b> Ticket ${FORMAT.eur(v.ticket)} + Gastronomie ${FORMAT.eur(v.gastro)}`,
        outs: [[money(extra * perGuest), `≈ ${count(extra)} zusätzliche Gäste × ${num0.format(perGuest)} €`]],
      };
    },
    // region: Kurbeitrag and guest spending per extra overnight stay
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
    const total = panel.querySelector('.calc__total');
    const outs = [...panel.querySelectorAll('.calc__out')];
    if (!model || !total) return;
    const update = () => {
      const v = {};
      for (const el of inputs) {
        v[el.name] = parseFloat(el.value);
        el.style.setProperty('--p', `${((v[el.name] - el.min) / (el.max - el.min)) * 100}%`);
        el.labels[0].querySelector('output').textContent = FORMAT[el.dataset.format](v[el.name]);
      }
      const r = model(v);
      total.innerHTML = r.total;
      r.outs.forEach(([value, note], i) => {
        outs[i].querySelector('b').textContent = value;
        outs[i].querySelector('small').textContent = note;
      });
    };
    inputs.forEach(el => el.addEventListener('input', update));
    update();
  });

  // tabs: show one calculator panel at a time
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
})();
