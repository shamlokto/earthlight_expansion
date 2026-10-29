// The Athena Kai's own art (expansion types 73-76), drawn from generated pictures (2026-10-29).
//   python3 tools/art/kai-convert.py tools/art/athenakai/<form>-src.jpg tools/art/athenakai/<form>.json 96 32
//   python3 tools/art/athenakai-poses.py
//   node tools/art/athenakai-xai.mjs
// Sources in tools/art/athenakai/ (prompts in prompts.txt), generated with xAI's image model
// (tools/art/xai-gen.py): the unit-info pictures (jet, spent jet, robot) and side views for the
// fight poses (tools/art/athenakai-poses.py: 32x32 in the craft fight rows' colours and 96x96 full
// colour, keyed by the Athena sheet tiles each pose stands in for). Map icons: drawn here from
// shapes (24x16, colour numbers 1-7 of the icon rows, facing right), after the side views.
// Three sets, one per look of the machine:
//   athenaKaiJet      73, the jet with its torpedo
//   athenaKaiJetSpent 74, the jet after the bomb run
//   athenaKaiRobot    75/76, the robot; `sabre` gives its energy bayonet the modern renderer's
//                     glow and swing trail in melee (js/render/fightfx.js drawSabre)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, render, encode } from './raster.mjs';

const BODY = [5, 4, 3, 2], LIGHT = [4, 3, 2, 1], DARK = [6, 5, 4], GLASS = [3, 2, 1];

// the jet facing right: a long cone nose, a swept wing, twin tall fins, the side intake, the railgun
// along the belly and the torpedo under it (left off once it has flown)
const jet = (armed) => [
  { shape: union(poly([[2, 6], [4, 1], [7, 1], [7, 6]]), poly([[5, 6], [7, 2], [9.5, 2], [9.5, 6]])), ramp: BODY, bevel: 1 },
  { shape: poly([[1, 6.5], [14, 5.5], [23.5, 8.5], [14, 10], [1, 10]]), ramp: LIGHT, bevel: 2, dome: 1 },
  { shape: poly([[4, 9.5], [12, 9.5], [8, 12.5], [3, 12.5]]), ramp: BODY, bevel: 1 },
  { shape: rect(9, 7.5, 11.5, 9.6), ramp: DARK, bevel: 1 },
  { shape: ellipse(14.5, 6.6, 3, 1.4), ramp: GLASS, bevel: 1, dome: 1 },
  { shape: capsule(8, 11, 18, 11, 0.9), ramp: [4, 3], bevel: 1, line: false },
  ...(armed ? [{ shape: union(capsule(3, 13.2, 15, 13.2, 1.7), poly([[15, 11.5], [18, 13.2], [15, 14.9]])), ramp: [5, 4, 3, 2], bevel: 1, dome: 1 }] : []),
];
// the robot facing right: the twin tail fins on its back, swept antennae, the rifle levelled forward
// with the bayonet under the muzzle
const robot = () => [
  { shape: union(poly([[2, 1], [4, 1], [7, 6], [7, 11], [3, 10]]), poly([[4.5, 2], [6.5, 2], [8, 6], [7, 9]])), ramp: BODY, bevel: 1 },
  { shape: union(rect(7, 9.5, 10, 13.4), rect(11.6, 9.5, 14.6, 13.4)), ramp: LIGHT, bevel: 1 },
  { shape: union(rect(6, 13.5, 10, 15), rect(11.6, 13.5, 15.6, 15)), ramp: BODY, bevel: 1 },
  { shape: poly([[7, 4.5], [15.5, 4.5], [14.6, 10], [7.5, 10]]), ramp: LIGHT, bevel: 2, dome: 1 },
  { shape: rect(10, 1.2, 13.6, 4.6), ramp: LIGHT, bevel: 1 },
  { shape: rect(12.4, 2.4, 13.8, 3.4), ramp: GLASS, flat: 1, line: false },
  { shape: rect(13.5, 6.6, 17, 9), ramp: BODY, bevel: 1 },
];
// one-pixel lines shading can't keep: [x0, x1, y, colour], drawn last (nose tips, the rifle, the
// bayonet, the antennae)
const LINES = { jet: [[22, 23, 8, 2]], spent: [[22, 23, 8, 2]], robot: [[17, 23, 7, 3], [19, 22, 8, 1], [10, 10, 0, 3], [12, 12, 0, 3]] };
export function icon(form) {
  const img = render(24, 16, form === 'robot' ? robot() : jet(form === 'jet'), { outline: 7, cel: true, smooth: 0 });
  for (const [x0, x1, y, c] of LINES[form]) for (let x = x0; x <= x1; x++) img.px[y * 24 + x] = c;
  return img;
}

const SETS = { jet: 'ATHENA_KAI_JET', spent: 'ATHENA_KAI_JET_SPENT', robot: 'ATHENA_KAI_ROBOT' };
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
  const here = (f) => JSON.parse(readFileSync(new URL(`./athenakai/${f}`, import.meta.url), 'utf8'));
  const poses = here('poses.json');
  const block = (name, list, size) => `  ${name}: {\n${Object.entries(list).map(([t, v]) => (size === 32
    ? `    ${t}: { w: 32, h: 32,\n      rows: ${rows(v)} },`
    : `    ${t}: { w: ${v.w}, h: ${v.h}, palette: ${JSON.stringify(v.palette)},\n      rows: ${rows(v.rows)} },`)).join('\n')}\n  },\n`;
  let out = `// The Athena Kai's own art (expansion types 73-76), written by tools/art/athenakai-xai.mjs;
// original art, not from the ROM. Unit-info pictures generated with xAI's image model and reduced
// to the picture's own palette; map icons drawn from shapes, in the icon army rows (1-7); fight
// poses in the small craft's fight rows, keyed by the Athena sheet tile each stands in for (poses2:
// the melee sheet that weapon slots 1-3 load; 132 is the slash), with full-colour versions
// (posesArt, posesArt2) for the modern fights. Rows of base-36 colour numbers.
`;
  for (const [form, name] of Object.entries(SETS)) {
    const pic = here(`${form}.json`), p = poses[form], ic = icon(form);
    out += `export const ${name} = {
  art: { w: ${pic.w}, h: ${pic.h}, palette: ${JSON.stringify(pic.palette)},
    rows: ${rows(pic.rows)} },
  icon: { w: 24, h: 16,
    rows: ${rows(encode(ic))} },
${block('poses', p.poses, 32)}${p.poses2 ? block('poses2', p.poses2, 32) : ''}${block('posesArt', p.posesArt, 96)}${p.posesArt2 ? block('posesArt2', p.posesArt2, 96) : ''}${form === 'robot' ? '  sabre: { col: [255, 64, 200], cuts: [68, 76], slash: 132 },\n' : ''}};
`;
  }
  writeFileSync(new URL('../../js/art/athenakai.js', import.meta.url), out);
  console.log('wrote js/art/athenakai.js');
}
