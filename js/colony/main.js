// Earthlight Space Colony Rebuild: page wiring (colony.html). Title screen, the new-colony dialog
// (seed, expansion save import, beta guardians), the game loop (live days, decisions pause the
// clock: docs/COLONY.md §4), placement mode, keyboard, saving, the How to play dialog and the goals'
// "Show me". Panels live in js/colony/ui.js.
// Contract: docs/COLONY-V1.md.
import { parseSave, mountSaveButtons } from '../savefile.js';
import { BUILDING } from './data/buildings.js';
import { createUI, esc, helpHtml } from './ui.js';

const KEY = 'el-colony', SETTINGS_KEY = 'el-colony-settings', HELP_SEEN = 'el-colony-help-seen';
// Fallback when js/colony/difficulty.js is missing: the dialog still offers the choice.
const DIFF_FALLBACK = { easy: { name: 'Easy', text: 'Recommended for a first colony.' }, normal: { name: 'Normal', text: 'The colony as designed.' } };
const $ = (s) => document.querySelector(s);

let M = null;                 // { state: stateMod, rules, sim, view: viewMod, art }
let state = null, view = null, ui = null, types = null;
let placing = null;           // { key, moveId }
let lastKey = null, hover = null, lastSpeed = 1, overlay = null, overlayDay = -1;
let raf = 0, last = 0, acc = 0, pointer = { x: 0, y: 0 };
const settings = loadSettings();

function loadSettings() {
  const d = { pauseOnEvents: true, snap: false };
  try { return { ...d, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return d; }
}
function storeSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { } }

// ---------------------------------------------------------------- modules
async function loadModules() {
  const [stateMod, rules, sim, viewMod, artMod, goals, difficulty] = await Promise.all([
    import('./state.js'), import('./rules.js'), import('./sim.js'), import('./view3d/view.js'),
    import('./art.js').catch(() => null),
    import('./goals.js').catch((e) => { console.warn('goals.js not loaded', e); return null; }),
    import('./difficulty.js').catch(() => null),
  ]);
  return { state: stateMod, rules, sim, view: viewMod, art: artMod, goals, difficulty };
}
const art = (slot) => { try { return M?.art?.art?.(slot) || null; } catch { return null; } };
const DIFF = () => M?.difficulty?.DIFFICULTY || DIFF_FALLBACK;
const diffOf = (s) => { try { return M?.difficulty?.diffOf?.(s) || null; } catch { return null; } };
// A cost as this colony pays it (difficulty-scaled), whatever rules.js offers.
const costOf = (cost) => { try { return M.rules.costOf?.(state, cost) || cost; } catch { return cost; } };

async function loadTypes() {
  if (types) return types;
  try {
    const j = await (await fetch('js/expansion/data/units.json')).json();
    types = {}; for (const u of j.units || []) types[u.type] = u;
  } catch { types = null; }
  return types;
}

// ---------------------------------------------------------------- seeded randomness
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rngFor = (s) => mulberry32((hashStr(s.seed) ^ Math.imul(s.day + 1, 0x9E3779B1)) >>> 0);

// ---------------------------------------------------------------- title screen
function showTitle() {
  stopLoop();
  $('#sGame').hidden = true; $('#sTitle').hidden = false;
  const saved = localStorage.getItem(KEY);
  $('#bContinue').hidden = !saved;
  const info = $('#contInfo');
  info.hidden = true;
  if (saved && M) {
    try { const s = M.state.loadState(saved); info.textContent = `Day ${s.day} · ${s.pop} colonists · ${Math.round(s.stock?.credits ?? 0)} credits${s.difficulty && DIFF()[s.difficulty] ? ' · ' + DIFF()[s.difficulty].name : ''}`; info.hidden = false; } catch { }
  }
  const url = art('title/rebuild');
  $('#titleArt').style.backgroundImage = url ? `url("${url}")` : '';
  $('#titleArt').classList.toggle('painted', !!url);
}

