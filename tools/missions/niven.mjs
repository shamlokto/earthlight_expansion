// Mission 6, Decimators: MAP-NIVEN, the Verne Docks (docs/EXPANSION.md).
// Three loaded CR-1 Crabs carry Quantum Decimators east toward a rebel Foundry, inside the
// Union's whole convoy. Destroy all three before any reaches the east edge. The middle of the
// map is a broken belt of meteoroids, plasma and gravity flux that slows everything down (a Crab
// pays 3 to cross meteoroids or flux), with a few open lanes; a grey dock in the belt holds an
// Athena and a Crane; minefields close the east exits but for two gaps.
//
// Changes from the design: the player deploys across both lanes in the east, between the convoy
// and its exits (a move-9 Crab can't be caught from behind), and the convoy is a light escort
// with a slow rearguard (bot playtests). Approximations: the carriers put their Lobsters out at
// the end of the Union's first turn (the AI launches all cargo), not in waves on turns 3 and 6.
import { REVIVED, revive } from './revive.mjs';
const COLS = 44, ROWS = 20;
let seed = 6;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000);
const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) grid[y - 1][x - 1] = c; };
const get = (x, y) => (x >= 1 && y >= 1 && x <= COLS && y <= ROWS ? grid[y - 1][x - 1] : null);
const blob = (cx, cy, r, c, fill = 0.85) => {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    const d = Math.hypot(x - cx, (y - cy) * 1.15);
    if (d <= r - 0.5 || (d <= r + 0.5 && rnd() < fill - 0.4)) if (rnd() < fill) set(x, y, c);
  }
};
const river = (pts, w, c) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
      for (let d = 0; d < w; d++) set(x, y + d, c);
    }
  }
};

// the belt: meteoroid fields, plasma pools and a gravity-flux river winding through it
for (const [x, y, r, c] of [[18, 3, 2, ':'], [20, 9, 3, ':'], [17, 16, 3, ':'], [25, 5, 2, 'p'], [24, 14, 3, ':'], [29, 10, 2, 'p'],
  [31, 3, 3, ':'], [30, 17, 3, ':'], [35, 8, 2, ':'], [35, 14, 2, 'a'], [22, 1, 1, 'a'], [27, 19, 1, 'a'], [13, 6, 1, 'a'], [12, 14, 2, 'a'],
  [6, 2, 2, '#'], [5, 19, 2, '#'], [40, 1, 1, 'a'], [41, 19, 1, 'a']]) blob(x, y, r, c);
river([[16, 12], [21, 12], [26, 9], [32, 12], [37, 11]], 2, 'g');
blob(30, 10, 2, 'm', 0.9);   // a magnetic patch before the player's line: shelter from the convoy's beams
// open lanes through the belt (rows 6-7 and 15) and the dock's clearing
for (let x = 14; x <= 38; x++) { set(x, 6, '.'); set(x, 15, '.'); }
// ... broken every few hexes by meteoroid shoals, so the transports slow down where they can be caught
for (const x of [24, 25, 31, 32, 36]) for (const y of [5, 6, 7, 14, 15, 16]) set(x, y, ':');
for (const [x, y] of [[26, 10], [26, 11], [27, 11], [25, 11], [26, 12], [27, 12]]) set(x, y, '.');
// minefield lanes along the east edge leave gaps on rows 6-7 and 15
const MINES = [];
for (let y = 1; y <= ROWS; y++) if (![6, 7, 15].includes(y) && y % 2) MINES.push([40, y], [42, y + 1 > ROWS ? y : y + 1]);

// units ----------------------------------------------------------------------------------
const U = {}, taken = (x, y) => U[`${x},${y}`];
const near = (x, y, ok = '.') => {
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const c = get(x + dx, y + dy);
    if (c && ok.includes(c) && !taken(x + dx, y + dy)) return [x + dx, y + dy];
  }
  throw new Error(`no free '${ok}' hex near ${x},${y}`);
};
const put = (ch, x, y, ok = '.') => { const [px, py] = near(x, y, ok); U[`${px},${py}`] = ch; return [px, py]; };

// the player: deployed across both lanes in the east of the belt, between the convoy and its exits
for (const [ch, x, y] of [['G', 38, 10], ['M', 34, 6], ['M', 35, 7], ['M', 34, 15], ['T', 35, 14], ['X', 36, 6], ['X', 36, 15], ['D', 37, 8],
  ['C', 33, 9], ['C', 33, 12], ['L', 37, 13], ['S', 38, 12], ['A', 38, 8], ['H', 37, 11]]) put(ch, x, y);
put('L', 23, 6); put('C', 23, 15);
const DOCK = put('N', 26, 11);   // the grey dock in the belt
// the convoy: the three Crabs in the middle of it, heading east
// the convoy starts in the west and must get past the player to the east exits
const CRABS = [put('K', 3, 7), put('K', 4, 10), put('K', 3, 13)];
// a light escort around the Crabs, cruisers on the flanks ...
for (const [ch, x, y] of [['u', 5, 6], ['u', 5, 14], ['f', 7, 8], ['f', 7, 12], ['c', 4, 3], ['c', 4, 17], ['V', 1, 9],
  ['r', 12, 4], ['r', 12, 17], ['h', 9, 2], ['h', 9, 19]]) put(ch, x, y);
