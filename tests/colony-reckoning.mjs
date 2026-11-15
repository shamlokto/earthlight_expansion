// The Reckoning (docs/COLONY-V12.md): the arc's state (nothing before the broadcast; the offer, the
// clues, the 100-day countdown, the siege that waits to be played; the results of both battles and the
// ending), the two hand-made maps (every unit on a legal hex, the objectives reachable, 100+ enemies at
// the stronghold, the flagship late), the missions the colony builds from them, the engine's new rules
// (hold, awaitArrivals, noFlee, named machines) and AI-against-AI games of both battles that finish
// with well-formed results.   node tests/colony-reckoning.mjs [games]
import { readFileSync } from 'node:fs';
import { newGame } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick } from '../js/colony/sim.js';
import { CLUES, RECKONING, reckoningDay, ensureReckoning } from '../js/colony/reckoning.js';
import { siegeMission, strongholdMission, reckoningCrew, siegeShare, RECKONING_CAP } from '../js/colony/battle.js';
import { buildMap, isFrame, SCREEN_COLS, SCREEN_ROWS } from '../js/expansion/mission.js';
import { ExpansionBattle, colonyResult } from '../js/expansion/battle.js';
import { loadExpansionData } from '../js/expansion/data.js';
import { aiTurn } from '../js/game/ai.js';
import { neighbours } from '../js/game/rules.js';

let failed = 0, passed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const GAMES = +(process.argv[2] || 3);
const { types, tables } = await loadExpansionData();
const noRom = new Proxy({}, { get(_, k) { return () => { throw new Error(`ROM read: ${String(k)}`); }; } });
const base = (f) => JSON.parse(readFileSync(new URL(`../missions/colony/${f}.json`, import.meta.url), 'utf8'));
const SIEGE = base('siege'), HOLD = base('stronghold');
let seed = 11;
Math.random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;

