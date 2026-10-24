// Mission 10, Olympos: MAP-WELLS, the Union leadership's citadel on F1 Olympos (docs/EXPANSION.md,
// draft 2 scaled up for the finale). The citadel is the original VARAMU fortress (its walled east
// half, copied whole): an outer ring of decks and railways, chambers, and four gates west and
// east plus one north and one south. Inside: two Cortex command centres and the Goliath fortress
// at the core, with the salvaged Babylon cannon mounted as a Dragon sentinel on a railway.
//   * the player comes in from the four corners of the map and must converge;
//   * a gravity ring around the citadel (mecha can't enter it, railguns lose 50% against units in
//     it) opens only in front of the gates; a minefield covers the north approach;
//   * carriers in the east and west orbits put out fighters; Union waves on turns 6 and 12;
//   * the Luggnagg workers send Hannibal and Regulus cruisers to the player on turn 8.
// Objective: destroy both command centres within 24 turns. The general's death ends the game.
const COLS = 59, ROWS = 40;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const blob = (pts, c) => { for (const [x, y] of pts) set(x, y, c); };

// the citadel (stamped below) covers columns 14-45, rows 6-35; the gravity ring around it, with
// openings at the gates (rows 9-11 and 29-31 on both sides, columns 38-42 north and south)
for (let y = 4; y <= 37; y++) {
  if ((y >= 9 && y <= 11) || (y >= 29 && y <= 31)) continue;
  set(12, y, 'g'); set(13, y, 'g'); set(46, y, 'g'); set(47, y, 'g');
}
for (let x = 12; x <= 47; x++) {
  if (x >= 37 && x <= 43) continue;
  set(x, 4, 'g'); set(x, 37, 'g');
}
// the outer orbits: asteroid fields, plasma lakes, magnetic eddies, meteoroids
rect(2, 9, 4, 10, 'a'); blob([[5, 9], [3, 11], [6, 13], [7, 13], [6, 14]], 'a');
rect(54, 30, 56, 31, 'a'); blob([[53, 31], [57, 29], [52, 26], [53, 26], [53, 27]], 'a');
rect(3, 22, 6, 24, 'p'); rect(4, 25, 5, 26, 'p'); rect(52, 14, 55, 16, 'p'); rect(53, 17, 54, 18, 'p');
rect(8, 30, 9, 33, 'm'); rect(50, 7, 51, 10, 'm');
blob([[20, 1], [21, 1], [22, 2], [34, 1], [35, 2], [36, 2], [22, 39], [23, 40], [24, 40], [33, 39], [34, 39], [35, 40]], ':');
blob([[9, 18], [9, 19], [10, 19], [49, 21], [50, 21], [50, 22]], ':');
rect(28, 1, 30, 2, 'p'); rect(27, 39, 30, 40, 'p');
const rows = g.map((r) => r.join(''));

