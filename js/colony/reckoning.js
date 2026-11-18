// Earthlight Space Colony Rebuild, version 12 (docs/COLONY-V12.md): the story arc "The Reckoning".
// Pure: no DOM. The sim calls reckoningDay() each day; the battles themselves are fought on the hex
// map (js/colony/battle.js siegeMission / strongholdMission, game.html?colony=1) and come back through
// resolveReckoningBattle(). Nothing here is ever auto-resolved: the two battles are played or wait.
//
// Nothing happens until the General decides to broadcast the truth (owner, 2026-11-15):
//   locked      the Ninefold vault is shut
//   ready       the vault is open: Ruess offers the broadcast once (an event), and it stays on offer
//               (the Defence panel's Raids tab) until the General gives the word
//   gathering   broadcast on day B: Hesk and his circle are named and their arrest ordered. They gather
//               a fleet in secret; clues arrive over the next 100 days (CLUES); the siege comes on B + 100
//   siege       Hesk's fleet is at the gates: the Siege of Eden waits to be played (a blockade until then)
//   regroup     the siege was lost: Eden is hurt; they come again on siegeDay (REGROUP days later)
//   strike      the siege was won: the hiding place is known; the counterattack can be launched (again
//               STRIKE_RETRY days after a failed one). The strike has two phases (owner, 2026-11-16):
//               the General's machine always flies (no strike without him fit); phase 1, the AMBUSH, on
//               the way (Hesk's picket, ambushRatio x the strike force by number), then phase 2, HESK'S
//               STRONGHOLD. Once the ambush is won (r.ambushDone) later strikes go straight to phase 2.
//   crossroads  the ambush is won: the General chooses (an event): go home and regroup, or press on
//   onward      pressing on: the strike force goes on as it is (no repairs, no new machines: r.fleet holds
//               each machine's HP) straight into phase 2
//   counter     going home: the fleet mends at Eden, but the picket's survivors and reinforcements follow;
//               on siegeDay they strike Eden (stage siege, siegeKind 'counter': the siege map, new waves).
//               Held: the strike again (phase 2 only), the rock reinforced (r.reinforce +1)
//   done        Hesk's flagship is sunk: the ending "Justice for Eden" (once; remembered; blocks nothing)
// state.reckoning = { stage, offered, broadcast, siegeDay, siegeKind: 'siege' | 'counter', clues: [ids],
//                     fighting: null | 'siege' | 'counter' | 'ambush' | 'stronghold', sieges: [{ day, won, ... }],
//                     strikes: [{ phase, ... }], nextStrike, ambushDone, reinforce, fleet: [{ id, hp }] | null,
//                     survivors: [{ type, level }], onward, justice: { day, ... } | null }
import { addPending, log, maxHp, fitCommander, addGuardian, homeCrew, V3, RAID } from './rules.js';   // used inside functions only (rules.js imports this module back)
import { shiftMood } from './neighbours.js';
import { MACHINE } from './data/machines.js';

export const RECKONING = {
  countdown: 100,          // days from the broadcast to the siege
  regroup: 60,             // days after a lost siege before they come again
  warnBefore: 10,          // a last warning this many days before a siege
  strikeRetry: 30,         // days after a failed counterattack before the next
  ambushRatio: 1.5,        // phase 1: Hesk's picket is this many times the strike force, by number of machines
  ambushLevels: 2,         // ... its pilots this many levels below the strike force's mean (at least 0)
  ambushLighter: 2,        // ... and this many slots in every 3 one tier lighter than the strike force's own
  ambushFloor: 12,         // ... and never fewer than this (a tiny strike force still meets a real ambush)
  survivorsCap: 20,        // the picket's survivors who follow the fleet home and strike Eden (a regroup)
  counterDelay: 12,        // days after going home before the picket and its reinforcements strike Eden
  afterCounter: 10,        // days after holding the counterstrike before the strike can go again
  reinforceStep: 8,        // machines the rock gains each time Hesk has time (a regroup, a failed assault) ...
  reinforceMax: 3,         // ... at most this many times (each also +1 level for every enemy)
  blockade: 1.2,           // market prices are held at least this high while the siege waits
  remind: 7,               // days between the blockade's reminders
  salvage: { credits: 40, parts: 4 },   // per enemy machine destroyed (a won battle)
  siegeLoss: { steal: [0.3, 0.45], damage: [4, 7], days: [10, 20], fear: -15 },
  truth: 8, won: 10, justice: 12,       // happiness (a mood that fades, as the raids' fear does)
};
export const CONSPIRATORS = [
  { name: 'Major Aurel Hesk', role: 'Directorate, commanding Site Ninefold: invoked Protocol Ash' },
  { name: 'Commodore Anselm Varr', role: 'Union fleet: flew the evacuation and logged it as a Galt attack' },
  { name: 'Deputy Director Corva Quill', role: 'Directorate finance: paid for the rig, then for the silence' },
  { name: 'Captain Renn Osk', role: 'Ninefold security: sealed the lift locks on day 211' },
];

