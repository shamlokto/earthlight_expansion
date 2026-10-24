// The Azoras's own art (expansion type 61, the General's flagship): original pixel art, drawn
// from the shapes below with tools/art/raster.mjs and written to js/art/azoras.js.
//   node tools/art/azoras.mjs
// Same pictures as the Selene Kai's (tools/art/selene-kai.mjs): unit-info picture (96x96, own
// palette), map icon (24x16, icon rows), board token and two fight hulls (ships' fight rows).
// The design (owner, 2026-10-24: a hybrid of the old Pegasus and the Tiamat): the Pegasus's lines,
// a needle prow, forward-swept wings out to wingtip engine pods, pearl with gold leading edges and
// the Galt pink stripe, built around a Tiamat-class armoured drum with rows of gold turrets and a
// heavy three-nozzle engine block with exhaust plumes. Crisp cel shading (raster.mjs `cel`).
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
const PEARL = [3, 4, 5, 6], GOLD = [9, 10, 11], PINK = [8, 7], CYAN = [12, 13, 14], DARK = [1, 2, 3], FIRE = [16, 15, 10, 11, 6];

export function infoArt() {
  // the ship's frame: u forward (down-left on the picture), v to starboard (down-right)
  const C = [50, 46], F = [-0.8, 0.6], S = [0.6, 0.8];
  const K = 1.36, toLocal = (x, y) => { const dx = (x - C[0]) * K, dy = (y - C[1]) * K; return [dx * F[0] + dy * F[1], dx * S[0] + dy * S[1]]; };
  const side = (f) => union(f(1), f(-1)), NOZ = [-8, 0, 8];
  const parts = [
    // exhaust plumes from the engine block and the wingtip pods
    { shape: union(...NOZ.map((v) => capsule(-44, v, -58, v * 1.2, 4)), side((s) => capsule(-10, 36 * s, -22, 38 * s, 3))), ramp: FIRE, bevel: 2, dome: 1, bias: 0.25, line: false },
    // forward-swept wings with gold leading edges
    { shape: side((s) => poly([[-24, 9 * s], [6, 11 * s], [24, 33 * s], [20, 41 * s], [-2, 42 * s], [-20, 26 * s], [-30, 14 * s]])), ramp: PEARL, bevel: 6, dome: 1, bias: -0.05 },
    { shape: side((s) => poly([[6, 11 * s], [24, 33 * s], [22, 35.5 * s], [4, 14 * s]])), ramp: GOLD, bevel: 1, line: false },
    // the heavy wing cannons (the Tiamat's guns, one on each wing): breech and two thick barrels
    { shape: side((s) => union(capsule(0, 22 * s, 34, 22 * s, 2.2), capsule(0, 27 * s, 34, 27 * s, 2.2))), ramp: [17, 8, 7], bevel: 2, dome: 1, spec: 1 },
    { shape: side((s) => ellipse(-2, 24.5 * s, 6.5, 6.5)), ramp: [17, 8, 7, 19], bevel: 3, dome: 1, spec: 1 },
    // wingtip engine pods with beam emitters at their noses
    { shape: side((s) => capsule(-8, 38 * s, 22, 38 * s, 4.5)), ramp: PEARL, bevel: 3, dome: 1, spec: 0.9 },
    { shape: side((s) => ellipse(-9, 38 * s, 2.2, 3.6)), ramp: [15, 10, 11, 6], bevel: 2, dome: 1, bias: 0.35 },
    { shape: side((s) => capsule(22, 38 * s, 29, 38 * s, 1.4)), ramp: CYAN, bevel: 1, bias: 0.2 },
    // the engine block: three heavy nozzles behind the drum
    { shape: capsule(-30, -12, -30, 12, 8), ramp: DARK.concat([4]), bevel: 4, dome: 1 },
    { shape: union(...NOZ.map((v) => capsule(-33, v, -43, v, 4.4))), ramp: [1, 2, 3, 4], bevel: 2, dome: 1, spec: 0.8 },
    { shape: union(...NOZ.map((v) => ellipse(-43.5, v, 2, 3.4))), ramp: [15, 10, 11, 6], bevel: 2, dome: 1, bias: 0.4 },
    // the armoured drum, drawn out into the needle prow
    { shape: union(capsule(-26, 0, 12, 0, 14), poly([[46, 0], [24, 5], [8, 12], [8, -12], [24, -5]])), ramp: PEARL, bevel: 9, dome: 1, height: 1.35, spec: 0.9 },
    { shape: poly([[44, 0.6], [12, 2.6], [-26, 2.6], [-26, -2.6], [12, -2.6], [44, -0.6]]), ramp: PINK, bevel: 1, line: false },
    { shape: poly([[46, 0], [37, 2], [37, -2]]), ramp: GOLD, bevel: 1, line: false },
    { shape: ellipse(18, 0, 6, 3.6), ramp: CYAN, bevel: 3, dome: 1, bias: 0.15, spec: 1 },
    // rows of gold turrets on the drum (the Tiamat's)
    { shape: union(...[-20, -13, -6, 1].map((u) => union(ellipse(u, -8.5, 2.3, 2.3), ellipse(u + 3, 8.5, 2.1, 2.1)))), ramp: GOLD, bevel: 2, dome: 1, spec: 1 },
  ];
  return render(96, 96, parts, { toLocal, bg: 0, outline: 1, ...CEL });
}

