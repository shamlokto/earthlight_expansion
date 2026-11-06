// Command the battle (docs/COLONY-V5.md §2): the raid mission the colony builds for the expansion's
// battle engine (every unit on a legal hex of its map, the counts, the General, HP scaling), the
// flee rule, and the result handed back to the colony. No hiding: every hex a raider can stand on can
// be hit by the common guardians. Breaking off is physical: fleeing raiders run for the edge and leave
// one by one, Eden's Retreat has to fly its machines off an edge.   node tests/colony-battle.mjs
import { newGame } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { raidMission, raidMap, raidersFlee } from '../js/colony/battle.js';
import { buildMap, isFrame, SCREEN_COLS, SCREEN_ROWS } from '../js/expansion/mission.js';
import { MACHINES } from '../js/colony/data/machines.js';
import { neighbours, distance } from '../js/game/rules.js';
import { restoreBattle } from '../js/game/savegame.js';
import { ExpansionBattle, colonyResult, raidersFlee as engineFlee } from '../js/expansion/battle.js';
import { loadExpansionData } from '../js/expansion/data.js';
import { aiTurn } from '../js/game/ai.js';

let failed = 0, passed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const { types, tables } = await loadExpansionData();
const noRom = new Proxy({}, { get(_, k) { return () => { throw new Error(`ROM read: ${String(k)}`); }; } });
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;

// Whether a unit of `type` may stand on (x, y): the engine's own rule (battle.js standChecker), no ROM.
function stander(mission) {
  const { header, grid } = buildMap(mission);
  return (type, x, y) => tables.moveCost(types[type].category, tables.terrain(header[80 + grid[y * 62 + x]]).cls) !== 0;
}
function colony(guardianTypes, opts = {}) {
  const s = newGame({ seed: opts.seed || 3 });
  s.pending.length = 0;
  for (const t of guardianTypes) R.addGuardian(s, t, { level: opts.level ?? 3 });
  return s;
}
function legal(mission, what) {
  const can = stander(mission), cols = mission.screensW * SCREEN_COLS, rows = mission.screensH * SCREEN_ROWS, seen = new Set();
  let ok = true;
  for (const u of mission.units) {
    const k = `${u.x},${u.y}`;
    if (isFrame(u.x, u.y, cols, rows) || seen.has(k) || !can(u.type, u.x, u.y)) { ok = false; console.log('  illegal', what, JSON.stringify(u)); }
    seen.add(k);
  }
  check(ok, `${what}: every unit on its own legal hex inside the playfield`);
}

// ---------------------------------------------------------------- the map
for (const from of ['north', 'east', 'west', 'earth']) {
  const m = raidMap(from, 12345);
  check(m.grid.length === 22 && m.grid.every((r) => r.length === 32), `${from}: a 2 x 2 screen grid (22 rows of 32 cells)`);
  check(m.rails.length === 5 && m.home.length >= 30 && m.away.length >= 20, `${from}: rails, home and raider start hexes (${m.rails.length}, ${m.home.length}, ${m.away.length})`);
  check(JSON.stringify(raidMap(from, 12345).grid) === JSON.stringify(m.grid), `${from}: the same seed makes the same map`);
}