// The clues (days after the broadcast). speaker: whose face the event shows; `when`: only if that
// commander serves (else the fallback line); effect: what it does to the colony.
export const CLUES = [
  { id: 'c1', at: 9, speaker: 'ruess', title: 'Silence on the wire',
    text: 'The Council confirms the arrest warrants. Not one of the four named has been found. Their accounts were emptied the day before the broadcast.',
    quote: 'Somebody warned them. Or they always kept a bag packed. Either way, men like Hesk do not run to hide. They run to regroup.' },
  { id: 'c2', at: 21, speaker: 'sato', title: 'Traders gone missing', effect: 'prices',
    text: 'Two of the regular freighters missed their slots at the dock, and a third arrived half empty. Prices at the Market are up.',
    quote: 'They did not get lost. Someone is paying them better than we do, somewhere we cannot see.' },
  { id: 'c3', at: 34, speaker: 'sato', title: 'A warning from the Union', effect: 'union',
    text: 'The Union remnant sends a short message: Directorate transponders have been seen burning towards the far belt, a long way from any colony.',
    quote: 'They wrote it in the old fleet cipher. That is the Union saying sorry without having to say it.' },
  { id: 'c4', at: 46, speaker: 'general', title: 'One of ours, for sale', choice: true,
    text: 'The dock crew caught a trader trying to sell an Athena Kai, still in Eden\'s old colours: one of the machines the General sold to pay for the air plants. He says a buyer is taking every one he can find, at twice the price.',
    quote: 'I know that machine. I signed it away myself.' },
  { id: 'c5', at: 58, speaker: 'ruess', title: 'Prices climbing', effect: 'prices',
    text: 'Helium, alloy and parts are scarce on every route. Someone is buying them by the shipload and paying the traders to forget where they took them.',
    quote: 'A fleet eats alloy. I have done the sums three times, Governor. This is not a few ships. It is dozens.' },
  { id: 'c6', at: 70, speaker: 'sato', title: 'The Galt remember', effect: 'galt',
    text: 'The Galt remnant, blamed for eleven years for what Hesk did, send their own word: a cartel convoy changed course near their bunkers, and its escort flew Directorate formation.',
    quote: 'The Galt were the scapegoat. Now they are the ones warning us. Funny how the truth rearranges people.' },
  { id: 'c7', at: 82, speaker: 'marrow', alt: 'ruess', title: 'Hesk\'s voice',
    text: 'A recording reaches Eden on a dead relay, addressed to the General. Hesk, calm: "You broadcast my name. I will come and collect it."',
    quote: 'He used that voice on day 211 too, on the lift intercom, telling us to stay calm. I would know it anywhere.',
    altQuote: 'He sounds like a man who has already decided how this ends. So have we, Governor.' },
  { id: 'c8', at: 92, speaker: 'sato', title: 'The dens go quiet',
    text: 'For a week now no raider has come near Eden. Every den on the chart is quiet, and the traders have stopped coming altogether.',
    quote: 'Everyone else has got out of the way. Crew every machine, fill every emplacement. They are coming in about a week, and from more than one side.' },
];

