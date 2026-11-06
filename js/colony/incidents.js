// Earthlight Space Colony Rebuild, version 8 (docs/COLONY-V8.md): incidents you can prepare for.
// Pure: no DOM. The sim calls incidentsDay() each day (like expeditionsDay and victoryDay); rules.js re-exports
// the rest for the interface and the advisor.
//   * Never bad luck out of nowhere: every incident is announced `warn` days ahead (an 'incidentwarn' event) with
//     exactly what helps, the advisor repeats it with a Show-me fix, then the outcome comes (an 'incident' event).
//   * Gentle and occasional: none before day 60 (75 on Easy), then one every 55–85 days (90–130 on Easy). Damage
//     is a few days of repairs, never a lost building, never deaths. Two of the six are good news.
//   * Their own dice (seeded from the colony's seed and the day), so turning incidents on or off never changes
//     the raids, transports or anything else the colony's main generator decides.
//   * Settings › Incidents (state.options.incidents, like raids): off, nothing is scheduled.
// state.incidents = { next, coming: { kind, day, target? } | null, last, count, flare: { until, mult } | null,
//                     sick: { until, share } | null, log: [{ kind, day, ok }] }
import { BUILDING } from './data/buildings.js';
import { T } from './data/terrain.js';
import { diffOf } from './difficulty.js';
import { spec, covers, storageCaps, HOME_KEYS, deckOf } from './rules.js';
import { landmarkWarn } from './landmarks.js';

export const INCIDENT = {
  first: { easy: 75, normal: 60 },              // no incident before this day
  every: { easy: [90, 130], normal: [55, 85] }, // days between incidents
  warn: 5, warnTech: 2,                         // days of warning; Hazard Forecasting adds 2 (Sato's Watch 3 more)
  meteor: { hits: { easy: 2, normal: 3 }, days: { easy: 2, normal: 3 } },
  flare: { days: { easy: 2, normal: 3 }, mult: 0.5, sheltered: 0.75, happy: -4, keys: ['solar', 'sunmirror'] },
  burst: { days: { easy: 3, normal: 5 }, clamped: 1 },
  outbreak: { pop: 150, contained: 0.8, sick: 0.15, days: 6, happy: -8, moodDays: 10 },
  caravan: { price: 1.5, parts: 30, goods: ['ore', 'food', 'alloy', 'helium', 'parts'] },
  comet: { water: 800, perHarvester: 400 },
};
const dk = (state) => (state.difficulty === 'easy' ? 'easy' : 'normal');
const working = (b) => b.build === 0 && !b.off && !(b.down > 0) && !(b.damaged > 0);
const has = (state, key) => state.buildings.some((b) => b.key === key && working(b));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fixBuild = (state, key, tech) => (state.unlocked.includes(key) ? { build: key } : { research: tech });
const canHave = (state, key) => (state.unlocked.includes(key) ? '' : ` (research ${BUILDING[key]?.tech === 'shields' ? 'Shield Pylons' : BUILDING[key]?.tech === 'medicine' ? 'Medicine' : BUILDING[key]?.tech === 'safety' ? 'Safety Posts' : 'Hazard Forecasting'} first)`);

// The incident's own dice: a mulberry32 seeded from the colony's seed and the day.
function rngFor(state, salt = 0) {
  let h = 2166136261;
  for (const c of `${state.seed}:${state.day}:${salt}:incident`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const between = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));

// Buildings out on the hull or in open space: what a meteor shower can hit.
function exposed(state) {
  const { w, t } = state.map;
  return state.buildings.filter((b) => b.build === 0 && deckOf(b) === 'main' && b.key !== 'road' && b.key !== 'seal' && !BUILDING[b.key]?.fixed
    && (() => { const ti = t[b.y * w + b.x]; return ti === T.HULL || BUILDING[b.key].zone === 'space' || BUILDING[b.key].zone === 'hull'; })());
}
const shielded = (state, b) => state.buildings.some((p) => p.key === 'shieldpylon' && working(p) && covers(p, b));
const WATER_MAKERS = (state) => state.buildings.filter((b) => b.build === 0 && !BUILDING[b.key]?.fixed && (spec(b).makes?.water || 0) > 0)
  .sort((a, b) => (spec(b).makes.water - spec(a).makes.water) || a.id - b.id);
