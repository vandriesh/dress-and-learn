/* "Say it 3 times!" — speaking practice that unlocks the game after a hint.
 *
 * Uses the browser's speech recognition (on iPad: Apple dictation). It cannot grade
 * accent; it measures how clearly the words were understood (0–100, shown on a gauge):
 *   - coverage:  which words were recognised (the key word counts double; a near miss counts half)
 *   - clarity:   was it the recognizer's first guess, and how confident was it
 * A try passes when the score reaches the strictness level set by a grown-up (Easy / Medium / Hard).
 * If recognition is unavailable or the mic is blocked, it falls back to an "I said it!" button.
 *
 * Usage: Practice.open({ en: 'put on the crown', ro: 'Pune-i coroana!', key: 'crown', focus: 'put on' }, { speak, onDone })
 */
const Practice = (() => {
  'use strict';

  const REPEATS = 3;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const STOP_WORDS = new Set(['the', 'a', 'an', 'her', 'to']);
  // Words the recognizer may write differently even when said correctly.
  const SOUNDS_LIKE = {
    eye: ['i', 'aye', 'ai'], nose: ['knows', 'noes'], jeans: ['genes', 'jean'], sweater: ['sweeter'],
    cheek: ['chic'], hair: ['hare'], blonde: ['blond'], bun: ['bunn'], sandals: ['sandles'],
    ear: ['year'], tshirt: ['teeshirt'], dress: ['address'], cap: ['capp'],
  };
  const LEVELS = [
    { id: 'easy', name: 'Easy', pass: 30, about: 'The main word is enough (“crown” for “put on the crown”), and close tries count (“clown” for “crown”). For little ones just starting.' },
    { id: 'medium', name: 'Medium', pass: 65, about: 'The main word and the action, said correctly. A near miss like “shirt” for “skirt”, or the wrong action (“take off” for “take away”), does not pass.' },
    { id: 'hard', name: 'Hard', pass: 85, about: 'Every word, clear enough to be the recognizer’s first guess.' },
  ];

  const store = {
    get(k, d) { try { const v = localStorage.getItem('dress-learn.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('dress-learn.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  let level = Math.min(2, Math.max(0, Number(store.get('strictness', 1)) || 0));

  const $ = (s) => document.querySelector(s);
  const el = {
    root: $('#practice'), en: $('#practiceEn'), ro: $('#practiceRo'), dots: $('#practiceDots'),
    mic: $('#practiceMic'), status: $('#practiceStatus'), listen: $('#practiceListen'), skip: $('#practiceSkip'),
    gauge: $('#practiceGauge'),
    settings: $('#settings'), settingsBtn: $('#settingsBtn'), settingsClose: $('#settingsClose'),
    slider: $('#strictness'), sliderAbout: $('#strictnessAbout'),
  };

  let current = null;     // { target, count, scores, speak, onDone }
  let honourMode = !SR;   // no recognition available → "I said it!" button
  let listening = false;
  let rec = null;

  /* ---------- Scoring ---------- */
  const words = (s) => s.toLowerCase().replace(/[^a-z\s'-]/g, ' ').replace(/[-']/g, '').split(/\s+/).filter(Boolean);

  function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  }

  const sameWord = (heard, want) => heard === want || heard === want + 's' || want === heard + 's'
    || (SOUNDS_LIKE[want] || []).includes(heard);

  // "t shirt" / "tshirt" for "T-shirt": some run of whole heard words, glued together, equals the word.
  function glued(got, want) {
    for (let i = 0; i < got.length; i++) {
      let s = '';
      for (let j = i; j < got.length && s.length < want.length; j++) {
        s += got[j];
        if (s === want) return true;
      }
    }
    return false;
  }

  // 1 = understood, 0.5 = near miss (one letter off, words of 4+ letters), 0 = missed.
  function credit(got, want) {
    if (got.some((g) => sameWord(g, want)) || glued(got, want)) return 1;
    if (want.length >= 4 && got.some((g) => distance(g, want) === 1)) return 0.5;
    return 0;
  }

  function scoreOne(text, rank, confidence, target) {
    const need = words(target.en).filter((w) => !STOP_WORDS.has(w));
    const key = new Set(words(target.key || '').filter((w) => !STOP_WORDS.has(w)));     // must be said
    const focus = new Set(words(target.focus || '').filter((w) => !STOP_WORDS.has(w))); // the verb (Level 2)
    const got = words(text);
    let total = 0;
    let sum = 0;
    let keyCredit = 1;
    let focusCredit = 1;
    for (const w of need) {
      const c = credit(got, w);
      const weight = key.has(w) || focus.has(w) ? 2 : 1;
      if (key.has(w)) keyCredit = Math.min(keyCredit, c);
      if (focus.has(w)) focusCredit = Math.min(focusCredit, c);
      total += weight;
      sum += weight * c;
    }
    const coverage = total ? sum / total : 0;
    const rankFactor = [1, 0.45][rank] ?? 0.3;
    const confFactor = confidence > 0 ? Math.min(1, confidence) : 0.8; // Safari often reports 0 = unknown
    let value = Math.round(coverage * (70 + 30 * rankFactor * confFactor));
    // The key word decides: close ("clown" for crown) can only pass Easy; missing it passes nothing.
    // A wrong or incomplete action ("take off" for "take away", "put" for "put on") also only passes Easy.
    if (keyCredit === 0) value = Math.min(value, 25);
    else if (keyCredit < 1 || focusCredit < 1) value = Math.min(value, 60);
    return { score: value, text };
  }

  // alternatives: [{ text, confidence }] in the recognizer's order (best guess first)
  function score(alternatives, target) {
    let best = { score: 0, text: alternatives[0]?.text || '' };
    alternatives.forEach((a, i) => {
      const s = scoreOne(a.text || '', i, a.confidence || 0, target);
      if (s.score > best.score) best = s;
    });
    return best;
  }

  const passMark = () => LEVELS[level].pass;

  /* ---------- Gauge ---------- */
  const point = (v, r = 80) => {
    const a = Math.PI * (1 - v / 100);
    return [100 + r * Math.cos(a), 100 - r * Math.sin(a)];
  };
  const arc = (from, to, color) => {
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A80 80 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${color}" stroke-width="16" fill="none"/>`;
  };

  function renderGauge(value = null) {
    const pass = passMark();
    const [tx1, ty1] = point(pass, 66);
    const [tx2, ty2] = point(pass, 96);
    const [lx, ly] = point(pass, 108);
    const shown = value === null ? 0 : value;
    el.gauge.innerHTML = `
      <svg viewBox="0 0 200 128" aria-hidden="true">
        ${arc(0, 40, '#fca5a5')}${arc(40, 70, '#fcd34d')}${arc(70, 100, '#86efac')}
        <line x1="${tx1.toFixed(1)}" y1="${ty1.toFixed(1)}" x2="${tx2.toFixed(1)}" y2="${ty2.toFixed(1)}" stroke="#3b2a3a" stroke-width="3" stroke-linecap="round"/>
        <text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="#8f7b88">pass</text>
        <g class="needle" style="transform: rotate(${(shown * 1.8).toFixed(1)}deg)">
          <line x1="100" y1="100" x2="30" y2="100" stroke="#3b2a3a" stroke-width="4" stroke-linecap="round"/>
        </g>
        <circle cx="100" cy="100" r="8" fill="#3b2a3a"/>
        <text x="100" y="126" text-anchor="middle" font-size="18" font-weight="700" fill="#3b2a3a">${value === null ? '–' : value}</text>
      </svg>
      <div class="gauge-label">How clearly I understood you · <b>${LEVELS[level].name}</b></div>`;
    el.gauge.classList.toggle('idle', value === null);
  }

  /* Colour each word of the phrase by what was heard. */
  function renderPhrase(heardText = null) {
    const got = heardText === null ? null : words(heardText);
    el.en.innerHTML = current.target.en.split(/\s+/).map((tok) => {
      const w = words(tok).join('');
      let cls = '';
      if (got && w && !STOP_WORDS.has(w)) {
        const c = credit(got, w);
        cls = c === 1 ? 'w-ok' : c > 0 ? 'w-close' : 'w-miss';
      }
      return `<span class="${cls}">${tok.replace(/[<>&]/g, '')}</span>`;
    }).join(' ');
  }

  /* ---------- Speech recognition ---------- */
  function listenOnce() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (r) => { if (!settled) { settled = true; rec = null; resolve(r); } };
      try {
        rec = new SR();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.continuous = false;
        rec.maxAlternatives = 5;
        rec.onresult = (e) => finish({ alts: [...e.results[0]].map((a) => ({ text: a.transcript, confidence: a.confidence })) });
        rec.onerror = (e) => finish({ error: e.error });
        rec.onend = () => finish({ error: 'no-speech' });
        rec.start();
        setTimeout(() => { try { rec && rec.stop(); } catch { /* already stopped */ } }, 7000);
      } catch {
        finish({ error: 'start-failed' });
      }
    });
  }

  /* ---------- Practice screen ---------- */
  function renderDots() {
    el.dots.innerHTML = Array.from({ length: REPEATS }, (_, i) => `<span class="${i < current.count ? 'on' : ''}"></span>`).join('');
  }

  function setStatus(text, mood = '') {
    el.status.textContent = text;
    el.status.className = 'practice-status ' + mood;
  }

  function useHonourMode(reason) {
    honourMode = true;
    el.mic.textContent = '✋ I said it!';
    el.mic.classList.add('honour');
    el.gauge.hidden = true; // nothing to measure without the microphone
    setStatus(reason || 'Say it out loud, then tap the button.');
  }

  function success(value) {
    current.count += 1;
    if (value !== undefined) current.scores.push(value);
    renderDots();
    el.root.classList.remove('yay'); void el.root.offsetWidth; el.root.classList.add('yay');
    if (current.count >= REPEATS) {
      const avg = current.scores.length ? Math.round(current.scores.reduce((a, b) => a + b, 0) / current.scores.length) : null;
      setStatus(avg === null ? 'Super! 🎉' : `Super! 🎉 Your score: ${avg}`, 'good');
      const { onDone, speak } = current;
      speak('Super! Well done!');
      setTimeout(() => close(true, onDone), 1600);
    } else {
      setStatus(`${value >= 85 ? 'Excellent!' : 'Good!'} ${REPEATS - current.count} more…`, 'good');
    }
  }

  async function onMic() {
    if (!current || listening || current.count >= REPEATS) return;
    if (honourMode) return success();
    window.speechSynthesis?.cancel(); // don't let the mic hear our own voice
    listening = true;
    el.mic.classList.add('listening');
    setStatus('Listening… 👂');
    const r = await listenOnce();
    listening = false;
    el.mic.classList.remove('listening');
    if (!current) return;
    if (r.alts) {
      const result = score(r.alts, current.target);
      renderGauge(result.score);
      renderPhrase(result.text);
      if (result.score >= passMark()) success(result.score);
      else setStatus(`I heard “${result.text || '…'}”. Listen 🔊 and try again!`, 'try');
    } else if (r.error === 'not-allowed' || r.error === 'service-not-allowed' || r.error === 'start-failed') {
      useHonourMode('The microphone is off. Say it out loud, then tap the button.');
    } else if (r.error === 'network') {
      useHonourMode('No internet for listening. Say it out loud, then tap the button.');
    } else {
      setStatus("I didn't hear you. Tap 🎤 and speak a bit louder!", 'try');
    }
  }

  function open(target, { speak, onDone }) {
    current = { target, count: 0, scores: [], speak, onDone };
    el.ro.textContent = '🇷🇴 ' + target.ro;
    renderPhrase();
    renderDots();
    el.gauge.hidden = honourMode;
    renderGauge(null);
    if (honourMode) useHonourMode();
    else {
      el.mic.textContent = '🎤';
      setStatus('Listen 🔊, then tap 🎤 and say it!');
    }
    el.root.hidden = false;
    document.body.classList.add('practicing');
    setTimeout(() => speak(target.en), 250);
  }

  function close(done, onDone) {
    try { rec && rec.abort(); } catch { /* ignore */ }
    el.root.hidden = true;
    document.body.classList.remove('practicing');
    current = null;
    if (done && onDone) onDone();
  }

  /* ---------- Grown-up settings: strictness slider ---------- */
  function setLevel(i) {
    level = Math.min(2, Math.max(0, Number(i) || 0));
    store.set('strictness', level);
    el.slider.value = String(level);
    el.slider.setAttribute('aria-valuetext', LEVELS[level].name);
    el.sliderAbout.innerHTML = `<b>${LEVELS[level].name}</b> · pass mark ${LEVELS[level].pass}/100<br>${LEVELS[level].about}`;
    document.querySelectorAll('[data-level]').forEach((b) => b.classList.toggle('on', Number(b.dataset.level) === level));
    if (current) renderGauge(null);
  }

  /* ---------- Events ---------- */
  el.mic.addEventListener('click', onMic);
  el.listen.addEventListener('click', () => current && current.speak(current.target.en));
  el.en.addEventListener('click', () => current && current.speak(current.target.en));

  // Grown-up skip: press and hold for 2 seconds.
  let holdTimer = null;
  const cancelHold = () => { clearTimeout(holdTimer); el.skip.classList.remove('holding'); };
  el.skip.addEventListener('pointerdown', () => {
    el.skip.classList.add('holding');
    holdTimer = setTimeout(() => { cancelHold(); if (current) close(true, current.onDone); }, 2000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.skip.addEventListener(ev, cancelHold));
  el.skip.addEventListener('contextmenu', (e) => e.preventDefault());

  el.slider.addEventListener('input', () => setLevel(el.slider.value));
  document.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => setLevel(b.dataset.level)));
  el.settingsBtn.addEventListener('click', () => { el.settings.hidden = false; });
  el.settingsClose.addEventListener('click', () => { el.settings.hidden = true; });
  el.settings.addEventListener('click', (e) => { if (e.target === el.settings) el.settings.hidden = true; });
  setLevel(level);

  return {
    open,
    score,
    // Back-compat helper (tests): does this text pass at the current strictness?
    understood: (texts, target) => score(texts.map((t) => ({ text: t, confidence: 0.9 })), typeof target === 'string' ? { en: target } : target).score >= passMark(),
    setLevel,
    get level() { return LEVELS[level].id; },
    get isOpen() { return !!current; },
  };
})();
