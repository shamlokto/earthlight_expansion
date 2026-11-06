// Earthlight Space Colony Rebuild, version 4 stage 4: the win, Eden Restored (docs/COLONY-V4.md §4, D24, D25),
// made the endgame of a big city in version 6 (docs/COLONY-V6.md, owner 2026-11-05).
// Pure: no DOM. The sim calls victoryDay() each day; the Market panel reads convoyStatus() and the goals
// read victoryStatus().
//   * Relief convoys to Earth: loads of food, water, air or helium-3 sent to an Earth relief station an
//     expedition has reached. One convoy leaves a day. From the dock a convoy is one load; with a working
//     Mass Driver it can be a heavy launch of three loads, and a Mass Driver on Automatic launches one a
//     day by itself. Each costs credits and parts, and Earth pays a little for it.
//   * The win: every chamber on every deck open, 25,000 colonists, happiness above 85 held for 30 days,
//     and the relief quota (in loads) shipped. The ending plays once (a 'victory' event); the colony then
//     carries on as before (D25), with state.victory remembered in the save.
// state.relief = { sent, loads, byGood: { food, ... }, last, happyDays }   state.victory = { day, pop, ... } | null
import { BASE_PRICE, NEEDS } from './data/buildings.js';
import { diffOf } from './difficulty.js';
import { addPending, log } from './rules.js';
import { landmarkReliefPay, landmarkReliefCost } from './landmarks.js';   // version 8: The Lantern, the Orbital Elevator

export const RELIEF = {
  load: { food: 500, water: 500, air: 500, helium: 100 },   // one load
  cost: { credits: 350, parts: 35 },                        // a dock convoy of one load (× the difficulty's cost)
  heavy: { loads: 3, cost: { credits: 900, parts: 90 } },   // a Mass Driver's launch
  pay: 0.4,                                                 // Earth pays this share of the base price
  quota: { easy: 60, normal: 90 },                          // loads for the win
  keepDays: 10,                                             // an automatic Mass Driver leaves this many days of needs
};
export const POP_TARGET = { easy: 25000, normal: 25000 };
// Happiness above `above` held for `days` (a day at or below it takes `slip` days of progress away).
export const HAPPY_TARGET = { above: 85, days: 30, slip: 3 };
export const CONVOY_GOODS = Object.keys(RELIEF.load);

const ok = (msg, extra) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });
const dkey = (state) => (state.difficulty === 'easy' ? 'easy' : 'normal');
export const quotaOf = (state) => RELIEF.quota[dkey(state)];
export const popTargetOf = (state) => POP_TARGET[dkey(state)];

export function ensureRelief(state) {
  state.relief ??= { sent: 0, loads: 0, byGood: {}, last: null, happyDays: 0 };
  const r = state.relief;
  r.byGood ??= {};
  r.loads ??= r.sent || 0;   // a version-4 colony's convoys count a load each
  r.happyDays ??= 0;
  if (state.victory === undefined) state.victory = null;
  return r;
}
// An Earth relief station an expedition has reached: where the convoys go.
export const reliefStation = (state) => (state.expeditions?.sectors || []).find((x) => x.site === 'relief' && x.visited) || null;
const hasDock = (state) => state.buildings.some((b) => b.key === 'dock' && b.build === 0);
const working = (b) => b.build === 0 && !b.off && !(b.down > 0) && !(b.damaged > 0);
export const massDrivers = (state) => state.buildings.filter((b) => b.key === 'massdriver' && working(b));
export function convoyCost(state, heavy = false) {
  const f = diffOf(state).cost * landmarkReliefCost(state), c = heavy ? RELIEF.heavy.cost : RELIEF.cost;
  return { credits: Math.round(c.credits * f), parts: Math.round(c.parts * f) };
}
const loadsOf = (heavy) => (heavy ? RELIEF.heavy.loads : 1);
export const convoyLoad = (good, heavy = false) => RELIEF.load[good] * loadsOf(heavy);
export const convoyPay = (good, heavy = false, state = null) => Math.round(BASE_PRICE[good] * convoyLoad(good, heavy) * RELIEF.pay * landmarkReliefPay(state));

