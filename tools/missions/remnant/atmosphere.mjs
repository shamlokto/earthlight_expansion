// Galt remnant, mission 10, Atmosphere (docs/STORY.md, Act III). The edge of Earth: the planet
// along the south edge, its atmosphere above it, and the Directorate's carrier group anchored in
// an asteroid ring in the north-east.
//   * atmosphere: a unit inside it can't be targeted by any weapon (it can still fire out); a
//     Directorate strike group waits in it and fires on anything that passes within reach;
//   * the carrier anchorage opens to the west (rows 6-8) and to the south (columns 47-49);
//     its fighters launch on the first turn and stay to guard it;
//   * the remnant brings an Abaddon captured at the Gate (it joins the roster if it survives):
//     its Quantum Decimator can erase a carrier from four hexes away;
//   * a Directorate relief group comes from the north on turn 8.
// Objective: sink every Directorate carrier within 22 turns.
const COLS = 59, ROWS = 30;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const blob = (pts, c) => { for (const [x, y] of pts) set(x, y, c); };

// Earth and its atmosphere along the south edge, swelling in the middle
rect(1, 25, COLS, 28, '~'); rect(1, 29, COLS, 30, '_');   // replaced by the ROM's own (stamp below)
rect(14, 23, 36, 24, '~'); rect(19, 22, 31, 22, '~'); rect(46, 24, 56, 24, '~');
// the anchorage: an asteroid ring, open to the west (rows 6-8) and to the south (columns 47-49)
rect(40, 2, 57, 2, 'a'); rect(40, 13, 57, 13, 'a'); rect(40, 2, 40, 13, 'a'); rect(57, 2, 57, 13, 'a');
rect(40, 6, 40, 8, '.'); rect(47, 13, 49, 13, '.');
rect(41, 2, 42, 3, 'a'); rect(55, 12, 56, 12, 'a');
// the approach: meteoroids, a magnetic eddy, plasma
rect(18, 4, 22, 7, ':'); blob([[23, 5], [17, 6], [20, 8], [27, 11], [28, 12], [28, 10]], ':');
rect(30, 15, 34, 18, 'm'); blob([[29, 16], [35, 17], [32, 19]], 'm');
rect(8, 10, 11, 13, 'p'); blob([[12, 11], [9, 14]], 'p');
rect(45, 17, 48, 19, 'g');
const rows = g.map((r) => r.join(''));

