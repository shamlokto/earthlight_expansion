// The Kai series' map icons (24x16), hand-placed: node tools/art/kai-icons.mjs -> js/art/kai-icons.js
// Each icon is a grid of characters, facing right: '.' clear; '1'-'7' a literal colour number of
// the map icons' army rows (1 white, 2-6 light to dark, 7 near black); ':' a light pixel with no
// outline (speed lines); a letter a region of one base tone (TONES), shaded by the tool from its
// place in the region's run down each column (lighter on top, darker below) and lit from the left.
// Every clear pixel touching the icon becomes the outline (7).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TONES = { a: 3, b: 4, c: 5, d: 2, e: 6, f: 4 };
export const SRC = {
  // claw interceptor: two long prongs ahead of the nose, a swept fin, a missile rack, a big engine
  lobsterKai: [
    '',
    '',
    '...b',
    '...bb',
    '...bbb.....dddddddd1',
    '...bbbb...dd',
    '.eaaaaaaaaaaa',
    '.e2aaaaaa66aaaa',
    '.eaaaaaaaaaaaa',
    '.ecccccccccccc',
    '..........dd',
    '....cccccc.dddddddd1',
    '....1.1.1.',
    '',
  ],
  // fighter-bomber: a long beak gun, a tall swept fin, a narrow wing, the heavy missile below
  craneKai: [
    '',
    '..b',
    '..bb',
    '...bb',
    '...bbb',
    '.eaaaaaa66',
    '.e2aaaaaaaaaa.dddddddd1',
    '.eaaaaaaaaaaaa',
    '...ccbbbbbb',
    '.....bbbbbbbbb',
    '',
    '....eeeeeeeeeee1',
    '',
  ],
  // heavy mecha: shoulder cannon over the head, broad shoulders, the long railgun levelled
  titanKai: [
    '',
    '....eeeeeee1',
    '..bbbbb',
    '..bb.aaa',
    '.bbb.a2a.b',
    '.bb7aaaaa7bb',
    '.bb7aaaaa7bbeeeeeeeeeee1',
    '..b7aaaaa7b',
    '...ccccccc',
    '...aa...aa',
    '...bb...bb',
    '...bb...bb',
    '..bbb...bbb',
    '..ccc...ccc',
    '',
  ],
  // slim mecha: V antenna, bright visor, the beam rifle with its glowing bayonet
  marsKai: [
    '',
    '.....d.d',
    '.....aaa',
    '.....a1a',
    '....baaab',
    '...bbaaabb',
    '...b.aaa.beeeeeedd1',
    '....aaaaa',
    '....cc.cc',
    '....aa.aa',
    '....bb.bb',
    '....bb.bb',
    '...bbb.bbb',
    '',
  ],
  // transforming fighter: twin tall tail fins, delta wing, the torpedo underneath
  athenaKaiJet: [
    '',
    '..b..b',
    '..bb.bb',
    '..bbbbbb',
    '.eaaaaaaaaa66',
    '.e2aaaaaaaaaaaaaa1',
    '.eaaaaaaaaaaaaa',
    '...cbbbbbbbb',
    '.....bbbbbbbbb',
    '',
    '....eeeeeeeeeee1',
    '',
  ],
  athenaKaiJetSpent: [
    '',
    '..b..b',
    '..bb.bb',
    '..bbbbbb',
    '.eaaaaaaaaa66',
    '.e2aaaaaaaaaaaaaa1',
    '.eaaaaaaaaaaaaa',
    '...cbbbbbbbb',
    '.....bbbbbbbbb',
    '',
  ],
  // its hunter form: tail fins rising behind the shoulders, the railgun and its bayonet
  athenaKaiRobot: [
    '.b......b',
    '.bb....bb',
    '..bb..bb',
    '...bbbb',
    '....a1a',
    '...baaab',
    '..bbaaabbeeeeeeeeedd1',
    '..b.aaa.b',
    '....ccc',
    '...aa.aa',
    '...bb.bb',
    '...bb.bb',
    '..bbb.bbb',
    '',
  ],
  // fast carrier: an arrowhead hull with launch rails reaching past the bow
  seleneKai: [
    '',
    '',
    '...dddddddddddddddd1',
    '',
    '..bbaaaaaa',
    '.eaaaaaaa66aaa',
    '.e2aaaaaaaaaaaaaaaaaa',
    '.eaaaaaaaaaaaaaa',
    '..cccccccccc',
    '',
    '...dddddddddddddddd1',
    '',
  ],
  // missile boat: a charcoal hull, a raised block of launch cells on the spine, a missile rack on
  // the flank, a small bridge forward, twin engines astern
  cyclopsKai: [
    '',
    '',
    '',
    '.......bbbbbbb',
    '.......b2b2b2b..bb',
    '.ee....bbbbbbb.b1b',
    '.eeccaaaaaaaaaaaaaa',
    '..caaaaaaaaaaaaaaaaaa',
    '.eeaaaaaaaaaaaaaaaaaaa',
    '.eecccc1c1c1c1cccccc',
    '...cccccccccccccccc',
    '',
  ],
  // gunboat: a low wedge, one oversized railgun along the spine past the prow, two big engines
  fenrirKai: [
    '',
    '',
    '',
    '',
    '.eee',
    ':eeeffffffffffffffffff1',
    '.eeeaaaaaaa',
    '...aaaaaaaaaa1a',
    '.eeeaaaaaaaaaaaaaaaa',
    ':eeecccccccccccc',
    '',
  ],
  // gun battleship: a long hull with three big turrets in a row, a tower astern
  asuraKai: [
    '',
    '',
    '',
    '.bb',
    '.b1.f.....f.....f',
    '.bbfff331fff331fff3331',
    '.bbfff...fff...fff',
    '.bbbbbbbbbbbbbbbbbbbb',
    '.eaaaaaaaaaaaaaaaaaaaaa',
    '.e2aaaaaaaaaaaaaaaaaaaaa',
    '.eaaaaaaaaaaaaaaaaaaaa',
    '..cccccccccccccccccccc',
    '....cccccccccccccccc',
    '',
  ],
  // super-flagship: the needle prow, forward-swept wings out to twin heavy cannons on each tip,
  // the crowned bridge, a crimson stripe down the drum, the engine block astern
  azorasKai: [
    '',
    '.....bbbffffffff1',
    '....bbbbffffffff1',
    '.....bbbb',
    '.....bb.d1d',
    '.eebbaaadddaaa',
    '.e2aaaaaaaaaaaaaa',
    '.eeccccccccccccccaaaaa1',
    '.e2aaaaaaaaaaaaaa',
    '.eebbaaaaaaaaaa',
    '.....bb',
    '.....bbbb',
    '....bbbbffffffff1',
    '.....bbbffffffff1',
    '',
  ],
};

