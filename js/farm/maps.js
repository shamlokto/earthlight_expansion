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
export const SOLID_GROUND = new Set(['w', 'r', 'x']);
// Thin or round things collide as a small circle around their middle instead of a whole tile, so
// lawns with trees and lamps stay walkable (radius in tiles).
export const POST_RADIUS = { tree: 0.32, pine: 0.3, bush: 0.42, lantern: 0.14, colony_lamp: 0.16, signpost: 0.14, noticeboard: 0.3, solar_panel: 0.38, hydro_tower: 0.36, water_tank: 0.62, wind_turbine_small: 0.3, fan_tower: 0.4, scarecrow: 0.2, rockdecor: 0.4, vent: 0.38, fountain: 0.95, well: 0.5, bin: 0.42, memorial: 0.6, cargo_crate: 0.45, maint_bot: 0.3 };

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
  m.exit(43, 8, 43, 9, { map: 'hill', x: 1.6, y: 13, dir: 3 });
  m.spot('farm.porch', 7.5, 8.4).spot('farm.bin', 11.4, 7.5).spot('farm.gate', 20.3, 31).spot('farm.pond', 26.4, 25.5).spot('farm.field', 19.6, 15);
  m.start = [6.5, 8.5];
  m.border('tree', 11, (x, y) => (y === 33 && (x === 21 || x === 22)) || (x === 43 && (y === 8 || y === 9)));
  m.scatter(5, 16, ['tree', 'tree', 'bush', 'flowers'], (x, y) => !(x >= P.x - 2 && x <= P.x + P.w + 1 && y >= P.y - 2 && y <= P.y + P.h + 1) && y > 9);
  m.prop('reeds', 27, 26, { solid: false }); m.prop('reeds', 35, 24, { solid: false });
  // the colony's share of the farm: a panel by the barn, a rain tank, the irrigation main along the field
  m.prop('solar_panel', 31, 6, { w: 2 }); m.prop('water_tank', 40, 3, { w: 2, d: 2 }); m.prop('pipe_run', 2, 11, { d: fh });
  m.prop('colony_lamp', 19, 7); m.prop('vent', 33, 10);
  wildFruit(m, 3); m.wildShared = false;
  return m;
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
  return m;
}
// The lift kiosk's notice lives here with the map that has the kiosk (story.js owns the other signs).
const MAP_SIGNS = {
  'central.board': 'EDEN CENTRAL, Main deck. Governor\'s office: weekdays 9 to 5 (the General). The Ashfall Exchange: Her Majesty receives traders daily but Saturdays. Arrivals: courier runs Tuesdays and Fridays. Viewing gallery open all night; please do not tap the glass.',
  'central.dock': 'CENTRAL DOCK. Canal craft, lighters and the Ashfall trading ship. Her Majesty trades from the ship on Saturdays and from the Exchange on the plaza the rest of the week. Mind the crane.',
  'central.watch': 'SATO\'S WATCH. Observatory and beacon of the Main deck, named by the Colony Council for Captain M. Sato, who kept watch. Dome open to the public from 7 in the evening. (The Captain has asked twice for the name to be changed. The Council has declined twice.)',
  'central.plaza': 'THE PLAZA. Laid out by the founders, rebuilt after the siege. Avenue north to the great window; south to the lift terminal. Canal walks east and west.',
  'central.arrivals': 'ARRIVALS. Courier and supply runs from the Middle and Lower decks. J. Maris lands at 8 on Tuesdays and Fridays and asks that nobody wave at her during docking.',
  'central.market': 'GRAND MARKET. Imported seeds, saplings in any season, batteries. The terminals also BUY fine food at a fifth above bin prices. No haggling with the machines.',
  'hill.onsen': 'THE TERRACE ONSEN. Hot spring, warmed by the colony\'s heat exchangers (Ruess says the pipes were "spare"). Open 6 till midnight. 100 cr a soak; free on your birthday. Please rinse before you get in. No towels in the water.',
  'village.lift': 'LANTERN RING LIFT. Spoke cars to the Middle deck and the hub, every twenty minutes. The climb takes nine; you get lighter as you go, so hold the rail near the top. Hesk\'s barricade stood here. The scorch marks are being kept, on purpose.',
};
for (const [k, v] of Object.entries(MAP_SIGNS)) if (!(k in SIGNS)) SIGNS[k] = v;

// Fourteen places where something grows each day (sim.FORAGE_SPOT_COUNT); a few hide in the corners.
// The hidden corner where a star-plum shows on one day a season (sim.STAR_SPOT).
export const STAR_SPOT_XY = [2, 17];
export const FORAGE_SPOTS = [[3, 8], [14, 5], [18, 3], [20, 6], [30, 12], [8, 15], [18, 21], [26, 19], [32, 22], [1, 23], [33, 2], [16, 10], [24, 14], [12, 8]];

