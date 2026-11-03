// Earthlight Space Colony Rebuild: a new colony, and saving / loading one (docs/COLONY-V1.md
// "state.js"). Pure ES module: no DOM (localStorage only behind the two small store helpers).
import { generateMap } from './mapgen.js';
import { BUILDING, BUILDINGS } from './data/buildings.js';
import { T } from './data/terrain.js';
import { findSpot, log, unitPrice, chamberOf, addPending, placeCheck, occupancy, tilesOf } from './rules.js';
import { farmSoil } from './sim.js';

export const SAVE_KEY = 'el-colony';
export const TITLE = 'Earthlight Space Colony Rebuild';
// Starting numbers (tuned by tests/colony-sim.mjs).
export const START = { stock: { food: 300, water: 300, air: 200, parts: 250, ore: 0, credits: 3000 }, pop: 40, tax: 0.10 };
const ROSTER_KEYS = ['el-expansion-campaign-remnant', 'el-expansion-campaign'];

// The expansion roster inside a parsed save file's data, or null.
export function readRoster(data) {
  if (!data || typeof data !== 'object') return null;
  for (const k of ROSTER_KEYS) {
    if (!(k in data)) continue;
    let camp;
    try { camp = typeof data[k] === 'string' ? JSON.parse(data[k]) : data[k]; } catch { continue; }
    if (Array.isArray(camp?.roster)) return camp.roster;
  }
  return null;
}

// importSave: parsed save `data` (js/savefile.js). types: the expansion's units ([{ type, value, hp }]
// or units.json's `units`) for machine prices; 24 a machine without it. generate: the map generator.
export function newGame({ seed = 1, importSave = null, beta = false, types = null, generate = generateMap } = {}) {
  const { map, chambers, start } = generate(seed);
  const state = {
    v: 1, seed, title: TITLE, day: 0, speed: 1, tax: START.tax,
    map, chambers, buildings: [], nextId: 1,
    stock: { ...START.stock }, battery: 0, pop: START.pop, housing: 0,
    happy: 50, happyParts: [],
    market: { ore: 1, food: 1, parts: 1, water: 1, air: 1 },
    unlocked: BUILDINGS.filter((d) => !d.fixed && !d.unlock).map((d) => d.key),
    log: [], pending: [], stats: { last: { produced: {}, consumed: {} } },
    imported: null, guardians: [], flags: { short: { food: 0, water: 0, air: 0, power: 0 } },
  };
  const put = (key, x, y) => {
    const d = BUILDING[key], b = { id: state.nextId++, key, x, y, level: 1, mode: d.modes ? d.modes[0].key : null, build: 0, off: false };
    state.buildings.push(b);
    return b;
  };
  const cmd = put('command', start.command.x, start.command.y);
  put('dock', start.dock.x, start.dock.y);
  // The rest of the start goes near the Command Centre: the pump on the river, the farm on the best
  // soil, the habitats on ground a farm would not want.
  const land = chamberOf(state, typeof start.landing === 'object' ? start.landing.id : start.landing) || chambers.find((c) => c.status === 'open');
  const box = { x0: land.x0, y0: land.y0, x1: land.x1, y1: land.y1 };
  const cx = cmd.x + 1.5, cy = cmd.y + 1.5, dist = (x, y, s = 1) => Math.abs(x + s / 2 - cx) + Math.abs(y + s / 2 - cy);
  const { t, w } = map;
  const keepClear = (x, y) => (t[y * w + x] === T.FERTILE ? 30 : 0) + ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => t[(y + dy) * w + x + dx] === T.RIVER) ? 20 : 0);
  const at = (key, score) => { const p = findSpot(state, key, { box, score, free: true }); if (p) put(key, p.x, p.y); };
  at('riverpump', (x, y) => dist(x, y));
  at('farm', (x, y) => -farmSoil(state, { key: 'farm', x, y }) * 100 + dist(x, y, 2));
  at('habitat', (x, y) => dist(x, y) + keepClear(x, y));
  at('habitat', (x, y) => dist(x, y) + keepClear(x, y));
  layStarterRoads(state, cmd);

  const roster = readRoster(importSave);
  if (roster) {
    const prices = {};
    for (const r of roster) prices[r.type] = unitPrice(types, r.type);
    const credits = beta ? 0 : 10 * roster.reduce((s, r) => s + prices[r.type], 0);
    state.imported = { credits, beta: !!beta, units: roster.length, prices };
    if (beta) state.guardians = JSON.parse(JSON.stringify(roster));
    state.stock.credits += credits;
    log(state, beta ? `The guard arrives: ${roster.length} machines of the old army.` : `The old army was sold for ${credits} credits.`);
  }
  state.housing = state.buildings.reduce((s, b) => s + (BUILDING[b.key].housing || 0), 0);
  log(state, 'Landfall. The Command Centre is running; Eden waits behind its bulkheads.');
  // A first word from Ruess: what to do in the first weeks (the event pauses the clock, D1).
  const hello = addPending(state, 'welcome', 'Landfall', 'Governor, the Command Centre keeps us breathing for now, but the food stores last about three weeks. '
    + 'Plant Farm Fields on the fertile banks of the river and build Habitats for the next transport. '
    + 'A park or a grove beside the homes lets them grow. When we have the parts, survey the next chamber, '
    + 'seal its breaches and pump in air: every chamber we give back is more room to live.');
  hello.speaker = 'ruess';
  return state;
}

