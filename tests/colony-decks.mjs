// Colony version 4, stage 1 (docs/COLONY-V4.md "Stage 1 build contract: the three decks"): the upper
// and lower decks' generation guarantees on seeds 1–20 with an ASCII preview of seed 1, placement per
// deck, a Lift opening the way up and down (survey → seal → pressurise → build), Pump Stations,
// cisterns and geothermal taps, coverage per deck, save / load with decks, an old version-3 save
// gaining its decks, and a scripted Easy player opening two upper and two lower chambers by day 200.
//   node tests/colony-decks.mjs
import { newGame, saveState, loadState, mapOf } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { generateMap } from '../js/colony/mapgen.js';
import { generateDecks, hullBox, DECK_FLOOR, SHAFT } from '../js/colony/decks.js';
import { BUILDING } from '../js/colony/data/buildings.js';
import { T, TERRAIN } from '../js/colony/data/terrain.js';
import { goalStatus } from '../js/colony/goals.js';

let failed = 0, passed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const NONE = 255;
const n4 = (i, w) => [i - 1, i + 1, i - w, i + w];
const cmdOf = (s) => s.buildings.find((b) => b.key === 'command');
const dockOf = (s) => s.buildings.find((b) => b.key === 'dock');
const landingOf = (s) => s.chambers.find((c) => c.kind === 'landing');
const home = (s) => R.shaftsOf(s).find((k) => k.landing);
const chAt = (s, deck, x, y) => R.chamberOf(s, mapOf(s, deck).ch[y * s.map.w + x]);
function rich(seed = 1, opts = {}) {
  const s = newGame({ seed, ...opts });
  s.stock.credits = 100000; s.stock.parts = 10000; s.stock.air = 300; s.pending.length = 0;
  return s;
}
const finish = (s, r) => { const b = r.ok ? R.byId(s, r.id) : null; if (b) b.build = 0; return b; };
function walk(v, path, out) {
  if (typeof v === 'number') { if (!Number.isFinite(v)) out.push(path); }
  else if (ArrayBuffer.isView(v)) return out;
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const k in v) walk(v[k], `${path}.${k}`, out);
  return out;
}

// ---------------------------------------------------------------- generation, seeds 1–20

