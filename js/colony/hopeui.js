// Earthlight Space Colony Rebuild, version 13 (docs/COLONY-V13.md): the Hope's interface, kept out of ui.js except for
// a few hooks. Plain DOM, no framework. ui.js calls:
//   hopeCards(s, R, { art, esc, placing, icon })     the build menu on the Earth deck (the Hope's own buildings only)
//   hopeInspector(s, x, y, R, esc)                   the inspector on the Earth deck (a tile, a building, the Landing Field)
//   mountHope(root, { S, R, act, esc, setDeck })      the Ark panel (a small window): { update(), open(), close(), toggle() }
//   HOPE_HELP                                        the How to play section's body
import { HOPE_BUILDINGS, HOPE_BUILDING } from './data/hope.js';

const n0 = (v) => Math.round(v || 0).toLocaleString('en-US');
const pct = (v) => `${Math.round((v || 0) * 1000) / 10}%`;
const GOODS = ['food', 'water', 'air', 'parts', 'alloy'];
const ICON = { food: '🌾', water: '💧', air: '🫧', parts: '⚙', alloy: '▤' };
const ARK_AT = { eden: 'In her dock at Eden', out: 'On the way down to Earth', earth: 'On the Hope\'s landing field', back: 'On the way home to Eden' };
const costText = (c) => [c.credits ? `${n0(c.credits)} cr` : '', c.parts ? `${n0(c.parts)} parts` : '', c.alloy ? `${n0(c.alloy)} alloy` : ''].filter(Boolean).join(' · ');

export function hopeCards(s, R, { art, esc, placing, icon }) {
  if (!R.hopeOn?.(s)) return '<p class="cl-dim">Earth is out of reach until the Ark is complete.</p>';
  return `<p class="cl-dim cl-hopehint">The Hope's own buildings. Credits come from Eden; <b>parts and alloy from the Hope's stores</b> (send them with the Ark).</p>` + HOPE_BUILDINGS.filter((b) => !b.fixed).map((b) => {
    const c = R.hopeCost(b.key), h = s.hope;
    const poor = c.credits > (s.stock.credits || 0) || c.parts > (h.stock.parts || 0) || c.alloy > (h.stock.alloy || 0);
    const seeds = b.needsSeeds && !h.buildings.some((x) => x.key === 'seedbank' && x.build === 0);
    const url = art?.(`card/${b.key}`);
    return `<button type="button" class="cl-card${seeds ? ' locked' : ''}${placing === b.key ? ' on' : ''}" data-key="${b.key}" aria-disabled="${seeds}" style="--cc:#c8b46a" title="${esc(b.text)}">
      <span class="cl-cardpic">${url ? `<img src="${esc(url)}" alt="" loading="lazy">` : icon(b)}</span>
      <span class="cl-cardname">${esc(b.name)}</span>
      <span class="cl-cardcost${poor ? ' poor' : ''}">${costText(c)}</span>
      <span class="cl-cardmeta">${b.size}×${b.size}${b.jobs ? ` · ${b.jobs} jobs` : ''}${b.housing ? ` · ${b.housing} homes` : ''}${b.radius ? ` · radius ${b.radius}` : ''}</span>
      ${seeds ? '<span class="cl-cardwhy">🔒 Needs a Seed Bank</span>' : `<span class="cl-cardtext">${esc(b.text)}</span>`}
    </button>`;
  }).join('');
}

function statusHtml(st, esc) {
  return `<div class="cl-hopebar" title="Earth recovery: recovered tiles (plain, fertile, forest, clean sea, the landing field) of the whole Hope">
      <span>Earth recovery <b>${pct(st.recovery)}</b> <small>goal ${pct(st.goal.recovery)}</small></span>
      <i><b style="width:${Math.min(100, (st.recovery / st.goal.recovery) * 100)}%"></b></i></div>
    <p class="cl-hoperow"><span>Colonists on Earth <b>${n0(st.pop)}</b> / ${n0(st.housing)} homes <small>goal ${n0(st.goal.pop)}</small></span>${st.short ? ' <b class="bad">short of supplies!</b>' : ''}</p>
    <p class="cl-hopegoods">${GOODS.map((g) => `<span title="${g} on Earth (store ${n0(st.cap[g])})">${ICON[g]} ${n0(st.stock[g])}</span>`).join('')}</p>`;
}

