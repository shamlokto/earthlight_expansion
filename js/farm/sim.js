// Earthlight: Sato's Harvest. The rules of the farming game (docs/FARM.md §2 and §3.1, with the
// owner's later change: the Wreck is now the ruins on Earth's surface, and fishing is a pillar).
// Pure: no DOM, only ./data.js. The state is plain JSON; randomness is a mulberry32 counter kept in
// state.rng, so the same seed and the same actions give the same game.
//
// Where the contract was open, the simplest reading was taken:
//  * Tool areas: level 2 is three tiles in a line for every tool; the 3×3 block of level 3 is for
//    the hoe, can and sickle only (hammer and axe keep the line at level 3).
//  * tile.hp is the number of hits left (rock, weed, branch 1; stump, boulder 3). A hit that does
//    not yet break a stump or boulder still counts as a change (it costs stamina).
//  * The sickle never cuts a living crop. The hammer breaks farm rocks for nothing.
//  * A cow must have been fed today to be milked. milk() and brush() need the milker or brush in
//    the rucksack, not selected. fish() needs the rod selected. hitRock() (search rubble) needs no tool.
//  * refillCan() needs the can in the rucksack; it fails politely when the can is already full.
//  * Stacks hold 99. Lumber, feed and fodder live in state.stock: addItem() sends them there.
//  * Only things with a sale price can be shipped (not tools, seeds or meals).
//  * stageOf(tile) is cropStage(tile.crop), or -1 for a tile with no crop.
//  * Pasture grass: stage 1 when sown, 2 after 4 nights, ripe (3) after 9; state.pasture.age counts.
//  * Once bought, the rod, milker and brush leave the shop lists. A shop key that is not on today's
//    list is refused. Shop hours and keepers are the UI's business.
//  * talk(), gift() and addLove() accept any plain npc id and make its record on first use.
//  * Stamina at 0: the action still happens and the result carries fainted: true.
//  * Ruins: cells (7,11) (the lift) is always open; walls never cut an open cell off from it.
//    Finds that do not fit in a full rucksack are left behind (the result says so).
import { SEASONS, WEEKDAYS, DAYS_PER_SEASON, DAY_START, DAY_END, ITEMS, CROPS, TOOL_LEVELS, FIELD_SIZES, PASTURE_SIZE, RELICS, FESTIVAL_DAYS, FRUIT_TREES, TREE_DAYS, WILD_TREES, SATO_BIRTHDAY, ROBOT_NAMES, ROBOT_JOBS, ROBOT_MOODS } from './data.js';

export const NPC_IDS = ['general', 'ruess', 'marrow', 'seln', 'corran', 'oduya', 'maris', 'vashti', 'moraine', 'kestrel', 'mori', 'yui', 'calloway', 'fenn'];
export const CAN_CAPACITY = [0, 20, 40, 80];
export const STORAGE_SIZE = 40, FRIDGE_SIZE = 30;
// What goes in the fridge: anything you can eat or cook with.
const FRIDGE_KINDS = new Set(['crop', 'animal', 'fish', 'forage', 'food', 'fruit']);
// The basket takes farm produce: crops, forage, fruit, eggs and milk.
const PRODUCE = new Set(['crop', 'forage', 'fruit', 'animal']);
export const BASKET_CAP = 30, CHEST_SIZE = 20, MAX_ROBOTS = 7, FORAGE_SPOT_COUNT = 14, ONSEN_PRICE = 100;
export const MAX_STAMINA_CAP = 200, STAR_SPOT = 99, COLLECTOR_KINDS = 75, HYDRO_TOWERS = 8, HYDRO_MAX = 4, YARD_SLOTS = 6, YARD_PRICE = 30, MILL_DAY = 20, YARD_SLOTS_BIG = 10, MILL_DAY_FAST = 40, DRILL_BONUS = 0.3;
// The ten one-time star-plum sources (flags plum_<id>).
export const STAR_PLUM_SOURCES = ['hill', 'ruins10', 'ruins20', 'harvest', 'lantern', 'seln7', 'marrow7', 'moraine', 'mori', 'collector'];
export const RUCKSACK_TIERS = [[15, 1500], [20, 4000], [25, 8000], [30, 15000]];
const FRUITS = ['cherry', 'peach', 'apple', 'persimmon', 'wild_apple', 'wild_grape', 'berry', 'plum', 'loquat', 'mulberry', 'yuzu'];
const MUSHROOMS = ['mushroom', 'frostcap'];
const VEG = ['turnip', 'potato', 'cucumber', 'tomato', 'corn', 'onion', 'pumpkin', 'carrot', 'eggplant', 'sweetpotato', 'spinach'];
const FISH_IDS = ['fish_s', 'fish_m', 'fish_l', 'fish_spring', 'fish_summer', 'fish_autumn', 'fish_winter'];
const MILK = ['milk_s', 'milk_m', 'milk_l'];
// Each recipe: a list of ingredient slots; each slot is satisfied by any one of its ids. Different slots
// of the same group must use different items (a salad is two DIFFERENT vegetables).
export const RECIPES = [
  { id: 'omelette', name: 'Omelette', needs: [['egg'], MILK] },
  { id: 'salad', name: 'Garden salad', needs: [VEG, VEG] },
  { id: 'veg_soup', name: 'Vegetable soup', needs: [VEG, VEG, VEG] },
  { id: 'fish_grill', name: 'Grilled fish', needs: [FISH_IDS] },
  { id: 'berry_jam', name: 'Berry jam', needs: [['berry'], ['berry'], ['berry']], same: true },
  { id: 'cooked_meal', name: 'Colony bento', needs: [FISH_IDS, ['egg'], VEG] },
  // 2026-11-18: mountain food and fruit
  { id: 'mint_tea', name: 'Mint tea', needs: [['wild_mint'], ['herb']] },
  { id: 'grape_juice', name: 'Grape juice', needs: [['wild_grape'], ['wild_grape'], ['wild_grape']], same: true },
  { id: 'bamboo_stirfry', name: 'Bamboo stir-fry', needs: [['bamboo_shoot'], ['onion', 'carrot', 'spinach', 'turnip', 'cucumber']] },
  { id: 'honey_toast', name: 'Honey toast', needs: [['honeycomb'], ['bread']] },
  { id: 'fiddlehead_tempura', name: 'Fiddlehead tempura', needs: [['fiddlehead'], ['egg']] },
  { id: 'fruit_tart', name: 'Fruit tart', needs: [FRUITS, ['egg'], ['bread']] },
  { id: 'fruit_salad', name: 'Fruit salad', needs: [FRUITS, FRUITS] },
  { id: 'persimmon_jam', name: 'Persimmon jam', needs: [['persimmon'], ['persimmon']], same: true },
  { id: 'chestnut_roast', name: 'Roast chestnuts', needs: [['chestnut'], ['chestnut'], ['chestnut']], same: true },
  { id: 'mushroom_soup', name: 'Mushroom soup', needs: [MUSHROOMS, MILK] },
  { id: 'root_stew', name: 'Root stew', needs: [['winter_root'], ['potato', 'carrot', 'sweetpotato', 'turnip'], ['pine_nut', 'chestnut']] },
  { id: 'honeyed_nuts', name: 'Honeyed nuts', needs: [['pine_nut'], ['honeycomb']] },
  { id: 'matsutake_grill', name: 'Grilled matsutake', needs: [['matsutake'], ['herb', 'wild_mint']] },
  { id: 'forest_bento', name: 'Forest bento', needs: [FISH_IDS, MUSHROOMS, VEG] },
  { id: 'colony_feast', name: 'Colony feast', needs: [FISH_IDS, FRUITS, VEG, ['egg']] },
  { id: 'founders_cake', name: 'Founders\' cake', needs: [['honeycomb'], ['chestnut'], MILK, ['egg']] },
];
// The kitchen window's groups.
export const RECIPE_GROUPS = [
  ['Everyday', ['omelette', 'salad', 'veg_soup', 'fish_grill', 'mint_tea', 'fiddlehead_tempura', 'bamboo_stirfry']],
  ['Sweet things', ['berry_jam', 'grape_juice', 'honey_toast', 'fruit_salad', 'fruit_tart', 'persimmon_jam', 'honeyed_nuts', 'chestnut_roast']],
  ['From the hill', ['mushroom_soup', 'root_stew', 'matsutake_grill']],
  ['Feasts', ['cooked_meal', 'forest_bento', 'colony_feast', 'founders_cake']],
];
export const UPGRADABLE = ['hoe', 'can', 'sickle', 'hammer', 'axe', 'rod'];
export const SHOPS = {
  store: { id: 'store', name: "Seln's Seed & Sundry", keeper: 'seln' },
  ranch: { id: 'ranch', name: "Corran's Ranch", keeper: 'corran' },
  workshop: { id: 'workshop', name: 'The Workshop', keeper: 'ruess' },
  cafe: { id: 'cafe', name: 'The Hangar', keeper: 'oduya' },
  barge: { id: 'barge', name: "Moraine's Barge", keeper: 'moraine' },
  clinic: { id: 'clinic', name: 'Willowfall Clinic', keeper: 'mori' },
  grandmarket: { id: 'grandmarket', name: 'Grand Market (Main deck)', keeper: null },
};
export const GOALS = [
  { id: 'clear', title: 'Clear some ground', hint: 'Cut a weed with the sickle, or break a rock with the hammer.', reward: 50 },
  { id: 'till', title: 'Till the soil', hint: 'Use the hoe on bare ground.', reward: 50 },
  { id: 'sow', title: 'Sow some seeds', hint: 'Select the turnip seeds and use them on tilled soil.', reward: 50 },
  { id: 'water', title: 'Water the seeds', hint: 'Use the watering can on sown soil. Fill it at the pond.', reward: 50 },
  { id: 'ship', title: 'Ship something', hint: 'Put anything worth selling in the shipping bin.', reward: 100 },
  { id: 'fish', title: 'Catch a fish', hint: 'Seln sells a fishing rod. Try any water.', reward: 100 },
  { id: 'meet', title: 'Meet three villagers', hint: 'Walk to Willowfall and say hello.', reward: 100 },
  { id: 'harvest', title: 'Harvest a crop', hint: 'Water a crop every day until it is ripe, then pick it.', reward: 100 },
  { id: 'earn', title: 'Earn 1000 cr', hint: 'Ship crops, fish, eggs and finds.', reward: 300 },
];

const STACK = 99, MINE_W = 14, MINE_H = 12, ENTRY = [7, 11];
const DIRS = [[0, 1], [0, -1], [-1, 0], [1, 0]];
const STOCK = ['lumber', 'fodder', 'feed'];
const HOUSING = { chicken: { cap: 6, home: 'coop', food: 'feed' }, cow: { cap: 4, home: 'barn', food: 'fodder' } };
const NAMES = {
  chicken: ['Pip', 'Dot', 'Biscuit', 'Clover', 'Nutmeg', 'Pepper', 'Button', 'Sorrel', 'Wren', 'Tansy'],
  cow: ['Juniper', 'Bramble', 'Hazel', 'Marigold', 'Tilly', 'Rowan', 'Dumpling', 'Mabel'],
};
// Forage by season: [id, weight]; rarer things have smaller weights.
export const FORAGE = [
  [['herb', 3], ['bamboo_shoot', 3], ['wild_mint', 3], ['fiddlehead', 2]],
  [['herb', 3], ['berry', 3], ['wild_grape', 2.5], ['honeycomb', 1]],
  [['mushroom', 4], ['chestnut', 3], ['wild_apple', 3], ['matsutake', 0.5]],
  [['frostcap', 4], ['pine_nut', 3], ['winter_root', 3]],
];
const FISH_ODDS = { farm: [70, 25, 5], village: [55, 35, 10], hill: [35, 40, 25] };   // small, medium, large
const SEASON_FISH = ['fish_spring', 'fish_summer', 'fish_autumn', 'fish_winter'];
const GIFT = { loved: 8, liked: 4, neutral: 1, disliked: -4 };
const UPGRADE_COST = [null, null, { price: 800, req: [['scrap', 5]] }, { price: 2500, req: [['alloy', 5], ['crystal', 1]] }];
const TOOL_FX = { hoe: 'till', can: 'water', sickle: 'cut', hammer: 'smash', axe: 'chop' };
const WEATHER_NOTE = { sun: 'The sun-line is bright and clear.', rain: 'It is raining.', storm: 'A storm is rattling the chamber. The shops are shut.', snow: 'It is snowing.' };
const LOCKED = 'The greenhouse is still a wreck. Ruess could repair it.';
const FULL = 'Your rucksack is full.';

const int = Number.isInteger;
const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const itemOf = (id) => (own(ITEMS, id) ? ITEMS[id] : null);
const fail = (msg, extra) => ({ ok: false, msg, ...extra });
const lower = (id) => ITEMS[id].name.toLowerCase();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- randomness

