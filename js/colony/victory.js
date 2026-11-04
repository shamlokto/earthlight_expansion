// Earthlight Space Colony Rebuild, version 4 stage 4: the win, Eden Restored (docs/COLONY-V4.md §4, D24, D25).
// Pure: no DOM. The sim calls victoryDay() each day; the Market panel reads convoyStatus() and the goals
// read victoryStatus().
//   * Relief convoys to Earth: a load of food, water, air or helium-3 sent from the dock to an Earth
//     relief station an expedition has reached. Each costs credits and parts to launch, Earth pays a
//     little for it, and one leaves a day.
//   * The win: every chamber on every deck open, the population target, and the relief quota shipped.
//     The ending plays once (a 'victory' event); the colony then carries on as before (D25), with
//     state.victory remembered in the save.
// state.relief = { sent, byGood: { food, ... }, last }   state.victory = { day, pop, chambers, convoys, ... } | null
import { BASE_PRICE } from './data/buildings.js';
import { diffOf } from './difficulty.js';
import { addPending, log } from './rules.js';

export const RELIEF = {
  load: { food: 100, water: 100, air: 100, helium: 20 },   // one convoy
  cost: { credits: 120, parts: 15 },                        // to launch (× the difficulty's cost)
  pay: 0.6,                                                 // Earth pays this share of the base price
  quota: { easy: 12, normal: 20 },                          // convoys for the win
};
export const POP_TARGET = { easy: 1500, normal: 2000 };
export const CONVOY_GOODS = Object.keys(RELIEF.load);

const ok = (msg, extra) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });
const dkey = (state) => (state.difficulty === 'easy' ? 'easy' : 'normal');
export const quotaOf = (state) => RELIEF.quota[dkey(state)];
export const popTargetOf = (state) => POP_TARGET[dkey(state)];

export function ensureRelief(state) {
  state.relief ??= { sent: 0, byGood: {}, last: null };
  state.relief.byGood ??= {};
  if (state.victory === undefined) state.victory = null;
  return state.relief;
}
// An Earth relief station an expedition has reached: where the convoys go.
export const reliefStation = (state) => (state.expeditions?.sectors || []).find((x) => x.site === 'relief' && x.visited) || null;
const hasDock = (state) => state.buildings.some((b) => b.key === 'dock' && b.build === 0);
export function convoyCost(state) {
  const f = diffOf(state).cost;
  return { credits: Math.round(RELIEF.cost.credits * f), parts: Math.round(RELIEF.cost.parts * f) };
}
export const convoyPay = (good) => Math.round(BASE_PRICE[good] * RELIEF.load[good] * RELIEF.pay);

// Why a convoy of this good cannot leave today (null when it can).
export function convoyWhy(state, good) {
  if (!(good in RELIEF.load)) return 'Earth does not need that.';
  if (!hasDock(state)) return 'Convoys leave from a finished dock.';
  if (!reliefStation(state)) return 'No Earth relief station reached yet: send a squadron to one on the Star chart (X).';
  const r = ensureRelief(state);
  if (r.last === state.day) return 'One convoy a day: the dock is loading the next.';
  const load = RELIEF.load[good], c = convoyCost(state);
  if ((state.stock[good] || 0) < load) return `A convoy carries ${load} ${good}; there are ${Math.floor(state.stock[good] || 0)} in store.`;
  if (state.stock.credits < c.credits || state.stock.parts < c.parts) return `Launching costs ${c.credits} credits and ${c.parts} parts.`;
  return null;
}

