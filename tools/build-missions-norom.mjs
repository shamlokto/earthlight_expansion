// Builds expansion missions (missions/*.json) from their text layouts in tools/missions/*.mjs
// WITHOUT the ROM, for machines that don't have it:
//
//   node tools/build-missions-norom.mjs [--dir remnant] [--preview out/] [--check] name ...
//
// tools/build-missions.mjs learns which terrain graphic to draw for each cell from the ROM's 30
// maps. This one learns the same thing from the missions already built (every missions/*.json and
// missions/remnant/*.json: their graphic pairs, grids and the terrain classes of
// js/expansion/data/terrain.json): for each cell, its class and its six neighbours' classes pick
// the graphic those maps use most in that spot (or, failing an exact match, for the same pattern
// of like and unlike neighbours, or for the class alone). Asteroid graphics are mixed freely, and
// open space draws from the starfield graphics, as the ROM builder does.
//
// Stamps copy cells from a built mission instead of a ROM map:
//   { mission: 'remnant/babylon', from: [x0, y0], to: [x1, y1], at: [x, y], classes?: [cls...] }
// (`classes`: copy only cells of those terrain classes, e.g. a hull without the space around it)
// (same column parity rule as the ROM builder's stamps: the hexes stagger by column). A ROM-map
// stamp ({ map }) can't be built here and is an error.
//
// --check rebuilds the named missions (which must exist) and reports how many cells come out with
// the same class (must be all) and the same graphic as the ROM-built file, leaving it unchanged.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const { hexRing } = await imp('js/game/rules.js');
const { blankMission, MAX_PAIRS, SCREEN_COLS, SCREEN_ROWS } = await imp('js/expansion/mission.js');
const { loadExpansionData } = await imp('js/expansion/data.js');
const { ExpansionBattle } = await imp('js/expansion/battle.js');
const { types, tables, terrain } = await loadExpansionData();

const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const flag = (k) => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true; };
const subDir = opt('--dir') || '', previewDir = opt('--preview'), check = flag('--check');

export const TERRAIN = { '.': 0, m: 1, ':': 2, a: 3, p: 4, g: 5, '~': 6, '#': 7, d: 8, '=': 9, W: 10, t: 11, _: 12, H: 13 };
const clsOfId = (id) => terrain.types[terrain.ids[id]].cls;

// ------------------------------------------------------------------ the built missions
const builtFiles = [...readdirSync(join(root, 'missions')).filter((f) => f.endsWith('.json') && !f.startsWith('index')).map((f) => f),
  ...readdirSync(join(root, 'missions/remnant')).filter((f) => f.endsWith('.json') && !f.startsWith('index')).map((f) => `remnant/${f}`)];
const built = new Map(builtFiles.map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(root, 'missions', f), 'utf8'))]));
const cellOf = (m, x, y) => m.pairs[m.grid[y][x]];   // [graphic, terrain id]

// ------------------------------------------------------------------ learn from them
const PLAIN = new Set([0, 1, 2, 3]);
function learn(skip) {
  const byClasses = new Map(), bySame = new Map(), byClass = new Map(), plain = new Map();
  const bump = (map, k, pair) => { const m = map.get(k) || map.set(k, new Map()).get(k); m.set(pair, (m.get(pair) || 0) + 1); };
  for (const [name, m] of built) {
    if (name === skip) continue;
    const cols = m.screensW * SCREEN_COLS, rows = m.screensH * SCREEN_ROWS;
    const C = (x, y) => (x < 0 || y < 0 || x > cols + 1 || y > rows + 1 ? -1 : clsOfId(cellOf(m, x, y)[1]));
    for (let y = 0; y <= rows + 1; y++) for (let x = 0; x <= cols + 1; x++) {
      const [g, id] = cellOf(m, x, y), cls = clsOfId(id), k = `${g}:${id}`;
      const pair = cls === 0 && PLAIN.has(g) ? 'plain' : k;
      if (pair === 'plain' && y >= 1 && y <= rows && x >= 1 && x < cols) plain.set(k, (plain.get(k) || 0) + 1);
      const nb = hexRing(x, y).map(([a, b]) => C(a, b)).map((n) => (n < 0 ? cls : n));
      bump(byClasses, `${cls}|${nb.join(',')}`, pair);
      bump(bySame, `${cls}|${nb.map((n) => +(n === cls)).join('')}`, pair);
      bump(byClass, `${cls}`, pair);
    }
  }
  return { byClasses, bySame, byClass, plain };
}

