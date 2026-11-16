// The Reckoning's two hand-made battle maps (docs/COLONY-V12.md): The Siege of Eden and Hesk's
// stronghold, written as region paints and hand-placed units, then emitted as mission JSON
// (js/expansion/mission.js format) under missions/colony/. Also prints each map as ASCII for the docs.
//   node tools/colony-reckoning-maps.mjs [--ascii]
// The colony fills in Eden's side at launch (js/colony/battle.js siegeMission / strongholdMission):
// `home` lists Eden's start hexes nearest-first ([x, y, ships?]: ships may stand there), `rails` the
// turret-railway hexes for the hull guns (Battery Emplacements).
import { writeFileSync, mkdirSync } from 'node:fs';

// [graphic, terrain id] pairs (the ROM's meanings, as used by the expansion's own maps)
const PAIRS = [
  [0, 0], [1, 0], [2, 0], [3, 0],            // 0-3 void and star fields
  [64, 13],                                  // 4 fortress deck
  [104, 19], [123, 19], [122, 19],           // 5-7 turret railway (lift shafts): straight, top, bottom
  [227, 30],                                 // 8 turret railway on a hull (Babylon's)
  [6, 3], [5, 2], [16, 4], [17, 5],          // 9 asteroid, 10 meteoroids, 11 plasma, 12 gravity flux
  [221, 66],                                 // 13 hull (Babylon hull: no ships, craft and mecha only)
  [211, 52],                                 // 14 fortress wall (impassable)
  [34, 12],                                  // 15 bedrock
  [19, 11], [20, 11], [21, 11], [22, 11], [23, 11], [24, 11], [25, 11], [26, 11], [27, 11], [28, 11], [29, 11], [30, 11],   // 16-27 the atmosphere band (Earth's id: nobody enters)
];
const CH = { '.': 0, D: 4, R: 5, r: 8, A: 9, M: 10, P: 11, G: 12, H: 13, W: 14, B: 15, '~': 16 };
const CHAR = new Map(Object.entries(CH).map(([k, v]) => [v, k]));
const EARTH_BAND = [[16, 17], [18, 19], [20, 21], [22, 23], [24, 25], [26, 27], [27, 27]];
const SHIP_OK = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]);    // void, deck, railway: ships may stand
const CRAFT_OK = new Set([...SHIP_OK, 13]);               // ... and the hull for craft and mecha

function rng32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const cube = (x, y) => { const q = x, r = y - ((x - (x & 1)) >> 1); return [q, r, -q - r]; };
const dist = (a, b) => { const [q1, r1, s1] = cube(a.x, a.y), [q2, r2, s2] = cube(b.x, b.y); return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2)); };

class Canvas {
  constructor(sw, sh, seed) {
    this.sw = sw; this.sh = sh; this.cols = sw * 15; this.rows = sh * 10;
    const rnd = rng32(seed);
    this.g = Array.from({ length: this.rows + 2 }, () => Array.from({ length: this.cols + 2 }, () => { const r = rnd(); return r < 0.06 ? 1 : r < 0.12 ? 2 : r < 0.15 ? 3 : 0; }));
  }
  ok(x, y) { return x >= 1 && x <= this.cols - 1 && y >= 1 && y <= this.rows; }
  set(x, y, c) { if (this.ok(x, y)) this.g[y][x] = typeof c === 'number' ? c : CH[c]; }
  get(x, y) { return this.g[y][x]; }
  rect(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  blob(cx, cy, r, c) { for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r; x <= cx + r; x++) if (this.ok(x, y) && dist({ x, y }, { x: cx, y: cy }) <= r) this.set(x, y, c); }
  ellipse(cx, cy, rx, ry, c) { for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, c); }
  line(x0, y0, x1, y1, w, c) {   // a thick line (hex distance <= w from the segment's sample points)
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n); this.blob(x, y, w, c); }
  }
  earth() {   // the atmosphere band along the south edge: unenterable (Earth's terrain id), as on the raid maps
    const top = this.rows + 2 - EARTH_BAND.length;
    EARTH_BAND.forEach((p, i) => { for (let x = 0; x <= this.cols + 1; x++) this.g[top + i][x] = p[x & 1]; });
    this.bandTop = top;
  }
  ascii(units = []) {
    const at = new Map(units.map((u) => [`${u.x},${u.y}`, u.mark]));
    const out = [];
    for (let y = 1; y <= this.rows; y++) {
      let s = '';
      for (let x = 1; x <= this.cols - 1; x++) { const v = this.g[y][x]; s += at.get(`${x},${y}`) || (v >= 16 ? '~' : v <= 3 ? '.' : v >= 5 && v <= 7 ? 'R' : CHAR.get(v)); }
      out.push(`${String(y).padStart(2)} ${s}`);
    }
    return out.join('\n');
  }
}
const neighbours = (x, y) => { const o = x & 1; return [[x, y - 1], [x, y + 1], [x - 1, y - 1 + o], [x - 1, y + o], [x + 1, y - 1 + o], [x + 1, y + o]]; };
// Eden's start hexes: standable hexes in `area`, nearest `from` first; [x, y, shipsMayStand]
function homeSlots(cv, area, from, taken) {
  const out = [];
  for (let y = 1; y <= cv.rows; y++) for (let x = 1; x <= cv.cols - 1; x++) {
    const v = cv.get(x, y);
    if (!area(x, y) || !CRAFT_OK.has(v) || taken.has(`${x},${y}`)) continue;
    out.push([x, y, SHIP_OK.has(v) ? 1 : 0]);
  }
  return out.sort((a, b) => dist({ x: a[0], y: a[1] }, from) - dist({ x: b[0], y: b[1] }, from) || a[1] - b[1] || a[0] - b[0]);
}
const grid = (cv) => cv.g.map((r) => [...r]);
// n open-void hexes (any machine may stand) in `test`, a hex apart, nearest `centre` first, not in `used`
function pick(cv, test, centre, n, used) {
  const c = [];
  for (let y = 1; y <= cv.rows; y++) for (let x = 1; x <= cv.cols - 1; x++) if (test(x, y) && cv.ok(x, y) && cv.get(x, y) <= 3 && (x + y) % 2 === 0 && !used.has(`${x},${y}`)) c.push({ x, y });
  c.sort((a, b) => dist(a, centre) - dist(b, centre) || a.y - b.y || a.x - b.x);
  const out = c.slice(0, n);
  for (const h of out) used.add(`${h.x},${h.y}`);
  return out;
}