const safetyAt = (state, b) => state.buildings.some((p) => p.key === 'safetypost' && working(p) && covers(p, b));
function clinicCover(state) {
  const homes = state.buildings.filter((b) => HOME_KEYS.has(b.key) && working(b) && (spec(b).housing || 0) > 0);
  const total = homes.reduce((t, h) => t + spec(h).housing, 0);
  if (!total) return 1;
  const clinics = state.buildings.filter((b) => b.key === 'clinic' && b.mode !== 'triage' && working(b));
  return homes.reduce((t, h) => t + (clinics.some((c) => covers(c, h)) ? spec(h).housing : 0), 0) / total;
}
const freeWater = (state) => Math.max(0, (storageCaps(state).water || 0) - (state.stock.water || 0));

// The six incidents. eligible: whether it can happen now; prep: how ready Eden is right now ({ ok, text });
// warn: Sato's or Ruess's warning (what helps, exactly); fix: the Show-me; resolve: what happened.
export const INCIDENTS = {
  meteor: {
    name: 'Meteor shower', speaker: 'sato', good: false,
    eligible: (s) => exposed(s).length > 0,
    prep: (s) => { const e = exposed(s), safe = e.filter((b) => shielded(s, b)).length; return { ok: safe === e.length, text: `${safe} of ${plural(e.length, 'hull and space building')} under a Shield Pylon` }; },
    warn: (s, days) => `Governor, a meteor shower crosses our orbit in ${plural(days, 'day')}. Buildings out on the hull and in open space are exposed: up to ${INCIDENT.meteor.hits[dk(s)]} of them could be knocked out for a few days. `
      + `Shield Pylons protect every building within 8 tiles${canHave(s, 'shieldpylon')}; the rest are fine once the repair crews have been round.`,
    fix: (s) => fixBuild(s, 'shieldpylon', 'shields'),
    resolve(s, rng) {
      const e = exposed(s), open = e.filter((b) => !shielded(s, b) && !(b.damaged > 0)), saved = e.length - open.length, n = Math.min(open.length, INCIDENT.meteor.hits[dk(s)]);
      const hit = [];
      for (let k = 0; k < n; k++) { const b = open.splice(Math.floor(rng() * open.length), 1)[0]; b.damaged = INCIDENT.meteor.days[dk(s)]; hit.push(BUILDING[b.key].name); }
      return hit.length
        ? { ok: false, title: 'Meteor shower', text: `The meteor shower has passed. It knocked out ${hit.join(', ')} for ${INCIDENT.meteor.days[dk(s)]} days of repairs${saved ? `; the Shield Pylons kept ${plural(saved, 'building')} safe` : ''}. More Shield Pylons on the hull would have stopped it.` }
        : { ok: true, title: 'Meteor shower', text: `The meteor shower has passed${saved ? `: the Shield Pylons turned every stone away from ${plural(saved, 'building')}` : ' without a scratch'}. Well prepared, Governor.` };
    },
  },
  flare: {
    name: 'Solar flare', speaker: 'ruess', good: false,
    eligible: (s) => s.buildings.some((b) => INCIDENT.flare.keys.includes(b.key) && b.build === 0),
    prep: (s) => { const sh = has(s, 'flareshelter'), cap = storageCaps(s).power || 0; return { ok: sh, text: `${sh ? 'a Flare Shelter stands' : 'no Flare Shelter'}, ${Math.round(s.battery || 0)} of ${Math.round(cap)} power stored` }; },
    warn: (s, days) => `A solar flare is coming in ${plural(days, 'day')}. For ${INCIDENT.flare.days[dk(s)]} days Solar Arrays and Sun Mirrors make half their power, and people worry. `
      + `Charged Battery Banks carry the shortfall; a Flare Shelter${canHave(s, 'flareshelter')} keeps three quarters of the solar power and everyone calm. Other power (fusion, induction, geothermal) is not affected.`,
    fix: (s) => fixBuild(s, 'flareshelter', 'forecasting'),
    resolve(s) {
      const sh = has(s, 'flareshelter'), days = INCIDENT.flare.days[dk(s)];
      s.incidents.flare = { until: s.day + days - 1, mult: sh ? INCIDENT.flare.sheltered : INCIDENT.flare.mult, sheltered: sh };
      return { ok: sh, title: 'Solar flare', text: sh
        ? `The flare is here. The Flare Shelter's switchyard holds: solar power is down only a quarter for ${days} days, and nobody panics.`
        : `The flare is here: Solar Arrays and Sun Mirrors make half their power for ${days} days, and people are uneasy. Batteries carry what they can. A Flare Shelter would keep three quarters of it.` };
    },
  },
  burst: {
    name: 'Burst main', speaker: 'ruess', good: false,
    eligible: (s) => WATER_MAKERS(s).length > 0,
    target: (s) => WATER_MAKERS(s)[0]?.id ?? null,
    prep: (s, c) => { const b = s.buildings.find((x) => x.id === c?.target); return { ok: !!b && safetyAt(s, b), text: b ? (safetyAt(s, b) ? `a Safety Post covers the ${BUILDING[b.key].name}` : `no Safety Post covers the ${BUILDING[b.key].name}`) : 'the main is gone' }; },
    warn: (s, days, c) => { const b = s.buildings.find((x) => x.id === c.target), nm = b ? BUILDING[b.key].name : 'water plant';
      return `The main feeding our ${nm} is cracking: it will burst in ${plural(days, 'day')} and the ${nm} will be down ${INCIDENT.burst.days[dk(s)]} days until a crew mends it. `
        + `A Safety Post within 10 tiles of it${canHave(s, 'safetypost')} clamps the break (down 1 day instead). Water in store, Water Cisterns or Storage Depots on water, tides the colony over.`; },
    fix: (s, c) => { const b = s.buildings.find((x) => x.id === c?.target); return s.unlocked.includes('safetypost') ? { build: 'safetypost', ...(b?.deck ? { deck: b.deck } : {}) } : b ? { tile: { x: b.x, y: b.y, ...(b.deck ? { deck: b.deck } : {}) } } : { research: 'safety' }; },
    resolve(s, rng, c) {
      const b = s.buildings.find((x) => x.id === c.target && x.build === 0);
      if (!b) return { ok: true, title: 'Burst main', text: 'The cracked main was taken out of use before it burst: no harm done.' };
      const clamp = safetyAt(s, b), days = clamp ? INCIDENT.burst.clamped : INCIDENT.burst.days[dk(s)];
      b.damaged = Math.max(b.damaged || 0, days);
      return { ok: clamp, title: 'Burst main', text: clamp
        ? `The main burst, and the Safety Post's wardens clamped it within the hour: the ${BUILDING[b.key].name} is down for a day.`
        : `The main burst: the ${BUILDING[b.key].name} is down for ${days} days until a crew mends it. A Safety Post nearby would have clamped it within the hour.` };
    },
  },
  outbreak: {
    name: 'Fever outbreak', speaker: 'ruess', good: false,
    eligible: (s) => s.pop >= INCIDENT.outbreak.pop,
    prep: (s) => { const c = clinicCover(s); return { ok: c >= INCIDENT.outbreak.contained, text: `Clinics cover ${Math.round(c * 100)}% of homes (${Math.round(INCIDENT.outbreak.contained * 100)}% contains it)` }; },
    warn: (s, days) => `A fever came in with the last ships: it will spread through the homes in about ${plural(days, 'day')}. `
      + `If Clinics${canHave(s, 'clinic')} cover at least ${Math.round(INCIDENT.outbreak.contained * 100)}% of the homes it is contained. Otherwise some colonists are off work for ${INCIDENT.outbreak.days} days and the colony is unhappy for a while. Nobody will die of it.`,
    fix: (s) => fixBuild(s, 'clinic', 'medicine'),
    resolve(s) {
      const c = clinicCover(s), O = INCIDENT.outbreak;
      if (c >= O.contained) return { ok: true, title: 'Fever outbreak', text: `The fever came, and the Clinics caught every case early (${Math.round(c * 100)}% of homes covered). It is over.` };
      const share = O.sick * (1 - c), mood = Math.round(O.happy * (1 - c));
      s.incidents.sick = { until: s.day + O.days - 1, share };
      if (mood) { s.raid ??= {}; (s.raid.moods ??= []).push({ label: 'Fever', value: mood, day: s.day, days: O.moodDays }); }
      return { ok: false, title: 'Fever outbreak', text: `The fever is spreading: ${Math.round(share * 100)}% of the colonists are off work for ${O.days} days, and happiness ${mood} for a while. Clinics covered ${Math.round(c * 100)}% of homes; more Clinics would have contained it.` };
    },
  },
  caravan: {
    name: 'Trade caravan', speaker: 'sato', good: true,
    eligible: (s) => s.buildings.some((b) => b.key === 'dock' && b.build === 0),
    prep: (s) => { const v = ['ore', 'food', 'alloy'].map((g) => Math.floor(s.stock[g] || 0)); return { ok: true, text: `in store: ${v[0]} ore, ${v[1]} food, ${v[2]} alloy` }; },
    warn: (s, days) => `Good news for once: a wanderers' trade caravan will dock in ${plural(days, 'day')}. For a few days ore, food, parts, alloy and helium-3 sell at half as much again at the Market. Put spare goods by to sell, and keep the Dock working.`,
    fix: () => ({ market: true }),
    resolve(s) {
      for (const g of INCIDENT.caravan.goods) s.market[g] = Math.max(s.market[g] ?? 1, INCIDENT.caravan.price);
      s.stock.parts += INCIDENT.caravan.parts;
      return { ok: true, title: 'Trade caravan', text: `The caravan has docked: ore, food, parts, alloy and helium-3 sell at half as much again at the Market (prices settle back over a week or two). Their quartermaster left ${INCIDENT.caravan.parts} parts as a greeting.` };
    },
  },
  comet: {
    name: 'Comet pass', speaker: 'sato', good: true,
    eligible: () => true,
    prep: (s) => ({ ok: true, text: `room for ${Math.floor(freeWater(s))} more water` }),
    warn: (s, days) => `A comet passes close in ${plural(days, 'day')}: we can catch ${INCIDENT.comet.water} water from its tail, ${INCIDENT.comet.perHarvester} more for every working Ice Harvester. Only what the stores can hold: Water Cisterns, Storage Depots set to water, or a Warehouse.`,
    fix: (s) => ({ build: s.unlocked.includes('cistern') && s.chambers.some((c) => c.deck === 'lower' && c.status === 'open') ? 'cistern' : 'depot' }),
    resolve(s) {
      const want = INCIDENT.comet.water + INCIDENT.comet.perHarvester * s.buildings.filter((b) => b.key === 'iceharvester' && working(b)).length;
      const got = Math.floor(Math.min(want, freeWater(s)));
      s.stock.water += got;
      return { ok: true, title: 'Comet pass', text: got >= want ? `The comet swept by and we caught ${got} water from its tail.` : `The comet swept by: we caught ${got} of the ${want} water on offer (the stores were full). More water storage would have caught it all.` };
    },
  },
};
export const INCIDENT_KINDS = Object.keys(INCIDENTS);

