// The Directorate Talos's own art (expansion type 60, Commander Vane's machine and Marshal
// Kessrin's guard): original pixel art, drawn from the shapes below with tools/art/raster.mjs and
// written to js/art/dirtalos.js as indexed rows.
//   node tools/art/directorate-talos.mjs
// Four kinds of picture: the unit-info picture (96x96, its own palette), the map icon (24x16,
// colour numbers 1-7 of the map icons' army rows), and the fight poses: 32x32 sprites in the
// colour numbers of the small craft's fight palette rows, one for each pose the Talos's
// choreography draws (sheet tiles 0, 4, 8, 12, 64, 68, 72, 76 and 128; fightscene.js), facing
// left like the ROM's sheets.
// The design: a heavier, darker Talos. Angular armour, wide pauldrons with the Directorate's red
// slashes, a red mono-eye under a swept crest, a back pack with twin thrusters and a beam sabre.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, capsule, union, render, encode } from './raster.mjs';

const rot = (cx, cy, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return ([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
const polar = ([x, y], deg, len) => { const a = (deg * Math.PI) / 180; return [x + Math.sin(a) * len, y - Math.cos(a) * len]; };   // 0 deg = up, negative = forward (left)

// The machine in a 32-unit frame facing left, posed by `p`, scaled by `k` and moved by (ox, oy).
// Returns raster parts. Colours: `C` maps roles to ramps (darkest first).
function machine(p, C, k = 1, ox = 0, oy = 0) {
  const lean = rot(16, 20, p.lean || 0), P = ([x, y]) => { const [u, v] = lean([x + (p.dx || 0), y + (p.dy || 0)]); return [ox + u * k, oy + v * k]; };
  const pts = (a) => a.map(P), cap = (a, b, r) => { const [x0, y0] = P(a), [x1, y1] = P(b); return capsule(x0, y0, x1, y1, r * k); };
  const ell = (c, rx, ry) => { const [x, y] = P(c); return ellipse(x, y, rx * k, ry * k); };
  const L = p.legs || {}, fk = L.front || [[13, 20], [10.5, 25], [9.5, 29]], rk = L.rear || [[19.5, 20], [21, 25], [22, 29]];
  const hand = [6.5, 15.5], hilt = p.hand || hand, tip = polar(hilt, p.sword ?? 0, 13);
  const parts = [];
  // rear leg, back pack and thrusters, rear pauldron
  parts.push({ shape: union(cap(rk[0], rk[1], 3), cap(rk[1], rk[2], 2.6)), ramp: C.dark, bevel: 2, dome: 1 });
  parts.push({ shape: poly(pts([[rk[2][0] - 3, rk[2][1] - 1], [rk[2][0] + 3.5, rk[2][1] - 1.2], [rk[2][0] + 4, rk[2][1] + 1.8], [rk[2][0] - 3.5, rk[2][1] + 1.8]])), ramp: C.dark, bevel: 1 });
  parts.push({ shape: poly(pts([[20, 7.5], [27, 9], [27.5, 15.5], [22, 17]])), ramp: C.armour, bevel: 2, dome: 1 });
  parts.push({ shape: union(cap([24, 15], [25, 18.5], 1.5), cap([26.5, 14.5], [27.8, 18], 1.4)), ramp: C.dark, bevel: 1 });
  parts.push({ shape: union(ell([25.1, 19.3], 1.1, 1.3), ell([27.9, 18.8], 1.1, 1.3)), ramp: C.glow, bevel: 1, bias: 0.3, line: false });
  parts.push({ shape: ell([22.5, 11], 4.2, 3.6), ramp: C.armour, bevel: 2, dome: 1, bias: -0.1 });
  // hips, torso and the red chest slash
  parts.push({ shape: poly(pts([[11, 17.5], [21, 17.5], [20.5, 22], [12, 22]])), ramp: C.dark, bevel: 2 });
  parts.push({ shape: poly(pts([[8.5, 9], [21.5, 8.5], [21.5, 15], [19.5, 19], [12, 19], [9, 14.5]])), ramp: C.armour, bevel: 4, dome: 1 });
  parts.push({ shape: poly(pts([[11.5, 11], [17, 10.4], [14.4, 16], [12.4, 16]])), ramp: C.red, bevel: 1, line: false });
  // front leg
  parts.push({ shape: union(cap(fk[0], fk[1], 3.1), cap(fk[1], fk[2], 2.8)), ramp: C.armour, bevel: 2, dome: 1 });
  parts.push({ shape: poly(pts([[fk[2][0] - 4, fk[2][1] - 1], [fk[2][0] + 3, fk[2][1] - 1.2], [fk[2][0] + 3.5, fk[2][1] + 1.8], [fk[2][0] - 4.5, fk[2][1] + 1.8]])), ramp: C.dark, bevel: 1 });
  parts.push({ shape: ell(fk[1], 2, 1.7), ramp: C.red, bevel: 1, line: false });
  // head: helmet, swept crest, the red mono-eye
  parts.push({ shape: poly(pts([[11.5, 3.6], [17.5, 2.6], [19.6, 5.5], [18.6, 9.6], [12.4, 9.8], [10.6, 6.6]])), ramp: C.armour, bevel: 2, dome: 1, bias: 0.05 });
  parts.push({ shape: poly(pts([[15.5, 3], [23, 0.2], [18.8, 4.4]])), ramp: C.red, bevel: 1 });
  parts.push({ shape: ell([12.3, 6.6], 1.8, 1.1), ramp: C.eye, bevel: 1, bias: 0.4, line: false });
  // the sabre arm: front pauldron, forearm to the hand, the beam blade
  parts.push({ shape: union(cap([10, 12], [7.5, 15], 2.4), cap([7.5, 15], hilt, 2.1)), ramp: C.armour, bevel: 2, dome: 1 });
  parts.push({ shape: ell([9.8, 10.8], 4.6, 3.8), ramp: C.armour, bevel: 2, dome: 1, bias: 0.1 });
  parts.push({ shape: poly(pts([[6.4, 9.6], [11.8, 8.2], [8.2, 13]])), ramp: C.red, bevel: 1, line: false });
  parts.push({ shape: cap(hilt, tip, 0.95), ramp: C.beam, bevel: 1, bias: 0.25, line: false });
  if (p.spark) parts.push({ shape: union(cap([p.spark[0] - 5, p.spark[1]], [p.spark[0] + 5, p.spark[1]], 0.9), cap([p.spark[0], p.spark[1] - 5], [p.spark[0], p.spark[1] + 5], 0.9), ellipse(p.spark[0] * k, p.spark[1] * k, 1.8 * k, 1.8 * k)), ramp: C.beam, bevel: 1, bias: 0.4, line: false });
  return parts;
}

// ---------------------------------------------------------------- fight poses
// craft fight palette rows: 1 black, 2-7 the army colour (light to dark), 8-11 red to gold
// (army B; blues for army A), 12-14 cyan, 15 white
const FIGHT = { armour: [7, 6, 5, 4], dark: [7, 6, 5], red: [8, 9, 10], glow: [10, 11, 15], eye: [9, 11, 15], beam: [12, 13, 14, 15] };
const stride = (a) => ({ front: [[13, 20], [10 - a, 24.5], [8.5 - a, 29]], rear: [[19, 20], [21 + a, 24.5], [22.5 + a, 29]] });
export const POSES = {
  0: { sword: 0 },                                                       // at rest, sabre up
  4: { sword: -6, dy: -0.5, legs: stride(1) },                           // advancing
  8: { sword: 6, legs: stride(-0.5) },
  12: { sword: -14, dy: 0.5, legs: stride(0.5) },
  64: { sword: -70, dy: 1, legs: { front: [[13, 20.5], [10, 25], [9.5, 29.5]], rear: [[19, 20.5], [21.5, 26], [21, 29.5]] } },   // aim: the sabre levelled
  68: { sword: -125, lean: -10, hand: [6, 17], legs: stride(1.5) },      // the cut, coming down
  72: { sword: 35, lean: 8, hand: [8, 9], legs: stride(-1) },            // wind-up over the head
  76: { sword: -100, lean: -18, dx: -1.5, hand: [5, 15], legs: stride(2.5) },   // lunge
  128: { sword: 45, lean: 14, dx: 2, legs: stride(-1), spark: [5, 11] },  // struck, reeling back
};
export function poseSprite(base) { return render(32, 32, machine(POSES[base], FIGHT), { outline: 1 }); }
// a pose in the picture's own colours, k times larger (units.json ownColors; the modern fight
// renderer and, at k = 1, the board token)
export function poseArt(base, k = 3) {
  const parts = machine(POSES[base], ART_C, k).map((q) => ({ ...q, bevel: (q.bevel ?? 4) * k }));
  return render(32 * k, 32 * k, parts, { outline: 1 });
}

// ---------------------------------------------------------------- unit-info picture
export const ART_PALETTE = ['#6b5a7b', '#000000', '#21212e', '#393a4e', '#55566e', '#7b7c95', '#a5a6bd',
  '#5a0000', '#a50000', '#e72121', '#ff7b5a', '#ffd6bd', '#ff3900', '#ffbd00', '#ffffff', '#00639c', '#00b5ff', '#9cefff'];
const ART_C = { armour: [2, 3, 4, 5, 6], dark: [2, 3, 4], red: [7, 8, 9, 10], glow: [12, 13, 14], eye: [8, 10, 11, 14], beam: [15, 16, 17, 14] };
export function infoArt() {
  const C = ART_C;
  const parts = machine({ sword: -28, lean: -6, hand: [6, 14.5], legs: stride(1.5) }, C, 2.75, 3, 6);
  return render(96, 96, parts, { bg: 0, outline: 1 });
}

// ---------------------------------------------------------------- map icon (facing right)
// colour numbers of the icon rows: 1 white, 2-6 light to dark, 7 near black
export function mapIcon(colors = false) {
  const C = colors ? ART_C : { armour: [6, 5, 4, 3], dark: [6, 5], red: [3, 2], glow: [2, 1], eye: [1], beam: [2, 1] };
  const parts = machine({ sword: -20, legs: stride(1) }, C, 0.52, 3.5, -0.2);
  const img = render(24, 16, parts, { outline: colors ? 1 : 7 });
  // facing right: mirror the left-facing frame
  const px = new Uint8Array(img.px.length);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) px[y * 24 + x] = img.px[y * 24 + 23 - x];
  return { w: 24, h: 16, px };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = (img) => JSON.stringify(encode(img)).replace(/","/g, '",\n      "');
  const art = infoArt(), icon = mapIcon(), poses = Object.keys(POSES).map(Number), iconArt = mapIcon(true), tokArt = poseArt(0, 1);
  const out = `// The Directorate Talos's own art (expansion type 60), drawn by tools/art/directorate-talos.mjs;
// original art, not from the ROM. Rows of base-36 colour numbers: the picture's own palette; the
// map icon's numbers in the map icons' army rows (1-7); each fight pose's in the small craft's
// fight rows, keyed by the Talos sheet tile it stands in for.
export const DIRECTORATE_TALOS = {
  art: { w: ${art.w}, h: ${art.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(art)} },
  icon: { w: ${icon.w}, h: ${icon.h},
    rows: ${rows(icon)} },
  poses: {
${poses.map((b) => `    ${b}: { w: 32, h: 32,\n      rows: ${rows(poseSprite(b))} },`).join('\n')}
  },
  // in the picture's own colours (units.json ownColors): map icon, board token (the rest pose,
  // facing left like the poses), and each pose three times larger for the modern fight renderer
  palette: ${JSON.stringify(ART_PALETTE)},
  iconArt: { w: ${iconArt.w}, h: ${iconArt.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(iconArt)} },
  tokenArt: { w: ${tokArt.w}, h: ${tokArt.h}, palette: ${JSON.stringify(ART_PALETTE)}, faces: 'left',
    rows: ${rows(tokArt)} },
  posesArt: {
${poses.map((b) => `    ${b}: { w: 96, h: 96, palette: ${JSON.stringify(ART_PALETTE)},\n      rows: ${rows(poseArt(b))} },`).join('\n')}
  },
};
`;
  writeFileSync(new URL('../../js/art/dirtalos.js', import.meta.url), out);
  console.log('wrote js/art/dirtalos.js');
}
