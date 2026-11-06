// Version 7 (docs/COLONY-V7.md): zoning and growth. Living, Market and Workshop Quads are cheap 2×2 lots that
// develop by themselves, level by level, while their zone has demand and their street has what each level
// needs, and fall back when a need fails; RCI demand; the supporting buildings and techs; save and load; and
// a balance run: a quad-built town against a town of Habitats and Tower Blocks.
//   node tests/colony-quads.mjs
import { existsSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng, SIM } from '../js/colony/sim.js';
import { BUILDING, BUILDINGS, NEEDS } from '../js/colony/data/buildings.js';
import { TECH, TECHS } from '../js/colony/data/tech.js';
import { KITS, kitParts, kitHeight } from '../js/colony/view3d/kits.js';
import { MANIFEST } from '../js/colony/art.js';
import { helpHtml } from '../js/colony/ui.js';

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

// ---------------------------------------------------------------- data
{
  check(QUADS.every((k) => BUILDING[k]?.quad && BUILDING[k].size === 2 && BUILDING[k].levels.length === 6), 'three quads, 2×2, an empty lot and five levels each');
  check(JSON.stringify(BUILDING.livingquad.levels.map((l) => l.housing)) === JSON.stringify([0, 40, 100, 220, 400, 700]), 'Living Quad homes 0 / 40 / 100 / 220 / 400 / 700');
  check(BUILDING.marketquad.levels.slice(1).every((l) => l.jobs > 0 && l.makes.credits > 0 && l.service > 0 && l.shoppers > 0), 'Market Quad levels: jobs, credits, shopping and shoppers');
  check(BUILDING.workshopquad.levels.slice(1).every((l) => l.jobs > 0 && l.makes.parts > 0 && l.nuisance > 0) && BUILDING.workshopquad.levels[5].makes.alloy > 0, 'Workshop Quad levels: jobs, parts (alloy higher up) and noise');
  check(V7.length === 7 && TECHS.filter((t) => t.ver === 7).length === 6, `version 7: 7 buildings, 6 techs (${V7.length}, ${TECHS.filter((t) => t.ver === 7).length})`);
  check(QUADS.every((k) => BUILDING[k].levels.every((l) => R.habitatLevelReachable(l))), 'every quad level is offered (its needs are known words)');
  check(QUADS.every((k) => BUILDING[k].levels[5].needs.includes('tech:' + { livingquad: 'skyscrapers', marketquad: 'skyscrapers', workshopquad: 'automation' }[k])), 'the top levels wait on a tech');
  check(V7.every((d) => d.cost.credits > 0 && (d.tech ? TECH[d.tech]?.unlocks.includes(d.key) || TECH[d.tech] : true)), 'supporting buildings have their techs');
  const s = newGame({ seed: 1 });
  check(QUADS.every((k) => s.unlocked.includes(k)) && ['school', 'transit', 'monorail', 'freightyard'].every((k) => !s.unlocked.includes(k)), 'the quads are on the menu from day 1; the supporting buildings wait on research');
  check(R.buildable(s).filter((b) => QUADS.includes(b.key)).every((b) => b.why === null && b.cat === 'homes'), 'the quads sit in Homes & parks, buildable at once');
  check(TECHS.filter((t) => t.ver === 7).every((t) => t.needs.every((n) => TECH[n])), 'version 7 techs have known prerequisites');
  // 3D kits that change by level, art slots and prompts
  for (const k of QUADS) {
    const h = [1, 2, 3, 4, 5, 6].map((l) => kitHeight(kitParts(k, l)));
    check(KITS[k] && h.every((v, i) => i === 0 || v >= h[i - 1] - 1e-9) && h[5] > h[1] * 1.8, `${k}: its kit grows by level (${h.map((v) => v.toFixed(2)).join(' ')})`);
    check(new Set([1, 2, 3, 4, 5, 6].map((l) => kitParts(k, l).length)).size >= 5, `${k}: each level looks different`);
  }
  check(V7.every((d) => KITS[d.key] && kitParts(d.key).every((p) => p.size.every(Number.isFinite) && p.pos.every(Number.isFinite))), 'every version 7 building has a 3D kit');
  check(V7.every((d) => d.key in Object.fromEntries(Object.keys(MANIFEST).map((m) => [m.replace('card/', ''), 1])) && existsSync(new URL(`../tools/art/colony/prompts/card-${d.key}.txt`, import.meta.url))), 'every version 7 building has a card slot and a prompt');
  check(/Zoning and growth/.test(helpHtml(() => null, null)) && /help-zoning/.test(helpHtml(() => null, null)), 'How to play: Zoning and growth');
}

