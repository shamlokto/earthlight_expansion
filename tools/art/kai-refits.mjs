// The Kai refits' own art (expansion types 66-68: Lobster Kai, Crane Kai, Titan Kai).
//   node tools/art/kai-refits.mjs
// Unit-info pictures: generated with xAI's image model (tools/art/xai-gen.py, prompts in
// tools/art/kai/prompts.txt), then downscaled and reduced to an indexed 96x96 picture by
// tools/art/kai-convert.py (tools/art/kai/<unit>.json; the chosen sources are kept beside them).
// Map icons: drawn here from shapes with tools/art/raster.mjs (24x16, colour numbers 1-7 of the
// map icons' army rows, facing right), after the generated side views. Fights keep the base
// unit's sprites and choreography (`look`), so the sets have no fight poses.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, render, encode } from './raster.mjs';

// colour numbers of the icon rows: 1 white, 2-6 light to dark, 7 near black
const BODY = [5, 4, 3, 2], LIGHT = [4, 3, 2, 1], DARK = [6, 5, 4], GLASS = [3, 2, 1];

export const ICONS = {
  // two long claw prongs forward, a swept fin, the missile rack under the wing, a big engine
  lobster: () => [
    { shape: capsule(1.5, 8, 5, 8, 2.6), ramp: DARK, bevel: 1 },
    { shape: poly([[5, 4], [9, 1], [11, 1], [11, 6]]), ramp: BODY, bevel: 1 },
    { shape: poly([[4, 6], [16, 5.5], [19, 8], [16, 10.5], [4, 10]]), ramp: LIGHT, bevel: 2, dome: 1 },
    { shape: union(capsule(11, 6, 22.6, 6, 1.3), capsule(11, 10, 22.6, 10, 1.3)), ramp: [3, 2, 1], bevel: 1, line: false },
    { shape: poly([[5, 10], [13, 10], [9, 14], [5, 14]]), ramp: BODY, bevel: 1 },
    { shape: capsule(6, 13, 11, 13, 1.1), ramp: [4, 3], bevel: 1, line: false },
    { shape: ellipse(14.5, 7, 2.2, 1.3), ramp: GLASS, bevel: 1, dome: 1 },
  ],
  // the long beak gun, a tall tail fin, a narrow wing and the heavy ship missile underneath
  crane: () => [
    { shape: capsule(1.5, 8, 4, 8, 2), ramp: DARK, bevel: 1 },
    { shape: poly([[3, 7], [5, 1], [8, 1], [9, 7]]), ramp: BODY, bevel: 1 },
    { shape: capsule(14, 7.6, 23.2, 7.6, 1.1), ramp: [4, 3, 2], bevel: 1, line: false },
    { shape: poly([[3, 6], [12, 6], [17, 8], [12, 10], [3, 10]]), ramp: LIGHT, bevel: 2, dome: 1 },
    { shape: poly([[6, 9.5], [13, 9.5], [8, 13.5], [4, 13.5]]), ramp: BODY, bevel: 1 },
    { shape: union(capsule(8, 12.5, 17, 12.5, 1.6), poly([[17, 11], [19.5, 12.5], [17, 14]])), ramp: [6, 5, 4, 3], bevel: 1, dome: 1 },
    { shape: ellipse(12, 7, 2.2, 1.2), ramp: GLASS, bevel: 1, dome: 1 },
  ],
  // a stocky mecha with the long railgun levelled forward and the cannon on its shoulder
  titan: () => [
    { shape: rect(3, 4, 6, 9), ramp: BODY, bevel: 1 },
    { shape: union(rect(6, 10, 8.6, 13.4), rect(11.4, 10, 14, 13.4)), ramp: LIGHT, bevel: 1 },
    { shape: union(rect(5, 13.5, 8.6, 15), rect(11.4, 13.5, 15, 15)), ramp: BODY, bevel: 1 },
    { shape: poly([[6, 4], [14, 4], [14, 10], [6, 10]]), ramp: LIGHT, bevel: 2, dome: 1 },
    { shape: rect(9, 1.5, 12, 4), ramp: LIGHT, bevel: 1 },
    { shape: rect(11, 2.5, 12.5, 3.2), ramp: GLASS, flat: 1, line: false },
    { shape: capsule(3.5, 2.2, 9, 2.2, 1.4), ramp: [4, 3, 2], bevel: 1, line: false },
    { shape: capsule(9, 7.5, 23.2, 7.5, 1.1), ramp: [4, 3, 2], bevel: 1, line: false },
    { shape: rect(12, 6, 15, 9), ramp: BODY, bevel: 1 },
  ],
};
// one-pixel lines (gun barrels, prongs) that shading can't keep: [x0, x1, y, colour], drawn last
const LINES = {
  lobster: [[12, 22, 6, 2], [12, 22, 10, 2], [21, 22, 6, 1], [21, 22, 10, 1]],
  crane: [[17, 22, 8, 3]],
  titan: [[15, 22, 7, 3]],
};
export function icon(u) {
  const img = render(24, 16, ICONS[u](), { outline: 7, cel: true, smooth: 0 });
  for (const [x0, x1, y, c] of LINES[u] || []) for (let x = x0; x <= x1; x++) img.px[y * 24 + x] = c;
  return img;
}

const SETS = { lobster: 'LOBSTER_KAI', crane: 'CRANE_KAI', titan: 'TITAN_KAI' };
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
  let out = `// The Kai refits' own art (expansion types 66-68), written by tools/art/kai-refits.mjs; original
// art, not from the ROM. Unit-info pictures generated with xAI's image model and reduced to the
// picture's own palette (rows of base-36 colour numbers); map icons drawn from shapes, in the map
// icons' army rows (1-7). No fight poses: the Kai refits fight with their base unit's sprites.
`;
  for (const [u, name] of Object.entries(SETS)) {
    const pic = JSON.parse(readFileSync(new URL(`./kai/${u}.json`, import.meta.url), 'utf8')), ic = icon(u);
    out += `export const ${name} = {
  art: { w: ${pic.w}, h: ${pic.h}, palette: ${JSON.stringify(pic.palette)},
    rows: ${rows(pic.rows)} },
  icon: { w: 24, h: 16,
    rows: ${rows(encode(ic))} },
};
`;
  }
  writeFileSync(new URL('../../js/art/kai.js', import.meta.url), out);
  console.log('wrote js/art/kai.js');
}
