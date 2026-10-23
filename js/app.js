import { Rom, ASSET_COUNT, KIND_NAMES, TYPE_NAMES } from './rom.js';
import { readRomFile, readPatchFile } from './romfile.js';
import { applyBps } from './bps.js';
import { readEnglish, unitText, LAYOUT } from './text.js';
import { Indexed, paint, paletteFromBytes, tileSheet, decodeTile } from './gfx.js';
import {
  MAP_COUNT, UNIT_ICONS, HEX_POINTS, mapInfo, battlePalette, renderMap, unitIcon,
  unitTypeGfx, cellAt, cellOrigin, cellGraphic,
} from './maps.js';
import { allUnitTypes, levelBonus } from './units.js';
import { paintUnitArt } from './unitart.js';
import {
  CLASSES, CATEGORIES, MODES, EDGE_CLASS, TYPES, terrainOf, moveCost, defence, targetable, classSamples,
  nameIndex, classOfType,
} from './terrain.js';

const oneLine = (s) => s.replace(/\s*\n\s*/g, ' ').trim();
function terrainName(type) {
  if (!english) return null;
  const n = nameIndex(rom, type);
  return n < LAYOUT.terrainNames ? oneLine(english.main[LAYOUT.terrainName + n]).replace(/- /g, '') : null;
}
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const $ = (id) => document.getElementById(id);
const hex = (v, n = 2) => v.toString(16).toUpperCase().padStart(n, '0');

let rom = null;
let battlePal = null;
let unitTypes = [];
let english = null; // text read from the in-memory English-patched ROM

// ---------------------------------------------------------------- ROM loading
// The ROM is remembered in this browser only (IndexedDB) so reloads skip the
// file picker. It never leaves the machine.
const DB = 'earthlight-lab', STORE = 'rom';

function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function saveRom(buf, key = 'rom') {
  try {
    const db = await idb();
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(buf, key);
  } catch { /* storage unavailable: fine */ }
}
async function loadSavedRom(key = 'rom') {
  try {
    const db = await idb();
    return await new Promise((res) => {
      const r = db.transaction(STORE).objectStore(STORE).get(key);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => res(null);
    });
  } catch { return null; }
}
async function forgetRom() {
  try {
    const db = await idb();
    const s = db.transaction(STORE, 'readwrite').objectStore(STORE);
    s.delete('rom'); s.delete('patch');
  } catch { }
}

function usePatch(patchBuf) {
  english = readEnglish(applyBps(patchBuf, rom.bytes.slice().buffer));
  $('patchprompt').hidden = true;
  drawText(); drawUnitTable(); drawUnitArt(); initTerrain();
  if (curRender) selectMap(curMap);
}

$('patchfile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  $('patcherr').textContent = '';
  try {
    const buf = await readPatchFile(f);
    usePatch(buf);
    saveRom(buf, 'patch');
  } catch (err) { $('patcherr').textContent = err.message; }
});

function useRom(buf) {
  const r = new Rom(buf);
  if (!r.isEarthLight()) throw new Error(`This doesn't look like Earth Light (Japan): title "${r.title}", ${r.bytes.length} bytes.`);
  rom = r;
  battlePal = battlePalette(rom);
  $('loader').hidden = true;
  document.querySelector('.tabs').hidden = false;
  $('romstatus').innerHTML = `ROM: <b>${rom.title}</b> · 1 MB LoROM · ${ASSET_COUNT} assets `
    + `<button class="btn" id="forget">Forget ROM</button>`;
  $('forget').onclick = async () => { await forgetRom(); location.reload(); };
  unitTypes = allUnitTypes(rom);
  initMaps(); initUnits(); initTerrain(); initAssets();
  showTab(sessionTab() || 'maps');
}

async function onFile(file) {
  $('loaderr').textContent = '';
  try {
    const buf = await readRomFile(file);
    useRom(buf);
    saveRom(buf);
  } catch (e) {
    $('loaderr').textContent = e.message;
  }
}

