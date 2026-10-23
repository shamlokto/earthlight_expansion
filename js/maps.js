// Battle maps: hex terrain, deployments and unit icons, rendered exactly the way
// the game composes its 8bpp BG1 "framebuffer" (routines $01:BF1B, $01:C9xx,
// $01:EBF2). Verified at 99.4% pixel identity against the running game; the
// remainder is one animated base cell.
import { lorom } from './rom.js';
import { Indexed, paletteFromBytes } from './gfx.js';

export const MAP_COUNT = 30;
const MAP_NAMES = 0x01db3a;     // 30 x 8 ASCII chars
const MAP_HEADER_IDS = 0x01d13e; // word per map -> 160-byte header asset
const MAP_GRID_IDS = 0x01d102;   // word per map -> 62x42 grid asset
const MAP_SIZE = 0x01d19e;       // byte per map: lo nibble = width, hi = height (in screens)
const UNIT_TYPE_GFX = 0x01ee2c;  // byte per unit type -> map icon index
const CELL_GFX_BASE = 485;       // cell graphic asset = 485 + header[value]
const GRID_W = 62, GRID_H = 42;
export const SCREEN_COLS = 15, SCREEN_ROWS = 10;
export const UNIT_ICONS = 40;    // per army, plus a second frame at +0x2580
const ICON_BYTES = 240, ICON_FRAME2 = 0x2580;

export function mapInfo(rom, m) {
  const name = String.fromCharCode(...rom.bytes.subarray(lorom(MAP_NAMES) + m * 8, lorom(MAP_NAMES) + m * 8 + 8)).trim();
  const size = rom.byteAt(MAP_SIZE + m);
  const headerId = rom.wordAt(MAP_HEADER_IDS + m * 2);
  const gridId = rom.wordAt(MAP_GRID_IDS + m * 2);
  return {
    index: m, name, headerId, gridId, deployId: headerId + 2,
    screensW: size & 15, screensH: size >> 4,
    cols: (size & 15) * SCREEN_COLS, rows: (size >> 4) * SCREEN_ROWS,
  };
}

// CGRAM as set up on the battle screen: row 0 from asset 110, rows 1-7 terrain
// (asset 193), rows 8-15 units/sprites (asset 192).
export function battlePalette(rom) {
  const cg = new Uint8Array(512);
  cg.set(rom.body(110).subarray(0, 32), 0);
  cg.set(rom.body(193).subarray(0, 224), 32);
  cg.set(rom.body(192).subarray(0, 256), 256);
  return paletteFromBytes(cg, 256);
}

// One terrain cell: 24x16 px (flat-top hex), 6 tiles in a 3x2 grid. Each tile is
// 48 bytes: 32 bytes of 4bpp + 8 bytes of bitplane 5 + 8 bytes of bitplane 6
// (the extra planes pick palette row 2/4/6 for that pixel).
export function cellGraphic(rom, gfxId) {
  const b = rom.body(CELL_GFX_BASE + gfxId);
  const img = new Indexed(24, 16);
  for (let t = 0; t < 6; t++) {
    const o = t * 48, tx = (t % 3) * 8, ty = Math.floor(t / 3) * 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const s = 7 - x;
        let v = ((b[o + y * 2] >> s) & 1) | (((b[o + y * 2 + 1] >> s) & 1) << 1)
          | (((b[o + 16 + y * 2] >> s) & 1) << 2) | (((b[o + 17 + y * 2] >> s) & 1) << 3);
        v |= ((b[o + 32 + y] >> s) & 1) << 5;
        v |= ((b[o + 40 + y] >> s) & 1) << 6;
        img.px[(ty + y) * 24 + tx + x] = v;
      }
    }
  }
  return img;
}

// Unit map icon: 24x16, 6 tiles of 40 bytes (32 bytes 4bpp + 8-byte mask).
// Army 0 icons live in asset 0 (bank $04) and use palette row 8;
// army 1 icons live in asset 1 (bank $05) and use palette row 10.
export function unitIcon(rom, army, gid, frame = 0) {
  const src = rom.body(army ? 1 : 0);
  const base = gid * ICON_BYTES + (frame ? ICON_FRAME2 : 0);
  const img = new Indexed(24, 16);
  img.opaque = new Uint8Array(24 * 16);
  const hi = army ? 0xa0 : 0x80;
  for (let t = 0; t < 6; t++) {
    const o = base + t * 40, tx = (t % 3) * 8, ty = Math.floor(t / 3) * 8;
    for (let y = 0; y < 8; y++) {
      const mask = src[o + 32 + y];
      for (let x = 0; x < 8; x++) {
        const s = 7 - x;
        if (!((mask >> s) & 1)) continue;
        const i = (ty + y) * 24 + tx + x;
        img.opaque[i] = 1;
        img.px[i] = hi | ((src[o + y * 2] >> s) & 1) | (((src[o + y * 2 + 1] >> s) & 1) << 1)
          | (((src[o + 16 + y * 2] >> s) & 1) << 2) | (((src[o + 17 + y * 2] >> s) & 1) << 3);
      }
    }
  }
  return img;
}

