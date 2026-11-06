// Earthlight Space Colony Rebuild, version 8 (docs/COLONY-V8.md): Council petitions.
// Pure: no DOM. The sim calls petitionsDay() each day; rules.js re-exports the rest for the interface and the advisor.
//   * Every so often a group in Eden asks the Council for something concrete it can have: a new building of a kind,
//     sometimes on a given deck or near the dock. Only what the colony can already build is asked for.
//   * A generous deadline (40 days, 50 on Easy). Granted in time: the Council's grant, a lift in happiness for a few
//     weeks, and sometimes something of the group's own. Let lapse: a small dip in happiness that fades. Never harsh.
//   * None before day 40 (50 on Easy), then one every 25–40 days (40–60 on Easy), at most two open (one on Easy).
//   * Their own dice (seeded from the colony's seed and the day), like incidents: they never shift the sim's own.
//   * Settings › Petitions (state.options.petitions); off, none come and the open ones are withdrawn without penalty.
// state.petitions = { next, open: [{ id, key, day, until, base }], used: { key: day }, granted, lapsed, log: [] }
import { BUILDING } from './data/buildings.js';
import { diffOf } from './difficulty.js';

export const PETITION = {
  first: { easy: 50, normal: 40 },
  every: { easy: [40, 60], normal: [25, 40] },
  days: { easy: 50, normal: 40 },          // the deadline
  maxOpen: { easy: 1, normal: 2 },
  remind: 7,                               // the advisor warns this many days before the deadline
  happy: 4, happyDays: 20,                 // granted: +4 happiness, fading over 20 days
  lapse: -3, lapseDays: 10,                // let lapse: −3, fading over 10 days
  again: 150,                              // a lapsed petition may come back after this many days
};
const dk = (state) => (state.difficulty === 'easy' ? 'easy' : 'normal');
const working = (b) => b.build === 0 && !b.off && !(b.down > 0) && !(b.damaged > 0);
const deckOf = (o) => o?.deck || 'main';
const can = (s, key) => s.unlocked?.includes(key) && !!BUILDING[key];
const openOn = (s, deck) => (s.chambers || []).some((c) => (c.deck || 'main') === deck && c.status === 'open');
const joined = (s, id) => (s.secrets?.sites || []).some((x) => x.kind === 'survivors' && x.ref === id && x.done);
const serving = (s, key) => (s.commanders || []).some((c) => c.key === key);
const dockOf = (s) => s.buildings.find((b) => b.key === 'dock' && b.build === 0) || null;
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// The petitions. who: the group asking; speaker: the portrait (the group's own, or who brings it to the Governor);
// want: { key, deck?, near?: 'dock', radius? } a new working building of that kind there; when: whether it can be asked
// now (the colony must be able to build it); reward: { goods?, research? } on top of the grant and the happiness.
export const PETITIONS = [
  { key: 'garden', who: 'The garden families', speaker: 'ruess', want: { key: 'park', deck: 'upper' }, reward: { goods: { food: 150 } },
    when: (s) => joined(s, 's_garden') && openOn(s, 'upper'),
    text: 'We kept the sky gardens alive for years with our bare hands. Give the upper rings a proper park, and we will fill your stores from our plots.' },
  { key: 'families', who: 'The families of the landing quarter', speaker: 'ruess', want: { key: 'park' }, reward: {},
    when: (s) => s.pop >= 40 && !joined(s, 's_garden'),
    text: 'The children play between the pumps. One more park, Governor, somewhere green for them, and the whole quarter will thank you.' },
  { key: 'traders', who: 'The dock traders', speaker: 'sato', want: { key: 'marketquad', near: 'dock', radius: 30 }, reward: { goods: { parts: 40 } },
    when: (s) => !!dockOf(s) && s.pop >= 60 && can(s, 'marketquad'),
    text: 'The traders who call at our dock want somewhere to sell in Eden itself: a Market Quad within reach of the dock. They say they will bring parts.' },
  { key: 'market', who: 'The old market traders', speaker: 'sato', want: { key: 'marketquad' }, reward: { goods: { parts: 60 } },
    when: (s) => joined(s, 's_market') && can(s, 'marketquad'),
    text: 'The old market traders kept a ledger of every debt for twenty years. They will tear up ours if Eden zones a market for them: one Market Quad.' },
  { key: 'pumps', who: 'The pump hall crew', speaker: 'ruess', want: { key: 'clinic', deck: 'lower' }, reward: { research: 40 },
    when: (s) => joined(s, 's_pumps') && can(s, 'clinic') && openOn(s, 'lower'),
    text: 'The pump hall crew have worked the lower deck in the damp for years, and half of them cough. They ask for a Clinic down there, on the lower deck.' },
  { key: 'marrow', who: 'Warden Marrow', speaker: 'marrow', want: { key: 'safetypost', deck: 'lower' }, reward: { goods: { parts: 40 } },
    when: (s) => serving(s, 'marrow') && can(s, 'safetypost') && openOn(s, 'lower'),
    text: 'I kept sixty-one people alive in the catacombs with wardens and rules. Put a Safety Post on the lower deck, Governor, and I will sleep at night.' },
  { key: 'venn', who: 'Tobias Venn', speaker: 'venn', want: { key: 'pumpstation', deck: 'lower' }, reward: { research: 60 },
    when: (s) => serving(s, 'venn') && can(s, 'pumpstation') && openOn(s, 'lower'),
    text: 'I flooded those tunnels, near enough. Let me help drain them: one more Pump Station on the lower deck, and I will give your labs what I remember.' },
  { key: 'workers', who: 'The field and pump workers', speaker: 'ruess', want: { key: 'canteen' }, reward: {},
    when: (s) => s.pop >= 80 && can(s, 'canteen'),
    text: 'The workers eat cold rations at their posts. A Canteen, they say, and they would work the longer shifts gladly.' },
  { key: 'parents', who: 'The parents of Eden', speaker: 'ruess', want: { key: 'clinic' }, reward: {},
    when: (s) => s.pop >= 100 && can(s, 'clinic'),
    text: 'More children are coming, and the nearest doctor is a medic with a kit bag. The parents ask for a Clinic.' },
  { key: 'pilots', who: 'The guardian pilots', speaker: 'sato', want: { key: 'school' }, reward: { research: 30 },
    when: (s) => (s.guardians || []).length >= 2 && can(s, 'school'),
    text: 'My pilots have families now, sir, and their children run wild on the flight deck. They ask for a School. So do I.' },
  { key: 'sato', who: 'Capt. Sato', speaker: 'sato', want: { key: 'emplacement' }, reward: { goods: { parts: 30 } },
    when: (s) => s.pop >= 120 && can(s, 'emplacement'),
    text: 'One more Battery Emplacement on the hull, Governor. I would rather we never need it. I would rather we had it.' },
  { key: 'labs', who: 'Prof. Ruess', speaker: 'ruess', want: { key: 'lab' }, reward: { research: 50 },
    when: (s) => can(s, 'lab') && s.buildings.some((b) => b.key === 'lab' && b.build === 0),
    text: 'A second Research Lab, Governor. I have three projects on one bench and a student sleeping under it.' },
  { key: 'seln', who: 'Ama Seln', speaker: 'w_seln', want: { key: 'hydro' }, reward: { goods: { food: 120 } },
    when: (s) => serving(s, 'w_seln') && can(s, 'hydro'),
    text: 'Give me one more Hydroponics Bay and I will show you what a steward can grow in a tray of grey water.' },
  { key: 'oduya', who: 'Tem Oduya', speaker: 'w_oduya', want: { key: 'scrapyard' }, reward: { goods: { parts: 60 } },
    when: (s) => serving(s, 'w_oduya') && can(s, 'scrapyard'),
    text: 'A dockyard engineer without a scrapyard is a cook without a kitchen. Build me one and I will pay you back in parts.' },
];
export const PETITION_OF = Object.fromEntries(PETITIONS.map((p) => [p.key, p]));

