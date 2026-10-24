// Fight cut-in scene, rewritten from frame captures of the original
// (bank $03 fight engine, entry $03:88B3). Graphics come from the ROM:
//   background for the attacker's terrain class c: tiles $04:CCE0[c], palette $04:CD78[c],
//   tilemap $04:CD2C[c] (BG1, 4bpp, 32x32)
//   machine sprites: sheet 393 + $04:D038[type] or $04:D072[type] (sheetOf; 32x32 sprites, 16
//   tiles per row), effects 441,
//   palettes 394 (left side, OBJ rows 0-2) and 395 (right side, rows 3-5)
// Ranged small-craft choreography, timings and formation are modelled on a captured Mars-vs-Mars
// fight (60 fps); melee (weapon slot 2) and capital-ship / structure attacks replay recordings of
// the original (fightdata.js). Every unit type has its own actor routine in the original ($04:D0AC); the
// per-type differences measured so far are in VARIANT below.
import { decodeTile, paletteFromBytes, bgr555 } from '../gfx.js';
import { InfoScreen } from './infoscreen.js';
import { SFX, fireSfx } from '../audio/fightsfx.js';
import { SHIP_ATTACKS, MELEE } from './fightdata.js';

const W = 256, H = 224;
const T_BG = 0x04cce0, T_BGPAL = 0x04cd78, T_BGMAP1 = 0x04cd06, T_BGMAP = 0x04cd2c, T_SHEET = 0x04d038, T_SHEET2 = 0x04d072;
const CRANE = 9, IRIS = 35, DOCK = 52;
const BACKDROP = bgr555(0x3193);   // CGRAM colour 0 in every captured fight
const SHEET_BASE = 393, FX = 441;
// Sprite palettes per side, by unit class ($04:D40D / $04:D443 setup, chosen at $03:942D).
const SHIP_TYPES = 30, STRUCT_TYPES = 0x34;
const PALS = { craft: [394, 395], ship: [363, 364], struct: [443, 444] };
const kindOf = (type) => (type < SHIP_TYPES ? 'craft' : type < STRUCT_TYPES ? 'ship' : 'struct');

// Capital-ship hull, captured from a Tiamat fight: 2 x 4 sprites of 32x32
// [dx, y, tile, flags] with flags bit0 = h-flip, bit1 = v-flip (left side, at rest x = 4).
const HULL = [[0, 8, 4, 1], [0, 40, 12, 1], [0, 72, 12, 1], [0, 104, 12, 1],
  [32, 8, 0, 1], [32, 40, 8, 1], [32, 72, 64, 1], [32, 104, 64, 3]];
const HULL_X = 4, HULL_FLY = 89, HULL_ARRIVE = 98, PORTS = [44, 60, 76, 92, 108, 124], SHELL = 70, SHELL_SPEED = 14;

