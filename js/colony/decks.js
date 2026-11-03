// Earthlight Space Colony Rebuild: the upper and lower decks (docs/COLONY-V4.md, "Stage 1 build
// contract: the three decks"). Pure and deterministic: the same seed and main map always give the
// same decks. The grammar is the main deck's (js/colony/mapgen.js): a split of Eden's interior into
// chambers behind 1-tile bulkheads, 1–2 gates per shared wall, breaches in the walls.
//   generateDecks(seed, main, mainChambers, startId, opts?) → { upper, lower, chambers, shafts }
//     upper / lower: { w, h, t, r, ch, sv } on the main map's grid (same size and indexing)
//     chambers: the two decks' chambers (ids startId…, `deck: 'upper' | 'lower'`, all sealed)
//     shafts: [{ x, y, landing? }] top-left tiles of the 2 × 2 lift shafts, the same on every deck
//   opts: { avoid: Uint8Array (main tiles a shaft must keep clear of, e.g. buildings), landing: id,
//           command: { x, y } (keep the landing shaft a little away from it) }
// The shafts are also stamped into the main map (main.t = SHAFT) once a layout succeeds.
import { T } from './data/terrain.js';
import { hashSeed, mulberry32, fbm, hypot, gatesConnect } from './mapgen.js';

const NONE = 255;
export const DECKS = ['upper', 'main', 'lower'];
export const DECK_NAME = { upper: 'Upper deck', main: 'Main deck', lower: 'Lower deck' };
export const SHAFT = { size: 2, min: 6, max: 8 };
const COUNT = { min: 16, max: 22 };
const SALVAGE_RUBBLE = 40;

const NAMES = {
  garden: ['Sunwell Garden', 'Glasshouse Walk', 'Halo Gardens', 'Rainbarrel Gardens', 'Canopy Walk', 'Heliotrope Gardens',
    'Lightfall Orchard', 'Skylark Beds', 'Dewpond Garden', 'Morning Terrace'],
  dome: ['Starlight Dome', 'Orrery Dome', 'Belvedere', 'Zenith Dome', 'Earthrise Dome', 'Prism Hall', 'Lantern Dome'],
  ring: ['Lantern Ring', 'Aurora Ring', 'Meridian Ring', 'Moonrise Ring', 'High Commons', 'Cloud Terrace', 'Kite Terrace',
    'Halo Row', 'Weathervane Ring', 'Sundial Court'],
  gallery: ['Skyward Gallery', 'Bellwether Gallery', 'Skylight Arcade', 'Upper Promenade', 'Lark Gallery', 'Lightwell Court',
    'Weathervane Hall', 'Mirror Gallery', 'Choir Loft', 'Long Balcony'],
  machinery: ['Pump Hall', 'Turbine Pit', 'Valve Chambers', 'Deep Conduit', 'Pipeworks', 'Gearpit', 'Furnace Row', 'Ironroot Hall',
    'Coolant Galleries', 'Dynamo Undercroft'],
  cistern: ['Old Cistern', 'Sump Hall', 'Saltwater Vault', 'Rain Tanks', 'Settling Pools', 'Well of Eden', 'Overflow Hall'],
  flooded: ['Drowned Arcade', 'Silt Tunnels', 'Flood Locks', 'Black Sluice', 'Weeping Drains', 'Sunken Sidings', 'Mudline'],
  catacomb: ['Ossuary', 'Undercroft', 'Bone Gallery', 'Cable Crypts', 'Echo Catacombs', 'Lamplighters\' Crypt', 'Quiet Ossuary',
    'Hollow Saints', 'Last Light Crypt'],
  core: ['Reactor Approach', 'Heatwell', 'Boiler Vaults', 'Core Stair', 'Ember Hall', 'Thermal Gallery', 'Old Furnace'],
};
const KINDS = { upper: ['garden', 'dome', 'ring', 'gallery'], lower: ['machinery', 'cistern', 'flooded', 'catacomb', 'core'] };

