// Earthlight Space Colony Rebuild, version 13 (docs/COLONY-V13.md): story arc 2, The Hope. Pure: no DOM; the map is
// deterministic from the seed. Once the Ark is complete (state.ark, the Beyond Eden ending) Eden can reach Earth:
//   * a new deck, 'earth' (state.decks.earth, the same W × H grid as the others, Eden's footprint only): rough dead
//     ground, city ruins, radiation zones, toxic gas, flooded lowlands and a poisoned sea along one side, with a cleared
//     landing field to start;
//   * its own colonists, needs and stores (state.hope), fed by the Ark, which now comes and goes between Eden and the
//     Hope (trips of HOPE.tripDays each way, a manifest of colonists and goods chosen by the player, a capacity), and by
//     goods sent down by a Mass Driver or the Orbital Elevator. Nobody reaches Earth any other way;
//   * its own very expensive buildings (data/hope.js), which treat the ground tile by tile:
//     toxic / radiation / flooded / ruins → dead ground → plain → fertile → forest, and the poisoned sea → clean sea;
//   * the Earth recovery percent (recovered tiles of the Hope), milestones with story beats, and a last ending,
//     Earthlight, at HOPE.goal (remembered in state.hope.earthlight; it never blocks the other endings).
// state.hope = { day, buildings: [...], pop, stock, ark, drops, milestones, recovery, stats, earthlight }
import { T, TERRAIN } from './data/terrain.js';
import { HOPE_BUILDING } from './data/hope.js';
import { BUILDING } from './data/buildings.js';
import { hashSeed, mulberry32, fbm, hypot } from './mapgen.js';
import { hullBox } from './decks.js';
import { addPending, log } from './rules.js';   // used inside functions only (rules.js imports this module back)

const NONE = 255;
export const HOPE = {
  tripDays: 6, stayDays: 2,                       // Eden → Earth, on the landing field, Earth → Eden
  capacity: { pop: 80, cargo: 2000 },             // a trip
  goods: ['food', 'water', 'air', 'parts', 'alloy'],
  drop: { massdriver: 500, elevator: 800, days: 2, cooldown: 4 },   // goods only, no people
  need: { food: 1, water: 1, air: 1 },            // a colonist a day on Earth
  crewPop: 10, crewPer: 50, crewMax: 4,           // building on Earth: a crew per 50 colonists (the first at 10), at most 4
  shortLoss: 0.03,                                // colonists lost a day (died or carried back) while a need is short
  goal: { recovery: 0.5, pop: 500, easyPop: 300 },
  harmful: new Set([T.TOXIC, T.RADZONE]),
  recovered: new Set([T.PLAIN, T.FERTILE, T.FOREST, T.SEA, T.LANDING]),
};
const K = Object.fromEntries(TERRAIN.map((d) => [d.key, d.id]));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ok = (msg, extra) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });
const fmt = (n) => Math.round(n).toLocaleString('en-US');

