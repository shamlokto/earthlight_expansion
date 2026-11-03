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
//   ui.openBuild(key)         the build menu on that building's category (opened on phones)
//   ui.welcomeDone(offerHelp) first run: the goals panel opened, "Show me" pulsed, How to play offered
//   ui.openResearch(techKey)  the Research panel (version 2), scrolled to and flashing that tech
//   ui.toggleResearch()       key T
//   ui.openDefence(tab)       the Defence panel (version 3): 'guardians' | 'production' | 'commanders' | 'raids'
//   ui.toggleDefence()        key G
//
// api: { state(), rules, sim, art(slot) → url|null, types (expansion units by type, or null),
//        act(result) → result, pick(key), move(id), setSpeed(s), setOverlay(name|null), save(),
//        toTitle(), focus(x, y), settings: { pauseOnEvents, snap }, setSetting(key, value),
//        goals (js/colony/goals.js or null), diff(state) → difficulty row or null,
//        show(show) performs a goal's or the advisor's "Show me", help() opens How to play,
//        answered(pending, choiceKey) after an event is answered, openResearch(techKey) }
import { CATEGORIES, BUILDINGS, BUILDING, NEEDS, CHAMBER_AIR_PER_100 } from './data/buildings.js';
import { TERRAIN, ARTIFACT, T } from './data/terrain.js';
import { BRANCHES, TECHS, TECH } from './data/tech.js';
import { MACHINES, MACHINE, MACHINE_COST } from './data/machines.js';
import { CLASSES, CLASS_NAME, STYLES, PERKS, DEPARTMENTS, COMMANDER, GENERAL, BASE_COMMANDERS, PER_QUARTERS } from './data/commanders.js';

// The expansion's SVG busts (story characters) for commanders without a painted portrait; loaded
// lazily so the colony still runs if the expansion's files are missing.
let svgPortrait = null;
import('../expansion/portraits.js').then((m) => { svgPortrait = m.portrait; }).catch(() => { });

const GOODS = ['food', 'water', 'air', 'parts', 'ore', 'alloy', 'helium', 'credits'];
const GOOD_NAME = { food: 'Food', water: 'Water', air: 'Air', parts: 'Parts', ore: 'Ore', alloy: 'Alloy', helium: 'Helium-3', credits: 'Credits', power: 'Power', research: 'Research' };
// Version 2 goods: in the top bar and the market only once the colony has any, or the tech that makes them is done.
const LATE = { alloy: 'smelting', helium: 'plasma' };
const SELLABLE = ['ore', 'food', 'parts', 'alloy', 'helium'];
const CAT_COLOR = { core: '#f5c542', power: '#6fd3ff', life: '#5aa8ff', food: '#8fe38a', industry: '#ff9a52', homes: '#ff8fd8', services: '#c3a6ff', defence: '#ff6b6b' };
const BRANCH_COLOR = { life: '#5aa8ff', industry: '#ff9a52', society: '#ff8fd8', logistics: '#f5c542', defence: '#ff6b6b' };
// Version 3 (docs/COLONY-V3.md): machine classes, the Defence panel's tabs, raid words.
const CLASS_COLOR = { hu: '#6fd3ff', planes: '#c3a6ff', armour: '#ff9a52', ships: '#f5c542', support: '#8fe38a' };
const CAT_CLASS = { 1: 'ships', 2: 'ships', 3: 'ships', 4: 'ships', 8: 'hu', 9: 'planes', 10: 'planes', 11: 'armour', 12: 'armour', 13: 'support', 14: 'support', 15: 'support' };
const DEF_TABS = [['guardians', 'Guardians'], ['production', 'Production'], ['commanders', 'Commanders'], ['raids', 'Raids']];
const FROM_TEXT = { north: 'the north edge of Eden', south: 'the south edge of Eden', east: 'the east edge of Eden', west: 'the west edge of Eden', earth: 'up from the atmosphere, Earth side' };
const FACTION_NAME = { scavengers: 'Scavengers', scavenger: 'Scavengers', cartel: 'The Ashfall Cartel', ashfall: 'The Ashfall Cartel', pirates: 'The Ashfall Cartel',
  union: 'Union deserters', galt: 'Galt deserters', deserters: 'Deserters', remnant: 'The Directorate remnant', directorate: 'The Directorate remnant' };
const RAID_TIER = { 1: 'scavengers', 2: 'pirates', 3: 'a warband', 4: 'a remnant fleet' };
const WEAPON_MODE = ['Beam', 'Railgun', 'Missile'];
// The tech that unlocks each machine tier (data/tech.js effects { kind: 'machines', tier }).
const TIER_TECH = Object.fromEntries(TECHS.flatMap((t) => (t.effects || []).filter((e) => e.kind === 'machines').map((e) => [e.tier, t.key])));
const GRADE_ORDER = 'SABCD';
// The happiness the tax costs or gives (rules: 0% +8, 10% 0, 20% −14, 30% −32, interpolated).
const taxHappy = (t) => { const P = [[0, 8], [10, 0], [20, -14], [30, -32]]; for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const [a, va] = P[i - 1], [b, vb] = P[i]; return va + (vb - va) * (t - a) / (b - a); } return -32; };
const STATUS = {
  sealed: ['Sealed', 'Airless and unknown. Survey it from an open neighbour.'],
  surveying: ['Surveying', 'Ruess\'s team is mapping it.'],
  surveyed: ['Surveyed', 'Seal every breach, then pressurise it.'],
  pressurising: ['Pressurising', 'Filling it with air.'],
  open: ['Open', 'Pressurised: build inside.'],
};
const OVERLAYS = [[null, 'None'], ['reach', 'Reach'], ['park', 'Parks'], ['power', 'Power']];
const KIND_LABEL = { goal: 'Goal complete', welcome: 'Landfall', transport: 'Transport', chamber: 'Chamber', unlock: 'Milestone', lost: 'Colony lost', tech: 'Research complete',
  raid: 'Raid', raidwarn: 'Raid warning', wanderer: 'Wanderer', raidreport: 'After the raid', report: 'After the raid', commander: 'Commanders', machine: 'Arsenal' };
const SPEAKER = { ruess: 'Prof. Ruess', sato: 'Capt. Sato' };
const UI_KEY = 'el-colony-ui';   // per-viewer panel state (collapsed or not)
const loadUI = () => { try { return JSON.parse(localStorage.getItem(UI_KEY) || '{}') || {}; } catch { return {}; } };
const storeUI = (o) => { try { localStorage.setItem(UI_KEY, JSON.stringify(o)); } catch { } };

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

// ---------------------------------------------------------------- How to play
// The help dialog's sections (colony.html #dHelp). Short sentences, pictures from the card art.
// diff: the difficulty row (js/colony/difficulty.js) the numbers are quoted for, or null.
export const HELP_SECTIONS = [['goal', 'The goal'], ['time', 'Time'], ['build', 'Building'], ['res', 'Resources'], ['chambers', 'Chambers'],
  ['homes', 'Homes & happiness'], ['roads', 'Roads'], ['market', 'Market & guardians'], ['research', 'Research'], ['defence', 'Defence and raids'], ['commanders', 'Commanders'], ['nav', 'Trackpad & keys'], ['tips', 'First 10 days']];
