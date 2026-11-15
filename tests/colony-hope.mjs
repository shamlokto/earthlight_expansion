// Version 13 (docs/COLONY-V13.md): story arc 2, The Hope. Once the Ark is complete the Hope (Earth) opens as a deck
// of its own: generated from the seed, mostly poisoned, its own colonists and stores, reached only by the Ark (and goods
// by the Mass Driver / Orbital Elevator); very expensive Earth-only buildings treat the ground step by step; the
// recovery percent, the story beats and the Earthlight ending. Data, kits, art slots, help, save and load.
//   node tests/colony-hope.mjs
import { existsSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { BUILDING, BUILDINGS } from '../js/colony/data/buildings.js';
import { HOPE_BUILDINGS } from '../js/colony/data/hope.js';
import { T, TERRAIN } from '../js/colony/data/terrain.js';
import { KITS, kitParts } from '../js/colony/view3d/kits.js';
import { MANIFEST } from '../js/colony/art.js';
import { helpHtml, HELP_SECTIONS } from '../js/colony/ui.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const prompt = (slot) => MANIFEST[slot]?.prompt && existsSync(new URL(`../${MANIFEST[slot].prompt}`, import.meta.url));

function colony(seed = 1) {
  const s = newGame({ seed });
  Object.assign(s.stock, { credits: 1e7, parts: 1e5, alloy: 1e5, food: 1e5, water: 1e5, air: 1e5 });
  s.pending.length = 0; s.options.raids = false; s.options.incidents = false; s.options.petitions = false;
  s.pop = 20000;
  return s;
}
const days = (s, n) => { const rng = stateRng(s); let ev = []; for (let k = 0; k < n; k++) { ev = ev.concat(dayTick(s, rng).events); s.pending.length = 0; } return ev; };
const rich = (s) => { s.stock.credits = 1e7; for (const g of ['parts', 'alloy', 'food', 'water', 'air']) s.stock[g] = 1e5; s.pop = Math.max(s.pop, 20000); };
// a free spot for `key` on Earth (the rules decide)
function spot(s, key, pred = () => true) {
  const m = s.decks.earth;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (pred(x, y) && !R.hopeCanBuild(s, key, x, y)) return { x, y };
  return null;
}

// ---- data
{
  const keys = HOPE_BUILDINGS.map((d) => d.key);
  check(keys.length >= 10 && ['landingfield', 'sealeddome', 'airscrubber', 'deconplant', 'soilreactor', 'seapurifier', 'tidewall', 'seedbank', 'firstfields', 'reforest'].every((k) => keys.includes(k)), 'ten Earth buildings');
  check(keys.every((k) => BUILDING[k] && !BUILDINGS.some((d) => d.key === k)), 'looked up in BUILDING, never on Eden\'s menu (BUILDINGS)');
  check(HOPE_BUILDINGS.filter((d) => !d.fixed).every((d) => d.cost.credits >= 1500 && d.cost.alloy > 0 && d.decks.join() === 'earth'), 'all expensive (alloy too), Earth only');
  check(HOPE_BUILDINGS.filter((d) => !d.fixed && d.key !== 'tidewall' && d.key !== 'firstfields').every((d) => d.cost.credits >= 6000), 'the big ones cost 6,000 credits or more');
  check(['ash', 'ruins', 'toxic', 'radzone', 'mire', 'deadsea', 'sea', 'landing'].every((k) => TERRAIN.some((d) => d.key === k && d.ver === 13)), 'eight Earth terrains');
  check(keys.every((k) => KITS[k] && kitParts(k).length >= 4), 'a kit for every Earth building');
  check(kitParts('landingfield', 1, null, { ship: true }).length > kitParts('landingfield').length, 'the Ark shows on the landing field while she is down');
  check(kitParts('ark', 5, null, { launched: 10, ship: true }).length > kitParts('ark', 5, null, { launched: 10 }).length, 'and in her dock at Eden while she is home');
  check(keys.every((k) => prompt(`card/${k}`)), 'card slots with prompts');
  check(['ash', 'ruins', 'toxic', 'radzone', 'mire', 'deadsea', 'sea', 'landing'].every((k) => prompt(`terrain/${k}`)), 'terrain slots with prompts');
  check(prompt('scene/earthlight') && prompt('scene/hope'), 'scene slots: the Hope and Earthlight');
  const help = helpHtml(() => null, null);
  check(HELP_SECTIONS.some(([x]) => x === 'hope') && help.includes('id="help-hope"') && /Ark/.test(help), 'How to play: The Hope');
}

// ---- the map
{
  const s = colony(7), a = R.generateHope(7, s.map), b = R.generateHope(7, s.map);
  check(a.t.every((v, i) => v === b.t[i]) && a.landing.x === b.landing.x, 'the same seed, the same Hope');
  const c = R.generateHope(8, s.map);
  check(c.t.some((v, i) => v !== a.t[i]), 'another seed, another Hope');
  const n = {}; let tot = 0;
  for (const v of a.t) if (v !== T.OUTSIDE) { tot++; n[TERRAIN[v].key] = (n[TERRAIN[v].key] || 0) + 1; }
  check(tot === 160 * 80, `Eden's footprint (${tot} tiles)`);
  check(['ash', 'ruins', 'toxic', 'radzone', 'mire', 'deadsea', 'landing'].every((k) => n[k] > 0), `every hazard present (${JSON.stringify(n)})`);
  check(n.deadsea > tot * 0.08 && n.toxic > tot * 0.12 && n.landing === 100, 'a sea along one side, a lot of gas, a 10 × 10 landing field');
  const harmful = (v) => v === T.TOXIC || v === T.RADZONE;
  let near = 0;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) if (harmful(a.t[(a.landing.y + 4 + dy) * a.w + a.landing.x + 4 + dx])) near++;
  check(near === 0, 'clean ground around the landing field');
  check((n.plain || 0) + (n.fertile || 0) + (n.forest || 0) + (n.sea || 0) === 0, 'nothing recovered at the start');
}

