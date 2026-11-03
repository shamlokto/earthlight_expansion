// Colony map generator: sanity, determinism and the playability guarantees of docs/COLONY-V1.md
// for seeds 1..20, a few stats, and an ASCII preview of seed 1 (2:1, EXPANSION.md symbols).
//   node tests/colony-mapgen.mjs
import { generateMap } from '../js/colony/mapgen.js';
import { T, R, TERRAIN } from '../js/colony/data/terrain.js';

const W = 256, H = 160, NONE = 255, REACH = 24;
const EDEN = { x0: 48, y0: 32, x1: 207, y1: 111 };
const KINDS = ['landing', 'fields', 'river', 'rubble', 'deck'];
const BUILD_FLOOR = new Set([T.DECK, T.PLAIN, T.FERTILE, T.POOR]);
let failures = 0;
const check = (ok, msg) => { if (!ok) { failures++; console.log(`  FAIL ${msg}`); } };
const xy = (i) => [i % W, (i / W) | 0];
const n4 = (i) => [i - 1, i + 1, i - W, i + W];

function cluster(t, start, ter, keep, seen) {
  const out = [start]; seen[start] = 1;
  for (let h = 0; h < out.length; h++) for (const j of n4(out[h])) {
    if (j < 0 || j >= W * H || seen[j] || t[j] !== ter || !keep(j)) continue;
    if (Math.abs((j % W) - (out[h] % W)) > 1) continue;
    seen[j] = 1; out.push(j);
  }
  return out;
}

