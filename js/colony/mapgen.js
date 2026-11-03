// Earthlight Space Colony Rebuild: the map generator (docs/COLONY-V1.md "The map", docs/COLONY.md §5).
// Pure and deterministic: no DOM, no Math.random; the same seed always gives the same map.
//   generateMap(seed) → { map: { w, h, t, r, ch, sv }, chambers, start: { command, dock, landing } }
// The seeded helpers (hashSeed, mulberry32, fbm, hypot, gatesConnect) are shared with decks.js (version 4).
// Space follows Earth Light's landscape grammar (organic blobs and rivers, diagonal magnetic belts,
// never straight bands); Eden is a walled fortress of chambers split by bulkheads with gates.
import { T, R } from './data/terrain.js';

const W = 256, H = 160;
const EDEN = { x0: 48, y0: 32, x1: 207, y1: 111 };   // outer edge of the 2-tile hull (inclusive)
const IN = { x0: 50, y0: 34, x1: 205, y1: 109 };     // the interior inside the hull
const ATMO_Y = 144, EARTH_Y = 154;
const NONE = 255;                                     // map.ch: not in a chamber
const MARGIN = 2;                                     // void kept around the hull so its outline reads
const REACH = 24;                                     // dock reach (buildings.js DOCK_REACH)
const SALVAGE = { rubble: 40, wreck: 120 };

const NAMES = {
  landing: ['Landfall Quarter'],
  fields: ['Long Meadow', 'Barley Rows', 'Seedvault Commons', 'Orchard Ward', 'Greenfold', 'Haymarket Fields',
    'Sunlamp Acres', 'Old Allotments', 'Clover Terrace', 'Fallow Reach', 'Windrow Fields', 'Hopewell Green',
    'Quiet Furrows', 'Lantern Fields'],
  river: ['Riverside Fields', 'Millrace', 'Ferry Ward', 'Willow Bend', 'Weir Gardens', 'Reedwater', 'Lockside',
    'Upper Ford', 'Kingfisher Reach', 'Bridgefoot', 'Eelgrass Bank', 'Sluice Meadows'],
  rubble: ['Ash District', 'Old Market', 'Shattered Ward', 'Cinder Row', 'Broken Spire', 'Scorch Quarter',
    'Tumbledown', 'Gutted Arcade', 'Ruin Court', 'Blastyard', 'Glasswreck Lanes', 'Fallen Chapel', 'Smoke Hollow',
    'Last Stand Square'],
  deck: ['Foundry Deck', 'Dynamo Hall', 'Cargo Deck', 'Pump Gallery', 'Machine Row', 'Signal Deck',
    'Coldstore Deck', 'Assembly Bay', 'Turbine Hall', 'Rail Yard', 'Gantry Deck', 'Crane Hall', 'Boiler Deck',
    'Muster Deck'],
};

// --- seeded randomness -----------------------------------------------------------------------------

