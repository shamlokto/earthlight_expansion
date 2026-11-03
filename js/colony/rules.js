// Earthlight Space Colony Rebuild: the player's actions and the read-outs of a colony state
// (docs/COLONY-V1.md "rules.js"). Pure: no DOM, no randomness. Every action returns { ok, msg }
// with a sentence a player can read; refusals say what to do about it.
import { T, R, TERRAIN, ARTIFACT, zoneOf } from './data/terrain.js';
import { diffOf } from './difficulty.js';
import { BUILDING, BUILDINGS, BASE_PRICE, DOCK_REACH, NEEDS } from './data/buildings.js';
import { TECH, TECHS } from './data/tech.js';

// alloy and helium(-3) arrived with version 2 (docs/COLONY-V2.md "New goods").
export const STORED = ['food', 'water', 'air', 'parts', 'ore', 'alloy', 'helium'];
export const GOODS = [...STORED, 'credits'];
export const SURVEY = { credits: 100, days: 2 };
export const PRESSURISE = { days: 5, airPerTile: 1 / 4 };
export const MOVE_FEE = 0.2;
export const EMPTY_TAILINGS = { credits: 50 };
export const TAX_MAX = 0.3;
export const PRICE = { lot: 10, drop: 0.02, recover: 0.05, floor: 0.1 };
// Sale price of an expansion machine, as campaign.js prices it (value × hp); 24 when unknown.
export const unitPrice = (types, type) => {
  const t = types && (Array.isArray(types) ? types.find((u) => u && u.type === type) : types[type]);
  return t ? Math.max(1, t.value) * t.hp : 24;
};

const ok = (msg, extra) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });
const OPEN = 'open';

// ---------------------------------------------------------------- shared helpers (sim.js uses them)

export function log(state, text) {
  state.log.push({ day: state.day, text });
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
}
export function addPending(state, kind, title, text, choices = [{ key: 'ok', label: 'Continue' }]) {
  const p = { id: state.nextId++, kind, title, text, choices };
  state.pending.push(p);
  return p;
}

// Version 2 fields with their defaults, for colonies started (or saved) before version 2 and for
// hand-made states. Idempotent; state.js loadState and sim.js dayTick call it.
export function upgradeState(state) {
  state.research ??= { points: 0, focus: null, progress: {}, done: [] };
  const r = state.research;
  r.points ??= 0; r.focus ??= null; r.progress ??= {}; r.done ??= [];
  for (const g of STORED) state.stock[g] ??= 0;
  state.market ??= {};
  for (const g of Object.keys(BASE_PRICE)) state.market[g] ??= 1;
  // a colony that passed 80 colonists before the lab existed still gets it
  if (state.flags?.unlock80) for (const d of BUILDINGS) if (d.unlock && d.unlock.pop <= 80 && !state.unlocked.includes(d.key)) state.unlocked.push(d.key);
  return state;
}

// ---------------------------------------------------------------- research (version 2)

// The product of `mult` over finished techs' effects of this kind (and key, for output, storage
// and cost); 1 when none. 'survey' returns { mult, days } (days: the shortest a tech allows).
export function techEffect(state, kind, key) {
  let mult = 1, days = SURVEY.days;
  for (const k of state.research?.done || []) for (const e of TECH[k]?.effects || []) {
    if (e.kind !== kind || (e.key ?? null) !== (key ?? null)) continue;
    mult *= e.mult ?? 1;
    if (e.days !== undefined) days = Math.min(days, e.days);
  }
  return kind === 'survey' ? { mult, days } : mult;
}
const techAvailable = (state, t) => t.needs.every((n) => state.research.done.includes(n));

export function techStatus(state) {
  upgradeState(state);
  const r = state.research;
  return TECHS.map((t) => {
    const done = r.done.includes(t.key);
    return {
      key: t.key, name: t.name, branch: t.branch, cost: t.cost, progress: done ? t.cost : Math.min(t.cost, r.progress[t.key] || 0),
      done, available: !done && techAvailable(state, t), focus: r.focus === t.key, needs: [...t.needs], unlocks: [...t.unlocks], text: t.text,
    };
  });
}

// Choose what the labs study. Points banked while nothing was focused flow into it from the next day.
export function research(state, techKey) {
  upgradeState(state);
  const t = TECH[techKey], r = state.research;
  if (!t) return no('There is no such technology.');
  if (r.done.includes(t.key)) return no(`${t.name} is already known.`);
  if (!techAvailable(state, t)) return no(`${t.name} needs ${t.needs.filter((n) => !r.done.includes(n)).map((n) => TECH[n].name).join(' and ')} first.`);
  if (r.focus === t.key) return ok(`The labs are already studying ${t.name}.`);
  r.focus = t.key;
  const labs = state.buildings.some((b) => b.key === 'lab');
  return ok(`The labs study ${t.name}: ${Math.ceil(t.cost - (r.progress[t.key] || 0))} points to go.${labs ? '' : ' Build a Research Lab to make research points.'}`);
}