const UPPER_T = new Set([T.OUTSIDE, T.HULL, T.BULKHEAD, T.GATE, T.BREACH, T.DECK, T.PLAIN, T.FERTILE, T.POOR, T.GLASS, T.SHAFT]);
const LOWER_T = new Set([T.OUTSIDE, T.HULL, T.BULKHEAD, T.GATE, T.BREACH, T.DECK, T.CONDUIT, T.ROCK, T.RUBBLE, T.MARSH, T.CATACOMB, T.SHAFT]);
function verify(seed, s) {
  const { w, h } = s.map, E = hullBox(s.map), IN = { x0: E.x0 + 2, y0: E.y0 + 2, x1: E.x1 - 2, y1: E.y1 - 2 };
  const shafts = R.shaftsOf(s), land = landingOf(s);
  check(shafts.length >= SHAFT.min && shafts.length <= SHAFT.max, `seed ${seed}: ${shafts.length} shafts (6–8)`);
  check(s.chambers.every((c, k) => c.id === k), `seed ${seed}: chamber ids unique across decks (id = index)`);
  check(new Set(s.chambers.map((c) => c.name)).size === s.chambers.length, `seed ${seed}: chamber names unique`);
  // the shafts: 2 × 2 SHAFT at the same spot on all three decks; one in the landing chamber
  const homeShafts = shafts.filter((k) => s.map.ch[k.y * w + k.x] === land.id);
  check(homeShafts.length === 1 && shafts[0].landing && homeShafts[0] === shafts[0], `seed ${seed}: one shaft in the landing chamber`);
  for (const deck of ['main', 'upper', 'lower']) {
    const m = mapOf(s, deck);
    let all = 0;
    for (let i = 0; i < w * h; i++) if (m.t[i] === T.SHAFT) all++;
    const aligned = shafts.every((k) => [0, 1, w, w + 1].every((d) => m.t[k.y * w + k.x + d] === T.SHAFT) && new Set([0, 1, w, w + 1].map((d) => m.ch[k.y * w + k.x + d])).size === 1 && m.ch[k.y * w + k.x] !== NONE);
    check(aligned && all === shafts.length * 4, `seed ${seed}: ${deck} deck has the ${shafts.length} shafts, each inside one chamber (${all} shaft tiles)`);
  }
  check(!s.buildings.some((b) => [...R.tilesOf(s, b)].some((i) => s.map.t[i] === T.SHAFT && b.key !== 'lift')), `seed ${seed}: nothing stands on a shaft`);
  for (const deck of ['upper', 'lower']) {
    const m = mapOf(s, deck), { t, ch, sv } = m, cs = s.chambers.filter((c) => c.deck === deck);
    check(m.w === w && m.h === h && ['t', 'r', 'ch', 'sv'].every((k) => m[k] instanceof Uint8Array && m[k].length === w * h), `seed ${seed}: ${deck} arrays`);
    check(cs.length >= 16 && cs.length <= 22, `seed ${seed}: ${deck} has ${cs.length} chambers (16–22)`);
    // footprint: OUTSIDE beyond the hull, the hull ring, chambers inside
    let foot = true;
    for (let i = 0; i < w * h && foot; i++) {
      const x = i % w, y = (i / w) | 0, inE = x >= E.x0 && x <= E.x1 && y >= E.y0 && y <= E.y1, inI = x >= IN.x0 && x <= IN.x1 && y >= IN.y0 && y <= IN.y1;
      if (!inE) foot = t[i] === T.OUTSIDE && ch[i] === NONE;
      else if (!inI) foot = (t[i] === T.HULL || t[i] === T.BREACH) && ch[i] === NONE;
      else foot = (deck === 'upper' ? UPPER_T : LOWER_T).has(t[i]) && t[i] !== T.OUTSIDE && t[i] !== T.HULL;
      if (!foot) check(false, `seed ${seed}: ${deck} tile ${x},${y} ${TERRAIN[t[i]].key} out of its footprint`);
    }
    check(t.every((v, i) => sv[i] === (v === T.RUBBLE ? 40 : 0)), `seed ${seed}: ${deck} salvage only on rubble`);
    const have = (ter) => t.some((v) => v === ter);
    if (deck === 'upper') check(have(T.GLASS) && have(T.FERTILE) && have(T.DECK), `seed ${seed}: upper has sky panels, garden soil, deck`);
    else check(have(T.CONDUIT) && have(T.MARSH) && have(T.CATACOMB) && have(T.ROCK), `seed ${seed}: lower has conduit halls, flooded tunnels, catacombs, rock`);
    const listed = new Set();
    for (const c of cs) {
      let n = 0, build = 0;
      for (let i = 0; i < w * h; i++) if (ch[i] === c.id) { n++; if (DECK_FLOOR[deck].has(t[i])) build++; const x = i % w, y = (i / w) | 0; if (x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1) n = -1e9; }
      check(n === c.tiles && n > 0 && build >= 40, `seed ${seed}: ${deck} chamber ${c.id} tiles ${n}/${c.tiles}, ${build} buildable`);
      check(c.status === 'sealed' && c.work === 0 && c.kind && c.name, `seed ${seed}: ${deck} chamber ${c.id} sealed, named`);
      for (const i of c.breaches) { listed.add(i); check(t[i] === T.BREACH && (ch[i] === c.id || n4(i, w).some((j) => ch[j] === c.id)), `seed ${seed}: ${deck} breach ${i} belongs to chamber ${c.id}`); }
    }
    for (let i = 0; i < w * h; i++) if (t[i] === T.BREACH) check(listed.has(i), `seed ${seed}: ${deck} breach ${i} listed`);
    // every chamber reachable from a shaft through gates on its own deck
    const seen = new Uint8Array(w * h), q = [], reached = new Set();
    for (const k of shafts) { const i = k.y * w + k.x; seen[i] = 1; q.push(i); }
    for (let p = 0; p < q.length; p++) {
      const i = q[p];
      if (ch[i] !== NONE) reached.add(ch[i]);
      for (const j of n4(i, w)) if (!seen[j] && (ch[j] !== NONE || t[j] === T.GATE)) { seen[j] = 1; q.push(j); }
    }
    check(cs.every((c) => reached.has(c.id)), `seed ${seed}: ${deck}: ${reached.size}/${cs.length} chambers reachable from a shaft`);
  }
  // no link between decks: each chamber's neighbours are on its own deck
  const links = R.chamberLinks(s);
  check(s.chambers.every((c) => [...links.get(c.id)].every((id) => R.deckOf(R.chamberOf(s, id)) === R.deckOf(c))), `seed ${seed}: walls join chambers of one deck only`);
}

const SYM = { [T.VOID]: '.', [T.HULL]: '#', [T.BULKHEAD]: '|', [T.GATE]: '+', [T.DECK]: 'd', [T.PLAIN]: ',', [T.FERTILE]: 'F', [T.POOR]: 'o',
  [T.RIVER]: 'w', [T.RUBBLE]: 'r', [T.BREACH]: 'X', [T.ROCK]: 'k', [T.MARSH]: 'z', [T.GLASS]: '=', [T.CONDUIT]: 'c', [T.CATACOMB]: '%',
  [T.SHAFT]: 'L', [T.OUTSIDE]: ' ', [T.FOREST]: 'f', [T.HILLS]: 'h', [T.LAKE]: 'w' };
