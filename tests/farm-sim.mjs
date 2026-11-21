// Sato's Harvest, the rules (docs/FARM.md §2 and §3.1): the new game, determinism, save and load, a
// turnip from weed to pay, weather, seasons, tools, shops, animals, upgrades, the greenhouse, the
// ruins, fishing, forage, gifts, goals, and a 120-day soak of random actions.   node tests/farm-sim.mjs
import * as sim from '../js/farm/sim.js';
import { ITEMS, CROPS, SEASONS, WEEKDAYS, DAYS_PER_SEASON, DAY_START, DAY_END, TOOL_LEVELS, FIELD_SIZES, PASTURE_SIZE, RELICS } from '../js/farm/data.js';
import { FISH_TABLE, LEGEND_FISH } from '../js/farm/data.js';
const { newGame, saveState, loadState, useTool, harvest, sleep, ship, buy, shopStock, addItem, countItem, removeItem } = sim;

let failures = 0, checks = 0;
const check = (cond, what) => { checks++; if (!cond) { failures++; console.log('FAIL', what); } };
const refusals = [];
// Every refusal must be a readable sentence.
const act = (r) => { if (r && r.ok === false) refusals.push(r.msg); return r; };

// ---------------------------------------------------------------- helpers

function walk(v, path, out) {
  if (typeof v === 'number') { if (!Number.isFinite(v)) out.push(path); }
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const k in v) walk(v[k], `${path}.${k}`, out);
  else if (v === undefined) out.push(path);
  return out;
}
const tile = (s, x, y, f = 'farm') => s.fields[f].tiles[y * s.fields[f].w + x];
const select = (s, id) => { s.player.sel = s.player.inv.findIndex((i) => i && i.id === id); return s.player.sel >= 0; };
const slotOf = (s, id) => s.player.inv.findIndex((i) => i && i.id === id);
const wipe = (s, f = 'farm') => { for (const t of s.fields[f].tiles) Object.assign(t, { till: false, wet: false, crop: null, obj: null, hp: 0 }); };
const setObj = (s, x, y, obj) => Object.assign(tile(s, x, y), { obj, hp: obj === 'stump' || obj === 'boulder' ? 3 : 1 });
const rich = (seed = 5) => { const s = newGame({ seed }); s.player.money = 1e6; s.stock.lumber = 500; while (s.player.inv.length < 16) s.player.inv.push(null); s.player.slots = 16; addItem(s, 'scrap', 20); addItem(s, 'alloy', 20); addItem(s, 'crystal', 5); addItem(s, 'star_metal', 2); return s; };
// rich, with belt ore for Ruess's ore jobs and room to carry it
const richer = (seed = 5) => { const s = rich(seed); while (s.player.inv.length < 24) s.player.inv.push(null); s.player.slots = 24; for (const o of ['nickel_iron', 'silica', 'copper', 'titanium', 'platinum']) addItem(s, o, 12); for (const o of ['wool', 'fine_wool', 'yarn', 'tulip', 'sunflower', 'cosmos', 'snowbell']) addItem(s, o, 6); return s; };
// break belt rocks of the given kinds in one sector, over and over, with the given hammer; tally the finds
const beltTally = (sector, kinds = [2], hammer = 3, n0 = 2500, seed = 310) => { const g = rich(seed + sector), got = {}; g.player.toolLevel.hammer = hammer; let n = 0; sim.enterBelt(g, 1); const m = g.mine, y0 = sim.sectorTop(sector);
  for (let pass = 0, n1 = -1; n < n0 && n1 !== n; pass++) { n1 = n; for (let y = y0; y < y0 + sim.SECTOR_H && n < n0; y++) for (let x = 0; x < m.w && n < n0; x++) { const i = y * m.w + x; if (!kinds.includes(sim.beltLayout(g.belt.seed).cells[i])) continue; m.cells[i] = sim.beltLayout(g.belt.seed).cells[i]; delete m.hp[i]; g.player.stamina = 100; n++; let r; do r = sim.hitRock(g, x, y); while (r.ok && !r.broke); for (const f of r.gained || []) got[f.id] = (got[f.id] || 0) + f.n; }
    for (let i = 0; i < g.player.inv.length; i++) if (g.player.inv[i] && ITEMS[g.player.inv[i].id].kind === 'ore') g.player.inv[i] = null; }
  return got; };
const setDate = (s, season, day) => { s.cal.season = season; s.cal.day = day; };

// ---------------------------------------------------------------- data

{
  check(SEASONS.length === 4 && WEEKDAYS.length === 7 && DAYS_PER_SEASON === 30 && DAY_START === 360 && DAY_END === 1440 && TOOL_LEVELS[2] === 'Alloy', 'calendar constants');
  check(FIELD_SIZES.farm[0] === 16 && FIELD_SIZES.farm[1] === 18 && FIELD_SIZES.greenhouse[0] === 10 && PASTURE_SIZE[1] === 7, 'field sizes');
  check(Object.keys(CROPS).length >= 25, `at least 25 crops (${Object.keys(CROPS).length})`);
  for (const c of Object.values(CROPS)) check(ITEMS[c.id]?.kind === 'crop' && ITEMS[c.id].sell === c.sell && ITEMS[`seed_${c.id}`]?.crop === c.id, `crop ${c.id} has an item and a seed bag`);
  for (const [id, it] of Object.entries(ITEMS)) check(it.id === id && it.name && it.kind && typeof it.desc === 'string' && it.desc, `item ${id} is complete`);
  for (const id of ['hoe', 'can', 'sickle', 'hammer', 'axe', 'rod', 'milker', 'brush']) check(ITEMS[id]?.kind === 'tool', `tool ${id}`);
  const price = { turnip: 60, pumpkin: 250, moonflower: 420, egg: 50, milk_l: 200, fish_s: 35, fish_king: 1200, fish_winter: 180, herb: 40, frostcap: 60, scrap: 15, crystal: 150, photo: 80, ring: 600, datachip: 500 };
  for (const [id, v] of Object.entries(price)) check(ITEMS[id]?.sell === v, `${id} sells for ${v}`);
  check(ITEMS.bread.stamina === 20 && ITEMS.tonic.stamina === 100 && ITEMS.berry.stamina === 5 && ITEMS.tea.stamina === 10, 'food stamina');
  check(RELICS.length === 10 && RELICS.every((r) => ITEMS[r.id].kind === 'relic'), 'ten relics');
  check(ITEMS.fish_m.name === 'River trout' && ITEMS.fish_king.name === 'Old Hollin' && ITEMS.toy.name === 'Tin robot', 'names from the brief');
}

// ---------------------------------------------------------------- new game

{
  const s = newGame({ seed: 1 });
  check(s.v === 1 && s.cal.year === 1 && s.cal.season === 0 && s.cal.day === 1 && s.cal.minute === 360, 'starts Spring 1, 06:00');
  check(s.player.money === 500 && s.player.slots === 10 && s.player.inv.length === 10 && s.player.stamina === 100 && s.player.water === 20, 'starting player');
  check(['hoe', 'can', 'sickle', 'hammer', 'axe', 'seed_turnip'].every((id) => countItem(s, id) === 1) && s.player.inv.filter(Boolean).length === 6, 'starting rucksack');
  check(s.weather === 'sun' && ['sun', 'rain'].includes(s.weatherTomorrow), 'day 1 weather');
  const f = s.fields.farm, n = (o) => f.tiles.filter((t) => t.obj === o).length;
  const debris = f.tiles.filter((t) => t.obj).length / f.tiles.length;
  check(f.w === 16 && f.h === 18 && f.tiles.length === 288 && debris > 0.42 && debris < 0.68, `farm debris ${debris.toFixed(2)}`);
  check(n('weed') && n('rock') && n('branch') && n('stump') && n('boulder') >= 1 && n('boulder') <= 4 && n('stump') < 30, 'a mix of debris');
  check(f.tiles.every((t) => !t.till && !t.wet && t.crop === null && (t.obj ? t.hp >= 1 : t.hp === 0)), 'tiles are well formed');
  const g = s.fields.greenhouse;
  check(g.w === 10 && g.h === 6 && g.tiles.every((t) => !t.obj && !t.till) && s.flags.greenhouse === false, 'greenhouse empty and locked');
  check(s.pasture.w === 12 && s.pasture.h === 7 && s.pasture.grass.length === 84 && s.pasture.grass.every((v) => v === 0), 'pasture empty');
  check(s.animals.length === 0 && s.eggs === 0 && s.bin.length === 0 && s.mine === null && s.pending.upgrade === null && s.pending.animals.length === 0, 'nothing else yet');
  check(s.forage.length >= 3 && s.forage.length <= 6 && s.forage.every((x) => ['herb', 'bamboo_shoot', 'wild_mint', 'fiddlehead'].includes(x.id) && x.spot >= 0 && x.spot < sim.FORAGE_SPOT_COUNT), 'spring forage');
  check(Object.keys(s.npc).length === sim.NPC_IDS.length && sim.NPC_IDS.length >= 19 && s.npc.ruess.love === 0 && sim.hearts(s, 'ruess') === 0, 'npc records');
  check(sim.weekday(s) === 0 && sim.absDay(s) === 0 && sim.dateLabel(s) === 'Spring 1 (Mon), Year 1' && sim.timeLabel(s) === '6:00 AM', 'calendar labels');
  s.cal.day = 3; s.cal.minute = 580;
  check(sim.dateLabel(s) === 'Spring 3 (Wed), Year 1' && sim.timeLabel(s) === '9:40 AM', 'labels from the contract');
  s.cal.minute = 780; check(sim.timeLabel(s) === '1:00 PM', '1 PM');
  check(walk(s, 'state', []).length === 0, 'no NaN or undefined in a new game');
  check(newGame().seed !== undefined && newGame({}).cal.day === 1, 'a random seed when none is given');
  check(typeof sim.SHOPS.store === 'object' && ['store', 'ranch', 'workshop', 'cafe', 'barge'].every((k) => sim.SHOPS[k]), 'SHOPS');
}

// ---------------------------------------------------------------- determinism, save and load

function script(s, days = 12) {
  let k = 7;
  const r = (n) => ((k = (k * 1103515245 + 12345) & 0x7fffffff) >>> 8) % n;   // high bits: the low ones cycle
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < 30; i++) {
      s.player.sel = r(8);
      act(useTool(s, 'farm', r(16), r(18), r(4)));
      if (i % 7 === 0) act(sim.refillCan(s));
      if (i % 9 === 0) act(harvest(s, 'farm', r(16), r(18)));
    }
    sim.enterMine(s, 1 + d); act(sim.hitRock(s, r(90), r(70))); act(sim.defeatMonster(s, 0)); sim.leaveMine(s);
    act(sim.pickForage(s, r(8))); sim.talk(s, 'seln');
    sleep(s);
  }
  return s;
}
{
  const a = script(newGame({ seed: 42 })), b = script(newGame({ seed: 42 })), c = script(newGame({ seed: 43 }));
  check(saveState(a) === saveState(b), 'same seed, same actions, same game');
  check(saveState(a) !== saveState(c), 'another seed, another game');
  const text = saveState(a), back = loadState(text);
  check(back && saveState(back) === text, 'save/load round trip');
  script(a, 5); script(back, 5);
  check(saveState(a) === saveState(back), 'a loaded game continues identically');
  check(loadState('nonsense') === null && loadState('{"v":2}') === null && loadState('null') === null && loadState(undefined) === null, 'bad saves give null');
}

// ---------------------------------------------------------------- a turnip, from weed to pay

{
  const s = newGame({ seed: 3 });
  wipe(s); setObj(s, 5, 5, 'weed');
  select(s, 'hoe');
  let r = act(useTool(s, 'farm', 5, 5, 0));
  check(!r.ok && r.cost === 0 && r.msg && s.player.stamina === 100 && r.changed.length === 0, 'the hoe will not till a weed, and costs nothing');
  select(s, 'sickle'); r = useTool(s, 'farm', 5, 5, 0);
  check(r.ok && r.cost === 2 && r.fx === 'cut' && r.changed.length === 1 && r.changed[0].x === 5 && tile(s, 5, 5).obj === null && s.player.stamina === 98, 'the sickle cuts the weed');
  select(s, 'hoe'); r = useTool(s, 'farm', 5, 5, 0);
  check(r.ok && r.fx === 'till' && tile(s, 5, 5).till && s.player.stamina === 96, 'till');
  check(!act(useTool(s, 'farm', 5, 5, 0)).ok, 'tilling twice does nothing');
  select(s, 'seed_turnip'); r = useTool(s, 'farm', 5, 5, 0);
  check(r.ok && r.fx === 'sow' && r.cost === 0 && r.changed.length === 1 && tile(s, 5, 5).crop.id === 'turnip' && countItem(s, 'seed_turnip') === 0 && s.player.stamina === 96, 'sow one tile, one bag, no stamina');
  check(sim.cropStage(tile(s, 5, 5).crop) === 0 && sim.stageOf(tile(s, 5, 5)) === 0 && sim.stageOf(tile(s, 0, 0)) === -1, 'stage 0 when sown');
  s.weatherTomorrow = 'sun';
  sleep(s); s.weatherTomorrow = 'sun';
  check(tile(s, 5, 5).crop.age === 0, 'a dry night grows nothing');
  for (let n = 0; n < 4; n++) {
    check(!act(harvest(s, 'farm', 5, 5)).ok, 'not ripe yet');
    select(s, 'can'); r = useTool(s, 'farm', 5, 5, 0);
    check(r.ok && r.fx === 'water' && tile(s, 5, 5).wet, 'water');
    sleep(s); s.weatherTomorrow = 'sun';
    check(tile(s, 5, 5).crop.age === n + 1 && !tile(s, 5, 5).wet, `night ${n + 1}: grown and dry`);
  }
  check(s.player.water === 16 && sim.cropStage(tile(s, 5, 5).crop) === 3, 'ripe after four wet nights');
  r = harvest(s, 'farm', 5, 5);
  check(r.ok && r.gained[0].id === 'turnip' && countItem(s, 'turnip') === 1 && tile(s, 5, 5).crop === null && tile(s, 5, 5).till, 'harvest leaves tilled soil');
  check(!act(ship(s, slotOf(s, 'hoe'))).ok && !act(ship(s, 9)).ok && !act(ship(s, 99)).ok, 'tools and empty slots cannot be shipped');
  r = ship(s, slotOf(s, 'turnip'));
  check(r.ok && s.bin.length === 1 && s.bin[0].n === 1 && countItem(s, 'turnip') === 0 && s.player.money === 500, 'shipped, not paid yet');
  const rep = sleep(s);
  check(rep.earned === 60 && rep.shipped[0].id === 'turnip' && rep.shipped[0].value === 60 && s.player.money === 560 && s.bin.length === 0 && s.ledger.shipped.turnip === 1 && s.ledger.earned === 60, 'paid at dawn');
  check(Array.isArray(rep.notes) && rep.notes.every((n) => typeof n === 'string' && n) && rep.seasonChanged === false && rep.newYear === false, 'the morning report');
  check(s.cal.day === 7 && s.cal.minute === 360 && s.player.stamina === 100, 'a new day');
}

// ---------------------------------------------------------------- sowing: 3×3, seasons

{
  const s = newGame({ seed: 4 });
  wipe(s); for (const t of s.fields.farm.tiles) t.till = true;
  setObj(s, 3, 3, 'rock'); tile(s, 3, 3).till = false;
  select(s, 'seed_turnip');
  let r = useTool(s, 'farm', 4, 4, 1);
  check(r.ok && r.changed.length === 8 && tile(s, 5, 5).crop && tile(s, 3, 5).crop && !tile(s, 3, 3).crop, 'a bag sows the 3×3 round the tile, where it can');
  addItem(s, 'seed_turnip', 2); select(s, 'seed_turnip');
  r = useTool(s, 'farm', 0, 0, 0);
  check(r.ok && r.changed.length === 4, 'a corner sows four');
  check(!act(useTool(s, 'farm', 4, 4, 0)).ok && countItem(s, 'seed_turnip') === 1, 'no empty soil: the bag is kept');
  addItem(s, 'seed_pumpkin', 1); select(s, 'seed_pumpkin');
  r = act(useTool(s, 'farm', 10, 10, 0));
  check(!r.ok && /spring/.test(r.msg) && countItem(s, 'seed_pumpkin') === 1, 'pumpkins refuse spring');
  addItem(s, 'seed_moonflower', 3); select(s, 'seed_moonflower');
  check(useTool(s, 'farm', 10, 10, 0).ok, 'moonflower in spring');
  setDate(s, 3, 5);
  check(!act(useTool(s, 'farm', 13, 13, 0)).ok, 'moonflower not in winter');
  addItem(s, 'seed_grass', 1); select(s, 'seed_grass');
  check(!act(useTool(s, 'farm', 13, 13, 0)).ok && countItem(s, 'seed_grass') === 1, 'grass seed is for the pasture');
}

// ---------------------------------------------------------------- rain, season death, regrow

{
  const s = newGame({ seed: 6 });
  wipe(s); for (const t of s.fields.farm.tiles) t.till = true;
  for (const t of s.fields.greenhouse.tiles) t.till = true;
  tile(s, 1, 1).crop = { id: 'turnip', age: 0, dead: false };
  s.weatherTomorrow = 'rain';
  let rep = sleep(s);
  check(s.weather === 'rain' && rep.notes.includes('It is raining.'), 'rain arrives with a note');
  check(tile(s, 1, 1).crop.age === 0 && s.fields.farm.tiles.every((t) => t.wet), 'rain wets the field at dawn, after growth');
  check(s.fields.greenhouse.tiles.every((t) => !t.wet), 'never rained on indoors');
  s.weatherTomorrow = 'sun'; sleep(s);
  check(tile(s, 1, 1).crop.age === 1 && !tile(s, 1, 1).wet, 'the rain grew it a day');

  // regrow
  tile(s, 2, 2).crop = { id: 'strawberry', age: 8, dead: false };
  let r = harvest(s, 'farm', 2, 2);
  check(r.ok && tile(s, 2, 2).crop.age === 6 && sim.cropStage(tile(s, 2, 2).crop) === 2, 'a strawberry goes back two days');
  for (let n = 0; n < 2; n++) { check(!act(harvest(s, 'farm', 2, 2)).ok, 'regrowing'); tile(s, 2, 2).wet = true; s.weatherTomorrow = 'sun'; sleep(s); }
  check(harvest(s, 'farm', 2, 2).ok && countItem(s, 'strawberry') === 2, 'ripe again after two wet nights');
  // a full rucksack
  for (let i = 0; i < s.player.inv.length; i++) if (!s.player.inv[i]) s.player.inv[i] = { id: 'herb', n: 99 };
  s.player.inv[slotOf(s, 'strawberry')] = { id: 'herb', n: 99 };
  tile(s, 2, 2).crop.age = 8;
  r = act(harvest(s, 'farm', 2, 2));
  check(!r.ok && tile(s, 2, 2).crop.age === 8, 'a full rucksack keeps the crop on the plant');

  // season change
  tile(s, 3, 3).crop = { id: 'moonflower', age: 2, dead: false };
  s.fields.greenhouse.tiles[0].crop = { id: 'turnip', age: 1, dead: false };
  setDate(s, 0, 30); s.weatherTomorrow = 'sun';
  rep = sleep(s);
  check(rep.seasonChanged && !rep.newYear && s.cal.season === 1 && s.cal.day === 1 && s.weather === 'sun', 'Summer 1');
  check(tile(s, 1, 1).crop.dead && tile(s, 2, 2).crop.dead && !tile(s, 3, 3).crop.dead && !s.fields.greenhouse.tiles[0].crop.dead, 'spring crops die outdoors; moonflower and the greenhouse live');
  check(rep.notes.includes('The turnips died with the season.') && rep.notes.includes('The strawberries died with the season.'), 'notes name the dead');
  check(!act(harvest(s, 'farm', 1, 1)).ok, 'a dead crop cannot be picked');
  tile(s, 1, 1).wet = true; s.weatherTomorrow = 'sun'; sleep(s);
  check(tile(s, 1, 1).crop.age === 1, 'dead crops do not grow');
  select(s, 'sickle');
  check(useTool(s, 'farm', 1, 1, 0).ok && tile(s, 1, 1).crop === null && tile(s, 1, 1).till, 'the sickle clears a dead crop');
  check(!act(useTool(s, 'farm', 3, 3, 0)).ok && tile(s, 3, 3).crop, 'the sickle spares a living crop');
  setDate(s, 3, 30); s.cal.year = 1;
  rep = sleep(s);
  check(rep.newYear && rep.seasonChanged && s.cal.year === 2 && s.cal.season === 0 && s.cal.day === 1, 'year rollover after Winter 30');
  check(sim.weekday(s) === (120 % 7), 'weekdays run on');
}

// ---------------------------------------------------------------- weather odds

{
  const s = newGame({ seed: 8 }), seen = [{}, {}, {}, {}];
  let bad = 0;
  for (let d = 0; d < 1200; d++) {
    sleep(s);
    seen[s.cal.season][s.weather] = (seen[s.cal.season][s.weather] || 0) + 1;
    const fest = [[0, 18], [1, 24], [2, 9], [3, 30]].some(([a, b]) => a === s.cal.season && b === s.cal.day);
    if ((s.cal.day === 1 || fest) && s.weather !== 'sun') bad++;
  }
  check(bad === 0, 'day 1 and festival days are always fair');
  const share = (q, w) => (seen[q][w] || 0) / 300;
  check(Math.abs(share(0, 'rain') - 0.25) < 0.08 && !seen[0].storm && !seen[0].snow, `spring rain ${share(0, 'rain').toFixed(2)}`);
  check(Math.abs(share(1, 'rain') - 0.15) < 0.07 && share(1, 'storm') > 0 && share(1, 'storm') < 0.12, `summer rain ${share(1, 'rain').toFixed(2)}, storm ${share(1, 'storm').toFixed(2)}`);
  check(Math.abs(share(2, 'rain') - 0.20) < 0.08 && !seen[2].storm, `autumn rain ${share(2, 'rain').toFixed(2)}`);
  check(Math.abs(share(3, 'snow') - 0.30) < 0.08 && !seen[3].rain, `winter snow ${share(3, 'snow').toFixed(2)}`);
  check(s.fields.farm.tiles.filter((t) => t.obj === 'weed').length > 100, 'weeds creep back over the years');
}

// ---------------------------------------------------------------- tools: areas, levels, the can

