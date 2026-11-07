// Version 7 (docs/COLONY-V7.md) zoning, retired in version 9 (docs/COLONY-V9.md; owner, 2026-11-07: "The simcity style
// pods of land don't work... remove them"). A legacy test: Living, Market and Workshop Quads are off the build menu and
// never unlocked, the rules refuse new ones with a clear reason, but quads standing in an old save keep working (homes,
// jobs, credits, parts, their levels), save and load, and can be moved and demolished. The supporting buildings and
// techs now serve Habitats, Tower Blocks and industry; the RCI bars and the zoning help are gone.
//   node tests/colony-quads.mjs
import { readFileSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng, SIM } from '../js/colony/sim.js';
import { BUILDING } from '../js/colony/data/buildings.js';
import { TECH } from '../js/colony/data/tech.js';
import { helpHtml, HELP_SECTIONS } from '../js/colony/ui.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const QUADS = ['livingquad', 'marketquad', 'workshopquad'];

function colony(seed = 1) {
  const s = newGame({ seed });
  s.stock.credits = 1e5; s.stock.parts = 200; s.pending.length = 0; s.options.raids = false; s.options.incidents = false; s.options.petitions = false;
  s.buildings.push({ id: s.nextId++, key: 'sunmirror', x: 0, y: 0, level: 1, mode: null, build: 0, off: false });   // power to spare (a stand-in)
  return s;
}
const landing = (s) => s.chambers.find((c) => c.status === 'open' && !c.deck);
function learn(s, ...keys) {
  for (const k of keys) {
    if (!s.research.done.includes(k)) s.research.done.push(k);
    for (const u of TECH[k].unlocks) if (!s.unlocked.includes(u)) s.unlocked.push(u);
  }
}
// An old save's quad: put straight into the state at a free 2×2 spot of the landing chamber (the rules no longer place one).
function lot(s, key, level = 1, gap = 3) {
  const cmd = s.buildings.find((b) => b.key === 'command');
  const p = R.findSpot(s, 'warehouse', { box: landing(s), free: true, score: (x, y) => { const d = Math.max(Math.abs(x + 1 - cmd.x), Math.abs(y + 1 - cmd.y)); return d < gap ? null : d; } });
  const b = { id: s.nextId++, key, x: p.x, y: p.y, level, mode: null, build: 0, off: false };
  s.buildings.push(b);
  return b;
}
function day(s, rng, n = 1) {
  for (let k = 0; k < n; k++) { const cap = R.storageCaps(s); for (const g of ['food', 'water', 'air']) s.stock[g] = cap[g]; s.pending.length = 0; dayTick(s, rng); }
}

// ---------------------------------------------------------------- retired: off the menu, refused, never unlocked
{
  const s = colony();
  check(QUADS.every((k) => BUILDING[k].retired && BUILDING[k].levels.length === 6), 'the three quads are marked retired (their levels kept for old saves)');
  check(QUADS.every((k) => !s.unlocked.includes(k)) && !R.buildable(s).some((b) => QUADS.includes(b.key)), 'a new colony: not unlocked, not on the build menu');
  const why = R.canBuild(s, 'livingquad', 0, 0);
  check(/Living Quads are no longer built: zoned lots are retired\. Build Habitats and Tower Blocks instead/.test(why), `R.build refuses with a clear reason ("${why}")`);
  check(!R.build(s, 'marketquad', 1, 1).ok && R.findSpot(s, 'workshopquad', { free: true }) === null, 'build and findSpot refuse them anywhere');
  const old = JSON.parse(saveState(s)); old.unlocked.push(...QUADS);
  const up = loadState(JSON.stringify(old));
  check(QUADS.every((k) => !up.unlocked.includes(k)), 'an old save that had them unlocked loses them from the menu');
  check(!HELP_SECTIONS.some(([id]) => id === 'zoning') && !/id="help-zoning"/.test(helpHtml(null, null)), 'How to play: no Zoning section any more');
  check(/Transit Station/.test(helpHtml(null, null)) && /grow in 2 days instead of 5/.test(helpHtml(null, null)), 'the Homes section says Schools and Transit help homes grow');
  const ui = readFileSync(new URL('../js/colony/ui.js', import.meta.url), 'utf8');
  check(/function renderRci\(\) \{ if \(rciEl && !rciEl\.hidden\) rciEl\.hidden = true; \}/.test(ui) && !/Zone Living, Market and Workshop Quads/.test(ui), 'the RCI demand bars are gone from the build menu');
  const goals = readFileSync(new URL('../js/colony/goals.js', import.meta.url), 'utf8');
  check(!/zone Living Quads/i.test(goals), 'the advisor no longer suggests zoning Living Quads');
}

