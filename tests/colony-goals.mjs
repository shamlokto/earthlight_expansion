// Guided goals and the advisor (js/colony/goals.js): a bot that does only what each goal's
// "Show me" points at must finish every goal on Easy, without deaths. Also checks the advisor
// warns in a crisis, and the beta guardian goal. Run: node tests/colony-goals.mjs
import { newGame } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { goalStatus, advise, GOALS } from '../js/colony/goals.js';

let failed = 0, passed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };

// Build `key` as close to the Command Centre as it fits (space buildings: near the dock).
function placeAny(s, key) {
  const cc = s.buildings.find((b) => b.key === 'command'), dock = s.buildings.find((b) => b.key === 'dock');
  const zone = { space: dock, any: cc }[R.spec({ key }).zone] || cc, near = zone || cc;
  const box = R.spec({ key }).zone === 'space' ? { x0: near.x - 26, y0: near.y - 26, x1: near.x + 26, y1: near.y + 26 } : { x0: 0, y0: 0, x1: s.map.w - 1, y1: s.map.h - 1 };
  const p = R.findSpot(s, key, { box, score: (x, y) => Math.abs(x - near.x) + Math.abs(y - near.y) });
  return p ? R.build(s, key, p.x, p.y) : { ok: false };
}
// Roads from the existing network into chamber `c` (BFS over buildable tiles and existing roads).
function roadInto(s, c, fromAnywhere = false) {
  const { w, h, ch } = s.map, road = new Set(s.buildings.filter((b) => b.key === 'road').map((b) => b.y * w + b.x));
  // (the bot builds tightly round the Command Centre and can box its own roads in; then it starts
  // the new road from any free tile of an open chamber)
  const seeds = fromAnywhere ? [...Array(w * h).keys()].filter((i) => ch[i] !== 255 && ch[i] !== c.id && R.chamberOf(s, ch[i])?.status === 'open' && R.canBuild(s, 'road', i % w, (i / w) | 0) === null) : [...road];
  const prev = new Int32Array(w * h).fill(-2), q = seeds;
  for (const i of q) prev[i] = -1;
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    if (ch[i] === c.id && !road.has(i)) { for (let j = i; j >= 0 && !road.has(j); j = prev[j]) R.build(s, 'road', j % w, (j / w) | 0); return true; }
    if (fromAnywhere && prev[i] === -2) prev[i] = -1;
    for (const j of [i - 1, i + 1, i - w, i + w]) if (prev[j] === -2 && R.canBuild(s, 'road', j % w, (j / w) | 0) === null) { prev[j] = i; q.push(j); }
  }
  return fromAnywhere ? false : roadInto(s, c, true);
}
// Keep the colony fed, breathing and housed while waiting on a goal (a sensible player does).
// A sensible player doesn't order a second one while the first is still going up.
const finished = (s, key) => s.buildings.filter((b) => b.key === key && b.build === 0).length;
const queued = (s, key) => s.buildings.some((b) => b.key === key && b.build > 0);
function upkeep(s) {
  const m = R.summary(s), place = (s, key) => (queued(s, key) ? null : placeAny(s, key));
  if (s.stock.credits < 150 && s.stock.food > 150) R.sell(s, 'food', Math.floor(s.stock.food - 120));
  if (m.stock.food.delta < 0) place(s, 'farm');
  if (m.stock.air.delta < 0) place(s, 'airplant');
  if (m.stock.water.delta < 0) place(s, 'riverpump');
  if (m.power.demand > m.power.supply) place(s, 'solar');
  if (m.housing - s.pop < 10) place(s, 'habitat');
  if (s.happy < 60 && R.summary(s).stock.credits.have > 400) place(s, 'park');
  if (s.stock.ore > 50 && !finished(s, 'smelter')) R.sell(s, 'ore', s.stock.ore);
  if ((s.stock.alloy || 0) > 40 && !finished(s, 'fabricator')) R.sell(s, 'alloy', Math.floor(s.stock.alloy - 20));
  if (s.research && finished(s, 'lab') && !R.techStatus(s).find((t) => t.key === s.research.focus && !t.done)) {
    const next = ['smelting', 'medicine', 'fabrication', 'reclaim'].find((k) => R.techStatus(s).find((t) => t.key === k && t.available && !t.done));
    if (next) R.research(s, next);
  }
}
function act(s) {
  const g = goalStatus(s).current;
  if (!g) return;
  const sh = g.show;
  if (sh?.build) { if (!queued(s, sh.build)) { const r = placeAny(s, sh.build); if (sh.build === 'depot' && r?.id) R.setMode(s, r.id, 'air'); } }
  else if (sh?.chamber !== undefined) {
    const c = R.chamberOf(s, sh.chamber);
    if (c.status === 'sealed') R.chamberAction(s, c.id, 'survey');
    else if (c.status === 'surveyed' && R.openBreaches(s, c).length === 0) R.chamberAction(s, c.id, 'pressurise');
    else if (c.status === 'surveyed') for (const i of R.openBreaches(s, c)) R.build(s, 'seal', i % s.map.w, (i / s.map.w) | 0);
  } else if (sh?.tile && g.id === 'seal') R.build(s, 'seal', sh.tile.x, sh.tile.y);
  else if (sh?.roads) { const c = s.chambers.find((k) => k.status === 'open' && k.kind !== 'landing'); c && roadInto(s, c); }
  else if (sh?.research) {
    // a player who opens Research picks what the goal talks about: smelting, then medicine
    const st = R.techStatus(s), want = ['smelting', 'medicine', 'fabrication', 'reclaim'].find((k) => st.find((t) => t.key === k && t.available && !t.done));
    if (want && s.research.focus !== want && !st.find((t) => t.key === s.research.focus && !t.done)) R.research(s, want);
    if (finished(s, 'lab') === 0 && !queued(s, 'lab')) placeAny(s, 'lab');
  } else if (sh?.defence) {
    // a player who opens Defence orders the cheapest machine the Arsenal can build
    if (sh.defence === 'production' && !(s.production || []).length) {
      const m = R.machineList(s).filter((x) => x.ok).sort((p, q) => p.price - q.price)[0];
      if (m) R.orderMachine(s, m.type);
    }
  } else if (sh?.market) { if (s.guardians.length && s.imported?.beta) R.sellGuardian(s, s.guardians[0].id); else if (s.stock.ore) R.sell(s, 'ore', s.stock.ore); else R.sell(s, 'food', 10); }
}
function play(opts, days = 300) {
  const s = newGame(opts), rng = stateRng(s), when = {};
  let pop0 = s.pop, deaths = 0;
  for (let d = 0; d < days && goalStatus(s).current; d++) {
    act(s); upkeep(s);
    const before = s.pop;
    dayTick(s, rng);
    for (const p of s.goals.done) when[p] ??= s.day;
    if (s.pop < before && s.log.some((l) => l.day === s.day && /die|starv|suffoc/i.test(l.text))) deaths += before - s.pop;
    if (process.env.DIAG && s.log.some((l) => l.day === s.day && /died/.test(l.text))) {
      const m = R.summary(s), n = (k) => s.buildings.filter((b) => b.key === k && b.build === 0).length;
      console.log(`  day ${s.day} pop ${s.pop}/${m.housing} ${s.log.filter((l) => l.day === s.day && /died/.test(l.text)).map((l) => l.text).join(' ')} | food ${Math.round(m.stock.food.have)} (${m.stock.food.delta.toFixed(1)}) water ${Math.round(m.stock.water.have)} (${m.stock.water.delta.toFixed(1)}) air ${Math.round(m.stock.air.have)} (${m.stock.air.delta.toFixed(1)}) power ${m.power.supply}/${m.power.demand} jobs ${m.jobs} cr ${Math.round(s.stock.credits)} parts ${Math.round(s.stock.parts)} | farms ${n('farm')} air ${n('airplant')} pumps ${n('riverpump')} solar ${n('solar')} hab ${n('habitat')} building ${s.buildings.filter((b) => b.build > 0).length}`);
    }
    s.pending.length = 0;
  }
  return { s, when, deaths, pop0 };
}

