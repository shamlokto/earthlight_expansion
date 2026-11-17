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
import { SEASONS, WEEKDAYS, DAYS_PER_SEASON, DAY_START, DAY_END, ITEMS, CROPS, TOOL_LEVELS, FIELD_SIZES, PASTURE_SIZE, RELICS, FESTIVAL_DAYS } from './data.js';

export const NPC_IDS = ['general', 'ruess', 'marrow', 'seln', 'corran', 'oduya', 'maris', 'vashti', 'moraine', 'kestrel', 'mori', 'yui'];
export const CAN_CAPACITY = [0, 20, 40, 80];
export const UPGRADABLE = ['hoe', 'can', 'sickle', 'hammer', 'axe', 'rod'];
export const SHOPS = {
  store: { id: 'store', name: "Seln's Seed & Sundry", keeper: 'seln' },
  ranch: { id: 'ranch', name: "Corran's Ranch", keeper: 'corran' },
  workshop: { id: 'workshop', name: 'The Workshop', keeper: 'ruess' },
  cafe: { id: 'cafe', name: 'The Hangar', keeper: 'oduya' },
  barge: { id: 'barge', name: "Moraine's Barge", keeper: 'moraine' },
  clinic: { id: 'clinic', name: 'Willowfall Clinic', keeper: 'mori' },
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
const FORAGE = [['herb'], ['herb', 'berry'], ['mushroom'], ['frostcap']];
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
      sel: 0, toolLevel: { hoe: 1, can: 1, sickle: 1, hammer: 1, axe: 1, rod: 1 }, water: CAN_CAPACITY[1], map: 'farm', x: 0, y: 0, dir: 0,
    },
    fields: { farm: field(FIELD_SIZES.farm), greenhouse: field(FIELD_SIZES.greenhouse) },
    pasture: { w: PASTURE_SIZE[0], h: PASTURE_SIZE[1], grass: Array(PASTURE_SIZE[0] * PASTURE_SIZE[1]).fill(0), age: Array(PASTURE_SIZE[0] * PASTURE_SIZE[1]).fill(0) },
    stock: { lumber: 0, fodder: 0, feed: 0 },
    animals: [], eggs: 0, bin: [],
    ledger: { shipped: {}, earned: 0 },
    npc: {}, flags: { greenhouse: false },
    pending: { upgrade: null, animals: [] },
    mine: null, forage: [], museum: {}, fishLog: {},
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
    return good ? s : null;
  } catch { return null; }
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
  const res = { ok: true, cost: 2, changed: [], gained: [], fx: TOOL_FX[it.id] };
  for (const [tx, ty] of reach(x, y, dir, level, WIDE[it.id])) {
    if (inside(f, tx, ty) && work(state, it.id, level, f.tiles[ty * f.w + tx], ctx)) res.changed.push({ x: tx, y: ty });
  }
  if (!res.changed.length) return nothing(ctx.hint || IDLE[it.id]);
  if (ctx.lumber) { state.stock.lumber += ctx.lumber; res.gained.push({ id: 'lumber', n: ctx.lumber }); }
  return spend(state, 2, res);
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
  if (!addItem(state, c.id, 1).ok) return no(FULL);
  if (c.regrow) t.crop.age = c.days - c.regrow; else t.crop = null;
  state.stats.harvested++;
  return { ok: true, gained: [{ id: c.id, n: 1 }] };
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
  const res = { ok: true, cost: 2, changed: [], gained: [], fx: 'cut' };
  for (const [tx, ty] of reach(x, y, dir, state.player.toolLevel.sickle, true)) {
    if (!inside(p, tx, ty) || p.grass[ty * p.w + tx] !== 3) continue;
    p.grass[ty * p.w + tx] = 1; p.age[ty * p.w + tx] = 0;
    res.changed.push({ x: tx, y: ty });
  }
  if (!res.changed.length) return nothing('There is no ripe grass to cut here.');
  state.stock.fodder += res.changed.length;
  res.gained.push({ id: 'fodder', n: res.changed.length });
  return spend(state, 2, res);
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
  if (!def.stamina) return fail('You cannot eat that.');
  if (p.stamina >= p.maxStamina) return fail('You are not hungry.');
  p.stamina = Math.min(p.maxStamina, p.stamina + def.stamina);
  takeFromSlot(state, slot, 1);
  return { ok: true, msg: `You had ${def.name.toLowerCase()}. +${def.stamina} stamina.` };
}

