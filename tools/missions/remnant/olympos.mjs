// Galt remnant, mission 11, Olympos Again (docs/STORY.md, Act III). The base where the coup
// began, retaken. The citadel is the original A Goddess Descends base (ROM map 20, its walled
// north half, copied whole): two wings of decks and railways around a narrow courtyard.
//   * two Cortex command centres, one in each wing: destroy both;
//   * Dragon and Hydra turrets on the wings' railways; docks in the inner chambers;
//   * Kessrin's Abaddons: one in the courtyard between the wings, two in the southern approach; their
//     Quantum Decimators erase any capital ship that comes within reach;
//   * the remnant comes in from the south in two groups and from the north-west with a third;
//     the Olympos dockworkers rise on turn 8; a Directorate reserve lands from the east on turn 6.
// Objective: destroy both command centres within 24 turns.
const COLS = 59, ROWS = 40, AT = [9, 14];   // the citadel stamp's top-left corner
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const blob = (pts, c) => { for (const [x, y] of pts) set(x, y, c); };
// citadel cell (x, y) of ROM map 20 -> this map
const C = (x, y) => [x + AT[0] - 1, y + AT[1] - 1];

// the north: the Olympos high docks' debris, a magnetic band, asteroids
rect(4, 4, 12, 6, 'm'); rect(20, 2, 26, 5, 'a'); blob([[19, 3], [27, 4], [22, 6], [23, 1]], 'a');
rect(34, 3, 37, 6, ':'); rect(48, 2, 54, 4, 'p'); rect(55, 6, 57, 10, 'g');
// the south approach: asteroid fields for the mecha, plasma, a gravity eddy before the east wing
rect(6, 30, 11, 33, 'a'); blob([[5, 31], [12, 32], [8, 34], [9, 29]], 'a');
rect(26, 31, 31, 34, 'a'); blob([[25, 32], [32, 33], [28, 35], [29, 30]], 'a');
rect(16, 29, 20, 31, ':'); rect(38, 30, 42, 32, ':');
rect(44, 34, 50, 37, 'p'); rect(52, 29, 55, 31, 'g'); rect(14, 37, 20, 39, 'm');
const rows = g.map((r) => r.join(''));

