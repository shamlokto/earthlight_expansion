import * as THREE from 'three';
// Sato's Harvest: the game itself (docs/FARM.md). Glues the rules (sim.js), the words (story.js),
// the maps, the 3D world and the interface: movement, tools, people, shops, sleep, fishing and
// the trips down to the Old World. Needs no ROM.
import * as sim from './sim.js';
import { WILD_TREES } from './data.js';
import { ITEMS, CROPS, RELICS, FRUIT_TREES, ROBOT_JOBS, TREE_DAYS } from './data.js';
import * as story from './story.js';
import { NPCS } from './story.js';
import * as art from './art.js';
import { allMaps, ruinsMap, doorTarget, outsideOf, findSpot, FORAGE_SPOTS, STAR_SPOT_XY, CENTRAL_HOUSES } from './maps.js';
import { World } from './world.js';
import { initMap, toggleMap, isOpen as mapOpen } from './minimap.js';
import { Actor, DIRV } from './actors.js';
import * as ui from './ui.js';
import { sfx, music, musicPlaying, setMood, startMusic, musicVolume, setMusicVolume } from './sfx.js';

const SAVE_KEY = 'earthlight-farm-save-v1';
const $ = (id) => document.getElementById(id);
const MIN_SECONDS = 0.6;                 // one game minute
let S = null, W = null, map = null, me = null, mode = 'title', busy = false;
let npcs = new Map(), beasts = [], bots = [], monsters = [], hydra = null, fishing = null, labels = [];
let clock = 0, lastPlaced = -1, hurtT = 0, doorHold = 0;
const keys = new Set(), stick = { x: 0, y: 0 };
// Small touches to the built figures, on top of the colours in story.js.
const LOOKS = { sato: { top: '#f4eddc', bottom: '#2f4488', eye: '#7a4a22', skin: '#f8dcc4', bib: true, hat: true }, seln: { apron: '#4f8a3a' }, mori: { glasses: true, top: '#f4f6f8' }, yui: { glasses: true }, kestrel: {}, corran: { moustache: '#f2f2f2', age: 'old', bib: true }, marrow: { age: 'old' }, ruess: { age: 'old', glasses: true }, oduya: { bib: true }, vashti: {}, maris: {}, general: {}, moraine: {} };
const lookOf = (id) => ({ ...NPCS[id].look, ...(LOOKS[id] || {}) });
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------- save
function save() { S.player.map = map.id === 'ruins' ? 'hill' : map.id; S.player.x = map.id === 'ruins' ? 27.5 : me.x; S.player.y = map.id === 'ruins' ? 9.5 : me.y; S.player.dir = me.dir; try { localStorage.setItem(SAVE_KEY, sim.saveState(S)); } catch { ui.toast('Could not save in this browser.'); } }
function loadSaved() { try { const t = localStorage.getItem(SAVE_KEY); return t ? sim.loadState(t) : null; } catch { return null; } }

// ---------------------------------------------------------------- context
const festivalToday = () => story.FESTIVALS.find((f) => f.season === S.cal.season && f.day === S.cal.day) || null;
function ctx(extra = {}) { const f = festivalToday(); return { season: S.cal.season, day: S.cal.day, weekday: sim.weekday(S), minute: S.cal.minute, weather: S.weather, festival: f ? f.id : null, year: S.cal.year, flags: S.flags, partner: S.flags.partner || undefined, sweetheart: S.flags.sweet || undefined, ...extra }; }
const isBirthday = (id) => { const b = NPCS[id].birthday; return !!b && b.season === S.cal.season && b.day === S.cal.day; };

// ---------------------------------------------------------------- maps and movement
function dynSolid(tx, ty) {
  if (map.field) { const f = map.field, x = tx - f.x, y = ty - f.y, fd = S.fields[f.id]; if (x >= 0 && y >= 0 && x < fd.w && y < fd.h) { const o = fd.tiles[y * fd.w + x].obj; if (o && o !== 'weed' && o !== 'branch') return true; } }
  if (map.ruins && S.mine) { const x = tx - 1, y = ty - 1; if (x >= 0 && y >= 0 && x < S.mine.w && y < S.mine.h && S.mine.cells[y * S.mine.w + x] === 1) return true; }
  return false;
}
const blocked = (x, y) => map.solid(x, y) || dynSolid(Math.floor(x), Math.floor(y));
function canStand(x, y) {
  const r = 0.26;
  if (blocked(x - r, y - r) || blocked(x + r, y - r) || blocked(x - r, y + r) || blocked(x + r, y + r)) return false;
  for (const n of npcs.values()) if (Math.hypot(n.actor.x - x, n.actor.y - y) < 0.55) return false;
  for (const [px, py, pr, pi] of map.posts || []) if (Math.hypot(px - x, py - y) < pr + 0.22 && !felledAt(pi)) return false;
  for (const o of placedHere()) if (Math.hypot(o.x + 0.5 - x, o.y + 0.5 - y) < 0.62) return false;
  if (map.id === 'farm' && S.flags.feed_mill && map.millAt) { const [mx, my, mw, md] = map.millAt; if (x > mx - 0.2 && x < mx + mw + 0.2 && y > my - 0.2 && y < my + md + 0.1) return false; }
  return true;
}
// Chests, chargers and fruit trees Sato has set down on this map.
const placedHere = () => (S && map && !map.indoor && !map.ruins ? [...(S.chests || []), ...(S.panels || []), ...(S.fruitTrees || [])].filter((o) => o.map === map.id) : []);
// Trees on the farm and the hill can be felled (they come back as stumps first); village trees are the village's.
const felledAt = (pi) => { const p = map.props[pi]; return !!p && (p.kind === 'tree' || p.kind === 'pine') && sim.treeFelled(S, map.id + ':' + pi); };
function plantAhead(kinds) {
  const [dx, dy] = DIRV[me.dir], ax = me.x + dx * 0.9, ay = me.y + dy * 0.9; let best = null, bd = 1.0;
  map.props.forEach((p, pi) => { if (!kinds.includes(p.kind)) return; const d = Math.hypot(p.x + p.w / 2 - ax, p.y + p.d / 2 - ay); if (d < bd) { bd = d; best = { p, pi, key: map.id + ':' + pi }; } });
  return best;
}
function target() { const [dx, dy] = DIRV[me.dir]; return [Math.floor(me.x + dx * 0.85), Math.floor(me.y + dy * 0.85)]; }

async function go(to, { quick = false } = {}) {
  busy = true; if (!quick) await ui.fade(true, 220);
  fishing = null; hydra = null; monsters = []; for (const b of bolts) W.scene.remove(b.m); bolts = []; beasts = []; npcs = new Map(); lastPlaced = -1;
  map = to.map === 'ruins' ? ruinsMap(S.mine) : allMaps()[to.map];
  W.setMap(map, S);
  me = new Actor(W, 'sato', lookOf('sato'), map.ruins ? { pallas: true, tall: 2.5 } : {});
  me.x = to.x ?? map.start[0]; me.y = to.y ?? map.start[1]; me.dir = to.dir ?? 0;
  W.actors.set('sato', me); W.focus.set(me.x, 0.8, me.y);
  W.setTime(S.cal.minute, S.weather, map); setMood({ title: false, season: S.cal.season, night: S.cal.minute > 1170, ruins: !!map.ruins, map: map.id });
  if (map.id === 'barn' || map.id === 'coop') spawnBeasts();
  if (map.id === 'hill') drawForage();
  if (map.ruins) drawRuins();
  if (map.id === 'coop') drawEggs();
  drawPlaced(); spawnBots();
  placeNpcs(true); refreshHud();
  if (!quick) await ui.fade(false, 220);
  busy = false;
  await checkEvents();
}
function refreshHud() { const q = S.flags.quest; ui.hud(S, { place: map ? map.name : '', quest: q && NPCS[q.npc] && ITEMS[q.item] ? { who: NPCS[q.npc].short || NPCS[q.npc].name, text: `${q.n} × ${ITEMS[q.item].name}  (you have ${sim.countItem(S, q.item)})` } : null }); const s = sim.selected(S); if (me && !map.ruins) me.setTool(s && ITEMS[s.id].kind === 'tool' ? s.id : null); }
function refreshChanged(fieldId, changed) { const fd = S.fields[fieldId]; for (const c of changed || []) W.refreshTile(fieldId, c.y * fd.w + c.x); }

// ---------------------------------------------------------------- people
function placeNpcs(force) {
  const slot = Math.floor(S.cal.minute / 10); if (!force && slot === lastPlaced) return; lastPlaced = slot;
  if (map.ruins) return;
  const c = ctx(), used = {};
  for (const id of Object.keys(NPCS)) {
    if (id === 'sato') continue;
    const w = story.whereIs(id, c), at = w && findSpot(w.spot), have = npcs.get(id);
    if (!at || at.map !== map.id) { if (have) { have.actor.dispose(); W.actors.delete(id); npcs.delete(id); } continue; }
    const k = used[w.spot] = (used[w.spot] || 0) + 1, off = k === 1 ? [0, 0] : [Math.cos(k * 2.2) * 1.1, Math.sin(k * 2.2) * 0.9 + 0.3];
    let x = at.x + off[0], y = at.y + off[1]; if (map.solid(x, y)) { x = at.x; y = at.y; }
    if (have && have.spot === w.spot) continue;
    if (have) { have.actor.dispose(); W.actors.delete(id); }
    if (Math.hypot(x - me.x, y - me.y) < 0.7) y += 0.9;
    const a = new Actor(W, id, lookOf(id), { tall: id === 'corran' || id === 'general' ? 1.62 : 1.5 }); a.x = x; a.y = y; a.dir = 0;
    W.actors.set(id, a); npcs.set(id, { actor: a, spot: w.spot });
  }
}
function nearestNpc(maxD) { let best = null, bd = maxD; for (const [id, n] of npcs) { const d = Math.hypot(n.actor.x - me.x, n.actor.y - me.y); if (d < bd) { bd = d; best = id; } } return best; }
const shopOf = (id) => { const n = npcs.get(id), s = NPCS[id].shop; if (!n || !s) return null; return n.spot === s + '.counter' || (id === 'moraine' && (n.spot === 'central.dock' || n.spot === 'central.exchange')) ? s : null; };

