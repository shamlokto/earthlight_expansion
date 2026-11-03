// DEVELOPMENT ONLY (colony.html?stub=1): thin stand-ins for the colony modules that do not exist
// yet, so the interface can be built and tested. Real modules are used wherever they load.
// Delete this file once mapgen.js, state.js, sim.js and view3d/view.js are in the tree.
import { T, TERRAIN } from './data/terrain.js';
import { BUILDING, BUILDINGS, NEEDS } from './data/buildings.js';

const tryImport = (p) => import(p).catch((e) => { console.info('[stub] using a stand-in for', p, '-', e.message); return null; });
const rules = await import('./rules.js');
const [realState, realSim, realView, art] = await Promise.all([tryImport('./state.js'), tryImport('./sim.js'), tryImport('./view3d/view.js'), tryImport('./art.js')]);

// ---------------------------------------------------------------- map
function rand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function generateMap(seed) {
  const w = 256, h = 160, n = w * h, rnd = rand(seed);
  const t = new Uint8Array(n), r = new Uint8Array(n), ch = new Uint8Array(n).fill(255), sv = new Uint8Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    t[i] = y >= 154 ? T.EARTH : y >= 144 ? T.ATMOSPHERE : T.VOID;
    if (t[i] === T.VOID && rnd() < 0.04) t[i] = T.ASTEROID;
    if (t[i] === T.VOID && Math.abs((x - y * 1.2) % 60) < 2) t[i] = T.MAGNETIC;
  }
  const X0 = 48, X1 = 207, Y0 = 32, Y1 = 111;
  const cols = [X0 + 2, 76, 102, 128, 154, 180, X1 - 1], rows = [Y0 + 2, 52, 72, 92, Y1 - 1];
  const chambers = [];
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) t[y * w + x] = T.HULL;
  for (let ry = 0; ry < 4; ry++) for (let cx = 0; cx < 6; cx++) {
    const x0 = cols[cx] + (cx ? 1 : 0), x1 = cols[cx + 1] - 1, y0 = rows[ry] + (ry ? 1 : 0), y1 = rows[ry + 1] - 1;
    const id = chambers.length, kind = ry === 3 && (cx === 2 || cx === 3) ? 'landing' : ['fields', 'river', 'rubble', 'deck'][(cx + ry) % 4];
    let tiles = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * w + x; ch[i] = id; tiles++;
      t[i] = kind === 'deck' ? T.DECK : kind === 'rubble' && rnd() < 0.4 ? T.RUBBLE : rnd() < 0.3 ? T.FERTILE : rnd() < 0.15 ? T.POOR : T.PLAIN;
    }
    chambers.push({ id, name: ['Aster', 'Bryn', 'Cedar', 'Dell', 'Elm', 'Fen', 'Glen', 'Holt', 'Isle', 'Juniper', 'Kestrel', 'Larch', 'Moss', 'Nettle', 'Oak', 'Pine', 'Quill', 'Rowan', 'Sedge', 'Thorn', 'Umber', 'Vale', 'Willow', 'Yarrow'][id] + ' Chamber', kind, x0, y0, x1, y1, tiles, status: 'sealed', breaches: [], work: 0 });
  }
  // bulkheads between chambers, with a gate in each
  for (let cx = 1; cx < 6; cx++) for (let y = Y0 + 2; y <= Y1 - 2; y++) { const i = y * w + cols[cx]; t[i] = (y - 2) % 20 === 10 ? T.GATE : T.BULKHEAD; }
  for (let ry = 1; ry < 4; ry++) for (let x = X0 + 2; x <= X1 - 2; x++) { const i = rows[ry] * w + x; if (t[i] === T.HULL) t[i] = x % 26 === 13 ? T.GATE : T.BULKHEAD; }
  // the river: an east-west meander through the third row
  for (let x = X0 + 2; x <= X1 - 2; x++) {
    const ry = Math.round(80 + 4 * Math.sin(x / 9)); const i = ry * w + x;
    if (ch[i] !== 255) { t[i] = T.RIVER; for (const d of [-w, w]) if (ch[i + d] !== 255 && t[i + d] !== T.RIVER) t[i + d] = T.FERTILE; } else t[i] = T.GATE;
  }
  // breaches: a couple on each non-landing chamber's walls
  for (const c of chambers) {
    if (c.kind === 'landing') continue;
    const k = 1 + Math.floor(rnd() * 3);
    for (let j = 0; j < k; j++) {
      const x = c.x0 + 2 + Math.floor(rnd() * (c.x1 - c.x0 - 4)), y = rnd() < 0.5 ? c.y0 - 1 : c.y1 + 1, i = y * w + x;
      if (t[i] === T.BULKHEAD || t[i] === T.HULL) { t[i] = T.BREACH; for (const d of chambers) if (d.x0 <= x && x <= d.x1 && (d.y0 - 1 === y || d.y1 + 1 === y)) d.breaches.push(i); }
    }
  }
  const landing = chambers.find((c) => c.kind === 'landing');
  landing.status = 'open';
  for (const c of chambers) if (c.kind === 'landing' && c !== landing) c.kind = 'fields';
  for (let y = landing.y0; y <= landing.y1; y++) for (let x = landing.x0; x <= landing.x1; x++) { const i = y * w + x; if (t[i] === T.RUBBLE) t[i] = T.PLAIN; }
  // near space: an asteroid cluster with ore seams by the dock
  const dock = { x: 127, y: Y1 - 1 };
  for (let y = 118; y < 124; y++) for (let x = 112; x < 120; x++) { t[y * w + x] = T.ASTEROID; if (rnd() < 0.2) r[y * w + x] = 1; }
  for (let k = 0; k < 20; k++) { t[(116 + k) * w + 136 + k] = T.MAGNETIC; t[(116 + k) * w + 137 + k] = T.MAGNETIC; t[(116 + k) * w + 138 + k] = T.MAGNETIC; }
  for (const c of chambers) if (c.kind === 'rubble') for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) { const i = y * w + x; if (t[i] === T.RUBBLE) sv[i] = 40; if (rnd() < 0.01) { r[i] = 2; sv[i] = 120; } }
  const command = { x: Math.floor((landing.x0 + landing.x1) / 2) - 1, y: landing.y1 - 5 };
  return { map: { w, h, t, r, ch, sv }, chambers, start: { command, dock, landing: landing.id } };
}

