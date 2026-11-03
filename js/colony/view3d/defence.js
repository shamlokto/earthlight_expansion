// Defence for the colony's 3D view (docs/COLONY-V3.md "View"): the guardians idling beside the
// Arsenal(s), the Shipyard and the dock, the raid animation, and smoke over damaged buildings.
// Like movers.js it is VISUAL only: it reads state.guardians, state.raid and buildings[i].damaged
// on refresh() and never writes anything back.
//
//   * guardians: up to MAX_SHOWN of state.guardians, one InstancedMesh per class model (hu mecha,
//     planes fighters, armour tanks, ships hovering, support turret-crabs), tinted by class, bobbing
//     on an apron of free tiles beside their host: non-ships at an Arsenal (else the dock), ships
//     over the Shipyard (else the dock)
//   * raid episode: when state.raid.coming is due within a day, raiders (dark, red-trimmed) fly in
//     from its `from` edge ('north' top, 'east', 'west', 'earth' up out of the atmosphere) to a
//     standoff off the hull and loiter; when state.raid.last.day === state.day (a fight just
//     resolved) a skirmish plays once (FIGHT_S seconds): guardians lift off to meet them, beams,
//     missile trails, explosions; won: raiders fall and the rest flee; lost: the raiders reach the
//     hull and the buildings in last.damaged flash and burn, then they leave. A report with a
//     tribute and no losses or damage: the raiders simply turn back. Once started, an episode
//     runs to its end whatever the state does next (a day is one second at x1)
//   * effects: additive sparks (fireballs, trails, muzzle flashes), smoke puffs, beams (stretched
//     additive boxes) and red building flashes, each one InstancedMesh with a fixed capacity
//   * time: update(dt) is scaled by the movers' speed (view.setSpeed); 0 freezes everything
import * as THREE from 'three';
import { BUILDING } from '../data/buildings.js';
import { MACHINE } from '../data/machines.js';
import { TERRAIN, T } from '../data/terrain.js';
import { model, moverMaterial } from './movers.js';

// ---- tuning ----------------------------------------------------------------------------------

export const MAX_SHOWN = 12;                 // guardians drawn at once (the rest stay in the hangars)
const FIGHT_S = 9;                           // the skirmish, seconds of view time at x1
const RAIDERS_MAX = 12;
const CAP = { sparks: 900, smoke: 420, beams: 140, flashes: 12, emitters: 24 };
const SPEED = { raider: 7.5, flee: 12, guardian: 8.5, ship: 4.5, ret: 7, scramble: 16 };   // tiles a second
const ALT = { battle: 5.2, standoff: 6.5, entry: 14 };
const CLS = ['hu', 'planes', 'armour', 'ships', 'support'];
// Class colours (the tinted parts): HU blue, fighters cyan, armour green, ships gold, support orange.
const CLS_COLOR = { hu: '#5a8cff', planes: '#40e0ff', armour: '#9ad04a', ships: '#f2c14a', support: '#ff9a3a' };
const FLIERS = new Set(['hu', 'planes', 'ships']);             // these lift off; armour and support fire from the apron
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const CLS_RGB = Object.fromEntries(CLS.map((k) => [k, lin(CLS_COLOR[k])]));
const BEAM_RGB = { hu: lin('#7fe8ff'), planes: lin('#9ff0ff'), armour: lin('#ffe07a'), ships: lin('#d8f0ff'), support: lin('#ffd08a'), raider: lin('#ff3a2a'), dragon: lin('#e8fbff') };
const FIRE = [lin('#fff6d8'), lin('#ffd27a'), lin('#ff8a2a'), lin('#ff4a1a')];
const SMOKE = [lin('#2a2a2e'), lin('#3a3836'), lin('#4a4644')];
const HALF = Math.PI / 2;

// ---- models (face +x; `tint` parts take the class colour) ------------------------------------

const WHITE = '#eef1f5', STEEL = '#9aa3ad', DARK = '#3d444d', WIN = '#7fe0ff', CYAN = '#5ff0ff';
const RAID_HULL = '#2e3038', RAID_TRIM = '#d8242c', RAID_GLOW = '#ff3a2a';

