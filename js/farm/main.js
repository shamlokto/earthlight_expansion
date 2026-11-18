import * as THREE from 'three';
// Sato's Harvest: the game itself (docs/FARM.md). Glues the rules (sim.js), the words (story.js),
// the maps, the 3D world and the interface: movement, tools, people, shops, sleep, fishing and
// the trips down to the Old World. Needs no ROM.
import * as sim from './sim.js';
import { ITEMS, CROPS, RELICS } from './data.js';
import * as story from './story.js';
import { NPCS } from './story.js';
import * as art from './art.js';
import { allMaps, ruinsMap, doorTarget, outsideOf, findSpot, FORAGE_SPOTS } from './maps.js';
import { World } from './world.js';
import { Actor, DIRV } from './actors.js';
import * as ui from './ui.js';
import { sfx, music, musicPlaying, setMood } from './sfx.js';

const SAVE_KEY = 'earthlight-farm-save-v1';
const $ = (id) => document.getElementById(id);
const MIN_SECONDS = 0.6;                 // one game minute
let S = null, W = null, map = null, me = null, mode = 'title', busy = false;
let npcs = new Map(), beasts = [], monsters = [], hydra = null, fishing = null, labels = [];
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
  return true;
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
  W.setTime(S.cal.minute, S.weather, map); setMood({ season: S.cal.season, night: S.cal.minute > 1170, ruins: !!map.ruins });
  if (map.id === 'barn' || map.id === 'coop') spawnBeasts();
  if (map.id === 'hill') drawForage();
  if (map.ruins) drawRuins();
  if (map.id === 'coop') drawEggs();
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
const shopOf = (id) => { const n = npcs.get(id), s = NPCS[id].shop; if (!n || !s) return null; return n.spot === s + '.counter' || (id === 'moraine' && n.spot === 'village.dock') ? s : null; };

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
    sfx('good'); floatText(me.x, me.y, '♥♥'); await ui.say([{ who: id, text: def.thanks || 'Thank you. Truly.' }]); ui.toast(`Favour done for ${NPCS[id].short || NPCS[id].name}  (+${pay} cr)`, 3600); refreshHud(); return;
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
  if (!who || !R.candidates.includes(id) || S.flags.sweet || S.flags.partner || S.flags['confess_' + id] || sim.hearts(S, id) < 8) return;
  if (story.EVENTS.some((e) => e.npc === id && e.hearts < 8 && !S.flags['ev_' + e.id]) || (S.flags['favours_' + id] || 0) < 2) return;   // love needs their story and a couple of favours first
  sim.setFlag(S, 'confess_' + id); sim.setFlag(S, 'sweet', id); sfx('good');
  await ui.say(who.confess); floatText(me.x, me.y, '♥♥'); ui.toast(`${NPCS[id].short || NPCS[id].name} is your sweetheart now.`, 4200);
}
async function offerPendant(id) {
  const R = LOVE(), who = R.people[id], n = npcs.get(id); n.actor.face(me.x, me.y); mode = 'talk';
  if (!who || S.flags.sweet !== id || sim.hearts(S, id) < 10) { await ui.say([{ who: id, text: (who && who.decline) || 'That is a beautiful thing. Keep it for the right day.' }]); mode = 'play'; return; }
  sim.removeItem(S, 'pendant', 1); sim.setFlag(S, 'partner', id); sfx('good');
  await ui.say(who.propose);
  await ui.fade(true, 500); ui.scene('wedding'); await ui.fade(false, 500);
  await ui.say(who.wedding); for (const k of Object.keys(NPCS)) if (k !== 'sato') sim.addLove(S, k, 2);
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
      sim.setFlag(S, key); mode = 'talk'; ui.scene('festival_' + (f.id === 'yearsend' ? 'yearend' : f.id)); sfx('good');
      await ui.say(f.lines); reward(f.reward); sim.tick(S, 120); for (const k of Object.keys(NPCS)) if (k !== 'sato' && S.npc[k]) S.npc[k].met = true;
      mode = 'play'; placeNpcs(true); refreshHud(); return;
    }
  }
  for (const e of story.EVENTS) {
    if (S.flags['ev_' + e.id] || e.map !== map.id || !npcs.has(e.npc) || sim.hearts(S, e.npc) < e.hearts) continue;
    if ((e.from != null && c.minute < e.from) || (e.to != null && c.minute > e.to) || (e.season != null && e.season !== c.season) || (e.weekday != null && e.weekday !== c.weekday)) continue;
    sim.setFlag(S, 'ev_' + e.id); mode = 'talk'; const n = npcs.get(e.npc); n.actor.face(me.x, me.y);
    if (e.id === 'general10') ui.scene('heart10');
    await ui.say(e.lines); reward(e.reward, e.npc); sfx('good');
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
const FORAGE_COLOR = { herb: 0x6fbf5a, berry: 0xc23a6a, mushroom: 0xb0825a, frostcap: 0xbfe0f5 };
function drawForage() { for (let i = 0; i < FORAGE_SPOTS.length; i++) W.unplace('forage' + i); for (const f of S.forage || []) { const [x, y] = FORAGE_SPOTS[f.spot]; const p = art.pic('icons/' + f.id); if (p) { const g = W.place('forage' + f.spot, null, x + 0.5, y + 0.5); g.add(W.billboard(p, 0.42, {})); } else W.place('forage' + f.spot, null, x + 0.5, y + 0.5, { procKind: 'forage', color: FORAGE_COLOR[f.id] }); } }

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
  for (let i = 0; i < m.cells.length; i++) { const c = m.cells[i], x = (i % m.w) + 1.5, y = Math.floor(i / m.w) + 1.5; W.unplace('r' + i); if (c === 1) W.place('r' + i, 'rubble', x, y, { scale: 0.9 + (i % 4) * 0.08 }); else if (c === 2) W.place('r' + i, 'stairs', x, y); }
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
  ui.toast(first ? 'Space fires the Pallas. F sets down the Hydra. Shift boosts. E searches rubble.' : pick(depth > 1 ? story.RUINS.deeper : story.RUINS.arrive), 5200);
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
function pallasFire() {
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
  hurtT -= dt; fireCd -= dt; hydraCd -= dt; dashCd -= dt; dashT -= dt;
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
    const b = bolts[i]; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.m.position.x = b.x; b.m.position.z = b.y;
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
  const p = propAt(tx, ty);
  if (p) {
    if (p.act === 'counter') { const k = nearestNpc(3.2); if (k) return { label: `Talk to ${NPCS[k].short || NPCS[k].name}`, run: () => talkTo(k) }; if (map.id === 'hall') return { label: 'Nobody is at the desk', run: () => ui.toast('Nobody is at the desk just now.') }; return { label: 'Nobody is at the counter', run: () => ui.toast('Nobody is here to serve just now.') }; }
    const L = { bin: 'Put the held item in the shipping bin', well: 'Fill the watering can', sign: 'Read', bed: 'Go to bed', radio: 'Watch the colony forecast', feedcow: 'Fill the troughs', feedhen: 'Fill the feeder', eggs: 'Collect the eggs', lift: 'Ride the Descent', museum: 'Look at the Memory Room', books: 'Read a book', storage: 'Open the storage box', fridge: 'Open the fridge', kitchen: 'Cook something', calendar: 'Read the noticeboard' }[p.act];
    return { label: L, run: () => act(p) };
  }
  const fa = fieldAt(tx, ty) || fieldAt(Math.floor(me.x), Math.floor(me.y));
  if (fa && fa.tile.crop && !fa.tile.crop.dead && sim.cropStage(fa.tile.crop) === 3) return { label: `Harvest the ${CROPS[fa.tile.crop.id].name.toLowerCase()}`, run: () => { const r = sim.harvest(S, fa.f.id, fa.x, fa.y); if (r.ok) { sfx('pick'); ui.gainedToast(r.gained); refreshChanged(fa.f.id, [{ x: fa.x, y: fa.y }]); goals(); } else ui.toast(r.msg); refreshHud(); } };
  const b = nearestBeast(1.4); if (b) return { label: `Pet ${S.animals[b.i].name}`, run: () => { const r = sim.petAnimal(S, b.i); ui.toast(r.msg || `${S.animals[b.i].name} seems pleased.`); floatText(b.o.position.x, b.o.position.z, '♥'); } };
  if (map.id === 'hill') for (const f of S.forage || []) { const [x, y] = FORAGE_SPOTS[f.spot]; if (Math.hypot(x + 0.5 - me.x, y + 0.5 - me.y) < 1.2) return { label: `Pick the ${ITEMS[f.id].name.toLowerCase()}`, run: () => { const r = sim.pickForage(S, f.spot); if (r.ok) { sfx('pick'); ui.gainedToast(r.gained); drawForage(); } else ui.toast(r.msg); refreshHud(); } }; }
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
    case 'bin': { if (!s) return ui.toast('Hold something to ship it. Maris collects at five.'); const r = sim.ship(S, S.player.sel); ui.toast(r.msg || (r.ok ? 'In the bin.' : 'That cannot be shipped.')); if (r.ok) sfx('drop'); goals(); break; }
    case 'well': { const r = sim.refillCan(S); ui.toast(r.msg || 'The watering can is full.'); if (r.ok) sfx('water'); break; }
    case 'sign': ui.say([{ who: 'narrator', text: story.SIGNS[p.sign] || '…' }]); break;
    case 'storage': ui.boxWindow(S, 'storage', refreshHud); break;
    case 'fridge': if (!S.flags.kitchen) ui.say([{ who: 'narrator', text: 'An old cold-locker from a ship, standing in the corner unplugged. Prof. Ruess could connect it with a kitchen refit.' }]); else ui.boxWindow(S, 'fridge', refreshHud); break;
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
  if (it.kind === 'food' || (it.stamina && it.kind !== 'tool')) { if (it.kind === 'food') { const r = sim.eat(S, S.player.sel); ui.toast(r.msg || 'That was good.'); if (r.ok) sfx('pick'); refreshHud(); } return; }
  if (it.kind !== 'tool' && it.kind !== 'seed') return;
  me.swing = 1;
  if (s.id === 'can' && (waterAt(tx, ty) || (propAt(tx, ty) || {}).act === 'well')) { const r = sim.refillCan(S); ui.toast(r.msg || 'Filled.'); if (r.ok) sfx('water'); return refreshHud(); }
  if (s.id === 'rod') { if (waterAt(tx, ty)) return cast(tx, ty); return ui.toast('Face the water to cast.'); }
  if (s.id === 'milker' || s.id === 'brush') { const b = nearestBeast(1.6); if (!b || S.animals[b.i].kind !== 'cow') return ui.toast('Stand beside a cow.'); const r = s.id === 'milker' ? sim.milk(S, b.i) : sim.brush(S, b.i); ui.toast(r.msg || (r.ok ? 'Done.' : '')); ui.gainedToast(r.gained); if (r.ok) { sfx('pick'); floatText(b.o.position.x, b.o.position.z, '♥'); } return refreshHud(); }
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
  for (let i = labels.length - 1; i >= 0; i--) { const l = labels[i]; l.life -= dt; l.h += dt * 0.8; const p = W.project(l.x, l.y, l.h); l.e.style.left = p.x + 'px'; l.e.style.top = p.y + 'px'; l.e.style.opacity = Math.min(1, l.life * 2); if (l.life <= 0) { l.e.remove(); labels.splice(i, 1); } }
  W.update(dt, me.x, me.y);
}

// ---------------------------------------------------------------- input
function selectSlot(i) { const n = S.player.slots; S.player.sel = ((i % n) + n) % n; refreshHud(); }
function pressE() { if (ui.advance()) return; if (mode !== 'play' || busy || ui.windowOpen()) return; const p = probe(); if (p) p.run(); }
function pressUse() { if (ui.advance()) return; if (mode !== 'play' || busy || ui.windowOpen()) return; use(); }
function openMenu(tab) { if (mode !== 'play' || busy || ui.talking()) return; ui.menu(S, { change: refreshHud, save: () => { save(); ui.toast('Saved.'); }, export: exportSave, title: () => { save(); location.reload(); }, music: () => ui.toast(music(!musicPlaying()) ? 'Music on.' : 'Music off.') }, tab); }
function exportSave() { save(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([sim.saveState(S)], { type: 'application/json' })); a.download = `satos-harvest-y${S.cal.year}-${['spring', 'summer', 'autumn', 'winter'][S.cal.season]}${S.cal.day}.json`; a.click(); }
function bindInput() {
  addEventListener('keydown', (e) => {
    if (mode === 'title') return;
    if (e.code === 'Escape') { if (ui.windowOpen()) ui.closeWin(); else openMenu('bag'); return e.preventDefault(); }
    if (e.code === 'Tab') { e.preventDefault(); if (ui.windowOpen()) ui.closeWin(); else openMenu('bag'); return; }
    if (e.code === 'F1') { e.preventDefault(); return openMenu('help'); }
    if (e.repeat) return;
    if (e.code === 'KeyE' || e.code === 'Enter') return pressE();
    if (e.code === 'Space') { e.preventDefault(); return pressUse(); }
    if (ui.windowOpen() || ui.talking()) return;
    keys.add(e.code);
    if (/^Digit\d$/.test(e.code)) selectSlot(e.code === 'Digit0' ? 9 : +e.code.slice(5) - 1);
    if (e.code === 'KeyR') { const s = sim.selected(S); if (s && ITEMS[s.id].stamina) { const r = sim.eat(S, S.player.sel); ui.toast(r.msg || 'That was good.'); refreshHud(); } }
    if (e.code === 'KeyM') ui.toast(music(!musicPlaying()) ? 'Music on.' : 'Music off.');
    if (map && map.ruins && e.code === 'KeyF') placeHydra();
    if (map && map.ruins && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) pallasDash();
    if (e.code === 'KeyQ') W.yaw -= Math.PI / 4; if (e.code === 'KeyC') W.yaw += Math.PI / 4;
  });
  addEventListener('keyup', (e) => keys.delete(e.code)); addEventListener('blur', () => keys.clear());
  const cv = $('view'); let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true; if (drag.moved) { W.yaw -= dx * 0.006; W.pitch = Math.max(0.45, Math.min(1.25, W.pitch + dy * 0.004)); drag.x = e.clientX; drag.y = e.clientY; } });
  cv.addEventListener('pointerup', (e) => { if (drag && !drag.moved && e.pointerType === 'mouse' && e.button === 0) pressUse(); drag = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); if (e.ctrlKey || e.shiftKey) W.dist = Math.max(6, Math.min(22, W.dist + Math.sign(e.deltaY))); else if (mode === 'play' && S) selectSlot(S.player.sel + Math.sign(e.deltaY)); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  $('bar').addEventListener('click', (e) => { const b = e.target.closest('[data-slot]'); if (b) selectSlot(+b.dataset.slot); });
  $('bMenu').onclick = () => (ui.windowOpen() ? ui.closeWin() : openMenu('bag')); $('winX').onclick = ui.closeWin;
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
  S = state; $('title').hidden = true; music(true); $('hud').hidden = false; mode = 'talk';
  if (fresh) { await ui.fade(true, 400); $('hud').hidden = true; ui.fade(false, 600); await ui.say(story.INTRO); $('hud').hidden = false; }
  mode = 'play';
  const p = S.player, m = allMaps()[p.map] ? p.map : 'farm';
  await go(fresh || p.x == null ? { map: 'farm' } : { map: m, x: p.x, y: p.y, dir: p.dir });
  if (fresh) save();
}
async function boot() {
  const info = await art.loadArt();
  W = new World($('view')); bindInput();
  const tv = art.url('video/title'), tp = art.url('scenes/title');
  $('titleArt').innerHTML = (tp ? `<img src="${tp}" alt="">` : '') + (tv ? `<video src="${tv}" autoplay loop muted playsinline></video>` : '');
  const old = loadSaved();
  if (old) { $('bContinue').hidden = false; $('contInfo').textContent = `Saved: ${sim.dateLabel(old)} · ${old.player.money.toLocaleString()} cr`; }
  $('loadInfo').textContent = info.images || info.models ? '' : 'Running on built-in stand-in graphics (no art pack found).';
  $('bNew').onclick = async () => { if (old && !confirm('Start a new farm? Your saved farm will be replaced.')) return; sfx('good'); begin(sim.newGame(), true); };
  $('bContinue').onclick = () => { sfx('good'); begin(old, false); };
  $('bHelp').onclick = () => { S = S || sim.newGame(); mode = 'play'; ui.menu(S, { close: () => { if ($('title').hidden === false) { mode = 'title'; } } }, 'help'); };
  $('fImport').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const st = sim.loadState(await f.text()); if (!st) return ($('loadInfo').textContent = 'That file is not a Sato’s Harvest save.'); begin(st, false); };
  requestAnimationFrame(frame);
  window.__farm = { get S() { return S; }, get W() { return W; }, get me() { return me; }, get map() { return map; }, go, sim, night, get mode() { return mode; } };
}
boot();