{
  const s = newGame({ seed: 9 });
  const xy = (r) => r.changed.map((c) => `${c.x},${c.y}`).sort().join(' ');
  wipe(s); select(s, 'hoe');
  check(xy(useTool(s, 'farm', 5, 5, 0)) === '5,5', 'level 1: one tile');
  s.player.toolLevel.hoe = 2;
  check(xy(useTool(s, 'farm', 8, 5, 0)) === '8,5 8,6 8,7', 'level 2 south');
  check(xy(useTool(s, 'farm', 8, 4, 1)) === '8,2 8,3 8,4', 'level 2 north');
  check(xy(useTool(s, 'farm', 7, 10, 2)) === '5,10 6,10 7,10', 'level 2 west');
  check(xy(useTool(s, 'farm', 9, 10, 3)) === '10,10 11,10 9,10', 'level 2 east');
  check(xy(useTool(s, 'farm', 15, 0, 3)) === '15,0', 'the edge clips the line');
  s.player.toolLevel.hoe = 3; wipe(s);
  check(xy(useTool(s, 'farm', 5, 5, 0)) === '4,5 4,6 4,7 5,5 5,6 5,7 6,5 6,6 6,7', 'level 3 south: 3×3 ahead');
  wipe(s); check(xy(useTool(s, 'farm', 5, 5, 3)) === '5,4 5,5 5,6 6,4 6,5 6,6 7,4 7,5 7,6', 'level 3 east');
  wipe(s); check(xy(useTool(s, 'farm', 5, 5, 1)) === '4,3 4,4 4,5 5,3 5,4 5,5 6,3 6,4 6,5', 'level 3 north');
  check(s.player.stamina === 100 - 2 * 9, 'two stamina a use, whatever the area');

  // hammer and axe: a line at level 3, never a block
  wipe(s); for (let y = 0; y < 18; y++) for (let x = 0; x < 16; x++) setObj(s, x, y, 'rock');
  s.player.toolLevel.hammer = 3; select(s, 'hammer');
  check(xy(useTool(s, 'farm', 5, 5, 0)) === '5,5 5,6 5,7', 'a Starsteel hammer hits a line');

  // boulder, stump, branch, flatten
  wipe(s); s.player.toolLevel.hammer = 1; setObj(s, 2, 2, 'boulder'); setObj(s, 3, 3, 'stump'); setObj(s, 4, 4, 'branch'); setObj(s, 6, 6, 'rock');
  let r = act(useTool(s, 'farm', 2, 2, 0));
  check(!r.ok && /Alloy/.test(r.msg) && tile(s, 2, 2).hp === 3, 'a boulder needs an Alloy hammer');
  check(!act(useTool(s, 'farm', 4, 4, 0)).ok, 'the hammer does not chop');
  r = useTool(s, 'farm', 6, 6, 0); check(r.ok && r.fx === 'smash' && tile(s, 6, 6).obj === null, 'a rock breaks in one hit');
  s.player.toolLevel.hammer = 2;
  check(useTool(s, 'farm', 2, 2, 1).ok && useTool(s, 'farm', 2, 2, 1).ok && tile(s, 2, 2).obj === 'boulder' && useTool(s, 'farm', 2, 2, 1).ok && tile(s, 2, 2).obj === null, 'three hits for a boulder');
  tile(s, 9, 9).till = true; tile(s, 9, 9).wet = true; s.player.toolLevel.hammer = 1;
  check(useTool(s, 'farm', 9, 9, 0).ok && !tile(s, 9, 9).till && !tile(s, 9, 9).wet, 'the hammer flattens empty soil');
  tile(s, 9, 9).till = true; tile(s, 9, 9).crop = { id: 'turnip', age: 0, dead: false };
  check(!act(useTool(s, 'farm', 9, 9, 0)).ok && tile(s, 9, 9).till, 'but not under a crop');
  select(s, 'axe');
  r = useTool(s, 'farm', 4, 4, 0);
  check(r.ok && r.fx === 'chop' && r.gained[0].id === 'lumber' && r.gained[0].n === 1 && s.stock.lumber === 1 && countItem(s, 'lumber') === 0, 'a branch is one lumber, in the stock');
  check(useTool(s, 'farm', 3, 3, 0).gained.length === 0 && useTool(s, 'farm', 3, 3, 0).ok, 'a stump takes hits');
  r = useTool(s, 'farm', 3, 3, 0);
  check(r.ok && r.gained[0].n === 6 && s.stock.lumber === 7 && tile(s, 3, 3).obj === null, 'the third hit gives six lumber (level 1 axe)');

  // the can
  wipe(s); for (const t of s.fields.farm.tiles) t.till = true;
  select(s, 'can'); s.player.water = 20;
  let wetted = 0;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 16; x++) { r = useTool(s, 'farm', x, y, 0); if (r.ok) wetted++; else act(r); }
  check(wetted === 20 && s.player.water === 0, 'the can holds twenty');
  check(/empty/.test(r.msg) && /pond/.test(r.msg), 'an empty can says so');
  check(sim.refillCan(s).ok && s.player.water === 20 && !act(sim.refillCan(s)).ok, 'refill, once');
  s.player.toolLevel.can = 3; check(sim.refillCan(s).ok && s.player.water === 80, 'a Starsteel can holds eighty');
  for (const t of s.fields.farm.tiles) t.wet = false;
  r = useTool(s, 'farm', 5, 5, 0);
  check(r.changed.length === 9 && s.player.water === 71, 'one water a tile');
  s.player.water = 4; r = useTool(s, 'farm', 10, 10, 0);
  check(r.ok && r.changed.length === 4 && s.player.water === 0, 'the last drops wet what they can');
  s.player.toolLevel.can = 2; s.player.water = 0; check(sim.refillCan(s).ok && s.player.water === 40, 'an Alloy can holds forty');

  // bad input and odd selections
  s.player.sel = 9; check(!act(useTool(s, 'farm', 1, 1, 0)).ok, 'empty hands');
  select(s, 'hoe');
  for (const args of [['farm', -1, 0, 0], ['farm', 99, 99, 0], ['farm', 1.5, 2, 0], ['farm', 'a', null, 0], ['nowhere', 1, 1, 0], [undefined, 1, 1, 0], ['__proto__', 1, 1, 0], ['farm', NaN, NaN, 9]]) {
    r = act(useTool(s, ...args));
    check(r.ok === false && r.cost === 0 && Array.isArray(r.changed) && Array.isArray(r.gained) && r.fx === null && r.msg, `bad input refused: ${JSON.stringify(args)}`);
  }
  addItem(s, 'bread', 1); select(s, 'bread'); check(!act(useTool(s, 'farm', 1, 1, 0)).ok, 'bread is not a tool');

  // fainting
  wipe(s); select(s, 'hoe'); s.player.toolLevel.hoe = 1; s.player.stamina = 2;
  r = useTool(s, 'farm', 0, 0, 0);
  check(r.ok && r.fainted === true && s.player.stamina === 0 && tile(s, 0, 0).till, 'the last swing lands, then she faints');
  const rep = sleep(s, { collapsed: true });
  check(s.player.stamina === 50 && rep.notes.length > 0, 'half stamina after a collapse');
}

// ---------------------------------------------------------------- the rucksack, eating, tick

{
  const s = newGame({ seed: 10 });
  check(addItem(s, 'turnip', 150).ok && countItem(s, 'turnip') === 150 && s.player.inv.filter(Boolean).length === 8, 'stacks of 99');
  check(addItem(s, 'herb', 198).ok && !act(addItem(s, 'herb', 1)).ok && countItem(s, 'herb') === 198, 'full is full');
  check(addItem(s, 'turnip', 48).ok && !act(addItem(s, 'turnip', 1)).ok, 'a stack tops up');
  check(!act(addItem(s, 'nothing')).ok && !act(addItem(s, 'turnip', -1)).ok && !act(addItem(s, 'turnip', 0.5)).ok, 'bad adds refused');
  check(removeItem(s, 'turnip', 120) && countItem(s, 'turnip') === 78 && !removeItem(s, 'turnip', 79) && !removeItem(s, 'pie') && countItem(s, 'turnip') === 78, 'removeItem');
  check(addItem(s, 'lumber', 5).ok && s.stock.lumber === 5 && countItem(s, 'lumber') === 0, 'lumber goes to the stock');
  check(sim.selected(s).id === 'hoe' && (s.player.sel = 42, sim.selected(s)) === null, 'selected');
  removeItem(s, 'herb', 198); addItem(s, 'bread', 2); addItem(s, 'berry', 1);
  check(!act(sim.eat(s, slotOf(s, 'bread'))).ok, 'not hungry at full stamina');
  s.player.stamina = 50;
  check(sim.eat(s, slotOf(s, 'bread')).ok && s.player.stamina === 70 && countItem(s, 'bread') === 1, 'bread +20');
  check(sim.eat(s, slotOf(s, 'berry')).ok && s.player.stamina === 75, 'a berry +5');
  s.player.stamina = 95; check(sim.eat(s, slotOf(s, 'bread')).ok && s.player.stamina === 100, 'capped at the maximum');
  check(!act(sim.eat(s, 0)).ok && !act(sim.eat(s, -3)).ok && !act(sim.eat(s, slotOf(s, 'turnip'))).ok, 'a hoe and a turnip are not meals');
  check(ship(s, slotOf(s, 'turnip'), 10).ok && s.bin[0].n === 10 && countItem(s, 'turnip') === 68 && ship(s, slotOf(s, 'turnip'), 5).ok && s.bin.length === 1 && s.bin[0].n === 15, 'ship a part; the bin stacks');
  check(!act(ship(s, slotOf(s, 'turnip'), 0)).ok && !act(ship(s, slotOf(s, 'turnip'), 1.5)).ok, 'bad counts refused');
  addItem(s, 'seed_turnip', 1); check(!act(ship(s, slotOf(s, 'seed_turnip'))).ok, 'seeds are not shipped');

  let t = sim.tick(s, 60);
  check(!t.collapsed && s.cal.minute === 420, 'tick');
  t = sim.tick(s, 5000);
  check(t.collapsed && s.cal.minute === 1440 && sim.timeLabel(s) === '12:00 AM', 'collapse at midnight');
  sim.tick(s, NaN); sim.tick(s, -5); check(s.cal.minute === 1440, 'bad ticks ignored');
  sleep(s, { collapsed: true });
  check(s.player.stamina === 50 && s.cal.minute === 360 && s.cal.day === 2, 'she wakes at six with half stamina');
}

// ---------------------------------------------------------------- shops

{
  const SHOP_IDS = Object.keys(sim.SHOPS);
  const seenKeys = new Set();
  for (let season = 0; season < 4; season++) {
    for (const shop of SHOP_IDS) {
      const base = richer(); setDate(base, season, 2); base.player.stamina = 40;      // tired, so the clinic's check-up is on offer
      const stock = shopStock(base, shop);
      check(stock.length > 0, `${shop} sells something in ${SEASONS[season]}`);
      for (const e of stock) {
        seenKeys.add(e.key);
        check(typeof e.key === 'string' && e.label && e.desc && e.price > 0 && e.can === true && e.why === undefined, `${shop}/${e.key} is a full entry a rich player can buy`);
        const s = richer(); setDate(s, season, 2); s.player.stamina = 40;
        const r = buy(s, shop, e.key);
        check(r.ok && r.msg && s.player.money === 1e6 - e.price, `${shop}/${e.key} bought for its price`);
        const p = richer(); setDate(p, season, 2); p.player.money = e.price - 1; p.player.stamina = 40;
        const pe = shopStock(p, shop).find((x) => x.key === e.key), before = saveState(p), pr = act(buy(p, shop, e.key));
        check(pe.can === false && typeof pe.why === 'string' && pe.why && !pr.ok && pr.msg === pe.why && saveState(p) === before, `${shop}/${e.key} refused when poor, nothing changed`);
      }
    }
  }
  const want = [...Object.keys(CROPS).map((c) => `seed_${c}`), 'seed_grass', 'bread', 'rod', 'rucksack', 'chicken', 'cow', 'feed', 'fodder', 'milker', 'brush',
    'up_hoe', 'up_can', 'up_sickle', 'up_hammer', 'up_axe', 'greenhouse', 'tea', 'soup', 'pie', 'tonic'];
  check(want.every((k) => seenKeys.has(k)), `every shop key seen: missing ${want.filter((k) => !seenKeys.has(k))}`);

  const s = rich();
  const prices = Object.fromEntries(SHOP_IDS.flatMap((id) => shopStock(s, id).map((e) => [e.key, e.price])));
  const expect = { seed_turnip: 120, seed_potato: 150, seed_cucumber: 200, seed_strawberry: 150, seed_grass: 500, rod: 600, rucksack: 4000, chicken: 1500, cow: 5000, feed: 10, fodder: 20, up_hoe: 800, greenhouse: 4000, tea: 30, soup: 80, pie: 150, seed_moonflower: 1000, tonic: 500 };
  for (const [k, v] of Object.entries(expect)) check(prices[k] === v, `${k} costs ${v} (got ${prices[k]})`);
  check(shopStock(s, 'store').filter((e) => /^seed_/.test(e.key) && e.key !== 'seed_grass').length === 4, 'four spring seeds');
  setDate(s, 3, 2);
  check(!shopStock(s, 'store').some((e) => /^seed_/.test(e.key) && e.key !== 'seed_grass') && !act(buy(s, 'store', 'seed_turnip')).ok, 'no crop seeds in winter');
  check(buy(s, 'cafe', 'tea', 5).ok && countItem(s, 'tea') === 5 && s.player.money === 1e6 - 150, 'buy five teas');
  check(buy(s, 'ranch', 'feed', 30).ok && s.stock.feed === 30 && countItem(s, 'feed') === 0, 'feed goes to the stock');
  check(buy(s, 'store', 'rod').ok && countItem(s, 'rod') === 1 && !shopStock(s, 'store').some((e) => e.key === 'rod') && !act(buy(s, 'store', 'rod')).ok, 'the rod is sold once');
  check(shopStock(s, 'workshop').some((e) => e.key === 'up_rod' && e.needs === '5 scrap'), 'Ruess upgrades the rod too');
    const t = newGame({ seed: 2 }); t.player.money = 1e5;
  check(shopStock(t, 'store').find((e) => e.key === 'rucksack').price === 1500, 'the 15-slot rucksack costs 1500');
  check(buy(t, 'store', 'rucksack').ok && t.player.slots === 15 && t.player.inv.length === 15 && shopStock(t, 'store').find((e) => e.key === 'rucksack').price === 4000, 'then the 20-slot one at 4000');
  check(buy(t, 'store', 'rucksack').ok && t.player.slots === 20 && t.player.inv.length === 20 && shopStock(t, 'store').find((e) => e.key === 'rucksack').price === 8000, 'then the 25-slot one at 8000');
  check(buy(t, 'store', 'rucksack').ok && t.player.slots === 25 && t.player.inv.length === 25 && shopStock(t, 'store').find((e) => e.key === 'rucksack').price === 15000, 'then the 30-slot one at 15000');
  t.player.money = 1e5; check(buy(t, 'store', 'rucksack').ok && t.player.slots === 30 && t.player.inv.length === 30 && !shopStock(t, 'store').some((e) => e.key === 'rucksack'), 'and no more after 30');
  for (const args of [['nowhere', 'tea'], ['cafe', 'gold'], ['cafe', undefined], [null, null], ['__proto__', 'tea'], ['cafe', 'toString']]) check(!act(buy(t, ...args)).ok, `bad purchase refused: ${args}`);
  check(shopStock(t, 'nowhere').length === 0 && shopStock(t).length === 0, 'an unknown shop has nothing');
  check(buy(t, 'cafe', 'pie', -3).ok && countItem(t, 'pie') === 1, 'a silly count buys one');
  // full rucksack
  const f = newGame({ seed: 2 }); f.player.money = 1e5;
  for (let i = 0; i < 10; i++) if (!f.player.inv[i]) f.player.inv[i] = { id: 'herb', n: 99 };
  const e = shopStock(f, 'cafe')[0];
  check(e.can === false && /rucksack/.test(e.why) && !act(buy(f, 'cafe', 'tea')).ok && f.player.money === 1e5, 'no room, no sale');
  check(buy(f, 'ranch', 'fodder').ok, 'fodder needs no room');
  // missing materials
  const m = newGame({ seed: 2 }); m.player.money = 1e5;
  const up = shopStock(m, 'workshop').find((x) => x.key === 'up_hoe'), gh = shopStock(m, 'workshop').find((x) => x.key === 'greenhouse');
  check(up.can === false && /scrap/.test(up.why) && gh.can === false && /lumber/.test(gh.why) && gh.needs === '120 lumber', 'Ruess wants materials');
  check(!act(buy(m, 'workshop', 'up_hoe')).ok && !act(buy(m, 'workshop', 'greenhouse')).ok && m.player.money === 1e5, 'and will not start without them');
}

// ---------------------------------------------------------------- animals

{
  const s = rich(11);
  check(!act(sim.feedAll(s, 'chicken')).ok && !act(sim.collectEggs(s)).ok && !act(sim.milk(s, 0)).ok && !act(sim.brush(s, 0)).ok && !act(sim.petAnimal(s, 0)).ok, 'no animals yet');
  check(buy(s, 'ranch', 'chicken', 2).ok && buy(s, 'ranch', 'cow').ok && s.animals.length === 0 && s.pending.animals.length === 3, 'bought, not here yet');
  let rep = sleep(s);
  check(s.animals.length === 3 && s.pending.animals.length === 0 && rep.notes.filter((n) => /A new chicken arrived\./.test(n)).length === 2 && rep.notes.some((n) => /A new cow arrived\./.test(n)), 'delivered next morning, with notes');
  check(s.animals.every((a) => a.name && a.love === 0 && !a.fed) && new Set(s.animals.map((a) => a.name)).size === 3, 'named, unfed');
  const cow = s.animals.findIndex((a) => a.kind === 'cow'), hen = s.animals.findIndex((a) => a.kind === 'chicken');
  check(!act(sim.feedAll(s, 'chicken')).ok, 'no feed in stock');
  buy(s, 'ranch', 'feed', 1); buy(s, 'ranch', 'fodder', 10);
  let r = sim.feedAll(s, 'chicken');
  check(r.ok && /Only/.test(r.msg) && s.animals.filter((a) => a.kind === 'chicken' && a.fed).length === 1 && s.stock.feed === 0, 'one feed feeds one hen');
  check(!act(sim.milk(s, cow)).ok, 'no milker yet');
  buy(s, 'ranch', 'milker'); buy(s, 'ranch', 'brush');
  check(!act(sim.milk(s, cow)).ok, 'a hungry cow gives nothing');
  check(sim.feedAll(s, 'cow').ok && s.stock.fodder === 9 && !act(sim.feedAll(s, 'cow')).ok && !act(sim.feedAll(s, 'goat')).ok, 'fill the trough once');
  r = sim.milk(s, cow);
  check(r.ok && r.gained[0].id === 'milk_s' && countItem(s, 'milk_s') === 1 && !act(sim.milk(s, cow)).ok, 'small milk, once a day');
  check(!act(sim.milk(s, hen)).ok && !act(sim.brush(s, hen)).ok, 'hens are not cows');
  check(sim.brush(s, cow).ok && s.animals[cow].love === 3 && !act(sim.brush(s, cow)).ok, 'brush +3, once');
  check(sim.petAnimal(s, cow).ok && s.animals[cow].love === 4 && !act(sim.petAnimal(s, cow)).ok && sim.petAnimal(s, hen).ok, 'hello +1, once');
  rep = sleep(s);
  check(s.eggs === 1 && s.animals[cow].love === 6 && rep.notes.some((n) => /hungry/.test(n)), 'one egg from the fed hen; fed +2');
  check(s.animals.filter((a) => a.kind === 'chicken').map((a) => a.love).sort().join() === '0,3', 'unfed -5 (floored at 0), fed +2 on top of the hello');
  check(s.animals.every((a) => !a.fed && !a.milked && !a.brushed && !a.talked), 'a new day for the animals');
  r = sim.collectEggs(s);
  check(r.ok && r.gained[0].n === 1 && countItem(s, 'egg') === 1 && s.eggs === 0, 'collect the egg');
  s.animals[cow].love = 33; sim.feedAll(s, 'cow'); check(sim.milk(s, cow).gained[0].id === 'milk_s', 'love 33: small');
  sleep(s); s.animals[cow].love = 34; sim.feedAll(s, 'cow'); check(sim.milk(s, cow).gained[0].id === 'milk_m', 'love 34: medium');
  sleep(s); s.animals[cow].love = 66; sim.feedAll(s, 'cow'); check(sim.milk(s, cow).gained[0].id === 'milk_m', 'love 66: medium');
  sleep(s); s.animals[cow].love = 67; sim.feedAll(s, 'cow'); check(sim.milk(s, cow).gained[0].id === 'milk_l', 'love 67: large');
  s.animals[cow].love = 100; sleep(s); check(s.animals[cow].love === 100, 'affection stops at 100');
  // capacity
  check(buy(s, 'ranch', 'chicken', 4).ok && !act(buy(s, 'ranch', 'chicken')).ok && shopStock(s, 'ranch').find((e) => e.key === 'chicken').can === false, 'the coop holds six, counting those on the way');
  check(/coop/.test(shopStock(s, 'ranch').find((e) => e.key === 'chicken').why), 'and says so');
  check(!act(buy(s, 'ranch', 'cow', 4)).ok && buy(s, 'ranch', 'cow', 3).ok && !act(buy(s, 'ranch', 'cow')).ok, 'the barn holds four');
  sleep(s);
  check(s.animals.length === 10 && new Set(s.animals.map((a) => a.name)).size === 10, 'ten animals, ten names');

  // pasture
  for (const id of ['milk_s', 'milk_m', 'milk_l', 'egg']) removeItem(s, id, countItem(s, id));
  check(addItem(s, 'seed_grass', 2).ok, 'room for grass seed'); select(s, 'seed_grass');
  r = sim.usePasture(s, 5, 3, 0);
  check(r.ok && r.fx === 'sow' && r.changed.length === 9 && s.pasture.grass[3 * 12 + 5] === 1 && countItem(s, 'seed_grass') === 1, 'grass seed sows 3×3');
  check(!act(sim.usePasture(s, 5, 3, 0)).ok && countItem(s, 'seed_grass') === 1, 'not twice');
  select(s, 'sickle'); check(!act(sim.usePasture(s, 5, 3, 0)).ok, 'young grass is not cut');
  setDate(s, 0, 2);
  for (let d = 0; d < 4; d++) sleep(s);
  check(s.pasture.grass[3 * 12 + 5] === 2, 'stage 2 after four nights');
  for (let d = 0; d < 5; d++) sleep(s);
  check(s.pasture.grass[3 * 12 + 5] === 3, 'ripe after nine');
  const fodder = s.stock.fodder; select(s, 'sickle');
  r = sim.usePasture(s, 5, 3, 0);
  check(r.ok && r.cost === 2 && r.fx === 'cut' && r.gained[0].id === 'fodder' && s.stock.fodder === fodder + 1 && s.pasture.grass[3 * 12 + 5] === 1, 'cut to fodder; regrows from stage 1');
  s.player.toolLevel.sickle = 3;
  check(useTool(s, 'pasture', 5, 2, 0).changed.length === 8 && s.stock.fodder === fodder + 9, 'a Starsteel sickle cuts the rest (through useTool too)');
  setDate(s, 3, 2); const before = s.pasture.grass.join(''); for (let d = 0; d < 10; d++) sleep(s);
  check(s.pasture.grass.join('') === before, 'grass sleeps in winter');
  select(s, 'hoe'); check(!act(sim.usePasture(s, 1, 1, 0)).ok && !act(sim.usePasture(s, 'x', 1, 0)).ok, 'the hoe is no use in the pasture');
}

// ---------------------------------------------------------------- tool upgrades and the greenhouse

{
  const s = rich(12);
  let e = shopStock(s, 'workshop').find((x) => x.key === 'up_hoe');
  check(e.price === 800 && e.needs === '5 scrap' && /Alloy/.test(e.label), 'Alloy hoe: 800 and 5 scrap');
  check(buy(s, 'workshop', 'up_hoe').ok && countItem(s, 'hoe') === 0 && countItem(s, 'scrap') === 15 && s.pending.upgrade.tool === 'hoe' && s.pending.upgrade.level === 2 && s.player.toolLevel.hoe === 1, 'Ruess keeps the hoe overnight');
  check(!shopStock(s, 'workshop').some((x) => x.key === 'up_hoe') && shopStock(s, 'workshop').find((x) => x.key === 'up_can').can === false && !act(buy(s, 'workshop', 'up_can')).ok, 'one job at a time');
  let rep = sleep(s);
  check(rep.notes.includes('Ruess finished your Alloy hoe.') && countItem(s, 'hoe') === 1 && s.player.toolLevel.hoe === 2 && s.pending.upgrade === null, 'the Alloy hoe comes home');
  e = shopStock(s, 'workshop').find((x) => x.key === 'up_hoe');
  check(e.price === 2500 && e.needs === '5 alloy, 1 crystal', 'Starsteel: 2500, 5 alloy, 1 crystal');
  check(buy(s, 'workshop', 'up_hoe').ok && countItem(s, 'alloy') === 15 && countItem(s, 'crystal') === 4, 'paid in alloy and crystal');
  // a full rucksack at dawn: Ruess keeps it
  for (let i = 0; i < s.player.inv.length; i++) if (!s.player.inv[i]) s.player.inv[i] = { id: 'herb', n: 99 };
  rep = sleep(s);
  check(s.pending.upgrade && countItem(s, 'hoe') === 0 && s.player.toolLevel.hoe === 2 && rep.notes.some((n) => /rucksack is full/.test(n)), 'no room: the upgrade waits');
  removeItem(s, 'herb', 99); rep = sleep(s);
  check(s.pending.upgrade === null && s.player.toolLevel.hoe === 3 && rep.notes.includes('Ruess finished your Starsteel hoe.'), 'delivered once there is room');
  check(!shopStock(s, 'workshop').some((x) => x.key === 'up_hoe'), 'no upgrade past Starsteel');
  s.player.water = 3; buy(s, 'workshop', 'up_can'); sleep(s);
  check(s.player.toolLevel.can === 2 && s.player.water === 40, 'the new can comes back full');

  // greenhouse
  const g = rich(13);
  select(g, 'hoe');
  let r = act(useTool(g, 'greenhouse', 1, 1, 0));
  check(!r.ok && /greenhouse/.test(r.msg) && !act(harvest(g, 'greenhouse', 1, 1)).ok, 'the greenhouse is locked');
  check(buy(g, 'workshop', 'greenhouse').ok && g.flags.greenhouse === true && g.stock.lumber === 380 && g.player.money === 1e6 - 4000, 'repaired for 4000 and 120 lumber');
  check(!shopStock(g, 'workshop').some((x) => x.key === 'greenhouse') && !act(buy(g, 'workshop', 'greenhouse')).ok, 'only once');
  setDate(g, 3, 3);
  check(useTool(g, 'greenhouse', 1, 1, 0).ok, 'till indoors');
  addItem(g, 'seed_pumpkin', 1); select(g, 'seed_pumpkin');
  check(useTool(g, 'greenhouse', 1, 1, 0).ok && tile(g, 1, 1, 'greenhouse').crop.id === 'pumpkin', 'pumpkins in winter, indoors');
  for (let d = 0; d < 14; d++) { select(g, 'can'); sim.refillCan(g); check(useTool(g, 'greenhouse', 1, 1, 0).ok, 'water indoors'); sleep(g); }
  check(g.cal.season === 3 && sim.stageOf(tile(g, 1, 1, 'greenhouse')) === 3 && harvest(g, 'greenhouse', 1, 1).ok && countItem(g, 'pumpkin') === 1, 'a winter pumpkin');
  setDate(g, 3, 30); tile(g, 1, 1, 'greenhouse').crop = { id: 'pumpkin', age: 3, dead: false };
  sleep(g); check(!tile(g, 1, 1, 'greenhouse').crop.dead, 'no season indoors');
}