const PRIORITY = 'XL+#|';
function preview(m, E) {
  const lines = [];
  for (let y = E.y0; y <= E.y1; y += 2) {
    let s = '';
    for (let x = E.x0; x <= E.x1; x += 2) {
      const cell = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].map(([u, v]) => SYM[m.t[v * m.w + u]] || '?');
      const pri = [...PRIORITY].find((c) => cell.includes(c));
      if (pri) { s += pri; continue; }
      const n = {}; for (const c of cell) n[c] = (n[c] || 0) + 1;
      s += cell.reduce((a, c) => (n[c] > n[a] ? c : a), cell[0]);
    }
    lines.push(s);
  }
  return lines.join('\n');
}

{
  const times = [], rows = [];
  for (let seed = 1; seed <= 20; seed++) {
    const s = newGame({ seed });
    verify(seed, s);
    // generation time on its own (the main map from mapgen, then the decks)
    const g = generateMap(seed), t0 = performance.now();
    generateDecks(seed, g.map, g.chambers, g.chambers.length, { command: g.start.command });
    times.push(performance.now() - t0);
    const kinds = (deck) => { const k = {}; for (const c of s.chambers) if (c.deck === deck) k[c.kind] = (k[c.kind] || 0) + 1; return Object.entries(k).map(([a, b]) => `${a} ${b}`).join(', '); };
    const sh = R.shaftsOf(s);
    rows.push(`seed ${String(seed).padStart(2)}: upper ${s.chambers.filter((c) => c.deck === 'upper').length} (${kinds('upper')}), lower ${s.chambers.filter((c) => c.deck === 'lower').length} (${kinds('lower')}), ${sh.length} shafts, ${times[times.length - 1].toFixed(0)} ms`);
  }
  console.log(rows.join('\n'));
  const median = times.slice().sort((a, b) => a - b)[times.length >> 1];
  console.log(`deck generation: median ${median.toFixed(0)} ms, slowest ${Math.max(...times).toFixed(0)} ms`);
  check(median < 200, `deck generation median ${median.toFixed(0)} ms (< 200)`);
  // deterministic; different seeds differ
  check(saveState(newGame({ seed: 4 })) === saveState(newGame({ seed: 4 })), 'same seed, same decks');
  check(newGame({ seed: 1 }).decks.upper.t.some((v, i) => v !== newGame({ seed: 2 }).decks.upper.t[i]), 'different seeds, different decks');
  // the stand-in map generator of tests/colony-sim.mjs gets decks too
  const { generateFakeMap } = await import('./colony-fakemap.mjs');
  const f = newGame({ seed: 3, generate: generateFakeMap });
  check(f.decks && R.shaftsOf(f).length >= 6 && f.map.ch[home(f).y * f.map.w + home(f).x] === landingOf(f).id, 'the stand-in map gets decks and a landing shaft');

  const s1 = newGame({ seed: 1 }), E = hullBox(s1.map);
  const list = (deck) => s1.chambers.filter((c) => c.deck === deck).map((c) => `${c.id} ${c.name} (${c.kind}, ${c.breaches.length} breach${c.breaches.length === 1 ? '' : 'es'})`).join('; ');
  console.log(`\nseed 1, shafts ${R.shaftsOf(s1).map((k) => `${k.x},${k.y}${k.landing ? ' (landing)' : ''}`).join(' ')}`);
  console.log('symbols: # hull, | bulkhead, + gate, X breach, L lift shaft, d deck, , plain, F fertile, o poor, = sky panel, c conduit, k rock, r rubble, z flooded, % catacomb');
  console.log(`\nUPPER deck, seed 1, 2:1. Chambers: ${list('upper')}\n`);
  console.log(preview(s1.decks.upper, E));
  console.log(`\nLOWER deck, seed 1, 2:1. Chambers: ${list('lower')}\n`);
  console.log(preview(s1.decks.lower, E));
  console.log('');
}

// ---------------------------------------------------------------- placement per deck

