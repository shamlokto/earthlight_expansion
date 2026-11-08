// Version 7 (docs/COLONY-V7.md): zoning and growth. Living, Market and Workshop Quads are cheap 2×2 lots that
// develop by themselves, level by level, while their zone has demand and their street has what each level
// needs, and fall back when a need fails; RCI demand; the supporting buildings and techs; save and load; and
// a balance run: a quad-built town against a town of Habitats and Tower Blocks.
// Retired in version 9 and reinstated on 2026-11-07 (owner: "reinstate the quads but make r, c, and i gauge more
// lenient ... so that it will build faster"): on the menu from day 1 again, a lenient RCI gauge (a base demand in each
// zone, half spent per lot), 2 days a level (1 near transit), light early levels, a 20-day fall-back; the speed targets
// (a fresh colony's first Living Quad: Row Houses within 10 days, Courtyard Flats within 30) are checked below, and so
// are the legacy saves (a version 9 save gets the quads back on its menu; its standing quads keep their levels).
//   node tests/colony-quads.mjs
import { existsSync, readFileSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng, SIM, quadDays } from '../js/colony/sim.js';
import { BUILDING, BUILDINGS, NEEDS } from '../js/colony/data/buildings.js';
import { TECH, TECHS } from '../js/colony/data/tech.js';
import { KITS, kitParts, kitHeight } from '../js/colony/view3d/kits.js';
import { MANIFEST } from '../js/colony/art.js';
import { helpHtml, HELP_SECTIONS } from '../js/colony/ui.js';
import { advise } from '../js/colony/goals.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const QUADS = ['livingquad', 'marketquad', 'workshopquad'];
const V7 = BUILDINGS.filter((d) => d.ver === 7);

// ---------------------------------------------------------------- helpers
// A colony on its landing chamber with credits to spare, nothing pending, raids off.
function colony(seed = 1) {
  const s = newGame({ seed });
  s.stock.credits = 1e5; s.stock.parts = 200; s.pending.length = 0; s.options.raids = false;
  // power to spare, so the tests are about the quads' own conditions: a Sun Mirror out in space (a stand-in)
  s.buildings.push({ id: s.nextId++, key: 'sunmirror', x: 0, y: 0, level: 1, mode: null, build: 0, off: false });
  return s;
}
const landing = (s) => s.chambers.find((c) => c.status === 'open' && !c.deck);
const cmdOf = (s) => s.buildings.find((b) => b.key === 'command');
function learn(s, ...keys) {
  for (const k of keys) {
    if (!s.research.done.includes(k)) s.research.done.push(k);
    for (const u of TECH[k].unlocks) if (!s.unlocked.includes(u)) s.unlocked.push(u);
  }
}
// Place `key` finished, at a free spot nearest (x, y) (default: the Command Centre), inside the landing chamber.
function put(s, key, at = null, { gap = 0 } = {}) {
  const c = at || cmdOf(s), n = BUILDING[key].size;
  const p = R.findSpot(s, key, { box: landing(s), free: true, score: (x, y) => { const d = Math.max(Math.abs(x + n / 2 - c.x), Math.abs(y + n / 2 - c.y)); return d < gap ? null : d; } });
  if (!p) return null;
  const r = R.build(s, key, p.x, p.y);
  if (!r.ok) return null;
  const b = s.buildings.find((k) => k.id === r.id);
  b.build = 0;
  return b;
}
// A day with the stores topped up (food, water, air at their caps), so needs are met unless a test says otherwise.
function day(s, rng, n = 1, { feed = true } = {}) {
  for (let k = 0; k < n; k++) {
    if (feed) { const cap = R.storageCaps(s); for (const g of ['food', 'water', 'air']) s.stock[g] = cap[g]; }
    s.pending.length = 0;
    dayTick(s, rng);
  }
}
const lvName = (b) => R.spec(b).levelName;
// Version 11: a road tile beside a building (the first free side), laid through the rules. Returns the road or null.
function roadBeside(s, b) {
  const n = BUILDING[b.key].size;
  for (const [x, y] of [...Array(n).keys()].flatMap((k) => [[b.x + n, b.y + k], [b.x - 1, b.y + k], [b.x + k, b.y - 1], [b.x + k, b.y + n]])) {
    const r = R.buildRoad(s, x, y, x, y, b.deck || 'main');
    if (r.ok) return s.buildings.find((k) => k.key === 'road' && k.x === x && k.y === y);
  }
  return null;
}