// Why a convoy of this good cannot leave today (null when it can). `heavy`: a Mass Driver's launch.
export function convoyWhy(state, good, heavy = false) {
  if (!(good in RELIEF.load)) return 'Earth does not need that.';
  if (heavy ? !massDrivers(state).length : !hasDock(state)) return heavy ? 'Heavy launches need a working Mass Driver on the hull.' : 'Convoys leave from a finished dock.';
  if (!reliefStation(state)) return 'No Earth relief station reached yet: send a squadron to one on the Star chart (X).';
  const r = ensureRelief(state);
  if (r.last === state.day) return 'One convoy a day: the next is being loaded.';
  const load = convoyLoad(good, heavy), c = convoyCost(state, heavy);
  if ((state.stock[good] || 0) < load) return `A ${heavy ? 'heavy launch' : 'convoy'} carries ${load} ${good}; there are ${Math.floor(state.stock[good] || 0)} in store.`;
  if (state.stock.credits < c.credits || state.stock.parts < c.parts) return `Launching costs ${c.credits} credits and ${c.parts} parts.`;
  return null;
}

// Send a convoy. `heavy` omitted: a heavy launch when a Mass Driver can make one, else a dock convoy.
export function sendConvoy(state, good, heavy) {
  if (heavy === undefined) heavy = !convoyWhy(state, good, true);
  const why = convoyWhy(state, good, heavy);
  if (why) return no(why);
  const r = ensureRelief(state), load = convoyLoad(good, heavy), n = loadsOf(heavy), c = convoyCost(state, heavy), pay = convoyPay(good, heavy, state);
  state.stock[good] -= load; state.stock.credits -= c.credits; state.stock.parts -= c.parts;
  state.stock.credits += pay;
  r.sent++; r.loads += n; r.byGood[good] = (r.byGood[good] || 0) + n; r.last = state.day;
  const st = reliefStation(state), what = heavy ? 'A heavy relief launch' : 'A relief convoy';
  log(state, `${what} of ${load} ${good} left for ${st.name} (${r.loads} of ${quotaOf(state)} loads). Earth paid ${pay} credits.`);
  return ok(`${heavy ? 'Launched' : 'Convoy away'}: ${load} ${good} for Earth. Earth paid ${pay} credits (${r.loads} of ${quotaOf(state)} loads).`, { sent: r.sent, loads: r.loads, pay, heavy });
}

// A Mass Driver on Automatic: the good Eden can best spare (above `keepDays` of needs), if any.
export function autoConvoyGood(state) {
  const days = RELIEF.keepDays, nm = diffOf(state).need, pop = state.pop || 0;
  const keep = { food: pop * NEEDS.food * nm * days, water: pop * NEEDS.water * nm * days, air: pop * NEEDS.air * nm * days, helium: 4 * days * state.buildings.filter((b) => b.key === 'fusion').length };
  let best = null, bestSpare = 0;
  for (const g of CONVOY_GOODS) {
    if (convoyWhy(state, g, true)) continue;
    const spare = ((state.stock[g] || 0) - keep[g]) / convoyLoad(g, true);
    if (spare >= 1 && spare > bestSpare) { best = g; bestSpare = spare; }
  }
  return best;
}

// What the Market panel shows.
export function convoyStatus(state) {
  const r = ensureRelief(state), st = reliefStation(state), driver = massDrivers(state).length > 0;
  return {
    sent: r.sent, loads: r.loads, quota: quotaOf(state), station: st ? st.name : null, cost: convoyCost(state), heavyCost: convoyCost(state, true), driver,
    auto: massDrivers(state).some((b) => b.mode === 'auto'),
    goods: CONVOY_GOODS.map((g) => ({ good: g, load: RELIEF.load[g], heavyLoad: convoyLoad(g, true), pay: convoyPay(g, false, state), heavyPay: convoyPay(g, true, state),
      have: Math.floor(state.stock[g] || 0), sent: r.byGood[g] || 0, why: convoyWhy(state, g), whyHeavy: driver ? convoyWhy(state, g, true) : 'Heavy launches need a Mass Driver (research Mass Driver).' })),
  };
}