// ---------------------------------------------------------------- the Old World: the city ruins (2026-11-20)

{
  const a = newGame({ seed: 20 }), b = newGame({ seed: 20 }), c = newGame({ seed: 21 });
  const m = sim.enterMine(a, 1);
  check(m === a.mine && m.mode === 'city' && JSON.stringify(m) === JSON.stringify(sim.enterMine(b, 7)) && JSON.stringify(m) !== JSON.stringify(sim.enterMine(c, 1)), 'cities come from the seed (the depth means nothing now)');
  check(m.w === sim.CITY_W && m.h === sim.CITY_H && m.w >= 90 && m.h >= 70 && m.cells.length === m.w * m.h && m.hull === sim.HULL_MAX && m.credits === 0, 'one big city, hull full, nothing found yet');
  const second = sim.enterCity(a); check(second.seed !== m.seed && a.city.trips === 2, 'a new city every trip');
  check(!act(sim.hitRock(newGame({ seed: 1 }), 1, 1)).ok && !act(sim.defeatMonster(newGame({ seed: 1 }), 0)).ok && !act(sim.searchSpot(newGame({ seed: 1 }), 1, 1)).ok && !act(sim.cityHome(newGame({ seed: 1 }))).ok, 'not in the city');

  // monster stats scale with the zone; every kind has stats
  for (const k of Object.keys(sim.CITY_MONSTERS)) { const z0 = sim.cityMonster(k, 0), z2 = sim.cityMonster(k, 2); check(z0.hp > 0 && z0.dmg > 0 && z0.speed > 0 && z2.hp > z0.hp && z2.dmg > z0.dmg, `${k}: tougher in the core (hp ${z0.hp}→${z2.hp}, dmg ${z0.dmg}→${z2.dmg})`); }
  check(['rad_hound', 'glow_slime', 'rust_crawler', 'smog_wraith', 'spore_brute'].every((k) => sim.CITY_MONSTERS[k]), 'the five creatures');
  check(sim.CITY_MONSTERS.rad_hound.speed > sim.CITY_MONSTERS.glow_slime.speed && sim.CITY_MONSTERS.rad_hound.hp < sim.CITY_MONSTERS.rust_crawler.hp && sim.CITY_MONSTERS.spore_brute.hp > 3 * sim.CITY_MONSTERS.rust_crawler.hp && sim.CITY_MONSTERS.smog_wraith.drain, 'hounds fast and weak, crawlers armoured, wraiths drain, the brute a boss');
  check(sim.cityMonster('nonsense', 9).kind === 'rad_hound' && sim.cityMonster('glow_slime', -3).zone === 0, 'odd monster asks are made safe');

  // loot tables: by spot kind and zone
  const g = rich(30); const loot = (kind, z, n = 3000) => { let cr = 0, items = 0, rare = 0, worth = 0; for (let i = 0; i < n; i++) { const L = sim.cityLoot(g, kind, z); cr += L.credits; for (const [id, k] of L.items) { check(!!ITEMS[id], `loot ${id} is an item`); items += k; worth += (ITEMS[id].sell || 0) * k; if (['ring', 'datachip', 'film_camera', 'musicbox', 'data_core'].includes(id)) rare += k; } } return { cr: cr / n, items: items / n, rare: rare / n, worth: (worth + cr) / n }; };
  const r0 = loot('rubble', 0), r2 = loot('rubble', 2), car = loot('car', 1), safe0 = loot('safe', 1), safe2 = loot('safe', 2), lock = loot('locker', 1), vault = loot('vault', 2, 50);
  check(r0.worth > 3 && r0.worth < 40 && r2.worth > r0.worth, `rubble: a little, more in the core (${r0.worth.toFixed(0)} → ${r2.worth.toFixed(0)} cr a pile)`);
  check(r2.rare > r0.rare && safe2.rare > r2.rare, 'the rare finds come further in, and from safes');
  check(car.cr > 0.5 && safe0.cr > 15 && safe0.items >= 1 && safe2.worth > safe0.worth && lock.items > 0.6, `cars hold credits, safes always pay (${safe0.worth.toFixed(0)}–${safe2.worth.toFixed(0)} cr a safe), lockers mostly hold something`);
  check(vault.worth > 1500 && vault.items >= 5, `the sealed vault is the big prize (${vault.worth.toFixed(0)} cr)`);
  check(['old_coin', 'teddy_bear', 'film_camera', 'credit_chip', 'data_core'].every((id) => ITEMS[id] && ITEMS[id].sell > 0 && ITEMS[id].kind === 'valuable'), 'the new old-world valuables sell');
  check(sim.OLD_FINDS.every(([id]) => ITEMS[id]) && RELICS.every((r) => sim.OLD_FINDS.some(([id]) => id === r.id)), 'every relic can still be found');

  // searching: one stamina, once a spot, credits to the purse; a bad search costs nothing
  const s = rich(22); sim.enterCity(s); s.player.sel = 14;
  const spot = s.mine.spots.find((q) => q.kind === 'locker') || s.mine.spots[0], sx = spot.i % s.mine.w, sy = Math.floor(spot.i / s.mine.w);
  const money0 = s.player.money; s.player.stamina = 100;
  let r = act(sim.searchSpot(s, sx, sy));
  check(r.ok && s.player.stamina === 99 && spot.open && s.stats.searched === 1 && s.player.money === money0 + r.credits && s.mine.credits === r.credits, 'a search: one stamina, the credits in the purse');
  check(!act(sim.searchSpot(s, sx, sy)).ok && s.player.stamina === 99, 'searched once only');
  check(!act(sim.hitRock(s, -1, 0)).ok && !act(sim.hitRock(s, 'a')).ok && !act(sim.hitRock(s, 999, 999)).ok && !act(sim.searchSpot(s, sim.CITY_PAD[0], sim.CITY_PAD[1])).ok && s.player.stamina === 99, 'bad searches refused, free');
  const v = s.mine.spots.find((q) => q.kind === 'vault');
  if (v) { const vx = v.i % s.mine.w, vy = Math.floor(v.i / s.mine.w); check(!act(sim.searchSpot(s, vx, vy)).ok, 'the vault is guarded'); while (s.mine.monsters.some((q) => q.guard)) sim.defeatMonster(s, s.mine.monsters.findIndex((q) => q.guard)); r = act(sim.searchSpot(s, vx, vy)); check(r.ok && r.star && countItem(s, 'star_plum') === 1 && countItem(s, 'data_core') === 1 && s.flags.plum_ruins10, 'past the spore-brute: the vault, a data core and a star-plum'); }

  // creatures: credits by zone, a big slime splits, hits wear the hull (gas too, pools always)
  const q = rich(40); sim.enterCity(q);
  const n0 = q.mine.monsters.length, st = q.player.stamina, money = q.player.money;
  const si = q.mine.monsters.findIndex((x) => x.kind === 'glow_slime');
  r = sim.defeatMonster(q, si >= 0 ? si : 0);
  check(r.ok && Array.isArray(r.gained) && r.credits > 0 && q.player.stamina === st && q.player.money === money + r.credits && q.stats.monsters === 1, 'a creature beaten: credits, no stamina');
  if (si >= 0) check(r.spawned.length === 2 && q.mine.monsters.length === n0 + 1 && r.spawned.every((x) => x.small && x.hp === 1), 'a big glow-slime splits in two small ones');
  check(!act(sim.defeatMonster(q, 999)).ok && !act(sim.defeatMonster(q, -1)).ok && !act(sim.defeatMonster(q, 'x')).ok, 'bad monster indexes refused');
  let c0 = 0, c2 = 0; for (let i = 0; i < 200; i++) { q.mine.monsters.push({ id: 900 + i, x: 1, y: 1, ...sim.cityMonster('rust_crawler', i % 2 ? 2 : 0) }); c2 += i % 2 ? sim.defeatMonster(q, q.mine.monsters.length - 1).credits : 0; if (!(i % 2)) c0 += sim.defeatMonster(q, q.mine.monsters.length - 1).credits; }
  check(c2 > c0 * 1.5, `core creatures pay more (${c0} → ${c2})`);
  const h0 = q.mine.hull; r = sim.monsterHit(q, 'spore_brute', 2);
  check(r.ok && r.dmg === sim.cityMonster('spore_brute', 2).dmg && q.mine.hull === h0 - r.dmg && q.player.stamina === st, 'a hit wears the hull, not Sato');
  const pool = q.mine.cells.indexOf(6), gas = q.mine.haz.findIndex((x, i) => x && q.mine.cells[i] !== 6);
  r = sim.cityHazard(q, pool % q.mine.w, Math.floor(pool / q.mine.w)); check(r.drained === 3 && r.hazard === 2, 'a toxic pool stings: 3 hull');
  if (gas >= 0) { r = sim.cityHazard(q, gas % q.mine.w, Math.floor(gas / q.mine.w)); check(r.drained === 1, 'gas: 1 hull'); q.flags.filters = true; r = sim.cityHazard(q, gas % q.mine.w, Math.floor(gas / q.mine.w)); check(r.drained === 0 && r.filtered, 'the filters keep the gas out'); q.flags.filters = false; }
  check(sim.cityHazard(q, sim.CITY_PAD[0], sim.CITY_PAD[1]).drained === 0, 'the pad is safe');
  q.flags.filters = true; check(sim.enterCity(q).hullMax === sim.HULL_FILTERS, 'the filters also stiffen the hull'); q.flags.filters = false;

  // home: walk to the shuttle, or the tow (an hour, 20 stamina, the fee)
  const h = rich(44); sim.enterCity(h); sim.cityMove(h, 10, 10);
  check(!act(sim.cityHome(h, 'pad')).ok && h.mine, 'the shuttle is back at the pad');
  sim.cityMove(h, sim.CITY_PAD[0] + 0.5, sim.CITY_PAD[1] + 0.5); const t0 = h.cal.minute;
  r = act(sim.cityHome(h, 'pad')); check(r.ok && h.mine === null && h.cal.minute === t0 + 20 && r.fee === 0, 'home on the shuttle: twenty minutes');
  sim.enterCity(h); h.player.stamina = 80; const m0 = h.player.money, t1 = h.cal.minute;
  while (!sim.monsterHit(h, 'spore_brute', 2).out);
  r = act(sim.cityHome(h, 'tow')); check(r.ok && h.mine === null && h.player.stamina === 60 && h.player.money === m0 - sim.TOW_FEE && h.cal.minute === t1 + sim.TOW_MINUTES && r.msg, `towed: an hour, 20 stamina and ${sim.TOW_FEE} cr`);
  const poor = newGame({ seed: 45 }); poor.player.money = 40; sim.enterCity(poor); poor.player.stamina = 5; r = sim.cityHome(poor, 'tow'); check(poor.player.money === 0 && poor.player.stamina === 1, 'the tow never takes more than she has, nor her last stamina');
  check(sim.leaveMine(s).ok && s.mine === null, 'leave');
  sim.enterCity(s); sleep(s); check(s.mine === null, 'the trip ends overnight');
  // zones: news when she walks into a new one, first time ever once
  const z = rich(46); sim.enterCity(z); let zr = sim.cityMove(z, 48, 40); check(zr.changed && zr.zone === 1 && zr.first && z.city.best === 1, 'downtown: news');
  zr = sim.cityMove(z, 48, 3); check(zr.zone === 2 && zr.first && z.city.best === 2, 'the core'); sim.cityMove(z, 48, 66); sim.enterCity(z); zr = sim.cityMove(z, 48, 40); check(zr.changed && !zr.first, 'not news twice');

  // a trip's worth: everything near enough on 60 stamina, against a belt trip of 60 hammer blows
  const tripCity = (k) => { const t = rich(50 + k); t.player.money = 0; sim.enterCity(t); const M = t.mine; let worth = 0; const near = M.spots.filter((p) => p.kind !== 'vault').sort((x, y) => Math.hypot(x.i % M.w - 48, Math.floor(x.i / M.w) - 67) - Math.hypot(y.i % M.w - 48, Math.floor(y.i / M.w) - 67)).slice(0, 60);
    for (const p of near) { const x = p.i % M.w, y = Math.floor(p.i / M.w); t.player.stamina = 100; const rr = sim.searchSpot(t, x, y); worth += rr.credits || 0; for (const f of rr.gained || []) worth += (ITEMS[f.id].sell || 0) * f.n; for (let k = 0; k < t.player.inv.length; k++) if (t.player.inv[k] && ITEMS[t.player.inv[k].id].kind !== 'tool') t.player.inv[k] = null; }
    for (let i = M.monsters.length - 1; i >= 0; i--) if (M.monsters[i].zone < 2) { const rr = sim.defeatMonster(t, i); worth += rr.credits; for (const f of rr.gained) worth += (ITEMS[f.id].sell || 0) * f.n; }
    return worth; };
  const tripBelt = () => { const t = rich(51); t.belt = { seed: 51, gone: {}, reached: 5 }; sim.enterBelt(t, 5); const M = t.mine; let worth = 0, blows = 0; const lv = t.player.toolLevel.hammer || 1;
    for (let i = M.cells.length - 1; i >= 0 && blows < 60; i--) { if (!sim.isRock(M.cells[i]) || !sim.rockHits(M.cells[i], lv)) continue; let rr; do { t.player.stamina = 100; rr = sim.hitRock(t, i % M.w, Math.floor(i / M.w)); blows++; } while (rr.ok && !rr.broke); for (const f of rr.gained || []) worth += (ITEMS[f.id].sell || 0) * f.n; for (let k = 0; k < t.player.inv.length; k++) if (t.player.inv[k] && ITEMS[t.player.inv[k].id].kind !== 'tool') t.player.inv[k] = null; }
    return worth; };
  let wc = 0, wb = 0; for (let k = 0; k < 12; k++) { wc += tripCity(k); wb += tripBelt(); } wc /= 2; wb /= 2;
  check(wc > wb * 2.0 && wc < wb * 3.0, `a city trip is worth about a belt trip or a bit more (city ${Math.round(wc / 6)} cr, belt ${Math.round(wb / 6)} cr, on 60 stamina)`);
  console.log(`  trip worth on 60 stamina: city ${Math.round(wc / 6)} cr, belt (sector 5) ${Math.round(wb / 6)} cr`);

  // camps (safe spots): build (3 scrap + 100 cr), sleep there (the night runs, the hull is mended, the trip goes on), save and load there, fly home
  const cp = rich(60); sim.enterCity(cp); const C = cp.mine.camps[0];
  check(cp.mine.camps.length >= 2 && cp.mine.camps.every((c) => !c.built), 'a few safe spots, none built yet');
  check(!act(sim.buildCamp(cp)).ok, 'no camp on the landing pad');
  sim.cityMove(cp, C.x + 0.5, C.y + 0.5); const sc0 = countItem(cp, 'scrap'), mo0 = cp.player.money;
  r = act(sim.buildCamp(cp)); check(r.ok && C.built && countItem(cp, 'scrap') === sc0 - sim.CAMP_COST.scrap && cp.player.money === mo0 - sim.CAMP_COST.credits, `building a camp costs ${sim.CAMP_COST.scrap} scrap and ${sim.CAMP_COST.credits} cr`);
  check(!act(sim.buildCamp(cp)).ok && countItem(cp, 'scrap') === sc0 - sim.CAMP_COST.scrap, 'once a trip');
  const broke = newGame({ seed: 61 }); sim.enterCity(broke); const BC = broke.mine.camps[0]; sim.cityMove(broke, BC.x + 0.5, BC.y + 0.5); check(!act(sim.buildCamp(broke)).ok && !BC.built, 'no scrap, no camp');
  cp.mine.hull = 12; cp.player.stamina = 30; const day0 = cp.cal.day, crop = tile(cp, 1, 1); crop.till = true; crop.wet = true; crop.crop = { id: 'turnip', age: 0, dead: false };
  r = act(sim.campSleep(cp)); check(r.ok && cp.mine && cp.mine.mode === 'city' && cp.mine.hull === cp.mine.hullMax && cp.cal.day === day0 + 1 && cp.player.stamina === cp.player.maxStamina && tile(cp, 1, 1).crop.age === 1, 'sleeping at the camp: a night passes, the farm grows, the hull is mended, the trip goes on');
  check(sim.campNear(cp) >= 0 && C.built, 'she wakes at the camp, which still stands');
  check(act(sim.campSave(cp)).ok && cp.mine.saveCamp === 0, 'save at the camp');
  cp.player.map = 'ruins'; cp.player.x = C.x + 1.5; cp.player.y = C.y + 2.5;
  const back = sim.loadState(saveState(cp)); check(back && back.mine && back.mine.mode === 'city' && back.mine.camps[0].built && back.player.map === 'ruins', 'loading a camp save resumes at the camp');
  const ns = JSON.parse(saveState(cp)); ns.mine.saveCamp = null; const back2 = sim.loadState(JSON.stringify(ns)); check(back2 && back2.mine === null && back2.player.map === 'central', 'a trip not saved at a camp is not resumed: back at the space dock');
  const cm0 = cp.player.money, cs0 = cp.player.stamina; const t2 = cp.cal.minute;
  r = act(sim.cityHome(cp, 'fly')); check(r.ok && cp.mine === null && cp.player.money === cm0 && cp.player.stamina === cs0 && cp.cal.minute === t2 + 30, 'fly home from a camp: no penalty');
  const nf = rich(62); sim.enterCity(nf); sim.cityMove(nf, 10, 10); check(!act(sim.cityHome(nf, 'fly')).ok, 'no flying home without a camp');

  // saves: an old levels-style trip is dropped and Sato is back at the space dock
  const old = newGame({ seed: 47 }); old.mine = { mode: 'earth', depth: 4, floor: 4, w: 14, h: 12, cells: [], monsters: [], hatch: 3, star: -1, haz: [] }; old.player.map = 'ruins';
  sim.ensure(old); check(old.mine === null && old.player.map === 'central' && old.player.x === 7.5, 'an old Old World trip in a save: dropped, back at the space dock');
  const keep = newGame({ seed: 48 }); sim.enterCity(keep); sim.ensure(keep); check(keep.mine && keep.mine.mode === 'city', 'a city trip survives ensure()');
  const ld = sim.loadState(JSON.stringify(old)); check(ld && ld.mine === null, 'and it loads');

  // the Memory Room
  const d = rich(42);
  addItem(d, 'photo', 2); addItem(d, 'ring', 1);
  check(sim.museumCount(d) === 0 && !act(sim.donate(d, 0)).ok && !act(sim.donate(d, slotOf(d, 'scrap'))).ok && !act(sim.donate(d, 55)).ok, 'only relics are taken');
  r = sim.donate(d, slotOf(d, 'photo'));
  check(r.ok && r.first === true && r.msg && d.museum.photo === 1 && d.player.money === 1e6 + 100 && countItem(d, 'photo') === 1 && sim.museumCount(d) === 1, 'the first of a kind: 100 cr');
  r = sim.donate(d, slotOf(d, 'photo'));
  check(r.ok && r.first === false && d.museum.photo === 2 && d.player.money === 1e6 + 100 && sim.museumCount(d) === 1, 'the second: thanks only');
  check(sim.donate(d, slotOf(d, 'ring')).first && sim.museumCount(d) === 2, 'two kinds');
  for (const rel of RELICS) { addItem(d, rel.id, 1); sim.donate(d, slotOf(d, rel.id)); }
  check(sim.museumCount(d) === 10, 'all ten');
}

// ---------------------------------------------------------------- fishing

{
  const s = newGame({ seed: 50 });
  let r = act(sim.fish(s, 'farm'));
  check(!r.ok && /Seln/.test(r.msg) && r.gained.length === 0, 'no rod');
  addItem(s, 'rod', 1); select(s, 'hoe');
  check(!act(sim.fish(s, 'farm')).ok, 'the rod must be in hand');
  select(s, 'rod');
  check(!act(sim.fish(s, 'moon')).ok && !act(sim.fish(s)).ok && !act(sim.fish(s, 'toString')).ok, 'no water there');
  r = sim.fish(s, 'farm');
  check(r.ok && r.msg && r.gained.length === 1 && ITEMS[r.gained[0].id].kind === 'fish' && countItem(s, r.gained[0].id) === 1 && s.player.stamina === 98 && s.stats.fishCaught === 1 && s.fishLog[r.gained[0].id] === 1, 'a fish: two stamina, logged');
  for (let i = 0; i < 10; i++) if (!s.player.inv[i]) s.player.inv[i] = { id: 'herb', n: 99 };
  s.player.inv[slotOf(s, r.gained[0].id)] = { id: 'herb', n: 99 };
  r = act(sim.fish(s, 'farm'));
  check(!r.ok && s.player.stamina === 98 && s.stats.fishCaught === 1, 'a full rucksack: it got away, no cost');
  s.player.inv[9] = null; s.player.stamina = 1; r = sim.fish(s, 'farm');
  check(r.ok && r.fainted === true, 'fishing can wear her out too');

  const cast = (place, level, weather, season = 0, n = 6000) => {
    const g = newGame({ seed: 60 + level }); addItem(g, 'rod', 1); select(g, 'rod'); g.player.toolLevel.rod = level; g.weather = weather; g.cal.season = season;
    const got = {}; let value = 0;
    for (let i = 0; i < n; i++) { g.player.stamina = 100; const f = sim.fish(g, place).gained[0].id; got[f] = (got[f] || 0) + 1; value += ITEMS[f].sell; removeItem(g, f, 1); }
    check(Object.values(g.fishLog).reduce((a2, b2) => a2 + b2, 0) === n && g.stats.fishCaught === n && JSON.stringify(g.fishLog) === JSON.stringify(got), 'the fish log counts every species');
    return { got, value: value / n, share: (id) => (got[id] || 0) / n };
  };
  const farm = cast('farm', 1, 'sun'), village = cast('village', 1, 'sun'), hill = cast('hill', 1, 'sun');
  check(farm.share('fish_l') < village.share('fish_l') && village.share('fish_l') < hill.share('fish_l') && farm.share('fish_s') > village.share('fish_s') && village.share('fish_s') > hill.share('fish_s'), 'bigger fish at the village, biggest at the hill');
  check(farm.value < village.value && village.value < hill.value, `value by place: ${farm.value.toFixed(0)} < ${village.value.toFixed(0)} < ${hill.value.toFixed(0)}`);
  check(farm.share('fish_spring') > 0.02 && !farm.got.fish_summer && !farm.got.fish_king && !hill.got.fish_king, 'the season fish bites; no king on a Field rod');
  const hill2 = cast('hill', 2, 'sun'), hill3 = cast('hill', 3, 'sun'), farm3 = cast('farm', 3, 'sun');
  check(hill.value < hill2.value && hill2.value < hill3.value && farm.value < farm3.value, `better rods, better fish: ${hill.value.toFixed(0)} < ${hill2.value.toFixed(0)} < ${hill3.value.toFixed(0)}`);
  check(hill3.share('fish_l') > hill.share('fish_l') && hill3.share('fish_spring') > hill.share('fish_spring') && hill3.share('fish_s') < hill.share('fish_s'), 'the odds shift to large and seasonal fish');
  check(hill2.share('fish_king') > 0.001 && hill2.share('fish_king') < 0.008 && hill3.got.fish_king > 0 && !farm3.got.fish_king && !cast('village', 3, 'rain').got.fish_king, `Old Hollin: hill lake only, about 0.3% (${hill2.share('fish_king').toFixed(3)})`);
  const rain = cast('hill', 1, 'rain');
  check(rain.value > hill.value && rain.share('fish_s') < hill.share('fish_s'), `rain helps: ${hill.value.toFixed(0)} -> ${rain.value.toFixed(0)}`);
  for (let q = 0; q < 4; q++) { const c2 = cast('village', 2, 'sun', q, 1500), want = ['fish_spring', 'fish_summer', 'fish_autumn', 'fish_winter'][q]; check(c2.got[want] > 0 && Object.keys(c2.got).every((id) => ['fish_s', 'fish_m', 'fish_l', want].includes(id) || (FISH_TABLE[id] && FISH_TABLE[id].at.village)), `${SEASONS[q]}: ${ITEMS[want].name}`); }   // and the river's own fish
  // the rod upgrade
  const u = rich(70); buy(u, 'store', 'rod');
  check(buy(u, 'workshop', 'up_rod').ok && countItem(u, 'rod') === 0, 'Ruess takes the rod');
  const rep = sleep(u);
  check(u.player.toolLevel.rod === 2 && countItem(u, 'rod') === 1 && rep.notes.includes('Ruess finished your Alloy fishing rod.') && !shopStock(u, 'store').some((e) => e.key === 'rod'), 'an Alloy rod');
}