// ---------------------------------------------------------------- the map
// generateHope(seed, main) → { w, h, t, r, ch, sv, box, landing: { x, y }, sea: 'north' | 'south' | 'east' | 'west' }
export function generateHope(seed, main) {
  const W = main.w, H = main.h, N = W * H, E = hullBox(main);
  const rng = mulberry32(hashSeed(`hope:${seed}`));
  const salt = Math.floor(rng() * 0x7fffffff);
  const noise = (x, y, f, k) => fbm(x * f, y * f, salt + k * 7919);
  const t = new Uint8Array(N).fill(T.OUTSIDE), r = new Uint8Array(N), ch = new Uint8Array(N).fill(NONE), sv = new Uint8Array(N);
  const inBox = (x, y) => x >= E.x0 && x <= E.x1 && y >= E.y0 && y <= E.y1;
  const sea = ['north', 'south', 'east', 'west'][Math.floor(rng() * 4)];
  const bw = E.x1 - E.x0 + 1, bh = E.y1 - E.y0 + 1;
  // distance inland from the sea's side, and the coast's depth there
  const inland = (x, y) => (sea === 'north' ? y - E.y0 : sea === 'south' ? E.y1 - y : sea === 'west' ? x - E.x0 : E.x1 - x);
  const along = (x, y) => (sea === 'north' || sea === 'south' ? x : y);
  const span = sea === 'north' || sea === 'south' ? bh : bw;
  const coast = (a) => span * 0.13 + span * 0.12 * noise(a, 0, 0.06, 1) + 2 * noise(a, 3, 0.3, 2);
  for (let y = E.y0; y <= E.y1; y++) for (let x = E.x0; x <= E.x1; x++) {
    const i = y * W + x, d = inland(x, y) - coast(along(x, y));
    t[i] = d < 0 ? T.DEADSEA : d < 7 && noise(x, y, 0.12, 3) > 0.42 - d * 0.02 ? T.MIRE : T.ASH;
  }
  // the cities: blobs of ruins; the war's last bombs: radiation craters (most on a city)
  const land = (x, y) => inBox(x, y) && t[y * W + x] === T.ASH;
  const spot = (minInland) => {
    for (let k = 0; k < 200; k++) {
      const x = E.x0 + 6 + Math.floor(rng() * (bw - 12)), y = E.y0 + 6 + Math.floor(rng() * (bh - 12));
      if (land(x, y) && inland(x, y) >= minInland) return { x, y };
    }
    return { x: (E.x0 + E.x1) >> 1, y: (E.y0 + E.y1) >> 1 };
  };
  const blob = (c, rad, ter, k, onto) => {
    for (let y = Math.floor(c.y - rad - 2); y <= c.y + rad + 2; y++) for (let x = Math.floor(c.x - rad - 2); x <= c.x + rad + 2; x++) {
      if (!inBox(x, y)) continue;
      const i = y * W + x, d = hypot(x + 0.5 - c.x, y + 0.5 - c.y) / rad;
      if (onto.has(t[i]) && d + (noise(x, y, 0.25, k) - 0.5) * 0.7 < 1) t[i] = ter;
    }
  };
  const cities = [];
  for (let k = 5 + Math.floor(rng() * 3); k > 0; k--) { const c = spot(10); c.r = 5 + rng() * 5; cities.push(c); blob(c, c.r, T.RUINS, 10 + k, new Set([T.ASH, T.MIRE])); }
  for (let k = 3 + Math.floor(rng() * 2); k > 0; k--) {
    const c = rng() < 0.6 && cities.length ? cities[Math.floor(rng() * cities.length)] : spot(8);
    blob({ x: c.x + (rng() - 0.5) * 6, y: c.y + (rng() - 0.5) * 6 }, 4 + rng() * 3.5, T.RADZONE, 20 + k, new Set([T.ASH, T.RUINS, T.MIRE]));
  }
  // toxic gas pools in the low ground, about a quarter of the land
  const vals = [];
  for (let y = E.y0; y <= E.y1; y++) for (let x = E.x0; x <= E.x1; x++) if (t[y * W + x] === T.ASH) vals.push(noise(x, y, 0.07, 30));
  vals.sort((a, b) => a - b);
  const q = vals[Math.floor(vals.length * 0.68)] ?? 1;
  for (let y = E.y0; y <= E.y1; y++) for (let x = E.x0; x <= E.x1; x++) { const i = y * W + x; if (t[i] === T.ASH && noise(x, y, 0.07, 30) > q) t[i] = T.TOXIC; }
  // the landing field: well inland, where the fewest hazards are; a cleared 10 × 10 pad, clean ground around it
  let best = null, bestScore = Infinity;
  for (let k = 0; k < 160; k++) {
    const x = E.x0 + 14 + Math.floor(rng() * (bw - 28)), y = E.y0 + 12 + Math.floor(rng() * (bh - 24));
    if (inland(x, y) < span * 0.4) continue;
    let bad = 0;
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) { const v = t[(y + dy) * W + x + dx]; if (v !== T.ASH) bad += HOPE.harmful.has(v) ? 2 : 1; }
    const score = bad + Math.abs(along(x, y) - along((E.x0 + E.x1) >> 1, (E.y0 + E.y1) >> 1)) * 0.5;
    if (score < bestScore) { bestScore = score; best = { x, y }; }
  }
  best ??= spot(20);
  for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
    const x = best.x + dx, y = best.y + dy;
    if (!inBox(x, y)) continue;
    const i = y * W + x, d = Math.max(Math.abs(dx + 0.5), Math.abs(dy + 0.5));
    if (d < 5) t[i] = T.LANDING;
    else if (d < 9 || hypot(dx, dy) < 9) t[i] = T.ASH;
  }
  return { w: W, h: H, t, r, ch, sv, box: { ...E }, landing: { x: best.x - 4, y: best.y - 4 }, sea };
}

