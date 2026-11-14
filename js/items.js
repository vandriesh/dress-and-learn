/* Dress & Learn — all game content lives here.
 * Every wearable item is plain SVG drawn on a 300×560 canvas.
 * `currentColor` is the item's colour, so recolouring is just changing CSS `color`.
 *
 * Romanian grammar fields:
 *   g      — gender: 'm' (masculin), 'f' (feminin), 'n' (neutru)
 *   plural — true if the word is plural (jeans → blugi, boots → cizme)
 * They are used to build phrases like "a red dress = o rochie roșie".
 */

const SKIN_TONES = ['#ffe0c7', '#f3c29b', '#c98d62', '#8d5a3b'];

/* Romanian colour forms: [m/n singular, f singular, m plural, f/n plural] */
const COLORS = [
  { id: 'red',    en: 'red',    hex: '#ef4444', ro: ['roșu', 'roșie', 'roșii', 'roșii'] },
  { id: 'pink',   en: 'pink',   hex: '#f472b6', ro: ['roz', 'roz', 'roz', 'roz'] },
  { id: 'orange', en: 'orange', hex: '#fb923c', ro: ['portocaliu', 'portocalie', 'portocalii', 'portocalii'] },
  { id: 'yellow', en: 'yellow', hex: '#facc15', ro: ['galben', 'galbenă', 'galbeni', 'galbene'] },
  { id: 'green',  en: 'green',  hex: '#22c55e', ro: ['verde', 'verde', 'verzi', 'verzi'] },
  { id: 'blue',   en: 'blue',   hex: '#3b82f6', ro: ['albastru', 'albastră', 'albaștri', 'albastre'] },
  { id: 'purple', en: 'purple', hex: '#a855f7', ro: ['mov', 'mov', 'mov', 'mov'] },
  { id: 'white',  en: 'white',  hex: '#f8fafc', ro: ['alb', 'albă', 'albi', 'albe'] },
  { id: 'black',  en: 'black',  hex: '#1f2937', ro: ['negru', 'neagră', 'negri', 'negre'] },
  { id: 'brown',  en: 'brown',  hex: '#92400e', ro: ['maro', 'maro', 'maro', 'maro'] },
];

/* Hair uses its own colour words ("blonde", "red hair" = "păr roșcat"). */
const HAIR_COLORS = [
  { id: 'h-blonde', en: 'blonde', hex: '#f2c94c', ro: 'blond' },
  { id: 'h-brown',  en: 'brown',  hex: '#7a4a24', ro: 'castaniu' },
  { id: 'h-black',  en: 'black',  hex: '#2b2024', ro: 'negru' },
  { id: 'h-red',    en: 'red',    hex: '#c8562b', ro: 'roșcat' },
  { id: 'h-pink',   en: 'pink',   hex: '#f58ab8', ro: 'roz' },
  { id: 'h-blue',   en: 'blue',   hex: '#5aa9e6', ro: 'albastru' },
  { id: 'h-purple', en: 'purple', hex: '#9b6bd6', ro: 'mov' },
];

const CATEGORIES = [
  { id: 'hair',   en: 'Hair',        ro: 'Păr',               icon: '💇‍♀️' },
  { id: 'top',    en: 'Tops',        ro: 'Bluze',             icon: '👚' },
  { id: 'bottom', en: 'Bottoms',     ro: 'Fuste și pantaloni', icon: '👖' },
  { id: 'shoes',  en: 'Shoes',       ro: 'Pantofi',           icon: '👟' },
  { id: 'acc',    en: 'Accessories', ro: 'Accesorii',         icon: '👑' },
];