for (const seed of [1, 2, 3, 5, 8]) {
  const { s, when, deaths } = play({ seed });
  const st = goalStatus(s);
  console.log(`seed ${seed} (easy): ${st.done}/${st.total} goals by day ${s.day}; pop ${s.pop}; deaths ${deaths}; open chambers ${s.chambers.filter((c) => c.status === 'open').length}`);
  console.log('  ', Object.entries(when).map(([k, d]) => `${k}@${d}`).join(' '));
  check(st.done === st.total, `seed ${seed}: every goal done (stuck on ${st.current?.id})`);
  check(deaths === 0, `seed ${seed}: no deaths`);
}
// Normal, for information only: the same goal-following player at full prices.
for (const seed of [1, 3]) {
  const { s, deaths } = play({ seed, difficulty: 'normal' }, 300), st = goalStatus(s);
  console.log(`seed ${seed} (normal, info): ${st.done}/${st.total} goals by day ${s.day}; pop ${s.pop}; deaths ${deaths}`);
}
// Beta: the first goal is selling a guardian, and it pays.
{
  const roster = [{ id: 1, type: 78, level: 9 }, { id: 2, type: 0, level: 1 }];
  const s = newGame({ seed: 4, beta: true, importSave: { 'el-expansion-campaign-remnant': JSON.stringify({ roster }) } });
  check(goalStatus(s).current.id === 'guardian', 'beta: first goal is the guardian sale');
  const c0 = s.stock.credits; R.sellGuardian(s, 2); dayTick(s, stateRng(s));
  check(s.goals.done.includes('guardian') && s.stock.credits > c0, 'beta: selling a guardian completes the goal and pays');
  check(GOALS.length === goalStatus(s).total, 'beta: the guardian goal counts in the checklist');
}
// A non-beta colony never sees the guardian goal.
check(goalStatus(newGame({ seed: 4 })).list.every((g) => g.id !== 'guardian'), 'no guardian goal without beta');
// The advisor speaks up in a crisis, worst first, with a fix.
{
  const s = newGame({ seed: 6 }), rng = stateRng(s);
  s.buildings = s.buildings.filter((b) => b.key !== 'farm'); s.stock.food = 30; s.pop = 80;
  dayTick(s, rng); s.pending.length = 0;
  const a = advise(s);
  console.log('crisis advice:', a.map((x) => `[${x.level}] ${x.text}`).join(' | '));
  check(a.length && a[0].level !== 'tip' && /food/i.test(a[0].text) && a[0].show?.build, 'advisor: food crisis first, with a fix');
  check(a.some((x) => /home/i.test(x.text)), 'advisor: full homes noticed');
}
// Easy really is easier: costs and needs are scaled.
{
  const e = newGame({ seed: 2 }), n = newGame({ seed: 2, difficulty: 'normal' });
  check(R.costOf(e, { credits: 100, parts: 10 }).credits === 60 && R.costOf(n, { credits: 100, parts: 10 }).credits === 100, 'easy costs 60%');
  check(e.difficulty === 'easy' && n.difficulty === 'normal', 'difficulty kept in the state');
}
console.log(failed ? `${failed} of ${failed + passed} checks FAILED` : `all ${passed} checks passed`);
process.exit(failed ? 1 : 0);
