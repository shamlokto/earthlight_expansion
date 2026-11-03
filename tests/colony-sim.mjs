// Colony simulation and rules (docs/COLONY-V1.md): placement, chambers, market, import, save/load,
// determinism, and the balance targets with a scripted player.   node tests/colony-sim.mjs
// Runs on the stand-in map (tests/colony-fakemap.mjs) and, when it exists, on js/colony/mapgen.js.
import { existsSync, readFileSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as rules from '../js/colony/rules.js';
import { dayTick, stateRng, runDays, habitatNeeds } from '../js/colony/sim.js';
import { BUILDING } from '../js/colony/data/buildings.js';
import { T, R } from '../js/colony/data/terrain.js';
import { generateFakeMap } from './colony-fakemap.mjs';

let failures = 0, checks = 0;
const check = (cond, what) => { checks++; if (!cond) { failures++; console.log('FAIL', what); } };
const refusals = [];
// Every refusal must be a readable sentence.
const act = (r) => { if (!r.ok) refusals.push(r.msg); return r; };

const types = JSON.parse(readFileSync(new URL('../js/expansion/data/units.json', import.meta.url))).units.map((u) => ({ type: u.type, value: u.value, hp: u.hp }));
const gens = [['stand-in', generateFakeMap]];
if (existsSync(new URL('../js/colony/mapgen.js', import.meta.url))) gens.push(['mapgen', (await import('../js/colony/mapgen.js')).generateMap]);

// ---------------------------------------------------------------- helpers

function walk(v, path, out) {
  if (typeof v === 'number') { if (!Number.isFinite(v)) out.push(path); }
  else if (ArrayBuffer.isView(v)) { for (let i = 0; i < v.length; i++) if (!Number.isFinite(v[i])) { out.push(`${path}[${i}]`); break; } }
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const k in v) walk(v[k], `${path}.${k}`, out);
  return out;
}
const openBoxes = (s) => s.chambers.filter((c) => c.status === 'open');
const net = (s, g) => (s.stats.last.produced[g] || 0) - (s.stats.last.consumed[g] || 0);
// What the buildings still under construction will add when finished (nominal numbers).
function queued(s) {
  const q = { food: 0, water: 0, air: 0, power: 0, housing: 0, jobs: 0 };
  for (const b of s.buildings) {
    if (!b.build) continue;
    const d = rules.spec(b);
    for (const [g, n] of Object.entries(d.makes || {})) if (g in q) q[g] += n;
    for (const [g, n] of Object.entries(d.uses || {})) if (g in q) q[g] -= n;
    q.power += d.power || 0; q.housing += d.housing || 0; q.jobs += d.jobs || 0;
  }
  return q;
}
function soilOf(s, x, y, size) {
  const { t, w } = s.map;
  let sum = 0, river = false;
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
    sum += { [T.FERTILE]: 1.8, [T.PLAIN]: 1.1, [T.POOR]: 0.55 }[t[(y + dy) * w + x + dx]] || 0;
    for (const [ax, ay] of [[x + dx + 1, y + dy], [x + dx - 1, y + dy], [x + dx, y + dy + 1], [x + dx, y + dy - 1]]) if (t[ay * w + ax] === T.RIVER) river = true;
  }
  return (sum / size / size) * (river ? 1.25 : 1);
}
const memo = new WeakMap();   // bot's notes per colony (kept out of the state)
const note = (s) => { let m = memo.get(s.map.t); if (!m) memo.set(s.map.t, (m = { cramped: -99 })); return m; };
function placeIn(s, key, boxes, score) {
  let best = null;
  for (const c of boxes) {
    const p = rules.findSpot(s, key, { box: c, score, free: true });
    if (p) { const v = score(p.x, p.y); if (!best || v < best.v) best = { ...p, v }; }
  }
  if (!best) { note(s).cramped = s.day; return false; }
  const cost = BUILDING[key].cost;
  if (s.stock.credits < cost.credits || s.stock.parts < cost.parts) return false;
  return act(rules.build(s, key, best.x, best.y)).ok;
}
// What a chamber holds (river, fertile soil, salvage), for choosing which one to open.
function contents(s, c) {
  const { t, sv, ch, w } = s.map, o = { river: 0, salvage: 0 };
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
    const i = y * w + x;
    if (ch[i] !== c.id) continue;
    if (t[i] === T.RIVER) o.river++;
    o.salvage += sv[i];
  }
  return o;
}
const near = (s, cx, cy) => (x, y) => Math.abs(x - cx) + Math.abs(y - cy);
const dockOf = (s) => s.buildings.find((b) => b.key === 'dock');
const cmdOf = (s) => s.buildings.find((b) => b.key === 'command');
const reachBox = (s) => { const d = dockOf(s); return { x0: Math.max(0, d.x - 24), y0: Math.max(0, d.y - 24), x1: Math.min(s.map.w - 1, d.x + 25), y1: Math.min(s.map.h - 1, d.y + 25) }; };

