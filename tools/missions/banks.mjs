// Mission 5, Foundry: MAP-BANKS, the industrial Foundry F6 Luggnagg (docs/EXPANSION.md).
// Four walled works (VARAMU's chamber, stamped from the ROM) with a Union dock in each; a
// plasma river splits the map north to south, gravity-flux rivers (railguns lose 50%, mecha
// can't enter) guard the works, asteroid ridges and bedrock break up the flanks, and a Wisp
// minefield closes the east lane. Destroy both Cortex command centres in the eastern works.
//
// Approximations of the design: the workers' rising is the southwest works' dock standing grey
// (capture it with what it holds) plus two Hannibal cruisers of theirs joining on turn 5; the
// design's Adzam is a second Cortex, since only Cortex centres count for the objective.
const COLS = 44, ROWS = 30;
let seed = 5;
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
// a meandering river through the given points, `w` hexes wide
const river = (pts, w, c, gaps = []) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
      for (let d = 0; d < w; d++) {
        const [px, py] = Math.abs(x1 - x0) > Math.abs(y1 - y0) ? [x, y + d] : [x + d, y];
        if (!gaps.some(([gx, gy]) => Math.abs(gx - px) <= 1 && Math.abs(gy - py) <= 1)) set(px, py, c);
      }
    }
  }
};

// natural terrain
river([[26, 1], [25, 6], [27, 11], [26, 16], [28, 21], [27, 26], [28, 30]], 3, 'p');              // the plasma river
river([[11, 14], [18, 15], [24, 14]], 2, 'g', [[15, 15], [21, 15]]);                                  // gravity flux before the west works
river([[30, 14], [36, 16], [43, 15]], 2, 'g', [[33, 15], [40, 16]]);                                  // ... and the east works
for (const [x, y, r, c] of [[3, 3, 2, '#'], [2, 28, 3, '#'], [42, 2, 2, '#'], [43, 29, 2, '#'], [8, 8, 2, 'a'], [6, 22, 3, 'a'],
  [5, 25, 2, 'a'], [20, 1, 2, 'a'], [34, 1, 1, 'a'], [11, 29, 2, ':'], [37, 29, 2, ':'], [40, 9, 2, 'a'], [41, 23, 2, 'a'], [9, 18, 1, ':'],
  [21, 29, 1, 'a'], [32, 13, 1, 'a']]) blob(x, y, r, c);
blob(7, 13, 2, 'm', 0.9);   // a magnetic patch: cover from the works' beam guns on the way in
for (const [x, y] of [[4, 4], [5, 4], [6, 23], [5, 23], [5, 24]]) set(x, y, '.');   // pockets for the raiding party

// the four works: VARAMU's chamber (x40-49, y11-21), its gates west, north, south and east
const ROOM = ['aWWWdddWWW', 'aWWdddddWW', 'WWdddddddW', 'WddddddddW', 'ddddd?dddd', 'dddddddddW', 'WWdddddddW', 'WWdddddddW', 'aWWWdddWWW', 'aaWWdddWWa', 'aaaWdddWaa'];
const WORKS = { nw: [12, 2], ne: [30, 2], sw: [12, 19], se: [30, 19] };
for (const [x, y] of Object.values(WORKS)) ROOM.forEach((row, dy) => [...row].forEach((c, dx) => set(x + dx, y + dy, c === '?' ? 'd' : c)));
// keep each gate's approach open
for (const [x, y] of Object.values(WORKS)) for (const [dx, dy] of [[-1, 4], [-2, 4], [-1, 5], [4, -1], [5, -1], [4, 11], [5, 11], [10, 4], [11, 4]]) if (get(x + dx, y + dy) && get(x + dx, y + dy) !== 'p') set(x + dx, y + dy, '.');

// units ----------------------------------------------------------------------------------
const U = {}, taken = (x, y) => U[`${x},${y}`];
// nearest free hex of one of `ok` terrain characters to (x, y)
const near = (x, y, ok = '.') => {
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const c = get(x + dx, y + dy);
    if (c && ok.includes(c) && !taken(x + dx, y + dy)) return [x + dx, y + dy];
  }
  throw new Error(`no free '${ok}' hex near ${x},${y}`);
};
const put = (ch, x, y, ok = '.') => { const [px, py] = near(x, y, ok); U[`${px},${py}`] = ch; return [px, py]; };
const room = (w, dx, dy) => [WORKS[w][0] + dx, WORKS[w][1] + dy];

// the player: main fleet on the west edge, a raiding party in the southwest asteroid pockets
for (const [ch, y] of [['G', 13], ['M', 9], ['M', 11], ['M', 15], ['T', 10], ['T', 16], ['X', 12], ['X', 14], ['D', 17], ['C', 8], ['C', 18], ['S', 12], ['A', 16]]) put(ch, ch === 'S' || ch === 'A' ? 2 : 1, y);
put('L', 5, 23); put('L', 6, 23); put('H', 5, 24);
// the Union: a Cortex and a dock in each eastern works, docks in the western ones
put('K', ...room('ne', 4, 5), 'd'); put('K', ...room('se', 4, 5), 'd');
const DOCK = { ne: put('P', ...room('ne', 3, 3), 'd'), se: put('P', ...room('se', 3, 3), 'd'), nw: put('P', ...room('nw', 3, 3), 'd'),
  sw: put('N', ...room('sw', 3, 3), 'd') };   // the southwest dock is the workers', standing grey
