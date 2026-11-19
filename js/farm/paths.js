// Sato's Harvest: how people walk (docs/FARM.md §15). Pure: no three.js, no DOM, so node tests can use it.
// A walk grid per map (the player's own collision: solid ground, buildings, solid props, posts; people keep off the soil),
// distance fields to any point (8-way Dijkstra, cached), routes across maps through exits, doors, back doors and the spoke
// lift, and a day plan: for each person, where they stand and the walks between, as a function of the time of day.
import { allMaps, doorTarget, outsideOf, findSpot } from './maps.js';

export const WALK = 2.3;                          // tiles a second of real time (Sato walks 3.9)
export const TILES_PER_MIN = WALK * 0.6;          // a game minute is 0.6 s
export const LIFT_AT = { village: [56.5, 13.7], central: [34.5, 50.5], lower: [27.5, 37.6] }, LIFT_DECK = { village: 0, central: 1, lower: 2 };
const SQ2 = Math.SQRT2, N8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];

// ---------------------------------------------------------------- the walk grid
const grids = new Map();                          // map id → { key, w, h, g: Uint8Array (1 = walkable), fields: Map }
const extra = new Map();                          // map id → Set of 'x,y' tiles blocked by things set down (chests, machines, trees)
let version = 0, blockVer = 0;
export const pathVersion = () => version, blockVersion = () => blockVer;
export function setBlockers(mapId, tiles) { const k = [...tiles].sort().join(';'), old = extra.get(mapId); if ((old ? old.key : '') === k) return; extra.set(mapId, Object.assign(new Set(tiles), { key: k })); version++; blockVer++; }
function keyOf(m) { return (m.ver || '') + '|' + ((extra.get(m.id) || {}).key || ''); }
export function grid(m) {
  let G = grids.get(m.id); const key = keyOf(m);
  if (G && G.key === key && G.w === m.w) return G;
  const w = m.w, h = m.h, g = new Uint8Array(w * h), ex = extra.get(m.id);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (m.solid(x, y) || m.at(x, y) === 'f' || (ex && ex.has(x + ',' + y))) continue;
    const cx = x + 0.5, cy = y + 0.5; let ok = true;
    for (const [px, py, pr] of m.posts) if (Math.abs(px - cx) < 2 && Math.abs(py - cy) < 2 && Math.hypot(px - cx, py - cy) < pr + 0.22) { ok = false; break; }
    if (ok) g[y * w + x] = 1;
  }
  if (G && G.key !== key) version++;
  G = { key, w, h, g, fields: new Map() }; grids.set(m.id, G); return G;
}
const walkable = (G, x, y) => x >= 0 && y >= 0 && x < G.w && y < G.h && G.g[y * G.w + x] === 1;
// The nearest walkable tile to a point (a spot can sit on the edge of something).
function cellOf(G, x, y) {
  const cx = Math.floor(x), cy = Math.floor(y); if (walkable(G, cx, cy)) return [cx, cy];
  let best = null, bd = 9;
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (walkable(G, cx + i, cy + j)) { const d = Math.hypot(cx + i + 0.5 - x, cy + j + 0.5 - y); if (d < bd) { bd = d; best = [cx + i, cy + j]; } }
  return best;
}

