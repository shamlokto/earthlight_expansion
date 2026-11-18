// Sato's Harvest: the interface (plain DOM over the 3D view): HUD, rucksack bar, dialogue with
// portraits, picture and film scenes, shops, the menu and the morning report.
import * as THREE from 'three';
import * as art from './art.js';
import { ITEMS, CROPS, SEASONS, TOOL_LEVELS, FRUIT_TREES, TREE_DAYS, ROBOT_JOBS, RELICS } from './data.js';
import * as sim from './sim.js';
import { NPCS, HELP, FESTIVALS, RADIO } from './story.js';
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
  frostcap: `<path d="M10 32c0-22 44-22 44 0Z" fill="#bfe3f5" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M26 32h12l2 20H24Z" fill="#f4f8fb" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="24" cy="22" r="3" fill="#fff"/><circle cx="38" cy="18" r="2.5" fill="#fff"/><circle cx="44" cy="26" r="2" fill="#fff"/>`,
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
  basket: `<path d="M10 30h44l-6 24H16Z" fill="#c99a5a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M14 38h36M16 46h32M24 30l-2 24M32 30v24M40 30l2 24" stroke="#9a6a35" stroke-width="2"/><path d="M18 30c0-18 28-18 28 0" fill="none" stroke="#9a6a35" stroke-width="4"/>`,
  field_chest: `<rect x="10" y="26" width="44" height="26" rx="4" fill="#5f7f8f" stroke="${INK}" stroke-width="2"/><path d="M10 28c0-10 44-10 44 0Z" fill="#8a6a45" stroke="${INK}" stroke-width="2"/><rect x="28" y="30" width="8" height="8" rx="2" fill="#ffd36a" stroke="${INK}" stroke-width="1.5"/>`,
  solar_panel: `<path d="M8 20h48l-6 22H14Z" fill="#2f4f7f" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M22 20l-3 22M34 20v22M46 20l3 22M11 31h42" stroke="#7fb2e8" stroke-width="1.5"/><path d="M32 42v12M22 56h20" stroke="#9fb0bf" stroke-width="4" stroke-linecap="round"/>`,
  battery: `<rect x="14" y="16" width="36" height="40" rx="5" fill="#d9dee3" stroke="${INK}" stroke-width="2"/><rect x="26" y="10" width="12" height="7" rx="2" fill="#9fb0bf" stroke="${INK}" stroke-width="1.5"/><rect x="19" y="46" width="26" height="6" rx="2" fill="#e2463a"/>`,
  battery_full: `<rect x="14" y="16" width="36" height="40" rx="5" fill="#d9dee3" stroke="${INK}" stroke-width="2"/><rect x="26" y="10" width="12" height="7" rx="2" fill="#9fb0bf" stroke="${INK}" stroke-width="1.5"/><rect x="19" y="21" width="26" height="31" rx="2" fill="#5fd08a"/><path d="M34 24 26 38h7l-3 11 9-15h-7Z" fill="#fff"/>`,
  sapling: `<path d="M14 54h36l-4-10H18Z" fill="#a8783f" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M32 44V20" stroke="#6b4a2a" stroke-width="3"/><path d="M32 30c-12 0-14-12-14-12 10 0 14 6 14 12Zm0-6c10 0 14-10 14-10-10 0-14 4-14 10Z" fill="#6fbf5a" stroke="${INK}" stroke-width="1.5"/>`,
  fodder: `<rect x="10" y="22" width="44" height="30" rx="6" fill="#e0c060" stroke="${INK}" stroke-width="2"/><path d="M10 32h44M10 42h44" stroke="#b08a2e" stroke-width="2"/><path d="M22 22v30M42 22v30" stroke="#a3402e" stroke-width="3"/>`,
};
const KIND_COLOR = { fruit: '#d8564a', sapling: '#5f9a3a', placeable: '#5f7f8f', part: '#8a98a6', keepsake: '#c98ab0', tool: '#6f7f95', seed: '#8a6f3d', crop: '#4f9a3a', animal: '#d9c79a', fish: '#3f7fa8', forage: '#7a9a4a', ore: '#77736d', relic: '#b08d3c', food: '#c9853a', stock: '#a37a4f' };
// Round fruit and forage drawn in their own colour when the art pack has no picture yet.
const ROUND = { cherry: '#c8102e', peach: '#ffa48a', apple: '#d8362a', persimmon: '#f07a1a', wild_apple: '#d8a03a', wild_grape: '#5a2f7a', chestnut: '#7a4a2a', pine_nut: '#a07a4a', honeycomb: '#f0b32a', winter_root: '#efe2c8', bamboo_shoot: '#c9d27a', wild_mint: '#58c08a', fiddlehead: '#7a9a3a', matsutake: '#e8d8b8' };
const roundIcon = (c, id) => id === 'honeycomb' ? `<path d="M20 18h12l6 10-6 10H20l-6-10Z M38 28h12l6 10-6 10H38l-6-10Z M20 38h12l6 10-6 10H20l-6-10Z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
  : id === 'matsutake' ? `<path d="M12 30c0-16 40-16 40 0Z" fill="#a8743f" stroke="${INK}" stroke-width="2"/><path d="M26 30h12l3 24H23Z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
  : ['bamboo_shoot', 'fiddlehead', 'wild_mint', 'winter_root'].includes(id) ? `<path d="M32 56C18 44 22 20 32 8c10 12 14 36 0 48Z" fill="${c}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M32 52V16" stroke="${INK}" stroke-width="1.5" opacity=".5"/>`
  : `<circle cx="32" cy="36" r="18" fill="${c}" stroke="${INK}" stroke-width="2"/><ellipse cx="25" cy="29" rx="5" ry="4" fill="#fff" opacity=".45"/><path d="M32 18c2-6 6-9 10-9-1 5-5 8-10 9Z" fill="#5fae4a" stroke="${INK}" stroke-width="1.5"/>`;
