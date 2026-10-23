// Map editor for expansion missions: paint with the ROM's own terrain graphics, copy regions
// from the 30 ROM maps, place units and cargo, and export the mission JSON (mission.js).
import { Rom } from '../rom.js';
import { paint, Indexed } from '../gfx.js';
import { MAP_COUNT, mapInfo, battlePalette, cellGraphic, unitIcon, cellOrigin, cellAt, renderMap } from '../maps.js';
import { allUnitTypes } from '../units.js';
import { terrainOf, defence, nameIndex } from '../terrain.js';
import { applyBps } from '../bps.js';
import { readEnglish, LAYOUT } from '../text.js';
import { terrainPalette, blankMission, isFrame, GRID_W, MAX_PAIRS, SCREEN_COLS, SCREEN_ROWS } from './mission.js';

const $ = (id) => document.getElementById(id);
const SCALE = 2, AUTOSAVE = 'el-expansion-editor';
const OBJECTIVES = ['annihilate', 'command', 'fortress', 'flagship', 'carriers', 'escape', 'destroyType'];
const TOOLS = { paint: 'Paint', fill: 'Fill', pick: 'Pick', stamp: 'Stamp', unit: 'Units' };

let rom, pal, types, en = null, palette, mission, tool = 'paint', cur = null, unitType = 0, stamp = null;
const gfxCache = new Map();
const gfx = (g) => gfxCache.get(g) || gfxCache.set(g, cellGraphic(rom, g)).get(g);

