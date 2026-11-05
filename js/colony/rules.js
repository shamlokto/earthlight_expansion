// Earthlight Space Colony Rebuild: the player's actions and the read-outs of a colony state
// (docs/COLONY-V1.md "rules.js"). Pure: no DOM, no randomness. Every action returns { ok, msg }
// with a sentence a player can read; refusals say what to do about it.
import { T, R, TERRAIN, ARTIFACT, zoneOf } from './data/terrain.js';
import { diffOf } from './difficulty.js';
import { BUILDING, BUILDINGS, BASE_PRICE, DOCK_REACH, NEEDS } from './data/buildings.js';
import { TECH, TECHS } from './data/tech.js';
import { MACHINES, MACHINE, MACHINE_COST } from './data/machines.js';
import {
  COMMANDER, GENERAL, STARTERS, WANDERERS, GRADE, GENERAL_POWER, GENERAL_EVASION, DEPARTMENTS, BASE_COMMANDERS, PER_QUARTERS,
} from './data/commanders.js';
import { generateDecks, DECKS, DECK_NAME } from './decks.js';
import { SURVIVOR_COMMANDERS } from './data/secrets.js';
import { ensureSecrets, dangerBlocks, floodedHere } from './secrets.js';
export { DECKS, DECK_NAME };
// version 4, stage 2: the secrets (js/colony/secrets.js), re-exported so the interface needs only rules.js
export {
  placeSecrets, ensureSecrets, readLog, clearDanger, dangerPreview, openVault, vaultNeeds, secretStatus, dangerIn, sitesIn,
  dangerBlocks, floodedHere, marshLeft, secretsOf, SECRET, KEY_LOGS,
} from './secrets.js';
// version 4, stage 3: fleet expeditions on the sector map (js/colony/expeditions.js), re-exported likewise
import { ensureExpeditions, densCleared, EXP } from './expeditions.js';
export {
  ensureExpeditions, launchExpedition, expeditionPreview, recallExpedition, expeditionStatus, makeSectors, sectorOf, densCleared,
  lootPlan, lootText, siteName, travelDays, strengthOf, isAway, SITES, HAZARD, EXP,
} from './expeditions.js';
// version 4, stage 4: relief convoys to Earth and the win, Eden Restored (js/colony/victory.js), re-exported likewise
export {
  RELIEF, POP_TARGET, CONVOY_GOODS, sendConvoy, convoyWhy, convoyStatus, convoyCost, convoyPay, reliefStation,
  victoryStatus, victoryText, quotaOf, popTargetOf, ensureRelief, ENDING, EPILOGUE,
  HAPPY_TARGET, massDrivers, convoyLoad, autoConvoyGood,   // version 6 (docs/COLONY-V6.md)
} from './victory.js';
// The survivors' two commanders (Warden Marrow, Tobias Venn) are commanders like any other once they join.
for (const c of SURVIVOR_COMMANDERS) COMMANDER[c.key] ??= { portrait: `portrait/${c.key}`, ...c, survivor: true };

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
  // a colony that passed 80 colonists before the lab existed still gets it (and, since version 3,
  // the Arsenal, Barracks, Scrapyard and Battery Emplacement)
  if (state.flags?.unlock80) for (const d of BUILDINGS) if (d.unlock && d.unlock.pop <= 80 && !state.unlocked.includes(d.key)) state.unlocked.push(d.key);
  // version 3 (docs/COLONY-V3.md): guardians with HP, crews and free days; production; commanders;
  // wanderers; the raid clock. Beta guardians of an older save gain full HP and 60 free days (D7).
  state.guardians ??= [];
  for (const g of state.guardians) {
    if (g.hp === undefined) { g.hp = machineOf(state, g.type).hp; g.free ??= V3.betaFree; }
    g.level ??= 0; g.commander ??= null; g.free ??= 0;
  }
  state.production ??= [];
  state.commanders ??= [{ key: GENERAL.key, loyalty: 100, injured: 0, dept: null }, ...STARTERS.map((c) => ({ key: c.key, loyalty: V3.starterLoyalty, injured: 0, dept: null }))];
  state.wanderers ??= [];
  state.raid ??= {};
  const rd = state.raid;
  rd.heat ??= 0; rd.next ??= null; rd.warned ??= false; rd.coming ??= null; rd.last ??= null;
  rd.count ??= 0; rd.won ??= 0; rd.lost ??= 0; rd.paid ??= 0; rd.moods ??= []; rd.sales ??= [];
  // version 4 (docs/COLONY-V4.md): the upper and lower decks, generated from the seed for a colony
  // saved without them; the deck buildings (no tech, no milestone) are on the menu from the start
  ensureDecks(state);
  ensureSecrets(state);   // stage 2: the secrets, placed from the seed once the decks exist
  ensureExpeditions(state);   // stage 3: the sector map, from the seed
  ensureBases(state);   // version 5: the raiders' bases on the sector map
  state.options ??= {};
  if (state.unlocked) for (const d of BUILDINGS) if (d.decks && !d.tech && !d.unlock && !d.fixed && !state.unlocked.includes(d.key)) state.unlocked.push(d.key);
  return state;
}

// ---------------------------------------------------------------- decks (version 4)

// A building's or chamber's deck: 'upper' | 'main' | 'lower' (absent = main).
export const deckOf = (o) => o?.deck || 'main';
// The deck's map { w, h, t, r, ch, sv }: the main deck is state.map; null for an unknown deck.
export function mapOf(state, deck = 'main') {
  if (!deck || deck === 'main') return state.map;
  return state.decks?.[deck] || null;
}
// The decks a building may stand on (absent = the main deck only), and why not elsewhere. Roads and
// Bulkhead Seals belong to every deck: chambers up and down are sealed and joined like the main
// deck's (the contract's flow), though the table gives them no `decks`.
// The Shield Pylon stands on any deck since stage 2 (one on a deck halves its radiation work).
const EVERY_DECK = new Set(['road', 'seal', 'shieldpylon']);
export const decksOf = (d) => d?.decks || (EVERY_DECK.has(d?.key) ? DECKS : ['main']);
const deckList = (ds) => ds.join(', ').replace(/, ([^,]+)$/, ' and $1');
export const deckWhy = (d) => { const l = deckList(decksOf(d)); return `${l[0].toUpperCase()}${l.slice(1)} deck${decksOf(d).length > 1 ? 's' : ''} only.`; };
// Generate the upper and lower decks (and stamp the lift shafts into the main map) for a colony that
// has none: a new game right after its Command Centre and dock are placed, or an older save. The
// shafts keep clear of every building already standing. Deterministic from the seed and the map.
export function ensureDecks(state) {
  if (state.decks || !state.map?.t || !Array.isArray(state.chambers) || !Array.isArray(state.buildings)) return;
  const main = state.map, { w, h } = main, occ = occupancy(state), avoid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (occ[i]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = i + dy * w + dx; if (j >= 0 && j < w * h) avoid[j] = 1; }
  const cmd = state.buildings.find((b) => b.key === 'command');
  const mainCh = state.chambers.filter((c) => !c.deck);
  const land = mainCh.find((c) => c.kind === 'landing') || (cmd && chamberOf(state, main.ch[idx(state, cmd.x, cmd.y)])) || mainCh.find((c) => c.status === OPEN);
  const startId = state.chambers.reduce((m, c) => Math.max(m, c.id + 1), 0);
  const g = generateDecks(state.seed, main, mainCh, startId, { avoid, landing: land?.id ?? null, command: cmd ? { x: cmd.x, y: cmd.y } : null });
  state.decks = { upper: g.upper, lower: g.lower, shafts: g.shafts };
  state.chambers.push(...g.chambers);
}
// The lift shafts: [{ x, y, landing? }] (top-left of each 2 × 2 site, the same on every deck).
export const shaftsOf = (state) => state.decks?.shafts || [];
// The finished Lift serving the shaft under tile (x, y), on whichever deck it was built; or null.
export function liftAt(state, x, y) {
  for (const b of state.buildings) if (b.key === 'lift' && finished(b) && x >= b.x && y >= b.y && x < b.x + 2 && y < b.y + 2) return b;
  return null;
}
// Tiles (indices) of every shaft a finished Lift serves: they count as road on every deck.
export function liftTiles(state) {
  const out = new Set();
  for (const b of state.buildings) if (b.key === 'lift' && finished(b)) for (const i of tilesOf(state, b)) out.add(i);
  return out;
}
// Does a finished Lift on another deck pass through this chamber? (The lift's own chamber is open:
// a Lift stands only in an open chamber.)
export function liftReach(state, c) {
  const m = mapOf(state, deckOf(c));
  return !!m && state.buildings.some((b) => b.key === 'lift' && finished(b) && deckOf(b) !== deckOf(c) && m.ch[idx(state, b.x, b.y)] === c.id);
}
// Per deck: { open, total } chambers (the deck switcher).
export function deckSummary(state) {
  const out = {};
  for (const d of DECKS) out[d] = { open: 0, total: 0 };
  for (const c of state.chambers) { const o = out[deckOf(c)]; if (!o) continue; o.total++; if (c.status === OPEN) o.open++; }
  return out;
}

// ---------------------------------------------------------------- research (version 2)