function rnd(state) {
  let t = (state.rng = (state.rng + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = (state, n) => Math.floor(rnd(state) * n);
// Picks an index from a list of weights.
function pick(state, weights) {
  let r = rnd(state) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
  return weights.length - 1;
}

// ---------------------------------------------------------------- new game, save, load

const blankTile = () => ({ till: false, wet: false, crop: null, obj: null, hp: 0 });
const OBJ_HP = { weed: 1, rock: 1, branch: 1, stump: 3, boulder: 3 };
const setObj = (t, obj) => { t.obj = obj; t.hp = OBJ_HP[obj]; };

export function newGame({ seed } = {}) {
  const s0 = Number.isFinite(seed) ? seed >>> 0 : (Math.random() * 4294967296) >>> 0;
  const field = ([w, h]) => ({ w, h, tiles: Array.from({ length: w * h }, blankTile) });
  const state = {
    v: 1, seed: s0, rng: s0 | 0,
    cal: { year: 1, season: 0, day: 1, minute: DAY_START },
    weather: 'sun', weatherTomorrow: 'sun',
    player: {
      stamina: 100, maxStamina: 100, money: 500, slots: 10,
      inv: [{ id: 'hoe', n: 1 }, { id: 'can', n: 1 }, { id: 'sickle', n: 1 }, { id: 'hammer', n: 1 }, { id: 'axe', n: 1 }, { id: 'seed_turnip', n: 1 }, null, null, null, null],
      sel: 0, toolLevel: { hoe: 1, can: 1, sickle: 1, hammer: 1, axe: 1, rod: 1 }, water: CAN_CAPACITY[1], map: 'farm', x: 0, y: 0, dir: 0, basket: [],
    },
    fields: { farm: field(FIELD_SIZES.farm), greenhouse: field(FIELD_SIZES.greenhouse) },
    pasture: { w: PASTURE_SIZE[0], h: PASTURE_SIZE[1], grass: Array(PASTURE_SIZE[0] * PASTURE_SIZE[1]).fill(0), age: Array(PASTURE_SIZE[0] * PASTURE_SIZE[1]).fill(0) },
    stock: { lumber: 0, fodder: 0, feed: 0 },
    storage: new Array(STORAGE_SIZE).fill(null), fridge: new Array(FRIDGE_SIZE).fill(null),
    animals: [], eggs: 0, bin: [],
    ledger: { shipped: {}, earned: 0 },
    npc: {}, flags: { greenhouse: false },
    pending: { upgrade: null, animals: [] },
    mine: null, forage: [], museum: {}, fishLog: {},
    chests: [], panels: [], robots: [], fruitTrees: [], cooked: {}, foraged: {}, mill: [], hydro: [], solarYard: { slots: [] },
    stats: { tilesCleared: 0, tilled: 0, sown: 0, watered: 0, harvested: 0, shippedItems: 0, fishCaught: 0, searched: 0, monsters: 0, gifts: 0, deepest: 0, days: 0 },
    goals: {},
  };
  for (const id of NPC_IDS) state.npc[id] = { love: 0, talked: false, gifted: false, met: false };
  // The neglected field: about 55% debris, and three or four boulders.
  const tiles = state.fields.farm.tiles;
  for (const t of tiles) {
    if (rnd(state) >= 0.55) continue;
    setObj(t, ['weed', 'rock', 'branch', 'stump'][pick(state, [46, 26, 22, 6])]);
  }
  for (let n = 3 + rint(state, 2); n > 0; n--) setObj(tiles[rint(state, tiles.length)], 'boulder');
  state.weatherTomorrow = rollWeather(state, 0, 2);
  rollForage(state);
  return state;
}

export const saveState = (state) => JSON.stringify(state);
export function loadState(text) {
  try {
    const s = JSON.parse(text);
    const good = s && s.v === 1 && s.cal && s.player && Array.isArray(s.player.inv) && s.fields && s.fields.farm && Array.isArray(s.fields.farm.tiles) && s.fields.greenhouse && s.pasture && s.stats;
    if (good) s.mine = null;   // a saved site (or an old-style one) is not resumed: the trip starts again
    return good ? ensure(s) : null;
  } catch { return null; }
}

// Older saves lack the later fields: give them empty ones (called on load and by the new actions).
export function ensure(s) {
  const arr = (o, k) => { if (!Array.isArray(o[k])) o[k] = []; };
  const obj = (o, k) => { if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {}; };
  arr(s.player, 'basket'); arr(s, 'chests'); arr(s, 'panels'); arr(s, 'robots'); arr(s, 'fruitTrees');
  obj(s, 'cooked'); obj(s, 'foraged'); obj(s, 'flags'); obj(s, 'museum'); obj(s, 'fishLog');
  arr(s, 'mill'); arr(s, 'hydro'); obj(s, 'solarYard'); arr(s.solarYard, 'slots'); obj(s, 'stats');
  if (!Array.isArray(s.storage)) s.storage = new Array(STORAGE_SIZE).fill(null);
  if (!Array.isArray(s.fridge)) s.fridge = new Array(FRIDGE_SIZE).fill(null);
  obj(s, 'npc'); for (const id of NPC_IDS) if (!s.npc[id] || typeof s.npc[id] !== 'object') s.npc[id] = { love: 0, talked: false, gifted: false, met: false };   // people who moved in after the save
  return s;
}

// ---------------------------------------------------------------- calendar

export const absDay = (state) => ((state.cal.year - 1) * 4 + state.cal.season) * DAYS_PER_SEASON + state.cal.day - 1;
export const weekday = (state) => absDay(state) % 7;
export const dateLabel = (state) => `${SEASONS[state.cal.season]} ${state.cal.day} (${WEEKDAYS[weekday(state)]}), Year ${state.cal.year}`;
export function timeLabel(state) {
  const m = state.cal.minute % 1440, h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
export const hearts = (state, npcId) => (own(state.npc, npcId) ? Math.floor(state.npc[npcId].love / 10) : 0);
// 0 just sown, 1 sprout, 2 growing, 3 ripe.
export function cropStage(crop) {
  const c = crop && own(CROPS, crop.id) ? CROPS[crop.id] : null;
  if (!c) return 0;
  return crop.age >= c.days ? 3 : crop.age <= 0 ? 0 : crop.age * 2 < c.days ? 1 : 2;
}
export const stageOf = (tile) => (tile && tile.crop ? cropStage(tile.crop) : -1);
export function tick(state, minutes) {
  if (Number.isFinite(minutes) && minutes > 0) state.cal.minute = Math.min(DAY_END, state.cal.minute + minutes);
  return { ok: true, collapsed: state.cal.minute >= DAY_END };
}

// ---------------------------------------------------------------- the rucksack

function room(state, id) {
  const tool = ITEMS[id].kind === 'tool';
  let n = 0;
  for (const s of state.player.inv) n += !s ? (tool ? 1 : STACK) : s.id === id && !tool ? STACK - s.n : 0;
  return n;
}
const canAdd = (state, id, n = 1) => STOCK.includes(id) || room(state, id) >= n;
export function addItem(state, id, n = 1) {
  const def = itemOf(id);
  if (!def || !int(n) || n < 1) return fail('There is nothing to take.');
  if (STOCK.includes(id)) { state.stock[id] += n; return { ok: true, msg: `${def.name} added to the stores.` }; }
  if (room(state, id) < n) return fail(FULL);
  const inv = state.player.inv, each = def.kind === 'tool' ? 1 : STACK;
  for (const s of inv) if (s && s.id === id && s.n < each && n > 0) { const k = Math.min(n, each - s.n); s.n += k; n -= k; }
  for (let i = 0; i < inv.length && n > 0; i++) if (!inv[i]) { const k = Math.min(n, each); inv[i] = { id, n: k }; n -= k; }
  return { ok: true, msg: `Got ${def.name}.` };
}
export const countItem = (state, id) => state.player.inv.reduce((a, s) => a + (s && s.id === id ? s.n : 0), 0);
export function removeItem(state, id, n = 1) {
  if (!int(n) || n < 1 || countItem(state, id) < n) return false;
  const inv = state.player.inv;
  for (let i = inv.length - 1; i >= 0 && n > 0; i--) {
    if (!inv[i] || inv[i].id !== id) continue;
    const k = Math.min(n, inv[i].n);
    inv[i].n -= k; n -= k;
    if (!inv[i].n) inv[i] = null;
  }
  return true;
}
export const selected = (state) => state.player.inv[state.player.sel] || null;
const slotItem = (state, slot) => (int(slot) && state.player.inv[slot]) || null;
function takeFromSlot(state, slot, n) {
  const s = state.player.inv[slot];
  s.n -= n;
  if (s.n <= 0) state.player.inv[slot] = null;
}
// A soak at the onsen makes every tool cost one stamina less (never below 1) for the rest of that day.
export const onsenBuff = (state) => !!state.flags && state.flags.onsenDay === absDay(state);
export const toolCost = (state, n) => (onsenBuff(state) ? Math.max(1, n - 1) : n);
// Stamina never goes below 0; at 0 Sato faints (the UI then puts her to bed).
function spend(state, n, res) {
  state.player.stamina = Math.max(0, state.player.stamina - n);
  if (state.player.stamina <= 0) res.fainted = true;
  return res;
}
// Puts finds in the rucksack; what does not fit is left behind. Returns the list that was kept.
function take(state, finds, res) {
  for (const [id, n] of finds) {
    if (addItem(state, id, n).ok) res.gained.push({ id, n });
    else res.msg = `Your rucksack is full, so the ${lower(id)} stayed behind.`;
  }
  return res;
}

// ---------------------------------------------------------------- the field

// The tiles a tool reaches: one; three in a line ahead; or a 3×3 block ahead (hoe, can, sickle).
function reach(x, y, dir, level, wide) {
  const [dx, dy] = (int(dir) && DIRS[dir]) || DIRS[0];
  if (level >= 3 && wide) {
    const out = [];
    for (let a = 0; a < 3; a++) for (let s = -1; s <= 1; s++) out.push([x + dx * a + dy * s, y + dy * a + dx * s]);
    return out;
  }
  return level >= 2 ? [[x, y], [x + dx, y + dy], [x + 2 * dx, y + 2 * dy]] : [[x, y]];
}
const block = (x, y) => reach(x, y - 1, 0, 3, true);   // 3×3 centred on (x, y)
const inside = (f, x, y) => int(x) && int(y) && x >= 0 && y >= 0 && x < f.w && y < f.h;
const nothing = (msg) => ({ ok: false, msg, cost: 0, changed: [], gained: [], fx: null });
const WIDE = { hoe: true, can: true, sickle: true };
const IDLE = {
  hoe: 'There is no bare ground to till here.', can: 'There is no dry soil to water here.', sickle: 'There is nothing to cut here.',
  hammer: 'There is nothing to break here.', axe: 'There is nothing to chop here.',
};

// One tool on one tile. Returns true when the tile changed; ctx collects lumber and a better message.
function work(state, tool, level, t, ctx) {
  const st = state.stats, clear = () => { t.obj = null; t.hp = 0; st.tilesCleared++; return true; };
  const hit = () => { t.hp--; return t.hp > 0; };
  switch (tool) {
    case 'hoe':
      if (t.obj) { ctx.hint = 'Something is in the way. Clear it first.'; return false; }
      if (t.crop || t.till) return false;
      t.till = true; st.tilled++; return true;
    case 'can':
      if (!t.till || t.wet) return false;
      if (state.player.water <= 0) { ctx.hint = 'The watering can is empty. Fill it at the pond.'; return false; }
      state.player.water--; t.wet = true; st.watered++; return true;
    case 'sickle':
      if (t.obj === 'weed') return clear();
      if (t.crop && t.crop.dead) { t.crop = null; return true; }
      if (t.crop) ctx.hint = 'That crop is still alive. Leave it be.';
      else if (t.obj) ctx.hint = 'The sickle only cuts weeds and dead crops.';
      return false;
    case 'hammer':
      if (t.obj === 'rock') return clear();
      if (t.obj === 'boulder') {
        if (level < 2) { ctx.hint = 'This boulder needs an Alloy hammer.'; return false; }
        if (!hit()) clear();
        return true;
      }
      if (t.obj) { ctx.hint = 'The hammer only breaks rocks.'; return false; }
      if (!t.crop && t.till) { t.till = false; t.wet = false; return true; }
      return false;
    case 'axe':
      if (t.obj === 'branch') { ctx.lumber += 1; return clear(); }
      if (t.obj === 'stump') { if (!hit()) { ctx.lumber += 6; clear(); } return true; }
      if (t.obj) ctx.hint = 'The axe only chops branches and stumps.';
      return false;
  }
  return false;
}

export function useTool(state, fieldId, x, y, dir) {
  if (fieldId === 'pasture') return usePasture(state, x, y, dir);
  if (!own(state.fields, fieldId)) return nothing('There is no field there.');
  if (fieldId === 'greenhouse' && !state.flags.greenhouse) return nothing(LOCKED);
  const f = state.fields[fieldId], it = selected(state);
  if (!it) return nothing('Your hands are empty. Pick a tool or a seed bag.');
  if (!int(x) || !int(y)) return nothing('There is nothing there.');
  const def = ITEMS[it.id];
  if (def.kind === 'seed') return sow(state, fieldId, f, it.id, x, y);
  if (!TOOL_FX[it.id]) return nothing(def.kind === 'tool' ? `The ${def.name.toLowerCase()} is no use on the field.` : 'You cannot use that on the field.');
  const level = state.player.toolLevel[it.id], ctx = { lumber: 0, hint: null };
  const res = { ok: true, cost: toolCost(state, 2), changed: [], gained: [], fx: TOOL_FX[it.id] };
  for (const [tx, ty] of reach(x, y, dir, level, WIDE[it.id])) {
    if (inside(f, tx, ty) && work(state, it.id, level, f.tiles[ty * f.w + tx], ctx)) res.changed.push({ x: tx, y: ty });
  }
  if (!res.changed.length) return nothing(ctx.hint || IDLE[it.id]);
  if (ctx.lumber) { state.stock.lumber += ctx.lumber; res.gained.push({ id: 'lumber', n: ctx.lumber }); }
  return spend(state, res.cost, res);
}

function sow(state, fieldId, f, seedId, x, y) {
  const crop = ITEMS[seedId].crop;
  if (!crop) return nothing('Grass seed is for the pasture.');
  if (fieldId !== 'greenhouse' && !CROPS[crop].seasons.includes(state.cal.season)) return nothing(`${CROPS[crop].name} seeds will not grow outdoors in ${SEASONS[state.cal.season].toLowerCase()}.`);
  const res = { ok: true, cost: 0, changed: [], gained: [], fx: 'sow' };
  for (const [tx, ty] of block(x, y)) {
    if (!inside(f, tx, ty)) continue;
    const t = f.tiles[ty * f.w + tx];
    if (!t.till || t.crop || t.obj) continue;
    t.crop = { id: crop, age: 0, dead: false };
    state.stats.sown++;
    res.changed.push({ x: tx, y: ty });
  }
  if (!res.changed.length) return nothing('Seeds need empty tilled soil. Use the hoe first.');
  removeItem(state, seedId, 1);
  return res;
}

export function harvest(state, fieldId, x, y) {
  const no = (msg) => fail(msg, { gained: [] });
  if (!own(state.fields, fieldId)) return no('There is no field there.');
  if (fieldId === 'greenhouse' && !state.flags.greenhouse) return no(LOCKED);
  const f = state.fields[fieldId];
  const t = inside(f, x, y) ? f.tiles[y * f.w + x] : null;
  if (!t || !t.crop) return no('There is nothing to pick here.');
  if (t.crop.dead) return no('This crop is dead. Cut it with the sickle.');
  const c = CROPS[t.crop.id];
  if (t.crop.age < c.days) return no(`The ${c.plural} are not ripe yet.`);
  const put = stash(state, c.id, 1); if (!put.ok) return no(FULL);
  if (c.regrow) t.crop.age = c.days - c.regrow; else t.crop = null;
  state.stats.harvested++;
  return { ok: true, gained: [{ id: c.id, n: 1 }], basket: put.basket, msg: put.msg };
}

export function refillCan(state) {
  if (!countItem(state, 'can')) return fail('You do not have the watering can with you.');
  const cap = CAN_CAPACITY[state.player.toolLevel.can];
  if (state.player.water >= cap) return fail('The watering can is already full.');
  state.player.water = cap;
  return { ok: true, msg: 'You filled the watering can.' };
}

export function usePasture(state, x, y, dir) {
  const p = state.pasture, it = selected(state);
  if (!it) return nothing('Your hands are empty. Pick the sickle or grass seed.');
  if (!int(x) || !int(y)) return nothing('There is nothing there.');
  if (it.id === 'seed_grass') {
    const res = { ok: true, cost: 0, changed: [], gained: [], fx: 'sow' };
    for (const [tx, ty] of block(x, y)) {
      if (!inside(p, tx, ty) || p.grass[ty * p.w + tx]) continue;
      p.grass[ty * p.w + tx] = 1; p.age[ty * p.w + tx] = 0;
      res.changed.push({ x: tx, y: ty });
    }
    if (!res.changed.length) return nothing('Grass is already growing here.');
    removeItem(state, 'seed_grass', 1);
    return res;
  }
  if (it.id !== 'sickle') return nothing('Only the sickle and grass seed are any use in the pasture.');
  const res = { ok: true, cost: toolCost(state, 2), changed: [], gained: [], fx: 'cut' };
  for (const [tx, ty] of reach(x, y, dir, state.player.toolLevel.sickle, true)) {
    if (!inside(p, tx, ty) || p.grass[ty * p.w + tx] !== 3) continue;
    p.grass[ty * p.w + tx] = 1; p.age[ty * p.w + tx] = 0;
    res.changed.push({ x: tx, y: ty });
  }
  if (!res.changed.length) return nothing('There is no ripe grass to cut here.');
  state.stock.fodder += res.changed.length;
  res.gained.push({ id: 'fodder', n: res.changed.length });
  return spend(state, res.cost, res);
}

// ---------------------------------------------------------------- animals

const bump = (a, n) => { a.love = clamp(a.love + n, 0, 100); };
export function feedAll(state, kind) {
  if (!own(HOUSING, kind)) return fail('There is no trough for that.');
  const { food, home } = HOUSING[kind], hungry = state.animals.filter((a) => a.kind === kind && !a.fed);
  if (!state.animals.some((a) => a.kind === kind)) return fail(`The ${home} is empty.`);
  if (!hungry.length) return fail('Everyone has been fed today.');
  if (state.stock[food] < 1) return fail(`You are out of ${lower(food)}. Corran sells it.`);
  const n = Math.min(hungry.length, state.stock[food]);
  for (const a of hungry.slice(0, n)) a.fed = true;
  state.stock[food] -= n;
  return { ok: true, msg: n < hungry.length ? `Only enough ${lower(food)} for ${n}. Corran sells more.` : 'You filled the troughs.' };
}
const animalAt = (state, index) => (int(index) && state.animals[index]) || null;
export function milk(state, index) {
  const a = animalAt(state, index), no = (msg) => fail(msg, { gained: [] });
  if (!a) return no('There is no animal there.');
  if (a.kind !== 'cow') return no('Only cows give milk.');
  if (!countItem(state, 'milker')) return no('You need a milker. Corran sells one.');
  if (a.milked) return no(`${a.name} has been milked today.`);
  if (!a.fed) return no(`${a.name} is hungry. Feed her first.`);
  const id = a.love < 34 ? 'milk_s' : a.love < 67 ? 'milk_m' : 'milk_l';
  if (!addItem(state, id, 1).ok) return no(FULL);
  a.milked = true;
  return { ok: true, msg: `${a.name} gave ${lower(id)}.`, gained: [{ id, n: 1 }] };
}
export function brush(state, index) {
  const a = animalAt(state, index);
  if (!a) return fail('There is no animal there.');
  if (a.kind !== 'cow') return fail('Chickens do not care for the brush.');
  if (!countItem(state, 'brush')) return fail('You need a brush. Corran sells one.');
  if (a.brushed) return fail(`${a.name} has been brushed today.`);
  a.brushed = true; bump(a, 3);
  return { ok: true, msg: `${a.name} leans into the brush.` };
}
export function petAnimal(state, index) {
  const a = animalAt(state, index);
  if (!a) return fail('There is no animal there.');
  if (a.talked) return fail(`You already said hello to ${a.name} today.`);
  a.talked = true; bump(a, 1);
  return { ok: true, msg: `${a.name} seems pleased to see you.` };
}
export function collectEggs(state) {
  if (state.eggs < 1) return fail('There are no eggs today.', { gained: [] });
  const n = Math.min(state.eggs, room(state, 'egg'));
  if (n < 1) return fail(FULL, { gained: [] });
  addItem(state, 'egg', n);
  state.eggs -= n;
  return { ok: true, msg: state.eggs ? 'Your rucksack is full. Some eggs are still in the coop.' : n === 1 ? 'You collected an egg.' : `You collected ${n} eggs.`, gained: [{ id: 'egg', n }] };
}

// ---------------------------------------------------------------- economy

export function ship(state, slot, n) {
  const s = slotItem(state, slot);
  if (!s) return fail('That slot is empty.');
  const def = ITEMS[s.id];
  if (def.kind === 'tool') return fail('You cannot ship your tools.');
  if (!def.sell) return fail(`Nobody buys ${def.name.toLowerCase()} from the bin.`);
  if (n === undefined || n === null) n = s.n;
  if (!int(n) || n < 1) return fail('Choose how many to ship.');
  n = Math.min(n, s.n);
  const id = s.id, line = state.bin.find((b) => b.id === id);
  if (line) line.n += n; else state.bin.push({ id, n });
  takeFromSlot(state, slot, n);
  state.stats.shippedItems += n;
  return { ok: true, msg: `${n} × ${def.name} in the bin. Paid at dawn.` };
}
export function eat(state, slot) {
  const s = slotItem(state, slot), p = state.player;
  if (!s) return fail('That slot is empty.');
  const def = ITEMS[s.id];
  if (def.maxUp) {                                   // a star-plum: max stamina up for good
    if (p.maxStamina >= MAX_STAMINA_CAP) return fail('Your strength is already at its peak. Keep it for someone who needs it.');
    const up = Math.min(def.maxUp, MAX_STAMINA_CAP - p.maxStamina);
    p.maxStamina += up; p.stamina = Math.min(p.maxStamina, p.stamina + up); takeFromSlot(state, slot, 1);
    state.stats.starPlums = (state.stats.starPlums || 0) + 1;
    return { ok: true, celebrate: true, maxUp: up, msg: `The star-plum tastes of sunlight. Max stamina +${up} (now ${p.maxStamina}).` };
  }
  if (!def.stamina) return fail('You cannot eat that.');
  const first = !!def.firstMaxUp && !state.flags['ate_' + s.id] && p.maxStamina < MAX_STAMINA_CAP;
  if (!first && p.stamina >= p.maxStamina) return fail('You are not hungry.');
  let up = 0;
  if (first) { state.flags['ate_' + s.id] = true; up = Math.min(def.firstMaxUp, MAX_STAMINA_CAP - p.maxStamina); p.maxStamina += up; }
  p.stamina = Math.min(p.maxStamina, p.stamina + def.stamina);
  takeFromSlot(state, slot, 1);
  if (up) return { ok: true, celebrate: true, maxUp: up, msg: `You had ${def.name.toLowerCase()}. A first taste like that stays with you: max stamina +${up} (now ${p.maxStamina}).` };
  return { ok: true, msg: `You had ${def.name.toLowerCase()}. +${def.stamina} stamina.` };
}

// ---------------------------------------------------------------- storage box, fridge and kitchen
function boxes(state) {
  if (!Array.isArray(state.storage)) state.storage = new Array(STORAGE_SIZE).fill(null);
  if (!Array.isArray(state.fridge)) state.fridge = new Array(FRIDGE_SIZE).fill(null);
  return { storage: state.storage, fridge: state.fridge };
}
// A box: 'storage', 'fridge' or 'chest:<index>' (a field chest).
export function boxOf(state, where) {
  if (where === 'storage' || where === 'fridge') return boxes(state)[where];
  const m = typeof where === 'string' && /^chest:(\d{1,3})$/.exec(where);
  const c = m && Array.isArray(state.chests) ? state.chests[+m[1]] : null;
  return c && Array.isArray(c.items) ? c.items : null;
}
const boxName = (where) => (where === 'fridge' ? 'the fridge' : where === 'storage' ? 'the storage box' : 'the field chest');
// Put a rucksack stack (or n of it) into the storage box or the fridge.
export function storeItem(state, where, slot, n) {
  const box = boxOf(state, where); if (!box) return fail('There is nowhere like that to put things.');
  const s = slotItem(state, slot); if (!s) return fail('That slot is empty.');
  const def = ITEMS[s.id];
  if (def.kind === 'tool' && where === 'fridge') return fail('Tools do not go in the fridge.');
  if (s.id === 'field_chest' && where.startsWith('chest:')) return fail('A chest does not fit inside a chest.');
  if (where === 'fridge' && !FRIDGE_KINDS.has(def.kind)) return fail('Only food goes in the fridge.');
  if (where === 'fridge' && !state.flags.kitchen) return fail('The fridge is not connected yet. Ruess can refit the kitchen.');
  if (n === undefined || n === null) n = s.n;
  if (!int(n) || n < 1) return fail('Choose how many.');
  n = Math.min(n, s.n);
  let left = n;
  for (const b of box) if (b && b.id === s.id && left) { const k = Math.min(left, STACK - b.n); b.n += k; left -= k; }
  for (let i = 0; i < box.length && left; i++) if (!box[i]) { const k = Math.min(left, STACK); box[i] = { id: s.id, n: k }; left -= k; }
  const put = n - left;
  if (!put) return fail(where === 'fridge' ? 'The fridge is full.' : where === 'storage' ? 'The storage box is full.' : 'The field chest is full.');
  takeFromSlot(state, slot, put);
  return { ok: true, msg: `${put} × ${def.name} in ${boxName(where)}.` };
}
// Take a stack (or n of it) out of the box into the rucksack.
export function takeItem(state, where, index, n) {
  const box = boxOf(state, where); if (!box) return fail('There is nowhere like that.');
  const b = int(index) && index >= 0 && index < box.length ? box[index] : null;
  if (!b) return fail('That space is empty.');
  if (n === undefined || n === null) n = b.n;
  n = Math.min(Math.max(1, int(n) ? n : 1), b.n, room(state, b.id));
  if (n < 1) return fail(FULL);
  addItem(state, b.id, n); b.n -= n; if (!b.n) box[index] = null;
  return { ok: true, msg: `Took ${n} × ${ITEMS[b.id].name}.` };
}
// Ingredients come from the rucksack first, then the fridge.
function pantry(state) {
  const have = {};
  for (const s of [...state.player.inv, ...boxes(state).fridge]) if (s) have[s.id] = (have[s.id] || 0) + s.n;
  return have;
}
function planRecipe(state, r) {
  const have = pantry(state), used = {}, picks = [];
  for (const slot of r.needs) {
    const id = slot.find((x) => (have[x] || 0) - (used[x] || 0) > 0 && (r.same || !picks.includes(x)));
    if (!id) return null;
    used[id] = (used[id] || 0) + 1; picks.push(id);
  }
  return picks;
}
export function recipeBook(state) {
  const groupOf = (id) => (RECIPE_GROUPS.find(([, ids]) => ids.includes(id)) || ['Other'])[0];
  return RECIPES.map((r) => { const p = state.flags.kitchen ? planRecipe(state, r) : null; return { id: r.id, name: r.name, desc: ITEMS[r.id].desc, group: groupOf(r.id), can: !!p, uses: p ? p.map((x) => ITEMS[x].name) : null, cooked: (state.cooked && state.cooked[r.id]) || 0, needs: r.needs.map((slot) => (slot.length === 1 ? ITEMS[slot[0]].name : slot === VEG ? 'any vegetable' : slot === FISH_IDS ? 'any fish' : slot === MILK ? 'any milk' : slot === FRUITS ? 'any fruit' : slot.map((x) => ITEMS[x].name).join(' or '))) }; });
}
export function cook(state, recipeId) {
  if (!state.flags.kitchen) return fail('The kitchen needs a refit first. Ruess can do it.');
  const r = RECIPES.find((x) => x.id === recipeId); if (!r) return fail('There is no such recipe.');
  const picks = planRecipe(state, r); if (!picks) return fail(`You do not have the ingredients for ${r.name.toLowerCase()}.`);
  const keep = JSON.stringify([state.player.inv, boxes(state).fridge]);   // the dish may need a slot an ingredient frees
  for (const id of picks) {
    if (!removeItem(state, id, 1)) { const f = boxes(state).fridge, k = f.findIndex((b) => b && b.id === id); if (k >= 0) { f[k].n -= 1; if (!f[k].n) f[k] = null; } }
  }
  if (!room(state, r.id)) { const [inv, fridge] = JSON.parse(keep); state.player.inv = inv; state.fridge = fridge; return fail(FULL); }
  addItem(state, r.id, 1); state.stats.cooked = (state.stats.cooked || 0) + 1;
  ensure(state).cooked[r.id] = (state.cooked[r.id] || 0) + 1;
  return { ok: true, msg: `You made ${ITEMS[r.id].name.toLowerCase()}.`, gained: [{ id: r.id, n: 1 }] };
}

// ---------------------------------------------------------------- trees and berry bushes
// Trees on the farm and the hill can be felled with the axe for lumber; a stump regrows into a tree
// after TREE_REGROW days. Bushes give berries from spring to autumn, at most every BUSH_DAYS days.
export const TREE_REGROW = 14, BUSH_DAYS = 3;
const TREE_HITS = [0, 5, 3, 2];
export function treeFelled(state, key) { const t = (state.trees || {})[key]; return !!(t && t.felled != null && absDay(state) - t.felled < TREE_REGROW); }
export function chopTree(state, key) {
  if (typeof key !== 'string' || !key) return fail('There is no tree there.');
  const s = selected(state); if (!s || s.id !== 'axe') return fail('Hold the axe to chop a tree.');
  state.trees ||= {};
  if (treeFelled(state, key)) return fail('Only a stump is left. It will grow back.');
  const p = state.player; if (p.stamina <= 0) return fail('You are too tired to swing the axe.');
  const t = state.trees[key] = state.trees[key] && state.trees[key].felled == null ? state.trees[key] : { hits: 0, felled: null };
  const cost = toolCost(state, 3); t.hits += 1; p.stamina = Math.max(0, p.stamina - cost);
  const need = TREE_HITS[p.toolLevel.axe || 1] || 5;
  if (t.hits < need) return { ok: true, msg: null, felled: false, cost, left: need - t.hits, gained: [], fainted: p.stamina <= 0 };
  t.felled = absDay(state); t.hits = 0; state.stock.lumber += 8; state.stats.treesFelled = (state.stats.treesFelled || 0) + 1;
  return { ok: true, msg: 'Timber! +8 lumber. The stump will grow back in two weeks.', felled: true, cost, gained: [{ id: 'lumber', n: 8 }], fainted: p.stamina <= 0 };
}
export function bushReady(state, key) { const d = (state.bushes || {})[key]; return state.cal.season < 3 && (d == null || absDay(state) - d >= BUSH_DAYS); }
export function pickBush(state, key) {
  if (typeof key !== 'string' || !key) return fail('There is no bush there.');
  if (state.cal.season === 3) return fail('The bush is bare for the winter.');
  if (!bushReady(state, key)) return fail('No ripe berries yet. Come back in a few days.');
  const n = state.cal.season === 1 ? 2 + Math.floor(rnd(state) * 2) : 1 + Math.floor(rnd(state) * 2);
  const inBasket = basketHeld(state) && basketRoom(state, 'berry') >= n;
  if (!inBasket && !canAdd(state, 'berry', n)) return fail(FULL);
  (state.bushes ||= {})[key] = absDay(state); stash(state, 'berry', n);
  return { ok: true, msg: `You picked ${n} berr${n > 1 ? 'ies' : 'y'}${inBasket ? ' into the basket' : ''}.`, gained: [{ id: 'berry', n }], basket: inBasket };
}

// What a shop sells today. Private fields: give (item id), once, req [[id, n]], lumber, stop(n) -> why, apply(n).
function shelves(state, shopId) {
  const p = state.player, out = [];
  const sell = (id, price, more) => out.push({ key: id, label: ITEMS[id].name, desc: ITEMS[id].desc, price, give: id, ...more });
  const once = (id, price) => { if (!countItem(state, id)) sell(id, price, { once: true }); };
  if (shopId === 'store') {
    for (const c of Object.values(CROPS)) if (c.seasons.length === 1 && c.seasons[0] === state.cal.season) sell(`seed_${c.id}`, c.bag);
    sell('seed_grass', 500); sell('bread', 60); once('rod', 600);
    const tier = RUCKSACK_TIERS.find(([n]) => n > p.slots);
    if (tier) {
      const [to, price] = tier;
      out.push({ key: 'rucksack', label: `${to}-slot rucksack`, desc: `A bigger rucksack: ${to} slots.`, price, once: true,
        apply: () => { while (p.inv.length < to) p.inv.push(null); p.slots = to; return `Your rucksack now has ${to} slots.`; } });
    }
    if (!state.flags.basket) sell('basket', 800, { once: true, apply: () => { addItem(state, 'basket', 1); state.flags.basket = true; ensure(state); return 'A harvest basket. Hold it while you pick, and the crops go in the basket.'; } });
    if (state.cal.season < 3) for (const k of Object.keys(FRUIT_TREES)) sell(`sapling_${k}`, 2500);
    const rented = ensure(state).hydro.length;
    out.push({ key: 'hydro_tower', label: 'Rent a hydroponic tower', desc: `One tower in the village garden for the rest of this season (${rented}/${HYDRO_MAX}). Any seed, any season, no watering.`, price: 600, once: true,
      stop: () => (rented >= HYDRO_MAX ? 'Four towers is all Seln can spare.' : null),
      apply: () => { const used = new Set(state.hydro.map((h) => h.tower)); const tower = [...Array(HYDRO_TOWERS).keys()].find((k) => !used.has(k)); state.hydro.push({ tower, crop: null, planted: 0, season: state.cal.season }); return `Tower ${tower + 1} in the hydroponics garden is yours until the season turns.`; } });
  } else if (shopId === 'ranch') {
    for (const [kind, price, desc] of [['chicken', 1500, 'Lays an egg each morning when fed.'], ['cow', 5000, 'Gives milk each day when fed.']]) {
      const h = HOUSING[kind], have = state.animals.filter((a) => a.kind === kind).length + state.pending.animals.filter((k) => k === kind).length;
      out.push({ key: kind, label: kind === 'cow' ? 'Cow' : 'Chicken', desc: `${desc} Delivered tomorrow morning.`, price,
        stop: (n) => (have + n > h.cap ? `There is no more room in the ${h.home}.` : null),
        apply: (n) => { for (let i = 0; i < n; i++) state.pending.animals.push(kind); return `Corran will bring ${n > 1 ? 'them' : kind === 'cow' ? 'her' : 'it'} round in the morning.`; } });
    }
    sell('feed', 10); sell('fodder', 20); once('milker', 1200); once('brush', 500);
  } else if (shopId === 'workshop') {
    for (const tool of UPGRADABLE) {
      const level = p.toolLevel[tool] + 1;
      if (!countItem(state, tool) || level > 3) continue;
      const { price, req } = UPGRADE_COST[level], name = `${TOOL_LEVELS[level]} ${lower(tool)}`;
      out.push({ key: `up_${tool}`, label: name, desc: `Ruess reworks your ${lower(tool)} overnight.`, price, req, once: true,
        needs: req.map(([id, n]) => `${n} ${lower(id)}`).join(', '),
        stop: () => (state.pending.upgrade ? 'Ruess is already working on one of your tools.' : null),
        apply: () => { removeItem(state, tool, 1); state.pending.upgrade = { tool, level }; return `Ruess will have your ${name} ready in the morning.`; } });
    }
    sell('field_chest', 1200, { lumber: 20, needs: '20 lumber' });
    const robots = ensure(state).robots.length;
    out.push({ key: 'robot', label: 'Lease a Field-unit', desc: `A little farm robot (${robots}/${MAX_ROBOTS}). It waters, harvests or tends animals each morning on a battery. Talk to it on the farm to give it a job.`, price: 300, once: true,
      stop: () => (robots >= MAX_ROBOTS ? 'Ruess has no more Field-units to spare. Seven is a whole crew, he says.' : null),
      apply: () => { const name = ROBOT_NAMES.find((n) => !state.robots.some((r) => r.name === n)) || `Unit ${state.robots.length + 1}`; state.robots.push({ name, job: 'water', days: 0, charge: 100, mood: 'happy', done: 0 }); return `${name} rolls out of the workshop, fully charged, and follows you home.`; } });
    sell('solar_panel', 1500, { lumber: 10, needs: '10 lumber' });
    if (!state.flags.filters) out.push({ key: 'up_filters', label: 'Pallas air filters', desc: 'Ruess fits the Pallas with scrubbers: toxic and radioactive haze on Earth costs you nothing.', price: 2000, req: [['alloy', 3], ['star_metal', 1]], needs: '3 alloy, 1 star-metal', once: true,
      apply: () => { state.flags.filters = true; return 'Ruess bolts the new filters into the Pallas. "Breathe easy down there. That is an order."'; } });
    if (!state.flags.feed_mill) out.push({ key: 'feed_mill', label: 'Feed mill', desc: 'A little mill beside your silo. Put crops in by day; by morning they are hen feed.', price: 1500, lumber: 40, needs: '40 lumber', once: true,
      apply: () => { state.flags.feed_mill = true; ensure(state); return 'Ruess will have the feed mill standing beside your silo by tonight. "It grinds. It does not judge."'; } });
    sell('battery', 200);
    // What Ruess makes from belt ore (2026-11-19).
    sell('battery', 80, { key: 'wind_battery', label: 'Wind a battery from copper', desc: 'Ruess winds a new robot battery from two copper ore. Cheaper than a bought one.', req: [['copper', 2]], needs: '2 copper ore', once: true });
    sell('alloy', 100, { key: 'smelt_alloy', label: 'Smelt alloy', desc: 'Four nickel-iron into the workshop furnace; one bar of good alloy out.', req: [['nickel_iron', 4]], needs: '4 nickel-iron', once: true });
    if (!state.flags.yard_big) out.push({ key: 'yard_racks', label: 'Solar yard racks', desc: 'Four more charging racks in the Willowfall solar yard, glazed with belt glass: ten batteries a night.', price: 1200, req: [['silica', 4], ['copper', 2]], needs: '4 silica, 2 copper ore', once: true,
      apply: () => { state.flags.yard_big = true; return 'Ruess glazes four new racks in the solar yard. "Belt glass. Better than anything we pour up here."'; } });
    if (state.flags.feed_mill && !state.flags.mill_rollers) out.push({ key: 'mill_rollers', label: 'Titanium mill rollers', desc: 'Steel-and-titanium rollers for your feed mill: it grinds forty crops a night instead of twenty.', price: 800, req: [['titanium', 2]], needs: '2 titanium ore', once: true,
      apply: () => { state.flags.mill_rollers = true; return 'Ruess fits the new rollers. The mill sounds less like it is complaining.'; } });
    if (!state.flags.drill) out.push({ key: 'up_drill', label: 'Pallas drill head', desc: 'A titanium drill head with a platinum tip: now and then a belt rock gives up a second ore.', price: 2500, req: [['titanium', 3], ['copper', 2], ['platinum', 1]], needs: '3 titanium ore, 2 copper ore, 1 platinum nugget', once: true,
      apply: () => { state.flags.drill = true; return 'Ruess bolts a new drill head onto the Pallas. "Do not drill anything I am standing on."'; } });
    if (!state.flags.kitchen) {
      out.push({ key: 'kitchen', label: 'Kitchen refit', desc: 'A stove, a sink and a cold-locker fridge for the farmhouse. Cook meals from your own harvest.', price: 2500, lumber: 60, needs: '60 lumber', once: true,
        apply: () => { state.flags.kitchen = true; boxes(state); return 'Ruess refitted your kitchen. The fridge hums like a small engine.'; } });
    }
    if (!state.flags.greenhouse) {
      out.push({ key: 'greenhouse', label: 'Greenhouse repair', desc: 'Crops grow in the greenhouse in any season.', price: 4000, lumber: 120, needs: '120 lumber', once: true,
        apply: () => { state.flags.greenhouse = true; return 'Ruess repaired the greenhouse. It is yours to plant.'; } });
    }
  } else if (shopId === 'cafe') {
    sell('tea', 30); sell('soup', 80); sell('pie', 150);
  } else if (shopId === 'grandmarket') {             // the Main deck's vending terminals: imports at a premium
    const gm = (id, price) => sell(id, price, { key: 'gm_' + id });
    for (const c of Object.values(CROPS)) if (c.seasons.length === 1 && c.seasons[0] === state.cal.season) gm(`seed_${c.id}`, Math.round(c.bag * 1.25));
    for (const k of Object.keys(FRUIT_TREES)) gm(`sapling_${k}`, 2800);
    gm('battery', 220); gm('honeycomb', 180); gm('chestnut', 90); gm('tonic', 550);
  } else if (shopId === 'barge') {
    if (!state.flags['plum_moraine_y' + state.cal.year]) sell('star_plum', 8000, { once: true, apply: () => { addItem(state, 'star_plum', 1); state.flags['plum_moraine_y' + state.cal.year] = true; state.flags.plum_moraine = true; return 'Moraine weighs the star-plum in her palm before she lets it go. "One a year. My grandmother\'s rule, not mine."'; } });
    sell('seed_moonflower', 1000); sell('tonic', 500);
    if (!countItem(state, 'pendant') && !state.flags.partner) sell('pendant', 3000, { once: true });
  } else if (shopId === 'clinic') {
    out.push({ key: 'checkup', label: 'Check-up and a rest', desc: 'Dr. Mori looks you over. Restores all stamina.', price: 150, once: true,
      stop: () => (p.stamina >= p.maxStamina ? 'You are in fine shape. Doctor\'s orders: go outside.' : null),
      apply: () => { p.stamina = p.maxStamina; return 'You feel rested and well.'; } });
    sell('tonic', 500);
  }
  return out;
}
// Why the player cannot buy n of this, or null.
function refusal(state, d, n) {
  const why = d.stop ? d.stop(n) : null;
  if (why) return why;
  if (state.player.money < d.price * n) return `You need ${d.price * n} cr.`;
  for (const [id, k] of d.req || []) if (countItem(state, id) < k) return `You need ${k} ${lower(id)} in your rucksack.`;
  if (d.lumber && state.stock.lumber < d.lumber * n) return `You need ${d.lumber * n} lumber.`;
  if (d.give && !canAdd(state, d.give, n)) return FULL;
  return null;
}
export function shopStock(state, shopId) {
  if (!own(SHOPS, shopId)) return [];
  return shelves(state, shopId).map((d) => {
    const why = refusal(state, d, 1), e = { key: d.key, label: d.label, desc: d.desc, price: d.price };
    if (d.needs) e.needs = d.needs;
    e.can = !why;
    if (why) e.why = why;
    return e;
  });
}
export function buy(state, shopId, key, n = 1) {
  if (!own(SHOPS, shopId)) return fail('There is no such shop.');
  const d = shelves(state, shopId).find((e) => e.key === key);
  if (!d) return fail('That is not for sale here today.');
  n = d.once || !int(n) || n < 1 ? 1 : Math.min(n, STACK);
  const why = refusal(state, d, n);
  if (why) return fail(why);
  state.player.money -= d.price * n;
  for (const [id, k] of d.req || []) removeItem(state, id, k);
  if (d.lumber) state.stock.lumber -= d.lumber * n;
  if (d.apply) return { ok: true, msg: d.apply(n) };
  addItem(state, d.give, n);
  return { ok: true, msg: `Bought ${n > 1 ? `${n} × ` : ''}${d.label}.` };
}

// ---------------------------------------------------------------- people

function npcOf(state, id) {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9_]{0,23}$/.test(id) || id === 'sato') return null;
  if (!Object.hasOwn(state.npc, id)) state.npc[id] = { love: 0, talked: false, gifted: false, met: false };
  return state.npc[id];
}
export function talk(state, npcId) {
  const n = npcOf(state, npcId);
  if (!n) return fail('There is nobody there.', { first: false });
  const first = !n.talked;
  if (first) n.love = clamp(n.love + 2, 0, 100);
  n.talked = true; n.met = true;
  return { ok: true, first };
}
export function gift(state, npcId, slot, tier, isBirthday) {
  const n = npcOf(state, npcId), s = slotItem(state, slot), no = (msg) => fail(msg, { delta: 0 });
  if (!n) return no('There is nobody there.');
  if (!s) return no('You have nothing in your hands to give.');
  if (ITEMS[s.id].kind === 'tool') return no('You cannot give your tools away.');
  if (n.gifted) return no('One gift a day is plenty.');
  const before = n.love, name = ITEMS[s.id].name;
  n.love = clamp(n.love + (own(GIFT, tier) ? GIFT[tier] : GIFT.neutral) * (isBirthday ? 3 : 1), 0, 100);
  n.gifted = true; n.met = true;
  takeFromSlot(state, slot, 1);
  state.stats.gifts++;
  return { ok: true, msg: `You gave the ${name.toLowerCase()}.`, delta: n.love - before };
}
export function addLove(state, npcId, n) {
  const who = npcOf(state, npcId);
  if (!who || !Number.isFinite(n)) return fail('There is nobody there.');
  who.love = clamp(Math.round(who.love + n), 0, 100);
  return { ok: true };
}
export function setFlag(state, key, value = true) {
  if (typeof key !== 'string' || !key || key === '__proto__') return fail('That is not a flag.');
  state.flags[key] = value;
  return { ok: true };
}

// ---------------------------------------------------------------- the ruins (state.mine)

// A site on Earth's surface: 0 open, 1 rubble pile, 2 the way down (found), 3 wall. One pile hides the way down.
// Two kinds of site share this machinery: mode 'earth' (the Old World, reached by Maris's shuttle: rubble,
// relics, creatures, hazard haze) and mode 'belt' (the asteroid belt, flown from Vashti's hangar: rocks to
// drill for ore, a jump buoy to go deeper, no creatures, no haze).
export function enterMine(state, depth = 1, mode = 'earth') {
  depth = int(depth) && depth > 0 ? Math.min(depth, 999) : 1;
  const belt = mode === 'belt';
  const w = MINE_W, h = MINE_H, at = (x, y) => y * w + x, entry = at(...ENTRY);
  const cells = Array.from({ length: w * h }, () => { const r = rnd(state); return r < 0.12 ? 3 : r < 0.40 ? 1 : 0; });
  cells[entry] = 0;
  // Anything the walls cut off from the lift becomes wall too.
  const seen = new Set([entry]), todo = [entry];
  while (todo.length) {
    const i = todo.pop(), x = i % w, y = (i - x) / w;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, j = at(nx, ny);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(j) || cells[j] === 3) continue;
      seen.add(j); todo.push(j);
    }
  }
  cells.forEach((c, i) => { if (!seen.has(i)) cells[i] = 3; });
  let piles = cells.flatMap((c, i) => (c === 1 ? [i] : []));
  const open = cells.flatMap((c, i) => (c === 0 && i !== entry ? [i] : []));
  if (!piles.length) { const i = open.length ? open.splice(rint(state, open.length), 1)[0] : entry - 1; cells[i] = 1; piles = [i]; }
  const hatch = piles[rint(state, piles.length)];
  const monsters = [], haz = new Array(w * h).fill(0);
  if (!belt) {
    for (let n = Math.min(depth === 1 ? 1 + rint(state, 3) : 2 + rint(state, 3) + Math.floor(depth / 4), 6, open.length); n > 0; n--) {
      const i = open.splice(rint(state, open.length), 1)[0];
      monsters.push({ x: i % w, y: (i - (i % w)) / w, kind: rnd(state) < 0.6 ? 'crawler' : 'drone', hp: 1 + rint(state, 2) });
    }
    // Haze: patches of toxic (1) or, from depth 4, radioactive (2) air on open ground, never on the landing pad.
    for (let n = Math.min(2 + Math.floor(depth / 3), 6); n > 0 && open.length; n--) {
      const c = open[rint(state, open.length)], kind = depth >= 4 && rnd(state) < 0.45 ? 2 : 1, cx = c % w, cy = (c - cx) / w;
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) if (x >= 0 && y >= 0 && x < w && y < h && cells[at(x, y)] === 0 && Math.abs(x - ENTRY[0]) + Math.abs(y - ENTRY[1]) > 2) haz[at(x, y)] = kind;
    }
  }
  if (belt) state.stats.deepestBelt = Math.max(state.stats.deepestBelt || 0, depth); else state.stats.deepest = Math.max(state.stats.deepest, depth);
  // Depth 10 and 20 of the Old World each hide a star-plum in the pile farthest from the landing (once ever).
  let star = -1;
  if (!belt && (depth === 10 || depth === 20) && !state.flags['plum_ruins' + depth]) {
    let bd = -1; for (const i of piles) { const d = Math.abs((i % w) - ENTRY[0]) + Math.abs(Math.floor(i / w) - ENTRY[1]); if (d > bd) { bd = d; star = i; } }
  }
  state.mine = { mode: belt ? 'belt' : 'earth', depth, floor: depth, w, h, cells, monsters, hatch, star, haz };
  return state.mine;
}
// The belt's ores: [id, first sector, weight there, weight gained a sector further out (to sector 20)].
// Near the colony it is scrap, nickel-iron, silica and comet ice; copper, titanium, alloy, platinum and
// crystal come in further out, and star-metal a little more often the deeper you go. The rest is bare rock.
export const BELT_ORES = [
  ['scrap', 1, 0.14, -0.006], ['nickel_iron', 1, 0.2, -0.004], ['silica', 1, 0.12, -0.002], ['comet_ice', 1, 0.16, -0.002],
  ['copper', 2, 0.1, 0.001], ['titanium', 4, 0.07, 0.002], ['alloy', 5, 0.1, 0.002], ['platinum', 8, 0.035, 0.002],
  ['crystal', 10, 0.06, 0.003], ['star_metal', 3, 0.025, 0.0015],
];
// The chance of each ore from one rock in a sector (they sum to under 1; the rest is nothing).
export function beltOdds(depth) {
  const d = Math.max(1, Math.min(20, int(depth) ? depth : 1)), out = {};
  for (const [id, from, w, step] of BELT_ORES) if (d >= from) out[id] = Math.max(0.01, w + step * (d - from));
  return out;
}
// What a pile or a monster gives up at this depth.
function find(state, depth, mode = 'earth') {
  const r = rnd(state);
  if (mode === 'belt') {                             // ore by sector depth: one roll against the odds table
    let acc = 0; for (const [id, p] of Object.entries(beltOdds(depth))) { acc += p; if (r < acc) return id; }
    return null;
  }
  if (r < 0.11) {
    const pool = RELICS.filter((x) => x.depth <= depth);
    return pool[pick(state, pool.map((_, i) => 1 / (i + 1)))].id;   // cheaper ones more often
  }
  if (r < 0.28) return 'scrap';                     // Earth rubble gives scrap; good ore comes from the belt
  return r < 0.50 ? 'scrap' : r < 0.56 ? 'battery' : null;
}
// Search a rubble pile (the name is from the first design, when this was a mine).
export function hitRock(state, x, y) {
  const m = state.mine, no = (msg) => fail(msg, { broke: false, gained: [], hatch: false });
  if (!m) return no('You are not in the ruins.');
  const c = int(x) && int(y) && x >= 0 && y >= 0 && x < m.w && y < m.h ? m.cells[y * m.w + x] : -1;
  if (c === 2) return no('The way down is open.');
  if (c !== 1) return no('There is nothing to search here.');
  const i = y * m.w + x, hatch = i === m.hatch, id = find(state, m.depth, m.mode);
  m.cells[i] = hatch ? 2 : 0;
  state.stats.searched++;
  const starHere = i === m.star && !state.flags['plum_ruins' + m.depth];
  const extra = m.mode === 'belt' && state.flags.drill && rnd(state) < DRILL_BONUS ? find(state, m.depth, 'belt') : null;   // the drill head pulls a second core now and then
  const res = take(state, [...(id ? [[id, 1]] : []), ...(extra ? [[extra, 1]] : []), ...(starHere ? [['star_plum', 1]] : [])], { ok: true, broke: true, gained: [], hatch });
  if (starHere && res.gained.some((g) => g.id === 'star_plum')) { state.flags['plum_ruins' + m.depth] = true; m.star = -1; res.star = true; res.msg = 'Under the rubble, in a sealed seed tin, a small fruit glowing violet: a star-plum.'; }
  if (hatch) res.msg = m.mode === 'belt' ? (res.gained.length ? `You drilled out ${lower(id)}, and behind the rock a jump buoy blinks.` : 'Behind the rock, a jump buoy blinks: the way to the next sector.') : res.gained.length ? `You found ${lower(id)}, and a way down.` : 'Under the rubble is a way down.';
  return spend(state, 1, res);
}
export function defeatMonster(state, index) {
  const m = state.mine;
  if (!m || !int(index) || !m.monsters[index]) return fail('There is nothing to fight here.', { gained: [] });
  m.monsters.splice(index, 1);
  state.stats.monsters++;
  const drop = rnd(state) < 0.35; rnd(state);
  return take(state, drop ? [['scrap', 1]] : [], { ok: true, gained: [] });
}
export function monsterHit(state) {
  state.player.stamina = Math.max(Math.min(1, state.player.stamina), state.player.stamina - 5);
  return { ok: true, msg: 'Something clipped the Pallas. You lost a little stamina.' };
}
export function leaveMine(state) { state.mine = null; return { ok: true }; }
export const enterBelt = (state, depth = 1) => enterMine(state, depth, 'belt');
// Juno Maris's courier shuttle to the Old World: 200 cr a trip, free once she is a good friend (5 hearts).
export const SHUTTLE_FARE = 200;
export const shuttleFare = (state) => (hearts(state, 'maris') >= 5 ? 0 : SHUTTLE_FARE);
export function takeShuttle(state, depth = 1) {
  const fare = shuttleFare(state);
  if (state.player.money < fare) return fail(`The shuttle costs ${fare} cr a trip.`);
  state.player.money -= fare; enterMine(state, depth, 'earth');
  return { ok: true, fare, msg: fare ? `You paid Maris ${fare} cr. Strap in.` : 'Maris waves away your money. "Friends fly free."' };
}
// Haze on the Old World: standing in it costs 1 stamina a tick (the UI ticks every few seconds), unless the Pallas has filters.
export function hazardAt(state, x, y) { const m = state.mine; return m && m.mode !== 'belt' && Array.isArray(m.haz) && int(x) && int(y) && x >= 0 && y >= 0 && x < m.w && y < m.h ? m.haz[y * m.w + x] || 0 : 0; }
export function hazardTick(state, x, y) {
  const h = hazardAt(state, x, y);
  if (!h) return { ok: true, drained: 0, hazard: 0 };
  if (state.flags.filters) return { ok: true, drained: 0, hazard: h, filtered: true };
  state.player.stamina = Math.max(0, state.player.stamina - 1);
  return { ok: true, drained: 1, hazard: h, fainted: state.player.stamina <= 0 };
}

