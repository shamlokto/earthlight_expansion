// Sato's Harvest: the maps (docs/FARM.md §3.3). Data only, no three.js: tile grids, buildings,
// props, exits and the named spots that story.js places people on. x runs east, y runs south;
// a tile is one unit, positions are in tiles (a tile's centre is x + 0.5, y + 0.5).
import { FIELD_SIZES, PASTURE_SIZE } from './data.js';

// Ground codes: g grass · f field soil · p dirt path · c cobble · s sand · w water · k planks
// r cliff rock (solid) · a ash (the Old World) · o stone floor · h hay · b boards (indoor floor) · x nothing
export const SOLID_GROUND = new Set(['w', 'r', 'x']);

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

class MapDef {
  constructor(id, w, h, fill, opts = {}) {
    this.id = id; this.w = w; this.h = h; this.g = new Array(w * h).fill(fill);
    this.buildings = []; this.props = []; this.exits = []; this.spots = {}; this.doors = [];
    this.indoor = false; this.name = id; Object.assign(this, opts);
    this.block = new Uint8Array(w * h);            // 1 = a building or solid prop stands here
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
    if (p.solid) for (let j = 0; j < p.d; j++) for (let i = 0; i < p.w; i++) { const xx = Math.floor(x) + i, yy = Math.floor(y) + j; if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h) this.block[yy * this.w + xx] = 1; }
    return p;
  }
  exit(x0, y0, x1, y1, to) { this.exits.push({ x0, y0, x1, y1, to }); return this; }
  spot(name, x, y) { this.spots[name] = [x, y]; return this; }
  free(x, y) { return !this.solid(x, y) && this.at(x, y) === 'g'; }
  // Trees and bushes on free grass, away from paths and doors.
  scatter(seed, n, kinds, keep = () => true) {
    const r = rng(seed); let tries = 0;
    while (n > 0 && tries++ < 4000) {
      const x = Math.floor(r() * this.w), y = Math.floor(r() * this.h);
      if (!this.free(x, y) || !keep(x, y)) continue;
      let ok = true;
      for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1; i++) { const c = this.at(x + i, y + j); if (c !== 'g' || this.block[(y + j) * this.w + x + i]) { ok = false; break; } }
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
      this.prop(kind, x, y, { scale: 1 + r() * 0.5, rot: r() * 6.28 });
    }
    return this;
  }
}

// ---------------------------------------------------------------- outdoors

function farm() {
  const m = new MapDef('farm', 44, 34, 'g', { name: 'The Hollin field' });
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
  m.building('greenhouse', 34, 2, 6, 4, { height: 2.8, to: { map: 'greenhouse' }, lock: 'greenhouse', label: 'Greenhouse' });
  m.prop('bin', 10, 6, { act: 'bin' });
  m.prop('well', 12, 6, { act: 'well' });
  m.prop('signpost', 23, 30, { act: 'sign', sign: 'farm.gate' });
  m.prop('scarecrow', 19, 12, { solid: true });
  // pasture fence, with a gate gap on the north side
  const P = m.pasture;
  for (let x = P.x - 1; x <= P.x + P.w; x++) { if (x !== P.x + 5 && x !== P.x + 6) m.prop('fence', x, P.y - 1, { rot: 0 }); m.prop('fence', x, P.y + P.h, { rot: 0 }); }
  for (let y = P.y; y < P.y + P.h; y++) { m.prop('fence', P.x - 1, y, { rot: Math.PI / 2 }); m.prop('fence', P.x + P.w, y, { rot: Math.PI / 2 }); }
  m.exit(21, 33, 22, 33, { map: 'village', x: 23, y: 1.6, dir: 0 });
  m.exit(43, 8, 43, 9, { map: 'hill', x: 1.6, y: 13, dir: 3 });
  m.spot('farm.porch', 7.5, 8.4).spot('farm.bin', 11.4, 7.5).spot('farm.gate', 20.3, 31).spot('farm.pond', 26.4, 25.5).spot('farm.field', 19.6, 15);
  m.start = [6.5, 8.5];
  m.border('tree', 11, (x, y) => (y === 33 && (x === 21 || x === 22)) || (x === 43 && (y === 8 || y === 9)));
  m.scatter(5, 16, ['tree', 'tree', 'bush', 'flowers'], (x, y) => !(x >= P.x - 2 && x <= P.x + P.w + 1 && y >= P.y - 2 && y <= P.y + P.h + 1) && y > 9);
  m.prop('reeds', 27, 26, { solid: false }); m.prop('reeds', 35, 24, { solid: false });
  return m;
}

