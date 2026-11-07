// Earthlight Space Colony Rebuild: land value, the SimCity way of reading the city (docs/COLONY-V8.md).
// A pure read-out: how much homes and shops want each tile of a deck, 0–100, in open chambers only
// (a sealed or unpressurised tile has none: -1).
//   + parks in reach (rules.parkField), services in reach (the SERVICE_KINDS, best of each kind: Clinic,
//     Canteen, School, Shopping...), transit in reach, a river or lake within a few tiles, the colony's happiness
//   − Workshop Quad noise (the same gap as rules.noiseAt), industry next door, exposed hull (raiders and
//     meteoroids come over it), an unsealed breach in the chamber
// landValueGrid builds a whole deck by stamping each source's area (cheap); landValueParts explains one tile
// with the same numbers (the inspector). landValue caches a deck's grid per state: it is rebuilt when a
// building is placed, finished or removed, when a chamber opens, or every LV.refreshDays days, never per frame.
// Version 9 (docs/COLONY-V9.md): + a finished wonder nearby (the Grand Arboretum, the Great Library, the Concert Hall, the
// Memorial Garden: `wonder.value` within `valueRadius`, all of them together up to LV.wonderMax). The quads are retired,
// so no level needs land value any more except a Grand Hotel's ('value:55'); Habitats and Tower Blocks on land worth
// 60 or more grow a day sooner (rules.VALUE_GROW), and tourism counts the land value at the hotels.
// Imports from rules.js are used inside functions only (rules.js imports this module back).
import { T, zoneOf } from './data/terrain.js';
import { BUILDING } from './data/buildings.js';
import { mapOf, chamberOf, active, spec, deckOf, serviceValue, SERVICE_KINDS, TRANSIT_KEYS, parkField, openBreaches } from './rules.js';
import { wonderValues } from './wonders.js';

export const LV = {
  base: 25,                          // an open, pressurised tile with nothing around it
  park: 2.5, parkMax: 20,            // per point of park rating in reach
  service: 2, serviceMax: 24,        // per point of the best service of each kind in reach, all kinds together
  transit: 6,                        // a Transit Station or Monorail Stop in reach
  water: 2.5, waterRange: 4,         // a river or lake view: (range + 1 − distance) × water
  happy: 0.2,                        // (happiness − 50) × happy
  noise: 5,                          // per tile a Workshop Quad's noise reaches past this tile (the strongest)
  industry: 3, industryRange: 4,     // industry next door: (range − gap) × industry (the nearest)
  hull: 4, hullRange: 3,             // exposed hull: (range + 1 − distance) × hull
  breach: 10,                        // an unsealed breach in the chamber
  wonderMax: 25,                     // version 9: finished wonders nearby, all together
  refreshDays: 3,
};
const OPEN = 'open';
const EXPOSED_BY = new Set(['space', 'atmo', 'earth', 'none']);
const isWater = (ti) => ti === T.RIVER || ti === T.LAKE;
const isIndustry = (b) => BUILDING[b.key]?.cat === 'industry' && b.build === 0;
const clamp = (v) => Math.max(0, Math.min(100, v));
// Tiles between tile (x, y) and building b's footprint (0 = on it or touching it).
const gapTo = (b, x, y) => { const n = BUILDING[b.key].size || 1; return Math.max(0, Math.max(b.x - x, x - (b.x + n - 1), b.y - y, y - (b.y + n - 1)) - 1); };
const cheb = (x, y, b) => { const n = BUILDING[b.key].size || 1; return Math.max(Math.abs(x + 0.5 - b.x - n / 2), Math.abs(y + 0.5 - b.y - n / 2)); };
const openAt = (state, m, i) => { const c = m.ch[i] === 255 ? null : chamberOf(state, m.ch[i]); return c && c.status === OPEN ? c : null; };

// Hull tiles (or breaches) within 2 tiles of space, the atmosphere, Earth or the outside: what raiders climb over.
function exposedHull(m) {
  const { w, h, t } = m, out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ti = t[y * w + x];
    if (ti !== T.HULL && ti !== T.BREACH) continue;
    let open = false;   // the hull is two tiles thick: both rows of it count
    for (let dy = -2; dy <= 2 && !open; dy++) for (let dx = -2; dx <= 2 && !open; dx++) { const nx = x + dx, ny = y + dy; open = nx < 0 || ny < 0 || nx >= w || ny >= h || EXPOSED_BY.has(zoneOf(t[ny * w + nx])); }
    if (open) out.push(y * w + x);
  }
  return out;
}
const hullCache = new WeakMap();
const hullOf = (m) => { let e = hullCache.get(m.t); if (!e) hullCache.set(m.t, (e = exposedHull(m))); return e; };