// ---------------------------------------------------------------- the scripted player

// A reasonable, not clever, build order: keep air, water, power and food ahead of the colony,
// house the newcomers beside parks, add a repair yard, open the next chamber when the landing
// chamber fills, mines and salvage after the unlock, sell ore.
function botDay(s) {
  for (const p of [...s.pending]) act(rules.answer(s, p.id, p.choices[0].key));
  const q = queued(s), sum = rules.summary(s), cmd = cmdOf(s);
  const busy = s.buildings.filter((b) => b.build > 0).length, crews = rules.crewsOf(s);
  const reserve = 200;
  const can = () => busy + did < crews + 1 && s.stock.credits > reserve;
  let did = 0;
  const go = (ok) => { if (ok) did++; return ok; };
  const home = near(s, cmd.x, cmd.y);
  const boxes = openBoxes(s);
  const power = sum.power.supply - sum.power.demand + q.power;
  const pop = s.pop, grow = Math.max(10, pop * 0.12);

  if (s.day === 60) act(rules.setTax(s, 0.15));
  if (can() && net(s, 'air') + q.air < grow * 0.6) go(placeIn(s, 'airplant', boxes, (x, y) => home(x, y) + (soilOf(s, x, y, 2) > 1.2 ? 40 : 0)));
  if (can() && power < 8) {
    if (s.unlocked.includes('induction') && s.stock.credits > 900) go(placeIn(s, 'induction', [reachBox(s)], home));
    if (!did) go(placeIn(s, 'solar', [reachBox(s)], (x, y) => (s.map.t[y * s.map.w + x] === T.HULL ? 0 : 50) + home(x, y) / 4));
  }
  if (can() && net(s, 'water') + q.water < 8 + grow * 0.5) go(placeIn(s, 'riverpump', boxes, home));
  if (can() && net(s, 'food') + q.food < grow) {
    const farmed = placeIn(s, 'farm', boxes, (x, y) => { const v = soilOf(s, x, y, 2); return v < 1.6 ? null : -v * 100 + home(x, y) / 10; });
    if (!go(farmed)) go(placeIn(s, 'hydro', boxes, (x, y) => home(x, y) + (soilOf(s, x, y, 1) > 1.2 ? 30 : 0)));
  }
  const fed = net(s, 'food') >= 0 && net(s, 'water') >= 0 && net(s, 'air') >= 0;
  if (can() && fed && sum.housing + q.housing - pop < Math.max(15, pop * 0.15)) {
    const field = rules.parkField(s);
    go(placeIn(s, 'habitat', boxes, (x, y) => home(x, y) + (field[y * s.map.w + x] ? 0 : 25) + (soilOf(s, x, y, 1) > 1.2 ? 30 : 0)));
  }
  const homes = s.buildings.filter((b) => b.key === 'habitat');
  if (can()) {
    const field = rules.parkField(s), bare = homes.find((b) => !field[b.y * s.map.w + b.x] && !b.build);
    if (bare && !s.buildings.some((b) => (b.key === 'park') && b.build)) go(placeIn(s, 'park', boxes, (x, y) => Math.abs(x - bare.x) + Math.abs(y - bare.y) + (soilOf(s, x, y, 1) > 1.2 ? 4 : 0)));
  }
  if (can() && s.day >= 8 && !s.buildings.some((b) => b.key === 'repairyard')) go(placeIn(s, 'repairyard', boxes, (x, y) => home(x, y) + (soilOf(s, x, y, 2) > 1.2 ? 40 : 0)));
  if (can() && pop >= 120 && s.buildings.some((b) => b.key === 'repairyard' && b.level === 1 && !b.build)) {
    const y = s.buildings.find((b) => b.key === 'repairyard' && b.level === 1 && !b.build);
    if (s.stock.credits > 900) go(act(rules.upgrade(s, y.id)).ok);
  }

  // Open the next chamber: survey, seal, pressurise (one at a time).
  if (s.day >= 25) {
    const work = s.chambers.find((c) => ['surveying', 'surveyed', 'pressurising'].includes(c.status));
    const open = s.chambers.filter((c) => c.status === 'open');
    const roomy = open.reduce((t, c) => t + c.tiles, 0) / 5 > pop + 40 && s.day - note(s).cramped > 10;
    if (!work && s.stock.credits > 400 && !roomy) {
      const links = rules.chamberLinks(s), salvage = s.buildings.some((b) => b.key === 'salvage');
      const value = (c) => { const o = contents(s, c); return c.breaches.length * 2 - (o.river ? 3 : 0) - (!salvage && o.salvage > 2000 ? 3 : 0) - c.tiles / 300; };
      const cand = s.chambers.filter((c) => c.status === 'sealed' && [...links.get(c.id)].some((id) => rules.chamberOf(s, id).status === 'open'))
        .sort((a, b) => value(a) - value(b));
      if (cand.length) act(rules.chamberAction(s, cand[0].id, 'survey'));
    } else if (work?.status === 'surveyed') {
      for (const i of rules.openBreaches(s, work)) {
        const x = i % s.map.w, y = (i / s.map.w) | 0;
        if (!s.buildings.some((b) => b.x === x && b.y === y) && s.stock.credits > 60 && s.stock.parts >= BUILDING.seal.cost.parts) act(rules.build(s, 'seal', x, y));
      }
      if (!rules.openBreaches(s, work).length) {
        const air = Math.ceil(work.tiles / 4);
        if (rules.storageCaps(s).air < air && !s.buildings.some((b) => b.key === 'depot' && b.build) && placeIn(s, 'depot', boxes, home)) act(rules.setMode(s, s.buildings.at(-1).id, 'air'));
        if (s.stock.air >= air) act(rules.chamberAction(s, work.id, 'pressurise'));
      }
    }
  }

  // After the unlock: ore on the seams, salvage beside rubble, sell the ore.
  if (s.unlocked.includes('oremine')) {
    const mines = s.buildings.filter((b) => b.key === 'oremine').length;
    if (can() && mines < 2 + (pop >= 160) && s.stock.credits > 500) {
      const seam = (x, y) => { let n = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (s.map.r[(y + dy) * s.map.w + x + dx] === R.ORE_SEAM) n++; return -n * 100 + near(s, dockOf(s).x, dockOf(s).y)(x, y); };
      go(placeIn(s, 'oremine', [reachBox(s)], seam));
    }
    if (can() && !s.buildings.some((b) => b.key === 'salvage') && s.stock.credits > 500) {
      const sv = (x, y) => { let n = 0; for (let dy = -5; dy <= 6; dy++) for (let dx = -5; dx <= 6; dx++) { const i = (y + dy) * s.map.w + x + dx; if (i >= 0 && i < s.map.sv.length) n += s.map.sv[i]; } return n < 200 ? null : -n; };
      go(placeIn(s, 'salvage', [...boxes, reachBox(s)], sv));
    }
    if (s.stock.ore >= 30) act(rules.sell(s, 'ore', Math.floor(s.stock.ore)));
  }
  const cap = rules.storageCaps(s);
  if (s.stock.food > cap.food * 0.9 && net(s, 'food') > 0) act(rules.sell(s, 'food', Math.floor(s.stock.food - cap.food * 0.7)));
  else if (s.stock.credits < 300 && s.stock.food > 150 && net(s, 'food') > 0) act(rules.sell(s, 'food', Math.floor(s.stock.food - 150)));
}

