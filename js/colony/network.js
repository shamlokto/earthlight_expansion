// Earthlight Space Colony Rebuild, version 11 (docs/COLONY-V11.md): roads that are worth building, monorail lines that
// link themselves, and megastructures (two or four neighbouring top-level quads merging into something huge).
// Pure: no DOM, no randomness. Imports from rules.js are used inside functions only (rules.js imports this module back).
//
// Roads (owner, 2026-11-08: "make some rules for the roads so that it makes sense to build them, say, connecting perks
// but not noise, make area effects better"):
//   * a building TOUCHES a road when a road tile (or a finished Lift's shaft) is beside its footprint (4-neighbours);
//     road tiles joined side by side form a network, and Lifts join the networks of the three decks;
//   * services, parks and shops reach ROAD.reach tiles further to a building on the same road network (rules.covers,
//     rules.parkAt); workshop noise never travels along roads (rules.noiseAt is unchanged);
//   * a building on a network that also touches the Command Centre or a dock is LINKED: upkeep −10% and its
//     construction a quarter faster (sim.js steps 1 and 10);
//   * a quad touching a road grows a day sooner; quads need a road to grow past Row Houses / Shops / Machine Shops,
//     Habitats past Quarters and Tower Blocks past Towers (rules.ROAD_GATE; it only gates growing: nothing shrinks).
// Monorail (owner: "can the monorail be automatically built between the shops"): once Skyscrapers is known, every
// working Monorail Stop and every Market Quad from the Arcade up is a station; each links to its LINE.links nearest
// stations on its deck within LINE.range tiles. A building within LINE.corridor tiles of a line, or LINE.stationReach of
// a linked station, counts as near transit; Market Quads on a line earn LINE.marketBonus more.
import { BUILDING } from './data/buildings.js';
import { DECKS } from './decks.js';
import { liftTiles, deckOf, active, centre, spec, habitatNeeds, finished, ROAD_GATE, log } from './rules.js';

export const ROAD = { reach: 4, upkeep: 0.9, buildEvery: 4, growFaster: 1 };
export const LINE = { tech: 'skyscrapers', marketLevel: 5, range: 24, links: 2, corridor: 3, stationReach: 6, marketBonus: 1.25 };
export const MEGA = { splitDays: 30, keys: ['livingquad', 'marketquad', 'workshopquad'] };

// ---------------------------------------------------------------- the road networks
// Cached per state until the day, the number of buildings, nextId or a move changes (rules.move calls netMoved).
const cache = new WeakMap();
let moves = 0;
export const netMoved = () => { moves++; };
const sigOf = (state) => `${state.day}|${state.buildings.length}|${state.nextId}|${moves}`;

export function roadNet(state) {
  const c = cache.get(state);
  if (c && c.day === state.day && c.n === state.buildings.length && c.next === state.nextId && c.moves === moves) return c.road;
  // something may have changed: rebuild only if the roads, Lifts, Command Centre or docks did (a cheap hash of them)
  let hsh = 0, k = 0;
  const DK = { main: 0, upper: 1, lower: 2 };
  for (const b of state.buildings) {
    if (b.key !== 'road' && b.key !== 'lift' && b.key !== 'command' && b.key !== 'dock') continue;
    hsh = (Math.imul(hsh, 31) + (b.y * 4096 + b.x) * 4 + (DK[deckOf(b)] || 0) + (b.key === 'road' ? 0 : b.build > 0 ? 7e6 : 9e6)) | 0; k++;
  }
  const road = c && c.hsh === hsh && c.k === k ? c.road : buildRoadNet(state);
  if (road === c?.road) road.parks = parksOf(state, road.compsOf);
  cache.set(state, { day: state.day, n: state.buildings.length, next: state.nextId, moves, road, hsh, k });
  return road;
}
const parksOf = (state, compsOf) => state.buildings.filter((b) => spec(b).park > 0 && compsOf(b).length);

