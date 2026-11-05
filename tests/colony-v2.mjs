// Colony version 2 ("Reclamation", docs/COLONY-V2.md): research, alloy and helium, tether-mast reach,
// the Observation Deck, surveys and drones, the smelter / fabricator chain, services, clinics and
// Apartments, safety posts, seed vaults, sweeper strikes, tailings and tech effects; old saves;
// a scripted version-2 player on Easy.   node tests/colony-v2.mjs
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng, SIM } from '../js/colony/sim.js';
import { BUILDING, BUILDINGS } from '../js/colony/data/buildings.js';
import { TECH, TECHS } from '../js/colony/data/tech.js';
import { T } from '../js/colony/data/terrain.js';
import { goalStatus } from '../js/colony/goals.js';

let failed = 0, passed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// ---------------------------------------------------------------- helpers

// A colony with money to spare and nothing pending.
function rich(seed = 1, opts = {}) {
  const s = newGame({ seed, ...opts });
  s.stock.credits = 100000; s.stock.parts = 10000; s.pending.length = 0;
  return s;
}
// Finish techs by hand (the sim's own completion is checked separately).
function learn(s, ...keys) {
  for (const k of keys) {
    if (!s.research.done.includes(k)) s.research.done.push(k);
    for (const u of TECH[k].unlocks) if (!s.unlocked.includes(u)) s.unlocked.push(u);
  }
}
const cmdOf = (s) => s.buildings.find((b) => b.key === 'command');
const dockOf = (s) => s.buildings.find((b) => b.key === 'dock');
const landing = (s) => s.chambers.find((c) => c.status === 'open');
// Build `key` at the best spot (lowest score) and finish it at once.
function put(s, key, { box, score } = {}) {
  const c = cmdOf(s);
  const p = R.findSpot(s, key, { box: box || landing(s), score: score || ((x, y) => Math.abs(x - c.x) + Math.abs(y - c.y)), free: true });
  if (!p) return null;
  const r = R.build(s, key, p.x, p.y);
  if (!r.ok) return null;
  const b = R.byId(s, r.id);
  b.build = 0;
  return b;
}
// Plenty of power: solar arrays on the hull near the dock, finished.
function power(s, n = 4) {
  const d = dockOf(s);
  for (let k = 0; k < n; k++) put(s, 'solar', { box: { x0: d.x - 24, y0: d.y - 24, x1: d.x + 24, y1: d.y + 24 }, score: (x, y) => (s.map.t[y * s.map.w + x] === T.HULL ? 0 : 50) + Math.abs(x - d.x) + Math.abs(y - d.y) });
}
// A building placed by hand (no placement rules), finished.
function raw(s, key, x, y, extra = {}) {
  const d = BUILDING[key], b = { id: s.nextId++, key, x, y, level: 1, mode: d.modes ? d.modes[0].key : null, build: 0, off: false, ...extra };
  s.buildings.push(b);
  return b;
}
const tick = (s, rng = stateRng(s)) => { const r = dayTick(s, rng); return r; };
const happy = (s, label) => s.happyParts.find((p) => p.label === label)?.value;
const rateOf = (s) => s.stats.last.staffing * s.stats.last.power.factor;
function walk(v, path, out) {
  if (typeof v === 'number') { if (!Number.isFinite(v)) out.push(path); }
  else if (ArrayBuffer.isView(v)) return out;
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const k in v) walk(v[k], `${path}.${k}`, out);
  return out;
}

// ---------------------------------------------------------------- new game, goods, locks

{
  const s = newGame({ seed: 1 });
  check(JSON.stringify(s.research) === JSON.stringify({ points: 0, focus: null, progress: {}, done: [] }), 'new game: research state');
  check(s.stock.alloy === 0 && s.stock.helium === 0 && s.market.alloy === 1 && s.market.helium === 1, 'new game: alloy and helium in stock and market');
  check(R.STORED.includes('alloy') && R.STORED.includes('helium') && R.GOODS.includes('alloy'), 'alloy and helium are stored goods');
  const v2keys = BUILDINGS.filter((d) => d.tech).map((d) => d.key);
  // (17 version 2 buildings carry a tech; version 3 adds 9 more, version 6 9 more (the Granary is open from the start), also locked)
  check(v2keys.length === 17 + 9 + 9 && v2keys.every((k) => !s.unlocked.includes(k)) && !s.unlocked.includes('lab'), 'nothing of version 2 is available at the start');
  const bl = R.buildable(s);
  check(bl.find((b) => b.key === 'clinic').why === 'Research Medicine.' && bl.find((b) => b.key === 'lab').why === 'Unlocks at 80 colonists.', 'buildable(): tech-locked reason');
  check(R.canBuild(s, 'smelter', 0, 0) === 'Research Smelting.', 'canBuild(): tech-locked reason');
  const ts = R.techStatus(s);
  check(ts.length === 40 && ts.every((t) => !t.done && !t.focus && t.progress === 0), 'techStatus: 40 techs (19 + 11 of version 3 + 10 of version 6), none done');
  check(ts.filter((t) => t.available).map((t) => t.key).sort().join() === TECHS.filter((t) => !t.needs.length).map((t) => t.key).sort().join(), 'techStatus: the roots are available');
  const sum = R.summary(s);
  check(sum.stock.alloy.cap === 100 && sum.stock.helium.cap === 50 && sum.research.perDay === 0, 'summary: alloy / helium caps from the Command Centre, research read-out');
  // depot modes for the new goods, market sale at BASE_PRICE
  const dep = put(rich(1), 'depot');
  const s2 = rich(1), d2 = put(s2, 'depot');
  R.setMode(s2, d2.id, 'helium');
  check(dep && R.storageCaps(s2).helium === 350, 'a depot set to helium-3 holds 300 more');
  s2.stock.helium = 20; s2.stock.alloy = 20;
  const c0 = s2.stock.credits, r1 = R.sell(s2, 'helium', 10), r2 = R.sell(s2, 'alloy', 10);
  check(r1.ok && r1.credits <= 300 && r1.credits >= 290 && r2.ok && r2.credits >= 116 && r2.credits <= 120 && s2.stock.credits === c0 + r1.credits + r2.credits, `helium and alloy sell (${r1.credits}, ${r2.credits})`);
  check(!R.sell(s2, 'alloy', 50).ok, 'cannot sell alloy you do not have');
}

