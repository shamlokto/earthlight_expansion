// The intermission between expansion battles, a plain web page in the spirit of SRW's:
// roster (machines and their pilots' levels), production, trade, the general, deployment, and
// the next mission's briefing. State lives in campaign.js; battles run in game.html.
import { paint } from '../gfx.js';
import { paintLookArt, typeIcon } from '../look.js';
import { battlePalette, renderMap } from '../maps.js';
import { romView } from './mission.js';
import { storyHtml, voiceHtml, commsHtml, mapHtml, strategyHtml, startBriefingFx } from './briefing.js';
import { SPEAKERS, portrait } from './portraits.js';
import { Sound, briefingSong } from '../audio/sound.js';
import { loadExpansionData } from './data.js';
import * as C from './campaign.js';
import { ensurePack } from './pack.js';
import { clearSavedBattle, savedBattle } from '../game/savegame.js';

const $ = (id) => document.getElementById(id);
let rom, pal, types, en = null, index, state, next = null, picked = new Set();


const name = (t) => (en ? en.unitNames[t] : types[t].name);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function icon(type) { const c = document.createElement('canvas'); paint(c, typeIcon(rom, types, type, 0), pal, { scale: 2 }); return c.outerHTML.replace('<canvas', `<canvas data-icon="${type}"`); }
// the next mission's map with its units and the suggested plan (briefing.js), as in game.html's briefing
// Its animations (briefing.js) run on one clock per mission, so the page's re-renders (every
// roster click) carry on where they were instead of starting over.
let briefFx = null, briefFor = null, briefT0 = 0, briefTerrain = null;
function drawBriefMap() {
  briefFx?.stop(); briefFx = null;
  const hero = document.querySelector('.hero');
  if (!next || !hero || choicePending()) return;
  const e = entry();
  if (briefFor !== e.file) { briefFor = e.file; briefT0 = performance.now(); briefTerrain = null; }
  try {
    if (!briefTerrain) {
      const { rom: view, info } = romView(rom, next);
      briefTerrain = document.createElement('canvas');
      paint(briefTerrain, renderMap(view, info, { units: false }).img, pal, { scale: 1 });
    }
    briefFx = startBriefingFx(hero, { terrain: briefTerrain, mission: next, types, icon: mapIcon }, briefT0);
  } catch (err) { console.warn('briefing map', err); }
}
const mapIcons = new Map();
function mapIcon({ type, army }) {
  const k = `${army}:${type}`;
  if (!mapIcons.has(k)) { const c = document.createElement('canvas'); paint(c, typeIcon(rom, types, type, army === 1 ? 1 : 0), pal, { scale: 1 }); mapIcons.set(k, c); }
  return mapIcons.get(k);
}

// The original's briefing song for the next mission (sound.js briefingSong, as game.html plays
// it), from the pack. Browsers start audio only after a click or key press on the page.
const MUTE = 'earthlight-mute';
let sound = null;
const soundOn = () => !!(sound && sound.ctx && sound.ctx.state === 'running');
function startSound() {
  if (sound || !rom) return;
  sound = new Sound(rom); sound.setMuted($('mute').checked);
  sound.start().then(() => { document.querySelectorAll('.soundHint').forEach((h) => h.remove()); playBriefing(); }).catch((err) => console.warn('sound', err));
}
function playBriefing() { if (sound && next) sound.playSong(briefingSong(next.music ?? 0)); }
document.addEventListener('pointerdown', startSound, { capture: true });
document.addEventListener('keydown', startSound, { capture: true });
function fillIcons() { for (const c of document.querySelectorAll('canvas[data-icon]')) paint(c, typeIcon(rom, types, +c.dataset.icon, 0), pal, { scale: 2 }); }

// late in the campaign (index.json allFrom) every machine type can be built
const unlocked = () => state.next >= (index.allFrom ?? Infinity) ? C.marketTypes(types).map((t) => t.type) : [...new Set([...(index.start || []), ...list().slice(0, state.next).flatMap((m) => m.unlocks || [])])];
// the campaign's missions as this playthrough has them (the choice picks among alternatives)
const list = () => C.missionList(index, state);
const entry = () => list()[state.next] || null;
const choicePending = () => C.pendingChoice(index, state, state.next);

