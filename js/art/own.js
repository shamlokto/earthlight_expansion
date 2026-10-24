// The expansion's own unit art (original pictures, not from the ROM), for types whose unit data
// names one (`ownArt`, js/expansion/data/units.json). Each set has a unit-info picture, a map icon
// and a fight hull (js/art/selenekai.js); everything else about the type (choreography, sounds)
// still comes from its `look` (js/look.js).
import { Indexed } from '../gfx.js';
import { SELENE_KAI } from './selenekai.js';

const SETS = { seleneKai: SELENE_KAI };
export const ownArt = (types, type) => SETS[types?.[type]?.ownArt] || null;

const decoded = new WeakMap();
function pixels(e) {
  if (!decoded.has(e)) {
    const px = new Uint8Array(e.w * e.h);
    e.rows.forEach((r, y) => { for (let x = 0; x < e.w; x++) px[y * e.w + x] = parseInt(r[x], 36); });
    decoded.set(e, px);
  }
  return decoded.get(e);
}

// The unit-info picture as unitart.js's unitArt() gives it: { w, h, data } (RGBA).
export function ownInfoArt(set) {
  const e = set.art, px = pixels(e), pal = e.palette.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const data = new Uint8ClampedArray(e.w * e.h * 4);
  for (let i = 0; i < px.length; i++) { const c = pal[px[i]]; data[i * 4] = c[0]; data[i * 4 + 1] = c[1]; data[i * 4 + 2] = c[2]; data[i * 4 + 3] = 255; }
  return { w: e.w, h: e.h, data };
}

// The map icon as maps.unitIcon() gives it: 24x16 colour numbers in the army's icon row (army A
// 0x80, army B 0xa0), with an opacity mask; army B's faces left, like the ROM's.
export function ownIcon(set, army) {
  const e = set.icon, px = pixels(e), img = new Indexed(e.w, e.h), hi = army ? 0xa0 : 0x80;
  img.opaque = new Uint8Array(e.w * e.h);
  for (let y = 0; y < e.h; y++) for (let x = 0; x < e.w; x++) {
    const v = px[y * e.w + (army ? e.w - 1 - x : x)], i = y * e.w + x;
    if (v) { img.px[i] = hi | v; img.opaque[i] = 1; }
  }
  return img;
}

// The modern board's token: colour numbers of the ships' fight palette row, facing right (army B's
// faces left). { w, h, px } with px the colour numbers (0 clear).
export function ownToken(set, army) {
  const e = set.token, px = pixels(e), out = new Uint8Array(e.w * e.h);
  for (let y = 0; y < e.h; y++) for (let x = 0; x < e.w; x++) out[y * e.w + x] = px[y * e.w + (army ? e.w - 1 - x : x)];
  return { w: e.w, h: e.h, px: out };
}

// The fight hull as one 128 px sprite sheet: tile n (16 to a row, as in the fight sheets) holds
// the hull's 8x8 block, in the colour numbers of the side's ship palette row.
const hullTiles = new WeakMap();
export function ownHullTiles(set) {
  if (!hullTiles.has(set)) {
    const e = set.hull, px = pixels(e), empty = new Uint8Array(64), cache = new Map();
    hullTiles.set(set, (n) => {
      const tx = n & 15, ty = n >> 4;
      if (tx * 8 >= e.w || ty * 8 >= e.h) return empty;
      if (!cache.has(n)) {
        const t = new Uint8Array(64);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) t[y * 8 + x] = px[(ty * 8 + y) * e.w + tx * 8 + x];
        cache.set(n, t);
      }
      return cache.get(n);
    });
  }
  return hullTiles.get(set);
}
