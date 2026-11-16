// Sato's Harvest: the interface (plain DOM over the 3D view): HUD, rucksack bar, dialogue with
// portraits, picture and film scenes, shops, the menu and the morning report.
import * as art from './art.js';
import { ITEMS, CROPS, SEASONS, TOOL_LEVELS } from './data.js';
import * as sim from './sim.js';
import { NPCS, HELP } from './story.js';
import { portrait as svgPortrait } from '../expansion/portraits.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const WEATHER_ICON = { sun: '☀', rain: '🌧', storm: '⛈', snow: '❄' };

// ---------------------------------------------------------------- icons
const KIND_COLOR = { tool: '#6f7f95', seed: '#8a6f3d', crop: '#4f9a3a', animal: '#d9c79a', fish: '#3f7fa8', forage: '#7a9a4a', ore: '#77736d', relic: '#b08d3c', food: '#c9853a', stock: '#a37a4f' };
export function icon(id) {
  const it = ITEMS[id]; if (!it) return '';
  const u = art.url('icons/' + id) || (it.kind === 'crop' ? art.url(`sprites/crop_${id}_2`) : null);
  if (u) return `<img class="fm-ico" src="${u}" alt="">`;
  if (it.kind === 'seed') { const c = it.crop, cu = art.url('icons/' + c) || art.url(`sprites/crop_${c}_2`), bag = art.url('icons/seedbag'); if (bag) return `<span class="fm-ico fm-seed"><img src="${bag}" alt="">${cu ? `<img class="fm-mini" src="${cu}" alt="">` : ''}</span>`; }
  const ab = it.name.replace(/[^A-Za-z ]/g, '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || it.name.slice(0, 2);
  return `<span class="fm-ico fm-fake" style="background:${KIND_COLOR[it.kind] || '#666'}">${it.kind === 'seed' ? '✿' : esc(ab)}</span>`;
}
export function face(who) {
  const n = NPCS[who]; if (!n) return '';
  const own = art.url(`people/${who}_portrait`) || art.url(`people/${who}_front`); if (own) return `<div class="fm-face"><img src="${own}" alt=""></div>`;
  if (n.portrait && n.portrait.startsWith('svg:')) return `<div class="fm-face">${svgPortrait(n.portrait.slice(4))}</div>`;
  return `<div class="fm-face"><img src="${n.portrait}" alt=""></div>`;
}

// ---------------------------------------------------------------- HUD
export function hud(state, extra = {}) {
  const p = state.player;
  $('hDate').textContent = sim.dateLabel(state); $('hTime').textContent = sim.timeLabel(state);
  $('hWeather').textContent = WEATHER_ICON[state.weather] || ''; $('hMoney').textContent = p.money.toLocaleString() + ' cr';
  const pct = Math.max(0, Math.round(100 * p.stamina / p.maxStamina));
  $('hStam').style.width = pct + '%'; $('hStam').className = pct < 20 ? 'low' : pct < 45 ? 'mid' : '';
  $('hPlace').textContent = extra.place || '';
  const g = sim.goalState(state), next = sim.GOALS.find((q, i) => !g[i].done);
  $('hGoal').innerHTML = next ? `<b>${esc(next.title)}</b><span>${esc(next.hint)}</span>` : ''; $('hGoal').hidden = !next;
  let h = '';
  p.inv.forEach((s, i) => {
    let tag = '';
    if (s) { const it = ITEMS[s.id]; tag = it.kind === 'tool' ? (s.id === 'can' ? `<i>${p.water}</i>` : (p.toolLevel[s.id] > 1 ? `<i>${'★'.repeat(p.toolLevel[s.id] - 1)}</i>` : '')) : (s.n > 1 ? `<i>${s.n}</i>` : ''); }
    h += `<button class="fm-slot${i === p.sel ? ' sel' : ''}" data-slot="${i}" title="${s ? esc(ITEMS[s.id].name) : ''}">${s ? icon(s.id) : ''}${tag}<u>${i < 9 ? i + 1 : i === 9 ? 0 : ''}</u></button>`;
  });
  $('bar').innerHTML = h;
  const s = p.inv[p.sel]; $('hHeld').textContent = s ? ITEMS[s.id].name + (ITEMS[s.id].kind === 'tool' && p.toolLevel[s.id] ? ` · ${TOOL_LEVELS[p.toolLevel[s.id]]}` : '') : 'Empty hands';
}
export function prompt(text) { const e = $('prompt'); e.hidden = !text; if (text) e.innerHTML = text; }
let toastT = 0;
export function toast(msg, ms = 2600) {
  if (!msg) return; const e = document.createElement('div'); e.className = 'fm-toast'; e.textContent = msg; $('toasts').appendChild(e);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  setTimeout(() => e.classList.add('out'), ms); setTimeout(() => e.remove(), ms + 500); toastT = performance.now();
}
export function gainedToast(gained) { for (const g of gained || []) toast(`+${g.n} ${ITEMS[g.id] ? ITEMS[g.id].name : g.id}`); }
export function fade(on, ms = 350) { const f = $('fade'); f.style.transitionDuration = ms + 'ms'; f.classList.toggle('on', on); return new Promise((r) => setTimeout(r, ms + 30)); }

// ---------------------------------------------------------------- scenes (pictures and films behind dialogue)
export function scene(name) {
  const e = $('scene');
  if (!name) { e.hidden = true; e.innerHTML = ''; e.dataset.name = ''; return; }
  if (e.dataset.name === name) return;
  e.dataset.name = name; e.hidden = false;
  const v = art.url('video/' + name), p = art.url('scenes/' + name);
  e.innerHTML = (p ? `<img src="${p}" alt="">` : '<div class="fm-noscene"></div>') + (v ? `<video src="${v}" ${p ? `poster="${p}"` : ''} autoplay loop muted playsinline></video>` : '');
}

// ---------------------------------------------------------------- dialogue
let dlgResolve = null, dlgLines = [], dlgIndex = 0, typing = null;
export const talking = () => !!dlgResolve || !$('choice').hidden;
function showLine() {
  const l = dlgLines[dlgIndex], n = NPCS[l.who];
  if (l.art) scene(l.art);
  $('dFace').innerHTML = n ? face(l.who) : ''; $('dFace').hidden = !n;
  const su = n && art.url(`people/${l.who}_front`), sd = $('dStand'); sd.hidden = !su; if (su && sd.dataset.who !== l.who) { sd.dataset.who = l.who; sd.innerHTML = `<img src="${su}" alt="">`; sd.className = l.who === 'sato' ? 'left' : 'right'; }
  $('dName').textContent = n ? n.name : ''; $('dName').hidden = !n;
  $('dialog').className = 'fm-dialog' + (n ? '' : ' narr');
  const t = $('dText'); t.textContent = ''; const t0 = performance.now(); clearInterval(typing);
  typing = setInterval(() => { const i = Math.floor((performance.now() - t0) / 11); t.textContent = l.text.slice(0, i); if (i >= l.text.length) { clearInterval(typing); typing = null; } }, 16);
}
// Shows lines [{ who, text, art? }] one at a time; resolves when the last one is dismissed.
export function say(lines, { keepScene = false } = {}) {
  lines = (Array.isArray(lines) ? lines : [lines]).map((l) => (typeof l === 'string' ? { who: 'narrator', text: l } : l)).filter((l) => l && l.text);
  if (!lines.length) return Promise.resolve();
  return new Promise((res) => { dlgLines = lines; dlgIndex = 0; $('dialog').hidden = false; dlgResolve = () => { $('dialog').hidden = true; $('dStand').hidden = true; if (!keepScene) scene(null); res(); }; showLine(); });
}
export function advance() {
  if (!dlgResolve) return false;
  if (typing) { clearInterval(typing); typing = null; $('dText').textContent = dlgLines[dlgIndex].text; return true; }
  if (++dlgIndex >= dlgLines.length) { const r = dlgResolve; dlgResolve = null; r(); } else showLine();
  return true;
}
export function choose(title, options) {
  return new Promise((res) => {
    const c = $('choice'); c.hidden = false;
    c.innerHTML = `<div class="fm-ctitle">${esc(title)}</div>` + options.map((o, i) => `<button data-i="${i}">${esc(o)}</button>`).join('');
    c.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; c.hidden = true; c.onclick = null; res(+b.dataset.i); };
    c.querySelector('button').focus();
  });
}

