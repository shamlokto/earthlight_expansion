// Galt remnant, mission 8, The Gate (docs/STORY.md, Act III). The Directorate's fortress line
// across the approach to Earth orbit: a wall with three gates, a turret railway behind it, a
// deck yard with two docks, and the Carthago fortress in its own walled compound.
//   * a magnetic corridor runs from the west edge to the north gate: the Dragons' beams can't
//     touch a unit inside it; asteroid cover to the south-west for the mecha;
//   * mines in front of the centre gate; two Abaddons in the yard fire their Quantum
//     Decimators at any capital ship that comes within reach;
//   * Captain Sato's Selene Kai and two cruisers join on turn 5; the Directorate reserve comes
//     from the east on turn 7.
// Objective: destroy the Carthago fortress within 22 turns.
const COLS = 59, ROWS = 30;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const blob = (pts, c) => { for (const [x, y] of pts) set(x, y, c); };

// the approach: the magnetic corridor to the north gate, asteroid cover south-west, meteoroids
rect(6, 4, 28, 6, 'm'); rect(4, 3, 9, 7, 'm'); blob([[10, 7], [12, 7], [20, 3], [22, 3], [24, 7]], 'm');
rect(11, 20, 18, 25, 'a'); rect(14, 18, 16, 19, 'a'); blob([[19, 22], [20, 23], [10, 22], [12, 26], [13, 27]], 'a');
rect(20, 11, 23, 13, ':'); blob([[22, 14], [24, 17], [25, 18], [17, 9], [18, 10]], ':');
rect(8, 28, 14, 30, 'p'); rect(24, 27, 27, 30, 'p');
// the line: wall (columns 30-31) with gates at rows 5-6, 14-16 and 24-25; the turret railway
// behind it; the deck yard
for (let y = 1; y <= ROWS; y++) {
  const gate = (y >= 5 && y <= 6) || (y >= 14 && y <= 16) || (y >= 24 && y <= 25);
  set(30, y, gate ? 'd' : 'W'); set(31, y, gate ? 'd' : 'W'); set(32, y, gate ? 'd' : '=');
  rect(33, y, 37, y, 'd');
}
// the Carthago's compound: walls around a deck, open to the west at rows 14-16
rect(46, 10, 54, 20, 'W'); rect(47, 11, 53, 19, 'd'); rect(46, 14, 46, 16, 'd');
// beyond the line: plasma and a gravity eddy before the reserve's edge
rect(41, 2, 44, 4, 'p'); rect(41, 26, 44, 28, 'p'); rect(56, 8, 57, 22, 'g');
const rows = g.map((r) => r.join(''));

