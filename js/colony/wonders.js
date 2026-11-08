// Earthlight Space Colony Rebuild, version 9 (docs/COLONY-V9.md): wonders, a grander tier above the landmarks.
// Pure: no DOM, no randomness. The data is in data/buildings.js (`wonder`: the requirement and what the finished
// wonder does; `levels`: the stages). A wonder:
//   * is one of a kind and waits on a requirement met once and kept, like a landmark (landmarks.js landmarkNeeds and
//     landmarkWhy read `wonder` as they read `landmark`);
//   * is built in stages: placing it orders the first stage, and each later stage is ordered from its panel like an
//     upgrade (rules.upgrade), with its own cost (alloy, helium-3 and provisions too) and days;
//   * works only once its last stage is finished, while it is switched on and undamaged;
//   * has a moment when it is finished: a 'wonder' event with a line from Ruess, Sato or the General and Show me.
// The Ark (`megaproject`) is the very late game's goal: finishing it plays the second ending, Beyond Eden (an 'ark'
// event in the victory screen's style), remembered in state.ark. It never blocks Eden Restored.
// state.wonders = { done: { key: day } }   state.ark = { day, pop, ... } | null
import { BUILDING, BUILDINGS } from './data/buildings.js';
import { ensureLandmarks, landmarkNeeds } from './landmarks.js';
import { addPending, log } from './rules.js';   // used inside functions only (rules.js imports this module back)

export const WONDERS = BUILDINGS.filter((d) => d.wonder).map((d) => d.key);
export const isWonder = (key) => !!BUILDING[key]?.wonder;
export const stagesOf = (key) => BUILDING[key]?.levels?.length || 1;
const working = (b) => b.build === 0 && !b.off && !(b.down > 0) && !(b.damaged > 0);
// A wonder works once its last stage is finished, like any building while it is on and undamaged.
export const wonderWorks = (b) => !!BUILDING[b.key]?.wonder && working(b) && b.level >= stagesOf(b.key);
export const wonderOn = (state, key) => (state.buildings || []).some((b) => b.key === key && wonderWorks(b));
export const wondersOn = (state) => (state.buildings || []).filter(wonderWorks);
const W = (b) => BUILDING[b.key].wonder;

// The moment: who speaks when it is finished, and what they say.
export const WLINES = {
  arboretum: ['general', 'There is a tree in that dome that was a seedling when Eden was launched. It outlived the war, the Council and the dark. People go and sit under it now and say nothing for an hour. So do I.'],
  library: ['ruess', 'Every book we pulled out of the wrecks, every song on every salvaged drive: catalogued, shelved and lit. Earth forgot most of this. We did not. Students first, Governor, then the rest of us.'],
  concerthall: ['sato', 'Opening night, sir. Two thousand seats and not one empty. The orchestra played the old anthem of the coast towns and half the hall was crying. Best posting of my life.'],
  memorial: ['general', 'Both sides\' names are on those walls. Theirs and ours. Some of the visitors from Earth stand there all afternoon. That is what it is for. We remember so nobody has to do it again.'],
  arena: ['sato', 'You should hear it when a team flies through the sphere: twenty thousand people shouting, and the liners from Earth sold out for a month. Raiders could not get a ticket.'],
  starport: ['ruess', 'Liners, transports, freighters, all berthed at once and nobody waiting. I built a dock out of a ruin once. This is what a dock wants to be when it grows up.'],
  spinring: ['ruess', 'Real gravity, Governor. Children who have never felt their own weight are running and falling over and getting up again. I dropped a spanner just to watch it fall properly.'],
  ark: ['general', 'She is ready.'],
};
// The second ending (the victory screen's style; no video for now).
export const ARK_ENDING = [
  ['ruess', 'Prof. Ruess', 'Five stages, a hundred thousand tonnes of alloy and every sum checked three times. She will take three hundred years to reach the next star. I will not see it. Someone with my name might.'],
  ['sato', 'Capt. Sato', 'I flew her out of the dock myself, sir. Just past the Starport the volunteers sang. Then the drive lit and she was a star going the wrong way, and then she was gone.'],
  ['general', 'The General', 'We came up here to rebuild one colony. We have sent a second one into the dark. Eden is not the end of anything now. It is a harbour.'],
];
export const ARK_TEXT = 'The Ark has left her dock beside the hull: a generation ship carrying volunteers, the Archive of Earth\'s copy, seed banks and the names of everyone Eden has lost, bound for another star. Eden is no longer the last place people can live. It is the first.';

export function ensureWonders(state) {
  state.wonders ??= { done: {} };
  state.wonders.done ??= {};
  if (state.ark === undefined) state.ark = null;
  return state.wonders;
}

// ---------------------------------------------------------------- the lasting effects (rules.js, sim.js, landvalue.js read these)
// Happiness for the whole colony: [{ label, value }] (sim.js step 7).
// Version 11 (docs/COLONY-V11.md): `happyPer` adds 1 more per that many colonists, up to `happyMax` (the Zero-G Arena).
export const wonderHappy = (state) => wondersOn(state).filter((b) => W(b).happy).map((b) => ({ label: BUILDING[b.key].name,
  value: W(b).happy + (W(b).happyPer ? Math.min(W(b).happyMax || 0, Math.floor((state.pop || 0) / W(b).happyPer)) : 0) }));
