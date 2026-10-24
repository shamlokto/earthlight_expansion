// Mission 9, Line: MAP-BUTLER, the Derleth line (docs/EXPANSION.md, draft 2 scaled up for the
// late campaign). The Union home fleet's artillery line, three lanes deep:
//   * the player masses on the west edge; a gravity river (railguns lose 50% against units in it,
//     mecha can't enter it) cuts off the west third, with three fords;
//   * meteoroid ridges split the middle into lanes that capital ships can't leave; the centre
//     lane is mined with Wisps;
//   * the artillery line (Phoibos, Vulcan, Cyclops) holds the ridges, with Hydra and Dragon
//     turrets on the railways of a walled redoubt in the south (copied from the original
//     DERLETH's west base);
//   * behind it the fleet: Tiamat (the flagship), Nodens, Asura-IIs and three carriers, in
//     front of the fleet base in the east (the original DERLETH's east station);
//   * a Galt deserter squadron enters from the north edge on turn 6 and joins the player.
// Objective: sink the Tiamat (base flagship objective, type 30).
const COLS = 59, ROWS = 20;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
const set = (x, y, c) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = c; };
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const blob = (pts, c) => { for (const [x, y] of pts) set(x, y, c); };

// the gravity river, west third: it bends with the rows; fords at rows 4-5, 10-11, 16-17
for (let y = 1; y <= ROWS; y++) {
  if ([4, 5, 10, 11, 16, 17].includes(y)) continue;
  const x0 = 8 + [0, 0, 1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 1, 1, 2, 2, 2, 1, 1, 0][y - 1];
  rect(x0, y, x0 + 2, y, 'g');
}
// cover in no-man's land: asteroid clumps, a plasma lake, magnetic eddies (beam-proof)
blob([[14, 2], [15, 2], [15, 3], [16, 3], [14, 8], [15, 8], [15, 9], [13, 14], [14, 14], [14, 15], [15, 15], [16, 19], [17, 19], [17, 20]], 'a');
rect(17, 6, 19, 7, 'p'); rect(18, 8, 20, 8, 'p'); rect(17, 12, 19, 13, 'p');
blob([[20, 1], [21, 1], [21, 2], [22, 16], [23, 16], [22, 17], [23, 17], [24, 17]], 'm');
// meteoroid ridges from x 22 to 44: lanes for capital ships at rows 5-8, 10-11 (mined) and 13-15
for (let x = 22; x <= 44; x++) {
  if (![27, 28, 36].includes(x)) { set(x, 3, ':'); set(x, 4, ':'); }
  if (![31, 32].includes(x)) set(x, 9, ':');
  if (![25, 26, 39].includes(x)) set(x, 12, ':');
}
rect(22, 16, 34, 16, ':'); rect(25, 17, 33, 17, ':');
blob([[30, 1], [38, 1], [39, 1]], 'a');   // single rocks: the strip north of the ridge stays a lane
// the fleet anchorage, north-east: open space with an asteroid screen
blob([[45, 3], [46, 3], [46, 4], [45, 9], [46, 9], [44, 10]], 'a');
rect(41, 6, 43, 7, 'm');
const rows = g.map((r) => r.join(''));