// Structures (docks, fortresses, command towers): one static 64x32 object of two 32x32
// sprites, captured on the right side at [x, y] with this base tile.
const STRUCT = { 52: [184, 33, 8], 53: [184, 39, 0], 54: [184, 39, 0], 55: [184, 39, 0], 56: [176, 39, 0], 57: [176, 39, 0] };
// Capital-ship hulls by type, captured on the left side once settled (research/hull.py):
// [x of the leftmost column, [[dx, y, tile, flags], ...]], flags bit0 h-flip, bit1 v-flip.
// Types not listed use the Tiamat hull (HULL, x 4). The right side mirrors x' = 223 - x.
const A2 = [[0, 7, 4, 1], [0, 39, 12, 1], [0, 71, 68, 1], [0, 103, 68, 1], [32, 7, 0, 1], [32, 39, 8, 1], [32, 71, 64, 1], [32, 103, 72, 1]];
const HULLS = {
  31: [4, A2], 32: [3, A2],
  33: [4, [[0, 7, 72, 1], [0, 39, 68, 1], [0, 71, 68, 1], [0, 103, 68, 1], [32, 7, 0, 1], [32, 39, 8, 1], [32, 71, 64, 1], [32, 103, 8, 1]]],
  34: [4, [[0, 8, 4, 1], [0, 40, 12, 1], [0, 72, 12, 1], [0, 104, 12, 1], [32, 8, 0, 1], [32, 40, 8, 1], [32, 72, 8, 1], [32, 104, 8, 1]]],
  35: [24, [[0, 8, 8, 1], [0, 40, 128, 1], [0, 72, 128, 3], [0, 104, 8, 3], [32, 8, 4, 1], [32, 40, 76, 1], [32, 72, 76, 3], [32, 104, 4, 3],
    [64, 8, 0, 1], [64, 40, 72, 1], [64, 72, 72, 3], [64, 104, 0, 3]]],
  36: [-12, [[0, 10, 4, 1], [0, 42, 12, 0], [0, 74, 64, 0], [0, 106, 12, 2], [32, 10, 4, 1], [32, 42, 12, 0], [32, 74, 64, 0], [32, 106, 12, 2],
    [64, 10, 0, 1], [64, 42, 8, 1], [64, 74, 8, 1], [64, 106, 8, 1]]],
  37: [-12, [[0, 10, 8, 1], [0, 42, 68, 1], [0, 74, 128, 1], [0, 106, 68, 3], [32, 10, 4, 1], [32, 42, 64, 1], [32, 74, 76, 1], [32, 106, 64, 3],
    [64, 10, 0, 1], [64, 42, 12, 1], [64, 74, 72, 1], [64, 106, 12, 1]]],
  38: [4, [[0, 7, 4, 1], [0, 39, 12, 1], [0, 71, 12, 3], [0, 103, 4, 3], [32, 7, 0, 1], [32, 39, 8, 1], [32, 71, 8, 3], [32, 103, 0, 3]]],
  39: [4, [[0, 7, 4, 1], [0, 39, 12, 1], [0, 71, 68, 1], [0, 103, 76, 1], [32, 7, 0, 1], [32, 39, 8, 1], [32, 71, 64, 1], [32, 103, 72, 1]]],
  40: [7, [[0, 7, 4, 1], [0, 39, 12, 1], [0, 71, 68, 1], [0, 103, 76, 1], [32, 7, 0, 1], [32, 39, 8, 1], [32, 71, 64, 1], [32, 103, 72, 1]]],
  42: [4, [[0, 7, 4, 1], [0, 39, 12, 1], [0, 71, 12, 1], [0, 103, 12, 1], [32, 7, 0, 1], [32, 39, 8, 1], [32, 71, 8, 1], [32, 103, 8, 1]]],
  43: [4, [[0, 40, 4, 1], [0, 72, 4, 3], [16, 8, 8, 1], [16, 104, 8, 3], [32, 40, 0, 1], [32, 72, 0, 3]]],
  44: [20, [[0, 8, 8, 1], [0, 40, 12, 1], [0, 72, 12, 3], [0, 104, 8, 3]]],
  49: [4, [[0, 40, 4, 1], [0, 72, 68, 3], [32, 40, 0, 1], [32, 72, 0, 3]]],
  50: [-20, [[0, 39, 8, 1], [0, 71, 8, 3], [32, 39, 4, 1], [32, 71, 4, 3], [64, 39, 0, 1], [64, 71, 0, 3]]],
  51: [4, [[0, 39, 4, 1], [0, 71, 4, 3], [32, 39, 8, 1], [32, 71, 8, 3]]],
};
// Ship weapons other than Tiamat's port broadside: 'fan' = shots from the hull centre at
// `speed` px/frame, one per vertical step in `dys` (MSP/DDG classes, BB-V3 low guns);
// 'home' = curving shots (SCG-MB1/BM). Fired ~136 frames into the battle.
const SHIP_SHOTS = {
  38: { shot: 67, path: 'fan', speed: 6, at: [44, 125], dys: [-2, -1, 0] },
  39: { shot: 128, path: 'home', at: [100, 100] }, 40: { shot: 130, path: 'home', at: [100, 100] },
  43: { shot: 12, path: 'fan', speed: 7, at: [54, 66], dys: [-2, -1, 1, 2] },
  44: { shot: 76, path: 'fan', speed: 7, at: [38, 66], dys: [-2, -1, 1, 2] },
  49: { shot: 94, path: 'fan', speed: 7, at: [62, 68], dys: [-2, -1, 0, 1, 2] },
  50: { shot: 68, path: 'fan', speed: 7, at: [86, 66], dys: [-2, -1, 0, 1, 2] },
  51: { shot: 12, path: 'fan', speed: 7, at: [56, 66], dys: [-2, -1, 1, 2] },
};
// Structures as attackers (captured on the left at x 8): dock 8 px/frame tile 64,
// fortresses 6 px/frame tile 67, fired ~52 frames after the craft fire time.
const STRUCT_SHOTS = { 52: { shot: 64, speed: 8, at: [89, 6] }, 53: { shot: 67, speed: 6, at: [83, 4] },
  54: { shot: 67, speed: 6, at: [83, 4] }, 55: { shot: 67, speed: 6, at: [83, 4] } };
// Stay-gun turrets (Dragon/Hydra/Rahab): staggered two-column grid instead of the squad slots.
const TURRET_TYPES = new Set([23, 24, 25]);
const TURRET_SLOTS = [[7, 12], [47, 4], [7, 44], [47, 36], [7, 76], [47, 68], [7, 108], [47, 100]];

// Per-type variants, measured in captures of each type attacking a Mars (research/proj.py
// for projectiles, research/flame.py for thruster flames). Every type has its own actor
// routine ($04:D0AC), but they differ mainly in these parameters:
//   shot   projectile tile (8x8; `tall` = 8x16, tile + 16 below, animating tile/tile+1)
//   speed  px per frame for straight shots (all measured 3 or 4)
//   path   'lob'  shell pairs climb at (2,-1) px/frame off the top, then come in at (4,-2)
//                 onto the targets 56 frames later (Titan, CUB-6 Gunner)
//          'home' missiles curve out and home onto the targets (CUM-7)
//          'drop' missiles fly level to mid-screen, then dive onto the targets (Hydra)
//   hit    frames from firing until the hits land on the other side (default 24)
//   fly / walk / fire / idle  body poses (tile of the 32x32 sprite); walk null = no walk cycle
//   flame  [top, bottom] 8x8 thruster tiles at the rear edge, dy 8 / 16, 3 frames of 4
//   flame1 [tile, dx] one 8x8 flame at dy 11, every other frame
//   flyAlt body tile shown on 3 frames of 4 while flying (the other frame shows `fly`)
// Turrets (23-25) are already in place when the battle starts and show `fly` until ~frame 70.
const BASE = { shot: 68, speed: 3, hit: 24, fly: 4, walk: [4, 8, 12], fire: 64, idle: 0 };
const VARIANT = {
  1: { shot: 128, path: 'lob', hit: 88, fly: 72, walk: null, fire: 68, idle: 72 },   // HU-NN7 Titan
  2: { shot: 72 },                                                                    // HU-AX45 Talos
  3: { shot: 72, speed: 4, walk: null, fire: 68 },                                    // HU-M34 (missiles)
  4: { shot: 161, fly: 0, walk: null, fire: null, flame: [130, 146] },                // CHU-03F, form 1
  5: { shot: 77, fly: 0, walk: null, flame: [76, 92] },                               // CHU-03F, form 2
  8: { shot: 77, fly: 0, walk: null, fire: null, flame: [76, 92] },                   // FS-41 Lobster
  9: { shot: 140, fly: 0, flyAlt: 136, walk: null, fire: null },                      // FFA-81
  10: { shot: 158, fly: 0, walk: null, fire: null, flame1: [143, 0] },                // FB-97, form 1
  11: { shot: 69, fly: 0, walk: null, fire: null, flame1: [68, 4] },                  // FB-97, form 2
  14: { shot: 64, path: 'lob', hit: 88, fly: 0, walk: null, fire: 12, idle: 8 },      // CUB-6 Gunner
  15: { shot: 65, path: 'lob', hit: 88, fly: 0, walk: [4, 8, 12, 8], fire: null },   // CUN-42 (incoming half not captured)
  16: { shot: 12, path: 'home', hit: 75, fly: 8, walk: null, fire: null },            // CUM-7
  23: { shot: 12, speed: 4, fly: 8, fire: null },                                    // SG-DR10 Dragon
  24: { shot: 4, tall: true, path: 'drop', hit: 65, fire: null },                     // SG-HY7 Hydra
  25: { shot: 72, speed: 4, fire: null },                                             // SG-RA4 Rahab
  26: { shot: 128, walk: [0, 4, 8, 12], fire: 72 },                                   // CR-1
  27: { shot: 128, walk: [0, 4, 8, 12], fire: 72 },
};
// Ships and structures fire later than small craft, so their hits land later too.
const variant = (type) => ({ ...BASE, ...(type >= STRUCT_TYPES ? { hit: 75 } : type >= SHIP_TYPES ? { hit: 70 } : {}), ...(VARIANT[type] || {}) });

