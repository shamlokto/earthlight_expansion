// Galt remnant, mission 12, Kessrin (docs/STORY.md, Act III, the finale). Kessrin's fleet in low
// Earth orbit, drawn up around his flagship, the Leviathan, above the atmosphere.
//   * the Leviathan (type 59, the only one in his fleet) must be sunk;
//   * a gravity ring around the flagship opens to the west and the north-east; magnetic belts
//     are the beam-proof lanes in; asteroid fields give the mecha cover;
//   * Kessrin's guard: Directorate Talos (level-6 Talos), two Abaddons, two battleships, cruisers;
//     two carriers put out fighters on the first turn;
//   * the atmosphere and Earth along the south edge (nothing inside the atmosphere can be
//     targeted); Directorate reserves on turns 6 and 11; the Olympos garrison joins on turn 7.
// Objective: sink the Leviathan within 30 turns. It arrives on turn 14. Epilogue by the campaign's choice (deal/refuse).
const COLS = 59, ROWS = 40;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const blob = (pts, c) => { for (const [x, y] of pts) set(x, y, c); };
const LX = 46, LY = 18;   // the Leviathan

// the gravity ring around the flagship (radius 6-7), open to the west and the north-east
for (let y = 1; y <= ROWS; y++) for (let x = 1; x <= COLS; x++) {
  const dx = x - LX, dy = (y - LY) * 1.15, d = Math.hypot(dx, dy);
  if (d >= 6.2 && d < 7.6 && !(Math.abs(dy) < 3 && dx < 0) && !(dx > 2 && dy < -2)) set(x, y, 'g');
}
// the lanes in: two magnetic belts from the west
rect(8, 9, 34, 10, 'm'); rect(8, 25, 30, 26, 'm'); blob([[35, 11], [36, 12], [31, 24], [32, 23]], 'm');
// asteroid fields and meteoroids for the mecha; plasma
rect(14, 14, 18, 20, 'a'); blob([[13, 16], [19, 17], [16, 21], [15, 13]], 'a');
rect(28, 15, 31, 19, 'a'); blob([[27, 17], [32, 18], [29, 20]], 'a');
rect(22, 3, 27, 5, ':'); rect(38, 28, 43, 30, ':'); rect(52, 4, 56, 7, ':');
rect(4, 30, 10, 32, 'p'); rect(50, 28, 56, 30, 'p');
const rows = g.map((r) => r.join(''));