{
  const s = rich(2), land = landingOf(s), hs = home(s);
  const up = chAt(s, 'upper', hs.x, hs.y), lo = chAt(s, 'lower', hs.x, hs.y);
  check(up && lo && up.deck === 'upper' && lo.deck === 'lower', 'the landing shaft passes through an upper and a lower chamber');
  // a farm on the upper deck is refused (even with its chamber open), a sky garden on the main deck too
  up.status = 'open';
  const farmUp = R.findSpot(s, 'farm', { deck: 'upper', box: up, free: true });
  let fx = -1, fy = -1;
  for (let y = up.y0; y < up.y1 && fx < 0; y++) for (let x = up.x0; x < up.x1; x++) { const t = s.decks.upper.t; const i = y * s.map.w + x; if ([i, i + 1, i + s.map.w, i + s.map.w + 1].every((j) => t[j] === T.PLAIN || t[j] === T.FERTILE)) { fx = x; fy = y; break; } }
  const why = R.canBuild(s, 'farm', fx, fy, 'upper');
  check(fx >= 0 && !farmUp && /only on the main deck/.test(why || ''), `a farm on the upper deck is refused (${why})`);
  check(/only on the upper deck/.test(R.canBuild(s, 'skygarden', cmdOf(s).x + 4, cmdOf(s).y, 'main') || ''), 'a sky garden on the main deck is refused');
  check(R.findSpot(s, 'skygarden', { deck: 'main', free: true }) === null, 'no spot for a sky garden anywhere on the main deck');
  check(R.findSpot(s, 'skygarden', { deck: 'upper', box: up, free: true }) !== null, 'a sky garden fits in an open upper chamber');
  check(/only on the main and lower decks/.test(R.canBuild(s, 'pumpstation', fx, fy, 'upper') || ''), 'a pump station is refused on the upper deck');
  check(/no such deck/.test(R.canBuild(s, 'farm', fx, fy, 'attic') || ''), 'an unknown deck is refused');
  up.status = 'sealed';
  // a lift stands only on a shaft
  const pLift = R.findSpot(s, 'lift', { box: land, free: true });
  check(pLift && pLift.x === hs.x && pLift.y === hs.y, `the only lift spot in the landing chamber is its shaft (${pLift?.x},${pLift?.y})`);
  check(/stands only on lift shaft/.test(R.canBuild(s, 'lift', cmdOf(s).x + 4, cmdOf(s).y) || ''), 'a lift is refused off a shaft');
  check(/stands only on lift shaft/.test(R.canBuild(s, 'lift', hs.x + 1, hs.y) || ''), 'a lift must cover its whole shaft');
  check(/stands only on deck/.test(R.canBuild(s, 'habitat', hs.x, hs.y) || ''), 'nothing else stands on a shaft');
  check(/not pressurised/.test(R.canBuild(s, 'lift', hs.x, hs.y, 'upper') || ''), 'a lift on the upper deck needs its chamber open');
  const other = R.shaftsOf(s).find((k) => !k.landing);
  check(/not pressurised/.test(R.canBuild(s, 'lift', other.x, other.y) || ''), 'a lift in a sealed main chamber is refused');
  // the build menu per deck
  const menu = R.buildable(s, 'upper');
  check(menu.find((b) => b.key === 'farm').why === 'Main deck only.' && menu.find((b) => b.key === 'skygarden').onDeck && menu.find((b) => b.key === 'pumpstation').why === 'Main and lower decks only.', 'the build menu says which deck');
  check(menu.find((b) => b.key === 'lift').onDeck && R.buildable(s).find((b) => b.key === 'skygarden').why === null, 'no deck given: the menu is as before');
  check(['lift', 'skygarden', 'gallery', 'cistern', 'geotap', 'pumpstation'].every((k) => s.unlocked.includes(k)), 'deck buildings are unlocked from the start');
}

// ---------------------------------------------------------------- a lift opens the way up and down