// What a shop sells today. Private fields: give (item id), once, req [[id, n]], lumber, stop(n) -> why, apply(n).
function shelves(state, shopId) {
  const p = state.player, out = [];
  const sell = (id, price, more) => out.push({ key: id, label: ITEMS[id].name, desc: ITEMS[id].desc, price, give: id, ...more });
  const once = (id, price) => { if (!countItem(state, id)) sell(id, price, { once: true }); };
  if (shopId === 'store') {
    for (const c of Object.values(CROPS)) if (c.seasons.length === 1 && c.seasons[0] === state.cal.season) sell(`seed_${c.id}`, c.bag);
    sell('seed_grass', 500); sell('bread', 60); once('rod', 600);
    if (p.slots < 20) {
      const to = p.slots < 15 ? 15 : 20;
      out.push({ key: 'rucksack', label: `${to}-slot rucksack`, desc: `A bigger rucksack: ${to} slots.`, price: to === 15 ? 1500 : 4000, once: true,
        apply: () => { while (p.inv.length < to) p.inv.push(null); p.slots = to; return `Your rucksack now has ${to} slots.`; } });
    }
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
    if (!state.flags.greenhouse) {
      out.push({ key: 'greenhouse', label: 'Greenhouse repair', desc: 'Crops grow in the greenhouse in any season.', price: 4000, lumber: 120, needs: '120 lumber', once: true,
        apply: () => { state.flags.greenhouse = true; return 'Ruess repaired the greenhouse. It is yours to plant.'; } });
    }
  } else if (shopId === 'cafe') {
    sell('tea', 30); sell('soup', 80); sell('pie', 150);
  } else if (shopId === 'barge') {
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
  if (d.lumber && state.stock.lumber < d.lumber) return `You need ${d.lumber} lumber.`;
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
  if (d.lumber) state.stock.lumber -= d.lumber;
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
export function enterMine(state, depth = 1) {
  depth = int(depth) && depth > 0 ? Math.min(depth, 999) : 1;
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
  const monsters = [];
  for (let n = Math.min(depth === 1 ? 1 + rint(state, 3) : 2 + rint(state, 3) + Math.floor(depth / 4), 6, open.length); n > 0; n--) {
    const i = open.splice(rint(state, open.length), 1)[0];
    monsters.push({ x: i % w, y: (i - (i % w)) / w, kind: rnd(state) < 0.6 ? 'crawler' : 'drone', hp: 1 + rint(state, 2) });
  }
  state.stats.deepest = Math.max(state.stats.deepest, depth);
  state.mine = { depth, floor: depth, w, h, cells, monsters, hatch };
  return state.mine;
}
// What a pile or a monster gives up at this depth.
function find(state, depth) {
  const r = rnd(state);
  if (r < 0.11) {
    const pool = RELICS.filter((x) => x.depth <= depth);
    return pool[pick(state, pool.map((_, i) => 1 / (i + 1)))].id;   // cheaper ones more often
  }
  if (r < 0.16) return depth >= 10 ? 'crystal' : 'scrap';
  if (r < 0.28) return depth >= 5 ? 'alloy' : 'scrap';
  return r < 0.50 ? 'scrap' : null;
}
// Search a rubble pile (the name is from the first design, when this was a mine).
export function hitRock(state, x, y) {
  const m = state.mine, no = (msg) => fail(msg, { broke: false, gained: [], hatch: false });
  if (!m) return no('You are not in the ruins.');
  const c = int(x) && int(y) && x >= 0 && y >= 0 && x < m.w && y < m.h ? m.cells[y * m.w + x] : -1;
  if (c === 2) return no('The way down is open.');
  if (c !== 1) return no('There is nothing to search here.');
  const i = y * m.w + x, hatch = i === m.hatch, id = find(state, m.depth);
  m.cells[i] = hatch ? 2 : 0;
  state.stats.searched++;
  const res = take(state, id ? [[id, 1]] : [], { ok: true, broke: true, gained: [], hatch });
  if (hatch) res.msg = res.gained.length ? `You found ${lower(id)}, and a way down.` : 'Under the rubble is a way down.';
  return spend(state, 1, res);
}
export function defeatMonster(state, index) {
  const m = state.mine;
  if (!m || !int(index) || !m.monsters[index]) return fail('There is nothing to fight here.', { gained: [] });
  m.monsters.splice(index, 1);
  state.stats.monsters++;
  const drop = rnd(state) < 0.35, alloy = rnd(state) < 0.5 && m.depth >= 5;
  return take(state, drop ? [[alloy ? 'alloy' : 'scrap', 1]] : [], { ok: true, gained: [] });
}
export function monsterHit(state) {
  state.player.stamina = Math.max(Math.min(1, state.player.stamina), state.player.stamina - 5);
  return { ok: true, msg: 'Something clipped the Pallas. You lost a little stamina.' };
}
export function leaveMine(state) { state.mine = null; return { ok: true }; }

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
  return spend(state, 1, { ok: true, msg: king ? 'Old Hollin himself! The whole village will hear of this.' : `You caught a ${lower(id)}.`, gained: [{ id, n: 1 }] });
}

function rollForage(state) {
  const spots = [0, 1, 2, 3, 4, 5, 6, 7], kinds = FORAGE[state.cal.season];
  state.forage = [];
  for (let n = 2 + rint(state, 3); n > 0; n--) state.forage.push({ spot: spots.splice(rint(state, spots.length), 1)[0], id: kinds[rint(state, kinds.length)] });
  state.forage.sort((a, b) => a.spot - b.spot);
}
export function pickForage(state, spot) {
  const i = state.forage.findIndex((f) => f.spot === spot);
  if (i < 0) return fail('There is nothing growing here today.', { gained: [] });
  const id = state.forage[i].id;
  if (!addItem(state, id, 1).ok) return fail(FULL, { gained: [] });
  state.forage.splice(i, 1);
  return { ok: true, msg: `You picked a ${lower(id)}.`, gained: [{ id, n: 1 }] };
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
  // 8. A fresh day.
  rollForage(state);
  for (const n of Object.values(state.npc)) { n.talked = false; n.gifted = false; }
  state.mine = null;
  p.stamina = collapsed ? Math.floor(p.maxStamina / 2) : p.maxStamina;
  if (collapsed) notes.push('You wake up sore. Half your strength is back.');
  state.stats.days++;
  return { ok: true, earned, shipped, notes, seasonChanged, newYear };
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
