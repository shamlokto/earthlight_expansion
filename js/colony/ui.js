// Earthlight Space Colony Rebuild: the game screen's panels (docs/COLONY-V1.md, "Interface").
// The top bar, the build menu, the inspector, overlays, market, happiness breakdown, settings,
// the log strip, toasts, the cursor tip and the pending-event modal. DOM only: every order goes
// through `api` (js/colony/main.js), which calls the pure rules and refreshes the view.
//
//   const ui = createUI(root, api);
//   ui.update(force)          after a tick or an action: cheap text updates, panels re-render only when changed
//   ui.inspect(x, y) / ui.closeInspector()
//   ui.toast(msg, kind)       kind: 'bad' | 'good' | ''
//   ui.tip(html | null, clientX, clientY, ok)
//   ui.setPlacing(key | null, moving)  ui.setSpeed(s)  ui.openMarket()  ui.destroy()
//
// api: { state(), rules, sim, art(slot) → url|null, types (expansion units by type, or null),
//        act(result) → result, pick(key), move(id), setSpeed(s), setOverlay(name|null), save(),
//        toTitle(), focus(x, y), settings: { pauseOnEvents, snap }, setSetting(key, value) }
import { CATEGORIES, BUILDINGS, BUILDING } from './data/buildings.js';
import { TERRAIN, ARTIFACT, T } from './data/terrain.js';

const GOODS = ['food', 'water', 'air', 'parts', 'ore', 'credits'];
const GOOD_NAME = { food: 'Food', water: 'Water', air: 'Air', parts: 'Parts', ore: 'Ore', credits: 'Credits', power: 'Power' };
const SELLABLE = ['ore', 'food', 'parts'];
const CAT_COLOR = { core: '#f5c542', power: '#6fd3ff', life: '#5aa8ff', food: '#8fe38a', industry: '#ff9a52', homes: '#ff8fd8' };
const STATUS = {
  sealed: ['Sealed', 'Airless and unknown. Survey it from an open neighbour.'],
  surveying: ['Surveying', 'Ruess\'s team is mapping it.'],
  surveyed: ['Surveyed', 'Seal every breach, then pressurise it.'],
  pressurising: ['Pressurising', 'Filling it with air.'],
  open: ['Open', 'Pressurised: build inside.'],
};
const OVERLAYS = [[null, 'None'], ['reach', 'Reach'], ['park', 'Parks'], ['power', 'Power']];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (n) => {
  if (n == null || !Number.isFinite(+n)) return '–';
  const a = Math.abs(n);
  if (a >= 100000) return Math.round(n / 1000) + 'k';
  if (a >= 10000) return (n / 1000).toFixed(1) + 'k';
  return a < 10 && n % 1 ? (+n).toFixed(1) : String(Math.round(n));
};
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + num(Math.abs(n));
const costText = (c) => c ? [c.credits ? `${num(c.credits)} cr` : '', c.parts ? `${num(c.parts)} parts` : ''].filter(Boolean).join(' · ') || 'free' : 'free';
const flows = (o) => Object.entries(o || {}).filter(([, v]) => v).map(([k, v]) => `${num(v)} ${GOOD_NAME[k] || k}`).join(', ');

// A clone the rules can try an order on: tells why an order would fail without changing the game.
function dry(state, fn) {
  try { const s = structuredClone(state); return fn(s) || { ok: true }; } catch (e) { return { ok: false, msg: e.message }; }
}

// Procedural card picture (art slot card/<key> replaces it): an isometric block in the category's colour.
function cardIcon(b) {
  const c = CAT_COLOR[b.cat] || '#9aa', n = b.size || 1, w = 26 + n * 8, h = 10 + n * 6 + (b.housing ? 8 : 0) + (b.power > 0 ? 4 : 0);
  const cx = 48, base = 58, top = base - h;
  const dome = b.key === 'habitat' || b.key === 'command' || b.key === 'airplant';
  return `<svg viewBox="0 0 96 72" aria-hidden="true"><defs><linearGradient id="g${b.key}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".95"/><stop offset="1" stop-color="${c}" stop-opacity=".45"/></linearGradient></defs>
    <path d="M${cx} ${base + 12} L${cx + w} ${base} L${cx} ${base - 12} L${cx - w} ${base} Z" fill="rgba(111,211,255,.10)" stroke="rgba(111,211,255,.35)"/>
    <path d="M${cx - w * .6} ${base} L${cx} ${base + 7} L${cx} ${top + 7} L${cx - w * .6} ${top} Z" fill="${c}" fill-opacity=".55"/>
    <path d="M${cx + w * .6} ${base} L${cx} ${base + 7} L${cx} ${top + 7} L${cx + w * .6} ${top} Z" fill="${c}" fill-opacity=".32"/>
    <path d="M${cx} ${top + 7} L${cx + w * .6} ${top} L${cx} ${top - 7} L${cx - w * .6} ${top} Z" fill="url(#g${b.key})"/>
    ${dome ? `<ellipse cx="${cx}" cy="${top - 2}" rx="${w * .3}" ry="${w * .22}" fill="${c}" fill-opacity=".8" stroke="#fff" stroke-opacity=".4"/>` : ''}
    ${b.power > 0 ? `<path d="M${cx + 2} ${top - 18} l-7 11 h6 l-3 9 l9 -12 h-6 z" fill="#fff6c2"/>` : ''}</svg>`;
}

