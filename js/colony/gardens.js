// Earthlight Space Colony Rebuild, version 10 (docs/COLONY-V10.md): Eden's gardens, rewilding the colony.
// Pure: no DOM, no randomness. A greenery score adds up what grows in Eden:
//   every working park, grove, sky garden, garden landmark or wonder (its park rating), orchards, coffee terraces and
//   vineyards, forests and water in the open chambers, the Grand Arboretum (a bonus of its own) and Garden Districts.
// Wildlife comes back at thresholds, once each, with a moment (a 'wildlife' event) and a small lasting bonus (WILDLIFE).
// An optional ending, the Garden of Eden: greenery GARDEN.target and happiness GARDEN.happy on the same day, once,
// remembered in state.gardens.eden and shown in the victory screen's style (a 'garden' event). It neither needs nor
// changes Eden Restored or the Ark.
// state.gardens = { score, wildlife: { key: day }, eden: { day, pop, greenery, happy, wildlife, ... } | null }
import { BUILDING } from './data/buildings.js';
import { T } from './data/terrain.js';
import { mapOf, deckOf, addPending, log } from './rules.js';   // used inside functions only (rules.js imports this module back)
import { districtGreenery } from './districts.js';

export const GARDEN = {
  crops: { orchard: 4, coffee: 3, vineyard: 4, seedvault: 2 },   // greenery of working buildings without a park rating
  forest: 0.25, water: 0.1,           // a forest or water tile in an open chamber
  arboretum: 40,                      // the finished Grand Arboretum, on top of its park rating
  target: 600, happy: 70,             // the Garden of Eden
};
// The wildlife, in order: the score it waits on, what it needs to be seen, its moment and its bonus.
export const WILDLIFE = [
  { key: 'bees', at: 80, name: 'Bees and butterflies', speaker: 'ruess', bonus: 'Orchards, Coffee Terraces and Vineyard Domes make a tenth more.',
    line: 'Governor, a bee. A real one, on the clover by the fields. Someone smuggled a hive up in the war and it has been hiding in the ducts. There are butterflies on the orchards now too. Pollinators, sir: the fruit will set better.',
    show: (s) => find(s, (b) => b.key === 'orchard' || b.key === 'park') },
  { key: 'birds', at: 160, name: 'Birds in the sky gardens', speaker: 'sato', bonus: '+2 happiness, and visitors come to hear them (+5 attraction).',
    line: 'Swifts, sir, nesting under the sky panels. They came in through a vent from who knows where. The children on the upper deck have named every one of them. I have not had the heart to tell them they are all called Kevin.',
    show: (s) => find(s, (b) => b.key === 'skygarden') || find(s, (b) => deckOf(b) === 'upper' && BUILDING[b.key]?.park) },
  { key: 'fish', at: 280, name: 'Fish in the canals', speaker: 'ruess', bonus: 'Fisheries make a quarter more.',
    line: 'The river is clean enough for trout. We released a few hundred fry from the seed vault\'s tanks last spring and they have taken. Fishermen on the banks at dawn, Governor. I never thought I would see it.',
    show: (s) => find(s, (b) => b.key === 'fishery') || find(s, (b) => b.key === 'riverpump') },
  { key: 'deer', at: 420, name: 'Deer in the forests', speaker: 'general', bonus: '+2 happiness, and +10 attraction for visitors.',
    line: 'A doe and her fawn at the edge of the old forest this morning. Nobody knows how they got up here. Nobody wants to know. Some things you just let be true.',
    show: (s) => find(s, (b) => b.key === 'grove') || find(s, (b) => b.key === 'govgarden') || find(s, (b) => BUILDING[b.key]?.park) },
];
export const WILD = Object.fromEntries(WILDLIFE.map((w) => [w.key, w]));
export const GARDEN_ENDING = [
  ['ruess', 'Prof. Ruess', 'I counted four hundred kinds of plant this morning and lost count of the insects. Eden was a machine for keeping people alive. Somewhere along the way it became a place that is alive by itself.'],
  ['sato', 'Capt. Sato', 'Flew the length of the upper deck with the canopy open, sir. Birds the whole way, and the smell of cut grass and coffee. The pilots from Earth do not believe us until they land.'],
  ['general', 'The General', 'They called this sky a graveyard once. Now there is a garden in it, and children who think that is normal. Let them. That is the point of all of it.'],
];
export const GARDEN_TEXT = 'Eden is green from end cap to end cap: forests, orchards and sky gardens, bees in the fields, birds under the sky panels, fish in the river and deer at the forest\'s edge. It is no longer a colony with gardens. It is a garden with a colony in it.';

const working = (b) => b.build === 0 && !b.off && !(b.down > 0) && !(b.damaged > 0);
const lastStage = (b) => !BUILDING[b.key]?.wonder || b.level >= (BUILDING[b.key].levels?.length || 1);
function find(state, pred) {
  const b = (state.buildings || []).find((x) => working(x) && pred(x));
  if (!b) return null;
  const n = BUILDING[b.key].size || 1;
  return { x: b.x + Math.floor(n / 2), y: b.y + Math.floor(n / 2), ...(b.deck ? { deck: b.deck } : {}) };
}
export function ensureGardens(state) {
  state.gardens ??= { score: 0, wildlife: {}, eden: null };
  state.gardens.wildlife ??= {};
  if (state.gardens.eden === undefined) state.gardens.eden = null;
  return state.gardens;
}

