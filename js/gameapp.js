// The game: title, story, briefings, the 30-mission campaign and its results, put
// together from the decoded pieces (maps, scenario tables, map scripts, rules, AI, fight
// scenes, text). As in the original, units and levels don't carry over between maps:
// every mission starts from the ROM's own deployment.
import { Rom } from './rom.js';
import { paint } from './gfx.js';
import { MAP_COUNT, mapInfo, battlePalette, renderMap } from './maps.js';
import { allUnitTypes } from './units.js';
import { applyBps } from './bps.js';
import { readEnglish, LAYOUT, unitText } from './text.js';
import { paintLookArt, lookOf, lookSlot, typeIcon } from './look.js';
import { ownArt, ownIcon } from './art/own.js';
import { terrainCardHtml } from './terraincard.js';
import { cellTerrain } from './terraininfo.js';
import { readRomFile, readPatchFile } from './romfile.js';
import { Battle, NEUTRAL, TRANSFORM } from './game/rules.js';
import { scenario } from './game/scenario.js';
import { WIN_LINE, scriptFor } from './game/scripts.js';
import { aiTurn } from './game/ai.js';
import { mapPoints, rankOf, rankName } from './game/points.js';
import { LABEL as EV, COMET_MAP, inLane, detachBurner, decimator, blast } from './game/events.js';
import { FightScene } from './game/fightscene.js';
import { FightRenderer, fightScale } from './render/fightfx.js';
import { Sound, mapMusic, SONGS, briefingSong } from './audio/sound.js';
import { drawScreen } from './screens.js';
import { Board } from './render/board.js';
import { loadProgress, saveProgress, saveBattle, savedBattle, clearSavedBattle, restoreBattle } from './game/savegame.js';
import { expansionFromUrl } from './expansion/battle.js';
import { briefingHtml, startBriefingFx } from './expansion/briefing.js';

const $ = (id) => document.getElementById(id);
// the battle board (js/render/board.js): terrain, units, overlays and effects drawn from the ROM's art
let board = null;
// Defeat text (labels 68-86) by campaign stage: Hercules, Erebos, the Basilisk counterattack,
// Ragnarok, Yahweh (Babylon).
const LOST_LINES = [[0, [68, 69, 70, 71]], [10, [72, 73, 76]], [20, [74, 75]], [22, [77, 78, 79, 80, 81]], [28, [82, 83, 84, 85, 86]]];
const ALERT_GALT = 87, ALERT_UNION = 88, BABYLON_ALERT = 94;

let rom, romEn = null, en = null, pal, types, battle, mission = 0;
let sel = null, reach = null, targets = [], hosts = [], launching = null, busy = false, blastCells = null;
let range = null;   // your selected unit's fire range: every hex it could attack this turn (Set of 'x,y')
let threat = null;   // an enemy unit's reach, shown when it is clicked: { u, move: Map, fire: Set }
let cursor = null;   // keyboard cursor hex [x, y]
let startLevels = new Map();   // unit id -> level when the battle began (the results screen's level gains)
let custom = null;   // expansion mission (game.html?mission=...), see js/expansion/battle.js

// Original music and effects (js/audio), started by the first click (browsers need a gesture);
// the map music follows the phase and the unit counts, as in play.js.
let sound = null;
const MUTE = 'earthlight-mute';
function music() {
  if (!sound || !battle || $('sBattle').hidden || battle.winner() !== null) return;
  sound.playSong(mapMusic(rom, custom ? custom.musicMap : mission, battle.army, battle.forces(0).length, battle.forces(1).length, !!battle.eventMusic));
}
function silence() { screenSong = null; if (sound) sound.stop(); }
// Songs of the non-battle screens (sound.js SONGS): title, menu, briefing, between missions, ending.
let screenSong = null;
function playSong(s) { screenSong = s; if (sound) sound.playSong(s); }
function startSound() {
  if (sound || !rom) return;
  sound = new Sound(rom); sound.setMuted($('mute').checked);
  sound.start().then(() => { document.querySelectorAll('.soundHint').forEach((h) => h.remove()); if (screenSong) sound.playSong(screenSong); else music(); });
}
// Browsers only start audio after a click or key press on the page: arriving straight on a
// screen with music (the expansion's briefing, opened from the intermission), say so.
function soundHint(parent) {
  if (!parent || (sound && sound.ctx && sound.ctx.state === 'running') || $('mute').checked) return;
  const b = document.createElement('button');
  b.className = 'btn soundHint'; b.type = 'button'; b.textContent = '♪ Click for sound';
  parent.append(b);
}
document.addEventListener('pointerdown', startSound, { capture: true });
document.addEventListener('keydown', startSound, { capture: true });

