/* Dress & Learn — game logic (no build step, no frameworks).
 * Modes:
 *   dress — free play: tap or drag clothes, tap colors, tap the doll.
 *   find  — Level 1: "Find the boots!" / "Touch the nose!" (listening, nouns)
 *   do    — Level 2: "Take off the hat!" / "Make the dress red!" (verbs)
 */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('dress-learn.' + key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('dress-learn.' + key, JSON.stringify(value)); } catch { /* private mode */ }
    },
  };

  const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
  const PART = Object.fromEntries(BODY_PARTS.map((b) => [b.id, b]));
  const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  // Drawing order, back to front.
  const LAYERS = ['hairBack', 'body', 'bottom', 'shoes', 'top', 'necklace', 'bag', 'face', 'hairFront', 'hat', 'glasses'];
  const DEFAULT_OUTFIT = {
    hair: 'hair-long', top: 'top-tshirt', bottom: 'bottom-skirt', shoes: 'shoes-sneakers',
    hat: null, glasses: null, necklace: null, bag: null,
  };

  const state = {
    outfit: cleanOutfit(store.get('outfit', null)),
    colors: store.get('colors', {}),
    skin: store.get('skin', SKIN_TONES[0]),
    stars: store.get('stars', 0),
    learned: new Set(store.get('learned', [])),
    tab: 'hair',
    selected: null,
    mode: 'dress',
    quiz: null,   // Level 1 question
    cmd: null,    // Level 2 command
    card: { en: 'Hello!', ro: 'Salut!' },
  };
  state.selected = state.outfit.hair;

  const el = {
    doll: $('#doll'), stage: $('#stage'), tabs: $('#tabs'), grid: $('#grid'),
    palette: $('#palette'), paletteTitle: $('#paletteTitle'), skins: $('#skins'),
    wordEn: $('#wordEn'), wordRo: $('#wordRo'), phrase: $('#phrase'),
    sayEn: $('#sayEn'), sayRo: $('#sayRo'), cardWord: $('#cardWord'), cardQuiz: $('#cardQuiz'),
    quizText: $('#quizText'), quizHint: $('#quizHint'), stars: $('#stars'), learned: $('#learned'),
    noVoice: $('#noVoice'),
  };

  /* ---------- Speech ---------- */
  const voices = { en: null, ro: null };
  const canSpeak = 'speechSynthesis' in window;

  function pickVoices() {
    if (!canSpeak) return;
    const all = speechSynthesis.getVoices();
    const en = all.filter((v) => /^en[-_]/i.test(v.lang));
    const preferred = ['Samantha', 'Google US English', 'Karen', 'Serena', 'Moira', 'Tessa', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Zira'];
    voices.en = preferred.map((n) => en.find((v) => v.name.includes(n))).find(Boolean)
      || en.find((v) => /en[-_]US/i.test(v.lang)) || en[0] || null;
    voices.ro = all.find((v) => /^ro/i.test(v.lang)) || null;
    el.sayRo.hidden = !voices.ro;
  }

  function speak(text, lang = 'en') {
    if (!canSpeak || !text) return;
    if (!voices.en) pickVoices(); // iPad Safari can load voices late
    // Safari can silently drop a speak() that comes right after cancel(), so only cancel when needed.
    if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices[lang];
    if (v) u.voice = v;
    u.lang = v ? v.lang : (lang === 'en' ? 'en-US' : 'ro-RO');
    u.rate = 0.85;   // a bit slower for kids
    u.pitch = 1.1;
    speechSynthesis.speak(u);
  }

  /* ---------- Helpers ---------- */
  function cleanOutfit(saved) {
    const o = { ...DEFAULT_OUTFIT };
    if (saved && typeof saved === 'object') {
      for (const slot of Object.keys(o)) {
        const id = saved[slot];
        if (id === null && slot !== 'hair') o[slot] = null;
        else if (ITEM[id] && ITEM[id].slot === slot) o[slot] = id;
      }
    }
    fixOutfit(o);
    return o;
  }

  // A dress replaces the bottom.
  function fixOutfit(o) {
    if (o.top && ITEM[o.top].covers) o.bottom = null;
  }

  const isWorn = (id) => Object.values(state.outfit).includes(id);

  function colorOf(item) {
    const saved = item.cat === 'hair' ? state.colors.hair : state.colors[item.id];
    return /^#[0-9a-f]{6}$/i.test(saved || '') ? saved : item.color;
  }

  function wordOf(target) {
    return target.type === 'item' ? ITEM[target.id] : PART[target.id];
  }

  function save() {
    store.set('outfit', state.outfit);
    store.set('colors', state.colors);
    store.set('skin', state.skin);
    store.set('stars', state.stars);
    store.set('learned', [...state.learned]);
  }

  function learn(key) {
    state.learned.add(key);
    el.learned.textContent = state.learned.size;
    save();
  }

  /* ---------- Language ---------- */
  // Romanian adjective form: [m/n singular, f singular, m plural, f/n plural]
  function roAdj(item, color) {
    if (item.cat === 'hair') return color.ro;
    return color.ro[item.plural ? (item.g === 'm' ? 2 : 3) : (item.g === 'f' ? 1 : 0)];
  }

  /* "a red dress" = "o rochie roșie" */
  function phraseEn(item, color) {
    const noun = item.cat === 'hair' ? 'hair' : item.en;
    const words = `${color.en} ${noun}`;
    if (item.cat === 'hair' || item.plural) return words;
    return (/^[aeiou]/i.test(color.en) ? 'an ' : 'a ') + words;
  }
  function phraseRo(item, color) {
    if (item.cat === 'hair') return `păr ${color.ro}`;
    const article = item.plural ? '' : (item.g === 'f' ? 'o ' : 'un ');
    return `${article}${item.ro} ${roAdj(item, color)}`;
  }

  /* Wardrobe verbs: put on / take off (and give / take away for the bag). */
  function verbPhrase(item, on) {
    if (item.slot === 'bag') {
      return on
        ? { verb: 'give', en: 'Give her the bag!', ro: 'Dă-i geanta!', doneEn: 'You gave her the bag!', doneRo: 'I-ai dat geanta!' }
        : { verb: 'take away', en: 'Take away the bag!', ro: 'Ia-i geanta!', doneEn: 'You took away the bag!', doneRo: 'I-ai luat geanta!' };
    }
    if (on) {
      const [cmd, past] = RO_PUT_ON[item.cat];
      return { verb: 'put on', en: `Put on the ${item.en}!`, ro: `${cmd} ${item.roDef}!`, doneEn: `You put on the ${item.en}!`, doneRo: `${past} ${item.roDef}!` };
    }
    return { verb: 'take off', en: `Take off the ${item.en}!`, ro: `Dă-i jos ${item.roDef}!`, doneEn: `You took off the ${item.en}!`, doneRo: `I-ai dat jos ${item.roDef}!` };
  }

  // Bold the verb at the start of a sentence: "<b>Put on</b> the hat!"
  const verbHtml = (sentence, verb) => `<b class="verb">${sentence.slice(0, verb.length)}</b>${sentence.slice(verb.length)}`;

  /* ---------- Rendering ---------- */
  function renderDoll() {
    const parts = Object.fromEntries(LAYERS.map((l) => [l, '']));
    parts.body = BODY;
    parts.face = FACE;
    for (const id of Object.values(state.outfit)) {
      if (!id) continue;
      const item = ITEM[id];
      for (const [layer, svg] of Object.entries(item.layers)) {
        parts[layer] += `<g data-item="${id}" style="color:${colorOf(item)}">${svg}</g>`;
      }
    }
    el.doll.innerHTML = LAYERS.map((l) => `<g class="layer-${l}">${parts[l]}</g>`).join('');
  }

  function thumbSvg(item) {
    if (item.cat === 'hair') {
      return item.layers.hairBack
        + '<ellipse class="skin" cx="150" cy="112" rx="50" ry="56"/>'
        + FACE + item.layers.hairFront;
    }
    return LAYERS.map((l) => item.layers[l] || '').join('');
  }

  function renderTabs() {
    el.tabs.innerHTML = CATEGORIES.map((c) => `
      <button class="tab ${c.id === state.tab ? 'on' : ''}" data-tab="${c.id}" aria-pressed="${c.id === state.tab}">
        <span class="ico" aria-hidden="true">${c.icon}</span><span class="t-en">${c.en}</span>
      </button>`).join('');
  }

  function renderCloset() {
    el.grid.innerHTML = ITEMS.filter((i) => i.cat === state.tab).map((i) => `
      <button class="item ${isWorn(i.id) ? 'worn' : ''} ${state.selected === i.id ? 'sel' : ''}" data-id="${i.id}" aria-label="${i.en}">
        <svg viewBox="${i.box}" style="color:${colorOf(i)}" aria-hidden="true">${thumbSvg(i)}</svg>
        <span class="label">${i.en}</span>
      </button>`).join('');
  }

  function renderPalette() {
    const item = ITEM[state.selected];
    const list = item && item.cat === 'hair' ? HAIR_COLORS : COLORS;
    const current = item ? colorOf(item).toLowerCase() : '';
    el.paletteTitle.innerHTML = item
      ? `Colors for <b>${item.en}</b> <span class="ro-small">· Culori</span>`
      : 'Colors <span class="ro-small">· Culori</span>';
    el.palette.innerHTML = list.map((c) => `
      <button class="swatch ${c.hex.toLowerCase() === current ? 'on' : ''}" data-color="${c.id}" aria-label="${c.en}">
        <span class="dot" style="background:${c.hex}"></span><span class="label">${c.en}</span>
      </button>`).join('');
  }

  function renderSkins() {
    el.skins.innerHTML = SKIN_TONES.map((s) => `
      <button class="skin-btn ${s === state.skin ? 'on' : ''}" data-skin="${s}" style="background:${s}" aria-label="Skin tone"></button>`).join('');
  }

  function renderStats() {
    el.stars.textContent = state.stars;
    el.learned.textContent = state.learned.size;
  }

  function renderAll() {
    document.documentElement.style.setProperty('--skin', state.skin);
    renderDoll(); renderTabs(); renderCloset(); renderPalette(); renderSkins(); renderStats();
  }

  function showWord(en, ro, phrase = '', speakEn = en, speakRo = ro) {
    state.card = { en: speakEn, ro: speakRo };
    el.wordEn.textContent = en;
    el.wordRo.textContent = ro;
    el.phrase.innerHTML = phrase;
    animate(el.cardWord, 'pop');
  }

  function animate(node, cls) {
    node.classList.remove(cls);
    void node.getBoundingClientRect();
    node.classList.add(cls);
  }

  function celebrate() {
    const bits = ['⭐', '✨', '💖', '🌟', '🎀'];
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.textContent = bits[i % bits.length];
      s.style.left = (25 + Math.random() * 50) + '%';
      s.style.top = (30 + Math.random() * 30) + '%';
      s.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px');
      s.style.setProperty('--dy', (-60 - Math.random() * 160) + 'px');
      el.stage.appendChild(s);
      setTimeout(() => s.remove(), 1200);
    }
  }

  /* ---------- Wardrobe changes (shared by tap, drag and Level 2) ---------- */
  function putOn(item) {
    const o = state.outfit;
    o[item.slot] = item.id;
    if (item.slot === 'bottom' && o.top && ITEM[o.top].covers) o.top = null; // jeans replace the dress
    fixOutfit(o);
  }

  function takeOff(item) {
    if (item.cat === 'hair' || state.outfit[item.slot] !== item.id) return false;
    state.outfit[item.slot] = null;
    return true;
  }

  // Called after something was put on or taken off.
  function afterChange(item, on) {
    state.selected = item.id;
    state.tab = item.cat;
    renderAll(); save();
    animate(el.doll, 'bounce');
    if (state.mode === 'do') {
      if (!checkCommand()) speak(item.en);
      return;
    }
    if (item.cat === 'hair') {
      showWord(item.en, item.ro, '<span class="muted">Tap a color 🎨</span>');
    } else {
      const v = verbPhrase(item, on);
      const en = lowerFirst(v.en.replace('!', ''));
      showWord(item.en, item.ro, `${verbHtml(en, v.verb)} <span class="eq">=</span> ${lowerFirst(v.ro.replace('!', ''))}`);
      learn('verb:' + v.verb);
    }
    speak(item.en);
    learn('item:' + item.id);
  }

  /* ---------- Input: taps ---------- */
  function onItemTap(id) {
    const item = ITEM[id];
    if (state.mode === 'find') return quizAnswer({ type: 'item', id });
    // Tap to put on, tap again to take off (hair always stays).
    if (isWorn(id) && item.cat !== 'hair') { takeOff(item); afterChange(item, false); }
    else { putOn(item); afterChange(item, true); }
  }

  function onDollItemTap(id) {
    const item = ITEM[id];
    if (state.mode === 'find') return quizAnswer({ type: 'item', id });
    state.selected = id;
    state.tab = item.cat;
    renderTabs(); renderCloset(); renderPalette();
    speak(item.en);
    if (state.mode === 'dress') {
      showWord(item.en, item.ro, '<span class="muted">Tap a color 🎨 or drag it off 👋</span>');
      learn('item:' + id);
    }
  }

  function onColor(colorId) {
    const item = ITEM[state.selected];
    if (!item) return;
    const isHair = item.cat === 'hair';
    const color = (isHair ? HAIR_COLORS : COLORS).find((c) => c.id === colorId);
    if (isHair) state.colors.hair = color.hex; else state.colors[item.id] = color.hex;
    if (!isWorn(item.id)) putOn(item);
    renderAll(); save();
    animate(el.doll, 'bounce');
    const en = phraseEn(item, color);
    const ro = phraseRo(item, color);
    if (state.mode === 'do') {
      if (!checkCommand()) speak(en);
      return;
    }
    showWord(color.en, isHair ? color.ro : color.ro[0], `<b>${en}</b> <span class="eq">=</span> ${ro}`, en, ro);
    speak(en);
    learn('color:' + color.en);
  }

  function onBodyPart(id) {
    if (state.mode === 'find') return quizAnswer({ type: 'body', id });
    const p = PART[id];
    speak(p.en);
    if (state.mode === 'dress') {
      showWord(p.en, p.ro, '<span class="muted">Part of the body · Parte a corpului</span>');
      learn('body:' + id);
    }
  }

  function onTab(id) {
    state.tab = id;
    const first = ITEMS.find((i) => i.cat === id && isWorn(i.id)) || ITEMS.find((i) => i.cat === id);
    state.selected = first.id;
    renderTabs(); renderCloset(); renderPalette();
    if (state.mode === 'dress') {
      const c = CAT[id];
      showWord(c.en, c.ro);
      speak(c.en);
      learn('cat:' + id);
    }
  }

  function surprise() {
    const ofSlot = (slot) => ITEMS.filter((i) => i.slot === slot);
    const o = state.outfit;
    for (const slot of ['hair', 'top', 'bottom', 'shoes']) o[slot] = pick(ofSlot(slot)).id;
    for (const slot of ['hat', 'glasses', 'necklace', 'bag']) o[slot] = Math.random() < 0.4 ? pick(ofSlot(slot)).id : null;
    fixOutfit(o);
    state.colors = { hair: pick(HAIR_COLORS).hex };
    for (const id of Object.values(o)) if (id && ITEM[id].cat !== 'hair' && Math.random() < 0.6) state.colors[id] = pick(COLORS).hex;
    state.selected = ITEMS.find((i) => i.cat === state.tab && isWorn(i.id))?.id || o.hair;
    showWord('Ta-da!', 'Ta-da!');
    speak('Ta-da! You look great!');
    renderAll(); save();
    celebrate(); animate(el.doll, 'bounce');
  }

  function resetDoll() {
    state.outfit = { ...DEFAULT_OUTFIT };
    state.colors = {};
    state.selected = ITEMS.find((i) => i.cat === state.tab && isWorn(i.id))?.id || state.outfit.hair;
    showWord("Let's start again!", 'Hai s-o luăm de la capăt!');
    speak("Let's start again!");
    renderAll(); save();
  }

  /* ---------- Level 1: Listen & find ---------- */
  function quizPool() {
    const o = state.outfit;
    const items = ITEMS.map((i) => ({ type: 'item', id: i.id }));
    const parts = BODY_PARTS
      .filter((b) => !(b.id === 'arm' && o.top === 'top-sweater'))
      .filter((b) => !(b.id === 'eye' && o.glasses)) // lenses cover the eyes
      .filter((b) => !(b.id === 'leg' && o.bottom === 'bottom-jeans' && o.shoes === 'shoes-boots'))
      .map((b) => ({ type: 'body', id: b.id }));
    return [...items, ...parts];
  }

  function nextQuestion() {
    const last = state.quiz && state.quiz.target;
    const target = pick(quizPool().filter((t) => !last || t.id !== last.id));
    state.quiz = { target, tries: 0, done: false };
    if (target.type === 'item') {
      state.tab = ITEM[target.id].cat;
      state.selected = null;
      renderTabs(); renderCloset();
    }
    el.quizText.innerHTML = target.type === 'item'
      ? '🎧 Listen and <b>find it</b> in the closet!'
      : '🎧 Listen and <b>touch it</b> on the doll!';
    hideHint();
    askFind();
  }

  function askFind() {
    const t = state.quiz.target;
    speak(t.type === 'item' ? `Find the ${wordOf(t).en}!` : `Touch the ${wordOf(t).en}!`);
  }

  function quizAnswer(answer) {
    const q = state.quiz;
    if (!q || q.done) return;
    const w = wordOf(answer);
    if (answer.type === q.target.type && answer.id === q.target.id) {
      q.done = true;
      win(`⭐ Yes! <b>${w.en}</b>`, `🇷🇴 ${w.ro}`, `Yes! ${w.en}! Great job!`);
      learn((answer.type === 'item' ? 'item:' : 'body:') + answer.id);
      if (answer.type === 'item') { putOn(ITEM[answer.id]); state.selected = answer.id; renderAll(); save(); }
      setTimeout(() => { if (state.mode === 'find' && state.quiz === q) nextQuestion(); }, 2800);
    } else {
      q.tries += 1;
      animate(el.cardQuiz, 'shake');
      const plural = answer.type === 'item' && w.plural;
      speak(`${plural ? 'No, those are the' : "No, that's the"} ${w.en}. Try again!`);
      if (q.tries >= 2) showHint();
    }
  }

  /* ---------- Level 2: Do it (verbs) ---------- */
  const signature = () => JSON.stringify([state.outfit, state.colors]);
  const clothesOn = () => ['top', 'bottom', 'shoes'].filter((s) => state.outfit[s]).length;
  const dressedRemaining = () => {
    const o = state.outfit;
    const dress = o.top && ITEM[o.top].covers;
    return (o.top ? 0 : 1) + (o.bottom || dress ? 0 : 1) + (o.shoes ? 0 : 1);
  };

  function makeCommand() {
    const wearables = ITEMS.filter((i) => i.cat !== 'hair');
    const notWorn = wearables.filter((i) => !isWorn(i.id));
    const worn = wearables.filter((i) => isWorn(i.id));
    const options = [];

    if (notWorn.length) options.push([3, () => {
      const item = pick(notWorn);
      return { ...verbPhrase(item, true), remaining: () => (isWorn(item.id) ? 0 : 1) };
    }]);

    if (worn.length) options.push([3, () => {
      const item = pick(worn);
      return { ...verbPhrase(item, false), remaining: () => (isWorn(item.id) ? 1 : 0) };
    }]);

    options.push([2, () => {
      const item = pick(ITEMS.filter((i) => isWorn(i.id)));
      const isHair = item.cat === 'hair';
      const current = colorOf(item).toLowerCase();
      const color = pick((isHair ? HAIR_COLORS : COLORS).filter((c) => c.hex.toLowerCase() !== current));
      const noun = isHair ? 'hair' : item.en;
      const plural = !isHair && item.plural;
      const adj = roAdj(item, color);
      return {
        verb: 'make', select: item.id,
        en: `Make the ${noun} ${color.en}!`, ro: `Fă ${item.roDef} ${adj}!`,
        doneEn: `Now the ${noun} ${plural ? 'are' : 'is'} ${color.en}!`, doneRo: `Acum ${item.roDef} ${plural ? 'sunt' : 'e'} ${adj}!`,
        remaining: () => (isWorn(item.id) && colorOf(item).toLowerCase() === color.hex.toLowerCase() ? 0 : 1),
      };
    }]);

    options.push([1, () => {
      const slot = state.outfit.shoes ? pick(['shoes', 'hair']) : 'hair';
      const start = state.outfit[slot];
      const txt = slot === 'shoes'
        ? { en: 'Change her shoes!', ro: 'Schimbă-i pantofii!', doneEn: 'You changed her shoes!', doneRo: 'I-ai schimbat pantofii!' }
        : { en: 'Change her hair!', ro: 'Schimbă-i coafura!', doneEn: 'You changed her hair!', doneRo: 'I-ai schimbat coafura!' };
      return { verb: 'change', ...txt, remaining: () => (state.outfit[slot] && state.outfit[slot] !== start ? 0 : 1) };
    }]);

    if (clothesOn() >= 2) options.push([0.8, () => ({
      verb: 'undress', en: 'Undress the doll!', ro: 'Dezbracă păpușa!',
      doneEn: 'You undressed the doll!', doneRo: 'Ai dezbrăcat păpușa!', remaining: clothesOn,
    })]);

    if (dressedRemaining() > 0) options.push([1.5, () => ({
      verb: 'dress', en: 'Dress the doll!', ro: 'Îmbracă păpușa!',
      doneEn: 'You dressed the doll!', doneRo: 'Ai îmbrăcat păpușa!', remaining: dressedRemaining,
    })]);

    let r = Math.random() * options.reduce((sum, [w]) => sum + w, 0);
    for (const [w, make] of options) { if ((r -= w) <= 0) return make(); }
    return options[0][1]();
  }

  function nextCommand() {
    let cmd;
    do { cmd = makeCommand(); } while (cmd.remaining() === 0);
    Object.assign(cmd, { done: false, misses: 0, sig: signature(), last: cmd.remaining() });
    state.cmd = cmd;
    if (cmd.select) { state.selected = cmd.select; state.tab = ITEM[cmd.select].cat; }
    renderTabs(); renderCloset(); renderPalette();
    el.quizText.innerHTML = '🎬 ' + verbHtml(cmd.en, cmd.verb);
    hideHint();
    speak(cmd.en);
  }

  // Returns true when the command was just completed.
  function checkCommand() {
    const c = state.cmd;
    if (!c || c.done) return false;
    const sig = signature();
    if (sig === c.sig) return false;
    c.sig = sig;
    const rem = c.remaining();
    if (rem === 0) {
      c.done = true;
      win(`⭐ <b>${c.doneEn}</b>`, `🇷🇴 ${c.doneRo}`, `Great! ${c.doneEn}`);
      learn('verb:' + c.verb);
      setTimeout(() => { if (state.mode === 'do' && state.cmd === c) nextCommand(); }, 3200);
      return true;
    }
    if (rem >= c.last) {
      c.misses += 1;
      animate(el.cardQuiz, 'shake');
      if (c.misses >= 2) showHint();
    }
    c.last = rem;
    return false;
  }

  /* ---------- Shared quiz card ---------- */
  function win(textHtml, hintHtml, spoken) {
    state.stars += 1;
    renderStats(); save();
    el.quizText.innerHTML = textHtml;
    el.quizHint.innerHTML = hintHtml;
    el.quizHint.hidden = false;
    celebrate(); animate(el.doll, 'bounce');
    speak(spoken);
  }

  function hideHint() { el.quizHint.hidden = true; el.quizHint.textContent = ''; }

  // Looking at the Romanian has a price: say the English 3 times out loud (see practice.js).
  function showHint() {
    let task = null;   // the question or command being hinted
    let say = null;    // what she has to say: { en, ro }
    if (state.mode === 'do' && state.cmd) {
      task = state.cmd;
      el.quizHint.innerHTML = `🇷🇴 ${task.ro}`;
      say = { en: lowerFirst(task.en.replace('!', '')), ro: task.ro };
    } else if (state.quiz) {
      task = state.quiz;
      const w = wordOf(task.target);
      el.quizHint.innerHTML = `🇷🇴 <b>${w.ro}</b>${task.tries >= 3 ? ` &nbsp;·&nbsp; 🇬🇧 ${w.en}` : ''}`;
      say = { en: w.en, ro: w.ro };
    }
    el.quizHint.hidden = false;
    if (!task || task.done || task.practiced || Practice.isOpen) return;
    task.practiced = true;
    Practice.open(say, {
      speak,
      onDone: () => {
        learn('said:' + say.en);
        // Back to the game: repeat the question so she knows what to do next.
        if (state.mode === 'do' && state.cmd === task) speak(task.en);
        else if (state.mode === 'find' && state.quiz === task) askFind();
      },
    });
  }

  function setMode(mode) {
    state.mode = mode;
    document.body.classList.toggle('find', mode === 'find');
    document.body.classList.toggle('do', mode === 'do');
    document.querySelectorAll('[data-mode]').forEach((b) => {
      b.classList.toggle('on', b.dataset.mode === mode);
      b.setAttribute('aria-pressed', b.dataset.mode === mode);
    });
    el.cardWord.hidden = mode !== 'dress';
    el.cardQuiz.hidden = mode === 'dress';
    state.quiz = null;
    state.cmd = null;
    if (mode === 'find') nextQuestion();
    else if (mode === 'do') nextCommand();
    else {
      state.selected = ITEMS.find((i) => i.cat === state.tab && isWorn(i.id))?.id || state.outfit.hair;
      renderAll();
      showWord('Dress up!', 'Îmbracă păpușa!', '<span class="muted">Tap or drag clothes onto the doll!</span>');
      speak('Dress up!');
    }
  }

  /* ---------- Input: drag & drop ----------
   * Mouse: drag starts after a small move.
   * Touch: press and hold ~0.2s, then drag (a quick swipe still scrolls the page).
   * Drop on the doll = put on. Drag off the doll = take off.
   */
  let drag = null;
  let suppressClick = false;

  function overStage() {
    const r = el.stage.getBoundingClientRect();
    return drag.x >= r.left && drag.x <= r.right && drag.y >= r.top && drag.y <= r.bottom;
  }

  function startDrag() {
    if (!drag || drag.active) return;
    clearTimeout(drag.timer);
    drag.active = true;
    const item = ITEM[drag.id];
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.innerHTML = `<svg viewBox="${item.box}" style="color:${colorOf(item)}">${thumbSvg(item)}</svg><span class="ghost-label"></span>`;
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    document.body.classList.add('dragging');
    if (drag.fromDoll) el.doll.querySelectorAll(`[data-item="${drag.id}"]`).forEach((g) => { g.style.opacity = '.3'; });
    navigator.vibrate?.(10);
    speak(item.en);
    moveGhost();
  }

  function moveGhost() {
    const item = ITEM[drag.id];
    const over = overStage();
    drag.ghost.style.transform = `translate(${drag.x}px, ${drag.y}px) translate(-50%, -60%)`;
    el.stage.classList.toggle('drop-on', !drag.fromDoll && over);
    let label = '';
    if (!drag.fromDoll && over) label = verbPhrase(item, true).verb;
    if (drag.fromDoll && !over) label = verbPhrase(item, false).verb;
    drag.ghost.querySelector('.ghost-label').textContent = label;
    drag.ghost.classList.toggle('has-label', !!label);
  }

  function endDrag() {
    if (!drag) return;
    clearTimeout(drag.timer);
    if (drag.ghost) drag.ghost.remove();
    el.stage.classList.remove('drop-on');
    document.body.classList.remove('dragging');
    if (drag.active && drag.fromDoll) el.doll.querySelectorAll(`[data-item="${drag.id}"]`).forEach((g) => { g.style.opacity = ''; });
    drag = null;
  }

  function drop() {
    const item = ITEM[drag.id];
    const over = overStage();
    const fromDoll = drag.fromDoll;
    // The browser fires one click right after this pointerup; swallow only that one.
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    endDrag();
    if (!fromDoll && over) { putOn(item); afterChange(item, true); }
    else if (fromDoll && !over && takeOff(item)) afterChange(item, false);
  }

  document.addEventListener('pointerdown', (e) => {
    if (state.mode === 'find' || e.button > 0) return;
    const src = e.target.closest('#grid [data-id], #doll [data-item]');
    if (!src) return;
    const fromDoll = !src.dataset.id;
    const id = src.dataset.id || src.dataset.item;
    if (fromDoll && ITEM[id].cat === 'hair') return; // hair stays on
    endDrag();
    drag = { id, fromDoll, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, mouse: e.pointerType === 'mouse', active: false };
    if (!drag.mouse) drag.timer = setTimeout(startDrag, 200);
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.active) return moveGhost();
    const dist = Math.hypot(drag.x - drag.x0, drag.y - drag.y0);
    if (drag.mouse && dist > 6) startDrag();
    else if (!drag.mouse && dist > 10) endDrag(); // quick swipe = scroll, not drag
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return;
    if (drag.active) { drag.x = e.clientX; drag.y = e.clientY; drop(); } else endDrag();
  });
  window.addEventListener('pointercancel', endDrag);
  // Stop the page from scrolling while a finger is dragging an item.
  document.addEventListener('touchmove', (e) => { if (drag && drag.active) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', (e) => { if (e.target.closest('.item, #doll')) e.preventDefault(); });
  // A drop must not also count as a tap.
  window.addEventListener('click', (e) => {
    if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); }
  }, true);

  /* ---------- Input: clicks ---------- */
  el.grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) onItemTap(b.dataset.id);
  });
  el.tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) onTab(b.dataset.tab);
  });
  el.palette.addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (b) onColor(b.dataset.color);
  });
  el.skins.addEventListener('click', (e) => {
    const b = e.target.closest('[data-skin]');
    if (!b) return;
    state.skin = b.dataset.skin;
    renderAll(); save();
  });
  el.doll.addEventListener('click', (e) => {
    const target = e.target.closest('[data-item], [data-word]');
    if (!target) return;
    if (target.dataset.item) onDollItemTap(target.dataset.item);
    else onBodyPart(target.dataset.word);
  });
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  el.sayEn.addEventListener('click', () => speak(state.card.en));
  el.wordEn.addEventListener('click', () => speak(state.card.en));
  el.sayRo.addEventListener('click', () => speak(state.card.ro, 'ro'));
  $('#quizAgain').addEventListener('click', () => {
    if (state.mode === 'do' && state.cmd) speak(state.cmd.done ? state.cmd.doneEn : state.cmd.en);
    else if (state.quiz) askFind();
  });
  $('#quizHintBtn').addEventListener('click', showHint);
  $('#quizSkip').addEventListener('click', () => (state.mode === 'do' ? nextCommand() : nextQuestion()));
  $('#random').addEventListener('click', surprise);
  $('#reset').addEventListener('click', resetDoll);

  /* ---------- Start ---------- */
  if (canSpeak) {
    pickVoices();
    speechSynthesis.addEventListener?.('voiceschanged', pickVoices);
  } else {
    el.noVoice.hidden = false;
  }
  renderAll();

  // Offline support (needs https or localhost; silently skipped elsewhere).
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable, game still works */ });
  }
})();