$('file').addEventListener('change', (e) => e.target.files[0] && onFile(e.target.files[0]));
const drop = $('drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault(); drop.classList.remove('over');
  if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
});

// ---------------------------------------------------------------- tabs
function sessionTab() { try { return localStorage.getItem('el-tab'); } catch { return null; } }
function showTab(name) {
  for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-selected', b.dataset.tab === name);
  for (const t of ['maps', 'units', 'terrain', 'text', 'assets']) $(`tab-${t}`).hidden = t !== name;
  try { localStorage.setItem('el-tab', name); } catch { }
}
for (const b of document.querySelectorAll('.tabs button')) b.onclick = () => showTab(b.dataset.tab);

// ---------------------------------------------------------------- maps
let curMap = 0, curRender = null;

function initMaps() {
  const list = $('maplist');
  list.innerHTML = '';
  for (let m = 0; m < MAP_COUNT; m++) {
    const info = mapInfo(rom, m);
    const li = document.createElement('li');
    li.innerHTML = `<span>${m + 1}. ${info.name}</span><span class="dim">${info.cols}×${info.rows}</span>`;
    li.onclick = () => selectMap(m);
    list.appendChild(li);
  }
  for (const id of ['showUnits', 'showGrid', 'mapZoom']) $(id).onchange = () => selectMap(curMap);
  $('mapCanvas').addEventListener('mousemove', onMapHover);
  $('mapCanvas').addEventListener('mouseleave', () => { $('cellinfo').textContent = 'Hover a hex to inspect it.'; });
  $('mapPng').onclick = () => {
    const a = document.createElement('a');
    a.download = `earthlight-map-${curMap + 1}-${mapInfo(rom, curMap).name.toLowerCase()}.png`;
    a.href = $('mapCanvas').toDataURL('image/png');
    a.click();
  };
  selectMap(0);
}

function selectMap(m) {
  curMap = m;
  [...$('maplist').children].forEach((li, i) => li.setAttribute('aria-current', i === m));
  const info = mapInfo(rom, m);
  const zoom = +$('mapZoom').value;
  curRender = renderMap(rom, info, { units: $('showUnits').checked });
  curRender.info = info;
  $('maptitle').textContent = `MAP-${info.name}`;
  paint($('mapCanvas'), curRender.img, battlePal, { scale: zoom });
  drawGrid(zoom);
}

