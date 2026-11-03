// Building kits for the colony's 3D view (docs/COLONY.md §6): every building is a handful of
// primitive parts, procedural now and textured later through the `slot` names (docs/COLONY.md §7).
// A part is { shape, size: [sx, sy, sz], pos: [x, y, z], rot?: [rx, ry, rz], color, slot?, glow? }:
//   shape  'box' | 'cylinder' | 'dome' | 'cone' | 'torus' (each a unit shape, scaled by size)
//   pos    centre of the part's base, in tiles from the footprint's centre at ground level
//   rot    radians, about the part's own centre (a rotated part keeps its centre, not its base)
//   glow   unlit (windows, beacons, coils), so it reads at night-dark zoom levels
//   shimmer  additive and see-through, gently pulsing (the Shield Pylon's dome); never picked
// Kits are sized to the footprint (buildings.js `size`) and coloured to read from straight above,
// where only the roofs show: a stepped white tower, green rows, blue panels, copper coils.
import { BUILDING } from '../data/buildings.js';

const P = (shape, size, pos, color, more) => ({ shape, size, pos, color, ...more });
const box = (size, pos, color, more) => P('box', size, pos, color, more);
const cyl = (size, pos, color, more) => P('cylinder', size, pos, color, more);
const dome = (size, pos, color, more) => P('dome', size, pos, color, more);
const cone = (size, pos, color, more) => P('cone', size, pos, color, more);
const torus = (size, pos, color, more) => P('torus', size, pos, color, more);
const GLOW = { glow: true };
const HALF_PI = Math.PI / 2;

const WIN = '#7fe0ff', BEACON = '#ff4a3a', STEEL = '#9aa3ad', DARK = '#3d444d', HAZARD = '#e8b52a';
const DEPOT_COLOR = { food: '#7cc04a', water: '#4a9ae0', air: '#e8eef4', parts: '#e08a3a', ore: '#9a7a5a' };

// Roads (buildings.js 'road') are not drawn from kits: view.js lays them as two InstancedMeshes
// that join up by 4-neighbours (slabs and kerbs, lane dashes). These are their measures; the kit
// below is only the placement ghost. Road tops are level (soil noise would make them step) and
// movers.js walks on the same heights.
export const ROAD = {
  top: 0.22, gateTop: 0.34, slab: 0.1,                  // surface height on floor / on a gate tile; slab depth
  asphalt: '#2c3038', junction: '#353a44', kerb: '#9aa2ac', dash: '#d9c06a',
  kerbW: 0.07, kerbH: 0.035, dashW: 0.04, dashL: 0.3,
};

const tree = (x, z, s, round) => [
  cyl([0.06 * s, 0.18 * s, 0.06 * s], [x, 0.04, z], '#6a4a2a'),
  round ? dome([0.36 * s, 0.32 * s, 0.36 * s], [x, 0.14 * s, z], '#4f9a3a')
        : cone([0.3 * s, 0.6 * s, 0.3 * s], [x, 0.12 * s, z], '#2f7a3a'),
];