// The sources of one deck: what both the grid and a tile's reasons read.
function sourcesOf(state, deck) {
  const on = state.buildings.filter((b) => deckOf(b) === deck);
  const kinds = [];
  for (const k of SERVICE_KINDS) {
    const list = on.filter((b) => b.key === k.key && active(b) && serviceValue(b) > 0);
    if (list.length) kinds.push({ label: k.label, list });
  }
  return {
    kinds,
    transit: on.filter((b) => TRANSIT_KEYS.has(b.key) && active(b)),
    noisy: on.filter((b) => b.key === 'workshopquad' && active(b) && (spec(b).nuisance || 0) > 0),
    industry: on.filter(isIndustry),
    wonders: wonderValues(state, deck),   // version 9
    happy: ((state.happy ?? 50) - 50) * LV.happy,
  };
}

// The whole deck: Float32Array(w × h) of land values 0–100, -1 where there is none (not an open chamber).
export function landValueGrid(state, deck = 'main') {
  const m = mapOf(state, deck);
  if (!m) return null;
  const { w, h, t } = m, n = w * h, out = new Float32Array(n).fill(-1);
  const field = parkField(state, deck), src = sourcesOf(state, deck);
  const sum = new Float32Array(n), best = new Float32Array(n), svc = new Float32Array(n);
  const stamp = (b, r, fn) => {   // fn(i, x, y) for the tiles within r of b's footprint
    const k = BUILDING[b.key].size || 1;
    for (let y = Math.max(0, b.y - r); y < Math.min(h, b.y + k + r); y++) for (let x = Math.max(0, b.x - r); x < Math.min(w, b.x + k + r); x++) fn(y * w + x, x, y);
  };
  // services: the best of each kind, summed over the kinds, capped
  for (const { list } of src.kinds) {
    best.fill(0);
    for (const b of list) { const r = Math.ceil(spec(b).radius || 0), v = serviceValue(b); stamp(b, r, (i, x, y) => { if (cheb(x, y, b) <= spec(b).radius && best[i] < v) best[i] = v; }); }
    for (let i = 0; i < n; i++) svc[i] += best[i];
  }
  for (let i = 0; i < n; i++) sum[i] = LV.base + src.happy + Math.min(LV.parkMax, field[i] * LV.park) + Math.min(LV.serviceMax, svc[i] * LV.service);
  best.fill(0);
  for (const b of src.transit) stamp(b, Math.ceil(spec(b).radius || 0), (i, x, y) => { if (cheb(x, y, b) <= spec(b).radius) best[i] = LV.transit; });
  for (let i = 0; i < n; i++) sum[i] += best[i];
  // version 9: finished wonders nearby, summed and capped
  if (src.wonders.length) {
    best.fill(0);
    for (const { b, value, radius } of src.wonders) stamp(b, Math.ceil(radius), (i, x, y) => { if (cheb(x, y, b) <= radius) best[i] += value; });
    for (let i = 0; i < n; i++) sum[i] += Math.min(LV.wonderMax, best[i]);
  }
  // the strongest noise, the nearest industry (penalties, so `best` holds the worst)
  best.fill(0);
  for (const b of src.noisy) { const r = spec(b).nuisance; stamp(b, r, (i, x, y) => { const p = (r - gapTo(b, x, y)) * LV.noise; if (p > best[i]) best[i] = p; }); }
  for (let i = 0; i < n; i++) sum[i] -= best[i];
  best.fill(0);
  for (const b of src.industry) stamp(b, LV.industryRange, (i, x, y) => { const p = (LV.industryRange - gapTo(b, x, y)) * LV.industry; if (p > best[i]) best[i] = p; });
  for (let i = 0; i < n; i++) sum[i] -= best[i];
  // water views and exposed hull: the nearest tile within range (Chebyshev)
  const near = (tiles, R, per, sign) => {
    best.fill(0);
    for (const j of tiles) {
      const jx = j % w, jy = (j / w) | 0;
      for (let y = Math.max(0, jy - R); y <= Math.min(h - 1, jy + R); y++) for (let x = Math.max(0, jx - R); x <= Math.min(w - 1, jx + R); x++) {
        const v = (R + 1 - Math.max(Math.abs(x - jx), Math.abs(y - jy))) * per, i = y * w + x;
        if (v > best[i]) best[i] = v;
      }
    }
    for (let i = 0; i < n; i++) sum[i] += sign * best[i];
  };
  const water = [];
  for (let i = 0; i < n; i++) if (isWater(t[i])) water.push(i);
  near(water, LV.waterRange, LV.water, 1);
  near(hullOf(m), LV.hullRange, LV.hull, -1);
  const leaky = new Map();
  for (let i = 0; i < n; i++) {
    const c = openAt(state, m, i);
    if (!c) continue;
    let lk = leaky.get(c.id);
    if (lk === undefined) leaky.set(c.id, (lk = openBreaches(state, c).length > 0));
    out[i] = clamp(sum[i] - (lk ? LV.breach : 0));
  }
  return out;
}