function rng(seed) { let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261); return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const pick = (dist, r, argmax) => {
  const e = [...dist.entries()];
  if (argmax) return e.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  let t = r() * e.reduce((s, [, n]) => s + n, 0);
  for (const [k, n] of e) if ((t -= n) < 0) return k;
  return e[0][0];
};
const VARIED = new Set([3]);   // asteroids: mixed freely

// ------------------------------------------------------------------ build one mission
export function build(spec, L) {
  const sw = spec.screens[0], sh = spec.screens[1], cols = sw * SCREEN_COLS, rows = sh * SCREEN_ROWS, r = rng(spec.name);
  const choose = (cls, nb) => {
    const d = L.byClasses.get(`${cls}|${nb.join(',')}`) || L.bySame.get(`${cls}|${nb.map((n) => +(n === cls)).join('')}`) || L.byClass.get(`${cls}`);
    if (!d) throw new Error(`no built graphic for terrain class ${cls}`);
    let p = pick(d, r, !VARIED.has(cls));
    if (p === 'plain') p = pick(L.plain, r, false);
    return p.split(':').map(Number);
  };
  const rowsTxt = spec.terrain.replace(/^\n|\n\s*$/g, '').split('\n');
  if (rowsTxt.length !== rows) throw new Error(`${spec.name}: terrain has ${rowsTxt.length} rows, the map has ${rows}`);
  const cls = Array.from({ length: rows + 2 }, () => new Array(cols + 2).fill(0));
  rowsTxt.forEach((line, j) => {
    if (line.length !== cols - 1) throw new Error(`${spec.name}: terrain row ${j + 1} has ${line.length} hexes, needs ${cols - 1}`);
    [...line].forEach((ch, i) => { if (!(ch in TERRAIN)) throw new Error(`${spec.name}: unknown terrain '${ch}' at (${i + 1},${j + 1})`); cls[j + 1][i + 1] = TERRAIN[ch]; });
  });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  for (let y = 0; y <= rows + 1; y++) for (let x = 0; x <= cols + 1; x++) if (x < 1 || x > cols - 1 || y < 1 || y > rows) cls[y][x] = cls[clamp(y, 1, rows)][clamp(x, 1, cols - 1)];
  const C = (x, y) => (y < 0 || y > rows + 1 || x < 0 || x > cols + 1 ? null : cls[y][x]);
  const pairs = Array.from({ length: rows + 2 }, (_, y) => Array.from({ length: cols + 2 }, (_, x) => choose(cls[y][x], hexRing(x, y).map(([a, b]) => C(a, b) ?? cls[y][x]))));

  for (const st of spec.stamps || []) {
    if (!st.mission) throw new Error(`${spec.name}: ROM-map stamps (map ${st.map}) need the ROM builder; stamp from a built mission instead`);
    const src = built.get(st.mission);
    if (!src) throw new Error(`${spec.name}: no built mission ${st.mission}`);
    if ((st.at[0] & 1) !== (st.from[0] & 1)) throw new Error(`${spec.name}: stamp at column ${st.at[0]} must have the same column parity as its source column ${st.from[0]}`);
    for (let y = st.from[1]; y <= st.to[1]; y++) for (let x = st.from[0]; x <= st.to[0]; x++) {
      const tx = st.at[0] + x - st.from[0], ty = st.at[1] + y - st.from[1];
      if (tx < 1 || ty < 1 || tx > cols - 1 || ty > rows) continue;
      const p = cellOf(src, x, y);
      if (st.classes && !st.classes.includes(clsOfId(p[1]))) continue;   // only these classes (e.g. the hull, not the space around it)
      pairs[ty][tx] = [p[0], p[1]]; cls[ty][tx] = clsOfId(p[1]);
    }
  }

  // pair list (max 80): rare graphics fold into their class's commonest
  const count = new Map();
  for (const row of pairs) for (const p of row) { const k = p.join(':'); count.set(k, (count.get(k) || 0) + 1); }
  let list = [...count.keys()];
  if (list.length > MAX_PAIRS) {
    const clsOf = (k) => clsOfId(+k.split(':')[1]);
    const best = new Map();
    for (const k of list) { const c = clsOf(k); if (!best.has(c) || count.get(k) > count.get(best.get(c))) best.set(c, k); }
    const keep = new Set([...list].sort((a, b) => count.get(b) - count.get(a)).slice(0, MAX_PAIRS));
    for (const b of best.values()) keep.add(b);
    while (keep.size > MAX_PAIRS) { const rare = [...keep].filter((k) => ![...best.values()].includes(k)).sort((a, b) => count.get(a) - count.get(b))[0]; keep.delete(rare); }
    for (const row of pairs) for (let i = 0; i < row.length; i++) { const k = row[i].join(':'); if (!keep.has(k)) row[i] = best.get(clsOf(k)).split(':').map(Number); }
    list = [...keep];
  }
  list.sort((a, b) => (a.startsWith('0:') ? -1 : b.startsWith('0:') ? 1 : 0));
  const index = new Map(list.map((k, i) => [k, i]));
  const m = blankMission(sw, sh, [0, 0]);
  m.pairs = list.map((k) => k.split(':').map(Number));
  m.grid = pairs.map((row) => row.map((p) => index.get(p.join(':'))));

  // units, as tools/build-missions.mjs places them
  const units = [];
  if (spec.units) spec.units.replace(/^\n|\n\s*$/g, '').split('\n').forEach((line, j) => [...line].forEach((ch, i) => {
    if (ch === ' ' || ch === '.') return;
    const Lg = spec.legend[ch];
    if (!Lg) throw new Error(`${spec.name}: no legend entry for unit '${ch}' at (${i + 1},${j + 1})`);
    units.push({ ...Lg, x: i + 1, y: j + 1 });
  }));
  for (const [k, cargo] of Object.entries(spec.cargo || {})) {
    const [x, y] = k.split(',').map(Number), host = units.find((u) => u.x === x && u.y === y);
    if (!host) throw new Error(`${spec.name}: cargo for (${x},${y}) but no unit there`);
    host.cargo = cargo;
  }
  const out = units.map((u) => {
    const o = { type: u.type, army: u.neutral ? 0 : u.army, x: u.x, y: u.y };
    if (u.neutral) o.neutral = true;
    if (u.joiner) o.joiner = true;
    if (u.level !== undefined) o.level = u.level;
    if (u.hold) o.hold = u.hold;
    if (u.cargo) o.cargo = u.cargo;
    return o;
  });
  const g = units.find((u) => u.general);
  Object.assign(m, {
    name: spec.name, title: spec.title, units: out, arrivals: spec.arrivals || [], objective: spec.objective,
    general: g ? { x: g.x, y: g.y } : null, turnLimit: spec.turnLimit || 0, cap: spec.cap || 0, music: spec.music ?? 0,
    briefing: spec.briefing.trim(), ...(spec.goal ? { goal: spec.goal } : {}), ...(spec.routes ? { routes: spec.routes } : {}), ...(spec.guards ? { guards: spec.guards } : {}), ...(spec.chaseGeneral ? { chaseGeneral: true } : {}), ...(spec.ending ? { ending: spec.ending.trim() } : {}),
    ...(spec.chapter ? { chapter: spec.chapter } : {}), ...(spec.transmission ? { transmission: spec.transmission.trim() } : {}),
    ...(spec.strategy ? { strategy: spec.strategy } : {}), ...(spec.plan ? { plan: spec.plan } : {}),
    ...(spec.comms ? { comms: spec.comms.map((c) => ({ speaker: c.speaker, text: c.text.trim() })) } : {}),
    ...(spec.endings ? { endings: Object.fromEntries(Object.entries(spec.endings).map(([k, v]) => [k, v.trim()])) } : {}),
    ...(spec.cannons ? { cannons: spec.cannons } : {}), ...(spec.secret ? { secret: spec.secret } : {}),
  });

  // placement: every unit and arrival on a hex its kind can enter (the engine's own tables)
  const noRom = new Proxy({}, { get: (_, k) => () => { throw new Error(`ROM read ${String(k)}`); } });
  const b = new ExpansionBattle(noRom, { ...m, units: [], arrivals: [], cannons: undefined }, types, { tables });
  const ok = (t, x, y) => x >= 1 && y >= 1 && x <= cols - 1 && y <= rows && tables.moveCost(types[t].category, b.cls(x, y)) !== 0;
  const problems = [];
  for (const u of out) if (!ok(u.type, u.x, u.y)) problems.push(`${types[u.type].code} (type ${u.type}) can't stand at (${u.x},${u.y}) (class ${b.cls(u.x, u.y)})`);
  for (const a of m.arrivals) for (const u of a.units) if (!ok(u.type, u.x, u.y)) problems.push(`arrival turn ${a.turn}: ${types[u.type].code} can't stand at (${u.x},${u.y})`);
  for (const c of spec.cannons || []) if (!out.some((u) => u.x === c.tower[0] && u.y === c.tower[1])) problems.push(`cannon at column ${c.x}: no tower unit at (${c.tower})`);
  if (problems.length) throw new Error(`${spec.name}:\n  ${problems.join('\n  ')}`);
  return m;
}