// ---------------------------------------------------------------- the mission
{
  // Mars, Dragon (a rail gun), Selene carrier, Athena, a cruiser and more than crews: only the crewed ones fight
  const s = colony([0, 23, 38, 4, 30, 24, 1, 2]);
  const first = s.guardians.filter((g) => R.homeCrew(s).has(g.id)).map((g) => g.id);
  R.assignCommander(s, 'general', first[1]);
  s.guardians.find((g) => g.id === first[1]).hp = 4;   // the General's machine at half HP (a led machine keeps its crew)
  const crew = R.homeCrew(s), ids = [first[1], first[1]];
  check(crew.has(first[1]), 'the General\'s machine is crewed');
  for (const from of ['north', 'east', 'west', 'earth']) {
    const raid = R.makeRaid(s, rnd, 300); raid.from = from; raid.arrived = true;
    raid.units.push({ type: 23, level: 2 });   // a raider rail gun: no rail at their edge, stays aboard
    s.raid.coming = raid;
    const m = raidMission(s, raid);
    legal(m, `raid from ${from}`);
    const mine = m.units.filter((u) => u.army === 0), theirs = m.units.filter((u) => u.army === 1);
    check(mine.length === crew.size && mine.every((u) => crew.has(u.rosterId)), `${from}: Eden fields its ${crew.size} crewed guardians at home, rosterId = guardian id`);
    check(theirs.length + m.colony.left.raiders.length === raid.units.length, `${from}: every raider is on the map or listed as left aboard`);
    check(m.colony.left.raiders.includes(raid.units.length - 1), `${from}: the raiders' rail gun stays aboard`);
    check(theirs.every((u) => raid.units[u.rosterId].type === u.type && Math.min(9, raid.units[u.rosterId].level) === u.level), `${from}: raiders keep their type and level, rosterId = index into raid.units`);
    const gen = mine.find((u) => u.rosterId === ids[1]);
    check(m.general && gen && m.general.x === gen.x && m.general.y === gen.y, `${from}: the General rides the guardian they command`);
    const half = mine.find((u) => u.rosterId === ids[0]);
    check(half && half.hp === Math.round(types[half.type].hp * 4 / R.maxHp(s, s.guardians.find((g) => g.id === ids[0]))), `${from}: HP scaled from the guardian's (${half?.hp})`);
    check(mine.filter((u) => u.rosterId !== ids[0]).every((u) => u.hp === types[u.type].hp), `${from}: undamaged guardians at full HP`);
    check(m.flee === true && m.colony.day === s.day && m.colony.from === from && m.objective.kind === 'annihilate', `${from}: flee rule on, the colony's day and direction`);
    const dragon = mine.find((u) => u.type === 23);
    if (dragon) check(tables.terrain(buildMap(m).header[80 + m.grid[dragon.y][dragon.x]]).cls === 9, `${from}: a Dragon guardian stands on the railway`);
    // the engine builds it without the ROM, with the guardians' HP and the general
    const b = new ExpansionBattle(noRom, m, types, { tables });
    check(b.units.length === m.units.length && b.general && b.general.rosterId === ids[1] && b.units.find((u) => u.rosterId === ids[0] && u.army === 0).hp === half.hp, `${from}: the engine takes HP, roster ids and the general`);
  }
  // no General aboard when they are injured
  s.commanders.find((c) => c.key === 'general').injured = 5;
  check(raidMission(s, s.raid.coming).general === null, 'an injured General does not fly');
}