// ---- the unlock
{
  const s = colony(3);
  days(s, 2);
  check(!R.hopeOn(s) && R.hopeStatus(s).unlocked === false, 'locked before the Ark');
  check(/Earth/.test(R.canBuild(s, 'sealeddome', 100, 60, 'earth')), 'nothing can be built on Earth yet');
  s.ark = { day: s.day, pop: s.pop };
  s.buildings.push({ id: s.nextId++, key: 'ark', x: 10, y: 10, level: 5, build: 0, off: false, launched: s.day, mode: null });
  const rng = stateRng(s);
  const ev = dayTick(s, rng).events;
  check(R.hopeOn(s) && s.decks.earth.t.length === s.map.t.length && s.pending.some((p) => p.kind === 'hope') && ev.some((e) => e.kind === 'hope' && e.pause), 'the day after the Ark: the Hope opens, with a story beat');
  check(R.mapOf(s, 'earth') === s.decks.earth, 'rules.mapOf reads the Earth deck');
  const lf = s.hope.buildings.find((b) => b.key === 'landingfield');
  check(lf && lf.deck === 'earth' && R.hopeHousing(s) === 20 && R.hopeCaps(s).food === 1500, 'the Landing Field: tents for 20, stores');
  check(s.buildings.find((b) => b.key === 'ark').ship === true, 'the Ark is back in her dock');
  check(R.tileInfo(s, lf.x, lf.y, 'earth').building === lf, 'the inspector finds Earth buildings');
  check(/Eden|Hope's own/.test(R.canBuild(s, 'habitat', lf.x + 5, lf.y, 'earth')), 'Eden\'s buildings cannot stand on Earth');
  check(R.canBuild(s, 'sealeddome', 100, 60, 'main') != null, 'and Earth buildings cannot stand in Eden');

  // ---- the Ark: load, trip, unload, return
  R.setManifest(s, { pop: 200 });
  check(s.hope.ark.manifest.pop === R.HOPE.capacity.pop, 'colonists capped at the Ark\'s capacity');
  check(!R.launchArk(s, { pop: 10, food: 1500, water: 1500 }).ok, 'cargo over capacity refused');
  rich(s); s.pop = 5000;
  const before = { pop: s.pop, food: s.stock.food };
  const r = R.launchArk(s, { pop: 20, food: 600, water: 500, air: 400, parts: 300, alloy: 200 });
  check(r.ok && s.hope.ark.at === 'out' && s.pop === before.pop - 20 && s.stock.food === before.food - 600, 'launched: Eden pays the load');
  check(s.buildings.find((b) => b.key === 'ark').ship === false, 'the dock stands empty while she is away');
  check(!R.launchArk(s).ok, 'one trip at a time');
  const td = R.tripDays(s);
  days(s, td - 1);
  check(s.hope.pop === 0 && s.hope.ark.at === 'out', `still on the way after ${td - 1} days`);
  days(s, 1);
  check(s.hope.pop === 20 && s.hope.stock.parts === 300 && s.hope.ark.at === 'earth' && lf.ship === true, 'landed: colonists and goods unloaded, the Ark on the field');
  check(s.hope.milestones.landfall != null, 'the landfall beat');
  days(s, R.HOPE.stayDays + td);
  check(s.hope.ark.at === 'eden' && s.hope.ark.trips === 1 && !lf.ship, 'home again: one trip done');
  // more people than homes: the rest stay aboard and come back
  s.hope.ark.manifest = { pop: 30, food: 0, water: 0, air: 0, parts: 0, alloy: 0 };
  s.pop = 5000;
  R.launchArk(s);
  days(s, td);
  check(s.hope.pop === 20 && s.hope.ark.load.pop === 30, 'no home on Earth: they stay aboard');
  days(s, td + R.HOPE.stayDays);
  check(s.hope.ark.at === 'eden' && s.hope.ark.load === null && s.hope.ark.trips === 2, 'and ride back to Eden');

  // ---- building on Earth: costs on Earth's stores, clean ground, crews
  s.hope.stock.parts = 0;
  const sp = spot(s, 'airscrubber');
  check(sp === null, 'no parts on Earth: nothing big can be built');
  s.hope.stock.parts = 1500; s.hope.stock.alloy = 1000; s.hope.pop = 20; rich(s);
  const ds = spot(s, "sealeddome");
  check(!!ds, 'a dome fits by the landing field');
  const tox = (() => { const m = s.decks.earth; for (let i = 0; i < m.t.length; i++) if (m.t[i] === T.TOXIC) return { x: i % m.w, y: (i / m.w) | 0 }; return null; })();
  check(/treat it first/.test(R.hopeCanBuild(s, 'sealeddome', tox.x, tox.y)), 'not on toxic gas');
  const cr = s.stock.credits, b1 = R.build(s, 'sealeddome', ds.x, ds.y, 'earth');
  check(b1.ok && s.stock.credits === cr - BUILDING.sealeddome.cost.credits && s.hope.stock.parts === 1200, 'built through rules.build on the Earth deck: credits from Eden, parts from the Hope');
  check(/Seed Bank/.test(R.hopeCanBuild(s, 'firstfields', ds.x + 6, ds.y)) || R.hopeCanBuild(s, 'firstfields', ds.x + 6, ds.y) != null, 'fields wait on a Seed Bank and recovered soil');
  s.hope.stock.food = 1000; s.hope.stock.water = 1000; s.hope.stock.air = 1000;
  days(s, BUILDING.sealeddome.days);
  check(s.hope.buildings.find((b) => b.id === b1.id).build === 0 && R.hopeHousing(s) === 60, 'a crew finished the dome: 60 homes');
  check(s.hope.milestones.dome != null, 'the dome beat');

  // ---- treating the ground
  s.hope.stock.parts = 1500; s.hope.stock.alloy = 1000; rich(s);
  const sc = spot(s, 'airscrubber', (x, y) => { const m = s.decks.earth; let n = 0; for (let dy = -6; dy < 8; dy++) for (let dx = -6; dx < 8; dx++) if (m.t[(y + dy) * m.w + x + dx] === T.TOXIC) n++; return n > 20; });
  check(!!sc, 'a scrubber site beside the gas');
  const rb = R.build(s, 'airscrubber', sc.x, sc.y, 'earth');
  const countT = (v) => s.decks.earth.t.reduce((t, x) => t + (x === v ? 1 : 0), 0);
  const tox0 = countT(T.TOXIC);
  s.hope.pop = 60;
  days(s, BUILDING.airscrubber.days + 5);
  check(rb.ok && countT(T.TOXIC) <= tox0 - 10 && s.hope.stats.treated >= 10, `the scrubber clears toxic gas, three tiles a day (${tox0} → ${countT(T.TOXIC)})`);
  // the chain: dead ground → plain → fertile → forest, by a Soil Reactor, Seed Bank and Reforestation Station
  s.hope.stock.parts = 1500; s.hope.stock.alloy = 1000; rich(s);
  const rr = spot(s, 'soilreactor', (x, y) => Math.abs(x - lf.x) <= 12 && Math.abs(y - lf.y) <= 12);
  R.build(s, 'soilreactor', rr.x, rr.y, 'earth');
  const rec0 = R.hopeRecovery(s).recovered;
  for (let k = 0; k < 30; k++) { s.hope.stock.food = s.hope.stock.water = s.hope.stock.air = 1000; days(s, 1); }
  check(countT(T.PLAIN) > 20 && R.hopeRecovery(s).recovered > rec0 && s.hope.recovery > 0, 'the Soil Reactor brings dead ground back to plain soil: recovery rises');
  s.hope.stock.parts = 1500; s.hope.stock.alloy = 1000; rich(s);
  const nearR = (x, y) => Math.abs(x - rr.x) <= 7 && Math.abs(y - rr.y) <= 7;
  const sb = spot(s, 'seedbank', nearR); R.build(s, 'seedbank', sb.x, sb.y, 'earth');
  for (let k = 0; k < 20; k++) { s.hope.stock.food = s.hope.stock.water = s.hope.stock.air = 1000; days(s, 1); }
  check(countT(T.FERTILE) > 5, 'the Seed Bank makes plain soil fertile');
  s.hope.stock.parts = 1500; s.hope.stock.alloy = 1000; rich(s);
  const ff = spot(s, 'firstfields', (x, y) => Math.abs(x - sb.x) <= 9 && Math.abs(y - sb.y) <= 9);
  check(!!ff, 'First Fields on recovered soil once a Seed Bank stands');
  if (ff) R.build(s, 'firstfields', ff.x, ff.y, 'earth');
  s.hope.stock.parts = 1500; s.hope.stock.alloy = 1000; rich(s);
  const rf = spot(s, 'reforest', (x, y) => Math.abs(x - sb.x) <= 4 && Math.abs(y - sb.y) <= 4); R.build(s, 'reforest', rf.x, rf.y, 'earth');
  for (let k = 0; k < 50; k++) { s.hope.stock.food = s.hope.stock.water = s.hope.stock.air = 1000; days(s, 1); }
  check(countT(T.FOREST) > 0 && s.hope.stats.harvest > 0, 'forest grows; the fields give food');
  // the sea
  s.hope.stock.parts = 1500; s.hope.stock.alloy = 1000; rich(s);
  const sea0 = countT(T.SEA);
  const pu = spot(s, 'seapurifier');
  if (pu) { R.build(s, 'seapurifier', pu.x, pu.y, 'earth'); for (let k = 0; k < 25; k++) { s.hope.stock.food = s.hope.stock.water = s.hope.stock.air = 1000; days(s, 1); } }
  check(pu ? countT(T.SEA) > sea0 + 10 : true, 'the Sea Purifier cleans the poisoned sea (when a shore site is free)');
  check(/shore/.test(R.hopeCanBuild(s, 'seapurifier', lf.x + 4, lf.y + 4 + 4) || '') || /shore/.test(R.hopeCanBuild(s, 'seapurifier', lf.x - 4, lf.y) || ''), 'Sea Purifiers stand on the shore');

  // ---- shortages
  s.hope.stock.food = 0; s.hope.stock.water = 0;
  const pop0 = s.hope.pop;
  days(s, 2);
  check(s.hope.pop < pop0 && s.hope.stats.lost > 0, 'a need short on Earth: colonists are lost');

  // ---- the Mass Driver
  check(!R.sendDown(s, 'food', 300).ok, 'no Mass Driver: nothing can be sent down');
  s.buildings.push({ id: s.nextId++, key: 'massdriver', x: 0, y: 0, level: 1, build: 0, off: false, mode: null });
  rich(s);
  const f0 = s.hope.stock.food, fe = s.stock.food;
  const dr = R.sendDown(s, 'food', 900);
  check(dr.ok && s.stock.food === fe - R.HOPE.drop.massdriver, 'the Mass Driver sends goods down (500 a shot)');
  check(!R.sendDown(s, 'water', 100).ok, 'then it reloads');
  days(s, R.HOPE.drop.days);
  check(s.hope.stats.dropped > 0 && s.hope.stock.food >= 0 && f0 >= 0, 'the goods land at the Hope');

  // ---- save and load
  const t = loadState(saveState(s));
  check(t.decks.earth.t instanceof Uint8Array && t.decks.earth.t.every((v, i) => v === s.decks.earth.t[i]) && t.hope.buildings.length === s.hope.buildings.length && R.hopeOn(t), 'the Hope survives save and load');

  // ---- the ending: Earthlight
  check(!s.hope.earthlight, 'no ending yet');
  const m = s.decks.earth;
  for (let i = 0; i < m.t.length; i++) if (m.t[i] !== T.OUTSIDE && (i % 3)) m.t[i] = T.PLAIN;
  s.hope.pop = R.hopeGoalPop(s) - 5;
  for (let k = 0; k < 6; k++) s.hope.buildings.push({ id: s.nextId++, key: 'sealeddome', x: 0, y: 0, deck: 'earth', level: 1, build: 0, off: false });
  for (let k = 0; k < 12; k++) s.hope.buildings.push({ id: s.nextId++, key: 'sealeddome', x: 0, y: 0, deck: 'earth', level: 1, build: 0, off: false });
  rich(s);
  s.hope.stock.food = s.hope.stock.water = s.hope.stock.air = 1500;
  let ev2 = days(s, 1);
  check(!s.hope.earthlight && s.hope.recovery >= 0.5, 'recovered but not enough people: not yet');
  s.hope.pop = R.hopeGoalPop(s) + 20;
  s.hope.stock.food = s.hope.stock.water = s.hope.stock.air = 1500;
  const rng2 = stateRng(s);
  ev2 = dayTick(s, rng2).events;
  check(s.hope.earthlight && s.hope.earthlight.recovery >= 50 && ev2.some((e) => e.kind === 'earthlight') && s.pending.some((p) => p.kind === 'earthlight'), 'half the Hope recovered and enough colonists: Earthlight');
  check(R.HOPE_ENDING.length === 3 && R.HOPE_ENDING.map((x) => x[0]).join() === 'ruess,sato,general', 'Ruess, Sato and the General close it');
  const day = s.hope.earthlight.day;
  s.pending.length = 0; days(s, 3);
  check(s.hope.earthlight.day === day && !s.pending.some((p) => p.kind === 'earthlight'), 'once, remembered');
  check(loadState(saveState(s)).hope.earthlight.day === day, 'kept in the save');
}

// ---- it never blocks the others: an old colony without the Hope plays as before
{
  const s = colony(5);
  days(s, 5);
  check(s.hope === null && !s.decks.earth, 'no Ark, no Hope');
  const t = loadState(saveState(s));
  check(t.hope === null, 'an old save loads without it');
}

console.log(`colony-hope: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