const openDeckChamber = (s, c, rng) => {
  const r = c.status === 'sealed' ? R.chamberAction(s, c.id, 'survey') : { ok: true };
  if (!r.ok) return r;
  for (let d = 0; d < 3 && c.status !== 'surveyed'; d++) dayTick(s, rng);
  for (const i of c.breaches) {
    const b = finish(s, R.build(s, 'seal', i % s.map.w, (i / s.map.w) | 0, c.deck));
    if (!b) return { ok: false, msg: 'seal refused' };
  }
  s.stock.air = Math.max(s.stock.air, R.pressuriseAir(s, c) + 20);
  const p = R.chamberAction(s, c.id, 'pressurise');
  if (!p.ok) return p;
  for (let d = 0; d < 6 && c.status !== 'open'; d++) { dayTick(s, rng); s.pending.length = 0; }
  return { ok: c.status === 'open', msg: c.status };
};
let liftColony = null;
{
  const s = rich(3), rng = stateRng(s), hs = home(s);
  const up = chAt(s, 'upper', hs.x, hs.y), lo = chAt(s, 'lower', hs.x, hs.y);
  const r0 = R.chamberAction(s, up.id, 'survey');
  check(!r0.ok && /upper deck\) is out of reach: repair a Lift/.test(r0.msg), `no survey up there without a lift (${r0.msg})`);
  const lr = R.build(s, 'lift', hs.x, hs.y);
  check(lr.ok, `a Lift on the landing shaft (${lr.msg})`);
  check(!R.chamberAction(s, up.id, 'survey').ok, 'an unfinished lift reaches nothing');
  const lift = R.byId(s, lr.id);
  for (let d = 0; d < 20 && lift.build > 0; d++) { dayTick(s, rng); s.pending.length = 0; }
  check(lift.build === 0, 'the lift is repaired by a crew');
  check(R.liftReach(s, up) && R.liftReach(s, lo) && !R.liftReach(s, landingOf(s)), 'the lift reaches the chambers above and below it');
  check(/already has a Lift \(on the main deck\)/.test(R.canBuild(s, 'lift', hs.x, hs.y, 'upper') || ''), 'one lift a shaft');
  const notShaft = s.chambers.find((c) => c.deck === 'upper' && c.status === 'sealed' && c !== up && !R.chamberLinks(s).get(c.id).has(up.id));
  check(!R.chamberAction(s, notShaft.id, 'survey').ok, 'other upper chambers stay out of reach');
  // a seal needs the right deck: on the main deck the same tile is no breach
  const r1 = R.chamberAction(s, up.id, 'survey');
  check(r1.ok, `survey up the lift (${r1.msg})`);
  for (let d = 0; d < 3; d++) dayTick(s, rng);
  check(up.status === 'surveyed', 'upper chamber surveyed');
  const bi = up.breaches[0];
  check(bi !== undefined && R.canBuild(s, 'seal', bi % s.map.w, (bi / s.map.w) | 0, 'upper') === null && R.canBuild(s, 'seal', bi % s.map.w, (bi / s.map.w) | 0) !== null, 'a seal goes on the upper breach with deck "upper", not on the main deck');
  const ro = openDeckChamber(s, up, rng);
  check(ro.ok && up.status === 'open', `upper chamber open: survey → seal → pressurise (${ro.msg})`);
  const rl = openDeckChamber(s, lo, rng);
  check(rl.ok && lo.status === 'open', `lower chamber open (${rl.msg})`);
  check(R.deckSummary(s).upper.open === 1 && R.deckSummary(s).lower.open === 1 && R.summary(s).decks.main.open === 1, 'deck summary counts open chambers per deck');
  // build there
  const sg = R.findSpot(s, 'skygarden', { deck: 'upper', box: up });
  const sgb = sg && finish(s, R.build(s, 'skygarden', sg.x, sg.y, 'upper'));
  check(sgb && sgb.deck === 'upper', 'a sky garden on the upper deck');
  const ci = R.findSpot(s, 'cistern', { deck: 'lower', box: lo });
  const cib = ci && finish(s, R.build(s, 'cistern', ci.x, ci.y, 'lower'));
  const gt = R.findSpot(s, 'geotap', { deck: 'lower', box: lo });
  const water0 = R.storageCaps(s).water, supply0 = R.powerOf(s, 1).supply;
  const gtb = gt && finish(s, R.build(s, 'geotap', gt.x, gt.y, 'lower'));
  check(cib && gtb && cib.deck === 'lower', 'a cistern and a geothermal tap on the lower deck');
  check(R.storageCaps(s).water === water0 && R.powerOf(s, 1).supply === supply0 + 70, `geothermal tap: +70 power (${R.powerOf(s, 1).supply - supply0})`);
  check(R.storageCaps(s).water >= 1000 + 300, `water cistern stores 1,000 (${R.storageCaps(s).water})`);
  // tile info, coverage and roads per deck
  const ti = R.tileInfo(s, sgb.x, sgb.y, 'upper'), tm = R.tileInfo(s, sgb.x, sgb.y);
  check(ti.building === sgb && ti.deck === 'upper' && ti.chamber === up && tm.building !== sgb && tm.deck === 'main', 'tile info per deck');
  check(R.tileInfo(s, hs.x, hs.y, 'lower').lift?.id === lift.id && R.tileInfo(s, hs.x, hs.y).terrain.key === 'shaft', 'tile info names the lift on every deck');
  dayTick(s, rng);
  const parkUp = R.coverage(s, 'park', 'upper'), parkMain = R.coverage(s, 'park');
  const gi = (sgb.y + 1) * s.map.w + sgb.x + 1;
  check(parkUp[gi] === 10 && parkMain[gi] === 0, 'park coverage stays on its deck');
  check(R.coverage(s, 'power', 'lower')[gt.y * s.map.w + gt.x] === 1 && R.coverage(s, 'power')[gt.y * s.map.w + gt.x] === 0, 'power overlay per deck');
  check(R.coverage(s, 'reach', 'upper').every((v) => v === 0), 'no space reach on the upper deck');
  const plan = R.planRoad(s, hs.x - 1, hs.y, hs.x + 3, hs.y, 'upper');
  check(plan.filter((p) => p.why === 'have').length === 2 && plan.filter((p) => p.why === null).length === 3, 'a road on the upper deck runs onto the lift (its tiles count as road)');
  const br = R.buildRoad(s, hs.x - 1, hs.y, hs.x + 3, hs.y, 'upper');
  check(br.ok && br.built === 3 && s.buildings.filter((b) => b.key === 'road' && b.deck === 'upper').length === 3, 'roads on the upper deck');
  check(R.planRoad(s, hs.x - 1, hs.y, hs.x + 3, hs.y).some((p) => p.why === null || p.why === 'have'), 'the main deck has its own roads');
  // gallery services cover upper-deck homes only (none stand there yet): the happiness lines stay main
  const air0 = s.stats.last.produced.air || 0;
  check(air0 > 0, 'air still flows');
  liftColony = s;
}

// ---------------------------------------------------------------- pump stations drain flooded ground