// ---------------------------------------------------------------- research: focus, labs, banking, completion

{
  const s = rich(2);
  check(!R.research(s, 'nope').ok && /needs Smelting/.test(R.research(s, 'fabrication').msg), 'research(): unknown and unavailable refused');
  // the lab arrives with the 80-colonist milestone
  s.pop = 80; tick(s); s.pending.length = 0;
  check(s.unlocked.includes('lab') && !s.unlocked.includes('smelter'), 'the Research Lab unlocks at 80 colonists, techs do not');
  s.pop = 60;
  power(s);
  const lab = put(s, 'lab');
  check(!!lab, 'a lab is built');
  tick(s); s.pending.length = 0;
  const made1 = s.stats.last.research, r1 = rateOf(s);
  check(made1 > 0 && near(made1, 4 * r1) && near(s.research.points, made1), `no focus: points banked (${made1.toFixed(2)} = 4 × ${r1.toFixed(2)})`);
  check(R.summary(s).research.perDay === made1 && R.summary(s).research.banked === made1, 'summary().research');
  check(R.research(s, 'smelting').ok && s.research.focus === 'smelting' && R.techStatus(s).find((t) => t.key === 'smelting').focus, 'research(): focus set');
  check(R.research(s, 'smelting').ok, 'research(): same focus again is fine');
  const bank = s.research.points;
  tick(s);
  check(near(s.research.progress.smelting, bank + s.stats.last.research) && s.research.points === 0, 'banked points flow into the focus');
  // staffing scales research: half the workers, half the points
  const t2 = rich(2); t2.pop = 80; tick(t2); t2.pending.length = 0; power(t2); put(t2, 'lab');
  const jobs = R.jobsOf(t2); t2.pop = Math.ceil(jobs / 2);
  tick(t2);
  check(t2.stats.last.research < 4 && near(t2.stats.last.research, 4 * rateOf(t2)), `staffing scales research (${t2.stats.last.research.toFixed(2)})`);
  // completion: unlocks, pending 'tech' from Ruess, log line, leftover banked
  s.research.progress.smelting = 59;
  const ev = tick(s).events;
  const p = s.pending.find((x) => x.kind === 'tech');
  check(s.research.done.includes('smelting') && s.research.focus === null && s.unlocked.includes('smelter') && s.unlocked.includes('tailings'), 'completion unlocks the Smelter and Tailings Dump');
  check(p && p.speaker === 'ruess' && /Smelting/.test(p.text) && ev.some((e) => e.kind === 'tech' && e.pause) && s.log.some((l) => /finished Smelting/.test(l.text)), 'completion: a tech event from Ruess, logged');
  check(near(s.research.points, s.stats.last.research - 1) && s.research.progress.smelting === 60, `leftover points are banked (${s.research.points.toFixed(2)})`);
  check(!R.research(s, 'smelting').ok && R.research(s, 'fabrication').ok, 'a done tech cannot be studied again; its children can');
  check(R.techStatus(s).find((t) => t.key === 'smelting').done && R.buildable(s).find((b) => b.key === 'smelter').unlocked, 'techStatus and buildable after completion');
}

// ---------------------------------------------------------------- tech effects

{
  const s = rich(3);
  check(R.techEffect(s, 'output', 'hydro') === 1 && JSON.stringify(R.techEffect(s, 'survey')) === JSON.stringify({ mult: 1, days: 2 }), 'techEffect: 1 with nothing done');
  learn(s, 'reclaim', 'hydro2', 'drones', 'seals2', 'batteries2', 'smelting', 'deepdrill');
  check(R.techEffect(s, 'output', 'hydro') === 1.25 && R.techEffect(s, 'output', 'farm') === 1 && R.techEffect(s, 'output', 'oremine') === 1.25, 'techEffect: output');
  check(JSON.stringify(R.techEffect(s, 'survey')) === JSON.stringify({ mult: 0.5, days: 1 }), 'techEffect: survey');
  check(R.techEffect(s, 'cost', 'seal') === 0.5 && R.techEffect(s, 'pressurise') === 0.75 && R.techEffect(s, 'storage', 'battery') === 2, 'techEffect: cost, pressurise, storage');
  const plain = rich(3), seal = BUILDING.seal.cost;
  check(R.costOf(s, seal, 'seal').credits === Math.ceil(seal.credits * 0.6 * 0.5) && R.costOf(plain, seal, 'seal').credits === Math.ceil(seal.credits * 0.6), 'cost effect in costOf (Better Seals)');
  const c = s.chambers.find((k) => k.status === 'sealed');
  check(R.pressuriseAir(s, c) === Math.ceil(c.tiles / 4 * 0.8 * 0.75) && R.pressuriseAir(plain, c) === Math.ceil(c.tiles / 4 * 0.8), 'pressurise effect');
  s.unlocked.push('battery'); plain.unlocked.push('battery');
  put(s, 'battery'); put(plain, 'battery');
  check(R.storageCaps(s).power === 200 && R.storageCaps(plain).power === 100, 'storage effect (Better Batteries)');
  // output effect in the sim: a hydroponics bay grows a quarter more
  const a = rich(4), b = rich(4);
  for (const x of [a, b]) { power(x); put(x, 'hydro'); }
  learn(b, 'reclaim', 'hydro2');
  tick(a); tick(b);
  const diff = b.stats.last.produced.food - a.stats.last.produced.food;
  check(near(diff, 10 * 0.25 * rateOf(b), 1e-6) && diff > 0, `output effect: hydroponics +25% (${diff.toFixed(2)})`);
}

