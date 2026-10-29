// SUPERSEDED (2026-10-28): the Naga's art now comes from tools/art/naga-xai.mjs (xAI-generated
// pictures); running this script would overwrite js/art/naga.js with the old shape-drawn art.
// The Naga's own art (expansion type 21, a cut ROM unit revived by the expansion): original pixel
// art, drawn from the shapes below with tools/art/raster.mjs and written to js/art/naga.js.
//   node tools/art/naga.mjs
// The ROM points the Naga's graphics at the Mars; the expansion first borrowed the Phoibos's,
// which made the two pods look the same. The Naga is now its own machine: a gun pod that mixes
// the Phoibos's railgun battery (the long rail stack on top and the armoured body with its visor
// slit) with the Vulcan's beam cannon (a ringed emitter barrel underneath, fed by the blue
// capacitor orbs on its flank). It keeps the Phoibos's choreography (`look` 15), so its poses
// stand in for the Phoibos sheet's (sheet 412; measured from the fight scene):
//   0 level, 4/8 tilting the barrels up, 12 full elevation with the recoil jets firing
// Each picture: the unit-info picture (96x96, own palette), the map icon (24x16, the icon rows'
// colour numbers 1-7) and the fight poses (32x32, the small craft's fight-row colour numbers,
// facing left like the ROM's sheets).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, capsule, rect, union, render, encode } from './raster.mjs';

