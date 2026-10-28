// SUPERSEDED (2026-10-28): js/art/selenekai.js is now written by tools/art/ships-xai.mjs from xAI-generated
// art; running this tool would put the old shape-drawn art back.
// The Selene Kai's own art (expansion type 58): original pixel art, drawn from the shapes below
// with tools/art/raster.mjs and written to js/art/selenekai.js as indexed rows.
//   node tools/art/selene-kai.mjs
// Three pictures: the unit-info picture (96x96, its own palette), the map icon (24x16, colour
// numbers 1-7 of the map icons' army rows, so it comes out pink or green like the ROM's icons),
// and the fight hull (64x128, colour numbers of the capital ships' fight palette rows; army B's
// row turns the same numbers green and red, as it does for the ROM's ships).
// The design: a sleeker, faster Selene. A swept arrowhead hull, a domed bridge with a beam
// turret on its spine, twin launch rails reaching past the bow, and a pair of engine nacelles.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, minus, render, encode } from './raster.mjs';

// ---------------------------------------------------------------- unit-info picture
export const ART_PALETTE = ['#7b7bde', '#000000', '#5a185a', '#9c399c', '#bd5abd', '#de7bde', '#ffb5ff', '#ff5abd', '#bd3984',
  '#397b5a', '#5a9c5a', '#9cff9c', '#d6ffd6', '#4a4a6b', '#8484a5', '#c6c6e7', '#0063bd', '#00b5ff', '#7bffff',
  '#ffbd00', '#bd8400', '#ff395a', '#ffffff', '#ff7b00'];
const BODY = [2, 3, 4, 5, 6], GREEN = [9, 10, 11, 12], METAL = [13, 14, 15], CYAN = [16, 17, 18], PINK = [8, 7], GOLD = [20, 19];

export function infoArt() {
  // the ship's frame: u forward (down-left on the picture), v to starboard (down-right)
  const C = [50, 44], F = [-0.8, 0.6], S = [0.6, 0.8];
  const toLocal = (x, y) => { const dx = x - C[0], dy = y - C[1]; return [dx * F[0] + dy * F[1], dx * S[0] + dy * S[1]]; };
  const side = (f) => union(f(1), f(-1));
  const parts = [
    // engine nacelles and their glow
    { shape: side((s) => capsule(-35, 13 * s, -12, 13 * s, 6.5)), ramp: METAL, bevel: 4, dome: 1 },
    { shape: side((s) => ellipse(-39, 13 * s, 3, 5.5)), ramp: [23, 19, 22], bevel: 2, dome: 1, bias: 0.3 },
    // launch rails, reaching past the bow
    { shape: side((s) => poly([[-10, 18 * s], [42, 17 * s], [47, 21 * s], [42, 26 * s], [-8, 28 * s]])), ramp: GREEN, bevel: 4, dome: 1 },
    { shape: side((s) => rect(36, (s > 0 ? 18 : -26), 41, (s > 0 ? 26 : -18))), ramp: GOLD, bevel: 2 },
    // the swept hull
    { shape: poly([[38, 0], [10, 18], [-20, 25], [-30, 21], [-20, 0], [-30, -21], [-20, -25], [10, -18]]), ramp: BODY, bevel: 16, dome: 1 },
    // Galt stripes along the leading edges
    { shape: side((s) => poly([[32, 3 * s], [8, 15 * s], [-14, 21 * s], [-13, 17.5 * s], [8, 11.5 * s], [30, 1 * s]])), ramp: PINK, bevel: 2, line: false },
    // wingtip lamps
    { shape: side((s) => ellipse(-24, 22 * s, 2.4, 2.4)), ramp: [21, 22], bevel: 1 },
    // the domed bridge, its canopy and the beam turret on the spine
    { shape: ellipse(-4, 0, 16, 12), ramp: BODY, bevel: 12, dome: 1, height: 1.6, bias: 0.05, spec: 0.8 },
    { shape: ellipse(7, 0, 5, 5), ramp: CYAN, bevel: 3, dome: 1, bias: 0.15 },
    { shape: ellipse(-8, 0, 5, 5), ramp: METAL, bevel: 3, dome: 1 },
    { shape: capsule(-8, 0, 16, 0, 1.6), ramp: [16, 18, 22], bevel: 1, bias: 0.2 },
    // the Galt emblem: a gold chevron behind the turret
    { shape: poly([[-14, 0], [-19, -5], [-17, -5], [-13, -1.5], [-13, 1.5], [-17, 5], [-19, 5]]), ramp: GOLD, bevel: 1, line: false },
  ];
  return render(96, 96, parts, { toLocal, bg: 0, outline: 1 });
}