function verify(seed, g) {
  const { map, chambers, start } = g;
  const { t, r, ch, sv } = map;
  check(map.w === W && map.h === H, `seed ${seed}: size`);
  for (const [k, a] of Object.entries({ t, r, ch, sv })) check(a instanceof Uint8Array && a.length === W * H, `seed ${seed}: ${k} is a Uint8Array of ${W * H}`);
  check(t.every((v) => v < TERRAIN.length), `seed ${seed}: terrain ids valid`);
  check(r.every((v) => v === R.NONE || v === R.ORE_SEAM || v === R.WRECK), `seed ${seed}: artifact ids valid`);
  check(chambers.length >= 20 && chambers.length <= 28, `seed ${seed}: ${chambers.length} chambers (20–28)`);

  // Bands of the map.
  let bandsOk = true;
  for (let i = 0; i < W * H; i++) {
    const [x, y] = xy(i), v = t[i];
    const eden = x >= EDEN.x0 && x <= EDEN.x1 && y >= EDEN.y0 && y <= EDEN.y1;
    const hull = eden && (x < EDEN.x0 + 2 || x > EDEN.x1 - 2 || y < EDEN.y0 + 2 || y > EDEN.y1 - 2);
    const zone = TERRAIN[v].zone;
    if (y >= 154) bandsOk &&= v === T.EARTH;
    else if (y >= 144) bandsOk &&= v === T.ATMOSPHERE;
    else if (hull) bandsOk &&= v === T.HULL || v === T.BREACH;
    else if (eden) bandsOk &&= zone === 'interior' || zone === 'wall';
    else bandsOk &&= zone === 'space';
    if (!bandsOk) { check(false, `seed ${seed}: tile ${x},${y} terrain ${TERRAIN[v].key} out of its band`); break; }
  }
  // Salvage matches rubble and wrecks.
  check(t.every((v, i) => sv[i] === (r[i] === R.WRECK ? 120 : v === T.RUBBLE ? 40 : 0)), `seed ${seed}: sv = 40 rubble / 120 wreck / 0`);
  check(r.every((v, i) => v !== R.ORE_SEAM || t[i] === T.ASTEROID), `seed ${seed}: ore seams on asteroids`);
  check(r.every((v, i) => v !== R.WRECK || t[i] === T.VOID || t[i] === T.RUBBLE), `seed ${seed}: wrecks on void or rubble`);

  // Chambers: ids, bounding boxes, tile counts, floors, names, status.
  const names = new Set();
  const land = chambers[start.landing];
  check(land && land.kind === 'landing' && land.status === 'open', `seed ${seed}: landing chamber open`);
  for (const [k, c] of chambers.entries()) {
    check(c.id === k, `seed ${seed}: chamber id ${c.id} at index ${k}`);
    check(KINDS.includes(c.kind), `seed ${seed}: chamber ${c.id} kind ${c.kind}`);
    check(c.status === (c === land ? 'open' : 'sealed') && c.work === 0, `seed ${seed}: chamber ${c.id} status`);
    check(c.name && !names.has(c.name), `seed ${seed}: chamber ${c.id} name unique (${c.name})`); names.add(c.name);
    let n = 0, inBox = true;
    for (let i = 0; i < W * H; i++) if (ch[i] === c.id) {
      n++; const [x, y] = xy(i);
      inBox &&= x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1 && TERRAIN[t[i]].zone === 'interior';
    }
    check(n === c.tiles && n > 0 && inBox, `seed ${seed}: chamber ${c.id} tiles ${n} vs ${c.tiles}, all interior inside its box`);
  }
  check(ch.every((c, i) => c === NONE ? TERRAIN[t[i]].zone !== 'interior' || t[i] === T.RIVER : c < chambers.length), `seed ${seed}: ch only on interior floor (river crossings excepted)`);

  // Breaches: wall positions next to the chamber's floor; listed in every chamber they touch.
  const listed = new Set();
  const nbs = new Set();
  for (let i = 0; i < W * H; i++) if (t[i] === T.GATE || t[i] === T.BULKHEAD) {
    const a = ch[i - 1], b = ch[i + 1], c = ch[i - W], d = ch[i + W];
    if (a === land.id && b !== NONE) nbs.add(b); if (b === land.id && a !== NONE) nbs.add(a);
    if (c === land.id && d !== NONE) nbs.add(d); if (d === land.id && c !== NONE) nbs.add(c);
  }
  for (const c of chambers) {
    const hull = c.x0 === 50 || c.x1 === 205 || c.y0 === 34 || c.y1 === 109;
    const [mn, mx] = c === land ? [0, 0] : nbs.has(c.id) ? [1, 4] : hull ? [2, 6] : [0, 3];
    const n = c.breaches.length;
    check(n >= mn && n <= mx && (!hull || c === land || n >= 2), `seed ${seed}: chamber ${c.id} (${hull ? 'hull' : 'inner'}${nbs.has(c.id) ? ', landing neighbour' : ''}) has ${n} breaches`);
    for (const i of c.breaches) {
      listed.add(i);
      check(t[i] === T.BREACH && ch[i] === NONE && n4(i).some((j) => ch[j] === c.id), `seed ${seed}: breach ${xy(i)} sits on chamber ${c.id}'s wall`);
    }
  }
  for (let i = 0; i < W * H; i++) if (t[i] === T.BREACH) {
    check(listed.has(i), `seed ${seed}: breach ${xy(i)} listed`);
    for (const j of n4(i)) if (ch[j] !== NONE) check(chambers[ch[j]].breaches.includes(i), `seed ${seed}: breach ${xy(i)} listed in chamber ${ch[j]}`);
  }

  // Every chamber reachable from the landing chamber through gates (floor + gate tiles only).
  const seen = new Uint8Array(W * H), reached = new Set(), q = [];
  for (let i = 0; i < W * H; i++) if (ch[i] === land.id) { seen[i] = 1; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    if (ch[q[h]] !== NONE) reached.add(ch[q[h]]);
    for (const j of n4(q[h])) if (!seen[j] && (ch[j] !== NONE || t[j] === T.GATE)) { seen[j] = 1; q.push(j); }
  }
  check(reached.size === chambers.length, `seed ${seed}: ${reached.size}/${chambers.length} chambers reachable through gates`);
  // Gates sit between two different chambers.
  for (let i = 0; i < W * H; i++) if (t[i] === T.GATE) {
    const ok = (ch[i - 1] !== NONE && ch[i + 1] !== NONE && ch[i - 1] !== ch[i + 1]) || (ch[i - W] !== NONE && ch[i + W] !== NONE && ch[i - W] !== ch[i + W]);
    check(ok, `seed ${seed}: gate ${xy(i)} joins two chambers`);
  }

  // The river: one 4-connected body from the west hull to the east hull, 2–3 tiles wide, crossing
  // walls only beside a gate.
  const river = []; for (let i = 0; i < W * H; i++) if (t[i] === T.RIVER) river.push(i);
  const rs = new Uint8Array(W * H), body = cluster(t, river[0], T.RIVER, () => true, rs);
  const xs = river.map((i) => i % W);
  check(body.length === river.length && Math.min(...xs) === 50 && Math.max(...xs) === 205, `seed ${seed}: river is one body across Eden`);
  let wide = true;
  for (let x = 50; x <= 205; x++) { let n = 0; for (let y = 34; y <= 109; y++) if (t[y * W + x] === T.RIVER) n++; wide &&= n >= 2; }
  check(wide, `seed ${seed}: river at least 2 tiles in every column`);
  const gateNear = (i) => { const [x, y] = xy(i); for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (t[(y + dy) * W + x + dx] === T.GATE) return true; return false; };
  for (const i of river) if (ch[i] === NONE) check(gateNear(i), `seed ${seed}: river crossing ${xy(i)} beside a gate`);
  const riverCh = new Set(river.map((i) => ch[i]).filter((c) => c !== NONE));
  check(chambers.every((c) => (c.kind === 'river') === (riverCh.has(c.id) && c !== land)), `seed ${seed}: river chambers are the ones the river crosses`);
  check(river.some((i) => ch[i] !== NONE && n4(i).some((j) => t[j] === T.FERTILE)), `seed ${seed}: fertile soil along the river`);

  // Landing chamber: deck, plain, the river, the Command Centre spot and room to build.
  const lt = []; for (let i = 0; i < W * H; i++) if (ch[i] === land.id) lt.push(i);
  check(lt.some((i) => t[i] === T.DECK) && lt.some((i) => t[i] === T.PLAIN), `seed ${seed}: landing has deck and plain soil`);
  check(lt.every((i) => [T.DECK, T.PLAIN, T.FERTILE, T.RIVER].includes(t[i])), `seed ${seed}: landing is deck/plain/fertile/river only`);
  check(lt.some((i) => t[i] === T.RIVER || n4(i).some((j) => t[j] === T.RIVER)), `seed ${seed}: landing borders the river`);
  const { command: cc, dock } = start;
  let cmdOk = true;
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) { const i = (cc.y + dy) * W + cc.x + dx; cmdOk &&= ch[i] === land.id && BUILD_FLOOR.has(t[i]); }
  check(cmdOk, `seed ${seed}: command spot ${cc.x},${cc.y} is 3×3 buildable landing floor`);
  check(lt.filter((i) => BUILD_FLOOR.has(t[i])).length - 9 >= 60, `seed ${seed}: 60+ buildable landing tiles besides the command spot`);

  // Dock: 2×2 hull on the bottom wall, under the landing chamber's floor, open to space below.
  let dockOk = dock.y === EDEN.y1 - 1;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) dockOk &&= t[(dock.y + dy) * W + dock.x + dx] === T.HULL;
  for (let dx = 0; dx < 2; dx++) dockOk &&= ch[(dock.y - 1) * W + dock.x + dx] === land.id && TERRAIN[t[(dock.y + 2) * W + dock.x + dx]].zone === 'space';
  check(dockOk, `seed ${seed}: dock ${dock.x},${dock.y} on the bottom hull at the landing chamber`);

  // Within the dock's reach: an asteroid cluster of 12+ with 2+ seams, room for two 2×2 collectors.
  const cx = dock.x + 1, cy = dock.y + 1;
  const reach = (i) => { const [x, y] = xy(i); return Math.max(Math.abs(x + 0.5 - cx), Math.abs(y + 0.5 - cy)) <= REACH; };
  const sn = new Uint8Array(W * H);
  let bestAst = 0, bestSeams = 0;
  for (let i = 0; i < W * H; i++) if (!sn[i] && t[i] === T.ASTEROID && reach(i)) {
    const cl = cluster(t, i, T.ASTEROID, reach, sn), seams = cl.filter((j) => r[j] === R.ORE_SEAM).length;
    if (cl.length >= 12 && seams >= 2) { bestAst = Math.max(bestAst, cl.length); bestSeams = Math.max(bestSeams, seams); }
  }
  check(bestAst >= 12, `seed ${seed}: asteroid cluster with 12+ tiles and 2+ seams within ${REACH} of the dock`);
  const used = new Uint8Array(W * H); let feet = 0;
  for (let i = 0; i < W * (H - 1); i++) {
    const cells = [i, i + 1, i + W, i + W + 1];
    if (i % W < W - 1 && cells.every((j) => t[j] === T.MAGNETIC && reach(j) && !used[j])) { cells.forEach((j) => { used[j] = 1; }); feet++; }
  }
  check(feet >= 2, `seed ${seed}: ${feet} non-overlapping 2×2 magnetic footprints within reach (need 2)`);
  return { bestAst, bestSeams, feet };
}