// A building's table entry with its level's overrides (power, housing, crews...) applied.
const specs = new Map();
export function spec(b) {
  const k = b.key + ':' + b.level;
  let s = specs.get(k);
  if (!s) {
    const d = BUILDING[b.key];
    const { cost: upCost, name: levelName, ...lv } = d.levels?.[b.level - 1] || {};
    s = { ...d, ...lv, levelName: levelName || null, upCost: upCost || null };
    specs.set(k, s);
  }
  return s;
}
// `down`: days a building is knocked out (a meteoroid strike on a sweeper).
export const active = (b) => b.build === 0 && !b.off && !(b.down > 0);
export const finished = (b) => b.build === 0;
export const idx = (state, x, y) => y * state.map.w + x;
export function* tilesOf(state, b, size = BUILDING[b.key].size) {
  const w = state.map.w;
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) yield (b.y + dy) * w + b.x + dx;
}
export const centre = (b) => { const s = BUILDING[b.key].size; return { x: b.x + s / 2, y: b.y + s / 2 }; };
export const chamberOf = (state, ch) => (ch === 255 ? null : state.chambers[ch]?.id === ch ? state.chambers[ch] : state.chambers.find((c) => c.id === ch) || null);
export const byId = (state, id) => state.buildings.find((b) => b.id === id) || null;
const names = (keys) => keys.map((k) => TERRAIN.find((t) => t.key === k)?.name.toLowerCase() || k).join(', ');
const TKEY = Object.fromEntries(TERRAIN.map((t) => [t.key, t.id]));
const onSets = new Map();
const onSet = (d) => { let s = onSets.get(d.key); if (!s) onSets.set(d.key, (s = new Set(d.on.map((k) => TKEY[k])))); return s; };

// Tile -> id of the building standing on it (0 = free). `ignore` leaves one building out (moves).
export function occupancy(state, ignore = -1) {
  const occ = new Int32Array(state.map.w * state.map.h);
  for (const b of state.buildings) if (b.id !== ignore) for (const i of tilesOf(state, b)) occ[i] = b.id;
  return occ;
}

export function storageCaps(state) {
  const cap = { power: 0 };
  for (const g of STORED) cap[g] = 0;
  const mult = {};
  for (const b of state.buildings) {
    if (!finished(b)) continue;
    const s = spec(b);
    if (!s.storage) continue;
    const m = (mult[b.key] ??= techEffect(state, 'storage', b.key));
    if (b.key === 'depot') cap[b.mode || 'food'] = (cap[b.mode || 'food'] || 0) + Object.values(s.storage)[0] * m;
    else for (const [g, n] of Object.entries(s.storage)) cap[g] = (cap[g] || 0) + n * m;
  }
  return cap;
}
export const housingOf = (state) => state.buildings.reduce((t, b) => t + (active(b) ? spec(b).housing || 0 : 0), 0);
export const jobsOf = (state) => state.buildings.reduce((t, b) => t + (active(b) ? spec(b).jobs || 0 : 0), 0);
export const staffingOf = (state) => { const j = jobsOf(state); return j ? Math.min(1, state.pop / j) : 1; };
// Construction crews: the Command Centre's own plus each working Repair Yard's.
export const crewsOf = (state) => 2 + state.buildings.reduce((t, b) => t + (b.key === 'repairyard' && active(b) ? spec(b).crews || 1 : 0), 0);

// Power this day before batteries: { supply, demand }. Producers with jobs scale with staffing.
export function powerOf(state, staffing = staffingOf(state), moneyF = 1) {
  let supply = 0, demand = state.pop * NEEDS.power;
  for (const b of state.buildings) {
    if (!active(b)) continue;
    const s = spec(b);
    if (s.power > 0) supply += s.power * (s.jobs ? staffing : 1) * moneyF;
    else if (s.power < 0) demand -= s.power;
  }
  return { supply, demand };
}

// ---------------------------------------------------------------- reach, chambers, coverage

const docks = (state) => state.buildings.filter((b) => b.key === 'dock' && finished(b));
const REACH = BUILDING.dock.radius || DOCK_REACH;
const cheb = (x, y, c) => Math.max(Math.abs(x + 0.5 - c.x), Math.abs(y + 0.5 - c.y));
const reachTest = (cs) => (x, y) => cs.some((c) => cheb(x, y, c) <= c.r);
// The centres that give space reach: every finished dock (radius 24), then every finished Tether
// Mast (radius 16) that itself stands in reach, chained outwards. [{ x, y, r, key }]
export function reachSources(state) {
  const out = docks(state).map((b) => ({ ...centre(b), r: REACH, key: 'dock' }));
  let masts = state.buildings.filter((b) => b.key === 'tether' && finished(b));
  for (let grew = true; grew && masts.length;) {
    grew = false;
    const test = reachTest(out);
    masts = masts.filter((b) => {
      if (!test(b.x, b.y)) return true;
      out.push({ ...centre(b), r: spec(b).radius || 16, key: 'tether' });
      grew = true;
      return false;
    });
  }
  return out;
}
// Space (and atmosphere) buildability: the tile's centre within reach (Chebyshev) of a finished
// dock's centre, or of a chained Tether Mast's.
export const inReach = (state, x, y) => reachTest(reachSources(state))(x, y);
const spaceLike = (ti) => { const z = zoneOf(ti); return z === 'space' || z === 'atmo'; };

