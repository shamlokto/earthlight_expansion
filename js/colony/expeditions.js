// Earthlight Space Colony Rebuild: fleet expeditions on the sector map (docs/COLONY-V4.md §3 and
// "Stage 3 build contract: expeditions (lean)"). Pure: no DOM. The sectors are deterministic from the
// seed; the rest uses the colony's own dice (rules.js stateRng) or the sim's. rules.js re-exports the
// player's actions and read-outs, so the interface needs only rules.js.
//   makeSectors(seed)                       20 sectors in three rings around Eden (ring 1 known)
//   ensureExpeditions(state)                state.expeditions for a colony without it (old saves)
//   expeditionPreview(state, sectorId, guardianIds, commanderKey?)  { ok, why, days, power, strength, winChance, hazard, loot }
//   launchExpedition(state, sectorId, guardianIds, commanderKey?)   up to 6 crewed, undamaged guardians at home
//   recallExpedition(state, id)              turns a squadron round before it arrives
//   expeditionsDay(state, { rng, say, ask }) the sim's part: arrivals (one event per site) and returns
//   densCleared(state)                      pirate dens cleared (heat and the raid clock read it)
// state.expeditions = { sectors: [{ id, name, ring, angle, site, faction?, parent, known, visited, cleared }],
//   away: [{ id, sector, guardians, commander, leave, arrive, back, report, recalled }], log: [reports], next }
// A guardian away carries `away: expeditionId`: raids, the drone fights and repairs skip it.
import { MACHINES } from './data/machines.js';
import { TECHS } from './data/tech.js';
import { BASE_PRICE } from './data/buildings.js';
import { COMMANDER, WANDERERS } from './data/commanders.js';
import { hashSeed, mulberry32 } from './mapgen.js';
import {
  log, addPending, stateRng, crewed, guardianPower, maxHp, machineOf, addGuardian, fitCommander, winChance, storageCaps, RAID, V3,
} from './rules.js';

export const EXP = {
  max: 6, travel: 4,                    // squadron size; days per ring each way
  hazard: { wits: [0, 60, 75], hurt: 0.1 },   // a commander's wits above this (by ring) avoids it; else each machine loses 10% × ring of its HP
  heatCut: 20, denHeat: 5, raidSlow: 0.15,     // a den cleared: heat −20 at once, −5 on the heat target and raids 15% rarer for good
  easy: 0.6,                            // Easy's sites are weaker, as its raiders are
};
// Site types: fight strength by ring (0: no fight), hazard, whether the loot comes again on every visit.
export const SITES = {
  belt: { name: 'Asteroid belt', text: 'Ore and ice for the taking; mining runs can be repeated.', fight: [0, 0, 0], hazard: 'debris', repeat: true },
  comet: { name: 'Comet', text: 'A comet\'s head of water ice; runs can be repeated.', fight: [0, 0, 0], hazard: 'debris', repeat: true },
  derelict: { name: 'Derelict warship', text: 'Salvage (parts, credits, sometimes a machine), still guarded by its drones.', fight: [100, 300, 650], hazard: 'debris' },
  babylon: { name: 'The Babylon wreck', text: 'Where Babylon sank: deep salvage, a great machine and her story.', fight: [0, 0, 750], hazard: 'debris' },
  bunker: { name: 'Galt bunker', text: 'Survivors and Galt blueprints behind automated guns.', fight: [120, 250, 550], hazard: 'radiation' },
  den: { name: 'Pirate den', text: 'Clear it: heat falls and raids come less often.', fight: [150, 400, 800], hazard: null },
  outpost: { name: 'Outpost', text: 'Traders: goods each visit, and a wanderer who wants work.', fight: [0, 0, 0], hazard: null, repeat: true },
  listening: { name: 'Directorate listening post', text: 'Its records: a large research haul and the whole chart. Its guard still answers.', fight: [0, 0, 1100], hazard: 'radiation' },
  relief: { name: 'Earth relief station', text: 'Where relief convoys for Earth will dock.', fight: [0, 0, 0], hazard: null },
};
export const HAZARD = { debris: 'debris fields', radiation: 'radiation' };
const RINGS = [
  ['belt', 'comet', 'derelict', 'den', 'outpost', 'relief'],
  ['belt', 'comet', 'derelict', 'den', 'bunker', 'outpost', 'relief'],
  ['babylon', 'listening', 'den', 'derelict', 'bunker', 'belt', 'outpost'],
];
const NAMES = ['Tycho Shoals', 'Harrow Drift', 'Lantern Reach', 'Calder Gap', 'Selene Verge', 'Morrow Fields', 'Quiet Meridian', 'Ashen Narrows',
  'Corvid Wake', 'Halcyon Rise', 'Iron Tithe', 'Weeping Arc', 'Kestrel Run', 'Pale Orchard', 'Saint Brigid\'s Sweep', 'Drowned Choir', 'Cinder Steps',
  'Hollow Crown', 'Long Vigil', 'Thessaly Rim', 'Gannet Deep', 'Oriel Span'];