// ---------------------------------------------------------------- distance fields
// Distances (in tiles) from every tile to the target tile, 8-way without cutting corners. Infinity: no way there.
function field(m, tx, ty) {
  const G = grid(m), c = cellOf(G, tx, ty); if (!c) return null;
  const k = c[1] * G.w + c[0]; let F = G.fields.get(k); if (F) return F;
  F = new Float32Array(G.w * G.h).fill(Infinity); F[k] = 0;
  const heap = [k], pri = [0];                    // a binary heap of tile indices by distance
  const push = (i, d) => { let n = heap.length; heap.push(i); pri.push(d); while (n > 0) { const p = (n - 1) >> 1; if (pri[p] <= d) break; heap[n] = heap[p]; pri[n] = pri[p]; n = p; } heap[n] = i; pri[n] = d; };
  const pop = () => { const top = heap[0], d0 = pri[0], li = heap.pop(), ld = pri.pop(); if (heap.length) { let n = 0; for (;;) { let c2 = 2 * n + 1; if (c2 >= heap.length) break; if (c2 + 1 < heap.length && pri[c2 + 1] < pri[c2]) c2++; if (pri[c2] >= ld) break; heap[n] = heap[c2]; pri[n] = pri[c2]; n = c2; } heap[n] = li; pri[n] = ld; } return [top, d0]; };
  while (heap.length) {
    const [i, d] = pop(); if (d > F[i] + 1e-3) continue;
    const x = i % G.w, y = (i - x) / G.w;
    for (const [dx, dy, cost] of N8) {
      const nx = x + dx, ny = y + dy; if (!walkable(G, nx, ny)) continue;
      if (dx && dy && (!walkable(G, x + dx, y) || !walkable(G, x, y + dy))) continue;
      const j = ny * G.w + nx, nd = d + cost; if (nd < F[j] - 1e-3) { F[j] = nd; push(j, nd); }
    }
  }
  G.fields.set(k, F); return F;
}
// Tiles from a point to a point on one map (Infinity if there is no way).
export function distance(m, ax, ay, bx, by) { const F = field(m, bx, by), G = grid(m), c = cellOf(G, ax, ay); if (!F || !c) return Infinity; const d = F[c[1] * G.w + c[0]]; return d === Infinity ? d : d + Math.hypot(c[0] + 0.5 - ax, c[1] + 0.5 - ay) * 0.5; }
// Is the straight line clear for somebody about half a tile wide?
function clear(G, ax, ay, bx, by) {
  const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / 0.2));
  for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n; for (const [ox, oy] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) if (!walkable(G, Math.floor(x + ox), Math.floor(y + oy))) return false; }
  return true;
}
// The walk itself: down the field from a to b, then pulled straight where the way is clear. → [[x, y], …] or null.
export function walkPath(m, ax, ay, bx, by) {
  const F = field(m, bx, by), G = grid(m), c = cellOf(G, ax, ay); if (!F || !c || F[c[1] * G.w + c[0]] === Infinity) return null;
  const cells = [[ax, ay]]; let [x, y] = c, guard = G.w * G.h;
  while (F[y * G.w + x] > 0 && guard-- > 0) {
    let bi = -1, bv = F[y * G.w + x];
    for (const [dx, dy, cost] of N8) { const nx = x + dx, ny = y + dy; if (!walkable(G, nx, ny) || (dx && dy && (!walkable(G, x + dx, y) || !walkable(G, x, y + dy)))) continue; const v = F[ny * G.w + nx] + cost * 1e-3; if (v < bv) { bv = v; bi = ny * G.w + nx; } }
    if (bi < 0) break; x = bi % G.w; y = (bi - x) / G.w; cells.push([x + 0.5, y + 0.5]);
  }
  cells.push([bx, by]);
  const out = [cells[0]]; let i = 0;
  while (i < cells.length - 1) { let j = cells.length - 1; while (j > i + 1 && !clear(G, cells[i][0], cells[i][1], cells[j][0], cells[j][1])) j--; out.push(cells[j]); i = j; }
  return out;
}
const lengthOf = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };

