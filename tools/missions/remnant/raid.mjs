// Remnant mission 6b, The Ashfall Raid (docs/STORY.md, Act II; the "refuse" branch). The
// General turns Moraine down and strikes first: the cartel fleet lies at anchor in the Ashfall
// scrapyard, a long asteroid field full of hulks. Sink every cartel carrier (objective
// `carriers`). Two grey docks in the field can be captured for their cargo. Remora decoys,
// Pandora mines and Rockeye pods guard the anchorage; Moraine's raiders come back from a run on
// turn 5 from the east. In the story Lt. Arkin falls in this raid (text only).
const COLS = 59, ROWS = 20;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const blob = (cx, cy, rx, ry, c, holes = () => false) => {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    if (((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1 && !holes(x, y)) set(x, y, c);
  }
};
// the scrapyard: asteroid islands with meteoroid shoals between them and open lanes for ships
for (const [cx, cy, rx, ry] of [[16, 4, 3, 2], [14, 15, 2, 3], [25, 9, 2, 2], [33, 3, 3, 1], [32, 16, 3, 2], [42, 9, 2, 3], [50, 4, 2, 1], [51, 16, 3, 2]]) blob(cx, cy, rx, ry, 'a');
for (const [cx, cy, rx, ry] of [[21, 3, 2, 1], [20, 17, 2, 1], [29, 12, 1, 2], [37, 9, 2, 2], [46, 13, 1, 2], [45, 2, 2, 1]]) blob(cx, cy, rx, ry, ':', (x, y) => (x + y) % 5 === 0);
// the anchorage: bedrock moorings with decks for the two grey docks
blob(38, 10, 1, 1, '#'); set(38, 10, 'd'); blob(22, 10, 1, 1, '#'); set(22, 10, 'd');
for (let y = 1; y <= ROWS; y++) set(1, y, 'm'), set(2, y, y % 4 ? 'm' : '.');   // magnetic shelter at your back
for (let x = 55; x <= 59; x++) for (let y = 8; y <= 12; y++) set(x, y, 'g');   // gravity well east
const terrain = g.map((r) => r.join('')).join('\n');

const U = {
  // the remnant, west
  '3,10': 'G', '4,8': 'M', '4,12': 'M', '3,6': 'T', '3,14': 'T', '5,10': 'K', '2,8': 'D', '2,12': 'D',
  '5,6': 'C', '5,14': 'L', '2,10': 'S', '6,9': 'H', '6,11': 'Q', '4,4': 'B', '4,16': 'V',
  // cartel carriers at anchor (the targets)
  '28,6': 'x', '35,13': 'x', '44,6': 'a', '48,11': 'e', '56,15': 'x',
  // escorts and guards
  '28,8': 'j', '35,12': 'j', '45,7': 'k', '47,9': 'k', '53,13': 'j', '30,14': 'l', '41,14': 'l', '49,7': 'l',
  '24,6': '5', '34,6': '5', '40,15': '5',   // Rockeye pods on the islands' edges
  '19,9': '2', '30,10': '2', '45,11': '2',  // Remora decoys
  '20,12': '1', '27,4': '1', '39,6': '1',   // Pandora mines
  '24,14': 'c', '46,17': 'c',               // Camelii transports
  // grey docks to capture
  '22,10': 'N', '38,10': 'N',
};
const units = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'RAID', title: 'The Ashfall Raid', screens: [4, 2], file: 'remnant/raid',
  objective: { kind: 'carriers' }, turnLimit: 22, cap: 15, music: 25,
  goal: "Sink every cartel carrier in the Ashfall scrapyard within 22 turns.",
  chapter: 'Act II · The Fork · Mission 6',
  briefing: `
We said no. Moraine's price was a dock at Olympos when this is over, and the right to sell anything that flies out of it. The General would not buy a war from one tyrant to sell it to another.

She will not forgive that, and she will not wait. So we hit her first. The cartel fleet rides at anchor in the Ashfall scrapyard, a field of dead hulls and broken rock. Her carriers are the cartel's teeth: sink every one and Moraine is just a woman with a scrapyard.

Two grey docks sit on the moorings, half-stripped and unmanned. Take them and their cargo is ours. Her raiders are out on a run and will come home from the east on the fifth turn.`,
  comms: [
    { speaker: 'moraine', text: "You could have had my fleet, General. Now you'll have to take it, one hull at a time." },
    { speaker: 'arkin', text: "Let me lead the strike on the far carriers. I've waited all war to fly through that yard." },
    { speaker: 'sato', text: 'Arkin, stay on the formation. Those Remora drones are bait. Do not chase them.' },
    { speaker: 'ruess', text: 'The two moorings in the middle still have docks on them. Park a unit next to one and it is ours.' },
    { speaker: 'kessrin', text: 'Pirates killing traitors. Traitors killing pirates. I shall simply wait and count the survivors.' },
  ],
  ending: `Arkin went in after the last carrier alone. We found his Athena drifting in the yard after the fighting stopped, its canopy open to space. The cartel fleet is broken, and the remnant has one less ace. Sato logged the loss in three lines and did not speak for the rest of the watch.`,
  strategy: [
    'Remora drones are decoys: shoot through them, don\'t chase them. Pandora mines sit in the lanes; clear them with ranged fire.',
    'Advance down the open lanes between the islands; carriers and ships can\'t enter the asteroids or meteoroids.',
    'Capture the two grey docks on the moorings early: they hold reinforcements for you.',
    'Moraine\'s raiders return from the east on turn 5. Sink the near carriers first, then turn to meet them.',
    'The last carrier anchors by the gravity well in the far east. Keep enough fast units to finish it before turn 22.',
  ],
  plan: [
    { n: 2, path: [[6, 10], [16, 9], [28, 7]] },
    { n: 3, at: [22, 10], note: 'Grey dock' }, { n: 3, at: [38, 10], note: 'Grey dock' },
    { n: 4, at: [58, 4], note: 'Raiders T5' },
    { n: 5, path: [[36, 12], [46, 13], [54, 15]] },
  ],
  terrain,
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, K: { type: 2, army: 0 }, D: { type: 3, army: 0 },
    B: { type: 10, army: 0 }, C: { type: 9, army: 0 }, L: { type: 8, army: 0 }, S: { type: 38, army: 0 },
    H: { type: 39, army: 0 }, Q: { type: 40, army: 0 }, V: { type: 42, army: 0 },
    x: { type: 36, army: 1 }, a: { type: 34, army: 1 }, e: { type: 38, army: 1 },   // cartel carriers: Siren, Artemis, Selene
    j: { type: 51, army: 1 }, k: { type: 50, army: 1 }, l: { type: 8, army: 1 },     // Gulon, Cerberus, Lobster
    1: { type: 17, army: 1 }, 2: { type: 19, army: 1 }, 5: { type: 22, army: 1 },   // Pandora, Remora, Rockeye
    c: { type: 28, army: 1 },                                                       // Camelii transport
    N: { type: 52, army: 0, neutral: true },                                       // grey docks
  },
  cargo: { '2,10': [8, 9], '28,6': [8], '35,13': [9], '44,6': [8, 8], '48,11': [9], '22,10': [9, 8], '38,10': [0, 3, 1] },
  // the raiders come home (event turn 4 = turn 5)
  arrivals: [
    { turn: 4, army: 1, units: [{ type: 51, x: 58, y: 3 }, { type: 51, x: 58, y: 17 }, { type: 50, x: 59, y: 5 }, { type: 8, x: 59, y: 15 }, { type: 9, x: 59, y: 2 }] },
  ],
};
