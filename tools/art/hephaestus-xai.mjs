// The Hephaestus's own art (repair ship, expansion type 79), written to js/art/hephaestus.js.
//   python3 tools/art/hephaestus-xai.py && node tools/art/hephaestus-xai.mjs
// The picture, the fight hulls and the board tokens come from images generated with xAI's image
// model (tools/art/xai-gen.py; prompts and the chosen sources in tools/art/hephaestus/), reduced by
// tools/art/hephaestus-xai.py. The map icon is the hand-placed one in tools/art/kai-icons.mjs
// (`hephaestus`); `iconArt` is the same grid in the ship's own colours (units.json ownColors).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SRC, ICONS } from './kai-icons.mjs';

// iconArt palette: 0 clear, 1 outline, steel 2-5, hazard yellow 6-7, black 8, orange 9-10,
// green 11-12, cyan 13, white 14
const PAL = ['#000000', '#0e0e16', '#4a4e5a', '#7b808c', '#aab0bb', '#dfe3ea', '#c79a10', '#f2c832', '#1c1c22', '#b0501c', '#e8843a', '#1f8a3a', '#4ee06a', '#5ad6ff', '#ffffff'];
// region letter -> ramp (lightest first) indexed by the army-row shade 2..6 (2 light, 6 dark)
const RAMP = { a: [5, 4, 4, 3, 2], c: [10, 10, 9, 9, 9], d: [4, 4, 3, 3, 2], e: [3, 3, 2, 2, 2], g: [5, 4, 4, 3, 3], h: [10, 10, 10, 9, 9], y: [7, 7, 6, 6, 6], k: [8, 8, 8, 8, 8] };
const LIT = { 1: 12 };   // the repair cross: green

function iconArt() {
  const g = SRC.hephaestus, ic = ICONS.hephaestus;
  const rows = ic.rows.map((r, y) => [...r].map((v, x) => {
    v = +v; if (!v) return '0';
    if (v === 7) return '1';
    const ch = (g[y] || '')[x] || '.';
    if (/[1-7]/.test(ch)) return (LIT[ch] ?? 4).toString(36);
    return (RAMP[ch] || RAMP.a)[Math.max(0, Math.min(4, v - 2))].toString(36);
  }).join(''));
  return { w: 24, h: 16, palette: PAL, rows };
}

const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
const pic = (e, pal = true) => `{ w: ${e.w}, h: ${e.h},${pal && e.palette ? ` palette: ${JSON.stringify(e.palette)},` : ''}\n    rows: ${rows(e.rows)} }`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = JSON.parse(readFileSync(new URL('./hephaestus/hephaestus-art.json', import.meta.url), 'utf8'));
  writeFileSync(new URL('../../js/art/hephaestus.js', import.meta.url), `// The Hephaestus's own art (repair ship, expansion type 79), written by tools/art/hephaestus-xai.mjs;
// original art, not from the ROM. The picture, the fight hulls and the board token come from images
// generated with xAI's image model; the map icon is hand-placed (tools/art/kai-icons.mjs). Rows of
// base-36 colour numbers: the picture's own palette; the map icon's numbers in the map icons' army
// rows (1-7); the board token's and the fight hulls' in the ships' fight rows. \`hull\` is drawn
// against craft (bow up), \`hull2\` against ships (bow right).
export const HEPHAESTUS = {
  art: ${pic(a.art)},
  icon: { w: 24, h: 16,
    rows: ${rows(ICONS.hephaestus.rows)} },
  token: ${pic(a.token, false)},
  hull: ${pic(a.hull, false)},
  hull2: ${pic(a.hull2, false)},
  // the fight hulls in full colour, three times larger, for the modern fight renderer
  hullArt: ${pic(a.hullArt)},
  hull2Art: ${pic(a.hull2Art)},
  // the map icon and the board token in the picture's own colours (units.json ownColors)
  iconArt: ${pic(iconArt())},
  tokenArt: ${pic(a.tokenArt)},
};
`);
  console.log('wrote js/art/hephaestus.js');
}