function drawGrid(zoom) {
  const ov = $('mapOverlay'), cv = $('mapCanvas');
  ov.width = cv.width; ov.height = cv.height;
  const ctx = ov.getContext('2d');
  ctx.clearRect(0, 0, ov.width, ov.height);
  if (!$('showGrid').checked) return;
  const { info, offset: [ox, oy] } = curRender;
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = 1;
  for (let cy = 0; cy <= info.rows + 1; cy++) {
    for (let cx = 0; cx <= info.cols + 1; cx++) {
      const [X, Y] = cellOrigin(cx, cy);
      ctx.beginPath();
      HEX_POINTS.forEach(([px, py], i) => {
        const x = (X + px - ox) * zoom + .5, y = (Y + py - oy) * zoom + .5;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }
  }
}

function onMapHover(e) {
  if (!curRender) return;
  const zoom = +$('mapZoom').value;
  const r = e.target.getBoundingClientRect();
  const px = Math.floor((e.clientX - r.left) / zoom) + curRender.offset[0];
  const py = Math.floor((e.clientY - r.top) / zoom) + curRender.offset[1];
  const [cx, cy] = cellAt(px, py);
  if (cx < 0 || cy < 0 || cx > 61 || cy > 41) return;
  const v = curRender.grid[cy * 62 + cx];
  const { info } = curRender;
  const edge = cx < 1 || cy < 1 || cx >= info.cols || cy > info.rows;
  const t = terrainOf(rom, curRender.header, v);
  const cls = edge ? EDGE_CLASS : t.cls;
  const def = [0, 1, 2].map((m) => defence(rom, cls, m)).join('/');
  const unit = curRender.deploy.find((u) => u.x === cx && u.y === cy);
  const ut = unit && unitTypes[unit.type];
  $('cellinfo').innerHTML = `Cell <b>(${cx}, ${cy})</b> · value $${hex(v)} · graphic #${curRender.header[v]}`
    + ` · ${edge ? '' : terrainName(t.type) ? `<b>${terrainName(t.type)}</b> · ` : ''}type $${hex(t.type)}, <b>class ${cls}</b>${edge ? ' (map edge)' : ''} · defence M1/M2/M3 ${def}%`
    + (ut ? ` · <b>${english ? english.unitNames[ut.type] : ut.name}</b> ${ut.code} (army ${unit.army ? 'B' : 'A'})` : '');
}

// ---------------------------------------------------------------- units
// Category labels: the model-code prefixes found in each category (e.g. "HU, CHU").
function categoryLabels() {
  const m = new Map();
  for (const u of unitTypes) {
    if (!m.has(u.category)) m.set(u.category, new Set());
    m.get(u.category).add(u.code.split('-')[0]);
  }
  return m;
}

function iconCanvas(army, gfx, frame, scale = 2) {
  const c = document.createElement('canvas');
  paint(c, unitIcon(rom, army, gfx, frame), battlePal, { scale, bg: [19, 22, 43] });
  return c;
}

function initUnits() {
  for (const id of ['unitFrame', 'unitArmy']) $(id).onchange = () => { drawUnitTable(); drawUnits(); };
  drawUnitTable();
  drawUnits();
  drawUnitArt();
  const lv = levelBonus(rom);
  $('formula').innerHTML = [
    'P = weapon power of the attacker\'s slot',
    'P ×= (128 − (defender evasion + support from the defender\'s adjacent allies, max 128)) / 128',
    'P ×= (128 − terrain defence[target class][weapon mode] × 1.28) / 128',
    'P ×= attacker HP for small craft (category ≥ 7, max HP 8), or attacker HP × 8 / max HP for capital ships',
    'P += ¼ of the power of the attacker\'s adjacent allies',
    `P ×= level bonus / 16 (levels 0–9: ${lv.join(', ')})`,
    'P += random adjustment (range not yet measured); P ×2 when flag $06E9 is set',
    'defender HP −= P / 128 (rounded down). The defender then counter-attacks with slot 1 (attacked by small craft), slot 2 (by capital ships) or slot 3 (if slot 3 was used); slot 4 and indirect fire get no counter.',
  ].map((s) => `<li>${s}</li>`).join('');
}

function drawUnitTable() {
  const army = +$('unitArmy').value, frame = +$('unitFrame').value;
  const cats = categoryLabels();
  const table = $('unitTable');
  table.innerHTML = '<thead><tr><th></th><th>#</th><th>Name</th>' + (english ? '<th>English</th><th>Role</th>' : '')
    + '<th>Model</th><th>Category</th><th>Form</th>'
    + '<th>HP</th><th>Move</th><th>Evasion</th><th>Value</th>'
    + '<th>Weapon 1</th><th>Weapon 2</th><th>Weapon 3</th><th>Weapon 4</th><th>Notes</th></tr></thead>';
  const body = document.createElement('tbody');
  for (const u of unitTypes) {
    const tr = document.createElement('tr');
    const td0 = document.createElement('td');
    td0.append(iconCanvas(army, u.gfx, frame));
    tr.append(td0);
    const w = u.weapons.map((x) => (x
      ? `<span class="wpn">M${x.mode + 1} · ${x.min === x.max ? x.min : `${x.min}–${x.max}`} · <b>${x.power}</b></span>`
      : '<span class="dim">—</span>'));
    const notes = [];
    if (u.moveOrFire) notes.push('move or fire');
    if (u.weapons.some((x) => x && x.min >= 2)) notes.push('indirect');
    tr.insertAdjacentHTML('beforeend',
      `<td class="num">${u.type}</td><td class="jp">${u.name}</td>`
      + (english ? (() => { const t = unitText(english, u.type); return `<td>${esc(t.name)}</td><td class="desc">${t.short ? esc(oneLine(t.short)) : ''}</td>`; })() : '')
      + `<td class="mono">${u.code}</td>`
      + `<td title="${[...cats.get(u.category)].join(', ')}">${u.category} <span class="dim">${[...cats.get(u.category)].join(', ')}</span></td>`
      + `<td>${u.form ? `${u.form}/2` : ''}</td>`
      + `<td class="num">${u.hp}</td><td class="num">${u.move}</td><td class="num">${Math.round(u.evasion * 100 / 128)}%</td>`
      + `<td class="num">${u.value}</td>${w.map((s) => `<td>${s}</td>`).join('')}<td class="dim">${notes.join(', ')}</td>`);
    body.append(tr);
  }
  table.append(body);
}

// Unit description art (js/unitart.js), one card per picture, with the unit-info text.
function drawUnitArt() {
  const el = $('unitArt');
  el.innerHTML = '';
  const seen = new Set();
  for (const u of unitTypes) {
    const key = rom.byteAt(0x04f25a + u.type);
    if (seen.has(key)) continue;   // types without art of their own reuse another picture
    seen.add(key);
    const card = document.createElement('div');
    card.className = 'artcard';
    const c = document.createElement('canvas');
    paintUnitArt(c, rom, u.type, 2);
    const t = english ? unitText(english, u.type) : null;
    card.append(c);
    card.insertAdjacentHTML('beforeend', `<div><b>${t ? esc(t.name) : u.name}</b> <span class="mono dim">${u.code}</span>`
      + (t && t.info ? t.info.map((s) => `<p>${esc(oneLine(s))}</p>`).join('') : '') + '</div>');
    el.append(card);
  }
}

// ---------------------------------------------------------------- terrain
function initTerrain() {
  const samples = classSamples(rom);
  const t = $('terrainTable');
  const namesByClass = Array.from({ length: CLASSES }, () => new Set());
  for (let ty = 0; ty < TYPES; ty++) { const n = terrainName(ty); if (n) namesByClass[classOfType(rom, ty)].add(n); }
  t.innerHTML = '<thead><tr><th>Class</th>' + (english ? '<th>Terrain</th>' : '')
    + '<th>Example hexes (all maps)</th><th>Defence M1</th><th>M2</th><th>M3</th>'
    + '<th>Targetable M1/M2/M3</th></tr></thead>';
  const body = document.createElement('tbody');
  for (let c = 0; c < CLASSES; c++) {
    const tr = document.createElement('tr');
    tr.insertAdjacentHTML('beforeend', `<td class="num">${c}${c === EDGE_CLASS ? ' <span class="dim">+ map edge</span>' : ''}</td>`
      + (english ? `<td>${[...namesByClass[c]].map(esc).join(', ') || '<span class="dim">facilities</span>'}</td>` : ''));
    const td = document.createElement('td');
    td.className = 'hexes';
    for (const gid of samples[c].slice(0, 8)) {
      const cv = document.createElement('canvas');
      paint(cv, cellGraphic(rom, gid), battlePal, { scale: 2, zeroTransparent: true });
      cv.title = `graphic #${gid}`;
      td.append(cv);
    }
    if (!samples[c].length) td.innerHTML = '<span class="dim">not used on any map</span>';
    tr.append(td);
    for (let m = 0; m < MODES; m++) tr.insertAdjacentHTML('beforeend', `<td class="num">${defence(rom, c, m)}%</td>`);
    const tg = [0, 1, 2].map((m) => { const x = targetable(rom, c, m); return x.b ? '✓' : '✗'; }).join(' ');
    tr.insertAdjacentHTML('beforeend', `<td class="mono">${tg}</td>`);
    body.append(tr);
  }
  t.append(body);

  const cats = categoryLabels();
  const ct = $('costTable');
  let head = '<thead><tr><th>Class</th>';
  for (let k = 1; k <= CATEGORIES; k++) head += `<th title="${cats.has(k) ? [...cats.get(k)].join(', ') : 'unused'}">${k}<br><span class="dim small">${cats.has(k) ? [...cats.get(k)].join(' ') : '—'}</span></th>`;
  ct.innerHTML = head + '</tr></thead>';
  const cb = document.createElement('tbody');
  for (let c = 0; c < CLASSES; c++) {
    let row = `<tr><td class="num">${c}</td>`;
    for (let k = 1; k <= CATEGORIES; k++) {
      const v = moveCost(rom, k, c);
      row += `<td class="num cost c${v}">${v === 0 ? '—' : v}</td>`;
    }
    cb.insertAdjacentHTML('beforeend', row + '</tr>');
  }
  ct.append(cb);
}

function drawUnits() {
  const frame = +$('unitFrame').value, zoom = 3;
  for (const [army, el] of [[0, $('iconsA')], [1, $('iconsB')]]) {
    el.innerHTML = '';
    for (let g = 0; g < UNIT_ICONS; g++) {
      const icon = unitIcon(rom, army, g, frame);
      const div = document.createElement('div');
      div.className = 'icon';
      const c = document.createElement('canvas');
      paint(c, icon, battlePal, { scale: zoom, bg: [11, 13, 26] });
      div.append(c);
      const s = document.createElement('span');
      s.textContent = `#${g}`;
      div.append(s);
      el.append(div);
    }
  }
}

// ---------------------------------------------------------------- assets
let curAsset = 0;
const paletteAssets = [];

function initAssets() {
  const sel = $('aPal');
  sel.innerHTML = '<option value="battle">Battle screen (256)</option><option value="gray">Grayscale</option>';
  for (let k = 0; k < ASSET_COUNT; k++) {
    const E = rom.entry(k);
    if (E.kind === 5) {
      paletteAssets.push(k);
      sel.insertAdjacentHTML('beforeend', `<option value="${k}">Asset ${k} (${E.data >> 1} colors)</option>`);
    }
  }
  $('kindFilter').onchange = buildAssetList;
  for (const id of ['aView', 'aBpp', 'aPal', 'aRow', 'aTiles', 'aZoom']) $(id).onchange = drawAsset;
  buildAssetList();
  selectAsset(0);
}

function buildAssetList() {
  const f = $('kindFilter').value, list = $('assetlist');
  list.innerHTML = '';
  for (let k = 0; k < ASSET_COUNT; k++) {
    const E = rom.entry(k);
    if (f === 'tiles' && !(E.kind <= 4)) continue;
    if (f && f !== 'tiles' && E.kind !== +f) continue;
    const li = document.createElement('li');
    li.dataset.k = k;
    li.innerHTML = `<span>${String(k).padStart(3, '0')} ${KIND_NAMES[E.kind] || 'kind ' + E.kind}</span><span class="dim">${E.lead + E.data + E.trail}</span>`;
    li.onclick = () => selectAsset(k);
    list.appendChild(li);
  }
  markAsset();
}

function markAsset() {
  for (const li of $('assetlist').children) li.setAttribute('aria-current', +li.dataset.k === curAsset);
}

// Assets sit in groups (tileset, palette, tilemap...). Guess sensible companions.
function nearest(k, pred, span = 6) {
  for (let d = 1; d <= span; d++) {
    for (const j of [k - d, k + d]) if (j >= 0 && j < ASSET_COUNT && pred(rom.entry(j))) return j;
  }
  return null;
}

function selectAsset(k) {
  curAsset = k;
  markAsset();
  const E = rom.entry(k);
  const view = E.kind === 5 ? 'palette' : E.kind === 6 ? 'tilemap' : E.kind === 7 ? 'hex' : 'tiles';
  $('aView').value = view;
  $('aBpp').value = E.kind === 4 ? 8 : 4;
  const pal = nearest(k, (e) => e.kind === 5);
  $('aPal').value = pal != null ? pal : 'battle';
  $('aRow').value = 0;
  const tiles = E.kind === 6 ? guessTileset(k, 4) : nearest(k, (e) => e.kind <= 4);
  $('aTiles').value = tiles != null ? tiles : '';
  drawAsset();
}

// For a tilemap, pick the neighbouring tileset whose decoded (non-padding) range
// covers the most tile numbers the map references.
function guessTileset(k, bpp) {
  const body = rom.body(k), used = new Set();
  for (let i = 0; i < body.length; i += 2) used.add((body[i] | (body[i + 1] << 8)) & 0x3ff);
  const tb = bpp * 8;
  let best = null, bestScore = 0;
  for (let j = Math.max(0, k - 10); j <= Math.min(ASSET_COUNT - 1, k + 10); j++) {
    const e = rom.entry(j);
    if (e.kind > 4) continue;
    const lo = e.lead / tb, hi = (e.lead + e.data) / tb;
    let score = 0;
    for (const t of used) if (t >= lo && t < hi) score++;
    score -= Math.abs(j - k) * 0.01; // prefer closer on ties
    if (score > bestScore) { best = j; bestScore = score; }
  }
  return best;
}

function currentPalette() {
  const v = $('aPal').value;
  if (v === 'gray') return Array.from({ length: 256 }, (_, i) => { const g = (i & 15) * 17; return [g, g, g]; });
  if (v === 'battle') return battlePal;
  return paletteFromBytes(rom.body(+v));
}

function drawAsset() {
  const k = curAsset, E = rom.entry(k);
  const data = rom.asset(k);
  const view = $('aView').value, bpp = +$('aBpp').value, zoom = +$('aZoom').value;
  const row = +$('aRow').value || 0;
  $('assettitle').textContent = `Asset ${k}`;
  $('assetmeta').textContent = `kind ${E.kind} (${KIND_NAMES[E.kind] || '?'}) · ${TYPE_NAMES[E.type]} · `
    + `ROM $${hex(E.ptr, 6)} · lead ${E.lead} + body ${E.data} + trail ${E.trail} bytes`
    + (view === 'tilemap' || view === 'tiles' ? ' · magenta = colour not in the selected palette' : '');
  document.querySelector('.tm').hidden = view !== 'tilemap';
  const canvas = $('assetCanvas'), hexEl = $('assetHex');
  canvas.parentElement.hidden = view === 'hex';
  hexEl.hidden = view !== 'hex';
  const pal = currentPalette();

  if (view === 'hex') {
    const body = rom.body(k), lines = [];
    for (let i = 0; i < Math.min(body.length, 4096); i += 16) {
      lines.push(hex(i, 4) + '  ' + [...body.subarray(i, i + 16)].map((b) => hex(b)).join(' '));
    }
    hexEl.textContent = lines.join('\n') + (body.length > 4096 ? `\n… ${body.length - 4096} more bytes` : '');
    return;
  }
  if (view === 'palette') {
    const p = paletteFromBytes(rom.body(k));
    const img = new Indexed(16 * 12, Math.ceil(p.length / 16) * 12);
    for (let i = 0; i < p.length; i++) {
      for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) img.px[(Math.floor(i / 16) * 12 + y) * img.w + (i % 16) * 12 + x] = i;
    }
    paint(canvas, img, p, { scale: zoom });
    return;
  }
  if (view === 'tilemap') {
    const tk = +$('aTiles').value;
    const tiles = Number.isInteger(tk) && tk >= 0 && tk < ASSET_COUNT ? rom.asset(tk) : new Uint8Array(0);
    const body = rom.body(k), cols = 32, rows = Math.floor(body.length / 64);
    const img = new Indexed(cols * 8, rows * 8);
    const tb = bpp * 8, cache = new Map();
    for (let i = 0; i < cols * rows; i++) {
      const e = body[i * 2] | (body[i * 2 + 1] << 8);
      const n = e & 0x3ff, pl = (e >> 10) & 7;
      if (!cache.has(n)) cache.set(n, n * tb + tb <= tiles.length ? decodeTile(tiles, n * tb, bpp) : new Uint8Array(64));
      const px = cache.get(n);
      const bx = (i % cols) * 8, by = Math.floor(i / cols) * 8;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const sx = e & 0x4000 ? 7 - x : x, sy = e & 0x8000 ? 7 - y : y;
          const c = px[sy * 8 + sx];
          img.px[(by + y) * img.w + bx + x] = c ? (bpp === 8 ? c : pl * (1 << bpp) + c + row * 16) : 0;
        }
      }
    }
    paint(canvas, img, pal, { scale: zoom });
    return;
  }
  const sheet = tileSheet(data, bpp, 16);
  paint(canvas, sheet, pal, { scale: zoom, palOffset: bpp === 8 ? 0 : row * 16, zeroTransparent: true, bg: [30, 0, 40] });
}