// The Memory Room in the village hall.
export function donate(state, slot) {
  const s = slotItem(state, slot);
  if (!s) return fail('That slot is empty.', { first: false });
  const def = ITEMS[s.id];
  if (def.kind !== 'relic') return fail('The Memory Room only takes things from the old world.', { first: false });
  const first = !state.museum[s.id];
  state.museum[s.id] = (state.museum[s.id] || 0) + 1;
  takeFromSlot(state, slot, 1);
  if (first) state.player.money += 100;
  return { ok: true, first, msg: first ? `The ${def.name.toLowerCase()} goes on a shelf of its own. The hall gives you 100 cr in thanks.` : `Another ${def.name.toLowerCase()} for the collection.` };
}
export const museumCount = (state) => Object.keys(state.museum).length;

// ---------------------------------------------------------------- the lake, the hill

export function fish(state, place) {
  const no = (msg) => fail(msg, { gained: [] });
  if (!own(FISH_ODDS, place)) return no('There is no water here.');
  const it = selected(state);
  if (!it || it.id !== 'rod') return no(countItem(state, 'rod') ? 'Select the fishing rod first.' : 'You need a fishing rod. Seln sells one.');
  const level = state.player.toolLevel.rod, wet = state.weather === 'rain' || state.weather === 'storm';
  const [s, m, l] = FISH_ODDS[place], seasonal = SEASON_FISH[state.cal.season];
  // Better rods and rain move the odds from small fish to large and seasonal ones.
  const weights = [s * (1 - 0.25 * (level - 1)) * (wet ? 0.7 : 1), m, l * (1 + 0.5 * (level - 1)), (6 + 7 * (level - 1)) * (place === 'hill' ? 1.5 : 1) * (wet ? 1.5 : 1)];
  const king = rnd(state) < (wet ? 0.025 : 0.015) && place === 'hill' && level >= 2;
  const id = king ? 'fish_king' : ['fish_s', 'fish_m', 'fish_l', seasonal][pick(state, weights)];
  if (!addItem(state, id, 1).ok) return no('Your rucksack is full, so you let it go.');
  state.stats.fishCaught++;
  state.fishLog[id] = (state.fishLog[id] || 0) + 1;
  return spend(state, toolCost(state, 1), { ok: true, msg: king ? 'Old Hollin himself! The whole village will hear of this.' : `You caught a ${lower(id)}.`, gained: [{ id, n: 1 }] });
}