// ---------------------------------------------------------------- map icon (facing right)
// colour numbers of the icon rows: 1 white, 2-6 light to dark, 7 near black
export function mapIcon() {
  const R = [6, 5, 4, 3, 2];
  const parts = [
    { shape: capsule(1.5, 4, 7, 4, 1.6), ramp: [6, 5], bevel: 1 },
    { shape: capsule(1.5, 12, 7, 12, 1.6), ramp: [6, 5], bevel: 1 },
    { shape: union(rect(5, 1.5, 22, 4), rect(5, 12, 22, 14.5)), ramp: [5, 3, 2], bevel: 1 },
    { shape: poly([[23.5, 8], [14, 4], [4, 3.5], [7, 8], [4, 12.5], [14, 12]]), ramp: R, bevel: 3, dome: 1 },
    { shape: ellipse(10, 8, 4.5, 3), ramp: [5, 3, 2, 1], bevel: 2, dome: 1, height: 1.5 },
    { shape: rect(13, 7.4, 19, 8.4), ramp: [1], flat: 1, line: false },
  ];
  return render(24, 16, parts, { outline: 7 });
}

// ---------------------------------------------------------------- fight hull (left side, facing right)
// colour numbers of the ships' fight rows: 2-7 hull (light to dark), 8-11 metal (dark to light)
export function fightHull() {
  const HULL = [7, 6, 5, 4, 3, 2], METAL2 = [8, 9, 10, 11];
  const side = (f) => union(f(1), f(-1)), cy = 64, RAILS = [11, 121];
  const parts = [
    // engine nacelles at the stern
    { shape: side((s) => capsule(2, cy + 30 * s, 22, cy + 30 * s, 8)), ramp: HULL, bevel: 5, dome: 1 },
    { shape: side((s) => ellipse(2, cy + 30 * s, 3, 6)), ramp: [9, 10, 11], bevel: 2, dome: 1, bias: 0.4 },
    // launch rails, above and below, centred where the Selene's barrels fire from (y 11 and 121
    // of the hull's box), so the recorded shots leave from the Kai's rails
    { shape: union(...RAILS.map((c) => poly([[8, c - 6], [60, c - 5], [64, c], [60, c + 5], [10, c + 6]]))), ramp: METAL2, bevel: 3, dome: 1 },
    { shape: union(...RAILS.map((c) => rect(14, c - 3, 22, c + 3))), ramp: HULL, bevel: 2 },
    // swept fins from the hull out to the rails
    { shape: union(...RAILS.map((c) => { const s = Math.sign(c - cy); return poly([[18, cy + 20 * s], [44, cy + 30 * s], [30, c - 2 * s], [6, c]]); })), ramp: HULL, bevel: 4, dome: 1, bias: -0.05 },
    // the arrowhead hull
    { shape: poly([[63, cy], [40, cy - 22], [14, cy - 28], [8, cy], [14, cy + 28], [40, cy + 22]]), ramp: HULL, bevel: 22, dome: 1 },
    // Galt stripe
    { shape: side((s) => poly([[58, cy + 2 * s], [38, cy + 18 * s], [20, cy + 23 * s], [20, cy + 20 * s], [37, cy + 15 * s], [55, cy + 1 * s]])), ramp: [4, 3], bevel: 1, line: false },
    // bridge dome with its window, and the beam turret
    { shape: ellipse(30, cy, 15, 17), ramp: HULL, bevel: 15, dome: 1, height: 1.2, spec: 0.8 },
    { shape: ellipse(39, cy, 5, 7), ramp: [8, 10, 11], bevel: 3, dome: 1, bias: 0.15 },
    { shape: ellipse(25, cy - 13, 5, 4), ramp: HULL, bevel: 3, dome: 1 },
    { shape: capsule(25, cy - 13, 58, cy - 13, 1.6), ramp: [9, 11], bevel: 1, bias: 0.3 },
  ];
  return render(64, 128, parts, { outline: 7 });
}