function hill() {
  const m = new MapDef('hill', 36, 26, 'g', { name: 'Terrace Hill' });
  m.fill(0, 0, 35, 1, 'r').fill(0, 24, 35, 25, 'r').fill(34, 0, 35, 25, 'r').fill(0, 0, 0, 10, 'r').fill(0, 15, 0, 25, 'r');
  m.fill(0, 12, 20, 13, 'p').fill(20, 9, 21, 13, 'p').fill(20, 9, 28, 10, 'p').fill(24, 8, 30, 9, 'c');
  m.fill(5, 17, 16, 23, 's').fill(6, 18, 15, 22, 'w');
  m.building('lift', 25, 4, 4, 4, { height: 6, label: 'The Descent' });
  m.prop('liftpad', 27, 8, { solid: false, act: 'lift' });
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
  m.exit(0, 11, 0, 14, { map: 'farm', x: 42.2, y: 9, dir: 2 });
  m.spot('hill.wreck', 24.4, 9.4).spot('hill.lake', 11, 16.4).spot('hill.overlook', 31, 20.4).spot('hill.onsen', 6, 6.5);
  m.water = 'hill'; m.start = [1.6, 13];
  m.forage = FORAGE_SPOTS;
  m.scatter(31, 30, ['tree', 'pine', 'pine', 'bush', 'rockdecor', 'flowers'], (x, y) => !FORAGE_SPOTS.some(([a, b]) => a === x && b === y) && !(x === STAR_SPOT_XY[0] && y === STAR_SPOT_XY[1]) && !(x <= 12 && y <= 10));   // keep the onsen's view open
  wildFruit(m, 2, ['wild_apple', 'chestnut', 'yuzu', 'plum']); m.wildShared = false;
  return m;
}


// ---------------------------------------------------------------- Eden Central (the Main deck city)
// Down the spoke lift from Willowfall: a covered city under a glass roof, the great hull window along
// its north side. The avenue runs from the lift terminal (south) past the plaza (the Governor's office
// and the Ashfall Exchange) to the viewing gallery at the window; side streets of flats and townhouses,
// a canal with bridges, the Arrivals hall and the Grand Market. Some houses stand empty (central.house_N).
export const CENTRAL_HOUSES = {
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
  m.prop('hull_wall', 0, 1, { d: 55, tileSolid: true }); m.prop('hull_wall', 69, 1, { d: 55, tileSolid: true }); m.prop('hull_wall', 1, 55, { w: 68, tileSolid: true });
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
  m.spot('central.plaza', 29.5, 27.5);
  // the Arrivals hall and its apron
  m.building('arrivals', 50, 21, 12, 7, { height: 5, label: 'Arrivals hall' });
  m.prop('liftpad', 52, 29, { solid: false }); m.prop('cargo_crate', 63, 29); m.prop('cargo_crate', 64, 29, { scale: 0.8 }); m.prop('cargo_crate', 63, 30, { scale: 0.9 });
  m.spot('central.arrivals', 56.5, 29.5);
  m.prop('signpost', 49, 31, { act: 'sign', sign: 'central.arrivals' });
  // the Grand Market: stalls and the vending terminals that run it
  for (const [x, y] of [[5, 22], [9, 22], [13, 22], [5, 28], [9, 28], [13, 28]]) m.prop('market_stall', x, y, { w: 2, tint: x + y });
  m.prop('vending', 17, 24, { act: 'counter', shop: 'grandmarket', label: 'Grand Market' }); m.prop('vending', 17, 27, { act: 'counter', shop: 'grandmarket', label: 'Grand Market' });
  m.prop('signpost', 20, 25, { act: 'sign', sign: 'central.market' });
  // the Central dock (north-west): a hull-side basin with a quay, cranes and moored craft; Moraine's ship lies here
  m.fill(1, 6, 11, 18, 'w').fill(12, 6, 14, 18, 'k').fill(12, 19, 14, 20, 'c');
  m.prop('barge', 7, 9, { w: 4, d: 5, solid: false, onWater: true, label: "Moraine's ship" });
  m.prop('barge', 2, 14, { w: 2, d: 2, solid: false, onWater: true, rot: 0.4 }); m.prop('barge', 4, 7, { w: 2, d: 2, solid: false, onWater: true, rot: -0.3 });
  m.prop('crane', 14, 7, { label: 'Dock crane' }); m.prop('crane', 14, 15, { label: 'Dock crane' });
  m.prop('cargo_crate', 12, 17); m.prop('cargo_crate', 13, 17, { scale: 0.8 }); m.prop('cargo_crate', 14, 12, { scale: 0.9 });
  m.prop('signpost', 12, 6, { act: 'sign', sign: 'central.dock' });
  m.spot('central.dock', 12.6, 10.5);
  for (const x of [16, 18]) m.prop('hydro_tower', x, 10); for (const x of [16, 18]) m.prop('hydro_tower', x, 13);
  // the north-east cargo yard
  for (const [x, y] of [[17, 8], [17, 15], [51, 9], [61, 16]]) m.prop('tree', x, y, { rot: y });
  for (const [x, y] of [[49, 6], [50, 6], [49, 7], [63, 6], [64, 7]]) m.prop('cargo_crate', x, y, { scale: 0.85 + (x % 3) * 0.1 });
  m.prop('water_tank', 64, 10, { w: 2, d: 2 }); m.prop('fan_tower', 64, 15, { w: 2, d: 2 });
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
  m.prop('vent', 30, 9); m.prop('vent', 40, 9); m.prop('vent', 20, 48); m.prop('vent', 48, 48);
  // the lift terminal at the south end of the avenue
  m.prop('lift_kiosk', 33, 52, { w: 3, d: 2, act: 'liftup', label: 'Lift to the Lantern Ring' });
  m.spot('central.lift', 34.5, 50.5);
  m.start = [34.5, 50.5];
  m.areas = [['The great window', 34.5, 2.5], ['The plaza', 34.5, 31.5], ['Grand Market', 11.5, 32], ['Arrivals', 56, 32.3], ['Canal', 22, 38.4], ['Lift terminal', 34.5, 54.3], ['Gardens', 9, 18.5]];
  m.bots = [[[34.5, 6], [34.5, 49]], [[3, 33.5], [66, 33.5]], [[3, 43.5], [66, 43.5]], [[3, 2.5], [66, 2.5]], [[5, 50.5], [64, 50.5]]];
  // inside: the Governor's office and the Exchange
  const o = room('office', 12, 8, "Governor's office");
  o.prop('desk', 5, 2, { w: 3 }); o.spot('central.office', 6.5, 1.5);
  o.prop('shelf', 0, 0, { w: 2, model: 'bookshelf' }); o.prop('shelf', 10, 0, { w: 2, model: 'bookshelf' }); o.prop('plantpot', 3, 0); o.prop('plantpot', 9, 0);
  o.prop('table', 9, 5, { w: 2 }); o.prop('chair', 8, 5, { solid: false }); o.prop('rug', 5, 4, { solid: false, w: 2, d: 2 });
  const x = room('exchange', 12, 9, 'The Ashfall Exchange');
  x.prop('counter', 4, 2, { w: 5, act: 'counter' }); x.spot('central.exchange', 6.5, 1.5);
  x.prop('crate', 0, 4); x.prop('crate', 0, 5); x.prop('crate', 11, 6); x.prop('shelf', 0, 0, { w: 2 }); x.prop('shelf', 10, 0, { w: 2 }); x.prop('rug', 5, 5, { solid: false, w: 2, d: 2 }); x.prop('plantpot', 11, 3);
  return { central: m, office: o, exchange: x };
}

