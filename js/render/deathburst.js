// The original's map explosion when a unit is destroyed ($02:DF3A, docs/FORMATS.md "Units
// destroyed on the map"): asset 201 loaded at OBJ VRAM $7000, one sprite object ($3F, script
// $02:E3D6) on the unit's cell, sound $18. Each frame of the burst is one 8x8 tile mirrored into a
// 16x16 sprite (four sprites, h/v-flipped); tiles 0x140-0x146 (the asset's first seven) show for 3
// frames each and the object is gone after 21 frames. The unit leaves its cell at frame 15. Same
// for every unit, small craft or capital ship. Palette: OBJ row 6, colours 0-7 from asset 192 and
// 8-15 from asset 199 (its second row). No DOM: packed RGBA pixels, ROM read through `rom`.
import { decodeTile, paletteFromBytes } from '../gfx.js';
import { rgba } from './upscale.js';

export const BURST_STEP = 3, BURST_FRAMES = 7, BURST_GONE = 15;
const LEAD_TILES = 64;   // asset 201's lead puts its data at tile 0x40 of the $7000 block (OBJ tile 0x140)

let cache = null, cacheRom = null;
// [{ w: 16, h: 16, px: Uint32Array }] x 7
export function deathBurst(rom) {
  if (cacheRom === rom) return cache;
  const tiles = rom.asset(201);
  const pal = [...paletteFromBytes(rom.body(192).subarray(192, 208)), ...paletteFromBytes(rom.body(199).subarray(48, 64))].map((c) => rgba(c));
  const frames = [];
  for (let k = 0; k < BURST_FRAMES; k++) {
    const t = decodeTile(tiles, (LEAD_TILES + k) * 32, 4), px = new Uint32Array(256);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = t[(y < 8 ? y : 15 - y) * 8 + (x < 8 ? x : 15 - x)];
      if (v) px[y * 16 + x] = pal[v];
    }
    frames.push({ w: 16, h: 16, px });
  }
  cache = frames; cacheRom = rom;
  return frames;
}
