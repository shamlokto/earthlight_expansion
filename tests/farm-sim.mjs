// Sato's Harvest, the rules (docs/FARM.md §2 and §3.1): the new game, determinism, save and load, a
// turnip from weed to pay, weather, seasons, tools, shops, animals, upgrades, the greenhouse, the
// ruins, fishing, forage, gifts, goals, and a 120-day soak of random actions.   node tests/farm-sim.mjs
import * as sim from '../js/farm/sim.js';
import { ITEMS, CROPS, SEASONS, WEEKDAYS, DAYS_PER_SEASON, DAY_START, DAY_END, TOOL_LEVELS, FIELD_SIZES, PASTURE_SIZE, RELICS } from '../js/farm/data.js';
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
const rich = (seed = 5) => { const s = newGame({ seed }); s.player.money = 1e6; s.stock.lumber = 500; while (s.player.inv.length < 15) s.player.inv.push(null); s.player.slots = 15; addItem(s, 'scrap', 20); addItem(s, 'alloy', 20); addItem(s, 'crystal', 5); return s; };
const setDate = (s, season, day) => { s.cal.season = season; s.cal.day = day; };

// ---------------------------------------------------------------- data

{
  check(SEASONS.length === 4 && WEEKDAYS.length === 7 && DAYS_PER_SEASON === 30 && DAY_START === 360 && DAY_END === 1440 && TOOL_LEVELS[2] === 'Alloy', 'calendar constants');
  check(FIELD_SIZES.farm[0] === 16 && FIELD_SIZES.farm[1] === 18 && FIELD_SIZES.greenhouse[0] === 10 && PASTURE_SIZE[1] === 7, 'field sizes');
  check(Object.keys(CROPS).length === 13, '13 crops');
  for (const c of Object.values(CROPS)) check(ITEMS[c.id]?.kind === 'crop' && ITEMS[c.id].sell === c.sell && ITEMS[`seed_${c.id}`]?.crop === c.id, `crop ${c.id} has an item and a seed bag`);
  for (const [id, it] of Object.entries(ITEMS)) check(it.id === id && it.name && it.kind && typeof it.desc === 'string' && it.desc, `item ${id} is complete`);
  for (const id of ['hoe', 'can', 'sickle', 'hammer', 'axe', 'rod', 'milker', 'brush']) check(ITEMS[id]?.kind === 'tool', `tool ${id}`);
  const price = { turnip: 60, pumpkin: 250, moonflower: 500, egg: 50, milk_l: 200, fish_s: 50, fish_king: 1200, fish_winter: 260, herb: 40, frostcap: 60, scrap: 15, crystal: 150, photo: 80, ring: 600, datachip: 500 };
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
  check(Object.keys(s.npc).length === 12 && s.npc.ruess.love === 0 && sim.hearts(s, 'ruess') === 0, 'npc records');
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
  const r = (n) => (k = (k * 1103515245 + 12345) & 0x7fffffff) % n;
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < 30; i++) {
      s.player.sel = r(8);
      act(useTool(s, 'farm', r(16), r(18), r(4)));
      if (i % 7 === 0) act(sim.refillCan(s));
      if (i % 9 === 0) act(harvest(s, 'farm', r(16), r(18)));
    }
    sim.enterMine(s, 1 + d); act(sim.hitRock(s, r(14), r(12))); act(sim.defeatMonster(s, 0));
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
      const base = rich(); setDate(base, season, 2); base.player.stamina = 40;      // tired, so the clinic's check-up is on offer
      const stock = shopStock(base, shop);
      check(stock.length > 0, `${shop} sells something in ${SEASONS[season]}`);
      for (const e of stock) {
        seenKeys.add(e.key);
        check(typeof e.key === 'string' && e.label && e.desc && e.price > 0 && e.can === true && e.why === undefined, `${shop}/${e.key} is a full entry a rich player can buy`);
        const s = rich(); setDate(s, season, 2); s.player.stamina = 40;
        const r = buy(s, shop, e.key);
        check(r.ok && r.msg && s.player.money === 1e6 - e.price, `${shop}/${e.key} bought for its price`);
        const p = rich(); setDate(p, season, 2); p.player.money = e.price - 1; p.player.stamina = 40;
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

// ---------------------------------------------------------------- the ruins

{
  const a = newGame({ seed: 20 }), b = newGame({ seed: 20 }), c = newGame({ seed: 21 });
  const m = sim.enterMine(a, 1);
  check(m === a.mine && JSON.stringify(m) === JSON.stringify(sim.enterMine(b, 1)) && JSON.stringify(m) !== JSON.stringify(sim.enterMine(c, 1)), 'sites come from the seed');
  check(m.w === 14 && m.h === 12 && m.cells.length === 168 && m.depth === 1 && m.floor === 1 && m.cells[11 * 14 + 7] === 0, 'a 14×12 site with the lift clear');
  check(!act(sim.hitRock(newGame({ seed: 1 }), 1, 1)).ok && !act(sim.defeatMonster(newGame({ seed: 1 }), 0)).ok, 'not in the ruins');
  let walls = 0, piles = 0, sites = 0, deepMonsters = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = newGame({ seed }), depth = 1 + (seed % 14), site = sim.enterMine(s, depth);
    sites++;
    walls += site.cells.filter((v) => v === 3).length; piles += site.cells.filter((v) => v === 1).length;
    check(site.cells.every((v) => v === 0 || v === 1 || v === 3) && site.cells[site.hatch] === 1, `site ${seed}: only open, rubble and wall; the way down is under a pile`);
    // every open or rubble cell can be reached from the lift
    const seen = new Set([11 * 14 + 7]), todo = [11 * 14 + 7];
    while (todo.length) { const i = todo.pop(), x = i % 14, y = (i - x) / 14; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * 14 + nx; if (nx >= 0 && ny >= 0 && nx < 14 && ny < 12 && !seen.has(j) && site.cells[j] !== 3) { seen.add(j); todo.push(j); } } }
    check(site.cells.every((v, i) => v === 3 || seen.has(i)), `site ${seed}: nothing walled off`);
    const mc = site.monsters.length;
    check(mc >= 1 && mc <= (depth === 1 ? 3 : 6) && site.monsters.every((q) => site.cells[q.y * 14 + q.x] === 0 && !(q.x === 7 && q.y === 11) && ['crawler', 'drone'].includes(q.kind) && (q.hp === 1 || q.hp === 2)), `site ${seed}: ${mc} monsters on open ground`);
    check(new Set(site.monsters.map((q) => `${q.x},${q.y}`)).size === mc, `site ${seed}: one monster a cell`);
    if (depth > 8) deepMonsters += mc;
    check(s.stats.deepest === depth, 'the depth record');
  }
  check(walls / sites / 168 > 0.08 && walls / sites / 168 < 0.2 && piles / sites > 25, `about 12% walls (${(walls / sites / 168).toFixed(2)}), ${Math.round(piles / sites)} piles a site`);
  check(deepMonsters > 0, 'deeper sites have monsters too');

  // search every pile: exactly one way down
  const s = rich(22); sim.enterMine(s, 1); s.player.sel = 14;   // empty hands: no tool needed
  let found = 0, searched = 0;
  const wallsBefore = s.mine.cells.map((v) => v === 3).join();
  for (let y = 0; y < 12; y++) for (let x = 0; x < 14; x++) {
    const was = s.mine.cells[y * 14 + x]; s.player.stamina = 100;
    const r = act(sim.hitRock(s, x, y));
    check(r.ok === (was === 1) && r.broke === r.ok && Array.isArray(r.gained) && typeof r.hatch === 'boolean', `search (${x},${y})`);
    if (r.ok) { searched++; check(s.player.stamina === 99, 'one stamina a search'); if (r.hatch) { found++; check(s.mine.cells[y * 14 + x] === 2 && r.msg, 'the way down shows'); } else check(s.mine.cells[y * 14 + x] === 0, 'the pile is gone'); }
    else check(s.player.stamina === 100 && r.msg, 'nothing to search costs nothing');
  }
  check(found === 1 && searched > 20 && s.mine.cells.filter((v) => v === 2).length === 1 && !s.mine.cells.includes(1) && s.mine.cells.map((v) => v === 3).join() === wallsBefore, 'every pile searched: one way down, walls untouched');
  check(!act(sim.hitRock(s, s.mine.hatch % 14, Math.floor(s.mine.hatch / 14))).ok && !act(sim.hitRock(s, -1, 0)).ok && !act(sim.hitRock(s, 'a')).ok && !act(sim.hitRock(s, 99, 99)).ok, 'bad searches refused');
  check(sim.enterMine(s, 2).depth === 2 && s.mine.cells.includes(1) && s.stats.deepest === 2, 'down a level: a fresh site');
  check(sim.enterMine(s, 'deep').depth === 1 && sim.enterMine(s, -4).depth === 1 && sim.enterMine(s).depth === 1 && s.stats.deepest === 2, 'odd depths mean the top');
  check(sim.leaveMine(s).ok && s.mine === null, 'leave');
  sim.enterMine(s, 3); sleep(s); check(s.mine === null, 'the site resets overnight');

  // finds by depth
  const tally = (depth, n = 3000) => {
    const g = rich(30 + depth), got = {}; let piles2 = 0;
    while (piles2 < n) {
      sim.enterMine(g, depth);
      g.mine.cells.forEach((v, i) => { if (v !== 1) return; g.player.stamina = 100; piles2++; for (const f of sim.hitRock(g, i % 14, Math.floor(i / 14)).gained) got[f.id] = (got[f.id] || 0) + f.n; });
      for (let i = 0; i < 20; i++) if (g.player.inv[i] && !['hoe', 'can', 'sickle', 'hammer', 'axe'].includes(g.player.inv[i].id)) g.player.inv[i] = null;
    }
    return { got, piles: piles2 };
  };
  const relicIds = RELICS.map((r) => r.id), relics = (t) => relicIds.reduce((n, id) => n + (t.got[id] || 0), 0);
  const t1 = tally(1), t5 = tally(5), t12 = tally(12);
  check(!t1.got.alloy && !t1.got.crystal && t1.got.scrap > 0, 'depth 1: scrap only');
  check(t5.got.alloy > 0 && !t5.got.crystal, 'depth 5: alloy, no crystal');
  check(t12.got.alloy > 0 && t12.got.crystal > 0, 'depth 12: crystal too');
  for (const t of [t1, t5, t12]) { const per = t.piles / relics(t); check(per > 6.5 && per < 12, `about one relic in 8–10 piles (${per.toFixed(1)})`); }
  check(Object.keys(t1.got).filter((id) => relicIds.includes(id)).sort().join() === 'photo,teacup', 'depth 1 relics: the common two');
  check(t5.got.medal > 0 && !t5.got.seedtin && !t5.got.ring && !t5.got.datachip, 'depth 5 relics stop at the medal');
  check(relicIds.every((id) => t12.got[id] > 0) && t12.got.photo > t12.got.ring, 'depth 12: all ten, the rare ones rarer');
  const empty = (t) => 1 - Object.values(t.got).reduce((a, b) => a + b, 0) / t.piles;
  check(empty(t1) > 0.4 && (t1.got.scrap + (1 - empty(t1)) * 0) / t1.piles > 0.3, 'most piles give scrap or nothing');

  // monsters
  const q = rich(40); sim.enterMine(q, 6);
  const n0 = q.mine.monsters.length, st = q.player.stamina, money = q.player.money;
  let r = sim.defeatMonster(q, 0);
  check(r.ok && Array.isArray(r.gained) && q.mine.monsters.length === n0 - 1 && q.player.stamina === st && q.player.money === money, 'a monster beaten costs nothing');
  check(!act(sim.defeatMonster(q, 99)).ok && !act(sim.defeatMonster(q, -1)).ok && !act(sim.defeatMonster(q, 'x')).ok, 'bad monster indexes refused');
  let drops = 0, fights = 0; const kinds = {};
  for (const depth of [1, 6]) for (let i = 0; i < 300; i++) {
    sim.enterMine(q, depth);
    while (q.mine.monsters.length) { fights++; for (const f of sim.defeatMonster(q, 0).gained) { drops++; kinds[`${depth}${f.id}`] = 1; } }
    removeItem(q, 'scrap', countItem(q, 'scrap')); removeItem(q, 'alloy', countItem(q, 'alloy'));
  }
  check(Math.abs(drops / fights - 0.35) < 0.06 && kinds['1scrap'] && !kinds['1alloy'] && kinds['6alloy'] && kinds['6scrap'], `monster drops ${(drops / fights).toFixed(2)}: scrap, alloy from depth 5`);
  q.player.stamina = 20; r = sim.monsterHit(q);
  check(r.ok && r.msg && q.player.stamina === 15, 'a hit costs five stamina');
  q.player.stamina = 3; sim.monsterHit(q); check(q.player.stamina === 1, 'never below one');
  sim.monsterHit(q); check(q.player.stamina === 1, 'still one');

  // a full rucksack leaves the find behind
  const full = newGame({ seed: 41 });
  for (let i = 0; i < 10; i++) if (!full.player.inv[i]) full.player.inv[i] = { id: 'herb', n: 99 };
  let left = 0;
  for (let k = 0; k < 6; k++) { sim.enterMine(full, 1); full.mine.cells.forEach((v, i) => { if (v !== 1) return; full.player.stamina = 100; const rr = sim.hitRock(full, i % 14, Math.floor(i / 14)); check(rr.ok && rr.gained.length === 0, 'full: searched, nothing kept'); if (/stayed behind/.test(rr.msg || '')) left++; }); }
  check(left > 10, 'and the result says what stayed behind');

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
  check(r.ok && r.msg && r.gained.length === 1 && ITEMS[r.gained[0].id].kind === 'fish' && countItem(s, r.gained[0].id) === 1 && s.player.stamina === 99 && s.stats.fishCaught === 1 && s.fishLog[r.gained[0].id] === 1, 'a fish: one stamina, logged');
  for (let i = 0; i < 10; i++) if (!s.player.inv[i]) s.player.inv[i] = { id: 'herb', n: 99 };
  s.player.inv[slotOf(s, r.gained[0].id)] = { id: 'herb', n: 99 };
  r = act(sim.fish(s, 'farm'));
  check(!r.ok && s.player.stamina === 99 && s.stats.fishCaught === 1, 'a full rucksack: it got away, no cost');
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
  check(hill2.share('fish_king') > 0.006 && hill2.share('fish_king') < 0.03 && hill3.got.fish_king > 0 && !farm3.got.fish_king && !cast('village', 3, 'rain').got.fish_king, `Old Hollin: hill lake only, about 1.5% (${hill2.share('fish_king').toFixed(3)})`);
  const rain = cast('hill', 1, 'rain');
  check(rain.value > hill.value && rain.share('fish_s') < hill.share('fish_s'), `rain helps: ${hill.value.toFixed(0)} -> ${rain.value.toFixed(0)}`);
  for (let q = 0; q < 4; q++) { const c2 = cast('village', 2, 'sun', q, 1500), want = ['fish_spring', 'fish_summer', 'fish_autumn', 'fish_winter'][q]; check(c2.got[want] > 0 && Object.keys(c2.got).every((id) => ['fish_s', 'fish_m', 'fish_l', want].includes(id)), `${SEASONS[q]}: ${ITEMS[want].name}`); }
  // the rod upgrade
  const u = rich(70); buy(u, 'store', 'rod');
  check(buy(u, 'workshop', 'up_rod').ok && countItem(u, 'rod') === 0, 'Ruess takes the rod');
  const rep = sleep(u);
  check(u.player.toolLevel.rod === 2 && countItem(u, 'rod') === 1 && rep.notes.includes('Ruess finished your Alloy fishing rod.') && !shopStock(u, 'store').some((e) => e.key === 'rod'), 'an Alloy rod');
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
  check(Object.keys(kinds[0]).sort().join() === 'bamboo_shoot,fiddlehead,herb,wild_mint' && Object.keys(kinds[1]).sort().join() === 'berry,herb,honeycomb,wild_grape' && Object.keys(kinds[2]).sort().join() === 'chestnut,matsutake,mushroom,wild_apple' && Object.keys(kinds[3]).sort().join() === 'frostcap,pine_nut,winter_root', `forage by season: ${kinds.map((k) => Object.keys(k).sort().join('/')).join(' | ')}`);
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
  check(!r.ok && r.delta === 0 && s.npc.ruess.love === 8 && countItem(s, 'turnip') === 19, 'one gift a day');
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
    const r = (n) => (k = (k * 1103515245 + 12345) & 0x7fffffff) % n;
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
      () => { sim.enterMine(s, any(1 + r(15))); return { ok: true }; },
      () => sim.hitRock(s, any(r(14)), any(r(12))), () => sim.hitRock(s, r(14), r(12)),
      () => sim.defeatMonster(s, any(r(4))), () => sim.monsterHit(s), () => sim.leaveMine(s),
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
      () => sim.renameRobot(s, any(r(4)), any('Bean')), () => sim.soak(s), () => sim.shipBasket(s), () => sim.basketTake(s, any(r(3))),
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
  check(shopStock(R, 'workshop').find((e) => e.key === 'robot').price === 300, 'a Field-unit lease costs 300');
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
  for (let i = 0; i < 40; i++) { sim.enterMine(ru, 3); ru.mine.cells.forEach((cc, j) => { if (cc === 1) { const g = sim.hitRock(ru, j % ru.mine.w, Math.floor(j / ru.mine.w)); if (g.gained.some((x) => x.id === 'battery')) found++; } }); for (let q = 0; q < ru.player.inv.length; q++) if (ru.player.inv[q] && !['hoe', 'can', 'sickle', 'hammer', 'axe'].includes(ru.player.inv[q].id)) ru.player.inv[q] = null; ru.player.stamina = 100; }
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
console.log(failures ? `\n${failures} of ${checks} checks FAILED` : `\nall ${checks} checks passed`);
process.exit(failures ? 1 : 0);