// Three to six things a day, on 14 spots; rarer kinds turn up less often.
function rollForage(state) {
  const spots = Array.from({ length: FORAGE_SPOT_COUNT }, (_, i) => i), kinds = FORAGE[state.cal.season];
  state.forage = [];
  for (let n = 3 + rint(state, 4); n > 0; n--) state.forage.push({ spot: spots.splice(rint(state, spots.length), 1)[0], id: kinds[pick(state, kinds.map((k) => k[1]))][0] });
  state.forage.sort((a, b) => a.spot - b.spot);
  if (!state.flags.plum_hill && state.cal.day === starPlumDay(state)) state.forage.push({ spot: STAR_SPOT, id: 'star_plum' });
}
// The one day each season the hill's star-plum shows itself (until it is found).
export const starPlumDay = (state) => 3 + (((state.seed >>> 0) % 997) + state.cal.year * 7 + state.cal.season * 11) % 25;
export function pickForage(state, spot) {
  const i = state.forage.findIndex((f) => f.spot === spot);
  if (i < 0) return fail('There is nothing growing here today.', { gained: [] });
  const id = state.forage[i].id;
  const put = stash(state, id, 1); if (!put.ok) return fail(FULL, { gained: [] });
  state.forage.splice(i, 1);
  ensure(state).foraged[id] = (state.foraged[id] || 0) + 1;
  if (id === 'star_plum') state.flags.plum_hill = true;
  return { ok: true, msg: `You picked a ${lower(id)}${put.basket ? ' into the basket' : ''}.`, gained: [{ id, n: 1 }], basket: put.basket };
}