async function loadNext() {
  const e = entry();
  next = e && e.file ? await (await fetch(e.file, { cache: 'no-cache' })).json() : null;
}

function save() { C.save(state); }
const battleUrl = () => `game.html?mission=${encodeURIComponent(entry().file)}&no=${state.next}&campaign=1&c=${C.campaign().id}`;
// the saved mid-battle state of the next mission, if there is one
function resumable() { const s = savedBattle(C.campaign().battle), e = entry(); return s && e && s.mission === e.file ? s : null; }

// The original's unit-info pictures (js/unitart.js), as image URLs, made once per type.
const artCache = new Map();
function art(type) {
  if (!artCache.has(type)) {
    let url = '';
    try { const c = document.createElement('canvas'); paintLookArt(c, rom, types, type, 1); url = c.toDataURL(); } catch { /* no picture */ }
    artCache.set(type, url);
  }
  return artCache.get(type);
}
const pips = (level) => `<span class="pips" title="Pilot level ${level}">${Array.from({ length: 9 }, (_, i) => `<i${i < level ? ' class="on"' : ''}></i>`).join('')}</span>`;

// Production asks first: the machine's wiki card (picture, role, stats, weapons, description),
// a link to its full wiki entry, then Buy or Cancel.
const MODES = ['Beam', 'Railgun', 'Missile'], CRAB = 26;
function confirmBuild(type) {
  const t = types[type], tx = en?.unitInfo?.find((e) => e.type === type), cost = C.price(types, type), beta = C.beta(state);
  const info = tx ? tx.info.slice(1).join('\n\n').replace(/-\n/g, '').replace(/\n(?!\n)/g, ' ') : '';
  const weapons = t.weapons.filter((w) => w && w.power).map((w) => `<li>${MODES[w.mode]} · power ${w.power} · range ${w.max > w.min ? `${w.min}–${w.max}` : w.min}</li>`).join('') || '<li>Unarmed</li>';
  const anchor = t.look !== undefined ? `xunit-${type}` : `unit-${type}`;
  let d = $('buyDlg');
  if (!d) { d = document.createElement('dialog'); d.id = 'buyDlg'; d.className = 'box buydlg'; document.body.append(d); }
  d.innerHTML = `<div class="buyhead">${art(type) ? `<img src="${art(type)}" alt="">` : ''}<div><h2>${esc(name(type))}</h2><div class="muted">${esc(t.code)}${tx?.short ? ` · ${esc(tx.short)}` : ''}</div></div></div>
    <div class="buystats"><span><em>HP</em><b>${t.hp}</b></span><span><em>Move</em><b>${t.move}</b></span><span><em>Evasion</em><b>${Math.round((t.evasion * 100) / 128)}%</b></span><span><em>Price</em><b>${cost}</b></span></div>
    <ul class="buyweap">${weapons}</ul>${info ? `<p class="buyinfo">${esc(info)}</p>` : ''}
    ${t.move === 0 ? '<p class="muted">Fixed battery: it cannot move. Load it into a Crab on the roster (its Carries menu) and deploy the Crab: in battle it sets the battery down on bedrock, an asteroid, a fortress deck or a turret railway.</p>' : ''}
    <p><a href="wiki.html#${anchor}" target="_blank" rel="noopener">Full wiki entry →</a></p>
    ${C.isUnique(types, type) ? `<p class="muted">${C.ownsUnique(state, types, type) ? 'You already have one: only one may serve at a time.' : 'Unique: only one may serve at a time.'}</p>` : ''}
    <div class="row"><button class="btn primary" id="buyYes" ${!C.ownsUnique(state, types, type) && (beta || (state.supply >= cost && state.builds < C.MAX_BUILDS)) ? '' : 'disabled'}>Buy${beta ? ' (free, beta)' : ` for ${cost} supply`}</button><button class="btn" id="buyNo">Cancel</button></div>`;
  $('buyNo').onclick = () => d.close();
  $('buyYes').onclick = () => { d.close(); if (C.build(state, types, type)) { save(); render(); } };
  d.showModal();
}

