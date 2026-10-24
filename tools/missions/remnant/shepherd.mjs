// Remnant 3, The Shepherd (docs/STORY.md): Prof. Ruess's convoy of Crabs, each carrying a Dragon
// or Hydra battery, must cross the Hestia asteroid belt to the mining moon (mission 4). The
// convoy's Crabs join the remnant (`joiner`), so whatever gets through is yours. Commander Lysa
// Vane waits in the belt in her Directorate Talos (type 60, level 8) with a
// hunter screen, and her second wing comes in behind the convoy on turn 5, hunting the Selene.
// Escape: the General and four more units off the east edge.
const COLS = 59, ROWS = 20;
let seed = 33;
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

// the Hestia belt: a wide band of asteroids and meteoroid drifts from x 16 to 44, with three
// passages: a northern channel (rows 3-4), a narrow middle gap (rows 10-11) and a southern
// channel through gravity flux (rows 16-17)
for (let x = 16; x <= 44; x++) for (let y = 1; y <= ROWS; y++) if (rnd() < 0.62) set(x, y, rnd() < 0.55 ? 'a' : ':');
for (let x = 14; x <= 46; x++) { set(x, 3, '.'); set(x, 4, '.'); set(x, 10, '.'); set(x, 11, rnd() < 0.3 ? ':' : '.'); set(x, 16, 'g'); set(x, 17, '.'); }
for (const [x, y, r] of [[24, 7, 2], [33, 13, 2], [40, 6, 1], [27, 19, 1]]) blob(x, y, r, 'a', 0.95);
// meteoroid shoals that close the northern channel's middle: ships must go round or stop
for (const x of [29, 30]) { set(x, 3, ':'); set(x, 4, ':'); }
// a magnetic stream along the far side: beams can't touch ships inside it
for (let y = 1; y <= ROWS; y++) { set(50 + (y % 2), y, 'm'); set(51 + (y % 2), y, 'm'); }
// the convoy's start, clear
for (let y = 6; y <= 15; y++) for (let x = 2; x <= 9; x++) set(x, y, '.');

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

// the remnant and the convoy
for (const [ch, x, y] of [['G', 7, 10], ['S', 4, 10], ['M', 8, 8], ['M', 8, 13], ['T', 6, 7], ['C', 9, 11], ['L', 6, 14], ['A', 5, 12]]) put(ch, x, y);
const CRABS = [put('K', 5, 8), put('H', 5, 11), put('K', 6, 9)];
// Vane in the middle gap, hunters screening each passage, gunboats inside the belt
const VANE = put('V', 31, 10);
for (const [ch, x, y] of [['t', 30, 11], ['m', 26, 3], ['m', 27, 4], ['e', 34, 3], ['m', 25, 17], ['e', 28, 17], ['l', 36, 10],
  ['b', 40, 4], ['b', 38, 17], ['f', 47, 8], ['f', 47, 13], ['h', 54, 10], ['c', 42, 10]]) put(ch, x, y, '.m');
const units = grid.map((row, j) => row.map((_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'SHEPHERD', title: 'The Shepherd', screens: [4, 2],
  objective: { kind: 'escape', edge: 'east', count: 4 }, turnLimit: 18, cap: 8, music: 14,
  goal: 'Get the General and four more units off the east edge. Every Crab that gets through joins you, battery and all.',
  chapter: 'Chapter 3 · The Hestia belt',
  briefing: `
Professor Hal Ruess ran the Union's mining batteries for twenty years, and when the coup came he took three of his Crabs and walked out with them. Each one carries a fixed battery: two Dragons and a Hydra. Guns big enough to hold a moon, if we can get them to one.

The moon is Hestia Minor, on the far side of the Hestia belt. The belt is wide, and it has three ways through. A northern channel, choked with meteoroid shoals in the middle. A narrow gap straight through the centre. A southern channel full of gravity flux that slows everything.

Commander Lysa Vane is waiting in the belt. She is Kessrin's best pilot, she flies a Directorate Talos, and she has never lost a machine she wanted to kill. Her second wing will come in behind us. They're after the Selene.

The Crabs are slow in the rocks. Shepherd them.`,
  comms: [
    { speaker: 'vane', text: 'General. I asked the Marshal for this assignment. I wanted to see whether you were as good as the parade said. Bring your little tugs. I\'ll wait.' },
    { speaker: 'ruess', text: 'Those Crabs are older than half your pilots. Asteroids are fine for them; meteoroids cost them three. Keep them out of the drift if you can.' },
    { speaker: 'sato', text: 'Her second wing will come in behind us around turn five, and they\'ll come for the Selene. I\'ll keep moving. You keep them off me.' },
    { speaker: 'arkin', text: 'Let me have Vane. Just once. One pass.' },
    { speaker: 'sato', text: 'Arkin. We are here to get out, not to get even.' },
  ],
  strategy: [
    'The middle gap is short but Vane sits in it. Use it only if you can break her screen fast.',
    'The northern channel is open for ships, but the shoals in its middle stop them; craft and Crabs can go round through the asteroids.',
    'Crabs pay only 1 for asteroids and 3 for meteoroids or flux: route them through rock, not drift.',
    'The second wing arrives behind you on turn 5 and hunts the Selene. Keep the carrier moving east with an escort.',
    'Past the belt, the magnetic stream shelters ships from beams. Escape off the east edge from there.',
  ],
  plan: [
    { n: 2, path: [[9, 6], [20, 4], [36, 4], [48, 5]] }, { n: 3, path: [[8, 10], [20, 9], [26, 7], [33, 8], [44, 9]] },
    { n: 5, path: [[46, 11], [52, 11], [58, 11]] }, { n: 1, at: [31, 10], note: 'Vane' }, { n: 4, at: [2, 3], note: 'Second wing, turn 5' },
  ],
  terrain: '\n' + grid.map((r) => r.join('')).join('\n'),
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the General's machine
    S: { type: 38, army: 0 },                 // Selene
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, C: { type: 9, army: 0 }, L: { type: 8, army: 0 }, A: { type: 3, army: 0 },
    // Ruess's convoy: loaded Crabs that join the remnant if they survive
    K: { type: 27, army: 0, joiner: true }, H: { type: 27, army: 0, joiner: true },
    V: { type: 60, army: 1, level: 8 },       // Commander Vane's Directorate Talos
    t: { type: 2, army: 1 }, m: { type: 0, army: 1 }, e: { type: 3, army: 1 }, l: { type: 8, army: 1 },
    b: { type: 50, army: 1 }, f: { type: 49, army: 1 }, h: { type: 39, army: 1 }, c: { type: 9, army: 1 },
  },
  cargo: { [`${CRABS[0]}`]: [23], [`${CRABS[1]}`]: [24], [`${CRABS[2]}`]: [23] },
  // Vane's second wing, behind the convoy, hunting the Selene
  arrivals: [{ turn: 4, army: 1, units: [{ type: 8, x: 1, y: 3, chase: 'carriers' }, { type: 8, x: 1, y: 18, chase: 'carriers' }, { type: 10, x: 2, y: 2, chase: 'carriers' }, { type: 49, x: 2, y: 19, chase: 'carriers' }] }],
};
