// Earthlight Space Colony Rebuild, version 8 (docs/COLONY-V8.md): landmarks, one-of-a-kind buildings.
// Pure: no DOM, no randomness. The data is in data/buildings.js (`landmark`: the requirement and the effect in
// words); this module says whether a landmark may be built, what it does once it stands, and plays the moment
// it is finished (a 'landmark' event with a line from Ruess, Sato or the General).
//   * One per colony. Its requirement (colonists, open chambers, a happy month, research) is met once and kept:
//     a colony that loses colonists or happiness later does not lose the right to build it.
//   * A landmark works while it is finished, switched on and undamaged, like any building.
// state.landmarks = { earned: { key: day }, done: { key: day }, happyDays, registry: day | null }
import { BUILDING, BUILDINGS } from './data/buildings.js';
import { TECH } from './data/tech.js';

export const LANDMARKS = BUILDINGS.filter((d) => d.landmark).map((d) => d.key);
export const LM = {
  happyAt: 70,                       // the Governor's Garden: happiness of 70 or more, held happyDays in a row
  crews: 2, cost: 0.9,               // Ruess's Workshop: construction crews, building costs
  warn: 3,                           // Sato's Watch: incident and raid warnings come this many days earlier
  transport: 1.25, reliefPay: 1.5,   // The Lantern
  reliefCost: 0.5, imports: 0.75,    // the Orbital Elevator
  fade: 2,                           // the Hall of Names: grief and fear fade this many times as fast
  happy: { govgarden: 5, lantern: 3, hallofnames: 4 }, registryHappy: 3,
};
// The moment: who speaks when it is finished, and what they say.
export const LINES = {
  workshop: ['ruess', 'Two more crews and a proper workshop at last. Do you know how long I have been fixing Eden with a borrowed spanner? Never mind. Bring me the next ruin.'],
  govgarden: ['general', 'The Council gave this pavilion to the governor of a dead colony and forgot it. Tonight there are children on the lawn. Leave the gates open.'],
  observatory: ['sato', 'Best seat in Eden, sir. From up here I can see a meteor coming a week out and a raider before he knows he is coming. Nothing creeps up on us again.'],
  lantern: ['general', 'They will see it from the coast towns tonight: a light where there was nothing. Let them come and see what it is.'],
  hallofnames: ['ruess', 'Every name we know, in a hall that will outlast all of us. I thought a colony needed air and water first. It needs this too.'],
  elevator: ['ruess', 'A cable all the way down to Earth\'s upper air, and it holds. Convoys ride it now instead of burning fuel. I have checked my sums three times and I still want to cheer.'],
};
const REGISTRY_LINE = ['sato', 'We read the Ninefold registry aloud in the Hall today, every name. It took all morning. Nobody left.'];

const working = (b) => b.build === 0 && !b.off && !(b.down > 0) && !(b.damaged > 0);
export const isLandmark = (key) => !!BUILDING[key]?.landmark;
// Version 9 (docs/COLONY-V9.md): wonders share the requirement and the one-of-a-kind rule (`wonder` in place of
// `landmark`). A wonder counts as standing finished only once its last stage is done.
const reqOf = (d) => d?.landmark || d?.wonder || null;
export const isComplete = (b) => b.build === 0 && (!BUILDING[b.key]?.wonder || b.level >= (BUILDING[b.key].levels?.length || 1));
// A working landmark of this key stands in the colony.
export const landmarkOn = (state, key) => (state.buildings || []).some((b) => b.key === key && working(b));

export function ensureLandmarks(state) {
  state.landmarks ??= { earned: {}, done: {}, happyDays: 0, registry: null };
  const l = state.landmarks;
  l.earned ??= {}; l.done ??= {}; l.happyDays ??= 0; l.registry ??= null;
  return l;
}

// The requirement, item by item: [{ label, met, now }].
export function landmarkNeeds(state, key) {
  const d = BUILDING[key], q = reqOf(d);
  if (!q) return [];
  const l = ensureLandmarks(state), out = [], chambers = state.chambers || [];
  if (q.pop) out.push({ label: `${q.pop.toLocaleString('en-US')} colonists`, met: state.pop >= q.pop, now: `now ${Math.floor(state.pop).toLocaleString('en-US')}` });
  if (q.chambers === 'main') {
    const main = chambers.filter((c) => !c.deck || c.deck === 'main'), open = main.filter((c) => c.status === 'open').length;
    out.push({ label: 'Every main-deck chamber open', met: main.length > 0 && open === main.length, now: `${open} of ${main.length}` });
  } else if (q.chambers) {
    const open = chambers.filter((c) => c.status === 'open').length;
    out.push({ label: `${q.chambers} chambers open`, met: open >= q.chambers, now: `now ${open}` });
  }
  if (q.happyDays) out.push({ label: `Happiness ${LM.happyAt}+ for ${q.happyDays} days`, met: l.happyDays >= q.happyDays, now: `${Math.min(l.happyDays, q.happyDays)} of ${q.happyDays} days` });
  for (const k of q.built || []) out.push({ label: `${BUILDING[k]?.name || k} finished`, met: (state.buildings || []).some((b) => b.key === k && isComplete(b)), now: '', proper: true });   // version 9
  for (const t of q.tech || []) out.push({ label: `Research ${TECH[t]?.name || t}`, met: !!state.research?.done?.includes(t), now: '' });
  return out;
}
export const landmarkEarned = (state, key) => !!ensureLandmarks(state).earned[key] || landmarkNeeds(state, key).every((n) => n.met);
// Why this landmark cannot be ordered now (null when it can, cost aside). `ignore`: a building id to leave out (moving it).
export function landmarkWhy(state, key, ignore = -1) {
  const d = BUILDING[key];
  if (!reqOf(d)) return null;
  if ((state.buildings || []).some((b) => b.key === key && b.id !== ignore)) return `Eden already has ${d.name}: a ${d.wonder ? 'wonder' : 'landmark'} is one of a kind.`;
  if (landmarkEarned(state, key)) return null;
  const miss = landmarkNeeds(state, key).filter((n) => !n.met);
  return `Needs ${miss.map((n) => `${n.proper ? n.label[0] : n.label[0].toLowerCase()}${n.label.slice(1)}${n.now ? ` (${n.now})` : ''}`).join(', ')}.`;
}