async function talkTo(id) {
  const n = npcs.get(id); n.actor.face(me.x, me.y); me.face(n.actor.x, n.actor.y); mode = 'talk';
  const sh = shopOf(id), desk = id === 'marrow' && n.spot === 'hall.desk';
  let what = 0;
  if (sh || desk) { const opts = ['Talk']; if (sh) opts.push('Buy'); if (desk) opts.push('Give a find to the Memory Room'); opts.push('Leave'); const i = await ui.choose(NPCS[id].name, opts); what = opts[i] === 'Talk' ? 0 : opts[i] === 'Buy' ? 1 : opts[i] === 'Leave' ? 3 : 2; }
  if (what === 0) {
    const rec = S.npc[id] || {}, met = !!rec.met;
    const lines = story.talkLines(id, ctx({ hearts: sim.hearts(S, id), met, isBirthday: isBirthday(id) }));
    const r = sim.talk(S, id); if (S.npc[id]) S.npc[id].met = true;
    await ui.say(lines.map((t) => ({ who: id, text: t })));
    if (r.first) floatText(n.actor.x, n.actor.y, '♥');
    await favour(id, r.first);
    await maybeConfess(id);
  } else if (what === 1) { await ui.shop(S, sh, id, refreshHud); }
  else if (what === 2) await donate();
  mode = 'play'; goals(); refreshHud();
}
// Favours: now and then someone asks Sato for something. Bringing it is worth more than a gift.
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
async function favour(id, firstToday) {
  const Q = (story.QUESTS || {})[id] || [], q = S.flags.quest;
  if (q && q.npc === id) {
    const def = Q.find((x) => x.id === q.id) || q;
    if (sim.countItem(S, q.item) < q.n) { await ui.say([{ who: id, text: `(${NPCS[id].short || NPCS[id].name} is still hoping for ${q.n} × ${ITEMS[q.item].name}.)` }]); return; }
    const i = await ui.choose(`Give ${q.n} × ${ITEMS[q.item].name}?`, ['Hand it over', 'Not yet']); if (i !== 0) return;
    sim.removeItem(S, q.item, q.n); sim.addLove(S, id, 6); const pay = Math.round((ITEMS[q.item].sell || 40) * q.n * 1.5); S.player.money += pay;
    sim.setFlag(S, 'quest', null); sim.setFlag(S, 'favours_' + id, (S.flags['favours_' + id] || 0) + 1); sim.setFlag(S, 'favours', (S.flags.favours || 0) + 1); sim.setFlag(S, 'qdone_' + q.id, sim.absDay(S));
    sfx('good'); floatText(me.x, me.y, '♥♥'); await ui.say([{ who: id, text: def.thanks || 'Thank you. Truly.' }]);
    if (id === 'mori' && (S.flags.favours_mori || 0) >= 5) await plumGift('mori'); ui.toast(`Favour done for ${NPCS[id].short || NPCS[id].name}  (+${pay} cr)`, 3600); refreshHud(); return;
  }
  if (q || !firstToday || !Q.length || hash(id + ':' + sim.absDay(S)) % 3 !== 0) return;
  const h = sim.hearts(S, id), open = Q.filter((x) => (x.season == null || x.season === S.cal.season) && (x.minHearts || 0) <= h && ITEMS[x.item] && (S.flags['qdone_' + x.id] == null || sim.absDay(S) - S.flags['qdone_' + x.id] > 20));
  if (!open.length) return;
  const pickQ = open[hash(id + '/' + sim.absDay(S)) % open.length];
  await ui.say([{ who: id, text: pickQ.ask }]);
  const i = await ui.choose(`${NPCS[id].short || NPCS[id].name} would like ${pickQ.n} × ${ITEMS[pickQ.item].name}.`, ['I will bring it', 'Not this time']);
  if (i === 0) { sim.setFlag(S, 'quest', { npc: id, id: pickQ.id, item: pickQ.item, n: pickQ.n, day: sim.absDay(S) }); ui.toast('Favour noted. Bring it when you can.', 3200); refreshHud(); }
}
// Love: at eight hearts a friendship can become more; the Earthlight pendant at ten asks the question.
const LOVE = () => story.ROMANCE || { candidates: [], people: {} };
async function maybeConfess(id) {
  const R = LOVE(), who = R.people[id];
  if (!who || !R.candidates.includes(id) || S.flags.partner || sim.hearts(S, id) < 8) return;
  if (S.flags.sweet === id) return;
  const declined = S.flags['declined_' + id];
  if (!S.flags['confess_' + id]) {                  // the story: once, after their last heart event and two favours
    if (story.EVENTS.some((e) => e.npc === id && e.hearts < 8 && !S.flags['ev_' + e.id]) || (S.flags['favours_' + id] || 0) < 2) return;
    sim.setFlag(S, 'confess_' + id); await ui.say(who.confess); floatText(me.x, me.y, '♥♥');
  } else if (declined == null || sim.absDay(S) - declined < 7) return;   // asked again a week after a 'not yet'
  // The choice is Sato's: become sweethearts now, or not yet.
  mode = 'talk'; const other = S.flags.sweet && S.flags.sweet !== id ? S.flags.sweet : null, nm = NPCS[id].short || NPCS[id].name;
  const opts = other ? [`Yes, and say goodbye to ${NPCS[other].short || NPCS[other].name}`, 'Not yet'] : ['Yes, I would like that', 'Not yet'];
  const pick = await ui.choose(`Will you be ${nm}'s sweetheart?`, opts); mode = 'play';
  if (pick !== 0) { sim.setFlag(S, 'declined_' + id, sim.absDay(S)); await ui.say([{ who: 'sato', text: 'Not yet. Ask me again, if you still want to.' }]); return; }
  sim.setFlag(S, 'sweet', id); sim.setFlag(S, 'declined_' + id, null); sfx('good');
  await ui.say([{ who: id, text: other ? `Then it's settled. I hope ${NPCS[other].short || NPCS[other].name} understands.` : `Then it's settled, Sato. Come and have tea with me sometime.` }]);
  ui.toast(`${nm} is your sweetheart now.`, 4200);
}
async function offerPendant(id) {
  const R = LOVE(), who = R.people[id], n = npcs.get(id); n.actor.face(me.x, me.y); mode = 'talk';
  if (!who || S.flags.sweet !== id || sim.hearts(S, id) < 10) { await ui.say([{ who: id, text: (who && who.decline) || 'That is a beautiful thing. Keep it for the right day.' }]); mode = 'play'; return; }
  sim.removeItem(S, 'pendant', 1); sim.setFlag(S, 'partner', id); sfx('good');
  await ui.say(who.propose);
  await ui.fade(true, 500); ui.scene('wedding'); setMood({ festival: 'wedding' }); await ui.fade(false, 500);
  await ui.say(who.wedding); setMood({ festival: null }); for (const k of Object.keys(NPCS)) if (k !== 'sato') sim.addLove(S, k, 2);
  ui.toast(`${NPCS[id].short || NPCS[id].name} shares the farm with you now.`, 5200);
  mode = 'play'; placeNpcs(true); refreshHud(); save();
}
async function donate() {
  const s = sim.selected(S);
  if (!s || ITEMS[s.id].kind !== 'relic') { await ui.say([{ who: 'marrow', text: story.MUSEUM.intro }]); ui.museum(S, RELICS.map((r) => ({ id: r.id, text: story.RUINS.relic[r.id] }))); return; }
  const id = s.id, r = sim.donate(S, S.player.sel);
  if (!r.ok) return ui.toast(r.msg);
  await ui.say([{ who: 'marrow', text: r.first ? (story.MUSEUM.thanks[id] || story.MUSEUM.repeat) : story.MUSEUM.repeat }]);
  if (r.first) { sim.addLove(S, 'marrow', 3); ui.toast(r.msg); sfx('good'); }
  if (sim.museumCount(S) >= RELICS.length && !S.flags.museumDone) { sim.setFlag(S, 'museumDone'); ui.scene('hall_memory'); await ui.say(story.MUSEUM.complete); for (const k of Object.keys(NPCS)) if (k !== 'sato') sim.addLove(S, k, 3); }
}
async function giveTo(id) {
  if (sim.selected(S).id === 'pendant') return offerPendant(id);
  const s = sim.selected(S), tier = story.giftTier(id, s.id), bd = isBirthday(id), n = npcs.get(id);
  const r = sim.gift(S, id, S.player.sel, tier, bd);
  if (!r.ok) return ui.toast(r.msg);
  n.actor.face(me.x, me.y); mode = 'talk'; if (S.npc[id]) S.npc[id].met = true;
  sfx(tier === 'disliked' ? 'bad' : 'good'); floatText(n.actor.x, n.actor.y, tier === 'disliked' ? '…' : tier === 'loved' ? '♥♥' : '♥');
  await ui.say([{ who: id, text: story.giftLine(id, tier, bd) }]);
  mode = 'play'; refreshHud();
}
function reward(r, npc) {
  if (!r) return;
  if (r.love && npc) sim.addLove(S, npc, r.love);
  if (r.loveAll) for (const k of Object.keys(NPCS)) if (k !== 'sato') sim.addLove(S, k, r.loveAll);
  if (r.money) { S.player.money += r.money; ui.toast(`+${r.money} cr`); }
  if (r.item) { const a = sim.addItem(S, r.item[0], r.item[1] || 1); ui.toast(a.ok ? `Received: ${ITEMS[r.item[0]].name}${r.item[1] > 1 ? ' × ' + r.item[1] : ''}` : 'Your rucksack was full.'); }
}
async function checkEvents() {
  if (mode !== 'play' || busy || !map || map.ruins) return;
  const c = ctx();
  if (!S.flags.day1 && map.id === 'farm') { sim.setFlag(S, 'day1'); mode = 'talk'; if (S.npc.marrow) S.npc.marrow.met = true; await ui.say(story.DAY1); mode = 'play'; return; }
  const f = festivalToday();
  if (f) {
    const at = findSpot(f.spot), key = `fest_${f.id}_${S.cal.year}`;
    if (at && at.map === map.id && c.minute >= f.from && c.minute <= f.to && !S.flags[key]) {
      sim.setFlag(S, key); mode = 'talk'; ui.scene('festival_' + (f.id === 'yearsend' ? 'yearend' : f.id)); sfx('good'); setMood({ festival: f.id });
      await ui.say(f.lines); setMood({ festival: null }); reward(f.reward); if (f.id === 'harvest' || f.id === 'lantern') await plumGift(f.id); sim.tick(S, 120); for (const k of Object.keys(NPCS)) if (k !== 'sato' && S.npc[k]) S.npc[k].met = true;
      mode = 'play'; placeNpcs(true); refreshHud(); return;
    }
  }
  for (const e of story.EVENTS) {
    if (S.flags['ev_' + e.id] || e.map !== map.id || !npcs.has(e.npc) || sim.hearts(S, e.npc) < e.hearts) continue;
    if ((e.from != null && c.minute < e.from) || (e.to != null && c.minute > e.to) || (e.season != null && e.season !== c.season) || (e.weekday != null && e.weekday !== c.weekday)) continue;
    sim.setFlag(S, 'ev_' + e.id); mode = 'talk'; const n = npcs.get(e.npc); n.actor.face(me.x, me.y);
    if (e.id === 'general10') ui.scene('heart10');
    await ui.say(e.lines); reward(e.reward, e.npc); sfx('good'); if (e.id === 'seln7' || e.id === 'marrow7') await plumGift(e.id);
    mode = 'play'; refreshHud(); return;
  }
}