// ---------------------------------------------------------------- state
const emptyStock = () => Object.fromEntries(HOPE.goods.map((g) => [g, 0]));
export function ensureHope(state) {
  if (state.hope === undefined) state.hope = null;
  const h = state.hope;
  if (!h) return null;
  h.buildings ??= []; h.pop ??= 0; h.stock ??= emptyStock();
  for (const g of HOPE.goods) h.stock[g] ??= 0;
  h.ark ??= { at: 'eden', days: 0, load: null, manifest: { pop: 40, food: 400, water: 400, air: 400, parts: 500, alloy: 300 }, auto: false, trips: 0 };
  h.drops ??= []; h.dropReady ??= 0; h.milestones ??= {}; h.recovery ??= 0; h.peak ??= 0;
  h.stats ??= { treated: 0, landed: 0, lost: 0, harvest: 0, dropped: 0 };
  if (h.earthlight === undefined) h.earthlight = null;
  for (const b of h.buildings) b.deck = 'earth';
  return h;
}
export const hopeOn = (state) => !!state?.hope && !!state?.decks?.earth?.t;
export const hopeMap = (state) => state?.decks?.earth || null;
const working = (b) => b.build === 0 && !b.off;
export const hopeGoalPop = (state) => (state.difficulty === 'easy' ? HOPE.goal.easyPop : HOPE.goal.pop);
export const tripDays = (state) => HOPE.tripDays - (state.difficulty === 'easy' ? 1 : 0);
const edenArk = (state) => (state.buildings || []).find((b) => b.key === 'ark');
const landingOf = (h) => h.buildings.find((b) => b.key === 'landingfield');

// Opens the Hope: the deck from the seed, the Landing Field, the Ark home in her dock. Idempotent.
export function unlockHope(state) {
  if (hopeOn(state)) return state.hope;
  const m = generateHope(state.seed, state.map);
  state.decks ??= {};
  state.decks.earth = m;
  state.hope = { day: state.day };
  const h = ensureHope(state);
  h.buildings.push({ id: state.nextId++, key: 'landingfield', x: m.landing.x, y: m.landing.y, deck: 'earth', level: 1, mode: null, build: 0, off: false });
  const a = edenArk(state);
  if (a) a.ship = true;
  return h;
}

// ---------------------------------------------------------------- capacities
export function hopeHousing(state) {
  return (state.hope?.buildings || []).reduce((t, b) => t + (working(b) ? HOPE_BUILDING[b.key]?.housing || 0 : 0), 0);
}
export function hopeCaps(state) {
  const cap = emptyStock();
  for (const b of state.hope?.buildings || []) if (working(b)) for (const [g, n] of Object.entries(HOPE_BUILDING[b.key]?.storage || {})) cap[g] = (cap[g] || 0) + n;
  return cap;
}
export function hopeJobs(state) {
  return (state.hope?.buildings || []).reduce((t, b) => t + (working(b) ? HOPE_BUILDING[b.key]?.jobs || 0 : 0), 0);
}
export const hopeStaff = (state) => { const j = hopeJobs(state); return j ? Math.min(1, (state.hope?.pop || 0) / j) : 1; };

