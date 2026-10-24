// Builds the expansion's mission files (missions/*.json) from text layouts in
// tools/missions/*.mjs, using only the ROM's own terrain graphics:
//
//   node tools/build-missions.mjs --rom "Earth Light (Japan).zip" [--preview out/] [name ...]
//
// A layout gives one character per hex (row 1 first, column 1 first). Each character is a
// terrain class; the graphic for each cell is picked the way the 30 ROM maps pick theirs: from
// the classes of its six neighbours (learned from the ROM at build time), so asteroid fields,
// bedrock and atmosphere edges look like the original's. Fortresses and other built structures
// are copied from ROM maps as stamps, as the map editor's Stamp tool does. Units are a second
// layer of characters with a per-mission legend. Placement is checked against movement costs.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const { Rom } = await imp('js/rom.js');
const { readRomFile } = await imp('js/romfile.js');
const { MAP_COUNT, mapInfo, battlePalette, renderMap, unitIcon, cellOrigin } = await imp('js/maps.js');
const { terrainOf, moveCost } = await imp('js/terrain.js');
const { allUnitTypes } = await imp('js/units.js');
const { hexRing, distance } = await imp('js/game/rules.js');
const { blankMission, romView, MAX_PAIRS, SCREEN_COLS, SCREEN_ROWS } = await imp('js/expansion/mission.js');

const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const romPath = opt('--rom') || process.env.EARTHLIGHT_ROM, previewDir = opt('--preview');
// --dir remnant: specs from tools/missions/remnant, written to missions/remnant (the new campaign)
const subDir = opt('--dir') || '';
if (!romPath) { console.error('usage: node tools/build-missions.mjs --rom ROM [--dir SUBDIR] [--preview DIR] [name ...]'); process.exit(1); }
const romFile = readFileSync(romPath);
const rom = new Rom(await readRomFile({ arrayBuffer: async () => romFile.buffer.slice(romFile.byteOffset, romFile.byteOffset + romFile.length) }));
if (!rom.isEarthLight()) throw new Error('not Earth Light (Japan)');
const types = allUnitTypes(rom);

// ------------------------------------------------------------------ terrain characters
export const TERRAIN = { '.': 0, m: 1, ':': 2, a: 3, p: 4, g: 5, '~': 6, '#': 7, d: 8, '=': 9, W: 10, t: 11, _: 12, H: 13 };

// ------------------------------------------------------------------ learn from the ROM maps
// For every ROM cell: its class, its graphic pair and its neighbours' classes (SW NW N NE SE S).
const PLAIN = new Set([0, 1, 2, 3]);   // the four starfield graphics of open space
const byClasses = new Map(), bySame = new Map(), byClass = new Map(), romMaps = [];
const bump = (map, k, pair) => { const m = map.get(k) || map.set(k, new Map()).get(k); m.set(pair, (m.get(pair) || 0) + 1); };
for (let m = 0; m < MAP_COUNT; m++) {
  const info = mapInfo(rom, m), hd = rom.body(info.headerId), g = rom.body(info.gridId);
  romMaps.push({ info, hd, g });
  const C = (x, y) => (x < 0 || y < 0 || x > info.cols + 1 || y > info.rows + 1 ? -1 : terrainOf(rom, hd, g[y * 62 + x]).cls);
  for (let y = 0; y <= info.rows + 1; y++) for (let x = 0; x <= info.cols + 1; x++) {
    const v = g[y * 62 + x], cls = terrainOf(rom, hd, v).cls;
    const pair = cls === 0 && PLAIN.has(hd[v]) ? 'plain' : `${hd[v]}:${terrainOf(rom, hd, v).id}`;
    const nb = hexRing(x, y).map(([a, b]) => C(a, b)).map((n) => (n < 0 ? cls : n));
    bump(byClasses, `${cls}|${nb.join(',')}`, pair);
    bump(bySame, `${cls}|${nb.map((n) => +(n === cls)).join('')}`, pair);
    bump(byClass, `${cls}`, pair);
  }
}
const plainPairs = [...romMaps.reduce((acc, { hd, g, info }) => {
  for (let y = 1; y <= info.rows; y++) for (let x = 1; x < info.cols; x++) { const v = g[y * 62 + x]; if (PLAIN.has(hd[v]) && terrainOf(rom, hd, v).cls === 0) { const k = `${hd[v]}:${terrainOf(rom, hd, v).id}`; acc.set(k, (acc.get(k) || 0) + 1); } }
  return acc;
}, new Map())];