// ---------------------------------------------------------------- indoors

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
  out.house = m;

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
  return out;
}

// The Old World site, built from the sim's grid (state.mine): 0 empty, 1 rubble, 2 way down, 3 wall.
export function ruinsMap(mine) {
  const m = new MapDef('ruins', mine.w + 2, mine.h + 3, 'a', { name: `The Old World, level ${mine.depth || mine.floor || 1}`, ruins: true });
  m.fill(0, 0, m.w - 1, 0, 'x'); m.fill(0, 0, 0, m.h - 1, 'x'); m.fill(m.w - 1, 0, m.w - 1, m.h - 1, 'x'); m.fill(0, m.h - 1, m.w - 1, m.h - 1, 'x');
  m.origin = [1, 1];
  for (let y = 0; y < mine.h; y++) for (let x = 0; x < mine.w; x++) {
    const c = mine.cells[y * mine.w + x];
    if (c === 3) m.prop('ruinwall', x + 1, y + 1, { cell: [x, y] });
  }
  m.prop('liftpad', 8, mine.h + 1, { solid: false, act: 'liftup' });
  m.start = [8.5, mine.h + 1.5];
  return m;
}

let cache = null;
export function allMaps() {
  if (!cache) cache = { farm: farm(), village: village(), hill: hill(), ...central(), ...interiors() };
  return cache;
}
// Where a door leads: inside, just above the room's exit tile; and back out to the door tile.
export function doorTarget(map) { const m = allMaps()[map]; return { map, x: m.exitTile[0] + 0.5, y: m.exitTile[1] - 0.6, dir: 1 }; }
export function outsideOf(interior) {
  for (const m of Object.values(allMaps())) for (const d of m.doors) if (d.to.map === interior) return { map: m.id, x: d.x + 0.5, y: d.y + 0.6, dir: 0 };
  return { map: 'farm', x: 6.5, y: 8.5, dir: 0 };
}
export function findSpot(name) {
  for (const m of Object.values(allMaps())) if (m.spots[name]) return { map: m.id, x: m.spots[name][0], y: m.spots[name][1] };
  return null;
}