// Left-side formation slots at rest (captured); the right side mirrors x' = 223 - x.
const SLOTS = [[19, 103], [59, 91], [19, 67], [67, 67], [19, 38], [67, 41], [18, 9], [59, 17]];
const SHOT = 68, BOOM = [192, 196, 200];   // capital-ship port flash; explosion frames

// Timeline (frames, from the capture: fly-in 362-422, fire 440-472, explosions 462-512). The
// screen has faded out at T_END (ranged fights), MELEE_END and a recording's `black` (captured;
// the fade takes the last FADE frames).
const T_FLYIN = 0, FLY_LEN = 60, T_ADVANCE = 78, T_FIRE = 86, T_END = 300, MELEE_END = 359, SHIP_END = 330, FADE = 8;

function wordAt(rom, addr) { return rom.wordAt(addr); }

// Recorded tracks (fightdata.js), parsed on first use: { t0, size, row, f: [[x, y, tile, flags]] },
// null for frames the sprite is hidden (the original flickers some shots).
const parsed = new Map();
const tokens = (s) => s.split(' ').map((tok) => { const k = tok.indexOf('*'); return [k < 0 ? 1 : +tok.slice(0, k), tok.slice(k + 1)]; });
function track(s) {
  if (!parsed.has(s)) {
    const [head, ...rest] = s.split(' '), [hd, first] = head.split(':');
    const [t0, size, row] = hd.split(',').map(Number);
    let [x, y, tile, fl] = first.split(',').map(Number);
    const f = [[x, y, tile, fl]];
    if (rest.length) {
      for (const [n, d] of tokens(rest.join(' '))) {
        const v = d.split(',').map(Number);
        for (let k = 0; k < n; k++) {
          if (d === 'h') { f.push(null); continue; }
          x += v[0]; y += v[1];
          if (v.length > 2) [tile, fl] = [v[2], v[3]];
          f.push([x, y, tile, fl]);
        }
      }
    }
    parsed.set(s, { t0, size, row, f });
  }
  return parsed.get(s);
}
// Melee body track from battle frame 0: [x, y, tile, flags, row] per frame, null while off screen.
function bodyTrack(s) {
  if (!parsed.has(s)) {
    const f = [];
    let cur = null;
    for (const [n, d] of tokens(s)) {
      for (let k = 0; k < n; k++) {
        if (d === 'h') { f.push(null); continue; }
        const v = d.replace('=', '').split(',').map(Number);
        cur = d[0] === '=' ? v : [cur[0] + v[0], cur[1] + v[1], ...(v.length > 2 ? v.slice(2) : cur.slice(2))];
        f.push(cur);
      }
    }
    parsed.set(s, f);
  }
  return parsed.get(s);
}
const clampAt = (arr, k) => arr[Math.max(0, Math.min(arr.length - 1, k))];

// The recorded attack of a capital ship or structure: by type, weapon slot and target (small
// craft or ship); null if none was captured (the modelled patterns below are used instead).
function shipAttack(type, slot, target) {
  return SHIP_ATTACKS[`${type}/${slot}/${kindOf(target) === 'craft' ? 'c' : 's'}`] || null;
}
// Hull of a ship that doesn't fire: any recording of its type made with the same sprite sheet.
function shipHull(rom, type, sheet) {
  for (const key of Object.keys(SHIP_ATTACKS)) {
    const [t, slot, k] = key.split('/');
    if (+t === type && sheetOf(rom, type, +slot, k === 's' ? SHIP_TYPES + 4 : 0) === sheet) return SHIP_ATTACKS[key];
  }
  return null;
}

// A ship under fire rocks: down 1 px every 4 frames to 5 px, back up, rest, in a 44-frame cycle (captured).
function bobAt(t) {
  t %= 44;
  return t < 16 ? 1 + (t >> 2) : t < 21 ? 5 : t < 37 ? 4 - ((t - 21) >> 2) : 0;
}
// A machine's death (captured): a long and a short explosion flash every 15 frames, three times,
// where it was hit, in the other side's effect palette. Bodies vanish at the first flash.
const FLASH = [[192, 192, 192, 192, 196], [192, 196, 196, 196, 200, 200, 200]];
const DEATH = [0, 6, 15, 21, 30, 36];
function deathTile(d) {
  for (let k = 0; k < DEATH.length; k++) { const q = FLASH[k & 1], t = d - DEATH[k]; if (t >= 0 && t < q.length) return q[t]; }
  return null;
}
const MELEE_DIE = 138, MELEE_DIE_STEP = 15, MELEE_BOB = 163;   // captured melee deaths and hull rocking

