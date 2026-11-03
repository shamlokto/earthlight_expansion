// Movers: the colony's traffic for the 3D view (docs/COLONY-V1.md "view3d/view.js"). Barges on the
// river, haulers (ore, helium-3 from Plasma Skimmers, ice from Ice Harvesters; to the nearest dock or
// Tether Mast) and service drones in space, the transport that brings colonists, people and
// rovers on the roads. Movement is VISUAL: it is derived from the simulation's numbers (pop,
// happiness, finished buildings, state.flags.arrival) and never writes anything back; nothing in
// sim.js or rules.js knows movers exist (SimCity 2013's agent simulation is the cautionary tale).
//
//   * every mover type is one InstancedMesh; the hot loop writes matrices in place and allocates
//     nothing (paths, BFS trees and destination lists are built in refresh(), or on a cache miss)
//   * people and rovers exist only on roads (the owner's rule): a building is "connected" when a
//     road tile touches its footprint; reachability is the road graph's connected components and
//     routes are BFS paths, cached per road-network version, with a lane offset baked in
//   * barges, haulers, drones and the transport need no roads
//   * update(dt) is scaled by setSpeed (0 freezes everything, SimCity style)
import * as THREE from 'three';
import { BUILDING, BUILDINGS } from '../data/buildings.js';
import { T, R } from '../data/terrain.js';
import { spec, chamberOf } from '../rules.js';
import { ROAD } from './kits.js';

// ---- tuning ----------------------------------------------------------------------------------

const CAP = { people: 300, newcomers: 12, rovers: 60, crews: 16, barges: 8, haulers: 64, drones: 32 };
const LANE = { walk: 0.33, drive: 0.16 };              // offset to the right of travel, in tiles
const SPEED = { walk: 0.55, drive: 1.35, crew: 1.6, barge: 0.85, hauler: 3.2 };
const GLUM = { below: 40, count: 0.55, pace: 0.6 };    // a glum colony: fewer people, slower steps
const WATER_Y = -0.08;                                  // the river's surface (view.js waterMesh)
const DESTS = new Set(['park', 'grove', 'command', 'depot']);   // plus anything with jobs
const PRODUCERS = new Set(['farm', 'hydro', 'airplant', 'salvage', 'depot', 'command', 'repairyard']);
const STOPS = new Set(['farm', 'riverpump', 'command']);       // barges pause beside these
const KEYI = new Map(BUILDINGS.map((b, i) => [b.key, i + 1]));

// Early-90s anime colony colours (linear RGB once loaded).
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const SHIRTS = ['#e8524a', '#3a7ae8', '#f2c14a', '#5ac87a', '#f4f4f4', '#9a6ae8', '#f28a3a', '#3ac8d8', '#e86aa8'].map(lin);
const CARGO = ['#f08a2a', '#7cc04a', '#4a9ae0', '#e8eef4', '#e05a4a', '#f2c14a'].map(lin);
const BARGE_CARGO = ['#f08a2a', '#f0a030', '#e8702a'].map(lin);
const HAULER_POD = ['#f08a2a', '#f2c14a', '#e8eef4'].map(lin);
// Cargo pods by source (version 2): helium-3 glows magenta, comet ice is pale blue.
const POD_OF = { plasmaskimmer: ['#ff6ae8', '#e85ad0'].map(lin), iceharvester: ['#bfe8ff', '#e8f6ff'].map(lin) };
const HAUL_FROM = ['oremine', 'plasmaskimmer', 'iceharvester'];   // haulers fly from these to a dock or tether mast
const NEWCOMER = lin('#eef4ff');

// ---- models: low-poly parts merged into one geometry, with per-vertex colour, tint and glow ----
// Parts face +x (forward). `tint` parts take the instance colour (shirts, cargo); `glow` parts are
// unlit (engines, windows), so they read in the dark.

const CYAN = '#5ff0ff', WIN = '#7fe0ff', WHITE = '#eef1f5', STEEL = '#9aa3ad', DARK = '#3d444d';
const HALF = Math.PI / 2;

