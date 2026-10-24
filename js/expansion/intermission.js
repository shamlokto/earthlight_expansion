// The intermission between expansion battles, a plain web page in the spirit of SRW's:
// roster (machines and their pilots' levels), production, trade, the general, deployment, and
// the next mission's briefing. State lives in campaign.js; battles run in game.html.
import { paint } from '../gfx.js';
import { paintUnitArt } from '../unitart.js';
import { battlePalette, unitIcon } from '../maps.js';
import { loadExpansionData } from './data.js';
import * as C from './campaign.js';
import { ensurePack } from './pack.js';
import { clearSavedBattle, savedBattle, EXPANSION_BATTLE } from '../game/savegame.js';

const $ = (id) => document.getElementById(id);
let rom, pal, types, en = null, index, state, next = null, picked = new Set();


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
const battleUrl = () => `game.html?mission=${encodeURIComponent(entry().file)}&no=${state.next}&campaign=1`;
// the saved mid-battle state of the next mission, if there is one
function resumable() { const s = savedBattle(EXPANSION_BATTLE), e = entry(); return s && e && s.mission === e.file ? s : null; }

// The original's unit-info pictures (js/unitart.js), as image URLs, made once per type.
const artCache = new Map();
function art(type) {
  if (!artCache.has(type)) {
    let url = '';
    try { const c = document.createElement('canvas'); paintUnitArt(c, rom, type, 1); url = c.toDataURL(); } catch { /* no picture */ }
    artCache.set(type, url);
  }
  return artCache.get(type);
}
const pips = (level) => `<span class="pips" title="Pilot level ${level}">${Array.from({ length: 9 }, (_, i) => `<i${i < level ? ' class="on"' : ''}></i>`).join('')}</span>`;

