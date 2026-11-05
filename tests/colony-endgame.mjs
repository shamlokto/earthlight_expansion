// Version 6 (docs/COLONY-V6.md): can a colony reach the new endgame? A scripted, generous colony runs
// the real day (sim.js dayTick) from where the old win stood (every chamber open, 2,000 colonists, every
// tech known) and builds what a good player would: Arcologies and Tower Blocks ahead of the population,
// Vertical Farms, Water Works and Atmosphere Processors when a need runs short, Sun Mirrors for power,
// Clinics, Canteens, Safety Posts and Civic Plazas over every home. "Generous": credits and parts are
// topped up, construction crews are plentiful and raiders are switched off (a setting since version 5);
// food, water, air, power and every colonist come from the simulation alone (transports and births).
// Reports the day 25,000 colonists live in Eden and the day happiness has been above 85 for 30 days.
//   node tests/colony-endgame.mjs            (both difficulties)
//   node tests/colony-endgame.mjs easy 1     (one difficulty, one seed)
import { newGame } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { BUILDING, BUILDINGS, NEEDS } from '../js/colony/data/buildings.js';
import { TECHS } from '../js/colony/data/tech.js';
import { diffOf } from '../js/colony/difficulty.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const count = (s, k) => s.buildings.filter((b) => b.key === k).length;

function setup(seed, difficulty) {
  const s = newGame({ seed, difficulty });
  for (const c of s.chambers) { c.status = 'open'; c.work = 0; }
  for (const d of s.secrets?.dangers || []) d.done = true;
  s.research.done = TECHS.map((t) => t.key);
  s.unlocked = BUILDINGS.filter((d) => !d.fixed).map((d) => d.key);
  s.flags.unlock80 = true;
  s.options.raids = false;
  s.pop = 2000; s.tax = 0.1;
  Object.assign(s.stock, { credits: 1e6, parts: 1e5, food: 300, water: 300, air: 300 });
  s.pending.length = 0;
  return s;
}

const DECKS = ['main', 'upper', 'lower'];
const open = (s, deck) => s.chambers.filter((c) => R.deckOf(c) === deck && c.status === 'open');
// Place `key` free of charge-checks on the given deck(s), nearest to `near` when given; instant = no crew needed.
function place(s, key, { decks = R.decksOf(BUILDING[key]), near = null, instant = false } = {}) {
  for (const deck of decks) {
    if (!R.decksOf(BUILDING[key]).includes(deck)) continue;
    const boxes = near && near.deck === deck ? [{ x0: near.x - 14, y0: near.y - 14, x1: near.x + 14, y1: near.y + 14 }] : BUILDING[key].zone === 'interior' ? open(s, deck) : [null];
    for (const box of boxes) {
      const score = near ? (x, y) => Math.abs(x - near.x) + Math.abs(y - near.y) : () => 0;
      const p = R.findSpot(s, key, { deck, box: box || undefined, score, free: true });
      if (!p) continue;
      const r = R.build(s, key, p.x, p.y, deck);
      if (!r.ok) continue;
      const b = s.buildings[s.buildings.length - 1];
      if (instant) b.build = 0;
      return b;
    }
  }
  return null;
}

