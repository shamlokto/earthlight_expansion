// The colony's 3D view (docs/COLONY-V1.md "view3d/view.js", docs/COLONY.md §6): draws the pure
// state with three.js and reports tiles under the pointer. It keeps no game rules.
//   * terrain: one InstancedMesh per terrain type (a box column per tile, heights from terrain.js
//     plus a little noise), per-instance colour for chamber status and overlays
//   * buildings: parametric kits (kits.js) packed into one InstancedMesh per shape and material,
//     so a whole colony is a handful of draw calls; refresh() diffs and swaps only what changed
//   * Earth: a big (flattened) sphere beyond the bottom edge, its curve under the atmosphere band
//   * camera: OrbitControls (rotate, tilt, zoom to cursor, right-drag / arrow-key pan), optional
//     90° snap; picking walks the tile grid along the pointer ray, so it costs nothing per move
// Art slots (js/colony/art.js, docs/COLONY.md §7): terrain/<key> textures the tile tops and
// sky/earth-below the Earth when present; otherwise everything is procedural.
import * as THREE from 'three';
import { OrbitControls } from '../../vendor/three/addons/OrbitControls.js';
import { TERRAIN, T, R } from '../data/terrain.js';
import { BUILDING, DOCK_REACH } from '../data/buildings.js';
import { kitParts, kitHeight } from './kits.js';

const BASE = -0.6;                       // tile columns start here, so steps in height show sides
const PICK_LO = -1.5;
const SEALED_RGB = [0.012, 0.014, 0.022];
const BREACH_HOT = [1.0, 0.32, 0.1], BREACH_DIM = [0.09, 0.05, 0.045];
const BUILD_RGB = new THREE.Color('#6fd8ff');
const QUARTER = Math.PI / 2;

// Deterministic per-tile noise: a hash and a smooth value noise, so the land reads organic.
const hash = (x, y) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smooth = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const soil = (x, y) => [0.12 + 0.08 * smooth(x / 5, y / 5), 0.82 + 0.28 * smooth(x / 7 + 31, y / 7) + 0.08 * hash(x, y)];

// key → (x, y) → [top height, brightness]; `earth` is never drawn (the sphere is Earth).
const SHAPE = {
  void: (x, y) => [-0.04, 0.7 + 0.6 * smooth(x / 9, y / 9)],
  asteroid: (x, y) => [0.04, 0.8 + 0.4 * hash(x, y)],
  magnetic: (x, y) => [0.05, 0.7 + 0.45 * (0.5 + 0.5 * Math.sin((x + y) * 1.2))],   // field lines across the belt
  meteoroid: (x, y) => [0.03, 0.8 + 0.4 * hash(x, y)],
  comet: (x, y) => [0.1, 0.8 + 0.35 * smooth(x / 3, y / 3)],
  plasma: (x, y) => [0.05, 0.65 + 0.55 * smooth(x / 4, y / 4)],
  gravity: (x, y) => [-0.2, 0.7 + 0.45 * (0.5 + 0.5 * Math.sin((x - y) * 0.8))],
  atmosphere: () => [0, 1],
  hull: (x, y) => [2.5, ((x >> 1) + (y >> 1)) & 1 ? 1 : 0.88],
  bulkhead: (x, y) => [2.0, 0.92 + 0.12 * hash(x, y)],
  gate: () => [0.3, 1],
  deck: (x, y) => [0.1, (x + y) & 1 ? 1 : 0.9],
  plain: soil, fertile: soil, poor: soil,
  river: () => [-0.35, 1], lake: () => [-0.35, 1],
  forest: (x, y) => [0.35 + 0.4 * hash(x, y), 0.65 + 0.5 * hash(x + 7, y)],
  hills: (x, y) => [0.3 + 0.9 * smooth(x / 4, y / 4), 0.85 + 0.3 * hash(x, y)],
  rock: (x, y) => [0.4 + 0.25 * hash(x, y), 0.8 + 0.4 * hash(x + 7, y)],
  marsh: (x, y) => [0.02 + 0.04 * hash(x, y), 0.8 + 0.4 * smooth(x / 3, y / 3)],
  rubble: (x, y) => [0.2 + 0.4 * hash(x, y), 0.6 + 0.6 * hash(x + 7, y)],
  breach: () => [0.2, 1],
};
// Tile-top colours that differ from terrain.js (whose colour then goes to the rocks or water).
const TOP_COLOR = { asteroid: '#2c2622', meteoroid: '#27221f', river: '#1b3049', lake: '#182c44' };
const GLOW_TERRAIN = new Set(['plasma', 'breach']);   // unlit: plasma glows, breaches burn

const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const TERRAIN_RGB = TERRAIN.map((d) => lin(TOP_COLOR[d.key] || d.color));
const RAMP = [lin('#2a5fd0'), lin('#2fd08a'), lin('#ffe14a')];

// Unit shapes, each spanning [-0.5, 0.5]³, so a part's size is its scale.
function unitGeometries() {
  const dome = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 2, 1).translate(0, -0.5, 0);
  const torus = new THREE.TorusGeometry(0.4, 0.1, 8, 24).rotateX(Math.PI / 2).scale(1, 5, 1);
  return {
    box: new THREE.BoxGeometry(1, 1, 1), cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    cone: new THREE.ConeGeometry(0.5, 1, 16), dome, torus,
  };
}

// A tile column: a unit box standing on y = 0, without its bottom face (never seen).
function columnGeometry() {
  const g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), idx = Array.from(g.index.array);
  idx.splice(18, 6);   // BoxGeometry groups: +x, -x, +y, -y, +z, -z; drop -y
  g.setIndex(idx); g.clearGroups();
  return g;
}