const U = {};
const place = (ch, list) => { for (const [x, y] of list) U[`${x},${y}`] = ch; };
// the remnant: two groups in the south, one in the north-west
place('G', [[22, 38]]);
place('M', [[20, 36], [24, 36], [36, 37], [4, 2], [8, 3]]);
place('T', [[18, 38], [40, 38]]);
place('t', [[26, 37], [38, 36], [6, 8]]);
place('D', [[34, 39]]);
place('C', [[16, 35], [42, 35], [10, 2]]);
place('L', [[12, 36], [46, 39], [2, 6]]);
place('B', [[30, 38]]);
place('P', [[23, 40]]);
place('Y', [[37, 40]]);
place('S', [[28, 39]]);
place('H', [[32, 40]]);
place('R', [[3, 10]]);
place('A', [[26, 40]]);
// the citadel: the two command centres, docks, turrets on the railways, the wing garrisons
place('K', [C(5, 6), C(38, 6)]);
place('Q', [C(17, 7), C(27, 7)]);
place('Z', [C(9, 6), C(34, 6)]);
place('y', [C(16, 8), C(28, 8)]);
place('o', [C(4, 7), C(6, 5), C(37, 7), C(39, 5), C(22, 1), C(20, 2)]);
place('e', [C(8, 5), C(36, 5), C(16, 3), C(28, 3)]);
place('m', [C(4, 8), C(40, 8), C(18, 6), C(26, 6), C(24, 1)]);
place('v', [C(14, 4), C(30, 4)]);
// Kessrin's Abaddons: one in the courtyard between the wings, two before the south wall
place('X', [C(22, 10), [22, 30], [36, 29]]);
// the outer guard: cruisers, the battleship, patrols
place('N', [[30, 30]]);
place('h', [[14, 28], [46, 28]]);
place('r', [[24, 29], [40, 27]]);
place('f', [[8, 27], [54, 25], [30, 8], [44, 10]]);
place('u', [[18, 9], [40, 6]]);
place('l', [[12, 12], [48, 12], [34, 28]]);
const units = rows.map((_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'OLYMPOS', title: 'Olympos Again', file: 'remnant/olympos', screens: [4, 4],
  objective: { kind: 'command' }, turnLimit: 24, cap: 20, guards: 3, music: 19,
  goal: "Destroy both of the Directorate's command centres in the Olympos citadel within 24 turns. If the general falls, it is over.",
  chapter: 'Chapter 11 · F1 Olympos',
  transmission: "You were standing on that parade ground when I took this base, General. I let you walk away. Come and see what I built in the space you left.",
  comms: [
    { speaker: 'kessrin', text: "You were standing on that parade ground when I took this base, General. I let you walk away. Come and see what I built in the space you left." },
    { speaker: 'sato', text: "Two command centres, one in each wing. There's an Abaddon in the courtyard between them. Don't park anything big within four hexes of the middle." },
    { speaker: 'ruess', text: "Two more Abaddons are sitting in front of the south wall. Fighters first. If a Decimator lands on the Selene, nobody is coming back." },
    { speaker: 'moraine', text: "The dockworkers on Olympos remember who paid them before Kessrin. Hold out until the eighth day and they'll open the east docks for you." },
    { speaker: 'sato', text: "This is where it started. Let's go and finish the middle part." },
  ],
  strategy: [
    "Fighters and Lobsters go first: kill the two Abaddons in front of the south wall before any carrier or cruiser comes within four hexes of them.",
    "The west wing's Cortex is closest to your southern groups; the north-west group comes down the magnetic band onto the same wing from above.",
    "Keep capital ships away from the courtyard in the middle of the citadel: the third Abaddon waits in it and fires at anything big in range.",
    "The Directorate reserve lands from the east on turn 6. Hold the east wing at arm's length with artillery until the west Cortex falls.",
    "The Olympos dockworkers rise on turn 8 in the north-east. Then take the east wing's Cortex from two sides.",
  ],
  plan: [
    { n: 1, path: [[20, 36], [22, 31]] },
    { n: 1, path: [[36, 36], [36, 30]] },
    { n: 2, path: [[22, 37], [14, 30], [13, 22]] },
    { n: 2, path: [[6, 6], [8, 12], [12, 18]] },
    { n: 3, at: [30, 23], note: 'Decimator' },
    { n: 4, at: [58, 20], note: 'Reserve T6' },
    { n: 5, at: [52, 8], note: 'Dockworkers T8' },
    { n: 5, path: [[44, 30], [46, 24], [46, 20]] },
  ],
  briefing: `
F1 Olympos. Where it began.

The parade ground is still there, under the citadel's south wall. Kessrin has rebuilt the base around it: two wings of decks and railways, a command centre in each, turrets on the railways, and between the wings a narrow courtyard where he keeps one of his Abaddons.

Two more Abaddons stand in front of the south wall. If one of them gets a capital ship inside four hexes, that ship is gone and the hexes around it are gone with it. Fighters go first.

We come in from the south in two groups and from the north-west with a third. A Directorate reserve is landing from the east on the sixth day. The dockworkers have promised to rise on the eighth.

Destroy both command centres, and Olympos is ours again.`,
  terrain: '\n' + rows.join('\n'),
  // the citadel: A Goddess Descends' walled north half (ROM map 20, columns 1-44, rows 1-14)
  stamps: [{ map: 20, from: [1, 1], to: [44, 14], at: AT }],
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 },                  // Mars
    T: { type: 1, army: 0 },                  // Titan
    t: { type: 2, army: 0 },                  // Talos
    D: { type: 3, army: 0 },                  // Medusa
    C: { type: 9, army: 0 },                  // Crane
    L: { type: 8, army: 0 },                  // Lobster
    B: { type: 10, army: 0 },                 // Brontes
    P: { type: 15, army: 0 },                 // Phoibos
    Y: { type: 16, army: 0 },                 // Cyclops
    S: { type: 38, army: 0 },                 // Selene
    H: { type: 39, army: 0 },                 // Hannibal
    R: { type: 40, army: 0 },                 // Regulus
    A: { type: 43, army: 0 },                 // Abaddon (the one taken at the Gate)
    K: { type: 56, army: 1 },                 // Cortex command centre (the objective)
    Q: { type: 52, army: 1 },                 // Pergamon dock (Union)
    Z: { type: 23, army: 1 },                 // Dragon turret (railway)
    y: { type: 24, army: 1 },                 // Hydra turret (railway)
    o: { type: 2, army: 1 },                  // Talos
    e: { type: 3, army: 1 },                  // Medusa
    m: { type: 0, army: 1 },                  // Mars
    v: { type: 14, army: 1 },                 // Vulcan
    X: { type: 43, army: 1 },                 // Abaddon (Quantum Decimator)
    N: { type: 31, army: 1 },                 // Asura-II
    h: { type: 39, army: 1 },                 // Hannibal
    r: { type: 40, army: 1 },                 // Regulus
    f: { type: 49, army: 1 },                 // Fenrir
    u: { type: 51, army: 1 },                 // Gulon
    l: { type: 8, army: 1 },                  // Lobster
  },
  cargo: { [C(17, 7).join(',')]: [2, 3], [C(27, 7).join(',')]: [2, 0] },
  // the outer guard holds the approaches below the south wall and the wings' outer doors
  routes: [[14, 26], [22, 28], [30, 27], [38, 27], [46, 26], [12, 22], [50, 22], [10, 12], [52, 12]].map(([x, y]) => ({ prio: 1, x, y })),
  arrivals: [
    // the Directorate reserve, from the east on turn 6
    { turn: 5, army: 1, units: [{ type: 42, x: 59, y: 18 }, { type: 2, x: 59, y: 22 }, { type: 2, x: 59, y: 24 }, { type: 49, x: 58, y: 16 }, { type: 31, x: 59, y: 28 }] },
    // the Olympos dockworkers rise in the north-east on turn 8
    { turn: 7, army: 0, units: [{ type: 42, x: 52, y: 8 }, { type: 39, x: 50, y: 6 }, { type: 40, x: 53, y: 10 }, { type: 0, x: 49, y: 9 }, { type: 0, x: 51, y: 11 }] },
  ],
};