function stats(g) {
  const { t } = g.map;
  let near = 0, nearVoid = 0, far = 0, farVoid = 0, space = 0, spaceVoid = 0;
  const count = {};
  for (let i = 0; i < W * H; i++) {
    const v = t[i]; count[v] = (count[v] || 0) + 1;
    if (TERRAIN[v].zone !== 'space') continue;
    const [x, y] = xy(i), d = Math.max(EDEN.x0 - x, x - EDEN.x1, EDEN.y0 - y, y - EDEN.y1, 0);
    space++; if (v === T.VOID) spaceVoid++;
    if (d <= 12) { near++; if (v === T.VOID) nearVoid++; }
    if (d >= 28) { far++; if (v === T.VOID) farVoid++; }
  }
  return { void: spaceVoid / space, nearVoid: nearVoid / near, farVoid: farVoid / far, count };
}

const SYM = { [T.VOID]: '.', [T.ASTEROID]: 'a', [T.MAGNETIC]: 'm', [T.METEOROID]: ':', [T.COMET]: 't', [T.PLASMA]: 'p',
  [T.GRAVITY]: 'g', [T.ATMOSPHERE]: '~', [T.EARTH]: '_', [T.HULL]: '#', [T.BULKHEAD]: '|', [T.GATE]: '+', [T.DECK]: 'd',
  [T.PLAIN]: ',', [T.FERTILE]: 'F', [T.POOR]: 'o', [T.RIVER]: 'w', [T.RUBBLE]: 'r', [T.BREACH]: 'X', [T.LAKE]: 'w',
  [T.FOREST]: 'f', [T.HILLS]: 'h', [T.ROCK]: 'k', [T.MARSH]: 'z' };