// ---------------------------------------------------------------- the flee rule
check(raidersFlee(4, 2) && !raidersFlee(3, 2) && !raidersFlee(5, 0) && raidersFlee(2, 1), 'flee: Eden\'s living units at least twice the raiders\'');
check([[4, 2], [3, 2], [5, 0], [2, 1], [1, 1]].every(([a, b]) => raidersFlee(a, b) === engineFlee(a, b)), 'flee: the colony and the engine agree');
// ---------------------------------------------------------------- breaking off
// Movement cost to the nearest edge hex for unit u (the AI's own measure, recomputed here).
function edgeCost(b, u) {
  const t = b.type(u), cat = t.moveCat ?? t.category, d = new Map(), q = [];
  const enter = (x, y) => { const c = tables.moveCost(cat, b.cls(x, y)); return c === 0 ? 0 : c === 'stop' ? t.move : c; };
  for (let y = 1; y <= b.info.rows; y++) for (let x = 1; x < b.info.cols; x++) if (b.edgeHex(x, y) && enter(x, y)) { d.set(`${x},${y}`, 0); q.push([0, x, y]); }
  while (q.length) {
    q.sort((a, c) => a[0] - c[0]);
    const [c, x, y] = q.shift();
    if (c > d.get(`${x},${y}`)) continue;
    for (const [a, e] of neighbours(x, y)) {
      if (!b.inBounds(a, e) || !enter(a, e)) continue;
      const n = c + enter(x, y);
      if (n < (d.get(`${a},${e}`) ?? Infinity)) { d.set(`${a},${e}`, n); q.push([n, a, e]); }
    }
  }
  return d.get(`${u.x},${u.y}`) ?? Infinity;
}
// An open hex far from every edge and from every unit, for setting up the chase.
function inland(b, used, minEdge = 7) {
  for (let y = 1; y <= b.info.rows; y++) for (let x = 1; x < b.info.cols; x++) {
    if (b.cls(x, y) !== 0 || b.unitAt(x, y) || used.some((p) => distance(p, { x, y }) < 3)) continue;
    if (b.alive(0).some((e) => distance(e, { x, y }) < 4)) continue;
    let near = Infinity;
    for (let yy = 1; yy <= b.info.rows; yy++) for (let xx = 1; xx < b.info.cols; xx++) if (b.edgeHex(xx, yy)) near = Math.min(near, distance({ x, y }, { x: xx, y: yy }));
    if (near >= minEdge) { used.push({ x, y }); return { x, y }; }
  }
  throw new Error('no inland hex');
}
const raiders3 = (s) => ({ day: s.day, from: 'north', tier: 'pirates', units: [{ type: 0, level: 0 }, { type: 1, level: 0 }, { type: 3, level: 0 }], faction: 'cartel', strength: 300, arrived: true });
// a sure kill of raider `v` by Eden's unit `att` (set up by hand)
function kill(b, att, v) {
  att.x = v.x; att.y = v.y + 1;
  if (b.unitAt(att.x, att.y) && b.unitAt(att.x, att.y) !== att) att.y = v.y - 1;
  for (let k = 0; k < 50 && v.hp > 0; k++) { v.hp = 1; att.hp = 8; att.acted = false; b.attack(att, v, b.weaponsAgainst(att, v)[0], () => 0.99); }
  return v.hp === 0;
}
// 4 guardians against 3 raiders placed inland; after the flee trigger, `eden(b)` plays Eden's turns.
function chase(eden = () => {}, opts = {}) {
  const s = colony([0, 1, 2, 3]);
  const raid = raiders3(s); s.raid.coming = raid;
  const m = raidMission(s, raid), b = new ExpansionBattle(noRom, m, types, { tables }), used = [];
  for (const u of b.alive(1)) Object.assign(u, inland(b, used));
  for (const [i, u] of b.alive(0).entries()) Object.assign(u, inland(b, used, 3 + (i % 2)));   // Eden in the middle too, away from the raiders
  b.turn = 2;   // the raiders have had their first turn (they never flee before it)
  return { s, raid, m, b, ...opts };
}
{
  const { s, raid, b } = chase();
  check(b.winner() === null && !b.fleeing, 'flee: 4 against 3 fight on');
  const victim = b.units.find((u) => u.army === 1 && u.rosterId === 1), att = b.alive(0)[0], home = { x: att.x, y: att.y };
  check(kill(b, att, victim), 'flee: a raider destroyed');
  Object.assign(att, home);
  check(b.fleeing && b.winner() === null && b.alive(1).length === 2 && b.alive(1).every((u) => u.fleeing), 'flee: the other two break off and run, the battle goes on');
  check(b.log.some((e) => e.kind === 'flee'), 'flee: the break-off is logged');
  check(!b.retreat(), 'flee: no retreat while the raiders run');
  // the raiders' turns: each runs for the edge (never farther from it), none attacks in open space, they leave one by one
  b.endTurn();
  const left = [], before = new Map(b.alive(1).map((u) => [u, edgeCost(b, u)]));
  let attacks = 0, turns = 0, nearer = true;
  while (b.winner() === null && turns < 6) {
    if (b.army === 1) {
      const n0 = b.log.length;
      for (const _ of aiTurn(b)) if (b.winner() !== null) break;
      attacks += b.log.slice(n0).filter((e) => e.att && e.att.army === 1).length;
      for (const [u, d] of before) if (!u.fled && u.hp > 0) { const d2 = edgeCost(b, u); if (d2 > d) nearer = false; before.set(u, d2); }
      left.push(b.fled.length); turns++;
    }
    if (b.winner() === null) b.endTurn();
  }
  check(nearer && attacks === 0, `flee: raiders head for the edge without attacking (${attacks} attacks)`);
  check(left[0] < 2 && left.at(-1) === 2, `flee: they leave over several turns, not at once (${JSON.stringify(left)})`);
  check(b.winner() === 0 && b.result.reason === 'fled' && b.alive(1).length === 0 && b.fled.length === 2, 'flee: once none is left on the map, a win (fled)');
  check(b.fled.every((u) => u.hp > 0 && u.x === -1 && u.carrier), 'flee: the escaped are off the map, alive');
  const r = colonyResult(b);
  check(r.won && r.fled && r.day === s.day && r.turns === b.turn && JSON.stringify(r.killed) === '[1]', `result: won, fled, turns, killed indices (${JSON.stringify(r)})`);
  check(r.guardians.length === 4 && r.guardians.every((g) => !g.lost && g.hp > 0 && g.hp <= 1), 'result: each guardian with its HP fraction');
  const lose = colonyResult(b, false);
  check(!lose.won && !lose.fled, 'result: a loss is never fled');
  // the rules take it (R.resolveRaidBattle, the lead's)
  if (typeof R.resolveRaidBattle === 'function') {
    raid.battle = true;
    const n = s.raid.count || 0, res = R.resolveRaidBattle(s, r);
    check(res.ok && !s.raid.coming && (s.raid.count || 0) === n + 1 && s.raid.last?.won, 'the colony applies the result');
  }
}
{
  // kills during the chase count; a raider on an edge hex at its turn leaves; all destroyed = annihilate, not fled
  const { b } = chase();
  const [a0, a1, a2] = b.alive(0);
  kill(b, a0, b.units.find((u) => u.army === 1 && u.rosterId === 1));
  check(b.fleeing, 'chase: they run');
  kill(b, a1, b.units.find((u) => u.army === 1 && u.rosterId === 0));
  check(b.winner() === null && b.alive(1).length === 1, 'chase: one more shot down while it runs; the last one still on the map');
  const last = b.alive(1)[0];
  last.x = 1; last.y = 10;   // already on the edge
  b.endTurn();
  for (const _ of aiTurn(b)) { /* the raiders' turn */ }
  check(last.fled && b.winner() === 0 && b.result.reason === 'fled', 'chase: a raider on an edge hex leaves at its turn');
  const r = colonyResult(b);
  check(r.won && r.fled && JSON.stringify(r.killed) === '[0,1]', `chase: kills during the chase in killed, the escaped one not (${JSON.stringify(r.killed)})`);
  const c = chase().b, [x0, x1] = c.alive(0);
  kill(c, x0, c.units.find((u) => u.army === 1 && u.rosterId === 1));
  kill(c, x1, c.units.find((u) => u.army === 1 && u.rosterId === 0));
  kill(c, c.alive(0)[2], c.alive(1)[0]);
  const rc = colonyResult(c);
  check(c.winner() === 0 && c.result.reason === 'annihilate' && rc.won && !rc.fled && rc.killed.length === 3, 'chase: all shot down before they get away: a win, not fled');
  void a2;
}
{
  // a fleeing raider that can't get any nearer an edge (boxed in by Eden) fires from where it stands
  const { b } = chase();
  kill(b, b.alive(0)[0], b.units.find((u) => u.army === 1 && u.rosterId === 1));
  const v = b.alive(1)[0], others = b.alive(1).filter((u) => u !== v);
  for (const o of others) { o.x = 1; o.y = 20 - others.indexOf(o) * 3; }
  const ring = neighbours(v.x, v.y).filter(([x, y]) => b.inBounds(x, y));
  const guards = b.alive(0);
  // box it in: Eden's machines on its neighbours (extra ones spawned for the test)
  while (guards.length < ring.length) guards.push(b.spawn(0, 0, -1, -1));
  ring.forEach(([x, y], i) => { guards[i].x = x; guards[i].y = y; });
  b.endTurn();
  const n0 = b.log.length;
  for (const _ of aiTurn(b)) { /* the raiders' turn */ }
  check(v.hp === 0 || b.log.slice(n0).some((e) => e.att === v), 'cornered: a boxed-in raider fights back');
}