export function hashSeed(seed) {
  const s = String(seed);
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function mulberry32(seed) {
  const st = new Int32Array([seed]);   // state in a typed array: no boxed number per call
  return () => {
    const a = (st[0] = (st[0] + 0x6d2b79f5) | 0);
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Value noise on a hashed lattice, two octaves: smooth organic fields in 0..1.
function lattice(ix, iy, s) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(s, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = lattice(ix, iy, s), b = lattice(ix + 1, iy, s), c = lattice(ix, iy + 1, s), d = lattice(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, y, s) => (vnoise(x, y, s) * 2 + vnoise(x * 2.03 + 17.1, y * 2.03 + 5.3, s + 1)) / 3;

// Engine-exact maths: Math.sin/cos/hypot/pow may differ in the last bit between JS engines, which
// would let node and a browser grow different maps from one seed. +, *, / and sqrt are exact (IEEE).
const PI = 3.141592653589793;
function sin(x) {
  x -= 2 * PI * Math.round(x / (2 * PI));            // to [-π, π]
  if (x > PI / 2) x = PI - x; else if (x < -PI / 2) x = -PI - x;
  const x2 = x * x;                                   // Taylor to x^11 on [-π/2, π/2]: error < 1e-7
  return x * (1 - x2 / 6 * (1 - x2 / 20 * (1 - x2 / 42 * (1 - x2 / 72 * (1 - x2 / 110)))));
}
const cos = (x) => sin(x + PI / 2);
export const hypot = (x, y) => Math.sqrt(x * x + y * y);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// --- public ----------------------------------------------------------------------------------------

export function generateMap(seed = 1) {
  const rng = mulberry32(hashSeed(seed));
  // A layout can occasionally miss a guarantee (no river route, a cramped landing): try again with
  // the same generator, so the result stays deterministic.
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = attemptMap(rng);
    if (res) return res;
  }
  throw new Error(`mapgen: no valid map for seed ${seed}`);
}

// --- one attempt -----------------------------------------------------------------------------------

function attemptMap(rng) {
  const rint = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const salt = Math.floor(rng() * 0x7fffffff);
  const noise = (x, y, f, k) => fbm(x * f, y * f, salt + k * 7919);

  const N = W * H;
  const t = new Uint8Array(N), r = new Uint8Array(N), ch = new Uint8Array(N).fill(NONE), sv = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) t[y * W + x] = y >= EARTH_Y ? T.EARTH : y >= ATMO_Y ? T.ATMOSPHERE : T.VOID;
  // Eden: the hull ring, the interior all bulkhead until the chamber floors are carved out of it.
  for (let y = EDEN.y0; y <= EDEN.y1; y++) for (let x = EDEN.x0; x <= EDEN.x1; x++) {
    const inside = x >= IN.x0 && x <= IN.x1 && y >= IN.y0 && y <= IN.y1;
    t[y * W + x] = inside ? T.BULKHEAD : T.HULL;
  }

  // --- chambers: a BSP split of the interior; the split lines are the 1-tile bulkheads
  const anchor = { x: 128, y: IN.y1 };   // the landing chamber: bottom centre, above the dock
  const rects = splitChambers(rng, anchor);
  rects.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const chambers = rects.map((c, id) => ({ id, name: '', kind: '', x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, tiles: 0, status: 'sealed', breaches: [], work: 0 }));
  for (const c of chambers) for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) { t[y * W + x] = T.PLAIN; ch[y * W + x] = c.id; }
  const land = chambers.find((c) => anchor.x >= c.x0 && anchor.x <= c.x1 && anchor.y >= c.y0 && anchor.y <= c.y1);
  const touchesHull = (c) => c.x0 === IN.x0 || c.x1 === IN.x1 || c.y0 === IN.y0 || c.y1 === IN.y1;

  // Shared walls: bulkhead tiles with floor of two different chambers on opposite sides.
  const walls = new Map();   // key a*256+b (a < b) → [tile index]
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
  const landNb = new Set();
  for (const key of walls.keys()) { const a = key >> 8, b = key & 255; if (a === land.id) landNb.add(b); if (b === land.id) landNb.add(a); }

  // --- the river's route: a chain of chambers west → east through the landing chamber. Most steps
  // cross a vertical bulkhead; up to two a side climb north, so the river arcs up over the colony
  // away from the landing chamber. Every step needs room for the 3-tile crossing and its gate.
  const span = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) + 1;
  const isClimb = (cur, d) => d.y1 === cur.y0 - 2 && span(cur.x0, cur.x1, d.x0, d.x1) >= 9;
  const isSide = (cur, d, dir) => (dir > 0 ? d.x0 === cur.x1 + 2 : d.x1 === cur.x0 - 2) && span(cur.y0, cur.y1, d.y0, d.y1) >= 8;
  let budget = 400;
  const search = (cur, dir, seen, climbs) => {   // randomised depth-first search to the side hull
    if (dir < 0 ? cur.x0 === IN.x0 : cur.x1 === IN.x1) return [];
    if (--budget < 0) return null;
    const opts = chambers.filter((d) => !seen.has(d.id) && (isSide(cur, d, dir) || (cur !== land && climbs < 2 && isClimb(cur, d))))
      .map((d) => ({ d, k: rng() * (isClimb(cur, d) ? 0.8 : 1) })).sort((a, b) => b.k - a.k);
    for (const { d } of opts) {
      seen.add(d.id);
      const tail = search(d, dir, seen, climbs + (isClimb(cur, d) ? 1 : 0));
      if (tail) return [d, ...tail];
      seen.delete(d.id);
    }
    return null;
  };
  const seen = new Set([land.id]);
  const westPath = search(land, -1, seen, 0), eastPath = westPath && search(land, 1, seen, 0);
  if (!eastPath) return null;
  const route = [...westPath.reverse(), land, ...eastPath];
  if (route.length < 4) return null;
  // The wall between two neighbouring chambers: vertical (a column) or horizontal (a row), and the
  // range along it where both sides are floor.
  const wallBetween = (a, b) => {
    if (a.x1 + 2 === b.x0 || b.x1 + 2 === a.x0) return { vert: true, at: Math.min(a.x1, b.x1) + 1, lo: Math.max(a.y0, b.y0), hi: Math.min(a.y1, b.y1) };
    return { vert: false, at: Math.min(a.y1, b.y1) + 1, lo: Math.max(a.x0, b.x0), hi: Math.min(a.x1, b.x1) };
  };

  // --- chamber kinds and names
  const riverSet = new Set(route.map((c) => c.id));
  const rest = shuffle(chambers.filter((c) => !riverSet.has(c.id)));
  // Hull chambers took the war's worst: rubble goes there first.
  const order = new Map(rest.map((c) => [c.id, (touchesHull(c) ? 1 : 0) + rng() * 1.2]));
  rest.sort((a, b) => order.get(b.id) - order.get(a.id));
  const nRubble = Math.round(rest.length * 0.34), nDeck = Math.round(rest.length * 0.26);
  rest.forEach((c, k) => { c.kind = k < nRubble ? 'rubble' : 'x'; });
  const others = shuffle(rest.filter((c) => c.kind === 'x'));
  others.forEach((c, k) => { c.kind = k < nDeck ? 'deck' : 'fields'; });
  for (const c of route) c.kind = c === land ? 'landing' : 'river';
  const pools = {};
  for (const k in NAMES) pools[k] = shuffle(NAMES[k].slice());
  for (const c of chambers) c.name = pools[c.kind].pop() || `${c.kind[0].toUpperCase()}${c.kind.slice(1)} Sector ${c.id}`;

  // --- floors (quantile thresholds per chamber keep the mix stable whatever the noise does)
  const rectTiles = (c) => { const out = []; for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) out.push(y * W + x); return out; };
  const quantile = (vals, q) => vals.slice().sort((a, b) => a - b)[Math.floor(clamp(q, 0, 0.999) * vals.length)];
  const blob = (c, rad, ter, onto) => {   // a small noisy blob of a version-2 terrain, for looks
    const bx = rint(c.x0 + 3, c.x1 - 3), by = rint(c.y0 + 3, c.y1 - 3);
    for (let y = by - 5; y <= by + 5; y++) for (let x = bx - 5; x <= bx + 5; x++) {
      if (x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1) continue;
      const i = y * W + x;
      if (onto.includes(t[i]) && hypot(x - bx, y - by) <= rad + (noise(x, y, 0.5, 9) - 0.5) * 2.4) t[i] = ter;
    }
  };
  for (const c of chambers) {
    const tiles = rectTiles(c);
    const n1 = tiles.map((i) => noise(i % W, (i / W) | 0, 0.13, 1));
    const n2 = tiles.map((i) => noise(i % W, (i / W) | 0, 0.1, 2));
    if (c.kind === 'landing') {
      // A plated landing apron along the bottom (by the dock), plain soil above it.
      tiles.forEach((i) => {
        const x = i % W, y = (i / W) | 0;
        const depth = 6 + Math.round(noise(x, 0, 0.12, 3) * 4);
        t[i] = y > c.y1 - depth ? T.DECK : T.PLAIN;
      });
    } else if (c.kind === 'fields' || c.kind === 'river') {
      const q = quantile(n1, c.kind === 'fields' ? 0.78 : 0.86);
      tiles.forEach((i, k) => { t[i] = n1[k] > q ? T.POOR : T.PLAIN; });
      if (c.kind === 'fields' && rng() < 0.5) blob(c, 2 + rng() * 1.8, T.FOREST, [T.PLAIN, T.POOR]);
      if (c.kind === 'fields' && rng() < 0.25) blob(c, 1.6 + rng() * 1.5, T.HILLS, [T.PLAIN, T.POOR]);
    } else if (c.kind === 'rubble') {
      const qr = quantile(n2, 1 - (0.38 + rng() * 0.17)), qp = quantile(n1, 0.45);
      tiles.forEach((i, k) => { t[i] = n2[k] > qr ? T.RUBBLE : n1[k] > qp ? T.POOR : T.PLAIN; });
      if (rng() < 0.4) blob(c, 1.4 + rng() * 1.2, T.ROCK, [T.PLAIN, T.POOR]);
    } else {
      const q = quantile(n2, 0.9);
      tiles.forEach((i, k) => { t[i] = n2[k] > q ? T.RUBBLE : T.DECK; });
    }
  }

  // --- the river: 2–3 tiles wide, crossing each bulkhead square on through a 3-tile gap with a gate
  // beside it, and meandering between the crossings along a smooth curve through each chamber.
  const gates = new Map();   // wall key → [tile index]
  const addGate = (key, i) => { t[i] = T.GATE; if (!gates.has(key)) gates.set(key, []); gates.get(key).push(i); };
  const ends = [];           // per chamber of the route: [entry, exit] as { x, y, nx, ny } (normal points east/along the flow)
  const first = route[0], last = route[route.length - 1];
  let prev = { x: IN.x0 - 0.5, y: rint(first.y0 + 3, first.y1 - 3) + 0.5, nx: 1, ny: 0 };   // out of the west hull
  for (let k = 0; k < route.length; k++) {
    const a = route[k], b = route[k + 1];
    let out;
    if (!b) out = { x: IN.x1 + 1.5, y: rint(last.y0 + 3, last.y1 - 3) + 0.5, nx: 1, ny: 0 };   // into the east hull
    else {
      const wb = wallBetween(a, b), key = Math.min(a.id, b.id) * 256 + Math.max(a.id, b.id);
      // Into and out of the landing chamber the river keeps high, clear of the apron and the dock.
      const p = a === land || b === land ? wb.lo + 1 + rint(0, 1) : Math.round((rint(wb.lo + 1, wb.hi - 3) + rint(wb.lo + 1, wb.hi - 3)) / 2);
      const g = p - 1 >= wb.lo ? p - 1 : p + 3;   // the gate beside the crossing
      for (let d = 0; d < 3; d++) t[wb.vert ? (p + d) * W + wb.at : wb.at * W + p + d] = T.RIVER;   // ch stays NONE
      addGate(key, wb.vert ? g * W + wb.at : wb.at * W + g);
      out = wb.vert ? { x: wb.at + 0.5, y: p + 1.5, nx: 1, ny: 0 } : { x: p + 1.5, y: wb.at + 0.5, nx: 0, ny: b.y0 > a.y0 ? 1 : -1 };
    }
    ends.push([prev, out]);
    prev = out;
  }
  route.forEach((c, k) => {
    const [A, B] = ends[k];
    // Catmull–Rom through the entry, two wandering midpoints and the exit; the ends leave the walls square on.
    const inset = (x, y) => ({ x: clamp(x, c.x0 + 3, c.x1 - 2), y: clamp(y, c.y0 + 3, c.y1 - 2) });
    const dx = B.x - A.x, dy = B.y - A.y, len = hypot(dx, dy), px = -dy / len, py = dx / len;
    const wob = c === land ? 1.5 : Math.min(9, (c.y1 - c.y0) * 0.3);
    const mids = [1 / 3, 2 / 3].map((f) => { const o = (rng() - 0.5) * 2 * wob; return inset(A.x + dx * f + px * o, A.y + dy * f + py * o); });
    if (c === land) for (const m of mids) m.y = Math.min(m.y, c.y0 + 3);
    const pts = [A, A, { x: A.x + A.nx * 2.5, y: A.y + A.ny * 2.5 }, ...mids, { x: B.x - B.nx * 2.5, y: B.y - B.ny * 2.5 }, B, B];
    for (let s = 1; s + 2 < pts.length; s++) {
      const p0 = pts[s - 1], p1 = pts[s], p2 = pts[s + 1], p3 = pts[s + 2];
      const n = Math.ceil(hypot(p2.x - p1.x, p2.y - p1.y) * 4) || 1;
      for (let j = 0; j <= n; j++) {
        const u = j / n, u2 = u * u, u3 = u2 * u;
        const cr = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u2 + (-a + 3 * b - 3 * cc + d) * u3);
        const x = cr(p0.x, p1.x, p2.x, p3.x), y = cr(p0.y, p1.y, p2.y, p3.y);
        const rad = 1.0 + 0.5 * noise(x, y, 0.2, 4);
        for (let ty = Math.floor(y - 2); ty <= y + 2; ty++) for (let tx = Math.floor(x - 2); tx <= x + 2; tx++) {
          const i = ty * W + tx;
          if (ch[i] === c.id && hypot(tx + 0.5 - x, ty + 0.5 - y) <= rad) t[i] = T.RIVER;
        }
      }
    }
  });

  // Fertile soil in a 2–4 tile band along the river, inside the same chamber, on soil only.
  {
    const dist = new Int8Array(N).fill(-1), q = [];
    for (let i = 0; i < N; i++) if (t[i] === T.RIVER && ch[i] !== NONE) { dist[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, y = (i / W) | 0;
      if (dist[i] >= 4) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const j = (y + dy) * W + x + dx;
        if (dist[j] >= 0 || ch[j] !== ch[i]) continue;
        dist[j] = dist[i] + 1; q.push(j);
      }
    }
    for (let i = 0; i < N; i++) {
      if (dist[i] <= 0 || (t[i] !== T.PLAIN && t[i] !== T.POOR)) continue;
      const band = 2 + Math.floor(noise(i % W, (i / W) | 0, 0.15, 5) * 2.99);
      if (dist[i] <= band) t[i] = T.FERTILE;
    }
  }

  // --- gates: 1–2 per shared wall (the river's gate counts), clear of the wall's ends and each other
  const cheb = (i, j) => Math.max(Math.abs((i % W) - (j % W)), Math.abs(((i / W) | 0) - ((j / W) | 0)));
  for (const [key, tiles] of walls) {
    if (tiles.length < 3) continue;
    const have = gates.get(key) || [];
    const want = have.length ? (tiles.length >= 22 && rng() < 0.35 ? 1 : 0) : (tiles.length >= 14 && rng() < 0.45 ? 2 : 1);
    const trim = tiles.length >= 7 ? 2 : 1;
    for (let g = 0; g < want; g++) {
      const cand = tiles.slice(trim, tiles.length - trim).filter((i) => t[i] === T.BULKHEAD
        && !(gates.get(key) || []).some((j) => cheb(i, j) < 6)
        && ![-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1].some((d) => t[i + d] === T.RIVER && ch[i + d] === NONE));
      if (cand.length) addGate(key, pick(cand));
    }
  }

  // --- breaches: hull chambers 2–6, inner 0–3, the landing chamber's neighbours 1–4, the landing none
  const lim = (c) => c === land ? [0, 0] : landNb.has(c.id) ? (touchesHull(c) ? [2, 4] : [1, 3]) : touchesHull(c) ? [2, 6] : [0, 3];
  const count = new Array(chambers.length).fill(0);
  const adjCh = (i) => { const s = []; for (const d of [-1, 1, -W, W]) { const c = ch[i + d]; if (c !== NONE && !s.includes(c)) s.push(c); } return s; };
  const near = (i, rad, pred) => { const x = i % W, y = (i / W) | 0; for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (pred((y + dy) * W + x + dx)) return true; return false; };
  for (const c of shuffle(chambers.slice())) {
    const [mn, mx] = lim(c);
    const target = Math.max(mn, Math.min(mx, rint(mn, mx)));
    const ring = [];
    for (let x = c.x0; x <= c.x1; x++) ring.push((c.y0 - 1) * W + x, (c.y1 + 1) * W + x);
    for (let y = c.y0; y <= c.y1; y++) ring.push(y * W + c.x0 - 1, y * W + c.x1 + 1);
    while (count[c.id] < target) {
      const cand = ring.filter((i) => {
        if (t[i] !== T.HULL && t[i] !== T.BULKHEAD) return false;
        const s = adjCh(i);
        if (!s.includes(c.id) || s.includes(land.id)) return false;
        if (s.some((b) => count[b] >= lim(chambers[b])[1])) return false;
        return !near(i, 2, (j) => t[j] === T.BREACH || t[j] === T.GATE || (t[j] === T.RIVER && ch[j] === NONE));
      });
      if (!cand.length) break;
      // Hull breaches open to space: the colony's wounds face outward first.
      const hull = cand.filter((i) => t[i] === T.HULL);
      const i = hull.length && rng() < 0.7 ? pick(hull) : pick(cand);
      t[i] = T.BREACH;
      for (const b of adjCh(i)) { count[b]++; chambers[b].breaches.push(i); }
    }
  }
  if (chambers.some((c) => count[c.id] < lim(c)[0])) return null;

  // --- start: the dock on the bottom hull under the landing chamber, the Command Centre on its apron
  const dock = { x: clamp(Math.round((land.x0 + land.x1) / 2) - 1, land.x0, land.x1 - 1), y: EDEN.y1 - 1 };
  const buildable = (i) => t[i] === T.DECK || t[i] === T.PLAIN || t[i] === T.FERTILE || t[i] === T.POOR;
  let command = null, best = Infinity;
  for (let y = land.y0; y <= land.y1 - 2; y++) for (let x = land.x0; x <= land.x1 - 2; x++) {
    let ok = true;
    for (let dy = 0; dy < 3 && ok; dy++) for (let dx = 0; dx < 3 && ok; dx++) ok = buildable((y + dy) * W + x + dx);
    if (!ok) continue;
    const score = Math.abs(x - dock.x) + Math.abs(y - (land.y1 - 6)) * 1.5 + (t[y * W + x] === T.DECK ? 0 : 6);
    if (score < best) { best = score; command = { x, y }; }
  }
  if (!command) return null;

  // --- space
  const dEden = (x, y) => Math.max(EDEN.x0 - x, x - EDEN.x1, EDEN.y0 - y, y - EDEN.y1, 0);
  const lane = (x, y) => x >= dock.x - 2 && x <= dock.x + 3 && y > EDEN.y1 && y <= EDEN.y1 + 6;   // the dock's approach stays clear
  const canWrite = new Uint8Array(N);   // open space a feature may cover
  for (let y = 0; y < ATMO_Y - 1; y++) for (let x = 0; x < W; x++) canWrite[y * W + x] = dEden(x, y) > MARGIN && !lane(x, y) ? 1 : 0;
  const writable = (x, y) => x >= 0 && x < W && y >= 0 && y < H && canWrite[y * W + x] === 1;
  const spineOk = (x, y, pad) => x > -6 && x < W + 6 && y > -6 && y < ATMO_Y - 2 - pad && dEden(x, y) > MARGIN + pad;
  // Precomputed jitter fields: cheap noisy edges for every stamp.
  const J1 = new Float32Array(N), J2 = new Float32Array(N);
  for (let y = 0; y < ATMO_Y; y++) for (let x = 0; x < W; x++) { J1[y * W + x] = noise(x, y, 0.33, 6); J2[y * W + x] = noise(x, y, 0.19, 7); }

  // Stamp a terrain along a spine of points: discs of radius rad(u) with noisy edges; only onto void.
  const stamp = (pts, rad, ter, rough = 1.4, speckle = 0) => {
    const out = [];
    pts.forEach((p, k) => {
      const rr = rad(pts.length > 1 ? k / (pts.length - 1) : 0.5), e = Math.ceil(rr + rough);
      for (let y = Math.floor(p.y - e); y <= p.y + e; y++) for (let x = Math.floor(p.x - e); x <= p.x + e; x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const i = y * W + x;
        if (canWrite[i] !== 1 || t[i] !== T.VOID) continue;
        const ex = x + 0.5 - p.x, ey = y + 0.5 - p.y, lim = rr + (J1[i] - 0.5) * 2 * rough;
        if (lim < 0 || ex * ex + ey * ey > lim * lim) continue;
        if (speckle && (J2[i] < 0.42 || rng() > speckle)) continue;
        t[i] = ter; out.push(i);
      }
    });
    return out;
  };
  // A wandering spine through a centre, both ways, stopping before it would touch the hull.
  const spine = (x, y, ang, len, curl, pad) => {
    const half = (a0, n) => { const pts = []; let px = x, py = y, a = a0; for (let k = 0; k < n; k++) { a += (rng() - 0.5) * curl; px += cos(a); py += sin(a); if (!spineOk(px, py, pad)) break; pts.push({ x: px, y: py }); } return pts; };
    const back = half(ang + PI, len >> 1).reverse(), fwd = half(ang, len - (len >> 1));
    return [...back, { x, y }, ...fwd];
  };
  const prof = (r0, r1) => (u) => r0 + (r1 - r0) * Math.sqrt(Math.max(0, sin(PI * u)));   // thick middle, tapered ends
  const diag = () => pick([PI / 4, (3 * PI) / 4]) + (rng() - 0.5) * 0.5 + (rng() < 0.5 ? PI : 0);

  const features = {
    asteroid: (x, y) => {   // a ridge: elongated noisy blob, a few loose rocks around it
      const r1 = 1.5 + rng() * 1.8, pts = spine(x, y, rng() * 6.28, rint(5, 22), 0.5, r1);
      const out = stamp(pts, prof(0.7, r1), T.ASTEROID, 1.5);
      for (let s = rint(0, 3); s > 0; s--) { const p = pick(pts), a = rng() * 6.28, d = 3 + rng() * 3; out.push(...stamp([{ x: p.x + cos(a) * d, y: p.y + sin(a) * d }], () => 0.6 + rng() * 0.8, T.ASTEROID, 0.8)); }
      return out;
    },
    magnetic: (x, y) => {   // a long diagonal belt of slowly varying width
      const ph = rng() * 6.28, r0 = 1.0 + rng() * 0.8;
      return stamp(spine(x, y, diag(), rint(16, 56), 0.12, r0 + 0.5), (u) => r0 + 0.45 * sin(u * 7 + ph), T.MAGNETIC, 1.0);
    },
    meteoroid: (x, y) => stamp(spine(x, y, rng() * 6.28, rint(8, 30), 0.35, 3), prof(1.5, 2.5 + rng() * 1.5), T.METEOROID, 1.6, 0.75),
    plasma: (x, y) => {     // a lake: a few overlapping noisy discs
      const out = stamp([{ x, y }], () => 2.2 + rng() * 3, T.PLASMA, 2.0);
      for (let s = rint(1, 3); s > 0; s--) { const a = rng() * 6.28, d = 2 + rng() * 3; out.push(...stamp([{ x: x + cos(a) * d, y: y + sin(a) * d }], () => 1.6 + rng() * 2.2, T.PLASMA, 1.8)); }
      return out;
    },
  };

  // 1. Playability: an asteroid ridge with ore seams and a magnetic belt within the dock's reach.
  const dcx = dock.x + 1, dcy = dock.y + 1;   // centre of the 2×2 dock (tile corner coordinates)
  const inReach = (x, y) => Math.max(Math.abs(x + 0.5 - dcx), Math.abs(y + 0.5 - dcy)) <= REACH;
  const reachBox = { x0: dcx - REACH, y0: dcy - REACH, x1: dcx + REACH - 1, y1: dcy + REACH - 1 };   // the tiles inReach accepts
  let placed = false;
  for (let tries = 0; tries < 16 && !placed; tries++) {
    const side = rng() < 0.5 ? -1 : 1;
    const ax = dcx + side * rint(8, 15), ay = rint(119, 125);
    const ast = stamp(spine(ax, ay, (rng() - 0.5) * 1.6, rint(9, 13), 0.3, 2), prof(1.2, 2.2 + rng() * 0.5), T.ASTEROID, 0.9);
    const mx = dcx - side * rint(9, 15), my = rint(121, 127);
    const mag = stamp(spine(mx, my, diag(), rint(14, 20), 0.08, 2), () => 1.6 + rng() * 0.3, T.MAGNETIC, 0.6);
    const seams = oreSpots(t, ast.filter((i) => inReach(i % W, (i / W) | 0)));
    if (largestCluster(t, T.ASTEROID, reachBox) >= 14 && seams.length >= 2 && footprints(t, T.MAGNETIC, reachBox) >= 2) {
      for (const i of seams.slice(0, rint(2, 3))) r[i] = R.ORE_SEAM;
      placed = true;
    } else for (const i of [...ast, ...mag]) t[i] = T.VOID;
  }
  if (!placed) return null;

  // 2. One gravity-flux river: from the top edge, west or east across deep space, down the side and out.
  const flip = rng() < 0.5;
  const fx = (x) => (flip ? W - 1 - x : x);
  {
    const ctrl = [[rint(85, 150), -3], [rint(55, 75), rint(4, 20)], [rint(18, 38), rint(14, 24)],
      [rint(10, 34), rint(48, 70)], [rint(16, 36), rint(80, 104)], [-4, rint(112, 136)]].map(([x, y]) => ({ x: fx(x), y }));
    const pts = [];
    for (let k = 0; k + 1 < ctrl.length; k++) {   // Catmull–Rom through the control points
      const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(ctrl.length - 1, k + 2)];
      const steps = Math.ceil(hypot(p2.x - p1.x, p2.y - p1.y) * 1.5);
      for (let s = 0; s < steps; s++) {
        const u = s / steps, u2 = u * u, u3 = u2 * u;
        const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        pts.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) });
      }
    }
    const r0 = 1.05 + rng() * 0.3;
    stamp(pts, (u) => r0 + 0.3 * sin(u * 23), T.GRAVITY, 0.7);
  }

  // 3. The comet: a curved tail streak, widening away from the head, thinning out at its end.
  {
    const hx = fx(rint(150, 205)), hy = rint(6, 20);
    let a = (flip ? PI : 0) + (flip ? -1 : 1) * (rng() - 0.5) * 0.9 + (rng() < 0.5 ? 0.3 : -0.3);
    const len = rint(20, 30), bend = (rng() - 0.5) * 0.05;
    let px = hx, py = hy;
    for (let k = 0; k < len; k++) {
      const hw = 0.4 + k * 0.14;
      for (let y = Math.floor(py - hw - 1); y <= py + hw + 1; y++) for (let x = Math.floor(px - hw - 1); x <= px + hw + 1; x++) {
        if (!writable(x, y) || t[y * W + x] !== T.VOID) continue;
        if (hypot(x + 0.5 - px, y + 0.5 - py) <= hw + (J1[y * W + x] - 0.5) && rng() > (k / len) * 0.45) t[y * W + x] = T.COMET;
      }
      a += bend; px += cos(a); py += sin(a);
    }
  }

  // 4. Fill: features dropped at random, denser away from Eden (~65% void near it, ~30% at the edges).
  const want = (x, y) => 0.31 + 0.62 * smooth(6, 38, dEden(x, y));
  let target = 0, filled = 0;
  for (let y = 0; y < ATMO_Y - 1; y++) for (let x = 0; x < W; x++) if (writable(x, y)) { target += want(x, y); if (t[y * W + x] !== T.VOID) filled++; }
  const kinds = [['asteroid', 0.32], ['magnetic', 0.2], ['meteoroid', 0.28], ['plasma', 0.2]];
  for (let it = 0; it < 4000 && filled < target; it++) {
    const x = rint(0, W - 1), y = rint(0, ATMO_Y - 3);
    if (!writable(x, y) || rng() > want(x, y) / 0.94) continue;
    let v = rng(), kind = kinds[0][0];
    for (const [k, w] of kinds) if ((v -= w) <= 0) { kind = k; break; }
    filled += features[kind](x + 0.5, y + 0.5).length;
  }

  // --- artifacts: ore seams in asteroid cores, wrecks in space and in the rubble
  for (let y = 1; y < ATMO_Y - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (t[i] !== T.ASTEROID || r[i]) continue;
    let n = 0;
    for (const d of [-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1]) if (t[i + d] === T.ASTEROID) n++;
    if (n >= 6 && rng() < 0.1) r[i] = R.ORE_SEAM;
  }
  for (let k = rint(6, 10), guard = 0; k > 0 && guard < 5000; guard++) {
    const x = rint(0, W - 1), y = rint(0, ATMO_Y - 3), i = y * W + x;
    if (!writable(x, y) || t[i] !== T.VOID || r[i]) continue;
    r[i] = R.WRECK; sv[i] = SALVAGE.wreck; k--;
  }
  for (let i = 0; i < N; i++) if (t[i] === T.RUBBLE) sv[i] = SALVAGE.rubble;
  for (const c of chambers) {
    if (c.kind !== 'rubble' && c.kind !== 'deck') continue;
    const rub = rectTiles(c).filter((i) => t[i] === T.RUBBLE);
    for (let k = c.kind === 'rubble' ? rint(1, 3) : rint(0, 1); k > 0 && rub.length; k--) { const i = rub.splice(Math.floor(rng() * rub.length), 1)[0]; r[i] = R.WRECK; sv[i] = SALVAGE.wreck; }
  }

  // --- finish chambers
  for (let i = 0; i < N; i++) if (ch[i] !== NONE) chambers[ch[i]].tiles++;
  land.status = 'open';
  if (!gatesConnect(t, ch, chambers, land.id)) return null;
  const landFloor = rectTiles(land);
  if (!landFloor.some((i) => t[i] === T.DECK) || !landFloor.some((i) => t[i] === T.PLAIN) || landFloor.filter(buildable).length < 9 + 60) return null;

  return {
    map: { w: W, h: H, t, r, ch, sv },
    chambers,
    start: { command, dock, landing: land.id },
  };
}

