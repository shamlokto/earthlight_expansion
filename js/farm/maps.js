// Sato's Harvest: the maps (docs/FARM.md §3.3). Data only, no three.js: tile grids, buildings,
// props, exits and the named spots that story.js places people on. x runs east, y runs south;
// a tile is one unit, positions are in tiles (a tile's centre is x + 0.5, y + 0.5).
import { FIELD_SIZES, PASTURE_SIZE } from './data.js';
import { SIGNS } from './story.js';

// Ground codes: g grass · f field soil · p dirt path · c cobble · s sand · w water · k planks
// r cliff rock (solid) · a ash (the Old World) · o stone floor · h hay · b boards (indoor floor)
// d deck plating (the colony's own metal paving) · x nothing
// Some trees bear fruit anyone may pick (data.js WILD_TREES). Chosen by position so saves stay valid.
const WILD_KINDS = ['plum', 'loquat', 'mulberry', 'wild_apple', 'chestnut', 'yuzu'];
function wildFruit(m, every, kinds = WILD_KINDS, limit = 99) {
  let k = 0, n = 0, k2 = 0;
  for (const p of m.props) {
    if (p.kind !== 'tree' || n >= limit) continue;
    if (p.x <= 0 || p.y <= 0 || p.x >= m.w - 1 || p.y >= m.h - 1) continue;       // not the border wall of trees
    if (k2++ % every !== 0) continue;
    p.fruit = kinds[k++ % kinds.length]; n++;
  }
}
// v: the belt's dust lane (a dark floor between drifting rocks)
export const SOLID_GROUND = new Set(['w', 'r', 'x']);
// Thin or round things collide as a small circle around their middle instead of a whole tile, so
// lawns with trees and lamps stay walkable (radius in tiles).
export const POST_RADIUS = { tree: 0.32, pine: 0.3, bush: 0.42, lantern: 0.14, colony_lamp: 0.16, signpost: 0.14, noticeboard: 0.3, solar_panel: 0.38, hydro_tower: 0.36, water_tank: 0.62, wind_turbine_small: 0.3, fan_tower: 0.4, scarecrow: 0.2, rockdecor: 0.4, vent: 0.38, fountain: 0.95, well: 0.5, bin: 0.42, memorial: 0.6, cargo_crate: 0.45, maint_bot: 0.3, hours_sign: 0.18, mailbox: 0.18 };

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

class MapDef {
  constructor(id, w, h, fill, opts = {}) {
    this.id = id; this.w = w; this.h = h; this.g = new Array(w * h).fill(fill);
    this.buildings = []; this.props = []; this.exits = []; this.spots = {}; this.doors = [];
    this.indoor = false; this.name = id; Object.assign(this, opts);
    this.block = new Uint8Array(w * h);            // 1 = a building or solid prop stands here
    this.posts = [];                                // [x, y, r, propIndex] round obstacles
  }
  at(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 'x' : this.g[y * this.w + x]; }
  fill(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y * this.w + x] = c; return this; }
  solid(x, y) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return true; return SOLID_GROUND.has(this.g[y * this.w + x]) || this.block[y * this.w + x] === 1; }
  // A building: footprint x..x+w-1, y..y+d-1; its door tile is the tile in front of the middle.
  building(kind, x, y, w, d, o = {}) {
    const b = { kind, x, y, w, d, height: 3, ...o }; this.buildings.push(b);
    for (let j = y; j < y + d; j++) for (let i = x; i < x + w; i++) this.block[j * this.w + i] = 1;
    if (o.to) this.doors.push({ x: x + Math.floor(w / 2), y: y + d, to: o.to, kind, lock: o.lock || null });
    return b;
  }
  prop(kind, x, y, o = {}) {
    const p = { kind, x, y, solid: true, w: 1, d: 1, ...o }; this.props.push(p);
    if (p.solid && POST_RADIUS[kind] && !o.tileSolid) { const r = POST_RADIUS[kind] * Math.min(1.3, p.scale || 1); this.posts.push([Math.floor(x) + p.w / 2, Math.floor(y) + p.d / 2, r, this.props.length - 1]); p.post = true; return p; }
    if (p.solid) for (let j = 0; j < p.d; j++) for (let i = 0; i < p.w; i++) { const xx = Math.floor(x) + i, yy = Math.floor(y) + j; if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h) this.block[yy * this.w + xx] = 1; }
    return p;
  }
  exit(x0, y0, x1, y1, to) { this.exits.push({ x0, y0, x1, y1, to }); return this; }
  spot(name, x, y) { this.spots[name] = [x, y]; return this; }
  // Grow the map east and south: every old tile keeps its place (new ground is `fill`).
  grow(w, h, fill) { const g = new Array(w * h).fill(fill), b = new Uint8Array(w * h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { g[y * w + x] = this.g[y * this.w + x]; b[y * w + x] = this.block[y * this.w + x]; } this.g = g; this.block = b; this.w = w; this.h = h; return this; }
  // Take out the props standing in a block of tiles (they stay in the list as 'nothing', so prop indices and saves keep their meaning).
  clearProps(x0, y0, x1, y1) {
    this.props.forEach((p, i) => { const x = Math.floor(p.x), y = Math.floor(p.y); if (x < x0 || x > x1 || y < y0 || y > y1 || p.kind === 'nothing') return;
      if (p.solid && !p.post) for (let j = 0; j < p.d; j++) for (let k = 0; k < p.w; k++) { const xx = x + k, yy = y + j; if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h) this.block[yy * this.w + xx] = 0; }
      this.posts = this.posts.filter((q) => q[3] !== i); Object.assign(p, { kind: 'nothing', solid: false, act: undefined, fruit: undefined }); });
    return this;
  }
  postNear(x, y, r) { return this.posts.some(([px, py, pr]) => Math.hypot(px - x, py - y) < pr + r); }
  free(x, y) { return !this.solid(x, y) && this.at(x, y) === 'g' && !this.postNear(x + 0.5, y + 0.5, 0.55); }
  // Trees and bushes on free grass, away from paths and doors.
  scatter(seed, n, kinds, keep = () => true) {
    const r = rng(seed); let tries = 0;
    while (n > 0 && tries++ < 4000) {
      const x = Math.floor(r() * this.w), y = Math.floor(r() * this.h);
      if (!this.free(x, y) || !keep(x, y)) continue;
      let ok = true;
      for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1; i++) { const c = this.at(x + i, y + j); if (c !== 'g' || this.block[(y + j) * this.w + x + i]) { ok = false; break; } }
      if (ok && this.postNear(x + 0.5, y + 0.5, 1.2)) ok = false;
      if (!ok || this.doors.some((d) => Math.abs(d.x - x) < 3 && Math.abs(d.y - y) < 3)) continue;
      const kind = kinds[Math.floor(r() * kinds.length)];
      this.prop(kind, x, y, { solid: kind !== 'flowers', scale: 0.85 + r() * 0.4, rot: r() * 6.28 }); n--;
    }
    return this;
  }
  border(kind, seed, skip = () => false) {
    const r = rng(seed);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (x > 0 && y > 0 && x < this.w - 1 && y < this.h - 1) continue;
      if (skip(x, y) || this.at(x, y) !== 'g') continue;
      this.prop(kind, x, y, { scale: 1 + r() * 0.5, rot: r() * 6.28, tileSolid: true });
    }
    return this;
  }
}

// ---------------------------------------------------------------- outdoors

function farm() {
  const m = new MapDef('farm', 44, 34, 'g', { name: 'The Hollin field · Upper deck' });
  const [fw, fh] = FIELD_SIZES.farm, [pw, ph] = PASTURE_SIZE;
  m.field = { id: 'farm', x: 3, y: 11, w: fw, h: fh };
  m.pasture = { x: 26, y: 12, w: pw, h: ph };
  m.fill(3, 11, 3 + fw - 1, 11 + fh - 1, 'f');
  m.fill(3, 8, 41, 9, 'p').fill(21, 8, 22, 33, 'p').fill(41, 8, 43, 9, 'p');      // yard road, south road, east road
  m.fill(6, 7, 6, 7, 'p').fill(15, 6, 15, 7, 'p').fill(24, 7, 24, 7, 'p').fill(37, 6, 37, 7, 'p');
  m.fill(27, 23, 35, 29, 's').fill(28, 24, 34, 28, 'w');
  m.building('house', 4, 3, 5, 4, { height: 3.2, to: { map: 'house' }, label: 'Farmhouse' });
  m.prop('house_annex', 1, 3, { w: 3, d: 3, solid: false, decorSolid: true, when: 'house_back' }); m.hasDecor = true;   // the back bedroom, seen from outside (2026-11-22)
  m.building('coop', 14, 3, 4, 3, { height: 2.2, to: { map: 'coop' }, label: 'Hen coop' });
  m.building('barn', 21, 2, 7, 5, { height: 4.2, to: { map: 'barn' }, label: 'Barn' });
  m.building('silo', 29, 4, 2, 2, { height: 5, label: 'Silo' });
  m.prop('feed_sacks', 29, 6, { act: 'silo', label: 'Silo hatch' });          // E: the silo's stores (fodder, hen feed)
  m.millAt = [31, 4, 2, 2];                                                     // where Ruess builds the feed mill (drawn when flags.feed_mill)
  m.building('greenhouse', 34, 2, 6, 4, { height: 2.8, to: { map: 'greenhouse' }, lock: 'greenhouse', label: 'Greenhouse' });
  m.prop('bin', 10, 6, { act: 'bin' });
  m.prop('well', 12, 6, { act: 'well' });
  m.prop('signpost', 23, 30, { act: 'sign', sign: 'farm.gate' });
  m.prop('scarecrow', 19, 12, { solid: true });
  // pasture fence, with a gate gap on the north side
  const P = m.pasture;
  for (let x = P.x - 1; x <= P.x + P.w; x++) { if (x !== P.x + 5 && x !== P.x + 6) m.prop('fence', x, P.y - 1, { rot: 0 }); m.prop('fence', x, P.y + P.h, { rot: 0 }); }
  for (let y = P.y; y < P.y + P.h; y++) { m.prop('fence', P.x - 1, y, { rot: Math.PI / 2 }); m.prop('fence', P.x + P.w, y, { rot: Math.PI / 2 }); }
  m.exit(21, 33, 22, 33, { map: 'village', x: 31.5, y: 1.6, dir: 0 });
  m.exit(63, 8, 63, 9, { map: 'hill', x: 1.6, y: 13, dir: 3 });   // at the farm's east edge (it moved out when the farm grew)
  m.spot('farm.porch', 7.5, 8.4).spot('farm.bin', 11.4, 7.5).spot('farm.gate', 20.3, 31).spot('farm.pond', 26.4, 25.5).spot('farm.field', 19.6, 15);
  m.start = [6.5, 8.5];
  m.border('tree', 11, (x, y) => (y === 33 && (x === 21 || x === 22)) || (x === 43 && (y === 8 || y === 9)));
  m.scatter(5, 16, ['tree', 'tree', 'bush', 'flowers'], (x, y) => !(x >= P.x - 2 && x <= P.x + P.w + 1 && y >= P.y - 2 && y <= P.y + P.h + 1) && y > 9);
  m.prop('reeds', 27, 26, { solid: false }); m.prop('reeds', 35, 24, { solid: false });
  // the colony's share of the farm: a panel by the barn, a rain tank, the irrigation main along the field
  m.prop('solar_panel', 31, 6, { w: 2 }); m.prop('water_tank', 40, 3, { w: 2, d: 2 }); m.prop('pipe_run', 2, 11, { d: fh });
  m.prop('colony_lamp', 19, 7); m.prop('vent', 33, 10);
  wildFruit(m, 3); m.wildShared = false;
  return farmEast(m);
}

