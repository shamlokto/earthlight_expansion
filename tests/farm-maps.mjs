// Sato's Harvest maps (js/farm/maps.js): every spot the story uses exists and can be stood on, and
// every door, exit, spot and working prop can be walked to.   node tests/farm-maps.mjs
import { readFileSync } from 'node:fs';
import { allMaps, ruinsMap, doorTarget, outsideOf, findSpot, FORAGE_SPOTS, CENTRAL_HOUSES } from '../js/farm/maps.js';
import * as story from '../js/farm/story.js';
import { newGame, enterMine, cityZone, FORAGE_SPOT_COUNT } from '../js/farm/sim.js';

let failures = 0, checks = 0;
const check = (cond, what) => { checks++; if (!cond) { failures++; console.log('FAIL', what); } };
const maps = allMaps();
const NPCSHOP = Object.fromEntries(Object.entries(story.NPCS).filter(([, n]) => n.shop).map(([id, n]) => [id, n.shop + '.counter']));

function reach(m, sx, sy) {                       // flood fill over walkable tiles
  const seen = new Set(), q = [[Math.floor(sx), Math.floor(sy)]]; seen.add(q[0].join());
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && !m.solid(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  return seen;
}
const near = (seen, x, y, r = 1) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (seen.has((Math.floor(x) + i) + ',' + (Math.floor(y) + j))) return true; return false; };

