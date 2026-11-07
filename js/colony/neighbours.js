// Earthlight Space Colony Rebuild, version 10 (docs/COLONY-V10.md): Eden's neighbours.
// Pure: no DOM. Three settlements beyond the hull: the Union remnant, the Galt remnant and Moraine's Ashfall Cartel. Each
// has a mood toward Eden from −100 to 100 (NEIGHBOURS[k].start at first). What moves it (read from the colony's own
// counters each day, so nothing else needs to call in):
//   trade    Market sales: Union and Galt +1 a NB.tradeStep credits sold (at most +2 a day)
//   convoys  every relief load sent to Earth: Union and Galt +2
//   petitions granted: Union and Galt +1
//   raids    beating off a band: its people −6 (the Cartel) or, for deserters, their old side +4; the others +2.
//            Paying tribute: the raiders' people +3, the others −2
//   expeditions  a squadron at an outpost: its side +6; at a Galt bunker: Galt +4; clearing a den: its people −25
//            (the Cartel) or the deserters' old side +6, and the others +4
//   offers   answered (below)
//   drift    1 point every NB.driftEvery days back toward the start
// Offers and requests come now and then on their own dice (seeded like incidents.js: the colony's main generator is
// never touched): the first from day NB.first (Easy later), then every NB.every days, and only with a finished dock:
//   a trade deal (goods at a good price), a request for aid (goods; +10, or −4 refused), a warning about a raider
//   base (its sector found on the Star chart), a gift (when friendly), or the Cartel's "protection" (pay +8, refuse −5).
// Mood unlocks perks (PERKS) at Friendly (30) and Allied (60); at Hostile (−40 or less) its raider base (the Cartel's
// den, or the deserters' den for their old side) grows bold: its fleet regrows twice as fast and it notices Eden at half
// its population. Settings › Neighbours (state.options.neighbours) off: no offers, moods hold, no perks or boldness.
// state.neighbours = { moods: { union, galt, cartel }, perks: { key: day }, next, count, log: [{ day, who, text, delta }],
//                      seen: { sold, loads, granted, raids, exp } }
import { WANDERERS, COMMANDER } from './data/commanders.js';
import { MACHINES } from './data/machines.js';
import { addGuardian, noticeEden, BASE } from './rules.js';   // used inside functions only (rules.js imports this module back)

export const NB = {
  start: 30, first: { easy: 70, normal: 50 }, every: { easy: [55, 90], normal: [40, 70] },
  tradeStep: 1000, tradeMax: 2, driftEvery: 5,
  friendly: 30, allied: 60, hostile: -40,
  logMax: 12,
};
export const NEIGHBOURS = {
  union: { name: 'the Union remnant', short: 'Union', start: 10, speaker: 'sato', color: '#6fb6ff', faction: 'union',
    text: 'What is left of the Union fleet and its colonists: disciplined, short of food, and proud. Their deserters raid from a den on the chart.' },
  galt: { name: 'the Galt remnant', short: 'Galt', start: 0, speaker: 'ruess', color: '#ffb070', faction: 'galt',
    text: 'The Galt engineers who outlasted the war in their bunkers: clever, wary of everyone, rich in machines.' },
  cartel: { name: 'Moraine\'s Ashfall Cartel', short: 'Cartel', start: -20, speaker: 'general', color: '#ff6a5a', faction: 'cartel',
    text: 'Moraine\'s pirates and smugglers. They raid from their den, but a deal is a deal to them, and they keep the black market running.' },
};
export const NEIGHBOUR_KEYS = Object.keys(NEIGHBOURS);
// Perks: at `at` mood or more. once: given one time (on the first day it is reached); else lasting while the mood holds.
export const PERKS = [
  { key: 'union-trade', who: 'union', at: NB.friendly, name: 'Union buyers', text: 'Goods sold at the Market fetch 10% more.' },
  { key: 'union-wanderer', who: 'union', at: NB.allied, once: true, name: 'A Union officer', text: 'A Union officer comes to Eden looking for work: a wanderer at the Lodge (a free invitation).' },
  { key: 'galt-trade', who: 'galt', at: NB.friendly, name: 'Galt traders', text: 'Imports at the dock cost 15% less.' },
  { key: 'galt-machine', who: 'galt', at: NB.allied, once: true, name: 'A Galt machine', text: 'The Galt engineers send a machine for Eden\'s guard.' },
  { key: 'cartel-tribute', who: 'cartel', at: NB.friendly, name: 'Cartel manners', text: 'Raiders ask half the tribute.' },
  { key: 'cartel-truce', who: 'cartel', at: NB.allied, name: 'The Cartel\'s truce', text: 'The Cartel\'s den sends no raids while the truce holds.' },
];
const dk = (state) => (state.difficulty === 'easy' ? 'easy' : 'normal');
const clamp = (v) => Math.max(-100, Math.min(100, Math.round(v)));
export const neighboursOn = (state) => state.options?.neighbours !== false;