// The roster's and the shop's machines in their series (campaign.js SERIES: Kai, original), each a
// section that folds away; which ones are folded is remembered in this browser.
const folded = (() => { try { return JSON.parse(localStorage.getItem('el-expansion-folded')) || {}; } catch { return {}; } })();
function grouped(list, items, typeOf, html1, cls) {
  return C.SERIES.map((g) => [g, items.filter((x) => C.seriesOf(types, typeOf(x)) === g.id)]).filter(([, l]) => l.length)
    .map(([g, l]) => `<details class="series" data-fold="${list}:${g.id}" ${folded[`${list}:${g.id}`] ? '' : 'open'}><summary>${g.label} <small>${l.length}</small></summary><div class="${cls}">${l.map(html1).join('')}</div></details>`).join('');
}

// Sorting (remembered in this browser): supply price, newest, unit type, pilot level, name.
const SORT_LABELS = { supply: 'supply', new: 'newest', type: 'type', level: 'pilot level', name: 'name' };
const sorting = (() => { try { return { roster: 'supply', shop: 'supply', ...JSON.parse(localStorage.getItem('el-expansion-sort')) }; } catch { return { roster: 'supply', shop: 'supply' }; } })();
const byPrice = (a, b) => C.price(types, a) - C.price(types, b) || name(a).localeCompare(name(b));
const byName = (a, b) => name(a).localeCompare(name(b)) || a - b;
// type: the machine's class (category: ships first, then craft), then price
const byType = (a, b) => types[a].category - types[b].category || byPrice(a, b);

// A decision before the next mission (index entry `choice`, docs/STORY.md): the speakers named in
// the options' text-free `speakers` (or the cast), the prompt and the options; two clicks pick one.
function choiceHtml(ch, e, total) {
  const faces = (ch.speakers || ['sato', 'moraine']).filter((k) => SPEAKERS[k]);
  return `<section class="hero box choice fxIntro"><div class="heroNum" aria-hidden="true">${String(e.no).padStart(2, '0')}</div>
    <div class="eyebrow">Intermission · before mission ${e.no} of ${total} · a decision</div><h1>${esc(ch.title || 'Your call, General')}</h1>
    <div class="faces">${faces.map((k) => `<div class="cline ${SPEAKERS[k].side} on" style="padding:0;border:0;background:none;display:block"><div class="cFace" title="${esc(SPEAKERS[k].name)}">${portrait(k)}<div class="txScan"></div></div></div>`).join('')}</div>
    <p class="prompt">${esc(ch.prompt || '')}</p>
    <div class="opts">${ch.options.map((o) => `<button class="opt" type="button" data-choice="${esc(o.id)}"><b>${esc(o.label)}</b><span>${esc(o.text || '')}</span><small class="muted">Click again to decide. This can't be undone.</small></button>`).join('')}</div></section>`;
}