// ---------------------------------------------------------------- animals, forage, eggs
function spawnBeasts() {
  const kind = map.id === 'barn' ? 'cow' : 'chicken', pen = map.pen;
  S.animals.forEach((a, i) => { if (a.kind !== kind) return; const o = W.place('beast' + i, kind, pen[0] + 1 + Math.random() * (pen[2] - pen[0] - 1), pen[1] + 1 + Math.random() * (pen[3] - pen[1] - 1)); beasts.push({ i, o, tx: o.position.x, ty: o.position.z, wait: Math.random() * 3 }); });
}
function nearestBeast(maxD) { let best = null, bd = maxD; for (const b of beasts) { const d = Math.hypot(b.o.position.x - me.x, b.o.position.z - me.y); if (d < bd) { bd = d; best = b; } } return best; }
function drawEggs() { for (let i = 0; i < 6; i++) W.unplace('egg' + i); for (let i = 0; i < Math.min(6, S.eggs || 0); i++) W.place('egg' + i, null, 1.3 + (i % 3) * 0.9, 0.5 + Math.floor(i / 3) * 0.3, { procKind: 'egg', h0: 0.55 }); }
const FORAGE_COLOR = { herb: 0x6fbf5a, berry: 0xc23a6a, mushroom: 0xb0825a, frostcap: 0xbfe0f5, bamboo_shoot: 0xc9d27a, wild_mint: 0x58c08a, fiddlehead: 0x7a9a3a, wild_grape: 0x5a2f7a, honeycomb: 0xf0b32a, chestnut: 0x7a4a2a, wild_apple: 0xd8a03a, matsutake: 0xe8d8b8, pine_nut: 0xa07a4a, winter_root: 0xefe2c8 };

// ---------------------------------------------------------------- chests, chargers, fruit trees, robots (2026-11-18)
function drawPlaced() {
  if (!map || !W) return;
  for (const k of [...W.tileObjs.keys()]) if (/^(chest|charger|ftree)\d/.test(k)) W.unplace(k);
  if (map.indoor || map.ruins) return;
  W.unplace('mill'); for (let k = 0; k < 8; k++) W.unplace('hydro' + k);
  if (map.id === 'farm' && S.flags.feed_mill && map.millAt) { const [mx, my, mw, md] = map.millAt; W.place('mill', 'feed_mill', mx + mw / 2, my + md / 2, { rot: 0 }); }
  if (map.id === 'village') for (const h of S.hydro || []) { const t = map.props.find((p) => p.act === 'hydro' && p.tower === h.tower); if (!t) continue; const g = W.place('hydro' + h.tower, null, t.x + 0.5, t.y + 0.5, { h0: 2.15 }); g.add(W.proc('starglow')); g.children[0].scale.setScalar(0.6); g.children[0].children.forEach((q) => { if (q.material) q.material = q.material.clone(), q.material.color && q.material.color.set(0x7dffb0); }); if (h.crop) { const c = W.makeCrop(h.crop, h.tower); c.scale.setScalar(0.7); c.position.y = 0.05; g.add(c); } }
  S.chests.forEach((c, i) => { if (c.map === map.id) W.place('chest' + i, 'field_chest', c.x + 0.5, c.y + 0.5); });
  S.panels.forEach((p, i) => { if (p.map === map.id) W.place('charger' + i, 'charger', p.x + 0.5, p.y + 0.5, { procKind: 'charge_lights', slots: p.slots }); });
  S.fruitTrees.forEach((t, i) => {
    if (t.map !== map.id) return; const st = sim.treeStage(S, t);
    W.place('ftree' + i, st === 0 ? 'sapling' : st === 1 ? 'fruit_tree_young' : 'fruit_tree', t.x + 0.5, t.y + 0.5, { model: st === 0 ? 'sapling' : 'fruit_tree_' + t.kind, stage: st, tree: t.kind, fruit: sim.fruitReady(S, t), rot: i * 1.3 });
  });
}
const BOT_LOOK = [{ color: 0xf2efe6, trim: 0x5fb3b0 }, { color: 0xfde6c8, trim: 0xe07a5f }, { color: 0xe3ecf7, trim: 0x7a8fd8 }];
const botHome = (r, i) => (r.job === 'rest' || r.charge <= 0 ? [10.5 + i * 1.2, 7.4] : r.job === 'animals' ? [16 + i, 7.6] : [5 + i * 5 + Math.random() * 3, 12 + Math.random() * 14]);
function spawnBots() {
  bots = []; if (!map || map.id !== 'farm') return;
  (S.robots || []).forEach((r, i) => { const [x, y] = botHome(r, i), o = W.place('bot' + i, 'farm_bot', x, y, BOT_LOOK[i % 3]); bots.push({ i, o, tx: x, ty: y, wait: Math.random() * 2, talk: 0 }); });
}
function botsTick(dt) {
  for (const b of bots) {
    const r = S.robots[b.i]; if (!r) continue; b.wait -= dt;
    if (b.talk > 0) { b.talk -= dt; continue; }
    if (b.wait <= 0) { const [x, y] = botHome(r, b.i); b.tx = x + (Math.random() - 0.5) * 3; b.ty = y + (Math.random() - 0.5) * 2; b.wait = 2.5 + Math.random() * 5; }
    const dx = b.tx - b.o.position.x, dy = b.ty - b.o.position.z, d = Math.hypot(dx, dy), sp = r.charge > 0 ? 0.9 : 0;
    if (d > 0.1 && sp) { b.o.position.x += dx / d * dt * sp; b.o.position.z += dy / d * dt * sp; b.o.rotation.y = Math.atan2(dx, dy); }
    b.o.position.y = sp && d > 0.1 ? Math.abs(Math.sin(performance.now() / 120 + b.i)) * 0.04 : 0;
  }
}
function nearestBot(maxD) { let best = null, bd = maxD; for (const b of bots) { const d = Math.hypot(b.o.position.x - me.x, b.o.position.z - me.y); if (d < bd) { bd = d; best = b; } } return best; }
async function talkBot(b) {
  const r = S.robots[b.i]; if (!r) return; mode = 'talk'; b.talk = 6;
  b.o.rotation.y = Math.atan2(me.x - b.o.position.x, me.y - b.o.position.z); me.face(b.o.position.x, b.o.position.z);
  const mood = sim.robotMood(S, b.i); bubble(b.o, mood); sfx('pick');
  const jobs = Object.keys(ROBOT_JOBS), opts = jobs.map((j) => `${r.job === j ? '✓ ' : ''}Job: ${ROBOT_JOBS[j]}`);
  if (sim.countItem(S, 'battery_full')) opts.push('Give a charged battery'); opts.push('Rename', 'Leave');
  const i = await ui.choose(`${r.name} · Field-unit, skill ${sim.robotLevel(r)} · battery ${r.charge}% · “${mood}”`, opts);
  if (i < jobs.length) { const q = sim.setRobotJob(S, b.i, jobs[i]); ui.toast(q.msg); bubble(b.o, jobs[i] === 'rest' ? 'Zzz… thank you!' : `${ROBOT_JOBS[jobs[i]]}! Beep beep!`); b.wait = 0; }
  else if (opts[i] === 'Give a charged battery') { const q = sim.chargeRobot(S, b.i); ui.toast(q.msg); if (q.ok) { sfx('good'); bubble(b.o, 'Bzzt! ♥'); } }
  else if (opts[i] === 'Rename') { const n = prompt(`A new name for ${r.name}:`, r.name); if (n != null) { const q = sim.renameRobot(S, b.i, n); ui.toast(q.msg); if (q.ok) bubble(b.o, `I am ${S.robots[b.i].name}!`); } }
  mode = 'play'; refreshHud();
}
// What grows, stands or waits on the tile Sato faces (outdoors): chest, charger, fruit tree.
function placedProbe(tx, ty) {
  if (map.indoor || map.ruins) return null;
  const ci = sim.chestAt(S, map.id, tx, ty); if (ci >= 0) return { label: 'Open the field chest', run: () => ui.boxWindow(S, 'chest:' + ci, refreshHud, 'Field chest') };
  const pi = sim.panelAt(S, map.id, tx, ty);
  if (pi >= 0) { const sl = S.panels[pi].slots, full = sl.filter((x) => x === 'battery_full').length, emp = sl.filter((x) => x === 'battery').length; return { label: full ? 'Take the charged batteries' : sim.countItem(S, 'battery') && emp + full < 2 ? 'Put an empty battery in the charger' : `Solar charger (${emp ? emp + ' charging' : 'empty'})`, run: () => { const r = sim.useCharger(S, pi); ui.toast(r.msg); if (r.ok) sfx('drop'); drawPlaced(); refreshHud(); } }; }
  const fi = sim.fruitTreeAt(S, map.id, tx, ty);
  if (fi >= 0) {
    const t = S.fruitTrees[fi], def = FRUIT_TREES[t.kind], st = sim.treeStage(S, t);
    if (sim.fruitReady(S, t)) return { label: `Pick the ${ITEMS[def.fruit].name.toLowerCase()}`, run: () => { const r = sim.pickFruit(S, fi); if (r.ok) { sfx('pick'); pickedToast(r); drawPlaced(); } else ui.toast(r.msg); refreshHud(); } };
    return { label: `Look at the ${st === 2 ? def.name.toLowerCase() : 'young ' + def.name.toLowerCase()}`, run: () => ui.toast(st < 2 ? `A young ${def.name.toLowerCase()}, ${TREE_DAYS - sim.treeAge(S, t)} days from bearing fruit.` : sim.pickFruit(S, fi).msg || 'A fine tree.') };
  }
  return null;
}
function pickedToast(r) { for (const g of r.gained || []) ui.toast(`+${g.n} ${ITEMS[g.id].name}${r.basket ? `  → basket (${sim.basketTotal(S)}/${sim.BASKET_CAP})` : ''}`); if (r.msg && !r.basket && /basket/.test(r.msg)) ui.toast(r.msg); }
// Free ground to set something down on: outdoors, not the field, not a doorway, nothing there.
function groundWhy(tx, ty, kinds) {
  if (map.indoor || map.ruins) return 'Set it down outdoors.';
  if (fieldAt(tx, ty) || pastureAt(tx, ty)) return 'Not on the field. Find a patch of grass.';
  if (!kinds.includes(map.at(tx, ty))) return kinds.length === 1 ? 'Saplings need open grass.' : 'There is no room there.';
  if (map.solid(tx, ty) || dynSolid(tx, ty) || propAt(tx, ty) || map.postNear(tx + 0.5, ty + 0.5, 0.45) || placedHere().some((o) => Math.hypot(o.x - tx, o.y - ty) < 1)) return 'Something is in the way.';
  if (map.doors.some((d) => Math.abs(d.x - tx) <= 1 && Math.abs(d.y - ty) <= 1) || map.exits.some((e) => tx >= e.x0 - 1 && tx <= e.x1 + 1 && ty >= e.y0 - 1 && ty <= e.y1 + 1)) return 'Keep the way clear.';
  if (map.id === 'hill' && FORAGE_SPOTS.some(([x, y]) => x === tx && y === ty)) return 'Something wild grows there.';
  if (Math.floor(me.x) === tx && Math.floor(me.y) === ty) return 'Step back a little first.';
  return null;
}
function setDown(it, tx, ty) {
  const sap = it.kind === 'sapling', why = groundWhy(tx, ty, sap ? ['g'] : ['g', 'p', 's', 'd', 'o']);
  if (why) return ui.toast(why);
  const r = sap ? sim.plantTree(S, map.id, tx, ty) : sim.placeItem(S, map.id, tx, ty);
  ui.toast(r.msg); if (r.ok) { sfx('drop'); W.puff(tx + 0.5, ty + 0.5, sap ? 0x8a6a45 : 0xc9c2b0, 8, 0.2); drawPlaced(); }
  refreshHud();
}
async function soakOnsen() {
  if (!sim.onsenOpen(S)) return ui.toast('The onsen takes its last bathers at eleven.');
  const free = sim.satoBirthday(S);
  mode = 'talk'; const i = await ui.choose(`The Terrace Onsen · ${free ? 'free today (happy birthday!)' : sim.ONSEN_PRICE + ' cr'}`, ['Soak for an hour', 'Not now']); mode = 'play';
  if (i !== 0) return;
  const r = sim.soak(S); if (!r.ok) return ui.toast(r.msg);
  busy = true; await ui.fade(true, 600); W.setTime(S.cal.minute, S.weather, map); placeNpcs(true); await new Promise((q) => setTimeout(q, 350)); await ui.fade(false, 600); busy = false;
  sfx('good'); floatText(me.x, me.y, '♨'); ui.toast(r.msg, 4200); refreshHud();
}
const spotXY = (spot) => (spot === sim.STAR_SPOT ? STAR_SPOT_XY : FORAGE_SPOTS[spot] || [0, 0]);
function drawForage() { for (let i = 0; i < FORAGE_SPOTS.length; i++) W.unplace('forage' + i); W.unplace('forage' + sim.STAR_SPOT); for (const f of S.forage || []) { const [x, y] = spotXY(f.spot); if (f.id === 'star_plum') { W.place('forage' + f.spot, 'starglow', x + 0.5, y + 0.5); continue; } const p = art.pic('icons/' + f.id); if (p) { const g = W.place('forage' + f.spot, null, x + 0.5, y + 0.5); g.add(W.billboard(p, ITEMS[f.id].sell >= 300 ? 0.7 : 0.58, {})); } else W.place('forage' + f.spot, null, x + 0.5, y + 0.5, { procKind: 'forage', color: FORAGE_COLOR[f.id] }); } }


