// The intermission between expansion battles, a plain web page in the spirit of SRW's:
// roster (machines and their pilots' levels), production, trade, the general, deployment, and
// the next mission's briefing. State lives in campaign.js; battles run in game.html.
import { Rom } from '../rom.js';
import { paint } from '../gfx.js';
import { battlePalette, unitIcon } from '../maps.js';
import { allUnitTypes } from '../units.js';
import { applyBps } from '../bps.js';
import { readEnglish } from '../text.js';
import * as C from './campaign.js';
import { clearSavedBattle, EXPANSION_BATTLE } from '../game/savegame.js';

const $ = (id) => document.getElementById(id);
let rom, pal, types, en = null, index, state, next = null, picked = new Set();

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

const name = (t) => (en ? en.unitNames[t] : types[t].name);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function icon(type) { const c = document.createElement('canvas'); paint(c, unitIcon(rom, 0, types[type].gfx), pal, { scale: 2 }); return c.outerHTML.replace('<canvas', `<canvas data-icon="${type}"`); }
function fillIcons() { for (const c of document.querySelectorAll('canvas[data-icon]')) paint(c, unitIcon(rom, 0, types[+c.dataset.icon].gfx), pal, { scale: 2 }); }

const unlocked = () => [...new Set([...(index.start || []), ...index.missions.slice(0, state.next).flatMap((m) => m.unlocks || [])])];
const entry = () => index.missions[state.next] || null;

async function loadNext() {
  const e = entry();
  next = e && e.file ? await (await fetch(e.file)).json() : null;
}

function save() { C.save(state); }

function render() {
  const e = entry(), cap = next ? C.deployCap(next) : 0;
  if (!state.deploy) state.deploy = state.roster.slice(0, cap).map((r) => r.id);
  const deployed = new Set(state.deploy), value = (ids) => [...ids].reduce((t, id) => t + C.price(types, state.roster.find((r) => r.id === id).type), 0);
  const tradeValue = value(picked);
  let html = `<div class="box stats"><span>Mission <b>${e ? e.no : '—'}</b> / ${index.missions.length}</span><span>Supply <b>${state.supply}</b></span>
    <span>Built this intermission <b>${state.builds}</b> / ${C.MAX_BUILDS}</span><span>Machines <b>${state.roster.length}</b></span></div>`;

  if (!e) html += `<div class="box"><h2>Campaign complete</h2><p>The Union leadership has fallen.</p></div>`;
  else {
    html += `<div class="box"><h2>Next: ${esc(e.title)}</h2>`;
    if (!next) html += `<p class="muted">This mission isn't built yet: paint it in the map editor and add its file to missions/index.json.</p>`;
    else {
      html += `<p class="brief">${esc(next.briefing || '')}</p>${e.hint ? `<p class="muted">Next map wants: ${esc(e.hint)}</p>` : ''}
        <p class="muted">Deploy up to ${cap} machines (${deployed.size} chosen).${next.turnLimit ? ` Turn limit ${next.turnLimit}.` : ''}</p>
        <div class="row"><button class="btn primary" id="launch" ${deployed.size ? '' : 'disabled'}>Launch mission</button></div>`;
    }
    html += `</div>`;
  }

  html += `<div class="box"><h2>Roster</h2><table><tr><th></th><th>Machine</th><th>Pilot</th><th>Price</th><th>Deploy</th><th>General</th><th>Trade</th></tr>`;
  for (const r of state.roster) {
    const t = types[r.type], can = C.GENERAL_SHIPS.has(r.type);
    html += `<tr><td>${icon(r.type)}</td><td>${esc(name(r.type))} <span class="muted">${t.code.trim()}</span></td><td>L${r.level}</td><td>${C.price(types, r.type)}</td>
      <td><input type="checkbox" data-deploy="${r.id}" ${deployed.has(r.id) ? 'checked' : ''}></td>
      <td>${can ? `<input type="radio" name="general" data-general="${r.id}" ${state.general === r.id ? 'checked' : ''}>` : ''}</td>
      <td><input type="checkbox" data-pick="${r.id}" ${picked.has(r.id) ? 'checked' : ''}></td></tr>`;
  }
  html += `</table><div class="row"><label><input type="radio" name="general" data-general="none" ${state.general === null ? 'checked' : ''}> General stays home</label>
    <span class="muted">Aboard: evasion ×2 (max 96), power ×2, level 9. If that unit is destroyed, the game is over.</span></div></div>`;

  html += `<div class="two"><div class="box"><h2>Production</h2><p class="muted">Up to ${C.MAX_BUILDS} machines per intermission, paid with supply. Each comes with a new pilot at level 0.</p><div class="shop">`;
  for (const t of unlocked().map((k) => types[k])) {
    const cost = C.price(types, t.type), ok = state.supply >= cost && state.builds < C.MAX_BUILDS;
    html += `<button class="btn" data-build="${t.type}" ${ok ? '' : 'disabled'}>${icon(t.type)}<span>${esc(name(t.type))}<br><span class="muted">${cost} supply</span></span></button>`;
  }
  html += `</div></div><div class="box"><h2>Trade</h2><p class="muted">Tick machines in the roster to give (worth <b>${tradeValue}</b>). You get one machine worth up to that; the best pilot moves to it.</p>
    <div class="row"><select id="tradeFor">${C.marketTypes(types).map((t) => `<option value="${t.type}" ${C.price(types, t.type) > tradeValue ? 'disabled' : ''}>${esc(name(t.type))} · ${C.price(types, t.type)}</option>`).join('')}</select>
    <button class="btn" id="tradeBtn" ${picked.size ? '' : 'disabled'}>Trade</button></div></div></div>`;

  html += `<div class="box"><h2>Campaign</h2><p class="muted">Progress saves automatically in this browser. Repairs between battles are free.</p>
    <div class="row"><button class="btn" id="restart">Start a new campaign</button></div></div>`;
  $('app').innerHTML = html;
  fillIcons();
  wire(cap);
}

