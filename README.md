# Dress & Learn 👗🇬🇧🇷🇴

A browser POC: kids dress up a doll and learn English words, with Romanian translations.

## Play it

**Live:** https://vandriesh.github.io/dress-and-learn/ (GitHub Pages, deployed on every push to `main`).

On the iPad: open the link in Safari → Share → **Add to Home Screen**. It opens full-screen like an app and
**works offline** after the first visit (`sw.js` keeps a copy; updates arrive on the next launch while online).

iPad voices: Settings → Accessibility → Spoken Content → Voices → download an *Enhanced* English voice
(e.g. Samantha) and the Romanian voice (Ioana) to enable the 🇷🇴 🔊 button.

## Develop

Open `index.html` directly in Chrome or Safari (no build step). To test on a device on your Wi-Fi: `./serve.sh`.

To publish a change: commit and push to `main`. If you add or remove files, also update the `FILES`
list in `sw.js` and bump its `VERSION`.

## What's in it

- **Dress up**: 5 hairstyles, 4 tops (incl. dress), 3 bottoms, 3 shoes, 7 accessories, 4 skin tones.
- **Every tap speaks English** (browser speech, no audio files) and shows the Romanian word.
- **Colors teach phrases**: "a red dress = o rochie roșie", "blue jeans = blugi albaștri"
  (Romanian gender/plural agreement is built into the data).
- **Tap the doll** for body parts: eye, nose, mouth, ear, hand, leg…
- **Drag & drop**: drag clothes onto the doll to put them on, drag them off to take them off.
  While dragging, a label shows the verb ("put on", "take off"). Touch: press and hold briefly, then drag.
  Phones keep the doll pinned on top so it's always a drop target.
- **Level 1 · Find it**: hears "Find the boots!" / "Touch the nose!", labels are hidden, stars for right answers,
  hints in Romanian after 2 misses.
- **Level 2 · Do it** (verbs): "Put on the hat!", "Take off the boots!", "Give her the bag!", "Take away the bag!",
  "Make the dress red!", "Change her shoes!", "Undress the doll!", "Dress the doll!".
  Success is said in the past tense ("You took off the boots!" = "I-ai dat jos cizmele!").
  Romanian uses the right verb per item: îmbracă-i (clothes), încalță-i (shoes), pune-i (accessories).
- Progress (outfit, stars, words heard) is saved in the browser.
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