const rot = (cx, cy, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return ([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };

// The pod in a 32-unit frame facing left, its barrels raised by `p.tilt` degrees about the body's
// pivot, scaled by k and moved by (ox, oy).
function pod(p, C, k = 1, ox = 0, oy = 0) {
  const turn = rot(22, 19, p.tilt || 0), P = ([x, y]) => { const [u, v] = turn([x + (p.dx || 0), y + (p.dy || 0)]); return [ox + u * k, oy + v * k]; };
  const pts = (a) => poly(a.map(P)), cap = (a, b, r) => { const [x0, y0] = P(a), [x1, y1] = P(b); return capsule(x0, y0, x1, y1, r * k); };
  const ell = (c, rx, ry) => { const [x, y] = P(c); return ellipse(x, y, rx * k, ry * k); };
  const ln = (a, b, w = 0.42) => { const [x0, y0] = P(a), [x1, y1] = P(b); return capsule(x0, y0, x1, y1, Math.max(w * k, 0.62)); };
  const dot = (q, r = 0.45) => { const [x, y] = P(q); return ellipse(x, y, Math.max(r * k, 0.62), Math.max(r * k, 0.62)); };
  const parts = [];
  // hover skid and the recoil jets under the rear of the body
  parts.push({ shape: pts([[15, 25], [29, 25], [28, 28], [16.5, 28]]), ramp: C.dark, bevel: 1 });
  if (p.jets) parts.push({ shape: union(pts([[19, 28], [21.5, 28], [20.5, 32], [18.5, 31]]), pts([[24.5, 28], [27, 28], [27.5, 32], [25, 31.5]])), ramp: C.beam, bevel: 1, bias: 0.3, line: false });
  // the rail stack (Phoibos): two long rails on top, a short third rail behind them
  parts.push({ shape: pts([[1, 4.5], [19, 4.5], [19, 8.2], [1, 8.2]]), ramp: C.rail, bevel: 1, bias: 0.2 });
  parts.push({ shape: pts([[2.5, 8.2], [19, 8.2], [19, 11.8], [2.5, 11.8]]), ramp: C.rail, bevel: 1, bias: 0.05 });
  parts.push({ shape: pts([[4.5, 11.8], [19, 11.8], [19, 14.8], [4.5, 14.8]]), ramp: C.rail, bevel: 1, bias: -0.1 });
  parts.push({ shape: union(ln([2, 6.4], [18, 6.4], 0.3), ln([3.5, 10], [18, 10], 0.3), ln([5.5, 13.3], [18, 13.3], 0.3)), ramp: C.line, flat: C.line[0], line: false });
  parts.push({ shape: union(cap([1.3, 5.2], [1.3, 7.6], 0.6), cap([2.8, 8.8], [2.8, 11.2], 0.6), cap([4.8, 12.4], [4.8, 14.2], 0.6)), ramp: C.glow, bevel: 1, bias: 0.3, line: false });
  // the beam cannon (Vulcan): a ringed barrel under the rails, its emitter glowing at the muzzle
  parts.push({ shape: cap([5, 19], [18, 19], 2.4), ramp: C.gun, bevel: 1, dome: 1 });
  for (const x of [8, 11, 14]) parts.push({ shape: cap([x, 16.4], [x, 21.6], 0.9), ramp: C.dark, bevel: 1, line: false });
  parts.push({ shape: ell([4.2, 19], 1.8, 2.6), ramp: C.beam, bevel: 1, bias: 0.25 });
  // the body: armoured block with a sloped glacis, the visor slit and a hatch
  parts.push({ shape: pts([[17, 7], [26, 6], [29.5, 9], [29.5, 23], [27, 26], [16.5, 26], [15.5, 15]]), ramp: C.armour, bevel: 3, dome: 1 });
  parts.push({ shape: pts([[17.5, 7.5], [21.5, 7.2], [20, 15], [16.3, 15.2]]), ramp: C.plate, bevel: 2, bias: 0.15 });
  parts.push({ shape: pts([[22, 11.5], [26.8, 11.2], [26.8, 13.6], [22, 13.9]]), ramp: C.visor, bevel: 1, bias: 0.2 });
  parts.push({ shape: union(dot([23.2, 12.4], 0.5), dot([25.4, 12.3], 0.5)), ramp: C.glint, flat: C.glint, line: false });
  parts.push({ shape: union(ln([22, 17], [28.5, 17]), ln([22, 21.5], [28.5, 21.5]), ln([22, 17], [22, 21.5])), ramp: C.line, flat: C.line[0], line: false });
  // the capacitor orbs on the flank (Vulcan's blue cells), feeding the beam cannon
  parts.push({ shape: union(ell([19.5, 19.5], 2.1, 2.1), ell([25.3, 19.4], 2.1, 2.1)), ramp: C.orb, bevel: 2, dome: 1, bias: 0.15 });
  parts.push({ shape: union(dot([18.9, 18.8], 0.5), dot([24.7, 18.7], 0.5)), ramp: C.glint, flat: C.glint, line: false });
  // rivets along the glacis
  parts.push({ shape: union(dot([27.8, 9.5], 0.4), dot([28.2, 15.5], 0.4), dot([27.6, 24], 0.4)), ramp: C.line, flat: C.line[0], line: false });
  return parts;
}

// ---------------------------------------------------------------- fight poses
// craft fight palette rows: 1 black, 2-7 the army colour (light to dark), 8-11 red to gold
// (army B; blues for army A), 12-14 cyan, 15 white. Ramps darkest first.
const FIGHT = { armour: [6, 5, 4, 3, 2], plate: [5, 4, 3, 2], rail: [6, 4, 3, 2], dark: [7, 6, 5], gun: [6, 5, 3, 2], line: [7], visor: [12, 13, 14], glint: 15,
  orb: [12, 13, 14, 15], beam: [12, 13, 14, 15], glow: [10, 11, 15] };
export const POSES = { 0: { tilt: 0 }, 4: { tilt: 9, dy: -0.3 }, 8: { tilt: 20, dy: -0.6 }, 12: { tilt: 27, dy: -0.8, jets: true } };
export function poseSprite(base) {
  return render(32, 32, pod(POSES[base], FIGHT), { outline: 1, cel: true, smooth: 1, bands: [0.1, 0.42, 0.9], bands3: [0.16, 0.6] });
}

// ---------------------------------------------------------------- unit-info picture
// a Union machine: gunmetal green armour, cyan optics and capacitors
export const ART_PALETTE = ['#4a5a6b', '#000000', '#10211c', '#21423a', '#3a6b52', '#63a57b', '#a5deb5', '#e7fff0',
  '#00427b', '#0094d6', '#5ad6ff', '#c6f7ff', '#ffffff', '#7b6b21', '#d6bd42'];
export function infoArt() {
  const C = { armour: [2, 3, 4, 5, 6], plate: [3, 4, 5, 6, 7], rail: [3, 4, 5, 6, 7], dark: [2, 3, 4], gun: [2, 3, 4, 5], line: [2], visor: [8, 9, 10, 11], glint: 12,
    orb: [8, 9, 10, 11, 12], beam: [8, 9, 10, 11, 12], glow: [13, 14, 12] };
  return render(96, 96, pod({ tilt: 12 }, C, 2.85, 2, 6), { bg: 0, outline: 1, cel: true, smooth: 1 });
}

// ---------------------------------------------------------------- map icon (facing right)
// colour numbers of the icon rows: 1 white, 2-6 light to dark, 7 near black
export function mapIcon() {
  const C = { armour: [5, 4, 3, 2], plate: [4, 3, 2], rail: [5, 3, 2], dark: [6, 5], gun: [5, 3, 2], line: [7], visor: [2, 1], glint: 1, orb: [3, 2, 1], beam: [2, 1], glow: [2, 1] };
  const img = render(24, 16, pod({ tilt: 0 }, C, 0.72, 0.4, -1.6), { outline: 7, cel: true, smooth: 0 });
  const px = new Uint8Array(img.px.length);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) px[y * 24 + x] = img.px[y * 24 + 23 - x];
  return { w: 24, h: 16, px };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = (img) => JSON.stringify(encode(img)).replace(/","/g, '",\n      "');
  const art = infoArt(), icon = mapIcon(), poses = Object.keys(POSES).map(Number);
  const out = `// The Naga's own art (expansion type 21), drawn by tools/art/naga.mjs; original art, not from
// the ROM. Rows of base-36 colour numbers: the picture's own palette; the map icon's numbers in
// the map icons' army rows (1-7); each fight pose's in the small craft's fight rows, keyed by the
// Phoibos sheet tile it stands in for.
export const NAGA = {
  art: { w: ${art.w}, h: ${art.h}, palette: ${JSON.stringify(ART_PALETTE)},
    rows: ${rows(art)} },
  icon: { w: ${icon.w}, h: ${icon.h},
    rows: ${rows(icon)} },
  poses: {
${poses.map((b) => `    ${b}: { w: 32, h: 32,\n      rows: ${rows(poseSprite(b))} },`).join('\n')}
  },
};
`;
  writeFileSync(new URL('../../js/art/naga.js', import.meta.url), out);
  console.log('wrote js/art/naga.js');
}