// ---------------------------------------------------------------- the basket (2026-11-18)
// Held in the hand, the basket catches picked produce (30 in all, one stack a kind): state.player.basket.
const basketList = (state) => ensure(state).player.basket;
export const basketTotal = (state) => basketList(state).reduce((a, b) => a + (b ? b.n : 0), 0);
export const basketHeld = (state) => { const s = selected(state); return !!s && s.id === 'basket'; };
const basketRoom = (state, id) => (itemOf(id) && PRODUCE.has(ITEMS[id].kind) ? BASKET_CAP - basketTotal(state) : 0);
// Picked things go to the basket when it is held and has room, else to the rucksack.
function stash(state, id, n) {
  if (basketHeld(state) && basketRoom(state, id) >= n) {
    const b = basketList(state), line = b.find((x) => x.id === id);
    if (line) line.n += n; else b.push({ id, n });
    return { ok: true, basket: true };
  }
  const r = addItem(state, id, n);
  return { ok: r.ok, basket: false, msg: r.ok && basketHeld(state) && PRODUCE.has(ITEMS[id].kind) ? 'The basket is full, so it went in the rucksack.' : undefined };
}
// E at the shipping bin with the basket in hand: the whole basket goes in.
export function shipBasket(state) {
  if (!countItem(state, 'basket')) return fail('You do not have a basket.');
  const b = basketList(state); if (!b.length) return fail('The basket is empty.');
  let n = 0;
  for (const { id, n: k } of b) { if (!ITEMS[id].sell) continue; const line = state.bin.find((x) => x.id === id); if (line) line.n += k; else state.bin.push({ id, n: k }); n += k; }
  state.player.basket = b.filter((x) => !ITEMS[x.id].sell);
  if (!n) return fail('Nobody buys what is in the basket.');
  state.stats.shippedItems += n;
  return { ok: true, msg: `You tipped the basket into the bin: ${n} thing${n > 1 ? 's' : ''}. Paid at dawn.`, n };
}
// Take a line (or n of it) out of the basket into the rucksack.
export function basketTake(state, index, n) {
  const b = basketList(state), line = int(index) && index >= 0 ? b[index] : null;
  if (!line) return fail('There is nothing there in the basket.');
  if (n === undefined || n === null) n = line.n;
  n = Math.min(Math.max(1, int(n) ? n : 1), line.n, room(state, line.id));
  if (n < 1) return fail(FULL);
  addItem(state, line.id, n); line.n -= n; if (!line.n) b.splice(index, 1);
  return { ok: true, msg: `Took ${n} × ${ITEMS[line.id].name} out of the basket.` };
}