// Build a 32 KB "sprite VRAM": left side tiles 0-255, right side tiles 256-511.
// Which sprite sheet a machine fights with ($03:974C): weapon slot 0 uses $04:D038[type], slots 1-3
// use $04:D072[type] (melee poses, ship batteries); the Iris uses D072 with slot 0, and a ship
// facing a Crane keeps D038. The slot is the side's own weapon: the attacker's, or the one the
// defender strikes back with (captured: a Mars that doesn't strike back keeps sheet 393 against a
// slot-1 battery, a Tiamat keeps its D038 hull against a melee, a Mars striking back loads 396).
export function sheetOf(rom, type, slot, otherType) {
  const second = slot ? !(type >= SHIP_TYPES && otherType === CRANE) : type === IRIS;
  return SHEET_BASE + rom.byteAt((second ? T_SHEET2 : T_SHEET) + type);
}

function spriteBank(rom, type, slot = 0, otherType = -1) {
  const vram = new Uint8Array(512 * 32);
  const sheet = rom.asset(sheetOf(rom, type, slot, otherType));
  const fx = rom.asset(FX);
  for (const base of [0, 256 * 32]) {
    vram.set(sheet.subarray(0, Math.min(sheet.length, 256 * 32)), base);
    // effects asset is laid out with its own lead offset (explosion tiles near 192+)
    for (let i = 0; i < Math.min(fx.length, 256 * 32); i++) if (fx[i]) vram[base + i] = fx[i];
  }
  return vram;
}

function tileCache(vram) {
  const cache = new Map();
  return (n) => {
    if (!cache.has(n)) cache.set(n, decodeTile(vram, (n & 511) * 32, 4));
    return cache.get(n);
  };
}

export class FightScene {
  // att/def: { type, army, hp, hpAfter, cls } ; leftType/rightType sheets differ per side
  constructor(rom, att, def, opts = {}) {
    this.rom = rom; this.att = att; this.def = def;
    this.frame = 0; this.done = false; this.clock = 0;
    this.leftSide = att.army === 0 ? att : def;   // army A on the left, as in the capture
    this.rightSide = att.army === 0 ? def : att;
    this.counter = opts.counter !== false;
    // opts.info (Battle.fightInfo) adds the pre-fight info screen in front of the battle
    this.intro = opts.info ? new InfoScreen(rom, opts.info, { textRom: opts.textRom, names: opts.names }) : null;
    this.introLen = this.intro ? this.intro.length : 0;
    this.frame = -this.introLen;
    this.buildBackground();
    this.buildSprites();
    this.buildActors();
  }

