// Pixel-art upscaling for the battle board: Scale3x (AdvMAME3x), which keeps the ROM's own
// pixels and colours but rounds diagonal edges, on 32-bit RGBA pixels (0 = transparent).
// No DOM: runs in the browser and in Node.

// src: Uint32Array of w*h pixels; returns { w: 3w, h: 3h, px: Uint32Array }.
export function scale3x(src, w, h) {
  const W = w * 3, out = new Uint32Array(W * h * 3);
  const at = (x, y) => src[(y < 0 ? 0 : y >= h ? h - 1 : y) * w + (x < 0 ? 0 : x >= w ? w - 1 : x)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const A = at(x - 1, y - 1), B = at(x, y - 1), C = at(x + 1, y - 1);
      const D = at(x - 1, y), E = src[y * w + x], F = at(x + 1, y);
      const G = at(x - 1, y + 1), H = at(x, y + 1), I = at(x + 1, y + 1);
      let e0 = E, e1 = E, e2 = E, e3 = E, e5 = E, e6 = E, e7 = E, e8 = E;
      if (B !== H && D !== F) {
        e0 = D === B ? D : E;
        e1 = (D === B && E !== C) || (B === F && E !== A) ? B : E;
        e2 = B === F ? F : E;
        e3 = (D === B && E !== G) || (D === H && E !== A) ? D : E;
        e5 = (B === F && E !== I) || (H === F && E !== C) ? F : E;
        e6 = D === H ? D : E;
        e7 = (D === H && E !== I) || (H === F && E !== G) ? H : E;
        e8 = H === F ? F : E;
      }
      const o = y * 3 * W + x * 3;
      out[o] = e0; out[o + 1] = e1; out[o + 2] = e2;
      out[o + W] = e3; out[o + W + 1] = E; out[o + W + 2] = e5;
      out[o + 2 * W] = e6; out[o + 2 * W + 1] = e7; out[o + 2 * W + 2] = e8;
    }
  }
  return { w: W, h: h * 3, px: out };
}

// [r, g, b] palette entries -> packed little-endian RGBA (ImageData byte order)
export const rgba = (c, a = 255) => ((a << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;

// An Indexed image (js/gfx.js) to packed RGBA; index 0 (the backdrop) is transparent when asked.
export function indexedToRgba(img, pal, zeroTransparent = true) {
  const out = new Uint32Array(img.w * img.h), lut = pal.map((c) => rgba(c || [255, 0, 255]));
  for (let i = 0; i < out.length; i++) {
    const v = img.px[i];
    out[i] = (zeroTransparent && v === 0) || (img.opaque && !img.opaque[i]) ? 0 : lut[v];
  }
  return out;
}
