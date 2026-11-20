/* ============ BLAUE STUNDE — visibility check ============
   On the Bergbahnen and Wellness pages (D-78), in place of a calculator: three one-click
   questions (five until 2026-10-28, four until 2026-11-19), each answer worth 2, 1 or 0
   points (its radio's value), asked one at a time in a card (one progress bar on top, no
   "Frage n von 3" in sight, the answers as wide buttons). After the last answer the card
   shows the result instead: the score out of 6 and its level, a bar with one segment per question, and the tip of every question not
   answered with the best option (the fieldset's data-tip). "Mit diesem Ergebnis anfragen"
   hands the answers to the Kontakt form like the hotel calculator (sessionStorage
   "bs-rechner", js/contact.js). A self-check, no figures. Without JS a note replaces it.
   On the Hotels page the same card is the calculator (2026-11-19, in place of the sliders:
   "less complex", "rough estimates are fine"): the panel has data-model="hotel", each answer's
   value is the figure the estimate uses (rooms, occupancy in %, price per night), and the
   result card stays locked ("Ihr Ergebnis erhalten Sie mit der Anfrage") until an enquiry
   has been sent (localStorage "bs-onboarded", js/contact.js); the figures go to the Kontakt
   page's thank-you dialog.
   Own file: an error here cannot stop the scroll engine.
   ========================================================= */
