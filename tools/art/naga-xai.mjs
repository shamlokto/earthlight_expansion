// The Naga's own art (expansion type 21), redone from pictures generated with xAI's image model.
//   python3 tools/art/naga-poses.py && node tools/art/naga-xai.mjs
// Sources in tools/art/naga/ (prompts: prompt-picture.txt, generated with the old shape-drawn
// picture as the style reference; prompt-side.txt, with picture-src.jpg as the reference):
// picture-src.jpg, reduced to the 96x96 unit-info picture by tools/art/kai-convert.py (96, 32 colours, backdrop #4a5a6b) into
// picture.json; side-src.jpg, the side view the fight poses come from (tools/art/naga-poses.py ->
// poses.json: the four Phoibos-sheet poses 0, 4, 8, 12, classic 32x32 and full-colour 96x96).
// The map icon is drawn here from shapes (24x16, colour numbers 1-7 of the map icons' army rows,
// facing right), after the side view: the armoured body behind, the rail stack on top, the beam
// cannon under it with its emitter, the hover skid.
// Replaces tools/art/naga.mjs (the shape-drawn version), which would overwrite js/art/naga.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, render, encode } from './raster.mjs';

// colour numbers of the icon rows: 1 white, 2-6 light to dark, 7 near black
const BODY = [5, 4, 3, 2], RAIL = [5, 4, 3], GUN = [5, 4, 3, 2], GLOW = [3, 2, 1];
export function mapIcon() {
  const parts = [
    { shape: poly([[2, 13.5], [12, 13.5], [11, 15], [3, 15]]), ramp: [6, 5], bevel: 1 },                       // hover skid
    { shape: rect(5, 1.6, 21.5, 4.2), ramp: RAIL, bevel: 1, bias: 0.25, line: false },                                     // rail stack
    { shape: rect(6, 4.2, 20, 6.2), ramp: [6, 5, 4], bevel: 1, line: false },
    { shape: capsule(8, 9.5, 21, 9.5, 1.9), ramp: GUN, bevel: 1, dome: 1, line: false },                                   // beam cannon
    { shape: poly([[2, 5], [8.5, 4], [11, 6.5], [11, 13], [9.5, 14], [3, 14], [1.5, 11]]), ramp: BODY, bevel: 2, dome: 1 },   // body
    { shape: rect(6.6, 6.6, 9.6, 7.5), ramp: GLOW, flat: 2, line: false },                                    // visor slit
    { shape: ellipse(5.6, 10.6, 1.2, 1.2), ramp: GLOW, bevel: 1, line: false },                              // capacitor orbs
    { shape: ellipse(8.4, 11.4, 1.1, 1.1), ramp: GLOW, bevel: 1, line: false },
  ];
  const img = render(24, 16, parts, { outline: 7, cel: true, smooth: 0 });
  for (const [x, y, c] of [[22, 9, 2], [22, 10, 2], [23, 9, 1], [23, 10, 1], [16, 9, 6], [16, 10, 6], [13, 9, 6], [13, 10, 6]]) img.px[y * 24 + x] = c;   // emitter, barrel rings
  return img;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
  const pic = JSON.parse(readFileSync(new URL('./naga/picture.json', import.meta.url), 'utf8'));
  const fp = JSON.parse(readFileSync(new URL('./naga/poses.json', import.meta.url), 'utf8'));
  const out = `// The Naga's own art (expansion type 21), written by tools/art/naga-xai.mjs; original art, not
// from the ROM. The unit-info picture and the fight poses come from pictures generated with xAI's
// image model (rows of base-36 colour numbers: the picture's own palette; each pose in the small
// craft's fight rows, keyed by the Phoibos sheet tile it stands in for, with a full-colour 96x96
// version for the modern fights); the map icon is drawn from shapes, in the map icons' army rows (1-7).
export const NAGA = {
  art: { w: ${pic.w}, h: ${pic.h}, palette: ${JSON.stringify(pic.palette)},
    rows: ${rows(pic.rows)} },
  icon: { w: 24, h: 16,
    rows: ${rows(encode(mapIcon()))} },
  poses: {
${Object.entries(fp.poses).map(([t, r]) => `    ${t}: { w: 32, h: 32,\n      rows: ${rows(r)} },`).join('\n')}
  },
  posesArt: {
${Object.entries(fp.posesArt).map(([t, a]) => `    ${t}: { w: 96, h: 96, palette: ${JSON.stringify(a.palette)},\n      rows: ${rows(a.rows)} },`).join('\n')}
  },
};
`;
  writeFileSync(new URL('../../js/art/naga.js', import.meta.url), out);
  console.log('wrote js/art/naga.js');
}