// ------------------------------------------------------------------ preview: terrain classes (cannon lanes tinted red) and units; the player pink, the Union green, a flagship yellow
const CLS_RGB = [[8, 10, 30], [60, 60, 170], [120, 100, 70], [150, 120, 90], [150, 60, 150], [40, 120, 120], [70, 140, 200], [110, 80, 60], [90, 90, 100], [140, 140, 60], [200, 200, 210], [230, 200, 120], [40, 40, 40], [170, 150, 190]];
async function preview(m, file) {
  const { writePng } = await imp('tools/png.mjs');
  const cols = m.screensW * SCREEN_COLS, rows = m.screensH * SCREEN_ROWS, Z = 14, W = (cols + 1) * Z, H = (rows + 2) * Z + Z / 2;
  const d = new Uint8Array(W * H * 4);
  const put = (px, py, c) => { if (px >= 0 && py >= 0 && px < W && py < H) d.set([c[0], c[1], c[2], 255], (py * W + px) * 4); };
  for (let y = 1; y <= rows; y++) for (let x = 1; x < cols; x++) {
    let c = CLS_RGB[clsOfId(cellOf(m, x, y)[1])] || [255, 0, 255];
    const oy = (x & 1) ? Z / 2 : 0;
    if ((m.cannons || []).some((cn) => cn.x === x && y >= cn.y)) c = [Math.min(255, c[0] + 110), c[1] * 0.6, c[2] * 0.6];   // cannon lanes
    for (let j = 0; j < Z - 1; j++) for (let i = 0; i < Z - 1; i++) put(x * Z + i, y * Z + oy + j, c);
  }
  for (const u of m.units) {
    const oy = (u.x & 1) ? Z / 2 : 0, c = u.army === 0 ? [255, 90, 200] : u.type === 77 ? [255, 255, 0] : [90, 255, 110];
    for (let j = 2; j < Z - 3; j++) for (let i = 2; i < Z - 3; i++) put(u.x * Z + i, u.y * Z + oy + j, c);
  }
  writePng(file, W, H, d);
}