// Floors a building can use, per deck (for the guarantees); the main deck's floors a shaft may replace.
export const DECK_FLOOR = { upper: new Set([T.DECK, T.PLAIN, T.FERTILE, T.POOR]), lower: new Set([T.DECK, T.CONDUIT, T.ROCK]) };
const MAIN_OK = new Set([T.DECK, T.PLAIN, T.FERTILE, T.POOR, T.ROCK, T.RUBBLE, T.HILLS, T.FOREST]);
const FIELDISH = new Set([T.PLAIN, T.FERTILE, T.POOR, T.RIVER, T.LAKE, T.FOREST, T.HILLS]);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Eden's outer box (the hull ring, inclusive) on the main map.
export function hullBox(main) {
  const { w, h, t } = main;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) {
    if (t[i] !== T.HULL) continue;
    const x = i % w, y = (i / w) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) throw new Error('decks: the main map has no hull');
  return { x0, y0, x1, y1 };
}

export function generateDecks(seed, main, mainChambers, startId = mainChambers.length, opts = {}) {
  const rng = mulberry32(hashSeed(`decks:${seed}`));
  for (let attempt = 0; attempt < 40; attempt++) {
    const res = attemptDecks(rng, main, mainChambers, startId, opts);
    if (!res) continue;
    for (const s of res.shafts) for (let dy = 0; dy < SHAFT.size; dy++) for (let dx = 0; dx < SHAFT.size; dx++) {
      const i = (s.y + dy) * main.w + s.x + dx;
      main.t[i] = T.SHAFT; main.r[i] = 0; main.sv[i] = 0;
    }
    return res;
  }
  throw new Error(`decks: no valid decks for seed ${seed}`);
}

