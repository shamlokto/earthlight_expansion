// Earthlight Space Colony Rebuild: one day of the colony (docs/COLONY-V1.md "sim.js", the version 1
// subset of docs/COLONY.md §4, plus version 2 in docs/COLONY-V2.md: research, the ore -> alloy ->
// parts chain, services, clinics and Apartments, tailings, sweeper strikes, seed vaults; and version 3
// in docs/COLONY-V3.md: machine production, repairs, upkeep, commanders, wanderers, heat and raids,
// fusion, mushroom walls and terrace homes; and version 4 in docs/COLONY-V4.md: buildings on the
// upper and lower decks work like any other, coverage stays on its deck, Pump Stations drain; stage 2:
// the secrets' day in js/colony/secrets.js: discoveries, crews on dangers, the reactor, survivors).
// Pure apart from rng(), a seeded generator the caller passes in.
import { T, R, TERRAIN } from './data/terrain.js';
import { BUILDING, NEEDS, CHAMBER_AIR_PER_100 } from './data/buildings.js';
import { TECH } from './data/tech.js';
import {
  STORED, spec, active, finished, tilesOf, centre, log, addPending, chamberOf, idx, storageCaps, jobsOf, crewsOf,
  powerOf, parkField, parkAt, openBreaches, habitatNeeds, PRICE, upgradeState, techEffect, SERVICE_KINDS, covers, serviceValue,
  HOME_KEYS, stateRng, V3, RAID, machineOf, maxHp, addGuardian, rehomeOrders, machineUpkeep, fitCommander, deptMult, deptHead,
  heatTarget, warnLead, raidsPossible, raidInterval, makeRaid, raidPreview, answerRaid, raidName, FACTIONS, FROM, releaseCommander, inviteChance,
  mapOf, deckOf,
} from './rules.js';
import { COMMANDER, WANDERERS } from './data/commanders.js';
import { diffOf } from './difficulty.js';
import { updateGoals } from './goals.js';
import { dangerWork, secretsDay, floodedHere, SECRET } from './secrets.js';

export { habitatNeeds, stateRng };

// Rules numbers the table has no column for.
// Buildings on the priority power circuit (see the power step).
const LIFE_SUPPORT = new Set(['riverpump', 'airplant', 'reclaimer', 'hydro', 'habitat', 'terrace', 'clinic', 'iceharvester', 'gasscoop', 'pumpstation', 'mushroom', 'cistern']);

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
  // version 2
  ration: 0.8, rationHappy: -8,      // a Canteen on rationing: food use × 0.8, happiness −8
  obsHappy: 3,                       // the first Observation Deck, colony-wide
  birthEvery: 10, birthPer: 50,      // clinic births: every 10 days, +1 per 50 colonists covered
  mendEvery: 10,                     // Seed Vault: one poor tile in range to plain every 10 days
  strike: 0.02, strikeDays: 5,       // Meteoroid Sweeper: chance of a strike a day; days out
  minesFree: 4, minesPerDump: 4, dumpFull: 100, tailingsHalf: 0.5,   // Tailings Dumps
  sealFast: 2,                       // Bulkhead Seals in a Safety Post's range: days of work a day
  // version 3
  fusionHelium: 2, overdriveHelium: 4, overdriveTrip: 0.01, overdriveDays: 5,
  // version 4
  drainEvery: 5,                     // Pump Station: one flooded tile in range drained every 5 days
};
// Department heads (version 3): which buildings each one's bonus multiplies.
const DEPT_OF = {
  farm: 'agriculture', orchard: 'agriculture', fishery: 'agriculture', mushroom: 'agriculture',
  oremine: 'industry', smelter: 'industry', fabricator: 'industry', plasmaskimmer: 'industry', sweeper: 'industry',
  lab: 'research',
};
// Production stages: a user of a good another user makes runs after it (Smelter before Fabricator).
const STAGE = { alloy: 1 };
const TAX_HAPPY = [[0, 8], [0.1, 0], [0.2, -14], [0.3, -32]];

// stateRng: a small seeded generator (mulberry32) whose state lives in the colony, so saves keep the
// dice. It lives in rules.js since version 3 (invitations and raids use it) and is re-exported here.