// ---------------------------------------------------------------- Eden's retreat
{
  // Mars, Titan (at half HP), Talos, Medusa and a Dragon on the railway
  const s = colony([0, 1, 2, 3, 23]);
  const ids = s.guardians.map((g) => g.id);
  s.guardians[1].hp = 4;
  const raid = { ...raiders3(s), units: [{ type: 0, level: 0 }, { type: 0, level: 0 }, { type: 1, level: 0 }, { type: 3, level: 0 }] };
  s.raid.coming = raid;
  const m = raidMission(s, raid), b = new ExpansionBattle(noRom, m, types, { tables });
  const dragon = b.units.find((u) => u.army === 0 && u.type === 23), half = b.units.find((u) => u.rosterId === ids[1]);
  check(dragon && b.stranded(dragon) && !b.stranded(half), 'retreat: the Dragon on its railway can never reach an edge; the others can');
  check(b.retreat() && b.retreating && !b.retreat(), 'retreat: once, and it cannot be undone');
  check(b.winner() === null, 'retreat: the battle goes on');
  // one of them is shot down on the way out
  const doomed = b.units.find((u) => u.rosterId === ids[3]);
  doomed.hp = 0;
  b.result = null;
  check(b.winner() === null && !b.fleeing, 'retreat: a loss on the way does not end it');
  // Eden's machines run for the edge (the AI plays them), the raiders keep fighting
  const out = [];
  let raiderRun = false;
  for (let k = 0; k < 12 && b.winner() === null; k++) {
    if (b.army === 0) { for (const _ of aiTurn(b)) if (b.winner() !== null) break; out.push(b.escaped.length); }
    else { raiderRun ||= b.running(1); for (const _ of aiTurn(b)) if (b.winner() !== null) break; }
    if (b.winner() === null) b.endTurn();
    check(!b.fleeing, `retreat: the raiders never break off meanwhile (turn ${b.turn})`);
  }
  check(!raiderRun, 'retreat: the raiders fight on while Eden pulls back');
  check(out.length > 1 && out[0] < out.at(-1), `retreat: machines leave one by one over turns (${JSON.stringify(out)})`);
  check(b.winner() === 1 && b.result.reason === 'retreat', `retreat: a defeat once nobody who could leave is left (${b.result?.reason})`);
  const r = colonyResult(b, b.winner() === 0);
  const g = (id) => r.guardians.find((x) => x.id === id);
  check(!r.won && !r.fled, 'retreat: won false');
  check(g(ids[3]).lost && g(ids[3]).hp === 0, 'retreat: the machine shot down is lost');
  const escaped = b.units.filter((u) => u.army === 0 && u.escaped);
  check(escaped.every((u) => !g(u.rosterId).lost && g(u.rosterId).hp === Math.round((u.hp / types[u.type].hp) * 1000) / 1000), 'retreat: the escaped keep their HP');
  check(escaped.some((u) => u.rosterId === ids[1]) ? g(ids[1]).hp <= 0.5 : true, 'retreat: the damaged Titan got away with its damage');
  check(dragon.hp > 0 ? !g(dragon.rosterId).lost : g(dragon.rosterId).lost, 'retreat: the Dragon stays at the dock (lost only if destroyed)');
}
{
  // the General's machine destroyed during the retreat: a defeat (general)
  const s = colony([0, 1, 2]);
  R.assignCommander(s, 'general', s.guardians[0].id);
  const raid = raiders3(s); s.raid.coming = raid;
  const b = new ExpansionBattle(noRom, raidMission(s, raid), types, { tables });
  b.retreat();
  check(b.general && b.winner() === null, 'retreat with the General: the battle goes on');
  b.general.hp = 0; b.result = null;
  check(b.winner() === 1 && b.result.reason === 'general', 'retreat: the General\'s machine lost is a defeat (general)');
}
{
  // Leave the map from an edge hex without moving; moving onto an edge hex leaves; not unless retreating
  const s = colony([0, 1]);
  const raid = raiders3(s); s.raid.coming = raid;
  const b = new ExpansionBattle(noRom, raidMission(s, raid), types, { tables });
  const [p, q] = b.alive(0);
  p.x = 1; p.y = 12;
  check(!b.canLeave(p), 'leave: only while retreating');
  b.retreat();
  check(b.canLeave(p) && b.leave(p) && p.escaped && p.x === -1, 'leave: from an edge hex');
  check(b.winner() === null, 'leave: the battle goes on while one is left');
  const reach = [...b.reachable(q).keys()].map((k) => k.split(',').map(Number));
  const edge = reach.find(([x, y]) => b.edgeHex(x, y));
  if (!edge) { q.x = 2; q.y = 12; }
  const to = edge || [1, 12];
  b.move(q, ...to);
  check(q.escaped && b.winner() === 1 && b.result.reason === 'retreat', 'leave: the last one off the map: a defeat (retreat)');
  const r = colonyResult(b, false);
  check(r.guardians.every((x) => !x.lost && x.hp === 1), 'leave: both got away whole');
  // the Earth side's edge is beside the atmosphere band
  const e = new ExpansionBattle(noRom, raidMission(s, { ...raid, from: 'earth' }), types, { tables });
  const top = m0 => m0;
  void top;
  let band = 0; for (let y = 1; y <= e.info.rows; y++) if (e.cls(15, y) === 12) { band = y; break; }
  check(band > 0 && e.edgeHex(15, band - 1) && !e.edgeHex(15, band - 2), `earth: the hexes just above the atmosphere are edge hexes (band from row ${band})`);
}
{
  // a save made while the raiders run (or Eden retreats) resumes that way
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const { saveBattle, savedBattle } = await import('../js/game/savegame.js');
  const { b, m } = chase();
  kill(b, b.alive(0)[0], b.units.find((u) => u.army === 1 && u.rosterId === 1));
  const one = b.alive(1)[0]; one.x = 1; one.y = 5; b.endTurn();
  for (const _ of aiTurn(b)) { /* the raiders' turn */ }
  check(b.fled.length >= 1 && b.winner() === null || b.winner() === 0, 'save: some got away');
  saveBattle(b, 'colony:test', 'el-colony-battle');
  const c = restoreBattle(new ExpansionBattle(noRom, m, types, { tables }), savedBattle('el-colony-battle')).restored();
  check(c.fleeing && c.fled.length === b.fled.length && c.fled.every((u) => u.carrier && u.x === -1) && c.winner() === b.winner(), 'save: resumed with the raiders still running');
  delete globalThis.localStorage;
}