export const incidentsOn = (state) => state.options?.incidents !== false;
export function ensureIncidents(state) {
  state.incidents ??= { next: null, coming: null, last: null, count: 0, flare: null, sick: null, log: [] };
  const n = state.incidents;
  n.next ??= null; n.coming ??= null; n.last ??= null; n.count ??= 0; n.flare ??= null; n.sick ??= null; n.log ??= [];
  return n;
}
// Days of warning: 5, +2 with Hazard Forecasting, +3 with Sato's Watch.
export const incidentLead = (state) => INCIDENT.warn + (state.research?.done?.includes('forecasting') ? INCIDENT.warnTech : 0) + landmarkWarn(state);
// The solar flare's power factor for a building (rules.powerOf), and the share of colonists off sick (sim.js labour).
export function flareMult(state, key) {
  const f = state.incidents?.flare;
  return f && state.day <= f.until && INCIDENT.flare.keys.includes(key) ? f.mult : 1;
}
export const sickShare = (state) => { const s = state.incidents?.sick; return s && state.day <= s.until ? s.share : 0; };
// Happiness while a flare is on and nobody shelters: [{ label, value }].
export function incidentHappy(state) {
  const f = state.incidents?.flare;
  return f && state.day <= f.until && !f.sheltered ? [{ label: 'Solar flare', value: INCIDENT.flare.happy }] : [];
}