const SOIL = TERRAIN.map((t) => t.soil || 0);
// A farm's soil multiplier: the average over its footprint, +25% beside the river.
export function farmSoil(state, b) {
  const { t, w, h } = mapOf(state, deckOf(b));
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
  const { w, h, t, r, ch, sv } = mapOf(state, deckOf(b)), c = centre(b), rad = spec(b).radius;
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

// The nearest tile of terrain `ter` (Chebyshev, ties in reading order) within a building's radius on
// its deck, or -1. `ok(i)`: a further test (Pump Stations drain only open chambers).
function nearestPoor(state, b, ter = T.POOR, ok = () => true) {
  const { w, h, t } = mapOf(state, deckOf(b)), c = centre(b), rad = spec(b).radius;
  let best = -1, bd = Infinity;
  for (let y = Math.max(0, Math.floor(c.y - rad)); y < Math.min(h, Math.ceil(c.y + rad)); y++) {
    for (let x = Math.max(0, Math.floor(c.x - rad)); x < Math.min(w, Math.ceil(c.x + rad)); x++) {
      const i = y * w + x, d = Math.max(Math.abs(x + 0.5 - c.x), Math.abs(y + 0.5 - c.y));
      if (t[i] === ter && d <= rad && d < bd && ok(i)) { bd = d; best = i; }
    }
  }
  return best;
}

// A Pump Station in a flooded chamber (stage 2): SECRET.pumpOut of its chamber's flooded tiles a day.
function pumpOut(state, b, c, m) {
  const w = state.map.w, wet = [];
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) { const i = y * w + x; if (m.ch[i] === c.id && m.t[i] === T.MARSH) wet.push(i); }
  const d = (i) => Math.max(Math.abs((i % w) - b.x), Math.abs(((i / w) | 0) - b.y));
  wet.sort((a, z) => d(a) - d(z) || a - z);
  for (const i of wet.slice(0, SECRET.pumpOut)) m.t[i] = deckOf(b) === 'main' ? T.PLAIN : T.DECK;
}

