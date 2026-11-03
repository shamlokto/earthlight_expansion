// Earthlight Space Colony Rebuild: one day of the colony (docs/COLONY-V1.md "sim.js", the version 1
// subset of docs/COLONY.md §4). Pure apart from rng(), a seeded generator the caller passes in.
import { T, R, TERRAIN } from './data/terrain.js';
import { BUILDING, NEEDS, CHAMBER_AIR_PER_100 } from './data/buildings.js';
import {
  STORED, spec, active, tilesOf, centre, log, addPending, chamberOf, idx, storageCaps, jobsOf, crewsOf,
  powerOf, parkField, parkAt, openBreaches, habitatNeeds, PRICE,
} from './rules.js';
import { diffOf } from './difficulty.js';
import { updateGoals } from './goals.js';

export { habitatNeeds };

// Rules numbers the table has no column for.
export const SIM = {
  river: 1.25,            // farm beside the river
  seam: 2,                // ore mine on an ore seam
  cash: { food: 0.4, credits: 8 },   // farm in cash-crop mode: food × 0.4 and credits × soil
  fallowDays: 30,         // a fallow field mends its poor soil into plain
  transportEvery: 10, transportHappy: 55, transportFull: 45, transportMin: 8, transportMax: 20,
  emigrateBelow: 25, emigrate: 0.02,
  starveAfter: 3, death: 0.05,       // deaths: share of the colony a day, times how short the need is
  growDays: 5, shrinkDays: 10,       // habitat level changes
  taxPerPop: 0.3,         // credits a colonist a day at 10% tax
  unpaid: 0.75,           // output while upkeep is unpaid
  unlockPop: 80,
};
const TAX_HAPPY = [[0, 8], [0.1, 0], [0.2, -14], [0.3, -32]];