// The bottom hull wall (facing Earth): hull tiles below every chamber tile of their column.
const bottomCache = new WeakMap();
export function bottomHull(state, x, y) {
  const { w, h, ch, t } = state.map;
  let low = bottomCache.get(ch);
  if (!low) {
    low = new Int32Array(w).fill(-1);
    for (let i = 0; i < w * h; i++) if (ch[i] !== 255) low[i % w] = Math.max(low[i % w], (i / w) | 0);
    bottomCache.set(ch, low);
  }
  return t[y * w + x] === T.HULL && low[x] >= 0 && y > low[x];
}

// Chamber id -> Set of chambers across one wall tile (bulkheads, gates, breaches). Cached per map.
const linkCache = new WeakMap();
export function chamberLinks(state) {
  const { w, h, t, ch } = state.map;
  let links = linkCache.get(ch);
  if (links) return links;
  links = new Map(state.chambers.map((c) => [c.id, new Set()]));
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (ch[i] !== 255 || zoneOf(t[i]) !== 'wall') continue;
    const near = [ch[i - 1], ch[i + 1], ch[i - w], ch[i + w]].filter((c) => c !== 255);
    for (const a of near) for (const b of near) if (a !== b) links.get(a)?.add(b);
  }
  for (const c of state.chambers) for (const i of c.breaches) for (const d of state.chambers) {
    if (d !== c && d.breaches.includes(i)) links.get(c.id)?.add(d.id);
  }
  linkCache.set(ch, links);
  return links;
}
const sealAt = (state, i) => state.buildings.some((b) => b.key === 'seal' && finished(b) && idx(state, b.x, b.y) === i);
export const openBreaches = (state, c) => c.breaches.filter((i) => !sealAt(state, i));
const touchesOpen = (state, c) => [...(chamberLinks(state).get(c.id) || [])].some((id) => chamberOf(state, id)?.status === OPEN);

// Coverage of parks and groves: the best rating reaching each tile. Coverage spreads tile by tile
// (8 directions) through open chambers and gates, never through bulkheads (docs/COLONY.md §10.1).
let seen = new Int32Array(0), stamp = 0;
export function parkField(state) {
  const { w, h, t, ch } = state.map, n = w * h, field = new Float32Array(n);
  if (seen.length !== n) { seen = new Int32Array(n); stamp = 0; }
  const passable = (i) => t[i] === T.GATE || (ch[i] !== 255 && chamberOf(state, ch[i])?.status === OPEN);
  for (const b of state.buildings) {
    const s = spec(b);
    if (!s.park || !active(b)) continue;
    stamp++;
    let q = [...tilesOf(state, b)], d = 0;
    for (const i of q) seen[i] = stamp;
    while (q.length && d <= s.radius) {
      const next = [];
      for (const i of q) {
        if (field[i] < s.park) field[i] = s.park;
        if (d === s.radius) continue;
        const x = i % w, y = (i / w) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, j = ny * w + nx;
          if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h && seen[j] !== stamp && passable(j)) { seen[j] = stamp; next.push(j); }
        }
      }
      q = next; d++;
    }
  }
  return field;
}
// Best park rating over a building's footprint.
export const parkAt = (state, b, field = parkField(state)) => Math.max(0, ...[...tilesOf(state, b)].map((i) => field[i]));

// ---------------------------------------------------------------- placement