// ---------------------------------------------------------------- reach: tether masts, atmosphere

{
  const s = rich(5), d = dockOf(s), dc = R.centre(d);
  check(/Research Tether Masts/.test(R.canBuild(s, 'tether', d.x, d.y + 10)), 'masts need the tech');
  learn(s, 'tethers', 'reclaim', 'cometice', 'gasscoop');
  const edge = Math.floor(dc.y + 24 - 0.5);   // the last row in the dock's reach
  check(R.inReach(s, d.x, edge) && !R.inReach(s, d.x, edge + 1), 'dock reach before masts');
  const A = put(s, 'tether', { box: { x0: d.x - 6, y0: edge - 1, x1: d.x + 6, y1: edge }, score: (x, y) => -y * 100 + Math.abs(x - d.x) });
  check(A && A.y === edge, `a mast at the edge of the dock's reach (${A?.x}, ${A?.y})`);
  check(R.inReach(s, A.x, A.y + 16) && !R.inReach(s, A.x, A.y + 17), 'a mast extends reach 16 tiles');
  // atmosphere: a Gas Scoop on the top of Earth's air, within the mast's reach
  const atm = (x, y) => s.map.t[y * s.map.w + x] === T.ATMOSPHERE;
  let ax = -1, ay = -1;
  for (let y = 0; y < s.map.h && ax < 0; y++) if (atm(A.x, y)) { ax = A.x; ay = y; }
  check(ax >= 0 && R.canBuild(s, 'gasscoop', ax, ay) === null, `a Gas Scoop on atmosphere within a mast's reach (${ax}, ${ay})`);
  check(R.tileInfo(s, ax, ay).reach && R.coverage(s, 'reach')[ay * s.map.w + ax] === 1, 'tileInfo and coverage show atmosphere reach');
  check(/reach/.test(R.canBuild(s, 'gasscoop', d.x + 60, ay) || ''), 'atmosphere beyond reach refused');
  check(/stands only on atmosphere/.test(R.canBuild(s, 'gasscoop', d.x, d.y + 14) || ''), 'a Gas Scoop needs atmosphere');
  // chaining: a second mast in the first one's reach carries it further; break the chain and it stops
  // B beyond the dock's reach, in A's; `far` in B's reach only
  const B = put(s, 'tether', { box: { x0: A.x + 10, y0: A.y + 4, x1: A.x + 16, y1: A.y + 12 }, score: (x, y) => -x * 10 + Math.abs(y - A.y - 6) });
  check(!!B && B.y > edge, `a second mast beyond the dock's reach (${B?.x}, ${B?.y})`);
  const far = [B.x + 15, B.y];
  B.build = 2;
  check(!R.inReach(s, ...far), 'an unfinished mast gives no reach');
  B.build = 0;
  check(R.inReach(s, ...far), 'a chained mast extends reach');
  R.demolish(s, A.id);
  check(!R.inReach(s, ...far) && !R.inReach(s, A.x, A.y + 16), 'a mast out of reach (chain broken) gives none');
}

// ---------------------------------------------------------------- Observation Deck: the bottom hull only

{
  const s = rich(6);
  learn(s, 'canteens', 'observation');
  const ob = R.findSpot(s, 'obsdeck', { score: (x, y) => -y, free: true });
  check(ob && R.bottomHull(s, ob.x, ob.y) && R.canBuild(s, 'obsdeck', ob.x, ob.y) === null, `deck on the bottom hull (${ob?.x}, ${ob?.y})`);
  const top = R.findSpot(s, 'solar', { box: { x0: 60, y0: 30, x1: 200, y1: 34 }, score: (x, y) => (s.map.t[y * s.map.w + x] === T.HULL ? y : null), free: true });
  check(/bottom hull wall/.test(R.canBuild(s, 'obsdeck', 100, 32) || '') && top, 'deck refused on the top hull');
  let sx = -1;
  for (let x = 0; x < 80 && sx < 0; x++) if (s.map.t[60 * s.map.w + x] === T.HULL && s.map.t[60 * s.map.w + x + 1] === T.HULL) sx = x;
  check(sx >= 0 && /bottom hull wall/.test(R.canBuild(s, 'obsdeck', sx, 60) || ''), 'deck refused on a side wall');
  // +3 happiness colony-wide, the first deck only
  power(s);
  const o1 = put(s, 'obsdeck', { box: { x0: 0, y0: 0, x1: s.map.w - 1, y1: s.map.h - 1 }, score: (x, y) => -y * 1000 + x });
  const o2 = put(s, 'obsdeck', { box: { x0: 0, y0: 0, x1: s.map.w - 1, y1: s.map.h - 1 }, score: (x, y) => -y * 1000 - x });
  tick(s);
  check(o1 && o2 && happy(s, 'Observation Deck') === 3 && s.happyParts.filter((p) => p.label === 'Observation Deck').length === 1, 'Observation Deck: +3 once');
}

// ---------------------------------------------------------------- surveys and the Drone Bay

