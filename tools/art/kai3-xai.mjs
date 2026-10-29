// The Fenrir Kai's (type 71) and the Asura-II Kai's (type 72) own art, written to js/art/kai3.js.
//   python3 tools/art/kai3-xai.py && node tools/art/kai3-xai.mjs
// The pictures, fight hulls and board tokens come from images generated with xAI's image model
// (tools/art/xai-gen.py; prompts and the chosen sources in tools/art/kai3/), reduced by
// tools/art/kai3-xai.py (<unit>-art.json). The map icons are drawn here from shapes
// (tools/art/raster.mjs) after the generated top views, since 24x16 needs every pixel placed:
// colour numbers 1-7 of the map icons' army rows, facing right.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { poly, ellipse, rect, capsule, union, render, encode } from './raster.mjs';

// icon rows: 1 white, 2-6 light to dark, 7 near black. Ramps darkest first.
const P = { hull: [5, 4, 3, 2], pale: [4, 3, 2, 1], trim: [6, 5, 4], dark: [6, 5], glass: [3, 2, 1], out: 7 };

// the Fenrir Kai from above, bow right: a slim hull drawn out to a sharp prow, the spine railgun
// reaching past it, two engines at the stern, swept fins with missile pods at their tips
const fenrir = () => [
  { shape: union(capsule(1.5, 6.5, 4, 6.5, 1.4), capsule(1.5, 9.5, 4, 9.5, 1.4)), ramp: P.dark, bevel: 1 },
  { shape: union(poly([[4, 6], [9, 6], [7, 2.5], [4, 2.5]]), poly([[4, 10], [9, 10], [7, 13.5], [4, 13.5]])), ramp: P.hull, bevel: 1 },
  { shape: union(capsule(3.5, 2.5, 8, 2.5, 1), capsule(3.5, 13.5, 8, 13.5, 1)), ramp: P.trim, bevel: 1 },
  { shape: poly([[3, 6], [14, 6], [20.5, 8], [14, 10], [3, 10]]), ramp: P.pale, bevel: 2, dome: 1 },
  { shape: ellipse(8.5, 8, 2.2, 1.3), ramp: P.glass, bevel: 1, dome: 1 },
];
const FENRIR_LINES = [[11, 23, 8, 4], [22, 23, 8, 2]];

// the Asura-II Kai from above, bow right: a broad armoured wedge, the command tower, the triple
// rail battery forward, gun sponsons on both flanks, four engines at the stern
const asura = () => [
  { shape: union(capsule(1.5, 4.5, 3.5, 4.5, 1.2), capsule(1.5, 7, 3.5, 7, 1.2), capsule(1.5, 9.5, 3.5, 9.5, 1.2), capsule(1.5, 12, 3.5, 12, 1.2)), ramp: P.dark, bevel: 1 },
  { shape: union(poly([[5, 4], [10, 4], [8, 1], [5, 1]]), poly([[5, 12.5], [10, 12.5], [8, 15], [5, 15]])), ramp: P.hull, bevel: 1 },
  { shape: poly([[3, 3.5], [14, 4.5], [19, 6.5], [19, 10], [14, 12], [3, 13]]), ramp: P.pale, bevel: 2, dome: 1 },
  { shape: rect(7, 6.5, 10.5, 10), ramp: [4, 3, 2], bevel: 1, dome: 1 },
  { shape: ellipse(9, 8.2, 1.4, 1.1), ramp: P.glass, bevel: 1, dome: 1 },
  { shape: ellipse(15, 8, 2.2, 2.6), ramp: [5, 4, 3], bevel: 1, dome: 1 },
];
const ASURA_LINES = [[17, 22, 6, 4], [17, 23, 8, 3], [17, 22, 10, 4], [22, 22, 6, 2], [23, 23, 8, 1], [22, 22, 10, 2]];

function icon(parts, lines) {
  const img = render(24, 16, parts(), { outline: P.out, cel: true, smooth: 0 });
  for (const [x0, x1, y, c] of lines) for (let x = x0; x <= x1; x++) img.px[Math.round(y) * 24 + x] = c;
  return img;
}
export const ICONS = { fenrir: () => icon(fenrir, FENRIR_LINES), asura: () => icon(asura, ASURA_LINES) };

const rows = (r) => JSON.stringify(r).replace(/","/g, '",\n      "');
const pic = (e, pal = true) => `{ w: ${e.w}, h: ${e.h},${pal && e.palette ? ` palette: ${JSON.stringify(e.palette)},` : ''}\n    rows: ${rows(e.rows)} }`;
const load = (u) => JSON.parse(readFileSync(new URL(`./kai3/${u}-art.json`, import.meta.url), 'utf8'));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fe = load('fenrir'), as = load('asura');
  writeFileSync(new URL('../../js/art/kai3.js', import.meta.url), `// The Fenrir Kai's (expansion type 71) and the Asura-II Kai's (type 72) own art, written by
// tools/art/kai3-xai.mjs; original art, not from the ROM. The pictures, the fight hulls and the board
// tokens come from images generated with xAI's image model; the map icons are drawn from shapes.
// Rows of base-36 colour numbers: the picture's own palette; the map icon's numbers in the map
// icons' army rows (1-7); the board token's and the fight hulls' in the ships' fight rows. The
// hulls stand in the box of their looks' hulls (the Fenrir's, the Asura-II's), so the recorded
// shots leave from their guns; \`hullArt\`/\`hull2Art\` are the hulls in full colour, three times
// larger, for the modern fight renderer.
export const FENRIR_KAI = {
  art: ${pic(fe.art)},
  icon: { w: 24, h: 16,
    rows: ${rows(encode(ICONS.fenrir()))} },
  token: ${pic(fe.token, false)},
  // the Fenrir's top-down hull, bow right
  hull: ${pic(fe.hull, false)},
  hullArt: ${pic(fe.hullArt)},
};
export const ASURA_KAI = {
  art: ${pic(as.art)},
  icon: { w: 24, h: 16,
    rows: ${rows(encode(ICONS.asura()))} },
  token: ${pic(as.token, false)},
  // against craft: the hull bow up, broadside to the right; against ships: top-down, bow right
  hull: ${pic(as.hull, false)},
  hull2: ${pic(as.hull2, false)},
  hullArt: ${pic(as.hullArt)},
  hull2Art: ${pic(as.hull2Art)},
};
`);
  console.log('wrote js/art/kai3.js');
}