export function createUI(root, api) {
  const R = api.rules;
  const S = () => api.state();
  root.innerHTML = `
  <header class="cl-top">
    <div class="cl-date"><i>Eden</i><b data-h="day">Day 0</b></div>
    <div class="cl-speeds" role="group" aria-label="Speed">
      <button type="button" data-speed="0" title="Pause (space)">❚❚</button>
      <button type="button" data-speed="1" title="×1 (1)">×1</button>
      <button type="button" data-speed="2" title="×2 (2)">×2</button>
      <button type="button" data-speed="4" title="×4 (3)">×4</button>
    </div>
    <div class="cl-stats">
      ${GOODS.map((g) => `<div class="cl-stat" data-g="${g}" title="${GOOD_NAME[g]}: stock / capacity, change per day"><i>${GOOD_NAME[g]}</i><b><span data-v></span><small data-c></small></b><em data-d></em></div>`).join('')}
      <div class="cl-stat" data-g="power" title="Power: supply / demand (MW), battery"><i>Power</i><b><span data-v></span><small data-c></small></b><em data-d></em></div>
      <div class="cl-stat" data-g="pop" title="Colonists / housing; next transport"><i>Colonists</i><b><span data-v></span><small data-c></small></b><em data-d></em></div>
      <button type="button" class="cl-stat cl-happybtn" data-g="happy" title="Happiness: click for the breakdown"><i>Happiness</i><b><span data-v></span></b><em data-d></em></button>
      <label class="cl-stat cl-tax" title="Tax rate: 0% +8 happiness, 10% 0, 20% −14, 30% −32"><i>Tax <span data-tax></span></i><input type="range" min="0" max="30" step="1" data-taxin></label>
    </div>
    <div class="cl-tools">
      <button type="button" class="cl-btn sm" data-tool="market" title="Sell goods and guardians"><span class="cl-ico">⚖</span><span class="cl-lbl">Market</span></button>
      <button type="button" class="cl-btn sm" data-tool="save" title="Save the colony in this browser"><span class="cl-ico">⤓</span><span class="cl-lbl">Save</span></button>
      <button type="button" class="cl-btn sm icon" data-tool="settings" title="Settings">⚙</button>
      <button type="button" class="cl-btn sm icon" data-tool="title" title="Back to the title">⏏</button>
    </div>
  </header>
  <aside class="cl-build cl-panel" aria-label="Build">
    <button type="button" class="cl-buildtoggle" data-buildtoggle>Build ▾</button>
    <div class="cl-buildbody">
      <div class="cl-cats" role="tablist">${CATEGORIES.map((c, i) => `<button type="button" role="tab" data-cat="${c.key}" aria-selected="${i === 0}" style="--cc:${CAT_COLOR[c.key]}">${esc(c.name)}</button>`).join('')}</div>
      <div class="cl-cards" data-cards></div>
    </div>
  </aside>
  <aside class="cl-insp cl-panel" hidden aria-label="Inspector"><button type="button" class="cl-x" data-close="insp" title="Close (Esc)">×</button><div data-insp></div></aside>
  <div class="cl-ovl" role="group" aria-label="Overlay"><i>Overlay</i>${OVERLAYS.map(([k, n]) => `<button type="button" data-ovl="${k ?? ''}" aria-pressed="${k === null}">${n}</button>`).join('')}</div>
  <div class="cl-placing" hidden><span data-placing></span> <button type="button" class="cl-btn sm" data-cancel>Cancel</button></div>
  <div class="cl-log" data-log title="Colony log (click to expand)"></div>
  <div class="cl-tip" hidden></div>
  <div class="cl-toasts" aria-live="polite"></div>
  <div class="cl-pop cl-panel" data-pop="happy" hidden></div>
  <div class="cl-pop cl-panel" data-pop="market" hidden></div>
  <div class="cl-pop cl-panel" data-pop="settings" hidden></div>
  <div class="cl-modal" hidden><div class="cl-win cl-event" role="dialog" aria-modal="true" aria-labelledby="evTitle"></div></div>`;

  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const statEls = {};
  for (const el of $$('.cl-stat[data-g]')) statEls[el.dataset.g] = { el, v: el.querySelector('[data-v]'), c: el.querySelector('[data-c]'), d: el.querySelector('[data-d]') };
  const dayEl = $('[data-h=day]'), taxIn = $('[data-taxin]'), taxEl = $('[data-tax]');
  const cardsEl = $('[data-cards]'), insp = $('.cl-insp'), inspBody = $('[data-insp]'), tipEl = $('.cl-tip'), toasts = $('.cl-toasts');
  const logEl = $('[data-log]'), modal = $('.cl-modal'), evBox = $('.cl-event'), placingEl = $('.cl-placing');
  const pops = { happy: $('[data-pop=happy]'), market: $('[data-pop=market]'), settings: $('[data-pop=settings]') };
  let cat = CATEGORIES[0].key, cardSig = '', inspAt = null, inspSig = '', logSig = '', logOpen = false, evId = null, marketSig = '', happySig = '';
  let summary = null;

  const result = (r) => api.act(r);

  // ---------------------------------------------------------------- top bar
  $('.cl-speeds').addEventListener('click', (e) => { const b = e.target.closest('[data-speed]'); if (b) api.setSpeed(+b.dataset.speed); });
  taxIn.addEventListener('input', () => { taxEl.textContent = taxIn.value + '%'; });
  taxIn.addEventListener('change', () => result(R.setTax(S(), taxIn.value / 100)));
  $('.cl-happybtn').addEventListener('click', () => togglePop('happy'));
  $('.cl-tools').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tool]')?.dataset.tool;
    if (t === 'market') togglePop('market');
    else if (t === 'save') api.save();
    else if (t === 'settings') togglePop('settings');
    else if (t === 'title') api.toTitle();
  });

  function setSpeed(s) { for (const b of $$('[data-speed]')) b.setAttribute('aria-pressed', String(+b.dataset.speed === s)); }

  function stat(g, v, c, d, cls) {
    const e = statEls[g]; if (!e) return;
    if (e.v && e.v.textContent !== v) e.v.textContent = v;
    if (e.c && e.c.textContent !== c) e.c.textContent = c;
    if (e.d && e.d.textContent !== d) e.d.textContent = d;
    const k = 'cl-stat' + (cls ? ' ' + cls : '') + (g === 'happy' ? ' cl-happybtn' : '');
    if (e.el.className !== k) e.el.className = k;
  }

  function hud() {
    const s = S(), m = summary;
    dayEl.textContent = `Day ${s.day}`;
    for (const g of GOODS) {
      const st = m?.stock?.[g] || { have: s.stock?.[g] ?? 0 };
      const cap = st.cap != null && Number.isFinite(st.cap) ? `/${num(st.cap)}` : '';
      const d = st.delta ?? 0;
      const low = g !== 'credits' && g !== 'ore' && st.cap ? st.have < Math.max(20, st.cap * 0.1) : false;
      stat(g, num(st.have), cap, d ? signed(d) : '±0', (d > 0 ? 'up' : d < 0 ? 'down' : '') + (low ? ' low' : '') + (st.cap && st.have >= st.cap && g !== 'credits' ? ' full' : ''));
    }
    const p = m?.power || {};
    stat('power', num(p.supply ?? 0), `/${num(p.demand ?? 0)}`, p.cap ? `bat ${num(p.battery ?? 0)}/${num(p.cap)}` : '', (p.supply ?? 0) < (p.demand ?? 0) ? 'down' : 'up');
    const pop = m?.pop ?? s.pop, housing = m?.housing ?? s.housing;
    stat('pop', num(pop), `/${num(housing)}`, m?.nextArrival != null ? (typeof m.nextArrival === 'number' ? `ship in ${m.nextArrival}d` : String(m.nextArrival)) : '', pop > housing ? 'down' : '');
    const h = Math.round(m?.happy ?? s.happy);
    stat('happy', String(h), '', h >= 70 ? 'thriving' : h >= 55 ? 'content' : h >= 40 ? 'steady' : h >= 25 ? 'unrest' : 'protests', h >= 55 ? 'up' : h < 40 ? 'down' : '');
    if (document.activeElement !== taxIn) { const t = Math.round((s.tax ?? 0) * 100); if (+taxIn.value !== t) taxIn.value = t; taxEl.textContent = t + '%'; }
    setSpeed(s.speed);
  }

  // ---------------------------------------------------------------- build menu
  $('.cl-cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    cat = b.dataset.cat;
    for (const t of $$('[data-cat]')) t.setAttribute('aria-selected', String(t === b));
    cardSig = ''; buildMenu();
  });
  $('[data-buildtoggle]').addEventListener('click', () => $('.cl-build').classList.toggle('open'));
  cardsEl.addEventListener('click', (e) => {
    const c = e.target.closest('[data-key]'); if (!c || c.getAttribute('aria-disabled') === 'true') return;
    api.pick(c.dataset.key);
    if (matchMedia('(max-width: 760px)').matches) $('.cl-build').classList.remove('open');
  });

  function buildMenu() {
    const s = S();
    let list; try { list = R.buildable(s); } catch { list = []; }
    const by = Object.fromEntries((list || []).map((o) => [o.key, o]));
    const items = BUILDINGS.filter((b) => b.cat === cat && !b.fixed).map((b) => {
      const o = by[b.key] || { key: b.key, name: b.name, cost: b.cost, unlocked: !b.unlock, why: b.unlock ? `At ${b.unlock.pop} colonists` : '' };
      const cost = o.cost || b.cost;
      const poor = (cost.credits || 0) > (s.stock.credits || 0) || (cost.parts || 0) > (s.stock.parts || 0);
      return { b, o, cost, poor };
    });
    const sig = cat + '|' + items.map((i) => `${i.b.key}:${i.o.unlocked}:${i.o.why || ''}:${i.poor}`).join(',') + '|' + api.placingKey?.();
    if (sig === cardSig) return;
    cardSig = sig;
    const placing = api.placingKey?.();
    cardsEl.innerHTML = items.map(({ b, o, cost, poor }) => {
      const url = api.art?.(`card/${b.key}`);
      const locked = !o.unlocked;
      const why = locked ? (o.why || (b.unlock ? `At ${b.unlock.pop} colonists` : 'Locked')) : '';
      return `<button type="button" class="cl-card${locked ? ' locked' : ''}${placing === b.key ? ' on' : ''}" data-key="${b.key}" aria-disabled="${locked}" style="--cc:${CAT_COLOR[b.cat]}" title="${esc(b.text)}">
        <span class="cl-cardpic">${url ? `<img src="${esc(url)}" alt="" loading="lazy">` : cardIcon(b)}</span>
        <span class="cl-cardname">${esc(o.name || b.name)}</span>
        <span class="cl-cardcost${poor && !locked ? ' poor' : ''}">${costText(cost)}</span>
        <span class="cl-cardmeta">${b.size}×${b.size}${b.power ? ` · ${b.power > 0 ? '+' : ''}${b.power} MW` : ''}${b.jobs ? ` · ${b.jobs} jobs` : ''}${b.housing ? ` · ${b.housing} homes` : ''}</span>
        ${locked ? `<span class="cl-cardwhy">🔒 ${esc(why)}</span>` : `<span class="cl-cardtext">${esc(b.text)}</span>`}
      </button>`;
    }).join('') || '<p class="cl-dim">Nothing to build here yet.</p>';
  }

  // ---------------------------------------------------------------- inspector
  insp.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]'); if (!a || a.disabled) return;
    const s = S(), id = +a.dataset.id, v = a.dataset.v;
    switch (a.dataset.a) {
      case 'survey': case 'pressurise': result(R.chamberAction(s, id, a.dataset.a)); break;
      case 'mode': result(R.setMode(s, id, v)); break;
      case 'upgrade': result(R.upgrade(s, id)); break;
      case 'toggle': result(R.toggle(s, id)); break;
      case 'move': api.move(id); break;
      case 'demolish': {
        const b = s.buildings.find((x) => x.id === id);
        if (b && confirm(`Demolish this ${BUILDING[b.key]?.name || b.key}? Half its cost comes back.`)) { result(R.demolish(s, id)); }
        break;
      }
      case 'market': openPop('market'); break;
      case 'focus': api.focus(+a.dataset.x, +a.dataset.y); break;
    }
    inspSig = ''; refreshInspector();
  });
  $('[data-close=insp]').addEventListener('click', () => closeInspector());

  const chamberOf = (s, x, y, info) => {
    if (info?.chamber && typeof info.chamber === 'object') return info.chamber;
    const id = typeof info?.chamber === 'number' ? info.chamber : s.map.ch[y * s.map.w + x];
    if (id == null || id === 255) return null;
    return s.chambers.find((c) => c.id === id) || s.chambers[id] || null;
  };
  const buildingAt = (s, x, y, info) => {
    if (info?.building && typeof info.building === 'object') return info.building;
    if (typeof info?.building === 'number') return s.buildings.find((b) => b.id === info.building) || null;
    return s.buildings.find((b) => { const n = BUILDING[b.key]?.size || 1; return x >= b.x && x < b.x + n && y >= b.y && y < b.y + n; }) || null;
  };
  const terrainOf = (s, x, y, info) => {
    const t = info?.terrain;
    if (t && typeof t === 'object') return TERRAIN[t.id] || t;
    if (typeof t === 'number') return TERRAIN[t];
    if (typeof t === 'string') return TERRAIN.find((r) => r.key === t) || TERRAIN[s.map.t[y * s.map.w + x]];
    return TERRAIN[s.map.t[y * s.map.w + x]];
  };
  const artifactOf = (s, x, y, info) => {
    const a = info?.artifact;
    if (a && typeof a === 'object') return a.id ? ARTIFACT[a.id] || a : a.name ? a : null;
    const id = typeof a === 'number' ? a : s.map.r[y * s.map.w + x];
    return id ? ARTIFACT[id] : null;
  };
  // breaches sealed: a finished Bulkhead Seal stands on it, or the wall is no longer a breach
  const sealedCount = (s, c) => {
    if (typeof R.openBreaches === 'function') { try { return c.breaches.length - R.openBreaches(s, c).length; } catch { } }
    return (c.breaches || []).filter((i) => s.map.t[i] !== T.BREACH || s.buildings.some((b) => b.key === 'seal' && !b.build && b.y * s.map.w + b.x === i)).length;
  };

  function habitatNeeds(s, b) {
    const fn = R.habitatNeeds || api.sim?.habitatNeeds;
    if (typeof fn !== 'function') return null;
    try {
      let r = fn(s, b);
      if (r == null) r = fn(s, b.id);
      if (!r) return null;
      if (Array.isArray(r)) return r.map((n) => typeof n === 'string' ? { label: n, ok: false } : { label: n.label ?? n.text ?? n.name ?? n.key, ok: !!(n.ok ?? n.met ?? n.done) });
      if (Array.isArray(r.needs)) return r.needs.map((n) => typeof n === 'string' ? { label: n, ok: false } : { label: n.label ?? n.text ?? n.key, ok: !!(n.ok ?? n.met) });
      if (typeof r === 'object') return Object.entries(r).map(([k, v]) => ({ label: k, ok: !!v }));
    } catch { /* not this signature */ }
    return null;
  }

  function inspectorHtml(s, x, y) {
    let info = null; try { info = R.tileInfo(s, x, y); } catch { }
    const ter = terrainOf(s, x, y, info), art = artifactOf(s, x, y, info), ch = chamberOf(s, x, y, info), b = buildingAt(s, x, y, info);
    const parts = [];
    const hidden = ch && (ch.status === 'sealed' || ch.status === 'surveying');
    parts.push(`<header class="cl-ihead"><small>Tile ${x}, ${y}${info?.reach ? ' · in reach' : ''}</small>
      <h3>${esc(ter?.name || 'Unknown')}</h3><p>${esc(ter?.text || '')}</p>
      ${art && !hidden ? `<p class="cl-art">◆ <b>${esc(art.name)}</b> ${esc(art.text || '')}</p>` : ''}</header>`);
    if (ch) {
      const st = STATUS[ch.status] || [ch.status, ''];
      const total = (ch.breaches || []).length, sealed = sealedCount(s, ch);
      const surveyR = ch.status === 'sealed' ? dry(s, (c) => R.chamberAction(c, ch.id, 'survey')) : { ok: false, msg: ch.status === 'surveying' ? 'Survey under way.' : 'Already surveyed.' };
      const pressR = ch.status === 'surveyed' ? dry(s, (c) => R.chamberAction(c, ch.id, 'pressurise'))
        : { ok: false, msg: ch.status === 'open' ? 'Already open.' : ch.status === 'pressurising' ? 'Pressurising now.' : 'Survey it first.' };
      const air = Math.ceil((ch.tiles || 0) / 4);
      parts.push(`<section class="cl-isec"><h4>Chamber <span class="cl-badge st-${esc(ch.status)}">${esc(st[0])}</span></h4>
        <div class="cl-iname">${esc(ch.name || 'Chamber ' + ch.id)} <small>${esc(ch.kind || '')} · ${num(ch.tiles)} tiles</small></div>
        <p class="cl-dim">${esc(st[1])}${ch.work ? ` ${ch.work} day${ch.work === 1 ? '' : 's'} left.` : ''}</p>
        <div class="cl-kv"><span>Breaches</span><b class="${total && sealed < total ? 'bad' : 'good'}">${hidden ? '?' : `${sealed} / ${total} sealed`}</b></div>
        ${ch.status !== 'open' ? `<div class="cl-acts">
          <button type="button" class="cl-btn sm" data-a="survey" data-id="${ch.id}" ${surveyR.ok ? '' : 'disabled'} title="${esc(surveyR.ok ? 'Survey: 100 credits, 2 days' : surveyR.msg)}">Survey <small>100 cr · 2 d</small></button>
          <button type="button" class="cl-btn sm" data-a="pressurise" data-id="${ch.id}" ${pressR.ok ? '' : 'disabled'} title="${esc(pressR.ok ? `Pressurise: ${air} air, 5 days` : pressR.msg)}">Pressurise <small>${air} air · 5 d</small></button>
        </div>${!surveyR.ok && ch.status === 'sealed' ? `<p class="cl-why">${esc(surveyR.msg)}</p>` : ''}${!pressR.ok && ch.status === 'surveyed' ? `<p class="cl-why">${esc(pressR.msg)}</p>` : ''}` : ''}
      </section>`);
    }
    if (b) parts.push(buildingHtml(s, b));
    return parts.join('');
  }

  function buildingHtml(s, b) {
    const d = BUILDING[b.key] || { name: b.key, levels: null };
    const lv = d.levels?.[b.level - 1] || {}, next = d.levels?.[b.level];
    const m = summary || {};
    const staff = d.jobs ? (m.jobs ? Math.min(1, (m.workers ?? s.pop) / m.jobs) : 1) : null;
    const status = b.build > 0 ? `<span class="cl-badge st-surveying">Building · ${b.build} d</span>` : b.off ? '<span class="cl-badge st-sealed">Off</span>' : '<span class="cl-badge st-open">Working</span>';
    const power = lv.power ?? d.power, housing = lv.housing ?? d.housing;
    const rows = [];
    rows.push(`<div class="cl-kv"><span>Level</span><b>${b.level}${d.levels ? ` / ${d.levels.length}` : ''}${lv.name ? ` · ${esc(lv.name)}` : ''}</b></div>`);
    if (d.jobs) rows.push(`<div class="cl-kv"><span>Staffing</span><b class="${staff < 1 ? 'bad' : 'good'}">${d.jobs} jobs · ${Math.round(staff * 100)}%</b></div>`);
    if (power) rows.push(`<div class="cl-kv"><span>Power</span><b class="${power > 0 ? 'good' : ''}">${power > 0 ? '+' : ''}${power} MW</b></div>`);
    if (d.makes && Object.keys(d.makes).length) rows.push(`<div class="cl-kv"><span>Makes</span><b class="good">${flows(d.makes)} /day</b></div>`);
    if (d.uses && Object.keys(d.uses).length) rows.push(`<div class="cl-kv"><span>Uses</span><b>${flows(d.uses)} /day</b></div>`);
    if (housing) rows.push(`<div class="cl-kv"><span>Homes</span><b>${housing}</b></div>`);
    if (lv.crews) rows.push(`<div class="cl-kv"><span>Crews</span><b>${lv.crews}</b></div>`);
    if (d.storage) rows.push(`<div class="cl-kv"><span>Stores</span><b>${b.mode && d.modes ? `${Object.values(d.storage)[0]} ${GOOD_NAME[b.mode] || b.mode}` : flows(d.storage)}</b></div>`);
    if (d.radius) rows.push(`<div class="cl-kv"><span>Radius</span><b>${d.radius} tiles${d.park ? ` · park ${d.park}` : ''}</b></div>`);
    if (d.upkeep) rows.push(`<div class="cl-kv"><span>Upkeep</span><b>${d.upkeep} cr/day</b></div>`);
    const modes = d.modes ? `<div class="cl-modes" role="group" aria-label="Mode">${d.modes.map((mo, i) => {
      const on = (b.mode ?? d.modes[0].key) === mo.key || (!b.mode && i === 0);
      return `<button type="button" data-a="mode" data-id="${b.id}" data-v="${esc(mo.key)}" aria-pressed="${on}" title="${esc(mo.text || mo.name)}">${esc(mo.name)}</button>`;
    }).join('')}</div>${d.modes.find((mo) => mo.key === (b.mode ?? d.modes[0].key))?.text ? `<p class="cl-dim">${esc(d.modes.find((mo) => mo.key === (b.mode ?? d.modes[0].key)).text)}</p>` : ''}` : '';
    let needs = '';
    if (b.key === 'habitat') {
      const list = habitatNeeds(s, b);
      if (list && list.length) needs = `<div class="cl-needs"><h5>${next ? `Next level: ${esc(next.name || 'level ' + (b.level + 1))}` : 'Top level'}</h5><ul>${list.map((n) => `<li class="${n.ok ? 'ok' : 'no'}">${n.ok ? '✓' : '✗'} ${esc(n.label)}</li>`).join('')}</ul></div>`;
      else if (next?.needs) needs = `<div class="cl-needs"><h5>Next level: ${esc(next.name || '')}</h5><ul>${next.needs.map((n) => `<li class="no">• ${esc({ allNeeds: 'Food, water, air and power for everyone', park: 'A park in range', clinic: 'A clinic in range (later)' }[n] || n)}</li>`).join('')}</ul></div>`;
    }
    const acts = [];
    if (next?.cost) {
      const r = dry(s, (c) => R.upgrade(c, b.id));
      acts.push(`<button type="button" class="cl-btn sm" data-a="upgrade" data-id="${b.id}" ${r.ok ? '' : 'disabled'} title="${esc(r.ok ? 'Upgrade' : r.msg)}">Upgrade <small>${costText(next.cost)}</small></button>`);
    }
    if (!d.fixed) {
      acts.push(`<button type="button" class="cl-btn sm" data-a="move" data-id="${b.id}" title="Move it (20% of its cost)">Move</button>`);
      if (b.key !== 'seal') acts.push(`<button type="button" class="cl-btn sm" data-a="toggle" data-id="${b.id}">${b.off ? 'Switch on' : 'Switch off'}</button>`);
      acts.push(`<button type="button" class="cl-btn sm warn" data-a="demolish" data-id="${b.id}" title="Refunds half its cost">Demolish</button>`);
    }
    if (b.key === 'dock') acts.unshift(`<button type="button" class="cl-btn sm primary" data-a="market">Market</button>`);
    return `<section class="cl-isec"><h4>Building ${status}</h4>
      <div class="cl-ibuild"><span class="cl-ipic">${api.art?.(`card/${b.key}`) ? `<img src="${esc(api.art(`card/${b.key}`))}" alt="">` : cardIcon(d)}</span>
      <div><div class="cl-iname">${esc(d.name)}</div><p class="cl-dim">${esc(d.text || '')}</p></div></div>
      ${rows.join('')}${modes}${needs}
      ${!next && d.levels && b.key !== 'habitat' ? '<p class="cl-dim">Fully upgraded.</p>' : ''}
      <div class="cl-acts">${acts.join('')}</div></section>`;
  }

  function inspect(x, y) {
    inspAt = { x, y }; inspSig = ''; insp.hidden = false;
    refreshInspector();
  }
  function closeInspector() { inspAt = null; insp.hidden = true; }
  function refreshInspector() {
    if (!inspAt) return;
    const s = S();
    const i = inspAt.y * s.map.w + inspAt.x;
    const b = buildingAt(s, inspAt.x, inspAt.y, null), ch = chamberOf(s, inspAt.x, inspAt.y, null);
    const sig = JSON.stringify([s.map.t[i], b, ch && [ch.status, ch.work, sealedCount(s, ch)], Math.floor(s.stock.credits / 50), Math.floor(s.stock.parts / 5), Math.floor(s.stock.air / 10), summary?.jobs, summary?.workers, s.day % 5 === 0 ? s.day : 0]);
    if (sig === inspSig) return;
    inspSig = sig;
    inspBody.innerHTML = inspectorHtml(s, inspAt.x, inspAt.y);
  }

  // ---------------------------------------------------------------- overlays
  $('.cl-ovl').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ovl]'); if (!b) return;
    for (const o of $$('[data-ovl]')) o.setAttribute('aria-pressed', String(o === b));
    api.setOverlay(b.dataset.ovl || null);
  });

  // ---------------------------------------------------------------- pop-up panels
  function openPop(name) {
    for (const [k, p] of Object.entries(pops)) p.hidden = k !== name;
    if (name === 'happy') { happySig = ''; renderHappy(); }
    if (name === 'market') { marketSig = ''; renderMarket(); }
    if (name === 'settings') renderSettings();
  }
  function togglePop(name) { if (pops[name].hidden) openPop(name); else pops[name].hidden = true; }
  function closePops() { let any = false; for (const p of Object.values(pops)) { any ||= !p.hidden; p.hidden = true; } return any; }
  for (const p of Object.values(pops)) p.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) p.hidden = true; });

  function renderHappy() {
    if (pops.happy.hidden) return;
    const s = S();
    const partsList = summary?.happyParts || s.happyParts || [];
    const sig = JSON.stringify(partsList) + (summary?.happy ?? s.happy);
    if (sig === happySig) return;
    happySig = sig;
    const total = Math.round(summary?.happy ?? s.happy);
    pops.happy.innerHTML = `<button type="button" class="cl-x" data-close title="Close">×</button>
      <h3>Happiness <b class="cl-big">${total}</b></h3>
      <table class="cl-table"><tbody>${partsList.map((p) => `<tr><td>${esc(p.label)}</td><td class="n ${p.value > 0 ? 'good' : p.value < 0 ? 'bad' : ''}">${p.value > 0 ? '+' : ''}${num(p.value)}</td></tr>`).join('') || '<tr><td colspan="2" class="cl-dim">No breakdown yet: it appears after the first day.</td></tr>'}</tbody>
      <tfoot><tr><td>Total <small>(0–100)</small></td><td class="n">${total}</td></tr></tfoot></table>
      <p class="cl-dim">≥ 55 and free housing with a food surplus: a transport every 10 days. Below 25: colonists leave.</p>`;
  }

  pops.market.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sell],[data-guard]'); if (!b || b.disabled) return;
    const s = S();
    if (b.dataset.sell) {
      const g = b.dataset.sell, have = Math.floor(s.stock[g] || 0), q = b.dataset.q === 'all' ? have : Math.min(have, +b.dataset.q);
      if (q <= 0) { toast(`No ${GOOD_NAME[g].toLowerCase()} to sell.`, 'bad'); return; }
      result(R.sell(s, g, q));
    } else result(R.sellGuardian(s, +b.dataset.guard));
    marketSig = ''; renderMarket();
  });

  const unitName = (type) => api.types?.[type]?.name || `Machine ${type}`;
  const unitPrice = (type) => { const p = S().imported?.prices?.[type]; if (p != null) return p; const t = api.types?.[type]; return t ? Math.max(1, t.value) * t.hp : null; };
  function renderMarket() {
    if (pops.market.hidden) return;
    const s = S();
    const prices = SELLABLE.map((g) => { try { return R.price(s, g); } catch { return null; } });
    const sig = JSON.stringify([prices, SELLABLE.map((g) => Math.floor(s.stock[g] || 0)), (s.guardians || []).map((g) => g.id)]);
    if (sig === marketSig) return;
    marketSig = sig;
    const hasDock = s.buildings.some((b) => b.key === 'dock' && !b.build);
    const guards = s.guardians || [];
    pops.market.innerHTML = `<button type="button" class="cl-x" data-close title="Close">×</button>
      <h3>Market <small>wanderers' traders at the dock</small></h3>
      ${hasDock ? '' : '<p class="cl-why">No finished dock: the traders have nowhere to land.</p>'}
      <table class="cl-table cl-mkt"><thead><tr><th>Good</th><th class="n">Stock</th><th class="n">Price</th><th>Sell</th></tr></thead><tbody>
      ${SELLABLE.map((g, i) => { const have = Math.floor(s.stock[g] || 0), p = prices[i]; return `<tr><td>${GOOD_NAME[g]}</td><td class="n">${num(have)}</td><td class="n">${p == null ? '–' : (+p).toFixed(2)} <small>cr</small></td>
        <td class="cl-sellbtns">${[10, 100].map((q) => `<button type="button" class="cl-btn xs" data-sell="${g}" data-q="${q}" ${have < 1 ? 'disabled' : ''}>${q}</button>`).join('')}<button type="button" class="cl-btn xs" data-sell="${g}" data-q="all" ${have < 1 ? 'disabled' : ''} title="${p != null ? `≈ ${num(have * p)} cr` : ''}">All</button></td></tr>`; }).join('')}
      </tbody></table>
      <p class="cl-dim">Every 10 units sold lowers that price 2%; prices recover a little each day.</p>
      ${guards.length ? `<h4>Guardians <small>${guards.length} machines · the original army</small></h4>
      <div class="cl-guards">${guards.map((g) => { const p = unitPrice(g.type); return `<div class="cl-guard"><b>${esc(unitName(g.type))}</b><small>L${g.level ?? 0}</small>
        <span>${p != null ? `${num(p * 10)} cr · ${num(p)} parts` : ''}</span><button type="button" class="cl-btn xs" data-guard="${g.id}">Sell</button></div>`; }).join('')}</div>` : ''}`;
  }

  function renderSettings() {
    const st = api.settings;
    pops.settings.innerHTML = `<button type="button" class="cl-x" data-close title="Close">×</button>
      <h3>Settings</h3>
      <label class="cl-check"><input type="checkbox" data-set="pauseOnEvents" ${st.pauseOnEvents ? 'checked' : ''}><span></span>Pause on events <small>decisions stop the clock until answered</small></label>
      <label class="cl-check"><input type="checkbox" data-set="snap" ${st.snap ? 'checked' : ''}><span></span>Snap rotation to 90° <small>instead of free orbit</small></label>
      <p class="cl-dim">The colony autosaves every 10 days in this browser. Keys: space pause · 1 / 2 / 3 speed · R build again · Esc cancel.</p>`;
    for (const c of pops.settings.querySelectorAll('[data-set]')) c.onchange = () => api.setSetting(c.dataset.set, c.checked);
  }

  // ---------------------------------------------------------------- log, toasts, tip
  logEl.addEventListener('click', () => { logOpen = !logOpen; logEl.classList.toggle('open', logOpen); logSig = ''; renderLog(); });
  function renderLog() {
    const L = S().log || [];
    const sig = L.length + '|' + (L.at(-1)?.text || '') + logOpen;
    if (sig === logSig) return;
    logSig = sig;
    const lines = L.slice(logOpen ? -60 : -3).reverse();
    logEl.innerHTML = lines.map((l) => `<div><b>Day ${l.day}</b> ${esc(l.text)}</div>`).join('') || '<div class="cl-dim">The log is empty.</div>';
  }

  function toast(msg, kind = '') {
    if (!msg) return;
    const prev = toasts.lastElementChild;
    if (prev && prev.dataset.msg === msg && !prev.classList.contains('out')) {   // the same news again: count it
      prev.dataset.n = +(prev.dataset.n || 1) + 1; prev.textContent = `${msg} ×${prev.dataset.n}`;
      clearTimeout(prev._t); prev._t = setTimeout(() => { prev.classList.add('out'); setTimeout(() => prev.remove(), 400); }, 2400);
      return;
    }
    const t = document.createElement('div');
    t.className = 'cl-toast ' + kind; t.textContent = msg; t.dataset.msg = msg;
    toasts.append(t);
    while (toasts.children.length > 4) toasts.firstChild.remove();
    t._t = setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, kind === 'bad' ? 3200 : 2400);
  }

  function tip(html, cx, cy, ok) {
    if (html == null) { tipEl.hidden = true; return; }
    if (tipEl.innerHTML !== html) tipEl.innerHTML = html;
    tipEl.className = 'cl-tip ' + (ok ? 'ok' : 'no');
    tipEl.hidden = false;
    const r = root.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = cx - r.left + 16, y = cy - r.top + 18;
    if (x + w > r.width - 8) x = cx - r.left - w - 12;
    if (y + h > r.height - 8) y = cy - r.top - h - 12;
    tipEl.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
  }

  function setPlacing(key, moving) {
    placingEl.hidden = !key;
    if (key) $('[data-placing]').innerHTML = `${moving ? 'Moving' : 'Placing'} <b>${esc(BUILDING[key]?.name || key)}</b> · click to ${moving ? 'move' : 'build'} · right-click or Esc to cancel${moving ? '' : ' · R builds another'}`;
    cardSig = ''; buildMenu();
  }
  $('[data-cancel]').addEventListener('click', () => api.pick(null));

  // ---------------------------------------------------------------- pending events
  function renderEvent() {
    const s = S(), p = s.pending?.[0];
    if (!p) { if (!modal.hidden) { modal.hidden = true; evId = null; } return; }
    if (evId === p.id && !modal.hidden) return;
    evId = p.id;
    const portrait = p.speaker && api.art?.(`portrait/${p.speaker}`);
    modal.classList.toggle('soft', !api.settings.pauseOnEvents);
    evBox.innerHTML = `<div class="cl-evkind">${esc(p.kind || 'Event')} · Day ${s.day}${s.pending.length > 1 ? ` · ${s.pending.length - 1} more waiting` : ''}</div>
      <div class="cl-evbody">${portrait ? `<img class="cl-portrait" src="${esc(portrait)}" alt="">` : ''}
      <div><h2 id="evTitle">${esc(p.title)}</h2><p>${esc(p.text)}</p></div></div>
      <div class="cl-evchoices">${(p.choices?.length ? p.choices : [{ key: 'ok', label: 'Understood' }]).map((c, i) => `<button type="button" class="cl-btn${i === 0 ? ' primary' : ''}" data-choice="${esc(c.key)}">${esc(c.label)}</button>`).join('')}</div>
      ${api.settings.pauseOnEvents ? '<p class="cl-dim cl-evpause">❚❚ The clock waits for your answer.</p>' : ''}`;
    modal.hidden = false;
    evBox.querySelector('[data-choice]')?.focus({ preventScroll: true });
  }
  evBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-choice]'); if (!b) return;
    const p = S().pending?.[0]; if (!p) return;
    evId = null; modal.hidden = true;
    result(R.answer(S(), p.id, b.dataset.choice));
  });

  // ---------------------------------------------------------------- update
  function update(force) {
    const s = S();
    try { summary = R.summary(s); } catch (e) { summary = null; console.warn('summary failed', e); }
    if (force) { cardSig = ''; inspSig = ''; marketSig = ''; happySig = ''; logSig = ''; }
    hud();
    buildMenu();
    refreshInspector();
    renderHappy();
    renderMarket();
    renderLog();
    renderEvent();
  }

  return {
    update, inspect, closeInspector, toast, tip, setPlacing, setSpeed, closePops,
    openMarket: () => openPop('market'),
    eventOpen: () => !modal.hidden,
    inspecting: () => inspAt,
    destroy() { root.innerHTML = ''; },
  };
}
