// Galt remnant, mission 9, Vane's Last Stand (docs/STORY.md, Act III). A comet crossing high
// Earth orbit: its body in the north-east, its tail sweeping west along the top of the map.
// Commander Lysa Vane waits in the open with her squadron and calls the duel.
//   * Vane flies a Directorate Talos (a level-8 Talos; the only Talos on the map) and must be
//     destroyed; her squadron is craft, mecha and artillery, no other Talos;
//   * comet tail: a unit inside it can't be targeted (and stops when it enters); the comet body
//     can't be entered;
//   * asteroid belts in the middle give the mecha cover; a plasma lake in the south;
//   * her flagship escort, a Hastur with cruisers, arrives from the east on turn 6.
// Objective: destroy Vane's Talos within 20 turns.
const COLS = 44, ROWS = 30;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const blob = (pts, c) => { for (const [x, y] of pts) set(x, y, c); };

// the comet: body in the north-east, the tail streaming west and widening
rect(37, 3, 41, 6, '_'); blob([[38, 2], [39, 2], [36, 4], [36, 5], [42, 4], [40, 7]], '_');
for (let x = 8; x <= 35; x++) {
  const w = Math.max(1, Math.round((35 - x) / 7)), y0 = 4 - Math.floor(w / 2) + ((x >> 2) & 1);
  rect(x, Math.max(1, y0), x, Math.min(ROWS, y0 + w + 1), 't');
}
rect(33, 3, 35, 7, 't');
// asteroid belts across the middle, meteoroids, a plasma lake in the south
rect(14, 12, 17, 15, 'a'); blob([[13, 13], [18, 14], [15, 16], [16, 11]], 'a');
rect(24, 20, 27, 23, 'a'); blob([[23, 21], [28, 22], [25, 24], [26, 19]], 'a');
rect(20, 10, 22, 11, ':'); blob([[29, 14], [30, 15], [30, 13], [9, 20], [10, 21]], ':');
rect(12, 25, 19, 28, 'p'); rect(14, 29, 17, 30, 'p');
rect(35, 25, 37, 28, 'm');
const rows = g.map((r) => r.join(''));

