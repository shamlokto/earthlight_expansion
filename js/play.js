import { Rom } from './rom.js';
import { paint } from './gfx.js';
import { MAP_COUNT, mapInfo, battlePalette, renderMap, unitIcon, deployment, cellOrigin, cellAt, HEX_POINTS } from './maps.js';
import { allUnitTypes } from './units.js';
import { applyBps } from './bps.js';
import { readEnglish } from './text.js';
import { Battle } from './game/rules.js';
import { aiTurn } from './game/ai.js';
import { FightScene } from './game/fightscene.js';

// Play the fight cut-in for a resolved attack (log entry from Battle.attack).
function runFight(e) {
  if (!$('showFights').checked) return Promise.resolve();
  const side = (u, before, after) => ({ type: u.type, army: u.army, hp: before, hpAfter: after, cls: battle.cls(u.x, u.y) });
  const scene = new FightScene(rom, side(e.att, e.before[0], e.after[0]), side(e.def, e.before[1], e.after[1]),
    { counter: !!e.cw, info: e.info, textRom: romEn, names });
  scene.att.cls = battle.cls(e.att.x, e.att.y);
  const ov = $('fight'), cv = $('fightCv'), ctx = cv.getContext('2d');
  $('fightCap').textContent = `${nameOf(e.att)} ${e.before[0]}→${e.after[0]}  vs  ${nameOf(e.def)} ${e.before[1]}→${e.after[1]}`;
  ov.hidden = false;
  return new Promise((resolve) => {
    let last = null, skip = false;
    ov.onclick = () => { skip = true; };
    const tick = (t) => {
      if (last === null) last = t;
      // fixed 60 fps timestep, like the SNES frame
      while (t - last >= 1000 / 60 && !scene.done) { scene.step(); last += 1000 / 60; }
      scene.render(ctx);
      if (scene.done || skip) { ov.hidden = true; resolve(); } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

const $ = (id) => document.getElementById(id);
const Z = 2, OFF = 16; // zoom; render crop offset (playfield starts at cell 1,1)

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

let rom, romEn = null, pal, types, names = null, battle, terrainCanvas, sel = null, reach = null, targets = [], busy = false;

(async () => {
  const buf = await idbGet('rom');
  if (!buf) { $('status').innerHTML = 'No ROM loaded yet — open the <a href="index.html">lab</a> and load it first.'; return; }
  rom = new Rom(buf); pal = battlePalette(rom); types = allUnitTypes(rom);
  const patch = await idbGet('patch');
  if (patch) {
    try { const en = applyBps(patch, rom.bytes.slice().buffer); names = readEnglish(en).unitNames; romEn = new Rom(en); } catch { }
  }
  for (let m = 0; m < MAP_COUNT; m++) {
    const i = mapInfo(rom, m), d = deployment(rom, i);
    const both = d.some((u) => u.army) && d.some((u) => !u.army);
    $('mapSel').insertAdjacentHTML('beforeend', `<option value="${m}">${m + 1}. ${i.name}${both ? '' : ' (no enemies at start)'}</option>`);
  }
  $('mapSel').value = 1;
  $('mapSel').onchange = $('restart').onclick = start;
  $('endTurn').onclick = endTurn;
  $('cv').addEventListener('click', onClick);
  start();
})();

const nameOf = (u) => (names ? names[u.type] : types[u.type].name);

function start() {
  const info = mapInfo(rom, +$('mapSel').value);
  battle = new Battle(rom, info, types, deployment(rom, info));
  const terr = renderMap(rom, info, { units: false });
  terrainCanvas = document.createElement('canvas');
  paint(terrainCanvas, terr.img, pal, { scale: Z });
  sel = null; reach = null; targets = []; $('log').innerHTML = '';
  draw(); hud();
}

function px(x, y) { const [X, Y] = cellOrigin(x, y); return [(X - OFF) * Z, (Y - OFF) * Z]; }

function hexPath(ctx, x, y) {
  const [X, Y] = px(x, y);
  ctx.beginPath();
  HEX_POINTS.forEach(([a, b], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, X + a * Z, Y + b * Z));
  ctx.closePath();
}

function draw() {
  const cv = $('cv'), ctx = cv.getContext('2d');
  cv.width = terrainCanvas.width; cv.height = terrainCanvas.height;
  ctx.drawImage(terrainCanvas, 0, 0);
  if (reach) {
    ctx.fillStyle = 'rgba(80,160,255,.35)';
    for (const key of reach.keys()) { const [x, y] = key.split(',').map(Number); hexPath(ctx, x, y); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(255,60,60,.45)';
  for (const t of targets) { hexPath(ctx, t.x, t.y); ctx.fill(); }
  for (const u of battle.alive()) {
    const [X, Y] = px(u.x, u.y);
    ctx.globalAlpha = u.acted && u.army === battle.army ? 0.55 : 1;
    // unitIcon is masked; draw only its opaque pixels
    ctx.drawImage(maskedIcon(u), X, Y);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#000'; ctx.fillText(u.hp, X + 33, Y + 31);
    ctx.fillStyle = u.army ? '#ff9aa6' : '#9cc4ff'; ctx.fillText(u.hp, X + 32, Y + 30);
  }
  if (sel) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; hexPath(ctx, sel.x, sel.y); ctx.stroke(); }
}

const iconCache = new Map();
function maskedIcon(u) {
  const key = `${u.army}:${u.type}`;
  if (!iconCache.has(key)) {
    const c = document.createElement('canvas');
    paint(c, unitIcon(rom, u.army, types[u.type].gfx, 0), pal, { scale: Z }); // opaque mask -> transparent
    iconCache.set(key, c);
  }
  return iconCache.get(key);
}

function hud(msg) {
  const w = battle.winner();
  $('turn').innerHTML = w !== null
    ? `<span class="${w ? 'armyB' : 'armyA'}">Army ${w ? 'B' : 'A'} wins!</span>`
    : `Turn ${battle.turn} · <span class="${battle.army ? 'armyB' : 'armyA'}">Army ${battle.army ? 'B' : 'A'}</span>`;
  if (msg !== undefined) $('info').innerHTML = msg;
}

function unitCard(u, extra = '') {
  const t = types[u.type];
  const ws = t.weapons.filter(Boolean).map((w) => `W${w.slot + 1}: M${w.mode + 1} r${w.min}${w.max > w.min ? '–' + w.max : ''} p${w.power}`).join('<br>');
  return `<h3 class="${u.army ? 'armyB' : 'armyA'}">${nameOf(u)} <span class="dim mono">${t.code}</span></h3>
    HP ${u.hp}/${t.hp} · Move ${t.move} · Evasion ${Math.round(t.evasion * 100 / 128)}%<br><span class="mono small">${ws || 'unarmed'}</span>${extra}`;
}

function log(e) {
  const d = document.createElement('div');
  d.innerHTML = `<span class="${e.att.army ? 'armyB' : 'armyA'}">${nameOf(e.att)}</span> → <span class="${e.def.army ? 'armyB' : 'armyA'}">${nameOf(e.def)}</span>: `
    + `${e.before[1]}→${e.after[1]} HP` + (e.cw ? `, counter ${e.before[0]}→${e.after[0]}` : '');
  $('log').prepend(d);
}

function onClick(ev) {
  if (busy || battle.winner() !== null) return;
  const r = ev.target.getBoundingClientRect();
  const [cx, cy] = cellAt((ev.clientX - r.left) / Z + OFF, (ev.clientY - r.top) / Z + OFF);
  const u = battle.unitAt(cx, cy);
  if (sel && targets.includes(u)) {
    const w = bestWeapon(sel, u);
    const e = battle.attack(sel, u, w);
    log(e);
    sel = null; reach = null; targets = [];
    busy = true;
    runFight(e).then(() => { busy = false; draw(); hud(unitCard(u)); maybeAi(); });
    return;
  }
  if (sel && reach && reach.has(`${cx},${cy}`) && !u) {
    battle.move(sel, cx, cy);
    reach = null; targets = battle.targets(sel);
    draw(); hud(unitCard(sel, targets.length ? '<p>Click a red hex to attack.</p>' : '<p>No targets in range.</p>'));
    if (!targets.length) { sel.acted = true; sel = null; draw(); }
    return;
  }
  if (u && u.army === battle.army && !u.acted && !(battle.army === 1 && $('bCtl').value === 'ai')) {
    sel = u; reach = u.moved ? null : battle.reachable(u); targets = battle.targets(u);
    draw(); hud(unitCard(u, '<p>Click a blue hex to move, or a red hex to attack.</p>'));
    return;
  }
  if (u) {
    let extra = '';
    if (sel && targets.includes(u)) extra = forecastHtml(sel, u);
    hud(unitCard(u, extra));
  }
  sel = null; reach = null; targets = []; draw();
}

function bestWeapon(a, d) {
  return battle.weaponsAgainst(a, d).map((w) => [w, battle.forecast(a, d, w)]).sort((x, y) => y[1].dealt - x[1].dealt)[0][0];
}
function forecastHtml(a, d) {
  const f = battle.forecast(a, d, bestWeapon(a, d));
  return `<p>Forecast: deal ≈${f.dealt.toFixed(1)}, take ≈${f.taken.toFixed(1)}</p>`;
}

async function endTurn() {
  if (busy) return;
  battle.endTurn(); sel = null; reach = null; targets = [];
  draw(); hud(''); maybeAi();
}

async function maybeAi() {
  if (battle.army !== 1 || $('bCtl').value !== 'ai' || battle.winner() !== null) return;
  if (battle.alive(1).some((u) => !u.acted) === false) return;
  busy = true;
  for (const step of aiTurn(battle)) {
    draw(); hud();
    if (step.kind === 'attack') { log(step); await runFight(step); draw(); }
    await new Promise((r) => setTimeout(r, 350));
  }
  busy = false;
  if (battle.winner() === null) { battle.endTurn(); draw(); hud(''); }
}