/* Tap a body part on the doll to hear it. */
const BODY_PARTS = [
  { id: 'face',  en: 'face',  ro: 'față' },
  { id: 'eye',   en: 'eye',   ro: 'ochi' },
  { id: 'nose',  en: 'nose',  ro: 'nas' },
  { id: 'mouth', en: 'mouth', ro: 'gură' },
  { id: 'cheek', en: 'cheek', ro: 'obraz' },
  { id: 'ear',   en: 'ear',   ro: 'ureche' },
  { id: 'neck',  en: 'neck',  ro: 'gât' },
  { id: 'arm',   en: 'arm',   ro: 'braț' },
  { id: 'hand',  en: 'hand',  ro: 'mână' },
  { id: 'leg',   en: 'leg',   ro: 'picior' },
];

/* ---------- SVG helpers ---------- */
const C = 'currentColor';
// Draw a left-side shape and mirror it for the right side (shoes, pigtails…)
const pair = (svg) => svg + `<g transform="translate(300 0) scale(-1 1)">${svg}</g>`;
const shade = (d, o = 0.1) => `<path d="${d}" fill="#000" opacity="${o}"/>`;
const SHINE = `<path d="M118 62 Q138 54 160 56" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".35"/>`;
const BANGS = `<path d="M99 116 Q96 50 150 48 Q204 50 201 116 Q197 86 180 74 Q164 94 126 88 Q110 92 99 116 Z" fill="${C}"/>`;
const CAP = `<path d="M100 104 Q98 50 150 48 Q202 50 200 104 Z" fill="${C}"/>`;
const curls = (list) => list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C}"/>`).join('');

/* ---------- The doll ---------- */
const BODY = `
  <ellipse cx="150" cy="548" rx="80" ry="11" fill="#5b3550" opacity=".10"/>
  <line class="limb" data-word="leg" x1="137" y1="318" x2="135" y2="526" stroke-width="22"/>
  <line class="limb" data-word="leg" x1="163" y1="318" x2="165" y2="526" stroke-width="22"/>
  <ellipse class="skin" data-word="leg" cx="131" cy="534" rx="15" ry="9"/>
  <ellipse class="skin" data-word="leg" cx="169" cy="534" rx="15" ry="9"/>
  <line class="limb" data-word="arm" x1="117" y1="202" x2="93" y2="314" stroke-width="17"/>
  <line class="limb" data-word="arm" x1="183" y1="202" x2="207" y2="314" stroke-width="17"/>
  <circle class="skin" data-word="hand" cx="91" cy="324" r="12"/>
  <circle class="skin" data-word="hand" cx="209" cy="324" r="12"/>
  <path class="skin" d="M112 192 Q150 182 188 192 L182 300 Q150 306 118 300 Z"/>
  <path class="skin" d="M118 294 L182 294 L190 344 Q150 352 110 344 Z"/>
  <path d="M114 196 Q150 188 186 196 L184 346 Q150 352 116 346 Z" fill="#fdf2f8"/>
  <rect class="skin" data-word="neck" x="140" y="150" width="20" height="44" rx="8"/>
  <circle class="skin" data-word="ear" cx="100" cy="120" r="10"/>
  <circle class="skin" data-word="ear" cx="200" cy="120" r="10"/>
  <ellipse class="skin" data-word="face" cx="150" cy="112" rx="50" ry="56"/>
`;

