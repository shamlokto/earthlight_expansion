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
// Drawn icons for things the art pack has no picture of (tools, seed bag, meals, a few finds).
const S = (b) => `<svg viewBox="0 0 64 64" class="fm-ico">${b}</svg>`;
const WOOD = '#b07a45', IRON = '#9fb0bf', INK = '#4a3524';
const DRAWN = {
  hoe: `<path d="M14 54 46 14" stroke="${WOOD}" stroke-width="5" stroke-linecap="round"/><path d="M40 8 56 16 50 26 42 20Z" fill="${IRON}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  axe: `<path d="M16 56 44 14" stroke="${WOOD}" stroke-width="5" stroke-linecap="round"/><path d="M36 8c10-2 18 4 20 14-8 0-14 4-18 10L30 22c4-4 6-8 6-14Z" fill="${IRON}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  hammer: `<path d="M18 56 40 22" stroke="${WOOD}" stroke-width="5" stroke-linecap="round"/><rect x="26" y="8" width="30" height="16" rx="4" transform="rotate(32 41 16)" fill="#8794a3" stroke="${INK}" stroke-width="2"/>`,
  sickle: `<path d="M18 56 28 40" stroke="${WOOD}" stroke-width="6" stroke-linecap="round"/><path d="M28 40C16 22 30 6 52 12 36 14 28 24 34 38Z" fill="${IRON}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  can: `<path d="M14 26h28l-3 28H17Z" fill="#6fb4dc" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M42 32 58 20M55 16l6 8" stroke="#4d93bd" stroke-width="4" stroke-linecap="round"/><path d="M18 26c0-14 20-14 20 0" fill="none" stroke="#4d93bd" stroke-width="4"/>`,
  rod: `<path d="M10 56 52 8" stroke="#c9a05c" stroke-width="3.5" stroke-linecap="round"/><path d="M52 8v30" stroke="#888" stroke-width="1.5"/><circle cx="52" cy="42" r="5" fill="#e2463a" stroke="${INK}" stroke-width="1.5"/><circle cx="20" cy="46" r="5" fill="#777" stroke="${INK}" stroke-width="1.5"/>`,
  milker: `<path d="M18 22h28l-4 32H22Z" fill="#e8eef2" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M18 22c0-10 28-10 28 0" fill="none" stroke="#9aa7b3" stroke-width="3"/><path d="M24 34h16" stroke="#9aa7b3" stroke-width="2"/>`,
  brush: `<rect x="10" y="20" width="44" height="14" rx="6" fill="${WOOD}" stroke="${INK}" stroke-width="2"/><path d="M14 34v14M20 34v15M26 34v14M32 34v15M38 34v14M44 34v15M50 34v14" stroke="#e8d9a8" stroke-width="3.5" stroke-linecap="round"/>`,
  seedbag: `<path d="M18 22c-8 12-8 34 14 34s22-22 14-34Z" fill="#d9bf8a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M20 22 16 10l8 4 8-6 8 6 8-4-4 12Z" fill="#c9aa72" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M20 22h24" stroke="#b0503f" stroke-width="3" stroke-linecap="round"/>`,
  egg: `<ellipse cx="32" cy="35" rx="15" ry="20" fill="#fbf1de" stroke="${INK}" stroke-width="2"/><ellipse cx="26" cy="27" rx="4" ry="6" fill="#fff" opacity=".8"/>`,
  bread: `<path d="M10 34c0-22 44-22 44 0v14H10Z" fill="#d99a4e" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M22 22l4 8M32 20l4 8M42 22l4 8" stroke="#f3cf8e" stroke-width="3" stroke-linecap="round"/>`,
  soup: `<path d="M8 30h48c0 16-10 24-24 24S8 46 8 30Z" fill="#f2efe8" stroke="${INK}" stroke-width="2"/><ellipse cx="32" cy="30" rx="24" ry="6" fill="#e58b3a" stroke="${INK}" stroke-width="2"/><path d="M24 18c-3-5 3-6 0-11M36 18c-3-5 3-6 0-11" fill="none" stroke="#bbb" stroke-width="2" stroke-linecap="round"/>`,
  pie: `<path d="M6 40 32 14l26 26Z" fill="#e2a85a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M6 40h52v8H6Z" fill="#c9843c" stroke="${INK}" stroke-width="2"/><path d="M24 32h16M28 26h8" stroke="#a3402e" stroke-width="3" stroke-linecap="round"/>`,
  tea: `<path d="M12 26h32v10c0 12-6 18-16 18S12 48 12 36Z" fill="#f2efe8" stroke="${INK}" stroke-width="2"/><path d="M44 30c12-2 12 14 0 12" fill="none" stroke="${INK}" stroke-width="2.5"/><ellipse cx="28" cy="27" rx="15" ry="4" fill="#9cbf6a"/><path d="M24 16c-3-5 3-6 0-10" fill="none" stroke="#bbb" stroke-width="2" stroke-linecap="round"/>`,
  tonic: `<path d="M26 8h12v10l8 10v26H18V28l8-10Z" fill="#8fd6c9" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><rect x="25" y="5" width="14" height="6" rx="2" fill="${WOOD}" stroke="${INK}" stroke-width="1.5"/><path d="M22 36h20v12H22Z" fill="#fff" opacity=".7"/><path d="M32 38v8M28 42h8" stroke="#d9463a" stroke-width="2.5"/>`,
  seedtin: `<rect x="12" y="20" width="40" height="32" rx="5" fill="#7fa37a" stroke="${INK}" stroke-width="2"/><rect x="10" y="14" width="44" height="10" rx="4" fill="#9bbd92" stroke="${INK}" stroke-width="2"/><path d="M32 46V34m0 4c-8 0-8-8-8-8 6 0 8 4 8 8Zm0-2c6 0 8-6 8-6-6 0-8 2-8 6Z" fill="#e8f2d8" stroke="#e8f2d8" stroke-width="1.5"/>`,
  musicbox: `<rect x="10" y="30" width="44" height="22" rx="4" fill="#a8683f" stroke="${INK}" stroke-width="2"/><path d="M10 30 16 12h38l0 18Z" fill="#c98a55" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="32" cy="41" r="5" fill="#e8c46a" stroke="${INK}" stroke-width="1.5"/><path d="M40 22v-8l8-2v8" fill="none" stroke="#fff3c9" stroke-width="2"/>`,
  datachip: `<rect x="14" y="14" width="36" height="36" rx="5" fill="#3d5a80" stroke="${INK}" stroke-width="2"/><rect x="24" y="24" width="16" height="16" rx="2" fill="#7dffb0"/><path d="M20 8v6M32 8v6M44 8v6M20 50v6M32 50v6M44 50v6M8 20h6M8 32h6M8 44h6M50 20h6M50 32h6M50 44h6" stroke="#c9d6e2" stroke-width="3" stroke-linecap="round"/>`,
  ring: `<circle cx="32" cy="38" r="15" fill="none" stroke="#e8b830" stroke-width="6"/><path d="M24 18l8-10 8 10-8 8Z" fill="#8fe3f0" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  lumber: `<rect x="8" y="34" width="48" height="12" rx="6" fill="${WOOD}" stroke="${INK}" stroke-width="2"/><rect x="14" y="20" width="40" height="12" rx="6" fill="#c08a52" stroke="${INK}" stroke-width="2"/><circle cx="14" cy="40" r="4" fill="#e8c99a"/><circle cx="20" cy="26" r="4" fill="#e8c99a"/>`,
  feed: `<path d="M16 20h32l4 34H12Z" fill="#e3cf9a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M20 20c0-10 24-10 24 0" fill="#d1b877" stroke="${INK}" stroke-width="2"/><circle cx="26" cy="36" r="2.5" fill="#c9853a"/><circle cx="36" cy="40" r="2.5" fill="#c9853a"/><circle cx="30" cy="46" r="2.5" fill="#c9853a"/>`,
  fodder: `<rect x="10" y="22" width="44" height="30" rx="6" fill="#e0c060" stroke="${INK}" stroke-width="2"/><path d="M10 32h44M10 42h44" stroke="#b08a2e" stroke-width="2"/><path d="M22 22v30M42 22v30" stroke="#a3402e" stroke-width="3"/>`,
};
const KIND_COLOR = { tool: '#6f7f95', seed: '#8a6f3d', crop: '#4f9a3a', animal: '#d9c79a', fish: '#3f7fa8', forage: '#7a9a4a', ore: '#77736d', relic: '#b08d3c', food: '#c9853a', stock: '#a37a4f' };
export function icon(id) {
  const it = ITEMS[id]; if (!it) return '';
  const u = art.url('icons/' + id) || (it.kind === 'crop' ? art.url(`sprites/crop_${id}_2`) : null);
  if (u) return `<img class="fm-ico" src="${u}" alt="">`;
  if (it.kind === 'seed') { const c = it.crop, cu = c && (art.url('icons/' + c) || art.url(`sprites/crop_${c}_2`)), bag = art.url('icons/seedbag'); return `<span class="fm-ico fm-seed">${bag ? `<img src="${bag}" alt="">` : S(DRAWN.seedbag)}${cu ? `<img class="fm-mini" src="${cu}" alt="">` : ''}</span>`; }
  if (DRAWN[id]) return S(DRAWN[id]);
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
  const qh = extra.quest ? `<b>Favour for ${esc(extra.quest.who)}</b><span>${esc(extra.quest.text)}</span>` : '';
  $('hGoal').innerHTML = (next ? `<b>${esc(next.title)}</b><span>${esc(next.hint)}</span>` : '') + qh; $('hGoal').hidden = !next && !qh;
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
      h += Object.values(NPCS).filter((n) => n.id !== 'sato').map((n) => { const hv = sim.hearts(state, n.id), met = state.npc[n.id] && state.npc[n.id].met; return `<div class="fm-row person">${face(n.id)}<div><b>${met ? esc(n.name) : '???'}</b><span>${met ? esc(n.title) : 'Not met yet'}${state.flags.partner === n.id ? ' · <em style="color:#b9402e">your partner</em>' : state.flags.sweet === n.id ? ' · <em style="color:#b9402e">sweetheart</em>' : ''}${met && n.birthday ? ` · birthday ${SEASONS[n.birthday.season]} ${n.birthday.day}` : ''}</span></div><span class="fm-hearts">${'♥'.repeat(hv)}<s>${'♥'.repeat(10 - hv)}</s></span></div>`; }).join('');
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
