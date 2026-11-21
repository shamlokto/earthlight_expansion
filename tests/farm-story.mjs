// The farming game's words (docs/FARM.md section 3.2): cast, schedules, small talk, gifts, heart events,
// festivals, the opening, the radio, signs, the guide, the Memory Room, fishing and the Old World.
//   node tests/farm-story.mjs
import * as story from '../js/farm/story.js';
const { NPCS, whereIs, talkLines, giftLine, giftTier, EVENTS, FESTIVALS, INTRO, DAY1, RADIO, SIGNS, HELP, MUSEUM, FISHING, RUINS, SHUTTLE, ROMANCE, QUESTS } = story;

let failures = 0, checks = 0;
const check = (cond, what) => { checks++; if (!cond) { failures++; if (failures <= 60) console.log('FAIL', what); } };
const isText = (s, max = 220) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
const words = (s) => s.trim().split(/\s+/).length;
let totalWords = 0;
const count = (s) => { if (typeof s === 'string') totalWords += words(s); };

// ---------------------------------------------------------------- the contract's tables

const CAST = {
  sato: { portrait: 'art/colony/portrait/sato.webp' },
  general: { portrait: 'art/colony/portrait/general.webp' },
  ruess: { portrait: 'art/colony/portrait/ruess.webp', shop: 'workshop' },
  marrow: { portrait: 'art/colony/portrait/marrow.webp' },
  seln: { portrait: 'art/colony/portrait/w_seln.webp', shop: 'store' },
  corran: { portrait: 'art/colony/portrait/w_corran.webp', shop: 'ranch' },
  oduya: { portrait: 'art/colony/portrait/w_oduya.webp', shop: 'cafe' },
  maris: { portrait: 'art/colony/portrait/w_maris.webp' },
  vashti: { portrait: 'art/colony/portrait/w_vashti.webp' },
  moraine: { portrait: 'svg:moraine', shop: 'barge' },
  kestrel: { portrait: 'art/colony/portrait/w_kestrel.webp' },
  mori: { portrait: 'art/farm/people/mori_front.webp', shop: 'clinic' },
  yui: { portrait: 'art/farm/people/yui_front.webp' },
  calloway: { portrait: 'art/farm/people/calloway_front.webp' },
  fenn: { portrait: 'art/farm/people/fenn_front.webp' },
  // 2026-11-19: the Undercroft (the Lower deck)
  venn: { portrait: 'art/farm/people/venn_front.webp', shop: 'undercroft' },
  thorne: { portrait: 'art/farm/people/thorne_front.webp' },
  moth: { portrait: 'art/farm/people/moth_front.webp' },
  wick: { portrait: 'art/farm/people/wick_front.webp' },
  // 2026-11-19: Market Lane (portraits drawn from their looks)
  pia: { portrait: 'look:pia', shop: 'tailor' }, lark: { portrait: 'look:lark', shop: 'bakery' }, noor: { portrait: 'look:noor', shop: 'florist' },
  tika: { portrait: 'look:tika', shop: 'garage' }, vesna: { portrait: 'look:vesna', shop: 'radio' },
  // 2026-11-19: the Undercroft, release 2
  hana: { portrait: 'look:hana' },
};
const LANE = ['pia', 'lark', 'noor', 'tika', 'vesna'];
const NEWCOMERS = [...LANE, 'kestrel', 'mori', 'yui', 'calloway', 'fenn', 'venn', 'thorne', 'moth', 'wick', 'hana'];
const UNDER = story.UNDERFOLK || [];
// The Undercroft's progress flags in order: year 2 schedules are checked with the deck half restored (spring, summer), then all of it.
const LD = ['ld_lights', 'ld_pumps', 'ld_pump2', 'ld_pump3', 'ld_catacombs', 'ld_enclave', 'ld_rehoused', 'ld_works', 'ld_arena', 'ld_vents', 'ld_reactor', 'ld_vault'];
const ldUpTo = (flag) => Object.fromEntries(LD.slice(0, LD.indexOf(flag) + 1).map((k) => [k, true]));
const LOVERS = ['general', 'ruess', 'kestrel', 'mori', 'oduya', 'yui', 'lark', 'vesna'];
const VILLAGERS = Object.keys(CAST).filter((id) => id !== 'sato');
const MAIN = VILLAGERS.filter((id) => id !== 'moraine');
const needTalk = (id) => (id === 'moraine' ? 12 : NEWCOMERS.includes(id) ? 22 : 25);
const SPOTS = new Set(('farm.porch farm.bin farm.gate farm.pond farm.field village.square village.memorial village.bridge village.riverside ' +
  'village.bench village.storefront village.cafefront village.hallfront village.workshopfront village.ranchyard village.river ' +
  'hill.wreck hill.lake hill.overlook hill.onsen central.office central.arrivals central.exchange central.plaza central.dock hangar.floor store.counter store.floor ranch.counter workshop.counter workshop.bench ' +
  'cafe.counter cafe.table1 cafe.table2 cafe.table3 hall.desk hall.floor ' +
  'clinic.counter clinic.floor library.counter library.floor village.clinicfront village.libraryfront ' +
  'church.altar church.pew central.churchgarden central.schoolyard school.floor depot.desk depot.floor central.depotfront ' +
  'central.gallery undercroft.counter lower.landing lower.gallery lower.pumps lower.pumphouse lower.sump lower.catacombs lower.beds lower.enclave lower.kettle school.teacher school.pupil central.homes lower.works lower.vents lower.reactor lower.vault lower.arena lower.stands lower.stands2 lower.arenagate lower.press').split(' '));
const STYLES = new Set(['bob', 'short', 'long', 'bald', 'bun', 'bandana', 'cap', 'braid', 'ponytail', 'odango', 'twintails']);
const MAPS = new Set(['farm', 'village', 'hill', 'store', 'ranch', 'workshop', 'cafe', 'hall', 'clinic', 'library', 'central', 'hangar', 'church', 'depot', 'school', 'lower']);
const TIERS = new Set(['loved', 'liked', 'neutral', 'disliked']);
const WEATHERS = ['sun', 'rain', 'storm', 'snow'];
const RELICS = ['photo', 'teacup', 'book', 'watch', 'toy', 'medal', 'seedtin', 'musicbox', 'datachip', 'ring'];
const FISH = ['fish_s', 'fish_m', 'fish_l', 'fish_spring', 'fish_summer', 'fish_autumn', 'fish_winter', 'fish_king', 'cave_fish', 'glowfish', 'pipe_eel', 'abyss_koi',
  'fish_reedling', 'fish_dawnscale', 'fish_rainbarb', 'fish_lantern_cat', 'fish_spokerun', 'fish_paneray', 'fish_stormgar', 'fish_cloudfin', 'fish_cistern_sturgeon',
  'fish_earthlight_trout', 'fish_sailfin', 'fish_halo_eel', 'fish_deep_angler', 'fish_ferryman', 'fish_mochi', 'fish_admiral'];   // 2026-11-21: the new fish
const CROPS = ['turnip', 'potato', 'cucumber', 'strawberry', 'tomato', 'corn', 'onion', 'pumpkin', 'carrot', 'eggplant', 'sweetpotato', 'spinach', 'moonflower'];
const GIFTABLE = [...CROPS, 'egg', 'milk_s', 'milk_m', 'milk_l', ...FISH, 'herb', 'berry', 'mushroom', 'frostcap', 'comet_ice', 'nickel_iron', 'silica', 'copper', 'titanium', 'platinum',
  'scrap', 'alloy', 'crystal', ...RELICS, 'old_coin', 'teddy_bear', 'film_camera', 'credit_chip', 'data_core', 'bread', 'soup', 'pie', 'tea', 'tonic',
  'tin_lantern', 'gear_brooch', 'pipe_whistle', 'cave_fish', 'glowfish', 'pipe_eel', 'abyss_koi', 'shiitake', 'pale_oyster', 'glowcap', 'deep_truffle', 'pump_part', 'lamp_kit', 'diary_page', 'undercroft_stew', 'fish_grill', 'honey_toast', 'wild_apple', 'cherry', 'peach', 'pine_nut', 'mushroom_skewer'];
// 2026-11-19: Market Lane's spots, rooms and goods
for (const x of ('village.lane village.bakeryfront village.tailorfront village.floristfront village.garagefront village.radiofront village.millbridge village.trialbeds ' +
  'bakery.counter bakery.table bakery.floor tailor.counter florist.counter garage.counter garage.bench radio.counter cafe.stage hill.terraces farm.east').split(' ')) SPOTS.add(x);