function render() {
  const e = entry(), cap = next ? C.deployCap(next) : 0;
  if (!state.deploy) state.deploy = state.roster.filter((r) => types[r.type].move > 0).slice(0, cap).map((r) => r.id);
  const deployed = new Set(state.deploy), value = (ids) => [...ids].reduce((t, id) => t + C.price(types, state.roster.find((r) => r.id === id).type), 0);
  const tradeValue = value(picked);
  const beta = C.beta(state), total = list().length, pending = choicePending();
  let html = '';

  // the next mission: the hero of the page
  if (!e) html += `<section class="hero box"><div class="eyebrow">Campaign complete</div><h1>${C.campaign().id === 'classic' ? 'The Union leadership has fallen.' : 'The war is over.'}</h1></section>`;
  else if (pending) html += choiceHtml(pending, e, total);
  else {
    const intro = briefFor !== e.file;
    html += `<section class="hero box${intro ? ' fxIntro' : ''}"><div class="heroNum" aria-hidden="true">${String(e.no).padStart(2, '0')}</div>
      <div class="eyebrow">Intermission · next: mission ${e.no} of ${total}</div><h1>${esc(e.title)}</h1>`;
    if (!next) html += `<p class="muted">This mission is still being written.</p>`;
    else {
      if (!soundOn() && !$('mute').checked) html += `<button class="btn soundHint" type="button">♪ Click for the briefing music</button>`;
      html += `<div class="bTop${voiceHtml(next) ? '' : ' solo'}">${storyHtml(next)}${voiceHtml(next)}</div>${commsHtml(next)}${mapHtml()}${strategyHtml(next)}
        <div class="chips">${e.hint ? `<span class="chip cyan">Next map wants: ${esc(e.hint)}</span>` : ''}<span class="chip ${deployed.size ? 'gold' : ''}">Deploy ${deployed.size} / ${cap}</span>${next.turnLimit ? `<span class="chip">Turn limit ${next.turnLimit}</span>` : ''}</div>
        <div class="row launchrow"><button class="btn primary big" id="launch" ${deployed.size ? '' : 'disabled'}>Launch mission</button>${resumable() ? `<button class="btn" id="resume">Resume saved battle (turn ${resumable().turn})</button>` : ''}</div>`;
    }
    html += `</section>`;
  }

  html += `<div class="hudbar"><span><em>Supply</em><b>${beta ? '∞' : state.supply}</b>${beta ? '<i class="beta">beta</i>' : ''}</span>
    <span><em>Built</em><b>${state.builds}${beta ? '' : ` / ${C.MAX_BUILDS}`}</b></span><span><em>Machines</em><b>${state.roster.length}</b></span>
    <span><em>Mission</em><b>${e ? e.no : '—'} / ${total}</b></span></div>`;

  const sortBox = (id, cur, keys) => `<select class="sortsel" id="${id}" title="Sort">${keys.map((k) => `<option value="${k}" ${k === cur ? 'selected' : ''}>Sort: ${SORT_LABELS[k]}</option>`).join('')}</select>`;
  html += `<section class="box"><h2>Roster <small>${deployed.size} of ${cap || '—'} deploying</small>${sortBox('rosterSort', sorting.roster, ['supply', 'new', 'type', 'level', 'name'])}</h2>`;
  // the general's machine always comes first; the rest by the chosen order
  const rosterKey = { supply: (a, b) => byPrice(a.type, b.type) || b.level - a.level, new: (a, b) => b.id - a.id,
    type: (a, b) => byType(a.type, b.type) || b.level - a.level, level: (a, b) => b.level - a.level || byPrice(a.type, b.type), name: (a, b) => byName(a.type, b.type) || b.level - a.level }[sorting.roster];
  const loads = C.crabLoads(state, types), aboard = Object.fromEntries(Object.entries(loads).map(([c, b]) => [b, c]));
  const batteries = state.roster.filter((r) => types[r.type].move === 0);
  const card = (r) => {
    const t = types[r.type], can = C.GENERAL_SHIPS.has(r.type), on = deployed.has(r.id), gen = state.general === r.id;
    html += `<article class="rcard${on ? ' on' : ''}${gen ? ' gen' : ''}${picked.has(r.id) ? ' pick' : ''}">
      ${art(r.type) ? `<img class="rart" src="${art(r.type)}" alt="">` : ''}
      <div class="rbody"><div class="rname">${esc(name(r.type))}</div><div class="rcode">${esc(t.code.trim())} ${icon(r.type)}</div>
        <div class="rlv"><em>Pilot</em>${pips(r.level)}<b>L${r.level}</b></div><div class="rprice"><em>Value</em><b>${C.price(types, r.type)}</b></div></div>
      <div class="ractions">${t.move === 0 ? `<span class="muted small">${aboard[r.id] !== undefined ? `Aboard a Crab${deployed.has(+aboard[r.id]) ? ', deploying' : ' (Crab stays home)'}` : 'Load it into a Crab to deploy'}</span>`
        : `<label class="tog"><input type="checkbox" data-deploy="${r.id}" ${on ? 'checked' : ''}><span>Deploy</span></label>`}
        ${r.type === CRAB ? `<select class="crabload" data-crab="${r.id}" title="Battery the Crab carries"><option value="">Carries: nothing</option>${batteries.map((v) => `<option value="${v.id}" ${loads[r.id] === v.id ? 'selected' : ''}>Carries: ${esc(name(v.type))} L${v.level}${aboard[v.id] !== undefined && aboard[v.id] !== String(r.id) ? ' (other Crab)' : ''}</option>`).join('')}</select>` : ''}
        ${can ? `<label class="tog gold"><input type="radio" name="general" data-general="${r.id}" ${gen ? 'checked' : ''}><span>★ General</span></label>` : ''}
        <label class="tog cyan"><input type="checkbox" data-pick="${r.id}" ${picked.has(r.id) ? 'checked' : ''}><span>Trade</span></label></div>
    </article>`;
  };
  html += grouped('roster', [...state.roster].sort((a, b) => (b.id === state.general) - (a.id === state.general) || rosterKey(a, b)), (r) => r.type, card, 'roster');
  html += `<div class="row genrow"><label class="tog gold"><input type="radio" name="general" data-general="none" ${state.general === null ? 'checked' : ''}><span>General stays home</span></label>
    <span class="muted">Aboard: evasion ×2 (max 96), power ×2, level 9. If that unit is destroyed, the game is over.</span></div></section>`;

  html += `<div class="two"><section class="box"><h2>Production <small>${beta ? 'beta: every machine, free' : `up to ${C.MAX_BUILDS} per intermission`}</small>${sortBox('shopSort', sorting.shop, ['supply', 'type', 'name', 'new'])}</h2>
    <p class="muted">Each machine comes with a new pilot at level 0.${beta ? '' : state.next >= (index.allFrom ?? Infinity) ? ' Every machine type is now available.' : ` More types unlock as the campaign goes on; all of them from mission ${(index.allFrom ?? 0) + 1}.`}</p>`;
  const shopKey = { supply: byPrice, type: byType, name: byName, new: (a, b) => b - a }[sorting.shop];
  html += grouped('shop', (beta ? C.marketTypes(types) : unlocked().map((k) => types[k])).sort((a, b) => shopKey(a.type, b.type)), (t) => t.type, (t) => {
    const cost = C.price(types, t.type), ok = !C.ownsUnique(state, types, t.type) && (beta || (state.supply >= cost && state.builds < C.MAX_BUILDS));
    return `<button class="btn shopitem" data-build="${t.type}" ${ok ? '' : 'disabled'}>${art(t.type) ? `<img src="${art(t.type)}" alt="">` : icon(t.type)}<span><b>${esc(name(t.type))}</b><small>${cost} supply${beta ? ' · free' : ''}</small></span></button>`;
  }, 'shop');
  html += `</section><section class="box"><h2>Trade <small>giving ${picked.size} · worth ${tradeValue}</small></h2>
    <p class="muted">Tick <b>Trade</b> on machines in the roster to give them. You get one machine ${beta ? 'of any type (beta)' : `worth up to their total plus your supply (${state.supply})`}; the best pilot moves to it and keeps their level, so veterans step up to stronger machines.</p>
    <div class="row"><select id="tradeFor">${C.SERIES.map((g) => [g, C.marketTypes(types).filter((t) => C.seriesOf(types, t.type) === g.id)]).filter(([, l]) => l.length).map(([g, l]) => `<optgroup label="${g.label}">${l.map((t) => `<option value="${t.type}" ${(!beta && C.price(types, t.type) > tradeValue + state.supply) || C.ownsUnique(state, types, t.type, [...picked]) ? 'disabled' : ''}>${esc(name(t.type))} · ${C.price(types, t.type)}${!beta && picked.size && C.price(types, t.type) > tradeValue ? ` (+${C.price(types, t.type) - tradeValue} supply)` : ''}</option>`).join('')}</optgroup>`).join('')}</select>
    <button class="btn" id="tradeBtn" ${picked.size ? '' : 'disabled'}>Trade</button>
    <button class="btn" id="sellBtn" ${picked.size && picked.size < state.roster.length ? '' : 'disabled'}>Sell for ${tradeValue}</button></div>
    <p class="muted">Sell turns the ticked machines into supply at the same price; their pilots leave with them.</p></section></div>`;

  html += `<section class="box"><h2>Campaign</h2><p class="muted">Progress saves automatically in this browser. Repairs between battles are free.</p>
    <div class="row"><label class="switch"><input type="checkbox" id="beta" ${beta ? 'checked' : ''}><span></span>Beta testing: unlimited supply, every machine, trades at any price</label></div>
    ${beta || !e ? `<div class="row"><label>${e ? 'Beta: play' : 'The war is over. Replay'} any mission <select id="jumpTo">${index.missions.map((m, i) => `<option value="${i}" ${list()[state.next] === m ? 'selected' : ''}>${m.no ?? i + 1}. ${esc(m.title)}${m.when ? ` (${esc(m.when.choice)})` : ''}</option>`).join('')}</select></label><button class="btn" id="jumpGo">Go</button></div>` : ''}
    <div class="row"><button class="btn" id="restart">Start this campaign over</button><a class="btn" href="expansion.html?select=1">Switch campaign</a></div></section>`;
  $('app').innerHTML = html;
  fillIcons();
  drawBriefMap();
  wire(cap);
}