// Willowfall: a small colony town on the Lantern Ring. North of the river: Market Street, Lantern
// Square, the hydroponics garden and the lift kiosk plaza; south of it: the ranch, clinic and
// library lane, Willow Lane's cottages and Fountain Park. Door positions only matter to this file.
function village() {
  const m = new MapDef('village', 64, 52, 'g', { name: 'Willowfall · the Lantern Ring' });
  m.fill(0, 27, 63, 29, 'w').fill(0, 26, 63, 26, 's').fill(0, 30, 63, 30, 's');      // the river and its banks
  m.fill(31, 0, 32, 47, 'p');                                                          // the main road, north to south
  m.fill(3, 8, 60, 9, 'c').fill(17, 7, 17, 7, 'c').fill(45, 7, 45, 7, 'c');           // Market Street (and door steps)
  m.fill(6, 17, 60, 18, 'p').fill(18, 16, 18, 16, 'p');                               // the cross street
  m.fill(25, 11, 38, 21, 'c');                                                         // Lantern Square
  m.fill(31, 26, 32, 30, 'k').fill(12, 26, 13, 30, 'k');                              // the road bridge and the west footbridge
  m.fill(12, 19, 13, 25, 'p').fill(12, 31, 13, 38, 'p');                              // footbridge path
  // the riverside walk (the old dock is gone: the real one is on the Main deck)
  m.fill(48, 19, 49, 24, 'p').fill(43, 25, 57, 25, 'p');
  m.fill(3, 39, 60, 40, 'p');                                                          // the south lane
  m.fill(4, 46, 60, 47, 'p');                                                          // Willow Lane, on into the park
  m.fill(2, 11, 11, 15, 'd');                                                          // the hydroponics garden
  m.fill(51, 10, 61, 16, 'd');                                                         // the lift kiosk plaza
  m.fill(44, 42, 49, 45, 'c');                                                         // the fountain's paving
  // the buildings people go into
  m.building('store', 14, 3, 7, 4, { to: { map: 'store' }, label: "Seln's Seed & Sundry" });
  m.building('cafe', 41, 3, 8, 4, { height: 3.6, to: { map: 'cafe' }, label: 'The Hangar' });
  m.building('workshop', 15, 12, 7, 4, { height: 3.4, to: { map: 'workshop' }, label: 'Workshop' });
  m.building('hall', 42, 12, 8, 5, { height: 4, to: { map: 'hall' }, label: 'Village Hall' });
  m.building('ranch', 4, 35, 7, 4, { height: 3.4, to: { map: 'ranch' }, label: "Corran's Ranch" });
  m.building('clinic', 38, 35, 5, 4, { to: { map: 'clinic' }, label: 'Clinic' });
  m.building('library', 46, 35, 6, 4, { height: 3.6, to: { map: 'library' }, label: 'Library' });
  // and the ones that are simply there: homes, the pump house, the post, the Guardians' wing
  m.building('cottage_a', 4, 42, 5, 4, { label: 'Cottage' });
  m.building('cottage_b', 11, 42, 5, 4, { label: 'Cottage' });
  m.building('cottage_c', 18, 42, 5, 4, { label: 'Cottage' });
  m.building('cottage_d', 25, 42, 5, 4, { label: 'Cottage' });
  m.building('pumphouse', 3, 2, 5, 4, { height: 3.2, label: 'Pump House' });
  m.building('post', 20, 35, 6, 4, { height: 3.3, label: 'Courier Post' });
  m.building('guard', 51, 2, 7, 4, { height: 3.6, label: "Guardians' Post" });
  // Lantern Square
  m.prop('memorial', 31, 15, { w: 2, act: 'sign', sign: 'village.memorial', label: 'Memorial' });
  m.prop('noticeboard', 27, 11, { w: 2, act: 'sign', sign: 'village.square' });
  m.prop('lantern', 25, 11); m.prop('lantern', 38, 11); m.prop('lantern', 25, 21); m.prop('lantern', 38, 21);
  m.prop('bench', 34, 23, { w: 2 });
  m.prop('vent', 27, 23); m.prop('vent', 38, 23);
  // 2026-11-22: the square was a bare stretch of cobbles: flower beds in its four corners, benches facing the memorial, planters by the lamps
  m.prop('flower_bed', 26, 13, { w: 2 }); m.prop('flower_bed', 36, 13, { w: 2 }); m.prop('flower_bed', 26, 20, { w: 2 }); m.prop('flower_bed', 36, 20, { w: 2 });
  m.prop('bench', 28, 15, { d: 2, rot: Math.PI / 2 }); m.prop('bench', 35, 15, { d: 2, rot: -Math.PI / 2 });
  m.prop('plantpot', 25, 12); m.prop('plantpot', 38, 12); m.prop('plantpot', 25, 20); m.prop('plantpot', 38, 20);
  // signs
  m.prop('signpost', 29, 10, { act: 'sign', sign: 'village.square' });
  m.prop('signpost', 21, 7, { act: 'sign', sign: 'village.storefront' });
  m.prop('signpost', 40, 7, { act: 'sign', sign: 'village.cafefront' });
  m.prop('signpost', 22, 16, { act: 'sign', sign: 'village.workshopfront' });
  m.prop('signpost', 41, 19, { act: 'sign', sign: 'village.hallfront' });
  m.prop('signpost', 11, 38, { act: 'sign', sign: 'village.ranchyard' });
  m.prop('signpost', 47, 24, { act: 'sign', sign: 'village.riverside' });
  // Market Street: stalls, crates and lamps
  for (const x of [23, 26, 35, 38]) m.prop('market_stall', x, 6, { w: 2, rot: 0, tint: x });
  m.prop('cargo_crate', 22, 5); m.prop('cargo_crate', 40, 5); m.prop('cargo_crate', 29, 6); m.prop('cargo_crate', 34, 6, { scale: 0.8 });
  m.prop('water_tank', 9, 3, { w: 2, d: 2, scale: 1.15 });
  for (const [x, y] of [[6, 10], [13, 10], [50, 10], [24, 7], [37, 7], [8, 19], [23, 19], [40, 19], [55, 19], [15, 41], [28, 41], [36, 41], [44, 41], [54, 41], [9, 48], [16, 48], [23, 48], [38, 48], [56, 48], [30, 25], [34, 31]]) m.prop('colony_lamp', x, y);
  // the hydroponics garden: towers in rows, fed from the tank by a pipe
  { let k = 0; for (const y of [12, 14]) for (const x of [3, 5, 7, 9]) m.prop('hydro_tower', x, y, { act: 'hydro', tower: k++ }); }   // towers Seln rents out
  m.prop('water_tank', 12, 11, { w: 2, d: 2 });
  m.prop('pipe_run', 3, 11, { w: 9 });
  m.prop('wind_turbine_small', 3, 20);
  // the lift kiosk plaza: the lift between the decks, the air-circulation tower, an access hatch
  m.prop('lift_kiosk', 55, 11, { w: 3, d: 2, act: 'liftdown', sign: 'village.lift', label: 'Lift' });   // down the spoke to Eden Central
  m.prop('fan_tower', 59, 11, { w: 2, d: 2 });
  m.prop('airlock_door', 51, 10, { w: 2 });
  m.prop('noticeboard', 53, 15, { act: 'sign', sign: 'village.square' });
  m.prop('cargo_crate', 61, 15); m.prop('cargo_crate', 60, 15, { scale: 0.75 });
  m.prop('maint_bot', 58, 14, { solid: false, rot: 2.4 });
  m.prop('vent', 52, 13); m.prop('vent', 57, 15);
  m.spot('village.lift', 56.5, 13.7);
  // the river: the riverside walk with willows, benches and a fishing spot; pipes along the bank, reeds
  for (const x of [44, 52]) m.prop('bench', x, 23, { w: 2 });
  for (const [x, y] of [[43, 23], [47, 22], [51, 22], [56, 23]]) m.prop('tree', x, y, { scale: 1.1, rot: x, model: 'willow' });
  m.prop('reeds', 50, 26, { solid: false }); m.prop('reeds', 55, 26, { solid: false }); m.prop('flowers', 49, 23, { solid: false });
  m.prop('pipe_run', 36, 25, { w: 8 });
  m.prop('pipe_run', 36, 31, { w: 9 });
  for (const x of [4, 9, 21, 40, 58]) m.prop('reeds', x, 26, { solid: false });
  for (const x of [17, 26, 44]) m.prop('reeds', x, 30, { solid: false });
  // south of the river: the ranch fence, the solar yard
  for (let x = 3; x <= 9; x++) m.prop('fence', x, 33, {});
  for (const [x, y] of [[55, 33], [58, 33], [55, 35], [58, 35]]) m.prop('solar_panel', x, y, { w: 2 });
  m.prop('charge_terminal', 57, 37, { act: 'solaryard', label: 'Solar yard' });   // leave batteries to charge overnight
  m.prop('wind_turbine_small', 61, 37);
  m.prop('vent', 33, 37);
  // Willow Lane: gardens in front of the cottages
  for (const x of [5, 12, 19, 26]) { m.prop('solar_panel', x + 2, 49, { w: 2, scale: 0.8 }); m.prop('flowers', x, 49, { solid: false }); m.prop('fence', x - 1, 48, {}); m.prop('fence', x + 4, 48, {}); }
  m.prop('water_tank', 30, 49, { w: 1, d: 1, scale: 0.7 });
  // Fountain Park
  m.prop('fountain', 46, 43, { w: 2, d: 2, label: 'Fountain' });
  m.prop('bench', 41, 43, { w: 2 }); m.prop('bench', 51, 43, { w: 2 });
  for (const [x, y, k] of [[37, 43, 'tree'], [39, 50, 'tree'], [55, 43, 'tree'], [58, 50, 'pine'], [61, 44, 'tree'], [43, 49, 'bush'], [50, 49, 'bush'], [35, 49, 'pine']]) m.prop(k, x, y, { scale: 1.05, rot: x });
  for (const [x, y] of [[42, 41], [52, 41], [45, 49], [48, 49], [40, 45], [53, 45], [57, 44], [36, 45]]) m.prop('flowers', x, y, { solid: false });
  m.exit(31, 0, 32, 0, { map: 'farm', x: 22, y: 32.2, dir: 1 });
  m.spot('village.square', 31.5, 19.6).spot('village.memorial', 32, 16.8).spot('village.bridge', 30.2, 26.5).spot('village.riverside', 50.5, 25.6)
    .spot('village.bench', 35, 24.4).spot('village.storefront', 18.6, 8.6).spot('village.cafefront', 46.4, 8.6).spot('village.hallfront', 47.4, 18.4)
    .spot('village.clinicfront', 41.6, 40.4).spot('village.libraryfront', 50.4, 40.4).spot('village.workshopfront', 19.6, 17.6).spot('village.ranchyard', 9, 40.4).spot('village.river', 20, 26.5);
  m.water = 'village'; m.start = [31.5, 1.6];
  // district names and the maintenance bots' rounds (both only for the map screen and the look)
  m.areas = [['Market Street', 31.5, 10.3], ['Lantern Square', 31.5, 13], ['Hydroponics', 6.5, 16.5], ['Lift Plaza', 56, 17.6], ['Riverside', 50.5, 24], ['Willow Lane', 17, 50.3], ['Fountain Park', 47, 48.6], ['Solar Yard', 58, 32.3], ['Lantern River', 22, 28.5]];
  m.bots = [[[4, 8.5], [59.5, 8.5]], [[7, 17.5], [59.5, 17.5]], [[4, 39.5], [59.5, 39.5]], [[31.5, 2], [31.5, 46.5], [58, 46.5]]];
  m.border('tree', 21, (x, y) => (y === 0 && (x === 31 || x === 32)));
  const park = (x, y) => x >= 34 && y >= 41;
  m.scatter(8, 44, ['tree', 'tree', 'pine', 'bush', 'flowers', 'flowers'], (x, y) => !park(x, y) && !(x >= 50 && y <= 18) && !(y >= 48));
  wildFruit(m, 4, ['plum', 'loquat', 'yuzu', 'mulberry'], 5); m.wildShared = true;
  return villageLane(m);
}
// The lift kiosk's notice lives here with the map that has the kiosk (story.js owns the other signs).
const MAP_SIGNS = {
  'central.board': 'EDEN CENTRAL, Main deck. Governor\'s office: weekdays 9 to 5. The Ashfall Exchange: daily but Saturdays. Arrivals: courier runs Tue and Fri. Second Dawn Church: doors always open. Safety depot: always staffed. The school: opening soon.',
  'central.dock': 'SPACE DOCK, BAY ONE. SHUTTLE TO EARTH (the Old World): J. Maris\'s courier, any day, any hour; board at the lit gate beside her shuttle, or book at the Arrivals hall desk. Courier shuttles, cargo lighters and the Ashfall trader. Her Majesty trades from her ship on Saturdays and from the Exchange on the plaza the rest of the week. Stay behind the yellow lines when the bay doors cycle.',
  'central.watch': 'SATO\'S WATCH. Observatory and beacon of the Main deck, named by the Colony Council for Captain M. Sato, who kept watch. Dome open to the public from 7 in the evening. (The Captain has asked twice for the name to be changed. The Council has declined twice.)',
  'central.plaza': 'THE PLAZA. Rebuilt after the siege. North: the church, the school and the great window. South: the lift. East: Arrivals and the safety depot. SPACE DOCK (shuttle to Earth): north-west, past the Grand Market.',
  'central.arrivals': 'ARRIVALS. The courier desk inside books J. Maris\'s shuttle to Earth (it leaves from the space dock). Courier and supply runs from the Middle and Lower decks. J. Maris lands at 8 on Tuesdays and Fridays and asks that nobody wave at her during docking.',
  'central.market': 'GRAND MARKET. Imported seeds, saplings in any season, batteries. The terminals also BUY fine food at a fifth above bin prices. No haggling with the machines.',
  'central.school': 'EDEN CENTRAL SCHOOL. Classes for ages five to twelve. Enrolment: the Housing Office, when there is anyone to enrol. The desks are new. The chalk is new. The bell has been tested, once, by the Constable.',
  'central.church': 'SECOND DAWN CHURCH. All welcome, of any faith or none. Doors open day and night. Memorial candles for those lost in the siege are kept lit inside. The garden is the Pastor\'s; the tomatoes are not for sale, but ask.',
  'central.depot': 'SAFETY DEPOT, MAIN DECK. Peacekeeping, rescue, lost property and hull alarms. Constable A. Fenn. Always staffed. In an emergency, shout; the drones are listening. Lost hens are returned to Willowfall on Thursdays.',
  'school.board': 'On the blackboard, in very neat chalk: WELCOME TO SCHOOL! TODAY WE WILL LEARN: Underneath, a list headed OUR CLASS, with no names on it yet, and a small drawing of a sun.',
  'school.cubbies': 'Rows of little cubbies, each with an empty name card and a hook for a coat. Somebody has put a pencil in every single one.',
  'depot.map': 'The deck map glows: every corridor, lift and hatch of the Main deck, with a green light for each. All green. Beside it, a handwritten note: "All green again today. Good." The handwriting is very stiff.',
  'farm.hill': "TERRACE HILL →  The onsen, the hill lake, Terrace Falls and the summit; the orbital elevator up to Vashti's hangar. Mind the turbines.",
  'hill.summit': 'THE SUMMIT. Highest ground on the Lantern Ring. From here you can see the whole Ring curve up and over your head, the sun-line, and on a clear night the spokes lit end to end. Please do not feed the turbines.',
  'hill.terraces': 'ORCHARD TERRACES. Planted by the founders, gone wild in the war, still fruiting. Pick what is ripe; leave some for the next person.',
  'hill.falls': 'TERRACE FALLS. The lake\'s overflow, pumped round by the colony and let fall here because, the founders wrote, "people need somewhere to hear water". Fishing welcome. Swimming not.',
  'hill.onsen': 'THE TERRACE ONSEN. Hot spring, warmed by the colony\'s heat exchangers (Ruess says the pipes were "spare"). Open 6 till midnight. 100 cr a soak; free on your birthday. Please rinse before you get in. No towels in the water.',
  'village.lift': 'LANTERN RING LIFT. Spoke cars to the Middle deck and the hub, every twenty minutes. The climb takes nine; you get lighter as you go, so hold the rail near the top. Hesk\'s barricade stood here. The scorch marks are being kept, on purpose.',
};
for (const [k, v] of Object.entries(MAP_SIGNS)) if (!(k in SIGNS)) SIGNS[k] = v;

// Fourteen places where something grows each day (sim.FORAGE_SPOT_COUNT); a few hide in the corners.
// The hidden corner where a star-plum shows on one day a season (sim.STAR_SPOT).
export const STAR_SPOT_XY = [2, 17];
export const FORAGE_SPOTS = [[3, 8], [14, 5], [18, 3], [20, 6], [30, 12], [8, 15], [18, 21], [26, 19], [32, 22], [1, 23], [33, 2], [16, 10], [24, 14], [12, 8]];

function hill() {
  // 64 x 44 (it was 36 x 26; everything from before keeps its place, the new ground runs east and south)
  const m = new MapDef('hill', 64, 44, 'g', { name: 'Terrace Hill' });
  m.fill(0, 0, 63, 1, 'r').fill(0, 42, 63, 43, 'r').fill(62, 0, 63, 43, 'r').fill(0, 0, 0, 10, 'r').fill(0, 15, 0, 43, 'r');
  // the old south ridge stays as a low rock line with gaps, so the lake hollow still feels tucked away
  m.fill(1, 25, 12, 25, 'r').fill(17, 25, 28, 25, 'r');
  // Hillstream: out of the lake, east under a footbridge, south to Terrace Falls and its pool
  m.fill(16, 20, 17, 24, 'w').fill(17, 23, 38, 24, 'w').fill(37, 24, 38, 29, 'w');
  m.fill(36, 30, 47, 31, 'r').fill(38, 30, 39, 31, 'w');                     // the falls drop over this ledge
  m.fill(33, 32, 49, 39, 's').fill(34, 33, 48, 38, 'w');                    // the falls pool
  m.fill(28, 9, 52, 10, 'p').fill(51, 10, 52, 27, 'p').fill(30, 26, 51, 27, 'p').fill(40, 26, 41, 31, 'p').fill(30, 11, 31, 27, 'p');
  m.fill(30, 23, 31, 24, 'k').fill(37, 26, 38, 27, 'k');                                             // footbridge over Hillstream
  m.fill(42, 31, 43, 31, 'p').fill(50, 32, 51, 33, 'o');                      // steps down the ledge beside the falls; the bench rock
  // the Summit: a stone lookout at the north-east corner, wind turbines along the ridge
  m.fill(54, 2, 60, 7, 'o').fill(51, 7, 53, 9, 'p');
  m.prop('telescope_stand', 57, 3, { label: 'Summit lookout' }); m.prop('bench', 55, 5, { w: 2 }); m.prop('bench', 58, 5, { w: 2 });
  m.prop('signpost', 54, 8, { act: 'sign', sign: 'hill.summit' });
  for (const [tx, ty] of [[40, 3], [45, 2], [50, 3]]) m.prop('wind_turbine_small', tx, ty);
  // the Orchard terraces: stepped wild fruit and berry rows east of the path
  m.fill(54, 13, 60, 24, 'o');
  for (let ty = 14; ty <= 23; ty += 3) for (let tx = 55; tx <= 59; tx += 2) m.prop('bush', tx, ty, { rot: tx + ty });
  m.prop('signpost', 53, 14, { act: 'sign', sign: 'hill.terraces' });
  // Ranger's hut (empty for now) and its woodpile
  m.building('cottage_d', 54, 30, 5, 4, { height: 3, label: "Ranger's hut" });
  m.prop('house_door', 56, 33, { act: 'house', house: 'ranger', solid: false }); m.prop('crate', 59, 33); m.prop('haybale', 53, 33);
  m.prop('signpost', 50, 29, { act: 'sign', sign: 'hill.falls' }); m.prop('bench', 50, 32, { w: 2 });
  m.prop('lantern', 42, 30); m.prop('lantern', 44, 30); m.prop('colony_lamp', 51, 20); m.prop('colony_lamp', 41, 25);
  m.areas = [['Terrace Onsen', 6.5, 8.6], ['Hill lake', 10.5, 23.8], ['Orbital elevator', 27, 11.6], ['Summit', 57, 9], ['Orchard terraces', 57, 25.6], ['Terrace Falls', 41, 40.6], ["Ranger's hut", 56.5, 35.6], ['Hillstream', 24, 22.6]];
  m.fill(0, 12, 20, 13, 'p').fill(20, 9, 21, 13, 'p').fill(20, 9, 28, 10, 'p').fill(24, 8, 30, 9, 'c');
  m.fill(5, 17, 16, 23, 's').fill(6, 18, 15, 22, 'w');
  m.building('orbital_elevator', 25, 4, 4, 4, { height: 9, label: 'The orbital elevator', to: { map: 'hangar' } });   // the cable car up to Vashti's hangar at the axis
  m.prop('liftpad', 27, 8, { solid: false });
  m.prop('signpost', 23, 8, { act: 'sign', sign: 'hill.wreck' });
  m.prop('signpost', 9, 16, { act: 'sign', sign: 'hill.lake' });
  m.prop('signpost', 31, 19, { act: 'sign', sign: 'hill.overlook' });
  m.prop('bench', 30, 21, { w: 2 });
  // the colony at work up here: panels, a turbine, crates waiting for the lift, a bot on its break
  m.prop('solar_panel', 30, 4, { w: 2 }); m.prop('wind_turbine_small', 32, 16); m.prop('colony_lamp', 22, 11); m.prop('colony_lamp', 29, 10);
  m.prop('cargo_crate', 23, 5); m.prop('cargo_crate', 23, 6, { scale: 0.8 }); m.prop('maint_bot', 29, 7, { solid: false, rot: 3.6 }); m.prop('vent', 18, 9);
  m.prop('pipe_run', 25, 3, { w: 4 });
  // the Terrace Onsen: a hot spring warmed by the colony's heat exchangers, a stone deck, a little bathhouse
  m.fill(3, 2, 10, 6, 'o').fill(7, 7, 7, 11, 'p');
  m.prop('onsen_pool', 4, 3, { w: 4, d: 3, act: 'onsen', label: 'Terrace Onsen' });
  m.building('onsen_house', 8, 2, 3, 2, { height: 2.6, label: 'Bathhouse' });
  m.prop('pipe_run', 2, 3, { d: 3 }); m.prop('vent', 2, 6);
  m.prop('lantern', 3, 6); m.prop('lantern', 9, 6);
  m.prop('signpost', 8, 7, { act: 'sign', sign: 'hill.onsen' });
  m.exit(0, 11, 0, 14, { map: 'farm', x: 62.2, y: 9, dir: 2 });
  m.spot('hill.wreck', 24.4, 9.4).spot('hill.lake', 11, 16.4).spot('hill.overlook', 31, 20.4).spot('hill.onsen', 6, 6.5).spot('hill.summit', 57, 6.5).spot('hill.falls', 44, 29).spot('hill.terraces', 52, 15);
  m.water = 'hill'; m.start = [1.6, 13];
  m.forage = FORAGE_SPOTS;
  m.scatter(31, 90, ['tree', 'pine', 'pine', 'bush', 'rockdecor', 'flowers'], (x, y) => !FORAGE_SPOTS.some(([a, b]) => a === x && b === y) && !(x === STAR_SPOT_XY[0] && y === STAR_SPOT_XY[1]) && !(x <= 12 && y <= 10) && !(x >= 53 && y <= 9) && !(x >= 52 && y >= 12 && y <= 25) && !(x >= 49 && y >= 28 && y <= 36));   // keep the onsen, summit, terraces and hut clear
  wildFruit(m, 2, ['wild_apple', 'chestnut', 'yuzu', 'plum']); m.wildShared = false;
  return m;
}