// Why `key` cannot stand at (x, y), or null. opts: { occ, ignore, free (skip the cost) }.
export function placeCheck(state, key, x, y, opts = {}) {
  const d = BUILDING[key];
  if (!d) return 'There is no such building.';
  if (d.fixed) return `The ${d.name} cannot be built.`;
  if (!state.unlocked.includes(key)) return lockedWhy(d);
  const { w, h, t, ch } = state.map;
  if (x < 0 || y < 0 || x + d.size > w || y + d.size > h) return 'That is off the edge of the map.';
  const on = onSet(d), reach = opts.reach || reachTest(reachSources(state));
  const occ = opts.occ || occupancy(state, opts.ignore ?? -1);
  for (let dy = 0; dy < d.size; dy++) for (let dx = 0; dx < d.size; dx++) {
    const i = (y + dy) * w + x + dx, ti = t[i];
    if (!on.has(ti)) return `A ${d.name} stands only on ${names(d.on)}, not on ${TERRAIN[ti].name.toLowerCase()}.`;
    const c = chamberOf(state, ch[i]);
    const interior = !!c && c.status === OPEN, space = spaceLike(ti), near = space && reach(x + dx, y + dy);
    if (d.zone === 'interior' && !interior) return c ? `${c.name} is not pressurised yet: survey, seal and pressurise it first.` : `A ${d.name} must stand inside an open chamber.`;
    if (d.zone === 'space' && !near) return space ? `That is beyond reach (${DOCK_REACH} tiles of a dock, 16 of a Tether Mast): build closer.` : `A ${d.name} must stand in space near a dock.`;
    if (d.zone === 'hull' && ti !== T.HULL) return `A ${d.name} must stand on the hull.`;
    if (key === 'obsdeck' && !bottomHull(state, x + dx, y + dy)) return `An ${d.name} must stand on the bottom hull wall, facing Earth.`;
    if (d.zone === 'any' && !(interior || near || ti === T.HULL)) {
      return space ? `That is beyond reach (${DOCK_REACH} tiles of a dock, 16 of a Tether Mast): build closer.` : c ? `${c.name} is not pressurised yet.` : `A ${d.name} cannot stand here.`;
    }
    if (d.zone === 'road' && !(interior || (ti === T.GATE && gateOpen(state, i)))) {
      return ti === T.GATE ? 'A road can pass a gate only when the chambers on both sides are open.' : c ? `${c.name} is not pressurised yet.` : 'Roads run on open chamber floors and through gates.';
    }
    if (d.zone === 'wall') {
      const behind = state.chambers.filter((k) => k.breaches.includes(i));
      if (!behind.some((k) => k.status !== 'sealed' && k.status !== 'surveying')) return 'Survey the chamber behind this breach first.';
    }
    if (occ[i] && occ[i] !== opts.ignore) return 'Something is already built there.';
  }
  if (d.adj) {
    const want = TKEY[d.adj];
    let found = false;
    for (let k = 0; k < d.size && !found; k++) for (const [ax, ay] of [[x + k, y - 1], [x + k, y + d.size], [x - 1, y + k], [x + d.size, y + k]]) {
      if (ax >= 0 && ay >= 0 && ax < w && ay < h && t[ay * w + ax] === want) { found = true; break; }
    }
    if (!found) return `A ${d.name} must stand beside the ${TERRAIN[want].name.toLowerCase()}.`;
  }
  if (!opts.free) return afford(state, d.cost, key);
  return null;
}
// Why a locked building is locked: a version 2 building waits on its tech, the rest on 80 colonists.
const lockedWhy = (d) => (d.tech && TECH[d.tech] ? `Research ${TECH[d.tech].name}.` : `The ${d.name} unlocks at ${d.unlock?.pop ?? 80} colonists.`);
// A cost as this colony pays it: scaled by difficulty (js/colony/difficulty.js) and, given the
// building's key, by finished techs' cost effects (Better Seals); rounded up.
export function costOf(state, cost, key) {
  const m = diffOf(state).cost * (key ? techEffect(state, 'cost', key) : 1);
  return { credits: Math.ceil((cost.credits || 0) * m), parts: Math.ceil((cost.parts || 0) * m) };
}
function afford(state, raw, key) {
  const cost = costOf(state, raw, key);
  if (state.stock.credits < cost.credits) return `Needs ${Math.ceil(cost.credits - state.stock.credits)} more credits.`;
  if (state.stock.parts < (cost.parts || 0)) return `Needs ${Math.ceil(cost.parts - state.stock.parts)} more parts.`;
  return null;
}
const pay = (state, raw, key) => { const cost = costOf(state, raw, key); state.stock.credits -= cost.credits; state.stock.parts -= cost.parts; };

// Best free spot for `key` (lowest score) in a box of tiles; null if none. For setup and bots.
export function findSpot(state, key, { box, score = () => 0, free = false } = {}) {
  const occ = occupancy(state), reach = reachTest(reachSources(state)), d = BUILDING[key], on = d && onSet(d), { w, t } = state.map;
  const b = box || { x0: 0, y0: 0, x1: state.map.w - 1, y1: state.map.h - 1 };
  let best = null;
  for (let y = Math.max(0, b.y0); y <= Math.min(state.map.h - 1, b.y1); y++) for (let x = Math.max(0, b.x0); x <= Math.min(w - 1, b.x1); x++) {
    if (!on?.has(t[y * w + x]) || occ[y * w + x] || placeCheck(state, key, x, y, { occ, reach, free: true })) continue;
    const s = score(x, y);
    if (s !== null && (!best || s < best.s)) best = { x, y, s };
  }
  if (best && !free && afford(state, BUILDING[key].cost, key)) return null;
  return best && { x: best.x, y: best.y };
}