// ---------------------------------------------------------------- map icon (facing right)
// colour numbers of the icon rows: 1 white, 2-6 light to dark, 7 near black
// `colors`: the picture's own palette (iconArt, js/art/own.js ownColors) instead of the icon rows
const ICON_ROWS = { WING: [5, 4, 3], POD: [6, 5, 4], NOZ: [4, 3], BODY: [6, 5, 4, 3, 2], DOT: 1, GUN: [3, 2], out: 7 };
const ICON_FULL = { WING: [3, 4, 5, 6], POD: [3, 4, 5, 6], NOZ: [1, 2, 15], BODY: [2, 3, 4, 5, 6], DOT: 10, GUN: [17, 8, 7], out: 1 };
export function mapIcon(P = ICON_ROWS) {
  const parts = [
    { shape: union(poly([[6, 6], [11, 6], [17, 2], [15, 1], [10, 1.5]]), poly([[6, 10], [11, 10], [17, 14], [15, 15], [10, 14.5]])), ramp: P.WING, bevel: 1, dome: 1 },
    { shape: union(capsule(9, 1.6, 17, 1.6, 1.2), capsule(9, 14.4, 17, 14.4, 1.2)), ramp: P.POD, bevel: 1 },
    { shape: union(capsule(1.5, 6, 4, 6, 1.3), capsule(1.5, 10, 4, 10, 1.3)), ramp: P.NOZ, bevel: 1 },
    { shape: union(capsule(6, 8, 13, 8, 4), poly([[23.5, 8], [15, 6.4], [12, 4.5], [12, 11.5], [15, 9.6]])), ramp: P.BODY, bevel: 2, dome: 1 },
    { shape: union(...[6, 9, 12].map((x) => ellipse(x, 5, 0.9, 0.9))), ramp: [P.DOT], flat: P.DOT, line: false },
    { shape: union(capsule(9, 3.6, 19, 3.6, 0.9), capsule(9, 12.4, 19, 12.4, 0.9)), ramp: P.GUN, bevel: 1 },
  ];
  return render(24, 16, parts, { outline: P.out, cel: true, smooth: 0 });
}

// ---------------------------------------------------------------- fight hulls (left side, facing right)
// Drawn twice: in the ships' fight rows (colour numbers 2-7 hull light to dark, 8-11 metal dark to
// light; the classic fight scenes) and, three times larger, in the picture's own pearl, gold and
// pink (`hullArt`, `hull2Art`; the modern fight renderer, js/render/fightfx.js).
const ROWS = { HULL: [7, 6, 5, 4, 3, 2], STRIPE: [4, 3], METAL: [8, 9, 10, 11], GLOW: [9, 10, 11], NOZ: [8, 9, 10], GUN: [7, 6, 5, 4, 3], BARREL: [8, 9, 10, 11], TRIM: [4, 3], out: 7 };
const FULL = { HULL: [2, 3, 4, 5, 6], STRIPE: [8, 7], METAL: [9, 10, 11], GLOW: [15, 10, 11, 6], NOZ: [1, 2, 3, 4], GUN: [17, 8, 7, 19], BARREL: [17, 8, 7], TRIM: [9, 10, 11], out: 1 };
const scaled = (parts, k) => parts.map((q) => ({ ...q, bevel: (q.bevel ?? 4) * k }));

