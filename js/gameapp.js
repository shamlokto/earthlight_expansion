// The game: title, story, briefings, the 30-mission campaign and its results, put
// together from the decoded pieces (maps, scenario tables, map scripts, rules, AI, fight
// scenes, text). As in the original, units and levels don't carry over between maps:
// every mission starts from the ROM's own deployment.
import { Rom } from './rom.js';
import { paint } from './gfx.js';
import { MAP_COUNT, mapInfo, battlePalette, renderMap, unitIcon, cellOrigin, cellAt, HEX_POINTS } from './maps.js';
import { allUnitTypes } from './units.js';
import { applyBps } from './bps.js';
import { readEnglish, LAYOUT } from './text.js';
import { readRomFile, readPatchFile } from './romfile.js';
import { Battle, NEUTRAL, TRANSFORM } from './game/rules.js';
import { scenario } from './game/scenario.js';
import { WIN_LINE, scriptFor } from './game/scripts.js';
import { aiTurn } from './game/ai.js';
import { mapPoints, rankOf, rankName } from './game/points.js';
import { LABEL as EV, COMET_MAP, inLane, detachBurner, decimator, blast } from './game/events.js';
import { FightScene } from './game/fightscene.js';
import { Sound, mapMusic, SONGS, briefingSong } from './audio/sound.js';
import { drawScreen } from './screens.js';
import { loadProgress, saveProgress, saveBattle, savedBattle, clearSavedBattle, restoreBattle } from './game/savegame.js';

const $ = (id) => document.getElementById(id);
const Z = 2, OFF = 16;          // board zoom; render crop offset (playfield starts at cell 1,1)
// Defeat text (labels 68-86) by campaign stage: Hercules, Erebos, the Basilisk counterattack,
// Ragnarok, Yahweh (Babylon).
const LOST_LINES = [[0, [68, 69, 70, 71]], [10, [72, 73, 76]], [20, [74, 75]], [22, [77, 78, 79, 80, 81]], [28, [82, 83, 84, 85, 86]]];
const ALERT_GALT = 87, ALERT_UNION = 88, BABYLON_ALERT = 94;

let rom, romEn = null, en = null, pal, types, battle, mission = 0, terrainCanvas;
let sel = null, reach = null, targets = [], hosts = [], launching = null, busy = false, blastCells = null;
let cursor = null;   // keyboard cursor hex [x, y]