const STORY = {
  babylon: { title: 'Babylon\'s grave', text: 'The remnant\'s salvage crews found Babylon where she sank, her hull broken open in a slow field of her own plating. '
    + 'Her main cannon was whole, the breech still sealed: whatever ended her, she never fired it. '
    + 'On the bridge a Galt flag is still bolted to the bulkhead, scorched at the edges, and none of the crews would take it down.' },
  listening: { title: 'The listening post', text: 'The post\'s tapes run to the last day of the Directorate: every ship that passed Eden, logged and named. '
    + 'The last entries are orders to stop listening.' },
};
const ok = (msg, extra) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const between = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
const round1 = (v) => Math.round(v * 10) / 10;
const TAU = Math.PI * 2;
const angDiff = (a, b) => { const d = Math.abs(a - b) % TAU; return Math.min(d, TAU - d); };

// ---------------------------------------------------------------- the sectors

export function makeSectors(seed) {
  const rng = mulberry32(hashSeed(`${seed}:sectors`)), names = [...NAMES], out = [];
  for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
  RINGS.forEach((list, r) => {
    const sites = [...list], n = sites.length, step = TAU / n, base = rng() * TAU;
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [sites[i], sites[j]] = [sites[j], sites[i]]; }
    const angles = sites.map((_, i) => (base + i * step + (rng() - 0.5) * step * 0.5 + TAU) % TAU);
    // the relief station sits on the Earth side of the chart (angle π/2: straight down)
    const ri = sites.indexOf('relief');
    if (ri >= 0) { let best = 0; angles.forEach((a, i) => { if (angDiff(a, Math.PI / 2) < angDiff(angles[best], Math.PI / 2)) best = i; }); [sites[ri], sites[best]] = [sites[best], sites[ri]]; }
    sites.forEach((site, i) => {
      const s = { id: `s${out.length + 1}`, name: site === 'babylon' ? 'Babylon\'s Grave' : site === 'listening' ? 'Station Vigil' : names.pop(), ring: r + 1, angle: Math.round(angles[i] * 1000) / 1000,
        site, parent: null, known: r === 0, visited: false, cleared: false };
      if (site === 'outpost') s.faction = rng() < 0.5 ? 'union' : 'galt';
      out.push(s);
    });
  });
  // each outer sector hangs off the nearest sector of the ring inside it: visiting that one reveals it
  for (const s of out) if (s.ring > 1) s.parent = out.filter((p) => p.ring === s.ring - 1).sort((a, b) => angDiff(a.angle, s.angle) - angDiff(b.angle, s.angle))[0].id;
  return out;
}

export function ensureExpeditions(state) {
  if (!state.expeditions) state.expeditions = { sectors: makeSectors(state.seed ?? 1), away: [], log: [], next: 1 };
  const e = state.expeditions;
  e.sectors ??= makeSectors(state.seed ?? 1); e.away ??= []; e.log ??= []; e.next ??= 1;
  return e;
}
const expOf = (state) => ensureExpeditions(state);
export const sectorOf = (state, id) => expOf(state).sectors.find((s) => s.id === id) || null;
export const densCleared = (state) => (state.expeditions?.sectors || []).filter((s) => s.site === 'den' && s.cleared).length;
export const isAway = (g) => !!g?.away;
export const siteName = (s) => (s.site === 'outpost' ? `${s.faction === 'galt' ? 'Galt' : 'Union'} outpost` : SITES[s.site]?.name || s.site);
export const travelDays = (s) => EXP.travel * s.ring;
export const strengthOf = (state, s) => (s.cleared && !SITES[s.site].repeat ? 0 : Math.round((SITES[s.site].fight[s.ring - 1] || 0) * (state.difficulty === 'easy' ? EXP.easy : 1)));