// An HU mecha ~0.75 tall: legs, a tinted torso and shoulders, white head with a green visor,
// a rifle and a backpack with cyan thrusters.
const MECHA = () => model([
  ...[0.08, -0.08].flatMap((z) => [
    { s: 'box', size: [0.18, 0.05, 0.11], pos: [0.03, 0.025, z], c: DARK },
    { s: 'box', size: [0.11, 0.3, 0.1], pos: [0, 0.2, z], c: '#7c8794' },
  ]),
  { s: 'box', size: [0.16, 0.08, 0.26], pos: [0, 0.37, 0], c: DARK },
  { s: 'box', size: [0.22, 0.22, 0.3], pos: [0, 0.51, 0], c: '#ffffff', tint: 1 },
  { s: 'box', size: [0.02, 0.06, 0.12], pos: [0.115, 0.55, 0], c: WIN, glow: 1 },
  { s: 'box', size: [0.11, 0.09, 0.11], pos: [0.01, 0.67, 0], c: WHITE },
  { s: 'box', size: [0.02, 0.03, 0.09], pos: [0.065, 0.68, 0], c: '#5fff8a', glow: 1 },
  { s: 'box', size: [0.015, 0.1, 0.015], pos: [-0.02, 0.76, 0.04], c: STEEL },
  ...[0.21, -0.21].flatMap((z) => [
    { s: 'box', size: [0.14, 0.1, 0.11], pos: [0, 0.6, z], c: '#ffffff', tint: 1 },
    { s: 'box', size: [0.08, 0.22, 0.08], pos: [0.02, 0.44, z], c: WHITE },
  ]),
  { s: 'box', size: [0.38, 0.05, 0.05], pos: [0.15, 0.36, 0.27], c: DARK },
  { s: 'box', size: [0.1, 0.18, 0.2], pos: [-0.15, 0.52, 0], c: WHITE },
  ...[0.06, -0.06].map((z) => ({ s: 'cyl', r: 0.03, h: 0.05, seg: 6, pos: [-0.2, 0.43, z], c: CYAN, glow: 1 })),
]);
// A fighter ~0.8 long: white fuselage, tinted swept wings and fins, a lit canopy, twin engines.
const FIGHTER = () => model([
  { s: 'box', size: [0.56, 0.1, 0.14], pos: [0, 0, 0], c: WHITE },
  { s: 'cone', r: 0.07, h: 0.24, seg: 4, spin: Math.PI / 4, rot: [0, 0, -HALF], pos: [0.4, 0, 0], c: WHITE },
  { s: 'box', size: [0.15, 0.05, 0.08], pos: [0.16, 0.07, 0], c: WIN, glow: 1 },
  ...[1, -1].flatMap((k) => [
    { s: 'box', size: [0.3, 0.025, 0.36], pos: [-0.08, -0.01, k * 0.22], rot: [0, k * 0.55, 0], c: '#ffffff', tint: 1 },
    { s: 'box', size: [0.14, 0.14, 0.02], pos: [-0.22, 0.09, k * 0.06], rot: [k * 0.25, 0, 0], c: '#ffffff', tint: 1 },
    { s: 'cyl', r: 0.035, h: 0.04, seg: 6, rot: [0, 0, HALF], pos: [-0.3, 0, k * 0.04], c: CYAN, glow: 1 },
  ]),
]);
// A tank ~0.6 long: dark treads, a tinted hull and turret, a long barrel.
const TANK = () => model([
  ...[0.15, -0.15].map((z) => ({ s: 'box', size: [0.6, 0.12, 0.12], pos: [0, 0.06, z], c: '#2a2f36' })),
  { s: 'box', size: [0.52, 0.12, 0.28], pos: [0, 0.17, 0], c: '#ffffff', tint: 1 },
  { s: 'box', size: [0.24, 0.1, 0.2], pos: [-0.04, 0.28, 0], c: '#d8dde4' },
  { s: 'box', size: [0.26, 0.03, 0.22], pos: [-0.04, 0.33, 0], c: '#ffffff', tint: 1 },
  { s: 'cyl', r: 0.026, h: 0.42, seg: 6, rot: [0, 0, -HALF], pos: [0.28, 0.29, 0], c: STEEL },
  { s: 'box', size: [0.02, 0.03, 0.1], pos: [0.27, 0.19, 0], c: '#ffe07a', glow: 1 },
]);
// A ship ~2.4 long: a white hull with a tinted band and side nacelles, bridge, three engines.
const SHIP = () => model([
  { s: 'box', size: [1.6, 0.3, 0.5], pos: [0, 0, 0], c: WHITE },
  { s: 'cone', r: 0.36, h: 0.6, seg: 4, spin: Math.PI / 4, rot: [0, 0, -HALF], scale: [1, 0.6, 1], pos: [1.1, 0, 0], c: WHITE },
  { s: 'box', size: [1.62, 0.08, 0.52], pos: [0, -0.04, 0], c: '#ffffff', tint: 1 },
  { s: 'box', size: [0.32, 0.26, 0.22], pos: [-0.3, 0.27, 0], c: WHITE },
  { s: 'box', size: [0.33, 0.05, 0.23], pos: [-0.3, 0.32, 0], c: WIN, glow: 1 },
  { s: 'box', size: [0.2, 0.08, 0.08], pos: [0.45, 0.19, 0], c: DARK },
  ...[0.38, -0.38].flatMap((z) => [
    { s: 'box', size: [0.9, 0.16, 0.16], pos: [-0.35, -0.02, z], c: '#ffffff', tint: 1 },
    { s: 'cyl', r: 0.07, h: 0.04, seg: 8, rot: [0, 0, HALF], pos: [-0.82, -0.02, z], c: CYAN, glow: 1 },
  ]),
  ...[0.12, -0.12].map((z) => ({ s: 'cyl', r: 0.1, h: 0.05, seg: 8, rot: [0, 0, HALF], pos: [-0.82, 0, z], c: CYAN, glow: 1 })),
  { s: 'box', size: [0.08, 0.04, 0.06], pos: [0.2, 0.17, 0.25], c: '#ff4a3a', glow: 1 },
  { s: 'box', size: [0.08, 0.04, 0.06], pos: [0.2, 0.17, -0.25], c: '#4aff7a', glow: 1 },
]);
// A support craft ~0.5: a crab body on four splayed legs, a twin-barrel turret, a sensor eye.
const SUPPORT = () => model([
  ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, z]) => ({ s: 'box', size: [0.05, 0.22, 0.05], pos: [x * 0.14, 0.1, z * 0.14], rot: [z * 0.5, 0, -x * 0.5], c: DARK })),
  { s: 'ball', r: 0.17, seg: 8, scale: [1.1, 0.55, 1], pos: [0, 0.22, 0], c: '#ffffff', tint: 1 },
  { s: 'box', size: [0.14, 0.08, 0.14], pos: [0, 0.31, 0], c: WHITE },
  ...[0.035, -0.035].map((z) => ({ s: 'cyl', r: 0.018, h: 0.28, seg: 5, rot: [0, 0, -HALF], pos: [0.18, 0.32, z], c: STEEL })),
  { s: 'ball', r: 0.03, seg: 6, pos: [0.16, 0.22, 0], c: '#ffd23a', glow: 1 },
]);
// A raider ~0.9 long: a dark angular fuselage with forward prongs, red trim and red engines.
const RAIDER = () => model([
  { s: 'box', size: [0.52, 0.1, 0.18], pos: [0, 0, 0], c: RAID_HULL },
  { s: 'box', size: [0.5, 0.02, 0.05], pos: [0, 0.06, 0], c: RAID_TRIM, glow: 1 },
  ...[1, -1].flatMap((k) => [
    { s: 'box', size: [0.42, 0.05, 0.06], pos: [0.28, 0, k * 0.13], rot: [0, -k * 0.12, 0], c: RAID_HULL },
    { s: 'box', size: [0.06, 0.05, 0.065], pos: [0.5, 0, k * 0.155], c: RAID_TRIM, glow: 1 },
    { s: 'box', size: [0.26, 0.03, 0.42], pos: [-0.12, 0, k * 0.26], rot: [0, k * 0.5, k * 0.15], c: '#34363e' },
    { s: 'box', size: [0.2, 0.035, 0.05], pos: [-0.17, 0.01, k * 0.44], rot: [0, k * 0.5, 0], c: RAID_TRIM, glow: 1 },
    { s: 'cyl', r: 0.04, h: 0.05, seg: 6, rot: [0, 0, HALF], pos: [-0.28, 0, k * 0.05], c: RAID_GLOW, glow: 1 },
  ]),
  { s: 'box', size: [0.1, 0.04, 0.08], pos: [0.12, 0.07, 0], c: '#ff8a5a', glow: 1 },
]);
// A raider capital ship ~3 long: a dark wedge with red trim bands, a tall bridge, red engines.
const RAIDER_SHIP = () => model([
  { s: 'box', size: [2.0, 0.36, 0.7], pos: [0, 0, 0], c: RAID_HULL },
  { s: 'cone', r: 0.5, h: 0.9, seg: 4, spin: Math.PI / 4, rot: [0, 0, -HALF], scale: [1, 0.55, 1], pos: [1.45, 0, 0], c: RAID_HULL },
  { s: 'box', size: [2.02, 0.06, 0.72], pos: [0, 0.08, 0], c: RAID_TRIM, glow: 1 },
  { s: 'box', size: [0.4, 0.4, 0.26], pos: [-0.5, 0.36, 0], c: '#30333a' },
  { s: 'box', size: [0.41, 0.05, 0.27], pos: [-0.5, 0.46, 0], c: '#ff7a5a', glow: 1 },
  ...[0.5, -0.5].flatMap((z) => [
    { s: 'box', size: [1.2, 0.2, 0.22], pos: [-0.4, -0.05, z], c: '#30333a' },
    { s: 'box', size: [1.21, 0.04, 0.23], pos: [-0.4, 0.04, z], c: RAID_TRIM },
    { s: 'cyl', r: 0.09, h: 0.05, seg: 8, rot: [0, 0, HALF], pos: [-1.02, -0.05, z], c: RAID_GLOW, glow: 1 },
  ]),
  ...[0.15, -0.15].map((z) => ({ s: 'cyl', r: 0.13, h: 0.05, seg: 8, rot: [0, 0, HALF], pos: [-1.02, 0, z], c: RAID_GLOW, glow: 1 })),
  ...[-0.6, 0, 0.6].map((x) => ({ s: 'box', size: [0.06, 0.04, 0.06], pos: [x, 0.2, 0.36], c: RAID_GLOW, glow: 1 })),
]);
const MODELS = { hu: MECHA, planes: FIGHTER, armour: TANK, ships: SHIP, support: SUPPORT, raider: RAIDER, raidship: RAIDER_SHIP };
const SCALE = { hu: 1, planes: 1, armour: 1, ships: 1, support: 1, raider: 1.35, raidship: 1.25 };

// ---- small helpers -----------------------------------------------------------------------------

const smooth01 = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const clsOf = (g) => { const c = MACHINE[g?.type]?.cls; return CLS.includes(c) ? c : 'hu'; };
// a deterministic 0..1 from two integers, so placement and jitter do not jump between refreshes
const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const rnd = Math.random;
const SIDES = ['north', 'east', 'west', 'earth'];
const sideOf = (from) => (SIDES.includes(from) ? from : 'earth');