// --- layout -----------------------------------------------------------------------------------------

// Recursive split of the interior into ~24 rectangles; each split line becomes a 1-tile bulkhead.
// The leaf holding the anchor (the landing chamber) keeps at least 25 × 24 tiles around it.
function splitChambers(rng, A) {
  const MINW = 13, MINH = 12;
  const leaves = [{ ...IN, done: false }];
  const target = 22 + Math.floor(rng() * 5);
  const has = (l) => A.x >= l.x0 && A.x <= l.x1 && A.y >= l.y0 && A.y <= l.y1;
  const okLand = (l) => !has(l) || (A.x - l.x0 >= 12 && l.x1 - A.x >= 12 && l.y1 - l.y0 + 1 >= 24);
  const split = (l) => {
    const w = l.x1 - l.x0 + 1, h = l.y1 - l.y0 + 1;
    if (has(l) && w <= 38 && h <= 30) return null;   // the landing chamber is big enough as it is
    const vert = w > 1.6 * h ? true : h > 1.25 * w ? false : rng() < 0.55;
    for (const v of [vert, !vert]) for (let k = 0; k < 8; k++) {
      const f = 0.3 + 0.4 * rng();
      if (v) {
        const s = l.x0 + Math.round(w * f), a = { x0: l.x0, y0: l.y0, x1: s - 1, y1: l.y1 }, b = { x0: s + 1, y0: l.y0, x1: l.x1, y1: l.y1 };
        if (s !== A.x && s - l.x0 >= MINW && l.x1 - s >= MINW && okLand(a) && okLand(b)) return [a, b];
      } else {
        const s = l.y0 + Math.round(h * f), a = { x0: l.x0, y0: l.y0, x1: l.x1, y1: s - 1 }, b = { x0: l.x0, y0: s + 1, x1: l.x1, y1: l.y1 };
        if (s - l.y0 >= MINH && l.y1 - s >= MINH && okLand(a) && okLand(b)) return [a, b];
      }
    }
    return null;
  };
  for (let guard = 0; leaves.length < target && guard < 400; guard++) {
    const open = leaves.filter((l) => !l.done);
    if (!open.length) break;
    // Big chambers split first, but not always: sizes stay varied.
    const wts = open.map((l) => { const a = (l.x1 - l.x0 + 1) * (l.y1 - l.y0 + 1); return a * Math.sqrt(Math.sqrt(a)); });   // area^1.25
    let v = rng() * wts.reduce((s, w) => s + w, 0), leaf = open[open.length - 1];
    for (let k = 0; k < open.length; k++) if ((v -= wts[k]) <= 0) { leaf = open[k]; break; }
    const kids = split(leaf);
    if (!kids) { leaf.done = true; continue; }
    leaves.splice(leaves.indexOf(leaf), 1, { ...kids[0], done: false }, { ...kids[1], done: false });
  }
  return leaves.map(({ x0, y0, x1, y1 }) => ({ x0, y0, x1, y1 }));
}