// ---------------------------------------------------------------- more fish (2026-11-21): the ladder, the rods, the money

{
  const FISH = Object.keys(ITEMS).filter((id) => ITEMS[id].kind === 'fish');
  check(FISH.length >= 28 && FISH.every((id) => ITEMS[id].sell > 0 && ITEMS[id].desc && ITEMS[id].detail), `${FISH.length} fish, each with a price, a description and a detail line`);
  check(Object.keys(FISH_TABLE).every((id) => ITEMS[id] && ITEMS[id].kind === 'fish' && [1, 2, 3].includes(FISH_TABLE[id].rod) && Object.keys(FISH_TABLE[id].at).every((p) => sim.FISH_PLACES.includes(p))), 'FISH_TABLE: real fish, real waters, real rods');
  const WATERS = ['farm', 'village', 'hill', 'canal', 'lower', 'sump'];
  check(WATERS.every((p) => sim.FISH_PLACES.includes(p)), 'six waters: the pond, the river, the hill lake, the canal, the basins, the Sump');
  // every water, weather, season and hour on one rod: what bites
  const sweep = (level, n = 250) => {
    const got = {}; let seed = 300 + 1000 * level;
    for (const place of WATERS) for (const weather of ['sun', 'rain', 'storm']) for (let season = 0; season < 4; season++) for (const minute of [400, 700, 1100, 1300]) {
      const g = newGame({ seed: seed++ }); addItem(g, 'rod', 1); select(g, 'rod'); g.player.toolLevel.rod = level; g.weather = weather; g.cal.season = season; g.cal.minute = minute;
      for (let i = 0; i < n; i++) { g.player.stamina = 100; const r = sim.fish(g, place); if (!r.ok) continue; const f = r.gained[0].id; got[f] = (got[f] || 0) + 1; removeItem(g, f, 1); }
    }
    return got;
  };
  const by = [null, sweep(1), sweep(2), sweep(3)], total = (g) => Object.values(g).reduce((a, b) => a + b, 0);
  const missing = FISH.filter((id) => !by[3][id]);
  check(!missing.length, `every fish is catchable somewhere on a Starsteel rod (missing: ${missing.join(', ') || 'none'})`);
  for (const level of [1, 2]) {
    const early = Object.keys(by[level]).filter((id) => FISH_TABLE[id] && FISH_TABLE[id].rod > level);
    check(!early.length, `a ${TOOL_LEVELS[level]} rod never lands a fish that needs a better one (${early.join(', ') || 'none'})`);
  }
  check(!by[1].abyss_koi && !by[1].fish_king && by[2].fish_spokerun && by[2].fish_paneray && by[2].fish_cloudfin && by[2].fish_cistern_sturgeon && !by[2].fish_earthlight_trout && !by[2].fish_ferryman, 'Alloy opens the premium fish, Starsteel the best');
  check(Object.keys(FISH_TABLE).every((id) => FISH_TABLE[id].rod === 1 ? by[1][id] > 0 : !by[1][id]), 'the Field rod already has the everyday new fish');
  // legendaries: rare, one a water (the pond, the river, the lake, the canal, the Sump)
  check(LEGEND_FISH.length >= 5 && new Set(LEGEND_FISH.map((id) => (FISH_TABLE[id] ? Object.keys(FISH_TABLE[id].at)[0] : 'sump'))).size === LEGEND_FISH.length, 'a legendary for each main water');
  for (const id of LEGEND_FISH) check(by[3][id] > 0 && by[3][id] / total(by[3]) < 0.004 && ITEMS[id].sell >= 1200 && /^Legendary/.test(ITEMS[id].desc), `${ITEMS[id].name}: legendary and rare (${(100 * by[3][id] / total(by[3])).toFixed(2)}% of all Starsteel casts)`);
  const best = (place, level, weather, minute, n = 4000) => { const g = newGame({ seed: 400 }); addItem(g, 'rod', 1); select(g, 'rod'); g.player.toolLevel.rod = level; g.weather = weather; g.cal.minute = minute; let k = 0; for (let i = 0; i < n; i++) { g.player.stamina = 100; const f = sim.fish(g, place).gained[0].id; if (LEGEND_FISH.includes(f)) k++; removeItem(g, f, 1); } return k / n; };
  const ferry = best('village', 3, 'rain', 1300), admiral = best('canal', 3, 'storm', 1300), mochi = best('farm', 2, 'sun', 400);
  check(ferry > 0 && ferry < 0.02 && admiral > 0 && admiral < 0.02 && mochi > 0 && mochi < 0.02, `even at their best hour a legendary is under 2% a cast (Ferryman ${ferry.toFixed(3)}, Admiral ${admiral.toFixed(3)}, Lady Mochi ${mochi.toFixed(3)})`);
  check(best('farm', 2, 'sun', 900) === 0 && best('village', 2, 'rain', 1300, 2000) === 0, 'Lady Mochi only at dawn; the Ferryman only on Starsteel');
  // credits a stamina, over the year: sun 60%, rain 30%, storm 10%, five hours of the day
  const worth = (place, level) => { let v = 0, st = 0;
    for (const [weather, share] of [['sun', 6], ['rain', 3], ['storm', 1]]) for (let season = 0; season < 4; season++) for (const minute of [380, 600, 900, 1150, 1300]) {
      const g = newGame({ seed: 500 + 100 * level + 10 * season + minute + weather.length }); addItem(g, 'rod', 1); select(g, 'rod'); g.player.toolLevel.rod = level; g.weather = weather; g.cal.season = season; g.cal.minute = minute;
      for (let i = 0; i < share * 40; i++) { g.player.stamina = 100; const r = sim.fish(g, place); const f = r.gained[0].id; v += ITEMS[f].sell; st += 100 - g.player.stamina; removeItem(g, f, 1); }
    }
    return v / st; };
  const W = Object.fromEntries(WATERS.map((p) => [p, [0, 1, 2, 3].map((l) => (l ? worth(p, l) : 0))]));
  for (const p of WATERS) check(W[p][1] < W[p][2] && W[p][2] < W[p][3], `${p}: every rod pays more a stamina (${W[p].slice(1).map((v) => v.toFixed(0)).join(' < ')})`);
  const main = (l) => (W.village[l] + W.hill[l] + W.canal[l]) / 3, top = Math.max(...WATERS.map((p) => W[p][3]));
  check(main(2) / main(1) > 1.35 && main(3) / main(2) > 1.25, `the river, lake and canal: Alloy +${Math.round(100 * (main(2) / main(1) - 1))}%, Starsteel +${Math.round(100 * (main(3) / main(2) - 1))}% a stamina`);
  console.log(`  fishing, cr a stamina (Field / Alloy / Starsteel): ${WATERS.map((p) => `${p} ${W[p].slice(1).map((v) => v.toFixed(0)).join('/')}`).join(', ')}`);
  // the bands: a Starsteel day (100 stamina) against a good crop day and a full Earth day
  const crop = Math.max(...Object.values(CROPS).map((c) => { const h = c.regrow ? 1 + Math.floor((DAYS_PER_SEASON - c.days) / c.regrow) : Math.floor(DAYS_PER_SEASON / c.days); return (h * c.sell - (c.regrow ? 1 : h) * c.bag / 9) / DAYS_PER_SEASON; })) * FIELD_SIZES.farm[0] * FIELD_SIZES.farm[1];
  let earth = 0; for (let k = 0; k < 6; k++) { const t = newGame({ seed: 600 + k }); while (t.player.inv.length < 30) t.player.inv.push(null); t.player.slots = 30; t.player.money = 0; sim.enterCity(t); const M = t.mine; let w = 0;
    for (let i = M.monsters.length - 1; i >= 0; i--) { const rr = sim.defeatMonster(t, i); w += rr.credits; for (const f of rr.gained) w += (ITEMS[f.id].sell || 0) * f.n; }
    const spots = M.spots.slice().sort((a, b) => Math.floor(a.i / M.w) - Math.floor(b.i / M.w));   // every creature, then 100 searches from the core (north) down: the vault too
    let used = 0; for (const p of spots) { if (used >= 100) break; t.player.stamina = 100; const rr = sim.searchSpot(t, p.i % M.w, Math.floor(p.i / M.w)); if (!rr.ok) continue; used += 100 - t.player.stamina; w += rr.credits || 0; for (const f of rr.gained || []) w += (ITEMS[f.id].sell || 0) * f.n; for (let q = 0; q < t.player.inv.length; q++) if (t.player.inv[q] && ITEMS[t.player.inv[q].id].kind !== 'tool') t.player.inv[q] = null; }
    earth += w / 6; }
  check(top * 100 > crop * 0.9 && top * 100 < crop * 1.6, `a Starsteel day of fishing (${Math.round(top * 100)} cr on 100 stamina) is about a good crop day (${Math.round(crop)} cr)`);
  check(top * 100 < earth, `but not better than a day on Earth (${Math.round(earth)} cr)`);
  check(main(1) * 100 < crop * 0.8, 'a Field rod is a side line, not a living');
  console.log(`  a day on 100 stamina: Field rod ${Math.round(main(1) * 100)} cr, Alloy ${Math.round(main(2) * 100)}, Starsteel ${Math.round(main(3) * 100)} (best water ${Math.round(top * 100)}); a good crop day ${Math.round(crop)}; Earth ${Math.round(earth)}`);
  // the new fish in the kitchen and in the villagers' hearts
  const k = newGame({ seed: 13 }); k.flags.kitchen = true; addItem(k, 'fish_spokerun', 1); let r = sim.cook(k, 'fish_grill'); check(r.ok && countItem(k, 'fish_spokerun') === 0, 'grilled fish takes a premium fish too');
  addItem(k, 'fish_mochi', 1); r = act(sim.cook(k, 'fish_grill')); check(!r.ok && countItem(k, 'fish_mochi') === 1, 'nobody grills a legendary');
  const kk = newGame({ seed: 14 }); kk.flags.kitchen = true; addItem(kk, 'fish_reedling', 1); addItem(kk, 'mushroom', 1); addItem(kk, 'pumpkin', 1); check(sim.cook(kk, 'forest_bento').ok, 'a reedling goes in a forest bento');
}

// ---------------------------------------------------------------- forage

{
  const s = newGame({ seed: 80 }), kinds = [{}, {}, {}, {}], counts = {};
  let stars = 0;
  for (let d = 0; d < 480; d++) {
    sleep(s);
    if (s.forage.some((f) => f.spot === sim.STAR_SPOT)) { stars++; check(s.forage.find((f) => f.spot === sim.STAR_SPOT).id === 'star_plum' && s.cal.day === sim.starPlumDay(s), 'the hill star-plum shows on its day'); s.forage = s.forage.filter((f) => f.spot !== sim.STAR_SPOT); }
    check(s.forage.length >= 3 && s.forage.length <= 6 && new Set(s.forage.map((f) => f.spot)).size === s.forage.length && s.forage.every((f) => f.spot >= 0 && f.spot < 14), `forage day ${d}`);
    counts[s.forage.length] = 1;
    for (const f of s.forage) kinds[s.cal.season][f.id] = 1;
  }
  check(Object.keys(counts).sort().join() === '3,4,5,6', 'three to six spots');
  check(stars === 16, `the star-plum spot shows once a season until found (${stars} in 16 seasons)`);
  check(Object.keys(kinds[0]).sort().join() === 'bamboo_shoot,fiddlehead,herb,wild_mint,wild_violet' && Object.keys(kinds[1]).sort().join() === 'berry,elderflower,herb,honeycomb,wild_grape' && Object.keys(kinds[2]).sort().join() === 'chestnut,matsutake,mushroom,rosehip,wild_apple' && Object.keys(kinds[3]).sort().join() === 'frostcap,pine_nut,snowdrop,winter_root', `forage by season: ${kinds.map((k) => Object.keys(k).sort().join('/')).join(' | ')}`);
  const f = s.forage[0], n = s.forage.length;
  const r = sim.pickForage(s, f.spot);
  check(r.ok && r.gained[0].id === f.id && countItem(s, f.id) === 1 && s.forage.length === n - 1 && !act(sim.pickForage(s, f.spot)).ok, 'pick it once');
  check(!act(sim.pickForage(s, 99)).ok && !act(sim.pickForage(s)).ok, 'nothing there');
  for (let i = 0; i < 10; i++) if (!s.player.inv[i]) s.player.inv[i] = { id: 'bread', n: 99 };
  s.player.inv[slotOf(s, f.id)] = { id: 'bread', n: 99 };
  check(!act(sim.pickForage(s, s.forage[0].spot)).ok && s.forage.length === n - 1, 'a full rucksack leaves it growing');
}

// ---------------------------------------------------------------- people

{
  const s = newGame({ seed: 90 });
  let t = sim.talk(s, 'seln');
  check(t.first === true && s.npc.seln.love === 2 && s.npc.seln.met && s.npc.seln.talked, 'first talk +2');
  t = sim.talk(s, 'seln'); check(t.first === false && s.npc.seln.love === 2, 'only once a day');
  addItem(s, 'turnip', 20);
  const slot = slotOf(s, 'turnip');
  let r = sim.gift(s, 'ruess', slot, 'loved', false);
  check(r.ok && r.delta === 8 && r.msg && s.npc.ruess.love === 8 && s.npc.ruess.gifted && s.npc.ruess.met && countItem(s, 'turnip') === 19, 'loved +8');
  r = act(sim.gift(s, 'ruess', slot, 'loved', false));
  check(r.ok && r.later && r.delta === 2 && s.npc.ruess.love === 10 && countItem(s, 'turnip') === 18, 'a second gift the same day: a quarter (+2)');
  r = sim.gift(s, 'ruess', slot, 'loved', false); check(r.later && r.delta === 2, 'and no worse for a third'); s.npc.ruess.love = 8;
  check(sim.gift(s, 'marrow', slot, 'liked', false).delta === 4 && sim.gift(s, 'corran', slot, 'neutral', false).delta === 1, 'liked +4, neutral +1');
  s.npc.oduya.love = 20; r = sim.gift(s, 'oduya', slot, 'disliked', false);
  check(r.ok && r.delta === -4 && s.npc.oduya.love === 16, 'disliked -4');
  check(sim.gift(s, 'maris', slot, 'loved', true).delta === 24 && sim.gift(s, 'vashti', slot, 'liked', true).delta === 12 && sim.gift(s, 'moraine', slot, 'neutral', true).delta === 3, 'birthday ×3');
  s.npc.general.love = 5; r = sim.gift(s, 'general', slot, 'disliked', true);
  check(r.delta === -5 && s.npc.general.love === 0, 'never below zero');
  check(!act(sim.gift(s, 'seln', 0, 'loved', false)).ok && !act(sim.gift(s, 'seln', 9, 'loved', false)).ok && !act(sim.gift(s, 'seln', -1, 'loved')).ok && !s.npc.seln.gifted, 'not a tool, not an empty hand');
  check(sim.gift(s, 'seln', slot, 'weird', false).delta === 1, 'an unknown tier is neutral');
  check(!act(sim.gift(s, '__proto__', slot, 'loved')).ok && !act(sim.gift(s, null, slot, 'loved')).ok && sim.talk(s, 42).first === false && sim.talk(s, 'sato').first === false && sim.talk(s, '__proto__').first === false, 'nobody there');
  sleep(s);
  check(Object.values(s.npc).every((n) => !n.talked && !n.gifted) && s.npc.seln.met && s.npc.ruess.love === 8, 'a new day: talk and gift again; love stays');
  check(sim.talk(s, 'seln').first && sim.gift(s, 'ruess', slot, 'loved', false).ok && s.npc.ruess.love === 16, 'and again');
  sim.addLove(s, 'marrow', 46); check(s.npc.marrow.love === 50 && sim.hearts(s, 'marrow') === 5, 'addLove and hearts');
  sim.addLove(s, 'marrow', 500); check(s.npc.marrow.love === 100 && sim.hearts(s, 'marrow') === 10, 'ten hearts at most');
  sim.addLove(s, 'marrow', -500); check(s.npc.marrow.love === 0 && !act(sim.addLove(s, 'marrow', NaN)).ok && s.npc.marrow.love === 0, 'and none at least');
  check(sim.hearts(s, 'nobody') === 0 && sim.hearts(s, 'constructor') === 0 && sim.hearts(s) === 0, 'hearts of a stranger');
  check(sim.setFlag(s, 'ev_ruess_2').ok && s.flags.ev_ruess_2 === true && sim.setFlag(s, 'x', 3).ok && s.flags.x === 3 && !act(sim.setFlag(s, '')).ok && !act(sim.setFlag(s, null)).ok, 'setFlag');
  check(sim.talk(s, 'newcomer').first && s.npc.newcomer.love === 2, 'a villager the sim has not heard of gets a record');
}

// ---------------------------------------------------------------- goals

{
  const s = newGame({ seed: 100 }), ids = sim.GOALS.map((g) => g.id);
  check(sim.GOALS.length === 9 && sim.GOALS.every((g) => g.id && g.title && g.hint && g.reward > 0) && ids.indexOf('fish') === ids.indexOf('ship') + 1, 'nine goals; fishing after shipping');
  const done = () => sim.goalState(s).filter((g) => g.done).map((g) => g.id).join();
  check(sim.goalState(s).length === 9 && sim.goalState(s).every((g, i) => g.id === ids[i] && !g.done && !g.claimed) && sim.claimGoals(s).length === 0, 'nothing done at the start');
  wipe(s); setObj(s, 1, 1, 'weed');
  select(s, 'sickle'); useTool(s, 'farm', 1, 1, 0); check(done() === 'clear', 'cleared');
  let c = sim.claimGoals(s);
  check(c.length === 1 && c[0].id === 'clear' && c[0].title && c[0].reward === sim.GOALS[0].reward && s.player.money === 500 + c[0].reward && sim.claimGoals(s).length === 0 && sim.goalState(s)[0].claimed, 'the reward is paid once');
  select(s, 'hoe'); useTool(s, 'farm', 1, 1, 0); check(done() === 'clear,till', 'tilled');
  select(s, 'seed_turnip'); useTool(s, 'farm', 1, 1, 0); check(done() === 'clear,till,sow', 'sown');
  select(s, 'can'); useTool(s, 'farm', 1, 1, 0); check(done() === 'clear,till,sow,water', 'watered');
  addItem(s, 'herb', 1); ship(s, slotOf(s, 'herb')); check(done() === 'clear,till,sow,water,ship', 'shipped');
  addItem(s, 'rod', 1); select(s, 'rod'); sim.fish(s, 'farm'); check(done() === 'clear,till,sow,water,ship,fish', 'fished');
  sim.talk(s, 'seln'); sim.talk(s, 'ruess'); check(!sim.goalState(s)[6].done, 'two villagers are not three');
  sim.talk(s, 'marrow'); check(sim.goalState(s)[6].done, 'three are');
  tile(s, 1, 1).crop.age = 4; harvest(s, 'farm', 1, 1); check(sim.goalState(s)[7].done && !sim.goalState(s)[8].done, 'harvested');
  const money = s.player.money; c = sim.claimGoals(s);
  check(c.length === 7 && s.player.money === money + c.reduce((a, g) => a + g.reward, 0), 'seven rewards at once');
  addItem(s, 'pumpkin', 4); ship(s, slotOf(s, 'pumpkin')); check(!sim.goalState(s)[8].done, 'not earned until paid');
  sleep(s); check(sim.goalState(s)[8].done && sim.claimGoals(s)[0].id === 'earn' && sim.goalState(s).every((g) => g.done && g.claimed), 'earned 1000: all done');
  const st = s.stats;
  check(st.tilesCleared === 1 && st.tilled === 1 && st.sown === 1 && st.watered === 1 && st.harvested === 1 && st.shippedItems === 5 && st.fishCaught === 1 && st.days === 1, 'the counters');
}

// ---------------------------------------------------------------- soak: 120 days of anything