// ---------------------------------------------------------------- the ways between maps
// Each portal: walk to (x, y) on `map`, come out at (ax, ay) on `to`, `cost` minutes later (the lift takes a while).
let PORTALS = null;
export function portals() {
  if (PORTALS) return PORTALS;
  const M = allMaps(), P = {}, add = (map, x, y, to, ax, ay, cost = 0, kind = 'door') => (P[map] ||= []).push({ map, x, y, to, ax, ay, cost, kind });
  for (const m of Object.values(M)) {
    for (const e of m.exits) if (M[e.to.map]) add(m.id, Math.floor((e.x0 + e.x1) / 2) + 0.5, Math.floor((e.y0 + e.y1) / 2) + 0.5, e.to.map, e.to.x, e.to.y, 0, 'exit');
    for (const d of m.doors) if (!d.lock && M[d.to.map]) { const t = doorTarget(d.to.map); add(m.id, d.x + 0.5, d.y + 0.5, d.to.map, t.x, t.y, d.kind === 'orbital_elevator' ? 6 : 0, d.kind === 'orbital_elevator' ? 'lift' : 'door'); }
    if (m.indoor && m.exitTile) { const o = outsideOf(m.id); if (o && M[o.map] && (m.backTo || M[o.map].doors.some((d) => d.to.map === m.id))) add(m.id, m.exitTile[0] + 0.5, m.exitTile[1] + 0.5, o.map, o.x, o.y, m.id === 'hangar' ? 6 : 0, m.id === 'hangar' ? 'lift' : 'door'); }
    if (m.backTo) { const t = doorTarget(m.id); add(m.backTo.map, m.backTo.x, m.backTo.y, m.id, t.x, t.y); }
  }
  for (const a of Object.keys(LIFT_AT)) for (const b of Object.keys(LIFT_AT)) if (a !== b) add(a, ...LIFT_AT[a], b, ...LIFT_AT[b], Math.abs(LIFT_DECK[a] - LIFT_DECK[b]) * 15 + 5, 'lift');
  return (PORTALS = P);
}
// The quickest way from a point to a point, across maps: { legs: [{ map, pts, len, t }], wait: [minutes after each leg], minutes } or null.
const routes = new Map();
export function route(fromMap, fx, fy, toMap, tx, ty) {
  const M = allMaps(), key = `${fromMap}:${fx.toFixed(2)},${fy.toFixed(2)}>${toMap}:${tx.toFixed(2)},${ty.toFixed(2)}@${version}|${(M.lower && M.lower.ver) || ''}`;
  if (routes.has(key)) return routes.get(key);
  const P = portals(), best = new Map(), from = new Map(), q = [];
  // nodes: 'S' (start), portal index strings 'map#i' (standing at the portal, about to go through), 'T' (arrived)
  const relax = (node, cost, prev) => { if (cost < (best.get(node) ?? Infinity)) { best.set(node, cost); from.set(node, prev); q.push([cost, node]); } };
  const fromPoint = (map, x, y, cost, prev) => {
    const m = M[map]; if (!m) return;
    if (map === toMap) { const d = distance(m, x, y, tx, ty); if (d < Infinity) relax('T', cost + d / TILES_PER_MIN, { prev, map, x, y }); }
    (P[map] || []).forEach((p, i) => { const d = distance(m, x, y, p.x, p.y); if (d < Infinity) relax(map + '#' + i, cost + d / TILES_PER_MIN, { prev, map, x, y }); });
  };
  best.set('S', 0); fromPoint(fromMap, fx, fy, 0, 'S');
  let found = null, n = 0;
  while (q.length && n++ < 4000) {
    q.sort((a, b) => b[0] - a[0]); const [c, node] = q.pop(); if (c > (best.get(node) ?? Infinity)) continue;
    if (node === 'T') { found = c; break; }
    const [map, i] = node.split('#'), p = P[map][+i];
    fromPoint(p.to, p.ax, p.ay, c + p.cost, node);
  }
  let r = null;
  if (found != null) {
    const steps = []; let node = 'T';
    while (node !== 'S') { const f = from.get(node); steps.push({ node, ...f }); node = f.prev; }
    steps.reverse();
    const legs = [], wait = [];
    for (const s of steps) {
      const end = s.node === 'T' ? [tx, ty] : (() => { const [mp, i] = s.node.split('#'); return [P[mp][+i].x, P[mp][+i].y]; })();
      const pts = walkPath(M[s.map], s.x, s.y, end[0], end[1]) || [[s.x, s.y], end];
      legs.push({ map: s.map, pts, len: lengthOf(pts) });
      if (s.node !== 'T') { const [mp, i] = s.node.split('#'); wait.push(P[mp][+i].cost); }
    }
    r = { legs, wait, minutes: found };
  }
  if (routes.size > 4000) routes.clear();
  routes.set(key, r); return r;
}