// ---------------------------------------------------------------- board token (facing right)
// The modern board's token: a larger, more detailed side view than the map icon, in the same
// fight-palette colour numbers as the hull.
export function boardToken() {
  const HULL = [7, 6, 5, 4, 3, 2], METAL2 = [8, 9, 10, 11], cy = 10.5;
  const parts = [
    // nacelles with their glow, the rails on struts, the hull, the bridge dome, window and turret
    { shape: union(capsule(2, cy - 4.5, 9, cy - 4.5, 2.4), capsule(2, cy + 4.5, 9, cy + 4.5, 2.4)), ramp: HULL, bevel: 2, dome: 1 },
    { shape: union(ellipse(1, cy - 4.5, 1.3, 1.9), ellipse(1, cy + 4.5, 1.3, 1.9)), ramp: [10, 11], bevel: 1, bias: 0.4, line: false },
    { shape: union(rect(11, cy - 8.5, 14, cy - 5), rect(11, cy + 5, 14, cy + 8.5)), ramp: HULL, bevel: 1 },
    { shape: union(...[cy - 8.5, cy + 8.5].map((c) => poly([[6, c - 1.8], [28, c - 1.6], [31.6, c], [28, c + 1.6], [7, c + 1.8]]))), ramp: METAL2, bevel: 2, dome: 1 },
    { shape: poly([[31, cy], [21, cy - 6], [9, cy - 6.5], [6, cy], [9, cy + 6.5], [21, cy + 6]]), ramp: HULL, bevel: 6, dome: 1 },
    { shape: ellipse(15, cy + 0.5, 6, 4.8), ramp: HULL, bevel: 5, dome: 1, height: 1.3, spec: 0.8 },
    { shape: ellipse(20, cy + 0.5, 1.8, 2.4), ramp: [8, 10, 11], bevel: 2, dome: 1, bias: 0.2 },
    { shape: capsule(12, cy - 3.4, 27, cy - 3.4, 0.7), ramp: [11], flat: 11, line: false },
  ];
  return render(32, 21, parts, { outline: 7 });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const art = infoArt(), icon = mapIcon(), hull = fightHull(), token = boardToken();
  const out = `// The Selene Kai's own art (expansion type 58), drawn by tools/art/selene-kai.mjs; original art,
// not from the ROM. Rows of base-36 colour numbers: the picture's own palette; the map icon's
// numbers in the map icons' army rows (1-7); the board token's and the fight hull's in the ships'
// fight rows.
export const SELENE_KAI = {
  art: { w: ${art.w}, h: ${art.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${JSON.stringify(encode(art), null, 0).replace(/","/g, '",\n      "')} },
  icon: { w: ${icon.w}, h: ${icon.h},
    rows: ${JSON.stringify(encode(icon)).replace(/","/g, '",\n      "')} },
  token: { w: ${token.w}, h: ${token.h},
    rows: ${JSON.stringify(encode(token)).replace(/","/g, '",\n      "')} },
  hull: { w: ${hull.w}, h: ${hull.h},
    rows: ${JSON.stringify(encode(hull)).replace(/","/g, '",\n      "')} },
};
`;
  writeFileSync(new URL('../../js/art/selenekai.js', import.meta.url), out);
  console.log('wrote js/art/selenekai.js');
}