let importData = null, importName = '';
// The expansion campaigns kept in this browser (js/expansion/campaign.js CAMPAIGNS keys): the
// colony follows straight on from them, no save file needed (owner: part of the campaign).
const EXPANSION = { remnant: ['el-expansion-campaign-remnant', 'Galt remnant'], classic: ['el-expansion-campaign', 'Classic campaign'] };
function browserCampaign(prefer) {
  for (const id of [prefer, 'remnant', 'classic']) {
    const [key, title] = EXPANSION[id] || [];
    let raw = null; try { raw = key && localStorage.getItem(key); } catch { }
    if (raw && rosterOf({ [key]: raw })) return { data: { [key]: raw }, name: `This browser's ${title}` };
  }
  return null;
}
function newDialog(prefer) {
  importData = null;
  $('#nSeed').value = ''; $('#nBeta').checked = false; $('#nFile').value = '';
  renderDifficulty();
  const here = browserCampaign(prefer);
  $('#nHere').hidden = !here;
  if (here && typeof prefer === 'string') { importData = here.data; importName = here.name; }   // arrived from the expansion
  showFound();
  $('#dNew').showModal();
}

// Easy (the default, beta testers too) or Normal, one line each from js/colony/difficulty.js.
function renderDifficulty() {
  const D = DIFF(), box = $('#nDiff');
  box.innerHTML = Object.entries(D).map(([k, d]) => `<label class="cl-diff"><input type="radio" name="diff" value="${esc(k)}" ${k === 'easy' ? 'checked' : ''}>
    <span><b>${esc(d.name || k)}</b>${k === 'easy' ? ' <em>recommended for a first colony</em>' : ''}<small>${esc(k === 'easy' ? cap((d.text || '').replace(/^recommended for a first colony[:.]?\s*/i, '')) : d.text || '')}</small></span></label>`).join('');
}
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const chosenDifficulty = () => document.querySelector('#nDiff input:checked')?.value || 'easy';

function rosterOf(data) {
  const raw = data?.['el-expansion-campaign-remnant'] ?? data?.['el-expansion-campaign'];
  if (!raw) return null;
  try { const c = JSON.parse(raw); return Array.isArray(c.roster) ? c.roster : null; } catch { return null; }
}

async function showFound(err) {
  const el = $('#nFound');
  if (err) { el.innerHTML = `<span class="cl-bad">${esc(err)}</span>`; return; }
  if (!importData) { el.textContent = 'No save: the base start (3000 credits, no machines).'; return; }
  const roster = rosterOf(importData);
  if (!roster) { el.innerHTML = '<span class="cl-bad">This save has no expansion campaign: nothing to bring.</span>'; return; }
  const ty = await loadTypes();
  const value = ty ? roster.reduce((t, r) => t + (ty[r.type] ? Math.max(1, ty[r.type].value) * ty[r.type].hp : 0), 0) : null;
  const beta = $('#nBeta').checked;
  const names = ty ? roster.slice(0, 8).map((r) => ty[r.type]?.name || '?').join(', ') + (roster.length > 8 ? '…' : '') : '';
  el.innerHTML = `<small>${esc(importName)}</small><br>Found <b>${roster.length} machine${roster.length === 1 ? '' : 's'}</b>${names ? ` <small>(${esc(names)})</small>` : ''}.<br>`
    + (beta ? `They come along as <b>guardians</b>: no extra credits.`
      : `Sold to pay for the rebuild: <b class="cl-good">+${value != null ? (value * 10).toLocaleString() : '?'} credits</b> at the start.`);
}

async function startNew() {
  const raw = $('#nSeed').value.trim();
  const seed = raw === '' ? (Math.random() * 1e9) >>> 0 : /^\d+$/.test(raw) ? +raw : hashStr(raw);
  const beta = $('#nBeta').checked;
  boot(true);
  await new Promise((r) => setTimeout(r, 30));      // let "Preparing Eden" paint before map generation
  try {
    const ty = await loadTypes();
    const s = M.state.newGame({ seed, importSave: importData, beta, types: ty, difficulty: chosenDifficulty() });
    startGame(s, true);
  } catch (e) { console.error(e); $('#loadErr').textContent = 'Could not start a colony: ' + e.message; boot(false); }
}