// Their own dice: a mulberry32 seeded from the colony's seed and the day (like incidents.js).
function rngFor(state, salt = 0) {
  let h = 2166136261;
  for (const c of `${state.seed}:${state.day}:${salt}:neighbours`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const between = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));

const counters = (state) => ({
  sold: state.flags?.sold || 0, loads: state.relief?.loads || 0, granted: state.petitions?.granted || 0,
  raids: state.raid?.count || 0, exp: state.expeditions?.log?.length || 0,
});
export function ensureNeighbours(state) {
  if (!state.neighbours) {
    state.neighbours = { moods: Object.fromEntries(NEIGHBOUR_KEYS.map((k) => [k, NEIGHBOURS[k].start])), perks: {}, next: null, count: 0, log: [], seen: counters(state) };
  }
  const n = state.neighbours;
  n.moods ??= {}; for (const k of NEIGHBOUR_KEYS) n.moods[k] ??= NEIGHBOURS[k].start;
  n.perks ??= {}; n.log ??= []; n.count ??= 0; n.seen ??= counters(state);
  if (n.next === undefined) n.next = null;
  return n;
}
export const moodOf = (state, who) => state.neighbours?.moods?.[who] ?? NEIGHBOURS[who]?.start ?? 0;
export const standing = (m) => (m >= NB.allied ? 'Allied' : m >= NB.friendly ? 'Friendly' : m > NB.hostile / 2 ? 'Neutral' : m > NB.hostile ? 'Wary' : 'Hostile');
const perkOn = (state, key) => {
  if (!neighboursOn(state)) return false;
  const p = PERKS.find((x) => x.key === key);
  return !!p && moodOf(state, p.who) >= p.at;
};
// Mood changes, logged (the Neighbours tab shows the last few).
export function shiftMood(state, who, delta, why) {
  const n = ensureNeighbours(state);
  if (!delta || !NEIGHBOURS[who] || !neighboursOn(state)) return 0;
  const was = n.moods[who];
  n.moods[who] = clamp(was + delta);
  const d = n.moods[who] - was;
  if (d && why) { n.log.push({ day: state.day || 0, who, text: why, delta: d }); if (n.log.length > NB.logMax) n.log.splice(0, n.log.length - NB.logMax); }
  return d;
}

// ---------------------------------------------------------------- perks and boldness (rules.js reads these)
export const neighbourSell = (state) => (perkOn(state, 'union-trade') ? 1.1 : 1);
export const neighbourBuy = (state) => (perkOn(state, 'galt-trade') ? 0.85 : 1);
export const neighbourTribute = (state) => (perkOn(state, 'cartel-tribute') ? 0.5 : 1);
// The neighbour a raider base belongs to: the Cartel's den, or the deserters' den for its faction's old side.
export const baseNeighbour = (base) => (base?.id === 'cartel' ? 'cartel' : base?.id === 'deserters' && NEIGHBOURS[base.faction] ? base.faction : null);
export const neighbourTruce = (state, base) => baseNeighbour(base) === 'cartel' && perkOn(state, 'cartel-truce');
export const neighbourBold = (state, base) => { const w = baseNeighbour(base); return !!w && neighboursOn(state) && moodOf(state, w) <= NB.hostile; };