// ------------------------------------------------------------------ loading
// The ROM and the patch are kept in this browser only (IndexedDB, shared with the lab).
function idb(mode, fn) {
  return new Promise((res) => {
    try {
      const r = indexedDB.open('earthlight-lab', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rom');
      r.onsuccess = () => {
        const q = fn(r.result.transaction('rom', mode).objectStore('rom'));
        q.onsuccess = () => res(q.result ?? null); q.onerror = () => res(null);
      };
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}
const idbGet = (key) => idb('readonly', (st) => st.get(key));
const idbPut = (key, v) => idb('readwrite', (st) => st.put(v, key));
const idbDel = (key) => idb('readwrite', (st) => st.delete(key));
// serve.py --rom/--patch exposes test files on localhost; used when nothing is stored
async function testFile(url, read) {
  try { const r = await fetch(url); return r.ok ? await read(new File([await r.arrayBuffer()], 'f')) : null; } catch { return null; }
}

async function boot() {
  // expansion missions run from the expansion's pack (js/expansion/pack.js): the original's
  // graphics and sound, copied once from the player's ROM, so no ROM is needed after that
  if (new URLSearchParams(location.search).has('mission')) {
    const { ensurePack } = await import('./expansion/pack.js');
    const p = await ensurePack({ onProgress: (t) => { $('loadMsg').textContent = t; } });
    rom = p.rom; romEn = p.textRom; en = p.text; pal = battlePalette(rom);
    $('status').textContent = '';
    wire();
    await startExpansion();
    return;
  }
  const buf = (await idbGet('rom')) || (await testFile('/__test_rom', readRomFile));
  if (!buf) { setup(); return; }
  rom = new Rom(buf);
  if (!rom.isEarthLight()) { setup('The stored ROM is not Earth Light (Japan). Choose it again.'); return; }
  pal = battlePalette(rom); types = allUnitTypes(rom);
  let patch = (await idbGet('patch')) || (await testFile('/__test_patch', readPatchFile));
  // the published site bundles Nezz's GPL English patch; remember it so the other pages get it too
  if (!patch) {
    try {
      const { PATCH_BASE64 } = await import('../patch/earthlight-en.js');
      patch = Uint8Array.from(atob(PATCH_BASE64), (c) => c.charCodeAt(0)).buffer;
      await idbPut('patch', patch);
    } catch { patch = null; }
  }
  if (patch) { try { const b = applyBps(patch, rom.bytes.slice().buffer); en = readEnglish(b); romEn = new Rom(b); } catch { en = null; } }
  $('status').textContent = en ? 'English patch loaded' : 'Japanese ROM: add the English patch (☰ → ROM & patch) for the story and briefings';
  wire();
  showTitle();
}

// An expansion mission (game.html?mission=...): its own unit data and text (js/expansion/data);
// the pack (or the patched ROM, for the info screen's English graphics) only draws and plays them.
async function startExpansion() {
  custom = await expansionFromUrl(rom);
  types = custom.types; en = { ...(en || {}), ...custom.text };
  const s = savedBattle(custom.battleKey), title = custom.mission.title || custom.mission.name;
  const brief = () => expansionBriefing();
  if (s && s.mission === custom.url) choose(title, `You have a saved battle of this mission (turn ${s.turn}).`, 'Resume', 'Start over', () => resumeExpansion(s), brief);
  else brief();
}

// Back to this campaign's intermission (expansion.html).
const interUrl = () => `expansion.html${custom?.campaignId ? `?c=${custom.campaignId}` : ''}`;

// The expansion's briefing screen (js/expansion/briefing.js): story, the villain's transmission,
// the annotated map, the suggested strategy and the objective.
async function expansionBriefing() {
  show('sBrief');
  playSong(briefingSong(custom.musicMap));
  const q = new URLSearchParams(location.search), no = q.has('no') ? +q.get('no') : null;
  const total = custom.total;
  const goal = custom.briefing().pop().replace(/^Objective\s*/, '');
  $('briefBody').innerHTML = briefingHtml(custom.mission, { goal, no, total });
  const terr = document.createElement('canvas');
  paint(terr, renderMap(custom.rom, custom.info, { units: false }).img, pal, { scale: 1 });
  const fx = startBriefingFx($('briefBody'), { terrain: terr, mission: custom.mission, types, icon: (u) => maskedIcon({ type: u.type, army: u.army === 2 ? NEUTRAL : u.army }) });
  soundHint($('briefBody').querySelector('.bHead'));
  $('bBriefGo').onclick = () => { fx.stop(); silence(); startMission(-1); };
  $('bBriefBack').onclick = () => { fx.stop(); silence(); if (custom.campaign) location.href = interUrl(); else location.search = ''; };
}

// First run (and ☰ → ROM & patch): pick the ROM and, optionally, the English patch; both are
// checked here and remembered for next time.
function setup(msg = '', cancel = false) {
  show('sLoad');
  $('loadMsg').hidden = true; $('setup').hidden = false;
  $('setupMsg').textContent = msg; $('setupCancel').hidden = !cancel;
  let romBuf = null, patchBuf = null;
  const ready = () => { $('setupGo').disabled = !(romBuf || (cancel && patchBuf)); };
  $('romFile').onchange = async (e) => {
    romBuf = null;
    try {
      const b = await readRomFile(e.target.files[0]);
      if (new Rom(b).isEarthLight()) romBuf = b; else $('setupMsg').textContent = 'That file is not Earth Light (Japan).';
    } catch (err) { $('setupMsg').textContent = `Could not read that file: ${err.message}`; }
    if (romBuf) $('setupMsg').textContent = 'ROM recognised.';
    ready();
  };
  $('patchFile').onchange = async (e) => {
    patchBuf = null;
    try { patchBuf = await readPatchFile(e.target.files[0]); $('setupMsg').textContent = 'Patch read.'; } catch (err) { $('setupMsg').textContent = `Could not read the patch: ${err.message}`; }
    ready();
  };
  $('setupCancel').onclick = () => { $('setup').hidden = true; showTitle({ menu: true }); };
  $('setup').onsubmit = async (e) => {
    e.preventDefault();
    if (patchBuf) {
      try { applyBps(patchBuf, (romBuf || rom.bytes.slice().buffer).slice(0)); } catch { $('setupMsg').textContent = 'That patch does not fit this ROM.'; return; }
      await idbPut('patch', patchBuf);
    }
    if (romBuf) await idbPut('rom', romBuf);
    location.reload();
  };
  ready();
}
boot();
// game.html?debug: lets test scripts read the battle and act like a click
if (new URLSearchParams(location.search).has('debug')) window.earthlight = { battle: () => battle, act: (x, y) => act(x, y), busy: () => busy, checkEnd: () => checkEnd() };

// ------------------------------------------------------------------ progress
const progress = loadProgress;
const label = (i) => (en ? en.labels[i] : '');
const nameOf = (u) => (en ? en.unitNames[u.type] : types[u.type].name);
const missionTitle = (m) => (en ? en.labels[LAYOUT.mapTitles + m].replace(/\n/g, ' ') : mapInfo(rom, m).name);
const side = (a) => (a === NEUTRAL ? 'neutral' : a ? 'armyB' : 'armyA');
const armyName = (a) => (custom ? custom.names[a] : a ? 'Galt' : 'Union');

function show(id) {
  for (const s of ['sLoad', 'sTitle', 'sStory', 'sBrief', 'sBattle', 'sResult']) $(s).hidden = s !== id;
  window.scrollTo(0, 0);   // each screen starts at its top (the results screen can be long)
}

function wire() {
  $('bNew').onclick = () => {
    const p = progress();
    saveProgress({ ...p, next: 0, cleared: p.cleared, points: {} });
    clearSavedBattle();
    story(en ? en.main.slice(LAYOUT.intro[0], LAYOUT.intro[1] + 1) : [], 'EARTH LIGHT', () => briefing(0), { song: SONGS.title });
  };
  $('bContinue').onclick = () => briefing(progress().next);
  $('bLoad').onclick = loadBattle;
  $('bSelect').onclick = () => { $('missions').hidden = !$('missions').hidden; };
  $('optHard').onchange = () => saveProgress({ ...progress(), hard: $('optHard').checked });
  $('endTurn').onclick = endTurn;
  $('bSave').onclick = () => { if (!busy && battle.army === 0) log((custom ? saveBattle(battle, custom.url, custom.battleKey) : saveBattle(battle, mission)) ? '<b>Battle saved.</b>' : '<b>Could not save (storage unavailable).</b>'); };
  // Load: back to this mission's saved battle (the save slot keeps only one battle)
  $('bBattleLoad').onclick = () => {
    if (busy) return;
    const s = custom ? savedBattle(custom.battleKey) : savedBattle();
    if (!s || s.mission !== (custom ? custom.url : mission)) return log('<b>No saved battle of this mission.</b>');
    custom ? resumeExpansion(s) : loadBattle();
  };
  $('bRestart').onclick = () => { if (!busy) startMission(mission); };
  // an expansion battle leaves for its own pages, so the base title never runs with `custom` set
  $('bRetreat').onclick = () => { if (busy) return; if (custom) location.href = custom.campaign ? interUrl() : 'game.html'; else showTitle({ menu: true }); };
  $('cv').addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  $('mSetup').onclick = (e) => { e.preventDefault(); e.target.closest('details').open = false; if (!busy) setup('', true); };
  const start = () => { if ($('menuBox').hidden) showTitle({ menu: true }); };
  $('pressStart').onclick = start;
  $('pressStart').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } };
  try { $('mute').checked = localStorage.getItem(MUTE) === '1'; } catch { /* no storage */ }
  $('mute').onchange = (e) => {
    try { localStorage.setItem(MUTE, e.target.checked ? '1' : '0'); } catch { /* no storage */ }
    if (sound) sound.setMuted(e.target.checked);
  };
}

// ------------------------------------------------------------------ title and story
// The original's title (PUSH START BUTTON!), then its main menu picture with the menu below.
let screensDrawn = false;
function showTitle({ menu = false } = {}) {
  silence();
  show('sTitle'); $('where').textContent = 'campaign';
  if (!screensDrawn) { drawScreen(rom, 'title', $('titleCv'), paint); drawScreen(rom, 'menu', $('menuCv'), paint); screensDrawn = true; }
  $('pressStart').hidden = menu; $('menuBox').hidden = !menu;
  if (menu) playSong(SONGS.menu);
  else { playSong(SONGS.title); $('pressStart').focus(); }
  const p = progress(), s = savedBattle();
  $('bContinue').hidden = p.next === 0 && !p.cleared.length;
  $('bContinue').textContent = p.next >= MAP_COUNT ? 'Campaign complete' : `Continue: mission ${p.next + 1} · ${missionTitle(p.next)}`;
  $('bContinue').disabled = p.next >= MAP_COUNT;
  $('bLoad').hidden = !s;
  if (s) $('bLoad').textContent = `Load saved battle: mission ${s.mission + 1}, turn ${s.turn}`;
  // hard mode (both sides attack x2) opens up once the campaign has been cleared
  $('hardRow').hidden = !p.cleared.includes(MAP_COUNT - 1);
  $('optHard').checked = p.hard && !$('hardRow').hidden;
  $('missions').innerHTML = '';
  for (let m = 0; m < MAP_COUNT; m++) {
    const b = document.createElement('button');
    b.className = 'btn'; b.disabled = m > p.next && !p.cleared.includes(m);
    b.textContent = `${m + 1}. ${missionTitle(m)}${p.cleared.includes(m) ? ' ✓' : ''}`;
    b.onclick = () => briefing(m);
    $('missions').append(b);
  }
}

// A two-way choice on the story screen (embedded viewers can suppress confirm() dialogs).
function choose(title, text, yes, no, onYes, onNo) {
  show('sStory');
  $('storyArt').hidden = true;
  $('storyTitle').textContent = title; $('storyText').textContent = text;
  const restore = () => { $('bStoryNext').textContent = 'Next'; $('bStorySkip').textContent = 'Skip'; };
  $('bStoryNext').textContent = yes; $('bStorySkip').textContent = no;
  $('bStoryNext').onclick = () => { restore(); onYes(); };
  $('bStorySkip').onclick = () => { restore(); onNo(); };
}

function story(pages, title, done, { art = false, song = null } = {}) {
  if (!pages.length) { done(); return; }
  show('sStory');
  $('storyArt').hidden = !art;
  if (art) drawScreen(rom, 'mission', $('missionCv'), paint);
  if (song) playSong(song);
  let k = 0;
  const step = () => {
    if (k >= pages.length) { done(); return; }
    $('storyTitle').textContent = title; $('storyText').textContent = pages[k++];
  };
  $('bStoryNext').onclick = step; $('bStorySkip').onclick = done;
  step();
}

function briefing(m) {
  // the ROM wraps briefings to its window width (with hyphens); let the page wrap them instead
  const unwrap = (s) => s.replace(/(\w)-\n(\w)/g, '$1$2').replace(/\n/g, ' ');
  const pages = en ? en.brief.slice(LAYOUT.briefings + m * 4, LAYOUT.briefings + m * 4 + 4).filter((s) => s.trim()).map(unwrap) : [];
  if (!pages.length) pages.push(`${mapInfo(rom, m).name}\n\n(Briefing text needs the English patch.)`);
  pages.push(`Objective\n\n${scriptFor(m).goal}`);
  story(pages, `Mission ${m + 1}\n${missionTitle(m)}`, () => { silence(); startMission(m); }, { art: true, song: briefingSong(m) });
}

// ------------------------------------------------------------------ battle
function setupBoard(m) {
  mission = m;
  const info = custom ? custom.info : mapInfo(rom, m);
  const terr = renderMap(custom ? custom.rom : rom, info, { units: false });
  if (!board) { board = new Board($('board'), $('cv'), { rom, icon: maskedIcon }); board.active = () => !$('sBattle').hidden; }
  board.setTerrain(terr.img, pal);   // terrain classes come with the battle (board.update)
  sel = null; reach = null; targets = []; hosts = []; launching = null; busy = false; blastCells = null; threat = null; range = null; $('log').innerHTML = '';
  show('sBattle'); $('where').textContent = custom ? `expansion · ${custom.mission.title || custom.mission.name}` : `mission ${m + 1} · ${missionTitle(m)}`;
  return info;
}

// The board's terrain, redrawn from the battle's own cells (the Decimator clears them).
function paintTerrain() {
  const terr = renderMap(battle.rom, battle.info, { units: false, grid: battle.grid });
  board.setTerrain(terr.img, pal, (x, y) => battle.cls(x, y));
}

function newBattle(m) {
  if (custom) return custom.newBattle({ hard: $('optHard').checked && !$('hardRow').hidden });
  const info = mapInfo(rom, m), sc = scenario(rom, info);
  return new Battle(rom, info, types, sc.units, sc.arrivals, { hard: $('optHard').checked && !$('hardRow').hidden });
}

function startMission(m) {
  setupBoard(m);
  battle = newBattle(m);
  begin();
  if (m === COMET_MAP) alerts([EV.cometAlert, EV.comet]);
}

function loadBattle() {
  const s = savedBattle();
  if (!s) return;
  setupBoard(s.mission);
  battle = restoreBattle(newBattle(s.mission), s);
  if (battle.blasted.length) paintTerrain();
  log('<b>Saved battle loaded.</b>');
  begin();
  if (!checkEnd() && battle.army === 1) enemyTurn();
}

// A saved expansion battle (its own slot, keyed by the mission's URL).
function resumeExpansion(s) {
  setupBoard(-1);
  battle = restoreBattle(newBattle(-1), s).restored();
  if (battle.blasted.length) paintTerrain();
  log('<b>Saved battle loaded.</b>');
  begin();
  if (!checkEnd() && battle.army === 1) enemyTurn();
}

function begin() {
  startLevels = new Map(battle.units.map((u) => [u.id, u.general ? u.pilotLevel : u.level]));
  draw(); hud(`<p><b>Objective:</b> ${battle.script.goal}</p><span class="dim">Click one of your units; click an enemy to see where it can move and fire. Docks and carriers hold more units: click them to launch.
    Neutral docks (grey) can be captured, with the units inside, by bringing them down to 0 HP.</span>`);
  const first = battle.alive(0)[0];
  if (first) board.centerOn(first.x, first.y);
}

// Fight cut-ins use the modern renderer (js/render/fightfx.js) unless "Classic fights" is ticked
// (the original 256x224 picture); the choice is remembered in this browser.
const CLASSIC_FIGHTS = 'earthlight-classic-fights';
const classicFights = () => { try { return localStorage.getItem(CLASSIC_FIGHTS) === '1'; } catch { return false; } };
if ($('optClassicFights')) {
  $('optClassicFights').checked = classicFights();
  $('optClassicFights').onchange = (ev) => { try { localStorage.setItem(CLASSIC_FIGHTS, ev.target.checked ? '1' : '0'); } catch { /* no storage */ } };
}

function runFight(e) {
  if (!$('optFights').checked) return Promise.resolve();
  // units with a borrowed look (js/look.js) fight with that type's sprites, under their own name
  const label = (u) => (types[u.type].look !== undefined ? { label: en ? en.unitNames[u.type] : types[u.type].name, code: types[u.type].code } : {});
  const sideOf = (u, before, after, other, w) => ({ type: lookOf(types, u.type), army: u.army === NEUTRAL ? 1 - other.army : u.army, hp: before, hpAfter: after,
    cls: battle.cls(u.x, u.y), slot: lookSlot(types, u.type, w?.slot), own: ownArt(types, u.type), ...label(u) });
  const seen = new Map(), v = (u) => {   // the same stand-in for a unit wherever the info screen meets it
    if (!u || types[u.type].look === undefined) return u;
    if (!seen.has(u)) { const own = ownArt(types, u.type); seen.set(u, { ...u, type: lookOf(types, u.type), ...label(u), ...(own ? { icon: ownIcon(own, u.army === 1 ? 1 : 0) } : {}) }); }
    return seen.get(u);
  };
  const ring = (r) => ({ centre: v(r.centre), around: r.around.map((n) => ({ ...n, u: v(n.u) })) });
  const info = e.info && { ...e.info, att: { ...e.info.att, unit: v(e.info.att.unit) }, def: { ...e.info.def, unit: v(e.info.def.unit) },
    encircle: ring(e.info.encircle), support: e.info.support.map(ring) };
  const scene = new FightScene(rom, sideOf(e.att, e.before[0], e.after[0], e.def, e.w), sideOf(e.def, e.before[1], e.after[1], e.att, e.cw),
    { counter: !!e.cw, info, textRom: romEn, names: en ? en.unitNames : null });
  scene.att.cls = battle.cls(e.att.x, e.att.y);
  const ov = $('fight'), cv = $('fightCv'), classic = classicFights();
  ov.hidden = false;
  const S = classic ? 1 : fightScale(cv.clientWidth || 768);
  cv.width = 256 * S; cv.height = 224 * S; cv.style.imageRendering = classic ? 'pixelated' : 'auto';
  const ctx = cv.getContext('2d'), fx = classic ? null : new FightRenderer(scene, cv);
  return new Promise((resolve) => {
    let last = null, skip = false;
    ov.onclick = () => { skip = true; };
    const tick = (t) => {
      if (last === null) last = t;
      while (t - last >= 1000 / 60 && !scene.done) {
        scene.step(); last += 1000 / 60;
        if (fx) fx.update();
        if (sound) new Set(scene.sounds()).forEach((id) => sound.playSfx(id));
      }
      if (fx) fx.render(Math.min(1, (t - last) / (1000 / 60))); else scene.render(ctx);
      if (skip && sound) sound.playSfx(3);   // stop the fight's effects, as the fight end does
      if (scene.done || skip) { ov.hidden = true; resolve(); } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// Neutral docks use the Union icon drawn in grey.
const iconCache = new Map();
function maskedIcon(u) {
  const key = `${u.army}:${u.type}`;
  if (!iconCache.has(key)) {
    const c = document.createElement('canvas');
    paint(c, typeIcon(rom, types, u.type, u.army === NEUTRAL ? 0 : u.army), pal, { scale: 1 });
    if (u.army === NEUTRAL) {
      const g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
      const gx = g.getContext('2d'); gx.filter = 'grayscale(1) brightness(1.1)'; gx.drawImage(c, 0, 0);
      iconCache.set(key, g);
    } else iconCache.set(key, c);
  }
  return iconCache.get(key);
}

// The board draws itself every frame from this state (js/render/board.js).
function draw() {
  music();
  board.update({ battle, reach, range, launching, targets, hosts, threat, blastCells, sel, cursor, inLane });
}

function hud(msg) {
  const lim = battle.script.limit;
  $('turn').innerHTML = `Turn ${battle.turn}${lim ? ` / ${lim}` : ''} · <span class="${side(battle.army)}">${armyName(battle.army)}</span>`
    + ` <small>${battle.forces(0).length} vs ${battle.forces(1).length}</small>`
    + `<div class="small dim">${battle.script.goal}${battle.hard ? ' · hard mode' : ''}</div>` + (custom ? custom.hud(battle) : '');
  if (msg !== undefined) $('info').innerHTML = msg;
}

// The unit card: the original's unit-info picture (js/unitart.js), name, role, stats, weapons
// and the unit's own description text, as on the unit info screen and the wiki.
const artCache = new Map();
function artUrl(type) {
  if (!artCache.has(type)) {
    let url = '';
    try { const c = document.createElement('canvas'); paintLookArt(c, rom, types, type, 2); url = c.toDataURL(); } catch { /* no picture for this type */ }
    artCache.set(type, url);
  }
  return artCache.get(type);
}
// Description texts: the expansion's own (unitInfo) or the English patch's; spent and loaded
// forms use their base type's text, as the wiki does.
function unitInfoText(type) {
  const t = types[type], base = t.armed ?? t.empty ?? t.formOf;
  const own = (k) => en?.unitInfo?.find((e) => e.type === k);
  const patch = (k) => (en?.brief && en?.main ? unitText(en, k) : null);
  for (const k of [type, base]) {
    if (k === undefined) continue;
    const x = own(k) || patch(k);
    if (x && (x.info || x.short)) return x;
  }
  return null;
}
const prose = (s) => (s || '').replace(/(\w)-\n(\w)/g, '$1$2').replace(/\s*\n\s*/g, ' ').trim();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const MODE_NAMES = ['Beam', 'Railgun', 'Missile'];

function unitCard(u, extra = '') {
  const t = types[u.type], tx = unitInfoText(u.type), art = artUrl(u.type);
  const evade = Math.round((battle.type(u).evasion * 100) / 128);
  const tags = [u.general ? '<span class="tag gen">★ General aboard</span>' : '', u.guard ? '<span class="tag">Guard</span>' : '',
    u.burner ? '<span class="tag burn">Afterburner · move 10</span>' : '', t.moveOrFire ? '<span class="tag">Long guns: move or fire</span>' : '',
    u.army === NEUTRAL ? '<span class="tag">Neutral dock</span>' : ''].join('');
  const weapons = t.weapons.filter(Boolean).map((w) => `<tr><td class="slot">W${w.slot + 1}</td><td><span class="mode m${w.mode}">${MODE_NAMES[w.mode]}</span></td>
    <td class="num">${w.min === w.max ? w.min : `${w.min}–${w.max}`}</td><td class="pow"><b>${w.power}</b><span class="pbar"><span style="width:${Math.round((w.power / 255) * 100)}%"></span></span></td></tr>`).join('');
  // the info strings: [mount labels, role + armament, flavour]
  const armament = tx?.info ? prose(tx.info[1].split(/\n\s*\n/).slice(1).join(' ')) : '';
  const flavour = tx?.info ? prose(tx.info[2]) : '';
  const who = u.army === NEUTRAL ? '<p class="dim">Bring it to 0 HP to capture it and everything inside.</p>' : '';
  return `<div class="ucard ${side(u.army)}">
    <div class="utop">${art ? `<img class="uart" src="${art}" alt="">` : ''}
      <div class="uid"><h3>${esc(nameOf(u))}</h3><div class="ucode mono">${esc(t.code)}</div>${tx?.short ? `<div class="urole">${esc(prose(tx.short))}</div>` : ''}
        <dl class="ustats"><dt>HP</dt><dd><span class="bar"><span style="width:${Math.round((u.hp / t.hp) * 100)}%"></span></span>${u.hp}/${t.hp}</dd>
          <dt>Move</dt><dd>${u.burner ? 10 : t.move}</dd><dt>Evade</dt><dd>${evade}%</dd>
          <dt>Level</dt><dd class="pips">${Array.from({ length: 9 }, (_, i) => `<i${i < u.level ? ' class="on"' : ''}></i>`).join('')}</dd></dl></div></div>
    ${tags ? `<div class="tags">${tags}</div>` : ''}
    ${weapons ? `<table class="uweap"><tr><th></th><th>Weapon</th><th>Range</th><th>Power</th></tr>${weapons}</table>` : '<p class="dim">Unarmed.</p>'}
    ${who}${extra ? `<div class="uextra">${extra}</div>` : ''}
    ${armament || flavour ? `<div class="udesc">${armament ? `<p class="arm">${esc(armament)}</p>` : ''}${flavour ? `<p>${esc(flavour)}</p>` : ''}</div>` : ''}
  </div>`;
}

function cargoPanel(c) {
  const list = battle.cargo(c);
  if (!list.length || c.army !== 0 || battle.army !== 0) return '';
  const free = list.some((u) => battle.launchCells(u).length);
  return `<div class="cargo"><p>Aboard (${list.length}):${free ? '' : ' <span class="dim">no free hex to launch onto</span>'}</p>`
    + list.map((u) => `<button class="btn" data-launch="${u.id}" ${free && !u.acted ? '' : 'disabled'}>${nameOf(u)} ${u.hp}</button>`).join('') + '</div>';
}

function log(html) { const d = document.createElement('div'); d.innerHTML = html; $('log').prepend(d); }
function logAttack(e) {
  log(`<span class="${side(e.att.army)}">${nameOf(e.att)}</span> → <span class="${side(e.before && e.captured ? NEUTRAL : e.def.army)}">${nameOf(e.def)}</span>: `
    + `${e.before[1]}→${e.after[1]}` + (e.cw ? `, counter ${e.before[0]}→${e.after[0]}` : '')
    + (e.captured ? ` · <b>dock captured</b> (${battle.cargo(e.def).length} units aboard)` : ''));
}

function select(u) {
  sel = u; launching = null; threat = null;
  reach = battle.movePoints(u) ? battle.reachable(u) : null;
  range = u.army === battle.army && !u.acted ? threatOf(u).fire : null;
  targets = battle.targets(u); hosts = battle.boardable(u);
  blastCells = null;
  const dec = u.army === 0 ? decimator(battle, u) : [];
  if (dec.length) targets = targets.filter((e) => battle.weaponsAgainst(u, e).some((w) => w.slot !== 3));
  const tf = battle.canTransform(u) ? `<button class="btn" id="bTransform">Transform → ${types[TRANSFORM[u.type]].code}</button>` : '';
  const again = u.acted && u.reMove ? '<p>Move again (optional), or click elsewhere to finish.</p>' : '';
  const det = (u.burner && u.army === 0 ? '<button class="btn" id="bDetach">Detach burner</button>' : '')
    + (dec.length ? '<button class="btn" id="bDecimator">Quantum Decimator</button>' : '');
  const legend = `<p class="dim">Blue: move${hosts.length ? ' · yellow: board (full repair, re-arm)' : ''} · faint red: fire range · red: attack.</p>`;
  draw(); hud(unitCard(u, cargoPanel(u) + again + legend + (tf || det ? `<div class="row">${tf}${det}</div>` : '')));
  if (dec.length) $('bDecimator').onclick = () => {
    reach = null; range = null; targets = []; hosts = []; blastCells = dec;
    draw(); hud(unitCard(u, '<p>Click a purple hex: the Decimator clears it and the six hexes around it, destroying whatever is there.</p>'));
  };
  if (u.burner && u.army === 0) $('bDetach').onclick = async () => { detachBurner(battle, u); log(`<span class="armyA">${nameOf(u)}</span> detached its afterburner`); await alerts([EV.burner]); select(u); };
  for (const b of $('info').querySelectorAll('[data-launch]')) b.onclick = () => startLaunch(battle.units[+b.dataset.launch]);
  if (tf) $('bTransform').onclick = () => { battle.transform(u); log(`<span class="armyA">${nameOf(u)}</span> transformed (${types[u.type].code})`); select(u); };
}

function startLaunch(u) {
  launching = u; sel = u.carrier; targets = []; hosts = []; range = null;
  reach = new Map(battle.launchCells(u).map(([x, y]) => [`${x},${y}`, 0]));
  draw(); hud(unitCard(u, '<p>Click a green hex to launch.</p>'));
}

function clearSel() { sel = null; reach = null; range = null; targets = []; hosts = []; launching = null; blastCells = null; threat = null; draw(); }

// Where an enemy unit can move this turn (its full movement, held up by your zones of control) and
// every hex it could fire on from there: each armed weapon's range, from every hex it can reach, or
// only from where it stands for long-range weapons that can't fire after moving; hexes whose
// terrain that weapon's mode can't target are left out.
function threatOf(u) {
  const t = battle.type(u), move = battle.movePoints(u) ? battle.reachable(u) : new Map();
  move.set(`${u.x},${u.y}`, 0);
  const fire = new Set(), from = [...move.keys()].map((k) => k.split(',').map(Number));
  for (const w of t.weapons) {
    if (!w || !w.power) continue;
    for (const [fx, fy] of w.min >= 2 && t.moveOrFire ? [[u.x, u.y]] : from) {
      for (let x = fx - w.max; x <= fx + w.max; x++) for (let y = fy - w.max - 1; y <= fy + w.max + 1; y++) {
        if (!battle.inBounds(x, y) || !battle.canTarget(battle.cls(x, y), w.mode)) continue;   // its weapon mode can't hit this terrain
        const d = battle.distance({ x: fx, y: fy }, { x, y });
        if (d >= w.min && d <= w.max) fire.add(`${x},${y}`);
      }
    }
  }
  return { u, move, fire };
}

function onClick(ev) {
  const [cx, cy] = board.cellAt(ev);   // the board may be zoomed or scaled down on phones
  cursor = null;
  act(cx, cy);
}

// Keyboard: arrows move a cursor hex, Enter/Space act on it like a click, Esc deselects,
// E ends the turn; Enter/Esc also step through story pages, alerts and fights.
function onKey(e) {
  if (e.target.closest && e.target.closest('input, textarea, select, summary, a, button') && e.key !== 'Escape') return;
  const k = e.key;
  if (!$('alert').hidden) { if (k === 'Enter' || k === ' ' || k === 'Escape') { e.preventDefault(); $('alert').click(); } return; }
  if (!$('fight').hidden) { if (k === 'Enter' || k === ' ' || k === 'Escape') { e.preventDefault(); $('fight').click(); } return; }
  if (!$('sStory').hidden) {
    if (k === 'Enter' || k === ' ' || k === 'ArrowRight') { e.preventDefault(); $('bStoryNext').click(); } else if (k === 'Escape') $('bStorySkip').click();
    return;
  }
  if ($('sBattle').hidden || !battle) return;
  const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (moves[k]) {
    e.preventDefault();
    if (!cursor) { const u = sel || battle.alive(0)[0] || { x: 1, y: 1 }; cursor = [u.x, u.y]; }
    cursor = [Math.min(battle.info.cols - 1, Math.max(1, cursor[0] + moves[k][0])), Math.min(battle.info.rows, Math.max(1, cursor[1] + moves[k][1]))];
    board.ensureVisible(...cursor);
    draw();
    const u = battle.unitAt(...cursor);
    if (u && !sel) hud(unitCard(u));
  } else if ((k === 'Enter' || k === ' ') && cursor) { e.preventDefault(); act(...cursor); }
  else if (k === 'Escape') { if (sel && sel.acted) sel.reMove = 0; clearSel(); }
  else if (k === 'e' || k === 'E') endTurn();
}

function act(cx, cy) {
  if (busy || battle.winner() !== null || battle.army !== 0) return;
  const u = battle.unitAt(cx, cy), key = `${cx},${cy}`;
  if (launching && reach && reach.has(key)) {
    const l = launching;
    battle.launch(l, cx, cy); log(`<span class="armyA">${nameOf(l)}</span> launched`);
    sel = l; launching = null; reach = null; range = null; hosts = []; targets = battle.targets(l);
    draw(); hud(unitCard(l, targets.length ? '<p>Click a red hex to attack.</p>' : ''));
    if (!targets.length) { l.acted = true; clearSel(); }
    return;
  }
  if (sel && targets.includes(u)) { attack(sel, u); return; }
  if (sel && blastCells && blastCells.some(([x, y]) => x === cx && y === cy)) { fireDecimator(sel, cx, cy); return; }
  if (sel && hosts.includes(u)) {
    const s = sel;
    battle.board(s, u); log(`<span class="armyA">${nameOf(s)}</span> boarded ${nameOf(u)} (repaired)`);
    clearSel(); hud(unitCard(u, cargoPanel(u)));
    return;
  }
  if (sel && reach && reach.has(key) && !u) {
    const again = sel.acted;
    battle.move(sel, cx, cy);
    if (checkEnd()) { clearSel(); return; }   // expansion: a unit leaving by the exit edge can win the map
    if (again) { const s = sel; clearSel(); hud(unitCard(s)); return; }
    reach = null; range = null; targets = battle.targets(sel); hosts = [];
    draw(); hud(unitCard(sel, targets.length ? '<p>Click a red hex to attack.</p>' : '<p>No targets in range.</p>'));
    if (!targets.length) { sel.acted = true; clearSel(); }
    return;
  }
  if (u && u.army === 0 && (!u.acted || u.reMove || battle.cargo(u).length)) { select(u); return; }
  const extra = sel && targets.includes(u) ? forecastHtml(sel, u) : '';
  if (sel && sel.acted) sel.reMove = 0;   // a pending move-after-firing is given up
  clearSel();
  if (u && u.army !== 0) {   // an enemy or neutral dock: show how far it reaches this turn
    threat = threatOf(u); draw();
    hud(unitCard(u, extra + '<p class="dim">Orange: where it can move this turn · red: where it can fire.</p>'));
  } else if (u) hud(unitCard(u, extra));
  else if (battle.inBounds(cx, cy)) { cursor = [cx, cy]; draw(); hud(terrainCard(cx, cy)); }   // an empty hex: what the terrain is
}

// The terrain card for hex (x, y) (js/terraincard.js): expansion battles describe it from the
// expansion's own terrain data, the original campaign from the ROM and the English patch.
function terrainCard(x, y) {
  return terrainCardHtml({ rom, tables: battle.tables, types, cell: cellTerrain(battle, x, y), x, y,
    text: custom ? { terrainData: custom.terrain } : { en, rom } });
}

// The Abaddon's slot 3 is the Decimator, fired at a hex (fireDecimator), not at a unit.
function bestWeapon(a, d) {
  const ws = battle.weaponsAgainst(a, d), direct = decimator(battle, a).length ? ws.filter((w) => w.slot !== 3) : ws;
  return (direct.length ? direct : ws).map((w) => [w, battle.forecast(a, d, w)]).sort((x, y) => y[1].dealt - x[1].dealt)[0][0];
}
function forecastHtml(a, d) {
  const f = battle.forecast(a, d, bestWeapon(a, d));
  return `<p>Forecast: deal ≈${f.dealt.toFixed(1)}, take ≈${f.taken.toFixed(1)}</p>`;
}

async function fireDecimator(a, x, y) {
  const e = blast(battle, a, x, y);
  log(`<span class="armyA">${nameOf(a)}</span> fired the Quantum Decimator: ${e.hit.length ? e.hit.map((u) => `<span class="${side(u.army)}">${nameOf(u)}</span>`).join(', ') + ' destroyed' : 'path cleared'}`);
  sel = null; reach = null; range = null; targets = []; hosts = []; blastCells = null; busy = true;
  if (sound) sound.playSfx(0x3F);   // explosion
  await flash(e.cells, 'rgba(255,255,255,.8)');
  paintTerrain();
  busy = false;
  if (checkEnd()) { draw(); return; }
  if (a.hp && a.reMove) select(a); else { draw(); hud(unitCard(a)); }
}

// Brief highlight of some hexes (cannon fire, Decimator blast).
function flash(cells, colour) {
  draw();
  return board.flash(cells, colour);
}

// The map-event windows (labels block), one after the other; click or wait to go on.
function alerts(ids) {
  const texts = ids.map(label).filter(Boolean);
  if (!texts.length) return Promise.resolve();
  const ov = $('alert');
  return new Promise((done) => {
    let k = 0, timer = 0;
    const next = () => {
      clearTimeout(timer);
      if (k >= texts.length) { ov.hidden = true; ov.onclick = null; done(); return; }
      $('alertText').textContent = texts[k++];
      ov.hidden = false;
      timer = setTimeout(next, 2600);
    };
    ov.onclick = next;
    next();
  });
}

async function attack(a, d) {
  const e = battle.attack(a, d, bestWeapon(a, d));
  logAttack(e);
  sel = null; reach = null; range = null; targets = []; hosts = []; busy = true;
  await runFight(e);
  busy = false;
  if (checkEnd()) { draw(); return; }
  if (a.hp && a.reMove) select(a); else { draw(); hud(unitCard(d)); }
}

function announce(arrived) {
  if (!arrived.length) return;
  const a = arrived[0].army;
  log(`<b class="${side(a)}">${armyName(a)} reinforcements: ${arrived.length} units</b>`);
  const galt = custom ? a === 0 : a === 1;   // in the expansion the player leads the Galt remnant
  const t = label(galt ? ALERT_GALT : ALERT_UNION).replace(/\n/g, ' ');
  if (t) log(`<i>${t}</i>`);
}

function turnAlert() {
  const lim = battle.script.limit;
  if (!lim || battle.army !== 0) return;
  const left = lim - battle.turn + 1, t = label(BABYLON_ALERT);
  if (left <= 5 || battle.turn === 1) log(`<b>${t ? t.replace(/\n/g, ' ').replace('**', left) : `${left} turns left`}</b>`);
}

async function endTurn() {
  if (busy || battle.winner() !== null) return;
  clearSel();
  announce(battle.endTurn());
  await phaseEvents();
  draw(); hud('');
  if (checkEnd()) return;
  await enemyTurn();
}

async function enemyTurn() {
  if (battle.army !== 1 || checkEnd()) return;
  busy = true;
  for (const step of aiTurn(battle)) {
    draw(); hud();
    if (step.kind === 'attack') { logAttack(step); await runFight(step); draw(); }
    else if (step.kind === 'blast') {   // Galt Abaddon fired the Quantum Decimator
      log(`<span class="armyB">${nameOf(step.att)}</span> fired the Quantum Decimator${step.hit.length ? ': ' + step.hit.map((u) => `<span class="${side(u.army)}">${nameOf(u)}</span>`).join(', ') + ' destroyed' : ''}`);
      if (sound) sound.playSfx(0x3F);
      await flash(step.cells, 'rgba(255,255,255,.8)');
      paintTerrain(); draw();
    }
    else await new Promise((r) => setTimeout(r, 120));
    if (battle.winner() !== null) break;
  }
  busy = false;
  if (checkEnd()) return;
  announce(battle.endTurn());
  await phaseEvents();
  draw(); hud('<span class="dim">Your turn.</span>');
  turnAlert();
  checkEnd();
}

// Buccaneer cannon (map 19): fires down its lanes at every phase change.
async function phaseEvents() {
  const ev = battle.phaseEvent;
  if (!ev) return;
  battle.phaseEvent = null;
  busy = true;
  log(`<b>Buccaneer Cannon fired</b>${ev.hit.length ? ': ' + ev.hit.map((u) => `<span class="${side(u.army)}">${nameOf(u)}</span>`).join(', ') + ' destroyed' : ''}`);
  await alerts([EV.cannon]);
  if (sound) sound.playSfx(0x3F);
  const cells = [];
  for (const c of ev.cannons) for (let y = c.y; y <= battle.info.rows; y++) cells.push([c.x, y]);
  await flash(cells, 'rgba(255,240,200,.75)');
  busy = false;
  battle.result = null;
}

// ------------------------------------------------------------------ results
function checkEnd() {
  const w = battle.winner();
  if (w === null) return false;
  setTimeout(() => result(w), 400);
  return true;
}

function result(w) {
  silence();
  show('sResult');
  resultHero(w);
  if (custom) { expansionResult(w); return; }
  const p = progress();
  if (w === 0) {
    if (!p.cleared.includes(mission)) p.cleared.push(mission);
    p.next = Math.max(p.next, mission + 1);
    const prev = p.best[mission];
    if (!prev || battle.turn < prev.turns) p.best[mission] = { turns: battle.turn };
    saveProgress(p);
    clearSavedBattle();
    $('resTitle').textContent = `Mission ${mission + 1} complete`;
    $('resText').textContent = `${label(WIN_LINE[battle.result.reason] ?? 1)}\n\nCleared on turn ${battle.turn}.`;
    pointsScreen(p);
    playSong(SONGS.interlude);
    const last = mission + 1 >= MAP_COUNT;
    $('bResNext').textContent = last ? 'Ending' : `Next: mission ${mission + 2}`;
    $('bResNext').onclick = () => (last
      ? story(en ? en.labels.slice(LAYOUT.ending, LAYOUT.ending + 6).filter((s) => s.trim()) : ['The End'], 'EARTH LIGHT', () => showTitle(), { song: SONGS.ending })
      : briefing(mission + 1));
  } else {
    const lines = LOST_LINES.filter(([m]) => mission >= m).pop()[1];
    $('resTitle').textContent = `Mission ${mission + 1} failed`;
    $('resText').textContent = battle.result.reason === 'timeup' ? label(83) || 'Time is up.' : label(LAYOUT.missionLost);
    $('bResNext').textContent = 'Retry';
    $('bResNext').onclick = () => startMission(mission);
    $('bResStory').hidden = !en;
    $('bResStory').onclick = () => story(lines.map(label).filter(Boolean), 'GAME OVER', () => result(w));
  }
  if (w === 0) $('bResStory').hidden = true;
  else $('points').hidden = true;
  $('bResTitle').onclick = () => showTitle({ menu: true });
}

function expansionResult(w) {
  const r = battle.result.reason;
  clearSavedBattle(custom.battleKey);
  $('resTitle').textContent = `${custom.mission.title || custom.mission.name} ${w === 0 ? 'complete' : 'failed'}`;
  $('resText').textContent = w === 0 ? `Cleared on turn ${battle.turn}.`
    : r === 'general' ? 'The general has fallen. Game over.'
    : r === 'escapeFailed' ? 'Too few units are left to break out. The escape has failed.'
    : r === 'breakthrough' ? 'A marked Union unit got through. The mission has failed.'
    : r === 'timeup' ? label(83) || 'Time is up.' : label(LAYOUT.missionLost);
  $('points').hidden = true; $('bResStory').hidden = true;
  expansionReport(w);
  if (w === 0 && custom.ending) {   // the finale's ending (mission JSON `endings[choice]` or `ending`, pages split by blank lines)
    $('bResStory').hidden = false;
    $('bResStory').onclick = () => story(custom.ending.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean), 'EARTH LIGHT', () => { silence(); show('sResult'); }, { song: SONGS.ending });
  }
  $('bResNext').textContent = 'Retry';
  $('bResNext').onclick = () => startMission(-1);
  $('bResTitle').onclick = () => { location.search = ''; };
  if (!custom.campaign) return;
  $('bResTitle').onclick = () => { location.href = interUrl(); };
  if (w === 0) {   // the campaign moves on: survivors, levels and supply are saved for the intermission
    const gain = custom.finish(battle);
    $('resStats').querySelector('[data-k=supply]').textContent = `+${gain}`;
    $('bResNext').textContent = 'Intermission';
    $('bResNext').onclick = () => { location.href = interUrl(); };
  }
}

// The results screens open on the ROM's Earthrise (the opening's BG1), tinted red on a defeat.
function resultHero(w) {
  drawScreen(rom, 'earthrise', $('resArtCv'), paint);
  $('resHero').classList.toggle('lost', w !== 0);
  $('resKicker').textContent = w === 0 ? 'Mission accomplished' : 'Mission failed';
  for (const id of ['resStats', 'resCrew', 'resEpilogue']) $(id).hidden = true;
}

// Expansion results: the battle in numbers, and every machine that flew it with its pilot's
// level gain and kills (from the battle log); the best of them is the MVP.
function expansionReport(w) {
  const mine = battle.units.filter((u) => u.army === 0 && !u.exit && (u.type < 52 || u.type >= 58) && (u.rosterId !== undefined || u.hp > 0));
  const kills = new Map(), dealt = new Map();
  for (const e of battle.log) {
    if (!e.att || !e.before) continue;
    const [ab, db] = e.before, [aa, da] = e.after;
    dealt.set(e.att, (dealt.get(e.att) || 0) + db - da); dealt.set(e.def, (dealt.get(e.def) || 0) + ab - aa);
    if (db > 0 && da === 0) kills.set(e.att, (kills.get(e.att) || 0) + 1);
    if (ab > 0 && aa === 0) kills.set(e.def, (kills.get(e.def) || 0) + 1);
  }
  const score = (u) => (kills.get(u) || 0) * 1000 + (dealt.get(u) || 0);
  const mvp = w === 0 ? mine.filter((u) => u.hp > 0 && score(u) > 0).sort((a, b) => score(b) - score(a))[0] : null;
  const no = +(new URLSearchParams(location.search).get('no') || 0);
  const foes = battle.units.filter((u) => u.army === 1 && u.hp <= 0).length, lost = mine.filter((u) => u.hp <= 0).length;
  $('resStats').innerHTML = [['Turns', battle.turn], ['Map points', mapPoints(battle, no).total], ['Union destroyed', foes], ['Machines lost', lost], ['Supply', '—', 'supply']]
    .map(([k, v, key]) => `<div><span>${k}</span><b${key ? ` data-k="${key}"` : ''}>${v}</b></div>`).join('');
  $('resStats').hidden = false;
  $('resCrew').innerHTML = `<h2>${w === 0 ? 'The crews' : 'Who flew'}</h2><div class="crew">${mine.map((u, i) => {
    const lv = u.general ? u.pilotLevel : u.level, was = startLevels.get(u.id) ?? lv, k = kills.get(u) || 0;
    return `<div class="cm${u.hp <= 0 ? ' lost' : ''}${u === mvp ? ' mvp' : ''}" style="--d:${i}"><canvas data-art="${u.type}"></canvas><b>${nameOf(u)}${u.general ? ' ★' : ''}</b>
      <small>Lv ${lv}${lv > was ? ` <span class="up">▲${lv - was}</span>` : ''} · ${k} kill${k === 1 ? '' : 's'}${u.hp <= 0 ? ' · lost' : ''}</small></div>`;
  }).join('')}</div>`;
  for (const c of $('resCrew').querySelectorAll('canvas[data-art]')) paintLookArt(c, rom, types, +c.dataset.art, 1);
  $('resCrew').hidden = !mine.length;
  if (w === 0 && custom.ending) { $('resEpilogue').textContent = custom.ending.split(/\n\s*\n/)[0]; $('resEpilogue').hidden = false; }
}

// The points screen ($08:A6C0): this map's points, the campaign total and the rank. The
// campaign total is kept per map, so replaying a map replaces its points.
function pointsScreen(p) {
  const mp = mapPoints(battle, mission);
  p.points = { ...p.points, [mission]: mp.total };
  saveProgress(p);
  const total = Object.values(p.points).reduce((s, v) => s + v, 0), rank = rankOf(total);
  const L = (i, fallback) => (label(i) || fallback).replace(/\n/g, ' ').trim();
  const rows = [[14, 'Units Destroyed', mp.destroyed], [15, 'Units Survived', mp.survived], [16, 'Units Lost', mp.lost],
    [17, 'Docks Captured', mp.docks], [18, 'Stage Win Bonus', mp.bonus], [20, 'Map Victory Points', mp.total], [19, 'Total Victory Points', total]];
  const grade = '◆'.repeat((rank & 3) + 1) + '◇'.repeat(3 - (rank & 3));
  drawScreen(rom, 'results', $('resultCv'), paint);
  $('pointsBody').innerHTML = `<table>${rows.map(([i, f, v], k) => `<tr${k >= 5 ? ' class="sum"' : ''}><td>${L(i, f)}</td><td>${v}</td></tr>`).join('')}</table>`;
  $('pointsRank').innerHTML = `<span class="dim">Rank</span><b>${rankName(rom, rank, en ? en.labels : null)}</b><span class="grade" title="emblem grade ${(rank & 3) + 1} of 4">${grade}</span>`;
  $('points').hidden = false;
}
