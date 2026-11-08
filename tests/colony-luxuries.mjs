// Version 10 (docs/COLONY-V10.md): luxuries for the well-off. Spires, Skyscrapers, Arcologies and the Spin-Gravity Ring
// want coffee, wine and art (Coffee Terraces on the hills, Vineyard Domes on the upper deck, Artisan Workshops from parts);
// meeting the want gives happiness and lets a Skyscraper hold; missing it never hurts anything else.
//   node tests/colony-luxuries.mjs
import { readFileSync, existsSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { BUILDING, BASE_PRICE } from '../js/colony/data/buildings.js';
import { TECH } from '../js/colony/data/tech.js';
import { KITS } from '../js/colony/view3d/kits.js';
import { MANIFEST } from '../js/colony/art.js';
import { helpHtml } from '../js/colony/ui.js';
import { luxuriesDay } from '../js/colony/luxuries.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
function colony(seed = 1) {
  const s = newGame({ seed });
  s.stock.credits = 1e6; s.stock.parts = 1e5; s.pending.length = 0;
  Object.assign(s.options, { raids: false, incidents: false, petitions: false, neighbours: false });
  return s;
}
function learn(s, ...keys) {
  for (const k of keys) {
    if (!s.research.done.includes(k)) s.research.done.push(k);
    for (const u of TECH[k].unlocks) if (!s.unlocked.includes(u)) s.unlocked.push(u);
  }
}
const stand = (s, key, extra = {}) => { const b = { id: s.nextId++, key, x: 2, y: 2, level: 1, mode: null, build: 0, off: false, ...extra }; s.buildings.push(b); return b; };
const feed = (s) => { const cap = R.storageCaps(s); for (const g of ['food', 'water', 'air']) s.stock[g] = cap[g]; };
const tick = (s) => dayTick(s, stateRng(s));
const L3 = ['coffee', 'vineyard', 'artisan'];

// ---------------------------------------------------------------- data, help, art
{
  check(L3.every((k) => BUILDING[k]?.ver === 10 && BUILDING[k].tech === 'luxuries' && TECH.luxuries.unlocks.includes(k)), 'the Coffee Terrace, Vineyard Dome and Artisan Workshop: research Luxury Goods');
  check(TECH.luxuries.ver === 10 && TECH.luxuries.needs.includes('highrise'), 'Luxury Goods follows High-rise Homes');
  check(BUILDING.coffee.on.join() === 'hills' && BUILDING.coffee.makes.coffee === 20 && BUILDING.vineyard.decks.join() === 'upper' && BUILDING.vineyard.makes.wine === 16 && BUILDING.artisan.uses.parts === 2 && BUILDING.artisan.makes.art === 10,
    'coffee on the hills (20 a day), wine on the upper deck (16), art from 2 parts (10)');
  check(R.LUX_GOODS.every((g) => BASE_PRICE[g] > 0), 'the luxuries have a price at the Market');
  check(BUILDING.towerblock.levels[3].needs.includes('luxuries') && R.habitatLevelReachable(BUILDING.towerblock.levels[3]), 'a Skyscraper wants luxuries, and is still reachable');
  check(L3.every((k) => KITS[k] && KITS[k]().length > 10), 'each has a 3D kit');
  check(L3.every((k) => MANIFEST[`card/${k}`]?.prompt && existsSync(new URL(`../${MANIFEST[`card/${k}`].prompt}`, import.meta.url))), 'card slots with prompts');
  const help = helpHtml(null, null);
  check(/id="help-luxuries"/.test(help) && /Nothing else suffers without them/.test(help), 'How to play: Luxuries');
  const ui = readFileSync(new URL('../js/colony/ui.js', import.meta.url), 'utf8');
  check(/goodStat\('coffee'\)/.test(ui) && /coffee: 'luxuries'/.test(ui) && /function luxuryHtml/.test(ui), 'the More pop-out and the Market show them once relevant');
  const s = colony();
  check(!R.luxuriesShown(s) && s.stock.coffee === 0, 'a new colony: no luxuries shown');
  learn(s, 'luxuries');
  check(R.luxuriesShown(s), 'shown once Luxury Goods is researched');
}

// ---------------------------------------------------------------- who wants them
{
  const s = colony();
  const t = stand(s, 'towerblock', { level: 2 });
  s.housing = R.housingOf(s); s.pop = s.housing;
  check(R.wellOffOf(s) === 0, 'a Tower is not well-off');
  t.level = 3; s.housing = R.housingOf(s); s.pop = s.housing;
  check(R.wellOffOf(s) === 450, 'a full Spire: 450 well-off');
  stand(s, 'arcology'); s.housing = R.housingOf(s); s.pop = Math.round(s.housing / 2);
  check(Math.abs(R.wellOffOf(s) - 975) <= 1, 'an Arcology too, scaled by how full Eden\'s homes are');
  stand(s, 'spinring', { level: R.stagesOf('spinring') - 1 });
  const w = R.wellOffOf(s);
  stand(s, 'spinring', { level: R.stagesOf('spinring'), id: 9999 });
  check(R.wellOffOf(s) > w, 'the finished Spin-Gravity Ring, not before its last stage');
}

// ---------------------------------------------------------------- the day: use, share, happiness, no penalty
{
  const s = colony();
  stand(s, 'towerblock', { level: 3 }); s.housing = R.housingOf(s); s.pop = s.housing;
  learn(s, 'luxuries');
  let L = luxuriesDay(s);
  check(L.wellOff === 450 && Math.abs(L.want.coffee - 4.5) < 1e-9 && Math.abs(L.want.wine - 3.6) < 1e-9 && Math.abs(L.want.art - 2.25) < 1e-9, 'a Spire\'s 450 want 4.5 coffee, 3.6 wine and 2.25 art a day');
  check(L.share.coffee === 0 && R.luxuryStatus(s).goods.every((g) => g.share === 0), 'none in store: none met');
  feed(s); tick(s);
  check(!s.happyParts.some((p) => /Luxur/.test(p.label) || p.value < -20), 'missing luxuries: no happiness part at all, no penalty');
  s.housing = R.housingOf(s); s.pop = s.housing;
  s.stock.coffee = 100; s.stock.wine = 100; s.stock.art = 1;
  const consumed = {};
  L = luxuriesDay(s, { consumed });
  check(Math.abs(s.stock.coffee - 95.5) < 1e-9 && L.share.coffee === 1 && Math.abs(L.share.art - 1 / 2.25) < 1e-9 && Math.abs(consumed.coffee - 4.5) < 1e-9, 'they use what they want, as far as the store goes (art 44%)');
  s.stock.art = 100; feed(s); tick(s);
  check(s.happyParts.some((p) => p.label === 'Luxuries for the well-off' && p.value === 6), 'all three met: +6 happiness');
  s.stock.wine = 0; s.stock.art = 0; feed(s); tick(s);
  check(s.happyParts.some((p) => p.label === 'Luxuries for the well-off' && p.value === 2), 'coffee only: +2');
}

// ---------------------------------------------------------------- making them
{
  const s = colony();
  learn(s, 'luxuries');
  const c = stand(s, 'coffee'), a = stand(s, 'artisan');
  s.stock.coffee = 0; s.stock.art = 0; feed(s); tick(s);
  const pr = s.stats.last.produced;
  check(pr.coffee > 10 && pr.art > 5 && s.stats.last.consumed.parts >= 1, `a Coffee Terrace and an Artisan Workshop at work: ${pr.coffee.toFixed(1)} coffee, ${pr.art.toFixed(1)} art from parts`);
  check(R.summary(s).stock.coffee.have > 0 && R.summary(s).stock.coffee.cap === R.luxCap(s), 'the top bar reads them with their store');
  const r = R.sell(s, 'coffee', 5);
  check(r.ok && r.credits > 0, `sold at the Market: "${r.msg}"`);
  // the store, and the surplus sold by itself
  s.stock.wine = R.luxCap(s) + 100;
  const cr = s.stock.credits;
  luxuriesDay(s);
  check(s.stock.wine === R.luxCap(s) && s.stock.credits > cr && s.luxuries.exported > 0, `beyond the store (${R.luxCap(s)}) the surplus is sold to the traders by itself (+${s.luxuries.exported} cr)`);
  const cap0 = R.luxCap(s); stand(s, 'warehouse');
  check(R.luxCap(s) === cap0 + R.LUX.capWarehouse, 'a Warehouse holds 200 more of each');
  // placing a Coffee Terrace: hills only
  const t = colony(); learn(t, 'luxuries');
  const flat = t.buildings.find((b) => b.key === 'habitat');
  check(/Hills|hills/.test(R.canBuild(t, 'coffee', flat.x + 1, flat.y + 1) || '') || R.canBuild(t, 'coffee', flat.x + 1, flat.y + 1) !== null, 'a Coffee Terrace is refused off the hills');
}

// ---------------------------------------------------------------- the Skyscraper
{
  const mk = (tech) => {
    const s = colony();
    learn(s, 'highrise', 'skyscrapers', 'urbanplan', 'medicine');
    if (tech) learn(s, 'luxuries');
    const t = stand(s, 'towerblock', { level: 4, x: 0, y: 0 });
    return { s, t };
  };
  const { s, t } = mk(true);
  s.stats.last.met = { food: true, water: true, air: true, power: true };
  const lower = R.habitatNeeds(s, { ...t, level: 3 }).find((n) => n.need === 'luxuries');
  check(lower && !lower.met && !lower.grow && /coffee 0%, wine 0%/.test(lower.label), `with Luxury Goods, a Skyscraper must hold coffee and wine: "${lower?.label}"`);
  s.stock.coffee = 1000; s.stock.wine = 1000;
  luxuriesDay(s);
  check(R.habitatNeeds(s, { ...t, level: 3 }).find((n) => n.need === 'luxuries').met, 'with them in store, met');
  const b = mk(false);
  const n = R.habitatNeeds(b.s, { ...b.t, level: 3 }).find((x) => x.need === 'luxuries');
  check(n && n.grow, 'before Luxury Goods, the need only gates growing (an old Skyscraper holds)');
  // falls back to a Spire after 10 days without, never further
  const f = mk(true);
  for (let d = 0; d < 12; d++) { feed(f.s); f.s.stock.coffee = 0; f.s.stock.wine = 0; tick(f.s); }
  check(f.t.level <= 3, `without coffee and wine (and its other needs) a Skyscraper falls back (level ${f.t.level})`);
}

// ---------------------------------------------------------------- saves
{
  const s = colony();
  s.stock.coffee = 12; s.stock.art = 3;
  const back = loadState(saveState(s));
  check(back.stock.coffee === 12 && back.stock.art === 3 && back.luxuries, 'saved and loaded');
  const old = JSON.parse(saveState(s));
  for (const g of R.LUX_GOODS) delete old.stock[g];
  delete old.luxuries;
  const o = loadState(JSON.stringify(old));
  check(R.LUX_GOODS.every((g) => o.stock[g] === 0) && o.luxuries && (tick(o), o.day === 1), 'an old save gains empty stores and runs');
}

console.log(`colony-luxuries: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
