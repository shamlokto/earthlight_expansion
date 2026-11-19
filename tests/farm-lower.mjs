// Sato's Harvest: the Lower deck, "the Undercroft" (docs/FARM.md §12, release 1): restoration projects and their order,
// the pumps, the mushroom beds, the Undercroft's fishing, the logs, its four people, the rehousing that fills the
// school, the map at every stage, and old saves.   node tests/farm-lower.mjs
import * as sim from '../js/farm/sim.js';
import * as story from '../js/farm/story.js';
import { ITEMS, MUSHROOMS, LOWER_LOGS } from '../js/farm/data.js';
import { allMaps, lowerState, waterPlace, findSpot, CENTRAL_HOUSES, lampLit } from '../js/farm/maps.js';
import { readFileSync } from 'node:fs';

let failures = 0, checks = 0;
const check = (cond, what) => { checks++; if (!cond) { failures++; if (failures <= 60) console.log('FAIL', what); } };
const rich = (seed = 7) => {
  const s = sim.newGame({ seed }); s.player.money = 200000; s.stock.lumber = 999; s.player.slots = 30; while (s.player.inv.length < 30) s.player.inv.push(null);
  for (const [id, n] of [['scrap', 60], ['lamp_kit', 20], ['pump_part', 20], ['copper', 30], ['nickel_iron', 30], ['silica', 20], ['alloy', 20], ['titanium', 10]]) sim.addItem(s, id, n);
  return s;
};
const night = (s) => sim.sleep(s);

