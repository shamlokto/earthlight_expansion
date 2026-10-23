// Full-screen pictures from the ROM (title, menus, frames): a tileset, a 32x28 tilemap and a
// palette, combined the way the SNES draws a background layer. Tilemap entries are the
// usual SNES words: tile number (10 bits), palette (3 bits), priority, x/y flip.
import { decodeTile, paletteFromBytes, Indexed } from './gfx.js';

// layers: [{ tiles, map, bpp = 4, tileBase = 0 }] drawn in order (colour 0 = transparent);
// palAssets: [[asset, first colour, count]] as the game's loader places them in CGRAM
// ($00:8557: $06B1 = first colour, $06B3 = count); returns { img, pal }.
export function composeScreen(rom, layers, palAssets, { w = 32, h = 28 } = {}) {
  const img = new Indexed(w * 8, h * 8);
  for (const L of layers) {
    const bpp = L.bpp || 4, tb = bpp * 8, tiles = rom.asset(L.tiles), map = rom.body(L.map);
    const cache = new Map(), base = L.tileBase || 0, rows = Math.min(h, Math.floor(map.length / 64));
    for (let i = 0; i < w * rows; i++) {
      const e = map[i * 2] | (map[i * 2 + 1] << 8);
      const n = (e & 0x3ff) - base, pl = (e >> 10) & 7;
      if (n < 0) continue;
      if (!cache.has(n)) cache.set(n, n * tb + tb <= tiles.length ? decodeTile(tiles, n * tb, bpp) : null);
      const px = cache.get(n);
      if (!px) continue;
      const bx = (i % w) * 8, by = Math.floor(i / w) * 8;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const c = px[(e & 0x8000 ? 7 - y : y) * 8 + (e & 0x4000 ? 7 - x : x)];
          if (c) img.px[(by + y) * img.w + bx + x] = bpp === 8 ? c : (L.palShift ?? 0) + pl * (1 << bpp) + c;
        }
      }
    }
  }
  const pal = Array.from({ length: 256 }, () => [0, 0, 0]);
  for (const [asset, at, count] of palAssets) {
    paletteFromBytes(rom.body(asset)).slice(0, count || 256).forEach((c, i) => { if (at + i < 256) pal[at + i] = c; });
  }
  return { img, pal };
}