for (const x of ['bakery', 'tailor', 'florist', 'garage', 'radio']) MAPS.add(x);
// 2026-11-19: homes (docs/FARM.md §15): everybody's spot at home
for (const x of story.SPOTS.filter((q) => q.startsWith('home_'))) SPOTS.add(x);
const HOME = (id, flags = {}) => story.homeSpot(id, { flags });
GIFTABLE.push('cabbage', 'snap_pea', 'tulip', 'bell_pepper', 'melon', 'sunflower', 'beet', 'cranberry', 'cosmos', 'kale', 'frost_leek', 'snowbell', 'wool', 'fine_wool', 'yarn', 'duck_egg', 'duck_feather',
  'goat_milk', 'goat_milk_l', 'cheese', 'goat_cheese', 'honey', 'honey_cake', 'yarn_scarf', 'bouquet', 'record', 'sun_bun', 'seed_loaf', 'wild_violet', 'elderflower', 'rosehip', 'snowdrop', 'yuzu', 'ring', 'datachip', 'watch', 'toy', 'seedtin');
const NEUTRAL = ['pendant', 'weed', 'weeds', 'lumber', 'fodder', 'feed', 'seed_turnip', 'seed_grass', 'seed_moonflower', 'hoe', 'no_such_thing', '', 'toString', '__proto__', 'constructor'];
const FEST = {
  planting: { name: 'Planting Day', season: 0, day: 18, from: 600, to: 900, spot: 'village.square' },
  lantern: { name: 'Lantern Night', season: 1, day: 24, from: 1080, to: 1320, spot: 'village.bridge' },
  harvest: { name: 'Harvest Fair', season: 2, day: 9, from: 600, to: 960, spot: 'village.square' },
  yearsend: { name: "Year's End", season: 3, day: 30, from: 1080, to: 1380, spot: 'village.square' },
  bloom: { name: 'The Bloom Fair', season: 1, day: 10, from: 600, to: 960, spot: 'village.lane' },
  hubcup: { name: 'The Hub Cup', season: 2, day: 19, from: 600, to: 960, spot: 'lower.arena', flag: 'ld_arena' },
};
const HEX = /^#[0-9a-fA-F]{6}$/;

// A day of the given season and year that falls on the given weekday and is not a festival.
function dayFor(season, weekday, year = 1) {
  for (let d = 1; d <= 30; d++) {
    if (((year - 1) * 120 + season * 30 + d - 1) % 7 !== weekday) continue;
    if (FESTIVALS.some((f) => f.season === season && f.day === d)) continue;
    return d;
  }
  return 1;
}
const weekdayOf = (season, day, year = 1) => ((year - 1) * 120 + season * 30 + day - 1) % 7;

// ---------------------------------------------------------------- exports

for (const name of ['NPCS', 'whereIs', 'talkLines', 'giftLine', 'giftTier', 'EVENTS', 'FESTIVALS', 'INTRO', 'DAY1', 'RADIO', 'SIGNS', 'HELP', 'MUSEUM', 'FISHING', 'RUINS', 'ROMANCE', 'QUESTS']) {
  check(story[name] !== undefined, `export ${name} exists`);
}
for (const f of ['whereIs', 'talkLines', 'giftLine', 'giftTier']) check(typeof story[f] === 'function', `${f} is a function`);

// ---------------------------------------------------------------- the cast

for (const id of Object.keys(CAST)) {
  const n = NPCS[id];
  check(!!n, `NPC ${id} exists`);
  if (!n) continue;
  check(n.id === id, `${id}: id field`);
  for (const k of ['name', 'short', 'title']) check(isText(n[k], 80), `${id}: ${k}`);
  check(n.portrait === CAST[id].portrait, `${id}: portrait ${n.portrait}`);
  check(n.shop === CAST[id].shop, `${id}: shop ${n.shop}`);
  check(n.look && ['skin', 'hair', 'top', 'bottom'].every((k) => HEX.test(n.look[k])), `${id}: look colours are hex`);
  check(n.look && STYLES.has(n.look.style), `${id}: look.style`);
  check(n.birthday && Number.isInteger(n.birthday.season) && n.birthday.season >= 0 && n.birthday.season <= 3
    && Number.isInteger(n.birthday.day) && n.birthday.day >= 1 && n.birthday.day <= 30, `${id}: birthday`);
  check(n.birthday && !Object.values(FEST).some((f) => f.season === n.birthday.season && f.day === n.birthday.day), `${id}: birthday is not a festival day`);
  for (const k of ['loves', 'likes', 'dislikes']) check(Array.isArray(n[k]), `${id}: ${k} is a list`);
  if (id === 'sato') continue;
  check(n.loves.length >= 3 && n.loves.length <= 5, `${id}: 3-5 loves (${n.loves.length})`);
  check(n.likes.length >= 4 && n.likes.length <= 8, `${id}: 4-8 likes (${n.likes.length})`);
  check(n.dislikes.length >= 2 && n.dislikes.length <= 4, `${id}: 2-4 dislikes (${n.dislikes.length})`);
  const all = [...n.loves, ...n.likes, ...n.dislikes];
  check(new Set(all).size === all.length, `${id}: an item is in one taste list only`);
  for (const it of all) check(GIFTABLE.includes(it), `${id}: taste item ${it} is a known item`);
}
check(Object.keys(NPCS).length === Object.keys(CAST).length, 'no NPC outside the cast table');
check(NPCS.sato.look.hair === '#1d2440' && NPCS.sato.look.style === 'bob', "Sato's navy-black bob");
check(!/\barkin\b/i.test(JSON.stringify(story)), 'Lt. Arkin is never mentioned');
check(NPCS.general.name === 'The General', 'the General is never named');
check(new Set(VILLAGERS.map((id) => NPCS[id].look.top)).size === VILLAGERS.length, 'every villager has a distinct top colour');
check(new Set(VILLAGERS.map((id) => `${NPCS[id].birthday.season}/${NPCS[id].birthday.day}`)).size === VILLAGERS.length, 'no shared birthdays');

// ---------------------------------------------------------------- gifts

for (const id of Object.keys(CAST)) {
  for (const it of [...GIFTABLE, ...NEUTRAL]) check(TIERS.has(giftTier(id, it)), `giftTier(${id}, ${it}) is a tier`);
  for (const it of NEUTRAL) check(giftTier(id, it) === 'neutral', `giftTier(${id}, '${it}') is neutral`);
  if (id === 'sato') continue;
  for (const it of NPCS[id].loves) check(giftTier(id, it) === 'loved', `${id} loves ${it}`);
  for (const it of NPCS[id].likes) check(giftTier(id, it) === 'liked', `${id} likes ${it}`);
  for (const it of NPCS[id].dislikes) check(giftTier(id, it) === 'disliked', `${id} dislikes ${it}`);
  const lines = new Set();
  for (const tier of TIERS) for (const b of [false, true]) {
    const l = giftLine(id, tier, b);
    check(isText(l), `giftLine(${id}, ${tier}, ${b})`);
    lines.add(l);
  }
  for (const l of lines) count(l);
  check(lines.size >= 7, `${id}: gift lines differ by tier and birthday (${lines.size})`);
}
check(TIERS.has(giftTier('nobody', 'turnip')) && isText(giftLine('nobody', 'loved', false)), 'gift functions survive an unknown npc');
check(giftTier('general', 'medal') === 'disliked' && giftTier('general', 'strawberry') === 'loved', 'the General: no more medals, strawberries please');
check(giftTier('ruess', 'scrap') === 'loved', 'Ruess loves scrap');
check(VILLAGERS.filter((id) => giftTier(id, 'scrap') === 'disliked').length >= 5, 'most villagers dislike scrap');
check(giftTier('vashti', 'crystal') === 'loved' && RELICS.filter((r) => giftTier('vashti', r) === 'loved').length >= 3, 'Vashti loves crystal and relics');
check(RELICS.every((r) => giftTier('vashti', r) !== 'disliked' && giftTier('vashti', r) !== 'neutral'), 'Vashti values every relic');
check(giftTier('marrow', 'photo') === 'loved' && giftTier('marrow', 'book') === 'loved', 'Marrow loves photo and book');
check(giftTier('corran', 'toy') === 'loved' && giftTier('seln', 'seedtin') === 'loved', 'Corran loves the toy, Seln the seed tin');
for (const r of RELICS) check(VILLAGERS.some((id) => giftTier(id, r) === 'loved' || giftTier(id, r) === 'liked'), `somebody wants the relic ${r}`);

// ---------------------------------------------------------------- schedules

