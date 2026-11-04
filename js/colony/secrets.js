// Earthlight Space Colony Rebuild: the secrets of the deserted colony (docs/COLONY-V4.md §2 and
// "Stage 2 build contract: the secrets"). Pure: no DOM; the placement is deterministic from the seed
// (and the chambers it is given), the rest uses the colony's own dice (rules.js stateRng) or the
// sim's. rules.js re-exports the player's actions and read-outs, so the interface needs only rules.js.
//   placeSecrets(state)            every log, vault and survivor group into a chamber, dangers into chambers
//   ensureSecrets(state)           placeSecrets for a colony without secrets (old saves; upgradeState calls it)
//   readLog(state, logId)          a found log, read (the journal; the five key logs make the final code)
//   clearDanger(state, chamberId)  drones: the guardians fight; toxic / radiation / reactor: pay, crews work
//   dangerPreview(state, chamberId) what clearing would take or risk
//   openVault(state, siteId)       a found vault in an open chamber whose `requires` are met: its reward
//   secretStatus(state)            the Discoveries journal's read-out
//   dangerBlocks(state, chamber)   why a danger keeps a chamber from being pressurised, or null
//   secretsDay / dangerWork        the sim's daily part (reveal, flooding, the reactor, survivors; crew work)
// state.secrets = { sites: [{ id, kind, ref, chamber, x, y, deck, found, done }],
//   dangers: [{ chamber, kind, deck, strength?, work, deadline, found, done, failed? }],
//   read: [logIds], journal: [{ day, kind, ref }], finalOpened, core }
// journal kinds: log | vault | survivors (found; ref the site's ref) · danger (found; ref the chamber id) ·
//   read (ref a log id) · opened (a vault) · joined (survivors) · started / cleared / failed (ref a chamber id) · final
import { T } from './data/terrain.js';
import { BUILDING, BASE_PRICE } from './data/buildings.js';
import { TECH } from './data/tech.js';
import { COMMANDER } from './data/commanders.js';
import { LOGS, VAULTS, SURVIVORS, DANGERS, FINAL_CODE_PARTS } from './data/secrets.js';
import { hashSeed, mulberry32 } from './mapgen.js';
import {
  log, addPending, housingOf, deckOf, mapOf, chamberOf, chamberLinks, occupancy, costOf, storageCaps, powerOf, addGuardian, machineOf,
  shaftsOf, active, finished, stateRng, fightDrones, dronesPreview, droneAttack,
} from './rules.js';

export const LOG = Object.fromEntries(LOGS.map((l) => [l.id, l]));
export const VAULT = Object.fromEntries(VAULTS.map((v) => [v.id, v]));
export const GROUP = Object.fromEntries(SURVIVORS.map((g) => [g.id, g]));
export const KEY_LOGS = LOGS.filter((l) => l.key).map((l) => l.id);

// Rules numbers the data has no column for (first guesses; tests/colony-secrets.mjs plays them).
export const SECRET = {
  // drones: the hangar guards at the low end of DANGERS.drones.strength, a quarter and half way up for
  // the second hangar and a spare patrol, the final vault's at the top; × RAID.strength on Easy (0.6)
  droneSteps: { hangarA: 0, hangarB: 0.25, patrol: 0.5, final: 1 },
  patrolChance: 0.5,            // a fourth sentry chamber now and then
  radiation: [1, 2], toxic: [2, 3],
  flooded: { share: 0.25, max: 3, least: 40 },   // MARSH share that makes a chamber flooded; at most 3; else the wettest with 40+
  shield: 0.5,                  // a working Shield Pylon on the deck: radiation work × 0.5
  pumpOut: 4,                   // a Pump Station standing in a flooded chamber not yet open pumps out 4 tiles a day
  reactorEasy: 1.5,             // the reactor's deadline × 1.5 on Easy (90 days)
  reactorWarn: [30, 15],        // reminders this many days before the deadline while the work has not started
  reactorDamage: [1, 4], reactorDamageDays: [5, 15], reactorReseal: 2,
};
// Floors a site can stand on (catacombs too: the survivors live in them).
const SITE_FLOOR = new Set([T.DECK, T.PLAIN, T.FERTILE, T.POOR, T.ROCK, T.CONDUIT, T.HILLS, T.CATACOMB]);
const HIDDEN = new Set(['sealed', 'surveying']);
const EMPTY = { sites: [], dangers: [], read: [], journal: [], finalOpened: false, core: null };
const ok = (msg, extra) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });
const between = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const secretsOf = (state) => state.secrets || EMPTY;
export const dangerIn = (state, chamberId) => secretsOf(state).dangers.find((d) => d.chamber === chamberId) || null;
export const sitesIn = (state, chamberId) => secretsOf(state).sites.filter((s) => s.chamber === chamberId);
const siteOf = (state, id) => secretsOf(state).sites.find((s) => s.id === id || s.ref === id) || null;
const journal = (state, kind, ref) => state.secrets.journal.push({ day: state.day, kind, ref });
const keysRead = (state) => KEY_LOGS.filter((id) => secretsOf(state).read.includes(id)).length;

