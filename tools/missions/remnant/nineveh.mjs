// Galt remnant, hidden mission 13, Nineveh (docs/STORY.md, "The hidden battle"; opened by sinking
// the Leviathan by turn 24). Babylon's sister ship lies in Earth's shadow with Ahriman aboard and
// Babylon's main cannon in her bow; everything Galt has left is drawn up in front of her.
//   * the Nineveh (type 77, the objective) sits on the turret railway inside her own hull at the top: Babylon's hull,
//     stamped from missions/remnant/babylon.json; capital ships can't enter the hull, craft can;
//   * three cannon towers (Cortex command centres) on the hull arm her main cannon: at every phase
//     change each fires straight down its column (x 22, 29, 36) to the bottom of the map and
//     destroys everything in it, of either side; losing a tower silences its lane;
//   * a gravity veil in front of the hull (mecha can't cross it; three gaps), minefields, a battery
//     fort in the west (asteroids and bedrock around a turret railway), a carrier anchorage in the
//     east (plasma and magnetic fields), asteroid islands in the middle, magnetic lanes up from the
//     south-west and south-east, Earth's atmosphere along the south edge;
//   * the remnant (cap 40, 46 start hexes) in the south; the Galt fleet in lines in front of the
//     hull, with reserves on turns 6, 10, 15 and 20; a loyal Union fleet joins on turn 8, and on
//     turn 12 Moraine's cartel (deal) or the Olympos guard (refuse).
// Objective: sink the Nineveh within 40 turns; the general must survive.
// Built without the ROM: node tools/build-missions-norom.mjs --dir remnant nineveh
const COLS = 59, ROWS = 40;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const blob = (pts, c) => { for (const [x, y] of pts) set(x, y, c); };
const disc = (cx, cy, r, c, k = 1.15) => { for (let y = 1; y <= ROWS; y++) for (let x = 1; x <= COLS; x++) if (Math.hypot(x - cx, (y - cy) * k) <= r) set(x, y, c); };
const LANES = [22, 29, 36];

// the gravity veil in front of the hull: an arc across the field, open at three gaps
for (let x = 6; x <= 54; x++) {
  const y = 18 + Math.round(2.2 * Math.sin((x - 6) / 48 * Math.PI));
  if ((x >= 13 && x <= 15) || (x >= 25 && x <= 27) || (x >= 41 && x <= 43)) continue;
  set(x, y, 'g'); set(x, y + 1, 'g');
}
// the west battery fort: asteroids and bedrock around a turret railway loop
disc(8, 9, 6.2, 'a'); disc(8, 9, 3.6, '#');
for (const [x, y] of [[5, 7], [6, 6], [7, 6], [8, 6], [9, 6], [10, 7], [11, 8], [11, 9], [11, 10], [10, 11], [9, 12], [8, 12], [7, 12], [6, 11], [5, 10], [5, 9], [5, 8]]) set(x, y, '=');
rect(1, 1, 3, 4, ':'); blob([[13, 3], [14, 4], [13, 14], [14, 13], [2, 15], [3, 16]], ':');
// the east anchorage: plasma clouds and magnetic fields
disc(50, 6, 4.5, 'p'); disc(56, 13, 2.8, 'p'); rect(43, 11, 47, 12, 'm'); blob([[44, 13], [45, 13], [42, 10]], 'm');
// the middle: three asteroid islands with bedrock cores, meteoroid ridges, plasma
disc(15, 26, 3.4, 'a'); disc(15, 26, 1.5, '#');
disc(32, 24, 3.0, 'a'); disc(32, 24, 1.2, '#');
disc(46, 27, 3.6, 'a'); disc(46, 27, 1.6, '#');
rect(24, 30, 27, 31, ':'); rect(38, 31, 41, 32, ':'); blob([[8, 21], [9, 21], [10, 22], [52, 21], [53, 22], [54, 22]], ':');
disc(25, 21, 1.8, 'p'); disc(41, 23, 2.0, 'p'); disc(5, 30, 2.4, 'p'); disc(55, 33, 2.4, 'p');
// the beam-proof lanes up from the south-west and the south-east
for (let k = 0; k <= 14; k++) { set(4 + k, 36 - k, 'm'); set(5 + k, 36 - k, 'm'); set(55 - k, 36 - k, 'm'); set(54 - k, 36 - k, 'm'); }
// Earth's atmosphere along the south edge
rect(1, 39, 59, 40, '~'); blob([[1, 38], [2, 38], [3, 38], [57, 38], [58, 38], [59, 38], [28, 38], [29, 38], [30, 38]], '~');
// keep the cannon lanes open space (their own terrain would only confuse the corridors)
for (const x of LANES) for (let y = 17; y <= 38; y++) if ('ag#:'.includes(g[y - 1][x - 1])) set(x, y, '.');
const rows = g.map((r) => r.join(''));