// ---------------------------------------------------------------- demand
{
  const s = colony(1);
  let d = R.demandOf(s);
  // a new colony: 40 colonists, homes for 60: the next transport (20) fills the 20 free homes
  check(d.R.units === 0 && d.R.why.arriving === 20 && d.R.why.freeHomes === 20, `a new colony: its free homes take the next transport (${d.R.units})`);
  s.pop = 60;
  d = R.demandOf(s);
  check(d.R.units === 20 + Math.max(0, R.jobsOf(s) - s.pop) + (s.pop - R.housingOf(s)) && d.R.units === 20 && d.R.value > 0, `residential demand: the next transport, free jobs, less free homes (${d.R.units})`);
  check(d.C.units === s.pop, `commercial demand: every resident wants shops (${d.C.units})`);
  check(d.I.units === s.pop - R.jobsOf(s) + Math.round(40 * (0.5 - s.stock.parts / R.storageCaps(s).parts)), `industrial demand: the jobless, and a pull for parts (${d.I.units})`);
  check(['R', 'C', 'I'].every((z) => d[z].value >= -1 && d[z].value <= 1), 'demand bars stay within −1..1');
  const m = put(s, 'marketquad'); m.level = 2;
  check(R.demandOf(s).C.units === s.pop - 150, 'a Market Quad with Stalls serves 150 shoppers');
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
  s.pop = 60;   // crowded: homes wanted
  const q = put(s, 'livingquad', null, { gap: 4 });
  check(q && q.level === 1 && R.spec(q).housing === 0 && lvName(q) === 'Zoned lot', 'a Living Quad starts as an empty Zoned lot');
  const n0 = R.habitatNeeds(s, q);
  check(n0.length === 1 && n0[0].need === 'demand:R' && n0[0].met && n0[0].grow && /Residential demand \(\+\d+\)/.test(n0[0].label), `to grow into Cottages: residential demand (${n0.map((n) => n.label)})`);
  day(s, rng, SIM.quadGrowDays - 1);
  check(q.level === 1 && q.grow === SIM.quadGrowDays - 1, `it counts the days (${q.grow})`);
  day(s, rng);
  check(q.level === 2 && lvName(q) === 'Cottages' && R.spec(q).housing === 40 && s.log.some((l) => /Zoning: Living Quad → Cottages/.test(l.text)), 'after 4 days: Cottages for 40');
  const n1 = R.habitatNeeds(s, q);
  check(['demand:R', 'food', 'water', 'air', 'power', 'park', 'quiet'].every((k) => n1.some((n) => n.need === k)), `to grow into Row Houses: demand, every need, a park, quiet (${n1.map((n) => n.need)})`);
  check(!n1.find((n) => n.need === 'park').met, 'no park yet: it waits');
  s.pop = 140;
  day(s, rng, 6);
  check(q.level === 2, 'without a park it stays Cottages');
  const park = put(s, 'park', { x: q.x + 1, y: q.y + 1 });
  check(R.parkAt(s, q) > 0, 'a park beside it');
  day(s, rng, SIM.quadGrowDays);
  check(q.level === 3 && lvName(q) === 'Row Houses' && R.housingOf(s) >= 100, `with a park and demand: Row Houses (${lvName(q)})`);
  // workshop noise: a Workshop Quad growing next door pushes the Row Houses back to Cottages
  const w = put(s, 'workshopquad', { x: q.x + 1, y: q.y + 1 });
  w.level = 2;
  const noisy = R.habitatNeeds(s, { ...q, level: 2 }).find((n) => n.need === 'quiet');
  check(!noisy.met && /Workshops is \d tiles? away/.test(noisy.label), `the noise reads clearly (${noisy.label})`);
  day(s, rng, SIM.shrinkDays - 1);
  check(q.level === 3 && q.grow === -(SIM.shrinkDays - 1), 'a failing need counts down');
  day(s, rng);
  check(q.level === 2 && s.log.some((l) => /fell back/.test(l.text)), 'after 10 days of noise the Row Houses fall back to Cottages');
  s.buildings.splice(s.buildings.indexOf(w), 1);
  day(s, rng, SIM.quadGrowDays);
  check(q.level === 3, 'the workshop gone, they grow again');
  // demand and happiness only gate growth: they never push a quad back
  s.pop = 10;
  const held = R.habitatNeeds(s, { ...q, level: 2 });
  check(held.find((n) => n.need === 'demand:R').met === false && held.find((n) => n.need === 'demand:R').grow, 'demand gone...');
  day(s, rng, SIM.shrinkDays + 2);
  check(q.level === 3, '...but the Row Houses hold (demand only gates growing)');
  // the park removed: the level's own need fails and it falls back
  s.buildings.splice(s.buildings.indexOf(park), 1);
  day(s, rng, SIM.shrinkDays);
  check(q.level === 2, 'the park removed: back to Cottages');
  // shortages: needs met is one of the conditions too
  check(R.habitatNeeds(s, q).some((n) => n.need === 'food'), 'food for everyone is a condition of Row Houses');
}