// ---------------------------------------------------------------- the maps
function terrain(mission) {
  const { header, grid } = buildMap(mission), cols = mission.screensW * SCREEN_COLS, rows = mission.screensH * SCREEN_ROWS;
  const cls = (x, y) => tables.terrain(header[80 + grid[y * 62 + x]]).cls;
  const inb = (x, y) => x >= 1 && y >= 1 && x < cols && y <= rows;
  const can = (type, x, y) => inb(x, y) && !isFrame(x, y, cols, rows) && tables.moveCost(types[type].category, cls(x, y)) !== 0;
  const reach = (cat, from) => {
    const seen = new Set([from.join()]), q = [from];
    for (let i = 0; i < q.length; i++) for (const [a, b] of neighbours(...q[i])) {
      if (!inb(a, b) || seen.has(`${a},${b}`) || tables.moveCost(cat, cls(a, b)) === 0) continue;
      seen.add(`${a},${b}`); q.push([a, b]);
    }
    return seen;
  };
  return { cls, can, reach, cols, rows };
}
function legal(mission, what) {
  const T = terrain(mission), seen = new Set();
  let ok = true;
  for (const u of mission.units) {
    const k = `${u.x},${u.y}`;
    if (seen.has(k) || !T.can(u.type, u.x, u.y)) { ok = false; console.log('  illegal', what, JSON.stringify(u)); }
    seen.add(k);
  }
  check(ok, `${what}: every unit on its own legal hex inside the playfield`);
  let ok2 = true;
  for (const a of mission.arrivals) {
    const s = new Set();
    for (const u of a.units) { const k = `${u.x},${u.y}`; if (s.has(k) || !T.can(u.type, u.x, u.y)) { ok2 = false; console.log('  illegal arrival', what, a.turn, JSON.stringify(u)); } s.add(k); }
  }
  check(ok2, `${what}: every arrival on its own legal hex`);
  return T;
}
const count = (list) => list.reduce((t, u) => t + 1 + (u.cargo || []).length, 0);
{
  for (const [m, w, h] of [[SIEGE, 4, 3], [HOLD, 4, 4]]) {
    check(m.screensW === w && m.screensH === h && m.grid.length === h * 10 + 2 && m.grid.every((r) => r.length === w * 15 + 2), `${m.title}: a ${w} x ${h} screen grid`);
    check(m.pairs.length <= 80 && m.grid.flat().every((v) => v >= 0 && v < m.pairs.length), `${m.title}: cells index the pairs`);
    const T = legal(m, m.title);
    check(m.home.length >= RECKONING_CAP && m.home.every(([x, y, ships]) => T.can(ships ? 30 : 0, x, y)), `${m.title}: ${m.home.length} start hexes for Eden, ships only where ships stand`);
    // every enemy can be reached by a craft from Eden's start (for an attack from beside it)
    const craft = T.reach(types[4].category, m.home[0].slice(0, 2));
    const all = [...m.units, ...m.arrivals.flatMap((a) => a.units)].filter((u) => u.army !== 0);
    check(all.every((u) => [[u.x, u.y], ...neighbours(u.x, u.y)].some(([a, b]) => craft.has(`${a},${b}`))), `${m.title}: every enemy hex is reachable for Eden's craft`);
    check(m.flee && m.noFlee && m.awaitArrivals, `${m.title}: physical retreat, no breaking off, waves awaited`);
  }
  // the siege: Eden's Command Centre and dock, the hull guns' railway, the Earth band
  const T = terrain(SIEGE), ships = T.reach(types[30].category, SIEGE.home[0].slice(0, 2));
  check(SIEGE.units.some((u) => u.army === 0 && u.type === 56 && u.x === SIEGE.cortex.x && u.y === SIEGE.cortex.y), 'siege: the Command Centre stands on the map (Eden loses if it falls)');
  check(ships.has(`${SIEGE.dock.x},${SIEGE.dock.y + 2}`) && neighbours(SIEGE.cortex.x, SIEGE.cortex.y).some(([a, b]) => ships.has(`${a},${b}`)), 'siege: ships reach the dock and the Command Centre');
  check(SIEGE.rails.length >= 10 && SIEGE.rails.every(([x, y]) => T.cls(x, y) === 9), `siege: ${SIEGE.rails.length} railway hexes for the hull guns`);
  check(SIEGE.grid.slice(25).every((r) => r.every((v) => v >= 16)), 'siege: the Earth band fills the rows below the station (nobody enters it)');
  check(SIEGE.objective.kind === 'hold' && SIEGE.objective.turns === 15 && !SIEGE.turnLimit, 'siege: hold to the end of turn 15');
  const waves = SIEGE.arrivals.map((a) => a.turn).join();
  check(waves === '2,4,6,9' && SIEGE.arrivals.every((a) => a.army === 1), `siege: waves listed for turns 3, 5, 7 and 10 (${waves})`);
  const old = SIEGE.arrivals[2].units.filter((u) => /General's old|Sato's old|Arkin's old|ex-Eden/.test(u.name || ''));
  check(old.length >= 5 && old.some((u) => u.type === 61), `siege: the General's old machines come on turn 7 (${old.length} named)`);
  const full = count(SIEGE.units.filter((u) => u.army === 1)) + SIEGE.arrivals.reduce((t, a) => t + count(a.units), 0);
  check(full >= 55, `siege: Hesk brings ${full} machines against a full guard`);
  // the stronghold: 100+ in all, the flagship last, the cannon, the ambush
  const H = terrain(HOLD), hs = H.reach(types[30].category, HOLD.home[0].slice(0, 2));
  const total = count(HOLD.units) + HOLD.arrivals.reduce((t, a) => t + count(a.units), 0);
  check(total >= 100, `stronghold: ${total} enemy machines in all (100+)`);
  const last = HOLD.arrivals[HOLD.arrivals.length - 1], verdict = last.units.find((u) => u.type === 59);
  check(HOLD.objective.kind === 'flagship' && HOLD.objective.type === 59 && verdict && /Hesk/.test(verdict.name) && last.turn === 14, 'stronghold: Hesk\'s flagship, the Verdict, comes in the last wave (turn 15)');
  check(![...HOLD.units, ...HOLD.arrivals.slice(0, -1).flatMap((a) => a.units)].some((u) => u.type === 59 || (u.cargo || []).includes(59)), 'stronghold: no other Leviathan (the flagship objective is unambiguous)');
  check(![...HOLD.units, ...HOLD.arrivals.flatMap((a) => a.units)].some((u) => [53, 54, 55, 56].includes(u.type)), 'stronghold: no command centre or fortress for Hesk (only the flagship ends it)');
  check(hs.has(`${verdict.x},${verdict.y}`), 'stronghold: Eden\'s ships can sail into the harbour where the Verdict berths');
  check(HOLD.turnLimit === 30 && HOLD.cap === 40, 'stronghold: 30 turns, 40 machines');
  check(HOLD.cannons.length === 1 && HOLD.units.some((u) => u.type === 57 && u.x === HOLD.cannons[0].tower[0] && u.y === HOLD.cannons[0].tower[1]), 'stronghold: the fortress cannon and its tower');
  const sleepers = HOLD.units.filter((u) => u.wakes && u.hold === 6);
  check(sleepers.length >= 15 && sleepers.every((u) => [3, 4].includes(H.cls(u.x, u.y))), `stronghold: ${sleepers.length} ambushers asleep on the ridges and in the plasma`);
  const behind = HOLD.arrivals.filter((a) => a.wave === 'trap' || a.wave === 'trap2');
  check(behind.length === 2 && behind.every((a) => a.units.every((u) => u.x <= 3 || u.y >= 39)), 'stronghold: two waves arrive behind the General (west and south edges)');
}

// ---------------------------------------------------------------- the arc's state
function colony(n, opts = {}) {
  const s = newGame({ seed: opts.seed || 5, difficulty: opts.difficulty || 'normal' });
  s.pending.length = 0;
  for (let i = 0; i < 6; i++) s.buildings.push({ id: 9000 + i, key: 'barracks', x: 0, y: 0, build: 0, deck: 'main' });
  for (let i = 0; i < (opts.guns || 0); i++) s.buildings.push({ id: 9100 + i, key: 'emplacement', x: 0, y: 0, build: 0, deck: 'main', mode: i % 2 ? 'hydra' : 'dragon' });
  const kinds = opts.kinds || [73, 30, 69, 2, 62, 31, 70, 9, 39, 66, 24];
  for (let i = 0; i < n; i++) R.addGuardian(s, kinds[i % kinds.length], { level: opts.level ?? 5 });
  const first = s.guardians[0];
  if (first) R.assignCommander(s, 'general', first.id);
  return s;
}
const ctx = (s) => { const ev = []; return { ev, say: (kind, text) => ev.push({ kind, text }), ask: (kind, title, text) => R.addPending(s, kind, title, text) }; };
{
  const s = colony(4), c = ctx(s);
  const r = ensureReckoning(s);
  check(r.stage === 'locked' && !R.canBroadcast(s), 'arc: locked while the Ninefold vault is shut');
  check(R.broadcast(s).ok === false, 'arc: nothing to broadcast before the vault');
  s.secrets.finalOpened = true;
  reckoningDay(s, c);
  const offer = s.pending.find((p) => p.kind === 'reckoning');
  check(r.stage === 'ready' && offer?.step === 'offer' && offer.choices.map((x) => x.key).join() === 'broadcast,later', 'arc: once the vault is open Ruess offers the broadcast (Broadcast now / Not yet)');
  check(R.answer(s, offer.id, 'later').ok && !s.pending.length && r.stage === 'ready', 'arc: "Not yet" leaves it on offer');
  for (let d = 0; d < 300; d++) { s.day++; reckoningDay(s, c); }
  check(!s.pending.length && r.stage === 'ready' && !r.clues.length && r.siegeDay === null, 'arc: no second offer, no clues and no siege until the General broadcasts (300 days)');
  check(R.reckoningStatus(s).canBroadcast, 'arc: the broadcast stays available (Defence › Raids)');
  const day0 = s.day, b = R.broadcast(s);
  const ev = s.pending.find((p) => p.step === 'broadcast');
  check(b.ok && r.stage === 'gathering' && r.broadcast === day0 && r.siegeDay === day0 + 100, 'arc: the broadcast starts the 100-day countdown');
  check(ev && ev.conspirators.length === 4 && /Hesk/.test(ev.text) && /arrested/.test(ev.text), 'arc: the broadcast names Hesk and his circle and orders their arrest');
  check(R.broadcast(s).ok === false, 'arc: it goes out once');
  s.pending.length = 0;
  const seen = [];
  s.market = { food: 1, parts: 1 };
  for (let d = 1; d <= 100; d++) {
    s.day++; reckoningDay(s, c);
    for (const p of s.pending.splice(0)) seen.push([d, p.step, p.clue, p]);
  }
  const clues = seen.filter(([, st]) => st === 'clue');
  check(clues.length === CLUES.length && clues.every(([d, , id], i) => id === CLUES[i].id && d === CLUES[i].at), `arc: ${clues.length} clues on their days (${clues.map(([d]) => d).join(', ')})`);
  check(clues.every(([, , , p]) => p.speaker && p.quote), 'arc: every clue has a speaker and a line');
  const marrowLess = clues.find(([, , id]) => id === 'c7')[3];
  check(marrowLess.speaker === 'ruess', 'arc: Marrow\'s line goes to Ruess when she does not serve');
  const siege = seen.find(([, st]) => st === 'siege');
  check(siege && siege[0] === 100 && r.stage === 'siege' && siege[3].battle === 'siege', 'arc: day 100 after the broadcast, the Siege of Eden');
  check(!siege[3].choices.some((x) => /fight|tribute|auto/i.test(x.key + x.label)), 'arc: the siege has no auto-resolve and no tribute');
  check(R.answer(s, (R.addPending(s, 'reckoning', 'x', 'y'), s.pending[0].id), 'ok').ok, 'arc: an arc event closes');
  check(s.market.food >= RECKONING.blockade, 'arc: the blockade holds prices up while the siege waits');
  for (let d = 0; d < 30; d++) { s.day++; reckoningDay(s, c); }
  check(r.stage === 'siege', 'arc: the siege waits to be played (30 days on)');
  // the trader caught selling the General's old machines: seize it
  const s2 = colony(2), c2 = ctx(s2); s2.secrets.finalOpened = true; ensureReckoning(s2); R.broadcast(s2); s2.pending.length = 0;
  for (let d = 0; d < 46; d++) { s2.day++; reckoningDay(s2, c2); }
  const trader = s2.pending.find((p) => p.clue === 'c4'), had = s2.guardians.length;
  check(trader && R.answer(s2, trader.id, 'seize').ok && s2.guardians.length === had + 1 && s2.guardians.at(-1).type === 73, 'arc: the old Athena Kai, seized, joins the guardians');
  // through the sim's own day
  const s3 = colony(2); s3.secrets.finalOpened = true;
  let offered = false;
  for (let d = 0; d < 3 && !offered; d++) { dayTick(s3, () => 0.5); offered = s3.pending.some((p) => p.kind === 'reckoning' && p.step === 'offer'); s3.pending = s3.pending.filter((p) => p.kind === 'reckoning'); }
  check(offered, 'arc: the sim\'s day makes the offer');
}

// ---------------------------------------------------------------- the missions the colony builds
function siegeState(n, guns = 6, opts = {}) {
  const s = colony(n, { guns, ...opts }); s.secrets.finalOpened = true; ensureReckoning(s); R.broadcast(s);
  s.reckoning.stage = 'siege'; s.pending.length = 0; return s;
}
{
  const s = siegeState(44, 8), m = siegeMission(s, SIEGE);
  legal(m, 'siege mission (44 guardians, 8 emplacements)');
  const mine = m.units.filter((u) => u.army === 0 && u.rosterId !== undefined), guns = m.units.filter((u) => u.gun);
  check(mine.length === RECKONING_CAP && mine.length === reckoningCrew(s).length, `siege mission: at most ${RECKONING_CAP} guardians (${mine.length})`);
  check(guns.length === 8 && guns.every((u) => [23, 24].includes(u.type) && SIEGE.rails.some(([x, y]) => x === u.x && y === u.y)), 'siege mission: a hull gun per emplacement, on the railway');
  check(m.general && mine.some((u) => u.x === m.general.x && u.y === m.general.y && u.rosterId === s.guardians[0].id), 'siege mission: the General leads');
  check(mine.filter((u) => [1, 2, 3, 4].includes(types[u.type].category)).every((u) => terrain(m).can(30, u.x, u.y)), 'siege mission: ships start where ships may stand');
  check(m.colony.battle === 'siege' && !m.units.some((u) => 'core' in u), 'siege mission: tagged for the colony, no editor fields left');
  const small = siegeMission(siegeState(6, 0), SIEGE), foes = (mm) => count(mm.units.filter((u) => u.army === 1)) + mm.arrivals.reduce((t, a) => t + count(a.units), 0);
  check(foes(small) < foes(m) && foes(small) >= 25 && Math.abs(siegeShare(6) - 10 / 44) < 1e-9, `siege mission: a small guard faces a smaller fleet (${foes(small)} vs ${foes(m)})`);
  check(small.arrivals[2].units.some((u) => u.type === 61), 'siege mission: the General\'s old flagship always comes');
  const easy = siegeMission(siegeState(6, 0, { difficulty: 'easy' }), SIEGE);
  check(easy.units.filter((u) => u.army === 1)[0].level === small.units.filter((u) => u.army === 1)[0].level - 2, 'siege mission: Easy\'s enemies are two levels lower');
  const h = strongholdMission(siegeState(44, 4), HOLD);
  legal(h, 'stronghold mission');
  const hm = h.units.filter((u) => u.army === 0);
  check(hm.length <= RECKONING_CAP && hm.length === reckoningCrew(siegeState(44, 4), false).length && !hm.some((u) => types[u.type].category === 14), `stronghold mission: up to 40 machines (${hm.length}), no rail guns (no railway at the staging area)`);
  check(h.colony.battle === 'stronghold' && h.colony.count >= 100, `stronghold mission: ${h.colony.count} enemies`);
}

// ---------------------------------------------------------------- the engine's new rules
{
  const s = siegeState(10, 2), m = siegeMission(s, SIEGE), b = new ExpansionBattle(noRom, m, types, { tables });
  check(b.units.some((u) => u.name === 'Tiamat · Commodore Varr'), 'engine: named machines keep their names');
  check(b.general && b.general.general, 'engine: the General aboard');
  for (const u of b.alive(1)) u.hp = 0;
  check(b.winner() === null, 'engine: wiping out the first wave wins nothing while waves are still to come (awaitArrivals)');
  b.turn = 16; b.result = null;
  check(b.winner() === 0 && b.result.reason === 'held', 'engine: the hold objective wins after its last turn');
  const b2 = new ExpansionBattle(noRom, m, types, { tables });
  b2.units.find((u) => u.army === 0 && u.type === 56).hp = 0; b2.result = null;
  check(b2.winner() === 1 && b2.result.reason === 'tower', 'engine: Eden loses with its Command Centre');
  const b3 = new ExpansionBattle(noRom, m, types, { tables });
  b3.turn = 5;
  for (const u of b3.alive(1)) u.hp = u.hp > 0 && b3.alive(1).indexOf(u) > 1 ? 0 : u.hp;
  check(!b3.checkFlee() && !b3.fleeing, 'engine: Hesk\'s people never break off (noFlee)');
  const r = colonyResult(b2, false);
  check(r.battle === 'siege' && r.cortexLost && !r.won && r.guardians.every((g) => s.guardians.some((x) => x.id === g.id)), 'engine: the result names the battle and what Eden lost; hull guns are not guardians');
}

// ---------------------------------------------------------------- AI against AI
// Both sides played by the Union AI (test mode for Eden: it advances on the nearest enemy). `careful`:
// the General's machine holds its post and only fires, as a player would keep it out of harm's way.
function play(m, careful, maxTurns = 40) {
  const b = new ExpansionBattle(noRom, m, types, { tables });
  if (careful && b.general) b.general.hold = 99;
  const seenTurn = {};
  let guard = 0;
  while (b.winner() === null && guard++ < 2 * maxTurns) {
    for (const _ of aiTurn(b)) if (b.winner() !== null) break;
    if (b.winner() !== null) break;
    b.endTurn();
    if (b.army === 0) seenTurn[b.turn] = { enemies: b.alive(1).length, awake: b.units.filter((u) => u.wakes && u.engaged).length, trap: b.units.filter((u) => u.army === 1 && u.x >= 0 && (u.x <= 3 || u.y >= 39)).length };
  }
  return { b, seenTurn };
}
const tally = {};
for (const [label, careful, mk] of [
  ['siege strong', true, (i) => siegeMission(siegeState(40, 10, { level: 8, seed: 40 + i, kinds: [73, 30, 69, 2, 62, 31, 70, 9, 39, 66] }), SIEGE)],
  ['siege middling', true, (i) => siegeMission(siegeState(15, 10, { level: 5, seed: 45 + i }), SIEGE)],
  ['siege weak', false, (i) => siegeMission(siegeState(5, 0, { level: 1, seed: 50 + i, kinds: [0, 1, 3, 8] }), SIEGE)],
  ['stronghold strong', true, (i) => strongholdMission(siegeState(40, 0, { level: 9, seed: 60 + i, kinds: [78, 72, 73, 61, 32, 58, 70, 66, 71, 69] }), HOLD)],
  ['stronghold weak', false, (i) => strongholdMission(siegeState(8, 0, { level: 2, seed: 70 + i, kinds: [0, 1, 8, 9] }), HOLD)],
]) {
  const t0 = Date.now();
  for (let i = 0; i < GAMES; i++) {
    const m = mk(i), { b, seenTurn } = play(m, careful);
    const w = b.winner(), res = colonyResult(b, w === 0);
    const k = `${label} ${w}:${b.result?.reason}`; tally[k] = (tally[k] || 0) + 1;
    check(w === 0 || w === 1, `${label} #${i}: the game ends (${b.result?.reason}, turn ${b.turn})`);
    check(res.battle === m.colony.battle && typeof res.won === 'boolean' && Array.isArray(res.guardians) && res.guardians.length === m.units.filter((u) => u.army === 0 && u.rosterId !== undefined).length
      && res.guardians.every((g) => g.hp >= 0 && g.hp <= 1) && res.enemiesDestroyed <= res.enemies, `${label} #${i}: a well-formed result`); if (!(res.guardians.length === m.units.filter((u) => u.army === 0 && u.rosterId !== undefined).length && res.guardians.every((g) => g.hp >= 0 && g.hp <= 1))) console.log(JSON.stringify(res.guardians.filter((g) => !(g.hp >= 0 && g.hp <= 1))), res.guardians.length);
    if (m.colony.battle === 'stronghold' && b.turn >= 4) check((seenTurn[4]?.trap || 0) > 0 || b.units.some((u) => u.army === 1 && u.hp <= 0 && b.arrivals[0].done), `${label} #${i}: the trap closes behind the General (turn 4)`);
    if (m.colony.battle === 'stronghold' && b.turn >= 8) check((seenTurn[8]?.awake || 0) > 0 || b.units.filter((u) => u.wakes).every((u) => u.hp <= 0 || u.engaged), `${label} #${i}: the ambush wakes`);
    if (w === 0 && m.colony.battle === 'stronghold') check(res.flagshipSunk, `${label} #${i}: a won strike sank the Verdict`);
  }
  console.log(`  ${label}: ${GAMES} games in ${Date.now() - t0} ms`);
}
console.log('  AI against AI:', tally);
check(Object.keys(tally).some((k) => k.startsWith('siege') && / 0:/.test(k)) && Object.keys(tally).some((k) => k.startsWith('siege') && / 1:/.test(k)), 'AI: the siege can be won and lost');
check(Object.keys(tally).some((k) => k.startsWith('stronghold') && / 1:/.test(k)) && Object.keys(tally).some((k) => k.startsWith('stronghold') && / 0:/.test(k)), 'AI: the stronghold can be lost, and won (every win sank the Verdict)');

// ---------------------------------------------------------------- the results back in the colony
{
  const s = siegeState(6, 2), ids = s.guardians.map((g) => g.id);
  s.reckoning.fighting = 'siege';
  check(R.resolveReckoningBattle(s, { battle: 'stronghold', won: true }).ok === false, 'results: the wrong battle is refused');
  const credits = s.stock.credits;
  const r = R.resolveReckoningBattle(s, { battle: 'siege', won: true, reason: 'held', turns: 16, enemies: 30, enemiesDestroyed: 20, guardians: [{ id: ids[0], hp: 0.5, lost: false }, { id: ids[1], hp: 0, lost: true }] });
  check(r.ok && s.reckoning.stage === 'strike' && s.pending.some((p) => p.step === 'hideout') && !s.reckoning.fighting, 'results: a won siege reveals the hiding place');
  check(s.guardians.length === 5 && s.stock.credits === credits + 20 * RECKONING.salvage.credits, 'results: lost guardians removed, salvage paid');
  check(R.strikeReady(s), 'results: the counterattack can be launched');
  s.reckoning.fighting = 'stronghold';
  R.resolveReckoningBattle(s, { battle: 'stronghold', won: false, reason: 'timeup', enemies: 108, enemiesDestroyed: 40, guardians: [] });
  check(s.reckoning.stage === 'strike' && !R.strikeReady(s) && s.reckoning.nextStrike === s.day + RECKONING.strikeRetry, 'results: a failed strike can be tried again later');
  s.day = s.reckoning.nextStrike; s.reckoning.fighting = 'stronghold';
  R.resolveReckoningBattle(s, { battle: 'stronghold', won: true, reason: 'flagship', enemies: 108, enemiesDestroyed: 70, flagshipSunk: true, guardians: [] });
  const end = s.pending.find((p) => p.kind === 'justice');
  check(s.reckoning.stage === 'done' && R.justiceDone(s) && end && s.reckoning.justice.strikes === 2 && s.reckoning.justice.destroyed === 130, 'results: the strike sinks the Verdict: Justice for Eden, remembered in the save');
  check(R.answer(s, end.id, 'keep').ok && !s.victory, 'results: the ending closes and blocks nothing (no other ending set)');
  const t = siegeState(6, 0), b0 = t.buildings.filter((b) => b.build === 0).length;
  t.stock.food = 1000; t.reckoning.fighting = 'siege';
  R.resolveReckoningBattle(t, { battle: 'siege', won: false, reason: 'tower', enemies: 30, enemiesDestroyed: 5, cortexLost: true, guardians: [] });
  check(t.reckoning.stage === 'regroup' && t.reckoning.siegeDay === t.day + RECKONING.regroup && t.stock.food < 1000 && t.buildings.some((b) => b.damaged > 0) && b0 > 0, 'results: a lost siege: stores stolen, buildings knocked out, they come again');
  const c = ctx(t);
  for (let d = 0; d < RECKONING.regroup; d++) { t.day++; reckoningDay(t, c); }
  check(t.reckoning.stage === 'siege' && t.pending.some((p) => p.step === 'warn') && t.pending.some((p) => p.step === 'siege'), 'results: after the recovery period, a warning, then the siege again');
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
