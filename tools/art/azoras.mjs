// The Azoras's own art (expansion type 61, the General's flagship): original pixel art, drawn
// from the shapes below with tools/art/raster.mjs and written to js/art/azoras.js.
//   node tools/art/azoras.mjs
// Same pictures as the Selene Kai's (tools/art/selene-kai.mjs): unit-info picture (96x96, own
// palette), map icon (24x16, icon rows), board token and two fight hulls (ships' fight rows).
// The design: a Tiamat-family battleship (the ROM's drum hull, end-cap cannon and rows of gold
// turrets) refitted with an oversized engine block: three heavy nozzles with intake vanes and long
// exhaust plumes, in Galt pearl, pink and gold. Crisp cel shading (raster.mjs `cel`).
// The fight hulls follow the Tiamat's recorded fights (its `look`): against craft its broadside
// hull, with the batteries' shots leaving ports at box x 15-28, y 22-110; against ships its
// top-down hull (`hull2`, the Tiamat's second sheet), whose beams leave the emitters at box x 89-96,
// y 3-19 and 101-116 (measured from the recording).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, render, encode } from './raster.mjs';

const CEL = { cel: true, smooth: 1, bands: [0.12, 0.45, 0.88], bands3: [0.18, 0.62] };

// ---------------------------------------------------------------- unit-info picture
export const ART_PALETTE = ['#7b7bde', '#000000', '#4a4a6b', '#8484a5', '#b5b5d6', '#dedef7', '#ffffff', '#ff5abd', '#bd3984',
  '#bd8400', '#ffbd00', '#ffe784', '#0063bd', '#00b5ff', '#7bffff', '#ff7b00', '#ff395a', '#5a185a', '#9c399c', '#de7bde'];
const PEARL = [3, 4, 5, 6], GOLD = [9, 10, 11], PINK = [17, 8, 7, 19], CYAN = [12, 13, 14], DARK = [1, 2, 3], FIRE = [16, 15, 10, 11, 6];

export function infoArt() {
  // the ship's frame: u forward (to the bow, lower left), v across (lower right)
  const C = [46, 52], F = norm([-0.82, 0.57]), S = [-F[1], F[0]].map((v) => -v);
  const K = 1.42, toLocal = (x, y) => { const dx = (x - C[0]) * K, dy = (y - C[1]) * K; return [dx * F[0] + dy * F[1], dx * S[0] + dy * S[1]]; };
  const NOZ = [-11, 0, 11];
  const parts = [
    // exhaust plumes streaming from the stern
    { shape: union(...NOZ.map((v) => capsule(-46, v * 1.05, -60, v * 1.3, 5))), ramp: FIRE, bevel: 3, dome: 1, bias: 0.25, line: false },
    // the engine block: a collar around three heavy nozzles, intake vanes on the flanks
    { shape: union(capsule(-30, -15, -30, 15, 9), poly([[-26, -21], [-14, -21], [-14, 21], [-26, 21]])), ramp: DARK.concat([4]), bevel: 4, dome: 1 },
    { shape: union(...NOZ.map((v) => capsule(-34, v, -44, v, 5.6))), ramp: [1, 2, 3, 4], bevel: 3, dome: 1, spec: 0.8 },
    { shape: union(...NOZ.map((v) => ellipse(-44.5, v, 2.4, 4.4))), ramp: [15, 10, 11, 6], bevel: 2, dome: 1, bias: 0.4 },
    { shape: union(...[-1, 1].map((s) => poly([[-24, 19 * s], [-8, 19 * s], [-12, 25 * s], [-26, 25 * s]]))), ramp: GOLD, bevel: 2, dome: 1 },
    // the drum hull
    { shape: capsule(-16, 0, 22, 0, 18), ramp: PEARL, bevel: 9, dome: 1, height: 1.3, spec: 0.9 },
    { shape: rect(-16, 5, 22, 9), ramp: PINK, bevel: 1, line: false },
    // the bow: a blue ring and the pink end-cap cannon
    { shape: ellipse(24, 0, 5.5, 18), ramp: CYAN, bevel: 3, dome: 1 },
    { shape: ellipse(27, 3, 9, 9), ramp: PINK, bevel: 3, dome: 1, spec: 0.8 },
    { shape: union(capsule(30, 1, 44, 1, 2.2), capsule(30, 5.5, 44, 5.5, 2.2)), ramp: PINK, bevel: 1, dome: 1 },
    // rows of gold turrets along the spine and a command mast
    { shape: union(...[-12, -5, 2, 9, 16].map((u) => ellipse(u, -15, 2.6, 2.6)), ...[-9, -2, 5, 12].map((u) => ellipse(u, -7, 2.4, 2.4))), ramp: GOLD, bevel: 2, dome: 1, spec: 1 },
    { shape: union(rect(-6, -22, 2, -17), ellipse(-2, -24, 3.2, 3.2)), ramp: PINK, bevel: 2, dome: 1 },
  ];
  return render(96, 96, parts, { toLocal, bg: 0, outline: 1, ...CEL });
}

