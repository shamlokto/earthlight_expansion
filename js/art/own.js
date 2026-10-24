// The expansion's own unit art (original pictures, not from the ROM), for types whose unit data
// names one (`ownArt`, js/expansion/data/units.json). Each set has a unit-info picture, a map icon
// and either a fight hull (ships: js/art/selenekai.js, js/art/leviathan.js) or fight poses (small
// craft: js/art/dirtalos.js); everything else about the type (choreography, sounds) still comes
// from its `look` (js/look.js).
import { Indexed } from '../gfx.js';
import { SELENE_KAI } from './selenekai.js';
import { LEVIATHAN } from './leviathan.js';
import { DIRECTORATE_TALOS } from './dirtalos.js';
import { AZORAS } from './azoras.js';
import { PALLAS_JET, PALLAS_JET_SPENT, PALLAS_ROBOT } from './pallas.js';
import { NAGA } from './naga.js';

const SETS = { seleneKai: SELENE_KAI, leviathan: LEVIATHAN, directorateTalos: DIRECTORATE_TALOS, azoras: AZORAS,
  pallasJet: PALLAS_JET, pallasJetSpent: PALLAS_JET_SPENT, pallasRobot: PALLAS_ROBOT, naga: NAGA };
export const ownArt = (types, type) => SETS[types?.[type]?.ownArt] || null;
// A type drawn in its own picture's colours everywhere (units.json `ownColors`; the unique
// Azoras, Leviathan and Directorate Talos): its set, when the set has the full-colour versions.
export const ownColors = (types, type) => (types?.[type]?.ownColors && ownArt(types, type)?.iconArt ? ownArt(types, type) : null);
export const ARMY_RGB = [[255, 90, 200], [90, 222, 70]];   // the army marks on full-colour icons
const rgbOf = (pal) => pal.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));


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

// The map icon in the picture's own colours (ownColors): an Indexed image (all colour numbers 0)
// with `rgba` for gfx.paint and the fight info screen, facing right for army A and left for army
// B, and a small army-colour mark in the lower left corner so the side stays readable.
export function ownIconColors(set, army) {
  const e = set.iconArt, px = pixels(e), pal = rgbOf(e.palette), img = new Indexed(e.w, e.h);
  img.opaque = new Uint8Array(e.w * e.h); img.rgba = new Uint8ClampedArray(e.w * e.h * 4);
  const put = (i, c) => { img.opaque[i] = 1; img.rgba[i * 4] = c[0]; img.rgba[i * 4 + 1] = c[1]; img.rgba[i * 4 + 2] = c[2]; img.rgba[i * 4 + 3] = 255; };
  for (let y = 0; y < e.h; y++) for (let x = 0; x < e.w; x++) {
    const v = px[y * e.w + (army ? e.w - 1 - x : x)];
    if (v) put(y * e.w + x, pal[v]);
  }
  const mark = ARMY_RGB[army ? 1 : 0];
  for (const [x, y, dark] of [[0, 12, 1], [0, 13, 0], [1, 13, 1], [0, 14, 0], [1, 14, 0], [2, 14, 1], [0, 15, 0], [1, 15, 0], [2, 15, 0], [3, 15, 1]]) put(y * e.w + x, dark ? [16, 16, 24] : mark);
  return img;
}

// The modern board's token in the picture's own colours: { w, h, rgb } with rgb [r, g, b] or null
// per pixel, facing right for army A and left for army B.
export function ownTokenColors(set, army) {
  const e = set.tokenArt, px = pixels(e), pal = rgbOf(e.palette), out = new Array(e.w * e.h).fill(null);
  const flip = (army ? 1 : 0) ^ (e.faces === 'left' ? 1 : 0);
  for (let y = 0; y < e.h; y++) for (let x = 0; x < e.w; x++) { const v = px[y * e.w + (flip ? e.w - 1 - x : x)]; if (v) out[y * e.w + x] = pal[v]; }
  return { w: e.w, h: e.h, rgb: out };
}

// A full-colour picture (hullArt, posesArt) as RGBA.
export function ownRgba(e) {
  const px = pixels(e), pal = rgbOf(e.palette), data = new Uint8ClampedArray(e.w * e.h * 4);
  for (let i = 0; i < px.length; i++) if (px[i]) { const c = pal[px[i]]; data[i * 4] = c[0]; data[i * 4 + 1] = c[1]; data[i * 4 + 2] = c[2]; data[i * 4 + 3] = 255; }
  return { w: e.w, h: e.h, data };
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

// A small craft's own fight poses: `set.poses` maps a sheet tile of its look (the top left of a
// 32x32 pose, 16 tiles to a row) to a 32x32 picture in the colour numbers of the craft fight
// rows. ownPoseTiles(set, tiles) is `tiles` (a fightscene.js tile cache) with those poses' 16
// tiles each replaced; ownPoseBases(set) the pose tiles.
// A ship's hull for the fight sheet in use: `hull2` (if any) stands in on the second sheet, as
// the look's own second hull does (the Azoras: the Tiamat's top-down hull against ships).
const secondHull = new WeakMap();
export function ownHullSet(set, second) {
  if (!second || !set.hull2) return set;
  if (!secondHull.has(set)) secondHull.set(set, { ...set, hull: set.hull2, hullArt: set.hull2Art || null });
  return secondHull.get(set);
}

// A set's poses for the fight sheet in use: `poses2` (if any) stand in on the second sheet, the one
// weapon slots 1-3 load (fightscene.js sheetOf; the Pallas's sabre poses), `poses` on the first.
const second = new WeakMap();
export function ownPoseSet(set, slot) {
  if (!slot || !set.poses2) return set;
  if (!second.has(set)) second.set(set, { poses: set.poses2 });
  return second.get(set);
}
const poseBases = new WeakMap();
export function ownPoseBases(set) {
  if (!poseBases.has(set)) poseBases.set(set, new Set(Object.keys(set.poses || {}).map(Number)));
  return poseBases.get(set);
}
const poseTiles = new WeakMap();
export function ownPoseTiles(set, tiles) {
  if (!poseTiles.has(tiles)) {
    const at = new Map();   // sheet tile (0-255) -> [pose pixels, tile x, tile y]
    for (const b of ownPoseBases(set)) for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) at.set((b + r * 16 + c) & 255, [pixels(set.poses[b]), c, r]);
    const cache = new Map();
    const fn = (n) => {
      const hit = at.get(n & 255);
      if (!hit) return tiles(n);
      if (!cache.has(n & 255)) {
        const [px, c, r] = hit, t = new Uint8Array(64);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) t[y * 8 + x] = px[(r * 8 + y) * 32 + c * 8 + x];
        cache.set(n & 255, t);
      }
      return cache.get(n & 255);
    };
    fn.posesArt = set.posesArt || null;   // full-colour poses for the modern fight renderer (ownColors)
    poseTiles.set(tiles, fn);
  }
  return poseTiles.get(tiles);
}