function play(gen, seed, days, { bot = true, onDay } = {}) {
  const s = newGame({ seed, generate: gen, types });
  const rng = stateRng(s);
  let transports = 0, badTransport = null, deaths200 = 0, firstDeath = null, minCredits = Infinity, deaths = 0, negative = null, nan = null, first80 = null;
  for (let d = 0; d < days; d++) {
    if (bot) botDay(s);
    const { events } = dayTick(s, rng);
    for (const e of events) if (e.kind === 'transport' && e.pause) {
      transports++;
      if (!/^A transport docks with \d+ colonists\.$/.test(e.text) || !s.pending.some((p) => p.kind === 'transport')) badTransport = e.text;
    }
    for (const e of events) if (e.kind === 'deaths') { if (s.day <= 200) deaths200 += +e.text.match(/\d+/)[0]; deaths += +e.text.match(/\d+/)[0]; firstDeath ||= s.log.slice(-12).map((l) => `    ${l.day}: ${l.text}`).join('\n') + `\n    stock ${JSON.stringify(s.stock, (k, v) => typeof v === 'number' ? Math.round(v) : v)} short ${JSON.stringify(s.flags.short)} power ${JSON.stringify(s.stats.last.power)}`; }
    for (const g of rules.GOODS) if (s.stock[g] < 0 && !negative) negative = `${g} ${s.stock[g]} on day ${s.day}`;
    if (s.battery < 0 && !negative) negative = `battery on day ${s.day}`;
    if (!nan && (s.day % 25 === 0 || d === days - 1)) { const bad = walk(s, 'state', []); if (bad.length) nan = `${bad.slice(0, 3)} on day ${s.day}`; }
    if (s.pop >= 80 && first80 === null) first80 = s.day;
    minCredits = Math.min(minCredits, s.stock.credits);
    onDay?.(s);
  }
  return { s, transports, badTransport, minCredits, deaths, deaths200, negative, nan, first80, firstDeath };
}

