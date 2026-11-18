// Command the battle (docs/COLONY-V5.md §2): a raid at Eden's gates fought as an Earth Light battle
// on the expansion's hex engine (game.html?colony=1, js/expansion/battle.js), then back to the colony.
//
//   raidMission(state, raid)  the mission JSON (js/expansion/mission.js format): a small space map
//                             built for the attack direction, Eden's crewed guardians (army 0) around
//                             the station, the raiders (army 1) at their edge. Pure.
//   commandBattle(state, save) stores the mission (localStorage RAID_KEY), marks raid.battle, saves
//                             the colony (save()) and opens the battle page.
//   canCommand()              async: is the Earth Light pack (or a ROM to build it from) in this browser?
//
// The battle page writes RESULT_KEY = { day, won, fled, turns, killed: [raid.units indices],
// guardians: [{ id, hp: 0..1, lost }] }; main.js hands it to R.resolveRaidBattle.
import * as R from './rules.js';
import { MACHINE } from './data/machines.js';

export const RAID_KEY = 'el-colony-raid', RESULT_KEY = 'el-colony-raid-result';
export const BATTLE_URL = 'game.html?colony=1';

// ---------------------------------------------------------------- the map
// 2 x 2 screens: columns 1..29 and rows 1..20 are playable; the grid holds rows 0..21 x columns 0..31.
const SW = 2, SH = 2, COLS = SW * 15, ROWS = SH * 10;
// [graphic, terrain id] pairs taken from the original's maps (each keeps the ROM's meaning).
const PAIRS = [
  [0, 0], [1, 0], [2, 0], [3, 0],            // 0-3 void (plain, star fields)
  [64, 13],                                  // 4 fortress deck (Eden's dock)
  [123, 19], [104, 19], [122, 19],           // 5-7 turret railway: top end, straight, bottom end
  [6, 3], [5, 2], [4, 1], [16, 4], [17, 5],  // 8 asteroid, 9 meteoroids, 10 magnetic field, 11 plasma, 12 gravity flux
  [19, 11], [20, 11], [21, 11], [22, 11], [23, 11], [24, 11], [25, 11], [26, 11],   // 13-20 atmosphere, drawn as such
  [27, 11], [28, 11], [29, 11], [30, 11],    // 21-24 Earth
];
// No hiding (owner, 2026-11-06): the atmosphere's own terrain (class 6) can't be attacked by anything,
// so raiders sheltering in it were immune. On raid maps the band is drawn as the original's
// atmosphere but carries Earth's terrain id (class 12, Earth's gravity field: nobody enters, no
// shot passes): an unstandable edge band. Its top row's neighbours count as the map's edge for
// leaving the battle (js/expansion/battle.js edgeHex). Magnetic fields (beam weapons can't target
// them) are not placed either, and every rock or field hex keeps an open hex beside it that Eden
// can reach, so a raider standing anywhere can be hit by any guardian able to hit it in open space.
const V = { deck: 4, railTop: 5, rail: 6, railEnd: 7, asteroid: 8, meteor: 9, magnetic: 10, plasma: 11, gravity: 12 };
// Earth side (the original's atmosphere band, as on the Atmosphere and Wreck maps): rows from the
// top of the band, [even column, odd column]; the last three rows are Earth itself (impassable).
const EARTH_BAND = [[13, 14], [15, 16], [17, 18], [19, 20], [21, 22], [23, 24], [24, 24]];
// What may stand where: void, deck and railway for every machine but the rail guns (category 14),
// which stand on railway only. (The atmosphere band is unstandable, above.)
const STANDABLE = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
const OPEN = (v) => v <= 7;   // void, deck, railway: every machine but the rail guns may stand there
const RAILS = new Set([5, 6, 7]);
const RAIL_ONLY = 14;   // Dragon, Hydra, Rahab

