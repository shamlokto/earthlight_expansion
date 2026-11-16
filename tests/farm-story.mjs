// The farming game's words (docs/FARM.md section 3.2): cast, schedules, small talk, gifts, heart events,
// festivals, the opening, the radio, signs, the guide, the Memory Room, fishing and the Old World.
//   node tests/farm-story.mjs
import * as story from '../js/farm/story.js';
const { NPCS, whereIs, talkLines, giftLine, giftTier, EVENTS, FESTIVALS, INTRO, DAY1, RADIO, SIGNS, HELP, MUSEUM, FISHING, RUINS } = story;

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
};
const VILLAGERS = Object.keys(CAST).filter((id) => id !== 'sato');
const MAIN = VILLAGERS.filter((id) => id !== 'moraine');
const SPOTS = new Set(('farm.porch farm.bin farm.gate farm.pond farm.field village.square village.memorial village.bridge village.dock ' +
  'village.bench village.storefront village.cafefront village.hallfront village.workshopfront village.ranchyard village.river ' +
  'hill.wreck hill.lake hill.overlook store.counter store.floor ranch.counter workshop.counter workshop.bench ' +
  'cafe.counter cafe.table1 cafe.table2 cafe.table3 hall.desk hall.floor').split(' '));
const STYLES = new Set(['bob', 'short', 'long', 'bald', 'bun', 'bandana', 'cap']);
const MAPS = new Set(['farm', 'village', 'hill', 'store', 'ranch', 'workshop', 'cafe', 'hall']);
const TIERS = new Set(['loved', 'liked', 'neutral', 'disliked']);
const WEATHERS = ['sun', 'rain', 'storm', 'snow'];
const RELICS = ['photo', 'teacup', 'book', 'watch', 'toy', 'medal', 'seedtin', 'musicbox', 'datachip', 'ring'];
const FISH = ['fish_s', 'fish_m', 'fish_l', 'fish_spring', 'fish_summer', 'fish_autumn', 'fish_winter', 'fish_king'];
const CROPS = ['turnip', 'potato', 'cucumber', 'strawberry', 'tomato', 'corn', 'onion', 'pumpkin', 'carrot', 'eggplant', 'sweetpotato', 'spinach', 'moonflower'];
const GIFTABLE = [...CROPS, 'egg', 'milk_s', 'milk_m', 'milk_l', ...FISH, 'herb', 'berry', 'mushroom', 'frostcap',
  'scrap', 'alloy', 'crystal', ...RELICS, 'bread', 'soup', 'pie', 'tea', 'tonic'];