// ====================================================================== The Siege of Eden (4 x 3)
function siege() {
  const cv = new Canvas(4, 3, 0x51e6e);
  cv.earth();   // rows 25+: the atmosphere; the station hangs just above it
  // the station: hull x 10..50, y 9..21
  cv.rect(10, 9, 50, 21, 'H');
  cv.rect(25, 9, 35, 12, 'D');      // the dock, open to the north
  cv.rect(25, 13, 35, 19, 'D');     // the main deck: the Command Centre's chamber
  cv.rect(13, 12, 21, 17, 'D');     // the upper deck (west): the Lantern Ring
  cv.rect(39, 12, 47, 17, 'D');     // the lower deck (east): the gardens
  for (const x of [24, 36]) for (let y = 13; y <= 19; y++) if (y !== 16) cv.set(x, y, 'W');   // bulkheads, a door at row 16
  for (const x of [23, 37]) for (let y = 9; y <= 21; y++) cv.set(x, y, y === 9 ? 6 : y === 21 ? 7 : 5);   // the lift shafts
  for (const x of [12, 15, 18, 42, 45, 48]) cv.set(x, 9, 'r');   // gun points on the hull's top
  // the east breach (day 211): the hull torn open, bedrock and debris
  for (let y = 17; y <= 21; y++) for (let x = 45; x <= 50; x++) cv.set(x, y, (x + y) % 3 === 0 ? 'M' : (x + y) % 3 === 1 ? 0 : 'B');
  for (let y = 14; y <= 21; y++) cv.set(50, y, 0);
  for (let y = 18; y <= 21; y++) cv.set(49, y, 0);
  // drifting debris on the approaches
  cv.blob(12, 5, 1, 'A'); cv.blob(48, 5, 1, 'A'); cv.blob(5, 13, 1, 'M'); cv.blob(55, 8, 1, 'M');
  cv.blob(30, 4, 1, 'P'); cv.blob(7, 22, 1, 'G'); cv.blob(56, 16, 1, 'P');
  const cortex = { x: 30, y: 16 }, dock = { x: 30, y: 10 };
  const taken = new Set([`${cortex.x},${cortex.y}`, `${dock.x},${dock.y}`]);
  const rails = [[23, 9], [37, 9], [12, 9], [48, 9], [15, 9], [45, 9], [18, 9], [42, 9], [23, 11], [37, 11], [23, 20], [37, 20]];
  for (const [x, y] of rails) taken.add(`${x},${y}`);
  // Eden's guard: the station and the space just off its north face, nearest the dock mouth first
  const home = homeSlots(cv, (x, y) => (x >= 10 && x <= 50 && y >= 6 && y <= 21) && !(cv.get(x, y) >= 5 && cv.get(x, y) <= 8), { x: 30, y: 12 }, taken);
  // Hesk's fleet. Each group is in the order the colony keeps it when Eden fields fewer machines
  // (core: always comes); names mark the General's old machines and Hesk's circle.
  const L = (type, x, y, level, extra = {}) => ({ type, x, y, level, ...extra });
  const start = [   // on the map at turn 1: the north
    L(30, 30, 2, 6, { core: 1, name: 'Tiamat · Commodore Varr' }), L(60, 26, 3, 5, { core: 1 }), L(60, 34, 3, 5, { core: 1 }), L(39, 22, 2, 4, { core: 1 }),
    L(8, 18, 4, 3, { core: 1 }), L(9, 42, 4, 3, { core: 1 }), L(31, 38, 2, 4), L(73, 30, 5, 5), L(8, 40, 4, 3), L(9, 20, 4, 3),
    L(49, 14, 3, 4), L(69, 27, 5, 4), L(69, 33, 5, 4), L(10, 24, 4, 3), L(10, 36, 4, 3), L(42, 46, 2, 4),
    L(33, 10, 2, 4, { cargo: [8, 9] }), L(50, 50, 3, 4), L(2, 16, 6, 3), L(2, 44, 6, 3),
  ];
  const west = [   // turn 3: round the west, along the hull
    L(38, 2, 14, 4, { core: 1, cargo: [9, 9] }), L(15, 2, 10, 4, { core: 1 }), L(70, 2, 18, 4, { core: 1 }), L(12, 3, 8, 4),
    L(15, 2, 20, 4), L(70, 3, 22, 4), L(12, 3, 12, 4), L(51, 1, 16, 4), L(3, 1, 6, 3), L(3, 1, 22, 3),
  ];
  const east = [   // turn 5: through the breach
    L(80, 58, 18, 5, { core: 1 }), L(68, 58, 14, 5, { core: 1 }), L(80, 58, 22, 5, { core: 1 }), L(66, 57, 10, 4),
    L(68, 58, 20, 5), L(66, 57, 23, 4), L(41, 59, 12, 4), L(71, 59, 16, 5), L(80, 59, 24, 5),
  ];
  const old = [   // turn 7: the General's old machines, bought back from the traders
    L(61, 30, 1, 6, { core: 1, name: 'Azoras · the General\'s old flagship' }), L(58, 25, 1, 6, { core: 1, name: 'Selene Kai · Sato\'s old command', cargo: [] }),
    L(73, 35, 1, 6, { core: 1, name: 'Athena Kai · Arkin\'s old wing' }), L(73, 21, 1, 6, { name: 'Athena Kai · Arkin\'s old wing' }),
    L(62, 39, 1, 5, { name: 'Pallas · ex-Eden' }), L(62, 17, 1, 5, { name: 'Pallas · ex-Eden' }), L(72, 44, 1, 6),
  ];
  const last = [   // turn 10: the last push, from the north-west, the north-east and under the hull
    L(32, 52, 3, 6, { core: 1, name: 'Nodens · Captain Osk' }), L(60, 6, 3, 6, { core: 1 }), L(60, 54, 6, 6, { core: 1 }), L(67, 58, 23, 5, { core: 1 }),
    L(30, 6, 1, 5), L(40, 4, 6, 5), L(40, 57, 6, 5), L(67, 2, 23, 5), L(67, 58, 24, 5), L(60, 50, 2, 6),
    L(35, 54, 1, 5, { cargo: [12, 12] }), L(12, 1, 3, 5), L(12, 59, 3, 5),
  ];
  // The counterstrike (owner, 2026-11-16): the General went home after the ambush; the picket's survivors
  // and fresh reinforcements follow and strike Eden. Same station, other waves: in from the east and
  // the breach first (where the survivors come from), under the hull on turn 4, round the west on turn 7,
  // the north on turn 10 with two Directorate cruisers. `follow`: where the picket's survivors start.
  const cu = new Set([`${cortex.x},${cortex.y}`, `${dock.x},${dock.y}`, ...home.slice(0, 48).map(([x, y]) => `${x},${y}`)]);
  const at = (hexes, specs) => specs.map((sp, i) => ({ ...sp, x: hexes[i].x, y: hexes[i].y }));
  const T = (type, level, extra = {}) => ({ type, level, ...extra });
  const cStart = at(pick(cv, (x, y) => x >= 51 && y >= 4 && y <= 24, { x: 56, y: 14 }, 14, cu), [
    T(31, 6, { core: 1, name: 'Asura-II · the picket\'s second' }), T(60, 5, { core: 1 }), T(80, 5, { core: 1 }), T(68, 5, { core: 1 }),
    T(66, 5), T(70, 5), T(73, 5), T(42, 5), T(60, 5), T(80, 5), T(69, 4), T(16, 4), T(9, 4), T(12, 4)]);
  const cBelow = at(pick(cv, (x, y) => y >= 22 && (x <= 8 || x >= 52), { x: 30, y: 24 }, 10, cu), [
    T(68, 5, { core: 1 }), T(70, 5, { core: 1 }), T(66, 5), T(80, 5), T(69, 5), T(15, 4), T(16, 4), T(73, 5), T(8, 4), T(3, 4)]);
  const cWest = at(pick(cv, (x, y) => x <= 4 && y <= 22, { x: 1, y: 12 }, 10, cu), [
    T(58, 6, { core: 1, name: 'Selene Kai · Directorate escort', cargo: [9, 9] }), T(60, 5, { core: 1 }), T(70, 5), T(69, 5), T(12, 5), T(12, 5), T(51, 4), T(49, 4), T(15, 4), T(3, 4)]);
  const cNorth = at(pick(cv, (x, y) => y <= 3, { x: 30, y: 1 }, 14, cu), [
    T(72, 7, { core: 1, name: 'Asura-II Kai · Directorate cruiser' }), T(72, 7, { core: 1, name: 'Asura-II Kai · Directorate cruiser' }), T(36, 6, { core: 1, name: 'Siren · Quill\'s paymaster' }), T(60, 6, { core: 1 }),
    T(60, 6), T(73, 6), T(73, 6), T(66, 6), T(67, 6), T(68, 6), T(42, 5), T(41, 5), T(10, 5), T(4, 5)]);
  const follow = pick(cv, (x, y) => x >= 51 && y >= 2 && y <= 24, { x: 58, y: 8 }, 20, cu).map((h) => [h.x, h.y]);
  const counter = {
    title: 'Hesk Strikes Eden', chapter: 'The Reckoning · II', objective: { kind: 'hold', turns: 14 },
    goal: 'Hold Eden to the end of turn 14: the Command Centre must stand and the General must live. Destroying every wave also wins.',
    units: cStart, arrivals: [{ turn: 3, army: 1, wave: 'below', units: cBelow }, { turn: 6, army: 1, wave: 'west', units: cWest }, { turn: 9, army: 1, wave: 'north', units: cNorth }],
    follow,
    briefing: [
      'The fleet came home from the ambush to mend. The picket came home with it, and brought friends.',
      'They are already in the east, by the old breach. More will come up under the hull, round the west, and out of the north with Directorate cruisers.',
      'Hold Eden. Then the way to the rock is open, and the picket that guarded it is spent.',
    ].join('\n\n'),
    strategy: [
      'First from the east and the breach (the picket\'s survivors among them), under the hull on turn 4, round the west on turn 7, the north on turn 10.',
      'Keep the Command Centre ringed; the bulkhead doors are at row 16.',
    ],
    transmission: 'You ran home, General. Home is where I wanted you.',
  };
  const units = [
    { type: 56, army: 0, x: cortex.x, y: cortex.y, name: 'Command Centre · Eden', eden: 'cortex' },
    { type: 52, army: 0, x: dock.x, y: dock.y, name: 'Eden\'s dock', eden: 'dock' },
    ...start.map((u) => ({ ...u, army: 1 })),
  ];
  const arrivals = [
    { turn: 2, army: 1, wave: 'west', units: west }, { turn: 4, army: 1, wave: 'east', units: east },
    { turn: 6, army: 1, wave: 'old', units: old }, { turn: 9, army: 1, wave: 'last', units: last },
  ];
  const mission = {
    version: 1, name: 'SIEGE', title: 'The Siege of Eden', chapter: 'The Reckoning · I',
    screensW: 4, screensH: 3, pairs: PAIRS.map((p) => [...p]), grid: grid(cv), units, arrivals,
    objective: { kind: 'hold', turns: 15 }, flee: true, noFlee: true, awaitArrivals: true, music: 0,
    goal: 'Hold Eden to the end of turn 15: the Command Centre must stand and the General must live. Destroying every wave also wins.',
    home, rails, cortex, dock, generalAt: [30, 14],   // the General's machine starts beside the Command Centre
    counter,   // the counterstrike's waves (js/colony/battle.js counterMission)
    briefing: [
      'Day one hundred. They did not wait for nightfall; there is none up here.',
      'Hesk\'s fleet is at the gates: Directorate hulls, cartel guns bought with Ninefold money, and machines Eden sold to pay for its air. The north is already full of them. More will come round the west, through the old breach in the east, and from the dark.',
      'The Command Centre is the heart of Eden. If it falls, so does the colony. The lift shafts are the way in for anything small; the hull guns stand in them.',
      'Hold until they break. There is no paying these people off.',
    ].join('\n\n'),
    strategy: [
      'Keep the Command Centre ringed: the bulkheads beside it have one door each, at row 16.',
      'Waves: the west on turn 3, the east breach on turn 5, the General\'s old machines from the north on turn 7, and a last push from three sides on turn 10.',
      'Ships cannot cross the hull: only the dock mouth and the lift shafts lead inside for them. Craft and mecha can climb anywhere.',
    ],
    transmission: 'You read my name to the whole sky, General. Now read this: I am coming home to Eden.',
  };
  const marks = [...units.map((u) => ({ x: u.x, y: u.y, mark: u.army === 0 ? (u.type === 56 ? 'C' : 'K') : 'e' })),
    ...west.map((u) => ({ ...u, mark: '3' })), ...east.map((u) => ({ ...u, mark: '5' })), ...old.map((u) => ({ ...u, mark: '7' })), ...last.map((u) => ({ ...u, mark: 'X' })),
    ...rails.map(([x, y]) => ({ x, y, mark: 'g' })), ...home.slice(0, 40).map(([x, y]) => ({ x, y, mark: 'o' }))];
  const cmarks = [...units.filter((u) => u.army === 0).map((u) => ({ x: u.x, y: u.y, mark: u.type === 56 ? 'C' : 'K' })), ...rails.map(([x, y]) => ({ x, y, mark: 'g' })),
    ...home.slice(0, 40).map(([x, y]) => ({ x, y, mark: 'o' })), ...follow.map(([x, y]) => ({ x, y, mark: 'f' })),
    ...cStart.map((u) => ({ ...u, mark: 'e' })), ...cBelow.map((u) => ({ ...u, mark: '4' })), ...cWest.map((u) => ({ ...u, mark: '7' })), ...cNorth.map((u) => ({ ...u, mark: 'X' }))];
  return { mission, ascii: cv.ascii(marks), counterAscii: cv.ascii(cmarks) };
}