// against craft: the broadside, length down the screen, needle prow at the top, engines below;
// the battery ports at box x 15-28, y 22-110 (the Tiamat's); a heavy twin cannon on the wing
export function fightHull(P = ROWS, k = 1) {
  const PORTS = [24, 35, 46, 57, 68, 79, 90, 101, 110];
  const parts = [
    { shape: union(...[12, 26, 40].map((x) => poly([[x - 4, 118], [x + 4, 118], [x + 2, 128], [x - 2, 128]]))), ramp: P.GLOW, bevel: 2, dome: 1, bias: 0.4, line: false },
    { shape: union(...[12, 26, 40].map((x) => capsule(x, 104, x, 116, 6))), ramp: P.NOZ, bevel: 3, dome: 1, spec: 0.8 },
    // a forward-swept wing out to the right, its pod, and the wing cannon on it
    { shape: poly([[44, 92], [44, 70], [58, 30], [63, 30], [63, 40], [52, 92]]), ramp: P.HULL, bevel: 4, dome: 1, bias: -0.05 },
    { shape: poly([[44, 70], [58, 30], [60, 31], [47, 72]]), ramp: P.TRIM, bevel: 1, line: false },
    { shape: capsule(58, 22, 58, 52, 5), ramp: P.HULL, bevel: 3, dome: 1, spec: 0.9 },
    { shape: union(ellipse(58, 53, 3, 2.4), capsule(58, 12, 58, 20, 1.6)), ramp: P.GLOW, bevel: 1, bias: 0.4 },
    { shape: union(capsule(49, 26, 49, 70, 2.6), capsule(54, 26, 54, 70, 2.6)), ramp: P.BARREL, bevel: 2, dome: 1, spec: 0.9 },
    { shape: ellipse(51.5, 72, 7, 8), ramp: P.GUN, bevel: 3, dome: 1, spec: 1 },
    // the armoured drum with the needle prow at the top
    { shape: union(capsule(26, 26, 26, 96, 20), rect(6, 26, 46, 98), poly([[26, 0], [32, 16], [44, 28], [8, 28], [20, 16]])), ramp: P.HULL, bevel: 8, dome: 1, height: 1.3, spec: 0.9 },
    { shape: union(rect(36, 18, 40, 96), poly([[26, 2], [28, 18], [24, 18]])), ramp: P.STRIPE, bevel: 1, line: false },
    { shape: union(...PORTS.map((y) => capsule(16, y, 27, y, 3))), ramp: P.METAL, bevel: 2, dome: 1 },
  ];
  return render(64 * k, 128 * k, scaled(parts, k), { toLocal: (x, y) => [x / k, y / k], outline: P.out, ...CEL });
}

// against ships: top-down, needle prow to the right, forward-swept wings out to the heavy wing
// cannons above and below (their muzzles at box x 89-96, y 3-19 and 101-116, where the Tiamat's
// beams start), engines at the stern
export function fightHull2(P = ROWS, k = 1) {
  const PODS = [11, 108], cy = 60;
  const wing = (Q) => { const s = Math.sign(Q - cy); return poly([[22, cy + 14 * s], [46, cy + 14 * s], [80, Q - 5 * s], [44, Q - 5 * s]]); };
  const parts = [
    { shape: union(...[cy - 18, cy, cy + 18].map((y) => poly([[0, y - 4], [6, y - 6], [6, y + 6], [0, y + 4]]))), ramp: P.GLOW, bevel: 2, dome: 1, bias: 0.4, line: false },
    { shape: union(...[cy - 18, cy, cy + 18].map((y) => capsule(8, y, 24, y, 8.5))), ramp: P.NOZ, bevel: 4, dome: 1, spec: 0.8 },
    { shape: union(...[cy - 18, cy, cy + 18].map((y) => ellipse(7, y, 2.6, 6))), ramp: P.GLOW, bevel: 2, dome: 1, bias: 0.4 },
    // forward-swept wings
    { shape: union(...PODS.map(wing)), ramp: P.HULL, bevel: 6, dome: 1, bias: -0.05 },
    { shape: union(...PODS.map((Q) => { const s = Math.sign(Q - cy); return poly([[46, cy + 14 * s], [80, Q - 5 * s], [76, Q - 5 * s], [42, cy + 14 * s]]); })), ramp: P.TRIM, bevel: 1, line: false },
    // the wing cannons: an armoured breech and two long thick barrels each (the Tiamat's guns)
    { shape: union(...PODS.map((y) => capsule(40, y, 70, y, 10))), ramp: P.HULL, bevel: 4, dome: 1, spec: 0.9 },
    { shape: union(...PODS.map((y) => union(capsule(66, y - 3.6, 95, y - 3.6, 3), capsule(66, y + 3.6, 95, y + 3.6, 3)))), ramp: P.BARREL, bevel: 2, dome: 1, spec: 1 },
    { shape: union(...PODS.map((y) => ellipse(62, y, 8, 8))), ramp: P.GUN, bevel: 3, dome: 1, spec: 1 },
    // the armoured drum drawn out into the needle prow, with its turret rows
    { shape: union(capsule(30, cy, 60, cy, 24), poly([[95, cy], [74, cy - 8], [58, cy - 20], [58, cy + 20], [74, cy + 8]])), ramp: P.HULL, bevel: 9, dome: 1, height: 1.3, spec: 0.9 },
    { shape: poly([[93, cy + 1], [60, cy + 2.5], [26, cy + 2.5], [26, cy - 2.5], [60, cy - 2.5], [93, cy - 1]]), ramp: P.STRIPE, bevel: 1, line: false },
    { shape: union(...[26, 36, 46, 56].map((x) => union(ellipse(x, cy - 13, 3.2, 3.2), ellipse(x, cy + 13, 3.2, 3.2)))), ramp: P.METAL, bevel: 2, dome: 1 },
  ];
  return render(96 * k, 128 * k, scaled(parts, k), { toLocal: (x, y) => [x / k, y / k], outline: P.out, ...CEL });
}