{
  const s = rich(5), rng = stateRng(s), w = s.map.w;
  const lo = s.chambers.find((c) => c.deck === 'lower' && (() => { let n = 0; for (let i = 0; i < w * s.map.h; i++) if (s.decks.lower.ch[i] === c.id && s.decks.lower.t[i] === T.MARSH) n++; return n >= 6; })());
  lo.status = 'open';
  const marshIn = (m, c) => { let n = 0; for (let i = 0; i < w * s.map.h; i++) if (m.ch[i] === c.id && m.t[i] === T.MARSH) n++; return n; };
  const p = R.findSpot(s, 'pumpstation', { deck: 'lower', box: lo, score: (x, y) => { let best = 99; for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (s.decks.lower.t[(y + dy) * w + x + dx] === T.MARSH) best = Math.min(best, Math.max(Math.abs(dx), Math.abs(dy))); return best; } });
  const pump = finish(s, R.build(s, 'pumpstation', p.x, p.y, 'lower'));
  const m0 = marshIn(s.decks.lower, lo);
  // a main-deck pump: flooded ground made by hand beside the Command Centre
  const land = landingOf(s), c = cmdOf(s), flooded = [];
  for (let y = land.y0; y <= land.y1 && flooded.length < 3; y++) for (let x = land.x0; x <= land.x1 && flooded.length < 3; x++) {
    const i = y * w + x;
    if (s.map.t[i] === T.PLAIN && !R.occupancy(s)[i] && Math.max(Math.abs(x - c.x), Math.abs(y - c.y)) > 8 && Math.max(Math.abs(x - c.x), Math.abs(y - c.y)) < 14) { s.map.t[i] = T.MARSH; flooded.push(i); }
  }
  const mp = R.findSpot(s, 'pumpstation', { box: land, score: (x, y) => Math.min(...flooded.map((i) => Math.max(Math.abs(x - (i % w)), Math.abs(y - ((i / w) | 0))))) });
  const mpump = finish(s, R.build(s, 'pumpstation', mp.x, mp.y));
  for (let d = 0; d < 15; d++) { dayTick(s, rng); s.pending.length = 0; }
  const m1 = marshIn(s.decks.lower, lo);
  check(pump && m0 - m1 === 3, `a lower Pump Station drains a tile every 5 days (${m0} -> ${m1} in 15 days)`);
  check(mpump && flooded.filter((i) => s.map.t[i] === T.PLAIN).length === 3, 'a main-deck Pump Station turns flooded ground into plain soil');
  check(s.log.some((l) => /drained a tile of flooded ground on the lower deck/.test(l.text)), 'the log tells');
}

// ---------------------------------------------------------------- save / load with decks

{
  const s = liftColony, text = saveState(s), back = loadState(text);
  check(saveState(back) === text, 'save/load round trip with decks');
  check(['upper', 'lower'].every((d) => ['t', 'r', 'ch', 'sv'].every((k) => back.decks[d][k] instanceof Uint8Array && back.decks[d][k].every((v, i) => v === s.decks[d][k][i]))), 'deck arrays restored');
  check(JSON.stringify(back.decks.shafts) === JSON.stringify(s.decks.shafts) && back.chambers.filter((c) => c.deck).length === s.chambers.filter((c) => c.deck).length, 'shafts and deck chambers restored');
  const ra = stateRng(s), rb = stateRng(back);
  for (let d = 0; d < 30; d++) { dayTick(s, ra); dayTick(back, rb); s.pending.length = 0; back.pending.length = 0; }
  check(saveState(s) === saveState(back), 'a loaded colony with decks continues identically');
  console.log(`save size with decks: ${(text.length / 1024).toFixed(0)} KB`);
}

// ---------------------------------------------------------------- the scripted Easy player

