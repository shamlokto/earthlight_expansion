// The Mars Kai's and the Cyclops Kai's own art (expansion types 69, 70).
//   python3 tools/art/kai-convert.py tools/art/kai2/<unit>-src.jpg tools/art/kai2/<unit>.json 96 32
//   python3 tools/art/kai2-poses.py && node tools/art/kai2.mjs
// Unit-info pictures: generated with xAI's image model (tools/art/xai-gen.py; prompts and the chosen
// sources in tools/art/kai2/), reduced to 96x96 indexed pictures (tools/art/kai-convert.py). Fight
// poses: tools/art/kai2-poses.py from the generated pose sheets and strips (tools/art/kai2/sheet-*.jpg:
// the Mars Kai's move and melee sheets and its walk strip; the Cyclops Kai's idle and flight side
// views, a missile boat), keyed by the base unit's sheet tiles its choreography (`look`) draws. Map
// icons: drawn here from shapes with tools/art/raster.mjs (24x16, colour numbers 1-7 of the map
// icons' army rows, facing right), after the side views.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, render, encode } from './raster.mjs';

// colour numbers of the icon rows: 1 white, 2-6 light to dark, 7 near black
const BODY = [5, 4, 3, 2], LIGHT = [4, 3, 2, 1], DARK = [6, 5, 4], GLASS = [3, 2, 1];

export const ICONS = {
  // a slim mecha with its long beam rifle levelled forward, bayonet under the barrel, back thruster
  mars: () => [
    { shape: rect(4, 4, 7, 9), ramp: DARK, bevel: 1 },
    { shape: union(rect(7, 10, 9.4, 13.4), rect(11.6, 10, 14, 13.4)), ramp: LIGHT, bevel: 1 },
    { shape: union(rect(6, 13.5, 9.6, 15), rect(11.4, 13.5, 15, 15)), ramp: BODY, bevel: 1 },
    { shape: poly([[7, 4], [14, 4], [14.5, 10], [6.5, 10]]), ramp: LIGHT, bevel: 2, dome: 1 },
    { shape: ellipse(10.8, 2.6, 2.4, 2), ramp: LIGHT, bevel: 1, dome: 1 },
    { shape: rect(11.5, 2.2, 13, 3), ramp: GLASS, flat: 1, line: false },
    { shape: rect(11, 6, 15, 9), ramp: BODY, bevel: 1 },
  ],
  // a missile boat: a long low hull with a pointed bow, a block of launch cells on its spine, the
  // flank launcher rack with its missiles' tips, a small bridge forward, two engines at the stern
  cyclops: () => [
    { shape: union(rect(0.5, 6.2, 3.2, 8.3), rect(0.5, 10.2, 3.2, 12.3)), ramp: DARK, bevel: 1 },
    { shape: poly([[2, 7.5], [17, 7], [21, 9], [23.4, 11.2], [19, 13.4], [2.5, 13.4]]), ramp: BODY, bevel: 2, dome: 1 },
    { shape: rect(6.5, 2.6, 13, 7.2), ramp: DARK, bevel: 1 },
    { shape: poly([[14, 4.4], [17.2, 4.4], [19.4, 7.6], [14, 7.6]]), ramp: LIGHT, bevel: 1, dome: 1 },
    { shape: rect(8.2, 8.2, 14.6, 12.4), ramp: DARK, bevel: 1 },
  ],
};
// one-pixel details (barrels, the bayonet, hatches) that shading can't keep: [x0, x1, y, colour], drawn last
const LINES = {
  mars: [[15, 23, 7, 3], [17, 22, 8, 2], [22, 23, 8, 1]],
  // the launch cells' hatches, the rack's missile tips, the bridge's window, the hull's stripe
  cyclops: [[7, 7, 4, 2], [9, 9, 4, 2], [11, 11, 4, 2], [7, 7, 6, 2], [9, 9, 6, 2], [11, 11, 6, 2],
    [9, 9, 9, 3], [11, 11, 9, 3], [13, 13, 9, 3], [9, 9, 11, 3], [11, 11, 11, 3], [13, 13, 11, 3],
    [15, 15, 9, 1], [15, 15, 11, 1], [16, 17, 5, 1], [3, 7, 13, 6], [15, 19, 13, 6], [0, 0, 7, 2], [0, 0, 11, 2]],
};
export function icon(u) {
  const img = render(24, 16, ICONS[u](), { outline: 7, cel: true, smooth: 0 });
  for (const [x0, x1, y, c] of LINES[u] || []) for (let x = x0; x <= x1; x++) img.px[y * 24 + x] = c;
  return img;
}

const SETS = { mars: 'MARS_KAI', cyclops: 'CYCLOPS_KAI' };
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
  const read = (f) => JSON.parse(readFileSync(new URL(`./kai2/${f}`, import.meta.url), 'utf8'));
  const poseBlock = (key, p) => `  ${key}: {\n${Object.entries(p).map(([t, r]) => `    ${t}: { w: 32, h: 32,\n      rows: ${rows(r)} },`).join('\n')}\n  },\n`;
  const artBlock = (key, p) => `  ${key}: {\n${Object.entries(p).map(([t, a]) => `    ${t}: { w: 96, h: 96, palette: ${JSON.stringify(a.palette)},\n      rows: ${rows(a.rows)} },`).join('\n')}\n  },\n`;
  let out = `// The Mars Kai's and the Cyclops Kai's own art (expansion types 69, 70), written by
// tools/art/kai2.mjs; original art, not from the ROM. Unit-info pictures generated with xAI's image
// model and reduced to the picture's own palette (rows of base-36 colour numbers); map icons drawn
// from shapes, in the map icons' army rows (1-7); fight poses keyed by the base unit's sheet tiles,
// in the craft fight rows' colour numbers, with full-colour versions for the modern fights (the
// Mars Kai's second sheet, its melee, as poses2 / posesArt2).
`;
  for (const [u, name] of Object.entries(SETS)) {
    const pic = read(`${u}.json`), fp = read(`${u}-fight.json`), ic = icon(u);
    out += `export const ${name} = {
  art: { w: ${pic.w}, h: ${pic.h}, palette: ${JSON.stringify(pic.palette)},
    rows: ${rows(pic.rows)} },
  icon: { w: 24, h: 16,
    rows: ${rows(encode(ic))} },
${poseBlock('poses', fp.poses)}${artBlock('posesArt', fp.posesArt)}${fp.poses2 ? poseBlock('poses2', fp.poses2) + artBlock('posesArt2', fp.posesArt2) : ''}};
`;
  }
  writeFileSync(new URL('../../js/art/kai2.js', import.meta.url), out);
  console.log('wrote js/art/kai2.js');
}
