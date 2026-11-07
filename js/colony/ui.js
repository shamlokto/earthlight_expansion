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
//        answered(pending, choiceKey) after an event is answered, openResearch(techKey),
//        version 4: deck() the deck on show, decks() the decks this colony has, setDeck(deck),
//        stepDeck('up' | 'down'), mapOf(deck), decksFor(key), goDeck(deck, x, y),
//        version 4 stage 2: secrets (js/colony/secrets.js or null: clearDanger, dangerPreview, openVault,
//        secretStatus, readLog when rules.js does not re-export them) }
//   ui.openJournal(tab, ref)  the Discoveries journal (version 4, stage 2): 'logs' | 'vaults' | 'survivors' | 'dangers',
//                             ref a log id, a vault or survivors site / ref, or a danger's chamber id
//   ui.toggleJournal()        key J
//   ui.openChart(sectorId)    the Star chart (version 4, stage 3): the sectors, a squadron picker, squadrons in flight
//   ui.toggleChart()          key X
import { CATEGORIES, BUILDINGS, BUILDING, NEEDS, CHAMBER_AIR_PER_100 } from './data/buildings.js';
import { TERRAIN, ARTIFACT, T } from './data/terrain.js';
import { BRANCHES, TECHS, TECH } from './data/tech.js';
import { MACHINES, MACHINE, MACHINE_COST } from './data/machines.js';
import { CLASSES, CLASS_NAME, STYLES, PERKS, DEPARTMENTS, COMMANDER, GENERAL, BASE_COMMANDERS, PER_QUARTERS } from './data/commanders.js';
import { LOGS, VAULTS, SURVIVORS, SURVIVOR_COMMANDERS, DANGERS, FINAL_CODE_PARTS } from './data/secrets.js';

// The expansion's SVG busts (story characters) for commanders without a painted portrait; loaded
// lazily so the colony still runs if the expansion's files are missing.
let svgPortrait = null;
import('../expansion/portraits.js').then((m) => { svgPortrait = m.portrait; }).catch(() => { });
// Command the battle (docs/COLONY-V5.md §2): the raid fought on the expansion's hex map; needs the
// Earth Light pack (packReady: null while checking).
let battleMod = null, packReady = null;
import('./battle.js').then((m) => { battleMod = m; }).catch((e) => console.warn('battle.js not loaded', e));

const GOODS = ['food', 'water', 'air', 'parts', 'ore', 'alloy', 'helium', 'coffee', 'wine', 'art', 'credits'];   // version 10: the luxuries
const GOOD_NAME = { food: 'Food', water: 'Water', air: 'Air', parts: 'Parts', ore: 'Ore', alloy: 'Alloy', helium: 'Helium-3', credits: 'Credits', power: 'Power', research: 'Research', coffee: 'Coffee', wine: 'Wine', art: 'Art' };
// Version 2 goods: in the top bar and the market only once the colony has any, or the tech that makes them is done.
// (version 10: the luxuries likewise, once Luxury Goods is researched or any are made)
const LATE = { alloy: 'smelting', helium: 'plasma', coffee: 'luxuries', wine: 'luxuries', art: 'luxuries' };
const SELLABLE = ['ore', 'food', 'parts', 'alloy', 'helium', 'coffee', 'wine', 'art'];
const CAT_COLOR = { core: '#f5c542', power: '#6fd3ff', life: '#5aa8ff', food: '#8fe38a', industry: '#ff9a52', homes: '#ff8fd8', services: '#c3a6ff', defence: '#ff6a5a', landmarks: '#ffd98a', wonders: '#7ff0d0' };
const BRANCH_COLOR = { life: '#5aa8ff', industry: '#ff9a52', society: '#ff8fd8', logistics: '#f5c542', defence: '#ff6a5a' };
// Version 3 (docs/COLONY-V3.md): machine classes, the Defence panel's tabs, raid words.
const CLASS_COLOR = { hu: '#6fd3ff', planes: '#c3a6ff', armour: '#ff9a52', ships: '#f5c542', support: '#8fe38a' };
const CAT_CLASS = { 1: 'ships', 2: 'ships', 3: 'ships', 4: 'ships', 8: 'hu', 9: 'planes', 10: 'planes', 11: 'armour', 12: 'armour', 13: 'support', 14: 'support', 15: 'support' };
const DEF_TABS = [['guardians', 'Guardians'], ['production', 'Production'], ['commanders', 'Commanders'], ['raids', 'Raids'], ['neighbours', 'Neighbours']];   // version 10: the neighbours
const FROM_TEXT = { north: 'the north edge of Eden', south: 'the south edge of Eden', east: 'the east edge of Eden', west: 'the west edge of Eden', earth: 'up from the atmosphere, Earth side' };
const FACTION_NAME = { scavengers: 'Scavengers', scavenger: 'Scavengers', cartel: 'The Ashfall Cartel', ashfall: 'The Ashfall Cartel', pirates: 'The Ashfall Cartel',
  union: 'Union deserters', galt: 'Galt deserters', deserters: 'Deserters', remnant: 'The Directorate remnant', directorate: 'The Directorate remnant' };
const RAID_TIER = { 1: 'scavengers', 2: 'pirates', 3: 'a warband', 4: 'a remnant fleet' };
const WEAPON_MODE = ['Beam', 'Railgun', 'Missile'];
// The tech that unlocks each machine tier (data/tech.js effects { kind: 'machines', tier }).
const TIER_TECH = Object.fromEntries(TECHS.flatMap((t) => (t.effects || []).filter((e) => e.kind === 'machines').map((e) => [e.tier, t.key])));
// The happiness the tax costs or gives (rules: 0% +8, 10% 0, 20% −14, 30% −32, interpolated).
const taxHappy = (t) => { const P = [[0, 8], [10, 0], [20, -14], [30, -32]]; for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const [a, va] = P[i - 1], [b, vb] = P[i]; return va + (vb - va) * (t - a) / (b - a); } return -32; };
const STATUS = {
  sealed: ['Sealed', 'Airless and unknown. Survey it from an open neighbour, or through a working Lift.'],
  surveying: ['Surveying', 'Ruess\'s team is mapping it.'],
  surveyed: ['Surveyed', 'Seal every breach, then pressurise it.'],
  pressurising: ['Pressurising', 'Filling it with air.'],
  open: ['Open', 'Pressurised: build inside.'],
};
const OVERLAYS = [[null, 'None'], ['reach', 'Reach'], ['park', 'Parks'], ['power', 'Power'], ['value', 'Value']];   // version 8: land value
const KIND_LABEL = { garden: 'The Garden of Eden', wildlife: 'Wildlife returns', neighbour: 'Neighbours', district: 'District', victory: 'Eden Restored', goal: 'Goal complete', welcome: 'Landfall', transport: 'Transport', chamber: 'Chamber', unlock: 'Milestone', lost: 'Colony lost', tech: 'Research complete',
  raid: 'Raid', raidwarn: 'Raid warning', wanderer: 'Wanderer', raidreport: 'After the raid', report: 'After the raid', commander: 'Commanders', machine: 'Arsenal',
  // version 4, stage 2: the secrets
  discovery: 'Discovery', finalvault: 'The Ninefold vault', drones: 'Sentries', dronefight: 'Sentries', reactor: 'The old core', reactorwarn: 'The old core', reactorfail: 'The old core',
  vault: 'Vault opened', survivors: 'Survivors', danger: 'Danger', expedition: 'Expedition',
  // version 8 (docs/COLONY-V8.md): landmarks and incidents
  landmark: 'Landmark', incidentwarn: 'Incident ahead', incident: 'Incident', petition: 'Council petition',
  wonder: 'Wonder', ark: 'Beyond Eden' };   // version 9 (docs/COLONY-V9.md)
// Version 4, stage 3: the Star chart's site glyphs and colours.
const SITE_GLYPH = { belt: '⁂', comet: '☄', derelict: '⚓', babylon: '✠', bunker: '▣', den: '☠', outpost: '⌂', listening: '◉', relief: '✚' };
const SITE_COLOR = { belt: '#c9b38a', comet: '#8fd8ff', derelict: '#ffb070', babylon: '#ffd36a', bunker: '#b0e07a', den: '#ff6a5a', outpost: '#c3a6ff', listening: '#7affd8', relief: '#6fb8ff' };
const SPEAKER = { ruess: 'Prof. Ruess', sato: 'Capt. Sato', marrow: 'Warden Marrow', venn: 'Tobias Venn', general: 'The General' };
// Version 4 (docs/COLONY-V4.md): the three decks, top to bottom.
const DECKS = ['upper', 'main', 'lower'];
const DECK_NAME = { upper: 'Upper', main: 'Main', lower: 'Lower' };
const DECK_TEXT = { upper: 'Habitat rings under the sky panels: homes, sky gardens, galleries.', main: 'The fields, the river, industry and the docks to space.', lower: 'Machinery halls and flooded tunnels: power, water and heavy industry.' };
const deckOf = (o) => o?.deck || 'main';
// "Upper deck only", "Main or lower deck", "Upper, main or lower"
const decksText = (list) => list.length === 1 ? `${DECK_NAME[list[0]]} deck only` : list.length === 3 ? 'Upper, main or lower'
  : `${list.map((d, i) => i ? DECK_NAME[d].toLowerCase() : DECK_NAME[d]).slice(0, -1).join(', ')} or ${DECK_NAME[list.at(-1)].toLowerCase()} deck`;
const UI_KEY = 'el-colony-ui';   // per-viewer panel state (collapsed or not)
const loadUI = () => { try { return JSON.parse(localStorage.getItem(UI_KEY) || '{}') || {}; } catch { return {}; } };
const storeUI = (o) => { try { localStorage.setItem(UI_KEY, JSON.stringify(o)); } catch { } };

