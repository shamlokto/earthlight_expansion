// Remnant 4, Iron Garden (docs/STORY.md): Hestia Minor, a mining moon. Its colony sits on the
// west edge; Kessrin sends four Hannibal assault cruisers to take it, along the two ship
// channels cut through the bedrock plateau. Ruess's batteries are the answer: two Dragons
// already stand on the mine railway (joiners), a Crab carries a Hydra (joiner), and the roster's
// own Crabs set theirs down on the bedrock (rules.launchCells, BATTERY_GROUND). Destroy all four
// cruisers; lost if one reaches the west edge. Landers and bombers come in waves on turns 4, 7, 10.
const COLS = 44, ROWS = 20;
let seed = 44;
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

// the moon's plateau: bedrock over the west two thirds, ragged at its east rim
for (let y = 1; y <= ROWS; y++) for (let x = 1; x <= 26 + Math.round(rnd() * 3); x++) set(x, y, '#');
// two ship channels cut through it (rows 5-6 and 14-15), open to the west edge
for (let x = 1; x <= 30; x++) for (const y of [5, 6, 14, 15]) set(x, y, '.');
// the mine railway: a loop along both channels and a spur between them
for (let x = 4; x <= 22; x++) { set(x, 3, '='); set(x, 17, '='); }
for (let y = 3; y <= 17; y++) if (![5, 6, 14, 15].includes(y)) set(12, y, '=');
// asteroid tailings and plasma pools from the mine workings on the plateau
for (const [x, y, r, c] of [[7, 10, 2, 'a'], [19, 10, 2, 'a'], [24, 2, 1, 'a'], [24, 18, 1, 'a'], [16, 9, 1, 'p']]) blob(x, y, r, c);
// out east: an asteroid field and meteoroid drifts that split the approach
for (const [x, y, r, c] of [[35, 10, 3, 'a'], [38, 3, 2, ':'], [38, 17, 2, ':'], [32, 1, 1, 'a'], [32, 19, 1, 'a'], [42, 10, 1, ':']]) blob(x, y, r, c);
for (let x = 27; x <= COLS; x++) for (const y of [5, 6, 14, 15]) if (get(x, y) !== '.') set(x, y, '.');

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
const put = (ch, x, y, ok) => { const [px, py] = near(x, y, ok); U[`${px},${py}`] = ch; return [px, py]; };

// the remnant on the plateau, between the channels; the Selene in the north channel
for (const [ch, x, y, ok] of [['G', 14, 10, '#'], ['M', 18, 7, '#'], ['M', 18, 12, '#'], ['T', 20, 8, '#'], ['T', 20, 13, '#'], ['C', 15, 8, '#'],
  ['L', 15, 12, '#'], ['A', 10, 10, '#'], ['S', 8, 5]]) put(ch, x, y, ok);
