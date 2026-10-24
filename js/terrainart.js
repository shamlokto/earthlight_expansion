// Terrain pictures from the ROM. The large one is the terrain's fight backdrop: the scene the
// original fights in when a unit stands on that class (tiles $04:CCE0[cls], palette $04:CD78,
// tilemaps $04:CD06 / $04:CD2C, combined as js/game/fightscene.js draws them: BG1 over BG2
// shifted 128 px, over CGRAM colour $3193). Earth (class 12) has no backdrop; its picture tiles
// the map's own hex cells instead. The small one is a map hex cell graphic (js/maps.js).
import { decodeTile, paletteFromBytes, bgr555 } from './gfx.js';
import { cellGraphic, battlePalette } from './maps.js';

const T_BG = 0x04cce0, T_BGPAL = 0x04cd78, T_MAP1 = 0x04cd06, T_MAP2 = 0x04cd2c;
const BACKDROP = bgr555(0x3193);
export const BANNER_W = 256, BANNER_H = 128, BANNER_Y = 40;   // the slice of the 256x256 layers shown

function layer(rom, cls, table) {
  const tilesId = rom.wordAt(T_BG + cls * 2), palId = rom.wordAt(T_BGPAL + cls * 2), mapId = rom.wordAt(table + cls * 2);
  if (!tilesId || !palId || !mapId) return null;
  const tiles = rom.asset(tilesId), map = rom.body(mapId), px = new Uint8Array(256 * 256), cache = new Map();
  for (let ty = 0; ty < 32; ty++) {
    for (let tx = 0; tx < 32; tx++) {
      const e = map[(ty * 32 + tx) * 2] | (map[(ty * 32 + tx) * 2 + 1] << 8), n = e & 0x3ff;
      if (!cache.has(n)) cache.set(n, n * 32 + 32 <= tiles.length ? decodeTile(tiles, n * 32, 4) : new Uint8Array(64));
      const t = cache.get(n);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px[(ty * 8 + y) * 256 + tx * 8 + x] = t[(e & 0x8000 ? 7 - y : y) * 8 + (e & 0x4000 ? 7 - x : x)];
    }
  }
  return { px, pal: paletteFromBytes(rom.body(palId)) };
}

// RGBA banner of a terrain class (BANNER_W x BANNER_H), or null when the class has no backdrop.
export function terrainBackdrop(rom, cls) {
  const L = layer(rom, cls, T_MAP1), R = layer(rom, cls, T_MAP2);
  if (!L) return null;
  const data = new Uint8ClampedArray(BANNER_W * BANNER_H * 4);
  for (let y = 0; y < BANNER_H; y++) {
    const r = (y + BANNER_Y) * 256;
    for (let x = 0; x < BANNER_W; x++) {
      let c = L.px[r + x], col;
      if (c) col = L.pal[c];
      else { c = R ? R.px[r + ((x + 128) & 255)] : 0; col = c ? R.pal[c] : BACKDROP; }
      data.set([col[0], col[1], col[2], 255], (y * BANNER_W + x) * 4);
    }
  }
  return { w: BANNER_W, h: BANNER_H, data };
}

// RGBA banner made of a map cell graphic laid out as a hex field (for classes without a backdrop).
export function cellField(rom, gfx, pal = battlePalette(rom)) {
  const g = cellGraphic(rom, gfx), data = new Uint8ClampedArray(BANNER_W * BANNER_H * 4);
  for (let i = 0; i < BANNER_W * BANNER_H; i++) data.set([BACKDROP[0] >> 2, BACKDROP[1] >> 2, BACKDROP[2] >> 2, 255], i * 4);
  for (let cx = -1; cx * 16 < BANNER_W; cx++) {
    for (let cy = -1; cy * 16 < BANNER_H; cy++) {
      const X = cx * 16, Y = cy * 16 + (cx & 1) * 8;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) {
        const v = g.px[y * 24 + x], px = X + x, py = Y + y;
        if (!v || px < 0 || py < 0 || px >= BANNER_W || py >= BANNER_H) continue;
        const c = pal[v] || [0, 0, 0];
        data.set([c[0], c[1], c[2], 255], (py * BANNER_W + px) * 4);
      }
    }
  }
  return { w: BANNER_W, h: BANNER_H, data };
}

// RGBA of one hex cell graphic (24x16, transparent outside the hex).
export function cellImage(rom, gfx, pal = battlePalette(rom)) {
  const g = cellGraphic(rom, gfx), data = new Uint8ClampedArray(24 * 16 * 4);
  for (let i = 0; i < 24 * 16; i++) { const v = g.px[i]; if (v) { const c = pal[v] || [0, 0, 0]; data.set([c[0], c[1], c[2], 255], i * 4); } }
  return { w: 24, h: 16, data };
}

// Browser helpers: data URLs, cached per ROM object.
const cache = new WeakMap();
function cached(rom, key, make) {
  if (!cache.has(rom)) cache.set(rom, new Map());
  const m = cache.get(rom);
  if (!m.has(key)) {
    let url = '';
    try {
      const img = make();
      if (img) { const c = document.createElement('canvas'); c.width = img.w; c.height = img.h; c.getContext('2d').putImageData(new ImageData(img.data, img.w, img.h), 0, 0); url = c.toDataURL(); }
    } catch { /* this ROM view lacks the asset */ }
    m.set(key, url);
  }
  return m.get(key);
}
// Banner for a terrain class: its fight backdrop, or a field of the given cell graphic.
export const bannerUrl = (rom, cls, gfx) => cached(rom, `b${cls}:${gfx}`, () => terrainBackdrop(rom, cls) || cellField(rom, gfx));
export const cellUrl = (rom, gfx) => cached(rom, `c${gfx}`, () => cellImage(rom, gfx));
