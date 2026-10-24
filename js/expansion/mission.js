// Expansion missions: maps and forces defined as JSON instead of ROM tables. The loader builds
// the 160-byte map header and the 62x42 cell grid that the engine reads from the ROM, and serves
// them through a ROM view, so rules.js and maps.js run on custom maps unchanged.
//
// Mission JSON (version 1):
//   name, title           map name (8 chars, like the ROM's) and mission title
//   screensW, screensH    size in 15x10 screens (1-4)
//   pairs                 [[graphic, terrainId], ...] up to 80; a cell value indexes this list
//   grid                  rows 0..rows+1 of values for columns 0..cols+1 (the cells around the playfield included)
//   units                 [{ type, army, x, y, neutral?, cargo?: [type, ...] }] (cargo = inside a dock/carrier)
//   arrivals              [{ turn, army, units: [{ type, x, y, cargo?: [...] }] }]
//   objective             { kind, ... } (see campaign rules), bonus, turnLimit, cap, briefing
import { MAP_COUNT, mapInfo } from '../maps.js';
import { terrainOf } from '../terrain.js';

export const GRID_W = 62, GRID_H = 42, MAX_PAIRS = 80;
export const SCREEN_COLS = 15, SCREEN_ROWS = 10;
const HEADER_ID = 'exp:header', GRID_ID = 'exp:grid', DEPLOY_ID = 'exp:deploy';

// Every (graphic, terrain id) pair the 30 ROM maps use, with its class and where it appears.
// These are the editor's paints: a pair keeps the ROM's own meaning for that graphic.
export function terrainPalette(rom) {
  const pairs = new Map();
  for (let m = 0; m < MAP_COUNT; m++) {
    const info = mapInfo(rom, m), header = rom.body(info.headerId), grid = rom.body(info.gridId);
    for (let cy = 0; cy <= info.rows + 1; cy++) {
      for (let cx = 0; cx <= info.cols + 1; cx++) {
        const v = grid[cy * GRID_W + cx], gfx = header[v], t = terrainOf(rom, header, v);
        const key = gfx * 256 + t.id;
        let p = pairs.get(key);
        if (!p) pairs.set(key, p = { gfx, id: t.id, type: t.type, cls: t.cls, count: 0, maps: new Set() });
        p.count++; p.maps.add(m);
      }
    }
  }
  return [...pairs.values()].sort((a, b) => a.cls - b.cls || b.count - a.count);
}

// `fill` is the [graphic, terrain id] pair every cell starts with (void space). The cells around
// the playfield are ordinary terrain in the ROM too; the game marks the bounds itself at run time.
export function blankMission(screensW, screensH, fill) {
  const pairs = [fill], cols = screensW * SCREEN_COLS, rows = screensH * SCREEN_ROWS;
  const grid = Array.from({ length: rows + 2 }, () => new Array(cols + 2).fill(0));
  return { version: 1, name: 'NEW', title: '', screensW, screensH, pairs, grid, units: [], arrivals: [], objective: { kind: 'annihilate' } };
}

// Columns 1..cols-1 and rows 1..rows are playable (FORMATS.md: a 1-screen map plays 1-14 x 1-10).
export function isFrame(cx, cy, cols, rows) { return cx === 0 || cy === 0 || cx >= cols || cy > rows; }

// Header and grid in the ROM's layout: header[v] = graphic, header[80 + v] = terrain id.
export function buildMap(mission) {
  if (mission.pairs.length > MAX_PAIRS) throw new Error(`${mission.pairs.length} terrain pairs, at most ${MAX_PAIRS}`);
  const header = new Uint8Array(160), grid = new Uint8Array(GRID_W * GRID_H);
  mission.pairs.forEach(([gfx, id], v) => { header[v] = gfx; header[80 + v] = id; });
  mission.grid.forEach((row, cy) => row.forEach((v, cx) => { grid[cy * GRID_W + cx] = v; }));
  const cols = mission.screensW * SCREEN_COLS, rows = mission.screensH * SCREEN_ROWS;
  const info = {
    index: -1, custom: true, name: mission.name, headerId: HEADER_ID, gridId: GRID_ID, deployId: DEPLOY_ID,
    screensW: mission.screensW, screensH: mission.screensH, cols, rows,
  };
  return { info, header, grid };
}

// A ROM whose body() also serves the mission's header and grid, for Battle and renderMap.
export function romView(rom, mission) {
  const { info, header, grid } = buildMap(mission);
  const view = Object.create(rom);
  const noDeploy = new Uint8Array(1);   // renderMap reads a ROM deployment; units come from the mission
  view.body = (k) => (k === HEADER_ID ? header : k === GRID_ID ? grid : k === DEPLOY_ID ? noDeploy : rom.body(k));
  return { rom: view, info };
}

// Units in the shape Battle's constructor takes (cargo rides in its host, as scenario.js does).
export function deployList(mission) {
  const out = [];
  for (const u of mission.units) {
    const host = { type: u.type, army: u.army, x: u.x, y: u.y, flag40: !!u.neutral, level: u.level, rosterId: u.rosterId, hold: u.hold };
    out.push(host);
    // cargo: unit types, or campaign machines { type, level, rosterId } (campaign.applyRoster)
    for (const c of u.cargo || []) out.push(typeof c === 'number' ? { type: c, army: u.army, x: u.x, y: u.y, carrier: host }
      : { type: c.type, army: u.army, x: u.x, y: u.y, carrier: host, level: c.level, rosterId: c.rosterId });
  }
  return out;
}

// Arrivals in scenario.js's shape.
export function arrivalList(mission) {
  return (mission.arrivals || []).map((e) => ({
    turn: e.turn, army: e.army, screen: [0, 0],
    units: e.units.map((u) => ({ type: u.type, flag40: false, x: u.x, y: u.y, cargo: u.cargo || [], ...(u.chase ? { chase: u.chase } : {}), ...(u.level !== undefined ? { level: u.level } : {}), ...(u.burner ? { burner: true } : {}) })),
  }));
}