export const petitionsOn = (state) => state.options?.petitions !== false;
export function ensurePetitions(state) {
  state.petitions ??= { next: null, open: [], used: {}, granted: 0, lapsed: 0, log: [] };
  const n = state.petitions;
  n.next ??= null; n.open ??= []; n.used ??= {}; n.granted ??= 0; n.lapsed ??= 0; n.log ??= [];
  return n;
}
function rngFor(state, salt = 0) {
  let h = 2166136261;
  for (const c of `${state.seed}:${state.day}:${salt}:petition`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const between = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));

// The buildings that would answer a petition's `want` (working, on its deck, near its anchor).
function matching(state, want) {
  const anchor = want.near === 'dock' ? dockOf(state) : null;
  return state.buildings.filter((b) => b.key === want.key && working(b) && (!want.deck || deckOf(b) === want.deck)
    && (!want.near || (anchor && cheb(b, anchor) <= (want.radius || 24))));
}
// What the petition asks, in words ("a Park on the upper deck").
export function wantText(want) {
  const d = BUILDING[want.key], a = /^[AEIOU]/.test(d.name) ? 'an' : 'a';
  return `${a} ${d.name}${want.deck ? ` on the ${want.deck} deck` : ''}${want.near === 'dock' ? ` within ${want.radius || 24} tiles of the dock` : ''}`;
}
export function rewardText(state, def) {
  const g = diffOf(state).grant, r = def.reward || {}, bits = [`${g.credits} credits and ${g.parts} parts`, `+${PETITION.happy} happiness`];
  for (const [k, v] of Object.entries(r.goods || {})) bits.push(`${v} ${k}`);
  if (r.research) bits.push(`${r.research} research`);
  return bits.join(', ');
}
const showOf = (def) => ({ build: def.want.key, ...(def.want.deck ? { deck: def.want.deck } : {}) });