// ---------------------------------------------------------------- actions

export const canBuild = (state, key, x, y) => placeCheck(state, key, x, y);

// A gate a road may cross: every chamber beside it is open.
export function gateOpen(state, i) {
  const { w, ch } = state.map;
  const near = [ch[i - 1], ch[i + 1], ch[i - w], ch[i + w]].filter((c) => c !== 255);
  return near.length >= 2 && near.every((c) => chamberOf(state, c)?.status === OPEN);
}

// The tiles of an L-shaped road from (x0, y0) to (x1, y1): along x first, then along y.
export function roadLine(x0, y0, x1, y1) {
  const out = [], sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
  for (let x = x0; ; x += sx) { out.push([x, y0]); if (x === x1) break; }
  if (sy) for (let y = y0 + sy; ; y += sy) { out.push([x1, y]); if (y === y1) break; }
  return out;
}

// What a road line would do: [{ x, y, why }] (why null = buildable, 'have' = already a road).
export function planRoad(state, x0, y0, x1, y1) {
  const occ = occupancy(state), roads = new Set(state.buildings.filter((b) => b.key === 'road').map((b) => b.y * state.map.w + b.x));
  return roadLine(x0, y0, x1, y1).map(([x, y]) => ({ x, y, why: roads.has(y * state.map.w + x) ? 'have' : placeCheck(state, 'road', x, y, { occ, free: true }) }));
}

// Build every buildable tile of a road line that the colony can pay for; skips the rest.
export function buildRoad(state, x0, y0, x1, y1) {
  const plan = planRoad(state, x0, y0, x1, y1), d = BUILDING.road;
  let built = 0, skipped = 0, firstWhy = null;
  for (const p of plan) {
    if (p.why === 'have') continue;
    if (p.why || afford(state, d.cost)) { skipped++; firstWhy ??= p.why || afford(state, d.cost); continue; }
    pay(state, d.cost);
    state.buildings.push({ id: state.nextId++, key: 'road', x: p.x, y: p.y, level: 1, mode: null, build: 0, off: false });
    built++;
  }
  if (!built) return no(firstWhy || 'That road is already built.');
  log(state, `${built} tiles of road laid.`);
  return ok(`${built} tiles of road laid${skipped ? `; ${skipped} skipped (${firstWhy})` : ''}.`, { built, skipped });
}

export function build(state, key, x, y) {
  const why = canBuild(state, key, x, y);
  if (why) return no(why);
  const d = BUILDING[key];
  pay(state, d.cost, key);
  const b = { id: state.nextId++, key, x, y, level: 1, mode: d.modes ? d.modes[0].key : null, build: d.days, off: false };
  if (key === 'tailings') b.fill = 0;
  state.buildings.push(b);
  log(state, `${d.name} ordered.`);
  return ok(`${d.name} placed: ${d.days} days of work for a crew.`, { id: b.id });
}

const spent = (b) => {
  const d = BUILDING[b.key], c = { credits: d.cost.credits, parts: d.cost.parts || 0 };
  for (let l = 1; l < b.level; l++) { const u = d.levels?.[l]?.cost; if (u) { c.credits += u.credits; c.parts += u.parts || 0; } }
  return c;
};
function holdsAir(state, b) {
  if (b.key !== 'seal') return null;
  const i = idx(state, b.x, b.y), c = state.chambers.find((k) => k.breaches.includes(i) && (k.status === OPEN || k.status === 'pressurising'));
  return c ? `This seal holds ${c.name}'s air: removing it would vent the chamber.` : null;
}

export function demolish(state, id) {
  const b = byId(state, id);
  if (!b) return no('That building is gone.');
  const d = BUILDING[b.key];
  if (d.fixed) return no(`The ${d.name} cannot be demolished.`);
  const air = holdsAir(state, b);
  if (air) return no(air);
  const c = costOf(state, spent(b), b.key), back = { credits: Math.floor(c.credits / 2), parts: Math.floor(c.parts / 2) };
  state.buildings.splice(state.buildings.indexOf(b), 1);
  state.stock.credits += back.credits; state.stock.parts += back.parts;
  log(state, `${d.name} demolished.`);
  return ok(`${d.name} demolished: ${back.credits} credits and ${back.parts} parts recovered.`);
}

