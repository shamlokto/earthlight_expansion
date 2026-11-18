// Sato's Harvest: the 3D world (three.js). Builds a scene from a map (js/farm/maps.js), keeps the
// field, people and animals in step with the state, and runs the camera, sky, light and weather.
// Every visual goes model → picture → procedural stand-in (js/farm/art.js), so it never fails.
import * as THREE from 'three';
import * as art from './art.js';
import { CROPS } from './data.js';
import { cropStage } from './sim.js';
import { ColonySky, buildSurroundings, colonyProp, buildingExtras, COLONY_KINDS, Bots, mergeStatic, lightPools, setColonyTime, U as HAZE } from './colony.js';

const GROUND_TEX = { f: 'soil_dry', p: 'path_dirt', c: 'cobble', s: 'sand', k: 'wood_floor', a: 'ash_ground', o: 'stone_floor', h: 'hay', b: 'wood_floor', d: 'deck_floor' };
const SEASON_KEY = ['spring', 'summer', 'autumn', 'winter'];
const CROP_COLOR = { turnip: '#f1ece0', potato: '#c9a56a', cucumber: '#3f8a3a', strawberry: '#d5283c', tomato: '#d8362a', corn: '#f0c93c', onion: '#d8b25e', pumpkin: '#e8812a', carrot: '#ee7a22', eggplant: '#5b2c7a', sweetpotato: '#b0546a', spinach: '#2f7a35', moonflower: '#cfe6ff' };
const CROP_H = { corn: 1.7, tomato: 1.1, cucumber: 1.0, eggplant: 0.9, moonflower: 0.9, pumpkin: 0.7 };

// kind → { model, sprite, h (height in tiles), face (turn to the camera), cross (two crossed planes) }
const TREE_MODEL = ['tree_blossom', 'tree', 'tree_autumn', 'tree_winter'];
const PROPS = {
  tree: { model: (w) => (art.hasModel(TREE_MODEL[w.season]) ? TREE_MODEL[w.season] : 'tree'), sprite: (w) => 'sprites/tree_' + SEASON_KEY[w.season], h: 4.4, cross: true, shadow: true },
  pine: { model: 'pine', sprite: () => 'sprites/pine', h: 5, cross: true, shadow: true },
  bush: { model: 'bush', sprite: () => 'sprites/bush', h: 1.0, cross: true },
  flowers: { model: 'flowers', sprite: () => 'sprites/flowers', h: 0.45, cross: true, soft: true },
  reeds: { model: 'reeds', sprite: () => 'sprites/reeds', h: 1.2, cross: true, soft: true },
  rockdecor: { model: 'boulder', sprite: () => 'sprites/boulder', h: 0.9, face: true },
  weed: { model: 'weed', sprite: () => 'sprites/weed', h: 0.5, cross: true, soft: true, maxW: 0.7 },
  rock: { model: 'rock', sprite: () => 'sprites/rock', h: 0.42, face: true, maxW: 0.55 },
  branch: { model: 'branch', sprite: () => 'sprites/branch', h: 0.3, face: true, fit: 'wide', soft: true },
  stump: { model: 'stump', sprite: () => 'sprites/stump', h: 0.6, face: true, maxW: 0.85 },
  boulder: { model: 'boulder', sprite: () => 'sprites/boulder', h: 0.95, face: true, maxW: 0.98 },
  bin: { model: 'bin', sprite: () => 'sprites/bin', h: 0.95, face: true },
  well: { model: 'well', sprite: () => 'sprites/well', h: 1.6, face: true },
  signpost: { model: 'signpost', sprite: () => 'sprites/signpost', h: 1.3, face: true },
  scarecrow: { model: 'scarecrow', sprite: () => 'sprites/scarecrow', h: 1.9, face: true },
  memorial: { model: 'memorial', sprite: () => 'sprites/memorial', h: 1.8, face: true },
  bench: { model: 'bench', h: 0.9, fit: 'stretch' },
  lantern: { model: 'lantern', sprite: () => 'sprites/lantern', h: 2.2, face: true, lamp: 1.9 },
  barge: { model: 'barge', sprite: () => 'sprites/barge', h: 1.7, face: true, fit: 'wide' },
  fence: { model: 'fence', h: 0.85, fit: 'stretch' },
  bed: { model: 'bed', sprite: () => 'sprites/bed', h: 1.0, face: true, fit: 'foot' },
  radio: { model: 'radio', sprite: () => 'sprites/radio', h: 1.0, face: true },
  table: { model: 'table', sprite: () => 'sprites/table', h: 0.85, face: true, fit: 'foot' },
  shelf: { model: 'shelf', sprite: () => 'sprites/shelf', h: 1.9, face: true, fit: 'repeat' },
  counter: { model: 'counter', h: 1.0, fit: 'stretch' },
  desk: { model: 'counter', h: 1.0, fit: 'stretch' },
  trough: { model: 'trough', sprite: () => 'sprites/trough', h: 0.6, face: true, fit: 'repeat' },
  nestbox: { model: 'nestbox', sprite: () => 'sprites/nestbox', h: 0.95, face: true, fit: 'repeat' },
  haybale: { model: 'haybale', h: 0.8, fit: 'foot' },
  crate: { model: 'crate', h: 0.8, fit: 'foot' },
  case: { model: 'display_case', h: 1.3, fit: 'foot' },
  workbench: { model: 'workbench', h: 1.1, fit: 'foot' },
  plantpot: { model: 'plantpot', h: 1.0 },
  ruinwall: { model: 'ruin_wall', h: 1.9, fit: 'foot' },
  rubble: { model: 'rubble', sprite: () => 'sprites/rubble', h: 0.75, face: true, maxW: 0.95 },
  rubble_done: { model: 'rubble_done', sprite: () => 'sprites/rubble_done', h: 0.22, face: true, soft: true },
  stairs: { model: 'stairs', sprite: () => 'sprites/stairs', h: 0.7, face: true, fit: 'foot' },
  hydra: { model: 'hydra', sprite: () => 'sprites/hydra', h: 1.0, face: true },
  crawler: { model: 'crawler', sprite: () => 'sprites/crawler', h: 0.7, face: true, turn: true },
  drone: { model: 'drone', sprite: () => 'sprites/drone', h: 0.7, face: true, hover: 0.9, turn: true },
  chicken: { model: 'chicken', sprite: () => 'sprites/chicken_side', h: 0.5, face: true },
  cow: { model: 'cow', sprite: () => 'sprites/cow_side', h: 1.3, face: true },
  egg: { model: 'egg', h: 0.16, soft: true },
  storage_box: { model: 'storage_box', h: 0.8, fit: 'foot' },
  fridge: { model: 'fridge', h: 1.8, fit: 'foot' },
  kitchen: { model: 'kitchen', h: 1.0, fit: 'stretch' },
  wardrobe: { model: 'wardrobe', h: 1.9, fit: 'foot' },
  tv: { model: 'tv', h: 1.0, fit: 'foot' },
  lamp: { model: 'lamp', h: 1.5, fit: 'foot' },
  chair: { model: 'chair', h: 0.9, fit: 'foot' },
  calendar_board: { model: 'calendar_board', h: 1.6, fit: 'foot' },
  float: { model: 'fish_float', h: 0.22, soft: true },
  // the colony's own things (built stand-ins in colony.js until models arrive under these names)
  airlock_door: { model: 'airlock_door', h: 2.3, fit: 'foot' },
  solar_panel: { model: 'solar_panel', h: 1.3, fit: 'stretch' },
  hydro_tower: { model: 'hydro_tower', h: 2.1, fit: 'foot' },
  colony_lamp: { model: 'colony_lamp', h: 2.5, fit: 'foot' },
  pipe_run: { model: 'pipe_run', h: 0.6, fit: 'repeat' },
  vent: { model: 'vent', h: 0.55, fit: 'foot' },
  maint_bot: { model: 'maint_bot', h: 0.75, fit: 'foot', turn: true },
  cargo_crate: { model: 'cargo_crate', h: 0.8, fit: 'foot' },
  lift_kiosk: { model: 'lift_kiosk', h: 3.2, fit: 'foot' },
  water_tank: { model: 'water_tank', h: 2.4, fit: 'foot' },
  wind_turbine_small: { model: 'wind_turbine_small', h: 4.0, fit: 'foot' },
  noticeboard: { model: 'noticeboard', h: 1.8, fit: 'stretch' },
  fountain: { model: 'fountain', h: 1.6, fit: 'foot' },
  fan_tower: { model: 'fan_tower', h: 5.2, fit: 'foot' },
  market_stall: { model: 'market_stall', h: 2.1, fit: 'foot' },
  // 2026-11-18: the onsen, things Sato sets down, her robots and fruit trees (built stand-ins until models arrive)
  onsen_pool: { model: 'onsen_pool', h: 0.7, fit: 'stretch' },
  field_chest: { model: 'field_chest', h: 0.8, fit: 'foot' },
  charger: { model: () => (art.hasModel('solar_charger') ? 'solar_charger' : 'solar_panel'), h: 1.2, fit: 'foot' },
  farm_bot: { model: 'farm_bot', h: 0.8, fit: 'foot', turn: true },
  fruit_tree: { h: 3.4 }, fruit_tree_young: { h: 2.1 }, sapling: { model: 'sapling', h: 1.0 },
};
const BUILDING = {
  house: { model: 'farmhouse', facade: 'buildings/house', wall: 'plank_wall', roof: 'roof_tin' },
  barn: { model: 'barn', facade: 'buildings/barn', wall: 'barn_red', roof: 'roof_shingle' },
  coop: { model: 'coop', facade: 'buildings/coop', wall: 'plank_wall', roof: 'roof_red' },
  silo: { model: 'silo', facade: 'buildings/silo', wall: 'metal_hull', roof: 'roof_tin', round: true },
  greenhouse: { model: 'greenhouse', facade: 'buildings/greenhouse', wall: 'glass', roof: 'glass', glass: true },
  store: { model: 'store', facade: 'buildings/store', wall: 'plaster_wall', roof: 'roof_red' },
  cafe: { model: 'cafe', facade: 'buildings/cafe', wall: 'metal_hull', roof: 'roof_tin' },
  workshop: { model: 'workshop', facade: 'buildings/workshop', wall: 'plank_wall', roof: 'roof_tin' },
  hall: { model: 'hall', facade: 'buildings/hall', wall: 'plaster_wall', roof: 'roof_shingle' },
  ranch: { model: 'ranch', facade: 'buildings/ranch', wall: 'barn_red', roof: 'roof_shingle' },
  clinic: { model: 'clinic', facade: 'buildings/clinic', wall: 'plaster_wall', roof: 'roof_red' },
  library: { model: 'library', facade: 'buildings/library', wall: 'plank_wall', roof: 'roof_shingle' },
  cottage_a: { model: 'cottage_a', facade: 'buildings/cottage_a', wall: 'plaster_wall', roof: 'roof_red' },
  cottage_b: { model: 'cottage_b', facade: 'buildings/cottage_b', wall: 'plank_wall', roof: 'roof_shingle' },
  lift: { model: 'lift', facade: 'buildings/lift_tower', wall: 'metal_hull', roof: 'roof_tin', frame: true },
  // more of Willowfall: extra homes reuse the cottage models until their own arrive; colony buildings
  cottage_c: { model: ['cottage_c', 'cottage_b'], facade: 'buildings/cottage_c', wall: 'plaster_wall', roof: 'roof_shingle' },
  cottage_d: { model: ['cottage_d', 'cottage_a'], facade: 'buildings/cottage_d', wall: 'plank_wall', roof: 'roof_red' },
  pumphouse: { model: 'pumphouse', facade: 'buildings/pumphouse', wall: 'metal_hull', roof: 'roof_tin' },
  post: { model: 'post_office', facade: 'buildings/post', wall: 'plaster_wall', roof: 'roof_red' },
  guard: { model: 'guard_post', facade: 'buildings/guard', wall: 'metal_hull', roof: 'roof_red' },
  onsen_house: { model: 'onsen_house', facade: 'buildings/onsen_house', wall: 'plank_wall', roof: 'roof_red' },
};
const FRUIT_COLOR = { apple: 0xd8362a, peach: 0xffa48a, cherry: 0xc8102e, persimmon: 0xf07a1a };
const BLOSSOM = { apple: 0xfbe3ea, peach: 0xf7a8c0, cherry: 0xffc6d9, persimmon: 0xf3f0d6 };