function continueGame() {
  try { const s = M.state.loadState(localStorage.getItem(KEY)); loadTypes(); startGame(s); }
  catch (e) { console.error(e); $('#loadErr').textContent = 'The saved colony could not be loaded: ' + e.message; }
}

function boot(on) { $('#boot').hidden = !on; }

// ---------------------------------------------------------------- game screen
let fresh = false;   // a brand-new colony: the welcome leads into the goals (first run)
function startGame(s, isNew = false) {
  state = s; fresh = isNew;
  if (!state.speed && state.speed !== 0) state.speed = 1;
  lastSpeed = state.speed || 1;
  $('#sTitle').hidden = true; $('#sGame').hidden = false;
  if (view) { try { view.destroy(); } catch { } view = null; }
  $('#view').innerHTML = '';
  try {
    view = M.view.createView($('#view'), { onTileClick, onTileHover });
    view.setState(state);
    view.setSnap?.(settings.snap);
    view.setSpeed?.(state.speed ?? 1);
    const cc = state.buildings.find((b) => b.key === 'command');
    if (cc) view.focus?.(cc.x + 1, cc.y + 1);
  } catch (e) {
    console.error(e);
    $('#view').innerHTML = `<div class="cl-noview">The 3D view could not start (${esc(e.message)}). WebGL may be off in this browser.</div>`;
    view = null;
  }
  if (ui) ui.destroy();
  ui = createUI($('#ui'), api);
  overlay = null; placing = null; hover = null;
  ui.update(true);
  boot(false);
  startLoop();
}

const api = {
  state: () => state,
  get rules() { return M.rules; },
  get sim() { return M.sim; },
  art,
  get types() { return types; },
  settings,
  act: (r) => afterAction(r),
  pick: (key) => setPlacing(key ? { key } : null),
  move: (id) => { const b = state.buildings.find((x) => x.id === id); if (b) setPlacing({ key: b.key, moveId: id }); },
  placingKey: () => placing && !placing.moveId ? placing.key : null,
  setSpeed,
  setOverlay: (name) => { overlay = name; applyOverlay(); },
  save: () => save(true),
  toTitle: () => {
    save(false);
    setPlacing(null);
    if (view) { try { view.destroy(); } catch { } view = null; }   // stop rendering behind the title
    showTitle();
  },
  focus: (x, y) => view?.focus?.(x, y),
  get goals() { return M?.goals || null; },
  diff: diffOf,
  show: (sh) => doShow(sh),
  help: () => openHelp(),
  answered: (p) => {
    if (p?.kind === 'welcome' && fresh) {
      fresh = false;
      let seen = false; try { seen = !!localStorage.getItem(HELP_SEEN); } catch { }
      ui.welcomeDone(!seen);
    }
  },
  setSetting: (k, v) => { settings[k] = v; storeSettings(); if (k === 'snap') view?.setSnap?.(v); },
};

function afterAction(r, quiet) {
  ui.changed?.();
  if (r && r.ok === false) ui.toast(r.msg || 'Not possible.', 'bad');
  else if (r?.msg && !quiet) ui.toast(r.msg, 'good');
  try { view?.refresh(state); } catch (e) { console.error(e); }
  if (overlay) applyOverlay();
  ui.update();
  return r;
}

function applyOverlay() {
  if (!view) return;
  let data = null;
  if (overlay) { try { data = M.rules.coverage(state, overlay); } catch { } }
  try { view.setOverlay(overlay, data); } catch (e) { console.error(e); }
  overlayDay = state.day;
}

function setSpeed(s) {
  if (!state) return;
  if (s > 0) lastSpeed = s;
  state.speed = s; acc = 0;
  ui?.setSpeed(s);
  try { view?.setSpeed?.(s); } catch { }   // movers freeze when paused, hurry at x2/x4
}

