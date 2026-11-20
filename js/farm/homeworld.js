// Sato's Harvest: built stand-ins for the villagers' homes (docs/FARM.md §15). Each kind is used until a model arrives under the
// same name in art/farm/models (HOME_PROPS names the slots); `tint` is the owner's colour. world.js asks here after laneworld.
import * as THREE from 'three';

const M = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!M.has(k)) M.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.05, ...o })); return M.get(k); };
const lit = (c, i = 1) => mat(c, { emissive: c, emissiveIntensity: i, roughness: 0.4 });
function box(w, h, d, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function cyl(r0, r1, h, m, x = 0, y = 0, z = 0, seg = 12) { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function ball(r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; return o; }
const WOOD = () => mat(0x9a7048), DARK = () => mat(0x5c4630), CREAM = () => mat(0xf3ead6), STEEL = () => mat(0x7b8790, { metalness: 0.45, roughness: 0.5 });
const tint = (o, d = 0xc9a06a) => mat(o.tint ? new THREE.Color(o.tint).getHex() : d);
const pale = (o) => { const c = new THREE.Color(o.tint || '#c9a06a'); c.lerp(new THREE.Color(0xffffff), 0.55); return mat(c.getHex()); };

export const HOME_PROPS = {
  quilt_bed: { model: 'quilt_bed', h: 0.9, fit: 'stretch' }, bunk: { model: 'bunk', h: 1.7, fit: 'stretch' }, armchair: { model: 'armchair', h: 1.0, fit: 'foot' },
  tea_table: { model: 'tea_table', h: 0.8, fit: 'foot' }, bookstack: { model: 'bookstack', h: 0.7, fit: 'foot' }, wall_frames: { model: 'wall_frames', h: 0.8, fit: 'stretch' },
  piano: { model: 'piano', h: 1.3, fit: 'stretch' }, fish_tank: { model: 'fish_tank', h: 1.2, fit: 'stretch' }, home_door: { h: 2.1 },
  mailbox: { model: 'mailbox', h: 1.2, fit: 'foot' }, hours_sign: { model: 'hours_sign', h: 1.3, fit: 'foot' },
};

// o: the prop's options (w, d, tint, sheet). Returns null for kinds it does not know.
export function homeProp(kind, o = {}) {
  const g = new THREE.Group(), w = o.w || 1, d = o.d || 1, cx = (w - 1) / 2, cz = (d - 1) / 2;
  switch (kind) {
    case 'quilt_bed': {                                   // a wooden bed with a patchwork quilt in the owner's colour and a pillow
      g.add(box(0.95, 0.32, d - 0.1, WOOD(), cx, 0, cz), box(0.95, 0.75, 0.08, DARK(), cx, 0, -0.46), box(0.88, 0.12, d - 0.25, CREAM(), cx, 0.32, cz + 0.05));
      for (let i = 0; i < 4; i++) g.add(box(0.44, 0.06, (d - 0.7) / 2, i % 3 ? tint(o) : pale(o), cx - 0.22 + (i % 2) * 0.44, 0.44, cz + 0.25 + (i < 2 ? -1 : 1) * (d - 0.7) / 4));
      g.add(box(0.6, 0.12, 0.3, mat(0xffffff), cx, 0.44, -0.22));
      break;
    }
    case 'bunk': {                                        // a narrow bunk bed of scaffold tube, two blankets
      for (const [x, z] of [[-0.42, -0.45], [0.42, -0.45], [-0.42, d - 0.55], [0.42, d - 0.55]]) g.add(cyl(0.035, 0.035, 1.7, STEEL(), cx + x, 0, z, 6));
      for (const y of [0.3, 1.15]) g.add(box(0.86, 0.08, d - 0.1, STEEL(), cx, y, cz), box(0.8, 0.12, d - 0.2, tint(o), cx, y + 0.08, cz + 0.05), box(0.5, 0.1, 0.25, CREAM(), cx, y + 0.18, -0.3));
      g.add(box(0.05, 0.8, 0.05, STEEL(), cx + 0.44, 0.3, cz + 0.4));
      break;
    }
    case 'armchair': {                                    // a fat, comfortable armchair
      const c = tint(o);
      g.add(box(0.8, 0.4, 0.75, c, 0, 0.08), box(0.8, 0.6, 0.18, c, 0, 0.35, -0.3), box(0.16, 0.35, 0.7, c, -0.36, 0.4), box(0.16, 0.35, 0.7, c, 0.36, 0.4), box(0.6, 0.1, 0.55, pale(o), 0, 0.48, 0.05));
      for (const [x, z] of [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]]) g.add(cyl(0.04, 0.03, 0.1, DARK(), x, 0, z, 6));
      break;
    }
    case 'tea_table': {                                   // a small round table with a cloth, a teapot and two cups
      g.add(cyl(0.38, 0.38, 0.05, WOOD(), 0, 0.62, 0, 16), cyl(0.05, 0.12, 0.62, DARK()), cyl(0.4, 0.42, 0.02, tint(o), 0, 0.67, 0, 16));
      g.add(ball(0.11, CREAM(), 0.05, 0.78, 0, 1, 0.85, 1), cyl(0.02, 0.02, 0.1, CREAM(), 0.17, 0.75, 0, 5), cyl(0.045, 0.04, 0.07, CREAM(), -0.2, 0.69, 0.14, 8), cyl(0.045, 0.04, 0.07, CREAM(), -0.14, 0.69, -0.18, 8));
      break;
    }
    case 'bookstack': {                                   // books in tottering piles
      const cols = [0x8e3a3a, 0x3f5f8a, 0xc9a14a, 0x4f8a3a, 0x6b4a7a, 0xd8cdb0]; let y = 0;
      for (let i = 0; i < 6; i++) { const b = box(0.42 - (i % 3) * 0.04, 0.1, 0.3, mat(cols[i]), -0.12 + ((i * 7) % 3) * 0.02, y, -0.05); b.rotation.y = (i % 2 ? 0.2 : -0.15); g.add(b); y += 0.1; }
      y = 0; for (let i = 0; i < 4; i++) { g.add(box(0.3, 0.09, 0.26, mat(cols[(i + 3) % 6]), 0.22, y, 0.2)); y += 0.09; }
      break;
    }
    case 'wall_frames': {                                 // photographs and pictures hung high on the back wall
      for (let i = 0; i < w; i++) {
        const fw2 = 0.42 + (i % 2) * 0.16, fh = 0.36 + ((i + 1) % 2) * 0.14, y = 1.55 + (i % 2) * 0.22;
        g.add(box(fw2, fh, 0.04, i % 2 ? DARK() : tint(o), i, y, -0.47), box(fw2 - 0.08, fh - 0.08, 0.02, mat([0xe8dcc0, 0xbfd4dc, 0xd8c0a8][i % 3]), i, y + 0.04, -0.44));
      }
      break;
    }
    case 'piano': {                                       // an upright piano; a dust sheet thrown half over it
      const black = mat(0x22201e, { roughness: 0.35 });
      g.add(box(w - 0.1, 1.15, 0.55, black, cx, 0, -0.18), box(w - 0.2, 0.08, 0.3, black, cx, 0.72, 0.18), box(w - 0.3, 0.03, 0.22, mat(0xf4f2ea), cx, 0.8, 0.2));
      for (let i = 0; i < (w - 0.3) * 10; i++) g.add(box(0.03, 0.035, 0.12, black, cx - (w - 0.3) / 2 + 0.05 + i * 0.1, 0.82, 0.16));
      g.add(box(0.5, 0.45, 0.35, black, cx, 0, 0.55));          // the stool
      if (o.sheet) { const sh = box(w * 0.62, 0.05, 0.75, mat(0xeee8dc), cx - w * 0.2, 1.15, -0.15); sh.rotation.z = 0.04; g.add(sh, box(0.05, 0.9, 0.7, mat(0xeee8dc), cx - w / 2 + 0.03, 0.3, -0.15)); }
      break;
    }
    case 'fish_tank': {                                   // a glowing tank of little fish on a cabinet
      g.add(box(w - 0.1, 0.55, 0.5, DARK(), cx, 0, -0.1), box(w - 0.15, 0.55, 0.45, new THREE.MeshStandardMaterial({ color: 0x7ad8e8, transparent: true, opacity: 0.45, emissive: 0x2a8a9a, emissiveIntensity: 0.6 }), cx, 0.55, -0.1));
      for (let i = 0; i < 6; i++) g.add(ball(0.035, lit(i % 2 ? 0x9fffd8 : 0xffd27a, 1.2), cx - (w - 0.4) / 2 + ((i * 0.37) % 1) * (w - 0.4), 0.7 + (i % 3) * 0.12, -0.1 + ((i * 0.61) % 1 - 0.5) * 0.25, 1.6, 1, 1));
      g.add(box(w - 0.1, 0.05, 0.5, STEEL(), cx, 1.1, -0.1));
      break;
    }
    case 'home_door': {                                   // a front door on the face of its tile: a painted panel, a lamp and a mat
      const c = tint(o, 0x6a8a5a);
      g.add(box(0.9, 2.0, 0.08, DARK(), 0, 0, -0.5), box(0.74, 1.86, 0.06, c, 0, 0.02, -0.46), ball(0.04, mat(0xc9a14a, { metalness: 0.7, roughness: 0.3 }), 0.24, 0.95, -0.42));
      g.add(box(0.36, 0.26, 0.03, CREAM(), 0, 1.45, -0.42), ball(0.08, lit(0xffd9a0, 1.4), 0.55, 1.75, -0.42));
      const mt = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.45), mat(0x8a5a3a)); mt.rotation.x = -Math.PI / 2; mt.position.set(0, 0.02, -0.15); g.add(mt);
      break;
    }
    case 'mailbox': {                                     // a post with a round-topped box in the owner's colour and a little red flag
      const c = tint(o, 0x4f7a9a);
      g.add(cyl(0.05, 0.06, 0.85, DARK()), box(0.42, 0.26, 0.3, c, 0, 0.85), cyl(0.15, 0.15, 0.42, c, 0, 1.06, 0, 12), box(0.3, 0.04, 0.02, mat(0x222222), 0, 1.0, 0.16));
      g.children[g.children.length - 2].rotation.z = Math.PI / 2; g.children[g.children.length - 2].position.y = 1.1;
      const f = box(0.04, 0.22, 0.04, mat(0xd8402a), 0.23, 0.95); f.rotation.z = -0.3; g.add(f, box(0.12, 0.08, 0.02, mat(0xd8402a), 0.3, 1.13));
      g.add(box(0.36, 0.1, 0.02, CREAM(), 0, 0.68, 0.06));          // the name plate
      break;
    }
    case 'hours_sign': {                                  // a small standing board with a clock face: the opening hours
      g.add(box(0.06, 0.8, 0.06, DARK(), -0.3, 0), box(0.06, 0.8, 0.06, DARK(), 0.3, 0), box(0.74, 0.6, 0.06, WOOD(), 0, 0.62), box(0.64, 0.5, 0.02, CREAM(), 0, 0.67, 0.035));
      g.add(cyl(0.11, 0.11, 0.02, mat(0xffffff), -0.18, 0.88, 0.05, 16), box(0.01, 0.08, 0.01, mat(0x222222), -0.18, 0.93, 0.07), box(0.06, 0.01, 0.01, mat(0x222222), -0.16, 0.97, 0.07));
      g.children[g.children.length - 3].rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) g.add(box(0.26, 0.025, 0.01, mat(0x6a5a4a), 0.12, 0.75 + i * 0.08, 0.05));
      break;
    }
    default: return null;
  }
  return g;
}
