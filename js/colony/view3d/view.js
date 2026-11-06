// The colony's 3D view (docs/COLONY-V1.md "view3d/view.js", docs/COLONY.md §6): draws the pure
// state with three.js and reports tiles under the pointer. It keeps no game rules.
//   * terrain: one InstancedMesh per terrain type (a box column per tile, heights from terrain.js
//     plus a little noise), per-instance colour for chamber status; overlays are a W×H texture
//     the terrain shaders mix in, so changing one is a single small upload
//   * buildings: parametric kits (kits.js) packed into one InstancedMesh per shape and material,
//     so a whole colony is a handful of draw calls; refresh() diffs and swaps only what changed
//   * roads: not kits but two InstancedMeshes (slabs + kerbs, lane dashes) rebuilt when a road
//     changes; each tile joins its 4 road neighbours (straight, corner, T, cross, dead end)
//   * movers (movers.js): barges, haulers, drones, the transport, people and rovers on the roads,
//     derived from the state on refresh() and animated every frame; setSpeed(0) freezes them
//   * defence (defence.js, version 3): guardians idling beside the Arsenal / Shipyard / dock, the
//     raid animation (state.raid.coming within a day, state.raid.last on its day), smoke over
//     buildings with `damaged > 0` (drawn dimmed and sooty here); visual only, frozen by setSpeed(0)
//   * Earth: a big (flattened) sphere beyond the bottom edge, its curve under the atmosphere band
//   * camera: OrbitControls (rotate, tilt, zoom to cursor, right-drag / arrow-key pan), optional
//     90° snap; picking walks the tile grid along the pointer ray, so it costs nothing per move.
//     Trackpads (the owner's laptop, docs/COLONY-V2.md): our own wheel handler runs before
//     OrbitControls' (capture phase on the container) and sorts the wheel into pinch, scroll and
//     mouse wheel, see CONTROLS below; button, key and minimap moves are animated (animTo)
//   * minimap (minimap.js) and the camera buttons (navpad.js): DOM overlays in the container,
//     shown by default, toggled with setMinimap(on) / setNavButtons(on)
//   * decks (version 4, docs/COLONY-V4.md): setDeck('upper' | 'main' | 'lower') shows one deck of
//     state.decks (same W×H indexing as state.map; chambers and buildings carry `deck`, absent =
//     main). Everything above draws from a light view of the state for that deck (its map, chambers
//     and buildings; the rest read through to the state), so terrain, tints, buildings, roads,
//     movers, overlays, picking, the ghost and the minimap follow the deck. OUTSIDE tiles are not
//     drawn (space, Earth and the stars stay as the backdrop); GLASS sky panels show the main
//     deck's ground dimly beneath them; SHAFT tiles are dark pits with a gold rim, covered by a
//     Lift's plate; guardians and raids (defence.js) and space traffic exist on the main deck only.
//     A deck change rebuilds the terrain (a few tens of ms) while the world slides through a short
//     rise or sink under a dark veil, and the deck's name shows for a moment
//   * secrets (secrets.js, version 4 stage 2): on the deck on show, the found sites of
//     state.secrets (log terminals, vault doors, survivors' camps) and the dangers of surveyed
//     chambers (sentry drones, toxic haze, radiation shimmer and flickering lamps, the
//     reactor's pulsing core), a drone skirmish when guardians clear a chamber, and their minimap
//     marks; visual only, rebuilt when the secrets change, frozen by setSpeed(0)
// Art slots (js/colony/art.js, docs/COLONY.md §7): terrain/<key> textures the tile tops (every
// terrain, version 2's forest, hills, rock, meteoroid, comet, plasma and gravity included) and
// sky/earth-below the Earth when present; otherwise everything is procedural.
//
// CONTROLS (for the How to play text)
//   Trackpad   two-finger scroll: pan · pinch: zoom · shift + two-finger scroll: rotate ·
//              alt (option) + two-finger scroll: tilt · click a tile: select / build
//   Mouse      wheel: zoom (toward the pointer) · left-drag: rotate and tilt · right-drag: pan
//   Touch      one finger: rotate · two fingers: pinch to zoom, drag to pan
//   Keyboard   WASD / arrows: pan · Q / E: rotate · + / −: zoom · PgUp / PgDn: one deck up / down ·
//              Home: back to the Command Centre
//   Buttons    zoom in / out, rotate left / right 45°, tilt up / down, home, deck ▲ ▼ (top right)
//   Minimap    click or drag on it to move the view there (bottom right)
// The wheel guess: ctrl + wheel is always zoom (browsers send a trackpad pinch that way, Safari
// sends gesture events, handled too); a wheel event in pixels (deltaMode 0) with a sideways part or
// a small step (< 50 px) starts a trackpad gesture, anything else a mouse wheel; a gesture keeps its
// kind while its events keep coming (momentum included). setWheelMode('zoom' | 'pan') overrides it.
import * as THREE from 'three';
import { OrbitControls } from '../../vendor/three/addons/OrbitControls.js';
import { TERRAIN, T, R } from '../data/terrain.js';
import { BUILDING } from '../data/buildings.js';
import { kitParts, kitHeight, ROAD } from './kits.js';
import { createMovers } from './movers.js';
import { createDefence } from './defence.js';
import { createSecrets } from './secrets.js';
import { createMinimap, reachMask } from './minimap.js';
import { createNavPad } from './navpad.js';

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
  // version 4: the decks (GLASS is drawn by buildTerrain itself, OUTSIDE not at all)
  glass: () => [0.05, 1],
  conduit: (x, y) => [0.1, (x % 4 === 0 || y % 6 === 0 ? 0.78 : 1) * (0.92 + 0.12 * hash(x, y))],   // pipe runs in the plating
  catacomb: (x, y) => [0.22 + 0.16 * hash(x, y), 0.7 + 0.45 * smooth(x / 3, y / 3)],
  shaft: () => [-0.5, 1],
};
// Tile-top colours that differ from terrain.js (whose colour then goes to the rocks or water).
const TOP_COLOR = { asteroid: '#2c2622', meteoroid: '#27221f', river: '#1b3049', lake: '#182c44', shaft: '#0c0d11' };
const SHAFT_RIM = '#f0be48';
export const DECKS = ['upper', 'main', 'lower'];
export const DECK_INFO = {
  upper: { name: 'Upper deck', text: 'Galleries, sky gardens and the sky panels' },
  main: { name: 'Main deck', text: 'Fields, the river, industry and the docks' },
  lower: { name: 'Lower deck', text: 'Machinery halls, flooded tunnels and catacombs' },
};
// light per deck: [hemisphere, sun, earthlight]; the main deck's are the version 1-3 values
const DECK_LIGHT = { upper: [2.4, 2.8, 0.9], main: [2.2, 2.6, 0.9], lower: [1.75, 2.1, 0.55] };
const hasDeck = (state, d) => d === 'main' || !!state?.decks?.[d]?.t;
const isOnDeck = (o, d) => (o.deck || 'main') === d;
// The state as one deck sees it: its map, chambers and buildings; everything else reads through.
function deckView(state, d) {
  const anyDeck = (list) => (list || []).some((o) => o.deck && o.deck !== 'main');
  if (d === 'main' && !anyDeck(state.buildings) && !anyDeck(state.chambers)) return state;   // a version 1-3 colony
  const v = Object.create(state), D = d === 'main' ? null : state.decks[d];
  v.map = D ? { w: state.map.w, h: state.map.h, t: D.t, r: D.r, ch: D.ch, sv: D.sv, deck: d } : state.map;
  v.chambers = (state.chambers || []).filter((c) => isOnDeck(c, d));
  v.buildings = (state.buildings || []).filter((b) => isOnDeck(b, d));
  v.deck = d;
  return v;
}
// The sky panel: a thin steel frame with a cross bar and a faint streak of reflected light; the
// pane itself nearly clear, so the main deck's ground under it shows through.
let glassTex = null;
function glassTexture() {
  if (glassTex) return glassTex;
  const n = 64, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(200, 235, 255, 0.16)'; g.fillRect(0, 0, n, n);
  const sheen = g.createLinearGradient(0, 0, n, n);
  sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0)'); sheen.addColorStop(0.42, 'rgba(255, 255, 255, 0.22)'); sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  g.fillStyle = sheen; g.fillRect(0, 0, n, n);
  g.fillStyle = 'rgba(178, 190, 204, 0.95)';
  g.fillRect(0, 0, n, 4); g.fillRect(0, n - 4, n, 4); g.fillRect(0, 0, 4, n); g.fillRect(n - 4, 0, 4, n);
  g.fillStyle = 'rgba(150, 162, 178, 0.8)'; g.fillRect(n / 2 - 1, 0, 2, n);
  glassTex = new THREE.CanvasTexture(cv);
  glassTex.colorSpace = THREE.SRGBColorSpace; glassTex.anisotropy = 4;
  return glassTex;
}
const GLOW_TERRAIN = new Set(['plasma', 'breach']);   // unlit: plasma glows, breaches burn

const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const TERRAIN_RGB = TERRAIN.map((d) => lin(TOP_COLOR[d.key] || d.color));
const TERRAIN_LIN = TERRAIN.map((d) => lin(d.color));   // terrain.js colours (water, rocks)
const RAMP = [[58, 111, 240], [63, 224, 160], [255, 240, 122]];   // overlay sRGB: low, mid, high

