// Remnant mission 7b, Burning Yards (docs/STORY.md, Act II; the "refuse" branch). With her
// fleet sunk, Moraine falls back on the Ashfall yards, a walled shipyard on a bedrock island,
// guarded by the Goliath fortress she bought from a Union quartermaster. Kessrin sees his chance
// and sends a Directorate task force to finish both of them: it arrives from the north on turn 4
// and from the east on turn 8, and it shoots at everyone. Destroy the Goliath (objective
// fortress). A grey dock on the north mooring can be captured.
const COLS = 59, ROWS = 20;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const blob = (cx, cy, rx, ry, c, holes = () => false) => {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    if (((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1 && !holes(x, y)) set(x, y, c);
  }
};
blob(40, 10, 11, 8, '#');                                    // the yards' bedrock island
// the yard: walled decks, gates west and south-west, a railway loop around the fortress
for (let y = 4; y <= 16; y++) for (let x = 33; x <= 48; x++) set(x, y, (y === 4 || y === 16 || x === 33 || x === 48) ? 'W' : 'd');
for (const y of [9, 10, 11]) set(33, y, 'd');                // west gate
for (const x of [36, 37]) set(x, 16, 'd');                   // south gate
for (const x of [44, 45]) set(x, 4, 'd');                    // north gate
for (let x = 36; x <= 45; x++) { set(x, 7, '='); set(x, 13, '='); }
for (let y = 7; y <= 13; y++) { set(36, y, '='); set(45, y, '='); }
// the burning approach: plasma from the yards' furnaces, asteroids, a comet's tail
blob(22, 5, 4, 2, 'p'); blob(24, 16, 3, 2, 'p');
blob(14, 10, 2, 2, 'a'); blob(28, 10, 1, 1, 'a');
for (let x = 8; x <= 20; x++) if (x % 2) set(x, 2, 't');      // comet tail along the top
set(40, 1, '#'); set(41, 1, '#'); set(40, 2, 'd');            // the north mooring
for (let y = 1; y <= ROWS; y++) for (const x of [57, 58, 59]) set(x, y, 'm');   // magnetic band east
const terrain = g.map((r) => r.join('')).join('\n');

const U = {
  // the remnant, west
  '2,10': 'G', '3,8': 'M', '3,12': 'M', '2,6': 'T', '2,14': 'T', '4,10': 'K', '1,8': 'D', '1,12': 'D',
  '4,6': 'C', '4,14': 'L', '1,10': 'S', '5,9': 'H', '5,11': 'Q', '3,4': 'B', '3,16': 'V', '5,13': 'R', '5,7': 'P',
  // Moraine's last stand in the yards
  '40,10': 'F',                                     // Goliath fortress
  '38,9': 'N', '43,11': 'N',                        // cartel docks
  '36,7': 'd', '45,13': 'y', '45,7': 'd',           // Dragon and Hydra turrets on the loop
  '35,10': '5', '35,12': '5', '41,6': 'j', '39,14': 'k',
  '27,7': 'j', '27,13': 'k', '26,10': 'l', '31,3': 'x', '31,17': 'x',
  '25,8': '2', '25,12': '2', '29,6': '1', '29,14': '1',
  // grey dock on the north mooring
  '40,2': 'n',
};
const units = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'YARDS', title: 'Burning Yards', screens: [4, 2], file: 'remnant/yards',
  objective: { kind: 'fortress' }, turnLimit: 26, cap: 17, guards: 2, music: 26,
  goal: 'Destroy the Goliath fortress in the Ashfall yards within 26 turns.',
  chapter: 'Act II · The Fork · Mission 7',
  briefing: `
Arkin is gone. We sank the cartel fleet and paid for it with the best pilot the remnant had. Nobody says his name on the open channel. Everybody flies a little closer to the General's machine.

Moraine has fallen back on the Ashfall yards: walled slips on a bedrock island, burning furnaces, and a Goliath fortress she bought from a Union quartermaster who is probably still spending the money. While the yards stand, she can build a new fleet.

And Kessrin has seen his chance. A Directorate task force is coming to finish both of us: from the north by the fourth turn, from the east by the eighth. It will shoot at anything that is not Directorate. Take down the Goliath before the two of them take us down.`,
  comms: [
    { speaker: 'sato', text: 'For Arkin. Then we grieve. Not before.' },
    { speaker: 'moraine', text: "You killed my fleet for a principle, General. Let's see if your principle holds a wall." },
    { speaker: 'ruess', text: 'The railway loop runs round the fortress. Two Dragons and a Hydra ride it. The gates are narrow: go through them fast.' },
    { speaker: 'kessrin', text: 'Two problems, one stone. My task force has orders to sink whatever is still moving when it arrives.' },
    { speaker: 'sato', text: 'There is an empty grey dock on the north mooring. Somebody should take it before Kessrin does.' },
  ],
  strategy: [
    'Cross the burning approach between the plasma clouds; clear the Pandora mines and Remora decoys with ranged fire.',
    'Send a fast group along the comet tail in the north to take the grey dock on the north mooring.',
    'Break in through the west gate; mecha can climb the bedrock to the south gate. Kill the turrets on the railway loop first.',
    'Empty or destroy the two cartel docks before their cargo floods the decks.',
    'The Directorate task force arrives from the north on turn 4 and the east on turn 8. Keep the Goliath under fire whatever happens.',
  ],
  plan: [
    { n: 1, path: [[5, 10], [18, 10], [30, 10]] },
    { n: 2, path: [[4, 6], [14, 3], [40, 2]] },
    { n: 3, path: [[30, 10], [33, 10], [40, 10]] },
    { n: 5, at: [44, 1], note: 'Directorate T4' }, { n: 5, at: [56, 10], note: 'T8' },
  ],
  terrain,
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, K: { type: 2, army: 0 }, D: { type: 3, army: 0 },
    B: { type: 10, army: 0 }, C: { type: 9, army: 0 }, L: { type: 8, army: 0 }, S: { type: 38, army: 0 },
    H: { type: 39, army: 0 }, Q: { type: 40, army: 0 }, V: { type: 42, army: 0 }, R: { type: 15, army: 0 }, P: { type: 41, army: 0 },
    F: { type: 55, army: 1 },                                     // Goliath fortress
    N: { type: 52, army: 1 },                                     // cartel docks
    d: { type: 23, army: 1 }, y: { type: 24, army: 1 },           // Dragon, Hydra
    j: { type: 51, army: 1 }, k: { type: 50, army: 1 }, l: { type: 8, army: 1 }, x: { type: 36, army: 1 },   // Gulon, Cerberus, Lobster, Siren
    1: { type: 17, army: 1 }, 2: { type: 19, army: 1 }, 5: { type: 22, army: 1 },   // Pandora, Remora, Rockeye
    n: { type: 52, army: 0, neutral: true },                     // grey dock
  },
  cargo: { '1,10': [8, 9], '38,9': [8, 9], '43,11': [51, 3], '31,3': [8], '31,17': [9], '40,2': [3, 1] },
  arrivals: [
    { turn: 3, army: 1, units: [{ type: 39, x: 44, y: 1 }, { type: 49, x: 47, y: 1 }, { type: 49, x: 50, y: 1 }, { type: 0, x: 42, y: 1 }] },
    { turn: 7, army: 1, units: [{ type: 42, x: 56, y: 10 }, { type: 40, x: 56, y: 7 }, { type: 40, x: 56, y: 13 }, { type: 2, x: 55, y: 9 }, { type: 2, x: 55, y: 11 }] },
  ],
};
