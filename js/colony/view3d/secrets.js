// The secrets of Eden in the 3D view (docs/COLONY-V4.md "Stage 2 build contract", View): the
// discoveries the survey turned up, drawn on the deck on show. Like movers.js and defence.js it is
// VISUAL only: it reads state.secrets (sites, dangers, read) and the chambers on refresh() and
// never writes anything back.
//
//   * shown: sites with `found` on the current deck, and dangers whose chamber is on the current
//     deck and has been surveyed (not `sealed` or `surveying`), or that carry `found`
//   * log terminals: a small console with a glowing cyan screen, a light pool and a faint beacon;
//     dim (no beacon) once state.secrets.read holds its ref
//   * vault doors: a round door in a wall stub with a gold frame and a red lamp; when `done` the
//     door stands swung aside, the vault glows gold inside and a gold light falls out (the final
//     vault is larger)
//   * survivors: a little camp (tent, crates, a fire, a lantern) with a few people round it, until
//     the group joins (`done`)
//   * dangers: drones patrol their chamber as red-eyed sentries with red searchlights (more for a
//     stronger guard) until done; toxic chambers lie under a drifting green haze, radiation ones
//     under a violet shimmer with flickering lamp posts (both thin out while crews work); the
//     reactor is a pulsing red core in its cage, faster as its deadline nears, its rings cyan while
//     a crew stabilises it, calm and blue once done, a dull ember if it burned out (`failed`);
//     flooded chambers already draw as marsh
//   * a drone skirmish: when a drone danger turns `done` (or its strength drops: a fight that only
//     drove them back), guardians fly in from the deck's nearest Lift (else a gate) and shoot it
//     out with the sentries, with defence.js's craft models and effects; seen on the deck on show,
//     or when that deck is shown within a day of the fight
//   * minimap marks (marks()): cyan logs (dim once read), gold vaults (a ring once open), white
//     survivors, red dangers (the reactor larger, blue once done, dark once burned out)
//   * cost: the static parts (terminals, doors, camps, reactor cages, lamps, the haze planes and
//     its W×H mask texture) are rebuilt only when the secrets' signature changes; per frame only a
//     few dozen instances move or pulse. Ambient pulses run while the speed is above 0; drones,
//     people and skirmishes run on the movers' speed (0 freezes everything)
import * as THREE from 'three';
import { T } from '../data/terrain.js';
import { SURVIVORS, VAULTS } from '../data/secrets.js';
import { model, moverMaterial } from './movers.js';
import { MODELS as CRAFT, SCALE as CRAFT_SCALE, CLS_RGB, BEAM_RGB, FIRE, SMOKE, clsOf, FLIERS, Particles } from './defence.js';

// ---- tuning ----------------------------------------------------------------------------------

const CAP = { terminal: 40, vaultShut: 12, vaultOpen: 12, camp: 8, person: 48, drone: 64, reactor: 2, lamp: 96, pools: 240, beacons: 48, haze: 64, guards: 8, sparks: 500, smoke: 180, beams: 80 };
const FIGHT = { won: 6.4, repelled: 4.8, tail: 3.2 };           // guardians retreat at, then fly home for
const DRONE = { hover: 1.05, speed: 1.5, reach: 7 };
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const RGB = {
  screen: [0.45, 1.05, 1.1], screenRead: [0.06, 0.2, 0.24], logPool: lin('#38d8ff'), logRead: lin('#0e3a48'),
  lampShut: [1.0, 0.16, 0.08], lampOpen: [0.3, 1.0, 0.45], vaultPool: lin('#ffc04a'),
  lantern: lin('#ffb84a'), drone: lin('#ff2a18'), reactor: [1.0, 0.09, 0.04], reactorDone: [0.22, 0.55, 1.0], reactorWork: [0.3, 0.95, 1.0], reactorDead: [0.42, 0.1, 0.03],
  radLamp: [1.3, 1.05, 1.5], radPool: lin('#a46aff'),
};
const TENTS = ['#a08a5a', '#7a8a5a', '#8a6a4a', '#6a7a8a', '#9a7a5a'].map(lin);
const RAGS = ['#8a5a4a', '#5a6a8a', '#8a8a6a', '#6a7a5a', '#9a6a5a', '#7a6a8a'].map(lin);
const HALF = Math.PI / 2;
const HIDDEN = new Set(['sealed', 'surveying']);   // a chamber not yet surveyed hides its danger
const POP = Object.fromEntries(SURVIVORS.map((s) => [s.id, s.pop]));
const FINAL = new Set(VAULTS.filter((v) => v.reward?.final).map((v) => v.id));
const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const strHash = (s) => { let h = 7; for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619); return h; };
const rnd = Math.random;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---- models (movers.js model(): `tint` parts take the instance colour, `glow` parts are unlit) ---