export function sendConvoy(state, good) {
  const why = convoyWhy(state, good);
  if (why) return no(why);
  const r = ensureRelief(state), load = RELIEF.load[good], c = convoyCost(state), pay = convoyPay(good);
  state.stock[good] -= load; state.stock.credits -= c.credits; state.stock.parts -= c.parts;
  state.stock.credits += pay;
  r.sent++; r.byGood[good] = (r.byGood[good] || 0) + 1; r.last = state.day;
  const st = reliefStation(state);
  log(state, `A relief convoy of ${load} ${good} left for ${st.name} (${r.sent} of ${quotaOf(state)}). Earth paid ${pay} credits.`);
  return ok(`Convoy away: ${load} ${good} for Earth. Earth paid ${pay} credits (${r.sent} of ${quotaOf(state)} convoys).`, { sent: r.sent, pay });
}

// What the Market panel shows.
export function convoyStatus(state) {
  const r = ensureRelief(state), st = reliefStation(state);
  return {
    sent: r.sent, quota: quotaOf(state), station: st ? st.name : null, cost: convoyCost(state),
    goods: CONVOY_GOODS.map((g) => ({ good: g, load: RELIEF.load[g], pay: convoyPay(g), have: Math.floor(state.stock[g] || 0), sent: r.byGood[g] || 0, why: convoyWhy(state, g) })),
  };
}

// The three parts of the win, and whether they are met.
export function victoryStatus(state) {
  const r = ensureRelief(state), all = state.chambers || [];
  const open = all.filter((c) => c.status === 'open').length;
  const parts = {
    chambers: { have: open, need: all.length, met: all.length > 0 && open === all.length },
    pop: { have: state.pop, need: popTargetOf(state), met: state.pop >= popTargetOf(state) },
    convoys: { have: r.sent, need: quotaOf(state), met: r.sent >= quotaOf(state) },
  };
  return { ...parts, met: parts.chambers.met && parts.pop.met && parts.convoys.met, won: state.victory || null };
}
export const victoryText = (v) => `${v.chambers.have}/${v.chambers.need} chambers · ${v.pop.have}/${v.pop.need} colonists · ${v.convoys.have}/${v.convoys.need} convoys`;

// The ending (shown once, then the colony carries on).
export const ENDING = [
  ['ruess', 'Prof. Ruess', 'Every chamber is breathing. Upper deck, main deck, the old catacombs below: I walked all three today and did not need a mask once. Eden was built for this. It just needed someone stubborn enough to finish it.'],
  ['sato', 'Capt. Sato', 'The last convoy reached the relief station an hour ago. Earth\'s coast cities are eating food grown on our fields. Funny, sir. We spent the war shooting at things up here. This is the first time the sky has sent them something good.'],
  ['general', 'The General', 'I sold a fleet to buy a ruin. The Council called it the worst trade of the war. Look out of any window tonight and tell me who was right.'],
];
export const EPILOGUE = 'The registry from the Ninefold vault now hangs in the Hall of the Dock, every name in it read aloud on the day Eden was declared restored. The colony that hid what happened here has become the colony that remembers.';

// Each day: the win, once. Returns true on the day it happens.
export function victoryDay(state) {
  ensureRelief(state);
  if (state.victory) return false;
  const v = victoryStatus(state);
  if (!v.met) return false;
  state.victory = {
    day: state.day, pop: state.pop, chambers: v.chambers.have, convoys: v.convoys.have,
    buildings: state.buildings.filter((b) => b.build === 0).length, guardians: (state.guardians || []).length,
    raids: state.raid?.won || 0, logs: state.secrets?.read?.length || 0,
    dens: (state.expeditions?.sectors || []).filter((x) => x.site === 'den' && x.cleared).length,
    finalVault: !!state.secrets?.finalOpened, difficulty: dkey(state),
  };
  log(state, `Day ${state.day}: Eden Restored. Every chamber breathes, ${state.pop} colonists call it home, and ${v.convoys.have} convoys have reached Earth.`);
  const p = addPending(state, 'victory', 'Eden Restored', 'Every chamber on every deck breathes again, the colony is full of people, and Earth has its relief. The Council declares F2 Eden restored.',
    [{ key: 'keep', label: 'Keep building Eden' }]);
  p.speaker = 'ruess';
  return true;
}
