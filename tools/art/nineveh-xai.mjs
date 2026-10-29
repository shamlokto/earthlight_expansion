// The Nineveh's own art (expansion type 77, Ahriman's fortress ship, the hidden boss), written to
// js/art/nineveh.js:
//   python3 tools/art/nineveh-xai.py && node tools/art/nineveh-xai.mjs
// The unit-info picture, the fight hull (classic, in the ships' fight-row colours, and three times
// larger in full colour for the modern renderer) and the board token come from pictures generated
// with xAI's image model (tools/art/nineveh/, p-*.txt), reduced by tools/art/nineveh-xai.py
// (parts.json). The map icons (24x16) are placed here pixel by pixel after the generated side view: the
// army-row icon (colour numbers 1-7) and the full-colour one (ownColors). The design: Babylon's
// sister, a flying citadel of obsidian and emerald with gold battlements, a crowned spire, four
// gold-white engines and Babylon's main cannon in the bow, whose muzzle blazes white-gold (its
// shots: js/render/fightfx.js, 'nvCannon').
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encode } from './raster.mjs';

// The citadel ship facing right in the 24x16 frame, placed pixel by pixel (shapes blur at this size):
// roles per cell, painted in order (later wins), then outlined. Roles: h hull (shaded light at the
// top to dark below), t terraces, g gold, s spire, e engine glow, c cannon, m muzzle.
const PARTS = [
  ['h', 2, 8, 19, 13], ['h', 3, 14, 17, 14], ['h', 20, 9, 20, 12],   // the long hull, its bow sloping
  ['t', 4, 6, 17, 7], ['g', 4, 6, 17, 6],                              // the lower terrace, gold edge
  ['t', 7, 4, 14, 5], ['g', 7, 4, 14, 4],                              // the upper terrace
  ['s', 10, 1, 11, 3], ['g', 9, 0, 9, 0], ['g', 12, 0, 12, 0], ['g', 10, 0, 11, 0],   // the crowned spire
  ['g', 3, 8, 19, 8],                                                  // the battlement line
  ['e', 0, 9, 1, 9], ['e', 0, 11, 1, 11], ['e', 0, 13, 1, 13],         // the engines
  ['g', 4, 11, 4, 11], ['g', 7, 11, 7, 11], ['g', 10, 11, 10, 11], ['g', 13, 11, 13, 11], ['g', 16, 11, 16, 11],   // gun ports
  ['c', 19, 10, 21, 11], ['g', 19, 9, 19, 12],                         // Babylon's cannon and its gold band
  ['m', 22, 9, 23, 12],                                                // the blazing muzzle
];
function grid() {
  const g = Array.from({ length: 16 }, () => new Array(24).fill(null));
  for (const [r, x0, y0, x1, y1] of PARTS) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = r;
  return g;
}
// colour numbers per role: army rows (1 white, 2-6 light to dark, 7 outline) or the full-colour palette
const SHADES = {
  icon: { h: (y) => (y <= 9 ? 4 : y <= 11 ? 5 : 6), t: () => 3, g: () => 2, s: () => 3, e: () => 1, c: (y) => (y === 10 ? 3 : 4), m: (y) => (y === 10 || y === 11 ? 1 : 2), line: 7 },
  art: { h: (y) => (y <= 9 ? 5 : y <= 11 ? 4 : 3), t: () => 6, g: () => 9, s: () => 8, e: () => 12, c: (y) => (y === 10 ? 6 : 5), m: (y) => (y === 10 || y === 11 ? 13 : 11), line: 1 },
};
// the full-colour icon's palette: 0 clear, 1 outline, 2-6 obsidian and emerald (dark to light),
// 7-9 gold, 10-12 white-gold glow, 13 white
export const ICON_PALETTE = ['#000000', '#05080a', '#0d1513', '#14261f', '#1d3d2c', '#2b5a3c', '#3f7a50',
  '#7a5214', '#c9921f', '#ffd35a', '#ffe9a0', '#fff4cc', '#fffbe8', '#ffffff'];
function paint(kind) {
  const g = grid(), S = SHADES[kind], px = new Uint8Array(24 * 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) if (g[y][x]) px[y * 24 + x] = S[g[y][x]](y);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) {
    if (g[y][x]) continue;
    if ([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => g[y + dy]?.[x + dx])) px[y * 24 + x] = S.line;
  }
  return { w: 24, h: 16, px };
}
export const icon = () => paint('icon');
export const iconArt = () => paint('art');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const P = JSON.parse(readFileSync(new URL('./nineveh/parts.json', import.meta.url), 'utf8'));
  const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
  const ic = icon(), ica = iconArt();
  const out = `// The Nineveh's own art (expansion type 77, the hidden boss), written by tools/art/nineveh-xai.mjs;
// original art, not from the ROM. The picture, the fight hull and the board token were generated
// with xAI's image model and reduced to rows of base-36 colour numbers: the picture's own palette;
// the map icon's numbers in the map icons' army rows (1-7); the fight hull's in the ships' fight
// rows (2-7 hull, 8-11 the gold trim, engines and the cannon's muzzle). Babylon's cannon's muzzle
// sits at (${P.muzzle.join(', ')}) in the hull's box, where the Nodens's recorded beam leaves
// (fightfx.js starts the Nineveh's shots there).
export const NINEVEH = {
  art: { w: ${P.art.w}, h: ${P.art.h}, palette: ${JSON.stringify(P.art.palette)},
    rows: ${rows(P.art.rows)} },
  icon: { w: 24, h: 16,
    rows: ${rows(encode(ic))} },
  hull: { w: ${P.hull.w}, h: ${P.hull.h},
    rows: ${rows(P.hull.rows)} },
  // in the picture's own colours (units.json ownColors): map icon, board token, and the fight hull
  // three times larger for the modern fight renderer
  iconArt: { w: 24, h: 16, palette: ${JSON.stringify(ICON_PALETTE)},
    rows: ${rows(encode(ica))} },
  tokenArt: { w: ${P.tokenArt.w}, h: ${P.tokenArt.h}, palette: ${JSON.stringify(P.tokenArt.palette)},
    rows: ${rows(P.tokenArt.rows)} },
  hullArt: { w: ${P.hullArt.w}, h: ${P.hullArt.h}, palette: ${JSON.stringify(P.hullArt.palette)},
    rows: ${rows(P.hullArt.rows)} },
  // its shots (js/render/fightfx.js, by the weapon really fired): the batteries' fan of gold beams
  // and Babylon's cannon, from the muzzle; the missiles as a homing swarm
  shots: { 0: 'nvCannon', 1: 'nvCannon', 2: 'missile' },
  muzzle: ${JSON.stringify(P.muzzle)},
};
`;
  writeFileSync(new URL('../../js/art/nineveh.js', import.meta.url), out);
  console.log('wrote js/art/nineveh.js');
}