// Ruess's batteries: two Dragons on the railway, covering the channels, and a Crab with a Hydra
put('D', 18, 3, '='); put('D', 18, 17, '=');
const CRAB = put('K', 11, 9, '#');
// the Union assault: four Hannibals (the marked type) with destroyers and gunboats, in the east
for (const [ch, x, y] of [['h', 40, 5], ['h', 40, 15], ['h', 43, 6], ['h', 43, 14]]) put(ch, x, y);
for (const [ch, x, y] of [['f', 37, 6], ['f', 37, 14], ['g', 41, 9], ['g', 41, 11], ['b', 44, 4], ['b', 44, 16], ['r', 44, 10]]) put(ch, x, y);
const units = grid.map((row, j) => row.map((_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

// routes: up each channel to the colony on the west edge (priority grows westward)
const routes = [5, 14].flatMap((y) => Array.from({ length: 15 }, (_, k) => ({ prio: k + 1, x: Math.max(1, COLS - 3 * k), y })));

export default {
  name: 'GARDEN', title: 'Iron Garden', screens: [3, 2],
  objective: { kind: 'destroyType', type: 39, edge: 'west' }, turnLimit: 18, cap: 9, music: 21,
  goal: 'Destroy all four Hannibal assault cruisers before any of them reaches the colony on the west edge.',
  chapter: 'Chapter 4 · Hestia Minor',
  briefing: `
Hestia Minor is a lump of iron and ice with eleven thousand miners living under its west rim. Ruess worked here once. When the Directorate ordered the moon's ore ships turned into troop transports, the miners said no. Kessrin's answer is on its way.

Four Hannibal assault cruisers, with escorts. Ships can't cross the plateau's bedrock, so they'll come up the two channels the mine cut through it, straight to the colony. If one of them reaches the west edge, the colony is gone.

We have Ruess's batteries. Two Dragons already stand on the mine railway, one over each channel. His Crab carries a Hydra, and our own Crabs can set more down anywhere on bedrock, asteroids or deck. Once a battery is down, it stays down. Choose the ground carefully.

The cruisers won't come alone. Expect landers on the plateau and bombers over it, in waves.`,
  comms: [
    { speaker: 'ruess', text: 'A Dragon reaches seven hexes and hits like the end of the world, but it can\'t fire into a magnetic field and it can\'t move. Put them where the cruisers have to come, and they\'ll come.' },
    { speaker: 'kessrin', text: 'Eleven thousand miners, General. Their deaths will be on your ledger, not mine. You could still save them. Surrender the batteries.' },
    { speaker: 'sato', text: 'Selene will hold the north channel mouth. If a cruiser gets past the guns, I\'m the last thing between it and the colony.' },
    { speaker: 'arkin', text: 'Landers on the plateau, bombers overhead, cruisers up the middle. Finally, a fair fight.' },
  ],
  strategy: [
    'The cruisers must come up the two channels (rows 5-6 and 14-15). Set batteries on the bedrock beside them, three to seven hexes in.',
    'A Crab sets its battery down next to itself and the battery never moves again. Unload early, before the waves.',
    'Kill the Hannibals; everything else only matters if it threatens a battery or the colony.',
    'Landers come onto the plateau on turn 4, bombers on turn 7, a carrier group on turn 10. Keep mecha near the batteries.',
    'The Selene and fast craft are the last line: stop any cruiser that slips through before it reaches the west edge.',
  ],
  plan: [
    { n: 1, path: [[38, 5], [26, 5], [8, 5]] }, { n: 1, path: [[38, 14], [26, 14], [8, 14]] },
    { n: 2, at: [22, 8], note: 'Battery ground' }, { n: 2, at: [22, 12], note: 'Battery ground' },
    { n: 4, at: [30, 10], note: 'Landers, turn 4' }, { n: 5, at: [2, 10], note: 'Colony' },
  ],
  terrain: '\n' + grid.map((r) => r.join('')).join('\n'),
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the General's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, C: { type: 9, army: 0 }, L: { type: 8, army: 0 }, A: { type: 3, army: 0 },
    S: { type: 38, army: 0 },                 // Selene
    D: { type: 23, army: 0, joiner: true },   // Dragon battery on the mine railway
    K: { type: 27, army: 0, joiner: true },   // Ruess's Crab, carrying a Hydra
    h: { type: 39, army: 1 },                 // Hannibal assault cruiser: the objective
    f: { type: 49, army: 1 }, g: { type: 51, army: 1 }, b: { type: 50, army: 1 }, r: { type: 40, army: 1 },
  },
  cargo: { [`${CRAB}`]: [24] },
  routes,
  arrivals: [
    // landers: mecha set down on the plateau's east rim
    { turn: 3, army: 1, units: [{ type: 2, x: 27, y: 8 }, { type: 0, x: 27, y: 11 }, { type: 0, x: 28, y: 2 }, { type: 3, x: 28, y: 18 }] },
    // bombers over the plateau
    { turn: 6, army: 1, units: [{ type: 10, x: 44, y: 8 }, { type: 10, x: 44, y: 12 }, { type: 8, x: 43, y: 1 }, { type: 8, x: 43, y: 19 }] },
    // a carrier group with hunters aboard
    { turn: 9, army: 1, units: [{ type: 35, x: 44, y: 6, cargo: [9, 9] }, { type: 33, x: 44, y: 14 }, { type: 49, x: 43, y: 10 }] },
  ],
};