function play(seed, difficulty, maxDays = 2400) {
  const s = setup(seed, difficulty), rng = stateRng(s);
  // crews: ten Repair Yards at level 3 (32 crews), standing from the start
  for (let k = 0; k < 10; k++) { const b = place(s, 'repairyard', { instant: true }); if (b) b.level = 3; }
  // the 2,000 colonists of the old endgame: their homes, food, water, air and power, standing at the start
  for (let k = 0; k < 2; k++) place(s, 'arcology', { instant: true });
  for (const k of ['vertfarm', 'vertfarm', 'vertfarm', 'waterworks', 'waterworks', 'atmoproc', 'atmoproc']) place(s, k, { instant: true });
  for (let k = 0; k < 4; k++) place(s, 'sunmirror', { decks: ['main'], instant: true });
  if (!process.env.NOHALLS) for (let k = 0; k < 3; k++) place(s, 'arrivals', { decks: ['main'], instant: true });   // NOHALLS=1: without them
  place(s, 'obsdeck', { decks: ['main'], instant: true });
  for (const k of ['granary', 'granary', 'reserve', 'reserve', 'reserve']) place(s, k, { instant: true });
  let reached = null, happyDone = null, minHappy = 100, deaths = 0;
  const nm = diffOf(s).need;
  for (let day = 0; day < maxDays; day++) {
    s.stock.credits = Math.max(s.stock.credits, 1e5); s.stock.parts = Math.max(s.stock.parts, 1e4);
    s.pending.length = 0;
    const building = s.buildings.filter((b) => b.build > 0).length;
    const st = s.stats.last, pr = st.produced || {}, co = st.consumed || {};
    const need = { food: s.pop * NEEDS.food * nm, water: s.pop * NEEDS.water * nm, air: s.pop * NEEDS.air * nm };
    // homes ahead of the population: room for 40 days of growth
    const housing = s.buildings.reduce((t, b) => t + (R.spec(b).housing || 0), 0);   // planned, finished or not
    if (building < 24 && housing < s.pop * 1.12 + 1500) place(s, s.pop > 4000 ? 'arcology' : 'towerblock');
    // life support a little ahead of the needs (planned capacity, staffing assumed full)
    const planned = (g) => s.buildings.reduce((t, b) => t + (R.spec(b).makes?.[g] || 0) * (b.key === 'farm' ? 1.4 : 1), 0) - s.buildings.reduce((t, b) => t + (R.spec(b).uses?.[g] || 0), 0);
    const want = { food: need.food * 1.15 + 300, water: need.water * 1.1 + 300, air: need.air * 1.1 + 400 };
    if (building < 30) {
      if (planned('food') < want.food) place(s, 'vertfarm');
      if (planned('water') < want.water) place(s, 'waterworks');
      if (planned('air') < want.air) place(s, 'atmoproc');
      const pw = R.powerOf(s);
      if (pw.supply < pw.demand * 1.15 + 50) place(s, 'sunmirror', { decks: ['main'] }) || place(s, 'fusion');
    }
    // services over every home (every few days): a Clinic (raised to a Hospital), a Canteen, a Safety Post, a Civic Plaza
    if (day % 3 === 0) for (const h of s.buildings.filter((b) => R.HOME_KEYS.has(b.key))) {
      const at = { deck: R.deckOf(h), x: h.x, y: h.y };
      for (const k of ['clinic', 'canteen', 'safetypost', 'plaza', 'gallery']) {
        if (k === 'gallery' && !R.decksOf(BUILDING.gallery).includes(at.deck)) continue;
        if (!s.buildings.some((v) => v.key === k && R.covers(v, h))) { const b = place(s, k, { decks: [at.deck], near: at }); if (b && k === 'clinic') b.level = 3; }
      }
      if (h.key === 'towerblock' && !(R.parkAt(s, h) > 0)) place(s, 'park', { decks: [at.deck], near: at });
    }
    const pop0 = s.pop;
    dayTick(s, rng);
    if (s.pop < pop0 - 5 && s.flags.short.food + s.flags.short.water + s.flags.short.air > 0) deaths += pop0 - s.pop;
    if (s.day > 60) minHappy = Math.min(minHappy, s.happy);
    if (!reached && s.pop >= 25000) reached = s.day;
    if (!happyDone && R.victoryStatus(s).happy.met) happyDone = s.day;
    if (reached && happyDone && s.day >= Math.max(reached, happyDone) + 30) break;
  }
  return { s, reached, happyDone, minHappy, deaths };
}

