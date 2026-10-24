// Remnant 2, Salvage Rights (docs/STORY.md): the Ashfall Cartel's scrapyard in the Kirkwood
// gap. Three grey docks drift in the wreck field, still holding salvaged machines: capture them
// (bring a dock to 0 HP and it joins you, cargo included) before Moraine's raiders do. Arkin's
// wing, which escaped Olympos separately, joins from the west on turn 5. Destroy the raiders.
// Rebalanced after the owner's playtest (2026-10-24): the raiders start well clear of the docks,
// only two Lobsters, the turn-5 reinforcements are the player's, and up to 12 machines deploy.
const COLS = 44, ROWS = 20;
let seed = 22;
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

// the wreck field: hulks of bedrock (old station sections) in meteoroid debris, asteroids, and
// a plasma slick leaking from a broken reactor in the middle
for (const [x, y, r, c] of [[14, 4, 2, ':'], [13, 15, 3, ':'], [21, 9, 2, '#'], [22, 3, 1, '#'], [20, 17, 2, '#'], [27, 6, 2, ':'],
  [28, 14, 2, 'a'], [33, 9, 2, '#'], [34, 2, 1, 'a'], [35, 18, 1, ':'], [8, 9, 1, 'a'], [40, 12, 2, ':'], [17, 11, 1, 'a']]) blob(x, y, r, c);
blob(24, 12, 2, 'p', 0.9);
// a magnetic veil along the west edge where the Selene came in
for (let y = 1; y <= ROWS; y++) { set(2, y, 'm'); if (y % 3) set(3, y, 'm'); }
// clear water around each dock and the arrival points
const clear = (x, y, r = 1) => { for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) set(i, j, '.'); };
const DOCKS = [[13, 9], [23, 15], [27, 5]];
for (const [x, y] of DOCKS) clear(x, y);
clear(6, 10, 2);

// units ----------------------------------------------------------------------------------
const U = {}, taken = (x, y) => U[`${x},${y}`];
const near = (x, y, ok = '.m') => {
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const c = get(x + dx, y + dy);
    if (c && ok.includes(c) && !taken(x + dx, y + dy)) return [x + dx, y + dy];
  }
  throw new Error(`no free '${ok}' hex near ${x},${y}`);
};
const put = (ch, x, y, ok) => { const [px, py] = near(x, y, ok); U[`${px},${py}`] = ch; return [px, py]; };

// the remnant: the Selene and its escort, just through the veil
for (const [ch, x, y] of [['G', 6, 10], ['S', 4, 10], ['M', 7, 8], ['M', 7, 12], ['T', 5, 7], ['T', 5, 13], ['L', 8, 10], ['A', 4, 8], ['C', 4, 12], ['M', 7, 6], ['T', 7, 14], ['C', 9, 9]]) put(ch, x, y);
const D = DOCKS.map(([x, y]) => put('N', x, y));
// Moraine's raiders: fast craft around the far docks, gunboats and a carrier behind them
for (const [ch, x, y] of [['l', 42, 6], ['g', 42, 3], ['g', 42, 17], ['b', 43, 8], ['b', 43, 14], ['e', 41, 10], ['c', 42, 12]]) put(ch, x, y);
const SIREN = put('k', 44, 11);   // the raiders' carrier, a Lobster aboard
const units = grid.map((row, j) => row.map((_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'SALVAGE', title: 'Salvage Rights', screens: [3, 2],
  objective: { kind: 'annihilate' }, turnLimit: 20, cap: 12, music: 7,
  goal: 'Destroy the cartel raiders. Capture the grey docks for their machines.',
  chapter: 'Chapter 2 · The Kirkwood scrapyard',
  briefing: `
Three days out of Olympos, with half our machines leaking air and no friendly port in the sky. Sato brought the Selene into the Kirkwood gap, where the Ashfall Cartel strips dead warships for parts. Nobody asks questions in Kirkwood. That was the idea.

The yard is a field of hulks and debris around three grey docks. The docks are unmanned and still hold salvaged machines in their bays. Bring a dock down and it's ours, with everything inside. Repairs, spares, a few more guns.

Queen Moraine's raiders think the docks are theirs. They're waiting beyond the far two, fast and well armed, and they'll take the docks themselves if we're slow. Some good news at last: Arkin's wing broke out of Olympos on another heading, and Sato has their beacon. They'll be with us by the fifth turn.`,
  comms: [
    { speaker: 'moraine', text: 'Welcome to Kirkwood, General. Everything in this yard is mine, including whatever you\'re flying. Leave quietly and you may keep your skin.' },
    { speaker: 'ruess', text: 'The docks still have power. Knock their shields down to zero and their systems will take our codes. Don\'t blow them up, General, I need the bays.' },
    { speaker: 'sato', text: 'Beacon on the long scanner, west. Galt-pattern transponders, our own codes. That\'s Arkin\'s wing. Fifth turn, if they don\'t stop to argue.' },
    { speaker: 'arkin', text: 'Save me some pirates, General. Kessrin\'s people chased us halfway to Jupiter. I want to hit something that isn\'t chasing me.' },
    { speaker: 'kessrin', text: 'Consorting with pirates already, General? I hardly need to write your history. You are writing it for me.' },
  ],
  strategy: [
    'Take the near dock first: it\'s close to your start and its machines join you at full strength.',
    'The raiders are fast but fragile. Let them come into your line through the debris, then hit them.',
    'Use the hulks (bedrock) as cover: cruisers can\'t follow you into them.',
    'Arkin\'s wing (Athena, Crane, Mars, Titan) joins from the west on turn 5. Send it to the far docks.',
    'Captured docks repair machines that board them. Pull damaged units back to them.',
  ],
  plan: [
    { n: 1, path: [[8, 9], [12, 9]] }, { n: 2, at: [40, 10], note: 'Raiders' },
    { n: 4, at: [5, 4], note: 'Arkin, turn 5' }, { n: 1, at: [23, 15], note: 'Dock' }, { n: 1, at: [27, 5], note: 'Dock' },
  ],
  terrain: '\n' + grid.map((r) => r.join('')).join('\n'),
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the General's machine
    S: { type: 38, army: 0 },                 // Selene
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, L: { type: 8, army: 0 }, A: { type: 3, army: 0 }, C: { type: 9, army: 0 },
    N: { type: 52, army: 0, neutral: true },  // grey dock
    // the Ashfall Cartel's raiders
    l: { type: 8, army: 1 }, g: { type: 51, army: 1 }, b: { type: 50, army: 1 }, e: { type: 3, army: 1 },
    k: { type: 36, army: 1 }, c: { type: 9, army: 1 },
  },
  cargo: { [`${D[0]}`]: [1, 0], [`${D[1]}`]: [16, 9], [`${D[2]}`]: [14, 2], [`${SIREN}`]: [8] },
  // Arkin's wing joins from the west on turn 5 (rules.js: event turn 4); survivors join the roster
  arrivals: [{ turn: 4, army: 0, units: [{ type: 4, x: 4, y: 4 }, { type: 9, x: 5, y: 5 }, { type: 0, x: 4, y: 16 }, { type: 1, x: 5, y: 17 }] }],
};
