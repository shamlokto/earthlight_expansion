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
  b.blasted = [];
  if (b.info.custom) return;   // expansion maps have no ROM event tables
  // afterburner cells: (x, y) pairs until 0, list per map
  let a = 0x020000 | rom.byteAt(BURNER_LISTS + m * 2) | (rom.byteAt(BURNER_LISTS + m * 2 + 1) << 8);
  for (let x = rom.byteAt(a); x; x = rom.byteAt(a)) {
    const u = b.unitAt(x, rom.byteAt(a + 1));
    if (u) u.burner = true;
    a += 2;
  }
}

export const burnerMove = (u) => (u.burner ? BURNER_MOVE : null);
export function detachBurner(b, u) { u.burner = false; }

// Cannons that will fire at the next phase change, with their lanes.
export function liveCannons(b) {
  return (b.cannons || []).filter((c) => c.tower !== null && b.units[c.tower].hp > 0);
}
// A cannon's lane: its column (or `cols`, a band), from its row down. An aimed cannon (the colony's,
// `aim`: mission.cannons) only ever shoots at Eden's machines, so it is a lane only for army 0.
const laneHas = (c, x, y) => (c.cols ? c.cols.includes(x) : c.x === x) && y >= c.y && y < CANNON_ROWS;
export function inLane(b, x, y, army) {
  return liveCannons(b).some((c) => laneHas(c, x, y) && (!c.aim || army === undefined || army === 0));
}

// The colony's aimed cannon (mission.cannons `aim`): it fires once a round, as Eden's phase ends
// (whatever Eden left standing in the band), and only when something of Eden's is there; each hit
// takes `aim` HP or half the machine's HP, whichever is more (a light machine is wrecked, a heavy one
// crippled; two stops kill anything). Cargo dies with a carrier.
function aimedHit(b, u, c) {
  const dmg = Math.max(c.aim, Math.ceil(b.type(u).hp / 2));
  u.hp = Math.max(0, u.hp - dmg);
  if (!u.hp) for (const k of b.cargo(u)) k.hp = 0;
}

// Fires what is armed; returns { cannons, hit, say? } or null when nothing fired. The ROM's cannons
// (and the expansion campaign's) destroy every unit in their lanes, of either army, at every phase
// change; an aimed one (above) stays silent with nobody of Eden's in its band.
export function fireCannons(b) {
  const live = liveCannons(b);
  if (!live.length) return null;
  const fired = [], hit = [];
  let say = null;
  for (const c of live) {
    if (c.aim) {
      if (b.army !== 1) continue;   // Eden's phase has just ended
      const in_ = b.alive().filter((u) => u.eden && u.army === 0 && laneHas(c, u.x, u.y));
      if (!in_.length) continue;
      for (const u of in_) aimedHit(b, u, c);
      fired.push(c); hit.push(...in_); say = say || c.say || 'The fortress cannon fires!';
      continue;
    }
    fired.push(c);
    for (const u of b.alive()) if (laneHas(c, u.x, u.y) && !hit.includes(u)) { destroy(b, u); hit.push(u); }
  }
  if (!fired.length) return null;
  return say ? { cannons: fired, hit, say } : { cannons: fired, hit };
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
  const cells = blastArea(b, x, y);
  const fight = blastFight(b, u, x, y);
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
  return { att: u, x, y, cells, hit, fight };
}

// The seven hexes a Decimator fired at (x, y) clears ($01:B942 ring order: the centre, then
// SW, NW, N, NE, SE, S), cut to the playfield.
export function blastArea(b, x, y) {
  return [[x, y], ...hexRing(x, y)].filter(([cx, cy]) => b.inBounds(cx, cy));
}

// In the original the Decimator is an attack on a unit: the fight scene plays first (the
// Abaddon's slot 3 launches its warhead), then $01:A064 skips the normal defeat handling and
// $02:E05E detonates it on the map. This is that fight, for the fight scene only: worked out
// before the blast, without the random term (no counter: the target is gone either way), so it
// changes nothing. null when the hex is empty (the remake lets the Decimator clear any hex).
function blastFight(b, u, x, y) {
  const v = b.unitAt(x, y), w = b.type(u).weapons[DECIMATOR_SLOT];
  if (!v || !w) return null;
  const left = Math.max(0, Math.floor((v.hp * 128 - b.damage(u, v, w)) / 128));
  return { turn: b.turn, att: u, def: v, w, cw: null, before: [u.hp, v.hp], after: [u.hp, left], info: b.fightInfo(u, v, w), levels: [u.level, v.level], cls: [b.cls(u.x, u.y), b.cls(x, y)], nuke: true };
}