const where = (id, ctx) => {
  const r = whereIs(id, ctx);
  check(r === null || (r && typeof r === 'object' && SPOTS.has(r.spot)), `whereIs(${id}) -> ${JSON.stringify(r)} @ ${JSON.stringify(ctx)}`);
  return r ? r.spot : null;
};
const seen = new Set();
const seenBy = Object.fromEntries(VILLAGERS.map((id) => [id, new Set()]));
for (const year of [1, 2]) for (let season = 0; season < 4; season++) for (let weekday = 0; weekday < 7; weekday++) {
  const day = dayFor(season, weekday, year);
  for (const weather of WEATHERS) for (let minute = 360; minute <= 1440; minute += 10) {
    const ctx = { season, day, weekday, minute, weather, festival: null, year, flags: year === 2 ? ldUpTo(season === 0 ? 'ld_catacombs' : season === 1 ? 'ld_enclave' : season === 2 ? 'ld_rehoused' : 'ld_vault') : undefined };
    const here = {};
    for (const id of VILLAGERS) {
      const spot = where(id, ctx);
      if (!spot) continue;
      seen.add(spot); seenBy[id].add(spot);
      (here[spot] ||= []).push(id);
      if (weather === 'storm') check(spot.startsWith('cafe.') || (UNDER.includes(id) && (spot.startsWith('lower.') || spot.startsWith('home_'))) || spot === 'undercroft.counter', `storm: ${id} is out at ${spot}`);   // no weather below decks
      if (minute >= 1380 || minute < 420) check(false, `${id} is up at ${minute} (${spot})`);
    }
    for (const spot of Object.keys(here)) {
      if (/counter|desk|table/.test(spot)) check(here[spot].length === 1, `${here[spot].join(' and ')} share ${spot} (wd ${weekday}, ${minute}, y${year})`);
    }
  }
}
check(where('sato', { season: 0, day: 1, weekday: 0, minute: 600, weather: 'sun', festival: null }) === null, 'Sato has no schedule');
check(whereIs('nobody', { season: 0, day: 1, weekday: 0, minute: 600, weather: 'sun', festival: null }) === null, 'unknown npc is nowhere');
check(whereIs('seln', undefined) === null, 'whereIs survives a missing ctx');
for (const s of SPOTS) check(seen.has(s), `spot ${s} is used by somebody`);
for (const id of MAIN) check(seenBy[id].size >= 4, `${id} gets about (${seenBy[id].size} spots)`);

// Shops: open on the counter at 11:00 and 15:00 on at least five days, shut on the stated day, never in a storm.
const at = (id, weekday, minute, more = {}) => where(id, { season: 0, day: dayFor(0, weekday), weekday, minute, weather: 'sun', festival: null, year: 1, ...more });
const CLOSED = { seln: 6, corran: 3, ruess: 2, oduya: -1, mori: 6 };
for (const id of Object.keys(CLOSED)) {
  const counter = NPCS[id].shop + '.counter';
  let open = 0;
  for (let wd = 0; wd < 7; wd++) {
    const isOpen = at(id, wd, 660) === counter && at(id, wd, 900) === counter;
    if (isOpen) open++;
    if (wd === CLOSED[id]) for (let m = 360; m <= 1440; m += 10) check(at(id, wd, m) !== counter, `${id} is shut on weekday ${wd} (${m})`);
    else {
      check(isOpen, `${id} is open on weekday ${wd}`);
      for (const m of [550, 600, 780, 1010]) if (id !== 'oduya') check(at(id, wd, m) === counter, `${id} keeps 09:00-17:00 (wd ${wd}, ${m})`);
      check(at(id, wd, 480) !== counter && at(id, wd, 1340) !== counter, `${id} is not at the counter at 08:00 or 22:20`);
    }
    for (let m = 360; m <= 1440; m += 10) if (id !== 'oduya') check(at(id, wd, m, { weather: 'storm' }) !== counter, `${id}'s shop is shut in a storm`);
  }
  check(open >= 5, `${id} opens at least 5 days a week (${open})`);
}
for (let wd = 0; wd < 7; wd++) {
  for (const m of [600, 720, 1200, 1310]) check(at('oduya', wd, m) === 'cafe.counter', `the café is open 10:00-22:00 (wd ${wd}, ${m})`);
  check(at('oduya', wd, 590) !== 'cafe.counter' && at('oduya', wd, 1320) !== 'cafe.counter', 'the café is shut before ten and at ten at night');
  check(at('oduya', wd, 720, { weather: 'storm', season: 1 }) === 'cafe.counter', 'Oduya keeps the café open through a storm');
  for (const m of [540, 700, 950]) check((at('marrow', wd, m) === 'hall.desk') === (wd < 5), `Marrow's desk hours (wd ${wd}, ${m})`);
  check(at('marrow', wd, 960) !== 'hall.desk', 'Marrow leaves the desk at four');
  for (const m of [540, 720, 1010]) check((at('moraine', wd, m) === 'central.dock') === (wd === 5), `Moraine's ship is at the Central dock on Saturdays only (wd ${wd}, ${m})`);
  const mo = (wd2, m, more) => { const x = at('moraine', wd2, m, more); return x === HOME('moraine') ? null : x; };   // at home counts as away from trade (§15)
  for (const m of [480, 1020]) check(wd === 5 ? mo(wd, m) === null : mo(wd, m) === (m < 1080 && m >= 600 ? 'central.exchange' : null), `Moraine: the dock 9-17 on Saturdays, the Exchange 10-18 other days (wd ${wd}, ${m})`);
  if (wd !== 5) check(at('moraine', wd, 700) === 'central.exchange' && at('moraine', wd, 550) === 'central.plaza' && mo(wd, 1090) === null, `Moraine keeps the Ashfall Exchange in Eden Central (wd ${wd})`);
  for (const m of [1020, 1040, 1055]) check(at('maris', wd, m) === 'farm.bin', `Maris is at the bin at five (wd ${wd}, ${m})`);
  check(at('maris', wd, 1060) !== 'farm.bin' && at('maris', wd, 1010) !== 'farm.bin', 'Maris is at the bin only 17:00-17:40');
  // The General.
  for (let m = 360; m <= 1440; m += 10) {
    const hg = HOME('general'), un = (x) => (x === hg ? null : x), g = un(at('general', wd, m)), g2 = un(at('general', wd, m, { year: 2 }));   // at home counts as off duty (§15)
    if (wd === 5) check((g !== null) === (m >= 600 && m < 1080) && (!g || g.startsWith('village.') || g.startsWith('cafe.')), `the General's Saturday (${m}: ${g})`);
    else if (wd === 6) check((g !== null) === (m >= 660 && m < 960) && (!g || g.startsWith('farm.')), `the General's Sunday (${m}: ${g})`);
    else check(g === (m >= 540 && m < 1020 ? 'central.office' : null), `the General is at his office on the Main deck on weekday ${wd}, 9 to 5 (${m}: ${g})`);
    if (wd === 2) check((m >= 1080 && m < 1260 ? g2 && g2.startsWith('cafe.') : g2 === g), `the General's Wednesday evening from year 2 (${m}: ${g2})`);
    else check(g2 === g, 'year 2 changes only his Wednesday');
  }
  for (const m of [600, 720, 900, 1070]) check((at('yui', wd, m) === 'library.counter') === (wd !== 0), `Yui keeps the library 10:00-18:00, not Mondays (wd ${wd}, ${m})`);
  check(at('yui', wd, 590) !== 'library.counter' && at('yui', wd, 1080) !== 'library.counter', 'the library is shut before ten and at six');
  for (let m = 360; m <= 1440; m += 30) check(at('yui', wd, m, { weather: 'storm' }) === null || at('yui', wd, m, { weather: 'storm' }).startsWith('cafe.'), 'the library is shut in a storm');
  for (const m of [570, 700]) check(['village.square', 'village.bridge'].includes(at('kestrel', wd, m)), `Kestrel is about the square and bridge (wd ${wd}, ${m})`);
  if (wd < 6) for (const m of [500, 700, 900]) check(at('vashti', wd, m) === 'hangar.floor', `Vashti keeps the hangar (wd ${wd}, ${m})`);
}
check([0, 2, 4].every((wd) => at('kestrel', wd, 1140) === 'hill.overlook'), 'Kestrel is at the overlook some evenings');
check(at('kestrel', 1, 800) === 'cafe.table3', 'Kestrel lunches at the canteen');
check(at('vashti', 6, 780) === 'cafe.table3', 'Vashti comes down to the café on Sundays');
check([1, 3, 5].every((wd) => at('vashti', wd, 1140) === 'hill.lake'), 'Vashti is at the lake some evenings');
const satSpots = new Set(); for (let m = 600; m < 1080; m += 10) satSpots.add(at('general', 5, m));
check(satSpots.has('village.memorial') && satSpots.has('village.bridge') && [...satSpots].some((s) => s.startsWith('cafe.')), "the General's Saturday: memorial, bridge, café");
const sunSpots = new Set(); for (let m = 660; m < 960; m += 10) sunSpots.add(at('general', 6, m));
check(['farm.porch', 'farm.pond', 'farm.field'].every((s) => sunSpots.has(s)), "the General's Sunday: porch, field, pond");