function idbGet(key) {
  return new Promise((res) => {
    try {
      const r = indexedDB.open('earthlight-lab', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rom');
      r.onsuccess = () => { const g = r.result.transaction('rom').objectStore('rom').get(key); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); };
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}

const cols = () => mission.screensW * SCREEN_COLS, rows = () => mission.screensH * SCREEN_ROWS;
const terrainName = (p) => {
  const n = nameIndex(rom, p.type);
  return en && n < LAYOUT.terrainNames ? en.main[LAYOUT.terrainName + n].replace(/\s*\n\s*/g, ' ').replace(/- /g, '').trim() : `class ${p.cls}`;
};
const unitName = (t) => (en ? en.unitNames[t] : types[t].name);
const pairInfo = (gfxId, id) => palette.find((p) => p.gfx === gfxId && p.id === id);
const describe = (p) => p ? `${terrainName(p)} · B ${defence(rom, p.cls, 0)}% N ${defence(rom, p.cls, 1)}% M ${defence(rom, p.cls, 2)}%` : '';

// ------------------------------------------------------------ rendering
function render() {
  const W = (cols() + 2) * 16 + 8, H = (rows() + 2) * 16 + 8, full = new Indexed(W, H);
  mission.grid.forEach((row, cy) => row.forEach((v, cx) => {
    const g = gfx(mission.pairs[v][0]), [X, Y] = cellOrigin(cx, cy);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) full.px[(Y + y) * W + X + x] |= g.px[y * 24 + x];
  }));
  for (const u of mission.units) {
    const icon = unitIcon(rom, u.army === 1 ? 1 : 0, types[u.type].gfx), [X, Y] = cellOrigin(u.x, u.y);
    for (let i = 0; i < 24 * 16; i++) if (icon.opaque[i]) full.px[(Y + (i / 24 | 0)) * W + X + i % 24] = icon.px[i];
  }
  const vw = cols() * 16, vh = rows() * 16 + 8, out = new Indexed(vw, vh);
  for (let y = 0; y < vh; y++) out.px.set(full.px.subarray((16 + y) * W + 16, (16 + y) * W + 16 + vw), y * vw);
  const c = $('map');
  paint(c, out, pal, { scale: SCALE });
  const ctx = c.getContext('2d');
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  for (const u of mission.units) {
    const [X, Y] = cellOrigin(u.x, u.y), x = (X - 16 + 12) * SCALE, y = (Y - 16) * SCALE + 10;
    if (u.army === 2) { ctx.fillStyle = '#ccc'; ctx.fillText('N', x, y); }
    if (u.cargo?.length) { ctx.fillStyle = '#ffd54a'; ctx.fillText(`+${u.cargo.length}`, x, y + 22); }
  }
  $('pairCount').textContent = `(${mission.pairs.length}/${MAX_PAIRS} graphics)`;
  try { localStorage.setItem(AUTOSAVE, JSON.stringify(mission)); } catch { }
}

function cellFromEvent(ev, canvas) {
  const r = canvas.getBoundingClientRect();
  return cellAt((ev.clientX - r.left) / SCALE + 16, (ev.clientY - r.top) / SCALE + 16);
}

// ------------------------------------------------------------ painting
function pairIndex(gfxId, id) {
  let v = mission.pairs.findIndex(([g, i]) => g === gfxId && i === id);
  if (v >= 0) return v;
  if (mission.pairs.length >= MAX_PAIRS) compactPairs();
  if (mission.pairs.length >= MAX_PAIRS) { status(`A map can use at most ${MAX_PAIRS} terrain graphics.`); return -1; }
  mission.pairs.push([gfxId, id]);
  return mission.pairs.length - 1;
}

// Drop graphics no cell uses (value 0, the fill, stays).
function compactPairs() {
  const used = new Set([0]);
  mission.grid.forEach((row) => row.forEach((v) => used.add(v)));
  const map = new Map(), pairs = [];
  mission.pairs.forEach((p, v) => { if (used.has(v)) { map.set(v, pairs.length); pairs.push(p); } });
  mission.pairs = pairs;
  mission.grid = mission.grid.map((row) => row.map((v) => map.get(v)));
}

const playable = (cx, cy) => cy >= 0 && cy < mission.grid.length && cx >= 0 && cx < mission.grid[0].length && !isFrame(cx, cy, cols(), rows());
function setCell(cx, cy) {
  if (!cur || !playable(cx, cy)) return;
  const v = pairIndex(cur.gfx, cur.id);
  if (v >= 0) mission.grid[cy][cx] = v;
}

function fill(cx, cy) {
  if (!cur || !playable(cx, cy)) return;
  const from = mission.grid[cy][cx], to = pairIndex(cur.gfx, cur.id);
  if (to < 0 || from === to) return;
  const stack = [[cx, cy]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (!playable(x, y) || mission.grid[y][x] !== from) continue;
    mission.grid[y][x] = to;
    const odd = x & 1;
    stack.push([x, y - 1], [x, y + 1], [x - 1, odd ? y : y - 1], [x - 1, odd ? y + 1 : y], [x + 1, odd ? y : y - 1], [x + 1, odd ? y + 1 : y]);
  }
}

// Paste keeps the source's column parity so the hex stagger (and the shapes) line up.
function pasteStamp(cx, cy) {
  if (!stamp) return;
  if ((cx & 1) !== (stamp.x0 & 1)) cx++;
  stamp.cells.forEach((row, dy) => row.forEach(([g, id], dx) => {
    if (!playable(cx + dx, cy + dy)) return;
    const v = pairIndex(g, id);
    if (v >= 0) mission.grid[cy + dy][cx + dx] = v;
  }));
}

function placeUnit(cx, cy, ev) {
  if (!playable(cx, cy)) return;
  const at = mission.units.find((u) => u.x === cx && u.y === cy);
  const army = +$('army').value;
  if (at && ev.shiftKey) { (at.cargo ||= []).push(unitType); status(`${unitName(unitType)} loaded into ${unitName(at.type)}.`); return; }
  if (at) { mission.units.splice(mission.units.indexOf(at), 1); return; }
  const u = { type: unitType, army: army === 2 ? 1 : army, x: cx, y: cy };
  if (army === 2) { u.army = 0; u.neutral = true; }
  mission.units.push(u);
}

function onMap(ev) {
  const [cx, cy] = cellFromEvent(ev, $('map'));
  const v = mission.grid[cy]?.[cx];
  if (v !== undefined) {
    const u = mission.units.find((w) => w.x === cx && w.y === cy);
    $('hover').textContent = `(${cx}, ${cy}) ${describe(pairInfo(...mission.pairs[v]))}${u ? ` · ${unitName(u.type)}${u.cargo?.length ? ' carrying ' + u.cargo.map(unitName).join(', ') : ''}` : ''}`;
  }
  if (ev.type === 'mousemove' && !(ev.buttons & 1)) return;
  if (ev.type === 'mousemove' && tool !== 'paint') return;
  if (ev.button === 2 || tool === 'pick') { if (v !== undefined) selectPair(pairInfo(...mission.pairs[v])); return; }
  if (tool === 'paint') setCell(cx, cy);
  else if (tool === 'fill') fill(cx, cy);
  else if (tool === 'stamp') pasteStamp(cx, cy);
  else if (tool === 'unit') placeUnit(cx, cy, ev);
  render();
}

// ------------------------------------------------------------ side panels
function selectPair(p) {
  if (!p) return;
  cur = p;
  for (const c of $('pal').querySelectorAll('canvas')) c.classList.toggle('sel', c.dataset.key === `${p.gfx}:${p.id}`);
  if (tool === 'pick' || tool === 'unit' || tool === 'stamp') setTool('paint');
}

function buildPalette() {
  const box = $('pal');
  let lastCls = -1;
  for (const p of palette) {
    if (p.cls !== lastCls) {
      const h = document.createElement('div'); h.className = 'cls'; h.textContent = terrainName(p); box.append(h);
      lastCls = p.cls;
    }
    const c = document.createElement('canvas');
    paint(c, gfx(p.gfx), pal, { scale: 2 });
    c.dataset.key = `${p.gfx}:${p.id}`;
    c.title = `${describe(p)} · in ${p.maps.size} ROM map(s)`;
    c.onclick = () => selectPair(p);
    box.append(c);
  }
}

function buildUnits() {
  const box = $('units');
  box.innerHTML = '';
  const army = +$('army').value === 1 ? 1 : 0;
  for (const t of types) {
    if (t.cut) continue;
    const c = document.createElement('canvas');
    paint(c, unitIcon(rom, army, t.gfx), pal, { scale: 2 });
    c.title = `${unitName(t.type)} ${t.code.trim()} · HP ${t.hp} · move ${t.move}`;
    c.classList.toggle('sel', t.type === unitType);
    c.onclick = () => { unitType = t.type; setTool('unit'); buildUnits(); };
    box.append(c);
  }
}

function setTool(t) {
  tool = t;
  for (const b of $('tools').children) b.setAttribute('aria-pressed', b.dataset.tool === t);
}

// ------------------------------------------------------------ ROM map stamps
let romInfo, romGrid, romHeader, drag = null;
function showRomMap() {
  romInfo = mapInfo(rom, +$('romSel').value);
  const r = renderMap(rom, romInfo, { units: false });
  romGrid = r.grid; romHeader = r.header;
  paint($('romMap'), r.img, pal, { scale: 1 });
}
function romCell(ev) { return cellFromEventScaled(ev, $('romMap'), 1); }
function cellFromEventScaled(ev, canvas, s) {
  const r = canvas.getBoundingClientRect(), k = canvas.width / r.width;
  return cellAt((ev.clientX - r.left) * k / s + 16, (ev.clientY - r.top) * k / s + 16);
}
function takeStamp(a, b) {
  const x0 = Math.max(1, Math.min(a[0], b[0])), x1 = Math.min(romInfo.cols, Math.max(a[0], b[0]));
  const y0 = Math.max(1, Math.min(a[1], b[1])), y1 = Math.min(romInfo.rows, Math.max(a[1], b[1]));
  const cells = [];
  for (let y = y0; y <= y1; y++) {
    const row = [];
    for (let x = x0; x <= x1; x++) { const v = romGrid[y * GRID_W + x]; row.push([romHeader[v], terrainOf(rom, romHeader, v).id]); }
    cells.push(row);
  }
  stamp = { x0, cells };
  $('stampInfo').textContent = `Stamp: ${x1 - x0 + 1}×${y1 - y0 + 1} cells from ${romInfo.name}. Click the map to paste.`;
  setTool('stamp');
}

// ------------------------------------------------------------ mission I/O
function resize(sw, sh) {
  const old = mission;
  mission = { ...old, ...blankMission(sw, sh, old.pairs[0]), name: old.name, title: old.title, units: old.units, arrivals: old.arrivals, objective: old.objective, turnLimit: old.turnLimit, cap: old.cap, briefing: old.briefing };
  mission.pairs = old.pairs;
  for (let cy = 0; cy < mission.grid.length; cy++) {
    for (let cx = 0; cx < mission.grid[cy].length; cx++) {
      const keep = !isFrame(cx, cy, cols(), rows()) && old.grid[cy] && old.grid[cy][cx] !== undefined && !isFrame(cx, cy, old.screensW * SCREEN_COLS, old.screensH * SCREEN_ROWS);
      mission.grid[cy][cx] = keep ? old.grid[cy][cx] : 0;
    }
  }
  mission.units = mission.units.filter((u) => playable(u.x, u.y));
}

function newMission(sw, sh) {
  const v = palette.find((q) => q.cls === 0);
  mission = blankMission(sw, sh, [v.gfx, v.id]);
  mission.cap = 6;
}

function syncForm() {
  $('name').value = mission.name; $('title').value = mission.title || '';
  $('sw').value = mission.screensW; $('sh').value = mission.screensH;
  $('objective').value = mission.objective?.kind || 'annihilate';
  $('turnLimit').value = mission.turnLimit || 0; $('cap').value = mission.cap || 0;
  $('briefing').value = mission.briefing || '';
}

function exportJson() {
  compactPairs();
  const blob = new Blob([JSON.stringify(mission)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `${(mission.name || 'mission').toLowerCase()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  render();
}

const status = (s) => { $('status').textContent = s; };

// ------------------------------------------------------------ boot
async function testFile(url) { try { const r = await fetch(url); return r.ok ? r : null; } catch { return null; } }
(async () => {
  let buf = await idbGet('rom'), patch = await idbGet('patch');
  if (!buf) {
    const { readRomFile, readPatchFile } = await import('../romfile.js');
    const r = await testFile('/__test_rom'); if (r) buf = await readRomFile(new File([await r.arrayBuffer()], 'rom.zip'));
    const p = await testFile('/__test_patch'); if (p) patch = await readPatchFile(new File([await p.arrayBuffer()], 'patch.zip'));
  }
  if (!buf) { $('status').innerHTML = 'No ROM loaded yet — open the <a href="index.html">lab</a> and load it first.'; return; }
  rom = new Rom(buf); pal = battlePalette(rom); types = allUnitTypes(rom);
  if (patch) { try { en = readEnglish(applyBps(patch, rom.bytes.slice().buffer)); } catch { } }
  palette = terrainPalette(rom);

  for (const id of ['sw', 'sh']) for (let n = 1; n <= 4; n++) $(id).append(new Option(n, n));
  for (const o of OBJECTIVES) $('objective').append(new Option(o, o));
  for (let m = 0; m < MAP_COUNT; m++) $('romSel').append(new Option(`${m + 1} ${mapInfo(rom, m).name}`, m));
  for (const [k, label] of Object.entries(TOOLS)) {
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.dataset.tool = k;
    b.onclick = () => setTool(k); $('tools').append(b);
  }

  try { mission = JSON.parse(localStorage.getItem(AUTOSAVE)); } catch { mission = null; }
  if (!mission?.grid) newMission(1, 1);
  buildPalette(); buildUnits(); syncForm(); setTool('paint');
  selectPair(palette.find((q) => q.cls === 3) || palette[0]);
  showRomMap(); render();
  status('Paint with the left button, right-click to pick a terrain. Units: click to place or remove, shift-click a dock or carrier to load the selected unit.');

  const map = $('map');
  map.addEventListener('mousedown', onMap); map.addEventListener('mousemove', onMap);
  map.addEventListener('contextmenu', (e) => e.preventDefault());
  $('romMap').addEventListener('mousedown', (e) => { drag = romCell(e); });
  $('romMap').addEventListener('mouseup', (e) => { if (drag) takeStamp(drag, romCell(e)); drag = null; });
  $('romSel').onchange = showRomMap;
  $('army').onchange = buildUnits;
  $('newBtn').onclick = () => { newMission(+$('sw').value, +$('sh').value); syncForm(); render(); };
  $('sw').onchange = $('sh').onchange = () => { resize(+$('sw').value, +$('sh').value); render(); };
  $('name').oninput = () => { mission.name = $('name').value.toUpperCase(); render(); };
  $('title').oninput = () => { mission.title = $('title').value; render(); };
  $('objective').onchange = () => { mission.objective = { ...mission.objective, kind: $('objective').value }; render(); };
  $('turnLimit').oninput = () => { mission.turnLimit = +$('turnLimit').value || 0; render(); };
  $('cap').oninput = () => { mission.cap = +$('cap').value || 0; render(); };
  $('briefing').oninput = () => { mission.briefing = $('briefing').value; render(); };
  $('exportBtn').onclick = exportJson;
  $('importFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { mission = JSON.parse(await f.text()); syncForm(); render(); status(`Loaded ${f.name}.`); } catch (err) { status(`Could not read ${f.name}: ${err.message}`); }
  };
})().catch((e) => { status(`Editor error: ${e.message}`); console.error(e); });
