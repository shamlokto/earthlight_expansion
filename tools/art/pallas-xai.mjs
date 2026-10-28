// The Pallas's own art (expansion types 62-65), redrawn with generated pictures (2026-10-28;
// replaces tools/art/pallas.mjs, pallas-pics.mjs and pallas-pixels.mjs).
//   python3 tools/art/kai-convert.py tools/art/pallas/<form>-src.jpg tools/art/pallas/<form>.json 96 32
//   python3 tools/art/pallas-poses.py
//   node tools/art/pallas-xai.mjs
// Sources in tools/art/pallas/ (prompts in prompts.txt), generated with xAI's image model
// (tools/art/xai-gen.py): the unit-info pictures (jet, spent jet, robot) and side views for the
// fight poses (tools/art/pallas-poses.py: 32x32 in the craft fight rows' colours and 96x96 full
// colour, keyed by the Athena sheet tiles each pose stands in for). Map icons: drawn here from
// shapes (24x16, colour numbers 1-7 of the icon rows, facing right), after the side views.
// Three sets, one per look of the machine:
//   pallasJet      62, the jet with its torpedo
//   pallasJetSpent 63, the jet after the bomb run
//   pallasRobot    64/65, the robot (the torpedo rides inside the binder, so both look the same)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, render, encode } from './raster.mjs';

const BODY = [5, 4, 3, 2], LIGHT = [4, 3, 2, 1], DARK = [6, 5, 4], GLASS = [3, 2, 1];

// the jet facing right: a long nose, a swept wing, twin canted fins, the side intake, and the
// torpedo slung underneath (left off once it has flown)
const jet = (armed) => [
  { shape: poly([[3, 3], [6, 1], [9, 1], [8, 7]]), ramp: BODY, bevel: 1 },
  { shape: poly([[1, 4], [3, 3], [6, 6], [2, 6]]), ramp: DARK, bevel: 1 },
  { shape: poly([[2, 6.5], [15, 5.5], [23.5, 8.5], [15, 10], [2, 10]]), ramp: LIGHT, bevel: 2, dome: 1 },
  { shape: poly([[5, 9.5], [13, 9.5], [9, 13], [4, 13]]), ramp: BODY, bevel: 1 },
  { shape: rect(8, 8, 11, 10), ramp: DARK, bevel: 1 },
  { shape: ellipse(15.5, 6.6, 3, 1.4), ramp: GLASS, bevel: 1, dome: 1 },
  ...(armed ? [{ shape: union(capsule(6, 12.6, 16, 12.6, 1.5), poly([[16, 11.2], [18.5, 12.6], [16, 14]])), ramp: [6, 5, 4, 3], bevel: 1, dome: 1 }] : []),
];
// the robot facing right: the wing binder behind it, the V crest, the railgun levelled forward
const robot = () => [
  { shape: poly([[3, 2], [5, 2], [8, 5], [8, 9], [5, 8]]), ramp: BODY, bevel: 1 },
  { shape: union(rect(7, 9.5, 10.4, 13.4), rect(11.6, 9.5, 15, 13.4)), ramp: LIGHT, bevel: 1 },
  { shape: union(rect(6, 13.5, 10.4, 15), rect(11.6, 13.5, 16, 15)), ramp: BODY, bevel: 1 },
  { shape: poly([[6.5, 4.5], [16, 4.5], [15, 10], [7, 10]]), ramp: LIGHT, bevel: 2, dome: 1 },
  { shape: rect(7, 4.5, 10, 7), ramp: DARK, bevel: 1 },
  { shape: rect(9.5, 1, 14, 4.6), ramp: LIGHT, bevel: 1 },
  { shape: rect(12.5, 2.4, 14, 3.4), ramp: GLASS, flat: 1, line: false },
  { shape: rect(14, 7, 18, 9.4), ramp: BODY, bevel: 1 },
];
// one-pixel lines shading can't keep: [x0, x1, y, colour], drawn last (the nose tips, the V
// crest, the railgun)
const LINES = { jet: [[22, 23, 8, 3]], spent: [[22, 23, 8, 3]], robot: [[18, 23, 8, 3], [10, 10, 0, 4], [13, 13, 0, 4]] };
export function icon(form) {
  const img = render(24, 16, form === 'robot' ? robot() : jet(form === 'jet'), { outline: 7, cel: true, smooth: 0 });
  for (const [x0, x1, y, c] of LINES[form]) for (let x = x0; x <= x1; x++) img.px[y * 24 + x] = c;
  return img;
}

const SETS = { jet: 'PALLAS_JET', spent: 'PALLAS_JET_SPENT', robot: 'PALLAS_ROBOT' };
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
  const here = (f) => JSON.parse(readFileSync(new URL(`./pallas/${f}`, import.meta.url), 'utf8'));
  const poses = here('poses.json');
  const block = (name, list, size) => `  ${name}: {\n${Object.entries(list).map(([t, v]) => (size === 32
    ? `    ${t}: { w: 32, h: 32,\n      rows: ${rows(v)} },`
    : `    ${t}: { w: ${v.w}, h: ${v.h}, palette: ${JSON.stringify(v.palette)},\n      rows: ${rows(v.rows)} },`)).join('\n')}\n  },\n`;
  let out = `// The Pallas's own art (expansion types 62-65), written by tools/art/pallas-xai.mjs; original
// art, not from the ROM. Unit-info pictures generated with xAI's image model and reduced to the
// picture's own palette; map icons drawn from shapes, in the icon army rows (1-7); fight poses in
// the small craft's fight rows, keyed by the Athena sheet tile each stands in for (poses2: the
// sabre sheet that weapon slots 1-3 load), with full-colour versions (posesArt, posesArt2) for the
// modern fights. Rows of base-36 colour numbers.
`;
  for (const [form, name] of Object.entries(SETS)) {
    const pic = here(`${form}.json`), p = poses[form], ic = icon(form);
    out += `export const ${name} = {
  art: { w: ${pic.w}, h: ${pic.h}, palette: ${JSON.stringify(pic.palette)},
    rows: ${rows(pic.rows)} },
  icon: { w: 24, h: 16,
    rows: ${rows(encode(ic))} },
${block('poses', p.poses, 32)}${p.poses2 ? block('poses2', p.poses2, 32) : ''}${block('posesArt', p.posesArt, 96)}${p.posesArt2 ? block('posesArt2', p.posesArt2, 96) : ''}};
`;
  }
  writeFileSync(new URL('../../js/art/pallas.js', import.meta.url), out);
  console.log('wrote js/art/pallas.js');
}