// A log terminal ~1.2 tall, its screen facing +z: plinth, body, a sloped keyboard, a tilted
// screen and an antenna light (screen, keys, kick strip and light take the instance colour).
const TERMINAL = () => model([
  { s: 'box', size: [0.56, 0.08, 0.44], pos: [0, 0.04, 0], c: '#2a2f36' },
  { s: 'box', size: [0.4, 0.46, 0.28], pos: [0, 0.31, -0.02], c: '#5d6670' },
  { s: 'box', size: [0.42, 0.035, 0.3], pos: [0, 0.11, -0.02], c: '#ffffff', tint: 1, glow: 1 },
  { s: 'box', size: [0.44, 0.05, 0.2], pos: [0, 0.55, 0.12], rot: [0.35, 0, 0], c: '#454c55' },
  { s: 'box', size: [0.36, 0.012, 0.12], pos: [0, 0.578, 0.128], rot: [0.35, 0, 0], c: '#ffffff', tint: 1, glow: 1 },
  { s: 'box', size: [0.5, 0.36, 0.09], pos: [0, 0.78, -0.06], rot: [-0.22, 0, 0], c: '#3a4149' },
  { s: 'box', size: [0.42, 0.28, 0.02], pos: [0, 0.79, -0.012], rot: [-0.22, 0, 0], c: '#ffffff', tint: 1, glow: 1 },
  { s: 'cyl', r: 0.012, h: 0.26, seg: 5, pos: [0.2, 1.04, -0.1], c: '#9aa3ad' },
  { s: 'ball', r: 0.032, seg: 6, pos: [0.2, 1.18, -0.1], c: '#ffffff', tint: 1, glow: 1 },
]);
// A vault: a wall stub with pilasters and a gold ring round a round door, facing +z.
const VAULT_WALL = [
  { s: 'box', size: [1.5, 1.24, 0.42], pos: [0, 0.62, -0.1], c: '#4a5058' },
  { s: 'box', size: [1.64, 0.12, 0.52], pos: [0, 1.29, -0.1], c: '#353a41' },
  { s: 'box', size: [1.64, 0.1, 0.56], pos: [0, 0.05, -0.08], c: '#2c3036' },
  ...[-0.66, 0.66].map((x) => ({ s: 'box', size: [0.14, 1.14, 0.48], pos: [x, 0.62, -0.08], c: '#3a3f46' })),
  ...[-0.66, 0.66].map((x) => ({ s: 'box', size: [0.15, 0.1, 0.49], pos: [x, 1.08, -0.08], c: '#d8b02a' })),
  { s: 'torus', r: 0.5, tube: 0.075, seg: 22, pos: [0, 0.64, 0.12], c: '#c9a24a' },
  ...Array.from({ length: 8 }, (_, k) => ({ s: 'ball', r: 0.028, seg: 5, pos: [0.6 * Math.cos(k * Math.PI / 4), 0.64 + 0.6 * Math.sin(k * Math.PI / 4), 0.12], c: '#e8c86a' })),
  { s: 'ball', r: 0.05, seg: 6, pos: [0.66, 1.2, 0.18], c: '#ffffff', tint: 1, glow: 1 },          // status lamp
  { s: 'box', size: [0.12, 0.16, 0.03], pos: [-0.5, 0.66, 0.13], c: '#22262c' },                   // keypad
  { s: 'box', size: [0.08, 0.1, 0.01], pos: [-0.5, 0.67, 0.148], c: '#ffffff', tint: 1, glow: 1 },
];
const VAULT_SHUT = () => model([
  ...VAULT_WALL,
  { s: 'cyl', r: 0.46, h: 0.14, seg: 22, rot: [HALF, 0, 0], pos: [0, 0.64, 0.15], c: '#8a929c' },
  { s: 'cyl', r: 0.3, h: 0.04, seg: 18, rot: [HALF, 0, 0], pos: [0, 0.64, 0.235], c: '#6a727c' },
  { s: 'torus', r: 0.17, tube: 0.022, seg: 14, pos: [0, 0.64, 0.27], c: '#c9ced6' },
  ...[0, 1, 2].map((k) => ({ s: 'box', size: [0.36, 0.03, 0.03], rot: [0, 0, k * Math.PI / 3], pos: [0, 0.64, 0.27], c: '#c9ced6' })),
]);
// Open: the door swung out on its hinge (axis along x), the vault behind it lit gold.
const VAULT_OPEN = () => model([
  ...VAULT_WALL,
  { s: 'cyl', r: 0.44, h: 0.02, seg: 22, rot: [HALF, 0, 0], pos: [0, 0.64, 0.105], c: '#ffd27a', glow: 1 },
  { s: 'cyl', r: 0.2, h: 0.02, seg: 16, rot: [HALF, 0, 0], pos: [0, 0.64, 0.115], c: '#fff4d8', glow: 1 },
  { s: 'cyl', r: 0.46, h: 0.14, seg: 22, rot: [0, 0, HALF], pos: [0.56, 0.64, 0.6], c: '#8a929c' },
  { s: 'cyl', r: 0.3, h: 0.04, seg: 18, rot: [0, 0, HALF], pos: [0.645, 0.64, 0.6], c: '#6a727c' },
  { s: 'torus', r: 0.17, tube: 0.022, seg: 14, rot: [0, HALF, 0], pos: [0.68, 0.64, 0.6], c: '#c9ced6' },
  { s: 'box', size: [0.1, 0.5, 0.08], pos: [0.52, 0.64, 0.16], c: '#5d6670' },                     // hinge
]);
// A survivors' camp ~1.3 across: a tent (instance colour), a bedroll, crates, a fire ring with
// embers and a lantern on a post.
const CAMP = () => model([
  { s: 'cone', r: 0.44, h: 0.52, seg: 4, spin: Math.PI / 4, pos: [-0.22, 0.26, -0.24], c: '#ffffff', tint: 1 },
  { s: 'box', size: [0.16, 0.24, 0.02], pos: [-0.22, 0.12, 0.07], rot: [-0.5, 0, 0], c: '#2a2420' },
  { s: 'cyl', r: 0.05, h: 0.32, seg: 6, rot: [0, 0, HALF], pos: [0.24, 0.05, -0.36], c: '#5a6a8a' },
  { s: 'box', size: [0.2, 0.18, 0.2], pos: [0.42, 0.09, -0.12], c: '#8a6a3a' },
  { s: 'box', size: [0.15, 0.13, 0.15], pos: [0.44, 0.245, -0.14], rot: [0, 0.4, 0], c: '#9a7a46' },
  { s: 'box', size: [0.18, 0.12, 0.14], pos: [0.48, 0.06, 0.12], rot: [0, -0.3, 0], c: '#6a5a3a' },
  { s: 'torus', r: 0.12, tube: 0.032, seg: 9, rot: [HALF, 0, 0], pos: [0.06, 0.03, 0.22], c: '#4a4440' },
  { s: 'ball', r: 0.065, seg: 6, scale: [1, 0.6, 1], pos: [0.06, 0.04, 0.22], c: '#ff7a2a', glow: 1 },
  { s: 'cone', r: 0.04, h: 0.1, seg: 5, pos: [0.06, 0.1, 0.22], c: '#ffd04a', glow: 1 },
  { s: 'cyl', r: 0.014, h: 0.54, seg: 5, pos: [-0.5, 0.27, 0.32], c: '#6a6058' },
  { s: 'box', size: [0.12, 0.014, 0.014], pos: [-0.45, 0.53, 0.32], c: '#6a6058' },
  { s: 'ball', r: 0.055, seg: 6, pos: [-0.4, 0.47, 0.32], c: '#ffd36a', glow: 1 },
  { s: 'cone', r: 0.05, h: 0.04, seg: 6, pos: [-0.4, 0.53, 0.32], c: '#3a3530' },
]);
// A survivor ~0.16 tall (movers.js's person: legs, a shirt in the instance colour, a head).
const PERSON = () => model([
  { s: 'box', size: [0.035, 0.065, 0.055], pos: [0, 0.0325, 0], c: '#34394a' },
  { s: 'box', size: [0.045, 0.06, 0.072], pos: [0, 0.093, 0], c: '#ffffff', tint: 1 },
  { s: 'ball', r: 0.027, seg: 6, pos: [0.003, 0.145, 0], c: '#f0c8a0' },
]);
// A Directorate sentry ~0.5 long facing +x: a dark armoured pod, one big red eye, fins, guns,
// an antenna light and a red thruster ring underneath.
const SENTRY = () => model([
  { s: 'ball', r: 0.2, seg: 10, scale: [1.25, 0.72, 1], c: '#33373e' },
  { s: 'box', size: [0.5, 0.05, 0.34], pos: [-0.02, 0, 0], c: '#4b2a2e' },
  { s: 'cyl', r: 0.11, r2: 0.14, h: 0.06, seg: 8, pos: [-0.02, 0.15, 0], c: '#2a2d33' },
  { s: 'box', size: [0.025, 0.18, 0.025], pos: [-0.12, 0.27, 0], c: '#9aa3ad' },
  { s: 'ball', r: 0.025, seg: 5, pos: [-0.12, 0.37, 0], c: '#ff3a2a', glow: 1 },
  { s: 'cyl', r: 0.1, h: 0.03, seg: 10, rot: [0, 0, HALF], pos: [0.2, 0.01, 0], c: '#16181c' },
  { s: 'ball', r: 0.075, seg: 8, pos: [0.22, 0.01, 0], c: '#ff2418', glow: 1 },
  ...[1, -1].flatMap((k) => [
    { s: 'box', size: [0.22, 0.03, 0.16], pos: [-0.12, 0, k * 0.24], rot: [k * 0.3, 0, 0], c: '#2a2d33' },
    { s: 'ball', r: 0.024, seg: 5, pos: [0.16, 0.035, k * 0.1], c: '#ff5a3a', glow: 1 },
    { s: 'box', size: [0.2, 0.025, 0.025], pos: [0.18, -0.09, k * 0.06], c: '#9aa3ad' },
  ]),
  { s: 'torus', r: 0.12, tube: 0.016, seg: 12, rot: [HALF, 0, 0], pos: [0, -0.12, 0], c: '#ff3a2a', glow: 1 },
]);
// The old core's cage ~2.7 across: a base, a hazard ring, four pylons and two containment rings
// (instance colour: red, cyan while stabilised, blue once done); the core itself is drawn apart.
const REACTOR = () => model([
  { s: 'cyl', r: 1.35, h: 0.22, seg: 24, pos: [0, 0.11, 0], c: '#3a3f46' },
  { s: 'cyl', r: 1.1, h: 0.08, seg: 24, pos: [0, 0.26, 0], c: '#2a2e33' },
  { s: 'torus', r: 1.24, tube: 0.04, seg: 32, rot: [HALF, 0, 0], pos: [0, 0.23, 0], c: '#d8b02a' },
  { s: 'cyl', r: 0.62, r2: 0.5, h: 0.24, seg: 16, pos: [0, 0.42, 0], c: '#2a2e33' },
  ...[0, 1, 2, 3].flatMap((k) => {
    const a = Math.PI / 4 + k * HALF, x = 0.92 * Math.cos(a), z = 0.92 * Math.sin(a);
    return [
      { s: 'box', size: [0.2, 2.0, 0.2], pos: [x, 1.2, z], rot: [0, -a, 0], c: '#5d6670' },
      { s: 'box', size: [0.24, 0.1, 0.24], pos: [x, 2.25, z], rot: [0, -a, 0], c: '#ffffff', tint: 1, glow: 1 },
      { s: 'box', size: [0.22, 0.12, 0.22], pos: [x, 0.3, z], rot: [0, -a, 0], c: '#d8b02a' },
    ];
  }),
  { s: 'torus', r: 0.92, tube: 0.06, seg: 28, rot: [HALF, 0, 0], pos: [0, 0.78, 0], c: '#ffffff', tint: 1, glow: 1 },
  { s: 'torus', r: 0.92, tube: 0.06, seg: 28, rot: [HALF, 0, 0], pos: [0, 1.95, 0], c: '#ffffff', tint: 1, glow: 1 },
  { s: 'cyl', r: 0.56, r2: 0.72, h: 0.18, seg: 16, pos: [0, 2.3, 0], c: '#2a2e33' },
  { s: 'cyl', r: 0.12, h: 0.5, seg: 8, pos: [0, 2.6, 0], c: '#5d6670' },
]);
// A lamp post in a radiation chamber: its head (instance colour) flickers; a yellow warning sign.
const LAMP = () => model([
  { s: 'box', size: [0.18, 0.06, 0.18], pos: [0, 0.03, 0], c: '#2a2f36' },
  { s: 'cyl', r: 0.03, h: 1.0, seg: 6, pos: [0, 0.5, 0], c: '#5d6670' },
  { s: 'box', size: [0.28, 0.05, 0.12], pos: [0.08, 1.02, 0], c: '#3a4149' },
  { s: 'box', size: [0.24, 0.03, 0.09], pos: [0.08, 0.99, 0], c: '#ffffff', tint: 1, glow: 1 },
  { s: 'box', size: [0.02, 0.16, 0.16], pos: [0.04, 0.62, 0], rot: [Math.PI / 4, 0, 0], c: '#e8c02a' },
  { s: 'ball', r: 0.03, seg: 5, pos: [0.055, 0.62, 0], c: '#1a1a1a' },
]);