export function helpHtml(art, diff) {
  const pic = (slot, alt = '') => { const u = art?.(slot); return u ? `<img src="${esc(u)}" alt="${esc(alt)}" loading="lazy">` : ''; };
  const card = (key) => { const u = art?.(`card/${key}`); return `<figure class="cl-hfig">${u ? `<img src="${esc(u)}" alt="" loading="lazy">` : cardIcon(BUILDING[key])}<figcaption>${esc(BUILDING[key]?.name || key)}</figcaption></figure>`; };
  const every = diff?.transportEvery ?? 7, happy = diff?.transportHappy ?? 45, name = diff?.name ?? 'Easy';
  const sec = (id, title, figs, body) => `<section class="cl-hsec" id="help-${id}"><h3>${esc(title)}</h3><div class="cl-hrow">${figs ? `<div class="cl-hfigs">${figs}</div>` : ''}<div class="cl-htext">${body}</div></div></section>`;
  return `<nav class="cl-hnav" aria-label="Sections">${HELP_SECTIONS.map(([id, t]) => `<a href="#help-${id}" data-help="${id}">${esc(t)}</a>`).join('')}</nav>
  <div class="cl-hbody" data-hbody>
  ${sec('goal', 'The goal', `<figure class="cl-hfig portrait">${pic('portrait/ruess', 'Prof. Hal Ruess')}<figcaption>Prof. Ruess</figcaption></figure>`, `
    <p>You are the Governor of <b>Eden</b>, a broken space colony above a poisoned Earth.</p>
    <p>Most of Eden is dark and airless. Your job: <b>open its chambers one by one</b> and <b>grow the colony</b>.</p>
    <p>The <b>goal panel</b> (under the top bar) always says what to do next. Press <b>Show me</b> and it takes you there. Each goal done pays a <b>Council grant</b> of credits and parts.</p>
    <p>The <b>advisor</b> warns you when something is going wrong. Press <b>Fix</b> to jump to the answer.</p>`)}
  ${sec('time', 'Time', '', `
    <p>One <b>day</b> passes every second. The buttons at the top are <b>pause</b>, <b>×1</b>, <b>×2</b> and <b>×4</b>. Keys: space, 1, 2, 3.</p>
    <p>When something needs your answer (a ship, a finished goal, a new chamber), <b>the clock stops</b> until you answer.</p>
    <p>Pause any time to plan. Nothing is lost while paused.</p>`)}
  ${sec('build', 'Building', card('farm') + card('repairyard'), `
    <p>Pick a card in the <b>build menu</b> (left). Move over the map: a <b class="cl-good">green</b> ghost means you can build there. A <b class="cl-bad">red</b> ghost means you can't: <b>read the reason</b> next to the pointer.</p>
    <p>Click to order it. Right-click or Esc cancels. Hold Shift to place several. R builds the same again.</p>
    <p><b>Crews</b> put buildings up. Each crew builds one thing at a time; the rest wait in line. You start with 2 crews. Each <b>Repair Yard</b> adds more.</p>
    <p>Click any building to see what it makes and uses, to upgrade, move or switch it off.</p>`)}
  ${sec('res', 'Resources', card('riverpump') + card('airplant'), `
    <p>The top bar shows each good: <b>stock / cap</b> and the <b>change per day</b>. Hover a number to see why it moves.</p>
    <table class="cl-table cl-htable"><thead><tr><th>Good</th><th>Made by</th><th>Used by</th></tr></thead><tbody>
      <tr><td>Food</td><td>Farm Fields (best on fertile soil by the river), Hydroponics Bays</td><td>Every colonist eats</td></tr>
      <tr><td>Water</td><td>River Pumps (beside the river), the Command Centre</td><td>Colonists, farms, Air Plants, parks</td></tr>
      <tr><td>Air</td><td>The Command Centre, Air Plants, Forest Groves</td><td>Colonists; open chambers leak a little</td></tr>
      <tr><td>Power</td><td>The Command Centre, Solar Arrays (hull or space)</td><td>Most buildings. Short power slows them all</td></tr>
      <tr><td>Parts</td><td>The Command Centre (a few), Salvage Yards, goal grants</td><td>Building</td></tr>
      <tr><td>Credits</td><td>Tax, cash crops, selling at the Market, goal grants</td><td>Building and daily upkeep</td></tr>
      <tr><td>Ore</td><td>Ore Mines on asteroids</td><td>Sell it at the Market; Smelters (research)</td></tr>
      <tr><td>Alloy</td><td>Smelters (20 ore → 10 alloy)</td><td>Fabricators; sells well</td></tr>
      <tr><td>Helium-3</td><td>Plasma Skimmers on plasma clouds</td><td>Earth's most precious cargo: sell it</td></tr>
    </tbody></table>
    <p><b>Stores have a cap</b> (the number after the slash). Anything above it is lost. A <b>Storage Depot</b> holds 300 more of one good. Power is never stored, except in Battery Banks.</p>`)}
  ${sec('chambers', 'Chambers', card('seal'), `
    <p>Eden is split into chambers. Only yours is open at the start. To open the next one:</p>
    <ol class="cl-hsteps">
      <li><b>Survey</b>: click a dark chamber next to an open one and press Survey (2 days; Survey Drones research makes it 1).</li>
      <li><b>Seal</b>: the <b class="cl-bad">red tiles</b> in its walls are breaches. Build a <b>Bulkhead Seal</b> on each one (Water &amp; air menu).</li>
      <li><b>Pressurise</b>: press Pressurise. It uses air from your stores (a quarter of the floor tiles, a fifth on Easy) and takes 5 days.</li>
      <li><b>Build</b>: the chamber is open. Build anything inside it.</li>
    </ol>`)}
  ${sec('homes', 'Homes & happiness', card('habitat') + card('park'), `
    <p><b>Habitats</b> house 20 colonists. They <b>grow by themselves</b> into Quarters (40) when food, water, air and power are enough for everyone and a <b>park or grove</b> is nearby.</p>
    <p><b>Happiness</b> (top bar, click it for the breakdown) starts at 50. Needs met add, shortages take a lot away. Parks add. High tax takes away.</p>
    <p>On ${esc(name)}, a <b>transport</b> calls every <b>${every} days</b>. It brings new colonists if happiness is at least <b>${happy}</b>, there are <b>free homes</b>, and food, water and air are not short.</p>
    <p><b>Tax</b> (top bar slider) pays upkeep. 10% is neutral. Lower makes people happier; higher makes them unhappy.</p>`)}
  ${sec('roads', 'Roads', '', `
    <p>Colonists walk and rovers drive <b>only on roads</b>. Without roads your colony still works, but nobody moves.</p>
    <p>Choose <b>Road</b> (Command menu). <b>Click where it starts</b>, then <b>click where it ends</b>: it lays an L-shaped line. Roads pass through gates once both chambers are open.</p>`)}
  ${sec('market', 'Market & guardians', card('dock'), `
    <p>Traders land at the <b>Dock</b>. Open the <b>Market</b> (top bar) to sell <b>ore, food and parts</b> (later <b>alloy</b> and <b>helium-3</b>) for credits. Each sale lowers the price a little; it recovers over a few days. Sell in batches.</p>
    <p><b>Guardians</b> are Eden's machines: built at an Arsenal, or, for <b>beta testers</b>, your old army. They eat nothing. Sell one at the Market for credits and parts (a fifth more with a <b>Scrapyard</b>), or keep it to fight raiders.</p>`)}
  ${sec('research', 'Research and new buildings', card('lab') + card('clinic'), `
    <p>At <b>80 colonists</b> you can build a <b>Research Lab</b> (Services menu). Labs make <b>research points</b> every day; more staff, power and lab levels make more.</p>
    <p>Open <b>Research</b> (top bar, or key <b>T</b>). The tech tree has five branches: <b>Life Support</b>, <b>Industry</b>, <b>Society</b>, <b>Logistics</b> and <b>Defence</b>. Click a tech you can study: the labs' points flow into it. Points made while nothing is chosen are <b>banked</b> and flow into the next choice.</p>
    <p>A finished tech <b>unlocks new buildings</b> (greyed cards in the build menu say <b>Research …</b>: click one to jump to its tech) or makes old ones better.</p>
    <ul class="cl-hsteps">
      <li><b>Clinics</b> make homes happier, bring children and let Habitats grow into <b>Apartments</b> (70 homes).</li>
      <li><b>Smelters</b> turn ore into <b>alloy</b>; <b>Fabricators</b> turn alloy into parts. Mines leave waste: past four Ore Mines, build a <b>Tailings Dump</b> per four and <b>empty</b> it (50 credits) before it is full.</li>
      <li><b>Canteens</b> and <b>Safety Posts</b> cheer the homes around them; an <b>Observation Deck</b> on the Earth-facing hull cheers everyone.</li>
      <li><b>Tether Masts</b> carry the dock's reach further into space, down to the atmosphere.</li>
    </ul>`)}
  ${sec('defence', 'Defence and raids', card('arsenal') + card('barracks'), `
    <p>Eden is rich, and the war left plenty of hungry crews. At <b>80 colonists</b> the <b>Defence</b> menu opens: <b>Arsenal</b>, <b>Guardian Barracks</b>, <b>Scrapyard</b> and <b>Battery Emplacement</b>.</p>
    <ul class="cl-hsteps">
      <li><b>Machines.</b> Open <b>Defence</b> (top bar, or key <b>G</b>) and its <b>Production</b> tab: the Earth Light machines, by class, as in the expansion. A machine costs its price <b>× 10 credits</b> and its price in <b>parts</b>, paid at once. Each Arsenal builds one at a time; more orders wait in its queue (Cancel refunds them in full).</li>
      <li><b>Stronger machines</b> need research: <b>Machine Works</b>, then <b>Heavy Works</b> and <b>Kai Refits</b> (Defence branch). Capital ships need a <b>Shipyard</b> on the hull. A locked machine says why; click the reason to see the tech.</li>
      <li><b>Crews.</b> The Command Centre crews 4 machines and each <b>Barracks</b> 6 more. A machine without a crew stays in the hangar when raiders come.</li>
      <li><b>Upkeep.</b> Each machine costs credits every day (an eighth of its price). Beta testers' machines are free for their first 60 days.</li>
      <li><b>Repairs.</b> A <b>Scrapyard</b> mends damaged machines, 2 HP a day each for a part per HP. A machine at 0 HP is lost.</li>
      <li><b>Battery Emplacements</b> on the hull fire on raiders: <b>Dragon</b> against ships, <b>Hydra</b> against small craft.</li>
    </ul>
    <p><b>Heat</b> (top bar, once raids are possible) is how tempting Eden looks: more colonists, full stores, open chambers and big sales raise it; <b>Jammer Arrays</b> lower it. Paying tribute raises it too. The hotter Eden is, the sooner the next raid.</p>
    <p>Raids start after 80 colonists (from day 60 on Easy, day 35 on Normal). <b>Capt. Sato warns you</b> 3 days ahead; each <b>Sensor Mast</b> adds 3 more. When the raiders arrive you choose:</p>
    <ul class="cl-hsteps">
      <li><b>Fight</b>: the crewed guardians and the batteries against the raiders. The raid window shows the <b>win chance</b> and the machines you will likely lose. A win pays salvage; a loss means stolen goods, damaged buildings (unless a <b>Shield Pylon</b> covers them) and a scared colony.</li>
      <li><b>Pay tribute</b>: credits (or food) and they leave. Heat goes up and morale down a little.</li>
    </ul>`)}
  ${sec('commanders', 'Commanders', `<figure class="cl-hfig portrait">${pic('portrait/sato', 'Capt. Mira Sato')}<figcaption>Capt. Sato</figcaption></figure>`, `
    <p>A commander in a machine makes it fight better. You start with two: <b>the General</b> (three times the power in any machine) and <b>Capt. Sato</b>, best in ships. See them in <b>Defence › Commanders</b>.</p>
    <ul class="cl-hsteps">
      <li><b>Grades</b> S, A, B, C, D per machine class (HU, Planes, Armour, Ships, Support): an S pilot in their class adds the most, up to ×1.6. Their <b>style</b> adds 15% when it matches the machine's main weapon; a <b>perk</b> adds a knack (Ace, Bulwark, Mechanic, Quartermaster, Hunter, Steady).</li>
      <li><b>Assign</b> a commander to a guardian with its <b>Pilots</b> menu. An injured commander sits out until healed.</li>
      <li><b>Departments.</b> A commander can also <b>head</b> one department (Agriculture, Industry, Research, Security, Trade, Welfare): + their stat ÷ 10 % to what it does. One head each.</li>
      <li><b>Wanderers.</b> Research <b>Leadership</b> and build a <b>Wanderers' Lodge</b>: pilots and captains adrift since the war stop by (one every 15 days; an Inn 10, a Grand Lodge 7) and stay 20 days. <b>Invite</b> one with a 100-credit gift; the window shows the chance. A refusal makes the next try likelier.</li>
      <li><b>Room.</b> Eden keeps two commanders, plus two per <b>Officers' Quarters</b>. They draw a daily <b>wage</b>; unpaid or unhappy, their <b>loyalty</b> falls, and below 20 they may leave.</li>
    </ul>`)}
  ${sec('nav', 'Navigating with a trackpad', '', `
    <ul class="cl-hsteps">
      <li><b>Two-finger scroll</b> pans the map. <b>Pinch</b> zooms in and out.</li>
      <li><b>Shift + scroll</b> rotates the view; <b>Alt (Option) + scroll</b> tilts it.</li>
      <li>The <b>buttons on the map</b> (top right) zoom, rotate, tilt and fly <b>home</b> to the Command Centre.</li>
      <li>The <b>minimap</b> (bottom right) shows all of Eden: <b>click or drag on it</b> to jump there. The outline is what you see now.</li>
      <li>Keys: <b>W A S D</b> or the <b>arrows</b> pan, <b>Q / E</b> rotate, <b>+ / −</b> zoom, <b>PgUp / PgDn</b> tilt, <b>Home</b> back to the Command Centre.</li>
    </ul>
    <p>With a mouse: drag to rotate, right-drag to pan, the wheel zooms. The map buttons and the minimap can be switched off in Settings (⚙).</p>`)}
  ${sec('tips', 'Your first 10 days', '', `
    <ol class="cl-hsteps">
      <li>Read Ruess's welcome, then follow the <b>goal panel</b>. Press <b>Show me</b>.</li>
      <li>Plant a second <b>Farm Field</b> on the dark green soil by the river.</li>
      <li>Put a <b>Park</b> next to the Habitats, then build <b>two more Habitats</b>.</li>
      <li>Watch the <b>advisor</b>. If food, water or air runs low, press <b>Fix</b>.</li>
      <li>Build a <b>Repair Yard</b> so more goes up at once.</li>
      <li>Keep some credits and parts for surveying and sealing the next chamber.</li>
      <li>Short of credits? Sell some food at the Market, or set a farm to cash crops.</li>
    </ol>
    ${diff?.relief ? `<p>On <b>${esc(name)}</b>, if the treasury runs dry or colonists go hungry, the Council sends <b>${num(diff.relief.credits)} credits</b> and <b>${num(diff.relief.food)} food</b> (at most once every ${diff.relief.every} days).</p>` : ''}
    <p class="cl-dim">Keys: space pause · 1 / 2 / 3 speed · R build again · T research · G defence · Esc cancel · F1 or ? this guide.</p>`)}
  </div>`;
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
      ${GOODS.map((g) => `<div class="cl-stat" data-g="${g}"${LATE[g] ? ' hidden' : ''} title="${GOOD_NAME[g]}: stock / capacity, change per day"><i>${g === 'helium' ? 'Helium' : GOOD_NAME[g]}</i><b><span data-v></span><small data-c></small></b><em data-d></em></div>`).join('')}
      <button type="button" class="cl-stat cl-resstat" data-g="research" hidden title="Research a day from the labs"><i>Research</i><b><span data-v></span><small data-c></small></b><em data-d></em></button>
      <div class="cl-stat" data-g="power" title="Power: supply / demand (MW), battery"><i>Power</i><b><span data-v></span><small data-c></small></b><em data-d></em></div>
      <div class="cl-stat" data-g="pop" title="Colonists / housing; next transport"><i>Colonists</i><b><span data-v></span><small data-c></small></b><em data-d></em></div>
      <button type="button" class="cl-stat cl-happybtn" data-g="happy" title="Happiness: click for the breakdown"><i>Happiness</i><b><span data-v></span></b><em data-d></em></button>
      <button type="button" class="cl-stat cl-heatstat" data-g="heat" hidden title="Heat: how tempting Eden looks to raiders"><i>Heat</i><b><span data-v></span><small data-c></small></b><em data-d></em></button>
      <div class="cl-stat cl-tax" title="Tax rate: 0% +8 happiness, 10% 0, 20% −14, 30% −32. Shift-click steps 5%."><i>Tax</i>
        <b class="cl-taxctl"><button type="button" data-taxstep="-1" aria-label="Lower the tax">−</button><span data-tax></span><button type="button" data-taxstep="1" aria-label="Raise the tax">+</button></b><em data-taxfx></em></div>
    </div>
    <div class="cl-tools">
      <button type="button" class="cl-btn sm cl-resbtn" data-tool="research" title="Research: the tech tree (T)"><span class="cl-ico">⚗</span><span class="cl-lbl">Research</span></button>
      <button type="button" class="cl-btn sm cl-defbtn" data-tool="defence" title="Defence: guardians, production, commanders and raids (G)"><span class="cl-ico">⛨</span><span class="cl-lbl">Defence</span></button>
      <button type="button" class="cl-btn sm" data-tool="market" title="Sell goods and guardians"><span class="cl-ico">⚖</span><span class="cl-lbl">Market</span></button>
      <button type="button" class="cl-btn sm" data-tool="save" title="Save the colony in this browser"><span class="cl-ico">⤓</span><span class="cl-lbl">Save</span></button>
      <button type="button" class="cl-btn sm icon cl-helpbtn" data-tool="help" title="How to play (F1 or ?)" aria-label="How to play">?</button>
      <button type="button" class="cl-btn sm icon" data-tool="settings" title="Settings">⚙</button>
      <button type="button" class="cl-btn sm icon" data-tool="title" title="Back to the title">⏏</button>
    </div>
  </header>
  <div class="cl-col cl-left">
  <section class="cl-goal cl-panel" aria-label="Current goal" hidden>
    <header class="cl-goalhead">
      <span class="cl-goalpic" data-goalpic></span>
      <div class="cl-goalt"><i data-goalkicker>Goal</i><b data-goaltitle></b><em data-goalprog1></em></div>
      <button type="button" class="cl-goalfold" data-goalfold aria-expanded="true" title="Fold the goal panel">▾</button>
    </header>
    <div class="cl-goalbody">
      <p class="cl-goaltext" data-goaltext></p>
      <div class="cl-goalprog" data-goalprogwrap><span class="cl-goalbar"><span data-goalbar></span></span><small data-goalprog></small></div>
      <div class="cl-goalreward" data-goalreward></div>
      <div class="cl-goalacts">
        <button type="button" class="cl-btn primary cl-showme" data-showme>Show me</button>
        <button type="button" class="cl-goalall" data-goalall aria-expanded="false"></button>
      </div>
      <ol class="cl-goallist" data-goallist hidden></ol>
    </div>
    <div class="cl-offer" data-offer hidden>
      <b>First colony?</b> A two-minute guide explains everything: time, building, chambers, homes.
      <div class="cl-row"><button type="button" class="cl-btn sm primary" data-offer="help">How to play</button><button type="button" class="cl-btn sm ghost" data-offer="later">Later</button></div>
    </div>
  </section>
  <aside class="cl-build cl-panel" aria-label="Build">
    <button type="button" class="cl-buildtoggle" data-buildtoggle>Build ▾</button>
    <div class="cl-buildbody">
      <div class="cl-cats" role="tablist">${CATEGORIES.map((c, i) => `<button type="button" role="tab" data-cat="${c.key}" aria-selected="${i === 0}" style="--cc:${CAT_COLOR[c.key]}">${esc(c.name)}</button>`).join('')}</div>
      <div class="cl-cards" data-cards></div>
    </div>
  </aside>
  </div>
  <div class="cl-col cl-right">
  <section class="cl-adv cl-panel" aria-label="Advisor" hidden>
    <button type="button" class="cl-advhead" data-advfold aria-expanded="true"><i>Advisor</i><span data-advcount></span><b>▾</b></button>
    <ul class="cl-advlist" data-advlist></ul>
  </section>
  <aside class="cl-insp cl-panel" hidden aria-label="Inspector"><button type="button" class="cl-x" data-close="insp" title="Close (Esc)">×</button><div data-insp></div></aside>
  <div class="cl-pop cl-panel" data-pop="happy" hidden></div>
  <div class="cl-pop cl-panel" data-pop="market" hidden></div>
  <div class="cl-pop cl-panel" data-pop="settings" hidden></div>
  </div>
  <div class="cl-mid" aria-hidden="true"></div>
  <section class="cl-research cl-win" hidden role="dialog" aria-label="Research">
    <header class="cl-rhead">
      <div class="cl-rtitle"><h3>Research</h3><small>the tech tree · T</small></div>
      <div class="cl-rstats" data-rstats></div>
      <button type="button" class="cl-x" data-close="research" title="Close (Esc or T)" aria-label="Close">×</button>
    </header>
    <div class="cl-rnote" data-rnote hidden></div>
    <div class="cl-rcols" data-rcols></div>
  </section>
  <section class="cl-defence cl-win" hidden role="dialog" aria-label="Defence">
    <header class="cl-rhead cl-dhead">
      <div class="cl-rtitle"><h3>Defence</h3><small>guardians and raids · G</small></div>
      <div class="cl-rstats" data-dstats></div>
      <button type="button" class="cl-x" data-close="defence" title="Close (Esc or G)" aria-label="Close">×</button>
    </header>
    <div class="cl-dtabs" role="tablist">${DEF_TABS.map(([k, n]) => `<button type="button" role="tab" data-dtab="${k}" aria-selected="false">${n}<span data-dtabn="${k}"></span></button>`).join('')}</div>
    <div class="cl-dbody" data-dbody></div>
  </section>
  <div class="cl-ovl" role="group" aria-label="Overlay"><i>Overlay</i>${OVERLAYS.map(([k, n]) => `<button type="button" data-ovl="${k ?? ''}" aria-pressed="${k === null}">${n}</button>`).join('')}</div>
  <div class="cl-placing" hidden><span data-placing></span> <button type="button" class="cl-btn sm" data-cancel>Cancel</button></div>
  <div class="cl-log" data-log title="Colony log (click to expand)"></div>
  <div class="cl-tip" hidden></div>
  <div class="cl-toasts" aria-live="polite"></div>
  <div class="cl-modal" hidden><div class="cl-win cl-event" role="dialog" aria-modal="true" aria-labelledby="evTitle"></div></div>`;

  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const statEls = {};
  for (const el of $$('.cl-stat[data-g]')) statEls[el.dataset.g] = { el, base: el.className, v: el.querySelector('[data-v]'), c: el.querySelector('[data-c]'), d: el.querySelector('[data-d]') };
  const dayEl = $('[data-h=day]'), taxEl = $('[data-tax]'), taxFx = $('[data-taxfx]');
  const cardsEl = $('[data-cards]'), insp = $('.cl-insp'), inspBody = $('[data-insp]'), tipEl = $('.cl-tip'), toasts = $('.cl-toasts');
  const logEl = $('[data-log]'), modal = $('.cl-modal'), evBox = $('.cl-event'), placingEl = $('.cl-placing');
  const pops = { happy: $('[data-pop=happy]'), market: $('[data-pop=market]'), settings: $('[data-pop=settings]') };
  let cat = CATEGORIES[0].key, cardSig = '', inspAt = null, inspSig = '', logSig = '', logOpen = false, evId = null, marketSig = '', happySig = '';
  let summary = null, dirty = false;

  const result = (r) => api.act(r);

  // ---------------------------------------------------------------- research state (version 2; guarded: rules may predate it)
  const researchOf = (s) => s.research || { points: 0, focus: null, progress: {}, done: [] };
  const techDone = (s, key) => !!researchOf(s).done?.includes(key);
  // rules.techStatus when it exists, else the same rows worked out from data/tech.js and state.research.
  function techList(s) {
    try { const r = R.techStatus?.(s); if (Array.isArray(r) && r.length) return r; } catch (e) { console.warn('techStatus failed', e); }
    const rs = researchOf(s), done = new Set(rs.done || []);
    return TECHS.map((t) => ({ key: t.key, name: t.name, branch: t.branch, cost: t.cost, progress: done.has(t.key) ? t.cost : rs.progress?.[t.key] || 0,
      done: done.has(t.key), available: !done.has(t.key) && t.needs.every((n) => done.has(n)), focus: rs.focus === t.key, needs: t.needs, unlocks: t.unlocks, text: t.text }));
  }
  const lateShown = (s, g) => (s.stock?.[g] || 0) > 0 || techDone(s, LATE[g]) || s.buildings.some((b) => BUILDING[b.key]?.makes?.[g]);

  // ---------------------------------------------------------------- top bar
  $('.cl-speeds').addEventListener('click', (e) => { const b = e.target.closest('[data-speed]'); if (b) api.setSpeed(+b.dataset.speed); });
  $('.cl-taxctl').addEventListener('click', (e) => {
    const b = e.target.closest('[data-taxstep]'); if (!b) return;
    const now = Math.round((S().tax ?? 0) * 100), want = Math.max(0, Math.min(30, now + +b.dataset.taxstep * (e.shiftKey ? 5 : 1)));
    if (want === now) return;
    const r = R.setTax(S(), want / 100);
    result(r && r.ok === false ? r : { ok: true });   // no toast for every step: the number itself changes
  });
  $('.cl-happybtn').addEventListener('click', () => togglePop('happy'));
  statEls.research.el.addEventListener('click', () => toggleResearch());
  $('.cl-tools').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tool]')?.dataset.tool;
    if (t === 'research') toggleResearch();
    else if (t === 'defence') toggleDefence();
    else if (t === 'market') togglePop('market');
    else if (t === 'save') api.save();
    else if (t === 'settings') togglePop('settings');
    else if (t === 'help') api.help?.();
    else if (t === 'title') api.toTitle();
  });

  function setSpeed(s) { for (const b of $$('[data-speed]')) b.setAttribute('aria-pressed', String(+b.dataset.speed === s)); }

  function stat(g, v, c, d, cls) {
    const e = statEls[g]; if (!e) return;
    if (e.v && e.v.textContent !== v) e.v.textContent = v;
    if (e.c && e.c.textContent !== c) e.c.textContent = c;
    if (e.d && e.d.textContent !== d) e.d.textContent = d;
    const k = e.base + (cls ? ' ' + cls : '');
    if (e.el.className !== k) e.el.className = k;
  }
  const show = (g, on) => { const e = statEls[g]; if (e && e.el.hidden === !!on) e.el.hidden = !on; };

  // Why a resource moves: "−13 a day: 40 colonists eat 32, 2 Farm Fields make 19" (the stat's title).
  const specOf = (b) => { try { return R.spec?.(b) || BUILDING[b.key] || {}; } catch { return BUILDING[b.key] || {}; } };
  const isActive = (b) => b.build === 0 && !b.off;
  function groupNames(list) {
    const n = {};
    for (const b of list) { const nm = BUILDING[b.key]?.name || b.key; n[nm] = (n[nm] || 0) + 1; }
    return Object.entries(n).map(([nm, k]) => k > 1 ? `${k} ${/[^aeiou]y$/.test(nm) ? nm.slice(0, -1) + 'ies' : nm + 's'}` : nm).join(', ');
  }
  function why(g, s, m) {
    const last = s.stats?.last || {}, pr = last.produced?.[g] || 0, co = last.consumed?.[g] || 0, d = pr - co;
    const st = m?.stock?.[g] || {};
    const live = s.buildings.filter(isActive);
    const makers = live.filter((b) => specOf(b).makes?.[g] && !(b.key === 'farm' && b.mode === 'fallow'));
    const users = live.filter((b) => specOf(b).uses?.[g] && !(b.key === 'farm' && b.mode === 'fallow'));
    const head = `${GOOD_NAME[g]}: ${num(st.have ?? s.stock[g])}${st.cap ? ` of ${num(st.cap)} stored` : ''}.\n${d ? signed(d) : '±0'} a day`;
    if (!s.day) return `${GOOD_NAME[g]}: ${num(st.have ?? s.stock[g])}${st.cap ? ` of ${num(st.cap)} stored` : ''}.\nWhat it gains or loses a day shows after the first day.`;
    const bits = [];
    if (g === 'food' || g === 'water' || g === 'air') {
      const nm = api.diff?.(s)?.need ?? 1;
      let need = s.pop * (NEEDS[g] || 0) * nm, chamberAir = 0;
      if (g === 'air') for (const c of s.chambers) if (c.status === 'open') chamberAir += (c.tiles / 100) * CHAMBER_AIR_PER_100 * nm;
      const people = Math.min(co, need), rest = Math.max(0, co - people - chamberAir);
      bits.push(`${num(s.pop)} colonists ${{ food: 'eat', water: 'drink', air: 'breathe' }[g]} ${num(people)}`);
      if (chamberAir > 0.5) bits.push(`open chambers leak ${num(Math.min(chamberAir, Math.max(0, co - people)))}`);
      if (rest > 0.5) bits.push(`${groupNames(users) || 'buildings'} use ${num(rest)}`);
      if (pr > 0) bits.push(`${groupNames(makers) || 'buildings'} make ${num(pr)}`);
    } else if (g === 'credits') {
      const tax = last.tax || 0, upkeep = last.upkeep || 0, other = pr - tax;
      bits.push(`tax brings ${num(tax)}`);
      if (other > 0.5) bits.push(`cash crops ${num(other)}`);
      bits.push(`upkeep costs ${num(upkeep)}${co < upkeep - 0.5 ? ` (only ${num(co)} paid)` : ''}`);
    } else {
      if (pr > 0) bits.push(`${groupNames(makers) || 'buildings'} make ${num(pr)}`);
      if (co > 0) bits.push(`${groupNames(users) || 'buildings'} use ${num(co)}`);
    }
    if (!bits.length) bits.push(g === 'ore' ? 'nothing mines ore yet (Ore Mines unlock at 80 colonists)' : 'nothing makes or uses it yet');
    let tail = '';
    if (g === 'credits' || g === 'parts') tail = '\nBuilding costs are paid at once and are not in this number.';
    if (st.cap && g !== 'credits') tail += `\n${st.have >= st.cap ? 'Stores are full: anything more is lost. ' : ''}Storage Depots raise the cap.`;
    if (g === 'food' && d < 0 && (st.have ?? 0) > 0) tail += `\nRuns out in ${Math.floor((st.have ?? 0) / -d)} days.`;
    return `${head}: ${bits.join(', ')}.${tail}`;
  }
  function powerWhy(s, m) {
    const p = m?.power || {}, live = s.buildings.filter(isActive);
    const prod = live.filter((b) => specOf(b).power > 0), use = live.filter((b) => specOf(b).power < 0);
    return `Power: ${num(p.supply ?? 0)} MW made by ${groupNames(prod) || 'nothing'}; ${num(p.demand ?? 0)} MW needed by ${use.length} building${use.length === 1 ? '' : 's'}.`
      + ((p.supply ?? 0) < (p.demand ?? 0) ? '\nShort: every powered building slows down. Build Solar Arrays.' : '\nPower is never stored, except in Battery Banks.')
      + (p.cap ? `\nBattery ${num(p.battery ?? 0)} / ${num(p.cap)}.` : '');
  }
  function popWhy(s, m) {
    const dv = api.diff?.(s), every = dv?.transportEvery ?? 10, need = dv?.transportHappy ?? 55;
    return `Colonists ${num(m?.pop ?? s.pop)} / homes ${num(m?.housing ?? s.housing)}.\nA transport calls every ${every} days. It docks if happiness is at least ${need}, there are free homes, and food, water and air are not short.`;
  }
  const setTitle = (g, t) => { const e = statEls[g]; if (e && e.el.title !== t) e.el.title = t; };

  // Research (version 2): the labs' points a day, what is studied, what is banked.
  function labInfo(s) {
    const labs = s.buildings.filter((b) => b.key === 'lab'), live = labs.filter(isActive);
    const m = summary || {}, staff = m.jobs ? Math.min(1, (m.workers ?? s.pop) / m.jobs) : 1, pf = s.stats?.last?.power?.factor ?? 1;
    const nominal = live.reduce((t, b) => t + (specOf(b).makes?.research || 0), 0);
    const made = summary?.research?.perDay ?? s.stats?.last?.research ?? s.stats?.last?.produced?.research;
    const perDay = s.day > 0 && Number.isFinite(made) ? made : nominal * staff * Math.min(1, pf);
    return { labs: labs.length, live: live.length, building: labs.filter((b) => b.build > 0).length, perDay, nominal };
  }
  function researchWhy(s, li, rs, list) {
    const f = list.find((t) => t.focus);
    return `Research: ${num(li.perDay)} points a day from ${li.live} working lab${li.live === 1 ? '' : 's'}${li.building ? ` (${li.building} being built)` : ''}.`
      + (f ? `\nStudying ${f.name}: ${num(f.progress)} / ${num(f.cost)}${li.perDay > 0 ? `, about ${Math.ceil((f.cost - f.progress) / li.perDay)} days left` : ''}.` : '\nNothing is being studied: points are banked for the next tech.')
      + (rs.points ? `\nBanked: ${num(rs.points)} points.` : '')
      + '\nStaff, power and lab upgrades make more. Click to open Research (T).';
  }

  function hud() {
    const s = S(), m = summary;
    dayEl.textContent = `Day ${s.day}`;
    for (const g of GOODS) {
      if (LATE[g]) { const on = lateShown(s, g); show(g, on); if (!on) continue; }
      const st = m?.stock?.[g] || { have: s.stock?.[g] ?? 0 };
      const cap = st.cap != null && Number.isFinite(st.cap) ? `/${num(st.cap)}` : '';
      const d = st.delta ?? 0;
      const low = g !== 'credits' && g !== 'ore' && st.cap ? st.have < Math.max(20, st.cap * 0.1) : false;
      stat(g, num(st.have), cap, d ? signed(d) : '±0', (d > 0 ? 'up' : d < 0 ? 'down' : '') + (low ? ' low' : '') + (st.cap && st.have >= st.cap && g !== 'credits' ? ' full' : ''));
    }
    const p = m?.power || {};
    for (const g of GOODS) if (!statEls[g].el.hidden) setTitle(g, why(g, s, m));
    const li = labInfo(s);
    show('research', li.labs > 0);
    // version 2 has begun (the lab is unlocked): phones show the Research button only from then on
    const v2 = !!(s.unlocked?.includes?.('lab') || li.labs || researchOf(s).done?.length || researchOf(s).focus);
    if (root.classList.contains('cl-v2') !== v2) root.classList.toggle('cl-v2', v2);
    if (li.labs) {
      const rs = researchOf(s), list = techList(s), f = list.find((t) => t.focus);
      const short = (n) => n.length > 13 ? n.slice(0, 12) + '…' : n;
      stat('research', '+' + num(li.perDay), '/d', f ? short(f.name) : rs.points ? `bank ${num(rs.points)}` : 'pick a tech', f ? 'up' : 'idle');
      setTitle('research', researchWhy(s, li, rs, list));
    }
    // version 3: the Defence panel (phones show its button once there is something to defend), heat once raids can come
    const v3 = !!(s.guardians?.length || s.unlocked?.includes?.('arsenal') || s.pop >= 80 || s.flags?.unlock80);
    if (root.classList.contains('cl-v3') !== v3) root.classList.toggle('cl-v3', v3);
    const rd = s.raid, heatOn = raidsPossible(s);
    show('heat', heatOn);
    if (heatOn) {
      const heat = Math.round(rd.heat || 0), eta = raidEta(s);
      stat('heat', String(heat), '', rd.coming ? (eta > 0 ? `raid in ${eta}d` : 'raiders!') : rd.warned && eta != null ? `raid in ${eta}d` : heat >= 60 ? 'hot' : heat >= 30 ? 'watched' : 'quiet',
        rd.coming || rd.warned ? 'alert' : heat >= 60 ? 'down' : heat < 30 ? 'up' : '');
      setTitle('heat', heatWhy(s));
    }
    setTitle('power', powerWhy(s, m));
    setTitle('pop', popWhy(s, m));
    stat('power', num(p.supply ?? 0), `/${num(p.demand ?? 0)}`, p.cap ? `bat ${num(p.battery ?? 0)}/${num(p.cap)}` : '', (p.supply ?? 0) < (p.demand ?? 0) ? 'down' : 'up');
    const pop = m?.pop ?? s.pop, housing = m?.housing ?? s.housing;
    stat('pop', num(pop), `/${num(housing)}`, m?.nextArrival != null ? (typeof m.nextArrival === 'number' ? `ship in ${m.nextArrival}d` : String(m.nextArrival)) : '', pop > housing ? 'down' : '');
    const h = Math.round(m?.happy ?? s.happy);
    stat('happy', String(h), '', h >= 70 ? 'thriving' : h >= 55 ? 'content' : h >= 40 ? 'steady' : h >= 25 ? 'unrest' : 'protests', h >= 55 ? 'up' : h < 40 ? 'down' : '');
    const t = Math.round((s.tax ?? 0) * 100), th = Math.round(taxHappy(t));
    if (taxEl.textContent !== t + '%') taxEl.textContent = t + '%';
    const fx = `${th > 0 ? '+' : th < 0 ? '−' : '±'}${Math.abs(th)} happy`;
    if (taxFx.textContent !== fx) { taxFx.textContent = fx; taxFx.className = th > 0 ? 'good' : th < 0 ? 'bad' : ''; }
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
    const c = e.target.closest('[data-key]'); if (!c) return;
    if (c.dataset.tech) { openResearch(c.dataset.tech); return; }   // locked behind a tech: show it in the tree
    if (c.getAttribute('aria-disabled') === 'true') return;
    api.pick(c.dataset.key);
    if (matchMedia('(max-width: 760px)').matches) $('.cl-build').classList.remove('open');
  });

  function buildMenu() {
    const s = S();
    let list; try { list = R.buildable(s); } catch { list = []; }
    const by = Object.fromEntries((list || []).map((o) => [o.key, o]));
    const items = BUILDINGS.filter((b) => b.cat === cat && !b.fixed).map((b) => {
      const o = by[b.key] || { key: b.key, name: b.name, cost: b.cost, unlocked: !b.unlock && !b.tech, why: b.unlock ? `At ${b.unlock.pop} colonists` : '' };
      const cost = o.cost || b.cost;
      const poor = (cost.credits || 0) > (s.stock.credits || 0) || (cost.parts || 0) > (s.stock.parts || 0);
      // version 2: still locked behind its tech (whatever rules.buildable words it as)
      const tech = !o.unlocked && b.tech && !techDone(s, b.tech) ? b.tech : null;
      return { b, o, cost, poor, tech };
    });
    const sig = cat + '|' + items.map((i) => `${i.b.key}:${i.o.unlocked}:${i.o.why || ''}:${i.poor}:${i.tech}`).join(',') + '|' + api.placingKey?.();
    if (sig === cardSig) return;
    cardSig = sig;
    const placing = api.placingKey?.();
    cardsEl.innerHTML = items.map(({ b, o, cost, poor, tech }) => {
      const url = api.art?.(`card/${b.key}`);
      const locked = !o.unlocked;
      const why = !locked ? '' : tech ? `Research ${TECH[tech]?.name || tech}` : (o.why || (b.unlock ? `At ${b.unlock.pop} colonists` : 'Locked'));
      return `<button type="button" class="cl-card${locked ? ' locked' : ''}${tech ? ' techlock' : ''}${placing === b.key ? ' on' : ''}" data-key="${b.key}"${tech ? ` data-tech="${esc(tech)}"` : ''} aria-disabled="${locked && !tech}" style="--cc:${CAT_COLOR[b.cat] || '#9aa'}" title="${esc(tech ? `${b.text}\nClick to see ${TECH[tech]?.name || tech} in Research.` : b.text)}">
        <span class="cl-cardpic">${url ? `<img src="${esc(url)}" alt="" loading="lazy">` : cardIcon(b)}</span>
        <span class="cl-cardname">${esc(o.name || b.name)}</span>
        <span class="cl-cardcost${poor && !locked ? ' poor' : ''}">${costText(cost)}</span>
        <span class="cl-cardmeta">${b.size}×${b.size}${b.power ? ` · ${b.power > 0 ? '+' : ''}${b.power} MW` : ''}${b.jobs ? ` · ${b.jobs} jobs` : ''}${b.housing ? ` · ${b.housing} homes` : ''}</span>
        ${locked ? `<span class="cl-cardwhy">${tech ? '⚗' : '🔒'} ${esc(why)}${tech ? ' <i>›</i>' : ''}</span>` : `<span class="cl-cardtext">${esc(b.text)}</span>`}
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
      case 'empty': result(typeof R.emptyTailings === 'function' ? R.emptyTailings(s, id) : { ok: false, msg: 'Emptying dumps is not ready yet.' }); break;
      case 'research': openResearch(a.dataset.v || null); break;
      case 'defence': openDefence(a.dataset.v || null); break;
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
      const air = R.pressuriseAir ? R.pressuriseAir(s, ch) : Math.ceil((ch.tiles || 0) / 4);
      let fee = 100, sdays = 2; try { const sc = R.surveyCost?.(s); if (sc) { fee = sc.credits ?? fee; sdays = sc.days ?? sdays; } else fee = R.costOf?.(s, { credits: 100 })?.credits ?? 100; } catch { }
      parts.push(`<section class="cl-isec"><h4>Chamber <span class="cl-badge st-${esc(ch.status)}">${esc(st[0])}</span></h4>
        <div class="cl-iname">${esc(ch.name || 'Chamber ' + ch.id)} <small>${esc(ch.kind || '')} · ${num(ch.tiles)} tiles</small></div>
        <p class="cl-dim">${esc(st[1])}${ch.work ? ` ${ch.work} day${ch.work === 1 ? '' : 's'} left.` : ''}</p>
        <div class="cl-kv"><span>Breaches</span><b class="${total && sealed < total ? 'bad' : 'good'}">${hidden ? '?' : `${sealed} / ${total} sealed`}</b></div>
        ${ch.status !== 'open' ? `<div class="cl-acts">
          <button type="button" class="cl-btn sm" data-a="survey" data-id="${ch.id}" ${surveyR.ok ? '' : 'disabled'} title="${esc(surveyR.ok ? `Survey: ${fee} credits, ${sdays} day${sdays === 1 ? '' : 's'}` : surveyR.msg)}">Survey <small>${fee} cr · ${sdays} d</small></button>
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
    const status = b.build > 0 ? `<span class="cl-badge st-surveying">Building · ${b.build} d</span>` : b.damaged > 0 ? `<span class="cl-badge st-sealed" title="Raid damage: out of action until a crew repairs it">Damaged · ${b.damaged} d</span>` : b.off ? '<span class="cl-badge st-sealed">Off</span>' : '<span class="cl-badge st-open">Working</span>';
    const sp = { ...d, ...lv, ...specOf(b) };   // this level's numbers (rules.spec), the table's as a fallback
    const power = sp.power, housing = sp.housing, mode = b.mode ?? d.modes?.[0]?.key;
    const kv = (k, v, cls = '') => `<div class="cl-kv"><span>${k}</span><b class="${cls}">${v}</b></div>`;
    const rows = [];
    rows.push(kv('Level', `${b.level}${d.levels ? ` / ${d.levels.length}` : ''}${lv.name ? ` · ${esc(lv.name)}` : ''}`));
    if (d.jobs) rows.push(kv('Staffing', `${d.jobs} jobs · ${Math.round(staff * 100)}%`, staff < 1 ? 'bad' : 'good'));
    if (power) rows.push(kv('Power', `${power > 0 ? '+' : ''}${power} MW`, power > 0 ? 'good' : ''));
    if (b.key === 'lab') {
      const li = labInfo(s), out = isActive(b) ? (sp.makes?.research || 0) * (staff ?? 1) * Math.min(1, s.stats?.last?.power?.factor ?? 1) : 0;
      const f = techList(s).find((t) => t.focus);
      rows.push(kv('Research', `${num(out)} / day${li.live > 1 ? ` · all labs ${num(li.perDay)}` : ''}`, out > 0 ? 'good' : 'bad'));
      rows.push(kv('Studying', f ? `${esc(f.name)} · ${num(f.progress)} / ${num(f.cost)}` : 'nothing: points are banked', f ? '' : 'bad'));
    } else if (sp.makes && Object.keys(sp.makes).length) rows.push(kv('Makes', `${flows(sp.makes)} /day`, 'good'));
    if (sp.uses && Object.keys(sp.uses).length) rows.push(kv('Uses', `${flows(sp.uses)} /day`));
    if (housing) rows.push(kv('Homes', housing));
    if (sp.crews) rows.push(kv('Crews', sp.crews));
    if (d.storage) rows.push(kv('Stores', b.mode && d.modes ? `${Object.values(sp.storage || d.storage)[0]} ${GOOD_NAME[b.mode] || b.mode}` : flows(sp.storage || d.storage)));
    if (sp.radius) rows.push(kv(d.service ? 'Range' : 'Radius', `${sp.radius} tiles${sp.park ? ` · park ${sp.park}` : ''}`));
    if (d.service) {
      const v = (sp.service || d.service) * (mode === 'triage' ? 0.5 : 1);
      rows.push(kv('Happiness', `+${num(v)} for homes in range`, 'good'));
    }
    if (d.upkeep) rows.push(kv('Upkeep', `${num((sp.upkeep ?? d.upkeep) * (mode === 'triage' ? 0.5 : 1))} cr/day`));
    let extra = '';
    if (b.key === 'tailings') {
      const fill = Math.max(0, Math.min(100, Math.round(b.fill || 0)));
      const mines = s.buildings.filter((k) => k.key === 'oremine' && k.build === 0).length, dumps = s.buildings.filter((k) => k.key === 'tailings' && k.build === 0).length;
      const need = Math.max(0, Math.ceil((mines - 4) / 4));
      extra = `<div class="cl-fillrow"><span>Fill</span><span class="cl-fill${fill >= 100 ? ' full' : fill >= 75 ? ' high' : ''}"><span style="width:${fill}%"></span></span><b class="${fill >= 100 ? 'bad' : ''}">${fill}%</b></div>
        <p class="cl-dim">${num(mines)} Ore Mine${mines === 1 ? '' : 's'} · ${num(dumps)} dump${dumps === 1 ? '' : 's'}${need ? ` (${need} needed)` : ''}. Each mine adds 1 a day; a full dump takes no more waste.</p>
        ${fill >= 100 ? '<p class="cl-why">Full: empty it, or mines beyond four run at half output.</p>' : ''}`;
    }
    if (b.key === 'lab') extra = `<p class="cl-dim">Choose what the labs study in the Research panel (T).</p>`;
    // version 3: what the defence buildings are doing
    if (d.builds) {
      const list = (s.production || []).filter((o) => o.at === b.id), o = list[0];
      rows.push(kv('Building', o ? `${esc(mInfo(o.type).name)} · ${num(o.days)} d left${list.length > 1 ? ` · ${list.length - 1} waiting` : ''}` : 'nothing: order in Production', o ? 'good' : 'bad'));
    }
    if (b.key === 'barracks' || b.key === 'command') { const gs = s.guardians || []; if (b.key === 'barracks' || gs.length) rows.push(kv('Guardian crews', `${num(crewCap(s))} in all · ${num(gs.length)} machine${gs.length === 1 ? '' : 's'}`, gs.length > crewCap(s) ? 'bad' : '')); }
    if (b.key === 'scrapyard') { const hurt = (s.guardians || []).filter((g) => hpOf(g) < maxHp(g)).length; rows.push(kv('Repairing', hurt ? `${hurt} machine${hurt === 1 ? '' : 's'} · 2 HP a day each` : 'nothing damaged')); }
    if (b.key === 'lodge') rows.push(kv('Wanderers here', num((s.wanderers || []).length)));
    if (b.key === 'quarters') rows.push(kv('Commanders', `${commanders(s).length} / ${cmdCap(s)}`));
    if (b.key === 'clinic' && next) extra = `<p class="cl-dim">Next: <b>${esc(next.name || 'level ' + (b.level + 1))}</b>, range ${next.radius ?? sp.radius} tiles. Habitats in range can grow into Apartments.</p>`;
    const modes = d.modes ? `<div class="cl-modes" role="group" aria-label="Mode">${d.modes.map((mo, i) => {
      const on = (b.mode ?? d.modes[0].key) === mo.key || (!b.mode && i === 0);
      return `<button type="button" data-a="mode" data-id="${b.id}" data-v="${esc(mo.key)}" aria-pressed="${on}" title="${esc(mo.text || mo.name)}">${esc(mo.name)}</button>`;
    }).join('')}</div>${d.modes.find((mo) => mo.key === (b.mode ?? d.modes[0].key))?.text ? `<p class="cl-dim">${esc(d.modes.find((mo) => mo.key === (b.mode ?? d.modes[0].key)).text)}</p>` : ''}` : '';
    let needs = '';
    if (b.key === 'habitat' && next && R.habitatLevelReachable && !R.habitatLevelReachable(next)) {
      needs = `<div class="cl-needs"><h5>${esc(d.levels?.[b.level - 1]?.name || 'This')} is the largest home for now</h5></div>`;
    } else if (b.key === 'habitat') {
      const list = habitatNeeds(s, b);
      if (list && list.length) needs = `<div class="cl-needs"><h5>${next ? `Next level: ${esc(next.name || 'level ' + (b.level + 1))}` : 'Top level'}</h5><ul>${list.map((n) => `<li class="${n.ok ? 'ok' : 'no'}">${n.ok ? '✓' : '✗'} ${esc(n.label)}</li>`).join('')}</ul></div>`;
      else if (next?.needs) needs = `<div class="cl-needs"><h5>Next level: ${esc(next.name || '')}</h5><ul>${next.needs.map((n) => `<li class="no">• ${esc({ allNeeds: 'Food, water, air and power for everyone', park: 'A park in range', clinic: 'A clinic in range (later)' }[n] || n)}</li>`).join('')}</ul></div>`;
    }
    const acts = [];
    if (b.key === 'tailings') {
      const has = typeof R.emptyTailings === 'function', r = !has ? { ok: false, msg: 'Emptying dumps is not ready yet.' } : !(b.fill > 0) ? { ok: false, msg: 'It is empty.' } : dry(s, (c) => R.emptyTailings(c, b.id));
      const fee = R.EMPTY_TAILINGS?.credits ?? 50;
      acts.push(`<button type="button" class="cl-btn sm primary" data-a="empty" data-id="${b.id}" ${r.ok ? '' : 'disabled'} title="${esc(r.ok ? 'Empty the dump: fill back to 0' : r.msg)}">Empty <small>${fee} cr</small></button>`);
    }
    if (b.key === 'lab') acts.push(`<button type="button" class="cl-btn sm primary" data-a="research" data-id="${b.id}">Research</button>`);
    const dtab = { arsenal: 'production', shipyard: 'production', barracks: 'guardians', scrapyard: 'guardians', lodge: 'commanders', quarters: 'commanders', sensormast: 'raids', jammer: 'raids', shieldpylon: 'raids', emplacement: 'raids' }[b.key];
    if (dtab) acts.push(`<button type="button" class="cl-btn sm primary" data-a="defence" data-v="${dtab}" data-id="${b.id}">${esc(DEF_TABS.find(([k]) => k === dtab)[1])}</button>`);
    if (next?.cost) {
      const r = dry(s, (c) => R.upgrade(c, b.id));
      acts.push(`<button type="button" class="cl-btn sm" data-a="upgrade" data-id="${b.id}" ${r.ok ? '' : 'disabled'} title="${esc(r.ok ? `Upgrade${next.name ? ' to ' + next.name : ''}` : r.msg)}">Upgrade <small>${costText((() => { try { return R.costOf?.(s, next.cost, b.key) || next.cost; } catch { return next.cost; } })())}</small></button>`);
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
      ${rows.join('')}${extra}${modes}${needs}
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
    const sig = JSON.stringify([s.map.t[i], b, ch && [ch.status, ch.work, sealedCount(s, ch)], Math.floor(s.stock.credits / 50), Math.floor(s.stock.parts / 5), Math.floor(s.stock.air / 10), summary?.jobs, summary?.workers, s.day % 5 === 0 ? s.day : 0, BUILDING[b?.key]?.cat === 'defence' || b?.key === 'lodge' || b?.key === 'quarters' ? [s.production, (s.guardians || []).length, (s.wanderers || []).length, s.commanders?.length] : 0, b?.key === 'lab' ? [s.research?.focus, Math.floor(s.research?.progress?.[s.research?.focus] || 0), s.stats?.last?.research] : 0]);
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
    closeResearch(); closeDefence();
    if (name === 'happy') { happySig = ''; renderHappy(); }
    if (name === 'market') { marketSig = ''; renderMarket(); }
    if (name === 'settings') renderSettings();
  }
  function togglePop(name) { if (pops[name].hidden) openPop(name); else pops[name].hidden = true; }
  function closePops() { let any = closeResearch(); any = closeDefence() || any; for (const p of Object.values(pops)) { any ||= !p.hidden; p.hidden = true; } return any; }
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
    if (e.target.closest('[data-mdef]')) { openDefence(e.target.closest('[data-mdef]').dataset.mdef); return; }
    const b = e.target.closest('[data-sell],[data-guard]'); if (!b || b.disabled) return;
    const s = S();
    if (b.dataset.sell) {
      const g = b.dataset.sell, have = Math.floor(s.stock[g] || 0), q = b.dataset.q === 'all' ? have : Math.min(have, +b.dataset.q);
      if (q <= 0) { toast(`No ${GOOD_NAME[g].toLowerCase()} to sell.`, 'bad'); return; }
      result(R.sell(s, g, q));
    } else result(R.sellGuardian(s, +b.dataset.guard));
    marketSig = ''; renderMarket();
  });

  function renderMarket() {
    if (pops.market.hidden) return;
    const s = S();
    const goods = SELLABLE.filter((g) => !LATE[g] || lateShown(s, g));
    const prices = goods.map((g) => { try { return R.price(s, g); } catch { return null; } });
    const yard = finishedOf(s, 'scrapyard').length > 0;
    const sig = JSON.stringify([goods, prices, goods.map((g) => Math.floor(s.stock[g] || 0)), (s.guardians || []).map((g) => [g.id, g.level, g.hp]), yard]);
    if (sig === marketSig) return;
    marketSig = sig;
    const hasDock = s.buildings.some((b) => b.key === 'dock' && !b.build);
    const guards = s.guardians || [];
    pops.market.innerHTML = `<button type="button" class="cl-x" data-close title="Close">×</button>
      <h3>Market <small>wanderers' traders at the dock</small></h3>
      ${hasDock ? '' : '<p class="cl-why">No finished dock: the traders have nowhere to land.</p>'}
      <table class="cl-table cl-mkt"><thead><tr><th>Good</th><th class="n">Stock</th><th class="n">Price</th><th>Sell</th></tr></thead><tbody>
      ${goods.map((g, i) => { const have = Math.floor(s.stock[g] || 0), p = prices[i]; return `<tr><td>${GOOD_NAME[g]}</td><td class="n">${num(have)}</td><td class="n">${p == null ? '–' : (+p).toFixed(2)} <small>cr</small></td>
        <td class="cl-sellbtns">${[10, 100].map((q) => `<button type="button" class="cl-btn xs" data-sell="${g}" data-q="${q}" ${have < 1 ? 'disabled' : ''}>${q}</button>`).join('')}<button type="button" class="cl-btn xs" data-sell="${g}" data-q="all" ${have < 1 ? 'disabled' : ''} title="${p != null ? `≈ ${num(have * p)} cr` : ''}">All</button></td></tr>`; }).join('')}
      </tbody></table>
      <p class="cl-dim">Every 10 units sold lowers that price 2%; prices recover a little each day.</p>
      ${guards.length ? `<h4>Guardians <small>${guards.length} machine${guards.length === 1 ? '' : 's'}${yard ? ' · Scrapyard: +20%' : ''}</small></h4>
      ${yard ? '' : '<p class="cl-dim">A Scrapyard sells machines for a fifth more.</p>'}
      <div class="cl-guards">${guards.map((g) => { const sp = salePrice(s, g), base = yard ? Math.round(sp.credits / 1.2) : null; return `<div class="cl-guard"><b>${esc(mInfo(g.type).name)}</b><small>L${g.level ?? 0}${g.hp != null && g.hp < maxHp(g) ? ` · ${num(g.hp)}/${num(maxHp(g))} HP` : ''}</small>
        <span>${num(sp.credits)} cr · ${num(sp.parts)} parts${yard ? ` <em class="cl-bonus" title="Scrapyard bonus: ${num(base)} cr without it">+20% Scrapyard</em>` : ''}</span><button type="button" class="cl-btn xs" data-guard="${g.id}" ${sp.ok || !R.sellGuardian ? '' : 'disabled'} title="${esc(sp.ok ? '' : sp.msg)}">Sell</button></div>`; }).join('')}</div>
      <p class="cl-dim"><button type="button" class="cl-linkbtn" data-mdef="guardians">Defence panel ›</button> repairs, crews and commanders.</p>` : ''}`;
  }

  function renderSettings() {
    const st = api.settings;
    pops.settings.innerHTML = `<button type="button" class="cl-x" data-close title="Close">×</button>
      <h3>Settings</h3>
      <label class="cl-check"><input type="checkbox" data-set="pauseOnEvents" ${st.pauseOnEvents ? 'checked' : ''}><span></span><em>Pause on events<small>Decisions stop the clock until answered.</small></em></label>
      <label class="cl-check"><input type="checkbox" data-set="snap" ${st.snap ? 'checked' : ''}><span></span><em>Snap rotation to 90°<small>Quarter turns instead of a free orbit.</small></em></label>
      <label class="cl-check"><input type="checkbox" data-set="minimap" ${st.minimap !== false ? 'checked' : ''}><span></span><em>Minimap<small>All of Eden in the corner: click or drag on it to jump there.</small></em></label>
      <label class="cl-check"><input type="checkbox" data-set="navButtons" ${st.navButtons !== false ? 'checked' : ''}><span></span><em>Navigation buttons<small>Zoom, rotate, tilt and home buttons over the map, for trackpads.</small></em></label>
      <label class="cl-field"><em>Scrolling<small>Two-finger scroll on a trackpad, or a mouse wheel. Pinch (or Ctrl + scroll) always zooms.</small></em>
        <select data-setsel="wheel">${[['auto', 'Auto: pan on a trackpad, zoom with a mouse wheel'], ['pan', 'Pan the map (trackpad)'], ['zoom', 'Zoom (mouse wheel)']].map(([v, l]) => `<option value="${v}" ${(st.wheel || 'auto') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${musicHtml()}
      <p class="cl-dim">The colony autosaves every 10 days in this browser. Keys: space pause · 1 / 2 / 3 speed · R build again · T research · G defence · M music · WASD / arrows pan · Q / E rotate · Esc cancel · F1 or ? how to play.</p>`;
    for (const c of pops.settings.querySelectorAll('[data-set]')) c.onchange = () => { api.setSetting(c.dataset.set, c.checked); helpersShown(); };
    for (const c of pops.settings.querySelectorAll('[data-setsel]')) c.onchange = () => api.setSetting(c.dataset.setsel, c.value);
    const mus = pops.settings.querySelector('[data-music]'), setup = pops.settings.querySelector('[data-musicsetup]');
    if (mus) mus.onchange = () => api.audio.setMuted(!mus.checked);
    if (setup) setup.onclick = () => { setup.disabled = true; api.audio.setUp().then(() => { renderSettings(); toast('Earth Light music is ready.', 'good'); }).catch((e) => { setup.disabled = false; toast(e.message || 'No ROM chosen.', 'bad'); }); };
  }
  // Earth Light's own music, from the expansion's sound pack (js/colony/audio.js).
  function musicHtml() {
    const a = api.audio;
    if (!a) return '';
    return a.available
      ? `<label class="cl-check"><input type="checkbox" data-music ${a.muted ? '' : 'checked'}><span></span><em>Music<small>Earth Light's own songs, from your ROM's sound pack.</small></em></label>`
      : `<div class="cl-field"><em>Music<small>${esc(a.why || 'Earth Light music needs your ROM once.')}</small></em>
         <button type="button" class="cl-btn sm" data-musicsetup>Set up Earth Light music</button></div>`;
  }

  // ---------------------------------------------------------------- research panel (version 2)
  // Four branches as columns (stacked on phones); a card per tech. The structure re-renders when a
  // tech's state changes; progress bars and numbers are updated in place every tick.
  const resEl = $('.cl-research'), resCols = $('[data-rcols]'), resStats = $('[data-rstats]'), resNote = $('[data-rnote]');
  let resSig = '', resFlash = null;
  const effectText = (e) => {
    const nm = BUILDING[e.key]?.name || e.key, pct = (m) => `${m > 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}%`;
    if (e.kind === 'output') return `${nm}: output ${pct(e.mult)}`;
    if (e.kind === 'storage') return `${nm}: storage ${pct(e.mult)}`;
    if (e.kind === 'cost') return `${nm}: cost ${pct(e.mult)}`;
    if (e.kind === 'pressurise') return `Pressurising: air ${pct(e.mult)}`;
    if (e.kind === 'survey') return `Surveys: cost ${pct(e.mult)}${e.days ? `, ${e.days} day${e.days === 1 ? '' : 's'}` : ''}`;
    if (e.kind === 'machines') return `Arsenal: tier ${e.tier} machines`;
    return e.kind;
  };
  const pic = (key) => { const u = api.art?.(`card/${key}`); return u ? `<img src="${esc(u)}" alt="" loading="lazy">` : BUILDING[key] ? cardIcon(BUILDING[key]) : ''; };
  const techState = (t) => t.done ? 'done' : t.focus ? 'focus' : t.available ? 'avail' : 'locked';

  function techCard(t, byKey, perDay) {
    const st = techState(t), T0 = TECH[t.key] || {}, needs = t.needs || T0.needs || [], unlocks = t.unlocks || T0.unlocks || [];
    const missing = needs.filter((n) => !byKey[n]?.done).map((n) => byKey[n]?.name || TECH[n]?.name || n);
    const badge = { done: '✓ Done', focus: '◉ Studying', avail: 'Study', locked: '🔒 Locked' }[st];
    const un = unlocks.map((k) => `<span class="cl-tun" title="${esc(BUILDING[k]?.text || '')}"><span class="cl-tunpic">${pic(k)}</span><small>${esc(BUILDING[k]?.name || k)}</small></span>`).join('');
    const fx = (T0.effects || []).map((e) => `<li>▲ ${esc(effectText(e))}</li>`).join('');
    return `<article class="cl-tech st-${st}" data-tech="${esc(t.key)}" style="--bc:${BRANCH_COLOR[t.branch] || 'var(--cyan)'}"${st === 'avail' ? ` tabindex="0" role="button" aria-label="Study ${esc(t.name)}"` : ''}>
      <header><b>${esc(t.name)}</b><span class="cl-tstate">${badge}</span></header>
      <div class="cl-tprog"><span class="cl-tbar"><span data-tbar style="width:${Math.min(100, Math.round(100 * (t.progress || 0) / (t.cost || 1)))}%"></span></span>
        <small data-tnum>${techNum(t, perDay)}</small></div>
      ${un ? `<div class="cl-tunlocks">${un}</div>` : ''}
      ${fx ? `<ul class="cl-tfx">${fx}</ul>` : ''}
      <p class="cl-ttext">${esc(t.text || T0.text || '')}</p>
      ${needs.length ? `<p class="cl-tneeds">${missing.length && !t.done ? `Needs <b>${missing.map(esc).join('</b> and <b>')}</b>` : `After ${needs.map((n) => esc(byKey[n]?.name || TECH[n]?.name || n)).join(' and ')} ✓`}</p>` : ''}
    </article>`;
  }
  function techNum(t, perDay) {
    if (t.done) return `${num(t.cost)} pts`;
    const left = Math.max(0, (t.cost || 0) - (t.progress || 0));
    return `${num(t.progress || 0)} / ${num(t.cost)} pts${t.focus && perDay > 0 ? ` · ~${Math.ceil(left / perDay)} d` : ''}`;
  }

  function renderResearch(force) {
    if (resEl.hidden) return;
    const s = S(), list = techList(s), rs = researchOf(s), li = labInfo(s);
    const byKey = Object.fromEntries(list.map((t) => [t.key, t]));
    const sig = JSON.stringify(list.map((t) => [t.key, techState(t)])) + '|' + li.labs + '|' + (s.pop >= 80) + '|' + s.unlocked?.includes?.('lab');
    if (force || sig !== resSig) {
      resSig = sig;
      resCols.innerHTML = BRANCHES.map((br) => `<section class="cl-rbranch" style="--bc:${BRANCH_COLOR[br.key] || 'var(--cyan)'}">
        <h4>${esc(br.name)}<small>${esc(br.text)}</small></h4>
        ${list.filter((t) => t.branch === br.key).map((t) => techCard(t, byKey, li.perDay)).join('')}</section>`).join('');
      if (!li.labs) {
        const can = s.unlocked?.includes?.('lab') || s.pop >= 80;
        resNote.innerHTML = `<b>Build a Research Lab (at 80 colonists) to start research.</b> ${can ? 'The lab is in the Services menu.' : `You have ${num(s.pop)} colonists now.`} Meanwhile, look over the tree and pick what to study first.
          ${can ? '<button type="button" class="cl-btn sm primary" data-rshow>Show me: Research Lab</button>' : ''}`;
        resNote.hidden = false;
      } else resNote.hidden = true;
      if (resFlash) {
        const c = resCols.querySelector(`[data-tech="${CSS.escape(resFlash)}"]`);
        if (c) { c.classList.add('flash'); c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
        resFlash = null;
      }
    } else {
      for (const t of list) {   // numbers in place
        const c = resCols.querySelector(`[data-tech="${CSS.escape(t.key)}"]`); if (!c) continue;
        const w = `${Math.min(100, Math.round(100 * (t.progress || 0) / (t.cost || 1)))}%`, bar = c.querySelector('[data-tbar]'), n = c.querySelector('[data-tnum]'), txt = techNum(t, li.perDay);
        if (bar && bar.style.width !== w) bar.style.width = w;
        if (n && n.textContent !== txt) n.textContent = txt;
      }
    }
    const f = list.find((t) => t.focus), done = list.filter((t) => t.done).length;
    const html = `<span class="cl-rst" title="Research points a day from all labs (staffing and power count)"><i>Labs</i><b>${li.labs ? `+${num(li.perDay)}<small>/day</small>` : '–'}</b><em>${li.labs ? `${li.live} working${li.building ? ` · ${li.building} building` : ''}` : 'no lab yet'}</em></span>
      <span class="cl-rst" title="Points made while nothing is studied; they flow into the next tech"><i>Banked</i><b>${num(rs.points || 0)}</b><em>pts</em></span>
      <span class="cl-rst wide" title="The tech the labs work on"><i>Studying</i><b>${f ? esc(f.name) : '<span class="cl-dim">nothing</span>'}</b><em>${f ? esc(techNum(f, li.perDay)) : 'click a tech to study it'}</em></span>
      <span class="cl-rst" title="Techs finished"><i>Done</i><b>${done}<small>/${list.length}</small></b><em>techs</em></span>`;
    if (resStats.innerHTML !== html) resStats.innerHTML = html;
  }
  resCols.addEventListener('click', (e) => {
    const c = e.target.closest('.cl-tech.st-avail'); if (!c) return;
    study(c.dataset.tech);
  });
  resCols.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const c = e.target.closest?.('.cl-tech.st-avail'); if (!c) return;
    e.preventDefault(); study(c.dataset.tech);
  });
  resNote.addEventListener('click', (e) => { if (e.target.closest('[data-rshow]')) { closeResearch(); api.show?.({ build: 'lab' }); } });
  resEl.addEventListener('click', (e) => { if (e.target.closest('[data-close=research]')) closeResearch(); });
  function study(key) {
    const s = S();
    const r = typeof R.research === 'function' ? R.research(s, key) : { ok: false, msg: 'Research is not ready in this build yet.' };
    result(r && r.ok !== false && !r.msg ? { ok: true, msg: `Studying ${TECH[key]?.name || key}.` } : r);
    renderResearch(true);
  }
  function openResearch(key) {
    for (const p of Object.values(pops)) p.hidden = true;
    closeDefence();
    resFlash = key || null;
    resEl.hidden = false;
    $('.cl-build')?.classList.remove('open');
    renderResearch(true);
    if (!key) resCols.querySelector('.st-focus, .st-avail')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function closeResearch() { if (resEl.hidden) return false; resEl.hidden = true; return true; }
  function toggleResearch(key) { if (resEl.hidden || key) openResearch(key); else closeResearch(); }

  // ---------------------------------------------------------------- version 3: the Defence panel
  // Guardians, Production (the expansion's production list, by class), Commanders (and the wanderers
  // at the Lodge) and Raids (heat, the next raid, the last report). Every order goes through rules.js
  // (machineList, orderMachine, cancelOrder, assignCommander, setDepartment, inviteWanderer, ...);
  // each call is guarded, so a missing rule shows a "not ready" message instead of breaking the page.
  const rule = (name, s, ...a) => {
    const f = R[name]; if (typeof f !== 'function') return undefined;
    try { return f(s, ...a); } catch (e) { console.warn(`rules.${name} failed`, e); return undefined; }
  };
  const notReady = (what) => ({ ok: false, msg: `${what} is not ready in this build yet.` });
  const finishedOf = (s, key) => s.buildings.filter((b) => b.key === key && b.build === 0);
  // A machine's numbers: data/machines.js, else the expansion's units.json (beta guardians of other types).
  function mInfo(type) {
    const m = MACHINE[type]; if (m) return m;
    const t = api.types?.[type], pr = S().imported?.prices?.[type];
    if (t) return { type, name: t.name, code: String(t.code || '').trim(), cls: CAT_CLASS[t.category] || 'support', hp: t.hp, move: t.move, attack: t.attack ?? 0, defence: t.defence ?? 0, price: pr ?? Math.max(1, t.value) * t.hp, tier: 1 };
    return { type, name: `Machine ${type}`, code: '', cls: 'support', hp: 8, move: 0, attack: 0, defence: 0, price: pr ?? 24, tier: 1 };
  }
  const mainMode = (type) => { const w = (api.types?.[type]?.weapons || []).filter((x) => x && x.power).sort((a, b) => b.power - a.power)[0]; return w ? WEAPON_MODE[w.mode] || null : null; };
  const maxHp = (g) => mInfo(g.type).hp || g.hp || 1;
  const hpOf = (g) => Math.max(0, g.hp ?? maxHp(g));
  const crewCap = (s) => { const r = rule('crewCap', s); return Number.isFinite(r) ? r : 4 + 6 * finishedOf(s, 'barracks').length; };
  const cmdCap = (s) => { const r = rule('commanderCap', s); return Number.isFinite(r) ? r : BASE_COMMANDERS + PER_QUARTERS * finishedOf(s, 'quarters').length; };
  const commanders = (s) => Array.isArray(s.commanders) ? s.commanders : [{ key: 'general', loyalty: 100, injured: 0, dept: null }, { key: 'sato', loyalty: 80, injured: 0, dept: null }];
  // crewed: the rules' own flag when they keep one, else the first crewCap guardians in the list
  const isCrewed = (s, g, i) => g.crewed != null ? !!g.crewed : i < crewCap(s);
  function upkeepOf(g) {
    if ((g.free || 0) > 0) return 0;
    const base = Math.ceil((mInfo(g.type).price || 0) / 8);
    return COMMANDER[g.commander]?.perk === 'quartermaster' ? base / 2 : base;
  }
  function upkeepTotal(s) {
    const r = rule('machineUpkeep', s);
    if (Number.isFinite(r)) return r;
    if (Number.isFinite(r?.total)) return r.total;
    return (s.guardians || []).reduce((t, g) => t + upkeepOf(g), 0);
  }
  function gPower(s, g) {
    const r = rule('guardianPower', s, g); if (Number.isFinite(r)) return r;
    const m = mInfo(g.type); return ((m.attack || 0) + (m.defence || 0)) * hpOf(g) / maxHp(g) * (1 + 0.08 * (g.level || 0));
  }
  const batteries = (s) => finishedOf(s, 'emplacement').filter((b) => !(b.damaged > 0));
  function defenceTotal(s) {
    let d = 0;
    (s.guardians || []).forEach((g, i) => { if (isCrewed(s, g, i) && hpOf(g) > 0) d += gPower(s, g); });
    return d + 40 * batteries(s).length;
  }
  function raidsPossible(s) { const r = s.raid; return !!r && (s.pop >= 80 || !!s.flags?.unlock80 || r.count > 0 || !!r.coming || !!r.warned); }
  function raidEta(s) {
    const r = s.raid; if (!r) return null;
    if (r.coming?.day != null) return Math.max(0, r.coming.day - s.day);
    if (r.warned && Number.isFinite(r.next)) return Math.max(0, r.next - s.day);
    return null;
  }
  const raidStartDay = (s) => ((api.diff?.(s)?.key ?? s.difficulty) === 'easy' ? 60 : 35);
  const factionName = (f) => FACTION_NAME[String(f || '').toLowerCase()] || (f ? String(f).charAt(0).toUpperCase() + String(f).slice(1) : 'Unknown raiders');
  const fromText = (f) => FROM_TEXT[f] || (f ? `the ${f}` : 'somewhere out in the dark');
  const unitList = (units) => { const n = {}; for (const u of units || []) { const nm = mInfo(u?.type ?? u).name; n[nm] = (n[nm] || 0) + 1; } return Object.entries(n).map(([k, v]) => v > 1 ? `${k} ×${v}` : k).join(', '); };
  const sensorDays = (s) => 3 + 3 * Math.min(3, finishedOf(s, 'sensormast').length);
  const plural = (n, w) => `${num(n)} ${w}${n === 1 ? '' : 's'}`;

  // What makes heat (docs/COLONY-V3.md "Heat"), worked out from the state: the sim owns the number.
  function heatParts(s) {
    if (Array.isArray(s.raid?.heatParts)) return s.raid.heatParts.map((p) => [p.label ?? p[0], +(p.value ?? p[1]) || 0]);
    const parts = [['Colonists', s.pop / 20]];
    let v = s.stock.credits || 0;
    for (const g of SELLABLE) { try { v += (s.stock[g] || 0) * R.price(s, g); } catch { } }
    parts.push(['Riches in store', v / 2000]);
    parts.push(['Open chambers', 2 * s.chambers.filter((c) => c.status === 'open').length]);
    const sales = s.raid?.sales ?? s.raid?.sold;
    if (Number.isFinite(sales)) parts.push(['Sales, last 30 days', sales / 1000]);
    const jam = finishedOf(s, 'jammer').length;
    if (jam) parts.push(['Jammer Arrays', -Math.min(30, 10 * jam)]);
    if (commanders(s).some((c) => c.key === 'w_rook')) parts.push(['Cass Rook serving', 5]);
    return parts;
  }
  function heatWhy(s) {
    const r = s.raid || {}, eta = raidEta(s);
    return [`Heat ${Math.round(r.heat || 0)} / 100: how tempting Eden looks to raiders. The hotter it is, the sooner the next raid.`,
      'It drifts toward: ' + heatParts(s).map(([l, v]) => `${l.toLowerCase()} ${v >= 0 ? '+' : '−'}${num(Math.abs(v))}`).join(', ') + '. Paying tribute adds 10.',
      r.coming ? `Raiders on the way: ${eta ? plural(eta, 'day') + ' out' : 'here now'}.` : r.warned && eta != null ? `Sato's sensors: a raid in ${plural(eta, 'day')}.` : `No contact yet. Warnings come ${sensorDays(s)} days ahead (each Sensor Mast adds 3).`,
      'Click to open Defence (G).'].join('\n');
  }

  // ---- pictures: commanders' portraits (painted art, the expansion's SVG bust, or a drawn initial) and machine glyphs
  function face(key, ctx = '') {
    const c = COMMANDER[key] || { key, name: key };
    const url = c.portrait && api.art?.(c.portrait);
    if (url) return `<img src="${esc(url)}" alt="${esc(c.name)}" loading="lazy">`;
    const svg = c.svg && svgPortrait?.(c.svg);
    if (svg) { const u = `${c.svg}${String(ctx).replace(/\W/g, '')}x`; return svg.split(`id="${c.svg}`).join(`id="${u}`).split(`url(#${c.svg}`).join(`url(#${u}`); }
    const nm = String(c.name || key).replace(/^(Capt\.|The)\s+/, '');
    const ini = c.general ? '★' : nm.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    let h = 7; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    const col = c.general ? '#f5c542' : `hsl(${h} 75% 70%)`;
    return `<svg viewBox="0 0 100 120" role="img" aria-label="${esc(c.name || key)}"><rect width="100" height="120" fill="${c.general ? '#2a2108' : `hsl(${h} 40% 13%)`}"/>
      <circle cx="50" cy="50" r="36" fill="none" stroke="${col}" stroke-opacity=".35" stroke-dasharray="3 4"/><path d="M12 120 C16 96 32 86 50 86 C68 86 84 96 88 120 Z" fill="${col}" fill-opacity=".2"/>
      <text x="50" y="${c.general ? 66 : 62}" text-anchor="middle" font-family="Chakra Petch, sans-serif" font-weight="700" font-size="${c.general ? 44 : 32}" fill="${col}">${esc(ini)}</text></svg>`;
  }
  function eventFace(speaker) {
    const url = speaker && api.art?.(`portrait/${speaker}`);
    if (url) return `<img class="cl-portrait" src="${esc(url)}" alt="">`;
    const svg = speaker && svgPortrait?.(speaker);
    return svg ? `<span class="cl-portrait cl-svgface">${svg.split(`id="${speaker}`).join(`id="${speaker}ev`).split(`url(#${speaker}`).join(`url(#${speaker}ev`)}</span>` : '';
  }
  const ICON = {
    hu: 'M27 7h10v8H27z M19 17h26l4 17h-6l-3-9v13l4 19h-7l-3-14h-4l-3 14h-7l4-19V25l-3 9h-6z',
    planes: 'M32 5l5 18 20 13v6l-20-6-2 13 7 5v4l-10-3-10 3v-4l7-5-2-13-20 6v-6l20-13z',
    armour: 'M8 38h48l4 7-6 9H10l-6-9z M17 27h24l5 11H13z M41 30h19v4H41z',
    ships: 'M3 38h58l-9 12H13z M15 30h28v8H15z M23 21h9v9h-9z M44 33h14v5H44z',
    support: 'M13 52h38l-4-11H17z M21 41l5-13h12l5 13z M35 30l19-13 3 3-19 13z',
  };
  const machineIcon = (cls) => `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="${CLASS_COLOR[cls] || '#9aa'}" fill-opacity=".08"/><path d="${ICON[cls] || ICON.support}" fill="${CLASS_COLOR[cls] || '#9aa'}" fill-opacity=".75" stroke="#fff" stroke-opacity=".35" stroke-width="1"/></svg>`;
  const gradesHtml = (c) => `<div class="cl-grades">${CLASSES.map((k) => { const g = c.grades?.[k] || '–'; return `<span class="cl-grade g-${esc(g)}" title="${CLASS_NAME[k]}: grade ${esc(g)}"><i>${CLASS_NAME[k]}</i><b>${esc(g)}</b></span>`; }).join('')}</div>`;
  const statBars = (c) => `<div class="cl-cstats">${['might', 'wits', 'charm'].map((k) => `<span class="cl-cstat" title="${{ might: 'Might: battle', wits: 'Wits: management', charm: 'Charm: people' }[k]}"><i>${k}</i><span class="cl-cbar"><span style="width:${Math.max(0, Math.min(100, c[k] || 0))}%"></span></span><b>${c[k] ?? '–'}</b></span>`).join('')}</div>`;
  const traits = (c) => `<p class="cl-ctraits">${c.style ? `<span title="${esc(STYLES[c.style] || '')}"><i>Style</i> ${esc(c.style.charAt(0).toUpperCase() + c.style.slice(1))}</span>` : ''}${c.perk && PERKS[c.perk] ? `<span title="${esc(PERKS[c.perk].text)}"><i>Perk</i> ${esc(PERKS[c.perk].name)}</span>` : ''}${c.general ? '<span title="Power ×2, evasion ×2, level 9 in any machine"><i>General</i> ×3 power</span>' : ''}</p>`;

  // ---- live rendering: the structure re-renders only when it changes; numbers marked L() / W() update in place
  const liveSigs = new WeakMap();
  function liveRender(el, build) {
    const live = [];
    const L = (text, cls = '') => { live.push(String(text ?? '')); return `<span data-live="${live.length - 1}"${cls ? ` class="${cls}"` : ''}></span>`; };
    const W = (pct) => { live.push(Math.max(0, Math.min(100, Math.round(+pct || 0)))); return `data-livew="${live.length - 1}"`; };
    const html = build(L, W);
    if (liveSigs.get(el) !== html) { liveSigs.set(el, html); el.innerHTML = html; }
    for (const n of el.querySelectorAll('[data-live]')) { const v = live[+n.dataset.live] ?? ''; if (n.textContent !== v) n.textContent = v; }
    for (const n of el.querySelectorAll('[data-livew]')) { const v = `${live[+n.dataset.livew] ?? 0}%`; if (n.style.width !== v) n.style.width = v; }
  }

  // ---- the panel
  const defEl = $('.cl-defence'), defBody = $('[data-dbody]'), defStats = $('[data-dstats]');
  const DEF_KEY = 'el-colony-defence';
  const defPrefs = (() => { try { return JSON.parse(localStorage.getItem(DEF_KEY) || '{}') || {}; } catch { return {}; } })();
  const storeDef = () => { try { localStorage.setItem(DEF_KEY, JSON.stringify(defPrefs)); } catch { } };
  let defTab = DEF_TABS.some(([k]) => k === defPrefs.tab) ? defPrefs.tab : 'guardians';
  defPrefs.fold ??= {}; defPrefs.sort ??= 'price';

  function renderDefence(force) {
    if (defEl.hidden) return;
    const s = S();
    if (force) { liveSigs.delete(defBody); liveSigs.delete(defStats); }
    for (const t of defEl.querySelectorAll('[data-dtab]')) {
      const on = t.dataset.dtab === defTab;
      if (t.getAttribute('aria-selected') !== String(on)) t.setAttribute('aria-selected', String(on));
    }
    const counts = { guardians: (s.guardians || []).length || '', production: (s.production || []).length || '', commanders: (s.wanderers || []).length ? `+${s.wanderers.length}` : '', raids: s.raid?.coming || s.raid?.warned ? '!' : '' };
    for (const n of defEl.querySelectorAll('[data-dtabn]')) { const v = String(counts[n.dataset.dtabn] ?? ''); if (n.textContent !== v) n.textContent = v; }
    liveRender(defStats, (L) => defStatsHtml(s, L));
    const fn = { guardians: guardiansHtml, production: productionHtml, commanders: commandersHtml, raids: raidsHtml }[defTab];
    liveRender(defBody, (L, W) => `<div class="cl-dtab-${defTab}">${fn(s, L, W)}</div>`);
  }
  function defStatsHtml(s, L) {
    const gs = s.guardians || [], cap = crewCap(s), crewedN = gs.filter((g, i) => isCrewed(s, g, i)).length, free = gs.filter((g) => (g.free || 0) > 0).length;
    const cm = commanders(s), heatOn = raidsPossible(s), eta = raidEta(s);
    return `<span class="cl-rst" title="Guardian machines; the crewed ones fight. The Command Centre crews 4, each Guardian Barracks 6 more."><i>Guardians</i><b>${L(gs.length)}</b><em>${L(`${crewedN} / ${cap} crewed`)}</em></span>
      <span class="cl-rst" title="Strength in a raid: the crewed, working guardians plus 40 per Battery Emplacement"><i>Defence</i><b>${L(num(defenceTotal(s)))}</b><em>${L(`${batteries(s).length} ${batteries(s).length === 1 ? 'battery' : 'batteries'}`)}</em></span>
      <span class="cl-rst" title="Credits a day for the machines (an eighth of each price; free while a beta machine's free days last)"><i>Upkeep</i><b>${L(num(upkeepTotal(s)))}<small>/day</small></b><em>${L(free ? `${free} free` : 'credits')}</em></span>
      <span class="cl-rst" title="Commanders serving / room (two, plus two per Officers' Quarters)"><i>Commanders</i><b>${L(`${cm.length}`)}<small>${L(`/${cmdCap(s)}`)}</small></b><em>${L((s.wanderers || []).length ? `${s.wanderers.length} at the Lodge` : 'serving')}</em></span>
      ${heatOn ? `<span class="cl-rst cl-rsheat" title="${esc(heatWhy(s))}"><i>Heat</i><b>${L(Math.round(s.raid.heat || 0))}</b><em>${L(s.raid.coming ? (eta ? `raid in ${eta} d` : 'raiders here') : s.raid.warned && eta != null ? `raid in ${eta} d` : 'no contact')}</em></span>` : ''}`;
  }
  const note = (html, cls = '') => `<div class="cl-rnote cl-dnote ${cls}">${html}</div>`;
  const showBtn1 = (key) => `<button type="button" class="cl-btn sm primary" data-dshow="${esc(key)}">Show me: ${esc(BUILDING[key]?.name || key)}</button>`;

  // -- Guardians
  function guardiansHtml(s, L, W) {
    const gs = s.guardians || [];
    if (!gs.length) return note(`<b>No guardians yet.</b> ${s.unlocked?.includes?.('arsenal') ? 'Build an <b>Arsenal</b> (Defence menu), then order machines in Production.' : `The Arsenal opens at 80 colonists (you have ${num(s.pop)}).`}
      ${s.unlocked?.includes?.('arsenal') ? showBtn1('arsenal') : ''}<button type="button" class="cl-btn sm" data-dgo="production">Production</button>`);
    const cap = crewCap(s), cm = commanders(s), yard = finishedOf(s, 'scrapyard').length > 0;
    const uncrewed = gs.filter((g, i) => !isCrewed(s, g, i)).length;
    const opts = (g) => `<option value="">No commander</option>${cm.map((c) => { const C = COMMANDER[c.key] || {}, other = (s.guardians || []).find((x) => x.commander === c.key && x.id !== g.id);
      return `<option value="${esc(c.key)}" ${g.commander === c.key ? 'selected' : ''} ${c.injured > 0 ? 'disabled' : ''}>${esc(C.name || c.key)}${c.injured > 0 ? ' (injured)' : other ? ` (in ${esc(mInfo(other.type).name)})` : ''}</option>`; }).join('')}`;
    const rows = gs.map((g, i) => {
      const m = mInfo(g.type), mh = maxHp(g), hp = hpOf(g), crew = isCrewed(s, g, i), up = upkeepOf(g), sale = salePrice(s, g);
      const status = hp <= 0 ? '<b class="bad">Wrecked</b>' : !crew ? '<b class="bad">No crew</b>' : hp < mh ? (yard ? '<b class="warn">Repairing</b>' : '<b class="warn">Damaged</b>') : '<b class="good">Ready</b>';
      const lv = Math.max(0, Math.min(9, g.level || 0));
      return `<article class="cl-grow${crew ? '' : ' nocrew'}${hp < mh ? ' hurt' : ''}" style="--mc:${CLASS_COLOR[m.cls] || '#9aa'}">
        <span class="cl-gicon">${machineIcon(m.cls)}</span>
        <div class="cl-gname"><b>${esc(m.name)}</b><small>${esc(m.code || '')}${m.code ? ' · ' : ''}${esc(CLASS_NAME[m.cls] || m.cls)}</small></div>
        <div class="cl-glv" title="Level ${lv}: +${lv * 8}% power"><span class="cl-pips">${Array.from({ length: 9 }, (_, k) => `<i${k < lv ? ' class="on"' : ''}></i>`).join('')}</span><small>L${lv}</small></div>
        <div class="cl-ghp" title="Hull points${hp < mh ? (yard ? ': the Scrapyard repairs 2 a day for a part each' : ': build a Scrapyard to repair it') : ''}"><span class="cl-hpbar${hp / mh < 0.34 ? ' low' : hp < mh ? ' mid' : ''}"><span ${W(100 * hp / mh)}></span></span><small>${L(`${num(hp)} / ${num(mh)} HP`)}</small></div>
        <label class="cl-gcmd" title="The commander flying it">${g.commander ? `<span class="cl-mface">${face(g.commander, 'g' + g.id)}</span>` : ''}<select data-gassign="${g.id}" aria-label="Commander of this ${esc(m.name)}">${opts(g)}</select></label>
        <div class="cl-gnum" title="Strength in a raid"><i>Power</i><b>${L(num(gPower(s, g)))}</b></div>
        <div class="cl-gnum" title="Upkeep a day${(g.free || 0) > 0 ? ': free while its free days last' : ''}"><i>Upkeep</i><b>${(g.free || 0) > 0 ? `<span class="good">free</span> <small>${L(`${Math.ceil(g.free)} d`)}</small>` : `${num(up)} <small>cr/d</small>`}</b></div>
        <div class="cl-gstat">${status}</div>
        <button type="button" class="cl-btn xs" data-gsell="${g.id}" ${sale.ok ? '' : 'disabled'} title="${esc(sale.ok ? `Sell at the dock for ${num(sale.credits)} credits and ${num(sale.parts)} parts${yard ? ' (Scrapyard: a fifth more)' : ''}` : sale.msg)}">Sell <small>${num(sale.credits)} cr</small></button>
      </article>`;
    }).join('');
    return `${uncrewed ? note(`<b>${plural(uncrewed, 'machine')} without a crew</b> stay${uncrewed === 1 ? 's' : ''} in the hangar when raiders come. Crews: ${cap} (the Command Centre 4, each Guardian Barracks 6).${s.unlocked?.includes?.('barracks') ? showBtn1('barracks') : ''}`, 'warn') : ''}
      ${gs.some((g) => hpOf(g) < maxHp(g)) && !yard ? note(`Damaged machines fight weaker. A <b>Scrapyard</b> repairs them, 2 HP a day each for a part per HP.${s.unlocked?.includes?.('scrapyard') ? showBtn1('scrapyard') : ''}`) : ''}
      <div class="cl-glist">${rows}</div>
      <p class="cl-dim">Machines are sold at the dock${yard ? ' (the Scrapyard adds a fifth)' : ''}. Guardians eat no food. Survivors of a raid gain levels.</p>`;
  }
  // What a guardian sells for: the rules' sellGuardian tried on a light copy (it only touches these fields).
  function salePrice(s, g) {
    const c = { ...s, guardians: (s.guardians || []).map((x) => ({ ...x })), stock: { ...s.stock }, log: [], flags: { ...s.flags }, commanders: s.commanders?.map((x) => ({ ...x })), raid: s.raid && { ...s.raid } };
    const cr = c.stock.credits || 0, pa = c.stock.parts || 0, r = rule('sellGuardian', c, g.id);
    if (r && r.ok !== false) return { ok: true, credits: (c.stock.credits || 0) - cr, parts: (c.stock.parts || 0) - pa };
    const p = mInfo(g.type).price, f = finishedOf(s, 'scrapyard').length ? 1.2 : 1;
    return { ok: false, msg: r?.msg || 'Selling is not ready in this build yet.', credits: Math.round(p * 10 * f), parts: Math.round(p * f) };
  }

  // -- Production
  function machineTier(s) {
    const r = rule('techEffect', s, 'machines');
    if (Number.isFinite(r) && r >= 1) return r;
    let t = 1; for (const k of researchOf(s).done || []) for (const e of TECH[k]?.effects || []) if (e.kind === 'machines') t = Math.max(t, e.tier);
    return t;
  }
  function machineRows(s) {
    const r = rule('machineList', s);
    if (Array.isArray(r) && r.length) return r;
    const tier = machineTier(s), yard = finishedOf(s, 'shipyard').length > 0, ars = finishedOf(s, 'arsenal').length > 0;
    return MACHINES.map((m) => {
      let cost = MACHINE_COST(m); try { cost = R.costOf?.(s, cost) || cost; } catch { }
      const owned = (s.guardians || []).some((g) => g.type === m.type) || (s.production || []).some((o) => o.type === m.type);
      const why = m.tier > tier ? `Research ${TECH[TIER_TECH[m.tier]]?.name || 'more machine tech'}.` : m.at === 'shipyard' && !yard ? 'Build a Shipyard.' : !ars && m.at === 'arsenal' ? 'Build an Arsenal.'
        : m.unique && owned ? `Only one ${m.name} may serve at a time.` : (s.stock.credits || 0) < cost.credits ? `Needs ${num(cost.credits)} credits.` : (s.stock.parts || 0) < cost.parts ? `Needs ${num(cost.parts)} parts.` : '';
      return { ...m, cost, ok: !why, why };
    });
  }
  const buildDays = (m) => Math.max(2, Math.ceil((m.price || 0) / 4));
  // A lock reason that points somewhere: a tech (Research) or a building to put up.
  function lockLink(s, m) {
    const why = m.why || '', tier = machineTier(s);
    if (m.tier > tier && TIER_TECH[m.tier]) return { tech: TIER_TECH[m.tier] };
    if (/research/i.test(why)) { const t = TECHS.find((x) => why.includes(x.name)); if (t) return { tech: t.key }; }
    if (/shipyard/i.test(why)) return techDone(s, 'shipyard') ? { build: 'shipyard' } : { tech: 'shipyard' };
    if (/arsenal/i.test(why)) return { build: 'arsenal' };
    return null;
  }
  function productionHtml(s, L, W) {
    const yards = s.buildings.filter((b) => BUILDING[b.key]?.builds);
    const orders = s.production || [];
    let queue;
    if (!yards.length && !orders.length) {
      queue = note(`<b>Machines are built at an Arsenal</b>${s.unlocked?.includes?.('arsenal') ? ' (Defence menu).' : `, which opens at 80 colonists (you have ${num(s.pop)}).`} Capital ships need a Shipyard (research). Meanwhile, look over what it could build.${s.unlocked?.includes?.('arsenal') ? showBtn1('arsenal') : ''}`);
    } else {
      const byAt = new Map(yards.map((b) => [b.id, []]));
      const lost = [];
      for (const o of orders) (byAt.get(o.at) || lost).push(o);
      const orderRow = (o, k) => {
        const m = mInfo(o.type), total = buildDays(m), left = Math.max(0, o.days ?? total);
        return `<div class="cl-order${k === 0 ? ' on' : ''}" style="--mc:${CLASS_COLOR[m.cls] || '#9aa'}"><span class="cl-oicon">${machineIcon(m.cls)}</span>
          <span class="cl-oname"><b>${esc(m.name)}</b><small>${k === 0 ? 'building' : `waiting · #${k + 1}`}</small></span>
          <span class="cl-obar"><span ${W(k === 0 ? 100 * (1 - left / total) : 0)}></span></span>
          <span class="cl-odays">${L(k === 0 ? `${num(left)} d left` : `${num(total)} d`)}</span>
          <button type="button" class="cl-btn xs" data-ocancel="${o.id}" title="Cancel: the full price comes back">Cancel</button></div>`;
      };
      queue = `<div class="cl-yards">${yards.map((b) => {
        const d = BUILDING[b.key], list = byAt.get(b.id) || [];
        const st = b.build > 0 ? `being built · ${b.build} d` : b.damaged > 0 ? `damaged · ${b.damaged} d` : b.off ? 'switched off' : list.length ? 'working' : 'idle';
        return `<div class="cl-yard"><header><b>${esc(d.name)}</b><small class="${b.build > 0 || b.damaged > 0 || b.off ? 'bad' : list.length ? 'good' : ''}">${esc(st)}</small></header>
          ${list.map(orderRow).join('') || '<p class="cl-dim">Nothing ordered: pick a machine below.</p>'}</div>`;
      }).join('')}${lost.length ? `<div class="cl-yard"><header><b>Waiting for a yard</b></header>${lost.map(orderRow).join('')}</div>` : ''}</div>`;
    }
    const rows = machineRows(s), tier = machineTier(s);
    const key = { price: (a, b) => a.price - b.price || a.name.localeCompare(b.name), name: (a, b) => a.name.localeCompare(b.name), tier: (a, b) => a.tier - b.tier || a.price - b.price, attack: (a, b) => b.attack - a.attack }[defPrefs.sort] || ((a, b) => a.price - b.price);
    const card = (m) => {
      const link = m.ok ? null : lockLink(s, m), afford = !m.ok && !link, cost = m.cost || MACHINE_COST(m), mode = mainMode(m.type);
      return `<article class="cl-mach${m.ok ? ' ok' : link ? ' locked' : ' poor'}" style="--mc:${CLASS_COLOR[m.cls] || '#9aa'}" title="${esc(`${m.name} (${m.code}): HP ${m.hp}, move ${m.move}, evasion ${m.evasion ?? '?'}, attack ${m.attack}, defence ${m.defence}${mode ? `, mainly ${mode.toLowerCase()}` : ''}. Upkeep ${Math.ceil(m.price / 8)} credits a day.`)}">
        <span class="cl-micon">${machineIcon(m.cls)}</span>
        <div class="cl-mhead"><b>${esc(m.name)}</b><small>${esc(m.code)} · T${m.tier}${m.at === 'shipyard' ? ' · shipyard' : ''}${m.unique ? ' · unique' : ''}</small></div>
        <div class="cl-mstats"><span><i>HP</i><b>${m.hp}</b></span><span><i>Move</i><b>${m.move}</b></span><span><i>Atk</i><b>${m.attack}</b></span><span><i>Def</i><b>${m.defence}</b></span></div>
        <div class="cl-mfoot"><span class="cl-mcost${afford ? ' poor' : ''}">${num(cost.credits)} <small>cr</small> · ${num(cost.parts)} <small>parts</small> · ${buildDays(m)} <small>d</small></span>
          <button type="button" class="cl-btn xs${m.ok ? ' primary' : ''}" data-morder="${m.type}" ${m.ok ? '' : 'disabled'}>Order</button></div>
        ${m.ok ? '' : link ? `<button type="button" class="cl-mwhy" ${link.tech ? `data-mtech="${esc(link.tech)}"` : `data-dshow="${esc(link.build)}"`}>${link.tech ? '⚗' : '🔒'} ${esc(m.why || `Research ${TECH[link.tech]?.name}.`)} <i>›</i></button>` : `<p class="cl-mwhy poor">${esc(m.why)}</p>`}
      </article>`;
    };
    const groups = CLASSES.map((c) => [c, rows.filter((m) => m.cls === c).sort(key)]).filter(([, l]) => l.length).map(([c, l]) => {
      const ready = l.filter((m) => m.ok).length;
      return `<details class="cl-mclass" data-mfold="${c}" ${defPrefs.fold[c] ? '' : 'open'} style="--mc:${CLASS_COLOR[c]}"><summary>${esc(CLASS_NAME[c])} <small>${l.length} · ${ready} ready</small></summary><div class="cl-mgrid">${l.map(card).join('')}</div></details>`;
    }).join('');
    return `<section class="cl-dsec"><h4>Queue <small>one machine at a time per yard; Cancel refunds in full</small></h4>${queue}</section>
      <section class="cl-dsec"><h4>Machines <small>tier ${tier} of 4 · credits = price × 10, parts = price</small>
        <select class="cl-msort" data-msort title="Sort">${[['price', 'price'], ['tier', 'tier'], ['attack', 'attack'], ['name', 'name']].map(([k, n]) => `<option value="${k}" ${defPrefs.sort === k ? 'selected' : ''}>Sort: ${n}</option>`).join('')}</select></h4>
        <p class="cl-dim">Each machine comes with a crew at level 0. Credits ${L(num(s.stock.credits))} · parts ${L(num(s.stock.parts))}.</p>${groups}</section>`;
  }

  // -- Commanders
  function inviteChance(s, w) {
    const r = rule('inviteChance', s, w.key); if (Number.isFinite(r)) return r;
    const loyalty = w.loyalty ?? COMMANDER[w.key]?.loyalty ?? 50;
    return Math.max(0.05, Math.min(0.95, 0.3 + GENERAL.charm / 220 - 0.03 * (commanders(s).length - 2) + (100 - loyalty) / 400));
  }
  function commandersHtml(s, L, W) {
    const cm = commanders(s), cap = cmdCap(s), gs = s.guardians || [], heads = {};
    for (const c of cm) if (c.dept) heads[c.dept] = c.key;
    const ready = Array.isArray(s.commanders);
    const card = (c) => {
      const C = COMMANDER[c.key] || { name: c.key, grades: {} }, g = gs.find((x) => x.commander === c.key), loy = Math.round(c.loyalty ?? C.loyalty ?? 50);
      return `<article class="cl-cmd${c.injured > 0 ? ' injured' : ''}${C.general ? ' gen' : ''}">
        <span class="cl-face">${face(c.key, 'c')}</span>
        <div class="cl-cbody">
          <header><b>${esc(C.name)}</b><small>${esc(C.title || '')}</small></header>
          ${statBars(C)}${gradesHtml(C)}${traits(C)}
          <div class="cl-cmeta">
            ${C.general ? '<span><i>Loyalty</i><b class="good">always</b></span>' : `<span title="Drifts toward 40 + happiness ÷ 2; unpaid wages lower it. Below 20 they may leave${C.perk === 'steady' ? ' (Steady: never)' : ''}."><i>Loyalty</i><span class="cl-cbar loy${loy < 25 ? ' low' : ''}"><span ${W(loy)}></span></span><b>${L(loy)}</b></span>`}
            <span><i>Wage</i><b>${C.wage ? `${C.wage} <small>cr/d</small>` : '–'}</b></span>
            ${c.injured > 0 ? `<span class="bad"><i>Injured</i><b>${L(`${Math.ceil(c.injured)} d`)}</b></span>` : ''}
            <span><i>Flies</i><b>${g ? esc(mInfo(g.type).name) : '<span class="cl-dim">nothing</span>'}</b></span>
          </div>
          ${C.text ? `<p class="cl-ctext">${esc(C.text)}</p>` : ''}
          <div class="cl-cacts">
            <label><i>Pilots</i><select data-cassign="${esc(c.key)}" ${ready && !(c.injured > 0) ? '' : 'disabled'}><option value="">No machine</option>${gs.map((x) => { const o = x.commander && x.commander !== c.key ? COMMANDER[x.commander]?.name : '';
              return `<option value="${x.id}" ${x.commander === c.key ? 'selected' : ''}>${esc(mInfo(x.type).name)} L${x.level || 0}${o ? ` (${esc(o)})` : ''}</option>`; }).join('')}</select></label>
            <label><i>Heads</i><select data-cdept="${esc(c.key)}" ${ready ? '' : 'disabled'}><option value="">No department</option>${Object.entries(DEPARTMENTS).map(([k, d]) => `<option value="${k}" ${c.dept === k ? 'selected' : ''}>${esc(d.name)} (+${Math.round((C[d.stat] || 0) / 10)}%)${heads[k] && heads[k] !== c.key ? ` · ${esc(COMMANDER[heads[k]]?.name || heads[k])}` : ''}</option>`).join('')}</select></label>
            ${C.general || c.key === 'sato' ? '' : `<button type="button" class="cl-btn xs warn" data-cdismiss="${esc(c.key)}" title="They leave, and may come back to the Lodge later">Dismiss</button>`}
          </div>
        </div></article>`;
    };
    const lodge = s.buildings.filter((b) => b.key === 'lodge' && b.build === 0);
    const ws = s.wanderers || [];
    const wcard = (w) => {
      const C = COMMANDER[w.key] || { name: w.key, grades: {} }, ch = inviteChance(s, w), left = w.until != null ? Math.max(0, w.until - s.day) : null;
      const full = cm.length >= cap, poor = (s.stock.credits || 0) < 100;
      const why = full ? `No room: ${cm.length} / ${cap} commanders. Officers' Quarters make room for two more.` : poor ? 'The gift is 100 credits.' : '';
      return `<article class="cl-cmd wand">
        <span class="cl-face">${face(w.key, 'w')}</span>
        <div class="cl-cbody">
          <header><b>${esc(C.name)}</b><small>${esc(C.title || '')}</small></header>
          ${statBars(C)}${gradesHtml(C)}${traits(C)}
          ${C.flaw ? `<p class="cl-cflaw">⚠ ${esc(C.flaw)}</p>` : ''}
          <div class="cl-cmeta"><span><i>Wage</i><b>${C.wage} <small>cr/d</small></b></span><span><i>Loyalty</i><b>${Math.round(w.loyalty ?? C.loyalty ?? 50)}</b></span>${left != null ? `<span><i>Leaves in</i><b>${L(`${left} d`)}</b></span>` : ''}${w.asked ? `<span><i>Asked</i><b>${w.asked}×</b></span>` : ''}</div>
          <div class="cl-cacts"><span class="cl-chance" title="Chance they accept: better with the General's charm, worse the more commanders serve; each refusal makes the next try likelier"><span class="cl-cbar"><span ${W(ch * 100)}></span></span><b>${L(`${Math.round(ch * 100)}%`)}</b></span>
            <button type="button" class="cl-btn xs primary" data-winvite="${esc(w.key)}" ${why ? 'disabled' : ''} title="${esc(why || 'Invite them to serve, with a gift of 100 credits')}">Invite <small>100 cr</small></button></div>
          ${why ? `<p class="cl-why">${esc(why)}</p>` : ''}
        </div></article>`;
    };
    const lodgeNote = !lodge.length ? note(`<b>Wanderers</b> stop at a <b>Wanderers' Lodge</b>: pilots, captains and engineers adrift since the war. ${techDone(s, 'leadership') ? 'Build one (Services menu).' + showBtn1('lodge') : 'Research <b>Leadership</b> (Society) to build one.<button type="button" class="cl-btn sm" data-mtech="leadership">Research: Leadership</button>'}`)
      : !ws.length ? `<p class="cl-dim">Nobody at the Lodge right now. A wanderer stops by every ${{ 1: 15, 2: 10, 3: 7 }[Math.max(...lodge.map((b) => b.level || 1))] || 15} days and stays 20.</p>` : '';
    return `${ready ? '' : note('Commanders are not ready in this build yet: these are the two you will start with.', 'warn')}
      <section class="cl-dsec"><h4>Commanders <small>${cm.length} / ${cap} · wages ${num(cm.reduce((t, c) => t + (COMMANDER[c.key]?.wage || 0), 0))} cr a day</small></h4>
        <div class="cl-cgrid">${cm.map(card).join('')}</div>
        ${cm.length >= cap && techDone(s, 'leadership') ? `<p class="cl-dim">Room for no more: each <b>Officers' Quarters</b> houses two more commanders.</p>` : ''}</section>
      <section class="cl-dsec"><h4>Wanderers at the Lodge <small>${ws.length ? `${ws.length} here` : ''}</small></h4>${lodgeNote}<div class="cl-cgrid">${ws.map(wcard).join('')}</div></section>
      <section class="cl-dsec"><h4>Departments <small>one head each: + stat ÷ 10 %</small></h4><div class="cl-depts">${Object.entries(DEPARTMENTS).map(([k, d]) => {
        const h = heads[k], C = COMMANDER[h];
        return `<div class="cl-dept${h ? ' on' : ''}"><span class="cl-mface">${h ? face(h, 'd' + k) : ''}</span><div><b>${esc(d.name)}</b><small>${esc(d.text)} · ${esc(d.stat)}</small><em>${C ? `${esc(C.name)} · +${Math.round((C[d.stat] || 0) / 10)}%` : 'no head'}</em></div></div>`;
      }).join('')}</div></section>`;
  }

  // -- Raids
  function reportHtml(s, rep) {
    if (!rep) return '<p class="cl-dim">No raid yet.</p>';
    const paid = rep.tribute && !rep.won && (typeof rep.tribute === 'number' ? rep.tribute > 0 : Object.values(rep.tribute).some((v) => v > 0));
    const kind = paid ? 'tribute' : rep.won ? 'won' : 'lost';
    const goods = (o) => Object.entries(o || {}).filter(([, v]) => v > 0).map(([k, v]) => `${num(v)} ${(GOOD_NAME[k] || k).toLowerCase()}`).join(', ');
    const dmg = (rep.damaged || []).map((id) => BUILDING[s.buildings.find((b) => b.id === id)?.key]?.name || 'a building');
    const trib = typeof rep.tribute === 'number' ? `${num(rep.tribute)} credits` : goods(rep.tribute);
    const kv = (k, v, cls = '') => `<div class="cl-kv"><span>${k}</span><b class="${cls}">${v}</b></div>`;
    return `<div class="cl-report ${kind}"><header><b>${{ won: 'Raid beaten off', lost: 'Raid lost', tribute: 'Tribute paid' }[kind]}</b><small>Day ${rep.day} · ${esc(factionName(rep.faction))} from ${esc(fromText(rep.from))}</small></header>
      ${kind !== 'tribute' ? kv('Machines lost', rep.lostGuardians?.length ? esc(unitList(rep.lostGuardians.map((t) => ({ type: t })))) : 'none', rep.lostGuardians?.length ? 'bad' : 'good') : ''}
      ${dmg.length ? kv('Buildings damaged', esc(dmg.join(', ')), 'bad') : ''}
      ${goods(rep.stolen) ? kv('Stolen', esc(goods(rep.stolen)), 'bad') : ''}
      ${goods(rep.salvage) ? kv('Salvage', '+' + esc(goods(rep.salvage)), 'good') : ''}
      ${paid ? kv('Tribute', esc(trib)) : ''}</div>`;
  }
  function raidsHtml(s, L, W) {
    const r = s.raid;
    if (!r) return note('Raids are not ready in this build yet.', 'warn');
    const on = raidsPossible(s), eta = raidEta(s), heat = Math.round(r.heat || 0);
    const gs = s.guardians || [], cap = crewCap(s), crewedN = gs.filter((g, i) => isCrewed(s, g, i) && hpOf(g) > 0).length;
    const n = (k) => finishedOf(s, k).length, emp = finishedOf(s, 'emplacement');
    const dragons = emp.filter((b) => (b.mode ?? 'dragon') === 'dragon').length;
    const parts = heatParts(s);
    let next;
    if (!on) next = `<p>No raids yet. Raiders take notice once Eden has <b>80 colonists</b> (you have ${num(s.pop)}), and not before <b>day ${raidStartDay(s)}</b>.</p>`;
    else if (r.coming) {
      const c = r.coming, pv = rule('raidPreview', s);
      next = `<div class="cl-raidnow"><b class="bad">Raiders ${eta ? `arrive in ${L(plural(eta, 'day'))}` : 'are here'}</b>
        <p>${esc(factionName(c.faction))}${RAID_TIER[c.tier] ? ` (${RAID_TIER[c.tier]})` : ''} from ${esc(fromText(c.from))}: ${plural(c.units?.length || 0, 'machine')}${c.units?.length ? ` · ${esc(unitList(c.units))}` : ''}.</p>
        ${pv ? winBar(pv, L, W) : ''}</div>`;
    } else if (r.warned && eta != null) next = `<p><b class="warn">Sato's sensors: raiders in ${L(plural(eta, 'day'))}.</b>${r.from ? ` From ${esc(fromText(r.from))}.` : ''} Get the guardians crewed and repaired.</p>`;
    else next = `<p>No contact. Sato warns you <b>${sensorDays(s)} days</b> before a raid${n('sensormast') < 3 ? '; each Sensor Mast adds 3 (up to 9)' : ''}.</p>`;
    return `<div class="cl-raidcols">
      <section class="cl-dsec"><h4>Heat <small>how tempting Eden looks</small></h4>
        <div class="cl-heat"><span class="cl-heatbar"><span ${W(heat)}></span></span><b>${L(heat)}</b></div>
        <p class="cl-dim">The hotter Eden is, the sooner the next raid comes. Heat moves a tenth of the way each day toward:</p>
        <table class="cl-table"><tbody>${parts.map(([l, v]) => `<tr><td>${esc(l)}</td><td class="n ${v > 0 ? 'bad' : v < 0 ? 'good' : ''}">${L(`${v >= 0 ? '+' : '−'}${num(Math.abs(v))}`)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Target <small>(0–100)</small></td><td class="n">${L(num(Math.max(0, Math.min(100, parts.reduce((t, [, v]) => t + v, 0)))))}</td></tr></tfoot></table>
        <p class="cl-dim">Paying tribute adds 10. Jammer Arrays take 10 off each (up to 30).</p></section>
      <section class="cl-dsec"><h4>Next raid</h4>${next}</section>
      <section class="cl-dsec"><h4>Defences <small>total ${L(num(defenceTotal(s)))}</small></h4>
        <div class="cl-kv"><span>Crewed guardians</span><b class="${crewedN ? '' : 'bad'}">${L(`${crewedN} of ${gs.length} · crews ${cap}`)}</b></div>
        <div class="cl-kv"><span>Battery Emplacements</span><b>${emp.length ? `${emp.length} (${dragons} Dragon, ${emp.length - dragons} Hydra)` : '<span class="cl-dim">none</span>'}</b></div>
        <div class="cl-kv"><span>Shield Pylons</span><b>${n('shieldpylon') || '<span class="cl-dim">none</span>'}</b></div>
        <div class="cl-kv"><span>Sensor Masts</span><b>${n('sensormast') ? `${n('sensormast')} · warning ${sensorDays(s)} d` : '<span class="cl-dim">none</span>'}</b></div>
        <div class="cl-kv"><span>Jammer Arrays</span><b>${n('jammer') || '<span class="cl-dim">none</span>'}</b></div>
        ${(() => { const h = commanders(s).find((c) => c.dept === 'security'); return h ? `<div class="cl-kv"><span>Security head</span><b>${esc(COMMANDER[h.key]?.name || h.key)} +${Math.round((COMMANDER[h.key]?.might || 0) / 10)}%</b></div>` : ''; })()}
        <div class="cl-acts"><button type="button" class="cl-btn sm" data-dgo="guardians">Guardians</button><button type="button" class="cl-btn sm" data-dgo="production">Production</button></div></section>
      <section class="cl-dsec"><h4>Last raid <small>${r.count ? `${r.count} so far · ${r.won || 0} won · ${r.lost || 0} lost` : ''}</small></h4>${reportHtml(s, r.last)}</section></div>`;
  }
  function winBar(pv, L, W) {
    const raw = +pv.winChance, pct = Number.isFinite(raw) ? Math.round(raw <= 1 ? raw * 100 : raw) : null;
    const lost = pv.expectedLost || [];
    const dmg = pv.expectedDamage;
    const trib = pv.tribute ? [pv.tribute.credits ? `${num(pv.tribute.credits)} credits` : '', pv.tribute.food ? `${num(pv.tribute.food)} food` : ''].filter(Boolean).join(' + ') : '';
    return `<div class="cl-win-chance${pct == null ? '' : pct >= 65 ? ' good' : pct >= 40 ? ' even' : ' bad'}"><i>Win chance</i><span class="cl-wbar"><span ${W(pct ?? 0)}></span></span><b>${L(pct == null ? '?' : `${pct}%`)}</b></div>
      <div class="cl-kv"><span>Defence vs attack</span><b>${L(`${num(pv.defence ?? 0)} vs ${num(pv.attack ?? 0)}`)}</b></div>
      <div class="cl-kv"><span>Likely losses</span><b class="${lost.length ? 'bad' : 'good'}">${L(lost.length ? unitList(lost.map((t) => ({ type: t?.type ?? t }))) : 'none expected')}</b></div>
      ${dmg != null && dmg !== 0 ? `<div class="cl-kv"><span>If we lose</span><b class="bad">${L(typeof dmg === 'number' ? `${plural(Math.round(dmg), 'building')} damaged, stores raided` : String(dmg))}</b></div>` : ''}
      ${trib ? `<div class="cl-kv"><span>Tribute to make them leave</span><b>${L(trib)}</b></div>` : ''}`;
  }

  // ---- panel events
  defEl.addEventListener('click', (e) => {
    const s = S(), t = e.target;
    if (t.closest('[data-close=defence]')) { closeDefence(); return; }
    const tab = t.closest('[data-dtab],[data-dgo]');
    if (tab) { openDefence(tab.dataset.dtab || tab.dataset.dgo); return; }
    const sh = t.closest('[data-dshow]');
    if (sh) { closeDefence(); api.show?.({ build: sh.dataset.dshow }); return; }
    const tech = t.closest('[data-mtech]');
    if (tech) { openResearch(tech.dataset.mtech); return; }
    const b = t.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.morder != null) {
      const type = +b.dataset.morder, r = rule('orderMachine', s, type) ?? notReady('Production');
      result(r && r.ok !== false && !r.msg ? { ok: true, msg: `${mInfo(type).name} ordered.` } : r);
    } else if (b.dataset.ocancel != null) result(rule('cancelOrder', s, +b.dataset.ocancel) ?? notReady('Cancelling orders'));
    else if (b.dataset.gsell != null) {
      const g = (s.guardians || []).find((x) => x.id === +b.dataset.gsell); if (!g) return;
      const p = salePrice(s, g);
      if (!confirm(`Sell this ${mInfo(g.type).name} (level ${g.level || 0}) for ${num(p.credits)} credits and ${num(p.parts)} parts?`)) return;
      result(rule('sellGuardian', S(), g.id) ?? notReady('Selling'));
    } else if (b.dataset.winvite) {
      const r = rule('inviteWanderer', s, b.dataset.winvite) ?? notReady('Invitations');
      result(r);
    } else if (b.dataset.cdismiss) {
      const C = COMMANDER[b.dataset.cdismiss];
      if (!confirm(`Dismiss ${C?.name || 'this commander'}? They may come back to the Lodge later.`)) return;
      result(rule('dismissCommander', s, b.dataset.cdismiss) ?? notReady('Dismissing commanders'));
    } else return;
    renderDefence(true);
  });
  defEl.addEventListener('change', (e) => {
    const t = e.target, s = S();
    if (t.matches('[data-msort]')) { defPrefs.sort = t.value; storeDef(); renderDefence(true); return; }
    if (t.matches('[data-gassign]')) {
      const g = (s.guardians || []).find((x) => x.id === +t.dataset.gassign);
      if (t.value) result(rule('assignCommander', s, t.value, +t.dataset.gassign) ?? notReady('Assigning commanders'));
      else if (g?.commander) result(rule('assignCommander', s, g.commander, null) ?? notReady('Assigning commanders'));
    }
    else if (t.matches('[data-cassign]')) {
      if (t.value) result(rule('assignCommander', s, t.dataset.cassign, +t.value) ?? notReady('Assigning commanders'));
      else result(rule('assignCommander', s, t.dataset.cassign, null) ?? notReady('Assigning commanders'));
    } else if (t.matches('[data-cdept]')) result(rule('setDepartment', s, t.dataset.cdept, t.value || null) ?? notReady('Departments'));
    else return;
    renderDefence(true);
  });
  defEl.addEventListener('toggle', (e) => {
    const d = e.target.closest?.('[data-mfold]'); if (!d) return;
    defPrefs.fold[d.dataset.mfold] = !d.open; storeDef();
    liveSigs.delete(defBody);
  }, true);
  function openDefence(tab) {
    if (tab && DEF_TABS.some(([k]) => k === tab)) { defTab = tab; defPrefs.tab = tab; storeDef(); }
    for (const p of Object.values(pops)) p.hidden = true;
    closeResearch();
    $('.cl-build')?.classList.remove('open');
    const was = defEl.hidden;
    defEl.hidden = false;
    renderDefence(true);
    if (was || tab) defBody.scrollTop = 0;
  }
  function closeDefence() { if (defEl.hidden) return false; defEl.hidden = true; return true; }
  function toggleDefence(tab) { if (defEl.hidden || tab) openDefence(tab); else closeDefence(); }
  statEls.heat?.el.addEventListener('click', () => openDefence('raids'));

  // ---------------------------------------------------------------- the map's free area
  // The view draws its minimap (bottom right) and navigation buttons (top right) inside the area
  // the panels leave free; publish that area as CSS custom properties on the game screen
  // (--cl-safe-top/right/bottom/left, px from each edge) so view3d can read them.
  const midEl = $('.cl-mid'), gameEl = root.parentElement;
  let safeSig = '';
  function measureSafe() {
    if (!gameEl || !midEl) return;
    const g = gameEl.getBoundingClientRect(), m = midEl.getBoundingClientRect();
    if (!g.width || !m.width) return;
    const v = { top: m.top - g.top, right: g.right - m.right, bottom: g.bottom - m.bottom, left: m.left - g.left };
    const sig = Object.values(v).map(Math.round).join(',');
    if (sig === safeSig) return;
    safeSig = sig;
    for (const [k, px] of Object.entries(v)) gameEl.style.setProperty(`--cl-safe-${k}`, `${Math.round(px)}px`);
    // view3d's own knobs (minimap.js, navpad.js): the minimap in the bottom-right corner of the free
    // area (on phones above the overlay switch, which shares that edge), the buttons in its top right.
    const ovl = $('.cl-ovl'), lift = phone() && ovl ? ovl.offsetHeight + 6 : 0;
    gameEl.style.setProperty('--cv-minimap-right', `${Math.round(v.right)}px`);
    gameEl.style.setProperty('--cv-minimap-bottom', `${Math.round(v.bottom + lift)}px`);
    gameEl.style.setProperty('--cv-nav-right', `${Math.round(v.right)}px`);
    gameEl.style.setProperty('--cv-nav-top', `${Math.round(v.top)}px`);
    try { api.safeArea?.(v); } catch { }
  }
  // What the map's corners hold, so the placement hint and the toasts keep clear of them.
  function helpersShown() {
    gameEl?.classList.toggle('cl-mm', api.settings?.minimap !== false);
    gameEl?.classList.toggle('cl-nb', api.settings?.navButtons !== false);
  }
  helpersShown();
  const safeRO = typeof ResizeObserver === 'function' ? new ResizeObserver(() => measureSafe()) : null;
  safeRO?.observe(midEl); safeRO?.observe(root);
  requestAnimationFrame(measureSafe);

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
  // Version 3 adds the raid (Fight / Pay tribute with the preview), the raid warning (what defends,
  // how many days), the wanderer at the Lodge, and the after-raid report from state.raid.last.
  const reportSig = (s) => { const l = s.raid?.last; return l ? `${l.day}|${s.raid.count ?? ''}|${l.won}` : ''; };
  let repSeen = reportSig(S());
  const plainL = (t) => esc(t), plainW = (p) => `style="width:${Math.max(0, Math.min(100, Math.round(+p || 0)))}%"`;
  function wandererOf(p) {
    const k = p.key ?? p.wanderer ?? p.who ?? p.data?.key;
    if (k && COMMANDER[k]) return k;
    const all = Object.values(COMMANDER).filter((c) => c.key?.startsWith('w_'));
    return all.find((c) => `${p.title} ${p.text}`.includes(c.name))?.key || null;
  }
  function raidBody(s, p) {
    const c = s.raid?.coming || p.raid || {}, pv = rule('raidPreview', s);
    const n = c.units?.length ?? 0;
    return `<div class="cl-raidfacts">
        <div class="cl-kv"><span>From</span><b>${esc(fromText(c.from))}</b></div>
        <div class="cl-kv"><span>Who</span><b>${esc(factionName(c.faction))}${RAID_TIER[c.tier] ? ` <small>(${RAID_TIER[c.tier]})</small>` : ''}</b></div>
        <div class="cl-kv"><span>Raiders</span><b>${n ? `${plural(n, 'machine')}` : '?'}</b></div>
        ${n ? `<p class="cl-raidunits">${esc(unitList(c.units))}</p>` : ''}
      </div>
      ${pv ? `<div class="cl-preview">${winBar(pv, plainL, plainW)}</div>` : '<p class="cl-dim">No battle preview in this build yet.</p>'}`;
  }
  function warnBody(s) {
    const eta = raidEta(s), gs = s.guardians || [], crewedN = gs.filter((g, i) => isCrewed(s, g, i) && hpOf(g) > 0).length, emp = batteries(s).length;
    return `<div class="cl-raidfacts">
      ${eta != null ? `<div class="cl-kv"><span>Arrives in</span><b class="bad">${plural(eta, 'day')}</b></div>` : ''}
      <div class="cl-kv"><span>Crewed guardians</span><b class="${crewedN ? '' : 'bad'}">${crewedN} of ${gs.length} · crews ${crewCap(s)}</b></div>
      <div class="cl-kv"><span>Battery Emplacements</span><b class="${emp ? '' : 'cl-dim'}">${emp || 'none'}</b></div>
      <div class="cl-kv"><span>Defence</span><b>${num(defenceTotal(s))}</b></div>
      <p class="cl-dim">Arsenal machines, Guardian Barracks crews and Battery Emplacements defend Eden. Shield Pylons keep raiders' fire off buildings.</p></div>`;
  }
  function wandererBody(s, key) {
    const C = COMMANDER[key]; if (!C) return '';
    return `<div class="cl-evwand"><span class="cl-face">${face(key, 'ev')}</span><div>${statBars(C)}${gradesHtml(C)}${traits(C)}${C.flaw ? `<p class="cl-cflaw">⚠ ${esc(C.flaw)}</p>` : ''}
      <p class="cl-dim">Wage ${C.wage} credits a day · invite chance about ${Math.round(inviteChance(s, { key, loyalty: (s.wanderers || []).find((w) => w.key === key)?.loyalty }) * 100)}%.</p></div></div>`;
  }
  function choiceLabel(s, p, c) {
    if (p.kind !== 'raid') return esc(c.label);
    const pv = rule('raidPreview', s);
    if (c.key === 'fight') { const w = +pv?.winChance; return `${esc(c.label || 'Fight')}${Number.isFinite(w) ? ` <small>${Math.round(w <= 1 ? w * 100 : w)}% to win</small>` : ''}`; }
    if (c.key === 'tribute') { const t = pv?.tribute; const txt = t ? [t.credits ? `${num(t.credits)} cr` : '', t.food ? `${num(t.food)} food` : ''].filter(Boolean).join(' + ') : ''; return `${esc(c.label || 'Pay tribute')}${txt ? ` <small>${txt}</small>` : ''}`; }
    return esc(c.label);
  }
  function renderEvent() {
    const s = S(), p = s.pending?.[0];
    if (!p) {
      const rs = reportSig(s);
      if (rs && rs !== repSeen) { if (evId !== 'report:' + rs || modal.hidden) showReport(s, rs); return; }
      if (!modal.hidden) { modal.hidden = true; evId = null; }
      return;
    }
    if (evId === p.id && !modal.hidden) return;
    evId = p.id;
    if (/report|result/.test(p.kind || '')) repSeen = reportSig(s);   // the sim's own report: no second one
    const raid = p.kind === 'raid', warn = p.kind === 'raidwarn', wkey = p.kind === 'wanderer' ? wandererOf(p) : null;
    const pic = eventFace(p.speaker);
    modal.classList.toggle('soft', !api.settings.pauseOnEvents && !raid);
    evBox.className = 'cl-win cl-event' + (raid ? ' cl-evraid' : warn ? ' cl-evwarn' : '');
    const choices = p.choices?.length ? p.choices : [{ key: 'ok', label: 'Understood' }];
    const tab = warn ? 'raids' : wkey ? 'commanders' : null;
    evBox.innerHTML = `<div class="cl-evkind">${esc(KIND_LABEL[p.kind] || p.kind || 'Event')} · Day ${s.day}${s.pending.length > 1 ? ` · ${s.pending.length - 1} more waiting` : ''}</div>
      <div class="cl-evbody">${pic}
      <div><h2 id="evTitle">${esc(p.title)}</h2><p>${esc(p.text)}</p></div></div>
      ${raid ? raidBody(s, p) : warn ? warnBody(s) : /report|result/.test(p.kind || '') && s.raid?.last ? reportHtml(s, s.raid.last) : wkey ? wandererBody(s, wkey) : ''}
      <div class="cl-evchoices">${choices.map((c, i) => `<button type="button" class="cl-btn${i === 0 ? ' primary' : ''}${raid && c.key === 'fight' ? ' fight' : ''}" data-choice="${esc(c.key)}">${choiceLabel(s, p, c)}</button>`).join('')}
        ${tab && choices.length === 1 ? `<button type="button" class="cl-btn" data-evdef="${tab}" title="Answer and open the Defence panel">${tab === 'raids' ? 'Check the defences' : 'Meet them'}</button>` : ''}</div>
      ${api.settings.pauseOnEvents || raid ? '<p class="cl-dim cl-evpause">❚❚ The clock waits for your answer.</p>' : ''}`;
    modal.hidden = false;
    evBox.querySelector('[data-choice]')?.focus({ preventScroll: true });
  }
  function showReport(s, rs) {
    evId = 'report:' + rs;
    modal.classList.remove('soft');
    const won = !!s.raid.last.won;
    evBox.className = 'cl-win cl-event ' + (won ? 'cl-evwon' : 'cl-evraid');
    evBox.innerHTML = `<div class="cl-evkind">${KIND_LABEL.report} · Day ${s.raid.last.day}</div>
      <div class="cl-evbody">${eventFace('sato')}<div><h2 id="evTitle">${won ? 'Eden holds' : s.raid.last.tribute && !won ? 'They took the tribute' : 'The raiders got through'}</h2>
      <p>${esc(won ? 'The raiders broke off. The salvage crews are already out.' : s.raid.last.tribute ? 'They took what we paid and left. Word will get around that Eden pays.' : 'We could not stop them. Repair crews are on the damage.')}</p></div></div>
      ${reportHtml(s, s.raid.last)}
      <div class="cl-evchoices"><button type="button" class="cl-btn primary" data-repok>Understood</button><button type="button" class="cl-btn" data-repok="raids">Raids panel</button></div>`;
    modal.hidden = false;
    evBox.querySelector('[data-repok]')?.focus({ preventScroll: true });
  }
  evBox.addEventListener('click', (e) => {
    const ok = e.target.closest('[data-repok]');
    if (ok) { repSeen = reportSig(S()); evId = null; modal.hidden = true; if (ok.dataset.repok) openDefence(ok.dataset.repok); renderEvent(); return; }
    const b = e.target.closest('[data-choice],[data-evdef]'); if (!b) return;
    const p = S().pending?.[0]; if (!p) return;
    const key = b.dataset.choice ?? (p.choices?.[0]?.key || 'ok');
    evId = null; modal.hidden = true;
    let r = R.answer(S(), p.id, key);
    // a raid the generic answer() did not resolve: the rules' own raid answer
    if (p.kind === 'raid' && r?.ok === false && typeof R.answerRaid === 'function' && S().pending?.some((x) => x.id === p.id)) { const r2 = rule('answerRaid', S(), key); if (r2) r = r2; }
    r = result(r);
    if (r?.ok !== false) api.answered?.(p, key);
    if (b.dataset.evdef && r?.ok !== false) openDefence(b.dataset.evdef);
  });

  // ---------------------------------------------------------------- goals panel
  const prefs = loadUI();
  const goalEl = $('.cl-goal'), goalList = $('[data-goallist]'), showBtn = $('[data-showme]'), offerEl = $('[data-offer]');
  let goalSig = '', goalId, goalShow = null, listOpen = false;
  const setFold = (el, btn, folded) => { el.classList.toggle('folded', folded); btn.setAttribute('aria-expanded', String(!folded)); };
  // Phones start with the strip folded, so the map keeps the room.
  setFold(goalEl, $('[data-goalfold]'), prefs.goalFolded ?? matchMedia('(max-width: 760px)').matches);
  $('[data-goalfold]').addEventListener('click', () => {
    const f = !goalEl.classList.contains('folded');
    setFold(goalEl, $('[data-goalfold]'), f); prefs.goalFolded = f; storeUI(prefs);
  });
  $('.cl-goalhead').addEventListener('click', (e) => {   // a tap on a folded strip opens it
    if (goalEl.classList.contains('folded') && !e.target.closest('button')) $('[data-goalfold]').click();
  });
  $('[data-goalall]').addEventListener('click', () => { listOpen = !listOpen; goalSig = ''; renderGoals(); });
  const phone = () => matchMedia('(max-width: 760px)').matches;
  // On a phone the strip folds away so the map (and the marked spot) can be seen.
  const foldForMap = () => { if (phone()) { setFold(goalEl, $('[data-goalfold]'), true); offerEl.hidden = true; } };
  showBtn.addEventListener('click', () => { if (goalShow) { foldForMap(); api.show?.(goalShow); } });
  showBtn.addEventListener('animationend', () => showBtn.classList.toggle('pulse', false));
  offerEl.addEventListener('click', (e) => {
    const k = e.target.closest('[data-offer]')?.dataset.offer; if (!k) return;
    offerEl.hidden = true;
    try { localStorage.setItem('el-colony-help-seen', '1'); } catch { }
    if (k === 'help') api.help?.();
  });

  // "1 / 2 fields" gives 0.5 for the bar; null when the text holds no fraction.
  const fraction = (t) => { const m = /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(t || ''); return m && +m[2] > 0 ? Math.min(1, +m[1] / +m[2]) : null; };
  const grantText = (r) => r ? [r.credits ? `+${num(r.credits)} cr` : '', r.parts ? `+${num(r.parts)} parts` : ''].filter(Boolean).join(' · ') : '';
  const showLabel = (sh) => !sh ? '' : sh.build ? `Show me: ${BUILDING[sh.build]?.name || sh.build}` : sh.market ? 'Show me: the Market' : sh.roads ? 'Show me: Roads' : sh.research ? `Show me: ${typeof sh.research === 'string' && TECH[sh.research] ? TECH[sh.research].name : 'Research'}` : sh.chamber != null ? 'Show me the chamber' : sh.tile ? 'Show me where' : 'Show me';

  function renderGoals() {
    const G = api.goals;
    if (!G?.goalStatus) { goalEl.hidden = true; return; }
    let st; try { st = G.goalStatus(S()); } catch (e) { console.warn('goalStatus failed', e); goalEl.hidden = true; return; }
    const sig = JSON.stringify(st) + listOpen;
    if (sig === goalSig) return;
    goalSig = sig;
    goalEl.hidden = false;
    const c = st.current;
    if (goalId !== undefined && (c?.id ?? null) !== goalId) { goalEl.classList.remove('fresh'); void goalEl.offsetWidth; goalEl.classList.add('fresh'); }
    goalId = c?.id ?? null;
    goalShow = c?.show || null;
    const pic = c?.speaker && api.art?.(`portrait/${c.speaker}`);
    $('[data-goalpic]').innerHTML = pic ? `<img src="${esc(pic)}" alt="${esc(SPEAKER[c.speaker] || '')}">` : '<span>◆</span>';
    $('[data-goalkicker]').textContent = c ? `Goal ${Math.min(st.total, st.done + 1)} of ${st.total}${c.speaker && SPEAKER[c.speaker] ? ' · ' + SPEAKER[c.speaker] : ''}` : `Goals ${st.done} / ${st.total}`;
    $('[data-goaltitle]').textContent = c ? c.title : 'All goals done: Eden is yours.';
    $('[data-goalprog1]').textContent = c?.progress || '';
    $('[data-goaltext]').textContent = c ? c.text : 'Every goal is complete. Keep opening chambers, growing homes and trading: there is no limit to how far Eden can grow.';
    const f = fraction(c?.progress);
    $('[data-goalprogwrap]').hidden = !c?.progress;
    $('[data-goalbar]').style.width = f == null ? '0' : `${Math.round(f * 100)}%`;
    $('[data-goalbar]').parentElement.hidden = f == null;
    $('[data-goalprog]').textContent = c?.progress || '';
    const g = grantText(c?.reward);
    $('[data-goalreward]').innerHTML = g ? `<i>Council grant</i> <b>${esc(g)}</b>` : '';
    $('[data-goalreward]').hidden = !g;
    showBtn.hidden = !goalShow;
    showBtn.textContent = showLabel(goalShow);
    const all = $('[data-goalall]');
    all.textContent = `All goals (${st.done} / ${st.total}) ${listOpen ? '▴' : '▾'}`;
    all.setAttribute('aria-expanded', String(listOpen));
    goalList.hidden = !listOpen;
    goalList.innerHTML = (st.list || []).map((x) => `<li class="${x.done ? 'done' : x.id === c?.id ? 'now' : ''}"><span>${x.done ? '✓' : x.id === c?.id ? '▸' : '·'}</span>${esc(x.title)}</li>`).join('');
    goalEl.classList.toggle('alldone', !c);
  }

  function welcomeDone(offer) {
    goalSig = ''; renderGoals();
    if (goalEl.hidden) return;
    setFold(goalEl, $('[data-goalfold]'), false);
    showBtn.classList.toggle('pulse', false); void showBtn.offsetWidth; showBtn.classList.add('pulse');
    if (offer) offerEl.hidden = false;
  }

  // ---------------------------------------------------------------- advisor
  const advEl = $('.cl-adv'), advList = $('[data-advlist]');
  let advSig = '', advDay = -1, advItems = [];
  setFold(advEl, $('[data-advfold]'), prefs.advFolded ?? matchMedia('(max-width: 760px)').matches);
  $('[data-advfold]').addEventListener('click', () => {
    const f = !advEl.classList.contains('folded');
    setFold(advEl, $('[data-advfold]'), f); prefs.advFolded = f; storeUI(prefs);
  });
  advList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fix]'); if (!b) return;
    const it = advItems[+b.dataset.fix];
    if (it?.show) { foldForMap(); if (phone()) setFold(advEl, $('[data-advfold]'), true); api.show?.(it.show); }
  });
  function renderAdvice(force) {
    const G = api.goals, s = S();
    if (!G?.advise) { advEl.hidden = true; return; }
    if (!force && s.day === advDay) return;
    advDay = s.day;
    try { advItems = G.advise(s) || []; } catch (e) { console.warn('advise failed', e); advItems = []; }
    const sig = JSON.stringify(advItems);
    if (sig === advSig) return;
    advSig = sig;
    const fixes = advItems.filter((a) => a.level !== 'tip').length;
    advEl.hidden = false;
    advEl.dataset.level = advItems[0]?.level || 'ok';
    $('[data-advcount]').innerHTML = fixes ? `${fixes} to fix` : advItems.length ? 'a tip' : '<span class="cl-good">all well</span>';
    advList.innerHTML = advItems.length ? advItems.map((a, i) => `<li class="lv-${esc(a.level)}"><span class="cl-advdot" aria-hidden="true"></span><span class="cl-advtext">${esc(a.text)}</span>${a.show ? `<button type="button" class="cl-advfix" data-fix="${i}" title="${esc(showLabel(a.show))}">Fix</button>` : ''}</li>`).join('')
      : '<li class="lv-ok"><span class="cl-advdot" aria-hidden="true"></span><span class="cl-advtext">Nothing urgent. Follow the goal, or open How to play (?).</span></li>';
  }

  function openBuild(key) {
    const c = BUILDING[key]?.cat; if (!c) return;
    if (c !== cat) { cat = c; for (const t of $$('[data-cat]')) t.setAttribute('aria-selected', String(t.dataset.cat === c)); cardSig = ''; buildMenu(); }
    requestAnimationFrame(() => cardsEl.querySelector(`[data-key="${key}"]`)?.scrollIntoView({ block: 'nearest' }));
  }

  // ---------------------------------------------------------------- update
  function update(force) {
    const s = S();
    try { summary = R.summary(s); } catch (e) { summary = null; console.warn('summary failed', e); }
    if (force) { cardSig = ''; inspSig = ''; marketSig = ''; happySig = ''; logSig = ''; goalSig = ''; resSig = ''; liveSigs.delete(defBody); liveSigs.delete(defStats); }
    hud();
    renderGoals();
    renderAdvice(force || dirty);
    dirty = false;
    buildMenu();
    refreshInspector();
    renderHappy();
    renderMarket();
    renderResearch();
    renderDefence();
    renderLog();
    renderEvent();
  }

  return {
    update, inspect, closeInspector, toast, tip, setPlacing, setSpeed, closePops, openBuild, welcomeDone, openResearch, toggleResearch,
    openDefence, toggleDefence, closeDefence,
    researchOpen: () => !resEl.hidden,
    defenceOpen: () => !defEl.hidden,
    firstAvailableTech: () => techList(S()).find((t) => t.available && !t.done && !t.focus)?.key || null,
    changed: () => { dirty = true; },
    openMarket: () => openPop('market'),
    eventOpen: () => !modal.hidden,
    inspecting: () => inspAt,
    destroy() { safeRO?.disconnect(); root.innerHTML = ''; },
  };
}