// garrisons inside the works (guards hold their post near a Cortex)
for (const w of ['ne', 'se']) { put('t', ...room(w, 6, 3), 'd'); put('n', ...room(w, 6, 6), 'd'); put('c', ...room(w, 2, 6), 'd'); put('v', ...room(w, 7, 4), 'd'); }
put('t', ...room('nw', 6, 4), 'd'); put('m', ...room('nw', 4, 6), 'd');   // a light garrison in the northwest works
// the field army waits east of the plasma river, in front of the eastern works
for (const [ch, x, y] of [['m', 31, 13], ['m', 33, 17], ['e', 35, 12], ['e', 35, 18], ['b', 38, 13], ['b', 38, 17], ['r', 41, 10],
  ['h', 40, 15], ['h', 41, 20], ['f', 30, 11], ['f', 30, 19], ['u', 37, 30]]) put(ch, x, y);
// the carrier group in the east and the minefield on the east lane
const CARRIER = put('R', 42, 15);
for (const [x, y] of [[41, 12], [42, 12], [41, 18], [42, 18], [43, 13], [43, 17], [40, 13], [40, 17]]) put('w', x, y);
const units = grid.map((row, j) => row.map((_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'BANKS', title: 'Foundry', screens: [3, 3],
  objective: { kind: 'command' }, turnLimit: 24, cap: 16, guards: 2, music: 14,
  goal: 'Destroy both Cortex command centres in the eastern works.',
  chapter: "Chapter 5 · F6 Luggnagg, the Foundry",
  transmission: "Luggnagg's workers asked for their wages. I am sending them the general instead. Let us see who pays whom.",
  strategy: ["Take the grey dock in the southwest works first: its Titan and Mars join you, and the workers' two Hannibal cruisers arrive beside it on turn 5.", "Split into two strike groups, north and south. Each Cortex sits inside its own works in the east.", "Gravity flux rings the works: mecha can't cross it, and railguns lose half their power against anything sheltering in it. Go in through the gates, and use beams and missiles on defenders in the flux.", "The east lane is mined and a carrier group waits behind it. Stay inside the works once you get there."],
  plan: [{"n": 1, "path": [[6, 23], [11, 22], [14, 22]]}, {"n": 1, "at": [11, 27], "note": "Workers’ cruisers T5"}, {"n": 2, "path": [[2, 10], [15, 8], [30, 7]]}, {"n": 2, "path": [[16, 23], [24, 24], [31, 24]]}],
  briefing: `
F6 Luggnagg, the Foundry that builds half the Union's warships. Its workers have not been paid since Babylon fell. They have been told to work faster.

Four walled works stand on the station, each with a dock and its own guns. The two in the east hold the Cortex command centres that run the whole Foundry: destroy both and Luggnagg is ours.

The southwest works has already stopped answering the Union. Its dock stands grey: take it and what it holds. The workers say more of their crews will cut their cruisers loose and come over to us once the fighting starts.

The plasma river cuts the station in two. Gravity flux rings the works: mecha cannot cross it, railguns lose half their bite against anything sheltering in it. Use the gaps. A minefield closes the east lane, and a carrier group waits behind it.`,
  terrain: '\n' + grid.map((r) => r.join('')).join('\n'),
  // the works themselves are copied from VARAMU, so walls and gates keep the original's graphics
  stamps: Object.values(WORKS).map(([x, y]) => ({ map: 28, from: [40, 11], to: [49, 21], at: [x, y] })),
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, X: { type: 2, army: 0 }, D: { type: 3, army: 0 },
    C: { type: 9, army: 0 }, L: { type: 8, army: 0 }, S: { type: 38, army: 0 }, A: { type: 34, army: 0 }, H: { type: 39, army: 0 },
    // the Union
    K: { type: 56, army: 1 },                 // Cortex command centre
    P: { type: 52, army: 1 },                 // Pergamon dock
    N: { type: 52, army: 0, neutral: true },  // the workers' grey dock
    t: { type: 2, army: 1 }, n: { type: 1, army: 1 }, m: { type: 0, army: 1 }, e: { type: 3, army: 1 }, c: { type: 16, army: 1 }, v: { type: 14, army: 1 }, b: { type: 50, army: 1 },
    r: { type: 40, army: 1 }, h: { type: 39, army: 1 }, f: { type: 49, army: 1 }, u: { type: 51, army: 1 }, R: { type: 34, army: 1 },
    w: { type: 18, army: 1 },                 // Wisp mine
  },
  cargo: {
    [`${DOCK.ne}`]: [1], [`${DOCK.se}`]: [1], [`${DOCK.nw}`]: [2],
    [`${DOCK.sw}`]: [1, 0],                   // the workers' dock: a Titan and a Mars
    [`${CARRIER}`]: [8, 8, 8],                // the Artemis: three Lobsters
  },
  // the workers' cruisers break away on turn 5, next to their works
  arrivals: [{ turn: 4, army: 0, units: [{ type: 39, x: 11, y: 26 }, { type: 39, x: 11, y: 28 }] }],
};
