// Version 10 (docs/COLONY-V10.md): districts. An open chamber can be declared a Garden District, Industrial Quarter,
// University Quarter or Entertainment District (one theme, changed again 30 days later); its bonus grows in tiers at
// 25%, 50% and 75% of its land built with buildings that fit.
//   node tests/colony-districts.mjs
import { readFileSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { BUILDING } from '../js/colony/data/buildings.js';
import { T, TERRAIN } from '../js/colony/data/terrain.js';
import { helpHtml } from '../js/colony/ui.js';
import { districtMults, districtsDay } from '../js/colony/districts.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
function colony(seed = 1) {
  const s = newGame({ seed });
  s.stock.credits = 1e6; s.stock.parts = 1e5; s.pending.length = 0;
  Object.assign(s.options, { raids: false, incidents: false, petitions: false, neighbours: false });
  return s;
}
const stand = (s, key, extra = {}) => { const b = { id: s.nextId++, key, x: 0, y: 0, level: 1, mode: null, build: 0, off: false, ...extra }; s.buildings.push(b); return b; };
const feed = (s) => { const cap = R.storageCaps(s); for (const g of ['food', 'water', 'air']) s.stock[g] = cap[g]; };
const tick = (s) => dayTick(s, stateRng(s));
const landing = (s) => s.chambers.find((c) => c.status === 'open' && R.deckOf(c) === 'main');
// Free land tiles of a chamber (not under a building), in reading order.
function freeTiles(s, c) {
  const m = R.mapOf(s, R.deckOf(c)), occ = R.occupancy(s, -1, R.deckOf(c)), out = [];
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
    const i = y * m.w + x;
    if (m.ch[i] === c.id && TERRAIN[m.t[i]].build && m.t[i] !== T.SHAFT && !occ[i]) out.push([x, y]);
  }
  return out;
}
// 1×1 buildings of `key` on free land until the district's fill reaches `frac`.
function fillTo(s, c, key, frac, theme = c.district?.theme) {
  const free = freeTiles(s, c);
  while (R.districtFill(s, c, theme).fill < frac && free.length) { const [x, y] = free.shift(); stand(s, key, { x, y, ...(c.deck ? { deck: c.deck } : {}) }); }
  return R.districtFill(s, c, theme);
}