const U = {};
const place = (ch, list) => { for (const [x, y] of list) U[`${x},${y}`] = ch; };
// the player's deployment slots: four corner groups (open space, so any machine fits)
place('G', [[4, 3]]);
place('M', [[2, 2], [6, 2], [2, 37], [6, 39], [55, 2], [57, 4], [52, 38], [56, 39]]);
place('T', [[3, 5], [54, 37]]);
place('t', [[7, 4], [52, 3], [4, 36], [58, 37]]);
place('D', [[8, 2], [3, 39], [50, 2]]);
place('C', [[5, 5], [8, 37], [56, 6], [50, 39]]);
place('L', [[1, 4], [58, 2]]);
place('B', [[9, 3], [7, 38], [53, 5]]);
place('A', [[2, 6]]);
place('S', [[5, 38]]);
place('R', [[57, 39]]);
place('H', [[54, 4]]);
// the citadel: the Goliath at the core, the Babylon cannon (Dragon) and two Hydras on its railway,
// a Cortex in the east chamber and one in the north-west rooms, docks holding the home guard
place('F', [[29, 21]]);
place('K', [[43, 21], [19, 12]]);
place('Z', [[31, 20]]);
place('Y', [[31, 18], [31, 22]]);
place('P', [[22, 9], [22, 31], [38, 9], [38, 31]]);
place('o', [[16, 10], [16, 30], [44, 10], [44, 30], [29, 17], [33, 18]]);
place('m', [[28, 22], [33, 22], [31, 14], [31, 26], [29, 28], [33, 28]]);
place('e', [[21, 11], [17, 29], [22, 30], [41, 12]]);
place('v', [[42, 12], [42, 28]]);
place('p', [[34, 9], [34, 31]]);
// the orbits: carriers, the fleet, patrols, and the minefield before the north gate
place('k', [[6, 16], [54, 24]]);
place('i', [[6, 28]]);
place('s', [[52, 12]]);
place('N', [[40, 2]]);
place('V', [[25, 2]]);
place('Q', [[32, 38], [45, 39]]);
place('r', [[16, 2], [44, 2], [20, 38]]);
place('f', [[19, 3], [31, 3], [38, 39], [15, 39]]);
place('u', [[50, 12], [8, 25]]);
place('l', [[8, 8], [10, 20], [50, 30], [56, 12], [20, 5], [30, 36]]);
place('w', [[38, 4], [40, 4], [42, 4], [39, 3], [41, 3], [43, 3], [37, 5], [43, 5]]);
const units = rows.map((_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'WELLS', title: 'Olympos', screens: [4, 4],
  objective: { kind: 'command' }, turnLimit: 24, cap: 30, guards: 3, music: 7,
  goal: 'Destroy both of the Union leadership\'s command centres within 24 turns. If the general falls, it is over.',
  chapter: "Chapter 10 · F1 Olympos, the citadel",
  transmission: "Come in, then. The cannon is loaded, the doors are open, and history will decide which of us betrayed the Union. I write history from this room, General.",
  strategy: ["You start in four corners. Converge on the west and east gates. The gravity ring opens only in front of them.", "The western Cortex is close to the west gates and the eastern Cortex to the east gates. Give each one a strike group.", "Stay clear of the north approach: it's mined.", "Union waves arrive from the east on turn 6 and from the west on turn 12. The Luggnagg cruisers join you from the south on turn 8.", "The general must survive. Keep that machine back, in the second line."],
  plan: [{"n": 1, "path": [[5, 5], [10, 8], [14, 10]]}, {"n": 1, "path": [[5, 36], [10, 33], [14, 30]]}, {"n": 1, "path": [[54, 5], [49, 8], [45, 10]]}, {"n": 1, "path": [[54, 36], [49, 33], [45, 30]]}, {"n": 2, "path": [[15, 10], [18, 12]]}, {"n": 2, "path": [[44, 30], [43, 22]]}, {"n": 4, "at": [13, 39], "note": "Luggnagg cruisers T8"}, {"n": 4, "at": [57, 21], "note": "Union wave T6"}, {"n": 4, "at": [2, 21], "note": "Union wave T12"}],
  briefing: `
F1 Olympos. Where the Union was born, and where it went wrong.

The men who ordered the commander's death have shut themselves in the citadel: the old Galt fortress the Union took and kept, walled, ringed with railways and gravity flux. Two command centres run what is left of their war. The Goliath fortress holds the core, and on its railway they have mounted the thing they salvaged from Babylon's wreck: its main cannon, never fired.

They mean to fire it. We will not let them.

We come in from four corners at once; there is no single road in. The gravity ring opens only in front of the gates. Mines cover the north approach. Carriers in both orbits will throw fighters at us all day, and the home guard is still arriving.

The Luggnagg workers have not forgotten who freed them. Their cruisers will be with us by the eighth day.

Destroy both command centres within twenty-four turns. Keep the general alive. This is the last battle.`,
  ending: `
The citadel's guns fall silent one by one. In the core, the Babylon cannon never fires: its crews surrender at their posts with their hands on the controls.

The men who gave the order are found in the lower command centre, still issuing it to stations that no longer answer.

There is no parade this time. The general orders the Foundries' own crews to stand guard over the trials, Union and Galt alike, and sends the fleet home.

Babylon's cannon is taken apart where it stands. Its pieces are sunk in the same sea that swallowed the ship that carried it.

Earth turns below, blue and indifferent, as it did before the first Foundry was built.`,
  terrain: '\n' + rows.join('\n'),
  // the citadel: the original VARAMU's walled east half, columns 28-59, rows 1-30
  stamps: [{ map: 28, from: [28, 1], to: [59, 30], at: [14, 6] },
    // a railway for the cannon and the Hydras in the core chamber (the original DERLETH station's)
    { map: 27, from: [55, 11], to: [55, 15], at: [31, 18] }],
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
    A: { type: 31, army: 0 },                 // Asura-II
    S: { type: 38, army: 0 },                 // Selene
    R: { type: 40, army: 0 },                 // Regulus
    H: { type: 39, army: 0 },                 // Hannibal
    F: { type: 55, army: 1 },                 // Goliath fortress, the core
    K: { type: 56, army: 1 },                 // Cortex command centre (the objective)
    Z: { type: 23, army: 1 },                 // Dragon sentinel: the salvaged Babylon cannon
    Y: { type: 24, army: 1 },                 // Hydra turret
    P: { type: 52, army: 1 },                 // Pergamon dock (Union)
    o: { type: 2, army: 1 },                  // Talos
    m: { type: 0, army: 1 },                  // Mars
    e: { type: 3, army: 1 },                  // Medusa
    v: { type: 14, army: 1 },                 // Vulcan
    p: { type: 15, army: 1 },                 // Phoibos
    k: { type: 34, army: 1 },                 // Artemis carrier
    i: { type: 35, army: 1 },                 // Iris carrier
    s: { type: 36, army: 1 },                 // Siren carrier
    N: { type: 32, army: 1 },                 // Nodens
    V: { type: 33, army: 1 },                 // Hastur
    Q: { type: 31, army: 1 },                 // Asura-II
    r: { type: 40, army: 1 },                 // Regulus
    f: { type: 49, army: 1 },                 // Fenrir
    u: { type: 51, army: 1 },                 // Gulon
    l: { type: 8, army: 1 },                  // Lobster
    w: { type: 18, army: 1 },                 // Wisp mine
  },
  // what the docks and carriers hold: the home guard and the orbits' fighters
  cargo: {
    '22,9': [2, 3], '22,31': [2, 3], '38,9': [2, 0], '38,31': [3, 0],
    '6,16': [8, 9, 10], '54,24': [8, 9, 10], '6,28': [8, 8, 9], '52,12': [9, 9, 8],
  },
  arrivals: [
    // the home guard's waves: turn 6 from the east, turn 12 from the west
    { turn: 5, army: 1, units: [{ type: 2, x: 58, y: 20 }, { type: 3, x: 58, y: 22 }, { type: 49, x: 57, y: 18 }, { type: 0, x: 57, y: 24 }, { type: 40, x: 58, y: 26 }] },
    { turn: 11, army: 1, units: [{ type: 2, x: 1, y: 19 }, { type: 2, x: 1, y: 21 }, { type: 49, x: 2, y: 18 }, { type: 31, x: 2, y: 23 }, { type: 51, x: 1, y: 27 }] },
    // the Luggnagg workers' cruisers join the player on turn 8, from the south-west
    { turn: 7, army: 0, units: [{ type: 39, x: 10, y: 40 }, { type: 39, x: 12, y: 40 }, { type: 40, x: 14, y: 39 }, { type: 40, x: 16, y: 40 }] },
  ],
};