const col = (c) => new THREE.Color(c);
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m; }
function cyl(r0, r1, h, mat, x = 0, y = 0, z = 0, seg = 10) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m; }
function ball(r, mat, x = 0, y = 0, z = 0, detail = 1) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat); m.position.set(x, y, z); m.castShadow = true; return m; }

export class World {
  constructor(canvas) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NoToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.3, 3200);
    this.yaw = 0; this.pitch = 0.66; this.dist = 12; this.focus = new THREE.Vector3();
    this.hemi = new THREE.HemisphereLight(0xdcecff, 0x8a7a55, 1.0); this.scene.add(this.hemi);
    const s = this.sun = new THREE.DirectionalLight(0xfff2d8, 2.2); s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
    Object.assign(s.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 }); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.03;
    this.scene.add(s, s.target);
    this.scene.fog = new THREE.Fog(0xbcd7ee, 40, 150);
    this.spriteTint = new THREE.Color(1, 1, 1);
    this.spriteMats = []; this.facers = []; this.anims = []; this.fx = [];
    this.sky = this.makeSky();
    this.colony = new ColonySky(this.scene);           // the inside of the cylinder: land overhead, the sun-line, the window band
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.cursor = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.47, 4, 1, Math.PI / 4), new THREE.MeshBasicMaterial({ color: 0xfff2b8, transparent: true, opacity: 0.85, depthWrite: false }));
    this.cursor.rotation.x = -Math.PI / 2; this.cursor.renderOrder = 5; this.scene.add(this.cursor);
    this.weather = this.makeWeather();
    this.season = 0; this.t = 0; this.tileObjs = new Map(); this.actors = new Map();
    window.addEventListener('resize', () => this.resize()); this.resize();
  }
  resize() { const c = this.renderer.domElement, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  // ------------------------------------------------------------ sky, light, weather
  makeSky() {
    const g = new THREE.SphereGeometry(400, 32, 16), layers = {};
    for (const k of ['day', 'dusk', 'night', 'storm', 'ruins']) {
      const p = art.pic('sky/sky_' + k);
      const m = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, transparent: true, opacity: 0, depthWrite: false, map: p ? p.tex : null, color: p ? 0xffffff : { day: 0x8ec5f2, dusk: 0xf0a868, night: 0x0c1430, storm: 0x77828c, ruins: 0xb89858 }[k] });
      const mesh = new THREE.Mesh(g, m); mesh.renderOrder = -10; this.scene.add(mesh); layers[k] = mesh;
    }
    return layers;
  }
  makeWeather() {
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 40; pos[i * 3 + 1] = Math.random() * 18; pos[i * 3 + 2] = (Math.random() - 0.5) * 40; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe6ff, size: 0.09, transparent: true, opacity: 0.7, depthWrite: false }));
    p.visible = false; p.frustumCulled = false; this.scene.add(p); return p;
  }
  // minute 360..1440; sets the sun, the sky layers and the tint of every picture sprite.
  setTime(minute, weather, map) {
    const indoor = map && map.indoor, ruins = map && map.ruins, colony = !indoor && !ruins;
    const h = minute / 60, sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    // The colony schedules its light: the sun-line fades up from 6:00 and down from 18:30. (Down in the Old World, a real sun.)
    const day = ruins ? Math.max(0, Math.min(1, Math.min((h - 5) / 1.0, (20.5 - h) / 1.5))) : sm(5.7, 6.5, h) * (1 - sm(18.0, 19.9, h));
    const dusk = ruins ? Math.max(0, 1 - Math.abs(h - 18.6) / 1.6) : Math.max(0, 1 - Math.abs(h - 18.75) / 1.25) + Math.max(0, 1 - Math.abs(h - 6.1) / 0.7) * 0.5;
    const wet = weather === 'rain' || weather === 'storm', snow = weather === 'snow';
    const f = this.focus;
    if (ruins) { const ang = ((h - 6) / 14) * Math.PI; this.sun.position.set(f.x + Math.cos(ang) * 30, 26 + Math.sin(ang) * 14, f.z + 16); }
    else this.sun.position.set(f.x + 7, f.y + 42, f.z + 19);                // overhead, from the sun-line along the axis
    this.sun.target.position.copy(f);
    const sunCol = col(0xfff4e0).lerp(col(0xffa070), Math.min(1, dusk) * 0.8).lerp(col(0x6f8fd8), 1 - day);
    this.sun.color.copy(sunCol); this.sun.intensity = indoor ? 0.45 : (0.12 + 1.6 * day) * (wet ? 0.45 : snow ? 0.75 : 1) * (ruins ? 0.7 : 1);
    this.hemi.intensity = indoor ? 1.55 : (0.45 + 0.8 * day) * (wet ? 0.85 : 1);
    this.hemi.color.set(indoor ? 0xffe6c4 : ruins ? 0xd9b878 : 0xd6ecff).lerp(col(0x34507e), indoor ? 0 : (1 - day) * 0.8);
    this.hemi.groundColor.set(ruins ? 0x5a4a30 : 0x6f6a4a);
    const sk = this.sky, set = (k, v) => { sk[k].material.opacity = v; sk[k].visible = v > 0.01; };
    // the bluish haze inside the cylinder: pale by day, lavender at dusk, deep blue at night
    const haze = col(0xb2cbe6).lerp(col(0xd2b2c8), Math.min(1, dusk) * 0.7).lerp(col(0x0e1934), 1 - day);
    if (wet) haze.lerp(col(0x7f8a99), 0.55 * (0.4 + 0.6 * day));
    this.colony.group.visible = colony;
    if (indoor) { for (const k in sk) set(k, 0); this.scene.background = col(0x0b0907); }
    else if (ruins) { for (const k in sk) set(k, k === 'ruins' ? 1 : 0); this.scene.background = col(0xb89858); }
    else { for (const k in sk) set(k, 0); this.scene.background = haze.clone(); this.colony.setTime(day, Math.min(1, dusk), 1 - day, wet); }
    const fogC = indoor ? col(0x0b0907) : ruins ? col(0xb39a66) : haze;
    this.scene.fog.color.copy(fogC); this.scene.fog.near = indoor ? 60 : wet ? 16 : ruins ? 14 : 40; this.scene.fog.far = indoor ? 200 : wet ? 170 : ruins ? 60 : 420;
    HAZE.haze.value.copy(fogC); HAZE.hazeNear.value = this.scene.fog.near; HAZE.hazeFar.value = this.scene.fog.far; HAZE.hazeCap.value = wet ? 0.9 : 0.5 + 0.25 * (1 - day);
    setColonyTime(1 - day);
    if (this.pools) this.pools.material.opacity = (1 - day) * 0.75;
    const b = indoor ? 1 : 0.42 + 0.58 * day;
    this.spriteTint.setRGB(b, b, b).multiply(indoor ? col(0xffffff) : col(0xffffff).lerp(sunCol, 0.22));
    if (ruins) this.spriteTint.multiply(col(0xf0dcb0));
    for (const m of this.spriteMats) m.color.copy(this.spriteTint);
    this.weather.visible = !indoor && !ruins && (wet || snow);
    this.weather.material.size = snow ? 0.16 : 0.07; this.weather.material.color.set(snow ? 0xffffff : 0xa9c6e6);
    this.weatherSpeed = snow ? 2.2 : 19;
    this.night = 1 - day;
  }

  // ------------------------------------------------------------ sprites and props
  spriteMat(tex, opts = {}) {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: false, alphaTest: 0.45, side: THREE.DoubleSide, color: this.spriteTint.clone(), ...opts });
    this.spriteMats.push(m); return m;
  }
  // A picture standing on the ground: `h` tiles tall, anchored at its bottom centre.
  billboard(p, h, { cross = false, face = true, shadow = false } = {}) {
    const aspect = (p.w || 1) / (p.h || 1), w = h * aspect, g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0);
    const mat = this.spriteMat(p.tex), grp = new THREE.Group();
    const a = new THREE.Mesh(g, mat); grp.add(a);
    if (cross) { const b = new THREE.Mesh(g, mat); b.rotation.y = Math.PI / 2; grp.add(b); }
    else if (face) this.facers.push(grp);
    if (shadow) for (const m of grp.children) { m.castShadow = true; m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: p.tex, alphaTest: 0.45 }); }
    return grp;
  }
  blob(r) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 2; return m; }
  proc(kind, o = {}) {
    const g = new THREE.Group(), wood = std({ color: 0x8a6a45 }), dark = std({ color: 0x5c4630 }), stone = std({ color: 0x8b8882 }), metal = std({ color: 0x77838f, metalness: 0.4, roughness: 0.6 });
    const season = this.season, leaf = std({ color: [0x9ed06a, 0x3f8a36, 0xd0792a, 0xe9eef2][season] });
    switch (kind) {
      case 'tree': g.add(cyl(0.16, 0.24, 1.6, dark), ball(1.25, leaf, 0, 2.5, 0), ball(0.9, leaf, 0.6, 3.1, 0.2), ball(0.85, leaf, -0.55, 2.9, -0.3)); break;
      case 'pine': { const m = std({ color: season === 3 ? 0xcfe0d6 : 0x2f6a3c }); g.add(cyl(0.14, 0.2, 1.1, dark)); for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.2 - i * 0.25, 1.4, 8), m); c.position.y = 1.4 + i * 0.8; c.castShadow = true; g.add(c); } break; }
      case 'bush': g.add(ball(0.5, leaf, 0, 0.42, 0), ball(0.36, leaf, 0.34, 0.34, 0.1)); break;
      case 'flowers': for (let i = 0; i < 5; i++) g.add(ball(0.07, std({ color: [0xffe066, 0xff8fa3, 0xffffff][i % 3] }), Math.sin(i * 2.4) * 0.3, 0.16, Math.cos(i * 2.4) * 0.3, 0)); break;
      case 'reeds': for (let i = 0; i < 6; i++) g.add(cyl(0.02, 0.03, 0.9 + (i % 3) * 0.2, std({ color: 0x6f8f45 }), Math.sin(i * 1.9) * 0.25, 0, Math.cos(i * 1.9) * 0.25, 4)); break;
      case 'weed': for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 4), std({ color: 0x4f8a34 })); c.position.set(Math.sin(i * 1.3) * 0.18, 0.2, Math.cos(i * 1.3) * 0.18); c.rotation.z = Math.sin(i) * 0.4; g.add(c); } break;
      case 'rock': case 'rockdecor': g.add(ball(kind === 'rock' ? 0.26 : 0.55, stone, 0, kind === 'rock' ? 0.14 : 0.3, 0, 0)); break;
      case 'boulder': g.add(ball(0.52, stone, 0, 0.34, 0, 0), ball(0.3, stone, 0.3, 0.2, 0.2, 0)); break;
      case 'branch': { const b = cyl(0.045, 0.06, 0.8, dark); b.rotation.z = Math.PI / 2; b.position.y = 0.06; g.add(b); break; }
      case 'stump': g.add(cyl(0.33, 0.38, 0.4, dark), cyl(0.3, 0.3, 0.02, std({ color: 0xc9a877 }), 0, 0.4, 0)); break;
      case 'fence': g.add(box(0.1, 0.8, 0.1, wood, -0.45), box(0.1, 0.8, 0.1, wood, 0.45), box(1, 0.08, 0.06, wood, 0, 0.55), box(1, 0.08, 0.06, wood, 0, 0.28)); break;
      case 'bin': g.add(box(0.85, 0.6, 0.7, wood), box(0.9, 0.08, 0.75, dark, 0, 0.6)); break;
      case 'crate': g.add(box(0.8, 0.7, 0.8, wood)); break;
      case 'well': g.add(cyl(0.5, 0.5, 0.6, stone, 0, 0, 0, 12), box(0.08, 1.2, 0.08, wood, -0.45, 0.4), box(0.08, 1.2, 0.08, wood, 0.45, 0.4), box(1.1, 0.08, 0.5, std({ color: 0x8e4326 }), 0, 1.55)); break;
      case 'signpost': g.add(box(0.08, 1.1, 0.08, dark), box(0.7, 0.4, 0.06, wood, 0, 0.75)); break;
      case 'scarecrow': g.add(box(0.07, 1.6, 0.07, dark), box(1.0, 0.07, 0.07, dark, 0, 1.15), box(0.45, 0.5, 0.2, std({ color: 0x9a5a3a }), 0, 0.85), ball(0.2, std({ color: 0xd9c08a }), 0, 1.55, 0), cyl(0.3, 0.34, 0.06, std({ color: 0xc7a24e }), 0, 1.68, 0)); break;
      case 'memorial': g.add(box(1.5, 0.25, 0.8, stone), box(0.9, 1.3, 0.35, std({ color: 0x9b9891 }), 0, 0.25), box(0.5, 0.3, 0.03, std({ color: 0xb08d3c, metalness: 0.6, roughness: 0.4 }), 0, 0.8, 0.19)); break;
      case 'bench': g.add(box(1.7, 0.08, 0.45, wood, 0, 0.42), box(1.7, 0.4, 0.06, wood, 0, 0.5, -0.2), box(0.08, 0.42, 0.4, dark, -0.75), box(0.08, 0.42, 0.4, dark, 0.75)); break;
      case 'lantern': { g.add(box(0.08, 1.6, 0.08, dark)); const l = ball(0.14, new THREE.MeshBasicMaterial({ color: 0xffd98a }), 0, 1.7, 0); l.castShadow = false; g.add(l); const pl = new THREE.PointLight(0xffc878, 0, 9, 1.6); pl.position.y = 1.7; g.add(pl); g.userData.lamp = pl; break; }
      case 'barge': g.add(box(3.6, 0.45, 1.5, dark, 0, -0.1), box(1.6, 0.06, 1.5, std({ color: 0x8e2f3a }), -0.5, 1.5), box(0.07, 1.2, 0.07, wood, -1.2, 0.35, 0.6), box(0.07, 1.2, 0.07, wood, 0.2, 0.35, 0.6), box(0.07, 1.2, 0.07, wood, -1.2, 0.35, -0.6), box(0.07, 1.2, 0.07, wood, 0.2, 0.35, -0.6), box(0.6, 0.5, 0.6, wood, 1.1, 0.35)); break;
      case 'liftpad': { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 20), std({ color: 0xd9a520, metalness: 0.3 })); m.position.y = 0.04; m.receiveShadow = true; g.add(m); break; }
      case 'bed': g.add(box(0.95, 0.35, 1.9, wood, 0, 0, 0.45), box(0.9, 0.16, 1.8, std({ color: 0xe9e4d6 }), 0, 0.35, 0.45), box(0.9, 0.18, 1.2, std({ color: 0x38527c }), 0, 0.37, 0.75), box(0.95, 0.9, 0.08, dark, 0, 0, -0.5)); break;
      case 'radio': g.add(box(0.8, 0.7, 0.5, wood), box(0.5, 0.3, 0.3, std({ color: 0x3c3a36 }), 0, 0.7), cyl(0.01, 0.01, 0.5, metal, 0.2, 1.0, 0, 4)); break;
      case 'table': g.add(cyl(0.5, 0.5, 0.06, wood, 0, 0.7, 0, 16), cyl(0.06, 0.1, 0.7, dark)); break;
      case 'rug': { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), std({ color: 0x8e3a3a })); m.rotation.x = -Math.PI / 2; m.position.set(0.5, 0.02, 0.5); m.receiveShadow = true; g.add(m); break; }
      case 'shelf': g.add(box(1.9, 1.8, 0.4, dark, 0.5), box(1.8, 0.05, 0.42, wood, 0.5, 0.6), box(1.8, 0.05, 0.42, wood, 0.5, 1.2), box(0.3, 0.3, 0.3, std({ color: 0x6f9a4a }), 0.1, 0.65), box(0.3, 0.25, 0.3, std({ color: 0xc9853a }), 0.8, 1.25)); break;
      case 'counter': case 'desk': { const w = o.w || 3; g.add(box(w, 0.95, 0.7, wood, (w - 1) / 2), box(w + 0.1, 0.07, 0.8, dark, (w - 1) / 2, 0.95)); break; }
      case 'trough': { const w = o.w || 2; g.add(box(w, 0.35, 0.5, wood, (w - 1) / 2), box(w - 0.1, 0.05, 0.4, std({ color: o.full ? 0xd4b45a : 0x4a3a28 }), (w - 1) / 2, 0.33)); break; }
      case 'nestbox': { const w = o.w || 3; g.add(box(w, 0.5, 0.7, wood, (w - 1) / 2), box(w, 0.08, 0.6, std({ color: 0xd4b45a }), (w - 1) / 2, 0.5)); break; }
      case 'haybale': g.add(box(0.9, 0.7, 0.9, std({ color: 0xd4b45a, map: art.tex('hay') }))); break;
      case 'plantpot': g.add(cyl(0.22, 0.16, 0.35, std({ color: 0x9a5a3a })), ball(0.3, std({ color: 0x3f8a36 }), 0, 0.6, 0)); break;
      case 'workbench': g.add(box(0.8, 0.9, 1.9, metal, 0, 0, 0.5), box(0.3, 0.2, 0.3, std({ color: 0xb04a2a }), 0, 0.9, 0.2)); break;
      case 'case': g.add(box(0.7, 0.9, 0.9, dark), box(0.66, 0.5, 0.86, new THREE.MeshStandardMaterial({ color: 0xcfeaf0, transparent: true, opacity: 0.35, roughness: 0.1 }), 0, 0.9)); break;
      case 'ruinwall': { const h = 1.4 + ((o.x * 7 + o.y * 13) % 5) * 0.35; g.add(box(1, h, 1, std({ map: art.tex(((o.x + o.y) % 3) ? 'concrete_ruin' : 'brick_ruin', { repeat: 0.5 }) }))); break; }
      case 'rubble': g.add(ball(0.42, stone, 0, 0.2, 0, 0), ball(0.3, std({ color: 0x77736d }), 0.3, 0.16, 0.15, 0), ball(0.24, std({ color: 0x9a6a52 }), -0.28, 0.14, -0.1, 0), box(0.5, 0.06, 0.1, metal, 0.05, 0.38)); break;
      case 'rubble_done': g.add(ball(0.2, stone, 0.1, 0.05, 0, 0), ball(0.16, stone, -0.2, 0.04, 0.1, 0)); break;
      case 'stairs': g.add(box(0.95, 0.04, 0.95, new THREE.MeshBasicMaterial({ color: 0x050505 })), box(0.95, 0.3, 0.12, stone, 0, 0, -0.45), box(0.12, 0.3, 0.95, stone, -0.45), box(0.12, 0.3, 0.95, stone, 0.45)); break;
      case 'hydra': { const leg = (a) => { const l = cyl(0.03, 0.03, 0.7, metal, 0, 0, 0, 5); l.rotation.z = 0.5; l.rotation.y = a; l.position.set(Math.cos(a) * 0.18, 0.28, -Math.sin(a) * 0.18); return l; }; g.add(leg(0), leg(2.1), leg(4.2), box(0.3, 0.22, 0.3, std({ color: 0x5c6670, metalness: 0.5 }), 0, 0.55)); const b = new THREE.Group(); const b1 = cyl(0.03, 0.03, 0.5, metal, 0.07, 0, 0, 6), b2 = cyl(0.03, 0.03, 0.5, metal, -0.07, 0, 0, 6); b1.rotation.x = b2.rotation.x = Math.PI / 2; b1.position.set(0.07, 0.68, 0.25); b2.position.set(-0.07, 0.68, 0.25); b.add(b1, b2); g.add(b); g.userData.turret = b; break; }
      case 'crawler': { const m = std({ color: 0x9a4a2a }); g.add(ball(0.3, m, 0, 0.3, 0, 1), ball(0.18, m, 0, 0.3, 0.3, 1)); for (let i = 0; i < 6; i++) { const l = cyl(0.02, 0.02, 0.4, std({ color: 0x4a2414 }), 0, 0, 0, 4); l.rotation.z = (i < 3 ? 1 : -1) * 0.9; l.position.set((i < 3 ? 0.3 : -0.3), 0.18, (i % 3 - 1) * 0.2); g.add(l); } break; }
      case 'drone': { g.add(ball(0.28, metal, 0, 0.9, 0, 2)); const e = ball(0.08, new THREE.MeshBasicMaterial({ color: 0xff3020 }), 0, 0.9, 0.25, 1); g.add(e); break; }
      case 'chicken': { const w = std({ color: 0xf4f1ea }); g.add(ball(0.17, w, 0, 0.2, 0), ball(0.1, w, 0, 0.36, 0.13), ball(0.035, std({ color: 0xd0392b }), 0, 0.46, 0.13, 0)); const bk = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), std({ color: 0xe2a22a })); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.36, 0.25); g.add(bk); break; }
      case 'cow': { const w = std({ color: 0xf2efe8 }), k = std({ color: 0x24211f }); g.add(box(0.6, 0.6, 1.2, w, 0, 0.45), box(0.4, 0.4, 0.45, w, 0, 0.75, 0.75), box(0.62, 0.3, 0.4, k, 0, 0.75, -0.1), box(0.3, 0.2, 0.2, std({ color: 0xe3b0a6 }), 0, 0.72, 1.0)); for (const [x, z] of [[-0.2, 0.45], [0.2, 0.45], [-0.2, -0.45], [0.2, -0.45]]) g.add(box(0.14, 0.45, 0.14, w, x, 0, z)); break; }
      case 'egg': g.add(ball(0.08, std({ color: 0xf5ecd9 }), 0, 0.08, 0, 1)); break;
      case 'forage': g.add(ball(0.12, std({ color: o.color || 0x7fbf5a }), 0, 0.14, 0, 0), ball(0.09, std({ color: o.color || 0x7fbf5a }), 0.14, 0.1, 0.05, 0)); break;
      case 'float': g.add(ball(0.07, std({ color: 0xe23a2a }), 0, 0.02, 0, 1), ball(0.05, std({ color: 0xffffff }), 0, 0.08, 0, 1)); break;
      case 'storage_box': g.add(box(0.9, 0.55, 0.6, wood), box(0.94, 0.12, 0.64, dark, 0, 0.55), box(0.12, 0.08, 0.04, new THREE.MeshBasicMaterial({ color: 0x6fd3ff }), 0, 0.4, 0.31)); break;
      case 'fridge': g.add(box(0.8, 1.75, 0.7, std({ color: 0xf1e8d4, roughness: 0.5 })), box(0.06, 0.5, 0.06, metal, 0.3, 1.0, 0.36), new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), new THREE.MeshBasicMaterial({ color: 0x9fd8ee }))); g.children[2].position.set(0, 1.35, 0.36); break;
      case 'kitchen': { const w = o.w || 2; g.add(box(w, 0.9, 0.65, std({ color: 0xe8e2d2 }), (w - 1) / 2), box(w + 0.02, 0.06, 0.7, dark, (w - 1) / 2, 0.9), cyl(0.12, 0.12, 0.03, std({ color: 0x333333 }), 0.1, 0.93, 0, 12), cyl(0.12, 0.12, 0.03, std({ color: 0x333333 }), 0.45, 0.93, 0, 12), box(0.4, 0.05, 0.35, metal, w - 1.1, 0.92)); break; }
      case 'wardrobe': g.add(box(0.9, 1.9, 0.6, wood), box(0.02, 1.7, 0.02, dark, 0, 0.1, 0.31)); break;
      case 'tv': g.add(box(0.7, 0.45, 0.3, wood), box(0.75, 0.5, 0.4, std({ color: 0x5a4a3a }), 0, 0.45), box(0.55, 0.36, 0.02, new THREE.MeshBasicMaterial({ color: 0x7fc8e8 }), 0, 0.52, 0.21)); break;
      case 'lamp': { g.add(cyl(0.03, 0.05, 1.3, dark), cyl(0.12, 0.2, 0.25, std({ color: 0xf3dfa8, emissive: 0x6a5020 }), 0, 1.25, 0, 12)); const pl = new THREE.PointLight(0xffd7a0, 6, 6, 1.6); pl.position.y = 1.3; g.add(pl); break; }
      case 'chair': g.add(box(0.45, 0.06, 0.45, wood, 0, 0.45), box(0.45, 0.5, 0.06, wood, 0, 0.5, -0.2), box(0.05, 0.45, 0.05, dark, -0.18, 0, 0.18), box(0.05, 0.45, 0.05, dark, 0.18, 0, 0.18)); break;
      case 'calendar_board': g.add(box(0.06, 1.0, 0.06, dark, 0, 0), box(0.8, 0.6, 0.05, std({ color: 0xc9a877 }), 0, 0.95), box(0.25, 0.3, 0.01, std({ color: 0xffffff }), -0.15, 1.1, 0.03), box(0.2, 0.15, 0.01, std({ color: 0xffe08a }), 0.2, 1.0, 0.03)); break;
      case 'onsen_pool': {                                 // a stone rim around steaming water, built centred and moved to the first tile
        const w = o.w || 4, d = o.d || 3, rim = std({ color: 0x9a958c }), dk = std({ color: 0x6f6a62 });
        const water = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.5, d - 0.5), new THREE.MeshStandardMaterial({ color: 0x8fd3d0, emissive: 0x2a6f6a, emissiveIntensity: 0.35, transparent: true, opacity: 0.88, roughness: 0.1 }));
        water.rotation.x = -Math.PI / 2; water.position.y = 0.22; g.add(water, box(w - 0.5, 0.2, d - 0.5, std({ color: 0x3f6f6a }), 0, 0, 0));
        g.add(box(w, 0.32, 0.25, rim, 0, 0, -d / 2 + 0.125), box(w, 0.32, 0.25, rim, 0, 0, d / 2 - 0.125), box(0.25, 0.32, d, rim, -w / 2 + 0.125), box(0.25, 0.32, d, rim, w / 2 - 0.125));
        for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 0.16 + (i % 3) * 0.06; g.add(ball(r, i % 2 ? rim : dk, Math.cos(a) * (w / 2) * 0.98, 0.3, Math.sin(a) * (d / 2) * 0.98, 0)); }
        g.add(box(0.1, 0.5, 0.1, std({ color: 0x8a6a45 }), w / 2 - 0.4, 0.3, -d / 2 + 0.12), box(0.5, 0.06, 0.06, std({ color: 0x8a6a45 }), w / 2 - 0.4, 0.75, -d / 2 + 0.12));   // the hot-water spout
        for (const c of g.children) { c.position.x += (w - 1) / 2; c.position.z += (d - 1) / 2; }
        break;
      }
      case 'field_chest': g.add(box(0.85, 0.5, 0.58, std({ color: 0x5f7f8f, metalness: 0.3, roughness: 0.6 })), box(0.89, 0.14, 0.62, std({ color: 0x8a6a45 }), 0, 0.5), box(0.12, 0.1, 0.04, new THREE.MeshBasicMaterial({ color: 0xffd36a }), 0, 0.38, 0.3), box(0.89, 0.05, 0.05, dark, 0, 0.12, 0.3), box(0.89, 0.05, 0.05, dark, 0, 0.12, -0.3)); break;
      case 'charger': { const c = colonyProp('solar_panel', { w: 1 }, { spin: [], glow: [] }); if (c) g.add(c); break; }
      case 'charge_lights': { g.add(box(0.5, 0.26, 0.16, std({ color: 0x3c4650, metalness: 0.4 }), 0, 0, 0.5)); for (let i = 0; i < 2; i++) { const s = o.slots && o.slots[i]; g.add(box(0.14, 0.18, 0.04, s ? new THREE.MeshBasicMaterial({ color: s === 'battery_full' ? 0x7dffb0 : 0xffb347 }) : std({ color: 0x222222 }), -0.11 + i * 0.22, 0.04, 0.59)); } break; }
      case 'farm_bot': {                                   // a cute round robot: body, face screen, antenna, little wheels
        const shell = std({ color: o.color || 0xf2efe6, roughness: 0.5 }), trim = std({ color: o.trim || 0x5fb3b0, roughness: 0.5 });
        g.add(ball(0.26, shell, 0, 0.36, 0, 2), cyl(0.27, 0.27, 0.07, trim, 0, 0.24, 0, 18));
        const scr = new THREE.Mesh(new THREE.CircleGeometry(0.15, 18), new THREE.MeshBasicMaterial({ color: 0x1f2a38 })); scr.position.set(0, 0.42, 0.245); g.add(scr);
        for (const x of [-0.06, 0.06]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), new THREE.MeshBasicMaterial({ color: 0x7dffe0 })); e.position.set(x, 0.44, 0.25); g.add(e); }
        const sm = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 4, 10, Math.PI), new THREE.MeshBasicMaterial({ color: 0x7dffe0 })); sm.rotation.z = Math.PI; sm.position.set(0, 0.39, 0.25); g.add(sm);
        g.add(cyl(0.012, 0.012, 0.18, dark, 0, 0.6, 0, 5), ball(0.04, new THREE.MeshBasicMaterial({ color: 0xffd36a }), 0, 0.8, 0, 1));
        for (const x of [-0.16, 0.16]) { const wh = cyl(0.07, 0.07, 0.06, dark, x, 0.0, 0, 10); wh.rotation.z = Math.PI / 2; wh.position.y = 0.07; g.add(wh); }
        g.add(cyl(0.05, 0.06, 0.12, trim, -0.27, 0.32, 0.02, 8), cyl(0.05, 0.06, 0.12, trim, 0.27, 0.32, 0.02, 8));
        break;
      }
      case 'sapling': case 'fruit_tree_young': case 'fruit_tree': {   // sapling, young, grown; blossom in spring, fruit in season
        const st = kind === 'sapling' ? 0 : kind === 'fruit_tree_young' ? 1 : 2, leafC = season === 3 ? 0x8a7a5a : season === 0 && st === 2 ? (BLOSSOM[o.tree] || 0xffc6d9) : season === 2 && o.tree !== 'peach' ? 0x9fbf4a : 0x4f9a3a;
        const lf = std({ color: leafC });
        if (st === 0) { g.add(cyl(0.03, 0.04, 0.7, dark), ball(0.2, std({ color: 0x6fbf5a }), 0, 0.75, 0), cyl(0.18, 0.2, 0.08, std({ color: 0x7a5a3a }), 0, 0, 0, 10)); break; }
        const k = st === 1 ? 0.6 : 1;
        g.add(cyl(0.1 * k, 0.16 * k, 1.3 * k, dark), ball(0.95 * k, lf, 0, 1.9 * k, 0), ball(0.65 * k, lf, 0.5 * k, 2.3 * k, 0.2 * k), ball(0.6 * k, lf, -0.45 * k, 2.2 * k, -0.25 * k));
        if (o.fruit) for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.75 + (i % 3) * 0.12; g.add(ball(0.11, std({ color: FRUIT_COLOR[o.tree] || 0xd8362a, roughness: 0.5 }), Math.cos(a) * r, 1.6 + (i % 4) * 0.25, Math.sin(a) * r, 1)); }
        break;
      }
      default: { const c = colonyProp(kind, o, this.colonyFx || undefined); g.add(c || box(0.6, 0.6, 0.6, std({ color: 0x999999 }))); }
    }
    if (kind === 'memorial' || kind === 'bench') for (const c of g.children) c.position.x += 0.5;
    return g;
  }
  // Build a prop: 3D model if there is one, else its picture, else the stand-in.
  makeProp(kind, o = {}) {
    const def = PROPS[kind] || {}, holder = new THREE.Group();
    const h = (def.h || 1) * (o.scale || 1), fw = o.w || 1, fd = o.d || 1;
    const slot = def.sprite ? def.sprite(this) : null, p = slot && art.pic(slot);
    const mname = o.model && art.hasModel(o.model) ? o.model : typeof def.model === 'function' ? def.model(this) : def.model;
    holder.userData.is3d = !!(mname && art.hasModel(mname)) || !p;
    const fallback = () => { if (p) holder.add(this.billboard(p, h, def)); else { const m = this.proc(kind, o); if (o.scale) m.scale.setScalar(o.scale); if ((fw > 1 || fd > 1) && !COLONY_KINDS.has(kind)) m.position.set(-(fw - 1) / 2, 0, -(fd - 1) / 2); holder.add(m); } };
    if (mname && art.hasModel(mname)) {
      art.model(mname).then((m) => {
        if (!m) return fallback();
        const s = art.modelInfo(mname).size || [1, 1, 1];
        if (def.fit === 'repeat') {                         // several copies side by side along a long footprint
          const k = h / s[1], n = Math.max(1, Math.round(fw / (s[0] * k))), step = fw / n;
          for (let i = 0; i < n; i++) { const c = i ? m.clone(true) : m; c.scale.setScalar(Math.min(k, step * 0.98 / s[0])); c.position.x = -fw / 2 + step * (i + 0.5); holder.add(c); }
          return;
        }
        if (def.fit === 'stretch') m.scale.set(fw * 0.98 / s[0], h / s[1], Math.min(h / s[1], fd * 0.9 / s[2]));
        else if (def.fit === 'foot') m.scale.setScalar(Math.min(h / s[1], fw * 0.96 / s[0], fd * 0.96 / s[2]));
        else if (def.fit === 'wide') { const [ex, ez] = o.turned ? [fd, fw] : [Math.max(fw, 0.8), Math.max(fw, 0.8)]; m.scale.setScalar(Math.min(ex * 0.95 / s[0], ez * 0.95 / s[2])); }   // a turned prop (the barge) fits its footprint across
        else m.scale.setScalar(Math.min(h / (s[1] || 1), (def.maxW || 99) * (o.scale || 1) / Math.max(s[0], s[2])));
        if (def.hover) m.position.y = def.hover * 0.5;
        if (def.soft) m.traverse((q) => { if (q.isMesh) q.castShadow = false; });
        holder.add(m);
      });
      if (def.lamp) { const pl = new THREE.PointLight(0xffc878, 0, 9, 1.6); pl.position.y = def.lamp; holder.add(pl); holder.userData.lamp = pl; }
    } else fallback();
    if (def.hover && !(mname && art.hasModel(mname))) holder.userData.hover = def.hover;
    if (kind === 'onsen_pool') holder.add(this.steamCloud(fw, fd));
    return holder;
  }
  // Wisps of steam that rise and fade over hot water (animated in update()).
  steamCloud(w, d) {
    if (!World.steamTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); World.steamTex = new THREE.CanvasTexture(c); }
    const g = new THREE.Group();
    for (let i = 0; i < 16; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: World.steamTex, transparent: true, opacity: 0.3, depthWrite: false })); m.userData.seed = i * 1.37; m.userData.x = (((i * 0.618) % 1) - 0.5) * (w - 0.8); m.userData.z = (((i * 0.383) % 1) - 0.5) * (d - 0.8); g.add(m); }
    (this.steam ||= []).push(g); return g;
  }

  // ------------------------------------------------------------ buildings
  makeBuilding(b) {
    const def = BUILDING[b.kind] || BUILDING.house, g = new THREE.Group();
    g.position.set(b.x + b.w / 2, 0, b.y + b.d / 2);
    const kind = b.kind === 'greenhouse' && !this.flags.greenhouse ? 'greenhouse_ruin' : b.kind;
    const mname = kind === 'greenhouse_ruin' ? 'greenhouse_ruin' : Array.isArray(def.model) ? def.model.find((n) => art.hasModel(n)) : def.model;
    const proc = () => {
      const H = b.height, wallH = def.round || def.frame ? H : H * 0.62;
      if (def.round) { g.add(cyl(b.w * 0.45, b.w * 0.45, H * 0.85, std({ map: art.tex(def.wall, { repeat: 1 }) }), 0, 0, 0, 20)); const c = new THREE.Mesh(new THREE.ConeGeometry(b.w * 0.5, H * 0.2, 20), std({ map: art.tex(def.roof) })); c.position.y = H * 0.95; c.castShadow = true; g.add(c); return; }
      if (def.frame) { const m = std({ color: 0x6b4a36, metalness: 0.5, roughness: 0.7 }); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.18, H, 0.18, m, x * b.w * 0.4, 0, z * b.d * 0.4)); g.add(box(b.w * 0.9, 0.2, b.d * 0.9, m, 0, H), box(b.w * 0.9, 0.12, b.d * 0.9, m, 0, H * 0.5), cyl(0.5, 0.5, 0.3, std({ color: 0x3c3a36 }), 0, H + 0.2, 0)); return; }
      const glass = kind.startsWith('greenhouse');
      const wm = glass ? new THREE.MeshStandardMaterial({ color: kind === 'greenhouse_ruin' ? 0x8f9c98 : 0xcfeaf0, transparent: true, opacity: kind === 'greenhouse_ruin' ? 0.35 : 0.45, roughness: 0.15 }) : std({ map: art.tex(def.wall, { repeat: 0.5 }) });
      const walls = box(b.w - 0.1, wallH, b.d - 0.1, wm); if (glass) walls.castShadow = false; g.add(walls);
      const fp = art.pic(kind === 'greenhouse_ruin' ? 'buildings/greenhouse_ruin' : def.facade);
      const rm = glass ? wm : std({ map: art.tex(def.roof, { repeat: 0.5 }), side: THREE.DoubleSide });
      const roof = new THREE.Mesh(gable(b.w + 0.5, b.d + 0.5, H - wallH), rm); roof.position.y = wallH; roof.castShadow = !glass; roof.receiveShadow = true; g.add(roof);
      if (fp) { const f = new THREE.Mesh(new THREE.PlaneGeometry(b.w - 0.1, H), this.spriteMat(fp.tex, { alphaTest: 0.3 })); f.position.set(0, H / 2, b.d / 2 - 0.03); g.add(f); }
      else if (!glass) { g.add(box(0.9, 1.6, 0.06, std({ color: 0x4a3626 }), 0, 0, b.d / 2 - 0.04)); for (const x of [-1, 1]) if (b.w > 4) g.add(box(0.7, 0.6, 0.05, std({ color: 0x9fd0e0, roughness: 0.2 }), x * b.w * 0.3, wallH * 0.45, b.d / 2 - 0.04)); }
      buildingExtras(b, g);
    };
    if (mname && art.hasModel(mname)) {
      art.model(mname).then((m) => {
        if (!m) return proc();
        const s = art.modelInfo(mname).size || [1, 1, 1];
        // fill the footprint (no invisible walls around a small model), stretching x and z by at most a third
        const kx = (b.w + 0.2) / s[0], kz = (b.d + 0.2) / s[2], k = Math.min(kx, kz, (b.height * 1.4) / s[1]);
        m.scale.set(Math.min(kx, k * 1.33), k, Math.min(kz, k * 1.33));
        g.add(m);
      });
    } else proc();
    return g;
  }

  // ------------------------------------------------------------ the map
  setMap(map, state) {
    this.map = map; this.state = state; this.season = state.cal.season; this.flags = state.flags || {};
    this.root.clear(); this.facers.length = 0; this.spriteMats.length = 0; this.anims.length = 0; this.tileObjs.clear();
    for (const a of this.actors.values()) a.dispose && a.dispose(); this.actors.clear();
    this.lamps = []; this.waterMats = []; this.tallProps = []; this.steam = [];
    const R = this.root, W = map.w, H = map.h;
    // ground, one merged mesh per kind
    const byKind = {};
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = map.at(x, y); (byKind[c] ||= []).push(x, y); }
    for (const [c, cells] of Object.entries(byKind)) {
      if (c === 'x') continue;
      if (c === 'r') { const m = new THREE.Mesh(tiles(cells, 1.7, true), std({ map: art.tex('cliff_rock', { repeat: 1 }) })); m.castShadow = m.receiveShadow = true; R.add(m); continue; }
      if (c === 'w') {
        const bed = new THREE.Mesh(tiles(cells, -0.5), std({ color: 0x2a3a34 })); R.add(bed);
        // the surface sits just above the colony's surrounding ground sheet (y -0.07), which runs under the whole map
        const wm = new THREE.MeshStandardMaterial({ map: art.tex('water', { repeat: 1 }).clone(), color: 0xb8dce6, transparent: true, opacity: 0.94, roughness: 0.12, metalness: 0.1 });
        wm.map.wrapS = wm.map.wrapT = THREE.RepeatWrapping; wm.map.needsUpdate = true; this.waterMats.push(wm);
        const m = new THREE.Mesh(tiles(cells, -0.04), wm); m.receiveShadow = true; R.add(m); continue;
      }
      const cp = c === 'c' && !map.indoor && art.has('textures/colony_path');   // colony art, when the pack has it
      const slot = c === 'g' ? 'grass_' + SEASON_KEY[this.season] : cp ? 'colony_path' : GROUND_TEX[c] || 'soil_dry';
      const m = new THREE.Mesh(tiles(cells, c === 'k' ? 0.06 : c === 'd' ? 0.015 : 0, false, c === 'c' ? 0.34 : c === 'k' || c === 'b' || c === 'd' ? 0.5 : 0.25), std({ map: art.tex(slot, { repeat: 1 }), color: c === 'f' ? 0xb48a66 : c === 'c' ? 0xd8d2c8 : 0xffffff })); m.receiveShadow = true; R.add(m);
    }
    this.colony.setCentre(H / 2); this.spinners = []; this.bots = null; this.pools = null;
    if (!map.indoor && !map.ruins) R.add(buildSurroundings(map, this.season));   // terraces rising into the cylinder's curve
    else if (!map.indoor) {                              // the Old World: ash plains and broken towers
      const slot = map.ruins ? 'ash_ground' : 'grass_' + SEASON_KEY[this.season];
      const t = art.tex(slot, { repeat: 1 }).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.needsUpdate = true;
      const far = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), std({ map: t })); far.rotation.x = -Math.PI / 2; far.position.set(W / 2, -0.04, H / 2); far.receiveShadow = true; R.add(far);
      if (false) for (let i = 0; i < 70; i++) { const a = i * 2.399, d = Math.max(W, H) * 0.62 + (i % 7) * 4; const x = W / 2 + Math.cos(a) * d, z = H / 2 + Math.sin(a) * d * 0.9; if (x > -2 && x < W + 2 && z > -2 && z < H + 2) continue; if (z > H && Math.abs(x - W / 2) < 16) continue; const p = this.makeProp(i % 3 ? 'tree' : 'pine', { scale: 1 + (i % 5) * 0.12 }); p.position.set(x, 0, z); R.add(p); }
      else for (let i = 0; i < 26; i++) { const a = i * 2.399, d = 14 + (i % 6) * 5; const h = 3 + (i % 5) * 2.2; const t2 = box(2 + (i % 3), h, 2 + (i % 2), std({ map: art.tex(i % 2 ? 'concrete_ruin' : 'brick_ruin', { repeat: 0.25 }) })); t2.position.set(W / 2 + Math.cos(a) * d, h / 2, H / 2 + Math.sin(a) * d - 6); if (t2.position.z > H - 1) continue; t2.rotation.z = (i % 4 - 1.5) * 0.03; R.add(t2); }
    } else {                                             // room walls: back and sides, open to the camera
      const wm = map.glass ? new THREE.MeshStandardMaterial({ color: 0xcfeaf0, transparent: true, opacity: 0.3, roughness: 0.1 }) : std({ map: art.tex(map.id === 'barn' || map.id === 'ranch' ? 'barn_red' : map.id === 'coop' || map.id === 'house' || map.id === 'workshop' ? 'plank_wall' : map.id === 'cafe' ? 'metal_hull' : 'plaster_wall', { repeat: 0.5 }) });
      const hh = 2.9; R.add(box(W, hh, 0.2, wm, W / 2, 0, -0.1), box(0.2, hh, H, wm, -0.1, 0, H / 2), box(0.2, hh, H, wm, W + 0.1, 0, H / 2));
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.6), std({ color: 0x6f5a3a })); mat.rotation.x = -Math.PI / 2; mat.position.set(map.exitTile[0] + 0.5, 0.02, map.exitTile[1] + 0.6); R.add(mat);
      const lamp = new THREE.PointLight(0xffd9a0, 30, 30, 1.6); lamp.position.set(W / 2, 3.4, H / 2); R.add(lamp);
    }
    for (const b of map.buildings) R.add(this.makeBuilding(b));
    const built = [], pools = [];
    map.props.forEach((p, pi) => { p.index = pi; });
    for (const p of map.props) {
      let kind = p.kind === 'tree' && p.y >= H - 1 ? 'bush' : p.kind;
      if ((kind === 'tree' || kind === 'pine') && this.isFelled && this.isFelled(map.id + ':' + p.index)) kind = 'stump';
      this.colonyFx = { spin: this.spinners, glow: [] };
      const turn = kind === 'pipe_run' && p.d > p.w;            // a pipe running north-south is built east-west and turned
      const o = this.makeProp(kind, turn ? { ...p, w: p.d, d: p.w } : p);
      if (turn) o.userData.turn = true;
      if (COLONY_KINDS.has(kind) && !art.hasModel(kind) && kind !== 'maint_bot') built.push(o);
      const rr = p.rot && o.userData.is3d ? p.rot : 0;
      for (const q of this.colonyFx.glow) pools.push({ x: p.x + p.w / 2 + q.x * Math.cos(rr) + q.z * Math.sin(rr), z: p.y + p.d / 2 - q.x * Math.sin(rr) + q.z * Math.cos(rr), warm: q.warm });
      if (kind === 'lantern') pools.push({ x: p.x + 0.5, z: p.y + 0.5, warm: true, r: 2.2 });
      o.position.set(p.x + p.w / 2, p.onWater ? -0.18 : 0, p.y + p.d / 2);
      if (p.rot && (o.userData.is3d || kind === 'fence')) o.rotation.y = p.rot;
      if (o.userData.turn) o.rotation.y = Math.PI / 2;
      R.add(o); p.obj = o; if (kind === 'tree' || kind === 'pine' || kind === 'bush') this.tallProps.push(o);
      if (kind === 'tree' && p.fruit && this.wildFruitShown && this.wildFruitShown(map, p)) {     // a fruiting wild tree: fruit in the canopy
        const col = { plum: 0x7a2f6a, loquat: 0xf0a830, mulberry: 0x3a1838, wild_apple: 0xc8402a, chestnut: 0x8a5a2a, yuzu: 0xf2d23a }[p.fruit] || 0xd04030;
        const fg = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }), geo = new THREE.SphereGeometry(0.11, 8, 6), sc = p.scale || 1;
        for (let i = 0; i < 9; i++) { const a = i * 2.4 + p.x, r = 0.8 + (i % 3) * 0.25, f = new THREE.Mesh(geo, mat); f.position.set(Math.cos(a) * r * sc, (2.1 + (i % 4) * 0.35) * sc, Math.sin(a) * r * sc); fg.add(f); }
        o.add(fg); o.userData.fruits = fg;
      }
      const lampL = o.userData.lamp || (o.children[0] && o.children[0].userData.lamp); if (lampL) this.lamps.push(lampL);
    }
    this.colonyFx = null;
    for (const s of this.spinners) s.o.userData.moving = true;
    if (built.length) mergeStatic(built, R);                   // the built colony props: one mesh per material
    if (pools.length) { this.pools = lightPools(pools); R.add(this.pools); }
    if (map.bots) this.bots = new Bots(map.bots, R, () => this.makeProp('maint_bot', {}));
    this.dyn = new THREE.Group(); R.add(this.dyn);
    if (map.field) this.buildField(map.field);
    if (map.pasture) this.buildPasture();
  }

  // ------------------------------------------------------------ field and pasture
  buildField(f) { const fd = this.state.fields[f.id]; if (!fd) return; for (let i = 0; i < fd.tiles.length; i++) this.refreshTile(f.id, i); }
  refreshTile(fieldId, i) {
    const f = this.map.field; if (!f || f.id !== fieldId) return;
    const fd = this.state.fields[fieldId], t = fd.tiles[i], x = f.x + (i % fd.w) + 0.5, z = f.y + Math.floor(i / fd.w) + 0.5, key = 'f' + i;
    const old = this.tileObjs.get(key); if (old) { this.dyn.remove(old); this.unface(old); }
    const g = new THREE.Group(); g.position.set(x, 0, z);
    if (t.till) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), std({ map: art.tex(t.wet ? 'soil_wet' : 'soil_tilled', { repeat: 1, wrap: false }) })); q.rotation.x = -Math.PI / 2; q.position.y = 0.025; q.receiveShadow = true; g.add(q); }
    if (t.obj) { const o = this.makeProp(t.obj, { scale: 0.9 + ((i * 37) % 10) / 40 }); o.rotation.y = PROPS[t.obj].face ? 0 : i * 1.7; g.add(o); }
    if (t.crop) g.add(this.makeCrop(t.crop, i));
    this.tileObjs.set(key, g); this.dyn.add(g);
  }
  makeCrop(crop, i) {
    const st = crop.dead ? -1 : cropStage(crop), id = crop.id;
    const slot = st < 0 ? 'sprites/dead' : st === 0 ? 'sprites/sprout' : st === 3 ? `sprites/crop_${id}_2` : `sprites/crop_${id}_1`;
    const full = CROP_H[id] || 0.6, h = st < 0 ? 0.5 : st === 0 ? 0.22 : st === 1 ? full * 0.5 : st === 2 ? full * 0.8 : full;
    const mname = st < 0 ? 'dead_plant' : st === 0 ? 'sprout' : st === 3 ? 'crop_' + id : 'young_plant';
    if (art.hasModel(mname)) {
      const holder = new THREE.Group(); holder.rotation.y = (i * 2.4) % 6.28;
      art.model(mname).then((m) => { if (!m) return; const s = art.modelInfo(mname).size || [1, 1, 1]; m.scale.setScalar(Math.min(Math.max(0.2, h) / s[1], 0.95 / Math.max(s[0], s[2]))); if (st < 3) m.traverse((q) => { if (q.isMesh) q.castShadow = false; }); holder.add(m); });
      return holder;
    }
    const p = art.pic(slot);
    if (p) { const b = this.billboard(p, Math.max(0.2, h), { cross: true }); b.rotation.y = (i * 0.7) % 1.5; return b; }
    const g = new THREE.Group(), green = std({ color: st < 0 ? 0x7a6a4a : 0x4f9a3a });
    const n = st <= 0 ? 2 : 4; for (let k = 0; k < n; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.1 + h * 0.12, h, 5), green); c.position.set(Math.sin(k * 1.6) * 0.14, h / 2, Math.cos(k * 1.6) * 0.14); c.castShadow = true; g.add(c); }
    if (st === 3) g.add(ball(0.13, std({ color: CROP_COLOR[id] || 0xffffff }), 0, Math.min(h * 0.6, 0.5), 0.12, 1), ball(0.1, std({ color: CROP_COLOR[id] || 0xffffff }), -0.12, Math.min(h * 0.45, 0.4), -0.08, 1));
    return g;
  }
  buildPasture() { const P = this.state.pasture; for (let i = 0; i < P.grass.length; i++) this.refreshPasture(i); }
  refreshPasture(i) {
    const P = this.map.pasture; if (!P) return; const st = this.state.pasture.grass[i], key = 'p' + i;
    const old = this.tileObjs.get(key); if (old) { this.dyn.remove(old); this.unface(old); this.tileObjs.delete(key); }
    if (!st) return;
    let g;
    if (art.hasModel('grass_tuft')) { g = new THREE.Group(); art.model('grass_tuft').then((m) => { if (!m) return; const s = art.modelInfo('grass_tuft').size || [1, 1, 1]; m.scale.setScalar((0.25 + st * 0.22) / s[1]); m.traverse((q) => { if (q.isMesh) q.castShadow = false; }); g.add(m); }); }
    else { const p = art.pic('sprites/grass_' + st); g = p ? this.billboard(p, 0.25 + st * 0.22, { cross: true }) : this.proc('weed'); if (!p) g.scale.setScalar(0.6 + st * 0.35); }
    g.position.set(P.x + (i % P.w) + 0.5, 0, P.y + Math.floor(i / P.w) + 0.5); g.rotation.y = i;
    this.tileObjs.set(key, g); this.dyn.add(g);
  }
  unface(obj) { obj.traverse((o) => { const k = this.facers.indexOf(o); if (k >= 0) this.facers.splice(k, 1); }); }
  // A loose object in the dynamic layer (forage, eggs, rubble, monsters, the Hydra…).
  place(key, kind, x, y, o = {}) {
    this.unplace(key);
    const g = kind ? this.makeProp(kind, o) : new THREE.Group(); if (o.procKind) g.add(this.proc(o.procKind, o));
    g.position.set(x, o.h0 || 0, y); this.tileObjs.set(key, g); this.dyn.add(g); return g;
  }
  unplace(key) { const old = this.tileObjs.get(key); if (old) { this.dyn.remove(old); this.unface(old); this.tileObjs.delete(key); } }

  // ------------------------------------------------------------ effects
  puff(x, y, color = 0xc9a877, n = 8, h = 0.2) {
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 5, 4), new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.set(x, h, y); this.scene.add(m); this.fx.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 2, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 2), life: 0.6 }); }
  }
  beam(x0, y0, h0, x1, y1, h1, color = 0xff6a3a) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, h0, y0), new THREE.Vector3(x1, h1, y1)]);
    const m = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true })); this.scene.add(m); this.fx.push({ m, v: null, life: 0.16 });
  }
  setCursor(x, y, on) { this.cursor.visible = on; if (on) this.cursor.position.set(x + 0.5, 0.05, y + 0.5); }
  // world tile position → screen pixels (for floating labels)
  project(x, y, h = 0) { const v = new THREE.Vector3(x, h, y).project(this.camera), c = this.renderer.domElement; return { x: (v.x * 0.5 + 0.5) * c.clientWidth, y: (-v.y * 0.5 + 0.5) * c.clientHeight, behind: v.z > 1 }; }

  // ------------------------------------------------------------ frame
  update(dt, px, py) {
    this.t += dt;
    const indoor = this.map && this.map.indoor, d = indoor ? Math.min(this.dist, 10.5) : this.dist;
    this.focus.lerp(new THREE.Vector3(px, 0.8, py), Math.min(1, dt * 7));
    const cp = Math.cos(this.pitch), c = this.camera;
    c.position.set(this.focus.x + Math.sin(this.yaw) * cp * d, this.focus.y + Math.sin(this.pitch) * d, this.focus.z + Math.cos(this.yaw) * cp * d);
    if (this.shake > 0.002) { c.position.x += (Math.random() - 0.5) * this.shake; c.position.y += (Math.random() - 0.5) * this.shake; this.shake *= Math.pow(0.02, dt); } else this.shake = 0;
    const up = indoor ? 0 : Math.max(0, 0.42 - this.pitch) * d * 0.6;   // a low camera tilts up to the land overhead
    c.lookAt(this.focus.x, this.focus.y + up, this.focus.z);
    for (const k in this.sky) this.sky[k].position.copy(c.position);
    this.colony.update(c);
    for (const s of this.spinners || []) s.o.rotation[s.axis] += s.speed * dt;
    for (const g of this.steam || []) for (const m of g.children) { const k = ((this.t * 0.25 + m.userData.seed) % 1); m.position.set(m.userData.x + Math.sin(this.t + m.userData.seed) * 0.15, 0.3 + k * 1.7, m.userData.z); m.scale.setScalar(0.7 + k * 1.6); m.material.opacity = 0.42 * Math.sin(k * Math.PI); }
    if (this.bots) this.bots.update(dt, this.t);
    for (const f of this.facers) f.rotation.y = this.yaw;
    for (const m of this.waterMats || []) m.map.offset.set(this.t * 0.015, this.t * 0.01);
    for (const l of this.lamps || []) l.intensity = (this.night || 0) * 14;
    for (const a of this.actors.values()) a.update(dt, this);
    // trees standing between the camera and Sato step aside
    const cx = Math.sin(this.yaw), cz = Math.cos(this.yaw);
    // trees between the camera and Sato turn see-through (about 8% opaque) instead of collapsing
    for (const o of this.tallProps || []) {
      const rx = o.position.x - px, rz = o.position.z - py, along = rx * cx + rz * cz, lat = Math.abs(rx * cz - rz * cx);
      const hide = along > 0.3 && along < 9 && lat < 2.2, k0 = o.userData.k ?? 1;
      const k = Math.max(0.08, Math.min(1, k0 + (hide ? -dt : dt) * 4)); if (k === k0) continue; o.userData.k = k;
      if (!o.userData.ownMats) { o.userData.ownMats = []; o.traverse((q) => { if (q.isMesh && q.material) { q.material = q.material.clone(); q.material.transparent = true; o.userData.ownMats.push(q.material); } }); }
      for (const m of o.userData.ownMats) { m.opacity = k; m.depthWrite = k > 0.97; m.alphaTest = k > 0.97 ? (m.alphaTest || 0) : 0; }
      o.traverse((q) => { if (q.isMesh) q.castShadow = k > 0.5; });
    }
    for (const [k, o] of this.tileObjs) if (o.userData.hover || (o.children[0] && o.children[0].userData.hover)) o.position.y = Math.sin(this.t * 2 + k.length) * 0.08;
    if (this.weather.visible) {
      const p = this.weather.geometry.attributes.position; this.weather.position.set(px, 0, py);
      for (let i = 0; i < p.count; i++) { let y = p.getY(i) - this.weatherSpeed * dt; if (y < 0) y += 18; p.setY(i, y); }
      p.needsUpdate = true;
    }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.life -= dt; if (f.v) { f.v.y -= 6 * dt; f.m.position.addScaledVector(f.v, dt); } f.m.material.opacity = Math.max(0, f.life * 2); if (f.life <= 0) { this.scene.remove(f.m); this.fx.splice(i, 1); } }
    this.renderer.render(this.scene, c);
  }
}