// --- checks shared by the generator's guarantees ---------------------------------------------------

// Largest 4-connected cluster of terrain `ter` inside the box (inclusive tile bounds).
function largestCluster(t, ter, box) {
  const inBox = (x, y) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
  let best = 0;
  for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) {
    const i = y * W + x;
    if (seen[i] || t[i] !== ter) continue;
    let n = 0, len = 0; q[len++] = i; seen[i] = 1;
    while (n < len) {
      const j = q[n++], jx = j % W, jy = (j / W) | 0;
      for (let d = 0; d < 4; d++) {
        const kx = jx + (d === 0 ? -1 : d === 1 ? 1 : 0), ky = jy + (d === 2 ? -1 : d === 3 ? 1 : 0), k = ky * W + kx;
        if (!inBox(kx, ky) || seen[k] || t[k] !== ter) continue;
        seen[k] = 1; q[len++] = k;
      }
    }
    best = Math.max(best, n);
  }
  return best;
}

// Non-overlapping 2×2 footprints of terrain `ter` inside the box (greedy, row by row).
function footprints(t, ter, box) {
  const used = new Uint8Array(W * H);
  let n = 0;
  for (let y = box.y0; y < box.y1; y++) for (let x = box.x0; x < box.x1; x++) {
    const i = y * W + x;
    if (t[i] === ter && t[i + 1] === ter && t[i + W] === ter && t[i + W + 1] === ter && !used[i] && !used[i + 1] && !used[i + W] && !used[i + W + 1]) {
      used[i] = used[i + 1] = used[i + W] = used[i + W + 1] = 1; n++;
    }
  }
  return n;
}

// Ore seam spots: asteroid tiles at the top-left of a solid 2×2 (so an ore mine can cover one),
// spaced apart, best-surrounded first.
function oreSpots(t, tiles) {
  const solid = tiles.filter((i) => t[i + 1] === T.ASTEROID && t[i + W] === T.ASTEROID && t[i + W + 1] === T.ASTEROID);
  const out = [];
  for (const i of solid) if (out.every((j) => Math.abs((i % W) - (j % W)) + Math.abs(((i / W) | 0) - ((j / W) | 0)) >= 3)) out.push(i);
  return out;
}

// Every chamber reachable from the landing chamber by walking floor and gate tiles.
export function gatesConnect(t, ch, chambers, start) {
  const seen = new Uint8Array(W * H), reached = new Set();
  const q = [];
  for (let i = 0; i < W * H; i++) if (ch[i] === start) { seen[i] = 1; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    if (ch[i] !== NONE) reached.add(ch[i]);
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (seen[j] || !(ch[j] !== NONE || t[j] === T.GATE)) continue;
      seen[j] = 1; q.push(j);
    }
  }
  return reached.size === chambers.length;
}
