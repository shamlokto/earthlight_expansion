// Earthlight Space Colony Rebuild: the player's actions and the read-outs of a colony state
// (docs/COLONY-V1.md "rules.js"). Pure: no DOM, no randomness. Every action returns { ok, msg }
// with a sentence a player can read; refusals say what to do about it.
import { T, R, TERRAIN, ARTIFACT, zoneOf } from './data/terrain.js';
import { BUILDING, BUILDINGS, BASE_PRICE, DOCK_REACH, NEEDS } from './data/buildings.js';

export const STORED = ['food', 'water', 'air', 'parts', 'ore'];
export const GOODS = [...STORED, 'credits'];
export const SURVEY = { credits: 100, days: 2 };
export const PRESSURISE = { days: 5, airPerTile: 1 / 4 };
export const MOVE_FEE = 0.2;
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
export const active = (b) => b.build === 0 && !b.off;
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
  const cap = { food: 0, water: 0, air: 0, parts: 0, ore: 0, power: 0 };
  for (const b of state.buildings) {
    if (!finished(b)) continue;
    const s = spec(b);
    if (!s.storage) continue;
    if (b.key === 'depot') cap[b.mode || 'food'] += Object.values(s.storage)[0];
    else for (const [g, n] of Object.entries(s.storage)) cap[g] += n;
  }
  return cap;
}
export const housingOf = (state) => state.buildings.reduce((t, b) => t + (active(b) ? spec(b).housing || 0 : 0), 0);
export const jobsOf = (state) => state.buildings.reduce((t, b) => t + (active(b) ? spec(b).jobs || 0 : 0), 0);
export const staffingOf = (state) => { const j = jobsOf(state); return j ? Math.min(1, state.pop / j) : 1; };
// Construction crews: the Command Centre's own plus each working Repair Yard's.
export const crewsOf = (state) => 1 + state.buildings.reduce((t, b) => t + (b.key === 'repairyard' && active(b) ? spec(b).crews || 1 : 0), 0);

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
const reachTest = (cs) => (x, y) => cs.some((c) => Math.max(Math.abs(x + 0.5 - c.x), Math.abs(y + 0.5 - c.y)) <= REACH);
// Space buildability: the tile's centre within DOCK_REACH (Chebyshev) of a finished dock's centre.
export const inReach = (state, x, y) => reachTest(docks(state).map(centre))(x, y);

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
  if (!state.unlocked.includes(key)) return `The ${d.name} unlocks at ${d.unlock?.pop ?? 80} colonists.`;
  const { w, h, t, ch } = state.map;
  if (x < 0 || y < 0 || x + d.size > w || y + d.size > h) return 'That is off the edge of the map.';
  const on = onSet(d), reach = opts.reach || reachTest(docks(state).map(centre));
  const occ = opts.occ || occupancy(state, opts.ignore ?? -1);
  for (let dy = 0; dy < d.size; dy++) for (let dx = 0; dx < d.size; dx++) {
    const i = (y + dy) * w + x + dx, ti = t[i];
    if (!on.has(ti)) return `A ${d.name} stands only on ${names(d.on)}, not on ${TERRAIN[ti].name.toLowerCase()}.`;
    const c = chamberOf(state, ch[i]);
    const interior = !!c && c.status === OPEN, space = zoneOf(ti) === 'space', near = space && reach(x + dx, y + dy);
    if (d.zone === 'interior' && !interior) return c ? `${c.name} is not pressurised yet: survey, seal and pressurise it first.` : `A ${d.name} must stand inside an open chamber.`;
    if (d.zone === 'space' && !near) return space ? `That is beyond the dock's reach (${DOCK_REACH} tiles): build closer to a dock.` : `A ${d.name} must stand in space near a dock.`;
    if (d.zone === 'hull' && ti !== T.HULL) return `A ${d.name} must stand on the hull.`;
    if (d.zone === 'any' && !(interior || near || ti === T.HULL)) {
      return space ? `That is beyond the dock's reach (${DOCK_REACH} tiles): build closer to a dock.` : c ? `${c.name} is not pressurised yet.` : `A ${d.name} cannot stand here.`;
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
  if (!opts.free) return afford(state, d.cost);
  return null;
}
function afford(state, cost) {
  if (state.stock.credits < cost.credits) return `Needs ${Math.ceil(cost.credits - state.stock.credits)} more credits.`;
  if (state.stock.parts < (cost.parts || 0)) return `Needs ${Math.ceil(cost.parts - state.stock.parts)} more parts.`;
  return null;
}
const pay = (state, cost) => { state.stock.credits -= cost.credits; state.stock.parts -= cost.parts || 0; };

// Best free spot for `key` (lowest score) in a box of tiles; null if none. For setup and bots.
export function findSpot(state, key, { box, score = () => 0, free = false } = {}) {
  const occ = occupancy(state), reach = reachTest(docks(state).map(centre)), d = BUILDING[key], on = d && onSet(d), { w, t } = state.map;
  const b = box || { x0: 0, y0: 0, x1: state.map.w - 1, y1: state.map.h - 1 };
  let best = null;
  for (let y = Math.max(0, b.y0); y <= Math.min(state.map.h - 1, b.y1); y++) for (let x = Math.max(0, b.x0); x <= Math.min(w - 1, b.x1); x++) {
    if (!on?.has(t[y * w + x]) || occ[y * w + x] || placeCheck(state, key, x, y, { occ, reach, free: true })) continue;
    const s = score(x, y);
    if (s !== null && (!best || s < best.s)) best = { x, y, s };
  }
  if (best && !free && afford(state, BUILDING[key].cost)) return null;
  return best && { x: best.x, y: best.y };
}

// ---------------------------------------------------------------- actions

export const canBuild = (state, key, x, y) => placeCheck(state, key, x, y);

export function build(state, key, x, y) {
  const why = canBuild(state, key, x, y);
  if (why) return no(why);
  const d = BUILDING[key];
  pay(state, d.cost);
  const b = { id: state.nextId++, key, x, y, level: 1, mode: d.modes ? d.modes[0].key : null, build: d.days, off: false };
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
  const c = spent(b), back = { credits: Math.floor(c.credits / 2), parts: Math.floor(c.parts / 2) };
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
  const poor = afford(state, fee);
  if (poor) return no(`Moving costs ${fee.credits} credits and ${fee.parts} parts. ${poor}`);
  pay(state, fee);
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
  const poor = afford(state, next.cost);
  if (poor) return no(poor);
  pay(state, next.cost);
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
    return { key: d.key, name: d.name, cat: d.cat, cost: { ...d.cost }, unlocked, why: unlocked ? afford(state, d.cost) : `Unlocks at ${d.unlock?.pop ?? 80} colonists.` };
  });
}