// ---------------------------------------------------------------- map icon (facing right)
// colour numbers of the icon rows: 1 white, 2-6 light to dark, 7 near black
export function mapIcon() {
  const parts = [
    { shape: union(ellipse(1.5, 5, 1.8, 1.2), ellipse(1, 8, 2, 1.3), ellipse(1.5, 11, 1.8, 1.2)), ramp: [1], flat: 1, line: false },
    { shape: union(capsule(3, 5, 6, 5, 1.6), capsule(3, 8, 6, 8, 1.8), capsule(3, 11, 6, 11, 1.6)), ramp: [5, 4, 3], bevel: 1, dome: 1 },
    { shape: capsule(8, 8, 18, 8, 5), ramp: [6, 5, 4, 3, 2], bevel: 2, dome: 1 },
    { shape: union(capsule(19, 6.5, 23.5, 6.5, 1), capsule(19, 9.5, 23.5, 9.5, 1)), ramp: [4, 3, 2], bevel: 1 },
    { shape: union(...[9, 12, 15].map((x) => ellipse(x, 3.4, 1.1, 1.1))), ramp: [1], flat: 1, line: false },
  ];
  return render(24, 16, parts, { outline: 7, cel: true, smooth: 0 });
}

// ---------------------------------------------------------------- fight hulls (left side, facing right)
// colour numbers of the ships' fight rows: 2-7 hull (light to dark), 8-11 metal (dark to light)
const HULL = [7, 6, 5, 4, 3, 2], METAL = [8, 9, 10, 11], GLOW = [9, 10, 11];

// against craft: the broadside, length running down the screen, stern (engines) at the bottom
export function fightHull() {
  const PORTS = [24, 35, 46, 57, 68, 79, 90, 101, 110];
  const parts = [
    // plumes and the three nozzles under the stern
    { shape: union(...[10, 26, 42].map((x) => poly([[x - 4, 118], [x + 4, 118], [x + 2, 128], [x - 2, 128]]))), ramp: GLOW, bevel: 2, dome: 1, bias: 0.4, line: false },
    { shape: union(...[10, 26, 42].map((x) => capsule(x, 102, x, 116, 7.5))), ramp: METAL, bevel: 3, dome: 1, spec: 0.8 },
    { shape: union(poly([[0, 92], [52, 92], [56, 104], [-2, 104]]), rect(48, 70, 56, 104)), ramp: HULL, bevel: 4, dome: 1 },
    // the drum hull (bow at the top) with its broadside ports
    { shape: union(capsule(24, 12, 24, 94, 22), rect(2, 12, 46, 94)), ramp: HULL, bevel: 8, dome: 1, height: 1.3, spec: 0.9 },
    { shape: rect(38, 14, 42, 92), ramp: [4, 3], bevel: 1, line: false },
    { shape: union(...PORTS.map((y) => capsule(16, y, 27, y, 3))), ramp: METAL, bevel: 2, dome: 1 },
    // dorsal turret dome with its barrel, and the intake vanes
    { shape: ellipse(50, 42, 11, 13), ramp: HULL, bevel: 4, dome: 1, spec: 0.9 },
    { shape: capsule(52, 4, 52, 34, 2.6), ramp: METAL, bevel: 1, dome: 1 },
    { shape: union(...[74, 80, 86].map((y) => rect(50, y, 60, y + 2))), ramp: [9, 10], bevel: 1, line: false },
  ];
  return render(64, 128, parts, { outline: 7, ...CEL });
}