export function hopeInspector(s, x, y, R, esc) {
  const info = R.tileInfo(s, x, y, 'earth');
  if (!info) return '';
  const st = R.hopeStatus(s), b = info.building, ter = info.terrain;
  const parts = [`<header class="cl-ihead"><small>Tile ${x}, ${y} · <span class="cl-ideck" data-deck="earth">The Hope, Earth</span></small>
    <h3>${esc(ter?.name || 'Unknown')}</h3><p>${esc(ter?.text || '')}</p>
    ${info.harmful ? '<p class="bad">Harmful: no home or field within reach of it.</p>' : info.recovered ? '<p class="good">Recovered ground: counts toward Earth\'s recovery.</p>' : ''}</header>`];
  if (b) {
    const d = HOPE_BUILDING[b.key];
    parts.push(`<section class="cl-isec"><h4>${esc(d.name)}${b.build > 0 ? ` <small>building: ${b.build} days left</small>` : b.off ? ' <small>switched off</small>' : ''}</h4><p class="cl-dim">${esc(d.text)}</p>
      ${d.treats ? `<p class="cl-dim">Treats: ${d.treats.map((t) => `${t.from.join(', ')} → ${t.to} (${t.rate}/day)`).join('; ')} within ${d.radius} tiles.</p>` : ''}
      ${!d.fixed ? `<div class="cl-iacts"><button type="button" class="cl-btn sm" data-hope-toggle="${b.id}">${b.off ? 'Switch on' : 'Switch off'}</button> <button type="button" class="cl-btn sm" data-hope-move="${b.id}">Move</button> <button type="button" class="cl-btn sm" data-hope-demolish="${b.id}">Take down</button></div>` : ''}
      ${b.key === 'landingfield' ? `<div class="cl-iacts"><button type="button" class="cl-btn primary sm" data-hope-ark>Ark panel ›</button></div>` : ''}</section>`);
  }
  parts.push(`<section class="cl-isec cl-hopeinsp">${statusHtml(st, esc)}<p class="cl-dim">The Ark: ${esc(ARK_AT[st.ark.at])}${st.ark.days ? ` (${st.ark.days} days)` : ''}.</p></section>`);
  return parts.join('');
}

export const HOPE_HELP = `
    <p>When the <b>Ark</b> is complete (Beyond Eden), Eden can reach the ground. A new deck opens: <b>The Hope</b>, a stretch of poisoned Earth below. Earth's conditions are so bad that nobody can live there unless Eden invests huge resources.</p>
    <ul>
      <li><b>The ground</b>: dead ground (buildable), city ruins, <b>toxic gas</b> and <b>radiation zones</b> (harmful: no home within 2 tiles, no field within 3), flooded lowland and a <b>poisoned sea</b> along one side. A cleared <b>landing field</b> to start.</li>
      <li><b>The Ark comes and goes</b>: open the <b>Ark panel</b> (the Ark button beside the deck switcher, or the Landing Field), choose colonists (up to 80) and goods (up to 2,000 units of food, water, air, parts and alloy) and launch. Six days down (five on Easy), two on the field, six back. <b>Auto</b> sends her again whenever she is home. People reach Earth only by the Ark; anyone with no home there stays aboard and comes back.</li>
      <li>A working <b>Mass Driver</b> (500) or <b>Orbital Elevator</b> (800) also sends goods down, every four days.</li>
      <li>The Hope has its <b>own colonists, needs and stores</b>: each colonist needs food, water and air every day; short, and people are lost.</li>
      <li><b>Earth buildings</b> (Hope deck build menu; credits from Eden, <b>parts and alloy from the Hope's stores</b>): Sealed Dome (40 homes, the only place to live), Air Scrubber Tower (clears toxic gas), Decontamination Plant (radiation), Soil Reactor (ruins and dead ground → plain soil), Sea Purifier (water; cleans the sea near the shore), Ocean Platform (built on cleaned sea: cleans the open sea further out, leapfrogging), Ruin Breaker (tears down city ruins fast, for parts), Tide Wall (drains flooded lowland), Seed Bank (plain → fertile), First Fields (food on recovered soil), Reforestation Station (fertile → forest).</li>
      <li>Treated ground recovers step by step: <b>toxic, radiation, flooded, ruins → dead ground → plain → fertile → forest</b>; the poisoned sea → clean sea. The <b>Earth recovery</b> percent is the share of recovered tiles.</li>
      <li><b>Earthlight</b>, the ending: half the Hope recovered and 500 colonists living on Earth (300 on Easy). It is kept in your save and never blocks the other endings.</li>
    </ul>`;