// Festival days: everyone near the festival during its hours, no counters all day, Maris not at the bin.
for (const f of FESTIVALS) {
  const near = f.spot === 'village.lane' ? ['village.lane', 'village.bakeryfront', 'village.tailorfront', 'village.floristfront', 'village.garagefront', 'village.radiofront']
    : f.spot === 'village.bridge' ? ['village.bridge', 'village.river', 'village.riverside', 'village.bench']
    : f.spot === 'lower.arena' ? ['lower.arena', 'lower.stands', 'lower.stands2', 'lower.arenagate']
    : ['village.square', 'village.bench', 'village.memorial', 'village.storefront', 'village.cafefront', 'village.hallfront'];
  for (const weather of WEATHERS) for (let minute = 360; minute <= 1440; minute += 10) {
    const ctx = { season: f.season, day: f.day, weekday: weekdayOf(f.season, f.day), minute, weather, festival: f.id, year: 1 };
    for (const id of VILLAGERS) {
      const spot = where(id, ctx);
      check(!spot || !/counter|desk/.test(spot), `${f.id}: ${id} is at ${spot} on a festival day`);
      check(spot !== 'farm.bin', `${f.id}: Maris does not collect`);
      if (UNDER.includes(id)) continue;   // the Undercroft folk stay below decks (until the Thornes move up)
      if (weather !== 'storm' && minute >= f.from && minute < f.to) check(near.includes(spot), `${f.id}: ${id} is at the festival (${minute}: ${spot})`);
      if (weather === 'storm') check(spot === null || spot.startsWith('cafe.'), `${f.id}: storm sends ${id} home`);
    }
  }
}
check(whereIs('seln', { season: 0, day: 5, weekday: 4, minute: 700, weather: 'sun', festival: 'something-new' }).spot !== 'store.counter', 'an unknown festival id still shuts the shops');
check(whereIs('seln', { season: 'Spring', day: 2, weekday: 1, minute: 700, weather: 'sun', festival: null }).spot === 'store.counter', 'a season name is accepted');

// ---------------------------------------------------------------- small talk

const convs = Object.fromEntries(VILLAGERS.map((id) => [id, new Set()]));
const okConv = (id, lines, ctx) => {
  const ok = Array.isArray(lines) && lines.length >= 1 && lines.length <= 3 && lines.every((l) => isText(l, 200));
  check(ok, `talkLines(${id}) -> ${JSON.stringify(lines)} @ ${JSON.stringify(ctx)}`);
  if (ok) convs[id].add(lines.join(' / '));
  return ok;
};
for (const id of VILLAGERS) {
  for (let season = 0; season < 4; season++) for (let hearts = 0; hearts <= 10; hearts++) for (const met of [true, false]) for (const isBirthday of [false, true]) {
    for (const weather of WEATHERS) for (const year of [1, 2]) for (const [day, minute, weekday] of [[3, 480, 2], [10, 700, 5], [14, 900, 6], [22, 1130, 0], [28, 1260, 6]]) {
      for (const flags of [undefined, {}, { greenhouse: true, anything: 1 }]) {
        const ctx = { season, day, weekday, minute, weather, festival: null, hearts, met, year, isBirthday, flags };
        okConv(id, talkLines(id, ctx), ctx);
      }
    }
  }
  // Festival eves and festival days.
  for (const f of FESTIVALS) for (let hearts = 0; hearts <= 10; hearts += 2) for (let minute = 420; minute <= 1380; minute += 20) {
    const eve = { season: f.season, day: f.day - 1, weekday: 0, minute, weather: 'sun', festival: null, hearts, met: true, year: 1, isBirthday: false, flags: {} };
    okConv(id, talkLines(id, eve), eve);
    const on = { ...eve, day: f.day, festival: f.id };
    okConv(id, talkLines(id, on), on);
  }
  // A long walk through ordinary days.
  for (let n = 0; n < 4000; n++) {
    const ctx = { season: n % 4, day: 1 + (n * 7) % 30, weekday: n % 7, minute: 360 + (n * 37) % 1080, weather: WEATHERS[(n >> 2) % 4], festival: null,
      hearts: (n * 3) % 11, met: true, year: 1 + (n % 3), isBirthday: n % 97 === 0, flags: n % 5 ? {} : { greenhouse: true } };
    okConv(id, talkLines(id, ctx), ctx);
  }
  const base = { season: 1, day: 12, weekday: 4, minute: 615, weather: 'sun', festival: null, hearts: 4, met: true, year: 1, isBirthday: false, flags: {} };
  check(JSON.stringify(talkLines(id, base)) === JSON.stringify(talkLines(id, { ...base })), `${id}: the same moment gives the same lines`);
  check(JSON.stringify(talkLines(id, { ...base, met: false })) === JSON.stringify(talkLines(id, { ...base, met: false, day: 20, minute: 900 })), `${id}: one first meeting`);
  check(JSON.stringify(talkLines(id, { ...base, met: false })) !== JSON.stringify(talkLines(id, base)), `${id}: the first meeting differs from small talk`);
  okConv(id, talkLines(id, {}), {});
  okConv(id, talkLines(id, undefined), undefined);
  const need = needTalk(id);
  check(convs[id].size >= need, `${id}: at least ${need} distinct conversations reachable (${convs[id].size})`);
  if (typeof story.conversationCount === 'function') check(convs[id].size === story.conversationCount(id), `${id}: every written conversation is reachable (${convs[id].size} of ${story.conversationCount(id)})`);
  for (const c of convs[id]) count(c.replace(/ \/ /g, ' '));
  // Friendship changes the talk: the closest lines are not heard by strangers.
  const low = new Set(), high = new Set();
  for (let n = 0; n < 600; n++) {
    const ctx = { ...base, day: 1 + n % 30, season: n % 4, minute: 400 + (n * 20) % 900 };
    low.add(talkLines(id, { ...ctx, hearts: 0 }).join('/'));
    high.add(talkLines(id, { ...ctx, hearts: 10 }).join('/'));
  }
  check([...high].some((c) => !low.has(c)), `${id}: ten hearts unlock new talk`);
}
check(Array.isArray(talkLines('nobody', {})) && talkLines('nobody', {}).length >= 1, 'talkLines survives an unknown npc');

// ---------------------------------------------------------------- lines, events, festivals

const SPEAKERS = new Set([...Object.keys(CAST), 'narrator']);
function checkLines(lines, where, min, max) {
  check(Array.isArray(lines) && lines.length >= min && lines.length <= max, `${where}: ${min}-${max} lines (${lines?.length})`);
  for (const [i, l] of (lines || []).entries()) {
    check(l && SPEAKERS.has(l.who), `${where}[${i}]: who '${l?.who}'`);
    check(l && isText(l.text), `${where}[${i}]: text (${l?.text?.length} chars)`);
    count(l?.text);
  }
}

const eventIds = new Set();
for (const e of EVENTS) {
  check(isText(e.id, 40) && !eventIds.has(e.id), `event id ${e.id} is unique`);
  eventIds.add(e.id);
  check(VILLAGERS.includes(e.npc), `${e.id}: npc ${e.npc}`);
  check(MAPS.has(e.map), `${e.id}: map ${e.map}`);
  check(Number.isInteger(e.hearts) && e.hearts >= 1 && e.hearts <= 10, `${e.id}: hearts`);
  checkLines(e.lines, e.id, 6, 14);
  check(e.lines.some((l) => l.who === e.npc) && e.lines.some((l) => l.who === 'sato'), `${e.id}: both ${e.npc} and Sato speak`);
  for (const k of ['from', 'to']) check(e[k] === undefined || (Number.isInteger(e[k]) && e[k] >= 360 && e[k] <= 1440), `${e.id}: ${k}`);
  check(e.weekday === undefined || (Number.isInteger(e.weekday) && e.weekday >= 0 && e.weekday <= 6), `${e.id}: weekday`);
  check(e.season === undefined || (Number.isInteger(e.season) && e.season >= 0 && e.season <= 3), `${e.id}: season`);
  const r = e.reward;
  check(r && typeof r === 'object', `${e.id}: has a reward`);
  if (r) {
    check(Object.keys(r).every((k) => ['love', 'item', 'money'].includes(k)), `${e.id}: reward keys`);
    check(r.love === undefined || (Number.isInteger(r.love) && r.love >= 3 && r.love <= 6), `${e.id}: modest love`);
    check(r.money === undefined || (Number.isInteger(r.money) && r.money > 0 && r.money <= 500), `${e.id}: modest money`);
    check(r.item === undefined || (Array.isArray(r.item) && typeof r.item[0] === 'string' && Number.isInteger(r.item[1]) && r.item[1] >= 1 && r.item[1] <= 3
      && (GIFTABLE.includes(r.item[0]) || /^seed_/.test(r.item[0]))), `${e.id}: reward item ${r.item}`);
  }
  // The event can happen: within its window the villager is somewhere on that map (year 1, fine weather, no festival).
  let reachable = false;
  for (let season = 0; season < 4 && !reachable; season++) {
    if (e.season !== undefined && e.season !== season) continue;
    for (let wd = 0; wd < 7 && !reachable; wd++) {
      if (e.weekday !== undefined && e.weekday !== wd) continue;
      let all = true, any = false;
      for (let m = e.from ?? 360; m < (e.to ?? 1440); m += 10) {
        const s = where(e.npc, { season, day: dayFor(season, wd), weekday: wd, minute: m, weather: 'sun', festival: null, year: 1, flags: e.flag ? ldUpTo(e.flag) : undefined });
        const on = !!s && s.split('.')[0] === e.map;
        any ||= on; all &&= on;
      }
      reachable = e.from !== undefined ? all : any;
    }
  }
  check(reachable, `${e.id}: ${e.npc} is on map '${e.map}' during the event's window`);
}
const byNpc = (id) => EVENTS.filter((e) => e.npc === id).map((e) => e.hearts).sort((a, b) => a - b).join(',');
for (const id of LOVERS) check(EVENTS.some((e) => e.npc === id && e.hearts < 8), `${id}: a heart event before the confession`);
check(byNpc('general') === '2,4,6,8,10', `the General's five events (${byNpc('general')})`);
for (const id of VILLAGERS) if (id !== 'general') check(byNpc(id) === (['lark', 'vesna'].includes(id) ? '3,5,7' : '3,7'), `${id}: events at 3 and 7 hearts (${byNpc(id)})`);
check(EVENTS.length === 5 + 2 * (VILLAGERS.length - 1) + 2, `${5 + 2 * (VILLAGERS.length - 1) + 2} events (${EVENTS.length}; Lark and Vesna have a third)`);