function buildRoadNet(state) {
  const w = state.map.w, h = state.map.h, n = w * h;
  const mask = {}, label = {};
  for (const d of DECKS) { mask[d] = new Uint8Array(n); label[d] = new Int32Array(n).fill(-1); }
  for (const b of state.buildings) if (b.key === 'road' && mask[deckOf(b)]) mask[deckOf(b)][b.y * w + b.x] = 1;
  const lifts = liftTiles(state);
  for (const i of lifts) for (const d of DECKS) mask[d][i] = 1;
  let comps = 0;
  const q = new Int32Array(n);
  for (const d of DECKS) {
    const m = mask[d], L = label[d];
    for (let s = 0; s < n; s++) {
      if (!m[s] || L[s] >= 0) continue;
      const id = comps++;
      let head = 0, tail = 0;
      q[tail++] = s; L[s] = id;
      while (head < tail) {
        const i = q[head++], x = i % w, y = (i / w) | 0;
        if (x > 0 && m[i - 1] && L[i - 1] < 0) { L[i - 1] = id; q[tail++] = i - 1; }
        if (x < w - 1 && m[i + 1] && L[i + 1] < 0) { L[i + 1] = id; q[tail++] = i + 1; }
        if (y > 0 && m[i - w] && L[i - w] < 0) { L[i - w] = id; q[tail++] = i - w; }
        if (y < h - 1 && m[i + w] && L[i + w] < 0) { L[i + w] = id; q[tail++] = i + w; }
      }
    }
  }
  // Lifts join the decks' networks: a union-find over the components
  const parent = new Int32Array(comps).map((_, i) => i);
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (const i of lifts) { let r = -1; for (const d of DECKS) { const l = label[d][i]; if (l < 0) continue; if (r < 0) r = find(l); else parent[find(l)] = r; } }
  const memo = new Map();
  const compsOf = (b) => {
    const hit = memo.get(b.id);
    if (hit && hit.x === b.x && hit.y === b.y && hit.deck === deckOf(b)) return hit.out;
    const L = label[deckOf(b)], k = BUILDING[b.key]?.size || 1, set = new Set();
    if (L) {
      const at = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) { const l = L[y * w + x]; if (l >= 0) set.add(find(l)); } };
      if (b.key === 'road' || b.key === 'lift') for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) at(b.x + dx, b.y + dy);
      for (let d = 0; d < k; d++) { at(b.x + d, b.y - 1); at(b.x + d, b.y + k); at(b.x - 1, b.y + d); at(b.x + k, b.y + d); }
    }
    const out = [...set];
    memo.set(b.id, { x: b.x, y: b.y, deck: deckOf(b), out });
    return out;
  };
  const hub = new Set();
  for (const b of state.buildings) if ((b.key === 'command' || b.key === 'dock') && finished(b)) for (const c of compsOf(b)) hub.add(c);
  // the parks (for rules.parkAt's reach along roads), fixed for the day like the roads
  return { compsOf, hub, comps, parks: parksOf(state, compsOf) };
}

// Does b have a road beside it? Is it on the same road network as a? Is it linked to the Command Centre or a dock?
export const touchesRoad = (state, b) => roadNet(state).compsOf(b).length > 0;
export function roadLinked(state, a, b) {
  const net = roadNet(state), ca = net.compsOf(a);
  if (!ca.length) return false;
  const cb = net.compsOf(b);
  return cb.some((c) => ca.includes(c));
}
export function hubLinked(state, b) {
  const net = roadNet(state);
  return net.hub.size > 0 && net.compsOf(b).some((c) => net.hub.has(c));
}
// The inspector's "Road" line: { touches, linked, text }.
export function roadInfo(state, b) {
  const touches = touchesRoad(state, b), linked = touches && hubLinked(state, b);
  const d = BUILDING[b.key];
  const gate = d?.levels && ROAD_GATE_OF(b.key);
  const grow = gate ? ` ${d.quad ? 'It grows a day sooner, and' : 'It'} can grow past ${d.levels[gate - 2]?.name || 'its level'}.` : '';
  const text = !touches
    ? `No road beside it. A road gives: services, parks and shops reaching ${ROAD.reach} tiles further along it${linked ? '' : ', and, linked to the Command Centre, upkeep −10% and faster building'}.${gate ? ` Without one it stays at ${d.levels[gate - 2]?.name || 'its level'} or below (it never shrinks for it).` : ''}`
    : linked ? `Linked to the Command Centre: upkeep −10%, built a quarter faster, services, parks and shops on this road reach ${ROAD.reach} tiles further.${grow}`
      : `On a road, but not one that reaches the Command Centre or a dock: services, parks and shops on it reach ${ROAD.reach} tiles further.${grow} Link it to the Command Centre for upkeep −10% and faster building.`;
  return { touches, linked, text };
}
const ROAD_GATE_OF = (key) => ROAD_GATE[key] || 0;