// ---------------------------------------------------------------- placement
const footprint = (d, x, y) => { const out = []; for (let dy = 0; dy < d.size; dy++) for (let dx = 0; dx < d.size; dx++) out.push([x + dx, y + dy]); return out; };
export function hopeBuildingAt(state, x, y) {
  return (state.hope?.buildings || []).find((b) => { const s = HOPE_BUILDING[b.key]?.size || 1; return x >= b.x && y >= b.y && x < b.x + s && y < b.y + s; }) || null;
}
function occupancy(state) {
  const m = hopeMap(state), occ = new Uint8Array(m.w * m.h);
  for (const b of state.hope.buildings) for (const [x, y] of footprint(HOPE_BUILDING[b.key], b.x, b.y)) occ[y * m.w + x] = 1;
  return occ;
}
// Within `rad` tiles (Chebyshev) of the footprint: does any tile pass `test`?
function near(m, d, x, y, rad, test) {
  for (let ty = y - rad; ty < y + d.size + rad; ty++) for (let tx = x - rad; tx < x + d.size + rad; tx++) {
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) continue;
    if (test(m.t[ty * m.w + tx])) return true;
  }
  return false;
}
export const hopeCost = (key) => ({ credits: 0, parts: 0, alloy: 0, ...(HOPE_BUILDING[key]?.cost || {}) });
// Why the building cannot stand at (x, y) on Earth, or null.
export function hopeCanBuild(state, key, x, y) {
  if (!hopeOn(state)) return 'Earth is out of reach until the Ark is complete.';
  const d = HOPE_BUILDING[key];
  if (!d) return `Only the Hope's own buildings can stand on Earth (${BUILDING[key]?.name || key} cannot).`;
  if (d.fixed) return `The ${d.name} cannot be built.`;
  const m = hopeMap(state), on = new Set(d.on.map((k) => K[k]));
  for (const [tx, ty] of footprint(d, x, y)) {
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return 'Off the map.';
    const v = m.t[ty * m.w + tx];
    if (!on.has(v)) {
      const n = TERRAIN[v]?.name || 'this ground';
      return v === T.OUTSIDE ? 'Beyond the Hope.' : HOPE.harmful.has(v) || v === T.RUINS || v === T.MIRE || v === T.DEADSEA ? `${n}: treat it first.` : `Needs ${d.on.map((k) => TERRAIN[K[k]].name.toLowerCase()).join(' or ')}.`;
    }
    if (hopeBuildingAt(state, tx, ty)) return 'Something already stands here.';
  }
  if (d.clear && near(m, d, x, y, d.clear, (v) => HOPE.harmful.has(v))) return `Toxic gas or radiation within ${d.clear} tiles: clear it first.`;
  if (d.nearSea && !near(m, d, x, y, 1, (v) => v === T.DEADSEA || v === T.SEA)) return 'Must stand on the shore.';
  if (d.needsSeeds && !state.hope.buildings.some((b) => b.key === 'seedbank' && working(b))) return 'Needs a finished Seed Bank on Earth.';
  const c = hopeCost(key), h = state.hope;
  if (c.credits > (state.stock.credits || 0)) return `Needs ${fmt(c.credits)} credits.`;
  for (const g of ['parts', 'alloy']) if (c[g] > (h.stock[g] || 0)) return `Needs ${fmt(c[g])} ${g} on Earth (the Hope has ${fmt(h.stock[g] || 0)}): send them down with the Ark.`;
  return null;
}
export function hopeBuild(state, key, x, y) {
  const why = hopeCanBuild(state, key, x, y);
  if (why) return no(why);
  const d = HOPE_BUILDING[key], c = hopeCost(key), h = state.hope;
  state.stock.credits -= c.credits; h.stock.parts -= c.parts; h.stock.alloy -= c.alloy;
  const b = { id: state.nextId++, key, x, y, deck: 'earth', level: 1, mode: null, build: d.days, off: false, work: 0 };
  h.buildings.push(b);
  log(state, `${d.name} ordered on Earth.`);
  return ok(`${d.name} placed on Earth: ${d.days} days of work for a crew.`, { id: b.id });
}
export function hopeDemolish(state, id) {
  const h = state.hope, b = h?.buildings.find((x) => x.id === id);
  if (!b) return no('That building is gone.');
  const d = HOPE_BUILDING[b.key];
  if (d.fixed) return no(`The ${d.name} cannot be demolished.`);
  h.buildings.splice(h.buildings.indexOf(b), 1);
  const back = Math.floor(d.cost.parts / 2);
  h.stock.parts += back;
  log(state, `${d.name} on Earth taken down.`);
  return ok(`${d.name} taken down: ${back} parts recovered.`);
}
export function hopeToggle(state, id) {
  const b = state.hope?.buildings.find((x) => x.id === id);
  if (!b || HOPE_BUILDING[b.key]?.fixed) return no('Not possible.');
  b.off = !b.off;
  return ok(`${HOPE_BUILDING[b.key].name} switched ${b.off ? 'off' : 'back on'}.`);
}
// What the inspector reads (rules.tileInfo's shape).
export function hopeTileInfo(state, x, y) {
  const m = hopeMap(state);
  if (!m || x < 0 || y < 0 || x >= m.w || y >= m.h) return null;
  const i = y * m.w + x;
  return { terrain: TERRAIN[m.t[i]], artifact: { id: 0, key: 'none', name: '' }, salvage: 0, chamber: null, building: hopeBuildingAt(state, x, y),
    reach: false, coverage: { park: 0 }, deck: 'earth', lift: null, hope: true, harmful: HOPE.harmful.has(m.t[i]), recovered: HOPE.recovered.has(m.t[i]) };
}