// ---------------------------------------------------------------- placement

// Every tile index of a chamber on its deck.
function chamberTiles(state, c) {
  const m = mapOf(state, deckOf(c)), w = m.w, out = [];
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (m.ch[y * w + x] === c.id) out.push(y * w + x);
  return out;
}
export function marshLeft(state, c) {
  const m = mapOf(state, deckOf(c));
  let n = 0;
  for (const i of chamberTiles(state, c)) if (m.t[i] === T.MARSH) n++;
  return n;
}

// The landing chamber (main deck): never holds a secret.
const landingOf = (state) => state.chambers.find((c) => !c.deck && c.kind === 'landing') || state.chambers.find((c) => !c.deck && c.status === 'open') || null;

export function placeSecrets(state) {
  const rng = mulberry32(hashSeed(`${state.seed}:secrets`));
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const land = landingOf(state), w = state.map.w;
  const on = (deck) => state.chambers.filter((c) => deckOf(c) === deck && c !== land && c.tiles > 0);
  const home = shaftsOf(state).find((s) => s.landing) || shaftsOf(state)[0] || { x: state.map.w / 2, y: state.map.h / 2 };
  const homeCh = (deck) => chamberOf(state, mapOf(state, deck)?.ch[home.y * w + home.x] ?? 255);
  const homeLower = homeCh('lower'), links = chamberLinks(state);
  const nearHome = new Set(homeLower ? [homeLower.id, ...(links.get(homeLower.id) || [])] : []);
  const mid = (c) => ({ x: (c.x0 + c.x1 + 1) / 2, y: (c.y0 + c.y1 + 1) / 2 });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const fromHome = (c) => dist(mid(c), { x: home.x + 1, y: home.y + 1 });

  // --- dangers: lower chambers still sealed, never the one under the landing lift; its neighbours only
  // when nothing else will do (the first steps below are free of danger)
  const dangers = [], taken = new Map();
  const lower = on('lower');
  const free = (c) => c && HIDDEN.has(c.status) && c !== homeLower && !taken.has(c.id);
  const add = (c, kind, extra = {}) => { const d = { chamber: c.id, kind, deck: deckOf(c), ...extra, work: 0, deadline: null, found: false, done: false }; dangers.push(d); taken.set(c.id, d); return d; };
  // candidates in order of preference: away from home first, then the given score (lowest first)
  const choose = (pool, score) => pool.filter(free).map((c) => ({ c, s: (nearHome.has(c.id) ? 1e6 : 0) + score(c) })).sort((a, b) => a.s - b.s || a.c.id - b.c.id).map((e) => e.c);
  const cores = lower.filter((c) => c.kind === 'core');
  const core = (cores.length ? cores : lower).filter((c) => c !== homeLower).sort((a, b) => fromHome(b) - fromHome(a) || a.id - b.id)[0] || null;
  if (core && free(core)) add(core, 'reactor');
  const coreNear = (c) => !!core && (links.get(core.id)?.has(c.id) ?? false);
  const toCore = (c) => (core ? dist(mid(c), mid(core)) : 0);
  const S = DANGERS.drones.strength, strength = (step) => Math.round(S[0] + (S[1] - S[0]) * step);
  // radiation around the old core
  const rad = [];
  for (let n = between(rng, SECRET.radiation); n > 0; n--) {
    const c = choose(lower, (c) => (coreNear(c) ? 0 : 1000) + toCore(c) + rng() * 20)[0];
    if (c) rad.push(add(c, 'radiation'));
  }
  // the sentries: the final vault's beside the core, the hangars' far from home, now and then a patrol
  const final = choose(lower, (c) => (coreNear(c) ? 0 : 1000) + toCore(c) + rng() * 10)[0];
  const finalD = final && add(final, 'drones', { strength: strength(SECRET.droneSteps.final), guards: 'v_final' });
  const farPick = () => choose(lower, (c) => -fromHome(c) - rng() * 60)[0];
  const hA = farPick(), hangarA = hA && add(hA, 'drones', { strength: strength(SECRET.droneSteps.hangarA), guards: 'v_msnp' });
  const hB = farPick(), hangarB = hB && add(hB, 'drones', { strength: strength(SECRET.droneSteps.hangarB), guards: 'v_msfb' });
  if (rng() < SECRET.patrolChance) { const c = farPick(); if (c) add(c, 'drones', { strength: strength(SECRET.droneSteps.patrol) }); }
  // flooding wherever a chamber is mostly under water (the wettest few)
  const wet = new Map(lower.map((c) => [c.id, marshLeft(state, c)]));
  const share = (c) => wet.get(c.id) / Math.max(1, c.tiles);
  let floodPool = choose(lower, (c) => -share(c)).filter((c) => !nearHome.has(c.id) && share(c) >= SECRET.flooded.share).slice(0, SECRET.flooded.max);
  if (!floodPool.length) floodPool = choose(lower, (c) => -wet.get(c.id)).filter((c) => !nearHome.has(c.id) && wet.get(c.id) >= SECRET.flooded.least).slice(0, 1);
  const floods = floodPool.map((c) => add(c, 'flooded'));
  // toxic air in a few others
  for (let n = between(rng, SECRET.toxic); n > 0; n--) { const c = choose(lower, () => rng())[0]; if (c && !nearHome.has(c.id)) add(c, 'toxic'); }

  // --- sites: vaults where their `requires` say, survivors where they would hide, logs spread out
  const sites = [], load = new Map(), used = new Map();
  const occ = { upper: occupancy(state, -1, 'upper'), main: occupancy(state, -1, 'main'), lower: occupancy(state, -1, 'lower') };
  const least = (pool) => {
    if (!pool.length) return null;
    const min = Math.min(...pool.map((c) => load.get(c.id) || 0));
    return pick(pool.filter((c) => (load.get(c.id) || 0) === min).sort((a, b) => a.id - b.id));
  };
  const tileIn = (c) => {
    const m = mapOf(state, deckOf(c)), { t, ch } = m, near = used.get(c.id) || [];
    const shaftNear = (i) => { const x = i % w, y = (i / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (t[(y + dy) * w + x + dx] === T.SHAFT) return true; return false; };
    const cand = chamberTiles(state, c).filter((i) => SITE_FLOOR.has(t[i]) && !occ[deckOf(c)][i] && !shaftNear(i)
      && !near.some((j) => Math.max(Math.abs((i % w) - (j % w)), Math.abs(((i / w) | 0) - ((j / w) | 0))) < 3));
    const inner = cand.filter((i) => [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1].every((d) => ch[i + d] === c.id));
    const pool = inner.length ? inner : cand;
    return pool.length ? pool[Math.floor(rng() * pool.length)] : -1;
  };
  const put = (kind, ref, c) => {
    if (!c) return null;
    const i = tileIn(c);
    if (i < 0) return null;
    load.set(c.id, (load.get(c.id) || 0) + 1);
    (used.get(c.id) || used.set(c.id, []).get(c.id)).push(i);
    const s = { id: ref, kind, ref, chamber: c.id, x: i % w, y: (i / w) | 0, deck: deckOf(c), found: false, done: false };
    sites.push(s);
    return s;
  };
  // put somewhere on its deck: the preferred chambers first, any chamber of the deck if none takes it
  const place = (kind, ref, deck, prefer = []) => {
    for (const pool of [...prefer, on(deck), ...['lower', 'upper', 'main'].map(on)]) {
      const options = pool.filter(Boolean);
      for (let k = 0; k < 4 && options.length; k++) { const c = least(options); if (put(kind, ref, c)) return; options.splice(options.indexOf(c), 1); }
    }
  };
  const ch = (d) => (d ? [chamberOf(state, d.chamber)] : []);
  const safe = (c) => !taken.has(c.id) || taken.get(c.id).kind === 'reactor';
  for (const v of VAULTS) {
    const prefer = {
      v_final: [ch(finalD)], v_msnp: [ch(hangarA)], v_msfb: [ch(hangarB)],
      v_helium: [rad.flatMap(ch), dangers.filter((d) => d.kind === 'toxic').flatMap(ch)],
      v_stores: [floods.flatMap(ch), lower.filter((c) => !taken.has(c.id) && wet.get(c.id) > 0)],
      v_seeds: [on('upper').filter((c) => c.kind === 'garden' && c !== homeCh('upper')), on('upper').filter((c) => c.kind === 'garden')],
    }[v.id] || [on(v.deck).filter(safe)];
    place('vault', v.id, v.deck, prefer);
  }
  const KIND_FOR = { s_crypt: ['catacomb'], s_pumps: ['cistern', 'machinery'], s_venn: ['machinery', 'core'], s_garden: ['garden', 'ring'] };
  for (const g of SURVIVORS) {
    const kinds = KIND_FOR[g.id] || [];
    place('survivors', g.id, g.deck, [on(g.deck).filter((c) => kinds.includes(c.kind) && !taken.has(c.id)), on(g.deck).filter((c) => !taken.has(c.id))]);
  }
  for (const l of LOGS) place('log', l.id, l.deck || 'lower');

  state.secrets = { sites, dangers, read: [], journal: [], finalOpened: false, core: core?.id ?? null };
  return state.secrets;
}

// A colony without secrets gets them (a new game once its decks exist; a save from before stage 2).
// Idempotent; rules.js upgradeState calls it.
export function ensureSecrets(state) {
  if (state.secrets) {
    const s = state.secrets;
    s.sites ??= []; s.dangers ??= []; s.read ??= []; s.journal ??= []; s.finalOpened ??= false; s.core ??= null;
    return s;
  }
  if (!state.decks || !Array.isArray(state.chambers) || !state.map?.t) return null;
  return placeSecrets(state);
}

// ---------------------------------------------------------------- dangers

const DANGER_VERB = {
  drones: 'Directorate sentries still patrol it: send the guardians to clear them first (the Discoveries journal).',
  toxic: 'its air is toxic: decontaminate it first (the Discoveries journal).',
  radiation: 'it is irradiated: decontaminate it first (the Discoveries journal).',
  flooded: 'it is flooded: build Pump Stations in it until no flooded ground is left.',
};
// Why a danger keeps this chamber from being pressurised (null: nothing does; the reactor never does).
export function dangerBlocks(state, c) {
  const d = c && dangerIn(state, c.id);
  if (!d || d.done || d.kind === 'reactor') return null;
  return `${c.name} cannot be pressurised yet: ${DANGER_VERB[d.kind] || 'deal with its danger first.'}`;
}
// A flooded chamber not yet dry (Pump Stations may stand in it while it is only surveyed).
export function floodedHere(state, c) {
  const d = c && dangerIn(state, c.id);
  return !!d && d.kind === 'flooded' && !d.done;
}
const shieldOn = (state, deck) => state.buildings.some((b) => b.key === 'shieldpylon' && active(b) && deckOf(b) === deck);
// The crew days a decontamination or stabilisation takes here (radiation halved by a Shield Pylon on the deck).
export function dangerDays(state, d) {
  const days = DANGERS[d.kind]?.days || 0;
  return d.kind === 'radiation' && shieldOn(state, d.deck) ? Math.ceil(days * SECRET.shield) : days;
}
const reactorDeadline = (state) => Math.round((DANGERS.reactor.deadline || 60) * (state.difficulty === 'easy' ? SECRET.reactorEasy : 1));

// What clearing a chamber's danger takes or risks. { kind, name, chamber, deck, found, done, failed, work, why, ... }
//   drones: { attack, defence, winChance, crewed, expectedLost: [types], salvage }
//   toxic / radiation / reactor: { cost, days, canPay, shielded?, deadline?, left?, startBy? }
//   flooded: { marsh, pumps }
export function dangerPreview(state, chamberId) {
  const d = dangerIn(state, chamberId), c = chamberOf(state, chamberId);
  if (!d || !c) return null;
  const D = DANGERS[d.kind] || {};
  const out = { kind: d.kind, name: D.name || d.kind, text: D.text || '', chamber: c.id, chamberName: c.name, deck: d.deck, found: !!d.found, done: !!d.done, failed: !!d.failed, work: d.work || 0, why: null };
  if (d.kind === 'drones') Object.assign(out, dronesPreview(state, d), { strength: d.strength });
  else if (d.kind === 'flooded') Object.assign(out, { marsh: marshLeft(state, c), pumps: pumpsIn(state, c).length });
  else {
    const cost = costOf(state, D.cost || {}), days = dangerDays(state, d);
    Object.assign(out, { cost, days, canPay: state.stock.credits >= cost.credits && state.stock.parts >= cost.parts });
    if (d.kind === 'radiation') out.shielded = shieldOn(state, d.deck);
    if (d.kind === 'reactor' && d.deadline !== null) Object.assign(out, { deadline: d.deadline, left: d.deadline - state.day, startBy: d.deadline - days });
  }
  out.why = clearWhy(state, d, c, out);
  return out;
}
const pumpsIn = (state, c) => state.buildings.filter((b) => b.key === 'pumpstation' && deckOf(b) === deckOf(c) && mapOf(state, deckOf(c)).ch[b.y * state.map.w + b.x] === c.id);
function clearWhy(state, d, c, pv) {
  if (!d.found) return `Survey ${c.name} first.`;
  if (d.done) return d.failed ? 'The old core burned itself out.' : 'Already dealt with.';
  if (d.kind === 'flooded') return `${c.name} clears when no flooded ground is left (${pv.marsh} tiles): build Pump Stations in it; each pumps out ${SECRET.pumpOut} tiles a day until it is dry.`;
  if (d.kind === 'drones') return pv.crewed ? null : 'No guardian has a crew: build machines at an Arsenal (and a Barracks for more crews).';
  if (d.work > 0) return `Crews are already at work: ${plural(d.work, 'day')} left.`;
  if (state.stock.credits < pv.cost.credits) return `Needs ${Math.ceil(pv.cost.credits - state.stock.credits)} more credits.`;
  if (state.stock.parts < pv.cost.parts) return `Needs ${Math.ceil(pv.cost.parts - state.stock.parts)} more parts.`;
  return null;
}

// Deal with a chamber's danger: drones are fought now (the colony's dice); toxic air, radiation and the
// reactor are paid for and crews start work (sim: a crew a day, before construction).
export function clearDanger(state, chamberId, rng = stateRng(state)) {
  const d = dangerIn(state, chamberId), c = chamberOf(state, chamberId);
  if (!d || !c) return no('There is no danger in that chamber.');
  const pv = dangerPreview(state, chamberId);
  if (pv.why) return no(pv.why);
  if (d.kind === 'drones') {
    const report = fightDrones(state, d, rng);
    const lost = report.lostGuardians.length ? ` Lost: ${report.lostGuardians.map((t) => machineOf(state, t).name).join(', ')}.` : '';
    let text;
    if (report.won) {
      d.done = true;
      journal(state, 'cleared', c.id);
      text = `The guardians cleared the sentries out of ${c.name}. Salvage: ${report.salvage.credits} credits and ${report.salvage.parts} parts.${lost} ${c.name} can be pressurised now.`;
    } else text = `The sentries in ${c.name} drove the guardians back (strength ${report.attack} against ${Math.round(report.defence)}), though they are fewer now (${droneAttack(state, d)}).${lost} Repair the machines and try again.`;
    log(state, text);
    const p = addPending(state, 'dronefight', report.won ? 'Sentries cleared' : 'Driven back', text);
    p.speaker = 'sato'; p.chamber = c.id; p.report = report;
    return ok(text, { report, won: report.won });
  }
  const D = DANGERS[d.kind], cost = pv.cost;
  state.stock.credits -= cost.credits; state.stock.parts -= cost.parts;
  d.work = pv.days;
  journal(state, 'started', c.id);
  const what = d.kind === 'reactor' ? 'Stabilising the old core' : `Decontaminating ${c.name}`;
  log(state, `${what}: ${plural(d.work, 'day')} of crew work.`);
  return ok(`${what} for ${cost.credits} credits and ${cost.parts} parts: ${plural(d.work, 'day')} of work for a crew.${d.kind === 'radiation' && !pv.shielded ? ` A Shield Pylon on the ${d.deck} deck would halve it.` : ''}`, { days: d.work, name: D.name });
}

// The sim's step 1: crews work on paid dangers first (the reactor first), a crew a danger a day.
// Returns the crews left for repairs and construction.
export function dangerWork(state, crews, say, ask) {
  const sec = state.secrets;
  if (!sec) return crews;
  const list = sec.dangers.filter((d) => !d.done && d.work > 0).sort((a, b) => (b.kind === 'reactor') - (a.kind === 'reactor'));
  for (const d of list) {
    if (crews <= 0) break;
    crews--;
    if (--d.work > 0) continue;
    d.work = 0; d.done = true;
    journal(state, 'cleared', d.chamber);
    const c = chamberOf(state, d.chamber);
    if (d.kind === 'reactor') {
      const p = ask('reactor', 'The old core is safe', `Governor, the crews have clamped the old core in ${c.name}. It is cold and quiet: the ${d.deck} deck is safe.`);
      p.speaker = 'ruess'; p.chamber = c.id;
    } else say('cleared', `${c.name} is decontaminated: it can be pressurised now.`);
  }
  return crews;
}

// ---------------------------------------------------------------- the sim's day

// Reveal what surveyed chambers hold, dry out drained chambers, run the reactor's clock, let survivors
// join. ctx: { rng, say, ask } (sim.js dayTick's).
export function secretsDay(state, { rng, say, ask }) {
  const sec = state.secrets;
  if (!sec) return;
  // discoveries: everything in a chamber surveyed (or opened) since yesterday, in one event
  const found = [];
  for (const s of sec.sites) if (!s.found && !HIDDEN.has(chamberOf(state, s.chamber)?.status ?? 'sealed')) { s.found = true; journal(state, s.kind, s.ref); found.push(s); }
  for (const d of sec.dangers) if (!d.found && !HIDDEN.has(chamberOf(state, d.chamber)?.status ?? 'sealed')) {
    d.found = true; journal(state, 'danger', d.chamber); found.push(d);
    if (d.kind === 'reactor' && !d.done) d.deadline = state.day + reactorDeadline(state);
  }
  if (found.length) discovery(state, found, ask);
  // flooding clears itself when the chamber is dry
  for (const d of sec.dangers) {
    if (d.kind !== 'flooded' || d.done || !d.found) continue;
    const c = chamberOf(state, d.chamber);
    if (c && marshLeft(state, c) === 0) { d.done = true; journal(state, 'cleared', c.id); say('cleared', `${c.name} is dry at last: it can be pressurised now.`); }
  }
  // the reactor's clock
  for (const d of sec.dangers) {
    if (d.kind !== 'reactor' || d.done || d.deadline === null) continue;
    const c = chamberOf(state, d.chamber), left = d.deadline - state.day, days = dangerDays(state, d);
    if (left <= 0) { reactorFails(state, d, c, rng, ask); continue; }
    if (!(d.work > 0) && SECRET.reactorWarn.includes(left)) {
      const cost = costOf(state, DANGERS.reactor.cost);
      const p = ask('reactor', 'The old core', `Governor, the old core in ${c.name} is running hotter: ${plural(left, 'day')} until it tears loose. Stabilising it takes ${cost.credits} credits, ${cost.parts} parts and ${plural(days, 'day')} of crew work: start by day ${d.deadline - days} (the Discoveries journal, Dangers).`);
      p.speaker = 'sato'; p.chamber = c.id;
    }
  }
  // survivors join when their chamber is open (and what they wait for is done) and there are free
  // homes for them, like a transport's passengers; until then they wait where they are (one notice)
  for (const s of sec.sites) {
    if (s.kind !== 'survivors' || !s.found || s.done || chamberOf(state, s.chamber)?.status !== 'open' || !groupReady(state, GROUP[s.ref])) continue;
    const free = housingOf(state) - state.pop, g = GROUP[s.ref];
    if (free >= g.pop) { join(state, s, ask); continue; }
    if (!s.waiting) { s.waiting = true; log(state, `${g.name} will join Eden once there are ${g.pop} free homes (now ${Math.max(0, free)}). Build Habitats.`); }
  }
}

function discovery(state, found, ask) {
  const byCh = new Map();
  for (const f of found) { const id = f.chamber; if (!byCh.has(id)) byCh.set(id, []); byCh.get(id).push(f); }
  const parts = [];
  let danger = false;
  for (const [id, list] of byCh) {
    const c = chamberOf(state, id), bits = [];
    for (const f of list) {
      if (f.kind === 'log') bits.push(`a log, "${LOG[f.ref].title}" (${LOG[f.ref].author})`);
      else if (f.kind === 'vault') bits.push(`a sealed vault, ${VAULT[f.ref].name}`);
      else if (f.kind === 'survivors') bits.push(`signs of people: ${GROUP[f.ref].name}`);
      else {
        danger = danger || f.kind === 'drones' || f.kind === 'reactor';
        const D = DANGERS[f.kind];
        bits.push(f.kind === 'reactor' ? `the old core, stirring: stabilise it within ${plural(f.deadline - state.day, 'day')} (by day ${f.deadline})`
          : f.kind === 'drones' ? `${D.name.toLowerCase()} (strength ${droneAttack(state, f)})` : D.name.toLowerCase());
      }
    }
    parts.push(`${c.name} (${deckOf(c)} deck): ${bits.join('; ')}.`);
  }
  const logs = found.filter((f) => f.kind === 'log').length;
  const text = `Governor, the surveyors found something. ${parts.join(' ')}${logs ? ` ${logs === 1 ? 'The log is' : 'The logs are'} in the Discoveries journal (J).` : ''}`;
  const p = ask('discovery', 'Discoveries', text);
  p.speaker = danger ? 'sato' : 'ruess';
  p.found = found.map((f) => (f.ref ? { kind: f.kind, ref: f.ref, chamber: f.chamber } : { kind: 'danger', danger: f.kind, chamber: f.chamber }));
  p.chamber = found[0].chamber;
}

function reactorFails(state, d, c, rng, ask) {
  d.done = true; d.failed = true; d.work = 0;
  journal(state, 'failed', c.id);
  const deck = d.deck;
  const pool = state.buildings.filter((b) => deckOf(b) === deck && finished(b) && b.key !== 'road' && b.key !== 'seal');
  const hit = [];
  for (let k = between(rng, SECRET.reactorDamage); k > 0 && pool.length; k--) {
    const b = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    b.damaged = Math.max(b.damaged || 0, between(rng, SECRET.reactorDamageDays));
    hit.push(b);
  }
  const shut = state.chambers.filter((k) => deckOf(k) === deck && (k.status === 'surveyed' || k.status === 'pressurising'));
  const resealed = [];
  for (let k = SECRET.reactorReseal; k > 0 && shut.length; k--) {
    const x = shut.splice(Math.floor(rng() * shut.length), 1)[0];
    x.status = 'sealed'; x.work = 0;
    resealed.push(x);
  }
  const text = `Governor, the old core in ${c.name} tore loose before it was stabilised. The ${deck} deck shook from end to end`
    + `${hit.length ? `: ${plural(hit.length, 'building')} knocked out until repaired (${hit.map((b) => BUILDING[b.key].name).join(', ')})` : ''}`
    + `${resealed.length ? `, and ${resealed.map((x) => x.name).join(' and ')} slammed shut again: survey ${resealed.length === 1 ? 'it' : 'them'} again` : ''}. `
    + 'The core has burned itself out at least: it will not stir again.';
  const p = ask('reactor', 'The old core tore loose', text);
  p.speaker = 'sato'; p.chamber = c.id; p.damaged = hit.map((b) => b.id); p.resealed = resealed.map((x) => x.id);
}

// ---------------------------------------------------------------- survivors

const groupReady = (state, g) => !g?.requires?.key || secretsOf(state).read.includes(g.requires.key);
function join(state, s, ask) {
  const g = GROUP[s.ref];
  s.done = true;
  state.pop += g.pop;
  journal(state, 'joined', s.ref);
  let extra = '';
  // They come with what they kept alive: a few weeks of food, water and air each (always), so a group of
  // thirty doesn't starve the colony overnight (owner asked for an easier game).
  state.stock.food += g.pop * 12; state.stock.air += g.pop * 10; state.stock.water += g.pop * 12;
  extra += ` They bring ${g.pop * 12} food, ${g.pop * 12} water and ${g.pop * 10} air from their stores.`;
  if (g.commander && COMMANDER[g.commander] && !state.commanders.some((c) => c.key === g.commander)) {
    state.commanders.push({ key: g.commander, loyalty: COMMANDER[g.commander].loyalty ?? 60, injured: 0, dept: null });
    extra += ` ${COMMANDER[g.commander].name} joins Eden's commanders (${COMMANDER[g.commander].title}).`;
  }
  const c = chamberOf(state, s.chamber);
  const text = `${g.name} came out of hiding in ${c.name}: ${plural(g.pop, 'person', 'people')} join the colony. ${g.text}${extra}`;
  log(state, `${g.name} joined the colony (${g.pop}).`);
  const p = (ask || ((k, t, x) => addPending(state, k, t, x)))('survivors', 'Survivors', text);
  p.speaker = 'ruess'; p.chamber = c.id; p.group = g.id; if (g.commander) p.commander = g.commander;
}

// ---------------------------------------------------------------- logs and vaults

export function readLog(state, logId) {
  const l = LOG[logId], s = siteOf(state, logId);
  if (!l || !s || s.kind !== 'log') return no('There is no such log.');
  if (!s.found) return no('That log has not been found yet: survey more chambers.');
  const sec = state.secrets;
  if (sec.read.includes(l.id)) return ok(l.text, { log: l, again: true });
  sec.read.push(l.id); s.done = true;
  journal(state, 'read', l.id);
  const keys = keysRead(state);
  if (l.key) log(state, `A part of the Ninefold code: ${keys} of ${FINAL_CODE_PARTS}.`);
  return ok(l.text, { log: l, key: l.key || null, keys });
}

// What a vault needs: [{ need, label, met }] (the journal's checklist); `open`: its chamber holds air.
export function vaultNeeds(state, site) {
  const v = VAULT[site.ref], c = chamberOf(state, site.chamber), rq = v.requires || {}, out = [];
  out.push({ need: 'open', label: `${c.name} open (pressurised)`, met: c.status === 'open' });
  for (const k of Object.keys(rq)) {   // in the order the data lists them
    if (k === 'key') out.push({ need: 'key', label: `Read "${LOG[rq.key].title}"`, met: secretsOf(state).read.includes(rq.key) });
    else if (k === 'drained') { const n = marshLeft(state, c); out.push({ need: 'drained', label: `No flooded ground in ${c.name}${n ? ` (${n} tiles left)` : ''}`, met: n === 0 }); }
    else if (k === 'cleared') { const d = dangerIn(state, c.id); out.push({ need: 'cleared', label: d ? `${c.name}: ${DANGERS[d.kind].name.toLowerCase()} dealt with` : `${c.name} safe`, met: !d || !!d.done }); }
    else if (k === 'power') { const p = powerOf(state), spare = Math.floor(p.supply - p.demand); out.push({ need: 'power', label: `${rq.power} spare power (now ${spare})`, met: spare >= rq.power }); }
    else if (k === 'code') out.push({ need: 'code', label: `All ${FINAL_CODE_PARTS} parts of the code (${keysRead(state)} read)`, met: keysRead(state) >= FINAL_CODE_PARTS });
  }
  return out;
}

export function openVault(state, siteId) {
  const s = siteOf(state, siteId);
  if (!s || s.kind !== 'vault') return no('There is no such vault.');
  if (!s.found) return no('Nobody has found that vault yet.');
  if (s.done) return no(`${VAULT[s.ref].name} is already open.`);
  const unmet = vaultNeeds(state, s).find((n) => !n.met);
  if (unmet) return no(`${VAULT[s.ref].name} stays shut: ${unmet.label[0].toLowerCase()}${unmet.label.slice(1)} first.`);
  const v = VAULT[s.ref], r = v.reward || {}, got = [];
  s.done = true;
  journal(state, 'opened', v.id);
  if (r.goods) got.push(...addGoods(state, r.goods));
  if (r.research) { state.research.points += r.research; got.push(`${r.research} research points`); }
  if (r.tech && TECH[r.tech]) got.push(finishTech(state, r.tech));
  if (r.machine !== undefined) { const g = addGuardian(state, r.machine, { proto: true }); got.push(`the ${machineOf(state, g.type).name} (${machineOf(state, g.type).code || 'prototype'}) joins the guardians`); }
  if (r.soil) { const n = enrich(state, s, r.soil); if (n) got.push(`${n} tiles of ${chamberOf(state, s.chamber).name} made fertile`); }
  if (r.survivors) { const g = secretsOf(state).sites.find((x) => x.kind === 'survivors' && x.ref === r.survivors && !x.done); if (g) { g.found = true; join(state, g); } }
  const text = `${v.name} opened. ${v.text}${got.length ? ` Inside: ${got.join('; ')}.` : ''}`;
  log(state, `${v.name} opened.`);
  if (r.final) {
    state.secrets.finalOpened = true;
    journal(state, 'final', v.id);
    const marrow = state.commanders.some((c) => c.key === 'marrow');
    const p = addPending(state, 'finalvault', 'The Ninefold vault', `${text} The test logs, Major Hesk's orders, the Marshal's own seal on the authorisation, and the registry of every soul who lived on Eden. ${marrow ? 'Warden Marrow asks to read the names aloud.' : 'Marrow\'s voice is on the registry\'s first recording, reading the names.'}`);
    p.speaker = 'ruess'; p.speakers = ['ruess', 'sato', 'marrow']; p.marrow = marrow; p.chamber = s.chamber;
  }
  return ok(text, { reward: r, final: !!r.final });
}

// Goods into the stores; what will not fit is sold to the traders at the base price.
function addGoods(state, goods) {
  const cap = storageCaps(state), out = [];
  let sold = 0;
  for (const [g, n] of Object.entries(goods)) {
    if (g === 'credits') { state.stock.credits += n; out.push(`${n} credits`); continue; }
    const room = Math.max(0, Math.floor((cap[g] || 0) - (state.stock[g] || 0))), put = Math.min(n, room);
    state.stock[g] = (state.stock[g] || 0) + put;
    sold += (n - put) * (BASE_PRICE[g] || 1);
    out.push(`${n} ${g}${put < n ? ` (${n - put} more than the stores hold, sold)` : ''}`);
  }
  if (sold) { state.stock.credits += Math.floor(sold); out.push(`${Math.floor(sold)} credits for what would not fit`); }
  return out;
}
function finishTech(state, key) {
  const t = TECH[key], r = state.research;
  if (r.done.includes(key)) return `${t.name} drawings (already known)`;
  r.done.push(key); r.progress[key] = t.cost;
  if (r.focus === key) r.focus = null;
  for (const k of t.unlocks) if (!state.unlocked.includes(k)) state.unlocked.push(k);
  return `the drawings for ${t.name}: ${t.text}`;
}
// Poor soil (then plain) nearest the vault made fertile: up to n tiles of its chamber.
function enrich(state, s, n) {
  const c = chamberOf(state, s.chamber), m = mapOf(state, s.deck), w = state.map.w;
  const d = (i) => Math.max(Math.abs((i % w) - s.x), Math.abs(((i / w) | 0) - s.y));
  const tiles = chamberTiles(state, c), occ = occupancy(state, -1, s.deck);
  let done = 0;
  for (const ter of [T.POOR, T.PLAIN]) {
    for (const i of tiles.filter((j) => m.t[j] === ter && (ter === T.POOR || !occ[j])).sort((a, b) => d(a) - d(b) || a - b)) {
      if (done >= n) return done;
      m.t[i] = T.FERTILE; done++;
    }
  }
  return done;
}

// ---------------------------------------------------------------- the journal's read-out

export function secretStatus(state) {
  const sec = secretsOf(state);
  const ofKind = (k) => sec.sites.filter((s) => s.kind === k);
  const logs = [...LOGS].sort((a, b) => a.order - b.order).map((l) => {
    const s = sec.sites.find((x) => x.ref === l.id);
    const found = !!s?.found;
    return { id: l.id, order: l.order, key: l.key || null, found, read: sec.read.includes(l.id), title: found ? l.title : null, author: found ? l.author : null, chamber: s?.chamber ?? null, deck: s?.deck ?? l.deck, x: found ? s.x : null, y: found ? s.y : null };
  });
  const vaults = ofKind('vault').map((s) => {
    const v = VAULT[s.ref], needs = s.found ? vaultNeeds(state, s) : [];
    return { id: s.id, ref: s.ref, name: v.name, found: s.found, opened: s.done, chamber: s.chamber, deck: s.deck, x: s.x, y: s.y, needs, canOpen: s.found && !s.done && needs.every((n) => n.met), reward: v.reward, final: !!v.reward?.final };
  });
  const survivors = ofKind('survivors').map((s) => {
    const g = GROUP[s.ref], c = chamberOf(state, s.chamber);
    const waiting = !s.found || s.done ? null : c.status !== 'open' ? `Open ${c.name} to bring them in.` : !groupReady(state, g) ? `They wait for word: read "${LOG[g.requires.key].title}".` : null;
    return { id: s.id, ref: s.ref, name: g.name, pop: g.pop, commander: g.commander || null, found: s.found, joined: s.done, chamber: s.chamber, deck: s.deck, x: s.x, y: s.y, waiting };
  });
  const dangers = sec.dangers.filter((d) => d.found).map((d) => dangerPreview(state, d.chamber));
  const reactor = sec.dangers.find((d) => d.kind === 'reactor' && d.found && !d.done && d.deadline !== null);
  return {
    logs: { read: sec.read.length, found: logs.filter((l) => l.found).length, total: LOGS.length, list: logs },
    vaults: { opened: vaults.filter((v) => v.opened).length, found: vaults.filter((v) => v.found).length, total: VAULTS.length, list: vaults },
    survivors: { joined: survivors.filter((g) => g.joined).length, found: survivors.filter((g) => g.found).length, total: SURVIVORS.length, list: survivors },
    dangers, keys: keysRead(state), keysTotal: FINAL_CODE_PARTS, finalOpened: !!sec.finalOpened,
    reactor: reactor ? { chamber: reactor.chamber, deadline: reactor.deadline, left: reactor.deadline - state.day, working: reactor.work > 0 } : null,
    journal: sec.journal.slice(),
  };
}