// One tile and why: { value (0–100, or -1), parts: [{ label, value }] (largest first), open }.
export function landValueParts(state, deck, x, y) {
  const m = mapOf(state, deck);
  if (!m || x < 0 || y < 0 || x >= m.w || y >= m.h) return { value: -1, parts: [], open: false };
  const { w, h, t } = m, i = y * w + x, c = openAt(state, m, i);
  if (!c) return { value: -1, parts: [], open: false };
  const src = sourcesOf(state, deck), parts = [], add = (label, v) => { if (Math.abs(v) >= 0.05) parts.push({ label, value: v }); };
  const park = Math.min(LV.parkMax, parkField(state, deck)[i] * LV.park);
  add('Parks in reach', park);
  let svc = 0; const names = [];
  for (const { label, list } of src.kinds) {
    const v = list.reduce((mx, b) => (cheb(x, y, b) <= spec(b).radius ? Math.max(mx, serviceValue(b)) : mx), 0);
    if (v > 0) { svc += v; names.push(label); }
  }
  add(`Services in reach (${names.join(', ')})`, Math.min(LV.serviceMax, svc * LV.service));
  if (src.transit.some((b) => cheb(x, y, b) <= spec(b).radius)) add('Transit in reach', LV.transit);
  const near = src.wonders.filter(({ b, radius }) => cheb(x, y, b) <= radius);
  if (near.length) add(`A wonder nearby (${near.map(({ b }) => BUILDING[b.key].name).join(', ')})`, Math.min(LV.wonderMax, near.reduce((t, w) => t + w.value, 0)));
  const dist = (pred, R) => { let d = Infinity; for (let yy = Math.max(0, y - R); yy <= Math.min(h - 1, y + R); yy++) for (let xx = Math.max(0, x - R); xx <= Math.min(w - 1, x + R); xx++) if (pred(yy * w + xx)) d = Math.min(d, Math.max(Math.abs(xx - x), Math.abs(yy - y))); return d; };
  const dw = dist((j) => isWater(t[j]), LV.waterRange);
  if (dw <= LV.waterRange) add('A view of the water', (LV.waterRange + 1 - dw) * LV.water);
  add(`Happiness ${Math.round(state.happy ?? 50)}`, src.happy);
  const noise = src.noisy.reduce((mx, b) => Math.max(mx, (spec(b).nuisance - gapTo(b, x, y)) * LV.noise), 0);
  if (noise > 0) add('Workshop noise', -noise);
  const ind = src.industry.reduce((mx, b) => Math.max(mx, (LV.industryRange - gapTo(b, x, y)) * LV.industry), 0);
  if (ind > 0) add('Industry next door', -ind);
  const hs = new Set(hullOf(m)), dh = dist((j) => hs.has(j), LV.hullRange);
  if (dh <= LV.hullRange) add('Exposed hull (raiders, meteoroids)', -(LV.hullRange + 1 - dh) * LV.hull);
  const leak = openBreaches(state, c).length > 0;
  if (leak) add('An unsealed breach in the chamber', -LV.breach);
  const value = clamp(LV.base + parts.reduce((s, p) => s + p.value, 0));
  parts.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return { value, parts, open: true };
}

// A deck's grid, cached per state (see the header). Callers must not change it.
const cache = new WeakMap();
const signature = (state) => {
  let built = 0, open = 0;
  for (const b of state.buildings) if (b.build === 0 && !b.off) built += 1 + (b.level || 0);
  for (const c of state.chambers || []) if (c.status === OPEN) open++;
  return `${state.buildings.length}:${built}:${open}`;
};
export function landValue(state, deck = 'main') {
  let c = cache.get(state);
  if (!c) cache.set(state, (c = {}));
  const e = c[deck], sig = signature(state), day = state.day || 0;
  if (e && e.sig === sig && day >= e.day && day - e.day < LV.refreshDays) return e.grid;
  const grid = landValueGrid(state, deck);
  c[deck] = { sig, day, grid };
  return grid;
}
// A building's land value: the mean over its footprint (cached grid).
export function valueOf(state, b) {
  const g = landValue(state, deckOf(b)), m = mapOf(state, deckOf(b));
  if (!g || !m) return 0;
  const k = BUILDING[b.key]?.size || 1;
  let s = 0;
  for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) s += Math.max(0, g[(b.y + dy) * m.w + b.x + dx] ?? 0);
  return s / (k * k);
}
