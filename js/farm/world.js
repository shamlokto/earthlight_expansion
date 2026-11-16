// Sato's Harvest: the 3D world (three.js). Builds a scene from a map (js/farm/maps.js), keeps the
// field, people and animals in step with the state, and runs the camera, sky, light and weather.
// Every visual goes model → picture → procedural stand-in (js/farm/art.js), so it never fails.
import * as THREE from 'three';
import * as art from './art.js';
import { CROPS } from './data.js';
import { cropStage } from './sim.js';

const GROUND_TEX = { f: 'soil_dry', p: 'path_dirt', c: 'cobble', s: 'sand', k: 'wood_floor', a: 'ash_ground', o: 'stone_floor', h: 'hay', b: 'wood_floor' };
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
  weed: { model: 'weed', sprite: () => 'sprites/weed', h: 0.5, cross: true, soft: true },
  rock: { model: 'rock', sprite: () => 'sprites/rock', h: 0.42, face: true },
  branch: { model: 'branch', sprite: () => 'sprites/branch', h: 0.3, face: true, fit: 'wide', soft: true },
  stump: { model: 'stump', sprite: () => 'sprites/stump', h: 0.6, face: true },
  boulder: { model: 'boulder', sprite: () => 'sprites/boulder', h: 0.95, face: true },
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
  shelf: { model: 'shelf', sprite: () => 'sprites/shelf', h: 1.9, face: true, fit: 'stretch' },
  counter: { model: 'counter', h: 1.0, fit: 'stretch' },
  desk: { model: 'counter', h: 1.0, fit: 'stretch' },
  trough: { model: 'trough', sprite: () => 'sprites/trough', h: 0.55, face: true, fit: 'stretch' },
  nestbox: { model: 'nestbox', sprite: () => 'sprites/nestbox', h: 0.9, face: true, fit: 'stretch' },
  haybale: { model: 'haybale', h: 0.8, fit: 'foot' },
  crate: { model: 'crate', h: 0.8, fit: 'foot' },
  case: { model: 'display_case', h: 1.3, fit: 'foot' },
  workbench: { model: 'workbench', h: 1.1, fit: 'foot' },
  plantpot: { model: 'plantpot', h: 1.0 },
  ruinwall: { model: 'ruin_wall', h: 1.9, fit: 'foot' },
  rubble: { model: 'rubble', sprite: () => 'sprites/rubble', h: 0.75, face: true },
  rubble_done: { model: 'rubble_done', sprite: () => 'sprites/rubble_done', h: 0.22, face: true, soft: true },
  stairs: { model: 'stairs', sprite: () => 'sprites/stairs', h: 0.7, face: true, fit: 'foot' },
  hydra: { model: 'hydra', sprite: () => 'sprites/hydra', h: 1.0, face: true },
  crawler: { model: 'crawler', sprite: () => 'sprites/crawler', h: 0.7, face: true, turn: true },
  drone: { model: 'drone', sprite: () => 'sprites/drone', h: 0.7, face: true, hover: 0.9, turn: true },
  chicken: { model: 'chicken', sprite: () => 'sprites/chicken_side', h: 0.5, face: true },
  cow: { model: 'cow', sprite: () => 'sprites/cow_side', h: 1.3, face: true },
  egg: { model: 'egg', h: 0.16, soft: true },
  float: { model: 'fish_float', h: 0.22, soft: true },
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
  cottage_a: { model: 'cottage_a', facade: 'buildings/cottage_a', wall: 'plaster_wall', roof: 'roof_red' },
  cottage_b: { model: 'cottage_b', facade: 'buildings/cottage_b', wall: 'plank_wall', roof: 'roof_shingle' },
  lift: { model: 'lift', facade: 'buildings/lift_tower', wall: 'metal_hull', roof: 'roof_tin', frame: true },
};

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
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.3, 600);
    this.yaw = 0; this.pitch = 0.66; this.dist = 12; this.focus = new THREE.Vector3();
    this.hemi = new THREE.HemisphereLight(0xdcecff, 0x8a7a55, 1.0); this.scene.add(this.hemi);
    const s = this.sun = new THREE.DirectionalLight(0xfff2d8, 2.2); s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
    Object.assign(s.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 }); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.03;
    this.scene.add(s, s.target);
    this.scene.fog = new THREE.Fog(0xbcd7ee, 40, 150);
    this.spriteTint = new THREE.Color(1, 1, 1);
    this.spriteMats = []; this.facers = []; this.anims = []; this.fx = [];
    this.sky = this.makeSky();
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
    const indoor = map && map.indoor, ruins = map && map.ruins;
    const h = minute / 60, day = Math.max(0, Math.min(1, Math.min((h - 5) / 1.0, (20.5 - h) / 1.5)));     // 1 by day, 0 at night
    const dusk = Math.max(0, 1 - Math.abs(h - 18.6) / 1.6) + Math.max(0, 1 - Math.abs(h - 6.2) / 0.9) * 0.7;
    const wet = weather === 'rain' || weather === 'storm', snow = weather === 'snow';
    const ang = ((h - 6) / 14) * Math.PI;                                    // the sun-line's light swings east to west
    const f = this.focus;
    this.sun.position.set(f.x + Math.cos(ang) * 30, 26 + Math.sin(ang) * 14, f.z + 16);
    this.sun.target.position.copy(f);
    const sunCol = col(0xfff2d8).lerp(col(0xff9a55), Math.min(1, dusk)).lerp(col(0x7f95c8), 1 - day);
    this.sun.color.copy(sunCol); this.sun.intensity = indoor ? 0.45 : (0.2 + 1.55 * day) * (wet ? 0.45 : snow ? 0.75 : 1) * (ruins ? 0.7 : 1);
    this.hemi.intensity = indoor ? 1.55 : (0.5 + 0.75 * day) * (wet ? 0.85 : 1);
    this.hemi.color.set(indoor ? 0xffe6c4 : ruins ? 0xd9b878 : 0xcfe4ff).lerp(col(0x38466e), indoor ? 0 : (1 - day) * 0.8);
    this.hemi.groundColor.set(ruins ? 0x5a4a30 : 0x6b5a3a);
    const sk = this.sky, set = (k, v) => { sk[k].material.opacity = v; sk[k].visible = v > 0.01; };
    if (indoor) { for (const k in sk) set(k, 0); this.scene.background = col(0x0b0907); }
    else if (ruins) { for (const k in sk) set(k, k === 'ruins' ? 1 : 0); this.scene.background = col(0xb89858); }
    else {
      const st = wet ? 1 : 0, d = Math.min(1, dusk) * (1 - st);
      set('night', 1); set('day', day * (1 - st)); set('dusk', d * 0.9); set('storm', st * (0.25 + 0.75 * day)); set('ruins', 0);
      this.scene.background = col(0x0c1430);
    }
    const fogC = indoor ? col(0x0b0907) : ruins ? col(0xb39a66) : col(0xbcd7ee).lerp(col(0xf1b98a), Math.min(1, dusk) * 0.6).lerp(col(0x101a36), 1 - day);
    if (wet) fogC.lerp(col(0x7f8a94), 0.6);
    this.scene.fog.color.copy(fogC); this.scene.fog.near = indoor ? 60 : wet ? 18 : ruins ? 14 : 40; this.scene.fog.far = indoor ? 200 : wet ? 80 : ruins ? 60 : 160;
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
      default: g.add(box(0.6, 0.6, 0.6, std({ color: 0x999999 })));
    }
    if (kind === 'memorial' || kind === 'bench') for (const c of g.children) c.position.x += 0.5;
    return g;
  }
  // Build a prop: 3D model if there is one, else its picture, else the stand-in.
  makeProp(kind, o = {}) {
    const def = PROPS[kind] || {}, holder = new THREE.Group();
    const h = (def.h || 1) * (o.scale || 1), fw = o.w || 1, fd = o.d || 1;
    const slot = def.sprite ? def.sprite(this) : null, p = slot && art.pic(slot);
    const mname = typeof def.model === 'function' ? def.model(this) : def.model;
    holder.userData.is3d = !!(mname && art.hasModel(mname)) || !p;
    const fallback = () => { if (p) holder.add(this.billboard(p, h, def)); else { const m = this.proc(kind, o); if (o.scale) m.scale.setScalar(o.scale); if (fw > 1 || fd > 1) m.position.set(-(fw - 1) / 2, 0, -(fd - 1) / 2); holder.add(m); } };
    if (mname && art.hasModel(mname)) {
      art.model(mname).then((m) => {
        if (!m) return fallback();
        const s = art.modelInfo(mname).size || [1, 1, 1];
        if (def.fit === 'stretch') m.scale.set(fw * 0.98 / s[0], h / s[1], Math.min(h / s[1], fd * 0.9 / s[2]));
        else if (def.fit === 'foot') m.scale.setScalar(Math.min(h / s[1], fw * 0.96 / s[0], fd * 0.96 / s[2]));
        else if (def.fit === 'wide') m.scale.setScalar(Math.max(fw, 0.8) * 0.95 / Math.max(s[0], s[2]));
        else m.scale.setScalar(h / (s[1] || 1));
        if (def.hover) m.position.y = def.hover * 0.5;
        if (def.soft) m.traverse((q) => { if (q.isMesh) q.castShadow = false; });
        holder.add(m);
      });
      if (def.lamp) { const pl = new THREE.PointLight(0xffc878, 0, 9, 1.6); pl.position.y = def.lamp; holder.add(pl); holder.userData.lamp = pl; }
    } else fallback();
    if (def.hover && !(mname && art.hasModel(mname))) holder.userData.hover = def.hover;
    return holder;
  }

  // ------------------------------------------------------------ buildings
  makeBuilding(b) {
    const def = BUILDING[b.kind] || BUILDING.house, g = new THREE.Group();
    g.position.set(b.x + b.w / 2, 0, b.y + b.d / 2);
    const kind = b.kind === 'greenhouse' && !this.flags.greenhouse ? 'greenhouse_ruin' : b.kind;
    const mname = kind === 'greenhouse_ruin' ? 'greenhouse_ruin' : def.model;
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
    };
    if (mname && art.hasModel(mname)) {
      art.model(mname).then((m) => {
        if (!m) return proc();
        const s = art.modelInfo(mname).size || [1, 1, 1];
        m.scale.setScalar(Math.min((b.w + 0.4) / s[0], (b.d + 0.4) / s[2], (b.height * 1.25) / s[1]));
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
    this.lamps = []; this.waterMats = []; this.tallProps = [];
    const R = this.root, W = map.w, H = map.h;
    // ground, one merged mesh per kind
    const byKind = {};
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = map.at(x, y); (byKind[c] ||= []).push(x, y); }
    for (const [c, cells] of Object.entries(byKind)) {
      if (c === 'x') continue;
      if (c === 'r') { const m = new THREE.Mesh(tiles(cells, 1.7, true), std({ map: art.tex('cliff_rock', { repeat: 1 }) })); m.castShadow = m.receiveShadow = true; R.add(m); continue; }
      if (c === 'w') {
        const bed = new THREE.Mesh(tiles(cells, -0.5), std({ color: 0x2a3a34 })); R.add(bed);
        const wm = new THREE.MeshStandardMaterial({ map: art.tex('water', { repeat: 1 }).clone(), color: 0x9fc4d0, transparent: true, opacity: 0.82, roughness: 0.12, metalness: 0.1 });
        wm.map.wrapS = wm.map.wrapT = THREE.RepeatWrapping; wm.map.needsUpdate = true; this.waterMats.push(wm);
        const m = new THREE.Mesh(tiles(cells, -0.1), wm); m.receiveShadow = true; R.add(m); continue;
      }
      const slot = c === 'g' ? 'grass_' + SEASON_KEY[this.season] : GROUND_TEX[c] || 'soil_dry';
      const m = new THREE.Mesh(tiles(cells, c === 'k' ? 0.06 : 0, false, c === 'c' ? 0.5 : c === 'k' || c === 'b' ? 0.5 : 0.25), std({ map: art.tex(slot, { repeat: 1 }), color: c === 'f' ? 0xb48a66 : c === 'c' ? 0xd8d2c8 : 0xffffff })); m.receiveShadow = true; R.add(m);
    }
    if (!map.indoor) {                                   // land beyond the map's edge
      const slot = map.ruins ? 'ash_ground' : 'grass_' + SEASON_KEY[this.season];
      const t = art.tex(slot, { repeat: 1 }).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.needsUpdate = true;
      const far = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), std({ map: t })); far.rotation.x = -Math.PI / 2; far.position.set(W / 2, -0.04, H / 2); far.receiveShadow = true; R.add(far);
      if (!map.ruins) for (let i = 0; i < 70; i++) { const a = i * 2.399, d = Math.max(W, H) * 0.62 + (i % 7) * 4; const x = W / 2 + Math.cos(a) * d, z = H / 2 + Math.sin(a) * d * 0.9; if (x > -2 && x < W + 2 && z > -2 && z < H + 2) continue; if (z > H && Math.abs(x - W / 2) < 16) continue; const p = this.makeProp(i % 3 ? 'tree' : 'pine', { scale: 1 + (i % 5) * 0.12 }); p.position.set(x, 0, z); R.add(p); }
      else for (let i = 0; i < 26; i++) { const a = i * 2.399, d = 14 + (i % 6) * 5; const h = 3 + (i % 5) * 2.2; const t2 = box(2 + (i % 3), h, 2 + (i % 2), std({ map: art.tex(i % 2 ? 'concrete_ruin' : 'brick_ruin', { repeat: 0.25 }) })); t2.position.set(W / 2 + Math.cos(a) * d, h / 2, H / 2 + Math.sin(a) * d - 6); if (t2.position.z > H - 1) continue; t2.rotation.z = (i % 4 - 1.5) * 0.03; R.add(t2); }
    } else {                                             // room walls: back and sides, open to the camera
      const wm = map.glass ? new THREE.MeshStandardMaterial({ color: 0xcfeaf0, transparent: true, opacity: 0.3, roughness: 0.1 }) : std({ map: art.tex(map.id === 'barn' || map.id === 'ranch' ? 'barn_red' : map.id === 'coop' || map.id === 'house' || map.id === 'workshop' ? 'plank_wall' : map.id === 'cafe' ? 'metal_hull' : 'plaster_wall', { repeat: 0.5 }) });
      const hh = 2.9; R.add(box(W, hh, 0.2, wm, W / 2, 0, -0.1), box(0.2, hh, H, wm, -0.1, 0, H / 2), box(0.2, hh, H, wm, W + 0.1, 0, H / 2));
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.6), std({ color: 0x6f5a3a })); mat.rotation.x = -Math.PI / 2; mat.position.set(map.exitTile[0] + 0.5, 0.02, map.exitTile[1] + 0.6); R.add(mat);
      const lamp = new THREE.PointLight(0xffd9a0, 30, 30, 1.6); lamp.position.set(W / 2, 3.4, H / 2); R.add(lamp);
    }
    for (const b of map.buildings) R.add(this.makeBuilding(b));
    for (const p of map.props) {
      const kind = p.kind === 'tree' && p.y >= H - 1 ? 'bush' : p.kind;
      const o = this.makeProp(kind, p);
      o.position.set(p.x + p.w / 2, p.onWater ? -0.1 : 0, p.y + p.d / 2);
      if (p.rot && (o.userData.is3d || kind === 'fence')) o.rotation.y = p.rot;
      R.add(o); p.obj = o; if (kind === 'tree' || kind === 'pine') this.tallProps.push(o);
      const lampL = o.userData.lamp || (o.children[0] && o.children[0].userData.lamp); if (lampL) this.lamps.push(lampL);
    }
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
    c.lookAt(this.focus);
    for (const k in this.sky) this.sky[k].position.copy(c.position);
    for (const f of this.facers) f.rotation.y = this.yaw;
    for (const m of this.waterMats || []) m.map.offset.set(this.t * 0.015, this.t * 0.01);
    for (const l of this.lamps || []) l.intensity = (this.night || 0) * 14;
    for (const a of this.actors.values()) a.update(dt, this);
    // trees standing between the camera and Sato step aside
    const cx = Math.sin(this.yaw), cz = Math.cos(this.yaw);
    for (const o of this.tallProps || []) { const rx = o.position.x - px, rz = o.position.z - py, along = rx * cx + rz * cz, lat = Math.abs(rx * cz - rz * cx); const hide = along > 0.4 && along < 9 && lat < 2.4; const k = o.userData.k = Math.max(0.02, Math.min(1, (o.userData.k ?? 1) + (hide ? -dt : dt) * 5)); o.scale.set(1, k, 1); }
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
