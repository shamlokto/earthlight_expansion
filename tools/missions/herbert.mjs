// Mission 3, Shipyard: MAP-HERBERT, the shipyards of F7 Asgard (docs/EXPANSION.md).
// The remnant's hidden base, held by a Union garrison. Busier than mission 2: a 3x2-screen yard.
// The station in the east is copied from the original GOTLIEB station (decks, walls, turret
// railways). The western approach crosses a plasma river, an asteroid ridge, a gravity-flux patch
// (mecha can't enter it) and a Wisp minefield. Five grey docks hold machines: bring a dock to 0 HP
// to capture it with everything inside. Destroy the Cortex to win. Two Vulcans guard the Cortex
// (guards: 2) and only fire on units near it; a Hydra and a Dragon turret
// cover the station's middle (the Dragon only hits ships, so small craft can slip past it).
const COLS = 44, ROWS = 20;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
let seed = 3303;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
const cube = (x, y) => { const r = y - ((x - (x & 1)) >> 1); return [x, r, -x - r]; };
const dist = (a, b, c, d) => { const p = cube(a, b), q = cube(c, d); return Math.max(...p.map((v, i) => Math.abs(v - q[i]))); };
const set = (x, y, ch) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = ch; };
const blob = (cx, cy, r, ch, p = 1) => { for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r; x <= cx + r; x++) { const d = dist(cx, cy, x, y); if (d < r || (d === r && rnd() < p)) set(x, y, ch); } };
const line = (pts, r, ch, p = 1) => { for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2; for (let k = 0; k <= n; k++) blob(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), r, ch, p); } };

// the western approach
line([[9, 1], [7, 6], [9, 11], [7, 16], [9, 20]], 0, 'p');                 // plasma river
line([[15, 2], [17, 7], [15, 11]], 0, 'a'); blob(16, 5, 1, 'a', 0.4);       // asteroid ridge (gap rows 12-15)
blob(19, 17, 2, 'g', 0.5);                                                // gravity flux: no mecha
blob(3, 2, 1, ':', 0.6); blob(4, 18, 2, ':', 0.5); blob(13, 18, 1, ':', 0.5); blob(21, 2, 1, ':', 0.5);
blob(22, 10, 1, 'a', 0.5);
// south of the station: the yard's rubble field
blob(30, 17, 2, 'a', 0.5); blob(37, 16, 2, ':', 0.6); blob(42, 19, 1, 'a', 0.5); blob(26, 19, 1, ':', 0.5);
for (const [x, y] of [[12, 16], [12, 4], [21, 13], [28, 16]]) set(x, y, '.');   // grey dock hexes stay open
const terrain = g.map((r) => r.join('')).join('\n');

const U = {
  // the remnant's strike force on the west edge (the deployment slots)
  '2,6': 'G', '3,8': 'M', '3,10': 'M', '2,12': 'T', '4,13': 'C', '2,9': 'S', '4,7': 'L', '3,14': 'C', '2,4': 'D', '4,11': 'B',
  // the station garrison: guards at the Cortex, turrets on the railways, patrols in the yard
  '40,4': 'v', '41,5': 'v', '34,6': 'r', '37,7': 'y', '42,4': 'K', '27,8': 't', '31,9': 't',
  // the outer yard: patrols, a cruiser and a destroyer, and the minefield on the approach
  '22,8': 't', '19,3': 'm', '40,15': 'u', '24,3': 'h', '22,19': 'f',
  '12,11': 'w', '12,13': 'w',
  // five grey docks
  '12,16': 'N', '12,4': 'N', '21,13': 'N', '28,16': 'N', '43,10': 'N',
};
const units = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'HERBERT', title: 'Shipyard', screens: [3, 2],
  objective: { kind: 'command' }, cap: 10, guards: 2, music: 28,
  chapter: "Chapter 3 · F7 Asgard, the shipyards",
  transmission: "So you have found the Emperor's toys. Keep them, General. They will make a fine exhibit at your trial.",
  strategy: ["Take the two near docks first, north and south of the plasma river: a Crane and a Mars for the price of a few shots each.", "Wisp mines sit in the river crossing at rows 11 to 13. Go around them, through the ridge gap in rows 12 to 15.", "Keep mecha out of the gravity flux in the south: they can't enter it.", "The dock on the south deck holds an Athena, and the deep one inside the station walls holds a cruiser.", "The Dragon turret only hits ships. Send small craft past it to the Cortex; its two Vulcan guards only fire on units near it."],
  plan: [{"n": 1, "path": [[4, 6], [9, 5], [12, 4]]}, {"n": 1, "path": [[4, 13], [9, 15], [12, 16]]}, {"n": 2, "path": [[13, 15], [17, 13], [21, 13]]}, {"n": 4, "path": [[22, 14], [28, 16]]}, {"n": 5, "path": [[29, 14], [34, 10], [40, 6]]}, {"n": 2, "at": [12, 12], "note": "Wisp mines"}, {"n": 3, "at": [19, 17], "note": "Gravity flux: no mecha"}],
  briefing: `
F7 Asgard. The shipyards that built Babylon.

The Galt crews say their people kept a hidden base here when the Union took the station: docks full of machines, sealed and forgotten. The Union found it a week ago. A garrison holds the yard now, with turret batteries on the railways and a Cortex command centre deep inside the station.

Five docks still stand, powered down and grey. Bring one to zero and its locks fail: the dock and every machine inside are ours. The deepest one, inside the station walls, holds a cruiser.

The western approach is mined, and the gravity flux in the south will stop our mecha cold. The station decks give almost no cover. Destroy the Cortex and the yard is ours.`,
  terrain: '\n' + terrain,
  // GOTLIEB's east station (columns 41-59, rows 1-13) on columns 25-43
  stamps: [{ map: 21, from: [41, 1], to: [59, 13], at: [25, 1] }],
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, C: { type: 9, army: 0 }, L: { type: 8, army: 0 },
    S: { type: 38, army: 0 }, D: { type: 3, army: 0 }, B: { type: 10, army: 0 },
    v: { type: 14, army: 1 },                 // Vulcan beam artillery (Cortex guard)
    t: { type: 2, army: 1 },                  // Talos
    y: { type: 24, army: 1 },                 // Hydra missile turret (railway)
    r: { type: 23, army: 1 },                 // Dragon cannon turret (railway): hits ships and structures only
    K: { type: 56, army: 1 },                 // Cortex command centre
    m: { type: 0, army: 1 },                  // Mars
    u: { type: 3, army: 1 },                  // Medusa
    h: { type: 39, army: 1 },                 // Hannibal cruiser
    f: { type: 49, army: 1 },                 // Fenrir destroyer
    w: { type: 18, army: 1 },                 // Wisp mine
    N: { type: 52, army: 0, neutral: true },  // grey dock
  },
  // what each grey dock holds: the deep station dock holds the best prize
  cargo: { '12,16': [0], '12,4': [9], '21,13': [3, 0], '28,16': [4], '43,10': [39] },
};
