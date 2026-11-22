// Sato's Harvest: the 3D world (three.js). Builds a scene from a map (js/farm/maps.js), keeps the
// field, people and animals in step with the state, and runs the camera, sky, light and weather.
// Every visual goes model → picture → procedural stand-in (js/farm/art.js), so it never fails.
import * as THREE from 'three';
import * as art from './art.js';
import { CROPS } from './data.js';
import { cropStage } from './sim.js';
import { lowerProp } from './lowerworld.js';
import { laneProp, laneBuilding, flowerHead, LANE_PROPS, LANE_BUILDINGS, LANE_CROP_COLOR, LANE_CROP_H } from './laneworld.js';
import { homeProp, HOME_PROPS } from './homeworld.js';
import { cityProp, CITY_PROPS } from './cityworld.js';
import { ColonySky, buildSurroundings, colonyProp, buildingExtras, COLONY_KINDS, Bots, mergeStatic, lightPools, setColonyTime, U as HAZE } from './colony.js';

const GROUND_TEX = { v: 'dust_lane', f: 'soil_dry', p: 'path_dirt', c: 'cobble', s: 'sand', k: 'wood_floor', a: 'ash_ground', o: 'stone_floor', h: 'hay', b: 'wood_floor', d: 'deck_floor', m: 'asphalt', n: 'moss' };
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
  asteroid: { model: 'asteroid', h: 0.9, face: true, maxW: 0.95 }, asteroid_big: { model: 'asteroid_big', h: 1.6, fit: 'foot' }, buoy: { model: 'jump_buoy', h: 1.4, fit: 'foot' },
  launch_pad: { h: 0.1 }, shuttle_pad: { h: 0.1 },
  // 2026-11-19: the open belt (sector markers, pickup pods, landmarks) and Sato's mining unit; built stand-ins
  sector_buoy: { model: 'jump_buoy', h: 1.7, fit: 'foot' }, sector_sign: { h: 2.6 }, pickup_pod: { h: 2.2 }, mining_bot: { model: 'mining_bot', h: 0.9, fit: 'foot' },
  derelict: { h: 2.6 }, comet: { h: 3 }, wreck: { h: 3 }, far_marker: { h: 6 }, haze: { h: 0.6 }, hangar_mouth: { h: 6 }, launch_cradle: { model: 'launch_cradle', h: 1.2, fit: 'foot' }, shuttle_gate: { h: 3.4 },
  hull_window: { h: 12 }, hull_wall: { h: 10 }, glass_roof: { h: 16 }, vending: { model: 'vending', h: 1.9, fit: 'foot' }, feed_sacks: { model: 'feed_sacks', h: 0.8, fit: 'foot' },
  crane: { model: 'dock_crane', h: 5.5, fit: 'foot' },
  bay_window: { h: 10 }, landing_pad: { h: 0.1 }, hazard_stripes: { h: 0.05 }, trader_ship: { model: 'cartel_ship', h: 5.2, fit: 'foot' }, shuttle: { model: 'shuttle', h: 3.8, fit: 'foot' },
  feed_mill: { model: 'feed_mill', h: 2.6, fit: 'foot' }, charge_terminal: { model: 'charge_terminal', h: 1.6, fit: 'foot' }, house_door: { h: 1 }, starglow: { h: 0.5 },
  fruit_tree: { h: 3.4 }, fruit_tree_young: { h: 2.1 }, sapling: { model: 'sapling', h: 1.0 },
  // 2026-11-19: colony interiors (the Arrivals hall, the school, the church, the safety depot), built in proc()
  star_window: { h: 2.6 }, courier_desk: { h: 1.1 }, departures_board: { h: 2.4 }, info_kiosk: { h: 1.8 }, transit_seats: { h: 0.9 }, colony_planter: { h: 1.2 },
  cubbies: { h: 1.3 }, blackboard: { h: 2.2 }, teacher_desk: { h: 0.9 }, school_desk: { h: 0.7 }, stained_glass: { h: 2.8 }, altar: { h: 1.1 }, candle_stand: { h: 1.2 },
  pew: { h: 0.9 }, lectern: { h: 1.2 }, map_screen: { h: 2.4 }, front_desk: { h: 1.1 }, lockers: { h: 2.0 }, rescue_drone: { h: 1.0 },
  // 2026-11-19: the Lower deck, the Undercroft (models from docs/LOWER-DECK-ART.md; built stand-ins in lowerworld.js)
  lower_lift: { model: 'lower_lift', h: 3.0, fit: 'foot' }, pump_station: { model: 'pump_station', h: 3.0, fit: 'foot' }, mushroom_bed: { model: 'mushroom_bed', h: 0.9, fit: 'foot' }, catacomb_arch: { model: 'catacomb_arch', h: 3.0, fit: 'stretch' },
  shelter: { model: 'shelter', h: 3.4, fit: 'foot' }, glow_lamp: { model: 'glow_lamp', h: 1.8 }, terminal: { model: 'terminal', h: 1.3 }, vault_door: { model: 'vault_door', h: 3.2, fit: 'foot' }, works_hall: { model: 'works_hall', h: 4, fit: 'box' },
  fabricator: { h: 2.5 }, vault_door_open: { h: 3.3 }, zero_g_arena: { h: 3.6 }, scrap_bin: { h: 0.9 }, vent_bath: { h: 1.2 }, reactor_console: { h: 2.6 }, decimator_ring: { h: 4 }, decor_lantern: { h: 1.1 },
  // home decor (2026-11-22; Hunyuan3D-2 from HunyuanDiT concept pictures)
  double_bed: { model: 'double_bed', h: 1.0, maxW: 1.45 }, fireplace: { model: 'fireplace', h: 1.6, maxW: 1.1 }, piano: { model: 'piano', h: 1.35, fit: 'foot' }, dresser: { model: 'dresser', h: 1.7, fit: 'foot' },
  wall_shelf_jars: { model: 'wall_shelf_jars', h: 1.3, fit: 'foot' }, big_plant: { model: 'big_plant', h: 1.6, maxW: 1 }, aquarium: { model: 'aquarium', h: 1.25, fit: 'foot' }, fish_trophy: { model: 'fish_trophy', h: 0.6, maxW: 0.9, hover: 2.4 },
  telescope: { model: 'telescope', h: 1.35, maxW: 1 }, rocking_chair: { model: 'rocking_chair', h: 1.1, fit: 'foot' }, armchair_big: { model: 'armchair_big', h: 1.05, fit: 'foot' }, flower_vase: { model: 'flower_vase', h: 0.8, maxW: 0.7 }, house_annex: { model: 'farmhouse', h: 2.4, fit: 'foot' }, coat_rack: { model: 'coat_rack', h: 1.7, maxW: 0.9 }, hanging_plant: { model: 'hanging_plant', h: 1.0, maxW: 0.8, hover: 2.4 }, side_table: { model: 'side_table', h: 0.9, maxW: 0.8 }, kitchen_dresser: { model: 'kitchen_dresser', h: 1.1, fit: 'foot' }, decor_clock: { h: 2.2 }, decor_model: { h: 1.1 }, decor_shelf: { h: 1.6 },
  work_barrier: { h: 0.9 }, bulkhead: { h: 2.6 }, tarp: { h: 2.4 }, crypt_wall: { h: 2.2 }, stove: { h: 1.6 }, shrooms: { h: 0.3 },
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
  // Eden Central (the Main deck city): built stand-ins reuse the colony's hull plate, models when they arrive
  gov_office: { model: ['gov_office', 'hall'], facade: 'buildings/gov_office', wall: 'hull_plate', roof: 'roof_tin' },
  exchange: { model: ['exchange', 'cafe'], facade: 'buildings/exchange', wall: 'metal_hull', roof: 'roof_red' },
  arrivals: { model: ['arrivals', 'post_office'], facade: 'buildings/arrivals', wall: 'hull_plate', roof: 'roof_tin' },
  apartment: { model: ['apartment'], facade: 'buildings/apartment', wall: 'hull_plate', roof: 'roof_tin', flat: true },
  townhouse: { model: ['townhouse', 'cottage_c', 'cottage_b'], facade: 'buildings/townhouse', wall: 'plaster_wall', roof: 'roof_shingle' },
  observatory: { model: ['observatory'], facade: 'buildings/observatory', wall: 'hull_plate', roof: 'roof_tin', observatory: true },
  // 2026-11-19: the school, the church and the safety depot in Eden Central; the orbital elevator on Terrace Hill.
  // Models keep their proportions (uniform); the built stand-ins are white-and-teal colony architecture.
  school: { model: ['school'], facade: 'buildings/school', civic: 'school', uniform: true },
  church: { model: ['church'], facade: 'buildings/church', civic: 'church', uniform: true },
  safety_depot: { model: ['safety_depot'], facade: 'buildings/safety_depot', civic: 'depot', uniform: true },
  orbital_elevator: { model: ['orbital_elevator'], facade: 'buildings/orbital_elevator', elevator: true, uniform: true, tall: true },
};
// Market Lane, the fold and the hives (2026-11-19): built stand-ins in laneworld.js until their models arrive.
Object.assign(PROPS, LANE_PROPS, HOME_PROPS, CITY_PROPS); Object.assign(BUILDING, LANE_BUILDINGS); Object.assign(CROP_COLOR, LANE_CROP_COLOR); Object.assign(CROP_H, LANE_CROP_H);
const FRUIT_COLOR = { apple: 0xd8362a, peach: 0xffa48a, cherry: 0xc8102e, persimmon: 0xf07a1a };
const BLOSSOM = { apple: 0xfbe3ea, peach: 0xf7a8c0, cherry: 0xffc6d9, persimmon: 0xf3f0d6 };

const col = (c) => new THREE.Color(c);
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m; }
function cyl(r0, r1, h, mat, x = 0, y = 0, z = 0, seg = 10) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m; }
function ball(r, mat, x = 0, y = 0, z = 0, detail = 1) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat); m.position.set(x, y, z); m.castShadow = true; return m; }
// Colony colours for the built stand-ins, and a painted panel (a sign, a screen, a board) as a texture.
const WHITE = () => std({ color: 0xf2f0ea, roughness: 0.55, metalness: 0.1 }), TEAL = () => std({ color: 0x3fa7a3, roughness: 0.5, metalness: 0.2 }), SLATE = () => std({ color: 0x46525e, metalness: 0.4, roughness: 0.5 });
const glow = (c) => new THREE.MeshBasicMaterial({ color: c });
let softTex = null;
const HOUSE_PAINT_TINT = { cream: 0xffffff, sage: 0xc9dcc0, rose: 0xf0c8c4, sky: 0xc4d8ee, butter: 0xf6e6b0, lilac: 0xdcd0ec }, HOUSE_FLOOR_TINT = { honey: 0xffffff, walnut: 0x9a7a62, ash: 0xf4ece0, cherry: 0xd89a84 };   // sim.HOUSE_PAINT / HOUSE_FLOOR
let rugT = null;
function rugTex() {                                       // a woven rag rug: border stripes, a diamond, soft fibre noise
  if (rugT) return rugT; const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#9a3b34'; x.fillRect(0, 0, 256, 256);
  const band = (i, col) => { x.strokeStyle = col; x.lineWidth = 9; x.strokeRect(i, i, 256 - 2 * i, 256 - 2 * i); };
  band(8, '#e8c87a'); band(22, '#2f5f73'); band(36, '#e8c87a'); band(52, '#c96a3a');
  x.fillStyle = '#e8c87a'; x.beginPath(); x.moveTo(128, 70); x.lineTo(186, 128); x.lineTo(128, 186); x.lineTo(70, 128); x.closePath(); x.fill();
  x.fillStyle = '#2f5f73'; x.beginPath(); x.moveTo(128, 92); x.lineTo(164, 128); x.lineTo(128, 164); x.lineTo(92, 128); x.closePath(); x.fill();
  x.fillStyle = '#c96a3a'; x.fillRect(118, 118, 20, 20);
  const d = x.getImageData(0, 0, 256, 256); for (let i = 0; i < d.data.length; i += 4) { const n = ((i * 2654435761) >>> 24) / 255 * 26 - 13 + ((i >> 2) % 256 % 4 === 0 ? -10 : 0); d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } x.putImageData(d, 0, 0);
  rugT = new THREE.CanvasTexture(c); rugT.colorSpace = THREE.SRGBColorSpace; rugT.anisotropy = 4; return rugT;
}

