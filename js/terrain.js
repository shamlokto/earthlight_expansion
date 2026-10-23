// Terrain tables (bank $01). Chain per map value v (verified against the game's
// RAM grids $7E:2DD2 / $7E:3852 on map 1):
//   terrain id = header[80 + v]; terrain type = CE7E[id]; terrain class = CECE[type]
// Movement and combat only look at the class (0-15). Class 10 is written around
// the map edge as an out-of-bounds frame.
import { mapInfo, MAP_COUNT } from './maps.js';

const TYPE_OF_ID = 0x01ce7e;   // terrain id -> type (0..0x21)
const CLASS_OF_TYPE = 0x01cece; // type -> class (0..15)
const MOVE_COST = 0x01cf12;    // [(category-1)*16 + class]: 0 = impassable, $FF = ends movement, else cost
const DEFENCE = 0x01d002;      // [class*4 + weapon mode]: % damage reduction (shown in the terrain window)
const TARGET_A = 0x01d082;     // [class*4 + mode]: 1 = can be targeted (used by $01:E1C8)
const TARGET_B = 0x01d0c2;     // [class*4 + mode]: 1 = can be targeted (used by attack and counter checks)

const NAME_OF_TYPE = 0x01cef0;  // type -> terrain name/description index (names 0-14 are in the text)

export const CLASSES = 16, CATEGORIES = 15, MODES = 3, TYPES = 0x22;

export function nameIndex(rom, type) { return rom.byteAt(NAME_OF_TYPE + type); }
export function classOfType(rom, type) { return rom.byteAt(CLASS_OF_TYPE + type); }
export const EDGE_CLASS = 10;

export function terrainOf(rom, header, v) {
  const id = header[80 + v];
  const type = rom.byteAt(TYPE_OF_ID + id);
  return { id, type, cls: rom.byteAt(CLASS_OF_TYPE + type) };
}

// Movement cost for unit category 1..15 entering a class. Returns 0 (blocked),
// 'stop' (uses all remaining movement) or a number.
export function moveCost(rom, category, cls) {
  if (category < 1) return 0;
  const v = rom.byteAt(MOVE_COST + (category - 1) * 16 + cls);
  return v === 0xff ? 'stop' : v;
}

export function defence(rom, cls, mode) { return rom.byteAt(DEFENCE + cls * 4 + mode); }
export function targetable(rom, cls, mode) {
  return { a: !!rom.byteAt(TARGET_A + cls * 4 + mode), b: !!rom.byteAt(TARGET_B + cls * 4 + mode) };
}

// Which terrain graphics appear with each class, across all 30 maps.
export function classSamples(rom) {
  const samples = Array.from({ length: CLASSES }, () => new Map());
  for (let m = 0; m < MAP_COUNT; m++) {
    const info = mapInfo(rom, m);
    const header = rom.body(info.headerId), grid = rom.body(info.gridId);
    const seen = new Set();
    for (let cy = 1; cy <= info.rows; cy++) {
      for (let cx = 1; cx < info.cols; cx++) seen.add(grid[cy * 62 + cx]);
    }
    for (const v of seen) {
      const { cls } = terrainOf(rom, header, v);
      const gid = header[v];
      const s = samples[cls];
      s.set(gid, (s.get(gid) || 0) + 1);
    }
  }
  // most widespread graphics first
  return samples.map((s) => [...s.entries()].sort((a, b) => b[1] - a[1]).map(([gid]) => gid));
}