// The landing crews' first road: the shortest paths over open floor from the Command Centre to the
// dock and every other starting building, as one tree. People and rovers move only on roads (D16),
// so the colony shows life from the first day and the player sees what roads are for.
function layStarterRoads(state, cmd) {
  const { w, h } = state.map, occ = occupancy(state), road = new Uint8Array(w * h);
  const free = (i) => placeCheck(state, 'road', i % w, (i / w) | 0, { occ, free: true }) === null;
  const around = (b) => {
    const inside = new Set(tilesOf(state, b)), out = new Set();
    for (const i of inside) for (const j of [i - 1, i + 1, i - w, i + w]) if (!inside.has(j) && j >= 0 && j < w * h) out.add(j);
    return out;
  };
  const lay = (i) => {
    if (road[i]) return;
    const r = { id: state.nextId++, key: 'road', x: i % w, y: (i / w) | 0, level: 1, mode: null, build: 0, off: false };
    state.buildings.push(r); occ[i] = r.id; road[i] = 1;
  };
  const seeds = [...around(cmd)].filter(free);
  if (!seeds.length) return;
  const targets = state.buildings.filter((b) => b !== cmd && b.key !== 'road')
    .sort((a, b) => Math.abs(a.x - cmd.x) + Math.abs(a.y - cmd.y) - Math.abs(b.x - cmd.x) - Math.abs(b.y - cmd.y));
  for (const b of targets) {
    const goal = around(b), prev = new Int32Array(w * h).fill(-2), queue = [];
    for (let i = 0; i < w * h; i++) if (road[i]) { prev[i] = -1; queue.push(i); }
    if (!queue.length) for (const i of seeds) { prev[i] = -1; queue.push(i); }
    let hit = -1;
    for (let q = 0; q < queue.length && hit < 0; q++) {
      const i = queue[q];
      if (goal.has(i)) { hit = i; break; }
      for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && prev[j] === -2 && free(j)) { prev[j] = i; queue.push(j); }
    }
    for (let i = hit; i >= 0; i = prev[i]) lay(i);   // no path: that building waits for the player's roads
  }
}

// ---------------------------------------------------------------- save / load

const MAP_ARRAYS = ['t', 'r', 'ch', 'sv'];
function toB64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(str) {
  const bin = atob(str), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

export function saveState(state) {
  const map = { ...state.map };
  for (const k of MAP_ARRAYS) map[k] = toB64(state.map[k]);
  return JSON.stringify({ ...state, map });
}

export function loadState(text) {
  const s = typeof text === 'string' ? JSON.parse(text) : text;
  if (!s || s.v !== 1 || !s.map) throw new Error('This is not an Earthlight colony save.');
  for (const k of MAP_ARRAYS) s.map[k] = fromB64(s.map[k]);
  return s;
}

// localStorage helpers (browser only; quietly do nothing elsewhere).
export function storeGame(state) {
  try { localStorage.setItem(SAVE_KEY, saveState(state)); return true; } catch { return false; }
}
export function restoreGame() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? loadState(s) : null; } catch { return null; }
}