// ---------------------------------------------------------------- data
{
  // version 11 (docs/COLONY-V11.md): an empty lot, eight built levels and two merged ones (2 and 4 quads)
  check(QUADS.every((k) => BUILDING[k]?.quad && BUILDING[k].size === 2 && BUILDING[k].levels.length === 11 && BUILDING[k].levels.filter((l) => l.mega).map((l) => l.mega).join() === '2,4'), 'three quads, 2×2, an empty lot, eight levels and two merged levels each');
  check(JSON.stringify(BUILDING.livingquad.levels.map((l) => l.housing)) === JSON.stringify([0, 40, 100, 220, 300, 400, 700, 1000, 1400, 1750, 2100]), 'Living Quad homes 0 / 40 / 100 / 220 / 300 / 400 / 700 / 1,000 / 1,400, merged 1,750 / 2,100 each');
  check(BUILDING.livingquad.levels.slice(1, 9).map((l) => l.name).join() === 'Cottages,Row Houses,Courtyard Flats,Garden Terraces,Mid-rise,Residential Tower,Sky Tower,Crown Spire'
    && BUILDING.marketquad.levels.slice(1, 9).map((l) => l.name).join() === 'Stalls,Shops,Market Hall,Arcade,Galleria,Trade Tower,Exchange,Grand Bazaar'
    && BUILDING.workshopquad.levels.slice(1, 9).map((l) => l.name).join() === 'Workshops,Machine Shops,Works,Foundry,Assembly Plant,Factory,Robotic Works,Megafactory', 'the eight levels of each quad, by name');
  for (const k of QUADS) {
    const f = { livingquad: 'housing', marketquad: 'jobs', workshopquad: 'jobs' }[k], v = BUILDING[k].levels.map((l) => l[f] || 0);
    check(v.every((x, i) => i === 0 || x > v[i - 1]), `${k}: ${f} rise level by level (${v.join(' ')})`);
    const top = BUILDING[k].levels[8], m2 = BUILDING[k].levels[9], m4 = BUILDING[k].levels[10];
    check(Math.abs(m2[f] / top[f] - 1.25) < 0.02 && Math.abs(m4[f] / top[f] - 1.5) < 0.02 && !m2.needs && !m4.needs, `${k}: merged levels give a quarter (two) and a half (four) more each, and are never grown into`);
  }
  check(BUILDING.marketquad.levels.slice(1).every((l) => l.jobs > 0 && l.makes.credits > 0 && l.service > 0 && l.shoppers > 0), 'Market Quad levels: jobs, credits, shopping and shoppers');
  check(BUILDING.workshopquad.levels.slice(1).every((l) => l.jobs > 0 && l.makes.parts > 0 && l.nuisance > 0) && BUILDING.workshopquad.levels[6].makes.alloy > 0, 'Workshop Quad levels: jobs, parts (alloy higher up) and noise');
  check(QUADS.every((k) => BUILDING[k].levels.slice(7, 9).every((l) => l.needs.some((n) => n === 'transit' || n === 'monorail'))) && QUADS.every((k) => BUILDING[k].levels[8].needs.includes('monorail')), 'the top levels want transit, and the very top a monorail line');
  check(['livingquad', 'marketquad'].every((k) => BUILDING[k].levels.slice(7, 9).every((l) => l.needs.some((n) => n.startsWith('value:')))) && BUILDING.livingquad.levels[8].needs.includes('luxuries') && BUILDING.marketquad.levels[8].needs.includes('luxuries'), 'and land value, and the very top coffee and wine');
  check(V7.length === 7 && TECHS.filter((t) => t.ver === 7).length === 6, `version 7: 7 buildings, 6 techs (${V7.length}, ${TECHS.filter((t) => t.ver === 7).length})`);
  check(QUADS.every((k) => BUILDING[k].levels.every((l) => R.habitatLevelReachable(l))), 'every quad level is offered (its needs are known words)');
  check(QUADS.every((k) => BUILDING[k].levels[6].needs.includes('tech:' + { livingquad: 'skyscrapers', marketquad: 'skyscrapers', workshopquad: 'automation' }[k])), 'Residential Tower, Trade Tower and Factory wait on a tech (as before)');
  check(QUADS.every((k) => BUILDING[k].levels[8].needs.some((n) => n.startsWith('tech:') && n !== 'tech:skyscrapers' && n !== 'tech:automation')), 'the very top waits on a later tech (Arcologies, Luxury Goods, Heavy Works)');
  check(QUADS.every((k) => !BUILDING[k].retired), 'reinstated: none of the quads is retired');
  const L = BUILDING.livingquad.levels;
  check(JSON.stringify(L[1].needs) === '["demand:R"]' && JSON.stringify(L[2].needs) === '["demand:R","allNeeds"]', 'lenient early levels: Cottages want only demand, Row Houses demand and the colony\'s needs met');
  check(['park', 'clinic', 'quiet'].every((k) => L[3].needs.includes(k)) && !L[3].needs.some((n) => n === 'shops' || n.startsWith('happy')), 'Courtyard Flats: a park, a Clinic and quiet (no shops or happiness gate)');
  check(BUILDING.marketquad.levels[1].needs.includes('residents:20') && BUILDING.workshopquad.levels[2].needs.join() === 'demand:I,allNeeds', 'Stalls want homes for 20 nearby; Machine Shops only demand and needs met');
  check(SIM.quadGrowDays === 2 && SIM.quadTransitGrowDays === 1 && SIM.quadShrinkDays === 20 && SIM.growDays === 5 && SIM.shrinkDays === 10, 'quads: 2 days a level (1 near transit), fall back after 20; Habitats unchanged (5 and 10)');
  check(V7.every((d) => d.cost.credits > 0 && (d.tech ? TECH[d.tech]?.unlocks.includes(d.key) || TECH[d.tech] : true)), 'supporting buildings have their techs');
  const s = newGame({ seed: 1 });
  check(QUADS.every((k) => s.unlocked.includes(k)) && ['school', 'transit', 'monorail', 'freightyard'].every((k) => !s.unlocked.includes(k)), 'the quads are on the menu from day 1; the supporting buildings wait on research');
  check(R.buildable(s).filter((b) => QUADS.includes(b.key)).length === 3 && R.buildable(s).filter((b) => QUADS.includes(b.key)).every((b) => b.why === null && b.cat === 'homes'), 'the quads sit in Homes & parks, buildable at once');
  const ui = readFileSync(new URL('../js/colony/ui.js', import.meta.url), 'utf8');
  check(/\.sort\(\(a, b\) => \(b\.quad \? 1 : 0\) - \(a\.quad \? 1 : 0\)\)/.test(ui), 'they lead the Homes & parks menu');
  check(/function renderRci\(\) \{\n\s+if \(!rciEl/.test(ui) && /Zone Living, Market and Workshop Quads/.test(ui) && /rciEl\.hidden = false/.test(ui), 'the RCI demand bars are back in the build menu header');
  check(HELP_SECTIONS.some(([id]) => id === 'zoning') && /take <b>2 days<\/b>/.test(helpHtml(() => null, null)) && /<b>20 days<\/b>/.test(helpHtml(() => null, null)) && /Megastructures/.test(helpHtml(() => null, null)), 'How to play: Zoning and growth, with the timings and the megastructures');
  check(/What roads give/.test(helpHtml(() => null, null)) && /noise does not<\/b> travel/.test(helpHtml(() => null, null)) && /Monorail lines<\/b> build themselves/.test(helpHtml(() => null, null)), 'How to play: Roads explains the road rules and the monorail lines');
  { const a = colony(9); a.pop = R.housingOf(a); check(advise(a).some((t) => /zone Living Quads/.test(t.text)), 'the advisor suggests zoning Living Quads when every home is full'); }
  check(TECHS.filter((t) => t.ver === 7).every((t) => t.needs.every((n) => TECH[n])), 'version 7 techs have known prerequisites');
  // 3D kits that change by level, art slots and prompts
  for (const k of QUADS) {
    const LV = [1, 2, 3, 4, 5, 6, 7, 8, 9], h = LV.map((l) => kitHeight(kitParts(k, l)));
    check(KITS[k] && h.every((v, i) => i === 0 || v >= h[i - 1] - 1e-9) && h[8] > h[1] * 2.5, `${k}: its kit grows by level (${h.map((v) => v.toFixed(2)).join(' ')})`);
    check(new Set(LV.map((l) => JSON.stringify(kitParts(k, l)))).size === 9, `${k}: each level looks different`);
    const m2 = kitParts(k, 10, null, { id: 1, mega: { lead: 1, n: 2, x: 0, y: 0, w: 4, h: 2 } }), m4 = kitParts(k, 11, null, { id: 1, mega: { lead: 1, n: 4, x: 0, y: 0, w: 4, h: 4 } });
    const v2 = kitParts(k, 10, null, { id: 1, mega: { lead: 1, n: 2, x: 0, y: 0, w: 2, h: 4 } });
    check(kitHeight(m2) >= h[8] && kitHeight(m4) >= kitHeight(m2) - 1e-9 && m4.length > m2.length * 0.8 && kitParts(k, 11, null, { id: 2, mega: { lead: 1, n: 4, x: 0, y: 0, w: 4, h: 4 } }).length === 0, `${k}: megastructure kits, huge, drawn by the lead quad only (${kitHeight(m2).toFixed(1)}, ${kitHeight(m4).toFixed(1)})`);
    check(Math.max(...m2.map((p) => p.pos[0])) > 1.5 && Math.max(...v2.map((p) => p.pos[2])) > 1.5 && Math.max(...v2.map((p) => p.pos[0])) < 1.2, `${k}: the kit spans the block (4×2 or turned for 2×4)`);
  }
  check(V7.every((d) => KITS[d.key] && kitParts(d.key).every((p) => p.size.every(Number.isFinite) && p.pos.every(Number.isFinite))), 'every version 7 building has a 3D kit');
  check(V7.every((d) => d.key in Object.fromEntries(Object.keys(MANIFEST).map((m) => [m.replace('card/', ''), 1])) && existsSync(new URL(`../tools/art/colony/prompts/card-${d.key}.txt`, import.meta.url))), 'every version 7 building has a card slot and a prompt');
  check(/Zoning and growth/.test(helpHtml(() => null, null)) && /help-zoning/.test(helpHtml(() => null, null)), 'How to play: Zoning and growth');
}

// ---------------------------------------------------------------- demand
{
  const s = colony(1);
  let d = R.demandOf(s);
  // a new colony: 40 colonists, homes for 60: a base of 80 + the next two transports (40) − half the 20 free homes
  check(d.R.units === 80 + 40 - 10 && d.R.why.arriving === 20 && d.R.why.pipeline === 40 && d.R.why.freeHomes === 20 && d.R.value > 0, `a new colony already wants homes: the first lots grow at once (R ${d.R.units})`);
  check(d.C.units > 0 && d.I.units > 0, `and shops and work (C ${d.C.units}, I ${d.I.units})`);
  s.pop = 60;
  d = R.demandOf(s);
  check(d.R.units === 80 + 40 + Math.max(0, R.jobsOf(s) - s.pop) - Math.round((R.housingOf(s) - s.pop) * 0.5), `residential demand: base, the next two transports, free jobs, less half the free homes (${d.R.units})`);
  check(d.C.units === 40 + Math.round(s.pop * 1.5), `commercial demand: 40 + 1.5 per resident (${d.C.units})`);
  check(d.I.units === Math.round(30 + s.pop * 0.05) + s.pop - R.jobsOf(s) + Math.round(40 * (0.5 - s.stock.parts / R.storageCaps(s).parts)), `industrial demand: 30 + 5% of colonists, the jobless, and a pull for parts (${d.I.units})`);
  { const t = colony(1); t.pop = 2000; t.buildings.push({ id: t.nextId++, key: 'towerblock', x: 0, y: 4, level: 4, mode: null, build: 0, off: false }); const big = R.demandOf(t); check(big.R.why.base === 200 && big.C.why.wantShops === 3040, 'a big colony: the base grows with it (10% of colonists for R)'); }
  check(['R', 'C', 'I'].every((z) => d[z].value >= -1 && d[z].value <= 1), 'demand bars stay within −1..1');
  const m = put(s, 'marketquad'); m.level = 2;
  check(R.demandOf(s).C.units === 40 + Math.round(s.pop * 1.5) - 150, 'a Market Quad with Stalls serves 150 shoppers');
  const w = put(s, 'workshopquad', null, { gap: 6 }); w.level = 2;
  check(R.demandOf(s).I.why.jobless === d.I.why.jobless - 10 - 6, 'Workshops (10 jobs) and Stalls (6) take up the jobless');
  s.stock.parts = 0;
  check(R.demandOf(s).I.why.partsPull === 20, 'an empty parts store pulls industry (+20)');
  s.pop = 2000;
  check(R.demandOf(s).R.why.arriving === 40, 'a big colony expects bigger transports');
  for (let k = 0; k < 3; k++) s.buildings.push({ id: s.nextId++, key: 'arrivals', x: 0, y: k * 2, level: 1, mode: null, build: 0, off: false });   // (stand-ins: only the count of halls matters)
  check(R.demandOf(s).R.why.arriving === 100, 'and Arrivals Halls make them bigger still (×2.5)');
}

// ---------------------------------------------------------------- growth, up and down
{
  const s = colony(2), rng = stateRng(s);
  const q = put(s, 'livingquad', null, { gap: 4 });
  check(q && q.level === 1 && R.spec(q).housing === 0 && lvName(q) === 'Zoned lot', 'a Living Quad starts as an empty Zoned lot');
  const n0 = R.habitatNeeds(s, q);
  check(n0.length === 1 && n0[0].need === 'demand:R' && n0[0].met && n0[0].grow && /Residential demand \(\+\d+\)/.test(n0[0].label), `to grow into Cottages: residential demand, there already in a new colony (${n0.map((n) => n.label)})`);
  day(s, rng, SIM.quadGrowDays - 1);
  check(q.level === 1 && q.grow === SIM.quadGrowDays - 1, `it counts the days (${q.grow})`);
  day(s, rng);
  check(q.level === 2 && lvName(q) === 'Cottages' && R.spec(q).housing === 40 && s.log.some((l) => /Zoning: Living Quad → Cottages/.test(l.text)), 'after 2 days: Cottages for 40');
  const n1 = R.habitatNeeds(s, q);
  check(n1.map((n) => n.need).sort().join() === 'air,demand:R,food,power,water', `to grow into Row Houses: demand and every need, nothing more (${n1.map((n) => n.need)})`);
  day(s, rng, SIM.quadGrowDays);
  check(q.level === 3 && lvName(q) === 'Row Houses' && R.housingOf(s) >= 100, `two days more, no park needed: Row Houses (${lvName(q)})`);
  const n2 = R.habitatNeeds(s, q);
  check(['park', 'clinic', 'quiet', 'road'].every((k) => n2.some((n) => n.need === k)) && !n2.find((n) => n.need === 'park').met, `to grow into Courtyard Flats: a park, a Clinic, quiet, a road (${n2.map((n) => n.need)})`);
  check(n2.find((n) => n.need === 'road').grow && n2.find((n) => n.need === 'road').label === 'A road beside it', 'the road only gates growing (version 11)');
  s.pop = 300;   // plenty of demand, so only the street holds it back
  day(s, rng, 6);
  check(q.level === 3, 'without a park and a Clinic it stays Row Houses');
  learn(s, 'medicine');
  const park = put(s, 'park', { x: q.x + 1, y: q.y + 1 }), clinic = put(s, 'clinic', { x: q.x + 1, y: q.y + 1 });
  check(R.parkAt(s, q) > 0 && R.serviceAt(s, q, 'clinic') > 0, 'a park and a Clinic beside it');
  day(s, rng, SIM.quadGrowDays + 2);
  check(q.level === 3, 'version 11: with no road beside it, it stays Row Houses (it does not shrink either)');
  check(!!roadBeside(s, q) && R.touchesRoad(s, q), 'a road laid beside it');
  day(s, rng, 1);
  check(q.level === 4 && lvName(q) === 'Courtyard Flats' && R.spec(q).housing === 220, `with a road too: Courtyard Flats for 220, in a day (a road takes a day off) (${lvName(q)})`);
  // workshop noise: a Workshop Quad growing next door pushes the Courtyard Flats back to Row Houses, gently
  const w = put(s, 'workshopquad', { x: q.x + 1, y: q.y + 1 });
  w.level = 2;
  const noisy = R.habitatNeeds(s, { ...q, level: 3 }).find((n) => n.need === 'quiet');
  check(!noisy.met && /Workshops is \d tiles? away/.test(noisy.label), `the noise reads clearly (${noisy.label})`);
  day(s, rng, SIM.quadShrinkDays - 1);
  check(q.level === 4 && q.grow === -(SIM.quadShrinkDays - 1), `a failing need counts down, for ${SIM.quadShrinkDays} days (a Habitat: ${SIM.shrinkDays})`);
  day(s, rng);
  check(q.level === 3 && s.log.some((l) => /fell back/.test(l.text)), 'after 20 days of noise the Courtyard Flats fall back to Row Houses');
  s.buildings.splice(s.buildings.indexOf(w), 1);
  day(s, rng, SIM.quadGrowDays);
  check(q.level === 4, 'the workshop gone, they grow again');
  // demand and happiness only gate growth: they never push a quad back
  s.pop = 10;
  for (let k = 0; k < 6; k++) s.buildings.push({ id: s.nextId++, key: 'towerblock', x: 1, y: 1 + k, level: 1, mode: null, build: 0, off: false, deck: 'upper' });   // (stand-ins: 900 empty homes)
  const held = R.habitatNeeds(s, { ...q, level: 3 });
  check(held.find((n) => n.need === 'demand:R').met === false && held.find((n) => n.need === 'demand:R').grow, `demand gone (R ${R.demandOf(s).R.units})...`);
  day(s, rng, SIM.quadShrinkDays + 2);
  check(q.level === 4, '...but the Courtyard Flats hold (demand only gates growing)');
  // the Clinic removed: the level's own need fails and it falls back
  s.buildings.splice(s.buildings.indexOf(clinic), 1);
  day(s, rng, SIM.quadShrinkDays);
  check(q.level === 3, 'the Clinic removed: back to Row Houses after 20 days');
  check(R.habitatNeeds(s, { ...q, level: 2 }).some((n) => n.need === 'food'), 'food for everyone is a condition of Row Houses');
  void park;
}

// ---------------------------------------------------------------- the demand is spent as quads grow, half of what each adds
{
  const s = colony(3), rng = stateRng(s);
  const lots = [];
  for (let k = 0; k < 4; k++) lots.push(put(s, 'livingquad', null, { gap: 3 + k * 3 }));
  check(lots.every(Boolean), 'four Living Quads zoned');
  const r0 = R.demandOf(s).R.units;
  day(s, rng, SIM.quadGrowDays);
  check(lots.every((b) => b.level === 2), `a small colony's demand (${r0}) grows all four at once: each Cottages spends only 20`);
  // a tighter gauge: only as many grow as it allows
  const t = colony(3), tr = stateRng(t);
  const tl = [];
  for (let k = 0; k < 4; k++) tl.push(put(t, 'livingquad', null, { gap: 3 + k * 3 }));
  t.buildings.push({ id: t.nextId++, key: 'towerblock', x: 1, y: 1, level: 1, mode: null, build: 0, off: false, deck: 'upper' });   // (a stand-in: 150 free homes)
  const r1 = R.demandOf(t).R.units;
  day(t, tr, SIM.quadGrowDays);
  const grown = tl.filter((b) => b.level === 2).length;
  check(r1 > 0 && grown === Math.ceil(r1 / 20) && grown < 4, `only as many grow as the demand (${r1}) allows: ${grown} of 4`);
  check(tl.filter((b) => b.level === 1).every((b) => b.grow === SIM.quadGrowDays), 'the rest wait, ready');
  t.pop = 400;
  day(t, tr);
  check(tl.every((b) => b.level >= 2), 'more colonists: the rest grow the next day');
}

// ---------------------------------------------------------------- Market and Workshop Quads
{
  const s = colony(4), rng = stateRng(s);
  s.pop = 120;
  const home = put(s, 'livingquad', null, { gap: 3 }); home.level = 2;   // Cottages for 40
  const m = put(s, 'marketquad', { x: home.x, y: home.y }, { gap: 3 });
  const nm = R.habitatNeeds(s, m);
  check(nm.some((n) => n.need === 'demand:C' && n.met) && nm.some((n) => n.need === 'residents:20' && n.met && /Homes for 20 within 12 tiles \(now \d+\)/.test(n.label)), `Stalls need commercial demand and residents nearby (${nm.map((n) => n.label).join('; ')})`);
  const far = put(s, 'marketquad', { x: home.x, y: home.y }, { gap: 16 });
  check(!far || !R.habitatNeeds(s, far).find((n) => n.need === 'residents:20').met, 'a Market Quad far from homes has no customers');
  if (far) s.buildings.splice(s.buildings.indexOf(far), 1);
  const cr = s.stock.credits;
  day(s, rng, SIM.quadGrowDays);
  check(m.level === 2 && lvName(m) === 'Stalls' && R.spec(m).jobs === 6, 'Market Quad → Stalls (6 jobs)');
  day(s, rng);
  check(s.stats.last.produced.credits > 0 && s.happyParts.some((p) => p.label === 'Shopping' && p.value > 0), `Stalls earn credits and shopping cheers the homes in range (${s.happyParts.find((p) => p.label === 'Shopping')?.value})`);
  check(R.habitatNeeds(s, { ...home, level: 4 }).find((n) => n.need === 'shops').met, 'the Cottages have shops in reach (a need of Garden Terraces)');
  // Workshops: jobs and parts; Machine Shops need every need met
  const w = put(s, 'workshopquad', { x: home.x, y: home.y }, { gap: 8 });
  s.stock.parts = 0;
  check(R.habitatNeeds(s, w)[0].need === 'demand:I' && R.habitatNeeds(s, w)[0].met, 'Workshops need industrial demand');
  day(s, rng, SIM.quadGrowDays);
  check(w.level === 2 && lvName(w) === 'Workshops', 'Workshop Quad → Workshops');
  const p0 = s.stats.last.produced.parts || 0;
  day(s, rng);
  check((s.stats.last.produced.parts || 0) > p0 || (s.stats.last.produced.parts || 0) >= 3 * 0.5, `Workshops make parts (${s.stats.last.produced.parts})`);
  // upkeep follows the level
  check(R.spec(w).upkeep === 1 && R.spec({ key: 'livingquad', level: 7 }).upkeep === 12 && R.spec({ key: 'livingquad', level: 9 }).upkeep === 22, 'upkeep by level');
  // a Freight Yard in range: a quarter more parts
  const t = colony(4), tr = stateRng(t);
  t.pop = 200;
  const tw = put(t, 'workshopquad', null, { gap: 4 }); tw.level = 2;
  day(t, tr);
  const base = t.stats.last.produced.parts;
  learn(t, 'smelting', 'lightindustry');
  const fy = put(t, 'freightyard', { x: tw.x, y: tw.y });
  check(fy && R.covers(fy, tw), 'a Freight Yard covers the workshops');
  t.flags.rng = undefined;
  day(t, tr);
  const more = t.stats.last.produced.parts - base;
  check(Math.abs(more - 3 * 0.25 * Math.min(1, t.stats.last.staffing) * (t.stats.last.power.factor < 1 ? t.stats.last.power.factor : 1)) < 0.5 && more > 0, `and they make a quarter more (+${more.toFixed(2)})`);
}

// ---------------------------------------------------------------- the ladder: techs, school, transit
{
  const s = colony(5), rng = stateRng(s);
  s.pop = 5000; s.happy = 80;
  const q = put(s, 'livingquad', null, { gap: 4 }); q.level = 5;   // Garden Terraces
  for (const k of ['park']) put(s, k, { x: q.x + 1, y: q.y + 1 });
  learn(s, 'medicine', 'schooling', 'commerce');
  const m = put(s, 'marketquad', { x: q.x + 1, y: q.y + 1 }); m.level = 3;
  put(s, 'clinic', { x: q.x + 1, y: q.y + 1 });
  put(s, 'school', { x: q.x + 1, y: q.y + 1 });
  // (enough power and supplies for a test of conditions: power is topped up from mirrors)
  s.stock.food = 1e4;
  const midNeeds = R.habitatNeeds(s, q);
  const tech = midNeeds.find((n) => n.need === 'tech:urbanplan');
  check(tech && !tech.met && tech.label === 'Research Urban Planning' && tech.grow, 'Mid-rise: Research Urban Planning');
  check(midNeeds.find((n) => n.need === 'school').met && midNeeds.find((n) => n.need === 'clinic').met && midNeeds.find((n) => n.need === 'shops').met, 'a School, a Clinic and shops in reach');
  check(/^Happiness 55 \(now \d+\)$/.test(midNeeds.find((n) => n.need === 'happy:55').label), 'happiness reads with its value now');
  learn(s, 'urbanplan');
  check(R.habitatNeeds(s, q).find((n) => n.need === 'tech:urbanplan').met, 'Urban Planning done: that need is met');
  // a Transit Station in range: growth in 2 days
  const tr = put(s, 'transit', { x: q.x + 1, y: q.y + 1 });
  check(tr && R.covers(tr, q), 'a Transit Station in range');
  const lot = put(s, 'livingquad', { x: q.x + 1, y: q.y + 1 }, { gap: 3 });
  check(R.covers(tr, lot), 'over a new lot too');
  day(s, rng, SIM.transitGrowDays);
  check(lot.level === 2, `a lot in transit's range grows in ${SIM.transitGrowDays} days`);
  // Residential Towers: Skyscrapers and transit
  q.level = 6;
  const top = R.habitatNeeds(s, q);
  check(top.some((n) => n.need === 'transit' && n.met) && top.some((n) => n.need === 'tech:skyscrapers' && !n.met), 'Residential Tower: transit in reach, Research Skyscrapers');
  learn(s, 'highrise', 'skyscrapers');
  check(s.unlocked.includes('monorail') && R.habitatNeeds(s, q).find((n) => n.need === 'tech:skyscrapers').met, 'Skyscrapers: Residential Towers and Monorail Stops');
  q.level = 7;
  const sky = R.habitatNeeds(s, q);
  check(R.spec(q).housing === 700 && sky.some((n) => n.need === 'value:45') && sky.some((n) => n.need === 'happy:62'), 'a Residential Tower houses 700; a Sky Tower wants land value 45 and happiness 62');
  q.level = 8;
  const crown = R.habitatNeeds(s, q);
  check(['monorail', 'luxuries', 'tech:arcology', 'value:55'].every((k) => crown.some((n) => n.need === k)) && !crown.find((n) => n.need === 'monorail').met, `a Crown Spire wants a monorail line, coffee and wine, Arcologies and land value 55 (${crown.map((n) => n.need)})`);
  q.level = 9;
  check(R.habitatNeeds(s, q).length === 0 && R.spec(q).housing === 1400, 'a Crown Spire houses 1,400; above it, only merging');
}

// ---------------------------------------------------------------- speed (reinstated 2026-11-07): a fresh colony, the real day
// A new game as the player gets it (40 colonists, two Habitats, a farm and a pump): zone one Living Quad by the Command
// Centre, two Solar Arrays for its power, and (Medicine learned) a park and a Clinic beside it. Days from placing the lot.
function fresh(seed, { services = true, market = false, workshop = false } = {}) {
  const s = newGame({ seed }), rng = stateRng(s);
  s.options.raids = false; s.options.incidents = false; s.options.petitions = false;
  const at = (key, near, gap = 0) => {
    const p = R.findSpot(s, key, { box: BUILDING[key].zone === 'interior' ? landing(s) : undefined, free: true, score: (x, y) => { const d = Math.max(Math.abs(x - near.x), Math.abs(y - near.y)); return d < gap ? null : d; } });
    const r = p ? R.build(s, key, p.x, p.y) : { ok: false };
    return r.ok ? s.buildings.find((b) => b.id === r.id) : null;
  };
  const q = at('livingquad', cmdOf(s), 3);
  at('solar', cmdOf(s)); at('solar', cmdOf(s));
  if (services) { learn(s, 'medicine'); at('park', { x: q.x + 1, y: q.y + 1 }); at('clinic', { x: q.x + 1, y: q.y + 1 }); roadBeside(s, q); }   // (version 11: and a road)
  const m = market ? at('marketquad', { x: q.x + 1, y: q.y + 1 }, 3) : null, w = workshop ? at('workshopquad', cmdOf(s), 12) : null;
  const t0 = s.day, reach = { q: {}, m: {}, w: {} };
  for (let d = 0; d < 40; d++) {
    s.pending.length = 0;
    dayTick(s, rng);
    for (const [k, b] of [['q', q], ['m', m], ['w', w]]) {
      if (b && !(b.level in reach[k])) reach[k][b.level] = s.day - t0;
      if (b && b.build === 0 && reach[k].laid == null) reach[k].laid = s.day - t0;
    }
  }
  return { s, q, m, w, reach };
}
{
  const runs = [1, 2, 3, 4, 5].map((seed) => fresh(seed));
  const row = runs.map((r) => r.reach.q[3]), flats = runs.map((r) => r.reach.q[4]), cott = runs.map((r) => r.reach.q[2]);
  console.log(`  a fresh colony's first Living Quad, days from zoning (5 seeds): Cottages ${cott.join('/')}, Row Houses ${row.join('/')}, Courtyard Flats ${flats.join('/')}`);
  check(runs.every((r) => r.q) && cott.every((d) => d <= 5), `Cottages before the first transport (day 10): ${cott.join('/')} days`);
  check(row.every((d) => d != null && d <= 10), `Row Houses within 10 days: ${row.join('/')}`);
  check(flats.every((d) => d != null && d <= 30), `Courtyard Flats within 30 days with a park, a Clinic and a road: ${flats.join('/')}`);
  const bare = fresh(1, { services: false });
  check(bare.reach.q[3] <= 10 && !(4 in bare.reach.q), `with no park or Clinic: Row Houses (day ${bare.reach.q[3]}), but no Courtyard Flats`);
  const mix = fresh(2, { market: true, workshop: true });
  // (their lots wait their turn for the construction crews: count from the day each lot is laid out)
  const after = (k) => mix.reach[k][2] - mix.reach[k].laid;
  check(mix.m && mix.w && after('m') <= SIM.quadGrowDays + 1 && after('w') <= SIM.quadGrowDays + 1, `a Market and a Workshop Quad in a fresh colony grow at once too: Stalls ${after('m')} days after the lot is laid, Workshops ${after('w')}`);
  check(mix.s.stats.last.staffing > 0.6, `without leaving the colony short of workers (staffing ${Math.round(mix.s.stats.last.staffing * 100)}%)`);
}

// ---------------------------------------------------------------- save and load
{
  const s = colony(6), rng = stateRng(s);
  s.pop = 80;
  const q = put(s, 'livingquad', null, { gap: 4 });
  day(s, rng, 1);
  const back = loadState(saveState(s));
  const bq = back.buildings.find((b) => b.id === q.id);
  check(bq && bq.key === 'livingquad' && bq.level === 1 && bq.grow === 1, 'a growing lot keeps its level and its count through save and load');
  const r2 = stateRng(back);
  day(back, r2, SIM.quadGrowDays - 1);
  check(bq.level === 2, 'and goes on growing after loading');
  bq.level = 3;
  const again = loadState(saveState(back));
  check(again.buildings.find((b) => b.id === q.id).level === 3 && R.housingOf(again) === R.housingOf(back), 'its homes count after loading');
  // an old colony (saved before version 7) loads and offers the quads
  const old = JSON.parse(saveState(newGame({ seed: 7 })));
  old.unlocked = old.unlocked.filter((k) => !QUADS.includes(k));
  const o = loadState(JSON.stringify(old));
  check(QUADS.every((k) => o.unlocked.includes(k)), 'an older save gets the quads on its menu');
  // legacy: a version 9 save (quads retired: not on its menu) whose old quads stand at their levels
  const v9 = colony(8);
  const lq = put(v9, 'livingquad', null, { gap: 4 }), wq = put(v9, 'workshopquad', null, { gap: 10 });
  lq.level = 4; wq.level = 3;
  const raw = JSON.parse(saveState(v9)); raw.unlocked = raw.unlocked.filter((k) => !QUADS.includes(k));
  const nine = loadState(JSON.stringify(raw)), r9 = stateRng(nine);
  check(QUADS.every((k) => nine.unlocked.includes(k)) && R.buildable(nine).filter((b) => QUADS.includes(b.key)).every((b) => !b.why), 'a version 9 save: the quads are back on its menu, buildable');
  const l9 = nine.buildings.find((b) => b.id === lq.id), w9 = nine.buildings.find((b) => b.id === wq.id);
  check(l9.level === 4 && R.spec(l9).housing === 220 && w9.level === 3 && R.spec(w9).jobs === 24, 'its standing quads keep their levels, homes and jobs');
  // version 11: a save from before the new levels: its quads keep the same building (levels are remapped once)
  {
    const v10 = colony(8);
    const a = put(v10, 'livingquad', null, { gap: 4 }), b = put(v10, 'marketquad', null, { gap: 8 }), c = put(v10, 'workshopquad', null, { gap: 12 });
    a.level = 6; b.level = 6; c.level = 5;   // (as version 10 numbered them: Residential Tower, Trade Tower, Assembly Plant)
    const old10 = JSON.parse(saveState(v10)); delete old10.flags.quads11;
    const ten = loadState(JSON.stringify(old10)), byId = (id) => ten.buildings.find((x) => x.id === id);
    check(lvName(byId(a.id)) === 'Residential Tower' && R.spec(byId(a.id)).housing === 700 && lvName(byId(b.id)) === 'Trade Tower' && lvName(byId(c.id)) === 'Assembly Plant', `a version 10 save: its quads are the same buildings after the new levels (${[a, b, c].map((x) => lvName(byId(x.id))).join(', ')})`);
    const again = loadState(saveState(ten));
    check(lvName(again.buildings.find((x) => x.id === a.id)) === 'Residential Tower', 'and stay so through later saves (remapped once)');
  }
  day(nine, r9, 3);
  check(l9.level >= 3 && (nine.stats.last.produced.parts || 0) > 0, 'and keep working (no sudden fall: a missing need takes 20 days)');
}

// ---------------------------------------------------------------- the supporting buildings and techs serve Habitats and industry as well (version 9)
{
  check(/Habitats and Tower Blocks/.test(BUILDING.transit.text) && /quads in 1 day/.test(BUILDING.transit.text) && /Fabricators and Workshop Quads/.test(BUILDING.freightyard.text) && /Living Quads/.test(BUILDING.school.text), 'School, Transit Station and Freight Yard serve both the quads and the rest');
  check(/Market Quads/.test(TECH.commerce.text) && /Market/.test(TECH.commerce.text) && /Workshop Quads/.test(TECH.automation.text) && /Fabricators/.test(TECH.automation.text), 'the version 7 techs name both');
  check(TECH.urbanplan.unlocks.includes('transit') && TECH.skyscrapers.unlocks.includes('monorail') && TECH.lightindustry.unlocks.includes('freightyard'), 'Urban Planning: Transit; Skyscrapers: the Monorail Stop; Light Industry: the Freight Yard');
  check(TECH.automation.effects.some((e) => e.key === 'fabricator' && e.mult === 1.2) && TECH.commerce.effects.some((e) => e.key === 'market' && e.mult === 1.2), 'Automation: Fabricators +20%; Commerce: Market sales +20%');
  const top = BUILDING.towerblock.levels[3];
  check(top && top.name === 'Skyscraper' && top.housing === 600 && top.needs.includes('transit') && top.needs.includes('tech:skyscrapers') && R.habitatLevelReachable(top), 'Skyscrapers: Tower Blocks grow into a 4th level, a Skyscraper for 600 (transit in reach)');
  // Commerce: Market sales pay a fifth more
  const s = colony(3);
  s.stock.ore = 100;
  const a = R.sell(s, 'ore', 50).credits;
  const t = colony(3); learn(t, 'commerce'); t.stock.ore = 100;
  const b = R.sell(t, 'ore', 50).credits;
  check(b === Math.floor(a / 1 * 1.2) || Math.abs(b - a * 1.2) <= 1, `Commerce: 50 ore sell for ${a} → ${b}`);
  // the Freight Yard: Fabricators in range make a quarter more
  const run = (yard) => {
    const u = colony(4), rng = stateRng(u);
    learn(u, 'smelting', 'fabrication', 'lightindustry'); u.pop = 120; u.stock.alloy = 100;
    const f = put(u, 'fabricator', null, { gap: 4 });
    if (yard) { const y = put(u, 'freightyard', { x: f.x, y: f.y }); check(y && R.covers(y, f), 'a Freight Yard beside the Fabricator'); }
    u.stock.parts = 0; u.stock.alloy = 100;
    day(u, rng);
    return u.stats.last.produced.parts || 0;
  };
  const p0 = run(false), p1 = run(true);
  check(p1 > p0 * 1.15, `a Freight Yard in range: Fabricators make more (${p0.toFixed(1)} → ${p1.toFixed(1)} parts)`);
}

// ---------------------------------------------------------------- version 11 (docs/COLONY-V11.md): roads worth building
// (stand-ins pushed straight into the state: only their places matter to the road networks and reaches)
const raw = (s, key, x, y, extra = {}) => { const b = { id: s.nextId++, key, x, y, level: 1, mode: null, build: 0, off: false, ...extra }; s.buildings.push(b); return b; };
const roadRow = (s, x0, x1, y) => { for (let x = x0; x <= x1; x++) raw(s, 'road', x, y); };
{
  const s = colony(10);
  learn(s, 'medicine');
  const r = BUILDING.clinic.radius + R.AREA.bonus;
  const cl = raw(s, 'clinic', 20, 10), far = raw(s, 'habitat', 20 + r + 3, 10), near = raw(s, 'habitat', 20, 10 + r);
  check(R.AREA.bonus === 1 && R.covers(cl, near) && !R.covers(raw(s, 'habitat', 20, 10 + r + 1), cl), `every area effect reaches a tile further (a Clinic: ${BUILDING.clinic.radius} + 1)`);
  check(!R.covers(cl, far, s), 'a home beyond the Clinic\'s reach, with no road');
  roadRow(s, 21, far.x - 1, 10);
  check(R.touchesRoad(s, cl) && R.roadLinked(s, cl, far) && R.covers(cl, far, s) && !R.covers(cl, far) && R.serviceAt(s, far, 'clinic') > 0, `on the same road it reaches ${R.ROAD.reach} tiles further`);
  check(!R.covers(cl, raw(s, 'habitat', 20 + r + R.ROAD.reach + 2, 11), s), 'but no further than that');
  // parks too
  const pk = raw(s, 'park', 60, 10), ph = raw(s, 'habitat', 60 + BUILDING.park.radius + R.AREA.bonus + 3, 10);
  const f0 = R.parkAt(s, ph);
  roadRow(s, 61, ph.x - 1, 10);
  check(f0 === 0 && R.parkAt(s, ph) > 0, `a park reaches further along a road too (${f0} → ${R.parkAt(s, ph)})`);
  void pk;
  // workshop noise does not travel along roads
  const lq = raw(s, 'livingquad', 100, 10, { level: 3 }), wq = raw(s, 'workshopquad', 104, 10, { level: 3 });   // a gap of 2, noise 3
  check(!!R.noiseAt(s, lq), 'Machine Shops 2 tiles away are noisy');
  wq.x = 105;
  roadRow(s, 102, 104, 10);
  check(!R.noiseAt(s, lq) && R.roadLinked(s, lq, wq), 'at 3 tiles they are quiet, and a road between them carries no noise');
  // the road gate: quads past Row Houses, Habitats past Quarters, Tower Blocks past Towers; never a reason to shrink
  check(R.ROAD_GATE.livingquad === 4 && R.ROAD_GATE.habitat === 3 && R.ROAD_GATE.towerblock === 3, 'road gates: Courtyard Flats, Apartments, Spires');
  const hab = raw(s, 'habitat', 140, 40, { level: 2 });
  check(R.habitatNeeds(s, hab).some((n) => n.need === 'road' && !n.met && n.grow) && !R.habitatNeeds(s, { ...hab, level: 1 }).some((n) => n.need === 'road'), 'a Habitat needs a road to grow into Apartments (not into Quarters)');
  // the growth days: by level, a day less with a road, halved near transit
  check(quadDays({ level: 1 }, false, false) === 2 && quadDays({ level: 1 }, false, true) === 1 && quadDays({ level: 1 }, true, false) === 1, 'early levels: 2 days, 1 with a road or transit');
  check(quadDays({ level: 6 }, false, false) === 4 && quadDays({ level: 6 }, false, true) === 3 && quadDays({ level: 6 }, true, true) === 2 && quadDays({ level: 8 }, false, false) === 5, 'later levels take longer: a Residential Tower → Sky Tower 4 days (3 with a road, 2 with transit too), a Crown Spire 5');
}
// linked to the Command Centre: upkeep −10%, faster building; the inspector's Road line
{
  const s = colony(10), rng = stateRng(s);
  const home = s.buildings.find((b) => b.key === 'habitat');
  check(R.hubLinked(s, home) && R.roadInfo(s, home).linked && /upkeep −10%/.test(R.roadInfo(s, home).text), `a new colony's homes are linked to the Command Centre by its first road ("${R.roadInfo(s, home).text}")`);
  const lone = raw(s, 'habitat', 150, 60);
  check(!R.touchesRoad(s, lone) && /No road beside it/.test(R.roadInfo(s, lone).text) && /stays at Quarters or below/.test(R.roadInfo(s, lone).text), `the Road line says what a road would give (${R.roadInfo(s, lone).text})`);
  s.buildings.splice(s.buildings.indexOf(lone), 1);
  day(s, rng);
  const u1 = s.stats.last.upkeep;
  const t = loadState(saveState(s)), tr = stateRng(t);
  t.buildings = t.buildings.filter((b) => b.key !== 'road');
  day(t, tr);
  check(t.stats.last.upkeep > u1, `with no roads the same colony pays more upkeep (${u1.toFixed(1)} → ${t.stats.last.upkeep.toFixed(1)})`);
  // construction: a site linked by road gets an extra day's work every ROAD.buildEvery days
  const a = loadState(saveState(s)), b2 = loadState(saveState(t)), ra = stateRng(a), rb = stateRng(b2);
  const la = a.buildings.find((b) => b.key === 'habitat'), lb = b2.buildings.find((b) => b.key === 'habitat');
  la.build = 12; lb.build = 12;
  let da = 0, db = 0;
  for (let k = 0; k < 14; k++) { day(a, ra); day(b2, rb); if (la.build > 0) da++; if (lb.build > 0) db++; }
  check(da < db, `a linked site goes up faster (${da + 1} days against ${db + 1})`);
}

// ---------------------------------------------------------------- version 11: monorail lines link themselves
{
  const s = colony(11);
  const a = raw(s, 'monorail', 20, 20), b = raw(s, 'monorail', 36, 20), c = raw(s, 'monorail', 80, 20);
  check(!R.monorailNet(s).links.length, 'before Skyscrapers no lines');
  learn(s, 'urbanplan', 'highrise', 'skyscrapers');
  const net = R.monorailNet(s);
  check(net.links.length === 1 && net.linked.has(a.id) && net.linked.has(b.id) && !net.linked.has(c.id), `with it, stops within ${R.LINE.range} tiles link by themselves (a lone stop far away does not)`);
  const by = raw(s, 'habitat', 28, 22), off = raw(s, 'habitat', 28, 30);
  check(R.onMonorail(s, by) && R.nearTransit(s, by) && !R.onMonorail(s, off), `a home within ${R.LINE.corridor} tiles of the line counts as near transit; one 10 tiles off does not`);
  const mq = raw(s, 'marketquad', 52, 19, { level: 5 });   // an Arcade: a station
  const net2 = R.monorailNet(s);
  check(net2.linked.has(mq.id) && net2.links.some((l) => l.a.id === mq.id || l.b.id === mq.id) && R.monorailMarket(s, mq), 'a Market Quad from the Arcade up is a station: it joins the line and earns a quarter more');
  mq.level = 4;
  check(!R.monorailNet(s).linked.has(mq.id), 'a Market Hall is not');
  check(R.monorailNet(s).links.every((l) => l.deck === 'main') && net2.stations.every((st) => st.deck === 'main'), 'lines stay on their deck');
  // the income: a station on a line makes 25% more credits than the same quad off the network
  const run = (linked) => { const u = colony(12); learn(u, 'urbanplan', 'highrise', 'skyscrapers', 'commerce'); u.pop = 2000; const m = raw(u, 'marketquad', 52, 19, { level: 5 }); if (linked) raw(u, 'monorail', 60, 20); day(u, stateRng(u)); return u.stats.last.produced.credits; };
  const c0 = run(false), c1 = run(true);
  check(c1 > c0, `and in the day's sums: credits ${c0.toFixed(0)} → ${c1.toFixed(0)}`);
}

// ---------------------------------------------------------------- version 11: megastructures
{
  const s = colony(13), said = [];
  learn(s, 'urbanplan', 'highrise', 'skyscrapers', 'smelting', 'lightindustry', 'fabrication', 'automation', 'machineworks', 'heavyworks');
  s.stats.last = { ...(s.stats.last || {}), met: { food: true, water: true, air: true, power: true } };
  raw(s, 'monorail', 12, 22); raw(s, 'monorail', 34, 22); raw(s, 'freightyard', 20, 26);
  const T = R.topLevelOf('workshopquad');
  check(T === 9 && R.megaLevelOf('workshopquad', 2) === 10 && R.megaLevelOf('workshopquad', 4) === 11, 'top level 9; merged levels 10 (two) and 11 (four)');
  const block = [[20, 20], [22, 20], [20, 22], [22, 22]].map(([x, y]) => raw(s, 'workshopquad', x, y, { level: T }));
  const pair = [[26, 20], [28, 20]].map(([x, y]) => raw(s, 'workshopquad', x, y, { level: T }));
  const lone = raw(s, 'workshopquad', 26, 24, { level: T - 1 });
  const jobs0 = R.jobsOf(s);
  R.megaDay(s, (k, t) => said.push(t));
  check(block.every((b) => b.level === 11 && b.mega?.n === 4 && b.mega.lead === block[0].id && b.mega.w === 4 && b.mega.h === 4) && R.spec(block[0]).levelName === 'Gigafactory', `four Megafactories in a square merge into a Gigafactory (${block.map((b) => b.level)})`);
  check(pair.every((b) => b.level === 10 && b.mega?.n === 2 && b.mega.w === 4 && b.mega.h === 2) && R.spec(pair[0]).levelName === 'Industrial Complex', 'two side by side merge into an Industrial Complex');
  check(lone.level === T - 1 && !lone.mega, 'a Robotic Works next to them does not');
  check(said.some((t) => /Four Megafactories have grown into a Gigafactory/.test(t)) && said.some((t) => /Two Megafactories have grown into Industrial Complex/.test(t)), `the moment is announced (${said.join(' | ')})`);
  check(R.jobsOf(s) - jobs0 >= Math.round(BUILDING.workshopquad.levels[8].jobs * (4 * 0.5 + 2 * 0.25)) - 15, `more jobs than the quads had (${jobs0} → ${R.jobsOf(s)})`);
  check(R.megaInfo(s, block[1]).name === 'Gigafactory' && R.megaInfo(s, block[1]).n === 4 && R.habitatNeeds(s, block[0]).length === 0, 'the inspector reads it; it grows no further');
  // save and load keep it
  const back = loadState(saveState(s));
  check(back.buildings.filter((b) => b.mega?.n === 4).length === 4 && back.buildings.find((b) => b.id === block[2].id).mega.lead === block[0].id, 'save and load keep the megastructure');
  // a day of the real sim with megastructures standing
  const rng = stateRng(s);
  day(s, rng);
  check(block.every((b) => b.level === 11) && pair.every((b) => b.level === 10), 'they stand through a day of the sim');
  // demolish a member: the rest go back to Megafactories at once
  R.demolish(s, block[3].id);
  check(block.slice(0, 3).every((b) => b.level === T && !b.mega), 'one demolished: the others split back into Megafactories');
  // needs failing for 30 days split a pair
  s.buildings = s.buildings.filter((b) => b.key !== 'freightyard');
  s.stats.last.met = { food: true, water: true, air: true, power: true }; pair[0].megaFail = 0;   // (the day of the sim above may have counted one: the stand-in power)
  for (let k = 0; k < R.MEGA.splitDays - 1; k++) R.megaDay(s, () => {});
  check(pair.every((b) => b.level === 10), `a failing need: it holds for ${R.MEGA.splitDays - 1} days`);
  R.megaDay(s, (k, t) => said.push(t));
  check(pair.every((b) => b.level === T && !b.mega) && said.some((t) => /split back into Megafactories/.test(t)), `after ${R.MEGA.splitDays}: it splits back`);
  // two pairs that come to form a square merge again into four (Living Quads: Twin Spires → an Arcology Crown)
  const L = colony(14);
  learn(L, 'urbanplan', 'highrise', 'skyscrapers', 'medicine', 'schooling', 'arcology', 'luxuries');
  const top = R.topLevelOf('livingquad');
  const A = [[40, 40], [42, 40]].map(([x, y]) => raw(L, 'livingquad', x, y, { level: top })), B = [[40, 42], [42, 42]].map(([x, y]) => raw(L, 'livingquad', x, y, { level: top - 1 }));
  // (their needs are many: hold them by standing in every service; checked by the rules themselves)
  for (const [k, x, y] of [['park', 38, 40], ['clinic', 38, 42], ['school', 46, 40], ['monorail', 36, 41], ['monorail', 50, 41]]) raw(L, k, x, y);
  raw(L, 'marketquad', 46, 42, { level: 2 });
  roadRow(L, 38, 44, 39); for (let y = 40; y <= 43; y++) raw(L, 'road', 44, y); roadRow(L, 38, 44, 44);   // (the park reaches them along the road: parkAt's road reach)
  L.stats.last = { ...(L.stats.last || {}), met: { food: true, water: true, air: true, power: true } };
  L.luxuries = { ...(L.luxuries || {}), share: { coffee: 1, wine: 1 } };
  const holds = R.habitatNeeds(L, { ...A[0], level: top - 1 }).filter((n) => !n.met && !n.grow).map((n) => n.need);
  R.megaDay(L, () => {});
  check(!holds.length ? A.every((b) => b.level === top + 1) && R.spec(A[0]).levelName === 'Twin Spires' : true, `two Crown Spires: Twin Spires (${holds.join() || 'every need met'})`);
  for (const b of B) b.level = top;
  R.megaDay(L, (k, t) => said.push(t));
  check(!holds.length ? [...A, ...B].every((b) => b.level === top + 2) && R.spec(A[0]).levelName === 'Arcology Crown' && said.some((t) => /Four Crown Spires have grown into an Arcology Crown/.test(t)) : true, 'two more beside them: the pair and the two merge into an Arcology Crown');
  check(!holds.length, `(the Crown Spires' needs all held in this test: ${holds.join() || 'yes'})`);
}

// ---------------------------------------------------------------- balance: a quad town against a Habitat town
// The same generous mid-game start (every tech known, every chamber open, credits topped up, raids off) runs
// the real dayTick for 240 days. One player zones Living, Market and Workshop Quads and builds the services
// their levels ask for; the other builds Habitats and Tower Blocks ahead of the population. Each also builds
// producers when a need runs short. Reports colonists, credits spent on homes, and buildings placed.
function town(mode, seed = 1, days = 240) {
  const s = newGame({ seed, difficulty: 'easy' });
  for (const c of s.chambers) { c.status = 'open'; c.work = 0; }
  for (const d of s.secrets?.dangers || []) d.done = true;
  s.research.done = TECHS.map((t) => t.key);
  s.unlocked = BUILDINGS.filter((d) => !d.fixed).map((d) => d.key);
  s.flags.unlock80 = true; s.options.raids = false;
  s.pop = 300; Object.assign(s.stock, { credits: 1e6, parts: 1e5, food: 300, water: 300, air: 300 });
  s.pending.length = 0;
  const rng = stateRng(s), main = s.chambers.filter((c) => !c.deck && c.status === 'open');
  const place = (key, near = null, gap = 0) => {
    const n = BUILDING[key].size;
    for (const box of near ? [{ x0: near.x - 12, y0: near.y - 12, x1: near.x + 12, y1: near.y + 12 }] : BUILDING[key].zone === 'interior' ? main : [undefined]) {
      const p = R.findSpot(s, key, { box, free: true, score: near ? (x, y) => { const d = Math.max(Math.abs(x + n / 2 - near.x), Math.abs(y + n / 2 - near.y)); return d < gap ? null : d; } : () => 0 });
      if (!p) continue;
      const r = R.build(s, key, p.x, p.y);
      if (r.ok) { spent[key] = (spent[key] || 0) + R.costOf(s, BUILDING[key].cost, key).credits; return s.buildings.find((b) => b.id === r.id); }
    }
    return null;
  };
  const spent = {};
  let turnedAway = 0;
  for (let k = 0; k < 4; k++) { const b = place('repairyard'); if (b) { b.build = 0; b.level = 3; } }
  for (const k of ['vertfarm', 'waterworks', 'atmoproc']) { const b = place(k); if (b) b.build = 0; }
  for (let k = 0; k < 2; k++) { const b = place('sunmirror'); if (b) b.build = 0; }
  const cmd = s.buildings.find((b) => b.key === 'command');
  // a district centre: services the quads' upper levels ask for
  let centre = { x: cmd.x + 1, y: cmd.y + 1 };
  if (mode === 'quads') for (const k of ['clinic', 'school', 'transit', 'park', 'park', 'canteen']) { const b = place(k, centre, 3); if (b) { b.build = 0; if (k === 'clinic') b.level = 3; } }
  const nm = 1;
  for (let d = 0; d < days; d++) {
    s.stock.credits = Math.max(s.stock.credits, 1e5); s.stock.parts = Math.max(s.stock.parts, 1e4);
    s.pending.length = 0;
    const building = s.buildings.filter((b) => b.build > 0).length;
    const housing = s.buildings.reduce((t, b) => t + (R.spec(b).housing || 0), 0);
    const planned = (g) => s.buildings.reduce((t, b) => t + (R.spec(b).makes?.[g] || 0), 0) - s.buildings.reduce((t, b) => t + (R.spec(b).uses?.[g] || 0), 0);
    if (building < 12) {
      if (planned('food') < s.pop * NEEDS.food * nm * 1.15 + 200) place('vertfarm');
      if (planned('water') < s.pop * 1.1 + 200) place('waterworks');
      if (planned('air') < s.pop * 1.1 + 300) place('atmoproc');
      const pw = R.powerOf(s);
      if (pw.supply < pw.demand * 1.15 + 40) place('sunmirror');
    }
    if (mode === 'quads') {
      // keep a few empty lots of each zone with demand, near the district centre, and a park per few lots
      const dm = R.demandOf(s);
      for (const [z, k] of [['R', 'livingquad'], ['C', 'marketquad'], ['I', 'workshopquad']]) {
        const empty = s.buildings.filter((b) => b.key === k && b.level === 1).length;
        if (dm[z].units > 0 && empty < 2) { const b = place(k, k === 'workshopquad' ? { x: centre.x + 14, y: centre.y } : centre, k === 'workshopquad' ? 0 : 3); if (b) roadBeside(s, b); }   // (version 11: a road beside each lot)
      }
      if (d % 5 === 0) for (const h of s.buildings.filter((b) => b.key === 'livingquad')) if (!(R.parkAt(s, h) > 0)) { const p = place('park', h); if (p) break; }
      if (d % 10 === 0) for (const h of s.buildings.filter((b) => b.key === 'livingquad' && b.level >= 3)) {
        for (const k of ['clinic', 'school', 'transit', 'canteen']) if (!s.buildings.some((v) => v.key === k && R.covers(v, h))) place(k, h);
      }
    } else if (building < 12 && housing < s.pop * 1.12 + 150) {
      const b = place(s.pop > 800 ? 'towerblock' : 'habitat');
      if (b && !(R.parkAt(s, b) > 0)) place('park', b);
      if (b && !s.buildings.some((v) => v.key === 'clinic' && R.covers(v, b))) place('clinic', b);
    }
    const logged = s.log.length;
    dayTick(s, rng);
    turnedAway += s.log.slice(logged).filter((l) => /no free housing/.test(l.text)).length;
    if (process.env.QDEBUG && d % 10 === 0) console.log(mode, s.day, s.pop, R.housingOf(s), Math.round(s.happy), JSON.stringify(s.flags.short), s.buildings.filter((b) => b.build > 0).length, JSON.stringify(Object.fromEntries(Object.entries(R.demandOf(s)).map(([k, v]) => [k, v.units]))));
  }
  const homes = Object.entries(spent).filter(([k]) => ['livingquad', 'marketquad', 'workshopquad', 'habitat', 'towerblock'].includes(k)).reduce((t, [, v]) => t + v, 0);
  const lv = (k) => s.buildings.filter((b) => b.key === k).map((b) => b.level);
  return { s, turnedAway, pop: s.pop, housing: R.housingOf(s), homes, buildings: s.buildings.length, jobs: R.jobsOf(s), happy: s.happy, lv };
}
{
  const t0 = Date.now();
  const q = town('quads'), h = town('habitats');
  const hist = (l) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((v) => l.filter((x) => x === v).length).join('/');
  console.log(`  quad town: ${q.pop} colonists, homes for ${q.housing}, ${q.jobs} jobs, happiness ${Math.round(q.happy)}, ${q.homes} credits on lots, ${q.buildings} buildings; levels R ${hist(q.lv('livingquad'))} C ${hist(q.lv('marketquad'))} I ${hist(q.lv('workshopquad'))}`);
  console.log(`  habitat town: ${h.pop} colonists, homes for ${h.housing}, ${h.jobs} jobs, happiness ${Math.round(h.happy)}, ${h.homes} credits on homes, ${h.buildings} buildings  (${Date.now() - t0} ms)`);
  check(q.pop > 300 * 1.5 && q.lv('livingquad').some((l) => l >= 4) && q.lv('marketquad').some((l) => l >= 3) && q.lv('workshopquad').some((l) => l >= 3), 'a quad town grows: colonists, and quads at the upper levels');
  check(q.turnedAway === 0, `a town of quads keeps up with the transports: none turned away for want of homes (${q.turnedAway})`);
  check(q.pop > h.pop * 0.6 && q.pop < h.pop * 1.6, `a quad town is a real alternative, not strictly better (${q.pop} vs ${h.pop} colonists)`);
}

console.log(`colony-quads: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
