// SNES graphics helpers: planar tiles, BGR555 palettes, indexed -> RGBA.

export function bgr555(v) {
  const r = v & 31, g = (v >> 5) & 31, b = (v >> 10) & 31;
  return [(r << 3) | (r >> 2), (g << 3) | (g >> 2), (b << 3) | (b >> 2)];
}

// bytes -> array of [r,g,b]
export function paletteFromBytes(bytes, count = bytes.length >> 1) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(bgr555(bytes[i * 2] | (bytes[i * 2 + 1] << 8)));
  return out;
}

// Decode one planar tile (2/4/8 bpp) at byte offset `o` into 64 color indices.
export function decodeTile(buf, o, bpp) {
  const px = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    for (let p = 0; p < bpp; p += 2) {
      const lo = buf[o + p * 8 + y * 2] | 0, hi = buf[o + p * 8 + y * 2 + 1] | 0;
      for (let x = 0; x < 8; x++) {
        const s = 7 - x;
        px[y * 8 + x] |= (((lo >> s) & 1) | (((hi >> s) & 1) << 1)) << p;
      }
    }
  }
  return px;
}

// An indexed image: width, height, Uint8Array of palette indices, plus an
// optional "opaque" mask (for sprites drawn through a mask).
export class Indexed {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.px = new Uint8Array(w * h);
    this.opaque = null;
  }
}

export function tileSheet(buf, bpp, cols = 16) {
  const tb = bpp * 8, n = Math.floor(buf.length / tb);
  const rows = Math.max(1, Math.ceil(n / cols));
  const img = new Indexed(cols * 8, rows * 8);
  for (let t = 0; t < n; t++) {
    const px = decodeTile(buf, t * tb, bpp);
    const bx = (t % cols) * 8, by = Math.floor(t / cols) * 8;
    for (let y = 0; y < 8; y++) img.px.set(px.subarray(y * 8, y * 8 + 8), (by + y) * img.w + bx);
  }
  return img;
}

// Paint an indexed image into a canvas at integer scale.
// `pal` is an array of [r,g,b]; index 0 is drawn as `bg` (or transparent if null)
// when `zeroTransparent` is set.
export function paint(canvas, img, pal, { scale = 1, zeroTransparent = false, bg = null, palOffset = 0 } = {}) {
  canvas.width = img.w * scale;
  canvas.height = img.h * scale;
  const ctx = canvas.getContext('2d');
  const id = ctx.createImageData(img.w, img.h);
  const d = id.data;
  for (let i = 0; i < img.w * img.h; i++) {
    const v = img.px[i];
    if ((zeroTransparent && v === 0) || (img.opaque && !img.opaque[i])) {
      if (bg) { d[i * 4] = bg[0]; d[i * 4 + 1] = bg[1]; d[i * 4 + 2] = bg[2]; d[i * 4 + 3] = 255; }
      continue;
    }
    const c = pal[(v + palOffset) & 255] || [255, 0, 255];
    d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
  }
  const tmp = document.createElement('canvas');
  tmp.width = img.w; tmp.height = img.h;
  tmp.getContext('2d').putImageData(id, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, img.w * scale, img.h * scale);
}