// against ships: top-down, bow to the right, gun pods above and below, engines at the stern (left)
export function fightHull2() {
  const PODS = [12, 110];
  const parts = [
    // engines: three heavy nozzles on the stern with glowing cores
    { shape: union(...[42, 64, 86].map((y) => poly([[0, y - 4], [6, y - 6], [6, y + 6], [0, y + 4]]))), ramp: GLOW, bevel: 2, dome: 1, bias: 0.4, line: false },
    { shape: union(...[42, 64, 86].map((y) => capsule(8, y, 26, y, 10))), ramp: METAL, bevel: 4, dome: 1, spec: 0.8 },
    { shape: union(...[42, 64, 86].map((y) => ellipse(7, y, 3, 7))), ramp: GLOW, bevel: 2, dome: 1, bias: 0.4 },
    // the hull
    { shape: union(ellipse(70, 64, 22, 34), rect(26, 30, 70, 98)), ramp: HULL, bevel: 9, dome: 1, height: 1.3, spec: 0.9 },
    { shape: union(...[34, 46, 58, 70].map((x) => union(rect(x, 38, x + 6, 48), rect(x, 80, x + 6, 90)))), ramp: METAL, bevel: 2, dome: 1 },
    { shape: rect(26, 62, 92, 66), ramp: [4, 3], bevel: 1, line: false },
    // the gun pods and their beam emitters
    { shape: union(...PODS.map((y) => capsule(34, y, 76, y, 11))), ramp: HULL, bevel: 5, dome: 1, spec: 0.9 },
    { shape: union(...PODS.map((y) => union(capsule(74, y - 3, 95, y - 3, 2.4), capsule(74, y + 3, 95, y + 3, 2.4)))), ramp: METAL, bevel: 1, dome: 1 },
  ];
  return render(96, 128, parts, { outline: 7, ...CEL });
}

// ---------------------------------------------------------------- board token (facing right)
export function boardToken() {
  const cy = 12;
  const parts = [
    { shape: union(...[-6, 0, 6].map((d) => poly([[0, cy + d - 1.6], [5, cy + d - 2.4], [5, cy + d + 2.4], [0, cy + d + 1.6]]))), ramp: GLOW, bevel: 1, bias: 0.4, line: false },
    { shape: union(...[-6, 0, 6].map((d) => capsule(5, cy + d, 9, cy + d, 2.6))), ramp: METAL, bevel: 1, dome: 1 },
    { shape: capsule(12, cy, 27, cy, 8), ramp: HULL, bevel: 3, dome: 1, height: 1.3, spec: 0.9 },
    { shape: union(capsule(27, cy - 2.2, 35, cy - 2.2, 1.3), capsule(27, cy + 2.2, 35, cy + 2.2, 1.3)), ramp: METAL, bevel: 1 },
    { shape: union(...[13, 17, 21, 25].map((x) => ellipse(x, cy - 6, 1.3, 1.3))), ramp: [10, 11], bevel: 1, line: false },
    { shape: rect(10, cy + 2, 28, cy + 3), ramp: [4], flat: 4, line: false },
  ];
  return render(36, 24, parts, { outline: 7, ...CEL });
}

function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const art = infoArt(), icon = mapIcon(), hull = fightHull(), hull2 = fightHull2(), token = boardToken();
  const rows = (img) => JSON.stringify(encode(img)).replace(/","/g, '",\n      "');
  writeFileSync(new URL('../../js/art/azoras.js', import.meta.url), `// The Azoras's own art (expansion type 61), drawn by tools/art/azoras.mjs; original art, not
// from the ROM. Rows of base-36 colour numbers: the picture's own palette; the map icon's numbers
// in the map icons' army rows (1-7); the board token's and the fight hulls' in the ships' fight rows.
// \`hull\` is the broadside drawn against craft, \`hull2\` the top-down hull drawn against ships.
export const AZORAS = {
  art: { w: ${art.w}, h: ${art.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(art)} },
  icon: { w: ${icon.w}, h: ${icon.h},
    rows: ${rows(icon)} },
  token: { w: ${token.w}, h: ${token.h},
    rows: ${rows(token)} },
  hull: { w: ${hull.w}, h: ${hull.h},
    rows: ${rows(hull)} },
  hull2: { w: ${hull2.w}, h: ${hull2.h},
    rows: ${rows(hull2)} },
};
`);
  console.log('wrote js/art/azoras.js');
}