export function build(src) {
  const H = 16, W = 24;
  const g = Array.from({ length: H }, (_, y) => { const r = src[y] || ''; if (r.length > W) throw new Error(`row ${y} too long: ${r}`); return r.padEnd(W, '.').split(''); });
  const px = Array.from({ length: H }, () => new Array(W).fill(0));
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && g[y][x] !== '.' && g[y][x] !== ':';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = g[y][x];
    if (ch === '.') continue;
    if (ch === ':') { px[y][x] = 2; continue; }   // speed lines: light, no outline
    if (/[1-7]/.test(ch)) { px[y][x] = +ch; continue; }
    // the region's run in this column: lighter at its top, darker at its bottom
    let up = 0, dn = 0;
    while (y - up - 1 >= 0 && g[y - up - 1][x] === ch) up++;
    while (y + dn + 1 < H && g[y + dn + 1][x] === ch) dn++;
    const f = up + dn ? up / (up + dn) : 0.5;
    let t = TONES[ch] ?? 4;
    if (f < 0.34) t -= 1; else if (f > 0.66) t += 1;
    if (!solid(x - 1, y) && up + dn > 0) t -= 1;   // lit from the left too
    px[y][x] = Math.max(2, Math.min(6, t));
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] !== '.') continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) px[y][x] = 7;
  }
  return { w: W, h: H, rows: px.map((r) => r.join('')) };
}

export const ICONS = Object.fromEntries(Object.entries(SRC).map(([k, s]) => [k, build(s)]));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let out = `// The Kai series' map icons (24x16, facing right), written by tools/art/kai-icons.mjs from its
// hand-placed grids; colour numbers of the map icons' army rows (1 white, 2-6 light to dark, 7 near
// black). js/art/own.js uses them in place of the sets' own icons.
export const ICONS = {
`;
  for (const [k, ic] of Object.entries(ICONS)) out += `  ${k}: { w: 24, h: 16,\n    rows: ${JSON.stringify(ic.rows).replace(/","/g, '",\n      "')} },\n`;
  out += '};\n';
  writeFileSync(new URL('../../js/art/kai-icons.js', import.meta.url), out);
  console.log('wrote js/art/kai-icons.js');
}