const FACE = `
  <path d="M121 101 Q131 95 140 100 M160 100 Q169 95 179 101" stroke="#6b4a3a" stroke-width="3" stroke-linecap="round" fill="none"/>
  <g data-word="eye">
    <circle cx="131" cy="120" r="14" fill="transparent"/>
    <ellipse cx="131" cy="120" rx="7.5" ry="9.5" fill="#3b2a3a"/>
    <circle cx="133.5" cy="116" r="2.8" fill="#fff"/>
    <path d="M123 113 L118 109 M126 110 L124 104" stroke="#3b2a3a" stroke-width="2" stroke-linecap="round"/>
  </g>
  <g data-word="eye">
    <circle cx="169" cy="120" r="14" fill="transparent"/>
    <ellipse cx="169" cy="120" rx="7.5" ry="9.5" fill="#3b2a3a"/>
    <circle cx="171.5" cy="116" r="2.8" fill="#fff"/>
    <path d="M177 113 L182 109 M174 110 L176 104" stroke="#3b2a3a" stroke-width="2" stroke-linecap="round"/>
  </g>
  <circle data-word="cheek" cx="118" cy="139" r="9" fill="#ff8fab" opacity=".45"/>
  <circle data-word="cheek" cx="182" cy="139" r="9" fill="#ff8fab" opacity=".45"/>
  <g data-word="nose">
    <circle cx="150" cy="132" r="8" fill="transparent"/>
    <path d="M147 131 Q150 135 153 131" stroke="#c98b74" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>
  <g data-word="mouth">
    <rect x="134" y="140" width="32" height="18" fill="transparent"/>
    <path d="M138 145 Q150 158 162 145 Q150 150 138 145 Z" fill="#e0457b"/>
  </g>
`;

/* ---------- Wardrobe ----------
 * slot:   where it goes on the doll (one item per slot)
 * layers: SVG per drawing layer (see LAYERS in game.js)
 * box:    viewBox used for the closet thumbnail
 */