function save(announce) {
  if (!state) return;
  try { localStorage.setItem(KEY, M.state.saveState(state)); if (announce) ui?.toast(`Colony saved (day ${state.day}).`, 'good'); }
  catch (e) { console.error(e); ui?.toast('Could not save: ' + e.message, 'bad'); }
}

// ---------------------------------------------------------------- "Show me" (goals and advisor)
// show: { build: key } | { chamber: id } | { tile: { x, y } } | { market: true } | { roads: true }
function doShow(sh) {
  if (!sh || !state) return;
  ui.closePops();
  if (sh.market) { setPlacing(null); ui.openMarket(); const d = state.buildings.find((b) => b.key === 'dock'); if (d) view?.focus?.(d.x + 1, d.y + 1); return; }
  if (sh.roads) {
    ui.openBuild('road'); setPlacing({ key: 'road' });
    ui.toast('Roads: click where the road starts, then where it ends.', '');
    return;
  }
  if (sh.build) {
    const key = sh.build;
    if (!BUILDING[key]) return;
    ui.openBuild(key);
    setPlacing({ key });
    const spot = lastSpot = suggestSpot(key);
    if (spot) {
      const o = Math.floor(((BUILDING[key].size || 1) - 1) / 2);
      view?.focus?.(spot.x + o, spot.y + o);
      try { view?.setGhost(key, spot.x, spot.y, M.rules.canBuild(state, key, spot.x, spot.y) == null); } catch { }
      ui.toast(`${BUILDING[key].name}: a good spot is marked. Click it, or any spot where the ghost turns green.`, '');
    } else ui.toast(`${BUILDING[key].name}: move over the map; green means you can build there.`, '');
    return;
  }
  setPlacing(null);
  if (sh.chamber != null) {
    const c = state.chambers.find((k) => k.id === sh.chamber); if (!c) return;
    const t = tileOfChamber(c);
    view?.focus?.(t.x, t.y);
    ui.inspect(t.x, t.y);
    return;
  }
  if (sh.tile) { view?.focus?.(sh.tile.x, sh.tile.y); ui.inspect(sh.tile.x, sh.tile.y); }
}

// A floor tile of the chamber nearest its middle (the middle itself may be a wall).
function tileOfChamber(c) {
  const { w, ch } = state.map, mx = (c.x0 + c.x1) / 2, my = (c.y0 + c.y1) / 2;
  let best = { x: Math.round(mx), y: Math.round(my) }, bd = Infinity;
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
    if (ch[y * w + x] !== c.id) continue;
    const d = (x - mx) ** 2 + (y - my) ** 2;
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}

// Where a new player might put `key`: near the Command Centre; farms on the best soil, seals on
// the next open breach. Null when nothing fits (the ghost then says why wherever the pointer is).
function suggestSpot(key) {
  const R = M.rules, d = BUILDING[key];
  try {
    if (key === 'seal' && R.openBreaches) {
      for (const c of state.chambers) {
        if (c.status !== 'surveyed') continue;
        for (const i of R.openBreaches(state, c)) {
          const x = i % state.map.w, y = (i / state.map.w) | 0;
          if (R.placeCheck ? R.placeCheck(state, 'seal', x, y, { free: true }) == null : true) return { x, y };
        }
      }
      return null;
    }
    if (!R.findSpot || key === 'road') return null;
    const cc = state.buildings.find((b) => b.key === 'command'), n = d.size || 1;
    const cx = cc ? cc.x + 1.5 : state.map.w / 2, cy = cc ? cc.y + 1.5 : state.map.h / 2;
    const dist = (x, y) => Math.abs(x + n / 2 - cx) + Math.abs(y + n / 2 - cy);
    let score = dist;
    if (key === 'farm' && M.sim.farmSoil) score = (x, y) => -M.sim.farmSoil(state, { key, x, y }) * 100 + dist(x, y);
    if (key === 'park' || key === 'grove') {   // beside the homes
      const homes = state.buildings.filter((b) => b.key === 'habitat');
      if (homes.length) score = (x, y) => Math.min(...homes.map((h) => Math.abs(h.x - x) + Math.abs(h.y - y))) * 3 + dist(x, y) * 0.2;
    }
    return R.findSpot(state, key, { score, free: true });
  } catch (e) { console.warn('suggestSpot', e); return null; }
}

