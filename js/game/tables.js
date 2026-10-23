// The rule tables a battle reads: terrain, movement, combat, the info screen's display values
// and the AI's per-type values. A Battle takes them as opts.tables: the base game reads them
// from the ROM (romTables, the default), the expansion from its own data files
// (js/expansion/data.js, dataTables). Both expose the same methods:
//
//   terrain(id)                 -> { type, cls }   terrain id (map header byte 80+v) -> type, class
//   moveCost(category, cls)     -> 0 (blocked) | 'stop' (uses all remaining movement) | cost
//   defence(cls, mode)          combat damage reduction /128 ($01:D042)
//   displayDefence(cls, mode)   terrain % shown in windows and the info screen ($01:D002)
//   targetable(cls, mode)       a unit on this class can be hit by this weapon mode ($01:D0C2)
//   levelBonus(level)           damage x bonus/16 for levels 0-15 ($01:AC3D)
//   catByte(type)               category << 4 | starting level ($01:F206)
//   infoAttack(type, slot)      attack shown on the info screen ($01:F7D2)
//   infoDefence(type)           defence shown on the info screen ($01:F8BA)
//   minRange(type, slot)        weapon minimum range ($01:F39C)
//   value(type)                 points per HP of damage ($01:F27A)
//   aiValue(type)               the AI's target value ($02:8AB8)
//   hasWeapon(type, slot)       the slot has a weapon ($01:F2B4)
const TYPE_OF_ID = 0x01ce7e, CLASS_OF_TYPE = 0x01cece, MOVE_COST = 0x01cf12;
const D002 = 0x01d002, D042 = 0x01d042, D0C2 = 0x01d0c2, LEVEL = 0x01ac3d;
const F206 = 0x01f206, F7D2 = 0x01f7d2, F8BA = 0x01f8ba, F39C = 0x01f39c, F27A = 0x01f27a, F2B4 = 0x01f2b4;
const TYPE_VALUE = 0x028ab8;

const cache = new WeakMap();
export function romTables(rom) {
  if (cache.has(rom)) return cache.get(rom);
  const b = (a) => rom.byteAt(a);
  const t = {
    terrain(id) { const type = b(TYPE_OF_ID + id); return { type, cls: b(CLASS_OF_TYPE + type) }; },
    moveCost(category, cls) {
      if (category < 1) return 0;
      const v = b(MOVE_COST + (category - 1) * 16 + cls);
      return v === 0xff ? 'stop' : v;
    },
    defence: (cls, mode) => b(D042 + cls * 4 + mode),
    displayDefence: (cls, mode) => b(D002 + cls * 4 + mode),
    targetable: (cls, mode) => !!b(D0C2 + cls * 4 + mode),
    levelBonus: (level) => b(LEVEL + level),
    catByte: (type) => b(F206 + type),
    infoAttack: (type, slot) => b(F7D2 + type * 4 + slot),
    infoDefence: (type) => b(F8BA + type),
    minRange: (type, slot) => b(F39C + type * 4 + slot),
    value: (type) => b(F27A + type),
    aiValue: (type) => b(TYPE_VALUE + type),
    hasWeapon: (type, slot) => !!b(F2B4 + type * 4 + slot),
  };
  cache.set(rom, t);
  return t;
}

// Tables from plain data (js/expansion/data/*.json), same interface.
export function dataTables({ units, terrain, rules }) {
  const byType = new Map(units.map((u) => [u.type, u]));
  const U = (type) => byType.get(type);
  return {
    terrain(id) { const type = terrain.ids[id] ?? 0; return { type, cls: terrain.types[type].cls }; },
    moveCost(category, cls) { if (category < 1) return 0; const v = terrain.classes[cls].moveCost[category - 1]; return v; },
    defence: (cls, mode) => terrain.classes[cls].defence[mode],
    displayDefence: (cls, mode) => terrain.classes[cls].display[mode],
    targetable: (cls, mode) => terrain.classes[cls].targetable[mode],
    levelBonus: (level) => rules.levelBonus[level],
    catByte: (type) => (U(type).category << 4) | U(type).startLevel,
    infoAttack: (type, slot) => U(type).info.attack[slot],
    infoDefence: (type) => U(type).info.defence,
    minRange: (type, slot) => U(type).info.minRange[slot],
    value: (type) => U(type).value,
    aiValue: (type) => U(type).aiValue,
    hasWeapon: (type, slot) => !!U(type).weapons[slot],
  };
}