// ---------------------------------------------------------------- star-plums, the lift, the Main deck, the towers (2026-11-18)
async function plumGift(src) {
  const r = sim.grantPlum(S, src, { storage: true }); if (!r.ok) return;
  const lines = story.STAR_PLUM[src]; if (Array.isArray(lines)) { mode = 'talk'; await ui.say(lines); mode = 'play'; }
  sfx('good'); ui.celebrate(`★ A star-plum! ${sim.countItem(S, 'star_plum') ? 'It is in your rucksack.' : 'It went to the storage box at home.'} Eat it to raise your max stamina for good.`); refreshHud();
}
async function rideLift(down) {
  mode = 'talk'; const i = await ui.choose(down ? 'The spoke lift: down to the Main deck (20 minutes)' : 'The spoke lift: up to the Lantern Ring (20 minutes)', [down ? 'Ride down to Eden Central' : 'Ride up to Willowfall', 'Not now']); mode = 'play';
  if (i !== 0) return;
  sfx('door'); sim.tick(S, 20);
  await go(down ? { map: 'central', x: 34.5, y: 50.5, dir: 1 } : { map: 'village', x: 56.5, y: 13.7, dir: 0 });
  ui.toast(down ? story.CENTRAL.down : story.CENTRAL.up, 4200);
}
async function stargaze() {
  const r = sim.stargaze(S); if (!r.ok) return ui.toast(r.msg);
  const W2 = story.WATCH; busy = true; await ui.fade(true, 500); busy = false; mode = 'talk';
  const lines = [...(r.first ? W2.plaque : []), ...W2.season[S.cal.season].map((t) => ({ who: 'narrator', text: t })), ...(r.general ? W2.general : []), ...(r.again ? [{ who: 'narrator', text: W2.again }] : [])];
  ui.fade(false, 500); await ui.say(lines); mode = 'play';
  if (r.restored) { sfx('good'); ui.toast(`The quiet does you good. +${r.restored} stamina.`); } refreshHud();
}
function hydroProbe(p) {
  const k = sim.hydroAt(S, p.tower), h = k >= 0 ? S.hydro[k] : null, s = sim.selected(S);
  if (!h) return { label: `Hydroponic tower ${p.tower + 1}`, run: () => ui.toast('Rent this tower from Seln\'s store (600 cr for the season).') };
  if (h.crop && sim.cropStage(h.crop) === 3) return { label: `Harvest the ${CROPS[h.crop.id].name.toLowerCase()}`, run: () => { const r = sim.hydroHarvest(S, p.tower); if (r.ok) { sfx('pick'); pickedToast(r); drawPlaced(); } else ui.toast(r.msg); refreshHud(); } };
  if (!h.crop && s && ITEMS[s.id].kind === 'seed' && ITEMS[s.id].crop) return { label: `Plant ${ITEMS[s.id].name.toLowerCase()} in tower ${p.tower + 1}`, run: () => { const r = sim.hydroPlant(S, p.tower); ui.toast(r.msg); if (r.ok) { sfx('drop'); drawPlaced(); } refreshHud(); } };
  return { label: `Your tower ${p.tower + 1}`, run: () => ui.toast(h.crop ? `${CROPS[h.crop.id].name}: ${Math.max(0, CROPS[h.crop.id].days - h.crop.age)} more day(s). The mist does the watering.` : 'Your tower is empty. Hold a seed bag and press E to plant it.') };
}