// units by position
const U = {};
const place = (ch, list) => { for (const [x, y] of list) U[`${x},${y}`] = ch; };
// the player's deployment slots: the west edge, in three groups (open space, so any machine fits)
place('G', [[3, 10]]);
place('M', [[2, 2], [4, 3], [2, 8], [4, 12], [2, 17], [4, 19]]);
place('T', [[3, 4], [3, 15]]);
place('t', [[1, 3], [1, 16]]);
place('D', [[3, 2], [3, 18]]);
place('C', [[5, 5], [5, 14], [6, 10]]);
place('L', [[5, 9], [5, 11]]);
place('B', [[4, 7], [4, 14]]);
place('A', [[2, 11]]);
place('S', [[2, 6]]);
place('R', [[1, 9]]);
place('H', [[1, 12], [2, 14]]);
// the artillery line on the ridges and in the lanes; the strip north of the top ridge is held
// only by mines at the ridge gaps: the flank the deserters come in on
place('p', [[33, 5], [35, 10], [29, 13]]);
place('v', [[37, 7], [28, 11], [36, 15]]);
place('y', [[34, 8], [27, 14]]);
// mines across the centre lane and the northern fords of the ridges
place('w', [[25, 10], [27, 10], [33, 10], [34, 11], [27, 5], [28, 5]]);
// screens and line infantry
place('f', [[39, 8], [33, 11], [31, 14]]);
place('u', [[40, 10], [30, 15]]);
place('o', [[32, 7], [24, 14], [34, 13], [38, 19]]);
place('e', [[36, 12], [28, 15]]);
place('m', [[22, 13]]);
// the fleet
place('X', [[45, 6]]);
place('N', [[44, 6]]);
place('Q', [[45, 8], [47, 11]]);
place('K', [[49, 4], [48, 8], [46, 13]]);
place('r', [[42, 8], [40, 6]]);
place('h', [[43, 5], [45, 14]]);
// turrets on the railways: the redoubt's (Hydra, Dragon) and the fleet base's (Hydra)
place('Y', [[38, 12], [40, 12], [44, 16], [53, 10], [57, 10]]);
place('Z', [[42, 13], [44, 19]]);
// the redoubt's garrison
place('o', [[37, 14], [39, 17]]);
const units = rows.map((_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'BUTLER', title: 'Line', screens: [4, 2],
  objective: { kind: 'flagship', type: 30 }, cap: 24, music: 26, turnLimit: 30,
  goal: 'Sink the Tiamat, flagship of the Union home fleet.',
  chapter: "Chapter 9 · The Derleth line",
  transmission: "The home fleet is the Union, General. Every gun on that line was paid for by the Foundries you claim to defend. Sink the Tiamat, and you sink what you swore to protect.",
  strategy: ["Mecha cross the gravity river only at the three fords: rows 4-5, 10-11 and 16-17. Ships and craft can fly over.", "The centre lane is mined. Push the north and south lanes, where the ridges keep their capital ships from swinging around.", "Long-range railguns win the artillery duel. Send Hunters at the guns on the ridges.", "The Galt squadron comes in from the north on turn 6: two Corvus, an Asura-II and Lobsters. Time the north push to meet them.", "Then drive for the Tiamat. When it sinks, the line breaks."],
  plan: [{"n": 1, "path": [[6, 5], [13, 5]]}, {"n": 1, "path": [[6, 11], [13, 11]]}, {"n": 1, "path": [[6, 17], [13, 17]]}, {"n": 5, "path": [[16, 5], [30, 4], [42, 6]]}, {"n": 4, "at": [24, 1], "note": "Galt squadron T6"}, {"n": 2, "at": [30, 10], "note": "Mined centre lane"}],
  briefing: `
The Derleth line. Everything the Union has left is here.

Their home fleet sits behind an artillery line three lanes deep: Phoibos and Vulcan guns on the meteoroid ridges, Cyclops missile batteries in the lanes, turrets on the railways of the old Derleth redoubt. The centre lane is sown with mines. Behind it all rides the Tiamat, the fleet's flagship, with a Nodens, three Asura-IIs and three carriers.

The gravity river in front of us is fordable in three places, and only there for our mecha. Beyond it the ridges keep their capital ships in the lanes, and keep ours out. Long-range railguns win this kind of fight. So do Hunters that can reach the guns.

There is one more thing. A Galt squadron has been shadowing the fleet for a week: two Corvus cruisers, an Asura-II and Lobster fighters. Their commander says they will come in from the north on the sixth day, on our side.

Sink the Tiamat and the line breaks.`,
  terrain: '\n' + rows.join('\n'),
  // the original DERLETH's walled west base becomes the redoubt; its east station the fleet base
  stamps: [
    { map: 27, from: [1, 9], to: [14, 20], at: [35, 9] },
    { map: 27, from: [48, 1], to: [59, 20], at: [48, 1] },
  ],
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 },                  // Mars
    T: { type: 1, army: 0 },                  // Titan
    t: { type: 2, army: 0 },                  // Talos
    D: { type: 3, army: 0 },                  // Medusa
    C: { type: 9, army: 0 },                  // Crane
    L: { type: 8, army: 0 },                  // Lobster
    B: { type: 10, army: 0 },                 // Brontes
    A: { type: 31, army: 0 },                 // Asura-II
    S: { type: 38, army: 0 },                 // Selene
    R: { type: 40, army: 0 },                 // Regulus
    H: { type: 39, army: 0 },                 // Hannibal
    p: { type: 15, army: 1 },                 // Phoibos rail artillery
    v: { type: 14, army: 1 },                 // Vulcan beam artillery
    y: { type: 16, army: 1 },                 // Cyclops missile artillery
    w: { type: 18, army: 1 },                 // Wisp mine
    f: { type: 49, army: 1 },                 // Fenrir destroyer
    u: { type: 51, army: 1 },                 // Gulon destroyer
    o: { type: 2, army: 1 },                  // Talos
    e: { type: 3, army: 1 },                  // Medusa
    m: { type: 0, army: 1 },                  // Mars
    X: { type: 30, army: 1 },                 // Tiamat, the flagship
    N: { type: 32, army: 1 },                 // Nodens
    Q: { type: 31, army: 1 },                 // Asura-II
    K: { type: 34, army: 1 },                 // Artemis carrier
    r: { type: 40, army: 1 },                 // Regulus
    h: { type: 39, army: 1 },                 // Hannibal
    Y: { type: 24, army: 1 },                 // Hydra turret (railway)
    Z: { type: 23, army: 1 },                 // Dragon turret (railway)
  },
  // carriers launch their fighters at the end of the Union's first turn
  cargo: { '49,4': [8, 9], '48,8': [8, 9], '46,13': [8, 11] },
  // the line holds: Union units walk to the nearest of these posts and fight from there (the AI
  // advances toward the highest-priority waypoint it can reach, the nearest on ties)
  routes: [[29, 8], [24, 13], [27, 13], [30, 14], [33, 7], [34, 12], [33, 15], [28, 18], [32, 18],
    [37, 6], [40, 8], [38, 13], [41, 15], [44, 6], [46, 8], [45, 12], [45, 17]].map(([x, y]) => ({ prio: 1, x, y })),
  arrivals: [
    // the Galt deserters come in from the north edge on turn 6 and fight for us
    { turn: 5, army: 0, units: [{ type: 42, x: 22, y: 1 }, { type: 42, x: 26, y: 1 }, { type: 31, x: 24, y: 1 }, { type: 8, x: 21, y: 2 }, { type: 8, x: 25, y: 2 }, { type: 8, x: 27, y: 2 }] },
    // the fleet base sends its reserve every few turns
    { turn: 4, army: 1, units: [{ type: 49, x: 50, y: 12 }, { type: 51, x: 52, y: 14 }, { type: 2, x: 51, y: 17 }, { type: 2, x: 53, y: 18 }] },
    { turn: 8, army: 1, units: [{ type: 40, x: 46, y: 6 }, { type: 49, x: 50, y: 12 }, { type: 3, x: 51, y: 17 }, { type: 0, x: 53, y: 18 }] },
  ],
};