export function move(state, id, x, y) {
  const b = byId(state, id);
  if (!b) return no('That building is gone.');
  const d = BUILDING[b.key];
  if (d.fixed) return no(`The ${d.name} cannot be moved.`);
  if (b.key === 'seal') return no('A seal belongs to its breach: demolish it and build another instead.');
  if (b.x === x && b.y === y) return no('It already stands there.');
  const why = placeCheck(state, b.key, x, y, { ignore: b.id, free: true });
  if (why) return no(why);
  const fee = { credits: Math.ceil(d.cost.credits * MOVE_FEE), parts: Math.ceil((d.cost.parts || 0) * MOVE_FEE) };
  const poor = afford(state, fee, b.key);
  if (poor) return no(`Moving costs ${fee.credits} credits and ${fee.parts} parts. ${poor}`);
  pay(state, fee, b.key);
  b.x = x; b.y = y;
  return ok(`${d.name} moved for ${fee.credits} credits and ${fee.parts} parts.`);
}

export function setMode(state, id, mode) {
  const b = byId(state, id);
  if (!b) return no('That building is gone.');
  const d = BUILDING[b.key], m = d.modes?.find((k) => k.key === mode);
  if (!d.modes) return no(`A ${d.name} has only one way of working.`);
  if (!m) return no(`A ${d.name} has no such mode.`);
  if (b.mode === mode) return ok(`It is already set to ${m.name.toLowerCase()}.`);
  b.mode = mode;
  if (b.key === 'farm') b.fallow = 0;
  return ok(`${d.name} set to ${m.name.toLowerCase()}.`);
}

export function upgrade(state, id) {
  const b = byId(state, id);
  if (!b) return no('That building is gone.');
  const d = BUILDING[b.key], next = d.levels?.[b.level];
  if (!d.levels) return no(`A ${d.name} has no upgrades.`);
  if (!next) return no(`This ${d.name} is at its top level.`);
  if (!next.cost) return no(`${d.name}s grow by themselves when their needs are met: see the panel for what is missing.`);
  if (b.build > 0) return no('Finish building it first.');
  const poor = afford(state, next.cost, b.key);
  if (poor) return no(poor);
  pay(state, next.cost, b.key);
  b.level++;
  b.build = Math.max(1, Math.ceil(d.days / 2));
  log(state, `${d.name} upgrade to level ${b.level} ordered.`);
  return ok(`${d.name} upgrading to level ${b.level}: ${b.build} days of work for a crew.`);
}

export function toggle(state, id) {
  const b = byId(state, id);
  if (!b) return no('That building is gone.');
  const d = BUILDING[b.key];
  if (d.fixed) return no(`The ${d.name} cannot be switched off.`);
  if (b.key === 'seal') return no('A seal has nothing to switch off.');
  b.off = !b.off;
  return ok(`${d.name} switched ${b.off ? 'off: it draws no power and employs nobody' : 'back on'}.`);
}

export function buildable(state) {
  return BUILDINGS.filter((d) => !d.fixed).map((d) => {
    const unlocked = state.unlocked.includes(d.key);
    const why = unlocked ? afford(state, d.cost, d.key) : d.tech && TECH[d.tech] ? `Research ${TECH[d.tech].name}.` : `Unlocks at ${d.unlock?.pop ?? 80} colonists.`;
    return { key: d.key, name: d.name, cat: d.cat, cost: costOf(state, d.cost, d.key), unlocked, why };
  });
}

// Air it takes to pressurise a chamber (scaled with the difficulty's needs and Better Seals).
export const pressuriseAir = (state, c) => Math.ceil(c.tiles * PRESSURISE.airPerTile * diffOf(state).need * techEffect(state, 'pressurise'));

// A finished Survey Drone Bay whose radius (Chebyshev, from its centre) holds the chamber's whole box.
export function droneReach(state, c) {
  return state.buildings.some((b) => b.key === 'dronebay' && active(b) && [[c.x0, c.y0], [c.x1, c.y0], [c.x0, c.y1], [c.x1, c.y1]].every(([x, y]) => cheb(x, y, centre(b)) <= spec(b).radius));
}
// What a survey costs and takes now: { credits, days } (Survey Drones halve the cost, one day).
export function surveyCost(state) {
  const e = techEffect(state, 'survey');
  return { credits: costOf(state, { credits: SURVEY.credits * e.mult }).credits, days: e.days };
}