// ---------------------------------------------------------------- the Old World
// The fight below is pest control, not war: creatures telegraph every attack, the Pallas aims for you,
// and the worst a hit does is cost a little stamina. Space fires, F sets the Hydra, Shift boosts.
let bolts = [], dashT = 0, dashCd = 0, fireCd = 0, hydraCd = 0;
function hpBar(mon) {
  const g = new THREE.Group(), w = 0.7;
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.09), new THREE.MeshBasicMaterial({ color: 0x1a1410, transparent: true, opacity: 0.7, depthTest: false }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.09), new THREE.MeshBasicMaterial({ color: 0x7dffb0, depthTest: false }));
  fg.geometry.translate(w / 2, 0, 0); fg.position.x = -w / 2; fg.position.z = 0.001; bg.renderOrder = fg.renderOrder = 9;
  g.add(bg, fg); g.position.y = mon.kind === 'drone' ? 1.55 : mon.big ? 1.25 : 0.95; g.visible = false; mon.o.add(g); W.facers.push(g); mon.bar = fg; mon.barG = g;
}
function drawRuins() {
  const m = S.mine; monsters = []; bolts = []; dashT = 0;
  for (let i = 0; i < m.cells.length; i++) { const c = m.cells[i], x = (i % m.w) + 1.5, y = Math.floor(i / m.w) + 1.5; W.unplace('r' + i); if (c === 1) { const g = W.place('r' + i, 'rubble', x, y, { scale: 0.9 + (i % 4) * 0.08 }); if (i === m.star) g.add(W.proc('starglow')); } else if (c === 2) W.place('r' + i, 'stairs', x, y); }
  const depth = m.depth || 1;
  m.monsters.forEach((ref, k) => {
    const big = ref.kind === 'crawler' && depth >= 4 && k % 3 === 0;
    const kind = big && art.hasModel('crawler_big') ? 'crawler_big' : ref.kind;
    const o = W.place('mon' + k + '_' + Math.random(), kind, ref.x + 1.5, ref.y + 1.5, { scale: big && kind === 'crawler' ? 1.5 : 1 });
    const mon = { ref, o, kind: ref.kind, big, x: ref.x + 1.5, y: ref.y + 1.5, hp: ref.hp + (big ? 2 : 0), wob: Math.random() * 6, state: 'wander', t: Math.random() * 2, squash: 0, shotT: 1.5 + Math.random() * 2 };
    mon.max = mon.hp; hpBar(mon); monsters.push(mon);
  });
}
async function descend(depth) {
  const first = !S.flags.descended; sim.setFlag(S, 'descended');
  sim.enterMine(S, depth);
  if (first) { mode = 'talk'; ui.scene('descent'); await ui.say(story.RUINS.arrive.map((t) => ({ who: 'narrator', text: t }))); mode = 'play'; }
  await go({ map: 'ruins' });
  ui.toast(first ? 'Space fires the Pallas (up close it swings the beam sabre). F sets down the Hydra. Shift boosts. E searches rubble.' : pick(depth > 1 ? story.RUINS.deeper : story.RUINS.arrive), 5200);
}
function popMonster(mon) {
  const i = S.mine.monsters.indexOf(mon.ref); const r = i >= 0 ? sim.defeatMonster(S, i) : { gained: [] };
  W.puff(mon.x, mon.y, 0xffb347, 18, 0.5); W.puff(mon.x, mon.y, 0x7dffb0, 8, 0.8); W.shake = Math.max(W.shake || 0, 0.12);
  const k = W.facers.indexOf(mon.barG); if (k >= 0) W.facers.splice(k, 1);
  W.dyn.remove(mon.o); W.unface(mon.o); monsters.splice(monsters.indexOf(mon), 1); sfx('pop'); floatText(mon.x, mon.y, pick(['pop!', 'poof', 'shoo!']));
  ui.gainedToast(r.gained); if (Math.random() < 0.35) ui.toast(pick(story.RUINS.monster));
  if (!monsters.length) ui.toast('All quiet on this level.', 2200);
  refreshHud();
}
function hurtMonster(mon, dmg, fromX, fromY) {
  mon.hp -= dmg; mon.squash = 1;
  const d = Math.hypot(mon.x - fromX, mon.y - fromY) || 1, kx = (mon.x - fromX) / d * 0.5, ky = (mon.y - fromY) / d * 0.5;
  if (!blocked(mon.x + kx, mon.y)) mon.x += kx; if (!blocked(mon.x, mon.y + ky)) mon.y += ky;
  if (mon.state === 'windup' || mon.state === 'lunge') { mon.state = 'stun'; mon.t = 0.6; }
  mon.barG.visible = true; mon.bar.scale.x = Math.max(0.001, mon.hp / mon.max);
  W.puff(mon.x, mon.y, 0xfff2b8, 6, 0.45); sfx('zap');
  if (mon.hp <= 0) popMonster(mon);
}
function spawnBolt(x, y, dx, dy, from) {
  const l = Math.hypot(dx, dy) || 1, color = from === 'pallas' ? 0x7dffb0 : from === 'hydra' ? 0xffb347 : 0xff6a5a;
  const m = new THREE.Mesh(new THREE.SphereGeometry(from === 'enemy' ? 0.13 : 0.09, 8, 6), new THREE.MeshBasicMaterial({ color }));
  m.add(new THREE.Mesh(new THREE.SphereGeometry(from === 'enemy' ? 0.26 : 0.2, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })));
  m.position.set(x, from === 'pallas' ? 1.6 : from === 'hydra' ? 0.7 : 0.9, y); W.scene.add(m);
  const speed = from === 'enemy' ? 4.2 : 14;
  bolts.push({ m, x, y, vx: dx / l * speed, vy: dy / l * speed, from, life: from === 'enemy' ? 3 : 1.1 });
}
// The beam sabre: when a creature is close in front, Space swings instead of firing (2 damage, a wide arc).
let slashCd = 0;
function pallasSlash() {
  const [dx, dy] = DIRV[me.dir]; let hit = 0;
  for (const mon of [...monsters]) { const ex = mon.x - me.x, ey = mon.y - me.y, d = Math.hypot(ex, ey); if (d < 1.9 && (ex * dx + ey * dy) / (d || 1) > -0.1) { hurtMonster(mon, 2, me.x, me.y); hit++; } }
  slashCd = 0.42; fireCd = 0.3; me.swing = 1.4; sfx('chop');
  const arc = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.55, 24, 1, -1.2, 2.4), new THREE.MeshBasicMaterial({ color: 0x8ff4ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  arc.rotation.x = -Math.PI / 2; arc.rotation.z = Math.atan2(-dy, dx); arc.position.set(me.x, 1.1, me.y); W.scene.add(arc); bolts.push({ m: arc, x: me.x, y: me.y, vx: 0, vy: 0, from: 'fx', life: 0.18 });
  if (hit > 1) floatText(me.x, me.y, 'double!');
}
function pallasFire() {
  if (slashCd <= 0) { const [dx, dy] = DIRV[me.dir]; if (monsters.some((m) => { const ex = m.x - me.x, ey = m.y - me.y, d = Math.hypot(ex, ey); return d < 1.7 && (ex * dx + ey * dy) / (d || 1) > 0.2; })) return pallasSlash(); }
  if (fireCd > 0) return; fireCd = 0.26;
  let [dx, dy] = DIRV[me.dir], best = null, bs = 0.5;                       // gentle aim: the nearest creature in a wide cone ahead
  for (const mon of monsters) { const ex = mon.x - me.x, ey = mon.y - me.y, d = Math.hypot(ex, ey); if (d > 9 || !d) continue; const c = (ex * dx + ey * dy) / d, sc = c - d * 0.03; if (c > 0.55 && sc > bs) { bs = sc; best = mon; } }
  if (best) { dx = best.x - me.x; dy = best.y - me.y; me.face(best.x, best.y); }
  spawnBolt(me.x + dx * 0.1, me.y + dy * 0.1, dx, dy, 'pallas'); me.swing = 1; sfx('zap');
}
function placeHydra() {
  if (hydraCd > 0) return ui.toast('The Hydra is still unfolding.', 900);
  hydraCd = 2.5; if (hydra) W.unplace('hydra');
  const [dx, dy] = DIRV[me.dir]; let x = me.x + dx * 0.9, y = me.y + dy * 0.9; if (blocked(x, y)) { x = me.x; y = me.y; }
  hydra = { x, y, o: W.place('hydra', 'hydra', x, y), cd: 0.6 }; W.puff(x, y, 0xc9c2b0, 8, 0.2); sfx('drop'); ui.toast('Hydra set.', 900);
}
function satoHit(fromX, fromY) {
  if (hurtT > 0 || dashT > 0) return false;
  hurtT = 1.4; const r = sim.monsterHit(S); ui.toast(r.msg); W.shake = 0.2; sfx('bad');
  const d = Math.hypot(me.x - fromX, me.y - fromY) || 1; for (let k = 0; k < 6; k++) { const nx = me.x + (me.x - fromX) / d * 0.12, ny = me.y + (me.y - fromY) / d * 0.12; if (canStand(nx, ny)) { me.x = nx; me.y = ny; } }
  refreshHud(); return true;
}
function pallasDash() { if (dashCd > 0) return; dashCd = 0.9; dashT = 0.2; W.puff(me.x, me.y, 0x9fd8ee, 10, 0.3); sfx('zap'); }
function ruinsTick(dt) {
  hurtT -= dt; fireCd -= dt; slashCd -= dt; hydraCd -= dt; dashCd -= dt; dashT -= dt;
  if (me.group) me.group.visible = !(hurtT > 0 && Math.floor(hurtT * 12) % 2);
  for (const mon of [...monsters]) {
    const ex = me.x - mon.x, ey = me.y - mon.y, d = Math.hypot(ex, ey) || 0.01; mon.wob += dt; mon.t -= dt;
    let sp = 0, tx = 0, ty = 0;
    if (mon.kind === 'drone') {                                            // drones keep their distance and lob slow orbs
      if (d < 7) { const want = d < 3 ? -1 : d > 4.5 ? 1 : 0; tx = ex / d * want + Math.cos(mon.wob) * 0.6; ty = ey / d * want + Math.sin(mon.wob * 1.3) * 0.6; sp = 1.3; mon.shotT -= dt; if (mon.shotT <= 0) { mon.shotT = 2.4 + Math.random(); spawnBolt(mon.x, mon.y, ex, ey, 'enemy'); floatText(mon.x, mon.y, '!'); } }
      else { tx = Math.cos(mon.wob * 0.5); ty = Math.sin(mon.wob * 0.6); sp = 0.4; }
    } else if (mon.state === 'wander') { tx = Math.cos(mon.wob * 0.7); ty = Math.sin(mon.wob * 0.9); sp = 0.45; if (d < 6) { mon.state = 'chase'; floatText(mon.x, mon.y, '!'); } }
    else if (mon.state === 'chase') { tx = ex / d; ty = ey / d; sp = mon.big ? 1.0 : 1.45; if (d < 1.7) { mon.state = 'windup'; mon.t = mon.big ? 0.7 : 0.5; mon.lx = ex / d; mon.ly = ey / d; } if (d > 9) mon.state = 'wander'; }
    else if (mon.state === 'windup') { if (mon.t <= 0) { mon.state = 'lunge'; mon.t = 0.28; } }
    else if (mon.state === 'lunge') { tx = mon.lx; ty = mon.ly; sp = mon.big ? 5 : 6.5; if (d < 0.75) { satoHit(mon.x, mon.y); mon.state = 'rest'; mon.t = 0.9; } else if (mon.t <= 0) { mon.state = 'rest'; mon.t = 0.8; } }
    else if (mon.t <= 0) mon.state = 'chase';                              // rest or stun
    if (sp) { const nx = mon.x + tx * sp * dt, ny = mon.y + ty * sp * dt; if (!blocked(nx, mon.y)) mon.x = nx; if (!blocked(mon.x, ny)) mon.y = ny; if (mon.o.userData.is3d && (tx || ty)) mon.o.rotation.y = Math.atan2(tx, ty); }
    mon.squash = Math.max(0, mon.squash - dt * 5); const q = 1 + Math.sin(mon.squash * 9) * mon.squash * 0.25;
    mon.o.scale.set(q, 1 / q, q);
    mon.o.position.set(mon.x, mon.state === 'windup' ? Math.abs(Math.sin(mon.t * 40)) * 0.06 : 0, mon.y);
  }
  if (hydra) {                                                              // the Hydra: a short-range auto-turret
    hydra.cd -= dt;
    let best = null, bd = 6.5; for (const mon of monsters) { const d = Math.hypot(hydra.x - mon.x, hydra.y - mon.y); if (d < bd) { bd = d; best = mon; } }
    if (best) { hydra.o.rotation.y = Math.atan2(best.x - hydra.x, best.y - hydra.y); if (hydra.cd <= 0) { hydra.cd = 0.55; spawnBolt(hydra.x, hydra.y, best.x - hydra.x, best.y - hydra.y, 'hydra'); } }
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i]; if (b.from === 'fx') { b.life -= dt; b.m.material.opacity = Math.max(0, b.life * 5); if (b.life <= 0) { W.scene.remove(b.m); bolts.splice(i, 1); } continue; }
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.m.position.x = b.x; b.m.position.z = b.y;
    let dead = b.life <= 0 || map.solid(b.x, b.y);
    if (!dead && b.from !== 'enemy') for (const mon of monsters) if (Math.hypot(mon.x - b.x, mon.y - b.y) < (mon.big ? 0.65 : 0.5)) { hurtMonster(mon, 1, b.x - b.vx * 0.05, b.y - b.vy * 0.05); dead = true; break; }
    if (!dead && b.from === 'enemy' && Math.hypot(me.x - b.x, me.y - b.y) < 0.55) { satoHit(b.x - b.vx, b.y - b.vy); dead = true; }
    if (dead) { W.scene.remove(b.m); if (b.life > 0) W.puff(b.x, b.y, b.from === 'enemy' ? 0xff6a5a : 0xfff2b8, 4, 0.6); bolts.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- what E and Space would do here
function propAt(tx, ty) { return map.props.find((p) => p.act && tx >= Math.floor(p.x) && tx < Math.floor(p.x) + p.w && ty >= Math.floor(p.y) && ty < Math.floor(p.y) + p.d); }
function fieldAt(tx, ty) { const f = map.field; if (!f) return null; const x = tx - f.x, y = ty - f.y, fd = S.fields[f.id]; return x >= 0 && y >= 0 && x < fd.w && y < fd.h ? { f, x, y, tile: fd.tiles[y * fd.w + x] } : null; }
function pastureAt(tx, ty) { const P = map.pasture; if (!P) return null; const x = tx - P.x, y = ty - P.y; return x >= 0 && y >= 0 && x < P.w && y < P.h ? { x, y } : null; }
const waterAt = (tx, ty) => map.at(tx, ty) === 'w';

function probe() {                                   // → { label, run } for E
  const [tx, ty] = target();
  if (map.ruins) {
    const cx = tx - 1, cy = ty - 1, m = S.mine, c = cx >= 0 && cy >= 0 && cx < m.w && cy < m.h ? m.cells[cy * m.w + cx] : 0;
    if (c === 1) return { label: 'Search the rubble', run: () => search(cx, cy) };
    if (c === 2) return { label: 'Go deeper', run: () => descend((m.depth || 1) + 1) };
    const p = propAt(tx, ty) || propAt(Math.floor(me.x), Math.floor(me.y)); if (p && p.act === 'liftup') return { label: 'Ride the lift home', run: leaveRuins };
    return null;
  }
  const near = nearestNpc(1.5);
  if (near) return { label: `Talk to ${S.npc[near] && S.npc[near].met ? NPCS[near].short || NPCS[near].name : 'the stranger'}`, run: () => talkTo(near) };
  const nb = nearestBot(1.4);
  if (nb && S.robots[nb.i]) { const r = S.robots[nb.i], held = sim.selected(S); if (held && held.id === 'battery_full') return { label: `Give ${r.name} a charged battery`, run: () => { const q = sim.chargeRobot(S, nb.i); ui.toast(q.msg); if (q.ok) { sfx('good'); bubble(nb.o, 'Bzzt! ♥'); } refreshHud(); } }; return { label: `Talk to ${r.name} (battery ${r.charge}%)`, run: () => talkBot(nb) }; }
  const pl = placedProbe(tx, ty); if (pl) return pl;
  if (map.id === 'farm' && S.flags.feed_mill && map.millAt) { const [mx, my, mw, md] = map.millAt; if (tx >= mx && tx < mx + mw && ty >= my && ty < my + md) return { label: `Put crops in the feed mill (${sim.millCount(S)}/${sim.MILL_DAY})`, run: () => ui.siloWindow(S, refreshHud) }; }
  const p = propAt(tx, ty);
  if (p) {
    if (p.act === 'counter' && p.shop) return { label: 'Use the Grand Market terminal', run: () => ui.marketWindow(S, refreshHud) };
    if (p.act === 'hydro') return hydroProbe(p);
    if (p.act === 'counter') { const k = nearestNpc(3.2); if (k) return { label: `Talk to ${NPCS[k].short || NPCS[k].name}`, run: () => talkTo(k) }; if (map.id === 'hall') return { label: 'Nobody is at the desk', run: () => ui.toast('Nobody is at the desk just now.') }; return { label: 'Nobody is at the counter', run: () => ui.toast('Nobody is here to serve just now.') }; }
    const L = { liftdown: 'Ride the lift down to the Main deck', liftup: 'Ride the lift up to Willowfall', gallery: 'Sit and look out of the great window', house: 'Try the door', silo: 'Open the silo', solaryard: 'Use the solar yard terminal', stargaze: 'Stargaze in the dome', onsen: 'Soak in the onsen', bin: sim.basketHeld(S) ? `Tip the basket into the bin (${sim.basketTotal(S)})` : 'Put the held item in the shipping bin', well: 'Fill the watering can', sign: 'Read', bed: 'Go to bed', radio: 'Watch the colony forecast', feedcow: 'Fill the troughs', feedhen: 'Fill the feeder', eggs: 'Collect the eggs', lift: 'Ride the Descent', museum: 'Look at the Memory Room', books: 'Read a book', storage: 'Open the storage box', fridge: 'Open the fridge', kitchen: 'Cook something', calendar: 'Read the noticeboard' }[p.act];
    return { label: L, run: () => act(p) };
  }
  const fa = fieldAt(tx, ty) || fieldAt(Math.floor(me.x), Math.floor(me.y));
  if (fa && fa.tile.crop && !fa.tile.crop.dead && sim.cropStage(fa.tile.crop) === 3) return { label: `Harvest the ${CROPS[fa.tile.crop.id].name.toLowerCase()}${sim.basketHeld(S) ? ' into the basket' : ''}`, run: () => { const r = sim.harvest(S, fa.f.id, fa.x, fa.y); if (r.ok) { sfx('pick'); pickedToast(r); refreshChanged(fa.f.id, [{ x: fa.x, y: fa.y }]); goals(); } else ui.toast(r.msg); refreshHud(); } };
  const wild = !map.indoor && plantAhead(['tree']);
  if (wild && wild.p.fruit && !felledAt(wild.pi) && sim.wildReady(S, wild.key, wild.p.fruit, !!map.wildShared)) return { label: `Pick ${ITEMS[WILD_TREES[wild.p.fruit].fruit].name.toLowerCase()}`, run: () => { const r = sim.pickWild(S, wild.key, wild.p.fruit, !!map.wildShared); if (r.ok) { sfx('pick'); ui.gainedToast(r.gained); const f = wild.p.obj && wild.p.obj.userData.fruits; if (f) f.visible = false; } else ui.toast(r.msg); refreshHud(); } };
  const bush = !map.indoor && plantAhead(['bush']); if (bush && sim.bushReady(S, bush.key)) return { label: 'Pick berries', run: () => { const r = sim.pickBush(S, bush.key); if (r.ok) { sfx('pick'); pickedToast(r); } else ui.toast(r.msg); refreshHud(); } };
  const b = nearestBeast(1.4); if (b) return { label: `Pet ${S.animals[b.i].name}`, run: () => { const r = sim.petAnimal(S, b.i); ui.toast(r.msg || `${S.animals[b.i].name} seems pleased.`); floatText(b.o.position.x, b.o.position.z, '♥'); } };
  if (map.id === 'hill') for (const f of S.forage || []) { const [x, y] = spotXY(f.spot); if (Math.hypot(x + 0.5 - me.x, y + 0.5 - me.y) < 1.2) return { label: `Pick the ${ITEMS[f.id].name.toLowerCase()}`, run: () => { const r = sim.pickForage(S, f.spot); if (r.ok) { sfx('pick'); pickedToast(r); drawForage(); } else ui.toast(r.msg); refreshHud(); } }; }
  const d = map.doors.find((q) => q.x === Math.floor(me.x) && q.y === Math.floor(me.y)); if (d) return { label: 'Go in', run: () => enterDoor(d) };
  return null;
}
function enterDoor(d) {
  if (d.lock && !S.flags[d.lock]) return ui.toast('The old greenhouse is a wreck of broken frames. Prof. Ruess could repair it.');
  sfx('door'); go(doorTarget(d.to.map));
}
async function act(p) {
  const s = sim.selected(S);
  switch (p.act) {
    case 'onsen': await soakOnsen(); break;
    case 'liftdown': case 'liftup': await rideLift(p.act === 'liftdown'); break;
    case 'gallery': { const r = sim.gallerySit(S); mode = 'talk'; const G = story.CENTRAL; await ui.say([{ who: 'narrator', text: r.night ? G.gallery[sim.absDay(S) % G.gallery.length] : G.galleryDay }]); mode = 'play'; if (r.restored) { sfx('good'); ui.toast(`You sit a while. +${r.restored} stamina.`); } break; }
    case 'house': ui.say([{ who: 'narrator', text: CENTRAL_HOUSES[p.house] || 'The door is locked.' }]); break;
    case 'stargaze': await stargaze(); break;
    case 'silo': ui.siloWindow(S, refreshHud); break;
    case 'solaryard': { const r = sim.yardDeposit(S); ui.toast(r.msg); if (r.ok) sfx('drop'); break; }
    case 'bin': { if (s && s.id === 'basket') { const r = sim.shipBasket(S); ui.toast(r.msg); if (r.ok) sfx('drop'); goals(); break; } if (!s) return ui.toast('Hold something to ship it. Maris collects at five.'); const r = sim.ship(S, S.player.sel); ui.toast(r.msg || (r.ok ? 'In the bin.' : 'That cannot be shipped.')); if (r.ok) sfx('drop'); goals(); break; }
    case 'well': { const r = sim.refillCan(S); ui.toast(r.msg || 'The watering can is full.'); if (r.ok) sfx('water'); break; }
    case 'sign': ui.say([{ who: 'narrator', text: story.SIGNS[p.sign] || '…' }]); break;
    case 'storage': ui.boxWindow(S, 'storage', refreshHud, 'Storage box'); break;
    case 'fridge': if (!S.flags.kitchen) ui.say([{ who: 'narrator', text: 'An old cold-locker from a ship, standing in the corner unplugged. Prof. Ruess could connect it with a kitchen refit.' }]); else ui.boxWindow(S, 'fridge', refreshHud, 'The fridge'); break;
    case 'kitchen': if (!S.flags.kitchen) ui.say([{ who: 'narrator', text: 'A cold stove and a dry sink. Prof. Ruess at the Workshop can refit the kitchen.' }]); else ui.kitchenWindow(S, (r) => { if (r && r.ok) sfx('good'); refreshHud(); }); break;
    case 'calendar': { const f = story.FESTIVALS.filter((x) => x.season === S.cal.season && x.day >= S.cal.day); const bd = Object.values(NPCS).filter((n) => n.id !== 'sato' && n.birthday && n.birthday.season === S.cal.season && n.birthday.day >= S.cal.day && S.npc[n.id] && S.npc[n.id].met); ui.say([{ who: 'narrator', text: `The noticeboard. ${f.length ? 'Coming up: ' + f.map((x) => `${x.name} on day ${x.day}`).join(', ') + '.' : 'No more festivals this season.'} ${bd.length ? 'Birthdays: ' + bd.map((n) => `${n.short || n.name} on day ${n.birthday.day}`).join(', ') + '.' : ''}` }]); break; }
    case 'radio': { const l = story.RADIO[S.weatherTomorrow] || story.RADIO.sun; ui.say([{ who: 'narrator', text: 'The radio crackles. ' + (Array.isArray(l) ? l[(S.cal.day + S.cal.season) % l.length] : l) }]); break; }
    case 'bed': { mode = 'talk'; const i = await ui.choose('The bed', ['Sleep until morning', 'Save the game', 'Not yet']); mode = 'play'; if (i === 0) await night(false); else if (i === 1) { save(); ui.toast('Saved.'); } break; }
    case 'feedcow': case 'feedhen': { const r = sim.feedAll(S, p.act === 'feedcow' ? 'cow' : 'chicken'); ui.toast(r.msg || (r.ok ? 'Fed.' : 'Nothing to feed.')); if (r.ok) sfx('drop'); break; }
    case 'eggs': { const r = sim.collectEggs(S); if (r.ok) { sfx('pick'); ui.gainedToast(r.gained); } else ui.toast(r.msg || 'No eggs today.'); drawEggs(); break; }
    case 'books': { const h = pick(story.HELP); ui.say([{ who: 'narrator', text: `Sato takes down a book: “${h.title}”.` }, { who: 'narrator', text: h.body.split('\n').slice(0, 3).join(' ') }]); break; }
    case 'museum': ui.museum(S, RELICS.map((r) => ({ id: r.id, text: story.RUINS.relic[r.id] }))); break;
    case 'lift': {
      const deep = (S.stats && S.stats.deepest) || 0, opts = ['Level 1'], lv = [1]; for (let d = 5; d <= deep; d += 5) { opts.push('Level ' + d); lv.push(d); } opts.push('Stay up here');
      mode = 'talk'; const i = await ui.choose('The Descent: Sato climbs into her Pallas.', opts); mode = 'play'; if (i < lv.length) await descend(lv[i]); break;
    }
  }
  refreshHud();
}
function search(cx, cy) {
  const r = sim.hitRock(S, cx, cy); if (!r.ok) { ui.toast(r.msg); return; }
  const i = cy * S.mine.w + cx; W.unplace('r' + i); W.puff(cx + 1.5, cy + 1.5, 0x9a958c, 10, 0.3); sfx('dig'); me.swing = 1;
  if (S.mine.cells[i] === 2) { W.place('r' + i, 'stairs', cx + 1.5, cy + 1.5); ui.toast('A way down!'); sfx('good'); } else W.place('r' + i, 'rubble_done', cx + 1.5, cy + 1.5);
  if (r.star) { sfx('good'); ui.celebrate(r.msg); }
  for (const g of r.gained || []) { ui.toast(`+${g.n} ${ITEMS[g.id].name}`); if (ITEMS[g.id].kind === 'relic') { sfx('good'); ui.toast(story.RUINS.relic[g.id] || '', 5200); } }
  if (r.msg && !(r.gained || []).length) ui.toast(r.msg);
  refreshHud(); if (r.fainted) night(true);
}
async function leaveRuins() { sim.leaveMine(S); sfx('door'); await go({ map: 'hill', x: 27.5, y: 9.6, dir: 0 }); }

function use() {                                     // Space: the held tool or item
  if (fishing) return pullLine();
  if (map.ruins) return pallasFire();
  const s = sim.selected(S); if (!s) return; const it = ITEMS[s.id], [tx, ty] = target();
  const near = nearestNpc(1.5); if (near && it.kind !== 'tool' && it.kind !== 'seed') return giveTo(near);
  if (it.kind === 'placeable' || it.kind === 'sapling') return setDown(it, tx, ty);
  if (s.id === 'axe' && !map.indoor && !map.ruins) {
    if (sim.chestAt(S, map.id, tx, ty) >= 0 || sim.panelAt(S, map.id, tx, ty) >= 0) { me.swing = 1; const r = sim.pickUpPlaced(S, map.id, tx, ty); ui.toast(r.msg); if (r.ok) { sfx('chop'); drawPlaced(); } return refreshHud(); }
    const fi = sim.fruitTreeAt(S, map.id, tx, ty); if (fi >= 0) { me.swing = 1; const r = sim.removeTree(S, fi); ui.toast(r.msg); if (r.ok) { sfx('chop'); W.puff(tx + 0.5, ty + 0.5, 0x6fbf5a, 10, 0.6); drawPlaced(); } return refreshHud(); }
  }
  if (it.kind === 'food' || (it.stamina && it.kind !== 'tool')) { if (it.kind === 'food' || it.maxUp) { const r = sim.eat(S, S.player.sel); if (r.celebrate) { sfx('good'); ui.celebrate(r.msg); floatText(me.x, me.y, '★'); } else ui.toast(r.msg || 'That was good.'); if (r.ok) sfx('pick'); refreshHud(); } return; }
  if (it.kind !== 'tool' && it.kind !== 'seed') return;
  me.swing = 1;
  if (s.id === 'can' && (waterAt(tx, ty) || (propAt(tx, ty) || {}).act === 'well')) { const r = sim.refillCan(S); ui.toast(r.msg || 'Filled.'); if (r.ok) sfx('water'); return refreshHud(); }
  if (s.id === 'rod') { if (waterAt(tx, ty)) return cast(tx, ty); return ui.toast('Face the water to cast.'); }
  if (s.id === 'milker' || s.id === 'brush') { const b = nearestBeast(1.6); if (!b || S.animals[b.i].kind !== 'cow') return ui.toast('Stand beside a cow.'); const r = s.id === 'milker' ? sim.milk(S, b.i) : sim.brush(S, b.i); ui.toast(r.msg || (r.ok ? 'Done.' : '')); ui.gainedToast(r.gained); if (r.ok) { sfx('pick'); floatText(b.o.position.x, b.o.position.z, '♥'); } return refreshHud(); }
  if (s.id === 'axe' && !map.indoor) { const t = plantAhead(['tree', 'pine']); if (t && !felledAt(t.pi)) {
    if (map.id === 'village') return ui.toast('These trees belong to Willowfall. Try the ones on your farm or the hill.');
    const r = sim.chopTree(S, t.key); if (!r.ok) return ui.toast(r.msg);
    W.puff(t.p.x + 0.5, t.p.y + 0.5, 0xc9a877, 7, 0.8); W.shake = 0.05; sfx('chop'); if (t.p.obj) { t.p.obj.rotation.z = 0.06; setTimeout(() => { if (t.p.obj) t.p.obj.rotation.z = 0; }, 120); }
    if (r.felled) { ui.toast(r.msg, 3200); ui.gainedToast(r.gained); const old = t.p.obj, st = W.makeProp('stump', {}); if (old) { st.position.copy(old.position); W.root.remove(old); const k = W.tallProps.indexOf(old); if (k >= 0) W.tallProps.splice(k, 1); } W.root.add(st); t.p.obj = st; W.puff(t.p.x + 0.5, t.p.y + 0.5, 0x6fbf5a, 16, 1.6); } else if (r.left) floatText(t.p.x + 0.5, t.p.y + 0.5, String(r.left));
    refreshHud(); if (r.fainted) night(true); return; } }
  const fa = fieldAt(tx, ty), pa = !fa && pastureAt(tx, ty);
  if (!fa && !pa) return;
  const r = fa ? sim.useTool(S, fa.f.id, fa.x, fa.y, me.dir) : sim.usePasture(S, pa.x, pa.y, me.dir);
  if (r.ok) {
    if (fa) refreshChanged(fa.f.id, r.changed); else for (const c of r.changed || []) W.refreshPasture(c.y * map.pasture.w + c.x);
    const colr = { till: 0x8a6a45, water: 0x7fc4ff, cut: 0x6fbf5a, smash: 0x9a958c, chop: 0xc9a877, sow: 0xe8dcae }[r.fx] || 0xc9a877;
    for (const c of (r.changed || []).slice(0, 9)) W.puff((fa ? fa.f.x : map.pasture.x) + c.x + 0.5, (fa ? fa.f.y : map.pasture.y) + c.y + 0.5, colr, 5);
    sfx(r.fx || 'till'); ui.gainedToast(r.gained); goals(); me.play(r.fx === 'water' ? 'water' : 'hoe');
  } else if (r.msg) ui.toast(r.msg);
  refreshHud(); if (r.fainted) night(true);
}

// ---------------------------------------------------------------- fishing
function cast(tx, ty) { fishing = { phase: 'wait', t: 1.6 + Math.random() * 4.5, x: tx + 0.5, y: ty + 0.5 }; fishing.o = W.place('float', null, fishing.x, fishing.y, { procKind: 'float', h0: -0.08 }); me.play('fish', 30); sfx('water'); ui.toast('Line out. Wait for the float to dip…', 1800); }
function endFishing() { if (fishing) { W.unplace('float'); fishing = null; if (me) me.act = null; } }
function pullLine() {
  if (fishing.phase !== 'bite') { endFishing(); return ui.toast('Too soon. The line comes back empty.'); }
  endFishing(); const r = sim.fish(S, map.water || 'farm');
  if (r.ok && r.gained && r.gained.length) { const id = r.gained[0].id; sfx('good'); ui.toast(`Caught: ${ITEMS[id].name}!`); if (story.FISHING.caught[id]) ui.toast(story.FISHING.caught[id], 4200); goals(); } else ui.toast(r.msg || pick(story.FISHING.miss));
  refreshHud(); if (r.fainted) night(true);
}
function fishTick(dt) {
  fishing.t -= dt;
  if (fishing.phase === 'wait' && fishing.t <= 0) { fishing.phase = 'bite'; fishing.t = 1.0; sfx('bite'); floatText(fishing.x, fishing.y, '!'); ui.toast(pick(story.FISHING.bite), 900); }
  else if (fishing.phase === 'bite') { fishing.o.position.y = -0.2 + Math.sin(performance.now() / 40) * 0.05; if (fishing.t <= 0) { endFishing(); ui.toast(pick(story.FISHING.miss)); } }
  else fishing.o.position.y = -0.08 + Math.sin(performance.now() / 400) * 0.02;
}

// ---------------------------------------------------------------- night
async function night(collapsed) {
  if (busy) return; busy = true; mode = 'talk'; endFishing();
  if (collapsed) ui.toast(S.cal.minute >= 1440 ? 'It is midnight. Sato is asleep on her feet.' : 'Sato has worked herself to a standstill.', 3000);
  await ui.fade(true, 700);
  if (S.mine) sim.leaveMine(S);
  const rep = sim.sleep(S, { collapsed }); sim.claimGoals(S);
  if (S.flags.partner && NPCS[S.flags.partner]) {            // a partner waters some of the field before she wakes
    let k = 0; for (const t of S.fields.farm.tiles) { if (k >= 12) break; if (t.till && t.crop && !t.crop.dead && !t.wet) { t.wet = true; k++; } }
    if (k) (rep.notes ||= []).push(`${NPCS[S.flags.partner].short || NPCS[S.flags.partner].name} watered ${k} plants before you woke.`);
  }
  busy = false; await go({ map: 'house', x: 2.6, y: 2.6, dir: 0 }, { quick: true }); busy = true;
  save(); sfx('morning');
  const f = festivalToday(), SK = ['spring', 'summer', 'autumn', 'winter'];
  const head = rep.newYear ? `A new year on Eden. Year ${S.cal.year} begins.` : rep.seasonChanged ? `${['Spring', 'Summer', 'Autumn', 'Winter'][S.cal.season]} has come to the river chamber.` : collapsed ? 'She wakes in her own bed, with no memory of getting there, and half her strength.' : '';
  if (f) (rep.notes ||= []).push(`${f.name} today. ${f.blurb}`);
  await ui.fade(false, 500);
  await ui.report(S, rep, { head, scene: rep.seasonChanged ? 'season_' + SK[S.cal.season] : !S.flags.sawMorning ? 'morning' : null });
  sim.setFlag(S, 'sawMorning');
  busy = false; mode = 'play'; refreshHud();
}
function goals() { for (const g of sim.claimGoals(S)) { ui.toast(`Done: ${g.title}  (+${g.reward} cr)`, 3600); sfx('good'); } refreshHud(); }

// ---------------------------------------------------------------- floating labels
function floatText(x, y, text) { const e = document.createElement('span'); e.textContent = text; $('labels').appendChild(e); labels.push({ e, x, y, h: 2, life: 1.2 }); }
// A speech bubble that follows a 3D object (a robot) for a few seconds.
function bubble(o, text, life = 3.6) { for (const l of labels) if (l.follow === o) l.life = 0; const e = document.createElement('span'); e.className = 'bubble'; e.textContent = text; $('labels').appendChild(e); labels.push({ e, follow: o, x: o.position.x, y: o.position.z, h: 1.25, life, still: true }); }

// ---------------------------------------------------------------- the frame
let last = 0, promptT = 0, current = null;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  if (!S || !map || !me) return;
  const playing = mode === 'play' && !busy && !ui.talking() && !ui.windowOpen();
  if (playing) {
    // movement, relative to the camera
    let ix = stick.x, iy = stick.y;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
    const len = Math.hypot(ix, iy); me.moving = len > 0.15;
    if (me.moving) {
      if (fishing) endFishing();
      ix /= Math.max(1, len); iy /= Math.max(1, len);
      const c = Math.cos(W.yaw), s = Math.sin(W.yaw), wx = ix * c + iy * s, wy = -ix * s + iy * c;
      const tired = S.player.stamina < 15 ? 0.7 : 1, sp = (map.ruins ? (dashT > 0 ? 13 : 4.6) : keys.has('ShiftLeft') || keys.has('ShiftRight') ? 5.6 : 3.9) * tired * dt;
      me.dir = Math.abs(wx) > Math.abs(wy) ? (wx < 0 ? 2 : 3) : (wy < 0 ? 1 : 0);
      if (canStand(me.x + wx * sp, me.y)) me.x += wx * sp; if (canStand(me.x, me.y + wy * sp)) me.y += wy * sp;
      const tx = Math.floor(me.x), ty = Math.floor(me.y);
      const ex = map.exits.find((e) => tx >= e.x0 && tx <= e.x1 && ty >= e.y0 && ty <= e.y1);
      if (ex) { go(ex.to); return; }
      if (map.indoor && Math.abs(tx - map.exitTile[0]) <= 1 && me.y > map.exitTile[1] + 0.45 && wy > 0.3) { sfx('door'); go(outsideOf(map.id)); return; }
      const d = map.doors.find((q) => q.x === tx && q.y === ty);
      if (d && wy < -0.5 && me.y < d.y + 0.45) { doorHold += dt; if (doorHold > 0.18) { doorHold = 0; enterDoor(d); return; } } else doorHold = 0;
    }
    // the clock
    clock += dt;
    while (clock >= MIN_SECONDS) { clock -= MIN_SECONDS; const r = sim.tick(S, 1); if (S.cal.minute % 10 === 0) { refreshHud(); placeNpcs(); W.setTime(S.cal.minute, S.weather, map); setMood({ night: S.cal.minute > 1170 }); checkEvents(); } if (r.collapsed) { night(true); break; } }
    if (map.ruins) ruinsTick(dt);
    if (fishing) fishTick(dt);
    botsTick(dt);
    for (const b of beasts) { b.wait -= dt; if (b.wait <= 0) { const pen = map.pen; b.tx = pen[0] + 0.6 + Math.random() * (pen[2] - pen[0]); b.ty = pen[1] + 0.6 + Math.random() * (pen[3] - pen[1]); b.wait = 3 + Math.random() * 6; } const dx = b.tx - b.o.position.x, dy = b.ty - b.o.position.z, d = Math.hypot(dx, dy); if (d > 0.1) { b.o.position.x += dx / d * dt * 0.6; b.o.position.z += dy / d * dt * 0.6; if (!W.facers.includes(b.o.children[0])) b.o.rotation.y = Math.atan2(dx, dy); } }
    // prompt and cursor
    if ((promptT -= dt) <= 0) {
      promptT = 0.12; current = probe();
      const s = sim.selected(S), [tx, ty] = target(), it = s && ITEMS[s.id];
      const onField = !map.ruins && (fieldAt(tx, ty) || pastureAt(tx, ty)) && it && (it.kind === 'tool' || it.kind === 'seed');
      W.setCursor(tx, ty, !!onField || (map.ruins && current && current.label.startsWith('Search')));
      ui.prompt(current && current.label ? `<kbd>E</kbd>${current.label}` : '');
    }
  } else { me.moving = false; W.setCursor(0, 0, false); if (mode !== 'play') ui.prompt(''); }
  for (let i = labels.length - 1; i >= 0; i--) { const l = labels[i]; l.life -= dt; if (l.follow) { l.x = l.follow.position.x; l.y = l.follow.position.z; } if (!l.still) l.h += dt * 0.8; const p = W.project(l.x, l.y, l.h); l.e.style.left = p.x + 'px'; l.e.style.top = p.y + 'px'; l.e.style.opacity = Math.min(1, l.life * 2); if (l.life <= 0) { l.e.remove(); labels.splice(i, 1); } }
  W.update(dt, me.x, me.y);
}

// ---------------------------------------------------------------- input
function selectSlot(i) { const n = S.player.slots; S.player.sel = ((i % n) + n) % n; refreshHud(); }
function pressE() { if (ui.advance()) return; if (mode !== 'play' || busy || ui.windowOpen()) return; const p = probe(); if (p) p.run(); }
function pressUse() { if (ui.advance()) return; if (mode !== 'play' || busy || ui.windowOpen()) return; use(); }
function openMenu(tab) { if (mode !== 'play' || busy || ui.talking()) return; ui.menu(S, { change: refreshHud, save: () => { save(); ui.toast('Saved.'); }, export: exportSave, title: () => { save(); location.reload(); }, music: () => ui.toast(music(!musicPlaying()) ? 'Music on.' : 'Music off.'), musicVolume, setMusicVolume }, tab); }
// P or the pause button: the Farm journal (the clock stops while any window is open).
function toggleJournal(tab) { if (ui.journalOpen()) return ui.closeWin(); if (mode !== 'play' || busy || ui.talking() || ui.windowOpen()) return; ui.journal(S, { tab, place: map ? map.name : '', change: refreshHud }); }
function exportSave() { save(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([sim.saveState(S)], { type: 'application/json' })); a.download = `satos-harvest-y${S.cal.year}-${['spring', 'summer', 'autumn', 'winter'][S.cal.season]}${S.cal.day}.json`; a.click(); }
function bindInput() {
  addEventListener('keydown', (e) => {
    if (mode === 'title') return;
    if (e.code === 'Escape') { if (ui.windowOpen()) ui.closeWin(); else openMenu('bag'); return e.preventDefault(); }
    if (e.code === 'Tab') { e.preventDefault(); if (ui.windowOpen()) ui.closeWin(); else openMenu('bag'); return; }
    if (e.code === 'F1') { e.preventDefault(); return openMenu('help'); }
    if (e.repeat) return;
    if (e.code === 'KeyM') { if (mapOpen()) ui.closeWin(); else toggleMap(); return; }
    if (e.code === 'KeyP') return toggleJournal();   // the town map (music: the menu's button)
    if (e.code === 'KeyE' || e.code === 'Enter') return pressE();
    if (e.code === 'Space') { e.preventDefault(); return pressUse(); }
    if (ui.windowOpen() || ui.talking()) return;
    keys.add(e.code);
    if (/^Digit\d$/.test(e.code)) selectSlot(e.code === 'Digit0' ? 9 : +e.code.slice(5) - 1);
    if (e.code === 'KeyR') { const s = sim.selected(S); if (s && (ITEMS[s.id].stamina || ITEMS[s.id].maxUp)) { const r = sim.eat(S, S.player.sel); if (r.celebrate) { sfx('good'); ui.celebrate(r.msg); } else ui.toast(r.msg || 'That was good.'); refreshHud(); } }
    if (map && map.ruins && e.code === 'KeyF') placeHydra();
    if (map && map.ruins && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) pallasDash();
    if (e.code === 'KeyQ') W.yaw -= Math.PI / 4; if (e.code === 'KeyC') W.yaw += Math.PI / 4;
  });
  addEventListener('keyup', (e) => keys.delete(e.code)); addEventListener('blur', () => keys.clear());
  const cv = $('view'); let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true; if (drag.moved) { W.yaw -= dx * 0.006; W.pitch = Math.max(0.1, Math.min(1.25, W.pitch + dy * 0.004)); drag.x = e.clientX; drag.y = e.clientY; } });
  cv.addEventListener('pointerup', (e) => { if (drag && !drag.moved && e.pointerType === 'mouse' && e.button === 0) pressUse(); drag = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (e.ctrlKey || e.shiftKey) W.dist = Math.max(6, Math.min(22, W.dist + Math.sign(e.deltaY))); else if (mode === 'play' && S) selectSlot(S.player.sel + Math.sign(e.deltaY)); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  $('bar').addEventListener('click', (e) => { const b = e.target.closest('[data-slot]'); if (b) selectSlot(+b.dataset.slot); });
  $('bMenu').onclick = () => (ui.windowOpen() ? ui.closeWin() : openMenu('bag')); $('winX').onclick = ui.closeWin;
  $('bPause').onclick = () => toggleJournal(); addEventListener('resize', () => { if (S && mode !== 'title') refreshHud(); });
  $('dialog').addEventListener('click', () => ui.advance()); $('scene').addEventListener('click', () => ui.advance());
  // touch: a stick and two buttons
  if (matchMedia('(pointer: coarse)').matches) {
    $('touch').hidden = false; const st = $('stick'), knob = st.firstElementChild;
    const mv = (e) => { const r = st.getBoundingClientRect(), x = (e.clientX - r.left - 60) / 50, y = (e.clientY - r.top - 60) / 50, l = Math.max(1, Math.hypot(x, y)); stick.x = x / l; stick.y = y / l; knob.style.transform = `translate(${stick.x * 34}px, ${stick.y * 34}px)`; };
    st.addEventListener('pointerdown', (e) => { st.setPointerCapture(e.pointerId); mv(e); }); st.addEventListener('pointermove', (e) => { if (e.buttons || e.pressure) mv(e); });
    const up = () => { stick.x = stick.y = 0; knob.style.transform = ''; }; st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    $('tUse').addEventListener('pointerdown', (e) => { e.preventDefault(); pressUse(); }); $('tAct').addEventListener('pointerdown', (e) => { e.preventDefault(); if (map && map.ruins && mode === 'play' && !ui.talking() && !probe()) placeHydra(); else pressE(); });
  }
}

// ---------------------------------------------------------------- start
async function begin(state, fresh) {
  S = state; $('title').hidden = true; startMusic(); $('hud').hidden = false; mode = 'talk';
  if (fresh) { await ui.fade(true, 400); $('hud').hidden = true; ui.fade(false, 600); await ui.say(story.INTRO); $('hud').hidden = false; }
  mode = 'play';
  const p = S.player, m = allMaps()[p.map] ? p.map : 'farm';
  await go(fresh || p.x == null ? { map: 'farm' } : { map: m, x: p.x, y: p.y, dir: p.dir });
  if (fresh) save();
}
async function boot() {
  const info = await art.loadArt();
  W = new World($('view')); W.isFelled = (key) => !!S && sim.treeFelled(S, key); W.wildFruitShown = (m, p) => !!S && sim.wildReady(S, m.id + ':' + p.index, p.fruit, !!m.wildShared); bindInput();
  initMap({ get: () => ({ S, map, me, npcs, W }), ctx: () => (S ? ctx() : null), openWin: ui.openWindow, closeWin: ui.closeWin, canOpen: () => mode === 'play' && !busy && !ui.talking() && !ui.windowOpen(), toast: ui.toast });
  const tv = art.url('video/title'), tp = art.url('scenes/title');
  $('titleArt').innerHTML = (tp ? `<img src="${tp}" alt="">` : '') + (tv ? `<video src="${tv}" autoplay loop muted playsinline></video>` : '');
  const old = loadSaved();
  if (old) { $('bContinue').hidden = false; $('contInfo').textContent = `Saved: ${sim.dateLabel(old)} · ${old.player.money.toLocaleString()} cr`; }
  $('loadInfo').textContent = info.images || info.models ? '' : 'Running on built-in stand-in graphics (no art pack found).';
  $('bNew').onclick = async () => { if (old && !confirm('Start a new farm? Your saved farm will be replaced.')) return; sfx('good'); begin(sim.newGame(), true); };
  $('bContinue').onclick = () => { sfx('good'); begin(old, false); };
  $('bHelp').onclick = () => { S = S || sim.newGame(); mode = 'play'; ui.menu(S, { close: () => { if ($('title').hidden === false) { mode = 'title'; } } }, 'help'); };
  $('fImport').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const st = sim.loadState(await f.text()); if (!st) return ($('loadInfo').textContent = 'That file is not a Sato’s Harvest save.'); begin(st, false); };
  // The title theme starts with the first click or key press on the title screen (browsers block autoplay).
  setMood({ title: true });
  const firstGesture = () => { removeEventListener('pointerdown', firstGesture, true); removeEventListener('keydown', firstGesture, true); if (mode === 'title') startMusic(); };
  addEventListener('pointerdown', firstGesture, true); addEventListener('keydown', firstGesture, true);
  requestAnimationFrame(frame);
  window.__farm = { get S() { return S; }, get W() { return W; }, get me() { return me; }, get map() { return map; }, go, sim, night, get mode() { return mode; }, ui, drawPlaced, get bots() { return bots; }, probe: () => probe(), use: () => use(), toggleJournal, talkBot };
}
boot();