(() => {
  const panel = document.querySelector('.check__panel');
  if (!panel) return;
  const form = panel.querySelector('.check__form');
  const groups = [...form.querySelectorAll('fieldset.choice-group')];
  const model = panel.dataset.model || 'check';
  const result = panel.querySelector('.check__result');
  const total = panel.querySelector('.calc__total');
  const segments = [...panel.querySelectorAll('.check__bar li')];
  const tips = panel.querySelector('.check__tips');
  const MAX = groups.length * 2;   // the best answer is worth 2
  const LEVELS = [   // from the lowest score up, as shares of MAX (3 and 5 of 6)
    [0, 'Viel ungenutztes Potenzial. Hier bringt schon wenig viel.'],
    [0.375, 'Ein guter Anfang mit klaren Hebeln.'],
    [0.75, 'Gut aufgestellt. Jetzt geht es um Feinheiten.'],
  ];

  const answers = () => groups.map(g => g.querySelector('input:checked'));
  const score = () => answers().reduce((sum, i) => sum + (i ? Number(i.value) : 0), 0);
  // ---- hotel estimate: commission saved by direct bookings plus room revenue in the three
  // weakest months. Assumptions (the calculator's former defaults, scenario "mittel"): 31.9 %
  // of nights via portals (HOTREC 2026), 15 % commission, 6 % cost of a direct booking,
  // 10 % of portal guests book direct, 5 points more occupancy in 90 weak nights
  const num0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  const money = x => `≈ ${num0.format(x >= 20000 ? Math.round(x / 1000) * 1000 : Math.round(x / 100) * 100)} €`;
  const count = x => num0.format(x >= 1000 ? Math.round(x / 100) * 100 : Math.round(x / 10) * 10);
  function estimate() {
    const v = Object.fromEntries(answers().map(i => [i.name, Number(i.value)]));
    const otaNights = v.rooms * 365 * (v.occ / 100) * 0.319;
    const saving = otaNights * v.adr * 0.10 * (0.15 - 0.06);
    const lowNights = v.rooms * 90 * 0.05;
    return {
      total: `<b>${money(saving + lowNights * v.adr)}</b> weniger Provision und mehr Zimmerumsatz`,
      outs: [
        [money(saving), `≈ ${count(otaNights * 0.10)} Zimmernächte direkt statt über Portale (10 % Ihrer Portal-Buchungen)`],
        [money(lowNights * v.adr), `≈ ${count(lowNights)} zusätzliche Zimmernächte in den drei schwächsten Monaten (+5 Punkte Auslastung)`],
      ],
    };
  }
  function showResult() {
    if (model === 'hotel') {
      const r = estimate();
      total.innerHTML = r.total;
      [...panel.querySelectorAll('.calc__out')].forEach((out, i) => {
        out.querySelector('b').textContent = r.outs[i][0];
        out.querySelector('small').textContent = r.outs[i][1];
      });
      let done = false;
      try { done = localStorage.getItem('bs-onboarded') === '1'; } catch { /* storage blocked: stays locked */ }
      panel.querySelector('.calc__lock').hidden = done;
      panel.querySelector('.calc__figures').hidden = !done;
      return;
    }
    const picked = answers(), s = score();
    picked.forEach((i, k) => { segments[k].dataset.points = i ? i.value : ''; });
    total.innerHTML = `<b>${s} / ${MAX}</b> <span class="check__level">${LEVELS.filter(([min]) => s >= min * MAX).pop()[1]}</span>`;
    // a tip for every question not answered with the best option
    tips.replaceChildren(...picked.map((i, k) => i && i.value !== '2' ? groups[k].dataset.tip : null)
      .filter(Boolean).map(t => Object.assign(document.createElement('li'), { textContent: t })));
  }

  // ---- one question at a time (D-78): the card's head shows the step and the progress; a
  // click on an answer moves on by itself, so Weiter is not shown (Nicky, 2026-11-19); it stays in
  // the page for the keyboard and shows when focused (arrow keys only choose, Enter moves on)
  panel.classList.add('check--steps');
  const head = document.createElement('div');
  head.className = 'check__head';
  head.innerHTML = '<span class="check__step"></span><div class="check__progress" aria-hidden="true"><i></i></div>';
  const nav = document.createElement('div');
  nav.className = 'check__nav';
  nav.innerHTML = '<button type="button" class="check__go" data-dir="-1">Zurück</button><button type="button" class="check__go check__go--key" data-dir="1">Weiter</button>';
  form.prepend(head);
  form.append(nav);
  const stepLabel = head.querySelector('.check__step');
  const fill = head.querySelector('.check__progress i');
  const [back, next] = nav.querySelectorAll('.check__go');
  const again = Object.assign(document.createElement('button'), { type: 'button', className: 'check__go check__again', textContent: 'Antworten ändern' });
  result.append(again);

  let current = 0;
  function show(i) {
    current = i;
    const finished = i >= groups.length;
    panel.classList.toggle('check--done', finished);
    if (finished) { showResult(); return; }
    groups.forEach((g, k) => { g.hidden = k !== i; });
    fill.style.transform = `scaleX(${(i + 1) / groups.length})`;
    stepLabel.textContent = `Frage ${i + 1} von ${groups.length}`;
    back.hidden = i === 0;
    nav.classList.toggle('check__nav--bare', i === 0);
    next.disabled = !groups[i].querySelector('input:checked');
    next.textContent = i === groups.length - 1 ? 'Ergebnis' : 'Weiter';
  }
  // after a step the card's top stays in view (the card changes height)
  const keepInView = () => {
    const top = panel.getBoundingClientRect().top;
    if (top < 80 || top > innerHeight * 0.6) {
      const y = top + scrollY - 100;
      window.lenis ? lenis.scrollTo(y) : scrollTo({ top: y, behavior: 'smooth' });
    }
  };
  form.addEventListener('change', () => { if (groups[current]) next.disabled = !groups[current].querySelector('input:checked'); });
  panel.addEventListener('click', e => {
    const go = e.target.closest('.check__go');
    if (go) {
      show(go === again ? 0 : Math.max(0, current + Number(go.dataset.dir)));
      keepInView();
      (current >= groups.length ? result : groups[current]).querySelector('input, a, button').focus({ preventScroll: true });
      return;
    }
    // an answer chosen by tap or mouse: the click lands on the label's text (the radio itself is
    // hidden), the browser then clicks the radio for it. Keyboard "clicks" (arrow keys, space) go
    // to the radio only and do not move on. (Until 2026-11-20 this looked at event.detail of the
    // radio's click, which is 0 for the forwarded click on iPhones: the answer lit up and nothing
    // happened, Nicky: "doesn't work")
    const answer = e.target.closest('label.choice');
    if (answer && !e.target.matches('input')) {
      const from = current;
      setTimeout(() => {
        if (current === from && answer.querySelector('input').checked) { show(current + 1); keepInView(); }
      }, 220);   // the chosen answer lights up first
    }
  });
  // Enter on a chosen answer moves on, as a click does
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input[type="radio"]:checked')) {
      e.preventDefault();
      show(current + 1);
      keepInView();
      (current >= groups.length ? result : groups[current]).querySelector('input, a, button').focus({ preventScroll: true });
    }
  });
  show(0);

  // the answers travel to the Kontakt form only when the visitor sends it (D-04)
  // (hotel: "shown" is what the form shows before it is sent, no money yet; "result" is the
  // figures' markup for the thank-you dialog; "size" picks the form's room range)
  const clean = el => el.textContent.replace(/\s+/g, ' ').trim();
  panel.querySelectorAll('.check__result a[href*="werte=1"]').forEach(link => link.addEventListener('click', () => {
    const picked = answers();
    let data;
    if (model === 'hotel') {
      const shown = groups.map((g, k) => `${g.dataset.name} ${picked[k] ? picked[k].dataset.label : '–'}`).join(' · ');
      const outs = panel.querySelector('.calc__outs');
      data = {
        model, size: picked[0] ? Number(picked[0].value) : null, shown,
        summary: [shown, clean(total), ...[...panel.querySelectorAll('.calc__out b')].map(clean)].join(' · '),
        result: total.outerHTML + outs.outerHTML,
      };
    } else {
      data = { model: 'check', size: null, summary: [`Sichtbarkeits-Check ${score()}/${MAX}`, ...groups.map((g, k) =>
        `${g.querySelector('legend').textContent} ${picked[k] ? picked[k].dataset.label : '–'}`)].join(' · ') };
    }
    try {
      sessionStorage.setItem('bs-rechner', JSON.stringify(data));
    } catch { /* storage blocked: the form opens without the answers */ }
  }));
})();