  // Two half-screen backdrops ($03:927B, $03:94DC): BG1 shows the left side's terrain class (tiles
  // $04:CCE0, map $04:CD06, its content in the left 128 px), BG2 the right side's (map $04:CD2C,
  // scrolled 128 px so it fills the right half). Both start 8 px down (V-scroll -8). A capital ship
  // scrolls its side's layer 1 px/frame towards its back (BG1 H +1, BG2 H -1) and a dock its layer
  // up 1 px every 4 frames (captured), so the two terrains slide past each other.
  buildBackground() {
    const rom = this.rom;
    const layer = (cls, mapTable) => {
      const tilesId = wordAt(rom, T_BG + cls * 2), palId = wordAt(rom, T_BGPAL + cls * 2), mapId = wordAt(rom, mapTable + cls * 2);
      const px = new Uint8Array(256 * 256);
      if (!tilesId || !palId || !mapId) return { px, pal: [] };
      const tiles = rom.asset(tilesId), map = rom.body(mapId), cache = new Map();
      for (let ty = 0; ty < 32; ty++) {
        for (let tx = 0; tx < 32; tx++) {
          const e = map[(ty * 32 + tx) * 2] | (map[(ty * 32 + tx) * 2 + 1] << 8), n = e & 0x3ff;
          if (!cache.has(n)) cache.set(n, n * 32 + 32 <= tiles.length ? decodeTile(tiles, n * 32, 4) : new Uint8Array(64));
          const t = cache.get(n);
          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) px[(ty * 8 + y) * 256 + tx * 8 + x] = t[(e & 0x8000 ? 7 - y : y) * 8 + (e & 0x4000 ? 7 - x : x)];
          }
        }
      }
      return { px, pal: paletteFromBytes(rom.body(palId)) };
    };
    this.bgL = layer(this.leftSide.cls, T_BGMAP1);
    this.bgR = layer(this.rightSide.cls, T_BGMAP);
    // layer scroll per battle frame: [h, v] for BG1 and BG2
    const motion = (side, dir) => (kindOf(side.type) === 'ship' ? (f) => [dir * (f + 1), 0] : side.type === DOCK ? (f) => [0, -1 - (f >> 2)] : () => [0, 0]);
    this.scrollL = motion(this.leftSide, 1);
    this.scrollR = motion(this.rightSide, -1);
    this.bgFrame = null;
  }

  // The backdrop at battle frame f (BG1 over BG2 over the backdrop colour).
  background(f) {
    const key = [...this.scrollL(f), ...this.scrollR(f)].join();
    if (this.bgFrame && this.bgKey === key) return this.bgFrame;
    const img = new ImageData(W, H), d = img.data;
    const [h1, v1] = this.scrollL(f), [h2, v2] = this.scrollR(f);
    const L = this.bgL, R = this.bgR;
    for (let y = 0; y < H; y++) {
      const r1 = ((y + v1 - 8) & 255) * 256, r2 = ((y + v2 - 8) & 255) * 256;
      for (let x = 0; x < W; x++) {
        let c = L.px[r1 + ((x + h1) & 255)], col;
        if (c) col = L.pal[c];
        else { c = R.px[r2 + ((x + h2 + 128) & 255)]; col = c ? R.pal[c] : BACKDROP; }
        const i = (y * W + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    this.bgFrame = img; this.bgKey = key;
    return img;
  }

  // A side's own weapon slot: the attacker's, or the defender's counter weapon (0 without one).
  slotOf(side) { return side === this.att ? this.att.slot || 0 : this.counter ? side.slot || 0 : 0; }

  buildSprites() {
    const rom = this.rom;
    const obj = new Array(256).fill([0, 0, 0]);
    const put = (row, bytes) => paletteFromBytes(bytes).forEach((c, i) => { obj[row * 16 + i] = c; });
    put(0, rom.body(PALS[kindOf(this.leftSide.type)][0]));
    put(3, rom.body(PALS[kindOf(this.rightSide.type)][1]));
    // a structure's palette is one row; its shots use the capital ships' effect row (captured)
    if (kindOf(this.leftSide.type) === 'struct') put(2, rom.body(PALS.ship[0]).subarray(64, 96));
    if (kindOf(this.rightSide.type) === 'struct') put(5, rom.body(PALS.ship[1]).subarray(64, 96));
    this.obj = obj;
    this.tilesL = tileCache(spriteBank(rom, this.leftSide.type, this.slotOf(this.leftSide), this.rightSide.type));
    this.tilesR = tileCache(spriteBank(rom, this.rightSide.type, this.slotOf(this.rightSide), this.leftSide.type));
  }

  buildActors() {
    const rom = this.rom, slot = this.att.slot || 0;
    const leftFires = this.leftSide === this.att || this.counter;
    const rightFires = this.rightSide === this.att || this.counter;
    // Melee: a small craft attacking with weapon slot 2 charges into the other side's formation;
    // a defender that strikes back charges too (captured choreographies, fightdata.js).
    const dk = kindOf(this.def.type);
    this.melee = slot === 2 && kindOf(this.att.type) === 'craft'
      ? MELEE[dk === 'struct' ? 'dock' : dk === 'ship' ? 'ship' : this.counter ? 'mutual' : 'small'] : null;
    this.mirror = this.att === this.rightSide;   // recordings have the attacker on the left
    this.shooters = this.melee ? { left: false, right: false } : { left: leftFires, right: rightFires };
    const mk = (side, right) => {
      const other = right ? this.leftSide : this.rightSide, fires = right ? rightFires : leftFires;
      const otherFires = right ? leftFires : rightFires, attacker = side === this.att;
      const rec = !this.melee && fires && kindOf(side.type) !== 'craft' ? shipAttack(side.type, side.slot || 0, other.type) : null;
      // the other side's recorded attack brings its own explosions on this side
      const foe = !this.melee && otherFires && kindOf(other.type) !== 'craft' ? shipAttack(other.type, other.slot || 0, side.type) : null;
      if (kindOf(side.type) === 'struct' && !rec) {
        const [x, y, base] = STRUCT[side.type] || [184, 39, 0];
        // captured on the right at (x, y); on the left at x 8 and y + 3..11
        return [{ right, struct: true, x0: right ? x : 8, y0: right ? y : y + (side.type === 52 ? 11 : 3), base, type: side.type,
          hits: Math.min(4, side.hp - side.hpAfter), modelledHits: !this.melee && !foe, seed: 0 }];
      }
      if (kindOf(side.type) !== 'craft') {
        // one hull; losses are shown as explosions over it
        const [hx, parts] = HULLS[side.type] || [HULL_X, HULL];
        // a ship under attack starts rocking when the first blow lands
        const bob = !otherFires ? null : this.melee ? MELEE_BOB : foe && foe.bob !== null ? foe.bob : T_FIRE + variant(other.type).hit;
        return [{ right, ship: true, hx, parts, type: side.type, y0: 0, alive: true, dies: side.hpAfter === 0, seed: 0,
          hits: Math.min(6, side.hp - side.hpAfter), rec, hull: rec || shipHull(rom, side.type, sheetOf(rom, side.type, this.slotOf(side), other.type)), bob,
          modelledHits: !this.melee && !foe && !(rec && rec.R && otherFires) }];   // charging craft bring their own hits
      }
      const n = Math.min(8, side.hp), lost = Math.min(n, side.hp - side.hpAfter);
      const acts = [];
      const v = variant(side.type), foeV = variant(other.type);
      const slots = TURRET_TYPES.has(side.type) ? TURRET_SLOTS : SLOTS;
      // charging machines: a melee, or craft striking back at a ship's melee weapon
      const body = this.melee ? this.melee[attacker ? 'L' : 'R'] : foe && foe.R && fires ? foe.R : null;
      if (body && !this.melee) this.chargeFx = foe.Rfx;
      // when the losses explode: melee every 15 frames from the clash, a recorded ship's
      // salvo all at once, small-craft fire one after another
      for (let i = 0; i < n; i++) {
        const [x, y] = slots[i], dies = i >= n - lost, k = i - (n - lost);
        acts.push({
          right, x0: right ? 223 - x : x, y0: y, alive: true,
          dies,          // last machines in the formation are the losses
          tDie: this.melee ? MELEE_DIE + k * MELEE_DIE_STEP : foe && foe.boom !== null ? foe.boom : T_FIRE + foeV.hit + i * 6,
          turret: TURRET_TYPES.has(side.type),
          seed: (i * 37) % 5, v, hit: foeV.hit,
          body: body && body[i] ? bodyTrack(body[i]) : null,
          still: !!this.melee || !!body || (!!foe && !fires),   // craft that neither charge nor fire stand still
        });
      }
      return acts;
    };
    this.left = mk(this.leftSide, false);
    this.right = mk(this.rightSide, true);
    // long-flight weapons land later, so the scene runs longer
    let end = Math.max(T_END, T_FIRE + Math.max(variant(this.leftSide.type).hit, variant(this.rightSide.type).hit) + 8 * 6 + 40);
    for (const a of [...this.left, ...this.right]) {
      if (a.rec) end = Math.max(end, a.rec.black ?? SHIP_END);
      if (a.dies && a.tDie !== undefined) end = Math.max(end, a.tDie + 60);
    }
    if (this.melee) {
      this.meleeHit = Math.min(...this.melee.fx.map((t) => track(t).t0));
      end = MELEE_END;
    }
    this.end = end;
  }

  step() {
    this.clock = (this.clock || 0) + 1;
    this.frame = this.clock - this.introLen;   // battle frames start after the info screen
    if (this.frame >= this.end) this.done = true;
  }

  // Sound commands for the current frame (js/audio/fightsfx.js, timed like the captures).
  sounds() {
    const out = [], c = this.clock, f = this.frame, I = this.intro;
    if (I && c < this.introLen) {
      if (c === I.T.open + 1 || c === I.T.S || c === I.T.T + 1) out.push(SFX.INFO_PANEL);
      if (I.icons.some((n) => n.t === c) || c === I.T.T + 4) out.push(SFX.INFO_ICON);
      return out;
    }
    const sides = [[this.leftSide, this.left, this.shooters.left], [this.rightSide, this.right, this.shooters.right]];
    const ship = sides.some(([s]) => kindOf(s.type) === 'ship');
    if (f === T_FLYIN + 1) out.push(...(ship ? [SFX.SHIP_FLY_IN, SFX.FLY_IN] : [SFX.FLY_IN]));
    if (f === T_FLYIN + FLY_LEN - 4) out.push(SFX.STOP_SFX);
    for (const [side, acts, fires] of sides) {
      // small craft fire at T_FIRE; capital ships and structures ~41 frames later (captured) or
      // at their recorded first shot; melee strikes when the first blows land
      const rec = acts[0] && acts[0].rec;
      if (this.melee) {
        if (f === this.meleeHit && (side === this.att || (this.melee.R && this.counter))) out.push(fireSfx(side.type, side === this.att ? 2 : side.slot));
      } else if (fires && f === (rec ? rec.fire : T_FIRE + (kindOf(side.type) === 'craft' ? 0 : 41))) out.push(fireSfx(side.type, side.slot));
      for (const a of acts) {
        if (a.dies && !a.ship && f === a.tDie) out.push(SFX.BOOM);
        if (a.ship && a.hits && f === a.bob) out.push(SFX.BOOM);
        if (a.struct && a.hits && f === T_FIRE + variant(side === this.leftSide ? this.rightSide.type : this.leftSide.type).hit) out.push(SFX.BOOM);
      }
    }
    if (f === this.end - 1) out.push(SFX.STOP_SFX);
    return out;
  }

  // Position and pose of an actor at the current frame.
  actorState(a, i) {
    const f = this.frame, dir = a.right ? -1 : 1, v = a.v;
    let x = a.x0, y = a.y0, tile = v.idle, visible = true, flying = false;
    if (f < T_FLYIN + FLY_LEN) {
      const k = Math.max(0, T_FLYIN + FLY_LEN - f);      // frames left to arrive, 1 px/frame
      if (!a.turret) { x = a.x0 - dir * k; y = a.y0 + (a.y0 > 60 ? k * 0.9 : 0); flying = true; }
      tile = v.flyAlt !== undefined && (f & 3) !== 2 ? v.flyAlt : v.fly;
    } else if (f >= T_ADVANCE && f < T_FIRE + 40) {
      const t = f - T_ADVANCE;
      if (v.walk && !a.still) x = a.x0 + dir * Math.min(14, t >> 1);
      const firing = !a.still && v.fire !== null && f >= T_FIRE + a.seed * 4 && f < T_FIRE + a.seed * 4 + 8;
      tile = firing ? v.fire : v.walk && !a.still ? v.walk[(t >> 3) % v.walk.length] : v.idle;
    } else if (f >= T_FIRE + 40) {
      if (v.walk && !a.still) x = a.x0 + dir * 10;
    }
    if (a.turret && f >= T_FLYIN + FLY_LEN && tile !== v.fire) tile = v.idle;   // turrets: no walk poses
    if (a.dies && f >= a.tDie) {
      const t = deathTile(f - a.tDie);
      return t === null ? { visible: false } : { x, y, tile: t, boom: true, visible: true };
    }
    return { x, y, tile, visible, flying };
  }

  // A charging machine in a melee: its recorded body track (fightdata.js), mirrored when the
  // attacker is on the right; rows and flips come with the recording.
  bodyState(a) {
    const f = this.frame, at = (k) => { for (; k >= 0; k--) { const p = clampAt(a.body, k); if (p) return p; } return null; };
    if (a.dies && f >= a.tDie) {
      const p = at(a.tDie), t = deathTile(f - a.tDie);
      if (t === null || !p) return { visible: false };
      return { x: this.mirror ? 223 - p[0] : p[0], y: p[1], tile: t, boom: true, visible: true };
    }
    const p = f < 0 ? null : clampAt(a.body, f);
    return p ? { x: p[0], y: p[1], tile: p[2], fl: p[3], row: p[4], visible: true, rec: true } : { visible: false };
  }

  // One frame of a recorded track; `hold` keeps its last state after it ends.
  drawTrack(img, s, f, mirror, hold = false, dy = 0) {
    const t = track(s), k = f - t.t0;
    if (k < 0 || (k >= t.f.length && !hold)) return;
    const e = t.f[Math.min(k, t.f.length - 1)];
    if (e) this.drawRec(img, e[0], e[1] + dy, e[2], e[3], t.size, t.row, mirror);
  }

  // A recorded sprite: rows 0-2 belong to the attacker, 3-5 to the defender; mirrored, the
  // attacker's sprites move to the right side (x' = 255 - size - x, flipped, rows + 3).
  drawRec(img, x, y, tile, fl, size, row, mirror) {
    const right = (row >= 3) !== mirror;
    this.drawSprite(img, right ? this.tilesR : this.tilesL, (right ? 256 : 0) + tile, mirror ? 255 - size - x : x, y, size,
      mirror ? !(fl & 1) : !!(fl & 1), mirror ? (row + 3) % 6 : row, !!(fl & 2));
  }

  // Thruster flames while flying in: 8x8 sprites at the craft's rear edge (captured offsets).
  drawFlames(img, a, s, tiles, off, flip, row) {
    const v = a.v, f = this.frame, rear = a.right ? 24 : 0;
    if (v.flame && (f & 3) !== 2) {
      this.drawSprite(img, tiles, off + v.flame[0], Math.round(s.x) + rear, Math.round(s.y) + 8, 8, flip, row);
      this.drawSprite(img, tiles, off + v.flame[1], Math.round(s.x) + rear, Math.round(s.y) + 16, 8, flip, row);
    }
    if (v.flame1 && (f & 1)) this.drawSprite(img, tiles, off + v.flame1[0], Math.round(s.x) + (a.right ? 24 - v.flame1[1] : v.flame1[1]), Math.round(s.y) + 11, 8, flip, row);
  }

  // Projectiles of one firing machine. Positions follow the captured paths (see VARIANT).
  drawShots(img, a, i, s, tiles, off, flip, row) {
    const f = this.frame, v = a.v, dir = a.right ? -1 : 1, t0 = T_FIRE + a.seed * 4;
    const shot = (x, y, k = 0) => {
      x = Math.round(x); y = Math.round(y);
      if (x <= -8 || x >= W || y <= -16 || y >= H) return;
      const tl = v.tall ? off + v.shot + ((k >> 2) & 1) : off + v.shot;
      this.drawSprite(img, tiles, tl, x, y, 8, flip, row + 2);
      if (v.tall) this.drawSprite(img, tiles, tl + 16, x, y + 8, 8, flip, row + 2);
    };
    const mx = s.x + (a.right ? -4 : 20), my = s.y + 4;            // launcher
    const foes = a.right ? this.left : this.right;
    const target = () => { const j = foes.length ? i % foes.length : 0, e = foes[j]; return e ? [e.x0 + 12, e.y0 + 12] : [a.right ? 40 : 184, s.y]; };
    if (v.path === 'lob') {
      const d = f - t0;
      if (d >= 0 && d < 40) { shot(mx + dir * 2 * d, my - d, d); shot(mx + dir * (5 + 2 * d), my + 8 - d, d); }
      const e = f - (t0 + 56), [tx, ty] = target();
      if (e >= 0 && e <= 26) { const r = 26 - e; shot(tx - dir * 4 * r, ty + 2 * r, e); shot(tx + dir * 5 - dir * 4 * r, ty + 8 + 2 * r, e); }
    } else if (v.path === 'home') {
      const d = f - t0, T = v.hit - 4;
      if (d >= 0 && d <= T) {
        const [tx, ty] = target(), u = d / T, spread = ((i % 3) - 1) * 36;
        const cx = mx + dir * 48, cy = my + spread;              // quadratic curve via (cx, cy)
        shot((1 - u) * (1 - u) * mx + 2 * u * (1 - u) * cx + u * u * tx, (1 - u) * (1 - u) * my + 2 * u * (1 - u) * cy + u * u * ty, d);
      }
    } else if (v.path === 'drop') {
      const d = f - t0, mid = a.right ? 100 : 123;
      const x = mx + dir * 4 * d;
      if (d >= 0 && (a.right ? x > mid : x < mid)) shot(x, my, d);
      const e = f - (t0 + v.hit - 21), [tx, ty] = target();
      if (e >= 0 && e <= 21) { const r = 21 - e; shot(tx - dir * 3 * r, ty - 2 * r, e); }
    } else if (f >= t0 && f < t0 + 60) {
      const d = (f - t0) * v.speed;
      shot(s.x + (a.right ? -12 : 52) + dir * d, s.y + 11);
    }
  }

  // Capital ship: the recorded hull and attack of its type (fightdata.js) when there is one,
  // else the modelled hull and shots below. A recording is mirrored for the right side; the
  // modelled parts are laid out in left-side coordinates and mirrored (x' = 223 - x).
  drawShip(img, a, tiles, off, row, f) {
    const dir = a.right ? -1 : 1, X = (x) => (a.right ? 223 - x : x);
    const dy = a.bob !== null && f >= a.bob ? bobAt(f - a.bob) : 0;
    // left-side x of the modelled hull: glides in at 1 px/frame, settling at frame 98
    const lx = a.hx - Math.max(0, HULL_ARRIVE - f);
    if (a.hull) for (const t of a.hull.hull) this.drawTrack(img, t, f, a.right, true, dy);
    else for (const [dx, y, t, fl] of a.parts) this.drawSprite(img, tiles, off + t, X(lx + dx), y + dy, 32, a.right ? !(fl & 1) : !!(fl & 1), row, !!(fl & 2));
    if (a.rec) {
      // recorded shots; the explosions on a ship or structure only when it is damaged
      const foe = a.right ? this.leftSide : this.rightSide;
      for (const t of a.rec.fx) this.drawTrack(img, t, f, a.right);
      if (kindOf(foe.type) !== 'craft' && foe.hp > foe.hpAfter) for (const t of a.rec.hit) this.drawTrack(img, t, f, a.right);
    } else this.drawShipShots(img, a, tiles, off, row, f, lx, dir, X);
    // hits on the hull from attackers without a recording
    for (let k = 0; k < (a.modelledHits ? a.hits : 0); k++) {
      const t0 = (a.bob ?? HULL_FLY + 74) + k * 6;
      if (f >= t0 && f < t0 + 30) this.drawSprite(img, tiles, off + BOOM[Math.floor((f - t0) / 10)], X(lx + (k % 2) * 28), 12 + k * 18, 32, false, row + 2);
    }
  }

  // Modelled capital-ship fire (types and slots without a recording), and hits on the hull.
  drawShipShots(img, a, tiles, off, row, f, lx, dir, X) {
    const fires = a.right ? this.shooters.right : this.shooters.left;
    const tf = HULL_FLY + 40, sw = SHIP_SHOTS[a.type];
    const shot = (tile, x, y) => this.drawSprite(img, tiles, off + tile, Math.round(a.right ? 247 - x : x), Math.round(y), 8, a.right, row + 2);   // 8x8 mirror
    if (fires && sw && sw.path === 'fan') {
      const d = f - tf - 7;
      if (d >= 0 && d < 30) for (const dy of sw.dys) shot(sw.shot, lx + sw.at[0] + sw.speed * d, sw.at[1] + dy * d);
    } else if (fires && sw && sw.path === 'home') {
      const foes = a.right ? this.left : this.right, T = 36;
      for (let k = 0; k < 4; k++) {
        const d = f - tf - 8 - k * 4, e = foes[k % Math.max(1, foes.length)];
        if (d < 0 || d > T || !e) continue;
        const u = d / T, sx = lx + sw.at[0], sy = sw.at[1], cy = sy + (k - 1.5) * 50;
        const tx = (a.right ? 223 - e.x0 : e.x0) + 12, ty = e.y0 + 12;   // target in left-side coordinates
        shot(sw.shot, (1 - u) * (1 - u) * sx + 2 * u * (1 - u) * (sx + 40) + u * u * tx, (1 - u) * (1 - u) * sy + 2 * u * (1 - u) * cy + u * u * ty);
      }
    } else if (fires) {
      if (f >= tf && f < tf + 10) for (const py of PORTS) shot(SHOT, lx + 28, py);
      if (f >= tf + 10 && f < tf + 30) {
        const d = (f - tf - 10) * SHELL_SPEED;
        for (let k = 0; k < 4; k++) shot(SHELL, lx + 64 + d, 27 + k * 24);
      }
    }
  }

  drawSprite(img, tiles, base, x, y, size, flip, palRow, vflip = false) {
    const tpr = 16; // tiles per sheet row
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const sx = flip ? size - 1 - px : px, sy = vflip ? size - 1 - py : py;
        const t = base + (sy >> 3) * tpr + (sx >> 3);
        const c = tiles(t)[(sy & 7) * 8 + (sx & 7)];
        if (!c) continue;
        const X = x + px, Y = y + py;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const col = this.obj[palRow * 16 + c], i = (Y * W + X) * 4;
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2];
      }
    }
  }

  render(ctx) {
    if (this.intro && this.frame < 0) { this.intro.render(ctx, this.clock || 0); return; }
    const f = this.frame;
    const img = new ImageData(new Uint8ClampedArray(this.background(Math.max(0, f)).data), W, H);
    for (const [acts, tiles, row, flip, off] of [[this.left, this.tilesL, 0, true, 0], [this.right, this.tilesR, 3, false, 256]]) {
      acts.forEach((a, i) => {
        if (a.ship) { this.drawShip(img, a, tiles, off, row, f); return; }
        if (a.struct) {
          // static two-sprite object; captured with h-flip on the right side
          const fl = a.right;
          this.drawSprite(img, tiles, off + a.base + (fl ? 4 : 0), a.x0, a.y0, 32, fl, row);
          this.drawSprite(img, tiles, off + a.base + (fl ? 0 : 4), a.x0 + 32, a.y0, 32, fl, row);
          const sw = STRUCT_SHOTS[a.type], ts = T_FIRE + 52;
          if (sw && (a.right ? this.shooters.right : this.shooters.left) && f >= ts && f < ts + 30) {
            const x = a.right ? a.x0 + 64 - sw.at[0] - (f - ts) * sw.speed : a.x0 + sw.at[0] + (f - ts) * sw.speed;
            this.drawSprite(img, tiles, off + sw.shot, Math.round(x), a.y0 + sw.at[1], 8, a.right, row + 2);
          }
          for (let k = 0; k < (a.modelledHits ? a.hits : 0); k++) {
            const t0 = T_FIRE + 30 + k * 8;
            if (f >= t0 && f < t0 + 30) this.drawSprite(img, tiles, off + BOOM[Math.floor((f - t0) / 10)], a.x0 + k * 12, a.y0 - 4, 32, false, row + 2);
          }
          return;
        }
        const s = a.body ? this.bodyState(a) : this.actorState(a, i);
        if (!s.visible) return;
        if (s.rec) { this.drawRec(img, s.x, s.y, s.tile, s.fl, 32, s.row, this.mirror); return; }
        // a death explodes in the other side's effect palette
        if (s.boom) this.drawSprite(img, a.right ? this.tilesL : this.tilesR, (a.right ? 0 : 256) + s.tile, Math.round(s.x), Math.round(s.y), 32, !a.right, a.right ? 2 : 5);
        else this.drawSprite(img, tiles, off + s.tile, Math.round(s.x), Math.round(s.y), 32, flip, row);
        if (s.flying) this.drawFlames(img, a, s, tiles, off, flip, row);
        const fires = a.right ? this.shooters.right : this.shooters.left;
        if (fires && !s.boom) this.drawShots(img, a, i, s, tiles, off, flip, row);
      });
    }
    for (const t of this.melee ? this.melee.fx : this.chargeFx || []) this.drawTrack(img, t, f, this.mirror);
    // the battle starts at full brightness and fades out over its last frames (captured)
    const fade = Math.min(1, (this.end - f) / FADE);
    if (fade < 1) for (let i = 0; i < img.data.length; i += 4) { img.data[i] *= fade; img.data[i + 1] *= fade; img.data[i + 2] *= fade; }
    ctx.putImageData(img, 0, 0);
  }
}