{
  const s = rich(7);
  const links = R.chamberLinks(s), land = landing(s);
  const nb = s.chambers.find((c) => c.status === 'sealed' && links.get(c.id).has(land.id));
  learn(s, 'drones');
  const cr = s.stock.credits, r = R.chamberAction(s, nb.id, 'survey');
  check(r.ok && nb.work === 1 && s.stock.credits === cr - Math.ceil(100 * 0.6 * 0.5), `Survey Drones: half the cost, one day (${cr - s.stock.credits})`);
  tick(s);
  check(nb.status === 'surveyed', 'a drone survey takes one day');
  // a Drone Bay reaches sealed chambers that touch no open one (on its own deck: the main deck here)
  const cc = R.centre(cmdOf(s));
  const lone = s.chambers.filter((c) => !c.deck && c.status === 'sealed' && ![...links.get(c.id)].some((id) => R.chamberOf(s, id).status === 'open'))
    .map((c) => ({ c, d: Math.max(Math.abs(c.x0 - cc.x), Math.abs(c.x1 - cc.x), Math.abs(c.y0 - cc.y), Math.abs(c.y1 - cc.y)) })).sort((a, b) => a.d - b.d);
  let target = null, bay = null;
  for (const { c } of lone) {
    const corners = [[c.x0, c.y0], [c.x1, c.y0], [c.x0, c.y1], [c.x1, c.y1]];
    const p = R.findSpot(s, 'dronebay', { box: land, score: (x, y) => { const m = Math.max(...corners.map(([u, v]) => Math.max(Math.abs(u - x), Math.abs(v - y)))); return m <= 39 ? m : null; }, free: true });
    if (p) { target = c; bay = p; break; }
  }
  check(!!target, 'a far chamber within 40 tiles of a drone bay spot');
  if (target) {
    check(/does not touch an open chamber/.test(R.chamberAction(s, target.id, 'survey').msg), 'without a Drone Bay: only neighbours');
    const b = R.byId(s, R.build(s, 'dronebay', bay.x, bay.y).id);
    check(!R.chamberAction(s, target.id, 'survey').ok, 'an unfinished Drone Bay does not survey');
    b.build = 0;
    check(R.chamberAction(s, target.id, 'survey').ok && target.status === 'surveying', 'a finished Drone Bay surveys a chamber within 40 tiles');
    const farC = s.chambers.find((c) => !c.deck && c.status === 'sealed' && ![...links.get(c.id)].some((id) => R.chamberOf(s, id).status === 'open') && !R.droneReach(s, c));
    check(!farC || !R.chamberAction(s, farC.id, 'survey').ok, 'a chamber beyond the Drone Bay is refused');
  }
}

// ---------------------------------------------------------------- the smelter / fabricator chain

{
  const s = rich(8);
  learn(s, 'smelting', 'fabrication');
  power(s, 6);
  const sm = put(s, 'smelter'), fb = put(s, 'fabricator');
  check(sm && fb, 'smelter and fabricator built');
  s.stock.ore = 100; s.stock.alloy = 0; s.stock.parts = 0;
  tick(s);
  const r = rateOf(s), L = s.stats.last;
  check(r > 0.99 && near(L.produced.alloy, 10) && near(L.consumed.ore, 20), `smelter: 20 ore -> 10 alloy (${L.produced.alloy})`);
  check(near(L.consumed.alloy, 10) && near(L.produced.parts, 15 + BUILDING.command.makes.parts) && near(s.stock.alloy, 0), 'fabricator: the same day\'s 10 alloy -> 15 parts');
  // short inputs scale the output
  s.stock.ore = 10; s.stock.alloy = 0; s.stock.parts = 0;
  tick(s);
  check(near(s.stats.last.produced.alloy, 5) && near(s.stats.last.produced.parts, 7.5 + BUILDING.command.makes.parts), `half the ore: half the alloy, half the parts (${s.stats.last.produced.alloy}, ${s.stats.last.produced.parts})`);
  s.stock.ore = 0; s.stock.alloy = 0;
  tick(s);
  check(!s.stats.last.produced.alloy && near(s.stats.last.produced.parts, BUILDING.command.makes.parts), 'no ore: nothing');
  // alloy is capped by storage
  s.stock.alloy = 1000; tick(s);
  check(s.stock.alloy <= R.storageCaps(s).alloy, 'alloy capped by storage');
}

// ---------------------------------------------------------------- services: clinic, canteen, safety; rationing

{
  const s = rich(9);
  learn(s, 'canteens', 'medicine', 'safety');
  power(s, 6);
  const homes = s.buildings.filter((b) => b.key === 'habitat');
  const hx = homes[0].x, hy = homes[0].y, close = (x, y) => Math.abs(x - hx) + Math.abs(y - hy);
  tick(s);
  check(!s.happyParts.some((p) => ['Clinic', 'Canteen', 'Safety', 'Rationing', 'Observation Deck'].includes(p.label)), 'no service lines without services');
  const can = put(s, 'canteen', { score: close }), cl = put(s, 'clinic', { score: close }), sp = put(s, 'safetypost', { score: close });
  check(can && cl && sp && homes.every((h) => R.covers(can, h) && R.covers(cl, h) && R.covers(sp, h)), 'services cover both homes');
  s.stock.food = 500;
  tick(s);
  check(rateOf(s) > 0.99 && happy(s, 'Clinic') === 6 && happy(s, 'Canteen') === 5 && happy(s, 'Safety') === 4, `itemised service happiness (${s.happyParts.map((p) => p.label + ' ' + p.value).join(', ')})`);
  check(s.stats.last.consumed.food >= 4, 'the canteen uses food');
  // a home out of range halves the average
  const far = raw(s, 'habitat', can.x + 30, can.y);
  tick(s);
  check(happy(s, 'Canteen') === Math.round(5 * 2 / 3), 'service averaged over the homes');
  s.buildings.splice(s.buildings.indexOf(far), 1);
  tick(s);
  // clinic triage: half the service, half the upkeep
  const up0 = s.stats.last.upkeep;
  R.setMode(s, cl.id, 'triage'); tick(s);
  check(happy(s, 'Clinic') === 3 && near(up0 - s.stats.last.upkeep, BUILDING.clinic.upkeep * 0.5 * 0.5), `triage: half service, half upkeep (${up0} -> ${s.stats.last.upkeep})`);
  // rationing: a fifth less food, −8 colony-wide, no hot meals
  const pop = s.pop;
  R.setMode(s, can.id, 'meals'); tick(s);
  const eat0 = s.stats.last.consumed.food;
  R.setMode(s, can.id, 'ration'); tick(s);
  const eat1 = s.stats.last.consumed.food;
  check(happy(s, 'Rationing') === -8 && happy(s, 'Canteen') === 0, 'rationing: −8, no canteen bonus');
  check(near(eat0 - eat1, pop * 0.8 * 0.2, 1e-6), `rationing: colonists eat a fifth less (${eat0.toFixed(1)} -> ${eat1.toFixed(1)})`);
  // switched off: no service
  R.toggle(s, sp.id); tick(s);
  check(happy(s, 'Safety') === undefined, 'a switched-off service gives nothing');
}