check(FESTIVALS.length >= 5, `at least five festivals (${FESTIVALS.length})`);
for (const f of FESTIVALS) {
  const want = FEST[f.id];
  check(!!want, `festival id ${f.id}`);
  if (!want) continue;
  for (const k of Object.keys(want)) check(f[k] === want[k], `${f.id}: ${k} = ${f[k]}`);
  check(isText(f.blurb) && !/[.!?]\s+[A-Z]/.test(f.blurb.replace(/:\s/g, ' ')), `${f.id}: a one-sentence blurb`);
  count(f.blurb);
  checkLines(f.lines, `festival ${f.id}`, 8, 14);
  check(f.lines.some((l) => l.who === 'sato'), `${f.id}: Sato speaks`);
  check(new Set(f.lines.map((l) => l.who).filter((w) => w !== 'sato' && w !== 'narrator')).size >= 4, `${f.id}: several villagers speak`);
  check(f.reward && typeof f.reward === 'object' && Object.keys(f.reward).length >= 1, `${f.id}: a reward`);
}
check(new Set(FESTIVALS.map((f) => f.id)).size === FESTIVALS.length, 'festival ids are unique');
const fr = Object.fromEntries(FESTIVALS.map((f) => [f.id, f.reward]));
check(fr.planting?.item?.[0] === 'seed_potato' && fr.planting.item[1] === 2, 'Planting Day gives two potato seed bags');
check(fr.harvest?.money > 0, 'the Harvest Fair pays');
check(fr.lantern?.loveAll === 2 && fr.yearsend?.loveAll === 2, "Lantern Night and Year's End: love for everyone");

// ---------------------------------------------------------------- the opening, day 1, radio, signs, guide

checkLines(INTRO, 'INTRO', 10, 16);
const arts = INTRO.map((l) => l.art).filter(Boolean);
check(arts.join(',') === 'intro1,intro2,intro3,intro4,intro5', `INTRO shows the five scenes in order (${arts})`);
check(INTRO[0].art === 'intro1', 'INTRO starts on its first picture');
check(INTRO.some((l) => l.who === 'sato' && l.text === 'Grow something.'), 'INTRO: "Grow something."');
check(INTRO.every((l) => ['narrator', 'sato', 'general'].includes(l.who)), 'INTRO speakers');
checkLines(DAY1, 'DAY1', 6, 9);
check(DAY1[0].who === 'marrow' && DAY1.every((l) => l.who === 'marrow' || l.who === 'sato'), 'DAY1 is Marrow and Sato');
const day1 = DAY1.map((l) => l.text).join(' ').toLowerCase();
for (const w of ['sickle', 'hammer', 'axe', 'hoe', 'water', 'shipping bin', 'five', 'south road', 'maris']) check(day1.includes(w), `DAY1 mentions ${w}`);

check(Object.keys(RADIO).sort().join() === 'rain,snow,storm,sun', 'RADIO has the four weathers');
for (const w of WEATHERS) {
  check(Array.isArray(RADIO[w]) && RADIO[w].length === 3 && new Set(RADIO[w]).size === 3, `RADIO.${w}: three different forecasts`);
  for (const s of RADIO[w] || []) { check(isText(s), `RADIO.${w}: ${s}`); count(s); }
}
const SIGN_SPOTS = ['farm.gate', 'farm.bin', 'village.square', 'village.memorial', 'village.riverside', 'village.storefront', 'village.cafefront',
  'village.hallfront', 'village.workshopfront', 'village.ranchyard', 'hill.wreck', 'hill.lake', 'hill.overlook'];
for (const s of SIGN_SPOTS) { check(isText(SIGNS[s]), `SIGNS['${s}'] (${SIGNS[s]?.length})`); count(SIGNS[s]); }
for (const s of Object.keys(SIGNS)) check(SPOTS.has(s), `sign spot ${s} is a known spot`);
check(/orbital elevator/i.test(SIGNS['hill.wreck']) && !/wreck|mine\b|descent/i.test(SIGNS['hill.wreck']), 'the hill sign is the orbital elevator');

check(Array.isArray(HELP) && HELP.length >= 7 && HELP.length <= 16, `HELP has 7-16 pages (${HELP.length})`);
check(HELP.some((p) => p.title === 'Love'), 'HELP has a Love page');
for (const p of HELP) {
  check(isText(p.title, 50), `HELP title ${p.title}`);
  check(typeof p.body === 'string' && p.body.length > 150 && p.body.length <= 700, `HELP '${p.title}': body length ${p.body?.length}`);
  check(!/<[a-z/]/i.test(p.body), `HELP '${p.title}': plain text`);
  count(p.body);
}
const help = HELP.map((p) => p.title + '\n' + p.body).join('\n').toLowerCase();
for (const w of ['w a s d', 'arrow', 'shift', 'space', 'left click', 'mouse wheel', 'tab', 'esc', 'touch', 'stamina', 'shipping bin', 'sickle', 'hoe',
  'starsteel', 'greenhouse', 'chicken', 'cow', 'birthday', 'orbital elevator', 'old world', 'hydra', 'memory room', 'float', 'hill lake', 'forage', 'planting day',
  'lantern night', 'harvest fair', "year's end", 'moonflower', 'favour', 'pendant', 'sweetheart', 'wedding', '8 hearts', '10 hearts', 'clinic', 'library', 'lantern ring']) check(help.includes(w), `HELP mentions '${w}'`);
check(new Set(HELP.map((p) => p.title)).size === HELP.length, 'HELP titles are unique');

// ---------------------------------------------------------------- the Memory Room, fishing, the Old World

check(isText(MUSEUM.intro) && isText(MUSEUM.repeat), 'MUSEUM intro and repeat'); count(MUSEUM.intro); count(MUSEUM.repeat);
check(Object.keys(MUSEUM.thanks).sort().join() === [...RELICS].sort().join(), 'MUSEUM.thanks covers exactly the ten relics');
for (const r of RELICS) { check(isText(MUSEUM.thanks[r]), `MUSEUM.thanks.${r}`); count(MUSEUM.thanks[r]); }
check(new Set(Object.values(MUSEUM.thanks)).size === RELICS.length, 'MUSEUM thanks are all different');
checkLines(MUSEUM.complete, 'MUSEUM.complete', 3, 10);
check(MUSEUM.complete.some((l) => l.who === 'marrow'), 'Marrow speaks when the Memory Room is complete');

for (const k of ['bite', 'miss']) {
  check(Array.isArray(FISHING[k]) && FISHING[k].length === 3 && new Set(FISHING[k]).size === 3, `FISHING.${k}: three lines`);
  for (const s of FISHING[k] || []) { check(isText(s, 90), `FISHING.${k}: ${s}`); count(s); }
}
check(Object.keys(FISHING.caught).sort().join() === [...FISH].sort().join(), 'FISHING.caught covers exactly the fish');
for (const f of FISH) { check(isText(FISHING.caught[f], 110), `FISHING.caught.${f}`); count(FISHING.caught[f]); }
check(/old hollin/i.test(FISHING.caught.fish_king), 'the king of the lake is Old Hollin');

// the Old World is one big city a trip (2026-11-20): no 'deeper' lines; news for each of the three zones
check(!RUINS.deeper, 'RUINS: no levels to go deeper into');
for (const k of ['first', 'zone', 'zoneFirst']) { check(Array.isArray(RUINS[k]) && RUINS[k].length === 3 && new Set(RUINS[k]).size === 3, `RUINS.${k}: three lines`); for (const s of RUINS[k] || []) { check(isText(s, 240) && !/\blevel\b|deeper|way down/i.test(s), `RUINS.${k}: ${s}`); count(s); } }
check(isText(RUINS.vault) && isText(SHUTTLE.tow) && SHUTTLE.hull && isText(SHUTTLE.hull[50]) && isText(SHUTTLE.hull[25]) && /12 cr/.test(SHUTTLE.tally(12, 3)), 'RUINS.vault, the tow, hull warnings, the trip tally');
for (const id of ['old_coin', 'teddy_bear', 'film_camera', 'credit_chip', 'data_core']) { check(isText(RUINS.finds && RUINS.finds[id], 140), `RUINS.finds.${id}`); count(RUINS.finds[id]); }
for (const k of ['arrive', 'monster']) {
  check(Array.isArray(RUINS[k]) && RUINS[k].length >= 3 && new Set(RUINS[k]).size === RUINS[k].length, `RUINS.${k}: three lines or more`);
  for (const s of RUINS[k] || []) { check(isText(s, 140), `RUINS.${k}: ${s}`); count(s); }
}
check(Object.keys(RUINS.relic).sort().join() === [...RELICS].sort().join(), 'RUINS.relic covers exactly the ten relics');
for (const r of RELICS) { check(isText(RUINS.relic[r], 140) && !/[.!?]\s+[A-Z]/.test(RUINS.relic[r]), `RUINS.relic.${r}: one sentence`); count(RUINS.relic[r]); }

