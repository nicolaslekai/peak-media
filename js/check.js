/* ============ BLAUE STUNDE — visibility check ============
   On the Bergbahnen and Wellness & Thermen pages (D-78), in place of a calculator: five
   one-click questions, each answer worth 2, 1 or 0 points (its radio's value), asked one at
   a time in a card ("Frage n von 5" and a progress bar on top, the answers as wide
   buttons). After the last answer the card shows the result instead: the score out of 10
   and its level, a bar with one segment per question, and the tip of every question not
   answered with the best option (the fieldset's data-tip). "Mit diesem Ergebnis anfragen"
   hands the answers to the Kontakt form like the hotel calculator (sessionStorage
   "bs-rechner", js/contact.js). A self-check, no figures. Without JS a note replaces it.
   Own file, like evidence.js: an error here cannot stop the scroll engine.
   ========================================================= */
(() => {
  const panel = document.querySelector('.check__panel');
  if (!panel) return;
  const form = panel.querySelector('.check__form');
  const groups = [...form.querySelectorAll('fieldset[data-tip]')];
  const result = panel.querySelector('.check__result');
  const total = panel.querySelector('.calc__total');
  const segments = [...panel.querySelectorAll('.check__bar li')];
  const tips = panel.querySelector('.check__tips');
  const LEVELS = [   // from the lowest score up
    [0, 'Viel ungenutztes Potenzial. Hier bringt schon wenig viel.'],
    [4, 'Ein guter Anfang mit klaren Hebeln.'],
    [8, 'Gut aufgestellt. Jetzt geht es um Feinheiten.'],
  ];

  const answers = () => groups.map(g => g.querySelector('input:checked'));
  const score = () => answers().reduce((sum, i) => sum + (i ? Number(i.value) : 0), 0);
  function showResult() {
    const picked = answers(), s = score();
    picked.forEach((i, k) => { segments[k].dataset.points = i ? i.value : ''; });
    total.innerHTML = `<b>${s} / 10</b> <span class="check__level">${LEVELS.filter(([min]) => s >= min).pop()[1]}</span>`;
    // a tip for every question not answered with the best option
    tips.replaceChildren(...picked.map((i, k) => i && i.value !== '2' ? groups[k].dataset.tip : null)
      .filter(Boolean).map(t => Object.assign(document.createElement('li'), { textContent: t })));
  }

  // ---- one question at a time (D-78): the card's head shows the step and the progress; a
  // click on an answer moves on, Zurück and Weiter serve the keyboard (arrow keys only choose)
  panel.classList.add('check--steps');
  const head = document.createElement('div');
  head.className = 'check__head';
  head.innerHTML = `<span class="check__step"></span><ol class="check__progress" aria-hidden="true">${groups.map(() => '<li></li>').join('')}</ol>`;
  const nav = document.createElement('div');
  nav.className = 'check__nav';
  nav.innerHTML = '<button type="button" class="check__go" data-dir="-1">Zurück</button><button type="button" class="check__go" data-dir="1">Weiter</button>';
  form.prepend(head);
  form.append(nav);
  const stepLabel = head.querySelector('.check__step');
  const marks = [...head.querySelectorAll('li')];
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
    marks.forEach((m, k) => { m.classList.toggle('is-done', k < i); m.classList.toggle('is-now', k === i); });
    stepLabel.textContent = `Frage ${i + 1} von ${groups.length}`;
    back.hidden = i === 0;
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
    // an answer chosen with the pointer (detail > 0; keyboard "clicks" on radios have 0)
    if (e.target.matches('input[type="radio"]') && e.detail > 0) {
      setTimeout(() => { show(current + 1); keepInView(); }, 220);   // the chosen answer lights up first
    }
  });
  show(0);

  // the answers travel to the Kontakt form only when the visitor sends it (D-04)
  panel.querySelector('.check__result a[href*="werte=1"]').addEventListener('click', () => {
    const picked = answers();
    const summary = [`Sichtbarkeits-Check ${score()}/10`, ...groups.map((g, k) =>
      `${g.querySelector('legend').textContent} ${picked[k] ? picked[k].dataset.label : '–'}`)].join(' · ');
    try {
      sessionStorage.setItem('bs-rechner', JSON.stringify({ model: 'check', size: null, summary }));
    } catch { /* storage blocked: the form opens without the answers */ }
  });
})();