// ... and a slow rearguard of mecha and gunboats that arrives at the lanes late
for (const [ch, x, y] of [['m', 1, 4], ['m', 1, 16], ['m', 2, 6], ['m', 2, 14], ['t', 1, 7], ['t', 1, 12], ['t', 2, 10], ['e', 3, 5],
  ['e', 3, 15], ['b', 6, 4], ['b', 6, 16], ['v', 4, 8], ['v', 4, 12]]) put(ch, x, y);
const CARRIERS = [put('I', 9, 3), put('I', 9, 18)];
for (const [x, y] of MINES) put('w', x, y);
const units = grid.map((row, j) => row.map((_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'NIVEN', title: 'Decimators', screens: [3, 2],
  objective: { kind: 'destroyType', type: 27, edge: 'east' }, turnLimit: 18, cap: 16, music: 15,
  goal: 'Destroy all three Decimator transports (the loaded Crabs) before any reaches the east edge.',
  chapter: "Chapter 6 · The Verne Docks",
  transmission: "One shot clears a hex. Three will clear a Foundry that shelters traitors. I take no pleasure in arithmetic, General. Only in results.",
  strategy: ["Don't fight the convoy. Only the three loaded Crabs matter.", "The Crabs will use the open lanes, rows 6-7 and 15. Block both with fast units.", "A Crab that has to stop next to one of yours can go no further this turn. Make a screen, then kill them.", "The belt slows everyone, the Crabs most. Hit them while they're in it, and send bombers at them first.", "The two machines hidden in the belt can take the grey dock: an Athena and a Crane.", "Some of the mines are Pandoras that shoot back at three hexes, and Remora drones soak up fire. Don't waste shots on the Remoras."],
  plan: [{"n": 2, "path": [[33, 6], [24, 6], [14, 7]]}, {"n": 2, "path": [[34, 15], [24, 15], [14, 14]]}, {"n": 5, "path": [[23, 9], [26, 11]]}, {"n": 1, "at": [4, 10], "note": "Decimator transports"}, {"n": 3, "at": [40, 10], "note": "Screen line"}],
  briefing: `
The Verne Docks. A year ago Galt tried to steal the Quantum Decimators stored here, and the Union stopped them. Now the Union has taken them out itself.

Three CR-1 transports are carrying Decimators east, to the rebel Foundry that sheltered our wounded. One shot clears a hex and everything around it. Three of them will leave nothing standing.

The transports travel inside the whole Union convoy: destroyers, cruisers, two carriers, and a column of hunters and gunboats behind. We are across their path, in the east of the belt, between the convoy and the exits. Don't fight the convoy. Kill the Crabs, all three, before any of them reaches the east edge. A transport that has to stop next to one of ours can go no further this turn.

The belt in the middle of the sector is meteoroids, plasma and gravity flux. It slows everyone, the Crabs most of all, and the two open lanes through it are where the convoy will try to pass. Two of ours are already hiding in the belt, and a grey dock out there still holds an Athena and a Crane: take it if you can.

Minefields close the east exits, all but the lanes. Whatever the Crabs do, they must not reach them.`,
  terrain: '\n' + grid.map((r) => r.join('')).join('\n'),
  units: '\n' + revive(units, [['w', '1', [0, 5, 10]], ['w', '2', [3, 13]]]),
  legend: {
    ...REVIVED,   // cut ROM units, revived (revive.mjs)
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, X: { type: 2, army: 0 }, D: { type: 3, army: 0 },
    C: { type: 9, army: 0 }, L: { type: 8, army: 0 }, S: { type: 38, army: 0 }, A: { type: 34, army: 0 }, H: { type: 39, army: 0 },
    N: { type: 52, army: 0, neutral: true },  // grey dock
    // the Union convoy
    K: { type: 27, army: 1 },                 // CR-1 Crab, loaded with a Decimator
    u: { type: 51, army: 1 }, f: { type: 49, army: 1 }, c: { type: 9, army: 1 }, V: { type: 38, army: 1 },
    m: { type: 0, army: 1 }, t: { type: 2, army: 1 }, e: { type: 3, army: 1 }, b: { type: 50, army: 1 },
    r: { type: 40, army: 1 }, h: { type: 39, army: 1 }, v: { type: 14, army: 1 }, I: { type: 35, army: 1 },
    w: { type: 18, army: 1 },                 // Wisp mine
  },
  cargo: { [`${DOCK}`]: [4, 9], [`${CARRIERS[0]}`]: [8, 8], [`${CARRIERS[1]}`]: [8, 8] },
  // the convoy heads east along the lanes
  // (the AI walks to the highest-priority waypoint it can reach this turn, so they sit close together)
  routes: [7, 15].flatMap((y) => Array.from({ length: 15 }, (_, k) => ({ prio: k + 1, x: Math.min(COLS, 2 + 3 * k), y: y === 7 && 2 + 3 * k >= 40 ? 6 : y }))),
};
