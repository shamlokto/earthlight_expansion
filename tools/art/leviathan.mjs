// The Leviathan's own art (expansion type 59, Marshal Kessrin's flagship): original pixel art,
// drawn from the shapes below with tools/art/raster.mjs and written to js/art/leviathan.js.
//   node tools/art/leviathan.mjs
// Three pictures: the unit-info picture (96x96, its own palette), the map icon (24x16, colour
// numbers 1-7 of the map icons' army rows) and the fight hull (96x128, colour numbers of the
// capital ships' fight palette rows, facing right; js/game/fightscene.js drawOwnHull).
// The design: a black Directorate dreadnought. A long armoured wedge with a raised command
// tower, three heavy turrets along the spine, missile cells in the flanks, a red ram prow and a
// bank of four engines burning red.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, render, encode } from './raster.mjs';

// The ship in a frame running from the stern (u = -50) to the bow (u = 50), v across; `C` maps
// roles to ramps (darkest first).
function ship(C) {
  const side = (f) => union(f(1), f(-1));
  return [
    // engines and their fire
    { shape: side((s) => union(capsule(-50, 7 * s, -36, 7 * s, 4.2), capsule(-50, 17 * s, -38, 17 * s, 3.6))), ramp: C.metal, bevel: 3, dome: 1 },
    { shape: side((s) => union(ellipse(-52, 7 * s, 2.2, 3.6), ellipse(-51.5, 17 * s, 2, 3.1))), ramp: C.fire, bevel: 1, bias: 0.35, line: false },
    // the hull: a long wedge with stepped flanks
    { shape: poly([[50, 0], [30, 9], [10, 13], [-12, 22], [-40, 23], [-46, 12], [-46, -12], [-40, -23], [-12, -22], [10, -13], [30, -9]]), ramp: C.hull, bevel: 14, dome: 1 },
    // flank armour plates with missile cells
    { shape: side((s) => poly([[8, 13.5 * s], [-12, 22.5 * s], [-36, 23.5 * s], [-36, 17 * s], [-12, 16 * s], [6, 10 * s]])), ramp: C.plate, bevel: 3, dome: 1, bias: -0.05 },
    { shape: side((s) => union(...[-30, -24, -18].map((u) => rect(u, 18.5 * s - 1, u + 3.5, 18.5 * s + 1)))), ramp: C.red, bevel: 1, line: false },
    // the red ram prow and the Directorate slash
    { shape: poly([[50, 0], [38, 5.5], [33, 0], [38, -5.5]]), ramp: C.red, bevel: 3, dome: 1 },
    { shape: side((s) => poly([[26, 9.5 * s], [6, 13.5 * s], [5, 11.5 * s], [24, 8 * s]])), ramp: C.red, bevel: 1, line: false },
    // the spine and the command tower
    { shape: poly([[34, 0], [20, 5], [-38, 6], [-38, -6], [20, -5]]), ramp: C.plate, bevel: 4, dome: 1, height: 1.3 },
    { shape: poly([[-6, 0], [-12, 8.5], [-26, 9], [-30, 0], [-26, -9], [-12, -8.5]]), ramp: C.hull, bevel: 6, dome: 1, height: 1.8, spec: 0.8 },
    { shape: rect(-17, -2.5, -11, 2.5), ramp: C.light, bevel: 1, bias: 0.3 },
    // three heavy turrets along the spine, guns forward
    ...[24, 8, -38].map((u, i) => [
      { shape: union(capsule(u, -1.7, u + (i === 2 ? -14 : 16), -1.7, 1.1), capsule(u, 1.7, u + (i === 2 ? -14 : 16), 1.7, 1.1)), ramp: C.metal, bevel: 1 },
      { shape: ellipse(u, 0, 5, 4.6), ramp: C.plate, bevel: 3, dome: 1, height: 1.4, spec: 0.7 },
    ]).flat(),
  ];
}

// ---------------------------------------------------------------- unit-info picture
export const ART_PALETTE = ['#4a3a5a', '#000000', '#14141c', '#26262f', '#3a3a48', '#565668', '#7e7e94',
  '#4a0000', '#8c0000', '#d61818', '#ff5a39', '#ffbd9c', '#ff3900', '#ffbd00', '#ffffff', '#c6c6e7'];
export function infoArt() {
  const C = { hull: [2, 3, 4, 5, 6], plate: [2, 3, 4, 5], metal: [3, 4, 5, 6], red: [7, 8, 9, 10], fire: [12, 13, 14], light: [10, 11, 14] };
  // the ship at an angle, bow towards the lower left
  const Cn = [48, 47], F = [-0.78, 0.62], S = [0.62, 0.78];
  const toLocal = (x, y) => { const dx = x - Cn[0], dy = y - Cn[1]; return [(dx * F[0] + dy * F[1]) * 1.28, (dx * S[0] + dy * S[1]) * 1.05]; };
  return render(96, 96, ship(C), { toLocal, bg: 0, outline: 1 });
}

// ---------------------------------------------------------------- map icon (facing right)
// colour numbers of the icon rows: 1 white, 2-6 light to dark, 7 near black
export function mapIcon() {
  const C = { hull: [6, 5, 4], plate: [6, 5, 4], metal: [5, 4], red: [3, 2], fire: [2, 1], light: [1] };
  const toLocal = (x, y) => [(x - 12) * 4.3, (y - 8) * 3.3];
  return render(24, 16, ship(C), { toLocal, outline: 7 });
}

// ---------------------------------------------------------------- fight hull (left side, facing right)
// colour numbers of the ships' fight rows: 2-7 hull (light to dark), 8-11 accents (dark to light:
// reds for army B, blues for army A)
export function fightHull() {
  const C = { hull: [7, 7, 6, 6, 5], plate: [7, 6, 6, 5], metal: [7, 6, 5, 4], red: [8, 9, 10], fire: [9, 10, 11], light: [10, 11] };
  const toLocal = (x, y) => [(x - 49) * 1.14, (y - 64) * 0.42];   // 96 px long; the beam stretched to fill 128 rows
  return render(96, 128, ship(C), { toLocal, outline: 7 });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = (img) => JSON.stringify(encode(img)).replace(/","/g, '",\n      "');
  const art = infoArt(), icon = mapIcon(), hull = fightHull();
  const out = `// The Leviathan's own art (expansion type 59), drawn by tools/art/leviathan.mjs; original art,
// not from the ROM. Rows of base-36 colour numbers: the picture's own palette; the map icon's
// numbers in the map icons' army rows (1-7); the fight hull's in the ships' fight rows.
export const LEVIATHAN = {
  art: { w: ${art.w}, h: ${art.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(art)} },
  icon: { w: ${icon.w}, h: ${icon.h},
    rows: ${rows(icon)} },
  hull: { w: ${hull.w}, h: ${hull.h},
    rows: ${rows(hull)} },
};
`;
  writeFileSync(new URL('../../js/art/leviathan.js', import.meta.url), out);
  console.log('wrote js/art/leviathan.js');
}