// ---------------------------------------------------------------- Eden Central (the Main deck city)
// Down the spoke lift from Willowfall: a covered city under a glass roof, the great hull window along
// its north side. The avenue runs from the lift terminal (south) past the plaza (the Governor's office
// and the Ashfall Exchange) to the viewing gallery at the window; side streets of flats and townhouses,
// a canal with bridges, the Arrivals hall and the Grand Market. Some houses stand empty (central.house_N).
export const CENTRAL_HOUSES = {
  ranger: 'The hut is shut up neat: kindling stacked, a kettle on the stove, a pair of boots by the door. A card in the window: RANGER WANTED. APPLY: GOVERNOR\'S OFFICE.',
  'central.house_1': 'A neat townhouse with a brass knocker. A card in the window: TO LET. THE HOUSING OFFICE WILL DECIDE.',
  'central.house_2': 'Boarded up since the siege. Someone has chalked a sunflower on the boards.',
  'central.house_3': 'The door is locked. Through the glass: dust sheets over furniture, and a piano.',
  'central.house_4': 'A corner house with a shopfront, shutters down. RESERVED: ENQUIRE AT THE GOVERNOR\'S OFFICE.',
  'central.house_5': 'Empty and swept clean. A note on the door: KEYS WITH WARDEN MARROW, WILLOWFALL. (Marrow says she has never heard of it.)',
  'central.house_6': 'A tall narrow house with a roof garden gone to seed. The lock is new; the paint is not.',
};
function central() {
  const m = new MapDef('central', 70, 56, 'd', { name: 'Eden Central · the Main deck', covered: true });
  m.fill(0, 0, 69, 0, 'x');
  m.fill(1, 1, 68, 4, 'c');                                    // the promenade along the great window
  m.fill(33, 5, 36, 51, 'c');                                  // the avenue
  m.fill(22, 20, 47, 30, 'c');                                 // the plaza
  m.fill(4, 21, 19, 31, 'c');                                  // the Grand Market
  m.fill(48, 28, 66, 31, 'c');                                 // the arrivals apron
  m.fill(2, 33, 67, 34, 'c').fill(2, 43, 67, 44, 'c').fill(2, 50, 67, 51, 'c');   // side streets
  m.fill(2, 36, 67, 37, 'w');                                  // the canal
  for (const x of [10, 11, 33, 34, 35, 36, 57, 58]) m.fill(x, 36, x, 37, 'k');   // its bridges
  // walls: the window to the north, hull plate elsewhere
  m.prop('hull_window', 0, 0, { w: 70, tileSolid: true, label: 'The great window' });
  m.prop('hull_wall', 0, 1, { d: 5, tileSolid: true }); m.prop('hull_wall', 0, 19, { d: 37, tileSolid: true }); m.prop('hull_wall', 69, 1, { d: 55, tileSolid: true }); m.prop('hull_wall', 1, 55, { w: 68, tileSolid: true });
  m.prop('glass_roof', 0, 0, { w: 70, d: 56, solid: false });
  // the viewing gallery
  for (const x of [5, 12, 19, 26, 41, 48, 55, 62]) m.prop('bench', x, 3, { w: 2, rot: Math.PI, act: 'gallery', label: 'Viewing gallery' });
  m.spot('central.gallery', 30, 2.5);
  // the plaza: the Governor's office, the Ashfall Exchange, the fountain
  m.building('gov_office', 22, 13, 10, 7, { height: 6, to: { map: 'office' }, label: "Governor's office" });
  m.building('exchange', 38, 13, 10, 7, { height: 5.5, to: { map: 'exchange' }, label: 'The Ashfall Exchange' });
  m.prop('fountain', 34, 24, { w: 2, d: 2, label: 'Fountain' });
  m.prop('noticeboard', 30, 21, { w: 2, act: 'sign', sign: 'central.board' });
  m.prop('signpost', 37, 31, { act: 'sign', sign: 'central.plaza' });
  for (const [x, y] of [[23, 22], [46, 22], [23, 29], [46, 29]]) m.prop('tree', x, y, { scale: 0.9, rot: x });
  for (const [x, y] of [[26, 26], [42, 26]]) m.prop('bench', x, y, { w: 2 });
  // 2026-11-22: flower beds and planters, so the plaza is a garden square rather than an empty floor
  for (const [x, y] of [[27, 22], [40, 22], [27, 29], [40, 29]]) m.prop('flower_bed', x, y, { w: 2 });
  for (const [x, y] of [[25, 26], [44, 26], [30, 24], [39, 24]]) m.prop('plantpot', x, y);
  m.spot('central.plaza', 29.5, 27.5);
  // the Arrivals hall and its apron
  m.building('arrivals', 50, 21, 12, 5, { height: 5, to: { map: 'arrivals' }, label: 'Arrivals hall' });
  m.fill(50, 26, 61, 27, 'c');
  m.prop('liftpad', 52, 29, { solid: false }); m.prop('cargo_crate', 63, 29); m.prop('cargo_crate', 64, 29, { scale: 0.8 }); m.prop('cargo_crate', 63, 30, { scale: 0.9 });
  m.spot('central.arrivals', 56.5, 29.5);
  m.prop('signpost', 49, 31, { act: 'sign', sign: 'central.arrivals' });
  // the Grand Market: stalls and the vending terminals that run it
  for (const [x, y] of [[5, 22], [9, 22], [13, 22], [5, 28], [9, 28], [13, 28]]) m.prop('market_stall', x, y, { w: 2, tint: x + y });
  m.prop('vending', 17, 24, { act: 'counter', shop: 'grandmarket', label: 'Grand Market' }); m.prop('vending', 17, 27, { act: 'counter', shop: 'grandmarket', label: 'Grand Market' });
  m.prop('signpost', 20, 25, { act: 'sign', sign: 'central.market' });
  // the space dock (north-west): a docking bay at the hull, with a pressure window and bay doors onto the stars,
  // landing pads, Moraine's cartel trader, a shuttle, cranes, crates, fuel lines and hazard paint
  m.fill(1, 6, 15, 18, 'o').fill(12, 19, 14, 20, 'c');
  m.prop('bay_window', 0, 6, { d: 13, tileSolid: true, label: 'Pressure window' });
  m.prop('landing_pad', 1, 6, { w: 6, d: 6, solid: false }); m.prop('landing_pad', 1, 12, { w: 6, d: 6, solid: false });
  m.prop('trader_ship', 1, 6, { w: 6, d: 6, big: 1.45, label: "Moraine's ship" });
  m.prop('shuttle', 1, 12, { w: 6, d: 6, big: 1.6, act: 'shuttle', label: 'Maris\'s shuttle to Earth' });
  m.prop('crane', 9, 6, { label: 'Dock crane' }); m.prop('crane', 13, 17, { label: 'Dock crane' });
  m.prop('cargo_crate', 10, 11); m.prop('cargo_crate', 10, 12, { scale: 0.8 }); m.prop('cargo_crate', 14, 13, { scale: 0.9 }); m.prop('cargo_crate', 15, 6);
  m.prop('pipe_run', 7, 6, { d: 5 }); m.prop('hazard_stripes', 7, 18, { w: 7, solid: false });
  m.prop('signpost', 12, 18, { act: 'sign', sign: 'central.dock' });
  m.prop('shuttle_gate', 8, 15, { act: 'shuttle', label: 'Shuttle to Earth' });   // Maris's courier shuttle to the Old World
  m.spot('central.pallas', 10.5, 14.5);                       // Sato's Pallas waits beside it, ready to ride down with her
  m.spot('central.dock', 8.6, 9.5);
  for (const x of [16, 18]) m.prop('hydro_tower', x, 10); for (const x of [16, 18]) m.prop('hydro_tower', x, 13);
  // the north-east cargo yard
  for (const [x, y] of [[17, 8], [17, 15], [51, 9], [61, 16]]) m.prop('tree', x, y, { rot: y });
  for (const [x, y] of [[49, 6], [50, 6], [49, 7], [63, 6], [64, 7]]) m.prop('cargo_crate', x, y, { scale: 0.85 + (x % 3) * 0.1 });
  m.prop('water_tank', 64, 10, { w: 2, d: 2 }); m.prop('fan_tower', 64, 15, { w: 2, d: 2 });
  // the school (north-west, by the gardens): ready and quiet, waiting for its first pupils
  m.fill(21, 12, 25, 12, 'c');
  m.building('school', 20, 5, 6, 7, { height: 5.5, to: { map: 'school' }, label: 'Eden Central school' });
  m.prop('signpost', 26, 12, { act: 'sign', sign: 'central.school' });
  for (const [x, y] of [[27, 7], [29, 7], [27, 10]]) m.prop('flowers', x, y, { solid: false });
  m.prop('bench', 28, 9, { w: 2 }); m.prop('plantpot', 30, 6);
  m.spot('central.schoolyard', 28.5, 11.4);
  // the church (north, off the avenue), with the pastor's little garden beside it
  m.fill(41, 12, 45, 12, 'c');
  m.building('church', 40, 5, 6, 7, { height: 5.5, to: { map: 'church' }, label: 'Second Dawn Church' });
  m.prop('signpost', 46, 12, { act: 'sign', sign: 'central.church' });
  for (const [x, y] of [[47, 7], [48, 9], [47, 10], [49, 11]]) m.prop('flowers', x, y, { solid: false });
  m.prop('bush', 48, 6, { scale: 0.8 }); m.prop('bench', 47, 8, { w: 2, rot: Math.PI / 2 });
  m.spot('central.churchgarden', 47.5, 11.4);
  // the safety depot (east, beside the arrivals apron): the colony's peacekeeping and rescue post
  m.fill(63, 26, 67, 27, 'c');
  m.building('safety_depot', 63, 19, 5, 7, { height: 4.5, to: { map: 'depot' }, label: 'Safety depot' });
  m.prop('signpost', 62, 27, { act: 'sign', sign: 'central.depot' });
  m.spot('central.depotfront', 64.5, 27.4);
  // Sato's Watch: the colony's landmark (an observatory named for her), at the head of its own walk off the plaza
  m.fill(53, 13, 60, 14, 'c').fill(57, 15, 58, 20, 'c');
  m.building('observatory', 53, 6, 8, 7, { height: 9, label: "Sato's Watch" });
  m.prop('house_door', 57, 12, { act: 'stargaze', solid: false, label: "Sato's Watch" });
  m.prop('signpost', 59, 14, { act: 'sign', sign: 'central.watch' });
  m.prop('pipe_run', 1, 20, { d: 12 }); m.prop('pipe_run', 68, 6, { d: 26 });
  // homes: flats and townhouses on the side streets; the empty ones keep their doors shut (act 'house')
  const homes = [
    ['apartment', 4, 39, 6], ['townhouse', 11, 39, 5], ['house', 17, 39, 5, 'central.house_1'], ['apartment', 23, 39, 6],
    ['apartment', 38, 39, 6], ['house', 45, 39, 5, 'central.house_2'], ['townhouse', 51, 39, 5], ['apartment', 57, 39, 6], ['house', 64, 39, 4, 'central.house_3'],
    ['house', 4, 46, 5, 'central.house_4'], ['apartment', 10, 46, 6], ['townhouse', 17, 46, 5], ['house', 23, 46, 6, 'central.house_5'],
    ['townhouse', 38, 46, 6], ['apartment', 45, 46, 6], ['house', 52, 46, 5, 'central.house_6'], ['apartment', 58, 46, 6],
  ];
  for (const [kind, x, y, w, id] of homes) {
    m.building(id ? (id.endsWith('1') || id.endsWith('5') ? 'townhouse' : 'cottage_d') : kind, x, y, w, 4, { height: kind === 'apartment' ? 7 : 4.2, label: id ? 'Empty house' : kind === 'apartment' ? 'Flats' : 'Townhouse', city: true });
    if (id) m.prop('house_door', x + Math.floor(w / 2), y + 3, { act: 'house', house: id, solid: false });
  }
  // street furniture
  for (let y = 7; y <= 49; y += 6) { m.prop('colony_lamp', 32, y); m.prop('colony_lamp', 37, y); }
  for (const x of [6, 14, 22, 28, 42, 50, 58, 64]) { m.prop('colony_lamp', x, 35); m.prop('colony_lamp', x, 45); }
  for (const x of [8, 20, 26, 44, 54, 62]) m.prop('plantpot', x, 32);
  for (const x of [3, 9, 27, 40, 49, 65]) m.prop('bush', x, 52, { scale: 0.9, rot: x });
  m.prop('vent', 30, 9); m.prop('vent', 38, 12); m.prop('vent', 20, 48); m.prop('vent', 48, 48);
  // the lift terminal at the south end of the avenue
  m.prop('lift_kiosk', 33, 52, { w: 3, d: 2, act: 'liftup', label: 'Lift to the Lantern Ring' });
  m.spot('central.lift', 34.5, 50.5).spot('central.homes', 21.6, 44.4);
  m.prop('signpost', 31, 49, { act: 'sign', sign: 'central.plaza' });
  m.start = [34.5, 50.5]; m.water = 'canal';   // the canal has its own fish (sim.js FISH_ODDS)
  m.areas = [['The great window', 34.5, 2.5], ['The plaza', 34.5, 31.5], ['Grand Market', 11.5, 32], ['Arrivals', 56, 32.3], ['Canal', 22, 38.4], ['Lift terminal', 34.5, 54.3], ['Gardens', 9, 18.5], ['Space dock: shuttle to Earth', 8, 4.6],
    ['School', 23, 13.6], ['Church', 43, 13.6], ['Safety depot', 65.5, 28.6]];
  m.bots = [[[34.5, 6], [34.5, 49]], [[3, 33.5], [66, 33.5]], [[3, 43.5], [66, 43.5]], [[3, 2.5], [66, 2.5]], [[5, 50.5], [64, 50.5]]];
  // inside: the Governor's office and the Exchange
  const o = room('office', 12, 8, "Governor's office", 'd'); o.colonyRoom = true;   // the colony's own look: deck plate, a window onto the stars
  o.prop('star_window', 0, 0, { w: 12, solid: false });
  o.prop('courier_desk', 4, 2, { w: 4, plate: 'GOVERNOR', screen: 'EDEN · MAIN DECK' }); o.spot('central.office', 6.5, 1.5);
  o.prop('departures_board', 0, 0, { w: 3, act: 'sign', sign: 'central.board', label: 'Colony notices', board: { title: 'COLONY STATUS', rows: [['AIR', 'ALL DECKS', 'GREEN'], ['WATER', 'PUMP HALLS', 'LOW'], ['POWER', 'SUN-LINE', 'GREEN'], ['HOUSING', 'MAIN DECK', '6 EMPTY'], ['LOWER', 'UNDERCROFT', 'SEALED']] } }); o.prop('shelf', 10, 0, { w: 2, model: 'bookshelf' });
  o.prop('transit_seats', 1, 5, { w: 3 }); o.prop('transit_seats', 8, 5, { w: 3 }); for (const [px, py] of [[0, 3], [11, 3], [0, 7], [11, 7]]) o.prop('colony_planter', px, py);
  o.prop('rug', 5, 4, { solid: false, w: 2, d: 2 });
  const hg = room('hangar', 16, 12, "Vashti's hangar", 'd');
  hg.prop('hangar_mouth', 2, 0, { w: 12, tileSolid: true, label: 'Hangar mouth' });
  hg.prop('launch_cradle', 6, 2, { w: 4, d: 4, act: 'launch', label: 'Launch cradle' });
  hg.prop('workbench', 0, 5, { d: 2 }); hg.prop('crate', 15, 8); hg.prop('crate', 15, 9); hg.prop('cargo_crate', 14, 2); hg.prop('cargo_crate', 1, 2, { scale: 0.8 });
  hg.prop('pipe_run', 0, 9, { w: 5 }); hg.prop('noticeboard', 12, 7, { act: 'sign', sign: 'hill.wreck' });
  hg.spot('hangar.floor', 11.5, 6.5);
  const x = room('exchange', 12, 9, 'The Ashfall Exchange', 'd'); x.colonyRoom = true;   // a cartel trade hall: cargo, screens, her counter
  x.prop('star_window', 0, 0, { w: 12, solid: false });
  x.prop('courier_desk', 4, 2, { w: 5, act: 'counter', plate: 'ASHFALL', screen: 'TRADE OPEN · NO HAGGLING' }); x.spot('central.exchange', 6.5, 1.5);
  x.prop('departures_board', 0, 0, { w: 3, act: 'sign', sign: 'central.dock', label: 'Market prices', board: { title: 'ASHFALL PRICES', rows: [['STAR-METAL', 'BUYING', 'HIGH'], ['PLATINUM', 'BUYING', 'HIGH'], ['RELICS', 'BUYING', 'ASK'], ['COMET ICE', 'BUYING', 'FAIR'], ['HAGGLING', 'HER MAJESTY', 'NO']] } });
  x.prop('cargo_crate', 0, 4); x.prop('cargo_crate', 0, 5, { scale: 0.85 }); x.prop('cargo_crate', 11, 5); x.prop('cargo_crate', 11, 6, { scale: 0.8 }); x.prop('vending', 11, 2);
  x.prop('rug', 5, 5, { solid: false, w: 2, d: 2 }); x.prop('colony_planter', 0, 8); x.prop('colony_planter', 11, 8);
  // the Arrivals hall: a clean transit hall (deck floor, a window band onto the stars), the departures screen,
  // rows of seats, and the courier desk (it books Maris's shuttle to Earth too)
  const ah = room('arrivals', 14, 9, 'Arrivals hall', 'd'); ah.colonyRoom = true;
  ah.prop('star_window', 0, 0, { w: 14, solid: false });
  ah.prop('courier_desk', 5, 1, { w: 4, act: 'shuttle', label: 'Courier desk: book the shuttle to Earth' }); ah.spot('arrivals.desk', 7, 0.6);
  ah.prop('departures_board', 1, 0, { w: 3, act: 'sign', sign: 'central.arrivals', label: 'Departures' }); ah.prop('info_kiosk', 12, 0, { act: 'sign', sign: 'central.dock', label: 'Dock information' });
  for (const y of [4, 6]) { ah.prop('transit_seats', 1, y, { w: 3 }); ah.prop('transit_seats', 10, y, { w: 3 }); }
  ah.prop('vending', 0, 2); ah.prop('vending', 13, 2); for (const [x, y] of [[0, 7], [13, 7], [4, 4], [9, 4]]) ah.prop('colony_planter', x, y);
  // the school: small desks, a blackboard, cubbies with no names on them yet
  const sc = room('school', 12, 9, 'Eden Central school'); sc.colonyRoom = 'warm';
  sc.prop('cubbies', 0, 0, { w: 3, act: 'sign', sign: 'school.cubbies', label: 'Cubbies' }); sc.prop('cubbies', 9, 0, { w: 3, act: 'sign', sign: 'school.cubbies', label: 'Cubbies' });
  sc.prop('blackboard', 4, 0, { w: 4, act: 'sign', sign: 'school.board', label: 'Blackboard' }); sc.prop('teacher_desk', 5, 2, { w: 2 });
  for (const y of [4, 6]) for (const x of [1, 3, 8, 10]) sc.prop('school_desk', x, y);
  sc.prop('colony_planter', 11, 7); sc.prop('colony_planter', 0, 7); sc.prop('shelf', 0, 3, { w: 1, model: 'bookshelf' });
  sc.spot('school.floor', 6, 5.5).spot('school.teacher', 6, 1.4).spot('school.pupil', 3.5, 5.15);   // the teacher and Moth, once the families are up (story.js)
  sc.pupilDesks = [[1.5, 5.15], [8.5, 5.15], [10.5, 5.15], [1.5, 7.15], [3.5, 7.15], [8.5, 7.15], [10.5, 7.15]];
  // the church: pews, the altar, the memorial candles for those lost in the siege, a stained-glass window
  const ch = room('church', 12, 11, 'Second Dawn Church', 'o'); ch.colonyRoom = 'warm';
  ch.prop('stained_glass', 3, 0, { w: 6, solid: false }); ch.prop('altar', 5, 2, { w: 2 }); ch.spot('church.altar', 6, 1.3);
  ch.prop('candle_stand', 1, 1, { w: 2, act: 'candles', label: 'Memorial candles' }); ch.prop('candle_stand', 9, 1, { w: 2, act: 'candles', label: 'Memorial candles' });
  for (const y of [4, 6, 8]) { ch.prop('pew', 1, y, { w: 3 }); ch.prop('pew', 8, y, { w: 3 }); }
  ch.prop('colony_planter', 0, 9); ch.prop('colony_planter', 11, 9); ch.prop('lectern', 8, 2);
  ch.spot('church.pew', 5, 7);
  // the safety depot: the front desk, lockers, rescue drones on their pads, the big map screen of the deck
  const dp = room('depot', 12, 9, 'Safety depot', 'd'); dp.colonyRoom = true;
  dp.prop('map_screen', 4, 0, { w: 4, act: 'sign', sign: 'depot.map', label: 'Deck map' }); dp.prop('front_desk', 4, 2, { w: 4 }); dp.spot('depot.desk', 6, 1.3);
  dp.prop('lockers', 0, 0, { w: 3 }); dp.prop('rescue_drone', 10, 1, { solid: false }); dp.prop('rescue_drone', 10, 4, { solid: false }); dp.prop('rescue_drone', 1, 4, { solid: false });
  dp.prop('cargo_crate', 11, 7); dp.prop('colony_planter', 0, 7); dp.prop('charge_terminal', 9, 0);
  dp.spot('depot.floor', 3.5, 6);
  return { central: m, office: o, exchange: x, hangar: hg, arrivals: ah, school: sc, church: ch, depot: dp };
}