// The incident on its way, for the advisor and the interface: null, or { kind, name, days, good, ready, text, fix }.
export function incidentStatus(state) {
  const c = ensureIncidents(state).coming;
  if (!c || !INCIDENTS[c.kind]) return null;
  const k = INCIDENTS[c.kind], p = k.prep(state, c);
  return { kind: c.kind, name: k.name, days: Math.max(0, c.day - state.day), good: k.good, ready: p.ok, text: p.text, fix: k.fix(state, c) };
}

// Incidents on or off (Settings). Off: the one on its way is called off, and nothing else is scheduled.
export function setIncidents(state, on) {
  state.options ??= {};
  state.options.incidents = !!on;
  const n = ensureIncidents(state);
  if (!on) {
    n.coming = null; n.next = null; n.flare = null; n.sick = null;
    state.pending = state.pending.filter((p) => p.kind !== 'incidentwarn');
  }
  return { ok: true, msg: on ? 'Incidents on: now and then a meteor shower, a flare, a burst main or a fever, each announced days ahead with what helps.' : 'Incidents off: no meteor showers, flares, bursts or fevers until you turn them on again.' };
}

// Each day (sim.js, before labour and power): a flare or fever wearing off, an incident arriving, the next one
// sighted. `say` and `ask` as the sim's.
export function incidentsDay(state, { say, ask }) {
  const n = ensureIncidents(state);
  if (n.flare && state.day > n.flare.until) { n.flare = null; say('incident', 'The solar flare is over: solar power is back to full.'); }
  if (n.sick && state.day > n.sick.until) { n.sick = null; say('incident', 'The fever has run its course: everyone is back at work.'); }
  if (!incidentsOn(state) || state.flags?.lost) return;
  const d = dk(state);
  if (n.coming) {
    if (state.day < n.coming.day) return;
    const c = n.coming, k = INCIDENTS[c.kind];
    n.coming = null;
    state.pending = state.pending.filter((p) => p.kind !== 'incidentwarn');   // the warning has served its turn
    n.next = state.day + between(rngFor(state, 1), INCIDENT.every[d]);
    if (!k) return;
    const r = k.resolve(state, rngFor(state, 2), c);
    n.count++; n.last = c.kind;
    n.log.push({ kind: c.kind, day: state.day, ok: r.ok });
    if (n.log.length > 20) n.log.splice(0, n.log.length - 20);
    const p = ask('incident', r.title, r.text);
    p.speaker = k.speaker; p.incident = c.kind; p.tone = k.good || r.ok ? 'good' : 'bad';
    return;
  }
  const rng = rngFor(state);
  n.next ??= INCIDENT.first[d] + Math.floor(rng() * 20);
  const lead = incidentLead(state);
  if (state.day < Math.max(INCIDENT.first[d] - lead, n.next - lead)) return;
  const pool = INCIDENT_KINDS.filter((k) => k !== n.last && INCIDENTS[k].eligible(state));
  if (!pool.length) { n.next = state.day + 10 + lead; return; }
  const kind = pool[Math.floor(rng() * pool.length)], k = INCIDENTS[kind];
  const c = n.coming = { kind, day: state.day + lead };
  if (k.target) c.target = k.target(state);
  const p = ask('incidentwarn', `${k.good ? 'Coming' : 'Warning'}: ${k.name.toLowerCase()}`, k.warn(state, lead, c));
  p.speaker = k.speaker; p.incident = kind; p.tone = k.good ? 'good' : 'warn'; p.show = k.fix(state, c);
}