{
  const exported = ['newGame', 'saveState', 'loadState', 'weekday', 'absDay', 'dateLabel', 'timeLabel', 'hearts', 'cropStage', 'stageOf', 'tick', 'addItem', 'removeItem', 'countItem', 'selected',
    'useTool', 'harvest', 'refillCan', 'usePasture', 'feedAll', 'milk', 'brush', 'petAnimal', 'collectEggs', 'ship', 'eat', 'shopStock', 'buy', 'talk', 'gift', 'addLove', 'setFlag',
    'enterMine', 'hitRock', 'leaveMine', 'defeatMonster', 'monsterHit', 'donate', 'museumCount', 'fish', 'pickForage', 'sleep', 'goalState', 'claimGoals'];
  check(exported.every((n) => typeof sim[n] === 'function') && Array.isArray(sim.GOALS) && typeof sim.SHOPS === 'object', `every export of the contract: missing ${exported.filter((n) => typeof sim[n] !== 'function')}`);

  for (const seed of [1001, 1002, 1003]) {
    const s = newGame({ seed });
    let k = seed, threw = null, minMoney = s.player.money, actions = 0, good = 0;
    const r = (n) => ((k = (k * 1103515245 + 12345) & 0x7fffffff) >>> 8) % n;   // high bits: the low ones cycle
    const junk = [undefined, null, -1, 999, 1.5, NaN, 'x', '__proto__', 'constructor', {}, [], true, Infinity];
    const any = (v) => (r(12) === 0 ? junk[r(junk.length)] : v);
    const itemIds = Object.keys(ITEMS), shops = [...Object.keys(sim.SHOPS), 'nowhere'], npcs = [...sim.NPC_IDS, 'nobody'];
    const tiers = ['loved', 'liked', 'neutral', 'disliked'];
    const moves = [
      () => { s.player.sel = r(s.player.slots + 1); },
      () => useTool(s, any(['farm', 'farm', 'farm', 'greenhouse', 'pasture'][r(5)]), any(r(18) - 1), any(r(20) - 1), any(r(4))),
      () => useTool(s, 'farm', r(16), r(18), r(4)),
      () => { s.player.sel = r(6); return useTool(s, 'farm', r(16), r(18), r(4)); },
      () => harvest(s, any(['farm', 'greenhouse'][r(2)]), any(r(16)), any(r(18))),
      () => sim.refillCan(s),
      () => sim.usePasture(s, any(r(13)), any(r(8)), any(r(4))),
      () => sim.feedAll(s, any(['chicken', 'cow'][r(2)])),
      () => sim.milk(s, any(r(10))), () => sim.brush(s, any(r(10))), () => sim.petAnimal(s, any(r(10))), () => sim.collectEggs(s),
      () => ship(s, any(r(s.player.slots)), r(3) ? undefined : any(r(5))),
      () => sim.eat(s, any(r(s.player.slots))),
      () => { const shop = any(shops[r(shops.length)]), stock = shopStock(s, shop); return buy(s, shop, any(stock.length ? stock[r(stock.length)].key : 'tea'), r(4) ? 1 : any(r(6))); },
      () => sim.talk(s, any(npcs[r(npcs.length)])),
      () => sim.gift(s, any(npcs[r(npcs.length)]), any(r(s.player.slots)), any(tiers[r(4)]), r(10) === 0),
      () => sim.addLove(s, any(npcs[r(npcs.length)]), any(r(9) - 4)),
      () => sim.setFlag(s, any(`ev_${r(5)}`)),
      () => { sim.enterMine(s, any(1 + r(15)), any(['earth', 'belt'][r(2)])); return { ok: true }; },
      () => [() => sim.takeShuttle(s, any(1 + r(5))), () => sim.hazardTick(s, any(r(14)), any(r(12))), () => { sim.enterBelt(s, any(1 + r(12))); return { ok: true }; }][r(3)](),
      () => sim.hitRock(s, any(r(14)), any(r(12))), () => sim.hitRock(s, r(14), r(12)),
      () => sim.defeatMonster(s, any(r(4))), () => sim.monsterHit(s), () => sim.leaveMine(s),
      () => [() => sim.searchSpot(s, any(r(96)), any(r(72))), () => sim.cityMove(s, any(r(96)), any(r(72))), () => sim.cityHazard(s, any(r(96)), any(r(72))), () => sim.cityHome(s, any(['pad', 'tow'][r(2)])), () => sim.monsterHit(s, any(['rad_hound', 'spore_brute', 'smog_wraith'][r(3)]), any(r(3)))][r(5)](),
      () => sim.donate(s, any(r(s.player.slots))),
      () => sim.fish(s, any(['farm', 'village', 'hill'][r(3)])),
      () => sim.pickForage(s, any(r(14))),
      () => addItem(s, any(itemIds[r(itemIds.length)]), any(1 + r(3))),
      () => { removeItem(s, any(itemIds[r(itemIds.length)]), any(1 + r(3))); },
      () => { sim.claimGoals(s); sim.goalState(s); sim.dateLabel(s); sim.timeLabel(s); sim.weekday(s); sim.hearts(s, any('seln')); sim.cropStage(any(null)); sim.stageOf(any(s.fields.farm.tiles[r(288)])); sim.museumCount(s); },
      () => sim.tick(s, any(r(90))),
      () => { s.player.money += r(5) === 0 ? 3000 : 0; },   // a windfall now and then, so the shops get used
      () => sim.placeItem(s, any(['farm', 'hill', 'village'][r(3)]), any(r(44)), any(r(34))),
      () => sim.pickUpPlaced(s, any(['farm', 'hill'][r(2)]), any(r(44)), any(r(34))),
      () => sim.plantTree(s, any('farm'), any(r(44)), any(r(34))),
      () => sim.pickFruit(s, any(r(4))), () => sim.removeTree(s, any(r(4))),
      () => sim.storeItem(s, any(`chest:${r(3)}`), any(r(s.player.slots))), () => sim.takeItem(s, any(`chest:${r(3)}`), any(r(20))),
      () => sim.useCharger(s, any(r(3))), () => sim.chargeRobot(s, any(r(4))), () => sim.setRobotJob(s, any(r(4)), any(['water', 'harvest', 'animals', 'rest'][r(4)])),
      () => sim.renameRobot(s, any(r(4)), any('Bean')),
      () => [() => sim.grantPlum(s, any(sim.STAR_PLUM_SOURCES[r(10)])), () => sim.sellToMarket(s, any(r(s.player.slots))), () => sim.gallerySit(s),
        () => sim.siloAdd(s, any(r(s.player.slots))), () => sim.millAdd(s, any(r(s.player.slots))), () => sim.yardDeposit(s), () => sim.yardCollect(s),
        () => sim.hydroPlant(s, any(r(8))), () => sim.hydroHarvest(s, any(r(8)))][r(9)](), () => sim.soak(s), () => sim.shipBasket(s), () => sim.basketTake(s, any(r(3))),
    ];
    try {
      for (let day = 0; day < 120; day++) {
        for (let i = 0; i < 60; i++) {
          const res = moves[r(moves.length)]();
          actions++;
          if (res && typeof res === 'object' && !Array.isArray(res) && 'ok' in res) {
            if (res.ok) good++;
            else { refusals.push(res.msg); if (typeof res.msg !== 'string' || !res.msg) { check(false, `seed ${seed} day ${day}: a refusal without a message: ${JSON.stringify(res)}`); } }
            if (res.fainted) sleep(s, { collapsed: true });
          }
          minMoney = Math.min(minMoney, s.player.money);
          if (s.player.stamina < 0 || s.player.stamina > s.player.maxStamina) throw new Error(`stamina ${s.player.stamina}`);
        }
        const rep = sleep(s, { collapsed: sim.tick(s, 0).collapsed });
        if (!rep.notes.every((n) => typeof n === 'string' && /[.!?]$/.test(n) && !/undefined|NaN|null|\[object/.test(n))) throw new Error(`bad notes: ${rep.notes}`);
        const nan = walk(s, 'state', []);
        if (nan.length) throw new Error(`NaN or undefined at ${nan.slice(0, 3)}`);
        if (s.player.inv.length !== s.player.slots) throw new Error('rucksack size');
        if (s.player.inv.some((x) => x && (!ITEMS[x.id] || !Number.isInteger(x.n) || x.n < 1 || x.n > 99))) throw new Error('a bad stack');
        if (Object.values(s.stock).some((v) => v < 0) || s.eggs < 0 || s.player.water < 0) throw new Error('a negative store');
        if (s.animals.filter((a) => a.kind === 'chicken').length > 6 || s.animals.filter((a) => a.kind === 'cow').length > 4) throw new Error('too many animals');
        if (day === 60) { const back = loadState(saveState(s)); if (!back || saveState(back) !== saveState(s)) throw new Error('round trip'); }
      }
    } catch (e) { threw = e; }
    check(!threw, `soak ${seed}: no exceptions (${threw && threw.stack})`);
    check(minMoney >= 0, `soak ${seed}: money never negative (${minMoney})`);
    check(s.cal.year === 2 && s.cal.season === 0 && s.cal.day === 1 && s.stats.days === 120, `soak ${seed}: 120 days pass`);
    check(good > actions * 0.15, `soak ${seed}: plenty of actions worked (${good} of ${actions})`);
    check(Object.getPrototypeOf(s.npc) === Object.prototype && Object.getPrototypeOf(s.flags) === Object.prototype && ({}).greenhouse === undefined, `soak ${seed}: no prototype mischief`);
  }
}

const bad = refusals.filter((m) => typeof m !== 'string' || m.length < 8 || !/[.!?]$/.test(m) || /undefined|NaN|null|\[object/.test(m));
check(!bad.length, `refusal messages readable: ${JSON.stringify([...new Set(bad)].slice(0, 5))}`);
console.log(`\n${refusals.length} refusals seen, ${new Set(refusals).size} different, e.g.:`, [...new Set(refusals)].slice(0, 6).join(' | '));
// ---------------------------------------------------------------- storage box, fridge, kitchen (2026-11-18)
{
  const s = newGame({ seed: 77 });
  check(Array.isArray(s.storage) && s.storage.length === sim.STORAGE_SIZE && Array.isArray(s.fridge), 'new game has a storage box and a fridge');
  sim.addItem(s, 'turnip', 5); const slot = s.player.inv.findIndex((x) => x && x.id === 'turnip');
  let r = sim.storeItem(s, 'storage', slot, 3); check(r.ok && sim.countItem(s, 'turnip') === 2 && s.storage.some((b) => b && b.id === 'turnip' && b.n === 3), 'store 3 turnips in the storage box');
  r = sim.storeItem(s, 'fridge', slot); check(!r.ok && r.msg, 'fridge refused before the kitchen refit');
  r = sim.cook(s, 'salad'); check(!r.ok && r.msg, 'no cooking before the kitchen refit');
  s.player.money = 1e5; s.stock.lumber = 100;
  r = sim.buy(s, 'workshop', 'kitchen'); check(r.ok && s.flags.kitchen && s.player.money === 1e5 - 2500 && s.stock.lumber === 40, 'kitchen refit bought from Ruess');
  r = sim.storeItem(s, 'fridge', slot); check(r.ok && !sim.countItem(s, 'turnip'), 'turnips go in the fridge after the refit');
  const hoe = s.player.inv.findIndex((x) => x && x.id === 'hoe'); r = sim.storeItem(s, 'fridge', hoe); check(!r.ok, 'a hoe does not go in the fridge');
  r = sim.cook(s, 'salad'); check(!r.ok, 'a salad needs two different vegetables');
  sim.addItem(s, 'potato', 1); r = sim.cook(s, 'salad'); check(r.ok && sim.countItem(s, 'salad') === 1 && !sim.countItem(s, 'potato'), 'salad from a rucksack potato and a fridge turnip');
  check(s.fridge.reduce((a, b) => a + (b && b.id === 'turnip' ? b.n : 0), 0) === 1, 'the fridge turnip was used');
  sim.addItem(s, 'egg', 1); sim.addItem(s, 'milk_m', 1); r = sim.cook(s, 'omelette'); check(r.ok && sim.countItem(s, 'omelette') === 1 && !sim.countItem(s, 'egg'), 'omelette');
  const k = s.storage.findIndex((b) => b && b.id === 'turnip'); r = sim.takeItem(s, 'storage', k, 2); check(r.ok && sim.countItem(s, 'turnip') === 2 && s.storage[k].n === 1, 'take 2 turnips back out');
  check(sim.recipeBook(s).length === sim.RECIPES.length, 'recipe book lists every recipe');
  const old = JSON.parse(saveState(newGame({ seed: 3 }))); delete old.storage; delete old.fridge; const o = loadState(JSON.stringify(old));
  sim.addItem(o, 'egg', 1); r = sim.storeItem(o, 'storage', o.player.inv.findIndex((x) => x && x.id === 'egg')); check(r.ok && o.storage.length === sim.STORAGE_SIZE, 'an old save gains a storage box');
}
// ---------------------------------------------------------------- trees and berry bushes (2026-11-18)
{
  const s = newGame({ seed: 91 }); s.player.sel = s.player.inv.findIndex((x) => x && x.id === 'axe');
  let r; for (let i = 0; i < 4; i++) { r = sim.chopTree(s, 'farm:7'); check(r.ok && !r.felled, 'chop ' + (i + 1) + ' does not fell yet'); }
  const lumber = s.stock.lumber; r = sim.chopTree(s, 'farm:7'); check(r.ok && r.felled && s.stock.lumber === lumber + 8 && sim.treeFelled(s, 'farm:7'), 'fifth chop fells the tree for 8 lumber');
  r = sim.chopTree(s, 'farm:7'); check(!r.ok && r.msg, 'a stump cannot be chopped');
  s.player.sel = 0; r = sim.chopTree(s, 'farm:8'); check(!r.ok && /axe/.test(r.msg), 'chopping needs the axe');
  s.cal.day += 14; check(!sim.treeFelled(s, 'farm:7'), 'the tree grows back after 14 days');
  const t = newGame({ seed: 5 }); r = sim.pickBush(t, 'hill:3'); check(r.ok && sim.countItem(t, 'berry') >= 1, 'pick berries from a bush');
  r = sim.pickBush(t, 'hill:3'); check(!r.ok && r.msg, 'a picked bush needs a few days');
  t.cal.day += 3; check(sim.pickBush(t, 'hill:3').ok, 'berries again after three days');
  t.cal.season = 3; check(!sim.pickBush(t, 'hill:4').ok, 'no berries in winter');
}

// ---------------------------------------------------------------- 2026-11-18: more things to own and do
{
  // data: every item has a long description; the new forage, fruit, gear and dishes exist
  for (const [id, it] of Object.entries(ITEMS)) check(typeof it.detail === 'string' && it.detail.length > 30 && it.detail !== it.desc, `item ${id} has a detail text`);
  const NEW = { bamboo_shoot: 'forage', wild_mint: 'forage', fiddlehead: 'forage', wild_grape: 'forage', honeycomb: 'forage', chestnut: 'forage', wild_apple: 'forage', matsutake: 'forage', pine_nut: 'forage', winter_root: 'forage',
    apple: 'fruit', peach: 'fruit', cherry: 'fruit', persimmon: 'fruit', sapling_apple: 'sapling', sapling_peach: 'sapling', sapling_cherry: 'sapling', sapling_persimmon: 'sapling',
    basket: 'tool', field_chest: 'placeable', solar_panel: 'placeable', battery: 'part', battery_full: 'part' };
  for (const [id, kind] of Object.entries(NEW)) check(ITEMS[id] && ITEMS[id].kind === kind, `${id} is a ${kind}`);
  for (const id of Object.keys(NEW)) if (['forage', 'fruit'].includes(ITEMS[id].kind)) check(ITEMS[id].sell > 0, `${id} sells`);
  check(ITEMS.matsutake.sell >= 300 && ITEMS.matsutake.sell > 4 * ITEMS.mushroom.sell, 'matsutake is valuable');
  check(ITEMS.wild_grape.stamina > 0 && ITEMS.peach.stamina > 0 && !ITEMS.matsutake.stamina, 'edible where sensible');
  // recipes: at least 18, each sells for more than its dearest ingredients and restores stamina
  check(sim.RECIPES.length >= 18, `${sim.RECIPES.length} recipes`);
  const grouped = new Set(sim.RECIPE_GROUPS.flatMap(([, ids]) => ids));
  for (const r of sim.RECIPES) {
    const out = ITEMS[r.id], worst = r.needs.reduce((a, slot) => a + Math.max(...slot.map((x) => ITEMS[x].sell || (x === 'bread' ? 60 : 0))), 0);
    check(out && out.kind === 'food' && out.stamina > 0 && out.sell > 0 && r.needs.every((slot) => slot.every((x) => ITEMS[x])), `recipe ${r.id} is complete`);
    if (!['salad', 'veg_soup', 'cooked_meal', 'omelette', 'fish_grill'].includes(r.id)) check(out.sell > worst, `${r.id} (${out.sell}) is worth more than its ingredients (${worst})`);
    check(grouped.has(r.id), `${r.id} is in a kitchen group`);
  }
  const k = newGame({ seed: 12 }); k.flags.kitchen = true; while (k.player.inv.length < 20) k.player.inv.push(null); k.player.slots = 20;
  for (const id of ['wild_grape', 'wild_grape', 'wild_grape']) addItem(k, id, 1);
  let r = sim.cook(k, 'grape_juice'); check(r.ok && countItem(k, 'grape_juice') === 1 && k.cooked.grape_juice === 1, 'grape juice, and the cookbook remembers');
  addItem(k, 'peach', 1); addItem(k, 'egg', 1); addItem(k, 'bread', 1); r = sim.cook(k, 'fruit_tart'); check(r.ok && !countItem(k, 'peach') && !countItem(k, 'bread'), 'fruit tart from a peach, an egg and bread');
  addItem(k, 'apple', 2); r = sim.cook(k, 'fruit_salad'); check(!r.ok, 'a fruit salad needs two different fruits');
  addItem(k, 'cherry', 1); r = sim.cook(k, 'fruit_salad'); check(r.ok && countItem(k, 'apple') === 1, 'apple and cherry make a fruit salad');
  addItem(k, 'fish_s', 1); addItem(k, 'mushroom', 1); addItem(k, 'pumpkin', 1); r = sim.cook(k, 'forest_bento'); check(r.ok && countItem(k, 'forest_bento') === 1, 'forest bento');
  const book = sim.recipeBook(k); check(book.every((b) => b.group && Array.isArray(b.needs) && b.needs.length) && book.find((b) => b.id === 'forest_bento').cooked === 1, 'the recipe book has groups and what each needs');

  // the bigger rucksack: 25 then 30 slots
  const big = newGame({ seed: 3 }); big.player.money = 1e6;
  for (let i = 0; i < 4; i++) buy(big, 'store', 'rucksack');
  check(big.player.slots === 30 && big.player.inv.length === 30 && big.player.money === 1e6 - 1500 - 4000 - 8000 - 15000, 'four rucksack tiers to 30 slots');

  // the basket
  const b = newGame({ seed: 21 }); b.player.money = 5000; wipe(b);
  check(shopStock(b, 'store').find((e) => e.key === 'basket').price === 800 && buy(b, 'store', 'basket').ok && countItem(b, 'basket') === 1 && !shopStock(b, 'store').some((e) => e.key === 'basket'), 'the basket costs 800, once');
  const t1 = tile(b, 2, 2); Object.assign(t1, { till: true, crop: { id: 'turnip', age: 4, dead: false } });
  const t2 = tile(b, 3, 2); Object.assign(t2, { till: true, crop: { id: 'strawberry', age: 8, dead: false } });
  select(b, 'basket');
  r = harvest(b, 'farm', 2, 2); check(r.ok && r.basket && !countItem(b, 'turnip') && b.player.basket[0].id === 'turnip' && b.player.basket[0].n === 1, 'with the basket in hand the turnip goes in the basket');
  r = harvest(b, 'farm', 3, 2); check(r.ok && sim.basketTotal(b) === 2 && tile(b, 3, 2).crop && tile(b, 3, 2).crop.age === 6, 'a regrowing crop stays on the plant');
  addItem(b, 'egg', 1); b.player.basket.push({ id: 'herb', n: 28 });
  Object.assign(t1, { crop: { id: 'turnip', age: 4, dead: false } }); r = harvest(b, 'farm', 2, 2); check(r.ok && !r.basket && countItem(b, 'turnip') === 1 && /basket is full/.test(r.msg), 'a full basket (30) sends it to the rucksack');
  r = sim.basketTake(b, 0, 1); check(r.ok && countItem(b, 'turnip') === 2 && !b.player.basket.some((x) => x.id === 'turnip'), 'take a turnip out of the basket');
  r = sim.shipBasket(b); check(r.ok && !b.player.basket.length && b.bin.find((x) => x.id === 'herb').n === 28 && b.bin.find((x) => x.id === 'strawberry').n === 1, 'ship the whole basket');
  check(!act(sim.shipBasket(b)).ok && !act(sim.basketTake(b, 5)).ok && !act(sim.basketTake(b, 'x')).ok, 'an empty basket ships nothing');
  b.player.sel = 0; b.forage = [{ spot: 3, id: 'wild_mint' }]; select(b, 'basket'); r = sim.pickForage(b, 3); check(r.ok && r.basket && b.player.basket[0].id === 'wild_mint' && b.foraged.wild_mint === 1, 'forage into the basket, and the forage log counts it');

  // field chests
  const c = rich(31);
  check(shopStock(c, 'workshop').find((e) => e.key === 'field_chest').price === 1200, 'a field chest costs 1200');
  const lumber = c.stock.lumber; check(buy(c, 'workshop', 'field_chest').ok && buy(c, 'workshop', 'field_chest').ok && countItem(c, 'field_chest') === 2 && c.stock.lumber === lumber - 40, 'two chests, 20 lumber each');
  select(c, 'field_chest');
  r = sim.placeItem(c, 'village', 4, 4); check(!r.ok && /farm or the hill/.test(r.msg), 'no chests in the village');
  r = sim.placeItem(c, 'farm', 30, 20); check(r.ok && c.chests.length === 1 && c.chests[0].items.length === 20 && countItem(c, 'field_chest') === 1 && sim.chestAt(c, 'farm', 30, 20) === 0, 'set a chest down on the farm');
  select(c, 'field_chest'); check(!act(sim.placeItem(c, 'farm', 30, 20)).ok, 'not on top of another');
  r = sim.placeItem(c, 'hill', 3, 3); check(r.ok && c.chests.length === 2 && !countItem(c, 'field_chest'), 'and one on the hill');
  addItem(c, 'potato', 7); r = sim.storeItem(c, 'chest:0', slotOf(c, 'potato')); check(r.ok && c.chests[0].items[0].id === 'potato' && /field chest/.test(r.msg), 'put potatoes in the field chest');
  select(c, 'axe'); r = sim.pickUpPlaced(c, 'farm', 30, 20); check(!r.ok && /Empty/.test(r.msg), 'a full chest stays put');
  r = sim.takeItem(c, 'chest:0', 0); check(r.ok && countItem(c, 'potato') === 7, 'take them back');
  select(c, 'axe'); r = sim.pickUpPlaced(c, 'farm', 30, 20); check(r.ok && c.chests.length === 1 && countItem(c, 'field_chest') === 1 && c.chests[0].map === 'hill', 'the axe picks up the empty chest');
  check(!act(sim.storeItem(c, 'chest:9', 0)).ok && !act(sim.takeItem(c, 'chest:x', 0)).ok && sim.boxOf(c, 'chest:__proto__') === null, 'no such chest');

  // fruit trees
  const f = rich(41); setDate(f, 0, 2);
  check(['sapling_apple', 'sapling_peach', 'sapling_cherry', 'sapling_persimmon'].every((id) => shopStock(f, 'store').find((e) => e.key === id)?.price === 2500), 'four saplings at 2500');
  setDate(f, 3, 2); check(!shopStock(f, 'store').some((e) => /^sapling_/.test(e.key)), 'no saplings in winter'); setDate(f, 0, 2);
  buy(f, 'store', 'sapling_cherry'); buy(f, 'store', 'sapling_apple'); select(f, 'sapling_cherry');
  r = sim.plantTree(f, 'hill', 5, 5); check(!r.ok, 'fruit trees only on the farm');
  r = sim.plantTree(f, 'farm', 25, 30); check(r.ok && f.fruitTrees.length === 1 && f.fruitTrees[0].kind === 'cherry' && !countItem(f, 'sapling_cherry') && sim.treeStage(f, f.fruitTrees[0]) === 0, 'plant a cherry sapling');
  select(f, 'sapling_apple'); check(!act(sim.plantTree(f, 'farm', 25, 30)).ok, 'one tree a tile');
  check(sim.plantTree(f, 'farm', 27, 30).ok && f.fruitTrees.length === 2, 'and an apple tree beside it');
  check(!act(sim.pickFruit(f, 0)).ok, 'a sapling has no fruit');
  for (let d = 0; d < 28; d++) sleep(f);
  check(f.cal.season === 0 && f.cal.day === 30 && sim.treeStage(f, f.fruitTrees[0]) === 2, 'grown after 28 days');
  r = sim.pickFruit(f, 0); check(r.ok && countItem(f, 'cherry') === 1, 'a cherry in spring');
  check(!act(sim.pickFruit(f, 0)).ok, 'one a day'); check(!act(sim.pickFruit(f, 1)).ok, 'the apple tree waits for autumn');
  sleep(f); check(!sim.fruitReady(f, f.fruitTrees[0]) && f.cal.season === 1, 'no cherries in summer');
  setDate(f, 2, 3); check(sim.fruitReady(f, f.fruitTrees[1]) && sim.pickFruit(f, 1).ok && countItem(f, 'apple') === 1, 'apples in autumn');
  select(f, 'axe'); check(!act(sim.removeTree(f, 0)).ok && f.fruitTrees.length === 2, 'a grown tree stays');
  addItem(f, 'sapling_peach', 1); select(f, 'sapling_peach'); sim.plantTree(f, 'farm', 29, 30); select(f, 'axe');
  r = sim.removeTree(f, 2); check(r.ok && f.fruitTrees.length === 2 && !countItem(f, 'sapling_peach'), 'the axe removes a sapling (no refund)');

  // the onsen
  const o = newGame({ seed: 51 }); o.player.money = 1000; o.player.stamina = 20; o.cal.minute = 600;
  r = sim.soak(o); check(r.ok && o.player.money === 900 && o.player.stamina === 100 && o.cal.minute === 660 && o.flags.onsenDay === sim.absDay(o) && sim.onsenBuff(o), 'a soak: 100 cr, an hour, full stamina, the buff');
  wipe(o); select(o, 'hoe'); r = useTool(o, 'farm', 4, 4, 0); check(r.ok && r.cost === 1 && o.player.stamina === 99, 'tools cost one less after a soak');
  sleep(o); check(!sim.onsenBuff(o), 'the buff lasts the day'); select(o, 'hoe'); r = useTool(o, 'farm', 6, 4, 0); check(r.ok && r.cost === 2, 'and is gone tomorrow');
  o.cal.minute = 1390; check(!act(sim.soak(o)).ok, 'closed after eleven');
  o.cal.minute = 700; o.player.money = 50; check(!act(sim.soak(o)).ok && o.player.money === 50, 'no money, no soak');
  setDate(o, 1, 2); r = sim.soak(o); check(r.ok && r.free && o.player.money === 50, 'free on Sato\'s birthday');

  // robots
  const R = rich(61); wipe(R);
  check(shopStock(R, 'workshop').find((e) => e.key === 'robot').price === 1000, 'a Field-unit costs 1000');
  for (let i = 0; i < sim.MAX_ROBOTS; i++) check(buy(R, 'workshop', 'robot').ok, `lease robot ${i + 1}`);
  check(sim.MAX_ROBOTS === 7 && R.robots.length === 7 && new Set(R.robots.map((x) => x.name)).size === 7 && R.robots.every((x) => x.charge === 100 && x.job === 'water'), 'seven robots, named, charged');
  check(!shopStock(R, 'workshop').find((e) => e.key === 'robot').can && !act(buy(R, 'workshop', 'robot')).ok, 'no more than seven');
  R.robots.length = 3;                                       // the checks below follow three of them
  for (let i = 0; i < 40; i++) { const t = R.fields.farm.tiles[i]; Object.assign(t, { till: true, crop: { id: 'turnip', age: i < 20 ? 4 : 1, dead: false } }); }
  check(sim.setRobotJob(R, 0, 'harvest').ok && sim.setRobotJob(R, 1, 'water').ok && sim.setRobotJob(R, 2, 'animals').ok && !act(sim.setRobotJob(R, 0, 'dance')).ok, 'set jobs');
  check(sim.renameRobot(R, 0, 'Tanuki <b>').ok && R.robots[0].name === 'Tanuki b' && !act(sim.renameRobot(R, 0, '<<>>')).ok, 'rename (cleaned)');
  R.animals.push({ kind: 'chicken', name: 'Pip', love: 0, fed: false, milked: false, brushed: false, talked: false }, { kind: 'cow', name: 'Hazel', love: 0, fed: false, milked: false, brushed: false, talked: false });
  R.stock.feed = 5; R.stock.fodder = 5; R.weather = 'sun'; R.weatherTomorrow = 'sun';
  let rep = sleep(R);
  check(Array.isArray(rep.robots) && rep.robots.length === 3, 'the morning report lists the robots');
  check(rep.robots[0].done === 12 && R.bin.find((x) => x.id === 'turnip').n === 12 && R.fields.farm.tiles.filter((t) => t.crop && t.crop.id === 'turnip').length === 28, 'harvest: 12 ripe turnips into the bin');
  check(rep.robots[1].done === 24 && R.fields.farm.tiles.filter((t) => t.wet).length === 24, 'water: 24 plants');
  check(rep.robots[2].done >= 2 && R.animals.every((a) => a.fed) && R.stock.feed === 4 && R.stock.fodder === 4, 'animals: fed from the stock');
  check(rep.notes.some((n) => /Tanuki b harvested 12 turnips/.test(n)) && rep.robots.every((x) => x.charge < 100 && x.charge >= 60), `robot notes and battery use (${rep.robots.map((x) => x.used)})`);
  check(rep.robots.every((x) => x.used >= 25 && x.used <= 40) || rep.robots[2].used < 25, 'a full day uses 25 to 40 charge');
  rep = sleep(R); check(R.bin.some((x) => x.id === 'egg'), 'animals: yesterday\'s egg collected into the bin');
  // skill: level 2 after 5 days, reaches 28 tiles
  const lv = R.robots[1]; lv.days = 5; check(sim.robotLevel(lv) === 2 && sim.robotReach(lv) === 28, 'level 2 reaches 4 more tiles');
  lv.days = 99; check(sim.robotLevel(lv) === 5 && sim.robotReach(lv) === 40 && sim.robotCost(lv) <= 40, 'level 5 at most');
  // a flat battery: no work, and a note
  for (const x of R.robots) x.charge = 0;
  rep = sleep(R); check(rep.robots.every((x) => x.done === 0) && rep.notes.filter((n) => /flat battery/.test(n)).length === 3, 'flat batteries: no work, a note each');
  // a little charge: part of the job
  R.robots[1].charge = 10; R.robots[1].days = 0; for (const t of R.fields.farm.tiles) t.wet = false;
  for (let i = 40; i < 80; i++) Object.assign(R.fields.farm.tiles[i], { till: true, crop: { id: 'potato', age: 1, dead: false } });
  rep = sleep(R); check(rep.robots[1].done > 0 && rep.robots[1].done < 24 && rep.robots[1].short && R.robots[1].charge === 0 && rep.notes.some((n) => /battery ran out/.test(n)), `low charge: part of the job (${rep.robots[1].done})`);
  check(typeof sim.robotMood(R, 1) === 'string' && sim.robotMood(R, 1).length > 5 && sim.robotMood(R, 9) === '', 'a mood line');
  // batteries and the solar charger
  check(shopStock(R, 'workshop').find((e) => e.key === 'solar_panel').price === 1500 && shopStock(R, 'workshop').find((e) => e.key === 'battery').price === 200, 'charger 1500, battery 200');
  buy(R, 'workshop', 'solar_panel'); buy(R, 'workshop', 'battery', 3); select(R, 'solar_panel');
  check(!act(sim.placeItem(R, 'hill', 4, 4)).ok, 'chargers only on the farm');
  r = sim.placeItem(R, 'farm', 33, 20); check(r.ok && R.panels.length === 1 && sim.panelAt(R, 'farm', 33, 20) === 0, 'set a charger down');
  r = sim.useCharger(R, 0); check(r.ok && countItem(R, 'battery') === 1 && R.panels[0].slots.join() === 'battery,battery', 'two empty batteries go in');
  check(!act(sim.useCharger(R, 0)).ok, 'the charger is full');
  R.weather = 'rain'; rep = sleep(R); check(R.panels[0].slots.filter((x) => x === 'battery_full').length === 1 && rep.notes.some((n) => /charged 1 battery/.test(n)), 'a rainy day charges one');
  R.weather = 'storm'; sleep(R); check(R.panels[0].slots.filter((x) => x === 'battery_full').length === 1, 'a storm charges none');
  R.weather = 'sun'; sleep(R); check(R.panels[0].slots.every((x) => x === 'battery_full'), 'the sun charges the other');
  r = sim.useCharger(R, 0); check(r.ok && countItem(R, 'battery_full') === 2 && R.panels[0].slots.every((x) => !x), 'take the charged batteries');
  R.robots[0].charge = 30; r = sim.chargeRobot(R, 0); check(r.ok && R.robots[0].charge === 90 && countItem(R, 'battery_full') === 1 && countItem(R, 'battery') === 2, 'a charged battery: +60, the empty one comes back');
  R.robots[0].charge = 100; check(!act(sim.chargeRobot(R, 0)).ok, 'a full robot needs no battery');
  removeItem(R, 'battery_full', 1); check(!act(sim.chargeRobot(R, 1)).ok, 'no charged battery, no charge');
  select(R, 'axe'); check(sim.pickUpPlaced(R, 'farm', 33, 20).ok && !R.panels.length && countItem(R, 'solar_panel') === 1, 'the axe picks up an empty charger');
  // batteries turn up in the ruins
  const ru = newGame({ seed: 71 }); let found = 0;
  for (let i = 0; i < 400; i++) { const L = sim.cityLoot(ru, 'rubble', i % 3); if (L.items.some((x) => x[0] === 'battery')) found++; }
  check(found > 3, `batteries in the ruins (${found})`);

  // save and load the new state; load an OLD save without the new fields
  const back = loadState(saveState(R)); check(back && saveState(back) === saveState(R) && back.robots.length === 3 && back.chests !== undefined && Array.isArray(back.player.basket), 'the new state round-trips');
  const old = JSON.parse(saveState(newGame({ seed: 81 })));
  for (const k of ['chests', 'panels', 'robots', 'fruitTrees', 'cooked', 'foraged']) delete old[k]; delete old.player.basket; old.forage = [{ spot: 7, id: 'herb' }];
  const O = loadState(JSON.stringify(old));
  check(O && Array.isArray(O.chests) && Array.isArray(O.panels) && Array.isArray(O.robots) && Array.isArray(O.fruitTrees) && Array.isArray(O.player.basket) && O.cooked && O.foraged, 'an old save gains the new fields');
  check(sim.pickForage(O, 7).ok && sleep(O).ok && O.forage.length >= 3, 'and plays on');
  const O2 = JSON.parse(JSON.stringify(old)); const s2 = loadState(JSON.stringify(O2)); O2.player.basket = 5;
  check(sim.shopStock(s2, 'store').some((e) => e.key === 'basket') && sim.shopStock(s2, 'workshop').some((e) => e.key === 'robot'), 'old saves can shop for the new things');
  // the forage spots match the hill
  check(sim.FORAGE_SPOT_COUNT === 14, '14 forage spots');
}
// ---------------------------------------------------------------- wild fruit trees (2026-11-18)
{
  const s = newGame({ seed: 12 });
  let r = sim.pickWild(s, 'hill:5', 'plum'); check(r.ok && sim.countItem(s, 'plum') >= 1 && sim.countItem(s, 'plum') <= 3, 'pick 1-3 wild plums in spring');
  r = sim.pickWild(s, 'hill:5', 'plum'); check(!r.ok && r.msg, 'a picked tree needs a few days');
  s.cal.day += 3; check(sim.pickWild(s, 'hill:5', 'plum').ok, 'plums again after three days');
  r = sim.pickWild(s, 'hill:6', 'yuzu'); check(!r.ok && /winter/.test(r.msg), 'yuzu only in winter');
  const v = newGame({ seed: 4 }); r = sim.pickWild(v, 'village:9', 'plum', true); check(r.ok && sim.countItem(v, 'plum') === 1, 'a village tree gives one fruit');
  v.cal.day += 3; check(!sim.pickWild(v, 'village:9', 'plum', true).ok, 'village trees take longer to come back'); v.cal.day += 2; check(sim.pickWild(v, 'village:9', 'plum', true).ok, 'and then fruit again');
  check(!sim.pickWild(v, 'x', 'banana').ok, 'unknown fruit refused');
}

// ---------------------------------------------------------------- star-plums, the Main deck, silo, mill, solar yard, hydroponics
{
  check(sim.STAR_PLUM_SOURCES.length === 10 && ITEMS.star_plum && ITEMS.star_plum.maxUp === 10 && !ITEMS.star_plum.sell, 'ten star-plum sources; it cannot be shipped');
  const s = rich(201); s.player.stamina = 50;
  check(sim.grantPlum(s, 'harvest').ok && countItem(s, 'star_plum') === 1 && !act(sim.grantPlum(s, 'harvest')).ok && !act(sim.grantPlum(s, 'nowhere')).ok, 'each source gives once');
  let r = sim.eat(s, slotOf(s, 'star_plum')); check(r.ok && r.celebrate && s.player.maxStamina === 110 && s.player.stamina === 60 && s.stats.starPlums === 1, 'a star-plum: max stamina 110');
  s.player.maxStamina = 195; addItem(s, 'star_plum', 2); r = sim.eat(s, slotOf(s, 'star_plum')); check(r.ok && s.player.maxStamina === 200, 'capped at 200');
  check(!act(sim.eat(s, slotOf(s, 'star_plum'))).ok && countItem(s, 'star_plum') === 1, 'at the cap it is kept');
  const k = rich(202); k.flags.kitchen = true; while (k.player.inv.length < 25) k.player.inv.push(null); k.player.slots = 25; for (const id of ['fish_s', 'apple', 'carrot', 'egg', 'honeycomb', 'chestnut', 'milk_s', 'egg']) addItem(k, id, 1);
  check(sim.cook(k, 'colony_feast').ok && sim.cook(k, 'founders_cake').ok, 'colony feast and founders\' cake');
  k.player.stamina = 100; r = sim.eat(k, slotOf(k, 'colony_feast')); check(r.ok && r.celebrate && k.player.maxStamina === 105, 'the first colony feast: +5 max even when full');
  addItem(k, 'colony_feast', 1); k.player.stamina = 10; r = sim.eat(k, slotOf(k, 'colony_feast')); check(r.ok && !r.celebrate && k.player.maxStamina === 105, 'the second: just food');
  r = sim.eat(k, slotOf(k, 'founders_cake')); check(r.ok && k.player.maxStamina === 110, 'the first founders\' cake: +5');
  // the city's sealed vault: a star-plum the first two times
  const d = rich(203); let plums = 0;
  for (let k = 0; k < 4; k++) { sim.enterCity(d); for (let q = 0; q < d.player.inv.length; q++) if (d.player.inv[q] && !['hoe', 'can', 'sickle', 'hammer', 'axe', 'star_plum'].includes(d.player.inv[q].id)) d.player.inv[q] = null; const v = d.mine.spots.find((q) => q.kind === 'vault'); if (!v) continue; d.mine.monsters = d.mine.monsters.filter((q) => !q.guard); d.player.stamina = 100; r = sim.searchSpot(d, v.i % d.mine.w, Math.floor(v.i / d.mine.w)); if (r.star) plums++; }
  check(plums === 2 && d.flags.plum_ruins10 && d.flags.plum_ruins20 && countItem(d, 'star_plum') === 2, 'two star-plums from the vault, ever');
  // Moraine: one a year
  const m = rich(204); setDate(m, 0, 6);
  check(shopStock(m, 'barge').find((e) => e.key === 'star_plum').price === 8000 && buy(m, 'barge', 'star_plum').ok && !shopStock(m, 'barge').some((e) => e.key === 'star_plum') && m.flags.plum_moraine, 'Moraine sells one star-plum a year');
  m.cal.year = 2; check(shopStock(m, 'barge').some((e) => e.key === 'star_plum'), 'and another next year');
  // the collector
  const c = newGame({ seed: 205 }); for (const id of Object.keys(ITEMS).filter((x) => ITEMS[x].sell).slice(0, sim.COLLECTOR_KINDS)) c.ledger.shipped[id] = 1;
  for (let i = 0; i < 10; i++) if (!c.player.inv[i]) c.player.inv[i] = { id: 'bread', n: 99 };
  let rep = sleep(c); check(c.flags.plum_collector && c.storage.some((b) => b && b.id === 'star_plum') && rep.notes.some((n) => /star-plum/.test(n)), 'the collector\'s star-plum (into the storage box when the rucksack is full)');
  check(sim.starPlumsFound(c) === 1, 'found: 1 of 10');
  // the Grand Market
  const g = rich(206);
  const gs = shopStock(g, 'grandmarket'); check(gs.find((e) => e.key === 'gm_seed_turnip').price === 150 && gs.find((e) => e.key === 'gm_sapling_apple').price === 2800 && gs.some((e) => e.key === 'gm_battery'), 'the market sells imports at a premium');
  setDate(g, 3, 4); check(shopStock(g, 'grandmarket').some((e) => e.key === 'gm_sapling_cherry'), 'saplings even in winter');
  check(buy(g, 'grandmarket', 'gm_battery').ok && countItem(g, 'battery') === 1, 'buy a battery');
  check(sim.marketPrice('fruit_tart') === 324 && sim.marketPrice('matsutake') === 480 && sim.marketPrice('turnip') === 0 && sim.marketPrice('ring') === 0, 'it buys fine food at +20%');
  addItem(g, 'fruit_tart', 2); const before = g.player.money; r = sim.sellToMarket(g, slotOf(g, 'fruit_tart')); check(r.ok && g.player.money === before + 648 && !countItem(g, 'fruit_tart') && g.ledger.shipped.fruit_tart === 2, 'sell two fruit tarts');
  addItem(g, 'turnip', 1); check(!act(sim.sellToMarket(g, slotOf(g, 'turnip'))).ok, 'not turnips');
  g.cal.minute = 700; r = sim.gallerySit(g); check(r.ok && !r.restored && !r.night, 'the gallery by day: just the view');
  g.cal.minute = 1200; g.player.stamina = 50; r = sim.gallerySit(g); check(r.ok && r.restored === 20 && g.player.stamina === 70, 'after dark: +20');
  r = sim.gallerySit(g); check(r.ok && !r.restored && r.again, 'once a day');
  // the silo and the feed mill
  const f = rich(207); addItem(f, 'carrot', 5); f.stock.fodder = 0;
  r = sim.siloAdd(f, slotOf(f, 'carrot'), 3); check(r.ok && f.stock.fodder === 9 && countItem(f, 'carrot') === 2, 'silo: 1 crop = 3 fodder');
  addItem(f, 'egg', 1); check(!act(sim.siloAdd(f, slotOf(f, 'egg'))).ok, 'no eggs in the silo');
  check(!act(sim.millAdd(f, slotOf(f, 'carrot'))).ok, 'no mill yet');
  check(buy(f, 'workshop', 'feed_mill').ok && f.flags.feed_mill && !shopStock(f, 'workshop').some((e) => e.key === 'feed_mill'), 'Ruess builds the feed mill, once');
  addItem(f, 'corn', 2); addItem(f, 'chestnut', 3); f.stock.feed = 0;
  check(sim.millAdd(f, slotOf(f, 'corn')).ok && sim.millAdd(f, slotOf(f, 'carrot')).ok && sim.millAdd(f, slotOf(f, 'chestnut')).ok && sim.millCount(f) === 7, 'seven crops in the hopper');
  addItem(f, 'potato', 30); r = sim.millAdd(f, slotOf(f, 'potato')); check(r.ok && sim.millCount(f) === 20 && countItem(f, 'potato') === 17, 'twenty a day');
  rep = sleep(f); check(f.stock.feed === 2 * 10 + 18 * 4 && sim.millCount(f) === 0 && rep.notes.some((n) => /feed mill ground/.test(n)), `milled overnight: ${f.stock.feed} feed`);
  // the solar yard
  const y = rich(208); addItem(y, 'battery', 8); const m0 = y.player.money;
  r = sim.yardDeposit(y); check(r.ok && y.solarYard.slots.length === 6 && y.player.money === m0 - 180 && countItem(y, 'battery') === 2, 'six batteries racked for 30 cr each');
  y.weather = 'rain'; sleep(y); check(y.solarYard.slots.filter((b) => b === 'battery_full').length === 3, 'rain: half charged');
  r = sim.yardDeposit(y); check(r.ok && countItem(y, 'battery_full') === 3 && y.solarYard.slots.length === 3, 'collect the charged ones');
  y.weather = 'storm'; sleep(y); check(!y.solarYard.slots.includes('battery_full'), 'a storm: none'); y.weather = 'sun'; sleep(y); check(y.solarYard.slots.every((b) => b === 'battery_full'), 'sun: all');
  // the hydroponics garden
  const h = rich(209); setDate(h, 3, 2);
  check(!act(sim.hydroPlant(h, 0)).ok, 'an unrented tower');
  for (let i = 0; i < 4; i++) check(buy(h, 'store', 'hydro_tower').ok, `rent tower ${i + 1}`);
  check(!act(buy(h, 'store', 'hydro_tower')).ok && h.hydro.length === 4, 'four at most');
  addItem(h, 'seed_strawberry', 1); select(h, 'seed_strawberry'); r = sim.hydroPlant(h, 0); check(r.ok && h.hydro[0].crop.id === 'strawberry', 'strawberries in winter, in a tower');
  check(!act(sim.hydroHarvest(h, 0)).ok, 'not ripe yet');
  for (let i = 0; i < 8; i++) sleep(h);
  r = sim.hydroHarvest(h, 0); check(r.ok && countItem(h, 'strawberry') === 3 && h.hydro[0].crop.age === 6, 'ripe in 8 days without watering, three a pick, and it regrows');
  setDate(h, 3, 30); rep = sleep(h); check(!h.hydro.length && rep.notes.some((n) => /rentals ended/.test(n)), 'rentals end at the season change');
  // Sato's Watch
  const w = newGame({ seed: 211 }); w.cal.minute = 700; check(!act(sim.stargaze(w)).ok, 'the dome opens at seven');
  w.cal.minute = 1200; w.player.stamina = 40; r = sim.stargaze(w); check(r.ok && r.first && r.restored === 20 && !r.general, 'the first night: the plaque, +20');
  r = sim.stargaze(w); check(r.ok && !r.first && r.again && !r.restored, 'once a night');
  w.flags.sweet = 'general'; sleep(w); w.cal.minute = 1200; r = sim.stargaze(w); check(r.ok && r.general && w.flags.watchGeneral, 'the General comes once, when he is her sweetheart');
  sleep(w); w.cal.minute = 1200; check(!sim.stargaze(w).general, 'only once');
  // old saves
  const old = JSON.parse(saveState(newGame({ seed: 210 }))); for (const kk of ['mill', 'hydro', 'solarYard']) delete old[kk];
  const O = loadState(JSON.stringify(old)); check(O && Array.isArray(O.mill) && Array.isArray(O.hydro) && Array.isArray(O.solarYard.slots) && sleep(O).ok, 'an old save gains the mill, the towers and the yard');
}

// ---------------------------------------------------------------- the asteroid belt, the shuttle, the haze (2026-11-18)
{
  // (2026-11-19: the belt is one open map now; its own tests are further down.) Belt rocks by sector, through the sim.
  const b1 = beltTally(1), b5 = beltTally(5), b12 = beltTally(12);
  check(b1.scrap > 0 && !b1.alloy && !b1.crystal && !b1.star_metal, 'sector 1 rocks: scrap, no alloy, crystal or star-metal');
  check(b5.alloy > 0 && !b5.crystal && b5.star_metal > 0 && b12.crystal > 0 && b12.alloy > 0, 'alloy from sector 5, crystal from 10, star-metal from 3');
  check(!Object.keys(b12).some((id) => ITEMS[id].kind === 'relic') && b12.star_metal < b12.nickel_iron / 3, 'no relics in space; star-metal is rare in plain rock');
  const a = newGame({ seed: 301 });
  // the shuttle
  const t = newGame({ seed: 302 }); t.player.money = 500;
  check(sim.shuttleFare(t) === 200 && sim.takeShuttle(t).ok && t.player.money === 300 && t.mine.mode === 'city', 'the shuttle costs 200 cr, to the city');
  t.player.money = 100; check(!act(sim.takeShuttle(t)).ok, 'not without the fare');
  sim.addLove(t, 'maris', 50); check(sim.shuttleFare(t) === 0 && sim.takeShuttle(t).ok && t.player.money === 100, 'free once Maris is at 5 hearts');
  // the gas
  const cell = t.mine.haz.findIndex((x, i) => x > 0 && t.mine.cells[i] !== 6);
  check(cell >= 0, 'the city has gas pockets');
  const hx = cell % t.mine.w, hy = Math.floor(cell / t.mine.w); t.player.stamina = 50; const h0 = t.mine.hull;
  let r = sim.hazardTick(t, hx, hy); check(r.ok && r.drained === 1 && t.mine.hull === h0 - 1 && t.player.stamina === 50 && sim.hazardAt(t, hx, hy) === 1, 'gas wears a point of hull a tick');
  r = sim.hazardTick(t, sim.CITY_PAD[0], sim.CITY_PAD[1]); check(r.ok && !r.drained, 'the landing is clear');
  const u = rich(303); check(shopStock(u, 'workshop').find((e) => e.key === 'up_filters').needs === '3 alloy, 1 star-metal', 'the filters need alloy and star-metal');
  check(buy(u, 'workshop', 'up_filters').ok && u.flags.filters && countItem(u, 'star_metal') === 1, 'Ruess fits the filters');
  sim.enterMine(u, 6); const c2 = u.mine.haz.findIndex((x, i) => x > 0 && u.mine.cells[i] !== 6); const uh = u.mine.hull;
  if (c2 >= 0) { r = sim.hazardTick(u, c2 % u.mine.w, Math.floor(c2 / u.mine.w)); check(r.ok && r.filtered && u.mine.hull === uh, 'with filters the gas costs nothing'); }
  // old saves: a saved site is cleared on load
  const old = JSON.parse(saveState(newGame({ seed: 304 }))); old.mine = { floor: 3, w: 14, h: 12, cells: [] };
  check(loadState(JSON.stringify(old)).mine === null, 'an old site is cleared on load');
}
// ---------------------------------------------------------------- the belt's ores, Ruess's ore jobs, the new villagers (2026-11-19)
{
  const ORES = ['nickel_iron', 'silica', 'copper', 'titanium', 'platinum'];
  for (const id of ORES) check(ITEMS[id] && ITEMS[id].kind === 'ore' && ITEMS[id].sell > 0 && ITEMS[id].detail && ITEMS[id].detail.length > 60, `ore ${id} is an item with a price and a story`);
  check(ITEMS.nickel_iron.sell < ITEMS.copper.sell && ITEMS.copper.sell < ITEMS.titanium.sell && ITEMS.titanium.sell < ITEMS.platinum.sell && ITEMS.platinum.sell < ITEMS.star_metal.sell, 'deeper ores are worth more');
  for (const [id, from] of sim.BELT_ORES) check(ITEMS[id] && Number.isInteger(from) && from >= 1, `BELT_ORES: ${id} from sector ${from}`);
  for (const d of [1, 3, 5, 8, 10, 15, 20, 40]) { const o = sim.beltOdds(d), sum = Object.values(o).reduce((a, b) => a + b, 0); check(sum > 0.6 && sum < 1 && Object.values(o).every((p) => p > 0), `belt odds at sector ${d} sum to ${sum.toFixed(2)}`); }
  check(!sim.beltOdds(1).copper && sim.beltOdds(2).copper && !sim.beltOdds(3).titanium && sim.beltOdds(4).titanium && !sim.beltOdds(7).platinum && sim.beltOdds(8).platinum, 'copper from 2, titanium from 4, platinum from 8');
  check(sim.beltOdds(20).star_metal > sim.beltOdds(3).star_metal && sim.beltOdds(20).scrap < sim.beltOdds(1).scrap, 'further out: more star-metal, less scrap');
  check(JSON.stringify(sim.beltOdds(40)) === JSON.stringify(sim.beltOdds(20)), 'the odds stop changing at sector 20');
  const t1 = beltTally(1, [2], 3, 1500, 410), t9 = beltTally(9, [2], 3, 1500, 410);
  check(t1.nickel_iron > 0 && t1.silica > 0 && !t1.copper && !t1.titanium && !t1.platinum, 'sector 1: nickel-iron, silica, ice and scrap');
  check(t9.copper > 0 && t9.titanium > 0 && t9.platinum > 0 && !t9.crystal && t9.platinum < t9.nickel_iron, 'sector 9: copper, titanium, a little platinum, no crystal yet');
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  { const g = richer(430), h = richer(430); g.flags.drill = true; g.player.toolLevel.hammer = h.player.toolLevel.hammer = 3; sim.enterBelt(g, 1); sim.enterBelt(h, 1); let ng = 0, nh = 0;
    for (const [S2, add] of [[g, (k) => (ng += k)], [h, (k) => (nh += k)]]) { const m = S2.mine; for (let i = 0; i < m.cells.length; i++) { if (m.cells[i] !== 1) continue; S2.player.stamina = 100; let r; do r = sim.hitRock(S2, i % m.w, Math.floor(i / m.w)); while (r.ok && !r.broke); add(sum(Object.fromEntries((r.gained || []).map((x) => [x.id, x.n])))); for (let k = 0; k < S2.player.inv.length; k++) if (S2.player.inv[k] && ITEMS[S2.player.inv[k].id].kind === 'ore') S2.player.inv[k] = null; } }
    check(ng > nh * 1.15, `the rock-splitter head pulls more ore (${ng} against ${nh})`); }
  // Ruess's ore jobs
  const w = richer(420), job = (k) => shopStock(w, 'workshop').find((e) => e.key === k);
  check(job('smelt_alloy').needs === '4 nickel-iron' && job('wind_battery').needs === '2 copper ore' && job('yard_racks') && job('up_drill') && job('up_tank') && !job('mill_rollers'), 'Ruess offers ore jobs (the rollers need a mill)');
  let al = countItem(w, 'alloy'); check(buy(w, 'workshop', 'smelt_alloy').ok && countItem(w, 'alloy') === al + 1 && countItem(w, 'nickel_iron') === 8 && w.player.money === 1e6 - 100, 'four nickel-iron smelt into one alloy for 100 cr');
  check(buy(w, 'workshop', 'smelt_alloy', 5).ok && countItem(w, 'nickel_iron') === 4, 'one smelt at a time');
  check(buy(w, 'workshop', 'wind_battery').ok && countItem(w, 'battery') === 1 && countItem(w, 'copper') === 10, 'two copper wind a battery');
  check(sim.yardSlots(w) === 6 && buy(w, 'workshop', 'yard_racks').ok && sim.yardSlots(w) === 10 && !job('yard_racks'), 'the solar yard grows to ten racks, once');
  w.flags.feed_mill = true; check(sim.millCap(w) === 20 && buy(w, 'workshop', 'mill_rollers').ok && sim.millCap(w) === 40 && !job('mill_rollers'), 'titanium rollers: the mill grinds forty a night');
  addItem(w, 'corn', 30); const ci = w.player.inv.findIndex((x) => x && x.id === 'corn'); check(sim.millAdd(w, ci, 30).ok && sim.millCount(w) === 30, 'thirty crops fit the faster mill');
  check(buy(w, 'workshop', 'up_drill').ok && w.flags.drill && countItem(w, 'platinum') === 11 && !job('up_drill'), 'Ruess fits the drill head once');
  const poor = rich(421); check(shopStock(poor, 'workshop').find((e) => e.key === 'smelt_alloy').can === false && !act(buy(poor, 'workshop', 'smelt_alloy')).ok, 'no smelting without the ore');
  // old saves meet the new villagers and the new ores
  const old = JSON.parse(saveState(newGame({ seed: 422 }))); delete old.npc.calloway; delete old.npc.fenn; delete old.flags.yard_big;
  const back = loadState(JSON.stringify(old));
  check(back && back.npc.calloway && back.npc.fenn && back.npc.fenn.love === 0 && sim.hearts(back, 'calloway') === 0, 'an old save gets the pastor and the constable');
  check(sim.NPC_IDS.includes('calloway') && sim.NPC_IDS.includes('fenn'), 'the pastor and the constable are villagers');
}
// ---------------------------------------------------------------- the open belt, the mining unit, the battery job (2026-11-19)
{
  const { BELT_W, BELT_H, SECTOR_H, BELT_SECTORS, BELT_PAD, beltSector, sectorTop, beltLayout } = sim;
  check(BELT_SECTORS === 20 && BELT_W >= 30 && BELT_H === 6 + 20 * SECTOR_H, `one big map: ${BELT_W} × ${BELT_H}, ${BELT_SECTORS} sectors of ${SECTOR_H} rows`);
  check(beltSector(BELT_H - 1) === 1 && beltSector(BELT_H - 7) === 1 && beltSector(BELT_H - 7 - SECTOR_H) === 2 && beltSector(0) === 20 && beltSector(sectorTop(7)) === 7 && beltSector(sectorTop(7) + SECTOR_H - 1) === 7 && beltSector(sectorTop(7) + SECTOR_H) === 6, 'sector from position: south is 1, north is 20');
  for (let s = 1; s < 20; s++) { const a = sim.beltOdds(s), b = sim.beltOdds(s + 1), rare = (o) => (o.star_metal || 0) + (o.platinum || 0) + (o.crystal || 0) + (o.titanium || 0); check(rare(b) >= rare(a) && (b.scrap || 0) <= (a.scrap || 0), `sector ${s + 1} is at least as rich as sector ${s}`); }
  const L = beltLayout(12345), L2 = beltLayout(12345);
  check(L === L2 && L.cells.length === BELT_W * BELT_H && L.pods.length === 20 && new Set(L.pods.map((p) => p.sector)).size === 20, 'the layout: from the seed, cached, a pickup pod in every sector');
  check(L.pods.every((p) => beltSector(p.y) === p.sector && L.cells[p.y * BELT_W + p.x] === 6), 'each pod sits in its own sector');
  check(Object.keys(sim.BELT_LANDMARKS).every((s) => L.marks.some((m) => m.sector === +s && L.cells[m.y * BELT_W + m.x] === 7)), 'the landmarks: the derelict, the comet, the wreck, the far marker');
  const kinds = (s) => { const o = {}; for (let y = sectorTop(s); y < sectorTop(s) + SECTOR_H; y++) for (let x = 0; x < BELT_W; x++) { const c = L.cells[y * BELT_W + x]; o[c] = (o[c] || 0) + 1; } return o; };
  const sum3 = (a, k) => [a, a + 1, a + 2].reduce((t, s) => t + (kinds(s)[k] || 0), 0);
  check(sum3(18, 5) > sum3(3, 5) * 2 && sum3(18, 8) > sum3(3, 8) * 2 && sum3(18, 2) > sum3(1, 2), `bigger rocks further north (large ${sum3(3, 5)} → ${sum3(18, 5)}, huge ${sum3(3, 8)} → ${sum3(18, 8)})`);
  check(sum3(1, 5) >= 1 && sum3(1, 8) >= 1, 'a few big ones near home already: goals for a better hammer');
  check(Array.from({ length: 20 }, (_, i) => [1, 2, 5, 8].reduce((t, k) => t + (kinds(i + 1)[k] || 0), 0)).every((n) => n > 25) && Array.from({ length: 20 }, (_, i) => kinds(i + 1)[3] || 0).every((n) => n > 0), 'every sector has rock fields and great asteroids');
  for (const seed of [1, 2, 3, 99, 4242]) {           // nothing is walled off from the pad: every rock, pod and landmark can be reached
    const C = beltLayout(seed).cells, seen = new Uint8Array(C.length), q = [BELT_PAD[1] * BELT_W + BELT_PAD[0]]; seen[q[0]] = 1; let bad = 0;
    while (q.length) { const i = q.pop(), x = i % BELT_W, y = (i - x) / BELT_W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * BELT_W + nx; if (nx < 0 || ny < 0 || nx >= BELT_W || ny >= BELT_H || seen[j]) continue; seen[j] = 1; if (C[j] !== 3 && C[j] !== 6 && C[j] !== 7) q.push(j); } }
    C.forEach((c, i) => { if (c !== 3 && !seen[i]) bad++; }); check(!bad, `belt seed ${seed}: everything can be reached from the pad (${bad} cut off)`);
  }
  // a trip: start, fly, sectors, air, the pods, the milestones
  const B = rich(501); B.player.toolLevel.hammer = 1;
  check(JSON.stringify(sim.beltStarts(B)) === '[1]' && sim.enterBelt(B, 10).start === 1, 'a new farmer starts at sector 1 (sector 10 is refused)');
  const m = B.mine; check(m.mode === 'belt' && m.air === 100 && m.sector === 1 && !m.monsters.length && sim.hazardAt(B, m.pos[0], m.pos[1]) === 0, 'in the suit: full air, sector 1, no creatures, no haze');
  let r = sim.beltMove(B, m.pos[0], m.pos[1] - 2); check(r.ok && Math.abs(r.air - (100 - 2 * sim.AIR_PER_TILE)) < 1e-9 && !r.changed, 'air goes with distance');
  r = sim.beltMove(B, m.pos[0], m.pos[1] + 50); check(Math.abs(r.air - (100 - 5 * sim.AIR_PER_TILE)) < 1e-9, 'a jump counts as at most three tiles');
  let y = m.pos[1], first = 0, miles = 0; while (y > sectorTop(6) + 3) { y -= 2; r = sim.beltMove(B, m.pos[0], y); if (r.first) first++; if (r.milestone) miles++; }
  check(m.sector === 6 && B.belt.reached === 6 && B.stats.deepestBelt === 6 && first === 5 && miles === 1, `flying north: sectors 2 to 6 are new, one milestone (${first}, ${miles})`);
  check(JSON.stringify(sim.beltStarts(B)) === '[1,5]', 'reaching sector 5 opens it at the launch cradle');
  check(!act(sim.beltHome(B, 'pad')).ok && !act(sim.beltHome(B, 'pod')).ok, 'no pad or pod here');
  const pod = m.pods.find((p) => p.sector === 6); sim.beltMove(B, pod.x + 0.5, pod.y + 2); sim.beltMove(B, pod.x + 0.5, pod.y + 1.6);
  const t0 = B.cal.minute; r = sim.beltHome(B, 'pod'); check(r.ok && B.mine === null && B.cal.minute === t0 + 15, 'the sector pod flies her home in 15 minutes');
  sim.enterBelt(B, 5); check(B.mine.start === 5 && beltSector(Math.floor(B.mine.pos[1])) === 5 && B.mine.air === 100, 'start at sector 5, beside its pod, full air');
  sim.beltMove(B, B.mine.pos[0], B.mine.pos[1] - 1); B.mine.air = 0.1; r = sim.beltMove(B, B.mine.pos[0], B.mine.pos[1] - 1);
  B.player.stamina = 50; check(r.out && sim.beltHome(B, 'tow').ok && B.player.stamina === 30, 'out of air: Vashti tows her home, and it costs stamina');
  B.flags.tank = true; check(sim.enterBelt(B, 1).air === 150, 'the big air tank: 150');
  // the hammer: tiers set what breaks and how fast
  const H = rich(502); sim.enterBelt(H, 1); const HM = H.mine, cellOf = (k, s) => { for (let yy = sectorTop(s); yy < sectorTop(s) + SECTOR_H; yy++) for (let x = 0; x < BELT_W; x++) if (HM.cells[yy * BELT_W + x] === k) return [x, yy]; };
  const Z = sim.ROCK_SIZES; check(Z[1].tier === 1 && Z[2].tier === 1 && Z[5].tier === 2 && Z[8].tier === 3 && sim.isRock(4) && !sim.isRock(3) && !sim.isRock(0), 'sizes: small and medium for any hammer, large needs Alloy, huge Starsteel; great asteroids are no rock');
  for (const k of [1, 2, 4, 5, 8]) for (let lv = 1; lv < 3; lv++) check(sim.rockHits(k, lv + 1) <= sim.rockHits(k, lv) || !sim.rockHits(k, lv), `a better hammer never takes more hits (${Z[k].name}, level ${lv + 1})`);
  check(sim.rockHits(1, 1) === 1 && sim.rockHits(2, 1) === 3 && sim.rockHits(2, 3) === 1 && sim.rockHits(5, 1) === 0 && sim.rockHits(5, 2) === 3 && sim.rockHits(5, 3) === 2 && sim.rockHits(8, 2) === 0 && sim.rockHits(8, 3) === 3, 'hits by hammer level');
  const [sx, sy] = cellOf(1, 1); H.player.stamina = 50;
  r = sim.hitRock(H, sx, sy); check(r.ok && r.broke && H.player.stamina === 49, 'a small rock: one hit with any hammer');
  const [rx, ry] = cellOf(2, 2), mk = HM.cells[ry * BELT_W + rx];
  r = sim.hitRock(H, rx, ry); check(r.ok && !r.broke && r.left === 2 && H.player.stamina === 48 && /2 more/.test(r.msg), 'a medium boulder with a field hammer: crack, two more');
  sim.hitRock(H, rx, ry); r = sim.hitRock(H, rx, ry); check(r.ok && r.broke && HM.cells[ry * BELT_W + rx] === 0 && H.player.stamina === 46 && H.belt.gone[ry * BELT_W + rx] > sim.absDay(H), 'the third hit breaks it; it will drift back');
  const [lx, ly] = cellOf(5, 15), [vx, vy] = cellOf(8, 18);
  r = act(sim.hitRock(H, lx, ly)); check(!r.ok && r.need === 2 && /large boulder: it needs an Alloy hammer, and yours is Field/.test(r.msg), `a large boulder names the hammer it needs (${r.msg})`);
  H.player.toolLevel.hammer = 2; r = act(sim.hitRock(H, vx, vy)); check(!r.ok && r.need === 3 && /huge boulder: it needs a Starsteel hammer/.test(r.msg), 'a huge boulder needs Starsteel');
  r = sim.hitRock(H, lx, ly); r = sim.hitRock(H, lx, ly); r = sim.hitRock(H, lx, ly); check(r.broke && r.gained.length === 1 && ['titanium', 'star_metal', 'platinum', 'crystal', 'alloy', 'copper'].includes(r.gained[0].id), `an Alloy hammer: a large boulder in three hits, always one good ore (${r.gained.map((g) => g.id)})`);
  H.player.toolLevel.hammer = 3; for (let k = 0; k < 3; k++) r = sim.hitRock(H, vx, vy); check(r.broke && r.gained.length >= 2 && r.gained.length <= 3 && r.gained.every((g) => ['titanium', 'star_metal', 'platinum', 'crystal'].includes(g.id)), `a huge boulder: two or three of the best (${r.gained.map((g) => g.id)})`);
  const [bx, by] = cellOf(3, 3); check(!act(sim.hitRock(H, bx, by)).ok, 'great asteroids do not break');
  const rich20 = beltTally(16, [5], 3, 400, 520), plain20 = beltTally(16, [2], 3, 400, 520), huge20 = beltTally(18, [8], 3, 200, 520), small20 = beltTally(16, [1], 3, 400, 520), val = (o) => Object.entries(o).reduce((a, [id, n]) => a + ITEMS[id].sell * n, 0);
  check(val(rich20) > val(plain20) * 1.8 && val(plain20) > val(small20) * 1.3 && val(huge20) / 200 > val(rich20) / 400 * 1.8, `bigger is richer: small ${val(small20)}, medium ${val(plain20)}, large ${val(rich20)} cr for 400 rocks; huge ${val(huge20)} for 200`);
  const ice = beltTally(8, [4], 3, 400, 521); check(ice.comet_ice > 250 && !ice.star_metal, 'comet ice clusters give ice');
  const far = beltTally(18, [2], 3, 2000, 522), near = beltTally(2, [2], 3, 2000, 522); check(val(far) > val(near) * 1.5, `far rock is worth more than near rock (${val(far)} against ${val(near)} cr)`);
  // respawn: broken rocks are gone for 2–5 days, then back
  const day0 = sim.absDay(H), back = H.belt.gone[ry * BELT_W + rx];
  check(back >= day0 + 2 && back <= day0 + 5, `the rock returns in 2 to 5 days (day ${back - day0})`);
  sleep(H); sim.enterBelt(H, 1); check(H.mine.cells[ry * BELT_W + rx] === 0, 'next morning it is still gone');
  for (let d = 0; d < 5; d++) sleep(H); sim.enterBelt(H, 1); check(H.mine.cells[ry * BELT_W + rx] === mk && !(ry * BELT_W + rx in H.belt.gone), 'a few days later a new rock has drifted in');
  // saves: the belt's record and the drifting rocks survive; an old layered save keeps its depth as milestones
  const back2 = loadState(saveState(B)); check(back2 && back2.belt.reached === 6 && back2.mine === null && back2.flags.tank, 'the belt record survives a save');
  const old = JSON.parse(saveState(newGame({ seed: 503 }))); delete old.belt; delete old.miner; old.stats.deepestBelt = 11;
  const O = loadState(JSON.stringify(old)); check(O && JSON.stringify(sim.beltStarts(O)) === '[1,5,10]' && O.miner === null, 'an old save that reached sector 11 can start at 5 and 10');
  // the mining unit
  const M = rich(504); check(shopStock(M, 'workshop').find((e) => e.key === 'miner').price === sim.MINER_PRICE && buy(M, 'workshop', 'miner').ok && M.miner && M.miner.charge === 100 && !shopStock(M, 'workshop').find((e) => e.key === 'miner'), 'Ruess leases one mining unit');
  check(!act(sim.minerDeploy(M, 5, 5)).ok, 'it only works in the belt');
  sim.enterBelt(M, 1); const MM = M.mine; let spot = null;
  for (let yy = sectorTop(3); yy < sectorTop(1) + SECTOR_H && !spot; yy++) for (let x = 2; x < BELT_W - 2 && !spot; x++) { if (MM.cells[yy * BELT_W + x]) continue; let n = 0; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (Math.hypot(i, j) <= 3.5 && (MM.cells[(yy + j) * BELT_W + x + i] === 1 || MM.cells[(yy + j) * BELT_W + x + i] === 4)) n++; if (n >= 15) spot = [x, yy]; }
  for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) { const q = (spot[1] + j) * BELT_W + spot[0] + i; if (MM.cells[q] === 2) MM.cells[q] = 1; }   // small rocks only, so a run is ten rocks
  r = sim.minerDeploy(M, spot[0], spot[1]); check(r.ok && MM.miner && !r.swapped, 'F sets it down on open ground');
  check(!act(sim.minerDeploy(M, spot[0], spot[1])).ok, 'only one out at a time');
  const st0 = M.player.stamina; let works = 0, full = false; for (let k = 0; k < 12; k++) { const w = sim.minerWork(M); if (w.ok) works++; else if (w.full) { full = true; sim.minerCollect(M); k--; } else break; }
  check(works === 10 && M.miner.charge === 0 && M.player.stamina === st0, `a battery's charge is ten rocks, and it costs Sato no stamina (${works})`);
  r = sim.minerWork(M); check(!r.ok && r.flat, 'flat, and no charged battery in the rucksack: it stops');
  addItem(M, 'battery_full', 1); r = sim.minerWork(M); check(r.ok && r.swapped && countItem(M, 'battery_full') === 0 && countItem(M, 'battery') === 1 && M.miner.charge === 90, 'with a charged battery it swaps one in and carries on; the flat one comes back');
  const held = MM.miner.hold.reduce((a, g) => a + g.n, 0); r = sim.minerCollect(M); check(r.ok && r.gained.reduce((a, g) => a + g.n, 0) === held && !MM.miner.hold.length, 'Sato empties its hopper');
  { const T = rich(505); T.miner = { name: 'Gravel', charge: 100 }; sim.enterBelt(T, 1); const TM = T.mine, L5 = []; for (let i = 0; i < TM.cells.length; i++) if (TM.cells[i] === 5) L5.push(i);
    const c = L5[0], cx = c % BELT_W, cy = Math.floor(c / BELT_W); for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const q = (cy + j) * BELT_W + cx + i; if (TM.cells[q] === 1 || TM.cells[q] === 2 || TM.cells[q] === 4) TM.cells[q] = 0; }
    let free = null; for (let j = -2; j <= 2 && !free; j++) for (let i = -2; i <= 2 && !free; i++) if (!TM.cells[(cy + j) * BELT_W + cx + i]) free = [cx + i, cy + j];
    if (free) { sim.minerDeploy(T, free[0], free[1]); r = sim.minerWork(T); check(!r.ok && r.idle && TM.cells[c] === 5, 'the mining unit will not touch a large boulder'); } }
  r = sim.minerRecall(M); check(r.ok && !MM.miner && /folds up/.test(r.msg), 'F again recalls it');
  M.miner.charge = 0; check(!act(sim.minerDeploy(M, spot[0], spot[1])).ok && /charged battery/.test(sim.minerDeploy(M, spot[0], spot[1]).msg), 'a flat unit cannot be set down without a charged battery');
  addItem(M, 'battery_full', 1); r = sim.minerDeploy(M, spot[0], spot[1]); check(r.ok && r.swapped && M.miner.charge === 100, 'a charged battery from the rucksack: a full run');
  sim.beltHome(M, 'tow'); M.miner.charge = 20; addItem(M, 'battery_full', 1); check(sim.chargeMiner(M).ok && M.miner.charge === 80, 'at home it takes a battery like the Field-units');
  // the battery job
  const K = rich(506); for (let i = 0; i < 7; i++) buy(K, 'workshop', 'robot');
  check(sim.setRobotJob(K, 0, 'batteries').ok && K.robots[0].job === 'batteries' && sim.robotReach(K.robots[0]) === 3 && sim.robotCost(K.robots[0]) === 15, 'the battery job: a keeper reaches 3 units at skill 1, for 15 charge');
  K.robots[0].days = 99; check(sim.robotReach(K.robots[0]) === 7, 'at skill 5 it keeps up to seven'); K.robots[0].days = 0;
  for (let i = 1; i < 7; i++) { K.robots[i].job = 'rest'; K.robots[i].charge = [10, 50, 70, 0, 30, 90][i - 1]; }
  K.robots[0].charge = 40; K.miner = { name: 'Gravel', charge: 20 };
  K.panels.push({ map: 'farm', x: 3, y: 3, slots: ['battery_full', 'battery_full'] });
  K.storage[0] = { id: 'battery_full', n: 2 }; K.storage[1] = { id: 'battery', n: 3 };
  let rep = sleep(K); K.weather = 'storm';
  const keep = rep.robots[0];
  check(K.robots[0].charge < 100 && K.robots[0].charge >= 85 && keep.self, `the keeper swaps its own battery first (${K.robots[0].charge})`);
  check(keep.done === 3 && K.robots[4].charge === 60 && K.robots[1].charge === 70 && K.miner.charge === 80 && K.robots[5].charge === 30, `then the three lowest (${keep.swapped})`);
  check(rep.notes.some((n) => /swapped charged batteries into/.test(n)), 'a note in the morning report');
  const cb = sim.crewBatteries(K);
  check(cb.units === 7 && cb.keepers === 1 && cb.cover === 3 && typeof cb.average === 'number' && cb.miner === 80, 'crewBatteries: the crew at a glance');
  check(K.panels[0].slots.filter((b) => b === 'battery').length + K.panels[0].slots.filter((b) => b === 'battery_full').length === 2, 'flat batteries go back on the charger');
  // the next morning the keeper reaches into the storage box once the chargers are spent (the storm charged nothing)
  for (const x of K.robots.slice(1)) x.charge = 15; K.miner.charge = 100; K.panels[0].slots = ['battery', 'battery']; K.storage[5] = { id: 'battery_full', n: 2 }; rep = sleep(K);
  check(rep.robots[0].done === 2 && K.storage.filter((b) => b && b.id === 'battery_full').length === 0, `the storage box's charged batteries are used too (${rep.robots[0].done})`);
  for (const x of K.robots.slice(1)) x.charge = 15; K.storage = new Array(sim.STORAGE_SIZE).fill(null); K.panels[0].slots = ['battery', 'battery']; K.weather = 'storm';
  rep = sleep(K); check(rep.robots[0].done === 0 && rep.notes.some((n) => /no charged batteries/.test(n)), 'no charged batteries: it says so');
  // jobs through the sim API (the pause screen calls these)
  check(sim.setRobotJob(K, 3, 'harvest').ok && K.robots[3].job === 'harvest' && sim.setRobotJob(K, 3, 'harvest').same && !act(sim.setRobotJob(K, 3, 'dance')).ok && !act(sim.setRobotJob(K, 12, 'water')).ok, 'set a job by index; the same job again is fine; nonsense is refused');
  check(Object.keys(sim.crewBatteries(newGame({ seed: 507 }))).length > 5 && sim.crewBatteries(newGame({ seed: 507 })).units === 0, 'crewBatteries on a new farm');
}
// ---------------------------------------------------------------- 2026-11-19: Market Lane, the fold, the duck house, the hives
{
  const LANE = ['pia', 'lark', 'noor', 'tika', 'vesna'];
  const g = newGame({ seed: 611 });
  check(LANE.every((id) => sim.NPC_IDS.includes(id) && g.npc[id] && g.npc[id].love === 0), 'the five Market Lane villagers have records');
  check(g.fields.east && g.fields.east.w === 12 && g.fields.east.h === 10 && g.fields.east.tiles.some((t) => t.obj) && Array.isArray(g.machines) && g.duckNest.eggs === 0, 'a new game has the East Terrace (rubble), no machines, an empty nest');
  // an old save gets everything new, and the game's dice are untouched by the new field
  const old = JSON.parse(saveState(newGame({ seed: 612 }))); delete old.fields.east; delete old.machines; delete old.duckNest; for (const id of LANE) delete old.npc[id];
  const back = loadState(JSON.stringify(old));
  check(back && back.fields.east && back.fields.east.tiles.length === 120 && Array.isArray(back.machines) && back.duckNest && LANE.every((id) => back.npc[id]), 'an old save loads with the new field, machines, nest and villagers');
  check(JSON.stringify(newGame({ seed: 77 }).forage) === JSON.stringify(newGame({ seed: 77 }).forage) && newGame({ seed: 77 }).rng === newGame({ seed: 77 }).rng, 'same seed, same game');
  check(JSON.stringify(newGame({ seed: 613 }).fields.east) === JSON.stringify(loadState(JSON.stringify((() => { const o = JSON.parse(saveState(newGame({ seed: 613 }))); delete o.fields.east; return o; })())).fields.east), 'the East Terrace rubble is the same whether made new or for an old save');
  // the East Terrace is locked until Ruess clears it
  const e = rich(614); e.player.inv[0] = { id: 'hoe', n: 1 }; e.player.sel = 0;
  const t0 = e.fields.east.tiles.findIndex((t) => !t.obj);
  check(!act(useTool(e, 'east', t0 % 12, Math.floor(t0 / 12), 0)).ok && /Ruess/.test(useTool(e, 'east', t0 % 12, Math.floor(t0 / 12), 0).msg), 'the East Terrace is rubble until Ruess clears it');
  check(buy(e, 'workshop', 'eastfield').ok && e.flags.eastfield && e.stock.lumber === 460, 'Ruess clears the East Terrace (3,000 cr, 40 lumber)');
  check(useTool(e, 'east', t0 % 12, Math.floor(t0 / 12), 0).ok && e.fields.east.tiles[t0].till, 'then the hoe tills it');
  // Noor's seeds are sold at the Seedhouse, not at Seln's; they grow, regrow and die with the season like any crop
  for (let season = 0; season < 4; season++) {
    const s = rich(615); s.cal.season = season; const fl = shopStock(s, 'florist').filter((x) => /^seed_/.test(x.key)), st = shopStock(s, 'store').filter((x) => /^seed_/.test(x.key));
    check(fl.length === 3 && fl.every((x) => CROPS[x.key.slice(5)].shop === 'florist' && CROPS[x.key.slice(5)].seasons.includes(season)) && !st.some((x) => CROPS[x.key.slice(5)] && CROPS[x.key.slice(5)].shop), `three Earth crops at the Seedhouse in ${SEASONS[season]}, none at Seln's`);
    check(Object.values(CROPS).filter((c) => c.seasons.length === 1 && c.seasons[0] === season && (c.shop || c.id !== 'moonflower')).length >= (season === 3 ? 3 : 7), `at least two new crops in ${SEASONS[season]}`);
  }
  check(['snap_pea', 'bell_pepper', 'cranberry', 'frost_leek'].every((id) => CROPS[id].regrow > 0) && ['tulip', 'sunflower', 'cosmos', 'snowbell'].every((id) => CROPS[id].flower), 'four new crops regrow, four are flowers');
  const k = rich(616); k.cal.season = 3; k.flags.eastfield = true; const tile = k.fields.east.tiles[5]; Object.assign(tile, { obj: null, hp: 0, till: true });
  k.player.inv[0] = { id: 'seed_kale', n: 1 }; k.player.sel = 0;
  check(useTool(k, 'east', 5, 0, 0).ok && tile.crop && tile.crop.id === 'kale', 'kale sows outdoors in winter');
  for (let d = 0; d < 6; d++) { tile.wet = true; sleep(k); }
  check(sim.cropStage(tile.crop) === 3 && harvest(k, 'east', 5, 0).ok && countItem(k, 'kale') === 1, 'and is ripe in six days on the East Terrace');
  // animals: the fold and the duck house first, then Corran sells them
  const a = rich(617); a.stock.fodder = 50; a.stock.feed = 50; while (a.player.inv.length < 30) a.player.inv.push(null); a.player.slots = 30;
  check(!shopStock(a, 'ranch').some((x) => ['goat', 'sheep', 'duck'].includes(x.key)), 'no goats, sheep or ducks before there is a home for them');
  check(buy(a, 'workshop', 'fold').ok && buy(a, 'workshop', 'duckhouse').ok && a.flags.fold && a.flags.duckhouse, 'Ruess mends the fold and the duck house');
  check(['goat', 'sheep', 'duck'].every((kd) => shopStock(a, 'ranch').some((x) => x.key === kd && x.can)), 'then Corran sells them');
  check(buy(a, 'ranch', 'goat', 2).ok && buy(a, 'ranch', 'sheep', 2).ok && buy(a, 'ranch', 'duck', 3).ok && buy(a, 'ranch', 'clippers').ok && !act(buy(a, 'ranch', 'goat', 3)).ok, 'two goats, two sheep, three ducks and clippers; the fold holds four goats');
  addItem(a, 'milker', 1); addItem(a, 'brush', 1); sleep(a);
  const idx = (kd) => a.animals.map((x, i) => (x.kind === kd ? i : -1)).filter((i) => i >= 0);
  check(idx('goat').length === 2 && idx('sheep').length === 2 && idx('duck').length === 3 && a.animals.every((x) => x.name), 'delivered and named');
  check(!act(sim.milk(a, idx('goat')[0])).ok, 'a hungry goat gives no milk');
  check(sim.feedAll(a, 'goat').ok && sim.feedAll(a, 'sheep').ok && sim.feedAll(a, 'duck').ok, 'the troughs are filled');
  let r = sim.milk(a, idx('goat')[0]); check(r.ok && r.gained[0].id === 'goat_milk' && countItem(a, 'goat_milk') === 1 && !act(sim.milk(a, idx('goat')[0])).ok, 'a fed goat gives goat milk once a day');
  check(sim.brush(a, idx('sheep')[0]).ok && sim.brush(a, idx('goat')[1]).ok && !act(sim.brush(a, idx('duck')[0])).ok, 'goats and sheep like the brush; ducks do not');
  check(!act(sim.shear(a, idx('sheep')[0])).ok && /growing/.test(sim.shear(a, idx('sheep')[0]).msg), 'a new sheep has no fleece yet');
  for (let d = 0; d < 3; d++) { sim.feedAll(a, 'sheep'); sim.feedAll(a, 'goat'); sim.feedAll(a, 'duck'); sleep(a); }
  check(a.duckNest.eggs >= 9, `fed ducks lay (${a.duckNest.eggs} eggs)`);
  sim.feedAll(a, 'sheep'); r = sim.shear(a, idx('sheep')[0]); check(r.ok && r.gained[0].id === 'wool' && a.animals[idx('sheep')[0]].fleece === 0, 'three fed nights: shear a fleece with the clippers');
  a.animals[idx('sheep')[1]].love = 90; r = sim.shear(a, idx('sheep')[1]); check(r.ok && r.gained[0].id === 'fine_wool', 'a fond sheep gives fine wool');
  a.animals[idx('goat')[1]].love = 90; sim.feedAll(a, 'goat'); r = sim.milk(a, idx('goat')[1]); check(r.ok && r.gained[0].id === 'goat_milk_l', 'a fond goat gives rich milk');
  r = sim.collectDuckEggs(a); check(r.ok && countItem(a, 'duck_egg') >= 9 && a.duckNest.eggs === 0, 'collect the duck eggs');
  check(!act(sim.collectDuckEggs(a)).ok, 'an empty nest box');
  const sw = newGame({ seed: 618 }); sw.weather = 'sun'; sw.flags.duckhouse = true; sw.animals.push({ kind: 'duck', name: 'Q', love: 10, fed: true, milked: false, brushed: false, talked: false }); sleep(sw);
  check(sw.animals[0].love === 13, 'a fed duck that swam on the pond: +2 fed, +1 swim');
  // machines: placed on the farm like chests; cheese and yarn by morning; honey every few days, faster with flowers
  const m = rich(619); m.player.money = 1e6; while (m.player.inv.length < 30) m.player.inv.push(null); m.player.slots = 30;
  check(buy(m, 'garage', 'cheese_press').ok && buy(m, 'garage', 'spinning_wheel').ok && buy(m, 'florist', 'beehive').ok && countItem(m, 'cheese_press') === 1, 'the garage builds the press and the wheel; the Seedhouse sells hives');
  const place = (id, x, y) => { m.player.sel = slotOf(m, id); return sim.placeItem(m, 'farm', x, y); };
  check(place('cheese_press', 56, 9).ok && place('spinning_wheel', 58, 9).ok && place('beehive', 60, 9).ok && m.machines.length === 3 && sim.occupied(m, 'farm', 56, 9), 'set down on the farm');
  check(!act(place.call(null, 'beehive', 60, 9)).ok, 'not on top of each other');
  check(!sim.placeItem((() => { const q = rich(620); addItem(q, 'beehive', 1); q.player.sel = slotOf(q, 'beehive'); return q; })(), 'hill', 5, 5).ok, 'machines stay on the farm');
  const press = sim.machineAt(m, 'farm', 56, 9), wheel = sim.machineAt(m, 'farm', 58, 9), hive = sim.machineAt(m, 'farm', 60, 9);
  check(!act(sim.useMachine(m, press)).ok, 'the press wants milk');
  addItem(m, 'goat_milk', 1); m.player.sel = slotOf(m, 'goat_milk'); check(sim.useMachine(m, press).ok && m.machines[press].item === 'goat_milk' && !countItem(m, 'goat_milk'), 'goat milk goes in the press');
  addItem(m, 'fine_wool', 1); m.player.sel = slotOf(m, 'fine_wool'); check(sim.useMachine(m, wheel).ok, 'fine wool goes on the wheel');
  check(/Take|working/.test(sim.machineLabel(m, press)) && /working/.test(sim.machineLabel(m, press)), 'the prompt says it is working');
  check(!act(sim.pickUpPlaced((m.player.inv[m.player.sel] = { id: 'axe', n: 1 }, m), 'farm', 56, 9)).ok, 'a busy machine cannot be picked up');
  m.cal.season = 0; sleep(m);
  r = sim.useMachine(m, press); check(r.ok && r.gained[0].id === 'goat_cheese' && countItem(m, 'goat_cheese') === 1, 'goat cheese by morning');
  r = sim.useMachine(m, wheel); check(r.ok && r.gained[0].id === 'yarn' && r.gained[0].n === 2, 'two skeins from fine wool');
  check(!act(sim.useMachine(m, hive)).ok && m.machines[hive].days === 1, 'no honey after one night');
  sleep(m); sleep(m); r = sim.useMachine(m, hive); check(r.ok && r.gained[0].id === 'honey', 'honey on the third day');
  m.flags.eastfield = true; const ef = m.fields.east; for (let i = 6; i < 12; i++) Object.assign(ef.tiles[i], { obj: null, till: true, crop: { id: 'tulip', age: 2, dead: false } });
  check(sim.hiveFlowers(m, m.machines[hive]) >= 3, 'tulips on the East Terrace are within the hive\'s reach');
  sleep(m); sleep(m); check(m.machines[hive].out === 'honey', 'with flowers close by: honey every two days');
  m.player.inv[m.player.sel] = { id: 'axe', n: 1 }; sim.useMachine(m, hive);
  check(sim.pickUpPlaced(m, 'farm', 56, 9).ok && countItem(m, 'cheese_press') === 1 && m.machines.length === 2, 'the axe picks up an empty machine');
  const w = rich(621); w.cal.season = 3; w.machines.push({ kind: 'beehive', map: 'farm', x: 57, y: 6, item: null, out: null, n: 0, days: 0 }); for (let d = 0; d < 5; d++) sleep(w);
  check(!w.machines[0].out && w.cal.season === 3, 'the bees sleep in winter');
  // the Lane shops
  const shop = rich(622);
  check(['bread', 'sun_bun', 'seed_loaf', 'honey_cake'].every((id) => shopStock(shop, 'bakery').some((x) => x.key === id)), 'the bakery bakes');
  addItem(shop, 'yarn', 3); check(buy(shop, 'tailor', 'knit_scarf').ok && countItem(shop, 'yarn_scarf') === 1, 'Pia knits a scarf from three skeins');
  addItem(shop, 'wool', 1); const y0 = countItem(shop, 'yarn'); check(buy(shop, 'tailor', 'spin_wool').ok && countItem(shop, 'yarn') === y0 + 1, 'Pia spins a fleece');
  check(buy(shop, 'radio', 'song').ok && !act(buy(shop, 'radio', 'song')).ok, 'one song request at a time');
  const before = sim.NPC_IDS.map((id) => shop.npc[id].love); sleep(shop);
  check(sim.NPC_IDS.every((id, i) => shop.npc[id].love === before[i] + 1) && !shop.flags.songNext, 'the request plays: +1 with everyone');
  shop.cal.day += 3; check(!act(buy(shop, 'radio', 'song')).ok && /week/.test(buy(shop, 'radio', 'song').msg), 'one a week');
  // recipes from the new goods
  const c = rich(623); c.flags.kitchen = true; while (c.player.inv.length < 30) c.player.inv.push(null); c.player.slots = 30;
  for (const id of ['honey', 'duck_egg', 'seed_loaf']) addItem(c, id, 1);
  r = sim.cook(c, 'honey_cake'); check(r.ok && countItem(c, 'honey_cake') === 1, 'honey cake from honey, a duck egg and a seeded loaf');
  for (const id of ['tulip', 'herb']) addItem(c, id, 1); check(sim.cook(c, 'blossom_tea').ok, 'blossom tea from a tulip and a herb');
  for (const id of ['honey', 'bread']) addItem(c, id, 1); check(sim.cook(c, 'honey_toast').ok, 'honey stands in for honeycomb on toast');
  check(sim.LANE_RECIPES.length >= 10 && sim.RECIPE_GROUPS.some(([n, ids]) => /fold/.test(n) && ids.length === sim.LANE_RECIPES.length), `${sim.LANE_RECIPES.length} new recipes in their own kitchen group`);
  check(['yarn_scarf', 'bouquet', 'honey_cake', 'record'].every((id) => ITEMS[id] && ITEMS[id].sell > 0), 'gift-worthy crafted things');
  // the forage: one new find each season
  const f = newGame({ seed: 624 }), seen = new Set(); for (let d = 0; d < 480; d++) { sleep(f); for (const x of f.forage) seen.add(x.id); }
  check(['wild_violet', 'elderflower', 'rosehip', 'snowdrop'].every((id) => seen.has(id)), 'violets, elderflower, rosehips and snowdrops turn up on the hill');
}
{ // the balance pass (2026-11-19): exploits closed, ingredients chosen sensibly
  const b = rich(901);
  const cake = shopStock(b, 'bakery').find((e) => e.key === 'honey_cake');
  check(cake && cake.price > ITEMS.honey_cake.sell && cake.price > sim.marketPrice('honey_cake'), `the bakery's honey cake (${cake && cake.price}) costs more than the bin (${ITEMS.honey_cake.sell}) or the Grand Market pays`);
  for (const sh of Object.keys(sim.SHOPS)) for (const e of shopStock(b, sh)) { const id = e.key.replace(/^gm_/, ''); if (ITEMS[id] && ITEMS[id].sell && !e.needs) check(e.price > Math.max(ITEMS[id].sell, sim.marketPrice(id)), `${sh} sells ${id} (${e.price}) for more than it fetches`); }
  b.player.stamina = 10; check(buy(b, 'clinic', 'checkup').ok && b.player.stamina === b.player.maxStamina, 'a check-up restores you');
  b.player.stamina = 10; check(!act(buy(b, 'clinic', 'checkup')).ok && b.player.stamina === 10, 'but only once a day');
  sleep(b); b.player.stamina = 10; check(buy(b, 'clinic', 'checkup').ok && b.player.stamina === b.player.maxStamina, 'and again tomorrow');
  const k = rich(902); k.flags.kitchen = true;
  for (const id of ['duck_egg', 'milk_s']) addItem(k, id, 1); check(sim.cook(k, 'omelette').ok && !countItem(k, 'duck_egg'), 'a duck egg makes an omelette');
  for (const id of ['honeycomb', 'seed_loaf']) addItem(k, id, 1); check(sim.cook(k, 'honey_toast').ok && !countItem(k, 'seed_loaf'), 'a seeded loaf makes honey toast');
  for (const id of ['berry', 'duck_egg', 'seed_loaf']) addItem(k, id, 1); check(sim.cook(k, 'fruit_tart').ok && !countItem(k, 'duck_egg') && !countItem(k, 'seed_loaf'), 'a fruit tart from a duck egg and a seeded loaf');
  const v = rich(904); v.flags.kitchen = true; for (const id of ['pumpkin', 'melon', 'turnip', 'snap_pea']) addItem(v, id, 1);
  check(sim.cook(v, 'salad').ok && countItem(v, 'pumpkin') === 1 && countItem(v, 'melon') === 1 && !countItem(v, 'turnip') && !countItem(v, 'snap_pea'), 'a salad takes the cheapest vegetables, not the pumpkin');
  const d = rich(903); d.flags.duckhouse = true; d.stock.feed = 20;
  check(buy(d, 'workshop', 'robot').ok && sim.setRobotJob(d, 0, 'animals').ok && buy(d, 'ranch', 'duck', 2).ok, 'a robot on animals, and two ducks');
  sleep(d); sleep(d);
  check(d.duckNest.eggs === 0 && d.bin.some((x) => x.id === 'duck_egg' && x.n === 2), 'the animals robot empties the duck nest into the bin');
}
// ---------------------------------------------------------------- visiting homes (docs/FARM.md §15)
{
  const s = newGame({ seed: 77 }), love = (id, h) => { s.npc[id].love = h * 10; };
  s.cal.minute = 18 * 60;
  love('mori', 3); check(sim.visitRule(s, 'mori', 'home').why === 'shy', 'three hearts is not close enough for the doctor');
  love('mori', 4); check(sim.visitRule(s, 'mori', 'home').ok, 'four hearts and he is in: the door opens');
  love('marrow', 3); check(sim.visitRule(s, 'marrow', 'home').ok && sim.VISIT_FRIENDLY.includes('marrow'), 'the warden keeps an open house at three hearts');
  love('marrow', 2); check(sim.visitRule(s, 'marrow', 'home').why === 'shy', 'but not at two');
  love('mori', 10); check(sim.visitRule(s, 'mori', 'out').why === 'out' && sim.visitRule(s, 'mori', 'away').why === 'out' && sim.visitRule(s, 'mori', 'asleep').why === 'asleep', 'nobody opens when out or asleep, however fond');
  s.cal.minute = 21 * 60 + 30; check(sim.visitRule(s, 'mori', 'home').why === 'late', 'late at night the door stays shut');
  s.flags.sweet = 'mori'; check(sim.visitRule(s, 'mori', 'home').ok, '...except to a sweetheart');
  love('lark', 0); check(sim.visitRule(s, 'mori', 'home').ok && sim.visitRule(s, 'lark', 'home').why === 'late', 'the sweetheart rule is only for the sweetheart');
  s.flags.partner = 'mori'; check(sim.visitRule(s, 'mori', 'home').why === 'moved', 'a partner has moved to the farm');
  s.cal.minute = 16 * 60; love('yui', 5); const before = s.npc.yui.love, a = sim.homeVisit(s, 'yui'), b = sim.homeVisit(s, 'yui');
  check(a.first && !b.first && s.npc.yui.love === before + sim.VISIT_BONUS, 'a visit is worth a little extra, once a day');
  sleep(s); check(sim.homeVisit(s, 'yui').first, 'and again tomorrow');
  const old = JSON.parse(saveState(newGame({ seed: 5 }))); delete old.visits; const O = loadState(JSON.stringify(old));
  check(O && O.visits && typeof O.visits === 'object' && sim.homeVisit(O, 'seln').first, 'an old save loads and can visit');
}
// ---------------------------------------------------------------- gifts later in the day, and the mailbox (2026-11-20)
{
  const D = sim.giftDelta, Q = sim.LATER_GIFT_SHARE, M = sim.MAIL_SHARE;
  check(D('loved', false) === 8 && D('loved', false, Q) === 2 && D('liked', false, Q) === 1 && D('neutral', false, Q) === 0 && D('disliked', false, Q) === -1, 'later gifts: a quarter, gains and losses alike');
  check(D('loved', false, M) === 6 && D('liked', false, M) === 3 && D('neutral', false, M) === 1 && D('disliked', false, M) === -3 && D('loved', true, M) === 19, 'the mailbox: 80%, tiers and birthdays included');
  check(D('loved', false, M * Q) === 2 && D('liked', false, M * Q) === 1 && D('disliked', false, M * Q) === -1, 'a later mailbox gift: 80% of a quarter, never nothing for a loved gift');
  const s = newGame({ seed: 31 }); addItem(s, 'turnip', 10); const slot = s.player.inv.findIndex((x) => x && x.id === 'turnip');
  let r = sim.mailGift(s, 'yui', slot, 'loved', false);
  check(r.ok && r.delta === 6 && s.npc.yui.gifted && s.npc.yui.mail === 'loved' && countItem(s, 'turnip') === 9 && /mailbox/.test(r.msg), 'a loved gift in the mailbox: +6, and she will remember');
  r = sim.gift(s, 'yui', slot, 'loved', false); check(r.ok && r.later && r.delta === 2, 'the mailbox gift was the first of the day');
  r = sim.mailGift(s, 'yui', slot, 'liked', false); check(r.ok && r.later && r.delta === 1, 'another in the mailbox: 80% of a quarter');
  check(!sim.mailGift(s, 'yui', 99, 'loved', false).ok, 'nothing in hand, nothing posted');
  sleep(s); s.npc.yui.love = 50; r = sim.mailGift(s, 'yui', slot, 'disliked', true); check(r.ok && !r.later && r.delta === -10, 'a new day: a disliked birthday gift by post, -10');
  const old = JSON.parse(saveState(newGame({ seed: 8 }))); old.npc.seln.giftsWeek = 2; const O = loadState(JSON.stringify(old)); check(O && O.npc.seln.giftsWeek === undefined, 'an old weekly gift count is dropped');
}
// ---------------------------------------------------------------- Memories (2026-11-21)
{
  const story = await import('../js/farm/story.js');
  const s = newGame({ seed: 12 }); check(s.memories && s.memories.intro && s.memories.intro.d === 1, 'a new game remembers the opening');
  s.cal.day = 5; sim.setFlag(s, 'ev_yui3'); sim.setFlag(s, 'fest_planting_1'); sim.setFlag(s, 'partner', 'yui');
  check(s.memories.ev_yui3 && s.memories.ev_yui3.d === 5 && s.memories.fest_planting && s.memories.wed_yui, 'a scene is remembered with its day when its flag is set');
  check(sim.memoryDate(s.memories.ev_yui3) === 'Spring 5, Year 1' && sim.memoryDate({ unknown: true }) === 'Date not recorded', 'memory dates read well');
  s.cal.day = 9; sim.setFlag(s, 'ev_yui3'); check(s.memories.ev_yui3.d === 5, 'the first time is the one remembered');
  const before = saveState(s); for (const m of story.memoryCatalogue()) m.lines(); sim.syncMemories(s); check(saveState(s) === before, 'replaying the lines changes nothing in the save');
  const old = JSON.parse(saveState(newGame({ seed: 3 }))); delete old.memories; Object.assign(old.flags, { ev_seln3: true, confess_mori: true, partner: 'mori', fest_harvest_1: true, ld_visited: true, day1: true });
  const O = loadState(JSON.stringify(old));
  check(O && ['ev_seln3', 'confess_mori', 'wed_mori', 'fest_harvest', 'lower_arrive', 'day1', 'intro'].every((k) => O.memories[k]) && O.memories.ev_seln3.unknown && !O.memories.ev_yui3, 'an old save finds its memories in its flags, date not recorded');
}
console.log(failures ? `\n${failures} of ${checks} checks FAILED` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