// ====================================================================== The Ambush (4 x 3), phase 1 of the strike
// Deep space on the way to the far belt: debris, a few asteroid clusters for cover, nothing else.
// The strike force flies east in a column (the General in the middle); Hesk's picket waits ahead
// and closes in from every side in waves. The ambushers are SLOTS: hand-placed hexes in an order
// (the colony takes the first ambushRatio x n of them, js/colony/battle.js ambushMission) with a
// role (craft | mecha | armour | ship); the colony picks each slot's machine by the strike force's
// own tier and level. Every slot is on open void, so any machine may stand there.
function ambush() {
  const cv = new Canvas(4, 3, 0xa3b05);
  // the asteroid clusters (cover)
  cv.blob(14, 6, 1, 'A'); cv.set(16, 5, 'A'); cv.set(12, 7, 'A');               // NW
  cv.blob(31, 23, 2, 'A'); cv.set(34, 21, 0); cv.set(29, 25, 'A');              // the big rock, south-centre
  cv.blob(41, 8, 1, 'A'); cv.set(43, 9, 'A'); cv.set(40, 10, 'A');              // NE
  cv.blob(23, 13, 0, 'A'); cv.set(24, 12, 'A'); cv.set(22, 14, 'A');            // a small one beside the column
  cv.blob(50, 20, 1, 'A');                                                       // SE
  // debris fields (meteoroids: slow, but cover)
  for (const [x, y, r] of [[6, 22, 1], [27, 4, 1], [36, 14, 1], [47, 27, 1], [55, 10, 1], [18, 26, 1]]) cv.blob(x, y, r, 'M');
  for (const [x, y] of [[9, 13], [33, 8], [45, 16], [26, 19], [52, 4], [38, 28], [12, 18], [57, 24]]) cv.set(x, y, 'M');
  cv.blob(44, 24, 1, 'P'); cv.blob(8, 4, 0, 'G'); cv.blob(55, 15, 0, 'G');
  const open = (x, y) => cv.ok(x, y) && cv.get(x, y) <= 3;
  const generalAt = [14, 15];   // the General in the middle of the column, the fleet all round him
  const home = homeSlots(cv, (x, y) => x >= 6 && x <= 24 && y >= 9 && y <= 21, { x: 14, y: 15 }, new Set());
  const homeSet = new Set(home.slice(0, 48).map(([x, y]) => `${x},${y}`));
  // the slots of each wave: open hexes in its area, a hex apart, nearest its centre first
  const used = new Set(homeSet);
  const area = (test, centre, n) => pick(cv, test, centre, n, used);
  const ROLES = ['craft', 'mecha', 'ship', 'craft', 'armour', 'mecha', 'craft', 'ship'];
  const waves = [
    // turn 1, on the map: the picket ahead, east, waiting behind the NE and SE rocks (moving from turn 5)
    { key: 'front', turn: 0, hold: 5, share: 3, hexes: area((x, y) => x >= 38 && x <= 57 && y >= 5 && y <= 26, { x: 46, y: 15 }, 26) },
    // turn 6: both flanks close in ahead of the fleet, from the north and south edges (arrival turn k comes on turn k + 1)
    { key: 'flanks', turn: 5, share: 3, hexes: [...area((x, y) => y <= 3 && x >= 26 && x <= 54, { x: 40, y: 1 }, 13), ...area((x, y) => y >= 28 && x >= 26 && x <= 54, { x: 40, y: 30 }, 13)] },
    // turn 10: the hammer, out of the far corners
    { key: 'hammer', turn: 9, share: 2.5, hexes: [...area((x, y) => x >= 48 && y <= 9, { x: 58, y: 1 }, 11), ...area((x, y) => x >= 48 && y >= 22, { x: 58, y: 30 }, 11)] },
    // turn 13: behind, the west edge: the way home is shut
    { key: 'behind', turn: 12, share: 1.5, hexes: area((x, y) => x <= 3 && y >= 2 && y <= 29, { x: 1, y: 15 }, 14) },
  ];
  // the slot order: take each wave's share in turn, so any count keeps all four directions
  const slots = [];
  const per = waves.map((w) => ({ w, i: 0 }));
  for (let k = 0; slots.length < waves.reduce((t, w) => t + w.hexes.length, 0); k++) {
    for (const p of per) {
      const want = Math.floor((k + 1) * p.w.share) - Math.floor(k * p.w.share);   // 3, 3, 2.5, 1.5 per round of 10
      for (let j = 0; j < want && p.i < p.w.hexes.length; j++, p.i++) {
        const h = p.w.hexes[p.i];
        slots.push({ wave: p.w.key, x: h.x, y: h.y, role: ROLES[slots.length % ROLES.length] });
      }
    }
  }
  slots[0].name = 'Hound · Hesk\'s picket leader'; slots[0].role = 'ship';   // the picket's flagship, always first
  const mission = {
    version: 1, name: 'AMBUSH', title: 'The Ambush', chapter: 'The Reckoning · II',
    screensW: 4, screensH: 3, pairs: PAIRS.map((p) => [...p]), grid: grid(cv), units: [], arrivals: [],
    waves: waves.map((w) => ({ key: w.key, turn: w.turn, ...(w.hold ? { hold: w.hold } : {}) })), slots,
    objective: { kind: 'hold', turns: 15 }, flee: true, noFlee: true, awaitArrivals: true, music: 29, cap: 40,
    goal: 'Break out: keep the strike force together to the end of turn 15, when the jump drives are charged. Destroying the whole picket also wins. If the General falls, it is over.',
    home, generalAt,
    briefing: [
      'Halfway to the far belt, in the dark between nowhere and nothing, the scopes light up.',
      'Hesk knew the way we would come. His picket was waiting: half as many again as we are, and more of them coming from every side.',
      'The jump drives need fifteen turns to charge for the last leg. Until then the fleet has to stay alive, and so does the General.',
    ].join('\n\n'),
    strategy: [
      'They come in waves: ahead of you at once (waiting behind the rocks for four turns), both flanks on turn 6, the far corners on turn 10, behind you on turn 13.',
      'The rocks are the only cover out here. A tight ring around the General beats a charge.',
      'Whatever you lose here, you will not have at the rock.',
    ],
    transmission: 'You did not think I would let you knock on my door, General?',
  };
  const marks = [...slots.map((s) => ({ x: s.x, y: s.y, mark: { front: '1', flanks: '6', hammer: 'T', behind: 'B' }[s.wave] })),
    ...home.slice(0, 40).map(([x, y]) => ({ x, y, mark: 'o' })), { x: generalAt[0], y: generalAt[1], mark: '@' }];
  marks[0].mark = 'H';
  return { mission, ascii: cv.ascii(marks) };
}

