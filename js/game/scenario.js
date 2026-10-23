// Everything a map starts with and everything that arrives later, read from the game's
// own tables (all spawned through $01:E98D: type, flags, x, y, carrier):
//   deployment   asset $02:E47D[map]        count, (army<<7 | type, x, y)*      ($01:E88D)
//   extras       $01:E7C4[map] -> bank $01  (army<<7 | type, x, y)*, 0          ($01:E78E)
//   fortresses   $01:B52E + map*6           2 x (army<<7 | type, x, y), 0 = none ($01:B4F3)
//   dock cargo   $02:9523[map] -> bank $02  entries until 0                      ($02:93C1)
//                  flags|x, y, types.., FF   new dock (type 52) at (x, y) with cargo
//                  $C0|x,   y, types.., FF   cargo for the unit already at (x, y)
//   arrivals     $02:9E96[map] -> bank $02  events until FF                      ($02:9B70)
//                  key (turn | $80 for army B), screen (x | y<<4),
//                  then (flags | type, x, y [, cargo.. FF for carriers])*, FF
//   warp-in      $02:CEAC[map] = event set (FF = none); unit types $02:CF31 + set*4;
//                8 object scripts per set at $02:CF45 + set*16 (interpreter $02:C9A7):
//                first byte army<<7 | type index, then 10 n wait, 20 x y place,
//                30-35 one hex step (SW, NW, N, NE, SE, S), 40-47 face, 50-54 effect,
//                60-65 n / 68-6D n animations, 70 spawn the unit here, E0/F0/80 end.
//                Played at the start of the first turn (HAMILTON's enemies, maps 0/5/11/16).
// Flag bit 7 is army B; bit 6 is kept as `flag40` (meaning not settled).
import { deployment } from '../maps.js';
import { hexRing } from './rules.js';

const WARP_SET = 0x02ceac, WARP_TYPES = 0x02cf31, WARP_SCRIPTS = 0x02cf45;
const EXTRAS = 0x01e7c4, FORTS = 0x01b52e, CARGO = 0x029523, ARRIVALS = 0x029e96;
const CAT = 0x01f206;
export const DOCK = 0x34;
const isCarrier = (rom, type) => rom.byteAt(CAT + type) >> 4 === 1;   // category 1: carriers

function bank(rom, b, ptrTable, m) { return (b << 16) | rom.wordAt(ptrTable + m * 2); }

export function scenario(rom, info) {
  const m = info.index, units = [];
  const add = (type, army, x, y, extra = {}) => { const u = { type, army, x, y, ...extra }; units.push(u); return u; };
  for (const d of deployment(rom, info)) add(d.type, d.army, d.x, d.y);
  for (let a = bank(rom, 1, EXTRAS, m); rom.byteAt(a); a += 3) {
    const t = rom.byteAt(a);
    add(t & 0x3f, t >> 7, rom.byteAt(a + 1), rom.byteAt(a + 2));
  }
  for (let k = 0; k < 2; k++) {
    const a = FORTS + m * 6 + k * 3, t = rom.byteAt(a);
    if (t) add(t & 0x3f, t >> 7, rom.byteAt(a + 1), rom.byteAt(a + 2));
  }
  // dock cargo: units that start inside a dock or carrier
  for (let a = bank(rom, 2, CARGO, m); rom.byteAt(a);) {
    const f = rom.byteAt(a), x = f & 0x3f, y = rom.byteAt(a + 1);
    a += 2;
    let host;
    if ((f & 0xc0) === 0xc0) host = units.find((u) => u.x === x && u.y === y && !u.carrier);
    else host = add(DOCK, f >> 7, x, y, { flag40: !!(f & 0x40) });
    for (; rom.byteAt(a) !== 0xff; a++) {
      const t = rom.byteAt(a) & 0x7f;
      if (host) add(t, host.army, host.x, host.y, { carrier: host });
    }
    a++;
  }
  for (const w of warpIn(rom, m)) add(w.type, w.army, w.x, w.y);
  return { units, arrivals: arrivals(rom, m) };
}

// Units brought in by the opening event of maps 0, 5, 11 and 16 (checked on HAMILTON:
// Mars at (10,2) and (9,1), Talos at (11,3), as in the emulator).
export function warpIn(rom, m) {
  const set = rom.byteAt(WARP_SET + m), out = [];
  if (set & 0x80) return out;
  for (let k = 0; k < 8; k++) {
    let a = 0x020000 | rom.wordAt(WARP_SCRIPTS + set * 16 + k * 2);
    const head = rom.byteAt(a++);
    let x = 0, y = 0;
    for (let n = 0; n < 64; n++) {
      const op = rom.byteAt(a++);
      if (op === 0x10 || (op >= 0x60 && op <= 0x6d)) a++;
      else if (op === 0x20) { x = rom.byteAt(a); y = rom.byteAt(a + 1); a += 2; }
      else if (op >= 0x30 && op <= 0x35) [x, y] = hexRing(x, y)[op & 15];
      else if (op === 0x70) out.push({ type: rom.byteAt(WARP_TYPES + set * 4 + (head & 0x7f)), army: head >> 7, x, y });
      else if (op === 0xe0 || op === 0xf0 || op === 0x80) break;
    }
  }
  return out;
}

export function arrivals(rom, m) {
  const out = [];
  for (let a = bank(rom, 2, ARRIVALS, m); rom.byteAt(a) !== 0xff;) {
    const key = rom.byteAt(a), screen = rom.byteAt(a + 1), ev = { turn: key & 0x7f, army: key >> 7, screen: [screen & 15, screen >> 4], units: [] };
    a += 2;
    while (rom.byteAt(a) !== 0xff) {
      const f = rom.byteAt(a), u = { type: f & 0x3f, flag40: !!(f & 0x40), x: rom.byteAt(a + 1), y: rom.byteAt(a + 2), cargo: [] };
      a += 3;
      if (isCarrier(rom, u.type)) { for (; rom.byteAt(a) !== 0xff; a++) u.cargo.push(rom.byteAt(a) & 0x7f); a++; }
      ev.units.push(u);
    }
    a++;
    out.push(ev);
  }
  return out;
}
