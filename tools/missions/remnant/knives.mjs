// Remnant 1, Night of Knives (docs/STORY.md): Kessrin's coup at the Olympos victory parade. The
// General breaks out of the parade deck with the crews that follow and runs east, through the
// station's outer works and an asteroid screen, to the Selene waiting past the magnetic band.
// Small and tense (eased after the owner's playtests, 2026-10-25: no guards start inside the
// deck, a lighter screen, two more crews, 14 turns): Union guards close in from the west, a Hydra on the turret railway covers
// the deck's east gate, and destroyers hold the far side; the garrison comes out on turn 6 and
// hunts the carrier.
const COLS = 29, ROWS = 10;
const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) grid[y - 1][x - 1] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };

// the parade deck, walled, with two gates on its east side (rows 3 and 8)
rect(1, 1, 9, 10, 'W');
rect(2, 2, 8, 9, 'd');
for (const y of [3, 8]) set(9, y, 'd');
// the turret railway along the outer works, between the gates
for (let y = 2; y <= 9; y++) set(11, y, '=');
for (const y of [1, 10]) set(11, y, '#');
rect(10, 1, 10, 2, '#'); rect(10, 9, 10, 10, '#');
// bedrock spurs of the station and an asteroid screen in the middle
for (const [x, y] of [[13, 1], [14, 1], [13, 10], [14, 10], [14, 9]]) set(x, y, '#');
for (const [x, y] of [[16, 3], [17, 3], [16, 4], [17, 5], [18, 5], [16, 7], [17, 7], [17, 8], [18, 8], [16, 8], [19, 4]]) set(x, y, 'a');
for (const [x, y] of [[18, 1], [19, 1], [19, 2], [18, 10], [19, 10], [20, 9]]) set(x, y, ':');
// the magnetic band: beam weapons can't touch a ship in it
for (let y = 1; y <= ROWS; y++) { set(22 + (y % 2), y, 'm'); set(23 + (y % 2), y, 'm'); }

export default {
  name: 'KNIVES', title: 'Night of Knives', screens: [2, 1],
  objective: { kind: 'escape', edge: 'east', count: 2 }, turnLimit: 14, cap: 8, music: 0,
  goal: 'Get the General and two more units off the east edge.',
  chapter: 'Chapter 1 · Olympos, the night of the parade',
  briefing: `
Olympos, the night of the victory parade. The Galt war is over, the Union's fleets fill the sky, and the man on the review stand beside you has just ordered your arrest. Marshal Oren Kessrin's Security Directorate is taking the station deck by deck. The Council is dead or under guard. You are next on his list.

Not everyone on the parade deck obeyed. Seven crews powered up their machines when the shooting started, and they're waiting for your orders. Captain Sato has the light carrier Selene out past the magnetic band, engines hot.

Two gates lead out of the deck. A Hydra battery on the turret railway covers both. Past the railway there's an asteroid screen, then the magnetic band, then open space and the Selene. Directorate destroyers are already moving to close that gap.

Get out. Bring as many as you can.`,
  comms: [
    { speaker: 'kessrin', text: 'General. You will find the gates locked and your officers reassigned. Stand down, and history will remember you kindly. I will see to that personally.' },
    { speaker: 'sato', text: 'Selene is past the magnetic band, holding position. I can wait fourteen turns, General. Not fifteen.' },
    { speaker: 'arkin', text: 'Seven machines and a parade full of Directorate guns. I like these odds better than the review stand.' },
    { speaker: 'ruess', text: 'That Hydra on the railway can\'t move and can\'t turn its back. Go past it fast, or go around through the rocks.' },
  ],
  strategy: [
    'Turn 1: send the Lobster out of the north gate and right up to the Hydra on the railway. Its missiles need two hexes, so it can\'t shoot back at a unit next to it, and it barely dodges.',
    'Keep the General inside the deck until the Hydra is gone; then leave by both gates together.',
    'Two Union machines hold the asteroid screen. Pass north of it with the General (the Athena flies 9) while the mecha and the Crane keep them busy.',
    'The Selene waits in the magnetic band, where beams can\'t touch her. Bring her west to meet you: units that board her escape with her, the General included.',
    'The garrison comes out behind you on turn 6 and runs for the Selene. Don\'t turn and fight; only the General and two others have to get off the east edge.',
  ],
  plan: [
    { n: 1, path: [[3, 6], [9, 3], [10, 4]] }, { n: 3, path: [[4, 3], [9, 3], [14, 1], [21, 2]] },
    { n: 4, path: [[25, 5], [21, 4]] }, { n: 3, at: [15, 5], note: 'Screen' },
    { n: 5, at: [3, 5], note: 'Garrison, turn 6' },
  ],
  //          11111111112222222222
  // 12345678901234567890123456789
  terrain: '\n' + grid.map((r) => r.join('')).join('\n'),
  units: `
.............................
.............................
..TG..........t..............
..M.......h..................
..S.C...................K....
..L..........................
..MA..........f..............
.............................
.........................f...
.............................`,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the General's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, L: { type: 8, army: 0 },
    S: { type: 3, army: 0 },                  // Medusa
    C: { type: 9, army: 0 },                  // Crane
    A: { type: 1, army: 0 },                  // Titan
    K: { type: 38, army: 0 },                 // Selene, Captain Sato's light carrier, waiting in the band
    m: { type: 0, army: 1 }, t: { type: 2, army: 1 }, u: { type: 51, army: 1 }, f: { type: 49, army: 1 },
    h: { type: 24, army: 1 },                 // Hydra battery on the turret railway
  },
  // the deck's guards come out of the barracks behind you on turn 4 and run for the carrier
  // (owner, 2026-10-25: on turn 6, not 4)
  arrivals: [{ turn: 5, army: 1, units: [{ type: 2, x: 2, y: 2, chase: 'carriers' }, { type: 0, x: 2, y: 9, chase: 'carriers' }, { type: 3, x: 3, y: 9, chase: 'carriers' }] }],
};