// COLONY_SEEDS=1-12 node tests/colony-sim.mjs: only the balance run, over many seeds and maps.
if (process.env.COLONY_SEEDS) {
  const [a, b = a] = process.env.COLONY_SEEDS.split('-').map(Number);
  for (const [name, gen] of gens) for (let seed = a; seed <= b; seed++) {
    let at200 = 0, c200 = 0;
    const r = play(gen, seed, 300, { onDay: (s) => { if (s.day === 200) { at200 = s.pop; c200 = Math.round(s.stock.credits); } } });
    console.log(`${name.padEnd(9)} seed ${String(seed).padStart(3)}: 80 on day ${r.first80}, day 200 pop ${at200} credits ${c200}, day 300 pop ${r.s.pop}, min credits ${Math.round(r.minCredits)}, deaths ${r.deaths200}/${r.deaths}`);
  }
  process.exit(0);
}

// ---------------------------------------------------------------- tests per map

for (const [name, gen] of gens) {
  console.log(`\n== map: ${name}`);
  const s0 = newGame({ seed: 7, generate: gen });
  const keys = s0.buildings.map((b) => b.key).sort().join(',');
  check(keys === 'command,dock,farm,habitat,habitat,riverpump', `start buildings: ${keys}`);
  check(s0.pop === 40 && s0.stock.credits === 3000 && s0.chambers.filter((c) => c.status === 'open').length === 1, 'start numbers');

  // Placement rules.
  {
    const s = newGame({ seed: 3, generate: gen });
    const land = openBoxes(s)[0], { w, t } = s.map;
    const sealed = s.chambers.find((c) => c.status === 'sealed');
    let sx = -1, sy = -1;
    for (let y = sealed.y0; y <= sealed.y1 && sx < 0; y++) for (let x = sealed.x0; x <= sealed.x1; x++) if ([T.PLAIN, T.DECK, T.FERTILE, T.POOR].includes(t[y * w + x])) { sx = x; sy = y; break; }
    check(/pressurised/.test(rules.canBuild(s, 'habitat', sx, sy)), 'interior refused in a sealed chamber');
    check(/unlocks at 80/.test(rules.canBuild(s, 'oremine', 0, 0)), 'ore mine locked before 80');
    const far = rules.findSpot(s, 'solar', { box: { x0: 0, y0: 0, x1: 30, y1: 30 } });
    // a void tile far from the dock (the corner tiles vary by map)
    let vx = -1, vy = -1;
    for (let y = 0; y <= 30 && vx < 0; y++) for (let x = 0; x <= 30; x++) if (t[y * w + x] === T.VOID) { vx = x; vy = y; break; }
    check(far === null && vx >= 0 && /reach/.test(rules.canBuild(s, 'solar', vx, vy)), 'space out of reach refused');
    const cmd = cmdOf(s);
    check(/already built/.test(rules.canBuild(s, 'habitat', cmd.x + 1, cmd.y + 1)), 'overlap refused');
    let riverFar = null;
    for (let y = land.y0; y <= land.y1 && !riverFar; y++) for (let x = land.x0; x <= land.x1; x++) {
      if (t[y * w + x] === T.PLAIN || t[y * w + x] === T.DECK) {
        if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => t[(y + dy) * w + x + dx] === T.RIVER) && !rules.occupancy(s)[y * w + x]) { riverFar = [x, y]; break; }
      }
    }
    check(/beside the artificial river/.test(rules.canBuild(s, 'riverpump', ...riverFar)), 'river pump needs the river');
    const sol = rules.findSpot(s, 'solar', { box: reachBox(s) });
    check(sol && rules.canBuild(s, 'solar', sol.x, sol.y) === null, 'a solar spot near the dock');
    const dk = dockOf(s);
    check(rules.inReach(s, dk.x, dk.y + 20) && !rules.inReach(s, dk.x, dk.y + 30) && !rules.inReach(s, dk.x + 30, dk.y), 'dock reach is 24 tiles');
    const fp = rules.findSpot(s, 'farm', { box: land });
    const c0 = s.stock.credits, r = act(rules.build(s, 'farm', fp.x, fp.y));
    check(r.ok && s.stock.credits === c0 - BUILDING.farm.cost.credits, 'build pays');
    const id = r.id;
    const mv = rules.findSpot(s, 'farm', { box: land, score: (x, y) => -x });
    const c1 = s.stock.credits; act(rules.move(s, id, mv.x, mv.y));
    check(s.stock.credits === c1 - Math.ceil(BUILDING.farm.cost.credits * 0.2), 'move costs 20%');
    const c2 = s.stock.credits; act(rules.demolish(s, id));
    check(s.stock.credits === c2 + Math.floor(BUILDING.farm.cost.credits / 2), 'demolish refunds half');
    check(!act(rules.demolish(s, cmd.id)).ok && !act(rules.move(s, cmd.id, 0, 0)).ok, 'command fixed');
    check(!act(rules.upgrade(s, s.buildings.find((b) => b.key === 'habitat').id)).ok, 'habitats are not bought up');
    check(!act(rules.build(s, 'nonsense', 1, 1)).ok && !act(rules.setMode(s, cmd.id, 'x')).ok && !act(rules.setTax(s, 'x')).ok, 'bad input refused');
    act(rules.setTax(s, 0.5)); check(s.tax === 0.3, 'tax clamps');
    check(!act(rules.sell(s, 'ore', 10)).ok && !act(rules.sell(s, 'gold', 1)).ok && !act(rules.sellGuardian(s, 99)).ok, 'market refusals');
    const bl = rules.buildable(s);
    check(bl.length === 17 && bl.find((b) => b.key === 'road') && bl.find((b) => b.key === 'oremine').why.includes('80'), 'buildable list');
    const ti = rules.tileInfo(s, cmd.x, cmd.y);
    check(ti.building?.key === 'command' && ti.chamber?.status === 'open', 'tileInfo');
    for (const k of ['park', 'reach', 'power', 'happiness']) check(rules.coverage(s, k).length === w * s.map.h, `coverage ${k}`);
  }

  // Market: 10 sold lowers the price 2%; recovery 5% of the gap a day.
  {
    const s = newGame({ seed: 4, generate: gen });
    s.stock.food = 200;
    const p0 = rules.price(s, 'food'), r = act(rules.sell(s, 'food', 10));
    check(r.ok && Math.abs(rules.price(s, 'food') / p0 - 0.98) < 1e-9, 'price drops 2% per 10');
    check(r.credits === Math.floor(r.credits) && r.credits > 0 && r.credits <= 10 * p0, 'sale gain');
    const gap = 1 - s.market.food; dayTick(s, stateRng(s));
    check(Math.abs((1 - s.market.food) - gap * 0.95) < 1e-9, 'price recovers 5% of the gap');
  }

  // Chambers: survey, seal every breach, pressurise, open; air upkeep starts.
  {
    const s = newGame({ seed: 5, generate: gen });
    const links = rules.chamberLinks(s), land = openBoxes(s)[0];
    const c = s.chambers.find((k) => k.status === 'sealed' && links.get(k.id).has(land.id));
    const lone = s.chambers.find((k) => k.status === 'sealed' && ![...links.get(k.id)].some((id) => rules.chamberOf(s, id).status === 'open'));
    check(!act(rules.chamberAction(s, lone.id, 'survey')).ok, 'survey needs an open neighbour');
    check(!act(rules.chamberAction(s, c.id, 'pressurise')).ok, 'pressurise needs a survey');
    const bx = c.breaches[0] % s.map.w, by = (c.breaches[0] / s.map.w) | 0;
    check(/Survey/.test(rules.canBuild(s, 'seal', bx, by) || ''), 'seal needs a survey');
    check(act(rules.chamberAction(s, c.id, 'survey')).ok && s.stock.credits === 2900, 'survey costs 100');
    runDays(s, 2);
    check(c.status === 'surveyed', 'survey takes 2 days');
    s.stock.credits = 5000; s.stock.parts = 300;
    for (const i of c.breaches) act(rules.build(s, 'seal', i % s.map.w, (i / s.map.w) | 0));
    if (c.breaches.length) check(!act(rules.chamberAction(s, c.id, 'pressurise')).ok, 'unsealed breaches block');
    for (let d = 0; d < 40 && rules.openBreaches(s, c).length; d++) dayTick(s, stateRng(s));
    check(!rules.openBreaches(s, c).length, 'all breaches sealed');
    s.stock.air = 1000;
    const air0 = s.stock.air;
    check(act(rules.chamberAction(s, c.id, 'pressurise')).ok && s.stock.air === air0 - Math.ceil(c.tiles / 4), 'pressurise spends tiles/4 air');
    for (let d = 0; d < 5; d++) dayTick(s, stateRng(s));
    check(c.status === 'open' && s.pending.some((p) => p.kind === 'chamber'), 'opens after 5 days');
    const sealB = s.buildings.find((b) => b.key === 'seal');
    if (sealB) check(!act(rules.demolish(s, sealB.id)).ok, 'a seal holding air stays');
  }

  // Salvage turns rubble into plain soil; careful mode yields double per tile.
  {
    const s = newGame({ seed: 6, generate: gen });
    const rub = s.chambers.find((c) => { for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (s.map.t[y * s.map.w + x] === T.RUBBLE) return true; return false; });
    if (rub) {
      rub.status = 'open'; s.unlocked.push('salvage'); s.stock.credits = 9000; s.stock.parts = 300;
      const p = rules.findSpot(s, 'salvage', { box: rub, score: (x, y) => { let n = 0; for (let dy = -5; dy <= 6; dy++) for (let dx = -5; dx <= 6; dx++) n += s.map.sv[(y + dy) * s.map.w + x + dx] || 0; return -n; } });
      const id = act(rules.build(s, 'salvage', p.x, p.y)).id, b = rules.byId(s, id);
      b.build = 0;
      const sv0 = s.map.sv.reduce((a, v) => a + v, 0), rubble0 = s.map.t.filter((v) => v === T.RUBBLE).length;
      s.stock.parts = 0;
      runDays(s, 60);
      const sv1 = s.map.sv.reduce((a, v) => a + v, 0), rubble1 = s.map.t.filter((v) => v === T.RUBBLE).length;
      check(sv1 < sv0 && rubble1 < rubble0, `salvage clears rubble (${rubble0} -> ${rubble1})`);
      act(rules.setMode(s, id, 'careful'));
      const a = s.map.sv.reduce((x, v) => x + v, 0);
      s.stock.parts = 0;
      dayTick(s, stateRng(s));
      const used = a - s.map.sv.reduce((x, v) => x + v, 0), got = s.stock.parts - (BUILDING.command.makes.parts || 0);
      check(used > 0 && Math.abs(got - 2 * used) < 1e-6, `careful: double parts per salvage (${used} -> ${got})`);
    } else console.log('  (no rubble chamber on this map: salvage test skipped)');
  }

  // Habitat needs read-out.
  {
    const s = newGame({ seed: 8, generate: gen });
    dayTick(s, stateRng(s));
    const hab = s.buildings.find((b) => b.key === 'habitat');
    const n1 = habitatNeeds(s, hab);
    check(n1.some((n) => n.need === 'park' && !n.met) && n1.some((n) => n.need === 'food'), 'level 1 lists food and a park');
    check(habitatNeeds(s, { ...hab, level: 2 }).some((n) => n.need === 'clinic' && !n.met), 'level 2 needs a clinic (missing in version 1)');
  }

  // Import: credits from the sold army (non-beta), guardians (beta), sellGuardian.
  {
    const roster = [{ id: 1, type: 30, level: 3 }, { id: 2, type: 4, level: 1 }, { id: 3, type: 39, level: 0 }];
    const data = { 'el-expansion-campaign-remnant': JSON.stringify({ roster }) };
    const price = (k) => Math.max(1, types[k].value) * types[k].hp;
    const want = 10 * roster.reduce((t, r) => t + price(r.type), 0);
    const a = newGame({ seed: 1, generate: gen, importSave: data, types });
    check(a.stock.credits === 3000 + want && a.imported.credits === want && !a.guardians.length, `non-beta import +${want}`);
    const b = newGame({ seed: 1, generate: gen, importSave: { 'el-expansion-campaign': JSON.stringify({ roster }) } });
    check(b.stock.credits === 3000 + 10 * 24 * 3, 'import without types: 24 a machine');
    const c = newGame({ seed: 1, generate: gen, importSave: data, beta: true, types });
    check(c.stock.credits === 3000 && JSON.stringify(c.guardians) === JSON.stringify(roster), 'beta: guardians = roster');
    const r = act(rules.sellGuardian(c, 1));
    check(r.ok && c.stock.credits === 3000 + price(30) * 10 && c.stock.parts === 250 + price(30) && c.guardians.length === 2, 'sellGuardian');
  }

  // Do-nothing player: declines slowly, alive at day 30.
  {
    const curve = [];
    const { s } = play(gen, 11, 60, { bot: false, onDay: (s) => { if (s.day % 10 === 0) curve.push(`${s.day}:${s.pop}`); } });
    console.log('  do-nothing pop', curve.join(' '));
    const at30 = +curve[2].split(':')[1];
    check(at30 > 0 && at30 < 40, `do-nothing alive but declining at day 30 (${at30})`);
    check(s.pop <= 40, 'do-nothing does not grow');
  }

  // The scripted player: 80 by day 40–80, 200+ by day 200, never starving, credits positive.
  {
    const curve = [];
    const t0 = performance.now();
    const res = play(gen, 21, 500, { onDay: (s) => { if (s.day % 20 === 0) curve.push(s.day <= 200 || s.day % 100 === 0 ? `  day ${String(s.day).padStart(3)}  pop ${String(s.pop).padStart(3)}  credits ${String(Math.round(s.stock.credits)).padStart(5)}  happy ${Math.round(s.happy)}  housing ${s.housing}  open ${s.chambers.filter((c) => c.status === 'open').length}  tax ${s.stats.last.tax.toFixed(0)} upkeep ${s.stats.last.upkeep} sold ${s.flags.sold || 0}` : null); } });
    const ms = performance.now() - t0, s = res.s;
    console.log(curve.filter(Boolean).join('\n'));
    console.log(`  reached 80 on day ${res.first80}; min credits ${Math.round(res.minCredits)}; deaths ${res.deaths200} by day 200, ${res.deaths} by day 500; buildings ${s.buildings.length}; 500 days with the bot in ${ms.toFixed(0)} ms`);
    check(res.first80 !== null && res.first80 >= 40 && res.first80 <= 80, `80 colonists by day 40-80 (day ${res.first80})`);
    const at200 = curve[9];
    check(+at200.match(/pop +(\d+)/)[1] >= 200, `200+ by day 200 (${at200.trim()})`);
    check(res.deaths200 === 0, `no deaths in 200 days (${res.deaths200}; ${res.deaths} in 500)`);
    if (res.firstDeath) console.log('  first deaths:\n' + res.firstDeath);
    check(res.minCredits > 0, `credits stay positive (min ${Math.round(res.minCredits)})`);
    check(!res.negative, `stocks never negative (${res.negative})`);
    check(!res.nan, `no NaN (${res.nan})`);
    check(res.transports > 10 && !res.badTransport, `transports dock as pausing events (${res.transports}; ${res.badTransport})`);
    check(['induction', 'battery', 'oremine', 'salvage'].every((k) => s.unlocked.includes(k)), 'unlocked at 80');
    check(s.buildings.some((b) => b.key === 'habitat' && b.level === 2), 'habitats grew');

    // Pure simulation speed on the grown colony.
    const t1 = performance.now(), rng = stateRng(s);
    for (let d = 0; d < 500; d++) dayTick(s, rng);
    const ms2 = performance.now() - t1;
    console.log(`  500 more days of dayTick alone: ${ms2.toFixed(0)} ms`);
    check(ms2 < 1000, `500 days well under 2 s (${ms2.toFixed(0)} ms)`);
    check(!walk(s, 'state', []).length, 'no NaN after 1000 days');
  }

  // Determinism and save/load.
  {
    const a = play(gen, 33, 120).s, b = play(gen, 33, 120).s;
    check(saveState(a) === saveState(b), 'same seed, same colony');
    const text = saveState(a), back = loadState(text);
    check(saveState(back) === text, 'save/load round trip');
    check(back.map.t instanceof Uint8Array && back.map.t.every((v, i) => v === a.map.t[i]) && back.map.sv.every((v, i) => v === a.map.sv[i]), 'typed arrays restored');
    const ra = stateRng(a), rb = stateRng(back);
    for (let d = 0; d < 60; d++) { botDay(a); dayTick(a, ra); botDay(back); dayTick(back, rb); }
    check(saveState(a) === saveState(back), 'a loaded colony continues identically');
  }
}

const bad = refusals.filter((m) => typeof m !== 'string' || m.length < 8 || !/[.!?]$/.test(m) || /undefined|NaN|null|\[object/.test(m));
check(!bad.length, `refusal messages readable: ${JSON.stringify([...new Set(bad)].slice(0, 5))}`);
console.log(`\n${refusals.length} refusals seen, e.g.:`, [...new Set(refusals)].slice(0, 6).join(' | '));
console.log(failures ? `\n${failures} of ${checks} checks FAILED` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