// ---------------------------------------------------------------- clinic births, Apartments

{
  const s = rich(10, { difficulty: 'normal' });
  learn(s, 'medicine');
  power(s, 6);
  const h0 = s.buildings.find((b) => b.key === 'habitat');
  const cl = put(s, 'clinic', { score: (x, y) => Math.abs(x - h0.x) + Math.abs(y - h0.y) });
  for (let k = 0; k < 6; k++) put(s, 'habitat', { score: (x, y) => { const c = R.centre(cl); return Math.max(Math.abs(x + 0.5 - c.x), Math.abs(y + 0.5 - c.y)) <= 8 ? Math.abs(x - cl.x) + Math.abs(y - cl.y) : null; } });
  s.stock.food = s.stock.water = s.stock.air = 280;
  s.pop = 120; s.day = 8;
  tick(s);   // day 9: nothing
  const homes = s.buildings.filter((b) => b.key === 'habitat'), housing = R.housingOf(s);
  const covered = homes.filter((h) => R.covers(cl, h)).reduce((t, h) => t + R.spec(h).housing, 0);
  const p0 = s.pop;
  tick(s);   // day 10: births (normal difficulty: the transport comes on day 10 too, but there's no free housing beyond the births... check the log)
  const born = s.log.filter((l) => l.day === 10 && /born/.test(l.text));
  const want = Math.min(housing - p0, Math.floor(p0 * Math.min(1, covered / housing) / 50));
  check(want >= 1 && born.length === 1 && +born[0].text.match(/\d+/)[0] === want, `clinic births: +${want} on day 10 (${born[0]?.text})`);
  // triage: no births
  const t = rich(10, { difficulty: 'normal' });
  learn(t, 'medicine'); power(t, 6);
  const tc = put(t, 'clinic', { score: (x, y) => Math.abs(x - h0.x) + Math.abs(y - h0.y) });
  R.setMode(t, tc.id, 'triage');
  for (let k = 0; k < 6; k++) put(t, 'habitat');
  t.pop = 100; t.day = 9; tick(t);
  check(!t.log.some((l) => /born/.test(l.text)), 'triage: no births');

  // Apartments: a level-2 home with every need met, a park and a clinic in range grows to level 3
  const a = rich(11);
  learn(a, 'medicine'); power(a, 6);
  const h = a.buildings.find((b) => b.key === 'habitat');
  h.level = 2;
  put(a, 'park', { score: (x, y) => Math.abs(x - h.x) + Math.abs(y - h.y) });
  a.stock.food = a.stock.water = a.stock.air = 280;
  tick(a);
  let needs = R.habitatNeeds(a, h);
  check(needs.some((n) => n.need === 'clinic' && !n.met && n.label === 'A Clinic in reach') && needs.filter((n) => n.need !== 'clinic').every((n) => n.met), `Quarters: only the clinic missing (${needs.filter((n) => !n.met).map((n) => n.need)})`);
  const c = put(a, 'clinic', { score: (x, y) => Math.abs(x - h.x) + Math.abs(y - h.y) });
  check(R.habitatNeeds(a, h).find((n) => n.need === 'clinic').met, 'habitatNeeds: clinic in range is met');
  c.off = true;
  check(!R.habitatNeeds(a, h).find((n) => n.need === 'clinic').met, 'habitatNeeds: a switched-off clinic does not count');
  c.off = false;
  for (let d = 0; d < 6 && h.level < 3; d++) { a.stock.food = a.stock.water = a.stock.air = 280; tick(a); }
  check(h.level === 3 && R.spec(h).housing === 70 && R.spec(h).levelName === 'Apartments' && a.log.some((l) => /Apartments/.test(l.text)), 'a home grows into Apartments (70)');
}

// ---------------------------------------------------------------- Safety Post: faster seals

{
  const s = rich(12);
  learn(s, 'safety');
  const links = R.chamberLinks(s), land = landing(s);
  // open a neighbour by hand and find a breach in it a post can stand near
  let done = false;
  for (const c of s.chambers.filter((k) => k.status === 'sealed' && links.get(k.id).has(land.id))) {
    if (c.breaches.length < 2) continue;
    c.status = 'open';
    const [b1, ...rest] = c.breaches, w = s.map.w, bx = b1 % w, by = (b1 / w) | 0;
    const spot = R.findSpot(s, 'safetypost', { box: { x0: bx - 9, y0: by - 9, x1: bx + 9, y1: by + 9 }, score: (x, y) => Math.abs(x - bx) + Math.abs(y - by), free: true });
    const other = rest.find((i) => Math.max(Math.abs((i % w) - (spot?.x ?? -99)), Math.abs(((i / w) | 0) - (spot?.y ?? -99))) > 12);
    if (!spot || other === undefined) { c.status = 'sealed'; continue; }
    const post = R.byId(s, R.build(s, 'safetypost', spot.x, spot.y).id); post.build = 0;
    const near1 = R.byId(s, R.build(s, 'seal', bx, by).id), far1 = R.byId(s, R.build(s, 'seal', other % w, (other / w) | 0).id);
    check(near1 && far1 && near1.build === 2 && far1.build === 2, 'two seals ordered');
    tick(s);
    check(near1.build === 0 && far1.build === 1, `a seal in a Safety Post's range goes up twice as fast (${near1.build}, ${far1.build})`);
    done = true;
    break;
  }
  check(done, 'safety post test set up');
}

// ---------------------------------------------------------------- Seed Vault