// ---------------------------------------------------------------- version 4, stage 2: the secrets (docs/COLONY-V4.md §2)
// The survivors' two commanders (data/secrets.js) join the roster's names and faces.
const CMDR = { ...COMMANDER, ...Object.fromEntries(SURVIVOR_COMMANDERS.map((c) => [c.key, { portrait: `portrait/${c.key}`, ...c }])) };
const J_TABS = [['logs', 'Logs'], ['vaults', 'Vaults'], ['survivors', 'Survivors'], ['dangers', 'Dangers']];
const LOG_ORDER = [...LOGS].sort((a, b) => a.order - b.order);
const LOG = Object.fromEntries(LOGS.map((l) => [l.id, l]));
const VAULT = Object.fromEntries(VAULTS.map((v) => [v.id, v]));
const SURV = Object.fromEntries(SURVIVORS.map((v) => [v.id, v]));
const KEY_LOGS = LOGS.filter((l) => l.key).sort((a, b) => a.key - b.key);
// The five fragments' clues, as the logs give them (the code itself stays with the player).
const KEY_CLUE = { 1: 'The founding year', 2: 'The back of a badge', 3: 'The ring that failed', 4: 'The first night', 5: 'The warden\'s word' };
// How a log is set on the page: a child's diary, a log in ink, an engineer's notebook, a terminal print-out, words on a wall.
function logKind(l) {
  const a = `${l.author} ${l.title}`;
  if (/\bPim\b/.test(a)) return 'diary';
  if (/wall|graffiti/i.test(a)) return 'wall';
  if (/Venn/.test(a)) return 'notebook';
  if (/Directorate|bulletin|broadcast|manifest|officer|Hesk/i.test(a)) return 'terminal';
  return 'letter';
}
const LOG_KIND = { diary: 'Diary page', wall: 'Words on a wall', notebook: 'Engineer\'s notebook', terminal: 'Terminal print-out', letter: 'Handwritten log' };
// A fragment's cipher group on the slot (three characters, fixed per log): decoration, not the code.
const cipher = (id) => { let h = 2166136261; for (const c of String(id)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h >>>= 0; const A = 'ACEFHKLMNPRTVWXY3479'; return [0, 7, 14].map((k) => A[(h >>> k) % A.length]).join(''); };
const SITE_NAME = { log: 'Log', vault: 'Vault', survivors: 'Survivors' };
// Small line icons (currentColor): the journal's book, the three kinds of site and the five dangers.
const SICON = {
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 5.2C5.6 3.7 8.8 3.8 12 6c3.2-2.2 6.4-2.3 9.5-.8v13.6c-3.1-1.4-6.3-1.3-9.5.9-3.2-2.2-6.4-2.3-9.5-.9z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 6v13.6" stroke="currentColor" stroke-width="1.5"/><path d="M5 8.6c1.6-.5 3.2-.4 4.6.3M5 11.6c1.6-.5 3.2-.4 4.6.3M14.4 8.9c1.4-.7 3-.8 4.6-.3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".7"/></svg>',
  log: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 8h9M7.5 11.5h9M7.5 15h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  vault: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="3" width="19" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="5.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 6.8v10.4M6.8 12h10.4M8.3 8.3l7.4 7.4M15.7 8.3l-7.4 7.4" stroke="currentColor" stroke-width="1" opacity=".75"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
  survivors: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3.5h6M12 3.5v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 7h8l1 3v8l-1 2.5H8L7 18v-8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 10.5c1.5 1.6 1.7 3.2 0 5-1.7-1.8-1.5-3.4 0-5z" fill="currentColor"/></svg>',
  drones: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11c0-3.9 3.6-7 8-7s8 3.1 8 7v2H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" fill="currentColor"/><path d="M6 13l-2 6M18 13l2 6M10 13l-1 5M14 13l1 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  toxic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15.5c-1.8 0-3-1.3-3-3 0-1.6 1.3-3 3-3 .4-2.6 2.7-4.5 5.4-4.5 2.4 0 4.5 1.5 5.2 3.7 2.6-.2 4.9 1.7 4.9 4.1 0 1.6-1.3 2.7-3 2.7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 19h2M11 20.5h2M15 19h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  radiation: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1.8" fill="currentColor"/><path d="M12 10.2V3.5a8.5 8.5 0 0 0-7.4 4.3l5.8 3.3zM13.6 11.1l5.8-3.3A8.5 8.5 0 0 0 12 3.5M10.4 12.9l-5.8 3.3a8.5 8.5 0 0 0 14.8 0l-5.8-3.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  flooded: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 14c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 19c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  reactor: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="currentColor" stroke-width="1.4"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="currentColor" stroke-width="1.4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="currentColor" stroke-width="1.4" transform="rotate(-60 12 12)"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
};
const ico = (k, cls = '') => `<span class="cl-sico ${cls}" aria-hidden="true">${SICON[k] || SICON.log}</span>`;

// The Ninefold vault's revelation (the 'finalvault' event): the truth, Eden's registry read aloud,
// then Ruess and Sato. Original writing, from the logs in data/secrets.js.
const FINAL_TRUTH = [
  'There was no Galt raid. There never was.',
  'In the last year of the war Marshal Kessrin\'s Directorate took Eden\'s lower decks under cover of a quarantine and called them Site Ninefold. Galt prisoners dug a cavity under the old core, and a Quantum Decimator rig was built inside it. The families above were told to keep away from the lifts.',
  'On day 211 the rig ran at full yield. Ring three slipped out of phase; the cavity folded in on itself, gutted the lower decks and tore the hull open to space. Before the dust settled Major Hesk invoked Protocol Ash: blame the Galt, empty the colony, leave no one behind who knew.',
  'Eleven thousand four hundred and two people were put on ships and told they had been attacked. Three days later the Marshal promised them vengeance. Sixty-three stayed. Warden Ilse Marrow kept sixty-one of them alive in the catacombs, and Tobias Venn, who built the rig, sealed it and set the proof beside it: the test logs, Hesk\'s orders, the authorisation under the Marshal\'s own seal.',
  'And the registry. Every soul who ever lived on Eden.',
];
const FINAL_CLOSE = [
  ['ruess', 'Prof. Ruess', 'Every page will be on the Council\'s desk by morning, and a copy on every ship that docks here. Whatever the Union decides to do with the truth, Eden is not going to be a lie any more.'],
  ['sato', 'Capt. Sato', 'I flew under that seal for six years. The Marshal said every one of them would be avenged. Let\'s settle for remembered, Governor. Loudly.'],
];
// Eden's registry: invented names, the same for every colony (Marrow reads them out).
const REG_FIRST = ['Ada', 'Aron', 'Bea', 'Bram', 'Cass', 'Cyril', 'Dana', 'Dov', 'Edda', 'Emil', 'Fen', 'Freya', 'Gil', 'Greta', 'Hal', 'Hedda', 'Ines', 'Isak', 'Jana', 'Jory',
  'Kesia', 'Lars', 'Lena', 'Mara', 'Matti', 'Nadia', 'Nils', 'Noor', 'Olek', 'Orla', 'Pavel', 'Pia', 'Quin', 'Rafe', 'Rhea', 'Rosa', 'Saul', 'Selma', 'Tam', 'Tess',
  'Ulla', 'Uri', 'Vera', 'Wren', 'Yara', 'Yusuf', 'Zofia', 'Anouk', 'Benno', 'Chiara', 'Dmitri', 'Elif', 'Farid', 'Hanne', 'Jun', 'Kalinda', 'Levi', 'Mei', 'Oskar', 'Priya',
  'Ruth', 'Sami', 'Tomas', 'Ama', 'Bo', 'Corin', 'Dalia', 'Ezra', 'Ilka', 'Mateo', 'Nell', 'Odile', 'Petra', 'Ravi', 'Sunniva', 'Teo', 'Vesna', 'Wim', 'Ysolde', 'Zeno'];
const REG_LAST = ['Abara', 'Aldane', 'Asante', 'Bertil', 'Brightwater', 'Castell', 'Corvo', 'Dahl', 'Delacroix', 'Eske', 'Faro', 'Fenwick', 'Gale', 'Halloran', 'Hesse', 'Ibarra',
  'Jansen', 'Kaur', 'Kowal', 'Lindqvist', 'Lomax', 'Marchetti', 'Mbeki', 'Novak', 'Nakamura', 'Okoro', 'Orsini', 'Pell', 'Quaresma', 'Rasku', 'Reyes', 'Sandoval', 'Sorensen',
  'Tamm', 'Tobin', 'Ueda', 'Varga', 'Vinter', 'Wakefield', 'Weir', 'Yilmaz', 'Zeller', 'Achterberg', 'Bannerjee', 'Cole', 'Drummond', 'Esposito', 'Frost', 'Greaves', 'Haddad',
  'Iversen', 'Juhl', 'Kettering', 'Lowe', 'Mirza', 'Nyberg', 'Oduro', 'Pajari', 'Rowan', 'Szabo', 'Thorsen', 'Underhill', 'Voss', 'Whitlock', 'Yoon'];
const REG_HOME = ['Lantern Ring', 'Skyward Gallery', 'Orchard Ring', 'River Ward', 'Weir Row', 'Fieldside', 'Market Arcade', 'Dock Ward', 'Old Cistern', 'Pump Hall', 'Glasshouse Row', 'Mill Lane'];
const REGISTRY = (() => {
  let a = 0x5eed1e; const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (L) => L[Math.floor(rnd() * L.length)], seen = new Set(), out = [];
  while (out.length < 168) {
    const f = pick(REG_FIRST), l = pick(REG_LAST), k = `${l}, ${f}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ name: k, age: 2 + Math.floor(rnd() * 84), home: pick(REG_HOME) });
  }
  // the names the logs gave us, where they belong in the book
  out.splice(23, 0, { name: 'Asante, Pim', age: 9, home: 'Lantern Ring' });
  out.splice(97, 0, { name: 'Marrow, Ilse', age: 58, home: 'Warden\'s House', mark: 'stayed' });
  out.splice(141, 0, { name: 'Venn, Tobias', age: 41, home: 'Site Ninefold', mark: 'stayed' });
  return out;
})();

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (n) => {
  if (n == null || !Number.isFinite(+n)) return '–';
  const a = Math.abs(n);
  if (a >= 100000) return Math.round(n / 1000) + 'k';
  if (a >= 10000) return (n / 1000).toFixed(1) + 'k';
  return a < 10 && n % 1 ? (+n).toFixed(1) : String(Math.round(n));
};
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + num(Math.abs(n));
// version 7: what a quad grows into at its top level, for its card ("lot, grows to 700 homes")
const quadTop = (d) => { const l = d.levels[d.levels.length - 1]; return d.quad === 'R' ? `${num(l.housing)} homes` : `${num(l.jobs)} jobs`; };
// (version 9: a wonder's stage may also cost alloy, helium-3 and provisions)
const costText = (c) => c ? [c.credits ? `${num(c.credits)} cr` : '', c.parts ? `${num(c.parts)} parts` : '', ...['alloy', 'helium', 'food', 'water', 'air'].map((g) => c[g] ? `${num(c[g])} ${g === 'helium' ? 'helium-3' : g}` : '')].filter(Boolean).join(' · ') || 'free' : 'free';
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
  ['homes', 'Homes & happiness'], ['landvalue', 'Land value'], ['roads', 'Roads'], ['market', 'Market & guardians'], ['research', 'Research'], ['defence', 'Defence and raids'], ['decks', 'Decks and lifts'], ['landmarks', 'Landmarks'], ['wonders', 'Wonders'], ['tourism', 'Tourism'], ['ark', 'The Ark'], ['districts', 'Districts'], ['gardens', 'Eden\'s gardens'], ['luxuries', 'Luxuries'], ['neighbours', 'Neighbours'], ['incidents', 'Incidents'], ['petitions', 'Petitions'], ['secrets', 'Secrets of Eden'], ['commanders', 'Commanders'], ['nav', 'Trackpad & keys'], ['photo', 'Photo mode'], ['tips', 'First 10 days']];
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
    <p>One <b>day</b> passes every two and a half seconds at ×1. The buttons at the top are <b>pause</b>, <b>×1</b>, <b>×2</b> and <b>×4</b>. Keys: space, 1, 2, 3.</p>
    <p>When something needs your answer (a ship, a finished goal, a new chamber), <b>the clock stops</b> until you answer.</p>
    <p>Pause any time to plan. Nothing is lost while paused.</p>
    <p><b>Day and night</b> turn slowly over Eden, once every 8 days: lamps and windows glow at night and Earth turns below. Switch it off in Settings (⚙) for the same light all day.</p>`)}
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
    <p><b>Tax</b> (top bar slider) pays upkeep. 10% is neutral. Lower makes people happier; higher makes them unhappy.</p>
    <p><b>Growing faster.</b> Later, <b>Tower Blocks</b> grow the same way (Tower 300, Spire 450, and with <b>Skyscrapers</b> and transit in reach a Skyscraper of 600). <b>Schools</b> make homes happier, a <b>Transit Station</b> or <b>Monorail Stop</b> in reach makes Habitats and Tower Blocks grow in 2 days instead of 5, and homes on land worth <b>60</b> or more grow a day sooner.</p>`)}
  ${sec('landvalue', 'Land value', '', `
    <p><b>Land value</b> says how much people want to live and shop on a tile, from 0 to 100. Press <b>Value</b> in the overlay bar to see it as a heat map: <b>blue</b> is low, <b>green</b> middling, <b>yellow</b> high. Click any tile and the inspector shows its value and the main reasons.</p>
    <ul class="cl-hsteps">
      <li><b>Raise it</b> with parks, services in reach (Clinic, Canteen, School, shops...), a Transit Station, a view of the river or a lake, and a happy colony.</li>
      <li><b>Wonders</b> raise it far around them: the Grand Arboretum +15 within 24 tiles, the Concert Hall and the Memorial Garden +10, the Great Library +8.</li>
      <li><b>It falls</b> beside industry, next to the outer hull where raiders and meteoroids come, and in a chamber with an unsealed breach. Sealed chambers have none.</li>
    </ul>
    <p>Habitats and Tower Blocks on land worth <b>60</b> or more grow a day sooner, a <b>Grand Hotel</b> needs <b>55</b>, and visitors pay more attention to hotels on valuable land. Put homes and hotels where it is high, and industry where it is low.</p>`)}
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
  ${sec('decks', 'Decks and lifts', card('lift') + card('skygarden') + card('geotap'), `
    <p>Eden has <b>three decks</b>, one above the other, each with its own chambers. Switch with the <b>Deck</b> buttons (bottom left of the map, with each deck's open / all chambers), the <b>▲ ▼</b> map buttons, or <b>PageUp / PageDown</b>. The top bar says which deck you are on.</p>
    <ul class="cl-hsteps">
      <li><b>Upper</b>: habitat rings under the sky panels. <b>Sky Gardens</b> (air and the best park rating) and <b>Galleries</b> (happiness).</li>
      <li><b>Main</b>: where you land. Fields, the river, industry and the docks to space.</li>
      <li><b>Lower</b>: machinery halls and flooded tunnels. <b>Geothermal Taps</b> (big power), <b>Water Cisterns</b>, and <b>Pump Stations</b> that drain flooded ground.</li>
    </ul>
    <p><b>Lift shafts</b> (gold-rimmed pits) run through all three decks at the same spot. One is in your landing chamber. Build a <b>Lift</b> on it (Command menu): once it works, the chambers it passes through on the other decks can be <b>surveyed through the lift</b>. Click the Lift to see which decks it links and go there.</p>
    <p>A chamber on another deck opens as usual: survey, seal its breaches, pressurise. Each open chamber needs air. Parks and services only reach their own deck; lifts carry roads, colonists and rovers between decks. A greyed card says where it stands (<b>Upper deck only</b>): click it to go there.</p>`)}
  ${sec('landmarks', 'Landmarks', card('lantern') + card('govgarden'), `
    <p><b>Landmarks</b> are Eden's great works, in their own <b>Landmarks</b> tab of the build menu. Each is <b>one of a kind</b>, costs a lot and takes two or three weeks to build, and gives a <b>lasting bonus</b> while it works. A locked card says what it waits for; once a requirement is met it stays met.</p>
    <ul class="cl-hsteps">
      <li><b>Ruess's Workshop</b> (10 chambers open, Fabrication): two more construction crews, and every building costs a tenth less.</li>
      <li><b>Governor's Garden</b> (500 colonists, happiness 70 for 30 days): +5 happiness everywhere and the finest park in Eden nearby.</li>
      <li><b>Sato's Watch</b> (300 colonists, Long-range Sensors, Observation Decks): incidents and raids seen 3 days earlier, 4 research a day.</li>
      <li><b>The Lantern</b> (every main-deck chamber open): transports bring a quarter more colonists, relief convoys pay half as much again, +3 happiness.</li>
      <li><b>Hall of Names</b> (1,000 colonists, Civic Planning): +4 happiness, grief and fear fade twice as fast; once the Ninefold vault is open it holds the registry, and +3 more.</li>
      <li><b>Orbital Elevator</b> (3,000 colonists, Mass Driver; on the hull): relief convoys cost half, and Earth goods at the Market a quarter less.</li>
    </ul>`)}
  ${sec('wonders', 'Wonders', card('arboretum') + card('starport'), `
    <p><b>Wonders</b> are a grander tier above the landmarks, in their own <b>Wonders</b> tab. Each is one of a kind and <b>big</b> (4×4 to 7×7), so plan the space. A wonder is built in <b>stages</b>: placing it orders the first stage; when that is done, click it and order the <b>next stage</b> (each costs credits and parts, often alloy, and takes days). You can watch it grow. Only the finished wonder works. All wait on <b>Monumental Engineering</b> (research), colonists, and sometimes a landmark.</p>
    <ul class="cl-hsteps">
      <li><b>Concert Hall</b> (4×4, upper or main; 2,500 colonists): happiness 8 for every home within 24 tiles, land value +10, leisure for visitors.</li>
      <li><b>Memorial Garden</b> (5×5, main deck; 2,500, Hall of Names): +5 happiness, grief and fear fade twice as fast again, a park, land value +10.</li>
      <li><b>Grand Arboretum</b> (6×6, upper deck gardens; 5,000, Governor's Garden): +4 happiness, a park of 14 within 20 tiles, land value +15 within 24, 500 air a day.</li>
      <li><b>Great Library</b> (5×5, upper or main; 5,000, Hall of Names): 4 research a day for every 1,000 colonists.</li>
      <li><b>Starport</b> (5×5, in space by the hull; 5,000, Orbital Elevator): transports bring <b>twice</b> the colonists, and four times the visitors can arrive.</li>
      <li><b>Zero-G Arena</b> (6×6, lower deck; 10,000): +6 happiness, 300 credits a day, the biggest draw for tourists.</li>
      <li><b>Spin-Gravity Ring</b> (6×6, in space; 10,000, the Starport): homes for 3,000, +3 happiness.</li>
    </ul>
    <p>Every wonder also draws <b>tourists</b>. Its moment comes when the last stage is done.</p>`)}
  ${sec('tourism', 'Tourism', card('hotel') + card('promenade'), `
    <p>Visitors come to see Eden and <b>pay credits</b> every day they stay. Research <b>Tourism</b> (after Civic Planning) for Hotels, Promenades, Theatres and Casinos. The <b>More</b> menu in the top bar shows today's visitors and earnings; the <b>Market</b> lists what draws them and what holds them back.</p>
    <ul class="cl-hsteps">
      <li><b>Attraction</b>: wonders (20 to 50 each), working landmarks (8 each), parks and greenery, leisure, a happy city, and land value at the hotels. Each point brings 8 visitors a day who want to come.</li>
      <li><b>Beds</b>: a <b>Hotel</b> starts as a Guest House for 80 and grows by itself, like a Habitat, into a Hotel (200) with a park and leisure within 16 tiles, and a Grand Hotel (400) on land worth 55.</li>
      <li><b>Arrivals</b>: 300 visitors a day come through the dock; the <b>Starport</b> brings four times as many.</li>
      <li><b>Spending</b>: 1 credit a visitor a day, more with leisure around (a Promenade 1, a Theatre 2, a Casino 3, the Concert Hall 3), up to 3; Commerce adds a fifth.</li>
    </ul>
    <p>Visitors are the least of attraction, beds and arrivals. Fill the space around a wonder with parks, a Promenade and hotels, and it pays.</p>`)}
  ${sec('ark', 'The Ark', `<figure class="cl-hfig cl-hbook"><span style="font-size:42px;color:#7ff0d0">✧</span><figcaption>Beyond Eden</figcaption></figure>`, `
    <p><b>The Ark</b> is Eden's last and greatest project: a generation ship built in a 7×7 dock in space beside the hull, in <b>five stages</b> (Keel, Hull, Drive, Habitat Decks, and the provisions). Each stage needs thousands of alloy and parts, then helium-3, food and water, so build Warehouses, Granaries and Freight Yards to hold it all.</p>
    <p>It waits on <b>15,000 colonists</b>, the <b>Starport</b> and <b>Generation Ships</b> (research). Finishing it is a <b>second ending, Beyond Eden</b>, kept in your save. It is entirely optional: it never stands in the way of Eden Restored, and it gives the city after the win something to build towards.</p>`)}
  ${sec('districts', 'Districts', card('park') + card('lab'), `
    <p>Click any tile of an <b>open chamber</b> and the inspector offers four <b>districts</b>. Declare one and the chamber earns a bonus that grows as you fill its land with buildings that <b>fit</b>: at <b>25%, 50% and 75%</b> of its land (roads left out) it reaches tiers 1, 2 and 3. The inspector shows the fill and what the next tier gives; the minimap tints the chamber in the district's colour.</p>
    <ul class="cl-hsteps">
      <li><b>❀ Garden District</b>: parks, groves, gardens, orchards and homes (forests count already). Each tier: +1 happiness for everyone, 20 air a day, land value +4 in the chamber.</li>
      <li><b>⚙ Industrial Quarter</b>: industry, power, plants, stores and workshops (no homes). Each tier: its buildings make 5% more.</li>
      <li><b>✎ University Quarter</b>: labs, schools, galleries, clinics, campus greens and student homes. Each tier: its labs make 10% more, and 2 research a day.</li>
      <li><b>★ Entertainment District</b>: hotels, promenades, theatres, casinos, cafés and the homes round them. Each tier: +6 tourism attraction and +1 happiness.</li>
    </ul>
    <p><b>Homes fit every district but the Industrial Quarter.</b> A chamber has one theme; you may change it 30 days after the last change. Districts' happiness together is at most +8. It is all optional: a chamber without a district works exactly as before.</p>`)}
  ${sec('gardens', 'Eden\'s gardens', card('grove') + card('skygarden'), `
    <p>Every park, grove, sky garden, orchard and vineyard, the forests and the water in your open chambers, Garden Districts and the Grand Arboretum add up to Eden's <b>greenery</b> (click Happiness in the top bar to see it). As it grows, <b>wildlife comes back</b>, once each, with a small lasting gift:</p>
    <ul class="cl-hsteps">
      <li><b>80: bees and butterflies</b>: orchards, coffee and vines make a tenth more.</li>
      <li><b>160: birds in the sky gardens</b>: +2 happiness and +5 attraction for visitors.</li>
      <li><b>280: fish in the canals</b>: Fisheries make a quarter more.</li>
      <li><b>420: deer in the forests</b>: +2 happiness and +10 attraction.</li>
    </ul>
    <p><b>The Garden of Eden</b> is an optional ending: <b>greenery 600</b> and <b>happiness 70</b> on the same day. It is kept in your save and never stands in the way of Eden Restored or the Ark.</p>`)}
  ${sec('luxuries', 'Luxuries', card('coffee') + card('vineyard') + card('artisan'), `
    <p>Research <b>Luxury Goods</b> (after High-rise Homes). The <b>well-off</b>, who live in <b>Spires and Skyscrapers</b> (Tower Blocks at levels 3 and 4), <b>Arcologies</b> and the <b>Spin-Gravity Ring</b>, would like <b>coffee</b> (Coffee Terraces, on the hills), <b>wine</b> (Vineyard Domes, upper deck) and <b>art</b> (Artisan Workshops, from a little parts).</p>
    <p>Each luxury they get in full gives <b>+2 happiness</b>, and art on show draws visitors. A <b>Skyscraper</b> needs coffee and wine to grow, and to stay a Skyscraper. <b>Nothing else suffers without them</b>: no shortages, no unrest. The new goods appear in the More pop-out and the Market only once you can make them; what the stores cannot hold is sold to the traders by itself.</p>`)}
  ${sec('neighbours', 'Neighbours', '', `
    <p>Three settlements watch Eden: <b>the Union remnant</b>, <b>the Galt remnant</b> and <b>Moraine's Ashfall Cartel</b>. Each has a <b>mood</b> toward Eden, from −100 to 100 (Defence panel › <b>Neighbours</b>).</p>
    <p><b>Trade</b> at the Market, <b>relief convoys</b> to Earth, <b>petitions granted</b>, <b>raids beaten off</b> and squadrons calling at their <b>outposts</b> warm them; paying raiders off, refusing their requests or clearing the Cartel's den cools them. Moods drift slowly back over time.</p>
    <p>Every month or two one of them sends a <b>trade deal</b>, a <b>request for aid</b>, a <b>warning</b> about a raider base or a <b>gift</b>. At <b>Friendly (30)</b> and <b>Allied (60)</b> they offer perks: better prices, a Union officer for the Lodge, a Galt machine, the Cartel's lower tribute and a truce. At <b>Hostile (−40)</b> their raider den grows bold. Switch them off in Settings if you like.</p>`)}
  ${sec('incidents', 'Incidents', card('shieldpylon') + card('flareshelter'), `
    <p>Now and then something happens to Eden, but <b>never without warning</b>. None come in the first 60 days (75 on Easy), then one every two or three months (less often on Easy). Each is announced <b>5 days ahead</b> with exactly what helps, and the advisor repeats it with a <b>Fix</b> button. Hazard Forecasting and Sato's Watch see them sooner.</p>
    <ul class="cl-hsteps">
      <li><b>Meteor shower</b>: a few unshielded buildings on the hull or in space are knocked out for a few days. <b>Shield Pylons</b> protect everything within 8 tiles.</li>
      <li><b>Solar flare</b>: Solar Arrays and Sun Mirrors make half their power for 2–3 days. Charged <b>Battery Banks</b> carry it; a <b>Flare Shelter</b> (Hazard Forecasting) keeps three quarters and everyone calm.</li>
      <li><b>Burst main</b>: a water plant is down for some days. A <b>Safety Post</b> nearby clamps it in a day; water in store tides you over.</li>
      <li><b>Fever</b>: if <b>Clinics</b> cover 80% of homes it is contained; otherwise some colonists are off work for a few days and spirits dip. Nobody dies of it.</li>
      <li>And good news: a <b>trade caravan</b> (sell spare goods at half as much again) and a <b>comet pass</b> (free water, as much as your stores can hold).</li>
    </ul>
    <p>Too much? <b>Settings › Incidents</b> turns them off.</p>`)}
  ${sec('petitions', 'Petitions', card('park') + card('canteen'), `
    <p>Now and then a group in Eden <b>petitions the Council</b> for something concrete: the garden families a park on the upper deck, the dock traders a Warehouse near the dock, the pump hall crew a Clinic on the lower deck, Capt. Sato another Battery Emplacement. They only ask for what you can already build. None come in the first 40 days (50 on Easy), and at most two are open at once (one on Easy).</p>
    <ul class="cl-hsteps">
      <li>The petition arrives in a window with <b>Show me</b>, and stays in the <b>advisor</b> list with how many days are left (40, or 50 on Easy). The advisor warns in the last week.</li>
      <li><b>Granted in time</b>: build a new one of what they asked for, where they asked. The Council pays its grant, happiness rises for a few weeks, and some groups add a gift of their own (food, parts, research).</li>
      <li><b>Let lapse</b>: a small dip in happiness that fades in ten days. They may ask again much later.</li>
    </ul>
    <p>Not for you? <b>Settings › Petitions</b> turns them off (the open ones are withdrawn without penalty).</p>`)}
  ${sec('secrets', 'Secrets of Eden', `<figure class="cl-hfig cl-hbook">${SICON.book}<figcaption>Discoveries</figcaption></figure>`, `
    <p>Eden was not emptied by an ordinary war, and not everything down there is dead. When a survey finishes, Ruess's team reports what the chamber holds, and the <b>Discoveries</b> journal (top bar, or key <b>J</b>) keeps it all.</p>
    <ul class="cl-hsteps">
      <li><b>Logs.</b> Terminals, recorders, diaries and words on walls, in the order the story runs. Each one found can be read at once; a new one is marked <b>New</b>. Most lie on the <b>lower deck</b>.</li>
      <li><b>The code.</b> Five logs each hold a <b>fragment</b> of a code. The row of five slots fills as you read them.</li>
      <li><b>Vaults.</b> Sealed rooms, each with its own way in: its chamber open, and perhaps a log read, the floor drained, the guard cleared or spare power. The journal lists what is still missing, with <b>Show me</b>. Inside: stores, research, and machines nobody has seen.</li>
      <li><b>Survivors.</b> People still hide in Eden. Open the chamber they hide in and they join the colony; a few of them can lead.</li>
      <li><b>Dangers</b> keep a chamber from taking air until they are dealt with. <b>Sentry drones</b>: send the crewed guardians (the journal shows the win chance; machines can be lost). <b>Toxic air</b> and <b>radiation</b>: crews decontaminate for credits, parts and days. <b>Flooding</b>: Pump Stations drain it.</li>
      <li><b>Something stirs</b> deep under Eden. If a survey wakes it, a countdown appears in the top bar: deal with it before it runs out.</li>
    </ul>
    <p>The inspector shows what a chamber holds: click a surveyed chamber to read, open or clear right there.</p>`)}
  ${sec('expeditions', 'Expeditions', `<figure class="cl-hfig cl-hbook"><span style="font-size:42px;color:#7affd8">✦</span><figcaption>Star chart</figcaption></figure>`, `
    <p>Eden's guardians can fly beyond the hull. The <b>Star chart</b> (top bar, or key <b>X</b>) shows the sectors in three rings around Eden, Earth below. The inner ring is charted at the start; visiting a sector charts the ones beyond it.</p>
    <ul class="cl-hsteps">
      <li><b>A squadron</b>: up to six crewed, undamaged guardians, perhaps with a commander. Pick a sector, tick the machines, check the win chance and <b>Launch</b>. The trip takes 4 days per ring each way.</li>
      <li><b>Away is away</b>: machines on an expedition do not defend Eden from raids or sentries. A squadron can be recalled before it arrives.</li>
      <li><b>Sites</b>: asteroid belts and comets (ore, water), derelicts (salvage, maybe a machine), Galt bunkers (survivors, blueprints), outposts (trade, wanderers), <b>pirate dens</b> (clear them: heat falls and raids come less often), the Directorate listening post, Earth relief stations, and the wreck of the Babylon.</li>
      <li><b>Hazards</b> in the outer rings (debris, radiation) cost hull unless a commander with good wits leads the squadron. The report comes home with them.</li>
    </ul>`)}
  ${sec('victory', 'Winning: Eden Restored', `<figure class="cl-hfig cl-hbook"><span style="font-size:42px;color:#ffd98a">✺</span><figcaption>Eden Restored</figcaption></figure>`, `
    <p>The Council declares Eden restored when four things are true at once. It is a long road: the goals walk you there, and the Market shows how far along you are.</p>
    <ul class="cl-hsteps">
      <li><b>Every chamber open</b>, on all three decks: survey, seal, clear dangers and pressurise them all.</li>
      <li><b>A city of 25,000 colonists.</b> Late research builds it: <b>Tower Blocks</b> (150, growing to 450), <b>Arcologies</b> (1,500 each), <b>Arrivals Halls</b> (bigger transports), and <b>Vertical Farms</b>, <b>Water Works</b>, <b>Atmosphere Processors</b> and <b>Sun Mirrors</b> to keep it fed, watered, breathing and lit. Clinics bring children.</li>
      <li><b>A happy city</b>: happiness above 85, held for 30 days (a day at or below 85 costs three days of progress). Cover the homes with parks, Clinics, Canteens, Safety Posts, Galleries and <b>Civic Plazas</b>.</li>
      <li><b>Relief for Earth</b>: ship the relief quota (60 loads on Easy, 90 on Normal) from the <b>Market</b>. A load is 500 food, water or air, or 100 helium-3. One convoy leaves a day: from the dock it carries one load; a <b>Mass Driver</b> on the hull launches three at once, and on <b>Automatic</b> it launches by itself, always keeping ten days of needs at home. First, a squadron must reach an <b>Earth relief station</b> on the Star chart.</li>
      <li><b>After the ending</b> the colony carries on: the victory is kept in your save, and Eden is yours to keep growing.</li>
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
      <li>The <b>buttons on the map</b> (top right) zoom, rotate, tilt, move a <b>deck up or down</b> (▲ ▼) and fly <b>home</b> to the Command Centre.</li>
      <li>The <b>minimap</b> (bottom right) shows all of Eden: <b>click or drag on it</b> to jump there. The outline is what you see now.</li>
      <li>Keys: <b>W A S D</b> or the <b>arrows</b> pan, <b>Q / E</b> rotate, <b>+ / −</b> zoom, <b>PgUp / PgDn</b> one deck up or down, <b>Home</b> back to the Command Centre.</li>
    </ul>
    <p>With a mouse: drag to rotate, right-drag to pan, the wheel zooms. The map buttons and the minimap can be switched off in Settings (⚙).</p>`)}
  ${sec('photo', 'Photo mode', '', `
    <p>Press <b>P</b> or the <b>◉</b> button for <b>photo mode</b>: the interface hides and the camera orbits the colony slowly. The little bar at the bottom turns the <b>orbit</b> and a slow <b>fly-through</b> on or off, holds a <b>time of day</b>, and <b>Save picture</b> downloads the view as a PNG. Drag, scroll and the camera keys still work. <b>Esc</b> or P leaves.</p>`)}
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
    <p class="cl-dim">Keys: space pause · 1 / 2 / 3 speed · R build again · T research · G defence · J discoveries · PgUp / PgDn deck · Esc cancel · F1 or ? this guide.</p>`)}
  </div>`;
}

// One stock readout in the top bar (owner, 2026-11-05: "the top status bar becomes crowded": the bar keeps
// colonists, happiness, credits, parts, power and life support; the rest is under More).
const goodStat = (g) => `<div class="cl-stat" data-g="${g}"${LATE[g] ? ' hidden' : ''} title="${GOOD_NAME[g]}: stock / capacity, change per day"><i>${g === 'helium' ? 'Helium' : GOOD_NAME[g]}</i><b><span data-v></span><small data-c></small></b><em data-d></em></div>`;

export function createUI(root, api) {
  const R = api.rules;
  const S = () => api.state();
  root.innerHTML = `
  <header class="cl-top">
    <div class="cl-date"><i>Eden</i><b data-h="day">Day 0</b><em class="cl-deckname" data-h="deck" data-deck="main" title="The deck on show (PageUp / PageDown)">Main deck</em></div>
    <div class="cl-speeds" role="group" aria-label="Speed">
      <button type="button" data-speed="0" title="Pause (space)">❚❚</button>
      <button type="button" data-speed="1" title="×1 (1)">×1</button>
      <button type="button" data-speed="2" title="×2 (2)">×2</button>
      <button type="button" data-speed="4" title="×4 (3)">×4</button>
    </div>
    <div class="cl-stats">
      <div class="cl-stat" data-g="pop" title="Colonists / housing; next transport"><i>Colonists</i><b><span data-v></span><small data-c></small></b><em data-d></em></div>
      <button type="button" class="cl-stat cl-happybtn" data-g="happy" title="Happiness: click for the breakdown"><i>Happiness</i><b><span data-v></span></b><em data-d></em></button>
      ${goodStat('credits')}${goodStat('parts')}
      <div class="cl-stat" data-g="power" title="Power: supply / demand (MW), battery"><i>Power</i><b><span data-v></span><small data-c></small></b><em data-d></em></div>
      <div class="cl-life" role="group" aria-label="Life support: food, water and air">${goodStat('food')}${goodStat('water')}${goodStat('air')}</div>
      <button type="button" class="cl-stat cl-corestat" data-g="core" hidden title="The old core: days left to stabilise it"><i>Core</i><b><span data-v></span><small data-c></small></b><em data-d></em></button>
      <div class="cl-morewrap">
        <button type="button" class="cl-morebtn" data-more aria-expanded="false" aria-haspopup="true" title="More: ore, alloy, helium-3, research, heat and the tax"><span>More</span><b>▾</b><i class="cl-moredot" data-moredot hidden></i></button>
        <div class="cl-more" data-morepop hidden>
          ${goodStat('ore')}${goodStat('alloy')}${goodStat('helium')}${goodStat('coffee')}${goodStat('wine')}${goodStat('art')}
          <button type="button" class="cl-stat cl-resstat" data-g="research" hidden title="Research a day from the labs"><i>Research</i><b><span data-v></span><small data-c></small></b><em data-d></em></button>
          <button type="button" class="cl-stat cl-tourstat" data-g="tourism" hidden title="Tourism: visitors staying today and what they spend; click for the Market's tourism read-out"><i>Tourism</i><b><span data-v></span><small data-c></small></b><em data-d></em></button>
          <button type="button" class="cl-stat cl-heatstat" data-g="heat" hidden title="Heat: how tempting Eden looks to raiders"><i>Heat</i><b><span data-v></span><small data-c></small></b><em data-d></em></button>
          <div class="cl-stat cl-tax" title="Tax rate: 0% +8 happiness, 10% 0, 20% −14, 30% −32. Shift-click steps 5%."><i>Tax</i>
            <b class="cl-taxctl"><button type="button" data-taxstep="-1" aria-label="Lower the tax">−</button><span data-tax></span><button type="button" data-taxstep="1" aria-label="Raise the tax">+</button></b><em data-taxfx></em></div>
        </div>
      </div>
    </div>
    <div class="cl-tools">
      <button type="button" class="cl-btn sm cl-resbtn" data-tool="research" title="Research: the tech tree (T)"><span class="cl-ico">⚗</span><span class="cl-lbl">Research</span></button>
      <button type="button" class="cl-btn sm cl-defbtn" data-tool="defence" title="Defence: guardians, production, commanders and raids (G)"><span class="cl-ico">⛨</span><span class="cl-lbl">Defence</span></button>
      <button type="button" class="cl-btn sm cl-xbtn" data-tool="chart" title="Star chart: expeditions to the sectors around Eden (X)"><span class="cl-ico">✦</span><span class="cl-lbl">Star chart</span></button>
      <button type="button" class="cl-btn sm cl-jbtn" data-tool="journal" hidden title="Discoveries: logs, vaults, survivors and dangers (J)"><span class="cl-ico cl-bookico">${SICON.book}</span><span class="cl-lbl">Discoveries</span><span class="cl-jnew" data-jnew hidden></span></button>
      <button type="button" class="cl-btn sm" data-tool="market" title="Sell goods and guardians"><span class="cl-ico">⚖</span><span class="cl-lbl">Market</span></button>
      <button type="button" class="cl-btn sm icon" data-tool="photo" title="Photo mode (P): hide the interface, orbit the colony, save a picture" aria-label="Photo mode">◉</button>
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
      <div class="cl-rci" data-rci hidden></div>
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
  <section class="cl-journal cl-win" hidden role="dialog" aria-label="Discoveries">
    <header class="cl-rhead cl-jhead">
      <div class="cl-rtitle"><h3>Discoveries</h3><small>the secrets of Eden · J</small></div>
      <div class="cl-rstats" data-jstats></div>
      <button type="button" class="cl-x" data-close="journal" title="Close (Esc or J)" aria-label="Close">×</button>
    </header>
    <div class="cl-jkeys" data-jkeys></div>
    <div class="cl-dtabs cl-jtabs" role="tablist">${J_TABS.map(([k, n]) => `<button type="button" role="tab" data-jtab="${k}" aria-selected="false">${n}<span data-jtabn="${k}"></span></button>`).join('')}</div>
    <div class="cl-jbody" data-jbody></div>
  </section>
  <section class="cl-chart cl-win" hidden role="dialog" aria-label="Star chart">
    <header class="cl-rhead cl-xhead">
      <div class="cl-rtitle"><h3>Star chart</h3><small>expeditions · X</small></div>
      <div class="cl-rstats" data-xstats></div>
      <button type="button" class="cl-x" data-close="chart" title="Close (Esc or X)" aria-label="Close">×</button>
    </header>
    <div class="cl-xbody"><div class="cl-xmap" data-xmap></div><div class="cl-xside" data-xside></div></div>
  </section>
  <div class="cl-decks" role="group" aria-label="Deck" title="Decks: open / all chambers on each. PageUp / PageDown move between them."><i>Deck</i>${DECKS.map((d) => `<button type="button" data-deck="${d}" aria-pressed="${d === 'main'}"><b>${DECK_NAME[d]}</b><small data-deckn="${d}"></small></button>`).join('')}</div>
  <div class="cl-ovl" role="group" aria-label="Overlay"><i>Overlay</i>${OVERLAYS.map(([k, n]) => `<button type="button" data-ovl="${k ?? ''}" aria-pressed="${k === null}"${k === 'value' ? ' title="Land value: where homes and shops want to grow"' : ''}>${n}</button>`).join('')}<span class="cl-ovl-key" data-ovlkey hidden title="Land value: low (blue) to high (yellow)">Low<b></b>High</span></div>
  <div class="cl-placing" hidden><span data-placing></span> <button type="button" class="cl-btn sm" data-cancel>Cancel</button></div>
  <div class="cl-log" data-log title="Colony log (click to expand)"></div>
  <div class="cl-tip" hidden></div>
  <div class="cl-toasts" aria-live="polite"></div>
  <div class="cl-modal" hidden><div class="cl-win cl-event" role="dialog" aria-modal="true" aria-labelledby="evTitle"></div></div>`;

  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const statEls = {};
  for (const el of $$('.cl-stat[data-g]')) statEls[el.dataset.g] = { el, base: el.className, v: el.querySelector('[data-v]'), c: el.querySelector('[data-c]'), d: el.querySelector('[data-d]') };
  // the More pop-out (top bar): opens on click, closes on a click elsewhere or Esc; a dot when something in it needs a look
  const moreBtn = $('[data-more]'), morePop = $('[data-morepop]'), moreDot = $('[data-moredot]');
  const moreOpen = (on) => { morePop.hidden = !on; moreBtn.setAttribute('aria-expanded', String(on)); };
  moreBtn.addEventListener('click', (e) => { e.stopPropagation(); moreOpen(morePop.hidden); });
  document.addEventListener('pointerdown', (e) => { if (!morePop.hidden && !e.target.closest('.cl-morewrap')) moreOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !morePop.hidden) moreOpen(false); });
  function moreFlag() {
    const bad = !!morePop.querySelector('.cl-stat:not([hidden]).down, .cl-resstat.idle:not([hidden])');
    if (moreDot.hidden === bad) moreDot.hidden = !bad;
  }
  const dayEl = $('[data-h=day]'), taxEl = $('[data-tax]'), taxFx = $('[data-taxfx]');
  const rciEl = $('[data-rci]');
  const cardsEl = $('[data-cards]'), insp = $('.cl-insp'), inspBody = $('[data-insp]'), tipEl = $('.cl-tip'), toasts = $('.cl-toasts');
  const logEl = $('[data-log]'), modal = $('.cl-modal'), evBox = $('.cl-event'), placingEl = $('.cl-placing');
  const pops = { happy: $('[data-pop=happy]'), market: $('[data-pop=market]'), settings: $('[data-pop=settings]') };
  let cat = CATEGORIES[0].key, cardSig = '', inspAt = null, inspSig = '', logSig = '', logOpen = false, evId = null, marketSig = '', happySig = '';
  let summary = null, dirty = false;

  const result = (r) => api.act(r);

  // ---------------------------------------------------------------- decks (version 4)
  const D = () => api.deck?.() || 'main';
  const hasDeck = (s, d) => d === 'main' || !!s.decks?.[d]?.t;
  // The deck's map { w, h, t, r, ch, sv } (main = state.map).
  const mapOf = (s, d = D()) => {
    if (d === 'main') return s.map;
    try { const m = api.mapOf?.(d) || R.mapOf?.(s, d); if (m) return m; } catch { }
    return s.decks?.[d] ? { w: s.map.w, h: s.map.h, ...s.decks[d] } : s.map;
  };
  const decksFor = (key) => { try { return api.decksFor?.(key) || BUILDING[key]?.decks || ['main']; } catch { return BUILDING[key]?.decks || ['main']; } };
  const onDeck = (o, d = D()) => deckOf(o) === d;
  $('.cl-decks').addEventListener('click', (e) => { const b = e.target.closest('[data-deck]'); if (b && !b.disabled) api.setDeck?.(b.dataset.deck); });
  let deckSig = '';
  function renderDecks() {
    const s = S(), d = D();
    const counts = DECKS.map((k) => { const cs = s.chambers.filter((c) => deckOf(c) === k); return [k, cs.filter((c) => c.status === 'open').length, cs.length, hasDeck(s, k)]; });
    const sig = d + JSON.stringify(counts);
    if (sig === deckSig) return;
    deckSig = sig;
    for (const [k, open, total, has] of counts) {
      const b = $(`.cl-decks [data-deck="${k}"]`);
      b.setAttribute('aria-pressed', String(k === d));
      b.disabled = !has;
      b.querySelector('[data-deckn]').textContent = has ? `${open}/${total}` : '–';
      b.title = has ? `${DECK_NAME[k]} deck: ${open} of ${total} chambers open.\n${DECK_TEXT[k]}${k === d ? '' : `\nClick (or ${DECKS.indexOf(k) < DECKS.indexOf(d) ? 'PageUp' : 'PageDown'}) to go there.`}` : `${DECK_NAME[k]} deck: not in this colony yet.`;
    }
    const nm = $('[data-h=deck]');
    nm.textContent = `${DECK_NAME[d]} deck`; nm.dataset.deck = d;
    root.dataset.deck = d;
  }

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
  // ---------------------------------------------------------------- version 4, stage 3: the Star chart
  // The rings around Eden (Earth below) with the sectors by site type, squadrons in flight; a sector's
  // card with a squadron picker, a commander and the preview; Launch. Orders go through rules.js.
  const xEl = $('.cl-chart'), xMap = $('[data-xmap]'), xSide = $('[data-xside]'), xStats = $('[data-xstats]');
  const RING_R = [0, 34, 62, 90];
  let xSel = null, xPick = new Set(), xCmd = '', xSig = '';
  const xy = (r, a) => [+(Math.cos(a) * r).toFixed(1), +(Math.sin(a) * r).toFixed(1)];
  const xReady = (s, g) => { const crew = crewSet(s); return !g.away && hpOf(g) >= maxHp(g) && (!crew || crew.has(g.id)); };
  function xDefaultPick(s) {
    xPick = new Set((s.guardians || []).filter((g) => xReady(s, g)).sort((a, b) => gPower(s, b) - gPower(s, a)).slice(0, 4).map((g) => g.id));
  }
  function renderChart(force) {
    if (xEl.hidden) return;
    const s = S(), st = rule('expeditionStatus', s);
    if (!st) { xSide.innerHTML = note('Expeditions are not ready in this build yet.'); return; }
    const sig = JSON.stringify([s.day, xSel, [...xPick], xCmd, st.away.map((e) => [e.id, e.left, e.report ? 1 : 0]), st.sectors.map((x) => `${+x.known}${+x.visited}${+x.cleared}`).join(''),
      (s.guardians || []).map((g) => `${g.id}:${g.hp}:${g.away || ''}:${g.commander || ''}`).join(), (s.commanders || []).map((c) => `${c.key}${c.injured > 0 ? 'i' : ''}`).join()]);
    if (!force && sig === xSig) return;
    xSig = sig;
    const known = st.sectors.filter((x) => x.known).length;
    xStats.innerHTML = `<span class="cl-rst" title="Sectors charted / all"><i>Charted</i><b>${known}<small>/${st.sectors.length}</small></b><em>${st.sectors.filter((x) => x.visited).length} visited</em></span>
      <span class="cl-rst" title="Squadrons away from Eden: their machines do not defend it"><i>Away</i><b>${st.away.length}</b><em>${(s.guardians || []).filter((g) => g.away).length} machines</em></span>
      <span class="cl-rst" title="Pirate dens cleared: heat lower, raids rarer"><i>Dens</i><b>${st.dens}</b><em>cleared</em></span>`;
    xMap.innerHTML = chartSvg(s, st);
    xSide.innerHTML = xSel ? sectorCard(s, st.sectors.find((x) => x.id === xSel)) : chartHome(s, st);
  }
  function chartSvg(s, st) {
    const byId = Object.fromEntries(st.sectors.map((x) => [x.id, x]));
    const links = st.sectors.filter((x) => x.parent && x.known).map((x) => { const p = byId[x.parent], [a, b] = xy(RING_R[p.ring], p.angle), [c, d] = xy(RING_R[x.ring], x.angle); return `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="cl-xlink"/>`; }).join('');
    const secs = st.sectors.map((x) => {
      const [cx, cy] = xy(RING_R[x.ring], x.angle), col = x.known ? SITE_COLOR[x.site] : '#55607a';
      return `<g class="cl-xsec${x.id === xSel ? ' sel' : ''}${x.known ? '' : ' unknown'}${x.cleared ? ' cleared' : ''}" data-xsec="${x.id}" transform="translate(${cx} ${cy})" style="--sc:${col}">
        <title>${esc(x.known ? `${x.name}: ${x.siteName}` : 'Uncharted sector')}</title><circle r="7.5"/><text dy="3.2">${x.known ? SITE_GLYPH[x.site] : '?'}</text>${x.cleared ? '<text class="cl-xok" dx="6.5" dy="-4.5">✓</text>' : ''}</g>`;
    }).join('');
    const ships = st.away.map((e) => {
      const r = RING_R[e.ring] * e.pos, [cx, cy] = xy(r, e.angle), deg = (e.angle * 180 / Math.PI + (e.outbound ? 90 : 270)).toFixed(0);
      return `<g class="cl-xship" transform="translate(${cx} ${cy})"><path d="M0 -4.5 L3.2 3.5 L0 2 L-3.2 3.5 Z" transform="rotate(${deg})"/><text dy="-6">${e.left}d</text></g>`;
    }).join('');
    return `<svg viewBox="-104 -104 208 232" class="cl-xsvg" role="img" aria-label="The sectors around Eden">
      <circle class="cl-xearth" cx="0" cy="118" r="20"/><text class="cl-xlbl cl-xearthl" x="0" y="113">EARTH</text>
      ${RING_R.slice(1).map((r) => `<circle class="cl-xring" r="${r}"/>`).join('')}${links}
      <circle class="cl-xeden" r="6"/><text class="cl-xlbl" y="13">EDEN</text>${secs}${ships}</svg>`;
  }
  function awayList(s, st) {
    if (!st.away.length) return '';
    return `<div class="cl-dsec"><h4>Squadrons away</h4>${st.away.map((e) => `<div class="cl-xaway"><b>${esc(e.name)}</b><small>${plural(e.guardians.length, 'machine')}${e.commander ? ` · ${esc(CMDR[e.commander]?.name || e.commander)}` : ''} · ${e.outbound ? `arrives in ${e.arrive - s.day} d` : 'on the way home'}, back in ${e.left} d</small>
      ${e.outbound ? `<button type="button" class="cl-btn xs" data-xrecall="${e.id}">Recall</button>` : ''}</div>`).join('')}</div>`;
  }
  function chartHome(s, st) {
    const last = st.log.slice(-4).reverse();
    return `${note('Click a sector to see what is known of it and send a squadron. The inner ring is charted; a visit charts the sectors beyond it. Machines away do not defend Eden.')}
      ${awayList(s, st)}
      ${last.length ? `<div class="cl-dsec"><h4>Reports</h4>${last.map((r) => `<p class="cl-xrep"><b>${esc(r.name)}</b> <small class="cl-dim">day ${r.back ?? r.day}</small><br>${r.recalled ? 'Recalled before it arrived.' : `${r.won ? 'Success' : 'Beaten off'}${r.lost?.length ? `, lost ${r.lost.length}` : ''}${r.got?.length ? `: ${esc(r.got.join('; '))}` : '.'}`}</p>`).join('')}</div>` : ''}`;
  }
  function sectorCard(s, x) {
    if (!x) return chartHome(s, rule('expeditionStatus', s));
    const head = `<button type="button" class="cl-jback" data-xback>‹ The chart</button>
      <h3 class="cl-xname" style="--sc:${x.known ? SITE_COLOR[x.site] : '#8890a8'}"><span>${x.known ? SITE_GLYPH[x.site] : '?'}</span>${esc(x.known ? x.name : 'Uncharted sector')}</h3>
      <p class="cl-dim">Ring ${x.ring} · ${x.days} days each way${x.known ? ` · ${esc(x.siteName)}${x.cleared ? ' · cleared' : x.visited ? ' · visited' : ''}` : ''}</p>`;
    if (!x.known) return `${head}${note('Nobody has been out this far yet. Visit the sector next to it, nearer Eden, to chart it.')}`;
    const pic = banner(`site/${x.site}`, x.siteName || x.name);
    const site = R.SITES?.[x.site] || {}, gs = s.guardians || [], crew = crewSet(s);
    const ids = [...xPick].filter((id) => gs.some((g) => g.id === id));
    const pv = rule('expeditionPreview', s, x.id, ids, xCmd || null) || {};
    const pct = pv.winChance != null ? Math.round(pv.winChance * 100) : null;
    const rows = gs.length ? gs.map((g) => {
      const m = mInfo(g.type), why = g.away ? 'away' : hpOf(g) < maxHp(g) ? 'damaged' : crew && !crew.has(g.id) ? 'no crew' : '';
      return `<label class="cl-xg${why ? ' off' : ''}"><input type="checkbox" data-xg="${g.id}" ${xPick.has(g.id) ? 'checked' : ''} ${why ? 'disabled' : ''}><b>${esc(m.name)}</b><small>${why || `L${g.level || 0}${g.commander ? ` · ${esc(CMDR[g.commander]?.name || '')}` : ''}`}</small><span>${num(gPower(s, g))}</span><em>${num(hpOf(g))}/${num(maxHp(g))} HP</em></label>`;
    }).join('') : note('No guardians yet: build an Arsenal and order machines (Defence, G).');
    const cms = commanders(s).filter((c) => !(c.injured > 0) && !gs.some((g) => g.commander === c.key && g.away));
    const hz = pv.hazard;
    return `${head}${pic}<p>${esc(site.text || '')}</p>
      ${pv.strength ? `<div class="cl-kv"><span>Opposition</span><b>${num(pv.strength)}</b></div>` : ''}
      ${hz ? `<div class="cl-kv"><span>Hazard: ${esc(hz.name)}</span><b class="${hz.avoided ? 'good' : 'warn'}">${hz.avoided ? `${esc(CMDR[hz.by]?.name || 'The commander')} steers clear` : `−${Math.round(hz.hurt * 100)}% hull (wits over ${hz.need} avoids it)`}</b></div>` : ''}
      <div class="cl-kv"><span>Expected</span><b>${esc((pv.lootText || []).join(', ') || 'nothing left to find')}</b></div>
      <div class="cl-dsec"><h4>Squadron <small class="cl-dim">${ids.length}/6 · power ${num(pv.power || 0)}</small></h4><div class="cl-xglist">${rows}</div>
      <label class="cl-xcmd">Commander <select data-xcmd><option value="">None${pv.leader && !xCmd ? ` (${esc(CMDR[pv.leader]?.name || '')} aboard)` : ''}</option>${cms.map((c) => `<option value="${esc(c.key)}" ${xCmd === c.key ? 'selected' : ''}>${esc(CMDR[c.key]?.name || c.key)} (wits ${CMDR[c.key]?.wits ?? '?'})</option>`).join('')}</select></label></div>
      ${pv.strength ? `<div class="cl-win-chance${pct >= 65 ? ' good' : pct >= 40 ? ' even' : ' bad'}"><i>Win chance</i><span class="cl-wbar"><span style="width:${pct}%"></span></span><b>${pct}%</b></div>` : ''}
      <div class="cl-row"><button type="button" class="cl-btn primary" data-xlaunch ${pv.ok ? '' : `disabled title="${esc(pv.why || '')}"`}>Launch <small>${x.days * 2} days</small></button>${pv.ok ? '' : `<small class="cl-dim">${esc(pv.why || '')}</small>`}</div>
      ${awayList(s, rule('expeditionStatus', s))}`;
  }
  xEl.addEventListener('click', (e) => {
    const t = e.target, s = S();
    if (t.closest('[data-close=chart]')) { closeChart(); return; }
    const sec = t.closest('[data-xsec]');
    if (sec) { xSel = sec.dataset.xsec; xCmd = ''; xDefaultPick(s); renderChart(true); return; }
    if (t.closest('[data-xback]')) { xSel = null; renderChart(true); return; }
    const b = t.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.xlaunch != null) { const r = result(rule('launchExpedition', s, xSel, [...xPick], xCmd || null) ?? notReady('Expeditions')); if (r?.ok !== false) { xSel = null; xPick.clear(); } }
    else if (b.dataset.xrecall) result(rule('recallExpedition', s, +b.dataset.xrecall) ?? notReady('Recalling'));
    else return;
    renderChart(true);
  });
  xEl.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-xg]')) { const id = +t.dataset.xg; if (t.checked) xPick.add(id); else xPick.delete(id); }
    else if (t.matches('[data-xcmd]')) xCmd = t.value;
    else return;
    renderChart(true);
  });
  function openChart(sectorId) {
    for (const p of Object.values(pops)) p.hidden = true;
    closeResearch(); closeDefence(); closeJournal();
    $('.cl-build')?.classList.remove('open');
    if (sectorId) { xSel = sectorId; xDefaultPick(S()); }
    xEl.hidden = false;
    renderChart(true);
  }
  function closeChart() { if (!xEl || xEl.hidden) return false; xEl.hidden = true; return true; }
  function toggleChart(id) { if (xEl.hidden || id) openChart(id); else closeChart(); }

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
  statEls.tourism?.el.addEventListener('click', () => { moreOpen(false); openPop('market'); });   // version 9
  $('.cl-tools').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tool]')?.dataset.tool;
    if (t === 'research') toggleResearch();
    else if (t === 'defence') toggleDefence();
    else if (t === 'journal') toggleJournal();
    else if (t === 'chart') toggleChart();
    else if (t === 'market') togglePop('market');
    else if (t === 'save') api.save();
    else if (t === 'photo') api.photo?.();   // version 10: photo mode (main.js)
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
  // version 9: the tourism read-out's explanation (More pop-out tooltip, and the Market's section)
  function tourismWhy(t) {
    return `Tourism: ${num(t.visitors)} visitors today, spending ${t.spend} cr each: +${num(t.credits)} credits a day.`
      + `\nAttraction ${num(t.score)} (${t.parts.map((p) => `${p.label} ${p.value}`).join(', ') || 'nothing yet'}): ${num(t.want)} would like to come.`
      + `\nBeds ${num(t.beds)} in ${t.hotels} hotel${t.hotels === 1 ? '' : 's'} · arrivals ${num(t.cap)} a day.`
      + `\n${R.tourismLimitText ? R.tourismLimitText(t) : ''}\nClick for the Market's tourism read-out.`;
  }
  function tourismHtml(s) {
    if (typeof R.tourismOf !== 'function' || !(techDone(s, 'tourism') || s.tourism?.visitors > 0)) return '';
    let t; try { t = R.tourismOf(s); } catch { return ''; }
    const bar = (v, max) => `<span class="cl-fill"><span style="width:${Math.round(Math.min(1, max > 0 ? v / max : 0) * 100)}%"></span></span>`;
    const top = Math.max(t.want, t.beds, t.cap, 1);
    return `<h4>Tourism <small>${num(t.visitors)} visitors · +${num(t.credits)} cr a day · ${t.spend} cr each</small></h4>
      <div class="cl-fillrow"><span>Want to come</span>${bar(t.want, top)}<b>${num(t.want)}</b></div>
      <div class="cl-fillrow"><span>Beds</span>${bar(t.beds, top)}<b>${num(t.beds)}</b></div>
      <div class="cl-fillrow"><span>Arrivals</span>${bar(t.cap, top)}<b>${num(t.cap)}</b></div>
      <p class="cl-dim">Visitors are the least of the three. ${esc(R.tourismLimitText ? R.tourismLimitText(t) : '')}</p>
      ${t.parts.length ? `<table class="cl-table cl-mkt"><tbody>${t.parts.map((p) => `<tr><td>${esc(p.label)}</td><td class="n">+${num(p.value)}</td></tr>`).join('')}<tr><td><b>Attraction</b></td><td class="n"><b>${num(t.score)}</b> <small>× ${R.TOUR?.perPoint ?? 8} visitors</small></td></tr></tbody></table>` : ''}`;
  }
  // version 10: what the well-off want and get (the Market panel), once luxuries are relevant
  function luxuryHtml(s) {
    if (typeof R.luxuryStatus !== 'function' || !R.luxuriesShown(s)) return '';
    const L = R.luxuryStatus(s);
    return `<h4>Luxuries <small>${num(L.wellOff)} well-off in Spires, Skyscrapers, Arcologies and the Ring</small></h4>
      <table class="cl-table cl-mkt"><thead><tr><th>Good</th><th class="n">Wanted</th><th class="n">Had</th><th class="n">Store</th></tr></thead><tbody>${L.goods.map((g) => `<tr><td>${esc(g.name)}</td><td class="n">${num(g.want)}<small>/d</small></td><td class="n ${g.want > 0 ? (g.share >= 0.9 ? 'good' : 'bad') : ''}">${g.want > 0 ? `${Math.round(g.share * 100)}%` : '–'}</td><td class="n">${num(g.have)} <small>/ ${num(L.cap)}</small></td></tr>`).join('')}</tbody></table>
      <p class="cl-dim">Each luxury met gives +2 happiness; Skyscrapers need coffee and wine to hold. Nothing else suffers without them. Beyond the store, the surplus is sold to the traders by itself${L.exported ? ` (+${num(L.exported)} cr yesterday)` : ''}.</p>`;
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
    // version 9 (docs/COLONY-V9.md): tourism, once the colony can have visitors (Tourism researched, or any already)
    let tour = null;
    if (typeof R.tourismOf === 'function' && (techDone(s, 'tourism') || s.tourism?.visitors > 0)) { try { tour = R.tourismOf(s); } catch { tour = null; } }
    show('tourism', !!tour);
    if (tour) {
      stat('tourism', num(tour.visitors), ' visitors', `+${num(tour.credits)} cr/d`, tour.visitors > 0 ? 'up' : 'idle');
      setTitle('tourism', tourismWhy(tour));
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
    hudSecrets(s);
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
    if (c.dataset.deckgo) {   // not on this deck: go to a deck where it stands, with a spot marked
      if (matchMedia('(max-width: 760px)').matches) $('.cl-build').classList.remove('open');
      api.show?.({ build: c.dataset.key });
      return;
    }
    if (c.getAttribute('aria-disabled') === 'true') return;
    api.pick(c.dataset.key);
    if (matchMedia('(max-width: 760px)').matches) $('.cl-build').classList.remove('open');
  });

  // Version 7 had RCI demand bars here; version 9 (docs/COLONY-V9.md) retired the quads, and the bars with them.
  function renderRci() { if (rciEl && !rciEl.hidden) rciEl.hidden = true; }

  function buildMenu() {
    const s = S();
    const dk = D();
    let list; try { list = R.buildable(s, dk); } catch { list = []; }
    const by = Object.fromEntries((list || []).map((o) => [o.key, o]));
    // version 7: the zoning lots lead Homes & parks, under the RCI bars
    const items = BUILDINGS.filter((b) => b.cat === cat && !b.fixed && !b.retired).map((b) => {   // version 9: retired buildings are off the menu
      const o = by[b.key] || { key: b.key, name: b.name, cost: b.cost, unlocked: !b.unlock && !b.tech, why: b.unlock ? `At ${b.unlock.pop} colonists` : '' };
      const cost = o.cost || b.cost;
      const poor = (cost.credits || 0) > (s.stock.credits || 0) || (cost.parts || 0) > (s.stock.parts || 0);
      // version 2: still locked behind its tech (whatever rules.buildable words it as)
      const tech = !o.unlocked && b.tech && !techDone(s, b.tech) ? b.tech : null;
      // version 4: cannot stand on this deck ("Upper deck only"): click to go where it can
      const decks = decksFor(b.key), offDeck = !decks.includes(dk);
      return { b, o, cost, poor, tech, decks, offDeck };
    });
    const sig = cat + '|' + dk + '|' + items.map((i) => `${i.b.key}:${i.o.unlocked}:${i.o.why || ''}:${i.poor}:${i.tech}`).join(',') + '|' + api.placingKey?.();
    if (sig === cardSig) return;
    cardSig = sig;
    const placing = api.placingKey?.();
    cardsEl.innerHTML = items.map(({ b, o, cost, poor, tech, decks, offDeck }) => {
      const url = api.art?.(`card/${b.key}`);
      const deckLock = o.unlocked && offDeck;
      const locked = !o.unlocked || deckLock;
      // (rules.buildable words an off-deck building "Main deck only." even while it is still locked)
      const why = deckLock ? decksText(decks) : !locked ? '' : tech ? `Research ${TECH[tech]?.name || tech}` : ((o.onDeck !== false && o.why) || (b.unlock ? `At ${b.unlock.pop} colonists` : 'Locked'));
      const where = b.decks ? `\nStands on: ${decksText(decks)}.` : '';
      const title = tech ? `${b.text}${where}\nClick to see ${TECH[tech]?.name || tech} in Research.` : deckLock ? `${b.text}\n${decksText(decks)}: click to go to the ${DECK_NAME[decks[0]].toLowerCase()} deck.` : b.text + where;
      return `<button type="button" class="cl-card${locked ? ' locked' : ''}${tech ? ' techlock' : ''}${deckLock ? ' decklock' : ''}${placing === b.key ? ' on' : ''}" data-key="${b.key}"${tech ? ` data-tech="${esc(tech)}"` : ''}${deckLock ? ' data-deckgo="1"' : ''} aria-disabled="${locked && !tech && !deckLock}" style="--cc:${CAT_COLOR[b.cat] || '#9aa'}" title="${esc(title)}">
        <span class="cl-cardpic">${url ? `<img src="${esc(url)}" alt="" loading="lazy">` : cardIcon(b)}</span>
        <span class="cl-cardname">${esc(o.name || b.name)}</span>
        <span class="cl-cardcost${poor && !locked ? ' poor' : ''}">${costText(cost)}</span>
        <span class="cl-cardmeta">${b.size}×${b.size}${b.power ? ` · ${b.power > 0 ? '+' : ''}${b.power} MW` : ''}${b.jobs ? ` · ${b.jobs} jobs` : ''}${b.housing ? ` · ${b.housing} homes` : ''}${b.quad ? ` · lot, grows to ${quadTop(b)}` : ''}${b.wonder ? ` · ${b.levels.length} stages` : ''}</span>
        ${locked ? `<span class="cl-cardwhy">${tech ? '⚗' : deckLock ? (decks[0] === 'upper' ? '▲' : decks[0] === 'lower' ? '▼' : '◆') : '🔒'} ${esc(why)}${tech || deckLock ? ' <i>›</i>' : ''}</span>` : `<span class="cl-cardtext">${esc(b.text)}</span>`}
      </button>`;
    }).join('') || '<p class="cl-dim">Nothing to build here yet.</p>';
  }

  // ---------------------------------------------------------------- inspector
  insp.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]'); if (!a || a.disabled) return;
    const s = S(), id = +a.dataset.id, v = a.dataset.v;
    switch (a.dataset.a) {
      case 'survey': case 'pressurise': result(R.chamberAction(s, id, a.dataset.a)); break;
      case 'district': result(R.setDistrict(s, id, v || null)); inspSig = ''; break;   // version 10
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
      case 'deck': api.goDeck?.(a.dataset.v, +a.dataset.x, +a.dataset.y); return;
      case 'journal': { const [tab, ...ref] = (v || '').split(':'); openJournal(tab, ref.length ? ref.join(':') : null); return; }
      case 'vopen': openVault(v); break;
      case 'clear': clearDanger(id); break;
    }
    inspSig = ''; refreshInspector();
  });
  $('[data-close=insp]').addEventListener('click', () => closeInspector());

  // Tile read-outs on deck d (version 4): what tileInfo says when it is about that deck, else the
  // deck's own map (so a rules.js that predates the decks cannot show the main deck by mistake).
  const chamberOf = (s, x, y, info, d = D()) => {
    if (info?.chamber && typeof info.chamber === 'object' && onDeck(info.chamber, d)) return info.chamber;
    const m = mapOf(s, d), id = typeof info?.chamber === 'number' ? info.chamber : m.ch[y * m.w + x];
    if (id == null || id === 255) return null;
    const c = s.chambers.find((k) => k.id === id) || null;
    return c && onDeck(c, d) ? c : null;
  };
  const covering = (b, x, y) => { const n = BUILDING[b.key]?.size || 1; return x >= b.x && x < b.x + n && y >= b.y && y < b.y + n; };
  const buildingAt = (s, x, y, info, d = D()) => {
    if (info?.building && typeof info.building === 'object' && onDeck(info.building, d)) return info.building;
    if (typeof info?.building === 'number') { const b = s.buildings.find((k) => k.id === info.building); if (b && onDeck(b, d)) return b; }
    return s.buildings.find((b) => onDeck(b, d) && covering(b, x, y)) || null;
  };
  const terrainOf = (s, x, y, info, d = D()) => {
    const m = mapOf(s, d), own = TERRAIN[m.t[y * m.w + x]], t = info?.terrain;
    let r = null;
    if (t && typeof t === 'object') r = TERRAIN[t.id] || t;
    else if (typeof t === 'number') r = TERRAIN[t];
    else if (typeof t === 'string') r = TERRAIN.find((k) => k.key === t);
    return r && (!own || r.id === own.id) ? r : own;
  };
  const artifactOf = (s, x, y, info, d = D()) => {
    const a = info?.artifact;
    if (d === 'main' && a && typeof a === 'object') return a.id ? ARTIFACT[a.id] || a : a.name ? a : null;
    const m = mapOf(s, d), id = d === 'main' && typeof a === 'number' ? a : m.r?.[y * m.w + x];
    return id ? ARTIFACT[id] : null;
  };
  // breaches sealed: a finished Bulkhead Seal stands on it, or the wall is no longer a breach
  const sealedCount = (s, c) => {
    if (typeof R.openBreaches === 'function') { try { return c.breaches.length - R.openBreaches(s, c).length; } catch { } }
    const m = mapOf(s, deckOf(c));
    return (c.breaches || []).filter((i) => m.t[i] !== T.BREACH || s.buildings.some((b) => b.key === 'seal' && !b.build && onDeck(b, deckOf(c)) && b.y * m.w + b.x === i)).length;
  };

  // A lift shaft (version 4): the chambers it passes through on each deck, the Lifts on it, and
  // what a working one opens. (x, y): a tile of the shaft; lift: the Lift building, if any.
  function shaftHtml(s, x, y, lift) {
    const d = D();
    let shaft = null; try { shaft = (R.shaftsOf?.(s) || []).find((q) => x >= q.x && y >= q.y && x < q.x + 2 && y < q.y + 2) || null; } catch { }
    const sx = lift ? lift.x : shaft ? shaft.x : x, sy = lift ? lift.y : shaft ? shaft.y : y;
    const n = lift || shaft ? BUILDING.lift.size || 2 : 1;
    const lifts = s.buildings.filter((b) => b.key === 'lift' && [...Array(n * n).keys()].some((k) => covering(b, sx + (k % n), sy + ((k / n) | 0))));
    const decks = DECKS.filter((k) => hasDeck(s, k));
    const rows = decks.map((k) => {
      const m = mapOf(s, k), i = sy * m.w + sx, cid = m.ch[i], c = cid != null && cid !== 255 ? s.chambers.find((q) => q.id === cid) : null;
      const l = lifts.find((b) => onDeck(b, k));
      return { k, c, l, shaft: m.t[i] === T.SHAFT || !!l };
    });
    const works = (l) => l && l.build === 0;   // rules.liftReach: a finished Lift (it stands only in an open chamber)
    const working = lifts.filter(works), building = lifts.filter((l) => l.build > 0);
    const linked = rows.filter((r) => r.shaft && r.k !== d);
    const st = (c) => c ? STATUS[c.status]?.[0] || c.status : 'no chamber';
    const list = rows.filter((r) => r.shaft).map((r) => {
      const here = r.k === d, c = r.c;
      const survey = c && c.status === 'sealed' && working.length ? dry(s, (q) => R.chamberAction(q, c.id, 'survey')) : null;
      return `<li class="${here ? 'here' : ''}" data-deckrow="${r.k}"><span class="cl-lnum" data-deck="${r.k}">${esc(DECK_NAME[r.k])}</span>
        <span class="cl-lch"><b>${esc(c ? c.name || 'Chamber ' + c.id : '–')}</b> <span class="cl-badge st-${esc(c?.status || 'sealed')}">${esc(st(c))}</span>${r.l ? ` <small>${r.l.build > 0 ? `Lift ${r.l.build} d` : 'Lift'}</small>` : ''}</span>
        ${here ? '<small class="cl-dim">here</small>' : `<span class="cl-lacts">${survey ? `<button type="button" class="cl-btn xs" data-a="survey" data-id="${c.id}" ${survey.ok ? '' : 'disabled'} title="${esc(survey.ok ? 'Survey it through the Lift' : survey.msg)}">Survey</button>` : ''}<button type="button" class="cl-btn xs" data-a="deck" data-v="${r.k}" data-x="${sx}" data-y="${sy}" title="Go to the ${esc(DECK_NAME[r.k].toLowerCase())} deck here">Go ${DECKS.indexOf(r.k) < DECKS.indexOf(d) ? '▲' : '▼'}</button></span>`}</li>`;
    }).join('');
    const sealedBeyond = linked.filter((r) => r.c && r.c.status === 'sealed');
    const note = working.length
      ? `The Lift works: it links the ${linked.map((r) => DECK_NAME[r.k].toLowerCase()).join(' and ')} deck${linked.length === 1 ? '' : 's'}. ${sealedBeyond.length ? `${sealedBeyond.map((r) => esc(r.c.name)).join(' and ')} can be surveyed through it.` : 'Roads, colonists and rovers ride it.'}`
      : building.length ? `A Lift is being repaired here (${num(Math.max(...building.map((l) => l.build)))} days). Then the chambers above and below can be surveyed through it.`
      : 'A lift shaft through all three decks. Build a <b>Lift</b> on it (in an open chamber) and the chambers it passes through on the other decks can be surveyed.';
    return `<section class="cl-isec cl-shaft"><h4>Lift shaft ${working.length ? '<span class="cl-badge st-open">Working</span>' : building.length ? '<span class="cl-badge st-surveying">Repairing</span>' : '<span class="cl-badge st-sealed">No lift</span>'}</h4>
      <p class="cl-dim">${note}</p><ul class="cl-lifts">${list}</ul></section>`;
  }

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
    const d = D();
    let info = null; try { info = R.tileInfo(s, x, y, d); } catch { }
    const ter = terrainOf(s, x, y, info), art = artifactOf(s, x, y, info), ch = chamberOf(s, x, y, info), b = buildingAt(s, x, y, info);
    const parts = [];
    const hidden = ch && (ch.status === 'sealed' || ch.status === 'surveying');
    parts.push(`<header class="cl-ihead"><small>Tile ${x}, ${y} · <span class="cl-ideck" data-deck="${d}">${DECK_NAME[d]} deck</span>${info?.reach ? ' · in reach' : ''}</small>
      <h3>${esc(ter?.name || 'Unknown')}</h3><p>${esc(ter?.text || '')}</p>
      ${art && !hidden ? `<p class="cl-art">◆ <b>${esc(art.name)}</b> ${esc(art.text || '')}</p>` : ''}</header>`);
    // version 4, stage 2: what the chamber holds (its sites and its danger), first: it is what a click here is about
    if (ch) parts.push(secretsHtml(s, ch, x, y));
    if (ch) {
      const st = STATUS[ch.status] || [ch.status, ''];
      const total = (ch.breaches || []).length, sealed = sealedCount(s, ch);
      const surveyR = ch.status === 'sealed' ? dry(s, (c) => R.chamberAction(c, ch.id, 'survey')) : { ok: false, msg: ch.status === 'surveying' ? 'Survey under way.' : 'Already surveyed.' };
      const pressR = ch.status === 'surveyed' ? dry(s, (c) => R.chamberAction(c, ch.id, 'pressurise'))
        : { ok: false, msg: ch.status === 'open' ? 'Already open.' : ch.status === 'pressurising' ? 'Pressurising now.' : 'Survey it first.' };
      const air = R.pressuriseAir ? R.pressuriseAir(s, ch) : Math.ceil((ch.tiles || 0) / 4);
      let fee = 100, sdays = 2; try { const sc = R.surveyCost?.(s); if (sc) { fee = sc.credits ?? fee; sdays = sc.days ?? sdays; } else fee = R.costOf?.(s, { credits: 100 })?.credits ?? 100; } catch { }
      parts.push(`<section class="cl-isec"><h4>Chamber <span class="cl-badge st-${esc(ch.status)}">${esc(st[0])}</span></h4>
        <div class="cl-iname">${esc(ch.name || 'Chamber ' + ch.id)} <small>${esc(ch.kind || '')} · ${num(ch.tiles)} tiles · ${DECK_NAME[deckOf(ch)]} deck</small></div>
        <p class="cl-dim">${esc(st[1])}${ch.work ? ` ${ch.work} day${ch.work === 1 ? '' : 's'} left.` : ''}</p>
        <div class="cl-kv"><span>Breaches</span><b class="${total && sealed < total ? 'bad' : 'good'}">${hidden ? '?' : `${sealed} / ${total} sealed`}</b></div>
        ${ch.status !== 'open' ? `<div class="cl-acts">
          <button type="button" class="cl-btn sm" data-a="survey" data-id="${ch.id}" ${surveyR.ok ? '' : 'disabled'} title="${esc(surveyR.ok ? `Survey: ${fee} credits, ${sdays} day${sdays === 1 ? '' : 's'}` : surveyR.msg)}">Survey <small>${fee} cr · ${sdays} d</small></button>
          <button type="button" class="cl-btn sm" data-a="pressurise" data-id="${ch.id}" ${pressR.ok ? '' : 'disabled'} title="${esc(pressR.ok ? `Pressurise: ${air} air, 5 days` : pressR.msg)}">Pressurise <small>${air} air · 5 d</small></button>
        </div>${!surveyR.ok && ch.status === 'sealed' ? `<p class="cl-why">${esc(surveyR.msg)}</p>` : ''}${!pressR.ok && ch.status === 'surveyed' ? `<p class="cl-why">${esc(pressR.msg)}</p>` : ''}` : ''}
      </section>`);
    }
    if (ch?.status === 'open' && R.THEMES) parts.push(districtHtml(s, ch));   // version 10
    if (ch?.status === 'open') parts.push(landValueHtml(s, x, y, d));   // version 8
    if (b) parts.push(buildingHtml(s, b));
    if (b?.key === 'lift' || (!b && ter?.id === T.SHAFT)) parts.push(shaftHtml(s, x, y, b?.key === 'lift' ? b : null));
    return parts.join('');
  }

  // Version 10 (docs/COLONY-V10.md): the chamber's district: its theme, how much of it is built to fit, the tier and the
  // next, and the four themes to choose from (a change waits DISTRICT.cooldown days after the last).
  function districtHtml(s, ch) {
    let st = null; try { st = R.districtStatus(s, ch); } catch { return ''; }
    const pct = (v) => `${Math.round(v * 100)}%`, wait = st.wait || 0;
    const btns = R.THEME_KEYS.map((k) => { const T = R.THEMES[k], on = st.theme === k;
      return `<button type="button" data-a="district" data-id="${ch.id}" data-v="${k}" aria-pressed="${on}" ${on || (st.theme && wait > 0) ? 'disabled' : ''} title="${esc(`${T.name}: ${T.text} Each tier: ${T.bonusText(1)}.`)}" style="--dc:${T.color}"><b style="color:${T.color}">${T.icon}</b> ${esc({ garden: 'Garden', industry: 'Industrial', university: 'University', entertainment: 'Entertainment' }[k])}</button>`; }).join('');
    const head = st.theme ? `<span class="cl-badge" style="background:${st.color}22;color:${st.color};border-color:${st.color}66">${st.icon} ${esc(st.name)} · tier ${st.tier}</span>` : '<span class="cl-badge st-surveying">None</span>';
    const marks = (R.DISTRICT?.tiers || []).map((k) => `<i style="position:absolute;left:${k * 100}%;top:-2px;bottom:-2px;width:1px;background:rgba(255,255,255,.55)"></i>`).join('');
    const body = st.theme ? `<div class="cl-fillrow"><span>Built to fit</span><span class="cl-fill" style="position:relative"><span style="width:${pct(st.fill)};background:${st.color}"></span>${marks}</span><b>${pct(st.fill)}</b></div>
        <p class="cl-dim">${num(st.fit)} of ${num(st.land)} tiles of land (roads left out). ${esc(R.THEMES[st.theme].text)}</p>
        ${st.tier ? `<p class="cl-good">Tier ${st.tier}: ${esc(st.bonus)}.</p>` : ''}
        ${st.next != null ? `<p class="cl-dim">At ${pct(st.next)}: ${esc(st.nextBonus)}.</p>` : '<p class="cl-dim">The top tier: the chamber is a district through and through.</p>'}
        ${wait > 0 ? `<p class="cl-dim">The theme can change in ${wait} day${wait === 1 ? '' : 's'}.</p>` : ''}`
      : '<p class="cl-dim">Declare this chamber a district: its bonus grows as you fill its land with buildings that fit (25%, 50%, 75%).</p>';
    return `<section class="cl-isec cl-dist"><h4>District ${head}</h4>${body}
      <div class="cl-modes" role="group" aria-label="District">${btns}${st.theme ? `<button type="button" class="cl-dclear" data-a="district" data-id="${ch.id}" data-v="" ${wait > 0 ? 'disabled' : ''} title="No district">× No district</button>` : ''}</div></section>`;
  }

  // Version 8 (docs/COLONY-V8.md): a tile's land value and its main reasons (rules.landValueParts).
  function landValueHtml(s, x, y, d) {
    let lv = null; try { lv = R.landValueParts?.(s, d, x, y); } catch { }
    if (!lv?.open) return '';
    const v = Math.round(lv.value), word = v >= 65 ? 'High' : v >= 45 ? 'Good' : v >= 25 ? 'Modest' : 'Low';
    const sgn = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n))}`;
    const rows = lv.parts.filter((p) => Math.round(p.value)).slice(0, 4).map((p) => `<div class="cl-kv"><span>${esc(p.label)}</span><b class="${p.value > 0 ? 'good' : 'bad'}">${sgn(p.value)}</b></div>`).join('');
    return `<section class="cl-isec cl-lv"><h4>Land value <span class="cl-badge ${v >= 45 ? 'st-open' : v >= 25 ? 'st-surveying' : 'st-sealed'}">${word} · ${v}</span></h4>${rows || '<p class="cl-dim">Nothing nearby raises or lowers it.</p>'}</section>`;
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
    if (sp.radius) rows.push(kv(d.service || sp.service ? 'Range' : 'Radius', `${sp.radius} tiles${sp.park ? ` · park ${sp.park}` : ''}`));
    if (d.service || sp.service) {
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
    // version 9 (docs/COLONY-V9.md): a wonder's stages; a Hotel's beds
    if (d.wonder) {
      const n = d.levels.length, works = R.wonderWorks ? R.wonderWorks(b) : false;
      rows.push(kv('Stage', `${b.level} of ${n}: ${esc(d.levels[b.level - 1]?.name || '')}${b.build > 0 ? ' (being built)' : b.level < n ? ' (done)' : ''}`, b.level >= n && b.build === 0 ? 'good' : ''));
      extra += `<div class="cl-fillrow"><span>Built</span><span class="cl-fill"><span style="width:${Math.round(((b.level - (b.build > 0 ? 1 : 0)) / n) * 100)}%"></span></span><b>${b.level - (b.build > 0 ? 1 : 0)}/${n}</b></div>
        <p class="cl-dim">${works ? 'Working: ' : b.level < n || b.build > 0 ? 'When finished: ' : 'Not working (switched off or damaged): '}${esc(d.wonder.effect)}</p>`;
    }
    if (sp.beds) rows.push(kv('Beds', `${num(sp.beds)} visitors`));
    if (sp.leisure) rows.push(kv('Leisure', `${sp.leisure} for hotels within 16 tiles and visitors' spending`));
    if (b.key === 'quarters') rows.push(kv('Commanders', `${commanders(s).length} / ${cmdCap(s)}`));
    if (b.key === 'clinic' && next) extra = `<p class="cl-dim">Next: <b>${esc(next.name || 'level ' + (b.level + 1))}</b>, range ${next.radius ?? sp.radius} tiles. Habitats in range can grow into Apartments.</p>`;
    const modes = d.modes ? `<div class="cl-modes" role="group" aria-label="Mode">${d.modes.map((mo, i) => {
      const on = (b.mode ?? d.modes[0].key) === mo.key || (!b.mode && i === 0);
      return `<button type="button" data-a="mode" data-id="${b.id}" data-v="${esc(mo.key)}" aria-pressed="${on}" title="${esc(mo.text || mo.name)}">${esc(mo.name)}</button>`;
    }).join('')}</div>${d.modes.find((mo) => mo.key === (b.mode ?? d.modes[0].key))?.text ? `<p class="cl-dim">${esc(d.modes.find((mo) => mo.key === (b.mode ?? d.modes[0].key)).text)}</p>` : ''}` : '';
    let needs = '';
    const grows = R.GROW_KEYS ? R.GROW_KEYS.has(b.key) : b.key === 'habitat' || b.key === 'towerblock';   // version 6: Tower Blocks; version 7: the quads
    // version 7 (docs/COLONY-V7.md): a quad's own read-outs: shoppers served, workshop noise, its zone's demand
    if (d.quad) {
      if (sp.shoppers) rows.push(kv('Serves', `${num(sp.shoppers)} shoppers`));
      if (sp.nuisance) rows.push(kv('Noise', `${sp.nuisance} tiles: Living Quads that close stay Cottages`, 'bad'));
      try { const z = R.demandOf(s)[d.quad]; rows.push(kv(`${{ R: 'Residential', C: 'Commercial', I: 'Industrial' }[d.quad]} demand`, `${z.units > 0 ? '+' : ''}${num(z.units)}`, z.units > 0 ? 'good' : 'bad')); } catch { }
    }
    if (grows && b.build === 0 && b.grow) rows.push(kv(b.grow > 0 ? 'Growing' : 'Declining', b.grow > 0 ? `${b.grow} day${b.grow === 1 ? '' : 's'} so far` : `${-b.grow} of 10 days: a need is failing`, b.grow > 0 ? 'good' : 'bad'));
    if (b.key === 'reserve' && R.reserveCap) { const rv = s.reserve || {}, cap = R.reserveCap(s); rows.push(kv('Held back', ['food', 'water', 'air'].map((g) => `${num(Math.floor(rv[g] || 0))} ${g}`).join(' · ') + ` <small>of ${num(cap)} each</small>`)); }
    if (grows && b.key !== 'habitat' && next && R.habitatLevelReachable && !R.habitatLevelReachable(next)) {
      needs = '';
    } else if (b.key === 'habitat' && next && R.habitatLevelReachable && !R.habitatLevelReachable(next)) {
      needs = `<div class="cl-needs"><h5>${esc(d.levels?.[b.level - 1]?.name || 'This')} is the largest home for now</h5></div>`;
    } else if (grows) {
      const list = habitatNeeds(s, b);
      if (list && list.length) needs = `<div class="cl-needs"><h5>${next ? `${d.quad ? 'To grow into' : 'Next level:'} ${esc(next.name || 'level ' + (b.level + 1))}` : 'Top level'}</h5><ul>${list.map((n) => `<li class="${n.ok ? 'ok' : 'no'}">${n.ok ? '✓' : '✗'} ${esc(n.label)}</li>`).join('')}</ul></div>`;
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
      acts.push(`<button type="button" class="cl-btn sm" data-a="upgrade" data-id="${b.id}" ${r.ok ? '' : 'disabled'} title="${esc(r.ok ? (d.wonder ? `Order the next stage: ${next.name} (${next.days ?? Math.ceil(d.days / 2)} days)` : `Upgrade${next.name ? ' to ' + next.name : ''}`) : r.msg)}">${d.wonder ? `Next stage: ${esc(next.name)}` : 'Upgrade'} <small>${costText((() => { try { return R.costOf?.(s, next.cost, b.key) || next.cost; } catch { return next.cost; } })())}</small></button>`);
    }
    if (!d.fixed) {
      acts.push(`<button type="button" class="cl-btn sm" data-a="move" data-id="${b.id}" title="Move it (20% of its cost)">Move</button>`);
      if (b.key !== 'seal') acts.push(`<button type="button" class="cl-btn sm" data-a="toggle" data-id="${b.id}">${b.off ? 'Switch on' : 'Switch off'}</button>`);
      acts.push(`<button type="button" class="cl-btn sm warn" data-a="demolish" data-id="${b.id}" title="Refunds half its cost">Demolish</button>`);
    }
    if (b.key === 'dock' || b.key === 'massdriver') acts.unshift(`<button type="button" class="cl-btn sm primary" data-a="market">Market</button>`);
    return `<section class="cl-isec"><h4>Building ${status}</h4>
      <div class="cl-ibuild"><span class="cl-ipic">${api.art?.(`card/${b.key}`) ? `<img src="${esc(api.art(`card/${b.key}`))}" alt="">` : cardIcon(d)}</span>
      <div><div class="cl-iname">${esc(d.name)}</div><p class="cl-dim">${esc(d.text || '')}</p></div></div>
      ${rows.join('')}${extra}${modes}${needs}
      ${!next && d.levels && !grows && !d.wonder ? '<p class="cl-dim">Fully upgraded.</p>' : ''}${!next && d.quad ? '<p class="cl-dim">Top level: it has grown as far as a quad can.</p>' : ''}
      <div class="cl-acts">${acts.join('')}</div></section>`;
  }

  function inspect(x, y) {
    inspAt = { x, y, deck: D() }; inspSig = ''; insp.hidden = false;
    refreshInspector();
  }
  function closeInspector() { inspAt = null; insp.hidden = true; }
  function refreshInspector() {
    if (!inspAt) return;
    const s = S();
    if (inspAt.deck !== D()) { closeInspector(); return; }   // the deck changed under it
    const i = inspAt.y * s.map.w + inspAt.x;
    const b = buildingAt(s, inspAt.x, inspAt.y, null), ch = chamberOf(s, inspAt.x, inspAt.y, null);
    const lifts = s.buildings.filter((k) => k.key === 'lift').map((k) => [k.id, k.build, k.off, deckOf(k)]);
    const sig = JSON.stringify([inspAt.deck, mapOf(s).t[i], lifts, b?.key === 'lift' || mapOf(s).t[i] === T.SHAFT ? s.chambers.filter((c) => c.deck).map((c) => c.status) : 0, b, ch && [ch.status, ch.work, sealedCount(s, ch), ch.district, ch.status === 'open' ? s.buildings.length : 0], Math.floor(s.stock.credits / 50), Math.floor(s.stock.parts / 5), Math.floor(s.stock.air / 10), summary?.jobs, summary?.workers, s.day % 5 === 0 ? s.day : 0, BUILDING[b?.key]?.cat === 'defence' || b?.key === 'lodge' || b?.key === 'quarters' ? [s.production, (s.guardians || []).length, (s.wanderers || []).length, s.commanders?.length] : 0, b?.key === 'lab' ? [s.research?.focus, Math.floor(s.research?.progress?.[s.research?.focus] || 0), s.stats?.last?.research] : 0, ch && secOf(s) ? [JSON.stringify(dangerAt(s, ch.id)), sitesOf(s).filter((k) => k.chamber === ch.id).map((k) => `${k.found ? 1 : 0}${k.done ? 1 : 0}`).join(''), (s.secrets.read || []).length, (s.guardians || []).length, spareMW()] : 0]);
    if (sig === inspSig) return;
    inspSig = sig;
    inspBody.innerHTML = inspectorHtml(s, inspAt.x, inspAt.y);
  }

  // ---------------------------------------------------------------- overlays
  $('.cl-ovl').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ovl]'); if (!b) return;
    for (const o of $$('[data-ovl]')) o.setAttribute('aria-pressed', String(o === b));
    api.setOverlay(b.dataset.ovl || null);
    const key = $('[data-ovlkey]'); if (key) key.hidden = b.dataset.ovl !== 'value';   // version 8: the land value legend
  });

  // ---------------------------------------------------------------- pop-up panels
  function openPop(name) {
    for (const [k, p] of Object.entries(pops)) p.hidden = k !== name;
    closeResearch(); closeDefence(); closeJournal(); closeChart();
    if (name === 'happy') { happySig = ''; renderHappy(); }
    if (name === 'market') { marketSig = ''; renderMarket(); }
    if (name === 'settings') renderSettings();
  }
  function togglePop(name) { if (pops[name].hidden) openPop(name); else pops[name].hidden = true; }
  function closePops() { let any = closeResearch(); any = closeDefence() || any; any = closeJournal() || any; any = closeChart() || any; for (const p of Object.values(pops)) { any ||= !p.hidden; p.hidden = true; } return any; }
  for (const p of Object.values(pops)) p.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) p.hidden = true; });

  function renderHappy() {
    if (pops.happy.hidden) return;
    const s = S();
    const partsList = summary?.happyParts || s.happyParts || [];
    const sig = JSON.stringify(partsList) + (summary?.happy ?? s.happy) + (s.gardens?.score ?? '') + JSON.stringify(s.gardens?.wildlife || {});
    if (sig === happySig) return;
    happySig = sig;
    const total = Math.round(summary?.happy ?? s.happy);
    pops.happy.innerHTML = `<button type="button" class="cl-x" data-close title="Close">×</button>
      <h3>Happiness <b class="cl-big">${total}</b></h3>
      <table class="cl-table"><tbody>${partsList.map((p) => `<tr><td>${esc(p.label)}</td><td class="n ${p.value > 0 ? 'good' : p.value < 0 ? 'bad' : ''}">${p.value > 0 ? '+' : ''}${num(p.value)}</td></tr>`).join('') || '<tr><td colspan="2" class="cl-dim">No breakdown yet: it appears after the first day.</td></tr>'}</tbody>
      <tfoot><tr><td>Total <small>(0–100)</small></td><td class="n">${total}</td></tr></tfoot></table>
      <p class="cl-dim">≥ 55 and free housing with a food surplus: a transport every 10 days. Below 25: colonists leave.</p>
      ${gardensHtml(s)}`;
  }
  // version 10 (docs/COLONY-V10.md): Eden's gardens: the greenery, the wildlife that has come back, the Garden of Eden
  function gardensHtml(s) {
    if (typeof R.gardenStatus !== 'function') return '';
    let g; try { g = R.gardenStatus(s); } catch { return ''; }
    const next = g.wildlife.find((w) => w.day == null);
    return `<h4 class="cl-gardens">❀ Eden's gardens <small>greenery ${num(g.score)}</small></h4>
      <div class="cl-fillrow"><span>Greenery</span><span class="cl-fill"><span style="width:${Math.round(Math.min(1, g.score / g.target) * 100)}%;background:#7fd36a"></span></span><b>${num(g.score)} / ${num(g.target)}</b></div>
      <ul class="cl-needs" style="list-style:none;padding:0;margin:4px 0">${g.wildlife.map((w) => `<li class="${w.day != null ? 'ok' : 'no'}">${w.day != null ? '✓' : '○'} <b>${esc(w.name)}</b> <small>(${w.at}${w.day != null ? `, day ${w.day}` : ''})</small> ${esc(w.bonus)}</li>`).join('')}</ul>
      <p class="cl-dim">${g.eden ? `The Garden of Eden on day ${g.eden.day}.` : `${next ? `Next: ${esc(next.name.toLowerCase())} at ${next.at}. ` : ''}The Garden of Eden: greenery ${num(g.target)} and happiness ${g.happy}.`} ${g.parts.map((p) => `${esc(p.label)} ${num(p.value)}`).join(' · ')}</p>`;
  }

  pops.market.addEventListener('click', (e) => {
    if (e.target.closest('[data-mdef]')) { openDefence(e.target.closest('[data-mdef]').dataset.mdef); return; }
    if (e.target.closest('[data-mchart]')) { pops.market.hidden = true; openChart(); return; }
    const b = e.target.closest('[data-sell],[data-guard],[data-buy],[data-convoy]'); if (!b || b.disabled) return;
    const s = S();
    if (b.dataset.convoy) result(R.sendConvoy(s, b.dataset.convoy, !!b.dataset.heavy));
    else if (b.dataset.buy) result(R.buy(s, b.dataset.buy, +b.dataset.q));
    else if (b.dataset.sell) {
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
    const imports = R.IMPORTS || [], buyP = imports.map((g) => { try { return R.buyPrice(s, g); } catch { return null; } });
    const cv = R.convoyStatus ? R.convoyStatus(s) : null, vs = R.victoryStatus ? R.victoryStatus(s) : null;
    const sig = JSON.stringify([cv, vs && R.victoryText(vs), s.luxuries?.share, s.luxuries?.wellOff, s.tourism?.visitors, s.tourism?.score, goods, prices, buyP, Math.floor(s.stock.credits), goods.map((g) => Math.floor(s.stock[g] || 0)), (s.guardians || []).map((g) => [g.id, g.level, g.hp]), yard]);
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
      ${imports.length ? `<h4>Buy <small>imports at twice the price · ${num(Math.floor(s.stock.credits))} cr</small></h4>
      <table class="cl-table cl-mkt"><tbody>${imports.map((g, i) => `<tr><td>${GOOD_NAME[g]}</td><td class="n">${buyP[i] == null ? '–' : (+buyP[i]).toFixed(2)} <small>cr</small></td>
        <td class="cl-sellbtns">${[10, 100].map((q) => `<button type="button" class="cl-btn xs" data-buy="${g}" data-q="${q}" ${hasDock && buyP[i] != null && s.stock.credits >= buyP[i] ? '' : 'disabled'} title="≈ ${buyP[i] != null ? num(Math.ceil(buyP[i] * q)) : '?'} cr">+${q}</button>`).join('')}</td></tr>`).join('')}</tbody></table>
      <p class="cl-dim">Every 10 units bought raises that price 2%; it settles back over a few days.</p>` : ''}
      ${tourismHtml(s)}
      ${luxuryHtml(s)}
      ${cv ? convoyHtml(s, cv, vs) : ''}
      ${guards.length ? `<h4>Guardians <small>${guards.length} machine${guards.length === 1 ? '' : 's'}${yard ? ' · Scrapyard: +20%' : ''}</small></h4>
      ${yard ? '' : '<p class="cl-dim">A Scrapyard sells machines for a fifth more.</p>'}
      <div class="cl-guards">${guards.map((g) => { const sp = salePrice(s, g), base = yard ? Math.round(sp.credits / 1.2) : null; return `<div class="cl-guard"><b>${esc(mInfo(g.type).name)}</b><small>L${g.level ?? 0}${g.hp != null && g.hp < maxHp(g) ? ` · ${num(g.hp)}/${num(maxHp(g))} HP` : ''}</small>
        <span>${num(sp.credits)} cr · ${num(sp.parts)} parts${yard ? ` <em class="cl-bonus" title="Scrapyard bonus: ${num(base)} cr without it">+20% Scrapyard</em>` : ''}</span><button type="button" class="cl-btn xs" data-guard="${g.id}" ${sp.ok || !R.sellGuardian ? '' : 'disabled'} title="${esc(sp.ok ? '' : sp.msg)}">Sell</button></div>`; }).join('')}</div>
      <p class="cl-dim"><button type="button" class="cl-linkbtn" data-mdef="guardians">Defence panel ›</button> repairs, crews and commanders.</p>` : ''}`;
  }

  // Version 4, stage 4: relief convoys to Earth (one a day, to a relief station an expedition reached),
  // with the three parts of the win, Eden Restored, beside them.
  function convoyHtml(s, cv, vs) {
    const part = (label, x) => `<li class="${x.met ? 'met' : ''}"><b>${x.met ? '✓' : '○'}</b> ${label} <small>${num(x.have)} / ${num(x.need)}</small></li>`;
    const loads = cv.loads ?? cv.sent, heavy = cv.driver && cv.heavyCost;
    return `<h4>Relief convoys to Earth <small>${num(loads)} / ${num(cv.quota)} loads · a convoy costs ${num(cv.cost.credits)} cr and ${num(cv.cost.parts)} parts${heavy ? `, a heavy launch ${num(cv.heavyCost.credits)} cr and ${num(cv.heavyCost.parts)} parts` : ''}</small></h4>
      ${cv.station ? `<p class="cl-dim">Convoys go to <b>${esc(cv.station)}</b>. One leaves a day; Earth pays for each.${cv.driver ? ` The Mass Driver launches three loads at once${cv.auto ? ' and is on <b>Automatic</b>: it launches by itself' : ' (set it to Automatic in its panel to launch by itself)'}.` : ' A Mass Driver (research) launches three loads at once.'}</p>`
        : '<p class="cl-why">No Earth relief station reached yet. <button type="button" class="cl-linkbtn" data-mchart>Star chart ›</button> send a squadron to one on the Earth side.</p>'}
      <table class="cl-table cl-mkt"><tbody>${cv.goods.map((g) => `<tr><td>${GOOD_NAME[g.good] || g.good}</td><td class="n">${num(g.have)} <small>/ ${g.load}</small></td><td class="n">+${num(g.pay)} <small>cr</small></td>
        <td class="cl-sellbtns"><button type="button" class="cl-btn xs" data-convoy="${g.good}" ${g.why ? `disabled title="${esc(g.why)}"` : `title="Send ${g.load} ${g.good} to Earth"`}>Send ${num(g.load)}</button>${heavy ? ` <button type="button" class="cl-btn xs" data-convoy="${g.good}" data-heavy="1" ${g.whyHeavy ? `disabled title="${esc(g.whyHeavy)}"` : `title="Launch ${g.heavyLoad} ${g.good} from the Mass Driver"`}>Launch ${num(g.heavyLoad)}</button>` : ''}</td></tr>`).join('')}</tbody></table>
      ${vs ? `<div class="cl-restore${s.victory ? ' won' : ''}"><b>${s.victory ? `Eden Restored on day ${s.victory.day}` : 'Eden Restored needs'}</b><ul>${part('every chamber open', vs.chambers)}${part('colonists', vs.pop)}${vs.happy ? part(`happiness above ${vs.happy.above} (now ${vs.happy.now}), days held`, vs.happy) : ''}${part('relief convoy loads', vs.convoys)}</ul></div>` : ''}`;
  }

  function renderSettings() {
    const st = api.settings;
    pops.settings.innerHTML = `<button type="button" class="cl-x" data-close title="Close">×</button>
      <h3>Settings</h3>
      <label class="cl-check"><input type="checkbox" data-set="pauseOnEvents" ${st.pauseOnEvents ? 'checked' : ''}><span></span><em>Pause on events<small>Decisions stop the clock until answered.</small></em></label>
      <label class="cl-check"><input type="checkbox" data-set="snap" ${st.snap ? 'checked' : ''}><span></span><em>Snap rotation to 90°<small>Quarter turns instead of a free orbit.</small></em></label>
      <label class="cl-check"><input type="checkbox" data-set="minimap" ${st.minimap !== false ? 'checked' : ''}><span></span><em>Minimap<small>All of Eden in the corner: click or drag on it to jump there.</small></em></label>
      <label class="cl-check"><input type="checkbox" data-set="navButtons" ${st.navButtons !== false ? 'checked' : ''}><span></span><em>Navigation buttons<small>Zoom, rotate, tilt and home buttons over the map, for trackpads.</small></em></label>
      <label class="cl-check"><input type="checkbox" data-set="dayNight" ${st.dayNight !== false ? 'checked' : ''}><span></span><em>Day and night<small>A slow light cycle: lamps and windows glow at night, Earth turns below. Off: the same light all day.</small></em></label>
      <label class="cl-field"><em>Scrolling<small>Two-finger scroll on a trackpad, or a mouse wheel. Pinch (or Ctrl + scroll) always zooms.</small></em>
        <select data-setsel="wheel">${[['auto', 'Auto: pan on a trackpad, zoom with a mouse wheel'], ['pan', 'Pan the map (trackpad)'], ['zoom', 'Zoom (mouse wheel)']].map(([v, l]) => `<option value="${v}" ${(st.wheel || 'auto') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${musicHtml()}
      ${raidToggleHtml(S())}
      ${incidentToggleHtml(S())}
      ${petitionToggleHtml(S())}
      ${neighbourToggleHtml(S())}
      <p class="cl-dim">The colony autosaves every 10 days in this browser. Keys: space pause · 1 / 2 / 3 speed · R build again · T research · G defence · M music · WASD / arrows pan · Q / E rotate · PgUp / PgDn deck · Esc cancel · F1 or ? how to play.</p>`;
    for (const c of pops.settings.querySelectorAll('[data-set]')) c.onchange = () => { api.setSetting(c.dataset.set, c.checked); helpersShown(); };
    for (const c of pops.settings.querySelectorAll('[data-setsel]')) c.onchange = () => api.setSetting(c.dataset.setsel, c.value);
    const mus = pops.settings.querySelector('[data-music]'), setup = pops.settings.querySelector('[data-musicsetup]');
    if (mus) mus.onchange = () => api.audio.setMuted(!mus.checked);
    for (const b of pops.settings.querySelectorAll('[data-musicsrc]')) b.onclick = () => { api.audio.setSource(b.dataset.musicsrc); renderSettings(); };
    const rd = pops.settings.querySelector('[data-raids]');
    if (rd) rd.onchange = () => { result(R.setRaids(S(), rd.checked)); renderSettings(); };
    const inc = pops.settings.querySelector('[data-incidents]');
    if (inc) inc.onchange = () => { result(R.setIncidents(S(), inc.checked)); renderSettings(); };
    const nbt = pops.settings.querySelector('[data-neighbours]');   // version 10
    if (nbt) nbt.onchange = () => { result(R.setNeighbours(S(), nbt.checked)); renderSettings(); };
    const pet = pops.settings.querySelector('[data-petitions]');
    if (pet) pet.onchange = () => { result(R.setPetitions(S(), pet.checked)); renderSettings(); };
    if (setup) setup.onclick = () => { setup.disabled = true; api.audio.setUp().then(() => { renderSettings(); toast('Earth Light music is ready.', 'good'); }).catch((e) => { setup.disabled = false; toast(e.message || 'No ROM chosen.', 'bad'); }); };
  }
  // Music (js/colony/audio.js): Lanternfall's soundtrack (default, no setup) or Earth Light's own
  // songs (from the ROM's sound pack, set up once); and raiders on or off (owner, 2026-11-05).
  function musicHtml() {
    const a = api.audio;
    if (!a) return '';
    const src = `<div class="cl-field"><em>Soundtrack<small>${a.source === 'earthlight' ? 'Earth Light\'s own songs, from your ROM\'s sound pack.' : 'Lanternfall\'s orchestra, played live.'}</small></em>
      <span class="cl-seg"><button type="button" class="cl-btn xs${a.source === 'lanternfall' ? ' on' : ''}" data-musicsrc="lanternfall">Lanternfall</button><button type="button" class="cl-btn xs${a.source === 'earthlight' ? ' on' : ''}" data-musicsrc="earthlight">Earth Light</button></span></div>`;
    return src + (a.available
      ? `<label class="cl-check"><input type="checkbox" data-music ${a.muted ? '' : 'checked'}><span></span><em>Music<small>On or off (M).</small></em></label>`
      : `<div class="cl-field"><em>Music<small>${esc(a.why || 'Earth Light music needs your ROM once.')}</small></em>
         <button type="button" class="cl-btn sm" data-musicsetup>Set up Earth Light music</button></div>`);
  }
  // version 8: incidents on or off (docs/COLONY-V8.md)
  function incidentToggleHtml(s) {
    if (!s || typeof R.setIncidents !== 'function') return '';
    const on = s.options?.incidents !== false;
    return `<label class="cl-check"><input type="checkbox" data-incidents ${on ? 'checked' : ''}><span></span><em>Incidents<small>${on ? 'Meteor showers, solar flares, burst mains and fevers, each announced days ahead with what helps (and the odd caravan or comet).' : 'Off: no incidents. Turn them on again whenever you like.'}</small></em></label>`;
  }
  function neighbourToggleHtml(s) {
    if (!s || typeof R.setNeighbours !== 'function') return '';
    const on = s.options?.neighbours !== false;
    return `<label class="cl-check"><input type="checkbox" data-neighbours ${on ? 'checked' : ''}><span></span><em>Neighbours<small>${on ? 'The Union, Galt and the Cartel send an offer, a request or a gift every month or two, and remember what Eden does.' : 'Off: no offers, and their moods hold. Turn them on again whenever you like.'}</small></em></label>`;
  }
  function petitionToggleHtml(s) {
    if (!s || typeof R.setPetitions !== 'function') return '';
    const on = s.options?.petitions !== false;
    return `<label class="cl-check"><input type="checkbox" data-petitions ${on ? 'checked' : ''}><span></span><em>Petitions<small>${on ? 'Now and then a group asks the Council for a building it can have, with a generous deadline and a reward.' : 'Off: no petitions. Turn them on again whenever you like.'}</small></em></label>`;
  }
  function raidToggleHtml(s) {
    if (!s || typeof R.setRaids !== 'function') return '';
    const on = s.options?.raids !== false;
    return `<label class="cl-check"><input type="checkbox" data-raids ${on ? 'checked' : ''}><span></span><em>Raiders<small>${on ? 'Raiders come once Eden has 500 colonists and a base has noticed it.' : 'Off: no raids. Turn them on again whenever you like.'}</small></em></label>`;
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
    closeDefence(); closeJournal(); closeChart();
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
    const r = rule('machineOf', S(), type); if (r?.name) return r;
    const t = api.types?.[type], pr = S().imported?.prices?.[type];
    if (t) return { type, name: t.name, code: String(t.code || '').trim(), cls: CAT_CLASS[t.category] || 'support', hp: t.hp, move: t.move, attack: t.attack ?? 0, defence: t.defence ?? 0, price: pr ?? Math.max(1, t.value) * t.hp, tier: 1 };
    return { type, name: `Machine ${type}`, code: '', cls: 'support', hp: 8, move: 0, attack: 0, defence: 0, price: pr ?? 24, tier: 1 };
  }
  const mainMode = (type) => { const w = (api.types?.[type]?.weapons || []).filter((x) => x && x.power).sort((a, b) => b.power - a.power)[0]; return w ? WEAPON_MODE[w.mode] || null : null; };
  const maxHp = (g) => { const r = rule('maxHp', S(), g); return Number.isFinite(r) && r > 0 ? r : mInfo(g.type).hp || g.hp || 1; };
  const hpOf = (g) => Math.max(0, g.hp ?? maxHp(g));
  const crewCap = (s) => { const r = rule('crewCap', s); return Number.isFinite(r) ? r : 4 + 6 * finishedOf(s, 'barracks').length; };
  const cmdCap = (s) => { const r = rule('commanderCap', s); return Number.isFinite(r) ? r : BASE_COMMANDERS + PER_QUARTERS * finishedOf(s, 'quarters').length; };
  const commanders = (s) => Array.isArray(s.commanders) ? s.commanders : [{ key: 'general', loyalty: 100, injured: 0, dept: null }, { key: 'sato', loyalty: 80, injured: 0, dept: null }];
  // crewed: the rules' choice (rules.crewed: commanders' machines first, then the strongest), else the first crewCap
  let crewMemo = null;
  const crewSet = (s) => { if (crewMemo?.s === s && crewMemo.day === s.day && crewMemo.n === (s.guardians || []).length && crewMemo.sig === (s.guardians || []).map((g) => `${g.commander}${g.hp}`).join()) return crewMemo.set;
    const r = rule('crewed', s); const set = r instanceof Set ? r : null; crewMemo = { s, day: s.day, n: (s.guardians || []).length, sig: (s.guardians || []).map((g) => `${g.commander}${g.hp}`).join(), set }; return set; };
  const isCrewed = (s, g, i) => { const set = crewSet(s); return set ? set.has(g.id) : g.crewed != null ? !!g.crewed : i < crewCap(s); };
  function upkeepOf(g) {
    const r = rule('guardianUpkeep', S(), g); if (Number.isFinite(r)) return r;
    if ((g.free || 0) > 0) return 0;
    const base = Math.ceil((mInfo(g.type).price || 0) / 8);
    return CMDR[g.commander]?.perk === 'quartermaster' ? base / 2 : base;
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
    const r = rule('defenceOf', s, s.raid?.coming || undefined); if (Number.isFinite(r?.total)) return r.total;
    let d = 0;
    (s.guardians || []).forEach((g, i) => { if (isCrewed(s, g, i) && hpOf(g) > 0) d += gPower(s, g); });
    return d + 40 * batteries(s).length;
  }
  function raidsPossible(s) { const r = s.raid, f = R.raidsPossible; if (r && typeof f === 'function') { try { return !!f(s) || r.count > 0 || !!r.coming; } catch { } } return !!r && (s.pop >= 80 || !!s.flags?.unlock80 || r.count > 0 || !!r.coming || !!r.warned); }
  function raidEta(s) {
    const r = s.raid; if (!r) return null;
    if (r.coming?.day != null) return Math.max(0, r.coming.day - s.day);
    if (r.warned && Number.isFinite(r.next)) return Math.max(0, r.next - s.day);
    return null;
  }
  const raidStartDay = (s) => ((api.diff?.(s)?.key ?? s.difficulty) === 'easy' ? 60 : 35);
  const cap1 = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1);
  const factionName = (f) => { const n = R.FACTIONS?.[f]?.name || FACTION_NAME[String(f || '').toLowerCase()]; return n ? cap1(n) : f ? cap1(f) : 'Unknown raiders'; };
  const factionText = (f) => R.FACTIONS?.[f]?.text || '';
  const fromText = (f) => R.FROM?.[f] || FROM_TEXT[f] || (f ? `the ${f}` : 'somewhere out in the dark');
  const tierName = (t) => R.RAID_TIER?.[t]?.name || RAID_TIER[t] || (typeof t === 'string' ? t : '');
  const unitList = (units) => { const n = {}; for (const u of units || []) { const nm = mInfo(u?.type ?? u).name; n[nm] = (n[nm] || 0) + 1; } return Object.entries(n).map(([k, v]) => v > 1 ? `${k} ×${v}` : k).join(', '); };
  const sensorDays = (s) => { const r = rule('warnLead', s); return Number.isFinite(r) ? r : 3 + 3 * Math.min(3, finishedOf(s, 'sensormast').length); };
  const plural = (n, w) => `${num(n)} ${w}${n === 1 ? '' : 's'}`;

  // What makes heat (docs/COLONY-V3.md "Heat"), worked out from the state: the sim owns the number.
  function heatParts(s) {
    const ht = rule('heatTarget', s);
    if (Array.isArray(ht?.parts)) return ht.parts.map((p) => [p.label, +p.value || 0]);
    const parts = [['Colonists', s.pop / 20]];
    let v = s.stock.credits || 0;
    for (const g of SELLABLE) { try { v += (s.stock[g] || 0) * R.price(s, g); } catch { } }
    parts.push(['Riches in store', v / 2000]);
    parts.push(['Open chambers', 2 * s.chambers.filter((c) => c.status === 'open').length]);
    const sales = Array.isArray(s.raid?.sales) ? s.raid.sales.reduce((t, v) => t + (v || 0), 0) : s.raid?.sales;
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
    const c = CMDR[key] || { key, name: key };
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
    const counts = { guardians: (s.guardians || []).length || '', production: (s.production || []).length || '', commanders: (s.wanderers || []).length ? `+${s.wanderers.length}` : '', raids: s.raid?.coming || s.raid?.warned ? '!' : '', neighbours: '' };
    for (const n of defEl.querySelectorAll('[data-dtabn]')) { const v = String(counts[n.dataset.dtabn] ?? ''); if (n.textContent !== v) n.textContent = v; }
    liveRender(defStats, (L) => defStatsHtml(s, L));
    const fn = { guardians: guardiansHtml, production: productionHtml, commanders: commandersHtml, raids: raidsHtml, neighbours: neighboursHtml }[defTab];
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
    const opts = (g) => `<option value="">No commander</option>${cm.map((c) => { const C = CMDR[c.key] || {}, other = (s.guardians || []).find((x) => x.commander === c.key && x.id !== g.id);
      return `<option value="${esc(c.key)}" ${g.commander === c.key ? 'selected' : ''} ${c.injured > 0 ? 'disabled' : ''}>${esc(C.name || c.key)}${c.injured > 0 ? ' (injured)' : other ? ` (in ${esc(mInfo(other.type).name)})` : ''}</option>`; }).join('')}`;
    const rows = gs.map((g, i) => {
      const m = mInfo(g.type), mh = maxHp(g), hp = hpOf(g), crew = isCrewed(s, g, i), up = upkeepOf(g), sale = salePrice(s, g);
      const status = g.away ? '<b class="warn" title="On an expedition (Star chart, X)">Away</b>' : hp <= 0 ? '<b class="bad">Wrecked</b>' : !crew ? '<b class="bad">No crew</b>' : hp < mh ? (yard ? '<b class="warn">Repairing</b>' : '<b class="warn">Damaged</b>') : '<b class="good">Ready</b>';
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
    const v = rule('saleValue', s, g);
    if (Number.isFinite(v?.credits)) { const dock = s.buildings.some((b) => b.key === 'dock' && b.build === 0); return { ok: dock, msg: dock ? '' : 'Machines are sold at a finished dock.', credits: v.credits, parts: v.parts }; }
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
  const buildDays = (m) => m.days ?? Math.max(2, Math.ceil((m.price || 0) / 4));
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
      <section class="cl-dsec"><h4>Machines <small>tier ${tier} of 4 · price × 10 credits and price in parts${(() => { const d = api.diff?.(s); return d && d.cost !== 1 ? `, × ${d.cost} on ${esc(d.name)}` : ''; })()}</small>
        <select class="cl-msort" data-msort title="Sort">${[['price', 'price'], ['tier', 'tier'], ['attack', 'attack'], ['name', 'name']].map(([k, n]) => `<option value="${k}" ${defPrefs.sort === k ? 'selected' : ''}>Sort: ${n}</option>`).join('')}</select></h4>
        <p class="cl-dim">New machines start at level 0 and need a crew (Command Centre 4, Barracks 6 each) to fight. Credits ${L(num(s.stock.credits))} · parts ${L(num(s.stock.parts))}.</p>${groups}</section>`;
  }

  // -- Commanders
  function inviteChance(s, w) {
    const r = rule('inviteChance', s, w.key); if (Number.isFinite(r)) return r;
    const loyalty = w.loyalty ?? CMDR[w.key]?.loyalty ?? 50;
    return Math.max(0.05, Math.min(0.95, 0.3 + GENERAL.charm / 220 - 0.03 * (commanders(s).length - 2) + (100 - loyalty) / 400));
  }
  function commandersHtml(s, L, W) {
    const cm = commanders(s), cap = cmdCap(s), gs = s.guardians || [], heads = {};
    for (const c of cm) if (c.dept) heads[c.dept] = c.key;
    const ready = Array.isArray(s.commanders);
    const card = (c) => {
      const C = CMDR[c.key] || { name: c.key, grades: {} }, g = gs.find((x) => x.commander === c.key), loy = Math.round(c.loyalty ?? C.loyalty ?? 50);
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
            <label><i>Pilots</i><select data-cassign="${esc(c.key)}" ${ready && !(c.injured > 0) ? '' : 'disabled'}><option value="">No machine</option>${gs.map((x) => { const o = x.commander && x.commander !== c.key ? CMDR[x.commander]?.name : '';
              return `<option value="${x.id}" ${x.commander === c.key ? 'selected' : ''}>${esc(mInfo(x.type).name)} L${x.level || 0}${o ? ` (${esc(o)})` : ''}</option>`; }).join('')}</select></label>
            <label><i>Heads</i><select data-cdept="${esc(c.key)}" ${ready ? '' : 'disabled'}><option value="">No department</option>${Object.entries(DEPARTMENTS).map(([k, d]) => `<option value="${k}" ${c.dept === k ? 'selected' : ''}>${esc(d.name)} (+${Math.round((C[d.stat] || 0) / 10)}%)${heads[k] && heads[k] !== c.key ? ` · ${esc(CMDR[heads[k]]?.name || heads[k])}` : ''}</option>`).join('')}</select></label>
            ${C.general || c.key === 'sato' ? '' : `<button type="button" class="cl-btn xs warn" data-cdismiss="${esc(c.key)}" title="They leave, and may come back to the Lodge later">Dismiss</button>`}
          </div>
        </div></article>`;
    };
    const lodge = s.buildings.filter((b) => b.key === 'lodge' && b.build === 0);
    const ws = s.wanderers || [];
    const wcard = (w) => {
      const C = CMDR[w.key] || { name: w.key, grades: {} }, ch = inviteChance(s, w), left = w.until != null ? Math.max(0, w.until - s.day) : null;
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
      <section class="cl-dsec"><h4>Commanders <small>${cm.length} / ${cap} · wages ${num(cm.reduce((t, c) => t + (CMDR[c.key]?.wage || 0), 0))} cr a day</small></h4>
        <div class="cl-cgrid">${cm.map(card).join('')}</div>
        ${cm.length >= cap && techDone(s, 'leadership') ? `<p class="cl-dim">Room for no more: each <b>Officers' Quarters</b> houses two more commanders.</p>` : ''}</section>
      <section class="cl-dsec"><h4>Wanderers at the Lodge <small>${ws.length ? `${ws.length} here` : ''}</small></h4>${lodgeNote}<div class="cl-cgrid">${ws.map(wcard).join('')}</div></section>
      <section class="cl-dsec"><h4>Departments <small>one head each: + stat ÷ 10 %</small></h4><div class="cl-depts">${Object.entries(DEPARTMENTS).map(([k, d]) => {
        const h = heads[k], C = CMDR[h];
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
  // -- Neighbours (version 10, docs/COLONY-V10.md): the Union remnant, the Galt remnant and the Ashfall Cartel
  function neighboursHtml(s) {
    if (typeof R.neighbourStatus !== 'function') return note('Neighbours are not in this build.', 'warn');
    const list = R.neighbourStatus(s), on = R.neighboursOn(s), NB = R.NB;
    const pos = (m) => Math.round(((m + 100) / 200) * 100);
    const cards = list.map((n) => {
      const cls = n.mood >= NB.friendly ? 'good' : n.mood <= NB.hostile ? 'bad' : '';
      const perks = n.perks.map((p) => `<li class="${p.on ? 'ok' : 'no'}">${p.on ? '✓' : '○'} <b>${esc(p.name)}</b> <small>(${p.at >= NB.allied ? 'Allied' : 'Friendly'}, ${p.at}${p.once ? ', once' : ''})</small> ${esc(p.text)}</li>`).join('');
      const base = n.base ? (n.base.destroyed ? `<p class="cl-dim">Their raider den is destroyed.</p>`
        : n.base.truce ? `<p class="cl-good">Truce: their den sends no raids.</p>`
          : n.base.bold ? `<p class="cl-why">Hostile: their raider den is bold (its fleet regrows twice as fast, ${num(n.base.fleet)} / ${num(n.base.max)}).</p>`
            : `<p class="cl-dim">Their raider den: ${num(n.base.fleet)} / ${num(n.base.max)} machines. At ${NB.hostile} or below it grows bold.</p>`) : '';
      const hist = n.log.length ? `<ul class="cl-nblog">${n.log.map((e) => `<li><small>Day ${e.day}</small> ${esc(e.text)} <b class="${e.delta > 0 ? 'good' : 'bad'}">${e.delta > 0 ? '+' : '−'}${Math.abs(e.delta)}</b></li>`).join('')}</ul>` : '<p class="cl-dim">Nothing between you yet.</p>';
      return `<article class="cl-nbcard" style="--nc:${n.color};border:1px solid ${n.color}55;border-radius:10px;padding:10px 12px;margin:0 0 10px">
        <h4 style="margin:0 0 4px;color:${n.color}">${esc(n.name[0].toUpperCase() + n.name.slice(1))} <small class="${cls}">${esc(n.standing)} · ${n.mood > 0 ? '+' : ''}${n.mood}</small></h4>
        <p class="cl-dim" style="margin:0 0 6px">${esc(n.text)}</p>
        <div class="cl-fillrow"><span>Mood</span><span class="cl-fill" style="position:relative"><span style="width:${pos(n.mood)}%;background:${n.color}"></span><i style="position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:rgba(255,255,255,.6)"></i></span><b>${n.mood}</b></div>
        <ul class="cl-needs" style="list-style:none;padding:0;margin:6px 0">${perks}</ul>${base}${hist}</article>`;
    }).join('');
    return `${on ? '' : note('<b>Neighbours are off</b> (Settings): no offers, and their moods hold where they are.', 'warn')}
      <p class="cl-dim">Three settlements beyond the hull watch Eden. <b>Trade</b> at the Market, <b>relief convoys</b>, <b>petitions granted</b>, <b>raids beaten off</b> and <b>expeditions</b> to their outposts warm them; paying raiders and refusing their requests cools them. Now and then one sends an offer, a request, a warning or a gift. Moods drift slowly back over time.</p>
      ${cards}`;
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
    const bases = R.basesStatus ? R.basesStatus(s) : [], peace = R.BASE_RAIDS?.peace ?? 500;
    if (s.options?.raids === false && !r.coming) next = `<p>Raiders are <b>off</b> (Settings). Turn them on whenever you like.</p>`;
    else if (!on && !r.coming) next = s.pop < peace
      ? `<p>No raids while Eden is small: nobody out there cares about a colony under <b>${num(peace)} colonists</b> (you have ${num(s.pop)}). Rebuild in peace.</p>`
      : bases.length && bases.every((b) => b.destroyed) ? '<p>Every raider base is destroyed. <b>No more raids.</b></p>'
      : '<p>No raider base has noticed Eden yet.</p>';
    else if (r.coming) {
      const c = r.coming, pv = rule('raidPreview', s);
      next = `<div class="cl-raidnow"><b class="bad">Raiders ${eta ? `arrive in ${L(plural(eta, 'day'))}` : 'are here'}</b>
        <p>${esc(factionName(c.faction))}${tierName(c.tier) ? ` (${esc(tierName(c.tier))})` : ''} from ${esc(fromText(c.from))}: ${plural(c.units?.length || 0, 'machine')}${c.units?.length ? ` · ${esc(unitList(c.units))}` : ''}.</p>
        ${pv ? winBar(pv, L, W) : ''}</div>`;
    } else if (r.warned && eta != null) next = `<p><b class="warn">Sato's sensors: raiders in ${L(plural(eta, 'day'))}.</b>${r.from ? ` From ${esc(fromText(r.from))}.` : ''} Get the guardians crewed and repaired.</p>`;
    else next = `<p>No contact. Sato warns you <b>${sensorDays(s)} days</b> before a raid${n('sensormast') < 3 ? '; each Sensor Mast adds 3 (up to 9)' : ''}.</p>`;
    return `<div class="cl-raidcols">
      <section class="cl-dsec"><h4>Heat <small>how tempting Eden looks</small></h4>
        <div class="cl-heat" title="0: nobody looks twice · 100: every crew in the belt knows Eden's name"><span class="cl-heatbar"><span ${W(100 - heat)}></span></span><b>${L(heat)}</b></div>
        <p class="cl-dim">The hotter Eden is, the sooner the next raid comes. Heat moves a tenth of the way each day toward:</p>
        <table class="cl-table"><tbody>${parts.map(([l, v]) => `<tr><td>${esc(l)}</td><td class="n ${v > 0 ? 'bad' : v < 0 ? 'good' : ''}">${L(`${v >= 0 ? '+' : '−'}${num(Math.abs(v))}`)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td>Target <small>(0–100)</small></td><td class="n">${L(num(Math.max(0, Math.min(100, parts.reduce((t, [, v]) => t + v, 0)))))}</td></tr></tfoot></table>
        <p class="cl-dim">Paying tribute adds 10. Jammer Arrays take 10 off each (up to 30).</p></section>
      <section class="cl-dsec"><h4>Next raid</h4>${next}</section>
      ${bases.length ? `<section class="cl-dsec"><h4>Raider bases <small>destroy them on the Star chart (X)</small></h4>
        ${bases.map((b) => `<div class="cl-kv cl-base${b.destroyed ? ' gone' : ''}"><span>${esc(b.name[0].toUpperCase() + b.name.slice(1))} <small>${esc(b.faction)}${b.sectorName ? ` · ${esc(b.sectorName)}` : ''}</small></span>
          <b class="${b.destroyed ? 'good' : b.aware ? 'bad' : ''}">${b.destroyed ? 'destroyed' : b.aware ? `${b.eta ? `first raid in ~${L(b.eta)} d · ` : ''}fleet ${L(b.fleet)}/${b.max}` : `notices Eden at ${num(b.notice)} colonists`}</b></div>`).join('')}
        <p class="cl-dim">A base raids when most of its fleet is home; raiders you destroy are gone for good, so a beaten base takes longer to come back. A squadron at a base's door gets Eden noticed.</p></section>` : ''}
      <section class="cl-dsec"><h4>Defences <small>total ${L(num(defenceTotal(s)))}</small></h4>
        <div class="cl-kv"><span>Crewed guardians</span><b class="${crewedN ? '' : 'bad'}">${L(`${crewedN} of ${gs.length} · crews ${cap}`)}</b></div>
        <div class="cl-kv"><span>Battery Emplacements</span><b>${emp.length ? `${emp.length} (${dragons} Dragon, ${emp.length - dragons} Hydra)` : '<span class="cl-dim">none</span>'}</b></div>
        <div class="cl-kv"><span>Shield Pylons</span><b>${n('shieldpylon') || '<span class="cl-dim">none</span>'}</b></div>
        <div class="cl-kv"><span>Sensor Masts</span><b>${n('sensormast') ? `${n('sensormast')} · warning ${sensorDays(s)} d` : '<span class="cl-dim">none</span>'}</b></div>
        <div class="cl-kv"><span>Jammer Arrays</span><b>${n('jammer') || '<span class="cl-dim">none</span>'}</b></div>
        ${(() => { const h = commanders(s).find((c) => c.dept === 'security'); return h ? `<div class="cl-kv"><span>Security head</span><b>${esc(CMDR[h.key]?.name || h.key)} +${Math.round((CMDR[h.key]?.might || 0) / 10)}%</b></div>` : ''; })()}
        <div class="cl-acts"><button type="button" class="cl-btn sm" data-dgo="guardians">Guardians</button><button type="button" class="cl-btn sm" data-dgo="production">Production</button></div></section>
      <section class="cl-dsec"><h4>Last raid <small>${r.count ? `${r.count} so far · ${r.won || 0} won · ${r.lost || 0} lost` : ''}</small></h4>${reportHtml(s, r.last)}</section></div>`;
  }
  function winBar(pv, L, W) {
    const raw = +pv.winChance, pct = Number.isFinite(raw) ? Math.round(raw <= 1 ? raw * 100 : raw) : null;
    const lost = pv.expectedLost || [];
    const dmg = pv.expectedDamage;
    const trib = pv.tribute ? [pv.tribute.credits ? `${num(pv.tribute.credits)} credits` : '', pv.tribute.food ? `${num(pv.tribute.food)} food` : ''].filter(Boolean).join(' + ') : '';   // either one is accepted
    return `<div class="cl-win-chance${pct == null ? '' : pct >= 65 ? ' good' : pct >= 40 ? ' even' : ' bad'}"><i>Win chance</i><span class="cl-wbar"><span ${W(pct ?? 0)}></span></span><b>${L(pct == null ? '?' : `${pct}%`)}</b></div>
      <div class="cl-kv"><span>Defence vs attack</span><b>${L(`${num(pv.defence ?? 0)} vs ${num(pv.attack ?? 0)}`)}</b></div>
      <div class="cl-kv"><span>Likely losses</span><b class="${lost.length ? 'bad' : 'good'}">${L(lost.length ? unitList(lost.map((t) => ({ type: t?.type ?? t }))) : 'none expected')}</b></div>
      <div class="cl-kv"><span>If we lose</span><b class="bad">${L(pv.atRisk != null ? `stores raided; ${pv.atRisk ? `${plural(pv.atRisk, 'building')} in their path${pv.shielded ? ` (${pv.shielded} more shielded)` : ''}` : `no buildings in their path${pv.shielded ? ` (${pv.shielded} shielded)` : ''}`}` : typeof dmg === 'number' ? `stores raided, about ${num(dmg)} buildings knocked out` : dmg ? String(dmg) : 'stores raided, buildings damaged')}</b></div>
      ${typeof dmg === 'number' && dmg > 0 ? `<div class="cl-kv"><span>Buildings likely knocked out</span><b>${L(`≈ ${num(dmg)}`)}</b></div>` : ''}
      ${trib ? `<div class="cl-kv"><span>Tribute to make them leave</span><b class="${pv.canPay === false ? 'bad' : ''}">${L(pv.canPay === false ? `${trib}: we cannot pay` : trib.replace(' + ', ' or '))}</b></div>` : ''}`;
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
      const C = CMDR[b.dataset.cdismiss];
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
    closeResearch(); closeJournal(); closeChart();
    $('.cl-build')?.classList.remove('open');
    const was = defEl.hidden;
    defEl.hidden = false;
    renderDefence(true);
    if (was || tab) defBody.scrollTop = 0;
  }
  function closeDefence() { if (defEl.hidden) return false; defEl.hidden = true; return true; }
  function toggleDefence(tab) { if (defEl.hidden || tab) openDefence(tab); else closeDefence(); }
  statEls.heat?.el.addEventListener('click', () => openDefence('raids'));

  // ---------------------------------------------------------------- version 4, stage 2: the Discoveries journal
  // Logs in story order (a reader that sets each one by its kind), the five fragments of the vault's
  // code, the vaults with what each still needs, the survivors, and the dangers with their Clear
  // buttons. Orders go through rules.js, or js/colony/secrets.js when the rules do not re-export them
  // (clearDanger, dangerPreview, openVault, secretStatus, readLog); each call is guarded.
  const srule = (name, s, ...a) => {
    const f = typeof R[name] === 'function' ? R[name] : api.secrets?.[name];
    if (typeof f !== 'function') return undefined;
    try { return f(s, ...a); } catch (e) { console.warn(`${name} failed`, e); return undefined; }
  };
  const secOf = (s) => s?.secrets || null;
  const sitesOf = (s) => secOf(s)?.sites || [];
  const dangersOf = (s) => secOf(s)?.dangers || [];
  const readOf = (s) => new Set(secOf(s)?.read || []);
  const chamberById = (s, id) => s.chambers.find((c) => c.id === id) || null;
  const chName = (s, id) => { const c = chamberById(s, id); return c ? c.name || `Chamber ${c.id}` : 'an unknown chamber'; };
  const siteFor = (s, kind, ref) => sitesOf(s).find((x) => x.kind === kind && x.ref === ref) || null;
  const SURVEYED = new Set(['surveyed', 'pressurising', 'open']);
  // a danger is known once its chamber has been surveyed (or the rules say so)
  const dangerFound = (s, d) => !!(d.found ?? (d.done || d.deadline != null || SURVEYED.has(chamberById(s, d.chamber)?.status)));
  const dangerAt = (s, cid) => dangersOf(s).find((d) => d.chamber === cid) || null;
  const reactorOf = (s) => dangersOf(s).find((d) => d.kind === 'reactor' && !d.done && d.deadline != null) || null;
  // days of crew work left on a danger being cleared, or null when nobody is at work on it
  const dangerWork = (d) => (!d || d.done ? null : d.work > 0 ? d.work : null);
  const logFound = (s, id) => !!siteFor(s, 'log', id)?.found;
  const unreadLogs = (s) => { const r = readOf(s); return LOG_ORDER.filter((l) => logFound(s, l.id) && !r.has(l.id)); };
  const keysRead = (s) => { const r = readOf(s); return KEY_LOGS.filter((l) => r.has(l.id)).length; };
  const deckWord = (o) => `${(DECK_NAME[deckOf(o)] || 'Main').toLowerCase()} deck`;
  const showAttr = (o) => esc(JSON.stringify(o));
  const sameRef = (a, b) => a != null && b != null && String(a) === String(b);
  // flooded tiles left in a chamber (vaults that need it drained; the flooding danger)
  const marshLeft = (s, c) => {
    if (!c) return 0;
    const m = mapOf(s, deckOf(c)); let n = 0;
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) { const i = y * m.w + x; if (m.ch[i] === c.id && m.t[i] === T.MARSH) n++; }
    return n;
  };
  const spareMW = () => Math.floor((summary?.power?.supply ?? 0) - (summary?.power?.demand ?? 0));
  // rules.secretStatus when it exists, else the same counts from state.secrets
  function secStatus(s) {
    const sites = sitesOf(s), r = readOf(s), k = (kind) => sites.filter((x) => x.kind === kind);
    const fb = {
      logs: { read: LOGS.filter((l) => r.has(l.id)).length, found: k('log').filter((x) => x.found).length, total: LOGS.length },
      vaults: { opened: k('vault').filter((x) => x.done).length, found: k('vault').filter((x) => x.found).length, total: VAULTS.length },
      survivors: { joined: k('survivors').filter((x) => x.done).length, found: k('survivors').filter((x) => x.found).length, total: SURVIVORS.length },
      keys: keysRead(s), finalOpened: !!secOf(s)?.finalOpened,
    };
    const st = srule('secretStatus', s);
    if (!st || typeof st !== 'object') return fb;
    return { ...fb, ...st, logs: { ...fb.logs, ...st.logs }, vaults: { ...fb.vaults, ...st.vaults }, survivors: { ...fb.survivors, ...st.survivors }, keys: st.keys ?? fb.keys };
  }
  const goodsText = (o) => Object.entries(o || {}).filter(([, v]) => v > 0).map(([k, v]) => `${num(v)} ${(GOOD_NAME[k] || k).toLowerCase()}`).join(', ');
  function rewardText(rw) {
    if (!rw) return '';
    return [rw.final ? 'the truth about Eden' : '', goodsText(rw.goods), rw.research ? `${num(rw.research)} research` : '', rw.tech ? `the ${TECH[rw.tech]?.name || rw.tech} tech` : '',
      rw.machine != null ? `a prototype: the ${mInfo(rw.machine).name}` : '', rw.soil ? `${num(rw.soil)} tiles of soil made fertile` : ''].filter(Boolean).join(' · ');
  }
  // What a vault still needs, as a checklist: { ok, label, now?, hint?, show? }. rules.vaultNeeds gives
  // the list ({ need, label, met }); the interface adds where to go about each one.
  function vaultNeeds(s, site) {
    const v = VAULT[site.ref] || {}, q = v.requires || {}, r = readOf(s), c = chamberById(s, site.chamber), dk = deckOf(c || site);
    const ruled = srule('vaultNeeds', s, site);
    if (Array.isArray(ruled) && ruled.length) {
      const k = keysRead(s), keyFound = q.key && logFound(s, q.key), d = dangerAt(s, site.chamber), sp = spareMW();
      const SHOW = {
        open: { chamber: site.chamber }, key: keyFound ? { journal: 'logs', ref: q.key } : null,
        drained: { build: 'pumpstation', deck: dk === 'upper' ? 'main' : dk }, cleared: d && !d.done ? { journal: 'dangers', ref: site.chamber } : { chamber: site.chamber },
        power: { build: dk === 'lower' ? 'geotap' : 'solar' }, code: k < FINAL_CODE_PARTS ? { journal: 'logs' } : null,
      };
      const HINT = { key: q.key && !keyFound ? `not found yet: somewhere on the ${LOG[q.key]?.deck || 'lower'} deck` : '', power: q.power ? `${sp} MW spare now` : '' };
      return ruled.map((n) => ({ ok: !!(n.met ?? n.ok), label: n.need === 'key' && !keyFound ? 'Read a log not found yet' : n.label, hint: HINT[n.need] && n.need !== 'power' ? HINT[n.need] : '', now: '', show: SHOW[n.need] ?? null }));
    }
    const out = [];
    out.push({ ok: c?.status === 'open', label: `${chName(s, site.chamber)} open`, now: c ? (STATUS[c.status]?.[0] || c.status).toLowerCase() : '', show: { chamber: site.chamber } });
    if (q.key) {
      const l = LOG[q.key], found = logFound(s, q.key);
      out.push({ ok: r.has(q.key), label: found ? `Read “${l?.title || q.key}”` : 'Read a log not found yet', hint: found ? '' : `somewhere on the ${(l?.deck || 'lower')} deck`, show: found ? { journal: 'logs', ref: q.key } : null });
    }
    if (q.drained) { const n = marshLeft(s, c); out.push({ ok: n === 0, label: 'No flooded ground in the chamber', now: n ? `${n} tile${n === 1 ? '' : 's'} flooded` : '', show: n ? { build: 'pumpstation', deck: dk === 'upper' ? 'main' : dk } : null }); }
    if (q.cleared) { const d = dangerAt(s, site.chamber); out.push({ ok: !d || !!d.done, label: d ? `${DANGERS[d.kind]?.name || d.kind}: dealt with` : 'The way cleared', show: d && !d.done ? { journal: 'dangers', ref: site.chamber } : null }); }
    if (q.power) { const sp = spareMW(); out.push({ ok: sp >= q.power, label: `${q.power} MW of spare power`, now: `${sp} MW spare now`, show: sp < q.power ? { build: dk === 'lower' ? 'geotap' : 'solar' } : null }); }
    if (q.code) { const k = keysRead(s); out.push({ ok: k >= FINAL_CODE_PARTS, label: `All ${FINAL_CODE_PARTS} fragments of the code`, now: `${k} of ${FINAL_CODE_PARTS} read`, show: k < FINAL_CODE_PARTS ? { journal: 'logs' } : null }); }
    return out;
  }

  // ---- the panel
  const jEl = $('.cl-journal'), jBody = $('[data-jbody]'), jStats = $('[data-jstats]'), jKeys = $('[data-jkeys]');
  const jBtn = $('[data-tool=journal]'), jNew = $('[data-jnew]');
  const J_KEY = 'el-colony-journal';
  const jPrefs = (() => { try { return JSON.parse(localStorage.getItem(J_KEY) || '{}') || {}; } catch { return {}; } })();
  const storeJ = () => { try { localStorage.setItem(J_KEY, JSON.stringify(jPrefs)); } catch { } };
  let jTab = J_TABS.some(([k]) => k === jPrefs.tab) ? jPrefs.tab : 'logs', jLog = null, jFocus = null, jSig = '';

  function renderJournal(force) {
    if (jEl.hidden) return;
    const s = S();
    const sig = JSON.stringify([jTab, jLog, jFocus, s.day, secOf(s), Math.floor((s.stock?.credits || 0) / 25), Math.floor((s.stock?.parts || 0) / 5),
      (s.guardians || []).map((g) => `${g.id}:${g.hp}:${g.commander || ''}`).join(), spareMW(), s.chambers.map((c) => (c.status || '?')[0]).join(''), phone()]);
    if (!force && sig === jSig) return;
    jSig = sig;
    if (force) { liveSigs.delete(jBody); liveSigs.delete(jStats); liveSigs.delete(jKeys); }
    for (const t of jEl.querySelectorAll('[data-jtab]')) { const on = t.dataset.jtab === jTab; if (t.getAttribute('aria-selected') !== String(on)) t.setAttribute('aria-selected', String(on)); }
    const nNew = unreadLogs(s).length, act = dangersOf(s).filter((d) => dangerFound(s, d) && !d.done).length;
    const vReady = sitesOf(s).filter((x) => x.kind === 'vault' && x.found && !x.done && vaultNeeds(s, x).every((n) => n.ok)).length;
    const counts = { logs: nNew ? `${nNew} new` : '', vaults: vReady ? `${vReady} ready` : '', survivors: '', dangers: act || '' };
    for (const n of jEl.querySelectorAll('[data-jtabn]')) { const v = String(counts[n.dataset.jtabn] ?? ''); if (n.textContent !== v) n.textContent = v; }
    liveRender(jStats, (L) => jStatsHtml(s, L));
    liveRender(jKeys, () => keysHtml(s));
    if (!secOf(s)) { liveRender(jBody, () => note('Nothing has turned up yet. Survey chambers on the upper and lower decks: Eden keeps its secrets below.')); return; }
    const fn = { logs: logsHtml, vaults: vaultsHtml, survivors: survivorsHtml, dangers: dangersHtml }[jTab];
    liveRender(jBody, (L, W) => `<div class="cl-jtab-${jTab}">${fn(s, L, W)}</div>`);
  }
  function jStatsHtml(s, L) {
    const st = secStatus(s), nNew = unreadLogs(s).length, act = dangersOf(s).filter((d) => dangerFound(s, d) && !d.done).length, rc = reactorOf(s);
    return `<span class="cl-rst" title="Logs read, of all twenty"><i>Logs</i><b>${L(st.logs.read)}<small>${L(`/${st.logs.total}`)}</small></b><em>${L(nNew ? `${nNew} new` : `${st.logs.found} found`)}</em></span>
      <span class="cl-rst" title="Fragments of the Ninefold vault's code: five logs each hold one"><i>Code</i><b>${L(st.keys)}<small>/${FINAL_CODE_PARTS}</small></b><em>${L(st.finalOpened ? 'vault opened' : st.keys >= FINAL_CODE_PARTS ? 'complete' : 'fragments')}</em></span>
      <span class="cl-rst" title="Vaults opened / all"><i>Vaults</i><b>${L(st.vaults.opened)}<small>${L(`/${st.vaults.total}`)}</small></b><em>${L(`${st.vaults.found} found`)}</em></span>
      <span class="cl-rst" title="Groups of survivors who have joined / all"><i>Survivors</i><b>${L(st.survivors.joined)}<small>${L(`/${st.survivors.total}`)}</small></b><em>${L(`${st.survivors.found} found`)}</em></span>
      <span class="cl-rst${act ? ' cl-rsbad' : ''}" title="Dangers known and not yet dealt with"><i>Dangers</i><b>${L(act)}</b><em>${L(rc ? `core: ${Math.max(0, rc.deadline - s.day)} d left` : act ? 'in the way' : 'none known')}</em></span>`;
  }
  // the five fragments as a row of slots that fill as their logs are read
  function keysHtml(s) {
    const r = readOf(s), n = keysRead(s), opened = !!secOf(s)?.finalOpened;
    return `<div class="cl-jkeyrow${n >= FINAL_CODE_PARTS ? ' complete' : ''}${opened ? ' opened' : ''}">
      <i class="cl-jkeylbl" title="Five logs each hold a part of the code to the Ninefold vault">Ninefold code</i>
      <div class="cl-jslots">${KEY_LOGS.map((l) => {
        const got = r.has(l.id), found = logFound(s, l.id);
        if (got) return `<button type="button" class="cl-jslot on" data-jlog="${l.id}" title="Fragment ${l.key}, from “${esc(l.title)}”"><b>${cipher(l.id)}</b><small>${l.key} · ${esc(KEY_CLUE[l.key])}</small></button>`;
        if (found) return `<button type="button" class="cl-jslot found" data-jlog="${l.id}" title="Found, not read: read “${esc(l.title)}” to learn it"><b>? ? ?</b><small>${l.key} · unread</small></button>`;
        return `<span class="cl-jslot" title="Not found yet"><b>· · ·</b><small>${l.key} · missing</small></span>`;
      }).join('')}</div>
      <em class="cl-jkeynote">${opened ? 'The vault is open.' : n >= FINAL_CODE_PARTS ? 'Complete: the Ninefold vault will open to it.' : `${n} of ${FINAL_CODE_PARTS} fragments`}</em></div>`;
  }

  // -- Logs
  function logsHtml(s) {
    const r = readOf(s), sel = jLog && logFound(s, jLog) ? LOG[jLog] : null;
    const list = LOG_ORDER.map((l) => {
      const site = siteFor(s, 'log', l.id), no = String(l.order).padStart(2, '0');
      if (!site?.found) return `<li><div class="cl-jli locked" title="Not found yet"><span class="cl-jno">${no}</span>${ico('lock')}<span class="cl-jlt"><b>Not found yet</b><small>${site ? `somewhere on the ${deckWord(site)}` : '&nbsp;'}</small></span></div></li>`;
      const isNew = !r.has(l.id), on = sel?.id === l.id;
      return `<li><button type="button" class="cl-jli k-${logKind(l)}${on ? ' sel' : ''}${isNew ? ' new' : ''}" data-jlog="${l.id}" aria-current="${on}"><span class="cl-jno">${no}</span>${ico('log')}<span class="cl-jlt"><b>${esc(l.title)}</b><small>${esc(l.author)}</small></span>${l.key ? `<span class="cl-jkeytag" title="Holds fragment ${l.key} of the code">◆${l.key}</span>` : ''}${isNew ? '<em class="cl-jnewtag">New</em>' : ''}</button></li>`;
    }).join('');
    const exp = (secOf(s)?.journal || []).filter((j) => j.kind === 'expedition' && j.text);
    return `<div class="cl-jlogs${sel ? ' reading' : ''}"><ol class="cl-jlist" aria-label="Logs in story order">${list}</ol><div class="cl-jreader">${sel ? docHtml(s, sel) : readerEmpty(s)}</div></div>
      ${exp.length ? `<div class="cl-dsec cl-jexp"><h4>From the expeditions</h4>${exp.map((j) => `<p><b>${esc(j.title || j.ref)}</b> <small class="cl-dim">day ${num(j.day)}</small><br>${esc(j.text)}</p>`).join('')}</div>` : ''}`;
  }
  function readerEmpty(s) {
    const un = unreadLogs(s), found = LOGS.filter((l) => logFound(s, l.id)).length;
    if (!found) return `<div class="cl-jempty">${SICON.book}<p><b>No logs found yet.</b></p><p class="cl-dim">Terminals, recorders and words scratched on walls turn up as Ruess's teams survey Eden's chambers, most of them on the lower deck. Each one tells a little of what happened here.</p></div>`;
    return `<div class="cl-jempty">${SICON.book}<p><b>${un.length ? `${un.length} new log${un.length === 1 ? '' : 's'}` : `${found} log${found === 1 ? '' : 's'} found`}</b></p>
      <p class="cl-dim">${un.length ? 'Pick one from the list to read it. Five of them hold a part of a code.' : 'Pick one from the list to read it again.'}</p>
      ${un.length ? `<button type="button" class="cl-btn sm primary" data-jlog="${un[0].id}">Read “${esc(un[0].title)}”</button>` : ''}</div>`;
  }
  // A log set as what it is: a diary page, a log in ink, an engineer's notebook, a print-out, a wall.
  function docHtml(s, l) {
    const kind = logKind(l), site = siteFor(s, 'log', l.id);
    const when = (secOf(s)?.journal || []).find((j) => j.ref === l.id && j.kind === 'log')?.day;
    const found = LOG_ORDER.filter((x) => logFound(s, x.id)), i = found.findIndex((x) => x.id === l.id), prev = found[i - 1], next = found[i + 1];
    const text = String(l.text).split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join('');
    const head = kind === 'terminal' ? `<div class="cl-dochead"><span>EDEN&nbsp;//&nbsp;${esc(l.author.toUpperCase())}</span><span>REC&nbsp;${String(l.order).padStart(3, '0')}</span></div>`
      : kind === 'notebook' ? `<div class="cl-dochead"><span>T. VENN · NOTES</span><span>p. ${l.order}</span></div>`
      : kind === 'letter' ? `<div class="cl-dochead"><span>${esc(l.author)}</span></div>` : '';
    return `<button type="button" class="cl-jback" data-jback>‹ All logs</button>
      <article class="cl-doc k-${kind}" aria-label="${esc(l.title)}">
        ${head}
        <h3>${esc(l.title)}</h3>
        <div class="cl-doctext">${text}</div>
        ${kind === 'wall' || kind === 'letter' && /log/i.test(l.title) ? '' : `<footer class="cl-docsign">— ${esc(l.author)}</footer>`}
        ${l.key ? `<div class="cl-dockey" title="Five logs each hold a part of the Ninefold vault's code">◆ Fragment ${l.key} of ${FINAL_CODE_PARTS} · ${esc(KEY_CLUE[l.key])} <b>${cipher(l.id)}</b></div>` : ''}
      </article>
      <div class="cl-docfoot">
        <span class="cl-docwhere">${esc(LOG_KIND[kind])}${site ? ` · found in <b>${esc(chName(s, site.chamber))}</b>, ${deckWord(site)}` : ''}${when != null ? ` · day ${when}` : ''}</span>
        ${site?.x != null ? `<button type="button" class="cl-btn xs" data-jshow="${showAttr({ tile: { x: site.x, y: site.y, deck: deckOf(site) } })}">Show me</button>` : ''}
        <span class="cl-docnav">${prev ? `<button type="button" class="cl-btn xs" data-jlog="${prev.id}" title="${esc(prev.title)}">‹ Previous</button>` : ''}${next ? `<button type="button" class="cl-btn xs" data-jlog="${next.id}" title="${esc(next.title)}">Next ›</button>` : ''}</span>
      </div>`;
  }
  // Opening a log in the reader marks it read (rules.readLog; state.secrets.read as a fallback).
  function readLog(id) {
    const s = S(); jLog = id;
    if (!secOf(s) || !logFound(s, id) || readOf(s).has(id)) { renderJournal(true); return; }
    let r = srule('readLog', s, id);
    if (r === undefined) { s.secrets.read ??= []; if (!s.secrets.read.includes(id)) s.secrets.read.push(id); r = { ok: true }; }
    const l = LOG[id];
    // (the rules' msg is the log's own text: the reader shows it, no toast)
    if (r?.ok !== false) r = l?.key ? { ok: true, msg: keysRead(S()) >= FINAL_CODE_PARTS ? 'The last fragment: the Ninefold code is complete.' : `Fragment ${l.key} of the Ninefold code.` } : { ok: true };
    result(r && typeof r === 'object' ? r : { ok: true });
    renderJournal(true);
  }

  // -- Vaults
  function vaultsHtml(s) {
    const found = sitesOf(s).filter((x) => x.kind === 'vault' && x.found);
    const ready = (x) => !x.done && vaultNeeds(s, x).every((n) => n.ok);
    const rank = (x) => (ready(x) ? -100 : 0) + (VAULT[x.ref]?.reward?.final ? 50 : 0) + (x.done ? 100 : 0) + VAULTS.findIndex((v) => v.id === x.ref);
    const missing = VAULTS.length - found.length;
    return `${note(`Sealed rooms the Directorate and Eden's people left behind. Each one opens its own way: <b>its chamber open</b>, and what the list says. The last, under the old core, needs <b>all five fragments</b> of the code.`)}
      <div class="cl-jcards">${found.sort((a, b) => rank(a) - rank(b)).map((x) => vaultCard(s, x)).join('')}
      ${missing > 0 ? `<div class="cl-jcard locked">${ico('lock')}<div><b>${missing} vault${missing === 1 ? '' : 's'} not found yet</b><p class="cl-dim">Survey more chambers, above and below.</p></div></div>` : ''}</div>`;
  }
  // A picture across the top of a card (art slots site/, vault/, danger/: the owner's reserve of xAI
  // images, 2026-11-04); nothing when the slot has no picture.
  function banner(slot, alt) {
    const u = api.art?.(slot);
    return u ? `<img class="cl-banner" src="${esc(u)}" alt="${esc(alt || '')}" loading="lazy" decoding="async">` : '';
  }
  function vaultCard(s, x) {
    const v = VAULT[x.ref] || { name: x.ref, text: '' }, needs = vaultNeeds(s, x), ok = needs.every((n) => n.ok), final = !!v.reward?.final;
    const r = !x.done && ok && typeof (R.openVault ?? api.secrets?.openVault) !== 'function' ? notReady('Opening vaults') : null;
    const can = !x.done && ok && !r;
    const why = x.done ? 'Opened' : !ok ? `Still needed: ${needs.filter((n) => !n.ok).map((n) => n.label).join('; ')}` : r?.msg && r.ok === false ? r.msg : final ? 'Enter the five fragments and open it' : 'Open it';
    return `<article class="cl-jcard cl-vault${x.done ? ' done' : can ? ' ready' : ''}${final ? ' final' : ''}${sameRef(jFocus, x.id) || sameRef(jFocus, x.ref) ? ' flash' : ''}" data-jsite="${esc(x.id)}">
      <header>${ico('vault')}<div class="cl-jct"><b>${esc(v.name)}</b><small>${esc(chName(s, x.chamber))} · ${deckWord(x)}</small></div><span class="cl-badge ${x.done ? 'st-open' : can ? 'st-surveying' : 'st-sealed'}">${x.done ? 'Opened' : can ? 'Ready' : 'Sealed'}</span></header>${banner(final ? 'scene/finalvault' : `vault/${x.ref}`, v.name)}
      <p class="cl-jctext">${esc(v.text)}</p>
      ${x.done ? `<p class="cl-vgot"><i>Recovered</i> ${esc(rewardText(v.reward))}</p>` : `<ul class="cl-req">${needs.map((n) => `<li class="${n.ok ? 'ok' : 'no'}"><span class="cl-reqmark">${n.ok ? '✓' : '✗'}</span><span class="cl-reqtext">${esc(n.label)}${!n.ok && (n.now || n.hint) ? ` <small>${esc(n.now || n.hint)}</small>` : ''}</span>${!n.ok && n.show ? `<button type="button" class="cl-btn xs" data-jshow="${showAttr(n.show)}">Show me</button>` : ''}</li>`).join('')}</ul>`}
      <div class="cl-acts">${x.done ? '' : `<button type="button" class="cl-btn sm${can ? ' primary' : ''}" data-jvopen="${esc(x.id)}" ${can ? '' : 'disabled'} title="${esc(why)}">${final ? 'Enter the code' : 'Open'}</button>`}<button type="button" class="cl-btn sm" data-jshow="${showAttr({ chamber: x.chamber })}">Show me</button></div>
      ${!x.done && ok && !can && r?.msg ? `<p class="cl-why">${esc(r.msg)}</p>` : ''}
    </article>`;
  }
  function openVault(id) {
    const s = S(), x = sitesOf(s).find((k) => sameRef(k.id, id)); if (!x) return;
    const r = srule('openVault', s, x.id) ?? notReady('Opening vaults');
    const v = VAULT[x.ref];
    if (r && r.ok !== false && v?.reward?.final) { closeJournal(); result({ ok: true }); return; }   // the revelation's window comes up
    const inside = /Inside: (.*)\.$/.exec(r?.msg || '')?.[1];
    result(r && r.ok !== false ? { ok: true, msg: `${v?.name || 'The vault'} is open. ${inside ? `Inside: ${inside}.` : rewardText(v?.reward)}` } : r);
    jFocus = x.id; renderJournal(true);
  }

  // -- Survivors
  function survivorsHtml(s) {
    const found = sitesOf(s).filter((x) => x.kind === 'survivors' && x.found).sort((a, b) => (a.done - b.done) || SURVIVORS.findIndex((g) => g.id === a.ref) - SURVIVORS.findIndex((g) => g.id === b.ref));
    const missing = SURVIVORS.length - found.length, r = readOf(s);
    const cards = found.map((x) => {
      const g = SURV[x.ref] || { name: x.ref, pop: 0, text: '' }, c = chamberById(s, x.chamber), C = g.commander ? CMDR[g.commander] : null;
      const needKey = g.requires?.key && !r.has(g.requires.key) ? LOG[g.requires.key] : null;
      const status = x.done ? 'Joined' : needKey ? 'Hiding' : 'Waiting';
      const line = x.done ? `${g.pop === 1 ? 'Now one of Eden\'s colonists' : `${num(g.pop)} colonists joined Eden`}${C ? `, and ${esc(C.name)} joined the commanders` : ''}.`
        : `${needKey ? `They will not come out until you have read “${esc(logFound(s, needKey.id) ? needKey.title : 'a log not found yet')}”. ` : ''}They join when <b>${esc(chName(s, x.chamber))}</b> is open${c ? ` (now ${esc((STATUS[c.status]?.[0] || c.status).toLowerCase())})` : ''}.`;
      return `<article class="cl-jcard cl-surv${x.done ? ' done' : ''}${sameRef(jFocus, x.id) || sameRef(jFocus, x.ref) ? ' flash' : ''}" data-jsite="${esc(x.id)}">
        <header>${C ? `<span class="cl-face cl-jface">${face(g.commander, 'j')}</span>` : ico('survivors')}<div class="cl-jct"><b>${esc(g.name)}</b><small>${g.pop === 1 ? 'one person' : `${num(g.pop)} people`} · ${esc(chName(s, x.chamber))} · ${deckWord(x)}</small></div><span class="cl-badge ${x.done ? 'st-open' : 'st-surveying'}">${status}</span></header>
        <p class="cl-jctext">${esc(g.text)}</p>
        ${C ? `<p class="cl-jcmd"><i>Commander</i> <b>${esc(C.name)}</b> <small>${esc(C.title || '')}</small></p>` : ''}
        <p class="cl-dim">${line}</p>
        <div class="cl-acts">${!x.done && needKey && logFound(s, needKey.id) ? `<button type="button" class="cl-btn sm" data-jlog="${needKey.id}">Read the log</button>` : ''}${C && x.done ? '<button type="button" class="cl-btn sm" data-jdef="commanders">Commanders</button>' : ''}<button type="button" class="cl-btn sm${!x.done && !needKey ? ' primary' : ''}" data-jshow="${showAttr({ chamber: x.chamber })}">Show me</button></div>
      </article>`;
    }).join('');
    return `${note('People still hide in Eden: families in the gardens, crews in the pump halls, the warden\'s people in the catacombs. Open the chamber they hide in and they join the colony.')}
      <div class="cl-jcards">${cards}${missing > 0 ? `<div class="cl-jcard locked">${ico('lock')}<div><b>${missing} group${missing === 1 ? '' : 's'} not found yet</b><p class="cl-dim">Someone is still out there.</p></div></div>` : ''}</div>`;
  }

  // -- Dangers
  const winPct = (pv) => { const raw = +(pv?.winChance ?? pv?.chance ?? pv?.win); return Number.isFinite(raw) ? Math.round(raw <= 1 ? raw * 100 : raw) : null; };
  function droneBar(pv, L, W) {
    const pct = winPct(pv), lost = pv.expectedLost || pv.losses || [];
    return `<div class="cl-win-chance${pct == null ? '' : pct >= 65 ? ' good' : pct >= 40 ? ' even' : ' bad'}"><i>Win chance</i><span class="cl-wbar"><span ${W(pct ?? 0)}></span></span><b>${L(pct == null ? '?' : `${pct}%`)}</b></div>
      ${pv.defence != null || pv.attack != null ? `<div class="cl-kv"><span>Guardians vs sentries</span><b>${L(`${num(pv.defence ?? pv.power ?? 0)} vs ${num(pv.attack ?? pv.strength ?? 0)}`)}</b></div>` : ''}
      <div class="cl-kv"><span>Likely losses</span><b class="${lost.length ? 'bad' : 'good'}">${L(lost.length ? unitList(lost.map((t) => ({ type: t?.type ?? t }))) : 'none expected')}</b></div>`;
  }
  // the old core's whole countdown (from the day it was found; 60 days, × 1.5 on Easy), for its bar
  const coreTotal = (s, d) => {
    const f = (secOf(s)?.journal || []).find((j) => j.kind === 'danger' && j.ref === d.chamber);
    return f && d.deadline != null && d.deadline > f.day ? d.deadline - f.day : Math.round((DANGERS.reactor.deadline || 60) * ((api.diff?.(s)?.key ?? s.difficulty) === 'easy' ? 1.5 : 1));
  };
  const dangerCost = (s, d, pv) => { const c = pv?.cost || DANGERS[d.kind]?.cost; if (!c) return null; try { return pv?.cost ? c : R.costOf?.(s, c) || c; } catch { return c; } };
  const dangerDays = (s, d, pv) => pv?.days ?? DANGERS[d.kind]?.days ?? null;
  function dangerCard(s, d, L, W) {
    const info = DANGERS[d.kind] || { name: d.kind, text: '' }, c = chamberById(s, d.chamber), pv = d.done ? null : srule('dangerPreview', s, d.chamber) || null;
    const left = d.deadline != null ? d.deadline - s.day : null, wl = dangerWork(d), cost = dangerCost(s, d, pv), days = dangerDays(s, d, pv);
    // the preview's `why` says what stands in the way; without a preview, a dry run of clearDanger
    const r = d.done || wl != null || d.kind === 'flooded' ? null : pv && 'why' in pv ? (pv.why ? { ok: false, msg: pv.why } : { ok: true })
      : dry(s, (q) => srule('clearDanger', q, d.chamber) ?? notReady('Clearing dangers'));
    const can = !!r && r.ok !== false;
    const status = d.done ? 'Cleared' : wl != null ? `Crews · ${wl} d` : d.kind === 'reactor' && left != null ? `${Math.max(0, left)} d left` : 'Active';
    let body = '';
    if (!d.done) {
      if (d.kind === 'drones') body = pv ? `<div class="cl-preview">${droneBar(pv, L, W)}</div>` : `<div class="cl-kv"><span>Sentry strength</span><b>${L(num(d.strength ?? 0))}</b></div>`;
      else if (d.kind === 'flooded') { const n = pv?.marsh ?? marshLeft(s, c); body = `<div class="cl-kv"><span>Flooded tiles left</span><b class="${n ? 'bad' : 'good'}">${L(n)}</b></div>${pv?.pumps != null ? `<div class="cl-kv"><span>Pump Stations in it</span><b class="${pv.pumps ? 'good' : 'bad'}">${L(pv.pumps || 'none')}</b></div>` : ''}`; }
      else {
        if (d.kind === 'reactor' && left != null) {
          const total = coreTotal(s, d), pct = Math.max(0, Math.min(100, (left / total) * 100));
          body += `<div class="cl-corebar${left <= 10 ? ' crit' : ''}"><i>Until it tears loose</i><span class="cl-wbar"><span ${W(pct)}></span></span><b>${L(`${Math.max(0, left)} d`)}</b></div>`;
        }
        body += `<div class="cl-kv"><span>${d.kind === 'reactor' ? 'Stabilising' : 'Decontamination'}</span><b>${L(`${cost ? costText(cost) : '?'}${days != null ? ` · ${plural(days, 'day')}` : ''}`)}</b></div>`;
        if (wl != null) body += `<div class="cl-kv"><span>Crews at work</span><b class="good">${L(`${plural(wl, 'day')} to go`)}</b></div>`;
      }
    }
    const label = d.kind === 'drones' ? 'Send the guardians' : d.kind === 'reactor' ? 'Stabilise' : 'Decontaminate';
    const btn = d.done || d.kind === 'flooded' || wl != null ? '' : `<button type="button" class="cl-btn sm${can ? ' primary' : ''}${d.kind === 'drones' ? ' fight' : ''}" data-jclear="${d.chamber}" ${can ? '' : 'disabled'} title="${esc(can ? label : r?.msg || 'Not possible now')}">${label}${d.kind !== 'drones' && cost ? ` <small>${esc(costText(cost))}</small>` : d.kind === 'drones' && winPct(pv) != null ? ` <small>${winPct(pv)}%</small>` : ''}</button>`;
    const pump = d.kind === 'flooded' && !d.done ? `<button type="button" class="cl-btn sm primary" data-jshow="${showAttr({ build: 'pumpstation', deck: deckOf(c) === 'upper' ? 'main' : deckOf(c) })}">Show me: Pump Station</button>` : '';
    return `<article class="cl-jcard cl-danger k-${esc(d.kind)}${d.done ? ' done' : ''}${sameRef(jFocus, d.chamber) ? ' flash' : ''}" data-jdanger="${d.chamber}">
      <header>${ico(d.kind in SICON ? d.kind : 'toxic')}<div class="cl-jct"><b>${esc(info.name)}</b><small>${esc(chName(s, d.chamber))} · ${deckWord(c)}</small></div><span class="cl-badge ${d.done ? 'st-open' : wl != null ? 'st-surveying' : 'st-sealed'}">${esc(status)}</span></header>${d.done ? '' : banner(`danger/${d.kind}`, info.name)}
      <p class="cl-jctext">${esc(d.done ? (d.kind === 'drones' ? 'The sentries are scrap. The way is clear.' : d.kind === 'reactor' ? 'The core is clamped and cold.' : 'Dealt with: the chamber can take air.') : info.text)}</p>
      ${body}
      <div class="cl-acts">${btn}${pump}<button type="button" class="cl-btn sm" data-jshow="${showAttr({ chamber: d.chamber })}">Show me</button></div>
      ${!d.done && r && !can && r.msg ? `<p class="cl-why">${esc(r.msg)}</p>` : !d.done && d.kind === 'flooded' && pv?.why ? `<p class="cl-dim">${esc(pv.why)}</p>` : ''}
    </article>`;
  }
  function dangersHtml(s, L, W) {
    const ds = dangersOf(s).filter((d) => dangerFound(s, d));
    const rank = (d) => (d.done ? 100 : 0) + (d.kind === 'reactor' ? 0 : d.kind === 'drones' ? 1 : 2);
    return `${note('A danger keeps its chamber from taking air until it is dealt with (the old core only threatens). <b>Sentries</b>: send the crewed guardians, as against raiders. <b>Toxic air</b> and <b>radiation</b>: crews decontaminate for parts and days. <b>Flooding</b>: Pump Stations drain it.')}
      <div class="cl-jcards">${ds.sort((a, b) => rank(a) - rank(b)).map((d) => dangerCard(s, d, L, W)).join('') || '<div class="cl-jcard locked"><div><b>No dangers known yet.</b><p class="cl-dim">Surveys reveal them, as they reveal everything else.</p></div></div>'}</div>`;
  }
  function clearDanger(cid) {
    const s = S(), d = dangerAt(s, cid); if (!d) return;
    if (d.kind === 'drones') {
      const w = winPct(srule('dangerPreview', s, cid));
      if (w != null && w < 40 && !confirm(`The guardians have about ${w}% to win against the sentries. Send them anyway?`)) return;
    }
    const before = (S().guardians || []).map((g) => g.type), pend = (S().pending || []).length;
    const r = srule('clearDanger', S(), cid) ?? notReady('Clearing dangers');
    const fought = d.kind === 'drones' && r && (r.won != null || r.win != null || r.report || r.ok !== false);
    if (fought) {
      closeJournal();   // the fight's report window comes up (the rules' 'dronefight' event)
      result({ ok: true });
      if (!(S().pending || []).slice(pend).some((p) => /drone|sentr/.test(p.kind || ''))) droneReport(S(), cid, r.report || r, before);
      return;
    }
    else result(r && r.ok !== false && !r.msg ? { ok: true, msg: `${DANGERS[d.kind]?.name || 'The danger'}: crews at work.` } : r);
    jFocus = cid; renderJournal(true);
  }

  function openJournal(tab, ref) {
    if (tab && J_TABS.some(([k]) => k === tab)) { jTab = tab; jPrefs.tab = tab; storeJ(); }
    if (ref != null) {
      if (jTab === 'logs' && LOG[ref]) { jLog = ref; jFocus = null; }
      else jFocus = ref;
    } else jFocus = null;
    for (const p of Object.values(pops)) p.hidden = true;
    closeResearch(); closeDefence(); closeChart();
    $('.cl-build')?.classList.remove('open');
    const was = jEl.hidden;
    jEl.hidden = false;
    renderJournal(true);
    if (jTab === 'logs' && ref && LOG[ref] && logFound(S(), ref) && !readOf(S()).has(ref)) readLog(ref);
    if (was || tab) jBody.scrollTop = 0;
    requestAnimationFrame(() => {
      const el = ref == null ? null : jTab === 'logs' ? jBody.querySelector(`[data-jlog="${CSS.escape(String(ref))}"]`) : jBody.querySelector(`.flash`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }
  function closeJournal() { if (jEl.hidden) return false; jEl.hidden = true; jFocus = null; return true; }
  function toggleJournal(tab) { if (jEl.hidden || tab) openJournal(tab); else closeJournal(); }

  jEl.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-close=journal]')) { closeJournal(); return; }
    const tab = t.closest('[data-jtab]');
    if (tab) { openJournal(tab.dataset.jtab); return; }
    const lg = t.closest('[data-jlog]');
    if (lg) { if (jTab !== 'logs') { jTab = 'logs'; jPrefs.tab = 'logs'; storeJ(); } readLog(lg.dataset.jlog); jBody.querySelector('.cl-jreader')?.scrollTo?.(0, 0); if (phone()) jBody.scrollTop = 0; return; }
    if (t.closest('[data-jback]')) { jLog = null; renderJournal(true); return; }
    const sh = t.closest('[data-jshow]');
    if (sh) {
      let show = null; try { show = JSON.parse(sh.dataset.jshow); } catch { }
      if (!show) return;
      if (show.journal) { openJournal(show.journal, show.ref ?? null); return; }
      closeJournal(); api.show?.(show); return;
    }
    const df = t.closest('[data-jdef]');
    if (df) { openDefence(df.dataset.jdef); return; }
    const b = t.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.jvopen != null) openVault(b.dataset.jvopen);
    else if (b.dataset.jclear != null) clearDanger(+b.dataset.jclear);
  });

  // The top bar: the journal button (with the number of new logs) once Eden has secrets, and the
  // old core's countdown while it is stirring.
  function hudSecrets(s) {
    const sec = secOf(s);
    if (jBtn.hidden === !!sec) jBtn.hidden = !sec;
    const any = !!sec && (sitesOf(s).some((x) => x.found) || (sec.read || []).length > 0);
    if (root.classList.contains('cl-v4s') !== any) root.classList.toggle('cl-v4s', any);
    const n = sec ? unreadLogs(s).length : 0;
    if (jNew.hidden === !!n) jNew.hidden = !n;
    if (jNew.textContent !== String(n)) jNew.textContent = String(n);
    const t = n ? `Discoveries: ${n} new log${n === 1 ? '' : 's'} to read (J)` : 'Discoveries: logs, vaults, survivors and dangers (J)';
    if (jBtn.title !== t) jBtn.title = t;
    const rc = reactorOf(s);
    show('core', !!rc);
    if (rc) {
      const left = Math.max(0, rc.deadline - s.day), wl = dangerWork(rc);
      stat('core', String(left), 'd', wl != null ? `crew ${wl}d` : left <= 10 ? 'critical' : 'stirring', `alert${left <= 10 && wl == null ? ' crit' : ''}${wl != null ? ' working' : ''}`);
      setTitle('core', `The old core under ${chName(s, rc.chamber)} (${deckWord(chamberById(s, rc.chamber))}) is stirring.\n${left} day${left === 1 ? '' : 's'} until it tears loose: it would damage buildings on its deck and reseal chambers there.\n${wl != null ? `Crews are stabilising it: ${wl} day${wl === 1 ? '' : 's'} to go.` : 'Stabilise it from the Discoveries journal (Dangers).'}\nClick to open it.`);
    }
  }
  statEls.core?.el.addEventListener('click', () => openJournal('dangers', reactorOf(S())?.chamber ?? null));

  // ---- the inspector: what a chamber holds (its found sites and its danger), with the actions
  function secretsHtml(s, ch, x, y) {
    if (!secOf(s) || !ch) return '';
    const sites = sitesOf(s).filter((k) => k.chamber === ch.id && k.found), d = dangerAt(s, ch.id), dOn = d && dangerFound(s, d);
    if (!sites.length && !dOn) return '';
    const r = readOf(s);
    const rows = sites.map((k) => {
      const here = k.x === x && k.y === y;
      if (k.kind === 'log') { const l = LOG[k.ref] || { title: k.ref }; return `<li class="${here ? 'here' : ''}">${ico('log')}<span class="cl-isl"><b>${esc(l.title)}</b><small>${r.has(k.ref) ? 'read' : '<em class="cl-jnewtag">New</em>'}${l.key ? ` · ◆ fragment ${l.key}` : ''}</small></span><button type="button" class="cl-btn xs" data-a="journal" data-v="logs:${esc(k.ref)}">Read</button></li>`; }
      if (k.kind === 'vault') {
        const v = VAULT[k.ref] || { name: k.ref }, ok = !k.done && vaultNeeds(s, k).every((n) => n.ok);
        return `<li class="${here ? 'here' : ''}">${ico('vault')}<span class="cl-isl"><b>${esc(v.name)}</b><small>${k.done ? 'opened' : ok ? 'ready to open' : 'sealed'}</small></span>${k.done ? '' : ok ? `<button type="button" class="cl-btn xs primary" data-a="vopen" data-v="${esc(k.id)}">Open</button>` : `<button type="button" class="cl-btn xs" data-a="journal" data-v="vaults:${esc(k.id)}">Needs</button>`}</li>`;
      }
      const g = SURV[k.ref] || { name: k.ref };
      return `<li class="${here ? 'here' : ''}">${ico('survivors')}<span class="cl-isl"><b>${esc(g.name)}</b><small>${k.done ? 'joined the colony' : `${num(g.pop || 0)} waiting: open the chamber`}</small></span><button type="button" class="cl-btn xs" data-a="journal" data-v="survivors:${esc(k.id)}">More</button></li>`;
    }).join('');
    let danger = '';
    if (dOn) {
      const info = DANGERS[d.kind] || { name: d.kind }, wl = dangerWork(d), left = d.deadline != null ? Math.max(0, d.deadline - s.day) : null;
      const pv = !d.done && d.kind === 'drones' ? srule('dangerPreview', s, ch.id) : null, w = winPct(pv);
      const what = d.done ? 'dealt with' : wl != null ? `crews at work · ${plural(wl, 'day')}` : d.kind === 'reactor' && left != null ? `${plural(left, 'day')} until it tears loose` : d.kind === 'drones' ? (w != null ? `${w}% to win` : 'guarding the chamber') : d.kind === 'flooded' ? `${marshLeft(s, ch)} tiles flooded` : 'blocks pressurising';
      const act = d.done || wl != null ? '' : d.kind === 'flooded' ? `<button type="button" class="cl-btn xs" data-a="journal" data-v="dangers:${ch.id}">Drain</button>` : `<button type="button" class="cl-btn xs primary" data-a="clear" data-id="${ch.id}">${d.kind === 'drones' ? 'Fight' : d.kind === 'reactor' ? 'Stabilise' : 'Clear'}</button>`;
      danger = `<div class="cl-idanger k-${esc(d.kind)}${d.done ? ' done' : ''}">${ico(d.kind in SICON ? d.kind : 'toxic')}<span class="cl-isl"><b>${esc(info.name)}</b><small>${esc(what)}</small></span>${act}<button type="button" class="cl-btn xs" data-a="journal" data-v="dangers:${ch.id}" title="The Dangers page">›</button></div>`;
    }
    return `<section class="cl-isec cl-isecret"><h4>Discoveries</h4>${danger}${rows ? `<ul class="cl-isites">${rows}</ul>` : ''}</section>`;
  }

  // ---- event windows: what a survey found, the sentries' fight, the old core
  // The 'discovery' event's finds: p.found / p.items / p.sites (site objects, ids or refs), else what
  // is known in its chamber, else today's journal entries.
  function discoveryItems(s, p) {
    const raw = p.found ?? p.items ?? p.sites ?? p.finds ?? null;
    const norm = (x) => {
      if (x == null) return null;
      if (typeof x !== 'object') { const k = sitesOf(s).find((q) => sameRef(q.id, x) || q.ref === x); return k || (DANGERS[x] ? { kind: 'danger', danger: x, chamber: p.chamber } : null); }
      if (x.kind === 'danger' || DANGERS[x.kind]) return { kind: 'danger', danger: x.danger || (DANGERS[x.kind] ? x.kind : x.ref), chamber: x.chamber ?? p.chamber };
      if (x.site != null) return sitesOf(s).find((q) => sameRef(q.id, x.site)) || null;
      return x;
    };
    let list = Array.isArray(raw) ? raw.map(norm).filter(Boolean) : [];
    const cid = p.chamber ?? p.chamberId;
    if (!list.length && cid != null) {
      list = sitesOf(s).filter((k) => k.chamber === cid && k.found);
      const d = dangerAt(s, cid); if (d) list.push({ kind: 'danger', danger: d.kind, chamber: cid });
    }
    if (!list.length) list = (secOf(s)?.journal || []).filter((j) => j.day === s.day).map((j) => norm(j.ref) || (DANGERS[j.kind] ? { kind: 'danger', danger: j.kind, chamber: j.chamber } : null)).filter(Boolean);
    return list;
  }
  // the discovery window's line above its list: the speaker's opening, and where
  function discoveryLead(s, p) {
    const items = discoveryItems(s, p), chs = [...new Set(items.map((k) => k.chamber).filter((c) => c != null))];
    const first = /^[^.]*\./.exec(p.text || '')?.[0] || 'Governor, the surveyors found something.';
    return `${first} ${chs.length === 1 ? `In ${chName(s, chs[0])} (${deckWord(chamberById(s, chs[0]))}):` : `${items.length} finds in ${chs.length} chambers:`}`;
  }
  function discoveryBody(s, p) {
    const ORDER = { danger: 0, log: 1, vault: 2, survivors: 3 };
    const items = discoveryItems(s, p).sort((a, b) => (ORDER[a.kind] ?? 4) - (ORDER[b.kind] ?? 4));
    if (!items.length) return '';
    const r = readOf(s), many = new Set(items.map((k) => k.chamber)).size > 1;
    const at = (k) => (many && k.chamber != null ? `${esc(chName(s, k.chamber))} · ` : '');
    const li = items.map((k) => {
      if (k.kind === 'log') { const l = LOG[k.ref] || { title: k.ref, author: '' }; return `<li>${ico('log')}<span><i>Log</i><b>${esc(l.title)}</b><small>${at(k)}${esc(l.author)}${l.key ? ' · ◆ a fragment of a code' : ''}</small></span><button type="button" class="cl-btn xs${r.has(k.ref) ? '' : ' primary'}" data-evj="logs:${esc(k.ref)}">Read</button></li>`; }
      if (k.kind === 'vault') { const v = VAULT[k.ref] || { name: k.ref }; return `<li>${ico('vault')}<span><i>Vault</i><b>${esc(v.name)}</b><small>${at(k)}sealed</small></span><button type="button" class="cl-btn xs" data-evj="vaults:${esc(k.id ?? k.ref)}">What it needs</button></li>`; }
      if (k.kind === 'survivors') { const g = SURV[k.ref] || { name: k.ref }; return `<li>${ico('survivors')}<span><i>Survivors</i><b>${esc(g.name)}</b><small>${at(k)}${g.pop === 1 ? 'one person' : `${num(g.pop || 0)} people`}, hiding</small></span><button type="button" class="cl-btn xs" data-evj="survivors:${esc(k.id ?? k.ref)}">See</button></li>`; }
      const info = DANGERS[k.danger] || { name: k.danger }, d = dangerAt(s, k.chamber), left = d?.deadline != null ? Math.max(0, d.deadline - s.day) : DANGERS.reactor.deadline;
      return `<li class="bad">${ico(k.danger in SICON ? k.danger : 'toxic')}<span><i>Danger</i><b>${esc(info.name)}</b><small>${at(k)}${esc(k.danger === 'reactor' ? `${left} days to stabilise it` : k.danger === 'drones' ? 'guarding it: blocks pressurising' : 'blocks pressurising')}</small></span><button type="button" class="cl-btn xs" data-evj="dangers:${esc(k.chamber ?? '')}">Deal with it</button></li>`;
    }).join('');
    return `<ul class="cl-evfound">${li}</ul>`;
  }
  function reactorBody(s, p) {
    const d = reactorOf(s) || dangersOf(s).find((x) => x.kind === 'reactor') || null;
    if (!d) return '';
    const left = d.deadline != null ? Math.max(0, d.deadline - s.day) : null, pv = srule('dangerPreview', s, d.chamber), cost = dangerCost(s, d, pv), days = dangerDays(s, d, pv);
    if (d.done && !d.failed) return `<div class="cl-raidfacts"><div class="cl-kv"><span>The old core</span><b class="good">clamped and cold</b></div><div class="cl-kv"><span>The ${esc(deckWord(d))}</span><b class="good">safe</b></div></div>`;
    if (d.failed) {
      const hit = (p.damaged || []).map((id) => BUILDING[s.buildings.find((b) => b.id === id)?.key]?.name).filter(Boolean), shut = (p.resealed || []).map((id) => chName(s, id));
      return `<div class="cl-report lost"><header><b>The core tore loose</b><small>${esc(chName(s, d.chamber))} · ${deckWord(d)}</small></header>
        <div class="cl-kv"><span>Buildings knocked out</span><b class="${hit.length ? 'bad' : 'good'}">${hit.length ? esc(hit.join(', ')) : 'none'}</b></div>
        <div class="cl-kv"><span>Chambers sealed again</span><b class="${shut.length ? 'bad' : 'good'}">${shut.length ? esc(shut.join(', ')) : 'none'}</b></div>
        <div class="cl-kv"><span>The core</span><b>burned out: it will not stir again</b></div></div>`;
    }
    return `<div class="cl-raidfacts">
      <div class="cl-kv"><span>Where</span><b>${esc(chName(s, d.chamber))} · ${deckWord(chamberById(s, d.chamber))}</b></div>
      ${left != null && !d.done ? `<div class="cl-corebar${left <= 10 ? ' crit' : ''}"><i>Until it tears loose</i><span class="cl-wbar"><span ${plainW((left / coreTotal(s, d)) * 100)}></span></span><b>${left} d</b></div>` : ''}
      ${!d.done ? `<div class="cl-kv"><span>Stabilising</span><b>${cost ? esc(costText(cost)) : '?'}${days != null ? ` · ${plural(days, 'day')} of crew work` : ''}</b></div>` : ''}
      ${dangerWork(d) != null ? `<div class="cl-kv"><span>Crews at work</span><b class="good">${plural(dangerWork(d), 'day')} to go</b></div>` : ''}</div>`;
  }
  // The rules' 'dronefight' event: p.report { won, attack, defence, winChance, lostGuardians, salvage }.
  function droneEvBody(s, p) {
    const rep = p.report; if (!rep) return '';
    const kv = (k, v, cls = '') => `<div class="cl-kv"><span>${k}</span><b class="${cls}">${v}</b></div>`, lost = rep.lostGuardians || [], pct = winPct(rep);
    return `<div class="cl-report ${rep.won ? 'won' : 'lost'}"><header><b>${rep.won ? 'Sentries cleared' : 'Driven back'}</b><small>${esc(chName(s, p.chamber))} · ${deckWord(chamberById(s, p.chamber))}</small></header>
      ${kv('Guardians vs sentries', `${num(rep.defence ?? 0)} vs ${num(rep.attack ?? 0)}${pct != null ? ` · ${pct}% to win` : ''}`)}
      ${kv('Machines lost', lost.length ? esc(unitList(lost.map((t) => ({ type: t?.type ?? t })))) : 'none', lost.length ? 'bad' : 'good')}
      ${rep.hurt?.length ? kv('Machines damaged', `${rep.hurt.length} (a Scrapyard mends them)`, 'warn') : ''}
      ${goodsText(rep.salvage) ? kv('Salvage', '+' + esc(goodsText(rep.salvage)), 'good') : ''}
      ${kv('The chamber', rep.won ? 'can be pressurised now' : 'still guarded: it cannot take air', rep.won ? 'good' : 'bad')}</div>`;
  }
  // Survivors coming out of hiding: their commander, if they bring one.
  function survivorsEvBody(s, p) {
    const key = p.commander, C = key && CMDR[key];
    if (!C) return '';
    return `<div class="cl-evwand"><span class="cl-face">${face(key, 'sv')}</span><div><p class="cl-jcmd"><b>${esc(C.name)}</b> <small>${esc(C.title || '')}</small></p>${statBars(C)}${gradesHtml(C)}${traits(C)}
      <p class="cl-dim">Joins Eden's commanders: assign them in Defence › Commanders.</p></div></div>`;
  }
  // The sentries' fight, shown after clearDanger when the rules raised no event of their own.
  let localEv = null;   // { id, cls, html } a window the interface opens itself (no pending event)
  function droneReport(s, cid, r, before) {
    const d = dangerAt(s, cid), won = !!(r.won ?? r.win ?? d?.done);
    const lost = r.lost ?? r.lostGuardians ?? (() => { const now = (s.guardians || []).map((g) => g.type), out = [...before]; for (const t of now) { const i = out.indexOf(t); if (i >= 0) out.splice(i, 1); } return out; })();
    const salvage = r.salvage || r.reward || null;
    const kv = (k, v, cls = '') => `<div class="cl-kv"><span>${k}</span><b class="${cls}">${v}</b></div>`;
    localEv = { id: `drones:${cid}:${s.day}:${Math.random()}`, cls: won ? 'cl-evwon' : 'cl-evraid', html: `<div class="cl-evkind">Sentries · Day ${s.day}</div>
      <div class="cl-evbody">${eventFace('sato')}<div><h2 id="evTitle">${won ? 'The sentries are down' : 'The sentries held'}</h2>
      <p>${esc(r.msg || (won ? `Sato: "${chName(s, cid)} is clear. Forty years on patrol and not one of them thought to retreat. The salvage crews are going in."` : `Sato: "They are better than they look, Governor. We pulled back from ${chName(s, cid)}. We'll need more machines, or better pilots."`))}</p></div></div>
      <div class="cl-report ${won ? 'won' : 'lost'}"><header><b>${won ? 'Sentries cleared' : 'Repulsed'}</b><small>${esc(chName(s, cid))} · ${deckWord(chamberById(s, cid))}</small></header>
        ${kv('Machines lost', Array.isArray(lost) && lost.length ? esc(unitList(lost.map((t) => ({ type: t?.type ?? t })))) : 'none', Array.isArray(lost) && lost.length ? 'bad' : 'good')}
        ${salvage && goodsText(salvage) ? kv('Salvage', '+' + esc(goodsText(salvage)), 'good') : ''}
        ${!won ? kv('The chamber', 'still guarded: it cannot take air', 'bad') : kv('The chamber', 'can be pressurised now', 'good')}</div>
      <div class="cl-evchoices"><button type="button" class="cl-btn primary" data-localok>Understood</button><button type="button" class="cl-btn" data-localok="dangers:${cid}">Dangers</button></div>` };
    evId = null; renderEvent();
  }
  function showLocal() {
    evId = localEv.id;
    modal.classList.remove('soft', 'final');
    evBox.className = 'cl-win cl-event ' + (localEv.cls || '');
    evBox.innerHTML = localEv.html;
    modal.hidden = false;
    evBox.querySelector('[data-localok]')?.focus({ preventScroll: true });
  }

  // ---- the Ninefold vault: the revelation (a dark, quiet window in three pages)
  let fv = null;   // { id, stage, raf }
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function finalPicture() {
    const vid = api.art?.('video/finalvault'), still = api.art?.('scene/finalvault');
    if (vid) return `<video class="cl-fvmedia" src="${esc(vid)}"${still ? ` poster="${esc(still)}"` : ''} autoplay muted playsinline></video>`;
    if (still) return `<img class="cl-fvmedia" src="${esc(still)}" alt="The Ninefold vault, open">`;
    const rings = Array.from({ length: 9 }, (_, i) => `<circle cx="200" cy="250" r="${158 + i * 7}" fill="none" stroke="#9fd0e8" stroke-opacity="${(0.2 - i * 0.018).toFixed(3)}" stroke-dasharray="${2 + i} ${6 + i * 2}"/>`).join('');
    const shelves = [170, 215, 260, 305].map((y) => `<path d="M95 ${y}h210" stroke="#e8b866" stroke-opacity=".28"/>${Array.from({ length: 14 }, (_, i) => `<rect x="${102 + i * 14 + ((y * 7 + i * 13) % 5)}" y="${y - 26 + ((i * 11 + y) % 9)}" width="${6 + ((i + y) % 5)}" height="${26 - ((i * 11 + y) % 9)}" fill="#c9954a" fill-opacity="${(0.12 + ((i * 7 + y) % 10) / 60).toFixed(2)}"/>`).join('')}`).join('');
    const motes = Array.from({ length: 26 }, (_, i) => `<circle cx="${110 + ((i * 73) % 190)}" cy="${120 + ((i * 131) % 270)}" r="${(0.6 + (i % 3) * 0.5).toFixed(1)}" fill="#ffe7b0" fill-opacity="${(0.15 + (i % 5) * 0.08).toFixed(2)}"><animate attributeName="cy" values="${120 + ((i * 131) % 270)};${110 + ((i * 131) % 270)};${120 + ((i * 131) % 270)}" dur="${9 + (i % 7)}s" repeatCount="indefinite"/></circle>`).join('');
    return `<svg class="cl-fvmedia" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="The Ninefold vault door, standing open on the registry">
      <defs><radialGradient id="fvglow" cx="50%" cy="56%" r="52%"><stop offset="0" stop-color="#ffd98a" stop-opacity=".5"/><stop offset=".4" stop-color="#b8692a" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <linearGradient id="fvwall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#04050b"/><stop offset="1" stop-color="#0b0c16"/></linearGradient>
      <linearGradient id="fvdoor" x1="0" x2="1"><stop offset="0" stop-color="#1b1e2b"/><stop offset="1" stop-color="#0c0e16"/></linearGradient>
      <clipPath id="fvhole"><circle cx="200" cy="250" r="150"/></clipPath></defs>
      <rect width="400" height="500" fill="url(#fvwall)"/>
      <circle cx="200" cy="250" r="150" fill="#0a0705"/>
      <g clip-path="url(#fvhole)">${shelves}<rect x="176" y="336" width="48" height="6" fill="#e8b866" fill-opacity=".5"/><path d="M180 336l20-14 20 14z" fill="#f3d39a" fill-opacity=".55"/><circle cx="200" cy="250" r="150" fill="url(#fvglow)"/>${motes}</g>
      ${rings}
      <circle cx="200" cy="250" r="152" fill="none" stroke="#3a3f55" stroke-width="5"/>
      <g transform="translate(64 250)"><ellipse rx="40" ry="152" fill="url(#fvdoor)" stroke="#4a5068" stroke-width="2"/><ellipse rx="26" ry="100" fill="none" stroke="#4a5068" stroke-opacity=".7"/><ellipse rx="12" ry="46" fill="none" stroke="#6fd3ff" stroke-opacity=".25"/>${[-110, -60, 0, 60, 110].map((y) => `<rect x="30" y="${y - 5}" width="22" height="10" fill="#2a2e40" stroke="#4a5068"/>`).join('')}</g>
      <path d="M0 470 Q200 440 400 470 V500 H0z" fill="#020308"/>
    </svg>`;
  }
  // Version 4, stage 4: the ending, Eden Restored (shown once; the colony carries on after it, D25).
  // The clip (art slot video/ending) opens it; the page beside the words shows its still (scene/ending), else the title art.
  function victoryPicture(ark = false) {
    const still = (ark === 'garden' ? api.art?.('scene/garden') : ark ? api.art?.('scene/ark') : null) || api.art?.('scene/ending') || api.art?.('title/rebuild');
    return still ? `<img class="cl-fvmedia" src="${esc(still)}" alt="${ark === 'garden' ? 'Eden green from end to end, a garden in the sky' : ark ? 'The Ark leaving Eden for the stars' : 'Eden, restored, above the Earth'}">` : '';
  }
  // Stage 0, when there is a clip: the cinematic, full width (the clip plays, the title fades in;
  // Continue or Skip, and it moves on by itself when the clip ends). Stage 1: the words and the numbers.
  let vStage = { id: null, stage: 0 };
  function renderVictory(s, p, stage) {
    const ark = p.kind === 'ark' || p.kind === 'garden';   // version 9: the second ending, Beyond Eden, in the same style (no clip for now)
    const garden = p.kind === 'garden';   // version 10: the third, the Garden of Eden
    if (vStage.id !== p.id) vStage = { id: p.id, stage: !ark && api.art?.('video/ending') && !reduceMotion() ? 0 : 1 };
    if (stage != null) vStage.stage = stage;
    evId = p.id;
    modal.classList.remove('soft'); modal.classList.add('final');
    if (vStage.stage === 0) {
      const vid = api.art('video/ending'), still = api.art?.('scene/ending');
      evBox.className = 'cl-win cl-event cl-evfinal cl-evvictory cine';
      evBox.innerHTML = `<video class="cl-vcine" src="${esc(vid)}"${still ? ` poster="${esc(still)}"` : ''} autoplay muted playsinline></video>
        <div class="cl-vcap"><div class="cl-evkind">${esc(KIND_LABEL.victory)} · Day ${s.day}</div><h2 id="evTitle">${esc(p.title || 'Eden Restored')}</h2></div>
        <div class="cl-evchoices cl-vnav"><button type="button" class="cl-btn primary" data-vnext>Continue ›</button></div>`;
      modal.hidden = false;
      const v = evBox.querySelector('video');
      v?.addEventListener('ended', () => { if (vStage.id === p.id && vStage.stage === 0 && S().pending?.[0]?.id === p.id) renderVictory(S(), p, 1); });
      v?.addEventListener('error', () => { if (vStage.id === p.id && vStage.stage === 0) renderVictory(S(), p, 1); });
      evBox.querySelector('[data-vnext]')?.focus({ preventScroll: true });
      return;
    }
    evBox.className = 'cl-win cl-event cl-evfinal cl-evvictory';
    const v = (garden ? s.gardens?.eden : ark ? s.ark : s.victory) || {}, choice = p.choices?.[0] || { key: 'keep', label: 'Keep building Eden' };
    const stats = garden ? [['Day', v.day], ['Colonists', v.pop], ['Greenery', v.greenery], ['Happiness', v.happy], ['Wildlife returned', v.wildlife], ['Parks and gardens', v.parks], ['Eden Restored on day', v.restored]] : ark ? [['Day', v.day], ['Colonists', v.pop], ['Wonders', v.wonders], ['Landmarks', v.landmarks], ['Buildings', v.buildings], ['Visitors a day', v.visitors], ['Eden Restored on day', v.restored]]
      : [['Day', v.day], ['Colonists', v.pop], ['Chambers open', v.chambers], ...(v.happy != null ? [['Happiness', v.happy]] : []), ['Relief loads', v.convoys], ['Buildings', v.buildings], ['Raids beaten', v.raids], ['Pirate dens cleared', v.dens], ['Logs read', v.logs]];
    evBox.innerHTML = `<div class="cl-fvpic">${victoryPicture(garden ? 'garden' : ark)}</div>
      <div class="cl-fvmain">
        <div class="cl-evkind">${esc(KIND_LABEL[p.kind] || KIND_LABEL.victory)} · Day ${s.day}</div>
        <div class="cl-fvpage"><h2 id="evTitle">${esc(p.title || 'Eden Restored')}</h2><p class="cl-vlead">${esc(p.text)}</p>
          <dl class="cl-vstats">${stats.filter(([, n]) => n != null).map(([k, n]) => `<div><dt>${k}</dt><dd>${num(n)}</dd></div>`).join('')}</dl>
          <div class="cl-fvclose">${((garden ? R.GARDEN_ENDING : ark ? R.ARK_ENDING : R.ENDING) || []).map(([k, who, line], i) => `<figure style="--i:${i}">${eventFace(k) || `<span class="cl-portrait cl-fvinit">${esc(who.split(' ').pop()[0])}</span>`}<blockquote><p>“${esc(line)}”</p><figcaption>${esc(who)}</figcaption></blockquote></figure>`).join('')}</div>
          ${!ark && v.finalVault && R.EPILOGUE ? `<p class="cl-fvreward"><i>Epilogue</i> ${esc(R.EPILOGUE)}</p>` : ''}
          <p class="cl-dim">${garden ? 'The Garden of Eden is kept in your save. Eden carries on: keep building.' : ark ? 'The Ark\'s voyage is kept in your save. Eden carries on: keep building.' : 'Your colony is saved, victory and all. Keep building: Eden is yours.'}</p></div>
        <div class="cl-evchoices"><button type="button" class="cl-btn primary" data-choice="${esc(choice.key)}">${esc(choice.label)}</button></div>
      </div>`;
    modal.hidden = false;
    evBox.querySelector('[data-choice]')?.focus({ preventScroll: true });
  }
  function renderFinal(s, p, stage) {
    if (!fv || fv.id !== p.id) fv = { id: p.id, stage: 0, raf: 0 };
    if (stage != null) fv.stage = stage;
    cancelAnimationFrame(fv.raf);
    evId = p.id;
    modal.classList.remove('soft'); modal.classList.add('final');
    evBox.className = 'cl-win cl-event cl-evfinal';
    const marrow = p.marrow ?? ((s.commanders || []).some((c) => c.key === 'marrow') || !!siteFor(s, 'survivors', 's_crypt')?.done);
    const inside = /Inside: ([^]*?)\.(?: The test logs|$)/.exec(p.text || '')?.[1];
    const choice = p.choices?.[0] || { key: 'ok', label: 'Close the vault' };
    const pages = [
      `<h2 id="evTitle">${esc(p.title && !/^the ninefold vault$/i.test(p.title) ? p.title : 'What happened to Eden')}</h2>
       <div class="cl-fvtext">${FINAL_TRUTH.map((t, i) => `<p style="--i:${i}">${esc(t)}</p>`).join('')}</div>`,
      `<h2 id="evTitle">The registry of Eden</h2>
       <div class="cl-fvspeak">${eventFace(marrow ? 'marrow' : 'ruess') || `<span class="cl-portrait cl-fvinit">${marrow ? 'IM' : 'HR'}</span>`}<p>${marrow ? '<b>Warden Marrow</b> takes the book down as if she had shelved it yesterday. “I said they would be read out. All of them.”' : 'The registry is in <b>Warden Marrow\'s</b> hand. <b>Ruess</b> reads it aloud, as her last log asked.'}</p></div>
       <div class="cl-reg" data-reg tabindex="0" aria-label="The registry of Eden"><ol>${REGISTRY.map((n) => `<li${n.mark ? ' class="stayed"' : ''}><b>${esc(n.name)}</b><small>${n.age} · ${esc(n.home)}${n.mark ? ' · stayed' : ''}</small></li>`).join('')}</ol>
       <p class="cl-regmore">… and eleven thousand more. ${marrow ? 'She reads until the lamps dim, and nobody asks her to stop.' : 'He reads until the lamps dim, and nobody asks him to stop.'}</p></div>`,
      `<h2 id="evTitle">After the names</h2>
       <div class="cl-fvclose">${FINAL_CLOSE.map(([k, who, line], i) => `<figure style="--i:${i}">${eventFace(k)}<blockquote><p>“${esc(line)}”</p><figcaption>${esc(who)}</figcaption></blockquote></figure>`).join('')}</div>
       ${inside ? `<p class="cl-fvreward"><i>Also in the vault</i> ${esc(inside)}.</p>` : ''}`,
    ];
    const st = Math.max(0, Math.min(2, fv.stage));
    evBox.innerHTML = `<div class="cl-fvpic">${finalPicture()}</div>
      <div class="cl-fvmain">
        <div class="cl-evkind">${esc(KIND_LABEL.finalvault)} · Day ${s.day}<span class="cl-fvdots">${[0, 1, 2].map((i) => `<i class="${i === st ? 'on' : i < st ? 'past' : ''}"></i>`).join('')}</span></div>
        <div class="cl-fvpage" data-stage="${st}">${pages[st]}</div>
        <div class="cl-evchoices">${st < 2 ? `<button type="button" class="cl-btn primary" data-fvnext>${st === 0 ? 'Open the registry ›' : 'Continue ›'}</button><button type="button" class="cl-btn ghost" data-fvskip>Skip to the end</button>`
          : `<button type="button" class="cl-btn primary" data-choice="${esc(choice.key)}">${esc(choice.label && choice.label !== 'Continue' ? choice.label : 'Close the vault')}</button>`}</div>
      </div>`;
    modal.hidden = false;
    evBox.querySelector('[data-fvnext],[data-choice]')?.focus({ preventScroll: true });
    if (st === 1) crawl();
  }
  // Marrow reads: the registry scrolls by itself, slowly; a hand on it (pointer, wheel, keys) stops it.
  function crawl() {
    const el = evBox.querySelector('[data-reg]'); if (!el || reduceMotion()) return;
    let held = false, last = 0, pos = el.scrollTop, until = 0;
    const hold = () => { held = true; until = performance.now() + 4000; };
    for (const ev of ['wheel', 'touchstart', 'pointerdown', 'keydown']) el.addEventListener(ev, hold, { passive: true });
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') held = true; });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { held = false; until = 0; } });
    const step = (t) => {
      if (!fv || !el.isConnected) return;
      if (held && until && t > until) { held = false; until = 0; }
      if (held) pos = el.scrollTop;
      else if (last) { pos += (t - last) * 0.022; el.scrollTop = pos; }
      last = t;
      if (el.scrollTop + el.clientHeight < el.scrollHeight - 1) fv.raf = requestAnimationFrame(step);
    };
    fv.raf = requestAnimationFrame((t) => { last = t; fv.raf = requestAnimationFrame(step); });
  }

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
    if (k && CMDR[k]) return k;
    const all = Object.values(COMMANDER).filter((c) => c.key?.startsWith('w_'));
    return all.find((c) => `${p.title} ${p.text}`.includes(c.name))?.key || null;
  }
  function raidBody(s, p) {
    const c = s.raid?.coming || p.raid || {}, pv = rule('raidPreview', s) || p.preview || null;
    const n = c.units?.length ?? 0;
    return `<div class="cl-raidfacts">
        <div class="cl-kv"><span>From</span><b>${esc(fromText(c.from))}</b></div>
        <div class="cl-kv"><span>Who</span><b title="${esc(factionText(c.faction))}">${esc(factionName(c.faction))}${tierName(c.tier) ? ` <small>(${esc(tierName(c.tier))})</small>` : ''}</b></div>
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
    const C = CMDR[key]; if (!C) return '';
    return `<div class="cl-evwand"><span class="cl-face">${face(key, 'ev')}</span><div>${statBars(C)}${gradesHtml(C)}${traits(C)}${C.flaw ? `<p class="cl-cflaw">⚠ ${esc(C.flaw)}</p>` : ''}
      <p class="cl-dim">Wage ${C.wage} credits a day · invite chance about ${Math.round(inviteChance(s, { key, loyalty: (s.wanderers || []).find((w) => w.key === key)?.loyalty }) * 100)}%.</p></div></div>`;
  }
  // The raid's one-line summary for the modal (the full numbers are laid out below it).
  function raidLine(s, p) {
    const c = s.raid?.coming || p.raid || {};
    return `Sato: "${factionName(c.faction)}${factionText(c.faction) ? `, ${factionText(c.faction)},` : ''} at ${fromText(c.from)}. The guard is standing to. Fight them, or pay them to go, Governor?"`;
  }
  function choiceLabel(s, p, c) {
    if (p.kind !== 'raid') return esc(c.label);
    const pv = rule('raidPreview', s) || p.preview;
    if (c.key === 'fight') { const w = +pv?.winChance; return `${esc(c.label || 'Fight')}${Number.isFinite(w) ? ` <small>${Math.round(w <= 1 ? w * 100 : w)}% to win</small>` : ''}`; }
    if (c.key === 'tribute') { if (/\d/.test(c.label || '')) return esc(c.label); const t = pv?.tribute; const txt = t ? [t.credits ? `${num(t.credits)} cr` : '', t.food ? `${num(t.food)} food` : ''].filter(Boolean).join(' + ') : ''; return `${esc(c.label || 'Pay tribute')}${txt ? ` <small>${txt}</small>` : ''}`; }
    return esc(c.label);
  }
  function renderEvent() {
    const s = S(), p = s.pending?.[0];
    if (!p) {
      if (localEv) { if (evId !== localEv.id || modal.hidden) showLocal(); return; }
      const rs = reportSig(s);
      if (rs && rs !== repSeen) { if (evId !== 'report:' + rs || modal.hidden) showReport(s, rs); return; }
      if (!modal.hidden) { modal.hidden = true; evId = null; modal.classList.remove('final'); }
      return;
    }
    if (evId === p.id && !modal.hidden) return;
    if (p.kind === 'finalvault') { renderFinal(s, p); return; }
    if (p.kind === 'victory' || p.kind === 'ark' || p.kind === 'garden') { renderVictory(s, p); return; }   // version 9: the Ark's ending, Beyond Eden; version 10: the Garden of Eden
    modal.classList.remove('final');
    evId = p.id;
    if (/report|result/.test(p.kind || '')) repSeen = reportSig(s);   // the sim's own report: no second one
    const raid = p.kind === 'raid', warn = p.kind === 'raidwarn', wkey = p.kind === 'wanderer' ? wandererOf(p) : null;
    // version 4, stage 2: what a survey found, the old core (its warning and what it did), the sentries
    const disc = p.kind === 'discovery', core = /reactor|core/.test(p.kind || ''), drone = /drone|sentr/.test(p.kind || '');
    const coreBad = core && /fail|blast|tore|damage|loose/i.test(`${p.kind} ${p.title}`), coreSafe = core && !coreBad && /safe|stable|clamp/i.test(p.title || '');
    const droneWon = drone && !!(p.report?.won ?? /clear|won/i.test(p.title || ''));
    const pic = eventFace(p.speaker);
    modal.classList.toggle('soft', !api.settings.pauseOnEvents && !raid && !core);
    const expd = p.kind === 'expedition' && p.report;
    const tone = p.tone ? (p.tone === 'good' ? ' cl-evwon' : p.tone === 'bad' ? ' cl-evraid' : ' cl-evwarn') : p.kind === 'landmark' || p.kind === 'wonder' ? ' cl-evwon' : '';   // version 8 (version 9: wonders)
    evBox.className = 'cl-win cl-event' + (tone ? tone : expd ? (p.report.recalled ? ' cl-evwarn' : p.report.won ? ' cl-evwon' : ' cl-evraid') : raid || coreBad ? ' cl-evraid' : coreSafe ? ' cl-evwon' : warn || core ? ' cl-evwarn' : disc || p.kind === 'survivors' ? ' cl-evdisc' : drone ? (droneWon ? ' cl-evwon' : ' cl-evraid') : '');
    const jtab = disc ? 'logs' : (core && !coreSafe) || drone ? 'dangers' : p.kind === 'survivors' ? 'survivors' : null;
    const choices = p.choices?.length ? p.choices : [{ key: 'ok', label: 'Understood' }];
    const tab = warn ? 'raids' : wkey ? 'commanders' : p.kind === 'neighbour' ? 'neighbours' : null;
    evBox.innerHTML = `<div class="cl-evkind">${esc(KIND_LABEL[p.kind] || p.kind || 'Event')} · Day ${s.day}${s.pending.length > 1 ? ` · ${s.pending.length - 1} more waiting` : ''}</div>
      <div class="cl-evbody">${pic}
      <div><h2 id="evTitle">${esc(p.title)}</h2>${raid && (rule('raidPreview', s) || p.preview) ? `<p>${esc(raidLine(s, p))}</p>` : `<p>${esc(disc && discoveryItems(s, p).length ? discoveryLead(s, p) : p.text)}</p>`}</div></div>
      ${p.kind === 'landmark' || p.kind === 'wonder' || p.kind === 'wildlife' ? landmarkBody(s, p) : ''}
      ${raid ? raidBody(s, p) : warn ? warnBody(s) : disc ? discoveryBody(s, p) : core ? reactorBody(s, p) : drone ? droneEvBody(s, p) : p.kind === 'survivors' ? survivorsEvBody(s, p) : /report|result/.test(p.kind || '') && s.raid?.last ? reportHtml(s, s.raid.last) : wkey ? wandererBody(s, wkey) : ''}
      <div class="cl-evchoices">${choices.map((c, i) => { const cant = raid && c.key === 'tribute' && (rule('raidPreview', s) || p.preview)?.canPay === false;
        return `<button type="button" class="cl-btn${i === 0 ? ' primary' : ''}${raid && c.key === 'fight' ? ' fight' : ''}" data-choice="${esc(c.key)}" ${cant ? 'disabled title="Eden cannot pay what they ask"' : ''}>${choiceLabel(s, p, c)}</button>${raid && c.key === 'fight' ? commandButton() : ''}`; }).join('')}
        ${p.show && choices.length === 1 ? `<button type="button" class="cl-btn" data-evshow title="Answer and show me">${p.kind === 'landmark' || p.kind === 'wonder' || p.kind === 'petition' || p.kind === 'wildlife' ? 'Show me' : 'Show me what helps'}</button>` : ''}
        ${tab && choices.length === 1 ? `<button type="button" class="cl-btn" data-evdef="${tab}" title="Answer and open the Defence panel">${tab === 'raids' ? 'Check the defences' : tab === 'neighbours' ? 'Neighbours' : 'Meet them'}</button>` : ''}
        ${(() => { const d = core && !coreBad && !coreSafe ? reactorOf(s) : null, pv = d && dangerWork(d) == null ? srule('dangerPreview', s, d.chamber) : null;
          return pv ? `<button type="button" class="cl-btn" data-evclear="${d.chamber}" ${pv.why ? `disabled title="${esc(pv.why)}"` : 'title="Answer, and set the crews to work on it now"'}>Stabilise now${pv.cost ? ` <small>${esc(costText(pv.cost))}</small>` : ''}</button>` : ''; })()}
        ${jtab && choices.length === 1 ? `<button type="button" class="cl-btn" data-evj="${jtab}${(core || drone) && p.chamber != null ? `:${p.chamber}` : p.kind === 'survivors' && p.group ? `:${p.group}` : ''}" title="Answer and open the Discoveries journal (J)">${disc ? 'Open the journal' : p.kind === 'survivors' ? 'Survivors' : 'Dangers'}</button>` : ''}</div>
      ${api.settings.pauseOnEvents || raid ? '<p class="cl-dim cl-evpause">❚❚ The clock waits for your answer.</p>' : ''}`;
    modal.hidden = false;
    evBox.querySelector('[data-choice]')?.focus({ preventScroll: true });
    if (raid) checkCommand();
  }
  // version 8: a landmark's moment: the speaker's line, and the Hall of Names' registry once the Ninefold vault is open
  function landmarkBody(s, p) {
    const who = SPEAKER[p.speaker] || '';
    const quote = p.quote ? `<blockquote class="cl-lmquote" style="margin:10px 0 4px;padding:8px 14px;border-left:3px solid #ffd98a;background:rgba(255,217,138,.06)"><p style="margin:0">“${esc(p.quote)}”</p>${who ? `<small class="cl-dim">${esc(who)}</small>` : ''}</blockquote>` : '';
    const reg = p.registry ? `<div class="cl-reg" tabindex="0" aria-label="The registry of Eden" style="max-height:220px;padding:10px 0"><ol>${REGISTRY.map((n) => `<li${n.mark ? ' class="stayed"' : ''}><b>${esc(n.name)}</b><small>${n.age} · ${esc(n.home)}${n.mark ? ' · stayed' : ''}</small></li>`).join('')}</ol></div>` : '';
    return quote + reg;
  }
  // "Command the battle": between Fight and Pay tribute; disabled (with why) without the pack.
  const COMMAND_WHY = { null: 'Checking for the Earth Light pack…', false: 'Needs the Earth Light pack: set up Earth Light music in Settings once (from your own ROM).' };
  function commandButton() {
    return `<button type="button" class="cl-btn" data-command ${packReady ? 'title="Fight them yourself, turn by turn, on the Earth Light hex map"' : `disabled title="${esc(COMMAND_WHY[packReady])}"`}>Command the battle</button>`;
  }
  function checkCommand() {
    const ask = battleMod?.canCommand ? battleMod.canCommand() : import('./battle.js').then((m) => { battleMod = m; return m.canCommand(); });
    ask.catch(() => false).then((ok) => {
      packReady = !!ok;
      const b = evBox.querySelector('[data-command]');
      if (b) { b.disabled = !ok; b.title = ok ? 'Fight them yourself, turn by turn, on the Earth Light hex map' : COMMAND_WHY.false; }
    });
  }
  function showReport(s, rs) {
    evId = 'report:' + rs;
    modal.classList.remove('soft');
    const won = !!s.raid.last.won, paid = !won && !!s.raid.last.tribute;
    evBox.className = 'cl-win cl-event ' + (won ? 'cl-evwon' : paid ? 'cl-evwarn' : 'cl-evraid');
    evBox.innerHTML = `<div class="cl-evkind">${KIND_LABEL.report} · Day ${s.raid.last.day}</div>
      <div class="cl-evbody">${eventFace('sato')}<div><h2 id="evTitle">${won ? 'Eden holds' : s.raid.last.tribute && !won ? 'They took the tribute' : 'The raiders got through'}</h2>
      <p>${esc(won ? 'The raiders broke off. The salvage crews are already out.' : s.raid.last.tribute ? 'They took what we paid and left. Word will get around that Eden pays.' : 'We could not stop them. Repair crews are on the damage.')}</p></div></div>
      ${reportHtml(s, s.raid.last)}
      <div class="cl-evchoices"><button type="button" class="cl-btn primary" data-repok>Understood</button><button type="button" class="cl-btn" data-repok="raids">Raids panel</button></div>`;
    modal.hidden = false;
    evBox.querySelector('[data-repok]')?.focus({ preventScroll: true });
  }
  evBox.addEventListener('click', (e) => {
    // version 4, stage 2: the windows the interface opens itself (the sentries' fight) and the Ninefold vault's pages
    const lok = e.target.closest('[data-localok]');
    if (lok) { localEv = null; evId = null; modal.hidden = true; const [tab, ref] = (lok.dataset.localok || '').split(':'); if (tab) openJournal(tab, ref || null); renderEvent(); return; }
    if (e.target.closest('[data-vnext]')) { const p = S().pending?.[0]; if (p?.kind === 'victory') renderVictory(S(), p, 1); return; }
    if (e.target.closest('[data-fvnext],[data-fvskip]')) {
      const p = S().pending?.[0]; if (!p || p.kind !== 'finalvault') return;
      renderFinal(S(), p, e.target.closest('[data-fvskip]') ? 2 : (fv?.stage || 0) + 1);
      return;
    }
    const ec = e.target.closest('[data-evclear]');
    if (ec && !ec.disabled) {
      const p = S().pending?.[0];
      if (p) { evId = null; modal.hidden = true; const key = p.choices?.[0]?.key || 'ok', r = result(R.answer(S(), p.id, key)); if (r?.ok !== false) api.answered?.(p, key); }
      clearDanger(+ec.dataset.evclear);
      return;
    }
    if (e.target.closest('[data-evshow]')) {   // version 8: a landmark or an incident's Show me
      const p = S().pending?.[0];
      if (p) { evId = null; modal.hidden = true; const key = p.choices?.[0]?.key || 'ok', r = result(R.answer(S(), p.id, key)); if (r?.ok !== false) api.answered?.(p, key); if (p.show) api.show?.(p.show); }
      renderEvent();
      return;
    }
    const ej = e.target.closest('[data-evj]');
    if (ej) {
      const [tab, ...ref] = ej.dataset.evj.split(':');
      const p = S().pending?.[0];
      if (p) {
        evId = null; modal.hidden = true;
        const key = p.choices?.[0]?.key || 'ok', r = result(R.answer(S(), p.id, key));
        if (r?.ok !== false) api.answered?.(p, key);
      }
      openJournal(tab, ref.length && ref.join(':') !== '' ? ref.join(':') : null);
      return;
    }
    const ok = e.target.closest('[data-repok]');
    if (ok) { repSeen = reportSig(S()); evId = null; modal.hidden = true; if (ok.dataset.repok) openDefence(ok.dataset.repok); renderEvent(); return; }
    const cmd = e.target.closest('[data-command]');
    if (cmd) {   // Command the battle: off to game.html?colony=1 (js/colony/battle.js); the raid stays pending until its result comes back
      if (cmd.disabled || !battleMod) return;
      const r = battleMod.commandBattle(S(), () => api.save());
      if (r?.ok === false) toast(r.msg, 'bad');
      return;
    }
    const b = e.target.closest('[data-choice],[data-evdef]'); if (!b) return;
    const p = S().pending?.[0]; if (!p) return;
    const key = b.dataset.choice ?? (p.choices?.[0]?.key || 'ok');
    evId = null; modal.hidden = true;
    if (p.kind === 'finalvault' || p.kind === 'victory' || p.kind === 'ark') { if (fv) cancelAnimationFrame(fv.raf); fv = null; modal.classList.remove('final'); }
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
  const showLabel = (sh) => !sh ? '' : sh.build && sh.deck && sh.deck !== D() ? `Show me: ${BUILDING[sh.build]?.name || sh.build} (${DECK_NAME[sh.deck]?.toLowerCase() || sh.deck} deck)` : sh.build ? `Show me: ${BUILDING[sh.build]?.name || sh.build}` : sh.market ? 'Show me: the Market' : sh.roads ? 'Show me: Roads' : sh.research ? `Show me: ${typeof sh.research === 'string' && TECH[sh.research] ? TECH[sh.research].name : 'Research'}` : sh.journal ? `Show me: ${J_TABS.find(([k]) => k === sh.journal)?.[1] || 'Discoveries'} (journal)` : sh.chamber != null ? 'Show me the chamber' : sh.tile ? 'Show me where' : 'Show me';

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
    if (force) { deckSig = ''; cardSig = ''; inspSig = ''; marketSig = ''; happySig = ''; logSig = ''; goalSig = ''; resSig = ''; jSig = ''; xSig = ''; liveSigs.delete(defBody); liveSigs.delete(defStats); liveSigs.delete(jBody); }
    hud(); moreFlag();
    renderDecks();
    renderGoals();
    renderAdvice(force || dirty);
    dirty = false;
    buildMenu();
    renderRci();
    refreshInspector();
    renderHappy();
    renderMarket();
    renderResearch();
    renderDefence();
    renderJournal();
    renderChart();
    renderLog();
    renderEvent();
  }

  return {
    update, inspect, closeInspector, toast, tip, setPlacing, setSpeed, closePops, openBuild, welcomeDone, openResearch, toggleResearch,
    openDefence, toggleDefence, closeDefence,
    openJournal, toggleJournal, closeJournal,
    openChart, toggleChart, closeChart, chartOpen: () => !xEl.hidden,
    journalOpen: () => !jEl.hidden,
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