// ---------------------------------------------------------------- the Ark and the drops
export const arkLoad = (o) => HOPE.goods.reduce((t, g) => t + Math.max(0, Math.floor(o?.[g] || 0)), 0);
export function setManifest(state, man) {
  const h = state.hope;
  if (!h) return no('The Hope is not open yet.');
  const m = {};
  m.pop = clamp(Math.floor(+man.pop || 0), 0, HOPE.capacity.pop);
  for (const g of HOPE.goods) m[g] = clamp(Math.floor(+man[g] || 0), 0, HOPE.capacity.cargo);
  h.ark.manifest = m;
  return ok('Manifest set.');
}
export function setArkAuto(state, on) { if (!state.hope) return no('The Hope is not open yet.'); state.hope.ark.auto = !!on; return ok(on ? 'The Ark will sail again whenever she is home.' : 'The Ark waits for your order.'); }
// Loads what Eden has of the manifest (or `man`) and sends the Ark down. Keeps at least 10 colonists in Eden.
export function launchArk(state, man = null) {
  const h = state.hope;
  if (!hopeOn(state)) return no('The Hope is not open yet.');
  if (h.ark.at !== 'eden') return no('The Ark is not in her dock.');
  if (man) { const r = setManifest(state, man); if (!r.ok) return r; }
  const want = h.ark.manifest;
  if (arkLoad(want) > HOPE.capacity.cargo) return no(`Over capacity: the Ark carries ${fmt(HOPE.capacity.cargo)} units of goods a trip.`);
  const load = { pop: Math.max(0, Math.min(want.pop || 0, Math.floor(state.pop) - 10)) };
  for (const g of HOPE.goods) load[g] = Math.max(0, Math.min(want[g] || 0, Math.floor(state.stock[g] || 0)));
  if (!load.pop && !arkLoad(load)) return no('Nothing to carry: Eden has none of the manifest.');
  state.pop -= load.pop;
  for (const g of HOPE.goods) state.stock[g] -= load[g];
  h.ark.at = 'out'; h.ark.days = tripDays(state); h.ark.load = load;
  const a = edenArk(state); if (a) a.ship = false;
  const text = `The Ark leaves for the Hope with ${fmt(load.pop)} colonists and ${fmt(arkLoad(load))} units of goods: ${h.ark.days} days to Earth.`;
  log(state, text);
  return ok(text);
}
export function dropper(state) {
  const by = (key) => (state.buildings || []).some((b) => b.key === key && b.build === 0 && !b.off && !(b.damaged > 0));
  return by('elevator') ? { key: 'elevator', name: 'Orbital Elevator', cap: HOPE.drop.elevator } : by('massdriver') ? { key: 'massdriver', name: 'Mass Driver', cap: HOPE.drop.massdriver } : null;
}
// Goods sent down by the Mass Driver or the Orbital Elevator (no people): `n` of `good`, arriving in HOPE.drop.days.
export function sendDown(state, good, n) {
  const h = state.hope, d = dropper(state);
  if (!hopeOn(state)) return no('The Hope is not open yet.');
  if (!d) return no('Needs a working Mass Driver or Orbital Elevator.');
  if (!HOPE.goods.includes(good)) return no('That cannot be sent down.');
  if (state.day < h.dropReady) return no(`The ${d.name} is ready again on day ${h.dropReady}.`);
  n = Math.min(Math.floor(n), d.cap, Math.floor(state.stock[good] || 0));
  if (!(n > 0)) return no(`Eden has no ${good} to send.`);
  state.stock[good] -= n;
  h.drops.push({ good, n, days: HOPE.drop.days });
  h.dropReady = state.day + HOPE.drop.cooldown;
  log(state, `The ${d.name} sends ${fmt(n)} ${good} down to the Hope.`);
  return ok(`${fmt(n)} ${good} on the way down: ${HOPE.drop.days} days.`);
}

// ---------------------------------------------------------------- recovery
export function hopeRecovery(state) {
  const m = hopeMap(state);
  if (!m) return { recovered: 0, total: 0, share: 0, counts: {} };
  let rec = 0, tot = 0;
  const counts = {};
  for (let i = 0; i < m.t.length; i++) {
    const v = m.t[i];
    if (v === T.OUTSIDE) continue;
    tot++; counts[TERRAIN[v].key] = (counts[TERRAIN[v].key] || 0) + 1;
    if (HOPE.recovered.has(v)) rec++;
  }
  return { recovered: rec, total: tot, share: tot ? rec / tot : 0, counts };
}

// The story beats: once each, in the order they come.
export const HOPE_BEATS = [
  { key: 'landfall', test: (s) => s.hope.pop > 0, speaker: 'sato', title: 'Wheels down on Earth',
    text: 'The Ark is on the landing field. The first colonists of the Hope are under the tents.',
    quote: 'Wheels down, sir. First time anyone from Eden has stood on Earth since the war. The suits are holding. The air is yellow out past the field. Nobody is taking their helmet off.' },
  { key: 'dome', test: (s) => s.hope.buildings.some((b) => b.key === 'sealeddome' && working(b)), speaker: 'ruess', title: 'The first dome',
    text: 'The first Sealed Dome on Earth is pressurised: forty people can live on Earth without a suit.',
    quote: 'Seals tight, air recycling, children asleep under it. I built domes on Eden from wreckage. This one I built on the ground we were born on.' },
  { key: 'cleared', test: (s) => s.hope.stats.treated > 0, speaker: 'general', title: 'The first clean ground',
    text: 'The first poisoned ground on Earth has been treated.',
    quote: 'One tile. A few metres of Earth that will not kill anyone any more. Write the day down. We will need it when we tell this story.' },
  { key: 'r10', test: (s) => s.hope.recovery >= 0.1, speaker: 'ruess', title: 'A tenth of the Hope',
    text: 'A tenth of the Hope is recovered.',
    quote: 'Ten percent. The sensors at the edge of the field picked up insects this morning. Not ours. Earth\'s. Something survived out there and is coming back.' },
  { key: 'harvest', test: (s) => s.hope.stats.harvest > 0, speaker: 'sato', title: 'The first harvest',
    text: 'The First Fields gave food grown in Earth\'s own soil.',
    quote: 'Potatoes, sir. Grown in dirt, under the real sky. The crew ate them raw, in the field. I had two.' },
  { key: 'pop100', test: (s) => s.hope.pop >= 100, speaker: 'general', title: 'A hundred on Earth',
    text: 'A hundred colonists live on Earth.',
    quote: 'A hundred people who chose the hard ground over Eden\'s gardens. Every one of them could have stayed. That is the Hope.' },
  { key: 'sea', test: (s) => (hopeRecovery(s).counts.sea || 0) >= 100, speaker: 'ruess', title: 'Clean water',
    text: 'A stretch of the sea runs clean again.',
    quote: 'The bay is blue along the purifier line. Blue. I had forgotten the sea was supposed to be that colour.' },
  { key: 'forest', test: (s) => (hopeRecovery(s).counts.forest || 0) > 0, speaker: 'general', title: 'A tree on Earth',
    text: 'The first forest grows on Earth.',
    quote: 'Seedlings from the Arboretum, planted in Earth\'s soil. In forty years they will be taller than the domes. I intend to see it.' },
  { key: 'r25', test: (s) => s.hope.recovery >= 0.25, speaker: 'sato', title: 'A quarter of the Hope',
    text: 'A quarter of the Hope is recovered.',
    quote: 'On the approach today I could see it from orbit: a patch of green and blue in all that brown. Small. But it is there, and it is ours.' },
  { key: 'r40', test: (s) => s.hope.recovery >= 0.4, speaker: 'ruess', title: 'The tide turns',
    text: 'Two fifths of the Hope are recovered.',
    quote: 'The scrubbers are clearing faster than the wind blows the poison back. The equations say it is self-sustaining now. I checked them three times.' },
];