// ---------------------------------------------------------------- data, help and interface
{
  check(R.THEME_KEYS.join() === 'garden,industry,university,entertainment' && R.THEME_KEYS.every((k) => R.THEMES[k].name && R.THEMES[k].icon && R.THEMES[k].bonusText(1)), 'four themes, each with a name, an icon and its bonus in words');
  check(R.DISTRICT.tiers.join() === '0.25,0.5,0.75' && R.DISTRICT.cooldown === 30, 'tiers at 25%, 50% and 75%; a 30-day cooldown');
  check(R.fitsTheme('garden', 'park') && R.fitsTheme('garden', 'habitat') && !R.fitsTheme('garden', 'smelter'), 'a Garden District: parks and homes fit, a Smelter does not');
  check(R.fitsTheme('industry', 'smelter') && R.fitsTheme('industry', 'solar') && R.fitsTheme('industry', 'warehouse') && !R.fitsTheme('industry', 'habitat'), 'an Industrial Quarter: industry, power and stores fit, homes do not');
  check(R.fitsTheme('university', 'lab') && R.fitsTheme('university', 'school') && R.fitsTheme('university', 'towerblock') && !R.fitsTheme('university', 'casino'), 'a University Quarter: labs, schools and student homes');
  check(R.fitsTheme('entertainment', 'casino') && R.fitsTheme('entertainment', 'theatre') && R.fitsTheme('entertainment', 'hotel') && !R.fitsTheme('entertainment', 'smelter'), 'an Entertainment District: casinos, theatres, hotels');
  const help = helpHtml(null, null);
  check(/id="help-districts"/.test(help) && /25%, 50% and 75%/.test(help) && /Homes fit every district but the Industrial Quarter/.test(help), 'How to play: Districts');
  const ui = readFileSync(new URL('../js/colony/ui.js', import.meta.url), 'utf8'), mm = readFileSync(new URL('../js/colony/view3d/minimap.js', import.meta.url), 'utf8');
  check(/function districtHtml/.test(ui) && /data-a="district"/.test(ui) && /R\.setDistrict\(/.test(ui), 'the inspector: a District section with the four themes');
  check(/DISTRICT_RGB/.test(mm) && /c\.district\?\.theme/.test(mm), 'the minimap tints a district\'s chamber');
}

// ---------------------------------------------------------------- declaring, the cooldown, clearing
{
  const s = colony(), c = landing(s), sealed = s.chambers.find((x) => x.status === 'sealed');
  check(!R.setDistrict(s, sealed.id, 'garden').ok && /open chamber/.test(R.setDistrict(s, sealed.id, 'garden').msg), 'a sealed chamber cannot be a district');
  check(!R.setDistrict(s, c.id, 'zoo').ok, 'an unknown theme is refused');
  const r = R.setDistrict(s, c.id, 'garden');
  check(r.ok && c.district.theme === 'garden' && c.district.since === s.day && /Garden District/.test(r.msg), `declared: "${r.msg}"`);
  const r2 = R.setDistrict(s, c.id, 'industry');
  check(!r2.ok && /in 30 days/.test(r2.msg), `a change waits 30 days: "${r2.msg}"`);
  check(R.districtStatus(s, c).wait === 30, 'the inspector shows the days to wait');
  s.day += 30;
  check(R.setDistrict(s, c.id, 'industry').ok && c.district.theme === 'industry', '30 days later the theme can change');
  s.day += 30;
  check(R.setDistrict(s, c.id, null).ok && !c.district, 'and the district can be cleared');
  check(R.setDistrict(s, c.id, 'garden').ok, 'a chamber with no district can be declared again at once');
}

// ---------------------------------------------------------------- fill and tiers
{
  const s = colony(), c = landing(s);
  R.setDistrict(s, c.id, 'garden');
  const f0 = R.districtFill(s, c);
  check(f0.land > 100 && f0.fit > 0 && f0.tier === 0, `the landing chamber: ${f0.fit} of ${f0.land} tiles fit already (its Habitats)`);
  const m = R.mapOf(s, 'main'), free = freeTiles(s, c), [rx, ry] = free[free.length - 1];
  stand(s, 'road', { x: rx, y: ry });
  check(R.districtFill(s, c).land === f0.land - 1, 'roads are left out of the land');
  stand(s, 'smelter', { x: free[0][0], y: free[0][1] });
  check(R.districtFill(s, c).fit === f0.fit, 'a building that does not fit adds nothing');
  const t1 = fillTo(s, c, 'park', 0.25);
  check(t1.tier === 1 && t1.fill >= 0.25, `25% built to fit: tier 1 (${Math.round(t1.fill * 100)}%)`);
  check(fillTo(s, c, 'park', 0.5).tier === 2 && fillTo(s, c, 'park', 0.75).tier === 3, '50%: tier 2; 75%: tier 3');
  const p = stand(s, 'park', { x: free[1][0], y: free[1][1], build: 3 });
  const before = R.districtFill(s, c).fit;
  p.build = 0;
  check(R.districtFill(s, c).fit === before + 1, 'only finished buildings count');
  // forests count as a Garden District's land already green
  const fc = s.chambers.find((x) => { const mm = R.mapOf(s, R.deckOf(x)); for (let y = x.y0; y <= x.y1; y++) for (let xx = x.x0; xx <= x.x1; xx++) if (mm.ch[y * mm.w + xx] === x.id && mm.t[y * mm.w + xx] === T.FOREST) return true; return false; });
  if (fc) { fc.status = 'open'; const g = R.districtFill(s, fc, 'garden'), u = R.districtFill(s, fc, 'university'); check(g.fit > 0 && u.fit === 0 && g.land > u.land, `forest tiles count for a Garden District (${g.fit} of ${g.land}), not for others`); fc.status = 'sealed'; }
  else check(true, 'no forest chamber on this seed');
  // the daily read and its log line
  const said = [];
  c.district.tier = 0;
  districtsDay(s, { say: (k, t) => said.push(t) });
  check(c.district.tier === 3 && said.some((t) => /tier 3 Garden District/.test(t)), `the day's read logs a new tier: "${said[0]}"`);
}

// ---------------------------------------------------------------- the effects
{
  // garden: happiness, air, land value, greenery
  const s = colony(), c = landing(s);
  R.setDistrict(s, c.id, 'garden'); fillTo(s, c, 'park', 0.5);
  feed(s); tick(s);
  check(c.district.tier === 2, 'a tier 2 Garden District');
  check(s.happyParts.some((p) => p.label === 'Garden Districts' && p.value === 2), 'Garden: +1 happiness a tier, colony-wide');
  check(s.stats.last.produced.air >= 40 && R.districtHappy(s)[0].value === 2, 'Garden: 20 air a day a tier');
  const [x, y] = freeTiles(s, c)[0];
  const lv = R.landValueParts(s, 'main', x, y);
  check(lv.parts.some((q) => q.label === 'A Garden District' && q.value === 8), 'Garden: land value +4 a tier in the chamber');
  check(R.greeneryOf(s).parts.some((q) => q.label === 'Garden Districts' && q.value === 20), 'Garden: greenery +10 a tier');
  // the cap on districts' happiness
  const extra = s.chambers.filter((k) => R.deckOf(k) === 'main' && k !== c).slice(0, 4);
  for (const k of extra) { k.status = 'open'; k.district = { theme: 'entertainment', since: 0, tier: 3 }; }
  const hp = R.districtHappy(s);
  check(hp.reduce((t, q) => t + q.value, 0) === R.DISTRICT.happyMax, `districts' happiness together is capped at ${R.DISTRICT.happyMax}`);
  for (const k of extra) { k.status = 'sealed'; delete k.district; }
}
{
  // industry: the chamber's fitting buildings make 5% more a tier
  const s = colony(), c = landing(s);
  R.setDistrict(s, c.id, 'industry'); fillTo(s, c, 'depot', 0.75); districtsDay(s, { say: () => {} });
  const [x, y] = freeTiles(s, c)[0];
  const hyd = stand(s, 'hydro', { x, y }), farm = s.buildings.find((b) => b.key === 'farm'), out = stand(s, 'hydro', { x: 1, y: 1 });
  const dm = districtMults(s);
  check(c.district.tier === 3 && Math.abs(dm(hyd).make - 1.15) < 1e-9, 'an Industrial Quarter at tier 3: its buildings make 15% more');
  check(dm(farm) === null && dm(out) === null, 'not those that do not fit, nor those outside the chamber');
}
{
  // university: labs make more, and research a day of its own
  const mk = (uni) => {
    const s = colony(), c = landing(s);
    s.research.done.push('medicine');
    const [x, y] = freeTiles(s, c)[0];
    stand(s, 'lab', { x, y });
    if (uni) { R.setDistrict(s, c.id, 'university'); fillTo(s, c, 'park', 0.5); }
    feed(s); tick(s);
    return s;
  };
  const a = mk(false), b = mk(true), lab = a.stats.last.research;
  check(lab > 0 && Math.abs(b.stats.last.research - (lab * 1.2 + 4)) < 0.01, `a tier 2 University Quarter: labs ×1.2 and +4 research a day (${lab.toFixed(2)} → ${b.stats.last.research.toFixed(2)})`);
}
{
  // entertainment: tourism and happiness
  const s = colony(), c = landing(s);
  R.setDistrict(s, c.id, 'entertainment'); fillTo(s, c, 'park', 0.25); districtsDay(s, { say: () => {} });
  check(R.tourismOf(s).parts.some((p) => p.label === 'Entertainment Districts' && p.value === 6), 'Entertainment: +6 tourism attraction a tier');
  check(R.districtHappy(s).some((p) => p.label === 'Entertainment Districts' && p.value === 1), 'Entertainment: +1 happiness a tier');
}

// ---------------------------------------------------------------- saves
{
  const s = colony(), c = landing(s);
  R.setDistrict(s, c.id, 'university');
  const back = loadState(saveState(s)), bc = back.chambers.find((k) => k.id === c.id);
  check(bc.district?.theme === 'university' && bc.district.since === c.district.since, 'a district is saved with its chamber');
  const old = JSON.parse(saveState(s));
  for (const k of old.chambers) delete k.district;
  const o = loadState(JSON.stringify(old));
  check(R.districtsOf(o).length === 0 && R.districtHappy(o).length === 0 && (tick(o), o.day === 1), 'an old save has no districts and runs as before');
}

console.log(`colony-districts: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