// ---------------------------------------------------------------- projects: costs, order, one at a time, done overnight
const P = sim.LOWER_PROJECTS;
check(P.map((p) => p.id).join() === 'lights,pumps,catacombs,enclave,works,arena,rehouse,vents', 'eight projects in order (release 2 adds the Works, the Arena and the Vents)');
for (const p of P) {
  check(Number.isInteger(p.price) && p.price > 0 && p.req.every(([id, n]) => ITEMS[id] && n > 0), `${p.id}: a price and known materials`);
  check(!p.after || P.findIndex((q) => q.id === p.after) < P.indexOf(p), `${p.id}: comes after ${p.after}`);
}
check(P.every((p, i) => !i || p.price > P[i - 1].price), 'each project costs more than the last');
{
  const s = rich();
  check(sim.projectList(s).filter((p) => p.can).map((p) => p.id).join() === 'lights', 'only the work lights can be funded at first');
  check(!sim.fundProject(s, 'pumps').ok, 'the pump halls wait for the lights');
  const m0 = s.player.money, kits = sim.countItem(s, 'lamp_kit'), r = sim.fundProject(s, 'lights');
  check(r.ok && s.player.money === m0 - 1200 && sim.countItem(s, 'lamp_kit') === kits - 2, 'funding the lights takes 1,200 cr and two lamp kits');
  check(!sim.lowerDone(s, 'lights') && s.lower.pending === 'lights', 'it is done by morning, not at once');
  check(!sim.fundProject(s, 'lights').ok && !sim.fundProject(s, 'pumps').ok, 'one project at a time');
  const rep = night(s);
  check(sim.lowerDone(s, 'lights') && s.lower.pending === null && rep.notes.some((n) => /Undercroft/.test(n)), 'the lights are on after a night, with a note');
  for (const id of ['pumps', 'catacombs', 'enclave', 'works', 'arena']) { check(sim.fundProject(s, id).ok, `${id} can be funded in turn`); night(s); check(sim.lowerDone(s, id), `${id} done overnight`); }
  const t = sim.enclaveTrust(s);
  check(!t.ok && !sim.fundProject(s, 'rehouse').ok, 'the rehousing waits for the families\' trust');
  for (const id of ['thorne', 'moth']) s.flags['favours_' + id] = 2; sim.addLove(s, 'thorne', 49);
  check(!sim.enclaveTrust(s).ok, 'hearts below five are not enough');
  sim.addLove(s, 'thorne', 10);
  check(sim.enclaveTrust(s).ok && sim.fundProject(s, 'rehouse').ok, 'four favours and five hearts with Agnes open the rehousing');
  night(s);
  check(s.flags.ld_rehoused && s.lower.movedDay === sim.absDay(s), 'the families move up overnight');
  check(sim.fundProject(s, 'vents').ok, 'the Thermal Vents come last'); night(s);
  check(sim.projectList(s).every((p) => p.done && !p.can), 'every project is done');
  // the school: lessons on weekdays from 8:30 to 15:00
  const at = (wd, minute) => { const t2 = JSON.parse(JSON.stringify(s)); while (sim.weekday(t2) !== wd) sim.sleep(t2); t2.cal.minute = minute; return t2; };
  check(sim.schoolDay(at(2, 600)) && !sim.schoolDay(at(2, 480)) && !sim.schoolDay(at(2, 920)), 'school on a weekday, 8:30 to 15:00');
  check(!sim.schoolDay(at(5, 600)) && !sim.schoolDay(at(6, 600)), 'no school at weekends');
  const before = rich(); before.cal.minute = 600; check(!sim.schoolDay(before), 'no school before the rehousing');
  check(sim.PUPILS.length >= 5 && sim.PUPILS.includes('moth'), 'five or more pupils, Moth among them');
  for (const f of sim.FAMILIES) { check(!!CENTRAL_HOUSES[f.house], `${f.name} move into ${f.house}`); check(story.LOWER.houses[f.house], `${f.house} has a new text`); }
}
// ---------------------------------------------------------------- the pumps
{
  const s = rich();
  check(!sim.repairPump(s, 'pump2').ok, 'the north pump waits for the pump halls');
  for (const id of ['lights', 'pumps']) { sim.fundProject(s, id); night(s); }
  check(!sim.repairPump(s, 'pump3').ok, 'the cistern pump waits for the north pump');
  const n = sim.countItem(s, 'pump_part'), r = sim.repairPump(s, 'pump2');
  check(r.ok && s.flags.ld_pump2 && sim.countItem(s, 'pump_part') === n - 3, 'three pump parts start the north pump, at once');
  const t = rich(); for (const id of ['lights', 'pumps']) { sim.fundProject(t, id); night(t); } sim.removeItem(t, 'pump_part', sim.countItem(t, 'pump_part'));
  check(!sim.repairPump(t, 'pump2').ok && !t.flags.ld_pump2, 'no parts, no pump');
  check(sim.repairPump(s, 'pump3').ok && s.flags.ld_pump3, 'five more start the cistern pump');
}
// ---------------------------------------------------------------- the map at every stage: floods, gates, lamps
{
  const m = allMaps().lower, reach = (sx, sy) => { const seen = new Set([Math.floor(sx) + ',' + Math.floor(sy)]), q = [[Math.floor(sx), Math.floor(sy)]]; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && !m.solid(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } } } return seen; };
  const can = (spot) => { const p = findSpot(spot); return reach(...m.start).has(Math.floor(p.x) + ',' + Math.floor(p.y)); };
  check(m.under && !m.indoor && m.water === 'lower', 'the Undercroft is its own kind of map');
  lowerState(m, {});
  check(can('lower.landing') && can('undercroft.counter') && !can('lower.gallery'), 'at first only the landing can be walked');
  lowerState(m, { ld_lights: true });
  check(can('lower.gallery') && !can('lower.pumps') && !can('lower.catacombs'), 'the lights open the gallery, not the halls');
  lowerState(m, { ld_lights: true, ld_pumps: true });
  check(can('lower.pumps') && can('lower.pumphouse') && !can('lower.sump'), 'the pump halls open; the Sump is still flooded');
  lowerState(m, { ld_lights: true, ld_pumps: true, ld_pump2: true });
  check(can('lower.sump') && m.at(7, 15) === 'o', 'the north pump drains the tunnel to the Sump');
  check(!reach(...m.start).has('19,5'), 'the old pump room is still under water');
  lowerState(m, { ld_lights: true, ld_pumps: true, ld_pump2: true, ld_pump3: true });
  check(reach(...m.start).has('19,5'), 'the cistern pump drains the way to the old pump room');
  check(!can('lower.catacombs'), 'the catacombs stay shut until restored');
  const all = { ld_lights: true, ld_pumps: true, ld_pump2: true, ld_pump3: true, ld_catacombs: true, ld_enclave: true, ld_works: true, ld_arena: true, ld_vents: true, ld_vault: true };
  lowerState(m, { ...all, ld_enclave: false });
  check(can('lower.beds') && !can('lower.enclave'), 'the catacombs open; the enclave is behind its tarpaulins');
  lowerState(m, all);
  check(can('lower.enclave') && can('lower.kettle'), 'the enclave opens last');
  check(waterPlace(m, 5, 30) === 'lower' && waterPlace(m, 6, 6) === 'sump', 'two waters: the basins and the Sump');
  const lamps = m.props.filter((p) => p.kind === 'glow_lamp');
  check(lamps.filter((p) => lampLit(p.zone, {})).every((p) => p.zone === 'landing') && lamps.some((p) => p.zone === 'landing'), 'at first only the landing lamps are lit');
  check(['lights', 'pumps', 'pump2', 'catacombs', 'enclave'].every((z) => lamps.some((p) => p.zone === z)), 'every restored part has its own lamps');
  check(lamps.every((p) => lampLit(p.zone, all)), 'with everything restored every lamp is lit');
  check(m.props.filter((p) => p.act === 'bed').length === sim.MUSHROOM_BEDS, 'eight mushroom beds');
  { const t = m.props.find((p) => p.act === 'restore'), v = findSpot('undercroft.counter');   // E on the terminal must not grab Venn instead
    const vs = v && (v.x != null ? v : { x: v[1], y: v[2] });
    check(t && vs && Math.hypot(t.x + 0.5 - vs.x, t.y + 1.5 - vs.y) > 2 && Math.hypot(t.x + 0.5 - vs.x, t.y + 0.5 - vs.y) > 2.5, 'the restoration terminal stands well clear of Venn');
    check(/act === 'restore'\) return \{ label: 'Use the restoration terminal/.test(readFileSync(new URL('../js/farm/main.js', import.meta.url), 'utf8')), 'facing the terminal uses it, even with Venn nearby'); }
  check(m.props.some((p) => p.kind === 'vault_door' && p.act === 'vault'), 'the sealed round door is in the gallery');
  for (const l of LOWER_LOGS.filter((x) => x.src === 'terminal' || x.src === 'wall')) check(m.props.some((p) => p.act === 'terminal' && p.log === l.id), `the log ${l.id} is on the map`);
  for (const k of ['lower_lift', 'pump_station', 'mushroom_bed', 'catacomb_arch', 'shelter', 'glow_lamp', 'terminal', 'vault_door']) check(m.props.some((p) => p.kind === k), `the map uses the ${k} slot`);
  check(/m\.map === 'lower'\) return art\.has\('music\/undercroft'\) \? 'undercroft'/.test(readFileSync(new URL('../js/farm/sfx.js', import.meta.url), 'utf8')), 'the Undercroft plays music/undercroft, day and night');   // sfx.js needs three.js, so read it
}
// ---------------------------------------------------------------- the mushroom beds
{
  const s = rich(); for (const id of ['lights', 'pumps']) { sim.fundProject(s, id); night(s); }
  sim.addItem(s, 'spore_bag', 30); s.player.sel = s.player.inv.findIndex((x) => x && x.id === 'spore_bag');
  check(!sim.plantBed(s, 0).ok, 'the beds are rotten until the catacombs are restored');
  sim.fundProject(s, 'catacombs'); night(s); s.player.sel = s.player.inv.findIndex((x) => x && x.id === 'spore_bag');
  check(sim.plantBed(s, 0).ok && !sim.plantBed(s, 0).ok && !sim.plantBed(s, 99).ok, 'one planting a bed, and only real beds');
  const b = s.lower.beds[0], c = MUSHROOMS[b.id];
  check(!!c && !sim.harvestBed(s, 0).ok, 'a planted bed is not ripe at once');
  s.cal.season = 3; for (let d = 0; d < c.days; d++) night(s);
  check(sim.bedRipe(s.lower.beds[0]), `mushrooms ripen in ${c.days} nights, even in winter, with no watering`);
  const n = sim.countItem(s, b.id), r = sim.harvestBed(s, 0);
  check(r.ok && sim.countItem(s, b.id) === n + c.yield, 'harvesting gives the flush');
  check(c.regrow ? sim.bedAt(s, 0) >= 0 && !sim.bedRipe(s.lower.beds[0]) : sim.bedAt(s, 0) < 0, 'regrowing beds wait for the next flush; a truffle bed is spent');
  for (const m of Object.values(MUSHROOMS)) {
    check(ITEMS[m.id] && ITEMS[m.id].sell === m.sell && ITEMS[m.id].kind === 'crop', `${m.id}: an item that sells for ${m.sell}`);
    check(m.days >= 3 && m.flushes >= 1 && (m.regrow === 0) === (m.flushes === 1), `${m.id}: sensible days and flushes`);
  }
  check(MUSHROOMS.deep_truffle.sell > 5 * MUSHROOMS.shiitake.sell && MUSHROOMS.deep_truffle.weight < MUSHROOMS.glowcap.weight / 2, 'the truffle is rare and dear');
  const seen = {}; const t = rich(3); for (const id of ['lights', 'pumps', 'catacombs']) { sim.fundProject(t, id); night(t); } sim.addItem(t, 'spore_bag', 99);
  for (let k = 0; k < 400; k++) { t.player.sel = t.player.inv.findIndex((x) => x && x.id === 'spore_bag'); if (t.player.sel < 0) { sim.addItem(t, 'spore_bag', 99); t.player.sel = t.player.inv.findIndex((x) => x && x.id === 'spore_bag'); } t.lower.beds = []; sim.plantBed(t, 1); seen[t.lower.beds[0].id] = (seen[t.lower.beds[0].id] || 0) + 1; }
  check(seen.shiitake > 100 && seen.pale_oyster > 100 && seen.glowcap > 50 && seen.deep_truffle > 5 && seen.deep_truffle < 50, `spawn gives every kind, truffles rarely (${JSON.stringify(seen)})`);
  check(sim.shopStock(t, 'store').some((x) => x.key === 'spore_bag') && !sim.shopStock(rich(), 'store').some((x) => x.key === 'spore_bag'), 'Seln sells spore bags once the catacombs open');
  check(sim.shopStock(t, 'undercroft').some((x) => x.key === 'spore_bag') && ['lamp_kit', 'pump_part'].every((k) => sim.shopStock(rich(), 'undercroft').some((x) => x.key === k)), 'Venn\'s bench makes lamp kits and pump parts, and sells spawn');
  for (const id of ['mushroom_skewer', 'oyster_fry', 'glowcap_broth', 'undercroft_stew', 'truffle_omelette']) check(sim.RECIPES.some((r) => r.id === id) && ITEMS[id].kind === 'food' && ITEMS[id].stamina > 0, `recipe ${id}`);
  check(sim.RECIPE_GROUPS.some(([g, ids]) => /Undercroft/.test(g) && ids.length === 5), 'a kitchen group for the Undercroft');
}
// ---------------------------------------------------------------- fishing below decks
{
  const s = rich(); sim.addItem(s, 'rod', 1); const got = {};
  const cast = (place, minute, level = 1) => { s.cal.minute = minute; s.player.toolLevel.rod = level; s.player.sel = s.player.inv.findIndex((x) => x && x.id === 'rod'); s.player.stamina = 100; const r = sim.fish(s, place); for (const g of r.gained || []) { got[place + minute + level + g.id] = (got[place + minute + level + g.id] || 0) + 1; sim.removeItem(s, g.id, 1); } return r; };
  for (let i = 0; i < 600; i++) { cast('lower', 600); cast('lower', 1150); cast('sump', 1260, 1); cast('sump', 1260, 3); cast('sump', 700, 3); }
  const n = (k) => got[k] || 0;
  check(n('lower6001cave_fish') > n('lower6001glowfish') && n('lower6001glowfish') > n('lower6001pipe_eel'), 'cave fish are common, glowfish less, eels rare by day');
  check(n('lower11501pipe_eel') > 2 * n('lower6001pipe_eel'), 'pipe eels come out after six');
  check(n('lower6001pump_part') > 0, 'the basins cough up a pump part now and then');
  check(!n('lower11501abyss_koi') && !n('sump12601abyss_koi') && !n('sump7003abyss_koi'), 'no koi in the basins, on a Field rod, or by day');
  check(n('sump12603abyss_koi') > 5 && n('sump12603abyss_koi') < 80, 'the abyss koi: the Sump, after eight, a good rod, and rarely');
  check(sim.fish(sim.newGame({ seed: 1 }), 'lower').ok === false, 'still needs a rod');
  for (const id of ['cave_fish', 'glowfish', 'pipe_eel', 'abyss_koi']) { check(ITEMS[id].kind === 'fish' && ITEMS[id].sell > 0, `${id} is a fish`); check(typeof story.FISHING.caught[id] === 'string', `${id} has a catch line`); }
  check(ITEMS.abyss_koi.sell > ITEMS.fish_king.sell, 'the koi is the dearest fish of all');
  check(s.fishLog.cave_fish > 0 && !s.fishLog.pump_part, 'the fish log counts fish, not parts');
}
// ---------------------------------------------------------------- logs
{
  check(LOWER_LOGS.length >= 19 && LOWER_LOGS.length <= 23, `11 logs in release 1, 8 to 12 more in release 2 (${LOWER_LOGS.length})`);
  const authors = new Set(LOWER_LOGS.map((l) => story.LOGS[l.id] && story.LOGS[l.id].author.split(' (')[0].split(',')[0]));
  for (const l of LOWER_LOGS) { const t = story.LOGS[l.id]; check(t && t.title && t.author && t.text && t.text.length <= 420, `log ${l.id} has a title, a voice and a short text`); }
  check(authors.size >= 6 && [...authors].some((a) => /Marrow/.test(a)) && [...authors].some((a) => /Venn/.test(a)) && [...authors].some((a) => /Galt/.test(a)) && [...authors].some((a) => /Pim|Moth/.test(a)), `many voices (${[...authors].join('; ')})`);
  const s = rich(); const r = sim.recoverLog(s, 'quarantine');
  check(r.ok && r.first && sim.countItem(s, 'log_tape') === 1 && sim.logsFound(s).includes('quarantine'), 'a terminal gives a tape and logs it');
  check(sim.recoverLog(s, 'quarantine').again && sim.countItem(s, 'log_tape') === 1, 'each log only once');
  check(!sim.recoverLog(s, 'nope').ok, 'no such log');
  const p1 = sim.diaryPage(s);
  check(p1.ok && sim.logsFound(s).includes('pim_grey') && sim.countItem(s, 'diary_page') === 1, 'Moth gives her first page');
  check(!sim.diaryPage(s).ok, 'one page a day');
  night(s); check(!sim.diaryPage(s).ok, 'the next page waits for more hearts');
  sim.addLove(s, 'moth', 60); for (let d = 0; d < 4; d++) { sim.diaryPage(s); night(s); }
  check(LOWER_LOGS.filter((l) => l.src === 'page').every((l) => sim.logsFound(s).includes(l.id)), 'all four pages in time');
}
// ---------------------------------------------------------------- the four people
{
  const F = { ld_lights: true, ld_pumps: true, ld_pump2: true, ld_catacombs: true, ld_enclave: true };
  for (const id of story.UNDERFOLK) {
    const n = story.NPCS[id]; check(n && n.name && n.look && n.birthday && n.loves.length >= 3, `${id} is a full villager`);
    check(sim.NPC_IDS.includes(id) && story.VILLAGERS.includes(id), `${id} is in the cast`);
    check(story.TALK[id] && story.TALK[id].first && story.TALK[id].b3, `${id} has small talk by hearts`);
    check(story.QUESTS[id] && story.QUESTS[id].length >= 4, `${id} asks favours`);
    check(story.EVENTS.filter((e) => e.npc === id).length >= 2, `${id} has two heart events`);
    check(story.MEETINGS[id] && story.MEETINGS[id].length >= 4, `${id} has a first meeting`);
    check(!(story.ROMANCE.candidates || []).includes(id), `${id} is not a romance candidate`);
  }
  const W = (id, wd, minute, flags, weather = 'sun', festival = null) => { const r = story.whereIs(id, { season: 0, day: 3, weekday: wd, minute, weather, festival, year: 1, flags }); return r && r.spot; };
  check(W('venn', 1, 600, {}) === 'undercroft.counter', 'Venn is at his bench from the start');
  check(W('venn', 1, 600, {}, 'storm') === 'undercroft.counter', 'no storms below decks');
  check(W('venn', 1, 600, {}, 'sun', 'planting') === 'lower.landing', 'his bench is shut on festival days');
  check(!W('wick', 1, 600, {}) && W('wick', 1, 600, F) === 'lower.pumps', 'Wick appears once the pump halls are restored');
  check(!W('moth', 1, 660, { ld_lights: true }) && W('moth', 1, 660, { ...F, ld_enclave: false }) === 'lower.catacombs', 'Moth is first seen in the catacombs');
  check(!W('thorne', 1, 600, { ...F, ld_enclave: false }) && W('thorne', 1, 600, F) === 'lower.enclave', 'Agnes appears with the enclave');
  check(W('thorne', 1, 600, { ...F, ld_rehoused: true }) === 'school.teacher' && W('moth', 1, 600, { ...F, ld_rehoused: true }) === 'school.pupil', 'after the move: Agnes teaches, Moth is at her desk');
  check(W('wick', 1, 600, { ...F, ld_rehoused: true }) === 'lower.pumps' && W('venn', 1, 600, { ...F, ld_rehoused: true }) === 'undercroft.counter', 'Venn and Wick stay below');
  check(W('fenn', 1, 485, F) === 'school.floor' && story.LOWER_SCENES.some((e) => e.id === 'fenn_pupils' && e.map === 'school' && e.flag === 'ld_rehoused'), 'Fenn\'s box finds its first child');
  check(W('calloway', 2, 750, F) === 'school.floor' && story.LOWER_SCENES.some((e) => e.id === 'calloway_pupils' && e.weekday === 2), 'Pastor Ines gives her first assembly on a Wednesday');
  const lines = story.talkLines('thorne', { season: 0, day: 3, weekday: 1, minute: 700, hearts: 3, met: true, year: 1, flags: { ...F, ld_rehoused: true } });
  check(Array.isArray(lines) && lines.length >= 1, 'Agnes talks after the move');
}
// ---------------------------------------------------------------- release 2: the Works
const more = (s) => { for (const [id, n] of [['scrap', 99], ['alloy', 30], ['copper', 40], ['titanium', 20], ['silica', 20], ['nickel_iron', 40]]) sim.addItem(s, id, n); return s; };
const upTo = (s, last) => { for (const id of ['lights', 'pumps', 'catacombs', 'enclave', 'works', 'arena', 'vents']) { if (id === 'vents') { s.flags.ld_rehoused = true; } if (!sim.lowerDone(s, id)) { sim.fundProject(s, id); night(s); } if (id === last) break; } return s; };
{
  const W = sim.WORKS_RECIPES;
  check(new Set(W.map((r) => r[0])).size === W.length && W.length >= 14, `fabrication recipes with unique keys (${W.length})`);
  for (const [key, , label, desc, price, req, m] of W) check(Number.isInteger(price) && price > 0 && label && desc && req.length && req.every(([id, n]) => ITEMS[id] && n > 0) && (m.give ? ITEMS[m.give] && m.n >= 1 : !!m.flag), `${key}: a price, known materials and an outcome`);
  check(['Parts', 'For the robots', 'For your tools', 'For the farmhouse', 'Gifts'].every((g) => W.some((r) => r[1] === g)), 'parts, robot upgrades, tool parts, decor and gifts');
  check(W.every((r) => r[5].some(([id]) => ['scrap', 'copper', 'nickel_iron', 'silica', 'titanium', 'alloy', 'battery_full'].includes(id))), 'everything the Works makes uses scrap or belt ore');
  const s = rich(); check(!sim.shopStock(s, 'works').length || !sim.worksOpen(s), 'the Works is shut until restored');
  upTo(s, 'enclave'); check(!sim.projectList(s).find((p) => p.id === 'works').done && sim.projectList(s).find((p) => p.id === 'works').can, 'the Works can be funded after the enclave');
  upTo(s, 'works'); more(s); check(sim.worksOpen(s), 'the Works opens overnight');
  const st = sim.shopStock(s, 'works');
  check(st.length === W.length - 1 && !st.some((e) => e.key === 'vault_power'), 'everything is on the order book but the door feed (it waits for Venn\'s last log)');
  const k0 = sim.countItem(s, 'lamp_kit'), sc = sim.countItem(s, 'scrap'), m0 = s.player.money, r = sim.buy(s, 'works', 'bulk_lamps');
  check(r.ok && sim.countItem(s, 'lamp_kit') === k0 + 5 && sim.countItem(s, 'scrap') === sc - 16 && s.player.money === m0 - 450, 'five lamp kits for 450 cr, 16 scrap and 4 copper');
  check(450 / 5 < 120, 'cheaper in bulk than at the bench');
  sim.addItem(s, 'nickel_iron', 20); const pp = sim.countItem(s, 'pump_part'); sim.buy(s, 'works', 'bulk_pumps'); check(sim.countItem(s, 'pump_part') === pp + 5, 'five pump parts at a time');
  // robot upgrades: every unit, old and new
  s.robots.push({ name: 'Pip', job: 'water', days: 0, charge: 100, mood: 'happy', done: 0 });
  const reach0 = sim.robotReach(s.robots[0]), cost0 = sim.robotCost(s.robots[0]);
  for (const k of ['works_fast', 'works_cell', 'works_sturdy']) { check(sim.buy(s, 'works', k).ok && s.flags[k], `${k} fitted`); check(!sim.shopStock(s, 'works').some((e) => e.key === k), `${k} only once`); }
  check(sim.robotReach(s.robots[0]) === reach0 + 6 && sim.robotCost(s.robots[0]) === cost0 - 6 && s.robots[0].cell, 'faster, sturdier, with a bigger battery');
  s.robots.push({ name: 'Bolt', job: 'harvest', days: 0, charge: 100, mood: 'happy', done: 0 }); sim.ensure(s);
  check(s.robots[1].fast && s.robots[1].sturdy && s.robots[1].cell, 'a unit leased later gets the upgrades too');
  s.robots[0].charge = 10; sim.addItem(s, 'battery_full', 1); sim.chargeRobot(s, 0); check(s.robots[0].charge === 90, 'a deep-cell pack takes +80 from a charged battery');
  check(sim.toolCost(s, 4) === 4 && sim.toolCost(s, 2) === 2, 'no grips yet');
  check(sim.buy(s, 'works', 'works_grips').ok && sim.toolCost(s, 4) === 3 && sim.toolCost(s, 2) === 2, 'balanced grips: a heavy swing costs one less');
  for (const k of ['decor_lantern', 'decor_clock', 'decor_model', 'decor_shelf']) check(sim.buy(s, 'works', k).ok && s.flags[k] && allMaps().house.props.some((p) => p.kind === k && p.when === k), `${k}: made, and stands in the farmhouse`);
  for (const k of ['tin_lantern', 'gear_brooch', 'pipe_whistle']) { const n = sim.countItem(s, k); check(sim.buy(s, 'works', k).ok && sim.countItem(s, k) === n + 1 && ITEMS[k].sell > 0, `${k}: a gift from the press`); check(['venn', 'thorne', 'moth', 'wick'].some((id) => story.giftTier(id, k) === 'loved' || story.giftTier(id, k) === 'liked'), `${k}: somebody below likes it`); }
  // recycling
  const sc2 = sim.countItem(s, 'scrap'), m1 = s.player.money, rr = sim.recycle(s, 'scrap');
  check(rr.ok && s.player.money === m1 + 220 && sim.countItem(s, 'scrap') === sc2 - 10 && 220 > 10 * ITEMS.scrap.sell, 'ten scrap recycle for 220 cr, better than the bin');
  sim.addItem(s, 'battery', 1); const cu = sim.countItem(s, 'copper'); check(sim.recycle(s, 'battery').ok && sim.countItem(s, 'copper') === cu + 1, 'a flat battery gives its copper back');
  sim.addItem(s, 'log_tape', 1); const tp = sim.countItem(s, 'log_tape'); check(tp >= 2 ? sim.recycle(s, 'tape').ok && sim.countItem(s, 'log_tape') === tp - 1 : true, 'a spare tape is wiped, one is kept');
  const t = rich(); check(!sim.recycle(t, 'scrap').ok && sim.recycleList(t).every((x) => !x.can), 'no recycling before the Works');
  check(!sim.recycle(s, 'nope').ok, 'the bin takes only what it takes');
}
// ---------------------------------------------------------------- release 2: the Thermal Vents and the reactor chain
{
  const s = rich(); upTo(s, 'arena');
  check(!sim.ventSoak(s).ok && !sim.reactorStep(s).ok, 'no bath and no console before the Vents');
  check(!sim.projectList(s).find((p) => p.id === 'vents').done, 'the Vents come after the Works');
  upTo(s, 'vents'); s.cal.minute = 600; s.player.stamina = 5;
  const m0 = s.player.money, r = sim.ventSoak(s);
  check(r.ok && s.player.stamina === s.player.maxStamina && s.player.money === m0 - sim.VENT_PRICE && sim.onsenBuff(s), 'a soak: stamina full, the tools lighter, 60 cr');
  s.cal.minute = 1390; check(!sim.ventSoak(s).ok, 'the steam is let down at night');
  const R = sim.REACTOR_STEPS; check(R.length === 5 && R.some((x) => x.who === 'ruess') && R.some((x) => x.who === 'venn') && R.every((x) => x.req.every(([id, n]) => ITEMS[id] && n > 0)), 'five jobs, with Venn and Ruess, gauges, valves and parts');
  sim.addItem(s, 'comet_ice', 10); sim.addItem(s, 'platinum', 2); sim.addItem(s, 'battery_full', 5);
  s.cal.minute = 600; const st = [];
  for (let d = 0; d < 7 && sim.reactorDone(s) < 5; d++) { const a = sim.reactorStep(s); if (a.ok) { st.push(a.step); check(!sim.reactorStep(s).ok, 'one job a day'); } night(s); s.cal.minute = 600; }
  check(st.join() === R.map((x) => x.id).join() && s.flags.ld_reactor, 'the jobs in order, and the reactor is safe');
  check(['day211', 'galt_door', 'venn_key'].every((id) => sim.logsFound(s).includes(id)), 'the console gives three logs, the last one Venn\'s key');
  check(!sim.reactorStep(s).ok, 'nothing more to do at the console');
  const m1 = s.player.money; check(sim.ventSoak(s).ok && s.player.money === m1, 'the bath is free once the reactor is safe');
  sim.addItem(s, 'spore_bag', 1); s.player.sel = s.player.inv.findIndex((x) => x && x.id === 'spore_bag'); sim.plantBed(s, 3); const b = s.lower.beds.find((x) => x.bed === 3); night(s);
  check(b.age === 2, 'the warm beds grow two days a night');
  const poor = rich(); upTo(poor, 'vents'); poor.cal.minute = 600; sim.removeItem(poor, 'silica', sim.countItem(poor, 'silica'));
  check(!sim.reactorStep(poor).ok && sim.reactorDone(poor) === 0, 'no parts, no job');
}
// ---------------------------------------------------------------- release 2: the logs and the vault
{
  const R2 = LOWER_LOGS.slice(11);
  check(R2.length >= 8 && R2.length <= 12, `8 to 12 new logs (${R2.length})`);
  for (const l of R2) check(story.LOGS[l.id] && story.LOGS[l.id].text.length <= 420, `log ${l.id} has a short text`);
  check(R2.some((l) => l.id === 'venn_key') && /Works/.test(story.LOGS.venn_key.text) && /pump/.test(story.LOGS.venn_key.text), 'the key log says: power from the Works, drain the sill');
  check(/Galt/.test(story.LOGS.galt_cover.text) && /Marshal/.test(story.LOGS.ninefold_report.author) && /Galt attack/.test(story.LOGS.ninefold_report.text), 'the cover story and the Directorate\'s own report');
  const s = more(rich()); upTo(s, 'vents'); s.cal.minute = 600;
  check(!sim.openVault(s).ok && !sim.vaultReady(s).ok, 'the vault stays shut');
  sim.addItem(s, 'comet_ice', 10); sim.addItem(s, 'platinum', 2); sim.addItem(s, 'battery_full', 9);
  for (let d = 0; d < 6; d++) { sim.reactorStep(s); night(s); s.cal.minute = 600; }
  check(sim.vaultReady(s).key && !sim.vaultReady(s).power && !sim.vaultReady(s).drained, 'the key, but no feed and a wet sill');
  check(sim.shopStock(s, 'works').some((e) => e.key === 'vault_power'), 'the Works offers the door feed once the key log is found');
  check(sim.buy(s, 'works', 'vault_power').ok && sim.vaultReady(s).power, 'the feed runs from the Works');
  check(!sim.openVault(s).ok, 'still wet');
  for (const id of ['pump2', 'pump3']) sim.repairPump(s, id); sim.addItem(s, 'pump_part', 10);
  const pp = sim.countItem(s, 'pump_part'), rp = sim.repairPump(s, 'pump4');
  check(rp.ok && sim.countItem(s, 'pump_part') === pp - 6 && sim.vaultReady(s).ok, 'six pump parts in the gallery pump drain the sill');
  const ms = s.player.maxStamina, r = sim.openVault(s);
  check(r.ok && r.first && s.flags.ld_vault && sim.countItem(s, 'ring_shard') === 1 && s.player.maxStamina === ms + 10, 'the vault opens: a slice of ring three, and max stamina +10');
  check(LOWER_LOGS.every((l) => !['vault', 'reactor'].includes(l.src) || sim.logsFound(s).includes(l.id)), 'the console\'s and the vault\'s logs are all found');
  check(sim.openVault(s).again && sim.countItem(s, 'ring_shard') === 1, 'it opens once');
  check(story.VAULT.open.some((l) => l.who === 'marrow') && story.VAULT.open.some((l) => l.who === 'thorne') && story.VAULT.open.length <= 20, 'Marrow and Agnes are there, and it is quiet');
  check(story.LOWER_SCENES.some((e) => e.id === 'marrow_vault' && e.flag === 'ld_vault'), 'Marrow puts the names on the memorial');
  check(story.SIGNS_VAULT['central.board'] && /Galt/.test(story.SIGNS_VAULT['central.board']) && story.RADIO_VAULT.length >= 3, 'the Governor\'s board and Vesna\'s radio change');
  const m = allMaps().lower; lowerState(m, { ...Object.fromEntries(sim.LOWER_PROJECTS.map((p) => ['ld_' + p.id, true])), ld_pump2: true, ld_pump3: true });
  check(m.solid(27, 19), 'the round door blocks the vault until it opens');
  lowerState(m, { ...Object.fromEntries(sim.LOWER_PROJECTS.map((p) => ['ld_' + p.id, true])), ld_vault: true }); check(!m.solid(27, 19) && !m.solid(27, 18) && !m.solid(24, 17), 'then you can walk in');
  for (const k of ['works_hall', 'fabricator', 'vent_bath', 'reactor_console', 'zero_g_arena', 'decimator_ring']) check(m.props.some((p) => p.kind === k), `the map has the ${k}`);
}
// ---------------------------------------------------------------- release 2: the Zero-G Arena and the Hub Cup
{
  const f = story.FESTIVALS.find((x) => x.id === 'hubcup');
  check(f && f.season === sim.HUB_CUP.season && f.day === sim.HUB_CUP.day && f.flag === 'ld_arena' && f.spot === 'lower.arena', 'the Hub Cup is a festival in the arena');
  check(['venn', 'wick', 'moth', 'tika', 'vesna'].every((id) => f.lines.some((l) => l.who === id)), 'the people below and the Lane are there');
  check(sim.hubCupThrow(0.5) === 3 && sim.hubCupThrow(0.44) === 3 && sim.hubCupThrow(0.6) === 2 && sim.hubCupThrow(0.75) === 1 && sim.hubCupThrow(0.1) === 0 && sim.hubCupThrow(NaN) === 0, 'a throw scores by how close to the hoop');
  check(sim.hubCupThrow(0.4) === sim.hubCupThrow(0.6) && sim.hubCupThrow(0.3) === sim.hubCupThrow(0.7), 'early and late count the same');
  check(sim.hubCupPlace(15, [{ score: 9 }, { score: 12 }]) === 1 && sim.hubCupPlace(8, [{ score: 9 }, { score: 12 }]) === 3 && sim.hubCupPlace(9, [{ score: 9 }]) === 1, 'places: a tie goes to Sato');
  check(sim.hubCupSpeed(4) < 1.2 && sim.hubCupSpeed(0) < sim.hubCupSpeed(4), 'a little faster each throw, never frantic');
  const s = rich(); upTo(s, 'arena'); while (!(s.cal.season === 2 && s.cal.day === 19)) night(s);
  const bad = rich(); while (!(bad.cal.season === 2 && bad.cal.day === 19)) night(bad);
  check(!sim.playHubCup(bad, [0.5, 0.5, 0.5, 0.5, 0.5]).ok, 'no Hub Cup without the arena');
  check(!sim.playHubCup(s, [0.5]).ok, 'five throws');
  const m0 = s.player.money, r = sim.playHubCup(s, [0.5, 0.5, 0.52, 0.47, 0.5]);
  check(r.ok && r.score === 15 && r.place === 1 && s.player.money === m0 + 1500 && sim.countItem(s, 'hub_cup') === 1, 'a perfect game wins the cup and 1,500 cr');
  check(r.rivals.length === 3 && r.rivals.every((x) => x.score >= 5 && x.score <= 10), 'three rivals, fair scores');
  check(!sim.playHubCup(s, [0.5, 0.5, 0.5, 0.5, 0.5]).ok, 'once a year');
  const t = JSON.parse(JSON.stringify(s)); delete t.flags.hubcup_y1; const r2 = sim.playHubCup(t, [0, 0, 0, 0, 1]); check(r2.ok && r2.place === 4 && r2.prize === 100, 'a bad game still pays a little');
  const w = story.whereIs('wick', { season: 2, day: 19, weekday: 3, minute: 700, weather: 'sun', festival: 'hubcup', year: 1, flags: { ld_pumps: true, ld_arena: true } });
  check(w && /^lower\.(arena|stands|arenagate)/.test(w.spot), 'Wick comes up from the basins to compete');
}
// ---------------------------------------------------------------- old saves
{
  const old = sim.newGame({ seed: 9 }); delete old.lower; for (const k of Object.keys(old.flags)) if (k.startsWith('ld_')) delete old.flags[k]; for (const id of story.UNDERFOLK) delete old.npc[id];
  const s = sim.loadState(JSON.stringify(old));
  check(!!s && story.UNDERFOLK.every((id) => s.npc[id]), 'an old save loads and meets the newcomers');
  check(sim.projectList(s).length === P.length && sim.logsFound(s).length === 0 && sim.bedAt(s, 0) === -1, 'the Undercroft starts untouched in an old save');
  const r = sim.sleep(s); check(r.ok && !s.flags.ld_lights, 'an old save sleeps through the night');
  check(!s.flags.ld_works && !s.flags.ld_vault && sim.reactorDone(s) === 0 && !sim.vaultReady(s).ok && sim.shopStock(s, 'works').length > 0, 'release 2 starts untouched in an old save');
  const r1 = sim.newGame({ seed: 4 }); r1.lower = { beds: [], logs: { quarantine: 3 }, pending: null }; for (const k of ['ld_lights', 'ld_pumps', 'ld_catacombs', 'ld_enclave', 'ld_rehoused']) r1.flags[k] = true; r1.robots = [{ name: 'Old', job: 'water', days: 9, charge: 50, mood: 'happy', done: 0 }];
  const s1 = sim.loadState(JSON.stringify(r1)); check(s1 && sim.projectList(s1).find((p) => p.id === 'works').can === false && sim.projectList(s1).find((p) => p.id === 'works').open && !s1.robots[0].fast, 'a release-1 save: the Works is next, the old robot unchanged');
}
console.log(failures ? `${failures} of ${checks} checks FAILED` : `farm-lower: all ${checks} checks passed`);
process.exit(failures ? 1 : 0);