for (const s of story.SPOTS || []) check(!!findSpot(s), `spot ${s} is on a map`);
for (const m of Object.values(maps)) {
  const start = m.start || (m.exitTile ? [m.exitTile[0] + 0.5, m.exitTile[1] - 0.6] : null);
  check(!!start, `${m.id} has a way in`); if (!start) continue;
  check(!m.solid(start[0], start[1]), `${m.id}: the entry tile is free`);
  const seen = reach(m, start[0], start[1]);
  for (const [name, [x, y]] of Object.entries(m.spots)) { check(!m.solid(x, y), `${name} is free ground`); check(seen.has(Math.floor(x) + ',' + Math.floor(y)), `${name} can be reached`); }
  for (const d of m.doors) { check(seen.has(d.x + ',' + d.y), `${m.id}: door to ${d.to.map} can be reached`); check(!!maps[d.to.map], `${m.id}: door leads to a real map`); const t = doorTarget(d.to.map); check(!maps[d.to.map].solid(t.x, t.y), `${d.to.map}: arriving inside is free`); const o = outsideOf(d.to.map); check(o.map === m.id && !m.solid(o.x, o.y), `${d.to.map}: leaving puts you outside its door`); }
  for (const e of m.exits) { check(seen.has(e.x0 + ',' + e.y0), `${m.id}: exit to ${e.to.map} can be reached`); const t = maps[e.to.map]; check(t && !t.solid(e.to.x, e.to.y), `${m.id}: exit to ${e.to.map} arrives on free ground`); check(t && !t.exits.some((q) => Math.floor(e.to.x) >= q.x0 && Math.floor(e.to.x) <= q.x1 && Math.floor(e.to.y) >= q.y0 && Math.floor(e.to.y) <= q.y1), `${m.id}: arriving in ${e.to.map} is not on an exit`); }
  for (const p of m.props) if (p.act) check(near(seen, p.x + (p.w - 1) / 2, p.y + (p.d - 1) / 2, Math.max(p.w, p.d)), `${m.id}: ${p.kind} (${p.act}) can be reached`);
  if (m.field) for (let y = 0; y < m.field.h; y++) for (let x = 0; x < m.field.w; x++) if (m.at(m.field.x + x, m.field.y + y) !== 'f') { check(false, `${m.id}: field tile ${x},${y} is soil`); y = 99; break; }
  if (m.field) check(near(seen, m.field.x, m.field.y), `${m.id}: the field can be reached`);
  if (m.pasture) check(seen.has(m.pasture.x + ',' + m.pasture.y), `${m.id}: the pasture can be entered`);
}
for (const [x, y] of FORAGE_SPOTS) check(!maps.hill.solid(x, y) && near(reach(maps.hill, 1.6, 13), x, y), `forage spot ${x},${y} can be reached`);
check(FORAGE_SPOTS.length === FORAGE_SPOT_COUNT && new Set(FORAGE_SPOTS.map((p) => p.join())).size === FORAGE_SPOTS.length, `${FORAGE_SPOTS.length} different forage spots, as many as the sim rolls`);
check(maps.hill.props.some((p) => p.act === 'onsen' && p.w === 4 && p.d === 3) && findSpot('hill.onsen')?.map === 'hill', 'the Terrace Onsen is on the hill');
// every person's place, at every hour, is a real spot
for (const id of Object.keys(story.NPCS)) if (id !== 'sato') for (let season = 0; season < 4; season++) for (let weekday = 0; weekday < 7; weekday++) for (let minute = 360; minute < 1440; minute += 60) for (const weather of ['sun', 'rain']) {
  const w = story.whereIs(id, { season, day: 1 + weekday, weekday, minute, weather, festival: null }); if (w) check(!!findSpot(w.spot), `${id} stands on a real spot (${w.spot})`);
}
for (const e of story.EVENTS) check(!!maps[e.map], `event ${e.id}: map ${e.map} exists`);
for (const f of story.FESTIVALS) check(!!findSpot(f.spot), `festival ${f.id}: spot exists`);
// the Old World city ruins (2026-11-20): one big map a trip, from a seed. The pad is free and reachable from every
// treasure spot and every creature; zones run suburbs → downtown → core with distance from the pad.
for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
  const S = newGame({ seed: seed * 101 }); enterMine(S, 1, 'earth'); const mine = S.mine, m = ruinsMap(mine), W = mine.w;
  check(mine.mode === 'city' && m.city && m.earth && !m.belt && mine.w >= 90 && mine.h >= 70 && m.w === mine.w + 2, `city ${seed}: one big map (${mine.w}×${mine.h})`);
  check(!m.solid(m.start[0], m.start[1]) && m.props.some((p) => p.act === 'liftup' && p.kind === 'shuttle_pad') && m.props.some((p) => p.kind === 'shuttle'), `city ${seed}: Sato starts on the landing pad, the shuttle beside it`);
  check(!m.props.some((p) => p.kind === 'stairs') && !mine.cells.includes(undefined), `city ${seed}: no way down, no holes`);
  // walk out from the pad on the built map
  const seen = new Uint8Array(m.w * m.h), dist = new Int32Array(m.w * m.h).fill(-1), q = [[Math.floor(m.start[0]), Math.floor(m.start[1])]];
  seen[q[0][1] * m.w + q[0][0]] = 1; dist[q[0][1] * m.w + q[0][0]] = 0;
  for (let k = 0; k < q.length; k++) { const [x, y] = q[k]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * m.w + x + dx; if (seen[j] || m.solid(x + dx, y + dy)) continue; seen[j] = 1; dist[j] = dist[y * m.w + x] + 1; q.push([x + dx, y + dy]); } }
  const reachCell = (i) => seen[(Math.floor(i / W) + 1) * m.w + (i % W) + 1];
  const besideOpen = (i) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reachCell(i + dy * W + dx)) || (mine.cells[i] === 4 && [i + W, i + 2 * W].some((j) => [[1, 0], [-1, 0], [0, 1]].some(([dx, dy]) => reachCell(j + dy * W + dx))));
  const kinds = new Set(mine.spots.map((s) => s.kind));
  check(mine.spots.length >= 60 && ['rubble', 'car', 'locker', 'safe', 'vault'].every((k) => kinds.has(k)), `city ${seed}: ${mine.spots.length} treasure spots of every kind (${[...kinds].join(', ')})`);
  check(mine.spots.every((s) => besideOpen(s.i)), `city ${seed}: every treasure spot can be reached from the pad`);
  check(mine.monsters.length >= 30 && mine.monsters.every((r) => reachCell(r.y * W + r.x)), `city ${seed}: all ${mine.monsters.length} creatures stand where the Pallas can reach`);
  check(mine.monsters.some((r) => r.kind === 'spore_brute' && r.guard), `city ${seed}: a spore-brute guards the vault`);
  // zones by distance: the mean walking distance from the pad grows suburbs < downtown < core
  const sum = [0, 0, 0], n = [0, 0, 0];
  for (let i = 0; i < mine.cells.length; i++) { const d = dist[(Math.floor(i / W) + 1) * m.w + (i % W) + 1]; if (d < 0) continue; const z = cityZone(i % W, Math.floor(i / W)); sum[z] += d; n[z]++; }
  check(n.every((k) => k > 100) && sum[0] / n[0] < sum[1] / n[1] && sum[1] / n[1] < sum[2] / n[2], `city ${seed}: zones get further from the pad (${sum.map((v, z) => Math.round(v / n[z])).join(' < ')})`);
  check(mine.monsters.filter((r) => r.zone === 2).length > mine.monsters.filter((r) => r.zone === 0).length, `city ${seed}: more creatures in the core than the suburbs`);
  check(m.at(Math.floor(m.start[0]), Math.floor(m.start[1])) === 'm' && m.g.includes('t') && m.g.includes('g') && m.props.filter((p) => p.kind === 'ruin_tower').length >= 30, `city ${seed}: streets, toxic pools, overgrowth and towers`);
}
// the belt: one long map built from the sim's grid, the pad at the south, a marker buoy pair and signs on every sector line
for (const seed of [1, 7, 31]) {
  const S = newGame({ seed }); S.belt = { seed, gone: {}, reached: 20 }; const mine = enterMine(S, 15, 'belt'), m = ruinsMap(mine);
  check(m.belt && !m.earth && m.w === mine.w + 2 && m.h === mine.h + 2 && m.at(0, 5) === 'x' && m.at(5, 5) === 'v', `belt ${seed}: a dust lane inside a border`);
  check(!m.solid(m.start[0], m.start[1]) && m.props.some((p) => p.act === 'liftup' && Math.floor(p.x) === Math.floor(m.start[0])), `belt ${seed}: the launch pad is where Sato starts`);
  check(m.props.filter((p) => p.kind === 'sector_buoy').length === 2 * 19 && m.props.filter((p) => p.kind === 'sector_sign').length === 2 * 19, `belt ${seed}: buoys and signs on all 19 sector lines`);
  check(mine.marks.every((k) => m.props.some((p) => p.kind === k.kind && p.mark === k.kind && story.BELT.marks[k.kind])), `belt ${seed}: every landmark has a sign with words`);
  check(m.name === 'The belt, sector 15' && mine.start === 15, `belt ${seed}: named for the sector`);
}
// Eden Central's school, church and safety depot; the Arrivals hall; the orbital elevator (2026-11-19)
for (const [kind, room] of [['school', 'school'], ['church', 'church'], ['safety_depot', 'depot'], ['arrivals', 'arrivals']]) {
  const b = maps.central.buildings.find((x) => x.kind === kind); check(!!b && b.to && b.to.map === room && !!maps[room] && maps[room].indoor, `Eden Central has the ${kind}, with its interior ${room}`);
}
for (const k of ['school', 'church', 'safety_depot']) { const b = maps.central.buildings.find((x) => x.kind === k); check(b && b.d > b.w, `${k}: deeper than wide (its door is on a short end)`); }
check(maps.central.areas.some((a) => a[0] === 'School') && maps.central.areas.some((a) => a[0] === 'Church') && maps.central.areas.some((a) => a[0] === 'Safety depot'), 'the map names the new buildings');
const ah = maps.arrivals;
check(ah.at(3, 3) === 'd' && ah.props.some((p) => p.act === 'shuttle') && ah.props.some((p) => p.sign === 'central.arrivals') && ah.props.some((p) => p.sign === 'central.dock'), 'the Arrivals hall: deck floor, the courier desk books the shuttle, both signs');
check(!ah.props.some((p) => ['noticeboard', 'bench', 'desk', 'rug', 'market_stall'].includes(p.kind)), 'no village furniture in the Arrivals hall');
check(maps.church.props.some((p) => p.act === 'candles') && maps.church.props.filter((p) => p.kind === 'pew').length >= 4 && maps.church.props.some((p) => p.kind === 'stained_glass'), 'the church: candles, pews, stained glass');
check(maps.depot.props.some((p) => p.kind === 'lockers') && maps.depot.props.some((p) => p.kind === 'rescue_drone') && maps.depot.props.some((p) => p.sign === 'depot.map'), 'the depot: lockers, drones, the deck map');
check(maps.school.props.filter((p) => p.kind === 'school_desk').length >= 6 && maps.school.props.some((p) => p.kind === 'blackboard') && maps.school.props.some((p) => p.kind === 'cubbies'), 'the school: small desks, a blackboard, cubbies');
const el = maps.hill.buildings.find((b) => b.kind === 'orbital_elevator');
check(el && el.to.map === 'hangar' && el.height >= 8 && !maps.hill.buildings.some((b) => b.kind === 'lift'), 'the orbital elevator replaces the Descent and goes to the hangar');
for (const s of ['central.school', 'central.church', 'central.depot', 'school.board', 'school.cubbies', 'depot.map']) check(typeof story.SIGNS[s] === 'string' && story.SIGNS[s].length > 40, `sign ${s} has words`);
// Market Lane and the bigger farm (2026-11-19): both maps grew east; everything from before keeps its place
{
  const F = maps.farm, V = maps.village;
  check(F.w === 64 && F.h === 34 && V.w === 96 && V.h === 52, `the farm is 64×34 and Willowfall 96×52 (${F.w}×${F.h}, ${V.w}×${V.h})`);
  check(F.field.x === 3 && F.field.y === 11 && F.pasture.x === 26 && F.pasture.y === 12 && F.at(28, 24) === 'w' && F.at(3, 11) === 'f', 'the old field, pasture and pond are where they were');
  const door = (m, map) => m.doors.find((d) => d.to.map === map);
  check(door(F, 'house').x === 6 && door(F, 'house').y === 7 && door(F, 'coop').x === 16 && door(F, 'barn').x === 24 && door(F, 'greenhouse').x === 37, 'the farm doors are where they were');
  check(F.exits.some((e) => e.x0 === 21 && e.y0 === 33 && e.to.map === 'village') && F.exits.some((e) => e.x0 === F.w - 1 && e.y0 === 8 && e.to.map === 'hill'), 'the farm exits: the village gate where it was, the hill road at the east edge');
  check(F.at(F.w - 1, 8) === 'p' && F.at(F.w - 1, 9) === 'p' && !F.props.some((p) => p.kind !== 'nothing' && p.x >= 43 && p.y >= 8 && p.y <= 9), 'the hill road runs clear to the farm\'s east edge');
  { const H = maps.hill; check(H.exits.some((e) => e.to.map === 'farm' && e.to.x > F.w - 3), 'coming back from the hill lands at the farm\'s east edge'); }
  check(JSON.stringify(F.spots['farm.porch']) === '[7.5,8.4]' && JSON.stringify(F.spots['farm.pond']) === '[26.4,25.5]' && JSON.stringify(V.spots['village.square']) === '[31.5,19.6]' && JSON.stringify(V.spots['village.lift']) === '[56.5,13.7]', 'old spots keep their coordinates');
  check(door(V, 'store').x === 17 && door(V, 'store').y === 7 && door(V, 'cafe').x === 45 && door(V, 'ranch').x === 7 && door(V, 'library').x === 49 && V.exits.some((e) => e.x0 === 31 && e.y0 === 0), 'the village doors and exit are where they were');
  check(F.props.filter((p) => p.kind === 'nothing').every((p) => !p.solid) && V.props.filter((p) => p.kind === 'nothing').every((p) => !p.solid), 'cleared props stay in the list as harmless placeholders (prop indices keep their meaning)');
  const E = F.eastField;
  check(E && E.id === 'east' && E.w === 12 && E.h === 10 && F.fields.length === 2 && [...Array(E.h).keys()].every((y) => [...Array(E.w).keys()].every((x) => F.at(E.x + x, E.y + y) === 'f')), 'the East Terrace field is soil, 12 by 10');
  check(!(E.x < F.field.x + F.field.w && E.x + E.w > F.field.x && E.y < F.field.y + F.field.h && E.y + E.h > F.field.y), 'the two fields do not overlap');
  const fs = reach(F, 6.5, 8.5); check(near(fs, E.x, E.y) && near(fs, E.x + E.w - 1, E.y + E.h - 1), 'the East Terrace can be reached from the farmhouse');
  check(door(F, 'fold') && door(F, 'fold').lock === 'fold' && maps.fold.props.some((p) => p.act === 'feedfold') && maps.fold.beasts.join() === 'goat,sheep', 'the fold: locked until mended, a trough, goats and sheep');
  check(door(F, 'duckhouse') && door(F, 'duckhouse').lock === 'duckhouse' && maps.duckhouse.props.some((p) => p.act === 'duckeggs') && maps.duckhouse.props.some((p) => p.act === 'feedduck'), 'the duck house: a nest box and a feeder');
  const P = F.duckPond; check(P && F.at(P[0], P[1]) === 'w' && F.at(P[2], P[3]) === 'w', 'the duck pond is water');
  for (const [kind, room, shop] of [['bakery', 'bakery', 'bakery'], ['tailor', 'tailor', 'tailor'], ['seedhouse', 'florist', 'florist'], ['garage', 'garage', 'garage'], ['radio_station', 'radio', 'radio']]) {
    const b = V.buildings.find((x) => x.kind === kind);
    check(b && b.x >= 64 && b.to.map === room && maps[room] && maps[room].indoor && maps[room].spots[room + '.counter'] && maps[room].props.some((p) => p.act === 'counter'), `Market Lane has the ${kind}, with ${room}.counter behind a counter`);
    check(story.NPCS[Object.keys(story.NPCS).find((id) => story.NPCS[id].shop === shop)], `somebody keeps the ${shop}`);
  }
  check(V.buildings.filter((b) => b.x >= 64 && b.kind.startsWith('cottage')).length === 5 && V.props.filter((p) => p.act === 'house' && /^home_/.test(p.house)).every((p) => typeof CENTRAL_HOUSES[p.house] === 'string'), 'five Lane cottages, each with a note on the door');
  check(V.at(80, 27) === 'w' && V.at(76, 28) === 'k' && V.at(70, 8) === 'c' && V.at(70, 17) === 'p', 'the river runs on east under the Mill Bridge; Market Street and the cross street run on into the Lane');
  check(V.areas.some((a) => a[0] === 'Market Lane') && F.areas.some((a) => a[0] === 'East Terrace'), 'the map names the new districts');
  check(maps.cafe.spots['cafe.stage'] && !maps.cafe.solid(...maps.cafe.spots['cafe.stage']), 'the Hangar has a corner stage for Vesna');
  for (const s of ['village.lane', 'village.bakeryfront', 'village.millbridge', 'village.trialbeds', 'farm.east']) check(typeof story.SIGNS[s] === 'string' && story.SIGNS[s].length > 40, `sign ${s} has words`);
}
// the farmhouse bed is for sleeping; only the catacomb beds (numbered) grow mushrooms (2026-11-19: the two once got mixed up)
{ const all = allMaps(); const hb = all.house.props.find((p) => p.act === 'bed'); check(hb && hb.bed == null, 'the farmhouse bed has no catacomb bed number');
  check(all.lower.props.filter((p) => p.act === 'bed').every((p) => Number.isInteger(p.bed)), 'every catacomb growing bed is numbered');
  check(/p\.act === 'bed' && p\.bed != null\) return bedProbe/.test(readFileSync(new URL('../js/farm/main.js', import.meta.url), 'utf8')), 'only numbered beds go to the mushroom-bed prompt'); }