function wire(cap) {
  for (const d of document.querySelectorAll('details.series')) d.ontoggle = () => { folded[d.dataset.fold] = !d.open; try { localStorage.setItem('el-expansion-folded', JSON.stringify(folded)); } catch { /* no storage */ } };
  for (const [id, k] of [['rosterSort', 'roster'], ['shopSort', 'shop']]) if ($(id)) $(id).onchange = () => { sorting[k] = $(id).value; try { localStorage.setItem('el-expansion-sort', JSON.stringify(sorting)); } catch { } render(); };
  for (const b of document.querySelectorAll('[data-build]')) b.onclick = () => confirmBuild(+b.dataset.build);
  for (const c of document.querySelectorAll('[data-deploy]')) c.onchange = () => {
    const id = +c.dataset.deploy;
    state.deploy = c.checked ? [...state.deploy, id].slice(0, cap) : state.deploy.filter((d) => d !== id);
    save(); render();
  };
  for (const c of document.querySelectorAll('[data-crab]')) c.onchange = () => { C.loadCrab(state, +c.dataset.crab, c.value === '' ? null : +c.value); save(); render(); };
  for (const c of document.querySelectorAll('[data-general]')) c.onchange = () => { state.general = c.dataset.general === 'none' ? null : +c.dataset.general; save(); render(); };
  for (const c of document.querySelectorAll('[data-pick]')) c.onchange = () => { c.checked ? picked.add(+c.dataset.pick) : picked.delete(+c.dataset.pick); render(); };
  if ($('tradeBtn')) $('tradeBtn').onclick = () => {
    if (C.trade(state, types, [...picked], +$('tradeFor').value)) { picked.clear(); state.deploy = state.deploy.filter((id) => state.roster.some((r) => r.id === id)); save(); render(); }
  };
  if ($('sellBtn')) $('sellBtn').onclick = () => {
    if (C.sell(state, types, [...picked])) { picked.clear(); state.deploy = state.deploy.filter((id) => state.roster.some((r) => r.id === id)); save(); render(); }
  };
  for (const b of document.querySelectorAll('[data-choice]')) b.onclick = async () => {
    if (!b.classList.contains('armed')) { document.querySelectorAll('[data-choice]').forEach((o) => o.classList.toggle('armed', o === b)); return; }
    state.choice = b.dataset.choice; state.deploy = null; save(); await loadNext(); render();
  };
  if ($('launch')) $('launch').onclick = () => {
    // the general's machine must deploy if the general boards
    if (state.general !== null && !state.deploy.includes(state.general)) state.deploy = [state.general, ...state.deploy].slice(0, cap);
    save();
    clearSavedBattle(C.campaign().battle);   // a new launch never resumes an older saved battle
    sound?.stop(); briefFx?.stop();
    location.href = battleUrl();
  };
  // a battle saved mid-mission (Save in the battle screen): game.html offers to resume it
  if ($('resume')) $('resume').onclick = () => { sound?.stop(); location.href = battleUrl(); };
  $('beta').onchange = (ev) => { state.beta = ev.target.checked; save(); render(); };
  // beta testing, or once the campaign is won (owner, 2026-10-24): jump to any mission, back or
  // forward, keeping the roster; a
  // branch mission sets the choice it belongs to
  if ($('jumpGo')) $('jumpGo').onclick = async () => {
    const m = index.missions[+$('jumpTo').value];
    if (m.when) state.choice = m.when.choice;
    const i = C.missionList(index, state).indexOf(m);
    if (i < 0) return;
    state.next = i; state.deploy = null; save(); await loadNext(); render(); window.scrollTo(0, 0);
  };
  // two clicks to start over (embedded viewers can suppress confirm() dialogs)
  $('restart').onclick = async () => {
    if ($('restart').dataset.armed !== '1') { $('restart').dataset.armed = '1'; $('restart').textContent = 'Click again to start over from mission 1'; return; }
    await startNew(); render();
  };
}