export function unitTypeGfx(rom, type) { return rom.byteAt(UNIT_TYPE_GFX + type); }

// Starting deployment: count, then (army<<7 | unit type, x, y) per unit.
export function deployment(rom, info) {
  const d = rom.body(info.deployId);
  const n = d[0], out = [];
  for (let i = 0; i < n && 1 + i * 3 + 2 < d.length; i++) {
    const t = d[1 + i * 3];
    out.push({ army: t >> 7, type: t & 0x7f, x: d[2 + i * 3], y: d[3 + i * 3] });
  }
  return out;
}

// Pixel origin of a cell in full-grid coordinates.
export function cellOrigin(cx, cy) { return [cx * 16, cy * 16 + (cx & 1) * 8]; }

// Hex outline inside its 24x16 box (matches the opaque area of every cell graphic).
export const HEX_POINTS = [[8, 0], [16, 0], [24, 8], [16, 16], [8, 16], [0, 8]];

function inHex(lx, ly) {
  if (ly < 0 || ly >= 16) return false;
  const d = ly <= 8 ? ly : 16 - ly; // row 0: x 8..15, row 8: x 0..23
  return lx >= 8 - d && lx <= 15 + d;
}

// Inverse of cellOrigin: which cell's hex covers this full-grid pixel.
export function cellAt(px, py) {
  const c0 = Math.floor(px / 16);
  for (const cx of [c0, c0 - 1]) {
    const cy = Math.floor((py - (cx & 1) * 8) / 16);
    const [X, Y] = cellOrigin(cx, cy);
    if (inHex(px - X, py - Y)) return [cx, cy];
  }
  return [c0, Math.floor((py - (c0 & 1) * 8) / 16)];
}

export function renderMap(rom, info, { units = true } = {}) {
  const header = rom.body(info.headerId);
  const grid = rom.body(info.gridId);
  const W = GRID_W * 16 + 8, H = GRID_H * 16 + 8;
  const full = new Indexed(W, H);
  const cells = new Map();
  const maxCol = Math.min(GRID_W - 1, info.cols + 1), maxRow = Math.min(GRID_H - 2, info.rows + 1);
  for (let cy = 0; cy <= maxRow; cy++) {
    for (let cx = 0; cx <= maxCol; cx++) {
      const v = grid[cy * GRID_W + cx];
      if (!cells.has(v)) cells.set(v, cellGraphic(rom, header[v]));
      const g = cells.get(v);
      const [X, Y] = cellOrigin(cx, cy);
      for (let y = 0; y < 16; y++) {
        const row = (Y + y) * W + X;
        for (let x = 0; x < 24; x++) full.px[row + x] |= g.px[y * 24 + x];
      }
    }
  }
  const deploy = deployment(rom, info);
  if (units) {
    for (const u of deploy) drawIcon(full, unitIcon(rom, u.army, unitTypeGfx(rom, u.type)), ...cellOrigin(u.x, u.y));
  }
  // Crop to the playfield the game shows: from cell (1,1), width 15*16 px per
  // screen, height 10*16 px per screen plus the half-cell column stagger.
  const vw = info.cols * 16, vh = info.rows * 16 + 8;
  const out = new Indexed(vw, vh);
  for (let y = 0; y < vh; y++) out.px.set(full.px.subarray((16 + y) * W + 16, (16 + y) * W + 16 + vw), y * vw);
  return { img: out, grid, header, deploy, offset: [16, 16] };
}

function drawIcon(dst, icon, X, Y) {
  for (let y = 0; y < icon.h; y++) {
    for (let x = 0; x < icon.w; x++) {
      const i = y * icon.w + x;
      if (icon.opaque[i]) dst.px[(Y + y) * dst.w + X + x] = icon.px[i];
    }
  }
}