{
  const s = rich(13);
  learn(s, 'orchards', 'seeds');
  check(R.techEffect(s, 'output', 'farm') === 1.1, 'Seed Science: fields +10%');
  const v = put(s, 'seedvault');
  const { w } = s.map, c = R.centre(v);
  let poor = -1;
  for (let y = v.y - 4; y <= v.y + 4 && poor < 0; y++) for (let x = v.x - 4; x <= v.x + 4; x++) if (s.map.t[y * w + x] === T.PLAIN || s.map.t[y * w + x] === T.FERTILE) { poor = y * w + x; break; }
  // keep only one poor tile in range
  for (let y = Math.floor(c.y - 6); y <= c.y + 6; y++) for (let x = Math.floor(c.x - 6); x <= c.x + 6; x++) if (s.map.t[y * w + x] === T.POOR) s.map.t[y * w + x] = T.PLAIN;
  s.map.t[poor] = T.POOR;
  for (let d = 0; d < 9; d++) tick(s);
  check(s.map.t[poor] === T.POOR, 'Seed Vault: nothing before 10 days');
  tick(s);
  check(s.map.t[poor] === T.PLAIN && s.log.some((l) => /Seed Vault mended/.test(l.text)), 'Seed Vault: a poor tile in range turns plain after 10 days');
}

// ---------------------------------------------------------------- Meteoroid Sweeper strikes

{
  const s = rich(14, { difficulty: 'normal' });
  learn(s, 'smelting', 'sweeping');
  power(s, 4);
  const d = dockOf(s), box = { x0: d.x - 24, y0: d.y - 24, x1: d.x + 24, y1: d.y + 24 };
  let sw = put(s, 'sweeper', { box, score: (x, y) => Math.abs(x - d.x) + Math.abs(y - d.y) });
  if (!sw) {   // no meteoroid drift in reach on this map: make one
    const p = R.findSpot(s, 'solar', { box, score: (x, y) => (s.map.t[y * s.map.w + x] === T.VOID ? Math.abs(y - d.y - 6) : null), free: true });
    s.map.t[p.y * s.map.w + p.x] = T.METEOROID;
    sw = put(s, 'sweeper', { box, score: () => 0 });
  }
  check(!!sw, 'a sweeper on a meteoroid drift');
  let forced = 1;
  const rng = () => (forced-- > 0 ? 0 : 0.99);
  tick(s, rng);
  check(sw.down === 5 && s.log.some((l) => /meteoroid struck/.test(l.text)) && !R.active(sw), 'a strike knocks the sweeper out for 5 days');
  const ore = [];
  for (let k = 0; k < 6; k++) { tick(s, rng); ore.push(s.stats.last.produced.ore || 0); }
  check(ore.slice(0, 5).every((n) => n === 0) && ore[5] > 0 && R.active(sw), `back to work on the sixth day (${ore.map((n) => n.toFixed(1))})`);
  // about 2% a day with the colony's own dice
  const t = rich(14, { difficulty: 'normal' }); learn(t, 'smelting', 'sweeping');
  raw(t, 'sweeper', sw.x, sw.y);
  const r2 = stateRng(t);
  let strikes = 0;
  for (let k = 0; k < 1000; k++) { tick(t, r2); t.pending.length = 0; }
  strikes = t.log.filter((l) => /meteoroid struck/.test(l.text)).length + 0;
  check(strikes >= 4 && strikes <= 40, `strikes over 1000 days: ${strikes} (log keeps the last 200 lines)`);
}

// ---------------------------------------------------------------- Tailings Dumps

{
  const mk = (mines, dumps, fill = 0) => {
    const s = rich(15, { difficulty: 'normal' });
    learn(s, 'smelting');
    power(s, 10);
    s.pop = 200;   // full staff
    for (let k = 0; k < mines; k++) raw(s, 'oremine', 10 + 3 * k, 2);
    const ds = [];
    for (let k = 0; k < dumps; k++) ds.push(raw(s, 'tailings', 10 + 3 * k, 6, { fill }));
    return { s, ds };
  };
  const oreOf = ({ s }) => { tick(s); return s.stats.last.produced.ore || 0; };
  const four = oreOf(mk(4, 0)), five = oreOf(mk(5, 0)), fiveD = oreOf(mk(5, 1)), nine = oreOf(mk(9, 1)), nineD = oreOf(mk(9, 2));
  check(near(five, five) && near(four / 4, 15, 1e-6), `four mines need no dump (${four})`);
  check(near(five, 5 * 15 * 0.5) && near(fiveD, 5 * 15), `a fifth mine without a dump: half output (${five} vs ${fiveD})`);
  check(near(nine, 9 * 15 * 0.5) && near(nineD, 9 * 15), `nine mines need two dumps (${nine} vs ${nineD})`);
  const full = mk(5, 1, 100);
  check(near(oreOf(full), 5 * 15 * 0.5), 'a full dump takes no waste');
  const f = mk(6, 2, 0);
  tick(f.s);
  check(f.ds.every((d) => near(d.fill, 3)), `each mine adds 1 fill a day, spread over the dumps (${f.ds.map((d) => d.fill)})`);
  const g = mk(5, 1, 98);
  tick(g.s);
  check(g.ds[0].fill === 100 && g.s.log.some((l) => /Tailings Dump is full/.test(l.text)), 'a dump fills up to 100, with a warning');
  const c0 = g.s.stock.credits, r = R.emptyTailings(g.s, g.ds[0].id);
  check(r.ok && g.ds[0].fill === 0 && g.s.stock.credits === c0 - 50, 'emptyTailings: 50 credits, fill 0');
  check(!R.emptyTailings(g.s, g.ds[0].id).ok && !R.emptyTailings(g.s, cmdOf(g.s).id).ok, 'emptyTailings refusals');
  const built = rich(15); learn(built, 'smelting');
  const d = dockOf(built), tl = put(built, 'tailings', { box: { x0: d.x - 24, y0: d.y - 24, x1: d.x + 24, y1: d.y + 24 }, score: (x, y) => Math.abs(x - d.x) + Math.abs(y - d.y) });
  check(tl && tl.fill === 0, 'a built dump starts empty');
}