function village() {
  const m = new MapDef('village', 46, 36, 'g', { name: 'Willowfall' });
  m.fill(0, 22, 45, 24, 'w').fill(0, 21, 45, 21, 's').fill(0, 25, 45, 25, 's');
  m.fill(22, 0, 23, 35, 'p').fill(22, 21, 23, 25, 'k');                              // main road and the bridge
  m.fill(17, 9, 28, 18, 'c');                                                         // the square
  m.fill(11, 9, 34, 10, 'p').fill(11, 17, 34, 18, 'p').fill(17, 9, 28, 18, 'c');
  m.fill(11, 31, 41, 32, 'p').fill(36, 20, 40, 21, 'k').fill(38, 11, 38, 20, 'p');   // south lane, dock
  m.fill(34, 10, 38, 10, 'p');
  m.building('store', 8, 5, 7, 4, { to: { map: 'store' }, label: "Seln's Seed & Sundry" });
  m.building('cafe', 31, 5, 8, 4, { height: 3.6, to: { map: 'cafe' }, label: 'The Hangar' });
  m.building('workshop', 8, 13, 7, 4, { height: 3.4, to: { map: 'workshop' }, label: 'Workshop' });
  m.building('hall', 31, 12, 8, 5, { height: 4, to: { map: 'hall' }, label: 'Village Hall' });
  m.building('ranch', 8, 27, 7, 4, { height: 3.4, to: { map: 'ranch' }, label: "Corran's Ranch" });
  m.building('cottage_a', 28, 27, 5, 4, { label: 'Cottage' });
  m.building('cottage_b', 36, 27, 5, 4, { label: 'Cottage' });
  m.prop('memorial', 22, 13, { w: 2, act: 'sign', sign: 'village.memorial' });
  m.prop('signpost', 24, 8, { act: 'sign', sign: 'village.square' });
  m.prop('signpost', 16, 10, { act: 'sign', sign: 'village.storefront' });
  m.prop('signpost', 30, 10, { act: 'sign', sign: 'village.cafefront' });
  m.prop('signpost', 16, 18, { act: 'sign', sign: 'village.workshopfront' });
  m.prop('signpost', 30, 18, { act: 'sign', sign: 'village.hallfront' });
  m.prop('signpost', 16, 32, { act: 'sign', sign: 'village.ranchyard' });
  m.prop('signpost', 35, 20, { act: 'sign', sign: 'village.dock' });
  m.prop('bench', 26, 19, { w: 2 });
  m.prop('lantern', 17, 9); m.prop('lantern', 28, 9); m.prop('lantern', 17, 18); m.prop('lantern', 28, 18);
  m.prop('barge', 37, 22, { w: 4, d: 2, solid: false, onWater: true });
  for (let x = 3; x <= 6; x++) m.prop('fence', x, 33, {});
  m.exit(22, 0, 23, 0, { map: 'farm', x: 22, y: 32.2, dir: 1 });
  m.spot('village.square', 22.5, 16).spot('village.memorial', 23, 14.8).spot('village.bridge', 23, 20.4).spot('village.dock', 38.5, 20.6)
    .spot('village.bench', 27, 20.2).spot('village.storefront', 12.4, 10).spot('village.cafefront', 34.2, 10).spot('village.hallfront', 34.2, 18.2)
    .spot('village.workshopfront', 12.4, 18.2).spot('village.ranchyard', 14, 32.4).spot('village.river', 16, 20.6);
  m.water = 'village';
  m.border('tree', 21, (x, y) => (y === 0 && (x === 22 || x === 23)));
  m.scatter(8, 26, ['tree', 'tree', 'pine', 'bush', 'flowers', 'flowers']);
  for (const x of [4, 9, 31, 43]) m.prop('reeds', x, 21, { solid: false });
  return m;
}

export const FORAGE_SPOTS = [[5, 6], [12, 4], [20, 10], [30, 13], [8, 13], [18, 21], [26, 19], [32, 22]];

function hill() {
  const m = new MapDef('hill', 36, 26, 'g', { name: 'Lift Hill' });
  m.fill(0, 0, 35, 1, 'r').fill(0, 24, 35, 25, 'r').fill(34, 0, 35, 25, 'r').fill(0, 0, 0, 10, 'r').fill(0, 15, 0, 25, 'r');
  m.fill(0, 12, 20, 13, 'p').fill(20, 9, 21, 13, 'p').fill(20, 9, 28, 10, 'p').fill(24, 8, 30, 9, 'c');
  m.fill(5, 17, 16, 23, 's').fill(6, 18, 15, 22, 'w');
  m.building('lift', 25, 4, 4, 4, { height: 6, label: 'The Descent' });
  m.prop('liftpad', 27, 8, { solid: false, act: 'lift' });
  m.prop('signpost', 23, 8, { act: 'sign', sign: 'hill.wreck' });
  m.prop('signpost', 9, 16, { act: 'sign', sign: 'hill.lake' });
  m.prop('signpost', 31, 19, { act: 'sign', sign: 'hill.overlook' });
  m.prop('bench', 30, 21, { w: 2 });
  m.exit(0, 11, 0, 14, { map: 'farm', x: 42.2, y: 9, dir: 2 });
  m.spot('hill.wreck', 24.4, 9.4).spot('hill.lake', 11, 16.4).spot('hill.overlook', 31, 20.4);
  m.water = 'hill';
  m.forage = FORAGE_SPOTS;
  m.scatter(31, 30, ['tree', 'pine', 'pine', 'bush', 'rockdecor', 'flowers'], (x, y) => !FORAGE_SPOTS.some(([a, b]) => a === x && b === y));
  return m;
}

// ---------------------------------------------------------------- indoors

function room(id, w, h, name, floor = 'b') {
  const m = new MapDef(id, w, h, floor, { name, indoor: true });
  m.exitTile = [Math.floor(w / 2), h - 1];
  return m;
}

function interiors() {
  const out = {};
  let m = room('house', 9, 7, 'Farmhouse');
  m.prop('bed', 1, 0, { d: 2, act: 'bed' }); m.prop('radio', 4, 0, { act: 'radio' }); m.prop('shelf', 6, 0, { w: 2 });
  m.prop('table', 6, 3, { w: 2 }); m.prop('rug', 3, 3, { solid: false, w: 2, d: 2 });
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
  if (!cache) cache = { farm: farm(), village: village(), hill: hill(), ...interiors() };
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
