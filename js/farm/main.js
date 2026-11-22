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
import { lowerState, waterPlace, homeAt } from './maps.js';
import * as paths from './paths.js';
import { GIFT_FACE, loadPortraits } from './expressions.js';
import { World } from './world.js';
import { pallasFold } from './cityworld.js';
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
const LOOKS = { sato: { top: '#f4eddc', bottom: '#2f4488', eye: '#7a4a22', skin: '#f8dcc4', bib: true, hat: true }, seln: { apron: '#4f8a3a' }, mori: { glasses: true, top: '#f4f6f8' }, yui: { glasses: true }, kestrel: {}, corran: { moustache: '#f2f2f2', age: 'old', bib: true }, marrow: { age: 'old' }, ruess: { age: 'old', glasses: true }, oduya: { bib: true }, vashti: {}, maris: {}, general: {}, moraine: {}, calloway: { collar: true, stole: '#3fa7a3', glasses: true }, venn: { goggles: true, belt: true }, thorne: { age: 'old', glasses: true, apron: '#c9b48a' }, moth: { bib: true, lantern: true, eye: '#5a3a7a' }, wick: { age: 'old', moustache: '#c8ccd0', cap: '#2f4a5a' }, fenn: { cap: '#1a2b4c', badge: true, capBadge: true, belt: true },
  pia: { skirt: '#3b3040', measure: true, ribbon: '#e8c45a', eye: '#4a6a3a' }, lark: { apron: '#d9534f', kerchief: '#d9534f', freckles: true, ribbon: '#d9534f', eye: '#3f7aa8' }, noor: { flowerPin: '#f2a0c0', ribbon: '#9bb07a', eye: '#5a3a2a' },
  tika: { goggles: true, smudge: true, bib: true, eye: '#2f8f5a' }, vesna: { headphones: '#ece6f0', headphonesTrim: '#e05c8a', skirt: '#5b4a7a', ribbon: '#2b2533', eye: '#8a3a6a' },
  hana: { ribbon: '#e0403a', kerchief: '#e0403a', smudge: true, bib: true, freckles: true, eye: '#3f7a8a' } };
const lookOf = (id) => ({ ...NPCS[id].look, ...(LOOKS[id] || {}) });
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------- save
function save(atCamp = false) { const away = map.id === 'ruins', bt = away && map.belt, cm = away && !bt && S.mine && S.mine.mode === 'city' ? S.mine : null, camp = atCamp && cm && cm.saveCamp != null ? cm.camps[cm.saveCamp] : null; if (cm && !camp) cm.saveCamp = null;   // a trip is kept only in a camp save
  S.player.map = camp ? 'ruins' : away ? (bt ? 'hangar' : 'central') : map.id; S.player.x = camp ? camp.x + 1.5 : away ? (bt ? 8 : 7.5) : me.x; S.player.y = camp ? camp.y + 2.5 : away ? (bt ? 7.6 : 16.5) : me.y; S.player.dir = me.dir; try { localStorage.setItem(SAVE_KEY, sim.saveState(S)); } catch { ui.toast('Could not save in this browser.'); } }
function loadSaved() { try { const t = localStorage.getItem(SAVE_KEY); return t ? sim.loadState(t) : null; } catch { return null; } }

// ---------------------------------------------------------------- context
const festivalToday = () => story.FESTIVALS.find((f) => f.season === S.cal.season && f.day === S.cal.day && (!f.flag || S.flags[f.flag])) || null;   // the Hub Cup waits for its arena
function ctx(extra = {}) { const f = festivalToday(); return { season: S.cal.season, day: S.cal.day, weekday: sim.weekday(S), minute: S.cal.minute, weather: S.weather, festival: f ? f.id : null, year: S.cal.year, flags: S.flags, partner: S.flags.partner || undefined, sweetheart: S.flags.sweet || undefined, ...extra }; }
const isBirthday = (id) => { const b = NPCS[id].birthday; return !!b && b.season === S.cal.season && b.day === S.cal.day; };

// ---------------------------------------------------------------- maps and movement
function dynSolid(tx, ty) {
  for (const f of map.fields || (map.field ? [map.field] : [])) { const x = tx - f.x, y = ty - f.y, fd = S.fields[f.id]; if (fd && x >= 0 && y >= 0 && x < fd.w && y < fd.h) { const o = fd.tiles[y * fd.w + x].obj; if (o && o !== 'weed' && o !== 'branch') return true; } }
  if (map.indoor || map.hasDecor) for (const p of map.props) if (p.decorSolid && S.flags[p.when] && tx >= Math.floor(p.x) && tx < Math.floor(p.x) + p.w && ty >= Math.floor(p.y) && ty < Math.floor(p.y) + p.d) return true;   // bought furniture
  if (map.ruins && S.mine) { const x = tx - 1, y = ty - 1; if (x >= 0 && y >= 0 && x < S.mine.w && y < S.mine.h) { const c = S.mine.cells[y * S.mine.w + x]; if (map.belt ? c !== 0 : !map.city && c === 1) return true; } }
  return false;
}
const blocked = (x, y) => map.solid(x, y) || dynSolid(Math.floor(x), Math.floor(y));
function canStand(x, y) {
  const r = 0.26;
  if (blocked(x - r, y - r) || blocked(x + r, y - r) || blocked(x - r, y + r) || blocked(x + r, y + r)) return false;
  for (const n of npcs.values()) { if (n.walking) continue; const d = Math.hypot(n.actor.x - x, n.actor.y - y); if (d < 0.55 && d < Math.hypot(n.actor.x - me.x, n.actor.y - me.y)) return false; }   // walkers pass by; never trapped inside someone
  for (const [px, py, pr, pi] of map.posts || []) if (Math.hypot(px - x, py - y) < pr + 0.22 && !felledAt(pi)) return false;
  for (const o of placedHere()) if (Math.hypot(o.x + 0.5 - x, o.y + 0.5 - y) < 0.62) return false;
  if (map.id === 'farm' && S.flags.feed_mill && map.millAt) { const [mx, my, mw, md] = map.millAt; if (x > mx - 0.2 && x < mx + mw + 0.2 && y > my - 0.2 && y < my + md + 0.1) return false; }
  return true;
}
// Chests, chargers and fruit trees Sato has set down on this map.
const placedHere = () => (S && map && !map.indoor && !map.ruins ? [...(S.chests || []), ...(S.panels || []), ...(S.fruitTrees || []), ...(S.machines || []), ...(S.yard || []).filter((o) => !sim.YARD[o.kind].walk)].filter((o) => o.map === map.id) : []);   // stepping stones are walked over
// Trees on the farm and the hill can be felled (they come back as stumps first); village trees are the village's.
const felledAt = (pi) => { const p = map.props[pi]; return !!p && (p.kind === 'tree' || p.kind === 'pine') && sim.treeFelled(S, map.id + ':' + pi); };
function plantAhead(kinds) {
  const [dx, dy] = DIRV[me.dir], ax = me.x + dx * 0.9, ay = me.y + dy * 0.9; let best = null, bd = 1.0;
  map.props.forEach((p, pi) => { if (!kinds.includes(p.kind)) return; const d = Math.hypot(p.x + p.w / 2 - ax, p.y + p.d / 2 - ay); if (d < bd) { bd = d; best = { p, pi, key: map.id + ':' + pi }; } });
  return best;
}
function target() { const [dx, dy] = DIRV[me.dir]; return [Math.floor(me.x + dx * 0.85), Math.floor(me.y + dy * 0.85)]; }

async function go(to, opts = {}) {
  try { await goInner(to, opts); }
  catch (e) { recover(e, 'go ' + (to && to.map)); }
}
async function goInner(to, { quick = false } = {}) {
  busy = true; if (!quick) await ui.fade(true, 220);
  fishing = null; hydra = null; monsters = []; for (const b of bolts) W.scene.remove(b.m); bolts = []; beasts = []; npcs = new Map(); lastPlaced = -1;
  map = to.map === 'ruins' ? ruinsMap(S.mine) : allMaps()[to.map];
  if (map.under) lowerState(map, S.flags);           // the Undercroft as far as it is restored
  W.setMap(map, S);
  me = map.belt ? new Actor(W, 'sato', { ...lookOf('sato'), suit: true }, { suit: true, tall: 1.6 }) : new Actor(W, 'sato', lookOf('sato'), map.ruins ? { pallas: true, tall: 2.5 } : {});   // the belt: a space suit
  me.x = to.x ?? map.start[0]; me.y = to.y ?? map.start[1]; me.dir = to.dir ?? 0;
  W.actors.set('sato', me); W.focus.set(me.x, 0.8, me.y);
  W.setTime(S.cal.minute, S.weather, map); setMood({ title: false, season: S.cal.season, night: S.cal.minute > 1170, ruins: !!map.ruins && !map.belt, belt: !!map.belt, map: map.belt ? 'belt' : map.id });
  pupils = [];
  if (map.beasts || map.id === 'barn' || map.id === 'coop') spawnBeasts();
  if (map.id === 'farm') spawnPondDucks(); if (map.id === 'duckhouse') drawDuckEggs();
  if (map.id === 'hill') drawForage();
  if (map.belt) drawBelt(); else if (map.ruins) drawRuins();
  if (map.id === 'central') { const pal = new Actor(W, 'pallas_parked', lookOf('sato'), { pallas: true, tall: 2.5 }); [pal.x, pal.y] = map.spots['central.pallas']; pal.dir = 0; W.actors.set('pallas_parked', pal); }   // her Pallas waits at the dock
  if (map.id === 'hangar') { const pal = new Actor(W, 'pallas_parked', lookOf('sato'), { pallas: true, tall: 2.5 }); pal.x = 8; pal.y = 4; pal.dir = 0; W.actors.set('pallas_parked', pal); }
  if (map.id === 'coop') drawEggs();
  if (map.under) drawBeds(); if (map.id === 'school') spawnPupils();
  drawPlaced(); spawnBots(); spawnCat();
  placeNpcs(true); refreshHud();
  if (!quick) await ui.fade(false, 220);
  busy = false;
  if (map.home && !S.flags['seen_' + map.id] && mode === 'play') { const id = residents(map.home)[0], t = id && story.HOME_LINES[id] && story.HOME_LINES[id].in; if (t) { sim.setFlag(S, 'seen_' + map.id); mode = 'talk'; await ui.say([{ who: 'narrator', text: t }]); mode = 'play'; } }   // the first look round someone's home
  await checkEvents();
}
// Something threw mid-transition: never leave the player on a black screen with the controls locked.
let recovering = false;
function recover(e, where) {
  console.error('[recovered]', where || '', e);
  if (recovering) return; recovering = true;
  busy = false; if (mode !== 'title') mode = 'play';
  try { ui.fade(false, 200); } catch {}
  try { const d = document.getElementById('dialog'); if (d && !d.hidden && !ui.talking?.()) d.hidden = true; } catch {}
  if (!map || !W.map) { try { const at = allMaps().farm; map = null; goInner({ map: 'farm', x: at.start ? at.start[0] : 10, y: at.start ? at.start[1] : 9 }, { quick: true }).catch(() => {}); } catch {} }
  try { ui.toast('Something went wrong there; the game recovered. (Details are in the browser console.)', 3500); } catch {}
  setTimeout(() => { recovering = false; }, 1500);
}
window.addEventListener('error', (ev) => recover(ev.error || ev.message, 'error'));
window.addEventListener('unhandledrejection', (ev) => recover(ev.reason, 'promise'));
function refreshHud() { const q = S.flags.quest, bm = map && map.belt && S.mine; const cm = map && map.city && S.mine && S.mine.mode === 'city' ? S.mine : null; ui.hud(S, { place: !map ? '' : bm ? `${map.name} · air ${Math.ceil(S.mine.air)}/${S.mine.airMax}` : cm ? `${sim.CITY_ZONES[cm.zone]} · hull ${Math.ceil(cm.hull)}/${cm.hullMax} · found ${cm.credits} cr` : map.name, ...(cm ? { trip: story.RUINS.goal(cm), held: 'Pallas · Space fires · F Hydra · R scan' } : {}), quest: q && NPCS[q.npc] && ITEMS[q.item] ? { who: NPCS[q.npc].short || NPCS[q.npc].name, text: `${q.n} × ${ITEMS[q.item].name}  (you have ${sim.countItem(S, q.item)})` } : null }); hullBar(!!cm); const s = sim.selected(S); if (me && (!map.ruins || map.belt)) me.setTool(s && ITEMS[s.id].kind === 'tool' ? s.id : null); }
function refreshChanged(fieldId, changed) { const fd = S.fields[fieldId]; for (const c of changed || []) W.refreshTile(fieldId, c.y * fd.w + c.x); }

// ---------------------------------------------------------------- people
// Everybody's day is planned at once (paths.planDay, docs/FARM.md §15): where each stands and the walks between, through doors,
// exits and the lift, so people walk to their next place and anyone met mid-walk is somewhere sensible along the way.
const PEOPLE = Object.keys(NPCS).filter((k) => k !== 'sato');
let plan = null, planKey = '', lag = {};
function schedAt(id, c) { const w = story.whereIs(id, c); if (w) return { spot: w.spot, vis: true }; const h = story.homeSpot(id, c); return h ? { spot: h, vis: story.presence(id, c) === 'home' } : null; }
function ensurePlan() {
  const c = ctx(), key = [sim.absDay(S), c.weather, c.festival, c.partner, c.sweetheart, c.year, Object.keys(S.flags).filter((k) => /^ld_/.test(k) && S.flags[k]).join(), paths.blockVersion()].join('|');
  if (plan && key === planKey) return;
  planKey = key; lag = {}; lowerState(allMaps().lower, S.flags);
  plan = paths.planDay(PEOPLE, (id, m) => schedAt(id, { ...c, minute: m }));
}
const nowT = () => S.cal.minute + Math.min(clock, MIN_SECONDS) / MIN_SECONDS;
function placeNpcs(force) {
  if (!map || !S) return; ensurePlan(); if (force) lag = {};
  if (map.ruins) { for (const [id, n] of npcs) { n.actor.dispose(); W.actors.delete(id); } npcs.clear(); return; }
  moveNpcs(0);
}
// Each frame: where the plan puts everybody now. A walker passing a Sato who stands still stops a moment to let her talk.
function moveNpcs(dt) {
  if (!plan || !map || map.ruins) return;
  const t = nowT();
  for (const id of PEOPLE) {
    let L = paths.locate(plan, id, t - (lag[id] || 0));
    if (lag[id] && !(L && L.moving)) { lag[id] = 0; L = paths.locate(plan, id, t); }
    let n = npcs.get(id);
    if (!L || L.map !== map.id || !L.vis) { if (n) { n.actor.dispose(); W.actors.delete(id); npcs.delete(id); } continue; }
    if (!n) { const a = new Actor(W, id, lookOf(id), { tall: id === 'corran' || id === 'general' ? 1.62 : id === 'moth' ? 1.12 : 1.5 }); a.x = L.x; a.y = L.y; a.dir = L.moving ? L.dir : 0; W.actors.set(id, a); n = { actor: a, spot: null }; npcs.set(id, n); }
    const a = n.actor;
    if (L.moving && dt > 0 && me && !me.moving && mode === 'play' && Math.hypot(L.x - me.x, L.y - me.y) < 1.25 && (lag[id] || 0) < 5) { lag[id] = (lag[id] || 0) + dt / MIN_SECONDS; a.moving = false; a.face(me.x, me.y); n.spot = null; n.walking = false; continue; }
    if (!L.moving && n.spot !== L.spot) a.dir = 0;            // arrived: turn round to face the room
    a.x = L.x; a.y = L.y; a.moving = L.moving; if (L.moving) a.dir = L.dir;
    n.spot = L.spot; n.walking = L.moving;
  }
}
const whereNow = () => (plan && S ? PEOPLE.map((id) => ({ id, ...(paths.locate(plan, id, nowT()) || {}) })).filter((p) => p.map && p.vis) : []);
function nearestNpc(maxD) { let best = null, bd = maxD; for (const [id, n] of npcs) { const d = Math.hypot(n.actor.x - me.x, n.actor.y - me.y); if (d < bd) { bd = d; best = id; } } return best; }
// Open only on the hour and only with the keeper standing there (they may arrive a few minutes early to set out the stock).
const onDuty = (id, n) => { const w = story.whereIs(id, ctx()); return !!(w && n && w.spot === n.spot); };
const shopOf = (id) => { const n = npcs.get(id), s = NPCS[id].shop; if (!n || !s || n.walking || !onDuty(id, n)) return null; return n.spot === s + '.counter' || (id === 'moraine' && (n.spot === 'central.dock' || n.spot === 'central.exchange')) ? s : null; };