// ---- shaders: additive light pools and beacons, the haze ------------------------------------

const INST_VERT = `varying vec2 vUv; varying vec3 vCol;
  void main() { vUv = uv; vCol = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vCol = instanceColor;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`;
const additive = (frag, side = THREE.FrontSide) => new THREE.ShaderMaterial({ vertexShader: INST_VERT, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side });
// soft round pool of light on the floor (PLANE, uv 0..1)
const poolMaterial = () => additive(`varying vec2 vUv; varying vec3 vCol;
  void main() { float d = length(vUv - 0.5) * 2.0; float a = clamp(1.0 - d, 0.0, 1.0); a = a * a * (0.6 + 0.4 * a); gl_FragColor = vec4(vCol * a, 1.0); }`);
// a column of light fading upwards (open cylinder, uv.y 0 at its foot)
const beaconMaterial = () => additive(`varying vec2 vUv; varying vec3 vCol;
  void main() { float a = pow(1.0 - vUv.y, 1.7); gl_FragColor = vec4(vCol * a, 1.0); }`, THREE.DoubleSide);
// a drone's searchlight: an open cone from the eye to the floor, brightest at the drone
const coneMaterial = () => additive(`varying vec2 vUv; varying vec3 vCol;
  void main() { float a = 0.2 + 0.8 * vUv.y * vUv.y; gl_FragColor = vec4(vCol * a, 1.0); }`, THREE.DoubleSide);
// The haze: horizontal planes over the hazard chambers; a W×H mask (R toxic, G radiation, blurred
// so it fades at the walls) says where, drifting value noise says how thick. aLayer staggers the
// layers' drift. Toxic: green murk (normal blending); radiation: violet shimmer and sparkles (additive).
const HAZE_VERT = `attribute float aLayer; varying vec2 vXZ; varying float vLayer;
  void main() { vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vXZ = (instanceMatrix * vec4(position, 1.0)).xz; vLayer = aLayer;
    gl_Position = projectionMatrix * viewMatrix * wp; }`;
const HAZE_FRAG = (rad) => `uniform sampler2D uMask; uniform vec2 uMapSize; uniform float uTime; uniform vec3 uColor; uniform float uAlpha;
  varying vec2 vXZ; varying float vLayer;
  float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n1(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), u.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), u.x), u.y); }
  float fbm(vec2 p) { return 0.55 * n1(p) + 0.3 * n1(p * 2.03 + 7.1) + 0.15 * n1(p * 4.01 + 3.3); }
  void main() {
    vec4 m = texture(uMask, vXZ / uMapSize);
    float k = ${rad ? 'm.g' : 'm.r'};
    if (k < 0.02) discard;
    vec2 drift = vec2(uTime * 0.07, uTime * 0.04) * (1.0 + 0.6 * vLayer);
    float f = fbm(vXZ * 0.28 + drift + vLayer * 13.7);
    float g = fbm(vXZ * 0.9 - drift * 1.7 + 5.0);
    ${rad
    ? `float sh = smoothstep(0.35, 0.85, f) * (0.55 + 0.45 * sin(uTime * 3.1 + g * 9.0));
    vec2 cell = floor(vXZ * 4.0); float tw = h1(cell + floor(uTime * 5.0 + h1(cell) * 7.0));
    vec2 q = fract(vXZ * 4.0) - 0.5; float sp = step(0.94, tw) * smoothstep(0.22, 0.0, length(q));
    gl_FragColor = vec4((uColor * sh * uAlpha + vec3(0.85, 0.7, 1.0) * sp * 0.9) * k, 1.0);`
    : `float a = smoothstep(0.3, 0.92, f * 0.8 + g * 0.3) * uAlpha * k;
    gl_FragColor = vec4(uColor * (0.65 + 0.55 * g), a);`}
  }`;

// ================================================================================================