// Flat tiles (or blocks when `block`) merged into one geometry; UVs follow world position so textures tile.
function tiles(cells, y, block = false, S = 0.25) {
  const pos = [], uv = [], nor = [], idx = [];
  const quad = (a, b, c, d, n) => { const k = pos.length / 3; for (const p of [a, b, c, d]) { pos.push(...p); nor.push(...n); uv.push((n[1] ? p[0] : p[0] + p[2]) * S, (n[1] ? -p[2] : p[1]) * S); } idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const set = block ? new Set() : null; if (block) for (let i = 0; i < cells.length; i += 2) set.add(cells[i] + ',' + cells[i + 1]);
  for (let i = 0; i < cells.length; i += 2) {
    const x = cells[i], z = cells[i + 1];
    quad([x, y, z], [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z], [0, 1, 0]);
    if (block) {
      if (!set.has(x + ',' + (z + 1))) quad([x, 0, z + 1], [x + 1, 0, z + 1], [x + 1, y, z + 1], [x, y, z + 1], [0, 0, 1]);
      if (!set.has(x + ',' + (z - 1))) quad([x + 1, 0, z], [x, 0, z], [x, y, z], [x + 1, y, z], [0, 0, -1]);
      if (!set.has((x + 1) + ',' + z)) quad([x + 1, 0, z + 1], [x + 1, 0, z], [x + 1, y, z], [x + 1, y, z + 1], [1, 0, 0]);
      if (!set.has((x - 1) + ',' + z)) quad([x, 0, z], [x, 0, z + 1], [x, y, z + 1], [x, y, z], [-1, 0, 0]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
// A gable roof: ridge along x, sitting on y = 0, with end triangles.
function gable(w, d, h) {
  const x = w / 2, z = d / 2, pos = [], uv = [], idx = [];
  const tri = (pts, uvs) => { const k = pos.length / 3; pts.forEach((p) => pos.push(...p)); uvs.forEach((u) => uv.push(...u)); for (let i = 1; i < pts.length - 1; i++) idx.push(k, k + i, k + i + 1); };
  const L = Math.hypot(z, h) / 2;
  tri([[-x, 0, z], [x, 0, z], [x, h, 0], [-x, h, 0]], [[0, 0], [w / 2, 0], [w / 2, L], [0, L]]);
  tri([[x, 0, -z], [-x, 0, -z], [-x, h, 0], [x, h, 0]], [[0, 0], [w / 2, 0], [w / 2, L], [0, L]]);
  tri([[-x + 0.25, 0, -z + 0.25], [-x + 0.25, 0, z - 0.25], [-x + 0.25, h, 0]], [[0, 0], [d / 2, 0], [d / 4, h / 2]]);
  tri([[x - 0.25, 0, z - 0.25], [x - 0.25, 0, -z + 0.25], [x - 0.25, h, 0]], [[0, 0], [d / 2, 0], [d / 4, h / 2]]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
