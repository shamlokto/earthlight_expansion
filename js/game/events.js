// Map events, read from the game code (bank $02 map-event routines):
//
//   Buccaneer cannon  $02:8C88 / $02:8CC3 / $02:8E1C  (map 19)
//     At map start three cannons are armed, one per Adzam control tower: columns $02:8ED0
//     (21, 22, 23), firing from row $02:8ED3 (6) down. After every phase change
//     ($01:9E65) each cannon whose tower still stands fires straight down its column and
//     destroys every unit in it, of either army (carriers and Crabs lose their cargo too,
//     $01:9537). Losing a tower ($01:A856 -> $02:8CAF) disarms its cannon. The game's AI
//     keeps out of the lanes ($01:9340).
//   Afterburner       $02:90AD, cell lists $02:90F2[map] (maps 16, 17, 26, 28)
//     Units starting on a listed cell get flag $04 ($1AD1): movement 10 instead of their own
//     ($01:9694). Command $0D ("detach", $01:9D50 -> $02:8F08) drops the module; the window
//     says the fuel is spent (label 89). Units with a module can't board a carrier ($01:A576).
//   Quantum Decimator $01:A064 -> $02:E05E / $02:E10E
//     When an Abaddon (MSP-21, type 43) fires slot 3, the target hex and its six neighbours
//     ($01:B942 ring) are cleared to open space and every unit on them is destroyed. This is
//     how the Union blasts paths through asteroids (map 25) and minefields (map 21).
//   Mines (maps 11, 21): Wisp and Pandora are ordinary units (category 15, no movement);
//     they block the way until destroyed.
//   Comet (map 23): the comet is part of the map (Comet Tail / Comet Body terrain through
//     Fortress Sturgeon); no code moves it. The remake shows its alert (labels 92, 93) when
//     the battle opens.
import { hexRing } from './rules.js';

export const BUCCANEER_MAP = 19, COMET_MAP = 23;
const CANNON_X = 0x028ed0, CANNON_Y = 0x028ed3, CANNON_ROWS = 0x29;   // $02:8E40: rows $29 - y
const BURNER_LISTS = 0x0290f2, BURNER_MOVE = 10;
const ADZAM = 57, ABADDON = 43, DECIMATOR_SLOT = 3;
export const LABEL = { burner: 89, cannonCount: 90, cannon: 91, cometAlert: 92, comet: 93 };

export function setupEvents(b) {
  const rom = b.rom, m = b.info.index;
  b.cannons = [];
  if (m === BUCCANEER_MAP) {
    for (let i = 0; i < 3; i++) {
      const x = rom.byteAt(CANNON_X + i), y = rom.byteAt(CANNON_Y + i);
      const tower = b.units.find((u) => u.type === ADZAM && u.x === x) || null;
      b.cannons.push({ x, y, tower: tower ? tower.id : null });
    }
  }
  // afterburner cells: (x, y) pairs until 0, list per map (none on expansion maps)
  let a = 0x020000 | rom.byteAt(BURNER_LISTS + m * 2) | (rom.byteAt(BURNER_LISTS + m * 2 + 1) << 8);
  for (let x = b.info.custom ? 0 : rom.byteAt(a); x; x = rom.byteAt(a)) {
    const u = b.unitAt(x, rom.byteAt(a + 1));
    if (u) u.burner = true;
    a += 2;
  }
  b.blasted = [];
}

export const burnerMove = (u) => (u.burner ? BURNER_MOVE : null);
export function detachBurner(b, u) { u.burner = false; }

// Cannons that will fire at the next phase change, with their lanes.
export function liveCannons(b) {
  return (b.cannons || []).filter((c) => c.tower !== null && b.units[c.tower].hp > 0);
}
export function inLane(b, x, y) {
  return liveCannons(b).some((c) => c.x === x && y >= c.y && y < CANNON_ROWS);
}

// Destroys what is in the lanes; returns { cannons, hit } or null when nothing fired.
export function fireCannons(b) {
  const live = liveCannons(b);
  if (!live.length) return null;
  const hit = b.alive().filter((u) => live.some((c) => c.x === u.x && u.y >= c.y && u.y < CANNON_ROWS));
  for (const u of hit) destroy(b, u);
  return { cannons: live, hit };
}

function destroy(b, u) {
  u.hp = 0;
  for (const c of b.cargo(u)) c.hp = 0;
}

// The Decimator: hexes in range of slot 3, whatever is on them.
export function decimator(b, u) {
  const w = b.type(u).weapons[DECIMATOR_SLOT];
  if (u.type !== ABADDON || !w || u.acted || u.carrier || (u.moved && b.type(u).moveOrFire)) return [];
  const out = [];
  for (let y = 1; y <= b.info.rows; y++) {
    for (let x = 1; x < b.info.cols; x++) {
      const d = b.distance(u, { x, y });
      if (d >= w.min && d <= w.max) out.push([x, y]);
    }
  }
  return out;
}

// Fires the Decimator at (x, y): the hex and its ring become open space (cell 0), units
// there are destroyed, and the Abaddon switches to its spent form like any bomb attack.
export function blast(b, u, x, y) {
  const cells = [[x, y], ...hexRing(x, y)].filter(([cx, cy]) => b.inBounds(cx, cy));
  const hit = [];
  for (const [cx, cy] of cells) {
    const v = b.unitAt(cx, cy);
    if (v) { destroy(b, v); hit.push(v); }
    b.grid[cy * 62 + cx] = 0;
    b.blasted.push([cx, cy]);
  }
  b.spend(u, b.type(u).weapons[DECIMATOR_SLOT]);
  b.result = null;
  b.winner();
  return { att: u, cells, hit };
}