// Original music and effects (js/audio), started by the first click (browsers need a gesture);
// the map music follows the phase and the unit counts, as in play.js.
let sound = null;
const MUTE = 'earthlight-mute';
function music() {
  if (!sound || !battle || $('sBattle').hidden || battle.winner() !== null) return;
  sound.playSong(mapMusic(rom, mission, battle.army, battle.forces(0).length, battle.forces(1).length, !!battle.eventMusic));
}
function silence() { screenSong = null; if (sound) sound.stop(); }
// Songs of the non-battle screens (sound.js SONGS): title, menu, briefing, between missions, ending.
let screenSong = null;
function playSong(s) { screenSong = s; if (sound) sound.playSong(s); }
function startSound() {
  if (sound || !rom) return;
  sound = new Sound(rom); sound.setMuted($('mute').checked);
  sound.start().then(() => { if (screenSong) sound.playSong(screenSong); else music(); });
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
if (new URLSearchParams(location.search).has('debug')) window.earthlight = { battle: () => battle, act: (x, y) => act(x, y), busy: () => busy };

// ------------------------------------------------------------------ progress
const progress = loadProgress;
const label = (i) => (en ? en.labels[i] : '');
const nameOf = (u) => (en ? en.unitNames[u.type] : types[u.type].name);
const missionTitle = (m) => (en ? en.labels[LAYOUT.mapTitles + m].replace(/\n/g, ' ') : mapInfo(rom, m).name);
const side = (a) => (a === NEUTRAL ? 'neutral' : a ? 'armyB' : 'armyA');

function show(id) {
  for (const s of ['sLoad', 'sTitle', 'sStory', 'sBattle', 'sResult']) $(s).hidden = s !== id;
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
  $('bSave').onclick = () => { if (!busy && battle.army === 0) log(saveBattle(battle, mission) ? '<b>Battle saved.</b>' : '<b>Could not save (storage unavailable).</b>'); };
  $('bRestart').onclick = () => { if (!busy) startMission(mission); };
  $('bRetreat').onclick = () => { if (!busy) showTitle({ menu: true }); };
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
  const info = mapInfo(rom, m);
  const terr = renderMap(rom, info, { units: false });
  terrainCanvas = document.createElement('canvas');
  paint(terrainCanvas, terr.img, pal, { scale: Z });
  sel = null; reach = null; targets = []; hosts = []; launching = null; busy = false; blastCells = null; $('log').innerHTML = '';
  show('sBattle'); $('where').textContent = `mission ${m + 1} · ${missionTitle(m)}`;
  return info;
}

// The board's terrain, redrawn from the battle's own cells (the Decimator clears them).
function paintTerrain() {
  const terr = renderMap(rom, battle.info, { units: false, grid: battle.grid });
  terrainCanvas = document.createElement('canvas');
  paint(terrainCanvas, terr.img, pal, { scale: Z });
}

function newBattle(m) {
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

function begin() {
  draw(); hud(`<p><b>Objective:</b> ${battle.script.goal}</p><span class="dim">Click one of your units. Docks and carriers hold more units: click them to launch.
    Neutral docks (grey) can be captured, with the units inside, by bringing them down to 0 HP.</span>`);
  const first = battle.alive(0)[0];
  if (first) { const [X, Y] = px(first.x, first.y); $('board').scrollTo(X - 200, Y - 150); }
}

function runFight(e) {
  if (!$('optFights').checked) return Promise.resolve();
  const sideOf = (u, before, after, other, w) => ({ type: u.type, army: u.army === NEUTRAL ? 1 - other.army : u.army, hp: before, hpAfter: after, cls: battle.cls(u.x, u.y), slot: w?.slot });
  const scene = new FightScene(rom, sideOf(e.att, e.before[0], e.after[0], e.def, e.w), sideOf(e.def, e.before[1], e.after[1], e.att, e.cw),
    { counter: !!e.cw, info: e.info, textRom: romEn, names: en ? en.unitNames : null });
  scene.att.cls = battle.cls(e.att.x, e.att.y);
  const ov = $('fight'), ctx = $('fightCv').getContext('2d');
  ov.hidden = false;
  return new Promise((resolve) => {
    let last = null, skip = false;
    ov.onclick = () => { skip = true; };
    const tick = (t) => {
      if (last === null) last = t;
      while (t - last >= 1000 / 60 && !scene.done) {
        scene.step(); last += 1000 / 60;
        if (sound) new Set(scene.sounds()).forEach((id) => sound.playSfx(id));
      }
      scene.render(ctx);
      if (skip && sound) sound.playSfx(3);   // stop the fight's effects, as the fight end does
      if (scene.done || skip) { ov.hidden = true; resolve(); } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function px(x, y) { const [X, Y] = cellOrigin(x, y); return [(X - OFF) * Z, (Y - OFF) * Z]; }
function hexPath(ctx, x, y) {
  const [X, Y] = px(x, y);
  ctx.beginPath();
  HEX_POINTS.forEach(([a, b], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, X + a * Z, Y + b * Z));
  ctx.closePath();
}

// Neutral docks use the Union icon drawn in grey.
const iconCache = new Map();
function maskedIcon(u) {
  const key = `${u.army}:${u.type}`;
  if (!iconCache.has(key)) {
    const c = document.createElement('canvas');
    paint(c, unitIcon(rom, u.army === NEUTRAL ? 0 : u.army, types[u.type].gfx, 0), pal, { scale: Z });
    if (u.army === NEUTRAL) {
      const g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
      const gx = g.getContext('2d'); gx.filter = 'grayscale(1) brightness(1.1)'; gx.drawImage(c, 0, 0);
      iconCache.set(key, g);
    } else iconCache.set(key, c);
  }
  return iconCache.get(key);
}

const HP_COLOUR = ['#ff8fd8', '#8fe38a', '#d0d0d0'];
function draw() {
  music();
  const cv = $('cv'), ctx = cv.getContext('2d');
  cv.width = terrainCanvas.width; cv.height = terrainCanvas.height;
  ctx.drawImage(terrainCanvas, 0, 0);
  if (reach) {
    ctx.fillStyle = launching ? 'rgba(120,255,160,.4)' : 'rgba(80,160,255,.35)';
    for (const key of reach.keys()) { const [x, y] = key.split(',').map(Number); hexPath(ctx, x, y); ctx.fill(); }
  }
  if (battle.cannons.length) {   // Buccaneer lanes (map 19): everything here is destroyed at the next phase change
    ctx.fillStyle = 'rgba(255,120,40,.18)';
    for (const c of battle.cannons) for (let y = c.y; y <= battle.info.rows; y++) if (inLane(battle, c.x, y)) { hexPath(ctx, c.x, y); ctx.fill(); }
  }
  if (blastCells) {
    ctx.fillStyle = 'rgba(200,90,255,.35)';
    for (const [x, y] of blastCells) { hexPath(ctx, x, y); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(255,60,60,.45)';
  for (const t of targets) { hexPath(ctx, t.x, t.y); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,214,74,.45)';
  for (const h of hosts) { hexPath(ctx, h.x, h.y); ctx.fill(); }
  for (const u of battle.alive()) {
    const [X, Y] = px(u.x, u.y);
    ctx.globalAlpha = u.acted && !u.reMove && u.army === battle.army ? 0.55 : 1;
    ctx.drawImage(maskedIcon(u), X, Y);
    ctx.globalAlpha = 1;
    const n = battle.cargo(u).length, txt = n ? `${u.hp}+${n}` : `${u.hp}`;
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#000'; ctx.fillText(txt, X + 33, Y + 31);
    ctx.fillStyle = HP_COLOUR[u.army]; ctx.fillText(txt, X + 32, Y + 30);
    if (u.burner) { ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#000'; ctx.fillText('AB', X + 1, Y + 31); ctx.fillStyle = '#ffa040'; ctx.fillText('AB', X, Y + 30); }
    if (u.level) { ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#000'; ctx.fillText(`L${u.level}`, X + 1, Y + 9); ctx.fillStyle = '#ffd84a'; ctx.fillText(`L${u.level}`, X, Y + 8); }
  }
  if (sel) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; hexPath(ctx, sel.x, sel.y); ctx.stroke(); }
  if (cursor) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); hexPath(ctx, ...cursor); ctx.stroke(); ctx.setLineDash([]); }
}

function hud(msg) {
  const lim = battle.script.limit;
  $('turn').innerHTML = `Turn ${battle.turn}${lim ? ` / ${lim}` : ''} · <span class="${side(battle.army)}">${battle.army ? 'Galt' : 'Union'}</span>`
    + ` <small>${battle.forces(0).length} vs ${battle.forces(1).length}</small>`
    + `<div class="small dim">${battle.script.goal}${battle.hard ? ' · hard mode' : ''}</div>`;
  if (msg !== undefined) $('info').innerHTML = msg;
}

function unitCard(u, extra = '') {
  const t = types[u.type];
  const ws = t.weapons.filter(Boolean).map((w) => `${'BNM'[w.mode]} r${w.min}${w.max > w.min ? '–' + w.max : ''} p${w.power}`).join(' · ');
  const who = u.army === NEUTRAL ? '<p class="dim">Neutral dock: bring it to 0 HP to capture it and everything inside.</p>' : '';
  const role = (u.guard ? ' · <span class="dim">guard</span>' : '') + (u.burner ? ' · <span style="color:#ffa040">afterburner (move 10)</span>' : '');
  return `<h3 class="${side(u.army)}">${nameOf(u)} <span class="dim mono">${t.code}</span></h3>
    HP ${u.hp}/${t.hp} · Move ${t.move} · Lv ${u.level}${role}<br><span class="mono small">${ws || 'unarmed'}</span>${who}${extra}`;
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
  sel = u; launching = null;
  reach = battle.movePoints(u) ? battle.reachable(u) : null;
  targets = battle.targets(u); hosts = battle.boardable(u);
  blastCells = null;
  const dec = u.army === 0 ? decimator(battle, u) : [];
  if (dec.length) targets = targets.filter((e) => battle.weaponsAgainst(u, e).some((w) => w.slot !== 3));
  const tf = battle.canTransform(u) ? `<button class="btn" id="bTransform">Transform → ${types[TRANSFORM[u.type]].code}</button>` : '';
  const again = u.acted && u.reMove ? '<p>Move again (optional), or click elsewhere to finish.</p>' : '';
  const det = (u.burner && u.army === 0 ? '<button class="btn" id="bDetach">Detach burner</button>' : '')
    + (dec.length ? '<button class="btn" id="bDecimator">Quantum Decimator</button>' : '');
  const legend = `<p class="dim">Blue: move${hosts.length ? ' · yellow: board (full repair, re-arm)' : ''} · red: attack.</p>`;
  draw(); hud(unitCard(u, cargoPanel(u) + again + legend + (tf || det ? `<div class="row">${tf}${det}</div>` : '')));
  if (dec.length) $('bDecimator').onclick = () => {
    reach = null; targets = []; hosts = []; blastCells = dec;
    draw(); hud(unitCard(u, '<p>Click a purple hex: the Decimator clears it and the six hexes around it, destroying whatever is there.</p>'));
  };
  if (u.burner && u.army === 0) $('bDetach').onclick = async () => { detachBurner(battle, u); log(`<span class="armyA">${nameOf(u)}</span> detached its afterburner`); await alerts([EV.burner]); select(u); };
  for (const b of $('info').querySelectorAll('[data-launch]')) b.onclick = () => startLaunch(battle.units[+b.dataset.launch]);
  if (tf) $('bTransform').onclick = () => { battle.transform(u); log(`<span class="armyA">${nameOf(u)}</span> transformed (${types[u.type].code})`); select(u); };
}

function startLaunch(u) {
  launching = u; sel = u.carrier; targets = []; hosts = [];
  reach = new Map(battle.launchCells(u).map(([x, y]) => [`${x},${y}`, 0]));
  draw(); hud(unitCard(u, '<p>Click a green hex to launch.</p>'));
}

function clearSel() { sel = null; reach = null; targets = []; hosts = []; launching = null; blastCells = null; draw(); }

function onClick(ev) {
  const r = ev.target.getBoundingClientRect(), k = ev.target.width / r.width;   // the board may be scaled down on phones
  const [cx, cy] = cellAt(((ev.clientX - r.left) * k) / Z + OFF, ((ev.clientY - r.top) * k) / Z + OFF);
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
    const [X, Y] = px(...cursor), b = $('board');
    if (X < b.scrollLeft || X > b.scrollLeft + b.clientWidth - 48 || Y < b.scrollTop || Y > b.scrollTop + b.clientHeight - 32) b.scrollTo(X - b.clientWidth / 2, Y - b.clientHeight / 2);
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
    sel = l; launching = null; reach = null; hosts = []; targets = battle.targets(l);
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
    if (again) { const s = sel; clearSel(); hud(unitCard(s)); return; }
    reach = null; targets = battle.targets(sel); hosts = [];
    draw(); hud(unitCard(sel, targets.length ? '<p>Click a red hex to attack.</p>' : '<p>No targets in range.</p>'));
    if (!targets.length) { sel.acted = true; clearSel(); }
    return;
  }
  if (u && u.army === 0 && (!u.acted || u.reMove || battle.cargo(u).length)) { select(u); return; }
  if (u) hud(unitCard(u, sel && targets.includes(u) ? forecastHtml(sel, u) : ''));
  if (sel && sel.acted) sel.reMove = 0;   // a pending move-after-firing is given up
  clearSel();
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
  sel = null; reach = null; targets = []; hosts = []; blastCells = null; busy = true;
  if (sound) sound.playSfx(0x3F);   // explosion
  await flash(e.cells, 'rgba(255,255,255,.8)');
  paintTerrain();
  busy = false;
  if (checkEnd()) { draw(); return; }
  if (a.hp && a.reMove) select(a); else { draw(); hud(unitCard(a)); }
}

// Brief highlight of some hexes (cannon fire, Decimator blast).
function flash(cells, colour) {
  return new Promise((done) => {
    let n = 0;
    const tick = () => {
      draw();
      if (n % 2 === 0) { const ctx = $('cv').getContext('2d'); ctx.fillStyle = colour; for (const [x, y] of cells) { hexPath(ctx, x, y); ctx.fill(); } }
      if (++n < 6) setTimeout(tick, 110); else { draw(); done(); }
    };
    tick();
  });
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
  sel = null; reach = null; targets = []; hosts = []; busy = true;
  await runFight(e);
  busy = false;
  if (checkEnd()) { draw(); return; }
  if (a.hp && a.reMove) select(a); else { draw(); hud(unitCard(d)); }
}

function announce(arrived) {
  if (!arrived.length) return;
  const a = arrived[0].army;
  log(`<b class="${side(a)}">${a ? 'Galt' : 'Union'} reinforcements: ${arrived.length} units</b>`);
  const t = label(a ? ALERT_GALT : ALERT_UNION).replace(/\n/g, ' ');
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