// The campaign select: the new Galt remnant campaign and the Classic one, each with its own save.
async function selectCampaign() {
  C.remember(null);
  const info = await Promise.all(Object.values(C.CAMPAIGNS).map(async (c) => {
    const s = C.saved(c.id), idx = await (async () => { try { const r = await fetch(c.index, { cache: 'no-cache' }); return r.ok ? r.json() : null; } catch { return null; } })();
    const n = idx ? C.missionList(idx, s || {}).length : 0;
    return { c, s, idx, n };
  }));
  const blurb = {
    remnant: ['New', 'Kessrin seizes Olympos on the night of the victory parade. Break out with the crews who follow you, deal with the Ashfall Cartel, or don\'t, and take Earth orbit back. 12 missions, one choice, two endings.', ['sato', 'arkin', 'kessrin', 'vane']],
    classic: ['Classic', 'The first expansion campaign: the commander shot after the parade, ten missions from Olympos to the Union citadel.', ['kessrin']],
  };
  $('campSub').textContent = 'Expansion · choose a campaign';
  $('app').innerHTML = `<section class="box"><h2>Campaigns</h2><div class="camps">${info.map(({ c, s, idx, n }) => {
    const [tag, text, faces] = blurb[c.id];
    const state = !idx ? 'Being written: not playable yet.' : s ? (s.next >= n ? 'Campaign complete.' : `Saved: mission ${s.next + 1} of ${n}, ${s.roster.length} machines.`) : `Not started · ${n} missions.`;
    return `<button class="camp" type="button" data-camp="${c.id}" ${idx ? '' : 'disabled'}><span class="tag">${tag}</span><h2>${esc(c.title)}</h2>
      <div class="faces">${faces.map((k) => `<div class="cline ${SPEAKERS[k].side} on" style="padding:0;border:0;background:none;display:block"><div class="cFace">${portrait(k)}</div></div>`).join('')}</div>
      <p>${esc(text)}</p><span class="state">${esc(state)}</span></button>`;
  }).join('')}</div></section>`;
  for (const b of document.querySelectorAll('[data-camp]')) b.onclick = () => { history.replaceState(null, '', `expansion.html?c=${b.dataset.camp}`); openCampaign(b.dataset.camp); };
}