export function icon(id) {
  const it = ITEMS[id]; if (!it) return '';
  const u = art.url('icons/' + id) || (it.kind === 'crop' ? art.url(`sprites/crop_${id}_2`) : null);
  if (u) return `<img class="fm-ico" src="${u}" alt="">`;
  if (it.kind === 'seed') { const c = it.crop, cu = c && (art.url('icons/' + c) || art.url(`sprites/crop_${c}_2`)), bag = art.url('icons/seedbag'); return `<span class="fm-ico fm-seed">${bag ? `<img src="${bag}" alt="">` : S(DRAWN.seedbag)}${cu ? `<img class="fm-mini" src="${cu}" alt="">` : ''}</span>`; }
  if (DRAWN[id]) return S(DRAWN[id]);
  if (it.kind === 'sapling') return S(DRAWN.sapling);
  if (ROUND[id]) return S(roundIcon(ROUND[id], id));
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
  const bar = $('bar'); bar.innerHTML = h;
  // 25–30 slots: two even rows on a wide screen; on a phone rows of ten, the slots shrunk to fit.
  const n = p.inv.length, narrow = innerWidth < 700, cols = narrow ? Math.min(n, 10) : n > 20 ? Math.ceil(n / 2) : n;
  const size = Math.max(26, Math.min(narrow ? 44 : 52, Math.floor((innerWidth * 0.96 - 14 - 5 * (cols - 1)) / cols)));
  bar.style.setProperty('--cols', cols); bar.style.setProperty('--slot', size + 'px'); bar.classList.add('grid');
  $('hud').style.setProperty('--barH', (bar.offsetHeight || 64) + 'px');
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
export const openWindow = (...a) => openWin(...a);       // for the map screen (minimap.js)
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
      if (sim.countItem(state, 'basket')) { const b = state.player.basket || []; h += `<h3>Basket (${sim.basketTotal(state)}/${sim.BASKET_CAP})</h3>${b.length ? `<div class="fm-grid">${b.map((x, i) => `<button class="fm-slot big" data-bk="${i}" title="Take ${esc(ITEMS[x.id].name)} out">${icon(x.id)}${x.n > 1 ? `<i>${x.n}</i>` : ''}</button>`).join('')}</div><p class="fm-dim">Click a stack to take it out of the basket. Hold the basket and press E at the bin to ship the lot.</p>` : '<p class="fm-dim">Empty. Hold the basket while you harvest or forage and the pickings go in here.</p>'}`; }
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
      h += `<div class="fm-sys"><button data-act="save">Save the game</button><button data-act="export">Export save to a file</button><button data-act="music">Music on / off</button><button data-act="title">Back to the title</button></div><p class="fm-dim">The game also saves by itself every morning.</p>`;
    }
    const body = openWin('Sato’s Harvest', h, () => hooks.close && hooks.close(), 'menu');
    body.onclick = (e) => {
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; pick = -1; return draw(); }
      const bk = e.target.closest('[data-bk]'); if (bk) { const r = sim.basketTake(state, +bk.dataset.bk); toast(r.msg); hooks.change && hooks.change(); return draw(); }
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