async function talkTo(id) {
  const n = npcs.get(id); n.actor.face(me.x, me.y); me.face(n.actor.x, n.actor.y); mode = 'talk';
  const sh = shopOf(id), desk = id === 'marrow' && n.spot === 'hall.desk' && onDuty(id, n);
  let what = 0;
  if (sh || desk) { const opts = ['Talk']; if (sh) opts.push('Buy'); if (desk) opts.push('Give a find to the Memory Room'); opts.push('Leave'); const i = await ui.choose(NPCS[id].name, opts); what = opts[i] === 'Talk' ? 0 : opts[i] === 'Buy' ? 1 : opts[i] === 'Leave' ? 3 : 2; }
  if (what === 0) {
    const rec = S.npc[id] || {}, met = !!rec.met, home = map.home && story.homeKey(id, S.flags) === map.home && story.HOME_LINES[id];
    let lines = story.talkLines(id, ctx({ hearts: sim.hearts(S, id), met, isBirthday: isBirthday(id) }));
    if (met && rec.mail && story.MAIL_LINES[rec.mail]) { lines = [story.MAIL_LINES[rec.mail], ...lines].slice(0, 3); delete rec.mail; }   // they found what was left in the mailbox
    if (home && met) { const v = home.visit[(sim.absDay(S) + hash(id)) % home.visit.length]; lines = Array.isArray(v) ? v : [v]; if (sim.homeVisit(S, id).first) { floatText(n.actor.x, n.actor.y - 0.4, '♥'); ui.toast(`A visit at home: ${NPCS[id].short || NPCS[id].name} is glad you came.`, 2600); } }   // at home: their own lines, and a little extra once a day
    const r = sim.talk(S, id); if (S.npc[id]) S.npc[id].met = true;
    await ui.say(!met && story.MEETINGS && story.MEETINGS[id] ? story.MEETINGS[id] : lines.map((t) => ({ who: id, text: t, ex: isBirthday(id) ? 'joyful' : S.flags.partner === id ? 'loved' : S.flags.sweet === id ? 'shy' : undefined })));   // the Undercroft folk: a first meeting
    if (id === 'moth') await mothPage();
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
    sim.removeItem(S, q.item, q.n); sim.addLove(S, id, 6); const pay = Math.round((ITEMS[q.item].sell || { tea: 30, bread: 60, soup: 80, pie: 150 }[q.item] || 40) * q.n * 1.5); S.player.money += pay;
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
    sim.setFlag(S, 'confess_' + id); await ui.say(story.moodLines(who.confess, 'confess', id)); floatText(me.x, me.y, '♥♥');
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
  if (!who || S.flags.sweet !== id || sim.hearts(S, id) < 10) { await ui.say([{ who: id, text: (who && who.decline) || 'That is a beautiful thing. Keep it for the right day.', ex: 'worried' }]); mode = 'play'; return; }
  sim.removeItem(S, 'pendant', 1); sim.setFlag(S, 'partner', id); sfx('good');
  await ui.say(story.moodLines(who.propose, 'propose', id));
  await ui.fade(true, 500); ui.scene('wedding'); setMood({ festival: 'wedding' }); await ui.fade(false, 500);
  await ui.say(story.moodLines(who.wedding, 'wedding', id)); setMood({ festival: null }); for (const k of Object.keys(NPCS)) if (k !== 'sato') sim.addLove(S, k, 2);
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
  if (r.later) ui.toast(`${NPCS[id].short || NPCS[id].name} has already had a gift today: pleased, but less so.`, 3200);   // a quarter of the effect; the birthday words are for the first
  await ui.say([{ who: id, text: story.giftLine(id, tier, bd && !r.later), ex: bd && !r.later && tier !== 'disliked' ? 'joyful' : GIFT_FACE[tier] || 'neutral' }]);   // the face says it too
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
      sim.setFlag(S, key); mode = 'talk'; ui.scene('festival_' + ({ yearsend: 'yearend' }[f.id] || f.id)); sfx('good'); setMood({ festival: f.id });
      await ui.say(f.lines); if (f.id === 'hubcup') await hubCup(true);
      { const who = S.flags.partner || S.flags.sweet, fl = story.FESTIVAL_LOVE && story.FESTIVAL_LOVE[f.id]; if (who && NPCS[who] && fl) await ui.say(fl(who === 'general' ? 'The General' : NPCS[who].short || NPCS[who].name, who)); }   /* your sweetheart at the festival */ setMood({ festival: null }); reward(f.reward); if (f.id === 'harvest' || f.id === 'lantern') await plumGift(f.id); sim.tick(S, 120); for (const k of Object.keys(NPCS)) if (k !== 'sato' && S.npc[k]) S.npc[k].met = true;
      mode = 'play'; placeNpcs(true); refreshHud(); return;
    }
  }
  for (const e of [...story.EVENTS, ...(story.LOWER_SCENES || [])]) {
    if (S.flags['ev_' + e.id] || e.map !== map.id || !npcs.has(e.npc) || sim.hearts(S, e.npc) < e.hearts || (e.flag && !S.flags[e.flag]) || (e.sweet && S.flags.sweet !== e.npc && S.flags.partner !== e.npc)) continue;   // sweet: a date, sweethearts only
    if ((e.from != null && c.minute < e.from) || (e.to != null && c.minute > e.to) || (e.season != null && e.season !== c.season) || (e.weekday != null && e.weekday !== c.weekday)) continue;
    sim.setFlag(S, 'ev_' + e.id); mode = 'talk'; const n = npcs.get(e.npc); n.actor.face(me.x, me.y);
    if (e.id === 'general10') ui.scene('heart10');
    await ui.say(e.lines); reward(e.reward, e.npc); sfx('good'); if (e.id === 'seln7' || e.id === 'marrow7') await plumGift(e.id);
    mode = 'play'; refreshHud(); return;
  }
}

// ---------------------------------------------------------------- animals, forage, eggs
function spawnBeasts() {
  const kinds = map.beasts || [map.id === 'barn' ? 'cow' : 'chicken'], pen = map.pen;
  S.animals.forEach((a, i) => { if (!kinds.includes(a.kind) || (a.kind === 'duck' && duckSwim())) return; const o = W.place('beast' + i, a.kind, pen[0] + 1 + Math.random() * (pen[2] - pen[0] - 1), pen[1] + 1 + Math.random() * (pen[3] - pen[1] - 1)); beasts.push({ i, o, tx: o.position.x, ty: o.position.z, wait: Math.random() * 3 }); });
}
// Ducks swim on the east pond by day in fair weather once the duck house is mended (sim.swimDay); otherwise they stay in.
const duckSwim = () => !!S.flags.duckhouse && sim.swimDay(S) && S.cal.minute >= 480 && S.cal.minute < 1020;
function spawnPondDucks() {
  const P = map.duckPond; if (!P || !duckSwim()) return;
  S.animals.forEach((a, i) => { if (a.kind !== 'duck') return; const pen = [P[0] + 0.4, P[1] + 0.4, P[2] - 0.4, P[3] - 0.4], o = W.place('beast' + i, 'duck', pen[0] + Math.random() * (pen[2] - pen[0]), pen[1] + Math.random() * (pen[3] - pen[1]), { h0: -0.12 }); beasts.push({ i, o, pen, tx: o.position.x, ty: o.position.z, wait: Math.random() * 3 }); });
}
function drawDuckEggs() { const n = S.duckNest || { eggs: 0, feathers: 0 }; for (let i = 0; i < 6; i++) W.unplace('degg' + i); for (let i = 0; i < Math.min(6, n.eggs + n.feathers); i++) W.place('degg' + i, null, 1.3 + (i % 3) * 0.9, 0.5 + Math.floor(i / 3) * 0.3, { procKind: i < n.eggs ? 'duck_egg' : 'feather', h0: 0.55 }); }
function nearestBeast(maxD) { let best = null, bd = maxD; for (const b of beasts) { const d = Math.hypot(b.o.position.x - me.x, b.o.position.z - me.y); if (d < bd) { bd = d; best = b; } } return best; }
function drawEggs() { for (let i = 0; i < 6; i++) W.unplace('egg' + i); for (let i = 0; i < Math.min(6, S.eggs || 0); i++) W.place('egg' + i, null, 1.3 + (i % 3) * 0.9, 0.5 + Math.floor(i / 3) * 0.3, { procKind: 'egg', h0: 0.55 }); }
const FORAGE_COLOR = { herb: 0x6fbf5a, berry: 0xc23a6a, mushroom: 0xb0825a, frostcap: 0xbfe0f5, bamboo_shoot: 0xc9d27a, wild_mint: 0x58c08a, fiddlehead: 0x7a9a3a, wild_grape: 0x5a2f7a, honeycomb: 0xf0b32a, chestnut: 0x7a4a2a, wild_apple: 0xd8a03a, matsutake: 0xe8d8b8, pine_nut: 0xa07a4a, winter_root: 0xefe2c8, wild_violet: 0x8a5ad0, elderflower: 0xf4eed0, rosehip: 0xd8302a, snowdrop: 0xffffff };

