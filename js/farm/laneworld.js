// Sato's Harvest: built stand-ins for Market Lane, the fold and the hives (2026-11-19). Each kind is used until a model
// arrives under the same name in art/farm/models (LANE_PROPS / LANE_BUILDINGS name the slots); world.js asks here first.
import * as THREE from 'three';
import * as art from './art.js';

const M = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!M.has(k)) M.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.05, ...o })); return M.get(k); };
const lit = (c, i = 1) => mat(c, { emissive: c, emissiveIntensity: i, roughness: 0.4 });
function box(w, h, d, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function cyl(r0, r1, h, m, x = 0, y = 0, z = 0, seg = 12) { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function ball(r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; return o; }
// A triangular roof prism, ridge along x, centred, base at y.
function prism(w, d, h, m, x = 0, y = 0, z = 0) { const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2); const o = new THREE.Mesh(geo, m); o.rotation.y = Math.PI / 2; o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; }
const tex = (name, rep = 0.5) => { const t = art.tex(name, { repeat: rep }); return t ? mat(0xffffff, { map: t }) : null; };
const WOOD = () => mat(0x9a7048), DARKWOOD = () => mat(0x5c4630), CREAM = () => mat(0xf3ead6), STEEL = () => mat(0x7b8790, { metalness: 0.45, roughness: 0.5 });

// Prop slots: world.js merges these into PROPS (h: the billboard height if a picture is used; model: the slot name).
export const LANE_PROPS = {
  goat: { model: 'goat', h: 0.9, face: true }, sheep: { model: 'sheep', h: 0.9, face: true }, duck: { model: 'duck', h: 0.45, face: true },
  cheese_press: { model: 'cheese_press', h: 1.2, fit: 'foot' }, spinning_wheel: { model: 'spinning_wheel', h: 1.3, fit: 'foot' }, beehive: { model: 'beehive', h: 1.1, fit: 'foot' },
  oven: { model: 'bakery_oven', h: 1.6, fit: 'stretch' }, bread_shelf: { model: 'bread_shelf', h: 1.8, fit: 'stretch' }, flour_sacks: { model: 'flour_sacks', h: 0.8, fit: 'foot' },
  dress_form: { model: 'dress_form', h: 1.6, fit: 'foot' }, bolt_shelf: { model: 'bolt_shelf', h: 1.9, fit: 'stretch' }, sewing_table: { model: 'sewing_table', h: 1.0, fit: 'stretch' },
  flower_bed: { model: 'flower_bed', h: 0.7, fit: 'stretch' }, seed_drawers: { model: 'seed_drawers', h: 1.7, fit: 'stretch' }, tool_wall: { model: 'tool_wall', h: 2.0, fit: 'stretch' },
  engine_block: { model: 'engine_block', h: 1.0, fit: 'stretch' }, radio_desk: { model: 'radio_desk', h: 1.1, fit: 'stretch' }, record_shelf: { model: 'record_shelf', h: 1.8, fit: 'stretch' },
  speaker: { model: 'speaker', h: 1.2, fit: 'foot' }, sofa: { model: 'sofa', h: 0.9, fit: 'stretch' }, mic_stand: { model: 'mic_stand', h: 1.0, fit: 'foot' }, radio_mast: { model: 'radio_mast', h: 9, fit: 'foot' },
  duck_egg: { h: 0.16, soft: true }, feather: { h: 0.1, soft: true }, nothing: { h: 0.01 },
};
export const LANE_BUILDINGS = {
  bakery: { model: ['bakery'], facade: 'buildings/bakery', wall: 'plaster_wall', roof: 'roof_red', lane: 'bakery' },
  tailor: { model: ['tailor'], facade: 'buildings/tailor', wall: 'plaster_wall', roof: 'roof_shingle', lane: 'tailor' },
  seedhouse: { model: ['seedhouse'], facade: 'buildings/seedhouse', wall: 'plank_wall', roof: 'glass', lane: 'seedhouse' },
  garage: { model: ['garage'], facade: 'buildings/garage', wall: 'metal_hull', roof: 'roof_tin', lane: 'garage' },
  radio_station: { model: ['radio_station'], facade: 'buildings/radio_station', wall: 'hull_plate', roof: 'roof_tin', lane: 'radio' },
  fold: { model: ['fold'], facade: 'buildings/fold', wall: 'plank_wall', roof: 'roof_shingle', lane: 'fold' },
  duckhouse: { model: ['duckhouse'], facade: 'buildings/duckhouse', wall: 'plank_wall', roof: 'roof_red', lane: 'duckhouse' },
};
export const LANE_CROP_COLOR = { cabbage: '#a9d27a', snap_pea: '#7ac25a', tulip: '#e8475e', bell_pepper: '#d93a2a', melon: '#c9d98a', sunflower: '#f4c430', beet: '#8a1f3a', cranberry: '#b3122e', cosmos: '#f29ac8', kale: '#3f6a3a', frost_leek: '#dfeadf', snowbell: '#f4f8ff' };
export const LANE_CROP_H = { sunflower: 1.9, snap_pea: 1.1, bell_pepper: 0.8, tulip: 0.6, cosmos: 0.9, frost_leek: 0.7, cranberry: 0.5 };

// A flower head for the ripe flower crops (petals round a centre), so the beds read as flowers, not fruit.
export function flowerHead(id, h) {
  const g = new THREE.Group(), c = LANE_CROP_COLOR[id] || '#ffffff', big = id === 'sunflower';
  for (let k = 0; k < 3; k++) {
    const f = new THREE.Group(); f.position.set(Math.sin(k * 2.1) * 0.16, h * (0.75 + 0.1 * (k % 2)), Math.cos(k * 2.1) * 0.16);
    const n = big ? 12 : 6, r = big ? 0.16 : 0.07;
    for (let i = 0; i < n; i++) f.add(ball(r * (big ? 0.45 : 0.8), mat(c), Math.cos(i * 6.28 / n) * r, 0, Math.sin(i * 6.28 / n) * r, 1, 0.45, 1));
    f.add(ball(r * (big ? 0.75 : 0.45), mat(big ? 0x5a3a1a : 0xffe680), 0, 0.01, 0, 1, 0.5, 1));
    if (id === 'tulip') { f.children.length = 0; f.add(ball(0.09, mat(c), 0, 0.03, 0, 0.85, 1.25, 0.85)); }
    if (id === 'snowbell') { f.children.length = 0; f.add(ball(0.06, mat(c), 0, -0.02, 0, 1, 0.8, 1)); }
    if (big) f.rotation.x = -0.6;
    g.add(f);
    if (big && k > 0) break;
  }
  return g;
}

// o: the prop's options (w, d; for machines ready and busy). Returns null for kinds it does not know.
export function laneProp(kind, o = {}) {
  const g = new THREE.Group(), w = o.w || 1, d = o.d || 1, cx = (w - 1) / 2, cz = (d - 1) / 2;
  switch (kind) {
    case 'nothing': return g;
    case 'goat': {                                          // a little white-and-tan goat with horns and a beard
      const coat = mat(0xf2ede2), tan = mat(0xc99a62), dark = mat(0x3a2a22);
      g.add(ball(0.26, coat, 0, 0.5, 0, 1, 0.85, 1.45), ball(0.15, coat, 0, 0.72, 0.36, 1, 1, 1.2), ball(0.07, tan, 0, 0.66, 0.5), ball(0.05, coat, 0, 0.58, 0.42, 1, 1.6, 1));
      for (const s of [-1, 1]) { const horn = cyl(0.025, 0.012, 0.18, tan, s * 0.06, 0.82, 0.32, 6); horn.rotation.x = -0.6; g.add(horn, ball(0.05, coat, s * 0.13, 0.74, 0.32, 1.6, 0.6, 1), ball(0.022, dark, s * 0.07, 0.75, 0.48)); }
      for (const [x, z] of [[-0.12, 0.22], [0.12, 0.22], [-0.12, -0.22], [0.12, -0.22]]) g.add(cyl(0.035, 0.03, 0.34, tan, x, 0, z, 6));
      g.add(ball(0.04, coat, 0, 0.62, -0.36));
      break;
    }
    case 'sheep': {                                         // a round woolly sheep with a dark face
      const wool = mat(0xf6f2ea, { roughness: 1 }), face = mat(0x3a302c);
      for (const [x, y, z, r] of [[0, 0.5, 0, 0.3], [0.14, 0.55, 0.12, 0.2], [-0.14, 0.55, 0.12, 0.2], [0.14, 0.52, -0.16, 0.2], [-0.14, 0.52, -0.16, 0.2], [0, 0.68, 0, 0.2]]) g.add(ball(r, wool, x, y, z));
      g.add(ball(0.13, face, 0, 0.6, 0.34, 0.9, 1, 1.15), ball(0.09, wool, 0, 0.72, 0.3));
      for (const s of [-1, 1]) g.add(ball(0.05, face, s * 0.13, 0.64, 0.3, 1.5, 0.6, 0.8), ball(0.02, mat(0xffffff), s * 0.05, 0.64, 0.45));
      for (const [x, z] of [[-0.12, 0.18], [0.12, 0.18], [-0.12, -0.18], [0.12, -0.18]]) g.add(cyl(0.035, 0.03, 0.3, face, x, 0, z, 6));
      break;
    }
    case 'duck': {                                          // a white duck with an orange bill
      const white = mat(0xfbfaf4), bill = mat(0xf0a030);
      g.add(ball(0.17, white, 0, 0.17, 0, 1, 0.75, 1.35), ball(0.1, white, 0, 0.34, 0.15), ball(0.04, white, 0, 0.2, -0.22, 1, 1, 1.4));
      g.add(ball(0.05, bill, 0, 0.32, 0.26, 1.1, 0.45, 1.3));
      for (const s of [-1, 1]) g.add(ball(0.018, mat(0x1a1a1a), s * 0.05, 0.37, 0.22), ball(0.08, white, s * 0.13, 0.18, -0.02, 0.5, 0.6, 1.2));
      break;
    }
    case 'duck_egg': g.add(ball(0.09, mat(0xdfeef0), 0, 0.09, 0, 1, 1.25, 1)); break;
    case 'feather': { const f = ball(0.08, mat(0xffffff), 0, 0.03, 0, 0.5, 0.15, 1.6); f.rotation.y = 0.7; g.add(f); break; }
    case 'cheese_press': {                                  // a wooden frame, a screw and a round mould; a cheese wheel on the side when ready
      g.add(box(0.8, 0.12, 0.6, WOOD(), 0, 0, 0), box(0.1, 1.0, 0.1, DARKWOOD(), -0.32, 0.12, 0), box(0.1, 1.0, 0.1, DARKWOOD(), 0.32, 0.12, 0), box(0.76, 0.12, 0.14, DARKWOOD(), 0, 1.04, 0));
      g.add(cyl(0.2, 0.2, 0.26, mat(0xd8c8a8), 0, 0.12, 0, 16), cyl(0.04, 0.04, 0.6, STEEL(), 0, 0.48, 0, 8), cyl(0.16, 0.16, 0.04, STEEL(), 0, 0.42, 0, 12));
      const bar = box(0.5, 0.04, 0.04, STEEL(), 0, 1.16, 0); g.add(bar);
      if (o.busy) g.add(ball(0.05, lit(0xfff0b0, 0.6), 0, 0.3, 0.22));
      if (o.ready) g.add(cyl(0.16, 0.16, 0.12, mat(0xf0d070), 0.52, 0, 0.1, 16));
      break;
    }
    case 'spinning_wheel': {                                // a treadle wheel; a skein of yarn on the stool when ready
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 24), WOOD()); wheel.position.set(0, 0.62, 0); wheel.castShadow = true; g.add(wheel);
      for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.62, 0.02), DARKWOOD()); sp.position.set(0, 0.62, 0); sp.rotation.z = i * Math.PI / 6; g.add(sp); }
      g.add(box(0.7, 0.06, 0.24, DARKWOOD(), 0, 0.1, 0), box(0.05, 0.62, 0.05, DARKWOOD(), 0, 0.16, -0.08), box(0.05, 0.5, 0.05, DARKWOOD(), 0.28, 0.16, 0.06), cyl(0.05, 0.05, 0.12, mat(0xe8dcc8), 0.28, 0.66, 0.06, 8));
      for (const x of [-0.3, 0.3]) g.add(box(0.05, 0.1, 0.4, DARKWOOD(), x, 0, 0));
      if (o.busy) g.add(ball(0.1, mat(0xf6f2ea, { roughness: 1 }), -0.3, 0.32, 0.12));
      if (o.ready) g.add(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.04, 6, 14), mat(0xd96a8a)).translateY(0.24).translateX(-0.32));
      break;
    }
    case 'beehive': {                                       // a white stacked hive on legs with a sloped lid; bees and a honey jar when ready
      g.add(box(0.12, 0.3, 0.12, DARKWOOD(), -0.24, 0, -0.2), box(0.12, 0.3, 0.12, DARKWOOD(), 0.24, 0, -0.2), box(0.12, 0.3, 0.12, DARKWOOD(), -0.24, 0, 0.2), box(0.12, 0.3, 0.12, DARKWOOD(), 0.24, 0, 0.2));
      for (let k = 0; k < 3; k++) g.add(box(0.62, 0.22, 0.52, mat(k % 2 ? 0xf6f2e6 : 0xeee8d8), 0, 0.3 + k * 0.22, 0));
      g.add(prism(0.7, 0.6, 0.16, mat(0x8a5a3a), 0, 0.96, 0), box(0.2, 0.04, 0.02, mat(0x2a2018), 0, 0.33, 0.27));
      for (let i = 0; i < 4; i++) g.add(ball(0.025, mat(0xf0b32a), Math.sin(i * 1.7) * 0.4, 0.8 + (i % 2) * 0.25, 0.3 + Math.cos(i * 1.7) * 0.2));
      if (o.ready) g.add(cyl(0.08, 0.08, 0.16, mat(0xf0a82a, { transparent: true, opacity: 0.9, roughness: 0.2 }), 0.42, 0, 0.32, 12), cyl(0.085, 0.085, 0.04, mat(0xe8dcc8), 0.42, 0.16, 0.32, 12));
      break;
    }
    case 'oven': g.add(box(w - 0.1, 1.2, 0.9, mat(0xb85a3a), cx, 0, 0), box(w - 0.4, 0.5, 0.05, mat(0x2a1a14), cx, 0.35, 0.44), box(w - 0.5, 0.35, 0.03, lit(0xff8a3a, 0.8), cx, 0.42, 0.45), cyl(0.12, 0.14, 0.8, mat(0x8a8a8a), cx, 1.2, -0.2, 10)); break;
    case 'bread_shelf': { g.add(box(w - 0.1, 1.8, 0.5, WOOD(), cx, 0, -0.15)); for (let k = 0; k < 3; k++) for (let i = 0; i < w * 3; i++) g.add(ball(0.11, mat([0xd9a05a, 0xc98a3a, 0xe8c080][(i + k) % 3]), cx - w / 2 + 0.25 + i * 0.32, 0.45 + k * 0.5, 0.05, 1.3, 0.75, 1)); break; }
    case 'flour_sacks': for (const [x, z, s] of [[0, 0, 1], [0.22, 0.15, 0.85], [-0.18, 0.2, 0.8]]) g.add(ball(0.26 * s, mat(0xf0e8d6, { roughness: 1 }), x, 0.24 * s, z, 1, 1.25, 0.9)); break;
    case 'dress_form': g.add(cyl(0.18, 0.05, 0.08, DARKWOOD(), 0, 0, 0), cyl(0.025, 0.025, 0.7, DARKWOOD(), 0, 0.08, 0, 6), ball(0.2, mat(0x2f6f73), 0, 1.08, 0, 1, 1.5, 0.75), cyl(0.18, 0.32, 0.5, mat(0xd96a8a), 0, 0.62, 0, 14), ball(0.06, DARKWOOD(), 0, 1.42, 0)); break;
    case 'bolt_shelf': { g.add(box(w - 0.1, 1.9, 0.5, WOOD(), cx, 0, -0.15)); const cols = [0xd96a8a, 0x2f6f73, 0xf0d070, 0x6a5a9a, 0x9bb07a, 0xe8e0d0, 0xc75d3a]; for (let k = 0; k < 3; k++) for (let i = 0; i < w * 2; i++) { const b = cyl(0.12, 0.12, 0.42, mat(cols[(i * 3 + k) % cols.length]), cx - w / 2 + 0.3 + i * 0.45, 0.35 + k * 0.55, 0.06, 12); b.rotation.x = Math.PI / 2; b.position.y = 0.45 + k * 0.55; g.add(b); } break; }
    case 'sewing_table': g.add(box(w - 0.1, 0.08, 0.8, WOOD(), cx, 0.72, 0), box(0.08, 0.72, 0.08, DARKWOOD(), cx - w / 2 + 0.15, 0, -0.3), box(0.08, 0.72, 0.08, DARKWOOD(), cx + w / 2 - 0.15, 0, 0.3), box(0.5, 0.3, 0.25, mat(0x2a2d36), cx - 0.3, 0.8, 0), box(0.6, 0.02, 0.5, mat(0xd96a8a), cx + 0.4, 0.8, 0)); break;
    case 'flower_bed': { g.add(box(w - 0.1, 0.35, 0.8, WOOD(), cx, 0, 0), box(w - 0.2, 0.04, 0.7, mat(0x4a3324), cx, 0.35, 0)); const cols = [0xe8475e, 0xf4c430, 0xf29ac8, 0xffffff, 0xb9a3d9]; for (let i = 0; i < w * 4; i++) { const x = cx - w / 2 + 0.2 + (i % (w * 2)) * 0.45, z = i < w * 2 ? -0.18 : 0.18; g.add(cyl(0.01, 0.01, 0.25, mat(0x4f8a34), x, 0.38, z, 4), ball(0.07, mat(cols[i % cols.length]), x, 0.66, z)); } break; }
    case 'seed_drawers': { g.add(box(w - 0.1, 1.7, 0.5, mat(0x8a6a45), cx, 0, -0.15)); for (let k = 0; k < 5; k++) for (let i = 0; i < w * 3; i++) g.add(box(0.26, 0.24, 0.02, mat(0xc9a877), cx - w / 2 + 0.22 + i * 0.3, 0.12 + k * 0.31, 0.11), ball(0.02, mat(0xc9a14a, { metalness: 0.6 }), cx - w / 2 + 0.22 + i * 0.3, 0.26 + k * 0.31, 0.13)); break; }
    case 'tool_wall': { g.add(box(w - 0.1, 2.0, 0.1, mat(0x5a6a72), cx, 0, -0.4)); for (let i = 0; i < 6; i++) g.add(box(0.06, 0.5, 0.04, STEEL(), cx - w / 2 + 0.3 + i * 0.28, 0.9 + (i % 2) * 0.4, -0.33)); g.add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 14), mat(0xe2553a)).translateY(1.6).translateX(cx + 0.5).translateZ(-0.33)); break; }
    case 'engine_block': g.add(box(w - 0.4, 0.2, 0.9, mat(0x33393f), cx, 0, 0), box(1.0, 0.6, 0.6, mat(0x6a7a82, { metalness: 0.5 }), cx, 0.2, 0), cyl(0.12, 0.12, 0.3, mat(0xe2553a), cx - 0.3, 0.8, 0, 10), cyl(0.12, 0.12, 0.3, mat(0xe2553a), cx + 0.3, 0.8, 0, 10), box(0.3, 0.04, 0.3, mat(0xc9a14a), cx + 0.9, 0.2, 0.2)); break;
    case 'radio_desk': { g.add(box(w - 0.1, 0.9, 0.8, mat(0x3a3440), cx, 0, 0), box(w - 0.3, 0.12, 0.5, mat(0x24202a), cx, 0.9, -0.05)); for (let i = 0; i < 8; i++) g.add(box(0.05, 0.08, 0.05, lit([0xff6a8a, 0x7dffb0, 0xffd860][i % 3], 0.8), cx - w / 2 + 0.4 + i * 0.4, 1.02, 0.05)); g.add(box(0.5, 0.35, 0.05, lit(0x8ad8ff, 0.5), cx - 0.6, 1.02, -0.25), box(0.3, 0.14, 0.05, lit(0xff3a3a, 1), cx + 0.6, 1.3, -0.3)); break; }
    case 'record_shelf': { g.add(box(w - 0.1, 1.8, d > 1 ? d - 0.1 : 0.5, DARKWOOD(), cx, 0, cz)); const cols = [0xe05c8a, 0xf0d070, 0x5a8ad8, 0x222222, 0x9bb07a, 0xd96a3a]; for (let k = 0; k < 4; k++) for (let i = 0; i < 10; i++) g.add(box(0.03, 0.32, 0.3, mat(cols[(i + k * 2) % cols.length]), cx - (w - 0.4) / 2 + i * (w - 0.4) / 9, 0.1 + k * 0.42, cz + 0.05)); break; }
    case 'speaker': g.add(box(0.5, 1.1, 0.4, mat(0x24202a), 0, 0, 0), cyl(0.15, 0.15, 0.03, mat(0x55505a), 0, 0.68, 0.2, 14).rotateX(Math.PI / 2), cyl(0.08, 0.08, 0.03, mat(0x55505a), 0, 0.3, 0.2, 12).rotateX(Math.PI / 2)); g.children[1].position.set(0, 0.75, 0.21); g.children[2].position.set(0, 0.35, 0.21); break;
    case 'sofa': g.add(box(w - 0.1, 0.4, 0.8, mat(0x8a4a6a), cx, 0, 0), box(w - 0.1, 0.5, 0.2, mat(0x7a3a5a), cx, 0.4, -0.3), box(0.2, 0.3, 0.8, mat(0x7a3a5a), cx - w / 2 + 0.15, 0.4, 0), box(0.2, 0.3, 0.8, mat(0x7a3a5a), cx + w / 2 - 0.15, 0.4, 0), ball(0.14, mat(0xf0d070), cx - 0.4, 0.55, -0.1, 1, 0.7, 1)); break;
    case 'mic_stand': g.add(cyl(0.15, 0.17, 0.03, mat(0x2a2a2a), 0, 0, 0), cyl(0.015, 0.015, 1.4, mat(0x3a3a3a), 0, 0.03, 0, 6), ball(0.06, mat(0x55505a, { metalness: 0.6 }), 0, 1.47, 0.03, 1, 1.4, 1)); break;
    case 'radio_mast': {                                    // a lattice mast with a dish and a blinking red light
      const m = mat(0xd8dde2, { metalness: 0.4 }), red = lit(0xff3a3a, 1.5);
      for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [0, 0.35]]) { const leg = cyl(0.04, 0.03, 8.5, m, cx + x * (1 - 0.0), 0, cz + z, 6); g.add(leg); }
      for (let k = 1; k < 9; k++) g.add(box(0.75, 0.04, 0.04, m, cx, k, cz - 0.35), box(0.04, 0.04, 0.75, m, cx + 0.18, k + 0.5, cz));
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, 1.1), mat(0xf2f0ea, { side: THREE.DoubleSide })); dish.position.set(cx, 6, cz + 0.4); dish.rotation.x = Math.PI / 2 + 0.4; g.add(dish);
      const top = ball(0.12, red, cx, 8.7, cz); top.userData.blink = true; g.add(top, box(1.4, 0.2, 1.4, mat(0x6f7c86), cx, 0, cz));
      break;
    }
    default: return null;
  }
  return g;
}