// ---------------------------------------------------------------- the lasting effects (rules.js, sim.js, victory.js read these)
export const landmarkCrews = (state) => (landmarkOn(state, 'workshop') ? LM.crews : 0);
export const landmarkCost = (state) => (landmarkOn(state, 'workshop') ? LM.cost : 1);
export const landmarkWarn = (state) => (landmarkOn(state, 'observatory') ? LM.warn : 0);
export const landmarkTransport = (state) => (landmarkOn(state, 'lantern') ? LM.transport : 1);
export const landmarkReliefPay = (state) => (state && landmarkOn(state, 'lantern') ? LM.reliefPay : 1);
export const landmarkReliefCost = (state) => (state && landmarkOn(state, 'elevator') ? LM.reliefCost : 1);
export const landmarkImports = (state) => (landmarkOn(state, 'elevator') ? LM.imports : 1);
export const landmarkFade = (state) => (landmarkOn(state, 'hallofnames') ? LM.fade : 1);
// Happiness for the whole colony: [{ label, value }] (sim.js step 7 adds them to the breakdown).
export function landmarkHappy(state) {
  const out = [];
  for (const [key, v] of Object.entries(LM.happy)) {
    if (!landmarkOn(state, key)) continue;
    const registry = key === 'hallofnames' && !!state.secrets?.finalOpened;
    out.push({ label: BUILDING[key].name, value: v + (registry ? LM.registryHappy : 0) });
  }
  return out;
}

// What the build menu and the Landmarks help show: each landmark with its requirement and state.
export function landmarkStatus(state) {
  const l = ensureLandmarks(state);
  return LANDMARKS.map((key) => {
    const d = BUILDING[key], b = state.buildings.find((x) => x.key === key);
    return { key, name: d.name, effect: d.landmark.effect, needs: landmarkNeeds(state, key), earned: landmarkEarned(state, key),
      state: !b ? 'none' : b.build > 0 ? 'building' : working(b) ? 'working' : 'idle', done: l.done[key] ?? null, why: landmarkWhy(state, key) };
  });
}

// Each day (sim.js, after happiness): the Garden's happy month, requirements earned (kept for good), the moment a
// landmark is finished, and the Hall of Names receiving the Ninefold registry.
export function landmarksDay(state, { say, ask }) {
  const l = ensureLandmarks(state);
  l.happyDays = (state.happy || 0) >= LM.happyAt ? l.happyDays + 1 : 0;
  for (const key of LANDMARKS) {
    if (!l.earned[key] && landmarkNeeds(state, key).every((n) => n.met)) {
      l.earned[key] = state.day;
      if (!state.buildings.some((b) => b.key === key)) say('landmark', `A landmark can be built: ${BUILDING[key].name} (Landmarks menu). ${BUILDING[key].landmark.effect}`);
    }
    const b = state.buildings.find((x) => x.key === key && x.build === 0);
    if (!b || l.done[key] != null) continue;
    l.done[key] = state.day;
    const [speaker, line] = LINES[key] || ['ruess', ''];
    const p = ask('landmark', BUILDING[key].name, `${BUILDING[key].name} stands complete. ${BUILDING[key].landmark.effect}`);
    p.speaker = speaker; p.quote = line; p.landmark = key;
    p.show = { tile: { x: b.x + Math.floor(BUILDING[key].size / 2), y: b.y + Math.floor(BUILDING[key].size / 2), ...(b.deck ? { deck: b.deck } : {}) } };
    if (key === 'hallofnames' && state.secrets?.finalOpened) { l.registry = state.day; p.registry = true; }
  }
  // the vault opened after the Hall was built: the registry comes to the Hall
  if (l.registry == null && state.secrets?.finalOpened && state.buildings.some((b) => b.key === 'hallofnames' && b.build === 0)) {
    l.registry = state.day;
    const p = ask('landmark', 'The Ninefold registry', `The registry from the Ninefold vault now hangs in the Hall of Names: +${LM.registryHappy} more happiness for the whole colony.`);
    p.speaker = REGISTRY_LINE[0]; p.quote = REGISTRY_LINE[1]; p.landmark = 'hallofnames'; p.registry = true;
  }
}