// ---------------------------------------------------------------- love stories

check(JSON.stringify(ROMANCE.candidates) === JSON.stringify(LOVERS), 'ROMANCE.candidates are the six');
check(isText(ROMANCE.pendant, 220) && /pendant/i.test(ROMANCE.pendant) && /hull-glass/i.test(ROMANCE.pendant), 'ROMANCE.pendant'); count(ROMANCE.pendant);
check(Object.keys(ROMANCE.people).sort().join() === [...LOVERS].sort().join(), 'ROMANCE.people covers exactly the six');
for (const id of LOVERS) {
  const r = ROMANCE.people[id];
  if (!r) continue;
  checkLines(r.confess, `${id}.confess`, 8, 12);
  checkLines(r.propose, `${id}.propose`, 8, 12);
  checkLines(r.wedding, `${id}.wedding`, 6, 10);
  for (const k of ['confess', 'propose', 'wedding']) check(r[k].some((l) => l.who === id) && r[k].some((l) => l.who === 'sato'), `${id}.${k}: both speak`);
  check(r.confess[r.confess.length - 1].who === 'narrator', `${id}.confess ends on the two of them walking out`);
  check(r.wedding.some((l) => l.who === 'marrow') && new Set(r.wedding.map((l) => l.who).filter((w) => !['sato', 'narrator', id].includes(w))).size >= 2, `${id}.wedding: several villagers speak`);
  check(/pendant/i.test(JSON.stringify(r.propose)), `${id}.propose: the pendant`);
  for (const [k, min] of [['partnerTalk', 10], ['morning', 4], ['sweetTalk', 4]]) {
    check(Array.isArray(r[k]) && r[k].length >= min && new Set(r[k]).size === r[k].length, `${id}.${k}: at least ${min} different lines (${r[k]?.length})`);
    for (const l of r[k] || []) { check(isText(l, 200), `${id}.${k}: ${l}`); count(l); }
  }
  check(isText(r.decline, 200), `${id}.decline`); count(r.decline);
  if (id === 'general') check(!/\b(his name|called him)\b/i.test(JSON.stringify(r)), 'the General stays unnamed');

  // The partner is on the porch at dawn and in the evening, and keeps the usual day otherwise.
  for (let wd = 0; wd < 7; wd++) for (const weather of WEATHERS) for (let m = 360; m <= 1440; m += 10) {
    const ctx = { season: 1, day: dayFor(1, wd), weekday: wd, minute: m, weather, festival: null, year: 1 };
    const home = (m >= 360 && m < 480) || (m >= 1200 && m < 1320);
    const mine = where(id, { ...ctx, partner: id }), usual = where(id, ctx), other = where(id, { ...ctx, partner: 'nobody' });
    if (home) check(mine === 'farm.porch', `${id} as partner is on the porch at ${m}`);
    else check(mine === usual || (usual === HOME(id) && mine === 'farm.porch'), `${id} as partner keeps the usual day at ${m} (free time at the farm, not the old home)`);
    check(other === usual, `${id}: somebody else's partner changes nothing`);
  }
  for (const f of FESTIVALS) for (let m = f.from; m < f.to; m += 10) {
    check(where(id, { season: f.season, day: f.day, weekday: weekdayOf(f.season, f.day), minute: m, weather: 'sun', festival: f.id, year: 1, partner: id }) !== 'farm.porch', `${id} as partner stays at the ${f.id} festival`);
  }
  // Partner talk and sweetheart talk.
  const heardP = new Set(), heardM = new Set(), heardS = new Set();
  for (let n = 0; n < 3000; n++) {
    const base = { season: n % 4, day: 1 + (n * 7) % 30, weekday: n % 7, weather: WEATHERS[(n >> 2) % 4], festival: null, hearts: 10, met: true, year: 2, isBirthday: false, flags: {} };
    const day = talkLines(id, { ...base, minute: 480 + (n * 20) % 900, partner: id });
    const dawn = talkLines(id, { ...base, minute: 360 + (n * 20) % 120, partner: id });
    const sweet = talkLines(id, { ...base, hearts: 8 + n % 3, minute: 480 + (n * 20) % 900, sweetheart: id });
    for (const c of [day, dawn, sweet]) check(Array.isArray(c) && c.length >= 1 && c.length <= 3 && c.every((l) => isText(l, 200)), `${id}: love talk ${JSON.stringify(c)}`);
    check(r.partnerTalk.includes(day[0]), `${id}: partner talk by day`); heardP.add(day[0]);
    check(r.morning.includes(dawn[0]), `${id}: morning lines before eight`); heardM.add(dawn[0]);
    if (r.sweetTalk.includes(sweet[0])) heardS.add(sweet[0]);
    check(!r.sweetTalk.includes(talkLines(id, { ...base, minute: 700 })[0]), `${id}: no tender talk for mere friends`);
  }
  check(heardP.size === r.partnerTalk.length && heardM.size === r.morning.length, `${id}: every partner line is heard (${heardP.size}, ${heardM.size})`);
  check(heardS.size >= 4, `${id}: at least four tender sweetheart lines are heard (${heardS.size})`);
}
for (const id of VILLAGERS) check(giftTier(id, 'pendant') === 'neutral', `${id}: the pendant is neutral as a gift`);

// ---------------------------------------------------------------- requests

const SEASON_OF = { turnip: [0], potato: [0], cucumber: [0], strawberry: [0], tomato: [1], corn: [1], onion: [1], pumpkin: [1],
  carrot: [2], eggplant: [2], sweetpotato: [2], spinach: [2], herb: [0, 1], berry: [1], mushroom: [2], frostcap: [3],
  fish_spring: [0], fish_summer: [1], fish_autumn: [2], fish_winter: [3], wild_apple: [2], pine_nut: [3] };
const ANYTIME = ['egg', 'milk_s', 'milk_m', 'milk_l', 'fish_s', 'fish_m', 'fish_l', 'scrap', 'alloy', 'crystal', ...RELICS, 'bread', 'soup', 'pie', 'tea',
  'copper', 'nickel_iron', 'shiitake', 'pale_oyster', 'glowcap', 'cave_fish', 'glowfish', 'pump_part'];   // the Undercroft grows and catches its own all year
Object.assign(SEASON_OF, { cabbage: [0], snap_pea: [0], tulip: [0], bell_pepper: [1], melon: [1], sunflower: [1], beet: [2], cranberry: [2], cosmos: [2], kale: [3], frost_leek: [3], snowbell: [3],
  wild_violet: [0], elderflower: [1], rosehip: [2], snowdrop: [3] });
ANYTIME.push('wool', 'fine_wool', 'yarn', 'duck_egg', 'duck_feather', 'goat_milk', 'goat_milk_l', 'cheese', 'goat_cheese', 'honey');
const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
check(Object.keys(QUESTS).sort().join() === [...VILLAGERS].sort().join(), 'QUESTS covers exactly the villagers');
const questIds = new Set();
let questCount = 0;
for (const id of VILLAGERS) {
  const list = QUESTS[id] || [];
  questCount += list.length;
  check(list.length >= 5 && list.length <= 7, `${id}: 5-7 requests (${list.length})`);
  check(list.filter((q) => q.season === undefined).length >= 2, `${id}: at least two requests for any season`);
  check(list.filter((q) => q.season === undefined && !q.minHearts).length >= 1, `${id}: a request a new acquaintance can do in winter`);
  for (const q of list) {
    check(isText(q.id, 40) && !questIds.has(q.id), `request id ${q.id} is unique`); questIds.add(q.id);
    check(Number.isInteger(q.n) && q.n >= 1 && q.n <= 6, `${q.id}: n`);
    check(isText(q.ask) && isText(q.thanks), `${q.id}: ask and thanks`); count(q.ask); count(q.thanks);
    check(q.minHearts === undefined || (Number.isInteger(q.minHearts) && q.minHearts >= 1 && q.minHearts <= 9), `${q.id}: minHearts`);
    check(Object.keys(q).every((k) => ['id', 'item', 'n', 'ask', 'thanks', 'season', 'minHearts'].includes(k)), `${q.id}: fields`);
    if (SEASON_OF[q.item]) check(SEASON_OF[q.item].includes(q.season), `${q.id}: ${q.item} is asked for in its season (${q.season})`);
    else check(ANYTIME.includes(q.item) && (q.season === undefined || (Number.isInteger(q.season) && q.season >= 0 && q.season <= 3)), `${q.id}: item ${q.item}`);
    const ask = q.ask.toLowerCase();
    check(ask.includes(NUMBER_WORDS[q.n]) || ask.includes(String(q.n)) || (q.n === 1 && /\b(a|an)\b/.test(ask)) || (q.n === 6 && ask.includes('half a dozen')), `${q.id}: the ask says how many (${q.n})`);
  }
  if (LOVERS.includes(id)) check(list.filter((q) => q.minHearts >= 5).length >= 2 && list.filter((q) => !q.minHearts).length >= 2, `${id}: two personal requests, and two for anyone`);
}