// ---------------------------------------------------------------- indoors

// Put a few small pieces in the front corners of a room, where nothing stands, no one stands, and not in the doorway.
function dressRoom(m, kinds) {
  const busy = (x, y) => m.props.some((p) => x >= Math.floor(p.x) && x < Math.floor(p.x) + p.w && y >= Math.floor(p.y) && y < Math.floor(p.y) + p.d) || Object.values(m.spots).some(([sx, sy]) => Math.floor(sx) === x && Math.floor(sy) === y) || Math.abs(x - m.exitTile[0]) <= 1;
  const at = [[0, m.h - 2], [m.w - 1, m.h - 2], [0, m.h - 3], [m.w - 1, m.h - 3]];
  let i = 0; for (const [x, y] of at) { if (i >= kinds.length) break; if (busy(x, y)) continue; m.prop(kinds[i++], x, y, { solid: false, rot: x === 0 ? Math.PI / 2 : -Math.PI / 2 }); }
}
function room(id, w, h, name, floor = 'b') {
  const m = new MapDef(id, w, h, floor, { name, indoor: true });
  m.exitTile = [Math.floor(w / 2), h - 1];
  return m;
}

function interiors() {
  const out = {};
  let m = room('house', 12, 8, 'Farmhouse');
  m.prop('bed', 1, 0, { d: 2, act: 'bed' }); m.prop('tv', 3, 0, { act: 'radio' }); m.prop('wardrobe', 4, 0, {});
  m.prop('storage_box', 0, 4, { act: 'storage' }); m.prop('calendar_board', 5, 0, { act: 'calendar' });
  m.prop('kitchen', 8, 0, { w: 2, act: 'kitchen' }); m.prop('fridge', 10, 0, { act: 'fridge' }); m.prop('shelf', 11, 2, { d: 1 });
  m.prop('table', 8, 4, { w: 2 }); m.prop('chair', 8, 5, { solid: false }); m.prop('rug', 3, 3, { solid: false, w: 2, d: 2 }); m.prop('lamp', 6, 0, {});
  m.spot('house.partner', 6.5, 2.4);   // where Sato's partner spends the evening (story.whereIs)
  // decor from the Works (2026-11-19, flags decor_<id>): drawn only once made
  m.prop('decor_lantern', 9, 4, { solid: false, when: 'decor_lantern' }); m.prop('decor_clock', 7, 0, { solid: false, when: 'decor_clock' });
  m.prop('decor_model', 0, 1, { solid: false, when: 'decor_model' }); m.prop('decor_shelf', 11, 5, { solid: false, when: 'decor_shelf' });
  // home decor from the village (2026-11-22, sim.HOME_DECOR: flag decor_<id>); the double bed replaces the cot
  m.props.find((p) => p.kind === 'bed').unless = 'decor_bed'; m.prop('double_bed', 1, 0, { d: 2, act: 'bed', solid: false, when: 'decor_bed' });
  m.prop('fireplace', 2.3, 0, { solid: false, decorSolid: true, when: 'decor_fireplace' }); m.prop('piano', 11, 0, { solid: false, decorSolid: true, when: 'decor_piano', act: 'piano' });
  m.prop('dresser', 0, 2, { solid: false, decorSolid: true, when: 'decor_dresser', rot: Math.PI / 2 }); m.prop('wall_shelf_jars', 0, 3, { solid: false, when: 'decor_jars', rot: Math.PI / 2 });
  m.prop('big_plant', 0, 6, { solid: false, decorSolid: true, when: 'decor_plant' }); m.prop('aquarium', 11, 3, { solid: false, decorSolid: true, when: 'decor_aquarium', act: 'aquarium', rot: -Math.PI / 2 });
  m.prop('fish_trophy', 11, 4, { solid: false, when: 'decor_trophy', rot: -Math.PI / 2 }); m.prop('telescope', 11, 6, { solid: false, decorSolid: true, when: 'decor_telescope', act: 'telescope', rot: -Math.PI / 2 });
  m.prop('rocking_chair', 5, 3, { solid: false, when: 'decor_rocker', rot: Math.PI }); m.prop('armchair_big', 2, 3, { solid: false, when: 'decor_armchair', rot: Math.PI / 2 });
  m.prop('flower_vase', 10, 4, { solid: false, when: 'decor_vase' });
  // the back bedroom (2026-11-22): a door in the back-left corner, shut until Ruess builds the extension (flag house_back)
  m.prop('home_door', 0, 0, { solid: false, label: 'Back bedroom', tint: 0x9a6a44 }); m.doors.push({ x: 0, y: 0, to: { map: 'house_back' }, kind: 'house_back', lock: 'house_back' });
  out.house = m;
  m = room('house_back', 9, 7, 'Back bedroom'); m.exitTile = [1, 6];
  m.prop('quilt_bed', 6, 0, { d: 2, tint: 0xc98a9a }); m.prop('wardrobe', 4, 0, {}); m.prop('lamp', 8, 0, {}); m.prop('dresser', 0, 0, {}); m.prop('rug', 4, 3, { solid: false, w: 2, d: 2 });
  m.prop('big_plant', 8, 5, {}); m.prop('side_table', 8, 2, { solid: false }); m.prop('armchair_big', 1, 3, { solid: false, rot: Math.PI / 2 }); m.prop('hanging_plant', 0, 4, { solid: false });
  m.prop('shelf', 2, 0, { model: 'bookshelf' }); m.prop('coat_rack', 0, 6, { solid: false, rot: Math.PI / 2 });
  out.house_back = m;

  m = room('barn', 12, 9, 'Barn', 'h');
  m.prop('trough', 2, 0, { w: 8, act: 'feedcow' }); m.prop('haybale', 0, 6); m.prop('haybale', 11, 6); m.prop('haybale', 11, 5);
  m.pen = [1, 2, 10, 6];
  out.barn = m;

  m = room('coop', 8, 7, 'Hen coop', 'h');
  m.prop('nestbox', 1, 0, { w: 3, act: 'eggs' }); m.prop('trough', 5, 0, { w: 2, act: 'feedhen' });
  m.pen = [1, 2, 6, 4];
  out.coop = m;

  m = room('greenhouse', 12, 9, 'Greenhouse', 'o');
  const [gw, gh] = FIELD_SIZES.greenhouse;
  m.field = { id: 'greenhouse', x: 1, y: 1, w: gw, h: gh }; m.fill(1, 1, gw, gh, 'f');
  m.prop('well', 11, 7, { act: 'well' }); m.glass = true;
  out.greenhouse = m;

  const shop = (id, name, w, h, cx) => {
    const s = room(id, w, h, name);
    s.prop('counter', cx - 2, 2, { w: 5, act: 'counter' });
    s.spot(`${id}.counter`, cx + 0.5, 1.5);
    return s;
  };
  m = shop('store', "Seln's Seed & Sundry", 10, 8, 5); m.spot('store.floor', 7.5, 5.5);
  m.prop('shelf', 0, 0, { w: 2 }); m.prop('shelf', 8, 0, { w: 2 }); m.prop('crate', 0, 4); m.prop('crate', 0, 5); m.prop('plantpot', 9, 4, {}); m.prop('plantpot', 9, 6, {});
  out.store = m;
  m = shop('ranch', "Corran's Ranch", 10, 8, 5);
  m.prop('haybale', 0, 4); m.prop('haybale', 0, 5); m.prop('haybale', 9, 5); m.prop('shelf', 8, 0, { w: 2 });
  out.ranch = m;
  m = shop('workshop', "Ruess's Workshop", 10, 8, 5); m.spot('workshop.bench', 2.5, 5.5);
  m.prop('workbench', 0, 4, { d: 2 }); m.prop('shelf', 0, 0, { w: 2 }); m.prop('crate', 9, 5); m.prop('crate', 9, 6);
  out.workshop = m;
  m = shop('cafe', 'The Hangar', 12, 9, 6);
  m.prop('table', 2, 5); m.prop('table', 9, 5); m.prop('table', 9, 7);
  m.spot('cafe.table1', 3.6, 5.5).spot('cafe.table2', 8.4, 5.5).spot('cafe.table3', 8.4, 7.5);
  m.prop('shelf', 0, 0, { w: 2 }); m.prop('shelf', 10, 0, { w: 2 });
  out.cafe = m;
  m = shop('clinic', 'Willowfall Clinic', 10, 8, 5); m.spot('clinic.floor', 7.5, 5.5);
  m.prop('bed', 0, 3, { d: 2, model: 'clinic_bed' }); m.prop('bed', 0, 5, { d: 2, model: 'clinic_bed' }); m.prop('shelf', 8, 0, { w: 2 }); m.prop('plantpot', 9, 6, {});
  out.clinic = m;
  m = room('library', 12, 9, 'Lantern Ring Library');
  m.prop('desk', 5, 2, { w: 3, act: 'counter' }); m.spot('library.counter', 6.5, 1.5).spot('library.floor', 3.5, 5.5);
  for (const x of [0, 2, 8, 10]) m.prop('shelf', x, 0, { w: 2, model: 'bookshelf', act: 'books' });
  m.prop('shelf', 0, 4, { w: 2, model: 'bookshelf', act: 'books' }); m.prop('shelf', 10, 4, { w: 2, model: 'bookshelf', act: 'books' }); m.prop('table', 8, 6, { w: 2 }); m.prop('rug', 4, 5, { solid: false, w: 2, d: 2 });
  out.library = m;
  m = room('hall', 12, 9, 'Village Hall');
  m.prop('desk', 5, 2, { w: 3, act: 'counter' }); m.spot('hall.desk', 6.5, 1.5).spot('hall.floor', 3.5, 5.5);
  for (let y = 2; y <= 6; y += 2) m.prop('case', 11, y, { act: 'museum' });
  m.prop('case', 0, 2, { act: 'museum' }); m.prop('case', 0, 4, { act: 'museum' });
  m.prop('shelf', 1, 0, { w: 2 }); m.prop('shelf', 9, 0, { w: 2 });
  out.hall = m;
  // 2026-11-22: a little life by the doors of the public rooms too (only where the floor is free)
  for (const k of ['store', 'workshop', 'cafe', 'clinic', 'library', 'hall', 'ranch']) dressRoom(out[k], k === 'cafe' ? ['hanging_plant', 'coat_rack'] : ['hanging_plant', 'side_table']);
  return out;
}