// ---------------------------------------------------------------- state (only while state.js / mapgen.js are missing)
const stubState = {
  newGame({ seed = 1, importSave = null, beta = false, types = null } = {}) {
    const { map, chambers, start } = generateMap(seed);
    const s = { v: 1, seed, title: 'Earthlight Space Colony Rebuild', day: 0, speed: 1, tax: 0.1, map, chambers, buildings: [], nextId: 1,
      stock: { food: 300, water: 300, air: 200, parts: 150, ore: 0, credits: 3000 }, battery: 0, pop: 40, housing: 0, happy: 50, happyParts: [],
      market: { ore: 1, food: 1, parts: 1, water: 1, air: 1 }, unlocked: BUILDINGS.filter((d) => !d.fixed && !d.unlock).map((d) => d.key),
      log: [], pending: [], stats: { last: { produced: {}, consumed: {} } }, imported: null, guardians: [], flags: {} };
    const put = (key, x, y) => s.buildings.push({ id: s.nextId++, key, x, y, level: 1, mode: BUILDING[key].modes?.[0].key ?? null, build: 0, off: false });
    put('command', start.command.x, start.command.y); put('dock', start.dock.x, start.dock.y);
    const L = chambers[start.landing], box = { x0: L.x0, y0: L.y0, x1: L.x1, y1: L.y1 };
    for (const k of ['riverpump', 'farm', 'habitat', 'habitat']) { const p = rules.findSpot(s, k, { box, free: true, score: (x, y) => Math.abs(x - start.command.x) + Math.abs(y - start.command.y) }); if (p) put(k, p.x, p.y); }
    const roster = realState?.readRoster ? realState.readRoster(importSave) : null;
    if (roster) {
      const prices = {}; for (const r of roster) prices[r.type] = rules.unitPrice(types, r.type);
      const credits = beta ? 0 : 10 * roster.reduce((t, r) => t + prices[r.type], 0);
      s.imported = { credits, beta, units: roster.length, prices }; if (beta) s.guardians = structuredClone(roster); s.stock.credits += credits;
    }
    rules.log(s, 'Landfall (stub map).');
    return s;
  },
  saveState: (s) => JSON.stringify({ ...s, map: { ...s.map, ...Object.fromEntries(['t', 'r', 'ch', 'sv'].map((k) => [k, btoa(String.fromCharCode(...s.map[k]))])) } }),
  loadState(text) { const s = JSON.parse(text); for (const k of ['t', 'r', 'ch', 'sv']) s.map[k] = Uint8Array.from(atob(s.map[k]), (c) => c.charCodeAt(0)); return s; },
};