// What a visit would bring home (before the dice): { goods, research, pop, machine (a chance), blueprint, wanderer, story, reveal }.
export function lootPlan(state, s) {
  const r = s.ring, L = { goods: {}, research: 0, pop: 0, machine: 0, blueprint: false, wanderer: false, story: null, reveal: 0, heat: 0 };
  const once = !SITES[s.site].repeat && s.cleared;
  L.reveal = expOf(state).sectors.filter((x) => !x.known && (s.site === 'listening' ? true : x.parent === s.id)).length;
  if (once) return L;
  const g = L.goods;
  switch (s.site) {
    case 'belt': g.ore = 80 * r; g.water = 40 * r; break;
    case 'comet': g.water = 120 * r; g.air = 30 * r; break;
    case 'derelict': g.parts = 40 * r; g.credits = 250 * r; L.machine = [0.35, 0.5, 0.75][r - 1]; break;
    case 'babylon': g.parts = 250; g.credits = 2500; L.research = 300; L.machine = 1; L.story = 'babylon'; break;
    case 'bunker': L.pop = 8 * r; L.research = 120 * r; L.blueprint = true; break;
    case 'den': g.credits = 400 * r; g.parts = 30 * r; L.heat = EXP.heatCut; break;
    case 'outpost': g.food = 60 * r; g.parts = 20 * r; g.credits = 150 * r; L.wanderer = !s.visited; break;
    case 'listening': L.research = 800; L.story = 'listening'; break;
    case 'relief': g.helium = 20 * r; break;
  }
  return L;
}
export function lootText(L) {
  const out = Object.entries(L.goods).map(([k, n]) => `${n} ${k}`);
  if (L.research) out.push(`${L.research} research`);
  if (L.blueprint) out.push('a Galt blueprint');
  if (L.pop) out.push(`${L.pop} survivors`);
  if (L.machine) out.push(L.machine >= 1 ? 'a machine' : `a machine (${Math.round(L.machine * 100)}%)`);
  if (L.wanderer) out.push('a wanderer for the Lodge');
  if (L.heat) out.push(`heat −${L.heat}, fewer raids`);
  if (L.story) out.push('a story');
  if (L.reveal) out.push(`${plural(L.reveal, 'sector')} charted`);
  return out;
}

// ---------------------------------------------------------------- squadrons

// The squadron's leader: the commander named, or the first fit one already leading a machine of it.
function leaderOf(state, gs, key) {
  if (key) return fitCommander(state, key);
  for (const g of gs) { const c = fitCommander(state, g.commander); if (c) return c; }
  return null;
}
function squadWhy(state, s, ids, key) {
  if (!s) return 'There is no such sector.';
  if (!s.known) return 'That sector is not charted yet: visit the sector next to it, nearer Eden.';
  if (expOf(state).away.some((e) => e.sector === s.id)) return 'A squadron is already on its way there.';
  if (!ids?.length) return 'Choose guardians for the squadron.';
  if (ids.length > EXP.max) return `A squadron is at most ${EXP.max} machines.`;
  const crew = crewed(state);
  for (const id of ids) {
    const g = state.guardians.find((x) => x.id === id);
    if (!g) return 'That machine is not in the guard.';
    const n = machineOf(state, g.type).name;
    if (g.away) return `The ${n} is away on another expedition.`;
    if (g.hp < maxHp(state, g)) return `The ${n} is damaged: repair it first (a Scrapyard).`;
    if (!crew.has(g.id)) return `The ${n} has no crew: Guardian Barracks crew more machines.`;
  }
  if (key) {
    const c = state.commanders.find((x) => x.key === key);
    if (!c) return 'That commander is not serving in Eden.';
    if (c.injured > 0) return `${COMMANDER[key]?.name || key} is recovering.`;
    const led = state.guardians.find((g) => g.commander === key);
    if (led?.away) return `${COMMANDER[key]?.name || key} is away with another squadron.`;
  }
  return null;
}
// Power with the commander placed on the squadron (on the strongest machine without one), as launch would.
function squadPower(state, gs, key) {
  let lead = null;
  if (key && !gs.some((g) => g.commander === key)) lead = [...gs].filter((g) => !g.commander).sort((a, b) => guardianPower(state, b) - guardianPower(state, a))[0] || null;
  return gs.reduce((t, g) => t + guardianPower(state, g === lead ? { ...g, commander: key } : g), 0);
}
const hazardOf = (state, s, leader) => {
  const kind = s.ring > 1 && !(s.cleared && !SITES[s.site].repeat) ? SITES[s.site].hazard : null;
  if (!kind) return null;
  const need = EXP.hazard.wits[s.ring - 1], wits = leader ? COMMANDER[leader.key]?.wits || 0 : 0;
  return { kind, name: HAZARD[kind], need, wits, avoided: wits > need, hurt: wits > need ? 0 : EXP.hazard.hurt * s.ring, by: leader?.key || null };
};