// Forest and water tiles in the open chambers, per deck (cached by the chambers' states: terrain changes rarely).
const natureCache = new WeakMap();
function nature(state) {
  const sig = (state.chambers || []).map((c) => (c.status === 'open' ? 1 : 0)).join('');
  const e = natureCache.get(state);
  if (e && e.sig === sig && state.day - e.day < 10) return e;
  let forest = 0, water = 0;
  for (const c of state.chambers || []) {
    if (c.status !== 'open') continue;
    const m = mapOf(state, deckOf(c));
    if (!m) continue;
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
      const i = y * m.w + x;
      if (m.ch[i] !== c.id) continue;
      const t = m.t[i];
      if (t === T.FOREST) forest++; else if (t === T.RIVER || t === T.LAKE) water++;
    }
  }
  const out = { sig, day: state.day || 0, forest, water };
  natureCache.set(state, out);
  return out;
}

// The greenery score with its parts: { score, parts: [{ label, value }] }.
export function greeneryOf(state) {
  const parts = [], add = (label, v) => { v = Math.round(v); if (v) parts.push({ label, value: v }); };
  let park = 0, crops = 0, arb = 0;
  for (const b of state.buildings || []) {
    if (!working(b) || !lastStage(b)) continue;
    const d = BUILDING[b.key], lv = d.levels?.[b.level - 1] || {};
    const p = lv.park ?? d.park ?? 0;
    if (GARDEN.crops[b.key]) crops += GARDEN.crops[b.key];
    else if (p > 0 && b.key !== 'arcology') park += p;
    if (b.key === 'arboretum') arb += GARDEN.arboretum;
  }
  add('Parks, groves and gardens', park);
  add('Orchards, terraces and vines', crops);
  if (arb) add('The Grand Arboretum', arb);
  const n = nature(state);
  add(`Forests (${n.forest} tiles)`, n.forest * GARDEN.forest);
  add(`Rivers and lakes (${n.water} tiles)`, n.water * GARDEN.water);
  add('Garden Districts', districtGreenery(state));
  return { score: parts.reduce((t, p) => t + p.value, 0), parts };
}

const seen = (state, key) => state.gardens?.wildlife?.[key] != null;
// The lasting bonuses (sim.js, tourism.js read these).
export function gardenHappy(state) {
  const v = (seen(state, 'birds') ? 2 : 0) + (seen(state, 'deer') ? 2 : 0);
  return v ? [{ label: 'Wildlife in Eden', value: v }] : [];
}
export const gardenOutput = (state, key) => (key === 'fishery' && seen(state, 'fish') ? 1.25 : 1)
  * ((key === 'orchard' || key === 'coffee' || key === 'vineyard') && seen(state, 'bees') ? 1.1 : 1);
export const gardenTourism = (state) => (seen(state, 'birds') ? 5 : 0) + (seen(state, 'deer') ? 10 : 0);

// What the panels and the help read.
export function gardenStatus(state) {
  const g = ensureGardens(state), gr = greeneryOf(state);
  return { score: gr.score, parts: gr.parts, target: GARDEN.target, happy: GARDEN.happy, eden: g.eden,
    wildlife: WILDLIFE.map((w) => ({ key: w.key, name: w.name, at: w.at, bonus: w.bonus, day: g.wildlife[w.key] ?? null })) };
}

// Each day (sim.js, late): the score, wildlife returning, and the Garden of Eden. Returns true on the day of the ending.
export function gardensDay(state, { ask }) {
  const g = ensureGardens(state), gr = greeneryOf(state);
  g.score = gr.score;
  for (const w of WILDLIFE) {
    if (g.wildlife[w.key] != null || gr.score < w.at) continue;
    g.wildlife[w.key] = state.day;
    const p = ask('wildlife', w.name, `${w.name}: wildlife is coming back to Eden (greenery ${gr.score}). ${w.bonus}`);
    p.speaker = w.speaker; p.quote = w.line; p.tone = 'good';
    const tile = w.show(state);
    if (tile) p.show = { tile };
    break;   // one moment a day
  }
  if (!g.eden && gr.score >= GARDEN.target && (state.happy || 0) >= GARDEN.happy) {
    g.eden = {
      day: state.day, pop: Math.floor(state.pop), greenery: gr.score, happy: Math.round(state.happy),
      wildlife: Object.keys(g.wildlife).length, parks: (state.buildings || []).filter((b) => working(b) && (BUILDING[b.key]?.park || 0) > 0).length,
      restored: state.victory?.day ?? null, difficulty: state.difficulty === 'easy' ? 'easy' : 'normal',
    };
    log(state, `Day ${state.day}: the Garden of Eden. Greenery ${gr.score}, happiness ${Math.round(state.happy)}.`);
    const p = addPending(state, 'garden', 'The Garden of Eden', GARDEN_TEXT, [{ key: 'keep', label: 'Keep building Eden' }]);
    p.speaker = 'ruess';
    return true;
  }
  return false;
}