// A map from the sim's grid (state.mine): the belt (mode 'belt') or the Old World city (mode 'city'). The old
// levels-style site (below) is only kept for odd states; trips no longer make one.
export function ruinsMap(mine) {
  if (mine.mode === 'belt') return beltMap(mine);
  if (mine.mode === 'city') return cityMap(mine);
  const belt = false;
  const m = new MapDef('ruins', mine.w + 2, mine.h + 3, belt ? 'v' : 'a', { name: belt ? `The belt, sector ${mine.depth || 1}` : `The Old World, level ${mine.depth || mine.floor || 1}`, ruins: true, belt, earth: !belt });
  m.fill(0, 0, m.w - 1, 0, 'x'); m.fill(0, 0, 0, m.h - 1, 'x'); m.fill(m.w - 1, 0, m.w - 1, m.h - 1, 'x'); m.fill(0, m.h - 1, m.w - 1, m.h - 1, 'x');
  m.origin = [1, 1];
  for (let y = 0; y < mine.h; y++) for (let x = 0; x < mine.w; x++) {
    const c = mine.cells[y * mine.w + x];
    if (c === 3) m.prop(belt ? 'asteroid_big' : 'ruinwall', x + 1, y + 1, { cell: [x, y] });
  }
  m.prop(belt ? 'launch_pad' : 'shuttle_pad', 8, mine.h + 1, { solid: false, act: 'liftup' });
  m.start = [8.5, mine.h + 1.5];
  return m;
}

// The Old World city ruins (sim.js cityLayout, 2026-11-20): one big map a trip, cell (x, y) at tile (x + 1, y + 1). The
// ground is asphalt streets, ash lots, overgrowth and toxic pools ('t', walkable: the sim wears the hull there); every
// solid cell blocks (MapDef.block). The towers are props (stretched to their footprints); the small things (cars, buses,
// rubble, lockers, safes, counters, billboards, debris) and the gas are placed near Sato by main.js as she walks.
const CITY_GROUND = { 0: 'm', 1: 'a', 2: 'o', 3: 'm', 4: 'm', 5: 'a', 6: 't', 7: 'n', 8: 'a', 9: 'm', 10: 'a', 11: 'a', 12: 'a', 13: 'a', 14: 'a' };
const CITY_SOLID_CELLS = new Set([2, 3, 4, 5, 8, 10, 11, 12, 13, 14]);
function cityMap(mine) {
  const W = mine.w + 2, H = mine.h + 2;
  const m = new MapDef('ruins', W, H, 'x', { name: 'The Old World', ruins: true, belt: false, earth: true, city: true, ver: 'city' + mine.seed });
  m.origin = [1, 1];
  for (let y = 0; y < mine.h; y++) for (let x = 0; x < mine.w; x++) {
    const c = mine.cells[y * mine.w + x], i = (y + 1) * W + x + 1;
    m.g[i] = x === 0 || y === 0 || x === mine.w - 1 || y === mine.h - 1 ? 'a' : CITY_GROUND[c] || 'a';
    if (CITY_SOLID_CELLS.has(c)) m.block[i] = 1;
  }
  for (const [k, t] of (mine.towers || []).entries()) m.prop('ruin_tower', t.x + 1, t.y + 1, { w: t.w, d: t.d, hgt: 1 + t.h * 0.85, seed: k });
  const [px, py] = mine.pad || [48, 67];
  m.prop('shuttle_pad', px + 1, py + 1, { solid: false, act: 'liftup', label: 'The shuttle' });
  m.prop('shuttle', px + 3, py - 1, { w: 3, d: 3, rot: -Math.PI / 2, act: 'liftup', label: 'The shuttle' });
  m.start = [px + 1.5, py + 1.5];
  return m;
}

// The belt (sim.js beltLayout): one long map, the launch apron at the south edge, sectors banding north. The rocks,
// great asteroids, pods and landmarks are cells of the sim's grid (drawn instanced by world.js, solid in main.js);
// the map adds the dust lane, the pad, the sector marker buoys and signs, and the landmarks' signs.
export const BELT_MARK_NAMES = { derelict: 'A derelict nav buoy', comet: 'A sleeping comet', wreck: 'The wreck of the Hesper', far_marker: 'The far marker' };
function beltMap(mine) {
  const W = mine.w + 2, H = mine.h + 2, sec = mine.sectorH || 14, ns = mine.sectors || 20;
  const m = new MapDef('ruins', W, H, 'v', { name: `The belt, sector ${mine.sector || 1}`, ruins: true, belt: true, earth: false });
  m.fill(0, 0, W - 1, 0, 'x'); m.fill(0, 0, 0, H - 1, 'x'); m.fill(W - 1, 0, W - 1, H - 1, 'x'); m.fill(0, H - 1, W - 1, H - 1, 'x');
  m.origin = [1, 1]; m.sectorH = sec; m.sectors = ns;
  for (let s = 1; s < m.sectors; s++) {                       // the line between sector s and s + 1: a buoy at each side, the numbers floating over it
    const y = (m.sectors - s) * sec + 1;
    m.prop('sector_buoy', 1, y, { solid: false, sector: s + 1 }); m.prop('sector_buoy', W - 2, y, { solid: false, sector: s + 1 });
    for (const x of [Math.round(W * 0.25), Math.round(W * 0.75)]) m.prop('sector_sign', x, y, { solid: false, sector: s + 1, south: s });
  }
  for (const k of mine.marks || []) m.prop(k.kind, k.x + 1, k.y + 1, { solid: false, act: 'sign', mark: k.kind, label: BELT_MARK_NAMES[k.kind] });
  const px = Math.floor(mine.w / 2) + 1; m.prop('launch_pad', px, mine.h - 2, { solid: false, act: 'liftup', label: 'Launch pad' });
  m.start = [px + 0.5, mine.h - 1.5];
  return m;
}


import { EAST_FIELD, FIELD_ORIGINS } from './data.js';
// ---------------------------------------------------------------- the bigger farm and Market Lane (2026-11-19)
// Both maps are built exactly as before and then grown east (MapDef.grow), so every old tile, prop, door, spot and exit keeps
// its place; the new ground is added after. Farm: the East Terrace field (sim 'east', locked until Ruess clears it), the old
// fold, the duck house and its pond, room for hives. Willowfall: Market Lane, with the bakery, the tailor's, the Seedhouse,
// the garage, the radio station and the new villagers' cottages across the Mill Bridge.
function edgeTrees(m, x0, seed, skip = () => false) {
  const r = rng(seed);
  for (let y = 0; y < m.h; y++) for (let x = x0; x < m.w; x++) {
    if (x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1) continue;
    if (skip(x, y) || m.at(x, y) !== 'g') continue;
    m.prop('tree', x, y, { scale: 1 + r() * 0.5, rot: r() * 6.28, tileSolid: true });
  }
}
function farmEast(m) {
  m.grow(64, 34, 'g');
  edgeTrees(m, 44, 13);
  m.clearProps(40, 10, 44, 12);                                         // a gap in the old east tree line, just south of the hill road
  m.fill(42, 10, 47, 11, 'p').fill(46, 6, 47, 31, 'p').fill(47, 6, 53, 7, 'p');
  for (const [x, y] of [[44, 7], [45, 7], [44, 8], [45, 8], [44, 9], [45, 9]]) m.prop('pine', x, y, { scale: 1.1, rot: x * y, tileSolid: true });   // (cleared again below; kept so later prop indices in saves line up)
  const [ew, eh] = EAST_FIELD, [ex, ey] = FIELD_ORIGINS.east;
  m.eastField = { id: 'east', x: ex, y: ey, w: ew, h: eh, lock: 'eastfield' };
  m.fields = [m.field, m.eastField];
  m.fill(ex, ey, ex + ew - 1, ey + eh - 1, 'f');
  for (let x = ex - 1; x <= ex + ew; x++) { m.prop('fence', x, ey - 1, {}); if (x !== ex + 5 && x !== ex + 6) m.prop('fence', x, ey + eh, {}); }
  for (let y = ey; y < ey + eh; y++) { if (y !== ey + 4 && y !== ey + 5) m.prop('fence', ex - 1, y, { rot: Math.PI / 2 }); m.prop('fence', ex + ew, y, { rot: Math.PI / 2 }); }
  m.prop('signpost', 45, 12, { act: 'sign', sign: 'farm.east' });
  // the old stone fold (goats and sheep) and the meadow north of the terrace, where the hives and young trees go
  m.building('fold', 48, 2, 6, 4, { height: 3, to: { map: 'fold' }, lock: 'fold', label: 'The fold' });
  m.prop('haybale', 54, 4); m.prop('haybale', 54, 5, { scale: 0.85 });
  for (const [x, y] of [[57, 3], [60, 4], [58, 7], [61, 9], [56, 10]]) m.prop('flowers', x, y, { solid: false });
  m.prop('colony_lamp', 47, 5); m.prop('colony_lamp', 47, 23);
  // the duck house and the east pond
  m.fill(51, 25, 61, 32, 's').fill(52, 26, 60, 31, 'w');
  m.building('duckhouse', 48, 24, 3, 3, { height: 2.2, to: { map: 'duckhouse' }, lock: 'duckhouse', label: 'Duck house' });
  m.prop('reeds', 53, 26, { solid: false }); m.prop('reeds', 59, 31, { solid: false }); m.prop('reeds', 60, 27, { solid: false });
  m.spot('farm.east', 46.5, 12.5).spot('farm.fold', 50.5, 7.4).spot('farm.ducks', 50.5, 29);
  m.duckPond = [52, 26, 60, 31];
  // the hill road runs straight on to the farm's east edge, through a gap in the tree line
  m.fill(43, 8, 63, 9, 'p');
  m.clearProps(43, 7, 63, 9);
  m.clearProps(62, 6, 63, 6); m.clearProps(62, 10, 63, 11);                 // and a wider mouth, so the way out reads at a glance
  m.prop('signpost', 61, 7, { act: 'sign', sign: 'farm.hill' }); m.spot('farm.hill', 61.5, 8.4);
  m.areas = [['East Terrace', 54, 24.4], ['The fold', 51, 1.6], ['Duck pond', 56, 33]];
  m.scatter(41, 10, ['tree', 'bush', 'flowers', 'flowers'], (x, y) => x >= 55 && y >= 9 && y <= 12);
  return m;
}
function villageLane(m) {
  m.grow(96, 52, 'g');
  m.clearProps(63, 8, 63, 9).clearProps(63, 17, 63, 18).clearProps(61, 39, 63, 40).clearProps(61, 46, 63, 47);
  m.fill(64, 27, 95, 29, 'w').fill(64, 26, 95, 26, 's').fill(64, 30, 95, 30, 's');           // the river runs on east
  m.fill(61, 8, 93, 9, 'c').fill(61, 17, 93, 18, 'p').fill(61, 39, 93, 40, 'p').fill(61, 46, 93, 47, 'p');
  m.fill(76, 19, 77, 25, 'p').fill(76, 26, 77, 30, 'k').fill(76, 31, 77, 38, 'p');          // Mill Lane and the Mill Bridge
  m.fill(72, 10, 81, 16, 'c');                                                                 // Lane Square
  m.fill(68, 7, 68, 7, 'c').fill(77, 7, 77, 7, 'c').fill(86, 7, 86, 7, 'c').fill(67, 15, 67, 16, 'p').fill(86, 15, 86, 16, 'p');
  // the shops of Market Lane
  m.building('bakery', 65, 3, 7, 4, { height: 3.4, to: { map: 'bakery' }, label: 'The Sunrise Oven' });
  m.building('tailor', 74, 3, 7, 4, { height: 3.6, to: { map: 'tailor' }, label: "Varga's Mend & Make" });
  m.building('seedhouse', 83, 2, 7, 5, { height: 3.2, to: { map: 'florist' }, label: 'The Seedhouse' });
  m.building('garage', 64, 11, 7, 4, { height: 3.4, to: { map: 'garage' }, label: "Brandt's Garage" });
  m.building('radio_station', 83, 11, 7, 4, { height: 3.4, to: { map: 'radio' }, label: 'Radio Willowfall' });
  m.prop('radio_mast', 91, 11, { w: 2, d: 2, label: 'Radio mast' });
  for (const [x, y] of [[91, 3], [92, 5], [91, 6], [93, 3]]) m.prop('flowers', x, y, { solid: false });
  m.prop('plantpot', 90, 7); m.prop('plantpot', 82, 7);
  // Lane Square: the noticeboard, flower stalls, a bench and the bakery's outdoor tables
  m.prop('noticeboard', 73, 10, { w: 2, act: 'sign', sign: 'village.lane' });
  m.prop('market_stall', 79, 11, { w: 2, tint: 11 }); m.prop('market_stall', 79, 14, { w: 2, tint: 5 });
  m.prop('bench', 73, 15, { w: 2 }); m.prop('table', 72, 7, { solid: true }); m.prop('lantern', 72, 16); m.prop('lantern', 81, 16);
  m.prop('signpost', 64, 7, { act: 'sign', sign: 'village.bakeryfront' }); m.prop('signpost', 75, 19, { act: 'sign', sign: 'village.millbridge' });
  for (const [x, y] of [[66, 10], [82, 10], [70, 19], [88, 19], [66, 41], [74, 41], [86, 41], [80, 48], [92, 48], [79, 25], [74, 31]]) m.prop('colony_lamp', x, y);
  // across the Mill Bridge: the Lane cottages (homes, not open to callers), and Noor's trial beds
  const homes = [['cottage_c', 64, 'lark', "Lark's"], ['cottage_a', 70, 'vesna', "Vesna's"], ['cottage_d', 79, 'pia', "Pia's"], ['cottage_b', 84, 'tika', "Tika's"], ['cottage_c', 90, 'noor', "Noor's"]];
  for (const [kind, x, who, label] of homes) { m.building(kind, x, 42, 5, 4, { label }); m.prop('house_door', x + 2, 46, { act: 'house', house: 'home_' + who, solid: false }); m.prop('flowers', x, 48, { solid: false }); }
  m.fill(66, 32, 74, 36, 'f');
  for (const [x, y] of [[66, 32], [68, 33], [70, 32], [72, 34], [67, 35], [71, 36], [73, 32]]) m.prop('flowers', x, y, { solid: false });
  m.prop('signpost', 75, 34, { act: 'sign', sign: 'village.trialbeds' }); m.prop('water_tank', 64, 33, { w: 1, d: 1, scale: 0.8 });
  m.prop('wind_turbine_small', 94, 34); m.prop('bench', 80, 31, { w: 2 }); m.prop('reeds', 70, 26, { solid: false }); m.prop('reeds', 88, 30, { solid: false });
  m.spot('village.lane', 76.5, 13.6).spot('village.bakeryfront', 68.5, 8.6).spot('village.tailorfront', 77.5, 8.6).spot('village.floristfront', 86.5, 8.6)
    .spot('village.garagefront', 67.5, 17.5).spot('village.radiofront', 86.5, 17.5).spot('village.millbridge', 78.6, 24.5).spot('village.trialbeds', 75.5, 36.5).spot('village.lanehomes', 77.5, 40.4);
  m.areas.push(['Market Lane', 77, 10.2], ['Mill Bridge', 81, 28.5], ['Lane cottages', 78, 50.3], ['Trial beds', 70, 37.6]);
  m.bots.push([[61, 8.5], [93, 8.5]], [[76.5, 19], [76.5, 38.5], [93, 39.5]]);
  edgeTrees(m, 64, 23, (x, y) => (x === 95 && y >= 26 && y <= 30));
  m.scatter(78, 22, ['tree', 'pine', 'bush', 'flowers', 'flowers'], (x, y) => x >= 64 && (y >= 21 && y <= 24 && (x <= 70 || x >= 84) || y >= 31 && y <= 37 && x >= 79) && !(x >= 75 && x <= 78));
  return m;
}
// The interiors of Market Lane and the farm's new buildings.
function laneRooms(all) {
  const out = {};
  all.cafe.spot('cafe.stage', 1.6, 7.4); all.cafe.prop('mic_stand', 1, 6, { solid: false });   // where Vesna plays at the Hangar
  const shop = (id, name, w, h, cx, floor = 'b') => { const s = room(id, w, h, name, floor); s.prop('counter', cx - 2, 2, { w: 5, act: 'counter' }); s.spot(`${id}.counter`, cx + 0.5, 1.5); return s; };
  let m = shop('bakery', 'The Sunrise Oven', 12, 9, 6);
  m.prop('oven', 0, 0, { w: 2 }); m.prop('oven', 10, 0, { w: 2 }); m.prop('bread_shelf', 3, 0, { w: 2 }); m.prop('bread_shelf', 7, 0, { w: 2 });
  m.prop('table', 2, 6); m.prop('table', 9, 6); m.prop('chair', 3, 6, { solid: false }); m.prop('chair', 8, 6, { solid: false }); m.prop('flour_sacks', 0, 4); m.prop('flour_sacks', 11, 4);
  m.spot('bakery.table', 3.5, 7.3).spot('bakery.floor', 9.5, 4.5);
  out.bakery = m;
  m = shop('tailor', "Varga's Mend & Make", 10, 8, 5);
  m.prop('dress_form', 0, 3); m.prop('dress_form', 9, 3); m.prop('bolt_shelf', 0, 0, { w: 2 }); m.prop('bolt_shelf', 8, 0, { w: 2 });
  m.prop('sewing_table', 7, 5, { w: 2 }); m.prop('spinning_wheel', 1, 5); m.prop('rug', 4, 4, { solid: false, w: 2, d: 2 });
  m.spot('tailor.floor', 3.5, 6.4);
  out.tailor = m;
  m = shop('florist', 'The Seedhouse', 12, 9, 6, 'o'); m.glass = true;
  for (const [x, y] of [[0, 4], [0, 6], [10, 4], [10, 6]]) m.prop('flower_bed', x, y, { w: 2 });
  m.prop('seed_drawers', 0, 0, { w: 2 }); m.prop('seed_drawers', 10, 0, { w: 2 }); m.prop('plantpot', 3, 6); m.prop('plantpot', 8, 6); m.prop('well', 11, 8, { act: 'well' });
  m.spot('florist.floor', 5.5, 5.5);
  out.florist = m;
  m = shop('garage', "Brandt's Garage", 10, 8, 5, 'o');
  m.prop('workbench', 0, 4, { d: 2 }); m.prop('tool_wall', 0, 0, { w: 2 }); m.prop('engine_block', 8, 4, { w: 2 }); m.prop('crate', 9, 6); m.prop('cargo_crate', 8, 0); m.prop('cargo_crate', 9, 0, { scale: 0.8 });
  m.spot('garage.bench', 2.5, 5.5);
  out.garage = m;
  m = room('radio', 10, 8, 'Radio Willowfall');
  m.prop('radio_desk', 3, 2, { w: 4, act: 'counter' }); m.spot('radio.counter', 5, 1.5).spot('radio.floor', 7.5, 5.5);
  m.prop('record_shelf', 0, 0, { w: 2 }); m.prop('record_shelf', 8, 0, { w: 2 }); m.prop('record_shelf', 0, 4, { d: 2 }); m.prop('speaker', 9, 4); m.prop('speaker', 9, 6);
  m.prop('sofa', 2, 6, { w: 2 }); m.prop('rug', 4, 5, { solid: false, w: 2, d: 2 }); m.prop('mic_stand', 5, 1, { solid: false });
  out.radio = m;
  m = room('fold', 12, 9, 'The fold', 'h');
  m.prop('trough', 2, 0, { w: 8, act: 'feedfold' }); m.prop('haybale', 0, 6); m.prop('haybale', 11, 6); m.prop('haybale', 0, 5, { scale: 0.85 });
  m.pen = [1, 2, 10, 6]; m.beasts = ['goat', 'sheep'];
  out.fold = m;
  m = room('duckhouse', 8, 7, 'Duck house', 'h');
  m.prop('nestbox', 1, 0, { w: 3, act: 'duckeggs' }); m.prop('trough', 5, 0, { w: 2, act: 'feedduck' });
  m.pen = [1, 2, 6, 4]; m.beasts = ['duck'];
  out.duckhouse = m;
  all.barn.beasts = ['cow']; all.coop.beasts = ['chicken'];
  return out;
}
Object.assign(CENTRAL_HOUSES, {
  home_lark: 'Lark\'s cottage. A note on the door: "AT THE OVEN FROM 4. IF IT IS URGENT, IT CAN WAIT TILL THE BUNS ARE OUT."',
  home_vesna: 'Vesna\'s flat. The curtains are drawn at noon. Somebody inside is singing scales, badly, on purpose.',
  home_pia: 'Pia\'s cottage. The door knocker is a brass thimble. There is a small sign: "Mending by appointment. Gossip free."',
  home_tika: 'Tika\'s place. Half a motorbike lives on the step. The doormat says WIPE YOUR BOOTS, and then, in marker, OR DON\'T.',
  home_noor: 'Noor\'s cottage. Every windowsill is a seed tray. A label on the door reads "Asante. Please do not water the porch."',
});