const U = {};
const place = (ch, list) => { for (const [x, y] of list) U[`${x},${y}`] = ch; };
// the remnant: deployment slots in the west, and the captured Abaddon
place('G', [[3, 12]]);
place('M', [[2, 6], [5, 17], [6, 8]]);
place('T', [[3, 19], [6, 4]]);
place('t', [[4, 9], [7, 15]]);
place('D', [[2, 15]]);
place('C', [[5, 6], [7, 19]]);
place('L', [[1, 9], [1, 18]]);
place('B', [[4, 3]]);
place('P', [[2, 21]]);
place('S', [[1, 12]]);
place('H', [[2, 3]]);
place('R', [[3, 16]]);
place('A', [[5, 12]]);
// more slots (owner, 2026-10-24: deploy more machines)
place('M', [[6, 11], [8, 4]]);
place('T', [[7, 13]]);
place('C', [[4, 21]]);
place('L', [[8, 10], [6, 20]]);
place('D', [[8, 17]]);
// the strike group in the atmosphere
place('o', [[12, 25], [20, 23], [35, 24]]);
place('e', [[16, 26], [31, 25], [50, 25]]);
place('c', [[24, 24], [53, 26]]);
place('9', [[9, 26], [38, 26]]);
// the anchorage: four carriers, their escort, and the screen at the west mouth
place('k', [[46, 5], [51, 10]]);
place('i', [[52, 5]]);
place('s', [[46, 10]]);
place('Q', [[49, 7]]);
place('r', [[43, 7], [48, 11]]);
place('f', [[42, 4], [43, 11], [54, 8]]);
place('x', [[37, 7], [38, 5], [38, 9]]);
place('1', [[35, 6], [35, 8]]);
const units = rows.map((_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'ATMOSPHERE', title: 'Atmosphere', file: 'remnant/atmosphere', screens: [4, 3],
  objective: { kind: 'carriers' }, turnLimit: 22, cap: 25, chaseGeneral: true, music: 17,
  goal: 'Sink every Directorate carrier within 22 turns. If the general falls, it is over.',
  chapter: "Chapter 10 · The edge of Earth's atmosphere",
  transmission: "You took my Gate and you took my Lysa. Look down, General. That is what you are fighting for, and it has never once thanked anyone.",
  comms: [
    { speaker: 'kessrin', text: "You took my Gate and you took my Lysa. Look down, General. That is what you are fighting for, and it has never once thanked anyone." },
    { speaker: 'sato', text: "Four carriers in the asteroid ring to the north-east. Every fighter that hits Olympos tomorrow launches from one of them." },
    { speaker: 'ruess', text: "The Abaddon we pulled out of the Gate's yard is flying. One Decimator, four hexes, no carrier survives it. Please don't waste it on a Mars." },
    { speaker: 'sato', text: "Stay out of reach of the atmosphere. Their strike group is sitting in it, and nothing we have can touch it in there." },
    { speaker: 'moraine', text: "Whatever happened between us, General, Kessrin owes us both. Sink his carriers and I'll stop counting." },
  ],
  strategy: [
    "The Directorate strike group sits in the atmosphere along the south: nothing can target a unit inside it. Keep your machines north of row 18 and let it waste its turns.",
    "Go for the anchorage's west mouth (rows 6-8): mines and three Fenrirs screen it. Clear them with artillery and fighters.",
    "Bring the captured Abaddon up behind the screen. From up to four hexes away its Quantum Decimator erases a carrier and everything next to it; don't move it on the turn it fires.",
    "Send a second group around through the south mouth (columns 47-49) so the carriers can't all hide in the corner.",
    "A relief group arrives from the north on turn 8. By then the carriers should already be burning.",
  ],
  plan: [
    { n: 1, at: [20, 23], note: 'untargetable' },
    { n: 2, path: [[7, 8], [20, 9], [33, 7], [39, 7]] },
    { n: 3, path: [[5, 12], [25, 12], [37, 9]] },
    { n: 4, path: [[8, 17], [28, 14], [44, 16], [48, 13]] },
    { n: 5, at: [30, 1], note: 'Relief T8' },
  ],
  briefing: `
The edge of Earth's atmosphere, above the night side.

Olympos is one day away, and every fighter that will defend it tomorrow is sitting tonight in four Directorate carriers, anchored inside an asteroid ring at the top of the atmosphere. If they are still there when we reach Olympos, we will not get there.

Below the anchorage, Kessrin has put a strike group into the atmosphere itself. Up there nothing can target a machine; it can still fire out. It is a wall we cannot shoot, so we will not walk along it.

We have something of our own this time. The Abaddon we took from the Gate's yard is repaired, and its Quantum Decimator is armed. Ruess wants it back in one piece.

Sink all four carriers. Their relief group is two days out.`,
  terrain: '\n' + rows.join('\n'),
  // the atmosphere and Earth: Render unto Babylon's own south edge (ROM map 30, rows 35-40)
  stamps: [{ map: 30, from: [1, 35], to: [59, 40], at: [1, 25] }],
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
    S: { type: 38, army: 0 },                 // Selene
    H: { type: 39, army: 0 },                 // Hannibal
    R: { type: 40, army: 0 },                 // Regulus
    A: { type: 43, army: 0, joiner: true },   // Abaddon captured at the Gate: joins the roster if it survives
    o: { type: 2, army: 1 },                  // Talos (strike group, in the atmosphere)
    e: { type: 3, army: 1 },                  // Medusa
    c: { type: 0, army: 1 },                  // Mars
    9: { type: 21, army: 1 },                 // Naga rail pod
    k: { type: 34, army: 1 },                 // Artemis carrier
    i: { type: 35, army: 1 },                 // Iris carrier
    s: { type: 36, army: 1 },                 // Siren carrier
    Q: { type: 31, army: 1 },                 // Asura-II
    r: { type: 40, army: 1 },                 // Regulus
    f: { type: 49, army: 1 },                 // Fenrir
    x: { type: 49, army: 1 },                 // Fenrir, the screen at the west mouth
    1: { type: 17, army: 1 },                 // Pandora armed mine
  },
  // the fighters each carrier puts out on the first turn
  cargo: { '46,5': [8], '51,10': [10], '52,5': [9], '46,10': [8] },
  // the carriers and their fighters keep to the anchorage; the strike group stays where it is
  routes: [[44, 7], [47, 4], [50, 8], [53, 6], [45, 11], [50, 12], [42, 9]].map(([x, y]) => ({ prio: 1, x, y })),
  arrivals: [
    // the Directorate relief group, from the north on turn 8
    { turn: 7, army: 1, units: [{ type: 42, x: 26, y: 1 }, { type: 49, x: 34, y: 1 }, { type: 2, x: 28, y: 1 }] },
  ],
};
