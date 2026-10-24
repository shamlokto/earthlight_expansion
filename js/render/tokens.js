// Unit tokens for the battle board, drawn from the ROM's better art instead of the 24x16 map
// icons: a small craft's 32x32 fight-scene sprite in its resting pose (its army's fight palette,
// army A pink, army B green), a structure's unit-info picture without its backdrop box, and a
// capital ship's map icon (the fight scenes only show part of a hull; the icon is the whole ship).
// The player's units face right, the enemy's left. No DOM: returns packed RGBA pixels.
import { paletteFromBytes, decodeTile } from '../gfx.js';
import { kindOf, PALS, spriteBank, tileCache, poseOf } from '../game/fightscene.js';
import { battlePalette, unitIcon, unitTypeGfx } from '../maps.js';
import { artSprites } from '../unitart.js';
import { rgba, indexedToRgba } from './upscale.js';

// { w, h, px: Uint32Array } for a unit type and army (2 = neutral: drawn in army A's colours,
// greyed by the board). `icon`: a ship's own map icon (js/art/own.js) in place of the ROM's.
export function tokenPixels(rom, type, army, icon = null) {
  const kind = kindOf(type), side = army === 1 ? 1 : 0;
  let t;
  if (kind === 'craft') t = craftSprite(rom, type, side);
  else if (kind === 'ship') { const ic = icon || unitIcon(rom, side, unitTypeGfx(rom, type)); t = { w: ic.w, h: ic.h, px: indexedToRgba(ic, palOf(rom)) }; }
  else t = structArt(rom, type);
  // the enemy faces the other way (the map icons already do)
  if (side === 1 && kind !== 'ship') for (let y = 0; y < t.h; y++) t.px.subarray(y * t.w, y * t.w + t.w).reverse();
  return trim(t);
}

let palCache = null, palRom = null;
const palOf = (rom) => (palRom === rom ? palCache : (palRom = rom, palCache = battlePalette(rom)));

function craftSprite(rom, type, side) {
  const pal = paletteFromBytes(rom.body(PALS.craft[side])).slice(0, 16).map((c) => rgba(c));
  const tiles = tileCache(spriteBank(rom, type, 0)), base = poseOf(type).idle, px = new Uint32Array(32 * 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const sx = 31 - x;   // the sheets face left: flipped so army A faces right
    const c = tiles(base + (y >> 3) * 16 + (sx >> 3))[(y & 7) * 8 + (sx & 7)];
    if (c) px[y * 32 + x] = pal[c];
  }
  return { w: 32, h: 32, px };
}

// The unit-info picture (js/unitart.js) without its solid backdrop box: the box's colour, read
// at the picture's border, is cleared by a flood fill from the edges.
function structArt(rom, type) {
  const tiles = rom.asset(rom.wordAt(0x04f172 + type * 2)), pal = paletteFromBytes(rom.body(rom.wordAt(0x04f1e6 + type * 2))).map((c) => rgba(c));
  const sprites = artSprites(rom, type);
  const x0 = Math.min(...sprites.map((s) => s.x)), y0 = Math.min(...sprites.map((s) => s.y));
  const w = Math.max(...sprites.map((s) => s.x + s.size)) - x0, h = Math.max(...sprites.map((s) => s.y + s.size)) - y0;
  const px = new Uint32Array(w * h);
  for (const s of [...sprites].reverse()) {
    for (let py = 0; py < s.size; py++) for (let qx = 0; qx < s.size; qx++) {
      const sx = s.hflip ? s.size - 1 - qx : qx, sy = s.vflip ? s.size - 1 - py : py, n = s.tile + (sy >> 3) * 16 + (sx >> 3), o = (n - 256) * 32;
      if (o < 0 || o + 32 > tiles.length) continue;
      const c = decodeTile(tiles, o, 4)[(sy & 7) * 8 + (sx & 7)];
      if (c) px[(s.y - y0 + py) * w + s.x - x0 + qx] = pal[c];
    }
  }
  const counts = new Map();
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const v = px[y * w + x]; counts.set(v, (counts.get(v) || 0) + 1); }
  const bg = [...counts].sort((a, b) => b[1] - a[1])[0][0], stack = [];
  for (let x = 0; x < w; x++) stack.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) stack.push([0, y], [w - 1, y]);
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h || px[y * w + x] !== bg || (bg === 0 && px[y * w + x] === 0 && false)) continue;
    px[y * w + x] = 0;
    if (bg !== 0) stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return { w, h, px };
}

// crop to the opaque pixels
function trim(t) {
  let x0 = t.w, y0 = t.h, x1 = -1, y1 = -1;
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) if (t.px[y * t.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return t;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, px = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) px.set(t.px.subarray((y0 + y) * t.w + x0, (y0 + y) * t.w + x0 + w), y * w);
  return { w, h, px };
}