const product = (state, field) => wondersOn(state).reduce((m, b) => m * (W(b)[field] || 1), 1);
export const wonderTransport = (state) => product(state, 'transport');   // the Starport: ×2 transports
export const wonderVisitors = (state) => product(state, 'visitors');     // the Starport: ×4 visitors can arrive
export const wonderFade = (state) => product(state, 'fade');             // the Memorial Garden: grief and fear fade ×2
// version 11 (docs/COLONY-V11.md): stronger perks
export const wonderTourismMul = (state) => product(state, 'tourismMul');   // the Concert Hall: all tourism ×2
export const wonderResearchMul = (state) => product(state, 'researchMul'); // the Great Library: all research ×2
export const wonderNoGrief = (state) => wondersOn(state).some((b) => W(b).noGrief);   // the Memorial Garden: no grief or fear
// Credits a day that grow with the city: `perPop` per 1,000 colonists (the Zero-G Arena), at the wonder's working rate.
export const wonderIncome = (state, rateOf = () => 1) => wondersOn(state).reduce((t, b) => t + (W(b).perPop?.credits || 0) * ((state.pop || 0) / 1000) * rateOf(b), 0);
// Research a day: `research` per 1,000 colonists (the Great Library), at the wonder's working rate.
export const wonderResearch = (state, rateOf = () => 1) => wondersOn(state).reduce((t, b) => t + (W(b).research || 0) * ((state.pop || 0) / 1000) * rateOf(b), 0);
// Land value: { b, value, radius } for the working wonders on a deck.
export const wonderValues = (state, deck) => wondersOn(state).filter((b) => W(b).value && (b.deck || 'main') === deck).map((b) => ({ b, value: W(b).value, radius: W(b).valueRadius || 12 }));

// A wonder's stage: { stage, of, name, next: { name, cost, days } | null, building }.
export function wonderStage(b) {
  const d = BUILDING[b.key], n = stagesOf(b.key), lv = d.levels || [];
  const nx = b.level < n ? lv[b.level] : null;
  return { stage: b.level, of: n, name: lv[b.level - 1]?.name || d.name, next: nx ? { name: nx.name, cost: nx.cost, days: nx.days ?? Math.ceil(d.days / 2) } : null, building: b.build > 0 };
}

// What the build menu, the help and the tests read: each wonder with its requirement and state.
export function wonderStatus(state) {
  const l = ensureLandmarks(state), w = ensureWonders(state);
  return WONDERS.map((key) => {
    const d = BUILDING[key], b = (state.buildings || []).find((x) => x.key === key), needs = landmarkNeeds(state, key);
    return { key, name: d.name, size: d.size, effect: d.wonder.effect, stages: stagesOf(key), needs, earned: !!l.earned[key] || needs.every((n) => n.met),
      stage: b ? b.level : 0, state: !b ? 'none' : b.build > 0 ? 'building' : b.level < stagesOf(key) ? 'staged' : wonderWorks(b) ? 'working' : 'idle',
      done: w.done[key] ?? null, megaproject: !!d.wonder.megaproject };
  });
}

// Each day (sim.js, after the landmarks): requirements earned (kept for good), and the moment a wonder's last stage
// is finished. Returns true on the day the Ark is finished (the second ending).
export function wondersDay(state, { say, ask }) {
  const l = ensureLandmarks(state), w = ensureWonders(state);
  let launched = false;
  for (const key of WONDERS) {
    const d = BUILDING[key];
    if (!l.earned[key] && landmarkNeeds(state, key).every((n) => n.met)) {
      l.earned[key] = state.day;
      if (!state.buildings.some((b) => b.key === key)) say('wonder', `A wonder can be built: ${d.name} (Wonders menu, ${d.size}×${d.size}, ${stagesOf(key)} stages). ${d.wonder.effect}`);
    }
    const b = state.buildings.find((x) => x.key === key && x.build === 0 && x.level >= stagesOf(key));
    if (!b || w.done[key] != null) continue;
    w.done[key] = state.day;
    const tile = { x: b.x + Math.floor(d.size / 2), y: b.y + Math.floor(d.size / 2), ...(b.deck ? { deck: b.deck } : {}) };
    if (d.wonder.megaproject) {
      if (!state.ark) {
        b.launched = state.day;
        state.ark = {
          day: state.day, pop: Math.floor(state.pop), wonders: WONDERS.filter((k) => w.done[k] != null).length,
          landmarks: Object.keys(l.done || {}).length, buildings: state.buildings.filter((x) => x.build === 0).length,
          visitors: Math.round(state.tourism?.visitors || 0), restored: state.victory?.day ?? null, difficulty: state.difficulty === 'easy' ? 'easy' : 'normal',
        };
        log(state, `Day ${state.day}: Beyond Eden. The Ark has left her dock for another star.`);
        const p = addPending(state, 'ark', 'Beyond Eden', ARK_TEXT, [{ key: 'keep', label: 'Keep building Eden' }]);
        p.speaker = 'general'; p.show = { tile };
        launched = true;
      }
      continue;
    }
    const [speaker, line] = WLINES[key] || ['ruess', ''];
    const p = ask('wonder', d.name, `${d.name} stands complete. ${d.wonder.effect}`);
    p.speaker = speaker; p.quote = line; p.wonder = key; p.show = { tile };
  }
  return launched;
}