// ---------------------------------------------------------------- saves from before version 2

{
  const s = newGame({ seed: 16 });
  const rng = stateRng(s);
  for (let d = 0; d < 20; d++) { dayTick(s, rng); s.pending.length = 0; }
  s.pop = 90; dayTick(s, rng); s.pending.length = 0;   // past the 80-colonist milestone
  const old = JSON.parse(saveState(s));
  delete old.research; delete old.stock.alloy; delete old.stock.helium; delete old.market.alloy; delete old.market.helium;
  old.unlocked = old.unlocked.filter((k) => k !== 'lab');
  const back = loadState(JSON.stringify(old));
  check(back.research && back.research.done.length === 0 && back.stock.alloy === 0 && back.stock.helium === 0 && back.market.helium === 1, 'old save: defaults on load');
  check(back.unlocked.includes('lab') && !back.unlocked.includes('smelter'), 'old save past 80 colonists: the lab is unlocked');
  let err = null;
  try { const r = stateRng(back); for (let d = 0; d < 50; d++) { dayTick(back, r); back.pending.length = 0; } } catch (e) { err = e; }
  check(!err && back.day === s.day + 50 && !walk(back, 'state', []).length, `old save runs 50 days (${err?.message || 'ok'})`);
  check(R.techStatus(back).length === 40 && R.summary(back).stock.alloy.have === 0, 'old save: read-outs work');
  // a save that unlocked version 2 buildings without research is corrected
  const odd = JSON.parse(saveState(s)); odd.unlocked.push('smelter');
  check(!loadState(JSON.stringify(odd)).unlocked.includes('smelter'), 'load: tech buildings locked until their tech is done');
  // round trip with research in progress
  s.research.focus = 'medicine'; s.research.progress.medicine = 12.5; s.research.points = 3;
  check(saveState(loadState(saveState(s))) === saveState(s), 'save/load round trip keeps research');
}

// ---------------------------------------------------------------- the scripted version-2 player (Easy)