function shapeGeo(p) {
  switch (p.s) {
    case 'box': return new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
    case 'cyl': return new THREE.CylinderGeometry(p.r, p.r2 ?? p.r, p.h, p.seg || 8);
    case 'cone': return new THREE.ConeGeometry(p.r, p.h, p.seg || 8);
    case 'ball': return new THREE.SphereGeometry(p.r, p.seg || 8, Math.max(3, (p.seg || 8) >> 1));
    case 'torus': return new THREE.TorusGeometry(p.r, p.tube, 5, p.seg || 12);
    default: throw new Error('movers: unknown shape ' + p.s);
  }
}
function model(parts) {
  const pos = [], col = [], tint = [], glow = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  for (const p of parts) {
    let g = shapeGeo(p);
    if (g.index) { const ng = g.toNonIndexed(); g.dispose(); g = ng; }
    if (p.spin) g.rotateY(p.spin);                    // about the part's own axis, before placing
    m.compose(v.set(...(p.pos || [0, 0, 0])), q.setFromEuler(e.set(...(p.rot || [0, 0, 0]))), sc.set(...(p.scale || [1, 1, 1])));
    g.applyMatrix4(m);
    c.set(p.c);
    const P = g.attributes.position.array;
    for (let i = 0; i < P.length; i += 3) {
      pos.push(P[i], P[i + 1], P[i + 2]); col.push(c.r, c.g, c.b); tint.push(p.tint ? 1 : 0); glow.push(p.glow ? 1 : 0);
    }
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('aTint', new THREE.Float32BufferAttribute(tint, 1));
  geo.setAttribute('aGlow', new THREE.Float32BufferAttribute(glow, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

// A person ~0.16 tall: dark legs, a shirt in the instance colour, a head.
const PERSON = () => model([
  { s: 'box', size: [0.035, 0.065, 0.055], pos: [0, 0.0325, 0], c: '#34394a' },
  { s: 'box', size: [0.045, 0.06, 0.072], pos: [0, 0.093, 0], c: '#ffffff', tint: 1 },
  { s: 'ball', r: 0.027, seg: 6, pos: [0.003, 0.145, 0], c: '#f0c8a0' },
]);
// A rover ~0.35 long: chassis, white cab with a glowing windscreen, cargo bed in the instance colour.
const ROVER = () => model([
  { s: 'box', size: [0.34, 0.045, 0.17], pos: [0, 0.055, 0], c: DARK },
  { s: 'box', size: [0.19, 0.09, 0.165], pos: [-0.065, 0.12, 0], c: '#ffffff', tint: 1 },
  { s: 'box', size: [0.11, 0.1, 0.16], pos: [0.11, 0.125, 0], c: '#e8ecf0' },
  { s: 'box', size: [0.02, 0.05, 0.14], pos: [0.162, 0.145, 0], c: WIN, glow: 1 },
  { s: 'box', size: [0.012, 0.022, 0.03], pos: [0.172, 0.085, 0.055], c: '#fff6c0', glow: 1 },
  { s: 'box', size: [0.012, 0.022, 0.03], pos: [0.172, 0.085, -0.055], c: '#fff6c0', glow: 1 },
  ...[[0.1, 0.085], [0.1, -0.085], [-0.1, 0.085], [-0.1, -0.085]].map(([x, z]) => ({ s: 'cyl', r: 0.036, h: 0.03, seg: 8, pos: [x, 0.036, z], rot: [HALF, 0, 0], c: '#1e2228' })),
]);
// The repair crew: a hazard-yellow truck with an orange beacon and a crane arm.
const CREW = () => model([
  { s: 'box', size: [0.36, 0.045, 0.18], pos: [0, 0.055, 0], c: DARK },
  { s: 'box', size: [0.2, 0.06, 0.17], pos: [-0.07, 0.105, 0], c: '#e8b52a' },
  { s: 'box', size: [0.11, 0.11, 0.17], pos: [0.115, 0.13, 0], c: '#e8b52a' },
  { s: 'box', size: [0.02, 0.05, 0.14], pos: [0.172, 0.15, 0], c: WIN, glow: 1 },
  { s: 'ball', r: 0.025, seg: 6, pos: [0.1, 0.2, 0], c: '#ff8a2a', glow: 1 },
  { s: 'box', size: [0.24, 0.022, 0.022], pos: [-0.05, 0.19, 0.03], rot: [0, 0, 0.45], c: '#d08a1a' },
  { s: 'box', size: [0.03, 0.08, 0.03], pos: [-0.12, 0.15, 0.03], c: STEEL },
  ...[[0.11, 0.09], [0.11, -0.09], [-0.11, 0.09], [-0.11, -0.09]].map(([x, z]) => ({ s: 'cyl', r: 0.038, h: 0.032, seg: 8, pos: [x, 0.038, z], rot: [HALF, 0, 0], c: '#1e2228' })),
]);
// A river barge ~1.2 long: grey-blue hull, pointed bow, wheelhouse astern, orange containers.
const BARGE = () => model([
  { s: 'box', size: [0.85, 0.14, 0.42], pos: [-0.125, 0.02, 0], c: '#48607e' },
  { s: 'cyl', r: 0.2425, h: 0.14, seg: 3, spin: HALF, pos: [0.421, 0.02, 0], c: '#48607e' },
  { s: 'box', size: [0.86, 0.025, 0.43], pos: [-0.125, 0.085, 0], c: '#dfe6ee' },
  { s: 'box', size: [0.18, 0.15, 0.26], pos: [-0.44, 0.17, 0], c: WHITE },
  { s: 'box', size: [0.19, 0.04, 0.27], pos: [-0.44, 0.2, 0], c: WIN, glow: 1 },
  { s: 'cyl', r: 0.012, h: 0.14, seg: 4, pos: [-0.48, 0.31, 0], c: STEEL },
  { s: 'box', size: [0.2, 0.13, 0.3], pos: [-0.2, 0.16, 0], c: '#ffffff', tint: 1 },
  { s: 'box', size: [0.2, 0.13, 0.3], pos: [0.02, 0.16, 0], c: '#d8d0c8', tint: 1 },
  { s: 'box', size: [0.2, 0.13, 0.3], pos: [0.24, 0.16, 0], c: '#f4ece0', tint: 1 },
  { s: 'box', size: [0.2, 0.13, 0.3], pos: [0.02, 0.29, 0], c: '#ffffff', tint: 1 },
]);
// An ore hauler ~0.9 long: white fuselage, glass cockpit, stubby wings, cargo pod, cyan engines.
const HAULER = () => model([
  { s: 'box', size: [0.5, 0.14, 0.2], pos: [0, 0, 0], c: WHITE },
  { s: 'cone', r: 0.12, h: 0.2, seg: 4, spin: Math.PI / 4, rot: [0, 0, -HALF], scale: [1, 1, 1], pos: [0.35, 0, 0], c: WHITE },
  { s: 'box', size: [0.12, 0.05, 0.15], pos: [0.2, 0.08, 0], c: WIN, glow: 1 },
  { s: 'box', size: [0.2, 0.03, 0.62], pos: [-0.08, -0.02, 0], c: STEEL },
  { s: 'box', size: [0.05, 0.04, 0.05], pos: [-0.08, -0.01, 0.31], c: '#ff4a3a', glow: 1 },
  { s: 'box', size: [0.05, 0.04, 0.05], pos: [-0.08, -0.01, -0.31], c: '#4aff7a', glow: 1 },
  { s: 'box', size: [0.12, 0.12, 0.03], pos: [-0.2, 0.12, 0], c: WHITE },
  ...[0.13, -0.13].flatMap((z) => [
    { s: 'cyl', r: 0.055, h: 0.2, seg: 8, rot: [0, 0, HALF], pos: [-0.27, 0, z], c: '#59616b' },
    { s: 'cyl', r: 0.045, h: 0.03, seg: 8, rot: [0, 0, HALF], pos: [-0.38, 0, z], c: CYAN, glow: 1 },
    { s: 'cone', r: 0.04, h: 0.14, seg: 6, rot: [0, 0, HALF], pos: [-0.46, 0, z], c: '#3ad8ff', glow: 1 },
  ]),
  { s: 'box', size: [0.3, 0.1, 0.17], pos: [-0.02, -0.12, 0], c: '#ffffff', tint: 1 },
]);
// A service drone ~0.35 across: a disc with a copper ring and a glowing core.
const DRONE = () => model([
  { s: 'cyl', r: 0.09, r2: 0.07, h: 0.06, seg: 8, pos: [0, 0, 0], c: '#c9ced6' },
  { s: 'torus', r: 0.16, tube: 0.022, seg: 12, rot: [HALF, 0, 0], pos: [0, 0, 0], c: '#d07a3a' },
  ...[0, 1, 2, 3].map((k) => ({ s: 'box', size: [0.16, 0.015, 0.02], rot: [0, k * HALF + Math.PI / 4, 0], pos: [0.08 * Math.cos(k * HALF + Math.PI / 4), 0, -0.08 * Math.sin(k * HALF + Math.PI / 4)], c: STEEL })),
  { s: 'ball', r: 0.045, seg: 6, pos: [0, -0.045, 0], c: CYAN, glow: 1 },
  { s: 'box', size: [0.05, 0.02, 0.02], pos: [0.1, 0.03, 0], c: '#ff4a3a', glow: 1 },
]);
// The colony transport ~6.4 long: a white hull with a blue band, a pointed nose, side pods, a fin
// and three big cyan engines.
const TRANSPORT = () => model([
  { s: 'box', size: [3.6, 1.0, 1.4], pos: [-0.2, 0, 0], c: WHITE },
  { s: 'cone', r: 0.99, h: 1.4, seg: 4, spin: Math.PI / 4, rot: [0, 0, -HALF], scale: [1, 0.72, 1], pos: [2.3, 0, 0], c: WHITE },
  { s: 'box', size: [3.62, 0.16, 1.42], pos: [-0.2, -0.05, 0], c: '#3a6ad8' },
  { s: 'box', size: [0.35, 1.02, 1.42], pos: [-1.2, 0, 0], c: '#e04a3a' },
  { s: 'box', size: [0.5, 0.14, 1.0], pos: [1.45, 0.5, 0], c: WIN, glow: 1 },
  { s: 'box', size: [2.6, 0.08, 1.43], pos: [-0.3, 0.2, 0], c: WIN, glow: 1, scale: [1, 1, 1] },
  { s: 'box', size: [0.9, 0.9, 1.7], pos: [-2.3, 0, 0], c: STEEL },
  { s: 'box', size: [1.8, 0.2, 3.4], pos: [-1.1, -0.25, 0], c: '#c9ced6' },
  { s: 'box', size: [0.5, 0.5, 0.5], pos: [-1.3, -0.25, 1.75], c: WHITE },
  { s: 'box', size: [0.5, 0.5, 0.5], pos: [-1.3, -0.25, -1.75], c: WHITE },
  { s: 'box', size: [0.12, 0.12, 0.12], pos: [-1.0, -0.25, 2.02], c: '#ff4a3a', glow: 1 },
  { s: 'box', size: [0.12, 0.12, 0.12], pos: [-1.0, -0.25, -2.02], c: '#4aff7a', glow: 1 },
  { s: 'box', size: [0.9, 0.8, 0.12], pos: [-2.1, 0.8, 0], c: WHITE },
  { s: 'box', size: [0.3, 0.12, 0.13], pos: [-1.8, 1.1, 0], c: '#e04a3a' },
  ...[[-0.5, 0.1], [0, 0.1], [0.5, 0.1], [-1.75, -0.25], [1.75, -0.25]].flatMap(([z, y], k) => {
    const r = k < 3 ? 0.28 : 0.18;
    return [
      { s: 'cyl', r, h: 0.6, seg: 10, rot: [0, 0, HALF], pos: [k < 3 ? -2.95 : -1.75, y, z], c: '#59616b' },
      { s: 'cyl', r: r * 0.85, h: 0.04, seg: 10, rot: [0, 0, HALF], pos: [k < 3 ? -3.27 : -2.07, y, z], c: CYAN, glow: 1 },
      { s: 'cone', r: r * 0.75, h: r * 2.6, seg: 8, rot: [0, 0, HALF], pos: [(k < 3 ? -3.29 : -2.09) - r * 1.3, y, z], c: '#3ad8ff', glow: 1 },
    ];
  }),
  ...[[1.2, 0.5], [1.2, -0.5], [-1.6, 0.6], [-1.6, -0.6]].map(([x, z]) => ({ s: 'box', size: [0.12, 0.05, 0.12], pos: [x, -0.52, z], c: '#fff6c0', glow: 1 })),
]);

// Lambert with vertex colours: the instance colour applies only where aTint = 1, and aGlow mixes
// the lit colour back to the unlit one (engines, windows).
function moverMaterial() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTint;\nattribute float aGlow;\nvarying float vGlow;')
      .replace('#include <color_vertex>', `vColor = vec3(1.0);
        #ifdef USE_COLOR
          vColor *= color;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vColor *= mix(vec3(1.0), instanceColor.rgb, aTint);
        #endif
        vGlow = aGlow;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow;')
      .replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, diffuseColor.rgb * 1.25, vGlow);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'colony-movers';
  return m;
}

// ---- matrices, written straight into instanceMatrix.array --------------------------------------

// Yaw about +y with uniform scale k; (c, s) = (cos, sin) of the yaw, so local +x maps to (c, -s).
// For a heading (hx, hz) on the map that is c = hx, s = -hz.
function setYaw(a, o, x, y, z, c, s, k) {
  a[o] = c * k; a[o + 1] = 0; a[o + 2] = -s * k; a[o + 3] = 0;
  a[o + 4] = 0; a[o + 5] = k; a[o + 6] = 0; a[o + 7] = 0;
  a[o + 8] = s * k; a[o + 9] = 0; a[o + 10] = c * k; a[o + 11] = 0;
  a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
}
// Yaw, then pitch about the craft's own z (nose up for p > 0).
function setYawPitch(a, o, x, y, z, c, s, p, k) {
  const cp = Math.cos(p), sp = Math.sin(p);
  a[o] = c * cp * k; a[o + 1] = sp * k; a[o + 2] = -s * cp * k; a[o + 3] = 0;
  a[o + 4] = -c * sp * k; a[o + 5] = cp * k; a[o + 6] = s * sp * k; a[o + 7] = 0;
  a[o + 8] = s * k; a[o + 9] = 0; a[o + 10] = c * k; a[o + 11] = 0;
  a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
}
const hide = (a, o) => a.fill(0, o, o + 16);
const smooth01 = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

// ---- paths: { pts: Float32Array [x, y, z, cum] per point, n, len, tiles: Int32Array } ----------

let PX = 0, PY = 0, PZ = 0, DX = 1, DZ = 0, PITCH = 0;   // scratch outputs of along() / flight()
function along(P, s, k) {
  const a = P.pts, n = P.n;
  if (k > n - 2) k = n - 2;
  if (k < 0) k = 0;
  while (k < n - 2 && a[(k + 1) * 4 + 3] < s) k++;
  while (k > 0 && a[k * 4 + 3] > s) k--;
  const o = k * 4, o2 = o + 4, L = a[o2 + 3] - a[o + 3];
  const f = L > 1e-6 ? Math.min(1, Math.max(0, (s - a[o + 3]) / L)) : 1;
  const dx = a[o2] - a[o], dz = a[o2 + 2] - a[o + 2];
  PX = a[o] + dx * f; PY = a[o + 1] + (a[o2 + 1] - a[o + 1]) * f; PZ = a[o + 2] + dz * f;
  const l = Math.sqrt(dx * dx + dz * dz);
  if (l > 1e-6) { DX = dx / l; DZ = dz / l; }
  return k;
}

// Offsets a centreline (x, y, z triples) by `side` to the right of travel, mitring the corners.
function bake(raw, side) {
  const n = raw.length / 3, pts = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    let ax = 0, az = 0, bx = 0, bz = 0, ha = false, hb = false;
    if (i > 0) { const dx = raw[i * 3] - raw[i * 3 - 3], dz = raw[i * 3 + 2] - raw[i * 3 - 1], l = Math.hypot(dx, dz); if (l > 1e-6) { ax = -dz / l; az = dx / l; ha = true; } }
    if (i < n - 1) { const dx = raw[i * 3 + 3] - raw[i * 3], dz = raw[i * 3 + 5] - raw[i * 3 + 2], l = Math.hypot(dx, dz); if (l > 1e-6) { bx = -dz / l; bz = dx / l; hb = true; } }
    let ox = 0, oz = 0;
    if (ha && hb) { const d = 1 + ax * bx + az * bz; if (d > 0.2) { ox = (ax + bx) / d; oz = (az + bz) / d; } else { ox = bx; oz = bz; } }
    else if (ha) { ox = ax; oz = az; } else if (hb) { ox = bx; oz = bz; }
    pts[i * 4] = raw[i * 3] + ox * side; pts[i * 4 + 1] = raw[i * 3 + 1]; pts[i * 4 + 2] = raw[i * 3 + 2] + oz * side;
    pts[i * 4 + 3] = i ? pts[i * 4 - 1] + Math.hypot(pts[i * 4] - pts[i * 4 - 4], pts[i * 4 + 2] - pts[i * 4 - 2]) : 0;
  }
  return { pts, n, len: pts[n * 4 - 1] };
}

// ---- walker groups (people, newcomers, rovers, crews): structure of arrays -----------------------

function walkers(cap, mesh) {
  return {
    cap, n: 0, mesh, A: mesh.instanceMatrix.array, col: mesh.instanceColor.array,
    a: new Int32Array(cap), b: new Int32Array(cap), ph: new Uint8Array(cap), done: new Uint8Array(cap),
    s: new Float32Array(cap), k: new Int32Array(cap), v: new Float32Array(cap), t: new Float32Array(cap),
    hx: new Float32Array(cap), hz: new Float32Array(cap), path: new Array(cap).fill(null),
  };
}
function swapOut(g, i) {
  const j = --g.n;
  if (i !== j) {
    g.a[i] = g.a[j]; g.b[i] = g.b[j]; g.ph[i] = g.ph[j]; g.done[i] = g.done[j];
    g.s[i] = g.s[j]; g.k[i] = g.k[j]; g.v[i] = g.v[j]; g.t[i] = g.t[j];
    g.hx[i] = g.hx[j]; g.hz[i] = g.hz[j]; g.path[i] = g.path[j];
    g.col[i * 3] = g.col[j * 3]; g.col[i * 3 + 1] = g.col[j * 3 + 1]; g.col[i * 3 + 2] = g.col[j * 3 + 2];
    g.colDirty = true;
  }
  g.path[j] = null;
}
function setPath(g, i, P) {
  g.path[i] = P; g.s[i] = 0; g.k[i] = 0;
  along(P, 0, 0); g.hx[i] = DX; g.hz[i] = DZ;
}
// Draws walker i at its path position, its heading eased towards the path's direction.
function drawWalker(g, i, k, lift, ease) {
  g.k[i] = along(g.path[i], g.s[i], g.k[i]);
  let hx = g.hx[i] + (DX - g.hx[i]) * ease, hz = g.hz[i] + (DZ - g.hz[i]) * ease;
  const l = Math.sqrt(hx * hx + hz * hz);
  if (l < 1e-3) { hx = DX; hz = DZ; } else { hx /= l; hz /= l; }
  g.hx[i] = hx; g.hz[i] = hz;
  setYaw(g.A, i * 16, PX, PY + lift, PZ, hx, -hz, k);
}
const putColor = (g, i, rgb, dull = 0) => {
  const l = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
  for (let j = 0; j < 3; j++) g.col[i * 3 + j] = rgb[j] + (l * 0.8 - rgb[j]) * dull;
  g.colDirty = true;
};
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

// ================================================================================================

export function createMovers(parent) {
  const group = new THREE.Group();
  group.name = 'movers';
  parent.add(group);
  const mat = moverMaterial();
  const geos = { person: PERSON(), rover: ROVER(), crew: CREW(), barge: BARGE(), hauler: HAULER(), drone: DRONE(), transport: TRANSPORT() };
  const mesh = (geo, cap, name) => {
    const m = new THREE.InstancedMesh(geo, mat, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    m.frustumCulled = false; m.count = 0; m.name = name;
    group.add(m);
    return m;
  };
  const people = walkers(CAP.people, mesh(geos.person, CAP.people, 'people'));
  const newcomers = walkers(CAP.newcomers, mesh(geos.person, CAP.newcomers, 'newcomers'));
  const rovers = walkers(CAP.rovers, mesh(geos.rover, CAP.rovers, 'rovers'));
  const crews = walkers(CAP.crews, mesh(geos.crew, CAP.crews, 'crews'));
  const bargeMesh = mesh(geos.barge, CAP.barges, 'barges');
  const haulerMesh = mesh(geos.hauler, CAP.haulers, 'haulers');
  const droneMesh = mesh(geos.drone, CAP.drones, 'drones');
  const transportMesh = mesh(geos.transport, 1, 'transport');
  const WALKERS = [people, newcomers, rovers, crews];

  let st = null, W = 0, H = 0, terrTop = null;
  let speed = 1, speedSet = false, stale = true;
  let G = null, footSig = -1;                        // road graph and the footprint hash it was built for
  let peopleTarget = 0, roverTarget = 0, glum = false;
  let homes = [], homeCum = [], producers = [];
  let lastArrival;                                    // undefined until the first state is seen
  const stats = { ms: 0, msAvg: 0 };

  // ---- the road graph ----------------------------------------------------------------------

  function footprintHash() {
    let h = 2166136261 | 0;
    const mix = (v) => { h = Math.imul(h ^ (v | 0), 16777619); };
    for (const b of st.buildings) { mix(b.id); mix(KEYI.get(b.key) || 0); mix(b.x); mix(b.y); }
    mix(st.buildings.length);
    return h;
  }

  // Road tiles → local indices with 4-neighbour links and component labels; every other building →
  // a record of the road tiles touching its footprint (its entries) and a door point per entry.
  function buildGraph() {
    const N = W * H, t = st.map.t, roadAt = new Int32Array(N).fill(-1), tiles = [];
    for (const b of st.buildings) if (b.key === 'road') { const i = b.y * W + b.x; if (roadAt[i] < 0) { roadAt[i] = tiles.length; tiles.push(i); } }
    const Rn = tiles.length, nb = new Int32Array(Rn * 4).fill(-1), rh = new Float32Array(Rn), rx = new Float32Array(Rn), rz = new Float32Array(Rn);
    for (let r = 0; r < Rn; r++) {
      const i = tiles[r], x = i % W, y = (i / W) | 0;
      rx[r] = x + 0.5; rz[r] = y + 0.5; rh[r] = t[i] === T.GATE ? ROAD.gateTop : ROAD.top;
      if (x > 0) nb[r * 4] = roadAt[i - 1];
      if (x < W - 1) nb[r * 4 + 1] = roadAt[i + 1];
      if (y > 0) nb[r * 4 + 2] = roadAt[i - W];
      if (y < H - 1) nb[r * 4 + 3] = roadAt[i + W];
    }
    const comp = new Int32Array(Rn).fill(-1), q = new Int32Array(Math.max(1, Rn));
    let nc = 0;
    for (let r0 = 0; r0 < Rn; r0++) {
      if (comp[r0] >= 0) continue;
      let h = 0, tl = 0; q[tl++] = r0; comp[r0] = nc;
      while (h < tl) { const u = q[h++]; for (let k = 0; k < 4; k++) { const v = nb[u * 4 + k]; if (v >= 0 && comp[v] < 0) { comp[v] = nc; q[tl++] = v; } } }
      nc++;
    }
    const recs = new Map();
    for (const b of st.buildings) {
      if (b.key === 'road') continue;
      const n = BUILDING[b.key]?.size || 1, ent = [], doors = [], comps = [];
      const touch = (ex, ey, fx, fy) => {
        if (ex < 0 || ey < 0 || ex >= W || ey >= H) return;
        const r = roadAt[ey * W + ex];
        if (r < 0 || ent.includes(r)) return;
        ent.push(r);
        doors.push(fx + 0.5 + (ex - fx) * 0.42, fy + 0.5 + (ey - fy) * 0.42);
        if (!comps.includes(comp[r])) comps.push(comp[r]);
      };
      for (let k = 0; k < n; k++) {
        touch(b.x + k, b.y - 1, b.x + k, b.y); touch(b.x + k, b.y + n, b.x + k, b.y + n - 1);
        touch(b.x - 1, b.y + k, b.x, b.y + k); touch(b.x + n, b.y + k, b.x + n - 1, b.y + k);
      }
      recs.set(b.id, { id: b.id, key: b.key, b, n, entries: Int32Array.from(ent), doors: Float32Array.from(doors), comps, home: false, dest: false, prod: false });
    }
    return { roadAt, tiles, Rn, nb, rh, rx, rz, comp, nc, recs, bfs: new Map(), paths: new Map() };
  }

  function bfsFrom(rec) {
    let b = G.bfs.get(rec.id);
    if (b) return b;
    const Rn = G.Rn, dist = new Int32Array(Rn).fill(-1), par = new Int32Array(Rn).fill(-1), q = new Int32Array(Math.max(1, Rn));
    let h = 0, tl = 0;
    for (const e of rec.entries) if (dist[e] < 0) { dist[e] = 0; q[tl++] = e; }
    while (h < tl) { const u = q[h++]; for (let k = 0; k < 4; k++) { const v = G.nb[u * 4 + k]; if (v >= 0 && dist[v] < 0) { dist[v] = dist[u] + 1; par[v] = u; q[tl++] = v; } } }
    b = { dist, par };
    G.bfs.set(rec.id, b);
    return b;
  }

  // The shortest road route between two buildings. People (lane 0) walk out of a door and in at
  // the other; rovers (lane 1) drive from road tile to road tile and park beside the building.
  function makePath(fromId, toId, lane) {
    const A = G.recs.get(fromId), B = G.recs.get(toId);
    if (!A || !B || !A.entries.length || !B.entries.length) return null;
    const { dist, par } = bfsFrom(A);
    let best = -1, bd = 1e9, bj = -1;
    for (let j = 0; j < B.entries.length; j++) { const d = dist[B.entries[j]]; if (d >= 0 && d < bd) { bd = d; best = B.entries[j]; bj = j; } }
    if (best < 0) return null;
    const chain = [];
    for (let e = best; e >= 0; e = par[e]) chain.push(e);
    chain.reverse();
    if (lane === 1 && chain.length < 2) return null;
    const raw = [];
    if (lane === 0) { const j = A.entries.indexOf(chain[0]); raw.push(A.doors[j * 2], G.rh[chain[0]], A.doors[j * 2 + 1]); }
    for (const r of chain) raw.push(G.rx[r], G.rh[r], G.rz[r]);
    if (lane === 0) raw.push(B.doors[bj * 2], G.rh[best], B.doors[bj * 2 + 1]);
    const P = bake(raw, lane === 0 ? LANE.walk : LANE.drive);
    P.tiles = Int32Array.from(chain, (r) => G.tiles[r]);
    return P;
  }
  function getPath(fromId, toId, lane) {
    let m = G.paths.get(fromId);
    if (!m) G.paths.set(fromId, (m = new Map()));
    const key = toId * 2 + lane;
    let P = m.get(key);
    if (P === undefined) { P = makePath(fromId, toId, lane); m.set(key, P); }
    return P;
  }
  const pathValid = (P) => { if (!P) return false; for (let j = 0; j < P.tiles.length; j++) if (G.roadAt[P.tiles[j]] < 0) return false; return true; };

  // ---- who goes where: recomputed on every refresh (cheap: no BFS, components only) ----------

  // Per road network (component): the destinations and the producers on it. A building reaches
  // whatever shares a network with it; pickIn() draws one of those, never the building itself.
  let compDest = [], compProd = [];
  function hasOther(lists, rec) {
    for (let j = 0; j < rec.comps.length; j++) { const l = lists[rec.comps[j]]; if (l.length > 1 || (l.length === 1 && l[0] !== rec.id)) return true; }
    return false;
  }
  function pickIn(lists, rec) {
    let total = 0;
    for (let j = 0; j < rec.comps.length; j++) total += lists[rec.comps[j]].length;
    for (let tries = 0; total && tries < 6; tries++) {
      let r = (Math.random() * total) | 0;
      for (let j = 0; j < rec.comps.length; j++) {
        const l = lists[rec.comps[j]];
        if (r < l.length) { if (l[r] !== rec.id) return l[r]; break; }
        r -= l.length;
      }
    }
    return 0;
  }
  function roles() {
    compDest = Array.from({ length: G.nc }, () => []); compProd = Array.from({ length: G.nc }, () => []);
    homes = []; producers = [];
    for (const rec of G.recs.values()) {
      const b = rec.b, fin = !(b.build > 0), on = fin && !b.off, s = spec(b), linked = rec.entries.length > 0;
      rec.home = linked && fin && !b.off && rec.key === 'habitat';
      rec.dest = linked && on && rec.key !== 'habitat' && ((s.jobs || 0) > 0 || DESTS.has(rec.key));
      rec.prod = linked && on && PRODUCERS.has(rec.key);
      rec.yard = linked && on && rec.key === 'repairyard';
      rec.site = linked && b.build > 0;
      for (const c of rec.comps) { if (rec.dest) compDest[c].push(rec.id); if (rec.prod) compProd[c].push(rec.id); }
    }
    let wsum = 0;
    homeCum = [];
    for (const rec of G.recs.values()) {
      if (rec.home && hasOther(compDest, rec)) { homes.push(rec.id); wsum += spec(rec.b).housing || 20; homeCum.push(wsum); }
      if (rec.prod && hasOther(compProd, rec)) producers.push(rec.id);
    }
    glum = (st.happy ?? 50) < GLUM.below;
    peopleTarget = homes.length ? Math.min(Math.round((st.pop || 0) / 4), Math.floor(G.Rn / 2), CAP.people) : 0;
    if (glum) peopleTarget = Math.round(peopleTarget * GLUM.count);
    roverTarget = Math.min(CAP.rovers, Math.round(producers.length / 2));
  }
  const homeOk = (id) => !!G.recs.get(id)?.home;
  function randomHome() {
    const r = Math.random() * homeCum[homeCum.length - 1];
    for (let j = 0; j < homeCum.length; j++) if (r < homeCum[j]) return homes[j];
    return homes[homes.length - 1];
  }

  // Keep the walker groups consistent with a new graph and new roles.
  function revalidate(g, ends) {
    for (let i = 0; i < g.n;) {
      const P = g.path[i];
      const bad = (P && !pathValid(P)) || ends(i);
      if (bad) { swapOut(g, i); continue; }
      i++;
    }
  }
  function populate() {
    // people: grow towards the target (inside a home, trickling out); the surplus leaves as it gets home
    while (people.n < peopleTarget && homes.length) {
      const i = people.n++;
      people.a[i] = randomHome(); people.b[i] = 0; people.ph[i] = 0; people.t[i] = Math.random() * 6; people.path[i] = null;
      people.v[i] = SPEED.walk * (0.8 + 0.4 * Math.random());
      putColor(people, i, pick(SHIRTS), glum ? 0.55 : 0);
    }
    // rovers: spawn mid-route between two producers of one road network
    for (let tries = 0; rovers.n < roverTarget && tries < 200; tries++) {
      const a = pick(producers), rec = G.recs.get(a), b = rec && pickIn(compProd, rec), P = b && getPath(a, b, 1);
      if (!P) continue;
      const i = rovers.n++;
      rovers.a[i] = a; rovers.b[i] = b; rovers.ph[i] = 0; setPath(rovers, i, P); rovers.s[i] = Math.random() * P.len;
      rovers.v[i] = SPEED.drive * (0.85 + 0.3 * Math.random());
      putColor(rovers, i, pick(CARGO));
    }
    // repair crews: one per building under construction, from a connected Repair Yard with a free crew
    for (let i = 0; i < crews.n;) {
      const site = G.recs.get(crews.b[i]);
      if (!G.recs.get(crews.a[i])?.yard) { swapOut(crews, i); continue; }
      if (!site?.site && crews.ph[i] !== 2) {
        if (crews.ph[i] === 1) { const P = getPath(crews.b[i], crews.a[i], 1); if (!P) { swapOut(crews, i); continue; } crews.ph[i] = 2; setPath(crews, i, P); }
        else crews.done[i] = 1;
      }
      i++;
    }
    const busy = new Map(), served = new Set();
    for (let i = 0; i < crews.n; i++) if (crews.ph[i] !== 2 && !crews.done[i]) { busy.set(crews.a[i], (busy.get(crews.a[i]) || 0) + 1); served.add(crews.b[i]); }
    for (const site of G.recs.values()) {
      if (!site.site || served.has(site.id) || crews.n >= CAP.crews) continue;
      let best = null, bd = 1e9;
      for (const yard of G.recs.values()) {
        if (!yard.yard || (busy.get(yard.id) || 0) >= (spec(yard.b).crews || 1) || !yard.comps.some((c) => site.comps.includes(c))) continue;
        const { dist } = bfsFrom(yard);
        for (const e of site.entries) if (dist[e] >= 0 && dist[e] < bd) { bd = dist[e]; best = yard; }
      }
      const P = best && getPath(best.id, site.id, 1);
      if (!P) continue;
      const i = crews.n++;
      crews.a[i] = best.id; crews.b[i] = site.id; crews.ph[i] = 0; crews.done[i] = 0; setPath(crews, i, P);
      crews.v[i] = SPEED.crew;
      busy.set(best.id, (busy.get(best.id) || 0) + 1); served.add(site.id);
    }
  }

  // ---- the river: centrelines of open stretches, stops beside farms, pumps and the Command Centre

  let riverSig = '', stretches = [], bargeTarget = 0;
  const barges = { n: 0, st: new Int32Array(CAP.barges), s: new Float32Array(CAP.barges), dir: new Float32Array(CAP.barges), k: new Int32Array(CAP.barges),
    pause: new Float32Array(CAP.barges), turn: new Float32Array(CAP.barges).fill(-1), bob: new Float32Array(CAP.barges) };

  function openRiver() {
    const { t, ch } = st.map, N = W * H, open = new Uint8Array(N);
    const isOpen = (c) => chamberOf(st, c)?.status === 'open';
    for (let i = 0; i < N; i++) {
      if (t[i] !== T.RIVER) continue;
      if (ch[i] !== 255) { open[i] = isOpen(ch[i]) ? 1 : 0; continue; }
      const x = i % W, y = (i / W) | 0;
      let near = 0, ok = true;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0 || ch[j] === 255) continue;
        near++; if (!isOpen(ch[j])) ok = false;
      }
      open[i] = near && ok ? 1 : 0;
    }
    return open;
  }
  // A centreline per connected stretch: its two far ends (double BFS sweep), a route between them
  // that prefers tiles away from the banks (Dijkstra, 8-way without cutting corners), smoothed.
  function buildStretches(open) {
    const N = W * H, seen = new Uint8Array(N), out = [];
    const nb4 = (i) => [i - 1, i + 1, i - W, i + W];
    for (let i0 = 0; i0 < N; i0++) {
      if (!open[i0] || seen[i0]) continue;
      const tiles = [i0]; seen[i0] = 1;
      for (let h = 0; h < tiles.length; h++) for (const j of nb4(tiles[h])) if (j >= 0 && j < N && open[j] && !seen[j]) { seen[j] = 1; tiles.push(j); }
      if (tiles.length < 4) continue;
      const loc = new Map(tiles.map((i, k) => [i, k])), n = tiles.length;
      const sweep = (src) => {
        const d = new Int32Array(n).fill(-1), q = [src]; d[src] = 0;
        for (let h = 0; h < q.length; h++) for (const j of nb4(tiles[q[h]])) { const k = loc.get(j); if (k !== undefined && d[k] < 0) { d[k] = d[q[h]] + 1; q.push(k); } }
        let far = src; for (let k = 0; k < n; k++) if (d[k] > d[far]) far = k;
        return far;
      };
      const a = sweep(0), b = sweep(a);
      // depth from the bank
      const depth = new Int32Array(n).fill(-1), q = [];
      for (let k = 0; k < n; k++) if (nb4(tiles[k]).some((j) => !loc.has(j))) { depth[k] = 0; q.push(k); }
      for (let h = 0; h < q.length; h++) for (const j of nb4(tiles[q[h]])) { const k = loc.get(j); if (k !== undefined && depth[k] < 0) { depth[k] = depth[q[h]] + 1; q.push(k); } }
      const cost = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
      cost[a] = 0;
      for (;;) {
        let u = -1;
        for (let k = 0; k < n; k++) if (!done[k] && cost[k] < Infinity && (u < 0 || cost[k] < cost[u])) u = k;
        if (u < 0 || u === b) break;
        done[u] = 1;
        const ui = tiles[u];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const v = loc.get(ui + dy * W + dx);
          if (v === undefined || done[v]) continue;
          if (dx && dy && (!loc.has(ui + dx) || !loc.has(ui + dy * W))) continue;
          const c = cost[u] + (dx && dy ? 1.414 : 1) * (1 + 2.5 / (1 + depth[v]) ** 2);
          if (c < cost[v]) { cost[v] = c; prev[v] = u; }
        }
      }
      const chain = [];
      for (let k = b; k >= 0; k = prev[k]) chain.push(k);
      if (chain.length < 2) continue;
      let xs = chain.map((k) => (tiles[k] % W) + 0.5), zs = chain.map((k) => ((tiles[k] / W) | 0) + 0.5);
      for (let pass = 0; pass < 3; pass++) {
        const nx = xs.slice(), nz = zs.slice();
        for (let k = 1; k < xs.length - 1; k++) { nx[k] = (xs[k - 1] + 2 * xs[k] + xs[k + 1]) / 4; nz[k] = (zs[k - 1] + 2 * zs[k] + zs[k + 1]) / 4; }
        xs = nx; zs = nz;
      }
      const raw = [];
      for (let k = 0; k < xs.length; k++) raw.push(xs[k], WATER_Y, zs[k]);
      const P = bake(raw, 0);
      const trim = Math.min(0.7, P.len / 2);
      out.push({ P, lo: trim, hi: P.len - trim, stops: new Float32Array(0), tiles: n, sig: `${tiles[a]}:${tiles[b]}:${n}` });
    }
    return out;
  }
  // Points along each stretch where a barge pauses: beside a finished farm, river pump or the
  // Command Centre standing within ~2 tiles of the centreline.
  function placeStops() {
    for (const S of stretches) {
      const stops = [];
      for (const b of st.buildings) {
        if (!STOPS.has(b.key) || b.build > 0) continue;
        const n = BUILDING[b.key].size;
        let best = Infinity, bs = 0;
        for (let k = 0; k < S.P.n; k++) {
          const x = S.P.pts[k * 4], z = S.P.pts[k * 4 + 2];
          const dx = Math.max(b.x - x, 0, x - (b.x + n)), dz = Math.max(b.y - z, 0, z - (b.y + n)), d = Math.hypot(dx, dz);
          if (d < best) { best = d; bs = S.P.pts[k * 4 + 3]; }
        }
        if (best <= 2.2 && bs > S.lo && bs < S.hi) stops.push(bs);
      }
      S.stops = Float32Array.from(stops.sort((p, q) => p - q));
    }
  }
  function farmsNearRiver() {
    const t = st.map.t;
    let n = 0;
    for (const b of st.buildings) {
      if (b.key !== 'farm' || b.build > 0) continue;
      let near = false;
      for (let y = Math.max(0, b.y - 3); y < Math.min(H, b.y + 2 + 3) && !near; y++)
        for (let x = Math.max(0, b.x - 3); x < Math.min(W, b.x + 2 + 3); x++) if (t[y * W + x] === T.RIVER) { near = true; break; }
      if (near) n++;
    }
    return n;
  }
  function syncRiver(chambersChanged, buildingsChanged) {
    if (chambersChanged || !stretches.length && riverSig === '') {
      const sig = st.chambers.map((c) => c.status === 'open' ? 1 : 0).join('');
      if (sig !== riverSig) {
        riverSig = sig;
        const next = buildStretches(openRiver());
        const same = next.length === stretches.length && next.every((S, k) => S.sig === stretches[k].sig);
        stretches = next;
        if (!same) barges.n = 0;
        buildingsChanged = true;
      }
    }
    if (!buildingsChanged) return;
    placeStops();
    bargeTarget = stretches.length ? Math.min(CAP.barges, 1 + Math.floor(farmsNearRiver() / 2)) : 0;
    if (barges.n > bargeTarget) barges.n = bargeTarget;
    while (barges.n < bargeTarget) {
      // the stretch with the most river per barge
      const load = stretches.map(() => 0);
      for (let i = 0; i < barges.n; i++) load[barges.st[i]]++;
      let s = 0;
      for (let k = 1; k < stretches.length; k++) if (stretches[k].P.len / (load[k] + 1) > stretches[s].P.len / (load[s] + 1)) s = k;
      const S = stretches[s], i = barges.n++;
      barges.st[i] = s; barges.s[i] = S.lo + Math.random() * Math.max(0, S.hi - S.lo); barges.dir[i] = Math.random() < 0.5 ? 1 : -1;
      barges.k[i] = 0; barges.pause[i] = Math.random() * 2; barges.turn[i] = -1; barges.bob[i] = Math.random() * 6.3;
      const c = BARGE_CARGO[i % BARGE_CARGO.length];
      bargeMesh.instanceColor.array.set(c, i * 3);
    }
    bargeMesh.instanceColor.needsUpdate = true;
  }

  // ---- space: haulers between mines (ore, helium-3, ice) and the nearest dock or tether mast,
  //      drones around collectors and over survey drone bays -----------------------------------

  let haulers = [], drones = [];
  const ground = (x, y, n) => { let g = -1; for (let j = y; j < y + n; j++) for (let i = x; i < x + n; i++) if (i >= 0 && j >= 0 && i < W && j < H) g = Math.max(g, terrTop[j * W + i]); return Math.max(0, g); };
  const finishedOf = (key) => st.buildings.filter((b) => b.key === key && !(b.build > 0));
  function dockPad(d, slot) {
    const off = [[0, 0], [-0.45, 0.45], [0.55, 0.5], [-0.4, -0.3], [0.5, -0.25], [0.05, 0.6]][slot % 6];
    if (d.key === 'tether') {   // a mast: hover beside it, around its middle
      const a = slot * 2.4;
      return [d.x + 0.5 + Math.cos(a) * 0.75, ground(d.x, d.y, 1) + 1.6 + 0.35 * (slot % 3), d.y + 0.5 + Math.sin(a) * 0.75];
    }
    return [d.x + 1.1 + off[0], ground(d.x, d.y, 2) + 0.45, d.y + 1.15 + off[1]];
  }
  const nearestDock = (docks, cx, cz) => { let best = null, bd = Infinity; for (const d of docks) { const h = (BUILDING[d.key]?.size || 2) / 2, dd = Math.hypot(d.x + h - cx, d.y + h - cz); if (dd < bd) { bd = dd; best = d; } } return best; };
  function syncSpace() {
    const docks = finishedOf('dock'), ports = docks.concat(finishedOf('tether')), old = new Map(haulers.map((h) => [h.key, h])), next = [];
    let slot = 0;
    for (const m of HAUL_FROM.flatMap(finishedOf)) {
      const d = nearestDock(ports, m.x + 1, m.y + 1);
      if (!d) continue;
      let seam = false;
      if (m.key === 'oremine') for (let y = m.y; y < m.y + 2; y++) for (let x = m.x; x < m.x + 2; x++) if (st.map.r[y * W + x] === R.ORE_SEAM) seam = true;
      for (let k = 0; k < (seam ? 2 : 1) && next.length < CAP.haulers; k++) {
        const key = `${m.id}:${k}:${d.id}`, a = [m.x + 1.45, ground(m.x, m.y, 2) + (m.key === 'oremine' ? 1.2 : 1.6), m.y + 1.5], b = dockPad(d, slot++);
        const h = old.get(key) || { key, ph: k ? 2 : 0, u: k ? 0 : Math.random(), t: Math.random() * 2, hx: 1, hz: 0 };
        const dist = Math.hypot(b[0] - a[0], b[2] - a[2]);
        Object.assign(h, { a, b, dur: Math.max(4, dist / SPEED.hauler + 2.4), cruise: Math.max(a[1], b[1]) + 2.6 + 0.4 * k, dx: (b[0] - a[0]) / (dist || 1), dz: (b[2] - a[2]) / (dist || 1) });
        if (old.has(key) === false) { h.hx = h.dx; h.hz = h.dz; }
        const pods = POD_OF[m.key] || HAULER_POD;
        haulerMesh.instanceColor.array.set(pods[next.length % pods.length], next.length * 3);
        next.push(h);
      }
    }
    haulers = next;
    haulerMesh.instanceColor.needsUpdate = true;
    const oldD = new Map(drones.map((d) => [d.key, d])), nextD = [];
    for (const c of finishedOf('induction')) {
      if (nextD.length >= CAP.drones) break;
      const d = nearestDock(docks, c.x + 1, c.y + 1), key = `${c.id}:${d ? d.id : 0}`;
      const dr = oldD.get(key) || { key, ph: 0, t: 6 + Math.random() * 10, ang: Math.random() * 6.3, u: 0, f: [0, 0, 0], hx: 1, hz: 0 };
      Object.assign(dr, { c: [c.x + 1, ground(c.x, c.y, 2) + 2.15, c.y + 1], r: 1.35, dock: d ? dockPad(d, slot++) : null });
      nextD.push(dr);
    }
    for (const bay of finishedOf('dronebay')) {   // survey drones circle their bay (no dock run)
      if (nextD.length >= CAP.drones) break;
      const key = `bay:${bay.id}`, dr = oldD.get(key) || { key, ph: 0, t: 10, ang: Math.random() * 6.3, u: 0, f: [0, 0, 0], hx: 1, hz: 0 };
      Object.assign(dr, { c: [bay.x + 0.5, ground(bay.x, bay.y, 1) + 1.15, bay.y + 0.5], r: 0.75, dock: null });
      nextD.push(dr);
    }
    drones = nextD;
  }

  // ---- the transport --------------------------------------------------------------------------

  const tr = { on: false, ph: 0, u: 0, n: 0, spawned: false, S: [0, 0, 0], V: [0, 0, 0], dx: 0, dz: 1, dockId: 0 };
  function launchTransport(n) {
    const d = finishedOf('dock')[0];
    if (!d) return;
    const cx = d.x + 1, cz = d.y + 1, top = ground(d.x, d.y, 2);
    // the nearest map edge (usually the bottom, over Earth's atmosphere)
    const edges = [[cx, 0, -1], [W - cx, 1, 0], [cz, 0, 1], [H - cz, 0, 0]];
    let e = 3; for (let k = 0; k < 4; k++) if (edges[k][0] < edges[e][0]) e = k;
    const far = 45, S = e === 0 ? [-far, cz] : e === 1 ? [W + far, cz] : e === 2 ? [cx, -far] : [cx, H + far];
    Object.assign(tr, { on: true, ph: 0, u: 0, n: n || 0, spawned: false, dockId: d.id, S: [S[0], 22, S[1]], V: [cx + 0.1, top + 3.1, cz + 0.15] });
    const dx = tr.V[0] - tr.S[0], dz = tr.V[2] - tr.S[2], l = Math.hypot(dx, dz) || 1;
    tr.dx = dx / l; tr.dz = dz / l;
    stale = true;
  }
  function spawnNewcomers() {
    tr.spawned = true;
    const dock = G?.recs.get(tr.dockId);
    if (!dock || !dock.entries.length) return;
    const list = [...G.recs.values()].filter((r) => r.home && r.comps.some((c) => dock.comps.includes(c)));
    if (!list.length) return;
    // nearest homes first, so the newcomers fan out to the closest habitats
    const { dist } = bfsFrom(dock), dmin = (r) => Math.min(...[...r.entries].map((e) => (dist[e] < 0 ? 1e9 : dist[e])));
    list.sort((p, q) => dmin(p) - dmin(q));
    const k = Math.min(CAP.newcomers, Math.floor(tr.n / 2));
    for (let j = 0; j < k && newcomers.n < CAP.newcomers; j++) {
      const home = list[j % Math.min(list.length, 6)], P = getPath(dock.id, home.id, 0);
      if (!P) continue;
      const i = newcomers.n++;
      newcomers.a[i] = dock.id; newcomers.b[i] = home.id; newcomers.ph[i] = 0; newcomers.t[i] = j * 0.55;
      newcomers.v[i] = SPEED.walk * (0.95 + 0.2 * Math.random());
      setPath(newcomers, i, P);
      putColor(newcomers, i, NEWCOMER);
    }
  }

  // ---- refresh: from the simulation's numbers to targets ----------------------------------------

  function refresh(state, info = {}) {
    const first = st !== state && (!st || info.reset);
    st = state; W = state.map.w; H = state.map.h; terrTop = info.terrTop || terrTop || new Float32Array(W * H);
    if (!speedSet && typeof state.speed === 'number') speed = state.speed;
    const fh = footprintHash();
    let graphChanged = false;
    if (!G || fh !== footSig || info.reset) { G = buildGraph(); footSig = fh; graphChanged = true; }
    roles();
    if (graphChanged || info.buildingsChanged || info.reset) {
      revalidate(people, (i) => (people.ph[i] === 1 || people.ph[i] === 3) && (!G.recs.get(people.a[i]) || !G.recs.get(people.b[i])));
      revalidate(newcomers, (i) => !G.recs.get(newcomers.b[i]));
      revalidate(rovers, (i) => !G.recs.get(rovers.a[i]) || !G.recs.get(rovers.b[i]));
      revalidate(crews, (i) => !G.recs.get(crews.a[i]) || !G.recs.get(crews.b[i]));
    }
    populate();
    syncRiver(!!info.chambersChanged || first, !!info.buildingsChanged || first || graphChanged);
    if (info.buildingsChanged || first || graphChanged) syncSpace();
    const a = state.flags?.arrival;
    if (lastArrival === undefined || info.reset) lastArrival = a ? a.day : -Infinity;
    else if (a && a.day > lastArrival) { lastArrival = a.day; launchTransport(a.n); }
    stale = true;
  }

  // ---- the hot loop -----------------------------------------------------------------------------

  function step(dReal, camDist) {
    const d = dReal * speed, ease = Math.min(1, dReal * 12);
    const kWalk = Math.min(2.2, Math.max(1, camDist / 40)), kDrive = Math.min(1.8, Math.max(1, camDist / 50));
    const kFly = Math.min(1.8, Math.max(1, camDist / 60)), kBarge = Math.min(1.4, Math.max(1, camDist / 80));

    // people: 0 at home, 1 walking out, 2 inside the destination, 3 walking home
    const pace = glum ? GLUM.pace : 1;
    for (let i = 0; i < people.n;) {
      const ph = people.ph[i], o = i * 16;
      if (ph === 0 || ph === 2) {
        people.t[i] -= d;
        if (people.t[i] <= 0) {
          if (ph === 0) {
            if (people.n > peopleTarget || !homeOk(people.a[i])) { swapOut(people, i); continue; }
            const dest = pickIn(compDest, G.recs.get(people.a[i])), P = dest ? getPath(people.a[i], dest, 0) : null;
            if (P) { people.b[i] = dest; people.ph[i] = 1; setPath(people, i, P); } else people.t[i] = 3 + Math.random() * 5;
          } else {
            const P = homeOk(people.a[i]) ? getPath(people.b[i], people.a[i], 0) : null;
            if (!P) { swapOut(people, i); continue; }
            people.ph[i] = 3; setPath(people, i, P);
          }
        }
        if (people.ph[i] === 0 || people.ph[i] === 2) { hide(people.A, o); i++; continue; }
      }
      const P = people.path[i];
      people.s[i] += people.v[i] * pace * d;
      if (people.s[i] >= P.len) {
        people.ph[i] = people.ph[i] === 1 ? 2 : 0;
        people.t[i] = people.ph[i] === 2 ? 3 + Math.random() * 5 : 4 + Math.random() * 10;
        hide(people.A, o); i++; continue;
      }
      drawWalker(people, i, kWalk, Math.abs(Math.sin(people.s[i] * 13)) * 0.012, ease);
      i++;
    }
    // newcomers: wait their turn at the dock, walk to a habitat, go in for good
    for (let i = 0; i < newcomers.n;) {
      if (newcomers.t[i] > 0) { newcomers.t[i] -= d; hide(newcomers.A, i * 16); i++; continue; }
      newcomers.s[i] += newcomers.v[i] * d;
      if (newcomers.s[i] >= newcomers.path[i].len) { swapOut(newcomers, i); continue; }
      drawWalker(newcomers, i, kWalk, Math.abs(Math.sin(newcomers.s[i] * 13)) * 0.012, ease);
      i++;
    }
    // rovers: 0 driving, 1 parked beside a producer
    for (let i = 0; i < rovers.n;) {
      if (rovers.ph[i] === 1) {
        rovers.t[i] -= d;
        if (rovers.t[i] <= 0) {
          if (rovers.n > roverTarget) { swapOut(rovers, i); continue; }
          const rec = G.recs.get(rovers.b[i]), next = rec ? pickIn(compProd, rec) : 0, P = next ? getPath(rovers.b[i], next, 1) : null;
          if (P) { rovers.a[i] = rovers.b[i]; rovers.b[i] = next; rovers.ph[i] = 0; const hx = rovers.hx[i], hz = rovers.hz[i]; setPath(rovers, i, P); rovers.hx[i] = hx; rovers.hz[i] = hz; }
          else if (!rec || !rec.prod) { swapOut(rovers, i); continue; }
          else rovers.t[i] = 2 + Math.random() * 3;
        }
      } else {
        rovers.s[i] += rovers.v[i] * d;
        if (rovers.s[i] >= rovers.path[i].len) { rovers.s[i] = rovers.path[i].len; rovers.ph[i] = 1; rovers.t[i] = 2 + Math.random() * 4; }
      }
      drawWalker(rovers, i, kDrive, 0, ease);
      i++;
    }
    // repair crews: 0 driving to the site, 1 parked beside it until it is finished, 2 driving back
    for (let i = 0; i < crews.n;) {
      if (crews.ph[i] !== 1) {
        crews.s[i] += crews.v[i] * d;
        if (crews.s[i] >= crews.path[i].len) {
          if (crews.ph[i] === 2) { swapOut(crews, i); continue; }
          crews.s[i] = crews.path[i].len;
          if (crews.done[i]) {
            const P = getPath(crews.b[i], crews.a[i], 1);
            if (!P) { swapOut(crews, i); continue; }
            crews.ph[i] = 2; setPath(crews, i, P);
          } else crews.ph[i] = 1;
        }
      }
      drawWalker(crews, i, kDrive, 0, ease);
      i++;
    }
    for (let w = 0; w < WALKERS.length; w++) {
      const g = WALKERS[w];
      g.mesh.count = g.n; g.mesh.instanceMatrix.needsUpdate = true;
      if (g.colDirty) { g.mesh.instanceColor.needsUpdate = true; g.colDirty = false; }
    }

    // barges: back and forth along their stretch, keeping right, pausing at stops, turning at the ends
    const BA = bargeMesh.instanceMatrix.array;
    for (let i = 0; i < barges.n; i++) {
      const S = stretches[barges.st[i]];
      if (!S) { hide(BA, i * 16); continue; }
      let dir = barges.dir[i], turnU = barges.turn[i];
      barges.bob[i] += d * 1.7;
      if (barges.pause[i] > 0) barges.pause[i] -= d;
      else if (turnU >= 0) {
        turnU += d / 2.8;
        if (turnU >= 1) { turnU = -1; dir = -dir; barges.dir[i] = dir; barges.pause[i] = 0.4; }
        barges.turn[i] = turnU;
      } else if (S.hi - S.lo > 0.2) {
        const s0 = barges.s[i];
        let s1 = s0 + dir * SPEED.barge * d;
        for (let j = 0; j < S.stops.length; j++) {
          const p = S.stops[j];
          if (dir > 0 ? p > s0 && p <= s1 : p < s0 && p >= s1) { s1 = p; barges.pause[i] = 2.2 + Math.random(); break; }
        }
        if (s1 >= S.hi || s1 <= S.lo) { s1 = Math.min(S.hi, Math.max(S.lo, s1)); barges.turn[i] = 0; turnU = 0; }
        barges.s[i] = s1;
      } else if (turnU < 0 && barges.pause[i] <= 0) { barges.turn[i] = 0; turnU = 0; }
      barges.k[i] = along(S.P, barges.s[i], barges.k[i]);
      let hx = DX * dir, hz = DZ * dir, side = 0.3;
      if (turnU >= 0) {
        const e = smooth01(turnU), c = Math.cos(Math.PI * e), s = Math.sin(Math.PI * e), x0 = hx;
        hx = x0 * c - hz * s; hz = x0 * s + hz * c; side = 0.3 * c;
      }
      // lateral offset to the right of the travel direction (before the turn)
      const rx = -DZ * dir, rz = DX * dir, bob = Math.sin(barges.bob[i]) * 0.012;
      setYaw(BA, i * 16, PX + rx * side, WATER_Y + 0.01 + bob, PZ + rz * side, hx, -hz, kBarge);
    }
    bargeMesh.count = barges.n; bargeMesh.instanceMatrix.needsUpdate = true;

    // haulers: 0 loading at the mine, 1 flying to the dock, 2 unloading, 3 flying back
    const HA = haulerMesh.instanceMatrix.array;
    for (let i = 0; i < haulers.length; i++) {
      const h = haulers[i];
      let x, y, z, p = 0, hx = h.hx, hz = h.hz;
      if (h.ph === 0 || h.ph === 2) {
        h.t -= d;
        const at = h.ph === 0 ? h.a : h.b;
        x = at[0]; y = at[1] + Math.sin(h.t * 3) * 0.03; z = at[2];
        if (h.t <= 0) { h.ph++; h.u = 0; }
      } else {
        h.u += d / h.dur;
        const from = h.ph === 1 ? h.a : h.b, to = h.ph === 1 ? h.b : h.a;
        flight(from, to, Math.min(1, h.u), h.cruise);
        x = PX; y = PY; z = PZ; p = PITCH;
        hx = h.ph === 1 ? h.dx : -h.dx; hz = h.ph === 1 ? h.dz : -h.dz;
        if (h.u >= 1) { h.ph = (h.ph + 1) % 4; h.t = h.ph === 2 ? 2 + Math.random() : 2.5 + Math.random() * 1.5; }
      }
      // ease the heading round on the pads (the turn happens while it loads)
      h.hx += (hx - h.hx) * ease * 0.5; h.hz += (hz - h.hz) * ease * 0.5;
      const l = Math.sqrt(h.hx * h.hx + h.hz * h.hz) || 1;
      setYawPitch(HA, i * 16, x, y, z, h.hx / l, -h.hz / l, p, kFly);
    }
    haulerMesh.count = haulers.length; haulerMesh.instanceMatrix.needsUpdate = true;

    // drones: 0 circling the collector, 1 flying to the dock, 2 at the dock, 3 flying back
    const DA = droneMesh.instanceMatrix.array;
    for (let i = 0; i < drones.length; i++) {
      const dr = drones[i];
      let x, y, z, hx = dr.hx, hz = dr.hz, p = 0;
      if (dr.ph === 0) {
        dr.ang += d * 0.9; dr.t -= d;
        x = dr.c[0] + Math.cos(dr.ang) * dr.r; z = dr.c[2] + Math.sin(dr.ang) * dr.r; y = dr.c[1] + Math.sin(dr.ang * 2) * 0.08;
        hx = -Math.sin(dr.ang); hz = Math.cos(dr.ang);
        if (dr.t <= 0 && dr.dock) { dr.ph = 1; dr.u = 0; dr.f[0] = x; dr.f[1] = y; dr.f[2] = z; dr.dur = Math.max(3, Math.hypot(dr.dock[0] - x, dr.dock[2] - z) / SPEED.hauler + 1.6); }
        else if (dr.t <= 0) dr.t = 10;
      } else if (dr.ph === 2) {
        dr.t -= d; x = dr.dock[0]; y = dr.dock[1] + 0.25; z = dr.dock[2];
        if (dr.t <= 0) { dr.ph = 3; dr.u = 0; }
      } else {
        dr.u += d / dr.dur;
        const to = dr.ph === 1 ? dr.dock : dr.f, from = dr.ph === 1 ? dr.f : dr.dock;
        flight(from, to, Math.min(1, dr.u), Math.max(from[1], to[1]) + 1.6);
        x = PX; y = PY; z = PZ; p = PITCH * 0.5;
        const ddx = to[0] - from[0], ddz = to[2] - from[2], l = Math.hypot(ddx, ddz) || 1;
        hx = ddx / l; hz = ddz / l;
        if (dr.u >= 1) { if (dr.ph === 1) { dr.ph = 2; dr.t = 3; } else { dr.ph = 0; dr.t = 10 + Math.random() * 8; dr.ang = Math.atan2(dr.f[2] - dr.c[2], dr.f[0] - dr.c[0]); } }
      }
      dr.hx += (hx - dr.hx) * ease; dr.hz += (hz - dr.hz) * ease;
      const l = Math.sqrt(dr.hx * dr.hx + dr.hz * dr.hz) || 1;
      setYawPitch(DA, i * 16, x, y, z, dr.hx / l, -dr.hz / l, p, kFly);
    }
    droneMesh.count = drones.length; droneMesh.instanceMatrix.needsUpdate = true;

    // the transport: 0 approach (decelerating, descending), 1 hover (turning about), 2 departure
    if (tr.on) {
      const TA = transportMesh.instanceMatrix.array, S = tr.S, V = tr.V;
      let x, y, z, c = tr.dx, s = -tr.dz, p = 0;
      if (tr.ph === 0) {
        tr.u += d / 10;
        const u = Math.min(1, tr.u), e = 1 - (1 - u) * (1 - u);
        x = S[0] + (V[0] - S[0]) * e; z = S[2] + (V[2] - S[2]) * e; y = S[1] + (V[1] - S[1]) * smooth01(u * 1.1);
        p = -0.12 * Math.sin(Math.PI * u);
        if (tr.u >= 1) { tr.ph = 1; tr.u = 0; }
      } else if (tr.ph === 1) {
        tr.u += d / 6.5;
        const u = Math.min(1, tr.u), a = Math.PI * smooth01((u - 0.45) / 0.5);
        x = V[0]; z = V[2]; y = V[1] + Math.sin(u * 9) * 0.05;
        const ca = Math.cos(a), sa = Math.sin(a);
        c = tr.dx * ca - tr.dz * sa; s = -(tr.dx * sa + tr.dz * ca);
        if (!tr.spawned && u > 0.12) spawnNewcomers();
        if (tr.u >= 1) { tr.ph = 2; tr.u = 0; }
      } else {
        tr.u += d / 9;
        const u = Math.min(1, tr.u), e = u * u;
        x = V[0] + (S[0] - V[0]) * e; z = V[2] + (S[2] - V[2]) * e; y = V[1] + (S[1] + 6 - V[1]) * smooth01(u);
        c = -tr.dx; s = tr.dz; p = 0.15 * Math.sin(Math.PI * Math.min(1, u * 1.5));
        if (tr.u >= 1) tr.on = false;
      }
      if (tr.on) setYawPitch(TA, 0, x, y, z, c, s, p, 1);
      transportMesh.count = tr.on ? 1 : 0;
      transportMesh.instanceMatrix.needsUpdate = true;
    } else transportMesh.count = 0;
  }

  // An arc between two points: it lifts off, cruises and settles (u in 0..1); PITCH follows.
  function flight(a, b, u, cruise) {
    const p = smooth01((u - 0.14) / 0.72);
    PX = a[0] + (b[0] - a[0]) * p; PZ = a[2] + (b[2] - a[2]) * p;
    if (u < 0.3) { PY = a[1] + (cruise - a[1]) * smooth01(u / 0.3); PITCH = 0.3 * Math.sin(Math.PI * u / 0.3); }
    else if (u > 0.7) { PY = b[1] + (cruise - b[1]) * smooth01((1 - u) / 0.3); PITCH = -0.22 * Math.sin(Math.PI * (1 - u) / 0.3); }
    else { PY = cruise; PITCH = 0; }
  }

  function update(dtReal, camDist = 50) {
    if (!st || !G) return;
    if (!speed && !stale) return;                     // paused: everything holds still
    const t0 = performance.now();
    step(speed ? Math.min(0.1, dtReal) : 0, camDist);
    stale = false;
    stats.ms = performance.now() - t0;
    stats.msAvg += (stats.ms - stats.msAvg) * 0.05;
  }

  function setSpeed(s) {
    speedSet = true;
    speed = [0, 1, 2, 4].includes(+s) ? +s : Math.max(0, +s || 0);
  }

  function reset() {
    for (const g of [people, newcomers, rovers, crews]) { for (let i = 0; i < g.n; i++) g.path[i] = null; g.n = 0; g.mesh.count = 0; }
    barges.n = 0; haulers = []; drones = []; stretches = []; riverSig = ''; tr.on = false;
    G = null; footSig = -1; lastArrival = undefined; st = null; stale = true;
  }

  function count() {
    return {
      people: people.n, peopleWalking: [...people.ph.subarray(0, people.n)].filter((p) => p === 1 || p === 3).length, peopleTarget,
      newcomers: newcomers.n, rovers: rovers.n, roverTarget, crews: crews.n, barges: barges.n, bargeTarget, stretches: stretches.length, bargeStops: stretches.reduce((t, S) => t + S.stops.length, 0),
      haulers: haulers.length, drones: drones.length, transport: tr.on ? ['approach', 'hover', 'depart'][tr.ph] : null,
      roads: G ? G.Rn : 0, roadNetworks: G ? G.nc : 0, homes: homes.length, producers: producers.length, glum, speed,
      ms: +stats.ms.toFixed(3), msAvg: +stats.msAvg.toFixed(3),
      total: people.n + newcomers.n + rovers.n + crews.n + barges.n + haulers.length + drones.length + (tr.on ? 1 : 0),
    };
  }

  function dispose() {
    parent.remove(group);
    for (const m of group.children) m.dispose();
    for (const g of Object.values(geos)) g.dispose();
    mat.dispose();
  }

  return { refresh, update, setSpeed, getSpeed: () => speed, reset, stats: count, dispose, group, launchTransport };
}
