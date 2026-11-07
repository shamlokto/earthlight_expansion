// Earthlight Space Colony Rebuild, version 10 (docs/COLONY-V10.md): luxuries for the well-off, Anno-style but gentle.
// Pure: no DOM, no randomness. The well-off are the people living in Spires and Skyscrapers (Tower Blocks at level 3 and
// 4), Arcologies and the finished Spin-Gravity Ring. They want coffee (Coffee Terraces on the hills), wine (Vineyard Domes
// on the upper deck) and art (Artisan Workshops, from parts). sim.js makes the goods like any other; luxuriesDay then:
//   * the well-off use LUX.per[good] a day per 100 of them, as far as the stores reach (never more);
//   * the share of each want met is kept (state.luxuries.share) and gives happiness: up to +2 a good (+6 in all);
//   * a Skyscraper needs coffee and wine (rules.habitatNeeds 'luxuries', met at LUX.hold of the want) to grow, and,
//     once Luxury Goods is researched, to hold: without them it falls back to a Spire. Nothing else ever suffers:
//     no shortage, no starvation, no unrest from a missing luxury;
//   * the stores hold LUX.cap of each (+ LUX.capWarehouse a Warehouse); what is made beyond that is sold to the traders
//     at the dock by itself (LUX.export of the market price), so a busy Governor never has to sell by hand;
//   * art on show adds to tourism (LUX.artTour a point of art a day, up to LUX.artTourMax).
// state.luxuries = { wellOff, want: { coffee, wine, art }, got, share, exported } (yesterday's figures; rebuilt each day)
import { BUILDING, BASE_PRICE } from './data/buildings.js';
import { spec } from './rules.js';   // used inside functions only (rules.js imports this module back)

export const LUX_GOODS = ['coffee', 'wine', 'art'];
export const LUX_NAME = { coffee: 'Coffee', wine: 'Wine', art: 'Art' };
export const LUX = {
  per: { coffee: 1, wine: 0.8, art: 0.5 },   // a day per 100 well-off residents
  happy: 2,                                   // happiness for a want fully met (each good), colony-wide
  hold: 0.9,                                  // a Skyscraper's coffee and wine: at least this share of the want met
  hold_goods: ['coffee', 'wine'],
  cap: 600, capWarehouse: 200,                // stores: 600 of each, +200 a Warehouse
  export: 0.8,                                // the surplus over the store is sold at 80% of the market price
  artTour: 0.5, artTourMax: 15,               // tourism: +0.5 attraction a point of art a day, up to +15
};
const working = (b) => b.build === 0 && !b.off && !(b.down > 0) && !(b.damaged > 0);

// Homes of the well-off: how many of each building's residents count (a building's housing at its level).
export function wellOffHomes(state) {
  const out = [];
  for (const b of state.buildings || []) {
    if (!working(b)) continue;
    if ((b.key === 'towerblock' && b.level >= 3) || b.key === 'arcology' || (b.key === 'spinring' && b.level >= (BUILDING.spinring.levels?.length || 3))) out.push(b);
  }
  return out;
}
// The well-off living in Eden today: their homes' housing, scaled by how full Eden's homes are.
export function wellOffOf(state) {
  const homes = wellOffHomes(state), room = homes.reduce((t, b) => t + (spec(b).housing || 0), 0);
  if (!room) return 0;
  const housing = state.housing || room, full = housing > 0 ? Math.min(1, (state.pop || 0) / housing) : 0;
  return Math.round(room * full);
}
export const luxCap = (state) => LUX.cap + LUX.capWarehouse * (state.buildings || []).filter((b) => b.key === 'warehouse' && b.build === 0).length;
export function ensureLuxuries(state) {
  for (const g of LUX_GOODS) state.stock[g] ??= 0;
  state.luxuries ??= { wellOff: 0, want: {}, got: {}, share: {}, exported: 0 };
  return state.luxuries;
}
// Relevant once the colony can make them or has any: the More pop-out and the Market show them only then.
export const luxuriesShown = (state) => !!state.research?.done?.includes('luxuries') || LUX_GOODS.some((g) => (state.stock?.[g] || 0) > 0)
  || (state.buildings || []).some((b) => LUX_GOODS.some((g) => BUILDING[b.key]?.makes?.[g]));

// Each day (sim.js, after production, before happiness). consumed: the day's ledger (the More pop-out's change a day).
export function luxuriesDay(state, { consumed = {}, produced = {} } = {}) {
  const L = ensureLuxuries(state), st = state.stock, wellOff = wellOffOf(state), cap = luxCap(state);
  const want = {}, got = {}, share = {};
  let exported = 0;
  for (const g of LUX_GOODS) {
    want[g] = (wellOff / 100) * LUX.per[g];
    got[g] = Math.min(want[g], st[g] || 0);
    st[g] = (st[g] || 0) - got[g];
    if (got[g] > 0) consumed[g] = (consumed[g] || 0) + got[g];
    share[g] = want[g] > 0 ? got[g] / want[g] : 1;
    if (st[g] > cap) {   // the surplus goes to the traders by itself
      const over = st[g] - cap, gain = over * (BASE_PRICE[g] || 1) * (state.market?.[g] ?? 1) * LUX.export;
      st[g] = cap; consumed[g] = (consumed[g] || 0) + over;
      st.credits += gain; produced.credits = (produced.credits || 0) + gain; exported += gain;
    }
  }
  Object.assign(L, { wellOff, want, got, share, exported: Math.round(exported), day: state.day });
  return L;
}

// Happiness: [{ label, value }] for sim.js step 7 (only while the well-off live here and something is met).
export function luxuryHappy(state) {
  const L = state.luxuries;
  if (!L || !(L.wellOff > 0)) return [];
  const v = Math.round(LUX_GOODS.reduce((t, g) => t + LUX.happy * Math.min(1, L.share?.[g] ?? 0), 0));
  return v ? [{ label: 'Luxuries for the well-off', value: v }] : [];
}
// The 'luxuries' need of a Skyscraper (rules.habitatNeeds): coffee and wine met at LUX.hold of the want.
export function luxuriesMet(state) {
  const L = state.luxuries;
  return LUX.hold_goods.every((g) => (L?.share?.[g] ?? 0) >= LUX.hold - 1e-9);
}
export const luxuriesHold = (state) => !!state.research?.done?.includes('luxuries');   // before the tech, the need only gates growth
// Tourism: art on show.
export const luxuryTourism = (state) => Math.round(Math.min(LUX.artTourMax, (state.luxuries?.got?.art || 0) * LUX.artTour));

// The Market's and the inspector's read-out.
export function luxuryStatus(state) {
  const L = ensureLuxuries(state);
  return { wellOff: L.wellOff || 0, cap: luxCap(state), exported: L.exported || 0, goods: LUX_GOODS.map((g) => ({ good: g, name: LUX_NAME[g], want: L.want?.[g] || 0, got: L.got?.[g] || 0, share: L.share?.[g] ?? 1, have: Math.floor(state.stock[g] || 0) })) };
}