let lastSpot = null;   // the last spot "Show me" marked (tests read it through window.__colony)

// ---------------------------------------------------------------- How to play
let helpPaused = false;
function openHelp(section) {
  const dlg = $('#dHelp');
  $('#helpBody').innerHTML = helpHtml(art, (state && diffOf(state)) || DIFF().easy || null);
  try { localStorage.setItem(HELP_SEEN, '1'); } catch { }
  if (state && !$('#sGame').hidden && state.speed > 0) { helpPaused = true; setSpeed(0); }   // reading costs no days
  if (!dlg.open) dlg.showModal();
  const body = $('#helpBody [data-hbody]');
  if (section) $(`#help-${section}`)?.scrollIntoView();
  else if (body) body.scrollTop = 0;
}
function helpClosed() {
  if (helpPaused && state) setSpeed(lastSpeed || 1);
  helpPaused = false;
}

// ---------------------------------------------------------------- placement
function setPlacing(p) {
  if (placing?.roadStart) applyOverlay();   // drop the road preview
  placing = p;
  if (p && !p.moveId) lastKey = p.key;
  ui.setPlacing(p?.key || null, !!p?.moveId);
  if (p) { ui.closeInspector(); if (hover) ghostAt(hover.x, hover.y); }
  else { try { view?.setGhost(null, 0, 0, false); } catch { } ui.tip(null); }
  $('#view').classList.toggle('placing', !!p);
}

// The footprint is centred on the pointer; (x, y) of a building is its top-left tile.
const origin = (key, x, y) => { const n = BUILDING[key]?.size || 1, o = Math.floor((n - 1) / 2); return { x: x - o, y: y - o }; };

function placeCheck(x, y) {
  const o = origin(placing.key, x, y);
  let why;
  if (placing.moveId) {
    const r = (() => { try { const c = structuredClone(state); return M.rules.move(c, placing.moveId, o.x, o.y); } catch (e) { return { ok: false, msg: e.message }; } })();
    why = r && r.ok === false ? r.msg || 'Cannot move here.' : null;
  } else {
    try { why = M.rules.canBuild(state, placing.key, o.x, o.y); } catch (e) { why = e.message; }
  }
  return { ...o, why };
}

// Roads go down as a line: the first click fixes the start, the second builds an L to the end.
function roadPreview(x, y) {
  const s0 = placing.roadStart, plan = M.rules.planRoad(state, s0.x, s0.y, x, y), d = { cost: costOf(BUILDING.road.cost) };
  const { w, h } = state.map, v = new Float32Array(w * h);
  let fresh = 0, blocked = 0;
  for (const p of plan) { v[p.y * w + p.x] = p.why == null ? 1 : p.why === 'have' ? 0.6 : 0.15; if (p.why == null) fresh++; else if (p.why !== 'have') blocked++; }
  try { view?.setOverlay('roadplan', v); view?.setGhost('road', x, y, fresh > 0); } catch (e) { console.error(e); }
  const cost = `${fresh * d.cost.credits} cr · ${fresh * d.cost.parts} parts`;
  ui.tip(`<b>Road</b> <small>${fresh} tiles · ${cost}</small><br>${fresh ? '<span class="ok">✓ Click to lay it</span>' : '<span class="no">✗ Nothing to build on this line</span>'}${blocked ? `<br><small>${blocked} tiles skipped</small>` : ''}`, pointer.x, pointer.y, fresh > 0);
}