// The open petitions, for the advisor and the interface.
export function petitionStatus(state) {
  return ensurePetitions(state).open.map((o) => {
    const def = PETITION_OF[o.key];
    return def && { id: o.id, key: o.key, who: def.who, speaker: def.speaker, want: wantText(def.want), days: Math.max(0, o.until - state.day),
      reward: rewardText(state, def), show: showOf(def), met: matching(state, def.want).length > o.base };
  }).filter(Boolean);
}

// Petitions on or off (Settings). Off: the open ones are withdrawn, without penalty, and none come.
export function setPetitions(state, on) {
  state.options ??= {};
  state.options.petitions = !!on;
  const n = ensurePetitions(state);
  if (!on) { n.open = []; n.next = null; state.pending = state.pending.filter((p) => p.kind !== 'petition'); }
  return { ok: true, msg: on ? 'Petitions on: now and then a group in Eden asks the Council for something it can have.' : 'Petitions off: the open ones are withdrawn, and no new ones come.' };
}

// Each day (sim.js, after the goals): granted petitions pay, lapsed ones fade, a reminder near the deadline, a new
// one now and then. `say` and `ask` as the sim's.
export function petitionsDay(state, { say, ask }) {
  const n = ensurePetitions(state);
  if (!petitionsOn(state) || state.flags?.lost) return;
  const d = dk(state), mood = (label, value, days) => { state.raid ??= {}; (state.raid.moods ??= []).push({ label, value, day: state.day, days }); };
  for (const o of [...n.open]) {
    const def = PETITION_OF[o.key];
    if (!def) { n.open.splice(n.open.indexOf(o), 1); continue; }
    if (matching(state, def.want).length > o.base) {
      n.open.splice(n.open.indexOf(o), 1); n.granted++; n.log.push({ key: o.key, day: state.day, ok: true });
      n.used[o.key] = { day: state.day, ok: true };   // a granted petition is never asked again
      const g = diffOf(state).grant, r = def.reward || {};
      state.stock.credits += g.credits; state.stock.parts += g.parts;
      for (const [k, v] of Object.entries(r.goods || {})) state.stock[k] = (state.stock[k] || 0) + v;
      if (r.research && state.research) state.research.points += r.research;
      mood('Petition granted', PETITION.happy, PETITION.happyDays);
      say('petition', `Petition granted: ${def.who} have ${wantText(def.want)}. The Council grants ${rewardText(state, def)}.`);
    } else if (state.day >= o.until) {
      n.open.splice(n.open.indexOf(o), 1); n.lapsed++; n.log.push({ key: o.key, day: state.day, ok: false });
      n.used[o.key] = { day: state.day, ok: false };   // it may come back PETITION.again days from now
      mood('Petition ignored', PETITION.lapse, PETITION.lapseDays);
      say('petition', `The petition of ${def.who.replace(/^The /, 'the ')} has lapsed: they are disappointed (happiness ${PETITION.lapse} for a while). They may ask again some day.`);
    } else if (o.until - state.day === PETITION.remind) {
      say('petition', `${PETITION.remind} days left on the petition of ${def.who.replace(/^The /, 'the ')}: ${wantText(def.want)}.`);
    }
  }
  if (n.log.length > 30) n.log.splice(0, n.log.length - 30);
  const rng = rngFor(state);
  n.next ??= PETITION.first[d] + Math.floor(rng() * 10);
  if (state.day < n.next || n.open.length >= PETITION.maxOpen[d]) return;
  const pool = PETITIONS.filter((p) => {
    if (n.open.some((o) => o.key === p.key)) return false;
    const used = n.used[p.key];
    if (used != null && (used.ok || state.day - used.day < PETITION.again)) return false;
    return p.when(state);
  });
  n.next = state.day + between(rng, PETITION.every[d]);
  if (!pool.length) return;
  const def = pool[Math.floor(rng() * pool.length)];
  const o = { id: state.nextId++, key: def.key, day: state.day, until: state.day + PETITION.days[d], base: matching(state, def.want).length };
  n.open.push(o);
  n.used[def.key] = { day: state.day, ok: false };
  const p = ask('petition', `Petition: ${def.who.replace(/^The /, 'the ')}`, `${def.text} They ask for ${wantText(def.want)} within ${PETITION.days[d]} days. Granted in time: ${rewardText(state, def)}.`);
  p.speaker = def.speaker; p.petition = def.key; p.show = showOf(def); p.tone = null;
}