export const HOPE_UNLOCK = {
  title: 'The Hope',
  text: 'With the Ark complete, Eden can reach the ground at last. Before the long voyage she will do what she was really built for first: carry Eden down to Earth. A landing field has been cleared on the poisoned coast below. Nothing lives there; nothing can, unless Eden pays for every metre. Load the Ark (Ark panel, or the Hope deck) and send the first colonists down.',
  speaker: 'general',
  quote: 'They called Earth a grave. We came up here to survive it. Now we go back down and dig it out. Call the place the Hope, because that is all we are taking with us.',
};
export const HOPE_ENDING = [
  ['ruess', 'Prof. Ruess', 'Half the Hope is clean ground, clean water and young forest. The model says the rest will follow on its own within a lifetime. Mine, possibly. I intend to check.'],
  ['sato', 'Capt. Sato', 'I flew the Ark home over the coast tonight and looked down. There was green on Earth, sir. You could see it from orbit. Earthlight, coming back the other way.'],
  ['general', 'The General', 'Eden was a lifeboat. The Ark was a promise. The Hope is the beginning. Earth is not a grave any more. It is a garden that needs us. Let us get to work.'],
];
export const HOPE_ENDING_TEXT = 'From Eden\'s sky panels tonight the colonists can see it: a green light on the dark face of Earth, where the Hope has turned poisoned ground back into soil, forest and clean sea. It is the first green on Earth in a generation, and it is growing. Earth\'s recovery has begun.';