// ---------------------------------------------------------------- text
function pages(list, startIndex) {
  return `<div class="pages">${list.map((s, i) => `<pre class="page"><span class="idx">#${startIndex + i}</span>${esc(s)}</pre>`).join('')}</div>`;
}

function drawText() {
  if (!english) return;
  const en = english, sections = [];
  const add = (id, title, html) => sections.push({ id, title, html });

  add('intro', 'Intro', pages(en.main.slice(LAYOUT.intro[0], LAYOUT.intro[1] + 1), LAYOUT.intro[0]));

  let html = '';
  for (let m = 0; m < MAP_COUNT; m++) {
    const i = LAYOUT.briefings + m * 4;
    html += `<h3>${m + 1}. MAP-${mapInfo(rom, m).name}</h3>${pages(en.brief.slice(i, i + 4), i)}`;
  }
  add('brief', 'Mission briefings', html);

  html = '';
  LAYOUT.unitInfoTypes.forEach((type) => {
    const u = unitTypes[type], t = unitText(en, type);
    html += `<div class="unitinfo"><div></div><div><h3>${esc(t.name)} <span class="jp">${u.name}</span> <span class="dim mono">${u.code}</span>`
      + `${t.short ? ` · <span class="dim">${esc(oneLine(t.short))}</span>` : ''}</h3>${pages(t.info, 0).replace(/#0|#1|#2/g, '')}</div></div>`;
  });
  add('units', 'Unit info', html);

  html = '<div class="pages">';
  for (let n = 0; n < LAYOUT.terrainNames; n++) {
    html += `<pre class="page"><b>${esc(oneLine(en.main[LAYOUT.terrainName + n]).replace(/- /g, ''))}</b>\n\n${esc(en.main[LAYOUT.terrainDesc + n])}</pre>`;
  }
  add('terrain', 'Terrain', html + '</div>');

  for (const [title, a, b] of LAYOUT.labelSections) add(`l${a}`, title, pages(en.labels.slice(a, b), a));
  add('misc', 'Messages', pages(en.main.slice(0, 5), 0));

  $('textnav').innerHTML = sections.map((s) => `<li data-id="${s.id}">${s.title}</li>`).join('');
  $('textbody').innerHTML = sections.map((s) => `<section class="textsec" id="text-${s.id}"><h2>${s.title}</h2>${s.html}</section>`).join('');
  // Icons for the unit-info entries.
  const icons = $('textbody').querySelectorAll('.unitinfo > div:first-child');
  LAYOUT.unitInfoTypes.forEach((type, i) => icons[i].append(iconCanvas(0, unitTypes[type].gfx, 0, 2)));
  for (const li of $('textnav').children) li.onclick = () => $(`text-${li.dataset.id}`).scrollIntoView({ block: 'start' });
}

// ---------------------------------------------------------------- boot
(async () => {
  const saved = await loadSavedRom();
  if (saved) {
    try { useRom(saved); } catch { await forgetRom(); return; }
    const patch = await loadSavedRom('patch');
    if (patch) { try { usePatch(patch); } catch { /* stale patch: ignore */ } }
  }
})();
