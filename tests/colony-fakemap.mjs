// A stand-in for js/colony/mapgen.js generateMap(seed): the same shape (docs/COLONY-V1.md "The
// map"), drawn as a plain grid so tests/colony-sim.mjs runs without the real generator.
// Eden: 6 × 4 chambers behind bulkheads, the river along the bottom row, the landing chamber at the
// bottom centre with the dock below it; an asteroid cluster with ore seams and a magnetic belt
// within the dock's reach.
import { T, R } from '../js/colony/data/terrain.js';

export function generateFakeMap(seed = 1) {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const w = 256, h = 160, n = w * h;
  const t = new Uint8Array(n), r = new Uint8Array(n), ch = new Uint8Array(n).fill(255), sv = new Uint8Array(n);
  const I = (x, y) => y * w + x;
  for (let y = 144; y < 154; y++) for (let x = 0; x < w; x++) t[I(x, y)] = T.ATMOSPHERE;
  for (let y = 154; y < h; y++) for (let x = 0; x < w; x++) t[I(x, y)] = T.EARTH;
  // Deep space: a few asteroid blobs and a magnetic streak.
  for (let k = 0; k < 40; k++) {
    const cx = (rnd() * w) | 0, cy = (rnd() * 144) | 0;
    if (cx >= 46 && cx <= 209 && cy >= 30 && cy <= 113) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < w && y >= 0 && y < 144 && dx * dx + dy * dy <= 5) t[I(x, y)] = k % 3 ? T.ASTEROID : T.MAGNETIC;
    }
  }
  // Eden's hull, 2 thick, and the interior.
  for (let y = 32; y <= 111; y++) for (let x = 48; x <= 207; x++) t[I(x, y)] = (y < 34 || y > 109 || x < 50 || x > 205) ? T.HULL : T.BULKHEAD;
  const cols = [], rows = [];
  for (let k = 0; k < 6; k++) cols.push([50 + k * 26, k === 5 ? 205 : 50 + k * 26 + 24]);
  for (let j = 0; j < 4; j++) rows.push([34 + j * 19, j === 3 ? 109 : 34 + j * 19 + 17]);
  const riverY = (x) => 100 + Math.round(2 * Math.sin(x / 9));
  const chambers = [];
  const KINDS = ['fields', 'rubble', 'deck', 'fields', 'rubble', 'deck'];
  for (let j = 0; j < 4; j++) for (let k = 0; k < 6; k++) {
    const id = chambers.length, [x0, x1] = cols[k], [y0, y1] = rows[j];
    const landing = j === 3 && k === 3;
    const kind = landing ? 'landing' : j === 3 ? 'river' : KINDS[(k + j) % 6];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = I(x, y);
      ch[i] = id;
      let ter = T.PLAIN;
      if (kind === 'deck' || (landing && y < y0 + 5)) ter = T.DECK;
      else if (kind === 'fields' && rnd() < 0.3) ter = T.POOR;
      else if ((kind === 'rubble' && rnd() < 0.45) || (kind === 'river' && x % 25 < 6 && rnd() < 0.5)) { ter = T.RUBBLE; sv[i] = 40; if (rnd() < 0.08) { r[i] = R.WRECK; sv[i] = 120; } }
      if (j === 3) { const ry = riverY(x); if (y === ry || y === ry + 1) ter = T.RIVER; else if (y >= ry - 3 && y <= ry + 4) ter = T.FERTILE; }
      if (ter !== T.RUBBLE) { sv[i] = 0; r[i] = R.NONE; }
      t[i] = ter;
    }
    chambers.push({ id, name: landing ? 'Landfall' : `Chamber ${String.fromCharCode(65 + k)}${j + 1}`, kind, x0, y0, x1, y1,
      tiles: (x1 - x0 + 1) * (y1 - y0 + 1), status: landing ? 'open' : 'sealed', breaches: [], work: 0 });
  }
  // Gates: one per wall segment, plus where the river crosses a bulkhead.
  for (let j = 0; j < 4; j++) for (let k = 0; k < 5; k++) { const x = cols[k][1] + 1; t[I(x, (rows[j][0] + rows[j][1]) >> 1)] = T.GATE; }
  for (let j = 0; j < 3; j++) for (let k = 0; k < 6; k++) { const y = rows[j][1] + 1; t[I((cols[k][0] + cols[k][1]) >> 1, y)] = T.GATE; }
  for (let k = 0; k < 5; k++) { const x = cols[k][1] + 1, ry = riverY(x); t[I(x, ry)] = T.GATE; t[I(x, ry + 1)] = T.GATE; }
  // Breaches: 1–4 per chamber on its walls, never on the landing chamber's own walls.
  const landing = chambers.find((c) => c.kind === 'landing');
  const nearLanding = (x, y) => x >= landing.x0 - 1 && x <= landing.x1 + 1 && y >= landing.y0 - 1 && y <= landing.y1 + 1;
  for (const c of chambers) {
    if (c === landing) continue;
    const want = 1 + ((rnd() * 4) | 0);
    for (let tries = 0; c.breaches.length < want && tries < 200; tries++) {
      const side = (rnd() * 4) | 0, along = rnd();
      let x = c.x0 + Math.round(along * (c.x1 - c.x0)), y = c.y0 + Math.round(along * (c.y1 - c.y0));
      if (side === 0) y = c.y0 - 1; else if (side === 1) y = c.y1 + 1; else if (side === 2) x = c.x0 - 1; else x = c.x1 + 1;
      const i = I(x, y);
      if ((t[i] !== T.BULKHEAD && t[i] !== T.HULL) || nearLanding(x, y)) continue;
      t[i] = T.BREACH;
      for (const d of chambers) if ([ch[i - 1], ch[i + 1], ch[i - w], ch[i + w]].includes(d.id)) d.breaches.push(i);
    }
  }
  // Near space: the dock below the landing chamber, an asteroid cluster with seams and a magnetic belt.
  const dock = { x: 136, y: 110 };
  for (let y = 115; y <= 121; y++) for (let x = 112; x <= 119; x++) if ((x - 115.5) ** 2 / 16 + (y - 118) ** 2 / 12 <= 1.2) t[I(x, y)] = T.ASTEROID;
  for (const [x, y] of [[114, 117], [117, 119], [115, 120]]) r[I(x, y)] = R.ORE_SEAM;
  for (let k = 0; k < 16; k++) for (let d = 0; d < 3; d++) t[I(146 + k + d, 114 + k)] = T.MAGNETIC;
  for (const [x, y] of [[125, 125], [150, 135], [105, 112]]) { r[I(x, y)] = R.WRECK; sv[I(x, y)] = 120; }
  return { map: { w, h, t, r, ch, sv }, chambers, start: { command: { x: landing.x0 + 9, y: landing.y0 + 1 }, dock, landing: landing.id } };
}
