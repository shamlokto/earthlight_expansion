// The expansion's own unit art (original pictures, not from the ROM), for types whose unit data
// names one (`ownArt`, js/expansion/data/units.json). Each set has a unit-info picture, a map icon
// and either a fight hull (ships: js/art/selenekai.js, js/art/leviathan.js), fight poses (small
// craft: js/art/dirtalos.js) or neither (js/art/kai.js: fights use the look's sprites); everything else about the type (choreography, sounds) still comes
// from its `look` (js/look.js).
import { Indexed } from '../gfx.js';
import { SELENE_KAI } from './selenekai.js';
import { LEVIATHAN } from './leviathan.js';
import { NINEVEH } from './nineveh.js';
import { DIRECTORATE_TALOS } from './dirtalos.js';
import { AZORAS } from './azoras.js';
import { AZORAS_KAI } from './azoraskai.js';
import { PALLAS_JET, PALLAS_JET_SPENT, PALLAS_ROBOT } from './pallas.js';
import { NAGA } from './naga.js';
import { LOBSTER_KAI, CRANE_KAI, TITAN_KAI } from './kai.js';
import { MARS_KAI, CYCLOPS_KAI } from './kai2.js';
import { FENRIR_KAI, ASURA_KAI } from './kai3.js';
import { ATHENA_KAI_JET, ATHENA_KAI_JET_SPENT, ATHENA_KAI_ROBOT } from './athenakai.js';
import { ICONS as KAI_ICONS } from './kai-icons.js';

const SETS = { seleneKai: SELENE_KAI, leviathan: LEVIATHAN, nineveh: NINEVEH, directorateTalos: DIRECTORATE_TALOS, azoras: AZORAS, azorasKai: AZORAS_KAI,
  pallasJet: PALLAS_JET, pallasJetSpent: PALLAS_JET_SPENT, pallasRobot: PALLAS_ROBOT, naga: NAGA,
  lobsterKai: LOBSTER_KAI, craneKai: CRANE_KAI, titanKai: TITAN_KAI, marsKai: MARS_KAI, cyclopsKai: CYCLOPS_KAI,
  fenrirKai: FENRIR_KAI, asuraKai: ASURA_KAI,
  athenaKaiJet: ATHENA_KAI_JET, athenaKaiJetSpent: ATHENA_KAI_JET_SPENT, athenaKaiRobot: ATHENA_KAI_ROBOT };
// Weapon effect colours in the modern fights (js/render/fightfx.js: beams, railguns, missiles),
// per set; the rest take the defaults there.
const FX = {
  lobsterKai: { beam: [255, 80, 60] }, craneKai: { rail: [140, 210, 255] }, titanKai: { rail: [150, 255, 120] },
  directorateTalos: { beam: [255, 40, 60] }, naga: { rail: [70, 255, 200], beam: [70, 255, 200] },
  pallasJet: { beam: [90, 200, 255] }, pallasJetSpent: { beam: [90, 200, 255] }, pallasRobot: { rail: [120, 220, 255] },
  seleneKai: { rail: [190, 130, 255], beam: [190, 130, 255] }, azoras: { rail: [255, 210, 120] }, azorasKai: { rail: [255, 215, 110] },
  marsKai: { beam: [255, 170, 60], rail: [255, 200, 120] }, fenrirKai: { rail: [255, 120, 50] }, asuraKai: { rail: [255, 90, 60] },
  athenaKaiJet: { rail: [255, 120, 210] }, athenaKaiJetSpent: { rail: [255, 120, 210] }, athenaKaiRobot: { rail: [255, 140, 220] },
};
for (const [k, f] of Object.entries(FX)) if (SETS[k]) SETS[k].fx = f;
// Ships drawn larger than the box of the ship they borrow their fight moves from (owner, 2026-10-30:
// the Kai ships and the Azoras looked too small in the fights; modern renderer only, fightfx.js
// ownHullArt): `hullScale` for the hull, `hull2Scale` for the second (against ships).
const SCALE = { seleneKai: { hullScale: 1.35 }, azoras: { hullScale: 1.4, hull2Scale: 1.3 }, azorasKai: { hullScale: 1.55, hull2Scale: 1.45 }, asuraKai: { hullScale: 1.35, hull2Scale: 1.7 }, fenrirKai: { hullScale: 1.6 } };
for (const [k, sc] of Object.entries(SCALE)) if (SETS[k]) Object.assign(SETS[k], sc);
// The Kai series' hand-drawn map icons (js/art/kai-icons.js) in place of the sets' own
for (const [k, ic] of Object.entries(KAI_ICONS)) if (SETS[k]) SETS[k].icon = ic;

// Each Kai refit in its own colours (owner, 2026-10-29: they were all white and magenta-pink and hard
// to tell apart): the pink and magenta of its full-colour pictures (unit picture, poses, hulls,
// icon and token art) turned to the set's accent hue, keeping saturation and lightness. The
// classic sprites and map icons draw in the army's colours and are unchanged.
const ACCENT = { lobsterKai: 4, craneKai: 205, titanKai: 112, marsKai: 26, seleneKai: 268 };
const hsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1)), h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const hex = ([h, s, l]) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
};
export function accentPalette(pal, hue) {
  return pal.map((c) => {
    const [h, s, l] = hsl([1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
    return h >= 285 && h <= 352 && s > 0.25 && l > 0.08 ? hex([hue, s, l]) : c;
  });
}
const pictures = (set) => [set.art, set.iconArt, set.tokenArt, set.hullArt, set.hull2Art, ...Object.values(set.posesArt || {}), ...Object.values(set.posesArt2 || {})].filter((e) => e && e.palette);
for (const [k, hue] of Object.entries(ACCENT)) if (SETS[k]) for (const e of pictures(SETS[k])) e.palette = accentPalette(e.palette, hue);
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
  if (!secondHull.has(set)) secondHull.set(set, { ...set, hull: set.hull2, hullArt: set.hull2Art || null, hullScale: set.hull2Scale ?? set.hullScale });
  return secondHull.get(set);
}

// A set's poses for the fight sheet in use: `poses2` (if any) stand in on the second sheet, the one
// weapon slots 1-3 load (fightscene.js sheetOf; the Pallas's and the Directorate Talos's sabre
// poses), `poses` on the first; `posesArt2` are the second sheet's full-colour poses.
const second = new WeakMap();
export function ownPoseSet(set, slot) {
  if (!slot || !set.poses2) return set;
  if (!second.has(set)) second.set(set, { poses: set.poses2, posesArt: set.posesArt2 || null });
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