const ok = (msg, extra) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });
const rngOf = (state, salt) => {   // the arc's own dice (the colony's main generator is not touched)
  let h = 2166136261;
  for (const c of `${state.seed}:${state.day}:${salt}:reckoning`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const between = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
const serves = (state, key) => (state.commanders || []).some((c) => c.key === key);
function cheer(state, label, value) {
  state.raid ??= {}; state.raid.moods ??= [];
  state.raid.moods.push({ label, value, day: state.day, days: RAID?.fear?.days ?? 20 });
}

export function ensureReckoning(state) {
  state.reckoning ??= { stage: 'locked', offered: false, broadcast: null, siegeDay: null, siegeKind: 'siege', clues: [], fighting: null, sieges: [], strikes: [], nextStrike: null, ambushDone: false, reinforce: 0, fleet: null, survivors: [], onward: false, justice: null, lastRemind: null };
  const r = state.reckoning;
  r.clues ??= []; r.sieges ??= []; r.strikes ??= []; r.justice ??= null; r.siegeKind ??= 'siege'; r.reinforce ??= 0; r.survivors ??= []; r.ambushDone ??= false;
  // an old save sent home to regroup without a counterstrike date (or kind): it still comes, the day after
  if (r.stage === 'counter') { r.siegeKind = 'counter'; if (r.siegeDay == null) r.siegeDay = (state.day || 0) + 1; }
  if (r.stage === 'locked' && state.secrets?.finalOpened) r.stage = 'ready';
  return r;
}

export const canBroadcast = (state) => ensureReckoning(state).stage === 'ready';
export const siegeWaiting = (state) => ensureReckoning(state).stage === 'siege';
export const strikeReady = (state) => { const r = ensureReckoning(state); return (r.stage === 'strike' && (r.nextStrike == null || state.day >= r.nextStrike)) || r.stage === 'onward'; };
// The General must lead the strike: serving, fit, and his machine crewed at home and flying (not a rail gun).
export function generalReady(state) {
  if (!fitCommander(state, 'general')) return no((state.commanders || []).some((c) => c.key === 'general') ? 'The General is injured: the strike waits until he is fit.' : 'The General must lead the strike, and he does not serve.');
  const g = (state.guardians || []).find((x) => x.commander === 'general');
  if (!g) return no('The General has no machine: give him one (Commanders) before the strike.');
  if (MACHINE[g.type]?.category === 14) return no('The General\'s machine is a rail gun: it cannot fly the strike.');
  if (!(g.hp > 0) || g.away || !homeCrew(state).has(g.id)) return no('The General\'s machine must be crewed and at home.');
  return ok('The General is ready.', { id: g.id });
}
// The strike's next phase: 'ambush' (phase 1) until it is won once, then 'stronghold'; null when no strike is on.
export function strikePhase(state) {
  const r = ensureReckoning(state);
  return r.stage === 'onward' ? 'stronghold' : r.stage === 'strike' ? (r.ambushDone ? 'stronghold' : 'ambush') : null;
}
export const justiceDone = (state) => !!ensureReckoning(state).justice;

// What the panels read.
export function reckoningStatus(state) {
  const r = ensureReckoning(state);
  return {
    stage: r.stage, broadcast: r.broadcast, siegeDay: r.siegeDay, eta: r.siegeDay != null ? Math.max(0, r.siegeDay - state.day) : null,
    clues: r.clues.length, cluesTotal: CLUES.length, fighting: r.fighting, sieges: r.sieges.length, strikes: r.strikes.length,
    canBroadcast: r.stage === 'ready', siege: r.stage === 'siege', siegeKind: r.siegeKind, strike: strikeReady(state), nextStrike: r.nextStrike, justice: r.justice,
    phase: strikePhase(state), ambushDone: !!r.ambushDone, reinforce: r.reinforce || 0, onward: r.stage === 'onward', fleet: r.fleet ? r.fleet.length : 0,
    fleetHp: r.fleet?.length ? Math.round((100 * r.fleet.reduce((t, f) => t + f.hp, 0)) / r.fleet.length) : null, survivors: (r.survivors || []).length,
    afterCounter: RECKONING.afterCounter,
  };
}

const BROADCAST_TEXT = 'Ruess has every page of the Ninefold vault ready to go out on every channel at once: the test logs, Hesk\'s orders, the Marshal\'s seal, and the names of the people who signed them. Once it is sent, it cannot be taken back. Those people are still alive, still rich, and still armed.';

// The broadcast: the truth on every channel, the four named, their arrest ordered.
export function broadcast(state) {
  const r = ensureReckoning(state);
  if (r.stage === 'locked') return no('The Ninefold vault is still shut: there is nothing to broadcast yet.');
  if (r.stage !== 'ready') return no('The truth is already out.');
  r.stage = 'gathering'; r.broadcast = state.day; r.siegeDay = state.day + RECKONING.countdown; r.offered = true;
  state.pending = state.pending.filter((p) => !(p.kind === 'reckoning' && p.step === 'offer'));
  cheer(state, 'The truth is out', RECKONING.truth);
  try { shiftMood(state, 'galt', 15, 'Eden cleared their name'); shiftMood(state, 'union', 5, 'the broadcast'); } catch { /* neighbours off or not set up */ }
  const names = CONSPIRATORS.map((c) => c.name).join(', ');
  log(state, `Day ${state.day}: the truth about Eden is broadcast. ${names}: arrest ordered.`);
  const p = addPending(state, 'reckoning', 'The broadcast',
    `It goes out on every channel at once: the logs, the orders, the seal, the registry. At the end Ruess reads four names and the order that goes with them: ${names}, to be arrested and brought to answer for Protocol Ash. Across the Union, people stop what they are doing to listen.`,
    [{ key: 'ok', label: 'Let them come' }]);
  p.speaker = 'ruess'; p.step = 'broadcast'; p.tone = 'good';
  p.quote = 'Eleven thousand four hundred and two people were told a lie. As of this morning, none of them are.';
  p.conspirators = CONSPIRATORS;
  return ok(`The truth is broadcast. ${names}: arrest ordered.`);
}

// The event choices (rules.js answer(): kind 'reckoning').
export function answerReckoning(state, p, key) {
  const r = ensureReckoning(state);
  if (p.step === 'offer') {
    if (key === 'broadcast') return broadcast(state);
    state.pending = state.pending.filter((x) => x.id !== p.id);
    return ok('Not yet. The broadcast waits in the Defence panel (Raids) for whenever you are ready.');
  }
  if (p.step === 'crossroads') return crossroads(state, r, p, key);
  if (p.step === 'clue' && p.clue === 'c4') {
    state.pending = state.pending.filter((x) => x.id !== p.id);
    if (key === 'seize') {
      const g = addGuardian(state, 73, { level: 5 });
      try { shiftMood(state, 'cartel', -8, 'a trader\'s machine seized'); } catch { }
      log(state, 'The old Athena Kai is back in Eden\'s colours.');
      return ok(`The Athena Kai${g ? '' : ''} is seized and joins the guardians. The trader talks: the buyer pays in Directorate scrip.`);
    }
    try { shiftMood(state, 'cartel', 3, 'a trader let go'); } catch { }
    return ok('The trader goes, and a guardian follows his ship as far as the belt before losing him.');
  }
  state.pending = state.pending.filter((x) => x.id !== p.id);
  return ok(`${p.title}.`);
}

// Each day (sim.js, late): the offer, the clues, the countdown, the blockade.
export function reckoningDay(state, { say, ask }) {
  const r = ensureReckoning(state);
  if (r.stage === 'ready' && !r.offered) {
    r.offered = true;
    const p = ask('reckoning', 'The truth, out loud', BROADCAST_TEXT);
    p.choices = [{ key: 'broadcast', label: 'Broadcast now' }, { key: 'later', label: 'Not yet' }];
    p.speaker = 'ruess'; p.step = 'offer';
    p.quote = 'We have the proof, Governor. The Council has a copy. The people who did this do not know we have it yet. The moment we say their names, that changes.';
    return;
  }
  if (r.stage === 'gathering') {
    const since = state.day - r.broadcast;
    const c = CLUES.find((x) => since >= x.at && !r.clues.includes(x.id));
    if (c) clue(state, r, c, ask);
  }
  if (r.stage === 'counter' && r.siegeDay != null && state.day >= r.siegeDay) {
    r.stage = 'siege'; r.siegeKind = 'counter'; r.lastRemind = state.day;
    const n = (r.survivors || []).length;
    const p = ask('reckoning', 'Hesk strikes Eden', `The picket followed the fleet home${n ? `: ${n} of the machines that ambushed it, ` : ', '}with reinforcements behind them. They are in the east, by the old breach, and more are coming. This battle is fought on the map, turn by turn.`);
    p.speaker = 'sato'; p.step = 'siege'; p.tone = 'bad'; p.battle = 'counter';
    p.quote = 'They want us to spend ourselves here, so the rock has time. Then we hold, and we go back.';
    p.choices = [{ key: 'ok', label: 'Not yet: hold the gates' }];
    return;
  }
  if ((r.stage === 'gathering' || r.stage === 'regroup') && r.siegeDay != null) {
    if (r.stage === 'regroup' && state.day === r.siegeDay - RECKONING.warnBefore) {
      const p = ask('reckoning', 'They are coming back', `Hesk's fleet has rebuilt what Eden broke. They will be at the gates again in about ${RECKONING.warnBefore} days.`);
      p.speaker = 'sato'; p.step = 'warn'; p.tone = 'warn';
      p.quote = 'Same rock, same man, more guns. This time we know the way they come in.';
    }
    if (state.day >= r.siegeDay && r.siegeKind === 'counter') {   // they come back after a lost counterstrike
      r.stage = 'siege'; r.lastRemind = state.day;
      const p = ask('reckoning', 'Hesk strikes Eden again', 'The picket and its reinforcements are back at the gates, from the east first. This battle is fought on the map, turn by turn.');
      p.speaker = 'sato'; p.step = 'siege'; p.tone = 'bad'; p.battle = 'counter';
      p.quote = 'Same faces, more guns. We know their way in now.';
      p.choices = [{ key: 'ok', label: 'Not yet: hold the gates' }];
    } else if (state.day >= r.siegeDay) {
      r.stage = 'siege'; r.lastRemind = state.day;
      const p = ask('reckoning', 'The Siege of Eden', 'Hesk\'s fleet is at the gates: Directorate hulls, cartel guns and the machines Eden once sold, from the north first and more behind them. Nobody is trading with Eden until this is settled. This battle is fought on the map, turn by turn: there is no paying these people off.');
      p.speaker = 'sato'; p.step = 'siege'; p.tone = 'bad'; p.battle = 'siege';
      p.quote = 'Every crew to their machine. The General leads. Whatever we built for this day, we use it now.';
      p.choices = [{ key: 'ok', label: 'Not yet: hold the gates' }];
    }
  }
  if (r.stage === 'siege') {
    for (const g of Object.keys(state.market || {})) state.market[g] = Math.max(state.market[g], RECKONING.blockade);
    if (!r.fighting && state.day - (r.lastRemind ?? state.day) >= RECKONING.remind) {
      r.lastRemind = state.day;
      say('reckoning', 'Hesk\'s fleet still blockades Eden: prices stay high until the siege is fought (Defence › Raids).');
    }
  }
}

function clue(state, r, c, ask) {
  r.clues.push(c.id);
  const who = c.when ? c.when : c.speaker, alt = c.speaker === 'marrow' && !serves(state, 'marrow');
  const p = ask('reckoning', c.title, c.text);
  p.speaker = alt ? c.alt : who; p.quote = alt ? c.altQuote : c.quote; p.step = 'clue'; p.clue = c.id; p.tone = 'warn';
  if (c.choice) p.choices = [{ key: 'seize', label: 'Seize the machine' }, { key: 'release', label: 'Let him go, and follow him' }];
  if (c.effect === 'prices') for (const g of Object.keys(state.market || {})) state.market[g] = Math.max(state.market[g], 1.12);
  try {
    if (c.effect === 'union') shiftMood(state, 'union', 4, 'the warning');
    if (c.effect === 'galt') shiftMood(state, 'galt', 4, 'the warning');
  } catch { }
  log(state, `The Reckoning: ${c.title}.`);
}

// ---------------------------------------------------------------- the battles' results
// result: js/expansion/battle.js colonyResult with the Reckoning's extras
// { battle, won, reason, turns, enemies, enemiesDestroyed, cortexLost, dockLost, gunsLost, flagshipSunk, survivors: [{ type, level }],
//   guardians: [{ id, hp, lost }] }   battle: 'siege' | 'counter' | 'ambush' | 'stronghold'
export const RECKONING_BATTLES = ['siege', 'counter', 'ambush', 'stronghold'];
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const tally = (types) => { const c = new Map(); for (const t of types) { const k = MACHINE[t]?.name || `machine ${t}`; c.set(k, (c.get(k) || 0) + 1); } return [...c].map(([k, v]) => (v > 1 ? `${v} ${k}` : k)).join(', '); };
export function resolveReckoningBattle(state, res) {
  const r = ensureReckoning(state);
  if (!res || !RECKONING_BATTLES.includes(res.battle)) return no('That is not one of the Reckoning\'s battles.');
  if (r.fighting !== res.battle) return no('No such battle is being fought.');
  r.fighting = null;
  const rng = rngOf(state, res.battle), lost = [], kept = [];
  for (const x of res.guardians || []) {
    const g = state.guardians.find((v) => v.id === x.id);
    if (!g) continue;
    if (x.lost || !(x.hp > 0)) {
      lost.push(g.type);
      const c = g.commander && (state.commanders || []).find((v) => v.key === g.commander);
      if (c) c.injured = between(rng, V3?.injury || [20, 40]);
      state.guardians.splice(state.guardians.indexOf(g), 1);
    } else {
      const max = maxHp(state, g);
      g.hp = Math.round(Math.min(max, Math.max(0.1, x.hp * max)) * 10) / 10;
      g.level = Math.min(V3?.maxLevel ?? 9, (g.level || 0) + (fitCommander(state, g.commander) ? 2 : 1));
      kept.push({ id: g.id, hp: Math.max(0, Math.min(1, x.hp)) });
    }
  }
  const won = !!res.won, killed = res.enemiesDestroyed || 0;
  const entry = { day: state.day, won, reason: res.reason || null, turns: res.turns || null, killed, enemies: res.enemies || null, lost: lost.length, phase: res.battle };
  const salvage = won ? { credits: killed * RECKONING.salvage.credits, parts: killed * RECKONING.salvage.parts } : { credits: 0, parts: 0 };
  state.stock.credits += salvage.credits; state.stock.parts += salvage.parts;
  let text;
  if (res.battle === 'siege' || res.battle === 'counter') {
    const counter = res.battle === 'counter';
    r.sieges.push(counter ? { ...entry, counter: true } : entry);
    if (won && counter) {
      r.stage = 'strike'; r.siegeDay = null; r.siegeKind = 'siege'; r.survivors = []; r.ambushDone = true;
      r.reinforce = Math.min(RECKONING.reinforceMax, (r.reinforce || 0) + 1); r.nextStrike = state.day + RECKONING.afterCounter;
      cheer(state, 'Eden held again', RECKONING.won);
      for (const g of Object.keys(state.market || {})) state.market[g] = Math.min(state.market[g], 1);
      text = `Eden holds against the counterstrike: ${killed} of their machines destroyed, ${plural(lost.length, 'guardian')} lost. Salvage: ${salvage.credits} credits and ${salvage.parts} parts. The picket is spent: the way to the rock is open.`;
      const p = addPending(state, 'reckoning', 'The way is open', `${text} The next strike goes straight to Hesk's stronghold, in about ${RECKONING.afterCounter} days. He has used the time too: the rock is stronger than it was.`, [{ key: 'ok', label: 'Mend, then go' }]);
      p.speaker = 'sato'; p.step = 'counterwon'; p.tone = 'good'; p.entry = entry;
      p.quote = 'Nobody is waiting on the road this time. Only at the end of it.';
    } else if (won) {
      r.stage = 'strike'; r.siegeDay = null; r.nextStrike = state.day;
      cheer(state, 'Eden held', RECKONING.won);
      for (const g of Object.keys(state.market || {})) state.market[g] = Math.min(state.market[g], 1);
      text = `The Siege of Eden is broken: ${killed} of their machines destroyed, ${lost.length} guardian${lost.length === 1 ? '' : 's'} lost. Salvage: ${salvage.credits} credits and ${salvage.parts} parts. A captured pilot gives up the hiding place.`;
      const p = addPending(state, 'reckoning', 'The hiding place', `${text} Hesk's fleet came from a nameless rock beyond the far belt, an old Directorate quarry dug into a fortress. That is where he is now, with everything he has left. The road there is long, and he will not leave it unguarded.`, [{ key: 'ok', label: 'We go to him' }]);
      p.speaker = 'sato'; p.step = 'hideout'; p.tone = 'good'; p.entry = entry;
      p.quote = 'He will have turned that rock into a trap, and he will be waiting on the way to it too. Every machine we can crew, Governor, and the General leads them. No General, no strike.';
    } else {
      const loss = siegeLoss(state, rng, res);
      r.stage = 'regroup'; r.siegeDay = state.day + RECKONING.regroup;
      cheer(state, 'Eden overrun', RECKONING.siegeLoss.fear);
      text = `Eden fell to the ${counter ? 'counterstrike' : 'siege'}. ${Object.entries(loss.stolen).map(([g, n]) => `${n} ${g}`).join(', ') || 'Little'} carried off; ${loss.damaged} building${loss.damaged === 1 ? '' : 's'} knocked out; ${lost.length} guardian${lost.length === 1 ? '' : 's'} lost. Hesk's fleet withdraws to lick its wounds.`;
      const p = addPending(state, 'reckoning', counter ? 'After the counterstrike' : 'After the siege', `${text} They will be back in about ${RECKONING.regroup} days.`, [{ key: 'ok', label: 'Rebuild' }]);
      p.speaker = 'ruess'; p.step = 'siegelost'; p.tone = 'bad'; p.entry = { ...entry, ...loss };
      p.quote = 'They took what they could carry and broke what they could not. They did not take the truth, Governor. That is still out there.';
    }
  } else if (res.battle === 'ambush') {
    r.strikes.push(entry);
    if (won) {
      r.stage = 'crossroads'; r.fleet = kept; r.onward = false;
      r.survivors = (res.survivors || []).slice(0, RECKONING.survivorsCap).map((u) => ({ type: u.type, level: u.level || 0, ...(u.name ? { name: u.name } : {}) }));
      const n = kept.length, hp = n ? Math.round((100 * kept.reduce((t, f) => t + f.hp, 0)) / n) : 0, left = (res.survivors || []).length;
      text = `The ambush is broken: ${killed} of the picket destroyed${left ? `, ${left} still out there` : ''}. ${plural(lost.length, 'machine')} lost${lost.length ? ` (${tally(lost)})` : ''}; ${n} fly on, at ${hp}% of their strength.`;
      const p = addPending(state, 'reckoning', 'The General decides', text, [{ key: 'regroup', label: 'Go home and regroup' }, { key: 'proceed', label: 'Press on to the stronghold' }]);
      p.speaker = 'general'; p.step = 'crossroads'; p.tone = 'warn'; p.battle = 'stronghold';
      p.quote = 'We can go home and mend, and let him come to us. Or we go now, while he still thinks his picket stopped us.';
      p.summary = { fleet: n, hp, lost: lost.length, lostList: tally(lost), killed, survivors: left, reinforce: r.reinforce || 0 };
      p.options = [
        ['Go home and regroup', `The fleet flies home and mends at Eden as usual, and new machines can join. But the picket${left ? `'s ${left} survivors` : ''} and fresh reinforcements follow: in about ${RECKONING.counterDelay} days they strike Eden (a defence on the siege map). Hold, and ${RECKONING.afterCounter} days later the strike goes straight to the rock with a fresh fleet you pick (any crewed machines at home), though the rock will be stronger by then.`],
        ['Press on to the stronghold', `Straight into the battle for the rock with the ${n} machine${n === 1 ? '' : 's'} left, at the HP they have now: no repairs, no new machines. The picket is scattered, and the rock has had no time to prepare.`],
      ];
    } else {
      r.stage = 'strike'; r.nextStrike = state.day + RECKONING.strikeRetry; r.fleet = null;
      text = `The strike force never reached the rock: the ambush ${res.reason === 'general' ? 'brought down the General\'s machine' : 'broke it'}. ${killed} of the picket destroyed, ${plural(lost.length, 'guardian')} lost. The fleet can try again in ${RECKONING.strikeRetry} days.`;
      const p = addPending(state, 'reckoning', 'Back from the ambush', text, [{ key: 'ok', label: 'Again, when we are ready' }]);
      p.speaker = 'sato'; p.step = 'strikelost'; p.tone = 'bad'; p.entry = entry;
      p.quote = 'Now we know where they wait. Next time we fly in ready for it.';
    }
  } else {
    r.strikes.push(entry);
    const onward = r.onward;
    r.onward = false; r.fleet = null; r.survivors = []; r.ambushDone = true;
    if (won) {
      r.stage = 'done';
      r.justice = {
        day: state.day, pop: Math.floor(state.pop || 0), broadcast: r.broadcast, sieges: r.sieges.length, strikes: r.strikes.filter((x) => x.phase !== 'ambush').length,
        destroyed: [...r.sieges, ...r.strikes].reduce((t, s) => t + (s.killed || 0), 0), lost: [...r.sieges, ...r.strikes].reduce((t, s) => t + (s.lost || 0), 0),
        difficulty: state.difficulty === 'easy' ? 'easy' : 'normal',
      };
      cheer(state, 'Justice for Eden', RECKONING.justice);
      text = `Major Hesk's flagship, the Verdict, is sunk. ${killed} of his machines destroyed; ${lost.length} guardian${lost.length === 1 ? '' : 's'} lost.`;
      log(state, `Day ${state.day}: Justice for Eden. ${text}`);
      const p = addPending(state, 'justice', 'Justice for Eden', JUSTICE_TEXT, [{ key: 'keep', label: 'Keep building Eden' }]);
      p.speaker = 'general';
    } else {
      r.stage = 'strike'; r.nextStrike = state.day + RECKONING.strikeRetry;
      r.reinforce = Math.min(RECKONING.reinforceMax, (r.reinforce || 0) + 1);
      text = `The strike on Hesk's stronghold failed${onward ? ': what was left of the strike force limps home' : ''}. ${killed} of his machines destroyed, ${lost.length} guardian${lost.length === 1 ? '' : 's'} lost. The rock will be stronger next time. The fleet can go straight back in ${RECKONING.strikeRetry} days.`;
      const p = addPending(state, 'reckoning', 'Back from the rock', text, [{ key: 'ok', label: 'Again, when we are ready' }]);
      p.speaker = 'sato'; p.step = 'strikelost'; p.tone = 'bad'; p.entry = entry;
      p.quote = 'We know the rock now: every gun, every ridge, every place they hid. Next time they are the ones who get surprised.';
    }
  }
  log(state, text);
  return ok(text, { entry, salvage });
}

// The General's choice after the ambush: home (the counterstrike follows) or on (phase 2 at once, as they are).
function crossroads(state, r, p, key) {
  if (r.stage !== 'crossroads') { state.pending = state.pending.filter((x) => x.id !== p.id); return no('That choice has passed.'); }
  if (key !== 'regroup' && key !== 'proceed') return no('Go home, or press on.');
  state.pending = state.pending.filter((x) => x.id !== p.id);
  if (key === 'proceed') {
    r.stage = 'onward'; r.onward = true;
    log(state, 'The General presses on to Hesk\'s stronghold.');
    return ok('The strike force presses on to the rock, as it is.');
  }
  r.stage = 'counter'; r.onward = false; r.fleet = null; r.siegeDay = state.day + RECKONING.counterDelay; r.siegeKind = 'counter';
  log(state, 'The General brings the strike force home to regroup.');
  const w = addPending(state, 'reckoning', 'They are following', `The strike force is coming home to mend. Behind it, the picket${r.survivors.length ? `'s ${r.survivors.length} survivors` : ''} and fresh Directorate machines: they will strike Eden in about ${RECKONING.counterDelay} days. Crew every machine and fill every emplacement. Hold them, and ${RECKONING.afterCounter} days later strike the stronghold with a fresh fleet of your choice.`, [{ key: 'ok', label: 'Ready the defences' }]);
  w.speaker = 'sato'; w.step = 'warn'; w.tone = 'warn';
  w.quote = 'Let them come to us. Our walls, our guns. Then we go to his.';
  return ok(`Home to regroup: the picket follows you home: expect them in about ${RECKONING.counterDelay} days. Then strike the stronghold with a fresh fleet.`);
}

// A lost siege: stores carried off, buildings knocked out (the dock for certain if it fell).
function siegeLoss(state, rng, res) {
  const L = RECKONING.siegeLoss, frac = L.steal[0] + rng() * (L.steal[1] - L.steal[0]), stolen = {};
  for (const g of ['food', 'parts', 'alloy', 'credits']) {
    const n = Math.floor((state.stock[g] || 0) * frac);
    if (n > 0) { state.stock[g] -= n; stolen[g] = n; }
  }
  const pool = (state.buildings || []).filter((b) => b.build === 0 && !(b.damaged > 0) && b.key !== 'command');
  let damaged = 0;
  const dock = res.dockLost && pool.find((b) => b.key === 'dock');
  if (dock) { dock.damaged = between(rng, L.days); pool.splice(pool.indexOf(dock), 1); damaged++; }
  for (let k = between(rng, L.damage); k > 0 && pool.length; k--) {
    const b = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    b.damaged = between(rng, L.days); damaged++;
  }
  return { stolen, damaged };
}

// The ending (ui.js shows it in the victory style, with Eden's registry read aloud).
export const JUSTICE_TEXT = 'The Verdict breaks apart above the nameless rock, and with her the last of the fleet that Ninefold money bought. Major Hesk is taken alive from an escape pod, still in his dress uniform. Varr, Quill and Osk are in Union custody by the end of the week. At Eden the Council reads the charges in the Hall, and then, because Warden Marrow asks, the names of everyone Protocol Ash was meant to make forget.';
export const JUSTICE_ENDING = [
  ['general', 'The General', 'I sold the fleet to keep Eden breathing. Some of it came back to kill us. We sank it anyway. That is the last debt I owed.'],
  ['sato', 'Capt. Sato', 'Hesk asked for a lawyer. I told him Eden has a registry instead. He did not like that answer.'],
  ['ruess', 'Prof. Ruess', 'Eleven thousand four hundred and two. Every one of them has a name again, and everyone knows why.'],
];
export const JUSTICE_MARROW = ['marrow', 'Warden Marrow', 'I said they would all be read out. Today the whole Union listened.'];