export function chamberAction(state, chamberId, action) {
  const c = chamberOf(state, chamberId);
  if (!c) return no('There is no such chamber.');
  if (action === 'survey') {
    if (c.status !== 'sealed') return no(`${c.name} has already been surveyed.`);
    if (!touchesOpen(state, c)) return no(`${c.name} does not touch an open chamber: open a neighbour first.`);
    if (state.stock.credits < SURVEY.credits) return no(`A survey costs ${SURVEY.credits} credits.`);
    state.stock.credits -= SURVEY.credits;
    c.status = 'surveying'; c.work = SURVEY.days;
    log(state, `Surveyors sent into ${c.name}.`);
    return ok(`Surveying ${c.name}: ${SURVEY.days} days.`);
  }
  if (action === 'pressurise') {
    if (c.status === OPEN || c.status === 'pressurising') return no(`${c.name} is already ${c.status === OPEN ? 'open' : 'being pressurised'}.`);
    if (c.status !== 'surveyed') return no(`Survey ${c.name} first.`);
    const left = openBreaches(state, c).length;
    if (left) return no(`${left} breach${left > 1 ? 'es' : ''} still open: build a Bulkhead Seal on each.`);
    const air = Math.ceil(c.tiles * PRESSURISE.airPerTile);
    if (state.stock.air < air) return no(`Pressurising ${c.name} takes ${air} air; there is ${Math.floor(state.stock.air)}.`);
    state.stock.air -= air;
    c.status = 'pressurising'; c.work = PRESSURISE.days;
    log(state, `Pressurising ${c.name}.`);
    return ok(`Pressurising ${c.name}: ${air} air, ${PRESSURISE.days} days.`);
  }
  return no('Chambers can be surveyed or pressurised.');
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
  if (state.stock[good] < qty) return no(`There are only ${Math.floor(state.stock[good])} ${good} in store.`);
  const step = Math.pow(1 - PRICE.drop, 1 / PRICE.lot);
  let f = state.market[good], gain = 0;
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

// What a habitat needs for its next level: [{ need, label, met }] (Caesar III's panel, rule 10).
export function habitatNeeds(state, b, field) {
  const d = BUILDING[b.key], next = d.levels?.[b.level];
  if (!next?.needs) return [];
  const met = state.stats?.last?.met || {};
  const out = [];
  for (const n of next.needs) {
    if (n === 'allNeeds') {
      for (const g of ['food', 'water', 'air', 'power']) out.push({ need: g, label: `Enough ${g} for every colonist`, met: !!met[g] });
    } else if (n === 'park') out.push({ need: 'park', label: 'A park or grove in reach', met: parkAt(state, b, field) > 0 });
    else if (n === 'clinic') out.push({ need: 'clinic', label: 'A clinic in reach (coming in a later version)', met: false });
    else out.push({ need: n, label: n, met: false });
  }
  return out;
}

export function tileInfo(state, x, y) {
  const { w, h, t, r, ch } = state.map;
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const i = y * w + x, c = chamberOf(state, ch[i]);
  const hidden = c && (c.status === 'sealed' || c.status === 'surveying');
  const b = state.buildings.find((k) => { const s = BUILDING[k.key].size; return x >= k.x && y >= k.y && x < k.x + s && y < k.y + s; }) || null;
  return {
    terrain: TERRAIN[t[i]], artifact: hidden ? ARTIFACT[R.NONE] : ARTIFACT[r[i]], salvage: state.map.sv[i],
    chamber: c, building: b, reach: zoneOf(t[i]) === 'space' && inReach(state, x, y),
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
    happy: state.happy, happyParts: state.happyParts, nextArrival: 10 - (state.day % 10),
  };
}

// Per-tile overlay values: 'park' (rating), 'reach' (1 = space buildable), 'power' (supply
// fraction of each building's tiles), 'happiness' (0..1 over open floor).
export function coverage(state, kind) {
  const { w, h, t, ch } = state.map, n = w * h, out = new Float32Array(n);
  if (kind === 'park') return parkField(state);
  if (kind === 'reach') {
    const reach = reachTest(docks(state).map(centre));
    for (let i = 0; i < n; i++) if (zoneOf(t[i]) === 'space' && reach(i % w, (i / w) | 0)) out[i] = 1;
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
