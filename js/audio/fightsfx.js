// Fight-scene sound effects. The fight engine's object scripts send these through $03:A374
// (script byte -> $0A51), so they were captured by running real fights in the emulator
// (research/spc_fightsfx.py: every unit type attacking a Mars with weapon slot 1) and logging
// $0A51. Timings are in fight frames; see docs/FORMATS.md "Sound".

export const SFX = {
  STOP_SFX: 0x03,     // keys off the effect voices (end of fly-in, end of fight)
  INFO_ICON: 0x14,    // info screen: each unit icon
  INFO_PANEL: 0x15,   // info screen: a panel opens
  SHOT: 0x22,         // default weapon (Mars-type beam rifles)
  BOOM: 0x3F,         // a machine explodes
  FLY_IN: 0x39,       // both formations fly in
  SHIP_FLY_IN: 0x3C,  // ... with a capital ship in the fight
};

// Weapon sound per unit type when it differs from SFX.SHOT (captured with slot 1).
export const FIRE_SFX = {
  1: 0x23, 3: 0x2F, 4: 0x23, 5: 0x23, 9: 0x23, 12: 0x2F, 13: 0x2F, 14: 0x2E, 15: 0x23, 16: 0x24,
  17: 0x2F, 19: 0x2F, 20: 0x2F, 21: 0x2F, 22: 0x2F, 23: 0x2B, 24: 0x24, 26: 0x23, 27: 0x23,
  28: 0x2F, 29: 0x2F, 30: 0x2E, 31: 0x2F, 33: 0x30, 34: 0x2E, 35: 0x2F, 36: 0x30, 37: 0x30,
  38: 0x28, 39: 0x30, 40: 0x2E, 42: 0x30, 43: 0x30, 44: 0x30, 49: 0x30, 50: 0x30, 51: 0x2F, 52: 0x2E,
};

export const fireSfx = (type) => FIRE_SFX[type] ?? SFX.SHOT;

// Labels for the sound lab.
export const FIGHT_SFX_NAMES = {
  0x03: 'stop effects (fight)', 0x14: 'fight info screen: icon', 0x15: 'fight info screen: panel',
  0x22: 'fight weapon (default, e.g. Mars)', 0x39: 'fight fly-in', 0x3C: 'fight fly-in (capital ship)', 0x3F: 'fight explosion',
};
for (const [t, c] of Object.entries(FIRE_SFX)) {
  FIGHT_SFX_NAMES[c] = (FIGHT_SFX_NAMES[c] ? FIGHT_SFX_NAMES[c] + ',' : 'fight weapon of unit types ') + t;
}
