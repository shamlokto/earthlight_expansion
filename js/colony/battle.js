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