// key → (level, mode) → parts
export const KITS = {
  // 3×3: a stepped white tower with glowing window bands, a tilted dish and a red beacon.
  command: () => [
    box([2.9, 0.25, 2.9], [0, 0, 0], '#59616b', { slot: 'mat/hull-plate' }),
    box([2.3, 0.9, 2.3], [0, 0.25, 0], '#c9ced6', { slot: 'mat/hull-plate' }),
    box([2.34, 0.12, 2.34], [0, 0.78, 0], WIN, GLOW),
    box([1.6, 0.8, 1.6], [0, 1.15, 0], '#dfe3ea'),
    box([1.64, 0.1, 1.64], [0, 1.6, 0], WIN, GLOW),
    box([0.9, 0.7, 0.9], [0, 1.95, 0], '#f2f4f7'),
    torus([1.15, 0.08, 1.15], [0, 2.55, 0], '#d9b23a'),
    cyl([0.07, 0.9, 0.07], [0, 2.65, 0], STEEL),
    dome([0.2, 0.14, 0.2], [0, 3.55, 0], BEACON, GLOW),
    cyl([0.08, 0.35, 0.08], [0.78, 1.15, 0.78], STEEL),
    dome([1.0, 0.3, 1.0], [0.78, 1.25, 0.78], '#e8ecf0', { rot: [Math.PI - 0.6, 0, 0.5] }),
    box([0.5, 0.35, 0.5], [-1.0, 0.25, 1.0], '#8a929c'),
  ],
  // 2×2 on the hull: a landing ring with lights under a yellow gantry and crane arm.
  dock: () => [
    box([2, 0.15, 2], [0, 0, 0], '#4a525c', { slot: 'mat/hull-plate' }),
    cyl([1.35, 0.05, 1.35], [0.1, 0.15, 0.15], '#2b3138'),
    torus([1.4, 0.05, 1.4], [0.1, 0.17, 0.15], '#ffd23a', GLOW),
    box([0.15, 1.4, 0.15], [-0.85, 0.15, -0.8], HAZARD),
    box([0.15, 1.4, 0.15], [0.85, 0.15, -0.8], HAZARD),
    box([1.9, 0.18, 0.22], [0, 1.55, -0.8], HAZARD),
    box([0.18, 0.14, 1.7], [0.25, 1.4, 0.0], '#d08a1a'),
    cyl([0.04, 0.6, 0.04], [0.25, 0.8, 0.6], STEEL),
    box([0.45, 0.4, 0.45], [-0.72, 0.15, 0.72], '#c9ced6'),
    box([0.47, 0.1, 0.47], [-0.72, 0.4, 0.72], WIN, GLOW),
  ],
  // 2×2: an orange hangar with a barrel roof and one crane per crew.
  repairyard: (level) => [
    box([1.96, 0.08, 1.96], [0, 0, 0], '#6a6e74'),
    box([1.1, 0.45, 1.4], [-0.35, 0.08, 0], '#c4773a'),
    cyl([1.1, 1.4, 0.7], [-0.35, -0.17, 0], '#d98a44', { rot: [HALF_PI, 0, 0] }),
    ...[0, 1, 2].slice(0, level || 1).flatMap((k) => [
      box([0.12, 1.2, 0.12], [0.65, 0.08, -0.65 + k * 0.6], HAZARD),
      box([0.7, 0.1, 0.1], [0.4, 1.28, -0.65 + k * 0.6], HAZARD),
    ]),
  ],
  // 1×1: stacked containers in the colour of what it holds.
  depot: (level, mode) => {
    const c = DEPOT_COLOR[mode || 'food'];
    return [
      box([0.9, 0.06, 0.9], [0, 0, 0], '#5a5e64'),
      box([0.8, 0.28, 0.36], [0, 0.06, -0.2], c),
      box([0.8, 0.28, 0.36], [0, 0.06, 0.2], c),
      box([0.8, 0.28, 0.36], [0, 0.34, 0], c),
      box([0.82, 0.03, 0.03], [0, 0.62, 0], '#ffffff'),
    ];
  },
  // 1×1: rows of tilted blue panels on posts; more rows with each level.
  solar: (level) => {
    const rows = (level || 1) + 1, step = 0.9 / rows, parts = [box([0.94, 0.04, 0.94], [0, 0, 0], '#4a525c')];
    for (let k = 0; k < rows; k++) {
      const z = -0.45 + step * (k + 0.5);
      parts.push(cyl([0.05, 0.2, 0.05], [0, 0.04, z], STEEL));
      parts.push(box([0.86, 0.035, step * 0.92], [0, 0.22, z], '#2647a8', { rot: [-0.45, 0, 0], slot: 'mat/solar-cell' }));
    }
    return parts;
  },
  // 2×2 on a magnetic belt: two copper coil towers with glowing caps and an arc between them.
  induction: () => {
    const parts = [box([1.9, 0.1, 1.9], [0, 0, 0], '#2a2f4a')];
    for (const [x, z] of [[-0.48, -0.48], [0.48, 0.48]]) {
      parts.push(cyl([0.24, 1.5, 0.24], [x, 0.1, z], STEEL));
      for (let k = 0; k < 4; k++) parts.push(torus([0.78, 0.13, 0.78], [x, 0.25 + k * 0.3, z], '#d07a3a'));
      parts.push(dome([0.34, 0.2, 0.34], [x, 1.6, z], '#9fb4ff', GLOW));
    }
    parts.push(box([0.06, 0.06, 1.36], [0, 1.7, 0], '#bfe0ff', { rot: [0, Math.PI / 4, 0], ...GLOW }));
    parts.push(box([0.5, 0.3, 0.5], [0.5, 0.1, -0.5], DARK));
    return parts;
  },
  // 1×1: a dark cabinet with three green-capped cells.
  battery: () => [
    box([0.82, 0.42, 0.62], [0, 0, 0], '#3b4550'),
    ...[-0.25, 0, 0.25].flatMap((x) => [
      cyl([0.18, 0.2, 0.18], [x, 0.42, 0], '#c9ced6'),
      cyl([0.19, 0.05, 0.19], [x, 0.62, 0], '#5fff8a', GLOW),
    ]),
  ],
  // 1×1 by the river: a pump house, a blue water wheel and a tank.
  riverpump: () => [
    box([0.9, 0.06, 0.9], [0, 0, 0], '#6a6e74'),
    box([0.5, 0.42, 0.5], [-0.15, 0.06, -0.15], '#8a9aa8'),
    torus([0.55, 0.1, 0.55], [0.22, 0.2, 0.15], '#4aa8e8', { rot: [HALF_PI, 0, 0] }),
    cyl([0.32, 0.3, 0.32], [-0.2, 0.06, 0.25], '#d9e2ea'),
    dome([0.32, 0.12, 0.32], [-0.2, 0.36, 0.25], '#4aa8e8'),
  ],
  // 2×2: three white tanks, a pipe rack and a tall striped stack.
  airplant: () => [
    box([1.96, 0.08, 1.96], [0, 0, 0], '#6a6e74'),
    ...[[-0.5, -0.5], [0.2, -0.5], [-0.5, 0.2]].flatMap(([x, z]) => [
      cyl([0.6, 0.8, 0.6], [x, 0.08, z], '#e8eef4', { slot: 'mat/tank' }),
      dome([0.6, 0.28, 0.6], [x, 0.88, z], '#f4f7fa'),
    ]),
    box([1.3, 0.12, 0.12], [-0.15, 0.6, -0.15], STEEL),
    box([0.55, 0.45, 0.55], [0.4, 0.08, 0.35], '#8a929c'),
    box([0.57, 0.08, 0.57], [0.4, 0.4, 0.35], '#9fe8ff', GLOW),
    cyl([0.24, 2.3, 0.24], [0.62, 0.08, -0.6], '#c9ced6'),
    cyl([0.26, 0.16, 0.26], [0.62, 2.0, -0.6], BEACON),
  ],
  // 1×1: a few young conifers.
  grove: () => [
    box([0.94, 0.04, 0.94], [0, 0, 0], '#4a7a34'),
    ...tree(-0.22, -0.2, 1.1), ...tree(0.24, -0.12, 0.9), ...tree(-0.05, 0.25, 1.2), ...tree(0.3, 0.3, 0.7),
  ],
  // 1×1 on a breach: a hazard-striped plug with a green "sealed" light.
  seal: () => [
    box([0.96, 1.7, 0.96], [0, 0, 0], '#c99a2a', { slot: 'mat/hull-plate' }),
    box([0.98, 0.14, 0.98], [0, 0.4, 0], '#2a2a2a'),
    box([0.98, 0.14, 0.98], [0, 1.0, 0], '#2a2a2a'),
    box([0.4, 0.06, 0.4], [0, 1.7, 0], '#7dff9a', GLOW),
  ],
  // 2×2: flat crop rows on tilled soil; gold for cash crops, bare furrows when fallow.
  farm: (level, mode) => {
    const crop = mode === 'cash' ? '#d9c24a' : mode === 'fallow' ? '#6a4a2c' : '#6fbf3a';
    const h = mode === 'fallow' ? 0.04 : 0.14, parts = [box([1.94, 0.05, 1.94], [0, 0, 0], '#5a4128', { slot: 'mat/soil' })];
    for (let k = 0; k < 5; k++) parts.push(box([1.8, h, 0.22], [0, 0.05, -0.72 + k * 0.36], crop));
    return parts;
  },
  // 1×1: a glass barrel-roofed greenhouse glowing green inside.
  hydro: () => [
    box([0.9, 0.18, 0.9], [0, 0, 0], '#7c848c'),
    box([0.7, 0.05, 0.7], [0, 0.18, 0], '#b8ff9a', GLOW),
    cyl([0.62, 0.86, 0.62], [0, -0.13, 0], '#a6e3d0', { rot: [0, 0, HALF_PI], slot: 'mat/greenhouse-glass' }),
  ],
  // 2×2 on an asteroid: a raised platform, a drill derrick, a conveyor and a glinting ore heap.
  oremine: () => [
    box([1.9, 0.4, 1.9], [0, 0, 0], '#5c6066'),
    box([0.8, 0.12, 0.8], [-0.4, 0.4, -0.4], HAZARD),
    cone([0.75, 1.9, 0.75], [-0.4, 0.52, -0.4], '#c8a040'),
    box([0.25, 0.25, 0.25], [-0.4, 2.3, -0.4], BEACON, GLOW),
    box([0.22, 0.08, 1.2], [0.35, 0.6, -0.15], DARK, { rot: [0.3, 0, 0] }),
    cone([0.8, 0.5, 0.8], [0.45, 0.4, 0.5], '#7a5a3a'),
    dome([0.3, 0.12, 0.3], [0.5, 0.75, 0.5], '#ffb84a', GLOW),
  ],
  // 2×2: scrap heaps, a crusher and a yellow crane with a claw.
  salvage: (level, mode) => [
    box([1.96, 0.06, 1.96], [0, 0, 0], '#5a5650'),
    cone([0.7, 0.45, 0.7], [-0.5, 0.06, 0.45], '#8a5a3a'),
    cone([0.55, 0.35, 0.55], [0.05, 0.06, 0.6], '#6a6a70'),
    cone([0.5, 0.3, 0.5], [-0.6, 0.06, -0.1], '#9a6a40'),
    box([0.6, 0.5, 0.6], [0.5, 0.06, 0.45], mode === 'careful' ? '#4a7a58' : '#4a5058'),
    box([0.18, 1.6, 0.18], [0.55, 0.06, -0.55], HAZARD),
    box([1.4, 0.12, 0.14], [0.0, 1.6, -0.55], HAZARD),
    cyl([0.03, 0.5, 0.03], [-0.6, 1.1, -0.55], STEEL),
    cone([0.22, 0.2, 0.22], [-0.6, 0.9, -0.55], DARK, { rot: [Math.PI, 0, 0] }),
  ],
  // 1×1: a home that grows with its level: a domed shelter, quarters, then an apartment tower.
  habitat: (level) => {
    const lv = Math.max(1, Math.min(3, level || 1)), h = [0.5, 1.1, 1.9][lv - 1], w = lv === 3 ? 0.74 : 0.8;
    const parts = [box([0.94, 0.05, 0.94], [0, 0, 0], '#6a6e74'), box([w, h, w], [0, 0.05, 0], '#e8dcc4', { slot: 'mat/hab-facade' })];
    for (let y = 0.25; y < h - 0.05; y += 0.4) parts.push(box([w + 0.03, 0.08, w + 0.03], [0, 0.05 + y, 0], '#ffd98a', GLOW));
    if (lv === 1) parts.push(dome([0.6, 0.25, 0.6], [0, 0.05 + h, 0], '#d8cbb0'));
    if (lv === 2) parts.push(box([0.6, 0.06, 0.6], [0, 0.05 + h, 0], '#5fae4a'));
    if (lv === 3) parts.push(box([0.5, 0.15, 0.5], [0, 0.05 + h, 0], '#c4b8a0'), cyl([0.04, 0.4, 0.04], [0.2, 0.2 + h, 0.2], STEEL), dome([0.08, 0.06, 0.08], [0.2, 0.6 + h, 0.2], BEACON, GLOW));
    return parts;
  },
  // 1×1: a strip of road (the ghost only; view.js draws placed roads itself).
  road: () => [
    box([1, 0.07, 1], [0, 0, 0], ROAD.asphalt),
    box([ROAD.dashW, 0.01, 0.8], [0, 0.07, 0], ROAD.dash, GLOW),
  ],
  // 1×1: lawn, a pond and round trees.
  park: () => [
    box([0.96, 0.05, 0.96], [0, 0, 0], '#6fbf4a'),
    cyl([0.36, 0.03, 0.3], [0.18, 0.05, 0.2], '#4aa0e0'),
    ...tree(-0.25, -0.22, 1.1, true), ...tree(0.22, -0.25, 0.9, true), ...tree(-0.25, 0.25, 0.8, true),
  ],

  // ---------------------------------------------------------------- version 2 (docs/COLONY-V2.md)
  // Services read violet / teal, industry orange and hot, life blue and white, food green.

  // 2×2: a white block with a violet window band, a big observatory dome, an antenna with a red
  // beacon and a dish; a second dome at level 2, a taller antenna with a glowing ring at level 3.
  lab: (level) => {
    const lv = Math.max(1, Math.min(3, level || 1)), mast = lv === 3 ? 1.9 : 1.3;
    const parts = [
      box([1.94, 0.08, 1.94], [0, 0, 0], '#555c66'),
      box([1.5, 0.5, 1.25], [-0.12, 0.08, 0.18], '#d8dde4'),
      box([1.53, 0.08, 1.28], [-0.12, 0.38, 0.18], '#b89cff', GLOW),
      dome([1.0, 0.62, 1.0], [-0.38, 0.58, 0.2], '#eef4fb'),
      torus([1.05, 0.05, 1.05], [-0.38, 0.56, 0.2], '#8a7ad8'),
      box([0.16, 0.05, 0.9], [-0.38, 1.08, 0.2], '#3a3f6a', { rot: [0, 0.6, 0] }),   // the dome's shutter
      cyl([0.06, mast, 0.06], [0.62, 0.08, -0.62], STEEL),
      dome([0.14, 0.12, 0.14], [0.62, 0.08 + mast, -0.62], BEACON, GLOW),
      cyl([0.06, 0.32, 0.06], [0.62, 0.08, 0.7], STEEL),
      dome([0.46, 0.14, 0.46], [0.62, 0.4, 0.7], '#f2f4f7', { rot: [Math.PI - 0.7, 0, 0] }),
    ];
    if (lv >= 2) parts.push(box([0.6, 0.36, 0.6], [0.55, 0.08, -0.05], '#c9ced6'), dome([0.5, 0.32, 0.5], [0.55, 0.44, -0.05], '#d9ccff'));
    if (lv >= 3) parts.push(torus([0.4, 0.05, 0.4], [0.62, 0.08 + mast * 0.7, -0.62], '#c3a6ff', GLOW), box([1.53, 0.06, 1.28], [-0.12, 0.2, 0.18], '#b89cff', GLOW));
    return parts;
  },
  // 1×1: a white tank with a glowing blue ring and one filter column more per level.
  reclaimer: (level) => {
    const lv = Math.max(1, Math.min(3, level || 1)), parts = [
      box([0.92, 0.05, 0.92], [0, 0, 0], '#5a6470'),
      cyl([0.5, 0.55, 0.5], [-0.17, 0.05, -0.12], '#dbe8f2', { slot: 'mat/tank' }),
      dome([0.5, 0.18, 0.5], [-0.17, 0.6, -0.12], '#5aa8ff'),
      torus([0.56, 0.06, 0.56], [-0.17, 0.32, -0.12], '#5fd0ff', GLOW),
      box([0.5, 0.06, 0.06], [0.05, 0.25, 0.22], STEEL),
    ];
    for (let k = 0; k <= lv; k++) {
      const h = 0.34 + 0.08 * k, x = -0.3 + k * 0.21;
      parts.push(cyl([0.15, h, 0.15], [x, 0.05, 0.27], '#8ab4d8'), cyl([0.16, 0.04, 0.16], [x, 0.05 + h, 0.27], '#7fe0ff', GLOW));
    }
    return parts;
  },
  // 2×2 on the comet's tail: frosted tanks with ice rings, a melter with a cyan vent, ice blocks.
  iceharvester: () => [
    box([1.9, 0.14, 1.9], [0, 0, 0], '#4a5868'),
    ...[[-0.5, -0.45], [0.18, -0.52], [-0.52, 0.22]].flatMap(([x, z], k) => [
      cyl([0.6, 0.85 - k * 0.12, 0.6], [x, 0.14, z], '#e3f4fc', { slot: 'mat/tank' }),
      dome([0.6, 0.26, 0.6], [x, 0.99 - k * 0.12, z], '#ffffff'),
      torus([0.66, 0.05, 0.66], [x, 0.36, z], '#a8e4f8'),
      torus([0.66, 0.05, 0.66], [x, 0.7 - k * 0.12, z], '#a8e4f8'),
    ]),
    box([0.62, 0.42, 0.62], [0.45, 0.14, 0.42], '#7a8a9a'),
    box([0.64, 0.08, 0.64], [0.45, 0.42, 0.42], '#9ff0ff', GLOW),
    cyl([0.16, 0.5, 0.16], [0.6, 0.56, 0.6], '#c9d6e0'),
    box([0.08, 0.08, 0.9], [-0.15, 0.62, -0.1], STEEL, { rot: [0, Math.PI / 4, 0] }),
    box([0.22, 0.16, 0.2], [0.05, 0.14, 0.62], '#cdeefa', { rot: [0, 0.5, 0] }),
    box([0.18, 0.14, 0.16], [-0.12, 0.14, 0.78], '#bfe8f8', { rot: [0, 1.1, 0] }),
  ],
  // 2×2 over the atmosphere: a hovering platform with two gas spheres, a hazard hose dangling
  // down to a copper funnel whose mouth glows in the air below.
  gasscoop: () => [
    box([1.6, 0.16, 1.6], [0, 1.25, 0], '#c9ced6'),
    torus([1.5, 0.05, 1.5], [0, 1.2, 0], '#7fd0ff', GLOW),
    ...[[-0.45, -0.35], [0.42, 0.38]].flatMap(([x, z]) => [
      dome([0.7, 0.36, 0.7], [x, 1.76, z], '#eef4fb'),
      dome([0.7, 0.3, 0.7], [x, 1.46, z], '#d6e4f0', { rot: [Math.PI, 0, 0] }),
    ]),
    box([0.4, 0.3, 0.4], [0.45, 1.41, -0.45], '#8a929c'),
    dome([0.12, 0.1, 0.12], [0.45, 1.71, -0.45], BEACON, GLOW),
    cyl([0.09, 1.3, 0.09], [0, -0.05, 0], HAZARD),
    cone([0.95, 0.55, 0.95], [0, -0.45, 0], '#d07a3a'),
    torus([0.95, 0.05, 0.95], [0, -0.47, 0], '#9fe8ff', GLOW),
    ...[-1, 1].map((s) => box([0.06, 0.06, 0.9], [s * 0.4, 0.75, 0], STEEL, { rot: [s * 0.6, 0, 0] })),
  ],
  // 2×2 on the hills: three stepped terraces of round fruit trees, orange fruit on top.
  orchard: () => {
    const parts = [];
    for (let r = 0; r < 3; r++) {
      const z = -0.62 + r * 0.62, y = r * 0.12;
      parts.push(box([1.92, 0.1 + y, 0.62], [0, 0, z], '#7a6a3a'), box([1.92, 0.04, 0.6], [0, 0.1 + y, z], '#6aa83a'));
      for (let c = 0; c < 4; c++) {
        const x = -0.7 + c * 0.47 + (r % 2) * 0.12, s = 0.85 + 0.15 * ((r + c) % 2);
        parts.push(cyl([0.05, 0.1, 0.05], [x, 0.14 + y, z], '#6a4a2a'),
          dome([0.34 * s, 0.3 * s, 0.34 * s], [x, 0.2 + y, z], '#3f8a34'),
          dome([0.1, 0.07, 0.1], [x + 0.04, 0.2 + y + 0.28 * s, z - 0.03], c % 2 ? '#ff8a3a' : '#ffcf3a'));
      }
    }
    return parts;
  },
  // 1×1 by the river: a blue-roofed shed, a wooden jetty, a net drum and a glowing fish tank.
  fishery: () => [
    box([0.92, 0.05, 0.92], [0, 0, 0], '#6a6e74'),
    box([0.5, 0.32, 0.46], [-0.18, 0.05, -0.16], '#e4e8ee'),
    box([0.56, 0.08, 0.52], [-0.18, 0.37, -0.16], '#3a7ae8'),
    box([0.22, 0.05, 0.9], [0.3, 0.06, 0.02], '#9a7450'),
    cyl([0.22, 0.24, 0.22], [0.3, 0.11, -0.26], '#e8b52a', { rot: [0, 0, HALF_PI] }),
    cyl([0.36, 0.14, 0.36], [-0.18, 0.05, 0.26], '#2a4a58'),
    cyl([0.32, 0.03, 0.32], [-0.18, 0.19, 0.26], '#4ad8c8', GLOW),
  ],
  // 1×1: a warm diner with orange windows, a red roof, a round sign (amber: hot meals, red:
  // rationing) and a chimney with a white puff.
  canteen: (level, mode) => [
    box([0.92, 0.05, 0.92], [0, 0, 0], '#6a6e74'),
    box([0.78, 0.36, 0.66], [0, 0.05, 0.06], '#ead9b8'),
    box([0.8, 0.1, 0.68], [0, 0.18, 0.06], '#ffb84a', GLOW),
    box([0.84, 0.07, 0.72], [0, 0.41, 0.06], '#c4502a'),
    cyl([0.04, 0.3, 0.04], [-0.28, 0.48, -0.2], STEEL),
    cyl([0.34, 0.05, 0.34], [-0.28, 0.6, -0.27], mode === 'ration' ? '#ff5a3a' : '#ffd23a', { rot: [0.9, 0, 0], ...GLOW }),
    cyl([0.1, 0.3, 0.1], [0.26, 0.48, 0.2], '#9aa3ad'),
    dome([0.18, 0.14, 0.18], [0.26, 0.8, 0.2], '#f4f7fa'),
  ],
  // 1×1: a squat bunker under a green glass dome, sprouts at the corners.
  seedvault: () => [
    box([0.94, 0.05, 0.94], [0, 0, 0], '#5a4a30', { slot: 'mat/soil' }),
    box([0.76, 0.26, 0.76], [0, 0.05, 0], '#a4a494'),
    box([0.78, 0.04, 0.78], [0, 0.31, 0], '#7a7a6c'),
    dome([0.56, 0.36, 0.56], [0, 0.33, 0], '#8fe38a'),
    torus([0.6, 0.05, 0.6], [0, 0.33, 0], '#b8ff9a', GLOW),
    box([0.22, 0.18, 0.04], [0, 0.05, 0.39], '#3d444d'),
    ...[[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]].map(([x, z]) => cone([0.1, 0.16, 0.1], [x, 0.05, z], '#5fbf3a')),
  ],
  // 2×2: a dark furnace hall with a glowing mouth and a molten channel, a converter with a hot
  // top, an ore hopper and a tall banded stack with a red light.
  smelter: () => [
    box([1.94, 0.06, 1.94], [0, 0, 0], '#4a4440'),
    box([1.1, 0.72, 1.2], [-0.38, 0.06, -0.12], '#6a5a50'),
    box([1.14, 0.08, 1.24], [-0.38, 0.78, -0.12], '#3d3632'),
    box([0.5, 0.32, 0.06], [-0.38, 0.06, 0.5], '#ff7a1a', GLOW),
    box([0.2, 0.03, 0.42], [-0.38, 0.06, 0.74], '#ffa030', GLOW),
    cyl([0.62, 0.55, 0.62], [0.5, 0.06, 0.48], '#5a5a60'),
    dome([0.5, 0.18, 0.5], [0.5, 0.61, 0.48], '#ff8a2a', GLOW),
    cone([0.5, 0.42, 0.5], [-0.38, 0.86, -0.3], '#9a7a5a', { rot: [Math.PI, 0, 0] }),
    cyl([0.3, 2.4, 0.3], [0.58, 0.06, -0.58], '#8a7a70'),
    cyl([0.32, 0.12, 0.32], [0.58, 1.6, -0.58], HAZARD),
    cyl([0.32, 0.12, 0.32], [0.58, 2.1, -0.58], HAZARD),
    dome([0.12, 0.1, 0.12], [0.58, 2.46, -0.58], BEACON, GLOW),
  ],
  // 2×2: a white sawtooth-roofed hall with skylights, a yellow crane arm and orange parts crates.
  fabricator: () => [
    box([1.94, 0.06, 1.94], [0, 0, 0], '#5a5e64'),
    box([1.2, 0.55, 1.3], [-0.32, 0.06, -0.2], '#c9ced6'),
    ...[-0.62, -0.32, -0.02].flatMap((x) => [
      box([0.28, 0.06, 1.3], [x, 0.66, -0.2], '#e6eaef', { rot: [0, 0, 0.5] }),
      box([0.05, 0.16, 1.28], [x + 0.13, 0.61, -0.2], '#7fe0ff', GLOW),
    ]),
    box([0.14, 1.55, 0.14], [0.66, 0.06, 0.62], HAZARD),
    box([1.25, 0.1, 0.12], [0.2, 1.55, 0.62], HAZARD, { rot: [0, 0.35, 0] }),
    box([0.24, 0.16, 0.2], [0.72, 1.48, 0.62], DARK),
    cyl([0.025, 0.55, 0.025], [-0.28, 0.98, 0.42], STEEL),
    box([0.26, 0.18, 0.26], [-0.28, 0.8, 0.42], '#e08a3a'),
    ...[[0.48, -0.5], [0.72, -0.5], [0.6, -0.2], [0.6, -0.5]].map(([x, z], k) => box([0.22, 0.2, 0.22], [x, 0.06 + (k === 3 ? 0.2 : 0), z], k % 2 ? '#f0a050' : '#e08a3a')),
  ],
  // 1×1 on a meteoroid drift: a white pod on a pad inside a tilted yellow sweep ring, with a
  // glowing magnet and a beacon.
  sweeper: () => [
    box([0.86, 0.08, 0.86], [0, 0, 0], '#3d444d'),
    cyl([0.36, 0.34, 0.36], [0, 0.08, 0], '#e8eef4'),
    dome([0.36, 0.14, 0.36], [0, 0.42, 0], '#c9ced6'),
    torus([0.98, 0.08, 0.98], [0, 0.36, 0], HAZARD, { rot: [0.28, 0, 0.12] }),
    ...[0, 1, 2, 3].map((k) => box([0.42, 0.04, 0.05], [0.24 * Math.cos(k * HALF_PI), 0.36, 0.24 * Math.sin(k * HALF_PI)], STEEL, { rot: [0, -k * HALF_PI, 0] })),
    cyl([0.2, 0.05, 0.2], [0, 0.56, 0], '#9fe8ff', GLOW),
    dome([0.08, 0.07, 0.08], [0.18, 0.5, -0.18], BEACON, GLOW),
  ],
  // 2×2: a walled basin whose spoil heap grows with b.fill (0..100); the lamp turns red near full.
  tailings: (level, mode, b) => {
    const f = Math.max(0, Math.min(1, (b?.fill || 0) / 100)), s = 0.45 + 0.55 * f;
    const parts = [
      box([1.94, 0.05, 1.94], [0, 0, 0], '#3e3a36'),
      box([1.94, 0.3, 0.1], [0, 0.05, -0.92], '#7a7066'), box([1.94, 0.3, 0.1], [0, 0.05, 0.92], '#7a7066'),
      box([0.1, 0.3, 1.74], [-0.92, 0.05, 0], '#7a7066'), box([0.1, 0.3, 1.74], [0.92, 0.05, 0], '#7a7066'),
      cone([1.6 * s, 0.08 + 1.05 * f, 1.6 * s], [-0.08, 0.05, 0.05], '#8a6a4a'),
      box([0.16, 0.06, 1.1], [0.62, 0.42, -0.25], DARK, { rot: [0.5, 0, 0] }),
      cyl([0.05, 0.8, 0.05], [0.8, 0.05, -0.8], STEEL),
      dome([0.14, 0.12, 0.14], [0.8, 0.85, -0.8], f >= 0.9 ? '#ff3a2a' : f >= 0.6 ? '#ffb02a' : '#5fff8a', GLOW),
    ];
    if (f > 0.25) parts.push(cone([0.9 * s, 0.05 + 0.6 * f, 0.9 * s], [0.42, 0.05, 0.5], '#6e5640'));
    if (f > 0.55) parts.push(cone([0.7 * s, 0.05 + 0.45 * f, 0.7 * s], [-0.5, 0.05, -0.5], '#9a7a5a'));
    return parts;
  },
  // 2×2 on a plasma lake: three coil towers ringed in glowing magenta, a containment tank and arcs.
  plasmaskimmer: () => {
    const parts = [box([1.9, 0.1, 1.9], [0, 0, 0], '#2a2238')];
    const towers = [[-0.5, -0.5], [0.5, -0.45], [-0.45, 0.5]];
    for (const [x, z] of towers) {
      parts.push(cyl([0.18, 1.25, 0.18], [x, 0.1, z], STEEL));
      for (let k = 0; k < 3; k++) parts.push(torus([0.6 - k * 0.08, 0.12, 0.6 - k * 0.08], [x, 0.3 + k * 0.32, z], '#ff4ad8', GLOW));
      parts.push(dome([0.3, 0.2, 0.3], [x, 1.35, z], '#ffb8f0', GLOW));
    }
    parts.push(box([0.05, 0.05, 1.0], [0, 1.44, -0.48], '#ff9af0', { rot: [0, HALF_PI, 0], ...GLOW }));
    parts.push(box([0.05, 0.05, 1.0], [-0.48, 1.44, 0], '#ff9af0', GLOW));
    parts.push(cyl([0.62, 0.5, 0.62], [0.48, 0.1, 0.48], '#c9ced6', { slot: 'mat/tank' }), torus([0.68, 0.06, 0.68], [0.48, 0.42, 0.48], '#ff6ae8', GLOW),
      dome([0.62, 0.2, 0.62], [0.48, 0.6, 0.48], '#e8eef4'));
    return parts;
  },
  // 1×1: a tall thin mast with guy rings, a cyan emitter ring and a gold beacon on top.
  tether: () => [
    box([0.6, 0.12, 0.6], [0, 0, 0], '#4a525c'),
    ...[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([x, z]) => box([0.06, 0.6, 0.06], [x * 0.6, 0.12, z * 0.6], STEEL, { rot: [z * 0.5, 0, -x * 0.5] })),
    cyl([0.09, 4.1, 0.09], [0, 0.12, 0], '#dfe3ea'),
    ...[1.2, 2.3, 3.3].map((y) => torus([0.32, 0.04, 0.32], [0, y, 0], HAZARD)),
    torus([0.6, 0.06, 0.6], [0, 4.0, 0], '#6fd3ff', GLOW),
    dome([0.24, 0.22, 0.24], [0, 4.22, 0], '#ffd23a', GLOW),
  ],
  // 1×1: a grey hangar with a lit door, a landing pad on its roof (gold ring) and two parked drones.
  dronebay: () => [
    box([0.92, 0.05, 0.92], [0, 0, 0], '#5a6068'),
    box([0.82, 0.36, 0.82], [0, 0.05, 0], '#8a929c'),
    box([0.4, 0.24, 0.04], [0, 0.05, 0.42], '#7fe0ff', GLOW),
    cyl([0.66, 0.03, 0.66], [0, 0.41, 0], '#2b3138'),
    torus([0.62, 0.04, 0.62], [0, 0.43, 0], '#ffd23a', GLOW),
    ...[[-0.12, -0.08], [0.15, 0.12]].flatMap(([x, z]) => [
      cyl([0.16, 0.05, 0.16], [x, 0.45, z], '#e8eef4'),
      torus([0.26, 0.03, 0.26], [x, 0.46, z], '#d07a3a'),
    ]),
    cyl([0.03, 0.4, 0.03], [0.34, 0.41, -0.34], STEEL),
    dome([0.07, 0.06, 0.07], [0.34, 0.81, -0.34], BEACON, GLOW),
  ],
  // 1×1: white health care with a teal plus inside a ring on the roof; it grows with its level
  // (Clinic, Medical Centre with a wing, Hospital tower with a roof pad).
  clinic: (level) => {
    const lv = Math.max(1, Math.min(3, level || 1)), h = [0.42, 0.72, 1.15][lv - 1], w = [0.72, 0.8, 0.84][lv - 1];
    const parts = [
      box([0.94, 0.05, 0.94], [0, 0, 0], '#6a6e74'),
      box([w, h, w], [0, 0.05, 0], '#f4f7fa'),
    ];
    for (let y = 0.18; y < h - 0.08; y += 0.3) parts.push(box([w + 0.03, 0.07, w + 0.03], [0, 0.05 + y, 0], '#3ad8c8', GLOW));
    if (lv >= 2) parts.push(box([0.3, h * 0.55, 0.86], [w / 2 - 0.05, 0.05, 0], '#e6ecf0'));
    const top = 0.05 + h;
    parts.push(
      box([w * 0.9, 0.04, w * 0.9], [0, top, 0], '#dfe6ea'),
      torus([w * 0.85, 0.05, w * 0.85], [0, top + 0.02, 0], '#2ac8b8', GLOW),
      box([w * 0.52, 0.05, 0.13], [0, top + 0.03, 0], '#2ac8b8', GLOW),
      box([0.13, 0.05, w * 0.52], [0, top + 0.03, 0], '#2ac8b8', GLOW),
    );
    if (lv === 3) parts.push(cyl([0.04, 0.3, 0.04], [w / 2 - 0.08, top, -w / 2 + 0.08], STEEL), dome([0.08, 0.06, 0.08], [w / 2 - 0.08, top + 0.3, -w / 2 + 0.08], BEACON, GLOW));
    return parts;
  },
  // 1×1: a hazard-yellow warden's hut with a dark roof and orange beacon, and a tall street lamp.
  safetypost: () => [
    box([0.92, 0.05, 0.92], [0, 0, 0], '#5a5e64'),
    box([0.58, 0.42, 0.58], [-0.1, 0.05, 0.08], HAZARD),
    box([0.6, 0.08, 0.6], [-0.1, 0.18, 0.08], '#2a2a2a'),
    box([0.64, 0.06, 0.64], [-0.1, 0.47, 0.08], '#3d444d'),
    dome([0.14, 0.12, 0.14], [-0.1, 0.53, 0.08], '#ff8a2a', GLOW),
    cyl([0.05, 1.05, 0.05], [0.32, 0.05, -0.3], STEEL),
    box([0.22, 0.04, 0.06], [0.24, 1.06, -0.3], STEEL),
    dome([0.26, 0.16, 0.26], [0.16, 0.96, -0.3], '#fff2b8', { rot: [Math.PI, 0, 0], ...GLOW }),
    torus([0.36, 0.04, 0.36], [0.16, 0.95, -0.3], '#ffd23a', GLOW),
  ],
  // 2×2 on the Earth-facing hull: a glass bay (a lit half barrel with steel ribs) bulging toward
  // Earth, an entry block behind it and a small telescope.
  obsdeck: () => [
    box([1.94, 0.08, 1.94], [0, 0, 0], '#4a525c', { slot: 'mat/hull-plate' }),
    cyl([1.15, 1.8, 1.15], [0, 0.08 - 0.9, 0.3], '#a6e3f0', { rot: [0, 0, HALF_PI], slot: 'mat/greenhouse-glass', ...GLOW }),
    ...[-0.85, -0.3, 0.3, 0.85].map((x) => torus([1.26, 0.07, 1.26], [x, 0.08 - 0.035, 0.3], STEEL, { rot: [0, 0, HALF_PI] })),
    box([1.8, 0.05, 0.1], [0, 0.66, 0.3], '#dfe3ea'),
    box([1.0, 0.4, 0.5], [-0.3, 0.08, -0.65], '#c9ced6'),
    box([1.02, 0.06, 0.52], [-0.3, 0.3, -0.65], WIN, GLOW),
    cyl([0.12, 0.4, 0.12], [0.62, 0.08, -0.6], '#3d444d', { rot: [0.6, 0, 0] }),
  ],

  // ---------------------------------------------------------------- version 3 (docs/COLONY-V3.md)
  // Defence reads gunmetal with Earth Light's blue-and-hazard trim and red warning lights; the
  // homes and services of version 3 keep the warm white-and-amber of the habitats.

  // 3×3: a big barrel-roofed hangar facing +z (towards the default camera), its tall door half open
  // on a lit bay, hazard stripes round the door, a striped apron, a roof crane and a red beacon.
  arsenal: () => [
    box([2.94, 0.08, 2.94], [0, 0, 0], '#4e555e', { slot: 'mat/hull-plate' }),
    box([2.5, 0.85, 2.0], [0, 0.08, -0.4], '#6e7884'),
    cyl([2.5, 2.0, 1.1], [0, 0.38, -0.4], '#7c8794', { rot: [HALF_PI, 0, 0], slot: 'mat/hull-plate' }),
    ...[-0.95, -0.4, 0.15].map((z) => torus([2.55, 0.06, 1.14], [0, 0.36, z], '#59616b', { rot: [HALF_PI, 0, 0] })),
    box([2.56, 0.1, 0.06], [0, 0.08, 0.6], '#2a2f36'),
    box([1.7, 1.02, 0.05], [0, 0.08, 0.62], '#ffd27a', GLOW),                 // the lit bay through the door
    box([0.62, 1.02, 0.07], [-0.55, 0.08, 0.64], '#9aa6b4'),                  // door leaves, half open
    box([0.62, 1.02, 0.07], [0.55, 0.08, 0.64], '#9aa6b4'),
    box([1.82, 0.1, 0.08], [0, 1.1, 0.64], HAZARD),
    ...[-0.95, 0.95].map((x) => box([0.12, 1.12, 0.08], [x, 0.08, 0.64], HAZARD)),
    box([2.2, 0.02, 0.6], [0, 0.08, 1.05], '#3a4048'),                        // apron with landing marks
    ...[-0.7, 0, 0.7].map((x) => box([0.36, 0.025, 0.08], [x, 0.08, 1.05], '#ffe08a', GLOW)),
    box([0.08, 0.6, 0.08], [1.1, 1.23, -1.1], STEEL),
    box([1.2, 0.08, 0.08], [0.55, 1.8, -1.1], HAZARD),
    dome([0.14, 0.12, 0.14], [1.1, 1.85, -1.1], BEACON, GLOW),
    box([0.36, 0.06, 1.6], [0, 1.47, -0.4], '#5f8fd8'),                       // the blue roof stripe
  ],
  // 2×2 on the hull: a sunken slipway with a half-built hull on its cradle under two gantry cranes,
  // a glowing launch rail down the slip, lights along its rim and a control cabin in the corner.
  shipyard: () => {
    const parts = [
      box([1.96, 0.12, 1.96], [0, 0, 0], '#454c55', { slot: 'mat/hull-plate' }),
      box([1.94, 0.04, 0.86], [0, 0.12, 0.12], '#1e2329'),                      // the slip
      box([1.94, 0.025, 0.06], [0, 0.16, 0.12], '#6fd3ff', GLOW),               // launch rail
      box([1.3, 0.3, 0.46], [-0.12, 0.2, 0.12], '#dfe4ea'),                      // the hull on its cradle
      cone([0.23, 0.42, 0.28], [0.74, 0.14, 0.12], '#dfe4ea', { rot: [0, 0, -HALF_PI] }),
      box([1.32, 0.07, 0.48], [-0.12, 0.38, 0.12], '#3a6ad8'),
      box([0.36, 0.22, 0.3], [-0.45, 0.5, 0.12], '#c9ced6'),
      ...[-0.6, -0.25, 0.1, 0.45].map((x) => box([0.05, 0.08, 0.7], [x, 0.12, 0.12], '#d08a1a')),   // cradle ribs
    ];
    for (const x of [-0.55, 0.38]) {                                            // two gantries over the slip
      parts.push(box([0.1, 1.25, 0.1], [x, 0.12, -0.45], HAZARD), box([0.1, 1.25, 0.1], [x, 0.12, 0.8], HAZARD),
        box([0.13, 0.12, 1.4], [x, 1.37, 0.17], HAZARD), box([0.2, 0.13, 0.2], [x, 1.25, 0.3], DARK),
        cyl([0.02, 0.5, 0.02], [x, 0.75, 0.3], STEEL));
    }
    for (let k = 0; k < 5; k++) parts.push(box([0.07, 0.05, 0.07], [-0.84 + k * 0.42, 0.12, 0.62], k % 2 ? '#ffd23a' : '#7fe0ff', GLOW), box([0.07, 0.05, 0.07], [-0.84 + k * 0.42, 0.12, -0.36], k % 2 ? '#ffd23a' : '#7fe0ff', GLOW));
    parts.push(box([0.5, 0.36, 0.34], [0.66, 0.12, -0.72], '#8a929c'), box([0.52, 0.07, 0.36], [0.66, 0.4, -0.72], WIN, GLOW), dome([0.1, 0.08, 0.1], [0.8, 0.48, -0.78], BEACON, GLOW),
      box([0.9, 0.05, 0.3], [-0.4, 0.12, -0.72], '#3a4048'), ...[-0.7, -0.4, -0.1].map((x) => box([0.18, 0.14, 0.2], [x, 0.17, -0.72], '#e08a3a')));
    return parts;
  },
  // 2×2: two long olive-grey barrack blocks with lit window bands, a drill yard, a flag mast
  // with a blue pennant and a red light.
  barracks: () => [
    box([1.94, 0.06, 1.94], [0, 0, 0], '#555c58'),
    ...[-0.5, 0.15].flatMap((z) => [
      box([1.6, 0.42, 0.5], [-0.1, 0.06, z], '#7a8470'),
      box([1.62, 0.06, 0.52], [-0.1, 0.27, z], '#ffe3a0', GLOW),
      box([1.66, 0.07, 0.56], [-0.1, 0.48, z], '#4a5248'),
    ]),
    box([1.5, 0.02, 0.4], [-0.1, 0.06, 0.7], '#8a8f86'),                       // the drill yard
    cyl([0.03, 1.2, 0.03], [0.8, 0.06, 0.75], STEEL),
    box([0.32, 0.18, 0.02], [0.64, 1.02, 0.75], '#3a7ae8'),
    dome([0.06, 0.06, 0.06], [0.8, 1.26, 0.75], BEACON, GLOW),
  ],
  // 2×2: rusty heaps of machine scrap, a wrecked mecha arm, a crusher and a yellow crane with a magnet.
  scrapyard: () => [
    box([1.96, 0.06, 1.96], [0, 0, 0], '#4e4a46'),
    cone([0.8, 0.5, 0.8], [-0.5, 0.06, 0.45], '#8a5a3a'),
    cone([0.6, 0.38, 0.6], [0.1, 0.06, 0.62], '#6a6e78'),
    cone([0.55, 0.32, 0.55], [-0.62, 0.06, -0.2], '#9a6a40'),
    box([0.5, 0.12, 0.16], [-0.1, 0.12, 0.2], '#5f8fd8', { rot: [0, 0.7, 0.3] }),   // a mecha forearm
    box([0.16, 0.16, 0.16], [0.1, 0.1, 0.05], '#4a5058', { rot: [0.4, 0.3, 0] }),
    box([0.55, 0.45, 0.55], [0.55, 0.06, 0.5], '#4a5058'),
    box([0.57, 0.05, 0.57], [0.55, 0.36, 0.5], '#ff7a1a', GLOW),
    box([0.18, 1.7, 0.18], [0.6, 0.06, -0.6], HAZARD),
    box([1.5, 0.12, 0.14], [0.0, 1.7, -0.6], HAZARD, { rot: [0, 0.25, 0] }),
    cyl([0.03, 0.55, 0.03], [-0.62, 1.15, -0.42], STEEL),
    cyl([0.3, 0.08, 0.3], [-0.62, 1.07, -0.42], '#c9302a'),
  ],
  // 1×1 on the hull: a battery turret, as in Earth Light. Dragon: a long twin-rail railgun with a
  // glowing breech; Hydra: a boxy missile rack with lit tube mouths.
  emplacement: (level, mode) => {
    const parts = [
      box([0.94, 0.08, 0.94], [0, 0, 0], '#454c55', { slot: 'mat/hull-plate' }),
      cyl([0.72, 0.18, 0.72], [0, 0.08, 0], '#5a626c'),
      torus([0.76, 0.06, 0.76], [0, 0.2, 0], HAZARD),
      cyl([0.5, 0.18, 0.5], [0, 0.26, 0], '#7c8794'),
    ];
    if (mode === 'hydra') {
      parts.push(box([0.5, 0.34, 0.5], [0, 0.44, 0.02], '#6a7480', { rot: [-0.35, 0, 0] }),
        box([0.52, 0.06, 0.52], [0, 0.6, 0.02], '#c9302a', { rot: [-0.35, 0, 0] }));
      // tube mouths on the rack's tilted front face
      for (let i = 0; i < 3; i++) for (const j of [-0.075, 0.075]) parts.push(cyl([0.1, 0.05, 0.1], [-0.15 + i * 0.15, 0.703 + 0.94 * j - 0.025, 0.274 - 0.343 * j], '#ff9a52', { rot: [HALF_PI - 0.35, 0, 0], ...GLOW }));
    } else {
      parts.push(box([0.34, 0.24, 0.42], [0, 0.44, -0.08], '#6a7480'),
        box([0.36, 0.06, 0.44], [0, 0.58, -0.08], '#3a6ad8'),
        ...[-0.07, 0.07].map((x) => box([0.06, 0.07, 1.25], [x, 0.53, 0.55], '#c9ced6', { rot: [-0.18, 0, 0] })),
        box([0.2, 0.1, 0.1], [0, 0.5, 0.08], '#7fe0ff', GLOW),
        box([0.2, 0.05, 0.06], [0, 0.66, 1.1], '#7fe0ff', GLOW));
    }
    return parts;
  },
  // 1×1: a lattice mast with a big tilted dish, a feed horn and a red beacon.
  sensormast: () => [
    box([0.7, 0.08, 0.7], [0, 0, 0], '#4a525c'),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => box([0.05, 1.5, 0.05], [x * 0.12, 0.08, z * 0.12], STEEL, { rot: [z * 0.06, 0, -x * 0.06] })),
    ...[0.45, 0.95].map((y) => torus([0.38, 0.03, 0.38], [0, y, 0], HAZARD)),
    dome([0.95, 0.3, 0.95], [0, 1.45, 0.05], '#eef1f5', { rot: [Math.PI - 0.6, 0, 0] }),
    cyl([0.03, 0.42, 0.03], [0, 1.6, 0.22], STEEL, { rot: [0.6, 0, 0] }),
    dome([0.08, 0.06, 0.08], [0, 1.78, 0.36], '#7fe0ff', GLOW),
    dome([0.1, 0.08, 0.1], [0.3, 1.0, -0.3], BEACON, GLOW),
  ],
  // 1×1: a tapering pylon ringed in glowing blue coils, a crystal emitter on top and a faint
  // shimmering dome of shield around it (the `shimmer` parts: additive and see-through).
  shieldpylon: () => [
    box([0.8, 0.1, 0.8], [0, 0, 0], '#3e4652'),
    cone([0.5, 1.5, 0.5], [0, 0.1, 0], '#9aa6b4'),
    ...[0.35, 0.65, 0.95].map((y, k) => torus([0.46 - k * 0.1, 0.07, 0.46 - k * 0.1], [0, y, 0], '#5fc8ff', GLOW)),
    P('dome', [0.28, 0.32, 0.28], [0, 1.45, 0], '#bff0ff', GLOW),
    dome([2.8, 1.5, 2.8], [0, 0.1, 0], '#0f3158', { shimmer: true }),
  ],
  // 1×1 in space: an array of thin antennae with violet tips and crossbars on a dark pad.
  jammer: () => [
    box([0.86, 0.08, 0.86], [0, 0, 0], '#2c2f3e'),
    box([0.4, 0.22, 0.4], [0, 0.08, 0], '#5a5e70'),
    ...[[-0.3, -0.3, 1.3], [0.3, -0.28, 1.0], [-0.28, 0.3, 0.9], [0.3, 0.3, 1.45], [0, 0, 1.7]].flatMap(([x, z, h]) => [
      cyl([0.035, h, 0.035], [x, 0.08, z], '#c9ced6'),
      box([0.3, 0.025, 0.025], [x, 0.08 + h * 0.6, z], STEEL, { rot: [0, (x + z) * 2, 0] }),
      box([0.22, 0.025, 0.025], [x, 0.08 + h * 0.8, z], STEEL, { rot: [0, (x - z) * 2, 0] }),
      dome([0.08, 0.07, 0.08], [x, 0.08 + h, z], '#c86aff', GLOW),
    ]),
  ],
  // 3×3: a fusion torus on a containment ring, a central column, coolant tanks and four stacks.
  // The torus glows cyan (normal), hot orange (overdrive), and goes dark with no helium-3.
  fusion: (level, mode, b, ctx) => {
    const cold = !!ctx?.noHelium, hot = mode === 'overdrive';
    const core = cold ? '#3a4250' : hot ? '#ffa64a' : '#7fe8ff', ring = cold ? '#2a3038' : hot ? '#ff6a2a' : '#4ac0ff';
    const parts = [
      box([2.94, 0.12, 2.94], [0, 0, 0], '#4a5058', { slot: 'mat/hull-plate' }),
      cyl([2.3, 0.3, 2.3], [0, 0.12, 0], '#6a7480'),
      torus([2.2, 0.3, 2.2], [0, 0.48, 0], '#c9ced6'),
      torus([1.95, 0.22, 1.95], [0, 0.55, 0], core, cold ? {} : GLOW),
      cyl([0.5, 1.2, 0.5], [0, 0.42, 0], '#dfe4ea'),
      cyl([0.54, 0.08, 0.54], [0, 0.95, 0], ring, cold ? {} : GLOW),
      dome([0.5, 0.25, 0.5], [0, 1.62, 0], '#eef1f5'),
      ...[0, 1, 2, 3].map((k) => box([0.9, 0.06, 0.12], [0.55 * Math.cos(k * HALF_PI + 0.785), 0.85, 0.55 * Math.sin(k * HALF_PI + 0.785)], STEEL, { rot: [0, -(k * HALF_PI + 0.785), 0] })),
    ];
    for (const [x, z] of [[-1.15, -1.15], [1.15, -1.15], [-1.15, 1.15], [1.15, 1.15]]) {
      parts.push(cyl([0.32, 1.1, 0.32], [x, 0.12, z], '#8a929c'), cyl([0.34, 0.08, 0.34], [x, 1.0, z], HAZARD));
    }
    parts.push(cyl([0.46, 0.5, 0.46], [1.15, 0.12, 0], '#e8eef4', { slot: 'mat/tank' }), dome([0.46, 0.16, 0.46], [1.15, 0.62, 0], '#ff6ae8'),
      cyl([0.46, 0.5, 0.46], [-1.15, 0.12, 0], '#e8eef4', { slot: 'mat/tank' }), dome([0.46, 0.16, 0.46], [-1.15, 0.62, 0], '#ff6ae8'));
    return parts;
  },
  // 1×1: a steel frame of four stacked shelves of pale and violet mushroom caps under a soft glow.
  mushroom: () => {
    const parts = [box([0.9, 0.05, 0.9], [0, 0, 0], '#4a4440'), box([0.06, 1.05, 0.7], [-0.4, 0.05, 0], DARK), box([0.06, 1.05, 0.7], [0.4, 0.05, 0], DARK)];
    for (let k = 0; k < 4; k++) {
      const y = 0.08 + k * 0.26;
      parts.push(box([0.8, 0.035, 0.72], [0, y, 0], '#6a5a4a'), box([0.78, 0.012, 0.03], [0, y + 0.035, 0.34], '#e0b8ff', GLOW));
      for (let j = 0; j < 6; j++) {
        const x = -0.26 + (j % 3) * 0.26, z = j < 3 ? -0.17 : 0.17, s = 0.22 + 0.05 * ((k + j) % 2);
        parts.push(cyl([0.05, 0.07, 0.05], [x, y + 0.035, z], '#efe6d2'), dome([s, 0.11, s], [x, y + 0.1, z], (k + j) % 3 ? '#efdcb8' : '#c49aec'));
      }
    }
    parts.push(dome([0.2, 0.1, 0.2], [0, 1.15, 0], '#d8a8ff', GLOW));
    return parts;
  },
  // 2×2 on the hills: three stepped tiers of white homes with green roofs and lit windows.
  terrace: () => {
    const parts = [];
    for (let r = 0; r < 3; r++) {
      const z = 0.62 - r * 0.62, y = r * 0.22;
      parts.push(box([1.94, 0.1 + y, 0.62], [0, 0, z], '#8a7a5a'));
      for (let c = 0; c < 3 - (r === 2 ? 1 : 0); c++) {
        const x = -0.6 + c * 0.6 + (r === 2 ? 0.3 : 0), h = 0.3 + 0.06 * ((r + c) % 2);
        parts.push(box([0.48, h, 0.42], [x, 0.1 + y, z - 0.05], '#efe8da', { slot: 'mat/hab-facade' }),
          box([0.5, 0.07, 0.44], [x, 0.1 + y + h * 0.45, z - 0.05], '#ffd98a', GLOW),
          box([0.54, 0.06, 0.48], [x, 0.1 + y + h, z - 0.05], '#5fae4a'),
          box([0.4, 0.03, 0.1], [x, 0.1 + y, z + 0.22], '#7cc04a'));
      }
    }
    return parts;
  },
  // 2×2: a warm timber hall with a pitched red roof, lanterns, a hanging sign and a chimney. An Inn
  // gains an upper storey, a Grand Lodge a lit tower.
  lodge: (level) => {
    const lv = Math.max(1, Math.min(3, level || 1)), h = lv >= 2 ? 0.85 : 0.5;
    const parts = [
      box([1.94, 0.05, 1.94], [0, 0, 0], '#6a6e74'),
      box([1.5, h, 1.0], [-0.1, 0.05, -0.2], '#b88a5a'),
      box([1.52, 0.1, 1.02], [-0.1, 0.24, -0.2], '#ffc56a', GLOW),
      ...[-0.55, -0.1, 0.35].map((x) => box([0.08, h, 0.05], [x, 0.05, 0.31], '#6a4a2a')),
      box([1.6, 0.06, 0.62], [-0.1, 0.05 + h + 0.1, -0.45], '#b03a2a', { rot: [0.55, 0, 0] }),
      box([1.6, 0.06, 0.62], [-0.1, 0.05 + h + 0.1, 0.05], '#b03a2a', { rot: [-0.55, 0, 0] }),
      cyl([0.12, 0.5, 0.12], [0.4, 0.05 + h, -0.5], '#7a7066'),
      box([0.5, 0.03, 0.4], [-0.1, 0.05, 0.6], '#9a7450'),                        // the porch
      ...[-0.45, 0.25].flatMap((x) => [cyl([0.025, 0.4, 0.025], [x, 0.05, 0.75], '#3d3632'), dome([0.09, 0.09, 0.09], [x, 0.45, 0.75], '#ffb84a', GLOW)]),
      box([0.3, 0.16, 0.03], [0.68, 0.32, 0.36], '#ffd23a', GLOW),               // the sign
    ];
    if (lv >= 2) parts.push(box([1.53, 0.08, 1.03], [-0.1, 0.05 + h - 0.22, -0.2], '#ffc56a', GLOW));
    if (lv >= 3) parts.push(box([0.42, 1.0, 0.42], [0.7, 0.05, -0.6], '#c9a070'), box([0.44, 0.1, 0.44], [0.7, 0.8, -0.6], '#ffc56a', GLOW),
      cone([0.5, 0.4, 0.5], [0.7, 1.05, -0.6], '#b03a2a'), dome([0.08, 0.08, 0.08], [0.7, 1.45, -0.6], '#ffd23a', GLOW));
    return parts;
  },
  // 1×1: a neat officers' block, navy roof with a gold trim band, lit windows and a flag mast.
  quarters: () => [
    box([0.92, 0.05, 0.92], [0, 0, 0], '#5a6068'),
    box([0.74, 0.62, 0.62], [-0.04, 0.05, 0.04], '#e6e8ec'),
    box([0.76, 0.07, 0.64], [-0.04, 0.22, 0.04], '#ffe3a0', GLOW),
    box([0.76, 0.07, 0.64], [-0.04, 0.46, 0.04], '#ffe3a0', GLOW),
    box([0.8, 0.08, 0.68], [-0.04, 0.67, 0.04], '#24346a'),
    box([0.81, 0.03, 0.69], [-0.04, 0.64, 0.04], '#d9b23a'),
    cyl([0.025, 0.7, 0.025], [0.36, 0.05, -0.36], STEEL),
    box([0.2, 0.12, 0.02], [0.26, 0.6, -0.36], '#3a7ae8'),
  ],
};

// A plain block for any key without a kit (later buildings), so the view never fails on new data.
const fallback = (n) => [box([n * 0.9, 0.6, n * 0.9], [0, 0, 0], '#b0b4ba'), box([n * 0.92, 0.08, n * 0.92], [0, 0.45, 0], WIN, GLOW)];

// `b` (optional) is the building itself, for kits that show more than level and mode: the
// Tailings Dump's heap follows b.fill. `ctx` (optional) is what the view knows of the colony:
// { noHelium } darkens the Fusion Reactor's torus. view.js puts the same fields in its refresh
// signature.
export function kitParts(key, level = 1, mode = null, b = null, ctx = null) {
  const def = BUILDING[key], kit = KITS[key];
  return kit ? kit(level, mode ?? def?.modes?.[0]?.key ?? null, b, ctx) : fallback(def?.size || 1);
}

// Height of a kit's top above its base (picking and the ghost use it).
export const kitHeight = (parts) => parts.reduce((m, p) => (p.shimmer ? m : Math.max(m, p.pos[1] + (p.rot ? Math.max(...p.size) : p.size[1]))), 0);