// ---------------------------------------------------------------- things set down on the land
// Field chests (farm or hill), solar chargers (farm) and fruit trees (farm) each take one tile.
// The UI checks the ground itself (free grass or dirt, not the field, not a path into a door).
export const PLACE_MAPS = { field_chest: ['farm', 'hill'], solar_panel: ['farm'] };
const at = (list, map, x, y) => list.findIndex((o) => o.map === map && o.x === x && o.y === y);
export const chestAt = (state, map, x, y) => at(ensure(state).chests, map, x, y);
export const panelAt = (state, map, x, y) => at(ensure(state).panels, map, x, y);
export const fruitTreeAt = (state, map, x, y) => at(ensure(state).fruitTrees, map, x, y);
export const occupied = (state, map, x, y) => chestAt(state, map, x, y) >= 0 || panelAt(state, map, x, y) >= 0 || fruitTreeAt(state, map, x, y) >= 0;
// Space with a field chest or a solar charger in hand.
export function placeItem(state, map, x, y) {
  const s = selected(state);
  if (!s || !own(PLACE_MAPS, s.id)) return fail('Hold a field chest or a solar charger to set it down.');
  if (!int(x) || !int(y) || x < 0 || y < 0 || x > 99 || y > 99) return fail('There is no room there.');
  if (!PLACE_MAPS[s.id].includes(map)) return fail(s.id === 'solar_panel' ? 'The charger goes on your farm.' : 'Field chests go on the farm or the hill.');
  if (occupied(state, map, x, y)) return fail('Something is already standing there.');
  const id = s.id; takeFromSlot(state, state.player.sel, 1);
  if (id === 'field_chest') { state.chests.push({ map, x, y, items: new Array(CHEST_SIZE).fill(null) }); return { ok: true, msg: 'You set the field chest down. E opens it; an axe picks it up when it is empty.', kind: 'chest', index: state.chests.length - 1 }; }
  state.panels.push({ map, x, y, slots: [null, null] });
  return { ok: true, msg: 'The solar charger unfolds and tilts to the sun-line. Put empty batteries in with E.', kind: 'charger', index: state.panels.length - 1 };
}
// The axe on an empty chest or charger picks it back up.
export function pickUpPlaced(state, map, x, y) {
  const s = selected(state); if (!s || s.id !== 'axe') return fail('Use the axe to pry it up.');
  const c = chestAt(state, map, x, y), p = panelAt(state, map, x, y);
  if (c < 0 && p < 0) return fail('There is nothing to pick up there.');
  const id = c >= 0 ? 'field_chest' : 'solar_panel';
  if (c >= 0 && state.chests[c].items.some(Boolean)) return fail('Empty the chest before you move it.');
  if (p >= 0 && state.panels[p].slots.some(Boolean)) return fail('Take the batteries out of the charger first.');
  if (room(state, id) < 1) return fail(FULL);
  if (c >= 0) state.chests.splice(c, 1); else state.panels.splice(p, 1);
  addItem(state, id, 1);
  return { ok: true, msg: `You picked up the ${lower(id)}.`, kind: c >= 0 ? 'chest' : 'charger' };
}
// E at a charger: take charged batteries out, or put empty ones in.
export function useCharger(state, index) {
  const pnl = int(index) ? ensure(state).panels[index] : null;
  if (!pnl) return fail('There is no charger there.', { gained: [] });
  const full = pnl.slots.filter((b) => b === 'battery_full').length;
  if (full) {
    const n = Math.min(full, room(state, 'battery_full'));
    if (n < 1) return fail(FULL, { gained: [] });
    let k = n; pnl.slots = pnl.slots.map((b) => (b === 'battery_full' && k-- > 0 ? null : b));
    addItem(state, 'battery_full', n);
    return { ok: true, msg: `You took ${n} charged batter${n > 1 ? 'ies' : 'y'} out of the charger.`, gained: [{ id: 'battery_full', n }] };
  }
  const free = pnl.slots.filter((b) => !b).length, have = countItem(state, 'battery');
  if (!free) return fail('Both batteries are charging. Come back in the morning.', { gained: [] });
  if (!have) return fail(pnl.slots.some(Boolean) ? 'One battery is charging. Bring an empty one to fill the other slot.' : 'The charger is empty. Bring an empty battery; it will be charged by morning.', { gained: [] });
  const n = Math.min(free, have); removeItem(state, 'battery', n);
  let k = n; pnl.slots = pnl.slots.map((b) => (!b && k-- > 0 ? 'battery' : b));
  return { ok: true, msg: `You clipped ${n} empty batter${n > 1 ? 'ies' : 'y'} into the charger. Charged by morning, if the sun-line is bright.`, gained: [] };
}

// ---------------------------------------------------------------- fruit trees
export const treeAge = (state, t) => absDay(state) - t.planted;
// 0 sapling, 1 young, 2 grown (from TREE_DAYS on).
export const treeStage = (state, t) => { const a = treeAge(state, t); return a >= TREE_DAYS ? 2 : a >= 10 ? 1 : 0; };
export const fruitReady = (state, t) => !!t && own(FRUIT_TREES, t.kind) && treeStage(state, t) === 2 && FRUIT_TREES[t.kind].season === state.cal.season && t.picked !== absDay(state);
// Space with a sapling in hand on free farm grass.
export function plantTree(state, map, x, y) {
  const s = selected(state), def = s && itemOf(s.id);
  if (!def || def.kind !== 'sapling') return fail('Hold a sapling to plant it.');
  if (map !== 'farm') return fail('Fruit trees go on your own farm.');
  if (!int(x) || !int(y) || x < 0 || y < 0 || x > 99 || y > 99) return fail('There is no room there.');
  if (state.cal.season === 3) return fail('The ground is frozen. Plant it in spring.');
  if (occupied(state, map, x, y)) return fail('Something is already standing there.');
  takeFromSlot(state, state.player.sel, 1);
  state.fruitTrees.push({ map, x, y, kind: def.tree, planted: absDay(state), picked: -1 });
  return { ok: true, msg: `You planted the ${def.name.toLowerCase()}. It will bear fruit in ${TREE_DAYS} days.`, index: state.fruitTrees.length - 1 };
}
export function pickFruit(state, index) {
  const t = int(index) ? ensure(state).fruitTrees[index] : null;
  if (!t) return fail('There is no tree there.', { gained: [] });
  const def = FRUIT_TREES[t.kind];
  if (treeStage(state, t) < 2) return fail(`The ${def.name.toLowerCase()} is still growing. ${TREE_DAYS - treeAge(state, t)} more days.`, { gained: [] });
  if (state.cal.season !== def.season) return fail(`The ${def.name.toLowerCase()} fruits in ${SEASONS[def.season].toLowerCase()}.`, { gained: [] });
  if (t.picked === absDay(state)) return fail('You picked it today. More tomorrow.', { gained: [] });
  const put = stash(state, def.fruit, 1); if (!put.ok) return fail(FULL, { gained: [] });
  t.picked = absDay(state);
  return { ok: true, msg: `You picked a ${lower(def.fruit)}${put.basket ? ' into the basket' : ''}.`, gained: [{ id: def.fruit, n: 1 }], basket: put.basket };
}
// Wild fruit trees on the maps (maps.js marks them; key 'map:propIndex'). Village trees give one fruit
// and need longer between pickings: they are everyone's.
export function wildReady(state, key, kind, shared = false) {
  const d = WILD_TREES[kind]; if (!d || d.season !== state.cal.season) return false;
  const last = (state.wildPicked || {})[key]; return last == null || absDay(state) - last >= d.every + (shared ? 2 : 0);
}
export function pickWild(state, key, kind, shared = false) {
  if (typeof key !== 'string' || !key || !own(WILD_TREES, kind)) return fail('There is nothing to pick there.', { gained: [] });
  const d = WILD_TREES[kind];
  if (d.season !== state.cal.season) return fail(`This tree fruits in ${SEASONS[d.season].toLowerCase()}.`, { gained: [] });
  if (!wildReady(state, key, kind, shared)) return fail('Someone has picked it clean. Come back in a few days.', { gained: [] });
  const n = shared ? 1 : 1 + Math.floor(rnd(state) * d.most);
  const put = stash(state, d.fruit, n); if (!put.ok) return fail(FULL, { gained: [] });
  (state.wildPicked ||= {})[key] = absDay(state);
  return { ok: true, msg: `You picked ${n} ${n > 1 ? lower(d.fruit) + 's' : lower(d.fruit)}${put.basket ? ' into the basket' : ''}.`, gained: [{ id: d.fruit, n }], basket: put.basket };
}
// The axe takes out a sapling or a young tree (nothing is refunded); a grown tree stays.
export function removeTree(state, index) {
  const t = int(index) ? ensure(state).fruitTrees[index] : null;
  if (!t) return fail('There is no tree there.');
  const s = selected(state); if (!s || s.id !== 'axe') return fail('Use the axe to dig it out.');
  if (treeStage(state, t) === 2) return fail('The tree is too well rooted now. Leave it to fruit.');
  state.fruitTrees.splice(index, 1);
  return { ok: true, msg: 'You dug the young tree out. The ground is free again.' };
}