// ---------------------------------------------------------------- the whole text

// No line anywhere is longer than 220 characters (HELP bodies excepted: they are pages), no emoji, no markup.
const texts = [];
(function walk(v, path) {
  if (typeof v === 'string') texts.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], `${path}.${k}`);
})({ EVENTS, FESTIVALS, INTRO, DAY1, RADIO, SIGNS, MUSEUM, FISHING, RUINS, ROMANCE, QUESTS, TALK: story.TALK }, '');
for (const [path, t] of texts) {
  check(t.length <= 220, `${path}: ${t.length} characters`);
  check(!/[\u{1F000}-\u{1FAFF}☀-➿]/u.test(t), `${path}: no emoji`);
  check(!/\b(color|honor|neighbor|gray|favorite|center|theater|plow|realize|apologize)\b/i.test(t), `${path}: British spelling`);
}
const everything = JSON.stringify(story).toLowerCase() + JSON.stringify(Object.keys(CAST).flatMap((id) => [...TIERS].map((t) => giftLine(id, t, true)))).toLowerCase();
check(!/\brom\b/.test(everything), 'nothing refers to a ROM');
check(!/river chamber/.test(everything) && /upper deck/.test(everything) && /lantern ring/.test(everything) && /hesk/.test(everything), 'the setting is the Upper deck, after Hesk');
check(!/\bmine shaft\b|\bthe mine\b|\bminer\b/.test(everything), 'there is no mine');
for (const id of VILLAGERS) check(!JSON.stringify(story.TALK?.[id] ?? '').includes('"sato"'), `${id}: talk data has no speaker tags`);

// ---------------------------------------------------------------- the pastor and the constable (2026-11-19)
check(!ROMANCE.candidates.includes('calloway') && !ROMANCE.candidates.includes('fenn'), 'the pastor and the constable are friends, not romance candidates');
const atC = (id, wd, m, more) => at(id, wd, m, more);
function near2(f, spot) { return f.spot === 'lower.arena' ? ['lower.arena', 'lower.stands', 'lower.stands2', 'lower.arenagate'].includes(spot) : f.spot === 'village.bridge' ? ['village.bridge', 'village.river', 'village.riverside', 'village.bench'].includes(spot) : ['village.square', 'village.bench', 'village.memorial', 'village.storefront', 'village.cafefront', 'village.hallfront'].includes(spot); }
for (const wd of [1, 2, 3, 4, 5]) for (const m of [600, 960]) check(atC('calloway', wd, m) === 'church.altar', `Pastor Ines keeps the altar (wd ${wd}, ${m})`);
check([800, 840].every((m) => atC('calloway', 1, m) === 'central.churchgarden'), 'she tends her garden after lunch');
check(atC('calloway', 2, 750) === 'school.floor', 'on Wednesdays she sits in the empty school');
check(atC('calloway', 0, 600)?.startsWith('village.') && atC('calloway', 0, 900)?.startsWith('library.'), 'Mondays off, in Willowfall');
for (const wd of [0, 1, 2, 4, 5, 6]) { check(atC('fenn', wd, 490) === 'school.floor', `Constable Fenn checks the school locks at eight (wd ${wd})`); for (const m of [600, 960]) check(atC('fenn', wd, m) === 'depot.desk', `the depot desk is staffed (wd ${wd}, ${m})`); }
check([600, 720, 840, 960].every((m) => !atC('fenn', 3, m)?.startsWith('depot.')) && atC('fenn', 3, 600) === 'village.ranchyard', 'Thursdays off: stray hens home to Willowfall');
check(atC('fenn', 6, 1110) === 'church.pew' && atC('calloway', 6, 1110) === 'church.pew', 'Sunday evensong: the constable sits at the back');
check(atC('fenn', 3, 840, { weather: 'rain' }) === 'village.bench', 'no fishing in the rain');
for (const id of ['calloway', 'fenn']) check(at(id, 1, 700, { weather: 'storm' }) === null, `${id} stays in in a storm`);
check(ROMANCE.candidates.every((id) => ROMANCE.people[id].wedding.some((l) => l.who === 'calloway')), 'the pastor blesses every wedding');
for (const f of FESTIVALS) check(f.lines.some((l) => l.who === 'calloway' || l.who === 'fenn'), `${f.id}: the pastor or the constable is there`);
check(isText(SIGNS['hill.wreck']) && story.ELEVATOR && isText(story.ELEVATOR.up) && isText(story.ELEVATOR.down) && story.CHURCH.candles.length >= 3, 'the elevator and the candles have words');
check(!/\bdescent\b/i.test(JSON.stringify({ TALK: story.TALK, EVENTS, QUESTS, HELP, SIGNS, NPCS })), 'the Descent is gone from the words (the elevator replaced it)');

// ---------------------------------------------------------------- Market Lane's five (2026-11-19)
check(LANE.every((id) => story.VILLAGERS.includes(id) && NPCS[id].portrait === 'look:' + id), 'the five Market Lane villagers are full villagers, with drawn portraits');
check(['lark', 'vesna'].every((id) => ROMANCE.candidates.includes(id)) && ['pia', 'noor', 'tika'].every((id) => !ROMANCE.candidates.includes(id)), 'Lark and Vesna can be courted; Pia, Noor and Tika are friends');
check(new Set(LANE.map((id) => NPCS[id].look.style)).size === 5 && LANE.every((id) => !['bald', 'cap'].includes(NPCS[id].look.style)), 'five different hair styles');
for (const [id, wd] of [['pia', 6], ['lark', 0], ['noor', 1], ['vesna', 6]]) check([600, 840].every((m) => at(id, wd, m) !== NPCS[id].shop + '.counter'), `${id} has a day off (wd ${wd})`);
for (const wd of [1, 2, 3, 4, 5, 6]) check([420, 600, 840].every((m) => at('lark', wd, m) === 'bakery.counter') && at('lark', wd, 1200) === null, `Lark opens at seven and is in bed early (wd ${wd})`);
for (const wd of [0, 1, 3, 4, 5]) check(at('tika', wd, 600) === 'workshop.bench' && at('tika', wd, 900) === 'garage.counter', `Tika: the Workshop mornings, her garage afternoons (wd ${wd})`);
check(at('tika', 2, 660) === 'hill.wreck' && at('ruess', 2, 660) === 'hill.wreck', 'Wednesdays Tika goes up the hill with Ruess');
check([4, 5].every((wd) => at('vesna', wd, 1230) === 'cafe.stage') && at('vesna', 1, 1230) === 'radio.counter' && at('vesna', 1, 460) === 'radio.counter' && at('vesna', 1, 630) === null, 'Vesna: the morning show, a lie-in, the night show, the Hangar on Fridays and Saturdays');
check(at('vesna', 4, 1230, { weather: 'storm' }) === 'cafe.stage' && at('pia', 1, 700, { weather: 'storm' }) === null, 'the show at the Hangar goes on in a storm; the Lane shuts');
check(at('noor', 1, 600) === 'hill.terraces' && at('noor', 1, 600, { weather: 'rain' }) === 'village.bench' && at('noor', 1, 1020) === 'farm.east', 'Noor walks the terraces on Tuesdays and looks in on the farm');
const bloom = FESTIVALS.find((f) => f.id === 'bloom');
check(bloom && LANE.every((id) => bloom.lines.some((l) => l.who === id)) && bloom.lines.some((l) => l.who === 'marrow'), 'all five speak at the Bloom Fair');
check(LANE.every((id) => FESTIVALS.filter((f) => f.id !== 'bloom').every((f) => near2(f, where(id, { season: f.season, day: f.day, weekday: weekdayOf(f.season, f.day), minute: f.from + 30, weather: 'sun', festival: f.id, year: 1 })))), 'the Lane comes to every festival');
check(/Bloom Fair/.test(SIGNS['village.square']) && isText(SIGNS['village.lane']) && HELP.some((p) => /Market Lane/.test(p.title)) && /Lark/.test(HELP.find((p) => p.title === 'Love').body), 'the noticeboard, the Lane sign and the guide know about Market Lane');
for (const id of ['lark', 'vesna']) check(EVENTS.filter((e) => e.npc === id).length === 3 && ROMANCE.people[id].wedding.some((l) => LANE.includes(l.who) && l.who !== id), `${id}: three heart events, and the Lane at the wedding`);

