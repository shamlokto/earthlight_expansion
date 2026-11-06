// Version 8 (docs/COLONY-V8.md): landmarks. Six one-of-a-kind buildings, each behind a requirement (colonists,
// open chambers, a happy month, research) that is kept once met, each with a lasting bonus and a moment when it is
// finished (a 'landmark' event with a line from Ruess, Sato or the General); data, kits, art slots and help.
//   node tests/colony-landmarks.mjs
import { existsSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { BUILDING, BUILDINGS, CATEGORIES } from '../js/colony/data/buildings.js';
import { TECH, TECHS } from '../js/colony/data/tech.js';
import { KITS, kitParts, kitHeight } from '../js/colony/view3d/kits.js';
import { MANIFEST } from '../js/colony/art.js';
import { helpHtml, HELP_SECTIONS } from '../js/colony/ui.js';
import { advise } from '../js/colony/goals.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const KEYS = ['workshop', 'govgarden', 'observatory', 'lantern', 'hallofnames', 'elevator'];
const V8 = BUILDINGS.filter((d) => d.ver === 8);

function colony(seed = 1) {
  const s = newGame({ seed });
  s.stock.credits = 1e6; s.stock.parts = 1e5; s.pending.length = 0; s.options.raids = false; s.options.incidents = false;
  return s;
}
function learn(s, ...keys) {
  for (const k of keys) {
    if (!s.research.done.includes(k)) s.research.done.push(k);
    for (const u of TECH[k].unlocks) if (!s.unlocked.includes(u)) s.unlocked.push(u);
  }
}
const openChambers = (s, n, deck = null) => { for (const c of s.chambers.filter((k) => (deck ? (k.deck || 'main') === deck : true)).slice(0, n)) { c.status = 'open'; c.work = 0; } };
// A landmark placed through the rules (its requirement must be met), then finished at once.
function place(s, key) {
  const p = R.findSpot(s, key, { free: true, deck: BUILDING[key].decks?.includes('main') ? 'main' : BUILDING[key].decks[0] });
  if (!p) return null;
  const r = R.build(s, key, p.x, p.y, BUILDING[key].decks?.includes('main') ? 'main' : BUILDING[key].decks[0]);
  return r.ok ? s.buildings.find((b) => b.id === r.id) : null;
}
const tick = (s, rng, n = 1) => { const ev = []; for (let k = 0; k < n; k++) ev.push(...dayTick(s, rng).events); return ev; };
const happyPart = (s, label) => s.happyParts.find((p) => p.label === label)?.value ?? null;

// ---------------------------------------------------------------- data
{
  check(V8.filter((d) => d.landmark).length === 6 && KEYS.every((k) => BUILDING[k]?.landmark && BUILDING[k].cat === 'landmarks'), 'six landmarks, all in the Landmarks category');
  check(CATEGORIES.some((c) => c.key === 'landmarks' && c.name === 'Landmarks'), 'a Landmarks tab in the build menu');
  check(R.LANDMARKS.length === 6 && KEYS.every((k) => R.LANDMARKS.includes(k)), 'rules.LANDMARKS lists them');
  check(KEYS.every((k) => !BUILDING[k].tech && BUILDING[k].landmark.effect && (BUILDING[k].cost.credits >= 2400) && BUILDING[k].days >= 12), 'big, slow, no research `tech` of their own, an effect in words');
  check(KEYS.every((k) => { const q = BUILDING[k].landmark; return (q.tech || []).every((t) => TECH[t]) && (q.pop || q.chambers || q.happyDays); }), 'every requirement names known techs and a milestone');
  check(KEYS.every((k) => ['ruess', 'sato', 'general'].includes(R.LINES[k]?.[0]) && R.LINES[k][1].length > 40), 'each has a line from Ruess, Sato or the General');
  check(V8.every((d) => KITS[d.key] && kitParts(d.key).every((p) => p.size.every(Number.isFinite) && p.pos.every(Number.isFinite))), 'every version 8 building has a 3D kit');
  const tallest = Math.max(...BUILDINGS.filter((d) => !d.landmark && !d.quad).map((d) => kitHeight(kitParts(d.key))));
  check(KEYS.filter((k) => kitHeight(kitParts(k)) > 2.5).length === 6, `landmark kits are tall (${KEYS.map((k) => kitHeight(kitParts(k)).toFixed(1)).join(' ')}; tallest other ${tallest.toFixed(1)})`);
  check(['lantern', 'elevator'].every((k) => kitHeight(kitParts(k)) > tallest), 'The Lantern and the Orbital Elevator top the skyline');
  check(V8.every((d) => MANIFEST[`card/${d.key}`] && existsSync(new URL(`../tools/art/colony/prompts/card-${d.key}.txt`, import.meta.url))), 'every version 8 building has a card slot and a prompt');
  const help = helpHtml(null, null);
  check(HELP_SECTIONS.some(([id]) => id === 'landmarks') && help.includes('id="help-landmarks"') && KEYS.every((k) => help.includes(BUILDING[k].name.replace(/'/g, '\'').split(' ')[0])), 'How to play: a Landmarks section naming them');
  check(TECHS.filter((t) => t.ver === 8).length === 1 && V8.length === 7, 'version 8: 7 buildings (6 landmarks and the Flare Shelter), 1 tech');
}

// ---------------------------------------------------------------- the requirement, one of a kind
{
  const s = colony();
  const bl = R.buildable(s);
  check(KEYS.every((k) => { const o = bl.find((b) => b.key === k); return o && !o.unlocked && /^Needs /.test(o.why); }), 'a new colony: every landmark locked, saying what it needs');
  const why = bl.find((b) => b.key === 'workshop').why;
  check(/10 chambers open \(now 1\)/.test(why) && /research Fabrication/.test(why), `the Workshop says what is missing ("${why}")`);
  check(/^Needs /.test(R.canBuild(s, 'workshop', 0, 0)) && R.findSpot(s, 'workshop', { free: true }) === null, 'placeCheck refuses an unmet landmark anywhere');
  openChambers(s, 10); learn(s, 'fabrication');
  check(R.landmarkEarned(s, 'workshop') && !R.landmarkWhy(s, 'workshop') && R.buildable(s).find((b) => b.key === 'workshop').unlocked, 'requirement met: the Workshop can be built');
  const rng = stateRng(s);
  tick(s, rng);
  check(s.landmarks.earned.workshop === s.day && s.log.some((l) => /A landmark can be built: Ruess's Workshop/.test(l.text)), 'the day it is earned, the log says so');
  for (const c of s.chambers.slice(1)) c.status = 'sealed';   // lose the chambers again
  check(R.landmarkEarned(s, 'workshop') && !R.landmarkWhy(s, 'workshop'), 'once earned, kept (no wrecking a colony to farm it, no losing it either)');
  openChambers(s, 10);
  const b = place(s, 'workshop');
  check(!!b && b.build === BUILDING.workshop.days, 'placed through the rules, 14 days of work');
  check(/already has Ruess's Workshop/.test(R.landmarkWhy(s, 'workshop')) && R.findSpot(s, 'workshop', { free: true }) === null, 'one of a kind: a second is refused');
  check(/already has/.test(R.buildable(s).find((x) => x.key === 'workshop').why), 'the build menu says it stands');
  // moving it is allowed (it may stand where it stood, the rule ignores itself)
  const spot = R.findSpot(s, 'workshop', { free: true, box: { x0: b.x + 4, y0: 0, x1: s.map.w - 1, y1: s.map.h - 1 } });
  check(!spot || !/already has/.test(R.canBuild(s, 'workshop', spot.x, spot.y) || ''), 'its own move is not refused as a second one');
  // finished: the moment, and the effect
  const crews0 = R.crewsOf(s), cost0 = R.costOf(s, BUILDING.farm.cost, 'farm').credits;
  b.build = 1; s.pending.length = 0;
  tick(s, rng);
  const p = s.pending.find((x) => x.kind === 'landmark');
  check(p && p.speaker === 'ruess' && p.quote === R.LINES.workshop[1] && p.landmark === 'workshop' && p.show?.tile, 'finished: a landmark event with Ruess\'s line and a Show me');
  check(s.landmarks.done.workshop === s.day, 'the moment is remembered (once)');
  s.pending.length = 0; tick(s, rng);
  check(!s.pending.some((x) => x.kind === 'landmark'), 'and not played twice');
  check(R.crewsOf(s) === crews0 + 2 && R.costOf(s, BUILDING.farm.cost, 'farm').credits === Math.ceil(cost0 * 0.9 - 1e-9), `Ruess's Workshop: two more crews (${crews0} → ${R.crewsOf(s)}) and buildings a tenth cheaper (${cost0} → ${R.costOf(s, BUILDING.farm.cost, 'farm').credits})`);
  b.off = true;
  check(R.crewsOf(s) === crews0, 'switched off, its bonus stops');
}

// ---------------------------------------------------------------- the Governor's Garden: the happy month
{
  const s = colony(2), rng = stateRng(s);
  s.pop = 600;
  s.landmarks.happyDays = 29;
  check(!R.landmarkEarned(s, 'govgarden') && R.landmarkNeeds(s, 'govgarden').find((n) => /Happiness/.test(n.label)).now === '29 of 30 days', 'the Garden counts its happy days');
  s.happy = 90; s.flags.short = { food: 0, water: 0, air: 0, power: 0 };
  // the count runs on the day's own happiness
  const L = R.ensureLandmarks(s); L.happyDays = 29;
  for (const g of ['food', 'water', 'air']) s.stock[g] = 300;
  tick(s, rng);
  check(s.happy < 70 || L.happyDays === 30, `a day at 70 or more adds one (happy ${Math.round(s.happy)}, ${L.happyDays} days)`);
  L.happyDays = 30; L.earned.govgarden = s.day;
  const g = { id: s.nextId++, key: 'govgarden', x: 0, y: 0, level: 1, mode: null, build: 0, off: false };
  s.buildings.push(g);
  tick(s, rng);
  check(happyPart(s, 'Governor\'s Garden') === 5, 'the Garden: +5 happiness for the whole colony');
  check(R.spec(g).park === 12 && R.spec(g).radius === 12, 'and a park of 12 within 12 tiles');
}

// ---------------------------------------------------------------- the others' effects
{
  const s = colony(3), rng = stateRng(s);
  const add = (key, extra = {}) => { const b = { id: s.nextId++, key, x: 0, y: 0, level: 1, mode: null, build: 0, off: false, ...extra }; s.buildings.push(b); s.landmarks.done[key] = 0; return b; };
  // Sato's Watch: warnings 3 days earlier, research
  const lead0 = R.warnLead(s), inc0 = R.incidentLead(s);
  const w = add('observatory');
  check(R.warnLead(s) === lead0 + 3 && R.incidentLead(s) === inc0 + 3, `Sato's Watch: raids (${lead0} → ${R.warnLead(s)}) and incidents (${inc0} → ${R.incidentLead(s)}) seen 3 days earlier`);
  check(BUILDING.observatory.makes.research === 4, 'and 4 research a day');
  w.damaged = 2;
  check(R.warnLead(s) === lead0, 'a damaged landmark gives nothing until it is repaired');
  // The Lantern: convoys pay half as much again, transports a quarter more, +3 happiness
  const pay0 = R.convoyPay('food', false, s);
  add('lantern');
  check(R.convoyPay('food', false, s) === Math.round(pay0 * 1.5), `The Lantern: convoys pay half as much again (${pay0} → ${R.convoyPay('food', false, s)})`);
  // the Orbital Elevator: convoys cost half, imports a quarter less
  const c0 = R.convoyCost(s), b0 = R.buyPrice(s, 'parts');
  add('elevator');
  check(R.convoyCost(s).credits === Math.round(c0.credits * 0.5) && Math.abs(R.buyPrice(s, 'parts') - b0 * 0.75) < 1e-9, `the Orbital Elevator: convoys half (${c0.credits} → ${R.convoyCost(s).credits}), parts from Earth a quarter less`);
  // the Hall of Names: +4, +3 more with the registry; fear fades twice as fast
  add('hallofnames');
  s.raid.moods.push({ label: 'Raid fear', value: -12, day: s.day, days: 10 });
  for (const g of ['food', 'water', 'air']) s.stock[g] = 300;
  tick(s, rng);
  check(happyPart(s, 'Hall of Names') === 4 && happyPart(s, 'The Lantern') === 3, 'the Hall of Names +4, The Lantern +3');
  tick(s, rng, 5);
  check(!s.raid.moods.some((m) => m.label === 'Raid fear'), 'the Hall: a 10-day fear is gone after 5 days');
  s.secrets ??= {}; s.secrets.finalOpened = true; s.pending.length = 0;
  tick(s, rng);
  const reg = s.pending.find((p) => p.kind === 'landmark' && p.registry);
  check(reg && reg.landmark === 'hallofnames' && s.landmarks.registry === s.day, 'the Ninefold vault opened: the registry comes to the Hall, with its moment');
  check(happyPart(s, 'Hall of Names') === 7, 'and +3 more happiness');
}

// ---------------------------------------------------------------- the Lantern's transports (a fed colony with free homes)
{
  const run = (lantern) => {
    const s = colony(4), rng = stateRng(s);
    s.difficulty = 'easy';
    if (lantern) { s.buildings.push({ id: s.nextId++, key: 'lantern', x: 0, y: 0, level: 1, mode: null, build: 0, off: false }); s.landmarks.done.lantern = 0; }
    // homes to spare, a dock, food to spare and the power for it (stand-ins: placed off the map's rules)
    for (const key of ['towerblock', 'towerblock', 'dock', 'vertfarm', 'sunmirror']) s.buildings.push({ id: s.nextId++, key, x: 0, y: 0, level: 1, mode: null, build: 0, off: false });
    let came = 0;
    for (let d = 0; d < 70; d++) {
      const cap = R.storageCaps(s); for (const g of ['food', 'water', 'air']) s.stock[g] = cap[g];
      s.pending.length = 0;
      dayTick(s, rng);
      if (s.flags.arrival?.day === s.day) came += s.flags.arrival.n;
    }
    return came;
  };
  const without = run(false), withL = run(true);
  check(without > 0 && withL > without * 1.1, `The Lantern: transports bring more (${without} → ${withL} colonists in 70 days)`);
}

// ---------------------------------------------------------------- the advisor, saves, old saves
{
  const s = colony(5);
  openChambers(s, 25, 'main');
  check(R.landmarkEarned(s, 'lantern'), 'every main-deck chamber open: The Lantern is earned');
  learn(s, 'fabrication');
  const b = place(s, 'workshop');
  check(!!b, 'placed');
  const back = loadState(saveState(s));
  check(back.landmarks && back.buildings.some((x) => x.key === 'workshop') && /already has/.test(R.landmarkWhy(back, 'workshop')), 'save and load keep the landmarks');
  const old = JSON.parse(saveState(s)); delete old.landmarks; delete old.incidents; delete old.options.incidents;
  const up = loadState(JSON.stringify(old));
  check(up.landmarks && up.landmarks.done && up.incidents && R.incidentsOn(up) && R.landmarkStatus(up).length === 6, 'an older save gets the landmark and incident state (incidents on)');
  check(Array.isArray(advise(up)), 'the advisor still reads an old save');
}

console.log(`colony-landmarks: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
