// Mission 2, Old Enemies: MAP-LEM, the Aldiss asteroids (docs/EXPANSION.md).
// A Union patrol hunts the fugitives and a Galt remnant band hiding in the NE meteoroids. The
// band joins the player on turn 2. A modest step up from mission 1: a wider belt (3x2 screens)
// with two asteroid ridges, scattered meteoroid fields, a plasma stream and a magnetic patch. The
// patrol is missile-heavy (missiles lose 40% against targets in meteoroids) and its destroyers
// keep to the open lanes, since they can't enter meteoroids or asteroids. A grey dock in the
// southern rocks holds a Mars and a Crane for whoever takes it.
const COLS = 44, ROWS = 20;
const g = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'));
let seed = 2202;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
const cube = (x, y) => { const r = y - ((x - (x & 1)) >> 1); return [x, r, -x - r]; };
const dist = (a, b, c, d) => { const p = cube(a, b), q = cube(c, d); return Math.max(...p.map((v, i) => Math.abs(v - q[i]))); };
const set = (x, y, ch) => { if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) g[y - 1][x - 1] = ch; };
const blob = (cx, cy, r, ch, p = 1) => { for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r; x <= cx + r; x++) { const d = dist(cx, cy, x, y); if (d < r || (d === r && rnd() < p)) set(x, y, ch); } };
const line = (pts, r, ch, p = 1) => { for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2; for (let k = 0; k <= n; k++) blob(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), r, ch, p); } };

// meteoroid fields: the Galt hideout in the NE, the player's cover in the W, scattered pockets
blob(36, 4, 3, ':', 0.6); blob(4, 4, 2, ':', 0.5); blob(4, 17, 2, ':', 0.5);
blob(20, 9, 1, ':', 0.6); blob(27, 15, 2, ':', 0.5); blob(14, 18, 1, ':', 0.5);
// two asteroid ridges running north-south split the belt into three lanes
line([[12, 1], [14, 6], [12, 11]], 0, 'a'); blob(13, 3, 1, 'a', 0.4);
line([[29, 5], [31, 10], [29, 16]], 0, 'a'); blob(30, 9, 1, 'a', 0.5);
blob(22, 2, 1, 'a', 0.4); blob(40, 14, 2, 'a', 0.5); blob(18, 14, 1, 'a', 0.5);
// a plasma stream across the middle and a magnetic patch (beam-proof) in the south lane
line([[17, 1], [19, 5], [24, 7], [26, 12], [24, 20]], 0, 'p');
blob(35, 17, 1, 'm', 0.6); blob(9, 10, 1, 'm', 0.5);
// keep the grey dock's hex open
set(22, 17, '.');
const terrain = g.map((r) => r.join('')).join('\n');

const U = {
  // the fugitives in the west (the deployment slots)
  '3,9': 'G', '5,8': 'M', '5,12': 'M', '3,11': 'T', '6,10': 'C', '2,10': 'S', '4,13': 'D', '6,6': 'L',
  // the Union patrol, spread through the belt
  '16,6': 'c', '33,12': 'c', '15,9': 'm', '23,4': 'm', '25,17': 'm',
  '21,10': 'd', '34,8': 'd', '27,3': 'g', '38,11': 'g', '32,18': 't',
  // a grey dock in the southern rocks
  '22,17': 'N',
};
const units = Array.from({ length: ROWS }, (_, j) => Array.from({ length: COLS }, (_, i) => U[`${i + 1},${j + 1}`] || '.').join('')).join('\n');

export default {
  name: 'LEM', title: 'Old Enemies', screens: [3, 2],
  objective: { kind: 'annihilate' }, cap: 8, music: 25,
  briefing: `
The Aldiss belt. We came here to disappear, and for two days it worked.

Then the long-range scopes picked up a Union patrol sweeping the belt, and something else: a Galt signal, old army codes, from the meteoroid field to the northeast. Remnants of the Emperor's fleet have been hiding here since Babylon fell. The patrol is hunting them too.

They were our enemies a month ago. Today the same men want us both dead. Break the patrol, and give the Galt crews a reason to trust the general.

Their missiles lose much of their bite against ships sheltering in the meteoroids, and their destroyers can't follow you into the rocks. A grey dock in the southern rocks still holds two machines: bring it to zero and they are ours.`,
  terrain: '\n' + terrain,
  units: '\n' + units,
  legend: {
    G: { type: 4, army: 0, general: true },   // Athena, the general's machine
    M: { type: 0, army: 0 }, T: { type: 1, army: 0 }, C: { type: 9, army: 0 }, S: { type: 38, army: 0 },
    D: { type: 3, army: 0 }, L: { type: 8, army: 0 },
    c: { type: 16, army: 1 },                 // Cyclops missile gunboat
    m: { type: 3, army: 1 },                  // Medusa missile mecha
    d: { type: 50, army: 1 },                 // Cerberus destroyer
    g: { type: 51, army: 1 },                 // Gulon destroyer
    t: { type: 2, army: 1 },                  // Talos
    N: { type: 52, army: 1, neutral: true },  // grey dock
  },
  cargo: { '22,17': [0, 9] },
  // the Galt band breaks cover and joins on turn 2 (event turn 1 = the player phase of turn 2)
  arrivals: [{ turn: 1, army: 0, units: [{ type: 8, x: 38, y: 2 }, { type: 8, x: 39, y: 3 }, { type: 9, x: 37, y: 6 }, { type: 9, x: 40, y: 5 }] }],
};