// ---------------------------------------------------------------- homes (2026-11-19, docs/FARM.md §15)
{
  const ALL = { ld_lights: 1, ld_pumps: 1, ld_catacombs: 1, ld_enclave: 1, ld_works: 1 };
  for (const id of VILLAGERS) {
    check(story.HOMES[id] && story.homeKey(id, ALL), `${id} has a home`);
    const L = story.HOME_LINES[id];
    check(L && Array.isArray(L.visit) && L.visit.length >= 2 && L.visit.length <= 4 && isText(L.shy) && (id === 'moth' || (isText(L.note) && isText(L.asleep) && isText(L.in))), `${id}: knock, door-note, asleep and 2-4 home-visit lines`);
    for (const t of [L.in, L.note, L.asleep, L.shy, ...L.visit.flat()]) { check(isText(t, 220) && !/\b(color|honor|neighbor|gray|favorite|center|realize|apologize)\b/i.test(t), `${id} home line: ${t}`); count(t); }
    for (const flags of id === 'thorne' || id === 'moth' ? [ALL, { ...ALL, ld_rehoused: 1 }] : [ALL]) {
      const hs = HOME(id, flags); let seen = 0, sleptIn = true;
      for (let wd = 0; wd < 7; wd++) for (let m = 360; m < 1440; m += 10) { const c = { season: 1, day: dayFor(1, wd), weekday: wd, minute: m, weather: 'sun', festival: null, year: 1, flags }, w = whereIs(id, c);
        if (w && w.spot === hs) { seen++; check(story.presence(id, c) === 'home', `${id} at home is home (${wd} ${m})`); }
        if ((m < 420 || m >= 1380) && story.presence(id, c) !== 'asleep') sleptIn = false; }
      check(seen >= 7, `${id}'s home is in the schedule (${seen} slots, ${hs})`); check(sleptIn, `${id} sleeps at home`);
    }
  }
  const sc = (id, m, more = {}) => ({ season: 1, day: dayFor(1, 2), weekday: 2, minute: m, weather: 'sun', festival: null, year: 1, flags: ALL, ...more });
  check(story.presence('mori', sc('mori', 700)) === 'out' && story.presence('mori', sc('mori', 1300)) === 'home' && story.presence('mori', sc('mori', 1400)) === 'asleep', 'Dr. Mori: out at the clinic, home in the evening, asleep at night');
  check(story.presence('vesna', sc('vesna', 630)) === 'asleep', 'Vesna sleeps in after the morning show');
  check(story.presence('seln', sc('seln', 700, { weather: 'storm' })) === 'home' && whereIs('seln', sc('seln', 700, { weather: 'storm' })) === null, 'a storm keeps people in at home');
  check(whereIs('lark', sc('lark', 1230, { partner: 'lark' })).spot === 'farm.porch' && story.homeSpot('lark', { partner: 'lark' }) === 'farm.porch', 'a partner\'s home is the farm');
  check(HOME('thorne') === null && HOME('thorne', { ld_enclave: 1 }) === 'home_shelter.thorne' && HOME('thorne', { ld_enclave: 1, ld_rehoused: 1 }) === 'home_thornes.thorne', 'the Thornes: the enclave shelter, then a house up top');
  check(HOME('wick') === null && HOME('hana') === null, 'nobody is home before they are on the deck');
}
// ---------------------------------------------------------------- expressions (2026-11-20)
{
  const X = await import('../js/farm/expressions.js'); const { readFileSync, existsSync } = await import('node:fs');
  const tagged = story.taggedLines();
  check(tagged.length >= 60, `a good number of lines carry an expression (${tagged.length})`);
  for (const l of tagged) check(X.known(l.ex), `expression "${l.ex}" is a known one (${l.who}: ${l.text.slice(0, 40)})`);
  for (const l of tagged) check(l.who === 'sato' || !!NPCS[l.who], `${l.who} is somebody who can wear a face`);
  for (const ex of X.EXPRESSIONS) check(ex === 'neutral' || (X.CLOSEST[ex] || []).every(X.known), `${ex}: its nearest faces are known`);
  check(X.portraitFile({ yui: { neutral: 'n.webp', joyful: 'j.webp' } }, 'yui', 'happy') === 'j.webp' && X.portraitFile({ yui: { neutral: 'n.webp' } }, 'yui', 'shy') === 'n.webp' && X.portraitFile({}, 'yui', 'shy') === null && X.portraitFile({ moth: { sad: 's.webp' } }, 'moth', 'tearful') === 's.webp', 'missing faces fall back: nearest, then neutral, then none (the front picture)');
  check(Object.values(X.GIFT_FACE).every(X.known) && Object.values(story.SCENE_MOOD).every((m) => Object.values(m).every(X.known)), 'gift and scene faces are known ones');
  const idxPath = new URL('../art/farm/people/portraits/index.json', import.meta.url); const IDX = existsSync(idxPath) ? JSON.parse(readFileSync(idxPath, 'utf8')) : null;
  const manifest = JSON.parse(readFileSync(new URL('../art/farm/manifest.json', import.meta.url), 'utf8')), flat = JSON.stringify(manifest);
  for (const id of new Set(tagged.map((l) => l.who))) check(!!X.portraitFile(IDX || {}, id, 'neutral') || flat.includes(`people/${id}_front`) || /^(look|svg):/.test(NPCS[id].portrait || '') || !!NPCS[id].portrait, `${id}: a face to show (a bust, the front picture or the drawn portrait)`);
  if (IDX) for (const [id, o] of Object.entries(IDX)) for (const [ex, f] of Object.entries(o)) { check(X.known(ex), `index.json: ${id} ${ex} is a known expression`); check(existsSync(new URL('../art/farm/people/portraits/' + f, import.meta.url)), `index.json: ${id} ${ex} -> ${f} exists`); }
  else console.log('(no art/farm/people/portraits/index.json yet: the file checks are skipped)');
}
// ---------------------------------------------------------------- Memories (2026-11-21)
{
  const sim = await import('../js/farm/sim.js'); const cat = story.memoryCatalogue(), ids = new Set(cat.map((m) => m.id));
  check(ids.size === cat.length && cat.length >= 80, `every memory has its own id (${cat.length})`);
  for (const m of cat) { check(isText(m.title, 90) && isText(m.hint, 200) && ['story', 'festivals'].concat(Object.keys(NPCS)).includes(m.group) && NPCS[m.who], `${m.id}: a title, a hint, a group and a face`); const L = m.lines(); check(Array.isArray(L) && L.length >= 2 && L.every((l) => l && isText(l.text, 400)), `${m.id}: the lines to replay`); }
  for (const e of EVENTS) { check(ids.has('ev_' + e.id) && sim.memoryOfFlag('ev_' + e.id) === 'ev_' + e.id, `heart event ${e.id} is a memory, kept by its flag`); const m = cat.find((x) => x.id === 'ev_' + e.id); check(m.hint.startsWith(`Reach ${e.hearts} hearts with ${NPCS[e.npc].short || NPCS[e.npc].name}`), `${e.id}: the locked hint reads "${m.hint}"`); }
  for (const e of story.LOWER_SCENES) check(ids.has('ev_' + e.id), `Lower deck scene ${e.id} is a memory`);
  for (const f of FESTIVALS) check(ids.has('fest_' + f.id) && sim.memoryOfFlag(`fest_${f.id}_3`) === 'fest_' + f.id, `festival ${f.id} is a memory, whatever the year`);
  for (const id of ROMANCE.candidates) check(ids.has('confess_' + id) && ids.has('wed_' + id) && sim.memoryOfFlag('partner', id) === 'wed_' + id && sim.memoryOfFlag('confess_' + id) === 'confess_' + id, `${id}: the confession and the wedding are memories`);
  for (const [flag, id] of [['day1', 'day1'], ['ld_visited', 'lower_arrive'], ['ld_vault', 'vault'], ['descended', 'earth_first']]) check(sim.memoryOfFlag(flag) === id && ids.has(id), `${flag} keeps the memory ${id}`);
  check(ids.has('intro') && cat.find((m) => m.id === 'wed_yui').lines().some((l) => l.art === 'wedding'), 'the opening is a memory; the wedding replays with its picture');
  check(cat.find((m) => m.id === 'confess_yui').hint === 'Reach 8 hearts with Yui, see their heart events and do them two favours.', 'a love story\'s hint says what it takes');
}
console.log(`conversations: ${VILLAGERS.map((id) => `${id} ${convs[id].size}`).join(', ')}`);
console.log(`requests: ${questCount}, love stories: ${LOVERS.length}`);
console.log(`events: ${EVENTS.length}, festivals: ${FESTIVALS.length}, intro lines: ${INTRO.length}, help pages: ${HELP.length}, words: about ${totalWords}`);
console.log(failures ? `${failures} of ${checks} checks FAILED` : `farm-story: all ${checks} checks passed`);
process.exit(failures ? 1 : 0);