// A small seeded generator (mulberry32) whose state lives in the colony, so saves keep the dice.
const hash = (v) => { let h = 2166136261; for (const c of String(v)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export function stateRng(state) {
  return () => {
    let a = (state.flags.rng = ((state.flags.rng ?? hash(state.seed)) + 0x6d2b79f5) >>> 0);
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}

const SOIL = TERRAIN.map((t) => t.soil || 0);
// A farm's soil multiplier: the average over its footprint, +25% beside the river.
export function farmSoil(state, b) {
  const { t, w, h } = state.map;
  let s = 0, n = 0, river = false;
  for (const i of tilesOf(state, b)) {
    s += SOIL[t[i]]; n++;
    const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && t[ny * w + nx] === T.RIVER) river = true;
    }
  }
  return (s / n) * (river ? SIM.river : 1);
}

// Salvage: strip up to `amount` from rubble and wrecks in range; exhausted rubble becomes soil.
function strip(state, b, amount) {
  const { w, h, t, r, ch, sv } = state.map, c = centre(b), rad = spec(b).radius;
  amount = Math.round(amount);   // map.sv holds whole units
  let got = 0;
  for (let y = Math.max(0, Math.floor(c.y - rad)); y < Math.min(h, Math.ceil(c.y + rad)) && got < amount; y++) {
    for (let x = Math.max(0, Math.floor(c.x - rad)); x < Math.min(w, Math.ceil(c.x + rad)) && got < amount; x++) {
      const i = y * w + x;
      if (!sv[i] || (t[i] !== T.RUBBLE && r[i] !== R.WRECK)) continue;
      if (ch[i] !== 255 && chamberOf(state, ch[i])?.status !== 'open') continue;
      const take = Math.min(sv[i], amount - got);
      sv[i] -= take; got += take;
      if (!sv[i]) { if (t[i] === T.RUBBLE) t[i] = T.PLAIN; if (r[i] === R.WRECK) r[i] = R.NONE; }
    }
  }
  return got;
}

export function dayTick(state, rng) {
  const events = [];
  const say = (kind, text, pause = false) => { events.push({ kind, text, pause }); log(state, text); };
  const ask = (kind, title, text) => { addPending(state, kind, title, text); say(kind, text, true); };
  const f = state.flags;
  f.short ||= { food: 0, water: 0, air: 0, power: 0 };
  state.day++;

  // 1 construction: each crew works on one building, oldest order first.
  let crews = crewsOf(state);
  for (const b of state.buildings) {
    if (b.build <= 0 || crews <= 0) continue;
    crews--;
    if (--b.build > 0) continue;
    const d = BUILDING[b.key];
    say('built', `${d.name}${b.level > 1 ? ` level ${b.level}` : ''} finished.`);
    if (b.key === 'seal') {
      const i = idx(state, b.x, b.y);
      for (const c of state.chambers) if (c.breaches.includes(i) && c.status === 'surveyed' && !openBreaches(state, c).length) say('sealed', `Every breach of ${c.name} is sealed: it can be pressurised.`);
    }
  }

  // 2 chamber work: surveys and pressurising.
  for (const c of state.chambers) {
    if (c.work <= 0 || --c.work > 0) continue;
    if (c.status === 'surveying') { c.status = 'surveyed'; say('surveyed', `${c.name} surveyed: ${c.breaches.length} breach${c.breaches.length === 1 ? '' : 'es'} to seal, ${c.tiles} tiles of floor.`); }
    else if (c.status === 'pressurising') { c.status = 'open'; ask('chamber', 'Chamber open', `${c.name} holds air again: ${c.tiles} tiles to build on.`); }
  }

  // 3 labour (Lanternfall): one staffing fraction for every building with jobs.
  const jobs = jobsOf(state), staffing = jobs ? Math.min(1, state.pop / jobs) : 1;
  const moneyF = f.unpaid ? SIM.unpaid : 1;

  // 4 power: supply plus battery against demand; a shortfall throttles every consumer alike.
  const cap = storageCaps(state);
  const { supply, demand } = powerOf(state, staffing, moneyF);
  const pf = demand > 0 ? Math.min(1, (supply + state.battery) / demand) : 1;
  state.battery = Math.min(cap.power, Math.max(0, state.battery + supply - demand));

  // 5 production. Makers without inputs first (so today's water is there), then the users of
  // inputs, sharing a short input in proportion.
  const produced = {}, consumed = {}, st = state.stock;
  const make = (g, n) => { if (n > 0) { st[g] += n; produced[g] = (produced[g] || 0) + n; } };
  const use = (g, n) => { if (n > 0) { n = Math.min(n, st[g]); st[g] -= n; consumed[g] = (consumed[g] || 0) + n; } };
  const rate = (s) => (s.jobs ? staffing : 1) * (s.power < 0 ? pf : 1) * moneyF;
  const usesOf = (b, s) => (b.key === 'farm' && b.mode === 'fallow' ? null : s.uses);
  const run = (b, s, r) => {
    if (!s.makes || r <= 0) return;
    if (b.key === 'farm') {
      const soil = farmSoil(state, b);
      if (b.mode === 'cash') { make('food', s.makes.food * soil * SIM.cash.food * r); make('credits', SIM.cash.credits * soil * r); }
      else make('food', s.makes.food * soil * r);
    } else if (b.key === 'oremine') {
      const seam = [...tilesOf(state, b)].some((i) => state.map.r[i] === R.ORE_SEAM);
      make('ore', s.makes.ore * (seam ? SIM.seam : 1) * r);
    } else if (b.key === 'salvage') {
      const careful = b.mode === 'careful';
      make('parts', strip(state, b, s.makes.parts * r * (careful ? 0.5 : 1)) * (careful ? 2 : 1));
    } else for (const [g, n] of Object.entries(s.makes)) make(g, n * r);
  };
  const users = [];
  for (const b of state.buildings) {
    if (!active(b)) continue;
    const s = spec(b);
    if (b.key === 'farm' && b.mode === 'fallow') {
      if ((b.fallow = (b.fallow || 0) + 1) >= SIM.fallowDays) {
        b.fallow = 0;
        let mended = 0;
        for (const i of tilesOf(state, b)) if (state.map.t[i] === T.POOR) { state.map.t[i] = T.PLAIN; mended++; }
        if (mended) say('fallow', `A fallow field has mended: ${mended} tile${mended > 1 ? 's' : ''} of poor soil are plain again.`);
      }
      continue;
    }
    if (usesOf(b, s)) users.push([b, s, rate(s)]);
    else run(b, s, rate(s));
  }
  const want = {};
  for (const [b, s, r] of users) for (const [g, n] of Object.entries(usesOf(b, s))) want[g] = (want[g] || 0) + n * r;
  const share = {};
  for (const g in want) share[g] = want[g] > 0 ? Math.min(1, st[g] / want[g]) : 1;
  for (const [b, s, r0] of users) {
    const u = usesOf(b, s), r = r0 * Math.min(...Object.keys(u).map((g) => share[g]));
    for (const [g, n] of Object.entries(u)) use(g, n * r);
    run(b, s, r);
  }

  // 6 needs: colonists eat, drink and breathe; open chambers leak a little air.
  const pop = state.pop;
  let chamberAir = 0;
  for (const c of state.chambers) if (c.status === 'open') chamberAir += (c.tiles / 100) * CHAMBER_AIR_PER_100;
  const nm = diffOf(state).need;
  const need = { food: pop * NEEDS.food * nm, water: pop * NEEDS.water * nm, air: (pop * NEEDS.air + chamberAir) * nm };
  const got = {};
  for (const g in need) { const before = st[g]; use(g, need[g]); got[g] = need[g] > 0 ? (before - st[g]) / need[g] : 1; }
  const housing = state.buildings.reduce((t, b) => t + (active(b) ? spec(b).housing || 0 : 0), 0);
  const met = { food: got.food > 0.999, water: got.water > 0.999, air: got.air > 0.999, power: pf > 0.999, housing: pop <= housing };
  for (const g of ['food', 'water', 'air', 'power']) f.short[g] = met[g] ? 0 : f.short[g] + 1;
  for (const g of STORED) st[g] = Math.min(st[g], cap[g]);
  state.housing = housing;

  // 7 happiness, item by item.
  const parts = [{ label: 'Base', value: 50 }];
  const NEED_NAME = { food: 'Food', water: 'Water', air: 'Air', power: 'Power', housing: 'Housing' };
  for (const g of Object.keys(NEED_NAME)) {
    const days = g === 'housing' ? (met.housing ? 0 : 1) : f.short[g];
    parts.push(days ? { label: `${NEED_NAME[g]}: short${days > 1 ? ` ${days} days` : ''}`, value: -Math.min(40, 20 + 5 * (days - 1)) } : { label: `${NEED_NAME[g]}: enough`, value: 6 });
  }
  let tx = 0;
  for (let k = 1; k < TAX_HAPPY.length; k++) {
    const [r0, v0] = TAX_HAPPY[k - 1], [r1, v1] = TAX_HAPPY[k];
    if (state.tax <= r1 + 1e-9) { tx = v0 + ((v1 - v0) * (state.tax - r0)) / (r1 - r0); break; }
  }
  parts.push({ label: `Tax ${Math.round(state.tax * 100)}%`, value: Math.round(tx) });
  const field = parkField(state), homes = state.buildings.filter((b) => b.key === 'habitat' && active(b));
  const parkAvg = homes.length ? homes.reduce((t, b) => t + parkAt(state, b, field), 0) / homes.length : 0;
  parts.push({ label: 'Parks near homes', value: Math.round(parkAvg) });
  if (pop > housing) parts.push({ label: 'Crowding', value: -Math.min(30, Math.floor((housing ? (pop - housing) / housing : 1) * 50)) });
  if (pop > 0 && (pop - jobs) / pop > 0.2) parts.push({ label: 'Unemployment', value: -5 });
  state.happyParts = parts;
  state.happy = Math.max(0, Math.min(100, parts.reduce((t, p) => t + p.value, 0)));

  // 8 habitats grow when the colony's needs are met and a park covers them; they shrink back when
  // their own level's needs fail for a while.
  state.stats.last = { ...(state.stats.last || {}), met };
  for (const b of homes) {
    const d = BUILDING.habitat, nextOk = habitatNeeds(state, b, field);
    const canGrow = nextOk.length > 0 && nextOk.every((n) => n.met);
    const holds = b.level === 1 || habitatNeeds(state, { ...b, level: b.level - 1 }, field).every((n) => n.met);
    if (canGrow) b.grow = Math.max(0, b.grow || 0) + 1;
    else if (!holds) b.grow = Math.min(0, b.grow || 0) - 1;
    else b.grow = 0;
    if (b.grow >= SIM.growDays) { b.level++; b.grow = 0; say('grew', `A Habitat grew into ${d.levels[b.level - 1].name}: room for ${d.levels[b.level - 1].housing}.`); }
    else if (b.grow <= -SIM.shrinkDays) { b.level--; b.grow = 0; say('shrank', `A Habitat fell back to ${d.levels[b.level - 1].name}: its needs went unmet.`); }
  }

  // 9 population: deaths after days without food, water or air; emigration when unhappy;
  // a transport every ten days when the colony looks worth joining.
  let dead = 0;
  for (const g of ['food', 'water', 'air']) {
    if (f.short[g] > SIM.starveAfter && state.pop > 0) dead += Math.min(state.pop - dead, Math.max(1, Math.ceil(state.pop * SIM.death * (1 - got[g]))));
  }
  if (dead) { state.pop -= dead; say('deaths', `${dead} colonist${dead > 1 ? 's' : ''} died for want of ${['food', 'water', 'air'].filter((g) => f.short[g] > SIM.starveAfter).join(' and ')}.`); }
  if (state.happy < SIM.emigrateBelow && state.pop > 0) {
    const gone = Math.min(state.pop, Math.max(1, Math.ceil(state.pop * SIM.emigrate)));
    state.pop -= gone;
    say('emigration', `${gone} colonist${gone > 1 ? 's' : ''} left on a passing ship.`);
  }
  const dv = diffOf(state);
  if (state.day % dv.transportEvery === 0 && state.buildings.some((b) => b.key === 'dock' && b.build === 0)) {
    const free = housing - state.pop, surplus = (produced.food || 0) - (consumed.food || 0);
    const short = ['air', 'water', 'food'].filter((g) => !met[g]);
    const why = state.happy < dv.transportHappy ? `the colony is not happy enough (${Math.round(state.happy)}, needs ${dv.transportHappy})`
      : short.length ? `the colony is short of ${short.join(' and ')}` : free <= 0 ? 'there is no free housing' : surplus <= 0 ? 'there is no food to spare' : null;
    if (why) say('transport', `A transport passed by without docking: ${why}.`);
    else {
      // 8–20 arrive; the happier the colony, the larger the transport it attracts.
      const top = SIM.transportMin + Math.round((SIM.transportMax - SIM.transportMin) * Math.min(1, (state.happy - dv.transportHappy) / SIM.transportFull));
      const n = Math.min(free, SIM.transportMin + Math.floor(rng() * (top - SIM.transportMin + 1)));
      state.pop += n;
      state.flags.arrival = { day: state.day, n };   // the view flies the transport in (view3d/movers.js)
      ask('transport', 'Transport', `A transport docks with ${n} colonists.`);
    }
  }
  if (state.pop <= 0 && !f.lost) { f.lost = true; ask('lost', 'Eden is empty', 'The last colonist has gone. The colony is lost.'); }

  // 10 money: tax in, upkeep out. Unpaid upkeep slows everything the next day.
  const tax = state.pop * SIM.taxPerPop * (state.tax / 0.1);
  const upkeep = diffOf(state).upkeep * state.buildings.reduce((t, b) => t + (b.build === 0 ? BUILDING[b.key].upkeep || 0 : 0), 0);
  make('credits', tax);
  const paid = Math.min(upkeep, st.credits);
  use('credits', paid);
  f.unpaid = paid < upkeep - 1e-9;
  if (f.unpaid && state.day % 5 === 0) say('broke', 'The treasury is empty: upkeep goes unpaid and work slows down.');
  // Easy: Council relief when the colony is broke or hungry (difficulty.js relief), so a beginner's
  // colony cannot spiral into starvation for want of money to build farms.
  const relief = diffOf(state).relief;
  if (relief && (st.credits < 50 || f.short.food > 0) && state.day - (f.relief ?? -1e9) >= relief.every) {
    f.relief = state.day;
    st.credits += relief.credits; st.food = Math.min(st.food + relief.food, Math.max(cap.food || 0, relief.food));
    ask('relief', 'Council relief', `The Council sends ${relief.credits} credits and ${relief.food} food to tide Eden over. `
      + 'To earn your own: sell ore or spare food at the Market (the dock), switch farms to cash crops, or raise the tax a little. '
      + 'Switch off buildings you don\'t need to save upkeep. The Council helps at most once a month.');
  }

  // 11 market: prices drift back toward their base.
  for (const g in state.market) state.market[g] += (1 - state.market[g]) * PRICE.recover;

  // 12 milestones.
  if (state.pop >= SIM.unlockPop && !f.unlock80) {
    f.unlock80 = true;
    const keys = Object.values(BUILDING).filter((d) => d.unlock && d.unlock.pop <= SIM.unlockPop).map((d) => d.key);
    for (const k of keys) if (!state.unlocked.includes(k)) state.unlocked.push(k);
    ask('unlock', 'Eighty colonists', `Eden has ${state.pop} colonists. New buildings: ${keys.map((k) => BUILDING[k].name).join(', ')}.`);
  }

  state.stats.last = { produced, consumed, met, staffing, jobs, power: { supply, demand, factor: pf }, tax, upkeep };
  // 13 guided goals: a finished goal pays the Council grant and names the next (js/colony/goals.js)
  const goal = updateGoals(state);
  if (goal) events.push({ kind: 'goal', text: state.log[state.log.length - 1].text, pause: true });
  return { events };
}

// Runs whole days (tests, fast-forward). Returns every event.
export function runDays(state, days, rng = stateRng(state)) {
  const all = [];
  for (let d = 0; d < days; d++) all.push(...dayTick(state, rng).events);
  return all;
}