// The four parts of the win, and whether they are met.
export function victoryStatus(state) {
  const r = ensureRelief(state), all = state.chambers || [];
  const open = all.filter((c) => c.status === 'open').length;
  const parts = {
    chambers: { have: open, need: all.length, met: all.length > 0 && open === all.length },
    pop: { have: state.pop, need: popTargetOf(state), met: state.pop >= popTargetOf(state) },
    happy: { have: r.happyDays, need: HAPPY_TARGET.days, now: Math.round(state.happy || 0), above: HAPPY_TARGET.above, met: r.happyDays >= HAPPY_TARGET.days },
    convoys: { have: r.loads, need: quotaOf(state), met: r.loads >= quotaOf(state) },
  };
  return { ...parts, met: parts.chambers.met && parts.pop.met && parts.happy.met && parts.convoys.met, won: state.victory || null };
}
export const victoryText = (v) => `${v.chambers.have}/${v.chambers.need} chambers · ${v.pop.have.toLocaleString('en-GB')}/${v.pop.need.toLocaleString('en-GB')} colonists · happiness ${v.happy.now} (above ${v.happy.above} for ${v.happy.have}/${v.happy.need} days) · ${v.convoys.have}/${v.convoys.need} convoy loads`;

// The ending (shown once, then the colony carries on).
export const ENDING = [
  ['ruess', 'Prof. Ruess', 'Every chamber is breathing. Upper deck, main deck, the old catacombs below: I walked all three today and did not need a mask once. Eden was built for this. It just needed someone stubborn enough to finish it.'],
  ['sato', 'Capt. Sato', 'The last convoy reached the relief station an hour ago. Earth\'s coast cities are eating food grown on our fields. Funny, sir. We spent the war shooting at things up here. This is the first time the sky has sent them something good.'],
  ['general', 'The General', 'I sold a fleet to buy a ruin. The Council called it the worst trade of the war. Look out of any window tonight and tell me who was right.'],
];
export const EPILOGUE = 'The registry from the Ninefold vault now hangs in the Hall of the Dock, every name in it read aloud on the day Eden was declared restored. The colony that hid what happened here has become the colony that remembers.';

// Each day: the happiness clock, an automatic Mass Driver's launch, then the win, once. Returns true on the
// day the win happens.
export function victoryDay(state) {
  const r = ensureRelief(state);
  r.happyDays = (state.happy || 0) > HAPPY_TARGET.above ? Math.min(HAPPY_TARGET.days, r.happyDays + 1) : Math.max(0, r.happyDays - HAPPY_TARGET.slip);
  if (massDrivers(state).some((b) => b.mode === 'auto') && r.last !== state.day) {
    const g = autoConvoyGood(state);
    if (g) sendConvoy(state, g, true);
  }
  if (state.victory) return false;
  const v = victoryStatus(state);
  if (!v.met) return false;
  state.victory = {
    day: state.day, pop: state.pop, chambers: v.chambers.have, convoys: v.convoys.have, happy: Math.round(state.happy),
    buildings: state.buildings.filter((b) => b.build === 0).length, guardians: (state.guardians || []).length,
    raids: state.raid?.won || 0, logs: state.secrets?.read?.length || 0,
    dens: (state.expeditions?.sectors || []).filter((x) => x.site === 'den' && x.cleared).length,
    finalVault: !!state.secrets?.finalOpened, difficulty: dkey(state),
  };
  log(state, `Day ${state.day}: Eden Restored. Every chamber breathes, ${state.pop} colonists call it home and are happy there, and ${v.convoys.have} loads of relief have reached Earth.`);
  const p = addPending(state, 'victory', 'Eden Restored', 'Every chamber on every deck breathes again, a city of twenty-five thousand lives here happily, and Earth has its relief. The Council declares F2 Eden restored.',
    [{ key: 'keep', label: 'Keep building Eden' }]);
  p.speaker = 'ruess';
  return true;
}
