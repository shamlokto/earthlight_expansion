// Remnant mission 5, Vane's Gambit (docs/STORY.md, Act II). Commander Lysa Vane springs her
// trap in the Hesper magnetic band: her Directorate Talos and its escort sit inside the field,
// where your beams can't touch them, and two ambush groups come out of the meteoroid banks to
// the north and south on turns 3 and 5. Kill Vane's Talos: she is the only Union Talos on the
// map (the destroyType objective marks the type). Railguns and missiles win this one.
const COLS = 44, ROWS = 20;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const blob = (cx, cy, rx, ry, c, holes = () => false) => {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    if (((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1 && !holes(x, y)) set(x, y, c);
  }
};
// the magnetic band: a wide river running north-south through the middle, bulging east
for (let y = 1; y <= ROWS; y++) { const c = 24 + Math.round(Math.sin(y / 3) * 2); for (let x = c - 4; x <= c + 4 + (y > 6 && y < 15 ? 3 : 0); x++) set(x, y, 'm'); }
blob(16, 2, 4, 1, ':', (x, y) => (x + y) % 6 === 0);           // north meteoroid bank (ambush)
blob(17, 19, 4, 1, ':', (x, y) => (x * 2 + y) % 7 === 0);      // south meteoroid bank (ambush)
blob(10, 10, 2, 2, 'a');                                        // a rock in your path
blob(37, 4, 2, 1, 'a'); blob(38, 17, 2, 1, 'a');                 // Vane's flank rocks
for (let y = 8; y <= 13; y++) set(43, y, 'p'); for (let y = 9; y <= 12; y++) set(44, y, 'p');   // plasma east
const terrain = g.map((r) => r.join('')).join('\n');

const U = {
  // the remnant, coming in from the west
  '2,10': 'G', '3,8': 'M', '3,12': 'M', '2,6': 'T', '2,14': 'T', '4,10': 'K', '1,8': 'D',
  '1,12': 'B', '4,6': 'C', '4,14': 'L', '1,10': 'S', '5,9': 'H', '5,11': 'Q',
  // Vane and her escort inside the band
  '31,10': 'v', '29,8': 'm', '29,12': 'm', '32,7': 'u', '32,13': 'u', '27,10': 'r',
  '34,10': 'c', '35,6': 'h', '35,14': 'h', '38,10': 'y',
  // pods in the band's edge
  '22,6': '4', '22,15': '3',
};
const units = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'GAMBIT', title: "Vane's Gambit", screens: [3, 2], file: 'remnant/gambit',
  objective: { kind: 'destroyType', type: 2 }, turnLimit: 16, cap: 13, music: 15,
  goal: "Destroy Commander Vane's Directorate Talos within 16 turns.",
  chapter: 'Act II · The Fork · Mission 5',
  briefing: `
The Hesper band. A river of magnetic storm a hundred kilometres wide, and the only quiet road from the Belt to the inner yards. We have used it three times. Someone noticed.

Sato's pickets found Directorate machines parked inside the field, engines cold, waiting. A Talos with the Security Directorate's black crest leads them. Commander Lysa Vane does not wait in the open; she waits where beam fire cannot reach her and lets her enemies come to her.

So we come to her, on our terms. The meteoroid banks north and south of the band are too quiet. Expect company from both of them. Kill Vane and her escort will scatter; leave her alive and she will hound us all the way to Earth.`,
  comms: [
    { speaker: 'sato', text: 'Field strength is off the scale. Beams will bend around anything sitting in that band. Railguns and missiles only.' },
    { speaker: 'arkin', text: "Give me the north flank. If she's hiding in there, I'll flush her out." },
    { speaker: 'vane', text: 'General. You taught us to fight in this field. Shall we see who learned it better?' },
    { speaker: 'ruess', text: "The rock in the middle of the approach is solid enough to hide a Talos behind. Use it, don't admire it." },
    { speaker: 'kessrin', text: 'Commander Vane has my full confidence. Bring me the General, or bring me the wreck.' },
  ],
  strategy: [
    'Vane sits inside the magnetic band: beams cannot reach her there. Bring Titans, Medusas, Cranes and Brontes to the front.',
    'Advance in one block behind the central rock; do not string out across the open space.',
    'Ambush groups come out of the north meteoroid bank on turn 3 and the south bank on turn 5. Keep a rear guard ready for each.',
    'Pin her escort with your ships, then put every railgun and missile on her Talos. She is level 9: surround her to halve her evasion.',
    'The general rides in the second line. Losing the general ends the campaign.',
  ],
  plan: [
    { n: 2, path: [[4, 10], [10, 10], [18, 10]] },
    { n: 3, at: [16, 2], note: 'Ambush T3' }, { n: 3, at: [17, 19], note: 'Ambush T5' },
    { n: 4, path: [[18, 10], [25, 9], [30, 10]] },
    { n: 1, at: [31, 10], note: 'Vane' },
  ],
  terrain,
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, K: { type: 2, army: 0 }, D: { type: 3, army: 0 },
    B: { type: 10, army: 0 }, C: { type: 9, army: 0 }, L: { type: 8, army: 0 }, S: { type: 38, army: 0 },
    H: { type: 39, army: 0 }, Q: { type: 40, army: 0 },
    v: { type: 2, army: 1, level: 9 },        // Vane's Directorate Talos (standin: 60)
    m: { type: 0, army: 1, level: 3 }, u: { type: 3, army: 1, level: 3 }, r: { type: 40, army: 1 }, c: { type: 42, army: 1 },
    h: { type: 39, army: 1 }, y: { type: 16, army: 1 },
    3: { type: 20, army: 1 }, 4: { type: 21, army: 1 },   // Echidna, Naga pods
  },
  cargo: { '1,10': [8, 9] },
  // ambush groups (event turn 2 = turn 3, 4 = turn 5)
  arrivals: [
    { turn: 2, army: 1, units: [{ type: 0, x: 14, y: 2 }, { type: 0, x: 17, y: 1 }, { type: 3, x: 19, y: 2 }, { type: 9, x: 15, y: 3 }] },
    { turn: 4, army: 1, units: [{ type: 0, x: 15, y: 19 }, { type: 3, x: 18, y: 20 }, { type: 9, x: 20, y: 19 }, { type: 8, x: 14, y: 20 }] },
  ],
};