// Additive sparks or smoke puffs: structure of arrays, swap-remove, one InstancedMesh.
class Particles {
  constructor(parent, geo, mat, cap, smoke) {
    this.cap = cap; this.n = 0; this.smoke = smoke;
    for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'life', 'max', 's0', 's1', 'r', 'g', 'b', 'drag']) this[k] = new Float32Array(cap);
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    parent.add(this.mesh);
  }
  spawn(x, y, z, vx, vy, vz, life, s0, s1, rgb, drag = 0) {
    if (this.n >= this.cap) return;
    const i = this.n++;
    this.x[i] = x; this.y[i] = y; this.z[i] = z; this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.life[i] = this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1;
    this.r[i] = rgb[0]; this.g[i] = rgb[1]; this.b[i] = rgb[2]; this.drag[i] = drag;
  }
  step(dt) {
    for (let i = 0; i < this.n;) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kill(i); continue; }
      const f = this.drag[i] ? Math.exp(-this.drag[i] * dt) : 1;
      this.vx[i] *= f; this.vy[i] *= f; this.vz[i] *= f;
      this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; this.z[i] += this.vz[i] * dt;
      i++;
    }
  }
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'life', 'max', 's0', 's1', 'r', 'g', 'b', 'drag']) this[k][i] = this[k][j];
  }
  draw() {
    const a = this.mesh.instanceMatrix.array, c = this.mesh.instanceColor.array;
    for (let i = 0; i < this.n; i++) {
      const u = 1 - this.life[i] / this.max[i];
      let s = this.s0[i] + (this.s1[i] - this.s0[i]) * (this.smoke ? Math.sqrt(u) : u), k = 1;
      if (this.smoke) { if (u > 0.7) s *= 1 - (u - 0.7) / 0.3; if (u < 0.08) s *= u / 0.08; }
      else k = (1 - u) ** 1.6;
      const o = i * 16;
      a.fill(0, o, o + 16);
      a[o] = s; a[o + 5] = s; a[o + 10] = s; a[o + 12] = this.x[i]; a[o + 13] = this.y[i]; a[o + 14] = this.z[i]; a[o + 15] = 1;
      c[i * 3] = this.r[i] * k; c[i * 3 + 1] = this.g[i] * k; c[i * 3 + 2] = this.b[i] * k;
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
  }
}

// ================================================================================================