// Instances of one shape and material shared by every building; parts are added per building id
// and removed by swapping the last instance into the hole, so a change touches only its own slots.
class Pool {
  constructor(geo, mat, parent) { Object.assign(this, { geo, mat, parent, owner: [], slots: new Map(), dirty: false }); this.grow(256); }
  grow(cap) {
    const old = this.mesh, mesh = new THREE.InstancedMesh(this.geo, this.mat, cap);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = old ? old.count : 0;
    if (old) {
      mesh.instanceMatrix.array.set(old.instanceMatrix.array);
      mesh.instanceColor.array.set(old.instanceColor.array);
      this.parent.remove(old); old.dispose();
    }
    this.parent.add(mesh); this.mesh = mesh; this.cap = cap;
  }
  add(id, m, rgb) {
    if (this.mesh.count === this.cap) this.grow(this.cap * 2);
    const i = this.mesh.count++;
    m.toArray(this.mesh.instanceMatrix.array, i * 16);
    this.mesh.instanceColor.array.set(rgb, i * 3);
    this.owner[i] = id;
    if (!this.slots.has(id)) this.slots.set(id, []);
    this.slots.get(id).push(i);
    this.dirty = true;
  }
  remove(id) {
    const s = this.slots.get(id);
    if (!s) return;
    this.slots.delete(id);
    const M = this.mesh.instanceMatrix.array, C = this.mesh.instanceColor.array;
    for (const i of s.sort((a, b) => b - a)) {   // highest first, so `last` is never one of ours
      const last = --this.mesh.count;
      if (i === last) continue;
      M.copyWithin(i * 16, last * 16, last * 16 + 16);
      C.copyWithin(i * 3, last * 3, last * 3 + 3);
      const o = this.owner[last], os = this.slots.get(o);
      this.owner[i] = o; os[os.indexOf(last)] = i;
    }
    this.dirty = true;
  }
  clear() { this.slots.clear(); this.owner.length = 0; this.mesh.count = 0; this.dirty = true; }
  flush() {
    if (!this.dirty) return;
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true; this.dirty = false;
  }
}

// Earth's texture when there is no art: ocean, value-noise continents with green and desert, clouds.
function earthTexture() {
  const w = 512, h = 256, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const fbm = (x, y, o) => { let s = 0, a = 0.5, f = 1; for (let k = 0; k < o; k++) { s += a * smooth(x * f, y * f); a *= 0.5; f *= 2; } return s; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / 32, v = y / 32, land = fbm(u, v, 5), cloud = fbm(u * 1.6 + 40, v * 3 + 9, 4), lat = Math.abs(y / h - 0.5) * 2;
    let c = land > 0.56 ? (fbm(u + 20, v, 3) > 0.5 ? [150, 130, 80] : [60, 110, 50]) : [18 + 30 * land, 60 + 70 * land, 140 + 60 * land];
    if (lat > 0.85) c = [230, 240, 250];
    const k = Math.max(0, (cloud - 0.52) * 3.2);
    const o = (y * w + x) * 4;
    for (let j = 0; j < 3; j++) d[o + j] = c[j] + (245 - c[j]) * Math.min(1, k);
    d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// Soft limb glow: brightest where the line of sight grazes the surface. `back` draws the halo
// outside the planet (a bigger shell seen from behind), front draws the haze over its rim.
function glowMaterial(color, back, power, strength) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, power: { value: power }, strength: { value: strength } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; uniform float power; uniform float strength; varying vec3 vN; varying vec3 vV;
      void main() { float d = dot(normalize(vN), normalize(vV));
        float g = ${back ? 'pow(clamp(-d * 2.2, 0.0, 1.0), power) * smoothstep(0.0, 0.08, -d)' : 'pow(1.0 - clamp(d, 0.0, 1.0), power)'};
        gl_FragColor = vec4(color * g * strength, 1.0); }`,
    side: back ? THREE.BackSide : THREE.FrontSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
}

function starfield(cx, cz) {
  const n = 4000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = hash(i, 1) * 2 - 1, a = hash(i, 2) * Math.PI * 2, r = Math.sqrt(1 - u * u), b = 0.35 + 0.65 * hash(i, 3) ** 3;
    pos.set([cx + 2200 * r * Math.cos(a), 2200 * u, cz + 2200 * r * Math.sin(a)], i * 3);
    const tint = hash(i, 4);
    col.set(tint < 0.2 ? [b * 0.7, b * 0.8, b] : tint > 0.9 ? [b, b * 0.85, b * 0.6] : [b, b, b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false }));
}

// Tile tops sample a texture by world position (four tiles per repeat), so seamless art does not
// show a grid. Applies only to materials with a map.
function worldUv(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      #ifdef USE_MAP
        vMapUv = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xz * 0.25;
      #endif`);
  };
  return mat;
}