// ------------------------------------------------------------------ main
const dir = join(root, 'tools/missions', subDir), outDir = join(root, 'missions', subDir);
mkdirSync(outDir, { recursive: true });
if (previewDir) mkdirSync(previewDir, { recursive: true });
for (const name of args) {
  const spec = (await import(pathToFileURL(join(dir, `${name}.mjs`)).href)).default;
  const key = `${subDir ? `${subDir}/` : ''}${spec.file ? basename(spec.file) : name}`;
  const L = learn(check ? key : null);
  const mission = build(spec, L);
  if (check) {
    const old = built.get(key);
    if (!old) throw new Error(`--check: no built ${key}`);
    const cols = old.screensW * SCREEN_COLS, rows = old.screensH * SCREEN_ROWS;
    let n = 0, sameCls = 0, same = 0, nv = 0, sameNv = 0;   // nv: hexes not open space (whose starfield graphic is random)
    for (let y = 1; y <= rows; y++) for (let x = 1; x < cols; x++) {
      const a = cellOf(old, x, y), b = cellOf(mission, x, y), eq = a[0] === b[0] && a[1] === b[1]; n++;
      if (clsOfId(a[1]) === clsOfId(b[1])) sameCls++;
      if (eq) same++;
      if (clsOfId(a[1]) !== 0) { nv++; if (eq) sameNv++; }
    }
    console.log(`${key}: ${n} hexes, same class ${sameCls} (${((100 * sameCls) / n).toFixed(1)}%), same graphic ${same} (${((100 * same) / n).toFixed(1)}%); not open space: ${sameNv}/${nv} (${((100 * sameNv) / Math.max(1, nv)).toFixed(1)}%)`);
    continue;
  }
  const out = join(outDir, `${spec.file ? basename(spec.file) : name}.json`);
  writeFileSync(out, JSON.stringify(mission));
  const counts = [0, 1].map((a) => mission.units.filter((u) => u.army === a && !u.neutral).length);
  console.log(`${name}: ${spec.screens.join('x')} screens, ${mission.pairs.length} graphics, units ${counts[0]} vs ${counts[1]}, ${mission.arrivals.length} arrival events${mission.cannons ? `, ${mission.cannons.length} cannons` : ''}`);
  if (previewDir) await preview(mission, join(previewDir, `${basename(name)}.png`));
}