// ---------------------------------------------------------------- board token (facing right)
export function boardToken(P = ROWS) {
  const cy = 12, { HULL, METAL, GLOW, BARREL, GUN, STRIPE } = P;
  const parts = [
    { shape: union(...[-4, 0, 4].map((d) => poly([[0, cy + d - 1.2], [4, cy + d - 1.8], [4, cy + d + 1.8], [0, cy + d + 1.2]]))), ramp: GLOW, bevel: 1, bias: 0.4, line: false },
    { shape: union(poly([[6, cy - 4], [13, cy - 4], [25, cy - 10], [21, cy - 11.5], [12, cy - 9]]), poly([[6, cy + 4], [13, cy + 4], [25, cy + 10], [21, cy + 11.5], [12, cy + 9]])), ramp: HULL, bevel: 2, dome: 1, bias: -0.05 },
    { shape: union(capsule(13, cy - 10.5, 26, cy - 10.5, 1.8), capsule(13, cy + 10.5, 26, cy + 10.5, 1.8)), ramp: HULL, bevel: 2, dome: 1 },
    { shape: union(ellipse(12.5, cy - 10.5, 1, 1.4), ellipse(12.5, cy + 10.5, 1, 1.4)), ramp: GLOW, bevel: 1, bias: 0.4, line: false },
    { shape: union(...[-4, 0, 4].map((d) => capsule(4, cy + d, 8, cy + d, 1.9))), ramp: P.NOZ, bevel: 1, dome: 1 },
    { shape: union(capsule(10, cy, 20, cy, 5.5), poly([[35.5, cy], [26, cy - 2], [18, cy - 4.8], [18, cy + 4.8], [26, cy + 2]])), ramp: HULL, bevel: 3, dome: 1, height: 1.35, spec: 0.9 },
    { shape: union(...[10, 13.5, 17].map((x) => ellipse(x, cy - 3.6, 1.1, 1.1))), ramp: P.METAL, bevel: 1, line: false },
    { shape: capsule(8, cy + 0.5, 33, cy + 0.5, 0.5), ramp: STRIPE, bevel: 1, line: false },
    { shape: union(capsule(13, cy - 7, 29, cy - 7, 1.2), capsule(13, cy + 7, 29, cy + 7, 1.2)), ramp: BARREL, bevel: 1, dome: 1 },
    { shape: union(ellipse(13, cy - 7, 2.6, 2.4), ellipse(13, cy + 7, 2.6, 2.4)), ramp: GUN, bevel: 1, dome: 1 },
  ];
  return render(36, 24, parts, { outline: P.out, ...CEL });
}

function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const art = infoArt(), icon = mapIcon(), hull = fightHull(), hull2 = fightHull2(), token = boardToken(), hullArt = fightHull(FULL, 3), hull2Art = fightHull2(FULL, 3), iconArt = mapIcon(ICON_FULL), tokenArt = boardToken(FULL);
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
  // the fight hulls in full colour, three times larger, for the modern fight renderer
  hullArt: { w: ${hullArt.w}, h: ${hullArt.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(hullArt)} },
  hull2Art: { w: ${hull2Art.w}, h: ${hull2Art.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(hull2Art)} },
  // the map icon and the board token in the picture's own colours (units.json ownColors)
  iconArt: { w: ${iconArt.w}, h: ${iconArt.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(iconArt)} },
  tokenArt: { w: ${tokenArt.w}, h: ${tokenArt.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(tokenArt)} },
  // how the modern renderer draws its shots, per weapon slot (visual only)
  shots: { 0: 'missile', 1: 'redBeam' },
};
`);
  console.log('wrote js/art/azoras.js');
}
