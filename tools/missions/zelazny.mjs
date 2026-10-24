// Mission 8, Gate: MAP-ZELAZNY, the Gate of Eden (docs/EXPANSION.md, draft 2).
// The blockade fortress: the walled complex of chambers, decks and narrow gates is copied from
// the original VARAMU map (its columns 28-59 on columns 12-43). The Carthago fortress sits in the
// central corridor; destroy it. Three docks inside the walls hold Talos and Medusa mecha, Wisp
// mines block the gates, and the Union's east reserve comes in on turns 4, 6 and 9. A captured
// Nodens anchors the central block (bot, PATH_BOT=1 AGGR=3: about half its runs with 22 machines). The player
// deploys along the west edge on three fronts; a magnetic river shelters the approach from the
// Talos beams, and comet tails (best cover, but entering one ends a move) are stepping stones.
import { REVIVED, revive } from './revive.mjs';
const COLS = 44, ROWS = 30;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
for (let y = 1; y <= ROWS; y++) { const x = 5 + Math.round(Math.sin(y / 3.2) * 1.4); set(x, y, 'm'); set(x + 1, y, 'm'); }   // magnetic river
for (const [x, y] of [[8, 4], [9, 4], [9, 5], [8, 14], [9, 15], [8, 16], [9, 24], [8, 25], [9, 26]]) set(x, y, 't');   // comet tails
for (const [x, y] of [[8, 1], [9, 1], [10, 1], [9, 2], [10, 2], [8, 30], [9, 30], [10, 29], [10, 30]]) set(x, y, ':');
for (const [x, y] of [[10, 9], [11, 9], [11, 10], [10, 20], [11, 20], [11, 21]]) set(x, y, 'a');
const terrain = g.map((r) => r.join('')).join('\n');