function render() {
  const e = entry(), cap = next ? C.deployCap(next) : 0;
  if (!state.deploy) state.deploy = state.roster.slice(0, cap).map((r) => r.id);
  const deployed = new Set(state.deploy), value = (ids) => [...ids].reduce((t, id) => t + C.price(types, state.roster.find((r) => r.id === id).type), 0);
  const tradeValue = value(picked);
  const beta = C.beta(state), total = index.missions.length;
  let html = '';

  // the next mission: the hero of the page
  if (!e) html += `<section class="hero box"><div class="eyebrow">Campaign complete</div><h1>The Union leadership has fallen.</h1></section>`;
  else {
    html += `<section class="hero box"><div class="heroNum" aria-hidden="true">${String(e.no).padStart(2, '0')}</div>
      <div class="eyebrow">Intermission · next: mission ${e.no} of ${total}</div><h1>${esc(e.title)}</h1>`;
    if (!next) html += `<p class="muted">This mission isn't built yet: paint it in the map editor and add its file to missions/index.json.</p>`;
    else {
      html += `<p class="brief">${esc(next.briefing || '')}</p>
        <div class="chips">${e.hint ? `<span class="chip cyan">Next map wants: ${esc(e.hint)}</span>` : ''}<span class="chip ${deployed.size ? 'gold' : ''}">Deploy ${deployed.size} / ${cap}</span>${next.turnLimit ? `<span class="chip">Turn limit ${next.turnLimit}</span>` : ''}</div>
        <div class="row launchrow"><button class="btn primary big" id="launch" ${deployed.size ? '' : 'disabled'}>Launch mission</button>${resumable() ? `<button class="btn" id="resume">Resume saved battle (turn ${resumable().turn})</button>` : ''}</div>`;
    }
    html += `</section>`;
  }

  html += `<div class="hudbar"><span><em>Supply</em><b>${beta ? '∞' : state.supply}</b>${beta ? '<i class="beta">beta</i>' : ''}</span>
    <span><em>Built</em><b>${state.builds}${beta ? '' : ` / ${C.MAX_BUILDS}`}</b></span><span><em>Machines</em><b>${state.roster.length}</b></span>
    <span><em>Mission</em><b>${e ? e.no : '—'} / ${total}</b></span></div>`;

  html += `<section class="box"><h2>Roster <small>${deployed.size} of ${cap || '—'} deploying</small></h2><div class="roster">`;
  for (const r of state.roster) {
    const t = types[r.type], can = C.GENERAL_SHIPS.has(r.type), on = deployed.has(r.id), gen = state.general === r.id;
    html += `<article class="rcard${on ? ' on' : ''}${gen ? ' gen' : ''}${picked.has(r.id) ? ' pick' : ''}">
      ${art(r.type) ? `<img class="rart" src="${art(r.type)}" alt="">` : ''}
      <div class="rbody"><div class="rname">${esc(name(r.type))}</div><div class="rcode">${esc(t.code.trim())} ${icon(r.type)}</div>
        <div class="rlv"><em>Pilot</em>${pips(r.level)}<b>L${r.level}</b></div><div class="rprice"><em>Value</em><b>${C.price(types, r.type)}</b></div></div>
      <div class="ractions"><label class="tog"><input type="checkbox" data-deploy="${r.id}" ${on ? 'checked' : ''}><span>Deploy</span></label>
        ${can ? `<label class="tog gold"><input type="radio" name="general" data-general="${r.id}" ${gen ? 'checked' : ''}><span>★ General</span></label>` : ''}
        <label class="tog cyan"><input type="checkbox" data-pick="${r.id}" ${picked.has(r.id) ? 'checked' : ''}><span>Trade</span></label></div>
    </article>`;
  }
  html += `</div><div class="row genrow"><label class="tog gold"><input type="radio" name="general" data-general="none" ${state.general === null ? 'checked' : ''}><span>General stays home</span></label>
    <span class="muted">Aboard: evasion ×2 (max 96), power ×2, level 9. If that unit is destroyed, the game is over.</span></div></section>`;

  html += `<div class="two"><section class="box"><h2>Production <small>${beta ? 'beta: every machine, free' : `up to ${C.MAX_BUILDS} per intermission`}</small></h2>
    <p class="muted">Each machine comes with a new pilot at level 0.</p><div class="shop">`;
  for (const t of beta ? C.marketTypes(types) : unlocked().map((k) => types[k])) {
    const cost = C.price(types, t.type), ok = beta || (state.supply >= cost && state.builds < C.MAX_BUILDS);
    html += `<button class="btn shopitem" data-build="${t.type}" ${ok ? '' : 'disabled'}>${art(t.type) ? `<img src="${art(t.type)}" alt="">` : icon(t.type)}<span><b>${esc(name(t.type))}</b><small>${beta ? 'free' : `${cost} supply`}</small></span></button>`;
  }
  html += `</div></section><section class="box"><h2>Trade <small>giving ${picked.size} · worth ${tradeValue}</small></h2>
    <p class="muted">Tick <b>Trade</b> on machines in the roster to give them. You get one machine ${beta ? 'of any type (beta)' : 'worth up to their total'}; the best pilot moves to it.</p>
    <div class="row"><select id="tradeFor">${C.marketTypes(types).map((t) => `<option value="${t.type}" ${!beta && C.price(types, t.type) > tradeValue ? 'disabled' : ''}>${esc(name(t.type))} · ${C.price(types, t.type)}</option>`).join('')}</select>
    <button class="btn" id="tradeBtn" ${picked.size ? '' : 'disabled'}>Trade</button></div></section></div>`;

  html += `<section class="box"><h2>Campaign</h2><p class="muted">Progress saves automatically in this browser. Repairs between battles are free.</p>
    <div class="row"><label class="switch"><input type="checkbox" id="beta" ${beta ? 'checked' : ''}><span></span>Beta testing: unlimited supply, every machine, trades at any price</label></div>
    <div class="row"><button class="btn" id="restart">Start a new campaign</button></div></section>`;
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
    location.href = battleUrl();
  };
  // a battle saved mid-mission (Save in the battle screen): game.html offers to resume it
  if ($('resume')) $('resume').onclick = () => { location.href = battleUrl(); };
  $('beta').onchange = (ev) => { state.beta = ev.target.checked; save(); render(); };
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
  // the original's art and sound, copied once from the player's ROM (pack.js); no ROM needed after that
  const pack = await ensurePack({ onProgress: (t) => { $('status').textContent = t; } });
  const data = await loadExpansionData();   // the expansion's own units and text; the pack only draws them
  rom = pack.rom; en = { ...(pack.text || {}), ...data.text }; pal = battlePalette(rom); types = data.types;
  index = await C.missionIndex();
  state = C.load();
  if (!state) await startNew(); else await loadNext();
  if (C.ensureAthena(state)) save();
  render();
})().catch((e) => { $('app').textContent = `Intermission error: ${e.message}`; console.error(e); });