export function createSecrets(parent, helpers = {}) {
  const group = new THREE.Group();
  group.name = 'secrets';
  parent.add(group);
  const mat = moverMaterial();
  const geos = { terminal: TERMINAL(), vaultShut: VAULT_SHUT(), vaultOpen: VAULT_OPEN(), camp: CAMP(), person: PERSON(), drone: SENTRY(), reactor: REACTOR(), lamp: LAMP() };
  const craftGeo = Object.fromEntries(['hu', 'planes', 'armour', 'ships', 'support'].map((k) => [k, CRAFT[k]()]));
  const inst = (geo, material, cap, name, color = true) => {
    const m = new THREE.InstancedMesh(geo, material, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (color) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    m.frustumCulled = false; m.count = 0; m.name = 'secrets-' + name;
    group.add(m);
    return m;
  };
  const M = {};
  for (const k of Object.keys(geos)) M[k] = inst(geos[k], mat, CAP[k], k);
  const G = {};
  for (const k of Object.keys(craftGeo)) G[k] = inst(craftGeo[k], mat, CAP.guards, 'guard-' + k);
  const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-HALF);
  const COLUMN = new THREE.CylinderGeometry(0.5, 0.5, 1, 14, 1, true).translate(0, 0.5, 0);
  const BALL = new THREE.IcosahedronGeometry(0.5, 2), boxGeo = new THREE.BoxGeometry(1, 1, 1), puff = new THREE.IcosahedronGeometry(0.5, 1);
  const poolMat = poolMaterial(), beaconMat = beaconMaterial(), coneMat = coneMaterial();
  const CONE = new THREE.ConeGeometry(0.5, 1, 14, 1, true).translate(0, 0.5, 0);
  const pools = inst(PLANE, poolMat, CAP.pools, 'pools'); pools.renderOrder = 4;
  const beacons = inst(COLUMN, beaconMat, CAP.beacons, 'beacons'); beacons.renderOrder = 5;
  const cones = inst(CONE, coneMat, CAP.drone, 'searchlights'); cones.renderOrder = 5;
  const coreMat = new THREE.MeshBasicMaterial(), haloMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = inst(BALL, coreMat, CAP.reactor, 'core'), halo = inst(BALL, haloMat, CAP.reactor * 2, 'halo');
  halo.renderOrder = 5;
  // the haze
  const maskTex = { value: null }, mapSize = { value: new THREE.Vector2(1, 1) }, hazeTime = { value: 0 };
  const hazeMat = (rad) => new THREE.ShaderMaterial({
    uniforms: { uMask: maskTex, uMapSize: mapSize, uTime: hazeTime, uColor: { value: new THREE.Color(rad ? '#7a46e8' : '#86d84a') }, uAlpha: { value: rad ? 0.3 : 0.46 } },
    vertexShader: HAZE_VERT, fragmentShader: HAZE_FRAG(rad), transparent: true, depthWrite: false,
    blending: rad ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
  });
  const hazeMesh = (rad) => {
    const m = inst(PLANE, hazeMat(rad), CAP.haze, rad ? 'radiation' : 'toxic', false);
    m.geometry = PLANE.clone();
    m.geometry.setAttribute('aLayer', new THREE.InstancedBufferAttribute(new Float32Array(CAP.haze), 1));
    m.renderOrder = 3;
    return m;
  };
  const toxic = hazeMesh(false), rad = hazeMesh(true);
  // skirmish effects (defence.js's: additive sparks, smoke puffs, beams)
  const addMat = () => new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparkMat = addMat(), beamMat = addMat(), smokeMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.56, depthWrite: false });
  const sparks = new Particles(group, puff, sparkMat, CAP.sparks, false), smoke = new Particles(group, puff, smokeMat, CAP.smoke, true);
  sparks.mesh.renderOrder = 6; smoke.mesh.renderOrder = 5;
  const beamMesh = inst(boxGeo, beamMat, CAP.beams, 'beams'); beamMesh.renderOrder = 6;

  let st = null, W = 0, H = 0, terrTop = null, deck = 'main', sig = '', seeded = false, built = 0;
  let sites = [];        // { kind, x, z, y, read, done, final, ph, ... } of the deck on show
  let reactors = [];     // { x, z, y, chamber, done, work, deadline, phase }
  let lamps = [];        // radiation lamp posts { x, z, y, k, t, ph }
  let camps = [];        // { x, z, y, people: [{ a, r, ph, walk, rgb }] }
  let markCache = { sites: [], dangers: [], ssig: '' };
  const patrols = new Map();    // chamber id → { tiles, drones: [actor], want, engaged }
  const prev = new Map();       // danger key → { done, strength } (every deck), for the skirmish
  const queued = new Map();     // chamber id → { day, outcome } fights not yet shown
  let fights = [];
  const beams = [];
  let clock = 0, amb = 0, speed = 1, drawn = false;
  const stats = { builds: 0, fights: 0 };

  const top = (x, z) => { const xi = clamp(Math.floor(x), 0, W - 1), zi = clamp(Math.floor(z), 0, H - 1); return Math.max(0, terrTop[zi * W + xi]); };
  const roof = (x, z) => { const xi = clamp(Math.floor(x), 0, W - 1), zi = clamp(Math.floor(z), 0, H - 1); return helpers.topAt ? helpers.topAt(xi, zi) : top(x, z); };
  const freeAt = helpers.freeAt || (() => true);
  const chamberOn = (id) => (st.chambers || []).find((c) => c.id === id) || null;
  const dangerShown = (d, c) => !!c && (d.found === true || !HIDDEN.has(c.status));
  const siteDeck = (s) => s.deck || (st.chambers || []).find((c) => c.id === s.chamber)?.deck || 'main';
  const siteShown = (s) => !!s.found && siteDeck(s) === deck && s.x >= 0 && s.y >= 0 && s.x < W && s.y < H;
  const tilesOf = (c) => {
    const out = [];
    for (let y = Math.max(0, c.y0); y <= Math.min(H - 1, c.y1); y++) for (let x = Math.max(0, c.x0); x <= Math.min(W - 1, c.x1); x++) {
      const i = y * W + x;
      if (st.map.ch[i] === c.id && st.map.t[i] !== T.SHAFT) out.push(i);
    }
    return out;
  };
  const centreOf = (tiles) => { let sx = 0, sz = 0; for (const i of tiles) { sx += i % W; sz += (i / W) | 0; } const n = Math.max(1, tiles.length); return [sx / n + 0.5, sz / n + 0.5]; };
  const droneCount = (d) => clamp(Math.round((d.strength ?? 600) / 150), 1, 7);
  const days = { toxic: 6, radiation: 10, reactor: 12 };
  const thin = (d) => (d.work > 0 ? 0.3 + 0.7 * clamp(d.work / (days[d.kind] || 8), 0, 1) : 1);

  function signature() {
    const S = st.secrets;
    if (!S) return deck + '|none';
    const read = new Set(S.read || []), out = [deck, W, H];
    for (const s of S.sites || []) if (siteShown(s)) out.push(`${s.id}@${s.x},${s.y}${s.done ? 'd' : ''}${s.kind === 'log' && read.has(s.ref) ? 'r' : ''}`);
    for (const d of S.dangers || []) {
      const c = chamberOn(d.chamber);
      if (dangerShown(d, c)) out.push(`${d.chamber}:${d.kind}${d.done ? 'd' : ''}:${Math.round(d.strength || 0)}:${d.deadline ?? ''}:${d.work || 0}`);
    }
    out.push(helpers.occSig ? helpers.occSig() : '');
    return out.join('|');
  }

  // ---- the static parts: rebuilt when the signature changes -------------------------------------

  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(0, 0, 0, 'YZX'), v4 = new THREE.Vector3(), s4 = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), d4 = new THREE.Vector3();
  const place = (mesh, x, y, z, yaw, k, rgb, sy = k) => {
    const i = mesh.count;
    if (i >= mesh.instanceMatrix.count) return -1;
    mesh.count++;
    m4.compose(v4.set(x, y, z), q4.setFromEuler(e4.set(0, yaw, 0)), s4.set(k, sy, k)).toArray(mesh.instanceMatrix.array, i * 16);
    if (rgb && mesh.instanceColor) mesh.instanceColor.array.set(rgb, i * 3);
    return i;
  };
  // the nearest tile to (cx, cz) in `tiles` with an n×n free block round it (else the nearest tile)
  function spotNear(tiles, cx, cz, n, taken) {
    const inside = new Set(tiles);
    let best = null, bd = Infinity, fallback = null, fd = Infinity;
    for (const i of tiles) {
      const x = i % W, z = (i / W) | 0, d = (x + 0.5 - cx) ** 2 + (z + 0.5 - cz) ** 2;
      if (d < fd) { fd = d; fallback = i; }
      if (d >= bd) continue;
      let ok = true;
      const h = n >> 1;
      for (let dz = -h; dz <= h && ok; dz++) for (let dx = -h; dx <= h && ok; dx++) {
        const j = (z + dz) * W + x + dx;
        if (!inside.has(j) || !freeAt(j) || taken?.has(j)) ok = false;
      }
      if (ok) { bd = d; best = i; }
    }
    return best ?? fallback;
  }

  function build() {
    stats.builds++; built++;
    drawn = false;
    for (const k of Object.keys(M)) M[k].count = 0;
    toxic.count = 0; rad.count = 0; beacons.count = 0;
    const oldReactors = reactors;
    sites = []; reactors = []; lamps = []; camps = [];
    const S = st.secrets, mk = { sites: [], dangers: [], ssig: '' };
    if (!S) { patrols.clear(); markCache = mk; flushStatic(); return; }
    const read = new Set(S.read || []), taken = new Set();
    for (const s of S.sites || []) {
      if (!siteShown(s)) continue;
      const i = s.y * W + s.x, x = s.x + 0.5, z = s.y + 0.5, y = Math.max(0, terrTop[i]), h = hash(strHash(String(s.id)), 3);
      taken.add(i);
      if (s.kind === 'log') {
        const isRead = read.has(s.ref);
        place(M.terminal, x, y, z, (h - 0.5) * 0.5, 1.15, isRead ? RGB.screenRead : RGB.screen);
        sites.push({ kind: 'log', x, y, z, read: isRead, ph: h * 6.28 });
        if (!isRead) place(beacons, x, y + 0.05, z, 0, 0.5, [0.03, 0.15, 0.18], 4.2);
        mk.sites.push(s.x + 0.5, s.y + 0.5, isRead ? 1 : 0);
      } else if (s.kind === 'vault') {
        const fin = FINAL.has(s.ref), k = fin ? 1.55 : 1.05;
        place(s.done ? M.vaultOpen : M.vaultShut, x, y, z, 0, k, s.done ? RGB.lampOpen : RGB.lampShut);
        if (s.done) place(beacons, x, y + 0.05, z + 0.45 * k, 0, 0.8 * k, [0.14, 0.09, 0.025], 4.2 * k);
        sites.push({ kind: 'vault', x, y, z, done: !!s.done, final: fin, k, ph: h * 6.28 });
        mk.sites.push(s.x + 0.5, s.y + 0.5, s.done ? 3 : 2);
      } else if (s.kind === 'survivors') {
        if (s.done) continue;   // they joined the colony
        place(M.camp, x, y, z, (h - 0.5) * 0.8, 1.15, TENTS[(h * TENTS.length) | 0]);
        const n = clamp(Math.round((POP[s.ref] ?? 12) / 6), 1, 5), people = [];
        for (let k = 0; k < n; k++) people.push({ a: (k / n) * 6.28 + h * 3, r: 0.36 + 0.12 * hash(k, h * 1e4), ph: hash(k + 9, h * 1e4) * 6.28, walk: n > 2 && k === 0, rgb: RAGS[(k + ((h * 7) | 0)) % RAGS.length] });
        camps.push({ x, y, z, yaw: (h - 0.5) * 0.8, people, ph: h * 6.28 });
        sites.push({ kind: 'survivors', x, y, z, ph: h * 6.28 });
        mk.sites.push(s.x + 0.5, s.y + 0.5, 4);
      }
    }
    // dangers
    const mask = new Float32Array(W * H * 2);
    let anyHaze = false;
    const seen = new Set();
    for (const d of S.dangers || []) {
      const c = chamberOn(d.chamber);
      if (!dangerShown(d, c)) continue;
      const tiles = tilesOf(c);
      if (!tiles.length) continue;
      const [cx, cz] = centreOf(tiles);
      if (d.kind === 'reactor') {
        const i = spotNear(tiles, cx, cz, 3, taken), x = (i % W) + 0.5, z = ((i / W) | 0) + 0.5, y = Math.max(0, terrTop[i]);
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) taken.add(i + dz * W + dx);
        const old = oldReactors.find((r) => r.chamber === c.id);
        reactors.push({ x, y, z, chamber: c.id, done: !!d.done && !d.failed, failed: !!d.failed, work: d.work || 0, deadline: d.deadline, phase: old?.phase || 0 });
        mk.dangers.push(x, z, d.failed ? 3 : d.done ? 2 : 1);
        continue;
      }
      if (d.done) continue;
      mk.dangers.push(cx, cz, 0);
      if (d.kind === 'drones') {
        seen.add(c.id);
        let P = patrols.get(c.id);
        if (!P) { P = { tiles, drones: [], engaged: null }; patrols.set(c.id, P); }
        P.tiles = tiles; P.want = droneCount(d);
        if (!P.engaged) fitPatrol(P);
      } else if (d.kind === 'toxic' || d.kind === 'radiation') {
        const ch = d.kind === 'toxic' ? 0 : 1, k = thin(d);
        for (const i of tiles) mask[i * 2 + ch] = k;
        anyHaze = true;
        const hm = ch ? rad : toxic, w = c.x1 - c.x0 + 3, hh = c.y1 - c.y0 + 3, mx = (c.x0 + c.x1 + 1) / 2, mz = (c.y0 + c.y1 + 1) / 2;
        const layers = ch ? [0.32, 0.85] : [0.4, 0.95];
        let base = 0;
        for (const i of tiles) base += Math.max(0, terrTop[i]);
        base = Math.min(0.35, base / tiles.length);
        layers.forEach((ly, L) => {
          const n = hm.count;
          if (n >= CAP.haze) return;
          hm.count++;
          m4.compose(v4.set(mx, base + ly, mz), q4.identity(), s4.set(w, 1, hh)).toArray(hm.instanceMatrix.array, n * 16);
          hm.geometry.attributes.aLayer.array[n] = L;
        });
        if (ch) {   // lamp posts on a loose grid of free floor
          let n = 0;
          for (const i of tiles) {
            const x = i % W, z = (i / W) | 0;
            if ((x - c.x0) % 5 !== 2 || (z - c.y0) % 5 !== 2 || !freeAt(i) || taken.has(i) || n >= 16) continue;
            n++;
            lamps.push({ x: x + 0.5, z: z + 0.5, y: Math.max(0, terrTop[i]), yaw: hash(x, z) * 6.28, k: 1, t: rnd(), lvl: 0.6 + 0.4 * k });
          }
        }
      }
    }
    for (const id of [...patrols.keys()]) if (!seen.has(id) && !patrols.get(id).engaged) patrols.delete(id);
    for (const l of lamps) place(M.lamp, l.x, l.y, l.z, l.yaw, 1.35, RGB.radLamp);
    for (const r of reactors) place(M.reactor, r.x, r.y, r.z, 0, 1, RGB.reactor);
    if (anyHaze) writeMask(mask);
    mk.ssig = mk.sites.length || mk.dangers.length ? mk.sites.map((v) => (v * 2) | 0).join(',') + '/' + mk.dangers.map((v) => (v * 2) | 0).join(',') : '';
    markCache = mk;
    flushStatic();
  }
  function flushStatic() {
    for (const m of [...Object.values(M), toxic, rad, beacons]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    toxic.geometry.attributes.aLayer.needsUpdate = true; rad.geometry.attributes.aLayer.needsUpdate = true;
  }
  // R = toxic, G = radiation, two 3×3 box blurs so the haze fades out at the walls
  function writeMask(mask) {
    let tex = maskTex.value;
    if (!tex || tex.image.width !== W || tex.image.height !== H) {
      tex?.dispose();
      tex = maskTex.value = new THREE.DataTexture(new Uint8Array(W * H * 4), W, H);
      tex.magFilter = tex.minFilter = THREE.LinearFilter;
      mapSize.value.set(W, H);
    }
    // blur only round the hazard tiles (a box two tiles wider)
    let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
    for (let i = 0; i < W * H; i++) if (mask[i * 2] || mask[i * 2 + 1]) { const x = i % W, y = (i / W) | 0; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    bx0 = Math.max(0, bx0 - 2); by0 = Math.max(0, by0 - 2); bx1 = Math.min(W - 1, bx1 + 2); by1 = Math.min(H - 1, by1 + 2);
    let a = mask, b = new Float32Array(W * H * 2);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) for (let c = 0; c < 2; c++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = clamp(x + dx, 0, W - 1), yy = clamp(y + dy, 0, H - 1); s += a[(yy * W + xx) * 2 + c]; }
        b[(y * W + x) * 2 + c] = s / 9;
      }
      [a, b] = [b, a];
    }
    const d = tex.image.data;
    for (let i = 0; i < W * H; i++) { d[i * 4] = Math.min(255, a[i * 2] * 1.25 * 255); d[i * 4 + 1] = Math.min(255, a[i * 2 + 1] * 1.25 * 255); d[i * 4 + 2] = 0; d[i * 4 + 3] = 255; }
    tex.needsUpdate = true;
  }

  // ---- drones ---------------------------------------------------------------------------------

  function newDrone(tiles) {
    const i = tiles[(rnd() * tiles.length) | 0], x = (i % W) + 0.5, z = ((i / W) | 0) + 0.5;
    return { p: [x, roof(x, z) + DRONE.hover, z], tgt: null, wait: rnd() * 1.5, hx: Math.cos(rnd() * 6.28), hz: Math.sin(rnd() * 6.28), ph: rnd() * 6.28, alive: true, v: [0, 0, 0], cd: rnd() };
  }
  function fitPatrol(P) {
    P.drones = P.drones.filter((a) => a.alive);
    while (P.drones.length < P.want) P.drones.push(newDrone(P.tiles));
    if (P.drones.length > P.want) P.drones.length = P.want;
  }
  function pickTarget(P, a) {
    for (let k = 0; k < 12; k++) {
      const i = P.tiles[(rnd() * P.tiles.length) | 0], x = (i % W) + 0.5, z = ((i / W) | 0) + 0.5;
      if (Math.hypot(x - a.p[0], z - a.p[2]) <= DRONE.reach || k === 11) return [x, z];
    }
    return null;
  }
  function stepPatrol(P, dt) {
    for (const a of P.drones) {
      if (!a.alive) continue;
      if (a.wait > 0) {   // hover and sweep the eye round
        a.wait -= dt;
        const yaw = Math.atan2(a.hz, a.hx) + Math.sin(clock * 1.7 + a.ph) * dt * 1.6;
        a.hx = Math.cos(yaw); a.hz = Math.sin(yaw);
        if (a.wait <= 0) a.tgt = pickTarget(P, a);
      } else if (a.tgt) {
        const dx = a.tgt[0] - a.p[0], dz = a.tgt[1] - a.p[2], d = Math.hypot(dx, dz);
        if (d < 0.1) { a.tgt = null; a.wait = 0.6 + rnd() * 1.6; continue; }
        const s = Math.min(d, DRONE.speed * dt);
        a.p[0] += (dx / d) * s; a.p[2] += (dz / d) * s;
        const e = Math.min(1, dt * 4);
        a.hx += (dx / d - a.hx) * e; a.hz += (dz / d - a.hz) * e;
        const l = Math.hypot(a.hx, a.hz) || 1; a.hx /= l; a.hz /= l;
      } else a.wait = 0.3;
      const want = roof(a.p[0], a.p[2]) + DRONE.hover + 0.07 * Math.sin(clock * 2.3 + a.ph);
      a.p[1] += (want - a.p[1]) * Math.min(1, dt * 3);
    }
  }

  // ---- the skirmish ------------------------------------------------------------------------------

  function entryFor(c, cx, cz) {
    let best = null, bd = Infinity;
    for (const b of st.buildings || []) {   // a working Lift not too far off
      if (b.key !== 'lift' || b.build > 0 || b.off) continue;
      const d = Math.hypot(b.x + 1 - cx, b.y + 1 - cz);
      if (d < bd && d < 26) { bd = d; best = [b.x + 1, b.y + 1]; }
    }
    if (!best) {   // a gate in the chamber's wall
      for (let y = c.y0 - 1; y <= c.y1 + 1; y++) for (let x = c.x0 - 1; x <= c.x1 + 1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || st.map.t[y * W + x] !== T.GATE) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cz);
        if (d < bd) { bd = d; best = [x + 0.5, y + 0.5]; }
      }
    }
    if (!best) best = [cx, c.y1 + 3];
    // they arrive from that way: no further than 11 tiles out, so the fight starts soon
    const dx = best[0] - cx, dz = best[1] - cz, d = Math.hypot(dx, dz);
    if (d > 11) best = [cx + (dx / d) * 11, cz + (dz / d) * 11];
    return [best[0], Math.max(roof(best[0], best[1]), 2.2) + 2.4, best[1]];
  }
  function startFight(c, outcome) {
    const tiles = tilesOf(c);
    if (!tiles.length) return;
    const [cx, cz] = centreOf(tiles);
    let P = patrols.get(c.id);
    if (!P || !P.drones.some((a) => a.alive)) {
      const p = prev.get(c.id + ':drones');
      P = P || { tiles, drones: [], engaged: null };
      P.tiles = tiles; P.want = clamp(Math.round((p?.strength ?? 600) / 150), 1, 7);
      fitPatrol(P);
      if (outcome === 'repelled') patrols.set(c.id, P);
    }
    const drones = P.drones.filter((a) => a.alive);
    const entry = entryFor(c, cx, cz);
    const list = (st.guardians || []).filter((g) => g && !(g.hp <= 0)).slice(0, 5);
    const classes = list.length ? list.map(clsOf) : ['hu', 'planes', 'armour'];
    const guards = classes.map((cls, k) => {
      const a = (k / classes.length) * 6.28 + 0.4, r = 2.2 + (k % 2) * 1.1, flier = FLIERS.has(cls);
      const hx = cx + Math.cos(a) * r, hz = cz + Math.sin(a) * r;
      return { cls, p: [entry[0] + (rnd() - 0.5) * 1.5, entry[1] + (rnd() - 0.5) * 0.6, entry[2] + (rnd() - 0.5) * 1.5], v: [0, 0, 0], hx: 0, hz: 1,
        slot: [hx, 0, hz], flier, alt: flier ? (cls === 'ships' ? 3.2 : 2.0 + (k % 3) * 0.35) : 0.04, ph: rnd() * 6.28, cd: 0.6 + rnd() * 0.5, delay: k * 0.18, dead: false, gone: false, dieAt: Infinity };
    });
    const retreat = FIGHT[outcome] || FIGHT.won;
    const kills = outcome === 'won' ? drones.length : Math.max(1, Math.ceil(drones.length * 0.4));
    drones.forEach((a, j) => { a.dieAt = j < kills ? 1.7 + ((retreat - 2.4) * j) / Math.max(1, kills - 1) + rnd() * 0.3 : Infinity; a.wait = 0; a.tgt = null; });
    if (outcome === 'repelled' && guards.length > 1) guards[guards.length - 1].dieAt = 3.4 + rnd() * 0.4;
    P.engaged = true;
    fights.push({ chamber: c.id, outcome, t: 0, drones, guards, entry, centre: [cx, cz], retreat, P });
    stats.fights++;
    drawn = false;
  }
  function beam(a, b, rgb, w, life) {
    if (beams.length >= CAP.beams) return;
    beams.push({ a: [...a], b: [...b], rgb, w, life, max: life });
    sparks.spawn(a[0], a[1], a[2], 0, 0, 0, 0.12, w * 2.5, w * 4, rgb);
    sparks.spawn(b[0], b[1], b[2], 0, 0, 0, 0.2, w * 2, w * 6, FIRE[1]);
  }
  function explode(x, y, z, size) {
    sparks.spawn(x, y, z, 0, 0, 0, 0.18, size * 0.4, size * 1.3, FIRE[0]);
    sparks.spawn(x, y, z, 0, 0.3, 0, 0.55, size * 0.6, size * 1.9, FIRE[2]);
    for (let k = 0, n = Math.round(6 + size * 6); k < n; k++) {
      const th = rnd() * 6.28, ph = rnd() * 3.14 - 1.57, sp = (1.5 + rnd() * 3.5) * size;
      sparks.spawn(x, y, z, Math.cos(th) * Math.cos(ph) * sp, Math.sin(ph) * sp + 0.6, Math.sin(th) * Math.cos(ph) * sp, 0.35 + rnd() * 0.5, size * 0.18, size * 0.05, FIRE[1 + (k % 3)], 2.2);
    }
    for (let k = 0; k < 3 + size * 2; k++) smoke.spawn(x + (rnd() - 0.5) * size, y + rnd() * 0.3, z + (rnd() - 0.5) * size, (rnd() - 0.5) * 0.4, 0.4 + rnd() * 0.4, (rnd() - 0.5) * 0.4, 1.4 + rnd() * 1.2, size * 0.4, size * 1.3, SMOKE[k % 3], 0.6);
  }
  function seek(a, goal, sp, dt, accel = 3) {
    const dx = goal[0] - a.p[0], dy = goal[1] - a.p[1], dz = goal[2] - a.p[2], d = Math.hypot(dx, dy, dz);
    const want = d > 1e-4 ? Math.min(sp, d * 1.8) / d : 0, k = Math.min(1, dt * accel);
    a.v[0] += (dx * want - a.v[0]) * k; a.v[1] += (dy * want - a.v[1]) * k; a.v[2] += (dz * want - a.v[2]) * k;
    a.p[0] += a.v[0] * dt; a.p[1] += a.v[1] * dt; a.p[2] += a.v[2] * dt;
    const h = Math.hypot(a.v[0], a.v[2]);
    if (h > 0.3) { const e = Math.min(1, dt * 6); a.hx += (a.v[0] / h - a.hx) * e; a.hz += (a.v[2] / h - a.hz) * e; const l = Math.hypot(a.hx, a.hz) || 1; a.hx /= l; a.hz /= l; }
    return d;
  }
  const face = (a, q, dt) => { const dx = q[0] - a.p[0], dz = q[2] - a.p[2], l = Math.hypot(dx, dz); if (l < 1e-3) return; const e = Math.min(1, dt * 6); a.hx += (dx / l - a.hx) * e; a.hz += (dz / l - a.hz) * e; const n = Math.hypot(a.hx, a.hz) || 1; a.hx /= n; a.hz /= n; };
  function nearest(list, p) {
    let best = null, bd = Infinity;
    for (const u of list) { if (!u.alive && u.alive !== undefined || u.dead || u.gone) continue; const d = (u.p[0] - p[0]) ** 2 + (u.p[2] - p[2]) ** 2; if (d < bd && rnd() < 0.9) { bd = d; best = u; } }
    return best;
  }
  function stepFight(F, dt) {
    F.t += dt;
    const t = F.t, live = F.drones.filter((a) => a.alive), ctr = F.centre;
    for (let k = 0; k < F.guards.length; k++) {
      const g = F.guards[k];
      if (g.dead || g.gone || t < g.delay) continue;
      if (t < F.retreat) {
        const wob = Math.sin(clock * 1.3 + g.ph) * 0.8;
        const goal = [g.slot[0] + wob, roof(g.slot[0], g.slot[2]) + g.alt + (g.flier ? 0.25 * Math.sin(clock * 2 + g.ph) : 0), g.slot[2] + Math.cos(clock * 1.1 + g.ph) * 0.6];
        const dist = Math.hypot(goal[0] - g.p[0], goal[2] - g.p[2]), far = dist > 6;
        if (!g.flier && dist > 1.5) goal[1] = Math.max(goal[1], roof(g.p[0], g.p[2]) + 0.3, 2.4) + Math.min(1.5, dist * 0.3);   // tanks and crabs are flown in over the walls
        seek(g, goal, far ? 9 : 3, dt, g.flier ? 3 : 4);
        const tg = nearest(live, g.p);
        if (tg && !far) face(g, tg.p, dt);
        if (t > 0.9 && tg) {
          g.cd -= dt;
          if (g.cd <= 0) {
            g.cd = (g.cls === 'ships' ? 0.8 : 0.42) + rnd() * 0.45;
            const lift = g.cls === 'hu' ? 0.5 : g.cls === 'armour' ? 0.3 : g.cls === 'support' ? 0.32 : 0;
            beam([g.p[0] + g.hx * 0.3, g.p[1] + lift, g.p[2] + g.hz * 0.3], [tg.p[0] + (rnd() - 0.5) * 0.3, tg.p[1] + (rnd() - 0.5) * 0.2, tg.p[2] + (rnd() - 0.5) * 0.3], BEAM_RGB[g.cls], g.cls === 'ships' ? 0.14 : 0.07, g.cls === 'ships' ? 0.28 : 0.15);
          }
        }
      } else if (seek(g, F.entry, 9, dt, 3) < 0.6) g.gone = true;
      if (t >= g.dieAt) { g.dead = true; explode(g.p[0], g.p[1], g.p[2], 1.1); }
    }
    const targets = F.guards.filter((g) => !g.dead && !g.gone && t >= g.delay);
    for (const a of live) {
      // the sentries close up round the chamber's middle, strafing, and shoot back
      const ang = clock * 0.8 + a.ph, goal = [ctr[0] + Math.cos(ang) * 1.6, roof(ctr[0], ctr[1]) + DRONE.hover + 0.4 + 0.2 * Math.sin(clock * 2.1 + a.ph), ctr[1] + Math.sin(ang) * 1.6];
      seek(a, goal, t < F.retreat ? 2.2 : 1.2, dt, 2);
      const tg = nearest(targets, a.p);
      if (tg) face(a, tg.p, dt);
      if (tg && t > 0.6 && t < F.retreat) {
        a.cd -= dt;
        if (a.cd <= 0) { a.cd = 0.5 + rnd() * 0.7; beam([a.p[0] + a.hx * 0.3, a.p[1], a.p[2] + a.hz * 0.3], [tg.p[0] + (rnd() - 0.5) * 0.4, tg.p[1] + 0.3, tg.p[2] + (rnd() - 0.5) * 0.4], BEAM_RGB.raider, 0.06, 0.14); }
      }
      if (t >= a.dieAt) { a.alive = false; explode(a.p[0], a.p[1], a.p[2], 1.0); }
    }
    if (t > F.retreat + FIGHT.tail || (t > F.retreat && F.guards.every((g) => g.dead || g.gone))) {
      F.over = true;
      F.P.engaged = null;
      if (F.outcome === 'won' && patrols.get(F.chamber) === F.P) patrols.delete(F.chamber);
      if (F.outcome !== 'won' && patrols.get(F.chamber) === F.P) { for (const a of F.P.drones) { a.tgt = null; a.wait = rnd(); } fitPatrol(F.P); }
    }
  }

  // ---- per frame -----------------------------------------------------------------------------

  const tmp = [0, 0, 0];
  const scaled = (rgb, k) => { tmp[0] = rgb[0] * k; tmp[1] = rgb[1] * k; tmp[2] = rgb[2] * k; return tmp; };
  function draw(camDist) {
    // light pools: every frame (a few dozen)
    pools.count = 0;
    const pool = (x, y, z, r, rgb, k) => place(pools, x, y + 0.04, z, 0, r * 2, scaled(rgb, k), 1);
    for (const s of sites) {
      if (s.kind === 'log') pool(s.x, s.y, s.z + 0.15, s.read ? 0.8 : 1.5, s.read ? RGB.logRead : RGB.logPool, s.read ? 0.5 : 0.42 + 0.14 * Math.sin(amb * 2.4 + s.ph));
      else if (s.kind === 'vault') { if (s.done) pool(s.x, s.y, s.z + 0.7 * s.k, 2.0 * s.k, RGB.vaultPool, 0.5 + 0.05 * Math.sin(amb * 1.3 + s.ph)); else pool(s.x + 0.66 * s.k, s.y, s.z + 0.3, 0.7 * s.k, RGB.lampShut, 0.18 + 0.1 * (Math.sin(amb * 3 + s.ph) > 0 ? 1 : 0)); }
      else if (s.kind === 'survivors') pool(s.x - 0.3, s.y, s.z + 0.3, 1.9, RGB.lantern, 0.36 + 0.06 * Math.sin(amb * 9 + s.ph) + 0.04 * Math.sin(amb * 23 + s.ph));
    }
    // radiation lamps flicker
    for (let k = 0; k < lamps.length; k++) {
      const l = lamps[k];
      l.t -= dtAmb;
      if (l.t <= 0) { const dip = rnd() < 0.3; l.k = dip ? 0.08 + 0.3 * rnd() : 0.85 + 0.15 * rnd(); l.t = dip ? 0.04 + 0.14 * rnd() : 0.15 + 1.4 * rnd(); }
      M.lamp.instanceColor.array.set(scaled(RGB.radLamp, l.k * l.lvl), k * 3);
      pool(l.x + 0.08 * Math.cos(l.yaw), l.y, l.z - 0.08 * Math.sin(l.yaw), 2.3, RGB.radPool, 0.55 * l.k * l.lvl);
    }
    if (lamps.length) M.lamp.instanceColor.needsUpdate = true;
    // the reactor: core, halo, rings, a red pool, all on one pulse
    core.count = 0; halo.count = 0;
    for (let k = 0; k < reactors.length; k++) {
      const r = reactors[k], p = r.pulse ?? 0.5, rgb = r.done ? RGB.reactorDone : RGB.reactor;
      if (r.failed) {   // burned out: a dull ember in a dark cage
        const f = 0.8 + 0.2 * Math.sin(amb * 1.7 + k) * Math.sin(amb * 4.3);
        place(core, r.x, r.y + 1.36, r.z, 0, 0.7, scaled(RGB.reactorDead, f));
        M.reactor.instanceColor.array.set(scaled(RGB.reactorDead, 0.35), k * 3);
        pool(r.x, r.y + 0.24, r.z, 2.6, RGB.reactorDead, 0.25 * f);
        continue;
      }
      place(core, r.x, r.y + 1.36, r.z, 0, 0.8 + 0.12 * p, scaled(rgb, r.done ? 0.9 : 0.7 + 0.6 * p));
      place(halo, r.x, r.y + 1.36, r.z, 0, (r.done ? 1.5 : 1.45 + 0.75 * p), scaled(rgb, r.done ? 0.35 : 0.2 + 0.55 * p));
      place(halo, r.x, r.y + 1.36, r.z, 0, (r.done ? 2.3 : 2.4 + 1.3 * p), scaled(rgb, r.done ? 0.1 : 0.06 + 0.2 * p));
      const ring = r.done ? RGB.reactorDone : r.work > 0 ? RGB.reactorWork : RGB.reactor;
      M.reactor.instanceColor.array.set(scaled(ring, r.done ? 0.85 : r.work > 0 ? 0.9 : 0.45 + 0.65 * p), k * 3);
      pool(r.x, r.y + 0.24, r.z, r.done ? 3.6 : 4.5 + 1.2 * p, rgb, r.done ? 0.22 : 0.2 + 0.4 * p);
    }
    if (reactors.length) M.reactor.instanceColor.needsUpdate = true;
    // drones: patrols and fights (the same actors while engaged)
    M.drone.count = 0; cones.count = 0;
    const seenD = new Set(), putDrone = (a) => {
      if (!a.alive || seenD.has(a)) return;
      seenD.add(a);
      const i = M.drone.count;
      if (i >= CAP.drones) return;
      M.drone.count++;
      e4.set(0, Math.atan2(-a.hz, a.hx), Math.sin(clock * 1.9 + a.ph) * 0.06, 'YZX');
      m4.compose(v4.set(a.p[0], a.p[1], a.p[2]), q4.setFromEuler(e4), s4.set(1.6, 1.6, 1.6)).toArray(M.drone.instanceMatrix.array, i * 16);
      const fx = a.p[0] + a.hx * 0.35, fz = a.p[2] + a.hz * 0.35, fy = roof(fx, fz), k = 0.5 + 0.1 * Math.sin(clock * 5 + a.ph);
      pool(fx, fy, fz, 0.8, RGB.drone, k);
      if (a.p[1] - fy > 0.3) place(cones, fx, fy + 0.03, fz, 0, 1.1, scaled(RGB.drone, 0.3 * k), a.p[1] - fy - 0.2);
    };
    for (const P of patrols.values()) for (const a of P.drones) putDrone(a);
    for (const F of fights) for (const a of F.drones) putDrone(a);
    M.drone.instanceMatrix.needsUpdate = true; cones.instanceMatrix.needsUpdate = true; cones.instanceColor.needsUpdate = true;
    // survivors round their camps (scaled up a little when far, like the movers' people)
    M.person.count = 0;
    const kp = 1.25 * clamp(camDist / 40, 1, 1.6);
    for (const cp of camps) {
      const fx = cp.x + 0.06, fz = cp.z + 0.22;   // the fire
      for (const p of cp.people) {
        let a = p.a, r = p.r;
        if (p.walk) { a += clock * 0.35; r = 0.75; }
        const x = fx + Math.cos(a) * r, z = fz + Math.sin(a) * r;
        const hx = p.walk ? -Math.sin(a) : fx - x, hz = p.walk ? Math.cos(a) : fz - z, l = Math.hypot(hx, hz) || 1;
        const yaw = Math.atan2(-hz / l, hx / l) + (p.walk ? 0 : 0.25 * Math.sin(clock * 0.6 + p.ph));
        place(M.person, x, cp.y + (p.walk ? Math.abs(Math.sin(clock * 6 + p.ph)) * 0.01 : 0), z, yaw, kp, p.rgb);
      }
    }
    M.person.instanceMatrix.needsUpdate = true; M.person.instanceColor.needsUpdate = true;
    // skirmish guardians
    for (const m of Object.values(G)) m.count = 0;
    for (const F of fights) for (const g of F.guards) {
      if (g.dead || g.gone || F.t < g.delay) continue;
      const m = G[g.cls], i = m.count;
      if (i >= CAP.guards) continue;
      m.count++;
      e4.set(0, Math.atan2(-g.hz, g.hx), 0, 'YZX');
      const k = CRAFT_SCALE[g.cls] * (g.cls === 'ships' ? 0.7 : 1);
      m4.compose(v4.set(g.p[0], g.p[1], g.p[2]), q4.setFromEuler(e4), s4.set(k, k, k)).toArray(m.instanceMatrix.array, i * 16);
      m.instanceColor.array.set(CLS_RGB[g.cls], i * 3);
    }
    for (const m of Object.values(G)) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
    // beams
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
    sparks.draw(); smoke.draw();
    for (const m of [pools, core, halo]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  }

  // Ambient time `da` (pulses, haze, flicker: real time while the speed is above 0) and actor time `dt`.
  let dtAmb = 0, lastCam = 50;
  function step(dt, da, camDist = lastCam) {
    lastCam = camDist;
    clock += dt; amb += da; dtAmb = da;
    hazeTime.value = amb;
    for (const r of reactors) {
      const left = r.deadline != null ? r.deadline - (st.day | 0) : 60;
      const f = r.done || r.failed ? 0.12 : 0.32 + 2.6 * Math.pow(1 - clamp(left / 60, 0, 1), 1.6);
      r.freq = f;
      r.phase = (r.phase + da * f * Math.PI * 2) % (Math.PI * 2);
      const s = 0.5 + 0.5 * Math.sin(r.phase);
      r.pulse = r.done ? s : Math.pow(s, 2.2);
    }
    if (dt > 0) {
      for (const P of patrols.values()) if (!P.engaged) stepPatrol(P, dt);
      for (const F of fights) stepFight(F, dt);
      fights = fights.filter((F) => !F.over);
      for (let i = 0; i < beams.length;) { beams[i].life -= dt; if (beams[i].life <= 0) { beams[i] = beams[beams.length - 1]; beams.pop(); } else i++; }
      sparks.step(dt); smoke.step(dt);
    }
    draw(camDist);
  }

  // ---- API -----------------------------------------------------------------------------------

  // The deck view of the state (view.js deckView: its map, chambers and buildings; secrets, day and
  // guardians read through). info: { terrTop, reset (a new state), deckChanged }.
  function refresh(state, info = {}) {
    if (info.reset) { prev.clear(); queued.clear(); patrols.clear(); fights = []; beams.length = 0; sparks.n = 0; smoke.n = 0; seeded = false; sig = ''; }
    const newTerr = info.terrTop && info.terrTop !== terrTop;
    st = state; W = state.map.w; H = state.map.h; terrTop = info.terrTop || terrTop;
    const d = state.deck || state.map.deck || 'main';
    if (d !== deck || info.deckChanged) { deck = d; patrols.clear(); fights = []; beams.length = 0; sparks.n = 0; smoke.n = 0; sig = ''; }
    if (!terrTop) return;
    // drone fights, seen on every deck: done (won), or weaker but not done (driven back)
    const day = state.day | 0;
    for (const dg of state.secrets?.dangers || []) {
      if (dg.kind !== 'drones') continue;
      const key = dg.chamber + ':drones', p = prev.get(key);
      if (seeded && p) {
        if (!p.done && dg.done) queued.set(dg.chamber, { day, outcome: 'won' });
        else if (!dg.done && p.strength != null && dg.strength != null && dg.strength < p.strength - 1e-6) queued.set(dg.chamber, { day, outcome: 'repelled' });
      }
      prev.set(key, { done: !!dg.done, strength: dg.strength });
    }
    seeded = true;
    for (const [ch, q] of queued) {
      if (q.day < day - 1) { queued.delete(ch); continue; }
      const c = chamberOn(ch);
      if (!c) continue;
      queued.delete(ch);
      startFight(c, q.outcome);
    }
    const s = signature();
    if (s !== sig || newTerr) { sig = s; build(); }
  }
  // anything on the deck that moves or glows (else, once cleared, frames cost nothing)
  const busy = () => sites.length || reactors.length || lamps.length || camps.length || patrols.size || fights.length || beams.length || sparks.n || smoke.n;
  function update(dtReal, sp = speed, camDist) {
    speed = sp;
    const da = sp > 0 ? Math.min(0.1, dtReal) : 0, dt = da * sp;
    if (!st || !terrTop) return;
    if (!da && drawn) return;   // paused: everything holds still
    if (drawn && !busy()) return;
    step(dt, da, camDist);
    drawn = true;
  }
  function marks() { return markCache; }
  function reset() { st = null; prev.clear(); queued.clear(); patrols.clear(); fights = []; beams.length = 0; sparks.n = 0; smoke.n = 0; seeded = false; sig = ''; sites = []; reactors = []; lamps = []; camps = []; markCache = { sites: [], dangers: [], ssig: '' }; }
  function dispose() {
    parent.remove(group);
    for (const m of group.children) m.dispose?.();
    for (const g of [...Object.values(geos), ...Object.values(craftGeo), PLANE, COLUMN, CONE, BALL, boxGeo, puff, toxic.geometry, rad.geometry]) g.dispose();
    for (const m of [mat, poolMat, beaconMat, coneMat, coreMat, haloMat, toxic.material, rad.material, sparkMat, beamMat, smokeMat]) m.dispose();
    maskTex.value?.dispose();
  }
  function stats_() {
    const count = (k) => sites.filter((s) => s.kind === k).length;
    return {
      deck, builds: stats.builds, logs: count('log'), logsRead: sites.filter((s) => s.kind === 'log' && s.read).length, vaults: count('vault'), vaultsOpen: sites.filter((s) => s.kind === 'vault' && s.done).length,
      camps: camps.length, people: camps.reduce((t, c) => t + c.people.length, 0),
      patrols: [...patrols.entries()].map(([ch, P]) => ({ chamber: ch, drones: P.drones.filter((a) => a.alive).length, engaged: !!P.engaged })),
      toxicLayers: toxic.count, radiationLayers: rad.count, lamps: lamps.length,
      reactors: reactors.map((r) => ({ chamber: r.chamber, done: r.done, failed: r.failed, work: r.work, freq: +(r.freq ?? 0).toFixed(2), x: r.x, z: r.z })),
      fights: fights.map((F) => ({ chamber: F.chamber, outcome: F.outcome, t: +F.t.toFixed(2), drones: F.drones.filter((a) => a.alive).length, guards: F.guards.filter((g) => !g.dead && !g.gone).length })),
      queued: [...queued.keys()], fought: stats.fights, beams: beams.length, sparks: sparks.n, smoke: smoke.n, marks: markCache.sites.length / 3 + markCache.dangers.length / 3,
    };
  }

  return {
    refresh, update, reset, dispose, marks, stats: stats_, group,
    // tests: n seconds of actor and ambient time now, in steps of h (ignores the speed)
    advance(sec, h = 1 / 30) { if (!st || !terrTop) return; for (let t = 0; t < sec - 1e-9; t += h) step(Math.min(h, sec - t), Math.min(h, sec - t)); },
    // where the drones and fight actors are (tests)
    positions: () => ({ drones: [...patrols.values()].flatMap((P) => P.drones.filter((a) => a.alive).map((a) => a.p.map((v) => +v.toFixed(2)))), guards: fights.flatMap((F) => F.guards.filter((g) => !g.dead && !g.gone).map((g) => ({ cls: g.cls, p: g.p.map((v) => +v.toFixed(2)) }))) }),
  };
}
