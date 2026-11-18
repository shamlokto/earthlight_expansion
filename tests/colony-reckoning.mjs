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
import { siegeMission, strongholdMission, counterMission, ambushMission, ambushCount, AMBUSH_TYPES, commandReckoning, reckoningCrew, siegeShare, hexDistance, RECKONING_CAP, strikeCandidates, strikeBest, strikeAll, strikeSelection } from '../js/colony/battle.js';
import { MACHINE } from '../js/colony/data/machines.js';
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
const SIEGE = base('siege'), HOLD = base('stronghold'), AMB = base('ambush');
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
  for (const [m, w, h] of [[SIEGE, 4, 3], [HOLD, 4, 4], [AMB, 4, 3]]) {
    check(m.screensW === w && m.screensH === h && m.grid.length === h * 10 + 2 && m.grid.every((r) => r.length === w * 15 + 2), `${m.title}: a ${w} x ${h} screen grid`);
    check(m.pairs.length <= 80 && m.grid.flat().every((v) => v >= 0 && v < m.pairs.length), `${m.title}: cells index the pairs`);
    const T = legal(m, m.title);
    check(m.home.length >= RECKONING_CAP && m.home.every(([x, y, ships]) => T.can(ships ? 30 : 0, x, y)), `${m.title}: ${m.home.length} start hexes for Eden, ships only where ships stand`);
    // every enemy can be reached by a craft from Eden's start (for an attack from beside it)
    const craft = T.reach(types[4].category, m.home[0].slice(0, 2));
    const all = [...m.units, ...m.arrivals.flatMap((a) => a.units), ...(m.slots || [])].filter((u) => u.army !== 0);
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
  check(HOLD.turnLimit === 30 && !HOLD.cap && !AMB.cap, 'stronghold: 30 turns; no deployment cap on either strike map (the player brings any number)');
  check(HOLD.cannons.length === 1 && HOLD.units.some((u) => u.type === 57 && u.x === HOLD.cannons[0].tower[0] && u.y === HOLD.cannons[0].tower[1]), 'stronghold: the fortress cannon and its tower');
  const sleepers = HOLD.units.filter((u) => u.wakes && u.hold === 6);
  check(sleepers.length >= 15 && sleepers.every((u) => [3, 4].includes(H.cls(u.x, u.y))), `stronghold: ${sleepers.length} ambushers asleep on the ridges and in the plasma`);
  const behind = HOLD.arrivals.filter((a) => a.wave === 'trap' || a.wave === 'trap2');
  check(behind.length === 2 && behind.every((a) => a.units.every((u) => u.x <= 3 || u.y >= 39)), 'stronghold: two waves arrive behind the General (west and south edges)');
  // phase 2's capital ships: besides the Verdict, named capitals in the garrison and the waves
  const capitals = [...HOLD.units, ...HOLD.arrivals.flatMap((a) => a.units)].filter((u) => [30, 32, 34, 61].includes(u.type) && u.name);
  check(capitals.length >= 3 && capitals.some((u) => /Quill/.test(u.name)) && capitals.some((u) => /Varr/.test(u.name)) && capitals.some((u) => /Osk/.test(u.name)), `stronghold: ${capitals.length} named capital ships besides the Verdict (${capitals.map((u) => u.name.split(' · ')[0]).join(', ')})`);
  check(HOLD.reinforcements.length >= 3 * RECKONING.reinforceStep && HOLD.reinforcements.every((u) => H.can(u.type, u.x, u.y)) && HOLD.reinforcements.some((u) => u.type === 72), `stronghold: ${HOLD.reinforcements.length} reinforcements on legal hexes, cruisers among them`);
  // the ambush (phase 1): open space, slots on void for any machine, four directions, hold 12
  const A = terrain(AMB);
  check(AMB.slots.length >= RECKONING.ambushSize && AMB.slots.every((sl) => A.can(30, sl.x, sl.y) && A.can(0, sl.x, sl.y) && A.cls(sl.x, sl.y) === 0), `ambush: ${AMB.slots.length} picket slots, every one on open void (any machine)`);
  check(new Set(AMB.slots.map((sl) => `${sl.x},${sl.y}`)).size === AMB.slots.length && !AMB.slots.some((sl) => AMB.home.some(([x, y]) => x === sl.x && y === sl.y)), 'ambush: slots distinct and off every one of the strike force\'s hexes');
  check(['front', 'flanks', 'hammer', 'behind'].every((k) => AMB.slots.slice(0, 20).some((sl) => sl.wave === k)), 'ambush: even a small picket comes from every side');
  const wt = AMB.waves.filter((w) => w.turn > 0).map((w) => w.turn + 1).join();
  check(AMB.objective.kind === 'hold' && AMB.objective.turns === 15 && wt === '6,10,13' && AMB.waves[0].hold === 5, `ambush: hold 15 turns; the picket on the map (moving on turn 5), waves on turns 6, 10 and 13 (${wt})`);
  const rocks = AMB.grid.slice(1, 31).flat().filter((v) => v === 9).length;
  check(rocks >= 20 && rocks < 120, `ambush: deep space with a few asteroid clusters (${rocks} rock hexes)`);
  check(AMB.home.length >= RECKONING_CAP && hexDistance({ x: AMB.generalAt[0], y: AMB.generalAt[1] }, { x: AMB.home[0][0], y: AMB.home[0][1] }) === 0, 'ambush: the strike force in a column round the General');
  // the counterstrike (after a regroup): the siege map, other waves
  const C = SIEGE.counter;
  check(C && C.objective.kind === 'hold' && C.arrivals.length === 3 && C.arrivals.map((a) => a.turn).join() !== SIEGE.arrivals.map((a) => a.turn).join() && C.follow.length >= 20, 'counterstrike: its own waves on the siege map, room for the picket\'s survivors');
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

// ---------------------------------------------------------------- the two-phase strike (owner, 2026-11-16)
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const loader = async (f) => ({ 'missions/colony/siege.json': SIEGE, 'missions/colony/ambush.json': AMB, 'missions/colony/stronghold.json': HOLD })[f];
function strikeState(n, opts = {}) { const s = siegeState(n, 0, opts); s.reckoning.stage = 'strike'; s.reckoning.nextStrike = s.day; return s; }
const army = (m, a) => m.units.filter((u) => u.army === a);
const foesOf = (m) => count(army(m, 1)) + m.arrivals.reduce((t, a) => t + count(a.units), 0);
{
  // the picket (owner, 2026-11-18: "no need to scale"): a fixed RECKONING.ambushSize, the same tiers and level whatever comes
  let picket0 = null;
  for (const [n, kinds, level] of [[40, [72, 73, 30, 69, 2, 31, 70, 9, 39, 66], 6], [15, [30, 8, 9, 0, 2, 39], 4], [8, [73, 66, 31], 7], [3, [0, 8], 2]]) {
    const s = strikeState(n, { kinds, level }), m = ambushMission(s, AMB);
    legal(m, `ambush mission (${n})`);
    const mine = army(m, 0).filter((u) => u.rosterId !== undefined), picket = [...army(m, 1), ...m.arrivals.flatMap((a) => a.units)];
    const sig = picket.map((u) => `${u.type}/${u.level}/${u.x},${u.y}`).join();
    check(foesOf(m) === RECKONING.ambushSize && m.colony.count === RECKONING.ambushSize && (picket0 ??= sig) === sig, `ambush mission: ${mine.length} machines meet the same ${foesOf(m)}`);
    check(picket.filter((u) => !u.name).every((u) => u.level === RECKONING.ambushLevel) && picket.find((u) => u.name)?.level === RECKONING.ambushLevel + 1, `ambush mission: the picket at level ${RECKONING.ambushLevel} (the leader +1)`);
    check(m.general && mine.some((u) => u.rosterId === s.guardians[0].id && u.x === m.general.x && u.y === m.general.y), `ambush mission (${n}): the General's machine flies`);
  }
  {
    const m = ambushMission(strikeState(40), AMB), picket = [...army(m, 1), ...m.arrivals.flatMap((a) => a.units)];
    const tierOf = (u, i) => AMB.slots.findIndex((sl) => sl.x === u.x && sl.y === u.y);
    const ok = picket.every((u) => { const i = tierOf(u); return i >= 0 && AMBUSH_TYPES[AMB.slots[i].role][RECKONING.ambushTiers[i % 3]].includes(u.type); });
    check(RECKONING.ambushSize === 60 && ambushCount() === 60 && ok && !('ambushRatio' in RECKONING), 'ambush: a fixed 60, a heavy, a middle and a light machine in turn');
    const easy = ambushMission(strikeState(40, { difficulty: 'easy' }), AMB);
    check(army(easy, 1).filter((u) => !u.name).every((u) => u.level === RECKONING.ambushLevel - 2), 'ambush: Easy\'s picket two levels lower');
  }
  // the General's machine is always in the strike force, however weak, among 44 stronger ones
  const w = strikeState(45, { kinds: [0, 72, 73, 30, 31, 70], level: 6 });
  const crew = reckoningCrew(w, false);
  check(crew.length === RECKONING_CAP && crew[0].id === w.guardians[0].id && w.guardians[0].type === 0, 'strike: the General\'s Mars leads, ahead of 44 stronger machines');
  // the strike picker (owner, 2026-11-16): the player chooses up to 40; the General's machine is locked in
  for (let i = 0; i < 3; i++) w.buildings.push({ id: 9200 + i, key: 'barracks', x: 0, y: 0, build: 0, deck: 'main' });   // crews for all 45
  const cand = strikeCandidates(w), best = strikeBest(w);
  check(cand.length === 45 && cand[0].general && cand[0].g.id === w.guardians[0].id && cand.slice(1).every((c) => !c.general && c.power > 0) && best.join() === crew.map((g) => g.id).join(), 'picker: every machine that may fly, the General first; Best 40 = the automatic choice');
  const weakest = cand.slice(-10).map((c) => c.g.id), pick = strikeSelection(w, weakest);
  check(pick.ok && pick.gs.length === 11 && pick.gs[0].id === w.guardians[0].id, 'picker: the General is added to any choice');
  const every = strikeSelection(w, strikeAll(w));
  check(every.ok && every.gs.length === 45 && strikeAll(w).length === cand.length && strikeSelection(w, [...best, 99999]).ok && strikeSelection(w, [...best, 99999]).gs.length === 40 && strikeSelection(w, []).gs.length === 1, 'picker: no cap (All: 45 accepted); unknown ids dropped; an empty choice is the General alone');
  const am = ambushMission(w, AMB, { ids: weakest }), flown = army(am, 0).map((u) => u.rosterId).filter((x) => x !== undefined);
  check(flown.length === 11 && weakest.every((id) => flown.includes(id)) && am.general && am.colony.count === RECKONING.ambushSize, `picker: the ambush flies the chosen machines (${flown.length}) against the fixed picket (${am.colony.count})`);
  const sm = strongholdMission(w, HOLD, { ids: weakest });
  check(army(sm, 0).filter((u) => u.rosterId !== undefined).length === 11, 'picker: so does a direct strike on the stronghold');
  const wAll = JSON.parse(JSON.stringify(w)), goAll = await commandReckoning(wAll, 'strike', () => {}, loader, { ids: strikeAll(wAll) });
  const storedAll = JSON.parse(store.get('el-colony-raid'));
  check(goAll.ok && storedAll.units.filter((u) => u.army === 0).length === 45 && storedAll.colony.count === RECKONING.ambushSize, `picker: launching all 45 flies all 45 against ${storedAll.colony.count}`);
  // the whole armoury (owner, 2026-11-18): 250 machines on both strike maps, every one placed legally,
  // past the staging hexes (240 on the ambush's map, 180 on the stronghold's) where they run out
  const BIG = 250, big = strikeState(BIG, { kinds: [72, 73, 30, 69, 2, 31, 70, 9, 39, 66], level: 6 });
  for (let i = 0; i < 80; i++) big.buildings.push({ id: 9300 + i, key: 'barracks', x: 0, y: 0, build: 0, deck: 'main' });
  const bigIds = strikeAll(big), bigAm = ambushMission(big, AMB, { ids: bigIds }), bigHold = strongholdMission(big, HOLD, { ids: bigIds });
  legal(bigAm, `ambush mission (all ${bigIds.length})`); legal(bigHold, `stronghold mission (all ${bigIds.length})`);
  check(bigIds.length === BIG && army(bigAm, 0).length === BIG && !bigAm.colony.left.guardians.length && bigAm.general, `ambush: all ${bigIds.length} machines placed, the General among them`);
  check(foesOf(bigAm) === RECKONING.ambushSize, `ambush: the whole armoury still meets the same ${RECKONING.ambushSize}`);
  const bigFoes = [...army(bigAm, 1), ...bigAm.arrivals.flatMap((a) => a.units)];
  check(army(bigAm, 0).every((u) => bigFoes.every((e) => hexDistance(u, e) >= 2)) && army(bigAm, 0).filter((u) => !AMB.home.some(([x, y]) => x === u.x && y === u.y)).length === BIG - AMB.home.length, 'ambush: the overflow spills past the staging area, clear of the picket');
  check(army(bigHold, 0).length === BIG && !bigHold.colony.left.guardians.length && bigHold.general, `stronghold: all ${bigIds.length} machines placed (${HOLD.home.length} staging hexes, the rest spilled outward)`);
  const holdFoes = [...army(bigHold, 1), ...bigHold.arrivals.flatMap((a) => a.units)], spilled = army(bigHold, 0).filter((u) => !HOLD.home.some(([x, y]) => x === u.x && y === u.y));
  check(spilled.length === BIG - HOLD.home.length && spilled.every((u) => holdFoes.every((e) => hexDistance(u, e) > 3)), `stronghold: ${spilled.length} spilled past the staging area, none within 3 hexes of an enemy`);
  const bigOn = JSON.parse(JSON.stringify(big)); bigOn.reckoning.stage = 'onward'; bigOn.reckoning.onward = true; bigOn.reckoning.fleet = bigOn.guardians.slice(0, 60).map((g) => ({ id: g.id, hp: 0.5 }));
  check(army(strongholdMission(bigOn, HOLD), 0).length === 60, 'stronghold: pressing on with 60 survivors takes all 60');
  const w2 = strikeState(45, { kinds: [0, 72, 73, 30, 31, 70], level: 6 }), mine3 = strikeCandidates(w2).slice(-5).map((c) => c.g.id);
  const go3 = await commandReckoning(w2, 'strike', () => {}, loader, { ids: mine3 });
  const stored3 = JSON.parse(store.get('el-colony-raid')).units.filter((u) => u.army === 0).map((u) => u.rosterId);
  check(go3.ok && stored3.length === 6 && mine3.every((id) => stored3.includes(id)), 'picker: the chosen ids go into the launched mission');
  // no strike without the General fit, with his machine crewed at home
  const noGen = strikeState(6); noGen.guardians[0].commander = null;
  check((await commandReckoning(noGen, 'strike', () => {}, loader)).ok === false && R.generalReady(noGen).ok === false, 'strike: refused without the General\'s machine');
  const hurt = strikeState(6); hurt.commanders.find((c) => c.key === 'general').injured = 10;
  check(/injured/.test((await commandReckoning(hurt, 'strike', () => {}, loader)).msg), 'strike: refused while the General is injured');
  const away = strikeState(6); away.guardians[0].away = true;
  check((await commandReckoning(away, 'strike', () => {}, loader)).ok === false, 'strike: refused while the General\'s machine is away');
  // phase 1 -> the General's choice -> press on: phase 2 at once, HP carried over, no new machines
  const s = strikeState(12, { kinds: [72, 73, 30, 69], level: 6 }), c = ctx(s);
  check(R.strikePhase(s) === 'ambush', 'flow: the first strike starts with the ambush');
  const go = await commandReckoning(s, 'strike', () => {}, loader);
  check(go.ok && s.reckoning.fighting === 'ambush' && JSON.parse(store.get('el-colony-raid')).colony.battle === 'ambush', 'flow: launching the strike opens the ambush');
  const ids = s.guardians.map((g) => g.id);
  const hp = [0.4, 0.55, 0.7, 1];
  R.resolveReckoningBattle(s, { battle: 'ambush', won: true, reason: 'held', turns: 13, enemies: 24, enemiesDestroyed: 15, survivors: Array.from({ length: 9 }, (_, k) => ({ type: [73, 60, 30][k % 3], level: 6 })),
    guardians: ids.map((id, i) => ({ id, hp: i === 11 ? 0 : hp[i % 4], lost: i === 11 })) });
  const cross = s.pending.find((p) => p.step === 'crossroads');
  check(s.reckoning.stage === 'crossroads' && cross && cross.choices.map((x) => x.key).join() === 'regroup,proceed' && cross.summary.fleet === 11 && cross.summary.lost === 1 && cross.summary.survivors === 9 && cross.options.length === 2, 'flow: a won ambush: the General chooses (regroup / press on), with a summary of the losses');
  check(R.strikePhase(s) === null && (await commandReckoning(s, 'stronghold', () => {}, loader)).ok === false, 'flow: nothing launches until the General has chosen');
  const branch = JSON.parse(JSON.stringify(s));   // the other road, from the same moment
  check(R.answer(s, cross.id, 'proceed').ok && s.reckoning.stage === 'onward' && R.strikePhase(s) === 'stronghold', 'flow: pressing on: phase 2 next');
  for (const g of s.guardians) g.hp = R.maxHp(s, g);   // whatever mends at home does not count
  R.addGuardian(s, 72, { level: 9 });                  // nor does a machine built since
  const m2 = strongholdMission(s, HOLD), mine2 = army(m2, 0);
  const carried = mine2.every((u) => { const f = s.reckoning.fleet.find((x) => x.id === u.rosterId); return f && u.hp === Math.max(1, Math.round(types[u.type].hp * f.hp)); });
  check(mine2.length === 11 && carried && !mine2.some((u) => u.rosterId === s.guardians.at(-1).id) && m2.colony.onward && m2.colony.reinforce === 0, `flow: pressing on: the ${mine2.length} survivors at the HP they came out with, nothing new`);
  check(m2.general && mine2.some((u) => u.rosterId === s.guardians[0].id), 'flow: the General flies on');
  const go2 = await commandReckoning(s, 'stronghold', () => {}, loader);
  check(go2.ok && s.reckoning.fighting === 'stronghold', 'flow: the stronghold launches straight from the choice');
  R.resolveReckoningBattle(s, { battle: 'stronghold', won: false, reason: 'general', enemies: 110, enemiesDestroyed: 30, guardians: [] });
  check(s.reckoning.stage === 'strike' && s.reckoning.reinforce === 1 && !R.strikeReady(s) && (s.day = s.reckoning.nextStrike, R.strikePhase(s) === 'stronghold'), 'flow: a lost assault: home, the rock reinforces, the next strike goes straight to phase 2');
  const m3 = strongholdMission(s, HOLD);
  check(foesOf(m3) >= foesOf(strongholdMission(s, HOLD, { reinforce: 0 })) + RECKONING.reinforceStep && army(m3, 1).find((u) => u.name === 'Tiamat · Commodore Varr').level === 8, 'flow: the reinforced rock: more machines, every one a level higher');
  // ... or go home: the picket follows and strikes Eden; held, the strike goes straight to the rock, stronger
  const t = branch, tc = ctx(t), cr = t.pending.find((p) => p.step === 'crossroads');
  check(R.answer(t, cr.id, 'regroup').ok && t.reckoning.stage === 'counter' && t.reckoning.siegeDay === t.day + RECKONING.counterDelay && t.pending.some((p) => p.step === 'warn'), 'flow: going home: they follow, Eden is warned');
  t.pending.length = 0;
  const old = JSON.parse(JSON.stringify(t)); old.reckoning.siegeDay = null; old.reckoning.siegeKind = 'siege';   // an old save: home, no date
  ensureReckoning(old); old.day++; reckoningDay(old, ctx(old));
  check(old.reckoning.stage === 'siege' && old.reckoning.siegeKind === 'counter' && old.pending.some((p) => p.battle === 'counter'), 'flow: an old save sent home without a date: the counterstrike still comes');
  check(R.reckoningStatus(t).stage === 'counter' && R.reckoningStatus(t).eta === RECKONING.counterDelay && R.reckoningStatus(t).afterCounter === RECKONING.afterCounter, 'flow: going home: the Raids card knows when they come and when the strike follows');
  for (let d = 0; d < RECKONING.counterDelay; d++) { t.day++; reckoningDay(t, tc); }
  const strikeEv = t.pending.find((p) => p.step === 'siege');
  check(t.reckoning.stage === 'siege' && t.reckoning.siegeKind === 'counter' && strikeEv?.battle === 'counter', 'flow: the counterstrike comes to Eden');
  check((await commandReckoning(t, 'siege', () => {}, loader)).ok === false, 'flow: it is the counterstrike, not the first siege');
  const cm = counterMission(t, SIEGE);
  legal(cm, 'counterstrike mission');
  check(cm.colony.battle === 'counter' && cm.colony.survivors === 9 && cm.title !== SIEGE.title && cm.units.some((u) => u.army === 0 && u.type === 56) && cm.objective.turns === 14, 'flow: the counterstrike: the siege map, new waves, the picket\'s survivors in front');
  check((await commandReckoning(t, 'counter', () => {}, loader)).ok && t.reckoning.fighting === 'counter', 'flow: the counterstrike launches');
  R.resolveReckoningBattle(t, { battle: 'counter', won: true, reason: 'held', enemies: 40, enemiesDestroyed: 30, guardians: [] });
  check(t.reckoning.stage === 'strike' && t.reckoning.ambushDone && t.reckoning.reinforce === 1 && t.reckoning.nextStrike === t.day + RECKONING.afterCounter && t.pending.some((p) => p.step === 'counterwon'), 'flow: Eden holds: the picket is spent, the rock reinforced');
  t.day = t.reckoning.nextStrike;
  check(R.strikePhase(t) === 'stronghold' && !strongholdMission(t, HOLD).colony.onward && (await commandReckoning(t, 'ambush', () => {}, loader)).ok === false, 'flow: the next strike goes straight to phase 2 with a full fleet');
  const fresh = strikeAll(t).slice(-4), goFresh = await commandReckoning(t, 'strike', () => {}, loader, { ids: fresh });
  const storedFresh = JSON.parse(store.get('el-colony-raid'));
  check(goFresh.ok && storedFresh.colony.battle === 'stronghold' && !storedFresh.colony.onward && fresh.every((id) => storedFresh.units.some((u) => u.rosterId === id)), 'flow: after the regroup the player picks a fresh fleet for the stronghold');
  // a lost ambush: home, try again later, the ambush again
  const u = strikeState(6); u.reckoning.fighting = 'ambush';
  R.resolveReckoningBattle(u, { battle: 'ambush', won: false, reason: 'general', enemies: 12, enemiesDestroyed: 3, guardians: [] });
  check(u.reckoning.stage === 'strike' && !R.strikeReady(u) && (u.day = u.reckoning.nextStrike, R.strikePhase(u) === 'ambush'), 'flow: a lost ambush: the next strike meets the ambush again');
  // a lost counterstrike: they plunder and come again (still the counterstrike)
  const v = JSON.parse(JSON.stringify(branch)); v.reckoning.stage = 'siege'; v.reckoning.siegeKind = 'counter'; v.reckoning.fighting = 'counter'; v.pending.length = 0;
  R.resolveReckoningBattle(v, { battle: 'counter', won: false, reason: 'tower', cortexLost: true, enemies: 40, enemiesDestroyed: 5, guardians: [] });
  for (let d = 0; d < RECKONING.regroup; d++) { v.day++; reckoningDay(v, ctx(v)); }
  check(v.reckoning.stage === 'siege' && v.reckoning.siegeKind === 'counter' && v.pending.some((p) => p.battle === 'counter'), 'flow: a lost counterstrike: they come again');
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
// `careful` 'leash' (the ambush): the General's machine stays put (dormant: only fires), and the rest
// keep within reach of him, fighting what comes within 6 hexes of him, as a player would ring him;
// one that has drifted more than 5 hexes away with no enemy beside it closes up on him first.
function play(m, careful, maxTurns = 40) {
  const b = new ExpansionBattle(noRom, m, types, { tables });
  if (careful && b.general) b.general.hold = 99;
  if (careful === 'leash' && b.general) b.general.wakes = true;
  const seenTurn = {};
  let guard = 0;
  while (b.winner() === null && guard++ < 2 * maxTurns) {
    if (careful === 'leash' && b.general && b.army === 0) {
      const near = b.alive(1).some((e) => e.x >= 0 && hexDistance(e, b.general) <= 6);
      for (const u of b.units) if (u.army === 0 && u.hp > 0) { u.hold = 99; u.wakes = true; u.engaged = u !== b.general && near && hexDistance(u, b.general) <= 8; }
      for (const u of b.units) {
        if (u.army !== 0 || u.hp <= 0 || u.x < 0 || u === b.general || u.carrier || hexDistance(u, b.general) <= 5 || b.alive(1).some((e) => e.x >= 0 && hexDistance(e, u) <= 2)) continue;
        let to = null, d = hexDistance(u, b.general);
        for (const k of b.reachable(u).keys()) { const [x, y] = k.split(',').map(Number), dk = hexDistance({ x, y }, b.general); if (dk < d) { d = dk; to = [x, y]; } }
        if (to) b.move(u, ...to);
      }
    }
    for (const _ of aiTurn(b)) if (b.winner() !== null) break;
    if (b.winner() !== null) break;
    b.endTurn();
    if (b.army === 0) seenTurn[b.turn] = { enemies: b.alive(1).length, awake: b.units.filter((u) => u.wakes && u.engaged).length, trap: b.units.filter((u) => u.army === 1 && u.x >= 0 && (u.x <= 3 || u.y >= 39)).length };
  }
  return { b, seenTurn };
}
const tally = {}, ambushLost = {};
for (const [label, careful, mk] of [
  ['siege strong', true, (i) => siegeMission(siegeState(40, 10, { level: 8, seed: 40 + i, kinds: [73, 30, 69, 2, 62, 31, 70, 9, 39, 66] }), SIEGE)],
  ['siege middling', true, (i) => siegeMission(siegeState(15, 10, { level: 5, seed: 45 + i }), SIEGE)],
  ['siege weak', false, (i) => siegeMission(siegeState(5, 0, { level: 1, seed: 50 + i, kinds: [0, 1, 3, 8] }), SIEGE)],
  ['stronghold strong', true, (i) => strongholdMission(siegeState(40, 0, { level: 9, seed: 60 + i, kinds: [78, 72, 73, 61, 32, 58, 70, 66, 71, 69] }), HOLD)],
  ['stronghold weak', false, (i) => strongholdMission(siegeState(8, 0, { level: 2, seed: 70 + i, kinds: [0, 1, 8, 9] }), HOLD)],
  ['ambush strong', 'leash', (i) => ambushMission(strikeState(40, { level: 8, seed: 80 + i, kinds: [78, 72, 73, 61, 32, 58, 70, 66, 71, 69] }), AMB)],
  ['ambush middling', 'leash', (i) => ambushMission(strikeState(40, { level: 6, seed: 90 + i, kinds: [72, 73, 30, 69, 2, 31, 70, 9, 39, 66] }), AMB)],
  ['ambush weak', 'leash', (i) => ambushMission(strikeState(5, { level: 2, seed: 85 + i, kinds: [39, 8, 9, 0] }), AMB)],
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
    if (m.colony.battle === 'ambush') { const lost = res.guardians.filter((g) => g.lost).length; (ambushLost[label] ??= []).push(w === 0 ? lost : `L${lost}`); }
    if (m.colony.battle === 'ambush') check(Array.isArray(res.survivors) && (w !== 0 || b.result.reason === 'held' || !res.survivors.length), `${label} #${i}: the picket's survivors reported (${res.survivors.length})`);
  }
  console.log(`  ${label}: ${GAMES} games in ${Date.now() - t0} ms`);
}
console.log('  AI against AI:', tally);
console.log('  ambush machines lost (L: a lost game):', ambushLost);
{
  const won = (l) => tally[`${l} 0:held`] || 0, mean = (l) => ambushLost[l].filter((x) => typeof x === 'number').reduce((t, x, _, a) => t + x / a.length, 0);
  check(won('ambush strong') >= Math.ceil(0.8 * GAMES) && won('ambush middling') >= Math.ceil(GAMES / 2), `AI: a strong 40 nearly always breaks the ambush (${won('ambush strong')}/${GAMES}), a middling one mostly (${won('ambush middling')}/${GAMES})`);
  check(won('ambush strong') && mean('ambush strong') <= 20 && (!won('ambush middling') || mean('ambush middling') <= 26), `AI: the ambush costs a won strike less than half its machines (strong ${mean('ambush strong').toFixed(1)}, middling ${won('ambush middling') ? mean('ambush middling').toFixed(1) : '-'} of 40)`);
}
check(Object.keys(tally).some((k) => k.startsWith('siege') && / 0:/.test(k)) && Object.keys(tally).some((k) => k.startsWith('siege') && / 1:/.test(k)), 'AI: the siege can be won and lost');
check(Object.keys(tally).some((k) => k.startsWith('stronghold') && / 1:/.test(k)), 'AI: the stronghold can be lost');
check(Object.keys(tally).some((k) => k.startsWith('ambush strong') && / 0:held/.test(k)) && Object.keys(tally).some((k) => k.startsWith('ambush weak') && / 1:/.test(k)), 'AI: the ambush can be won by holding round the General, and a weak strike force loses it');

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