// ---------------------------------------------------------------- each day (sim.js)
// Returns true on the day of the Earthlight ending.
export function hopeDay(state, { say = () => {}, ask = null } = {}) {
  if (state.hope === undefined) state.hope = null;
  if (!state.hope && state.ark && state.day > (state.ark.day ?? 0)) {
    unlockHope(state);
    log(state, `Day ${state.day}: the Hope. Earth is within reach of the Ark.`);
    const p = addPending(state, 'hope', HOPE_UNLOCK.title, HOPE_UNLOCK.text);
    p.speaker = HOPE_UNLOCK.speaker; p.quote = HOPE_UNLOCK.quote; p.show = { deck: 'earth', tile: { ...landingCentre(state), deck: 'earth' } };
    say('hope', HOPE_UNLOCK.text, true);
  }
  if (!hopeOn(state)) return false;
  const h = ensureHope(state), m = hopeMap(state), ark = h.ark, cap = () => hopeCaps(state);
  // 1 the Ark
  const lf = landingOf(h), ea = edenArk(state);
  if (ark.at === 'eden' && ark.auto) { const r = launchArk(state); if (r.ok) say('hope', r.msg); }
  else if (ark.at === 'out' && --ark.days <= 0) {
    const L = ark.load || { pop: 0 }, c = cap(), free = Math.max(0, hopeHousing(state) - Math.floor(h.pop));
    const land = Math.min(L.pop, free);
    h.pop += land; L.pop -= land; h.stats.landed += land;
    let goods = 0;
    for (const g of HOPE.goods) { const n = Math.max(0, Math.min(L[g] || 0, (c[g] || 0) - (h.stock[g] || 0))); h.stock[g] += n; L[g] -= n; goods += n; }
    ark.at = 'earth'; ark.days = HOPE.stayDays;
    if (lf) lf.ship = true;
    say('hope', `The Ark is down on the Hope's landing field: ${fmt(land)} colonists and ${fmt(goods)} units of goods unloaded${L.pop || arkLoad(L) ? ` (${L.pop ? `${fmt(L.pop)} with no home to go to` : ''}${L.pop && arkLoad(L) ? ', ' : ''}${arkLoad(L) ? `${fmt(arkLoad(L))} goods with no room in the stores` : ''} stay aboard)` : ''}.`);
  } else if (ark.at === 'earth' && --ark.days <= 0) {
    ark.at = 'back'; ark.days = tripDays(state);
    if (lf) lf.ship = false;
  } else if (ark.at === 'back' && --ark.days <= 0) {
    const L = ark.load || {};
    state.pop += L.pop || 0;
    for (const g of HOPE.goods) state.stock[g] = (state.stock[g] || 0) + (L[g] || 0);
    ark.load = null; ark.at = 'eden'; ark.days = 0; ark.trips++;
    if (ea) ea.ship = true;
    say('hope', `The Ark is home in her dock after trip ${ark.trips} to the Hope.`);
  }
  if (ark.at !== 'eden' && ea) ea.ship = false;
  // 2 goods sent down
  for (const d of [...h.drops]) {
    if (--d.days > 0) continue;
    h.drops.splice(h.drops.indexOf(d), 1);
    const n = Math.max(0, Math.min(d.n, (cap()[d.good] || 0) - (h.stock[d.good] || 0)));
    h.stock[d.good] += n; h.stats.dropped += n;
    say('hope', `${fmt(d.n)} ${d.good} landed at the Hope${n < d.n ? ` (${fmt(d.n - n)} lost: the stores are full)` : ''}.`);
  }
  // 3 building: a crew per 50 colonists (the first at 10)
  let crews = h.pop >= HOPE.crewPop ? Math.min(HOPE.crewMax, 1 + Math.floor(h.pop / HOPE.crewPer)) : 0;
  for (const b of h.buildings) {
    if (!(b.build > 0) || crews <= 0) continue;
    crews--;
    b.build = Math.max(0, b.build - 1);
    if (b.build === 0) say('hope', `${HOPE_BUILDING[b.key].name} finished on Earth.`);
  }
  // 4 work, upkeep (from Eden's purse), production and needs
  const staff = hopeStaff(state);
  let upkeep = 0;
  for (const b of h.buildings) if (working(b)) upkeep += HOPE_BUILDING[b.key].upkeep || 0;
  const moneyF = upkeep && (state.stock.credits || 0) < upkeep ? 0.5 : 1;
  state.stock.credits = Math.max(0, (state.stock.credits || 0) - upkeep);
  const made = emptyStock(), used = emptyStock();
  for (const b of h.buildings) {
    if (!working(b)) continue;
    const d = HOPE_BUILDING[b.key], f = (d.jobs ? staff : 1) * moneyF;
    for (const [g, n] of Object.entries(d.makes || {})) {
      let v = n * f;
      if (d.soil) v *= fieldSoil(m, d, b);
      made[g] += v;
      if (d.soil && v > 0) h.stats.harvest += v;
    }
    for (const [g, n] of Object.entries(d.uses || {})) used[g] += n * f;
  }
  for (const g of Object.keys(HOPE.need)) used[g] += HOPE.need[g] * h.pop;
  let short = false;
  for (const g of HOPE.goods) {
    const v = (h.stock[g] || 0) + made[g] - used[g];
    if (v < 0 && HOPE.need[g]) short = true;
    h.stock[g] = Math.max(0, v);
  }
  const c = cap();
  for (const g of HOPE.goods) h.stock[g] = Math.min(h.stock[g], c[g] || 0);
  if (short && h.pop > 0) {
    const lost = Math.max(1, Math.ceil(h.pop * HOPE.shortLoss));
    h.pop = Math.max(0, h.pop - lost); h.stats.lost += lost;
    if (!h.short) say('hope', `The Hope is short of food, water or air: colonists are dying or being evacuated (${lost} today). Send supplies down with the Ark.`, true);
  }
  h.short = short;
  if (h.pop > hopeHousing(state)) h.pop = hopeHousing(state);   // a dome went off: they crowd back into the Ark's hold home
  h.stats.last = { made, used, staff, upkeep };
  // 5 the ground: each treating building turns the nearest tiles in its radius
  const occ = occupancy(state);
  for (const b of h.buildings) {
    const d = HOPE_BUILDING[b.key];
    if (!working(b) || !d.treats) continue;
    const f = (d.jobs ? staff : 1) * moneyF;
    b.work = typeof b.work === 'object' && b.work ? b.work : {};
    d.treats.forEach((tr, k) => {
      b.work[k] = (b.work[k] || 0) + tr.rate * f;
      const from = new Set(tr.from.map((x) => K[x]));
      while (b.work[k] >= 1) {
        const i = nearestTile(m, d, b, from, occ);
        if (i < 0) { b.work[k] = Math.min(b.work[k], 1); break; }
        if (m.t[i] === T.RUINS) h.stock.parts = Math.min(c.parts || 0, h.stock.parts + (d.salvage || 0));
        m.t[i] = K[tr.to]; b.work[k] -= 1; h.stats.treated++;
      }
    });
  }
  // 6 recovery, the story beats, the ending
  const rec = hopeRecovery(state);
  h.recovery = rec.share; h.peak = Math.max(h.peak, rec.share);
  for (const beat of HOPE_BEATS) {
    if (h.milestones[beat.key] != null || !beat.test(state)) continue;
    h.milestones[beat.key] = state.day;
    log(state, `Day ${state.day}: ${beat.title}. ${beat.text}`);
    const p = addPending(state, 'hope', beat.title, beat.text);
    p.speaker = beat.speaker; p.quote = beat.quote; p.show = { deck: 'earth', tile: { ...landingCentre(state), deck: 'earth' } };
    say('hope', `${beat.title}: ${beat.text}`, true);
    break;   // one beat a day
  }
  if (!h.earthlight && h.recovery >= HOPE.goal.recovery && h.pop >= hopeGoalPop(state)) {
    h.earthlight = { day: state.day, pop: Math.floor(h.pop), recovery: Math.round(h.recovery * 100), trips: ark.trips, buildings: h.buildings.filter(working).length,
      edenPop: Math.floor(state.pop), since: h.day, treated: h.stats.treated, difficulty: state.difficulty === 'easy' ? 'easy' : 'normal' };
    log(state, `Day ${state.day}: Earthlight. The first green on Earth can be seen from Eden.`);
    const p = addPending(state, 'earthlight', 'Earthlight', HOPE_ENDING_TEXT, [{ key: 'keep', label: 'Keep building' }]);
    p.speaker = 'general'; p.show = { deck: 'earth', tile: { ...landingCentre(state), deck: 'earth' } };
    return true;
  }
  return false;
}
function landingCentre(state) {
  const b = state.hope && landingOf(state.hope);
  return b ? { x: b.x + 2, y: b.y + 2 } : { x: 128, y: 72 };
}
// A field's soil: the mean multiplier of its tiles (plain 1.1, fertile 1.8, anything else 0).
function fieldSoil(m, d, b) {
  let s = 0;
  for (const [x, y] of footprint(d, b.x, b.y)) s += TERRAIN[m.t[y * m.w + x]]?.soil || 0;
  return s / (d.size * d.size);
}
// The nearest tile of `from` within the building's radius (Euclidean from its centre; ties by index), not under a building.
function nearestTile(m, d, b, from, occ) {
  const cx = b.x + d.size / 2, cy = b.y + d.size / 2, R = d.radius || 0;
  let best = -1, bd = Infinity;
  for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue;
    const i = y * m.w + x;
    if (!from.has(m.t[i]) || occ[i]) continue;
    const dd = hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (dd <= R + 0.5 && dd < bd) { bd = dd; best = i; }
  }
  return best;
}

