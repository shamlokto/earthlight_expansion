// The Azoras Kai's own art (expansion type 78), written to js/art/azoraskai.js.
//   python3 tools/art/azoraskai-xai.py && node tools/art/azoraskai-xai.mjs
// The picture, the fight hulls and the board tokens come from images generated with xAI's image
// model (tools/art/xai-gen.py; prompts and the chosen sources in tools/art/azoraskai/), reduced by
// tools/art/azoraskai-xai.py (azoraskai/azoraskai-art.json). The map icon is the hand-placed one in
// tools/art/kai-icons.mjs (`azorasKai`); `iconArt` is the same grid in the ship's own colours
// (units.json ownColors): each region letter takes its colour's ramp at the tool's shade.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SRC, ICONS } from './kai-icons.mjs';

// iconArt palette: 0 clear, 1 outline, pearl 2-5, gold 6-8, crimson 9-10, gunmetal 11-12, cyan 13, white 14
const PAL = ['#000000', '#100c18', '#6b6b84', '#a5a5bd', '#d6d6e7', '#f4f1e8', '#8c5a00', '#d69c10', '#ffd65a', '#6b0818', '#b5182e', '#3a3a4a', '#6b6b7b', '#5ad6ff', '#ffffff'];
// region letter -> ramp (lightest last) indexed by the army-row shade 2..6 (2 light, 6 dark)
const RAMP = { a: [5, 4, 3, 3, 2], b: [8, 7, 7, 6, 6], c: [10, 10, 9, 9, 9], d: [8, 8, 7, 7, 6], e: [12, 12, 11, 11, 11], f: [12, 12, 11, 11, 11] };
const LIT = { 1: 14, 2: 13, 6: 9 };   // literal colour numbers in the grid: white, cyan glass, crimson

function iconArt() {
  const g = SRC.azorasKai, ic = ICONS.azorasKai;
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
  const az = JSON.parse(readFileSync(new URL('./azoraskai/azoraskai-art.json', import.meta.url), 'utf8'));
  writeFileSync(new URL('../../js/art/azoraskai.js', import.meta.url), `// The Azoras Kai's own art (expansion type 78), written by tools/art/azoraskai-xai.mjs; original
// art, not from the ROM. The picture, the fight hulls and the board token come from images
// generated with xAI's image model; the map icon is hand-placed (tools/art/kai-icons.mjs). Rows of
// base-36 colour numbers: the picture's own palette; the map icon's numbers in the map icons' army
// rows (1-7); the board token's and the fight hulls' in the ships' fight rows. \`hull\` is the
// broadside drawn against craft, \`hull2\` the top-down hull drawn against ships.
export const AZORAS_KAI = {
  art: ${pic(az.art)},
  icon: { w: 24, h: 16,
    rows: ${rows(ICONS.azorasKai.rows)} },
  token: ${pic(az.token, false)},
  hull: ${pic(az.hull, false)},
  hull2: ${pic(az.hull2, false)},
  // the fight hulls in full colour, three times larger, for the modern fight renderer
  hullArt: ${pic(az.hullArt)},
  hull2Art: ${pic(az.hull2Art)},
  // the map icon and the board token in the picture's own colours (units.json ownColors)
  iconArt: ${pic(iconArt())},
  tokenArt: ${pic(az.tokenArt)},
  // how the modern renderer draws its shots, per weapon slot (visual only)
  shots: { 0: 'missile', 1: 'redBeam' },
};
`);
  console.log('wrote js/art/azoraskai.js');
}
