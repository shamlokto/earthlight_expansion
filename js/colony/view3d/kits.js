// Building kits for the colony's 3D view (docs/COLONY.md §6): every building is a handful of
// primitive parts, procedural now and textured later through the `slot` names (docs/COLONY.md §7).
// A part is { shape, size: [sx, sy, sz], pos: [x, y, z], rot?: [rx, ry, rz], color, slot?, glow? }:
//   shape  'box' | 'cylinder' | 'dome' | 'cone' | 'torus' (each a unit shape, scaled by size)
//   pos    centre of the part's base, in tiles from the footprint's centre at ground level
//   rot    radians, about the part's own centre (a rotated part keeps its centre, not its base)
//   glow   unlit (windows, beacons, coils), so it reads at night-dark zoom levels
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
};

// A plain block for any key without a kit (later buildings), so the view never fails on new data.
const fallback = (n) => [box([n * 0.9, 0.6, n * 0.9], [0, 0, 0], '#b0b4ba'), box([n * 0.92, 0.08, n * 0.92], [0, 0.45, 0], WIN, GLOW)];

export function kitParts(key, level = 1, mode = null) {
  const def = BUILDING[key], kit = KITS[key];
  return kit ? kit(level, mode ?? def?.modes?.[0]?.key ?? null) : fallback(def?.size || 1);
}

// Height of a kit's top above its base (picking and the ghost use it).
export const kitHeight = (parts) => parts.reduce((m, p) => Math.max(m, p.pos[1] + (p.rot ? Math.max(...p.size) : p.size[1])), 0);