// The product of `mult` over finished techs' effects of this kind (and key, for output, storage
// and cost); 1 when none. 'survey' returns { mult, days } (days: the shortest a tech allows).
// 'machines' (version 3) returns the highest machine tier unlocked: 1 with no tech.
export function techEffect(state, kind, key) {
  if (kind === 'machines') {
    let tier = 1;
    for (const k of state.research?.done || []) for (const e of TECH[k]?.effects || []) if (e.kind === 'machines') tier = Math.max(tier, e.tier);
    return tier;
  }
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
// `down`: days a building is knocked out (a meteoroid strike on a sweeper, a fusion shutdown);
// `damaged`: days of raid damage left (version 3; a crew repairs it like construction).
export const active = (b) => b.build === 0 && !b.off && !(b.down > 0) && !(b.damaged > 0);
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
export function occupancy(state, ignore = -1, deck = 'main') {
  const occ = new Int32Array(state.map.w * state.map.h);
  for (const b of state.buildings) if (b.id !== ignore && deckOf(b) === deck) for (const i of tilesOf(state, b)) occ[i] = b.id;
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
    if (s.power > 0) supply += s.power * (s.jobs ? staffing : 1) * moneyF * (b.key === 'fusion' ? fusionFactor(state, b) : 1);
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

// Chamber id -> Set of chambers across one wall tile (bulkheads, gates, breaches), on every deck
// (each deck's walls join that deck's chambers only; ids are unique across decks). Cached per map.
const linkCache = new WeakMap();
export function chamberLinks(state) {
  const key = state.map.ch;
  const hit = linkCache.get(key);
  if (hit && hit.decks === state.decks && hit.n === state.chambers.length) return hit.links;
  const links = new Map(state.chambers.map((c) => [c.id, new Set()]));
  for (const deck of DECKS) {
    const m = mapOf(state, deck);
    if (!m) continue;
    const { w, h, t, ch } = m;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (ch[i] !== 255 || zoneOf(t[i]) !== 'wall') continue;
      const near = [ch[i - 1], ch[i + 1], ch[i - w], ch[i + w]].filter((c) => c !== 255);
      for (const a of near) for (const b of near) if (a !== b) links.get(a)?.add(b);
    }
  }
  for (const c of state.chambers) for (const i of c.breaches) for (const d of state.chambers) {
    if (d !== c && deckOf(d) === deckOf(c) && d.breaches.includes(i)) links.get(c.id)?.add(d.id);
  }
  linkCache.set(key, { decks: state.decks, n: state.chambers.length, links });
  return links;
}
const sealAt = (state, i, deck = 'main') => state.buildings.some((b) => b.key === 'seal' && finished(b) && deckOf(b) === deck && idx(state, b.x, b.y) === i);
export const openBreaches = (state, c) => c.breaches.filter((i) => !sealAt(state, i, deckOf(c)));
const touchesOpen = (state, c) => [...(chamberLinks(state).get(c.id) || [])].some((id) => chamberOf(state, id)?.status === OPEN);

// Coverage of parks and groves: the best rating reaching each tile. Coverage spreads tile by tile
// (8 directions) through open chambers and gates, never through bulkheads (docs/COLONY.md §10.1).
// Each deck has its own (version 4): coverage stays on its deck.
let seen = new Int32Array(0), stamp = 0;
export function parkField(state, deck = 'main') {
  const { w, h, t, ch } = mapOf(state, deck), n = w * h, field = new Float32Array(n);
  if (seen.length !== n) { seen = new Int32Array(n); stamp = 0; }
  const passable = (i) => t[i] === T.GATE || (ch[i] !== 255 && chamberOf(state, ch[i])?.status === OPEN);
  for (const b of state.buildings) {
    const s = spec(b);
    if (!s.park || !active(b) || deckOf(b) !== deck) continue;
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
export const parkAt = (state, b, field = parkField(state, deckOf(b))) => Math.max(0, ...[...tilesOf(state, b)].map((i) => field[i]));

// ---------------------------------------------------------------- placement

// Why `key` cannot stand at (x, y), or null. opts: { occ, ignore, free (skip the cost), deck }.
export function placeCheck(state, key, x, y, opts = {}) {
  const d = BUILDING[key];
  if (!d) return 'There is no such building.';
  if (d.fixed) return `The ${d.name} cannot be built.`;
  const deck = opts.deck || 'main', m = mapOf(state, deck);
  if (!m) return 'There is no such deck.';
  if (!state.unlocked.includes(key)) return lockedWhy(d);
  if (!decksOf(d).includes(deck)) return `A ${d.name} stands only on the ${deckList(decksOf(d))} deck${decksOf(d).length > 1 ? 's' : ''}.`;
  const { w, h, t, ch } = m;
  if (x < 0 || y < 0 || x + d.size > w || y + d.size > h) return 'That is off the edge of the map.';
  if (key === 'lift') {   // one Lift a shaft serves all three decks
    const other = state.buildings.find((b) => b.key === 'lift' && b.id !== opts.ignore && b.x === x && b.y === y);
    if (other) return `This shaft already has a Lift (on the ${deckOf(other)} deck): one Lift serves all three decks.`;
  }
  const on = onSet(d), reach = opts.reach || reachTest(reachSources(state));
  const occ = opts.occ || occupancy(state, opts.ignore ?? -1, deck);
  for (let dy = 0; dy < d.size; dy++) for (let dx = 0; dx < d.size; dx++) {
    const i = (y + dy) * w + x + dx, ti = t[i];
    if (!on.has(ti)) return `A ${d.name} stands only on ${names(d.on)}, not on ${TERRAIN[ti].name.toLowerCase()}.`;
    const c = chamberOf(state, ch[i]);
    const interior = !!c && c.status === OPEN, space = spaceLike(ti), near = space && reach(x + dx, y + dy);
    // stage 2: a Pump Station may stand in a flooded chamber that is surveyed but not open (crews in suits)
    const pumping = key === 'pumpstation' && !!c && c.status === 'surveyed' && floodedHere(state, c);
    if (d.zone === 'interior' && !interior && !pumping) return c ? `${c.name} is not pressurised yet: survey, seal and pressurise it first.` : `A ${d.name} must stand inside an open chamber.`;
    if (d.zone === 'space' && !near) return space ? `That is beyond reach (${DOCK_REACH} tiles of a dock, 16 of a Tether Mast): build closer.` : `A ${d.name} must stand in space near a dock.`;
    if (d.zone === 'hull' && ti !== T.HULL) return `A ${d.name} must stand on the hull.`;
    if (key === 'obsdeck' && !bottomHull(state, x + dx, y + dy)) return `An ${d.name} must stand on the bottom hull wall, facing Earth.`;
    if (d.zone === 'any' && !(interior || near || ti === T.HULL)) {
      return space ? `That is beyond reach (${DOCK_REACH} tiles of a dock, 16 of a Tether Mast): build closer.` : c ? `${c.name} is not pressurised yet.` : `A ${d.name} cannot stand here.`;
    }
    if (d.zone === 'road' && !(interior || (ti === T.GATE && gateOpen(state, i, deck)))) {
      return ti === T.GATE ? 'A road can pass a gate only when the chambers on both sides are open.' : c ? `${c.name} is not pressurised yet.` : 'Roads run on open chamber floors and through gates.';
    }
    if (d.zone === 'wall') {
      const behind = state.chambers.filter((k) => deckOf(k) === deck && k.breaches.includes(i));
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
export function findSpot(state, key, { box, score = () => 0, free = false, deck = 'main' } = {}) {
  const m = mapOf(state, deck);
  if (!m) return null;
  const occ = occupancy(state, -1, deck), reach = reachTest(reachSources(state)), d = BUILDING[key], on = d && onSet(d), { w, t } = m;
  const b = box || { x0: 0, y0: 0, x1: m.w - 1, y1: m.h - 1 };
  let best = null;
  for (let y = Math.max(0, b.y0); y <= Math.min(m.h - 1, b.y1); y++) for (let x = Math.max(0, b.x0); x <= Math.min(w - 1, b.x1); x++) {
    if (!on?.has(t[y * w + x]) || occ[y * w + x] || placeCheck(state, key, x, y, { occ, reach, free: true, deck })) continue;
    const s = score(x, y);
    if (s !== null && (!best || s < best.s)) best = { x, y, s };
  }
  if (best && !free && afford(state, BUILDING[key].cost, key)) return null;
  return best && { x: best.x, y: best.y };
}

// ---------------------------------------------------------------- actions

export const canBuild = (state, key, x, y, deck = 'main') => placeCheck(state, key, x, y, { deck });

// A gate a road may cross: every chamber beside it is open.
export function gateOpen(state, i, deck = 'main') {
  const { w, ch } = mapOf(state, deck);
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

// What a road line would do: [{ x, y, why }] (why null = buildable, 'have' = already a road). A
// finished Lift's shaft counts as road on every deck where its chamber is open (version 4).
export function planRoad(state, x0, y0, x1, y1, deck = 'main') {
  const m = mapOf(state, deck), w = state.map.w, occ = occupancy(state, -1, deck);
  const roads = new Set(state.buildings.filter((b) => b.key === 'road' && deckOf(b) === deck).map((b) => b.y * w + b.x));
  const lifts = liftTiles(state);
  const have = (i) => roads.has(i) || (lifts.has(i) && chamberOf(state, m.ch[i])?.status === OPEN);
  return roadLine(x0, y0, x1, y1).map(([x, y]) => ({ x, y, why: have(y * w + x) ? 'have' : placeCheck(state, 'road', x, y, { occ, free: true, deck }) }));
}

// Build every buildable tile of a road line that the colony can pay for; skips the rest.
export function buildRoad(state, x0, y0, x1, y1, deck = 'main') {
  const plan = planRoad(state, x0, y0, x1, y1, deck), d = BUILDING.road;
  let built = 0, skipped = 0, firstWhy = null;
  for (const p of plan) {
    if (p.why === 'have') continue;
    if (p.why || afford(state, d.cost)) { skipped++; firstWhy ??= p.why || afford(state, d.cost); continue; }
    pay(state, d.cost);
    state.buildings.push({ id: state.nextId++, key: 'road', x: p.x, y: p.y, ...(deck !== 'main' ? { deck } : {}), level: 1, mode: null, build: 0, off: false });
    built++;
  }
  if (!built) return no(firstWhy || 'That road is already built.');
  log(state, `${built} tiles of road laid.`);
  return ok(`${built} tiles of road laid${skipped ? `; ${skipped} skipped (${firstWhy})` : ''}.`, { built, skipped });
}

export function build(state, key, x, y, deck = 'main') {
  deck ||= 'main';
  const why = canBuild(state, key, x, y, deck);
  if (why) return no(why);
  const d = BUILDING[key];
  pay(state, d.cost, key);
  const b = { id: state.nextId++, key, x, y, ...(deck !== 'main' ? { deck } : {}), level: 1, mode: d.modes ? d.modes[0].key : null, build: d.days, off: false };
  if (key === 'tailings') b.fill = 0;
  state.buildings.push(b);
  log(state, `${d.name} ordered${deck !== 'main' ? ` on the ${deck} deck` : ''}.`);
  return ok(`${d.name} placed: ${d.days} days of work for a crew.`, { id: b.id });
}

const spent = (b) => {
  const d = BUILDING[b.key], c = { credits: d.cost.credits, parts: d.cost.parts || 0 };
  for (let l = 1; l < b.level; l++) { const u = d.levels?.[l]?.cost; if (u) { c.credits += u.credits; c.parts += u.parts || 0; } }
  return c;
};
function holdsAir(state, b) {
  if (b.key !== 'seal') return null;
  const i = idx(state, b.x, b.y), c = state.chambers.find((k) => deckOf(k) === deckOf(b) && k.breaches.includes(i) && (k.status === OPEN || k.status === 'pressurising'));
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
  if (d.builds) rehomeOrders(state);
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
  const why = placeCheck(state, b.key, x, y, { ignore: b.id, free: true, deck: deckOf(b) });
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

// The build menu. With a deck, a building that cannot stand there says so ("Upper deck only.").
export function buildable(state, deck) {
  return BUILDINGS.filter((d) => !d.fixed).map((d) => {
    const unlocked = state.unlocked.includes(d.key), onDeck = !deck || decksOf(d).includes(deck);
    const why = !onDeck ? deckWhy(d) : unlocked ? afford(state, d.cost, d.key) : d.tech && TECH[d.tech] ? `Research ${TECH[d.tech].name}.` : `Unlocks at ${d.unlock?.pop ?? 80} colonists.`;
    return { key: d.key, name: d.name, cat: d.cat, cost: costOf(state, d.cost, d.key), unlocked, why, decks: decksOf(d), onDeck };
  });
}

// Air it takes to pressurise a chamber (scaled with the difficulty's needs and Better Seals).
export const pressuriseAir = (state, c) => Math.ceil(c.tiles * PRESSURISE.airPerTile * diffOf(state).need * techEffect(state, 'pressurise'));

// A finished Survey Drone Bay whose radius (Chebyshev, from its centre) holds the chamber's whole box.
export function droneReach(state, c) {
  return state.buildings.some((b) => b.key === 'dronebay' && active(b) && deckOf(b) === deckOf(c) && [[c.x0, c.y0], [c.x1, c.y0], [c.x0, c.y1], [c.x1, c.y1]].every(([x, y]) => cheb(x, y, centre(b)) <= spec(b).radius));
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
    if (!touchesOpen(state, c) && !droneReach(state, c) && !liftReach(state, c)) {
      return no(c.deck ? `${c.name} (${c.deck} deck) is out of reach: repair a Lift on a shaft that passes through it, or open a neighbour on its deck first.`
        : `${c.name} does not touch an open chamber: open a neighbour first${state.buildings.some((b) => b.key === 'dronebay') ? ', or bring a Survey Drone Bay within 40 tiles' : ''}.`);
    }
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
    const danger = dangerBlocks(state, c);   // stage 2: drones, toxic air, radiation, flooding
    if (danger) return no(danger);
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
  gain = Math.floor(gain * deptMult(state, 'trade'));
  state.stock[good] -= qty; state.stock.credits += gain; state.market[good] = f;
  state.flags.sold = (state.flags.sold || 0) + gain;
  return ok(`Sold ${qty} ${good} for ${gain} credits.`, { credits: gain });
}

// Imports (owner: the colony was too hard; with credits but no parts a colony was stuck): parts and
// life's essentials can be bought at the dock for twice the sale price; each lot bought pushes that
// price up, and it recovers over days like a sale's.
export const IMPORTS = ['parts', 'food', 'water', 'air'], IMPORT_MARKUP = 2;
export function buyPrice(state, good) { return BASE_PRICE[good] * (state.market?.[good] ?? 1) * IMPORT_MARKUP; }
export function buy(state, good, qty) {
  if (!IMPORTS.includes(good)) return no('Traders don\'t sell that.');
  qty = Math.floor(qty);
  if (!(qty > 0)) return no('Choose how much to buy.');
  if (!hasDock(state)) return no('Traders call only at a finished dock.');
  const room = Math.floor((storageCaps(state)[good] ?? Infinity) - (state.stock[good] || 0));
  if (room <= 0) return no(`The ${good} stores are full.`);
  qty = Math.min(qty, room);
  const step = Math.pow(1 + PRICE.drop, 1 / PRICE.lot);
  let f = state.market[good] ?? 1, cost = 0, n = 0;
  for (; n < qty; n++) {
    const unit = BASE_PRICE[good] * f * IMPORT_MARKUP;
    if (cost + unit > state.stock.credits) break;
    cost += unit; f *= step;
  }
  if (!n) return no(`Needs ${Math.ceil(buyPrice(state, good))} credits for one ${good}.`);
  cost = Math.ceil(cost / deptMult(state, 'trade'));
  state.stock.credits -= cost; state.stock[good] += n; state.market[good] = f;
  log(state, `Bought ${n} ${good} for ${cost} credits.`);
  return ok(`Bought ${n} ${good} for ${cost} credits${n < qty ? ' (all the credits would buy)' : ''}.`, { credits: cost, qty: n });
}

// A guardian's sale: the expansion's price × 10 credits and price parts for the original army; a
// machine built in the colony fetches 80% of what it cost; a finished Scrapyard adds a fifth.
export function saleValue(state, g) {
  const scrap = state.buildings.some((b) => b.key === 'scrapyard' && finished(b)) ? V3.scrapSale : 1;
  const base = g.built !== undefined ? scaleCost(costOf(state, MACHINE_COST(machineOf(state, g.type))), V3.builtSale) : (() => { const p = state.imported?.prices?.[g.type] ?? MACHINE[g.type]?.price ?? 24; return { credits: p * 10, parts: p }; })();
  return scrap === 1 ? base : scaleCost(base, scrap);
}
const scaleCost = (c, m) => ({ credits: Math.floor(c.credits * m), parts: Math.floor(c.parts * m) });

export function sellGuardian(state, id) {
  const i = state.guardians.findIndex((g) => g.id === id);
  if (i < 0) return no('That machine is not in the guard.');
  if (!hasDock(state)) return no('Machines are sold at a finished dock.');
  if (state.guardians[i].away) return no('That machine is away on an expedition.');
  const g = state.guardians[i], v = saleValue(state, g);
  state.guardians.splice(i, 1);
  state.stock.credits += v.credits; state.stock.parts += v.parts;
  const lead = g.commander ? ` ${COMMANDER[g.commander]?.name || 'Its commander'} stands down from it.` : '';
  log(state, `A guardian machine (${machineOf(state, g.type).name}) was sold for ${v.credits} credits and ${v.parts} parts.`);
  return ok(`Sold for ${v.credits} credits and ${v.parts} parts.${lead}`, v);
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
  // version 3: a raid is fought or paid off here; a wanderer can be invited from the announcement
  if (p.kind === 'raid') {
    const r = answerRaid(state, choiceKey);
    if (r.ok) state.pending = state.pending.filter((x) => x.id !== pendingId);
    return r;
  }
  if (p.kind === 'wanderer' && choiceKey === 'invite') {
    const r = inviteWanderer(state, p.wanderer);
    if (r.ok) state.pending = state.pending.filter((x) => x.id !== pendingId);
    return r;
  }
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
export const SERVICE_KINDS = [{ key: 'clinic', label: 'Clinic' }, { key: 'canteen', label: 'Canteen' }, { key: 'safetypost', label: 'Safety' }, { key: 'terrace', label: 'Terraces' },
  { key: 'gallery', label: 'Gallery' }, { key: 'plaza', label: 'Civic Plaza' }];   // version 6: the Gallery counts at last; Civic Plazas
// Homes for service averages (version 3: Terrace Homes count beside Habitats; version 6: Tower Blocks and Arcologies).
export const HOME_KEYS = new Set(['habitat', 'terrace', 'towerblock', 'arcology']);
// Homes that grow a level by themselves when their needs are met (version 6: Tower Blocks grow like Habitats).
export const GROW_KEYS = new Set(['habitat', 'towerblock']);
// Version 6: Emergency Stores hold back `reserve` of each of food, water and air (Food Security doubles it).
export const RESERVE_GOODS = ['food', 'water', 'air'];
export const reserveCap = (state) => state.buildings.reduce((t, b) => t + (finished(b) && BUILDING[b.key]?.reserve ? BUILDING[b.key].reserve : 0), 0) * techEffect(state, 'reserve');
export function serviceValue(b) {
  const s = spec(b);
  if (!s.service || !active(b)) return 0;
  if (b.key === 'clinic' && b.mode === 'triage') return s.service / 2;
  if (b.key === 'canteen' && b.mode === 'ration') return 0;
  return s.service;
}
export const covers = (svc, b) => { if (deckOf(svc) !== deckOf(b)) return false; const c = centre(b); return cheb(c.x - 0.5, c.y - 0.5, centre(svc)) <= spec(svc).radius; };
export function serviceAt(state, home, key, list = state.buildings) {
  let best = 0;
  for (const s of list) if (s.key === key && active(s) && covers(s, home)) best = Math.max(best, serviceValue(s));
  return best;
}

export function tileInfo(state, x, y, deck = 'main') {
  const m = mapOf(state, deck);
  if (!m) return null;
  const { w, h, t, r, ch } = m;
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const i = y * w + x, c = chamberOf(state, ch[i]);
  const hidden = c && (c.status === 'sealed' || c.status === 'surveying');
  const b = state.buildings.find((k) => { const s = BUILDING[k.key].size; return deckOf(k) === deck && x >= k.x && y >= k.y && x < k.x + s && y < k.y + s; }) || null;
  return {
    terrain: TERRAIN[t[i]], artifact: hidden ? ARTIFACT[R.NONE] : ARTIFACT[r[i]], salvage: m.sv[i],
    chamber: c, building: b, reach: deck === 'main' && spaceLike(t[i]) && inReach(state, x, y),
    coverage: { park: parkField(state, deck)[i] },
    deck, lift: t[i] === T.SHAFT ? liftAt(state, x, y) : null,
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
    decks: deckSummary(state), reserve: { ...(state.reserve || { food: 0, water: 0, air: 0 }), cap: reserveCap(state) },
    research: { perDay: last.research || 0, focus: state.research?.focus ?? null, banked: state.research?.points || 0 },
  };
}

// Per-tile overlay values: 'park' (rating), 'reach' (1 = space buildable), 'power' (supply
// fraction of each building's tiles), 'happiness' (0..1 over open floor).
export function coverage(state, kind, deck = 'main') {
  const m = mapOf(state, deck) || state.map, { w, h, t, ch } = m, n = w * h, out = new Float32Array(n);
  if (kind === 'park') return parkField(state, deck);
  if (kind === 'reach') {
    if (deck !== 'main') return out;   // space lies beside the main deck only
    const reach = reachTest(reachSources(state));
    for (let i = 0; i < n; i++) if (spaceLike(t[i]) && reach(i % w, (i / w) | 0)) out[i] = 1;
    return out;
  }
  if (kind === 'power') {
    const pf = state.stats?.last?.power?.factor ?? 1;
    for (const b of state.buildings) {
      const s = spec(b);
      if (!s.power || deckOf(b) !== deck) continue;
      for (const i of tilesOf(state, b)) out[i] = !active(b) ? 0 : s.power > 0 ? 1 : pf;
    }
    return out;
  }
  if (kind === 'happiness') {
    const field = parkField(state, deck);
    for (let i = 0; i < n; i++) if (ch[i] !== 255 && chamberOf(state, ch[i])?.status === OPEN) out[i] = Math.min(1, (state.happy + field[i]) / 100);
    return out;
  }
  return out;
}

// ================================================================ version 3: guardians, production,
// commanders, wanderers and raids (docs/COLONY-V3.md). The sim (sim.js) runs the clock; the rules
// here are the player's actions and the read-outs. Numbers are first guesses for the balance pass
// (tests/colony-v3.mjs).

export const V3 = {
  betaFree: 60,                 // days of free upkeep for the imported army (D7)
  starterLoyalty: 80,           // Sato's loyalty at the start (the General's is 100)
  crewsCommand: 4,              // machines the Command Centre crews; each Barracks adds its `crews` (6)
  orderMin: 2, orderPer: 4,     // production days = max(2, ceil(price / 4))
  upkeepPer: 8,                 // machine upkeep: ceil(price / 8) credits a day, × the difficulty's upkeep
  builtSale: 0.8,               // a machine built in the colony sells for 80% of what it cost
  scrapSale: 1.2,               // a finished Scrapyard: sales +20%
  repairHp: 2, repairPart: 1,   // each working Scrapyard: HP a day per damaged guardian; parts per HP
  levelPower: 0.08,             // power +8% a level
  commanderMax: 1.6,            // no commander but the General makes a machine more than ×1.6
  style: 0.15, ace: 0.1, bulwark: 0.75,
  invite: { gift: 100, base: 0.3, charm: 220, crowd: 0.03, loyalty: 400, min: 0.05, max: 0.95, refusal: 8 },
  away: 30,                     // days before a commander who left turns up as a wanderer again
  stay: 20, lodgeEvery: [15, 10, 7],   // a wanderer stays 20 days; one arrives every 15 / 10 / 7 days by Lodge level
  unpaidLoyalty: 2, leaveBelow: 20, leaveChance: 0.1, drift: 1,
  injury: [20, 40],             // days a commander whose machine is destroyed is injured
  maxLevel: 9,
};
export const RAID = {
  start: { easy: 60, normal: 35 },              // no raid before this day (nor before 80 colonists)
  interval: { easy: [30, 45], normal: [20, 35] },   // days between raids, × (1.4 − heat / 100)
  strength: { easy: 0.6, normal: 1 },
  menaceShift: { easy: 40, normal: 0 },          // tiers come later on Easy
  firstGap: 12, minGap: 10,
  warn: 3, warnPerMast: 3, warnMax: 9,           // warning days ahead; +3 per Sensor Mast (max 9 in all)
  emplacement: 40, modeBonus: 0.3,               // a Battery Emplacement's power; Dragon ×1.3 on ships, Hydra on small craft
  hurt: 0.8, hurtLost: 1.5,                      // a guardian loses hurt × a / (a + d) × (0.5..1.5) of its HP (× 1.5 losing)
  steal: [0.1, 0.3], damage: [1, 4], damageDays: [5, 15], side: 30,
  fear: { lost: -15, won: -5, tribute: -5, days: 15 },
  tributePer: 3, tributeHeat: 10,
  salvage: { credits: 5, parts: 0.5 }, hunter: 1.2,
  heat: { pop: 20, value: 2000, chamber: 2, sales: 1000, jammer: 10, jammerMax: 30, rook: 5, ease: 0.1 },
};
// Version 5 (docs/COLONY-V5.md; owner, 2026-11-05): every raid comes from a base on the sector map, with
// a fleet that regrows slowly ("their bases are limited in resources"). Nobody raids Eden below 500
// colonists; a base notices Eden at its population, or when a squadron visits it; a destroyed base sends
// no more. A raid takes 50–80% of the base's fleet; the raiders killed are gone, the rest go home.
export const BASE_RAIDS = {
  peace: 500,               // no raids at all below this many colonists
  ready: 0.6,               // a base raids once this share of its fleet is home
  send: [0.5, 0.8],         // share of the fleet a raid takes
  firstWait: [20, 30],      // days from noticing Eden to its first raid
  kill: { won: [0.5, 0.4], lost: 0.15 },   // auto fights: killed = n × (0.5 + 0.4 × p) on a win, n × 0.15 × p on a loss
  fleetFight: 0.4,          // an expedition against a base: its strength × (0.4 + 0.6 × fleet / max)
};
export const BASES = [
  { id: 'scavengers', site: 'den', ring: 1, faction: 'scavengers', tier: 'scavengers', notice: 500, max: 5, regen: 8, name: 'the scavengers\' den' },
  { id: 'cartel', site: 'den', ring: 2, faction: 'cartel', tier: 'pirates', notice: 800, max: 9, regen: 7, name: 'the Ashfall Cartel\'s den' },
  { id: 'deserters', site: 'den', ring: 3, faction: null, tier: 'warbands', notice: 1200, max: 14, regen: 6, name: 'the deserters\' den' },
  { id: 'remnant', site: 'listening', ring: 3, faction: 'remnant', tier: 'remnant', notice: 1800, max: 18, regen: 6, name: 'the Directorate remnant' },
];
export const BASE = Object.fromEntries(BASES.map((b) => [b.id, b]));
// Raid tiers by menace (= day + 2 × heat, minus the difficulty's shift): who comes and how many.
// Strength = Σ raiders' (attack + defence) × (1 + 0.08 × level), × the difficulty's factor, × (1 + heat / 100).
export const RAID_TIERS = [
  { key: 'scavengers', name: 'Scavengers', menace: 0, n: [1, 3], tiers: [1, 1], levels: [0, 0] },
  { key: 'pirates', name: 'Pirate band', menace: 120, n: [4, 8], tiers: [1, 2], levels: [0, 2] },
  { key: 'warbands', name: 'Deserter warband', menace: 220, n: [8, 14], tiers: [1, 3], levels: [2, 4] },
  { key: 'remnant', name: 'Remnant fleet', menace: 340, n: [15, 18], tiers: [1, 3], levels: [4, 6], capital: true },
];
export const RAID_TIER = Object.fromEntries(RAID_TIERS.map((t) => [t.key, t]));
export const FACTIONS = {
  scavengers: { name: 'Scavengers', text: 'leaderless scrap crews' },
  cartel: { name: 'the Ashfall Cartel', text: 'Moraine\'s pirates' },
  union: { name: 'Union deserters', text: 'trained pilots after food' },
  galt: { name: 'Galt deserters', text: 'Galt veterans with nothing left to lose' },
  remnant: { name: 'the Directorate remnant', text: 'Kessrin\'s last people, with a capital ship' },
};
export const FROM = { north: 'the north end cap', east: 'the east hull', west: 'the west hull', earth: 'up out of Earth\'s atmosphere' };
const TIER_TECH = { 2: 'machineworks', 3: 'heavyworks', 4: 'kai' };

// The colony's own dice (mulberry32 on state.flags.rng), so saves keep them; sim.js re-exports it.
const hashSeed = (v) => { let h = 2166136261; for (const c of String(v)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export function stateRng(state) {
  return () => {
    let a = (state.flags.rng = ((state.flags.rng ?? hashSeed(state.seed)) + 0x6d2b79f5) >>> 0);
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
const round1 = (v) => Math.round(v * 10) / 10;
const dkey = (state) => (state.difficulty === 'easy' ? 'easy' : 'normal');

// ---------------------------------------------------------------- machines

// Alternate forms of an expansion unit (Athena's fighter form, an empty Crab...) are that machine.
const FORM = { 5: 4, 6: 4, 7: 4, 11: 10, 13: 12, 27: 26, 29: 28, 37: 36, 44: 43, 46: 45, 48: 47, 63: 62, 64: 62, 65: 62, 74: 73, 75: 73, 76: 73 };
// Expansion units the colony cannot build that an imported roster may hold: [name, cls, hp, attack, defence].
const OTHER = {
  17: ['Pandora', 'support', 8, 60, 60], 18: ['Wisp', 'support', 8, 0, 80], 45: ['Msnp-Ii', 'ships', 8, 180, 45], 47: ['Msfb-5', 'ships', 8, 156, 60],
  52: ['Pergamon', 'support', 8, 15, 20], 53: ['Solomon', 'support', 12, 20, 35], 54: ['Carthago', 'support', 20, 30, 20], 55: ['Goliath', 'support', 12, 65, 65],
  56: ['Cortex', 'support', 8, 0, 45], 57: ['Adzam', 'support', 8, 0, 35], 59: ['Leviathan', 'ships', 60, 199, 50], 60: ['Directorate Talos', 'hu', 8, 109, 65],
  77: ['Nineveh', 'ships', 90, 199, 60], 80: ['Directorate Medusa', 'hu', 8, 80, 50],
  // the Directorate prototypes in the hangars (stage 2): units.json's armed forms 45 / 47, one each
  46: ['MSNP-II', 'ships', 8, 180, 45, { code: 'MSNP-II', evasion: 58, move: 5, price: 40, unique: true, proto: true }],
  48: ['MSFB-5', 'ships', 8, 156, 60, { code: 'MSFB-5', evasion: 77, move: 5, price: 40, unique: true, proto: true }],
};
const others = new Map();
// The machine (data/machines.js) a guardian or raider of this expansion type is.
export function machineOf(state, type) {
  const m = MACHINE[type] ?? MACHINE[FORM[type]];
  if (m) return m;
  let x = others.get(type);
  if (!x) {
    const o = OTHER[type] || [`Machine ${type}`, 'support', 8, 60, 40];
    x = { type, name: o[0], code: '', cls: o[1], category: 0, hp: o[2], move: 0, evasion: 0, attack: o[3], defence: o[4], price: 24, at: 'arsenal', tier: 1, series: 'original', unique: false, other: true, ...(o[5] || {}) };
    others.set(type, x);
  }
  return x;
}
// Each machine's strongest weapon from units.json: [mode (0 beam, 1 railgun, 2 missile), max range].
const MAIN = {
  0: [1, 1], 1: [1, 3], 2: [0, 1], 3: [2, 1], 4: [2, 2], 8: [0, 1], 9: [2, 1], 10: [2, 2], 12: [2, 2], 14: [0, 4], 15: [1, 4], 16: [2, 5], 20: [0, 2],
  21: [1, 3], 22: [1, 3], 23: [0, 7], 24: [2, 6], 25: [0, 5], 28: [1, 1], 30: [0, 5], 31: [1, 4], 32: [2, 4], 33: [0, 4], 34: [0, 1], 35: [2, 3],
  36: [1, 1], 38: [1, 1], 39: [0, 3], 40: [0, 1], 41: [2, 4], 42: [1, 1], 43: [2, 4], 49: [1, 1], 50: [2, 2], 51: [1, 1], 58: [0, 2], 61: [0, 4],
  62: [2, 2], 66: [0, 2], 67: [2, 2], 68: [1, 4], 69: [1, 1], 70: [2, 6], 71: [1, 1], 72: [1, 4], 73: [2, 2], 78: [0, 5],
  45: [2, 4], 46: [2, 4], 47: [2, 4], 48: [2, 4],
};
const MODE_STYLE = ['beam', 'railgun', 'missile'];
// Does a commander's style match the machine's main weapon? Melee: range 1; Gunner: range 2+; or the mode.
export function styleFits(style, type) {
  const w = MAIN[type] ?? MAIN[FORM[type]];
  if (!style || !w) return false;
  return style === 'melee' ? w[1] === 1 : style === 'gunner' ? w[1] >= 2 : MODE_STYLE[w[0]] === style;
}
const priceOf = (state, g) => (g.built === undefined ? state.imported?.prices?.[g.type] : undefined) ?? machineOf(state, g.type).price;
export const maxHp = (state, g) => machineOf(state, g.type).hp;
const orderDays = (m) => Math.max(V3.orderMin, Math.ceil(m.price / V3.orderPer));

// Why this machine cannot be ordered now, or null.
function machineWhy(state, m, cost) {
  if (m.tier > techEffect(state, 'machines')) return `Research ${TECH[TIER_TECH[m.tier]].name}.`;
  if (!state.buildings.some((b) => b.key === m.at && finished(b))) return m.at === 'shipyard' ? 'Build a Shipyard.' : 'Build an Arsenal.';
  if (m.unique && (state.guardians.some((g) => machineOf(state, g.type) === m) || state.production.some((o) => o.type === m.type))) return `Only one ${m.name} may serve at a time.`;
  if (state.stock.credits < cost.credits) return `Needs ${Math.ceil(cost.credits - state.stock.credits)} more credits.`;
  if (state.stock.parts < cost.parts) return `Needs ${Math.ceil(cost.parts - state.stock.parts)} more parts.`;
  return null;
}
// The production list: every machine with its cost here, build days, and why it can't be ordered.
export function machineList(state) {
  upgradeState(state);
  return MACHINES.map((m) => { const cost = costOf(state, MACHINE_COST(m)), why = machineWhy(state, m, cost); return { ...m, cost, days: orderDays(m), ok: !why, why }; });
}
const loadOf = (state, b) => state.production.reduce((t, o) => t + (o.at === b.id ? o.days : 0), 0);
function leastBusy(state, kind) {
  let best = null, bl = Infinity;
  for (const b of state.buildings) if (b.key === kind && finished(b)) { const l = loadOf(state, b); if (l < bl) { bl = l; best = b; } }
  return best;
}
// The orders waiting at one Arsenal or Shipyard, the one being built first.
export const queueAt = (state, id) => state.production.filter((o) => o.at === id);

export function orderMachine(state, type) {
  upgradeState(state);
  const m = MACHINE[type];
  if (!m) return no('There is no such machine.');
  const cost = costOf(state, MACHINE_COST(m)), why = machineWhy(state, m, cost);
  if (why) return no(why);
  const at = leastBusy(state, m.at), ahead = queueAt(state, at.id).length;
  state.stock.credits -= cost.credits; state.stock.parts -= cost.parts;
  const o = { id: state.nextId++, type: m.type, at: at.id, days: orderDays(m), paid: cost };
  state.production.push(o);
  log(state, `${m.name} ordered at the ${BUILDING[m.at].name}.`);
  return ok(`${m.name} ordered for ${cost.credits} credits and ${cost.parts} parts: ${o.days} days of work${ahead ? ` after ${ahead} order${ahead > 1 ? 's' : ''} ahead of it` : ''}.`, { id: o.id });
}

export function cancelOrder(state, id) {
  upgradeState(state);
  const i = state.production.findIndex((o) => o.id === id);
  if (i < 0) return no('That order is gone.');
  const o = state.production[i], p = o.paid || costOf(state, MACHINE_COST(machineOf(state, o.type)));
  state.production.splice(i, 1);
  state.stock.credits += p.credits; state.stock.parts += p.parts;
  return ok(`${machineOf(state, o.type).name} cancelled: ${p.credits} credits and ${p.parts} parts refunded.`);
}
// Orders whose Arsenal or Shipyard is gone move to another one, or are refunded.
export function rehomeOrders(state) {
  for (const o of [...state.production]) {
    if (state.buildings.some((b) => b.id === o.at && finished(b))) continue;
    const to = leastBusy(state, machineOf(state, o.type).at);
    if (to) o.at = to.id;
    else { cancelOrder(state, o.id); log(state, `With no ${BUILDING[machineOf(state, o.type).at].name} left, the ${machineOf(state, o.type).name} order was refunded.`); }
  }
}
// A new guardian (production, tests). Ids never repeat.
export function addGuardian(state, type, extra = {}) {
  const id = Math.max(state.flags.gid || 0, ...state.guardians.map((g) => g.id)) + 1;
  state.flags.gid = id;
  const g = { id, type, level: 0, hp: machineOf(state, type).hp, commander: null, free: 0, built: state.day, ...extra };
  state.guardians.push(g);
  return g;
}

// ---------------------------------------------------------------- crews, upkeep, power

export const crewCap = (state) => V3.crewsCommand + state.buildings.reduce((t, b) => t + (b.key === 'barracks' && active(b) ? spec(b).crews || 0 : 0), 0);
// The guardians that have a crew: those away on an expedition (their crews went with them), then
// those a commander leads, then the strongest.
export function crewed(state) {
  const cap = crewCap(state), pw = new Map(state.guardians.map((g) => [g, guardianPower(state, g)]));
  const order = state.guardians.filter((g) => g.hp > 0).sort((a, b) => (!!b.away - !!a.away) || (!!fitCommander(state, b.commander) - !!fitCommander(state, a.commander)) || pw.get(b) - pw.get(a) || a.id - b.id);
  return new Set(order.slice(0, cap).map((g) => g.id));
}
// The crewed guardians at home: the ones that meet raiders and sentries (stage 3: not those away).
export function homeCrew(state) {
  const c = crewed(state);
  for (const g of state.guardians) if (g.away) c.delete(g.id);
  return c;
}
const serving = (state, key) => (key ? state.commanders.find((c) => c.key === key) || null : null);
// A serving, uninjured commander (only they lead, head a department or use a perk).
export const fitCommander = (state, key) => { const c = serving(state, key); return c && !(c.injured > 0) ? c : null; };
export function guardianUpkeep(state, g) {
  if (g.free > 0) return 0;
  const qm = COMMANDER[fitCommander(state, g.commander)?.key]?.perk === 'quartermaster';
  return Math.ceil(priceOf(state, g) / V3.upkeepPer) * (qm ? 0.5 : 1) * diffOf(state).upkeep;
}
export const machineUpkeep = (state) => (state.guardians || []).reduce((t, g) => t + guardianUpkeep(state, g), 0);

// A commander's multiplier on a machine's power: the General ×3 (power ×2, evasion ×2 counted as
// half again); others by their grade in its class scaled by might, +15% for a matching style, the
// Ace perk on planes, never above ×1.6.
export function leadMult(state, key, m) {
  const c = fitCommander(state, key), d = c && COMMANDER[c.key];
  if (!d) return 1;
  if (d.general) return GENERAL_POWER * (1 + (GENERAL_EVASION - 1) / 2);
  let mult = 1 + ((GRADE[d.grades?.[m.cls]] ?? 1) - 1) * d.might / 100;
  if (styleFits(d.style, m.type)) mult *= 1 + V3.style;
  if (d.perk === 'ace' && m.cls === 'planes') mult *= 1 + V3.ace;
  return Math.min(V3.commanderMax, mult);
}
// A guardian's strength in a raid: (attack + defence) × hp share × (1 + 0.08 × level) × its commander.
export function guardianPower(state, g) {
  const m = machineOf(state, g.type), hp = Math.max(0, Math.min(1, g.hp / m.hp));
  return (m.attack + m.defence) * hp * (1 + V3.levelPower * (g.level || 0)) * leadMult(state, g.commander, m);
}
// What the guard list shows: [{ ...guardian, machine, power, crewed, upkeep, sale, maxHp }].
export function guardianList(state) {
  upgradeState(state);
  const crew = crewed(state);
  return state.guardians.map((g) => ({ ...g, machine: machineOf(state, g.type), maxHp: maxHp(state, g), power: guardianPower(state, g), crewed: crew.has(g.id), upkeep: guardianUpkeep(state, g), sale: saleValue(state, g) }));
}

// ---------------------------------------------------------------- commanders

// The survivors' commanders (stage 2) bring their own room: one more place each while they serve.
export const commanderCap = (state) => BASE_COMMANDERS + PER_QUARTERS * state.buildings.filter((b) => b.key === 'quarters' && finished(b)).length
  + (state.commanders || []).filter((c) => COMMANDER[c.key]?.survivor).length;
// The serving commanders with their data: [{ ...data, loyalty, injured, dept, guardian }].
export function commanderList(state) {
  upgradeState(state);
  return state.commanders.map((c) => ({ ...COMMANDER[c.key], ...c, guardian: state.guardians.find((g) => g.commander === c.key)?.id ?? null }));
}
export function deptHead(state, dept) {
  const c = state.commanders?.find((k) => k.dept === dept);
  return c && !(c.injured > 0) ? c : null;
}
// A department head's bonus: + (stat / 10)% (Welfare's happiness is applied by the sim).
export function deptMult(state, dept) {
  const c = deptHead(state, dept), d = DEPARTMENTS[dept];
  return c && d ? 1 + (COMMANDER[c.key][d.stat] || 0) / 1000 : 1;
}
const nameOf = (key) => COMMANDER[key]?.name || key;

export function assignCommander(state, key, guardianId) {
  upgradeState(state);
  const c = serving(state, key);
  if (!c) return no('That commander is not serving in Eden.');
  const was = state.guardians.find((g) => g.commander === key);
  if (was?.away) return no(`${nameOf(key)} is away with a squadron.`);
  if (guardianId === null || guardianId === undefined) {
    if (!was) return ok(`${nameOf(key)} leads no machine.`);
    was.commander = null;
    return ok(`${nameOf(key)} stands down from the ${machineOf(state, was.type).name}.`);
  }
  const g = state.guardians.find((x) => x.id === guardianId);
  if (!g) return no('That machine is not in the guard.');
  if (g.away) return no('That machine is away on an expedition.');
  if (c.injured > 0) return no(`${nameOf(key)} is recovering for ${c.injured} more days.`);
  if (g.commander === key) return ok(`${nameOf(key)} already leads it.`);
  const before = g.commander;
  if (was) was.commander = null;
  g.commander = key;
  const m = machineOf(state, g.type);
  return ok(`${nameOf(key)} leads the ${m.name}: ×${leadMult(state, key, m).toFixed(2)} power.${before ? ` ${nameOf(before)} stands down.` : ''}`);
}

export function setDepartment(state, key, dept) {
  upgradeState(state);
  const c = serving(state, key);
  if (!c) return no('That commander is not serving in Eden.');
  if (dept === null || dept === undefined) { const was = c.dept; c.dept = null; return ok(was ? `${nameOf(key)} no longer heads ${DEPARTMENTS[was].name}.` : `${nameOf(key)} heads no department.`); }
  const d = DEPARTMENTS[dept];
  if (!d) return no('There is no such department.');
  if (c.dept === dept) return ok(`${nameOf(key)} already heads ${d.name}.`);
  const other = state.commanders.find((k) => k.dept === dept);
  if (other) other.dept = null;
  c.dept = dept;
  return ok(`${nameOf(key)} heads ${d.name}: +${(COMMANDER[key][d.stat] / 10).toFixed(1)}% (${d.text.toLowerCase()}).${other ? ` ${nameOf(other.key)} steps aside.` : ''}`);
}

// The chance a wanderer accepts an invitation (Lanternfall's formula).
export function inviteChance(state, key) {
  const w = state.wanderers?.find((x) => x.key === key);
  const I = V3.invite, loyalty = w?.loyalty ?? COMMANDER[key]?.loyalty ?? 50;
  const p = I.base + GENERAL.charm / I.charm - I.crowd * (state.commanders.length - 2) + (100 - loyalty) / I.loyalty;
  return Math.min(I.max, Math.max(I.min, p));
}
// Invite a wanderer at the Lodge: a gift of 100 credits, then they say yes or no (the colony's dice).
export function inviteWanderer(state, key, rng = stateRng(state)) {
  upgradeState(state);
  const w = state.wanderers.find((x) => x.key === key);
  if (!w) return no('That wanderer is not at the Lodge.');
  if (state.commanders.length >= commanderCap(state)) return no(`Eden has room for ${commanderCap(state)} commanders: build Officers' Quarters for two more.`);
  if (state.stock.credits < V3.invite.gift) return no(`An invitation comes with a gift of ${V3.invite.gift} credits.`);
  const p = inviteChance(state, key);
  state.stock.credits -= V3.invite.gift;
  w.asked = (w.asked || 0) + 1;
  if (rng() < p) {
    state.wanderers.splice(state.wanderers.indexOf(w), 1);
    state.commanders.push({ key, loyalty: COMMANDER[key]?.loyalty ?? 60, injured: 0, dept: null });
    log(state, `${nameOf(key)} joins Eden's commanders.`);
    return ok(`${nameOf(key)} accepts and joins Eden's commanders.`, { joined: true });
  }
  w.loyalty = Math.max(0, (w.loyalty ?? COMMANDER[key]?.loyalty ?? 50) - V3.invite.refusal);
  return ok(`${nameOf(key)} thanks you for the gift but says no, for now. Asking again is likelier to work (${Math.round(inviteChance(state, key) * 100)}%).`, { joined: false });
}

// A commander who leaves (dismissed, or of their own accord) turns up as a wanderer again later.
export function releaseCommander(state, key) {
  const c = serving(state, key);
  if (!c) return;
  for (const g of state.guardians) if (g.commander === key) g.commander = null;
  state.commanders.splice(state.commanders.indexOf(c), 1);
  (state.flags.away ??= {})[key] = state.day + V3.away;
}
export function dismissCommander(state, key) {
  upgradeState(state);
  if (!serving(state, key)) return no('That commander is not serving in Eden.');
  if (COMMANDER[key]?.general) return no('The General is Eden\'s governor and cannot be dismissed.');
  releaseCommander(state, key);
  log(state, `${nameOf(key)} was dismissed.`);
  return ok(`${nameOf(key)} leaves Eden's service. They may pass by the Lodge again some day.`);
}

// ---------------------------------------------------------------- heat and raids

// Heat's target today: what makes Eden worth robbing. { target, parts: [{ label, value }] }.
export function heatTarget(state) {
  const H = RAID.heat, st = state.stock;
  let value = st.credits || 0;
  for (const g of STORED) value += (st[g] || 0) * (BASE_PRICE[g] || 0);
  const sales = (state.raid?.sales || []).reduce((t, v) => t + (v || 0), 0);
  const jammers = state.buildings.filter((b) => b.key === 'jammer' && active(b)).length;
  const parts = [
    { label: 'Colonists', value: state.pop / H.pop },
    { label: 'Stored value', value: value / H.value },
    { label: 'Open chambers', value: state.chambers.filter((c) => c.status === OPEN).length * H.chamber },
    { label: 'Market sales', value: sales / H.sales },
  ];
  if (jammers) parts.push({ label: 'Jammers', value: -Math.min(H.jammerMax, jammers * H.jammer) });
  if (serving(state, 'w_rook')) parts.push({ label: 'Cass Rook', value: H.rook });
  const dens = densCleared(state);   // stage 3: pirate dens cleared by expeditions
  if (dens) parts.push({ label: 'Pirate dens cleared', value: -EXP.denHeat * dens });
  return { target: Math.max(0, Math.min(100, parts.reduce((t, p) => t + p.value, 0))), parts };
}
export const warnLead = (state) => Math.min(RAID.warnMax, RAID.warn + RAID.warnPerMast * state.buildings.filter((b) => b.key === 'sensormast' && active(b)).length);
// Raids on at all (Settings: owner, 2026-11-05 "toggle raiders on and off").
export const raidsOn = (state) => state.options?.raids !== false;
// The raiders' bases (state.raid.bases), from the sector map: [{ id, sector, faction, fleet, max, regen,
// aware, since, destroyed, grow }]. A base is destroyed when its sector is cleared.
export function ensureBases(state) {
  const rd = state.raid, sectors = state.expeditions?.sectors;
  if (!rd || !sectors) return [];
  if (!rd.bases) {
    rd.bases = [];
    for (const B of BASES) {
      const sec = sectors.find((x) => x.site === B.site && x.ring === B.ring);
      if (!sec) continue;
      const faction = B.faction || ((hashSeed(`${state.seed}:${sec.id}`) & 1) ? 'galt' : 'union');
      rd.bases.push({ id: B.id, sector: sec.id, faction, fleet: B.max, max: B.max, regen: B.regen, aware: false, since: null, destroyed: false, grow: 0 });
    }
  }
  for (const b of rd.bases) if (!b.destroyed && sectors.find((x) => x.id === b.sector)?.cleared) b.destroyed = true;
  return rd.bases;
}
export const baseOf = (state, id) => (state.raid?.bases || []).find((b) => b.id === id) || null;
export const baseForSector = (state, sectorId) => (state.raid?.bases || []).find((b) => b.sector === sectorId) || null;
export const baseName = (b) => BASE[b?.id]?.name || 'a raider base';
// A base notices Eden (its population threshold, or a squadron at its door): its first raid comes 20–30 days later.
export function noticeEden(state, b, rng = stateRng(state), why = '') {
  if (!b || b.aware || b.destroyed) return false;
  b.aware = true; b.since = state.day + between(rng, BASE_RAIDS.firstWait);
  log(state, `${baseName(b)[0].toUpperCase() + baseName(b).slice(1)} (${FACTIONS[b.faction]?.name || b.faction}) has noticed Eden${why}.`);
  return true;
}
// The base whose raiders come next: aware, standing, past its first wait, with enough of its fleet home.
export function readyBase(state) {
  const ok = ensureBases(state).filter((b) => b.aware && !b.destroyed && state.day >= (b.since ?? 0) - warnLead(state) && b.fleet >= Math.max(1, Math.ceil(b.max * BASE_RAIDS.ready)));
  return ok.sort((a, b) => b.fleet / b.max - a.fleet / a.max)[0] || null;
}
// The raid clock runs while raiders are on, Eden has 500 colonists, and some base knows of it and stands.
export const raidsPossible = (state) => raidsOn(state) && state.pop >= BASE_RAIDS.peace
  && ensureBases(state).some((b) => b.aware && !b.destroyed);
// Raiders off or on (Settings).
export function setRaids(state, on) {
  state.options ??= {};
  state.options.raids = !!on;
  if (!on && state.raid?.coming && !state.raid.coming.arrived) {   // a band only sighted turns back
    const b = baseOf(state, state.raid.coming.base);
    if (b) b.fleet = Math.min(b.max, b.fleet + state.raid.coming.units.length);
    state.raid.coming = null; state.raid.warned = false;
    state.pending = state.pending.filter((p) => p.kind !== 'raidwarn');
  }
  return ok(on ? 'Raiders on: they come once Eden has 500 colonists and a base has noticed it.' : 'Raiders off: no raids until you turn them on again.');
}
// Each day: fleets regrow, bases notice Eden as it grows.
export function basesDay(state, rng = stateRng(state)) {
  const out = [];
  for (const b of ensureBases(state)) {
    if (b.destroyed) continue;
    if (b.fleet < b.max && ++b.grow >= b.regen) { b.fleet++; b.grow = 0; }
    if (!b.aware && state.pop >= BASE[b.id].notice && noticeEden(state, b, rng, ` (${state.pop} colonists)`)) out.push(b);
  }
  return out;
}
// What the Raids tab shows of the bases.
export function basesStatus(state) {
  return ensureBases(state).map((b) => {
    const sec = state.expeditions?.sectors?.find((x) => x.id === b.sector);
    return { id: b.id, name: baseName(b), faction: FACTIONS[b.faction]?.name || b.faction, sector: b.sector, sectorName: sec?.known ? sec.name : null,
      fleet: b.fleet, max: b.max, aware: b.aware, destroyed: b.destroyed, notice: BASE[b.id].notice, eta: b.aware && b.since > state.day ? b.since - state.day : 0 };
  });
}
export function raidInterval(state, rng) {
  const base = between(rng, RAID.interval[dkey(state)]);
  return Math.max(RAID.minGap, Math.round(base * (1.4 - (state.raid?.heat || 0) / 100) * (1 + EXP.raidSlow * densCleared(state))));
}
export const raiderPower = (u) => { const m = MACHINE[u.type]; return m ? (m.attack + m.defence) * (1 + V3.levelPower * (u.level || 0)) : 0; };
const POOL = MACHINES.filter((m) => m.attack > 0 && !m.unique && m.type !== 79);
const CAPITALS = MACHINES.filter((m) => m.cls === 'ships' && m.hp >= 18 && m.attack > 0 && !m.unique && m.tier <= 3);
// Who comes: the tier from the menace (day and heat), a faction, the machines and their strength.
// Version 5: with a base (`base`), its tier and faction, and 50–80% of its fleet (taken out of it);
// without one (tests, old saves) the tier from the menace as before.
export function makeRaid(state, rng, day = state.day, base = null) {
  const heat = state.raid?.heat || 0, menace = day + 2 * heat - RAID.menaceShift[dkey(state)];
  let ti = 0, T, faction, n;
  if (base) {
    T = RAID_TIER[BASE[base.id].tier]; faction = base.faction;
    n = Math.max(1, Math.min(base.fleet, Math.round(base.fleet * (BASE_RAIDS.send[0] + rng() * (BASE_RAIDS.send[1] - BASE_RAIDS.send[0])))));
    base.fleet -= n;
  } else {
    RAID_TIERS.forEach((t, i) => { if (menace >= t.menace) ti = i; });
    if (ti > 0 && rng() < 0.25) ti--;   // now and then a weaker band
    if (ti === 0 && state.imported?.choice === 'refuse' && rng() < 0.5) ti = 1;   // the cartel remembers
    T = RAID_TIERS[ti];
    faction = T.key === 'scavengers' ? 'scavengers' : T.key === 'pirates' ? 'cartel' : T.key === 'warbands' ? (rng() < 0.5 ? 'union' : 'galt') : 'remnant';
    n = between(rng, T.n);
  }
  const units = [];
  const pool = POOL.filter((m) => m.tier >= T.tiers[0] && m.tier <= T.tiers[1]);
  if (T.capital && n >= 4) units.push({ type: CAPITALS[Math.floor(rng() * CAPITALS.length)].type, level: between(rng, T.levels) });
  while (units.length < n) units.push({ type: pool[Math.floor(rng() * pool.length)].type, level: between(rng, T.levels) });
  const from = ['north', 'east', 'west', 'earth'][Math.floor(rng() * 4)];
  // heat makes them bolder: strength × (1 + heat / 100)
  const strength = Math.round(units.reduce((t, u) => t + raiderPower(u), 0) * RAID.strength[dkey(state)] * (1 + heat / 100));
  return { day, from, tier: T.key, units, faction, strength, base: base?.id || null };
}
// After a raid: the survivors go home to their base (the killed are gone for good).
function raidersHome(state, raid, killed) {
  const b = baseOf(state, raid.base);
  if (!b) return;
  b.fleet = Math.min(b.max, b.fleet + Math.max(0, raid.units.length - killed));
  b.last = state.day;
}
const shipShare = (raid) => {
  const all = raid.units.reduce((t, u) => t + raiderPower(u), 0);
  return all ? raid.units.reduce((t, u) => t + (MACHINE[u.type]?.cls === 'ships' ? raiderPower(u) : 0), 0) / all : 0;
};
// The colony's defence against a raid: crewed guardians + Battery Emplacements, × the Security head.
export function defenceOf(state, raid = state.raid?.coming) {
  upgradeState(state);
  const crew = homeCrew(state), share = raid ? shipShare(raid) : 0.5;
  let guardians = 0, emplacements = 0, batteries = 0;
  for (const g of state.guardians) if (crew.has(g.id)) guardians += guardianPower(state, g);
  for (const b of state.buildings) if (b.key === 'emplacement' && active(b)) { batteries++; emplacements += RAID.emplacement * (1 + RAID.modeBonus * (b.mode === 'hydra' ? 1 - share : share)); }
  const security = deptMult(state, 'security');
  const away = state.guardians.filter((g) => g.away).length;
  return { total: (guardians + emplacements) * security, guardians, emplacements, security, crewed: crew.size, idle: state.guardians.length - crew.size - away, away, batteries };
}
export const winChance = (d, a) => (a <= 0 ? 1 : (d * d) / (d * d + a * a));
export function tributeOf(state, raid = state.raid?.coming) {
  const credits = Math.ceil((raid?.strength || 0) * RAID.tributePer);
  return { credits, food: Math.ceil(credits / BASE_PRICE.food) };
}
// Buildings raiders can knock out: on their side of the colony, not homes, life support, food or
// power (raids never kill colonists by themselves), not roads, seals, the Command Centre or the dock.
const SAFE_CATS = new Set(['life', 'food', 'homes', 'power']);
const SAFE_KEYS = new Set(['road', 'seal', 'command', 'dock']);
export function shielded(state, b, pylons = state.buildings.filter((p) => p.key === 'shieldpylon' && active(p))) {
  const c = centre(b);
  return pylons.some((p) => deckOf(p) === deckOf(b) && cheb(c.x - 0.5, c.y - 0.5, centre(p)) <= spec(p).radius);
}
export function raidTargets(state, from) {
  const cand = state.buildings.filter((b) => finished(b) && !SAFE_KEYS.has(b.key) && !SAFE_CATS.has(BUILDING[b.key].cat));
  if (!cand.length) return { exposed: [], shielded: [] };
  const all = state.buildings.filter((b) => b.key !== 'road');
  const sz = (b) => BUILDING[b.key].size;
  const x0 = Math.min(...all.map((b) => b.x)), x1 = Math.max(...all.map((b) => b.x + sz(b))), y0 = Math.min(...all.map((b) => b.y)), y1 = Math.max(...all.map((b) => b.y + sz(b)));
  const S = RAID.side;
  const side = { north: (b) => b.y <= y0 + S, earth: (b) => b.y + sz(b) >= y1 - S, west: (b) => b.x <= x0 + S, east: (b) => b.x + sz(b) >= x1 - S }[from] || (() => true);
  const pylons = state.buildings.filter((p) => p.key === 'shieldpylon' && active(p)), near = cand.filter(side);
  return { exposed: near.filter((b) => !shielded(state, b, pylons)), shielded: near.filter((b) => shielded(state, b, pylons)) };
}
const bulwarkOf = (state, g) => (COMMANDER[fitCommander(state, g.commander)?.key]?.perk === 'bulwark' ? V3.bulwark : 1);
// The preview of the coming raid: { winChance, defence, attack, expectedLost: [types], expectedDamage,
// tribute: { credits, food }, ... } or null when no raid is coming.
export function raidPreview(state) {
  upgradeState(state);
  const raid = state.raid.coming;
  if (!raid) return null;
  const d = defenceOf(state, raid), a = raid.strength, p = winChance(d.total, a), crew = homeCrew(state);
  const hurt = (RAID.hurt * a) / (a + d.total || 1) * (p + (1 - p) * RAID.hurtLost);
  const expectedLost = state.guardians.filter((g) => crew.has(g.id) && hurt * bulwarkOf(state, g) >= g.hp / maxHp(state, g)).map((g) => g.type);
  const t = raidTargets(state, raid.from), tribute = tributeOf(state, raid);
  const meanHits = (RAID.damage[0] + RAID.damage[1]) / 2;
  return {
    winChance: p, defence: d.total, attack: a, expectedLost,
    expectedDamage: round1((1 - p) * Math.min(meanHits, t.exposed.length)),   // buildings likely knocked out
    tribute, canPay: state.stock.credits >= tribute.credits || state.stock.food >= tribute.food,
    atRisk: t.exposed.length, shielded: t.shielded.length, breakdown: d, raid,
    eta: Math.max(0, raid.day - state.day), units: raid.units.length,
  };
}
// Happiness lines that fade: [{ label, value, day, days }] (raid fear, tribute shame).
function mood(state, label, value) { state.raid.moods.push({ label, value, day: state.day, days: RAID.fear.days }); }
export const raidName = (raid) => `${RAID_TIER[raid.tier]?.name || 'Raiders'} (${FACTIONS[raid.faction]?.name || raid.faction})`;

function fight(state, raid, rng) {
  const d = defenceOf(state, raid), a = raid.strength, p = winChance(d.total, a), won = rng() < p;
  const crew = homeCrew(state), share = a / (a + d.total || 1);
  const lostGuardians = [], hurtGuardians = [];
  for (const g of state.guardians.filter((x) => crew.has(x.id))) {
    const max = maxHp(state, g), led = fitCommander(state, g.commander);
    const frac = RAID.hurt * share * (won ? 1 : RAID.hurtLost) * (0.5 + rng()) * bulwarkOf(state, g);
    g.hp = round1(g.hp - max * frac);
    if (g.hp <= 0.05) {
      lostGuardians.push(g.type);
      if (g.commander) {
        const c = serving(state, g.commander);
        if (c) c.injured = between(rng, V3.injury);
        log(state, `${nameOf(g.commander)} was pulled from the wreck of the ${machineOf(state, g.type).name}: injured for ${c?.injured} days.`);
      }
      state.guardians.splice(state.guardians.indexOf(g), 1);
    } else {
      if (g.hp < max) hurtGuardians.push(g.id);
      g.level = Math.min(V3.maxLevel, (g.level || 0) + (led ? 2 : 1));
    }
  }
  // version 5: how many raiders die (the rest go home to their base)
  const n = raid.units.length, K = BASE_RAIDS.kill;
  const killed = Math.min(n, won ? Math.max(1, Math.round(n * (K.won[0] + K.won[1] * p))) : Math.round(n * K.lost * p));
  return raidOutcome(state, raid, { won, winChance: p, defence: Math.round(d.total), lostGuardians, hurt: hurtGuardians, killed: raid.units.map((_, i) => i).slice(0, killed) }, rng);
}
// What a raid leaves behind, fought by the dice or on the battle map: salvage for the raiders killed on a
// win; on a loss, stores stolen and buildings knocked out. The survivors go home to their base.
function raidOutcome(state, raid, o, rng) {
  const a = raid.strength, won = o.won, killedIdx = o.killed || [];
  const report = { day: state.day, won, from: raid.from, faction: raid.faction, tier: raid.tier, strength: a, defence: o.defence ?? 0, winChance: o.winChance ?? null,
    lostGuardians: o.lostGuardians || [], hurt: o.hurt || [], damaged: [], stolen: {}, salvage: { credits: 0, parts: 0 }, tribute: null,
    killed: killedIdx.length, sent: raid.units.length, fled: !!o.fled, manual: !!o.manual, base: raid.base || null };
  raidersHome(state, raid, killedIdx.length);
  if (won) {
    const hunter = state.commanders.some((c) => !(c.injured > 0) && COMMANDER[c.key]?.perk === 'hunter') ? RAID.hunter : 1;
    // salvage from the wrecks: the raiders killed (a fled band leaves little behind)
    const value = killedIdx.reduce((t, i) => t + (MACHINE[raid.units[i]?.type]?.price || 0), 0);
    report.salvage = { credits: Math.round(value * RAID.salvage.credits * hunter), parts: Math.round(value * RAID.salvage.parts * hunter) };
    state.stock.credits += report.salvage.credits; state.stock.parts += report.salvage.parts;
    mood(state, 'Raid', RAID.fear.won);
    state.raid.won++;
  } else {
    const frac = RAID.steal[0] + rng() * (RAID.steal[1] - RAID.steal[0]);
    for (const g of ['food', 'parts', 'alloy', 'credits']) {
      const n = Math.floor((state.stock[g] || 0) * frac);
      if (n > 0) { state.stock[g] -= n; report.stolen[g] = n; }
    }
    const pool = raidTargets(state, raid.from).exposed;
    for (let k = between(rng, RAID.damage); k > 0 && pool.length; k--) {
      const b = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      b.damaged = between(rng, RAID.damageDays);
      report.damaged.push(b.id);
    }
    mood(state, 'Raid fear', RAID.fear.lost);
    state.raid.lost++;
  }
  return report;
}

// Answer the raid at the gates: 'fight' (auto-resolve with the colony's dice) or 'tribute'. Also
// reached through answer() on the raid's pending event; the sim fights a raid left unanswered.
export function answerRaid(state, choice, rng = stateRng(state)) {
  upgradeState(state);
  const rd = state.raid, raid = rd.coming;
  if (!raid) return no('No raiders are coming.');
  if (state.day < raid.day) return no(`The raiders are still ${raid.day - state.day} day${raid.day - state.day === 1 ? '' : 's'} out: answer them when they arrive.`);
  let report, text;
  const who = raidName(raid);
  if (choice === 'tribute') {
    const t = tributeOf(state, raid);
    let paid;
    if (state.stock.credits >= t.credits) paid = { credits: t.credits, food: 0 };
    else if (state.stock.food >= t.food) paid = { credits: 0, food: t.food };
    else return no(`Eden cannot pay: they want ${t.credits} credits or ${t.food} food. Fight them.`);
    state.stock.credits -= paid.credits; state.stock.food -= paid.food;
    rd.heat = Math.min(100, rd.heat + RAID.tributeHeat);
    mood(state, 'Tribute paid', RAID.fear.tribute);
    rd.paid++;
    raidersHome(state, raid, 0);
    report = { day: state.day, won: false, from: raid.from, faction: raid.faction, tier: raid.tier, strength: raid.strength, defence: 0, winChance: 0,
      lostGuardians: [], hurt: [], damaged: [], stolen: {}, salvage: { credits: 0, parts: 0 }, tribute: paid };
    text = `${who} took ${paid.credits ? `${paid.credits} credits` : `${paid.food} food`} and left. Word of an easy mark gets around: heat +${RAID.tributeHeat}.`;
  } else if (choice === 'fight') {
    report = fight(state, raid, rng);
    const lost = report.lostGuardians.length ? ` Lost: ${report.lostGuardians.map((t) => machineOf(state, t).name).join(', ')}.` : '';
    text = report.won
      ? `The guard beat off ${who}: ${report.killed} of ${report.sent} destroyed. Salvage: ${report.salvage.credits} credits and ${report.salvage.parts} parts.${lost}`
      : `${who} broke through.${Object.keys(report.stolen).length ? ` Stolen: ${Object.entries(report.stolen).map(([g, n]) => `${n} ${g}`).join(', ')}.` : ''}${report.damaged.length ? ` ${report.damaged.length} building${report.damaged.length > 1 ? 's' : ''} knocked out until repaired.` : ''}${lost}`;
  } else return no('Fight them or pay tribute.');
  rd.count++; rd.last = report; rd.coming = null; rd.warned = false;
  rd.next = state.day + raidInterval(state, rng);
  state.pending = state.pending.filter((p) => p.kind !== 'raid');
  log(state, text);
  return ok(text, { report });
}

// Version 5: the raid fought on the battle map (js/colony/battle.js, game.html?colony=1). `result`:
// { day, won, fled, turns, killed: [indices into raid.units], guardians: [{ id, hp: 0..1, lost }] }.
export function resolveRaidBattle(state, result) {
  upgradeState(state);
  const rd = state.raid, raid = rd.coming;
  if (!raid || !raid.battle) return no('No battle is being fought.');
  const lostGuardians = [], hurt = [];
  for (const r of result?.guardians || []) {
    const g = state.guardians.find((x) => x.id === r.id);
    if (!g) continue;
    const max = maxHp(state, g);
    if (r.lost || !(r.hp > 0)) {
      lostGuardians.push(g.type);
      if (g.commander) {
        const c = serving(state, g.commander);
        if (c) c.injured = between(stateRng(state), V3.injury);
        log(state, `${nameOf(g.commander)} was pulled from the wreck of the ${machineOf(state, g.type).name}: injured for ${c?.injured} days.`);
      }
      state.guardians.splice(state.guardians.indexOf(g), 1);
    } else {
      g.hp = round1(Math.min(max, Math.max(0.1, r.hp * max)));
      if (g.hp < max) hurt.push(g.id);
      g.level = Math.min(V3.maxLevel, (g.level || 0) + (fitCommander(state, g.commander) ? 2 : 1));
    }
  }
  const killed = [...new Set((result?.killed || []).filter((i) => i >= 0 && i < raid.units.length))];
  const won = !!result?.won;
  const report = raidOutcome(state, raid, { won, fled: !!result?.fled, manual: true, killed, lostGuardians, hurt, defence: Math.round(defenceOf(state, raid).total), winChance: null }, stateRng(state));
  const who = raidName(raid), lost = lostGuardians.length ? ` Lost: ${lostGuardians.map((t) => machineOf(state, t).name).join(', ')}.` : '';
  const text = won
    ? `${result.fled ? `${who} broke off and ran` : `The guard destroyed ${who}`}: ${killed.length} of ${raid.units.length} raiders destroyed in ${result.turns || '?'} turns. Salvage: ${report.salvage.credits} credits and ${report.salvage.parts} parts.${lost}`
    : `${who} broke through the guard.${Object.keys(report.stolen).length ? ` Stolen: ${Object.entries(report.stolen).map(([g, n]) => `${n} ${g}`).join(', ')}.` : ''}${report.damaged.length ? ` ${report.damaged.length} building${report.damaged.length > 1 ? 's' : ''} knocked out until repaired.` : ''}${lost}`;
  rd.count++; rd.last = report; rd.coming = null; rd.warned = false;
  rd.next = state.day + raidInterval(state, stateRng(state));
  state.pending = state.pending.filter((p) => p.kind !== 'raid');
  log(state, text);
  return ok(text, { report });
}

// ---------------------------------------------------------------- stage 2: Directorate sentries

// Sentry drones guarding a lower chamber (js/colony/secrets.js): the crewed guardians at home fight them,
// auto-resolved like a raid (no batteries: the hull guns cannot reach inside). Easy's drones are × 0.6.
export const DRONES = { wear: 0.5, salvage: { credits: 0.5, parts: 0.1 } };
export const droneAttack = (state, d) => Math.round((d.strength || 0) * RAID.strength[dkey(state)]);
function droneDefence(state) {
  const crew = homeCrew(state);
  let g = 0;
  for (const x of state.guardians) if (crew.has(x.id)) g += guardianPower(state, x);
  return { total: g * deptMult(state, 'security'), crew };
}
const hunterMult = (state) => (state.commanders.some((c) => !(c.injured > 0) && COMMANDER[c.key]?.perk === 'hunter') ? RAID.hunter : 1);
const droneSalvage = (state, d) => ({ credits: Math.round(d.strength * DRONES.salvage.credits * hunterMult(state)), parts: Math.round(d.strength * DRONES.salvage.parts * hunterMult(state)) });
// { attack, defence, winChance, crewed, expectedLost: [types], salvage } for a danger of kind 'drones'.
export function dronesPreview(state, d) {
  const a = droneAttack(state, d), def = droneDefence(state), p = winChance(def.total, a);
  const hurt = (RAID.hurt * a) / (a + def.total || 1) * (p + (1 - p) * RAID.hurtLost);
  const expectedLost = state.guardians.filter((g) => def.crew.has(g.id) && hurt * bulwarkOf(state, g) >= g.hp / maxHp(state, g)).map((g) => g.type);
  return { attack: a, defence: def.total, winChance: p, crewed: def.crew.size, expectedLost, salvage: droneSalvage(state, d) };
}
// The fight: guardians are hurt as in a raid (lost when their HP runs out); a win clears the chamber and
// pays salvage, a loss wears the sentries down (strength × (1 − 0.5 × our share)).
export function fightDrones(state, d, rng) {
  const def = droneDefence(state), a = droneAttack(state, d), p = winChance(def.total, a), won = rng() < p;
  const share = a / (a + def.total || 1), lostGuardians = [], hurtGuardians = [];
  for (const g of state.guardians.filter((x) => def.crew.has(x.id))) {
    const max = maxHp(state, g), led = fitCommander(state, g.commander);
    g.hp = round1(g.hp - max * RAID.hurt * share * (won ? 1 : RAID.hurtLost) * (0.5 + rng()) * bulwarkOf(state, g));
    if (g.hp <= 0.05) {
      lostGuardians.push(g.type);
      if (g.commander) {
        const c = serving(state, g.commander);
        if (c) c.injured = between(rng, V3.injury);
        log(state, `${nameOf(g.commander)} was pulled from the wreck of the ${machineOf(state, g.type).name}: injured for ${c?.injured} days.`);
      }
      state.guardians.splice(state.guardians.indexOf(g), 1);
    } else {
      if (g.hp < max) hurtGuardians.push(g.id);
      g.level = Math.min(V3.maxLevel, (g.level || 0) + (led ? 2 : 1));
    }
  }
  const report = { day: state.day, won, attack: a, defence: Math.round(def.total), winChance: p, lostGuardians, hurt: hurtGuardians, salvage: { credits: 0, parts: 0 } };
  if (won) {
    report.salvage = droneSalvage(state, d);
    state.stock.credits += report.salvage.credits; state.stock.parts += report.salvage.parts;
  } else d.strength = Math.max(1, Math.round(d.strength * (1 - DRONES.wear * (1 - share))));
  return report;
}

// What the Raids tab shows: { possible, heat, target, warned, coming, eta, last, count, won, lost, paid }.
export function raidStatus(state) {
  upgradeState(state);
  const rd = state.raid, h = heatTarget(state);
  return { possible: raidsPossible(state), on: raidsOn(state), peace: BASE_RAIDS.peace, bases: basesStatus(state), heat: rd.heat, target: h.target, heatParts: h.parts, warned: rd.warned, coming: rd.coming,
    eta: rd.coming ? Math.max(0, rd.coming.day - state.day) : null, last: rd.last, count: rd.count, won: rd.won, lost: rd.lost, paid: rd.paid, lead: warnLead(state) };
}

// Fusion Reactor output share: its helium today (set by the sim; before a first day, whether there is
// any helium), × 1.5 in overdrive.
export const fusionFactor = (state, b) => (b.fuel ?? (state.stock.helium > 0 ? 1 : 0)) * (b.mode === 'overdrive' ? 1.5 : 1);
