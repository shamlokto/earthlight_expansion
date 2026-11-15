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
//               STRIKE_RETRY days after a failed one)
//   done        Hesk's flagship is sunk: the ending "Justice for Eden" (once; remembered; blocks nothing)
// state.reckoning = { stage, offered, broadcast, siegeDay, clues: [ids], fighting: null | 'siege' | 'stronghold',
//                     sieges: [{ day, won, ... }], strikes: [...], nextStrike, justice: { day, ... } | null }
import { addPending, log, maxHp, fitCommander, addGuardian, V3, RAID } from './rules.js';   // used inside functions only (rules.js imports this module back)
import { shiftMood } from './neighbours.js';

export const RECKONING = {
  countdown: 100,          // days from the broadcast to the siege
  regroup: 60,             // days after a lost siege before they come again
  warnBefore: 10,          // a last warning this many days before a siege
  strikeRetry: 30,         // days after a failed counterattack before the next
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
  state.reckoning ??= { stage: 'locked', offered: false, broadcast: null, siegeDay: null, clues: [], fighting: null, sieges: [], strikes: [], nextStrike: null, justice: null, lastRemind: null };
  const r = state.reckoning;
  r.clues ??= []; r.sieges ??= []; r.strikes ??= []; r.justice ??= null;
  if (r.stage === 'locked' && state.secrets?.finalOpened) r.stage = 'ready';
  return r;
}

export const canBroadcast = (state) => ensureReckoning(state).stage === 'ready';
export const siegeWaiting = (state) => ensureReckoning(state).stage === 'siege';
export const strikeReady = (state) => { const r = ensureReckoning(state); return r.stage === 'strike' && (r.nextStrike == null || state.day >= r.nextStrike); };
export const justiceDone = (state) => !!ensureReckoning(state).justice;