const U = {};
const place = (ch, list) => { for (const [x, y] of list) U[`${x},${y}`] = ch; };
// the remnant: two groups in the west, north and south of the asteroids
place('G', [[3, 18]]);
place('M', [[2, 8], [6, 12], [5, 24], [7, 28]]);
place('T', [[3, 11], [4, 27]]);
place('t', [[7, 14], [8, 22]]);
place('D', [[2, 21], [6, 6]]);
place('C', [[8, 8], [9, 27], [5, 16]]);
place('L', [[1, 13], [1, 25]]);
place('B', [[6, 19]]);
place('P', [[2, 15]]);
place('Y', [[3, 30]]);
place('S', [[1, 18]]);
place('H', [[2, 5]]);
place('R', [[4, 33]]);
place('A', [[5, 21]]);
// Kessrin's fleet: the Leviathan, its guard, the line, the carriers
// the Leviathan and its Directorate guard arrive last, on turn 14 (arrivals below)
place('X', [[37, 14], [37, 22]]);
place('Q', [[41, 13]]);
place('W', [[41, 23]]);
place('c', [[38, 9]]);
place('r', [[34, 20], [37, 31]]);
place('k', [[53, 12], [53, 24]]);
place('f', [[31, 12], [31, 23], [40, 5], [42, 32]]);
place('u', [[24, 13], [24, 22]]);
place('o', [[26, 9], [26, 26]]);
place('l', [[33, 13], [33, 24]]);
// the grand armada (owner, 2026-10-24): more battleships in place of light craft; they hold the
// ring until the Leviathan arrives
place('Q', [[39, 7], [50, 27]]);
place('W', [[39, 33], [50, 9]]);
place('n', [[36, 10], [36, 25]]);
place('e', [[30, 21], [32, 15]]);
place('h', [[35, 17], [36, 27], [33, 6], [52, 18], [45, 30]]);
const units = rows.map((_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'KESSRIN', title: 'Kessrin', file: 'remnant/kessrin', screens: [4, 4],
  objective: { kind: 'flagship', type: 59 }, turnLimit: 30, cap: 20, chaseGeneral: true, music: 29,
  goal: "Sink Marshal Kessrin's flagship, the Leviathan, within 28 turns. If the general falls, it is over.",
  chapter: 'Chapter 12 · Low Earth orbit',
  transmission: "I gave the Union a victory, General, and you gave it a conscience. Only one of those was ever going to fit on a battleship.",
  comms: [
    { speaker: 'kessrin', text: "I gave the Union a victory, General, and you gave it a conscience. Only one of those was ever going to fit on a battleship." },
    { speaker: 'sato', text: "His whole line is coming for you, General, not for the ring. The Leviathan isn't on the plot yet; when it comes, it comes from the east. The ring opens to the west and to the north-east. The magnetic belts get us to the west opening without his beams finding us." },
    { speaker: 'ruess', text: "Two Abaddons in front of the ring, and his guard is Directorate Talos. Ours is the last Decimator on our side. If it reaches four hexes of that ship, the war is over." },
    { speaker: 'moraine', text: "Every Union captain in orbit is listening to this battle. Win it loudly, General." },
    { speaker: 'kessrin', text: "Lysa thought you were worth a duel. I think you are worth exactly one missile." },
  ],
  strategy: [
    "Advance along the two magnetic belts: his battleships' and turrets' beams can't touch a unit inside them. The asteroid fields in between shelter the mecha.",
    "Kill the two Abaddons in front of the gravity ring with fighters before any of your capital ships comes within four hexes of them.",
    "The gravity ring opens to the west and the north-east. Hold the west opening with the mecha while a fast group swings around to the north-east.",
    "Bring your own Abaddon up behind the mecha. From four hexes away its Decimator ends the Leviathan and everything next to it. Don't move it on the turn it fires.",
    "His fast units come for the general at once: keep that machine in the second line and let them break on your mecha. His battleships, cruisers and Abaddons hold the ring until the Leviathan comes. Reserves arrive from the east on turns 6 and 11; the Olympos garrison joins you on turn 7.",
    "Kessrin holds the Leviathan back until turn 14, then brings it in from the east with six Directorate Talos. Have your Abaddon and your best guns ready for it.",
  ],
  plan: [
    { n: 1, path: [[8, 9], [22, 9], [34, 10]] },
    { n: 1, path: [[8, 25], [20, 25], [30, 25]] },
    { n: 2, at: [37, 14], note: 'Decimator' },
    { n: 2, at: [37, 22], note: 'Decimator' },
    { n: 3, path: [[35, 11], [44, 9], [51, 12]] },
    { n: 3, path: [[30, 18], [39, 18]] },
    { n: 4, path: [[5, 21], [22, 18], [36, 18]] },
    { n: 5, at: [58, 20], note: 'Reserves T6, T11' },
    { n: 5, at: [3, 2], note: 'Olympos T7' },
  ],
  briefing: `
Low Earth orbit. The end of it.

Kessrin has nowhere left to go but down. He has drawn up everything that still answers to him above the atmosphere: two battleships, cruisers, two carriers, and a ring of gravity flux where his flagship will make its stand. The Leviathan was laid down to end the Galt war. He is holding it back with his Directorate guard until we have bled on his line, and he means it to end ours.

Every Union captain in orbit is watching. Most of them have not chosen a side yet; they are waiting to see who is still flying tomorrow.

The ring opens to the west and to the north-east. The magnetic belts lead to the west opening, and inside them his beams can't find us. His two Abaddons stand in front of the ring. We have one of our own.

Sink the Leviathan, General. Everything else is just the Union, and the Union can come home.`,
  ending: `
The Leviathan breaks apart above the night side, and its pieces burn in the atmosphere like a second sunrise.

Kessrin's fleet does not surrender all at once. It surrenders captain by captain, each one waiting for the one beside it, until the only ships still flying are ours.

The Union comes home.`,
  endings: {
    deal: `
The Leviathan breaks apart above the night side, and its pieces burn in the atmosphere like a second sunrise.

Kessrin's captains surrender one by one. Queen Moraine's carriers are the first to dock at Olympos, flying the cartel's colours under the Union's, and nobody quite dares to ask her to take them down.

The debt is paid, she says. The interest is another matter. The general signs the cartel's charter in the room where the coup was planned, and Captain Sato says nothing at all, which is how the general knows she disapproves.

The Union comes home, with new friends it will have to watch for a long time.`,
    refuse: `
The Leviathan breaks apart above the night side, and its pieces burn in the atmosphere like a second sunrise.

Kessrin's captains surrender one by one. The cartel is gone from the high orbits; the yards it held are the Union's again, and the debts it kept die with its ledgers.

At Olympos the general reads the list of the dead aloud, Lieutenant Arkin's name among the first, and orders the parade ground closed for good.

The Union comes home, poorer and owing nobody.`,
  },
  terrain: '\n' + rows.join('\n'),
  // the atmosphere and Earth: Render unto Babylon's own south edge (ROM map 30, rows 35-40)
  stamps: [{ map: 30, from: [1, 35], to: [59, 40], at: [1, 35] }],
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
    A: { type: 43, army: 0 },                 // Abaddon, the remnant's last Decimator
    V: { type: 59, army: 1 },                 // the Leviathan, Kessrin's flagship (the objective)
    d: { type: 60, army: 1, level: 6 },       // Directorate Talos, the flagship guard
    X: { type: 43, army: 1, hold: 14 },                 // Abaddon (Quantum Decimator)
    Q: { type: 30, army: 1, hold: 14 },                 // Tiamat
    W: { type: 31, army: 1, hold: 14 },                 // Asura-II
    c: { type: 42, army: 1 },                 // Corvus
    h: { type: 39, army: 1, hold: 14 },                 // Hannibal
    r: { type: 40, army: 1 },                 // Regulus
    k: { type: 34, army: 1 },                 // Artemis carrier
    f: { type: 49, army: 1 },                 // Fenrir
    u: { type: 51, army: 1 },                 // Gulon
    o: { type: 60, army: 1, level: 6 },       // Directorate Talos, the forward pickets
    l: { type: 8, army: 1 },                  // Lobster
    n: { type: 9, army: 1 },                  // Crane
    e: { type: 3, army: 1 },                  // Medusa
  },
  cargo: { '53,12': [8, 9, 10], '53,24': [8, 9, 10] },
  // the light units hunt the general (chaseGeneral); battleships, cruisers and Abaddons hold until
  // turn 14 (hold); the carriers keep to the ring
  routes: [[37, 16], [37, 20], [40, 11], [40, 25], [34, 14], [34, 22], [51, 10], [51, 26], [42, 18]].map(([x, y]) => ({ prio: 1, x, y })),
  arrivals: [
    // the boss: the Leviathan and its Directorate guard, from the east on turn 14
    { turn: 13, army: 1, units: [{ type: 59, x: LX + 10, y: LY }, ...[[-2, 0], [2, 0], [-1, -2], [1, -2], [-1, 2], [1, 2]].map(([dx, dy]) => ({ type: 60, x: LX + 10 + dx, y: LY + dy, level: 6 }))] },
    // Directorate reserves from the east, turns 6 and 11
    { turn: 5, army: 1, units: [{ type: 39, x: 59, y: 14 }, { type: 39, x: 59, y: 22 }, { type: 49, x: 58, y: 10 }, { type: 2, x: 59, y: 18 }, { type: 3, x: 58, y: 26 }] },
    { turn: 10, army: 1, units: [{ type: 31, x: 59, y: 18 }, { type: 42, x: 58, y: 12 }, { type: 42, x: 58, y: 24 }, { type: 49, x: 59, y: 30 }, { type: 51, x: 59, y: 6 }] },
    // the Olympos garrison joins the remnant from the north-west on turn 7
    { turn: 6, army: 0, units: [{ type: 31, x: 3, y: 1 }, { type: 42, x: 6, y: 1 }, { type: 39, x: 1, y: 3 }, { type: 0, x: 8, y: 2 }] },
  ],
};