function attemptDecks(rng, main, mainChambers, startId, { avoid = null, landing = null, command = null }) {
  const W = main.w, H = main.h, N = W * H;
  const E = hullBox(main), IN = { x0: E.x0 + 2, y0: E.y0 + 2, x1: E.x1 - 2, y1: E.y1 - 2 };
  const rint = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const salt = Math.floor(rng() * 0x7fffffff);
  const noise = (x, y, f, k) => fbm(x * f, y * f, salt + k * 7919);
  const rectTiles = (c) => { const out = []; for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) out.push(y * W + x); return out; };
  const quantile = (vals, q) => vals.slice().sort((a, b) => a - b)[Math.floor(clamp(q, 0, 0.999) * vals.length)];

  // --- the two layouts: Eden's footprint only; the hull ring, bulkheads, chamber floors
  const D = {};
  let nextId = startId;
  for (const deck of ['upper', 'lower']) {
    const rects = splitDeck(rng, IN);
    if (rects.length < COUNT.min || rects.length > COUNT.max) return null;
    rects.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
    const t = new Uint8Array(N).fill(T.OUTSIDE), r = new Uint8Array(N), ch = new Uint8Array(N).fill(NONE), sv = new Uint8Array(N);
    for (let y = E.y0; y <= E.y1; y++) for (let x = E.x0; x <= E.x1; x++) {
      t[y * W + x] = x >= IN.x0 && x <= IN.x1 && y >= IN.y0 && y <= IN.y1 ? T.BULKHEAD : T.HULL;
    }
    const chambers = rects.map((c) => ({ id: nextId++, name: '', kind: '', deck, x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, tiles: 0, status: 'sealed', breaches: [], work: 0 }));
    for (const c of chambers) for (const i of rectTiles(c)) { t[i] = T.DECK; ch[i] = c.id; }
    D[deck] = { t, r, ch, sv, chambers, byId: new Map(chambers.map((c) => [c.id, c])) };
  }
  if (nextId > NONE) return null;

  // --- lift shafts: a 2 × 2 site with a 1-tile margin inside one chamber on every deck
  const landId = landing ?? mainChambers.find((c) => c.kind === 'landing')?.id ?? mainChambers.find((c) => c.status === 'open')?.id ?? null;
  const site = (x, y) => {
    let m = -1, u = -1, l = -1;
    for (let dy = -1; dy <= SHAFT.size; dy++) for (let dx = -1; dx <= SHAFT.size; dx++) {
      const i = (y + dy) * W + x + dx;
      const mc = main.ch[i], uc = D.upper.ch[i], lc = D.lower.ch[i];
      if (mc === NONE || uc === NONE || lc === NONE || !MAIN_OK.has(main.t[i]) || (avoid && avoid[i])) return null;
      if ((m >= 0 && mc !== m) || (u >= 0 && uc !== u) || (l >= 0 && lc !== l)) return null;
      m = mc; u = uc; l = lc;
    }
    return { x, y, main: m, upper: u, lower: l };
  };
  const nearRiver = (x, y, rad) => { for (let dy = -rad; dy <= rad + 1; dy++) for (let dx = -rad; dx <= rad + 1; dx++) { const v = main.t[(y + dy) * W + x + dx]; if (v === T.RIVER || v === T.LAKE) return true; } return false; };
  const fertile = (x, y) => { let n = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (main.t[(y + dy) * W + x + dx] === T.FERTILE) n++; return n; };
  const cands = [];
  for (let y = IN.y0 + 1; y <= IN.y1 - SHAFT.size; y++) for (let x = IN.x0 + 1; x <= IN.x1 - SHAFT.size; x++) {
    const s = site(x, y);
    if (s) cands.push(s);
  }
  // the landing chamber's shaft: off the fertile banks and the river, a little away from the Command Centre
  let home = null, best = Infinity;
  for (const s of cands) {
    if (s.main !== landId) continue;
    const cmd = command ? Math.max(Math.abs(s.x + 1 - (command.x + 1.5)), Math.abs(s.y + 1 - (command.y + 1.5))) : 10;
    const score = fertile(s.x, s.y) * 4 + (nearRiver(s.x, s.y, 2) ? 12 : 0) + Math.max(0, 7 - cmd) * 4 + Math.abs(cmd - 9) * 0.3 + rng() * 3;
    if (score < best) { best = score; home = s; }
  }
  if (!home) {   // a crowded old colony: any open chamber will do, else any chamber at all
    const open = new Set(mainChambers.filter((c) => c.status === 'open').map((c) => c.id));
    const alt = cands.filter((s) => open.has(s.main));
    home = alt.length ? pick(alt) : cands.length ? pick(cands) : null;
  }
  if (!home) return null;
  const want = rint(SHAFT.min, SHAFT.max), shafts = [home];
  const pool = shuffle(cands.filter((s) => s.main !== home.main && !nearRiver(s.x, s.y, 1)));
  const far = (s, d) => shafts.every((o) => Math.max(Math.abs(o.x - s.x), Math.abs(o.y - s.y)) >= d);
  for (const [d, distinct] of [[30, true], [26, true], [22, false], [18, false], [14, false]]) {
    for (const s of pool) {
      if (shafts.length >= want) break;
      if (!far(s, d)) continue;
      if (distinct && shafts.some((o) => o.upper === s.upper || o.lower === s.lower || o.main === s.main)) continue;
      shafts.push(s);
    }
  }
  if (shafts.length < SHAFT.min) return null;
  const shaftCh = { upper: new Set(shafts.map((s) => s.upper)), lower: new Set(shafts.map((s) => s.lower)) };

  // --- chamber kinds: upper gardens and domes under the sky panels over the main deck's fields
  const fieldShare = (c) => { let n = 0, k = 0; for (const i of rectTiles(c)) { k++; if (FIELDISH.has(main.t[i])) n++; } return n / k; };
  const riverShare = (c) => { let n = 0, k = 0; for (const i of rectTiles(c)) { k++; if (main.t[i] === T.RIVER) n++; } return n / k; };
  // the chambers most over the fields are gardens (about two in five), then a few domes, the rest
  // habitat rings and galleries
  const byField = D.upper.chambers.map((c) => ({ c, f: fieldShare(c) + rng() * 0.25 })).sort((a, b) => b.f - a.f);
  const nGarden = Math.round(byField.length * 0.4), nDome = Math.round(byField.length * 0.15);
  byField.forEach(({ c }, k) => { c.kind = k < nGarden ? 'garden' : k < nGarden + nDome ? 'dome' : rng() < 0.5 ? 'ring' : 'gallery'; });
  for (const c of D.lower.chambers) {
    let v = rng();
    c.kind = v < 0.28 ? 'machinery' : (v -= 0.28) < 0.15 ? 'cistern' : (v -= 0.15) < 0.2 ? 'flooded' : (v -= 0.2) < 0.22 ? 'catacomb' : 'core';
    if (riverShare(c) > 0.02 && rng() < 0.5) c.kind = 'flooded';
  }
  // the chambers the home shaft opens first are friendly: a garden or ring above, a machinery hall or cistern below
  D.upper.byId.get(home.upper).kind = pick(['garden', 'ring']);
  D.lower.byId.get(home.lower).kind = pick(['machinery', 'cistern']);
  for (const deck of ['upper', 'lower']) {
    const pools = {};
    for (const k of KINDS[deck]) pools[k] = shuffle(NAMES[k].slice());
    for (const c of D[deck].chambers) c.name = pools[c.kind].pop() || `${c.kind[0].toUpperCase()}${c.kind.slice(1)} ${c.id}`;
  }

  // --- floors
  const tunnel = (dk, c, ter, rad, onto) => {   // a winding passage across the chamber
    const { t, ch } = dk, horiz = (c.x1 - c.x0) >= (c.y1 - c.y0) ? rng() < 0.75 : rng() < 0.25;
    let x = horiz ? c.x0 : rint(c.x0 + 2, c.x1 - 2) + 0.5, y = horiz ? rint(c.y0 + 2, c.y1 - 2) + 0.5 : c.y0, drift = 0;
    for (let k = 0; k < 400; k++) {
      const rr = rad + (noise(x, y, 0.4, 11) - 0.5) * 0.8;
      for (let ty = Math.floor(y - rr - 1); ty <= y + rr + 1; ty++) for (let tx = Math.floor(x - rr - 1); tx <= x + rr + 1; tx++) {
        if (tx < c.x0 || tx > c.x1 || ty < c.y0 || ty > c.y1) continue;
        const i = ty * W + tx;
        if (ch[i] === c.id && onto.has(t[i]) && hypot(tx + 0.5 - x, ty + 0.5 - y) <= rr) t[i] = ter;
      }
      drift = clamp(drift + (rng() - 0.5) * 0.5, -0.8, 0.8);
      if (horiz) { x += 1; y = clamp(y + drift, c.y0 + 1, c.y1 - 1); if (x > c.x1 + 1) break; } else { y += 1; x = clamp(x + drift, c.x0 + 1, c.x1 - 1); if (y > c.y1 + 1) break; }
    }
  };
  const glassAt = new Uint8Array(N);
  {
    const { t } = D.upper;
    for (const c of D.upper.chambers) {
      const tiles = rectTiles(c), n1 = tiles.map((i) => noise(i % W, (i / W) | 0, 0.13, 1));
      const cx = (c.x0 + c.x1 + 1) / 2, cy = (c.y0 + c.y1 + 1) / 2, rad = Math.min(c.x1 - c.x0, c.y1 - c.y0) / 3;
      if (c.kind === 'gallery') { const q = quantile(n1, 0.8); tiles.forEach((i, k) => { t[i] = n1[k] > q ? T.PLAIN : T.DECK; }); }
      else if (c.kind === 'ring') {
        const q = quantile(n1, 0.45), qf = quantile(n1, 0.9);
        tiles.forEach((i, k) => { const x = i % W, y = (i / W) | 0, inner = x - c.x0 >= 3 && c.x1 - x >= 3 && y - c.y0 >= 3 && c.y1 - y >= 3; t[i] = inner && n1[k] > qf ? T.FERTILE : inner && n1[k] > q ? T.PLAIN : T.DECK; });
      } else if (c.kind === 'garden') {
        const qf = quantile(n1, 0.72), qp = quantile(n1, 0.1);
        tiles.forEach((i, k) => { const x = i % W, y = (i / W) | 0, edge = x === c.x0 || x === c.x1 || y === c.y0 || y === c.y1; t[i] = edge ? T.DECK : n1[k] > qf ? T.FERTILE : n1[k] < qp ? T.POOR : T.PLAIN; });
      } else tiles.forEach((i) => { const x = i % W, y = (i / W) | 0; t[i] = hypot(x + 0.5 - cx, y + 0.5 - cy) <= rad ? T.PLAIN : T.DECK; });
      // sky panels: rows of glass over the fields below (a dome is glass wherever it stands), with
      // walkways between the panels and a clear border inside the walls
      if (c.kind === 'garden' || c.kind === 'dome') {
        const period = rint(5, 7), gap = rint(8, 11), ox = rint(0, gap - 1);
        for (const i of tiles) {
          const x = i % W, y = (i / W) | 0;
          if (x - c.x0 < 2 || c.x1 - x < 2 || y - c.y0 < 2 || c.y1 - y < 2) continue;
          const row = (y - c.y0) % period, col = (x - c.x0 + ox) % gap;
          if ((row === 2 || row === 3) && col !== 0 && (c.kind === 'dome' || FIELDISH.has(main.t[i]))) { t[i] = T.GLASS; glassAt[i] = 1; }
        }
      }
    }
  }
  {
    const { t, sv } = D.lower;
    for (const c of D.lower.chambers) {
      const tiles = rectTiles(c), n1 = tiles.map((i) => noise(i % W, (i / W) | 0, 0.13, 2)), n2 = tiles.map((i) => noise(i % W, (i / W) | 0, 0.1, 3));
      if (c.kind === 'machinery') { const q = quantile(n1, 0.6), qr = quantile(n2, 0.93); tiles.forEach((i, k) => { t[i] = n2[k] > qr ? T.RUBBLE : n1[k] > q ? T.DECK : T.CONDUIT; }); }
      else if (c.kind === 'core') { const q = quantile(n1, 0.6); tiles.forEach((i, k) => { t[i] = n1[k] > q ? T.ROCK : T.CONDUIT; }); }
      else if (c.kind === 'cistern') { const qm = quantile(n2, 0.78), qr = quantile(n1, 0.9); tiles.forEach((i, k) => { t[i] = n2[k] > qm ? T.MARSH : n1[k] > qr ? T.ROCK : T.DECK; }); }
      else if (c.kind === 'flooded') {
        const q = quantile(n1, 0.5);
        tiles.forEach((i, k) => { t[i] = n1[k] > q ? T.ROCK : T.DECK; });
        for (let k = rint(2, 3); k > 0; k--) tunnel(D.lower, c, T.MARSH, 1.1 + rng() * 0.6, new Set([T.DECK, T.ROCK]));
      } else {
        const q = quantile(n1, 0.72);
        tiles.forEach((i, k) => { t[i] = n1[k] > q ? T.DECK : T.ROCK; });
        for (let k = rint(2, 4); k > 0; k--) tunnel(D.lower, c, T.CATACOMB, 0.9 + rng() * 0.7, new Set([T.DECK, T.ROCK]));
      }
      // the river's old leaks: flooded ground under the main deck's river
      if (c.kind !== 'core') for (const i of tiles) if (main.t[i] === T.RIVER && noise(i % W, (i / W) | 0, 0.3, 8) > 0.38 && t[i] !== T.CATACOMB) t[i] = T.MARSH;
      for (const i of tiles) if (t[i] === T.RUBBLE) sv[i] = SALVAGE_RUBBLE;
    }
  }
  // the shafts on both decks, with a clear floor ring around each
  for (const s of shafts) for (let dy = -1; dy <= SHAFT.size; dy++) for (let dx = -1; dx <= SHAFT.size; dx++) {
    const i = (s.y + dy) * W + s.x + dx, inner = dx >= 0 && dy >= 0 && dx < SHAFT.size && dy < SHAFT.size;
    D.upper.t[i] = inner ? T.SHAFT : T.DECK; glassAt[i] = 0;
    D.lower.t[i] = inner ? T.SHAFT : T.CONDUIT; D.lower.sv[i] = 0;
  }

  // --- gates and breaches, as on the main deck
  for (const deck of ['upper', 'lower']) {
    const { t, ch, chambers, byId } = D[deck];
    const walls = new Map();
    for (let y = IN.y0; y <= IN.y1; y++) for (let x = IN.x0; x <= IN.x1; x++) {
      const i = y * W + x;
      if (t[i] !== T.BULKHEAD) continue;
      for (const [p, q] of [[i - 1, i + 1], [i - W, i + W]]) {
        const a = ch[p], b = ch[q];
        if (a === NONE || b === NONE || a === b) continue;
        const key = Math.min(a, b) * 256 + Math.max(a, b);
        if (!walls.has(key)) walls.set(key, []);
        walls.get(key).push(i);
      }
    }
    const cheb = (i, j) => Math.max(Math.abs((i % W) - (j % W)), Math.abs(((i / W) | 0) - ((j / W) | 0)));
    for (const [, tiles] of walls) {
      if (tiles.length < 3) continue;
      const n = tiles.length >= 14 && rng() < 0.45 ? 2 : 1, trim = tiles.length >= 7 ? 2 : 1, have = [];
      for (let g = 0; g < n; g++) {
        const cand = tiles.slice(trim, tiles.length - trim).filter((i) => t[i] === T.BULKHEAD && !have.some((j) => cheb(i, j) < 6));
        if (cand.length) { const i = pick(cand); t[i] = T.GATE; have.push(i); }
      }
    }
    const touchesHull = (c) => c.x0 === IN.x0 || c.x1 === IN.x1 || c.y0 === IN.y0 || c.y1 === IN.y1;
    const homeCh = deck === 'upper' ? home.upper : home.lower;
    const lim = (c) => (c.id === homeCh ? [1, 2] : touchesHull(c) ? [1, 4] : deck === 'upper' ? [0, 2] : [1, 3]);
    const count = new Map(chambers.map((c) => [c.id, 0]));
    const adjCh = (i) => { const s = []; for (const d of [-1, 1, -W, W]) { const c = ch[i + d]; if (c !== NONE && !s.includes(c)) s.push(c); } return s; };
    const near = (i, rad, pred) => { const x = i % W, y = (i / W) | 0; for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (pred((y + dy) * W + x + dx)) return true; return false; };
    const hullBias = deck === 'upper' ? 0.6 : 0.3;   // the upper deck's wounds face the sky; the lower's are cracked bulkheads
    for (const c of shuffle(chambers.slice())) {
      const [mn, mx] = lim(c);
      const target = rint(mn, mx);
      // a breach in the sky panels (upper deck)
      if (deck === 'upper' && count.get(c.id) < target && rng() < 0.5) {
        const glass = rectTiles(c).filter((i) => glassAt[i] && !near(i, 2, (j) => t[j] === T.SHAFT || t[j] === T.BREACH));
        if (glass.length) { const i = pick(glass); t[i] = T.BREACH; c.breaches.push(i); count.set(c.id, count.get(c.id) + 1); }
      }
      const ring = [];
      for (let x = c.x0; x <= c.x1; x++) ring.push((c.y0 - 1) * W + x, (c.y1 + 1) * W + x);
      for (let y = c.y0; y <= c.y1; y++) ring.push(y * W + c.x0 - 1, y * W + c.x1 + 1);
      while (count.get(c.id) < target) {
        const cand = ring.filter((i) => {
          if (t[i] !== T.HULL && t[i] !== T.BULKHEAD) return false;
          const s = adjCh(i);
          if (!s.includes(c.id) || s.some((b) => count.get(b) >= lim(byId.get(b))[1])) return false;
          return !near(i, 2, (j) => t[j] === T.BREACH || t[j] === T.GATE);
        });
        if (!cand.length) break;
        const hull = cand.filter((i) => t[i] === T.HULL);
        const i = hull.length && rng() < hullBias ? pick(hull) : pick(cand);
        t[i] = T.BREACH;
        for (const b of adjCh(i)) { count.set(b, count.get(b) + 1); byId.get(b).breaches.push(i); }
      }
    }
    if (chambers.some((c) => count.get(c.id) < lim(c)[0])) return null;
    // every chamber reachable through gates, so from any shaft; room to build in each
    if (!gatesConnect(t, ch, chambers, chambers[0].id)) return null;
    const floor = DECK_FLOOR[deck];
    for (const c of chambers) {
      let n = 0, build = 0;
      for (const i of rectTiles(c)) if (ch[i] === c.id) { n++; if (floor.has(t[i])) build++; }
      c.tiles = n;
      if (build < 40) return null;
    }
    for (const c of chambers) c.breaches.sort((a, b) => a - b);
  }
  const strip = (dk) => ({ w: W, h: H, t: D[dk].t, r: D[dk].r, ch: D[dk].ch, sv: D[dk].sv });
  return {
    upper: strip('upper'), lower: strip('lower'),
    chambers: [...D.upper.chambers, ...D.lower.chambers],
    shafts: shafts.map((s, k) => (k === 0 ? { x: s.x, y: s.y, landing: true } : { x: s.x, y: s.y })),
  };
}