// ---------------------------------------------------------------- an old save's quads keep working
{
  const s = colony(2), rng = stateRng(s);
  s.pop = 60;   // crowded: residential demand
  const q = lot(s, 'livingquad', 1);
  day(s, rng, SIM.quadGrowDays);
  check(q.level === 2 && R.spec(q).housing === 40 && s.log.some((l) => /Zoning: Living Quad → Cottages/.test(l.text)), 'a Living Quad in an old save still grows: Cottages for 40');
  check(R.housingOf(s) >= 40 + 20, 'its homes count');
  const m = lot(s, 'marketquad', 3, 6), w = lot(s, 'workshopquad', 2, 10);
  s.pop = 300;
  day(s, rng);
  check(s.stats.last.produced.credits > 0 && s.happyParts.some((p) => p.label === 'Shopping' && p.value >= 0), 'a Market Quad still earns credits and counts as shopping');
  check((s.stats.last.produced.parts || 0) > 0 && R.spec(w).jobs === 10, 'a Workshop Quad still has jobs and makes parts');
  check(!R.habitatNeeds(s, { ...q, level: 4 }).some((n) => n.need.startsWith('value:')), 'their old land-value gates are dropped');
  const back = loadState(saveState(s));
  const bq = back.buildings.find((b) => b.id === q.id), bm = back.buildings.find((b) => b.id === m.id);
  check(bq && bq.level === q.level && bm && bm.level === 3 && R.housingOf(back) === R.housingOf(s), 'save and load keep them, levels and homes');
  // moved and demolished
  const p = R.findSpot(s, 'warehouse', { box: landing(s), free: true, score: (x, y) => -Math.abs(x - q.x) - Math.abs(y - q.y) });
  const mv = p ? R.move(s, q.id, p.x, p.y) : { ok: false, msg: 'no spot' };
  check(mv.ok, `an old quad can be moved (${mv.msg})`);
  const cr = s.stock.credits, d = R.demolish(s, w.id);
  check(d.ok && s.stock.credits > cr && !s.buildings.includes(w), `and demolished (${d.msg})`);
}

// ---------------------------------------------------------------- the supporting buildings and techs, re-pointed
{
  check(['school', 'transit', 'monorail', 'freightyard'].every((k) => !/quad/i.test(BUILDING[k].text) && !BUILDING[k].retired), 'School, Transit Station, Monorail Stop and Freight Yard stay, their texts free of quads');
  check(['schooling', 'commerce', 'lightindustry', 'urbanplan', 'skyscrapers', 'automation'].every((k) => TECH[k] && !/quad/i.test(TECH[k].text)), 'the version 7 techs stay, reworded');
  check(TECH.urbanplan.unlocks.includes('transit') && TECH.skyscrapers.unlocks.includes('monorail') && TECH.lightindustry.unlocks.includes('freightyard'), 'Urban Planning: Transit; Skyscrapers: the Monorail Stop; Light Industry: the Freight Yard');
  check(TECH.automation.effects.some((e) => e.key === 'fabricator' && e.mult === 1.2) && TECH.commerce.effects.some((e) => e.key === 'market' && e.mult === 1.2), 'Automation: Fabricators +20%; Commerce: Market sales +20%');
  const top = BUILDING.towerblock.levels[3];
  check(top && top.name === 'Skyscraper' && top.housing === 600 && top.needs.includes('transit') && top.needs.includes('tech:skyscrapers') && R.habitatLevelReachable(top), 'Skyscrapers: Tower Blocks grow into a 4th level, a Skyscraper for 600 (transit in reach)');
  // Commerce: Market sales pay a fifth more
  const s = colony(3);
  s.stock.ore = 100;
  const a = R.sell(s, 'ore', 50).credits;
  const t = colony(3); learn(t, 'commerce'); t.stock.ore = 100;
  const b = R.sell(t, 'ore', 50).credits;
  check(b === Math.floor(a / 1 * 1.2) || Math.abs(b - a * 1.2) <= 1, `Commerce: 50 ore sell for ${a} → ${b}`);
  // the Freight Yard: Fabricators in range make a quarter more
  const run = (yard) => {
    const u = colony(4), rng = stateRng(u);
    learn(u, 'smelting', 'fabrication', 'lightindustry'); u.pop = 120; u.stock.alloy = 100;
    const f = lot(u, 'fabricator', 1, 4);
    if (yard) { const y = lot(u, 'freightyard', 1, 4); y.x = f.x + 2; y.y = f.y; }
    u.stock.parts = 0; u.stock.alloy = 100;
    day(u, rng);
    return u.stats.last.produced.parts || 0;
  };
  const p0 = run(false), p1 = run(true);
  check(p1 > p0 * 1.15, `a Freight Yard in range: Fabricators make more (${p0.toFixed(1)} → ${p1.toFixed(1)} parts)`);
}

console.log(`colony-quads (legacy): ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
