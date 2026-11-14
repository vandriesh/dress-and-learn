/* "Say it 3 times!" — speaking practice that unlocks the game after a hint.
 *
 * Uses the browser's speech recognition (on iPad: Apple dictation). It does not
 * score accent; it checks that what she said was understood as the right words.
 * If recognition is unavailable or the mic is blocked, it falls back to an
 * honour button ("I said it!"). A grown-up can always hold "skip" for 2 s.
 *
 * Usage: Practice.open({ en: 'take off the boots', ro: 'Dă-i jos cizmele!' }, { speak, onDone })
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

  const $ = (s) => document.querySelector(s);
  const el = {
    root: $('#practice'), en: $('#practiceEn'), ro: $('#practiceRo'), dots: $('#practiceDots'),
    mic: $('#practiceMic'), status: $('#practiceStatus'), listen: $('#practiceListen'), skip: $('#practiceSkip'),
  };

  let current = null;     // { target, count, speak, onDone }
  let honourMode = !SR;   // no recognition available → "I said it!" button
  let listening = false;
  let rec = null;

  /* ---------- Matching ---------- */
  const words = (s) => s.toLowerCase().replace(/[^a-z\s'-]/g, ' ').replace(/[-']/g, '').split(/\s+/).filter(Boolean);

  // No "close enough" spelling: the recognizer writes real words, so a mispronounced
  // word comes back as a different real word ("clown" for crown, "shirt" for skirt) and must fail.
  function wordMatches(heard, want) {
    if (heard === want || heard === want + 's' || want === heard + 's') return true;
    return (SOUNDS_LIKE[want] || []).includes(heard);
  }

  // "t shirt" / "tshirt" for "T-shirt": some run of whole heard words, glued together, equals the target.
  function gluedMatch(got, target) {
    for (let i = 0; i < got.length; i++) {
      let s = '';
      for (let j = i; j < got.length && s.length < target.length; j++) {
        s += got[j];
        if (s === target) return true;
      }
    }
    return false;
  }

  function understood(alternatives, target) {
    const need = words(target).filter((w) => !STOP_WORDS.has(w));
    if (!need.length) return false;
    return alternatives.some((alt) => {
      const got = words(alt);
      if (gluedMatch(got, need.join(''))) return true;
      return need.every((w) => got.some((g) => wordMatches(g, w)));
    });
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
        rec.onresult = (e) => finish({ alts: [...e.results[0]].map((a) => a.transcript) });
        rec.onerror = (e) => finish({ error: e.error });
        rec.onend = () => finish({ error: 'no-speech' });
        rec.start();
        setTimeout(() => { try { rec && rec.stop(); } catch { /* already stopped */ } }, 7000);
      } catch {
        finish({ error: 'start-failed' });
      }
    });
  }

  /* ---------- UI ---------- */
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
    setStatus(reason || 'Say it out loud, then tap the button.');
  }

  function success() {
    current.count += 1;
    renderDots();
    el.root.classList.remove('yay'); void el.root.offsetWidth; el.root.classList.add('yay');
    if (current.count >= REPEATS) {
      setStatus('Super! 🎉', 'good');
      const { onDone, speak } = current;
      speak('Super! Well done!');
      setTimeout(() => close(true, onDone), 1100);
    } else {
      setStatus(`Good! ${REPEATS - current.count} more…`, 'good');
    }
  }

  async function onMic() {
    if (!current || listening) return;
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
      if (understood(r.alts, current.target.en)) success();
      else setStatus(`I heard “${r.alts[0]}”. Listen 🔊 and try again!`, 'try');
    } else if (r.error === 'not-allowed' || r.error === 'service-not-allowed' || r.error === 'start-failed') {
      useHonourMode('The microphone is off. Say it out loud, then tap the button.');
    } else if (r.error === 'network') {
      useHonourMode('No internet for listening. Say it out loud, then tap the button.');
    } else {
      setStatus("I didn't hear you. Tap 🎤 and speak a bit louder!", 'try');
    }
  }

  function open(target, { speak, onDone }) {
    current = { target, count: 0, speak, onDone };
    el.en.textContent = target.en;
    el.ro.textContent = '🇷🇴 ' + target.ro;
    renderDots();
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

  return { open, understood, get isOpen() { return !!current; } };
})();