function ghostAt(x, y) {
  if (placing.key === 'road' && placing.roadStart) return roadPreview(x, y);
  const c = placeCheck(x, y);
  try { view?.setGhost(placing.key, c.x, c.y, c.why == null); } catch (e) { console.error(e); }
  const d = BUILDING[placing.key], dc = costOf(d.cost);
  const cost = placing.moveId ? `move: ${Math.ceil((dc.credits || 0) * 0.2)} cr` : [dc.credits ? `${dc.credits} cr` : '', dc.parts ? `${dc.parts} parts` : ''].filter(Boolean).join(' · ');
  const verb = placing.moveId ? 'move' : placing.key === 'road' ? 'start the road here' : 'build';
  ui.tip(`<b>${esc(d.name)}</b> <small>${esc(cost)}${placing.key === 'road' ? ' a tile' : ''}</small><br>${c.why == null ? '<span class="ok">✓ Click to ' + verb + '</span>' : `<span class="no">✗ ${esc(c.why)}</span>`}`, pointer.x, pointer.y, c.why == null);
}

function onTileHover(x, y) {
  if (x == null || y == null || x < 0 || y < 0) { hover = null; ui?.tip(null); return; }
  hover = { x, y };
  if (placing) ghostAt(x, y);
}

function onTileClick(x, y, button) {
  if (!state || x == null || x < 0) return;
  if (button === 2) { if (placing) setPlacing(null); return; }
  if (placing && placing.key === 'road' && !placing.moveId) {
    if (!placing.roadStart) {
      const why = M.rules.canBuild(state, 'road', x, y);
      if (why && !state.buildings.some((b) => b.key === 'road' && b.x === x && b.y === y)) { ui.toast(why, 'bad'); return; }
      placing.roadStart = { x, y };   // a road may also start from an existing road tile
      roadPreview(x, y);
      return;
    }
    const s0 = placing.roadStart, r = M.rules.buildRoad(state, s0.x, s0.y, x, y);
    afterAction(r, true);
    if (r?.ok !== false) ui.toast(r.msg, 'good');
    placing.roadStart = null; applyOverlay();
    if (!shiftHeld && r?.ok !== false) setPlacing(null); else ghostAt(x, y);
    return;
  }
  if (placing) {
    const { x: ox, y: oy } = origin(placing.key, x, y);
    const r = placing.moveId ? M.rules.move(state, placing.moveId, ox, oy) : M.rules.build(state, placing.key, ox, oy);
    afterAction(r, true);
    if (r?.ok !== false) {
      ui.toast(placing.moveId ? `${BUILDING[placing.key].name} moved.` : `${BUILDING[placing.key].name} ordered.`, 'good');
      if (!shiftHeld || placing.moveId) setPlacing(null); else ghostAt(x, y);
    }
    return;
  }
  ui.closePops();
  ui.inspect(x, y);
}

// ---------------------------------------------------------------- input
let shiftHeld = false, downAt = null;
function onKey(e) {
  shiftHeld = e.shiftKey;
  if (e.type !== 'keydown') return;
  if ((e.key === 'F1' || (e.key === '?' && !e.target.closest?.('input, textarea, select'))) && !$('#dNew').open) {
    e.preventDefault();
    if ($('#dHelp').open) $('#dHelp').close(); else openHelp();
    return;
  }
  if ($('#dHelp').open) return;
  if (!state || $('#sGame').hidden) return;
  if (e.target.closest?.('input, textarea, select') && e.key !== 'Escape') return;
  if (ui.eventOpen() && settings.pauseOnEvents && e.key !== 'Escape') return;
  switch (e.key) {
    case ' ': e.preventDefault(); setSpeed(state.speed ? 0 : lastSpeed || 1); break;
    case '1': setSpeed(1); break;
    case '2': setSpeed(2); break;
    case '3': setSpeed(4); break;
    case 'r': case 'R': if (!e.ctrlKey && !e.metaKey && lastKey) api.pick(lastKey); break;
    case 'Escape':
      if (placing?.roadStart) { placing.roadStart = null; applyOverlay(); if (hover) ghostAt(hover.x, hover.y); }
      else if (placing) setPlacing(null);
      else if (!ui.closePops() && ui.inspecting()) ui.closeInspector();
      break;
  }
}
addEventListener('keydown', onKey);
addEventListener('keyup', (e) => { shiftHeld = e.shiftKey; });
const viewEl = $('#view');
viewEl.addEventListener('pointermove', (e) => { pointer = { x: e.clientX, y: e.clientY }; }, true);   // capture: before the view reports the hover
viewEl.addEventListener('pointerleave', () => ui?.tip(null));
viewEl.addEventListener('contextmenu', (e) => e.preventDefault());
// right-click (without dragging the camera) cancels placement, whatever the view reports
viewEl.addEventListener('pointerdown', (e) => { if (e.button === 2) downAt = { x: e.clientX, y: e.clientY }; });
viewEl.addEventListener('pointerup', (e) => {
  if (e.button === 2 && downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && placing) setPlacing(null);
  downAt = null;
});