// ---------------------------------------------------------------- homes (2026-11-19: "every main character has a home")
// Each villager's home is an interior `home_<key>`: through a building's door tile, a back door in a shop, or a hatch in the
// Undercroft's rock. `home_<key>.<npc>` is where each one stands at home (story.HOMES says who lives where). Everything here is
// added after the maps are built, so no old tile, spot, door or prop index moves (saves keep their meaning).
export const HOMES = {};                // key → { key, room, map, x, y, label, back? }: where its door is, for the map and the walkers
const HOME_COLOURS = { lark: '#d9534f', vesna: '#5b4a7a', pia: '#2f6f73', tika: '#2e8f8a', noor: '#9bb07a', marrow: '#5a4a6e', mori: '#9fb4c8', yui: '#b06a7a', oduya: '#e07b24', maris: '#3a78b8', kestrel: '#7a4f2a', seln: '#3f8f5a', corran: '#8c3b2e', ruess: '#6b5a48', general: '#3d4a63', moraine: '#7a1f2b', fenn: '#24406e', calloway: '#3fa7a3', vashti: '#55604a', venn: '#5d6b4e', wick: '#3f5f6f', hana: '#c8553d', thorne: '#86485a', moth: '#e8b44a' };
function homeRooms(all) {
  const out = {}, C = HOME_COLOURS;
  const mk = (key, name, w, h, floor, who, fn, o = {}) => { const m = room('home_' + key, w, h, name, floor); Object.assign(m, { home: key }, o); fn(m, C[who[0][0]]); for (const [id, x, y] of who) m.spot(`home_${key}.${id}`, x, y); dress(m); out[m.id] = m; return m; };
  // 2026-11-22: a little more life by the door of every home: a coat rack, a hanging plant, a side table, wherever the floor is free
  const dress = (m) => { const busy = (x, y) => m.props.some((p) => x >= Math.floor(p.x) - 0 && x < Math.floor(p.x) + p.w && y >= Math.floor(p.y) && y < Math.floor(p.y) + p.d) || Object.values(m.spots).some(([sx, sy]) => Math.floor(sx) === x && Math.floor(sy) === y) || Math.abs(x - m.exitTile[0]) <= 1;
    for (const [kind, x, y] of [['coat_rack', m.w - 1, m.h - 2], ['hanging_plant', 0, m.h - 2], ['side_table', m.w - 1, m.h - 3], ['kitchen_dresser', 0, m.h - 3]]) if (!busy(x, y) && !busy(x, y - 1 < 0 ? y : y)) m.prop(kind, x, y, { solid: false, rot: x === 0 ? Math.PI / 2 : -Math.PI / 2 }); };
  const door = (key, map, x, y, label) => { all[map].doors.push({ x, y, to: { map: 'home_' + key }, kind: 'home', home: key, lock: null }); HOMES[key] = { key, room: 'home_' + key, map, x, y, label }; };
  const back = (key, map, x, label) => { all[map].prop('home_door', x, 0, { act: 'home', home: key, tint: C[key] }); out['home_' + key].backTo = { map, x: x + 0.5, y: 1.6, dir: 0 }; HOMES[key] = { key, room: 'home_' + key, map, x, y: 1, label, back: true }; };
  const hatch = (key, map, x, y, label) => { all[map].prop('home_door', x, y, { act: 'home', home: key, solid: false, label, tint: C[key] }); door(key, map, x, y, label); };
  const tag = (map, bx, by, label, rename) => { const b = all[map].buildings.find((q) => q.x === bx && q.y === by); if (rename) b.label = label; else b.homeLabel = label; };
  const bed = (m, x, y, tint) => m.prop('quilt_bed', x, y, { d: 2, tint }), frames = (m, x, w, tint) => m.prop('wall_frames', x, 0, { w, tint, solid: false });
  // Market Lane's cottages, across the Mill Bridge
  mk('lark', "Lark's cottage", 9, 7, 'b', [['lark', 6.5, 4.5]], (m, c) => { bed(m, 0, 0, c); m.prop('oven', 2, 0, { w: 2 }); m.prop('kitchen', 4, 0, { w: 2 }); m.prop('shelf', 7, 0, { w: 2 }); m.prop('flour_sacks', 8, 3); m.prop('tea_table', 5, 3, { tint: c }); m.prop('chair', 4, 3, { solid: false }); m.prop('rug', 2, 3, { solid: false, w: 2, d: 2 }); m.prop('plantpot', 8, 5); frames(m, 2, 3, '#e9b35a'); });
  mk('vesna', "Vesna's flat", 9, 7, 'b', [['vesna', 5.5, 3.5]], (m, c) => { m.prop('record_shelf', 0, 0, { w: 2 }); bed(m, 8, 0, c); m.prop('speaker', 0, 3); m.prop('speaker', 0, 5); m.prop('sofa', 2, 5, { w: 2 }); m.prop('mic_stand', 6, 3, { solid: false }); m.prop('rug', 3, 3, { solid: false, w: 2, d: 2 }); m.prop('lamp', 7, 0); m.prop('tea_table', 6, 5, { tint: '#e05c8a' }); frames(m, 2, 3, '#e05c8a'); });
  mk('pia', "Pia's cottage", 9, 7, 'b', [['pia', 4.5, 3.5]], (m, c) => { bed(m, 0, 0, c); m.prop('dress_form', 2, 0); m.prop('bolt_shelf', 6, 0, { w: 2 }); m.prop('sewing_table', 6, 3, { w: 2 }); m.prop('armchair', 1, 4, { tint: '#6b2a45' }); m.prop('tea_table', 2, 4, { tint: '#e8c45a' }); m.prop('plantpot', 8, 5); m.prop('rug', 3, 3, { solid: false, w: 2, d: 2 }); frames(m, 3, 2, '#6b2a45'); });
  mk('tika', "Tika's place", 9, 7, 'o', [['tika', 3.5, 3.5]], (m, c) => { m.prop('tool_wall', 0, 0, { w: 2 }); bed(m, 8, 0, c); m.prop('engine_block', 0, 4, { w: 2 }); m.prop('crate', 6, 0); m.prop('cargo_crate', 7, 5); m.prop('lamp', 5, 0); m.prop('tea_table', 5, 3, { tint: '#e2553a' }); m.prop('rug', 2, 2, { solid: false, w: 2, d: 2 }); frames(m, 2, 2, '#e2553a'); });
  mk('noor', "Noor's cottage", 9, 7, 'o', [['noor', 5.5, 3.5]], (m, c) => { m.prop('seed_drawers', 0, 0, { w: 2 }); bed(m, 8, 0, c); m.prop('flower_bed', 0, 4, { w: 2 }); m.prop('flower_bed', 7, 4, { w: 2 }); m.prop('plantpot', 3, 0); m.prop('plantpot', 5, 0); m.prop('bookstack', 6, 0); m.prop('tea_table', 4, 3, { tint: '#b9a3d9' }); frames(m, 2, 1, '#b9a3d9'); }, { glass: true });
  // Willow Lane's cottages, the flat over the Courier Post, the Guardians' quarters
  mk('marrow', "Marrow's cottage", 10, 7, 'b', [['marrow', 6.5, 4.5]], (m, c) => { bed(m, 0, 0, c); m.prop('shelf', 2, 0, { w: 2, model: 'bookshelf' }); m.prop('lamp', 7, 0); m.prop('bookstack', 9, 0); m.prop('armchair', 8, 3, { tint: c }); m.prop('tea_table', 7, 3, { tint: '#c9a14a' }); m.prop('rug', 3, 3, { solid: false, w: 2, d: 2 }); m.prop('plantpot', 0, 5); frames(m, 4, 3, '#c9a14a'); });
  mk('mori', "Dr. Mori's house", 9, 7, 'b', [['mori', 5.5, 3.5]], (m, c) => { m.prop('shelf', 0, 0, { w: 2, model: 'bookshelf' }); m.prop('desk', 2, 0, { w: 2 }); m.prop('bookstack', 4, 0); m.prop('plantpot', 5, 0, { scale: 0.8 }); bed(m, 8, 0, c); m.prop('armchair', 0, 4, { tint: '#4a5560' }); m.prop('tea_table', 1, 4, { tint: '#f2f2ee' }); m.prop('lamp', 7, 0); m.prop('rug', 3, 3, { solid: false, w: 2, d: 2 }); });
  mk('yui', "Yui's cottage", 9, 7, 'b', [['yui', 4.5, 4.5]], (m, c) => { m.prop('shelf', 0, 0, { w: 2, model: 'bookshelf' }); m.prop('shelf', 2, 0, { w: 2, model: 'bookshelf' }); bed(m, 8, 0, c); m.prop('bookstack', 5, 0); m.prop('bookstack', 0, 4); m.prop('bookstack', 8, 5); m.prop('armchair', 6, 3, { tint: c }); m.prop('tea_table', 7, 3, { tint: '#f3dfa8' }); m.prop('lamp', 6, 0); m.prop('rug', 3, 3, { solid: false, w: 2, d: 2 }); });
  mk('oduya', "Oduya's cottage", 10, 7, 'b', [['oduya', 1.5, 1.6]], (m, c) => { m.prop('kitchen', 0, 0, { w: 3 }); m.prop('fridge', 3, 0); m.prop('shelf', 4, 0, { w: 2 }); bed(m, 9, 0, c); m.prop('table', 5, 4); m.prop('chair', 4, 4, { solid: false }); m.prop('chair', 6, 4, { solid: false }); m.prop('crate', 0, 4); m.prop('crate', 0, 5, { scale: 0.85 }); frames(m, 6, 2, c); });
  mk('maris', "Maris's flat", 8, 6, 'b', [['maris', 3.5, 2.5]], (m, c) => { bed(m, 0, 0, c); m.prop('cargo_crate', 6, 0); m.prop('lamp', 5, 0); m.prop('storage_box', 7, 3); m.prop('armchair', 1, 3, { tint: '#d9d2c0' }); m.prop('tea_table', 2, 3, { tint: '#e07b24' }); frames(m, 2, 3, '#e0a030'); });
  mk('kestrel', "Kestrel's quarters", 9, 7, 'd', [['kestrel', 4.5, 3.5]], (m, c) => { m.prop('star_window', 0, 0, { w: 9, solid: false }); bed(m, 0, 0, c); m.prop('lockers', 2, 0, { w: 2 }); m.prop('telescope_stand', 8, 0); m.prop('tea_table', 6, 3, { tint: '#d8b860' }); m.prop('armchair', 7, 3, { tint: '#39404a' }); m.prop('colony_planter', 8, 5); frames(m, 4, 2, '#d8b860'); }, { colonyRoom: true });
  // quarters behind or above a shop: in through a door at the back of the shop
  mk('seln', "Seln's rooms", 8, 6, 'b', [['seln', 3.5, 3.5]], (m, c) => { m.prop('kitchen', 0, 0, { w: 2 }); bed(m, 7, 0, c); m.prop('plantpot', 3, 0); m.prop('hydro_tower', 0, 4); m.prop('tea_table', 4, 2, { tint: '#e9d9a8' }); m.prop('armchair', 5, 2, { tint: '#6b5540' }); frames(m, 2, 2, c); });
  mk('corran', 'The ranch house', 9, 7, 'b', [['corran', 5.5, 4.5]], (m, c) => { bed(m, 0, 0, c); m.prop('radio', 2, 0); m.prop('storage_box', 8, 0); m.prop('armchair', 7, 3, { tint: c }); m.prop('tea_table', 6, 3, { tint: '#f0f0ec' }); m.prop('rug', 3, 3, { solid: false, w: 2, d: 2 }); m.prop('plantpot', 0, 5); frames(m, 3, 3, '#4b4a3a'); });
  mk('ruess', "Ruess's rooms", 9, 7, 'b', [['ruess', 2.5, 4.4]], (m, c) => { m.prop('shelf', 0, 0, { w: 2 }); m.prop('bookstack', 2, 0); m.prop('bookstack', 3, 0, { scale: 0.8 }); bed(m, 8, 0, c); m.prop('workbench', 0, 3, { d: 2 }); m.prop('crate', 7, 5); m.prop('armchair', 5, 3, { tint: c }); m.prop('tea_table', 4, 3, { tint: '#9a9da3' }); m.prop('lamp', 7, 0); frames(m, 4, 3, '#5a7a9a'); });
  mk('vashti', "Vashti's bunk", 8, 6, 'd', [['vashti', 3.5, 2.5]], (m, c) => { m.prop('bunk', 0, 0, { d: 2, tint: c }); m.prop('cargo_crate', 2, 0); m.prop('crate', 3, 0); m.prop('lamp', 5, 0); m.prop('storage_box', 6, 0); m.prop('workbench', 7, 2, { d: 2 }); frames(m, 4, 1, '#3b2a20'); });
  // Eden Central: the empty houses that were waiting for somebody, and a flat on the canal
  mk('general', "The General's house", 10, 7, 'b', [['general', 3.5, 4.5]], (m, c) => { m.prop('piano', 0, 0, { w: 2, sheet: true }); m.prop('shelf', 3, 0, { w: 2, model: 'bookshelf' }); m.prop('lamp', 8, 0); bed(m, 9, 0, c); m.prop('armchair', 6, 3, { tint: c }); m.prop('tea_table', 5, 3, { tint: '#d9b38c' }); m.prop('rug', 2, 3, { solid: false, w: 2, d: 2 }); m.prop('crate', 0, 5); m.prop('crate', 1, 5, { scale: 0.8 }); frames(m, 5, 3, '#8a7a5a'); }, { colonyRoom: 'warm' });
  mk('moraine', "Moraine's house", 10, 7, 'b', [['moraine', 5.5, 4.5]], (m, c) => { bed(m, 0, 0, c); m.prop('case', 2, 0); m.prop('case', 3, 0); m.prop('lamp', 8, 0); m.prop('armchair', 7, 3, { tint: '#b8922e' }); m.prop('tea_table', 6, 3, { tint: '#b8922e' }); m.prop('cargo_crate', 9, 4); m.prop('cargo_crate', 9, 5, { scale: 0.85 }); m.prop('rug', 3, 3, { solid: false, w: 2, d: 2 }); frames(m, 4, 3, '#b8922e'); }, { colonyRoom: 'warm' });
  mk('fenn', "Fenn's flat", 8, 6, 'd', [['fenn', 3.5, 2.5]], (m, c) => { bed(m, 0, 0, c); m.prop('lockers', 2, 0, { w: 1 }); m.prop('plantpot', 7, 0); m.prop('crate', 7, 4); m.prop('tea_table', 5, 2, { tint: '#c9a14a' }); m.prop('armchair', 6, 2, { tint: c }); frames(m, 3, 2, '#c9a14a'); }, { colonyRoom: true });
  mk('calloway', 'The vicarage', 8, 6, 'o', [['calloway', 2.5, 3.5]], (m, c) => { m.prop('shelf', 0, 0, { w: 2, model: 'bookshelf' }); m.prop('plantpot', 2, 0); m.prop('plantpot', 0, 4); m.prop('candle_stand', 5, 0); bed(m, 7, 0, c); m.prop('tea_table', 3, 2, { tint: '#f3cfb4' }); m.prop('armchair', 4, 2, { tint: '#363a48' }); frames(m, 3, 2, c); }, { colonyRoom: 'warm' });
  mk('thornes', "The Thornes' house", 10, 7, 'b', [['thorne', 3.5, 2.5], ['moth', 7.5, 3.5]], (m, c) => { bed(m, 0, 0, c); bed(m, 9, 0, C.moth); m.prop('kitchen', 2, 0, { w: 2 }); m.prop('calendar_board', 4, 0); m.prop('lamp', 8, 0); m.prop('tea_table', 5, 3, { tint: '#c9b48a' }); m.prop('chair', 4, 3, { solid: false }); m.prop('chair', 6, 3, { solid: false }); m.prop('plantpot', 0, 5); frames(m, 5, 3, C.moth); }, { colonyRoom: 'warm' });
  // the Undercroft: the enclave shelter, and hatches in the rock
  mk('shelter', "The Thornes' shelter", 8, 6, 'o', [['thorne', 2.5, 2.5], ['moth', 5.5, 3.5]], (m, c) => { m.prop('bunk', 0, 0, { d: 2, tint: c }); m.prop('bunk', 7, 0, { d: 2, tint: C.moth }); m.prop('crate', 2, 0); m.prop('stove', 3, 0); m.prop('calendar_board', 5, 0); m.prop('lamp', 6, 0); m.prop('tea_table', 3, 3, { tint: '#c9b48a' }); frames(m, 4, 2, C.moth); });
  mk('venn', "Venn's cabin", 8, 6, 'd', [['venn', 4.5, 2.5]], (m, c) => { m.prop('bunk', 0, 0, { d: 2, tint: c }); m.prop('terminal', 2, 0); m.prop('stove', 5, 0); m.prop('crate', 6, 0); m.prop('workbench', 7, 2, { d: 2 }); m.prop('tea_table', 3, 3, { tint: '#9a7a52' }); m.prop('lamp', 2, 3); });
  mk('wick', "Wick's hut", 8, 6, 'o', [['wick', 3.5, 3.5]], (m, c) => { bed(m, 0, 0, c); m.prop('fish_tank', 2, 0, { w: 2 }); m.prop('radio', 4, 0); m.prop('tea_table', 5, 2, { tint: '#c8ccd0' }); m.prop('armchair', 6, 2, { tint: c }); m.prop('crate', 7, 4); frames(m, 4, 2, '#4a8a9a'); });
  mk('hana', "Hana's loft", 8, 6, 'd', [['hana', 2.5, 2.5]], (m, c) => { m.prop('tool_wall', 0, 0, { w: 2 }); m.prop('crate', 2, 0); m.prop('crate', 0, 4, { scale: 0.85 }); m.prop('lamp', 6, 0); m.prop('bunk', 7, 0, { d: 2, tint: c }); m.prop('shrooms', 5, 4, { solid: false }); m.prop('tea_table', 4, 2, { tint: '#e0403a' }); frames(m, 3, 3, c); });
  // and their doors
  for (const [key, x, label] of [['lark', 66, "Lark's cottage"], ['vesna', 72, "Vesna's flat"], ['pia', 81, "Pia's cottage"], ['tika', 86, "Tika's place"], ['noor', 92, "Noor's cottage"]]) { door(key, 'village', x, 46, label); tag('village', x - 2, 42, label, true); }
  for (const [key, bx, label] of [['marrow', 4, "Marrow's cottage"], ['mori', 11, "Dr. Mori's house"], ['yui', 18, "Yui's cottage"], ['oduya', 25, "Oduya's cottage"]]) { door(key, 'village', bx + 2, 46, label); tag('village', bx, 42, label, true); }
  door('maris', 'village', 23, 39, "Maris's flat"); tag('village', 20, 35, "Maris's flat upstairs");
  door('kestrel', 'village', 54, 6, "Kestrel's quarters"); tag('village', 51, 2, "Kestrel's quarters");
  back('seln', 'store', 2, "Seln's rooms"); back('corran', 'ranch', 1, 'The ranch house'); back('ruess', 'workshop', 8, "Ruess's rooms");
  back('calloway', 'church', 11, 'The vicarage'); back('vashti', 'hangar', 15, "Vashti's bunk");
  door('general', 'central', 66, 43, "The General's house"); tag('central', 64, 39, "The General's house", true);
  door('moraine', 'central', 6, 50, "Moraine's house"); tag('central', 4, 46, "Moraine's house", true);
  door('fenn', 'central', 41, 43, "Fenn's flat"); tag('central', 38, 39, "Fenn's flat");
  door('thornes', 'central', 19, 43, "The Thornes' house"); tag('central', 17, 39, "The Thornes' house"); HOMES.thornes.flag = 'ld_rehoused';
  door('shelter', 'lower', 29, 6, "The Thornes' shelter"); HOMES.shelter.flag = 'ld_enclave';
  hatch('venn', 'lower', 24, 35, "Venn's cabin"); hatch('wick', 'lower', 10, 22, "Wick's hut"); hatch('hana', 'lower', 10, 56, "Hana's loft");
  all.central.buildings.find((b) => b.x === 17 && b.y === 39).homeFlag = 'ld_rehoused';
  all.central.areas.push(['Housing rows', 51, 45.3]);   // the map names the rows once (the houses with people in them say whose)
  const HOUSE_HOME = { 'central.house_1': 'thornes', 'central.house_3': 'general', 'central.house_4': 'moraine' };   // the boarded-up notes on doors that are homes now
  for (const p of [...all.village.props, ...all.central.props]) if (p.act === 'house') { const k = HOUSE_HOME[p.house] || String(p.house).replace(/^home_/, ''); if (HOMES[k]) p.home = k; }
  return out;
}
export const homeAt = (key) => HOMES[key] || null;
// Signboards with the opening hours by every public door (story.PLACES has the words), and a mailbox by every home's door, to
// see whose it is and leave a gift (2026-11-20). Both are added last, on free ground beside the door, never on a doorway.
export const HOURS_SIGNS = [], MAILBOXES = [];
function signsAndMail(all) {
  const taken = (m, x, y) => m.solid(x, y) || m.at(x, y) === 'w' || m.at(x, y) === 'f' || m.postNear(x + 0.5, y + 0.5, 0.75) || m.doors.some((d) => Math.abs(d.x - x) + Math.abs(d.y - y) < 1) || m.exits.some((e) => x >= e.x0 - 1 && x <= e.x1 + 1 && y >= e.y0 - 1 && y <= e.y1 + 1)
    || m.props.some((p) => p.kind !== 'nothing' && p.w * p.d < 40 && x >= Math.floor(p.x) && x < Math.floor(p.x) + p.w && y >= Math.floor(p.y) && y < Math.floor(p.y) + p.d) || (m.exitTile && Math.abs(m.exitTile[0] - x) <= 1 && y >= m.exitTile[1] - 1);
  // Can everyone still get from the door to the map's way in, round posts as well (people use the same rule)?
  const open = (m, x, y) => { const free = (i, j) => !m.solid(i, j) && !m.posts.some(([px, py, pr]) => Math.abs(px - i - 0.5) < 1.5 && Math.abs(py - j - 0.5) < 1.5 && Math.hypot(px - i - 0.5, py - j - 0.5) < pr + 0.22);
    const st = m.start || [m.exitTile[0] + 0.5, m.exitTile[1] - 0.6], goal = Math.floor(st[1]) * m.w + Math.floor(st[0]), seen = new Uint8Array(m.w * m.h), q = [y * m.w + x]; seen[q[0]] = 1;
    while (q.length) { const k = q.pop(); if (k === goal) return true; const i = k % m.w, j = (k - i) / m.w; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (j + dj) * m.w + i + di; if (i + di < 0 || i + di >= m.w || j + dj < 0 || j + dj >= m.h || seen[n] || !free(i + di, j + dj)) continue; seen[n] = 1; q.push(n); } }
    return false; };
  const put = (map, x, y, offs, kind, o, door) => { const m = all[map]; for (const [dx, dy] of offs) { const tx = x + dx, ty = y + dy; if (taken(m, tx, ty)) continue; const p = m.prop(kind, tx, ty, o);
    if (!door || open(m, door[0], door[1])) return { map, x: tx, y: ty, p };
    m.props.pop(); m.posts.pop(); } return null; };   // it would block the way: try the next place
  const SIDE = [[-2, 0], [2, 0], [-3, 0], [3, 0], [-2, 1], [2, 1], [-1, 1], [1, 1], [-3, 1], [3, 1], [0, 2]];
  const doorOf = (map, room) => all[map].doors.find((d) => d.to.map === room);
  for (const [place, map, room] of [['store', 'village', 'store'], ['cafe', 'village', 'cafe'], ['workshop', 'village', 'workshop'], ['hall', 'village', 'hall'], ['ranch', 'village', 'ranch'], ['clinic', 'village', 'clinic'], ['library', 'village', 'library'],
    ['bakery', 'village', 'bakery'], ['tailor', 'village', 'tailor'], ['florist', 'village', 'florist'], ['garage', 'village', 'garage'], ['radio', 'village', 'radio'], ['guard', 'village', 'home_kestrel'],
    ['office', 'central', 'office'], ['exchange', 'central', 'exchange'], ['church', 'central', 'church'], ['depot', 'central', 'depot'], ['arrivals', 'central', 'arrivals']]) {
    const d = doorOf(map, room), r = d && put(map, d.x, d.y, SIDE, 'hours_sign', { act: 'hours', place }, [d.x, d.y]); if (r) HOURS_SIGNS.push({ place, ...r });
  }
  for (const [place, map, x, y] of [['grandmarket', 'central', 18, 25], ['undercroft', 'lower', 32, 39]]) { const r = put(map, x, y, [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [2, 0]], 'hours_sign', { act: 'hours', place }, [x, y]); if (r) HOURS_SIGNS.push({ place, ...r }); }
  for (const H of Object.values(HOMES)) {
    const offs = H.back ? [[-1, 0], [1, 0], [-1, 1], [1, 1], [-2, 1], [2, 1], [-2, 0], [-3, 0]] : [[1, 0], [-1, 0], [1, 1], [-1, 1], [2, 0], [-2, 0], [2, 1], [-2, 1]];
    const r = put(H.map, H.x, H.y, offs, 'mailbox', { act: 'mail', home: H.key, tint: HOME_COLOURS[H.key] || HOME_COLOURS[H.key === 'thornes' || H.key === 'shelter' ? 'thorne' : H.key] }, [H.x, H.y]);
    if (r) MAILBOXES.push({ home: H.key, ...r });
  }
}