export function expeditionPreview(state, sectorId, guardianIds = [], commanderKey = null) {
  const s = sectorOf(state, sectorId), why = squadWhy(state, s, guardianIds, commanderKey);
  if (!s) return { ok: false, why };
  const gs = guardianIds.map((id) => state.guardians.find((g) => g.id === id)).filter(Boolean);
  const leader = leaderOf(state, gs, commanderKey), hz = hazardOf(state, s, leader);
  const power = squadPower(state, gs, commanderKey), fight = power * (1 - (hz?.hurt || 0)), strength = strengthOf(state, s);
  const p = strength ? winChance(fight, strength) : 1;
  return { ok: !why, why, sector: s, days: travelDays(s), roundTrip: 2 * travelDays(s), power: Math.round(power), strength, winChance: p,
    hazard: hz, leader: leader?.key || null, loot: lootPlan(state, s), lootText: lootText(lootPlan(state, s)) };
}

export function launchExpedition(state, sectorId, guardianIds = [], commanderKey = null) {
  const s = sectorOf(state, sectorId), why = squadWhy(state, s, guardianIds, commanderKey);
  if (why) return no(why);
  const gs = guardianIds.map((id) => state.guardians.find((g) => g.id === id));
  if (commanderKey && !gs.some((g) => g.commander === commanderKey)) {
    const lead = [...gs].filter((g) => !g.commander).sort((a, b) => guardianPower(state, b) - guardianPower(state, a))[0];
    if (!lead) return no('Every machine of the squadron already has a commander.');
    for (const g of state.guardians) if (g.commander === commanderKey) g.commander = null;
    lead.commander = commanderKey;
  }
  const ex = expOf(state), d = travelDays(s), leader = leaderOf(state, gs, commanderKey);
  const e = { id: ex.next++, sector: s.id, guardians: [...guardianIds], commander: leader?.key || null, leave: state.day, arrive: state.day + d, back: state.day + 2 * d, report: null, recalled: false };
  for (const g of gs) g.away = e.id;
  ex.away.push(e);
  const msg = `A squadron of ${plural(gs.length, 'machine')}${leader ? ` under ${COMMANDER[leader.key]?.name}` : ''} leaves for ${s.name} (${siteName(s)}): ${plural(d, 'day')} out, back about day ${e.back}.`;
  log(state, msg);
  return ok(msg, { expedition: e });
}

export function recallExpedition(state, id) {
  const ex = expOf(state), e = ex.away.find((x) => x.id === id);
  if (!e) return no('No such squadron is away.');
  if (e.report || e.recalled) return no('That squadron is already on its way home.');
  e.peak = round1((state.day - e.leave) / Math.max(1, e.arrive - e.leave) * 100) / 100;   // how far out it got (for the chart)
  e.recalled = true; e.arrive = null; e.turned = state.day;
  e.back = state.day + (state.day - e.leave);
  const s = sectorOf(state, e.sector);
  if (e.back <= state.day) { comeHome(state, e, null); return ok(`The squadron for ${s.name} stands down before it left.`); }
  const msg = `The squadron bound for ${s.name} turns for home: back on day ${e.back}.`;
  log(state, msg);
  return ok(msg);
}

// ---------------------------------------------------------------- arrival and return

const hurtOne = (state, g, frac, rng, lost, canKill = true) => {
  const max = maxHp(state, g), bulwark = COMMANDER[fitCommander(state, g.commander)?.key]?.perk === 'bulwark' ? V3.bulwark : 1;
  g.hp = round1(g.hp - max * frac * bulwark);
  if (!canKill) g.hp = Math.max(round1(max * 0.1), g.hp);
  if (g.hp > 0.05) return;
  lost.push(g.type);
  if (g.commander) {
    const c = state.commanders.find((x) => x.key === g.commander);
    if (c) { c.injured = between(rng, V3.injury); log(state, `${COMMANDER[c.key]?.name} was pulled from the wreck of the ${machineOf(state, g.type).name}: injured for ${c.injured} days.`); }
  }
  state.guardians.splice(state.guardians.indexOf(g), 1);
};

