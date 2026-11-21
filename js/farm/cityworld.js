// Sato's Harvest: the Old World city ruins (2026-11-20). Art slots for the city's props and its creatures, and the
// procedural stand-ins drawn when the art pack has no model for a slot yet (world.js merges CITY_PROPS into its prop
// table and asks cityProp for anything it has no case for). Soft, toy-like shapes: the ruins are sad, not grim, and
// the creatures are pests with glowing eyes, not horrors. No readable text anywhere.
import * as THREE from 'three';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
const glow = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
function box(w, h, d, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function cyl(r0, r1, h, m, x = 0, y = 0, z = 0, seg = 12) { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function ball(r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; return o; }
const hashOf = (o) => (((o.seed || 0) * 2654435761) >>> 0) / 4294967296;

// kind → { model, h, fit, face, hover, turn } as in world.js PROPS. The towers stretch to their footprint (o.w × o.d,
// height o.hgt); the bus is a 1 × 3 footprint.
export const CITY_PROPS = {
  ruin_tower: { model: 'ruin_tower', h: 3.2, fit: 'box' },
  ruin_car: { model: 'ruin_car', h: 0.75, fit: 'foot' },
  ruin_bus: { model: 'ruin_bus', h: 1.3, fit: 'stretch' },
  ruin_rubble: { model: 'ruin_rubble', h: 0.8, maxW: 0.95 },
  ruin_debris: { h: 0.6 },
  ruin_billboard: { model: 'ruin_billboard', h: 2.2, fit: 'foot' },
  ruin_locker: { model: 'ruin_locker', h: 1.4, fit: 'foot' },
  ruin_vault: { model: 'ruin_vault', h: 1.7, fit: 'foot' },
  shop_counter: { model: 'shop_counter', h: 1.0, fit: 'foot' },
  toxic_pool: { model: 'toxic_pool', h: 0.15, maxW: 1, soft: true },   // flat (0.106 high per unit of width): one tile across
  rad_hound: { model: 'rad_hound', h: 0.7, turn: true },
  glow_slime: { model: 'glow_slime', h: 0.6, turn: true },
  rust_crawler: { model: 'rust_crawler', h: 0.6, turn: true },
  smog_wraith: { model: 'smog_wraith', h: 1.0, hover: 0.9, turn: true },   // the model's tail touches y = 0: lifted 0.45 here, and main.js bobs it
  spore_brute: { model: 'spore_brute', h: 1.6, turn: true },
  searched_mark: { h: 0.2 },
  spot_glint: { h: 0.4, hover: 0.5 },   // the sparkle over a treasure spot not yet searched (gold for safes and the vault)
  camp_spot: { h: 0.4 }, camp: { model: 'camp', h: 1.3, maxW: 2.2 }, pallas_jet: { model: 'pallas_jet', h: 1.0, maxW: 2.2 },   // the art pack's camp and jet when they land; else built here   // safe spots, a built camp, the Pallas's flight form (procedural)
};
export const CITY_MONSTER_KINDS = new Set(['rad_hound', 'glow_slime', 'rust_crawler', 'smog_wraith', 'spore_brute']);

let concreteTex = null, glintTex = null;
function concrete() {                                   // a soft grey-beige concrete with stains, made once
  if (concreteTex) return concreteTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#a8a29a'; g.fillRect(0, 0, 64, 64); let s = 7; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,112,104,.35)' : 'rgba(205,198,188,.35)'; g.fillRect(r() * 64, r() * 64, 1 + r() * 3, 1 + r() * 3); }
  g.fillStyle = 'rgba(90,110,80,.25)'; for (let i = 0; i < 4; i++) g.fillRect(r() * 64, 40 + r() * 24, 3 + r() * 6, 24);
  concreteTex = new THREE.CanvasTexture(c); concreteTex.colorSpace = THREE.SRGBColorSpace; concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping; return concreteTex;
}
const PASTEL = [0x9fd8c8, 0xf2b8a0, 0xa8c8ec, 0xe8d890, 0xd8a8c8, 0xb8d8a0];

export function cityProp(kind, o = {}) {
  const g = new THREE.Group(), f = hashOf(o);
  switch (kind) {
    case 'ruin_tower': {                                 // a collapsed tower: a broken concrete block, a window grid, a jagged top, ivy
      const w = o.w || 3, d = o.d || 3, H = o.hgt || 3, cx = (w - 1) / 2, cz = (d - 1) / 2, mat = std({ map: concrete(), color: [0xe8e2d8, 0xd8d0c8, 0xe0d4c4][Math.floor(f * 3)] });
      g.add(box(w - 0.08, H, d - 0.08, mat, cx, 0, cz));
      for (let i = 0; i < Math.min(6, w); i++) { const hh = 0.2 + (((i * 37 + (o.seed || 0)) % 7) / 7) * 1.1; g.add(box(w / Math.min(6, w) - 0.05, hh, d - 0.3, mat, (i + 0.5) * (w / Math.min(6, w)) - 0.5, H, cz + (i % 2 ? 0.1 : -0.1))); }
      const win = std({ color: 0x2c3440, roughness: 0.4 }), lit = std({ color: 0x3a4a3a });
      for (let y = 0.5; y < H - 0.3; y += 0.9) for (let x = 0.3; x < w - 0.3; x += 0.75) { g.add(box(0.36, 0.42, 0.04, (x * 3 + y) % 5 < 1 ? lit : win, x - 0.5, y, cz + d / 2 - 0.02)); if (x < w - 0.5) g.add(box(0.04, 0.42, 0.36, win, cx + w / 2 - 0.02, y, Math.min(d - 0.8, x) - 0.5 + 0.4)); }
      const ivy = std({ color: 0x5f9a48 }); for (let k = 0; k < 3; k++) g.add(box(0.18, H * (0.4 + 0.2 * k), 0.06, ivy, -0.5 + 0.1 + k * 0.4 * (w - 1) / 2, 0, cz + d / 2));
      g.add(box(0.06, 0.6, 0.06, std({ color: 0x8a5a3a, metalness: 0.4 }), cx + 0.3, H + 0.2, cz), box(0.06, 0.5, 0.06, std({ color: 0x8a5a3a, metalness: 0.4 }), cx - 0.4, H + 0.3, cz + 0.3));
      break;
    }
    case 'ruin_car': {                                   // a little rusted hatchback in a faded pastel
      const body = std({ color: PASTEL[Math.floor(f * PASTEL.length)] }), rust = std({ color: 0x9a5a3a }), tyre = std({ color: 0x2a2624 });
      const c = new THREE.Group(); c.add(box(0.92, 0.3, 0.5, body, 0, 0.12), box(0.5, 0.26, 0.46, std({ color: 0x46525e, roughness: 0.3 }), -0.05, 0.42), box(0.3, 0.04, 0.2, rust, 0.2, 0.42, 0.1));
      for (const [x, z] of [[-0.3, -0.24], [0.3, -0.24], [-0.3, 0.24], [0.3, 0.24]]) { const t = cyl(0.12, 0.12, 0.08, tyre, x, 0, z, 10); t.rotation.x = Math.PI / 2; t.position.y = 0.12; c.add(t); }
      c.rotation.y = f * 6.28; g.add(c); break;
    }
    case 'ruin_bus': {                                   // a rusted city bus along a 1 × 3 footprint
      const d = o.d || 3, cz = (d - 1) / 2, body = std({ color: f < 0.5 ? 0xe8c860 : 0x7ac0b8 }), dark = std({ color: 0x3a4652, roughness: 0.3 });
      g.add(box(0.9, 1.0, d - 0.15, body, 0, 0.12, cz), box(0.92, 0.32, d - 0.4, dark, 0, 0.62, cz), box(0.8, 0.05, d - 0.3, std({ color: 0x6f9a48 }), 0, 1.12, cz));
      for (const z of [0.2, d - 1.2]) for (const x of [-0.45, 0.45]) { const t = cyl(0.16, 0.16, 0.1, std({ color: 0x2a2624 }), x, 0, z, 10); t.rotation.z = Math.PI / 2; t.position.y = 0.16; g.add(t); }
      break;
    }
    case 'ruin_rubble': {                                // a pile worth searching: broken concrete, bricks, a girder, a glint
      const st = std({ map: concrete() }), brick = std({ color: 0xa8664c });
      g.add(ball(0.4, st, 0, 0.18, 0, 1, 0.6, 1), ball(0.28, st, 0.28, 0.15, 0.18, 1, 0.7, 1), ball(0.22, brick, -0.3, 0.12, -0.08), box(0.6, 0.06, 0.1, std({ color: 0x8a5a3a, metalness: 0.4 }), 0.05, 0.36, 0));
      const s = ball(0.05, glow(0xffe08a), 0.12, 0.45, 0.2); s.castShadow = false; s.userData.glint = true; g.add(s); break;
    }
    case 'ruin_debris': {                                // a heap of slabs nobody will sort through
      const st = std({ map: concrete(), color: 0xc8c0b4 });
      for (let i = 0; i < 3; i++) { const b = box(0.5 - i * 0.08, 0.22, 0.4, st, (i - 1) * 0.22, i * 0.12, ((i * 7) % 3 - 1) * 0.12); b.rotation.y = f * 3 + i; b.rotation.z = (i - 1) * 0.25; g.add(b); }
      break;
    }
    case 'ruin_billboard': {                             // a leaning billboard: two posts, blank panels in faded colour blocks
      const post = std({ color: 0x6a5a4a, metalness: 0.3 }); g.add(box(0.08, 1.6, 0.08, post, -0.35), box(0.08, 1.5, 0.08, post, 0.35));
      const p = new THREE.Group(); p.add(box(1.0, 0.6, 0.06, std({ color: 0xe8e0d0 })), box(0.42, 0.45, 0.07, std({ color: PASTEL[Math.floor(f * 6)] }), -0.22, 0.07), box(0.4, 0.2, 0.07, std({ color: PASTEL[(Math.floor(f * 6) + 2) % 6] }), 0.24, 0.33));
      p.position.y = 1.5; p.rotation.z = (f - 0.5) * 0.35; g.add(p); break;
    }
    case 'ruin_locker': {                                // a dented steel locker bank, one door ajar
      const m = std({ color: 0x6f8ca0, metalness: 0.35, roughness: 0.55 });
      for (let i = 0; i < 2; i++) g.add(box(0.36, 1.3, 0.4, m, (i - 0.5) * 0.38, 0, 0), box(0.2, 0.03, 0.01, std({ color: 0x2c3440 }), (i - 0.5) * 0.38, 1.05, 0.21));
      const door = box(0.34, 1.2, 0.03, m, 0, 0.04, 0); door.position.set(0.36, 0.64, 0.3); door.rotation.y = -0.9; g.add(door); break;
    }
    case 'ruin_vault': {                                 // the sealed vault: a round steel door in a concrete frame, a gold glow at its seam
      g.add(box(1.0, 1.6, 0.5, std({ map: concrete() }), 0, 0, -0.1));
      const door = cyl(0.55, 0.55, 0.14, std({ color: 0x9aa4ac, metalness: 0.6, roughness: 0.35 }), 0, 0, 0.18, 24); door.rotation.x = Math.PI / 2; door.position.set(0, 0.85, 0.2); g.add(door);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.03, 8, 32), glow(0xffd36a)); ring.position.set(0, 0.85, 0.26); g.add(ring);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), std({ color: 0x5a6670, metalness: 0.6 })); wheel.position.set(0, 0.85, 0.3); g.add(wheel); break;
    }
    case 'shop_counter': {                               // a ruined shop counter with a dusty till
      g.add(box(0.95, 0.85, 0.5, std({ color: 0x9a7a5a }), 0, 0, 0), box(1.0, 0.06, 0.58, std({ color: 0x6a5040 }), 0, 0.85, 0), box(0.3, 0.2, 0.25, std({ color: 0x5a6670, metalness: 0.4 }), 0.2, 0.91, 0));
      break;
    }
    case 'toxic_pool': {                                 // bubbles over a glowing lime puddle
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.46, 16), glow(0x9cff5a, { transparent: true, opacity: 0.55 })); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; g.add(disc);
      for (let i = 0; i < 3; i++) { const b = ball(0.05 + i * 0.02, glow(0xd8ff9a, { transparent: true, opacity: 0.8 }), Math.cos(i * 2.1 + f * 6) * 0.22, 0.06, Math.sin(i * 2.1 + f * 6) * 0.22); b.castShadow = false; b.userData.bubble = i; g.add(b); }
      break;
    }
    case 'searched_mark': { const r = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 16), glow(0x7dffb0, { transparent: true, opacity: 0.6, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.y = 0.05; g.add(r); break; }
    case 'spot_glint': {                                 // a soft bobbing sparkle with a halo, visible from a distance
      const c = o.gold ? 0xffd36a : 0xbff8ff, s = o.gold ? 1.35 : 1;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.11 * s, 0), glow(c)); star.position.y = 1.15; star.castShadow = false; star.userData.spin = true; g.add(star);
      if (!glintTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); glintTex = new THREE.CanvasTexture(cv); }
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, color: c, transparent: true, opacity: o.gold ? 0.95 : 0.8, depthWrite: false })); halo.scale.setScalar(0.75 * s); halo.position.y = 1.15; g.add(halo);
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, 0.9, 6, 1, true), glow(c, { transparent: true, opacity: 0.35, depthWrite: false })); ray.position.y = 0.6; g.add(ray);
      break;
    }
    case 'camp_spot': {                                  // a safe spot: a soft green ring on the ground and a little shield beacon
      const r = new THREE.Mesh(new THREE.RingGeometry(2.7, 2.9, 40), glow(0x7dffb0, { transparent: true, opacity: 0.45, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.y = 0.04; g.add(r);
      g.add(cyl(0.05, 0.06, 1.1, std({ color: 0x8a98a6, metalness: 0.4 }), 1.2, 0, -1.2, 8), ball(0.11, glow(0x7dffb0), 1.2, 1.18, -1.2));
      if (o.kind === 'bunker') g.add(box(1.4, 0.7, 0.9, std({ color: 0x7a8088, metalness: 0.3 }), -1.1, 0, -1.4), box(0.6, 0.5, 0.05, std({ color: 0x2c3440 }), -1.1, 0, -0.94));
      else if (o.kind === 'rooftop') g.add(box(1.6, 0.25, 1.2, std({ map: concrete() }), -1.1, 0, -1.3), box(0.4, 0.6, 0.4, std({ color: 0x9aa4ac, metalness: 0.4 }), -1.5, 0.25, -1.5));
      else g.add(cyl(0.45, 0.5, 0.35, std({ map: concrete() }), -1.2, 0, -1.2, 14), ball(0.3, std({ color: 0x6fae4c }), -1.2, 0.5, -1.2));
      break;
    }
    case 'camp': {                                       // a built camp: a little tent, a scrap windbreak, a campfire
      const tent = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.95, 4), std({ color: 0xf0a860 })); tent.rotation.y = Math.PI / 4; tent.position.set(-0.6, 0.47, -0.5); tent.castShadow = true; g.add(tent);
      g.add(box(0.3, 0.5, 0.04, std({ color: 0x5a3a24 }), -0.6, 0, -0.04), box(1.4, 0.45, 0.12, std({ color: 0x8a6a50, metalness: 0.3 }), 0.4, 0, -1.2));
      for (let i = 0; i < 6; i++) g.add(ball(0.08, std({ color: 0x8a8580 }), 0.6 + Math.cos(i) * 0.3, 0.05, 0.4 + Math.sin(i) * 0.3));
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 7), glow(0xffa040)), f2 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 7), glow(0xffe08a)); f1.position.set(0.6, 0.22, 0.4); f2.position.set(0.6, 0.2, 0.4); g.add(f1, f2);
      const pl = new THREE.PointLight(0xffa050, 6, 6, 1.6); pl.position.set(0.6, 0.6, 0.4); g.add(pl); g.userData.fire = [f1, f2];
      break;
    }
    case 'pallas_jet': {                                 // the Pallas folded into its flight form: a white and crimson jet, nose to -Z
      const white = std({ color: 0xf2f0ec, roughness: 0.5 }), red = std({ color: 0x9a1f3a, roughness: 0.5 }), dark = std({ color: 0x2c3440, roughness: 0.3 });
      const body = cyl(0.2, 0.28, 1.6, white, 0, 0, 0, 12); body.rotation.x = Math.PI / 2; body.position.set(0, 0.5, 0); g.add(body);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 12), red); nose.rotation.x = -Math.PI / 2; nose.position.set(0, 0.5, -1.05); g.add(nose);
      g.add(ball(0.16, dark, 0, 0.66, -0.35, 1, 0.7, 1.6));
      const wings = new THREE.Group(); wings.add(box(2.2, 0.05, 0.55, white, 0, 0.45, 0.1), box(0.5, 0.06, 0.3, red, -0.9, 0.46, 0.25), box(0.5, 0.06, 0.3, red, 0.9, 0.46, 0.25)); g.add(wings); g.userData.wings = wings;
      const fin = box(0.05, 0.45, 0.35, red, 0, 0.6, 0.6); g.add(fin, box(0.9, 0.04, 0.25, white, 0, 0.5, 0.7));
      const jet = ball(0.14, glow(0x8ff4ff), 0, 0.5, 0.85); jet.castShadow = false; g.add(jet);
      break;
    }
    // ---- the creatures: round, a little silly, glowing eyes
    case 'rad_hound': {
      const fur = std({ color: 0xb8a888 }), spot = glow(0xc8ff6a), eye = glow(0xeaff5a);
      g.add(ball(0.24, fur, 0, 0.36, 0, 1.3, 0.9, 1), ball(0.17, fur, 0, 0.5, 0.3), ball(0.05, spot, 0.12, 0.45, -0.1), ball(0.04, spot, -0.1, 0.42, 0.08));
      for (const x of [-0.08, 0.08]) { g.add(ball(0.035, eye, x, 0.55, 0.45)); const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), fur); ear.position.set(x * 1.4, 0.68, 0.28); g.add(ear); }
      for (const [x, z] of [[-0.12, -0.15], [0.12, -0.15], [-0.12, 0.15], [0.12, 0.15]]) g.add(cyl(0.04, 0.04, 0.24, fur, x, 0, z, 6));
      const tail = cyl(0.03, 0.02, 0.25, fur, 0, 0.35, -0.3, 6); tail.rotation.x = -0.8; g.add(tail); break;
    }
    case 'glow_slime': {
      const s = o.small ? 0.6 : 1, jelly = std({ color: 0x8cf0c0, transparent: true, opacity: 0.72, roughness: 0.25, emissive: 0x2a8a5a, emissiveIntensity: 0.5 });
      g.add(ball(0.32 * s, jelly, 0, 0.24 * s, 0, 1.1, 0.78, 1.1), ball(0.11 * s, glow(0xd8ffb0), 0, 0.22 * s, 0));
      for (const x of [-0.09, 0.09]) g.add(ball(0.035 * s, glow(0x1a2a24), x * s, 0.32 * s, 0.28 * s));
      break;
    }
    case 'rust_crawler': {
      const shell = std({ color: 0xb0643a, metalness: 0.3, roughness: 0.6 }), leg = std({ color: 0x5a3424 }), eye = glow(0xffb347);
      const sh = ball(0.32, shell, 0, 0.22, 0, 1.1, 0.6, 1.25); g.add(sh, box(0.04, 0.2, 0.7, std({ color: 0x7a3a24 }), 0, 0.3, 0), ball(0.14, leg, 0, 0.2, 0.36));
      for (const x of [-0.06, 0.06]) g.add(ball(0.035, eye, x, 0.26, 0.48));
      for (let i = 0; i < 6; i++) { const l = cyl(0.02, 0.02, 0.32, leg, 0, 0, 0, 4); l.rotation.z = (i < 3 ? 1 : -1) * 1.0; l.position.set(i < 3 ? 0.3 : -0.3, 0.12, (i % 3 - 1) * 0.22); g.add(l); }
      break;
    }
    case 'smog_wraith': {                                // a floating wisp of toxic smog with a soft face
      const smog = (c, op) => std({ color: c, transparent: true, opacity: op, roughness: 1, depthWrite: false });
      g.add(ball(0.34, smog(0x9a88b0, 0.7), 0, 0.95, 0), ball(0.24, smog(0x7a6a90, 0.55), 0.18, 0.75, -0.08), ball(0.2, smog(0xb0a0c8, 0.5), -0.16, 0.7, 0.05), ball(0.14, smog(0x8a7aa0, 0.4), 0.02, 0.5, -0.1));
      for (const x of [-0.1, 0.1]) g.add(ball(0.045, glow(0xd890ff), x, 1.0, 0.3));
      g.userData.wraith = true; break;
    }
    case 'spore_brute': {                                // the mini-boss: a chunky mossy mushroom golem
      const moss = std({ color: 0x6a8a4a }), cap = std({ color: 0xc8553d }), dot = glow(0xffe08a), eye = glow(0xc8ff6a);
      g.add(ball(0.5, moss, 0, 0.6, 0, 1, 1.05, 0.9), ball(0.2, moss, 0.55, 0.55, 0.05), ball(0.2, moss, -0.55, 0.55, 0.05), cyl(0.13, 0.15, 0.3, moss, 0.22, 0, 0, 8), cyl(0.13, 0.15, 0.3, moss, -0.22, 0, 0, 8));
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), cap); c.position.y = 1.05; c.castShadow = true; g.add(c);
      for (let i = 0; i < 7; i++) g.add(ball(0.06, dot, Math.cos(i * 0.9) * 0.42, 1.25 + (i % 2) * 0.15, Math.sin(i * 0.9) * 0.42));
      for (const x of [-0.15, 0.15]) g.add(ball(0.06, eye, x, 0.8, 0.43));
      break;
    }
    default: return null;
  }
  return g;
}