// ---------------------------------------------------------------- the new sim effects, one by one
{
  // Emergency Stores: a shortfall is covered from the reserve, which refills from spare stock
  const s = setup(3, 'normal');
  s.pop = 100; s.stock.food = 2000; s.stock.water = 2000; s.stock.air = 2000;
  s.buildings = s.buildings.filter((b) => b.key === 'command' || b.key === 'dock');
  const a = place(s, 'reserve', { instant: true }), b = place(s, 'reserve', { instant: true });
  check(a && b && R.reserveCap(s) === 800, `two Emergency Stores hold 800 of each with Food Security (${R.reserveCap(s)})`);
  const rng = stateRng(s);
  for (let k = 0; k < 12; k++) { Object.assign(s.stock, { food: 2000, water: 2000, air: 2000 }); dayTick(s, rng); }   // spare stock each morning
  check(s.reserve.food >= 799 && s.reserve.water >= 799, `they fill from spare stock (${Math.round(s.reserve.food)} food)`);
  s.stock.food = 0; s.research.done = s.research.done.filter((k) => k !== 'foodsec');
  const before = s.reserve.food;
  dayTick(s, rng);
  check(s.flags.short.food === 0 && s.reserve.food < before && s.log.some((l) => /Emergency Stores/.test(l.text)), 'a day with no food in store: the colony eats from the reserve, nobody goes short');
  // automatic rationing (Food Security): food under three days and today's harvest short
  const t = setup(4, 'normal');
  t.pop = 500; t.stock.food = 600; t.reserve = { food: 0, water: 0, air: 0 };
  t.buildings = t.buildings.filter((b) => b.key !== 'reserve');
  dayTick(t, stateRng(t));
  check(t.flags.autoRation && t.happyParts.some((p) => p.label === 'Rationing (automatic)'), 'Food Security rations by itself when the food runs low');
  t.stock.food = 5000;
  dayTick(t, stateRng(t));
  check(!t.flags.autoRation, 'and stops once the stores recover');
}
{
  // Tower Blocks grow like Habitats; the Gallery and the Civic Plaza count as services
  const s = setup(5, 'normal');
  s.pop = 200; Object.assign(s.stock, { food: 3000, water: 3000, air: 3000 });
  for (const k of ['vertfarm', 'waterworks', 'atmoproc']) place(s, k, { instant: true });
  for (let k = 0; k < 3; k++) place(s, 'sunmirror', { decks: ['main'], instant: true });
  const tb = place(s, 'towerblock', { decks: ['main'], instant: true });
  const at = { deck: 'main', x: tb.x, y: tb.y };
  for (const k of ['park', 'clinic', 'gallery', 'plaza']) { const b = place(s, k, { decks: ['main'], near: at }); if (b) b.build = 0; }
  const rng = stateRng(s);
  for (let k = 0; k < 14; k++) { s.stock.food = Math.max(s.stock.food, 2000); dayTick(s, rng); }
  check(tb.level === 3 && R.spec(tb).housing === 450, `a Tower Block grows to a Spire for 450 (level ${tb.level})`);
  check(s.happyParts.some((p) => p.label === 'Gallery' && p.value > 0) && s.happyParts.some((p) => p.label === 'Civic Plaza' && p.value > 0), 'the Gallery and the Civic Plaza make homes happier');
}
{
  // Arrivals Halls: transports half as big again each, up to three
  const sizes = [0, 3].map((halls) => {
    const s = setup(6, 'normal');
    s.pop = 3000; Object.assign(s.stock, { food: 3000, water: 3000, air: 3000 });
    for (let k = 0; k < 3; k++) place(s, 'arcology', { instant: true });
    for (const k of ['vertfarm', 'vertfarm', 'vertfarm', 'vertfarm', 'waterworks', 'waterworks', 'atmoproc', 'atmoproc']) place(s, k, { instant: true });
    for (let k = 0; k < 4; k++) place(s, 'sunmirror', { decks: ['main'], instant: true });
    for (let k = 0; k < halls; k++) place(s, 'arrivals', { decks: ['main'], instant: true });
    s.happy = 90; s.day = 9;
    const rng = () => 0.5;
    const p0 = s.pop; dayTick(s, rng);
    return s.flags.arrival?.day === s.day ? s.flags.arrival.n : 0;
  });
  check(sizes[0] > 0 && sizes[1] >= Math.floor(sizes[0] * 2.4), `three Arrivals Halls make a transport 2.5 times as big (${sizes[0]} → ${sizes[1]})`);
}

const args = process.argv.slice(2);
const runs = args.length ? [[args[0], Number(args[1] || 1)]] : [['easy', 1], ['normal', 2]];
for (const [difficulty, seed] of runs) {
  const t0 = performance.now();
  const { s, reached, happyDone, minHappy, deaths } = play(seed, difficulty);
  const ms = performance.now() - t0, v = R.victoryStatus(s), sm = R.summary(s);
  const homes = ['habitat', 'towerblock', 'arcology'].map((k) => `${k} ${count(s, k)}`).join(', ');
  const life = ['vertfarm', 'waterworks', 'atmoproc', 'sunmirror', 'fusion'].map((k) => `${k} ${count(s, k)}`).join(', ');
  const svc = ['clinic', 'canteen', 'safetypost', 'plaza', 'gallery', 'park'].map((k) => `${k} ${count(s, k)}`).join(', ');
  console.log(`${difficulty} seed ${seed}: 25,000 colonists on day ${reached ?? '—'} (from 2,000 at day 0); happiness above 85 for 30 days by day ${happyDone ?? '—'}; `
    + `now day ${s.day}, pop ${s.pop}, housing ${sm.housing}, happy ${Math.round(s.happy)} (lowest after day 60: ${Math.round(minHappy)}), deaths ${deaths}`);
  console.log(`  homes: ${homes}\n  life: ${life}\n  services: ${svc}\n  buildings ${s.buildings.length}, jobs ${sm.jobs}, power ${Math.round(sm.power.supply)}/${Math.round(sm.power.demand)}, `
    + `tax ${Math.round(s.stats.last.tax)}/day vs upkeep ${Math.round(s.stats.last.upkeep)}/day; happiness: ${s.happyParts.map((p) => `${p.label} ${p.value}`).join(', ')} (${(ms / 1000).toFixed(1)} s)`);
  check(reached !== null && reached <= 1500, `${difficulty}: 25,000 colonists within 1,500 days of the old win (day ${reached})`);
  check(happyDone !== null, `${difficulty}: happiness held above 85 for 30 days (day ${happyDone})`);
  check(v.pop.met && v.chambers.met, `${difficulty}: the population and chamber parts are met at the end`);
}
console.log(`colony-endgame: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