function wire(cap) {
  for (const b of document.querySelectorAll('[data-build]')) b.onclick = () => { if (C.build(state, types, +b.dataset.build)) { save(); render(); } };
  for (const c of document.querySelectorAll('[data-deploy]')) c.onchange = () => {
    const id = +c.dataset.deploy;
    state.deploy = c.checked ? [...state.deploy, id].slice(0, cap) : state.deploy.filter((d) => d !== id);
    save(); render();
  };
  for (const c of document.querySelectorAll('[data-general]')) c.onchange = () => { state.general = c.dataset.general === 'none' ? null : +c.dataset.general; save(); render(); };
  for (const c of document.querySelectorAll('[data-pick]')) c.onchange = () => { c.checked ? picked.add(+c.dataset.pick) : picked.delete(+c.dataset.pick); render(); };
  if ($('tradeBtn')) $('tradeBtn').onclick = () => {
    if (C.trade(state, types, [...picked], +$('tradeFor').value)) { picked.clear(); state.deploy = state.deploy.filter((id) => state.roster.some((r) => r.id === id)); save(); render(); }
  };
  if ($('launch')) $('launch').onclick = () => {
    // the general's machine must deploy if the general boards
    if (state.general !== null && !state.deploy.includes(state.general)) state.deploy = [state.general, ...state.deploy].slice(0, cap);
    save();
    clearSavedBattle(EXPANSION_BATTLE);   // a new launch never resumes an older saved battle
    location.href = `game.html?mission=${encodeURIComponent(entry().file)}&no=${state.next}&campaign=1`;
  };
  // two clicks to start over (embedded viewers can suppress confirm() dialogs)
  $('restart').onclick = async () => {
    if ($('restart').dataset.armed !== '1') { $('restart').dataset.armed = '1'; $('restart').textContent = 'Click again to start over from mission 1'; return; }
    await startNew(); render();
  };
}

async function startNew() {
  const first = await (await fetch(index.missions[0].file)).json();
  state = C.newCampaign(first); picked.clear();
  save(); await loadNext();
}

(async () => {
  const buf = await idbGet('rom'), patch = await idbGet('patch');
  if (!buf) { $('status').innerHTML = 'No ROM loaded yet — open the <a href="game.html">game</a> or the <a href="index.html">lab</a> and load it first.'; return; }
  rom = new Rom(buf); pal = battlePalette(rom); types = allUnitTypes(rom);
  if (patch) { try { en = readEnglish(applyBps(patch, rom.bytes.slice().buffer)); } catch { } }
  index = await C.missionIndex();
  state = C.load();
  if (!state) await startNew(); else await loadNext();
  if (C.ensureAthena(state)) save();
  render();
})().catch((e) => { $('app').textContent = `Intermission error: ${e.message}`; console.error(e); });