// The built stand-ins for Market Lane's buildings, the fold and the duck house. g is centred on the footprint; flags say
// whether the fold and the duck house have been mended yet.
export function laneBuilding(b, g, def, flags = {}) {
  const W = b.w, D = b.d, H = b.height || 3.2, front = D / 2;
  const wallM = (name, fallback) => tex(name) || mat(fallback);
  const door = (x, c = 0x5a3a26) => g.add(box(0.95, 1.7, 0.08, mat(c), x, 0, front + 0.01), ball(0.04, mat(0xc9a14a, { metalness: 0.6 }), x + 0.3, 0.85, front + 0.07));
  const win = (x, y, w = 0.8, h = 0.7) => g.add(box(w + 0.12, h + 0.12, 0.06, mat(0xf3ead6), x, y - 0.06, front), box(w, h, 0.07, mat(0x9fd0e0, { emissive: 0x5a4a20, emissiveIntensity: 0.25, roughness: 0.2 }), x, y, front + 0.01));
  const awning = (c1, c2, y = 1.85) => { for (let i = 0; i < Math.round(W / 0.5); i++) { const s = box(0.5, 0.05, 0.8, mat(i % 2 ? c1 : c2), -W / 2 + 0.25 + i * 0.5, y, front + 0.35); s.rotation.x = 0.35; g.add(s); } };
  const sign = (c, txt) => { g.add(box(1.5, 0.5, 0.08, mat(c), 0, H * 0.62 + 0.15, front + 0.05)); if (txt) g.add(txt); };
  const gableRoof = (m, h = H * 0.38) => g.add(prism(W + 0.5, D + 0.5, h, m, 0, H * 0.62, 0));
  switch (def.lane) {
    case 'bakery': {
      g.add(box(W - 0.1, H * 0.62, D - 0.1, wallM('plaster_wall', 0xf3ead6))); gableRoof(tex('roof_red') || mat(0xb8503a));
      g.add(cyl(0.25, 0.3, 1.3, mat(0xa04a32), W / 2 - 1, H * 0.62 + 0.4, -D / 4, 10), cyl(0.32, 0.32, 0.1, mat(0x6a3a2a), W / 2 - 1, H * 0.62 + 1.7, -D / 4));
      door(0, 0x8a3a2a); win(-W / 4 - 0.4, 1.1, 1.4, 0.9); win(W / 4 + 0.4, 1.1, 1.4, 0.9); awning(0xd9534f, 0xf6efe0);
      sign(0xf0c060); g.add(ball(0.22, mat(0xc98a3a), 0, H * 0.62 + 0.4, front + 0.12, 1.5, 0.8, 0.5));   // a loaf on the signboard
      break;
    }
    case 'tailor': {
      g.add(box(W - 0.1, H * 0.62, D - 0.1, mat(0x8fc4c0))); gableRoof(tex('roof_shingle') || mat(0x5a4a5e));
      door(0, 0x2f4f5a); win(-W / 4 - 0.4, 1.1, 1.3, 1.0); win(W / 4 + 0.4, 1.1, 1.3, 1.0); awning(0x2f6f73, 0xf0e6d6);
      sign(0xf6efe0); const spool = cyl(0.14, 0.14, 0.3, mat(0xd96a8a), 0, H * 0.62 + 0.4, front + 0.15, 12); spool.rotation.z = Math.PI / 2; spool.position.y = H * 0.62 + 0.4; g.add(spool);
      for (const x of [-W / 4 - 0.4, W / 4 + 0.4]) g.add(cyl(0.16, 0.22, 0.6, mat(0xd96a8a), x, 0.8, front - 0.25, 10), ball(0.14, mat(0x2f6f73), x, 1.5, front - 0.25, 1, 1.3, 0.8));
      break;
    }
    case 'seedhouse': {                                     // a glasshouse shop: a plank base, a green frame, glass walls and roof
      const glass = new THREE.MeshStandardMaterial({ color: 0xd8f0e8, transparent: true, opacity: 0.4, roughness: 0.1 }), frame = mat(0x4f8a5a);
      g.add(box(W - 0.1, 0.8, D - 0.1, wallM('plank_wall', 0x9a7048)));
      const gl = box(W - 0.2, H * 0.62 - 0.8, D - 0.2, glass, 0, 0.8, 0); gl.castShadow = false; g.add(gl);
      const roof = prism(W + 0.2, D + 0.2, H * 0.4, glass, 0, H * 0.62, 0); roof.castShadow = false; g.add(roof);
      for (let i = 0; i <= Math.round(W); i++) g.add(box(0.07, H * 0.62, 0.07, frame, -W / 2 + i * W / Math.round(W), 0, front), box(0.07, H * 0.62, 0.07, frame, -W / 2 + i * W / Math.round(W), 0, -front));
      g.add(box(W + 0.2, 0.08, 0.1, frame, 0, H * 0.62, front), box(W + 0.2, 0.08, 0.1, frame, 0, H * 0.62, -front), box(W + 0.3, 0.08, 0.08, frame, 0, H * 1.02, 0));
      for (let i = 0; i < 10; i++) g.add(ball(0.22, mat([0x6fbf5a, 0x4f9a3a, 0x8acf6a][i % 3]), -W / 2 + 0.6 + (i % 5) * (W - 1.2) / 4, 1.1 + Math.floor(i / 5) * 0.5, (i < 5 ? -1 : 1) * (D / 4)));
      door(0, 0x4f8a5a); sign(0xf6efe0); g.add(ball(0.12, mat(0xe8475e), -0.3, H * 0.62 + 0.4, front + 0.12), ball(0.12, mat(0xf4c430), 0, H * 0.62 + 0.45, front + 0.12), ball(0.12, mat(0xf29ac8), 0.3, H * 0.62 + 0.4, front + 0.12));
      for (const x of [-W / 2 + 0.8, W / 2 - 0.8]) { g.add(box(1.2, 0.3, 0.3, WOOD(), x, 0.5, front + 0.25)); for (let k = 0; k < 4; k++) g.add(ball(0.08, mat([0xe8475e, 0xffffff, 0xf4c430, 0xb9a3d9][k]), x - 0.45 + k * 0.3, 0.9, front + 0.25)); }
      break;
    }
    case 'garage': {
      g.add(box(W - 0.1, H * 0.7, D - 0.1, wallM('metal_hull', 0x7b8790)), box(W + 0.2, 0.2, D + 0.2, mat(0x5a6a72), 0, H * 0.7));
      const roll = box(2.6, 2.0, 0.08, mat(0xd8dde2, { metalness: 0.3 }), -0.6, 0, front + 0.01); g.add(roll);
      for (let k = 0; k < 6; k++) g.add(box(2.6, 0.03, 0.09, mat(0x9aa6ae), -0.6, 0.3 + k * 0.3, front + 0.02));
      for (let k = 0; k < 6; k++) g.add(box(0.3, 0.12, 0.09, mat(k % 2 ? 0x222222 : 0xf0c030), -1.75 + k * 0.45, 2.0, front + 0.03));
      door(1.9, 0x2e8f8a); win(1.9, 2.15, 0.8, 0.4);
      const wr = box(1.1, 0.16, 0.08, mat(0xe2553a), 0, H * 0.7 - 0.5, front + 0.06); wr.rotation.z = 0.5; g.add(wr, ball(0.14, mat(0xe2553a), -0.42, H * 0.7 - 0.8, front + 0.06, 1, 1, 0.4));
      g.add(box(0.6, 0.5, 0.5, mat(0x3a4048), W / 2 - 0.5, 0, front + 0.6), cyl(0.25, 0.25, 0.1, mat(0x222222), -W / 2 + 0.6, 0, front + 0.6, 14));
      break;
    }
    case 'radio': {
      g.add(box(W - 0.1, H * 0.72, D - 0.1, wallM('hull_plate', 0xe9eef0)), box(W + 0.2, 0.2, D + 0.2, mat(0x2b2533), 0, H * 0.72));
      door(-1.4, 0x2b2533); win(0.8, 1.3, 2.4, 0.9);
      g.add(box(2.4, 0.4, 0.1, mat(0x2b2533), 0.8, H * 0.72 - 0.6, front + 0.04), box(0.5, 0.22, 0.12, lit(0xff3a5a, 1.2), 1.6, H * 0.72 - 0.5, front + 0.06));   // ON AIR
      for (let i = 0; i < 5; i++) g.add(box(0.22, 0.1 + (i % 3) * 0.08, 0.11, lit([0xe05c8a, 0xf0d070, 0x7dffb0][i % 3], 0.6), -0.1 + i * 0.3, H * 0.72 - 0.58, front + 0.06));
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, 1.1), mat(0xf2f0ea, { side: THREE.DoubleSide })); dish.position.set(-W / 4, H * 0.72 + 0.7, 0); dish.rotation.x = -0.9; g.add(dish, cyl(0.05, 0.05, 0.6, mat(0xd8dde2), -W / 4, H * 0.72, 0, 6));
      break;
    }
    case 'fold': {                                          // a low stone fold; roofless and broken until Ruess mends it
      const stone = mat(0xa8a296), ok = !!flags.fold;
      g.add(box(W - 0.1, ok ? H * 0.6 : H * 0.4, D - 0.1, stone));
      for (let i = 0; i < 14; i++) g.add(ball(0.16, mat(0x928c80), -W / 2 + 0.3 + (i * 0.73) % (W - 0.6), 0.3 + (i % 3) * 0.4, front + 0.01, 1.4, 0.8, 0.4));
      if (ok) { gableRoof(tex('roof_shingle') || mat(0x6a5a48), H * 0.4); door(0, 0x7a5a36); g.add(box(1.4, 0.9, 0.06, WOOD(), 1.6, 0, front + 0.3)); }
      else { for (const x of [-1, 0.4, 1.6]) { const beam = box(0.16, 0.16, D + 0.6, DARKWOOD(), x, H * 0.4, 0); beam.rotation.x = x * 0.12; beam.rotation.z = 0.2 - x * 0.1; g.add(beam); } g.add(box(1.0, 1.4, 0.06, DARKWOOD(), 0.2, 0, front + 0.3).rotateZ(0.5)); }
      break;
    }
    case 'duckhouse': {                                     // a little blue house on stilts with a ramp; a heap of planks until mended
      const ok = !!flags.duckhouse;
      if (ok) {
        for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) g.add(box(0.12, 0.4, 0.12, DARKWOOD(), x, 0, z));
        g.add(box(W - 0.6, H * 0.5, D - 0.6, mat(0x7ab0d8), 0, 0.4, 0), prism(W - 0.2, D - 0.2, H * 0.3, tex('roof_red') || mat(0xc75d3a), 0, 0.4 + H * 0.5, 0));
        g.add(box(0.6, 0.6, 0.06, mat(0x2a2a3a), 0, 0.45, front - 0.29), box(0.6, 0.05, 1.2, WOOD(), 0, 0.18, front + 0.2).rotateX(0.35));
      } else for (let i = 0; i < 7; i++) { const pl = box(1.8, 0.08, 0.25, WOOD(), Math.sin(i) * 0.4, i * 0.09, Math.cos(i * 1.3) * 0.5); pl.rotation.y = i * 0.7; g.add(pl); }
      break;
    }
    default: return false;
  }
  return true;
}