// On arrival: the hazard on the way in, then the fight (if the site has one); the loot is decided here
// and comes home with the squadron.
function arrive(state, e, rng) {
  const s = sectorOf(state, e.sector), gs = state.guardians.filter((g) => g.away === e.id), lost = [];
  const leader = e.commander ? fitCommander(state, e.commander) : null, hz = hazardOf(state, s, leader);
  if (hz?.hurt) for (const g of [...gs]) hurtOne(state, g, hz.hurt * (0.75 + rng() * 0.5), rng, lost, false);
  const strength = strengthOf(state, s), power = gs.reduce((t, g) => t + guardianPower(state, g), 0);
  const p = strength ? winChance(power, strength) : 1, won = !strength || rng() < p;
  if (strength) {
    const share = strength / (strength + power || 1);
    for (const g of state.guardians.filter((x) => x.away === e.id)) {
      hurtOne(state, g, RAID.hurt * share * (won ? 1 : RAID.hurtLost) * (0.5 + rng()), rng, lost);
      if (g.hp > 0.05 && state.guardians.includes(g)) g.level = Math.min(V3.maxLevel, (g.level || 0) + (fitCommander(state, g.commander) ? 2 : 1));
    }
  }
  const plan = lootPlan(state, s), loot = { goods: {}, research: 0, pop: 0, machines: [], blueprint: null, wanderer: null, story: null, reveal: [], heat: 0 };
  if (won) {
    Object.assign(loot.goods, plan.goods);
    loot.research = plan.research; loot.pop = plan.pop; loot.heat = plan.heat; loot.story = plan.story;
    if (plan.machine && rng() < plan.machine) {
      const pool = s.site === 'babylon' ? MACHINES.filter((m) => m.cls === 'ships' && m.hp >= 18 && m.attack > 0 && !m.unique && m.tier <= 3)
        : MACHINES.filter((m) => m.attack > 0 && !m.unique && m.tier <= Math.min(3, s.ring + 1) && m.type !== 79);
      loot.machines.push(pool[Math.floor(rng() * pool.length)].type);
    }
    if (plan.blueprint) loot.blueprint = TECHS.filter((t) => !state.research.done.includes(t.key) && t.needs.every((n) => state.research.done.includes(n))).sort((a, b) => a.cost - b.cost)[0]?.key || null;
    if (plan.wanderer) {
      const pool = WANDERERS.map((w) => w.key).filter((k) => !state.commanders.some((c) => c.key === k) && !state.wanderers.some((w) => w.key === k));
      loot.wanderer = pool.length ? pool[Math.floor(rng() * pool.length)] : null;
    }
  }
  loot.reveal = expOf(state).sectors.filter((x) => !x.known && (won && s.site === 'listening' ? true : x.parent === s.id)).map((x) => x.id);
  e.report = { day: state.day, sector: s.id, name: s.name, site: s.site, ring: s.ring, won, winChance: p, power: Math.round(power), strength, hazard: hz, lost, loot, commander: e.commander };
}

// Goods into the stores; what will not fit is traded at the base price.
function addGoods(state, goods) {
  const cap = storageCaps(state);
  for (const [g, n] of Object.entries(goods)) {
    if (g === 'credits') { state.stock.credits += n; continue; }
    const put = Math.min(n, Math.max(0, Math.floor((cap[g] ?? Infinity) - (state.stock[g] || 0))));
    state.stock[g] = (state.stock[g] || 0) + put;
    state.stock.credits += Math.floor((n - put) * (BASE_PRICE[g] || 1));
  }
}