function rng32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (v) => { let h = 2166136261; for (const c of String(v)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
// Hex distance on the engine's grid (flat-top, odd columns shifted down: js/game/rules.js).
const cube = (x, y) => { const q = x, r = y - ((x - (x & 1)) >> 1); return [q, r, -q - r]; };
export function hexDistance(a, b) {
  const [q1, r1, s1] = cube(a.x, a.y), [q2, r2, s2] = cube(b.x, b.y);
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
}
const playable = (x, y) => x >= 1 && x <= COLS - 1 && y >= 1 && y <= ROWS;

// The map for an attack from `from` (north | east | west | earth): Eden's dock in the middle (a
// fortress deck with a turret railway down its centre for rail guns), drifting rocks and fields,
// and the raiders' start band at their edge. Same raid, same map.
export function raidMap(from, seed) {
  const rnd = rng32(seed), earth = from === 'earth';
  const grid = Array.from({ length: ROWS + 2 }, () => Array.from({ length: COLS + 2 }, () => { const r = rnd(); return r < 0.06 ? 1 : r < 0.12 ? 2 : r < 0.15 ? 3 : 0; }));
  const bandTop = earth ? ROWS + 2 - EARTH_BAND.length : ROWS + 2;   // first grid row of the Earth band
  if (earth) EARTH_BAND.forEach((pair, i) => { for (let x = 0; x <= COLS + 1; x++) grid[bandTop + i][x] = pair[x & 1]; });
  const centre = { x: 15, y: earth ? 7 : 10 };
  // the dock: 7 x 5 deck, the railway down column 15
  const dock = [];
  for (let y = centre.y - 2; y <= centre.y + 2; y++) for (let x = centre.x - 3; x <= centre.x + 3; x++) {
    grid[y][x] = x === centre.x ? (y === centre.y - 2 ? V.railTop : y === centre.y + 2 ? V.railEnd : V.rail) : V.deck;
    dock.push({ x, y });
  }
  // the raiders' band: three hexes deep along their edge (from Earth: just above the atmosphere)
  const band = (x, y) => (from === 'east' ? x >= COLS - 3 : from === 'west' ? x <= 3 : earth ? y >= bandTop - 3 && y < bandTop : y <= 3);
  // fields and rocks, kept off the dock's surroundings and the raiders' band (no magnetic fields: no hiding)
  const kinds = [V.asteroid, V.asteroid, V.meteor, V.plasma, V.gravity];
  for (let n = 0, tries = 0; n < 7 && tries < 200; tries++) {
    const c = { x: 1 + Math.floor(rnd() * (COLS - 1)), y: 1 + Math.floor(rnd() * ROWS) };
    if (c.y >= bandTop - 1 || hexDistance(c, centre) < 6 || band(c.x, c.y)) continue;
    const kind = kinds[Math.floor(rnd() * kinds.length)], r = kind === V.asteroid ? 2 : 1 + Math.floor(rnd() * 2);
    for (let y = c.y - r - 1; y <= c.y + r + 1; y++) for (let x = c.x - r; x <= c.x + r; x++) {
      if (!playable(x, y) || y >= bandTop || band(x, y) || hexDistance({ x, y }, centre) < 5 || hexDistance({ x, y }, c) > r) continue;
      if (kind === V.asteroid ? rnd() < 0.45 : rnd() < 0.85) grid[y][x] = kind;
    }
    n++;
  }
  openUp(grid, centre, bandTop);
  // start hexes: Eden's around the dock, nearest the raiders' side first; the raiders' along
  // their edge, nearest its middle first
  const edgeMid = from === 'east' ? { x: COLS - 1, y: centre.y } : from === 'west' ? { x: 1, y: centre.y } : earth ? { x: centre.x, y: bandTop - 1 } : { x: centre.x, y: 1 };
  const cells = [];
  for (let y = 1; y <= ROWS; y++) for (let x = 1; x <= COLS - 1; x++) cells.push({ x, y });
  const home = cells.filter((c) => hexDistance(c, centre) <= 6 && STANDABLE.has(grid[c.y][c.x]) && !RAILS.has(grid[c.y][c.x]) && !band(c.x, c.y))
    .sort((a, b) => hexDistance(a, centre) - hexDistance(b, centre) || hexDistance(a, edgeMid) - hexDistance(b, edgeMid) || a.y - b.y || a.x - b.x);
  const away = cells.filter((c) => band(c.x, c.y) && STANDABLE.has(grid[c.y][c.x]))
    .sort((a, b) => hexDistance(a, edgeMid) - hexDistance(b, edgeMid) || a.y - b.y || a.x - b.x);
  return { grid, centre, home, away, rails: dock.filter((c) => RAILS.has(grid[c.y][c.x])) };
}

// No pockets: every open hex joins the dock's open space, and every rock or field hex has a
// joined open hex beside it (else it is cleared to void), so a guardian of any kind can come
// alongside whatever stands there. Clears field hexes only, until nothing changes.
function openUp(grid, centre, bandTop) {
  const field = (x, y) => playable(x, y) && y < bandTop && !OPEN(grid[y][x]);
  for (let changed = true; changed;) {
    changed = false;
    const joined = new Set([`${centre.x},${centre.y}`]), q = [[centre.x, centre.y]];
    for (let i = 0; i < q.length; i++) for (const [a, b] of hexNeighbours(...q[i])) {
      if (!playable(a, b) || b >= bandTop || !OPEN(grid[b][a]) || joined.has(`${a},${b}`)) continue;
      joined.add(`${a},${b}`); q.push([a, b]);
    }
    for (let y = 1; y < bandTop && y <= ROWS; y++) for (let x = 1; x <= COLS - 1; x++) {
      const near = hexNeighbours(x, y).filter(([a, b]) => playable(a, b));
      if (OPEN(grid[y][x]) && !joined.has(`${x},${y}`)) {   // a pocket: clear the rocks around it
        for (const [a, b] of near) if (field(a, b)) { grid[b][a] = 0; changed = true; }
      } else if (field(x, y) && !near.some(([a, b]) => joined.has(`${a},${b}`))) { grid[y][x] = 0; changed = true; }
    }
  }
}
// The six neighbours on the engine's grid (odd columns shifted down).
function hexNeighbours(x, y) {
  const odd = x & 1;
  return [[x, y - 1], [x, y + 1], [x - 1, y - 1 + odd], [x - 1, y + odd], [x + 1, y - 1 + odd], [x + 1, y + odd]];
}

// ---------------------------------------------------------------- the mission
const clampLevel = (v) => Math.max(0, Math.min(9, Math.round(v || 0)));
const catOf = (type) => MACHINE[type]?.category ?? 0;
const hpOf = (type) => MACHINE[type]?.hp || 8;
const nameOf = (type) => MACHINE[type]?.name || `machine ${type}`;
const factionName = (f) => R.FACTIONS?.[f]?.name || f || 'raiders';
const fromText = (f) => R.FROM?.[f] || `the ${f || 'dark'}`;
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
// The General leads this guardian (serving and fit): the expansion's general rules apply to it.
function generalAboard(state, g) {
  if (g.commander !== 'general') return false;
  const fit = R.fitCommander ? R.fitCommander(state, 'general') : (state.commanders || []).find((c) => c.key === 'general' && !(c.injured > 0));
  return !!fit;
}

// The flee rule (also js/expansion/battle.js): Eden's living units at least twice the raiders'.
export const raidersFlee = (mine, theirs) => theirs > 0 && mine >= 2 * theirs;

export function raidMission(state, raid = state.raid?.coming) {
  if (!raid) throw new Error('No raiders are coming.');
  const from = ['north', 'east', 'west', 'earth'].includes(raid.from) ? raid.from : 'north';
  const map = raidMap(from, hash(`${state.flags?.rng ?? ''}|${raid.day}|${from}|${raid.units.length}`));
  const used = new Set(), units = [], left = { guardians: [], raiders: [] };
  const take = (list, type) => {
    const railOnly = catOf(type) === RAIL_ONLY;
    const c = list.find((p) => !used.has(`${p.x},${p.y}`) && (railOnly ? RAILS.has(map.grid[p.y][p.x]) : true));
    if (c) used.add(`${c.x},${c.y}`);
    return c || null;
  };
  // Eden: the crewed guardians at home; the General's machine placed first (the front hexes)
  const crew = R.homeCrew(state);
  const gs = state.guardians.filter((g) => crew.has(g.id) && g.hp > 0 && !g.away)
    .sort((a, b) => generalAboard(state, b) - generalAboard(state, a) || a.id - b.id);
  let general = null;
  for (const g of gs) {
    const c = take(catOf(g.type) === RAIL_ONLY ? map.rails : map.home, g.type);
    if (!c) { left.guardians.push(g.id); continue; }
    const max = hpOf(g.type), frac = Math.max(0, Math.min(1, g.hp / (R.maxHp(state, g) || max)));
    units.push({ type: g.type, army: 0, x: c.x, y: c.y, level: clampLevel(g.level), hp: Math.max(1, Math.min(max, Math.round(max * frac))), rosterId: g.id });
    if (!general && generalAboard(state, g)) general = { x: c.x, y: c.y };
  }
  // the raiders, each with its index in raid.units; rail guns have no rail at their edge and stay aboard
  raid.units.forEach((u, i) => {
    const c = catOf(u.type) === RAIL_ONLY ? null : take(map.away, u.type);
    if (!c) { left.raiders.push(i); return; }
    units.push({ type: u.type, army: 1, x: c.x, y: c.y, level: clampLevel(u.level), rosterId: i });
  });
  const who = cap1(factionName(raid.faction)), n = units.filter((u) => u.army === 1).length;
  const list = (arr) => { const c = new Map(); for (const u of arr) c.set(nameOf(u.type), (c.get(nameOf(u.type)) || 0) + 1); return [...c].map(([k, v]) => (v > 1 ? `${v} ${k}` : k)).join(', '); };
  const briefing = [
    `${who} are coming in from ${fromText(from)}: ${n} machine${n === 1 ? '' : 's'} (${list(units.filter((u) => u.army === 1))}).`,
    `Eden's guard stands at the dock: ${list(units.filter((u) => u.army === 0)) || 'nobody'}.${general ? ' The General flies with them.' : ''}${left.guardians.length ? ` ${left.guardians.length} rail gun${left.guardians.length === 1 ? '' : 's'} had no railway free and stay${left.guardians.length === 1 ? 's' : ''} home.` : ''}`,
    'Raiders want loot, not a war. Outnumber them two to one and they break off and run for the edge of the map: chase them down before they get away. Retreat and your machines have to fly off an edge under fire; once none is left, or the guard is lost, they are through the gates.',
  ].join('\n\n');
  return {
    version: 1, name: 'EDEN', title: 'Raid on Eden', chapter: `Eden · day ${state.day}`,
    screensW: SW, screensH: SH, pairs: PAIRS.map((p) => [...p]), grid: map.grid, units, arrivals: [],
    objective: { kind: 'annihilate' }, goal: 'Drive off the raiders: destroy them, or outnumber them two to one until they flee off the map.',
    turnLimit: 20, music: 0, general, briefing, flee: true,
    colony: { day: state.day, raidDay: raid.day, from, faction: raid.faction, tier: raid.tier, count: raid.units.length, left },
  };
}

// ---------------------------------------------------------------- to the battle and back
export function commandBattle(state, save = () => {}) {
  const raid = state.raid?.coming;
  if (!raid) return { ok: false, msg: 'No raiders are coming.' };
  if (state.day < raid.day) return { ok: false, msg: 'The raiders are not here yet.' };
  if (state.reckoning?.fighting) return { ok: false, msg: 'The Reckoning\'s battle is still being fought.' };
  const mission = raidMission(state, raid);
  if (!mission.units.some((u) => u.army === 0)) return { ok: false, msg: 'No crewed guardian is at home to fight.' };
  try {
    localStorage.setItem(RAID_KEY, JSON.stringify(mission));
    localStorage.removeItem(RESULT_KEY);
    localStorage.removeItem('el-colony-battle');   // an old raid's mid-battle save
  } catch (e) { return { ok: false, msg: `Could not store the battle: ${e.message}` }; }
  raid.battle = true;
  save();
  if (typeof location !== 'undefined') location.href = BATTLE_URL;
  return { ok: true, msg: 'To the battle.' };
}

// ---------------------------------------------------------------- the Reckoning's battles (docs/COLONY-V12.md)
// Two hand-made maps (missions/colony/siege.json, stronghold.json, written by tools/colony-reckoning-maps.mjs)
// filled in at launch with Eden's side: its crewed guardians at home (the siege and the automatic strike:
// up to RECKONING_CAP; a strike the player picked: any number, the overflow spilling outward; the General's
// machine first (on the map's `generalAt` hex), then the strongest; no rail guns on the stronghold's map: it has no railway for them), placed on the map's `home` hexes nearest-first (ships only where
// ships may stand, rail guns on `rails`); for the siege also the hull guns (one per working Battery
// Emplacement, Dragon or Hydra by its mode) on the lift shafts and the hull's gun points. The siege's
// waves are cut down when Eden fields fewer machines (each group keeps its `core` units and a share of
// the rest); the stronghold always brings everything (100+). Pure.
export const RECKONING_CAP = 40, RECKONING_FILES = { siege: 'missions/colony/siege.json', ambush: 'missions/colony/ambush.json', stronghold: 'missions/colony/stronghold.json' };
const SHIP_CATS = new Set([1, 2, 3, 4]);
const power = (g) => (MACHINE[g.type]?.price || 8) * (1 + (g.level || 0) / 5);
// Eden's crewed guardians at home, best first, the General's machine leading; `fixedOk`: rail guns may come
export function reckoningCrew(state, fixedOk = true) {
  const crew = R.homeCrew(state);
  return state.guardians.filter((g) => crew.has(g.id) && g.hp > 0 && !g.away && (fixedOk || catOf(g.type) !== RAIL_ONLY))
    .sort((a, b) => generalAboard(state, b) - generalAboard(state, a) || power(b) - power(a) || a.id - b.id).slice(0, RECKONING_CAP);
}
// The strike picker (js/colony/ui.js): every machine that may fly the strike (crewed, fit, at home, not
// a rail gun), best first, the General's machine leading (locked in: `general`). Pure.
export function strikeCandidates(state) {
  const crew = R.homeCrew(state);
  return state.guardians.filter((g) => crew.has(g.id) && g.hp > 0 && !g.away && catOf(g.type) !== RAIL_ONLY)
    .sort((a, b) => generalAboard(state, b) - generalAboard(state, a) || power(b) - power(a) || a.id - b.id)
    .map((g) => ({ g, general: generalAboard(state, g), power: Math.round(power(g)) }));
}
// The automatic choice (the picker's "Best 40"): the General's machine and the 39 strongest.
export const strikeBest = (state) => strikeCandidates(state).slice(0, RECKONING_CAP).map((c) => c.g.id);
// Everything that may fly (the picker's "All"; owner, 2026-11-18: "the player can pick everything in
// his/her armory").
export const strikeAll = (state) => strikeCandidates(state).map((c) => c.g.id);
// The player's choice, checked: known candidates only (others dropped), any number (no cap: the maps
// place them all, placeEden), the General's machine always in. { ok, msg, gs } with gs the machines in
// the automatic order.
export function strikeSelection(state, ids) {
  const want = new Set(ids || []), all = strikeCandidates(state);
  const gen = all.find((c) => c.general);
  const gs = all.filter((c) => c.general || want.has(c.g.id)).map((c) => c.g);
  if (!gen) return { ok: false, msg: 'The General\'s machine must lead the strike.', gs };
  return { ok: true, msg: `${gs.length} machine${gs.length === 1 ? '' : 's'}, the General leading.`, gs };
}
const strip = (u) => { const { core, ...rest } = u; return rest; };
export function siegeShare(n) { return Math.max(0.2, Math.min(1, (n + 4) / 44)); }
function cut(list, f) {
  const core = list.filter((u) => u.core), rest = list.filter((u) => !u.core);
  return [...core, ...rest.slice(0, Math.ceil(rest.length * f))].map(strip);
}
// More start hexes once `home` is full (the strike: any number of machines, owner 2026-11-18): open
// void (any machine may stand there) outward from the General's start hex, never within SPILL_CLEAR
// hexes of an enemy's start or arrival hex or a picket slot. Lazy; [x, y, 1].
const SPILL_CLEAR = 3;
function* spillHexes(base, used) {
  const cols = (base.screensW || 4) * 15, rows = (base.screensH || 3) * 10, g = base.grid;
  const foes = [...base.units.filter((u) => u.army !== 0), ...(base.arrivals || []).filter((a) => a.army !== 0).flatMap((a) => a.units), ...(base.slots || [])];
  const near = (x, y) => foes.some((u) => hexDistance(u, { x, y }) <= SPILL_CLEAR);
  const [x0, y0] = base.generalAt || base.home?.[0] || [1, 1], seen = new Set([`${x0},${y0}`]), q = [[x0, y0]];
  while (q.length) {
    const [x, y] = q.shift();
    if (g?.[y]?.[x] !== undefined && g[y][x] <= 3 && !used.has(`${x},${y}`) && !near(x, y)) yield [x, y, 1];
    for (const [nx, ny] of hexNeighbours(x, y)) if (nx >= 1 && nx <= cols - 1 && ny >= 1 && ny <= rows && !seen.has(`${nx},${ny}`)) { seen.add(`${nx},${ny}`); q.push([nx, ny]); }
  }
}
// Eden's machines on the map's start hexes (`home`, nearest first; rail guns on `rails`). spill: once
// `home` is full, place the rest outward (spillHexes) instead of leaving them at home (`left`).
function placeEden(state, base, gs, extraRails = [], hpOver = null, spill = false) {
  const used = new Set(base.units.map((u) => `${u.x},${u.y}`)), units = [], left = [];
  let general = null, more = null;
  const free = (x, y) => !used.has(`${x},${y}`);
  for (const g of gs) {
    const cat = catOf(g.type), rail = cat === RAIL_ONLY;
    const lead = !general && base.generalAt && generalAboard(state, g) && free(...base.generalAt) && !rail ? (base.home || []).find(([x, y, ships]) => x === base.generalAt[0] && y === base.generalAt[1] && (ships || !SHIP_CATS.has(cat))) : null;
    let c = lead || (rail ? (base.rails || []).map(([x, y]) => [x, y, 1]).find(([x, y]) => free(x, y))
      : (base.home || []).find(([x, y, ships]) => free(x, y) && (ships || !SHIP_CATS.has(cat)) && (cat !== RAIL_ONLY)));
    if (!c && spill && !rail) { more ??= spillHexes(base, used); do { c = more.next().value; } while (c && !free(c[0], c[1])); }
    if (!c) { left.push(g.id); continue; }
    used.add(`${c[0]},${c[1]}`);
    const max = hpOf(g.type), own = Math.max(0, Math.min(1, g.hp / (R.maxHp(state, g) || max)));
    const frac = hpOver?.has(g.id) ? Math.min(own, hpOver.get(g.id)) : own;   // pressing on: no repairs since the ambush
    units.push({ type: g.type, army: 0, x: c[0], y: c[1], level: clampLevel(g.level), hp: Math.max(1, Math.min(max, Math.round(max * frac))), rosterId: g.id });
    if (!general && generalAboard(state, g)) general = { x: c[0], y: c[1] };
  }
  const guns = [];
  for (const type of extraRails) {
    const c = (base.rails || []).find(([x, y]) => free(x, y));
    if (!c) break;
    used.add(`${c[0]},${c[1]}`);
    guns.push({ type, army: 0, x: c[0], y: c[1], level: 4, gun: true, name: type === 24 ? 'Hydra · hull gun' : 'Dragon · hull gun' });
  }
  return { units, guns, left, general };
}
const easyLevels = (state, list) => (state.difficulty === 'easy' ? list.map((u) => ({ ...u, level: Math.max(0, (u.level || 0) - 2) })) : list);

export function siegeMission(state, base) {
  const gs = reckoningCrew(state), r = state.reckoning || {};
  const guns = state.buildings.filter((b) => b.key === 'emplacement' && b.build === 0 && !b.off && !(b.damaged > 0)).map((b) => (b.mode === 'hydra' ? 24 : 23));
  const eden = placeEden(state, base, gs, guns);
  const f = siegeShare(eden.units.length);
  const fixed = base.units.filter((u) => u.army === 0), foes = easyLevels(state, cut(base.units.filter((u) => u.army === 1), f));
  const arrivals = base.arrivals.map((a) => ({ turn: a.turn, army: a.army, units: easyLevels(state, cut(a.units, f)) }));
  const n = foes.length + arrivals.reduce((t, a) => t + a.units.length, 0);
  const tries = (r.sieges || []).length;
  return {
    ...base, counter: undefined, units: [...eden.units, ...eden.guns, ...fixed.map(strip), ...foes], arrivals, general: eden.general,
    briefing: `${base.briefing}\n\nEden fields ${eden.units.length} guardian${eden.units.length === 1 ? '' : 's'}${eden.guns.length ? ` and ${eden.guns.length} hull gun${eden.guns.length === 1 ? '' : 's'}` : ''}${eden.general ? ', the General leading' : ''}. Hesk brings ${n} machines${tries ? ', and he has done this before' : ''}.`,
    colony: { day: state.day, battle: 'siege', from: 'north', count: n, guns: eden.guns.length, left: { guardians: eden.left, raiders: [] } },
  };
}
// The counterstrike (after a regroup): the Siege of Eden's map with the counterstrike's own waves (base.counter),
// the picket's survivors from the ambush (state.reckoning.survivors) in front, scaled as the siege is.
export function counterMission(state, siegeBase) {
  const c = siegeBase.counter, r = state.reckoning || {};
  const base = { ...siegeBase, title: c.title, chapter: c.chapter, objective: c.objective, goal: c.goal, briefing: c.briefing, strategy: c.strategy, transmission: c.transmission };
  delete base.counter;
  const survivors = (r.survivors || []).slice(0, c.follow.length).map((u, i) => ({ type: u.type, level: Math.min(9, (u.level || 0) + (state.difficulty === 'easy' ? 2 : 0)), x: c.follow[i][0], y: c.follow[i][1], core: 1, ...(u.name ? { name: u.name } : {}) }));   // their levels as they flew (siegeMission lowers Easy's again)
  const m = siegeMission(state, { ...base, units: [...siegeBase.units.filter((u) => u.army === 0), ...[...survivors, ...c.units].map((u) => ({ ...u, army: 1 }))], arrivals: c.arrivals });
  const flew = m.units.filter((u) => u.army === 1 && c.follow.some(([x, y]) => x === u.x && y === u.y)).length;
  m.briefing = `${m.briefing}${flew ? `\n\n${flew} of them flew the ambush.` : ''}`;
  m.colony = { ...m.colony, battle: 'counter', survivors: flew };   // the survivors always come (core): they are what is left of the picket
  return m;
}

// Phase 1 of the strike: the ambush (missions/colony/ambush.json). Hesk's picket is a fixed force (owner,
// 2026-11-18: "the ambush no need to scale anymore"): RECKONING.ambushSize machines on the map's first
// slots (the slots' order keeps all four directions), each slot's role filled by a machine of the tier
// RECKONING.ambushTiers gives it in turn (heavy, middle, light), at RECKONING.ambushLevel. The strike
// force is whatever the player picked (opts.ids, strikeSelection: any number), else the automatic best 40:
// bring more and it is easier, fewer and it is harder. Pure.
export const AMBUSH_TYPES = {   // role -> [light, mid, heavy] (price ~8 | ~16-24 | ~32-66)
  craft: [[8, 9], [12, 4, 10], [73, 66, 67]], mecha: [[0, 3, 1], [2, 60], [60, 80, 69, 68]],
  armour: [[16, 15], [70, 16], [70]], ship: [[49, 39, 50], [42, 31, 38], [30, 72, 31, 33]],
};
export const ambushCount = () => R.RECKONING.ambushSize ?? 60;
export function ambushMission(state, base, opts = {}) {
  const gs = opts.ids ? strikeSelection(state, opts.ids).gs : reckoningCrew(state, false), eden = placeEden(state, base, gs, [], null, true);
  const n = eden.units.length, lv = R.RECKONING.ambushLevel ?? 5, tiers = R.RECKONING.ambushTiers || [2, 1, 0];
  const want = Math.min(base.slots.length, ambushCount());
  const hold = new Map(base.waves.filter((w) => w.hold).map((w) => [w.key, w.hold]));
  const units = base.slots.slice(0, want).map((sl, i) => {
    const list = AMBUSH_TYPES[sl.role][tiers[i % tiers.length]];
    return { type: list[Math.floor(i / 8) % list.length], army: 1, x: sl.x, y: sl.y, level: Math.min(9, lv + (sl.name ? 1 : 0)), ...(sl.name ? { name: sl.name } : {}), ...(hold.has(sl.wave) ? { hold: hold.get(sl.wave) } : {}) };
  });
  const lowered = easyLevels(state, units);
  const turnOf = new Map(base.waves.map((w) => [w.key, w.turn]));
  const byWave = (k) => lowered.filter((_, i) => base.slots[i].wave === k);
  const arrivals = base.waves.filter((w) => w.turn > 0).map((w) => ({ turn: w.turn, army: 1, wave: w.key, units: byWave(w.key).map(({ army, ...u }) => u) })).filter((a) => a.units.length);
  const first = base.waves.filter((w) => !turnOf.get(w.key)).flatMap((w) => byWave(w.key));
  const { slots, waves, ...rest } = base;
  return {
    ...rest, units: [...eden.units, ...first], arrivals, general: eden.general,
    briefing: `${base.briefing}\n\nThe strike force: ${n} machine${n === 1 ? '' : 's'}, the General leading. The picket: ${want}.`,
    colony: { day: state.day, battle: 'ambush', from: 'east', count: want, left: { guardians: eden.left, raiders: [] } },
  };
}

// Phase 2: Hesk's stronghold. opts.fleet [{ id, hp }]: the General pressed on after the ambush: only
// those machines, at no more than the HP they came out with. opts.ids: the machines the player picked
// (strikeSelection: any number; ignored when pressing on), else the automatic best 40. opts.reinforce n: the base had time (a regroup, a failed assault): the first
// RECKONING.reinforceStep x n of base.reinforcements join the garrison, every enemy n levels higher (at most 9).
export function strongholdMission(state, base, opts = {}) {
  const r = state.reckoning || {}, fleet = opts.fleet ?? (r.onward ? r.fleet : null);
  const reinforce = opts.reinforce ?? r.reinforce ?? 0;
  let gs = opts.ids && !fleet ? strikeSelection(state, opts.ids).gs : reckoningCrew(state, false), hpOver = null;
  if (fleet) {
    const ids = new Set(fleet.map((f) => f.id));
    gs = state.guardians.filter((g) => ids.has(g.id) && g.hp > 0 && !g.away && catOf(g.type) !== RAIL_ONLY)
      .sort((a, b) => generalAboard(state, b) - generalAboard(state, a) || power(b) - power(a) || a.id - b.id);   // all of them: no cap
    hpOver = new Map(fleet.map((f) => [f.id, f.hp]));
  }
  const eden = placeEden(state, base, gs, [], hpOver, true);
  const up = (list) => list.map((u) => (u.type === 59 || !reinforce ? u : { ...u, level: Math.min(9, (u.level || 0) + reinforce) }));
  const extra = (base.reinforcements || []).slice(0, (R.RECKONING.reinforceStep || 8) * reinforce).map((u) => ({ ...u, army: 1 }));
  const foes = easyLevels(state, up([...base.units, ...extra].map(strip)));
  const arrivals = base.arrivals.map((a) => ({ turn: a.turn, army: a.army, wave: a.wave, units: easyLevels(state, up(a.units.map(strip))) }));
  const n = foes.reduce((t, u) => t + 1 + (u.cargo || []).length, 0) + arrivals.reduce((t, a) => t + a.units.reduce((k, u) => k + 1 + (u.cargo || []).length, 0), 0);
  const { reinforcements, ...rest } = base;
  const why = [fleet ? 'No time to mend: the fleet goes in as it came out of the ambush, and Hesk has had no time either.' : '', reinforce ? `Hesk has had time: the rock is stronger (${extra.length} more machines, every one ${reinforce} level${reinforce === 1 ? '' : 's'} higher).` : ''].filter(Boolean).join(' ');
  return {
    ...rest, units: [...eden.units, ...foes], arrivals, general: eden.general,
    briefing: `${base.briefing}\n\nThe General takes ${eden.units.length} machine${eden.units.length === 1 ? '' : 's'}${fleet ? ': what is left of the strike force' : ': Eden\'s best, crewed and at home'}. Hesk has ${n}.${why ? ` ${why}` : ''}`,
    colony: { day: state.day, battle: 'stronghold', from: 'west', count: n, reinforce, onward: !!fleet, left: { guardians: eden.left, raiders: [] } },
  };
}

// The General must lead the strike (js/colony/reckoning.js generalReady).
export const generalReady = (state) => R.generalReady(state);

// Off to the battle page with one of the Reckoning's battles ('siege' | 'stronghold'). Async: the map
// is fetched. Marks state.reckoning.fighting until the result comes back (main.js).
// Off to the battle page with one of the Reckoning's battles ('siege' | 'counter' | 'ambush' | 'stronghold';
// 'strike' picks the strike's next phase). Async: the map is fetched. Marks state.reckoning.fighting until
// the result comes back (main.js). opts.ids: the strike force the player picked (the picker; checked by
// strikeSelection: any number), else the automatic best 40; pressing on always takes the survivors.
export async function commandReckoning(state, which, save = () => {}, load = null, opts = {}) {
  const r = state.reckoning;
  if (!r) return { ok: false, msg: 'Nothing is waiting.' };
  if (which === 'strike') which = R.strikePhase ? R.strikePhase(state) || 'ambush' : 'ambush';
  if ((which === 'siege' || which === 'counter') && !(r.stage === 'siege' && (r.siegeKind === 'counter') === (which === 'counter'))) return { ok: false, msg: 'Hesk\'s fleet is not at the gates.' };
  if (which === 'ambush' || which === 'stronghold') {
    const onward = r.stage === 'onward' && which === 'stronghold';
    if (!onward && !(R.strikeReady ? R.strikeReady(state) : r.stage === 'strike')) return { ok: false, msg: 'The fleet is not ready to strike yet.' };
    if (!onward && which !== (R.strikePhase ? R.strikePhase(state) : which)) return { ok: false, msg: which === 'stronghold' ? 'The way to the rock is still guarded.' : 'The picket is spent: the strike goes straight to the rock.' };
    const gr = generalReady(state);
    if (!gr.ok) return gr;
    if (opts.ids && !onward) { const sel = strikeSelection(state, opts.ids); if (!sel.ok) return sel; }
  }
  if (state.raid?.coming?.battle) return { ok: false, msg: 'A raid battle is already being fought.' };
  let base;
  const file = RECKONING_FILES[which === 'counter' ? 'siege' : which];
  try { base = load ? await load(file) : await (await fetch(file, { cache: 'no-cache' })).json(); } catch (e) { return { ok: false, msg: `Could not load the map: ${e.message}` }; }
  const mission = which === 'siege' ? siegeMission(state, base) : which === 'counter' ? counterMission(state, base) : which === 'ambush' ? ambushMission(state, base, { ids: opts.ids }) : strongholdMission(state, base, { ids: opts.ids });
  if (!mission.units.some((u) => u.army === 0 && u.rosterId !== undefined)) return { ok: false, msg: 'No crewed guardian is at home to fight.' };
  if ((which === 'ambush' || which === 'stronghold') && !mission.general) return { ok: false, msg: 'The General\'s machine could not join the strike force.' };
  try {
    localStorage.setItem(RAID_KEY, JSON.stringify(mission));
    localStorage.removeItem(RESULT_KEY);
    localStorage.removeItem('el-colony-battle');
  } catch (e) { return { ok: false, msg: `Could not store the battle: ${e.message}` }; }
  r.fighting = which;
  save();
  if (typeof location !== 'undefined') location.href = BATTLE_URL;
  return { ok: true, msg: 'To the battle.' };
}

// The pack (js/expansion/pack.js) or a ROM it can be built from, without building anything.
export async function canCommand() {
  try {
    const { loadPack } = await import('../expansion/pack.js');
    if (await loadPack()) return true;
  } catch { /* no pack module or no IndexedDB */ }
  return new Promise((res) => {
    try {
      const r = indexedDB.open('earthlight-lab', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rom');
      r.onsuccess = () => {
        try { const q = r.result.transaction('rom', 'readonly').objectStore('rom').count('rom'); q.onsuccess = () => res(q.result > 0); q.onerror = () => res(false); } catch { res(false); }
      };
      r.onerror = () => res(false);
    } catch { res(false); }
  });
}

// The result the battle page left, or null.
export function takeResult() {
  try { const v = localStorage.getItem(RESULT_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function clearResult() {
  try { localStorage.removeItem(RESULT_KEY); localStorage.removeItem(RAID_KEY); } catch { }
}
