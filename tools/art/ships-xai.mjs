// The Azoras's (type 61) and the Selene Kai's (type 58) own art, written to js/art/azoras.js and
// js/art/selenekai.js; supersedes tools/art/azoras.mjs and tools/art/selene-kai.mjs.
//   python3 tools/art/ships-xai.py && node tools/art/ships-xai.mjs
// The pictures, fight hulls and board tokens come from images generated with xAI's image model
// (tools/art/xai-gen.py; prompts and the chosen sources in tools/art/azoras/ and
// tools/art/selenekai/), reduced by tools/art/ships-xai.py (<unit>-art.json). The map icons are
// drawn here from shapes (tools/art/raster.mjs) after the generated top views, since 24x16 needs
// every pixel placed: colour numbers 1-7 of the map icons' army rows, facing right; the Azoras's
// also in its own colours (`iconArt`, units.json ownColors).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, render, encode } from './raster.mjs';

// icon rows: 1 white, 2-6 light to dark, 7 near black. Ramps darkest first.
const ROWS = { hull: [5, 4, 3, 2], pale: [4, 3, 2, 1], trim: [6, 5, 4], dark: [6, 5], glass: [3, 2, 1], light: [2], barrel: [4], out: 7 };
// the Azoras's own colours for `iconArt`: pearl, gold, pink, gunmetal, cyan
const AZ_PAL = ['#000000', '#100c18', '#6b6b84', '#a5a5bd', '#d6d6e7', '#ffffff', '#bd8400', '#ffbd00', '#ffe784', '#9c1863', '#e7398c', '#3a3a4a', '#6b6b7b', '#0073c6', '#5ad6ff'];
const AZ_FULL = { hull: [2, 3, 4, 5], pale: [3, 4, 5, 5], trim: [6, 7, 8], dark: [11, 12], glass: [13, 14, 5], pink: [9, 10], light: [8], barrel: [12], out: 1 };

// the Azoras from above, bow right: the armoured drum drawn out into the needle prow, forward-swept
// wings out to the twin wing cannons, the engine block at the stern
const azoras = (P) => [
  { shape: union(capsule(1.5, 6.5, 4, 6.5, 1.3), capsule(1.5, 9.5, 4, 9.5, 1.3)), ramp: P.dark, bevel: 1 },
  { shape: union(poly([[5, 6], [11, 6], [15, 2], [10, 2]]), poly([[5, 10], [11, 10], [15, 14], [10, 14]])), ramp: P.hull, bevel: 1 },
  { shape: union(capsule(14, 2, 21, 2, 1.2), capsule(14, 14, 21, 14, 1.2)), ramp: P.dark, bevel: 1 },
  { shape: union(capsule(9, 2, 14, 2, 1.6), capsule(9, 14, 14, 14, 1.6)), ramp: P.pale, bevel: 1 },
  { shape: union(capsule(3.5, 8, 15, 8, 3.3), poly([[23.5, 8], [15, 6], [15, 10]])), ramp: P.pale, bevel: 2, dome: 1 },
  { shape: capsule(5, 8, 21, 8, 0.6), ramp: P.pink || P.trim, bevel: 1, line: false },
];
// one-pixel barrels and turret dots drawn last: [x0, x1, y, role]
const AZ_LINES = [[15, 21, 2, 'barrel'], [15, 21, 14, 'barrel']];

// the Selene Kai from above, bow right: the arrowhead hull, the launch rails on the wingtips
// reaching past the bow, twin engine nacelles, the canopy
const seleneKai = (P) => [
  { shape: union(capsule(1.5, 5.5, 6, 5.5, 1.6), capsule(1.5, 10.5, 6, 10.5, 1.6)), ramp: P.trim, bevel: 1 },
  { shape: poly([[22, 8], [5, 1.5], [3, 1.5], [6, 8], [3, 14.5], [5, 14.5]]), ramp: P.hull, bevel: 2, dome: 1 },
  { shape: union(capsule(4, 2, 22, 2, 1.2), capsule(4, 14, 22, 14, 1.2)), ramp: P.trim, bevel: 1 },
  { shape: ellipse(11, 8, 3.2, 2), ramp: P.glass, bevel: 1, dome: 1 },
];

const SK_LINES = [[5, 21, 2, 'light'], [5, 21, 14, 'light']];

function icon(parts, lines, P) {
  const img = render(24, 16, parts(P), { outline: P.out, cel: true, smooth: 0 });
  for (const [x0, x1, y, role] of lines) for (let x = x0; x <= x1; x++) img.px[Math.round(y) * 24 + x] = P[role][0];
  return img;
}

const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
const pic = (e, pal = true) => `{ w: ${e.w}, h: ${e.h},${pal && e.palette ? ` palette: ${JSON.stringify(e.palette)},` : ''}\n    rows: ${rows(e.rows)} }`;
const load = (u) => JSON.parse(readFileSync(new URL(`./${u}/${u}-art.json`, import.meta.url), 'utf8'));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sk = load('selenekai'), az = load('azoras');
  writeFileSync(new URL('../../js/art/selenekai.js', import.meta.url), `// The Selene Kai's own art (expansion type 58), written by tools/art/ships-xai.mjs; original art,
// not from the ROM. The picture, the fight hull and the board token come from images generated with
// xAI's image model; the map icon is drawn from shapes. Rows of base-36 colour numbers: the
// picture's own palette; the map icon's numbers in the map icons' army rows (1-7); the board
// token's and the fight hull's in the ships' fight rows. \`hullArt\` is the fight hull in full
// colour, three times larger, for the modern fight renderer.
export const SELENE_KAI = {
  art: ${pic(sk.art)},
  icon: { w: 24, h: 16,
    rows: ${rows(encode(icon(seleneKai, SK_LINES, ROWS)))} },
  token: ${pic(sk.token, false)},
  hull: ${pic(sk.hull, false)},
  hullArt: ${pic(sk.hullArt)},
};
`);
  writeFileSync(new URL('../../js/art/azoras.js', import.meta.url), `// The Azoras's own art (expansion type 61), written by tools/art/ships-xai.mjs; original art, not
// from the ROM. The picture, the fight hulls and the board token come from images generated with
// xAI's image model; the map icon is drawn from shapes. Rows of base-36 colour numbers: the
// picture's own palette; the map icon's numbers in the map icons' army rows (1-7); the board
// token's and the fight hulls' in the ships' fight rows. \`hull\` is the broadside drawn against
// craft, \`hull2\` the top-down hull drawn against ships.
export const AZORAS = {
  art: ${pic(az.art)},
  icon: { w: 24, h: 16,
    rows: ${rows(encode(icon(azoras, AZ_LINES, ROWS)))} },
  token: ${pic(az.token, false)},
  hull: ${pic(az.hull, false)},
  hull2: ${pic(az.hull2, false)},
  // the fight hulls in full colour, three times larger, for the modern fight renderer
  hullArt: ${pic(az.hullArt)},
  hull2Art: ${pic(az.hull2Art)},
  // the map icon and the board token in the picture's own colours (units.json ownColors)
  iconArt: { w: 24, h: 16, palette: ${JSON.stringify(AZ_PAL)},
    rows: ${rows(encode(icon(azoras, AZ_LINES, AZ_FULL)))} },
  tokenArt: ${pic(az.tokenArt)},
  // how the modern renderer draws its shots, per weapon slot (visual only)
  shots: { 0: 'missile', 1: 'redBeam' },
};
`);
  console.log('wrote js/art/selenekai.js, js/art/azoras.js');
}