// ---------------------------------------------------------------- loop
function tick() {
  let res = null;
  try { res = M.sim.dayTick(state, rngFor(state)); } catch (e) { console.error(e); setSpeed(0); ui.toast('The simulation stopped: ' + e.message, 'bad'); return; }
  try { view?.refresh(state); } catch (e) { console.error(e); }
  if (overlay && state.day - overlayDay >= 5) applyOverlay();
  for (const ev of res?.events || []) if (ev?.text && !ev.pause && ev.kind !== 'log') ui.toast(ev.text, ev.kind === 'bad' || ev.kind === 'death' ? 'bad' : '');
  if (state.day > 0 && state.day % 10 === 0) save(false);
  if (placing && hover) ghostAt(hover.x, hover.y);
  ui.update();
}

function frame(t) {
  const dt = Math.min(250, t - (last || t)); last = t;
  if (state) {
    const blocked = settings.pauseOnEvents && state.pending?.length > 0;
    if (state.speed > 0 && !blocked) {
      acc += dt;
      const step = 1000 / state.speed;
      let n = 0;
      while (acc >= step && n < 4) {
        acc -= step; n++;
        tick();
        if (settings.pauseOnEvents && state.pending?.length) { acc = 0; break; }
      }
    } else acc = 0;
  }
  raf = requestAnimationFrame(frame);
}
function startLoop() { stopLoop(); last = 0; acc = 0; raf = requestAnimationFrame(frame); }
function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

// ---------------------------------------------------------------- start
async function main() {
  mountSaveButtons($('#saveIO'), 'cl-btn sm');
  $('#bNew').onclick = () => newDialog();
  $('#nHere').onclick = () => { const h = browserCampaign(); if (h) { importData = h.data; importName = h.name; showFound(); } };
  $('#bContinue').onclick = continueGame;
  $('#nFile').onchange = async () => {
    const f = $('#nFile').files[0]; if (!f) return;
    try { importData = parseSave(await f.text()).data; importName = f.name; await showFound(); }
    catch (e) { importData = null; showFound(e.message); }
  };
  $('#nBeta').onchange = () => showFound();
  $('#bHelp').onclick = () => openHelp();
  $('#dHelp').addEventListener('close', helpClosed);
  $('#dHelp').addEventListener('click', (e) => {
    if (e.target === $('#dHelp')) { $('#dHelp').close(); return; }   // a click on the backdrop
    const a = e.target.closest('[data-help]');
    if (a) { e.preventDefault(); $(`#help-${a.dataset.help}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  $('#fNew').addEventListener('submit', (e) => { if (e.submitter?.value === 'go') { e.preventDefault(); $('#dNew').close(); startNew(); } });
  showTitle();
  try { M = await loadModules(); }
  catch (e) {
    console.error(e);
    $('#loadErr').textContent = 'The colony modules could not be loaded: ' + e.message;
    $('#bNew').disabled = true; $('#bContinue').disabled = true;
    return;
  }
  showTitle();
  window.__colony = { get state() { return state; }, get view() { return view; }, get M() { return M; }, get lastSpot() { return lastSpot; }, tick, setSpeed, settings };
  // colony.html?from=remnant|classic: straight on from the expansion's ending, its army already found
  const from = new URLSearchParams(location.search).get('from');
  if (from && EXPANSION[from]) newDialog(from);
}
main();