const U = {};
const place = (ch, list) => { for (const [x, y] of list) U[`${x},${y}`] = ch; };
// the remnant: deployment slots in the west and south-west
place('G', [[3, 17]]);
place('M', [[2, 12], [5, 21], [6, 14]]);
place('T', [[3, 23], [7, 18]]);
place('t', [[5, 11], [4, 26]]);
place('D', [[2, 20]]);
place('C', [[6, 9], [7, 25]]);
place('L', [[1, 15], [2, 28]]);
place('B', [[4, 14]]);
place('Y', [[1, 22]]);
place('S', [[1, 18]]);
place('R', [[2, 9]]);
// Vane and her squadron (no other Talos: destroying hers wins)
place('V', [[33, 17]]);
place('c', [[30, 16], [31, 19], [34, 14], [35, 20], [36, 22], [29, 21]]);
place('e', [[32, 22], [29, 12]]);
place('l', [[28, 18], [36, 16], [31, 10], [34, 25], [38, 24], [37, 10]]);
place('n', [[37, 18], [30, 24]]);
place('v', [[38, 13]]);
place('k', [[39, 21], [40, 15]]);
place('u', [[41, 18]]);
place('2', [[22, 17]]);
const units = rows.map((_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'LASTSTAND', title: "Vane's Last Stand", file: 'remnant/laststand', screens: [3, 3],
  objective: { kind: 'destroyType', type: 2 }, turnLimit: 20, cap: 14, music: 22,
  goal: "Destroy Commander Vane's Directorate Talos within 20 turns. If the general falls, it is over.",
  chapter: 'Chapter 9 · The comet, high Earth orbit',
  comms: [
    { speaker: 'vane', text: "No gates, no walls, no Marshal. Just you, me, and a comet. Come and take your turn, General." },
    { speaker: 'sato', text: "She's left her flagship behind to make a point. It'll be here by the sixth day. So should we be done by then." },
    { speaker: 'ruess', text: "Mind the tail. Anything inside it can't be targeted, ours or hers. She knows that better than we do." },
    { speaker: 'kessrin', text: "Lysa. You have one task, and a comet to do it in. Do not make me watch you fail." },
    { speaker: 'vane', text: "He never could stand to watch. That's the difference between us." },
  ],
  strategy: [
    "Vane's Talos is the only one on the map: destroy it and the battle is won, whatever else is left.",
    "Use the asteroid belts in the middle as cover and close in from two sides. She is level 8: wear her down with several attackers, never one at a time.",
    "Keep away from the comet's tail in the north: a machine inside it can't be targeted, and Vane will use it if you fight her there.",
    "Her Lobsters and Cranes will go for your weakest machines. Keep the Selene and the general behind the mecha line.",
    "Her flagship escort, a Hastur and two cruisers, arrives from the east on turn 6. Have her surrounded before then.",
  ],
  plan: [
    { n: 2, path: [[7, 15], [15, 17], [24, 17], [31, 17]] },
    { n: 2, path: [[7, 23], [18, 22], [26, 25], [32, 21]] },
    { n: 3, at: [20, 4], note: 'comet tail' },
    { n: 5, at: [43, 17], note: 'Escort T6' },
  ],
  briefing: `
A comet crossing high Earth orbit, two days out from Olympos.

Commander Lysa Vane has sent us an invitation. No ambush this time, no minefield: she is waiting in the open with her squadron, in front of the comet, and she has told the whole Directorate where she is. Kessrin's best pilot wants the duel she was denied at the magnetic river.

She will have it. Every road to Olympos passes within reach of her squadron, and as long as she flies, Kessrin has an answer to anything we try.

The comet's tail is her friend: nothing inside it can be targeted. Fight her in open space, from two sides, and do not let her pick the ground.

Her flagship and its escort are coming up behind her. Destroy her Talos before they arrive.`,
  terrain: '\n' + rows.join('\n'),
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 },                  // Mars
    T: { type: 1, army: 0 },                  // Titan
    t: { type: 2, army: 0 },                  // Talos (yours do not count for the objective)
    D: { type: 3, army: 0 },                  // Medusa
    C: { type: 9, army: 0 },                  // Crane
    L: { type: 8, army: 0 },                  // Lobster
    B: { type: 10, army: 0 },                 // Brontes
    Y: { type: 16, army: 0 },                 // Cyclops
    S: { type: 38, army: 0 },                 // Selene
    R: { type: 40, army: 0 },                 // Regulus
    V: { type: 2, army: 1, level: 8 },        // Commander Vane's Directorate Talos // standin: 60
    c: { type: 0, army: 1 },                  // Mars
    e: { type: 3, army: 1 },                  // Medusa
    l: { type: 8, army: 1 },                  // Lobster
    n: { type: 9, army: 1 },                  // Crane
    v: { type: 14, army: 1 },                 // Vulcan
    k: { type: 50, army: 1 },                 // Cerberus
    u: { type: 51, army: 1 },                 // Gulon
    2: { type: 19, army: 1 },                 // Remora decoy drone
  },
  // the squadron fights in front of the comet, not in its tail
  routes: [[30, 17], [27, 14], [27, 26], [22, 18], [18, 20], [20, 24], [33, 21], [24, 13]].map(([x, y]) => ({ prio: 1, x, y })),
  arrivals: [
    // Vane's flagship escort, from the east on turn 6
    { turn: 5, army: 1, units: [{ type: 33, x: 44, y: 17 }, { type: 39, x: 44, y: 14 }, { type: 39, x: 44, y: 20 }, { type: 49, x: 43, y: 11 }, { type: 49, x: 43, y: 23 }] },
  ],
};