const ITEMS = [
  /* Hair */
  {
    id: 'hair-long', cat: 'hair', slot: 'hair', en: 'long hair', ro: 'păr lung', color: '#7a4a24', box: '40 10 220 230',
    layers: {
      hairBack: `<path d="M98 108 Q94 44 150 44 Q206 44 202 108 L216 252 Q200 272 178 262 Q150 274 122 262 Q100 272 84 252 Z" fill="${C}"/>`,
      hairFront: BANGS + SHINE,
    },
  },
  {
    id: 'hair-short', cat: 'hair', slot: 'hair', en: 'short hair', ro: 'păr scurt', color: '#2b2024', box: '40 10 220 230',
    layers: {
      hairBack: `<path d="M92 110 Q90 42 150 42 Q210 42 208 110 L210 170 Q204 184 190 178 L110 178 Q96 184 90 170 Z" fill="${C}"/>`,
      hairFront: `<path d="M99 108 Q94 46 150 44 Q206 46 201 108 Q198 92 188 82 Q156 100 116 84 Q104 94 99 108 Z" fill="${C}"/>` + SHINE,
    },
  },
  {
    id: 'hair-pigtails', cat: 'hair', slot: 'hair', en: 'pigtails', ro: 'codițe', plural: true, color: '#f2c94c', box: '40 10 220 230',
    layers: {
      hairBack: CAP + pair(`<path d="M98 98 Q58 118 66 196 Q72 224 88 200 Q94 160 108 112 Z" fill="${C}"/>`),
      hairFront: BANGS + SHINE + pair(`<circle cx="100" cy="106" r="7" fill="#ff4f8b"/>`),
    },
  },
  {
    id: 'hair-bun', cat: 'hair', slot: 'hair', en: 'bun', ro: 'coc', color: '#c8562b', box: '40 10 220 230',
    layers: {
      hairBack: `<circle cx="150" cy="42" r="28" fill="${C}"/>` + CAP,
      hairFront: `<path d="M99 114 Q96 52 150 50 Q204 52 201 114 Q192 76 150 72 Q108 76 99 114 Z" fill="${C}"/>` + SHINE,
    },
  },
  {
    id: 'hair-curly', cat: 'hair', slot: 'hair', en: 'curly hair', ro: 'păr creț', color: '#2b2024', box: '40 10 220 230',
    layers: {
      hairBack: curls([[104, 78, 24], [128, 56, 24], [150, 48, 24], [172, 56, 24], [196, 78, 24], [96, 108, 22], [204, 108, 22],
        [92, 140, 22], [208, 140, 22], [96, 172, 20], [204, 172, 20], [108, 196, 18], [192, 196, 18]]),
      hairFront: curls([[112, 80, 16], [132, 68, 17], [154, 64, 17], [175, 70, 16], [192, 84, 14], [104, 98, 12], [196, 100, 12]]),
    },
  },

  /* Tops */
  {
    id: 'top-tshirt', cat: 'top', slot: 'top', en: 'T-shirt', ro: 'tricou', g: 'n', color: '#ff7aa8', box: '70 170 160 160',
    layers: {
      top: `
        <line x1="117" y1="202" x2="106" y2="246" stroke="${C}" stroke-width="27" stroke-linecap="round"/>
        <line x1="183" y1="202" x2="194" y2="246" stroke="${C}" stroke-width="27" stroke-linecap="round"/>
        <path d="M110 190 Q150 180 190 190 L187 310 Q150 318 113 310 Z" fill="${C}"/>
        ${shade('M113 296 Q150 304 187 296 L187 310 Q150 318 113 310 Z', 0.08)}
        <path class="skin" d="M137 185 Q150 204 163 185 Z"/>
        <path d="M150 236 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2 z" fill="#fff" opacity=".85"/>`,
    },
  },
  {
    id: 'top-shirt', cat: 'top', slot: 'top', en: 'shirt', ro: 'cămașă', g: 'f', color: '#7cc4ff', box: '70 170 160 160',
    layers: {
      top: `
        <circle cx="114" cy="207" r="17" fill="${C}"/><circle cx="186" cy="207" r="17" fill="${C}"/>
        <path d="M110 190 Q150 180 190 190 L186 306 Q150 314 114 306 Z" fill="${C}"/>
        <path class="skin" d="M137 185 Q150 200 163 185 Z"/>
        <path d="M150 200 L132 184 L126 204 Z M150 200 L168 184 L174 204 Z" fill="#fff"/>
        <circle cx="150" cy="222" r="3.5" fill="#fff"/><circle cx="150" cy="246" r="3.5" fill="#fff"/><circle cx="150" cy="270" r="3.5" fill="#fff"/>`,
    },
  },
  {
    id: 'top-sweater', cat: 'top', slot: 'top', en: 'sweater', ro: 'pulover', g: 'n', color: '#b48cf2', box: '70 170 160 170',
    layers: {
      top: `
        <line x1="117" y1="202" x2="94" y2="306" stroke="${C}" stroke-width="24" stroke-linecap="round"/>
        <line x1="183" y1="202" x2="206" y2="306" stroke="${C}" stroke-width="24" stroke-linecap="round"/>
        <line x1="95" y1="301" x2="94" y2="308" stroke="#000" opacity=".14" stroke-width="24" stroke-linecap="round"/>
        <line x1="205" y1="301" x2="206" y2="308" stroke="#000" opacity=".14" stroke-width="24" stroke-linecap="round"/>
        <path d="M108 190 Q150 178 192 190 L190 322 Q150 330 110 322 Z" fill="${C}"/>
        ${shade('M110 308 Q150 316 190 308 L190 322 Q150 330 110 322 Z', 0.12)}
        <path class="skin" d="M139 185 Q150 199 161 185 Z"/>
        <path d="M136 184 Q150 204 164 184" stroke="#000" opacity=".15" stroke-width="5" fill="none"/>
        <path d="M150 262 C150 254 138 250 138 258 C138 266 150 272 150 276 C150 272 162 266 162 258 C162 250 150 254 150 262 Z" fill="#fff" opacity=".85"/>`,
    },
  },
  {
    id: 'top-dress', cat: 'top', slot: 'top', en: 'dress', ro: 'rochie', g: 'f', covers: ['bottom'], color: '#ff6b8b', box: '60 170 180 300',
    layers: {
      top: `
        <circle cx="115" cy="205" r="15" fill="${C}"/><circle cx="185" cy="205" r="15" fill="${C}"/>
        <path d="M111 190 Q150 180 189 190 L182 292 Q150 298 118 292 Z" fill="${C}"/>
        <path class="skin" d="M136 185 Q150 204 164 185 Z"/>
        <path d="M120 286 Q150 292 180 286 L230 438 Q150 462 70 438 Z" fill="${C}"/>
        ${shade('M74 426 Q150 450 226 426 L230 438 Q150 462 70 438 Z', 0.1)}
        <path d="M132 300 L110 440 M150 302 L150 452 M168 300 L190 440" stroke="#000" opacity=".07" stroke-width="3"/>
        <path d="M118 284 Q150 292 182 284 L183 296 Q150 304 117 296 Z" fill="#fff" opacity=".55"/>
        <circle cx="122" cy="350" r="4" fill="#fff" opacity=".7"/><circle cx="176" cy="340" r="4" fill="#fff" opacity=".7"/>
        <circle cx="150" cy="380" r="4" fill="#fff" opacity=".7"/><circle cx="104" cy="410" r="4" fill="#fff" opacity=".7"/>
        <circle cx="196" cy="404" r="4" fill="#fff" opacity=".7"/>`,
    },
  },

  /* Bottoms */
  {
    id: 'bottom-skirt', cat: 'bottom', slot: 'bottom', en: 'skirt', ro: 'fustă', g: 'f', color: '#ffb347', box: '70 280 160 140',
    layers: {
      bottom: `
        <path d="M115 290 L185 290 L214 398 Q150 414 86 398 Z" fill="${C}"/>
        ${shade('M115 290 L185 290 L186 302 L114 302 Z', 0.12)}
        <path d="M134 304 L120 404 M150 304 L150 408 M166 304 L180 404" stroke="#000" opacity=".08" stroke-width="3"/>`,
    },
  },
  {
    id: 'bottom-jeans', cat: 'bottom', slot: 'bottom', en: 'jeans', ro: 'blugi', g: 'm', plural: true, color: '#3d6fb6', box: '90 282 120 245',
    layers: {
      bottom: `
        <line x1="137" y1="330" x2="134" y2="514" stroke="${C}" stroke-width="30" stroke-linecap="round"/>
        <line x1="163" y1="330" x2="166" y2="514" stroke="${C}" stroke-width="30" stroke-linecap="round"/>
        <path d="M114 290 L186 290 L193 352 L107 352 Z" fill="${C}"/>
        ${shade('M114 290 L186 290 L187 300 L113 300 Z', 0.15)}
        <path d="M150 300 L150 344 M120 306 Q128 318 140 306 M160 306 Q172 318 180 306" stroke="#fff" opacity=".35" stroke-width="2" fill="none"/>`,
    },
  },
  {
    id: 'bottom-shorts', cat: 'bottom', slot: 'bottom', en: 'shorts', ro: 'pantaloni scurți', g: 'm', plural: true, color: '#4fc3a1', box: '90 282 120 120',
    layers: {
      bottom: `
        <line x1="137" y1="330" x2="136" y2="384" stroke="${C}" stroke-width="32" stroke-linecap="round"/>
        <line x1="163" y1="330" x2="164" y2="384" stroke="${C}" stroke-width="32" stroke-linecap="round"/>
        <path d="M114 290 L186 290 L193 352 L107 352 Z" fill="${C}"/>
        ${shade('M114 290 L186 290 L187 300 L113 300 Z', 0.15)}
        <path d="M150 300 L150 344" stroke="#fff" opacity=".35" stroke-width="2"/>`,
    },
  },

  /* Shoes */
  {
    id: 'shoes-sneakers', cat: 'shoes', slot: 'shoes', en: 'sneakers', ro: 'pantofi sport', g: 'm', plural: true, color: '#ff5d73', box: '96 500 108 56',
    layers: {
      shoes: pair(`
        <path d="M149 540 Q151 518 133 516 Q116 515 111 532 L110 542 L149 542 Z" fill="${C}"/>
        <rect x="106" y="539" width="46" height="8" rx="4" fill="#fff"/>
        <path d="M126 522 L140 520 M124 528 L139 526" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`),
    },
  },
  {
    id: 'shoes-boots', cat: 'shoes', slot: 'shoes', en: 'boots', ro: 'cizme', g: 'f', plural: true, color: '#8b5a3c', box: '96 428 108 124',
    layers: {
      shoes: pair(`
        <path d="M123 438 L151 438 L151 546 L104 546 Q102 530 123 524 Z" fill="${C}"/>
        <rect x="121" y="436" width="32" height="12" rx="5" fill="#000" opacity=".15"/>
        <rect x="102" y="542" width="51" height="6" rx="3" fill="#3b2a3a"/>`),
    },
  },
  {
    id: 'shoes-sandals', cat: 'shoes', slot: 'shoes', en: 'sandals', ro: 'sandale', g: 'f', plural: true, color: '#f6c453', box: '96 508 108 44',
    layers: {
      shoes: pair(`
        <path d="M110 546 Q108 534 120 532 L144 532 Q152 534 152 546 Z" fill="${C}"/>
        <path d="M118 532 L136 522 L146 532" stroke="${C}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="136" cy="522" r="4" fill="#fff"/>`),
    },
  },

  /* Accessories */
  {
    id: 'acc-hat', cat: 'acc', slot: 'hat', optional: true, en: 'hat', ro: 'pălărie', g: 'f', color: '#ffd166', box: '55 15 190 80',
    layers: {
      hat: `
        <ellipse cx="150" cy="70" rx="90" ry="17" fill="${C}"/>
        <path d="M110 70 Q108 24 150 24 Q192 24 190 70 Z" fill="${C}"/>
        <path d="M110 56 Q150 64 190 56 L190 68 Q150 76 110 68 Z" fill="#ff4f8b"/>
        <circle cx="180" cy="60" r="8" fill="#fff"/><circle cx="180" cy="60" r="3" fill="#facc15"/>`,
    },
  },
  {
    id: 'acc-crown', cat: 'acc', slot: 'hat', optional: true, en: 'crown', ro: 'coroană', g: 'f', color: '#f5c518', box: '104 6 92 66',
    layers: {
      hat: `
        <path d="M114 64 L118 22 L134 44 L150 14 L166 44 L182 22 L186 64 Z" fill="${C}"/>
        <circle cx="118" cy="22" r="4" fill="${C}"/><circle cx="150" cy="14" r="4" fill="${C}"/><circle cx="182" cy="22" r="4" fill="${C}"/>
        <rect x="112" y="58" width="76" height="10" rx="4" fill="${C}"/>
        <rect x="112" y="58" width="76" height="10" rx="4" fill="#000" opacity=".12"/>
        <circle cx="150" cy="50" r="5" fill="#ef4444"/><circle cx="130" cy="54" r="3.5" fill="#3b82f6"/><circle cx="170" cy="54" r="3.5" fill="#22c55e"/>`,
    },
  },
  {
    id: 'acc-cap', cat: 'acc', slot: 'hat', optional: true, en: 'cap', ro: 'șapcă', g: 'f', color: '#ef4444', box: '88 26 124 70',
    layers: {
      hat: `
        <path d="M102 82 Q100 32 150 32 Q200 32 198 82 Z" fill="${C}"/>
        <path d="M96 80 Q150 70 204 80 Q208 94 150 92 Q92 94 96 80 Z" fill="${C}"/>
        <path d="M96 80 Q150 70 204 80 Q208 94 150 92 Q92 94 96 80 Z" fill="#000" opacity=".18"/>
        <circle cx="150" cy="34" r="5" fill="#000" opacity=".2"/>`,
    },
  },
  {
    id: 'acc-ribbon', cat: 'acc', slot: 'hat', optional: true, en: 'ribbon', ro: 'fundă', g: 'f', color: '#ff4f8b', box: '140 32 72 52',
    layers: {
      hat: `
        <path d="M176 56 L152 40 Q146 56 154 72 Z" fill="${C}"/>
        <path d="M176 56 L200 40 Q206 56 198 72 Z" fill="${C}"/>
        <circle cx="176" cy="56" r="7" fill="${C}"/><circle cx="176" cy="56" r="7" fill="#000" opacity=".15"/>`,
    },
  },
  {
    id: 'acc-glasses', cat: 'acc', slot: 'glasses', optional: true, en: 'glasses', ro: 'ochelari', g: 'm', plural: true, color: '#7b3fe4', box: '92 98 116 42',
    layers: {
      glasses: `
        <circle cx="131" cy="119" r="14" fill="#fff" opacity=".18"/><circle cx="169" cy="119" r="14" fill="#fff" opacity=".18"/>
        <g fill="none" stroke="${C}" stroke-width="4" stroke-linecap="round">
          <circle cx="131" cy="119" r="16"/><circle cx="169" cy="119" r="16"/>
          <path d="M147 117 Q150 112 153 117 M115 116 L101 112 M185 116 L199 112"/>
        </g>`,
    },
  },
  {
    id: 'acc-necklace', cat: 'acc', slot: 'necklace', optional: true, en: 'necklace', ro: 'colier', g: 'n', color: '#ffffff', box: '128 176 44 36',
    layers: {
      necklace: [[137, 186], [140.9, 191.1], [144.8, 194.4], [150, 196], [155.2, 194.4], [159.1, 191.1], [163, 186]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${C}" stroke="#000" stroke-opacity=".18"/>`).join('')
        + `<circle cx="150" cy="203" r="5" fill="${C}" stroke="#000" stroke-opacity=".18"/>`,
    },
  },
  {
    id: 'acc-bag', cat: 'acc', slot: 'bag', optional: true, en: 'bag', ro: 'geantă', g: 'f', color: '#f472b6', box: '182 312 56 74',
    layers: {
      bag: `
        <path d="M198 352 Q210 314 222 352" fill="none" stroke="${C}" stroke-width="4"/>
        <rect x="190" y="348" width="40" height="32" rx="8" fill="${C}"/>
        ${shade('M190 356 Q210 370 230 356 L230 356 L230 354 Q230 348 222 348 L198 348 Q190 348 190 354 Z', 0.12)}
        <circle cx="210" cy="362" r="3.5" fill="#fff"/>`,
    },
  },
];

/* Romanian with the definite article ("the hat" = "pălăria"), used in Level 2 commands. */
const RO_DEF = {
  'top-tshirt': 'tricoul', 'top-shirt': 'cămașa', 'top-sweater': 'puloverul', 'top-dress': 'rochia',
  'bottom-skirt': 'fusta', 'bottom-jeans': 'blugii', 'bottom-shorts': 'pantalonii scurți',
  'shoes-sneakers': 'pantofii sport', 'shoes-boots': 'cizmele', 'shoes-sandals': 'sandalele',
  'acc-hat': 'pălăria', 'acc-crown': 'coroana', 'acc-cap': 'șapca', 'acc-ribbon': 'funda',
  'acc-glasses': 'ochelarii', 'acc-necklace': 'colierul', 'acc-bag': 'geanta',
};
ITEMS.forEach((i) => { i.roDef = i.cat === 'hair' ? 'părul' : RO_DEF[i.id]; });

/* "Put on" is a different verb in Romanian depending on what you put on. [command, past] */
const RO_PUT_ON = {
  top: ['Îmbracă-i', 'I-ai îmbrăcat'],
  bottom: ['Îmbracă-i', 'I-ai îmbrăcat'],
  shoes: ['Încalță-i', 'I-ai încălțat'],
  acc: ['Pune-i', 'I-ai pus'],
};