// ---------------------------------------------------------------- the demand is spent as quads grow
{
  const s = colony(3), rng = stateRng(s);
  const lots = [];
  for (let k = 0; k < 4; k++) lots.push(put(s, 'livingquad', null, { gap: 3 + k * 3 }));
  check(lots.every(Boolean), 'four Living Quads zoned');
  s.pop = 60;   // R = 20 arriving + 0 free jobs + 40 crowding = 60: room for two lots of Cottages (40 each) today
  const r0 = R.demandOf(s).R.units;
  day(s, rng, SIM.quadGrowDays);
  const grown = lots.filter((b) => b.level === 2).length;
  check(grown === Math.ceil(r0 / 40) && grown < 4, `only as many grow as the demand (${r0}) allows: ${grown} of 4`);
  check(lots.filter((b) => b.level === 1).every((b) => b.grow === SIM.quadGrowDays), 'the rest wait, ready');
  s.pop = 400;
  day(s, rng);
  check(lots.every((b) => b.level === 2), 'more colonists: the rest grow the next day');
}

// ---------------------------------------------------------------- Market and Workshop Quads
{
  const s = colony(4), rng = stateRng(s);
  s.pop = 120;
  const home = put(s, 'livingquad', null, { gap: 3 }); home.level = 2;   // Cottages for 40
  const m = put(s, 'marketquad', { x: home.x, y: home.y }, { gap: 3 });
  const nm = R.habitatNeeds(s, m);
  check(nm.some((n) => n.need === 'demand:C' && n.met) && nm.some((n) => n.need === 'residents:40' && n.met && /Homes for 40 within 12 tiles \(now \d+\)/.test(n.label)), `Stalls need commercial demand and residents nearby (${nm.map((n) => n.label).join('; ')})`);
  const far = put(s, 'marketquad', { x: home.x, y: home.y }, { gap: 16 });
  check(!far || !R.habitatNeeds(s, far).find((n) => n.need === 'residents:40').met, 'a Market Quad far from homes has no customers');
  if (far) s.buildings.splice(s.buildings.indexOf(far), 1);
  const cr = s.stock.credits;
  day(s, rng, SIM.quadGrowDays);
  check(m.level === 2 && lvName(m) === 'Stalls' && R.spec(m).jobs === 6, 'Market Quad → Stalls (6 jobs)');
  day(s, rng);
  check(s.stats.last.produced.credits > 0 && s.happyParts.some((p) => p.label === 'Shopping' && p.value > 0), `Stalls earn credits and shopping cheers the homes in range (${s.happyParts.find((p) => p.label === 'Shopping')?.value})`);
  check(R.habitatNeeds(s, { ...home, level: 3 }).find((n) => n.need === 'shops').met, 'the Cottages have shops in reach (a need of Courtyard Flats)');
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
  check(R.spec(w).upkeep === 1 && R.spec({ key: 'livingquad', level: 6 }).upkeep === 12, 'upkeep by level');
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
  const q = put(s, 'livingquad', null, { gap: 4 }); q.level = 4;   // Courtyard Flats
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
  check(/^Happiness 60 \(now \d+\)$/.test(midNeeds.find((n) => n.need === 'happy:60').label), 'happiness reads with its value now');
  learn(s, 'urbanplan');
  check(R.habitatNeeds(s, q).find((n) => n.need === 'tech:urbanplan').met, 'Urban Planning done: that need is met');
  // a Transit Station in range: growth in 2 days
  const tr = put(s, 'transit', { x: q.x + 1, y: q.y + 1 });
  check(tr && R.covers(tr, q), 'a Transit Station in range');
  const lot = put(s, 'livingquad', { x: q.x + 1, y: q.y + 1 }, { gap: 3 });
  check(R.covers(tr, lot), 'over a new lot too');
  day(s, rng, SIM.transitGrowDays);
  check(lot.level === 2, `a lot in transit's range grows in ${SIM.transitGrowDays} days`);
  // the top: Skyscrapers and transit
  q.level = 5;
  const top = R.habitatNeeds(s, q);
  check(top.some((n) => n.need === 'transit' && n.met) && top.some((n) => n.need === 'tech:skyscrapers' && !n.met), 'Residential Tower: transit in reach, Research Skyscrapers');
  learn(s, 'highrise', 'skyscrapers');
  check(s.unlocked.includes('monorail') && R.habitatNeeds(s, q).find((n) => n.need === 'tech:skyscrapers').met, 'Skyscrapers: the top level and Monorail Stops');
  q.level = 6;
  check(R.habitatNeeds(s, q).length === 0 && R.spec(q).housing === 700, 'a Residential Tower houses 700; nothing above it');
}