// ---------------------------------------------------------------- chests, chargers, fruit trees, robots (2026-11-18)
function drawPlaced() {
  if (!map || !W) return;
  for (const k of [...W.tileObjs.keys()]) if (/^(chest|charger|ftree|machine|yard)\d/.test(k)) W.unplace(k);
  if (map.indoor || map.ruins) return;
  W.unplace('mill'); for (let k = 0; k < 8; k++) W.unplace('hydro' + k);
  if (map.id === 'farm' && S.flags.feed_mill && map.millAt) { const [mx, my, mw, md] = map.millAt; W.place('mill', 'feed_mill', mx + mw / 2, my + md / 2, { rot: 0 }); }
  if (map.id === 'village') for (const h of S.hydro || []) { const t = map.props.find((p) => p.act === 'hydro' && p.tower === h.tower); if (!t) continue; const g = W.place('hydro' + h.tower, null, t.x + 0.5, t.y + 0.5, { h0: 2.15 }); g.add(W.proc('starglow')); g.children[0].scale.setScalar(0.6); g.children[0].children.forEach((q) => { if (q.material) q.material = q.material.clone(), q.material.color && q.material.color.set(0x7dffb0); }); if (h.crop) { const c = W.makeCrop(h.crop, h.tower); c.scale.setScalar(0.7); c.position.y = 0.05; g.add(c); } }
  paths.setBlockers(map.id, placedHere().map((o) => o.x + ',' + o.y));   // people walk round what Sato sets down
  S.chests.forEach((c, i) => { if (c.map === map.id) W.place('chest' + i, 'field_chest', c.x + 0.5, c.y + 0.5); });
  { const ys = (S.yard || []).filter((y) => y.map === map.id), fence = (x, y) => ys.some((q) => q.kind === 'yard_fence' && q.x === x && q.y === y);   // fences join their neighbours
    (S.yard || []).forEach((y, i) => { if (y.map !== map.id) return; W.place('yard' + i, y.kind, y.x + 0.5, y.y + 0.5, y.kind === 'yard_fence' ? { nb: [fence(y.x, y.y - 1), fence(y.x + 1, y.y), fence(y.x, y.y + 1), fence(y.x - 1, y.y)], rot: 0 } : { rot: 0 }); }); }
  (S.machines || []).forEach((m, i) => { if (m.map === map.id) W.place('machine' + i, m.kind, m.x + 0.5, m.y + 0.5, { ready: !!(m.out && m.n), busy: !!m.item, rot: 0 }); });
  S.panels.forEach((p, i) => { if (p.map === map.id) W.place('charger' + i, 'charger', p.x + 0.5, p.y + 0.5, { procKind: 'charge_lights', slots: p.slots }); });
  S.fruitTrees.forEach((t, i) => {
    if (t.map !== map.id) return; const st = sim.treeStage(S, t);
    W.place('ftree' + i, st === 0 ? 'sapling' : st === 1 ? 'fruit_tree_young' : 'fruit_tree', t.x + 0.5, t.y + 0.5, { model: st === 0 ? 'sapling' : 'fruit_tree_' + t.kind + (st === 2 && sim.fruitReady(S, t) ? '' : '_bare'), stage: st, tree: t.kind, fruit: sim.fruitReady(S, t), rot: i * 1.3 });
  });
}
const BOT_LOOK = [{ color: 0xf2efe6, trim: 0x5fb3b0 }, { color: 0xfde6c8, trim: 0xe07a5f }, { color: 0xe3ecf7, trim: 0x7a8fd8 }];
const botHome = (r, i) => (r.job === 'rest' || r.charge <= 0 ? [10.5 + i * 1.2, 7.4] : r.job === 'animals' ? [16 + i, 7.6] : [5 + i * 5 + Math.random() * 3, 12 + Math.random() * 14]);
function spawnBots() {
  bots = []; if (!map || map.id !== 'farm') return;
  (S.robots || []).forEach((r, i) => { const [x, y] = botHome(r, i), o = W.place('bot' + i, 'farm_bot', x, y, BOT_LOOK[i % 3]); bots.push({ i, o, tx: x, ty: y, wait: Math.random() * 2, talk: 0, leg: 0 }); });
}
// The battery keeper's round: to a solar charger (or the house) for a charged battery, then out to whichever unit is
// lowest, carrying it on its head, and back. It goes nowhere when it is flat itself.
function batteryCell(b) {
  if (!b.cell) { const c = new THREE.Group(), m = (w, h, d, col, y, glow) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: glow ? col : 0, emissiveIntensity: glow ? 0.6 : 0 })); q.position.y = y; c.add(q); return q; }; m(0.34, 0.4, 0.24, 0xe8ecef, 0); m(0.28, 0.3, 0.245, 0x5fd08a, -0.02, true); m(0.12, 0.07, 0.1, 0x9fb0bf, 0.235); c.position.y = 1.05; c.rotation.z = 0.12; b.o.add(c); b.cell = c; }
  return b.cell;
}
function keeperTarget(b) {
  const panels = (S.panels || []).filter((p) => p.map === 'farm'), others = bots.filter((o) => o !== b && S.robots[o.i]);
  b.leg = (b.leg + 1) % 2;
  if (b.leg === 0 || !others.length) { const p = panels[(b.i + Math.floor(W.t / 20)) % Math.max(1, panels.length)]; return p ? [p.x + 0.5, p.y + 1.3] : [10.5, 7.6]; }
  const low = others.slice().sort((x, y) => S.robots[x.i].charge - S.robots[y.i].charge)[Math.floor(Math.random() * Math.min(2, others.length))];
  return [low.o.position.x + 0.7, low.o.position.z + 0.2];
}
function botsTick(dt) {
  for (const b of bots) {
    const r = S.robots[b.i]; if (!r) continue; b.wait -= dt;
    if (b.talk > 0) { b.talk -= dt; continue; }
    const keeper = r.job === 'batteries' && r.charge > 0; if (keeper || b.cell) batteryCell(b).visible = keeper && b.leg === 1;
    if (b.wait <= 0) { if (keeper) { [b.tx, b.ty] = keeperTarget(b); b.wait = 5 + Math.random() * 3; } else { const [x, y] = botHome(r, b.i); b.tx = x + (Math.random() - 0.5) * 3; b.ty = y + (Math.random() - 0.5) * 2; b.wait = 2.5 + Math.random() * 5; } }
    const dx = b.tx - b.o.position.x, dy = b.ty - b.o.position.z, d = Math.hypot(dx, dy), sp = r.charge > 0 ? (keeper ? 1.5 : 0.9) : 0;
    if (d > 0.1 && sp) { b.o.position.x += dx / d * dt * sp; b.o.position.z += dy / d * dt * sp; b.o.rotation.y = Math.atan2(dx, dy); }
    b.o.position.y = sp && d > 0.1 ? Math.abs(Math.sin(performance.now() / 120 + b.i)) * 0.04 : 0;
  }
}
// ---------------------------------------------------------------- the farm cat (2026-11-22, sim.petOf)
// Where she is: asleep in her bed by the hearth at night (on Sato's bed late on, once she loves her); on the porch on
// fine days from ten till five; otherwise pottering round the farmhouse. She wanders a little round that spot.
let cat = null, catCheck = 0;
const CAT_BED = [3.5, 1.5];
function catPlan() {
  const p = sim.petOf(S); if (!p) return null; const m = S.cal.minute;
  if (m >= 1260 || m < 390) return p.love >= 60 && (m >= 1320 || m < 390) ? { map: 'house', x: 1.5, y: 1.2, sleep: true, up: 0.55 } : { map: 'house', x: CAT_BED[0], y: CAT_BED[1], sleep: true, up: 0.08 };
  if (m >= 600 && m < 1020 && S.weather === 'sun' && S.cal.season !== 3) return { map: 'farm', x: 7.5, y: 8.7, r: 2.2 };
  return { map: 'house', x: 5.5, y: 4.5, r: 3 };
}
function spawnCat() {
  if (cat) W.unplace('petcat'); cat = null; catCheck = 4; const s = map && catPlan(); if (!s || s.map !== map.id) return;
  cat = { o: W.place('petcat', s.sleep ? 'cat_sleep' : 'cat', s.x, s.y), x: s.x, y: s.y, tx: s.x, ty: s.y, wait: 1 + Math.random() * 3, plan: s, purr: 0 };
  cat.o.position.y = s.up || 0;
}
function catTick(dt) {
  catCheck -= dt; if (catCheck <= 0) { catCheck = 4; const s = map && catPlan(), c = cat && cat.plan, here = s && s.map === map.id; if (!!here !== !!c || (here && (!!s.sleep !== !!c.sleep || s.x !== c.x))) spawnCat(); }
  if (!cat) return; const o = cat.o; cat.purr -= dt;
  if (cat.plan.sleep) { o.scale.setScalar(1 + Math.sin(performance.now() / 700) * 0.015); return; }   // breathing
  cat.wait -= dt;
  if (cat.wait <= 0) { const a = Math.random() * Math.PI * 2, d = Math.random() * cat.plan.r, nx = cat.plan.x + Math.cos(a) * d, ny = cat.plan.y + Math.sin(a) * d; if (canStand(nx, ny)) { cat.tx = nx; cat.ty = ny; } cat.wait = 3 + Math.random() * 6; }
  if (cat.purr > 0) { o.rotation.y = Math.atan2(me.x - cat.x, me.y - cat.y); o.position.y = Math.abs(Math.sin(performance.now() / 160)) * 0.02; return; }
  const dx = cat.tx - cat.x, dy = cat.ty - cat.y, d = Math.hypot(dx, dy);
  if (d > 0.08) { const st = Math.min(d, dt * 1.1), nx = cat.x + dx / d * st, ny = cat.y + dy / d * st; if (canStand(nx, ny)) { cat.x = nx; cat.y = ny; } else { cat.tx = cat.x; cat.ty = cat.y; } o.position.x = cat.x; o.position.z = cat.y; o.rotation.y = Math.atan2(dx, dy); o.position.y = Math.abs(Math.sin(performance.now() / 110)) * 0.03; }
  else o.position.y = 0;
}
function catProbe() {
  if (!cat || Math.hypot(cat.x - me.x, cat.y - me.y) > 1.3) return null;
  const p = sim.petOf(S), held = sim.selected(S), nm = p.name || 'the kitten';
  if (held && ITEMS[held.id].kind === 'fish' && p.fedDay !== sim.absDay(S)) return { label: `Give ${nm} the ${ITEMS[held.id].name.toLowerCase()}`, run: () => { const r = sim.feedCat(S, held.id); ui.toast(r.msg, 3600); if (r.ok) { sfx('good'); cat.purr = 2.5; floatText(cat.x, cat.y, '♥'); } refreshHud(); } };
  return { label: cat.plan.sleep ? `Stroke ${nm} (asleep)` : `Pet ${nm}`, run: async () => {
    if (!p.name) { mode = 'talk'; const i = await ui.choose('The kitten looks up at you, waiting. What will you call her?', sim.PET_NAMES); mode = 'play'; if (!(i >= 0)) return; ui.toast(sim.nameCat(S, sim.PET_NAMES[i]).msg, 3600); }
    const r = sim.petCat(S); ui.toast(r.msg, 3200); if (cat) cat.purr = 2.5; if (r.ok && !r.again && cat) { sfx('good'); floatText(cat.x, cat.y + 0.2, r.up ? '♥♥' : '♥'); } refreshHud(); } };
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
  const mi = sim.machineAt(S, map.id, tx, ty); if (mi >= 0) return { label: sim.machineLabel(S, mi), run: () => { const r = sim.useMachine(S, mi); ui.toast(r.msg); if (r.ok) { sfx(r.gained && r.gained.length ? 'pick' : 'drop'); ui.gainedToast(r.gained); drawPlaced(); } refreshHud(); } };
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
const forageBob = [];   // hill forage that bobs and glows (2026-11-22: easier to spot among the flowers)
function drawForage() { forageBob.length = 0; for (let i = 0; i < FORAGE_SPOTS.length; i++) W.unplace('forage' + i); W.unplace('forage' + sim.STAR_SPOT); for (const f of S.forage || []) { const [x, y] = spotXY(f.spot); if (f.id === 'star_plum') { W.place('forage' + f.spot, 'starglow', x + 0.5, y + 0.5); continue; } const p = art.pic('icons/' + f.id); if (p) { const g = W.place('forage' + f.spot, null, x + 0.5, y + 0.5), rare = ITEMS[f.id].sell >= 300; g.add(W.proc('forage_glow', { gold: rare })); const bb = W.billboard(p, rare ? 0.95 : 0.8, {}); bb.position.y = 0.12; g.add(bb); g.userData.bob = { bb, t: f.spot * 1.7 }; forageBob.push(g); } else W.place('forage' + f.spot, null, x + 0.5, y + 0.5, { procKind: 'forage', color: FORAGE_COLOR[f.id] }); } }


// ---------------------------------------------------------------- star-plums, the lift, the Main deck, the towers (2026-11-18)
async function plumGift(src) {
  const r = sim.grantPlum(S, src, { storage: true }); if (!r.ok) return;
  const lines = story.STAR_PLUM[src]; if (Array.isArray(lines)) { mode = 'talk'; await ui.say(lines); mode = 'play'; }
  sfx('good'); ui.celebrate(`★ A star-plum! ${sim.countItem(S, 'star_plum') ? 'It is in your rucksack.' : 'It went to the storage box at home.'} Eat it to raise your max stamina for good.`); refreshHud();
}
// The spoke lift has three stops: Willowfall (the Lantern Ring), Eden Central (the Main deck) and the Lower deck.
const LIFT_STOPS = { village: { name: 'Willowfall', deck: 'the Lantern Ring', to: { map: 'village', x: 56.5, y: 13.7, dir: 0 }, n: 0 }, central: { name: 'Eden Central', deck: 'the Main deck', to: { map: 'central', x: 34.5, y: 50.5, dir: 1 }, n: 1 }, lower: { name: 'the Lower deck', deck: 'the Undercroft', to: { map: 'lower', x: 27.5, y: 37.6, dir: 1 }, n: 2 } };
async function rideLift(from) {
  const here = LIFT_STOPS[from] || LIFT_STOPS.village, stops = Object.entries(LIFT_STOPS).filter(([k]) => k !== from);
  const opts = stops.map(([, s]) => `${s.n > here.n ? 'Down' : 'Up'} to ${s.name} (${Math.abs(s.n - here.n) * 15 + 5} min)`); opts.push('Not now');
  mode = 'talk'; const i = await ui.choose(`The spoke lift · ${here.name}, ${here.deck}`, opts); mode = 'play';
  if (i >= stops.length) return;
  const [to, s] = stops[i]; sfx('door'); sim.tick(S, Math.abs(s.n - here.n) * 15 + 5);
  const first = to === 'lower' && !S.flags.ld_visited;
  if (first) { sim.setFlag(S, 'ld_visited'); busy = true; await ui.fade(true, 500); busy = false; mode = 'talk'; await ui.say(story.LOWER.arrive.map((t) => ({ who: 'narrator', text: t }))); mode = 'play'; }
  await go(s.to);
  ui.toast(to === 'lower' ? (first ? 'The lift landing. The restoration terminal is the green screen just north-east of the lift, beside a sign: face it and press E to fund projects. Venn stands at his bench further east.' : story.LOWER.down) : from === 'lower' ? story.LOWER.up : to === 'central' ? story.CENTRAL.down : story.CENTRAL.up, 4200);
}
// ---------------------------------------------------------------- the Undercroft (2026-11-19): projects, pumps, beds, logs, pupils
async function restoreTerminal() {
  mode = 'talk'; await ui.say([{ who: 'narrator', text: story.LOWER.terminal }]); mode = 'play';
  ui.projectWindow(S, (r) => { if (r && r.ok) { sfx('good'); ui.toast(story.LOWER.funded, 3600); } refreshHud(); });
}
async function readLog(p) {
  const r = sim.recoverLog(S, p.log); if (!r.ok) return ui.toast(r.msg);
  const L = story.LOGS[p.log]; mode = 'talk';
  await ui.say([{ who: 'narrator', text: r.again ? `${L.author}: “${L.title}”. ${r.msg}` : `${L.author}: “${L.title}”.` }, ...(r.again ? [] : [{ who: 'narrator', text: L.text }])]); mode = 'play';
  if (r.first) { sfx('good'); ui.toast(`${r.msg} (${sim.logsFound(S).length}/${sim.LOWER_LOG_COUNT || 11} logs)`, 3600); } refreshHud();
}
async function mothPage() {
  const r = sim.diaryPage(S); if (!r.ok || !r.first) return;
  const L = story.LOGS[r.id]; mode = 'talk';
  await ui.say([{ who: 'moth', text: r.id === 'moth_sun' ? 'This one is mine. I did it for you. You can keep it in your book.' : 'I found another page. In the crypt with the broken lid. You can have it. You look at them properly.' }, { who: 'narrator', text: `${L.author}: “${L.title}”.` }, { who: 'narrator', text: L.text }]); mode = 'play';
  sfx('good'); ui.toast('A diary page. Logged in your journal (P).', 3200);
}
// ---- release 2: the Works press, the vent bath, the reactor console and the round door
async function worksPress() {
  if (!S.flags.ld_works) return ui.toast(story.LOWER.worksShut, 3600);
  if (!S.flags.works_seen) { sim.setFlag(S, 'works_seen'); mode = 'talk'; await ui.say([{ who: 'narrator', text: story.LOWER.works }]); mode = 'play'; }
  await ui.shop(S, 'works', 'venn', refreshHud); refreshHud();
}
async function recycleBin() {
  if (!S.flags.ld_works) return ui.toast(story.LOWER.worksShut, 3600);
  const R = sim.recycleList(S); mode = 'talk'; const i = await ui.choose('The Works recycling bin · Venn pays better than the shipping bin', [...R.map((r) => `${r.label}${r.can ? '' : ` (${r.why})`}`), 'Not now']); mode = 'play';
  if (i < 0 || i >= R.length) return;
  const r = sim.recycle(S, R[i].id); ui.toast(r.msg, 3200); if (r.ok) sfx('drop'); refreshHud();
}
async function ventBath() {
  if (!S.flags.ld_vents) return ui.toast(story.LOWER.ventsShut, 3600);
  const free = !!S.flags.ld_reactor || sim.satoBirthday(S);
  mode = 'talk'; const i = await ui.choose(`The Thermal Vents · ${free ? 'free' : sim.VENT_PRICE + ' cr'}`, ['Soak for an hour', 'Not now']); mode = 'play';
  if (i !== 0) return;
  const r = sim.ventSoak(S); if (!r.ok) return ui.toast(r.msg);
  busy = true; await ui.fade(true, 600); W.setTime(S.cal.minute, S.weather, map); placeNpcs(true); await new Promise((q) => setTimeout(q, 350)); await ui.fade(false, 600); busy = false;
  sfx('good'); floatText(me.x, me.y, '♨'); ui.toast(r.msg, 4200); refreshHud();
}
async function reactorConsole() {
  if (!S.flags.ld_vents) return ui.toast(story.LOWER.reactorShut, 3600);
  const k = sim.reactorDone(S), st = sim.REACTOR_STEPS[k];
  if (!st) { mode = 'talk'; await ui.say([{ who: 'narrator', text: story.LOWER.reactorDone }]); mode = 'play'; return; }
  const why = sim.reactorWhy(S), needs = st.req.map(([id, n]) => `${n} ${ITEMS[id].name.toLowerCase()}`).join(', ');
  mode = 'talk'; const i = await ui.choose(`Reactor console · job ${k + 1} of ${sim.REACTOR_STEPS.length}: ${st.name}. ${st.desc} Needs ${needs}.${why ? ' (' + why + ')' : ''}`, why ? ['Step back'] : ['Do the job', 'Not now']); mode = 'play';
  if (why || i !== 0) return;
  const r = sim.reactorStep(S); if (!r.ok) return ui.toast(r.msg);
  mode = 'talk'; await ui.say(story.REACTOR[r.step] || []);
  if (r.log) { const L = story.LOGS[r.log]; await ui.say([{ who: 'narrator', text: `${L.author}: “${L.title}”.` }, { who: 'narrator', text: L.text }]); }
  mode = 'play'; sfx('good'); if (r.last) ui.celebrate('The old reactor is safe. The vent bath is free from now on, and the catacomb beds grow twice as fast.'); else ui.toast(r.msg, 3600);
  await refreshLower(); refreshHud();
}
// The Hub Cup: five throws. A ball sweeps the bar; press Space, E or click as it crosses the hoop (sim.hubCupThrow scores it).
function hubCupThrows() {
  return new Promise((res) => {
    const el = document.createElement('div'), out = [], pts = [];
    el.innerHTML = `<div style="background:#1b2430;color:#f2eee4;border:2px solid #d9a520;border-radius:14px;padding:18px 22px;width:min(440px,92vw);font:15px/1.4 system-ui,sans-serif;text-align:center"><b style="font-size:18px">The Hub Cup · Zero-G Arena</b><p style="margin:6px 0 12px">Let go as the ball crosses the hoop. Space, E or a tap. Throw <span data-n>1</span> of ${sim.HUB_CUP.throws}.</p><div style="position:relative;height:34px;border-radius:17px;background:#2b3a4a;overflow:hidden"><i style="position:absolute;left:22%;width:56%;top:0;bottom:0;background:#3a5a4a"></i><i style="position:absolute;left:35%;width:30%;top:0;bottom:0;background:#4f8a5a"></i><i style="position:absolute;left:44%;width:12%;top:0;bottom:0;background:#7dffb0"></i><i data-ball style="position:absolute;top:5px;width:24px;height:24px;margin-left:-12px;border-radius:50%;background:#ffd36a;box-shadow:0 0 10px #ffd36a"></i></div><p data-log style="min-height:22px;margin:12px 0 0">&nbsp;</p></div>`;
    Object.assign(el.style, { position: 'fixed', inset: '0', display: 'grid', placeItems: 'center', background: 'rgba(8,12,20,.55)', zIndex: 80 });
    document.body.appendChild(el);
    const ball = el.querySelector('[data-ball]'), log = el.querySelector('[data-log]'), num = el.querySelector('[data-n]');
    let t0 = performance.now(), wait = 0, raf = 0;
    const phase = (t) => { const x = (Math.max(0, t - t0) / 1000 * sim.hubCupSpeed(out.length)) % 2; return x < 1 ? x : 2 - x; };
    const draw = (t) => { ball.style.left = (wait ? out[out.length - 1] : phase(t)) * 100 + '%'; raf = requestAnimationFrame(draw); };
    const press = (e) => {
      if (e.type === 'keydown' && e.code !== 'Space' && e.key !== 'e' && e.key !== 'E' && e.key !== 'Enter') return;
      e.preventDefault(); e.stopPropagation(); if (wait) return;
      const p = phase(performance.now()), n = sim.hubCupThrow(p); out.push(p); pts.push(n); sfx(n ? 'good' : 'drop');
      log.textContent = `${['Wide.', 'Off the rim: +1', 'In! +2', 'Clean through the hoop! +3'][n]}   ${pts.join(' · ')}`;
      wait = 1; setTimeout(() => { wait = 0; t0 = performance.now() + 250; num.textContent = Math.min(out.length + 1, sim.HUB_CUP.throws); if (out.length >= sim.HUB_CUP.throws) { cancelAnimationFrame(raf); window.removeEventListener('keydown', press, true); el.remove(); res(out); } }, 900);
    };
    window.addEventListener('keydown', press, true); el.addEventListener('pointerdown', press); raf = requestAnimationFrame(draw);
  });
}
async function hubCup(fromFestival) {
  if (!sim.hubCupDay(S)) return ui.toast(story.HUB_CUP_LINES.arenaShut, 3600);
  if (S.flags['hubcup_y' + S.cal.year]) return ui.toast(story.HUB_CUP_LINES.played, 3200);
  mode = 'talk'; if (!fromFestival) await ui.say([{ who: 'kestrel', text: 'Five throws. Let go as it crosses the hoop. Do not chase the ball.' }]);
  window.__hubcup = true; const phases = await hubCupThrows(); window.__hubcup = false;
  const r = sim.playHubCup(S, phases); if (!r.ok) { mode = 'play'; return ui.toast(r.msg); }
  const H = story.HUB_CUP_LINES, rows = r.rivals.map((x) => `${NPCS[x.id].short || NPCS[x.id].name} ${x.score}`).join(', ');
  await ui.say([{ who: 'narrator', text: `Your throws: ${r.throws.join(', ')}. ${r.score} points. ${rows}.` }, ...(r.place === 1 ? H.win : r.place <= 3 ? H.place : H.try), { who: 'narrator', text: r.msg }]);
  mode = 'play'; sfx('good'); if (r.place === 1) ui.celebrate(`🏆 You won the Hub Cup! ${r.prize} cr, and the cup itself.`); refreshHud();
}
async function vaultDoor() {
  if (S.flags.ld_vault) return ui.say([{ who: 'narrator', text: story.VAULT.after }]);
  const v = sim.vaultReady(S);
  if (!v.ok) {
    mode = 'talk'; await ui.say([{ who: 'narrator', text: story.LOWER.vault }, ...(v.key || v.power || v.drained || S.flags.ld_reactor ? [{ who: 'narrator', text: `${story.LOWER.vaultWait} ${v.key ? '✓' : '✗'} Venn's code · ${v.power ? '✓' : '✗'} a feed from the Works · ${v.drained ? '✓' : '✗'} the sill drained by the gallery pump.` }] : [])]); mode = 'play';
    if (!(S.lower && S.lower.logs && S.lower.logs.ninefold != null)) await readLog({ log: 'ninefold' });
    return;
  }
  busy = true; await ui.fade(true, 700); busy = false;
  const r = sim.openVault(S); if (!r.ok) { ui.fade(false, 300); return ui.toast(r.msg); }
  await refreshLower();
  const guests = [];   // Venn, Agnes and Marrow stand at the door with her for the opening
  [['venn', -1.4, -0.2], ['thorne', 1.4, -0.2], ['marrow', 2.6, 0.4]].forEach(([id, dx, dy]) => { if (W.actors.has(id)) return; const a = new Actor(W, id, lookOf(id), { tall: 1.5 }); a.x = me.x + dx; a.y = me.y + dy; a.dir = 1; W.actors.set(id, a); guests.push(id); });
  ui.fade(false, 700); mode = 'talk'; setMood({ festival: null });
  await ui.say(story.VAULT.open);
  for (const id of ['ninefold_report', 'the_roll', 'agnes_letter']) { const L = story.LOGS[id]; await ui.say([{ who: 'narrator', text: `${L.author}: “${L.title}”.` }, { who: 'narrator', text: L.text }]); }
  for (const id of guests) { const a = W.actors.get(id); if (a && !npcs.has(id)) { a.dispose(); W.actors.delete(id); } }
  mode = 'play'; sfx('good'); ui.celebrate('The vault is open. Every log is in your journal, and a slice of ring three is yours. Max stamina +10.'); refreshHud();
}
async function refreshLower() { if (map && map.under) { const at = { map: 'lower', x: me.x, y: me.y, dir: me.dir }; await go(at, { quick: true }); } }
// A cellar cask (sim.caskInfo): hold a cheese, honey or grape juice to put it in; E on a full one reads its age and draws it out.
function caskProbe(p) {
  const info = sim.caskInfo(S, p.cask); if (!info) return null;
  const held = sim.selected(S);
  if (info.empty) return held && sim.cellarGood(held.id) ? { label: `Put the ${ITEMS[held.id].name.toLowerCase()} in the cask`, run: () => { const r = sim.caskPut(S, p.cask, held.id); ui.toast(r.msg, 3600); if (r.ok) { sfx('drop'); W.puff(p.x + 0.5, p.y + 0.5, 0xc8a070, 6, 0.6); } refreshHud(); } }
    : { label: 'An empty oak cask', run: () => ui.toast('Hold a cheese, a goat cheese, a jar of honey or a grape juice to lay it down in the cask.', 3600) };
  const wait = info.next ? ` · ${info.tier ? 'vintage' : 'aged'} in ${info.next} day${info.next > 1 ? 's' : ''}` : ' · vintage';
  return { label: `${info.name} (${info.days} day${info.days === 1 ? '' : 's'}${wait})`, run: async () => {
    if (info.tier < 2) { mode = 'talk'; const i = await ui.choose(`${info.name}, ${info.days} day${info.days === 1 ? '' : 's'} in the cask`, info.tier ? [`Draw out the ${info.name.toLowerCase()} now`, `Leave it to become vintage (${info.next} more day${info.next > 1 ? 's' : ''})`] : [`Leave it to age (${info.next} more day${info.next > 1 ? 's' : ''})`, 'Take it back out anyway']); mode = 'play'; if (i !== (info.tier ? 0 : 1)) return; }
    const r = sim.caskTake(S, p.cask); ui.toast(r.msg, 3600); if (r.ok) { sfx(r.tier ? 'good' : 'pick'); if (r.tier === 2) floatText(p.x + 0.5, p.y + 0.5, 'vintage!'); } refreshHud(); } };
}
function pumpProbe(p) {
  const id = p.pump, run = sim.lowerDone(S, id), rep = sim.PUMP_REPAIRS.find((q) => q.id === id);
  if (run) return { label: `${p.label}: running`, run: () => ui.toast(story.LOWER.pumpRunning) };
  if (!rep) return { label: `Look at ${p.label.toLowerCase()}`, run: () => ui.toast(story.LOWER.pumpBroken + ' (The Pump Halls project at the terminal restarts it.)', 4200) };
  return { label: `Fit ${rep.parts} pump parts to ${p.label.toLowerCase()} (you have ${sim.countItem(S, 'pump_part')})`, run: async () => { const r = sim.repairPump(S, id); ui.toast(r.msg, 4200); if (r.ok) { sfx('good'); W.shake = 0.15; await refreshLower(); } } };
}
function drawBeds() {
  for (let i = 0; i < sim.MUSHROOM_BEDS; i++) W.unplace('bed' + i);
  for (const b of (S.lower && S.lower.beds) || []) { const p = map.props.find((q) => q.bed === b.bed); if (!p) continue; const c = sim.MUSHROOM_CROPS[b.id]; W.place('bed' + b.bed, null, p.x + 1, p.y + 0.5, { procKind: 'shrooms', id: b.id, stage: Math.min(3, Math.floor(b.age / c.days * 3)) }); }
}
function bedProbe(p) {
  const k = sim.bedAt(S, p.bed), b = k >= 0 ? S.lower.beds[k] : null, s = sim.selected(S);
  if (!S.flags.ld_catacombs) return { label: 'A rotten growing bed', run: () => ui.toast(story.LOWER.bedRotten) };
  if (sim.bedRipe(b)) return { label: `Pick the ${ITEMS[b.id].name.toLowerCase()}${sim.basketHeld(S) ? ' into the basket' : ''}`, run: () => { const r = sim.harvestBed(S, p.bed); if (r.ok) { sfx('pick'); pickedToast(r); drawBeds(); if (r.spent) ui.toast('The bed is spent. Plant a new spore bag.', 2400); } else ui.toast(r.msg); refreshHud(); } };
  if (!b && s && s.id === 'spore_bag') return { label: 'Plant the spore bag in this bed', run: () => { const r = sim.plantBed(S, p.bed); ui.toast(r.msg); if (r.ok) { sfx('drop'); drawBeds(); } refreshHud(); } };
  if (!b) return { label: 'An empty catacomb bed', run: () => ui.toast(story.LOWER.bedEmpty + ' Spore bags: Venn\'s bench, or Seln\'s store.') };
  const c = sim.MUSHROOM_CROPS[b.id]; return { label: `Catacomb bed ${p.bed + 1}`, run: () => ui.toast(`${ITEMS[b.id].name}: ${Math.max(0, c.days - b.age)} more day(s). The dark does the watering.`) };
}
// The school's pupils on a school day (Moth is a villager; the others sit at the other desks).
let pupils = [];
const PUPIL_LOOK = [{ skin: '#7a4a32', hair: '#1a1410', top: '#e07a5f', bottom: '#3d5a80', style: 'short' }, { skin: '#f0c8a8', hair: '#c8a050', top: '#7ab8e0', bottom: '#4a4a5a', style: 'long' }, { skin: '#e8c0a0', hair: '#6a3a20', top: '#9fd08a', bottom: '#5a4a3a', style: 'bob' }, { skin: '#a06a4a', hair: '#2a1a14', top: '#f2c230', bottom: '#3a4a6a', style: 'bun' }, { skin: '#d8a888', hair: '#3a2a20', top: '#c89cff', bottom: '#3a3a4a', style: 'short' }];
function spawnPupils() {
  pupils = []; if (!sim.schoolDay(S) || !map.pupilDesks) return;
  sim.PUPILS.filter((n) => n !== 'moth').forEach((name, i) => { const [x, y] = map.pupilDesks[i], a = new Actor(W, 'pupil' + i, PUPIL_LOOK[i % PUPIL_LOOK.length], { tall: 1.08 }); a.x = x; a.y = y; a.dir = 1; W.actors.set('pupil' + i, a); pupils.push({ a, name }); });
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
  if (!h) return { label: `Hydroponic tower ${p.tower + 1}`, run: () => ui.toast('Rent this tower from Seln\'s store (300 cr for the season).') };
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
  if (map.city) return drawCity();
  const m = S.mine; monsters = []; bolts = []; dashT = 0;
  for (let i = 0; i < m.cells.length; i++) { const c = m.cells[i], x = (i % m.w) + 1.5, y = Math.floor(i / m.w) + 1.5; W.unplace('r' + i); if (c === 1) { const g = W.place('r' + i, m.mode === 'belt' ? 'asteroid' : 'rubble', x, y, { scale: 0.9 + (i % 4) * 0.08, seed: i }); if (i === m.star) g.add(W.proc('starglow')); } else if (c === 2) W.place('r' + i, m.mode === 'belt' ? 'buoy' : 'stairs', x, y); W.unplace('hz' + i); if (m.haz && m.haz[i]) W.place('hz' + i, 'haze', x, y, { hazard: m.haz[i] }); }
  debris = []; if (m.mode === 'belt') for (let k = 0; k < 4; k++) { const o = W.place('debris' + k, 'asteroid', 2 + Math.random() * (m.w - 2), 2 + Math.random() * (m.h - 2), { seed: 50 + k, scale: 0.6 }); debris.push({ o, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8 }); }
  const depth = m.depth || 1;
  m.monsters.forEach((ref, k) => {
    const big = ref.kind === 'crawler' && depth >= 4 && k % 3 === 0;
    const kind = big && art.hasModel('crawler_big') ? 'crawler_big' : ref.kind;
    const o = W.place('mon' + k + '_' + Math.random(), kind, ref.x + 1.5, ref.y + 1.5, { scale: big && kind === 'crawler' ? 1.5 : 1 });
    const mon = { ref, o, kind: ref.kind, big, x: ref.x + 1.5, y: ref.y + 1.5, hp: ref.hp + (big ? 2 : 0), wob: Math.random() * 6, state: 'wander', t: Math.random() * 2, squash: 0, shotT: 1.5 + Math.random() * 2 };
    mon.max = mon.hp; hpBar(mon); monsters.push(mon);
  });
}
function popMonster(mon) {
  const i = S.mine ? S.mine.monsters.indexOf(mon.ref) : -1; const r = i >= 0 ? sim.defeatMonster(S, i) : { gained: [] };
  W.puff(mon.x, mon.y, 0xffb347, 18, 0.5); W.puff(mon.x, mon.y, 0x7dffb0, 8, 0.8); W.shake = Math.max(W.shake || 0, 0.12);
  const k = W.facers.indexOf(mon.barG); if (k >= 0) W.facers.splice(k, 1);
  W.dyn.remove(mon.o); W.unface(mon.o); W.tileObjs.delete('mon' + (mon.ref.id ?? '')); monsters.splice(monsters.indexOf(mon), 1); sfx('pop'); floatText(mon.x, mon.y, pick(mon.kind === 'glow_slime' || mon.kind === 'smog_wraith' ? ['fizzle!', 'pff…', 'blorp'] : mon.kind === 'spore_brute' ? ['it flees!', 'stomp… stomp… gone'] : ['pop!', 'poof', 'shoo!', 'it flees!']));
  ui.gainedToast(r.gained); if (r.credits) floatText(mon.x, mon.y + 0.3, `+${r.credits} cr`); if (Math.random() < 0.35) ui.toast(pick(story.RUINS.monster));
  for (const ref of r.spawned || []) { const q = cityMonsterObj(ref); q.state = 'chase'; floatText(q.x, q.y, 'split!'); }
  refreshHud();
}
function hurtMonster(mon, dmg, fromX, fromY) {
  if (mon.armour && dmg < 2) { dmg *= 0.5; floatText(mon.x, mon.y, 'clank'); }   // a rust-crawler's shell: bolts glance off, the sabre bites
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
  for (const mon of [...monsters]) { const ex = mon.x - me.x, ey = mon.y - me.y, d = Math.hypot(ex, ey); if (d < 1.9 + 0.25 * sim.pallasLevel(S, 'sabre') && (ex * dx + ey * dy) / (d || 1) > -0.1) { hurtMonster(mon, sim.pallasStat(S, 'sabre'), me.x, me.y); hit++; } }
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
function satoHit(fromX, fromY, mon) {
  if (hurtT > 0 || dashT > 0 || cityTowing) return false;
  hurtT = 1.4; const r = mon && mon.ref && map.city ? sim.monsterHit(S, mon.kind, mon.ref.zone) : sim.monsterHit(S); if (!map.city || Math.random() < 0.3) ui.toast(r.msg); hullBar(map.city); if (r.out) { cityTow(); return true; } W.shake = 0.2; sfx('bad');
  const d = Math.hypot(me.x - fromX, me.y - fromY) || 1; for (let k = 0; k < 6; k++) { const nx = me.x + (me.x - fromX) / d * 0.12, ny = me.y + (me.y - fromY) / d * 0.12; if (canStand(nx, ny)) { me.x = nx; me.y = ny; } }
  refreshHud(); return true;
}
function pallasDash() { if (dashCd > 0) return; dashCd = sim.pallasStat(S, 'thrusters'); dashT = 0.2; W.puff(me.x, me.y, 0x9fd8ee, 10, 0.3); sfx('zap'); }
let debris = [], hazT = 0, hazWarned = false;
function ruinsTick(dt) {
  if (map.belt) return beltTick(dt);
  if (map.city) { if (!S.mine || S.mine.mode !== 'city' || cityTowing) return; cityTick(dt); }
  hurtT -= dt; fireCd -= dt; slashCd -= dt; hydraCd -= dt; dashCd -= dt; dashT -= dt;
  if (me.group) me.group.visible = !(hurtT > 0 && Math.floor(hurtT * 12) % 2);
  for (const mon of [...monsters]) {
    const ex = me.x - mon.x, ey = me.y - mon.y, d = Math.hypot(ex, ey) || 0.01; if (map.city && d > 26) { mon.wob += dt; const hx = mon.home[0] - mon.x, hy = mon.home[1] - mon.y, far = hx * hx + hy * hy > 9, nx = mon.x + (far ? Math.sign(hx) : Math.cos(mon.wob * 0.4)) * 0.3 * dt, ny = mon.y + (far ? Math.sign(hy) : Math.sin(mon.wob * 0.5)) * 0.3 * dt; if (!blocked(nx, ny) && !inCamp(nx, ny)) { mon.x = nx; mon.y = ny; } mon.state = 'wander'; mon.o.position.set(mon.x, mon.drain ? 0.25 + Math.sin(mon.wob * 2.2) * 0.12 : 0, mon.y); continue; }   // far away: a slow idle amble near home
    mon.wob += dt; mon.t -= dt;
    let sp = 0, tx = 0, ty = 0;
    if (mon.kind === 'drone') {                                            // drones keep their distance and lob slow orbs
      if (d < 7) { const want = d < 3 ? -1 : d > 4.5 ? 1 : 0; tx = ex / d * want + Math.cos(mon.wob) * 0.6; ty = ey / d * want + Math.sin(mon.wob * 1.3) * 0.6; sp = 1.3; mon.shotT -= dt; if (mon.shotT <= 0) { mon.shotT = 2.4 + Math.random(); spawnBolt(mon.x, mon.y, ex, ey, 'enemy'); floatText(mon.x, mon.y, '!'); } }
      else { tx = Math.cos(mon.wob * 0.5); ty = Math.sin(mon.wob * 0.6); sp = 0.4; }
    } else if (mon.drain) {                                                // smog-wraiths drift up close and drink the Pallas's charge
      if (d < (mon.sight || 7)) { const want = d > 1.1 ? 1 : 0; tx = ex / d * want + Math.cos(mon.wob * 2) * 0.3; ty = ey / d * want + Math.sin(mon.wob * 2.3) * 0.3; sp = mon.spd || 1.1; mon.shotT -= dt; if (d < 1.7 && mon.shotT <= 0) { mon.shotT = 1.3; const r = sim.monsterHit(S, mon.kind, mon.ref.zone); floatText(me.x, me.y, '−charge'); sfx('geiger'); hullBar(true); refreshHud(); if (r.out) cityTow(); } }
      else { tx = Math.cos(mon.wob * 0.5); ty = Math.sin(mon.wob * 0.6); sp = 0.4; }
    } else if (mon.state === 'wander') { const hx = mon.home ? mon.home[0] - mon.x : 0, hy = mon.home ? mon.home[1] - mon.y : 0, far = Math.hypot(hx, hy) > 5; tx = far ? hx : Math.cos(mon.wob * 0.7); ty = far ? hy : Math.sin(mon.wob * 0.9); if (far) { const l = Math.hypot(tx, ty); tx /= l; ty /= l; } sp = 0.45; if (d < (mon.sight || 6)) { mon.state = 'chase'; floatText(mon.x, mon.y, '!'); } }
    else if (mon.state === 'chase') { tx = ex / d; ty = ey / d; sp = mon.spd || (mon.big ? 1.0 : 1.45); if (d < (mon.big ? 2.0 : 1.7)) { mon.state = 'windup'; mon.t = mon.big ? 0.8 : 0.5; mon.lx = ex / d; mon.ly = ey / d; } if (d > (mon.sight || 6) + 3) mon.state = 'wander'; }
    else if (mon.state === 'windup') { if (mon.t <= 0) { mon.state = 'lunge'; mon.t = 0.28; } }
    else if (mon.state === 'lunge') { tx = mon.lx; ty = mon.ly; sp = mon.big ? 5 : 6.5; if (d < (mon.big ? 1.2 : 0.8)) { satoHit(mon.x, mon.y, mon); mon.state = 'rest'; mon.t = 0.9; } else if (mon.t <= 0) { mon.state = 'rest'; mon.t = 0.8; } }
    else if (mon.t <= 0) mon.state = 'chase';                              // rest or stun
    if (sp) { const nx = mon.x + tx * sp * dt, ny = mon.y + ty * sp * dt; if (!blocked(nx, mon.y) && !inCamp(nx, mon.y)) mon.x = nx; if (!blocked(mon.x, ny) && !inCamp(mon.x, ny)) mon.y = ny; if (mon.o.userData.is3d && (tx || ty)) mon.o.rotation.y = Math.atan2(tx, ty); }
    mon.squash = Math.max(0, mon.squash - dt * 5); const q = 1 + Math.sin(mon.squash * 9) * mon.squash * 0.25;
    mon.o.scale.set(q, 1 / q, q);
    mon.o.position.set(mon.x, mon.drain ? 0.25 + Math.sin(mon.wob * 2.2) * 0.12 : mon.state === 'windup' ? Math.abs(Math.sin(mon.t * 40)) * 0.06 : 0, mon.y);   // smog-wraiths hover and bob
  }
  if (hydra) {                                                              // the Hydra: a short-range auto-turret
    hydra.cd -= dt;
    let best = null, bd = 6.5 + 1.5 * sim.pallasLevel(S, 'hydra'); for (const mon of monsters) { const d = Math.hypot(hydra.x - mon.x, hydra.y - mon.y); if (d < bd) { bd = d; best = mon; } }
    if (best) { hydra.o.rotation.y = Math.atan2(best.x - hydra.x, best.y - hydra.y); if (hydra.cd <= 0) { hydra.cd = sim.pallasStat(S, 'hydra'); spawnBolt(hydra.x, hydra.y, best.x - hydra.x, best.y - hydra.y, 'hydra'); } }
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i]; if (b.from === 'fx') { b.life -= dt; b.m.material.opacity = Math.max(0, b.life * 5); if (b.life <= 0) { W.scene.remove(b.m); bolts.splice(i, 1); } continue; }
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.m.position.x = b.x; b.m.position.z = b.y;
    let dead = b.life <= 0 || map.solid(b.x, b.y);
    if (!dead && b.from !== 'enemy') for (const mon of monsters) if (Math.hypot(mon.x - b.x, mon.y - b.y) < (mon.big ? 0.65 : 0.5)) { hurtMonster(mon, b.from === 'pallas' ? sim.pallasStat(S, 'coil') : 1, b.x - b.vx * 0.05, b.y - b.vy * 0.05); dead = true; break; }
    if (!dead && b.from === 'enemy' && Math.hypot(me.x - b.x, me.y - b.y) < 0.55) { satoHit(b.x - b.vx, b.y - b.vy, b.mon); dead = true; }
    if (dead) { W.scene.remove(b.m); if (b.life > 0) W.puff(b.x, b.y, b.from === 'enemy' ? 0xff6a5a : 0xfff2b8, 4, 0.6); bolts.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- the Old World city ruins (one big map a trip, 2026-11-20)
// Sato walks her Pallas round a ruined city from the shuttle's landing pad (sim.cityLayout). The small things in the
// streets (cars, buses, rubble, lockers, safes, counters, billboards, debris, gas, pool bubbles) are placed only near
// her (cityStream) and the creatures only think when she is within reach. The hull bar sits under the place name.
const CITY_PROP = { 3: 'ruin_car', 4: 'ruin_bus', 5: 'ruin_rubble', 8: 'ruin_billboard', 10: 'ruin_locker', 11: 'ruin_vault', 12: 'shop_counter', 13: 'ruin_vault', 14: 'ruin_debris' };
const SPOT_LABEL = { rubble: 'Search the rubble', car: 'Search the car', bus: 'Search the bus', counter: 'Check the shop counter', locker: 'Open the locker', safe: 'Crack the safe', vault: 'Open the sealed vault' };
let cityPlaced = new Set(), cityAt = [1e9, 1e9], cityZoneNow = -1, hazTick = 1, hullWarned = 0, cityTowing = false;
function hullBar(on) {
  let e = $('hHull');
  if (!e && on) { const p = $('hPlace'); if (!p) return; e = document.createElement('div'); e.id = 'hHull'; e.style.cssText = 'height:7px;width:150px;max-width:60vw;margin:3px 0 0;border-radius:4px;background:rgba(20,16,12,.55);overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.35)'; e.innerHTML = '<i style="display:block;height:100%;width:100%;background:#7dffb0;transition:width .3s"></i>'; p.insertAdjacentElement('afterend', e); }
  if (!e) return; e.hidden = !on; if (!on || !S.mine) return;
  const k = Math.max(0, S.mine.hull / S.mine.hullMax), f = e.firstChild; f.style.width = Math.round(k * 100) + '%'; f.style.background = k < 0.25 ? '#ff6a5a' : k < 0.5 ? '#ffd36a' : '#7dffb0';
}
function cityPlace(i) {
  const m = S.mine, c = m.cells[i], x = i % m.w, y = Math.floor(i / m.w), kind = CITY_PROP[c];
  if (x === 0 || y === 0 || x === m.w - 1 || y === m.h - 1) return;   // the edge ring is drawn by the backdrop, not as a row of slabs
  if (c === 4) { if (m.cells[i - m.w] === 4) return; W.place('cy' + i, kind, x + 1.5, y + 2.5, { w: 1, d: 3, seed: i }); }
  else if (kind) { const o = W.place('cy' + i, kind, x + 1.5, y + 1.5, { seed: i, scale: c === 11 ? 0.7 : 1 }); if (c === 5 || c === 14) o.rotation.y = i % 6; }   // billboards, lockers, counters, safes and the vault face +Z, towards the camera
  else if (c === 6) W.place('cy' + i, 'toxic_pool', x + 1.5, y + 1.5, { seed: i, scale: 1.05 + (i % 3) * 0.05 });
  else if (c === 7 && ((i * 2654435761 >>> 28) < 6 || ((x + y) % 2 === 0 && [1, -1, m.w, -m.w].some((d) => m.cells[i + d] !== 7)))) { const o = W.place('cy' + i, 'weed', x + 1.2 + (i % 5) * 0.12, y + 1.2 + (i % 7) * 0.09, { scale: 0.7 + (i % 4) * 0.15 }); o.rotation.y = i; }   // tufts in the overgrowth   // tufts, thicker along the moss's edges to soften them
  else if (m.haz[i] && (x + y) % 2 === 0) W.place('cy' + i, 'haze', x + 1.5, y + 1.5, { hazard: 1 });
  else return;
  cityPlaced.add(i);
  const s = m.spots.find((q) => q.i === i), sy = y + (c === 4 ? 2.5 : 1.5);
  if (s && s.open) { W.place('cs' + i, 'searched_mark', x + 1.5, sy); emptied(W.tileObjs.get('cy' + i)); }
  else if (s) W.place('cg' + i, 'spot_glint', x + 1.5, sy, { gold: s.kind === 'safe' || s.kind === 'vault' });
}
function cityStream(force) {
  const m = S.mine; if (!m || (!force && Math.hypot(me.x - cityAt[0], me.y - cityAt[1]) < 3)) return; cityAt = [me.x, me.y];
  const R = 19, cx = me.x - 1, cy = me.y - 1;
  for (const i of [...cityPlaced]) { const x = i % m.w, y = Math.floor(i / m.w); if (Math.abs(x - cx) > R + 4 || Math.abs(y - cy) > R + 4) { W.unplace('cy' + i); W.unplace('cs' + i); W.unplace('cg' + i); cityPlaced.delete(i); } }
  for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(m.h - 1, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(m.w - 1, cx + R); x++) { const i = y * m.w + x; if (!cityPlaced.has(i)) cityPlace(i); }
}
function cityMonsterObj(ref) {
  const o = W.place('mon' + ref.id, ref.kind, ref.x + 1.5, ref.y + 1.5, { small: !!ref.small, scale: ref.small ? 0.6 : 1 });
  const mon = { ref, o, kind: ref.kind, big: ref.boss, x: ref.x + 1.5, y: ref.y + 1.5, hp: ref.hp, max: ref.hp, wob: Math.random() * 6, state: 'wander', t: Math.random() * 2, squash: 0, shotT: 1, spd: ref.speed * (ref.small ? 1.3 : 1), sight: ref.sight, drain: ref.drain, armour: ref.armour, home: [ref.x + 1.5, ref.y + 1.5] };
  hpBar(mon); if (ref.boss) mon.barG.position.y = 2.0; else if (ref.float) mon.barG.position.y = 1.55; monsters.push(mon); return mon;
}
function drawCity() {
  const m = S.mine; monsters = []; bolts = []; dashT = 0; debris = []; cityPlaced = new Set(); cityAt = [1e9, 1e9]; cityZoneNow = -1; hullWarned = 0; cityTowing = false;
  for (const ref of m.monsters) cityMonsterObj(ref);
  drawCamps(); cityStream(true); hullBar(true);
}
function cityTick(dt) {
  const m = S.mine; if (!m || cityTowing) return;
  cityStream(false);
  const r = sim.cityMove(S, me.x - 1, me.y - 1);
  if (r.ok && (r.changed || cityZoneNow < 0)) { if (cityZoneNow >= 0) { ui.toast(r.first ? story.RUINS.zoneFirst[r.zone] : story.RUINS.zone[r.zone], r.first ? 4600 : 2600); if (r.first) sfx('good'); } cityZoneNow = r.zone; refreshHud(); }
  hazTick -= dt;
  if (hazTick <= 0) {
    hazTick = 1; const h = sim.cityHazard(S, Math.floor(me.x) - 1, Math.floor(me.y) - 1);
    if (h.drained) { sfx('geiger'); floatText(me.x, me.y, h.hazard === 2 ? 'sizzle' : '−hull'); if (!hazWarned) { hazWarned = true; ui.toast(story.SHUTTLE.haze, 4200); } }
    if (h.drained || h.filtered) hullBar(true);
    if (h.out) return cityTow();
  }
  for (const k of [50, 25]) if (m.hull <= m.hullMax * k / 100 && hullWarned < 100 - k) { hullWarned = 100 - k; ui.toast(story.SHUTTLE.hull[k], 4200); sfx('bad'); }
}
async function cityTow() {
  if (cityTowing) return; cityTowing = true;
  const r = sim.cityHome(S, 'tow'); if (!r.ok) { cityTowing = false; return; }
  hullBar(false); sfx('bad'); busy = true; await ui.fade(true, 500); busy = false; mode = 'talk';
  await ui.say([{ who: 'narrator', text: story.SHUTTLE.tow }, { who: 'narrator', text: r.msg }, { who: 'narrator', text: story.SHUTTLE.tally(r.credits, r.finds) }]); mode = 'play';
  await go({ map: 'central', x: 7.5, y: 16.5, dir: 0 });
}
function cityProbe(tx, ty) {
  const m = S.mine, cx = tx - 1, cy = ty - 1;
  sim.cityMove(S, me.x - 1, me.y - 1); const ck = sim.campNear(S);
  if (ck >= 0) return m.camps[ck].built ? { label: 'Use the camp (sleep, save, fly home)', run: useCamp } : { label: `Build a camp here (${sim.CAMP_COST.scrap} scrap, ${sim.CAMP_COST.credits} cr)`, run: makeCamp };
  let s = sim.citySpotAt(S, cx, cy);
  if (!s) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { s = sim.citySpotAt(S, Math.floor(me.x) - 1 + dx, Math.floor(me.y) - 1 + dy); if (s && !s.open) break; s = null; }
  if (s && !s.open) { const x = s.i % m.w, y = Math.floor(s.i / m.w); return { label: SPOT_LABEL[s.kind], run: () => citySearch(x, y) }; }
  const p = propAt(tx, ty) || propAt(Math.floor(me.x), Math.floor(me.y)) || (Math.hypot(me.x - m.pad[0] - 1.5, me.y - m.pad[1] - 1.5) < 3.2 ? { act: 'liftup' } : null);
  if (p && p.act === 'liftup') return { label: 'Board the shuttle home', run: leaveRuins };
  if (s && s.open) return { label: 'Already searched', run: () => ui.toast('You have been through that already.') };
  return null;
}
// Safe spots: creatures never step inside CAMP_R of one. A camp built there lets Sato sleep, save or fly home.
const inCamp = (x, y) => !!(map && map.city && S.mine && S.mine.camps && S.mine.camps.some((c) => Math.hypot(c.x + 1.5 - x, c.y + 1.5 - y) < sim.CAMP_R));
function drawCamps() { for (const [k, c] of (S.mine.camps || []).entries()) { W.place('campspot' + k, 'camp_spot', c.x + 1.5, c.y + 1.5, { kind: c.kind }); if (c.built) W.place('camp' + k, 'camp', c.x + 1.5, c.y + 1.5); else W.unplace('camp' + k); } }
function makeCamp() { const r = sim.buildCamp(S); ui.toast(r.msg, 4200); if (r.ok) { sfx('good'); W.puff(me.x, me.y, 0xffa040, 14, 0.5); drawCamps(); } refreshHud(); }
async function useCamp() {
  mode = 'talk'; const i = await ui.choose(`Sato's camp (${{ plaza: 'a cleared plaza', rooftop: 'a rooftop', bunker: 'a shielded bunker entrance' }[S.mine.camps[sim.campNear(S)].kind]})`, ['Sleep until morning (mends the hull; the farm runs as usual)', 'Save the game (loading resumes here, at the camp)', 'Fly home: the Pallas transforms (no penalty)', 'Not yet']); mode = 'play';
  if (i === 0) await night(false, true);
  else if (i === 1) { sim.campSave(S); save(true); ui.toast('Saved at the camp. Loading this save resumes here.'); }
  else if (i === 2) await flyHome();
}
// The Pallas folds into its flight form (crouch, a flash, wings out), lifts off, banks and climbs away; the camera follows,
// then the screen fades and she lands at the space dock with everything she found. About 3.5 s; E or Space skips it.
async function flyHome() {
  if (sim.campNear(S) < 0) return;
  mode = 'talk'; busy = true; hullBar(false); cityTowing = true;   // (no hazards or hits while she takes off)
  let skip = false; const onKey = (e) => { if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') skip = true; }; addEventListener('keydown', onKey, true); addEventListener('pointerdown', onKey, true);
  me.dir = 1; me.moving = false;                                                                          // nose to the north
  const g = me.group, x0 = me.x, y0 = me.y, T = 3.9, jet = W.place('pallasJet', 'pallas_jet', x0, y0); jet.visible = false;
  if (art.hasModel('pallas_jet')) jet.rotation.y = Math.PI;                                                      // the model's nose is +Z, the climb goes −Z
  const fold = pallasFold(me), wings = () => jet.children[0] && jet.children[0].userData.wings; let t = 0, last = performance.now(), flashed = false;
  window.__farmFly = 0;
  while (t < T && !skip) {
    await new Promise((r) => requestAnimationFrame(r)); const now = performance.now(); if (!window.__farmFlyHold) t += Math.min(0.1, (now - last) / 1000); last = now; window.__farmFly = t;   // (__farmFlyHold: a test hook that pauses it for screenshots)
    if (t < 1.5) { fold.pose(t / 1.35, (t - 0.95) / 0.45); if (t > 0.3 && Math.random() < 0.25) W.puff(x0 + (Math.random() - 0.5) * 0.8, y0, 0xdfe6ea, 1, 0.3); }   // legs fold, arms sweep back, the body levels, wings out
    else if (!flashed) { flashed = true; fold.pose(1, 1); W.puff(x0, y0, 0xffffff, 18, 1.0); W.puff(x0, y0, 0x8ff4ff, 10, 1.1); W.shake = 0.1; sfx('zap'); g.visible = false; jet.visible = true; jet.scale.setScalar(0.9); }   // a brief flash: the jet takes over
    if (t >= 1.5) {
      const k = Math.min(1, (t - 1.5) / 0.25), w = wings(); jet.scale.setScalar(0.9 + 0.1 * k); if (w) w.scale.set(1, 1, 1);
      const f = Math.max(0, t - 1.75); jet.position.set(x0 + Math.sin(f * 1.4) * f * 0.8, 0.9 + f * f * 1.6, y0 - f * f * 3.2);
      jet.rotation.set(-Math.min(0.45, f * 0.35), (art.hasModel('pallas_jet') ? Math.PI : 0) + Math.sin(f * 1.4) * 0.25, Math.sin(f * 1.6) * 0.6);   // climb and bank
      me.y = Math.max(2, y0 - f * f * 2.6);                                                                               // the camera follows a little
      if (f > 0 && Math.random() < 0.7) W.puff(jet.position.x, jet.position.z + 0.6, Math.random() < 0.5 ? 0x8ff4ff : 0xffffff, 2, jet.position.y + 0.1);   // an engine trail
    }
  }
  removeEventListener('keydown', onKey, true); removeEventListener('pointerdown', onKey, true);
  await ui.fade(true, 450); W.unplace('pallasJet'); fold.restore(); g.visible = true; me.x = x0; me.y = y0;
  sim.cityMove(S, x0 - 1, y0 - 1); const r = sim.cityHome(S, 'fly'); busy = false;
  if (!r.ok) { cityTowing = false; await ui.fade(false, 300); mode = 'play'; return ui.toast(r.msg); }
  sfx('door'); await ui.say([{ who: 'narrator', text: r.msg }, { who: 'narrator', text: story.SHUTTLE.tally(r.credits, r.finds) }]); mode = 'play';
  await go({ map: 'central', x: 7.5, y: 16.5, dir: 0 });
}
// A searched spot looks emptied: its prop goes grey and dim (again a moment later, for a model that loads late).
function emptied(o) { if (!o) return; const go = () => o.traverse((q) => { if (q.isMesh && q.material && !q.userData.emptied) { q.material = q.material.clone(); if (q.material.color) q.material.color.multiplyScalar(0.42); q.userData.emptied = true; } }); go(); setTimeout(go, 700); setTimeout(go, 2000); }
// R on Earth (when not holding food): the Pallas pings the treasure within 16 tiles, a column of light over each for a moment. 8 s cooldown.
let scanCd = 0;
function cityScan() {
  const now = performance.now(); if (now < scanCd) return ui.toast(`The scanner is recharging (${Math.ceil((scanCd - now) / 1000)} s).`, 1200);
  scanCd = now + 8000 - 2000 * sim.pallasLevel(S, 'scanner'); const m = S.mine, range = sim.pallasStat(S, 'scanner'); let n = 0; sfx('zap');
  for (const s of m.spots) { if (s.open) continue; const x = s.i % m.w + 1.5, y = Math.floor(s.i / m.w) + (m.cells[s.i] === 4 ? 2.5 : 1.5); if (Math.hypot(x - me.x, y - me.y) > range) continue; n++; const gold = s.kind === 'safe' || s.kind === 'vault'; for (let k = 0; k < 3; k++) setTimeout(() => W.puff(x, y, gold ? 0xffd36a : 0x8ff4ff, 6, 1.6), k * 380); }
  ui.toast(n ? `Scan: ${n} thing${n > 1 ? 's' : ''} worth searching nearby. Follow the sparkles.` : 'Scan: nothing worth searching within range.', 2600);
}
function citySearch(x, y) {
  const r = sim.searchSpot(S, x, y); if (!r.ok) return ui.toast(r.msg);
  const m = S.mine, i = y * m.w + x, bus = m.cells[i] === 4; me.swing = 1; sfx('dig');
  W.puff(x + 1.5, y + (bus ? 2.5 : 1.5), 0x9a958c, 10, 0.4); W.place('cs' + i, 'searched_mark', x + 1.5, y + (bus ? 2.5 : 1.5)); W.unplace('cg' + i); emptied(W.tileObjs.get('cy' + i));
  if (r.star) { sfx('good'); ui.celebrate(r.msg); }
  if (r.credits) { floatText(x + 1.5, y + 1.5, `+${r.credits} cr`); sfx('pick'); }
  ui.gainedToast(r.gained);
  for (const g of r.gained || []) if (ITEMS[g.id].kind === 'relic' || ITEMS[g.id].kind === 'valuable') { sfx('good'); const t = story.RUINS.relic[g.id] || (story.RUINS.finds && story.RUINS.finds[g.id]); if (t) ui.toast(t, 5200); break; }
  if (r.kind === 'vault') ui.toast(story.RUINS.vault, 5200);
  if (r.msg && !r.star && !(r.gained || []).length && !r.credits) ui.toast(r.msg);
  refreshHud(); hullBar(true); if (r.fainted) night(true);
}

// ---------------------------------------------------------------- the belt (one big open map, in a space suit)
// No creatures out here: Sato flies in a suit, breaks rocks with her hammer (Space or E), and the suit's air runs
// down with distance. Every sector has a lit pickup pod home. F sets down her mining unit (sim.minerDeploy).
let minerT = 0, minerSaid = '', airWarned = 0, lastAt = null;
function drawBelt() {
  const m = S.mine; W.beltField(m); monsters = []; bolts = []; debris = []; minerSaid = ''; airWarned = 0; lastAt = [me.x, me.y];
  for (const p of m.pods) W.place('pod' + p.sector, 'pickup_pod', p.x + 1.5, p.y + 1.5);
  for (let k = 0; k < 5; k++) debris.push({ o: W.place('debris' + k, 'asteroid', me.x, me.y - 40, { seed: 50 + k, scale: 0.55 }), vx: 0, vy: 0, far: true });
  drawMiner();
}
function drawMiner() { W.unplace('miner'); const d = S.mine && S.mine.miner; if (d) { const o = W.place('miner', 'mining_bot', d.x + 1, d.y + 1); o.rotation.y = Math.random() * 6; } }
function beltProbe(tx, ty) {
  if (!S.mine) return null;                                   // between leaving the belt and the next map
  const m = S.mine, cx = tx - 1, cy = ty - 1, i = cy * m.w + cx, c = cx >= 0 && cy >= 0 && cx < m.w && cy < m.h ? m.cells[i] : 0;
  const d = m.miner; if (d && d.hold.length && Math.hypot(d.x + 1 - me.x, d.y + 1 - me.y) < 1.8) return { label: `Empty ${S.miner.name}'s hopper (${d.hold.reduce((a, g) => a + g.n, 0)})`, run: () => { const r = sim.minerCollect(S); ui.gainedToast(r.gained); if (r.msg) ui.toast(r.msg); sfx('pick'); refreshHud(); } };
  if (sim.isRock(c)) {                                       // the rock's size, and what the hammer needs
    const z = sim.ROCK_SIZES[c], lv = S.player.toolLevel.hammer || 1, hits = sim.rockHits(c, lv), left = m.hp[i] ?? hits;
    return { label: hits ? `Break the ${z.name} with the hammer (${left} hit${left > 1 ? 's' : ''})` : `A ${z.name}: needs ${z.tier >= 3 ? 'a Starsteel' : 'an Alloy'} hammer (yours is ${['', 'Field', 'Alloy', 'Starsteel'][lv]})`, run: () => hammerRock(cx, cy) };
  }
  const pod = m.pods.find((p) => Math.hypot(p.x + 1.5 - me.x, p.y + 1.5 - me.y) < 2.4) || (c === 6 ? m.pods.find((p) => p.x === cx && p.y === cy) : null);
  if (pod) return { label: `Board the sector ${pod.sector} pickup pod home (15 min)`, run: () => leaveBelt('pod') };
  const p = propAt(tx, ty) || propAt(Math.floor(me.x), Math.floor(me.y));
  if (p && p.act === 'liftup') return { label: 'Fly back into the hangar', run: () => leaveBelt('pad') };
  if (p && p.act === 'sign') return { label: `Look at ${p.label ? p.label.replace(/^A /, 'the ') : 'it'}`, run: () => ui.say([{ who: 'narrator', text: story.BELT.marks[p.mark] || '…' }]) };
  return null;
}
function hammerRock(cx, cy) {
  const r = sim.hitRock(S, cx, cy); me.swing = 1; if (!r.ok) return ui.toast(r.msg);
  sfx(r.broke ? 'dig' : 'chop'); W.puff(cx + 1.5, cy + 1.5, r.kind === 4 ? 0xdff4ff : r.kind === 5 || r.kind === 8 ? 0xffd36a : 0xb9b0a4, r.broke ? (r.kind === 8 ? 26 : 14) : 5, r.kind === 8 ? 0.9 : 0.5); W.shake = Math.max(W.shake || 0, r.broke ? 0.06 : 0.03);
  if (r.broke) { ui.gainedToast(r.gained); if (r.msg && !(r.gained || []).length) ui.toast(r.msg); else if (Math.random() < 0.08) ui.toast(pick(story.BELT.hammer), 2200); } else floatText(cx + 1.5, cy + 1.5, `crack (${r.left})`);
  refreshHud(); if (r.fainted) night(true);
}
function minerToggle() {
  if (!S.miner) return ui.toast('You have no mining unit yet. Ruess leases them at the Workshop (1,200 cr).');
  if (S.mine.miner) { const r = sim.minerRecall(S); W.unplace('miner'); W.puff(me.x, me.y, 0xe0782a, 6, 0.4); ui.gainedToast(r.gained); ui.toast(r.msg); sfx('drop'); return refreshHud(); }
  const [dx, dy] = DIRV[me.dir];
  for (const [ax, ay] of [[dx, dy], [dy, dx], [-dy, -dx], [-dx, -dy], [0, 0]]) {
    const x = Math.floor(me.x + ax * 1.1) - 1, y = Math.floor(me.y + ay * 1.1) - 1; if (S.mine.cells[y * S.mine.w + x] !== 0) continue;
    const r = sim.minerDeploy(S, x, y); ui.toast(r.msg); if (r.ok) { drawMiner(); sfx('drop'); minerT = 2.5; minerSaid = ''; } return refreshHud();
  }
  ui.toast('There is no room to set it down here.');
}
function beltTick(dt) {
  const m = S.mine; if (!m) return;
  // the suit's air goes with distance; a new sector changes the map name, and the first visit is news
  if (Math.hypot(me.x - lastAt[0], me.y - lastAt[1]) > 0.5) {
    lastAt = [me.x, me.y]; const before = Math.ceil(m.air), r = sim.beltMove(S, me.x - 1, me.y - 1);
    if (r.changed) { map.name = `The belt, sector ${r.sector}`; ui.toast(r.milestone ? story.BELT.milestone(r.sector) : r.first ? story.BELT.first(r.sector) : pick(story.BELT.sector), r.first ? 4200 : 2400); if (r.first) sfx('good'); }
    for (const k of [30, 10]) if (r.air <= k && airWarned < 40 - k) { airWarned = 40 - k; ui.toast(story.BELT.air[k], 4200); sfx('bad'); }
    if (r.out) { leaveBelt('tow'); return; }
    if (r.changed || Math.ceil(r.air) !== before) refreshHud();
  }
  for (const d of debris) {                                  // drifting debris near Sato: it nudges her aside, no harm done
    if (!d.stone) d.stone = W.stoneShade(d.o);              // stone grey like the field (the model may load a moment later)
    const ex = me.x - d.o.position.x, ey = me.y - d.o.position.z, dd = Math.hypot(ex, ey);
    if (d.far || dd > 20) { const a = Math.random() * 6.28, r = 9 + Math.random() * 7; d.o.position.set(Math.max(2, Math.min(map.w - 2, me.x + Math.cos(a) * r)), 0.4, Math.max(2, Math.min(map.h - 3, me.y + Math.sin(a) * r))); d.vx = (Math.random() - 0.5) * 0.9; d.vy = (Math.random() - 0.5) * 0.9; d.far = false; continue; }
    d.o.position.x += d.vx * dt; d.o.position.z += d.vy * dt; d.o.rotation.y += dt * 0.4; d.o.position.y = 0.4 + Math.sin(W.t + d.vx * 9) * 0.12;
    if (dd < 0.75) { for (let k = 0; k < 6; k++) { const nx = me.x + ex / (dd || 1) * 0.12, ny = me.y + ey / (dd || 1) * 0.12; if (canStand(nx, ny)) { me.x = nx; me.y = ny; } } d.vx = -d.vx; d.vy = -d.vy; if (Math.random() < 0.3) ui.toast(story.BELT.debris, 1800); }
  }
  const md = m.miner, mo = W.tileObjs.get('miner');
  if (md && mo) {                                            // the mining unit: one rock every few seconds, then it waits for her
    minerT -= dt; const arm = mo.children[0] && mo.children[0].userData.arm;
    if (arm) arm.rotation.x = minerT > 3.6 ? Math.sin(W.t * 40) * 0.15 : 0;
    if (minerT <= 0) {
      minerT = 4.5; const r = sim.minerWork(S);
      if (r.ok) { mo.rotation.y = Math.atan2(r.x + 1.5 - mo.position.x, r.y + 1.5 - mo.position.z); W.puff(r.x + 1.5, r.y + 1.5, 0xb9b0a4, 10, 0.4); sfx('dig'); floatText(mo.position.x, mo.position.z, r.got.length ? '+' + r.got.map((id) => ITEMS[id].name).join(', ') : 'dust'); if (r.swapped) ui.toast(`${S.miner.name} swapped in a charged battery from your rucksack.`, 2400); minerSaid = ''; }
      else if (r.msg !== minerSaid) { minerSaid = r.msg; bubble(mo, r.full ? 'Hopper full! Beep.' : r.flat ? 'Battery flat…' : 'Nothing left in reach.', 3.6); if (r.flat || r.full) ui.toast(r.msg, 3200); }
    }
    if (md.hold.length && Math.hypot(md.x + 1 - me.x, md.y + 1 - me.y) < 1.4) { const r = sim.minerCollect(S); if (r.gained.length) { ui.gainedToast(r.gained); sfx('pick'); refreshHud(); } }
  }
}
async function leaveBelt(how) {
  const r = sim.beltHome(S, how); if (!r.ok) return ui.toast(r.msg);
  sfx('door'); W.unplace('miner');
  if (how !== 'pad') { busy = true; await ui.fade(true, 500); busy = false; mode = 'talk'; await ui.say([{ who: 'narrator', text: how === 'tow' ? story.BELT.tow : story.BELT.pod }]); mode = 'play'; }
  await go({ map: 'hangar', x: 8, y: 7.6, dir: 0 });
}

// ---------------------------------------------------------------- what E and Space would do here
function propAt(tx, ty) { return map.props.find((p) => p.act && !(p.unless && S.flags[p.unless]) && !(p.when && !S.flags[p.when]) && tx >= Math.floor(p.x) && tx < Math.floor(p.x) + p.w && ty >= Math.floor(p.y) && ty < Math.floor(p.y) + p.d); }
function fieldAt(tx, ty) { for (const f of map.fields || []) if (f !== map.field) { const x = tx - f.x, y = ty - f.y, fd = S.fields[f.id]; if (fd && x >= 0 && y >= 0 && x < fd.w && y < fd.h) return { f, x, y, tile: fd.tiles[y * fd.w + x] }; } const f = map.field; if (!f) return null; const x = tx - f.x, y = ty - f.y, fd = S.fields[f.id]; return x >= 0 && y >= 0 && x < fd.w && y < fd.h ? { f, x, y, tile: fd.tiles[y * fd.w + x] } : null; }
function pastureAt(tx, ty) { const P = map.pasture; if (!P) return null; const x = tx - P.x, y = ty - P.y; return x >= 0 && y >= 0 && x < P.w && y < P.h ? { x, y } : null; }
const waterAt = (tx, ty) => map.at(tx, ty) === 'w';

function probe() {                                   // → { label, run } for E
  const [tx, ty] = target();
  if (map.belt) return beltProbe(tx, ty);
  if (map.ruins && !S.mine) return null;
  if (map.ruins) return map.city && S.mine.mode === 'city' ? cityProbe(tx, ty) : null;
  { const tp = propAt(tx, ty); if (tp && tp.act === 'restore') return { label: 'Use the restoration terminal (fund projects)', run: () => act(tp) }; }   // the terminal wins over anyone standing near it
  { const c = catProbe(); if (c) return c; }
  const near = nearestNpc(1.5);
  // 2026-11-21: a passer-by no longer steals E from the thing Sato is facing (the lift, a door, a sign, a mailbox): they win only when
  // they stand in front of her, or there is nothing to use there. Shop counters keep the keeper (talk to buy).
  const facing = propAt(tx, ty), np = near && npcs.get(near), inFront = np && Math.hypot(np.actor.x - (tx + 0.5), np.actor.y - (ty + 0.5)) < 0.95;
  const doorHere = !map.belt && (map.doors || []).some((q) => (q.x === tx && q.y === ty) || (q.x === Math.floor(me.x) && q.y === Math.floor(me.y)));
  if (near && (inFront || ((!facing || !facing.act || facing.act === 'counter') && !doorHere))) return { label: `Talk to ${S.npc[near] && S.npc[near].met ? NPCS[near].short || NPCS[near].name : 'the stranger'}`, run: () => talkTo(near) };
  const pu = pupils.find((q) => Math.hypot(q.a.x - me.x, q.a.y - me.y) < 1.3);
  if (pu) return { label: `Say hello to ${pu.name}`, run: () => { pu.a.face(me.x, me.y); ui.say([{ who: 'narrator', text: pick(story.LOWER.pupils) }]); } };
  const nb = nearestBot(1.4);
  if (nb && S.robots[nb.i]) { const r = S.robots[nb.i], held = sim.selected(S); if (held && held.id === 'battery_full') return { label: `Give ${r.name} a charged battery`, run: () => { const q = sim.chargeRobot(S, nb.i); ui.toast(q.msg); if (q.ok) { sfx('good'); bubble(nb.o, 'Bzzt! ♥'); } refreshHud(); } }; return { label: `Talk to ${r.name} (battery ${r.charge}%)`, run: () => talkBot(nb) }; }
  const pl = placedProbe(tx, ty); if (pl) return pl;
  if (map.id === 'farm' && S.flags.feed_mill && map.millAt) { const [mx, my, mw, md] = map.millAt; if (tx >= mx && tx < mx + mw && ty >= my && ty < my + md) return { label: `Put crops in the feed mill (${sim.millCount(S)}/${sim.millCap(S)})`, run: () => ui.siloWindow(S, refreshHud) }; }
  const p = propAt(tx, ty);
  if (p) {
    if (p.act === 'counter' && p.shop) return { label: 'Use the Grand Market terminal', run: () => ui.marketWindow(S, refreshHud) };
    if (p.act === 'hydro') return hydroProbe(p);
    if (p.act === 'counter') { const k = nearestNpc(3.2); if (k) return { label: `Talk to ${NPCS[k].short || NPCS[k].name}`, run: () => talkTo(k) }; if (map.id === 'hall') return { label: 'Nobody is at the desk', run: () => ui.toast('Nobody is at the desk just now.') }; return { label: 'Nobody is at the counter', run: () => ui.toast('Nobody is here to serve just now.') }; }
    if (p.act === 'home' || (p.act === 'house' && p.home)) return homeProbe(p.home) || { label: 'Knock', run: () => act(p) };
    if (p.act === 'mail') return mailProbe(p.home);
    if (p.act === 'hours') return { label: `Read the opening hours: ${(story.PLACES[p.place] || {}).name || 'sign'}`, run: () => act(p) };
    if (p.act === 'pump') return pumpProbe(p);
    if (p.act === 'cask') return caskProbe(p);
    if (p.act === 'bed' && p.bed != null) return bedProbe(p);   // a catacomb growing bed (the farmhouse bed has no bed number: it is for sleeping)
    if (p.act === 'terminal') return { label: S.lower && S.lower.logs && S.lower.logs[p.log] != null ? `${p.label} (log recovered)` : p.kind === 'crypt_wall' ? 'Read the scratches on the wall' : `Recover the log from the ${p.label.toLowerCase()}`, run: () => act(p) };
    const L = { telescope: 'Look through the telescope', letters: sim.mailWaiting(S) ? `Check the mailbox (${sim.mailWaiting(S)} letter${sim.mailWaiting(S) > 1 ? 's' : ''})` : 'Look in the mailbox', hottub: S.cal.minute >= sim.TUB_FROM ? 'Soak in the hot tub' : 'Lift the hot tub lid', aquarium: 'Look at the fish tank', piano: 'Play the piano', lift: 'Ride the spoke lift', restore: 'Use the restoration terminal', vault: sim.vaultReady(S).ok ? 'Open the round door' : 'Look at the sealed round door', works: S.flags.ld_works ? 'Use the Works press' : 'Look at the sleeping press', recycle: 'Use the recycling bin', arena: sim.hubCupDay(S) && !S.flags['hubcup_y' + S.cal.year] ? 'Take your five throws in the Hub Cup' : 'Look at the zero-g drum', vents: S.flags.ld_vents ? `Soak in the vent bath (${S.flags.ld_reactor ? 'free' : sim.VENT_PRICE + ' cr'})` : 'Look at the cold bath', reactor: `Work at the reactor console (${sim.reactorDone(S)}/${sim.REACTOR_STEPS.length})`, launch: 'Suit up at the launch cradle: fly out to the belt', refit: 'Use the Pallas refit gantry', shuttle: `Board Maris's shuttle to the Old World (${sim.shuttleFare(S) ? sim.shuttleFare(S) + ' cr' : 'free'})`, liftdown: 'Ride the spoke lift (Eden Central, the Lower deck)', liftup: 'Ride the spoke lift (Willowfall, the Lower deck)', gallery: 'Sit and look out of the great window', house: 'Try the door', silo: 'Open the silo', solaryard: 'Use the solar yard terminal', stargaze: 'Stargaze in the dome', onsen: 'Soak in the onsen', bin: sim.basketHeld(S) ? `Tip the basket into the bin (${sim.basketTotal(S)})` : 'Put the held item in the shipping bin', well: 'Fill the watering can', sign: 'Read', bed: 'Go to bed', radio: 'Watch the colony forecast', feedcow: 'Fill the troughs', feedhen: 'Fill the feeder', eggs: 'Collect the eggs', feedfold: 'Fill the fold troughs', feedduck: 'Fill the duck feeder', duckeggs: 'Look in the nest box', lift: 'Ride the orbital elevator', candles: 'Light a memorial candle', museum: 'Look at the Memory Room', books: 'Read a book', storage: 'Open the storage box', fridge: 'Open the fridge', kitchen: 'Cook something', calendar: 'Read the noticeboard' }[p.act];
    return { label: L, run: () => act(p) };
  }
  const fa = fieldAt(tx, ty) || fieldAt(Math.floor(me.x), Math.floor(me.y));
  if (fa && fa.tile.crop && !fa.tile.crop.dead && sim.cropStage(fa.tile.crop) === 3) return { label: `Harvest the ${CROPS[fa.tile.crop.id].name.toLowerCase()}${sim.basketHeld(S) ? ' into the basket' : ''}`, run: () => { const r = sim.harvest(S, fa.f.id, fa.x, fa.y); if (r.ok) { sfx('pick'); pickedToast(r); refreshChanged(fa.f.id, [{ x: fa.x, y: fa.y }]); goals(); } else ui.toast(r.msg); refreshHud(); } };
  const wild = !map.indoor && plantAhead(['tree']);
  if (wild && wild.p.fruit && !felledAt(wild.pi) && sim.wildReady(S, wild.key, wild.p.fruit, !!map.wildShared)) return { label: `Pick ${ITEMS[WILD_TREES[wild.p.fruit].fruit].name.toLowerCase()}`, run: () => { const r = sim.pickWild(S, wild.key, wild.p.fruit, !!map.wildShared); if (r.ok) { sfx('pick'); ui.gainedToast(r.gained); const f = wild.p.obj && wild.p.obj.userData.fruits; if (f) f.visible = false; } else ui.toast(r.msg); refreshHud(); } };
  const bush = !map.indoor && plantAhead(['bush']); if (bush && sim.bushReady(S, bush.key)) return { label: 'Pick berries', run: () => { const r = sim.pickBush(S, bush.key); if (r.ok) { sfx('pick'); pickedToast(r); W.swapProp(bush.p, 'bush', { model: 'bush_bare' }); } else ui.toast(r.msg); refreshHud(); } };
  const b = nearestBeast(1.4); if (b) return { label: `Pet ${S.animals[b.i].name}`, run: () => { const r = sim.petAnimal(S, b.i); ui.toast(r.msg || `${S.animals[b.i].name} seems pleased.`); floatText(b.o.position.x, b.o.position.z, '♥'); } };
  if (map.id === 'hill') for (const f of S.forage || []) { const [x, y] = spotXY(f.spot); if (Math.hypot(x + 0.5 - me.x, y + 0.5 - me.y) < 1.2) return { label: `Pick the ${ITEMS[f.id].name.toLowerCase()}`, run: () => { const r = sim.pickForage(S, f.spot); if (r.ok) { sfx('pick'); pickedToast(r); drawForage(); } else ui.toast(r.msg); refreshHud(); } }; }
  const hd = map.doors.find((q) => q.kind === 'home' && q.x === tx && q.y === ty); if (hd) return homeProbe(hd.home);   // facing someone's front door
  const d = map.doors.find((q) => q.x === Math.floor(me.x) && q.y === Math.floor(me.y)); if (d && d.kind === 'home') return homeProbe(d.home); if (d) return { label: d.kind === 'orbital_elevator' ? 'Ride the orbital elevator up to the hangar' : d.kind === 'house_back' ? (S.flags.house_back ? 'Go into the back bedroom' : 'Open the back door') : d.kind === 'cellar' ? (S.flags.cellar ? 'Go down to the cellar' : 'Lift the old trapdoor') : 'Go in', run: () => enterDoor(d) };
  return null;
}
// Homes (§15): a knock opens the door when they are in and awake, it is not late, and Sato is close enough (sim.visitRule).
const WHY_RANK = { shy: 0, late: 1, asleep: 2, out: 3, moved: 4 };
const residents = (key) => PEOPLE.filter((id) => story.homeKey(id, S.flags) === key && S.flags.partner !== id);
function homeAnswer(key) {
  const c = ctx(); let best = null;
  for (const id of residents(key)) { const r = sim.visitRule(S, id, story.presence(id, c)); if (r.ok) return { id, ...r }; if (!best || WHY_RANK[r.why] < WHY_RANK[best.why]) best = { id, ...r }; }
  if (best) return best;
  const moved = S.flags.partner && story.homeKey(S.flags.partner, S.flags) === key;
  return { id: null, ok: false, why: moved ? 'moved' : 'empty' };
}
const nameOf = (id) => NPCS[id].short || NPCS[id].name;
function homeProbe(key) {
  const H = homeAt(key); if (!H) return null; const r = homeAnswer(key);
  return { label: r.ok ? `Visit ${nameOf(r.id)} at home` : r.id ? `Knock at ${H.label.replace(/^The /, 'the ')}` : 'Read the note on the door', run: () => knock(key) };
}
// Mailboxes (2026-11-20): whose home it is, and a gift left for someone you cannot find (80% of handing it over; sim.mailGift).
const fullName = (id) => NPCS[id].name;
const giftable = (s) => s && ITEMS[s.id] && !['tool', 'seed'].includes(ITEMS[s.id].kind) && s.id !== 'pendant';
function mailProbe(key) {
  const who = residents(key), s = sim.selected(S), moved = S.flags.partner && story.homeKey(S.flags.partner, S.flags) === key;
  if (!who.length) return { label: moved ? 'Read the card on the mailbox' : 'An empty mailbox', run: () => ui.toast(moved ? story.HOME_NOTES.moved : 'An empty mailbox. Nobody lives here just now.', 3600) };
  if (!giftable(s)) return { label: `Mailbox: ${who.map(fullName).join(' & ')}`, run: () => ui.toast(`The mailbox of ${who.map(fullName).join(' and ')}. Hold something to give and press E to leave it as a gift (worth a little less than handing it over).`, 4200) };
  return { label: `Leave the ${ITEMS[s.id].name.toLowerCase()} in ${who.length > 1 ? 'the Thornes\'' : nameOf(who[0]) + '\'s'} mailbox`, run: () => postGift(who) };
}
async function postGift(who) {
  let id = who[0];
  if (who.length > 1) { mode = 'talk'; const i = await ui.choose('Who is it for?', [...who.map(nameOf), 'Never mind']); mode = 'play'; if (i >= who.length) return; id = who[i]; }
  const s = sim.selected(S), nm = ITEMS[s.id].name.toLowerCase(), r = sim.mailGift(S, id, S.player.sel, story.giftTier(id, s.id), isBirthday(id));
  if (!r.ok) return ui.toast(r.msg);
  sfx('drop'); ui.toast(`You leave the ${nm} in ${nameOf(id)}'s mailbox.${r.later ? ` ${nameOf(id)} has already had a gift today: pleased, but less so.` : ''}`, 3800); refreshHud();
}
// A guest at bedtime (or late, or when the host has to go out) is wished goodnight and shown to the door, never just left alone.
function homeBedtime() {
  if (!map || !map.home || mode !== 'play' || busy) return false;
  const c = ctx(), who = residents(map.home); if (!who.length) return false;
  const late = c.minute >= sim.VISIT_LATE && !who.includes(S.flags.sweet), pr = who.map((id) => story.presence(id, c));
  if (!late && pr.includes('home')) return false;
  const host = who.find((id, i) => pr[i] !== 'home' && npcs.has(id)) || who.find((id) => npcs.has(id)) || who[0], i = who.indexOf(host), out = !late && pr[i] === 'out';
  const n = npcs.get(host); if (n) n.actor.face(me.x, me.y);
  mode = 'talk';
  (async () => { await ui.say([{ who: host, text: out ? story.HOME_NOTES.byeOut : story.HOME_NOTES.goodnight }]); mode = 'play'; sfx('door'); await go(outsideOf(map.id)); })();
  return true;
}
let knockT = 0;
async function knock(key, walkedIn = false) {
  const r = homeAnswer(key), L = (r.id && story.HOME_LINES[r.id]) || {}, N = story.HOME_NOTES;
  if (r.ok) { sfx('door'); return go(doorTarget('home_' + key)); }
  const line = r.why === 'shy' ? { who: r.id, text: L.shy } : { who: 'narrator', text: r.why === 'out' ? L.note : r.why === 'asleep' ? L.asleep : r.why === 'late' ? N.late : r.why === 'moved' ? N.moved : N[key] || 'Nobody answers.' };
  if (walkedIn) { if (knockT > performance.now()) return; knockT = performance.now() + 3000; return ui.toast(line.who === 'narrator' ? line.text : `${nameOf(line.who)}: “${line.text}”`, 4200); }
  mode = 'talk'; if (r.id && r.why !== 'moved') sfx('door'); await ui.say([line]); mode = 'play';
}
function enterDoor(d) {
  if (d.kind === 'home') return knock(d.home, true);
  if (d.lock && !S.flags[d.lock]) return ui.toast({ fold: 'The old stone fold has no roof, and the gate hangs by one hinge. Prof. Ruess could mend it.', duckhouse: 'The duck house is a tumble of planks by the pond. Prof. Ruess could rebuild it.', house_back: 'The door opens on a cupboard full of old crates. Prof. Ruess could build a bedroom out the back.', cellar: 'The trapdoor lifts on a crawlspace of rubble and cold air. Prof. Ruess could dig it out into a cellar.' }[d.lock] || 'The old greenhouse is a wreck of broken frames. Prof. Ruess could repair it.');
  sfx('door'); go(doorTarget(d.to.map));
  if (d.kind === 'orbital_elevator') ui.toast(story.ELEVATOR.up, 4200);
}
async function act(p) {
  const s = sim.selected(S);
  switch (p.act) {
    case 'onsen': await soakOnsen(); break;
    case 'liftdown': case 'liftup': case 'lift': await rideLift(map.id); break;
    case 'restore': await restoreTerminal(); break;
    case 'terminal': await readLog(p); break;
    case 'vault': await vaultDoor(); break;
    case 'works': await worksPress(); break;
    case 'recycle': await recycleBin(); break;
    case 'vents': await ventBath(); break;
    case 'reactor': await reactorConsole(); break;
    case 'arena': await hubCup(); break;
    case 'gallery': { const r = sim.gallerySit(S); mode = 'talk'; const G = story.CENTRAL; await ui.say([{ who: 'narrator', text: r.night ? G.gallery[sim.absDay(S) % G.gallery.length] : G.galleryDay }]); mode = 'play'; if (r.restored) { sfx('good'); ui.toast(`You sit a while. +${r.restored} stamina.`); } break; }
    case 'candles': { const c = story.CHURCH.candles; ui.say([{ who: 'narrator', text: c[(sim.absDay(S) + Math.floor(S.cal.minute / 120)) % c.length] }]); break; }
    case 'home': await knock(p.home); break;
    case 'hours': { mode = 'talk'; const c = ctx(); await ui.say([{ who: 'narrator', text: story.hoursSign(p.place, { season: c.season, year: c.year, flags: S.flags, partner: c.partner }) || '…' }]); mode = 'play'; break; }
    case 'house': if (p.home) { await knock(p.home); break; } ui.say([{ who: 'narrator', text: (S.flags.ld_rehoused && story.LOWER.houses[p.house]) || CENTRAL_HOUSES[p.house] || 'The door is locked.' }]); break;
    case 'stargaze': await stargaze(); break;
    case 'silo': ui.siloWindow(S, refreshHud); break;
    case 'solaryard': { const r = sim.yardDeposit(S); ui.toast(r.msg); if (r.ok) sfx('drop'); break; }
    case 'bin': { if (s && s.id === 'basket') { const r = sim.shipBasket(S); ui.toast(r.msg); if (r.ok) sfx('drop'); goals(); break; } if (!s) return ui.toast('Hold something to ship it. Maris collects at five.'); const r = sim.ship(S, S.player.sel); ui.toast(r.msg || (r.ok ? 'In the bin.' : 'That cannot be shipped.')); if (r.ok) sfx('drop'); goals(); break; }
    case 'well': { const r = sim.refillCan(S); ui.toast(r.msg || 'The watering can is full.'); if (r.ok) sfx('water'); break; }
    case 'sign': ui.say([{ who: 'narrator', text: (S.flags.ld_vault && story.SIGNS_VAULT[p.sign]) || story.SIGNS[p.sign] || '…' }]); break;
    case 'storage': ui.boxWindow(S, 'storage', refreshHud, 'Storage box'); break;
    case 'fridge': if (!S.flags.kitchen) ui.say([{ who: 'narrator', text: 'An old cold-locker from a ship, standing in the corner unplugged. Prof. Ruess could connect it with a kitchen refit.' }]); else ui.boxWindow(S, 'fridge', refreshHud, 'The fridge'); break;
    case 'kitchen': if (!S.flags.kitchen) ui.say([{ who: 'narrator', text: 'A cold stove and a dry sink. Prof. Ruess at the Workshop can refit the kitchen.' }]); else ui.kitchenWindow(S, (r) => { if (r && r.ok) sfx('good'); refreshHud(); }); break;
    case 'calendar': { const f = story.FESTIVALS.filter((x) => x.season === S.cal.season && x.day >= S.cal.day); const bd = Object.values(NPCS).filter((n) => n.id !== 'sato' && n.birthday && n.birthday.season === S.cal.season && n.birthday.day >= S.cal.day && S.npc[n.id] && S.npc[n.id].met); ui.say([{ who: 'narrator', text: `The noticeboard. ${f.length ? 'Coming up: ' + f.map((x) => `${x.name} on day ${x.day}`).join(', ') + '.' : 'No more festivals this season.'} ${bd.length ? 'Birthdays: ' + bd.map((n) => `${n.short || n.name} on day ${n.birthday.day}`).join(', ') + '.' : ''}` }]); break; }
    case 'refit': { mode = 'talk'; if (!S.flags.sawRefit) { sim.setFlag(S, 'sawRefit'); await ui.say([{ who: 'vashti', text: 'That bench runs the gantry over your Pallas. Bring me belt ore and I will make it tougher, faster, sharper. One line at a time.' }]); } mode = 'play'; const before = Object.keys(sim.PALLAS_MODS).reduce((n, k) => n + sim.pallasLevel(S, k), 0); await ui.shop(S, 'pallas', 'vashti', refreshHud); refreshHud();
      if (Object.keys(sim.PALLAS_MODS).reduce((n, k) => n + sim.pallasLevel(S, k), 0) > before) { sfx('good'); W.shake = 0.15; for (let k = 0; k < 5; k++) setTimeout(() => W.puff(8 + (Math.random() - 0.5) * 1.2, 4 + (Math.random() - 0.5) * 0.8, k % 2 ? 0xffd36a : 0x9ff4ff, 8, 1.2 + Math.random() * 1.4), k * 220); floatText(8, 4, 'refit!'); }   // sparks on the gantry
      break; }
    case 'letters': {
      if (!sim.mailWaiting(S)) { ui.toast(sim.readMail(S).msg, 3000); break; }
      mode = 'talk';
      while (sim.mailWaiting(S)) {
        const r = sim.readMail(S), m = r.letter, nm = NPCS[m.from] ? NPCS[m.from].name : m.from, text = m.card ? story.CARDS[m.from] : story.LETTERS[m.from][m.n];
        sfx('door'); await ui.say([{ who: 'narrator', text: m.card ? `A birthday card from ${nm}:` : `A letter from ${nm}:` }, { who: m.from, text }]);
        if (r.kept) { ui.toast(r.msg, 3600); break; }
        if (r.gained.length) { ui.gainedToast(r.gained); sfx('pick'); }
      }
      mode = 'play'; refreshHud(); break;
    }
    case 'hottub': { const r = sim.useHotTub(S); ui.toast(r.msg, 4200); if (r.ok) { sfx('good'); W.puff(p.x + 1, p.y + 1, 0xffffff, 10, 1.2); if (r.partner && NPCS[r.partner]) floatText(p.x + 1, p.y + 1, '♥'); } refreshHud(); break; }
    case 'telescope': { const r = sim.useTelescope(S); ui.toast(r.msg, 4200); if (r.ok) sfx('good'); refreshHud(); break; }
    case 'aquarium': { const caught = Object.entries(S.fishLog || {}).filter(([, n]) => n > 0).sort((a, b) => (ITEMS[b[0]].sell || 0) - (ITEMS[a[0]].sell || 0));
      ui.toast(caught.length ? `The tank: ${caught.slice(0, 6).map(([id]) => ITEMS[id].name).join(', ')}${caught.length > 6 ? ` and ${caught.length - 6} more` : ''}. ${caught.length} kinds caught in all.` : 'The tank is clean, lit and empty. Catch something worth showing off.', 4600); break; }
    case 'piano': { sfx('piano'); const pt = S.flags.partner && NPCS[S.flags.partner]; ui.toast(pt ? `You pick out the old colony anthem, slowly. ${pt.short || pt.name} hums along from the kitchen, a little off-key, on purpose.` : 'You pick out the old colony anthem, one finger at a time. By the second verse it almost sounds like music.', 4200); break; }
    case 'radio': { const l = S.flags.ld_vault && sim.absDay(S) % 2 ? story.RADIO_VAULT : story.RADIO[S.weatherTomorrow] || story.RADIO.sun; ui.say([{ who: 'narrator', text: 'The radio crackles. ' + (Array.isArray(l) ? l[(S.cal.day + S.cal.season) % l.length] : l) }]); break; }
    case 'bed': { mode = 'talk'; const i = await ui.choose('The bed', ['Sleep until morning', 'Save the game', 'Look through your memories', 'Not yet']); mode = 'play'; if (i === 0) await night(false); else if (i === 1) { save(); ui.toast('Saved.'); } else if (i === 2) toggleJournal('memories'); break; }
    case 'feedfold': { const a = sim.feedAll(S, 'goat'), b = sim.feedAll(S, 'sheep'), ok = a.ok || b.ok; ui.toast(ok ? 'You filled the troughs.' : (S.animals.some((x) => x.kind === 'goat' || x.kind === 'sheep') ? a.msg || b.msg : 'The fold is empty. Corran sells goats and sheep.')); if (ok) sfx('drop'); break; }
    case 'feedduck': { const r = sim.feedAll(S, 'duck'); ui.toast(r.msg || (r.ok ? 'Fed.' : 'Nothing to feed.')); if (r.ok) sfx('drop'); break; }
    case 'duckeggs': { const r = sim.collectDuckEggs(S); if (r.ok) { sfx('pick'); ui.gainedToast(r.gained); } else ui.toast(r.msg); drawDuckEggs(); break; }
    case 'feedcow': case 'feedhen': { const r = sim.feedAll(S, p.act === 'feedcow' ? 'cow' : 'chicken'); ui.toast(r.msg || (r.ok ? 'Fed.' : 'Nothing to feed.')); if (r.ok) sfx('drop'); break; }
    case 'eggs': { const r = sim.collectEggs(S); if (r.ok) { sfx('pick'); ui.gainedToast(r.gained); } else ui.toast(r.msg || 'No eggs today.'); drawEggs(); break; }
    case 'books': { const h = pick(story.HELP); ui.say([{ who: 'narrator', text: `Sato takes down a book: “${h.title}”.` }, { who: 'narrator', text: h.body.split('\n').slice(0, 3).join(' ') }]); break; }
    case 'museum': ui.museum(S, RELICS.map((r) => ({ id: r.id, text: story.RUINS.relic[r.id] }))); break;
    case 'launch': await launchBelt(); break;
    case 'shuttle': await boardShuttle(); break;
  }
  refreshHud();
}
async function leaveRuins() {
  if (map.belt) return leaveBelt('pad');
  sim.cityMove(S, me.x - 1, me.y - 1); const r = sim.cityHome(S, 'pad'); if (!r.ok) return ui.toast(r.msg);
  hullBar(false); sfx('door');
  busy = true; await ui.fade(true, 400); busy = false; mode = 'talk'; await ui.say([{ who: 'narrator', text: story.SHUTTLE.home }, { who: 'narrator', text: story.SHUTTLE.tally(r.credits, r.finds) }]); mode = 'play';
  await go({ map: 'central', x: 7.5, y: 16.5, dir: 0 });
}
// Vashti's hangar: Sato suits up at the launch cradle, which flings her out to sector 1, or to a milestone sector
// (5, 10, 15, 20) she has reached before.
async function launchBelt() {
  const starts = sim.beltStarts(S), opts = starts.map((n) => (n === 1 ? 'Sector 1: the launch apron' : `Sector ${n}`)); opts.push('Stay in the hangar');
  mode = 'talk'; const i = await ui.choose(`The launch cradle: Sato suits up. Air ${sim.beltAirMax(S)} · hammer: ${['', 'Field', 'Alloy', 'Starsteel'][S.player.toolLevel.hammer || 1]}${S.miner ? ` · ${S.miner.name} rides on her pack (${S.miner.charge}%)` : ''}`, opts); mode = 'play'; if (i >= starts.length) return;
  if (!sim.countItem(S, 'hammer')) return ui.toast('Vashti holds out a hand. "Hammer?" You do not have it with you.');
  const first = !S.flags.flewBelt; sim.enterBelt(S, starts[i]); sim.setFlag(S, 'flewBelt');
  if (first) { mode = 'talk'; await ui.say(story.BELT.suitUp.map((t) => ({ who: 'narrator', text: t }))); mode = 'play'; }
  const hs = S.player.inv.findIndex((x) => x && x.id === 'hammer'); if (hs >= 0) S.player.sel = hs;      // the hammer in hand
  await go({ map: 'ruins', x: S.mine.pos[0] + 1, y: S.mine.pos[1] + 1, dir: 1 });
  ui.toast(first ? 'Space (or E) with the hammer breaks a rock; the large and huge boulders need a better hammer, and give better ore. Flying uses air: every sector has a lit pickup pod home. F sets down a mining unit, if Ruess has leased you one.' : starts[i] > 1 ? story.BELT.start(starts[i]) : pick(story.BELT.arrive), 5200);
}
// Maris's courier shuttle from the space dock down to the Old World.
async function boardShuttle() {
  const fare = sim.shuttleFare(S);
  mode = 'talk'; const i = await ui.choose(`Juno Maris's courier shuttle to the Old World · ${fare ? fare + ' cr' : 'free for a friend'} · Pallas hull ${sim.hullMax(S)}${S.flags.filters ? ' (filters fitted)' : ''}`, ['Fly down to the old city', 'Not today']); mode = 'play'; if (i !== 0) return;
  const r = sim.takeShuttle(S); if (!r.ok) return ui.toast(r.msg);
  ui.toast(r.msg); mode = 'talk'; await ui.say([...(S.flags.shuttled ? story.SHUTTLE.boardAlt : story.SHUTTLE.board), { who: 'narrator', text: story.SHUTTLE.descent }]); mode = 'play';
  const first = !S.flags.descended; sim.setFlag(S, 'descended'); sim.setFlag(S, 'shuttled');
  if (first) { mode = 'talk'; await ui.say(story.RUINS.first.map((t) => ({ who: 'narrator', text: t }))); mode = 'play'; }
  await go({ map: 'ruins' });
  ui.toast(first ? 'Walk the Pallas anywhere. Space fires (up close it swings the beam sabre), F sets down the Hydra, Shift boosts, E searches cars, rubble, lockers and safes. Mind the hull bar: gas, toxic pools and creatures wear it down. The shuttle waits on its pad.' : pick(story.RUINS.arrive), 7000);
}

function use() {                                     // Space: the held tool or item
  if (fishing) return pullLine();
  if (map.belt) { const [tx, ty] = target(), c = S.mine.cells[(ty - 1) * S.mine.w + tx - 1]; if (sim.isRock(c)) return hammerRock(tx - 1, ty - 1); return; }
  if (map.ruins) return pallasFire();
  const s = sim.selected(S); if (!s) return; const it = ITEMS[s.id], [tx, ty] = target();
  const near = nearestNpc(1.5); if (near && it.kind !== 'tool' && it.kind !== 'seed') return giveTo(near);
  if (it.kind === 'placeable' || it.kind === 'sapling') return setDown(it, tx, ty);
  if (s.id === 'axe' && !map.indoor && !map.ruins) {
    if (sim.yardAt(S, map.id, tx, ty) >= 0 || sim.chestAt(S, map.id, tx, ty) >= 0 || sim.panelAt(S, map.id, tx, ty) >= 0 || sim.machineAt(S, map.id, tx, ty) >= 0) { me.swing = 1; const r = sim.pickUpPlaced(S, map.id, tx, ty); ui.toast(r.msg); if (r.ok) { sfx('chop'); drawPlaced(); } return refreshHud(); }
    const fi = sim.fruitTreeAt(S, map.id, tx, ty); if (fi >= 0) { me.swing = 1; const r = sim.removeTree(S, fi); ui.toast(r.msg); if (r.ok) { sfx('chop'); W.puff(tx + 0.5, ty + 0.5, 0x6fbf5a, 10, 0.6); drawPlaced(); } return refreshHud(); }
  }
  if (it.kind === 'food' || it.maxUp || (it.stamina && it.kind !== 'tool')) { if (it.kind === 'food' || it.maxUp) ui.toast(`Press R to eat the ${it.name.toLowerCase()} (or eat it from the rucksack).`); return; }   // no eating by accident on the use key
  if (it.kind !== 'tool' && it.kind !== 'seed') return;
  me.swing = 1;
  if (s.id === 'can' && (waterAt(tx, ty) || (propAt(tx, ty) || {}).act === 'well')) { const r = sim.refillCan(S); ui.toast(r.msg || 'Filled.'); if (r.ok) sfx('water'); return refreshHud(); }
  if (s.id === 'rod') { if (waterAt(tx, ty)) return cast(tx, ty); return ui.toast('Face the water to cast.'); }
  if (s.id === 'milker' || s.id === 'brush' || s.id === 'clippers') { const b = nearestBeast(1.6), k = b && S.animals[b.i].kind, fits = { milker: ['cow', 'goat'], brush: ['cow', 'goat', 'sheep'], clippers: ['sheep'] }[s.id]; if (!b || !fits.includes(k)) return ui.toast({ milker: 'Stand beside a cow or a goat.', brush: 'Stand beside a cow, a goat or a sheep.', clippers: 'Stand beside a sheep.' }[s.id]); const r = s.id === 'milker' ? sim.milk(S, b.i) : s.id === 'clippers' ? sim.shear(S, b.i) : sim.brush(S, b.i); ui.toast(r.msg || (r.ok ? 'Done.' : '')); ui.gainedToast(r.gained); if (r.ok) { sfx('pick'); floatText(b.o.position.x, b.o.position.z, '♥'); } return refreshHud(); }
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
function cast(tx, ty) { fishing = { place: waterPlace(map, tx, ty), phase: 'wait', t: (1.6 + Math.random() * 4.5) * ([1, 1, 0.85, 0.7][S.player.toolLevel.rod] || 1), x: tx + 0.5, y: ty + 0.5 }; fishing.o = W.place('float', null, fishing.x, fishing.y, { procKind: 'float', h0: -0.08 }); me.play('fish', 30); sfx('water'); ui.toast('Line out. Wait for the float to dip…', 1800); }
function endFishing() { if (fishing) { W.unplace('float'); fishing = null; if (me) me.act = null; } }
function pullLine() {
  if (fishing.phase !== 'bite') { endFishing(); return ui.toast('Too soon. The line comes back empty.'); }
  const place = fishing.place || map.water || 'farm'; endFishing(); const r = sim.fish(S, place);
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
async function night(collapsed, camp = false) {
  if (busy) return; busy = true; mode = 'talk'; endFishing();
  if (collapsed) ui.toast(S.cal.minute >= 1440 ? 'It is midnight. Sato is asleep on her feet.' : 'Sato has worked herself to a standstill.', 3000);
  await ui.fade(true, 700);
  const atCamp = camp && map.city && S.mine && sim.campNear(S) >= 0;
  if (S.mine && !atCamp) sim.leaveMine(S);
  const rep = atCamp ? sim.campSleep(S, { collapsed }) : sim.sleep(S, { collapsed }); sim.claimGoals(S);
  if (S.flags.partner && NPCS[S.flags.partner]) {            // a partner waters some of the field before she wakes
    let k = 0; for (const t of S.fields.farm.tiles) { if (k >= 12) break; if (t.till && t.crop && !t.crop.dead && !t.wet) { t.wet = true; k++; } }
    if (k) (rep.notes ||= []).push(`${NPCS[S.flags.partner].short || NPCS[S.flags.partner].name} watered ${k} plants before you woke.`);
  }
  busy = false; if (atCamp) { const c = S.mine.camps[rep.camp]; await go({ map: 'ruins', x: c.x + 1.5, y: c.y + 2.5, dir: 0 }, { quick: true }); } else await go({ map: 'house', x: 2.6, y: 2.6, dir: 0 }, { quick: true }); busy = true;
  if (atCamp) { sim.campSave(S); save(true); } else save(); sfx('morning');
  const f = festivalToday(), SK = ['spring', 'summer', 'autumn', 'winter'];
  const head = rep.newYear ? `A new year on Eden. Year ${S.cal.year} begins.` : rep.seasonChanged ? `${['Spring', 'Summer', 'Autumn', 'Winter'][S.cal.season]} has come to the river chamber.` : collapsed ? 'She wakes in her own bed, with no memory of getting there, and half her strength.' : '';
  if (f) (rep.notes ||= []).push(`${f.name} today. ${f.blurb}`);
  await ui.fade(false, 500);
  await ui.report(S, rep, { head: atCamp && !rep.newYear && !rep.seasonChanged ? 'Sato wakes in her tent at the camp. The Pallas has mended overnight, and the farm carried on without her.' : head, scene: rep.seasonChanged ? 'season_' + SK[S.cal.season] : atCamp ? null : !S.flags.sawMorning ? 'morning' : null });   // no farmhouse bedroom picture when she wakes on Earth
  if (!atCamp) sim.setFlag(S, 'sawMorning');
  busy = false; mode = 'play'; refreshHud();
}
function goals() { for (const g of sim.claimGoals(S)) { ui.toast(`Done: ${g.title}  (+${g.reward} cr)`, 3600); sfx('good'); } refreshHud(); }

// ---------------------------------------------------------------- floating labels
function floatText(x, y, text) { const e = document.createElement('span'); e.textContent = text; $('labels').appendChild(e); labels.push({ e, x, y, h: 2, life: 1.2 }); }
// A speech bubble that follows a 3D object (a robot) for a few seconds.
function bubble(o, text, life = 3.6) { for (const l of labels) if (l.follow === o) l.life = 0; const e = document.createElement('span'); e.className = 'bubble'; e.textContent = text; $('labels').appendChild(e); labels.push({ e, follow: o, x: o.position.x, y: o.position.z, h: 1.25, life, still: true }); }

// ---------------------------------------------------------------- the frame
let last = 0, promptT = 0, current = null, dustT = 0;
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
    const len = Math.hypot(ix, iy); me.moving = len > 0.15; if (!me.moving) me.running = false;
    if (me.moving) {
      if (fishing) endFishing();
      ix /= Math.max(1, len); iy /= Math.max(1, len);
      const c = Math.cos(W.yaw), s = Math.sin(W.yaw), wx = ix * c + iy * s, wy = -ix * s + iy * c;
      const run = !map.belt && !map.ruins && (keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(stick.x, stick.y) > 0.93); me.running = run;   // touch: push the stick all the way
      if (run && !map.indoor && (dustT -= dt) <= 0) { dustT = 0.09; W.puff(me.x - wx * 0.3, me.y - wy * 0.3, map.id === 'lower' ? 0x8a8478 : 0xd8c8a0, 3, 0.08); }   // dust kicked up behind her
      const tired = S.player.stamina < 15 ? 0.7 : 1, sp = (map.belt ? (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 6.2 : 4.4) : map.ruins ? (dashT > 0 ? 13 : 4.6) : run ? 7.4 : 3.9) * tired * dt;   // a captain's sprint: nearly twice walking pace (owner 2026-11-22)
      me.dir = Math.abs(wx) > Math.abs(wy) ? (wx < 0 ? 2 : 3) : (wy < 0 ? 1 : 0);
      if (canStand(me.x + wx * sp, me.y)) me.x += wx * sp; if (canStand(me.x, me.y + wy * sp)) me.y += wy * sp;
      const tx = Math.floor(me.x), ty = Math.floor(me.y);
      const ex = map.exits.find((e) => tx >= e.x0 && tx <= e.x1 && ty >= e.y0 && ty <= e.y1);
      if (ex) { go(ex.to); return; }
      if (map.indoor && Math.abs(tx - map.exitTile[0]) <= 1 && me.y > map.exitTile[1] + 0.45 && wy > 0.3) { sfx('door'); if (map.id === 'hangar') ui.toast(story.ELEVATOR.down, 4200); go(outsideOf(map.id)); return; }
      const d = map.doors.find((q) => q.x === tx && q.y === ty);
      if (d && !d.hatch && wy < -0.5 && me.y < d.y + 0.45) { doorHold += dt; if (doorHold > 0.18) { doorHold = 0; enterDoor(d); return; } } else doorHold = 0;
    }
    // the clock
    clock += dt;
    while (clock >= MIN_SECONDS) { clock -= MIN_SECONDS; const r = sim.tick(S, 1); if (S.cal.minute % 10 === 0) { refreshHud(); if (!homeBedtime()) placeNpcs(); W.setTime(S.cal.minute, S.weather, map); setMood({ night: S.cal.minute > 1170 }); checkEvents(); } if (r.collapsed) { night(true); break; } }
    if (map.ruins) ruinsTick(dt);
    if (fishing) fishTick(dt);
    botsTick(dt); catTick(dt); moveNpcs(dt);
    for (const g of forageBob) { const b = g.userData.bob; if (!g.parent) continue; b.t += dt; b.bb.position.y = 0.12 + Math.abs(Math.sin(b.t * 2.2)) * 0.12; const h = g.children[0] && g.children[0].userData.halo; if (h) h.material.opacity = 0.45 + Math.sin(b.t * 3) * 0.25; }
    for (const b of beasts) { b.wait -= dt; if (b.wait <= 0) { const pen = b.pen || map.pen; b.tx = pen[0] + 0.6 + Math.random() * (pen[2] - pen[0]); b.ty = pen[1] + 0.6 + Math.random() * (pen[3] - pen[1]); b.wait = 3 + Math.random() * 6; } const dx = b.tx - b.o.position.x, dy = b.ty - b.o.position.z, d = Math.hypot(dx, dy); if (d > 0.1) { b.o.position.x += dx / d * dt * 0.6; b.o.position.z += dy / d * dt * 0.6; if (!W.facers.includes(b.o.children[0])) b.o.rotation.y = Math.atan2(dx, dy); } }
    // prompt and cursor
    if ((promptT -= dt) <= 0) {
      promptT = 0.12; current = probe();
      const s = sim.selected(S), [tx, ty] = target(), it = s && ITEMS[s.id];
      const onField = !map.ruins && (fieldAt(tx, ty) || pastureAt(tx, ty)) && it && (it.kind === 'tool' || it.kind === 'seed');
      W.setCursor(tx, ty, !!onField || (map.ruins && current && /^(Search|Break|Open|Crack|Check)/.test(current.label)));
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
function toggleJournal(tab) { if (ui.journalOpen()) return ui.closeWin(); if (mode !== 'play' || busy || ui.talking() || ui.windowOpen()) return; sim.syncMemories(S); ui.journal(S, { tab, place: map ? map.name : '', change: refreshHud, replay: replayMemory }); }
// Memories: a seen scene, played again exactly as it was (its lines, faces and picture), read-only: only the dialogue runs, so no
// flag, friendship, item or choice changes; then back to the journal.
async function replayMemory(id) {
  const m = story.memoryCatalogue().find((x) => x.id === id); if (!m || !S.memories || !S.memories[id]) return;
  ui.closeWin(); mode = 'talk';
  try { if (m.art) ui.scene(m.art); await ui.say([{ who: 'narrator', text: `A memory: ${m.title}. (${sim.memoryDate(S.memories[id])})` }, ...m.lines()], { keepScene: !!m.art }); }
  finally { ui.scene(null); mode = 'play'; }
  toggleJournal('memories');
}
function exportSave() { save(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([sim.saveState(S)], { type: 'application/json' })); a.download = `satos-harvest-y${S.cal.year}-${['spring', 'summer', 'autumn', 'winter'][S.cal.season]}${S.cal.day}.json`; a.click(); }
function bindInput() {
  addEventListener('keydown', (e) => {
    if (mode === 'title') return;
    if (e.code === 'Escape') { if (ui.windowOpen()) ui.closeWin(); else openMenu('bag'); return e.preventDefault(); }
    if (e.code === 'Tab') { e.preventDefault(); if (ui.windowOpen()) ui.closeWin(); else openMenu('bag'); return; }
    if (e.code === 'F1') { e.preventDefault(); return openMenu('help'); }
    if (e.repeat) return;
    if (e.code === 'KeyM') { if (mapOpen()) ui.closeWin(); else toggleMap(); return; }
    if (e.code === 'KeyP') return toggleJournal();   // the Farm journal (M: the town map; music: the menu's button)
    if (e.code === 'KeyE' || e.code === 'Enter') return pressE();
    if (e.code === 'Space') { e.preventDefault(); return pressUse(); }
    if (ui.windowOpen() || ui.talking()) return;
    keys.add(e.code);
    if (/^Digit\d$/.test(e.code)) selectSlot(e.code === 'Digit0' ? 9 : +e.code.slice(5) - 1);
    if (e.code === 'KeyR') { const s = sim.selected(S); if (map && map.city && S.mine && mode === 'play' && !(s && (ITEMS[s.id].stamina || ITEMS[s.id].maxUp))) cityScan(); else if (s && (ITEMS[s.id].stamina || ITEMS[s.id].maxUp)) { const r = sim.eat(S, S.player.sel); if (r.celebrate) { sfx('good'); ui.celebrate(r.msg); floatText(me.x, me.y, '★'); } else ui.toast(r.msg || 'That was good.'); if (r.ok) sfx('pick'); refreshHud(); } }
    if (map && map.belt && e.code === 'KeyF') minerToggle(); else if (map && map.ruins && e.code === 'KeyF') placeHydra();
    if (map && map.earth && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) pallasDash();
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
    $('tUse').addEventListener('pointerdown', (e) => { e.preventDefault(); pressUse(); }); $('tAct').addEventListener('pointerdown', (e) => { e.preventDefault(); if (map && map.ruins && mode === 'play' && !ui.talking() && !probe()) { if (map.belt) minerToggle(); else placeHydra(); } else pressE(); });
  }
}

// ---------------------------------------------------------------- start
async function begin(state, fresh) {
  S = state; $('title').hidden = true; startMusic(); $('hud').hidden = false; mode = 'talk';
  if (fresh) { await ui.fade(true, 400); $('hud').hidden = true; ui.fade(false, 600); await ui.say(story.INTRO); $('hud').hidden = false; }
  mode = 'play';
  const p = S.player, m = p.map === 'ruins' && S.mine && S.mine.mode === 'city' ? 'ruins' : allMaps()[p.map] ? p.map : 'farm';   // a camp save resumes in the city
  await go(fresh || p.x == null ? { map: 'farm' } : { map: m, x: p.x, y: p.y, dir: p.dir });
  if (fresh) save();
}
async function boot() {
  const info = await art.loadArt(); loadPortraits();   // the expression busts: their list loads in the background, the pictures on demand
  W = new World($('view'));
  { const cv = W.renderer.domElement;   // the GPU dropped the 3D view (memory pressure, a GPU switch, a phone in the background): get it back
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); console.warn('[webgl] context lost'); try { ui.toast('The 3D view was interrupted. Restoring…', 3000); } catch {} });
    cv.addEventListener('webglcontextrestored', () => { console.warn('[webgl] context restored'); if (S && map) { const at = { map: map.id === 'ruins' ? 'ruins' : map.id, x: me.x, y: me.y, dir: me.dir }; go(at, { quick: true }); } }); }
  W.isFelled = (key) => !!S && sim.treeFelled(S, key); W.wildFruitShown = (m, p) => !!S && sim.wildReady(S, m.id + ':' + p.index, p.fruit, !!m.wildShared); W.bushShown = (m, p) => !!S && sim.bushReady(S, m.id + ':' + p.index); bindInput();
  initMap({ get: () => ({ S, map, me, npcs, W, people: whereNow }), ctx: () => (S ? ctx() : null), openWin: ui.openWindow, closeWin: ui.closeWin, canOpen: () => mode === 'play' && !busy && !ui.talking() && !ui.windowOpen(), toast: ui.toast });
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
  window.__farm = { replayMemory,  get plan() { return plan; }, whereNow, paths, get npcs() { return npcs; }, get S() { return S; }, get W() { return W; }, get me() { return me; }, get map() { return map; }, go, sim, night, get mode() { return mode; }, ui, drawPlaced, get cat() { return cat; }, get bots() { return bots; }, probe: () => probe(), use: () => use(), toggleJournal, talkBot };
}
boot();
