// Unit type tables (bank $01), decoded from the combat, movement and spawn code:
//   damage  $01:A976-AC3C   movement flood fill $01:B605   weapon select $01:853A, $01:9B07
import { lorom } from './rom.js';

export const UNIT_TYPES = 58;

const T = {
  gfx: 0x01ee2c,      // map icon index
  name: 0x01ee66,     // 8 bytes, JIS X 0201 half-width katakana
  code: 0x01f036,     // 8 bytes, ASCII model code
  cat: 0x01f206,      // high nibble: category (copied to unit $1B5B); low nibble: starting level
  move: 0x01f240,     // movement points
  value: 0x01f27a,    // points per HP of damage dealt to it (battle statistics)
  wMode: 0x01f2b4,    // [4] weapon attack mode + 1 (0 = empty slot)
  wMin: 0x01f39c,     // [4] minimum range
  wMax: 0x01f484,     // [4] maximum range
  moveOrFire: 0x01f56c, // 1: using an indirect weapon (min range >= 2) forbids moving that turn
  hp: 0x01f676,       // maximum HP
  wPower: 0x01f6b0,   // [4] weapon power
  evasion: 0x01f798,  // damage reduction /128
};

export const LEVEL_BONUS = 0x01ac3d; // damage x table[level]/16

// JIS X 0201 half-width katakana -> Unicode (NFKC folds to full-width and joins voicing marks).
export function decodeKana(bytes) {
  let s = '';
  for (const b of bytes) {
    if (b === 0) break;
    s += b >= 0xa1 && b <= 0xdf ? String.fromCharCode(0xff61 + b - 0xa1) : String.fromCharCode(b);
  }
  return s.normalize('NFKC').trim();
}

export function unitType(rom, t) {
  const b = (addr, i = t) => rom.byteAt(addr + i);
  const str = (addr) => rom.bytes.subarray(lorom(addr) + t * 8, lorom(addr) + t * 8 + 8);
  const weapons = [];
  for (let w = 0; w < 4; w++) {
    const mode = b(T.wMode, t * 4 + w);
    weapons.push(mode ? {
      slot: w, mode: mode - 1, min: b(T.wMin, t * 4 + w), max: b(T.wMax, t * 4 + w), power: b(T.wPower, t * 4 + w),
    } : null);
  }
  return {
    type: t,
    name: decodeKana(str(T.name)),
    code: String.fromCharCode(...str(T.code)).replace(/\0.*$/, '').trim(),
    gfx: b(T.gfx),
    category: b(T.cat) >> 4,
    startLevel: b(T.cat) & 15,
    move: b(T.move),
    hp: b(T.hp),
    evasion: b(T.evasion),
    value: b(T.value),
    moveOrFire: !!b(T.moveOrFire),
    weapons,
  };
}

export function allUnitTypes(rom) {
  const list = [];
  for (let t = 0; t < UNIT_TYPES; t++) list.push(unitType(rom, t));
  // Consecutive entries sharing a name are the two forms of a transforming unit
  // (the game switches form by incrementing the type, $01:A01D).
  for (let t = 0; t < UNIT_TYPES - 1; t++) {
    if (list[t].name === list[t + 1].name && !list[t].formOf) {
      list[t].form = 1; list[t + 1].form = 2;
      list[t + 1].formOf = t; list[t].otherForm = t + 1;
    }
  }
  return list;
}

export function levelBonus(rom) {
  return Array.from({ length: 10 }, (_, i) => rom.byteAt(LEVEL_BONUS + i));
}