// 2:1 preview: thin features (walls, gates, breaches, the river) win their 2×2 cell, else the majority.
const PRIORITY = 'XDC+#|w';
function preview(g) {
  const { t } = g.map, { dock, command } = g.start;
  const at = (x, y) => {
    if (x >= dock.x && x < dock.x + 2 && y >= dock.y && y < dock.y + 2) return 'D';
    if (x >= command.x && x < command.x + 3 && y >= command.y && y < command.y + 3) return 'C';
    return SYM[t[y * W + x]] || '?';
  };
  const lines = [];
  for (let y = 0; y < H; y += 2) {
    let s = '';
    for (let x = 0; x < W; x += 2) {
      const cell = [at(x, y), at(x + 1, y), at(x, y + 1), at(x + 1, y + 1)];
      const pri = [...PRIORITY].find((c) => cell.includes(c));
      if (pri) { s += pri; continue; }
      const n = {}; for (const c of cell) n[c] = (n[c] || 0) + 1;
      s += cell.reduce((a, c) => (n[c] > n[a] ? c : a), cell[0]);
    }
    lines.push(s);
  }
  return lines.join('\n');
}

const rows = [], times = [];
for (let seed = +(process.env.SEED_FROM || 1); seed <= +(process.env.SEED_TO || 20); seed++) {
  const t0 = performance.now();
  const g = generateMap(seed);
  const ms = performance.now() - t0;
  times.push(ms);
  const again = generateMap(seed);
  check(['t', 'r', 'ch', 'sv'].every((k) => Buffer.compare(Buffer.from(g.map[k]), Buffer.from(again.map[k])) === 0)
    && JSON.stringify(g.chambers) === JSON.stringify(again.chambers) && JSON.stringify(g.start) === JSON.stringify(again.start), `seed ${seed}: deterministic`);
  const v = verify(seed, g), s = stats(g);
  const breaches = g.chambers.reduce((n, c) => n + c.breaches.length, 0);
  const kinds = {}; for (const c of g.chambers) kinds[c.kind] = (kinds[c.kind] || 0) + 1;
  rows.push(`seed ${String(seed).padStart(2)}: ${g.chambers.length} chambers (${KINDS.map((k) => `${k} ${kinds[k] || 0}`).join(', ')}), `
    + `${breaches} breaches, void ${(s.void * 100).toFixed(0)}% (near Eden ${(s.nearVoid * 100).toFixed(0)}%, edges ${(s.farVoid * 100).toFixed(0)}%), `
    + `dock asteroids ${v.bestAst}/${v.bestSeams} seams, ${v.feet} collector spots, ${ms.toFixed(0)} ms`);
}
check(generateMap(1).map.t.some((v, i) => v !== generateMap(2).map.t[i]), 'different seeds give different maps');
// Wall-clock time is noisy on a shared machine and the first call pays the JIT warm-up: judge the median.
const median = times.slice().sort((a, b) => a - b)[times.length >> 1];
check(median < 200, `generation median ${median.toFixed(0)} ms (< 200 ms)`);
console.log(rows.join('\n'));
console.log(`generation: median ${median.toFixed(0)} ms, first call ${times[0].toFixed(0)} ms, slowest ${Math.max(...times).toFixed(0)} ms`);
const ps = +(process.env.PREVIEW_SEED || 1), g1 = generateMap(ps);
console.log(`\nseed ${ps}, 2:1 (D dock, C Command Centre). Chambers: ${g1.chambers.map((c) => `${c.id} ${c.name} (${c.kind})`).join('; ')}\n`);
console.log(preview(g1));
console.log(failures ? `\n${failures} check(s) FAILED` : '\nall colony map checks passed');
process.exit(failures ? 1 : 0);