// The goal-following player of tests/colony-v2.mjs (farms, air, water, power, homes, main chambers),
// plus the decks: a Lift at home from day 40, then the chambers it reaches above and below, then
// their neighbours, until two are open on each deck.
function placeAny(s, key, score, deck = 'main', box) {
  const cc = cmdOf(s), dock = dockOf(s);
  const zone = R.spec({ key }).zone, nearB = zone === 'space' ? dock : cc;
  box ||= zone === 'space' ? { x0: nearB.x - 26, y0: nearB.y - 26, x1: nearB.x + 26, y1: nearB.y + 26 } : { x0: 0, y0: 0, x1: s.map.w - 1, y1: s.map.h - 1 };
  const p = R.findSpot(s, key, { box, deck, score: score || ((x, y) => Math.abs(x - nearB.x) + Math.abs(y - nearB.y)) });
  return p ? R.build(s, key, p.x, p.y, deck) : { ok: false };
}
const queued = (s, key) => s.buildings.some((b) => b.key === key && b.build > 0);
const count = (s, key) => s.buildings.filter((b) => b.key === key).length;
function upkeep(s) {
  const m = R.summary(s), place = (key) => (queued(s, key) ? null : placeAny(s, key));
  if (s.stock.credits < 150 && s.stock.food > 150) R.sell(s, 'food', Math.floor(s.stock.food - 120));
  if (m.stock.food.delta < 0) place('farm');
  if (m.stock.air.delta < 0) place('airplant');
  if (m.stock.water.delta < 0) place('riverpump');
  if (m.power.demand > m.power.supply * 0.95) place('solar');
  if (m.housing - s.pop < 10) place('habitat');
  if (s.happy < 60 && m.stock.credits.have > 400) place('park');
  if (s.stock.ore > 50) R.sell(s, 'ore', Math.floor(s.stock.ore));
}
function work(s, c) {   // one step on a chamber: survey, seal, pressurise (an air depot when the stores are too small)
  if (c.status === 'sealed') return R.chamberAction(s, c.id, 'survey');
  if (c.status !== 'surveyed') return null;
  const open = R.openBreaches(s, c);
  if (open.length) { for (const i of open) if (!s.buildings.some((b) => b.key === 'seal' && R.deckOf(b) === R.deckOf(c) && b.y * s.map.w + b.x === i)) R.build(s, 'seal', i % s.map.w, (i / s.map.w) | 0, c.deck); return null; }
  if (R.pressuriseAir(s, c) > (R.storageCaps(s).air || 0) && !queued(s, 'depot')) { const r = placeAny(s, 'depot'); if (r.id) R.setMode(s, r.id, 'air'); }
  return R.chamberAction(s, c.id, 'pressurise');
}
function followGoal(s) {
  const g = goalStatus(s).current, sh = g?.show;
  if (!sh) return;
  if (sh.build) { if (!queued(s, sh.build) && (sh.build !== 'lab' || !count(s, 'lab')) && sh.build !== 'lift') { const r = placeAny(s, sh.build); if (sh.build === 'depot' && r?.id) R.setMode(s, r.id, 'air'); } }
  else if (sh.chamber !== undefined) { const c = R.chamberOf(s, sh.chamber); if (!c.deck) work(s, c); }
  else if (sh.tile && g.id === 'seal') R.build(s, 'seal', sh.tile.x, sh.tile.y);
  else if (sh.market) { if (s.stock.ore) R.sell(s, 'ore', s.stock.ore); else R.sell(s, 'food', 10); }
}
function decks(s, when) {
  if (s.day < 40) return;
  const lift = s.buildings.find((b) => b.key === 'lift');
  if (!lift) { const hs = home(s); R.build(s, 'lift', hs.x, hs.y); return; }
  if (lift.build > 0) return;
  when.lift ??= s.day;
  const links = R.chamberLinks(s);
  for (const deck of ['upper', 'lower']) {
    const on = s.chambers.filter((c) => c.deck === deck);
    if (on.filter((c) => c.status === 'open').length >= 2) continue;
    const busy = on.find((c) => c.status !== 'sealed' && c.status !== 'open');
    if (busy) { work(s, busy); continue; }
    if (s.chambers.some((c) => c.deck && c.status !== 'sealed' && c.status !== 'open')) continue;   // one deck chamber at a time
    const next = on.filter((c) => c.status === 'sealed' && (R.liftReach(s, c) || [...links.get(c.id)].some((id) => R.chamberOf(s, id).status === 'open'))).sort((a, b) => a.tiles - b.tiles)[0];
    if (next && s.stock.credits > 300) work(s, next);
  }
  // something to show for it: a sky garden up there, a cistern down below
  const upOpen = s.chambers.find((c) => c.deck === 'upper' && c.status === 'open'), loOpen = s.chambers.find((c) => c.deck === 'lower' && c.status === 'open');
  if (upOpen && !count(s, 'skygarden') && s.stock.credits > 400) placeAny(s, 'skygarden', null, 'upper', upOpen);
  if (loOpen && !count(s, 'cistern') && s.stock.credits > 400) placeAny(s, 'cistern', null, 'lower', loOpen);
}
function play(seed, days = 200) {
  const s = newGame({ seed }), rng = stateRng(s), when = {}, t0 = performance.now();
  let deaths = 0;
  for (let d = 0; d < days; d++) {
    followGoal(s); upkeep(s); decks(s, when);
    const before = s.pop;
    dayTick(s, rng);
    if (s.pop < before && s.log.some((l) => l.day === s.day && /died/.test(l.text))) deaths += before - s.pop;
    for (const deck of ['upper', 'lower']) {
      const n = s.chambers.filter((c) => c.deck === deck && c.status === 'open').length;
      if (n >= 1) when[`${deck}1`] ??= s.day;
      if (n >= 2) when[`${deck}2`] ??= s.day;
    }
    for (const p of [...s.pending]) if (p.kind === 'raid') R.answer(s, p.id, s.stock.credits >= (p.preview?.tribute?.credits ?? 1e9) ? 'tribute' : 'fight');
    s.pending.length = 0;
  }
  return { s, when, deaths, ms: performance.now() - t0 };
}
for (const seed of [1, 2, 3]) {
  const { s, when, deaths, ms } = play(seed);
  const ds = R.deckSummary(s);
  console.log(`deck player seed ${seed} (easy): day ${s.day} pop ${s.pop} happy ${Math.round(s.happy)} deaths ${deaths}; open upper ${ds.upper.open}/${ds.upper.total}, main ${ds.main.open}/${ds.main.total}, lower ${ds.lower.open}/${ds.lower.total} (${ms.toFixed(0)} ms)`);
  console.log('   ', Object.entries(when).map(([k, d]) => `${k}@${d}`).join(' '));
  check(when.upper2 && when.upper2 <= 200 && when.lower2 && when.lower2 <= 200, `seed ${seed}: two upper and two lower chambers open by day 200`);
  check(deaths === 0 && !s.flags.lost, `seed ${seed}: no deaths (${deaths})`);
  check(count(s, 'skygarden') && count(s, 'cistern'), `seed ${seed}: a sky garden above and a cistern below`);
  check(!walk(s, 'state', []).length && R.GOODS.every((g) => s.stock[g] >= 0), `seed ${seed}: no NaN, no negative stock`);
  if (seed === 1) {
    check(saveState(play(1, 120).s) === saveState(play(1, 120).s), 'the deck player: same seed, same colony');
    // speed: 500 more days of the grown colony
    const rng = stateRng(s), t = performance.now();
    for (let d = 0; d < 500; d++) { dayTick(s, rng); s.pending.length = 0; }
    const ms5 = performance.now() - t;
    console.log(`500 more days of dayTick with three decks (${s.buildings.length} buildings, ${s.chambers.length} chambers): ${ms5.toFixed(0)} ms`);
    check(ms5 < 2000, `500 days under 2 s (${ms5.toFixed(0)} ms)`);
  }
}