// Small seeded RNG so a mission always builds the same way.
function rng(seed) { let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261); return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const pick = (dist, r, argmax) => {
  const e = [...dist.entries()];
  if (argmax) return e.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  let t = r() * e.reduce((s, [, n]) => s + n, 0);
  for (const [k, n] of e) if ((t -= n) < 0) return k;
  return e[0][0];
};
const VARIED = new Set([3]);   // asteroids: the ROM mixes its rock graphics freely

function chooseGraphic(cls, nb, r) {
  const d = byClasses.get(`${cls}|${nb.join(',')}`) || bySame.get(`${cls}|${nb.map((n) => +(n === cls)).join('')}`) || byClass.get(`${cls}`);
  if (!d) throw new Error(`no ROM graphic for terrain class ${cls}`);
  let p = pick(d, r, !VARIED.has(cls));
  if (p === 'plain') p = pick(new Map(plainPairs), r, false);
  return p.split(':').map(Number);
}

// ------------------------------------------------------------------ build one mission
function build(spec) {
  const sw = spec.screens[0], sh = spec.screens[1], cols = sw * SCREEN_COLS, rows = sh * SCREEN_ROWS, r = rng(spec.name);
  const rowsTxt = spec.terrain.replace(/^\n|\n\s*$/g, '').split('\n');
  if (rowsTxt.length !== rows) throw new Error(`${spec.name}: terrain has ${rowsTxt.length} rows, the map has ${rows}`);
  // class per cell, frame included (0..cols+1 x 0..rows+1); the frame repeats the nearest playable cell
  const cls = Array.from({ length: rows + 2 }, () => new Array(cols + 2).fill(0));
  rowsTxt.forEach((line, j) => {
    if (line.length !== cols - 1) throw new Error(`${spec.name}: terrain row ${j + 1} has ${line.length} hexes, needs ${cols - 1}`);
    [...line].forEach((ch, i) => { if (!(ch in TERRAIN)) throw new Error(`${spec.name}: unknown terrain '${ch}' at (${i + 1},${j + 1})`); cls[j + 1][i + 1] = TERRAIN[ch]; });
  });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  for (let y = 0; y <= rows + 1; y++) for (let x = 0; x <= cols + 1; x++) if (x < 1 || x > cols - 1 || y < 1 || y > rows) cls[y][x] = cls[clamp(y, 1, rows)][clamp(x, 1, cols - 1)];
  const C = (x, y) => (y < 0 || y > rows + 1 || x < 0 || x > cols + 1 ? null : cls[y][x]);
  const pairs = Array.from({ length: rows + 2 }, (_, y) => Array.from({ length: cols + 2 }, (_, x) => chooseGraphic(cls[y][x], hexRing(x, y).map(([a, b]) => C(a, b) ?? cls[y][x]), r)));

  // stamps: { map (1-based ROM map number), from: [x0, y0], to: [x1, y1], at: [x, y] } copy ROM cells
  for (const st of spec.stamps || []) {
    const rm = romMaps[st.map - 1];
    let ax = st.at[0];
    if ((ax & 1) !== (st.from[0] & 1)) throw new Error(`${spec.name}: stamp at column ${ax} must have the same column parity as its source column ${st.from[0]} (hex stagger)`);
    for (let y = st.from[1]; y <= st.to[1]; y++) for (let x = st.from[0]; x <= st.to[0]; x++) {
      const tx = ax + x - st.from[0], ty = st.at[1] + y - st.from[1];
      if (tx < 1 || ty < 1 || tx > cols - 1 || ty > rows) continue;
      const v = rm.g[y * 62 + x], t = terrainOf(rom, rm.hd, v);
      pairs[ty][tx] = [rm.hd[v], t.id]; cls[ty][tx] = t.cls;
    }
  }

  // pair list (max 80 per map, as in the ROM's header): rare graphics fold into their class's commonest
  const count = new Map();
  for (const row of pairs) for (const p of row) { const k = p.join(':'); count.set(k, (count.get(k) || 0) + 1); }
  let list = [...count.keys()];
  if (list.length > MAX_PAIRS) {
    const clsOf = (k) => { const [g, id] = k.split(':').map(Number); return terrainOf(rom, (() => { const h = new Uint8Array(160); h[0] = g; h[80] = id; return h; })(), 0).cls; };
    const best = new Map();
    for (const k of list) { const c = clsOf(k); if (!best.has(c) || count.get(k) > count.get(best.get(c))) best.set(c, k); }
    const keep = new Set([...list].sort((a, b) => count.get(b) - count.get(a)).slice(0, MAX_PAIRS));
    for (const b of best.values()) keep.add(b);
    while (keep.size > MAX_PAIRS) { const rare = [...keep].filter((k) => ![...best.values()].includes(k)).sort((a, b) => count.get(a) - count.get(b))[0]; keep.delete(rare); }
    for (const row of pairs) for (let i = 0; i < row.length; i++) { const k = row[i].join(':'); if (!keep.has(k)) row[i] = best.get(clsOf(k)).split(':').map(Number); }
    list = [...keep];
  }
  // void first: value 0 is the editor's fill
  list.sort((a, b) => (a.startsWith('0:') ? -1 : b.startsWith('0:') ? 1 : 0));
  const index = new Map(list.map((k, i) => [k, i]));
  const m = blankMission(sw, sh, [0, 0]);
  m.pairs = list.map((k) => k.split(':').map(Number));
  m.grid = pairs.map((row) => row.map((p) => index.get(p.join(':'))));

  // units: a layer of characters, one per hex, with spec.legend { ch: { type, army, cargo?, general?, joiner?, neutral? } };
  // spec.cargo { 'x,y': [type, ...] } loads the unit at that hex (a dock or carrier)
  const units = [];
  if (spec.units) {
    spec.units.replace(/^\n|\n\s*$/g, '').split('\n').forEach((line, j) => [...line].forEach((ch, i) => {
      if (ch === ' ' || ch === '.') return;
      const L = spec.legend[ch];
      if (!L) throw new Error(`${spec.name}: no legend entry for unit '${ch}' at (${i + 1},${j + 1})`);
      units.push({ ...L, x: i + 1, y: j + 1 });
    }));
  }
  for (const [k, cargo] of Object.entries(spec.cargo || {})) {
    const [x, y] = k.split(',').map(Number), host = units.find((u) => u.x === x && u.y === y);
    if (!host) throw new Error(`${spec.name}: cargo for (${x},${y}) but no unit there`);
    host.cargo = cargo;
  }
  const view = romView(rom, { ...m, units: [] });
  const hd = view.rom.body(view.info.headerId), gr = view.rom.body(view.info.gridId);
  const clsAt = (x, y) => terrainOf(view.rom, hd, gr[y * 62 + x]).cls;
  const standable = (type, x, y) => x >= 1 && y >= 1 && x <= cols - 1 && y <= rows && moveCost(rom, types[type].category, clsAt(x, y)) !== 0;
  const problems = [];
  const out = units.map((u) => {
    if (!standable(u.type, u.x, u.y)) problems.push(`${types[u.type].code} (type ${u.type}) can't stand on class ${clsAt(u.x, u.y)} at (${u.x},${u.y})`);
    const o = { type: u.type, army: u.neutral ? 0 : u.army, x: u.x, y: u.y };
    if (u.neutral) o.neutral = true;
    if (u.joiner) o.joiner = true;
    if (u.cargo) o.cargo = u.cargo;
    return o;
  });
  const g = units.find((u) => u.general);
  for (const a of spec.arrivals || []) for (const u of a.units) if (!standable(u.type, u.x, u.y)) problems.push(`arrival turn ${a.turn}: ${types[u.type].code} can't stand at (${u.x},${u.y})`);
  for (const w of spec.routes || []) if (!w.x || w.x > cols - 1 || w.y > rows) problems.push(`route point (${w.x},${w.y}) off the map`);
  if (problems.length) throw new Error(`${spec.name}:\n  ${problems.join('\n  ')}`);
  Object.assign(m, {
    name: spec.name, title: spec.title, units: out, arrivals: spec.arrivals || [], objective: spec.objective,
    general: g ? { x: g.x, y: g.y } : null, turnLimit: spec.turnLimit || 0, cap: spec.cap || 0, music: spec.music ?? 0,
    briefing: spec.briefing.trim(), ...(spec.goal ? { goal: spec.goal } : {}), ...(spec.routes ? { routes: spec.routes } : {}), ...(spec.guards ? { guards: spec.guards } : {}), ...(spec.ending ? { ending: spec.ending.trim() } : {}),
    // the briefing screen (js/expansion/briefing.js): chapter line, the villain's transmission,
    // suggested strategy steps and the map annotations that go with them
    ...(spec.chapter ? { chapter: spec.chapter } : {}), ...(spec.transmission ? { transmission: spec.transmission.trim() } : {}),
    ...(spec.strategy ? { strategy: spec.strategy } : {}), ...(spec.plan ? { plan: spec.plan } : {}),
    // the new campaign (docs/STORY.md): briefing dialogue with portraits, and per-choice epilogues
    ...(spec.comms ? { comms: spec.comms.map((c) => ({ speaker: c.speaker, text: c.text.trim() })) } : {}),
    ...(spec.endings ? { endings: Object.fromEntries(Object.entries(spec.endings).map(([k, v]) => [k, v.trim()])) } : {}),
  });
  return { mission: m, view };
}