export function chamberAction(state, chamberId, action) {
  const c = chamberOf(state, chamberId);
  if (!c) return no('There is no such chamber.');
  if (action === 'survey') {
    if (c.status !== 'sealed') return no(`${c.name} has already been surveyed.`);
    if (!touchesOpen(state, c) && !droneReach(state, c)) return no(`${c.name} does not touch an open chamber: open a neighbour first${state.buildings.some((b) => b.key === 'dronebay') ? ', or bring a Survey Drone Bay within 40 tiles' : ''}.`);
    const { credits: fee, days } = surveyCost(state);
    if (state.stock.credits < fee) return no(`A survey costs ${fee} credits.`);
    state.stock.credits -= fee;
    c.status = 'surveying'; c.work = days;
    log(state, `Surveyors sent into ${c.name}.`);
    return ok(`Surveying ${c.name}: ${days} day${days === 1 ? '' : 's'}.`);
  }
  if (action === 'pressurise') {
    if (c.status === OPEN || c.status === 'pressurising') return no(`${c.name} is already ${c.status === OPEN ? 'open' : 'being pressurised'}.`);
    if (c.status !== 'surveyed') return no(`Survey ${c.name} first.`);
    const left = openBreaches(state, c).length;
    if (left) return no(`${left} breach${left > 1 ? 'es' : ''} still open: build a Bulkhead Seal on each.`);
    const air = pressuriseAir(state, c), cap = storageCaps(state).air || 0;
    if (air > cap) return no(`Pressurising ${c.name} takes ${air} air, more than your stores hold (${Math.floor(cap)}): build a Storage Depot and set it to Air.`);
    if (state.stock.air < air) return no(`Pressurising ${c.name} takes ${air} air; there is ${Math.floor(state.stock.air)}. Air Plants fill the stores.`);
    state.stock.air -= air;
    c.status = 'pressurising'; c.work = PRESSURISE.days;
    log(state, `Pressurising ${c.name}.`);
    return ok(`Pressurising ${c.name}: ${air} air, ${PRESSURISE.days} days.`);
  }
  return no('Chambers can be surveyed or pressurised.');
}

// Order a Tailings Dump emptied: 50 credits, fill back to 0.
export function emptyTailings(state, id) {
  const b = byId(state, id);
  if (!b || b.key !== 'tailings') return no('That is not a Tailings Dump.');
  if (b.build > 0) return no('Finish building it first.');
  if (!(b.fill > 0)) return no('The dump is already empty.');
  const fee = EMPTY_TAILINGS.credits;
  if (state.stock.credits < fee) return no(`Emptying the dump costs ${fee} credits.`);
  state.stock.credits -= fee;
  b.fill = 0;
  log(state, 'A Tailings Dump was emptied.');
  return ok(`Tailings Dump emptied for ${fee} credits.`);
}

// ---------------------------------------------------------------- market and money

export const price = (state, good) => (BASE_PRICE[good] || 0) * (state.market[good] ?? 1);
const hasDock = (state) => docks(state).length > 0;

// Each lot of 10 sold pushes that price down 2% (continuously, unit by unit), never below a floor.
export function sell(state, good, qty) {
  if (!(good in BASE_PRICE)) return no('Nobody buys that.');
  qty = Math.floor(qty);
  if (!(qty > 0)) return no('Choose how much to sell.');
  if (!hasDock(state)) return no('Traders call only at a finished dock.');
  if ((state.stock[good] || 0) < qty) return no(`There are only ${Math.floor(state.stock[good] || 0)} ${good} in store.`);
  const step = Math.pow(1 - PRICE.drop, 1 / PRICE.lot);
  let f = state.market[good] ?? 1, gain = 0;
  for (let k = 0; k < qty; k++) { gain += BASE_PRICE[good] * f; f = Math.max(PRICE.floor, f * step); }
  gain = Math.floor(gain);
  state.stock[good] -= qty; state.stock.credits += gain; state.market[good] = f;
  state.flags.sold = (state.flags.sold || 0) + gain;
  return ok(`Sold ${qty} ${good} for ${gain} credits.`, { credits: gain });
}

export function sellGuardian(state, id) {
  const i = state.guardians.findIndex((g) => g.id === id);
  if (i < 0) return no('That machine is not in the guard.');
  if (!hasDock(state)) return no('Machines are sold at a finished dock.');
  const g = state.guardians[i], p = state.imported?.prices?.[g.type] ?? 24;
  state.guardians.splice(i, 1);
  state.stock.credits += p * 10; state.stock.parts += p;
  log(state, `A guardian machine was sold for ${p * 10} credits and ${p} parts.`);
  return ok(`Sold for ${p * 10} credits and ${p} parts.`);
}

export function setTax(state, rate) {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return no('The tax rate must be a number.');
  state.tax = Math.round(Math.min(TAX_MAX, Math.max(0, rate)) * 100) / 100;
  return ok(`Tax set to ${Math.round(state.tax * 100)}%.`);
}

export function answer(state, pendingId, choiceKey) {
  const i = state.pending.findIndex((p) => p.id === pendingId);
  if (i < 0) return no('That question has already been answered.');
  const p = state.pending[i];
  const c = p.choices.find((k) => k.key === choiceKey);
  if (!c) return no('That is not one of the choices.');
  state.pending.splice(i, 1);
  return ok(`${p.title}: ${c.label}.`);
}

// ---------------------------------------------------------------- read-outs

// A level whose needs name a building the game doesn't have (none since version 2) is not offered.
export const habitatLevelReachable = (level) => !level?.needs?.some((n) => !['allNeeds', 'park'].includes(n) && !BUILDING[n]);