function comeHome(state, e, ask) {
  const ex = expOf(state), s = sectorOf(state, e.sector), r = e.report;
  ex.away.splice(ex.away.indexOf(e), 1);
  for (const g of state.guardians) if (g.away === e.id) delete g.away;
  if (!r) {   // recalled before it arrived
    const rep = { day: state.day, sector: s.id, name: s.name, site: s.site, ring: s.ring, recalled: true, lost: [], loot: null };
    ex.log.push(rep);
    if (ask) { const p = ask('expedition', `Squadron home from ${s.name}`, `The squadron turned back before it reached ${s.name}. Nothing lost, nothing found.`); p.report = rep; p.speaker = 'sato'; }
    return;
  }
  const L = r.loot, got = [];
  s.visited = true;
  if (r.won) {
    if (!SITES[s.site].repeat) s.cleared = true;
    addGoods(state, L.goods);
    got.push(...Object.entries(L.goods).map(([k, n]) => `${n} ${k}`));
    if (L.research) { state.research.points += L.research; got.push(`${L.research} research points`); }
    if (L.pop) { state.pop += L.pop; got.push(`${L.pop} survivors who join the colony`); }
    for (const t of L.machines) { addGuardian(state, t, { hp: Math.max(1, Math.round(machineOf(state, t).hp / 2)) }); got.push(`a ${machineOf(state, t).name} (damaged, towed home)`); }
    if (L.blueprint) {
      const t = TECHS.find((x) => x.key === L.blueprint), rs = state.research;
      if (t && !rs.done.includes(t.key)) {
        rs.done.push(t.key); rs.progress[t.key] = t.cost; if (rs.focus === t.key) rs.focus = null;
        for (const k of t.unlocks) if (!state.unlocked.includes(k)) state.unlocked.push(k);
        got.push(`Galt blueprints: ${t.name}`);
      }
    }
    if (L.wanderer) { state.wanderers.push({ key: L.wanderer, until: state.day + V3.stay, asked: 0, loyalty: COMMANDER[L.wanderer]?.loyalty ?? 60 }); got.push(`${COMMANDER[L.wanderer]?.name} comes back with them and takes a room at the Lodge`); }
    if (L.heat) {
      state.raid.heat = Math.max(0, (state.raid.heat || 0) - L.heat);
      if (state.raid.next != null) state.raid.next += Math.round(EXP.raidSlow * 30);
      got.push(`the den is broken: heat −${L.heat}, raids come less often`);
    }
    if (L.story && STORY[L.story]) {
      const st = STORY[L.story];
      r.story = st;
      state.secrets?.journal?.push({ day: state.day, kind: 'expedition', ref: L.story, title: st.title, text: st.text });
    }
  }
  for (const id of L.reveal) { const x = sectorOf(state, id); if (x) x.known = true; }
  if (L.reveal.length) got.push(`${plural(L.reveal.length, 'new sector')} charted`);
  r.back = state.day; r.got = got;
  ex.log.push(r);
  if (ex.log.length > 30) ex.log.splice(0, ex.log.length - 30);
  const hz = r.hazard ? (r.hazard.avoided ? ` ${COMMANDER[r.hazard.by]?.name} took them through the ${r.hazard.name} untouched.` : ` The ${r.hazard.name} on the way in cost hull.`) : '';
  const fight = r.strength ? (r.won ? ` They won the fight (strength ${r.power} against ${r.strength}).` : ` They were beaten off (strength ${r.power} against ${r.strength}) and came home empty-handed.`) : '';
  const lost = r.lost.length ? ` Lost: ${r.lost.map((t) => machineOf(state, t).name).join(', ')}.` : '';
  const text = `The squadron is home from ${s.name} (${siteName(s)}).${hz}${fight}${lost}${got.length ? ` Brought home: ${got.join('; ')}.` : ''}${r.story ? ` ${r.story.text}` : ''}`;
  if (!ask) log(state, text);
  else { const p = ask('expedition', `Squadron home from ${s.name}`, text); p.report = r; p.speaker = 'sato'; }
}

export function expeditionsDay(state, { rng = stateRng(state), ask = null } = {}) {
  const ex = expOf(state);
  for (const e of [...ex.away]) {
    if (!e.report && !e.recalled && e.arrive != null && state.day >= e.arrive) arrive(state, e, rng);
    if (state.day >= e.back) comeHome(state, e, ask);
  }
}

// The chart's read-out: the sectors with what is known, the squadrons away (with days left and where they are).
export function expeditionStatus(state) {
  const ex = expOf(state);
  return {
    sectors: ex.sectors.map((s) => ({ ...s, siteName: s.known ? siteName(s) : null, strength: s.known ? strengthOf(state, s) : null, days: travelDays(s) })),
    away: ex.away.map((e) => {
      const s = sectorOf(state, e.sector), out = e.arrive != null && state.day < e.arrive;
      const pos = out ? (state.day - e.leave) / (e.arrive - e.leave) : e.recalled && !e.report ? (e.peak || 0) * (e.back - state.day) / Math.max(1, e.back - e.turned)
        : (e.back - state.day) / Math.max(1, e.back - (e.arrive ?? e.leave));
      return { ...e, name: s.name, ring: s.ring, angle: s.angle, outbound: out, left: Math.max(0, e.back - state.day), pos: Math.max(0, Math.min(1, pos)) };
    }),
    log: ex.log.slice(), dens: densCleared(state),
  };
}