// ---------------------------------------------------------------- old saves (version 3) gain decks

// A save from before version 4: no decks, no deck chambers or buildings, no shafts in the map, no deck buildings unlocked.
function stripDecks(s) {
  const o = JSON.parse(saveState(s));
  const main = loadState(saveState(s)).map;
  for (let i = 0; i < main.t.length; i++) if (main.t[i] === T.SHAFT) main.t[i] = T.PLAIN;
  delete o.decks;
  o.chambers = o.chambers.filter((c) => !c.deck);
  o.buildings = o.buildings.filter((b) => !b.deck && b.key !== 'lift');
  o.unlocked = o.unlocked.filter((k) => !BUILDING[k]?.decks);
  o.map.t = Buffer.from(main.t).toString('base64');
  return JSON.stringify(o);
}
let player = null;
{
  // a colony that has grown for 150 days (the scripted player below), saved as version 3
  player = play(6, 150);
  const old = stripDecks(player.s);
  check(!JSON.parse(old).decks && !JSON.parse(old).chambers.some((c) => c.deck), 'the old save has no decks');
  const a = loadState(old), b = loadState(old);
  check(a.decks && R.shaftsOf(a).length >= 6 && a.chambers.filter((c) => c.deck === 'upper').length >= 16 && a.chambers.filter((c) => c.deck === 'lower').length >= 16, 'an old save loads with decks generated');
  check(saveState(a) === saveState(b), 'the decks of an old save come out the same every time');
  check(a.chambers.every((c, k) => c.id === k) && a.chambers.filter((c) => !c.deck).length === JSON.parse(old).chambers.length, 'old chambers kept, deck chambers appended with new ids');
  check(!a.buildings.some((bd) => [...R.tilesOf(a, bd)].some((i) => a.map.t[i] === T.SHAFT)), 'the new shafts keep clear of every old building');
  check(a.map.ch[home(a).y * a.map.w + home(a).x] === landingOf(a).id, 'an old save gets a shaft in its landing chamber');
  check(a.unlocked.includes('lift') && a.unlocked.includes('cistern') && R.canBuild(a, 'lift', home(a).x, home(a).y) === null, 'an old save can build a lift at home');
  const rng = stateRng(a);
  let err = null;
  try { for (let d = 0; d < 60; d++) { for (const p of [...a.pending]) R.answer(a, p.id, p.choices[0].key); dayTick(a, rng); } } catch (e) { err = e; }
  check(!err && !walk(a, 'state', []).length, `the old save runs 60 more days${err ? ` (${err.stack})` : ''}`);
  check(saveState(loadState(saveState(a))) === saveState(a), 'and saves with its decks');
  // a version-1-shaped save (no research, raid...) also gets its decks
  const v1 = JSON.parse(old);
  for (const k of ['research', 'production', 'commanders', 'wanderers', 'raid']) delete v1[k];
  check(loadState(JSON.stringify(v1)).decks?.upper, 'a version-1 save gets decks too');
}

console.log(failed ? `\n${failed} of ${failed + passed} checks FAILED` : `\nall ${passed} checks passed`);
process.exit(failed ? 1 : 0);