// What a habitat needs for its next level: [{ need, label, met }] (Caesar III's panel, rule 10).
export function habitatNeeds(state, b, field) {
  const d = BUILDING[b.key], next = d.levels?.[b.level];
  if (!next?.needs || !habitatLevelReachable(next)) return [];
  const met = state.stats?.last?.met || {};
  const out = [];
  for (const n of next.needs) {
    if (n === 'allNeeds') {
      for (const g of ['food', 'water', 'air', 'power']) out.push({ need: g, label: `Enough ${g} for every colonist`, met: !!met[g] });
    } else if (n === 'park') out.push({ need: 'park', label: 'A park or grove in reach', met: parkAt(state, b, field) > 0 });
    else if (n === 'clinic') out.push({ need: 'clinic', label: 'A Clinic in reach', met: serviceAt(state, b, 'clinic') > 0 });
    else out.push({ need: n, label: n, met: false });
  }
  return out;
}

// Services (version 2): a service building covers a home when the home's centre lies within its
// radius (Chebyshev, from the service's centre). serviceAt: the best `service` value of that
// building kind covering the home (Clinic triage halves it; a Canteen on rationing gives none).
export const SERVICE_KINDS = [{ key: 'clinic', label: 'Clinic' }, { key: 'canteen', label: 'Canteen' }, { key: 'safetypost', label: 'Safety' }];
export function serviceValue(b) {
  const s = spec(b);
  if (!s.service || !active(b)) return 0;
  if (b.key === 'clinic' && b.mode === 'triage') return s.service / 2;
  if (b.key === 'canteen' && b.mode === 'ration') return 0;
  return s.service;
}
export const covers = (svc, b) => { const c = centre(b); return cheb(c.x - 0.5, c.y - 0.5, centre(svc)) <= spec(svc).radius; };
export function serviceAt(state, home, key, list = state.buildings) {
  let best = 0;
  for (const s of list) if (s.key === key && active(s) && covers(s, home)) best = Math.max(best, serviceValue(s));
  return best;
}

export function tileInfo(state, x, y) {
  const { w, h, t, r, ch } = state.map;
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const i = y * w + x, c = chamberOf(state, ch[i]);
  const hidden = c && (c.status === 'sealed' || c.status === 'surveying');
  const b = state.buildings.find((k) => { const s = BUILDING[k.key].size; return x >= k.x && y >= k.y && x < k.x + s && y < k.y + s; }) || null;
  return {
    terrain: TERRAIN[t[i]], artifact: hidden ? ARTIFACT[R.NONE] : ARTIFACT[r[i]], salvage: state.map.sv[i],
    chamber: c, building: b, reach: spaceLike(t[i]) && inReach(state, x, y),
    coverage: { park: parkField(state)[i] },
  };
}

export function summary(state) {
  const cap = storageCaps(state), last = state.stats?.last || {}, pr = last.produced || {}, co = last.consumed || {};
  const stock = {};
  for (const g of GOODS) stock[g] = { have: state.stock[g], cap: g === 'credits' ? null : cap[g], delta: (pr[g] || 0) - (co[g] || 0) };
  const p = powerOf(state), jobs = jobsOf(state);
  return {
    stock, power: { supply: p.supply, demand: p.demand, battery: state.battery, cap: cap.power },
    pop: state.pop, housing: housingOf(state), jobs, workers: Math.min(state.pop, jobs),
    happy: state.happy, happyParts: state.happyParts, nextArrival: diffOf(state).transportEvery - (state.day % diffOf(state).transportEvery),
    research: { perDay: last.research || 0, focus: state.research?.focus ?? null, banked: state.research?.points || 0 },
  };
}

// Per-tile overlay values: 'park' (rating), 'reach' (1 = space buildable), 'power' (supply
// fraction of each building's tiles), 'happiness' (0..1 over open floor).
export function coverage(state, kind) {
  const { w, h, t, ch } = state.map, n = w * h, out = new Float32Array(n);
  if (kind === 'park') return parkField(state);
  if (kind === 'reach') {
    const reach = reachTest(reachSources(state));
    for (let i = 0; i < n; i++) if (spaceLike(t[i]) && reach(i % w, (i / w) | 0)) out[i] = 1;
    return out;
  }
  if (kind === 'power') {
    const pf = state.stats?.last?.power?.factor ?? 1;
    for (const b of state.buildings) {
      const s = spec(b);
      if (!s.power) continue;
      for (const i of tilesOf(state, b)) out[i] = !active(b) ? 0 : s.power > 0 ? 1 : pf;
    }
    return out;
  }
  if (kind === 'happiness') {
    const field = parkField(state);
    for (let i = 0; i < n; i++) if (ch[i] !== 255 && chamberOf(state, ch[i])?.status === OPEN) out[i] = Math.min(1, (state.happy + field[i]) / 100);
    return out;
  }
  return out;
}