export function createDefence(parent, helpers = {}) {
  const group = new THREE.Group();
  group.name = 'defence';
  parent.add(group);

  // craft
  const mat = moverMaterial();
  const geos = Object.fromEntries(Object.entries(MODELS).map(([k, f]) => [k, f()]));
  const meshes = {};
  for (const k of Object.keys(MODELS)) {
    const cap = k === 'raider' || k === 'raidship' ? RAIDERS_MAX + 4 : MAX_SHOWN + 8;
    const m = new THREE.InstancedMesh(geos[k], mat, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    m.frustumCulled = false; m.count = 0; m.name = 'defence-' + k;
    group.add(m); meshes[k] = m;
  }
  // effects
  const ball = new THREE.IcosahedronGeometry(0.5, 1), boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const addMat = () => new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparkMat = addMat(), beamMat = addMat(), flashMat = addMat();
  const smokeMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.56, depthWrite: false });
  const sparks = new Particles(group, ball, sparkMat, CAP.sparks, false);
  const smoke = new Particles(group, ball, smokeMat, CAP.smoke, true);
  sparks.mesh.renderOrder = 6; smoke.mesh.renderOrder = 5;
  const beamMesh = new THREE.InstancedMesh(boxGeo, beamMat, CAP.beams);
  beamMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP.beams * 3), 3);
  beamMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); beamMesh.frustumCulled = false; beamMesh.count = 0; beamMesh.renderOrder = 6;
  const flashMesh = new THREE.InstancedMesh(boxGeo, flashMat, CAP.flashes);
  flashMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP.flashes * 3), 3);
  flashMesh.frustumCulled = false; flashMesh.count = 0; flashMesh.renderOrder = 6;
  group.add(beamMesh, flashMesh);

  let st = null, W = 0, H = 0, terrTop = null;
  let hull = null;                                  // [x0, y0, x1, y1] of the hull's tiles
  let guards = [];                                  // guardian actors (ghosts included during a fight)
  let ep = null;                                    // the raid episode being shown
  let played = new Set();                           // reports already played (by day and side)
  let lastComing = null;                            // the last coming raid seen (its raider count)
  let emitters = [];                                // smoke over damaged buildings
  let edge = null;                                  // the coming raid's side, for the minimap
  let guardSig = '';
  const beams = [], missiles = [], flashes = [];
  let clock = 0;
  const stats = { fights: 0 };

  const topAt = helpers.topAt || ((x, y) => (terrTop ? Math.max(0, terrTop[y * W + x]) : 0));
  const freeAt = helpers.freeAt || (() => true);
  const groundOf = (x, y, n) => { let g = -1; for (let j = y; j < y + n; j++) for (let i = x; i < x + n; i++) if (i >= 0 && j >= 0 && i < W && j < H) g = Math.max(g, terrTop[j * W + i]); return Math.max(0, g); };
  const roofOf = (x, y, n) => { let g = 0; for (let j = y; j < y + n; j++) for (let i = x; i < x + n; i++) if (i >= 0 && j >= 0 && i < W && j < H) g = Math.max(g, topAt(i, j)); return g; };
  const finished = (key) => (st.buildings || []).filter((b) => b.key === key && !(b.build > 0));
  const sizeOf = (key) => BUILDING[key]?.size || 1;

  // ---- the apron: free tiles of the host's own ground, nearest first, the hangar's front first --

  function groundSlots(host, taken, want) {
    const n = sizeOf(host.key), hi = host.y * W + host.x, ht = st.map.t[hi], hz = TERRAIN[ht]?.zone, hch = st.map.ch[hi];
    const g0 = groundOf(host.x, host.y, n), out = [];
    for (let r = 1; r <= 4 && out.length < want; r++) {
      const ring = [];
      for (let y = host.y - r; y < host.y + n + r; y++) for (let x = host.x - r; x < host.x + n + r; x++) {
        if (Math.max(host.x - x, x - (host.x + n - 1), host.y - y, y - (host.y + n - 1)) !== r) continue;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = y * W + x, t = st.map.t[i];
        if (taken.has(i) || !freeAt(i)) continue;
        if (t === T.RIVER || t === T.LAKE || t === T.BULKHEAD || t === T.GATE || t === T.BREACH) continue;
        if (TERRAIN[t]?.zone !== hz || (hz === 'interior' && st.map.ch[i] !== hch)) continue;
        if (Math.abs(terrTop[i] - g0) > 0.7) continue;
        // in front of the door (+z) first, then the sides, the back last
        const front = y >= host.y + n ? 0 : x < host.x || x >= host.x + n ? 1 : 2;
        ring.push([front * 100 + Math.abs(x + 0.5 - host.x - n / 2), i, x, y]);
      }
      ring.sort((a, b) => a[0] - b[0]);
      for (const [, i, x, y] of ring) { if (out.length >= want) break; taken.add(i); out.push([x + 0.5, Math.max(0, terrTop[i]), y + 0.5]); }
    }
    return out;
  }
  function airSlots(host, want, k0) {
    const n = sizeOf(host.key), cx = host.x + n / 2, cz = host.y + n / 2, out = [];
    // over the slip first (a shipyard), then round the host, the space side (+z on the bottom hull) first
    const ring = host.key === 'shipyard' ? [[0, 0], [0, 3.2], [-3.4, 1.6], [3.4, 1.6], [0, -3.4], [-3.6, -2], [3.6, -2]] : [[0, 3.4], [-3.2, 2.4], [3.2, 2.4], [-4.4, -0.5], [4.4, -0.5], [0, 6.2], [-3.6, 5.6], [3.6, 5.6]];
    for (let k = 0; k < want; k++) {
      const [dx, dz] = ring[(k + k0) % ring.length], lap = Math.floor((k + k0) / ring.length);
      const x = cx + dx + lap * 1.5, z = cz + dz + lap * 1.2, xi = Math.floor(x), zi = Math.floor(z);
      let top = 0;
      for (let j = zi - 1; j <= zi + 1; j++) for (let i = xi - 1; i <= xi + 1; i++) if (i >= 0 && j >= 0 && i < W && j < H) top = Math.max(top, topAt(i, j));
      out.push([x, Math.max(top, groundOf(host.x, host.y, n)) + 1.5 + 0.25 * (k % 2), z]);
    }
    return out;
  }

  // Which guardians show, and where: the first MAX_SHOWN (by state order) that have a host.
  function syncGuardians() {
    const list = (st.guardians || []).filter((g) => g && !(g.hp <= 0)).slice(0, MAX_SHOWN);
    const arsenals = finished('arsenal'), yards = finished('shipyard'), docks = finished('dock');
    const hostSig = [...arsenals, ...yards, ...docks].map((b) => `${b.id}@${b.x},${b.y}`).join(';');
    const sig = list.map((g) => `${g.id}:${g.type}:${Math.round((g.hp ?? 99) * 2)}`).join(',') + '|' + hostSig + '|' + (helpers.occSig ? helpers.occSig() : '');
    if (sig === guardSig) return;
    guardSig = sig;
    const old = new Map(guards.filter((a) => !a.ghost).map((a) => [a.id, a]));
    const groundWant = new Map(), airWant = new Map(), assign = [];
    let ai = 0;
    for (const g of list) {
      const cls = clsOf(g), ship = cls === 'ships';
      const host = ship ? yards[0] || docks[0] : arsenals.length ? arsenals[ai++ % arsenals.length] : docks[0];
      if (!host) continue;
      const m = ship ? airWant : groundWant;
      m.set(host, (m.get(host) || 0) + 1);
      assign.push([g, cls, host, ship]);
    }
    const taken = new Set(), slots = new Map();
    for (const [host, nWant] of groundWant) slots.set('g' + host.id, groundSlots(host, taken, nWant + 3));
    for (const [host, nWant] of airWant) slots.set('a' + host.id, airSlots(host, nWant + 3, 0));
    const used = new Map();
    const next = [];
    for (const [g, cls, host, ship] of assign) {
      const key = (ship ? 'a' : 'g') + host.id, arr = slots.get(key), k = used.get(key) || 0;
      if (k >= arr.length) continue;   // no room on the apron: this one stays in the hangar
      used.set(key, k + 1);
      const s = arr[k], hover = ship ? 0 : cls === 'planes' ? 0.28 : cls === 'hu' ? 0.02 : 0.01;
      const a = old.get(g.id) || { id: g.id, mode: 'idle', p: [s[0], s[1] + hover, s[2]], v: [0, 0, 0], hx: 0, hz: 1, ph: hash(g.id | 0, 7) * 6.28, cd: rnd() };
      const full = MACHINE[g.type]?.hp || 8;
      Object.assign(a, { cls, home: [s[0], s[1] + hover, s[2]], host: host.id, shade: 0.55 + 0.45 * Math.max(0, Math.min(1, (g.hp ?? full) / full)), ghost: false, dead: false });
      if (a.mode === 'idle') { a.p[0] = a.home[0]; a.p[1] = a.home[1]; a.p[2] = a.home[2]; }
      next.push(a);
    }
    // keep the ghosts of a fight in progress (lost guardians flying their last sortie)
    for (const a of guards) if (a.ghost && !a.dead) next.push(a);
    guards = next;
    ghostSlots = slots; ghostUsed = used;
  }
  let ghostSlots = new Map(), ghostUsed = new Map();

  // ---- smoke over damaged buildings ------------------------------------------------------------

  function syncEmitters() {
    emitters = [];
    for (const b of st.buildings || []) {
      if (!(b.damaged > 0) || b.build > 0 || b.key === 'road') continue;
      if (emitters.length >= CAP.emitters) break;
      const n = sizeOf(b.key);
      emitters.push({ id: b.id, x: b.x + n / 2, y: roofOf(b.x, b.y, n), z: b.y + n / 2, n, acc: rnd() * 0.2 });
    }
  }

  // ---- raid geometry ---------------------------------------------------------------------------

  function hullBox() {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    const t = st.map.t;
    for (let i = 0; i < W * H; i++) if (t[i] === T.HULL) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? [W * 0.2, H * 0.2, W * 0.8, H * 0.7] : [x0, y0, x1 + 1, y1 + 1];
  }
  // The point of the hull the raiders make for, outward direction, standoff, entry and battle points.
  function geometry(from) {
    const [x0, y0, x1, y1] = hull, side = sideOf(from);
    const cmd = (st.buildings || []).find((b) => b.key === 'command'), dock = finished('dock')[0];
    const cx = cmd ? cmd.x + 1.5 : (x0 + x1) / 2, cz = cmd ? cmd.y + 1.5 : (y0 + y1) / 2;
    const clampX = (x) => Math.max(x0 + 6, Math.min(x1 - 6, x)), clampZ = (z) => Math.max(y0 + 6, Math.min(y1 - 6, z));
    let hp, out;
    if (side === 'north') { hp = [clampX(cx), y0]; out = [0, -1]; }
    else if (side === 'east') { hp = [x1, clampZ(cz)]; out = [1, 0]; }
    else if (side === 'west') { hp = [x0, clampZ(cz)]; out = [-1, 0]; }
    else { hp = [clampX(dock ? dock.x + 1 : cx), y1]; out = [0, 1]; }
    const at = (d, y) => [hp[0] + out[0] * d, y, hp[1] + out[1] * d];
    let entry;
    if (side === 'north') entry = [hp[0], ALT.entry, -28];
    else if (side === 'east') entry = [W + 28, ALT.entry, hp[1]];
    else if (side === 'west') entry = [-28, ALT.entry, hp[1]];
    else entry = [hp[0], -7, Math.min(H - 6, Math.max(y1 + 30, H - 12))];   // up out of the atmosphere
    return { side, hp, out, lat: [-out[1], out[0]], battle: at(7, ALT.battle), standoff: at(17, ALT.standoff), entry, flee: side === 'earth' ? [hp[0], -12, H + 30] : at(80, ALT.entry + 6) };
  }
  // Raider count and capital ships: from the coming raid's units, else a guess by faction.
  function raiderMix(raid) {
    if (raid?.units?.length) {
      const ships = raid.units.filter((u) => MACHINE[u.type]?.cls === 'ships').length;
      const n = Math.max(2, Math.min(RAIDERS_MAX, raid.units.length));
      return { n, ships: Math.min(2, ships, n - 1) };
    }
    const f = String(raid?.faction || '');
    if (/remnant|directorate/i.test(f)) return { n: 11, ships: 2 };
    if (/union|galt|desert|warband/i.test(f)) return { n: 9, ships: 1 };
    if (/ashfall|cartel|pirate/i.test(f)) return { n: 6, ships: 0 };
    return { n: 3, ships: 0 };
  }

  function newEpisode(key, from, mix, atStandoff) {
    const G = geometry(from), raiders = [];
    for (let k = 0; k < mix.n; k++) {
      const row = Math.floor(Math.sqrt(k)), col = k - row * row - row;   // a wedge: 1, 3, 5 ... per row
      const ship = k >= mix.n - mix.ships;
      const off = [G.lat[0] * col * 1.7 + G.out[0] * row * 1.6, (k % 3) * 0.5 - 0.5 + (ship ? 1 : 0), G.lat[1] * col * 1.7 + G.out[1] * row * 1.6];
      const base = atStandoff ? G.standoff : G.entry;
      const p = [base[0] + off[0] + (atStandoff ? 0 : (rnd() - 0.5) * 3), base[1] + off[1], base[2] + off[2] + (atStandoff ? 0 : (rnd() - 0.5) * 3)];
      raiders.push({ kind: ship ? 'raidship' : 'raider', off, p, v: [0, 0, 0], hx: -G.out[0], hz: -G.out[1], pitch: 0, roll: 0, delay: atStandoff ? 0 : k * 0.18,
        ph: rnd() * 6.28, cd: 0.5 + rnd(), alive: true, gone: false, dieAt: Infinity, flee: false });
    }
    return { key, from: G.side, G, phase: 'approach', t: 0, ft: 0, raiders, outcome: null, targets: [] };
  }

  function startFight(report) {
    const won = !!report.won;
    const paid = !!report.tribute && !won && !(report.damaged?.length) && !(report.lostGuardians?.length);
    if (!ep || ep.from !== sideOf(report.from)) ep = newEpisode('r' + report.day, report.from, raiderMix(lastComing && sideOf(lastComing.from) === sideOf(report.from) ? lastComing : report), true);
    ep.phase = paid ? 'leave' : 'fight'; ep.ft = 0; ep.outcome = paid ? 'paid' : won ? 'won' : 'lost';
    stats.fights++;
    if (paid) { for (const r of ep.raiders) r.flee = true; return; }
    // who falls, and when
    const alive = ep.raiders;
    const kills = won ? Math.max(1, Math.ceil(alive.length * 0.55)) : Math.floor(alive.length * 0.2);
    const order = alive.map((r, k) => [r.kind === 'raidship' ? 1 + rnd() : rnd(), k]).sort((a, b) => a[0] - b[0]);
    order.slice(0, kills).forEach(([, k], j) => { alive[k].dieAt = 2.4 + (4.2 * j) / Math.max(1, kills - 1 || 1) + rnd() * 0.4; });
    // the guardians the colony lost fly their last sortie as ghosts
    const lost = (report.lostGuardians || []).slice(0, 6);
    const hosts = [...finished('arsenal'), ...finished('dock')];
    lost.forEach((type, j) => {
      const cls = clsOf({ type }), host = (cls === 'ships' ? finished('shipyard')[0] : null) || hosts[j % Math.max(1, hosts.length)];
      if (!host) return;
      let s = null;
      const key = (cls === 'ships' ? 'a' : 'g') + host.id, arr = ghostSlots.get(key), k = ghostUsed.get(key) || 0;
      if (arr && k < arr.length) { s = arr[k]; ghostUsed.set(key, k + 1); }
      if (!s) { const n = sizeOf(host.key); s = [host.x + n / 2 + (j - 2) * 0.8, roofOf(host.x, host.y, n) + 0.6, host.y + n + 1.2]; }
      // it scrambled with the others: start beside one already out, if any
      const wing = guards.find((a, k) => !a.dead && a.mode === 'sortie' && k % lost.length === j) || guards.find((a) => !a.dead && a.mode === 'sortie');
      const p = wing ? [wing.p[0] + (rnd() - 0.5) * 2, wing.p[1] + 0.6, wing.p[2] + (rnd() - 0.5) * 2] : [...s];
      guards.push({ id: 'ghost' + j, cls, ghost: true, dead: false, mode: wing && FLIERS.has(cls) ? 'sortie' : 'idle', home: [...s], p, v: [0, 0, 0], hx: 0, hz: 1, ph: rnd() * 6.28, cd: rnd(), shade: 1, dieAt: 3.2 + j * 1.1 + rnd() * 0.5 });
    });
    // the buildings hit (lost): their roofs, for the raiders' strafing runs
    ep.targets = [];
    if (!won) for (const id of report.damaged || []) {
      const b = (st.buildings || []).find((q) => q.id === id);
      if (!b) continue;
      const n = sizeOf(b.key);
      ep.targets.push({ id, x: b.x + n / 2, y: roofOf(b.x, b.y, n), z: b.y + n / 2, n, hit: false });
    }
    if (!ep.targets.length && !won) ep.targets.push({ id: 0, x: ep.G.hp[0], y: 2.6, z: ep.G.hp[1], n: 2, hit: false });
  }

  // ---- refresh: the state's raid and guardians to an episode and actors --------------------------

  function refresh(state, info = {}) {
    const fresh = info.reset || st !== state && (!st || state.map.w !== W || state.map.h !== H);
    st = state; W = state.map.w; H = state.map.h; terrTop = info.terrTop || terrTop;
    if (!terrTop) return;
    if (fresh || !hull || info.terrainChanged) hull = hullBox();
    if (info.reset) { played = new Set(); ep = null; lastComing = null; guardSig = ''; for (const a of guards) a.dead = true; guards = []; }
    syncGuardians();
    syncEmitters();
    drawn = false;
    const raid = state.raid, day = state.day | 0, coming = raid?.coming, last = raid?.last;
    edge = coming && (raid.warned !== false || coming.day - day <= 1) ? sideOf(coming.from) : null;
    if (coming) lastComing = coming;
    if (last && last.day === day && !played.has('r' + last.day + sideOf(last.from))) {
      played.add('r' + last.day + sideOf(last.from));
      startFight(last);
    } else if (coming && coming.day - day <= 1 && coming.day >= day - 1 && !played.has('r' + coming.day + sideOf(coming.from)) && !(last && last.day >= coming.day) && (!ep || ep.phase === 'done' || ep.phase === 'leave')) {
      ep = newEpisode('c' + coming.day, coming.from, raiderMix(coming), false);
    } else if (ep && (ep.phase === 'approach' || ep.phase === 'hold') && !coming) {
      ep.phase = 'leave'; ep.outcome = 'gone';                    // resolved with no report this day
      for (const r of ep.raiders) r.flee = true;
    }
  }

  // ---- weapons ----------------------------------------------------------------------------------

  function beam(a, b, rgb, w, life) {
    if (beams.length >= CAP.beams) return;
    beams.push({ a: [...a], b: [...b], rgb, w, life, max: life });
    sparks.spawn(a[0], a[1], a[2], 0, 0, 0, 0.12, w * 2.5, w * 4, rgb);   // muzzle flash
    sparks.spawn(b[0], b[1], b[2], 0, 0, 0, 0.2, w * 2, w * 6, FIRE[1]);
  }
  function missile(a, target, rgb, dur) {
    if (missiles.length > 60) return;
    const side = (rnd() - 0.5) * 6, up = 1.5 + rnd() * 2.5;
    missiles.push({ a: [...a], c: [a[0] + (rnd() - 0.5) * 3 + side * 0.3, a[1] + up, a[2] + (rnd() - 0.5) * 3 - side * 0.3], target, b: target.p ? [...target.p] : [target.x, target.y, target.z], t: 0, dur, rgb, acc: 0 });
  }
  function explode(x, y, z, size, smoky) {
    sparks.spawn(x, y, z, 0, 0, 0, 0.18, size * 0.4, size * 1.3, FIRE[0]);
    sparks.spawn(x, y, z, 0, 0.3, 0, 0.55, size * 0.6, size * 1.9, FIRE[2]);
    const n = Math.round(6 + size * 6);
    for (let k = 0; k < n; k++) {
      const th = rnd() * 6.28, ph = rnd() * 3.14 - 1.57, sp = (1.5 + rnd() * 3.5) * size;
      sparks.spawn(x, y, z, Math.cos(th) * Math.cos(ph) * sp, Math.sin(ph) * sp + 0.6, Math.sin(th) * Math.cos(ph) * sp, 0.35 + rnd() * 0.5, size * 0.18, size * 0.05, FIRE[1 + (k % 3)], 2.2);
    }
    if (smoky) for (let k = 0; k < 3 + size * 2; k++) smoke.spawn(x + (rnd() - 0.5) * size, y + rnd() * 0.3, z + (rnd() - 0.5) * size, (rnd() - 0.5) * 0.4, 0.4 + rnd() * 0.4, (rnd() - 0.5) * 0.4, 1.6 + rnd() * 1.4, size * 0.4, size * 1.4, SMOKE[k % 3], 0.6);
  }
  const posOf = (u) => (u.p ? u.p : [u.x, u.y, u.z]);
  function nearestAlive(list, p, range) {
    let best = null, bd = range * range;
    for (const u of list) {
      if (!u.alive && u.alive !== undefined) continue;
      if (u.dead || u.gone) continue;
      const q = posOf(u), d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2;
      if (d < bd && rnd() < 0.85) { bd = d; best = u; }
    }
    return best;
  }

  // ---- motion -----------------------------------------------------------------------------------

  // Steer toward a goal: arrive gently, bank into turns; heading follows velocity.
  function seek(a, goal, speed, dt, accel = 2.5) {
    const dx = goal[0] - a.p[0], dy = goal[1] - a.p[1], dz = goal[2] - a.p[2], d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const want = d > 1e-4 ? Math.min(speed, d * 1.6) / d : 0, k = Math.min(1, dt * accel);
    a.v[0] += (dx * want - a.v[0]) * k; a.v[1] += (dy * want - a.v[1]) * k; a.v[2] += (dz * want - a.v[2]) * k;
    a.p[0] += a.v[0] * dt; a.p[1] += a.v[1] * dt; a.p[2] += a.v[2] * dt;
    const h = Math.hypot(a.v[0], a.v[2]);
    if (h > 0.3) {
      const nx = a.v[0] / h, nz = a.v[2] / h, turn = a.hx * nz - a.hz * nx, e = Math.min(1, dt * 6);
      a.hx += (nx - a.hx) * e; a.hz += (nz - a.hz) * e;
      const l = Math.hypot(a.hx, a.hz) || 1; a.hx /= l; a.hz /= l;
      a.roll = (a.roll || 0) + (Math.max(-0.7, Math.min(0.7, turn * 4)) - (a.roll || 0)) * e;
    }
    a.pitch = Math.atan2(a.v[1], Math.max(0.5, h)) * 0.8;
    return d;
  }
  function faceToward(a, q, dt) {
    const dx = q[0] - a.p[0], dz = q[2] - a.p[2], l = Math.hypot(dx, dz);
    if (l < 1e-3) return;
    const e = Math.min(1, dt * 5);
    a.hx += (dx / l - a.hx) * e; a.hz += (dz / l - a.hz) * e;
    const n = Math.hypot(a.hx, a.hz) || 1; a.hx /= n; a.hz /= n;
  }

  function stepEpisode(dt) {
    const E = ep, G = E.G;
    E.t += dt;
    const fighting = E.phase === 'fight';
    if (fighting) E.ft += dt;
    const ft = E.ft;
    for (let k = 0; k < E.raiders.length; k++) {
      const r = E.raiders[k];
      if (!r.alive || r.gone) continue;
      if (E.t < r.delay) continue;
      const wob = [Math.sin(clock * 0.9 + r.ph) * 1.2, Math.sin(clock * 1.3 + r.ph * 2) * 0.5, Math.cos(clock * 0.7 + r.ph) * 1.2];
      let goal, sp = SPEED.raider * (r.kind === 'raidship' ? 0.6 : 1);
      if (r.flee) { goal = G.flee.map((v, j) => v + r.off[j] * 2); sp = SPEED.flee * (r.kind === 'raidship' ? 0.6 : 1); }
      else if (E.phase === 'approach' || E.phase === 'hold') goal = [G.standoff[0] + r.off[0] + wob[0], G.standoff[1] + r.off[1] + wob[1], G.standoff[2] + r.off[2] + wob[2]];
      else if (fighting && E.outcome === 'lost' && ft > 3 && E.targets.length) {
        const tg = E.targets[k % E.targets.length];
        goal = [tg.x + Math.cos(clock * 1.4 + r.ph) * 2.2, tg.y + 2.2 + (r.kind === 'raidship' ? 2 : 0), tg.z + Math.sin(clock * 1.4 + r.ph) * 2.2];
        sp *= 1.6;
      } else {
        const push = fighting ? Math.min(1, ft / 3) : 0;
        const c = [G.battle[0] + G.out[0] * 4 * (1 - push * 0.6), G.battle[1], G.battle[2] + G.out[1] * 4 * (1 - push * 0.6)];
        goal = [c[0] + r.off[0] * 0.8 + wob[0] * 1.6, c[1] + r.off[1] + wob[1], c[2] + r.off[2] * 0.8 + wob[2] * 1.6];
      }
      seek(r, goal, sp, dt, r.kind === 'raidship' ? 1.2 : 2.5);
      if (r.flee && Math.abs(r.p[0] - W / 2) > W / 2 + 25 || r.flee && (r.p[2] < -25 || r.p[2] > H + 25)) r.gone = true;
      if (fighting && ft >= r.dieAt) { r.alive = false; explode(r.p[0], r.p[1], r.p[2], r.kind === 'raidship' ? 2.4 : 1.3, true); }
      // raiders fire: at guardians in range, at the hull's buildings once they reach them (lost)
      if (fighting && !r.flee && ft > 1) {
        r.cd -= dt;
        if (r.cd <= 0) {
          r.cd = 0.55 + rnd() * 0.8;
          const muzzle = [r.p[0] + r.hx * 0.4, r.p[1], r.p[2] + r.hz * 0.4];
          const bt = E.outcome === 'lost' && ft > 3 && E.targets.length ? E.targets[k % E.targets.length] : null;
          const over = bt && Math.hypot(bt.x - r.p[0], bt.z - r.p[2]) < 6;
          const tg = over ? bt : nearestAlive(guards, r.p, 16);
          if (tg) {
            const q = posOf(tg), aim = [q[0] + (rnd() - 0.5) * 0.6, q[1] + 0.25 + rnd() * 0.2, q[2] + (rnd() - 0.5) * 0.6];
            if (r.kind === 'raidship' && rnd() < 0.5) missile(muzzle, tg, BEAM_RGB.raider, 0.9);
            else beam(muzzle, aim, BEAM_RGB.raider, r.kind === 'raidship' ? 0.12 : 0.07, 0.16);
            if (over) { tg.hit = true; if (rnd() < 0.5) explode(aim[0], aim[1], aim[2], 0.7, true); }
          }
        }
      }
    }
    // the fight's arc
    if (fighting) {
      if (E.outcome === 'won' && ft > 6.6) for (const r of E.raiders) if (r.alive) r.flee = true;
      if (E.outcome === 'lost' && ft > 8.3) for (const r of E.raiders) if (r.alive) r.flee = true;
      if (E.outcome === 'lost') for (const tg of E.targets) if ((tg.hit || ft > 7.2) && !tg.flashed) {
        tg.flashed = true;
        if (flashes.length < CAP.flashes) flashes.push({ x: tg.x, y: tg.y, z: tg.z, n: tg.n, t: 0, dur: 3.6 });
        explode(tg.x, tg.y + 0.3, tg.z, 1.3, true);
        if (!emitters.some((e) => e.id === tg.id) && emitters.length < CAP.emitters) emitters.push({ id: tg.id, x: tg.x, y: tg.y, z: tg.z, n: tg.n, acc: 0 });
      }
      if (ft >= FIGHT_S) { E.phase = 'leave'; for (const r of E.raiders) if (r.alive) r.flee = true; }
    } else if (E.phase === 'approach' && (E.t > 12 || E.raiders.every((r) => E.t > r.delay && Math.hypot(r.p[0] - G.standoff[0] - r.off[0], r.p[2] - G.standoff[2] - r.off[2]) < 3.5))) E.phase = 'hold';
    if ((E.phase === 'leave' || fighting) && E.raiders.every((r) => !r.alive || r.gone) && guards.every((a) => a.mode === 'idle' || a.dead)) E.phase = 'done';
  }

  function stepGuards(dt) {
    const E = ep, fighting = E && E.phase === 'fight', G = E?.G;
    for (let k = 0; k < guards.length; k++) {
      const a = guards[k];
      if (a.dead) continue;
      const flier = FLIERS.has(a.cls);
      // the fliers scramble as soon as raiders show (a second or so after), and meet them in the fight
      const alert = E && (E.phase === 'approach' || E.phase === 'hold') && E.t > 1 + (k % 6) * 0.2;
      if ((alert || fighting && E.ft > 0.2 + (k % 6) * 0.12) && a.mode !== 'sortie' && flier && !a.dead) a.mode = 'sortie';
      if (!fighting && !alert && a.mode === 'sortie') a.mode = 'return';
      if (a.mode === 'sortie') {
        const lat = (k % 7) - 3, ring = Math.sin(clock * 1.1 + a.ph) * 1.2;
        // hold a screen between the hull and the raiders, then push out to meet them
        const c = G.battle, back = (a.cls === 'ships' ? 3.5 : 0.5) + (fighting ? -Math.min(1, E.ft / 3) * 2.5 : 1.5);
        const goal = [c[0] - G.out[0] * back + G.lat[0] * lat * 1.5 + ring, c[1] - 0.8 + (k % 3) * 0.7 + (a.cls === 'ships' ? 1.2 : 0), c[2] - G.out[1] * back + G.lat[1] * lat * 1.5 + Math.cos(clock * 0.9 + a.ph) * 1.2];
        const far = Math.hypot(goal[0] - a.p[0], goal[2] - a.p[2]) > 12;
        seek(a, goal, far ? SPEED.scramble * (a.cls === 'ships' ? 0.6 : 1) : a.cls === 'ships' ? SPEED.ship : SPEED.guardian, dt, a.cls === 'ships' ? 1.2 : 3);
      } else if (a.mode === 'return') {
        const far = Math.hypot(a.home[0] - a.p[0], a.home[2] - a.p[2]) > 12;
        if (seek(a, a.home, far ? SPEED.scramble * (a.cls === 'ships' ? 0.6 : 1) : SPEED.ret, dt, 3) < 0.08) { a.mode = 'idle'; a.v = [0, 0, 0]; a.pitch = 0; a.roll = 0; }
      } else {
        // idle: a gentle bob on the apron, facing the camera's side (+z); ships hover and sway
        const bob = a.cls === 'ships' ? 0.12 : a.cls === 'planes' ? 0.06 : a.cls === 'hu' ? 0.025 : 0.012;
        a.p[0] = a.home[0]; a.p[1] = a.home[1] + bob * Math.sin(clock * 1.6 + a.ph); a.p[2] = a.home[2];
        const yaw = a.cls === 'ships' ? 0.2 * Math.sin(clock * 0.3 + a.ph) : 0.25 * Math.sin(a.ph * 3);
        const tx = a.cls === 'ships' ? Math.cos(yaw) : Math.sin(yaw), tz = a.cls === 'ships' ? Math.sin(yaw) : Math.cos(yaw);
        if (!fighting || flier) { a.hx += (tx - a.hx) * Math.min(1, dt * 3); a.hz += (tz - a.hz) * Math.min(1, dt * 3); const l = Math.hypot(a.hx, a.hz) || 1; a.hx /= l; a.hz /= l; }
        a.pitch = 0; a.roll = 0;
      }
      if (a.ghost && fighting && E.ft >= a.dieAt) { a.dead = true; explode(a.p[0], a.p[1], a.p[2], a.cls === 'ships' ? 2.2 : 1.2, true); continue; }
      // fire at raiders in range (ground units too, from the apron)
      if (fighting && E.ft > 0.8 && E.ft < FIGHT_S - 0.6) {
        a.cd -= dt;
        const range = flier ? 14 : 40;
        if (a.cd <= 0) {
          a.cd = (a.cls === 'ships' ? 0.9 : 0.45) + rnd() * 0.6;
          const tg = nearestAlive(E.raiders.filter((r) => !r.flee || E.outcome !== 'won'), a.p, range);
          if (tg) {
            if (!flier) faceToward(a, tg.p, 1);
            const top = a.cls === 'hu' ? 0.5 : a.cls === 'armour' ? 0.3 : a.cls === 'support' ? 0.32 : 0;
            const muzzle = [a.p[0] + a.hx * 0.3, a.p[1] + top, a.p[2] + a.hz * 0.3];
            const aim = [tg.p[0] + (rnd() - 0.5) * 0.8, tg.p[1] + (rnd() - 0.5) * 0.4, tg.p[2] + (rnd() - 0.5) * 0.8];
            if (a.cls === 'planes' || (a.cls === 'support' && rnd() < 0.6)) { missile(muzzle, tg, BEAM_RGB[a.cls], 0.8 + rnd() * 0.4); if (a.cls === 'planes') missile(muzzle, tg, BEAM_RGB[a.cls], 0.9 + rnd() * 0.4); }
            else beam(muzzle, aim, BEAM_RGB[a.cls], a.cls === 'ships' ? 0.16 : 0.07, a.cls === 'ships' ? 0.3 : 0.15);
          }
        }
      }
    }
    if (!fighting) guards = guards.filter((a) => !a.ghost || !a.dead && a.mode !== 'idle');
  }

  // Battery Emplacements near the fight: Dragon railgun bolts, Hydra missile salvos.
  const empCd = new Map();
  function stepEmplacements(dt) {
    if (!ep || ep.phase !== 'fight' || ep.ft < 0.6 || ep.ft > FIGHT_S - 0.6) return;
    for (const b of finished('emplacement')) {
      if (b.damaged > 0 || b.off) continue;
      const p = [b.x + 0.5, roofOf(b.x, b.y, 1) - 0.1, b.y + 0.5];
      if (Math.hypot(p[0] - ep.G.battle[0], p[2] - ep.G.battle[2]) > 45) continue;
      const cd = (empCd.get(b.id) ?? rnd()) - dt;
      if (cd > 0) { empCd.set(b.id, cd); continue; }
      const tg = nearestAlive(ep.raiders.filter((r) => !r.flee), p, 48);
      if (b.mode === 'hydra') { empCd.set(b.id, 1.6 + rnd() * 0.5); if (tg) for (let k = 0; k < 3; k++) missile(p, tg, BEAM_RGB.support, 0.9 + k * 0.15); }
      else { empCd.set(b.id, 1.3 + rnd() * 0.5); if (tg) { beam(p, [...tg.p], BEAM_RGB.dragon, 0.14, 0.22); sparks.spawn(tg.p[0], tg.p[1], tg.p[2], 0, 0, 0, 0.3, 0.3, 1.1, FIRE[0]); } }
    }
  }

  function stepMissiles(dt) {
    for (let i = 0; i < missiles.length;) {
      const m = missiles[i];
      m.t += dt;
      if (m.target.p && !m.target.dead && m.target.alive !== false) { m.b[0] = m.target.p[0]; m.b[1] = m.target.p[1]; m.b[2] = m.target.p[2]; }
      const u = Math.min(1, m.t / m.dur), w = 1 - u;
      const x = w * w * m.a[0] + 2 * w * u * m.c[0] + u * u * m.b[0], y = w * w * m.a[1] + 2 * w * u * m.c[1] + u * u * m.b[1], z = w * w * m.a[2] + 2 * w * u * m.c[2] + u * u * m.b[2];
      m.acc += dt;
      while (m.acc > 0.025) { m.acc -= 0.025; sparks.spawn(x, y, z, (rnd() - 0.5) * 0.2, 0.1, (rnd() - 0.5) * 0.2, 0.45, 0.09, 0.22, m.rgb); }
      sparks.spawn(x, y, z, 0, 0, 0, 0.04, 0.16, 0.16, FIRE[0]);
      if (u >= 1) { explode(x, y, z, 0.6, false); missiles[i] = missiles[missiles.length - 1]; missiles.pop(); continue; }
      i++;
    }
  }

  function stepSmoke(dt) {
    for (const e of emitters) {
      e.acc += dt;
      const every = 0.16 / Math.sqrt(e.n);
      while (e.acc > every) {
        e.acc -= every;
        const s = 0.3 + 0.2 * Math.sqrt(e.n);
        smoke.spawn(e.x + (rnd() - 0.5) * e.n * 0.5, e.y + 0.05, e.z + (rnd() - 0.5) * e.n * 0.5, 0.18 + (rnd() - 0.5) * 0.1, 0.55 + rnd() * 0.35, 0.08 + (rnd() - 0.5) * 0.1, 2.4 + rnd() * 1.1, s, s * 2.6, SMOKE[(rnd() * 3) | 0], 0.15);
        if (rnd() < 0.3) sparks.spawn(e.x + (rnd() - 0.5) * e.n * 0.4, e.y + 0.1, e.z + (rnd() - 0.5) * e.n * 0.4, (rnd() - 0.5) * 0.3, 0.8 + rnd() * 0.6, (rnd() - 0.5) * 0.3, 0.9 + rnd() * 0.5, 0.08, 0.03, FIRE[2]);
      }
    }
  }

  // ---- drawing ----------------------------------------------------------------------------------

  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(0, 0, 0, 'YZX'), v4 = new THREE.Vector3(), s4 = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), d4 = new THREE.Vector3();
  function put(kind, a, rgb) {
    const mesh = meshes[kind], i = mesh.count;
    if (i >= mesh.instanceMatrix.count) return;
    mesh.count++;
    e4.set(a.roll || 0, Math.atan2(-a.hz, a.hx), a.pitch || 0, 'YZX');
    const k = SCALE[kind];
    m4.compose(v4.set(a.p[0], a.p[1], a.p[2]), q4.setFromEuler(e4), s4.set(k, k, k)).toArray(mesh.instanceMatrix.array, i * 16);
    if (rgb) mesh.instanceColor.array.set(rgb, i * 3);
  }
  const shadeRgb = [0, 0, 0];
  function draw() {
    for (const m of Object.values(meshes)) m.count = 0;
    for (const a of guards) {
      if (a.dead) continue;
      const c = CLS_RGB[a.cls], s = a.shade ?? 1;
      shadeRgb[0] = c[0] * s; shadeRgb[1] = c[1] * s; shadeRgb[2] = c[2] * s;
      put(a.cls, a, shadeRgb);
    }
    if (ep) for (const r of ep.raiders) if (r.alive && !r.gone && ep.t >= r.delay) put(r.kind, r, null);
    for (const m of Object.values(meshes)) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
    // beams: unit boxes stretched from a to b, fading out
    const A = beamMesh.instanceMatrix.array, C = beamMesh.instanceColor.array;
    let n = 0;
    for (const b of beams) {
      d4.set(b.b[0] - b.a[0], b.b[1] - b.a[1], b.b[2] - b.a[2]);
      const len = d4.length();
      if (len < 1e-3) continue;
      const k = b.life / b.max;
      q4.setFromUnitVectors(X, d4.multiplyScalar(1 / len));
      m4.compose(v4.set((b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2, (b.a[2] + b.b[2]) / 2), q4, s4.set(len, b.w * (0.5 + 0.5 * k), b.w * (0.5 + 0.5 * k))).toArray(A, n * 16);
      C[n * 3] = b.rgb[0] * (0.4 + 1.2 * k); C[n * 3 + 1] = b.rgb[1] * (0.4 + 1.2 * k); C[n * 3 + 2] = b.rgb[2] * (0.4 + 1.2 * k);
      n++;
    }
    beamMesh.count = n; beamMesh.instanceMatrix.needsUpdate = true; beamMesh.instanceColor.needsUpdate = true;
    // red flashes over the buildings the raiders hit
    const FA = flashMesh.instanceMatrix.array, FC = flashMesh.instanceColor.array;
    n = 0;
    for (const f of flashes) {
      const u = f.t / f.dur, k = (1 - u) * (0.55 + 0.45 * Math.sin(f.t * 14)) * 0.9;
      m4.compose(v4.set(f.x, f.y / 2 + 0.1, f.z), q4.identity(), s4.set(f.n * 1.04, f.y + 0.4, f.n * 1.04)).toArray(FA, n * 16);
      FC[n * 3] = k; FC[n * 3 + 1] = k * 0.16; FC[n * 3 + 2] = k * 0.08;
      n++;
    }
    flashMesh.count = n; flashMesh.instanceMatrix.needsUpdate = true; flashMesh.instanceColor.needsUpdate = true;
    sparks.draw(); smoke.draw();
  }

  // ---- the frame --------------------------------------------------------------------------------

  // One step of view time (already scaled by the speed).
  function step(dt) {
    if (!st || !terrTop) return;
    clock += dt;
    if (dt > 0) {
      if (ep && ep.phase !== 'done') stepEpisode(dt);
      else if (ep && ep.phase === 'done') ep = null;
      stepGuards(dt);
      stepEmplacements(dt);
      stepMissiles(dt);
      stepSmoke(dt);
      for (let i = 0; i < beams.length;) { beams[i].life -= dt; if (beams[i].life <= 0) { beams[i] = beams[beams.length - 1]; beams.pop(); } else i++; }
      for (let i = 0; i < flashes.length;) { flashes[i].t += dt; if (flashes[i].t >= flashes[i].dur) { flashes[i] = flashes[flashes.length - 1]; flashes.pop(); } else i++; }
      sparks.step(dt); smoke.step(dt);
    }
    draw();
  }
  let speed = 1, drawn = false;
  function update(dtReal, sp = speed) {
    speed = sp;
    const dt = Math.min(0.1, dtReal) * sp;
    if (!dt && drawn) return;                         // paused: everything holds still
    step(dt);
    drawn = true;
  }

  // Minimap marks: raiders (red), guardians (blue), and the coming raid's side.
  function marks() {
    const raiders = [], gs = [];
    if (ep) for (const r of ep.raiders) if (r.alive && !r.gone && ep.t >= r.delay && r.p[0] > -2 && r.p[2] > -2 && r.p[0] < W + 2 && r.p[2] < H + 2) raiders.push(r.p[0], r.p[2]);
    for (const a of guards) if (!a.dead) gs.push(a.p[0], a.p[2]);
    return { raiders, guardians: gs, edge: edge || (ep && ep.phase !== 'done' && ep.phase !== 'leave' ? ep.from : null) };
  }

  function stats_() {
    const live = ep ? ep.raiders.filter((r) => r.alive && !r.gone && ep.t >= r.delay).length : 0;
    return { guardians: guards.filter((a) => !a.dead && !a.ghost).length, ghosts: guards.filter((a) => a.ghost && !a.dead).length, sortie: guards.filter((a) => a.mode !== 'idle' && !a.dead).length,
      raid: ep ? { from: ep.from, phase: ep.phase, outcome: ep.outcome, t: +ep.t.toFixed(2), ft: +ep.ft.toFixed(2), raiders: live, of: ep.raiders.length, targets: ep.targets.length } : null,
      edge, beams: beams.length, missiles: missiles.length, sparks: sparks.n, smoke: smoke.n, emitters: emitters.length, flashes: flashes.length, fights: stats.fights };
  }

  function reset() {
    st = null; ep = null; played = new Set(); lastComing = null; guards = []; guardSig = ''; emitters = []; edge = null; hull = null;
    beams.length = 0; missiles.length = 0; flashes.length = 0; sparks.n = 0; smoke.n = 0; drawn = false;
  }

  function dispose() {
    parent.remove(group);
    for (const m of group.children) m.dispose?.();
    for (const g of Object.values(geos)) g.dispose();
    ball.dispose(); boxGeo.dispose();
    for (const m of [mat, sparkMat, beamMat, flashMat, smokeMat]) m.dispose();
  }

  return {
    refresh, update, reset, dispose, marks, stats: stats_, group,
    // tests: n seconds of view time now, in steps of h (ignores the speed)
    advance(sec, h = 1 / 30) { for (let t = 0; t < sec - 1e-9; t += h) step(Math.min(h, sec - t)); },
    // the raiders' positions and the battle point (tests)
    raiders: () => (ep ? { battle: ep.G.battle.map((v) => +v.toFixed(1)), standoff: ep.G.standoff.map((v) => +v.toFixed(1)), list: ep.raiders.filter((r) => r.alive && !r.gone).map((r) => r.p.map((v) => +v.toFixed(2))) } : null),
    // the guardians' positions (tests)
    positions: () => guards.filter((a) => !a.dead).map((a) => ({ id: a.id, cls: a.cls, mode: a.mode, ghost: !!a.ghost, p: a.p.map((v) => +v.toFixed(2)), home: a.home.map((v) => +v.toFixed(2)) })),
  };
}
