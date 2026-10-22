/* ============ BLAUE STUNDE — visibility check ============
   On the Bergbahnen and Wellness & Thermen pages (D-78), in place of a calculator: five
   one-click questions, each answer worth 2, 1 or 0 points (its radio's value). Shows the
   score out of 10 and its level, a bar with one segment per question, and the tip of
   every question not answered with the best option (the fieldset's data-tip). "Mit diesem
   Ergebnis anfragen" hands the answers to the Kontakt form like the hotel calculator
   (sessionStorage "bs-rechner", js/contact.js). A self-check, no figures. Own file, like
   evidence.js: an error here cannot stop the scroll engine.
   ========================================================= */
(() => {
  const panel = document.querySelector('.check__panel');
  if (!panel) return;
  const form = panel.querySelector('.check__form');
  const groups = [...form.querySelectorAll('fieldset[data-tip]')];
  const total = panel.querySelector('.calc__total');
  const segments = [...panel.querySelectorAll('.check__bar li')];
  const tips = panel.querySelector('.check__tips');
  const LEVELS = [   // from the lowest score up
    [0, 'Viel ungenutztes Potenzial – hier bringt schon wenig sehr viel.'],
    [4, 'Ein guter Anfang, mit klaren Hebeln nach oben.'],
    [8, 'Gut aufgestellt – jetzt geht es um die Feinheiten.'],
  ];

  const answers = () => groups.map(g => g.querySelector('input:checked'));
  const update = () => {
    const picked = answers();
    const done = picked.filter(Boolean);
    const score = done.reduce((sum, i) => sum + Number(i.value), 0);
    picked.forEach((i, k) => { segments[k].dataset.points = i ? i.value : ''; });
    if (done.length < groups.length) {
      total.innerHTML = `<b>${done.length ? score : '–'} / 10</b> <span class="check__level">Noch ${groups.length - done.length} von ${groups.length} Fragen.</span>`;
    } else {
      const level = LEVELS.filter(([min]) => score >= min).pop()[1];
      total.innerHTML = `<b>${score} / 10</b> <span class="check__level">${level}</span>`;
    }
    // a tip for every answered question that is not the best answer yet
    tips.replaceChildren(...picked.map((i, k) => i && i.value !== '2' ? groups[k].dataset.tip : null)
      .filter(Boolean).map(t => Object.assign(document.createElement('li'), { textContent: t })));
  };
  form.addEventListener('change', update);
  update();

  // ---- one question at a time (Raffaele, 2026-10-22): a click on an answer moves on; "Zurück"
  // and "Weiter" for the keyboard (arrow keys choose without moving on); after the last one a
  // short note, the result card beside it (below it on phones)
  const nav = document.createElement('div');
  nav.className = 'check__nav';
  nav.innerHTML = '<span class="check__step"></span><button type="button" class="check__go" data-dir="-1">Zurück</button><button type="button" class="check__go" data-dir="1">Weiter</button>';
  const done = document.createElement('div');
  done.className = 'check__done';
  done.innerHTML = '<p>Fertig – Ihr Ergebnis und was am meisten bringt, sehen Sie ' +
    '<span class="check__where">rechts</span>.</p><button type="button" class="check__go" data-dir="restart">Antworten ändern</button>';
  form.append(nav, done);
  const stepLabel = nav.querySelector('.check__step');
  const [back, next] = nav.querySelectorAll('.check__go');
  let current = 0;
  const show = i => {
    current = i;
    const finished = i >= groups.length;
    groups.forEach((g, k) => { g.hidden = k !== i; });
    nav.hidden = finished; done.hidden = !finished;
    if (!finished) {
      stepLabel.textContent = `Frage ${i + 1} von ${groups.length}`;
      back.hidden = i === 0;
      next.disabled = !groups[i].querySelector('input:checked');
      next.textContent = i === groups.length - 1 ? 'Ergebnis' : 'Weiter';
    }
  };
  form.addEventListener('click', e => {
    const go = e.target.closest('.check__go');
    if (go) {
      const d = go.dataset.dir;
      show(d === 'restart' ? 0 : Math.max(0, current + Number(d)));
      (d === 'restart' ? groups[0] : groups[current] || done).querySelector('input, button').focus({ preventScroll: true });
      return;
    }
    // an answer chosen with the pointer (detail > 0; keyboard "clicks" on radios have 0)
    if (e.target.matches('input[type="radio"]') && e.detail > 0) {
      setTimeout(() => {
        show(current + 1);
        // on phones the result card is below: bring it into view once everything is answered
        if (current >= groups.length && matchMedia('(max-width: 1000px)').matches) {
          panel.querySelector('.check__result').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 220);   // the chosen answer lights up first
    }
  });
  form.addEventListener('change', () => { next.disabled = !groups[current]?.querySelector('input:checked'); });
  done.querySelector('.check__where').textContent = matchMedia('(max-width: 1000px)').matches ? 'unten' : 'rechts';
  show(0);

  // the answers travel to the Kontakt form only when the visitor sends it (D-04)
  const link = panel.querySelector('.check__result a[href*="werte=1"]');
  link.addEventListener('click', () => {
    const picked = answers();
    const score = picked.reduce((sum, i) => sum + (i ? Number(i.value) : 0), 0);
    const summary = [`Sichtbarkeits-Check ${score}/10`, ...groups.map((g, k) =>
      `${g.querySelector('legend').textContent.replace(/^\d+ · /, '')} ${picked[k] ? picked[k].dataset.label : '–'}`)].join(' · ');
    try {
      sessionStorage.setItem('bs-rechner', JSON.stringify({ model: 'check', size: null, summary }));
    } catch { /* storage blocked: the form opens without the answers */ }
  });
})();