// people walk (2026-11-19, docs/FARM.md §15): every spot on a map can be walked to from every other, and to every door and exit
{
  const paths = await import('../js/farm/paths.js'); const { lowerState, HOMES } = await import('../js/farm/maps.js');
  const FULL = Object.fromEntries(['ld_lights', 'ld_pumps', 'ld_pump2', 'ld_pump3', 'ld_catacombs', 'ld_enclave', 'ld_rehoused', 'ld_works', 'ld_arena', 'ld_vents', 'ld_vault'].map((k) => [k, true]));
  lowerState(maps.lower, FULL);
  const P = paths.portals(); let pairs = 0;
  for (const m of Object.values(maps)) {
    const spots = (story.SPOTS || []).map((n) => [n, findSpot(n)]).filter(([, a]) => a && a.map === m.id);
    for (const [a, A] of spots) {
      for (const [b, B] of spots) if (a < b) { pairs++; check(paths.distance(m, A.x, A.y, B.x, B.y) < Infinity, `${m.id}: a walk from ${a} to ${b}`); }
      for (const p of P[m.id] || []) check(paths.distance(m, A.x, A.y, p.x, p.y) < Infinity, `${m.id}: a walk from ${a} to the way to ${p.to}`);
    }
  }
  check(pairs > 400, `spot pairs walked (${pairs})`);
  const wp = paths.walkPath(maps.village, 31.5, 19.6, 18.6, 8.6); check(wp && wp.length >= 2 && wp.every(([x, y]) => !maps.village.solid(x, y)), 'a walk across the square keeps to open ground');
  check(Object.keys(HOMES).length >= 24 && Object.values(HOMES).every((h) => maps[h.room] && maps[h.room].indoor && (h.back ? maps[h.room].backTo : maps[h.map].doors.some((d) => d.home === h.key))), 'every home has a room and a way in');
  check(Object.values(HOMES).every((h) => (P[h.room] || []).some((p) => p.to === h.map) && (P[h.map] || []).some((p) => p.to === h.room)), 'people can walk in and out of every home');
  // a whole day for everybody, each weekday, early and late in the story: every move between two places has a walk
  const ids = Object.keys(story.NPCS).filter((k) => k !== 'sato');
  const MID = Object.fromEntries(['ld_lights', 'ld_pumps', 'ld_pump2', 'ld_pump3', 'ld_catacombs', 'ld_enclave'].map((k) => [k, true]));
  for (const [flags, year] of [[{}, 1], [MID, 1], [FULL, 2]]) {
    lowerState(maps.lower, flags);
    for (let wd = 0; wd < 7; wd++) for (const weather of ['sun', 'rain']) {
      const sched = (id, m) => { const c = { season: 1, day: 1 + wd, weekday: wd, minute: m, weather, festival: null, year, flags }; const w = story.whereIs(id, c); if (w) return { spot: w.spot, vis: true }; const h = story.homeSpot(id, c); return h ? { spot: h, vis: false } : null; };
      const plan = paths.planDay(ids, sched); let moves = 0, walked = 0;
      for (const id of ids) plan[id].stops.forEach((st, i) => { const pr = plan[id].stops[i - 1]; if (!pr || !pr.at || !st.at || pr.spot === st.spot) return; moves++; if (st.route) walked++; else check(false, `no walk for ${id}: ${pr.spot} → ${st.spot} (wd ${wd}, ${weather}, ${flags.ld_vault ? 'late' : 'early'})`); });
      check(walked === moves && moves > 60, `wd ${wd} ${weather}: ${walked}/${moves} moves walked`);
      for (const id of ids) for (let t = 360; t < 1440; t += 7) { const L = paths.locate(plan, id, t); if (L) { const m = maps[L.map]; check(m && Number.isFinite(L.x) && Number.isFinite(L.y) && !m.solid(L.x, L.y) && (m.at(L.x, L.y) !== 'f' || !L.moving), `${id} is somewhere real, not in a wall or on the soil, at ${t} (${L.map} ${L.x?.toFixed(1)},${L.y?.toFixed(1)})`); if (L.moving) check(!m.posts.some(([px, py, pr]) => Math.hypot(px - L.x, py - L.y) < pr * 0.8), `${id} does not walk through a post at ${t} (${L.map} ${L.x.toFixed(1)},${L.y.toFixed(1)})`); } }
      for (let t = 420; t < 1380; t += 30) { const here = ids.map((id) => [id, paths.locate(plan, id, t)]).filter(([, L]) => L && L.vis && !L.moving); for (let i = 0; i < here.length; i++) for (let j = i + 1; j < here.length; j++) { const [a, A] = here[i], [b, B] = here[j]; if (A.map === B.map) check(Math.hypot(A.x - B.x, A.y - B.y) > 0.45, `${a} and ${b} do not stand inside each other (${A.map} ${A.x.toFixed(1)},${A.y.toFixed(1)} at ${t})`); } }
      for (const id of ids) for (const st of plan[id].stops) if (st.route && !st.shuffle && paths.DUTY.test(st.spot)) check(st.A <= st.T + 0.01, `${id} reaches ${st.spot} on time (wd ${wd}, ${weather}, ${flags.ld_vault ? 'late' : flags.ld_enclave ? 'middle' : 'early'}: due ${st.T}, arrives ${st.A.toFixed(0)})`);   // every post, shop or not (2026-11-20)
    }
  }
}
// opening-hours signs and mailboxes (2026-11-20)
{
  const { HOURS_SIGNS, MAILBOXES, HOMES, lowerState } = await import('../js/farm/maps.js');
  lowerState(maps.lower, Object.fromEntries(['ld_lights', 'ld_pumps', 'ld_pump2', 'ld_pump3', 'ld_catacombs', 'ld_enclave', 'ld_works'].map((k) => [k, true])));   // the whole deck open
  for (const place of Object.keys(story.PLACES)) {
    const sg = HOURS_SIGNS.find((q) => q.place === place); check(!!sg, `${place} has an opening-hours sign`); if (!sg) continue;
    const m = maps[sg.map], st = m.start || [m.exitTile[0] + 0.5, m.exitTile[1] - 0.6];
    check(sg.p.act === 'hours' && near(reach(m, st[0], st[1]), sg.x, sg.y), `${place}: the sign can be reached`);
    check(!m.doors.some((d) => d.x === sg.x && d.y === sg.y) && !m.solid(sg.x, sg.y), `${place}: the sign is not on a doorway`);
    const t = story.hoursSign(place); check(typeof t === 'string' && t.startsWith(story.PLACES[place].name) && t.length < 400, `${place}: the sign has words`);
    if (story.PLACES[place].keeper) check(!t.includes(story.NPCS[story.PLACES[place].keeper].name) || place === 'undercroft', `${place}: the sign names the place, not who runs it`);
  }
  check(/Sun closed/.test(story.hoursSign('store')) && /Thu closed/.test(story.hoursSign('ranch')) && /Wed closed/.test(story.hoursSign('workshop')) && /Mon closed/.test(story.hoursSign('library')) && /10:00–22:00/.test(story.hoursSign('cafe')), 'the hours come from the schedules, closed days and all');
  for (const H of Object.values(HOMES)) {
    const mb = MAILBOXES.find((q) => q.home === H.key); check(!!mb, `${H.label} has a mailbox`); if (!mb) continue;
    const m = maps[mb.map], st = m.start || [m.exitTile[0] + 0.5, m.exitTile[1] - 0.6];
    check(mb.p.act === 'mail' && near(reach(m, st[0], st[1]), mb.x, mb.y) && Math.abs(mb.x - H.x) + Math.abs(mb.y - H.y) <= 3, `${H.label}: the mailbox is by the door and can be reached`);
    check(!m.doors.some((d) => d.x === mb.x && d.y === mb.y), `${H.label}: the mailbox is not on a doorway`);
  }
  lowerState(maps.lower, Object.fromEntries(['ld_lights', 'ld_pumps', 'ld_pump2', 'ld_pump3', 'ld_catacombs', 'ld_enclave', 'ld_works'].map((k) => [k, true])));
  const paths = await import('../js/farm/paths.js');
  for (const x of [...HOURS_SIGNS, ...MAILBOXES]) { const m = maps[x.map], d = m.doors.length ? m.doors.reduce((a, q) => (Math.hypot(q.x - x.x, q.y - x.y) < Math.hypot(a.x - x.x, a.y - x.y) ? q : a)) : null; if (d && Math.hypot(d.x - x.x, d.y - x.y) < 4) { const st = m.start || [m.exitTile[0] + 0.5, m.exitTile[1] - 0.6]; check(paths.distance(m, d.x + 0.5, d.y + 0.5, st[0], st[1]) < Infinity, `${x.map}: the door at ${d.x},${d.y} is still open to walkers beside the ${x.place || x.home} ${x.place ? 'sign' : 'mailbox'}`); } }
}
console.log(failures ? `${failures} of ${checks} checks failed` : `farm-maps: all ${checks} checks passed`);
process.exit(failures ? 1 : 0);