// ---------------------------------------------------------------- sim (only while sim.js is missing)
const stubSim = {
  dayTick(s, rng) {
    s.day++;
    const events = [];
    let crews = rules.crewsOf(s);
    for (const b of s.buildings) if (b.build > 0 && crews > 0) { crews--; if (--b.build === 0) { rules.log(s, `${BUILDING[b.key].name} finished.`); events.push({ kind: 'built', text: `${BUILDING[b.key].name} finished.` }); } }
    for (const c of s.chambers) if (c.work > 0 && --c.work === 0) { c.status = c.status === 'surveying' ? 'surveyed' : 'open'; rules.log(s, `${c.name} ${c.status}.`); }
    const staff = rules.staffingOf(s), pw = rules.powerOf(s, staff), pf = pw.demand ? Math.min(1, pw.supply / pw.demand) : 1;
    const prod = {}, cons = {}, add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
    for (const b of s.buildings) {
      if (!rules.active(b)) continue;
      const d = rules.spec(b), f = (d.jobs ? staff : 1) * (d.power < 0 ? pf : 1);
      for (const [k, v] of Object.entries(d.makes || {})) add(prod, k, v * f);
      for (const [k, v] of Object.entries(d.uses || {})) add(cons, k, v * f);
      if (d.upkeep) add(cons, 'credits', d.upkeep);
    }
    for (const g of ['food', 'water', 'air']) add(cons, g, s.pop * NEEDS[g]);
    add(prod, 'credits', s.pop * 0.3 * s.tax / 0.1);
    const cap = rules.storageCaps(s), met = {};
    for (const g of ['food', 'water', 'air', 'parts', 'ore', 'credits']) {
      const v = s.stock[g] + (prod[g] || 0) - (cons[g] || 0);
      met[g] = v >= 0; s.stock[g] = Math.max(0, g === 'credits' ? v : Math.min(cap[g] || 0, v));
    }
    met.power = pf >= 1;
    s.housing = rules.housingOf(s);
    const tax = s.tax <= 0.1 ? 8 - 80 * s.tax : s.tax <= 0.2 ? -140 * (s.tax - 0.1) : -14 - 180 * (s.tax - 0.2);
    s.happyParts = [{ label: 'Base', value: 50 }, ...['food', 'water', 'air', 'power'].map((g) => ({ label: `${g[0].toUpperCase() + g.slice(1)} ${met[g] ? 'met' : 'short'}`, value: met[g] ? 6 : -20 })),
      { label: s.pop <= s.housing ? 'Housing met' : 'Housing short', value: s.pop <= s.housing ? 6 : -20 }, { label: `Tax ${Math.round(s.tax * 100)}%`, value: Math.round(tax) }];
    s.happy = Math.max(0, Math.min(100, s.happyParts.reduce((t, p) => t + p.value, 0)));
    if (s.day % 10 === 0 && s.happy >= 55 && s.housing > s.pop) { const k = 8 + Math.floor(rng() * 12); s.pop += k; rules.log(s, `A transport docks: ${k} colonists arrive.`); events.push({ kind: 'arrival', text: `${k} colonists arrive.` }); }
    if (s.pop >= 80) for (const d of BUILDINGS) if (d.unlock && !s.unlocked.includes(d.key)) s.unlocked.push(d.key);
    for (const g in s.market) s.market[g] += (1 - s.market[g]) * 0.05;
    s.stats.last = { produced: prod, consumed: cons, met, power: { factor: pf } };
    if (s.day === 3 || s.day % 25 === 0) {
      rules.addPending(s, 'Crisis', 'A burst main in the landing chamber', 'Prof. Ruess: "A water main has burst under the fields. I can patch it now for 40 parts, or we let it flood and lose a day of water."', [{ key: 'patch', label: 'Patch it (40 parts)' }, { key: 'flood', label: 'Let it flood' }]);
      events.push({ kind: 'crisis', text: 'A burst main', pause: true });
    }
    return { events };
  },
};