// ---------------------------------------------------------------- the day's reading of the colony's counters
function readCounters(state) {
  const n = ensureNeighbours(state), was = n.seen, now = counters(state);
  n.seen = now;
  const sold = Math.max(0, now.sold - was.sold);
  if (sold >= NB.tradeStep) { const d = Math.min(NB.tradeMax, Math.floor(sold / NB.tradeStep)); shiftMood(state, 'union', d, `Trade at Eden's market (${Math.round(sold)} credits)`); shiftMood(state, 'galt', d, `Trade at Eden's market (${Math.round(sold)} credits)`); }
  else n.seen.sold = was.sold;   // small sales add up over days
  const loads = Math.max(0, now.loads - was.loads);
  if (loads) for (const w of ['union', 'galt']) shiftMood(state, w, 2 * loads, `Relief for Earth (${loads} load${loads === 1 ? '' : 's'})`);
  const granted = Math.max(0, now.granted - was.granted);
  if (granted) for (const w of ['union', 'galt']) shiftMood(state, w, granted, 'Eden keeps its promises (a petition granted)');
  if (now.raids > was.raids && state.raid?.last) {
    const r = state.raid.last, who = r.faction === 'cartel' ? 'cartel' : NEIGHBOURS[r.faction] ? r.faction : null;
    if (r.tribute) { if (who) shiftMood(state, who, 3, 'Eden paid their raiders off'); for (const w of NEIGHBOUR_KEYS) if (w !== who) shiftMood(state, w, -2, 'Eden paid tribute to raiders'); }
    else if (r.won) {
      if (who === 'cartel') shiftMood(state, 'cartel', -6, 'Eden beat off a Cartel band');
      else if (who) shiftMood(state, who, 4, 'Eden beat off their deserters');
      for (const w of NEIGHBOUR_KEYS) if (w !== who && w !== 'cartel') shiftMood(state, w, 2, 'Eden stands up to raiders');
    }
  }
  const log = state.expeditions?.log || [];
  for (const rep of log.slice(was.exp, now.exp)) {
    if (!rep || rep.won === false) continue;
    const sec = state.expeditions?.sectors?.find((x) => x.id === rep.sector);
    if (rep.site === 'outpost' && NEIGHBOURS[sec?.faction]) shiftMood(state, sec.faction, 6, `A squadron called at a ${NEIGHBOURS[sec.faction].short} outpost`);
    else if (rep.site === 'bunker') shiftMood(state, 'galt', 4, 'Eden\'s squadron opened a Galt bunker and brought its people out');
    else if (rep.site === 'den') {
      const base = (state.raid?.bases || []).find((b) => b.sector === rep.sector), who = baseNeighbour(base);
      if (who === 'cartel') shiftMood(state, 'cartel', -25, 'Eden cleared the Cartel\'s den');
      else if (who) shiftMood(state, who, 6, 'Eden cleared their deserters\' den');
      for (const w of NEIGHBOUR_KEYS) if (w !== who && w !== 'cartel') shiftMood(state, w, 4, 'Eden cleared a pirate den');
    }
  }
}