const U = {};
const place = (ch, list) => { for (const [x, y] of list) { const k = `${x},${y}`; if (U[k]) throw new Error(`two units at ${k}`); U[k] = ch; } };

// ------------------------------------------------------------------ the remnant: 46 start hexes in the south
// open space, clear of the cannon lanes (22, 29, 36), any machine can take them
place('G', [[31, 35]]);
place('M', [
  [6, 33], [9, 33], [12, 33], [16, 33], [19, 33], [25, 33], [32, 33], [34, 33], [39, 33], [43, 33], [47, 33], [51, 33],
  [7, 35], [10, 35], [13, 35], [17, 35], [20, 35], [24, 35], [27, 35], [33, 35], [38, 35], [41, 35], [44, 35], [48, 35], [52, 35],
  [8, 37], [11, 37], [14, 37], [18, 37], [20, 37], [24, 37], [26, 37], [32, 37], [34, 37], [38, 37], [40, 37], [44, 37], [46, 37], [50, 37],
  [14, 31], [18, 31], [31, 31], [34, 31], [44, 31], [49, 31], [53, 31],
]);

// ------------------------------------------------------------------ the Nineveh and her hull
place('N', [[30, 7]]);                                   // the boss, on the railway in the hull's heart
place('T', [[22, 12], [29, 10], [36, 6]]);               // the cannon towers
place('Y', [[24, 12], [28, 10], [32, 10], [37, 8]]);     // Hydra batteries on the railway
place('R', [[26, 11], [30, 6], [35, 5], [34, 4]]);       // Dragon batteries
place('D', [[31, 8], [34, 8], [31, 6], [27, 8], [25, 8], [37, 5]]);   // Ahriman's guard (Directorate Talos, level 8)
// the west battery fort
place('Y', [[6, 6], [11, 9], [7, 12]]); place('R', [[9, 6], [5, 9], [10, 11]]);
place('i', [[8, 9], [9, 10]]);                           // Titan Kai snipers on the bedrock
// the east anchorage: carriers and the battle line
place('C', [[46, 4], [54, 9]]); place('S', [[51, 12]]); place('V', [[42, 6]]);
place('B', [[45, 8], [57, 4]]); place('K', [[49, 10]]);
// the battle line in front of the veil
place('B', [[18, 15], [44, 15]]); place('Q', [[13, 16], [40, 16], [48, 17]]); place('W', [[16, 12], [43, 13], [52, 16]]);
place('K', [[28, 16]]);
place('X', [[33, 13], [39, 11], [19, 9]]);               // Abaddons (Quantum Decimators), held back
// cruisers and destroyers in the gaps and the middle
place('c', [[14, 18], [26, 17], [42, 19], [33, 18]]); place('h', [[20, 17], [38, 15], [10, 17]]); place('r', [[31, 15], [47, 14]]);
place('o', [[23, 16], [34, 16]]);
place('f', [[7, 20], [12, 24], [50, 23], [56, 19]]); place('F', [[20, 24], [40, 26]]); place('e', [[28, 22], [36, 21]]); place('u', [[5, 24], [54, 25]]);
// craft: Kai refits, Athena Kai, Talos, fighters
place('k', [[17, 21], [30, 20], [45, 21]]); place('l', [[11, 19], [38, 19], [24, 23]]); place('n', [[21, 20], [47, 20], [33, 27]]);
place('s', [[16, 23], [27, 25], [43, 24]]); place('y', [[9, 15], [49, 18]]); place('t', [[19, 27], [35, 23], [51, 28]]);
// minefields in front of the veil and around the islands
place('P', [[17, 20], [23, 21], [31, 21], [35, 20], [44, 22], [12, 21], [50, 21]]);
place('w', [[19, 22], [26, 23], [37, 24], [40, 21], [48, 24], [10, 25], [53, 26]]);
const units = rows.map((_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

const HOLD_LINE = 10, HOLD_HEAVY = 16, HOLD_BOSS = 26, HOLD_SCREEN = 3;   // the screen of cruisers and craft holds its ground for the first turns
export default {
  name: 'NINEVEH', title: 'Nineveh', file: 'remnant/nineveh', screens: [4, 4],
  objective: { kind: 'flagship', type: 77 }, turnLimit: 40, cap: 40, music: 29,
  goal: 'Sink the Nineveh within 40 turns. Her cannon fires down three lanes at every phase change until its towers fall. If the general falls, it is over.',
  chapter: 'Chapter 13 · Secret · Earth\'s shadow',
  transmission: "You sank my Babylon before she could speak, General. Her sister has been waiting eleven years to finish the sentence.",
  comms: [
    { speaker: 'ahriman', text: "You sank my Babylon before she could speak, General. Her sister has been waiting eleven years to finish the sentence." },
    { speaker: 'ruess', text: "That's Babylon's main cannon in her bow. They salvaged it while we were busy with Kessrin. Three towers on the hull feed it; each one fires straight down its column, every phase, and anything in the lane is gone. Ours or theirs." },
    { speaker: 'sato', text: "Then we don't stand in the lanes. Cross them on the move, never stop in them. Kill the towers and the lanes go dark. The veil in front of the hull stops the mecha; use the three gaps." },
    { speaker: 'moraine', text: "I always wondered who bought all those Asgard spare parts. Ahriman pays in gold, General. You pay in futures. Guess whose side I'm on today." },
    { speaker: 'ahriman', text: "The Union, the Directorate, the cartel: you are all the same children. Come, then. Bring everything. It will be easier to bury you together." },
  ],
  strategy: [
    "Deploy everything you can: forty machines. Keep the general's ship in the middle of the formation, far from the lanes at columns 22, 29 and 36.",
    "The cannon fires at every phase change down each lane whose tower still stands. Cross a lane during a move, but never end a move in one.",
    "The towers sit on Nineveh's hull. Only craft can climb onto the hull; send fighters and mecha through the gaps in the gravity veil to kill them, while the capital ships hold the line south of the veil.",
    "Clear the minefields with long guns before advancing; the mines block the gaps.",
    "Reserves come on turns 6 (west), 10 (east), 15 (from behind the hull) and 20. A loyal Union fleet joins you on turn 8 from the south-west, and on turn 12 Moraine's cartel or the Olympos guard.",
    "The Nineveh holds in her hull until turn 26 and launches her fighters when you come close. Her guns reach six hexes; take her apart from the hull's edge with railguns and missiles.",
  ],
  plan: [
    { n: 1, path: [[8, 33], [10, 24], [14, 19]] },
    { n: 1, path: [[52, 33], [50, 24], [42, 19]] },
    { n: 2, at: [26, 18], note: 'Veil gap' },
    { n: 3, at: [22, 12], note: 'Tower' },
    { n: 3, at: [29, 10], note: 'Tower' },
    { n: 3, at: [36, 6], note: 'Tower' },
    { n: 4, at: [30, 7], note: 'Nineveh' },
    { n: 5, at: [2, 30], note: 'Union fleet T8' },
  ],
  briefing: `
Earth's shadow. The far side of everything.

Eleven years ago, Asgard's yards laid down two hulls. One became Babylon. The other was never finished, never named in any Union record, and never found. She has a name now: Nineveh. And she has a captain who was never found either.

Ahriman is alive. While we were fighting Kessrin, he was salvaging the main cannon Babylon never fired, and fitting it to her sister. Everything Galt still has is drawn up in front of her: battleships, carriers, the last Abaddons, and his own guard in machines we taught Kessrin to build.

Three towers on her hull feed the cannon. At every phase it fires straight down three lanes, and nothing in them survives. Kill the towers and the lanes go dark.

This is the last fleet in space that is not ours. Bring everything.`,
  ending: `
The Nineveh's cannon fires one last time, into nothing, as her hull breaks along the seams the Asgard welders left eleven years ago.

There is no transmission at the end. Ahriman never begged in the old war, and he does not begin now.

The fleets drift in Earth's shadow, Union and Galt and cartel, and for the first time since the parade at Olympos nobody fires. Somebody on an open channel starts reading out the names of ships, and nobody tells them to stop.

The war is over. This time, all of it.`,
  terrain: '\n' + rows.join('\n'),
  // Babylon's hull (from the mission that stamped it from ROM map 30), without the space around it
  stamps: [{ mission: 'remnant/babylon', from: [26, 8], to: [49, 23], at: [18, 1], classes: [8, 9, 10, 13, 14, 15] }],
  cannons: [{ x: 22, y: 13, tower: [22, 12] }, { x: 29, y: 11, tower: [29, 10] }, { x: 36, y: 7, tower: [36, 6] }],
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // the general's machine (the roster fills the start hexes)
    M: { type: 0, army: 0 },
    N: { type: 77, army: 1, hold: HOLD_BOSS },   // the Nineveh (Ahriman aboard)
    T: { type: 56, army: 1 },                 // cannon tower (Cortex)
    Y: { type: 24, army: 1 },                 // Hydra battery
    R: { type: 23, army: 1 },                 // Dragon battery
    D: { type: 60, army: 1, level: 8 },       // Ahriman's guard: Directorate Talos
    B: { type: 32, army: 1, hold: HOLD_HEAVY },   // Nodens
    Q: { type: 30, army: 1, hold: HOLD_LINE },    // Tiamat
    W: { type: 31, army: 1, hold: HOLD_LINE },    // Asura-II
    K: { type: 72, army: 1, hold: HOLD_LINE, level: 5 },   // Asura-II Kai
    C: { type: 34, army: 1 },                 // Artemis carrier
    S: { type: 33, army: 1 },                 // Hastur carrier
    V: { type: 36, army: 1 },                 // Siren
    X: { type: 43, army: 1, hold: 18 },       // Abaddon (Quantum Decimator)
    c: { type: 42, army: 1, hold: HOLD_SCREEN },                 // Corvus
    h: { type: 39, army: 1, hold: HOLD_LINE },   // Hannibal
    r: { type: 40, army: 1, hold: HOLD_SCREEN },                 // Regulus
    o: { type: 41, army: 1, hold: HOLD_SCREEN },                 // Palmyra
    f: { type: 49, army: 1, hold: HOLD_SCREEN },                 // Fenrir
    F: { type: 71, army: 1, level: 4, hold: HOLD_SCREEN },       // Fenrir Kai
    e: { type: 50, army: 1, hold: HOLD_SCREEN },                 // Cerberus
    u: { type: 51, army: 1, hold: HOLD_SCREEN },                 // Gulon
    k: { type: 73, army: 1, level: 5, hold: HOLD_SCREEN },       // Athena Kai
    l: { type: 66, army: 1, level: 4, hold: HOLD_SCREEN },       // Lobster Kai
    n: { type: 67, army: 1, level: 4, hold: HOLD_SCREEN },       // Crane Kai
    s: { type: 69, army: 1, level: 4, hold: HOLD_SCREEN },       // Mars Kai
    i: { type: 68, army: 1, level: 5 },       // Titan Kai
    y: { type: 70, army: 1, level: 4, hold: HOLD_SCREEN },       // Cyclops Kai
    t: { type: 2, army: 1, level: 3, hold: HOLD_SCREEN },        // Talos
    P: { type: 17, army: 1 },                 // Pandora mine
    w: { type: 18, army: 1 },                 // Wisp mine
  },
  cargo: { '30,7': [60, 60, 73, 73], '46,4': [8, 9, 10, 9], '54,9': [8, 9, 10, 9], '51,12': [66, 67, 66] },
  // the fleet makes for the veil's gaps and the south; the hull's guard keeps to the hull
  routes: [[14, 19], [26, 18], [42, 19], [20, 26], [40, 27], [31, 30]].map(([x, y]) => ({ prio: 1, x, y })),
  arrivals: [
    // Galt reserves: the west (turn 6), the east (turn 10), from behind the hull (turn 15), the last (turn 20)
    { turn: 5, army: 1, units: [{ type: 33, x: 1, y: 20, cargo: [9, 9, 10] }, { type: 34, x: 1, y: 26, cargo: [8, 9, 66] }, { type: 39, x: 2, y: 18 }, { type: 39, x: 2, y: 28 },
      { type: 49, x: 1, y: 23 }, { type: 71, x: 2, y: 22, level: 4 }, { type: 2, x: 3, y: 24 }, { type: 69, x: 3, y: 21, level: 4 }] },
    { turn: 9, army: 1, units: [{ type: 30, x: 59, y: 22 }, { type: 30, x: 59, y: 28 }, { type: 42, x: 58, y: 20 }, { type: 42, x: 58, y: 30 },
      { type: 60, x: 57, y: 24, level: 7 }, { type: 60, x: 57, y: 26, level: 7 }, { type: 60, x: 58, y: 25, level: 7 }, { type: 43, x: 59, y: 25 }] },
    { turn: 14, army: 1, units: [{ type: 32, x: 12, y: 1 }, { type: 32, x: 48, y: 1 }, { type: 72, x: 16, y: 2, level: 5 }, { type: 72, x: 44, y: 2, level: 5 },
      { type: 73, x: 26, y: 1, level: 6 }, { type: 73, x: 38, y: 1, level: 6 }, { type: 73, x: 41, y: 2, level: 6 },
      { type: 60, x: 24, y: 2, level: 8 }, { type: 60, x: 40, y: 1, level: 8 }, { type: 60, x: 20, y: 1, level: 8 }, { type: 60, x: 46, y: 2, level: 8 }] },
    { turn: 19, army: 1, units: [{ type: 31, x: 52, y: 1 }, { type: 31, x: 8, y: 1 }, { type: 42, x: 55, y: 2 }, { type: 42, x: 4, y: 2 },
      { type: 70, x: 57, y: 6, level: 5 }, { type: 70, x: 2, y: 5, level: 5 }, { type: 68, x: 15, y: 6, level: 5 }, { type: 67, x: 50, y: 3, level: 5 }] },
    // allies: the loyal Union fleet (turn 8); Moraine's cartel on the deal, the Olympos guard on the refusal (turn 12)
    { turn: 7, army: 0, units: [{ type: 30, x: 2, y: 34 }, { type: 31, x: 3, y: 31 }, { type: 31, x: 2, y: 37 }, { type: 42, x: 4, y: 33 }, { type: 42, x: 5, y: 36 },
      { type: 2, x: 6, y: 31 }, { type: 2, x: 6, y: 37 }, { type: 2, x: 4, y: 29 }, { type: 4, x: 7, y: 34 }, { type: 4, x: 7, y: 30 }] },
    { turn: 11, army: 0, when: { choice: 'deal' }, units: [{ type: 34, x: 58, y: 34, cargo: [8, 9, 9] }, { type: 33, x: 57, y: 31, cargo: [8, 8] }, { type: 36, x: 58, y: 37 },
      { type: 36, x: 56, y: 36 }, { type: 66, x: 55, y: 30 }, { type: 67, x: 54, y: 34 }, { type: 50, x: 56, y: 29 }, { type: 50, x: 53, y: 37 }] },
    { turn: 11, army: 0, when: { choice: 'refuse' }, units: [{ type: 58, x: 58, y: 34, cargo: [8, 9, 9] }, { type: 30, x: 57, y: 31 }, { type: 42, x: 58, y: 37 },
      { type: 42, x: 56, y: 36 }, { type: 2, x: 55, y: 30 }, { type: 2, x: 54, y: 34 }, { type: 1, x: 56, y: 29 }, { type: 1, x: 53, y: 37 }] },
  ],
};