// ---------------------------------------------------------------- windows
let winClose = null;
export const windowOpen = () => !$('win').hidden;
export function closeWin() { if ($('win').hidden) return; $('win').hidden = true; const c = winClose; winClose = null; if (c) c(); }
function openWin(title, html, onClose, cls = '') {
  $('win').hidden = false; $('win').className = 'fm-win ' + cls; winClose = onClose || null;
  $('winTitle').textContent = title; $('winBody').innerHTML = html; $('winBody').scrollTop = 0; return $('winBody');
}
export function shop(state, shopId, keeper, onChange) {
  return new Promise((res) => {
    const draw = () => {
      const stock = sim.shopStock(state, shopId), bg = art.url('scenes/shop_' + shopId);
      const body = openWin(sim.SHOPS[shopId].name, `<div class="fm-shop"${bg ? ` style="--bg:url(${bg})"` : ''}><div class="fm-shophead">${face(keeper)}<div><b>${esc(NPCS[keeper].name)}</b><span>${state.player.money.toLocaleString()} cr</span></div></div>` +
        (stock.length ? stock.map((s) => `<div class="fm-row${s.can ? '' : ' no'}"><div><b>${esc(s.label)}</b><span>${esc(s.desc || '')}${s.needs ? ' · needs ' + esc(s.needs) : ''}${!s.can && s.why ? ` · <em>${esc(s.why)}</em>` : ''}</span></div><button data-key="${esc(s.key)}" ${s.can ? '' : 'disabled'}>${s.price.toLocaleString()} cr</button></div>`).join('') : '<p class="fm-dim">Nothing for sale today.</p>') + '</div>', () => res());
      body.onclick = (e) => { const b = e.target.closest('button[data-key]'); if (!b) return; const r = sim.buy(state, shopId, b.dataset.key, 1); toast(r.msg || (r.ok ? 'Bought.' : 'You cannot buy that.')); onChange && onChange(); draw(); };
    };
    draw();
  });
}
export function report(state, rep, extra = {}) {
  return new Promise((res) => {
    const rows = (rep.shipped || []).map((s) => `<div class="fm-row"><div><b>${icon(s.id)} ${esc(ITEMS[s.id] ? ITEMS[s.id].name : s.id)} × ${s.n}</b></div><span>${s.value.toLocaleString()} cr</span></div>`).join('');
    const sc = extra.scene ? art.url('scenes/' + extra.scene) : null;
    openWin(sim.dateLabel(state), `${sc ? `<img class="fm-card" src="${sc}" alt="">` : ''}${extra.head ? `<p class="fm-lead">${esc(extra.head)}</p>` : ''}
      ${rows ? `<h3>Shipped yesterday</h3>${rows}<div class="fm-row tot"><div><b>Paid</b></div><span>${(rep.earned || 0).toLocaleString()} cr</span></div>` : ''}
      ${(rep.notes || []).map((n) => `<p>${esc(n)}</p>`).join('')}
      <p class="fm-dim">${WEATHER_ICON[state.weather]} Today: ${state.weather}. Tomorrow's forecast is on the radio.</p>
      <div class="fm-end"><button id="repOk">Start the day</button></div>`, () => res(), 'report');
    $('repOk').onclick = closeWin; $('repOk').focus();
  });
}
// The menu: rucksack, people, records, help.
export function menu(state, hooks, tab = 'bag') {
  const tabs = [['bag', 'Rucksack'], ['people', 'People'], ['records', 'Records'], ['help', 'How to play'], ['sys', 'Game']];
  let pick = -1;
  const draw = () => {
    const p = state.player; let h = `<nav class="fm-tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</nav>`;
    if (tab === 'bag') {
      h += '<div class="fm-grid">' + p.inv.map((s, i) => `<button class="fm-slot big${i === pick ? ' sel' : ''}" data-slot="${i}">${s ? icon(s.id) + (s.n > 1 ? `<i>${s.n}</i>` : '') : ''}</button>`).join('') + '</div>';
      const s = pick >= 0 ? p.inv[pick] : null, it = s && ITEMS[s.id];
      h += `<div class="fm-info">${it ? `<b>${esc(it.name)}${it.kind === 'tool' && p.toolLevel[s.id] ? ' · ' + TOOL_LEVELS[p.toolLevel[s.id]] : ''}</b><span>${esc(it.desc || '')}${it.sell ? ` · sells for ${it.sell} cr` : ''}${it.stamina ? ` · restores ${it.stamina} stamina` : ''}</span>${it.stamina ? '<button data-act="eat">Eat</button>' : ''}` : '<span>Click a slot, then another to swap them.</span>'}</div>`;
      h += `<p class="fm-dim">In store: ${state.stock.lumber} lumber · ${state.stock.fodder} fodder · ${state.stock.feed} hen feed · Watering can ${p.water}/${sim.CAN_CAPACITY[p.toolLevel.can || 1]}</p>`;
    } else if (tab === 'people') {
      h += Object.values(NPCS).filter((n) => n.id !== 'sato').map((n) => { const hv = sim.hearts(state, n.id), met = state.npc[n.id] && state.npc[n.id].met; return `<div class="fm-row person">${face(n.id)}<div><b>${met ? esc(n.name) : '???'}</b><span>${met ? esc(n.title) : 'Not met yet'}${met && n.birthday ? ` · birthday ${SEASONS[n.birthday.season]} ${n.birthday.day}` : ''}</span></div><span class="fm-hearts">${'♥'.repeat(hv)}<s>${'♥'.repeat(10 - hv)}</s></span></div>`; }).join('');
    } else if (tab === 'records') {
      const g = sim.goalState(state), L = state.ledger, st = state.stats || {};
      h += `<h3>First steps</h3>` + sim.GOALS.map((q, i) => `<div class="fm-row"><div><b>${g[i].done ? '✔' : '○'} ${esc(q.title)}</b><span>${esc(q.hint)}</span></div></div>`).join('');
      h += `<h3>The farm</h3><p>Earned from shipping: ${(L.earned || 0).toLocaleString()} cr · Animals: ${state.animals.length} · Deepest level of the Old World: ${st.deepest || 0}</p>`;
      h += `<h3>Memory Room</h3><p>${sim.museumCount(state)} of 10 kinds of old-world finds given to the village.</p>`;
      const fl = Object.entries(state.fishLog || {}); h += `<h3>Fish caught</h3><p>${fl.length ? fl.map(([id, n]) => `${icon(id)} ${esc(ITEMS[id].name)} × ${n}`).join(' &nbsp; ') : 'None yet.'}</p>`;
      const sh = Object.entries(L.shipped || {}); h += `<h3>Shipped so far</h3><p>${sh.length ? sh.map(([id, n]) => `${icon(id)} ${esc(ITEMS[id] ? ITEMS[id].name : id)} × ${n}`).join(' &nbsp; ') : 'Nothing yet.'}</p>`;
    } else if (tab === 'help') {
      h += HELP.map((x) => `<h3>${esc(x.title)}</h3><p>${esc(x.body).replace(/\n/g, '<br>')}</p>`).join('');
    } else {
      h += `<div class="fm-sys"><button data-act="save">Save the game</button><button data-act="export">Export save to a file</button><button data-act="music">Music on / off (M)</button><button data-act="title">Back to the title</button></div><p class="fm-dim">The game also saves by itself every morning.</p>`;
    }
    const body = openWin('Sato’s Harvest', h, () => hooks.close && hooks.close(), 'menu');
    body.onclick = (e) => {
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; pick = -1; return draw(); }
      const s = e.target.closest('[data-slot]');
      if (s) { const i = +s.dataset.slot; if (pick >= 0 && pick !== i) { const inv = state.player.inv; [inv[pick], inv[i]] = [inv[i], inv[pick]]; pick = -1; hooks.change(); } else pick = pick === i ? -1 : i; return draw(); }
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'eat') { const r = sim.eat(state, pick); toast(r.msg || (r.ok ? 'That was good.' : '')); hooks.change(); if (!state.player.inv[pick]) pick = -1; draw(); }
      else hooks[a.dataset.act] && hooks[a.dataset.act]();
    };
  };
  draw();
}
export function museum(state, relics) {
  openWin('The Memory Room', `<p class="fm-lead">Things from the Old World, kept so that Eden's children know what was lost, and what was good.</p><div class="fm-grid wide">` +
    relics.map((r) => { const have = state.museum && state.museum[r.id]; return `<div class="fm-relic${have ? '' : ' no'}">${have ? icon(r.id) : '<span class="fm-ico fm-fake" style="background:#333">?</span>'}<b>${have ? esc(ITEMS[r.id].name) : '— empty case —'}</b>${have && r.text ? `<span>${esc(r.text)}</span>` : ''}</div>`; }).join('') + '</div>', null, 'menu');
}
