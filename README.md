# Dress & Learn 👗🇬🇧🇷🇴

A browser POC: kids dress up a doll and learn English words, with Romanian translations.

## Play it

**Live:** https://vandriesh.github.io/dress-and-learn/ (GitHub Pages, deployed on every push to `main`).

On the iPad: open the link in Safari → Share → **Add to Home Screen**. It opens full-screen like an app and
**works offline** after the first visit (`sw.js` keeps a copy; updates arrive on the next launch while online).

iPad voices: Settings → Accessibility → Spoken Content → Voices → download an *Enhanced* English voice
(e.g. Samantha) and the Romanian voice (Ioana) to enable the 🇷🇴 🔊 button.

## Develop

Open `index.html` directly in Chrome or Safari (no build step). Offline mode only runs over https (the live site) or localhost.

To publish a change: commit and push to `main`. If you add or remove files, also update the `FILES`
list in `sw.js` and bump its `VERSION`.

## What's in it

- **Dress up**: 5 hairstyles, 4 tops (incl. dress), 3 bottoms, 3 shoes, 7 accessories, 4 skin tones.
- **Every tap speaks English** (browser speech, no audio files) and shows the Romanian word.
- **Colors teach phrases**: "a red dress = o rochie roșie", "blue jeans = blugi albaștri"
  (Romanian gender/plural agreement is built into the data).
- **Tap the doll** for body parts: eye, nose, mouth, ear, hand, leg… Face parts are tiny for a child's finger, so
  the first tap on the head zooms in (no right/wrong yet; the 🔍 button also toggles it), and then a tap counts as
  the nearest face part, with the asked part winning close calls. Every question starts zoomed out.
- **Drag & drop**: drag clothes onto the doll to put them on, drag them off to take them off.
  While dragging, a label shows the verb ("put on", "take off"). Touch: press and hold briefly, then drag.
  Phones keep the doll pinned on top so it's always a drop target.
- **Level 1 · Find it**: hears "Find the boots!" / "Touch the nose!", labels are hidden, stars for right answers,
  hints in Romanian after 2 misses.
- **Level 2 · Do it** (verbs): "Put on the hat!", "Take off the boots!", "Give her the bag!", "Take away the bag!",
  "Make the dress red!", "Change her shoes!", "Undress the doll!", "Dress the doll!".
  Success is said in the past tense ("You took off the boots!" = "I-ai dat jos cizmele!").
  Romanian uses the right verb per item: îmbracă-i (clothes), încalță-i (shoes), pune-i (accessories).
- **Say it 3 times** (`js/practice.js`): looking at the Romanian hint in Level 1 or 2 locks the game until the kid
  says the English out loud 3 times (the word, or the action phrase like "take off the boots").
  Uses the browser's speech recognition (on iPad: Apple dictation). If the mic is blocked or
  recognition is unavailable, it falls back to an "✋ I said it!" button. Grown-ups can hold "skip" for 2 s.
- **Gauge (0–100)**: how clearly the words were understood, not accent. Built from which words were recognized
  (the item word and the action count double, a one-letter near miss counts half), whether it was the
  recognizer's first guess, and its confidence. Each word turns green / amber / grey after a try.
- **Strictness slider** (⚙️ in the header, for grown-ups) sets the pass mark shown on the gauge:
  Easy 30 (main word is enough, near misses count), Medium 65 (default: main word and action, said right),
  Hard 85 (every word, recognizer's first guess). E.g. "clown" for "crown" passes only Easy.
- Progress (outfit, stars, words heard and said) is saved in the browser.
- The 🔊 Romanian button shows only if the device has a Romanian voice (macOS/iOS: "Ioana").

## Files

- `js/items.js`: all content (clothes as SVG, words, translations, colors). Add new items here.
- `js/game.js`: game logic, speech, drag & drop, levels.
- `sw.js`: offline cache. `manifest.webmanifest` + `icons/`: home-screen app.
- `fonts/`: Fredoka (SIL Open Font License), bundled for offline use.
- `style.css`, `index.html`: layout.

## Next steps (ideas)

- Make it a PWA (manifest + service worker) so it installs on a tablet home screen and works offline.
- App Store later: wrap the same code with Capacitor; no rewrite needed.
- More vocabulary sets: weather/seasons outfits ("It's cold, put on a coat!"), numbers, family.
