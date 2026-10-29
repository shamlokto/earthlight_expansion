// The Directorate Talos's own art (expansion type 60), written to js/art/dirtalos.js from the xAI
// generated sources in tools/art/dirtalos/ (prompts beside them; tools/art/xai-gen.py):
//   python3 tools/art/kai-convert.py tools/art/dirtalos/picture-src.jpg tools/art/dirtalos/picture.json 96 32 '#6b5a7b'
//   python3 tools/art/dirtalos-xai.py      (fight poses for both sheets -> fight.json)
//   python3 tools/art/dirtalos-icons.py    (map icon, its full-colour version, board token -> icons.json)
//   node tools/art/dirtalos-xai.mjs
// Replaces the shape-drawn art of tools/art/directorate-talos.mjs.
import { readFileSync, writeFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL(`./dirtalos/${f}`, import.meta.url), 'utf8'));
const pic = read('picture.json'), fight = read('fight.json'), icons = read('icons.json');
const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
const poses = (p) => Object.entries(p).map(([t, r]) => `    ${t}: { w: 32, h: 32,\n      rows: ${rows(r)} },`).join('\n');
const arts = (p) => Object.entries(p).map(([t, a]) => `    ${t}: { w: 96, h: 96, palette: ${JSON.stringify(a.palette)},\n      rows: ${rows(a.rows)} },`).join('\n');

const out = `// The Directorate Talos's own art (expansion type 60), written by tools/art/dirtalos-xai.mjs;
// original art, not from the ROM: generated with xAI's image model (tools/art/dirtalos/) and reduced
// to indexed pictures. Rows of base-36 colour numbers: the picture's own palette; the map icon's
// numbers in the map icons' army rows (1-7); each fight pose's in the small craft's fight rows,
// keyed by the Talos sheet tile it stands in for: \`poses\` on the first sheet (weapon slot 0, the
// wrist beam), \`poses2\` on the second (slot 2, the beam sabre: the melee recordings; tile 132 is
// the slash, drawn over the cuts). Full-colour versions (units.json ownColors) for the modern
// renderer: iconArt, tokenArt (facing left like the poses), posesArt and posesArt2 (3x larger).
// \`sabre\`: the modern renderer's crimson glow and swing trail on the melee (js/render/fightfx.js).
export const DIRECTORATE_TALOS = {
  art: { w: ${pic.w}, h: ${pic.h}, palette: ${JSON.stringify(pic.palette)},
    rows: ${rows(pic.rows)} },
  icon: { w: 24, h: 16,
    rows: ${rows(icons.icon)} },
  poses: {
${poses(fight.poses)}
  },
  poses2: {
${poses(fight.poses2)}
  },
  palette: ${JSON.stringify(pic.palette)},
  iconArt: { w: 24, h: 16, palette: ${JSON.stringify(icons.iconArt.palette)},
    rows: ${rows(icons.iconArt.rows)} },
  tokenArt: { w: 32, h: 32, palette: ${JSON.stringify(icons.tokenArt.palette)}, faces: 'left',
    rows: ${rows(icons.tokenArt.rows)} },
  posesArt: {
${arts(fight.posesArt)}
  },
  posesArt2: {
${arts(fight.posesArt2)}
  },
  sabre: { col: [255, 36, 60], cuts: [68, 76], slash: 132 },
};
`;
writeFileSync(new URL('../../js/art/dirtalos.js', import.meta.url), out);
console.log('wrote js/art/dirtalos.js');