// ---------------------------------------------------------------- the Ark panel
export function mountHope(root, { S, R, act, esc, setDeck, move }) {
  const win = document.createElement('section');
  win.className = 'cl-win cl-hopewin'; win.hidden = true; win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', 'The Ark and the Hope');
  root.appendChild(win);
  let sig = '', draft = null;
  const close = () => { win.hidden = true; sig = ''; };
  const open = () => { if (!R.hopeOn?.(S())) return false; win.hidden = false; sig = ''; update(); return true; };
  function update() {
    if (win.hidden) return;
    const s = S();
    if (!R.hopeOn?.(s)) { close(); return; }
    const st = R.hopeStatus(s), a = st.ark;
    draft ??= { ...a.manifest };
    const k = JSON.stringify([s.day, st.pop, st.stock, a.at, a.days, a.auto, a.trips, st.drop?.ready, Math.round(st.recovery * 1000), st.short]);
    if (k === sig && win.contains(document.activeElement)) return;
    sig = k;
    const load = GOODS.reduce((t, g) => t + (+draft[g] || 0), 0);
    const home = a.at === 'eden';
    win.innerHTML = `<header class="cl-rhead"><div class="cl-rtitle"><h3>The Ark &amp; the Hope</h3><small>Earth · trip ${a.tripDays} days each way</small></div>
        <button type="button" class="cl-x" data-hclose title="Close (Esc)" aria-label="Close">×</button></header>
      <div class="cl-hopebody">
        ${statusHtml(st, esc)}
        <p class="cl-hoperow"><span>The Ark: <b>${esc(ARK_AT[a.at])}</b>${a.days ? ` · ${a.days} days` : ''}</span> <small>${a.trips} trips</small></p>
        ${a.load ? `<p class="cl-dim">Aboard: ${n0(a.load.pop)} colonists, ${n0(a.loadNow)} goods.</p>` : ''}
        <fieldset class="cl-hopeman"${home ? '' : ' disabled'}><legend>Manifest <small>${n0(load)} / ${n0(a.capacity.cargo)} goods</small></legend>
          <label><span>👤 Colonists <small>Eden ${n0(s.pop)}</small></span><input type="number" min="0" max="${a.capacity.pop}" step="10" data-man="pop" value="${+draft.pop || 0}"></label>
          ${GOODS.map((g) => `<label><span>${ICON[g]} ${g[0].toUpperCase() + g.slice(1)} <small>Eden ${n0(s.stock[g])}</small></span><input type="number" min="0" max="${a.capacity.cargo}" step="100" data-man="${g}" value="${+draft[g] || 0}"></label>`).join('')}
        </fieldset>
        ${load > a.capacity.cargo ? `<p class="bad">Over capacity by ${n0(load - a.capacity.cargo)}.</p>` : ''}
        <div class="cl-iacts"><button type="button" class="cl-btn primary" data-hlaunch${home && load <= a.capacity.cargo ? '' : ' disabled'}>Launch the Ark</button>
          <label class="cl-hopeauto"><input type="checkbox" data-hauto${a.auto ? ' checked' : ''}> Auto (sail again whenever she is home)</label></div>
        ${st.drop ? `<div class="cl-hopedrop"><h4>${esc(st.drop.name)} <small>${st.drop.cap} a shot${st.drop.ready ? '' : ` · ready day ${st.drop.readyDay}`}</small></h4>
          <div class="cl-iacts">${GOODS.map((g) => `<button type="button" class="cl-btn xs" data-hdrop="${g}"${st.drop.ready ? '' : ' disabled'}>${ICON[g]} ${g}</button>`).join('')}</div></div>`
          : '<p class="cl-dim">A Mass Driver or the Orbital Elevator could send goods down between trips.</p>'}
        <div class="cl-iacts"><button type="button" class="cl-btn sm" data-hgo>Go to the Hope ›</button></div>
        <details class="cl-hopems"><summary>Milestones</summary><ul>${st.milestones.map((m) => `<li class="${m.day != null ? 'ok' : 'no'}">${m.day != null ? '✓' : '·'} ${esc(m.title)}${m.day != null ? ` <small>day ${m.day}</small>` : ''}</li>`).join('')}
          <li class="${st.earthlight ? 'ok' : 'no'}">${st.earthlight ? '✓' : '·'} <b>Earthlight</b> <small>${pct(st.goal.recovery)} recovered and ${n0(st.goal.pop)} on Earth</small></li></ul></details>
      </div>`;
  }
  win.addEventListener('input', (e) => {
    const i = e.target.closest('[data-man]'); if (!i) return;
    draft ??= {}; draft[i.dataset.man] = Math.max(0, Math.floor(+i.value || 0));
    R.setManifest(S(), { ...S().hope.ark.manifest, ...draft });
  });
  win.addEventListener('change', (e) => { if (e.target.matches('[data-man]')) { sig = ''; update(); } });
  win.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-hclose]')) return close();
    if (t.closest('[data-hlaunch]')) { act(R.launchArk(S(), draft)); draft = null; sig = ''; return update(); }
    if (t.closest('[data-hauto]')) { act(R.setArkAuto(S(), t.closest('[data-hauto]').checked)); return; }
    const d = t.closest('[data-hdrop]');
    if (d) { const s = S(), st = R.hopeStatus(s); act(R.sendDown(s, d.dataset.hdrop, st.drop?.cap || 0)); sig = ''; return update(); }
    if (t.closest('[data-hgo]')) { setDeck('earth'); return; }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !win.hidden) close(); });
  // the inspector's Earth buttons (delegated: the inspector is rebuilt often)
  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-hope-ark]')) { open(); return; }
    const tg = t.closest('[data-hope-toggle]'); if (tg) { act(R.hopeToggle(S(), +tg.dataset.hopeToggle)); return; }
    const mv = t.closest('[data-hope-move]'); if (mv) { move?.(+mv.dataset.hopeMove); return; }
    const dm = t.closest('[data-hope-demolish]'); if (dm) { act(R.hopeDemolish(S(), +dm.dataset.hopeDemolish)); }
  });
  return { update, open, close, toggle: () => (win.hidden ? open() : close()), get open_() { return !win.hidden; } };
}