// units by position (inside the walls: VARAMU's own positions moved by -16 columns)
const U = {
  // player: north (7), centre (8), south (7)
  '1,2': 'G', '2,3': 'M', '1,4': 'K', '2,5': 'T', '1,6': 'L', '2,7': 'C', '3,3': 'D',
  '1,12': 'R', '2,13': 'H', '1,14': 'Q', '2,15': 'V', '1,16': 'S', '2,17': 'M', '3,14': 'K', '3,16': 'T',
  '1,23': 'M', '2,24': 'K', '1,25': 'D', '2,26': 'L', '1,27': 'C', '2,28': 'H', '3,25': 'Q',
  // the fortress and its docks
  '36,15': 'F', '29,15': 'N', '39,5': 'N', '39,25': 'N',
  // garrison (VARAMU's ship and mecha positions)
  '29,2': 'x', '27,28': 'x', '31,4': 'h', '32,26': 'h', '25,24': 'h', '32,4': 'o', '31,27': 'o', '25,27': 'o',
  '31,6': 't', '34,6': 't', '29,8': 't', '29,22': 't', '31,24': 't', '40,12': 't',
  '34,5': 'b', '32,7': 'b', '36,16': 'b', '39,16': 'b', '40,19': 'u', '39,14': 'u', '23,15': 'y', '35,15': 'y',
  '29,12': 'v', '27,23': 'r',
  '13,4': 't', '14,5': 'u', '14,24': 't', '15,25': 'u',   // the west chambers
  '27,13': 'n',   // the central block
  // mines at the gates
  '22,5': 'w', '22,26': 'w', '17,8': 'w', '17,22': 'w',
};
const units = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'ZELAZNY', title: 'Gate', screens: [3, 3],
  objective: { kind: 'fortress' }, turnLimit: 30, cap: 22, guards: 3, music: 21,
  goal: 'Destroy the Carthago fortress at the heart of the Gate.',
  chapter: "Chapter 8 · The Gate of Eden",
  transmission: "The Gate has held for forty years. It only has to hold for one more day. That is all the time I need.",
  strategy: ["Advance through the magnetic river on your side of the approach: the Talos beams can't reach you there. Use the comet debris as stepping stones, but remember a ship that enters it stops.", "Go in gate by gate. The gates are two hexes wide and mined: clear the Wisps with ranged fire first.", "The dock beside the Carthago is full of Talos. Bring it to zero early, before it empties onto the decks.", "Reserves come from the east on turns 4, 6 and 9. Hold the inner walls against them, and send everything else at the Carthago.", "Pandoras guard two of the gates, Echidna and Rockeye pods hold the walls."],
  plan: [{"n": 2, "path": [[3, 4], [9, 5], [14, 6]]}, {"n": 1, "path": [[3, 15], [9, 15], [14, 15]]}, {"n": 2, "path": [[3, 26], [9, 25], [14, 24]]}, {"n": 3, "path": [[18, 15], [26, 15]]}, {"n": 4, "at": [42, 15], "note": "Reserves T4 · T6 · T9"}],
  briefing: `
The Gate of Eden.

Every road to Olympos runs through here, and the Union has shut it. The blockade fortress is a maze: an outer wall, chambers of open deck where nothing can hide, gates two hexes wide with mines in them, and at the centre the Carthago, a fortress built to stop a fleet.

The docks inside the walls are full of Talos. Their beams will cut us apart on the decks, but not in the magnetic river along our side of the approach: hold there, then go in gate by gate. The comet debris west of the walls is the best cover in the sector; a ship that enters it stops there.

The Union's reserve is east of the Gate and will come through on the fourth turn, the sixth and the ninth. Destroy the Carthago and the road to Olympos is open.`,
  terrain,
  stamps: [{ map: 28, from: [28, 1], to: [59, 30], at: [12, 1] }],   // VARAMU's fortress complex
  units: '\n' + revive(units, [['w', '1', [0, 3]], ['b', '3', [0]], ['b', '5', [3]]]),
  legend: {
    ...REVIVED,   // cut ROM units, revived (revive.mjs)
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, K: { type: 2, army: 0 }, D: { type: 3, army: 0 },
    L: { type: 8, army: 0 }, C: { type: 9, army: 0 }, R: { type: 34, army: 0 }, S: { type: 38, army: 0 },
    H: { type: 39, army: 0 }, Q: { type: 40, army: 0 }, V: { type: 42, army: 0 },
    F: { type: 54, army: 1 },                 // Carthago fortress
    N: { type: 52, army: 1 },                 // Pergamon docks
    x: { type: 33, army: 1 }, h: { type: 39, army: 1 }, o: { type: 51, army: 1 },   // Hastur, Hannibal, Gulon
    t: { type: 2, army: 1 }, b: { type: 14, army: 1 }, u: { type: 3, army: 1 }, y: { type: 16, army: 1 },   // Talos, Vulcan, Medusa, Cyclops
    v: { type: 42, army: 1 }, r: { type: 40, army: 1 },   // Corvus, Regulus
    w: { type: 18, army: 1 },                 // Wisp mine
    n: { type: 32, army: 1 },                 // Nodens
  },
  cargo: { '29,15': [2, 2, 2], '39,5': [2, 2, 2], '39,25': [3, 3], '1,12': [8, 9] },
  // the east reserve (event turn 3 = turn 4, 5 = turn 6, 8 = turn 9)
  arrivals: [
    { turn: 3, army: 1, units: [{ type: 40, x: 44, y: 13 }, { type: 40, x: 44, y: 18 }, { type: 49, x: 44, y: 11 }, { type: 49, x: 44, y: 20 }] },
    { turn: 5, army: 1, units: [{ type: 33, x: 44, y: 15 }, { type: 49, x: 44, y: 10 }, { type: 49, x: 44, y: 21 }] },
    { turn: 8, army: 1, units: [{ type: 49, x: 44, y: 12 }, { type: 49, x: 44, y: 19 }, { type: 3, x: 44, y: 14 }, { type: 3, x: 44, y: 17 }, { type: 39, x: 44, y: 15 }, { type: 51, x: 44, y: 16 }] },
  ],
};