export function dayTick(state, rng) {
  const events = [];
  const say = (kind, text, pause = false) => { events.push({ kind, text, pause }); log(state, text); };
  const ask = (kind, title, text) => { const p = addPending(state, kind, title, text); say(kind, text, true); return p; };
  const f = state.flags;
  f.short ||= { food: 0, water: 0, air: 0, power: 0 };
  upgradeState(state);
  // a raid left unanswered when the clock moves on is fought (raiders don't wait)
  if (state.raid.coming && state.day >= state.raid.coming.day && state.raid.coming.arrived) {
    state.pending = state.pending.filter((p) => p.kind !== 'raid');
    const r = answerRaid(state, 'fight', rng);
    if (r.ok) events.push({ kind: 'raidresult', text: r.msg, pause: false });
  }
  state.day++;

  // 1 construction: each crew works on one building, oldest order first. A Safety Post's crews
  // put up Bulkhead Seals in its range twice as fast.
  let crews = crewsOf(state);
  // version 4 stage 2: decontamination and the reactor's stabilisation take the first crews
  crews = dangerWork(state, crews, say, ask);
  // raid damage (version 3) is repaired first, a crew a building, a day of damage a day
  for (const b of state.buildings) {
    if (!(b.damaged > 0) || crews <= 0) continue;
    crews--;
    if (--b.damaged <= 0) { delete b.damaged; say('repaired', `The ${BUILDING[b.key].name} is repaired and back at work.`); }
  }
  const posts = state.buildings.filter((b) => b.key === 'safetypost' && active(b));
  for (const b of state.buildings) {
    if (b.build <= 0 || crews <= 0) continue;
    crews--;
    const step = b.key === 'seal' && posts.some((p) => covers(p, b)) ? SIM.sealFast : 1;
    b.build = Math.max(0, b.build - step);
    if (b.build > 0) continue;
    const d = BUILDING[b.key];
    say('built', `${d.name}${b.level > 1 ? ` level ${b.level}` : ''} finished.`);
    if (b.key === 'seal') {
      const i = idx(state, b.x, b.y);
      for (const c of state.chambers) if (deckOf(c) === deckOf(b) && c.breaches.includes(i) && c.status === 'surveyed' && !openBreaches(state, c).length) say('sealed', `Every breach of ${c.name} is sealed: it can be pressurised.`);
    }
  }

  // 2 chamber work: surveys and pressurising.
  for (const c of state.chambers) {
    if (c.work <= 0 || --c.work > 0) continue;
    if (c.status === 'surveying') { c.status = 'surveyed'; say('surveyed', `${c.name} surveyed: ${c.breaches.length} breach${c.breaches.length === 1 ? '' : 'es'} to seal, ${c.tiles} tiles of floor.`); }
    else if (c.status === 'pressurising') { c.status = 'open'; ask('chamber', 'Chamber open', `${c.name} holds air again: ${c.tiles} tiles to build on.`); }
  }
  // version 4 stage 2: what the surveys found, flooding drained, the reactor's clock, survivors joining
  secretsDay(state, { rng, say, ask });

  // 3 labour (Lanternfall): one staffing fraction for every building with jobs.
  const jobs = jobsOf(state), staffing = jobs ? Math.min(1, state.pop / jobs) : 1;
  const moneyF = f.unpaid ? SIM.unpaid : 1;

  // 4 power: supply plus battery against demand; a shortfall throttles every consumer alike.
  // Fusion Reactors burn their helium first: without it they make nothing (version 3).
  const reactors = state.buildings.filter((b) => b.key === 'fusion' && active(b));
  let fusionUsed = 0;
  if (reactors.length) {
    const want = reactors.reduce((t, b) => t + (b.mode === 'overdrive' ? SIM.overdriveHelium : SIM.fusionHelium) * (BUILDING.fusion.jobs ? staffing : 1), 0);
    const share = want > 0 ? Math.min(1, state.stock.helium / want) : 1;
    for (const b of reactors) b.fuel = share;
    state.stock.helium -= want * share;
    fusionUsed = want * share;
  }
  const cap = storageCaps(state);
  const { supply, demand } = powerOf(state, staffing, moneyF);
  const pf = demand > 0 ? Math.min(1, (supply + state.battery) / demand) : 1;
  // Life support is on the priority circuit: when power is short, homes, water, air and food plants
  // get theirs first and industry slows down instead (a shortfall shouldn't suffocate the colony).
  let lifeDemand = state.pop * NEEDS.power;
  for (const b of state.buildings) { const sp = spec(b); if (active(b) && sp.power < 0 && LIFE_SUPPORT.has(b.key)) lifeDemand -= sp.power; }
  const avail = supply + state.battery;
  const pfLife = lifeDemand > 0 ? Math.min(1, avail / lifeDemand) : 1;
  const pfOther = demand - lifeDemand > 1e-9 ? Math.max(0, Math.min(1, (avail - lifeDemand) / (demand - lifeDemand))) : 1;
  state.battery = Math.min(cap.power, Math.max(0, state.battery + supply - demand));

  // 5 production. Makers without inputs first (so today's water is there), then the users of
  // inputs, sharing a short input in proportion.
  const produced = {}, consumed = {}, st = state.stock;
  const make = (g, n) => { if (n > 0) { st[g] += n; produced[g] = (produced[g] || 0) + n; } };
  const use = (g, n) => { if (n > 0) { n = Math.min(n, st[g]); st[g] -= n; consumed[g] = (consumed[g] || 0) + n; } };
  const rate = (s, key) => (s.jobs ? staffing : 1) * (s.power < 0 ? (LIFE_SUPPORT.has(key) ? pfLife : pfOther) : 1) * moneyF;
  const usesOf = (b, s) => (b.key === 'farm' && b.mode === 'fallow' ? null : s.uses);
  const outMult = {}, om = (key) => (outMult[key] ??= techEffect(state, 'output', key) * (DEPT_OF[key] ? deptMult(state, DEPT_OF[key]) : 1));
  const rates = new Map();   // each building's working rate today (services scale with it)
  let researchMade = 0;
  // Tailings: more than 4 Ore Mines need a Dump (not full) per 4 beyond the first 4, else half output.
  const mines = state.buildings.filter((b) => b.key === 'oremine' && active(b)).length;
  const dumps = state.buildings.filter((b) => b.key === 'tailings' && active(b) && (b.fill || 0) < SIM.dumpFull);
  const dumpsNeeded = mines > SIM.minesFree ? Math.ceil((mines - SIM.minesFree) / SIM.minesPerDump) : 0;
  const tailF = dumps.length >= dumpsNeeded ? 1 : SIM.tailingsHalf;
  if (dumpsNeeded > dumps.length && state.day % 10 === 0) say('tailings', `${mines} Ore Mines and ${dumps.length ? `only ${dumps.length}` : 'no'} working Tailings Dump${dumps.length === 1 ? '' : 's'}: the mines run at half output (${dumpsNeeded} needed).`);
  const run = (b, s, r) => {
    rates.set(b, r);
    if (!s.makes || r <= 0) return;
    const m = om(b.key);
    if (b.key === 'farm') {
      const soil = farmSoil(state, b);
      if (b.mode === 'cash') { make('food', s.makes.food * soil * SIM.cash.food * r * m); make('credits', SIM.cash.credits * soil * r * m); }
      else make('food', s.makes.food * soil * r * m);
    } else if (b.key === 'oremine') {
      const seam = [...tilesOf(state, b)].some((i) => mapOf(state, deckOf(b)).r[i] === R.ORE_SEAM);
      make('ore', s.makes.ore * (seam ? SIM.seam : 1) * r * m * tailF);
    } else if (b.key === 'salvage') {
      const careful = b.mode === 'careful';
      make('parts', strip(state, b, s.makes.parts * r * m * (careful ? 0.5 : 1)) * (careful ? 2 : 1));
    } else for (const [g, n] of Object.entries(s.makes)) {
      if (g === 'research') researchMade += n * r * m;
      else make(g, n * r * m);
    }
  };
  const users = [];
  if (fusionUsed) consumed.helium = fusionUsed;
  for (const b of state.buildings) {
    if (!active(b) || b.key === 'fusion') continue;   // fusion burned its helium before the power step
    const s = spec(b);
    if (b.key === 'farm' && b.mode === 'fallow') {
      if ((b.fallow = (b.fallow || 0) + 1) >= SIM.fallowDays) {
        b.fallow = 0;
        let mended = 0;
        const { t } = mapOf(state, deckOf(b));
        for (const i of tilesOf(state, b)) if (t[i] === T.POOR) { t[i] = T.PLAIN; mended++; }
        if (mended) say('fallow', `A fallow field has mended: ${mended} tile${mended > 1 ? 's' : ''} of poor soil are plain again.`);
      }
      continue;
    }
    if (usesOf(b, s)) users.push([b, s, rate(s, b.key)]);
    else run(b, s, rate(s, b.key));
  }
  // users by stage (a Fabricator uses the alloy today's Smelters made); a short input is shared in
  // proportion and scales the output of everyone who uses it
  const stageOf = ([b, s]) => Math.max(0, ...Object.keys(usesOf(b, s)).map((g) => STAGE[g] || 0));
  for (const stage of [0, 1]) {
    const group = users.filter((u) => stageOf(u) === stage), want = {};
    for (const [b, s, r] of group) for (const [g, n] of Object.entries(usesOf(b, s))) want[g] = (want[g] || 0) + n * r;
    const share = {};
    for (const g in want) share[g] = want[g] > 0 ? Math.min(1, st[g] / want[g]) : 1;
    for (const [b, s, r0] of group) {
      const u = usesOf(b, s), r = r0 * Math.min(...Object.keys(u).map((g) => share[g]));
      for (const [g, n] of Object.entries(u)) use(g, n * r);
      run(b, s, r);
    }
  }
  // Tailings Dumps fill: each working Ore Mine adds 1 a day, spread over the dumps not yet full.
  if (dumps.length && mines) for (const d of dumps) {
    d.fill = Math.min(SIM.dumpFull, (d.fill || 0) + mines / dumps.length);
    if (d.fill >= SIM.dumpFull) say('tailings', 'A Tailings Dump is full: it takes no more waste until it is emptied (its panel has the order).');
  }
  // Seed Vaults mend the nearest poor tile in range every 10 days.
  for (const b of state.buildings) {
    if (b.key !== 'seedvault' || !active(b) || (b.mend = (b.mend || 0) + 1) < SIM.mendEvery) continue;
    b.mend = 0;
    const i = nearestPoor(state, b);
    if (i >= 0) { mapOf(state, deckOf(b)).t[i] = T.PLAIN; say('mend', 'A Seed Vault mended a tile of poor soil: it is plain again.'); }
  }
  // Pump Stations (version 4) drain the nearest flooded tile of an open chamber in range every 5
  // days: deck plating on the lower deck, plain soil on the main deck. Stage 2: one standing in a
  // flooded chamber that is not open yet pumps it out, 4 tiles a day (the nearest first, anywhere in it).
  for (const b of state.buildings) {
    if (b.key !== 'pumpstation' || !active(b)) continue;
    const m = mapOf(state, deckOf(b)), home = chamberOf(state, m.ch[idx(state, b.x, b.y)]);
    if (home && home.status !== 'open' && floodedHere(state, home)) { pumpOut(state, b, home, m); continue; }
    if ((b.drain = (b.drain || 0) + 1) < SIM.drainEvery) continue;
    b.drain = 0;
    const i = nearestPoor(state, b, T.MARSH, (j) => chamberOf(state, m.ch[j])?.status === 'open');
    if (i >= 0) { m.t[i] = deckOf(b) === 'main' ? T.PLAIN : T.DECK; say('drain', `A Pump Station drained a tile of flooded ground on the ${deckOf(b)} deck.`); }
  }

  // 5b research: the labs' points go to the tech being studied (or into the bank, which flows into
  // the next one); a finished tech unlocks its buildings and its effects apply from now on.
  const rs = state.research;
  let flow = researchMade + rs.points;
  while (flow > 1e-9 && rs.focus && TECH[rs.focus]) {
    const t = TECH[rs.focus], put = Math.min(flow, t.cost - (rs.progress[t.key] || 0));
    rs.progress[t.key] = (rs.progress[t.key] || 0) + put;
    flow -= put;
    if (rs.progress[t.key] < t.cost - 1e-9) break;
    rs.progress[t.key] = t.cost; rs.focus = null;
    if (!rs.done.includes(t.key)) rs.done.push(t.key);
    for (const k of t.unlocks) if (!state.unlocked.includes(k)) state.unlocked.push(k);
    const news = t.unlocks.map((k) => BUILDING[k]?.name).filter(Boolean);
    const text = `Governor, the labs have finished ${t.name}. ${t.text}${news.length ? ` New to build: ${news.join(', ')}.` : ''} Choose what to study next in Research.`;
    const p = addPending(state, 'tech', `Research: ${t.name}`, text);
    p.speaker = 'ruess';
    say('tech', text, true);
  }
  rs.points = flow;

  // 6 needs: colonists eat, drink and breathe; open chambers leak a little air.
  const pop = state.pop;
  let chamberAir = 0;
  for (const c of state.chambers) if (c.status === 'open') chamberAir += (c.tiles / 100) * CHAMBER_AIR_PER_100;
  const nm = diffOf(state).need;
  const ration = state.buildings.some((b) => b.key === 'canteen' && b.mode === 'ration' && active(b));
  const need = { food: pop * NEEDS.food * nm * (ration ? SIM.ration : 1), water: pop * NEEDS.water * nm, air: (pop * NEEDS.air + chamberAir) * nm };
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
  // park coverage stays on its deck (version 4): each home reads its own deck's field
  const fields = {}, fieldOf = (b) => (fields[deckOf(b)] ??= parkField(state, deckOf(b)));
  const homes = state.buildings.filter((b) => b.key === 'habitat' && active(b));
  const dwellings = state.buildings.filter((b) => HOME_KEYS.has(b.key) && active(b));   // habitats and terrace homes
  const parkAvg = dwellings.length ? dwellings.reduce((t, b) => t + parkAt(state, b, fieldOf(b)), 0) / dwellings.length : 0;
  parts.push({ label: 'Parks near homes', value: Math.round(parkAvg) });
  // services (version 2): the best of each kind covering a home, averaged over the homes; a
  // service works at its building's rate today (staff, power, a Canteen's food)
  for (const k of SERVICE_KINDS) {
    const list = state.buildings.filter((b) => b.key === k.key && active(b));
    if (!list.length) continue;
    const best = (h) => list.reduce((m, b) => (covers(b, h) ? Math.max(m, serviceValue(b) * Math.min(1, rates.get(b) ?? 1)) : m), 0);
    parts.push({ label: k.label, value: Math.round(dwellings.length ? dwellings.reduce((t, h) => t + best(h), 0) / dwellings.length : 0) });
  }
  if (state.buildings.some((b) => b.key === 'obsdeck' && active(b))) parts.push({ label: 'Observation Deck', value: SIM.obsHappy });
  if (ration) parts.push({ label: 'Rationing', value: SIM.rationHappy });
  // version 3: a Welfare head (+ charm / 20), raid fear and tribute shame fading over 15 days,
  // a hot-headed commander going unpaid
  const welfare = deptHead(state, 'welfare');
  if (welfare) parts.push({ label: 'Welfare', value: Math.round((COMMANDER[welfare.key].charm || 0) / 20) });
  const rd = state.raid;
  // (full on the day after, gone `days` days later)
  rd.moods = rd.moods.filter((m) => state.day - m.day <= m.days);
  const moods = {};
  for (const m of rd.moods) moods[m.label] = (moods[m.label] || 0) + m.value * (1 - (state.day - m.day - 1) / m.days);
  for (const [label, v] of Object.entries(moods)) if (Math.round(v)) parts.push({ label, value: Math.round(v) });
  if (f.wagesUnpaid && state.commanders.some((c) => c.key === 'w_brann')) parts.push({ label: 'Brann unpaid', value: -2 });
  if (pop > housing) parts.push({ label: 'Crowding', value: -Math.min(30, Math.floor((housing ? (pop - housing) / housing : 1) * 50)) });
  if (pop > 0 && (pop - jobs) / pop > 0.2) parts.push({ label: 'Unemployment', value: -5 });
  state.happyParts = parts;
  state.happy = Math.max(0, Math.min(100, parts.reduce((t, p) => t + p.value, 0)));

  // 8 habitats grow when the colony's needs are met and a park covers them; they shrink back when
  // their own level's needs fail for a while.
  state.stats.last = { ...(state.stats.last || {}), met };
  for (const b of homes) {
    const field = fieldOf(b), d = BUILDING.habitat, nextOk = habitatNeeds(state, b, field);
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
  // Clinic births (full care): every 10 days, +1 colonist per 50 living in homes a clinic covers.
  const clinics = state.buildings.filter((b) => b.key === 'clinic' && b.mode !== 'triage' && active(b));
  if (clinics.length && state.day % SIM.birthEvery === 0 && housing > 0) {
    const coveredHomes = dwellings.reduce((t, h) => t + (clinics.some((c) => covers(c, h)) ? spec(h).housing || 0 : 0), 0);
    const n = Math.min(Math.max(0, housing - state.pop), Math.floor((state.pop * Math.min(1, coveredHomes / housing)) / SIM.birthPer));
    if (n > 0) { state.pop += n; say('births', `${n} child${n > 1 ? 'ren were' : ' was'} born in the Clinic's care.`); }
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
  // version 3: guardians' upkeep (free while `free` days remain), then commanders' wages (from the
  // 80-colonist milestone: before it the officers serve as the Council's staff)
  const machines = machineUpkeep(state);
  for (const g of state.guardians) if (g.free > 0) g.free--;
  const upkeep = diffOf(state).upkeep * state.buildings.reduce((t, b) => t + (b.build === 0 ? (BUILDING[b.key].upkeep || 0) * (b.key === 'clinic' && b.mode === 'triage' ? 0.5 : 1) : 0), 0) + machines;
  make('credits', tax);
  const paid = Math.min(upkeep, st.credits);
  use('credits', paid);
  f.unpaid = paid < upkeep - 1e-9;
  const wages = f.unlock80 ? state.commanders.reduce((t, c) => t + (COMMANDER[c.key]?.wage || 0), 0) : 0;
  f.wagesUnpaid = wages > 0 && st.credits < wages;
  if (!f.wagesUnpaid) use('credits', wages);
  if (f.unpaid && state.day % 5 === 0) say('broke', 'The treasury is empty: upkeep goes unpaid and work slows down.');
  // Easy: Council relief when the colony is broke or hungry (difficulty.js relief), so a beginner's
  // colony cannot spiral into starvation for want of money to build farms.
  const relief = diffOf(state).relief;
  if (relief && (st.credits < 50 || f.short.food > 0 || f.short.air > 0 || f.short.water > 0) && state.day - (f.relief ?? -1e9) >= relief.every) {
    f.relief = state.day;
    st.credits += relief.credits; st.food = Math.min(st.food + relief.food, Math.max(cap.food || 0, relief.food));
    if (relief.air) st.air = Math.min(st.air + relief.air, Math.max(cap.air || 0, relief.air));
    if (relief.water) st.water = Math.min(st.water + relief.water, Math.max(cap.water || 0, relief.water));
    ask('relief', 'Council relief', `The Council sends ${relief.credits} credits, ${relief.food} food${relief.water ? `, ${relief.water} water` : ''}${relief.air ? ` and ${relief.air} air` : ''} to tide Eden over. `
      + 'To earn your own: sell ore or spare food at the Market (the dock), switch farms to cash crops, or raise the tax a little. '
      + 'Switch off buildings you don\'t need to save upkeep. The Council helps at most once a month.');
  }

  // 11 market: prices drift back toward their base.
  for (const g in state.market) state.market[g] += (1 - state.market[g]) * PRICE.recover;

  // 11b meteoroid strikes: a working sweeper may be knocked out for a few days. A Fusion Reactor in
  // overdrive may trip into a 5-day shutdown (version 3).
  for (const b of state.buildings) {
    if ((b.key !== 'sweeper' && b.key !== 'fusion') || !finished(b)) continue;
    if (b.down > 0) b.down--;
    else if (b.key === 'sweeper' && !b.off && rng() < SIM.strike) { b.down = SIM.strikeDays; say('strike', `A meteoroid struck a Meteoroid Sweeper: it is out of action for ${SIM.strikeDays} days.`); }
    else if (b.key === 'fusion' && b.mode === 'overdrive' && active(b) && rng() < SIM.overdriveTrip) { b.down = SIM.overdriveDays; say('shutdown', `A Fusion Reactor in overdrive tripped its safeties: shut down for ${SIM.overdriveDays} days.`); }
  }

  // 11c version 3: machines, repairs, commanders, wanderers, heat and the raid clock.
  guardTick(state, { staffing, pf, moneyF, rng, say, ask });

  // 12 milestones.
  if (state.pop >= SIM.unlockPop && !f.unlock80) {
    f.unlock80 = true;
    const keys = Object.values(BUILDING).filter((d) => d.unlock && d.unlock.pop <= SIM.unlockPop).map((d) => d.key);
    for (const k of keys) if (!state.unlocked.includes(k)) state.unlocked.push(k);
    ask('unlock', 'Eighty colonists', `Eden has ${state.pop} colonists. New buildings: ${keys.map((k) => BUILDING[k].name).join(', ')}.`);
  }

  state.stats.last = { produced, consumed, met, staffing, jobs, power: { supply, demand, factor: pf }, tax, upkeep, research: researchMade, machines, wages: f.wagesUnpaid ? 0 : wages };
  // 13 guided goals: a finished goal pays the Council grant and names the next (js/colony/goals.js)
  const goal = updateGoals(state);
  if (goal) events.push({ kind: 'goal', text: state.log[state.log.length - 1].text, pause: true });
  return { events };
}

// ---------------------------------------------------------------- version 3: the guard's day

const r2 = (v) => Math.round(v * 100) / 100;
const cname = (key) => COMMANDER[key]?.name || key;
function guardTick(state, { staffing, pf, moneyF, rng, say, ask }) {
  const f = state.flags, rd = state.raid, st = state.stock;
  // production: the first order at each working Arsenal / Shipyard advances at its rate
  if (state.production.length) {
    rehomeOrders(state);
    const seen = new Set();
    for (const o of [...state.production]) {
      if (seen.has(o.at)) continue;
      seen.add(o.at);
      const b = state.buildings.find((x) => x.id === o.at);
      if (!b || !active(b)) continue;
      const s = spec(b);
      o.days = r2(Math.max(0, o.days - (s.jobs ? staffing : 1) * (s.power < 0 ? pf : 1) * moneyF));
      if (o.days > 0) continue;
      state.production.splice(state.production.indexOf(o), 1);
      addGuardian(state, o.type);
      say('machine', `A ${machineOf(state, o.type).name} rolls out of the ${BUILDING[b.key].name}: Eden has ${state.guardians.length} guardian machine${state.guardians.length === 1 ? '' : 's'}.`);
    }
  }
  // repairs: each working Scrapyard mends 2 HP a day of every damaged guardian, a part per HP
  // (half for a Mechanic's machine)
  const yards = state.buildings.filter((b) => b.key === 'scrapyard' && active(b)).length;
  if (yards) for (const g of state.guardians) {
    const max = maxHp(state, g);
    if (g.hp >= max) continue;
    const perHp = V3.repairPart * (COMMANDER[fitCommander(state, g.commander)?.key]?.perk === 'mechanic' ? 0.5 : 1);
    const hp = Math.min(V3.repairHp * yards, max - g.hp, st.parts / perHp);
    if (hp <= 0) continue;
    g.hp = Math.min(max, Math.round((g.hp + hp) * 10) / 10);
    st.parts = Math.max(0, st.parts - hp * perHp);
  }
  // commanders: injuries heal; loyalty drifts toward 40 + happiness / 2, falls while unpaid; the
  // disloyal may leave (Steady never does) and turn up at the Lodge again later
  for (const c of [...state.commanders]) {
    const d = COMMANDER[c.key] || {};
    if (c.injured > 0 && --c.injured === 0) say('recovered', `${cname(c.key)} is fit for duty again.`);
    const target = 40 + state.happy / 2;
    let delta = Math.sign(target - c.loyalty) * Math.min(V3.drift, Math.abs(target - c.loyalty));
    if (f.wagesUnpaid && d.wage) delta -= V3.unpaidLoyalty;
    if (c.key === 'w_thorne' && delta < 0) delta *= 2;   // deserted once: loyalty falls twice as fast
    c.loyalty = r2(Math.max(0, Math.min(100, c.loyalty + delta)));
    const floor = c.key === 'w_vashti' ? V3.leaveBelow + 10 : V3.leaveBelow;   // restless
    if (d.perk !== 'steady' && !d.general && c.loyalty < floor && rng() < V3.leaveChance) {
      releaseCommander(state, c.key);
      const p = ask('commander', 'A commander leaves', `${cname(c.key)} has had enough and leaves Eden on the next ship. Pay and a happy colony keep commanders loyal; they may pass by the Lodge again some day.`);
      p.speaker = 'sato';
    }
  }
  // wanderers: one arrives at a working Lodge every 15 days (Inn 10, Grand Lodge 7) and stays 20
  state.wanderers = state.wanderers.filter((w) => { if (w.until > state.day) return true; say('wanderer', `${cname(w.key)} moved on from the Lodge.`); return false; });
  const lodge = state.buildings.reduce((m, b) => (b.key === 'lodge' && active(b) ? Math.max(m, b.level) : m), 0);
  if (lodge) {
    const every = V3.lodgeEvery[Math.min(V3.lodgeEvery.length, lodge) - 1];
    f.lodgeDay ??= state.day - every;
    if (state.day - f.lodgeDay >= every) {
      f.lodgeDay = state.day;
      const away = f.away || {};
      const pool = [...new Set([...WANDERERS.map((w) => w.key), ...Object.keys(away)])]
        .filter((k) => !COMMANDER[k]?.general && !state.commanders.some((c) => c.key === k) && !state.wanderers.some((w) => w.key === k) && !((away[k] ?? -1) > state.day));
      if (pool.length) {
        const key = pool[Math.floor(rng() * pool.length)], d = COMMANDER[key];
        const w = { key, until: state.day + V3.stay, asked: 0, loyalty: d.loyalty ?? 60 };
        state.wanderers.push(w);
        const text = `${d.name}, ${d.title.toLowerCase()}, has taken a room at the Lodge for ${V3.stay} days. ${d.text || ''}${d.flaw ? ` ${d.flaw}` : ''} `
          + `An invitation costs a ${V3.invite.gift}-credit gift; the chance is ${Math.round(inviteChance(state, key) * 100)}%.`;
        const p = addPending(state, 'wanderer', `A wanderer: ${d.name}`, text.replace(/ +/g, ' ').trim(), [{ key: 'ok', label: 'Later' }, { key: 'invite', label: `Invite (${V3.invite.gift} credits)` }]);
        p.speaker = 'sato'; p.wanderer = key;
        say('wanderer', `${d.name} arrives at the Lodge.`, true);
      }
    }
  } else f.lodgeDay = undefined;
  // heat eases 10% a day toward its target; sales are remembered for 30 days
  const sold = f.sold || 0;
  rd.sales[state.day % 30] = Math.round(sold - (f.soldSeen ?? sold));
  f.soldSeen = sold;
  rd.heat = r2(rd.heat + (heatTarget(state).target - rd.heat) * RAID.heat.ease);
  // the raid clock: running from 80 colonists; a warning `warnLead` days ahead, then the raid
  if (f.lost || !raidsPossible(state)) return;
  const dk = state.difficulty === 'easy' ? 'easy' : 'normal';
  if (!rd.coming) {
    if (rd.next === null) rd.next = Math.max(RAID.start[dk] + RAID.firstGap, state.day + raidInterval(state, rng));
    if (state.day < RAID.start[dk] || state.day < rd.next - warnLead(state)) return;
    const raid = rd.coming = makeRaid(state, rng, Math.max(rd.next, state.day + 1));
    rd.warned = true;
    const days = raid.day - state.day, defended = state.guardians.length || state.buildings.some((b) => b.key === 'emplacement' && b.build === 0);
    const text = `Governor, long-range contact: ${FACTIONS[raid.faction].name}, ${raid.units.length} machine${raid.units.length > 1 ? 's' : ''} (${FACTIONS[raid.faction].text}), `
      + `coming from ${FROM[raid.from]}. They will be here in ${days} day${days > 1 ? 's' : ''}. `
      + (defended ? 'The guard is standing to: machines with crews and the hull batteries will meet them.' : 'We have nothing to meet them with.')
      + ' Machines from an Arsenal, crews from a Guardian Barracks and Battery Emplacements on the hull defend Eden; or we can pay them to leave.';
    const p = addPending(state, 'raidwarn', 'Raiders sighted', text);
    p.speaker = 'sato'; p.raid = raid;
    say('raidwarn', text, true);
    return;
  }
  if (rd.coming.arrived || state.day < rd.coming.day) return;
  rd.coming.arrived = true;
  const raid = rd.coming, pv = raidPreview(state), t = pv.tribute;
  const losses = pv.expectedLost.length ? `Likely losses: ${pv.expectedLost.map((k) => machineOf(state, k).name).join(', ')}.` : 'We should lose no machines.';
  const text = `${raidName(raid)} from ${FROM[raid.from]}: ${raid.units.length} machine${raid.units.length > 1 ? 's' : ''}, strength ${raid.strength}. `
    + `Our defence: ${Math.round(pv.defence)} (${pv.breakdown.crewed} crewed machine${pv.breakdown.crewed === 1 ? '' : 's'}, ${pv.breakdown.batteries} batter${pv.breakdown.batteries === 1 ? 'y' : 'ies'}). `
    + `Chance to win: ${Math.round(pv.winChance * 100)}%. ${losses} If we lose they take stores and knock out up to ${RAID.damage[1]} buildings. `
    + `Tribute: ${t.credits} credits${pv.canPay ? '' : ' (we cannot pay it)'}${st.credits < t.credits ? ` or ${t.food} food` : ''}.`;
  const p = addPending(state, 'raid', 'Raiders at the gates', text, [{ key: 'fight', label: 'Fight' }, { key: 'tribute', label: `Pay tribute (${st.credits >= t.credits ? `${t.credits} credits` : `${t.food} food`})` }]);
  p.speaker = 'sato'; p.raid = raid; p.preview = { winChance: pv.winChance, defence: pv.defence, attack: pv.attack, expectedLost: pv.expectedLost, expectedDamage: pv.expectedDamage, tribute: t, canPay: pv.canPay };
  say('raid', text, true);
}

// Runs whole days (tests, fast-forward). Returns every event.
export function runDays(state, days, rng = stateRng(state)) {
  const all = [];
  for (let d = 0; d < days; d++) all.push(...dayTick(state, rng).events);
  return all;
}