const PANELS = new Map();
function panelTex(key, w, h, paint) {
  if (PANELS.has(key)) return PANELS.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; PANELS.set(key, t); return t;
}
function plate(text, w, h, { bg = '#0d2a33', fg = '#9ff4ff', edge = '#7dffe0', font = 'bold 44px sans-serif' } = {}) {
  return panelTex('plate:' + text + bg + fg, 512, Math.round(512 * h / w), (x, W, H) => { x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = edge; x.lineWidth = 8; x.strokeRect(6, 6, W - 12, H - 12); x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 2); });
}
const quad = (w, h, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); return m; };

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
    this.drift = this.makeDrift();   // seasonal petals, leaves and flakes on fine days (2026-11-22)
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
  makeDrift() {
    const n = 260, pos = new Float32Array(n * 3), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 34; pos[i * 3 + 1] = Math.random() * 9; pos[i * 3 + 2] = (Math.random() - 0.5) * 34; ph[i] = Math.random() * 6.28; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.userData.ph = ph;
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(16, 16, 13, 7, 0.6, 0, 7); x.fill();
    const p = new THREE.Points(g, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(cv), color: 0xffc0d4, size: 0.2, transparent: true, opacity: 0.85, depthWrite: false, alphaTest: 0.05 }));
    p.visible = false; p.frustumCulled = false; this.scene.add(p); return p;
  }
  // minute 360..1440; sets the sun, the sky layers and the tint of every picture sprite.
  setTime(minute, weather, map) {
    const indoor = map && map.indoor, ruins = map && map.ruins, colony = !indoor && !ruins;
    const h = minute / 60, sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    if (indoor && this.windowGlass) { const d = sm(6, 7.5, h) * (1 - sm(18.5, 20, h)); this.windowGlass.emissive.setHex(d > 0.05 ? 0x9fd4ff : 0x1c2a44); this.windowGlass.emissiveIntensity = 0.15 + 0.55 * d * (weather === 'rain' || weather === 'storm' ? 0.6 : 1); }   // daylight in the windows
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
    this.weather.visible = !indoor && !ruins && !(map && map.covered) && (wet || snow);   // nothing falls under Eden Central's roof
    { const se = this.season, fine = !wet && !snow && weather !== 'storm', colonyOut = !indoor && !ruins && !(map && (map.covered || map.under || map.belt)), dayish = h > 6.5 && h < 19.5;
      this.drift.visible = colonyOut && fine && dayish && se !== 1; this.drift.material.color.set([0xffc6d9, 0xffffff, 0xe0883a, 0xf4f8ff][se]); this.drift.material.size = se === 3 ? 0.22 : 0.42; this.driftSpeed = se === 3 ? 0.45 : 0.6; }
    this.weather.material.size = snow ? 0.16 : 0.07; this.weather.material.color.set(snow ? 0xffffff : 0xa9c6e6);
    this.weatherSpeed = snow ? 2.2 : 19;
    this.night = 1 - day;
    if (map && map.under) {                              // the Undercroft: no sky, no weather; the lamps do the work
      for (const k in sk) set(k, 0); this.scene.background = col(0x05070a); this.colony.group.visible = false;
      this.scene.fog.color.set(0x05070a); this.scene.fog.near = 14; this.scene.fog.far = 52; HAZE.haze.value.set(0x05070a); HAZE.hazeNear.value = 14; HAZE.hazeFar.value = 52; HAZE.hazeCap.value = 0.9;
      this.sun.color.set(0x9fb4d0); this.sun.intensity = 0.18; this.hemi.intensity = 0.5; this.hemi.color.set(0x7a8fb0); this.hemi.groundColor.set(0x2a241c);
      this.spriteTint.setRGB(0.7, 0.7, 0.75); for (const m of this.spriteMats) m.color.copy(this.spriteTint); this.weather.visible = false; this.night = 1; if (this.pools) this.pools.material.opacity = 0.9;
    }
    if (map && map.belt) {                               // space: black sky, a hard white sun, no weather
      for (const k in sk) set(k, 0); this.scene.background = col(0x02030a); this.colony.group.visible = false;
      this.scene.fog.color.set(0x04060e); this.scene.fog.near = 40; this.scene.fog.far = 400; HAZE.haze.value.set(0x04060e); HAZE.hazeNear.value = 40; HAZE.hazeFar.value = 400; HAZE.hazeCap.value = 0.2;
      this.sun.color.set(0xffffff); this.sun.intensity = 2.4; this.hemi.intensity = 0.55; this.hemi.color.set(0x8fa8d8); this.hemi.groundColor.set(0x1a1a24);
      this.spriteTint.setRGB(1, 1, 1); for (const m of this.spriteMats) m.color.copy(this.spriteTint); this.weather.visible = false; this.night = 0.6;
    }
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
      case 'rug': { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), std({ map: rugTex(), roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(0.5, 0.02, 0.5); m.receiveShadow = true; g.add(m); break; }   // a woven rug (2026-11-22; was a flat red sheet)
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
      case 'forage_glow': {                               // under a pickable forage item: a soft halo and a faint ring, so it reads among the flowers
        if (!softTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); softTex = new THREE.CanvasTexture(cv); }
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: o.gold ? 0xffd36a : 0xfff4c8, transparent: true, opacity: 0.7, depthWrite: false })); halo.scale.setScalar(o.gold ? 1.25 : 1.05); halo.position.y = 0.5; g.add(halo);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 24), new THREE.MeshBasicMaterial({ color: o.gold ? 0xffd36a : 0xfff0b0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
        g.userData.halo = halo; g.userData.ring = ring; break;
      }
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
      case 'asteroid': case 'asteroid_big': {            // a lumpy rock, floating a little above the dust lane
        const big = kind === 'asteroid_big', seed = (o.seed || 0) + (o.cell ? o.cell[0] * 3 + o.cell[1] * 7 : 0);
        const geo = new THREE.DodecahedronGeometry(big ? 0.62 : 0.4, 1), p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const k = 0.82 + (((i * 37 + seed * 11) % 17) / 17) * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); }
        geo.computeVertexNormals();
        const rock = new THREE.Mesh(geo, std({ color: big ? 0x5d5650 : [0x7a6e62, 0x8a7a66, 0x6e6a70][seed % 3], flatShading: true })); rock.position.y = big ? 0.75 : 0.5; rock.rotation.set(seed, seed * 2, 0); rock.castShadow = true; g.add(rock);
        if (!big && seed % 3 === 0) g.add(ball(0.06, new THREE.MeshBasicMaterial({ color: 0x9ff4ff }), 0.2, 0.7, 0.2, 0));
        break;
      }
      case 'buoy': { g.add(cyl(0.06, 0.06, 1.0, std({ color: 0xd9dee3, metalness: 0.4 }), 0, 0.2, 0, 6), cyl(0.35, 0.25, 0.3, std({ color: 0xe8b830 }), 0, 0.1, 0, 10)); const l = ball(0.16, new THREE.MeshBasicMaterial({ color: 0x7dffb0 }), 0, 1.3, 0, 1); l.castShadow = false; g.add(l); const pl = new THREE.PointLight(0x7dffb0, 6, 6, 1.6); pl.position.y = 1.3; g.add(pl); break; }
      case 'sector_sign': {                              // SECTOR n, floating over the line, turned to the camera
        const n = o.sector || 1, hue = sectorColor(n), sign = new THREE.Group(); sign.position.y = 2.2;
        const t = panelTex('sector:' + n, 512, 160, (x, W, H) => { x.clearRect(0, 0, W, H); x.fillStyle = 'rgba(6,12,24,.72)'; x.beginPath(); x.roundRect(8, 8, W - 16, H - 16, 40); x.fill(); x.strokeStyle = '#' + hue.getHexString(); x.lineWidth = 8; x.stroke(); x.fillStyle = '#eaf6ff'; x.font = '700 76px "Chakra Petch", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(`▲ SECTOR ${n}`, W / 2, H / 2 + 4); });
        const q = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.81), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); q.renderOrder = 4; sign.add(q); g.add(sign); this.facers.push(sign);
        break;
      }
      case 'pickup_pod': {                               // a lit pad, a little white capsule with an orange band, a blinking mast
        const pad = new THREE.Mesh(new THREE.CircleGeometry(1.25, 28), std({ color: 0x2b3440 })); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.03; g.add(pad);
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.08, 1.25, 28), glow(0x5fffd2)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, l = ball(0.06, glow(0xffd36a), Math.cos(a) * 1.0, 0.06, Math.sin(a) * 1.0, 0); l.castShadow = false; g.add(l); }
        const body = cyl(0.42, 0.48, 0.9, std({ color: 0xf2f0ea, roughness: 0.5, metalness: 0.2 }), 0, 0.12, 0, 16); g.add(body);
        g.add(cyl(0.49, 0.49, 0.14, std({ color: 0xe0782a }), 0, 0.5, 0, 16), cyl(0.2, 0.36, 0.18, SLATE(), 0, 0.02, 0, 12));
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fd8ee, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.8 })); dome.position.y = 1.02; g.add(dome);
        for (const sx of [-1, 1]) { const leg = box(0.06, 0.4, 0.06, SLATE(), sx * 0.42, 0, 0.3); leg.rotation.z = sx * 0.3; g.add(leg); }
        g.add(cyl(0.03, 0.03, 1.6, std({ color: 0xd9dee3, metalness: 0.4 }), 0.95, 0, -0.6, 6));
        const bulb = ball(0.13, glow(0x5fffd2), 0.95, 1.7, -0.6, 1); bulb.castShadow = false; g.add(bulb);
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), new THREE.MeshBasicMaterial({ color: 0x5fffd2, transparent: true, opacity: 0.25, depthWrite: false })); halo.position.copy(bulb.position); g.add(halo);
        (this.beacons ||= []).push({ m: bulb, l: { intensity: 0 } }, { m: halo, l: { intensity: 0 } });
        break;
      }
      case 'mining_bot': {                               // Gravel: a squat orange unit on treads with a drill for an arm
        const orange = std({ color: 0xe0782a, roughness: 0.55, metalness: 0.2 }), dk = SLATE();
        for (const sx of [-1, 1]) g.add(box(0.14, 0.16, 0.5, dk, sx * 0.24, 0, 0));
        g.add(box(0.42, 0.34, 0.42, orange, 0, 0.14, 0), box(0.3, 0.12, 0.3, WHITE(), 0, 0.48, 0));
        const lamp = ball(0.06, glow(0xfff2b8), 0, 0.38, 0.22, 0); lamp.castShadow = false; g.add(lamp);
        const eye = box(0.22, 0.07, 0.02, glow(0x7dffb0), 0, 0.27, 0.215); eye.castShadow = false; g.add(eye);
        const arm = new THREE.Group(); arm.position.set(0.28, 0.32, 0.05); g.add(arm); g.userData.arm = arm;
        arm.add(box(0.08, 0.08, 0.3, dk, 0, -0.04, 0.12)); const bit = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 8), std({ color: 0xcfd6dc, metalness: 0.6, roughness: 0.3 })); bit.rotation.x = Math.PI / 2; bit.position.set(0, 0, 0.36); arm.add(bit);
        break;
      }
      case 'derelict': {                                 // an old nav buoy from before the war, tilted, one light still trying
        const rust = std({ color: 0x8a5a3a, roughness: 0.9 }), t = new THREE.Group(); t.rotation.z = 0.35; t.rotation.x = 0.2; g.add(t);
        t.add(cyl(0.45, 0.55, 1.4, rust, 0, 0.4, 0, 10), cyl(0.06, 0.06, 1.2, std({ color: 0x9a958c }), 0, 1.8, 0, 6));
        for (const sx of [-1, 1]) { const w = box(1.1, 0.04, 0.5, std({ color: 0x24324a, metalness: 0.4 }), sx * 1.0, 1.1, 0); w.rotation.z = sx * 0.25 + (sx > 0 ? 0.5 : 0); t.add(w); }
        const l = ball(0.1, glow(0xff5a4a), 0, 3.0, 0, 1); l.castShadow = false; t.add(l); (this.beacons ||= []).push({ m: l, l: { intensity: 0 } });
        break;
      }
      case 'comet': {                                    // a sleeping comet: a dirty snowball with a faint tail
        const ice = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 2), std({ color: 0xdfeef6, roughness: 0.6, flatShading: true })); ice.position.y = 1.2; ice.scale.set(1.1, 0.85, 1); ice.castShadow = true; g.add(ice);
        for (let k = 0; k < 3; k++) { const tail = new THREE.Mesh(new THREE.ConeGeometry(0.9 - k * 0.2, 7 + k * 2, 12, 1, true), new THREE.MeshBasicMaterial({ color: k ? 0x8fd8ff : 0xeaf8ff, transparent: true, opacity: 0.14 - k * 0.03, depthWrite: false, side: THREE.DoubleSide })); tail.rotation.x = -Math.PI / 2 + 0.15; tail.position.set(0, 1.6 + k * 0.2, -(3.5 + k)); g.add(tail); }
        break;
      }
      case 'wreck': {                                    // a hull section of an old freighter, ribs showing, her name half burned off
        const hull = std({ map: art.tex('hull_plate', { repeat: 0.5 }), side: THREE.DoubleSide }), ribs = SLATE();
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4.2, 16, 1, true, 0, Math.PI * 1.25), hull); shell.rotation.z = Math.PI / 2; shell.rotation.x = 0.3; shell.position.y = 1.2; shell.castShadow = true; g.add(shell);
        for (let k = -2; k <= 2; k++) { const rb = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.07, 6, 18, Math.PI * 1.3), ribs); rb.rotation.y = Math.PI / 2; rb.rotation.z = 0.3; rb.position.set(k * 0.95, 1.2, 0); g.add(rb); }
        const name = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: plate('HESP..', 1.6, 0.4, { bg: '#3a3f46', fg: '#e8e2d0', edge: '#6a6f76' }) })); name.position.set(0, 1.8, 1.62); g.add(name);
        break;
      }
      case 'far_marker': {                               // the last buoy the colony ever set: a lattice mast and a great ring
        const m2 = std({ color: 0xd9dee3, metalness: 0.5, roughness: 0.4 });
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78; g.add(cyl(0.04, 0.04, 5.2, m2, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 5)); }
        const ringM = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 8, 40), glow(0xffd36a)); ringM.position.y = 5.0; g.add(ringM); g.userData.spin = ringM;
        (this.spinners ||= []).push({ o: ringM, axis: 'y', speed: 0.6 });
        const top = ball(0.22, glow(0xffd36a), 0, 5.4, 0, 1); top.castShadow = false; g.add(top); (this.beacons ||= []).push({ m: top, l: { intensity: 0 } });
        break;
      }
      case 'launch_pad': case 'shuttle_pad': { const r = 0.95; const d0 = new THREE.Mesh(new THREE.CircleGeometry(r, 24), std({ color: kind === 'launch_pad' ? 0x3c4650 : 0x6b6258 })); d0.rotation.x = -Math.PI / 2; d0.position.y = 0.04; g.add(d0); const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.15, r, 24), new THREE.MeshBasicMaterial({ color: kind === 'launch_pad' ? 0x7dffe0 : 0xe8b830 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring); break; }
      case 'haze': {                                     // a low glowing patch of toxic (green) or radioactive (yellow) air
        const c = o.hazard === 2 ? 0xe8e040 : 0x7dff5a;
        const q = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.28, depthWrite: false })); q.rotation.x = -Math.PI / 2; q.position.y = 0.06; g.add(q);
        if (!World.hazeTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); World.hazeTex = new THREE.CanvasTexture(cv); }
        for (let i = 0; i < 2; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: World.hazeTex, color: c, transparent: true, opacity: 0.32, depthWrite: false })); sp.scale.set(1.5, 0.9, 1); sp.position.set((i - 0.5) * 0.4, 0.45 + i * 0.2, (0.5 - i) * 0.3); sp.userData.haze = i; g.add(sp); (this.steam ||= []); }
        g.userData.haze = true; break;
      }
      case 'hangar_mouth': {                             // the hangar's open mouth onto space, framed in hazard stripes
        const w = o.w || 8, view = new THREE.Mesh(new THREE.PlaneGeometry(w - 1, 4.2), new THREE.MeshBasicMaterial({ map: earthBand(), fog: false })); view.position.set(0, 2.6, 0.1); g.add(view);
        const fr = std({ color: 0x3c4650, metalness: 0.4 }), y = std({ color: 0xe8b830 });
        g.add(box(0.5, 5, 0.5, fr, -w / 2 + 0.25, 0, 0.2), box(0.5, 5, 0.5, fr, w / 2 - 0.25, 0, 0.2), box(w, 0.6, 0.5, fr, 0, 4.7, 0.2), box(w, 0.2, 0.55, y, 0, 0.3, 0.25));
        for (const c of g.children) c.position.x += (w - 1) / 2; break;
      }
      case 'launch_cradle': {                            // rails and clamps; the Pallas stands on it in the hangar
        const w = o.w || 4, d = o.d || 4, m = std({ color: 0x5d6a77, metalness: 0.5 }), y = std({ color: 0xe8b830 });
        g.add(box(w - 0.4, 0.2, d - 0.4, m, 0, 0, 0)); for (const x of [-0.8, 0.8]) g.add(box(0.2, 0.15, d - 0.2, y, x, 0.2, 0));
        for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) g.add(box(0.25, 1.1, 0.25, m, x, 0.2, z));
        for (const c of g.children) { c.position.x += (w - 1) / 2; c.position.z += (d - 1) / 2; } break;
      }
      case 'shuttle_gate': {                             // the boarding gate: an orange arch, a lit SHUTTLE TO EARTH board, a beacon
        const gm = std({ color: 0x5d6a77, metalness: 0.4 }), or = std({ color: 0xe0782a });
        g.add(box(0.22, 2.9, 0.22, gm, -0.8), box(0.22, 2.9, 0.22, gm, 0.8), box(2.0, 0.3, 0.3, or, 0, 2.9));
        const t = panelTex('shuttle_gate', 256, 96, (x) => {x.fillStyle = '#0d2a33'; x.fillRect(0, 0, 256, 96); x.strokeStyle = '#7dffe0'; x.lineWidth = 4; x.strokeRect(4, 4, 248, 88);
        x.fillStyle = '#9ff4ff'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillText('SHUTTLE', 128, 40); x.fillStyle = '#ffd36a'; x.fillText('TO EARTH', 128, 78); });
        for (const sd of [1, -1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.64), new THREE.MeshBasicMaterial({ map: t })); b.position.set(0, 3.45, 0.045 * sd); if (sd < 0) b.rotation.y = Math.PI; g.add(b); }
        g.add(box(1.8, 0.7, 0.05, gm, 0, 3.1, 0));
        const bc = ball(0.13, new THREE.MeshBasicMaterial({ color: 0xffb347 }), 0, 3.95, 0, 1); bc.castShadow = false; g.add(bc);
        const ln = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ color: 0x7dffe0, transparent: true, opacity: 0.18, side: THREE.DoubleSide })); ln.position.y = 1.3; g.add(ln);
        const arrow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 3), new THREE.MeshBasicMaterial({ color: 0x7dffe0 })); arrow.rotation.set(-Math.PI / 2, 0, Math.PI / 2); arrow.position.set(0, 0.04, 0.9); g.add(arrow);
        break;
      }
      case 'hull_window': {                              // the great window: a long band onto Earth and the stars, mullions, hull above and below
        const w = o.w || 10, hull = std({ map: art.tex('hull_plate', { repeat: 0.5 }).clone() }); hull.map.repeat.set(w / 2, 1); hull.map.needsUpdate = true;
        const view = new THREE.Mesh(new THREE.PlaneGeometry(w, 8), new THREE.MeshBasicMaterial({ map: earthBand(), fog: false })); view.position.set(0, 5.4, -0.1); g.add(view);
        g.add(box(w, 1.4, 0.6, hull, 0, 0, 0), box(w, 3, 0.6, hull, 0, 9.4, 0));
        for (let x = -w / 2; x <= w / 2 + 0.01; x += 3.5) g.add(box(0.22, 8, 0.4, std({ color: 0x5d6a77, metalness: 0.5 }), x, 1.4, 0.05));
        g.add(box(w, 0.25, 0.9, std({ color: 0x8a98a6, metalness: 0.4 }), 0, 1.3, 0.3));
        for (const c of g.children) c.position.x += (w - 1) / 2;
        break;
      }
      case 'hull_wall': {
        const w = o.w || 1, d = o.d || 1, L = Math.max(w, d), t = art.tex('hull_plate', { repeat: 0.5 }).clone(); t.repeat.set(L / 2, 0.4); t.needsUpdate = true;
        g.add(d > w ? box(0.7, 1.3, d, std({ map: t })) : box(w, 1.3, 0.7, std({ map: t })));   // a parapet: low enough for the camera to look over
        g.add(d > w ? box(0.9, 0.12, d, std({ color: 0xe8b830 }), 0, 1.3) : box(w, 0.12, 0.9, std({ color: 0xe8b830 }), 0, 1.3));
        for (const c of g.children) { c.position.x += (w - 1) / 2; c.position.z += (d - 1) / 2; }
        break;
      }
      case 'glass_roof': {                               // a high glass roof on ribs; the sun-line shows through it
        const w = o.w || 10, d = o.d || 10, Y = 16, rib = std({ color: 0xdfe6ea, metalness: 0.4, roughness: 0.5 });
        for (let z = 0; z <= d; z += 7) { const r = box(w, 0.35, 0.35, rib, w / 2 - 0.5, Y, z - 0.5); g.add(r); }
        for (let x = 0; x <= w; x += 10) { const r = box(0.35, 0.35, d, rib, x - 0.5, Y, d / 2 - 0.5); g.add(r); }
        for (let x = 0; x <= w; x += 10) for (const z of [0, d]) g.add(box(0.5, Y, 0.5, rib, x - 0.5, 0, z - 0.5));
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0xcfeaf0, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, roughness: 0.05 }));
        glass.rotation.x = -Math.PI / 2; glass.position.set(w / 2 - 0.5, Y + 0.2, d / 2 - 0.5); glass.castShadow = false; glass.receiveShadow = false; g.add(glass);
        g.traverse((q) => { if (q.isMesh && q !== glass) q.castShadow = true; });
        break;
      }
      case 'bay_window': {                               // the docking bay's pressure window and bay doors, along the west hull
        const d = o.d || 10, hull = std({ map: art.tex('hull_plate', { repeat: 0.5 }).clone() }); hull.map.repeat.set(d / 2, 1); hull.map.needsUpdate = true;
        const view = new THREE.Mesh(new THREE.PlaneGeometry(d, 7), new THREE.MeshBasicMaterial({ map: earthBand(), fog: false })); view.rotation.y = Math.PI / 2; view.position.set(-0.1, 4.9, 0); g.add(view);
        g.add(box(0.6, 1.4, d, hull, 0, 0, 0), box(0.6, 2, d, hull, 0, 8.4, 0));
        for (let z = -d / 2; z <= d / 2 + 0.01; z += 2.6) g.add(box(0.4, 7, 0.3, std({ color: 0xe8b830, metalness: 0.3 }), 0.05, 1.4, z));
        for (let z = -d / 2 + 0.3; z < d / 2; z += 1.2) g.add(box(0.05, 0.25, 0.6, std({ color: z % 2.4 < 1.2 ? 0x222222 : 0xe8b830 }), 0.35, 1.0, z + 0.3));
        for (const c of g.children) c.position.z += (d - 1) / 2;
        break;
      }
      case 'landing_pad': {
        const w = o.w || 3, d = o.d || 3, r = Math.min(w, d) / 2 - 0.1;
        const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 32), std({ color: 0x5d6a77, metalness: 0.4 })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; disc.receiveShadow = true; g.add(disc);
        const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.25, r - 0.08, 32), new THREE.MeshBasicMaterial({ color: 0xe8b830 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
        for (let i = 0; i < 8; i++) { const l = ball(0.06, new THREE.MeshBasicMaterial({ color: 0x7dffe0 }), Math.cos(i * 0.785) * (r - 0.15), 0.06, Math.sin(i * 0.785) * (r - 0.15), 0); l.castShadow = false; g.add(l); }
        const h = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.9, 0.18), new THREE.MeshBasicMaterial({ color: 0xffffff })); h.rotation.x = -Math.PI / 2; h.position.y = 0.045; g.add(h);
        for (const c of g.children) { c.position.x += (w - 1) / 2; c.position.z += (d - 1) / 2; }
        break;
      }
      case 'hazard_stripes': { const w = o.w || 3; for (let i = 0; i < w * 2; i++) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x222222 : 0xe8b830 })); q.rotation.x = -Math.PI / 2; q.position.set(-0.25 + i * 0.5, 0.03, 0); g.add(q); } break; }
      case 'trader_ship': {                              // the Ashfall trader: a chunky hull, a purple stripe, cargo pods, engines, landing legs
        const w = o.w || 5, hull = std({ color: 0x6e5a7a, metalness: 0.4, roughness: 0.5 }), trim = std({ color: 0xc9a24e, metalness: 0.6, roughness: 0.3 }), dk = std({ color: 0x2b2b33 });
        const s0 = new THREE.Group(); s0.position.y = 0.6;
        s0.add(box(2.2, 1.5, 3.8, hull, 0, 0, 0), box(1.6, 0.9, 1.2, hull, 0, 0.3, 2.2), box(1.2, 0.5, 0.05, new THREE.MeshBasicMaterial({ color: 0x9ff4ff }), 0, 0.75, 2.81));
        s0.add(box(2.25, 0.18, 3.85, trim, 0, 1.0, 0), box(0.9, 0.9, 1.6, std({ color: 0x8a7a5a }), -1.5, 0.1, -0.4), box(0.9, 0.9, 1.6, std({ color: 0x8a7a5a }), 1.5, 0.1, -0.4));
        for (const x of [-0.6, 0.6]) { const e = cyl(0.35, 0.45, 0.6, dk, x, 0.25, -2.2, 12); e.rotation.x = Math.PI / 2; s0.add(e); const f = ball(0.25, new THREE.MeshBasicMaterial({ color: 0x9fd8ff }), x, 0.55, -2.5, 1); f.castShadow = false; s0.add(f); }
        s0.add(box(0.12, 0.9, 0.12, dk, 0, 1.6, -1)); g.add(s0);
        for (const [x, z] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) g.add(box(0.12, 0.6, 0.12, dk, x, 0, z), box(0.4, 0.06, 0.4, dk, x, 0, z));
        const k = o.big || 1; for (const c of g.children) { c.position.multiplyScalar(k); c.scale.multiplyScalar(k); c.position.x += (w - 1) / 2; c.position.z += ((o.d || 5) - 1) / 2; }
        g.rotation.y = 0; break;
      }
      case 'shuttle': {                                  // Juno Maris's courier shuttle: white and orange, swept wings
        const w = o.w || 4, wh = std({ color: 0xf2f2ee, roughness: 0.4, metalness: 0.2 }), or = std({ color: 0xe0782a }), dk = std({ color: 0x2b2b33 });
        const s0 = new THREE.Group(); s0.position.y = 0.55;
        const body = cyl(0.55, 0.7, 2.8, wh, 0, 0, 0, 14); body.rotation.x = Math.PI / 2; body.position.set(0, 0.6, 0); s0.add(body);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 14), wh); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.6, 1.85); nose.castShadow = true; s0.add(nose);
        s0.add(box(3.0, 0.08, 1.0, or, 0, 0.35, -0.4), box(0.08, 0.8, 0.8, or, 0, 1.0, -1.2), box(0.8, 0.25, 0.05, new THREE.MeshBasicMaterial({ color: 0x9ff4ff }), 0, 0.9, 1.45));
        g.add(s0); for (const [x, z] of [[-0.5, -0.8], [0.5, -0.8], [0, 1.0]]) g.add(box(0.08, 0.6, 0.08, dk, x, 0, z));
        const k = o.big || 1; for (const c of g.children) { c.position.multiplyScalar(k); c.scale.multiplyScalar(k); c.position.x += (w - 1) / 2; c.position.z += ((o.d || 4) - 1) / 2; }
        break;
      }
      case 'crane': {                                    // a dock crane: a yellow lattice tower, a jib over the water, a hook
        const y = std({ color: 0xe8b830, metalness: 0.3 }), dk = std({ color: 0x3c4650 });
        g.add(box(0.9, 0.3, 0.9, dk, 0, 0, 0));
        for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) g.add(box(0.1, 4.6, 0.1, y, x, 0.3, z));
        for (let h = 0.8; h < 4.8; h += 0.9) g.add(box(0.7, 0.07, 0.7, y, 0, h, 0));
        g.add(box(0.8, 0.6, 0.8, std({ color: 0xd9dee3 }), 0, 4.9, 0), box(4.4, 0.18, 0.25, y, -1.8, 5.2, 0), box(1.0, 0.5, 0.5, dk, 0.9, 5.0, 0));
        g.add(box(0.03, 2.2, 0.03, dk, -3.6, 3.0, 0), box(0.3, 0.12, 0.3, dk, -3.6, 2.9, 0));
        break;
      }
      case 'vending': g.add(box(0.85, 1.85, 0.6, std({ color: 0x3f8a8c, roughness: 0.4, metalness: 0.3 })), box(0.6, 0.55, 0.03, new THREE.MeshBasicMaterial({ color: 0x9ff4ff }), 0, 1.05, 0.31), box(0.6, 0.25, 0.03, new THREE.MeshBasicMaterial({ color: 0xffd36a }), 0, 0.55, 0.31), box(0.95, 0.12, 0.7, std({ color: 0x2b3a44 }), 0, 1.85)); break;
      case 'feed_sacks': for (let i = 0; i < 3; i++) { const s2 = ball(0.26, std({ color: i === 1 ? 0xd8c890 : 0xe3cf9a }), -0.25 + i * 0.25, 0.24, i === 1 ? -0.1 : 0.1, 1); s2.scale.set(1, 1.2, 0.9); g.add(s2); } g.add(box(0.5, 0.5, 0.06, std({ color: 0x6b4a36 }), 0, 0.5, -0.38)); break;
      case 'feed_mill': {                                // a little millhouse with a turning grinder wheel
        const wd = std({ color: 0xb07a45 }), rf = std({ color: 0xa5502f });
        g.add(box(1.6, 1.5, 1.4, std({ map: art.tex('plank_wall', { repeat: 0.5 }) }), 0, 0, 0));
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.9, 4), rf); roof.rotation.y = Math.PI / 4; roof.position.y = 1.95; roof.castShadow = true; g.add(roof);
        g.add(box(0.5, 0.8, 0.06, std({ color: 0x4a3626 }), 0, 0, 0.71), cyl(0.25, 0.4, 0.5, std({ color: 0x9fb0bf, metalness: 0.4 }), -0.55, 1.5, 0.3, 10));
        const wheel = new THREE.Group(); wheel.position.set(0.9, 0.85, 0);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 6, 18), wd); rim.rotation.y = Math.PI / 2; wheel.add(rim);
        for (let i = 0; i < 4; i++) { const sp = box(0.06, 1.2, 0.08, wd, 0, -0.6, 0); const q = new THREE.Group(); q.add(sp); q.rotation.x = i * Math.PI / 4; wheel.add(q); }
        g.add(wheel); (this.spinners ||= []).push({ o: wheel, axis: 'x', speed: 1.2 });
        break;
      }
      case 'telescope_stand': {                          // a coin telescope on a post, aimed up the curve of the Ring
        const dk = std({ color: 0x3c4650, metalness: 0.4 }), br = std({ color: 0xc9a14a, metalness: 0.7, roughness: 0.3 });
        g.add(cyl(0.08, 0.12, 1.0, dk, 0, 0, 0, 10), box(0.3, 0.1, 0.3, dk, 0, 1.0, 0));
        const tube = cyl(0.12, 0.16, 0.8, br, 0, 0, 0, 12); tube.rotation.x = -1.1; tube.position.set(0, 1.25, 0.1); g.add(tube);
        break;
      }
      case 'charge_terminal': g.add(box(0.12, 1.1, 0.12, std({ color: 0x5d6a77 })), box(0.7, 0.5, 0.18, std({ color: 0xe9edf0, metalness: 0.2 }), 0, 1.0), box(0.5, 0.3, 0.02, new THREE.MeshBasicMaterial({ color: 0x7dffb0 }), 0, 1.1, 0.1), box(0.9, 0.3, 0.4, std({ color: 0x3c4650 }), 0, 0, 0.4)); break;
      case 'house_door': if (o.act === 'house' && !o.home) { const pl = std({ color: 0x9a7a52 }); const a = box(1.1, 0.14, 0.05, pl, 0, 0.9, 0.53); a.rotation.z = 0.5; const b2 = box(1.1, 0.14, 0.05, pl, 0, 0.9, 0.53); b2.rotation.z = -0.5; g.add(a, b2, box(0.5, 0.3, 0.02, std({ color: 0xf2ead6 }), 0.0, 1.5, 0.54)); } break;
      case 'starglow': { const c = ball(0.13, new THREE.MeshBasicMaterial({ color: 0xc89cff }), 0, 0.3, 0, 1); c.castShadow = false; const h = ball(0.3, new THREE.MeshBasicMaterial({ color: 0xb07aff, transparent: true, opacity: 0.3, depthWrite: false }), 0, 0.3, 0, 1); h.castShadow = false; g.add(c, h); break; }
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
      // ---- colony interiors (2026-11-19); built from the first tile, along +x, like the counter
      case 'star_window': {                              // a long window band high on the back wall, onto the stars and the Earth
        const w = o.w || 8, view = quad(w - 0.4, 1.3, new THREE.MeshBasicMaterial({ map: earthBand(), fog: false })); view.position.set((w - 1) / 2, 2.05, -0.44); g.add(view);
        g.add(box(w, 0.12, 0.12, TEAL(), (w - 1) / 2, 1.32, -0.44), box(w, 0.12, 0.12, WHITE(), (w - 1) / 2, 2.7, -0.44));
        for (let x = 0; x <= w - 0.4; x += 2) g.add(box(0.1, 1.3, 0.1, WHITE(), x - 0.3, 1.4, -0.42));
        g.add(box(w, 0.06, 0.06, glow(0x7dffe0), (w - 1) / 2, 0.08, -0.44)); break;
      }
      case 'departures_board': {                         // a glowing departures screen on a stand
        const B = { ...(o.board || { title: 'DEPARTURES', rows: [['08:00', 'MIDDLE DECK', 'ON TIME'], ['10:20', 'LOWER DECK', 'BOARDING'], ['ANY', 'EARTH  (J. MARIS)', 'ASK AT DESK'], ['14:40', 'HUB SUPPLY', 'ON TIME'], ['17:00', 'LANTERN RING', 'ON TIME']] }) };   // a board can carry its own lines
        const f = this.flags || {}; B.rows = B.rows.map((r) => (r[1] === 'UNDERCROFT' ? [r[0], r[1], f.ld_vault ? 'OPEN' : f.ld_lights ? 'RESTORING' : 'SEALED'] : r));   // the Governor's board follows the Lower deck
        const w = o.w || 3, t = panelTex('board:' + B.title + B.rows.map((r) => r[2]).join(), 512, 256, (x, W, H) => { x.fillStyle = '#071820'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffd36a'; x.font = 'bold 34px sans-serif'; x.fillText(B.title, 22, 44);
          const rows = B.rows;
          x.font = '24px monospace'; rows.forEach(([a, b, c2], i) => { x.fillStyle = '#9ff4ff'; x.fillText(a, 22, 92 + i * 34); x.fillText(b, 120, 92 + i * 34); x.fillStyle = i === 2 ? '#7dffb0' : '#cfe6ff'; x.fillText(c2, 370, 92 + i * 34); }); });
        const scr = quad(w - 0.3, 1.2, new THREE.MeshBasicMaterial({ map: t })); scr.position.set((w - 1) / 2, 1.65, 0.07); g.add(scr);
        g.add(box(w - 0.1, 1.35, 0.12, SLATE(), (w - 1) / 2, 1.0, 0), box(0.14, 1.0, 0.14, WHITE(), (w - 1) / 2 - 0.6, 0, 0), box(0.14, 1.0, 0.14, WHITE(), (w - 1) / 2 + 0.6, 0, 0), box(w - 0.2, 0.08, 0.5, TEAL(), (w - 1) / 2, 0, 0)); break;
      }
      case 'info_kiosk': { g.add(box(0.5, 0.9, 0.4, WHITE()), box(0.56, 0.08, 0.46, TEAL(), 0, 0.9)); const sc2 = quad(0.44, 0.6, new THREE.MeshBasicMaterial({ map: plate('DOCK', 300, 400, { font: 'bold 70px sans-serif' }) })); sc2.position.set(0, 1.35, 0.03); g.add(sc2, box(0.5, 0.7, 0.05, SLATE(), 0, 1.0, 0)); break; }
      case 'courier_desk': {                             // a sleek white desk with a teal band and a screen
        const w = o.w || 4, cx = (w - 1) / 2; g.add(box(w, 0.95, 0.7, WHITE(), cx), box(w + 0.1, 0.07, 0.8, std({ color: 0xdde4e8, metalness: 0.3, roughness: 0.3 }), cx, 0.95), box(w, 0.12, 0.02, glow(0x7dffe0), cx, 0.55, 0.36), box(w * 0.6, 0.2, 0.03, TEAL(), cx, 0.2, 0.36));
        const sc2 = quad(0.7, 0.42, new THREE.MeshBasicMaterial({ map: plate(o.screen || 'SHUTTLE TO EARTH · 200 cr', 512, 300, { font: 'bold 40px sans-serif' }) })); sc2.position.set(cx + 0.6, 1.33, 0.02); g.add(sc2, box(0.76, 0.48, 0.04, SLATE(), cx + 0.6, 1.08, -0.01), box(0.06, 0.12, 0.06, SLATE(), cx + 0.6, 1.0, 0));
        const s3 = quad(1.4, 0.3, new THREE.MeshBasicMaterial({ map: plate(o.plate || 'COURIER', 512, 110, { font: 'bold 64px sans-serif', bg: '#3fa7a3', fg: '#ffffff', edge: '#ffffff' }) })); s3.position.set(cx - 0.5, 0.62, 0.37); g.add(s3); break;
      }
      case 'transit_seats': {                            // a row of metal-and-teal seats on one beam
        const w = o.w || 3, cx = (w - 1) / 2; g.add(box(w - 0.1, 0.08, 0.12, SLATE(), cx, 0.25, 0), box(0.08, 0.3, 0.3, SLATE(), cx - w / 2 + 0.3, 0, 0), box(0.08, 0.3, 0.3, SLATE(), cx + w / 2 - 0.3, 0, 0));
        const n = w * 2 - 1; for (let i = 0; i < n; i++) { const x = cx + (i - (n - 1) / 2) * 0.5; g.add(box(0.42, 0.07, 0.42, TEAL(), x, 0.42, 0.02), box(0.42, 0.45, 0.06, std({ color: 0xdfe6ea, metalness: 0.4, roughness: 0.35 }), x, 0.47, -0.2)); }
        break;
      }
      case 'colony_planter': g.add(cyl(0.3, 0.24, 0.5, WHITE(), 0, 0, 0, 14), cyl(0.31, 0.31, 0.05, TEAL(), 0, 0.45, 0, 14), ball(0.32, std({ color: 0x4f9a3a }), 0, 0.75, 0), ball(0.2, std({ color: 0x6fbf5a }), 0.15, 0.95, 0.05), ball(0.18, std({ color: 0x5fae4a }), -0.15, 0.9, -0.08)); break;
      case 'cubbies': {                                  // little cubby holes with empty name cards and coat hooks
        const w = o.w || 3, cx = (w - 1) / 2, cols = [0xf08a6c, 0x5fb3b0, 0xf2c230, 0x8fb8e8, 0xa3d977, 0xc89cff]; g.add(box(w - 0.1, 1.2, 0.45, std({ color: 0xe6d3b0 }), cx, 0, -0.2));
        for (let r = 0; r < 2; r++) for (let i = 0; i < w * 2; i++) { const x = -0.4 + i * 0.5; g.add(box(0.4, 0.42, 0.05, std({ color: cols[(i + r * 3) % 6] }), x + 0.15, 0.12 + r * 0.55, 0.04), box(0.2, 0.08, 0.01, std({ color: 0xffffff }), x + 0.15, 0.45 + r * 0.55, 0.07)); }
        break;
      }
      case 'blackboard': {
        const w = o.w || 4, cx = (w - 1) / 2, pupils = !!this.flags.ld_rehoused, t = panelTex(pupils ? 'blackboard:class' : 'blackboard', 512, 200, (x, W, H) => { x.fillStyle = '#244a3a'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(i * 60, 0); x.lineTo(i * 60 + 40, H); x.stroke(); }
          x.fillStyle = '#f4f1e6'; x.font = '34px cursive, sans-serif'; x.fillText('WELCOME TO SCHOOL!', 40, 56); x.font = '24px cursive, sans-serif'; x.fillText('OUR CLASS:', 40, 110); if (pupils) { x.font = '20px cursive, sans-serif'; x.fillText('MOTH  JUNO  ADE  TOVE  RAFA  BEA', 40, 150); }   // the first pupils (sim.FAMILIES)
           x.fillStyle = '#ffd36a'; x.beginPath(); x.arc(430, 140, 26, 0, 7); x.fill(); x.strokeStyle = '#ffd36a'; x.lineWidth = 4; for (let a = 0; a < 6.28; a += 0.79) { x.beginPath(); x.moveTo(430 + Math.cos(a) * 34, 140 + Math.sin(a) * 34); x.lineTo(430 + Math.cos(a) * 48, 140 + Math.sin(a) * 48); x.stroke(); } });
        const bd = quad(w - 0.3, 1.15, new THREE.MeshBasicMaterial({ map: t })); bd.position.set(cx, 1.55, -0.38); g.add(bd, box(w - 0.1, 1.3, 0.06, std({ color: 0x9a6a45 }), cx, 0.9, -0.44), box(w - 0.2, 0.05, 0.12, std({ color: 0x9a6a45 }), cx, 0.92, -0.36)); break;
      }
      case 'teacher_desk': { const w = o.w || 2, cx = (w - 1) / 2; g.add(box(w - 0.1, 0.75, 0.7, std({ color: 0xc9a877 }), cx), box(w, 0.06, 0.78, std({ color: 0x9a6a45 }), cx, 0.75), ball(0.12, std({ color: 0xd8362a }), cx + 0.5, 0.9, 0), box(0.3, 0.06, 0.22, std({ color: 0xf2f0ea }), cx - 0.3, 0.81, 0)); break; }
      case 'school_desk': g.add(box(0.7, 0.05, 0.45, std({ color: 0xe8cf9a }), 0, 0.55, 0.05), box(0.05, 0.55, 0.05, TEAL(), -0.3, 0, 0.22), box(0.05, 0.55, 0.05, TEAL(), 0.3, 0, 0.22), box(0.05, 0.55, 0.05, TEAL(), -0.3, 0, -0.12), box(0.05, 0.55, 0.05, TEAL(), 0.3, 0, -0.12), box(0.36, 0.04, 0.32, std({ color: 0xf08a6c }), 0, 0.32, 0.42), box(0.36, 0.3, 0.04, std({ color: 0xf08a6c }), 0, 0.34, 0.58), box(0.04, 0.32, 0.04, SLATE(), 0, 0, 0.42)); break;
      case 'stained_glass': {                            // a tall arched window in coloured glass on the back wall
        const w = o.w || 4, cx = (w - 1) / 2, t = panelTex('stained', 256, 384, (x, W, H) => { const c = ['#e2463a', '#f2c230', '#3fa7a3', '#5f8ad8', '#a35ad0', '#7fbf5a'];
          for (let j = 0; j < 12; j++) for (let i = 0; i < 8; i++) { x.fillStyle = c[(i * 3 + j * 5) % 6]; x.fillRect(i * 32, j * 32, 32, 32); }
          x.fillStyle = '#ffe6a0'; x.beginPath(); x.arc(W / 2, H * 0.58, 70, 0, 7); x.fill(); x.fillStyle = '#5f8ad8'; x.beginPath(); x.arc(W / 2, H * 0.58, 46, 0, 7); x.fill(); x.fillStyle = '#7fbf5a'; x.beginPath(); x.ellipse(W / 2 - 10, H * 0.55, 18, 26, 0.4, 0, 7); x.fill();
          x.strokeStyle = '#2a2420'; x.lineWidth = 5; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, H); x.stroke(); } for (let j = 0; j <= 12; j++) { x.beginPath(); x.moveTo(0, j * 32); x.lineTo(W, j * 32); x.stroke(); } });
        for (const [dx, k] of [[-1.7, 0.75], [0, 1], [1.7, 0.75]]) { const win = quad(1.1 * k + 0.2, 2.0 * k, new THREE.MeshBasicMaterial({ map: t })); win.position.set(cx + dx, 1.0 + k * 1.0, -0.42); g.add(win); const arch = new THREE.Mesh(new THREE.CircleGeometry((1.1 * k + 0.2) / 2, 18, 0, Math.PI), new THREE.MeshBasicMaterial({ map: t })); arch.position.set(cx + dx, 1.0 + k * 2.0, -0.42); g.add(arch); }
        const pl = new THREE.PointLight(0xffd7a0, 6, 7, 1.6); pl.position.set(cx, 2.2, 0.6); g.add(pl); break;
      }
      case 'altar': { const w = o.w || 2, cx = (w - 1) / 2; g.add(box(w + 0.2, 0.95, 0.8, WHITE(), cx), box(w + 0.3, 0.06, 0.9, std({ color: 0xc9a14a, metalness: 0.6, roughness: 0.35 }), cx, 0.95), box(w * 0.7, 0.05, 0.92, std({ color: 0x3fa7a3 }), cx, 0.99));
        for (const dx of [-0.6, 0.6]) { g.add(cyl(0.05, 0.06, 0.22, WHITE(), cx + dx, 1.0, 0, 8)); const f = ball(0.04, glow(0xffc870), cx + dx, 1.26, 0, 1); f.castShadow = false; g.add(f); }
        g.add(ball(0.16, std({ color: 0x6fbf5a }), cx, 1.12, 0)); break; }
      case 'candle_stand': {                             // tiers of little lit candles for those lost in the siege
        const w = o.w || 2, cx = (w - 1) / 2, brass = std({ color: 0xc9a14a, metalness: 0.6, roughness: 0.35 });
        g.add(box(w - 0.2, 0.5, 0.5, brass, cx, 0, 0), box(w - 0.4, 0.15, 0.4, brass, cx, 0.5, -0.05), box(w - 0.6, 0.15, 0.3, brass, cx, 0.65, -0.1));
        for (let i = 0; i < 18; i++) { const r = i % 3, x = cx - (w - 0.5) / 2 + ((i * 7) % 6) * ((w - 0.5) / 5) * (1 - r * 0.2), y = 0.5 + r * 0.15, z = 0.12 - r * 0.07; g.add(cyl(0.025, 0.025, 0.1, WHITE(), x, y, z, 6)); const f = ball(0.022, glow(0xffc060), x, y + 0.13, z, 0); f.castShadow = false; g.add(f); }
        const pl = new THREE.PointLight(0xffb860, 3, 4, 1.8); pl.position.set(cx, 1.0, 0.2); g.add(pl); break;
      }
      case 'pew': { const w = o.w || 3, cx = (w - 1) / 2, wd = std({ color: 0xa9774a }); g.add(box(w - 0.1, 0.07, 0.45, wd, cx, 0.42, 0.05), box(w - 0.1, 0.5, 0.06, wd, cx, 0.45, -0.2), box(0.08, 0.85, 0.5, std({ color: 0x8a5a35 }), cx - w / 2 + 0.1, 0, 0), box(0.08, 0.85, 0.5, std({ color: 0x8a5a35 }), cx + w / 2 - 0.1, 0, 0), box(w - 0.3, 0.1, 0.06, TEAL(), cx, 0.82, -0.2)); break; }
      case 'lectern': g.add(cyl(0.18, 0.24, 0.9, std({ color: 0xa9774a }), 0, 0, 0, 8), box(0.5, 0.06, 0.4, std({ color: 0x8a5a35 }), 0, 0.95, 0), box(0.34, 0.03, 0.26, std({ color: 0xf2ead6 }), 0, 1.0, 0)); break;
      case 'map_screen': {                               // the deck map: every corridor and hatch, all green
        const w = o.w || 4, cx = (w - 1) / 2, t = panelTex('deckmap', 512, 256, (x, W, H) => { x.fillStyle = '#061a1c'; x.fillRect(0, 0, W, H); x.strokeStyle = '#3fa7a3'; x.lineWidth = 6; x.strokeRect(30, 40, 452, 180); x.beginPath(); x.moveTo(256, 40); x.lineTo(256, 220); x.moveTo(30, 130); x.lineTo(482, 130); x.moveTo(120, 40); x.lineTo(120, 220); x.moveTo(390, 40); x.lineTo(390, 220); x.stroke();
          x.fillStyle = '#7dffb0'; for (let i = 0; i < 22; i++) { x.beginPath(); x.arc(40 + (i * 97) % 440, 50 + (i * 53) % 170, 7, 0, 7); x.fill(); } x.fillStyle = '#9ff4ff'; x.font = 'bold 26px sans-serif'; x.fillText('MAIN DECK  ·  ALL GREEN', 34, 30); });
        const sc2 = quad(w - 0.4, 1.3, new THREE.MeshBasicMaterial({ map: t })); sc2.position.set(cx, 1.75, -0.38); g.add(sc2, box(w - 0.2, 1.45, 0.08, SLATE(), cx, 1.02, -0.44)); break;
      }
      case 'front_desk': { const w = o.w || 4, cx = (w - 1) / 2; g.add(box(w, 1.0, 0.7, WHITE(), cx), box(w + 0.1, 0.07, 0.8, std({ color: 0xdde4e8, metalness: 0.3 }), cx, 1.0), box(w, 0.14, 0.02, glow(0xff9a3a), cx, 0.62, 0.36));
        const s3 = quad(1.8, 0.36, new THREE.MeshBasicMaterial({ map: plate('SAFETY DEPOT', 512, 104, { bg: '#e0782a', fg: '#ffffff', edge: '#ffffff', font: 'bold 60px sans-serif' }) })); s3.position.set(cx, 0.32, 0.37); g.add(s3, box(0.5, 0.36, 0.04, SLATE(), cx + 1.1, 1.07, -0.1), box(0.3, 0.05, 0.2, std({ color: 0x2b2b33 }), cx - 1, 1.04, 0)); break; }
      case 'lockers': { const w = o.w || 3, cx = (w - 1) / 2; for (let i = 0; i < w * 2; i++) { const x = cx - w / 2 + 0.25 + i * 0.5; g.add(box(0.46, 1.9, 0.5, std({ color: i % 2 ? 0x5b7f9a : 0x4f738e, metalness: 0.35, roughness: 0.5 }), x, 0, -0.2), box(0.2, 0.04, 0.01, SLATE(), x, 1.5, 0.06), box(0.03, 0.15, 0.02, std({ color: 0xdfe6ea, metalness: 0.6 }), x + 0.15, 0.95, 0.06)); } g.add(box(w, 0.06, 0.55, TEAL(), cx, 1.9, -0.2)); break; }
      case 'rescue_drone': {                             // a rescue drone on its charging pad: white body, orange cross, four rotors
        const pad = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), std({ color: 0x3c4650 })); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.02; g.add(pad); const ring = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.45, 20), glow(0xff9a3a)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
        const d0 = new THREE.Group(); d0.position.y = 0.55; d0.add(ball(0.2, WHITE(), 0, 0, 0, 2), box(0.22, 0.06, 0.04, std({ color: 0xe0782a }), 0, 0.08, 0.19), box(0.06, 0.22, 0.04, std({ color: 0xe0782a }), 0, -0.0, 0.19), ball(0.05, glow(0x7dffe0), 0, -0.08, 0.17, 1));
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const arm = box(0.32, 0.03, 0.04, SLATE(), x * 0.16, 0.02, z * 0.16); arm.rotation.y = x * z * 0.78; d0.add(arm, cyl(0.12, 0.12, 0.02, std({ color: 0xdfe6ea, transparent: true, opacity: 0.6 }), x * 0.28, 0.04, z * 0.28, 12)); }
        g.add(d0); break;
      }
      default: { const c = cityProp(kind, o) || lowerProp(kind, o) || laneProp(kind, o) || homeProp(kind, o) || colonyProp(kind, o, this.colonyFx || undefined); g.add(c || box(0.6, 0.6, 0.6, std({ color: 0x999999 }))); }
    }
    if (kind === 'memorial' || kind === 'bench') for (const c of g.children) c.position.x += 0.5;
    return g;
  }
  // Build a prop: 3D model if there is one, else its picture, else the stand-in.
  makeProp(kind, o = {}) {
    const def = PROPS[kind] || {}, holder = new THREE.Group();
    const h = (o.hgt || def.h || 1) * (o.scale || 1), fw = o.w || 1, fd = o.d || 1;   // o.hgt: a city tower's own height
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
        if (def.fit === 'box') m.scale.set(fw * 0.98 / s[0], h / s[1], fd * 0.96 / s[2]);   // a shallow model stretched to its whole footprint (works_hall)
        else if (def.fit === 'stretch') m.scale.set(fw * 0.98 / s[0], h / s[1], Math.min(h / s[1], fd * 0.9 / s[2]));
        else if (def.fit === 'foot') m.scale.setScalar(Math.min(h / s[1], fw * 0.96 / s[0], fd * 0.96 / s[2]));
        else if (def.fit === 'wide') { const [ex, ez] = o.turned ? [fd, fw] : [Math.max(fw, 0.8), Math.max(fw, 0.8)]; m.scale.setScalar(Math.min(ex * 0.95 / s[0], ez * 0.95 / s[2])); }   // a turned prop (the barge) fits its footprint across
        else m.scale.setScalar(Math.min(h / (s[1] || 1), (def.maxW || 99) * (o.scale || 1) / Math.max(s[0], s[2])));
        if (def.hover) m.position.y = def.hover * 0.5;
        if (def.soft) m.traverse((q) => { if (q.isMesh) q.castShadow = false; });
        holder.add(m);
      });
      if (def.lamp) { const pl = new THREE.PointLight(0xffc878, 0, 9, 1.6); pl.position.y = def.lamp; holder.add(pl); holder.userData.lamp = pl; }
      if (def.fire) { const pl = new THREE.PointLight(0xffa050, 6, 6, 1.6); pl.position.set(...def.fire); holder.add(pl); }   // a model with a campfire glows like the hand-built one
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

  // Sato's Watch: a tower with a split dome and a telescope, and a radar mast with a turning dish and a beacon.
  buildObservatory(b, g) {
    const hull = std({ map: art.tex('hull_plate', { repeat: 0.5 }) }), white = std({ color: 0xeef1f3, roughness: 0.5, metalness: 0.2 }), dark = std({ color: 0x3c4650, metalness: 0.4 });
    const R = Math.min(b.w, b.d) * 0.36, H = b.height * 0.55, ox = Math.floor(b.w / 2) + 0.5 - b.w / 2, oz = b.d / 2 - R - 0.25;   // the drum sits right behind the door tile
    g.add(cyl(R + 0.4, R + 0.6, 0.6, hull, ox, 0, oz, 24), cyl(R, R + 0.2, H, hull, ox, 0.6, oz, 24));
    for (const side of [-1, 1]) {                       // the dome, split open along its ridge
      const half = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 12, side < 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI / 2), white);
      half.position.set(ox + side * 0.35, H + 0.6, oz); half.castShadow = true; g.add(half);
    }
    const tel = cyl(0.35, 0.45, R * 1.9, dark, 0, 0, 0, 14); tel.rotation.z = -0.75; tel.position.set(ox + 0.6, H + 0.6 + R * 0.55, oz); g.add(tel);
    // the entrance, on the face of the drum: steps, a porch with a lit arch, a door and the brass plaque
    const fz = oz + R + 0.05, wood = std({ color: 0x4a3626 }), brass = std({ color: 0xc9a14a, metalness: 0.7, roughness: 0.3 });
    g.add(box(2.2, 0.2, 0.9, hull, ox, 0, fz + 0.35), box(1.8, 0.2, 0.6, hull, ox, 0.2, fz + 0.2), box(1.6, 0.2, 0.4, hull, ox, 0.4, fz + 0.05));
    g.add(box(0.25, 2.5, 0.5, white, ox - 0.95, 0.6, fz), box(0.25, 2.5, 0.5, white, ox + 0.95, 0.6, fz), box(2.15, 0.35, 0.6, white, ox, 3.0, fz));
    g.add(box(1.4, 2.2, 0.1, wood, ox, 0.6, fz - 0.05), box(0.08, 0.08, 0.08, brass, ox + 0.5, 1.7, fz + 0.03));
    g.add(box(1.1, 0.4, 0.04, brass, ox, 3.45, fz + 0.3));
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 6, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0x9ff4ff })); arch.position.set(ox, 2.8, fz + 0.06); g.add(arch);
    const mx = -b.w / 2 + 1.1, mz = -b.d / 2 + 1.1, mh = b.height + 1.5;                                 // the watch tower, behind to the left
    for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) g.add(box(0.14, mh, 0.14, dark, mx + x, 0, mz + z));
    for (let y = 1.5; y < mh; y += 1.8) g.add(box(0.95, 0.08, 0.95, dark, mx, y, mz));
    const dish = new THREE.Group(); dish.position.set(mx, mh + 0.2, mz);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 8, 0, Math.PI * 2, 0, 1.0), white); bowl.material.side = THREE.DoubleSide; bowl.rotation.x = -Math.PI / 2 + 0.5; bowl.position.z = 0.3;
    dish.add(bowl, cyl(0.05, 0.05, 0.9, dark, 0, 0, 0.3, 6)); g.add(dish, cyl(0.12, 0.12, 0.4, dark, mx, mh - 0.2, mz, 8));
    this.spinners.push({ o: dish, axis: 'y', speed: 0.6 });
    const beacon = ball(0.18, new THREE.MeshBasicMaterial({ color: 0xff5a3a }), mx, mh + 1.15, mz, 1); beacon.castShadow = false; g.add(beacon, box(0.06, 0.6, 0.06, dark, mx, mh + 0.55, mz));
    const bl = new THREE.PointLight(0xff6a4a, 0, 14, 1.6); bl.position.set(mx, mh + 1.15, mz); g.add(bl);
    (this.beacons ||= []).push({ m: beacon, l: bl });
  }

  // The colony's civic buildings, built: white walls, teal trim, lit windows (a model replaces them when it exists).
  buildCivic(b, g, kind) {
    const W = b.w, D = b.d, H = b.height, wh = WHITE(), tl = TEAL(), sl = SLATE(), dx = Math.floor(W / 2) + 0.5 - W / 2, fz = D / 2;
    const win = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.2 });
    const front = (mesh, x, y, z = fz + 0.02) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };
    if (kind === 'school') {                         // a friendly two-storey block with crayon window frames, a clock and a bell turret
      const bh = H * 0.62; g.add(box(W - 0.3, bh, D - 0.5, wh, 0, 0, -0.1), box(W - 0.1, 0.25, D - 0.3, tl, 0, bh, -0.1), box(W - 0.3, 0.18, 0.1, tl, 0, 0, fz - 0.33));
      const cols = [0xf08a6c, 0xf2c230, 0x5fb3b0, 0x8fb8e8, 0xa3d977];
      for (let fl = 0; fl < 2; fl++) for (let i = 0; i < 3; i++) { const x = -W / 2 + 0.9 + i * ((W - 1.8) / 2); if (fl === 0 && Math.abs(x - dx) < 0.8) continue; g.add(box(0.9, 0.8, 0.06, std({ color: cols[(i + fl * 2) % 5] }), x, 0.6 + fl * 1.6, fz - 0.32)); front(box(0.7, 0.6, 0.04, win(0x9fd8ee)), x, 0.7 + fl * 1.6, fz - 0.29); }
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const z = -D / 2 + 1.2 + i * ((D - 2.4) / 2); g.add(box(0.06, 0.8, 0.9, std({ color: cols[(i + 2) % 5] }), sx * (W / 2 - 0.13), 1.4, z), box(0.04, 0.6, 0.7, win(0x9fd8ee), sx * (W / 2 - 0.1), 1.5, z)); }
      g.add(box(1.0, 1.6, 0.08, std({ color: 0xf08a6c }), dx, 0, fz - 0.28), box(1.6, 0.12, 0.9, tl, dx, 1.8, fz - 0.05), box(0.08, 1.8, 0.08, wh, dx - 0.7, 0, fz + 0.3), box(0.08, 1.8, 0.08, wh, dx + 0.7, 0, fz + 0.3));
      const clock = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), new THREE.MeshBasicMaterial({ map: panelTex('clock', 128, 128, (x, w2) => { x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#2b3a44'; x.lineWidth = 6; x.beginPath(); x.moveTo(64, 64); x.lineTo(64, 22); x.moveTo(64, 64); x.lineTo(92, 64); x.stroke(); for (let a = 0; a < 6.28; a += 0.524) { x.fillStyle = '#3fa7a3'; x.fillRect(62 + Math.cos(a) * 52, 62 + Math.sin(a) * 52, 5, 5); } }) }));
      front(clock, dx, bh - 0.45, fz - 0.27);
      const sign = quad(2.2, 0.42, new THREE.MeshBasicMaterial({ map: plate('SCHOOL', 512, 98, { bg: '#ffffff', fg: '#2b7a78', edge: '#f2c230', font: 'bold 68px sans-serif' }) })); front(sign, dx, 2.15, fz + 0.38);
      g.add(box(0.9, 0.9, 0.9, wh, 0, bh + 0.25, -0.6)); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.8, 4), tl); cap.rotation.y = Math.PI / 4; cap.position.set(0, bh + 1.55, -0.6); cap.castShadow = true; g.add(cap, ball(0.18, std({ color: 0xc9a14a, metalness: 0.6, roughness: 0.3 }), 0, bh + 0.75, -0.15));
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) g.add(box(0.06, 0.5, 0.06, wh, sx * (W / 2 + 0.3), 0, -D / 2 + 0.6 + i * 1.3));
      return;
    }
    if (kind === 'church') {                         // a white nave under a teal roof, tall coloured windows, a slender spire with Eden's ring on top
      const nh = H * 0.48, roofH = H * 0.32, nave = new THREE.Group(); g.add(nave);
      nave.add(box(W - 0.8, nh, D - 1.4, wh, 0, 0, -0.5));
      const roof = new THREE.Mesh(gable(D - 0.9, W - 0.2, roofH), std({ color: 0x3fa7a3, side: THREE.DoubleSide, roughness: 0.5 })); roof.rotation.y = Math.PI / 2; roof.position.set(0, nh, -0.5); roof.castShadow = true; nave.add(roof);
      const cols = [0xe2463a, 0xf2c230, 0x5f8ad8, 0xa35ad0, 0x3fa7a3];
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const z = -D / 2 + 1.4 + i * ((D - 3.2) / 2); g.add(box(0.05, 1.5, 0.55, win(cols[(i * 2 + (sx > 0)) % 5]), sx * (W / 2 - 0.38), 0.7, z)); const a = new THREE.Mesh(new THREE.CircleGeometry(0.275, 12, 0, Math.PI), win(cols[(i * 2 + (sx > 0)) % 5])); a.rotation.y = sx * Math.PI / 2; a.position.set(sx * (W / 2 - 0.35), 2.2, z); g.add(a); }
      const tz = fz - 0.9, th = H * 1.05;              // the tower at the front, the door at its foot
      g.add(box(1.7, th, 1.5, wh, dx, 0, tz), box(1.9, 0.2, 1.7, tl, dx, th, tz), box(1.9, 0.14, 1.7, tl, dx, nh, tz));
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.85, H * 0.75, 4), tl); spire.rotation.y = Math.PI / 4; spire.position.set(dx, th + 0.2 + H * 0.375, tz); spire.castShadow = true; g.add(spire);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 8, 24), std({ color: 0xc9a14a, metalness: 0.7, roughness: 0.3 })); ring.position.set(dx, th + 0.2 + H * 0.75 + 0.3, tz); g.add(ring);
      const rose = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ map: panelTex('rose', 128, 128, (x) => { const c = ['#e2463a', '#f2c230', '#5f8ad8', '#a35ad0', '#3fa7a3', '#7fbf5a']; for (let i = 0; i < 12; i++) { x.fillStyle = c[i % 6]; x.beginPath(); x.moveTo(64, 64); x.arc(64, 64, 64, i * 0.524, (i + 1) * 0.524); x.fill(); } x.fillStyle = '#ffe6a0'; x.beginPath(); x.arc(64, 64, 18, 0, 7); x.fill(); x.strokeStyle = '#2a2420'; x.lineWidth = 4; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(i * 0.524) * 64, 64 + Math.sin(i * 0.524) * 64); x.stroke(); } }) }));
      front(rose, dx, nh + 0.9, tz + 0.77);
      g.add(box(1.0, 1.7, 0.08, std({ color: 0x6b4a36 }), dx, 0, tz + 0.75)); const arch = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 16, Math.PI), glow(0xffd98a)); arch.position.set(dx, 1.7, tz + 0.8); g.add(arch);
      g.add(box(2.2, 0.15, 0.9, std({ color: 0xd7d2c6 }), dx, 0, tz + 1.15));
      return;
    }
    // the safety depot: a solid white post with an orange rescue stripe, a garage bay, a drone pad and a blue beacon on the roof
    const bh = H * 0.7, or = std({ color: 0xe0782a, roughness: 0.5 });
    g.add(box(W - 0.2, bh, D - 0.3, wh, 0, 0, -0.05), box(W, 0.25, D - 0.1, sl, 0, bh, -0.05), box(W - 0.15, 0.3, 0.05, or, 0, bh - 0.75, fz - 0.18), box(W - 0.15, 0.12, 0.05, tl, 0, bh - 0.45, fz - 0.18));
    for (const sx of [-1, 1]) g.add(box(0.05, 0.3, D - 0.4, or, sx * (W / 2 - 0.09), bh - 0.75, -0.05));
    const gx = dx - 1.6 >= -W / 2 + 0.7 ? dx - 1.6 : dx + 1.6;
    const garage = quad(1.4, 1.6, new THREE.MeshStandardMaterial({ map: panelTex('garage', 128, 128, (x) => { x.fillStyle = '#c9d1d6'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#9aa6ae'; for (let i = 0; i < 128; i += 16) x.fillRect(0, i, 128, 3); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#222' : '#e8b830'; x.fillRect(i * 16, 112, 16, 16); } }), roughness: 0.6 }));
    front(garage, gx, 0.8, fz - 0.16);
    g.add(box(0.9, 1.7, 0.08, std({ color: 0x3f6f78, metalness: 0.4 }), dx, 0, fz - 0.17), box(1.5, 0.1, 0.8, tl, dx, 1.95, fz + 0.2), box(0.07, 1.95, 0.07, sl, dx - 0.65, 0, fz + 0.55), box(0.07, 1.95, 0.07, sl, dx + 0.65, 0, fz + 0.55));
    const sign = quad(2.4, 0.42, new THREE.MeshBasicMaterial({ map: plate('SAFETY DEPOT', 512, 90, { bg: '#ffffff', fg: '#e0782a', edge: '#3fa7a3', font: 'bold 56px sans-serif' }) })); front(sign, 0, bh - 0.25);
    const shield = new THREE.Mesh(new THREE.CircleGeometry(0.32, 6), new THREE.MeshBasicMaterial({ map: plate('+', 128, 128, { bg: '#3fa7a3', fg: '#ffffff', edge: '#ffffff', font: 'bold 110px sans-serif' }) })); front(shield, W / 2 - 0.55, bh - 0.25);
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) g.add(box(0.04, 0.6, 0.8, win(0x9fd8ee), sx * (W / 2 - 0.08), 1.2, -D / 2 + 1.5 + i * 2.2));
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), std({ color: 0x3c4650 })); pad.rotation.x = -Math.PI / 2; pad.position.set(-0.6, bh + 0.27, -0.8); g.add(pad);
    const pr = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.9, 24), glow(0xff9a3a)); pr.rotation.x = -Math.PI / 2; pr.position.set(-0.6, bh + 0.28, -0.8); g.add(pr);
    const drone = this.proc('rescue_drone'); drone.children.slice(0, 2).forEach((q) => q.visible = false); drone.position.set(-0.6, bh + 0.1, -0.8); g.add(drone);
    g.add(box(0.1, 0.8, 0.1, sl, W / 2 - 0.6, bh + 0.25, -D / 2 + 0.8));
    const beacon = ball(0.17, glow(0x4a9aff), W / 2 - 0.6, bh + 1.15, -D / 2 + 0.8, 1); beacon.castShadow = false; g.add(beacon);
    const bl = new THREE.PointLight(0x4a9aff, 0, 12, 1.6); bl.position.copy(beacon.position); g.add(bl); (this.beacons ||= []).push({ m: beacon, l: bl });
  }
  // The orbital elevator on Terrace Hill: a base station, a lattice tower, and the cable rising out of sight to the axis.
  buildElevator(b, g) {
    const H = b.height, wh = WHITE(), tl = TEAL(), sl = SLATE(), R = Math.min(b.w, b.d) / 2 - 0.15;
    g.add(cyl(R, R + 0.1, 0.4, wh, 0, 0, 0, 24), cyl(R + 0.02, R + 0.02, 0.08, glow(0x7dffe0), 0, 0.4, 0, 24), cyl(R * 0.75, R * 0.8, 0.5, std({ color: 0xdfe6ea, metalness: 0.3 }), 0, 0.42, 0, 20));
    for (let i = 0; i < 4; i++) {                    // four legs leaning in to the head of the tower
      const a = i * Math.PI / 2 + Math.PI / 4, x0 = Math.cos(a) * R * 0.85, z0 = Math.sin(a) * R * 0.85, x1 = Math.cos(a) * 0.35, z1 = Math.sin(a) * 0.35, L = Math.hypot(x1 - x0, H, z1 - z0);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, L, 8), wh); leg.position.set((x0 + x1) / 2, 0.8 + H / 2, (z0 + z1) / 2); leg.lookAt(x1, 0.8 + H, z1); leg.rotateX(Math.PI / 2); leg.castShadow = true; g.add(leg);
    }
    for (let y = 1.8; y < H; y += 1.6) { const k = 1 - (y - 0.8) / H; g.add(cyl(R * 0.85 * k + 0.35 * (1 - k), R * 0.85 * k + 0.35 * (1 - k), 0.1, y % 3.2 < 1.6 ? tl : wh, 0, y, 0, 16)); }
    const shaft = cyl(0.28, 0.28, H, std({ color: 0xcfeaf0, transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 0.9, 0, 14); shaft.castShadow = false; g.add(shaft);
    g.add(cyl(0.7, 0.5, 0.5, tl, 0, H + 0.8, 0, 16), cyl(0.72, 0.72, 0.06, glow(0x7dffe0), 0, H + 1.05, 0, 16));
    // the car waiting at the foot, facing the door
    const dz = b.d / 2 - 0.2; g.add(box(1.2, 1.7, 1.0, wh, 0, 0.9, dz - 0.7), box(1.0, 0.5, 0.04, glow(0x9ff4ff), 0, 1.9, dz - 0.18), box(0.7, 1.3, 0.04, std({ color: 0x3f6f78, metalness: 0.4 }), 0, 0.92, dz - 0.18), box(1.3, 0.12, 1.1, tl, 0, 2.6, dz - 0.7));
    const sign = quad(1.7, 0.36, new THREE.MeshBasicMaterial({ map: plate('▲ ORBITAL ELEVATOR', 512, 108, { font: 'bold 46px sans-serif' }) })); sign.position.set(0, 2.95, dz - 0.15); g.add(sign);
    this.elevatorCable(g, H + 1.1);
  }
  // The cable from the top of the tower up to the axis, ringed with lights, and a car gliding up and down it.
  elevatorCable(g, top) {
    const cable = cyl(0.07, 0.07, 340, std({ color: 0xdfe6ea, metalness: 0.5 }), 0, top, 0, 6); cable.castShadow = false; g.add(cable);
    for (let y = top + 3; y < top + 90; y += 4) { const r = cyl(0.22, 0.22, 0.08, glow(0x7dffe0), 0, y, 0, 10); r.castShadow = false; g.add(r); }
    const car = new THREE.Group(); car.add(cyl(0.55, 0.55, 1.3, WHITE(), 0, -0.65, 0, 12), cyl(0.57, 0.57, 0.3, glow(0x9ff4ff), 0, -0.2, 0, 12), cyl(0.6, 0.4, 0.25, TEAL(), 0, 0.65, 0, 12));
    g.add(car); (this.cars ||= []).push({ o: car, y0: top + 2, y1: top + 70 });
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
      if (def.observatory) { this.buildObservatory(b, g); return; }
      if (def.civic) { this.buildCivic(b, g, def.civic); return; }
      if (def.elevator) { this.buildElevator(b, g); return; }
      if (def.lane && laneBuilding(b, g, def, this.flags || {})) return;
      if (def.flat) {                                    // a block of flats: hull-plate walls, rows of lit windows, a flat roof with a rail
        const wm2 = std({ map: art.tex(def.wall, { repeat: 0.5 }) }), win = new THREE.MeshStandardMaterial({ color: 0x9fd0e0, emissive: 0x6a5a30, emissiveIntensity: 0.35, roughness: 0.2 });
        g.add(box(b.w - 0.1, H, b.d - 0.1, wm2), box(b.w + 0.1, 0.25, b.d + 0.1, std({ color: 0x7b878e }), 0, H));
        for (let fl = 0; fl < Math.floor(H / 1.6); fl++) for (let i = 0; i < Math.floor(b.w / 1.3); i++) g.add(box(0.6, 0.7, 0.05, win, -b.w / 2 + 0.9 + i * 1.3, 0.6 + fl * 1.6, b.d / 2 - 0.02));
        g.add(box(0.9, 1.6, 0.06, std({ color: 0x4a5866 }), 0, 0, b.d / 2 - 0.02));
        return;
      }
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
        if (def.tall) { const kt = Math.min(b.height / s[1], Math.min(kx, kz) * 1.25); m.scale.setScalar(kt); }   // a slim tower: as tall as asked, a little wider than its pad
        else if (def.uniform) m.scale.setScalar(k);                                       // keep the model's proportions
        else m.scale.set(Math.min(kx, k * 1.33), k, Math.min(kz, k * 1.33));
        g.add(m);
        if (def.elevator) this.elevatorCable(g, s[1] * m.scale.y);
      });
    } else proc();
    return g;
  }

  // ------------------------------------------------------------ the map
  setMap(map, state) {
    this.map = map; this.state = state; this.season = state.cal.season; this.flags = state.flags || {};
    freeGeometry(this.root); for (const m of this.waterMats || []) if (m.map && m.map.userData.ownWater) m.map.dispose(); this.root.clear(); this.facers.length = 0; this.spriteMats.length = 0; this.anims.length = 0; this.tileObjs.clear();
    for (const a of this.actors.values()) a.dispose && a.dispose(); this.actors.clear();
    this.lamps = []; this.waterMats = []; this.tallProps = []; this.steam = []; this.windowGlass = null; this.flies = null;
    const R = this.root, W = map.w, H = map.h;
    // ground, one merged mesh per kind
    const byKind = {};
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = map.at(x, y); (byKind[c] ||= []).push(x, y); }
    for (const [c, cells] of Object.entries(byKind)) {
      if (c === 'x') continue;
      if (c === 'r' && map.under) {                    // the Undercroft: only the walls that face a room; those south of a room are cut low, so the camera sees in
        const room = (x, y) => { const k = map.at(x, y); return k !== 'r' && k !== 'x'; }, hi = [], lo = [];
        for (let i = 0; i < cells.length; i += 2) { const x = cells[i], y = cells[i + 1]; if (![[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([a, b]) => room(x + a, y + b))) continue; (room(x, y - 1) || room(x - 1, y - 1) || room(x + 1, y - 1) ? lo : hi).push(x, y); }
        for (const [list, h] of [[hi, 1.5], [lo, 0.35]]) { if (!list.length) continue; const m = new THREE.Mesh(tiles(list, h, true), std({ map: art.tex('hull_plate', { repeat: 1 }), color: 0x7d8790 })); m.castShadow = m.receiveShadow = true; R.add(m); }
        continue;
      }
      if (c === 'r') { const m = new THREE.Mesh(tiles(cells, 1.7, true), std({ map: art.tex('cliff_rock', { repeat: 1 }) })); m.castShadow = m.receiveShadow = true; R.add(m); continue; }
      if (c === 't') {                                   // the city's toxic pools: a sunken bed under a glowing lime surface
        const m = new THREE.Mesh(tiles(cells, 0, false, 0.25), std({ map: art.tex('ash_ground', { repeat: 1 }), color: 0x8a8a7a })); m.receiveShadow = true; R.add(m); continue;   // plain scorched ground: only the pool models glow
      }
      if (c === 'w') {
        const bed = new THREE.Mesh(tiles(cells, -0.5), std({ color: 0x2a3a34 })); R.add(bed);
        // the surface sits just above the colony's surrounding ground sheet (y -0.07), which runs under the whole map
        const wm = new THREE.MeshStandardMaterial({ map: art.tex('water', { repeat: 1 }).clone(), color: map.under ? 0x4a8a9a : 0xb8dce6, transparent: true, opacity: 0.94, roughness: 0.12, metalness: 0.1 });
        wm.map.wrapS = wm.map.wrapT = THREE.RepeatWrapping; wm.map.needsUpdate = true; wm.map.userData.ownWater = true; this.waterMats.push(wm);
        const m = new THREE.Mesh(tiles(cells, -0.04), wm); m.receiveShadow = true; R.add(m); continue;
      }
      const cp = c === 'c' && !map.indoor && art.has('textures/colony_path');   // colony art, when the pack has it
      const slot = c === 'g' ? 'grass_' + SEASON_KEY[this.season] : cp ? 'colony_path' : GROUND_TEX[c] || 'soil_dry';
      const m = new THREE.Mesh(tiles(cells, c === 'k' ? 0.06 : c === 'd' ? 0.015 : 0, false, c === 'c' ? 0.34 : c === 'k' || c === 'b' || c === 'd' ? 0.5 : 0.25), std({ map: art.tex(slot, { repeat: 1 }), color: c === 'f' ? 0xb48a66 : c === 'c' ? 0xd8d2c8 : map.id === 'house' && c === 'b' && this.flags && this.flags.house_floor ? (HOUSE_FLOOR_TINT[this.flags.house_floor] || 0xffffff) : 0xffffff })); m.receiveShadow = true; R.add(m);
    }
    this.colony.setCentre(H / 2); this.spinners = []; this.beacons = []; this.cars = []; this.bots = null; this.pools = null; this.rocks = null; this.earthSky = null;
    if (!map.indoor && !map.ruins && !map.under) R.add(buildSurroundings(map, this.season));   // terraces rising into the cylinder's curve
    else if (map.belt) { const bd = spaceBackdrop(W, H, map); R.add(bd); this.earthSky = bd.userData.earth; }  // the belt: stars, the Earth, Eden's hull, sector bands
    else if (map.under) { /* the Undercroft: nothing beyond its walls but the dark */ }
    else if (!map.indoor) {                              // the Old World: ash plains and broken towers
      const slot = map.ruins ? 'ash_ground' : 'grass_' + SEASON_KEY[this.season];
      const t = art.tex(slot, { repeat: 1 }).clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 60); t.needsUpdate = true;
      const far = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), std({ map: t })); far.rotation.x = -Math.PI / 2; far.position.set(W / 2, -0.04, H / 2); far.receiveShadow = true; R.add(far);
      if (false) for (let i = 0; i < 70; i++) { const a = i * 2.399, d = Math.max(W, H) * 0.62 + (i % 7) * 4; const x = W / 2 + Math.cos(a) * d, z = H / 2 + Math.sin(a) * d * 0.9; if (x > -2 && x < W + 2 && z > -2 && z < H + 2) continue; if (z > H && Math.abs(x - W / 2) < 16) continue; const p = this.makeProp(i % 3 ? 'tree' : 'pine', { scale: 1 + (i % 5) * 0.12 }); p.position.set(x, 0, z); R.add(p); }
      else for (let i = 0; i < 26; i++) { const a = i * 2.399, d = map.city ? Math.max(W, H) * 0.62 + (i % 6) * 5 : 14 + (i % 6) * 5; const h = 3 + (i % 5) * 2.2; const t2 = box(2 + (i % 3), h, 2 + (i % 2), std({ map: art.tex(i % 2 ? 'concrete_ruin' : 'brick_ruin', { repeat: 0.25 }) })); t2.position.set(W / 2 + Math.cos(a) * d, h / 2, H / 2 + Math.sin(a) * d - 6); if (t2.position.z > H - 1) continue; t2.rotation.z = (i % 4 - 1.5) * 0.03; R.add(t2); }
    } else {                                             // room walls: back and sides, open to the camera
      const wm = map.colonyRoom ? std({ color: map.colonyRoom === 'warm' ? 0xf4ecdc : 0xe9eef0, roughness: 0.7 }) : map.glass ? new THREE.MeshStandardMaterial({ color: 0xcfeaf0, transparent: true, opacity: 0.3, roughness: 0.1 }) : std({ map: art.tex(map.id === 'barn' || map.id === 'ranch' ? 'barn_red' : map.id === 'coop' || map.id === 'house' || map.id === 'workshop' ? 'plank_wall' : map.id === 'cafe' ? 'metal_hull' : 'plaster_wall', { repeat: 0.5 }), color: map.id === 'house' && this.flags && this.flags.house_paint ? (HOUSE_PAINT_TINT[this.flags.house_paint] || 0xffffff) : 0xffffff });
      const hh = map.id === 'church' ? 3.9 : 2.9; R.add(box(W, hh, 0.2, wm, W / 2, 0, -0.1), box(0.2, hh, H, wm, -0.1, 0, H / 2), box(0.2, hh, H, wm, W + 0.1, 0, H / 2));
      if (map.colonyRoom) { const tm = TEAL(); R.add(box(W, 0.22, 0.24, tm, W / 2, 0, -0.08), box(0.24, 0.22, H, tm, -0.08, 0, H / 2), box(0.24, 0.22, H, tm, W + 0.08, 0, H / 2), box(W, 0.08, 0.24, tm, W / 2, hh - 0.08, -0.08)); }
      if (!map.colonyRoom && !map.glass && !['barn', 'coop', 'fold', 'duckhouse', 'greenhouse'].includes(map.id)) this.roomDressing(R, W, H, hh, map);   // windows and a skirting board (2026-11-22)
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.6), std({ color: 0x6f5a3a })); mat.rotation.x = -Math.PI / 2; mat.position.set(map.exitTile[0] + 0.5, 0.02, map.exitTile[1] + 0.6); R.add(mat);
      const lamp = new THREE.PointLight(0xffd9a0, 30, 30, 1.6); lamp.position.set(W / 2, 3.4, H / 2); R.add(lamp);
    }
    this.occluders = [];
    for (const b of map.buildings) { const o = this.makeBuilding(b); R.add(o); if (!map.indoor) this.occluders.push({ o, x0: b.x - 0.3, x1: b.x + b.w + 0.3, z0: b.y - 0.3, z1: b.y + b.d + 0.3, h: (b.height || 4) + 1.5 }); }
    const built = [], pools = [];
    map.props.forEach((p, pi) => { p.index = pi; });
    this.underLamps = [];
    for (const p of map.props) {
      if ((p.unless && this.flags[p.unless]) || (p.when && !this.flags[p.when])) { p.obj = null; continue; }   // the Undercroft's barriers, until restored
      if (p.zone) { p.lit = p.zone === 'landing' || !!this.flags['ld_' + p.zone]; if (p.lit) { this.underLamps.push({ x: p.x + 0.5, z: p.y + 0.5 }); pools.push({ x: p.x + 0.5, z: p.y + 0.5, warm: true, r: 2.8 }); } }
      if (p.pump) p.running = !!this.flags['ld_' + p.pump]; if (p.bed != null) p.rotten = !this.flags.ld_catacombs;
      if (p.kind === 'reactor_console') { p.safe = !!this.flags.ld_reactor; p.step = this.flags.reactor || 0; }
      let kind = p.kind === 'tree' && p.y >= H - 1 ? 'bush' : p.kind;
      if ((kind === 'tree' || kind === 'pine') && this.isFelled && this.isFelled(map.id + ':' + p.index)) kind = 'stump';
      this.colonyFx = { spin: this.spinners, glow: [] };
      const turn = kind === 'pipe_run' && p.d > p.w;            // a pipe running north-south is built east-west and turned
      // a berry bush shows berries only while there are some to pick (owner 2026-11-22); an edge 'tree' drawn as a bush never has any
      const bushModel = kind === 'bush' ? (p.kind === 'bush' && this.bushShown && this.bushShown(map, p) ? 'bush' : 'bush_bare') : null;
      const o = this.makeProp(kind, turn ? { ...p, w: p.d, d: p.w } : bushModel ? { ...p, model: bushModel } : p);
      if (turn) o.userData.turn = true;
      if (COLONY_KINDS.has(kind) && !art.hasModel(kind) && kind !== 'maint_bot') built.push(o);
      const rr = p.rot && o.userData.is3d ? p.rot : 0;
      for (const q of this.colonyFx.glow) pools.push({ x: p.x + p.w / 2 + q.x * Math.cos(rr) + q.z * Math.sin(rr), z: p.y + p.d / 2 - q.x * Math.sin(rr) + q.z * Math.cos(rr), warm: q.warm });
      if (kind === 'lantern') pools.push({ x: p.x + 0.5, z: p.y + 0.5, warm: true, r: 2.2 });
      o.position.set(p.x + p.w / 2, p.onWater ? -0.18 : 0, p.y + p.d / 2);
      if (p.rot && (o.userData.is3d || kind === 'fence')) o.rotation.y = p.rot;
      if (o.userData.turn) o.rotation.y = Math.PI / 2;
      R.add(o); p.obj = o; if (kind === 'tree' || kind === 'pine' || kind === 'bush' || kind === 'ruin_tower') this.tallProps.push(o);   // city towers fade too
      if (kind === 'tree' && p.fruit && this.wildFruitShown && this.wildFruitShown(map, p)) {     // a fruiting wild tree: fruit in the canopy
        const col = { plum: 0x7a2f6a, loquat: 0xf0a830, mulberry: 0x3a1838, wild_apple: 0xc8402a, chestnut: 0x8a5a2a, yuzu: 0xf2d23a }[p.fruit] || 0xd04030;
        const fg = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }), geo = new THREE.SphereGeometry(0.11, 8, 6), sc = p.scale || 1;
        for (let i = 0; i < 9; i++) { const a = i * 2.4 + p.x, r = 0.8 + (i % 3) * 0.25, f = new THREE.Mesh(geo, mat); f.position.set(Math.cos(a) * r * sc, (2.1 + (i % 4) * 0.35) * sc, Math.sin(a) * r * sc); fg.add(f); }
        o.add(fg); o.userData.fruits = fg;
      }
      const lampL = o.userData.lamp || (o.children[0] && o.children[0].userData.lamp); if (lampL) this.lamps.push(lampL);
    }
    this.colonyFx = null;
    if (map.id === 'farm') this.farmNight(R, map);
    if (map.city) this.roadMarks(R, map);              // faded lane lines on the city's streets (2026-11-22)   // the farmhouse's porch lamp and lit windows, fireflies over the field (2026-11-22)
    for (const s of this.spinners) s.o.userData.moving = true;
    if (built.length) mergeStatic(built, R);                   // the built colony props: one mesh per material
    if (pools.length) { this.pools = lightPools(pools); R.add(this.pools); }
    if (map.bots) this.bots = new Bots(map.bots, R, () => this.makeProp('maint_bot', {}));
    this.dyn = new THREE.Group(); R.add(this.dyn);
    for (const f of map.fields || (map.field ? [map.field] : [])) this.buildField(f);
    if (map.pasture) this.buildPasture();
  }

  // ------------------------------------------------------------ field and pasture
  buildField(f) { const fd = this.state.fields[f.id]; if (!fd) return; for (let i = 0; i < fd.tiles.length; i++) this.refreshTile(f.id, i); }
  refreshTile(fieldId, i) {
    const f = (this.map.fields || [this.map.field]).find((q) => q && q.id === fieldId); if (!f) return;
    const fd = this.state.fields[fieldId], t = fd.tiles[i], x = f.x + (i % fd.w) + 0.5, z = f.y + Math.floor(i / fd.w) + 0.5, key = (f === this.map.field ? 'f' : f.id) + i;
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
    if (st === 3 && CROPS[id] && CROPS[id].flower) g.add(flowerHead(id, h));
    else if (st === 3) g.add(ball(0.13, std({ color: CROP_COLOR[id] || 0xffffff }), 0, Math.min(h * 0.6, 0.5), 0.12, 1), ball(0.1, std({ color: CROP_COLOR[id] || 0xffffff }), -0.12, Math.min(h * 0.45, 0.4), -0.08, 1));
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
  // The belt's rocks, drawn instanced from the sim's grid (state.mine.cells), only those near Sato (see BeltRocks).
  stoneShade(o) { return stoneShade(o); }
  beltField(mine) { if (this.rocks) this.rocks.dispose(); this.rocks = new BeltRocks(this.root, mine); return this.rocks; }
  // Windows with curtains on the side walls and a skirting board: rooms were bare boxes. Daylight in the panes follows the clock.
  roomDressing(R, W, H, hh, map) {
    const hsh = (map.id.length * 7 + W * 3 + H) % 5, curtain = [0xd98c8c, 0x8cb4d9, 0xe0c27a, 0x9cc49a, 0xc9a0d0][hsh];
    const frame = std({ color: 0x8a5e3c, roughness: 0.8 }), cur = std({ color: curtain, roughness: 0.95 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe4ff, emissive: 0x9fd4ff, emissiveIntensity: 0.55, roughness: 0.2 }); this.windowGlass = glass;
    const zs = H >= 8 ? [H * 0.3, H * 0.72] : [H * 0.45];
    for (const side of [0, 1]) for (const z of zs) {
      const g = new THREE.Group(), x = side ? W + 0.0 : 0.0, n = side ? -1 : 1;
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.85), glass); pane.rotation.y = n * Math.PI / 2; g.add(pane);
      g.add(box(0.06, 0.08, 1.04, frame, 0, -0.47, 0), box(0.06, 0.08, 1.04, frame, 0, 0.43, 0), box(0.06, 0.95, 0.07, frame, 0, -0.47, -0.49), box(0.06, 0.95, 0.07, frame, 0, -0.47, 0.49), box(0.05, 0.9, 0.04, frame, 0, -0.45, 0), box(0.05, 0.04, 0.95, frame, 0, -0.02, 0));
      g.add(box(0.14, 0.06, 1.14, frame, n * 0.04, -0.55, 0));                                  // the sill
      g.add(box(0.05, 1.05, 0.26, cur, n * 0.05, -0.55, -0.64), box(0.05, 1.05, 0.26, cur, n * 0.05, -0.55, 0.64), box(0.04, 0.05, 1.7, frame, n * 0.05, 0.56, 0));   // curtains and rail
      g.position.set(x + n * 0.02, 1.75, z); R.add(g);
    }
    R.add(box(W, 0.14, 0.04, frame, W / 2, 0, 0.01), box(0.04, 0.14, H, frame, 0.01, 0, H / 2), box(0.04, 0.14, H, frame, W - 0.01, 0, H / 2));   // skirting
  }
  roadMarks(R, map) {
    const W = map.w, H = map.h, st = (x, y) => x >= 0 && y >= 0 && x < W && y < H && map.g[y * W + x] === 'm' && !map.block[y * W + x];
    const mat = new THREE.MeshBasicMaterial({ color: 0xe8dca0, transparent: true, opacity: 0.45, depthWrite: false }), geo = new THREE.PlaneGeometry(0.42, 0.07);
    const marks = [];
    // a street two tiles wide gets a dashed line down the middle; runs of at least 4 tiles
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) if (st(x, y) && st(x, y + 1) && !st(x, y - 1) && !st(x, y + 2) && st(x - 1, y) && st(x + 1, y) && (x % 2 === 0)) marks.push([x + 0.5, y + 1, 0]);
    for (let x = 0; x < W - 1; x++) for (let y = 0; y < H; y++) if (st(x, y) && st(x + 1, y) && !st(x - 1, y) && !st(x + 2, y) && st(x, y - 1) && st(x, y + 1) && (y % 2 === 0)) marks.push([x + 1, y + 0.5, 1]);
    if (!marks.length) return;
    const im = new THREE.InstancedMesh(geo, mat, marks.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    marks.forEach(([x, z, turn], i) => { e.set(-Math.PI / 2, 0, turn ? Math.PI / 2 : 0); q.setFromEuler(e); m4.compose(v.set(x, 0.025, z), q, one); im.setMatrixAt(i, m4); });
    im.renderOrder = 1; R.add(im);
  }
  farmNight(R, map) {
    const b = map.buildings.find((q) => q.kind === 'house'); if (!b) return;
    const lamp = new THREE.PointLight(0xffc878, 0, 9, 1.4); lamp.position.set(b.x + b.w / 2, 2.2, b.y + b.d + 0.6); R.add(lamp); this.lamps.push(lamp);
    const n = 46, pos = new Float32Array(n * 3), ph = new Float32Array(n), f = map.field || { x: 3, y: 12, w: 30, h: 16 };
    for (let i = 0; i < n; i++) { pos[i * 3] = f.x + Math.random() * (f.w || 30); pos[i * 3 + 1] = 0.4 + Math.random() * 1.4; pos[i * 3 + 2] = f.y + Math.random() * (f.h || 16); ph[i] = Math.random() * 6.28; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.userData.ph = ph; g.userData.base = pos.slice();
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,200,1)'); gr.addColorStop(0.3, 'rgba(220,255,120,.8)'); gr.addColorStop(1, 'rgba(200,255,100,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    this.flies = new THREE.Points(g, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(cv), size: 0.35, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); this.flies.frustumCulled = false; R.add(this.flies);
  }
  // Redraw one map prop in place (a bush just picked bare): same spot, same turn.
  swapProp(p, kind, o2) {
    const old = p.obj; if (!old || !old.parent) return; const n = this.makeProp(kind, { ...p, ...o2 });
    n.position.copy(old.position); n.rotation.copy(old.rotation); old.parent.add(n); old.parent.remove(old); p.obj = n;
    const k = this.tallProps.indexOf(old); if (k >= 0) this.tallProps[k] = n;
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
  // The Undercroft: five real lights follow the nearest lit lamps (the rest glow by their pools), and a soft one follows Sato.
  lightUnder() {
    if (!this.uLights || this.uLights[0].parent !== this.root) { this.uLights = []; for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(i ? 0xffc27a : 0xbfd8ff, 0, i ? 11 : 7, 1.3); this.root.add(l); this.uLights.push(l); } }
    const f = this.focus, near = (this.underLamps || []).slice().sort((a, b) => Math.hypot(a.x - f.x, a.z - f.z) - Math.hypot(b.x - f.x, b.z - f.z));
    const [me, ...rest] = this.uLights; me.position.set(f.x, 2.4, f.z + 0.4); me.intensity = 2.2;
    rest.forEach((l, i) => { const p = near[i]; l.intensity = p ? 7 + Math.sin(this.t * 2.3 + i) * 0.25 : 0; if (p) l.position.set(p.x, 1.75, p.z); });
  }
  setCursor(x, y, on) { this.cursor.visible = on; if (on) this.cursor.position.set(x + 0.5, 0.05, y + 0.5); }
  // world tile position → screen pixels (for floating labels)
  project(x, y, h = 0) { const v = new THREE.Vector3(x, h, y).project(this.camera), c = this.renderer.domElement; return { x: (v.x * 0.5 + 0.5) * c.clientWidth, y: (-v.y * 0.5 + 0.5) * c.clientHeight, behind: v.z > 1 }; }

  // ------------------------------------------------------------ frame
  update(dt, px, py) {
    this.t += dt;
    const indoor = this.map && this.map.indoor, el = this.renderer.domElement, narrow = el.clientWidth < el.clientHeight * 0.75;
    const d = indoor ? Math.min(this.dist, 10.5) * (narrow ? 1.1 : 1) : this.dist;   // a phone held upright sees a room from further back (2026-11-22)
    { const want = indoor && narrow ? 56 : 38; if (Math.abs(this.camera.fov - want) > 0.3) { this.camera.fov = want; this.camera.updateProjectionMatrix(); } }   // and wide enough to see the whole room
    this.focus.lerp(new THREE.Vector3(px, 0.8, py), Math.min(1, dt * 7));
    const cp = Math.cos(this.pitch), c = this.camera;
    c.position.set(this.focus.x + Math.sin(this.yaw) * cp * d, this.focus.y + Math.sin(this.pitch) * d, this.focus.z + Math.cos(this.yaw) * cp * d);
    if (this.shake > 0.002) { c.position.x += (Math.random() - 0.5) * this.shake; c.position.y += (Math.random() - 0.5) * this.shake; this.shake *= Math.pow(0.02, dt); } else this.shake = 0;
    const up = indoor ? 0 : Math.max(0, 0.42 - this.pitch) * d * 0.6;   // a low camera tilts up to the land overhead
    c.lookAt(this.focus.x, this.focus.y + up, this.focus.z);
    for (const k in this.sky) this.sky[k].position.copy(c.position);
    this.colony.update(c);
    for (const s of this.spinners || []) s.o.rotation[s.axis] += s.speed * dt;
    for (const [k, o] of this.tileObjs) if (o.userData && o.children[0] && o.children[0].userData.haze) for (const q of o.children[0].children) if (q.isSprite) { q.material.opacity = 0.22 + 0.12 * Math.sin(this.t * 1.3 + k.length + q.userData.haze * 2); q.position.y = 0.45 + 0.1 * Math.sin(this.t * 0.7 + q.userData.haze); }
    for (const c of this.cars || []) { const k = 0.5 - 0.5 * Math.cos(this.t * 0.09); c.o.position.y = c.y0 + (c.y1 - c.y0) * k; }   // the elevator car rides the cable
    for (const b of this.beacons || []) { const on = Math.sin(this.t * 3.2) > 0.2; b.m.visible = on || (this.night || 0) < 0.3; b.l.intensity = on ? (this.night || 0) * 18 : 0; }
    for (const g of this.steam || []) for (const m of g.children) { const k = ((this.t * 0.25 + m.userData.seed) % 1); m.position.set(m.userData.x + Math.sin(this.t + m.userData.seed) * 0.15, 0.3 + k * 1.7, m.userData.z); m.scale.setScalar(0.7 + k * 1.6); m.material.opacity = 0.42 * Math.sin(k * Math.PI); }
    if (this.bots) this.bots.update(dt, this.t);
    if (this.rocks) this.rocks.update(px, py);
    if (this.earthSky) this.earthSky.position.copy(c.position).addScaledVector(EARTH_DIR, 1500);   // always as far away, low over the lane's east side
    for (const f of this.facers) f.rotation.y = this.yaw;
    for (const m of this.waterMats || []) m.map.offset.set(this.t * 0.015, this.t * 0.01);
    for (const l of this.lamps || []) l.intensity = (this.night || 0) * 14;
    if (this.flies) { const k = this.season === 1 || this.season === 0 ? Math.max(0, (this.night || 0) - 0.35) * 1.6 : 0; this.flies.material.opacity = Math.min(1, k); this.flies.visible = k > 0.01;
      if (this.flies.visible) { const p = this.flies.geometry.attributes.position, b = this.flies.geometry.userData.base, ph = this.flies.geometry.userData.ph; for (let i = 0; i < p.count; i++) { p.setX(i, b[i * 3] + Math.sin(this.t * 0.6 + ph[i]) * 0.8); p.setY(i, b[i * 3 + 1] + Math.sin(this.t * 1.1 + ph[i] * 2) * 0.3); p.setZ(i, b[i * 3 + 2] + Math.cos(this.t * 0.5 + ph[i]) * 0.8); } p.needsUpdate = true; } }
    if (this.map && this.map.under) this.lightUnder();
    for (const a of this.actors.values()) a.update(dt, this);
    // trees standing between the camera and Sato step aside
    const cx = Math.sin(this.yaw), cz = Math.cos(this.yaw);
    // trees between the camera and Sato turn see-through (about 8% opaque) instead of collapsing
    const fade = (o, hide, low) => {
      const k0 = o.userData.k ?? 1, k = Math.max(low, Math.min(1, k0 + (hide ? -dt : dt) * 4));
      if (k === k0 && (k === 1 || (o.userData.ownMats && o.userData.ownMats.length && o.userData.nKids === o.children[0]?.children.length))) return;   // a model that loads later is caught too
      o.userData.k = k; o.userData.nKids = o.children[0]?.children.length;
      if (!o.userData.ownMats) o.userData.ownMats = [];
      o.traverse((q) => { if (q.isMesh && q.material && !q.userData.own) { q.material = q.material.clone(); q.material.transparent = true; q.userData.own = true; o.userData.ownMats.push(q.material); } });   // also models that arrived late
      for (const m of o.userData.ownMats) { m.opacity = k; m.depthWrite = k > 0.97; m.alphaTest = k > 0.97 ? (m.alphaTest || 0) : 0; }
      o.traverse((q) => { if (q.isMesh) q.castShadow = k > 0.5; });
    };
    for (const o of this.tallProps || []) {
      const rx = o.position.x - px, rz = o.position.z - py, along = rx * cx + rz * cz, lat = Math.abs(rx * cz - rz * cx);
      fade(o, along > 0.3 && along < 9 && lat < 2.2, 0.08);
    }
    // so do buildings that cut the line from the camera to Sato (Eden Central's tall blocks, the observatory)
    for (const b of this.occluders || []) {
      let hide = false;
      for (let i = 1; i <= 14 && !hide; i++) { const t = i / 14, x = this.focus.x + (c.position.x - this.focus.x) * t, y = this.focus.y + (c.position.y - this.focus.y) * t, z = this.focus.z + (c.position.z - this.focus.z) * t; hide = x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y < b.h; }
      fade(b.o, hide, 0.22);
    }
    for (const [k, o] of this.tileObjs) if (o.userData.hover || (o.children[0] && o.children[0].userData.hover)) o.position.y = Math.sin(this.t * 2 + k.length) * 0.08;
    if (this.drift && this.drift.visible) {                // drifting petals / leaves / flakes: slow fall, a lazy sideways sway
      const p = this.drift.geometry.attributes.position, ph = this.drift.geometry.userData.ph; this.drift.position.set(px, 0, py);
      for (let i = 0; i < p.count; i++) { let y = p.getY(i) - this.driftSpeed * dt; if (y < 0) y += 9; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(this.t * 1.3 + ph[i]) * 0.6 * dt + 0.25 * dt); if (p.getX(i) > 17) p.setX(i, -17); }
      p.needsUpdate = true;
    }
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

// The view through the great window: deep space, stars, the Earth and a slice of the Moon (a long canvas band).
let EARTH = null;
function earthBand() {
  if (EARTH) return EARTH;
  const c = document.createElement('canvas'); c.width = 2048; c.height = 256; const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#02040c'); sky.addColorStop(1, '#0a1630'); x.fillStyle = sky; x.fillRect(0, 0, 2048, 256);
  let s = 7; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; const z = r() < 0.06 ? 2 : 1; x.fillRect(r() * 2048, r() * 256, z, z); }
  const ex = 1250, ey = 300, er = 260;                       // the Earth, rising over the bottom of the window
  const glow = x.createRadialGradient(ex, ey, er * 0.9, ex, ey, er * 1.12); glow.addColorStop(0, 'rgba(120,190,255,.55)'); glow.addColorStop(1, 'rgba(120,190,255,0)'); x.fillStyle = glow; x.beginPath(); x.arc(ex, ey, er * 1.12, 0, 7); x.fill();
  const sea = x.createRadialGradient(ex - 80, ey - 140, 20, ex, ey, er); sea.addColorStop(0, '#5fa8e8'); sea.addColorStop(0.7, '#1f5aa0'); sea.addColorStop(1, '#0c2a58'); x.fillStyle = sea; x.beginPath(); x.arc(ex, ey, er, 0, 7); x.fill();
  x.save(); x.beginPath(); x.arc(ex, ey, er, 0, 7); x.clip();
  x.fillStyle = 'rgba(160,140,110,.75)'; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(ex - 200 + r() * 400, ey - 220 + r() * 120, 30 + r() * 70, 12 + r() * 25, r() * 3, 0, 7); x.fill(); }
  x.fillStyle = 'rgba(110,160,90,.6)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(ex - 150 + r() * 300, ey - 200 + r() * 90, 14 + r() * 25, 6 + r() * 10, r() * 3, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineCap = 'round'; for (let i = 0; i < 16; i++) { x.lineWidth = 3 + r() * 7; x.beginPath(); const a = ex - 230 + r() * 460, b = ey - 250 + r() * 140; x.moveTo(a, b); x.quadraticCurveTo(a + 40 + r() * 40, b - 10 + r() * 20, a + 90 + r() * 80, b + r() * 16); x.stroke(); }
  const night = x.createLinearGradient(ex - er, 0, ex + er, 0); night.addColorStop(0, 'rgba(0,0,10,0)'); night.addColorStop(0.62, 'rgba(0,0,10,0)'); night.addColorStop(1, 'rgba(0,0,10,.8)'); x.fillStyle = night; x.fillRect(ex - er, 0, er * 2, 256);
  x.restore();
  x.fillStyle = '#d8d6cf'; x.beginPath(); x.arc(420, 70, 26, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.arc(412, 64, 6, 0, 7); x.arc(430, 80, 4, 0, 7); x.fill();
  EARTH = new THREE.CanvasTexture(c); EARTH.colorSpace = THREE.SRGBColorSpace; return EARTH;
}

