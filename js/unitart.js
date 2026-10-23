// Unit description art: the large picture on the unit info screen ($04:E4E0, opened by the
// battle dispatcher on request $0A from $01:B163). Verified against emulator captures.
//   tiles    asset $04:F172[type] (word), loaded at sprite tile 384 (VRAM $F000; the asset's
//            lead of $1000 bytes makes tile n = asset offset (n - 256) * 32)
//   palette  asset $04:F1E6[type] (word), OBJ palette 1 (CGRAM $90)
//   picture  sprite frame: $04:F25A[type] = id, frame pointer = word at $06:E0AB + (id-1)*2
//            (bank $06). Frame: count, then 4 bytes per sprite, as read by the sprite
//            builder $00:AB2B: flags, x, y, tile.
//            flags: bit0 tile +256, bit3 16x16 (else 8x8), bit4 x negative, bit5 y negative,
//            bit6 h-flip, bit7 v-flip.
// The first sprites of each frame use the asset's tile 384, a solid tile that paints the
// coloured backdrop box behind the unit.
import { decodeTile, paletteFromBytes } from './gfx.js';

const ART_TILES = 0x04f172, ART_PAL = 0x04f1e6, ART_FRAME = 0x04f25a, FRAMES = 0x06e0ab;

// Sprites of the picture: [{ x, y, size, tile, hflip, vflip }], positions relative to the object.
export function artSprites(rom, type) {
  const id = rom.byteAt(ART_FRAME + type);
  const a = 0x060000 | rom.wordAt(FRAMES + (id - 1) * 2);
  const n = rom.byteAt(a), out = [];
  for (let k = 0; k < n; k++) {
    const f = rom.byteAt(a + 1 + k * 4);
    let x = rom.byteAt(a + 2 + k * 4), y = rom.byteAt(a + 3 + k * 4);
    if (f & 0x10) x -= 256;
    if (f & 0x20) y -= 256;
    out.push({ x, y, size: f & 8 ? 16 : 8, tile: rom.byteAt(a + 4 + k * 4) | ((f & 1) << 8), hflip: !!(f & 0x40), vflip: !!(f & 0x80) });
  }
  return out;
}

// RGBA image of the picture: { w, h, data (Uint8ClampedArray), ox, oy } where (ox, oy) is the
// object position inside the image. Sprites are drawn in OAM priority order (first on top).
export function unitArt(rom, type) {
  const tiles = rom.asset(rom.wordAt(ART_TILES + type * 2));
  const pal = paletteFromBytes(rom.body(rom.wordAt(ART_PAL + type * 2)));
  const sprites = artSprites(rom, type);
  const x0 = Math.min(...sprites.map((s) => s.x)), y0 = Math.min(...sprites.map((s) => s.y));
  const w = Math.max(...sprites.map((s) => s.x + s.size)) - x0, h = Math.max(...sprites.map((s) => s.y + s.size)) - y0;
  const data = new Uint8ClampedArray(w * h * 4), cache = new Map();
  const tile = (n) => {
    if (!cache.has(n)) { const o = (n - 256) * 32; cache.set(n, o >= 0 && o + 32 <= tiles.length ? decodeTile(tiles, o, 4) : new Uint8Array(64)); }
    return cache.get(n);
  };
  for (const s of [...sprites].reverse()) {
    for (let py = 0; py < s.size; py++) {
      for (let px = 0; px < s.size; px++) {
        const sx = s.hflip ? s.size - 1 - px : px, sy = s.vflip ? s.size - 1 - py : py;
        const c = tile(s.tile + (sy >> 3) * 16 + (sx >> 3))[(sy & 7) * 8 + (sx & 7)];
        if (!c) continue;
        const i = ((s.y - y0 + py) * w + (s.x - x0 + px)) * 4, col = pal[c];
        data[i] = col[0]; data[i + 1] = col[1]; data[i + 2] = col[2]; data[i + 3] = 255;
      }
    }
  }
  return { w, h, data, ox: -x0, oy: -y0 };
}

// Draw the picture onto a canvas (resized to fit), at integer zoom.
export function paintUnitArt(canvas, rom, type, zoom = 2) {
  const art = unitArt(rom, type);
  const src = document.createElement('canvas');
  src.width = art.w; src.height = art.h;
  src.getContext('2d').putImageData(new ImageData(art.data, art.w, art.h), 0, 0);
  canvas.width = art.w * zoom; canvas.height = art.h * zoom;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return art;
}
