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
import { FightScene } from './game/fightscene.js';
import { loadProgress, saveProgress, saveBattle, savedBattle, clearSavedBattle, restoreBattle } from './game/savegame.js';

const $ = (id) => document.getElementById(id);
const Z = 2, OFF = 16;          // board zoom; render crop offset (playfield starts at cell 1,1)
// Defeat text (labels 68-86) by campaign stage: Hercules, Erebos, the Basilisk counterattack,
// Ragnarok, Yahweh (Babylon).
const LOST_LINES = [[0, [68, 69, 70, 71]], [10, [72, 73, 76]], [20, [74, 75]], [22, [77, 78, 79, 80, 81]], [28, [82, 83, 84, 85, 86]]];
const ALERT_GALT = 87, ALERT_UNION = 88, BABYLON_ALERT = 94;

let rom, romEn = null, en = null, pal, types, battle, mission = 0, terrainCanvas;
let sel = null, reach = null, targets = [], hosts = [], launching = null, busy = false;

// ------------------------------------------------------------------ loading
function idbGet(key) {
  return new Promise((res) => {
    try {
      const r = indexedDB.open('earthlight-lab', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rom');
      r.onsuccess = () => {
        const g = r.result.transaction('rom').objectStore('rom').get(key);
        g.onsuccess = () => res(g.result || null); g.onerror = () => res(null);
      };
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}
// serve.py --rom/--patch exposes test files on localhost; used when nothing is stored
async function testFile(url, read) {
  try { const r = await fetch(url); return r.ok ? await read(new File([await r.arrayBuffer()], 'f')) : null; } catch { return null; }
}

(async () => {
  const buf = (await idbGet('rom')) || (await testFile('/__test_rom', readRomFile));
  if (!buf) { $('loadMsg').innerHTML = 'No ROM loaded yet. Open the <a href="index.html">lab</a> and load your Earth Light ROM (and the English patch, if you have it).'; return; }
  rom = new Rom(buf);
  if (!rom.isEarthLight()) { $('loadMsg').textContent = 'That ROM is not Earth Light (Japan).'; return; }
  pal = battlePalette(rom); types = allUnitTypes(rom);
  const patch = (await idbGet('patch')) || (await testFile('/__test_patch', readPatchFile));
  if (patch) { try { const b = applyBps(patch, rom.bytes.slice().buffer); en = readEnglish(b); romEn = new Rom(b); } catch { en = null; } }
  $('status').textContent = en ? 'English patch loaded' : 'Japanese ROM (load the English patch in the lab for story text)';
  wire();
  showTitle();
})();

// ------------------------------------------------------------------ progress
const progress = loadProgress;
const label = (i) => (en ? en.labels[i] : '');
const nameOf = (u) => (en ? en.unitNames[u.type] : types[u.type].name);
const missionTitle = (m) => (en ? en.labels[LAYOUT.mapTitles + m].replace(/\n/g, ' ') : mapInfo(rom, m).name);
const side = (a) => (a === NEUTRAL ? 'neutral' : a ? 'armyB' : 'armyA');

function show(id) {
  for (const s of ['sLoad', 'sTitle', 'sStory', 'sBattle', 'sResult']) $(s).hidden = s !== id;
}

function wire() {
  $('bNew').onclick = () => {
    const p = progress();
    saveProgress({ ...p, next: 0, cleared: p.cleared });
    clearSavedBattle();
    story(en ? en.main.slice(LAYOUT.intro[0], LAYOUT.intro[1] + 1) : [], 'EARTH LIGHT', () => briefing(0));
  };
  $('bContinue').onclick = () => briefing(progress().next);
  $('bLoad').onclick = loadBattle;
  $('bSelect').onclick = () => { $('missions').hidden = !$('missions').hidden; };
  $('optHard').onchange = () => saveProgress({ ...progress(), hard: $('optHard').checked });
  $('endTurn').onclick = endTurn;
  $('bSave').onclick = () => { if (!busy && battle.army === 0) log(saveBattle(battle, mission) ? '<b>Battle saved.</b>' : '<b>Could not save (storage unavailable).</b>'); };
  $('bRestart').onclick = () => { if (!busy) startMission(mission); };
  $('bRetreat').onclick = () => { if (!busy) showTitle(); };
  $('cv').addEventListener('click', onClick);
}

// ------------------------------------------------------------------ title and story
function showTitle() {
  show('sTitle'); $('where').textContent = 'campaign';
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

function story(pages, title, done) {
  if (!pages.length) { done(); return; }
  show('sStory');
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
  story(pages, `Mission ${m + 1}\n${missionTitle(m)}`, () => startMission(m));
}

// ------------------------------------------------------------------ battle
function setupBoard(m) {
  mission = m;
  const info = mapInfo(rom, m);
  const terr = renderMap(rom, info, { units: false });
  terrainCanvas = document.createElement('canvas');
  paint(terrainCanvas, terr.img, pal, { scale: Z });
  sel = null; reach = null; targets = []; hosts = []; launching = null; busy = false; $('log').innerHTML = '';
  show('sBattle'); $('where').textContent = `mission ${m + 1} · ${missionTitle(m)}`;
  return info;
}

function newBattle(m) {
  const info = mapInfo(rom, m), sc = scenario(rom, info);
  return new Battle(rom, info, types, sc.units, sc.arrivals, { hard: $('optHard').checked && !$('hardRow').hidden });
}

function startMission(m) {
  setupBoard(m);
  battle = newBattle(m);
  begin();
}

function loadBattle() {
  const s = savedBattle();
  if (!s) return;
  setupBoard(s.mission);
  battle = restoreBattle(newBattle(s.mission), s);
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
  const sideOf = (u, before, after, other) => ({ type: u.type, army: u.army === NEUTRAL ? 1 - other.army : u.army, hp: before, hpAfter: after, cls: battle.cls(u.x, u.y) });
  const scene = new FightScene(rom, sideOf(e.att, e.before[0], e.after[0], e.def), sideOf(e.def, e.before[1], e.after[1], e.att),
    { counter: !!e.cw, info: e.info, textRom: romEn, names: en ? en.unitNames : null });
  scene.att.cls = battle.cls(e.att.x, e.att.y);
  const ov = $('fight'), ctx = $('fightCv').getContext('2d');
  ov.hidden = false;
  return new Promise((resolve) => {
    let last = null, skip = false;
    ov.onclick = () => { skip = true; };
    const tick = (t) => {
      if (last === null) last = t;
      while (t - last >= 1000 / 60 && !scene.done) { scene.step(); last += 1000 / 60; }
      scene.render(ctx);
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
  const cv = $('cv'), ctx = cv.getContext('2d');
  cv.width = terrainCanvas.width; cv.height = terrainCanvas.height;
  ctx.drawImage(terrainCanvas, 0, 0);
  if (reach) {
    ctx.fillStyle = launching ? 'rgba(120,255,160,.4)' : 'rgba(80,160,255,.35)';
    for (const key of reach.keys()) { const [x, y] = key.split(',').map(Number); hexPath(ctx, x, y); ctx.fill(); }
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
    if (u.level) { ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#000'; ctx.fillText(`L${u.level}`, X + 1, Y + 9); ctx.fillStyle = '#ffd84a'; ctx.fillText(`L${u.level}`, X, Y + 8); }
  }
  if (sel) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; hexPath(ctx, sel.x, sel.y); ctx.stroke(); }
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
  const role = u.guard ? ' · <span class="dim">guard</span>' : '';
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
  const tf = battle.canTransform(u) ? `<button class="btn" id="bTransform">Transform → ${types[TRANSFORM[u.type]].code}</button>` : '';
  const again = u.acted && u.reMove ? '<p>Move again (optional), or click elsewhere to finish.</p>' : '';
  const legend = `<p class="dim">Blue: move${hosts.length ? ' · yellow: board (full repair, re-arm)' : ''} · red: attack.</p>`;
  draw(); hud(unitCard(u, cargoPanel(u) + again + legend + (tf ? `<div class="row">${tf}</div>` : '')));
  for (const b of $('info').querySelectorAll('[data-launch]')) b.onclick = () => startLaunch(battle.units[+b.dataset.launch]);
  if (tf) $('bTransform').onclick = () => { battle.transform(u); log(`<span class="armyA">${nameOf(u)}</span> transformed (${types[u.type].code})`); select(u); };
}

function startLaunch(u) {
  launching = u; sel = u.carrier; targets = []; hosts = [];
  reach = new Map(battle.launchCells(u).map(([x, y]) => [`${x},${y}`, 0]));
  draw(); hud(unitCard(u, '<p>Click a green hex to launch.</p>'));
}

function clearSel() { sel = null; reach = null; targets = []; hosts = []; launching = null; draw(); }

function onClick(ev) {
  if (busy || battle.winner() !== null || battle.army !== 0) return;
  const r = ev.target.getBoundingClientRect();
  const [cx, cy] = cellAt((ev.clientX - r.left) / Z + OFF, (ev.clientY - r.top) / Z + OFF);
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

function bestWeapon(a, d) {
  return battle.weaponsAgainst(a, d).map((w) => [w, battle.forecast(a, d, w)]).sort((x, y) => y[1].dealt - x[1].dealt)[0][0];
}
function forecastHtml(a, d) {
  const f = battle.forecast(a, d, bestWeapon(a, d));
  return `<p>Forecast: deal ≈${f.dealt.toFixed(1)}, take ≈${f.taken.toFixed(1)}</p>`;
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
    else await new Promise((r) => setTimeout(r, 120));
    if (battle.winner() !== null) break;
  }
  busy = false;
  if (checkEnd()) return;
  announce(battle.endTurn());
  draw(); hud('<span class="dim">Your turn.</span>');
  turnAlert();
  checkEnd();
}

// ------------------------------------------------------------------ results
function checkEnd() {
  const w = battle.winner();
  if (w === null) return false;
  setTimeout(() => result(w), 400);
  return true;
}

function result(w) {
  show('sResult');
  const p = progress();
  const lost = battle.units.filter((u) => u.army === 0 && u.hp <= 0).length;
  if (w === 0) {
    if (!p.cleared.includes(mission)) p.cleared.push(mission);
    p.next = Math.max(p.next, mission + 1);
    const prev = p.best[mission];
    if (!prev || battle.turn < prev.turns) p.best[mission] = { turns: battle.turn };
    saveProgress(p);
    clearSavedBattle();
    $('resTitle').textContent = `Mission ${mission + 1} complete`;
    $('resText').textContent = `${label(WIN_LINE[battle.result.reason] ?? 1)}\n\nCleared on turn ${battle.turn}.`;
    const last = mission + 1 >= MAP_COUNT;
    $('bResNext').textContent = last ? 'Ending' : `Next: mission ${mission + 2}`;
    $('bResNext').onclick = () => (last
      ? story(en ? en.labels.slice(LAYOUT.ending, LAYOUT.ending + 6).filter((s) => s.trim()) : ['The End'], 'EARTH LIGHT', showTitle)
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
  $('resLoss').textContent = w === 0 ? `Units lost: ${lost}` : '';
  $('bResTitle').onclick = showTitle;
}
