// Version 9 (docs/COLONY-V9.md): tourism. Wonders, landmarks, parks, leisure, a happy city and land value at the hotels
// attract visitors; they need beds (Hotels, which grow like Habitats) and arrivals (a dock, the Starport ×4), and spend
// credits every day, more with leisure around. The read-out is in the More pop-out and the Market panel.
//   node tests/colony-tourism.mjs
import { readFileSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { BUILDING } from '../js/colony/data/buildings.js';
import { TECH } from '../js/colony/data/tech.js';
import { helpHtml } from '../js/colony/ui.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
function colony(seed = 1) {
  const s = newGame({ seed });
  s.stock.credits = 1e6; s.stock.parts = 1e5; s.pending.length = 0; s.options.raids = false; s.options.incidents = false; s.options.petitions = false;
  return s;
}
function learn(s, ...keys) {
  for (const k of keys) {
    if (!s.research.done.includes(k)) s.research.done.push(k);
    for (const u of TECH[k].unlocks) if (!s.unlocked.includes(u)) s.unlocked.push(u);
  }
}
const stand = (s, key, extra = {}) => { const b = { id: s.nextId++, key, x: 0, y: 0, level: 1, mode: null, build: 0, off: false, ...extra }; s.buildings.push(b); return b; };
const feed = (s) => { const cap = R.storageCaps(s); for (const g of ['food', 'water', 'air']) s.stock[g] = cap[g]; };
const T = R.TOUR;

// ---------------------------------------------------------------- data and help
{
  check(['hotel', 'promenade', 'theatre', 'casino'].every((k) => BUILDING[k]?.ver === 9 && BUILDING[k].tech === 'tourism' && TECH.tourism.unlocks.includes(k)), 'Hotel, Promenade, Theatre and Casino: research Tourism');
  const h = BUILDING.hotel.levels;
  check(h.map((l) => l.beds).join() === '80,200,400' && h[1].needs.includes('leisure') && h[2].needs.includes('value:55') && !h[1].cost, 'a Hotel grows by itself: Guest House 80 → Hotel 200 (leisure) → Grand Hotel 400 (land value 55)');
  check(R.GROW_KEYS.has('hotel') && R.habitatLevelReachable(h[1]) && R.habitatLevelReachable(h[2]), 'it grows like a Habitat, and its levels are reachable');
  check(['promenade', 'theatre', 'casino'].map((k) => BUILDING[k].leisure).join() === '1,2,3' && BUILDING.concerthall.levels.at(-1).leisure === 5, 'leisure: Promenade 1, Theatre 2, Casino 3, the Concert Hall 5');
  check(R.SERVICE_KINDS.some((k) => k.key === 'promenade') && R.SERVICE_KINDS.some((k) => k.key === 'theatre') && R.SERVICE_KINDS.some((k) => k.key === 'concerthall'), 'the Promenade, Theatre and Concert Hall count as services');
  check(TECH.commerce.effects.some((e) => e.key === 'tourism' && e.mult === 1.2), 'Commerce: visitors spend a fifth more');
  check(/id="help-tourism"/.test(helpHtml(null, null)) && /Hotel/.test(helpHtml(null, null)), 'How to play: Tourism');
  const ui = readFileSync(new URL('../js/colony/ui.js', import.meta.url), 'utf8');
  check(/data-g="tourism"/.test(ui) && /function tourismHtml/.test(ui) && /tourismHtml\(s\)/.test(ui), 'the read-out: a Tourism stat in the More pop-out, a Tourism section in the Market');
}

// ---------------------------------------------------------------- the formula
{
  const s = colony();
  let t = R.tourismOf(s);
  check(t.visitors === 0 && t.beds === 0 && t.limit === 'beds' && /No beds/.test(R.tourismLimitText(t)), `a new colony: no beds, no visitors ("${R.tourismLimitText(t)}")`);
  learn(s, 'tourism');
  const hotel = stand(s, 'hotel');
  t = R.tourismOf(s);
  check(t.beds === 80 && t.cap === T.dockCap, 'a Guest House: 80 beds; 300 can arrive through the dock');
  check(t.want === t.score * T.perPoint && t.visitors === Math.min(t.want, t.beds, t.cap), `visitors are the least of want (${t.want}), beds (${t.beds}) and arrivals (${t.cap}): ${t.visitors}`);
  const score0 = t.score;
  stand(s, 'lantern');
  check(R.tourismOf(s).score === score0 + T.landmark, 'a working landmark adds 8');
  stand(s, 'arena', { level: R.stagesOf('arena') });
  const t2 = R.tourismOf(s);
  check(t2.score === score0 + T.landmark + 70 && t2.parts.some((p) => p.label === 'Zero-G Arena' && p.value === 70), 'a finished wonder adds its tourism (the Arena 70)');
  stand(s, 'starport', { level: 2 });
  check(R.tourismOf(s).cap === T.dockCap && !R.tourismOf(s).parts.some((p) => p.label === 'Starport'), 'an unfinished wonder adds nothing');
  for (let k = 0; k < 10; k++) stand(s, 'park', { x: 10 + k });
  check(R.tourismOf(s).parts.some((p) => p.label === 'Parks and greenery' && p.value > 0), 'parks and greenery add');
  for (let k = 0; k < 40; k++) stand(s, 'park', { x: 30 + k });
  check(R.tourismOf(s).parts.find((p) => p.label === 'Parks and greenery').value === T.greenMax, 'greenery is capped');
  s.happy = 90;
  check(R.tourismOf(s).parts.some((p) => /A happy city/.test(p.label) && p.value === Math.min(T.happyMax, (90 - 50) * T.happy)), 'a happy city adds (happiness − 50) × 0.5');
  s.happy = 40;
  check(!R.tourismOf(s).parts.some((p) => /A happy city/.test(p.label)), 'an unhappy one adds nothing');
  // spending: leisure, capped; Commerce
  const sp0 = R.tourismOf(s).spend;
  stand(s, 'casino');
  const sp1 = R.tourismOf(s).spend;
  check(sp0 === 1 && Math.abs(sp1 - (1 + 3 * T.spendPerLeisure)) < 1e-9, `leisure raises what visitors spend (${sp0} → ${sp1})`);
  for (let k = 0; k < 6; k++) stand(s, 'casino');
  check(R.tourismOf(s).spend === T.spendMax, 'up to 3 credits a day');
  learn(s, 'commerce');
  check(Math.abs(R.tourismOf(s).spend - T.spendMax * 1.2) < 1e-9, 'Commerce: a fifth more');
  // beds and arrivals
  hotel.level = 3;
  for (let k = 0; k < 4; k++) stand(s, 'hotel', { level: 3 });
  t = R.tourismOf(s);
  check(t.beds === 2000 && t.visitors === Math.min(t.want, T.dockCap) && (t.limit === 'arrivals' || t.limit === 'attraction'), `five Grand Hotels: 2,000 beds; now arrivals or attraction hold it (${t.limit}, ${t.visitors})`);
  s.buildings.find((b) => b.key === 'starport').level = R.stagesOf('starport');
  t = R.tourismOf(s);
  check(t.cap === T.dockCap * 5 && t.visitors > T.dockCap, `the Starport: five times the arrivals (${t.cap}), ${t.visitors} visitors`);
  check(t.credits === Math.round(t.visitors * t.spend), `credits: visitors × spending (${t.credits})`);
  s.buildings = s.buildings.filter((b) => b.key !== 'dock');
  check(R.tourismOf(s).visitors === 0 && R.tourismOf(s).limit === 'dock', 'no dock, no visitors');
}

// ---------------------------------------------------------------- the day: credits, a Hotel that grows, land value
{
  const s = colony(2), rng = stateRng(s);
  learn(s, 'tourism');
  for (const c of s.chambers) { c.status = 'open'; c.work = 0; }
  const deck = 'main', home = s.chambers.find((c) => c.status === 'open' && (c.deck || 'main') === deck && c.tiles > 200) || s.chambers[0];
  const box = { x0: home.x0, y0: home.y0, x1: home.x1, y1: home.y1 };
  const at = (key) => { const p = R.findSpot(s, key, { box, free: true, deck }); const r = p && R.build(s, key, p.x, p.y, deck); const b = r?.ok ? s.buildings.find((x) => x.id === r.id) : null; if (b) b.build = 0; return b; };
  const hotel = at('hotel');
  check(!!hotel && hotel.level === 1 && R.spec(hotel).beds === 80, 'a Guest House placed through the rules');
  stand(s, 'sunmirror'); stand(s, 'vertfarm'); stand(s, 'waterworks'); stand(s, 'atmoproc');
  feed(s); s.pending.length = 0; dayTick(s, rng);
  let need = R.habitatNeeds(s, hotel);
  const leisure = need.find((n) => n.need === 'leisure');
  check(leisure && !leisure.met && /Leisure within 16 tiles/.test(leisure.label), `it wants leisure in reach ("${leisure?.label}")`);
  const prom = at('promenade');
  at('park');
  check(!!prom && R.leisureNear(s, hotel), 'a Promenade nearby: leisure in reach');
  let grew = false;
  for (let d = 0; d < 12 && !grew; d++) { feed(s); s.pending.length = 0; dayTick(s, rng); grew = hotel.level === 2; }
  check(grew && R.spec(hotel).beds === 200 && s.log.some((l) => /A Hotel grew into Hotel: room for 200 visitors/.test(l.text)), 'with a park and leisure in reach, the Guest House grows into a Hotel (200)');
  need = R.habitatNeeds(s, hotel);
  const value = need.find((n) => n.need === 'value:55');
  check(value && value.grow && /^Land value 55 \(now \d+\)$/.test(value.label), `a Grand Hotel wants land value 55 ("${value?.label}")`);
  const cr = s.stock.credits; feed(s); s.pending.length = 0;
  dayTick(s, rng);
  check(s.tourism && s.tourism.day === s.day && s.stats.last.tourism === s.tourism.credits, `the day's tourism is kept (${JSON.stringify(s.tourism)})`);
  check(s.tourism.visitors > 0 && s.tourism.credits > 0, 'visitors come and spend');
  const back = loadState(saveState(s));
  check(back.buildings.find((b) => b.key === 'hotel').level === 2 && R.tourismOf(back).beds === R.tourismOf(s).beds, 'save and load: the hotels and their beds');
  check(Number.isFinite(cr), 'credits read');
}

// ---------------------------------------------------------------- land value: Habitats grow a day sooner on valuable land
{
  check(R.VALUE_GROW.at === 60 && R.VALUE_GROW.keys.has('habitat') && R.VALUE_GROW.keys.has('towerblock') && !Object.keys(R.QUAD_VALUE).length, 'land value 60+: Habitats and Tower Blocks grow a day sooner (the quads\' gates are gone)');
}

console.log(`colony-tourism: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
