// Mission 4, Le Guin Again: MAP-GIBSON, the Le Guin sector (docs/EXPANSION.md).
// The admiral who ordered the assassination flies a captured Galt Nodens and runs for the east
// edge with his escort. Sink it before it gets away. The busiest of the first four maps: 4x2
// screens. The fleet's lane runs through the middle rows; two gravity-flux belts cross it (railguns
// lose 50% against units in them, mecha can't enter, and the gaps are where mecha cross), with a
// plasma river and a magnetic belt between them. Meteoroid and asteroid fields on both flanks hide
// Union missile gunboats and give small craft cover; Wisp minefields flank the lane in the east.
// The Nodens' great missile battery only hits ships and structures: small craft are safe from it,
// and its escorts and screens are the real threat. Two destroyers join the fleet from the east on
// turn 6. (The close escort stays at Regulus x2, Hannibal x2, Fenrir x1: with the ROM's
// encirclement rule a tighter escort is unbeatable.)
const COLS = 59, ROWS = 20;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
let seed = 4404;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
const cube = (x, y) => { const r = y - ((x - (x & 1)) >> 1); return [x, r, -x - r]; };
const dist = (a, b, c, d) => { const p = cube(a, b), q = cube(c, d); return Math.max(...p.map((v, i) => Math.abs(v - q[i]))); };
const set = (x, y, ch) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = ch; };
const blob = (cx, cy, r, ch, p = 1) => { for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r; x <= cx + r; x++) { const d = dist(cx, cy, x, y); if (d < r || (d === r && rnd() < p)) set(x, y, ch); } };
const line = (pts, r, ch, p = 1) => { for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2; for (let k = 0; k <= n; k++) blob(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), r, ch, p); } };

// flank cover: meteoroids and asteroids north and south of the lane
blob(8, 3, 2, ':', 0.5); blob(8, 18, 2, 'a', 0.5); blob(29, 3, 2, ':', 0.6); blob(30, 18, 2, ':', 0.6);
blob(40, 2, 1, 'a', 0.5); blob(40, 18, 2, 'a', 0.5); blob(55, 3, 2, ':', 0.5); blob(55, 18, 2, 'a', 0.5); blob(20, 1, 1, 'a', 0.4);
// two gravity belts across the map, each with a gap north and south of the lane for mecha
for (let y = 1; y <= ROWS; y++) {
  if (![5, 6, 14, 15].includes(y)) for (const x of [14, 15, 16]) set(x, y, 'g');
  if (![4, 5, 15, 16].includes(y)) for (const x of [34, 35, 36]) set(x, y, 'g');
}
line([[25, 1], [23, 7], [26, 13], [24, 20]], 0, 'p');            // plasma river
line([[45, 1], [47, 8], [44, 14], [46, 20]], 1, 'm', 0.4);       // magnetic belt (beam-proof)
const terrain = g.map((r) => r.join('')).join('\n');

const U = {
  // the player's force, west edge (open space, so any machine can take a slot)
  '2,7': 'G', '2,9': 'M', '3,10': 'M', '2,11': 'T', '3,12': 'C', '2,13': 'L', '3,8': 'S', '1,10': 'C',
  '4,6': 'B', '4,14': 'B', '3,5': 'L', '3,15': 'D',
  // the admiral's flight
  '22,10': 'N', '21,7': 'r', '21,13': 'r', '25,8': 'h', '24,12': 'h', '27,10': 'f',
  // the forward screens and the flanks
  '33,5': 'm', '33,15': 'm', '44,6': 't', '44,14': 't', '40,10': 'e', '48,10': 'd',
  '29,3': 'c', '30,17': 'c', '18,4': 'u', '18,16': 'u',
  // minefields beside the lane
  '51,5': 'w', '52,6': 'w', '52,15': 'w',
};
const units = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'GIBSON', title: 'Le Guin Again', screens: [4, 2],
  objective: { kind: 'destroyType', type: 32, edge: 'east' }, turnLimit: 22, cap: 12, music: 6,
  goal: 'Sink the admiral\'s Nodens before it reaches the east edge.',
  briefing: `
The Le Guin sector, where the Union sank the Tiamat a year ago. Fitting.

Admiral Varga signed the order that killed the commander. We have the transcript now, and so does he: he is running for Olympos aboard the Nodens, the Galt super-battleship the Union captured at Babylon and repainted in its own colours.

The Nodens carries the heaviest missile battery ever built, but it was designed to kill warships. Our fighters and mecha are beneath its notice. Its escorts are not: two Regulus and two Hannibal cruisers and a Fenrir destroyer, with mecha screens and destroyers ahead, gunboats in the rocks on both flanks, and two more destroyers coming from the east.

It is slow. It has a long way to go. Sink it before it crosses the east edge. Bombers are what kill battleships.

Mind the gravity belts: their escorts shelter in the flux, where railguns lose half their punch, and our mecha can't enter it at all except through the gaps.`,
  terrain: '\n' + terrain,
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, C: { type: 9, army: 0 }, L: { type: 8, army: 0 },
    S: { type: 38, army: 0 }, B: { type: 10, army: 0 }, D: { type: 3, army: 0 },
    N: { type: 32, army: 1 },                 // Nodens, the admiral's flagship
    r: { type: 40, army: 1 },                 // Regulus cruiser
    h: { type: 39, army: 1 },                 // Hannibal cruiser
    f: { type: 49, army: 1 },                 // Fenrir destroyer
    m: { type: 0, army: 1 }, t: { type: 2, army: 1 }, u: { type: 3, army: 1 },
    e: { type: 50, army: 1 }, d: { type: 51, army: 1 }, c: { type: 16, army: 1 }, w: { type: 18, army: 1 },
  },
  // two destroyers come in from the east on turn 6 (event turn 5)
  arrivals: [{ turn: 5, army: 1, units: [{ type: 49, x: 59, y: 4 }, { type: 51, x: 59, y: 16 }] }],
  // the fleet heads east along the lane (the AI walks to the highest-priority waypoint it can reach)
  routes: [{ prio: 1, x: 28, y: 10 }, { prio: 2, x: 37, y: 10 }, { prio: 3, x: 45, y: 10 }, { prio: 4, x: 52, y: 10 }, { prio: 5, x: 59, y: 10 }],
};
