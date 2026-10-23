// Mission 4, Le Guin Again: MAP-GIBSON, the Le Guin sector (docs/EXPANSION.md).
// The admiral who ordered the assassination flies a captured Galt Nodens and runs for the east
// edge with his escort. Sink it before it gets away. Two gravity-flux belts (railguns lose 50%
// against units in them) cross the map; mecha can't enter gravity flux, so they use the gaps.
// The Nodens' great missile battery only hits ships and structures: small craft are safe from
// it, and only its escorts protect it.
const COLS = 44, ROWS = 20;
// gravity belts: columns, with the rows left open as gaps
const BELTS = [{ x: [12, 13, 14], gaps: [4, 5, 15, 16] }, { x: [26, 27, 28], gaps: [9, 10, 11, 12] }];
const DOTS = { // meteoroids and asteroids, by row: [x, char]
  2: [[5, ':'], [6, ':'], [33, 'a']], 3: [[5, ':'], [6, ':'], [7, ':'], [34, 'a'], [35, 'a']], 4: [[6, ':'], [35, 'a']],
  7: [[20, 'a']], 8: [[19, 'a'], [20, 'a']], 13: [[38, ':'], [39, ':']], 14: [[37, ':'], [38, ':'], [39, ':']],
  17: [[4, 'a'], [5, 'a'], [21, ':'], [22, ':']], 18: [[5, 'a'], [21, ':'], [22, ':'], [23, ':']], 19: [[40, 'a'], [41, 'a']],
};
const rows = [];
for (let y = 1; y <= ROWS; y++) {
  const r = new Array(COLS).fill('.');
  for (const b of BELTS) if (!b.gaps.includes(y)) for (const x of b.x) r[x - 1] = 'g';
  for (const [x, c] of DOTS[y] || []) r[x - 1] = c;
  rows.push(r.join(''));
}
// units by position
const U = {
  // the player's deployment slots, west edge (open space, so any machine can take them)
  '2,7': 'G', '2,9': 'M', '3,10': 'M', '2,11': 'T', '3,12': 'C', '2,13': 'L', '3,8': 'S', '1,10': 'C',
  // the admiral's flight
  '18,10': 'N', '17,7': 'r', '17,13': 'r', '21,7': 'h', '20,12': 'h', '23,6': 'f', '23,14': 'f', '18,4': 'c', '18,16': 'c',
};
const units = rows.map((_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'GIBSON', title: 'Le Guin Again', screens: [3, 2],
  objective: { kind: 'destroyType', type: 32, edge: 'east' }, turnLimit: 14, cap: 8, music: 6,
  goal: 'Sink the admiral\'s Nodens before it reaches the east edge.',
  briefing: `
The Le Guin sector, where the Union sank the Tiamat a year ago. Fitting.

Admiral Varga signed the order that killed the commander. We have the transcript now, and so does he: he is running for Olympos aboard the Nodens, the Galt super-battleship the Union captured at Babylon and repainted in its own colours.

The Nodens carries the heaviest missile battery ever built, but it was designed to kill warships. Our fighters and mecha are beneath its notice. Its escorts are not: Regulus and Hannibal cruisers, Fenrir destroyers, a pair of Cranes.

It is slow. It has a long way to go. Sink it before it crosses the east edge.

Mind the gravity belts: their escorts shelter in the flux, where railguns lose half their punch, and our mecha can't enter it at all.`,
  terrain: '\n' + rows.join('\n'),
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 },                  // Mars
    T: { type: 1, army: 0 },                  // Titan
    C: { type: 9, army: 0 },                  // Crane
    L: { type: 8, army: 0 },                  // Lobster
    S: { type: 38, army: 0 },                 // Selene
    N: { type: 32, army: 1 },                 // Nodens, the admiral's flagship
    r: { type: 40, army: 1 },                 // Regulus cruiser
    h: { type: 39, army: 1 },                 // Hannibal cruiser
    f: { type: 49, army: 1 },                 // Fenrir destroyer
    c: { type: 9, army: 1 },                  // Union Crane
  },
  // the fleet heads east (the AI walks to the highest-priority waypoint it can reach)
  routes: [{ prio: 1, x: 22, y: 10 }, { prio: 2, x: 31, y: 10 }, { prio: 3, x: 37, y: 10 }, { prio: 4, x: 44, y: 10 }],
};