async function openCampaign(id) {
  const c = C.use(id); C.remember(id);
  $('campSub').textContent = `Expansion · ${c.title}`;
  index = await C.missionIndex();
  if (!index) { $('app').innerHTML = `<section class="box"><h2>${esc(c.title)}</h2><p>This campaign is still being written. <a href="expansion.html?select=1">Back to the campaigns</a></p></section>`; return; }
  state = C.load(); picked.clear(); briefFor = null;
  if (!state) await startNew(); else await loadNext();
  if (C.ensureAthena(state)) save();
  render();
}

async function startNew() {
  const first = await (await fetch(C.missionList(index, {})[0].file, { cache: 'no-cache' })).json();
  state = C.newCampaign(first); picked.clear();
  save(); await loadNext();
}

(async () => {
  // the original's art and sound, copied once from the player's ROM (pack.js); no ROM needed after that
  const pack = await ensurePack({ onProgress: (t) => { $('status').textContent = t; } });
  const data = await loadExpansionData();   // the expansion's own units and text; the pack only draws them
  try { $('mute').checked = localStorage.getItem(MUTE) === '1'; } catch { /* no storage */ }
  $('mute').onchange = (ev) => {
    try { localStorage.setItem(MUTE, ev.target.checked ? '1' : '0'); } catch { /* no storage */ }
    if (sound) sound.setMuted(ev.target.checked);
    if (ev.target.checked) document.querySelectorAll('.soundHint').forEach((h) => h.remove());
  };
  rom = pack.rom; en = { ...(pack.text || {}), ...data.text }; pal = battlePalette(rom); types = data.types;
  const q = new URLSearchParams(location.search), id = q.get('c') || (q.has('select') ? null : C.remembered());
  if (!id || !C.CAMPAIGNS[id]) return selectCampaign();
  await openCampaign(id);
})().catch((e) => { $('app').textContent = `Intermission error: ${e.message}`; console.error(e); });
