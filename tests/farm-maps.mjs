// Sato's Harvest maps (js/farm/maps.js): every spot the story uses exists and can be stood on, and
// every door, exit, spot and working prop can be walked to.   node tests/farm-maps.mjs
import { allMaps, ruinsMap, doorTarget, outsideOf, findSpot, FORAGE_SPOTS } from '../js/farm/maps.js';
import * as story from '../js/farm/story.js';
import { newGame, enterMine, FORAGE_SPOT_COUNT } from '../js/farm/sim.js';

let failures = 0, checks = 0;
const check = (cond, what) => { checks++; if (!cond) { failures++; console.log('FAIL', what); } };
const maps = allMaps();

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
// the Old World: sites build, the lift pad is reachable, every pile can be reached or is beside open ground
for (const mode of ['earth', 'belt']) for (let depth = 1; depth <= 12; depth++) for (let seed = 1; seed <= 6; seed++) {
  const S = newGame({ seed: seed * 97 + depth }); enterMine(S, depth, mode); const m = ruinsMap(S.mine);
  check(!m.solid(m.start[0], m.start[1]), `ruins ${depth}/${seed}: the lift pad is free`);
  const piles = new Set(); S.mine.cells.forEach((c, i) => { if (c === 1) piles.add((i % S.mine.w + 1) + ',' + (Math.floor(i / S.mine.w) + 1)); });
  // rubble blocks walking until searched; search outward from the pad
  const seen = new Set(), q = [[Math.floor(m.start[0]), Math.floor(m.start[1])]]; seen.add(q[0].join()); let found = 0;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (seen.has(k) || m.solid(x + dx, y + dy)) continue; seen.add(k); if (piles.has(k)) found++; q.push([x + dx, y + dy]); } }
  check(found === piles.size, `ruins ${depth}/${seed}: all ${piles.size} piles can be reached (${found})`);
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
console.log(failures ? `${failures} of ${checks} checks failed` : `farm-maps: all ${checks} checks passed`);
process.exit(failures ? 1 : 0);