// ---------------------------------------------------------------- the Pallas folds into its flight form (2026-11-20)
// The Pallas model (pallas.glb) is one mesh, normalised to 1 tall (feet at y = 0, front +Z). For the transform it is
// cut by bounds into a body, two legs (below the hips, |x| < 0.19) and two arms with their weapons (|x| ≥ 0.19, below the
// shoulders), each on a pivot at its joint, and two wings are added at the back. pose(k) runs the fold from 0 (standing)
// to 1 (flight-ready): the legs fold up behind, the arms sweep back along the sides, the body tilts forward to level and
// the wings slide out. The procedural robot (no model) folds its own limb groups the same way. restore() puts it back.
const HIP = 0.36, SHOULDER = 0.6, ARM_X = 0.19;
function splitGeometry(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo, pos = g.attributes.position, parts = { body: [], legL: [], legR: [], armL: [], armR: [] };
  for (let t = 0; t < pos.count / 3; t++) {
    let cx = 0, cy = 0; for (let k = 0; k < 3; k++) { cx += pos.getX(t * 3 + k) / 3; cy += pos.getY(t * 3 + k) / 3; }
    const side = cx < 0 ? 'L' : 'R';
    parts[cy < SHOULDER && cy > 0.06 && Math.abs(cx) >= ARM_X ? 'arm' + side : cy < HIP && Math.abs(cx) < ARM_X ? 'leg' + side : 'body'].push(t);
  }
  const out = {};
  for (const [name, tris] of Object.entries(parts)) {
    const sub = new THREE.BufferGeometry();
    for (const [an, attr] of Object.entries(g.attributes)) { const n = attr.itemSize, arr = new Float32Array(tris.length * 3 * n); tris.forEach((t, i) => { for (let k = 0; k < 3 * n; k++) arr[i * 3 * n + k] = attr.array[t * 3 * n + k]; }); sub.setAttribute(an, new THREE.BufferAttribute(arr, n)); }
    out[name] = sub;
  }
  return out;
}
let SPLIT = null;
export function pallasFold(actor) {
  let mesh = null; actor.body && actor.body.traverse((q) => { if (q.isMesh && !mesh && q.geometry && q.geometry.attributes.position.count > 1000) mesh = q; });
  const limbs = actor.body && actor.body.userData.limbs;
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.5 }), tipMat = new THREE.MeshStandardMaterial({ color: 0x9a1f3a, roughness: 0.5 });
  const makeWings = (scale) => { const w = new THREE.Group(); for (const s of [-1, 1]) { const p = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.16), wingMat), tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.17), tipMat); m.position.x = s * 0.25; tip.position.x = s * 0.47; p.add(m, tip); p.userData.side = s; w.add(p); } w.scale.setScalar(scale); return w; };
  if (mesh) {                                            // the model: cut into parts on pivots
    if (!SPLIT) SPLIT = splitGeometry(mesh.geometry);
    const rig = new THREE.Group(); rig.position.copy(mesh.position); rig.quaternion.copy(mesh.quaternion); rig.scale.copy(mesh.scale);
    const tilt = new THREE.Group(); rig.add(tilt);
    const part = (name, px, py) => { const p = new THREE.Group(); p.position.set(px, py, 0); const m = new THREE.Mesh(SPLIT[name], mesh.material); m.position.set(-px, -py, 0); m.castShadow = true; p.add(m); tilt.add(p); return p; };
    tilt.add(new THREE.Mesh(SPLIT.body, mesh.material));
    const legL = part('legL', -0.1, HIP), legR = part('legR', 0.1, HIP), armL = part('armL', -ARM_X, SHOULDER), armR = part('armR', ARM_X, SHOULDER);
    const wings = makeWings(1); wings.position.set(0, 0.62, -0.2); tilt.add(wings);
    mesh.parent.add(rig); mesh.visible = false;
    return {
      pose(k, wk) {
        const e = (a) => Math.min(1, Math.max(0, a)), kl = e(k * 1.6), ka = e(k * 1.4 - 0.15), kb = e(k * 1.3 - 0.3);
        legL.rotation.x = legR.rotation.x = 1.7 * kl; legL.position.z = legR.position.z = -0.05 * kl;
        armL.rotation.x = armR.rotation.x = 1.25 * ka; armL.rotation.z = 0.25 * ka; armR.rotation.z = -0.25 * ka;
        tilt.rotation.x = 1.35 * kb; tilt.position.set(0, 0.22 * kb, 0.15 * kb);
        for (const p of wings.children) { p.scale.x = Math.max(0.02, e(wk)); p.rotation.z = p.userData.side * 0.15 * (1 - e(wk)); }
      },
      restore() { mesh.parent && mesh.parent.remove(rig); mesh.visible = true; },
    };
  }
  if (limbs) {                                           // the procedural robot: its own limb groups
    const b = actor.body, wings = makeWings(2.2); wings.position.set(0, 1.7, -0.4); b.add(wings);
    return {
      pose(k, wk) {
        const e = (a) => Math.min(1, Math.max(0, a));
        limbs.L.rotation.x = limbs.R.rotation.x = 1.7 * e(k * 1.6); limbs.A.rotation.x = limbs.B.rotation.x = 1.25 * e(k * 1.4 - 0.15);
        b.rotation.x = 1.35 * e(k * 1.3 - 0.3);
        for (const p of wings.children) p.scale.x = Math.max(0.02, e(wk));
      },
      restore() { b.remove(wings); for (const l of Object.values(limbs)) l.rotation.set(0, 0, 0); b.rotation.x = 0; },
    };
  }
  return { pose(k) { actor.group.scale.set(1, 1 - 0.4 * k, 1); }, restore() { actor.group.scale.set(1, 1, 1); } };   // a picture: just a crouch
}