export function createView(container, opts = {}) {
  const { onTileClick = () => {}, onTileHover = () => {} } = opts;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  canvas.tabIndex = 0;
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#010205');
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 6000);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, {
    enableDamping: true, dampingFactor: 0.12, screenSpacePanning: false, zoomToCursor: true,
    minDistance: 6, minPolarAngle: 0.02, maxPolarAngle: 1.22,   // never below the map's horizon
  });
  controls.keys = {};   // our own key handler pans (it ignores text fields)

  scene.add(new THREE.HemisphereLight('#c8d4ff', '#1a2233', 2.2));
  const sun = new THREE.DirectionalLight('#fff1dc', 2.6), earthlight = new THREE.DirectionalLight('#5f9fff', 0.9);
  scene.add(sun, sun.target, earthlight, earthlight.target);

  const terrainGroup = new THREE.Group(), buildGroup = new THREE.Group(), fxGroup = new THREE.Group();
  scene.add(terrainGroup, buildGroup, fxGroup);
  const UNIT = unitGeometries(), COLUMN = columnGeometry();
  const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const ROCK = new THREE.IcosahedronGeometry(0.5, 0), GEM = new THREE.OctahedronGeometry(0.5);

  // Building materials by kind: lit parts, unlit glow, and the hologram of a building under construction.
  const KIND_MAT = {
    solid: new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial(),
    build: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.18, depthWrite: false }),
    wire: new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.55, depthWrite: false }),
  };
  const pools = new Map();
  const pool = (shape, kind) => {
    const k = shape + ':' + kind;
    if (!pools.has(k)) pools.set(k, new Pool(UNIT[shape] || UNIT.box, KIND_MAT[kind], buildGroup));
    return pools.get(k);
  };

  let st = null, W = 0, H = 0, N = 0, tCopy = null, rCopy = null;
  let meshes = [], slot = null, waterMesh = null, waterSlot = null, terrTop = null, tops = null, baseRgb = null;
  let rockMesh = null, gemMesh = null, wreckMesh = null, breachMat = null, plasmaMat = null;
  let occ = null;                                     // building id + 1 per tile, 0 = free
  const chamberSig = new Map(), chamberById = new Map(), built = new Map();
  let breachOwners = new Map();
  let overlay = null, overlayName = null, overlayValues = null;
  const textured = new Map(), dirty = new Set();   // terrain id → texture from the art slots
  let artMod = opts.art || null;
  let earthMat = null;

  // ---- colours -------------------------------------------------------------------------------

  const statusOf = (c) => (c === 255 ? null : chamberById.get(c));
  function breachKnown(i) {
    const owners = breachOwners.get(i);
    if (!owners) return null;   // not listed any more: patched
    return owners.some((id) => chamberById.get(id)?.status !== 'sealed');
  }
  // Linear RGB of tile i into out[o..o+2]: base colour, chamber status, then the overlay.
  function tileRgb(i, out, o, src = baseRgb, so = i * 3) {
    let r = src[so], g = src[so + 1], b = src[so + 2];
    if (st.map.t[i] === T.BREACH) {
      const k = breachKnown(i);
      [r, g, b] = k ? BREACH_HOT : k === null ? [0.2, 0.2, 0.22] : BREACH_DIM;
    } else {
      const ch = statusOf(st.map.ch[i]);
      if (ch && ch.status === 'sealed') { r = r * 0.1 + SEALED_RGB[0]; g = g * 0.1 + SEALED_RGB[1]; b = b * 0.1 + SEALED_RGB[2]; }
      else if (ch && ch.status !== 'open') {
        // airless: blue-grey; pressurising floods colour back in as its days run out
        const l = 0.3 * r + 0.59 * g + 0.11 * b, keep = ch.status === 'pressurising' ? 0.25 + 0.6 * (1 - (ch.work || 0) / 5) : 0.12;
        r = (l * 0.7 + 0.02) * (1 - keep) + r * keep; g = (l * 0.8 + 0.03) * (1 - keep) + g * keep; b = (l * 1.05 + 0.06) * (1 - keep) + b * keep;
      }
    }
    if (overlay) {
      const v = overlay[i];
      r *= 0.3; g *= 0.3; b *= 0.3;
      if (v > 0) {
        const s = Math.min(1, v) * 2, k = Math.min(1, Math.floor(s)), f = s - k, A = RAMP[k], B = RAMP[Math.min(2, k + 1)], a = 0.55 + 0.4 * Math.min(1, v);
        r = r * (1 - a) + (A[0] + (B[0] - A[0]) * f) * a; g = g * (1 - a) + (A[1] + (B[1] - A[1]) * f) * a; b = b * (1 - a) + (A[2] + (B[2] - A[2]) * f) * a;
      }
    }
    out[o] = r; out[o + 1] = g; out[o + 2] = b;
  }
  function paintTile(i) {
    const m = meshes[st.map.t[i]];
    if (m && slot[i] >= 0) { tileRgb(i, m.instanceColor.array, slot[i] * 3); dirty.add(m.instanceColor); }
    if (waterSlot && waterSlot[i] >= 0) { tileRgb(i, waterMesh.instanceColor.array, waterSlot[i] * 3, waterMesh.userData.base, waterSlot[i] * 3); dirty.add(waterMesh.instanceColor); }
  }
  const paintAll = () => { for (let i = 0; i < N; i++) paintTile(i); };

  // ---- terrain -------------------------------------------------------------------------------

  function terrainMaterial(def) {
    if (def.key === 'atmosphere') return new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const map = textured.get(def.id) || null;
    if (GLOW_TERRAIN.has(def.key)) return worldUv(new THREE.MeshBasicMaterial({ map }));
    return worldUv(new THREE.MeshLambertMaterial({ map }));
  }
  function clearGroup(g) {
    for (const o of [...g.children]) { g.remove(o); o.dispose?.(); if (o.material && !Object.values(KIND_MAT).includes(o.material) && o.material !== ghost.footMat) o.material.dispose(); }
  }

  function buildTerrain() {
    clearGroup(terrainGroup);
    const { t, r } = st.map, count = new Int32Array(TERRAIN.length);
    for (let i = 0; i < N; i++) count[t[i]]++;
    meshes = []; slot = new Int32Array(N).fill(-1); waterSlot = new Int32Array(N).fill(-1);
    terrTop = new Float32Array(N); baseRgb = new Float32Array(N * 3);
    for (const def of TERRAIN) {
      if (!count[def.id] || def.key === 'earth') continue;
      const mesh = new THREE.InstancedMesh(def.key === 'atmosphere' ? PLANE : COLUMN, terrainMaterial(def), count[def.id]);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count[def.id] * 3), 3);
      mesh.frustumCulled = false; mesh.count = 0; mesh.name = def.key;
      if (def.key === 'atmosphere') mesh.renderOrder = 2;
      if (def.key === 'breach') breachMat = mesh.material;
      if (def.key === 'plasma') plasmaMat = mesh.material;
      meshes[def.id] = mesh; terrainGroup.add(mesh);
    }
    const nWater = count[T.RIVER] + count[T.LAKE];
    waterMesh = new THREE.InstancedMesh(PLANE, new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.8, emissive: '#0a2a50' }), Math.max(1, nWater));
    waterMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, nWater) * 3), 3);
    waterMesh.userData.base = new Float32Array(Math.max(1, nWater) * 3);
    waterMesh.frustumCulled = false; waterMesh.count = 0; waterMesh.renderOrder = 1;
    terrainGroup.add(waterMesh);

    const rocks = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, id = t[i], def = TERRAIN[id], m = meshes[id];
      if (!def || !m) { terrTop[i] = -1; continue; }   // Earth: the sphere below shows instead
      let [top, bright] = (SHAPE[def.key] || (() => [def.height, 1]))(x, y);
      const rgb = textured.has(id) ? [1, 1, 1] : TERRAIN_RGB[id];
      for (let j = 0; j < 3; j++) baseRgb[i * 3 + j] = rgb[j] * bright;
      if (def.key === 'atmosphere') {   // fades from black space to bright blue over Earth
        const f = Math.min(1, Math.max(0, (y - 143) / 11));
        for (let j = 0; j < 3; j++) baseRgb[i * 3 + j] = rgb[j] * (0.08 + 0.55 * f * f) * bright;
      }
      const s = slot[i] = m.count++, a = m.instanceMatrix.array, o = s * 16;
      a[o] = 1; a[o + 10] = 1; a[o + 12] = x + 0.5; a[o + 14] = y + 0.5;
      if (def.key === 'atmosphere') { a[o + 5] = 1; a[o + 13] = top; }
      else { a[o + 5] = top - BASE; a[o + 13] = BASE; }
      terrTop[i] = top;
      if (id === T.RIVER || id === T.LAKE) {
        const w = waterSlot[i] = waterMesh.count++, wa = waterMesh.instanceMatrix.array, wo = w * 16;
        wa[wo] = 1; wa[wo + 5] = 1; wa[wo + 10] = 1; wa[wo + 12] = x + 0.5; wa[wo + 13] = -0.08; wa[wo + 14] = y + 0.5;
        const wc = lin(def.color), wb = 0.85 + 0.3 * smooth(x / 3, y / 3);
        waterMesh.userData.base.set(wc.map((c) => c * wb), w * 3);
        terrTop[i] = -0.08;
      }
      // sparse low rocks on asteroid fields, pebbles on meteoroid drifts
      if (id === T.ASTEROID || id === T.METEOROID) {
        const k = id === T.ASTEROID ? 1 + (hash(x, y + 5) < 0.45) + (hash(x, y + 9) < 0.15) : 1;
        for (let n = 0; n < k; n++) {
          const sz = id === T.ASTEROID ? 0.22 + 0.28 * hash(x + n, y + 3) : 0.08 + 0.1 * hash(x + n, y + 3);
          rocks.push({ id, x: x + 0.2 + 0.6 * hash(x + n, y + 11), z: y + 0.2 + 0.6 * hash(x + n, y + 13), s: sz, a: hash(x, y + n) * 6.3, b: 0.7 + 0.5 * hash(x + 3, y + n) });
        }
      }
    }
    for (const m of meshes) if (m) m.instanceMatrix.needsUpdate = true;
    waterMesh.instanceMatrix.needsUpdate = true;

    rockMesh = new THREE.InstancedMesh(ROCK, new THREE.MeshLambertMaterial({ flatShading: true }), Math.max(1, rocks.length));
    rockMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, rocks.length) * 3), 3);
    rockMesh.frustumCulled = false; rockMesh.count = rocks.length;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    rocks.forEach((k, n) => {
      q.setFromEuler(e.set(k.a, k.a * 1.7, 0));
      m4.compose(v.set(k.x, 0.04 + k.s * 0.2, k.z), q, sc.set(k.s, k.s * 0.65, k.s));
      rockMesh.setMatrixAt(n, m4);
      rockMesh.instanceColor.array.set(lin(TERRAIN[k.id].color).map((c) => c * k.b), n * 3);
    });
    terrainGroup.add(rockMesh);
    tops = Float32Array.from(terrTop);
    paintAll();
    tCopy = Uint8Array.from(t); rCopy = Uint8Array.from(r);
  }

  // Ore seams glint and wrecks lie tilted, once their tile is known (space, or a chamber surveyed).
  function buildArtifacts() {
    for (const m of [gemMesh, wreckMesh]) if (m) { fxGroup.remove(m); m.dispose(); m.material.dispose(); }
    const ore = [], wreck = [];
    for (let i = 0; i < N; i++) {
      const a = st.map.r[i];
      if (!a || occ[i]) continue;
      const ch = statusOf(st.map.ch[i]);
      if (ch && ch.status === 'sealed') continue;
      (a === R.ORE_SEAM ? ore : wreck).push(i);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const make = (list, geo, mat, fn) => {
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
      mesh.count = list.length; mesh.frustumCulled = false;
      list.forEach((i, n) => { fn(i % W, (i / W) | 0, i); mesh.setMatrixAt(n, m4); });
      fxGroup.add(mesh);
      return mesh;
    };
    gemMesh = make(ore, GEM, new THREE.MeshBasicMaterial({ color: '#ffc04a' }), (x, y, i) =>
      m4.compose(v.set(x + 0.5, Math.max(0, terrTop[i]) + 0.32, y + 0.5), q.setFromEuler(e.set(0, hash(x, y) * 3, 0)), s.set(0.22, 0.4, 0.22)));
    wreckMesh = make(wreck, UNIT.box, new THREE.MeshLambertMaterial({ color: '#7a7470' }), (x, y, i) =>
      m4.compose(v.set(x + 0.5, Math.max(0, terrTop[i]) + 0.1, y + 0.5), q.setFromEuler(e.set(0.3, hash(x, y) * 6, 0.2)), s.set(0.7, 0.16, 0.3)));
  }

  // ---- chambers ------------------------------------------------------------------------------

  const sigOfChamber = (c) => (c.status === 'pressurising' ? c.status + c.work : c.status);
  function syncChambers(force) {
    let changed = false;
    breachOwners = new Map();
    for (const c of st.chambers || []) {
      chamberById.set(c.id, c);
      for (const i of c.breaches || []) { if (!breachOwners.has(i)) breachOwners.set(i, []); breachOwners.get(i).push(c.id); }
    }
    for (const c of st.chambers || []) {
      const sig = sigOfChamber(c);
      if (!force && chamberSig.get(c.id) === sig) continue;
      chamberSig.set(c.id, sig); changed = true;
      if (force) continue;
      for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) { const i = y * W + x; if (st.map.ch[i] === c.id) paintTile(i); }
    }
    // breach tiles are few: repaint them all, their owners' statuses or lists may have moved
    const bm = meshes[T.BREACH];
    if (bm && !force) for (let i = 0; i < N; i++) if (st.map.t[i] === T.BREACH) paintTile(i);
    return changed;
  }

  // ---- buildings -----------------------------------------------------------------------------

  const sigOf = (b) => `${b.key}|${b.x}|${b.y}|${b.level}|${b.build > 0 ? 1 : 0}|${b.off ? 1 : 0}|${b.mode}`;
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3(), c4 = new THREE.Color();
  const sizeOf = (key) => BUILDING[key]?.size || 1;
  function groundOf(x, y, n) {
    let g = 0;
    for (let j = y; j < y + n; j++) for (let i = x; i < x + n; i++) if (i >= 0 && j >= 0 && i < W && j < H) g = Math.max(g, terrTop[j * W + i]);
    return g;
  }
  // World matrix of a part, for a footprint centred at (cx, ground, cz).
  function partMatrix(p, cx, g, cz) {
    q4.setFromEuler(e4.set(...(p.rot || [0, 0, 0])));
    return m4.compose(v4.set(cx + p.pos[0], g + p.pos[1] + p.size[1] / 2, cz + p.pos[2]), q4, s4.set(...p.size));
  }
  function addBuilding(b) {
    const n = sizeOf(b.key), parts = kitParts(b.key, b.level, b.mode), g = groundOf(b.x, b.y, n);
    const cx = b.x + n / 2, cz = b.y + n / 2, building = b.build > 0;
    for (const p of parts) {
      const m = partMatrix(p, cx, g, cz);
      if (building) {
        pool(p.shape, 'build').add(b.id, m, [BUILD_RGB.r, BUILD_RGB.g, BUILD_RGB.b]);
        pool(p.shape, 'wire').add(b.id, m, [BUILD_RGB.r, BUILD_RGB.g, BUILD_RGB.b]);
        continue;
      }
      c4.set(p.color);
      const dim = b.off ? (p.glow ? 0.15 : 0.35) : 1;
      pool(p.shape, p.glow && !b.off ? 'glow' : 'solid').add(b.id, m, [c4.r * dim, c4.g * dim, c4.b * dim]);
    }
    const h = g + kitHeight(parts);
    for (let j = b.y; j < b.y + n; j++) for (let i = b.x; i < b.x + n; i++) if (i >= 0 && j >= 0 && i < W && j < H) { tops[j * W + i] = Math.max(terrTop[j * W + i], h); occ[j * W + i] = b.id + 1; }
    built.set(b.id, { sig: sigOf(b), x: b.x, y: b.y, n });
  }
  function removeBuilding(id) {
    const rec = built.get(id);
    if (!rec) return;
    for (const p of pools.values()) p.remove(id);
    for (let j = rec.y; j < rec.y + rec.n; j++) for (let i = rec.x; i < rec.x + rec.n; i++) if (i >= 0 && j >= 0 && i < W && j < H) { tops[j * W + i] = terrTop[j * W + i]; occ[j * W + i] = 0; }
    built.delete(id);
  }
  function syncBuildings() {
    let changed = false;
    const seen = new Set();
    for (const b of st.buildings || []) {
      seen.add(b.id);
      const rec = built.get(b.id);
      if (rec && rec.sig === sigOf(b)) continue;
      if (rec) removeBuilding(b.id);
      addBuilding(b); changed = true;
    }
    for (const id of [...built.keys()]) if (!seen.has(id)) { removeBuilding(id); changed = true; }
    return changed;
  }

  // ---- overlays ------------------------------------------------------------------------------

  const finished = (key) => (st.buildings || []).filter((b) => b.key === key && !(b.build > 0));
  function computeOverlay(name) {
    const v = new Float32Array(N);
    if (name === 'reach') {
      for (const d of finished('dock')) {
        const n = sizeOf('dock'), cx = d.x + n / 2, cy = d.y + n / 2;
        for (let y = Math.max(0, Math.floor(cy - DOCK_REACH)); y < Math.min(H, cy + DOCK_REACH); y++)
          for (let x = Math.max(0, Math.floor(cx - DOCK_REACH)); x < Math.min(W, cx + DOCK_REACH); x++)
            if (Math.max(Math.abs(x + 0.5 - cx), Math.abs(y + 0.5 - cy)) <= DOCK_REACH) v[y * W + x] = 1;
      }
    } else if (name === 'power') {
      for (const b of st.buildings || []) {
        const def = BUILDING[b.key], n = def?.size || 1, val = def?.storage?.power ? 0.7 : def?.power > 0 ? 1 : def?.power < 0 ? 0.3 : 0;
        for (let y = b.y; y < b.y + n; y++) for (let x = b.x; x < b.x + n; x++) v[y * W + x] = val;
      }
    } else {   // 'park', and 'happiness' when the caller passes no values: the best park rating in range
      for (const b of st.buildings || []) {
        const def = BUILDING[b.key];
        if (!def?.park || b.build > 0 || b.off) continue;
        const n = def.size || 1, cx = b.x + n / 2, cy = b.y + n / 2, rr = def.radius || 4;
        for (let y = Math.max(0, Math.floor(cy - rr)); y < Math.min(H, cy + rr); y++)
          for (let x = Math.max(0, Math.floor(cx - rr)); x < Math.min(W, cx + rr); x++) {
            const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), i = y * W + x;
            if (d <= rr) v[i] = Math.max(v[i], (def.park / 8) * (1 - d / (rr + 1)));
          }
      }
    }
    return v;
  }

  // ---- Earth, sky, art -----------------------------------------------------------------------

  let earthGroup = null;
  function buildSky() {
    if (earthGroup) { scene.remove(earthGroup); earthGroup.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); }
    earthGroup = new THREE.Group();
    const planet = new THREE.Group();
    // A flattened sphere: from above its rim draws Earth's curve just beyond the atmosphere band,
    // and from a tilted camera it reads as a gentle horizon instead of a wall.
    const ER = 300, flat = 0.08, geo = new THREE.SphereGeometry(ER, 96, 48);
    // planar UVs seen from above: v runs from the far (south) side up to the rim by the map
    const P = geo.attributes.position, U = geo.attributes.uv;
    for (let k = 0; k < P.count; k++) U.setXY(k, P.getX(k) / (2 * ER) + 0.5, P.getZ(k) / (2 * ER) * -1 + 0.5);
    earthMat = new THREE.MeshLambertMaterial({ map: earthTexture(), emissive: '#06142a' });
    const earth = new THREE.Mesh(geo, earthMat);
    const haze = new THREE.Mesh(geo, glowMaterial('#6fb4ff', false, 2.5, 0.9));
    const halo = new THREE.Mesh(geo, glowMaterial('#4f9fff', true, 1.6, 1.1));
    haze.scale.setScalar(1.004); halo.scale.setScalar(1.06);
    planet.add(earth, haze, halo);
    planet.scale.set(1, flat, 1);
    planet.position.set(W / 2, -8, H + ER - 4);
    earthGroup.add(planet, starfield(W / 2, H / 2));
    scene.add(earthGroup);
    sun.position.set(W / 2 - 120, 220, H / 2 - 140); sun.target.position.set(W / 2, 0, H / 2);
    earthlight.position.set(W / 2, -40, H + 200); earthlight.target.position.set(W / 2, 0, H / 2);
  }

  async function loadArt() {
    try { artMod = artMod || await import('../art.js'); } catch { artMod = null; }
    if (!artMod || !st || typeof artMod.art !== 'function') return;
    const loader = new THREE.TextureLoader(), has = (s) => (artMod.hasArt ? artMod.hasArt(s) : !!artMod.art(s));
    const load = (url) => new Promise((ok) => loader.load(url, ok, undefined, () => ok(null)));
    for (const def of TERRAIN) {
      const m = meshes[def.id], s = 'terrain/' + def.key;
      if (!m || def.key === 'atmosphere' || !has(s)) continue;
      const tex = await load(artMod.art(s));
      if (!tex || !st) continue;
      tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textured.set(def.id, tex);
    }
    if (has('sky/earth-below')) {
      // a panorama of Earth's limb with space above it: only its lower part is all Earth
      const tex = await load(artMod.art('sky/earth-below'));
      if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(1, 0.4); earthMat.map?.dispose(); earthMat.map = tex; earthMat.needsUpdate = true; }
    }
    if (textured.size && st) {   // white bases under the textures, new materials with the maps
      buildTerrain();
      for (const id of [...built.keys()]) removeBuilding(id);
      syncBuildings();
    }
  }

  // ---- camera --------------------------------------------------------------------------------

  let snap = false, snapTheta = 0, curTheta = 0, fly = null;
  const keys = new Set();
  const offset = () => camera.position.clone().sub(controls.target);
  const thetaNow = () => { const o = offset(); return Math.atan2(o.x, o.z); };
  function fitDistance() {
    const aspect = camera.aspect || 1, half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return (Math.max(H + 40, (W + 20) / aspect) / 2 / half) * 1.02;
  }
  function placeCamera(tx, tz, dist, polar, theta) {
    controls.target.set(tx, 0, tz);
    camera.position.setFromSpherical(new THREE.Spherical(dist, polar, theta)).add(controls.target);
    controls.update();
  }
  function moveBy(dx, dz) { controls.target.x += dx; controls.target.z += dz; camera.position.x += dx; camera.position.z += dz; }
  function stepCamera(dt, now) {
    // keyboard pan relative to where the camera looks; Q / E rotate
    const o = offset(), dist = o.length(), f = new THREE.Vector2(-o.x, -o.z).normalize(), sp = dist * 0.9 * dt;
    let fx = 0, fz = 0;
    if (keys.has('up')) fz += 1; if (keys.has('down')) fz -= 1; if (keys.has('right')) fx += 1; if (keys.has('left')) fx -= 1;
    if (fx || fz) moveBy((f.x * fz - f.y * fx) * sp, (f.y * fz + f.x * fx) * sp);
    const turn = (keys.has('rotL') ? 1 : 0) - (keys.has('rotR') ? 1 : 0);
    if (turn && !snap) {
      const a = turn * QUARTER * dt, c = Math.cos(a), s = Math.sin(a);
      camera.position.set(controls.target.x + o.x * c + o.z * s, camera.position.y, controls.target.z - o.x * s + o.z * c);
    }
    if (snap) {   // ease towards the snapped angle by pinning OrbitControls' azimuth range on it
      curTheta += (snapTheta - curTheta) * Math.min(1, dt * 10);
      if (Math.abs(snapTheta - curTheta) < 1e-4) curTheta = snapTheta;
      controls.minAzimuthAngle = controls.maxAzimuthAngle = curTheta;
    }
    if (fly) {
      const k = Math.min(1, (now - fly.t0) / 700), e = k * k * (3 - 2 * k);
      const tx = fly.from.x + (fly.to.x - fly.from.x) * e, tz = fly.from.z + (fly.to.z - fly.from.z) * e;
      moveBy(tx - controls.target.x, tz - controls.target.z);
      const d = fly.d0 + (fly.d1 - fly.d0) * e, oo = offset().setLength(d);
      camera.position.copy(controls.target).add(oo);
      if (k >= 1) fly = null;
    }
    controls.update();
    // keep the target over the map, so panning never loses it
    const cx = Math.min(W, Math.max(0, controls.target.x)), cz = Math.min(H + 20, Math.max(0, controls.target.z));
    if (cx !== controls.target.x || cz !== controls.target.z) moveBy(cx - controls.target.x, cz - controls.target.z);
    controls.target.y = 0;
    const near = Math.max(0.3, Math.min(5, offset().length() * 0.01));
    if (Math.abs(camera.near - near) > 0.05) { camera.near = near; camera.updateProjectionMatrix(); }
  }
  function setSnap(on) {
    snap = !!on;
    if (snap) { curTheta = thetaNow(); snapTheta = Math.round(curTheta / QUARTER) * QUARTER; }
    else { controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity; }
  }
  // OrbitControls folds the azimuth limits into [-π, π] only once, so keep both angles near it
  const rotateStep = (dir) => {
    if (!snap) return;
    snapTheta += dir * QUARTER;
    const wrap = snapTheta > Math.PI ? -2 * Math.PI : snapTheta < -Math.PI ? 2 * Math.PI : 0;
    snapTheta += wrap; curTheta += wrap;
  };

  // ---- picking -------------------------------------------------------------------------------

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  // Walks the grid along the ray (Amanatides & Woo) and returns the first tile whose column, or
  // building on it, the ray dips into: exact for our boxes, and a few dozen steps at most.
  function pick(clientX, clientY) {
    if (!st) return null;
    const rc = canvas.getBoundingClientRect();
    ndc.set(((clientX - rc.left) / rc.width) * 2 - 1, -((clientY - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const O = ray.ray.origin.toArray(), D = ray.ray.direction.toArray(), lo = [0, PICK_LO, 0], hi = [W, 8, H];
    let t0 = 0, t1 = Infinity;
    for (let k = 0; k < 3; k++) {
      if (Math.abs(D[k]) < 1e-9) { if (O[k] < lo[k] || O[k] > hi[k]) return null; continue; }
      let a = (lo[k] - O[k]) / D[k], b = (hi[k] - O[k]) / D[k];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    }
    if (t0 > t1) return null;
    let x = Math.min(W - 1, Math.max(0, Math.floor(O[0] + D[0] * t0))), z = Math.min(H - 1, Math.max(0, Math.floor(O[2] + D[2] * t0)));
    const sx = Math.sign(D[0]), sz = Math.sign(D[2]);
    let tx = D[0] ? (x + (sx > 0 ? 1 : 0) - O[0]) / D[0] : Infinity, tz = D[2] ? (z + (sz > 0 ? 1 : 0) - O[2]) / D[2] : Infinity;
    const dx = Math.abs(1 / D[0]), dz = Math.abs(1 / D[2]);
    let t = t0;
    for (let guard = 0; guard < W + H + 4; guard++) {
      const tn = Math.min(tx, tz, t1);
      if (Math.min(O[1] + D[1] * t, O[1] + D[1] * tn) <= tops[z * W + x]) return { x, y: z };
      if (tn >= t1) break;
      if (tx < tz) { x += sx; t = tx; tx += dx; } else { z += sz; t = tz; tz += dz; }
      if (x < 0 || z < 0 || x >= W || z >= H) break;
    }
    return null;
  }

  // ---- hover marker and ghost ----------------------------------------------------------------

  const hoverBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.04, 1)), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }));
  hoverBox.visible = false; hoverBox.renderOrder = 3; scene.add(hoverBox);
  let hover = null;
  const ghost = { group: new THREE.Group(), key: null, foot: null, footMat: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false }), parts: [] };
  ghost.group.visible = false; ghost.group.renderOrder = 4; scene.add(ghost.group);
  function setGhost(key, x, y, ok) {
    if (!key || !st) { ghost.group.visible = false; ghost.key = null; updateHover(); return; }
    const n = sizeOf(key);
    if (ghost.key !== key) {
      ghost.edge?.geometry.dispose();
      clearGroup(ghost.group);
      ghost.foot = new THREE.Mesh(PLANE, ghost.footMat); ghost.foot.scale.set(n, 1, n);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(n, 0.05, n)), new THREE.LineBasicMaterial({ color: '#ffffff' }));
      ghost.edge = edge;
      ghost.group.add(ghost.foot, edge);
      for (const p of kitParts(key, 1, null)) {
        const mesh = new THREE.Mesh(UNIT[p.shape] || UNIT.box, new THREE.MeshLambertMaterial({ color: p.color, transparent: true, opacity: 0.7, depthWrite: false }));
        mesh.matrixAutoUpdate = false; mesh.matrix.copy(partMatrix(p, 0, 0, 0));
        ghost.group.add(mesh);
      }
      ghost.key = key;
    }
    const col = ok ? '#4dff7a' : '#ff4a3a';
    ghost.footMat.color.set(col); ghost.edge.material.color.set(col);
    const g = groundOf(x, y, n);
    ghost.group.position.set(x + n / 2, g, y + n / 2);
    ghost.foot.position.y = 0.04; ghost.edge.position.y = 0.04;
    ghost.group.visible = true;
    updateHover();
  }
  function updateHover() {
    hoverBox.visible = !!hover && !ghost.group.visible;
    if (hoverBox.visible) hoverBox.position.set(hover.x + 0.5, Math.max(terrTop[hover.y * W + hover.x], -0.1) + 0.03, hover.y + 0.5);
  }

  // ---- events --------------------------------------------------------------------------------

  const ac = new AbortController(), sig = { signal: ac.signal };
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, acc: 0, lastX: e.clientX, button: e.button, moved: false }; canvas.focus({ preventScroll: true }); }, sig);
  canvas.addEventListener('pointermove', (e) => {
    if (down) {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
      if (snap && down.button === 0) {   // a long horizontal drag turns a quarter, SimCity style
        down.acc += e.clientX - down.lastX; down.lastX = e.clientX;
        if (Math.abs(down.acc) > 90) { rotateStep(down.acc > 0 ? -1 : 1); down.acc = 0; }
      }
    }
    const p = pick(e.clientX, e.clientY);
    if ((p?.x ?? -1) !== (hover?.x ?? -1) || (p?.y ?? -1) !== (hover?.y ?? -1)) {
      hover = p; updateHover();
      onTileHover(p ? p.x : -1, p ? p.y : -1);
    }
  }, sig);
  canvas.addEventListener('pointerup', (e) => {
    if (down && !down.moved && down.button === e.button) { const p = pick(e.clientX, e.clientY); if (p) onTileClick(p.x, p.y, e.button); }
    down = null;
  }, sig);
  canvas.addEventListener('pointerleave', () => { if (hover) { hover = null; updateHover(); onTileHover(-1, -1); } }, sig);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault(), sig);
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', KeyQ: 'rotL', KeyE: 'rotR' };
  const typing = (e) => e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable;
  addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (!k || typing(e)) return;
    keys.add(k);
    if (!e.repeat && (k === 'rotL' || k === 'rotR')) rotateStep(k === 'rotL' ? 1 : -1);
    if (k !== 'rotL' && k !== 'rotR') e.preventDefault();
  }, sig);
  addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys.delete(k); }, sig);
  addEventListener('blur', () => keys.clear(), sig);

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (W) controls.maxDistance = fitDistance() * 1.25;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let raf = 0, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (st) stepCamera(dt, now);
    if (breachMat) breachMat.color.setScalar(0.75 + 0.25 * Math.sin(now / 260));   // breaches throb
    if (plasmaMat) plasmaMat.color.setScalar(0.9 + 0.1 * Math.sin(now / 900));
    for (const p of pools.values()) p.flush();
    for (const a of dirty) a.needsUpdate = true;
    dirty.clear();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  // ---- API -----------------------------------------------------------------------------------

  function setState(state) {
    const first = !st || state.map.w !== W || state.map.h !== H;
    st = state; W = state.map.w; H = state.map.h; N = W * H;
    occ = new Int32Array(N);
    chamberById.clear(); chamberSig.clear(); built.clear();
    for (const p of pools.values()) p.clear();
    syncChambers(true);
    buildTerrain();
    syncBuildings();
    buildArtifacts();
    if (overlayName) { overlay = overlayValues || computeOverlay(overlayName); paintAll(); }
    if (first) {
      buildSky();
      resize();
      placeCamera(W / 2, H / 2 + 6, fitDistance(), 0.5, 0);
      loadArt();
    }
  }

  function refresh(state) {
    if (!st || state.map.w !== W || state.map.h !== H || state.map.t.length !== N) return setState(state);
    st = state;
    const { t, r } = state.map;
    let tc = false, rc = false;
    for (let i = 0; i < N; i++) { if (t[i] !== tCopy[i]) { tc = true; break; } }
    for (let i = 0; i < N && !rc; i++) if (r[i] !== rCopy[i]) rc = true;
    if (tc) {   // the ground itself changed (salvage cleared rubble, fallow mended soil): rare, rebuild it
      syncChambers(true);
      buildTerrain();
      for (const id of [...built.keys()]) removeBuilding(id);
      syncBuildings();
      buildArtifacts();
      if (overlayName) { overlay = overlayValues || computeOverlay(overlayName); paintAll(); }
      return;
    }
    if (rc) rCopy = Uint8Array.from(r);
    const cc = syncChambers(false), bc = syncBuildings();
    if (cc || bc || rc) buildArtifacts();
    if (overlayName && !overlayValues && bc) { overlay = computeOverlay(overlayName); paintAll(); }
  }

  function setOverlay(name, values = null) {
    overlayName = name || null;
    overlayValues = name && values ? values : null;
    overlay = !overlayName ? null : overlayValues || (st ? computeOverlay(overlayName) : null);
    if (st) paintAll();
  }

  function focus(x, y) {
    const d = offset().length();
    fly = { t0: performance.now(), from: controls.target.clone(), to: new THREE.Vector3(x + 0.5, 0, y + 0.5), d0: d, d1: Math.min(d, 45) };
  }

  function destroy() {
    cancelAnimationFrame(raf); ac.abort(); ro.disconnect(); controls.dispose();
    for (const g of [terrainGroup, buildGroup, fxGroup, ghost.group]) clearGroup(g);
    scene.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
    for (const g of [...Object.values(UNIT), COLUMN, PLANE, ROCK, GEM]) g.dispose();
    for (const m of Object.values(KIND_MAT)) m.dispose();
    renderer.dispose(); canvas.remove(); st = null;
  }

  // `debug` is for dev pages and tests only (colony-view-test.html), not part of the contract.
  return { setState, refresh, setOverlay, setGhost, focus, setSnap, destroy, debug: { scene, camera, controls, renderer, placeCamera, pick } };
}