// ---------------------------------------------------------------- no hiding
// On every direction's map: every hex a raider can stand on (each raider movement class), and every
// raider start hex, can be hit there by each of the common guardians that can hit that raider in open
// space at all, from a hex that guardian can reach from the dock.
{
  const guards = [0, 1, 3, 4, 8, 14, 15, 30, 38, 39];   // Mars, Titan, Medusa, Athena, Lobster, Vulcan, Phoibos, Tiamat, Selene, Hannibal
  const byCat = new Map();
  for (const mm of MACHINES) if (mm.attack > 0 && mm.category !== 14 && !byCat.has(mm.category)) byCat.set(mm.category, mm.type);
  const raiderTypes = [...byCat.values()];
  for (const from of ['north', 'east', 'west', 'earth']) for (const seed of [1, 2, 3, 12345]) {
    const s = colony([0], { seed });
    const raid = { ...raiders3(s), from, day: seed };
    s.raid.coming = raid;
    const m = raidMission(s, raid), b = new ExpansionBattle(noRom, m, types, { tables }), map = raidMap(from, 0);
    void map;
    const dock = b.alive(0)[0];
    const cells = [];
    for (let y = 1; y <= b.info.rows; y++) for (let x = 1; x < b.info.cols; x++) cells.push([x, y]);
    const stand = (t, x, y) => tables.moveCost(types[t].moveCat ?? types[t].category, b.cls(x, y)) !== 0;
    const reachFrom = new Map();
    for (const gt of guards) {
      const seen = new Set([`${dock.x},${dock.y}`]), q = [[dock.x, dock.y]];
      for (let i = 0; i < q.length; i++) for (const [a, c] of neighbours(...q[i])) if (b.inBounds(a, c) && !seen.has(`${a},${c}`) && stand(gt, a, c)) { seen.add(`${a},${c}`); q.push([a, c]); }
      reachFrom.set(gt, [...seen].map((k) => k.split(',').map(Number)));
    }
    const hits = (gt, rt, x, y, open = false) => {
      const tgt = { type: rt, x, y }, me = { type: gt, x: 0, y: 0, moved: false };
      if (open) { // in open space: anything in range from any side
        me.x = x; me.y = y + 1;
        const cls0 = b.cls.bind(b); b.cls = () => 0;
        const ok = types[gt].weapons.some((w) => w && w.power) && [1, 2, 3, 4, 5].some((r) => { me.y = y + r; return b.weaponsAgainst(me, tgt).length > 0; });
        b.cls = cls0; return ok;
      }
      return reachFrom.get(gt).some(([a, c]) => { if (distance({ x: a, y: c }, tgt) > 7) return false; me.x = a; me.y = c; return b.weaponsAgainst(me, tgt).length > 0; });
    };
    let bad = [];
    for (const rt of raiderTypes) for (const [x, y] of cells) {
      if (!stand(rt, x, y)) continue;
      if (b.cls(x, y) === 6) bad.push(`atmosphere ${x},${y}`);
      for (const gt of guards) if (hits(gt, rt, 15, 10, true) && !hits(gt, rt, x, y)) bad.push(`${types[gt].code.trim()}→${types[rt].code.trim()}@${x},${y}(cls ${b.cls(x, y)})`);
    }
    for (const u of m.units.filter((v) => v.army === 1)) if (!guards.every((gt) => !hits(gt, u.type, 15, 10, true) || hits(gt, u.type, u.x, u.y))) bad.push(`start ${u.x},${u.y}`);
    check(!bad.length, `no hiding (${from}, seed ${seed}): every raider hex can be hit by the common guardians${bad.length ? ': ' + bad.slice(0, 6).join(' ') : ''}`);
  }
}
{
  // a full game: the Union AI against a simple player, until it ends; the result stays well formed
  let ends = {};
  for (let g = 0; g < 6; g++) {
    const s = colony([0, 1, 2, 3, 4, 38], { seed: 10 + g });
    const raid = R.makeRaid(s, rnd, 260); raid.arrived = true; s.raid.coming = raid;
    const m = raidMission(s, raid), b = new ExpansionBattle(noRom, m, types, { tables });
    for (let guard = 0; b.winner() === null && guard < 60; guard++) {
      if (b.army === 0) for (const u of b.alive(0)) {
        if (b.winner() !== null || u.carrier) continue;
        const reach = [...b.reachable(u).keys()];
        if (reach.length) b.move(u, ...reach[Math.floor(rnd() * reach.length)].split(',').map(Number));
        const t = !u.carrier && b.targets(u)[0];
        if (t && b.winner() === null) b.attack(u, t, b.weaponsAgainst(u, t)[0]);
      } else for (const _ of aiTurn(b)) if (b.winner() !== null) break;
      if (b.winner() !== null) break;
      b.endTurn();
    }
    const r = colonyResult(b);
    ends[`${b.winner()}:${b.result?.reason}`] = (ends[`${b.winner()}:${b.result?.reason}`] || 0) + 1;
    check(r.killed.every((i) => i >= 0 && i < raid.units.length) && r.guardians.every((x) => x.hp >= 0 && x.hp <= 1 && x.lost === (x.hp === 0)), `game ${g}: a well-formed result`);
    if (b.fled.length) check(b.result?.reason === 'fled' && r.fled && r.killed.length + b.fled.length <= raid.units.length && b.fled.every((u) => !r.killed.includes(u.rosterId)), `game ${g}: the escaped raiders are not in killed`);
    check(b.alive(1).length === 0 || b.winner() !== 0 || b.result?.reason !== 'fled', `game ${g}: fled only once none is on the map`);
  }
  console.log('games:', ends);
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