// ---------------------------------------------------------------- the Terrace Onsen
export const onsenOpen = (state) => state.cal.minute >= DAY_START && state.cal.minute < DAY_END - 60;
export const satoBirthday = (state) => state.cal.season === SATO_BIRTHDAY.season && state.cal.day === SATO_BIRTHDAY.day;
// An hour in the hot spring: stamina full, and the tools are lighter for the rest of the day.
export function soak(state) {
  if (!onsenOpen(state)) return fail('The onsen takes its last bathers at eleven. Come back in the morning.');
  const free = satoBirthday(state);
  if (!free && state.player.money < ONSEN_PRICE) return fail(`A soak costs ${ONSEN_PRICE} cr.`);
  if (!free) state.player.money -= ONSEN_PRICE;
  tick(state, 60);
  state.player.stamina = state.player.maxStamina;
  state.flags.onsenDay = absDay(state);
  state.stats.soaks = (state.stats.soaks || 0) + 1;
  return { ok: true, free, msg: free ? 'Happy birthday! The keeper waves you in for free. An hour in the hot water: you feel brand new, and your tools feel lighter today.' : 'An hour in the hot water, warmed by the colony\'s heat exchangers. Stamina restored, and your tools feel lighter today.' };
}

// ---------------------------------------------------------------- Field-units (leased robots)
export const robotLevel = (r) => Math.min(5, 1 + Math.floor((r.days || 0) / 5));
export const robotReach = (r) => ({ water: 24, harvest: 12 }[r.job] || 0) + 4 * (robotLevel(r) - 1);
export const robotCost = (r) => (r.job === 'rest' ? 0 : ({ water: 25, harvest: 30, animals: 30 }[r.job] || 0) + 2 * (robotLevel(r) - 1));
const robotOf = (state, i) => (int(i) ? ensure(state).robots[i] || null : null);
export function robotMood(state, i) {
  const r = robotOf(state, i); if (!r) return '';
  const lines = ROBOT_MOODS[r.charge <= 0 ? 'flat' : r.charge < 30 && r.job !== 'rest' ? 'tired' : r.mood] || ROBOT_MOODS.happy;
  let h = 7; for (const c of r.name + absDay(state)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return lines[h % lines.length];
}
export function setRobotJob(state, i, job) {
  const r = robotOf(state, i); if (!r) return fail('There is no robot there.');
  if (!own(ROBOT_JOBS, job)) return fail('Field-units know four jobs: water, harvest, animals and rest.');
  r.job = job; r.mood = job === 'rest' ? 'bored' : r.mood === 'bored' ? 'happy' : r.mood;
  return { ok: true, msg: job === 'rest' ? `${r.name} settles down for a rest.` : `${r.name} beeps: job set to ${ROBOT_JOBS[job].toLowerCase()}. It will start tomorrow morning.` };
}
export function renameRobot(state, i, name) {
  const r = robotOf(state, i); if (!r) return fail('There is no robot there.');
  const clean = typeof name === 'string' ? name.replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, 16) : '';
  if (!clean) return fail('A robot needs a name with a letter in it.');
  r.name = clean;
  return { ok: true, msg: `The Field-unit's display flickers: ${clean}.` };
}
// E with a charged battery: +60 charge, and the empty battery comes back.
export function chargeRobot(state, i) {
  const r = robotOf(state, i); if (!r) return fail('There is no robot there.');
  if (!countItem(state, 'battery_full')) return fail(countItem(state, 'battery') ? 'That battery is flat. Charge it in a solar charger first.' : 'You need a charged battery.');
  if (r.charge >= 100) return fail(`${r.name} is fully charged already.`);
  removeItem(state, 'battery_full', 1);
  addItem(state, 'battery', 1);           // there is always room: the charged one just left
  r.charge = Math.min(100, r.charge + 60);
  if (r.mood === 'tired' || r.mood === 'flat') r.mood = 'happy';
  return { ok: true, msg: `${r.name} whirrs happily. Charge ${r.charge}%. You keep the empty battery.` };
}
// The morning's work, in order of the robots: [{ name, job, done, used, charge, short, levelUp }].
function robotsWork(state, notes) {
  const out = [], fields = [state.fields.farm, ...(state.flags.greenhouse ? [state.fields.greenhouse] : [])];
  for (const r of ensure(state).robots) {
    const cost = robotCost(r), rec = { name: r.name, job: r.job, done: 0, used: 0, charge: r.charge, short: false, levelUp: false };
    out.push(rec);
    if (r.job === 'rest' || !own(ROBOT_JOBS, r.job)) { r.mood = 'bored'; r.done = 0; continue; }
    if (r.charge <= 0) { r.mood = 'flat'; r.done = 0; rec.short = true; notes.push(`${r.name} has a flat battery and did no work. Give it a charged battery.`); continue; }
    let full = r.job === 'animals' ? state.animals.length + (state.eggs > 0 ? 1 : 0) : robotReach(r);
    const cap = r.charge >= cost ? full : Math.floor(full * r.charge / cost);
    let done = 0, extra = '';
    if (r.job === 'water') {
      for (const f of fields) for (const t of f.tiles) { if (done >= cap) break; if (t.till && t.crop && !t.crop.dead && !t.wet) { t.wet = true; done++; } }
      extra = `watered ${done} plant${done === 1 ? '' : 's'}`;
    } else if (r.job === 'harvest') {
      const got = {};
      for (const f of fields) for (const t of f.tiles) {
        if (done >= cap) break;
        if (!t.crop || t.crop.dead || !own(CROPS, t.crop.id) || t.crop.age < CROPS[t.crop.id].days) continue;
        const c = CROPS[t.crop.id], line = state.bin.find((b) => b.id === c.id);
        if (line) line.n++; else state.bin.push({ id: c.id, n: 1 });
        got[c.id] = (got[c.id] || 0) + 1; done++;
        if (c.regrow) t.crop.age = c.days - c.regrow; else t.crop = null;
      }
      extra = done ? `harvested ${Object.entries(got).map(([id, n]) => `${n} ${n > 1 ? CROPS[id].plural : CROPS[id].name.toLowerCase()}`).join(', ')} into the shipping bin` : 'found nothing ripe';
    } else {
      let fed = 0, eggs = 0, out = false;
      for (const a of state.animals) {
        if (done >= cap) break;
        const food = HOUSING[a.kind].food; if (a.fed) continue;
        if (state.stock[food] < 1) { out = true; continue; }
        a.fed = true; state.stock[food]--; fed++; done++;
      }
      if (state.eggs > 0 && done < cap) { eggs = state.eggs; const line = state.bin.find((b) => b.id === 'egg'); if (line) line.n += eggs; else state.bin.push({ id: 'egg', n: eggs }); state.eggs = 0; done++; }
      extra = `fed ${fed} animal${fed === 1 ? '' : 's'}${eggs ? ` and put ${eggs} egg${eggs > 1 ? 's' : ''} in the bin` : ''}${out ? ' (the feed or fodder ran out; Corran sells more)' : ''}`;
      if (!state.animals.length) extra = 'found no animals to tend';
    }
    const used = !done ? 0 : cap < full && done >= cap ? r.charge : Math.min(r.charge, done >= full ? cost : Math.max(4, Math.round(cost * done / Math.max(1, full))));
    r.charge -= used; rec.done = r.done = done; rec.used = used; rec.charge = r.charge;
    rec.short = cap < full && done >= cap;
    if (done) { const before = robotLevel(r); r.days = (r.days || 0) + 1; rec.levelUp = robotLevel(r) > before; }
    r.mood = rec.levelUp ? 'proud' : rec.short ? 'tired' : done ? 'happy' : 'idle';
    notes.push(`${r.name} ${extra}${rec.short ? ', then its battery ran out' : ''}. Battery ${r.charge}%.`);
    if (rec.levelUp) notes.push(`${r.name} is now skill level ${robotLevel(r)}.`);
  }
  return out;
}
// The chargers, overnight: sunny days charge two batteries, rain or snow one, a storm none.
function chargeOvernight(state, weather, notes) {
  let n = 0;
  for (const p of ensure(state).panels) {
    let k = { sun: 2, rain: 1, snow: 1, storm: 0 }[weather] ?? 0;
    p.slots = p.slots.map((b) => (b === 'battery' && k-- > 0 ? (n++, 'battery_full') : b));
  }
  if (n) notes.push(`The solar charger${state.panels.length > 1 ? 's' : ''} charged ${n} batter${n > 1 ? 'ies' : 'y'}.`);
  else if (weather === 'storm' && state.panels.some((p) => p.slots.includes('battery'))) notes.push('The storm hid the sun-line: the chargers did nothing.');
}


// ---------------------------------------------------------------- star-plums (one-time sources)
export const starPlumsFound = (state) => STAR_PLUM_SOURCES.filter((k) => state.flags['plum_' + k]).length;
// Give the star-plum of a source once. With { storage: true } a full rucksack sends it to the storage box.
export function grantPlum(state, src, { storage = false } = {}) {
  if (typeof src !== 'string' || !STAR_PLUM_SOURCES.includes(src)) return fail('There is no such gift.');
  if (state.flags['plum_' + src]) return fail('That star-plum was given long ago.');
  if (!addItem(state, 'star_plum', 1).ok) {
    const box = boxes(state).storage, k = box.findIndex((b) => !b);
    if (!storage || k < 0) return fail('Your rucksack is full. Make room and ask again.');
    box[k] = { id: 'star_plum', n: 1 };
  }
  state.flags['plum_' + src] = true;
  return { ok: true, msg: 'You received a star-plum.', gained: [{ id: 'star_plum', n: 1 }] };
}

// ---------------------------------------------------------------- the Grand Market (Main deck)
// It buys fine food (cooked dishes, and produce worth 300 cr or more) for a fifth more than the bin.
export function marketPrice(id) {
  const def = itemOf(id); if (!def || !def.sell) return 0;
  return def.kind === 'food' || (['crop', 'forage', 'fruit', 'fish', 'animal'].includes(def.kind) && def.sell >= 300) ? Math.round(def.sell * 1.2) : 0;
}
export function sellToMarket(state, slot, n) {
  const s = slotItem(state, slot); if (!s) return fail('That slot is empty.');
  const price = marketPrice(s.id); if (!price) return fail(`The Grand Market does not buy ${lower(s.id)}. Try the shipping bin.`);
  if (n === undefined || n === null) n = s.n;
  if (!int(n) || n < 1) return fail('Choose how many to sell.');
  n = Math.min(n, s.n); const id = s.id;
  takeFromSlot(state, slot, n); state.player.money += price * n;
  state.ledger.shipped[id] = (state.ledger.shipped[id] || 0) + n; state.ledger.earned += price * n;
  return { ok: true, msg: `Sold ${n} × ${ITEMS[id].name} for ${price * n} cr.`, earned: price * n };
}
// The viewing gallery: a seat facing the great window. After dark, once a day, 20 stamina back.
export function gallerySit(state) {
  const night = state.cal.minute >= 19 * 60, p = state.player;
  if (!night) return { ok: true, restored: 0, night: false };
  if (state.flags.galleryDay === absDay(state)) return { ok: true, restored: 0, night: true, again: true };
  state.flags.galleryDay = absDay(state);
  const before = p.stamina; p.stamina = Math.min(p.maxStamina, p.stamina + 20);
  return { ok: true, restored: p.stamina - before, night: true };
}

// Sato's Watch (the observatory in Eden Central): stargazing after 19:00, +20 stamina once a day.
// first: the first visit ever (she finds the plaque); general: the General's one-time visit, once he is her sweetheart or partner.
export function stargaze(state) {
  if (state.cal.minute < 19 * 60) return fail('The dome opens at seven in the evening.');
  const p = state.player, f = state.flags, first = !f.watchSeen, again = f.watchDay === absDay(state);
  const general = !first && !f.watchGeneral && (f.sweet === 'general' || f.partner === 'general');
  f.watchSeen = true; if (general) f.watchGeneral = true;
  let restored = 0;
  if (!again) { f.watchDay = absDay(state); const b = p.stamina; p.stamina = Math.min(p.maxStamina, p.stamina + 20); restored = p.stamina - b; }
  return { ok: true, first, general, restored, again };
}