// The storage box or the fridge: the rucksack on top, the box below; click a stack to move it across.
// `where` is 'storage', 'fridge' or 'chest:<i>' (a field chest); the box itself comes from sim.boxOf().
export function boxWindow(state, where, onChange, title) {
  title = title || (where === 'fridge' ? 'The fridge' : where === 'storage' ? 'Storage box' : 'Field chest');
  const draw = (msg = '') => {
    const box = sim.boxOf(state, where) || [], inv = state.player.inv;
    const cell = (s, i, side) => `<button class="fm-slot big" data-side="${side}" data-i="${i}" title="${s ? esc(ITEMS[s.id].name) : ''}">${s ? icon(s.id) + (s.n > 1 ? `<i>${s.n}</i>` : '') : ''}</button>`;
    const body = openWin(title, `<p class="fm-dim">Click something in your rucksack to put it ${where === 'fridge' ? 'in the fridge (food only)' : 'away'}; click something below to take it out.</p>
      <h3>Rucksack</h3><div class="fm-grid">${inv.map((s, i) => cell(s, i, 'inv')).join('')}</div>
      <h3>${title}</h3><div class="fm-grid">${box.map((s, i) => cell(s, i, 'box')).join('')}</div>
      <p class="fm-dim">${esc(msg)}</p>`, null, 'menu');
    body.onclick = (e) => {
      const b = e.target.closest('[data-side]'); if (!b) return;
      // Ask how many: the stack's size is the default, and the rules still check the real count.
      const inv = b.dataset.side === 'inv', stack = inv ? (state.player.inv[+b.dataset.i] || {}).n : (state[where] || [])[+b.dataset.i]?.n;
      if (!stack) { draw('That space is empty.'); return; }
      const ans = window.prompt(`How many to ${inv ? 'put away' : 'take out'}? (1–${stack})`, String(stack));
      if (ans === null) return;
      const n = Math.floor(Number(ans));
      if (!(n >= 1)) { draw('Please enter a number of at least 1.'); return; }
      const r = inv ? sim.storeItem(state, where, +b.dataset.i, n) : sim.takeItem(state, where, +b.dataset.i, n);
      onChange && onChange(); draw(r.msg || '');
    };
  };
  draw();
}
// The kitchen: recipes that can be made from the rucksack and the fridge.
export function kitchenWindow(state, onChange) {
  const draw = (msg = '') => {
    const book = sim.recipeBook(state), ready = book.filter((r) => r.can).length;
    const groups = [...new Set(book.map((r) => r.group))];
    const row = (r) => `<div class="fm-row${r.can ? ' can' : ' no'}"><div><b>${icon(r.id)} ${esc(r.name)}${r.can ? ' <span class="fm-ok">can make now</span>' : ''}${r.cooked ? ` <small class="fm-dim">cooked ${r.cooked}×</small>` : ''}</b><span>${r.uses ? 'Uses ' + esc(r.uses.join(', ')) : 'Needs ' + esc(r.needs.join(' + '))} · +${ITEMS[r.id].stamina} stamina · sells ${ITEMS[r.id].sell} cr</span></div><button data-r="${r.id}" ${r.can ? '' : 'disabled'}>Cook</button></div>`;
    const body = openWin('Kitchen', `<p class="fm-lead">The stove is a salvaged ship's galley ring. It still smells faintly of coolant and toast.</p>
      <p class="fm-kready">${ready ? `<b>${ready}</b> dish${ready > 1 ? 'es' : ''} you can make right now.` : 'Nothing you can make right now: the recipes below say what each needs.'}</p>` +
      groups.map((g) => { const rs = book.filter((r) => r.group === g).sort((a, b) => b.can - a.can); return `<h3>${esc(g)} <small class="fm-dim">${rs.filter((r) => r.can).length}/${rs.length} ready</small></h3>${rs.map(row).join('')}`; }).join('') +
      `<p class="fm-dim">Ingredients come from your rucksack first, then the fridge. ${esc(msg)}</p>`, null, 'menu kitchen');
    body.onclick = (e) => { const b = e.target.closest('[data-r]'); if (!b) return; const r = sim.cook(state, b.dataset.r); onChange && onChange(r); draw(r.msg || ''); };
  };
  draw();
}