// ---------------------------------------------------------------- the monorail lines
const mcache = new WeakMap();
const stationOf = (b) => b.key === 'monorail' || (b.key === 'marketquad' && b.level >= LINE.marketLevel && (!b.mega || b.mega.lead === b.id));
// The station's centre: a merged Market Quad's is its whole megastructure's.
const stationCentre = (b) => (b.mega ? { x: b.mega.x + b.mega.w / 2, y: b.mega.y + b.mega.h / 2 } : centre(b));
export function monorailNet(state) {
  const on = !!state.research?.done?.includes(LINE.tech);
  let sig = `${sigOf(state)}|${on}`;
  if (on) for (const b of state.buildings) if (b.key === 'marketquad' || b.key === 'monorail') sig += `|${b.id}:${b.level}:${active(b) ? 1 : 0}:${b.mega ? b.mega.lead : ''}`;
  const c = mcache.get(state);
  if (c && c.sig === sig) return c.net;
  const net = { stations: [], links: [], linked: new Set() };
  if (on) {
    const list = state.buildings.filter((b) => stationOf(b) && active(b)).map((b) => ({ b, id: b.id, deck: deckOf(b), ...stationCentre(b), kind: b.key === 'monorail' ? 'stop' : 'market' }));
    net.stations = list;
    const seen = new Set();
    for (const s of list) {
      const near = list.filter((o) => o !== s && o.deck === s.deck).map((o) => ({ o, d: Math.hypot(o.x - s.x, o.y - s.y) })).filter((e) => e.d <= LINE.range).sort((a, b) => a.d - b.d || a.o.id - b.o.id).slice(0, LINE.links);
      for (const { o } of near) {
        const k = s.id < o.id ? `${s.id}-${o.id}` : `${o.id}-${s.id}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const [a, b] = s.id < o.id ? [s, o] : [o, s];
        net.links.push({ a, b, deck: s.deck, key: k });
        net.linked.add(a.id); net.linked.add(b.id);
      }
    }
  }
  mcache.set(state, { sig, net });
  return net;
}
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
// Is b served by a monorail line (a linked station itself, near one, or beside the line)?
export function onMonorail(state, b) {
  const net = monorailNet(state);
  if (!net.links.length) return false;
  if (net.linked.has(b.id) || (b.mega && net.linked.has(b.mega.lead))) return true;
  const c = centre(b), dk = deckOf(b);
  for (const s of net.stations) if (s.deck === dk && net.linked.has(s.id) && Math.max(Math.abs(s.x - c.x), Math.abs(s.y - c.y)) <= LINE.stationReach) return true;
  for (const l of net.links) if (l.deck === dk && segDist(c.x, c.y, l.a.x, l.a.y, l.b.x, l.b.y) <= LINE.corridor) return true;
  return false;
}
// A Market Quad on a line: its credits × LINE.marketBonus (sim.js step 5).
export const monorailMarket = (state, b) => b.key === 'marketquad' && b.level >= LINE.marketLevel && monorailNet(state).linked.has(b.mega ? b.mega.lead : b.id);

// ---------------------------------------------------------------- megastructures
// Owner (2026-11-08): "when it maxes out with two or four adjacent quads of the same type, it will become something
// huge". Two top-level quads side by side (a 4×2 or 2×4 block) or four in a square (4×4), aligned on their 2×2 grid,
// merge: each member moves to the level marked `mega: 2` or `mega: 4` (data/buildings.js) and carries b.mega =
// { lead, n, x, y, w, h } (the lead is the top-left member; the view draws the megastructure on it). Four are preferred:
// two pairs that come to form a square merge again into four. A megastructure keeps the top level's needs; if any fails
// for MEGA.splitDays days it splits back into top-level quads, as it does at once if a member is moved or demolished.
export const topLevelOf = (key) => BUILDING[key].levels.findIndex((l) => l.mega);   // the top grown level's number (9)
export const megaLevelOf = (key, n) => BUILDING[key].levels.findIndex((l) => l.mega === n) + 1;   // 10 for 2, 11 for 4
const plural = (s) => (/y$/.test(s) ? s.slice(0, -1) + 'ies' : s + 's');
const an = (s) => (/^[AEIOU]/.test(s) ? 'an' : 'a');
const holdsTop = (state, b) => habitatNeeds(state, { ...b, level: topLevelOf(b.key) - 1 }).every((n) => n.met || n.grow);

function split(state, members) {
  const top = topLevelOf(members[0].key);
  for (const m of members) { m.level = top; m.grow = 0; delete m.mega; delete m.megaFail; }
}
function merge(members, n) {
  members.sort((a, b) => a.y - b.y || a.x - b.x);
  const lead = members[0], x = Math.min(...members.map((m) => m.x)), y = Math.min(...members.map((m) => m.y));
  const w = Math.max(...members.map((m) => m.x)) + 2 - x, h = Math.max(...members.map((m) => m.y)) + 2 - y, lv = megaLevelOf(lead.key, n);
  for (const m of members) { m.level = lv; m.grow = 0; m.mega = { lead: lead.id, n, x, y, w, h }; delete m.megaFail; }
  return lead;
}

// Each day (sim.js step 8, after growth): check, split and merge. say(kind, text, loud).
export function megaDay(state, say = () => {}) {
  const groups = new Map();
  for (const b of state.buildings) if (b.mega) { const g = groups.get(b.mega.lead) || []; g.push(b); groups.set(b.mega.lead, g); }
  for (const [lead, members] of groups) {
    const m0 = members[0], d = BUILDING[m0.key], meg = m0.mega, L = d.levels[megaLevelOf(m0.key, meg.n) - 1];
    const ok = members.length === meg.n && members.every((m) => m.key === m0.key && m.mega.lead === lead && deckOf(m) === deckOf(m0) && m.x >= meg.x && m.y >= meg.y && m.x + 2 <= meg.x + meg.w && m.y + 2 <= meg.y + meg.h && m.level === megaLevelOf(m.key, meg.n));
    if (!ok) { split(state, members); say('mega', `The ${L.name} split back into ${plural(d.levels[topLevelOf(m0.key) - 1].name)}: one of its quads was moved or demolished.`); continue; }
    const head = members.find((m) => m.id === lead) || m0;
    const fails = members.some((m) => !active(m) || !holdsTop(state, m));
    head.megaFail = fails ? (head.megaFail || 0) + 1 : 0;
    if (head.megaFail >= MEGA.splitDays) { split(state, members); say('mega', `The ${L.name} split back into ${plural(d.levels[topLevelOf(m0.key) - 1].name)}: its needs went unmet for ${MEGA.splitDays} days (each quad's panel says what is missing).`, true); }
  }
  for (const key of MEGA.keys) {
    const top = topLevelOf(key), two = megaLevelOf(key, 2), names = BUILDING[key].levels;
    const at = new Map(), used = new Set();
    const cands = state.buildings.filter((b) => b.key === key && (b.level === top || (b.level === two && b.mega)) && active(b) && holdsTop(state, b)).sort((a, b) => a.y - b.y || a.x - b.x);
    if (cands.length < 2) continue;
    for (const b of cands) at.set(`${deckOf(b)}|${b.x}|${b.y}`, b);
    const get = (b, dx, dy) => { const o = at.get(`${deckOf(b)}|${b.x + dx}|${b.y + dy}`); return o && !used.has(o.id) ? o : null; };
    // four in a square first (two pairs that now make a square merge too)
    for (const b of cands) {
      if (used.has(b.id)) continue;
      const block = [b, get(b, 2, 0), get(b, 0, 2), get(b, 2, 2)];
      if (block.some((m) => !m)) continue;
      const ids = new Set(block.map((m) => m.id));
      if (block.some((m) => m.mega && state.buildings.some((o) => o.mega?.lead === m.mega.lead && !ids.has(o.id)))) continue;
      for (const m of block) used.add(m.id);
      merge(block, 4);
      say('mega', `Four ${plural(names[top - 1].name)} have grown into ${an(names[megaLevelOf(key, 4) - 1].name)} ${names[megaLevelOf(key, 4) - 1].name}.`, true);
    }
    // then pairs
    for (const b of cands) {
      if (used.has(b.id) || b.level !== top) continue;
      const o = [get(b, 2, 0), get(b, 0, 2)].find((m) => m && m.level === top);
      if (!o) continue;
      used.add(b.id); used.add(o.id);
      merge([b, o], 2);
      say('mega', `Two ${plural(names[top - 1].name)} have grown into ${names[two - 1].name}.`, true);
    }
  }
}
// A member moved or demolished (rules.move, rules.demolish): the megastructure splits back into top-level quads at once.
export function megaBreak(state, b) {
  const members = state.buildings.filter((m) => m.mega && m.mega.lead === b.mega.lead);
  const d = BUILDING[b.key], name = d.levels[b.level - 1]?.name;
  split(state, members);
  log(state, `The ${name} split back into ${plural(d.levels[topLevelOf(b.key) - 1].name)}.`);
}
// What the inspector shows of a megastructure member: { name, n, lead, failing } or null.
export function megaInfo(state, b) {
  if (!b.mega) return null;
  const head = state.buildings.find((m) => m.id === b.mega.lead);
  return { name: spec(b).levelName, n: b.mega.n, lead: b.mega.lead, failing: head?.megaFail || 0 };
}