let cache = null;
export function allMaps() {
  if (!cache) cache = { farm: farm(), village: village(), hill: hill(), ...central(), ...interiors(), lower: lower() };
  if (!cache.bakery) Object.assign(cache, laneRooms(cache));          // Market Lane's rooms, the fold and the duck house
  if (!cache.home_lark) { Object.assign(cache, homeRooms(cache)); signsAndMail(cache); }   // everybody's homes; hours signs and mailboxes
  return cache;
}
// Where a door leads: inside, just above the room's exit tile; and back out to the door tile.
export function doorTarget(map) { const m = allMaps()[map]; return { map, x: m.exitTile[0] + 0.5, y: m.exitTile[1] - 0.6, dir: 1 }; }
export function outsideOf(interior) {
  const r = allMaps()[interior]; if (r && r.backTo) return { ...r.backTo };   // rooms behind a shop open back into it
  for (const m of Object.values(allMaps())) for (const d of m.doors) if (d.to.map === interior) return { map: m.id, x: d.x + 0.5, y: d.y + 0.6, dir: 0 };
  return { map: 'farm', x: 6.5, y: 8.5, dir: 0 };
}
export function findSpot(name) {
  for (const m of Object.values(allMaps())) if (m.spots[name]) return { map: m.id, x: m.spots[name][0], y: m.spots[name][1] };
  return null;
}