// ---------------------------------------------------------------- the Farm journal (P): a pause screen
// Tabs: Today (a farm status report), Items (everything Sato owns, with a turning 3D examine view),
// Collections. The game clock is stopped while any window is open.
let journalIsOpen = false;
export const journalOpen = () => journalIsOpen && windowOpen();
const hearts = (love) => { const h = Math.floor((love || 0) / 20); return `<span class="fm-hearts">${'♥'.repeat(h)}<s>${'♥'.repeat(5 - h)}</s></span>`; };
const yes = (b) => (b ? '<span class="fm-ok">✓</span>' : '<span class="fm-no">✗</span>');
function fieldSummary(state, id) {
  const f = state.fields[id], by = {}; let till = 0, planted = 0, wet = 0, ripe = 0, dead = 0, debris = 0;
  for (const t of f.tiles) {
    if (t.till) till++; if (t.wet) wet++; if (t.obj) debris++;
    if (!t.crop) continue; if (t.crop.dead) { dead++; continue; }
    planted++; const st = sim.cropStage(t.crop), e = by[t.crop.id] ||= { n: 0, ripe: 0 }; e.n++; if (st === 3) { e.ripe++; ripe++; }
  }
  const crops = Object.entries(by).map(([c, e]) => `${icon(c)} ${esc(CROPS[c].name)} × ${e.n}${e.ripe ? ` <span class="fm-ok">(${e.ripe} ripe)</span>` : ''}`).join(' &nbsp; ');
  return `<div class="fm-stats"><span><b>${till}</b> tilled</span><span><b>${planted}</b> planted</span><span><b>${wet}</b> watered</span><span><b>${ripe}</b> ripe</span><span><b>${dead}</b> dead</span>${id === 'farm' ? `<span><b>${debris}</b> debris</span>` : ''}</div>${crops ? `<p>${crops}</p>` : '<p class="fm-dim">Nothing growing.</p>'}`;
}
function todayTab(state, extra) {
  const p = state.player, c = state.cal, buff = sim.onsenBuff(state);
  const radio = RADIO[state.weatherTomorrow]; const fc = Array.isArray(radio) ? radio[0] : radio;
  let h = `<div class="fm-jtop"><div><b class="fm-big">${esc(sim.dateLabel(state))}</b><span>${esc(sim.timeLabel(state))} · ${esc(extra.place || '')}</span></div>
    <div><span>${WEATHER_ICON[state.weather]} Today: ${state.weather}</span><span>${WEATHER_ICON[state.weatherTomorrow]} Tomorrow: ${state.weatherTomorrow}</span></div>
    <div><b class="fm-big">${p.money.toLocaleString()} cr</b><span>Stamina ${p.stamina}/${p.maxStamina}${buff ? ' · <span class="fm-ok">♨ onsen glow: tools cost 1 less today</span>' : ''}</span></div></div>`;
  if (fc) h += `<p class="fm-dim">Forecast: ${esc(fc)}</p>`;
  h += `<h3>The Hollin field</h3>${fieldSummary(state, 'farm')}`;
  h += `<h3>Greenhouse</h3>${state.flags.greenhouse ? fieldSummary(state, 'greenhouse') : '<p class="fm-dim">Still a wreck. Ruess can repair it (4,000 cr and 120 lumber).</p>'}`;
  const g = state.pasture.grass, sown = g.filter(Boolean).length, rg = g.filter((x) => x === 3).length;
  h += `<h3>Pasture</h3><p>${sown ? `${sown} patches of grass, <b>${rg}</b> ripe to cut for fodder.` : 'No grass sown yet.'} Stores: ${state.stock.fodder} fodder · ${state.stock.feed} hen feed · ${state.stock.lumber} lumber.</p>`;
  h += `<h3>Animals</h3>` + (state.animals.length ? state.animals.map((a) => `<div class="fm-row"><div><b>${a.kind === 'cow' ? '🐄' : '🐔'} ${esc(a.name)}</b><span>fed ${yes(a.fed)} · ${a.kind === 'cow' ? `milked ${yes(a.milked)} · brushed ${yes(a.brushed)}` : 'lays an egg tomorrow if fed'} · said hello ${yes(a.talked)}</span></div>${hearts(a.love)}</div>`).join('') + (state.eggs ? `<p>${state.eggs} egg${state.eggs > 1 ? 's' : ''} waiting in the coop.</p>` : '') : '<p class="fm-dim">No animals yet. Corran sells chickens and cows.</p>');
  const R = state.robots || [];
  h += `<h3>Field-units</h3>` + (R.length ? R.map((r, i) => `<div class="fm-row"><div><b>🤖 ${esc(r.name)} · ${esc(ROBOT_JOBS[r.job] || r.job)}</b><span>skill ${sim.robotLevel(r)} (${r.job === 'animals' ? 'tends every animal' : r.job === 'rest' ? 'resting' : 'reaches ' + sim.robotReach(r) + ' tiles'}) · “${esc(sim.robotMood(state, i))}”${r.done ? ` · did ${r.done} this morning` : ''}</span></div><span class="fm-batt"><i style="width:${r.charge}%" class="${r.charge < 30 ? 'low' : ''}"></i><u>${r.charge}%</u></span></div>`).join('') : '<p class="fm-dim">None yet. Ruess leases them at the Workshop (300 cr).</p>');
  const P = state.panels || [];
  if (P.length) h += `<p>Solar chargers: ${P.map((x) => `[${x.slots.map((b) => (b === 'battery_full' ? '🔋' : b ? '▫ charging' : '·')).join(' ')}]`).join(' ')} · batteries in your rucksack: ${sim.countItem(state, 'battery_full')} charged, ${sim.countItem(state, 'battery')} empty.</p>`;
  const T = state.fruitTrees || [];
  h += `<h3>Fruit trees</h3>` + (T.length ? T.map((t) => { const d = FRUIT_TREES[t.kind], st = sim.treeStage(state, t), left = TREE_DAYS - sim.treeAge(state, t); return `<div class="fm-row"><div><b>${icon(d.fruit)} ${esc(d.name)}</b><span>${st < 2 ? `${st ? 'young tree' : 'sapling'}, ${left} day${left > 1 ? 's' : ''} to go` : sim.fruitReady(state, t) ? '<span class="fm-ok">a fruit is ready to pick</span>' : state.cal.season === d.season ? 'picked today' : `fruits in ${SEASONS[d.season].toLowerCase()}`}</span></div></div>`; }).join('') : '<p class="fm-dim">None yet. Seln sells saplings (2,500 cr), any season but winter.</p>');
  const up = state.pending.upgrade, q = state.flags.quest;
  h += `<h3>Errands</h3><p>${up ? `Ruess is working on your ${esc(TOOL_LEVELS[up.level])} ${esc(ITEMS[up.tool].name.toLowerCase())}; ready tomorrow.` : 'No tool at the Workshop.'}</p>`;
  h += `<p>${q && NPCS[q.npc] && ITEMS[q.item] ? `Favour for ${esc(NPCS[q.npc].short || NPCS[q.npc].name)}: ${q.n} × ${esc(ITEMS[q.item].name)} (you have ${sim.countItem(state, q.item)}).` : 'No favour asked of you just now.'}</p>`;
  const fest = FESTIVALS.filter((f) => f.season === c.season && f.day >= c.day), bd = Object.values(NPCS).filter((n) => n.id !== 'sato' && n.birthday && n.birthday.season === c.season && n.birthday.day >= c.day).sort((a, b) => a.birthday.day - b.birthday.day);
  h += `<h3>This season</h3><p>${fest.length ? fest.map((f) => `🏮 <b>${esc(f.name)}</b>, ${SEASONS[c.season]} ${f.day}${f.day === c.day ? ' (today!)' : ''}`).join('; ') : 'No more festivals this season.'}</p>`;
  h += `<p>${bd.length ? 'Birthdays: ' + bd.map((n) => `🎂 ${state.npc[n.id] && state.npc[n.id].met ? esc(n.short || n.name) : '???'} on day ${n.birthday.day}${n.birthday.day === c.day ? ' (today!)' : ''}`).join(', ') : 'No more birthdays this season.'}${sim.satoBirthday(state) ? ' And it is your own birthday: the onsen is free.' : ''}</p>`;
  return h;
}
// Everything Sato owns, wherever it is.
function holdings(state) {
  const m = new Map(), add = (s, where) => { if (!s || !ITEMS[s.id]) return; const e = m.get(s.id) || { id: s.id, n: 0, where: new Set() }; e.n += s.n; e.where.add(where); m.set(s.id, e); };
  state.player.inv.forEach((s) => add(s, 'rucksack')); (state.player.basket || []).forEach((s) => add(s, 'basket'));
  (state.storage || []).forEach((s) => add(s, 'storage box')); (state.fridge || []).forEach((s) => add(s, 'fridge'));
  (state.chests || []).forEach((c) => c.items.forEach((s) => add(s, `field chest (${c.map === 'farm' ? 'farm' : 'hill'})`)));
  (state.panels || []).forEach((p) => p.slots.forEach((b) => b && add({ id: b, n: 1 }, 'solar charger')));
  for (const k of ['lumber', 'fodder', 'feed']) if (state.stock[k]) add({ id: k, n: state.stock[k] }, 'stores');
  return [...m.values()];
}
const KIND_NAME = { tool: 'Tool', seed: 'Seeds', crop: 'Crop', animal: 'From the animals', fish: 'Fish', forage: 'Forage', fruit: 'Fruit', sapling: 'Sapling', placeable: 'Farm gear', part: 'Robot part', ore: 'Salvage', relic: 'Old-world find', food: 'Food', keepsake: 'Keepsake', stock: 'Stores' };
function examineText(state, id) {
  const it = ITEMS[id], facts = [];
  if (it.kind === 'tool' && state.player.toolLevel[id]) facts.push(`Your level: ${TOOL_LEVELS[state.player.toolLevel[id]]}.`);
  if (it.sell) facts.push(`Sells for ${it.sell} cr.`); if (it.stamina) facts.push(`Restores ${it.stamina} stamina.`);
  if (CROPS[id]) facts.push(`${CROPS[id].days} days to grow${CROPS[id].regrow ? `, regrows every ${CROPS[id].regrow}` : ''}.`);
  const fs = sim.FORAGE.map((list, si) => (list.some(([x]) => x === id) ? SEASONS[si] : null)).filter(Boolean); if (fs.length) facts.push(`Found on Terrace Hill in ${fs.join(' and ').toLowerCase()}.`);
  const uses = sim.RECIPES.filter((r) => r.needs.some((slot) => slot.includes(id))).map((r) => r.name); if (uses.length) facts.push(`Cooks into: ${uses.join(', ')}.`);
  const rec = sim.RECIPES.find((r) => r.id === id); if (rec) facts.push(`Recipe: ${sim.recipeBook(state).find((r) => r.id === id).needs.join(' + ')}.`);
  const who = (k) => Object.values(NPCS).filter((n) => n.id !== 'sato' && n[k] && n[k].includes(id)).map((n) => n.short || n.name);
  const lv = who('loves'), lk = who('likes'), dl = who('dislikes');
  if (lv.length) facts.push(`Loved by ${lv.join(', ')}.`); if (lk.length) facts.push(`Liked by ${lk.join(', ')}.`); if (dl.length) facts.push(`${dl.join(', ')} would rather not.`);
  return { detail: it.detail || it.desc, facts };
}
function itemsTab(state, sel) {
  const list = holdings(state);
  const order = Object.keys(KIND_NAME); list.sort((a, b) => order.indexOf(ITEMS[a.id].kind) - order.indexOf(ITEMS[b.id].kind) || ITEMS[a.id].name.localeCompare(ITEMS[b.id].name));
  let h = `<div class="fm-items"><div class="fm-igrid">${list.map((e) => `<button class="fm-slot big${e.id === sel ? ' sel' : ''}" data-ex="${e.id}" title="${esc(ITEMS[e.id].name)}">${icon(e.id)}${e.n > 1 ? `<i>${e.n}</i>` : ''}</button>`).join('')}</div>`;
  const e = list.find((x) => x.id === sel) || null;
  if (e) {
    const it = ITEMS[e.id], t = examineText(state, e.id);
    h += `<div class="fm-exam"><div id="exView" class="fm-exview" title="Drag to turn it"></div><div class="fm-extext"><div class="fm-exkind">${esc(KIND_NAME[it.kind] || it.kind)}</div><h3>${esc(it.name)} <small>× ${e.n}</small></h3><p class="fm-exdetail">${esc(t.detail)}</p><p>${t.facts.map(esc).join(' ')}</p><p class="fm-dim">Where: ${[...e.where].map(esc).join(', ')}.</p></div></div>`;
  } else h += `<div class="fm-exam empty"><p class="fm-dim">${list.length} kinds of things. Click one to examine it: it turns in the viewer (drag to spin it) with a longer description.</p></div>`;
  return h + '</div>';
}
function collectionsTab(state) {
  const L = state.ledger, chip = (id, n, have = true) => `<span class="fm-chip${have ? '' : ' no'}">${have ? icon(id) : '<span class="fm-ico fm-fake" style="background:#bbb">?</span>'} ${have ? esc(ITEMS[id].name) : '???'}${n ? ` × ${n}` : ''}</span>`;
  const sh = Object.entries(L.shipped || {}).filter(([id]) => ITEMS[id]);
  let h = `<h3>Shipped (${sh.length} kinds · ${(L.earned || 0).toLocaleString()} cr earned)</h3><div class="fm-chips">${sh.length ? sh.map(([id, n]) => chip(id, n)).join('') : '<p class="fm-dim">Nothing yet.</p>'}</div>`;
  const FISH = ['fish_s', 'fish_m', 'fish_l', 'fish_spring', 'fish_summer', 'fish_autumn', 'fish_winter', 'fish_king'], fl = state.fishLog || {};
  h += `<h3>Fish log (${FISH.filter((f) => fl[f]).length}/${FISH.length})</h3><div class="fm-chips">${FISH.map((f) => chip(f, fl[f], !!fl[f])).join('')}</div>`;
  h += `<h3>Memory Room (${sim.museumCount(state)}/${RELICS.length})</h3><div class="fm-chips">${RELICS.map((r) => chip(r.id, 0, !!(state.museum || {})[r.id])).join('')}</div>`;
  const ck = state.cooked || {};
  h += `<h3>Recipes cooked (${sim.RECIPES.filter((r) => ck[r.id]).length}/${sim.RECIPES.length})</h3><div class="fm-chips">${sim.RECIPES.map((r) => chip(r.id, ck[r.id], !!ck[r.id])).join('')}</div>`;
  const fg = state.foraged || {}, all = [...new Set(sim.FORAGE.flat().map(([id]) => id))];
  h += `<h3>Forage found (${all.filter((x) => fg[x]).length}/${all.length})</h3><div class="fm-chips">${all.map((x) => chip(x, fg[x], !!fg[x])).join('')}</div>`;
  return h;
}
export function journal(state, opts = {}) {
  let tab = opts.tab || 'today', sel = null;
  const tabs = [['today', 'Today'], ['items', 'Items'], ['collections', 'Collections']];
  journalIsOpen = true;
  const draw = () => {
    stopViewer();
    const h = `<nav class="fm-tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}<span class="fm-paused">⏸ Paused · P or Esc to go back</span></nav>` +
      (tab === 'today' ? todayTab(state, opts) : tab === 'items' ? itemsTab(state, sel) : collectionsTab(state));
    const body = openWin('Farm journal', h, () => { journalIsOpen = false; stopViewer(); }, 'journal');
    body.onclick = (e) => {
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return draw(); }
      const x = e.target.closest('[data-ex]'); if (x) { sel = x.dataset.ex; return draw(); }
    };
    if (tab === 'items' && sel) startViewer($('exView'), sel);
  };
  draw();
  return { select: (id) => { tab = 'items'; sel = id; draw(); } };
}