// ---------------------------------------------------------------- save and load
{
  const s = colony(6), rng = stateRng(s);
  s.pop = 80;
  const q = put(s, 'livingquad', null, { gap: 4 });
  day(s, rng, 2);
  const back = loadState(saveState(s));
  const bq = back.buildings.find((b) => b.id === q.id);
  check(bq && bq.key === 'livingquad' && bq.level === 1 && bq.grow === 2, 'a growing lot keeps its level and its count through save and load');
  const r2 = stateRng(back);
  day(back, r2, SIM.quadGrowDays - 2);
  check(bq.level === 2, 'and goes on growing after loading');
  bq.level = 3;
  const again = loadState(saveState(back));
  check(again.buildings.find((b) => b.id === q.id).level === 3 && R.housingOf(again) === R.housingOf(back), 'its homes count after loading');
  // an old colony (saved before version 7) loads and offers the quads
  const old = JSON.parse(saveState(newGame({ seed: 7 })));
  old.unlocked = old.unlocked.filter((k) => !QUADS.includes(k));
  const o = loadState(JSON.stringify(old));
  check(QUADS.every((k) => o.unlocked.includes(k)), 'an older save gets the quads on its menu');
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
        if (dm[z].units > 0 && empty < 2) place(k, k === 'workshopquad' ? { x: centre.x + 14, y: centre.y } : centre, k === 'workshopquad' ? 0 : 3);
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
    dayTick(s, rng);
    if (process.env.QDEBUG && d % 10 === 0) console.log(mode, s.day, s.pop, R.housingOf(s), Math.round(s.happy), JSON.stringify(s.flags.short), s.buildings.filter((b) => b.build > 0).length, JSON.stringify(Object.fromEntries(Object.entries(R.demandOf(s)).map(([k, v]) => [k, v.units]))));
  }
  const homes = Object.entries(spent).filter(([k]) => ['livingquad', 'marketquad', 'workshopquad', 'habitat', 'towerblock'].includes(k)).reduce((t, [, v]) => t + v, 0);
  const lv = (k) => s.buildings.filter((b) => b.key === k).map((b) => b.level);
  return { s, pop: s.pop, housing: R.housingOf(s), homes, buildings: s.buildings.length, jobs: R.jobsOf(s), happy: s.happy, lv };
}
{
  const t0 = Date.now();
  const q = town('quads'), h = town('habitats');
  const hist = (l) => [1, 2, 3, 4, 5, 6].map((v) => l.filter((x) => x === v).length).join('/');
  console.log(`  quad town: ${q.pop} colonists, homes for ${q.housing}, ${q.jobs} jobs, happiness ${Math.round(q.happy)}, ${q.homes} credits on lots, ${q.buildings} buildings; levels R ${hist(q.lv('livingquad'))} C ${hist(q.lv('marketquad'))} I ${hist(q.lv('workshopquad'))}`);
  console.log(`  habitat town: ${h.pop} colonists, homes for ${h.housing}, ${h.jobs} jobs, happiness ${Math.round(h.happy)}, ${h.homes} credits on homes, ${h.buildings} buildings  (${Date.now() - t0} ms)`);
  check(q.pop > 300 * 1.5 && q.lv('livingquad').some((l) => l >= 4) && q.lv('marketquad').some((l) => l >= 3) && q.lv('workshopquad').some((l) => l >= 3), 'a quad town grows: colonists, and quads at the upper levels');
  check(q.pop > h.pop * 0.6 && q.pop < h.pop * 1.6, `a quad town is a real alternative, not strictly better (${q.pop} vs ${h.pop} colonists)`);
}

console.log(`colony-quads: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