// ------------------------------------------------------------------ preview PNG (terrain + units, 1:1)
async function preview(mission, view, file) {
  const { writePng } = await imp('tools/png.mjs');
  const pal = battlePalette(rom), r = renderMap(view.rom, view.info, { units: false });
  const img = r.img, W = img.w;
  for (const u of mission.units) {
    const icon = unitIcon(rom, u.army === 1 ? 1 : 0, types[u.type].gfx), [X, Y] = cellOrigin(u.x, u.y);
    for (let i = 0; i < 24 * 16; i++) if (icon.opaque[i]) { const px = X - 16 + (i % 24), py = Y - 16 + Math.floor(i / 24); if (px >= 0 && py >= 0 && px < W && py < img.h) img.px[py * W + px] = icon.px[i]; }
  }
  const data = new Uint8Array(W * img.h * 4);
  for (let i = 0; i < W * img.h; i++) { const c = pal[img.px[i]] || [255, 0, 255]; data.set([c[0], c[1], c[2], 255], i * 4); }
  // neutral docks: grey them out
  for (const u of mission.units) if (u.neutral) { const [X, Y] = cellOrigin(u.x, u.y); for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) { const o = ((Y - 16 + y) * W + X - 16 + x) * 4; if (o < 0 || o >= data.length) continue; const v = (data[o] + data[o + 1] + data[o + 2]) / 3; data[o] = data[o + 1] = data[o + 2] = v; } }
  writePng(file, W, img.h, data);
}

// ------------------------------------------------------------------ main
const dir = join(root, 'tools/missions', subDir), outDir = join(root, 'missions', subDir);
mkdirSync(outDir, { recursive: true });
const wanted = args.length ? args : readdirSync(dir).filter((f) => f.endsWith('.mjs') && f !== 'revive.mjs').map((f) => basename(f, '.mjs'));
if (previewDir) mkdirSync(previewDir, { recursive: true });
for (const name of wanted) {
  const spec = (await import(pathToFileURL(join(dir, `${name}.mjs`)).href)).default;
  const { mission, view } = build(spec);
  writeFileSync(join(outDir, `${spec.file || name}.json`), JSON.stringify(mission));
  const counts = [0, 1].map((a) => mission.units.filter((u) => u.army === a && !u.neutral).length);
  console.log(`${name}: ${spec.screens.join('x')} screens, ${mission.pairs.length} graphics, units ${counts[0]} vs ${counts[1]}${mission.units.some((u) => u.neutral) ? ', neutral docks' : ''}, ${(mission.arrivals || []).length} arrival events`);
  if (previewDir) await preview(mission, view, join(previewDir, `${name}.png`));
}