// ====================================================================== Hesk's stronghold (4 x 4)
function stronghold() {
  const cv = new Canvas(4, 4, 0xa5e5);
  // the asteroid: Hesk's fortress in the north-east
  cv.ellipse(49, 9, 11, 9, 'A');
  cv.ellipse(50, 8, 7, 6, 'W');                  // the fortress wall
  cv.ellipse(50, 8, 5, 4, 'D');                  // the inner court (deck): the flagship's berth
  cv.line(44, 15, 49, 9, 1, 'D');                // the harbour mouth, south-west: ships can sail in
  cv.line(40, 19, 44, 15, 1, 0);                 // ... and its approach through the rock
  cv.line(40, 6, 45, 7, 0, 'D');                 // the west gate (craft through the meteoroid belt)
  cv.line(52, 13, 54, 18, 0, 'D');               // the south gate, under the cannon
  for (const [x, y] of [[47, 5], [53, 5], [46, 8], [54, 8], [48, 11], [52, 11], [50, 4], [50, 12]]) cv.set(x, y, 'R');   // turret mounts
  // the meteoroid belt across the north: craft only, slow
  cv.line(12, 5, 36, 6, 2, 'M');
  for (const x of [18, 24, 30]) cv.line(x, 3, x + 1, 9, 0, 0);   // narrow gaps in it
  // the two ridges either side of the centre lane (the Gullet)
  cv.line(10, 20, 34, 15, 1, 'A');
  cv.line(18, 30, 42, 24, 1, 'A');
  cv.line(35, 19, 37, 21, 0, 'M'); cv.blob(38, 22, 0, 'M');   // the choke at the Gullet's head
  cv.blob(24, 22, 1, 'P'); cv.blob(31, 24, 1, 'P');            // plasma clouds inside the Gullet (ambushers)
  // the south lane: open, under the cannon's column, with gravity flux and a ring of drifting rocks
  cv.blob(30, 36, 1, 'G'); cv.blob(46, 33, 1, 'G'); cv.blob(38, 38, 1, 'A'); cv.blob(57, 28, 1, 'M');
  cv.set(54, 18, 'D');   // the cannon tower's pad
  cv.blob(8, 12, 1, 'A'); cv.blob(4, 24, 1, 'M');
  const cannon = { x: 54, y: 19, tower: [54, 18] };
  // Eden's staging area: the south-west corner
  const home = homeSlots(cv, (x, y) => x <= 15 && y >= 29, { x: 7, y: 35 }, new Set());
  const L = (type, x, y, level, extra = {}) => ({ type, x, y, level, ...extra });
  const garrison = [
    ...[[47, 5], [53, 5], [46, 8], [54, 8]].map(([x, y]) => L(23, x, y, 6)), ...[[48, 11], [52, 11], [50, 4], [50, 12]].map(([x, y]) => L(24, x, y, 6)),
    L(17, 42, 17, 5), L(17, 39, 20, 5), L(18, 41, 18, 5), L(17, 44, 7, 5), L(18, 53, 16, 5), L(17, 36, 22, 5),   // mines in the mouth, the Gullet's head and the gates
    L(57, cannon.tower[0], cannon.tower[1], 0, { name: 'Gun tower' }),
    L(30, 50, 8, 7, { name: 'Tiamat · Commodore Varr', hold: 12 }), L(31, 47, 9, 6, { hold: 10 }), L(39, 52, 6, 6, { hold: 10 }), L(42, 49, 7, 6, { hold: 10 }),
    L(60, 45, 13, 6, { hold: 8 }), L(60, 43, 15, 6, { hold: 8 }), L(60, 41, 7, 6, { hold: 8 }), L(60, 52, 14, 6, { hold: 8 }),
    L(2, 46, 14, 5, { hold: 8 }), L(2, 42, 6, 5, { hold: 8 }), L(70, 48, 13, 6, { hold: 8 }), L(70, 47, 13, 6, { hold: 8 }),
    L(71, 55, 1, 6, { hold: 10 }), L(71, 53, 10, 6, { hold: 10 }), L(67, 45, 3, 6, { hold: 6 }), L(67, 56, 4, 6, { hold: 6 }),
  ];
  // the ambush: asleep on the ridges and in the plasma until turn 6, or until someone shoots at them
  const amb = (type, x, y, level = 6) => L(type, x, y, level, { hold: 6, wakes: true });
  const ambush = [
    amb(80, 16, 18), amb(80, 22, 17), amb(69, 28, 16), amb(69, 33, 15), amb(16, 19, 18), amb(15, 25, 17),
    amb(80, 22, 28), amb(80, 28, 27), amb(69, 34, 25), amb(69, 39, 24), amb(16, 25, 28), amb(15, 31, 26),
    amb(68, 24, 22), amb(68, 31, 24), amb(73, 23, 22), amb(73, 31, 23), amb(66, 25, 21), amb(66, 32, 25),
  ];
  const trap1 = [   // turn 3: behind the General, the west edge and the south edge
    L(38, 1, 22, 5, { cargo: [9, 9] }), L(8, 1, 25, 5), L(8, 2, 19, 5), L(8, 1, 27, 5), L(9, 3, 22, 5),
    L(10, 20, 40, 5), L(10, 23, 40, 5), L(12, 26, 40, 5), L(12, 18, 39, 5), L(9, 28, 40, 5),
  ];
  const north = [   // turn 6: the bribed cartel, out of the north
    L(33, 20, 1, 6, { cargo: [8, 8] }), L(31, 8, 2, 6), L(31, 34, 1, 6), L(50, 4, 1, 5), L(50, 28, 1, 5),
    L(51, 12, 1, 5), L(51, 40, 1, 5), L(41, 16, 1, 5), L(66, 26, 2, 6), L(66, 2, 10, 6),
  ];
  const east = [   // turn 9: Captain Osk, from the east
    L(32, 59, 22, 7, { name: 'Nodens · Captain Osk' }), L(40, 59, 26, 6), L(40, 59, 18, 6), L(60, 58, 30, 6), L(60, 58, 24, 6),
    L(60, 58, 20, 6), L(62, 59, 32, 6, { name: 'Pallas · ex-Eden' }), L(62, 59, 34, 6, { name: 'Pallas · ex-Eden' }), L(3, 57, 36, 5), L(3, 57, 26, 5),
  ];
  const trap2 = [   // turn 12: the trap closes again behind
    L(35, 1, 16, 6, { cargo: [12, 12] }), L(0, 1, 20, 5), L(0, 2, 13, 5), L(0, 16, 40, 5), L(2, 21, 40, 6),
    L(2, 25, 40, 6), L(15, 1, 18, 5), L(15, 30, 40, 5), L(70, 1, 24, 6), L(70, 33, 40, 6),
  ];
  const hesk = [   // turn 15: Major Hesk's flagship and the last of the General's old fleet
    L(59, 51, 7, 9, { name: 'Verdict · Major Hesk', cargo: [73, 73] }),
    L(61, 49, 9, 8, { name: 'Azoras · the General\'s old flagship' }), L(58, 53, 9, 8, { name: 'Selene Kai · Sato\'s old command', cargo: [74, 74] }),
    L(72, 48, 6, 7), L(72, 54, 7, 7), L(71, 47, 8, 7), L(71, 52, 9, 7), L(73, 50, 10, 7), L(73, 52, 5, 7),
  ];
  // Capital ships (owner, 2026-11-16): Varr's Tiamat in the court, Osk's Nodens from the east (turn 9),
  // Quill's Artemis closing the trap on turn 12, the Azoras with the Verdict (turn 15); Directorate
  // cruisers (Asura-II Kai) lead the reinforcements when the rock has had time.
  const su = new Set([...garrison, ...ambush, ...trap1, ...north, ...east, ...trap2, ...hesk].map((u) => `${u.x},${u.y}`));
  const pickAny = (test, centre, n) => {   // deck or void, nearest `centre` first
    const c = [];
    for (let y = 1; y <= cv.rows; y++) for (let x = 1; x <= cv.cols - 1; x++) if (test(x, y) && cv.ok(x, y) && cv.get(x, y) <= 4 && !su.has(`${x},${y}`)) c.push({ x, y });
    c.sort((a, b) => dist(a, centre) - dist(b, centre) || a.y - b.y || a.x - b.x);
    const out = c.slice(0, n); for (const h of out) su.add(`${h.x},${h.y}`); return out;
  };
  const q = pickAny((x, y) => x <= 2 && y >= 10 && y <= 30, { x: 1, y: 22 }, 1)[0];
  trap2.unshift(L(34, q.x, q.y, 7, { name: 'Artemis · the Ledger (Deputy Director Quill)' }));
  // The base reinforces (a regroup, a failed assault): js/colony/battle.js strongholdMission takes the
  // first RECKONING.reinforceStep x n of these into the garrison (and every enemy +n levels, at most 9).
  const rTypes = [72, 60, 80, 73, 70, 68, 60, 80, 72, 66, 69, 71, 31, 60, 80, 73, 72, 70, 42, 68, 60, 80, 73, 67];
  const reinforcements = pickAny((x, y) => x >= 38 && y <= 22, { x: 49, y: 10 }, rTypes.length).map((h, i) => L(rTypes[i], h.x, h.y, rTypes[i] === 72 ? 7 : 6, { hold: rTypes[i] === 72 ? 12 : 8, ...(rTypes[i] === 72 ? { name: 'Asura-II Kai · Directorate cruiser' } : {}) }));
  const units = [...garrison, ...ambush].map((u) => ({ ...u, army: 1 }));
  const arrivals = [
    { turn: 2, army: 1, wave: 'trap', units: trap1 }, { turn: 5, army: 1, wave: 'north', units: north },
    { turn: 8, army: 1, wave: 'east', units: east }, { turn: 11, army: 1, wave: 'trap2', units: trap2 },
    { turn: 14, army: 1, wave: 'hesk', units: hesk },
  ];
  const mission = {
    version: 1, name: 'HESK', title: 'Hesk\'s Stronghold', chapter: 'The Reckoning · II',
    screensW: 4, screensH: 4, pairs: PAIRS.map((p) => [...p]), grid: grid(cv), units, arrivals, cannons: [cannon],
    objective: { kind: 'flagship', type: 59 }, turnLimit: 30, flee: true, noFlee: true, awaitArrivals: true, music: 29, cap: 40,
    goal: 'Sink Major Hesk\'s flagship, the Verdict, within 30 turns. She comes out on turn 15. If the General falls, it is over.',
    home, generalAt: [7, 35], reinforcements,
    briefing: [
      'The rock has no name on any chart. Hesk bought that too.',
      'Inside it sits everything his circle could buy: Directorate hulls, cartel crews, turrets on every mount, and the last of the machines the General sold to keep Eden breathing.',
      'There is one way to end this: the Verdict, Hesk\'s flagship. She is not in the harbour yet. When she comes, sink her.',
      'They know we are coming. Expect them behind us as well as in front.',
    ].join('\n\n'),
    strategy: [
      'Three ways in: the meteoroid belt in the north (craft only, slow), the Gullet between the two ridges (fast, and too quiet), and the open south lane under the fortress cannon.',
      'The cannon fires straight down column 54 at every phase change while its tower stands. Cross it; never end a move in it.',
      'Waves: behind you on turn 3, out of the north on turn 6, from the east on turn 9, behind you again on turn 12, and the Verdict herself on turn 15.',
    'Capital ships: Varr\'s Tiamat in the court, Osk\'s Nodens from the east, Quill\'s Artemis behind you on turn 12, the Azoras with the Verdict (and Directorate cruisers if Hesk has had time to reinforce). Only the Verdict has to sink.',
    ],
    transmission: 'I gave the order once to save the Union from a scandal. I will give it again to save myself, General. Come in.',
  };
  const marks = [...units.map((u) => ({ x: u.x, y: u.y, mark: u.wakes ? 'z' : [23, 24].includes(u.type) ? 'g' : [17, 18].includes(u.type) ? 'm' : u.type === 57 ? 'T' : 'e' })),
    ...trap1.map((u) => ({ ...u, mark: '3' })), ...north.map((u) => ({ ...u, mark: '6' })), ...east.map((u) => ({ ...u, mark: '9' })),
    ...trap2.map((u) => ({ ...u, mark: 'c' })), ...reinforcements.map((u) => ({ ...u, mark: 'r' })), ...hesk.map((u) => ({ ...u, mark: u.type === 59 ? 'V' : 'f' })), ...home.slice(0, 40).map(([x, y]) => ({ x, y, mark: 'o' }))];
  return { mission, ascii: cv.ascii(marks) };
}

const out = new URL('../missions/colony/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const [file, make] of [['siege.json', siege], ['ambush.json', ambush], ['stronghold.json', stronghold]]) {
  const { mission, ascii, counterAscii } = make();
  // grid rows on one line each keeps the file readable
  const json = JSON.stringify(mission, null, 1).replace(/\[\s+([\d,\s-]+?)\s+\]/g, (m, inner) => `[${inner.replace(/\s+/g, '')}]`);
  writeFileSync(new URL(file, out), json + '\n');
  if (process.argv.includes('--ascii')) console.log(`\n${mission.title}\n${ascii}${counterAscii ? `\n\n${mission.counter.title}\n${counterAscii}` : ''}`);
}
console.log('wrote missions/colony/siege.json, ambush.json, stronghold.json');
