// Remnant mission 6a, Moraine's Price (docs/STORY.md, Act II; the "deal" branch). Queen Moraine
// lends the remnant her raiders for one job: the Directorate supply depot at Kerberos Rock.
// The depot is a walled deck on the rock's east face with two Cortex command centres (the
// objective), a dock full of mecha and a ring of guns. The cartel's ships start on your south
// flank as joiners: you command them, and whatever survives stays with you. A Directorate
// relief column arrives from the east on turn 7.
const COLS = 44, ROWS = 30;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const blob = (cx, cy, rx, ry, c, holes = () => false) => {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    if (((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1 && !holes(x, y)) set(x, y, c);
  }
};
blob(30, 15, 9, 11, '#');                                   // Kerberos Rock (bedrock)
// the depot: a walled deck on the rock's east face, three gates (west, north, east)
for (let y = 7; y <= 23; y++) for (let x = 28; x <= 40; x++) set(x, y, (y === 7 || y === 23 || x === 28 || x === 40) ? 'W' : 'd');
for (const y of [14, 15, 16]) set(28, y, 'd');               // west gate
for (const x of [33, 34, 35]) set(x, 7, 'd');                // north gate
for (const y of [14, 16]) set(40, y, 'd');                   // east gate (the railway runs out of it)
for (let x = 40; x <= 41; x++) set(x, 15, '=');
for (let x = 29; x <= 39; x++) set(x, 15, '=');              // a turret railway across the deck
blob(12, 6, 3, 2, 'a'); blob(8, 22, 2, 2, 'a'); blob(18, 15, 1, 3, 'a');   // asteroids on the approach
blob(20, 26, 5, 2, ':', (x, y) => (x + y) % 4 === 0);        // meteoroids in the south
for (let y = 1; y <= ROWS; y++) for (const x of [42, 43, 44]) if (Math.abs(y - 15) > 4 || x === 44) set(x, y, 'm');   // magnetic shelf east
const terrain = g.map((r) => r.join('')).join('\n');

const U = {
  // the remnant, west
  '2,12': 'G', '3,10': 'M', '3,14': 'M', '2,8': 'T', '2,16': 'T', '4,12': 'K', '1,10': 'D', '1,14': 'D',
  '4,8': 'C', '4,16': 'L', '1,12': 'S', '5,11': 'H', '5,13': 'Q', '3,18': 'B',
  // Moraine's raiders, south-west (joiners)
  '6,26': 'x', '9,27': 'x', '7,28': 'j', '11,28': 'k', '4,25': 'k', '12,26': 'l', '3,27': 'l',
  // the depot
  '36,11': 'c', '36,19': 'c', '32,15': 'N',
  '30,15': 'd', '38,15': 'y',                                   // Dragon and Hydra on the railway's ends
  '31,10': 't', '31,20': 't', '38,13': 'u', '38,17': 'u', '33,9': 'm', '33,21': 'm', '27,14': 'm', '27,16': 'm',
  '17,9': 'h', '17,21': 'h', '16,15': 'r', '25,2': 'f', '31,28': 'f',
  '19,12': 'w', '19,18': 'w',
};
const units = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'PRICE', title: "Moraine's Price", screens: [3, 3], file: 'remnant/price',
  objective: { kind: 'command' }, turnLimit: 24, cap: 14, guards: 2, music: 14,
  goal: 'Destroy both Directorate command centres at the Kerberos depot within 24 turns.',
  chapter: 'Act II · The Fork · Mission 6',
  briefing: `
Kerberos Rock. The Directorate fuels half its patrols from a depot dug into the rock's east face, and Queen Moraine wants it burned. She has offered her raiders for the job, and her yards for our repairs afterwards. The price is not on the table yet. With Moraine it never is.

The depot is a walled deck with three gates, west, north and east, a turret railway across the middle and two command centres. Kill both and the depot goes dark. There is a dock on the deck, and it will not stay full for long.

The cartel ships are on our south flank. They take our orders today. A relief column is on its way from the inner yards; Sato puts it at the depot by the seventh turn.`,
  comms: [
    { speaker: 'moraine', text: "My ships, your orders, General. Bring them home and they're yours to keep. Lose them and we'll talk about the bill." },
    { speaker: 'sato', text: 'Her carriers are old Sirens with new paint. They still launch. That is what matters.' },
    { speaker: 'ruess', text: 'A Dragon sits on each end of that railway. Do not walk down the middle of the deck.' },
    { speaker: 'arkin', text: 'Pirates on our flank. Lovely. I will be watching them as closely as the Union.' },
    { speaker: 'kessrin', text: 'Pirates, General? I expected you to sink. I did not expect you to sink this low.' },
  ],
  strategy: [
    'Swing the cartel ships around the south of the rock and come at the north gate from the meteoroids; your own force takes the west gate.',
    'Kill the Wisp mines and the gun line in front of the west gate with ranged fire before you cross the open space.',
    'The Dragon and Hydra cover the railway: go along the walls, not down the deck.',
    'Bring the dock to zero before it empties its mecha onto the deck.',
    'The relief column comes from the east on turn 7. Have both command centres down by then, or hold the east wall.',
  ],
  plan: [
    { n: 2, path: [[5, 12], [14, 13], [22, 15], [28, 15]] },
    { n: 1, path: [[9, 27], [22, 25], [30, 4], [34, 7]] },
    { n: 4, at: [32, 15], note: 'Dock' },
    { n: 5, at: [43, 15], note: 'Relief T7' },
  ],
  terrain,
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, K: { type: 2, army: 0 }, D: { type: 3, army: 0 },
    B: { type: 10, army: 0 }, C: { type: 9, army: 0 }, L: { type: 8, army: 0 }, S: { type: 38, army: 0 },
    H: { type: 39, army: 0 }, Q: { type: 40, army: 0 },
    // Moraine's raiders: they join the remnant if they survive
    x: { type: 36, army: 0, joiner: true }, j: { type: 51, army: 0, joiner: true },
    k: { type: 50, army: 0, joiner: true }, l: { type: 8, army: 0, joiner: true },
    c: { type: 56, army: 1 }, N: { type: 52, army: 1 },          // Cortex, Pergamon dock
    d: { type: 23, army: 1 }, y: { type: 24, army: 1 },          // Dragon, Hydra
    t: { type: 2, army: 1 }, u: { type: 3, army: 1 }, m: { type: 0, army: 1 },
    h: { type: 39, army: 1 }, r: { type: 40, army: 1 }, f: { type: 49, army: 1 },
    w: { type: 18, army: 1 },                                     // Wisp mines
  },
  cargo: { '1,12': [8, 9], '6,26': [8], '9,27': [9], '32,15': [2, 0, 0] },
  // the relief column (event turn 6 = turn 7)
  arrivals: [
    { turn: 6, army: 1, units: [{ type: 42, x: 44, y: 15 }, { type: 39, x: 44, y: 13 }, { type: 39, x: 44, y: 17 }, { type: 49, x: 43, y: 12 }, { type: 49, x: 43, y: 18 }] },
  ],
};