// ---------------------------------------------------------------- the examine viewer (its own small renderer)
let VIEW = null;
function stopViewer() { if (VIEW) { VIEW.on = false; if (VIEW.obj) VIEW.scene.remove(VIEW.obj); VIEW.obj = null; } }
// A simple 3D tool for the viewer (tools have no models).
function toolShape(id) {
  const g = new THREE.Group(), mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o }), wood = mat(0xa9774a), iron = mat(0xb4c0cc, { metalness: 0.5, roughness: 0.35 });
  const add = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
  const handle = (l = 1.2) => add(new THREE.CylinderGeometry(0.04, 0.045, l, 10), wood, 0, 0, 0);
  switch (id) {
    case 'hoe': handle(1.4); add(new THREE.BoxGeometry(0.34, 0.06, 0.2), iron, 0, 0.7, 0.1, 0.5); break;
    case 'axe': handle(); add(new THREE.BoxGeometry(0.06, 0.3, 0.36), iron, 0, 0.5, 0.14); break;
    case 'hammer': handle(); add(new THREE.BoxGeometry(0.2, 0.2, 0.42), mat(0x6f7a86, { metalness: 0.5 }), 0, 0.6, 0); break;
    case 'sickle': handle(0.5); add(new THREE.TorusGeometry(0.3, 0.03, 6, 20, Math.PI * 1.2), iron, 0, 0.4, 0, 0, Math.PI / 2, 0); break;
    case 'can': add(new THREE.CylinderGeometry(0.3, 0.33, 0.5, 18), mat(0x5fa8d3), 0, 0, 0); add(new THREE.CylinderGeometry(0.04, 0.06, 0.6, 8), mat(0x5fa8d3), 0, 0.1, 0.4, 1.0); add(new THREE.TorusGeometry(0.22, 0.03, 6, 14, Math.PI), mat(0x4a8fb8), 0, 0.25, 0, 0, Math.PI / 2, 0); break;
    case 'rod': add(new THREE.CylinderGeometry(0.015, 0.04, 2, 8), mat(0xc8a05a), 0, 0, 0, 0, 0, 0.5); add(new THREE.SphereGeometry(0.07, 10, 8), mat(0xe2463a), 0.6, -0.5, 0); break;
    case 'milker': add(new THREE.CylinderGeometry(0.22, 0.28, 0.45, 16), mat(0xdfe6ea, { metalness: 0.4 }), 0, 0, 0); add(new THREE.TorusGeometry(0.2, 0.03, 6, 14, Math.PI), mat(0x9aa7b3), 0, 0.22, 0); break;
    case 'brush': add(new THREE.BoxGeometry(0.6, 0.12, 0.25), wood, 0, 0.06, 0); for (let i = 0; i < 12; i++) add(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 4), mat(0xe8d9a8), -0.25 + (i % 6) * 0.1, -0.08, (i < 6 ? -0.06 : 0.06)); break;
    case 'basket': { const b = mat(0xc99a5a); add(new THREE.CylinderGeometry(0.45, 0.35, 0.4, 18, 1, true), b, 0, 0, 0); add(new THREE.CircleGeometry(0.35, 18), b, 0, -0.2, 0, Math.PI / 2); add(new THREE.TorusGeometry(0.4, 0.03, 6, 18, Math.PI), mat(0x9a6a35), 0, 0.2, 0); break; }
    case 'battery': case 'battery_full': add(new THREE.BoxGeometry(0.5, 0.7, 0.3), mat(0xd9dee3, { metalness: 0.3 }), 0, 0, 0); add(new THREE.BoxGeometry(0.2, 0.1, 0.15), mat(0x9fb0bf), 0, 0.4, 0); add(new THREE.BoxGeometry(0.4, id === 'battery_full' ? 0.5 : 0.1, 0.02), new THREE.MeshBasicMaterial({ color: id === 'battery_full' ? 0x5fd08a : 0xe2463a }), 0, id === 'battery_full' ? 0 : -0.22, 0.16); break;
    default: return null;
  }
  return g;
}
// For things without a 3D model yet: the item's picture as a chunky cut-out with real thickness
// (stacked slices of its silhouette, darker inside), not a card. Real models replace it as they arrive.
function iconCard(id) {
  const g = new THREE.Group(), html = icon(id), c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const paint = (img) => { ctx.clearRect(0, 0, 256, 256); if (img) ctx.drawImage(img, 8, 8, 240, 240); tex.needsUpdate = true; };
  const m = /src="([^"]+)"/.exec(html), svg = /<svg[\s\S]*?<\/svg>/.exec(html), img = new Image();
  img.onload = () => paint(img);
  if (m) img.src = m[1]; else if (svg) img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg[0].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" '));
  else { ctx.beginPath(); ctx.arc(128, 128, 100, 0, 7); ctx.fillStyle = '#c9a877'; ctx.fill(); ctx.font = 'bold 90px sans-serif'; ctx.fillStyle = '#5a3c10'; ctx.textAlign = 'center'; ctx.fillText(ITEMS[id].name.slice(0, 2), 128, 160); tex.needsUpdate = true; }
  const geo = new THREE.PlaneGeometry(1.5, 1.5), N = 9, depth = 0.16;
  for (let i = 0; i < N; i++) {
    const edge = i > 0 && i < N - 1, t = i / (N - 1);
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, color: edge ? 0x9a8a78 : 0xffffff });
    const sl = new THREE.Mesh(geo, mat); sl.position.z = (t - 0.5) * depth; const k = edge ? 0.985 : 1; sl.scale.set(k, k, 1); g.add(sl);
  }
  return g;
}
// Which model shows an item: its own id, crops as crop_<id>, saplings, and a few by sense.
const MODEL_FOR = { solar_panel: ['solar_charger', 'solar_panel'], sapling_apple: ['sapling', 'fruit_tree_apple'], sapling_peach: ['sapling', 'fruit_tree_peach'], sapling_cherry: ['sapling', 'fruit_tree_cherry'], sapling_persimmon: ['sapling', 'fruit_tree_persimmon'], field_chest: ['field_chest', 'storage_box'], toy: ['toy', 'maint_bot'], lumber: ['lumber', 'crate'], fodder: ['fodder', 'haybale'] };
export function modelNameFor(id) {
  const it = ITEMS[id]; if (!it) return null;
  const c = [...(MODEL_FOR[id] || []), id, it.kind === 'crop' ? 'crop_' + id : null, it.kind === 'seed' && it.crop ? 'crop_' + it.crop : null].filter(Boolean);
  return c.find((n) => art.hasModel(n)) || null;
}
function startViewer(el, id) {
  if (!el) return;
  if (!VIEW) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50); camera.position.set(0, 0.7, 4.2); camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xfff6e4, 0x8a7a55, 1.6)); const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(2, 3, 4); scene.add(d);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 })); disc.rotation.x = -Math.PI / 2; disc.position.y = -0.85; scene.add(disc);
    VIEW = { renderer, scene, camera, obj: null, on: false, rx: 0.15, ry: 0, drag: null };
    const cv = renderer.domElement; cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', (e) => { VIEW.drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!VIEW.drag) return; VIEW.ry += (e.clientX - VIEW.drag.x) * 0.012; VIEW.rx = Math.max(-1.2, Math.min(1.2, VIEW.rx + (e.clientY - VIEW.drag.y) * 0.01)); VIEW.drag = { x: e.clientX, y: e.clientY }; VIEW.idle = 2; });
    cv.addEventListener('pointerup', () => { VIEW.drag = null; });
  }
  const V = VIEW, size = Math.max(160, Math.min(el.clientWidth || 280, 360)); V.renderer.setSize(size, size); el.appendChild(V.renderer.domElement);
  const holder = new THREE.Group(); V.obj = holder; V.scene.add(holder); V.ry = 0; V.rx = 0.15; V.idle = 0;
  const fit = (o) => { const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), k = 1.7 / Math.max(s.x, s.y, s.z, 0.01); o.scale.multiplyScalar(k); o.position.sub(c.multiplyScalar(k)); holder.add(o); };
  const name = modelNameFor(id), shape = !name && toolShape(id);
  if (name) art.model(name).then((m) => { if (V.obj !== holder) return; fit(m || iconCard(id)); });
  else fit(shape || iconCard(id));
  V.on = true; let last = performance.now();
  const loop = (now) => {
    if (!V.on || V.obj !== holder || !document.body.contains(V.renderer.domElement)) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!V.drag) { if (V.idle > 0) V.idle -= dt; else V.ry += dt * 0.6; }
    holder.rotation.set(V.rx, V.ry, 0); V.renderer.render(V.scene, V.camera); requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