const U = {};
const place = (ch, list) => { for (const [x, y] of list) U[`${x},${y}`] = ch; };
// the remnant: deployment slots along the west edge (open space and magnetic field)
place('G', [[3, 15]]);
place('M', [[2, 4], [5, 9], [4, 21]]);
place('T', [[2, 12], [3, 19]]);
place('t', [[6, 13], [6, 17]]);
place('D', [[4, 25]]);
place('C', [[7, 5], [7, 24]]);
place('L', [[1, 8], [1, 23]]);
place('B', [[5, 15]]);
place('P', [[2, 27]]);
place('Y', [[4, 10]]);
place('S', [[1, 16]]);
place('H', [[2, 2]]);
place('R', [[2, 29]]);
// the line's garrison: Talos at the gates, turrets on the railway, docks in the yard
place('o', [[33, 5], [33, 15], [34, 16], [33, 25]]);
place('Z', [[32, 9], [32, 21]]);
place('y', [[32, 12], [32, 19]]);
place('K', [[35, 9], [35, 21]]);
place('v', [[36, 4], [36, 26]]);
place('p', [[37, 13], [37, 17]]);
place('e', [[34, 2], [34, 29]]);
// the mines before the centre gate
place('w', [[27, 14], [28, 15], [27, 16], [26, 15]]);
place('1', [[28, 13], [28, 17]]);
// the yard and the compound: two Abaddons, the fleet, the fortress
place('X', [[40, 9], [40, 21]]);
place('F', [[50, 15]]);
place('c', [[48, 15], [52, 13], [52, 17]]);
place('N', [[44, 15]]);
place('h', [[42, 6], [42, 24]]);
place('r', [[45, 12]]);
place('f', [[39, 3], [39, 27], [43, 18]]);
const units = rows.map((_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'GATE', title: 'The Gate', file: 'remnant/gate', screens: [4, 3],
  objective: { kind: 'fortress' }, turnLimit: 22, cap: 16, guards: 3, music: 7,
  goal: 'Destroy the Carthago fortress within 22 turns. If the general falls, it is over.',
  chapter: 'Chapter 8 · The Gate, high Earth orbit',
  transmission: "Every road home runs through my Gate, General. I built it for the Galt fleet. It will serve just as well for you.",
  comms: [
    { speaker: 'kessrin', text: "Every road home runs through my Gate, General. I built it for the Galt fleet. It will serve just as well for you." },
    { speaker: 'sato', text: "The north corridor is a magnetic river. Their Dragon turrets are beam weapons. You see where I'm going." },
    { speaker: 'ruess', text: "Those two Abaddons in the yard carry Quantum Decimators. Anything bigger than a fighter that comes within four hexes of them stops existing. Keep the carriers back." },
    { speaker: 'sato', text: "I'm bringing the Selene Kai and two cruisers around the north. Give me five days and an open gate." },
    { speaker: 'vane', text: "I'll be watching from the comet, General. Try not to die before I get my turn." },
  ],
  strategy: [
    "Send the mecha and fighters up the magnetic corridor to the north gate: the Dragon turrets' beams can't touch a unit inside the field.",
    "The centre gate is mined and covered by both Hydras. Don't force it; let artillery clear the mines from the asteroids to the south-west.",
    "The two Abaddons in the yard fire Quantum Decimators at any capital ship in range. Keep the Selene and the cruisers out of reach until fighters have sunk them.",
    "Captain Sato's Selene Kai and two cruisers arrive in the north-west on turn 5. Join them to the north gate push.",
    "The Directorate reserve comes in from the east on turn 7. Be through the gate and at the compound's west opening by then: only the Carthago matters.",
  ],
  plan: [
    { n: 1, path: [[6, 5], [17, 5], [27, 5], [33, 6]] },
    { n: 2, at: [14, 22], note: 'artillery cover' },
    { n: 2, path: [[17, 21], [24, 17], [27, 15]] },
    { n: 3, at: [40, 9], note: 'Decimator' },
    { n: 3, at: [40, 21], note: 'Decimator' },
    { n: 4, at: [4, 1], note: 'Sato T5' },
    { n: 5, path: [[34, 6], [40, 12], [46, 15]] },
    { n: 5, at: [58, 15], note: 'Reserve T7' },
  ],
  briefing: `
High Earth orbit. The Directorate's Gate.

Kessrin built it during the war, to stop a Galt fleet that never came this far: a wall across the approach to Earth, three gates, a turret railway behind it, and the Carthago fortress in its own compound at the back of the yard. Everything that reaches Earth orbit from the high stations passes under its guns.

We have to go through it. Nothing else gets us to Olympos.

The north gate sits at the end of a magnetic river; the Dragons' beams are useless inside it. The centre gate is mined. The yard holds two Abaddons, and Ruess says their missiles do not explode so much as erase.

Captain Sato is coming around the north with the Selene Kai. The Directorate's reserve is three days behind her. Destroy the Carthago, and the Gate is ours.`,
  terrain: '\n' + rows.join('\n'),
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
    o: { type: 2, army: 1 },                  // Talos, the gate guards
    Z: { type: 23, army: 1 },                 // Dragon turret (railway)
    y: { type: 24, army: 1 },                 // Hydra turret (railway)
    p: { type: 15, army: 1 },                 // Phoibos
    v: { type: 14, army: 1 },                 // Vulcan
    e: { type: 3, army: 1 },                  // Medusa
    K: { type: 52, army: 1 },                 // Pergamon dock (Union)
    w: { type: 18, army: 1 },                 // Wisp mine
    1: { type: 17, army: 1 },                 // Pandora armed mine
    X: { type: 43, army: 1 },                 // Abaddon (Quantum Decimator)
    F: { type: 54, army: 1 },                 // Carthago fortress (the objective)
    c: { type: 0, army: 1 },                  // Mars, the compound guard
    N: { type: 30, army: 1 },                 // Tiamat
    h: { type: 39, army: 1 },                 // Hannibal
    r: { type: 40, army: 1 },                 // Regulus
    f: { type: 49, army: 1 },                 // Fenrir
  },
  cargo: { '35,9': [2, 0], '35,21': [2, 3] },
  // the garrison holds the line: Union units walk to the nearest of these posts and fight from there
  routes: [[33, 6], [33, 14], [34, 15], [33, 24], [36, 8], [36, 22], [38, 12], [38, 18], [42, 15], [44, 9], [44, 21]]
    .map(([x, y]) => ({ prio: 1, x, y })),
  arrivals: [
    // Captain Sato and two cruisers, from the north-west on turn 5
    { turn: 4, army: 0, units: [{ type: 58, x: 3, y: 1 }, { type: 39, x: 5, y: 1 }, { type: 39, x: 1, y: 2 }] },
    // the Directorate reserve, from the east on turn 7
    { turn: 6, army: 1, units: [{ type: 42, x: 59, y: 6 }, { type: 31, x: 59, y: 15 }, { type: 49, x: 58, y: 4 }, { type: 49, x: 58, y: 26 }, { type: 51, x: 59, y: 24 }] },
  ],
};