// ---------------------------------------------------------------- view (only while view3d/view.js is missing): a flat top-down canvas
function createStubView(container, { onTileClick, onTileHover } = {}) {
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  cv.style.cssText = 'width:100%;height:100%;display:block;background:#02030d';
  container.append(cv);
  let S = null, scale = 8, cx = 128, cy = 90, ghost = null, ovl = null, ovlData = null, dirty = true, alive = true, hov = null;
  const COL = { core: '#f5c542', power: '#6fd3ff', life: '#5aa8ff', food: '#8fe38a', industry: '#ff9a52', homes: '#ff8fd8' };
  const resize = () => { const r = container.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; dirty = true; };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  const toTile = (e) => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left - r.width / 2) / scale + cx), Math.floor((e.clientY - r.top - r.height / 2) / scale + cy)]; };
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, cx, cy, moved: false, b: e.button }; });
  cv.addEventListener('pointermove', (e) => {
    if (drag && drag.b === 0 && (e.buttons & 1)) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 4) drag.moved = true; if (drag.moved) { cx = drag.cx - dx / scale; cy = drag.cy - dy / scale; dirty = true; } }
    const [x, y] = toTile(e); if (!hov || hov[0] !== x || hov[1] !== y) { hov = [x, y]; onTileHover?.(x, y); }
  });
  cv.addEventListener('pointerup', (e) => { if (drag && !drag.moved) { const [x, y] = toTile(e); onTileClick?.(x, y, e.button); } drag = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); scale = Math.max(2, Math.min(40, scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); dirty = true; }, { passive: false });
  function draw() {
    if (!alive) return;
    requestAnimationFrame(draw);
    if (!dirty || !S) return; dirty = false;
    const W = cv.width, H = cv.height, k = scale * devicePixelRatio, { w, h, t, ch } = S.map;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#02030d'; g.fillRect(0, 0, W, H);
    g.setTransform(k, 0, 0, k, W / 2 - cx * k, H / 2 - cy * k);
    const x0 = Math.max(0, Math.floor(cx - W / 2 / k)), x1 = Math.min(w - 1, Math.ceil(cx + W / 2 / k)), y0 = Math.max(0, Math.floor(cy - H / 2 / k)), y1 = Math.min(h - 1, Math.ceil(cy + H / 2 / k));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * w + x, c = ch[i] !== 255 ? S.chambers[ch[i]] : null;
      g.fillStyle = TERRAIN[t[i]].color; g.globalAlpha = c && c.status === 'sealed' ? 0.25 : c && c.status !== 'open' ? 0.55 : 1; g.fillRect(x, y, 1.02, 1.02);
      if (ovlData && ovlData[i] > 0) { g.globalAlpha = 0.5; g.fillStyle = ovl === 'power' ? (ovlData[i] >= 1 ? '#7dffb0' : '#ff5a5a') : ovl === 'reach' ? '#6fd3ff' : `hsl(${100 + ovlData[i] * 10},80%,60%)`; g.fillRect(x, y, 1, 1); }
    }
    g.globalAlpha = 1;
    for (const b of S.buildings) {
      const d = BUILDING[b.key]; g.fillStyle = COL[d.cat]; g.globalAlpha = b.build ? 0.45 : b.off ? 0.3 : 0.95;
      g.fillRect(b.x + 0.1, b.y + 0.1, d.size - 0.2, d.size - 0.2); g.globalAlpha = 1; g.strokeStyle = '#000'; g.lineWidth = 0.08; g.strokeRect(b.x + 0.1, b.y + 0.1, d.size - 0.2, d.size - 0.2);
    }
    if (ghost && ghost.key) { const n = BUILDING[ghost.key].size; g.fillStyle = ghost.ok ? 'rgba(80,255,140,.5)' : 'rgba(255,70,70,.5)'; g.fillRect(ghost.x, ghost.y, n, n); g.strokeStyle = ghost.ok ? '#7dffb0' : '#ff5a5a'; g.lineWidth = 0.12; g.strokeRect(ghost.x, ghost.y, n, n); }
  }
  requestAnimationFrame(draw);
  return {
    setState(s) { S = s; dirty = true; }, refresh(s) { S = s; dirty = true; },
    setOverlay(name, data) { ovl = name; ovlData = name ? data || rules.coverage(S, name) : null; dirty = true; },
    setGhost(key, x, y, ok) { ghost = key ? { key, x, y, ok } : null; dirty = true; },
    focus(x, y) { cx = x; cy = y; scale = 14; dirty = true; }, setSnap() { }, destroy() { alive = false; ro.disconnect(); cv.remove(); },
  };
}

export const modules = {
  state: realState || stubState,
  rules,
  sim: realSim || stubSim,
  view: realView || { createView: createStubView },
  art,
};
