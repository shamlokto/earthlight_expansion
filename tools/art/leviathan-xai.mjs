// The Leviathan's own art (expansion type 59, Marshal Kessrin's flagship), written to
// js/art/leviathan.js:
//   python3 tools/art/leviathan-xai.py && node tools/art/leviathan-xai.mjs
// The unit-info picture, the fight hull (classic, in the ships' fight-row colours, and three
// times larger in full colour for the modern renderer) and the board token come from pictures
// generated with xAI's image model (tools/art/leviathan/, prompts.txt), reduced by
// tools/art/leviathan-xai.py (parts.json). The map icons (24x16) are drawn here from shapes after
// the generated side view: the army-row icon (colour numbers 1-7) and the full-colour one
// (ownColors). The design: a black-and-gunmetal Directorate dreadnought with blood-red trim, a
// command tower amidships, four red-burning engines and a spinal super-cannon in the bow whose
// muzzle glows violet (its shot: js/render/fightfx.js drawLevCannon).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, render, encode } from './raster.mjs';

// the full-colour icon's palette: 0 clear, 1 outline, 2-6 gunmetal (dark to light), 7-9 red,
// 10-12 violet glow, 13 white
export const ICON_PALETTE = ['#000000', '#0a0610', '#1c1b26', '#2e2d3c', '#45445a', '#646379', '#8d8ca3',
  '#6b0c14', '#b4161f', '#ff3a3a', '#5b2a9e', '#a35cff', '#e2c6ff', '#ffffff'];

// the ship facing right in the 24x16 frame; C maps roles to ramps (darkest first)
function ship(C) {
  return [
    // four engines at the stern
    { shape: union(capsule(1.6, 6.4, 3.5, 6.4, 1.2), capsule(1.6, 9, 3.5, 9, 1.2), capsule(1.6, 11.6, 3.5, 11.6, 1.2)), ramp: C.fire, bevel: 1, line: false },
    // the long armoured hull, its prow sloping down to the cannon
    { shape: poly([[3, 5.2], [16, 5.2], [20.5, 7.2], [20.5, 12], [15, 13.6], [3, 13.6]]), ramp: C.hull, bevel: 2, dome: 1 },
    // the command tower amidships
    { shape: poly([[6, 5.4], [7, 2.4], [11, 2.4], [12.5, 5.4]]), ramp: C.plate, bevel: 1 },
    { shape: rect(8.2, 3.2, 10.2, 3.9), ramp: C.red, flat: C.red[C.red.length - 1], line: false },
    // the red stripe along the flank
    { shape: poly([[4, 9], [19.8, 9], [19.8, 10.2], [4, 10.2]]), ramp: C.red, bevel: 1, line: false },
    // the spinal cannon and its glowing muzzle
    { shape: capsule(19, 9.6, 22.4, 9.6, 1.25), ramp: C.plate, bevel: 1 },
    { shape: ellipse(22.6, 9.6, 1.15, 1.35), ramp: C.glow, bevel: 1, dome: 1, line: false },
  ];
}
export const icon = () => render(24, 16, ship({ hull: [6, 5, 4], plate: [5, 4, 3], red: [3, 2], fire: [2, 1], glow: [2, 1] }), { outline: 7, cel: true, smooth: 0 });
export const iconArt = () => render(24, 16, ship({ hull: [2, 3, 4, 5], plate: [3, 4, 5, 6], red: [7, 8, 9], fire: [8, 9, 13], glow: [11, 12, 13] }), { outline: 1, cel: true, smooth: 0 });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const P = JSON.parse(readFileSync(new URL('./leviathan/parts.json', import.meta.url), 'utf8'));
  const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
  const ic = icon(), ica = iconArt();
  const out = `// The Leviathan's own art (expansion type 59), written by tools/art/leviathan-xai.mjs; original
// art, not from the ROM. The picture, the fight hull and the board token were generated with xAI's
// image model and reduced to rows of base-36 colour numbers: the picture's own palette; the map
// icon's numbers in the map icons' army rows (1-7); the fight hull's in the ships' fight rows (2-7
// hull, 8-11 the red trim, engine glow and the cannon's muzzle). The spinal cannon's muzzle sits at
// (${P.muzzle.join(', ')}) in the hull's box, where the Nodens's recorded beam leaves (fightfx.js
// drawLevCannon starts its beam there).
export const LEVIATHAN = {
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
  // its shots (js/render/fightfx.js): the spinal super-cannon, from the muzzle
  shots: { 0: 'levCannon', 1: 'levCannon', 2: 'levCannon' },
  muzzle: ${JSON.stringify(P.muzzle)},
};
`;
  writeFileSync(new URL('../../js/art/leviathan.js', import.meta.url), out);
  console.log('wrote js/art/leviathan.js');
}