// Version 8 (docs/COLONY-V8.md): day and night. One cycle every DN.days game days, smooth in real time: the
// clock runs at the game's speed (DN.daySec seconds a day at ×1) and stands still when paused. Night keeps
// over half the day's light, bluer; lamps on the roads and the buildings' glow parts brighten; the sky turns
// deep blue; the sun warms the atmosphere band at dawn and dusk; Earth turns below. Off = the constant light.
const DN = { days: 8, daySec: 2.5, earthDays: 160 };
const DN_C = {
  hemiDay: new THREE.Color('#d8e0f4'), hemiNight: new THREE.Color('#8197d0'),
  sunDay: new THREE.Color('#fff1dc'), sunDawn: new THREE.Color('#ff9a5c'),
  bgDay: new THREE.Color('#010205'), bgNight: new THREE.Color('#030c2c'),
  white: new THREE.Color('#ffffff'), atmoNight: new THREE.Color('#5a6cae'), atmoDawn: new THREE.Color('#ff8a5a'),
  hazeDay: new THREE.Color('#6fb4ff'), haloDay: new THREE.Color('#4f9fff'), hazeDawn: new THREE.Color('#ff7a3a'),
  lamp: new THREE.Color('#ffd27f'),
};
// A soft round pool of light on the ground under a street lamp (additive: black by day).
function lampGlowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

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
  const w = 512, h = 512, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const fbm = (x, y, o) => { let s = 0, a = 0.5, f = 1; for (let k = 0; k < o; k++) { s += a * smooth(x * f, y * f); a *= 0.5; f *= 2; } return s; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / 40, v = y / 40, land = fbm(u, v, 5), cloud = fbm(u * 1.6 + 40, v * 2.4 + 9, 4);
    const c = land > 0.56 ? (fbm(u + 20, v, 3) > 0.5 ? [150, 130, 80] : [60, 110, 50]) : [18 + 30 * land, 60 + 70 * land, 140 + 60 * land];
    const k = Math.max(0, (cloud - 0.52) * 3.2);
    const o = (y * w + x) * 4;
    for (let j = 0; j < 3; j++) d[o + j] = c[j] + (245 - c[j]) * Math.min(1, k);
    d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
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

// Terrain shaders: tile tops sample their art by world position (four tiles per repeat), so a
// seamless texture shows no grid, and the overlay texture (one texel per tile) is mixed in after
// the art, so dark textures cannot swallow it.
function terrainShader(mat, ov) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, ov);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWorldXZ;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
      vWorldXZ = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xz;
      #ifdef USE_MAP
        vMapUv = vWorldXZ * 0.25;
      #endif`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec2 vWorldXZ; uniform sampler2D uOverlay; uniform float uOverlayOn; uniform vec2 uMapSize;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      if (uOverlayOn > 0.5) { vec4 ov = texture(uOverlay, vWorldXZ / uMapSize); diffuseColor.rgb = mix(diffuseColor.rgb * 0.4, ov.rgb, ov.a); }`);
  };
  return mat;
}