// The goal-following player of tests/colony-goals.mjs, plus research and the new buildings.
function placeAny(s, key, score) {
  const cc = cmdOf(s), dock = dockOf(s);
  const zone = R.spec({ key }).zone, nearB = zone === 'space' ? dock : cc;
  const box = zone === 'space' ? { x0: nearB.x - 26, y0: nearB.y - 26, x1: nearB.x + 26, y1: nearB.y + 26 } : { x0: 0, y0: 0, x1: s.map.w - 1, y1: s.map.h - 1 };
  const p = R.findSpot(s, key, { box, score: score || ((x, y) => Math.abs(x - nearB.x) + Math.abs(y - nearB.y)) });
  return p ? R.build(s, key, p.x, p.y) : { ok: false };
}
function roadInto(s, c, fromAnywhere = false) {
  const { w, h, ch } = s.map, road = new Set(s.buildings.filter((b) => b.key === 'road').map((b) => b.y * w + b.x));
  const seeds = fromAnywhere ? [...Array(w * h).keys()].filter((i) => ch[i] !== 255 && ch[i] !== c.id && R.chamberOf(s, ch[i])?.status === 'open' && R.canBuild(s, 'road', i % w, (i / w) | 0) === null) : [...road];
  const prev = new Int32Array(w * h).fill(-2), q = seeds;
  for (const i of q) prev[i] = -1;
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    if (ch[i] === c.id && !road.has(i)) { for (let j = i; j >= 0 && !road.has(j); j = prev[j]) R.build(s, 'road', j % w, (j / w) | 0); return true; }
    for (const j of [i - 1, i + 1, i - w, i + w]) if (prev[j] === -2 && R.canBuild(s, 'road', j % w, (j / w) | 0) === null) { prev[j] = i; q.push(j); }
  }
  return fromAnywhere ? false : roadInto(s, c, true);
}
const queued = (s, key) => s.buildings.some((b) => b.key === key && b.build > 0);
const count = (s, key) => s.buildings.filter((b) => b.key === key).length;
function upkeep(s) {
  const m = R.summary(s), place = (key) => (queued(s, key) ? null : placeAny(s, key));
  if (s.stock.credits < 150 && s.stock.food > 150) R.sell(s, 'food', Math.floor(s.stock.food - 120));
  if (m.stock.food.delta < 0) place('farm');
  if (m.stock.air.delta < 0) place('airplant');
  if (m.stock.water.delta < 0) place('riverpump');
  if (m.power.demand > m.power.supply * 0.95) place('solar');
  if (m.housing - s.pop < 10) place('habitat');
  if (s.happy < 60 && m.stock.credits.have > 400) place('park');
  // ore: sold until a smelter wants it
  const keepOre = count(s, 'smelter') ? 120 : 0;
  if (s.stock.ore > keepOre + 50) R.sell(s, 'ore', Math.floor(s.stock.ore - keepOre));
  // alloy: what the fabricator can't use is sold
  const keepAlloy = count(s, 'fabricator') ? 60 : 0;
  if (s.stock.alloy > keepAlloy + 30) R.sell(s, 'alloy', Math.floor(s.stock.alloy - keepAlloy));
}
function followGoal(s) {
  const g = goalStatus(s).current, sh = g?.show;
  if (!sh) return;
  if (sh.build) { if (!queued(s, sh.build) && (sh.build !== 'lab' || !count(s, 'lab'))) { const r = placeAny(s, sh.build); if (sh.build === 'depot' && r?.id) R.setMode(s, r.id, 'air'); } }
  else if (sh.chamber !== undefined) {
    const c = R.chamberOf(s, sh.chamber);
    if (c.status === 'sealed') R.chamberAction(s, c.id, 'survey');
    else if (c.status === 'surveyed' && R.openBreaches(s, c).length === 0) R.chamberAction(s, c.id, 'pressurise');
    else if (c.status === 'surveyed') for (const i of R.openBreaches(s, c)) R.build(s, 'seal', i % s.map.w, (i / s.map.w) | 0);
  } else if (sh.tile && g.id === 'seal') R.build(s, 'seal', sh.tile.x, sh.tile.y);
  else if (sh.roads) { const c = s.chambers.find((k) => k.status === 'open' && k.kind !== 'landing'); c && roadInto(s, c); }
  else if (sh.market) { if (s.stock.ore) R.sell(s, 'ore', s.stock.ore); else R.sell(s, 'food', 10); }
}
const ORDER = ['smelting', 'fabrication', 'medicine', 'canteens', 'deepdrill', 'reclaim', 'safety'];
function v2(s) {
  if (s.unlocked.includes('lab') && !count(s, 'lab')) placeAny(s, 'lab');
  if (!s.research.focus) { const t = ORDER.find((k) => R.techStatus(s).find((x) => x.key === k)?.available); if (t) R.research(s, t); }
  if (s.unlocked.includes('smelter') && !count(s, 'smelter')) placeAny(s, 'smelter');
  if (count(s, 'smelter') && count(s, 'oremine') < 2 && !queued(s, 'oremine')) {
    const seam = (x, y) => { let n = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (s.map.r[(y + dy) * s.map.w + x + dx] === 1) n++; const d = dockOf(s); return -n * 100 + Math.abs(x - d.x) + Math.abs(y - d.y); };
    placeAny(s, 'oremine', seam);
  }
  if (s.unlocked.includes('fabricator') && count(s, 'smelter') && !count(s, 'fabricator')) placeAny(s, 'fabricator');
  if (s.unlocked.includes('clinic') && !count(s, 'clinic')) {
    // where it covers the most homes
    const homes = s.buildings.filter((b) => b.key === 'habitat');
    placeAny(s, 'clinic', (x, y) => -homes.filter((h) => Math.max(Math.abs(h.x - x), Math.abs(h.y - y)) <= 8).length * 100 + Math.abs(x - cmdOf(s).x) + Math.abs(y - cmdOf(s).y));
  }
}
function playV2(seed, days = 250) {
  const s = newGame({ seed }), rng = stateRng(s), when = {}, t0 = performance.now();
  s.options.raids = false;   // a version-2 player builds no defences: raiders (version 3, 5) are tested in colony-v3
  let deaths = 0;
  for (let d = 0; d < days; d++) {
    followGoal(s); upkeep(s); v2(s);
    const before = s.pop;
    dayTick(s, rng);
    if (s.pop < before && s.log.some((l) => l.day === s.day && /died/.test(l.text))) deaths += before - s.pop;
    const fin = (k) => s.buildings.some((b) => b.key === k && b.build === 0);
    if (s.pop >= 80) when.pop80 ??= s.day;
    if (fin('lab')) when.lab ??= s.day;
    for (const k of s.research.done) when[k] ??= s.day;
    if ((s.stats.last.produced.alloy || 0) > 0) when.alloy ??= s.day;
    if (fin('fabricator') && (s.stats.last.consumed.alloy || 0) > 0) when.parts ??= s.day;
    if (fin('clinic')) when.clinic ??= s.day;
    if (s.buildings.some((b) => b.key === 'habitat' && b.level === 3)) when.apartments ??= s.day;
    s.pending.length = 0;
  }
  return { s, when, deaths, ms: performance.now() - t0 };
}
const runs = [];
for (const seed of [1, 2, 3]) {
  const r = playV2(seed);
  runs.push(r);
  const { s, when, deaths } = r;
  const apts = s.buildings.filter((b) => b.key === 'habitat' && b.level === 3).length;
  console.log(`v2 player seed ${seed} (easy): day ${s.day} pop ${s.pop} happy ${Math.round(s.happy)} deaths ${deaths} apartments ${apts} alloy made, research ${s.research.done.join(' ')} (${r.ms.toFixed(0)} ms)`);
  console.log('   ', Object.entries(when).map(([k, d]) => `${k}@${d}`).join(' '));
  const gs = goalStatus(s);
  console.log(`    goals (info, js/colony/goals.js): ${gs.done}/${gs.total}${gs.current ? `, current ${gs.current.id}` : ''}`);
  check(when.lab && when.smelting && when.fabrication && when.medicine, `seed ${seed}: lab, smelting, fabrication, medicine`);
  check(when.smelting < when.fabrication, `seed ${seed}: smelting before fabrication`);
  check(when.alloy && when.parts, `seed ${seed}: ore -> alloy -> parts`);
  check(when.clinic && when.apartments && when.apartments <= 250, `seed ${seed}: a Clinic and Apartments by day 250`);
  check(deaths === 0, `seed ${seed}: no deaths (${deaths})`);
  check(!walk(s, 'state', []).length, `seed ${seed}: no NaN`);
  check(R.GOODS.every((g) => s.stock[g] >= 0), `seed ${seed}: stocks never negative at the end`);
}
// determinism with version 2 running
check(saveState(playV2(2, 150).s) === saveState(playV2(2, 150).s), 'version 2: same seed, same colony');
// speed: 500 days of a grown version-2 colony
{
  const s = runs[0].s, rng = stateRng(s), t = performance.now();
  for (let d = 0; d < 500; d++) { dayTick(s, rng); s.pending.length = 0; }
  const ms = performance.now() - t;
  console.log(`500 more days of dayTick on the version-2 colony (${s.buildings.length} buildings): ${ms.toFixed(0)} ms`);
  check(ms < 1000, `500 days well under 2 s (${ms.toFixed(0)} ms)`);
}

console.log(failed ? `${failed} of ${failed + passed} checks FAILED` : `all ${passed} checks passed`);
process.exit(failed ? 1 : 0);
