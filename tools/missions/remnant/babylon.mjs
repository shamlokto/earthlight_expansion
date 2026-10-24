// Remnant mission 7a, Babylon Run (docs/STORY.md, Act II; the "deal" branch). With Moraine's
// carriers at its side the remnant assaults the Babylon wreck, which Kessrin has turned into a
// Directorate anchorage: his heavy battleship Tiamat "Sentinel" is moored off the hull's bow,
// sheltered by the hull. Sink it (objective flagship, type 30; it is the only Tiamat on the map). The hull and
// its railways are BABYLON's, stamped mid-map; plasma clouds and a magnetic belt shape the
// approach. Cartel carriers start as joiners. Directorate reinforcements on turns 5 and 9.
const COLS = 59, ROWS = 30;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const blob = (cx, cy, rx, ry, c, holes = () => false) => {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    if (((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1 && !holes(x, y)) set(x, y, c);
  }
};
// a magnetic belt from the south-west up to the hull's stern: the beam-proof road in
for (let x = 1; x <= 26; x++) { const y = 27 - Math.round(x * 0.45); set(x, y, 'm'); set(x, y + 1, 'm'); set(x, y - 1, 'm'); }
blob(10, 6, 4, 3, 'p'); blob(20, 3, 3, 1, 'p');               // plasma clouds in the north-west
blob(54, 5, 4, 3, ':', (x, y) => (x + 2 * y) % 6 === 0);      // meteoroids north-east
blob(52, 26, 5, 2, 'a', (x, y) => (x * y) % 7 === 0);         // asteroid field south-east
blob(14, 16, 1, 1, 'a'); blob(20, 12, 1, 1, ':');              // debris on the approach
const terrain = g.map((r) => r.join('')).join('\n');

// hull positions: BABYLON's columns 33-57, rows 2-17 placed at (25, 8)
const U = {
  // the remnant, south-west and west
  '2,22': 'G', '3,20': 'M', '4,22': 'M', '2,18': 'T', '3,24': 'T', '5,20': 'K', '1,20': 'D', '1,24': 'D',
  '5,24': 'C', '6,22': 'L', '2,14': 'S', '3,12': 'B', '4,14': 'H', '4,16': 'Q', '1,16': 'V', '6,18': 'R',
  // Moraine's carriers and escorts, north-west (joiners)
  '6,2': 'x', '9,1': 'y', '4,3': 'j', '12,2': 'k', '3,1': 'l', '8,3': 'l',
  // the anchorage: the Sentinel moored off the hull's bow, turrets and mecha inside the hull
  '33,9': 'F',                                      // Tiamat "Sentinel", the flagship
  '42,11': 'd', '38,13': 'd', '31,19': 'h2',
  '35,11': 't', '39,15': 't', '40,16': 't', '34,13': 'm', '45,12': 'm', '29,18': 'u', '37,18': 'u',
  '30,8': 'h', '35,7': 'v',
  // the screen outside
  '22,9': 'r', '23,21': 'r', '27,5': 'f', '45,4': 'f', '50,10': 'v', '51,18': 'h', '24,26': 'h', '33,27': 'f',
  '46,24': '4', '30,4': '3',
};
const units = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => {
  const v = U[`${i + 1},${j + 1}`]; return v === 'h2' ? 'Y' : v || '.';
}).join('')).join('\n');