export function createView(container, opts = {}) {
  const { onTileClick = () => {}, onTileHover = () => {}, onDeck = null } = opts;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  canvas.tabIndex = 0;
  container.appendChild(canvas);
  // the minimap and the camera buttons are positioned in the container (CSS custom properties
  // move them: --cv-minimap-right / -bottom, --cv-nav-top / -right; opts.cssVars sets some here)
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  for (const [k, v] of Object.entries(opts.cssVars || {})) container.style.setProperty(k, v);
  const minimap = createMinimap(container, { onMove: (x, z, phase) => glideTo(x, z, phase), onWheel: (e) => onWheel(e, true) });
  const navPad = createNavPad(container, (name) => nav(name));
  minimap.setVisible(opts.minimap !== false);
  navPad.setVisible(opts.navButtons !== false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#010205');
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 6000);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, {
    enableDamping: true, dampingFactor: 0.12, screenSpacePanning: false, zoomToCursor: true,
    minDistance: 6, minPolarAngle: 0.02, maxPolarAngle: 1.22,   // never below the map's horizon
  });
  controls.keys = {};   // our own key handler pans (it ignores text fields)

  const hemi = new THREE.HemisphereLight('#d8e0f4', '#1a2233', 2.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1dc', 2.6), earthlight = new THREE.DirectionalLight('#5f9fff', 0.9);
  scene.add(sun, sun.target, earthlight, earthlight.target);
  // version 8: day and night (DN above); hold: a fixed time of day (0 noon, 0.5 midnight) for screenshots
  const dn = { on: opts.dayNight !== false, clock: -1, hold: null, night: 0, sun0: new THREE.Vector3() };
  const lampMat = new THREE.MeshBasicMaterial({ color: '#b9a77f' });
  const lampGlowMat = new THREE.MeshBasicMaterial({ map: lampGlowTexture(), color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  let hazeMat = null, haloMat = null;

  // everything of the deck on show lives in `world`, which slides up or down when the deck changes
  // (Earth, the stars and the lights stay in the scene)
  const world = new THREE.Group();
  world.name = 'deck';
  scene.add(world);
  const terrainGroup = new THREE.Group(), buildGroup = new THREE.Group(), fxGroup = new THREE.Group(), roadGroup = new THREE.Group();
  world.add(terrainGroup, buildGroup, fxGroup, roadGroup);
  const movers = createMovers(world);
  let buildVersion = 0;   // bumps when buildings change: the guardians' aprons follow
  const defence = createDefence(world, {
    topAt: (x, y) => Math.max(0, tops[y * W + x]),
    freeAt: (i) => !occ[i],
    occSig: () => buildVersion,
  });
  const secrets = createSecrets(world, {
    topAt: (x, y) => Math.max(0, tops[y * W + x]),
    freeAt: (i) => !occ[i],
    occSig: () => buildVersion,
  });
  const UNIT = unitGeometries(), COLUMN = columnGeometry();
  const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const ROCK = new THREE.IcosahedronGeometry(0.5, 0), GEM = new THREE.OctahedronGeometry(0.5);

  // Building materials by kind: lit parts, unlit glow, and the hologram of a building under construction.
  const KIND_MAT = {
    solid: new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial(),
    build: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.18, depthWrite: false }),
    wire: new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.55, depthWrite: false }),
    // see-through, additive and pulsing in frame(): the Shield Pylon's dome (kits.js `shimmer`)
    shimmer: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  };
  const pools = new Map();
  const pool = (shape, kind) => {
    const k = shape + ':' + kind;
    if (!pools.has(k)) pools.set(k, new Pool(UNIT[shape] || UNIT.box, KIND_MAT[kind], buildGroup));
    return pools.get(k);
  };

  let st = null, W = 0, H = 0, N = 0, tCopy = null, rCopy = null;
  let full = null, deck = 'main';                     // the whole state, and the deck on show (st is its view)
  let meshes = [], slot = null, waterMesh = null, waterSlot = null, terrTop = null, tops = null, baseRgb = null;
  let underMesh = null, underSlot = null;             // upper deck: the main deck's ground seen through the glass
  let rockMesh = null, gemMesh = null, wreckMesh = null, breachMat = null, plasmaMat = null;
  let occ = null;                                     // building id + 1 per tile, 0 = free
  const chamberSig = new Map(), chamberById = new Map(), built = new Map();
  let breachOwners = new Map();
  let overlayName = null, overlayValues = null;
  const OV = { uOverlay: { value: null }, uOverlayOn: { value: 0 }, uMapSize: { value: new THREE.Vector2(1, 1) } };
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
  // Linear RGB of tile i into out[o..o+2]: base colour, then chamber status.
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
    out[o] = r; out[o + 1] = g; out[o + 2] = b;
  }
  function paintTile(i) {
    const m = meshes[st.map.t[i]];
    if (m && slot[i] >= 0) { tileRgb(i, m.instanceColor.array, slot[i] * 3); dirty.add(m.instanceColor); }
    if (waterSlot && waterSlot[i] >= 0) { tileRgb(i, waterMesh.instanceColor.array, waterSlot[i] * 3, waterMesh.userData.base, waterSlot[i] * 3); dirty.add(waterMesh.instanceColor); }
    if (underSlot && underSlot[i] >= 0) { tileRgb(i, underMesh.instanceColor.array, underSlot[i] * 3, underMesh.userData.base, underSlot[i] * 3); dirty.add(underMesh.instanceColor); }
  }
  const paintAll = () => { for (let i = 0; i < N; i++) paintTile(i); };

  // ---- terrain -------------------------------------------------------------------------------

  function terrainMaterial(def) {
    if (def.key === 'atmosphere') return new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    if (def.key === 'glass') return new THREE.MeshLambertMaterial({ map: glassTexture(), transparent: true, depthWrite: false });   // the sheen is in the texture, so a sealed chamber's tint darkens it all
    const map = textured.get(def.id) || null;
    if (GLOW_TERRAIN.has(def.key)) return terrainShader(new THREE.MeshBasicMaterial({ map }), OV);
    return terrainShader(new THREE.MeshLambertMaterial({ map }), OV);
  }
  function clearGroup(g) {
    for (const o of [...g.children]) { g.remove(o); o.dispose?.(); if (o.material && !Object.values(KIND_MAT).includes(o.material) && o.material !== ghost.footMat) o.material.dispose(); }
  }

  // (x, y, i) → linear RGB of the main deck's ground at that tile, dimmed: soil, water, rock, and
  // the warm lights of buildings standing there (roads dark), darker under chambers not yet open.
  function mainBelow() {
    const m = full.map, occM = new Uint8Array(N), stat = new Map();
    for (const c of full.chambers || []) if (isOnDeck(c, 'main')) stat.set(c.id, c.status);
    for (const b of full.buildings || []) {
      if (!isOnDeck(b, 'main')) continue;
      const n = sizeOf(b.key);
      for (let j = b.y; j < b.y + n; j++) for (let k = b.x; k < b.x + n; k++) if (k >= 0 && j >= 0 && k < W && j < H) occM[j * W + k] = b.key === 'road' ? 2 : 1;
    }
    const out = [0, 0, 0];
    return (x, y, i) => {
      const mt = m.t[i], def = TERRAIN[mt], c = TERRAIN_RGB[mt] || [0, 0, 0];
      const bright = def ? (SHAPE[def.key] || (() => [0, 1]))(x, y)[1] : 1;
      let k = 0.42 * bright;
      if (occM[i] === 1) { const h = hash(x, y + 77); out[0] = 0.5 * h + 0.2; out[1] = 0.36 * h + 0.14; out[2] = 0.16 * h + 0.08; }
      else if (occM[i] === 2) { out[0] = 0.05; out[1] = 0.055; out[2] = 0.065; }
      else { out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; }
      const s = stat.get(m.ch[i]);
      if (s === 'sealed') k = 0.15; else if (s && s !== 'open') k = 0.45; else k = 1;
      out[0] *= k; out[1] *= k; out[2] *= k;
      return out;
    };
  }

  function buildTerrain() {
    dropTerrain(deck);
    terrGroup = new THREE.Group(); terrGroup.name = 'terrain-' + deck;
    terrainGroup.add(terrGroup);
    const { t, r } = st.map, count = new Int32Array(TERRAIN.length);
    for (let i = 0; i < N; i++) count[t[i]]++;
    meshes = []; slot = new Int32Array(N).fill(-1); waterSlot = new Int32Array(N).fill(-1);
    terrTop = new Float32Array(N); baseRgb = new Float32Array(N * 3);
    for (const def of TERRAIN) {
      if (!count[def.id] || def.key === 'earth' || def.key === 'outside') continue;
      const flat = def.key === 'atmosphere' || def.key === 'glass';
      const mesh = new THREE.InstancedMesh(flat ? PLANE : COLUMN, terrainMaterial(def), count[def.id]);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count[def.id] * 3), 3);
      mesh.frustumCulled = false; mesh.count = 0; mesh.name = def.key;
      if (def.key === 'atmosphere') mesh.renderOrder = 2;
      if (def.key === 'glass') mesh.renderOrder = 1;
      if (def.key === 'breach') breachMat = mesh.material;
      if (def.key === 'plasma') plasmaMat = mesh.material;
      meshes[def.id] = mesh; terrGroup.add(mesh);
    }
    const nWater = count[T.RIVER] + count[T.LAKE];
    waterMesh = new THREE.InstancedMesh(PLANE, terrainShader(new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.8, emissive: '#0a2a50' }), OV), Math.max(1, nWater));
    waterMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, nWater) * 3), 3);
    waterMesh.userData.base = new Float32Array(Math.max(1, nWater) * 3);
    waterMesh.frustumCulled = false; waterMesh.count = 0; waterMesh.renderOrder = 1;
    terrGroup.add(waterMesh);
    // upper deck: under each sky panel a plate in the colours of the main deck's ground (and its
    // buildings' lights), down at the foot of the columns, so it reads as seen through the glass
    const nGlass = count[T.GLASS] || 0;
    underMesh = null; underSlot = null;
    let below = null;
    if (nGlass) {
      underSlot = new Int32Array(N).fill(-1);
      underMesh = new THREE.InstancedMesh(PLANE, new THREE.MeshBasicMaterial(), nGlass);
      underMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nGlass * 3), 3);
      underMesh.userData.base = new Float32Array(nGlass * 3);
      underMesh.frustumCulled = false; underMesh.count = 0; underMesh.name = 'below-glass';
      terrGroup.add(underMesh);
      below = mainBelow();
    }
    const rims = [];   // gold rim bars along the open edges of lift shafts
    const pipes = [];  // conduit pipe segments: x, z, along x (1) or z (0), colour pick

    const rocks = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, id = t[i], def = TERRAIN[id], m = meshes[id];
      if (!def || !m) { terrTop[i] = -1; continue; }   // Earth: the sphere below shows instead
      let [top, bright] = (SHAPE[def.key] || (() => [def.height, 1]))(x, y);
      const rgb = textured.has(id) ? [1, 1, 1] : TERRAIN_RGB[id];
      for (let j = 0; j < 3; j++) baseRgb[i * 3 + j] = rgb[j] * bright;
      if (def.key === 'atmosphere') {   // fades from black space to bright blue over Earth
        const f = Math.min(1, Math.max(0, (y - 143) / 11));
        for (let j = 0; j < 3; j++) baseRgb[i * 3 + j] = rgb[j] * (0.06 + 0.4 * f * f) * bright;
      }
      const s = slot[i] = m.count++, a = m.instanceMatrix.array, o = s * 16;
      a[o] = 1; a[o + 10] = 1; a[o + 12] = x + 0.5; a[o + 14] = y + 0.5;
      if (def.key === 'atmosphere' || def.key === 'glass') { a[o + 5] = 1; a[o + 13] = top; }
      else { a[o + 5] = top - BASE; a[o + 13] = BASE; }
      terrTop[i] = top;
      if (id === T.GLASS) {
        const u = underSlot[i] = underMesh.count++, ua = underMesh.instanceMatrix.array, uo = u * 16;
        ua[uo] = 1; ua[uo + 5] = 1; ua[uo + 10] = 1; ua[uo + 12] = x + 0.5; ua[uo + 13] = BASE + 0.08; ua[uo + 14] = y + 0.5; ua[uo + 15] = 1;
        underMesh.userData.base.set(below(x, y, i), u * 3);
      } else if (id === T.SHAFT) {
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && t[ny * W + nx] === T.SHAFT) continue;
          rims.push(x + 0.5 + dx * 0.44, y + 0.5 + dy * 0.44, dx !== 0);
        }
      }
      if (id === T.RIVER || id === T.LAKE) {
        const w = waterSlot[i] = waterMesh.count++, wa = waterMesh.instanceMatrix.array, wo = w * 16;
        wa[wo] = 1; wa[wo + 5] = 1; wa[wo + 10] = 1; wa[wo + 12] = x + 0.5; wa[wo + 13] = -0.08; wa[wo + 14] = y + 0.5;
        const wc = TERRAIN_LIN[id], wb = 0.85 + 0.3 * smooth(x / 3, y / 3), wB = waterMesh.userData.base;
        wB[w * 3] = wc[0] * wb; wB[w * 3 + 1] = wc[1] * wb; wB[w * 3 + 2] = wc[2] * wb;
        terrTop[i] = -0.08;
      }
      // lower deck: pipe runs half sunk in the conduit halls' plating (flush enough that a kit's
      // base or a road covers them)
      if (id === T.CONDUIT) {
        if (y % 6 === 0) pipes.push(x + 0.5, y + 0.5, 1, hash(x >> 3, y));
        if (x % 8 === 0) pipes.push(x + 0.5, y + 0.5, 0, hash(x, y >> 3));
      }
      // sparse low rocks on asteroid fields, pebbles on meteoroid drifts
      if (id === T.ASTEROID || id === T.METEOROID) {
        const k = id === T.ASTEROID ? (hash(x, y + 5) < 0.6) + (hash(x, y + 9) < 0.15) : hash(x, y + 5) < 0.5 ? 1 : 0;
        for (let n = 0; n < k; n++) {
          const sz = id === T.ASTEROID ? 0.22 + 0.28 * hash(x + n, y + 3) : 0.08 + 0.1 * hash(x + n, y + 3);
          rocks.push({ id, x: x + 0.2 + 0.6 * hash(x + n, y + 11), z: y + 0.2 + 0.6 * hash(x + n, y + 13), s: sz, a: hash(x, y + n) * 6.3, b: 0.7 + 0.5 * hash(x + 3, y + n) });
        }
      }
    }
    for (const m of meshes) if (m) m.instanceMatrix.needsUpdate = true;
    waterMesh.instanceMatrix.needsUpdate = true;
    if (underMesh) underMesh.instanceMatrix.needsUpdate = true;
    if (rims.length) {
      const n = rims.length / 3, rim = new THREE.InstancedMesh(UNIT.box, new THREE.MeshBasicMaterial({ color: SHAFT_RIM }), n);
      rim.frustumCulled = false; rim.name = 'shaft-rims';
      const ra = rim.instanceMatrix.array;
      for (let k = 0; k < n; k++) {
        const o = k * 16, side = rims[k * 3 + 2];
        ra.fill(0, o, o + 16);
        ra[o] = side ? 0.12 : 1.0; ra[o + 5] = 0.14; ra[o + 10] = side ? 1.0 : 0.12; ra[o + 15] = 1;
        ra[o + 12] = rims[k * 3]; ra[o + 13] = 0.13; ra[o + 14] = rims[k * 3 + 1];
      }
      rim.instanceMatrix.needsUpdate = true;
      terrGroup.add(rim);
    }

    rockMesh = new THREE.InstancedMesh(ROCK, new THREE.MeshLambertMaterial({ flatShading: true }), Math.max(1, rocks.length));
    rockMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, rocks.length) * 3), 3);
    rockMesh.frustumCulled = false; rockMesh.count = rocks.length;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    rocks.forEach((k, n) => {
      q.setFromEuler(e.set(k.a, k.a * 1.7, 0));
      m4.compose(v.set(k.x, 0.04 + k.s * 0.2, k.z), q, sc.set(k.s, k.s * 0.65, k.s));
      rockMesh.setMatrixAt(n, m4);
      const rc = TERRAIN_LIN[k.id], ra = rockMesh.instanceColor.array;
      ra[n * 3] = rc[0] * k.b; ra[n * 3 + 1] = rc[1] * k.b; ra[n * 3 + 2] = rc[2] * k.b;
    });
    terrGroup.add(rockMesh);
    if (pipes.length) {
      const n = pipes.length / 4, pm = new THREE.InstancedMesh(UNIT.cylinder, new THREE.MeshLambertMaterial(), n);
      pm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      pm.frustumCulled = false; pm.name = 'conduit-pipes';
      const PIPE_RGB = ['#b87a4a', '#8a949e', '#4f8a86', '#a8963a'].map(lin);
      const rx = new THREE.Quaternion().setFromEuler(e.set(Math.PI / 2, 0, 0)), rz = new THREE.Quaternion().setFromEuler(e.set(0, 0, Math.PI / 2));
      for (let k = 0; k < n; k++) {
        const alongX = pipes[k * 4 + 2] === 1;
        m4.compose(v.set(pipes[k * 4], 0.085, pipes[k * 4 + 1] + (alongX ? -0.22 : 0)), alongX ? rz : rx, sc.set(0.15, 1.0, 0.15));
        if (!alongX) m4.elements[12] -= 0.22;
        pm.setMatrixAt(k, m4);
        pm.instanceColor.array.set(PIPE_RGB[Math.floor(pipes[k * 4 + 3] * PIPE_RGB.length)], k * 3);
      }
      terrGroup.add(pm);
    }
    tops0 = Float32Array.from(terrTop);
    if (count[T.OUTSIDE]) for (let i = 0; i < N; i++) if (t[i] === T.OUTSIDE) tops0[i] = -100;   // never picked
    tops = Float32Array.from(tops0);
    paintAll();
    tCopy = Uint8Array.from(t); rCopy = Uint8Array.from(r);
    tRef = t;
  }

  // ---- terrain per deck (version 4): a deck's terrain stays built (hidden) while another deck
  // is on show, so going back only repaints the chamber tints; it is rebuilt if its tiles changed.
  const terrCache = new Map();   // deck → { group, ...the terrain arrays and meshes }
  let terrGroup = null, tops0 = null, tRef = null;
  function stashTerrain() {
    if (!terrGroup) return;
    terrGroup.visible = false;
    terrCache.set(deck, { group: terrGroup, meshes, slot, waterMesh, waterSlot, underMesh, underSlot, terrTop, tops0, baseRgb, breachMat, plasmaMat, rockMesh, tCopy, tRef, tex: textured.size });
    terrGroup = null;
  }
  function restoreTerrain() {
    const c = terrCache.get(deck), t = st.map.t;
    if (!c || c.tRef !== t || c.tex !== textured.size) return false;
    for (let i = 0; i < N; i++) if (t[i] !== c.tCopy[i]) return false;
    terrCache.delete(deck);
    ({ meshes, slot, waterMesh, waterSlot, underMesh, underSlot, terrTop, tops0, baseRgb, breachMat, plasmaMat, rockMesh, tCopy, tRef } = c);
    terrGroup = c.group; terrGroup.visible = true;
    tops = Float32Array.from(tops0);
    rCopy = Uint8Array.from(st.map.r);
    if (underMesh) {   // the main deck below may have changed meanwhile
      const below = mainBelow(), B = underMesh.userData.base;
      for (let i = 0; i < N; i++) if (underSlot[i] >= 0) B.set(below(i % W, (i / W) | 0, i), underSlot[i] * 3);
    }
    paintAll();
    return true;
  }
  // Disposes a deck's terrain (the one on show too when it is that deck's); every deck's with no argument.
  function dropTerrain(d) {
    const kill = (g) => { terrainGroup.remove(g); clearGroup(g); };
    if (d === undefined) { for (const c of terrCache.values()) kill(c.group); terrCache.clear(); if (terrGroup) kill(terrGroup); terrGroup = null; return; }
    const c = terrCache.get(d);
    if (c) { kill(c.group); terrCache.delete(d); }
    if (d === deck && terrGroup) { kill(terrGroup); terrGroup = null; }
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

  // everything a kit draws from: the Tailings Dump's heap also follows its fill (in steps of 5)
  // version 3: a raid-damaged building is drawn sooty; the Fusion Reactor's torus goes dark with no helium-3
  const noHelium = () => !((st?.stock?.helium ?? 1) > 0);
  const sigOf = (b) => `${b.key}|${b.x}|${b.y}|${b.level}|${b.build > 0 ? 1 : 0}|${b.off ? 1 : 0}|${b.mode}${b.key === 'tailings' ? '|' + Math.round((b.fill || 0) / 5) : ''}${b.damaged > 0 ? '|d' : ''}${b.key === 'fusion' && noHelium() ? '|he0' : ''}`;
  const SOOT = [0.42, 0.37, 0.34];
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
    if (b.key === 'road') return addRoad(b);
    const n = sizeOf(b.key), parts = kitParts(b.key, b.level, b.mode, b, b.key === 'fusion' ? { noHelium: noHelium() } : null), g = groundOf(b.x, b.y, n);
    const cx = b.x + n / 2, cz = b.y + n / 2, building = b.build > 0, hurt = b.damaged > 0 && !building;
    for (const p of parts) {
      const m = partMatrix(p, cx, g, cz);
      if (building) {
        if (p.shimmer) continue;
        pool(p.shape, 'build').add(b.id, m, [BUILD_RGB.r, BUILD_RGB.g, BUILD_RGB.b]);
        pool(p.shape, 'wire').add(b.id, m, [BUILD_RGB.r, BUILD_RGB.g, BUILD_RGB.b]);
        continue;
      }
      c4.set(p.color);
      if (p.shimmer) { if (!b.off && !hurt) pool(p.shape, 'shimmer').add(b.id, m, [c4.r, c4.g, c4.b]); continue; }
      const dim = b.off ? (p.glow ? 0.15 : 0.35) : 1;
      if (hurt) {   // raid damage: sooty, the lights flicker out to embers
        const k = p.glow ? 0.25 : 1;
        pool(p.shape, 'solid').add(b.id, m, [c4.r * SOOT[0] * k * dim, c4.g * SOOT[1] * k * dim, c4.b * SOOT[2] * k * dim]);
        continue;
      }
      pool(p.shape, p.glow && !b.off ? 'glow' : 'solid').add(b.id, m, [c4.r * dim, c4.g * dim, c4.b * dim]);
    }
    const h = g + kitHeight(parts);
    for (let j = b.y; j < b.y + n; j++) for (let i = b.x; i < b.x + n; i++) if (i >= 0 && j >= 0 && i < W && j < H) { tops[j * W + i] = Math.max(terrTop[j * W + i], h); occ[j * W + i] = b.id + 1; }
    built.set(b.id, { sig: sigOf(b), x: b.x, y: b.y, n });
  }
  function removeBuilding(id) {
    const rec = built.get(id);
    if (!rec) return;
    if (rec.road) roadsDirty = true;
    else for (const p of pools.values()) p.remove(id);
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
    syncRoads();
    if (changed) buildVersion++;
    return changed;
  }

  // ---- roads ---------------------------------------------------------------------------------
  // A road tile is a level asphalt slab; kerbs close the sides with no road beside them, and lane
  // dashes run from the centre towards each road neighbour (junctions of 3 or 4 get a lighter slab
  // and no dashes). Two InstancedMeshes for every road on the map, rebuilt when one changes.

  let roadsDirty = false, roadSlab = null, roadLane = null, roadLamp = null, roadPool = null;   // version 8: street lamps and their pools of light
  const roadTopAt = (i) => (st.map.t[i] === T.GATE ? ROAD.gateTop : ROAD.top);
  function addRoad(b) {
    const i = b.y * W + b.x;
    if (b.x >= 0 && b.y >= 0 && b.x < W && b.y < H) { tops[i] = Math.max(terrTop[i], roadTopAt(i)); occ[i] = b.id + 1; }
    built.set(b.id, { sig: sigOf(b), x: b.x, y: b.y, n: 1, road: true });
    roadsDirty = true;
  }
  function syncRoads() {
    if (!roadsDirty) return;
    roadsDirty = false;
    for (const m of [roadSlab, roadLane]) if (m) { roadGroup.remove(m); m.dispose(); m.material.dispose(); }
    for (const m of [roadLamp, roadPool]) if (m) { roadGroup.remove(m); m.dispose(); }   // their materials are shared
    roadSlab = roadLane = roadLamp = roadPool = null;
    const list = [];
    for (const rec of built.values()) if (rec.road && rec.x >= 0 && rec.y >= 0 && rec.x < W && rec.y < H) list.push(rec.y * W + rec.x);
    if (!list.length) return;
    const is = new Uint8Array(N);
    for (const i of list) is[i] = 1;
    const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const conn = (i, k) => { const x = (i % W) + DIRS[k][0], y = ((i / W) | 0) + DIRS[k][1]; return x >= 0 && y >= 0 && x < W && y < H && is[y * W + x] === 1; };
    let nSlab = 0, nLane = 0;
    // a street lamp on every fourth tile of a plain stretch (not a junction), at the kerb
    const lampAt = (i, c) => c <= 2 && ((i % W) + 3 * ((i / W) | 0)) % 4 === 0;
    let nLamp = 0;
    for (const i of list) { let c = 0; for (let k = 0; k < 4; k++) c += conn(i, k) ? 1 : 0; nSlab += 1 + (4 - c); if (c <= 2) nLane += c; if (lampAt(i, c)) { nLamp++; nSlab++; } }
    const mk = (count, mat) => {
      const m = new THREE.InstancedMesh(UNIT.box, mat, Math.max(1, count));
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, count) * 3), 3);
      m.frustumCulled = false; m.count = 0; roadGroup.add(m);
      return m;
    };
    roadSlab = mk(nSlab, new THREE.MeshLambertMaterial()); roadLane = mk(nLane, new THREE.MeshBasicMaterial());
    roadSlab.name = 'roads'; roadLane.name = 'road-lanes';
    if (nLamp) {
      roadLamp = mk(nLamp, lampMat); roadLamp.name = 'road-lamps';
      roadPool = new THREE.InstancedMesh(PLANE, lampGlowMat, nLamp); roadPool.frustumCulled = false; roadPool.count = 0; roadPool.renderOrder = 3; roadPool.name = 'lamp-light'; roadGroup.add(roadPool);
    }
    const rgb = (hex) => { c4.set(hex); return [c4.r, c4.g, c4.b]; };
    const ASPHALT = rgb(ROAD.asphalt), JUNCTION = rgb(ROAD.junction), KERB = rgb(ROAD.kerb), DASH = rgb(ROAD.dash);
    const put = (m, cx, cy, cz, sx, sy, sz, col) => {
      const k = m.count++, a = m.instanceMatrix.array, o = k * 16;
      a.fill(0, o, o + 16); a[o] = sx; a[o + 5] = sy; a[o + 10] = sz; a[o + 12] = cx; a[o + 13] = cy; a[o + 14] = cz; a[o + 15] = 1;
      m.instanceColor.array.set(col, k * 3);
    };
    const lo = 0.04;   // slabs reach down under the lowest floor, so no gap shows beside them
    for (const i of list) {
      const x = i % W, y = (i / W) | 0, top = roadTopAt(i), cx = x + 0.5, cz = y + 0.5;
      let c = 0;
      for (let k = 0; k < 4; k++) c += conn(i, k) ? 1 : 0;
      put(roadSlab, cx, (top + lo) / 2, cz, 1, top - lo, 1, c >= 3 ? JUNCTION : ASPHALT);
      if (roadLamp && lampAt(i, c)) {   // the post beside the road, the lamp on it, its light on the road
        const ew = conn(i, 1) || conn(i, 3), lx = ew ? cx : cx - 0.42, lz = ew ? cz - 0.42 : cz;
        put(roadSlab, lx, top + 0.26, lz, 0.05, 0.52, 0.05, KERB);
        put(roadLamp, lx, top + 0.54, lz, 0.13, 0.07, 0.13, [1, 1, 1]);
        const k = roadPool.count++, a = roadPool.instanceMatrix.array, o = k * 16;
        a.fill(0, o, o + 16); a[o] = 1.7; a[o + 5] = 1; a[o + 10] = 1.7; a[o + 12] = lx * 0.6 + cx * 0.4; a[o + 13] = top + 0.015; a[o + 14] = lz * 0.6 + cz * 0.4; a[o + 15] = 1;
      }
      for (let k = 0; k < 4; k++) {
        const [dx, dz] = DIRS[k], along = dx !== 0;
        if (!conn(i, k)) {
          const off = 0.5 - ROAD.kerbW / 2;
          put(roadSlab, cx + dx * off, top + ROAD.kerbH / 2, cz + dz * off, along ? ROAD.kerbW : 1, ROAD.kerbH, along ? 1 : ROAD.kerbW, KERB);
        } else if (c <= 2) {
          const off = 0.09 + ROAD.dashL / 2;
          put(roadLane, cx + dx * off, top + 0.006, cz + dz * off, along ? ROAD.dashL : ROAD.dashW, 0.012, along ? ROAD.dashW : ROAD.dashL, DASH);
        }
      }
    }
    roadSlab.instanceMatrix.needsUpdate = roadLane.instanceMatrix.needsUpdate = true;
    roadSlab.instanceColor.needsUpdate = roadLane.instanceColor.needsUpdate = true;
    if (roadLamp) roadLamp.instanceMatrix.needsUpdate = roadLamp.instanceColor.needsUpdate = roadPool.instanceMatrix.needsUpdate = true;
  }

  // ---- overlays ------------------------------------------------------------------------------

  function computeOverlay(name) {
    const v = new Float32Array(N);
    if (name === 'reach') {   // docks, and tether masts standing in reach (they chain)
      const m = reachMask(st);
      for (let i = 0; i < N; i++) v[i] = m[i];
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
    const haze = new THREE.Mesh(geo, hazeMat = glowMaterial('#6fb4ff', false, 2.5, 0.9));
    const halo = new THREE.Mesh(geo, haloMat = glowMaterial('#4f9fff', true, 1.6, 0.85));
    haze.scale.setScalar(1.004); halo.scale.setScalar(1.06);
    planet.add(earth, haze, halo);
    planet.scale.set(1, flat, 1);
    planet.position.set(W / 2, -8, H + ER - 4);
    earthGroup.add(planet, starfield(W / 2, H / 2));
    scene.add(earthGroup);
    sun.position.set(W / 2 - 120, 220, H / 2 - 140); sun.target.position.set(W / 2, 0, H / 2);
    dn.sun0.copy(sun.position);
    earthlight.position.set(W / 2, -40, H + 200); earthlight.target.position.set(W / 2, 0, H / 2);
  }

  async function loadArt() {
    try { artMod = artMod || await import('../art.js'); } catch { artMod = null; }
    if (!artMod || !st || typeof artMod.art !== 'function') return;
    const loader = new THREE.TextureLoader(), has = (s) => (artMod.hasArt ? artMod.hasArt(s) : !!artMod.art(s));
    const load = (url) => new Promise((ok) => loader.load(url, ok, undefined, () => ok(null)));
    if (has('sky/earth-below')) {
      // a panorama of Earth's limb with space above it: only its lower part is all Earth
      load(artMod.art('sky/earth-below')).then((tex) => {
        if (!tex || !earthMat) return;
        tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(1, 0.4);
        earthMat.map?.dispose(); earthMat.map = tex; earthMat.needsUpdate = true;
      });
    }
    await Promise.all(TERRAIN.map(async (def) => {
      const s = 'terrain/' + def.key;
      if (def.key === 'atmosphere' || def.key === 'glass' || def.key === 'outside' || !has(s)) return;   // every deck's terrains
      const tex = await load(artMod.art(s));
      if (!tex) return;
      tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textured.set(def.id, tex);
    }));
    if (textured.size && st) {   // white bases under the textures, new materials with the maps
      dropTerrain();
      buildTerrain();
      for (const id of [...built.keys()]) removeBuilding(id);
      syncBuildings();
      movers.refresh(st, { terrTop, buildingsChanged: true });
      if (deck === 'main') defence.refresh(st, { terrTop, terrainChanged: true });
      secrets.refresh(st, { terrTop });
    }
  }

  // ---- camera --------------------------------------------------------------------------------

  let snap = false, snapTheta = 0, curTheta = 0, anim = null, glide = null;
  const keys = new Set(), sph = new THREE.Spherical();
  const offset = () => camera.position.clone().sub(controls.target);
  const thetaNow = () => { const o = offset(); return Math.atan2(o.x, o.z); };
  const clampDist = (d) => Math.max(controls.minDistance, Math.min(controls.maxDistance, d));
  const clampPhi = (p) => Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, p));
  function fitDistance() {
    const aspect = camera.aspect || 1, half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return (Math.max(H + 40, (W + 20) / aspect) / 2 / half) * 1.02;
  }
  function placeCamera(tx, tz, dist, polar, theta) {
    anim = glide = null;
    controls.target.set(tx, 0, tz);
    camera.position.setFromSpherical(new THREE.Spherical(dist, polar, theta)).add(controls.target);
    controls.update();
  }
  function moveBy(dx, dz) { controls.target.x += dx; controls.target.z += dz; camera.position.x += dx; camera.position.z += dz; }
  // Leftover OrbitControls momentum would fight an animation: drop it (r170 field names).
  function stopMomentum() { controls._sphericalDelta?.set(0, 0, 0); controls._panOffset?.set(0, 0, 0); }
  // An eased move of the target, distance, azimuth (theta) and polar angle (phi); omitted parts stay.
  function animTo({ x, z, dist, theta, phi, dur = 550 }) {
    sph.setFromVector3(offset());
    stopMomentum();
    glide = null;
    anim = { t0: performance.now(), dur, x0: controls.target.x, z0: controls.target.z, x1: x ?? controls.target.x, z1: z ?? controls.target.z,
      d0: sph.radius, d1: clampDist(dist ?? sph.radius), th0: sph.theta, th1: snap ? sph.theta : theta ?? sph.theta, ph0: sph.phi, ph1: clampPhi(phi ?? sph.phi) };
  }
  // Where the camera is headed: an animation's end, else where it is now (so repeated clicks add up).
  function camGoal() {
    if (anim) return { x: anim.x1, z: anim.z1, d: anim.d1, th: anim.th1, ph: anim.ph1 };
    sph.setFromVector3(offset());
    return { x: controls.target.x, z: controls.target.z, d: sph.radius, th: sph.theta, ph: sph.phi };
  }
  function homeTile() {
    if (st && deck !== 'main') {   // another deck: its first Lift, else the middle of its chambers
      const l = (st.buildings || []).find((b) => b.key === 'lift');
      if (l) return [l.x + 1, l.y + 1];
      const cs = st.chambers || [];
      if (cs.length) return [(Math.min(...cs.map((c) => c.x0)) + Math.max(...cs.map((c) => c.x1)) + 1) / 2, (Math.min(...cs.map((c) => c.y0)) + Math.max(...cs.map((c) => c.y1)) + 1) / 2];
    }
    const c = st && (st.buildings || []).find((b) => b.key === 'command');
    if (c) { const n = sizeOf('command'); return [c.x + n / 2, c.y + n / 2]; }
    const d = st && (st.buildings || []).find((b) => b.key === 'dock');
    return d ? [d.x + 1, d.y + 1] : [W / 2, H / 2];
  }
  // The camera buttons and keys: 'zoomIn' | 'zoomOut' | 'rotateLeft' | 'rotateRight' | 'tiltUp' |
  // 'tiltDown' | 'home' | 'deckUp' | 'deckDown' (version 4). Rotation turns 45°, or a quarter turn
  // in 90° snap mode. A deck step goes to opts.onDeck(+1 up | -1 down) when given (the game decides),
  // else straight to setDeck.
  const ZOOM_STEP = 0.6, TILT_STEP = 0.22;
  function nav(name) {
    if (!st) return false;
    const g = camGoal();
    switch (name) {
      case 'zoomIn': animTo({ x: g.x, z: g.z, dist: g.d * ZOOM_STEP, theta: g.th, phi: g.ph, dur: 420 }); break;
      case 'zoomOut': animTo({ x: g.x, z: g.z, dist: g.d / ZOOM_STEP, theta: g.th, phi: g.ph, dur: 420 }); break;
      case 'rotateLeft': case 'rotateRight': {
        const dir = name === 'rotateLeft' ? 1 : -1;
        if (snap) rotateStep(dir); else animTo({ x: g.x, z: g.z, dist: g.d, theta: g.th + dir * Math.PI / 4, phi: g.ph, dur: 520 });
        break;
      }
      case 'tiltUp': animTo({ x: g.x, z: g.z, dist: g.d, theta: g.th, phi: g.ph - TILT_STEP, dur: 420 }); break;
      case 'tiltDown': animTo({ x: g.x, z: g.z, dist: g.d, theta: g.th, phi: g.ph + TILT_STEP, dur: 420 }); break;
      case 'home': { const [x, z] = homeTile(); animTo({ x, z, dist: 55, theta: g.th, phi: 0.62, dur: 900 }); break; }
      case 'deckUp': case 'deckDown': return stepDeckBy(name === 'deckUp' ? 1 : -1);
      default: return false;
    }
    return true;
  }
  // The minimap: the target follows the pointer while it is held, then settles.
  function glideTo(x, z, phase) {
    if (!st) return;
    anim = null; stopMomentum();
    if (phase === 'start' || !glide) glide = { x, z, held: true };
    glide.x = x; glide.z = z;
    if (phase === 'end') glide.held = false;
  }
  function stepCamera(dt, now) {
    // keyboard pan relative to where the camera looks; Q / E rotate
    const o = offset(), dist = o.length(), f = new THREE.Vector2(-o.x, -o.z).normalize(), sp = dist * 0.9 * dt;
    let fx = 0, fz = 0;
    if (keys.has('up')) fz += 1; if (keys.has('down')) fz -= 1; if (keys.has('right')) fx += 1; if (keys.has('left')) fx -= 1;
    if (fx || fz) { anim = glide = null; moveBy((f.x * fz - f.y * fx) * sp, (f.y * fz + f.x * fx) * sp); }
    const turn = (keys.has('rotL') ? 1 : 0) - (keys.has('rotR') ? 1 : 0);
    if (turn && !snap) {
      anim = null;
      const a = turn * QUARTER * dt, c = Math.cos(a), s = Math.sin(a);
      camera.position.set(controls.target.x + o.x * c + o.z * s, camera.position.y, controls.target.z - o.x * s + o.z * c);
    }
    if (snap) {   // ease towards the snapped angle by pinning OrbitControls' azimuth range on it
      curTheta += (snapTheta - curTheta) * Math.min(1, dt * 10);
      if (Math.abs(snapTheta - curTheta) < 1e-4) curTheta = snapTheta;
      controls.minAzimuthAngle = controls.maxAzimuthAngle = curTheta;
    }
    if (anim) {
      const k = Math.min(1, (now - anim.t0) / anim.dur), e = k * k * (3 - 2 * k), L = (a, b) => a + (b - a) * e;
      controls.target.set(L(anim.x0, anim.x1), 0, L(anim.z0, anim.z1));
      sph.set(L(anim.d0, anim.d1), L(anim.ph0, anim.ph1), L(anim.th0, anim.th1));
      camera.position.setFromSpherical(sph).add(controls.target);
      if (k >= 1) anim = null;
    } else if (glide) {
      const k = 1 - Math.exp(-dt * (glide.held ? 14 : 9)), dx = glide.x - controls.target.x, dz = glide.z - controls.target.z;
      moveBy(dx * k, dz * k);
      if (!glide.held && Math.hypot(dx, dz) < 0.03) { moveBy(dx * (1 - k), dz * (1 - k)); glide = null; }
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

  // The camera's view on the ground (y = 0) for the minimap: the screen's edge rays, eight points
  // round the border; rays at or above the horizon are cut off far out along their heading.
  const RING = [[-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0]], ringPts = new Array(16).fill(0);
  function footprint() {
    camera.updateMatrixWorld();
    const far = 2 * Math.max(W, H), o = camera.position;
    for (let k = 0; k < 8; k++) {
      ray.setFromCamera(ndc.set(RING[k][0], RING[k][1]), camera);
      const d = ray.ray.direction, hl = Math.hypot(d.x, d.z) || 1e-6;
      let t = d.y < -1e-6 ? -o.y / d.y : Infinity;
      if (t * hl > far) t = far / hl;
      ringPts[k * 2] = o.x + d.x * t; ringPts[k * 2 + 1] = o.z + d.z * t;
    }
    return ringPts;
  }

  // ---- wheel: trackpad scroll pans, pinch zooms, a mouse wheel zooms (see CONTROLS above) -----

  let wheelMode = ['auto', 'zoom', 'pan'].includes(opts.wheel) ? opts.wheel : 'auto';
  const gest = { t: 0, pad: false, rot: 0 };
  function trackpadGuess(e, dx, dy, fresh) {
    if (wheelMode !== 'auto') return wheelMode === 'pan';
    if (!fresh) return gest.pad;                       // one gesture keeps its kind, momentum included
    if (e.deltaMode !== 0) return false;               // lines or pages: a mouse wheel
    if (dx !== 0) return true;                         // sideways: two fingers
    const a = Math.abs(dy);
    if (a >= 50 && e.wheelDeltaY && Math.abs(e.wheelDeltaY) % 120 === 0) return false;   // a notched wheel
    return a < 50;                                     // small steps (fractional or not): two fingers
  }
  function wheelZoom(cx, cy, delta) {
    if (!delta) return;
    controls._updateZoomParameters(cx, cy);
    const s = Math.pow(0.95, controls.zoomSpeed * Math.abs(delta * 0.01));
    if (delta < 0) controls._dollyIn(s); else controls._dollyOut(s);
    controls.update();
  }
  function onWheel(e, centred) {
    if (!st) return;
    e.preventDefault();
    anim = null; glide = null;
    const now = performance.now(), fresh = now - gest.t > 250;
    gest.t = now;
    let dx = e.deltaX, dy = e.deltaY;
    if (e.deltaMode === 1) { dx *= 16; dy *= 16; } else if (e.deltaMode === 2) { dx *= 100; dy *= 100; }
    const rc = canvas.getBoundingClientRect(), cx = centred ? rc.left + rc.width / 2 : e.clientX, cy = centred ? rc.top + rc.height / 2 : e.clientY;
    if (e.ctrlKey) {   // a trackpad pinch (no Control key held: browsers mark it so), or ctrl + wheel
      wheelZoom(cx, cy, (dy || dx) * (controls._controlActive ? 1 : 10));
      return;
    }
    if (e.shiftKey) {   // rotate (browsers may move a shifted vertical scroll to deltaX)
      const a = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (snap) { gest.rot = fresh ? a : gest.rot + a; if (Math.abs(gest.rot) > 140) { rotateStep(gest.rot > 0 ? -1 : 1); gest.rot = 0; } }
      else controls._rotateLeft((2 * Math.PI * a * 0.6) / (canvas.clientHeight || 600));
      return;
    }
    if (e.altKey) { controls._rotateUp((2 * Math.PI * dy * 0.5) / (canvas.clientHeight || 600)); return; }
    gest.pad = trackpadGuess(e, dx, dy, fresh);
    if (gest.pad) controls._pan(-dx, -dy);   // the map moves with the fingers, like a page
    else wheelZoom(cx, cy, dy);
  }
  // Safari reports a trackpad pinch as gesture events instead of ctrl + wheel.
  let gScale = 1;
  function onGesture(e) {
    e.preventDefault();
    if (e.type === 'gesturestart') { gScale = 1; anim = glide = null; return; }
    if (e.type !== 'gesturechange' || !st || !(e.scale > 0)) return;
    const r = e.scale / gScale;
    gScale = e.scale;
    controls._updateZoomParameters(e.clientX, e.clientY);
    controls._dollyIn(1 / r);
    controls.update();
  }

  // ---- picking -------------------------------------------------------------------------------

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  // Walks the grid along the ray (Amanatides & Woo) and returns the first tile whose column, or
  // building on it, the ray dips into: exact for our boxes, and a few dozen steps at most.
  function pick(clientX, clientY) {
    if (!st || trans) return null;   // nothing to pick while the decks change
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
  hoverBox.visible = false; hoverBox.renderOrder = 3; world.add(hoverBox);
  let hover = null;
  const ghost = { group: new THREE.Group(), key: null, foot: null, footMat: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false }), parts: [] };
  ghost.group.visible = false; ghost.group.renderOrder = 4; world.add(ghost.group);
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
  canvas.addEventListener('pointerdown', (e) => { anim = glide = null; down = { x: e.clientX, y: e.clientY, acc: 0, lastX: e.clientX, button: e.button, moved: false }; canvas.focus({ preventScroll: true }); }, sig);
  // ours before OrbitControls' own wheel listener on the canvas: the capture phase on the container
  container.addEventListener('wheel', (e) => { if (e.target === canvas) { e.stopPropagation(); onWheel(e, false); } }, { capture: true, passive: false, signal: ac.signal });
  for (const g of ['gesturestart', 'gesturechange', 'gestureend']) canvas.addEventListener(g, onGesture, { passive: false, signal: ac.signal });
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
  // PageUp / PageDown step through the decks (version 4; tilt kept its buttons and Alt + scroll)
  const NAVKEYS = { Equal: 'zoomIn', NumpadAdd: 'zoomIn', Minus: 'zoomOut', NumpadSubtract: 'zoomOut', Home: 'home', PageUp: 'deckUp', PageDown: 'deckDown' };
  const typing = (e) => e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable;
  addEventListener('keydown', (e) => {
    if (typing(e)) return;
    const n = NAVKEYS[e.code] || (e.key === '+' ? 'zoomIn' : e.key === '-' ? 'zoomOut' : null);
    if (n && n.startsWith('deck') && (e.defaultPrevented || e.repeat)) { e.preventDefault(); return; }   // the game took it, or a held key
    if (n) { if (nav(n)) e.preventDefault(); return; }
    const k = KEYMAP[e.code];
    if (!k) return;
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
    minimap.layout();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let raf = 0, last = performance.now();
  const shimmerMat = KIND_MAT.shimmer;
  const dbg = { noRender: false };   // tests on slow software GL skip drawing (debug.setRender)
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (st) stepCamera(dt, now);
    if (trans && !trans.hold) stepTransition(now);
    if (breachMat) breachMat.color.setScalar(0.75 + 0.25 * Math.sin(now / 260));   // breaches throb
    if (plasmaMat) plasmaMat.color.setScalar(0.9 + 0.1 * Math.sin(now / 900));
    const camDist = camera.position.distanceTo(controls.target);
    if (st) movers.update(dt, camDist);
    if (st && deck === 'main') defence.update(dt, movers.getSpeed());
    if (st) secrets.update(dt, movers.getSpeed(), camDist);
    stepDayNight(dt);
    if (shimmerMat) shimmerMat.opacity = 0.26 + 0.12 * Math.sin(now / 480) + 0.05 * Math.sin(now / 137);
    if (st && minimap.visible) minimap.frame(footprint(), [controls.target.x, controls.target.z], deckMarks());
    for (const p of pools.values()) p.flush();
    for (const a of dirty) a.needsUpdate = true;
    dirty.clear();
    if (!dbg.noRender) renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  // Version 8: the light of the time of day (DN above). No allocation: colours are copied and mixed in place.
  function stepDayNight(dt) {
    const day = full?.day ?? 0;
    if (dn.clock < 0 || Math.abs(dn.clock - day) > 2) dn.clock = day;
    dn.clock = Math.min(day + 1, dn.clock + (dt * movers.getSpeed()) / DN.daySec);
    const on = dn.on && !!st, p = dn.hold ?? (((dn.clock / DN.days) % 1) + 1) % 1, c = Math.cos(p * Math.PI * 2);
    const night = on ? 1 - Math.min(1, Math.max(0, (c + 0.3) / 0.6)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (c + 0.3) / 0.6))) : 0;
    const dawn = on ? Math.max(0, 1 - Math.abs(c) / 0.45) ** 1.5 : 0;   // sunrise and sunset, either side of the turn
    dn.night = night;
    hemi.intensity = 2.2 - 0.7 * night; hemi.color.copy(DN_C.hemiDay).lerp(DN_C.hemiNight, night);
    sun.intensity = 2.6 - 2.15 * night; sun.color.copy(DN_C.sunDay).lerp(DN_C.sunDawn, dawn * 0.8);
    earthlight.intensity = 0.9 + 0.7 * night;   // earthshine from below lights the night
    if (on) { const a = p * Math.PI * 2; sun.position.set(dn.sun0.x + 220 * Math.sin(a), Math.max(40, dn.sun0.y * (0.35 + 0.65 * Math.max(0, c))), dn.sun0.z); }
    else sun.position.copy(dn.sun0);
    scene.background.copy(DN_C.bgDay).lerp(DN_C.bgNight, night);
    KIND_MAT.glow.color.setScalar(on ? 0.82 + 0.4 * night : 1);
    lampMat.color.copy(DN_C.lamp).multiplyScalar(on ? 0.55 + 0.6 * night : 0.7);
    lampGlowMat.color.copy(DN_C.lamp).multiplyScalar(on ? 0.6 * night : 0);
    const atmo = meshes[T.ATMOSPHERE]?.material;
    if (atmo?.color) atmo.color.copy(DN_C.white).lerp(DN_C.atmoNight, night * 0.6).lerp(DN_C.atmoDawn, dawn * 0.75);
    if (hazeMat) hazeMat.uniforms.color.value.copy(DN_C.hazeDay).lerp(DN_C.hazeDawn, dawn);
    if (haloMat) haloMat.uniforms.color.value.copy(DN_C.haloDay).lerp(DN_C.hazeDawn, dawn * 0.8);
    if (earthMat) {
      earthMat.color.setScalar(1 - 0.3 * night);
      const map = earthMat.map;   // Earth turns: its texture slides along the rim (mirrored, so no seam)
      if (map) {
        if (map.wrapS !== THREE.MirroredRepeatWrapping) { map.wrapS = THREE.MirroredRepeatWrapping; map.needsUpdate = true; }
        map.offset.x = on ? (dn.clock / DN.earthDays) % 2 : 0;
      }
    }
  }
  const setDayNight = (on) => { dn.on = !!on; };

  // ---- API -----------------------------------------------------------------------------------

  // ---- decks (version 4) -----------------------------------------------------------------------

  // Lifts on every deck, for the minimap's shaft marks.
  function liftList() {
    const out = [];
    for (const b of full?.buildings || []) if (b.key === 'lift') out.push({ x: b.x, y: b.y, deck: b.deck || 'main', working: !(b.build > 0) && !b.off });
    return out;
  }
  let liftSig = '';
  const liftSigOf = (l) => l.map((o) => `${o.x},${o.y},${o.deck},${o.working ? 1 : 0}`).join(';');
  function minimapExtra() {
    const lifts = liftList();
    liftSig = liftSigOf(lifts);
    return { lifts, below: deck === 'upper' ? full.map.t : null };
  }
  // the minimap's marks: guardians and raiders (main deck), and the secrets' sites and dangers
  const deckMarks = () => {
    const s = secrets.marks();
    if (deck !== 'main') return s.ssig ? s : null;
    const m = defence.marks();
    m.sites = s.sites; m.dangers = s.dangers; m.ssig = s.ssig;
    return m;
  };
  function setLights() {
    const [h, s2, e] = DECK_LIGHT[deck] || DECK_LIGHT.main;
    hemi.intensity = h; sun.intensity = s2; earthlight.intensity = e;
  }
  function updateDeckPad() {
    const multi = !!full && DECKS.some((d) => d !== 'main' && hasDeck(full, d));
    const k = DECKS.indexOf(deck);
    navPad.setDeck(multi ? DECK_INFO[deck].name : null, multi && k > 0 && hasDeck(full, DECKS[k - 1]), multi && k < 2 && hasDeck(full, DECKS[k + 1]));
  }

  // Everything of the current deck from scratch: a new state, or another deck. `fresh` also clears
  // the guardians and the raid animation (a new state).
  const rebuildMs = {};   // the last rebuild's steps in ms (debug.rebuildMs)
  function rebuild(fresh) {
    let t0 = performance.now();
    const lap = (k) => { const t = performance.now(); rebuildMs[k] = +(t - t0).toFixed(1); t0 = t; };
    occ = new Int32Array(N);
    chamberById.clear(); chamberSig.clear(); built.clear();
    for (const p of pools.values()) p.clear();
    roadsDirty = true;
    syncChambers(true);
    rebuildMs.cached = restoreTerrain();
    if (!rebuildMs.cached) buildTerrain();
    lap('terrain');
    syncBuildings(); lap('buildings');
    buildArtifacts();
    showOverlay(); lap('artifacts');
    movers.reset();
    movers.refresh(st, { terrTop, reset: true, buildingsChanged: true, chambersChanged: true }); lap('movers');
    defence.group.visible = deck === 'main';
    if (deck === 'main') defence.refresh(st, fresh ? { terrTop, reset: true } : { terrTop, terrainChanged: true });
    lap('defence');
    secrets.refresh(st, { terrTop, reset: fresh, deckChanged: true }); lap('secrets');
    minimap.setState(st, minimapExtra()); lap('minimap');
    setLights();
    updateDeckPad();
    hover = null; updateHover();
  }

  function setState(state) {
    const first = !st || state.map.w !== W || state.map.h !== H;
    full = state; W = state.map.w; H = state.map.h; N = W * H;
    if (!hasDeck(state, deck)) deck = 'main';
    if (trans) { trans = null; world.position.y = 0; veil.style.opacity = 0; }
    dropTerrain();
    st = deckView(state, deck);
    rebuild(true);
    if (first) {
      buildSky();
      resize();
      placeCamera(W / 2, H / 2 + 6, fitDistance(), 0.5, 0);
      loadArt();
    }
  }

  function refresh(state) {
    if (!st || state.map.w !== W || state.map.h !== H || state.map.t.length !== N) return setState(state);
    full = state;
    if (!hasDeck(state, deck)) { applyDeck('main'); return; }   // the deck went away (a new colony): back to main
    st = deckView(state, deck);
    const { t, r } = st.map;
    let tc = false, rc = false;
    for (let i = 0; i < N; i++) { if (t[i] !== tCopy[i]) { tc = true; break; } }
    for (let i = 0; i < N && !rc; i++) if (r[i] !== rCopy[i]) rc = true;
    if (tc) {   // the ground itself changed (salvage cleared rubble, fallow mended soil): rare, rebuild it
      syncChambers(true);
      buildTerrain();
      for (const id of [...built.keys()]) removeBuilding(id);
      syncBuildings();
      buildArtifacts();
      showOverlay();
      movers.refresh(st, { terrTop, buildingsChanged: true, chambersChanged: true });
      if (deck === 'main') defence.refresh(st, { terrTop, terrainChanged: true });
      secrets.refresh(st, { terrTop });
      minimap.setState(st, minimapExtra());
      return;
    }
    if (rc) rCopy = Uint8Array.from(r);
    const cc = syncChambers(false), bc = syncBuildings();
    if (cc || bc || rc) buildArtifacts();
    if (overlayName && !overlayValues && bc) showOverlay();
    movers.refresh(st, { terrTop, buildingsChanged: bc, chambersChanged: cc });
    if (deck === 'main') defence.refresh(st, { terrTop });
    secrets.refresh(st, { terrTop });
    const lifts = full.buildings?.some((b) => b.key === 'lift') || liftSig ? liftList() : [];
    const ls = liftSigOf(lifts);
    if (cc || bc || ls !== liftSig) { liftSig = ls; minimap.refresh(st, { lifts, below: deck === 'upper' ? full.map.t : null }); }
    updateDeckPad();
  }

  // The deck change: the world slides (up past the camera when rising, away below when sinking)
  // under a dark veil; halfway, with the veil at its darkest, the new deck is built and its name
  // shows. `D` follows the zoom, so the move reads the same near and far.
  const veil = document.createElement('div'), banner = document.createElement('div');
  veil.className = 'cv-deck-veil'; banner.className = 'cv-deck-banner';
  banner.innerHTML = '<b></b><span></span>';
  canvas.after(veil, banner);
  if (!document.getElementById('cv-deck-style')) {
    const css = document.createElement('style');
    css.id = 'cv-deck-style';
    css.textContent = `
.cv-deck-veil { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at center, rgba(4, 8, 20, .82), rgba(1, 2, 6, .97)); }
.cv-deck-banner { position: absolute; left: 50%; top: 22%; transform: translate(-50%, 8px); pointer-events: none; opacity: 0; text-align: center;
  transition: opacity .35s ease, transform .35s ease; text-shadow: 0 2px 12px rgba(0, 0, 0, .9); white-space: nowrap; }
.cv-deck-banner.on { opacity: 1; transform: translate(-50%, 0); }
.cv-deck-banner b { display: block; font: 700 30px/1.1 system-ui, sans-serif; letter-spacing: .32em; text-transform: uppercase; color: #f5c542; padding-left: .32em; }
.cv-deck-banner span { display: block; margin-top: 6px; font: 500 13px/1.3 system-ui, sans-serif; letter-spacing: .12em; color: #cfe6ff; }
@media (max-width: 760px) { .cv-deck-banner b { font-size: 20px; } .cv-deck-banner span { font-size: 11px; } }`;
    document.head.appendChild(css);
  }
  let bannerTimer = 0;
  function showBanner(d) {
    banner.firstChild.textContent = DECK_INFO[d].name;
    banner.lastChild.textContent = DECK_INFO[d].text;
    banner.classList.add('on');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => banner.classList.remove('on'), 1700);
  }

  let trans = null;   // { t0, dur, dir: +1 rising | -1 sinking, to, D, swapped }
  const TRANS_MS = 800;
  function applyDeck(d) {
    stashTerrain();
    deck = d;
    st = deckView(full, d);
    rebuild(false);
  }
  function stepTransition(now) {
    const k = Math.min(1, (now - trans.t0) / trans.dur), p = k * k * (3 - 2 * k);
    if (!trans.swapped && k >= 0.5) { trans.swapped = true; applyDeck(trans.to); showBanner(trans.to); }
    world.position.y = trans.swapped ? trans.dir * trans.D * (1 - p) : -trans.dir * trans.D * p;
    veil.style.opacity = (Math.sin(Math.PI * k) ** 2).toFixed(3);
    if (k >= 1) { trans = null; world.position.y = 0; veil.style.opacity = 0; }
  }
  function endTransition() {
    if (!trans) return;
    if (!trans.swapped) applyDeck(trans.to);
    trans = null; world.position.y = 0; veil.style.opacity = 0;
  }
  // Shows a deck: 'upper' | 'main' | 'lower'. False when the colony has no such deck. Before the
  // first setState it only remembers the deck. { animate: false } swaps at once (still names it).
  function setDeck(d, { animate = true } = {}) {
    if (!DECKS.includes(d)) return false;
    if (!full) { deck = d; return true; }
    if (!hasDeck(full, d)) return false;
    if (trans) endTransition();
    if (d === deck) return true;
    const dir = DECKS.indexOf(d) < DECKS.indexOf(deck) ? 1 : -1;
    hover = null; updateHover();
    if (!animate) { applyDeck(d); showBanner(d); return true; }
    anim = null; glide = null; stopMomentum();
    trans = { t0: performance.now(), dur: TRANS_MS, dir, to: d, D: Math.max(5, offset().length() * 0.45), swapped: false };
    return true;
  }
  // ▲ / ▼ and PageUp / PageDown: the game's callback when given, else one deck that way.
  function stepDeckBy(dir) {
    if (!full) return false;
    if (onDeck) { onDeck(dir); return true; }
    const k = DECKS.indexOf(trans && !trans.swapped ? trans.to : deck) - dir;
    return k >= 0 && k < DECKS.length ? setDeck(DECKS[k]) : false;
  }

  // Writes the overlay (caller's values, else our own) into the per-tile texture the terrain samples.
  function showOverlay() {
    OV.uOverlayOn.value = overlayName && st ? 1 : 0;
    if (!OV.uOverlayOn.value) return;
    const v = overlayValues || computeOverlay(overlayName);
    let tex = OV.uOverlay.value;
    if (!tex || tex.image.width !== W || tex.image.height !== H) {
      tex?.dispose();
      tex = OV.uOverlay.value = new THREE.DataTexture(new Uint8Array(N * 4), W, H);
      tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = tex.minFilter = THREE.NearestFilter;
      OV.uMapSize.value.set(W, H);
    }
    const d = tex.image.data;
    for (let i = 0; i < N; i++) {
      const x = v[i] > 0 ? Math.min(1, v[i]) : 0, s = x * 2, k = Math.min(1, Math.floor(s)), f = s - k, A = RAMP[k], B = RAMP[Math.min(2, k + 1)];
      for (let j = 0; j < 3; j++) d[i * 4 + j] = A[j] + (B[j] - A[j]) * f;
      d[i * 4 + 3] = x > 0 ? 255 * (0.3 + 0.35 * x) : 0;
    }
    tex.needsUpdate = true;
  }

  function setOverlay(name, values = null) {
    overlayName = name || null;
    overlayValues = name && values ? values : null;
    showOverlay();
  }

  function focus(x, y) {
    animTo({ x: x + 0.5, z: y + 0.5, dist: Math.min(camGoal().d, 45), dur: 700 });
  }

  function destroy() {
    cancelAnimationFrame(raf); ac.abort(); ro.disconnect(); controls.dispose();
    movers.dispose(); defence.dispose(); secrets.dispose(); minimap.destroy(); navPad.destroy();
    dropTerrain();
    for (const g of [terrainGroup, buildGroup, fxGroup, roadGroup, ghost.group]) clearGroup(g);
    scene.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
    for (const g of [...Object.values(UNIT), COLUMN, PLANE, ROCK, GEM]) g.dispose();
    for (const m of Object.values(KIND_MAT)) m.dispose();
    OV.uOverlay.value?.dispose();
    clearTimeout(bannerTimer); veil.remove(); banner.remove();
    renderer.dispose(); canvas.remove(); st = null; full = null;
  }

  // Mover time: 0 paused (everything freezes), 1, 2, 4 (movers hurry, SimCity style). Until this is
  // called the movers follow state.speed. The guardians and the raid animation (defence.js) run on
  // the same clock.
  const setSpeed = (s) => movers.setSpeed(s);

  // Version 2: the minimap and the camera buttons (both on unless opts.minimap / opts.navButtons
  // is false), the wheel mode ('auto' guesses trackpad or mouse; 'zoom' / 'pan' force one), the
  // camera moves the buttons make (nav(name): 'zoomIn' | 'zoomOut' | 'rotateLeft' | 'rotateRight' |
  // 'tiltUp' | 'tiltDown' | 'home'), and home() = nav('home').
  const setMinimap = (on) => { minimap.setVisible(on); };
  const setNavButtons = (on) => { navPad.setVisible(!!on); };
  const setWheelMode = (m) => { wheelMode = ['auto', 'zoom', 'pan'].includes(m) ? m : 'auto'; };
  const home = () => nav('home');

  // `debug` is for dev pages and tests only (colony-view-test.html), not part of the contract.
  // Version 4: setDeck(deck, { animate }) and the current deck (view.deck); DECKS / DECK_INFO are
  // exported for the interface's names.
  return { setState, refresh, setOverlay, setGhost, focus, setSnap, setSpeed, destroy, setMinimap, setNavButtons, setWheelMode, nav, home, setDeck, setDayNight,
    get deck() { return deck; },
    debug: {
      // the deck change held at progress k (0..1) for a screenshot mid-move (k = 1 finishes it);
      // false if no change runs
      deckAt(k) { if (!trans) return false; const now = performance.now(); trans.hold = k < 1; trans.t0 = now - k * trans.dur; stepTransition(now); return true; },
      // version 8: hold the time of day (0 noon, 0.25 dusk, 0.5 midnight; null lets it run); dayNight() reads it
      setDayTime(p) { dn.hold = p == null ? null : ((+p % 1) + 1) % 1; },
      dayNight: () => ({ on: dn.on, clock: dn.clock, night: dn.night, hold: dn.hold }),
      deckState: () => st, world, rebuildMs, scene, camera, controls, renderer, placeCamera, pick, movers, defence, secrets, minimap, navPad, footprint, wheelKind: () => (gest.pad ? 'trackpad' : 'mouse'),
      // n camera steps of 1/60 s now, without rendering (tests on slow software GL)
      setRender(on) { dbg.noRender = !on; },
      tick(n = 1) { for (let k = 0; k < n && st; k++) stepCamera(1 / 60, performance.now()); if (st && minimap.visible) minimap.frame(footprint(), [controls.target.x, controls.target.z], deckMarks()); },
      // n seconds of guardian / raid time now, ignoring the speed (tests on slow software GL)
      advanceDefence(sec) { defence.advance(sec); if (st && minimap.visible) minimap.frame(footprint(), [controls.target.x, controls.target.z], deckMarks()); },
      // n seconds of the secrets' time now (drone patrols, skirmishes, pulses), ignoring the speed
      advanceSecrets(sec) { secrets.advance(sec); if (st && minimap.visible) minimap.frame(footprint(), [controls.target.x, controls.target.z], deckMarks()); },
      // draw one frame now (with setRender(false), for a screenshot)
      render() { for (const p of pools.values()) p.flush(); renderer.render(scene, camera); } } };
}
