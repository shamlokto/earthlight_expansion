// Mission 7, The Wreck: MAP-SIMAK, Earth orbit (docs/EXPANSION.md, draft 2).
// Babylon's wreck hangs just above the atmosphere: its hull, chambers and turret railways are
// copied from the original BABYLON map, as is the atmosphere and the Earth below. The Union is
// salvaging the unfired main cannon from three Cortex command centres inside the hull; destroy
// all three. Six carriers hold the atmosphere and launch fighters (cargo at once, plus two
// a fighter wave on turn 4: the design's launch waves). The player comes down from high
// orbit on three fronts: the northwest, where a magnetic belt is a beam-proof road down to the
// hull's west end; the west, across a plasma lake and a meteoroid field; and the north, straight
// onto the hull. East of the wreck an asteroid ridge screens the orbital fleet; a mined
// meteoroid field covers the northeast and a gravity river the southeast.
// Balance (tests/expansion-bot.mjs PATH_BOT=1 AGGR=3 WV=60): with the design's two Hydra
// turrets (230-power missiles to range 6) or two fighters per carrier and a second wave, the bot
// never won; the hull keeps its two Dragons (beams, which the magnetic belt shelters from), each
// carrier one fighter, one wave of five. The bot then wins about 4-5 runs in 6 with 14-20 machines.
const COLS = 59, ROWS = 30;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const blob = (cx, cy, rx, ry, c, holes = () => false) => {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    if (((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1 && !holes(x, y)) set(x, y, c);
  }
};
// northwest magnetic belt, two to three hexes wide, from the top edge down toward the hull's west end
for (let y = 1; y <= 22; y++) for (let x = 1; x <= COLS; x++) if (Math.abs(x - (4.5 + y * 0.55)) < 1.3) set(x, y, 'm');
blob(6, 10, 3, 2, 'p');                                      // west plasma lake
blob(6, 21, 4, 2, ':', (x, y) => (x + y) % 5 === 0);           // southwest meteoroids, ragged
blob(53, 4, 5, 3, ':', (x, y) => (x * 3 + y) % 7 === 0);       // northeast meteoroid field (mined)
for (let y = 9; y <= 16; y++) if (y !== 12 && y !== 13) { set(44, y, 'a'); set(45, y + (y & 1), 'a'); }   // asteroid ridge, gap at rows 12-13
blob(47, 14, 1, 1, 'a');
for (let x = 41; x <= 59; x++) { const y = 17 + Math.round((x - 41) * 0.3); set(x, y, 'g'); set(x, y + 1, 'g'); }   // southeast gravity river
blob(13, 2, 2, 1, 'a'); blob(36, 2, 1, 1, ':');               // debris in high orbit
for (let x = 30; x <= 40; x++) if (x % 3) set(x, 24, ':');      // debris along the top of the atmosphere
// the atmosphere and Earth under the stamp, so the cells just above it are drawn as its edge
for (let y = 25; y <= 28; y++) for (let x = 1; x <= COLS; x++) set(x, y, '~');
for (let y = 29; y <= 30; y++) for (let x = 1; x <= COLS; x++) set(x, y, '_');
const terrain = g.map((r) => r.join('')).join('\n');

// units by position (hull positions are BABYLON's, moved by -16 columns and +4 rows)
const U = {
  // player: northwest (8), west (6), north (6)
  '2,2': 'G', '1,4': 'M', '3,4': 'M', '2,5': 'T', '1,6': 'K', '3,6': 'D', '1,2': 'C', '2,7': 'L',
  '1,13': 'R', '2,14': 'H', '1,15': 'Q', '2,16': 'Q', '1,17': 'S', '3,15': 'M',
  '20,1': 'V', '22,1': 'K', '24,1': 'T', '26,1': 'L', '28,1': 'C', '30,1': 'M',
  // the wreck: three Cortex in the hull's chambers, two Dragon turrets on its railways, a mecha garrison
  '28,9': 'c', '35,14': 'c', '20,17': 'c',
  '34,9': 'd', '29,14': 'd',
  '31,11': 't', '38,12': 't', '22,14': 't', '26,11': 't', '29,8': 'm', '34,8': 'm', '28,16': 'm', '21,16': 'm', '33,16': 'u', '24,19': 'u',
  // six carriers in the atmosphere
  '8,26': 'a', '17,27': 's', '26,26': 'e', '35,27': 'a', '44,26': 's', '53,27': 'e',
  // the orbital fleet behind the ridge
  '47,10': 'v', '50,16': 'v', '52,13': 'z', '50,4': 'f', '47,7': 'f', '46,20': 'f', '55,23': 'f', '50,12': 'h', '42,22': 'h', '56,10': 'r', '52,19': 'r',
  // northeast minefield
  '51,2': 'w', '53,3': 'w', '55,2': 'w', '56,5': 'w', '51,6': 'w', '54,7': 'w',
};
const units = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'SIMAK', title: 'The Wreck', screens: [4, 3],
  objective: { kind: 'command' }, turnLimit: 30, cap: 20, guards: 2, music: 29,
  goal: "Destroy the three Cortex command centres inside Babylon's hull.",
  chapter: "Chapter 7 · Earth orbit, the wreck of Babylon",
  transmission: "Babylon never fired. That is the trouble with emperors, General: they hesitate. I won't.",
  strategy: ["Your northwest group rides the magnetic belt down to the hull's west end: the Dragons' beams can't touch a ship inside it.", "The north group drops straight onto the hull. Don't trade with the carriers: kill fighters only when they block your way.", "The west group crosses the plasma lake and the meteoroids to the southern Cortex.", "A wave of fighters launches from the atmosphere on turn 4. Be inside the hull by then.", "Three Cortex centres: kill them all. The home fleet behind the eastern asteroids will come once you're committed."],
  plan: [{"n": 1, "path": [[3, 5], [9, 9], [16, 12]]}, {"n": 2, "path": [[24, 2], [26, 5], [28, 8]]}, {"n": 3, "path": [[3, 15], [11, 17], [19, 17]]}, {"n": 4, "at": [30, 23], "note": "Fighter wave T4"}],
  briefing: `
Earth orbit. Babylon.

It never fired. The Union has told the Foundries that for a month, and it is true: the great cannon went into the sea with the ship that carried it. Now we know why they keep saying it. The wreck is not in the sea. Most of the hull broke away on the way down and hangs above the atmosphere, and the Union has crews inside cutting the cannon free.

Three Cortex centres run the salvage from the hull's sealed chambers. Two Dragon beam batteries still work on its railways. Six carriers sit in the upper atmosphere and launch fighters at anything that comes near, and the home fleet waits behind the asteroids to the east.

We come down from high orbit on three fronts. In the northwest the magnetic belt runs almost to the hull: their beam weapons can't touch a ship inside it. Destroy the three command centres and the cannon stays where it is.`,
  terrain,
  stamps: [
    { map: 30, from: [33, 2], to: [57, 17], at: [17, 6] },   // Babylon's hull
    { map: 30, from: [1, 35], to: [59, 40], at: [1, 25] },   // atmosphere and Earth
  ],
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, K: { type: 2, army: 0 }, D: { type: 3, army: 0 },
    L: { type: 8, army: 0 }, C: { type: 9, army: 0 }, R: { type: 34, army: 0 }, S: { type: 38, army: 0 },
    H: { type: 39, army: 0 }, Q: { type: 40, army: 0 }, V: { type: 42, army: 0 },
    c: { type: 56, army: 1 },                 // Cortex
    d: { type: 23, army: 1 }, y: { type: 24, army: 1 },   // Dragon, Hydra turrets
    t: { type: 2, army: 1 }, m: { type: 0, army: 1 }, u: { type: 3, army: 1 },
    a: { type: 34, army: 1 }, s: { type: 36, army: 1 }, e: { type: 38, army: 1 },   // Artemis, Siren, Selene carriers
    v: { type: 42, army: 1 }, z: { type: 31, army: 1 }, f: { type: 49, army: 1 }, h: { type: 39, army: 1 }, r: { type: 40, army: 1 },
    w: { type: 18, army: 1 },                 // Wisp mine
  },
  cargo: {
    '8,26': [8], '17,27': [10], '26,26': [9], '35,27': [8], '44,26': [9], '53,27': [10],
    '1,13': [8, 9],                          // the player's own Artemis comes loaded
  },
  // a fighter wave from the carriers (event turn 3 = turn 4)
  arrivals: [
    { turn: 3, army: 1, units: [{ type: 8, x: 12, y: 24 }, { type: 8, x: 22, y: 24 }, { type: 9, x: 32, y: 23 }, { type: 8, x: 42, y: 24 }, { type: 9, x: 50, y: 24 }] },
  ],
};