// Space around the belt: a star sphere, the Earth far to the north, Eden's hull drum behind the launch apron, far rocks
// down both sides, and on the dust lane a tint for each sector (blue-grey near home, violet, then gold far out) with a
// glowing line where one sector meets the next.
export const sectorColor = (n) => new THREE.Color().setHSL(0.58 - Math.min(1, (n - 1) / 19) * 0.5, 0.55, 0.55);
function spaceBackdrop(W, H, map = {}) {
  const g = new THREE.Group(), cx = W / 2, cz = H / 2;
  const n = 1800, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = 700; pos[i * 3] = Math.sqrt(1 - u * u) * Math.cos(a) * r + cx; pos[i * 3 + 1] = Math.abs(u) * r * 0.9 + 20; pos[i * 3 + 2] = Math.sqrt(1 - u * u) * Math.sin(a) * r + cz; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })));
  g.userData.earth = earthPlanet(); g.add(g.userData.earth);
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 520, 40, 1, true), std({ map: art.tex('hull_plate', { repeat: 0.5 }), side: THREE.DoubleSide })); hull.rotation.z = Math.PI / 2; hull.position.set(cx - 40, -95, H + 110); hull.material.fog = false; g.add(hull);
  for (let i = 0; i < 6; i++) { const ring = cyl(61, 61, 2, std({ color: 0x9fb0bf }), 0, 0, 0, 40); ring.rotation.z = Math.PI / 2; ring.position.set(cx - 280 + i * 100, -95, H + 110); g.add(ring); }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 60, H + 30), new THREE.MeshStandardMaterial({ color: 0x1a1c26, transparent: true, opacity: 0.55, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, -0.06, cz); floor.receiveShadow = true; g.add(floor);
  const far = new THREE.DodecahedronGeometry(1, 0), farM = [0x6e6258, 0x5a5550, 0x7a6a5a].map((c) => std({ color: c, flatShading: true }));
  for (let i = 0; i < 160; i++) { const side = i % 2 ? -1 : 1, s2 = 0.4 + (i % 5) * 0.5, r = new THREE.Mesh(far, farM[i % 3]); r.scale.setScalar(s2); r.position.set(side > 0 ? W + 4 + ((i * 37) % 26) : -4 - ((i * 53) % 26), -5 + (i % 7) * 1.1, ((i * 0.618) % 1) * (H + 40) - 20); r.rotation.set(i, i * 2, i * 3); g.add(r); }
  if (map.sectors) {
    const sh = map.sectorH, top = (k) => (map.sectors - k) * sh + 1;
    for (let k = 1; k <= map.sectors; k++) {
      const c = sectorColor(k), band = new THREE.Mesh(new THREE.PlaneGeometry(W - 2, sh), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.07 + (k % 2) * 0.03, depthWrite: false }));
      band.rotation.x = -Math.PI / 2; band.position.set(cx, 0.012, top(k) + sh / 2); band.renderOrder = 1; g.add(band);
      if (k > 1) { const line = new THREE.Mesh(new THREE.PlaneGeometry(W - 2, 0.12), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8, depthWrite: false })); line.rotation.x = -Math.PI / 2; line.position.set(cx, 0.02, top(k) + sh); line.renderOrder = 2; g.add(line); }
    }
  }
  return g;
}
// The belt's rocks: an InstancedMesh for each kind (small, medium, large and huge rocks, great asteroids, comet ice,
// and the glints on the big ones), using the art pack's rock models when there are any. Only the rocks within REACH tiles of Sato are
// instanced (several hundred stay off the GPU); the list is rebuilt when she has moved a few tiles or a rock breaks.
// The asteroid model paints its rocks purple: this takes a material to stone grey (the belt's rocks and drifting debris).
export function stoneMaterial(mat) {
  const m = mat.clone(); m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  { float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.18 + lum * 0.9) * vec3(1.06, 0.98, 0.9), 0.82); }'); };
  m.customProgramCacheKey = () => 'stone-rock'; m.userData.stone = true; return m;
}
// Stone-shade every mesh of an object (a model can arrive later: call again; it returns true once something was shaded).
export function stoneShade(o) { let n = 0; o.traverse((q) => { if (q.isMesh && q.material && !q.material.userData.stone) { q.material = stoneMaterial(q.material); n++; } else if (q.isMesh) n++; }); return n > 0; }
// Free the GPU buffers of a map being unloaded. Shared geometry (loaded models, the rock shapes, the colony's
// cached shapes) carries userData.keep and is left alone; everything built fresh for this map is disposed.
export function freeGeometry(root) {
  root.traverse((o) => { const g = o.geometry; if (g && !g.userData.keep && g.dispose) g.dispose(); });
}
const ROCK_GEO = new Map();
function rockGeo(name, big) {
  if (ROCK_GEO.has(name)) return ROCK_GEO.get(name);
  const keep = (r) => { if (r && r.geo) r.geo.userData.keep = true; return r; };   // shared by every belt visit: never freed
  const proc = () => { const geo = new THREE.DodecahedronGeometry(big ? 0.62 : 0.42, 1), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.82 + (((i * 37 + (big ? 5 : 11)) % 17) / 17) * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); } geo.computeVertexNormals(); return { geo, mat: std({ color: 0xffffff, flatShading: true }), model: false }; };
  const pr = art.model(name).then((m) => {
    if (!m) return proc();
    m.updateMatrixWorld(true); let mesh = null; m.traverse((q) => { if (q.isMesh && !mesh) mesh = q; });
    if (!mesh) return proc();
    const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld); geo.computeBoundingBox(); const bb = geo.boundingBox, sz = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) || 1;
    geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2); geo.scale(0.9 / sz, 0.9 / sz, 0.9 / sz);
    const mat = mesh.material.clone(); return { geo, mat, model: true };
  });
  const kp = pr.then(keep); ROCK_GEO.set(name, kp); return kp;
}
// Rock sizes (sim.ROCK_SIZES): small, medium, large (gold-flecked, two glints), huge (warm, four glints); great asteroids are the walls.
const ROCK_KIND = { 1: { model: 'asteroid', s: 0.62, y: 0.32, tint: [0xffe2c0, 0xf2cfa8, 0xffecd8] }, 2: { model: 'asteroid', s: 0.95, y: 0.45, tint: [0xe8dccb, 0xd9cbb8, 0xf0e4d4] }, 3: { model: 'asteroid_big', s: 1.5, y: 0.6, big: true, tint: [0x8f8880, 0x7c766f] }, 4: { model: 'comet_ice', s: 0.85, y: 0.32, tint: [0xe8f6ff, 0xd2ecff] }, 5: { model: 'asteroid', s: 1.28, y: 0.6, glints: 2, tint: [0xffe2a0, 0xf5d090, 0xffd8b0] }, 8: { model: 'asteroid', s: 1.75, y: 0.8, glints: 4, tint: [0xffc890, 0xffb880, 0xf0c0a0] } };
const GLINT = [0xffd36a, 0xd890ff, 0x8ff4ff];
class BeltRocks {
  constructor(root, mine) {
    this.mine = mine; this.root = new THREE.Group(); root.add(this.root); this.meshes = {}; this.ver = -1; this.at = [1e9, 1e9]; this.REACH = 21; this.alive = true;
    const count = {}; for (const c of mine.cells) count[c] = (count[c] || 0) + 1;
    for (const k of [1, 2, 3, 4, 5, 8]) {
      const d = ROCK_KIND[k], cap = Math.min(count[k] || 0, k === 3 ? 520 : 420) + 4;
      rockGeo(d.model, d.big).then(({ geo, mat }) => {
        if (!this.alive) return;
        if (k !== 4) mat = stoneMaterial(mat);   // the model paints them purple: take it to stone grey
        const im = new THREE.InstancedMesh(geo, mat, cap); im.castShadow = true; im.frustumCulled = false; im.count = 0;
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.meshes[k] = im; this.root.add(im); this.ver = -1;
      });
    }
    const gl = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), Math.min(count[5] || 0, 420) * 2 + Math.min(count[8] || 0, 200) * 4 + 4);
    gl.frustumCulled = false; gl.count = 0; this.meshes.glint = gl; this.root.add(gl);
  }
  dispose() { this.alive = false; this.root.parent && this.root.parent.remove(this.root); }
  update(px, py) {
    const m = this.mine; if (m.ver === this.ver && Math.hypot(px - this.at[0], py - this.at[1]) < 3) return;
    this.ver = m.ver; this.at = [px, py];
    const R = this.REACH, mat = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color(), n = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 8: 0, glint: 0 };
    const x0 = Math.max(0, Math.floor(px - 1 - R)), x1 = Math.min(m.w - 1, Math.ceil(px - 1 + R)), y0 = Math.max(0, Math.floor(py - 1 - R)), y1 = Math.min(m.h - 1, Math.ceil(py - 1 + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = m.cells[y * m.w + x], im = this.meshes[k]; if (!im || n[k] >= im.instanceMatrix.count) continue;
      const dx = x + 1.5 - px, dy = y + 1.5 - py; if (dx * dx + dy * dy > R * R) continue;
      const h = ((x * 73856093) ^ (y * 19349663)) >>> 0, f = (h % 1000) / 1000, d = ROCK_KIND[k];
      e.set(h % 7, (h >> 3) % 7, (h >> 6) % 7); q.setFromEuler(e); const s = d.s * (0.82 + f * 0.36);
      v.set(x + 1.5 + ((h >> 9) % 10 - 5) * 0.02, d.y + ((h >> 13) % 10) * 0.025, y + 1.5 + ((h >> 17) % 10 - 5) * 0.02);
      mat.compose(v, q, sc.set(s, s * (k === 3 ? 0.9 : 0.85), s)); im.setMatrixAt(n[k], mat); im.setColorAt(n[k], c.set(d.tint[h % d.tint.length])); n[k]++;
      for (let j = 0; j < (d.glints || 0); j++) { const g = this.meshes.glint; if (n.glint >= g.instanceMatrix.count) break; const a = (h % 6) + j * (6.28 / d.glints); mat.compose(sc.set(v.x + Math.cos(a) * 0.32 * s, v.y + 0.12 * s + (j % 2) * 0.14, v.z + Math.sin(a) * 0.32 * s), q, new THREE.Vector3(1, 1.6, 1).multiplyScalar(k === 8 ? 1.4 : 1)); g.setMatrixAt(n.glint, mat); g.setColorAt(n.glint, c.set(GLINT[(h >> 4) % 3])); n.glint++; }
    }
    for (const [k, im] of Object.entries(this.meshes)) { im.count = n[k]; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }
}
// The Earth from the belt: a lit sphere (day side to the sun, a dark terminator) with a soft blue rim of atmosphere. It
// rides with the camera at a fixed direction and distance, so it never meets the dust lane at any sector.
const EARTH_DIR = new THREE.Vector3(0.62, -0.3, -0.72).normalize();
function earthPlanet() {
  const g = new THREE.Group(), R = 330;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), new THREE.MeshStandardMaterial({ map: earthGlobe(), roughness: 0.85, metalness: 0, fog: false, emissive: 0x0a1a33, emissiveIntensity: 0.6 }));
  ball.rotation.set(0.35, 2.2, 0.15); g.add(ball);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.045, 64, 40), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main() { float r = 1.0 - max(dot(vN, vV), 0.0); gl_FragColor = vec4(vec3(0.42, 0.68, 1.0) * pow(r, 2.6) * 1.6, 1.0); }' }));
  g.add(rim); g.renderOrder = -5; return g;
}
let GLOBE = null;
function earthGlobe() {
  if (GLOBE) return GLOBE;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#1f5aa0'; x.fillRect(0, 0, 1024, 512);
  let s = 11; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  x.fillStyle = '#8a7a60'; for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse(r() * 1024, 80 + r() * 350, 40 + r() * 120, 20 + r() * 70, r() * 3, 0, 7); x.fill(); }
  x.fillStyle = '#5f8a4a'; for (let i = 0; i < 8; i++) { x.beginPath(); x.ellipse(r() * 1024, 120 + r() * 280, 15 + r() * 40, 8 + r() * 20, r() * 3, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineCap = 'round'; for (let i = 0; i < 40; i++) { x.lineWidth = 4 + r() * 10; x.beginPath(); const a = r() * 1024, b = r() * 512; x.moveTo(a, b); x.quadraticCurveTo(a + 60, b - 10 + r() * 20, a + 120 + r() * 100, b + r() * 20); x.stroke(); }
  x.fillStyle = 'rgba(240,248,255,.9)'; x.fillRect(0, 0, 1024, 26); x.fillRect(0, 486, 1024, 26);
  GLOBE = new THREE.CanvasTexture(c); GLOBE.colorSpace = THREE.SRGBColorSpace; return GLOBE;
}
