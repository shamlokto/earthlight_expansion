// Command the battle (docs/COLONY-V5.md §2): the raid mission the colony builds for the expansion's
// battle engine (every unit on a legal hex of its map, the counts, the General, HP scaling), the
// flee rule, and the result handed back to the colony.   node tests/colony-battle.mjs
import { newGame } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { raidMission, raidMap, raidersFlee } from '../js/colony/battle.js';
import { buildMap, isFrame, SCREEN_COLS, SCREEN_ROWS } from '../js/expansion/mission.js';
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
{
  // 4 guardians against 3 raiders: kill one raider and they break off (4 >= 2 x 2)
  const s = colony([0, 1, 2, 3]);
  const raid = { day: s.day, from: 'north', tier: 'pirates', units: [{ type: 0, level: 0 }, { type: 1, level: 0 }, { type: 3, level: 0 }], faction: 'cartel', strength: 300, arrived: true };
  s.raid.coming = raid;
  const m = raidMission(s, raid), b = new ExpansionBattle(noRom, m, types, { tables });
  check(b.winner() === null, 'flee: 4 against 3 fight on');
  const victim = b.units.find((u) => u.army === 1 && u.rosterId === 1), att = b.units.find((u) => u.army === 0);
  b.turn = 2;   // the raiders have had their first turn (they never flee before it)
  victim.hp = 1; att.x = victim.x; att.y = victim.y + 1;   // set up a sure kill
  let w = null;
  for (let k = 0; k < 50 && victim.hp > 0; k++) { victim.hp = 1; att.hp = 8; const e = b.attack(att, victim, b.weaponsAgainst(att, victim)[0], () => 0.99); w = e; }
  check(victim.hp === 0 && w, 'flee: a raider destroyed');
  check(b.winner() === 0 && b.result.reason === 'fled' && b.fled.length === 2 && b.alive(1).length === 0, 'flee: the other two break off and leave the map; a win');
  const r = colonyResult(b);
  check(r.won && r.fled && r.day === s.day && r.turns === 2 && JSON.stringify(r.killed) === '[1]', `result: won, fled, turns, killed indices (${JSON.stringify(r)})`);
  check(r.guardians.length === 4 && r.guardians.every((g) => !g.lost && g.hp > 0 && g.hp <= 1), 'result: each guardian with its HP fraction');
  const lose = colonyResult(b, false);
  check(!lose.won && !lose.fled, 'result: a retreat is a loss, never fled');
  // the rules take it (R.resolveRaidBattle, the lead's)
  if (typeof R.resolveRaidBattle === 'function') {
    raid.battle = true;
    const before = s.raid.count || 0, res = R.resolveRaidBattle(s, r);
    check(res.ok && !s.raid.coming && (s.raid.count || 0) === before + 1 && s.raid.last?.won, 'the colony applies the result');
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
    if (b.result?.reason === 'fled') check(b.forces(0).length >= 2 * b.fled.length, `game ${g}: they fled outnumbered`);
  }
  console.log('games:', ends);
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