// Recursive split of the interior into 16–22 rectangles; each split line becomes a bulkhead.
function splitDeck(rng, IN) {
  const MINW = 14, MINH = 12;
  const leaves = [{ ...IN, done: false }];
  const target = COUNT.min + 1 + Math.floor(rng() * (COUNT.max - COUNT.min - 1));
  const split = (l) => {
    const w = l.x1 - l.x0 + 1, h = l.y1 - l.y0 + 1;
    const vert = w > 1.6 * h ? true : h > 1.25 * w ? false : rng() < 0.55;
    for (const v of [vert, !vert]) for (let k = 0; k < 8; k++) {
      const f = 0.3 + 0.4 * rng();
      if (v) {
        const s = l.x0 + Math.round(w * f);
        if (s - l.x0 >= MINW && l.x1 - s >= MINW) return [{ x0: l.x0, y0: l.y0, x1: s - 1, y1: l.y1 }, { x0: s + 1, y0: l.y0, x1: l.x1, y1: l.y1 }];
      } else {
        const s = l.y0 + Math.round(h * f);
        if (s - l.y0 >= MINH && l.y1 - s >= MINH) return [{ x0: l.x0, y0: l.y0, x1: l.x1, y1: s - 1 }, { x0: l.x0, y0: s + 1, x1: l.x1, y1: l.y1 }];
      }
    }
    return null;
  };
  for (let guard = 0; leaves.length < target && guard < 400; guard++) {
    const open = leaves.filter((l) => !l.done);
    if (!open.length) break;
    const wts = open.map((l) => { const a = (l.x1 - l.x0 + 1) * (l.y1 - l.y0 + 1); return a * Math.sqrt(Math.sqrt(a)); });
    let v = rng() * wts.reduce((s, w) => s + w, 0), leaf = open[open.length - 1];
    for (let k = 0; k < open.length; k++) if ((v -= wts[k]) <= 0) { leaf = open[k]; break; }
    const kids = split(leaf);
    if (!kids) { leaf.done = true; continue; }
    leaves.splice(leaves.indexOf(leaf), 1, { ...kids[0], done: false }, { ...kids[1], done: false });
  }
  return leaves.map(({ x0, y0, x1, y1 }) => ({ x0, y0, x1, y1 }));
}