// ---------------------------------------------------------------- the Lower deck, "the Undercroft" (2026-11-19, release 1)
// Down the spoke lift past Eden Central: the landing (south), the gallery (centre, the sealed round door in its north
// wall), the pump halls (west: basins, the Sump, the cistern room), the catacombs (east: arches and mushroom beds) and
// the enclave (north, behind the catacombs). Walls are rock ('r'). What the restoration has opened is the state's
// business: lowerState(m, flags) floods or drains tunnels and opens or shuts the gates; props with `unless` are drawn only
// until that flag is set, `zone` lamps are lit once theirs is.
export const LOWER_ZONES = ['landing', 'lights', 'pumps', 'catacombs', 'enclave', 'works', 'arena', 'vents', 'vault'];
// The Undercroft's signs and notices (like MAP_SIGNS above: they are not people's spots).
const LOWER_SIGNS = {
  'lower.lift': 'LOWER DECK. LANDING 3. Machinery, cisterns, catacombs. NO PUBLIC ACCESS. (Underneath, in chalk: "Lift stops here anyway. T.V.")',
  'lower.terminal': 'RESTORATION TERMINAL (the green screen beside this sign). Face it and press E to fund projects: work lights first, then the pumps, the catacombs and beyond. Each one is done by morning. To buy parts or chat, talk to Venn at his bench instead.',
  'lower.barrier': 'A work barrier across the passage, and beyond it nothing but dark and the sound of dripping water. A tag on it reads: NEEDS LIGHT. ASK AT THE TERMINAL.',
  'lower.gallery': 'THE GALLERY. West: pump halls. East: the old crypts (catacombs). North wall: SECTOR NINE. AUTHORISED PERSONNEL ONLY. The paint is newer than the wall.',
  'lower.pumpdoor': 'A pressure bulkhead, shut. Water seeps under it. A stencil: PUMP HALLS. FLOODED. A newer note: "Not flooded. Thinking about it. T.V."',
  'lower.cryptdoor': 'A heavy door, shut and chained, with old colony markings. A stencil: CATACOMBS (HISTORIC). Someone small has drawn a mushroom on it, smiling.',
  'lower.tarp': 'The arch is hung with tarpaulins from the far side, stitched tight. Behind them, faintly, someone is singing to a child.',
  'lower.pumps': 'PUMP HALL ONE. Cisterns A to D. Fishing by arrangement with the keeper (the keeper says the arrangement is: be quiet).',
  'lower.sump': 'THE SUMP. Deepest cistern on Eden. No swimming. No shouting. No wanting it too much. (A. Wick)',
  'lower.beds': 'CATACOMB BEDS. Spawn goes in, mushrooms come out, all year round. Spore bags: Venn\'s bench, and Seln\'s store up top.',
  'lower.enclave': 'THE ENCLAVE. Rota on the board by the stove. Visitors do the washing up.',
  'lower.worksdoor': 'A roll-up shutter, chained, with a crane hook painted on it: THE WORKS. RECYCLING · FABRICATION. Through the gap at the bottom: a press the size of a cottage, asleep.',
  'lower.ventdoor': 'A bulkhead to the old wash hall, cold to the touch. A pressure tag: HEAT FEED ISOLATED. A chalk note: "Reactor next door. It is fine. It is fine. T.V."',
  'lower.arenadoor': 'A long barrier across the mouth of an old training drum. Painted inside, faded: HUB CUP. Below that, a list of winners that stops in the year the war started.',
  'lower.arena': 'THE ZERO-G ARENA. Gravity plates OFF inside the drum. Hold the rail. The Hub Cup: Autumn 19, from ten. All decks welcome; no one has ever been sick on purpose.',
  'lower.works': 'THE WORKS. Recycling and fabrication. Hard hats are a state of mind. (The press is fed from the front; Venn takes orders.)',
  'lower.vents': 'THE THERMAL VENTS. Wash hall and baths, heated from Core Ring B. Soak, not swim. Mind the glowcaps on the ledge; they mind you back.',
  'lower.rota': 'THE ROTA, in chalk, in very neat columns: water, cooking, watch, washing, lessons. Under "visitors": SATO. Under that, in a child\'s hand: "AND HER HAT".',
};
for (const [k, v] of Object.entries(LOWER_SIGNS)) if (!(k in SIGNS)) SIGNS[k] = v;
function lower() {
  const m = new MapDef('lower', 56, 62, 'r', { name: 'The Undercroft · Lower deck', under: true });
  m.fill(22, 35, 33, 42, 'd').fill(26, 33, 29, 34, 'd');                    // the landing and the passage north
  m.fill(16, 20, 39, 32, 'd').fill(26, 19, 28, 19, 'd');                    // the gallery, and the round door's niche
  m.fill(13, 25, 15, 27, 'd').fill(1, 22, 12, 40, 'o').fill(3, 28, 9, 35, 'w');   // the pump hall and basin A
  m.fill(6, 13, 8, 21, 'o').fill(1, 2, 13, 12, 'o').fill(4, 4, 11, 9, 'w');     // the north tunnel and the Sump
  m.fill(14, 5, 16, 7, 'o').fill(17, 3, 21, 9, 'd');                          // the cistern passage and the old pump room
  m.fill(40, 25, 42, 27, 'o').fill(43, 14, 54, 38, 'o');                     // the crypt door and the catacombs
  m.fill(47, 12, 49, 13, 'o').fill(26, 1, 52, 11, 'o');                       // the north arch and the enclave
  m.floods = [{ x0: 13, y0: 25, x1: 14, y1: 27, flag: 'ld_pumps', dry: 'd' }, { x0: 6, y0: 13, x1: 8, y1: 21, flag: 'ld_pump2', dry: 'o' }, { x0: 14, y0: 5, x1: 16, y1: 7, flag: 'ld_pump3', dry: 'o' }];
  m.gates = [{ x0: 26, y0: 33, x1: 29, y1: 33, flag: 'ld_lights' }, { x0: 15, y0: 25, x1: 15, y1: 27, flag: 'ld_pumps' }, { x0: 40, y0: 25, x1: 40, y1: 27, flag: 'ld_catacombs' }, { x0: 47, y0: 12, x1: 49, y1: 12, flag: 'ld_enclave' }];
  m.waters = [{ x0: 3, y0: 28, x1: 9, y1: 35, place: 'lower' }, { x0: 4, y0: 4, x1: 11, y1: 9, place: 'sump' }];
  const lamp = (x, y, zone) => m.prop('glow_lamp', x, y, { zone });
  // the landing: the lift, Venn's terminal and bench, the first log
  m.prop('lower_lift', 26, 39, { w: 3, d: 3, act: 'lift', label: 'Lift' });
  m.prop('terminal', 29, 36, { act: 'restore', label: 'Restoration terminal' }); m.prop('signpost', 30, 36, { act: 'sign', sign: 'lower.terminal' }); m.prop('workbench', 33, 37, { d: 2 });   // the terminal stands well clear of Venn's bench, so E reaches it and not him
  m.prop('terminal', 23, 36, { act: 'terminal', log: 'quarantine', label: 'Old terminal' });
  m.prop('signpost', 24, 39, { act: 'sign', sign: 'lower.lift' }); m.prop('cargo_crate', 32, 41); m.prop('cargo_crate', 22, 41, { scale: 0.8 });
  lamp(23, 38, 'landing'); lamp(32, 39, 'landing'); lamp(29, 35, 'landing');
  m.prop('work_barrier', 26, 33, { w: 4, solid: false, unless: 'ld_lights', act: 'sign', sign: 'lower.barrier', label: 'Work barrier' });
  // the gallery: pipes, lamps, the sealed round door
  m.prop('vault_door', 26, 19, { w: 3, act: 'vault', label: 'Sealed round door', unless: 'ld_vault', solid: false });   // the gate below blocks it until ld_vault m.prop('vault_door_open', 26, 19, { w: 3, solid: false, when: 'ld_vault' });
  m.prop('pipe_run', 16, 20, { w: 9 }); m.prop('pipe_run', 30, 20, { w: 10 }); m.prop('pipe_run', 16, 21, { d: 4 }); m.prop('pipe_run', 39, 28, { d: 5 });
  m.prop('pump_station', 20, 21, { w: 4, d: 3, act: 'pump', pump: 'pump4', label: 'The gallery pump' }); m.prop('vent', 33, 24); m.prop('vent', 21, 29); m.prop('cargo_crate', 37, 21); m.prop('cargo_crate', 36, 21, { scale: 0.7 });
  m.prop('signpost', 30, 31, { act: 'sign', sign: 'lower.gallery' });
  for (const [x, y] of [[17, 23], [17, 30], [38, 23], [38, 31], [25, 21], [31, 21], [24, 31], [33, 31]]) lamp(x, y, 'lights');
  m.prop('bulkhead', 15, 25, { d: 3, solid: false, unless: 'ld_pumps', act: 'sign', sign: 'lower.pumpdoor', label: 'Pump hall bulkhead' });
  m.prop('bulkhead', 40, 25, { d: 3, solid: false, unless: 'ld_catacombs', act: 'sign', sign: 'lower.cryptdoor', label: 'Crypt door', crypt: true });
  // the pump halls: basin A, the three pumps, the Sump, the cistern room
  m.prop('pump_station', 8, 37, { w: 4, d: 3, act: 'pump', pump: 'pumps', label: 'Pump one' });
  m.prop('pump_station', 1, 23, { w: 4, d: 3, act: 'pump', pump: 'pump2', label: 'The north pump' });
  m.prop('pump_station', 1, 10, { w: 4, d: 3, act: 'pump', pump: 'pump3', label: 'The cistern pump' });
  m.prop('terminal', 11, 23, { act: 'terminal', log: 'requisition', label: 'Warden\'s terminal' });
  m.prop('terminal', 19, 3, { act: 'terminal', log: 'schedule', label: 'Pump room terminal' }); m.prop('cargo_crate', 17, 8); m.prop('cargo_crate', 21, 8, { scale: 0.85 }); m.prop('crate', 21, 4);
  m.prop('signpost', 10, 33, { act: 'sign', sign: 'lower.pumps' }); m.prop('signpost', 12, 8, { act: 'sign', sign: 'lower.sump' });
  m.prop('pipe_run', 1, 26, { d: 12 }); m.prop('pipe_run', 12, 28, { d: 8 }); m.prop('pipe_run', 2, 2, { w: 10 });
  for (const [x, y] of [[2, 27], [10, 27], [2, 38], [6, 39], [13, 24]]) lamp(x, y, 'pumps');
  for (const [x, y] of [[2, 3], [12, 3], [13, 11], [7, 15]]) lamp(x, y, 'pump2');
  lamp(18, 5, 'pump3'); lamp(20, 7, 'pump3');
  // the catacombs: arches down the aisle, eight beds, the crypt wall with the scratched words
  for (const y of [35, 29, 23, 17]) m.prop('catacomb_arch', 47, y, { w: 3, solid: false, label: y === 17 ? 'Catacomb arch' : null });
  { let k = 0; for (const y of [19, 23, 27, 31]) for (const x of [44, 51]) m.prop('mushroom_bed', x, y, { w: 2, act: 'bed', bed: k++ }); }
  m.prop('crypt_wall', 54, 33, { act: 'terminal', log: 'galt_hands', label: 'Scratched crypt wall' });
  m.prop('terminal', 43, 15, { act: 'terminal', log: 'venn60', label: 'Engineer\'s terminal' });
  m.prop('signpost', 46, 36, { act: 'sign', sign: 'lower.beds' });
  for (const [x, y] of [[46, 15], [50, 15], [46, 25], [50, 25], [46, 33], [50, 33], [42, 24]]) lamp(x, y, 'catacombs');
  m.prop('tarp', 47, 12, { w: 3, solid: false, unless: 'ld_enclave', act: 'sign', sign: 'lower.tarp', label: 'Stitched tarpaulins' });
  // the enclave: four shelters, the stove and kettle, the rota, the last terminal
  for (const x of [27, 32, 37, 42]) m.prop('shelter', x, 2, { w: 4, d: 4, label: x === 27 ? 'The Thornes\' shelter' : null });
  m.prop('stove', 36, 8, { act: 'sign', sign: 'lower.enclave', label: 'The stove' }); m.prop('noticeboard', 30, 8, { w: 2, act: 'sign', sign: 'lower.rota', label: 'The rota' });
  m.prop('terminal', 51, 2, { act: 'terminal', log: 'catacombs', label: 'Warden\'s second terminal' }); m.prop('crate', 47, 3); m.prop('crate', 48, 3, { scale: 0.8 }); m.prop('table', 40, 8);
  for (const [x, y] of [[28, 9], [34, 7], [41, 9], [46, 8], [51, 6]]) lamp(x, y, 'enclave');
  m.spot('lower.landing', 25, 37.6).spot('undercroft.counter', 32.4, 37.6).spot('lower.gallery', 27.5, 24.5).spot('lower.pumps', 6.5, 36.6).spot('lower.pumphouse', 11.5, 36.4)
    .spot('lower.sump', 7.5, 10.8).spot('lower.catacombs', 48, 20.6).spot('lower.beds', 48.2, 29.6).spot('lower.enclave', 31.5, 7.2).spot('lower.kettle', 37.5, 9.6);
  lowerTwo(m);
  m.water = 'lower'; m.start = [27.5, 37.6];
  m.areas = [['The Works', 13, 61.4], ['Thermal Vents', 43.5, 61.4], ['Zero-G Arena', 28.5, 61.4], ['The vault', 27.5, 12.6], ['The landing', 27.5, 42.6], ['The gallery', 27.5, 27.6], ['Pump halls', 6.5, 41.4], ['The Sump', 7.5, 1.4], ['Old pump room', 19, 10.4], ['Catacombs', 48.5, 39.4], ['The enclave', 39, 11.6]];
  return m;
}
// Release 2 (docs/FARM.md §14): the map grew south (56×44 → 56×62; nothing above row 43 moved). A passage from the landing
// to the Works (west) and the Thermal Vents with the reactor console (east); the vault behind the round door, north of the gallery.
function lowerTwo(m) {
  const lamp = (x, y, zone) => m.prop('glow_lamp', x, y, { zone });
  m.fill(26, 43, 29, 45, 'd').fill(4, 46, 52, 48, 'd').fill(3, 49, 22, 60, 'd').fill(34, 49, 53, 60, 'o');
  m.gates.push({ x0: 26, y0: 43, x1: 29, y1: 43, flag: 'ld_works' }, { x0: 33, y0: 46, x1: 33, y1: 48, flag: 'ld_vents' }, { x0: 26, y0: 19, x1: 28, y1: 19, flag: 'ld_vault' });
  m.prop('work_barrier', 26, 43, { w: 4, solid: false, unless: 'ld_works', act: 'sign', sign: 'lower.worksdoor', label: 'Shutter to the Works' });
  m.prop('bulkhead', 33, 46, { d: 3, solid: false, unless: 'ld_vents', act: 'sign', sign: 'lower.ventdoor', label: 'Wash hall bulkhead' });
  // the Works: the hall itself, the press out front, the office terminals
  m.prop('works_hall', 9, 50, { w: 8, d: 6, label: 'The Works' });
  m.prop('fabricator', 12, 57, { w: 2, act: 'works', label: 'The Works press' }); m.prop('scrap_bin', 16, 57, { act: 'recycle', label: 'Recycling bin' });
  m.prop('terminal', 4, 50, { act: 'terminal', log: 'works_ledger', label: 'Works office terminal' }); m.prop('terminal', 21, 50, { act: 'terminal', log: 'galt_cover', label: 'Dispatch terminal' });
  m.prop('cargo_crate', 4, 58); m.prop('cargo_crate', 5, 59, { scale: 0.8 }); m.prop('crate', 21, 59); m.prop('pipe_run', 3, 49, { w: 5 }); m.prop('signpost', 7, 47, { act: 'sign', sign: 'lower.works' });
  for (const [x, y] of [[3, 53], [22, 53], [8, 57], [19, 57], [13, 47], [24, 47], [28, 44]]) lamp(x, y, 'works');
  // the Thermal Vents: the bath, steam pipes, the reactor console
  m.prop('vent_bath', 39, 52, { w: 6, d: 4, act: 'vents', label: 'The vent bath' }); m.prop('reactor_console', 48, 50, { w: 3, d: 2, act: 'reactor', label: 'Reactor console' });
  m.prop('pipe_run', 34, 49, { w: 13 }); m.prop('pipe_run', 53, 50, { d: 10 }); m.prop('vent', 37, 57); m.prop('vent', 46, 57);
  m.prop('terminal', 35, 50, { act: 'terminal', log: 'bathhouse', label: 'Wash hall terminal' }); m.prop('crypt_wall', 52, 59, { act: 'terminal', log: 'marrow_last', label: 'Chalk on the tiles' });
  m.prop('signpost', 36, 47, { act: 'sign', sign: 'lower.vents' }); m.prop('bench', 40, 58, { w: 3, solid: false });
  for (const [x, y] of [[35, 54], [45, 54], [38, 59], [49, 56], [44, 47]]) lamp(x, y, 'vents');
  // the Zero-G Arena: the old training drum between the two halls, its stands, and the Hub Cup's gate
  m.fill(24, 49, 32, 60, 'd'); m.gates.push({ x0: 24, y0: 49, x1: 32, y1: 49, flag: 'ld_arena' });
  m.prop('work_barrier', 24, 49, { w: 9, solid: false, unless: 'ld_arena', act: 'sign', sign: 'lower.arenadoor', label: 'Barrier to the old drum' });
  m.prop('zero_g_arena', 26, 52, { w: 5, d: 5, act: 'arena', label: 'The Zero-G Arena' }); m.prop('bench', 24, 58, { w: 2, solid: false }); m.prop('bench', 31, 58, { w: 2, solid: false });
  m.prop('signpost', 32, 50, { act: 'sign', sign: 'lower.arena' });
  for (const [x, y] of [[24, 51], [32, 52], [24, 56], [32, 56]]) lamp(x, y, 'arena');
  m.spot('lower.arena', 28.5, 58.4).spot('lower.stands', 25, 57.4).spot('lower.stands2', 32, 57.4).spot('lower.arenagate', 28.5, 50.6);
  // the vault: a dead ring, the last terminal, the names
  m.fill(22, 13, 33, 18, 'd');
  m.prop('decimator_ring', 25, 13, { w: 6, d: 4, label: 'Ring three' });
  m.prop('terminal', 22, 15, { act: 'terminal', log: 'ninefold_report', label: 'Site Ninefold terminal' }); m.prop('crypt_wall', 33, 15, { act: 'terminal', log: 'the_roll', label: 'The roll' });
  for (const [x, y] of [[23, 17], [32, 17], [22, 13], [33, 13]]) lamp(x, y, 'vault');
  m.spot('lower.works', 10.2, 58.6).spot('lower.press', 15, 58.7).spot('lower.vents', 42, 57.6).spot('lower.reactor', 49.5, 52.6).spot('lower.vault', 27.5, 17.6);
}
// Fits the Lower deck to how far it has been restored: drained tunnels become floor, open gates stop blocking.
export function lowerState(m, flags = {}) {
  if (!m || !m.under) return m;
  for (const f of m.floods) m.fill(f.x0, f.y0, f.x1, f.y1, flags[f.flag] ? f.dry : 'w');
  for (const g of m.gates) for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) m.block[y * m.w + x] = flags[g.flag] ? 0 : 1;
  m.ver = m.floods.map((f) => (flags[f.flag] ? 1 : 0)).join('') + m.gates.map((g) => (flags[g.flag] ? 1 : 0)).join('');
  return m;
}
export const waterPlace = (m, x, y) => { const w = (m.waters || []).find((q) => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1); return w ? w.place : m.water || 'farm'; };
export const lampLit = (zone, flags = {}) => zone === 'landing' || !!flags['ld_' + zone];