// ---------------------------------------------------------------- the silo and the feed mill
export const isVeg = (id) => VEG.includes(id);
const MILLABLE = new Set([...VEG, 'chestnut', 'pine_nut']);
// Spare vegetables in the silo: 1 crop = 2 fodder.
export function siloAdd(state, slot, n) {
  const s = slotItem(state, slot); if (!s) return fail('That slot is empty.');
  if (!isVeg(s.id)) return fail('The silo takes vegetables for fodder.');
  if (n === undefined || n === null) n = s.n;
  if (!int(n) || n < 1) return fail('Choose how many.');
  n = Math.min(n, s.n); const id = s.id; takeFromSlot(state, slot, n); state.stock.fodder += 2 * n;
  return { ok: true, msg: `${n} × ${ITEMS[id].name} into the silo: +${2 * n} fodder.` };
}
export const millCount = (state) => ensure(state).mill.reduce((a, b) => a + b.n, 0);
// Ruess's titanium rollers double what the mill grinds in a night; his belt-glass racks grow the solar yard.
export const millCap = (state) => (state.flags.mill_rollers ? MILL_DAY_FAST : MILL_DAY);
export const yardSlots = (state) => (state.flags.yard_big ? YARD_SLOTS_BIG : YARD_SLOTS);
// Crops into the mill's hopper (up to 20 a day); ground overnight into hen feed.
export function millAdd(state, slot, n) {
  if (!state.flags.feed_mill) return fail('There is no feed mill yet. Ruess can build one.');
  const s = slotItem(state, slot); if (!s) return fail('That slot is empty.');
  if (!MILLABLE.has(s.id)) return fail('The mill grinds vegetables, chestnuts and pine nuts.');
  if (n === undefined || n === null) n = s.n;
  if (!int(n) || n < 1) return fail('Choose how many.');
  n = Math.min(n, s.n, millCap(state) - millCount(state));
  if (n < 1) return fail(`The hopper is full for today: ${millCap(state) === MILL_DAY ? 'twenty' : 'forty'} is all it grinds in a night.`);
  const id = s.id; takeFromSlot(state, slot, n);
  const line = state.mill.find((x) => x.id === id); if (line) line.n += n; else state.mill.push({ id, n });
  return { ok: true, msg: `${n} × ${ITEMS[id].name} in the hopper. Hen feed by morning.` };
}
// Corn 1 → 5 feed; any other vegetable, chestnut or pine nut 2 → 3 (an odd one waits for tomorrow).
function millOvernight(state, notes) {
  const m = ensure(state).mill; if (!m.length || !state.flags.feed_mill) return 0;
  let feed = 0, ground = 0, other = 0;
  for (const x of m) { if (x.id === 'corn') { feed += 5 * x.n; ground += x.n; } else other += x.n; }
  const pairs = Math.floor(other / 2); feed += 3 * pairs; ground += 2 * pairs;
  let left = other - 2 * pairs; state.mill = [];
  if (left) { const odd = m.find((x) => x.id !== 'corn'); state.mill.push({ id: odd.id, n: 1 }); }
  state.stock.feed += feed;
  if (feed) notes.push(`The feed mill ground ${ground} crop${ground > 1 ? 's' : ''} into ${feed} hen feed.`);
  return feed;
}

// ---------------------------------------------------------------- the solar yard (village)
// Leave empty batteries (30 cr each, up to 6); collect them charged: sun all, rain or snow half, storm none.
export function yardDeposit(state) {
  const y = ensure(state).solarYard, free = yardSlots(state) - y.slots.length, have = countItem(state, 'battery');
  if (y.slots.some((b) => b === 'battery_full')) return yardCollect(state);
  if (!have) return fail(y.slots.length ? `${y.slots.length} of your batteries are charging. Come back in the morning.` : 'Bring empty batteries: the yard charges them overnight for 30 cr each.');
  if (!free) return fail(`Your ${state.flags.yard_big ? 'ten' : 'six'} racks are full. Come back in the morning.`);
  const n = Math.min(free, have, Math.floor(state.player.money / YARD_PRICE));
  if (n < 1) return fail(`Charging costs ${YARD_PRICE} cr a battery.`);
  removeItem(state, 'battery', n); state.player.money -= n * YARD_PRICE;
  for (let i = 0; i < n; i++) y.slots.push('battery');
  return { ok: true, msg: `You racked ${n} empty batter${n > 1 ? 'ies' : 'y'} for ${n * YARD_PRICE} cr. Collect them tomorrow.` };
}
export function yardCollect(state) {
  const y = ensure(state).solarYard, full = y.slots.filter((b) => b === 'battery_full').length;
  if (!full) return fail('Nothing is charged yet.');
  const n = Math.min(full, room(state, 'battery_full')); if (n < 1) return fail(FULL);
  let k = n; y.slots = y.slots.filter((b) => !(b === 'battery_full' && k-- > 0));
  addItem(state, 'battery_full', n);
  return { ok: true, msg: `You collected ${n} charged batter${n > 1 ? 'ies' : 'y'}.`, gained: [{ id: 'battery_full', n }] };
}
function yardOvernight(state, weather, notes) {
  const y = ensure(state).solarYard, empty = y.slots.filter((b) => b === 'battery').length; if (!empty) return;
  const n = weather === 'sun' ? empty : weather === 'storm' ? 0 : Math.floor(empty / 2);
  let k = n; y.slots = y.slots.map((b) => (b === 'battery' && k-- > 0 ? 'battery_full' : b));
  notes.push(n ? `The solar yard charged ${n} of your batteries.` : 'The solar yard could not charge your batteries yesterday.');
}

// ---------------------------------------------------------------- the hydroponics garden (village)
export const hydroAt = (state, tower) => ensure(state).hydro.findIndex((h) => h.tower === tower);
export function hydroPlant(state, tower) {
  const k = hydroAt(state, tower); if (k < 0) return fail('Rent this tower from Seln\'s store.');
  const h = state.hydro[k]; if (h.crop) return fail('Something is already growing in this tower.');
  const s = selected(state), def = s && ITEMS[s.id];
  if (!def || def.kind !== 'seed' || !def.crop) return fail('Hold a bag of crop seeds to plant the tower.');
  removeItem(state, s.id, 1); h.crop = { id: def.crop, age: 0, dead: false }; h.planted = absDay(state);
  return { ok: true, msg: `You planted ${CROPS[def.crop].plural} in tower ${tower + 1}. The nutrient mist does the watering.` };
}
export function hydroHarvest(state, tower) {
  const k = hydroAt(state, tower); if (k < 0) return fail('Rent this tower from Seln\'s store.', { gained: [] });
  const h = state.hydro[k], c = h.crop && CROPS[h.crop.id];
  if (!c) return fail('The tower is empty. Plant a seed bag in it.', { gained: [] });
  if (h.crop.age < c.days) return fail(`The ${c.plural} need ${c.days - h.crop.age} more day${c.days - h.crop.age > 1 ? 's' : ''}.`, { gained: [] });
  const put = stash(state, c.id, 1); if (!put.ok) return fail(FULL, { gained: [] });
  if (c.regrow) h.crop.age = c.days - c.regrow; else h.crop = null;
  state.stats.harvested++;
  return { ok: true, msg: `You picked ${c.name.toLowerCase()} from tower ${tower + 1}.`, gained: [{ id: c.id, n: 1 }], basket: put.basket };
}

// ---------------------------------------------------------------- the night

// Always draws once, so the generator stays in step whatever the date.
function rollWeather(state, season, day) {
  const r = rnd(state);
  if (day === 1 || FESTIVAL_DAYS.some(([s, d]) => s === season && d === day)) return 'sun';
  if (season === 0) return r < 0.25 ? 'rain' : 'sun';
  if (season === 1) return r < 0.05 ? 'storm' : r < 0.20 ? 'rain' : 'sun';
  if (season === 2) return r < 0.20 ? 'rain' : 'sun';
  return r < 0.30 ? 'snow' : 'sun';
}
function dayAfter({ year, season, day }) {
  if (++day > DAYS_PER_SEASON) { day = 1; if (++season > 3) { season = 0; year++; } }
  return { year, season, day };
}

export function sleep(state, { collapsed = false } = {}) {
  const p = state.player, cal = state.cal, notes = [], shipped = [];
  // 1. Maris's collection is paid.
  let earned = 0;
  for (const { id, n } of state.bin) {
    const value = (ITEMS[id].sell || 0) * n;
    shipped.push({ id, n, value }); earned += value;
    state.ledger.shipped[id] = (state.ledger.shipped[id] || 0) + n;
  }
  state.bin = []; p.money += earned; state.ledger.earned += earned;
  ensure(state); chargeOvernight(state, state.weather, notes); yardOvernight(state, state.weather, notes); millOvernight(state, notes);
  for (const h of state.hydro) if (h.crop && own(CROPS, h.crop.id)) h.crop.age = Math.min(CROPS[h.crop.id].days, h.crop.age + 1);
  // The collector's star-plum: so many kinds shipped (it waits in the storage box if the rucksack is full).
  if (!state.flags.plum_collector && Object.keys(state.ledger.shipped).length >= COLLECTOR_KINDS && grantPlum(state, 'collector', { storage: true }).ok) notes.push(`Marrow sends a note: you have shipped ${COLLECTOR_KINDS} kinds of things, a village record. With it, a star-plum from the hall's own tree.`);
  // 2. Wet crops grow a day; the soil dries.
  for (const f of Object.values(state.fields)) {
    for (const t of f.tiles) {
      if (t.crop && !t.crop.dead && t.wet) t.crop.age = Math.min(CROPS[t.crop.id].days, t.crop.age + 1);
      t.wet = false;
    }
  }
  // 3. Animals: eggs from fed chickens, affection, a new day's flags.
  let hungry = 0;
  for (const a of state.animals) {
    if (a.fed && a.kind === 'chicken') state.eggs++;
    bump(a, a.fed ? 2 : -5);
    if (!a.fed) hungry++;
    a.fed = a.milked = a.brushed = a.talked = false;
  }
  if (hungry) notes.push(hungry === 1 ? 'One of your animals went hungry yesterday.' : `${hungry} of your animals went hungry yesterday.`);
  // 4. The date, and the weather that was forecast.
  const next = dayAfter(cal), seasonChanged = next.season !== cal.season, newYear = next.year !== cal.year;
  Object.assign(cal, next, { minute: DAY_START });
  state.weather = state.weatherTomorrow;
  const after = dayAfter(cal);
  state.weatherTomorrow = rollWeather(state, after.season, after.day);
  if (newYear) notes.push(`Year ${cal.year} begins.`);
  if (seasonChanged) notes.push(`${SEASONS[cal.season]} has come to Willowfall.`);
  if (seasonChanged && state.hydro.length) { state.hydro = []; notes.push('Your hydroponic tower rentals ended with the season. Seln will rent them again.'); }
  notes.push(WEATHER_NOTE[state.weather]);
  // 5. Out-of-season crops die outdoors; rain waters the field at dawn; weeds creep back.
  const farm = state.fields.farm, died = new Set(), rain = state.weather === 'rain' || state.weather === 'storm';
  for (const t of farm.tiles) {
    if (seasonChanged && t.crop && !t.crop.dead && !CROPS[t.crop.id].seasons.includes(cal.season)) { t.crop.dead = true; died.add(t.crop.id); }
    if (rain && t.till) t.wet = true;
    if (!t.till && !t.crop && !t.obj && cal.season !== 3 && rnd(state) < 0.015) setObj(t, 'weed');
  }
  for (const id of died) notes.push(`The ${CROPS[id].plural} died with the season.`);
  // 6. Pasture grass (not in winter).
  const g = state.pasture;
  if (cal.season !== 3) for (let i = 0; i < g.grass.length; i++) if (g.grass[i]) { g.age[i]++; g.grass[i] = g.age[i] >= 9 ? 3 : g.age[i] >= 4 ? 2 : 1; }
  // 7. Deliveries.
  for (const kind of state.pending.animals) {
    const taken = new Set(state.animals.map((a) => a.name)), free = NAMES[kind].filter((n) => !taken.has(n));
    const name = free.length ? free[rint(state, free.length)] : `${NAMES[kind][rint(state, NAMES[kind].length)]} ${state.animals.length + 1}`;
    state.animals.push({ kind, name, love: 0, fed: false, milked: false, brushed: false, talked: false });
    notes.push(`A new ${kind} arrived. Corran calls her ${name}.`);
  }
  state.pending.animals = [];
  const up = state.pending.upgrade;
  if (up) {
    const name = `${TOOL_LEVELS[up.level]} ${lower(up.tool)}`;
    if (addItem(state, up.tool, 1).ok) {
      p.toolLevel[up.tool] = up.level; state.pending.upgrade = null;
      if (up.tool === 'can') p.water = CAN_CAPACITY[up.level];
      notes.push(`Ruess finished your ${name}.`);
    } else notes.push(`Ruess finished your ${name}, but your rucksack is full. He will keep it until you have room.`);
  }
  // 7b. The Field-units do their morning work (after the rain and the deliveries).
  const robots = robotsWork(state, notes);
  // 8. A fresh day.
  rollForage(state);
  for (const n of Object.values(state.npc)) { n.talked = false; n.gifted = false; }
  state.mine = null;
  p.stamina = collapsed ? Math.floor(p.maxStamina / 2) : p.maxStamina;
  if (collapsed) notes.push('You wake up sore. Half your strength is back.');
  state.stats.days++;
  return { ok: true, earned, shipped, notes, seasonChanged, newYear, robots };
}

// ---------------------------------------------------------------- goals

const GOAL_DONE = {
  clear: (s) => s.stats.tilesCleared >= 1, till: (s) => s.stats.tilled >= 1, sow: (s) => s.stats.sown >= 1, water: (s) => s.stats.watered >= 1,
  ship: (s) => s.stats.shippedItems >= 1, fish: (s) => s.stats.fishCaught >= 1,
  meet: (s) => Object.values(s.npc).filter((n) => n.met).length >= 3,
  harvest: (s) => s.stats.harvested >= 1, earn: (s) => s.ledger.earned >= 1000,
};
export const goalState = (state) => GOALS.map((g) => ({ id: g.id, done: GOAL_DONE[g.id](state), claimed: !!state.goals[g.id] }));
// Pays the reward of every goal that is done and not yet claimed.
export function claimGoals(state) {
  const out = [];
  for (const g of GOALS) {
    if (state.goals[g.id] || !GOAL_DONE[g.id](state)) continue;
    state.goals[g.id] = true;
    state.player.money += g.reward;
    out.push({ id: g.id, title: g.title, reward: g.reward });
  }
  return out;
}