// ---------------------------------------------------------------- offers and requests
const GOOD = { food: 'food', water: 'water', parts: 'parts', alloy: 'alloy', helium: 'helium-3', credits: 'credits' };
const has = (state, g, n) => (state.stock?.[g] || 0) >= n;
const docked = (state) => (state.buildings || []).some((b) => b.key === 'dock' && b.build === 0);
// The offers that can come now: [{ kind, who, title, text, choices, deal }].
function offersNow(state, rng) {
  const out = [], m = (w) => moodOf(state, w), pop = state.pop || 0, scale = Math.max(1, Math.min(5, Math.round(pop / 400)));
  const price = (g) => Math.max(1, Math.round((({ food: 3, water: 1, parts: 10, alloy: 12, helium: 30 })[g] || 3) * 0.7));
  // trade deals: goods at 70% of their base price
  for (const [w, g, q] of [['union', 'food', 150], ['galt', 'parts', 40], ['galt', 'alloy', 30], ['cartel', 'helium', 15]]) {
    if (m(w) < -20 || (g === 'alloy' && !state.research?.done?.includes('smelting')) || (g === 'helium' && !state.research?.done?.includes('plasma'))) continue;
    const qty = q * scale, cost = qty * price(g);
    out.push({ kind: 'trade', who: w, title: `A trade deal from ${NEIGHBOURS[w].short}`, deal: { get: { [g]: qty }, pay: { credits: cost }, yes: 3, no: 0 },
      text: `${cap(NEIGHBOURS[w].name)} offer ${qty} ${GOOD[g]} for ${cost} credits, well under the traders' price. Accepting warms them a little.` });
  }
  // requests for aid: Union and Galt, when Eden can spare it
  for (const [w, g, q] of [['union', 'food', 120], ['galt', 'water', 150], ['union', 'parts', 30]]) {
    const qty = q * scale;
    if (m(w) < -60 || !has(state, g, qty * 2)) continue;
    out.push({ kind: 'aid', who: w, title: `${NEIGHBOURS[w].short} asks for help`, deal: { pay: { [g]: qty }, yes: 10, no: -4 },
      text: `${cap(NEIGHBOURS[w].name)} ask for ${qty} ${GOOD[g]}: a hard season out there. Eden has ${Math.floor(state.stock[g])}. They will remember either way.` });
  }
  // a warning about a raider base not yet on the chart (or its strength, if it is)
  for (const w of ['union', 'galt']) {
    if (m(w) < 10) continue;
    const base = (state.raid?.bases || []).find((b) => !b.destroyed && (b.id === 'cartel' || b.id === 'deserters'));
    if (!base) continue;
    out.push({ kind: 'warning', who: w, base: base.id, title: `A warning from ${NEIGHBOURS[w].short}`, deal: { yes: 0, no: 0, ok: true },
      text: `${cap(NEIGHBOURS[w].name)} send word about ${base.id === 'cartel' ? 'the Ashfall Cartel\'s den' : 'the deserters\' den'}: ${base.fleet} machines at home, ${base.aware ? 'and they know about Eden' : 'and they have not noticed Eden yet'}. It is marked on the Star chart.` });
  }
  // gifts, when friendly
  for (const [w, g, q] of [['union', 'food', 200], ['galt', 'parts', 60], ['cartel', 'credits', 500]]) {
    if (m(w) < NB.friendly) continue;
    out.push({ kind: 'gift', who: w, title: `A gift from ${NEIGHBOURS[w].short}`, deal: { get: { [g]: q * scale }, yes: 0, no: 0, ok: true },
      text: `${cap(NEIGHBOURS[w].name)} send ${q * scale} ${GOOD[g]} as a token of friendship. No strings.` });
  }
  // the Cartel's protection
  if (m('cartel') > -70 && pop >= 300) {
    const cost = 150 * scale;
    out.push({ kind: 'protection', who: 'cartel', title: 'Moraine\'s offer', deal: { pay: { credits: cost }, yes: 8, no: -5 },
      text: `Moraine's people ask ${cost} credits for "protection". It buys goodwill with the Cartel, which keeps its den quieter; refusing sours them a little.` });
  }
  return out;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// Answer an offer (rules.answer calls this for a 'neighbour' pending). choice: 'yes' | 'no' | 'ok'.
export function answerNeighbour(state, p, choice) {
  const d = p.deal || {}, who = p.who, st = state.stock;
  if (choice === 'yes' || (d.ok && choice === 'ok')) {
    for (const [g, n] of Object.entries(d.pay || {})) if ((st[g] || 0) < n) return { ok: false, msg: `Eden has only ${Math.floor(st[g] || 0)} ${GOOD[g] || g}: it cannot give ${n}.` };
    for (const [g, n] of Object.entries(d.pay || {})) st[g] -= n;
    for (const [g, n] of Object.entries(d.get || {})) st[g] = (st[g] || 0) + n;
    if (p.offer === 'warning') reveal(state, p.base);
    shiftMood(state, who, d.yes || 0, p.offer === 'aid' ? 'Eden sent help' : p.offer === 'trade' ? 'A trade deal kept' : p.offer === 'protection' ? 'Eden paid for "protection"' : '');
    return { ok: true, msg: `${p.title}: ${d.ok ? 'noted' : 'accepted'}.` };
  }
  shiftMood(state, who, d.no || 0, p.offer === 'aid' ? 'Eden refused help' : p.offer === 'protection' ? 'Eden refused Moraine' : '');
  return { ok: true, msg: `${p.title}: declined.` };
}
function reveal(state, baseId) {
  const b = (state.raid?.bases || []).find((x) => x.id === baseId), sec = b && state.expeditions?.sectors?.find((x) => x.id === b.sector);
  if (sec) sec.known = true;
}

// Each day (sim.js, late): moods read from the colony, drift, perks given, boldness, and now and then an offer.
export function neighboursDay(state, { say, ask }) {
  const n = ensureNeighbours(state);
  if (!neighboursOn(state)) { n.seen = counters(state); return; }
  readCounters(state);
  if ((state.day || 0) % NB.driftEvery === 0) for (const w of NEIGHBOUR_KEYS) { const m = n.moods[w], s = NEIGHBOURS[w].start; if (m !== s) n.moods[w] = m + Math.sign(s - m); }
  // perks given once
  for (const p of PERKS) {
    if (!p.once || n.perks[p.key] != null || moodOf(state, p.who) < p.at) continue;
    n.perks[p.key] = state.day;
    if (p.key === 'union-wanderer') {
      const pool = WANDERERS.map((w) => w.key).filter((k) => !COMMANDER[k]?.general && !state.commanders?.some((c) => c.key === k) && !state.wanderers?.some((w) => w.key === k));
      if (pool.length) {
        const key = pool[Math.floor(rngFor(state, 7)() * pool.length)];
        state.wanderers.push({ key, until: state.day + 40, asked: 0, loyalty: 70 });
        say('neighbour', `${cap(NEIGHBOURS.union.name)} send ${COMMANDER[key]?.name || key} to Eden: a wanderer at the Lodge for 40 days (Defence › Commanders).`, true);
      }
    } else if (p.key === 'galt-machine') {
      const tier = (state.research?.done || []).includes('heavyworks') ? 3 : 2, pick = MACHINES.filter((x) => x.at === 'arsenal' && x.tier === tier && !x.unique)[0] || MACHINES[0];
      addGuardian(state, pick.type, { free: 30 });
      say('neighbour', `${cap(NEIGHBOURS.galt.name)} send a ${pick.name} for Eden's guard, with 30 days of free upkeep.`, true);
    }
  }
  // hostile neighbours' raider bases grow bold: the fleet regrows twice as fast, and they notice Eden sooner
  for (const b of state.raid?.bases || []) {
    if (b.destroyed || !neighbourBold(state, b)) continue;
    if (b.fleet < b.max) b.grow = (b.grow || 0) + 1;
    if (!b.aware && (state.pop || 0) >= (BASE[b.id]?.notice || 1e9) / 2) noticeEden(state, b, rngFor(state, 3), ` (${NEIGHBOURS[baseNeighbour(b)].short} is hostile to Eden)`);
  }
  // offers and requests
  if (!docked(state)) return;
  if (n.next == null) n.next = NB.first[dk(state)] + between(rngFor(state, 1), [0, 20]);
  if (state.day < n.next || state.pending?.some((p) => p.kind === 'neighbour')) return;
  const rng = rngFor(state, 2), list = offersNow(state, rng);
  n.next = state.day + between(rng, NB.every[dk(state)]);
  if (!list.length) return;
  const o = list[Math.floor(rng() * list.length)];
  n.count++;
  const choices = o.deal.ok ? [{ key: 'ok', label: o.kind === 'gift' ? 'Thank them' : 'Noted' }]
    : [{ key: 'yes', label: o.kind === 'aid' ? 'Send it' : o.kind === 'protection' ? 'Pay' : 'Accept' }, { key: 'no', label: o.kind === 'aid' || o.kind === 'protection' ? 'Refuse' : 'No, thank you' }];
  const p = ask('neighbour', o.title, o.text);
  p.choices = choices; p.who = o.who; p.deal = o.deal; p.offer = o.kind; p.speaker = NEIGHBOURS[o.who].speaker; p.base = o.base || null;
  if (o.kind === 'warning') p.tone = 'warn';
}

// What the Neighbours tab shows.
export function neighbourStatus(state) {
  const n = ensureNeighbours(state);
  return NEIGHBOUR_KEYS.map((k) => {
    const N = NEIGHBOURS[k], mood = moodOf(state, k), base = (state.raid?.bases || []).find((b) => baseNeighbour(b) === k) || null;
    return { key: k, name: N.name, short: N.short, text: N.text, color: N.color, mood, standing: standing(mood),
      perks: PERKS.filter((p) => p.who === k).map((p) => ({ ...p, on: p.once ? n.perks[p.key] != null : mood >= p.at, given: n.perks[p.key] ?? null })),
      base: base ? { id: base.id, destroyed: base.destroyed, bold: neighbourBold(state, base), truce: neighbourTruce(state, base), fleet: base.fleet, max: base.max } : null,
      log: n.log.filter((e) => e.who === k).slice(-4).reverse() };
  });
}
export function setNeighbours(state, on) {
  state.options ??= {};
  state.options.neighbours = !!on;
  if (!on) state.pending = (state.pending || []).filter((p) => p.kind !== 'neighbour');
  ensureNeighbours(state).seen = counters(state);
  return { ok: true, msg: on ? 'Neighbours on: the Union, Galt and the Cartel will send offers and remember what Eden does.' : 'Neighbours off: no offers, and their moods hold where they are.' };
}