// ---------------------------------------------------------------- what the panels read
export function hopeStatus(state) {
  const h = state.hope;
  if (!hopeOn(state)) return { unlocked: false, needs: state.ark ? 'The Hope opens tomorrow.' : 'Finish the Ark (a wonder) to reach Earth.' };
  const rec = hopeRecovery(state), d = dropper(state);
  return {
    unlocked: true, recovery: rec.share, pct: Math.round(rec.share * 1000) / 10, recovered: rec.recovered, total: rec.total, counts: rec.counts,
    goal: { recovery: HOPE.goal.recovery, pop: hopeGoalPop(state) }, pop: Math.floor(h.pop), housing: hopeHousing(state), jobs: hopeJobs(state), staff: hopeStaff(state),
    stock: { ...h.stock }, cap: hopeCaps(state), last: h.stats.last || null, short: !!h.short,
    ark: { ...h.ark, capacity: HOPE.capacity, tripDays: tripDays(state), loadNow: h.ark.load ? arkLoad(h.ark.load) : 0 },
    drop: d ? { ...d, ready: state.day >= h.dropReady, readyDay: h.dropReady, pending: h.drops.map((x) => ({ ...x })) } : null,
    building: h.buildings.filter((b) => b.build > 0).length, buildings: h.buildings.length,
    milestones: HOPE_BEATS.map((b) => ({ key: b.key, title: b.title, day: h.milestones[b.key] ?? null })), earthlight: h.earthlight,
  };
}