export default {
  name: 'BABYLON', title: 'Babylon Run', screens: [4, 3], file: 'remnant/babylon',
  objective: { kind: 'flagship', type: 30 }, turnLimit: 28, cap: 16, music: 29,
  goal: 'Sink the Directorate battleship Sentinel, moored at the Babylon wreck, within 28 turns.',
  chapter: 'Act II · The Fork · Mission 7',
  briefing: `
Babylon. The wreck of the great cannon ship still hangs in high orbit where the last war left it, and Kessrin has made it his forward anchorage. The battleship Sentinel lies moored off the hull's bow, under the shelter of its walls, and while it is there no convoy reaches Earth without his leave.

Moraine's carriers are with us, as she promised. She has not yet named her price. Sato thinks that is the most dangerous thing about her.

The hull is a maze of chambers and railways, with Dragon turrets on the rails. The magnetic belt from the south-west runs right up to the stern: their beams cannot follow us along it. Sink the Sentinel and the anchorage dies with it. Directorate ships are on their way from the inner yards; the first by the fifth turn, more by the ninth.`,
  comms: [
    { speaker: 'moraine', text: "Two of my carriers, full of fighters. Consider it a deposit, General. I'll send the bill when Kessrin's dead." },
    { speaker: 'sato', text: 'The belt reaches the stern. We go in under it, quietly, and then very loudly.' },
    { speaker: 'arkin', text: "I flew past Babylon in the last war. Never thought I'd be going inside it." },
    { speaker: 'ruess', text: 'The Sentinel is a Tiamat. Big guns, slow turn. Get under its arcs and hit it from the decks.' },
    { speaker: 'kessrin', text: 'Babylon never fired, General. The Sentinel will. I have told its captain to aim for the pirates first. Old habits.' },
  ],
  strategy: [
    'Take the magnetic belt from the south-west up to the hull\'s stern: the Directorate beams can\'t reach units inside it.',
    'Bring the cartel carriers down from the north-west and launch their fighters at the screen outside the hull.',
    'Inside the hull, two Dragons and a Hydra cover the railways. Mecha can cross the hull; ships cannot. Kill the turrets from cover before you cross.',
    'The Sentinel is the only target. It is moored off the bow, north of the hull: come at it over the hull and from the north-west, and surround it to halve its evasion.',
    'Reinforcements arrive from the east on turn 5 and from the north on turn 9. Leave a rear guard on the belt.',
  ],
  plan: [
    { n: 1, path: [[4, 22], [14, 21], [24, 16]] },
    { n: 2, path: [[8, 2], [18, 7], [28, 6]] },
    { n: 4, at: [33, 9], note: 'Sentinel' },
    { n: 5, at: [58, 15], note: 'Reinforcements T5' }, { n: 5, at: [36, 1], note: 'T9' },
  ],
  terrain,
  stamps: [{ map: 30, from: [33, 2], to: [57, 17], at: [25, 8] }],   // Babylon's hull
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, K: { type: 2, army: 0 }, D: { type: 3, army: 0 },
    B: { type: 10, army: 0 }, C: { type: 9, army: 0 }, L: { type: 8, army: 0 }, S: { type: 38, army: 0 },
    H: { type: 39, army: 0 }, Q: { type: 40, army: 0 }, V: { type: 42, army: 0 }, R: { type: 15, army: 0 },
    // Moraine's carriers and escorts (joiners)
    x: { type: 34, army: 0, joiner: true }, y: { type: 36, army: 0, joiner: true },
    j: { type: 51, army: 0, joiner: true }, k: { type: 50, army: 0, joiner: true }, l: { type: 9, army: 0, joiner: true },
    F: { type: 30, army: 1, level: 4 },                           // Tiamat "Sentinel"
    d: { type: 23, army: 1 }, Y: { type: 24, army: 1 },           // Dragon, Hydra on the railways
    t: { type: 2, army: 1 }, m: { type: 0, army: 1 }, u: { type: 3, army: 1 },
    r: { type: 40, army: 1 }, f: { type: 49, army: 1 }, v: { type: 42, army: 1 }, h: { type: 39, army: 1 },
    3: { type: 20, army: 1 }, 4: { type: 21, army: 1 },          // Echidna, Naga pods
  },
  cargo: { '2,14': [8, 9], '6,2': [8, 8, 9], '9,1': [9, 10] },
  arrivals: [
    { turn: 4, army: 1, units: [{ type: 39, x: 59, y: 13 }, { type: 39, x: 59, y: 17 }, { type: 49, x: 59, y: 11 }, { type: 49, x: 59, y: 19 }] },
    { turn: 8, army: 1, units: [{ type: 42, x: 36, y: 1 }, { type: 49, x: 33, y: 1 }, { type: 49, x: 39, y: 1 }, { type: 9, x: 42, y: 1 }] },
  ],
};