// What the panels read.
export function reckoningStatus(state) {
  const r = ensureReckoning(state);
  return {
    stage: r.stage, broadcast: r.broadcast, siegeDay: r.siegeDay, eta: r.siegeDay != null ? Math.max(0, r.siegeDay - state.day) : null,
    clues: r.clues.length, cluesTotal: CLUES.length, fighting: r.fighting, sieges: r.sieges.length, strikes: r.strikes.length,
    canBroadcast: r.stage === 'ready', siege: r.stage === 'siege', strike: strikeReady(state), nextStrike: r.nextStrike, justice: r.justice,
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
  if ((r.stage === 'gathering' || r.stage === 'regroup') && r.siegeDay != null) {
    if (r.stage === 'regroup' && state.day === r.siegeDay - RECKONING.warnBefore) {
      const p = ask('reckoning', 'They are coming back', `Hesk's fleet has rebuilt what Eden broke. They will be at the gates again in about ${RECKONING.warnBefore} days.`);
      p.speaker = 'sato'; p.step = 'warn'; p.tone = 'warn';
      p.quote = 'Same rock, same man, more guns. This time we know the way they come in.';
    }
    if (state.day >= r.siegeDay) {
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
// { battle, won, reason, turns, enemies, enemiesDestroyed, cortexLost, dockLost, gunsLost, flagshipSunk, guardians: [{ id, hp, lost }] }
export function resolveReckoningBattle(state, res) {
  const r = ensureReckoning(state);
  if (!res || (res.battle !== 'siege' && res.battle !== 'stronghold')) return no('That is not one of the Reckoning\'s battles.');
  if (r.fighting !== res.battle) return no('No such battle is being fought.');
  r.fighting = null;
  const rng = rngOf(state, res.battle), lost = [];
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
    }
  }
  const won = !!res.won, killed = res.enemiesDestroyed || 0;
  const entry = { day: state.day, won, reason: res.reason || null, turns: res.turns || null, killed, enemies: res.enemies || null, lost: lost.length };
  const salvage = won ? { credits: killed * RECKONING.salvage.credits, parts: killed * RECKONING.salvage.parts } : { credits: 0, parts: 0 };
  state.stock.credits += salvage.credits; state.stock.parts += salvage.parts;
  let text;
  if (res.battle === 'siege') {
    r.sieges.push(entry);
    if (won) {
      r.stage = 'strike'; r.siegeDay = null; r.nextStrike = state.day;
      cheer(state, 'Eden held', RECKONING.won);
      for (const g of Object.keys(state.market || {})) state.market[g] = Math.min(state.market[g], 1);
      text = `The Siege of Eden is broken: ${killed} of their machines destroyed, ${lost.length} guardian${lost.length === 1 ? '' : 's'} lost. Salvage: ${salvage.credits} credits and ${salvage.parts} parts. A captured pilot gives up the hiding place.`;
      const p = addPending(state, 'reckoning', 'The hiding place', `${text} Hesk's fleet came from a nameless rock beyond the far belt, an old Directorate quarry dug into a fortress. That is where he is now, with everything he has left.`, [{ key: 'ok', label: 'We go to him' }]);
      p.speaker = 'sato'; p.step = 'hideout'; p.tone = 'good'; p.entry = entry;
      p.quote = 'He will have turned that rock into a trap, and he will be waiting behind it. Forty machines, Governor, the best we have. The General picks them.';
    } else {
      const loss = siegeLoss(state, rng, res);
      r.stage = 'regroup'; r.siegeDay = state.day + RECKONING.regroup;
      cheer(state, 'Eden overrun', RECKONING.siegeLoss.fear);
      text = `Eden fell to the siege. ${Object.entries(loss.stolen).map(([g, n]) => `${n} ${g}`).join(', ') || 'Little'} carried off; ${loss.damaged} building${loss.damaged === 1 ? '' : 's'} knocked out; ${lost.length} guardian${lost.length === 1 ? '' : 's'} lost. Hesk's fleet withdraws to lick its wounds.`;
      const p = addPending(state, 'reckoning', 'After the siege', `${text} They will be back in about ${RECKONING.regroup} days.`, [{ key: 'ok', label: 'Rebuild' }]);
      p.speaker = 'ruess'; p.step = 'siegelost'; p.tone = 'bad'; p.entry = { ...entry, ...loss };
      p.quote = 'They took what they could carry and broke what they could not. They did not take the truth, Governor. That is still out there.';
    }
  } else {
    r.strikes.push(entry);
    if (won) {
      r.stage = 'done';
      r.justice = {
        day: state.day, pop: Math.floor(state.pop || 0), broadcast: r.broadcast, sieges: r.sieges.length, strikes: r.strikes.length,
        destroyed: [...r.sieges, ...r.strikes].reduce((t, s) => t + (s.killed || 0), 0), lost: [...r.sieges, ...r.strikes].reduce((t, s) => t + (s.lost || 0), 0),
        difficulty: state.difficulty === 'easy' ? 'easy' : 'normal',
      };
      cheer(state, 'Justice for Eden', RECKONING.justice);
      text = `Major Hesk's flagship, the Verdict, is sunk. ${killed} of his machines destroyed; ${lost.length} guardian${lost.length === 1 ? '' : 's'} lost.`;
      log(state, `Day ${state.day}: Justice for Eden. ${text}`);
      const p = addPending(state, 'justice', 'Justice for Eden', JUSTICE_TEXT, [{ key: 'keep', label: 'Keep building Eden' }]);
      p.speaker = 'general';
    } else {
      r.nextStrike = state.day + RECKONING.strikeRetry;
      text = `The strike on Hesk's stronghold failed: ${killed} of his machines destroyed, ${lost.length} guardian${lost.length === 1 ? '' : 's'} lost. The fleet can try again in ${RECKONING.strikeRetry} days.`;
      const p = addPending(state, 'reckoning', 'Back from the rock', text, [{ key: 'ok', label: 'Again, when we are ready' }]);
      p.speaker = 'sato'; p.step = 'strikelost'; p.tone = 'bad'; p.entry = entry;
      p.quote = 'We know the rock now: every gun, every ridge, every place they hid. Next time they are the ones who get surprised.';
    }
  }
  log(state, text);
  return ok(text, { entry, salvage });
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