// ---------------------------------------------------------------- the day plan
// Spots that are somebody's post: they stay to the end of it, and set off early to be on time for the next.
export const DUTY = /\.(counter|desk|altar|teacher|pupil|stage|office|exchange|press)$|^central\.dock$|^hangar\.floor$/;
const offset = (k) => (k <= 1 ? [0, 0] : [Math.cos(k * 2.2) * 1.1, Math.sin(k * 2.2) * 0.9 + 0.3]);
const spotCache = new Map();
function pointOf(spot, k) {
  const ck = spot + '#' + k; if (spotCache.has(ck)) return spotCache.get(ck);
  const at = findSpot(spot); if (!at) { spotCache.set(ck, null); return null; }
  const m = allMaps()[at.map], [ox, oy] = offset(k); let x = at.x + ox, y = at.y + oy;
  if (m.solid(x, y) || !walkable(grid(m), Math.floor(x), Math.floor(y))) { x = at.x; y = at.y; }
  const p = { map: at.map, x, y }; spotCache.set(ck, p); return p;
}
// sched(id, minute) → { spot, vis } | null (vis: seen there; off: in bed or sheltering out of sight). Samples every 10 minutes,
// 6:00 to midnight, and plans every walk so it ends on time for a post and starts on time from one.
export function planDay(ids, sched) {
  const plan = {}, ranks = {};
  for (const id of ids) plan[id] = { stops: [] };
  for (let m = 360; m <= 1440; m += 10) {
    const used = {};
    for (const id of ids) {
      const s = sched(id, m), P = plan[id], last = P.stops[P.stops.length - 1];
      const k = s ? (used[s.spot] = (used[s.spot] || 0) + 1) : 0;
      const key = s ? s.spot + '#' + k + (s.vis ? '' : '-') : null;
      if (!last || last.key !== key) P.stops.push({ T: m, key, spot: s ? s.spot : null, k, vis: !!(s && s.vis) });
    }
  }
  for (const id of ids) {
    const P = plan[id]; let A = 0;
    P.stops.forEach((st, i) => {
      st.at = st.spot ? pointOf(st.spot, st.k) : null; st.D = st.A = Math.max(st.T, A); A = Math.max(A, st.A);
      const prev = P.stops[i - 1]; if (!prev) return;
      if (!st.at || !prev.at || (prev.spot === st.spot && prev.at.map === st.at.map && Math.hypot(prev.at.x - st.at.x, prev.at.y - st.at.y) < 0.3)) return;   // nothing to walk
      const r = route(prev.at.map, prev.at.x, prev.at.y, st.at.map, st.at.x, st.at.y); if (!r) return;   // no way: they simply arrive (the old behaviour)
      const D = Math.max(DUTY.test(prev.spot) ? st.T : st.T - r.minutes, prev.D === undefined ? 0 : prev.A);
      st.D = D; st.A = D + r.minutes; st.route = r; A = st.A;
      let t = D; st.segs = r.legs.map((l, j) => { const s = { map: l.map, pts: l.pts, len: l.len, t0: t, t1: t + l.len / TILES_PER_MIN }; t = s.t1 + (r.wait[j] || 0); return s; });
    });
  }
  return plan;
}
// Where somebody is at time t (fractional minutes): { map, x, y, moving, dir, spot (when standing), vis } or null (nowhere about).
export function locate(plan, id, t) {
  const P = plan && plan[id]; if (!P || !P.stops.length) return null;
  let i = 0; while (i + 1 < P.stops.length && P.stops[i + 1].D <= t) i++;
  const st = P.stops[i];
  if (st.segs && t < st.A && t >= st.D) {
    for (const s of st.segs) {
      if (t < s.t0) return null;                    // between maps: through a door, or in the lift
      if (t <= s.t1) {
        let d = s.t1 > s.t0 ? (t - s.t0) / (s.t1 - s.t0) * s.len : s.len, p = s.pts;
        for (let k = 1; k < p.length; k++) { const L = Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); if (d <= L || k === p.length - 1) { const f = L ? Math.min(1, d / L) : 1, dx = p[k][0] - p[k - 1][0], dy = p[k][1] - p[k - 1][1]; return { map: s.map, x: p[k - 1][0] + dx * f, y: p[k - 1][1] + dy * f, moving: true, dir: Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0), spot: null, vis: true, to: st.spot }; } d -= L; }
      }
    }
    return null;
  }
  const here = t < st.D && i > 0 ? P.stops[i - 1] : st;   // waiting to set off (only before the first stop's time)
  if (!here.at) return null;
  return { map: here.at.map, x: here.at.x, y: here.at.y, moving: false, dir: 0, spot: here.spot, vis: here.vis };
}
// Everything a plan needs from the maps, computed once (tests and the first morning use it).
export function warm(ids, sched) { return planDay(ids, sched); }
