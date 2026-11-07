// Version 9 (docs/COLONY-V9.md): wonders. Seven one-of-a-kind great works with big footprints (4×4 to 6×6), built in
// stages, each behind a requirement kept once met, each with a lasting effect and a moment; and the Ark, the very late
// megaproject (7×7, five stages) whose finishing is the second ending, Beyond Eden. Data, kits, art slots and help.
//   node tests/colony-wonders.mjs
import { existsSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { BUILDING, BUILDINGS, CATEGORIES } from '../js/colony/data/buildings.js';
import { TECH, TECHS } from '../js/colony/data/tech.js';
import { KITS, kitParts, kitHeight } from '../js/colony/view3d/kits.js';
import { MANIFEST } from '../js/colony/art.js';
import { helpHtml, HELP_SECTIONS } from '../js/colony/ui.js';
import { landValueOf } from '../js/colony/rules.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const KEYS = ['arboretum', 'library', 'concerthall', 'memorial', 'arena', 'starport', 'spinring', 'ark'];
const V9 = BUILDINGS.filter((d) => d.ver === 9);

function colony(seed = 1) {
  const s = newGame({ seed });
  Object.assign(s.stock, { credits: 1e7, parts: 1e6, alloy: 0, helium: 0 });
  s.pending.length = 0; s.options.raids = false; s.options.incidents = false; s.options.petitions = false;
  return s;
}
function learn(s, ...keys) {
  for (const k of keys) {
    if (!s.research.done.includes(k)) s.research.done.push(k);
    for (const u of TECH[k].unlocks) if (!s.unlocked.includes(u)) s.unlocked.push(u);
  }
}
const openAll = (s) => { for (const c of s.chambers) { c.status = 'open'; c.work = 0; } };
const deckFor = (key) => { const d = BUILDING[key].decks; return !d || d.includes('main') ? 'main' : d[0]; };
// A finished building put straight into the state (a landmark the requirement names, say).
const stand = (s, key, extra = {}) => { const b = { id: s.nextId++, key, x: 0, y: 0, level: 1, mode: null, build: 0, off: false, ...extra }; s.buildings.push(b); return b; };
// Stores topped up (the sim clamps them to the colony's storage each day).
const rich = (s, extra = true) => { s.stock.credits = 1e7; s.stock.parts = 1e6; if (extra) for (const g of R.EXTRA_COST) s.stock[g] = Math.max(s.stock[g] || 0, 1e5); };
// A wonder placed through the rules (its requirement met), on its deck.
function place(s, key) {
  rich(s);
  const deck = deckFor(key), p = R.findSpot(s, key, { free: true, deck });
  if (!p) return null;
  const r = R.build(s, key, p.x, p.y, deck);
  return r.ok ? s.buildings.find((b) => b.id === r.id) : null;
}
const feed = (s) => { const cap = R.storageCaps(s); for (const g of ['food', 'water', 'air']) s.stock[g] = Math.max(s.stock[g], cap[g]); };
const tick = (s, rng, n = 1) => { const ev = []; for (let k = 0; k < n; k++) { feed(s); ev.push(...dayTick(s, rng).events); } return ev; };
// Every stage finished at once, through the rules (each stage ordered with rules.upgrade, then built).
function finish(s, b, rng) {
  b.build = 1; tick(s, rng);
  while (b.level < R.stagesOf(b.key)) {
    rich(s);
    const r = R.upgrade(s, b.id);
    if (!r.ok) return r.msg;
    b.build = 1; tick(s, rng);
  }
  return null;
}
// A big late colony that has every requirement but the landmarks.
function late(seed = 1, pop = 20000) {
  const s = colony(seed);
  openAll(s); learn(s, ...TECHS.map((t) => t.key)); s.pop = pop;
  return s;
}

// ---------------------------------------------------------------- data, kits, art, help
{
  check(KEYS.every((k) => BUILDING[k]?.wonder && BUILDING[k].cat === 'wonders' && BUILDING[k].ver === 9), 'eight wonders (the Ark among them), all in the Wonders category');
  check(CATEGORIES.some((c) => c.key === 'wonders' && c.name === 'Wonders'), 'a Wonders tab in the build menu');
  check(R.WONDERS.length === 8 && KEYS.every((k) => R.WONDERS.includes(k)), 'rules.WONDERS lists them');
  check(KEYS.every((k) => BUILDING[k].size >= 4 && BUILDING[k].size <= 7) && KEYS.filter((k) => BUILDING[k].size >= 6).length >= 4 && BUILDING.ark.size === 7, `big footprints (${KEYS.map((k) => BUILDING[k].size).join(' ')})`);
  check(KEYS.every((k) => !BUILDING[k].tech && BUILDING[k].wonder.effect && (BUILDING[k].wonder.tech || []).every((t) => TECH[t]) && BUILDING[k].wonder.pop >= 2500), 'no research `tech` of their own; requirements name known techs and at least 2,500 colonists');
  check(KEYS.filter((k) => BUILDING[k].wonder.pop >= 5000).length >= 5 && KEYS.filter((k) => BUILDING[k].wonder.pop >= 10000).length >= 3, 'some after 5,000 colonists, some after 10,000');
  check(KEYS.every((k) => { const lv = BUILDING[k].levels; return lv.length >= 3 && lv.slice(1).every((l) => l.cost && l.days >= 8 && l.name); }), 'built in stages: three or more, each a cost and days of its own');
  check(BUILDING.ark.levels.length === 5 && BUILDING.ark.wonder.megaproject && BUILDING.ark.levels.slice(1).every((l) => (l.cost.alloy || 0) + (l.cost.helium || 0) + (l.cost.food || 0) >= 2000), 'the Ark: five stages, each needing big amounts of alloy, helium-3 or provisions');
  const decks = new Set(KEYS.map((k) => (BUILDING[k].zone === 'any' ? 'space' : (BUILDING[k].decks || ['main']).join('+'))));
  check(BUILDING.arboretum.decks.join() === 'upper' && BUILDING.arena.decks.join() === 'lower' && ['starport', 'spinring', 'ark'].every((k) => BUILDING[k].zone === 'any' && BUILDING[k].on.includes('void')) && decks.size >= 4, `spread across the decks and space (${[...decks].join(', ')})`);
  check(KEYS.every((k) => ['ruess', 'sato', 'general'].includes(R.WLINES[k]?.[0])) && R.ARK_ENDING.length === 3, 'each has a line, and the Ark an ending of three voices');
  check(['tourism', 'monumental', 'generation'].every((k) => TECH[k]?.ver === 9 && TECH[k].needs.every((n) => TECH[n])) && TECHS.filter((t) => t.ver === 9).length === 3, 'version 9: three techs (Tourism, Monumental Engineering, Generation Ships)');
  check(V9.length === 12, `version 9: 12 buildings (8 wonders, the Hotel, Promenade, Theatre, Casino) (${V9.length})`);
  check(V9.every((d) => KITS[d.key] && [1, 2, 3, 4, 5].every((l) => kitParts(d.key, l).every((p) => p.size.every(Number.isFinite) && p.pos.every(Number.isFinite)))), 'every version 9 building has a 3D kit at every stage');
  for (const k of KEYS) {
    const n = R.stagesOf(k), sig = (l) => JSON.stringify(kitParts(k, l));
    const grows = [...Array(n - 1).keys()].every((i) => sig(i + 1) !== sig(i + 2)) && kitParts(k, 1).some((p) => p.color === '#e8b52a');
    check(grows, `${k}: the kit changes at every stage, with cranes while it is being built`);
  }
  check(KEYS.every((k) => kitHeight(kitParts(k, R.stagesOf(k))) > 2.8), `finished wonders are tall (${KEYS.map((k) => kitHeight(kitParts(k, R.stagesOf(k))).toFixed(1)).join(' ')})`);
  check(kitParts('ark', 5, null, { launched: 10 }).length < kitParts('ark', 5).length, 'the Ark\'s dock stands empty once she has flown');
  check(V9.every((d) => MANIFEST[`card/${d.key}`] && existsSync(new URL(`../tools/art/colony/prompts/card-${d.key}.txt`, import.meta.url))), 'every version 9 building has a card slot and a prompt');
  check(MANIFEST['scene/ark'] && existsSync(new URL('../tools/art/colony/prompts/scene-ark.txt', import.meta.url)), 'the Ark\'s ending has a scene slot and a prompt');
  const help = helpHtml(null, null);
  check(['wonders', 'tourism', 'ark'].every((id) => HELP_SECTIONS.some(([x]) => x === id) && help.includes(`id="help-${id}"`)), 'How to play: Wonders, Tourism and The Ark');
  check(KEYS.every((k) => help.includes(BUILDING[k].name)), 'the help names every wonder');
}

// ---------------------------------------------------------------- the requirement, one of a kind, stages
{
  const s = colony();
  const bl = R.buildable(s);
  check(KEYS.every((k) => { const o = bl.find((b) => b.key === k); return o && !o.unlocked && /^Needs /.test(o.why); }), 'a new colony: every wonder locked, saying what it needs');
  const s2 = late();
  const why = R.landmarkWhy(s2, 'arboretum');
  check(/Needs Governor's Garden finished\./.test(why), `the Arboretum waits on the Governor's Garden ("${why}")`);
  stand(s2, 'govgarden');
  check(!R.landmarkWhy(s2, 'arboretum'), 'with it standing, the Arboretum can be built');
  const rng = stateRng(s2);
  tick(s2, rng);
  check(s2.landmarks.earned.arboretum === s2.day && s2.log.some((l) => /A wonder can be built: Grand Arboretum/.test(l.text)), 'the day it is earned, the log says so');
  s2.pop = 100;
  check(!R.landmarkWhy(s2, 'arboretum'), 'once earned, kept');
  s2.pop = 20000;
  const b = place(s2, 'arboretum');
  check(!!b && b.deck === 'upper' && b.level === 1 && b.build === BUILDING.arboretum.days, 'placed on the upper deck: stage 1, Terraces, 12 days');
  check(/already has Grand Arboretum: a wonder is one of a kind/.test(R.landmarkWhy(s2, 'arboretum')), 'one of a kind');
  check(!R.wonderWorks(b) && !R.wonderHappy(s2).length, 'a foundation does nothing yet');
  check(/Finish building it first/.test(R.upgrade(s2, b.id).msg), 'the next stage waits for this one');
  b.build = 1; tick(s2, rng);
  check(s2.log.some((l) => /Grand Arboretum: Terraces finished \(stage 1 of 3\)\. Order the next stage, Glasshouses/.test(l.text)), 'a stage done: the log says what comes next');
  rich(s2, false); s2.stock.alloy = 10;
  const poor = R.upgrade(s2, b.id);
  check(!poor.ok && /more alloy/.test(poor.msg), `the next stage needs alloy ("${poor.msg}")`);
  s2.stock.alloy = 1000;
  const c0 = { ...s2.stock }, cost = R.costOf(s2, BUILDING.arboretum.levels[1].cost, 'arboretum');
  const r = R.upgrade(s2, b.id);
  check(r.ok && b.level === 2 && b.build === 14 && /Glasshouses \(stage 2 of 3\)/.test(r.msg), `stage 2 ordered: ${r.msg}`);
  check(c0.alloy - s2.stock.alloy === cost.alloy && c0.credits - s2.stock.credits === cost.credits, `it pays its credits, parts and alloy (${cost.credits} cr, ${cost.alloy} alloy)`);
  check(!R.wonderWorks(b), 'still not working while the frame goes up');
  check(R.wonderStage(b).stage === 2 && R.wonderStage(b).next?.name === 'Grand Arboretum' && R.wonderStage(b).building, 'wonderStage reads the stage and the next');
  b.build = 1; s2.pending.length = 0; tick(s2, rng);
  check(!s2.pending.some((p) => p.kind === 'wonder'), 'no moment until the last stage');
  rich(s2); R.upgrade(s2, b.id); b.build = 1; s2.pending.length = 0; tick(s2, rng);
  const p = s2.pending.find((x) => x.kind === 'wonder');
  check(R.wonderWorks(b) && p && p.wonder === 'arboretum' && p.quote === R.WLINES.arboretum[1] && p.show?.tile?.deck === 'upper', 'the last stage: it works, and its moment plays with the General\'s line and a Show me');
  s2.pending.length = 0; tick(s2, rng);
  check(!s2.pending.some((x) => x.kind === 'wonder'), 'played once');
  check(!R.upgrade(s2, b.id).ok, 'nothing beyond the last stage');
  const st = R.wonderStatus(s2).find((x) => x.key === 'arboretum');
  check(st.state === 'working' && st.stage === 3 && st.stages === 3 && st.done != null, 'wonderStatus reads it');
  // demolishing refunds half of every stage's credits and parts
  const cr = s2.stock.credits, back = R.demolish(s2, b.id);
  check(back.ok && s2.stock.credits - cr >= Math.floor(R.costOf(s2, BUILDING.arboretum.cost, 'arboretum').credits / 2), 'demolished: half its cost back');
}

// ---------------------------------------------------------------- the lasting effects
{
  const s = late(2), rng = stateRng(s);
  for (const k of ['govgarden', 'hallofnames', 'elevator']) stand(s, k);
  const built = {};
  for (const k of ['arboretum', 'library', 'concerthall', 'memorial', 'arena', 'starport']) {
    built[k] = place(s, k);
    check(!!built[k], `${k}: placed (${BUILDING[k].size}×${BUILDING[k].size} on the ${deckFor(k)} deck${BUILDING[k].zone === 'any' ? ', in space by the hull' : ''})`);
    if (built[k]) { const why = finish(s, built[k], rng); check(!why && R.wonderWorks(built[k]), `${k}: every stage built (${why || 'ok'})`); }
  }
  const hp = Object.fromEntries(R.wonderHappy(s).map((x) => [x.label, x.value]));
  check(hp['Grand Arboretum'] === 4 && hp['Memorial Garden'] === 5 && hp['Zero-G Arena'] === 6, `happiness for the whole colony (${JSON.stringify(hp)})`);
  check(s.happyParts.some((x) => x.label === 'Zero-G Arena' && x.value === 6), 'and in the happiness breakdown');
  const a = built.arboretum;
  check(R.spec(a).park === 14 && R.spec(a).radius === 20 && R.parkAt(s, a) >= 14, 'the Arboretum: a park of 14 within 20 tiles');
  const lvArb = R.landValueParts(s, 'upper', a.x + 8, a.y + 2);
  check(lvArb.parts.some((x) => /A wonder nearby \(Grand Arboretum\)/.test(x.label) && x.value === 15), 'the Arboretum raises land value +15 around it');
  const res = R.wonderResearch(s);
  check(res > 0 && Math.abs(res - 4 * s.pop / 1000) < 1e-9, `the Great Library: 4 research per 1,000 colonists (${res.toFixed(1)} at ${s.pop})`);
  check(R.serviceValue(built.concerthall) === 8 && R.spec(built.concerthall).radius === 24 && R.spec(built.concerthall).leisure === 3, 'the Concert Hall: happiness 8 within 24 tiles, and leisure');
  check(R.wonderTransport(s) === 2 && R.wonderVisitors(s) === 4, 'the Starport: transports ×2, visitors ×4');
  const st = R.stagesOf('spinring'), ring = place(s, 'spinring');
  check(!!ring && !finish(s, ring, rng) && ring.level === st, 'the Spin-Gravity Ring, once the Starport stands');
  check(R.spec(ring).housing === 3000 && R.housingOf(s) >= 3000, 'homes for 3,000 in space');
  // the Memorial Garden: grief and fear fade twice as fast again (on top of the Hall of Names)
  s.raid.moods = [{ label: 'Raid fear', value: -12, day: s.day, days: 12 }];
  tick(s, rng, 4);
  check(!s.raid.moods.length, 'the Memorial Garden and the Hall of Names: a 12-day fear is gone in 4 days (12 alone, 6 with the Hall)');
  // a damaged or switched-off wonder gives nothing
  built.starport.off = true;
  check(R.wonderTransport(s) === 1, 'switched off, its effect stops');
  built.starport.off = false;
  // the Starport doubles transports in a running colony: the first transport, with and without it (the same dice)
  const first = (port) => {
    const t = colony(4); t.difficulty = 'easy'; t.pop = 300;
    for (const key of ['towerblock', 'towerblock', 'towerblock', 'towerblock', 'dock', 'vertfarm', 'sunmirror', 'park', 'park']) stand(t, key);
    if (port) { stand(t, 'starport', { level: 3 }); t.wonders.done.starport = 0; }
    const rng2 = stateRng(t);
    for (let d = 0; d < 30; d++) { feed(t); t.pending.length = 0; dayTick(t, rng2); if (t.flags.arrival?.day === t.day) return t.flags.arrival.n; }
    return 0;
  };
  const without = first(false), withS = first(true);
  check(without > 0 && Math.abs(withS - 2 * without) <= 1, `the Starport: a transport brings twice as many (${without} → ${withS})`);
}

// ---------------------------------------------------------------- the Ark: the second ending
{
  const s = late(4, 16000), rng = stateRng(s);
  check(/Needs Starport finished/.test(R.landmarkWhy(s, 'ark')), 'the Ark waits on the Starport');
  const port = stand(s, 'starport', { level: 3 });
  stand(s, 'elevator');
  s.pop = 14000;
  check(/15,000 colonists/.test(R.landmarkWhy(s, 'ark')), 'and on 15,000 colonists');
  s.pop = 16000;
  check(!R.landmarkWhy(s, 'ark'), 'with both, it can be built');
  check(!R.victoryStatus(s).met && !s.victory, 'Eden is not restored yet: the Ark does not need it');
  for (const g of R.EXTRA_COST) s.stock[g] = 1e5;
  const b = place(s, 'ark');
  check(!!b && b.build === 20, 'the Keel ordered: 20 days');
  check(BUILDING.ark.levels.slice(1).reduce((t, l) => t + l.days, BUILDING.ark.days) >= 100, 'five stages: over a hundred days of work in all');
  b.build = 1; tick(s, rng);
  for (let k = 2; k < 5; k++) { rich(s); R.upgrade(s, b.id); b.build = 1; tick(s, rng); }
  check(b.level === 4 && !s.ark, 'four stages done: no ending yet');
  rich(s); s.stock.food = 100;
  check(/more food/.test(R.upgrade(s, b.id).msg), 'the last stage needs its provisions');
  rich(s);
  check(R.upgrade(s, b.id).ok, 'the provisions loaded');
  b.build = 1; s.pending.length = 0;
  const ev = tick(s, rng);
  const p = s.pending.find((x) => x.kind === 'ark');
  check(p && p.title === 'Beyond Eden' && p.choices[0].key === 'keep', 'finished: the second ending, Beyond Eden');
  check(ev.some((e) => e.kind === 'ark' && e.pause), 'the day pauses for it');
  check(s.ark && s.ark.day === s.day && s.ark.pop > 0 && s.ark.restored === null && b.launched === s.day, `remembered in state.ark (and she has flown): ${JSON.stringify(s.ark)}`);
  check(!s.victory, 'Eden Restored is untouched');
  s.pending.length = 0; tick(s, rng, 2);
  check(!s.pending.some((x) => x.kind === 'ark'), 'it plays once');
  check(R.wonderHappy(s).some((x) => x.label === 'The Ark' && x.value === 5), 'afterwards, +5 happiness');
  const back = loadState(saveState(s));
  check(back.ark && back.ark.day === s.ark.day && back.buildings.find((x) => x.key === 'ark').launched === b.launched, 'save and load keep the Ark\'s ending');
  check(port.level === 3, 'the Starport still stands');
}

// ---------------------------------------------------------------- saves
{
  const s = late(5); stand(s, 'govgarden');
  for (const g of R.EXTRA_COST) s.stock[g] = 1e5;
  const b = place(s, 'arboretum'); b.build = 0; rich(s); R.upgrade(s, b.id);
  const back = loadState(saveState(s)), bb = back.buildings.find((x) => x.key === 'arboretum');
  check(bb.level === 2 && bb.build === 14 && back.wonders && back.ark === null, 'loaded mid-stage: the stage and its days are kept');
  const old = JSON.parse(saveState(s)); delete old.wonders; delete old.ark;
  const up = loadState(JSON.stringify(old));
  check(up.wonders && up.wonders.done && up.ark === null && R.wonderStatus(up).length === 8, 'an older save gets the wonder state');
}

console.log(`colony-wonders: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