const NEUTRAL = ['weed', 'weeds', 'lumber', 'fodder', 'feed', 'seed_turnip', 'seed_grass', 'seed_moonflower', 'hoe', 'no_such_thing', '', 'toString', '__proto__', 'constructor'];
const FEST = {
  planting: { name: 'Planting Day', season: 0, day: 18, from: 600, to: 900, spot: 'village.square' },
  lantern: { name: 'Lantern Night', season: 1, day: 24, from: 1080, to: 1320, spot: 'village.bridge' },
  harvest: { name: 'Harvest Fair', season: 2, day: 9, from: 600, to: 960, spot: 'village.square' },
  yearsend: { name: "Year's End", season: 3, day: 30, from: 1080, to: 1380, spot: 'village.square' },
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

for (const name of ['NPCS', 'whereIs', 'talkLines', 'giftLine', 'giftTier', 'EVENTS', 'FESTIVALS', 'INTRO', 'DAY1', 'RADIO', 'SIGNS', 'HELP', 'MUSEUM', 'FISHING', 'RUINS']) {
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
    const ctx = { season, day, weekday, minute, weather, festival: null, year };
    const here = {};
    for (const id of VILLAGERS) {
      const spot = where(id, ctx);
      if (!spot) continue;
      seen.add(spot); seenBy[id].add(spot);
      (here[spot] ||= []).push(id);
      if (weather === 'storm') check(spot.startsWith('cafe.'), `storm: ${id} is out at ${spot}`);
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
const CLOSED = { seln: 6, corran: 3, ruess: 2, oduya: -1 };
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
  for (const m of [540, 720, 1010]) check((at('moraine', wd, m) === 'village.dock') === (wd === 5), `Moraine's barge is in on Saturdays only (wd ${wd}, ${m})`);
  for (const m of [480, 1020]) check(at('moraine', wd, m) === null, 'Moraine is away outside 09:00-17:00');
  for (const m of [1020, 1040, 1055]) check(at('maris', wd, m) === 'farm.bin', `Maris is at the bin at five (wd ${wd}, ${m})`);
  check(at('maris', wd, 1060) !== 'farm.bin' && at('maris', wd, 1010) !== 'farm.bin', 'Maris is at the bin only 17:00-17:40');
  // The General.
  for (let m = 360; m <= 1440; m += 10) {
    const g = at('general', wd, m), g2 = at('general', wd, m, { year: 2 });
    if (wd === 5) check((g !== null) === (m >= 600 && m < 1080) && (!g || g.startsWith('village.') || g.startsWith('cafe.')), `the General's Saturday (${m}: ${g})`);
    else if (wd === 6) check((g !== null) === (m >= 660 && m < 960) && (!g || g.startsWith('farm.')), `the General's Sunday (${m}: ${g})`);
    else check(g === null, `the General is in Eden on weekday ${wd} (${m}: ${g})`);
    if (wd === 2) check((g2 !== null) === (m >= 1080 && m < 1260) && (!g2 || g2.startsWith('cafe.')), `the General's Wednesday evening from year 2 (${m}: ${g2})`);
    else check(g2 === g, 'year 2 changes only his Wednesday');
  }
  if (wd < 6) for (const m of [500, 700, 900]) check(at('vashti', wd, m) === 'hill.wreck', `Vashti keeps the lift (wd ${wd}, ${m})`);
}
check(at('vashti', 6, 780) === 'cafe.table3', 'Vashti comes down to the café on Sundays');
check([1, 3, 5].every((wd) => at('vashti', wd, 1140) === 'hill.lake'), 'Vashti is at the lake some evenings');
const satSpots = new Set(); for (let m = 600; m < 1080; m += 10) satSpots.add(at('general', 5, m));
check(satSpots.has('village.memorial') && satSpots.has('village.bridge') && [...satSpots].some((s) => s.startsWith('cafe.')), "the General's Saturday: memorial, bridge, café");
const sunSpots = new Set(); for (let m = 660; m < 960; m += 10) sunSpots.add(at('general', 6, m));
check(['farm.porch', 'farm.pond', 'farm.field'].every((s) => sunSpots.has(s)), "the General's Sunday: porch, field, pond");

// Festival days: everyone near the festival during its hours, no counters all day, Maris not at the bin.
for (const f of FESTIVALS) {
  const near = f.spot === 'village.bridge' ? ['village.bridge', 'village.river', 'village.dock', 'village.bench']
    : ['village.square', 'village.bench', 'village.memorial', 'village.storefront', 'village.cafefront', 'village.hallfront'];
  for (const weather of WEATHERS) for (let minute = 360; minute <= 1440; minute += 10) {
    const ctx = { season: f.season, day: f.day, weekday: weekdayOf(f.season, f.day), minute, weather, festival: f.id, year: 1 };
    for (const id of VILLAGERS) {
      const spot = where(id, ctx);
      check(!spot || !/counter|desk/.test(spot), `${f.id}: ${id} is at ${spot} on a festival day`);
      check(spot !== 'farm.bin', `${f.id}: Maris does not collect`);
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
  const need = id === 'moraine' ? 12 : 25;
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
        const s = where(e.npc, { season, day: dayFor(season, wd), weekday: wd, minute: m, weather: 'sun', festival: null, year: 1 });
        const on = !!s && s.split('.')[0] === e.map;
        any ||= on; all &&= on;
      }
      reachable = e.from !== undefined ? all : any;
    }
  }
  check(reachable, `${e.id}: ${e.npc} is on map '${e.map}' during the event's window`);
}
const byNpc = (id) => EVENTS.filter((e) => e.npc === id).map((e) => e.hearts).sort((a, b) => a - b).join(',');
check(byNpc('general') === '2,4,6,8,10', `the General's five events (${byNpc('general')})`);
for (const id of VILLAGERS) if (id !== 'general') check(byNpc(id) === '3,7', `${id}: events at 3 and 7 hearts (${byNpc(id)})`);
check(EVENTS.length === 5 + 2 * 8, `21 events (${EVENTS.length})`);

check(FESTIVALS.length === 4, 'four festivals');
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
check(new Set(FESTIVALS.map((f) => f.id)).size === 4, 'festival ids are unique');
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
const SIGN_SPOTS = ['farm.gate', 'farm.bin', 'village.square', 'village.memorial', 'village.dock', 'village.storefront', 'village.cafefront',
  'village.hallfront', 'village.workshopfront', 'village.ranchyard', 'hill.wreck', 'hill.lake', 'hill.overlook'];
for (const s of SIGN_SPOTS) { check(isText(SIGNS[s]), `SIGNS['${s}'] (${SIGNS[s]?.length})`); count(SIGNS[s]); }
for (const s of Object.keys(SIGNS)) check(SPOTS.has(s), `sign spot ${s} is a known spot`);
check(/descent/i.test(SIGNS['hill.wreck']) && !/wreck|mine\b/i.test(SIGNS['hill.wreck']), 'the hill sign is the lift pad of the Descent');

check(Array.isArray(HELP) && HELP.length >= 7 && HELP.length <= 9, `HELP has 7-9 pages (${HELP.length})`);
for (const p of HELP) {
  check(isText(p.title, 50), `HELP title ${p.title}`);
  check(typeof p.body === 'string' && p.body.length > 150 && p.body.length <= 700, `HELP '${p.title}': body length ${p.body?.length}`);
  check(!/<[a-z/]/i.test(p.body), `HELP '${p.title}': plain text`);
  count(p.body);
}
const help = HELP.map((p) => p.title + '\n' + p.body).join('\n').toLowerCase();
for (const w of ['w a s d', 'arrow', 'shift', 'space', 'left click', 'mouse wheel', 'tab', 'esc', 'touch', 'stamina', 'shipping bin', 'sickle', 'hoe',
  'starsteel', 'greenhouse', 'chicken', 'cow', 'birthday', 'descent', 'old world', 'hydra', 'memory room', 'float', 'hill lake', 'forage', 'planting day',
  'lantern night', 'harvest fair', "year's end", 'moonflower']) check(help.includes(w), `HELP mentions '${w}'`);
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
check(Object.keys(FISHING.caught).sort().join() === [...FISH].sort().join(), 'FISHING.caught covers exactly the eight fish');
for (const f of FISH) { check(isText(FISHING.caught[f], 110), `FISHING.caught.${f}`); count(FISHING.caught[f]); }
check(/old hollin/i.test(FISHING.caught.fish_king), 'the king of the lake is Old Hollin');

for (const k of ['arrive', 'deeper', 'monster']) {
  check(Array.isArray(RUINS[k]) && RUINS[k].length === 3 && new Set(RUINS[k]).size === 3, `RUINS.${k}: three lines`);
  for (const s of RUINS[k] || []) { check(isText(s, 140), `RUINS.${k}: ${s}`); count(s); }
}
check(Object.keys(RUINS.relic).sort().join() === [...RELICS].sort().join(), 'RUINS.relic covers exactly the ten relics');
for (const r of RELICS) { check(isText(RUINS.relic[r], 140) && !/[.!?]\s+[A-Z]/.test(RUINS.relic[r]), `RUINS.relic.${r}: one sentence`); count(RUINS.relic[r]); }

// ---------------------------------------------------------------- the whole text

// No line anywhere is longer than 220 characters (HELP bodies excepted: they are pages), no emoji, no markup.
const texts = [];
(function walk(v, path) {
  if (typeof v === 'string') texts.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], `${path}.${k}`);
})({ EVENTS, FESTIVALS, INTRO, DAY1, RADIO, SIGNS, MUSEUM, FISHING, RUINS, TALK: story.TALK }, '');
for (const [path, t] of texts) {
  check(t.length <= 220, `${path}: ${t.length} characters`);
  check(!/[\u{1F000}-\u{1FAFF}☀-➿]/u.test(t), `${path}: no emoji`);
  check(!/\b(color|honor|neighbor|gray|favorite|center|theater|plow|realize|apologize)\b/i.test(t), `${path}: British spelling`);
}
const everything = JSON.stringify(story).toLowerCase() + JSON.stringify(Object.keys(CAST).flatMap((id) => [...TIERS].map((t) => giftLine(id, t, true)))).toLowerCase();
check(!/\brom\b/.test(everything), 'nothing refers to a ROM');
check(!/\bmine shaft\b|\bthe mine\b|\bminer\b/.test(everything), 'there is no mine');
for (const id of VILLAGERS) check(!JSON.stringify(story.TALK?.[id] ?? '').includes('"sato"'), `${id}: talk data has no speaker tags`);

console.log(`conversations: ${VILLAGERS.map((id) => `${id} ${convs[id].size}`).join(', ')}`);
console.log(`events: ${EVENTS.length}, festivals: ${FESTIVALS.length}, intro lines: ${INTRO.length}, help pages: ${HELP.length}, words: about ${totalWords}`);
console.log(failures ? `${failures} of ${checks} checks FAILED` : `farm-story: all ${checks} checks passed`);
process.exit(failures ? 1 : 0);
