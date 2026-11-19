// Sato's Harvest: built stand-ins for the Lower deck, "the Undercroft" (docs/LOWER-DECK-ART.md). Each kind is used
// until its model is in art/farm/models (world.js PROPS has the slots); world.js proc() asks here first.
import * as THREE from 'three';

const M = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!M.has(k)) M.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.1, ...o })); return M.get(k); };
const lit = (c) => mat(c, { emissive: c, emissiveIntensity: 1, roughness: 0.4 });
function box(w, h, d, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function cyl(r0, r1, h, m, x = 0, y = 0, z = 0, seg = 12) { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o; }
function ball(r, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); o.position.set(x, y, z); o.castShadow = true; return o; }
const STEEL = () => mat(0x6f7c86, { metalness: 0.5, roughness: 0.5 }), DARK = () => mat(0x33393f, { metalness: 0.4 }), BRASS = () => mat(0xc9a14a, { metalness: 0.7, roughness: 0.35 }), RUST = () => mat(0x8a5a3a), STONE = () => mat(0x8c857a), RED = () => mat(0xc23a2a);
const SHROOM = { shiitake: [0x8a5a35, 0xe8d8bc], pale_oyster: [0xe6e0d0, 0xf4efe4], glowcap: [0x4fe0d0, 0xbff8f0], deep_truffle: [0x2e2420, 0x4a3a30] };
// o: the prop's options (w, d, lit, running, crypt; for 'shrooms' id and stage). Returns null for kinds it does not know.
export function lowerProp(kind, o = {}) {
  const g = new THREE.Group(), w = o.w || 1, d = o.d || 1, cx = (w - 1) / 2, cz = (d - 1) / 2;
  switch (kind) {
    case 'lower_lift': {                                 // a caged lift platform with two work lights
      g.add(box(2.9, 0.2, 2.9, STEEL(), cx, 0, cz), box(2.6, 0.04, 2.6, mat(0xd9a520, { metalness: 0.3 }), cx, 0.2, cz));
      for (const [x, z] of [[-1.35, -1.35], [1.35, -1.35], [-1.35, 1.35], [1.35, 1.35]]) g.add(box(0.12, 2.8, 0.12, DARK(), cx + x, 0.2, cz + z));
      for (const y of [1.1, 2.2]) for (const s of [-1, 1]) { g.add(box(2.8, 0.06, 0.06, DARK(), cx, y, cz + s * 1.35)); if (s < 0) g.add(box(0.06, 0.06, 2.8, DARK(), cx - 1.35, y, cz), box(0.06, 0.06, 2.8, DARK(), cx + 1.35, y, cz)); }
      g.add(box(2.9, 0.15, 2.9, DARK(), cx, 3.0, cz), box(0.5, 1.2, 0.3, STEEL(), cx, 0.2, cz - 1.15), box(0.3, 0.2, 0.05, lit(0x7dffb0), cx, 1.1, cz - 0.99));
      for (const s of [-1, 1]) g.add(ball(0.14, lit(0xffd890), cx + s * 1.2, 2.85, cz + 1.2));
      break;
    }
    case 'pump_station': {                               // a big old pump: tank, pipes, a gauge, red valves
      const run = !!o.running;
      g.add(box(w - 0.2, 0.3, d - 0.2, DARK(), cx, 0, cz), cyl(0.9, 0.9, 2.0, STEEL(), cx - 0.6, 0.3, cz, 18), box(1.4, 1.2, 1.2, RUST(), cx + 0.9, 0.3, cz));
      const p = cyl(0.2, 0.2, w - 0.3, BRASS(), cx, 1.9, cz + 0.4); p.rotation.z = Math.PI / 2; p.position.y = 1.9; g.add(p, cyl(0.2, 0.2, 1.6, BRASS(), cx + 1.5, 0.3, cz + 0.4));
      for (const x of [-1, 0.5]) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 14), RED()); v.position.set(cx + x, 2.2, cz + 0.7); g.add(v); }
      const gauge = cyl(0.25, 0.25, 0.06, mat(0xf2eee4), cx + 0.9, 1.1, cz + 0.62); gauge.rotation.x = Math.PI / 2; g.add(gauge, box(0.04, 0.2, 0.02, lit(run ? 0x5fd08a : 0xe0503a), cx + 0.9, 1.15, cz + 0.67));
      g.add(ball(0.08, lit(run ? 0x7dffb0 : 0x5a2a22), cx + 1.4, 1.65, cz + 0.62));
      break;
    }
    case 'mushroom_bed': g.add(box(1.9, 0.45, 0.85, mat(0x5a3e2a), cx, 0, 0), box(1.8, 0.08, 0.75, mat(0x2e2218), cx, 0.45, 0)); for (const x of [-0.6, 0, 0.6]) { const l = cyl(0.11, 0.12, 1.6, mat(0x6e4f35), cx, 0.55, 0); l.rotation.z = Math.PI / 2; l.position.set(cx, 0.6, x * 0.4); g.add(l); } if (o.rotten) g.add(box(1.7, 0.05, 0.7, mat(0x3a4a32), cx, 0.52, 0)); break;
    case 'shrooms': {                                     // what grows on a bed: little caps that get bigger, and glowcaps glow
      const [cap, stem] = SHROOM[o.id] || SHROOM.shiitake, s = [0.35, 0.6, 0.8, 1][o.stage ?? 3], glowy = o.id === 'glowcap';
      for (let i = 0; i < (o.id === 'deep_truffle' ? 1 : 9); i++) {
        const x = ((i * 0.37) % 1 - 0.5) * 1.6, z = ((i * 0.61) % 1 - 0.5) * 0.5, k = s * (0.7 + (i % 3) * 0.18);
        if (o.id === 'deep_truffle') { g.add(ball(0.18 * k + 0.05, mat(cap), 0, 0.62, 0)); continue; }
        g.add(cyl(0.025 * k + 0.01, 0.03 * k + 0.01, 0.14 * k, mat(stem), x, 0.6, z, 6));
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.09 * k + 0.02, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), glowy ? lit(cap) : mat(cap)); c.position.set(x, 0.6 + 0.14 * k, z); c.scale.y = o.id === 'pale_oyster' ? 0.35 : 0.7; g.add(c);
      }
      break;
    }
    case 'catacomb_arch': {                              // stone pillars and a steel band, with old colony markings
      for (const s of [-1, 1]) g.add(box(0.6, 2.4, 0.8, STONE(), cx + s * 1.2, 0, 0));
      const a = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.3, 6, 16, Math.PI), STONE()); a.position.set(cx, 2.35, 0); a.scale.z = 2.4; a.castShadow = true; g.add(a);
      g.add(box(0.5, 0.25, 0.85, STEEL(), cx, 3.4, 0), box(0.3, 0.12, 0.02, lit(0x9ff4ff), cx + 1.2, 1.6, 0.41));
      break;
    }
    case 'shelter': {                                    // a patched-up home: crates, tarps, a stovepipe, fairy lights
      g.add(box(3.6, 2.0, 3.4, mat(0x7a6a52), cx, 0, cz - 0.2), box(3.9, 0.12, 3.8, mat(0x4f7a8a), cx, 2.0, cz - 0.2));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 0.9, 4), mat(0x6f8f5a)); roof.rotation.y = Math.PI / 4; roof.position.set(cx, 2.55, cz - 0.2); roof.castShadow = true; g.add(roof);
      g.add(box(1.0, 1.6, 0.06, mat(0xb85a3a), cx, 0, cz + 1.5), box(0.5, 0.5, 0.06, mat(0xffe0a0, { emissive: 0xffc070, emissiveIntensity: 0.8 }), cx + 1.1, 0.9, cz + 1.51), cyl(0.1, 0.1, 1.2, DARK(), cx - 1.2, 2.1, cz - 1));
      for (let i = 0; i < 9; i++) g.add(ball(0.05, lit([0xffd36a, 0xff8fa3, 0x7dffe0][i % 3]), cx - 1.8 + i * 0.45, 1.95 - Math.sin(i / 8 * Math.PI) * 0.25, cz + 1.65));
      g.add(box(0.7, 0.5, 0.6, mat(0x9a7a4a), cx + 1.4, 0, cz + 1.9));
      break;
    }
    case 'glow_lamp': {                                  // a standing caged work lamp; warm when lit
      g.add(cyl(0.18, 0.22, 0.08, DARK()), cyl(0.04, 0.04, 1.5, DARK(), 0, 0.08, 0, 6));
      const b = ball(0.13, o.lit ? lit(0xffd38a) : mat(0x4a4438), 0, 1.65, 0.05); b.castShadow = false; g.add(b);
      for (let i = 0; i < 4; i++) { const r = box(0.02, 0.3, 0.02, DARK(), Math.cos(i * 1.57) * 0.15, 1.5, 0.05 + Math.sin(i * 1.57) * 0.15); g.add(r); }
      break;
    }
    case 'terminal': g.add(box(0.6, 1.0, 0.5, mat(0x5a6a5a)), box(0.5, 0.36, 0.04, lit(0x3fe07a), 0, 0.9, 0.26), box(0.56, 0.08, 0.3, DARK(), 0, 0.72, 0.36), box(0.62, 0.1, 0.52, DARK(), 0, 1.0, 0)); break;
    case 'vault_door': case 'vault_door_open': {         // a huge round sealed door in a frame; once open it stands rolled aside
      const op = kind === 'vault_door_open';
      if (op) { for (const s2 of [-1, 1]) g.add(box(0.4, 3.3, 0.5, DARK(), cx + s2 * 1.3, 0, -0.1)); g.add(box(3.0, 0.4, 0.5, DARK(), cx, 2.9, -0.1)); }
      else g.add(box(3.0, 3.3, 0.5, DARK(), cx, 0, -0.1));
      const door = cyl(1.4, 1.4, 0.3, STEEL(), cx, 0, 0, 32); door.rotation.x = Math.PI / 2; door.position.set(op ? cx + 2.6 : cx, 1.65, op ? 0.55 : 0.25); g.add(door);
      if (op) { g.add(ball(0.06, lit(0x5fd08a), cx + 1.3, 3.05, 0.2)); break; }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 6, 28), BRASS()); ring.position.set(cx, 1.65, 0.42); g.add(ring);
      for (let i = 0; i < 6; i++) { const s = box(0.5, 0.08, 0.08, BRASS(), cx + Math.cos(i * 1.047) * 0.5, 1.6 + Math.sin(i * 1.047) * 0.5, 0.45); s.rotation.z = i * 1.047; g.add(s); }
      g.add(ball(0.06, lit(0xff5a3a), cx + 1.3, 3.05, 0.2));
      break;
    }
    case 'work_barrier': for (let i = 0; i < w; i++) g.add(box(0.9, 0.12, 0.1, mat(i % 2 ? 0xf2c230 : 0x2b2b2b), i, 0.7, 0), box(0.08, 0.8, 0.08, DARK(), i - 0.4, 0, 0)); g.add(box(0.08, 0.8, 0.08, DARK(), w - 0.6, 0, 0), box(0.4, 0.3, 0.03, mat(0xf2eee4), cx, 0.85, 0.06)); break;
    case 'bulkhead': g.add(box(0.4, 2.6, d, o.crypt ? mat(0x6a5a48) : STEEL(), 0, 0, cz), box(0.45, 0.2, d, mat(0xf2c230), 0, 2.2, cz)); if (o.crypt) for (const z of [-0.6, 0, 0.6]) g.add(box(0.47, 0.06, 0.4, DARK(), 0, 1.3, cz + z)); else { const v = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 14), RED()); v.rotation.y = Math.PI / 2; v.position.set(0.25, 1.3, cz); g.add(v); } break;
    case 'tarp': for (let i = 0; i < w; i++) g.add(box(0.95, 2.4, 0.06, mat([0x4f7a8a, 0x8a6a4a, 0x6f8f5a][i % 3]), i, 0, 0)); g.add(box(w, 0.1, 0.1, DARK(), cx, 2.4, 0)); break;
    case 'crypt_wall': g.add(box(0.9, 2.2, 0.5, STONE()), box(0.6, 0.6, 0.02, mat(0x5a5348), -0.05, 0.9, 0.26)); for (let i = 0; i < 5; i++) g.add(box(0.03, 0.3, 0.02, mat(0xd8d0c0), -0.25 + i * 0.1, 1.0, 0.27)); break;
    case 'stove': g.add(box(0.9, 0.8, 0.7, DARK()), cyl(0.1, 0.1, 1.6, DARK(), 0.2, 0.8, -0.1), box(0.5, 0.2, 0.06, lit(0xff8a3a), 0, 0.3, 0.36), cyl(0.16, 0.13, 0.22, mat(0xc23a2a), -0.15, 0.8, 0.05)); break;
    case 'works_hall': {                                 // a big riveted shed with a roll-up door on +Z, a crane rail and a stack
      g.add(box(w - 0.2, 3.6, d - 0.2, STEEL(), cx, 0, cz), box(w, 0.3, d, DARK(), cx, 3.6, cz), box(3.2, 2.8, 0.08, mat(0xd9a520, { metalness: 0.3 }), cx, 0, cz + d / 2 - 0.06));
      for (let i = 0; i < 7; i++) g.add(box(3.2, 0.04, 0.1, DARK(), cx, 0.3 + i * 0.38, cz + d / 2 - 0.01));
      for (const s2 of [-1, 1]) g.add(box(0.5, 0.4, 0.06, lit(0xffd890), cx + s2 * 2.6, 2.7, cz + d / 2 - 0.05), box(0.2, 3.6, 0.2, DARK(), cx + s2 * (w / 2 - 0.2), 0, cz + d / 2 - 0.2));
      g.add(cyl(0.35, 0.4, 2.4, RUST(), cx + w / 2 - 1.4, 3.9, cz - d / 2 + 1.2), box(w - 0.6, 0.15, 0.15, mat(0xf2c230), cx, 3.3, cz + d / 2 + 0.3), box(1.6, 0.5, 0.06, mat(0x2b2b2b), cx, 3.0, cz + d / 2 - 0.04), box(1.4, 0.3, 0.02, lit(0xf2c230), cx, 3.1, cz + d / 2 - 0.0));
      break;
    }
    case 'fabricator': {                                 // the press: a hopper, a ram, a glowing belt and a little screen
      g.add(box(1.9, 0.9, 0.9, DARK(), cx, 0, 0), box(1.2, 1.1, 0.7, STEEL(), cx - 0.2, 0.9, -0.05), box(0.8, 0.5, 0.8, mat(0xd9a520, { metalness: 0.4 }), cx - 0.2, 2.0, -0.05));
      g.add(box(1.9, 0.06, 0.5, lit(0xff9a3a), cx, 0.9, 0.3), box(0.36, 0.26, 0.04, lit(0x3fe07a), cx + 0.65, 1.2, 0.3), cyl(0.1, 0.1, 0.8, BRASS(), cx - 0.2, 1.9, 0.3));
      break;
    }
    case 'scrap_bin': g.add(box(0.9, 0.7, 0.8, mat(0x4f7a5a)), box(0.95, 0.06, 0.85, DARK(), 0, 0.7, 0), box(0.3, 0.18, 0.02, mat(0xf2eee4), 0, 0.4, 0.41)); for (let i = 0; i < 4; i++) g.add(box(0.2, 0.12, 0.3, RUST(), -0.25 + i * 0.17, 0.76, (i % 2) * 0.1 - 0.05)); break;
    case 'vent_bath': {                                  // a tiled pool fed by steam pipes, glowcaps on the ledge
      const T = mat(0xb7a48a), r = 0.35;
      g.add(box(w, 0.08, d, mat(0x5f7f86), cx, 0, cz), box(w, 0.45, r, T, cx, 0, cz - d / 2 + r / 2), box(w, 0.45, r, T, cx, 0, cz + d / 2 - r / 2), box(r, 0.45, d, T, cx - w / 2 + r / 2, 0, cz), box(r, 0.45, d, T, cx + w / 2 - r / 2, 0, cz));
      const wat = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * r, d - 2 * r), mat(0x4fb8c8, { emissive: 0x2f8898, emissiveIntensity: 0.45, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 })); wat.rotation.x = -Math.PI / 2; wat.position.set(cx, 0.32, cz); g.add(wat);
      for (let i = 0; i < 6; i++) g.add(box(0.5, 0.02, 0.3, mat(i % 2 ? 0xc96a4a : 0xe8d8bc), cx - w / 2 + 0.5 + i * 1.0, 0.45, cz + d / 2 - 0.18));
      for (const s2 of [-1, 1]) { const p = cyl(0.14, 0.14, d, BRASS(), cx + s2 * (w / 2 - 0.15), 0.6, cz); p.rotation.x = Math.PI / 2; p.position.y = 0.7; g.add(p, cyl(0.14, 0.14, 1.6, BRASS(), cx + s2 * (w / 2 - 0.15), 0.35, cz - d / 2 + 0.2)); }
      for (let i = 0; i < 5; i++) { const x = cx - w / 2 + 0.8 + i * 1.1; g.add(cyl(0.03, 0.04, 0.12, mat(0xbff8f0), x, 0.45, cz - d / 2 + 0.18, 6)); const c = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lit(0x4fe0d0)); c.position.set(x, 0.57, cz - d / 2 + 0.18); g.add(c); }
      for (let i = 0; i < 7; i++) { const st = ball(0.3 + (i % 3) * 0.1, mat(0xffffff, { transparent: true, opacity: 0.12, roughness: 1, depthWrite: false }), cx - 1.8 + i * 0.6, 0.7 + (i % 3) * 0.4, cz + ((i * 0.37) % 1 - 0.5) * 1.6); st.castShadow = false; g.add(st); }
      break;
    }
    case 'reactor_console': {                            // a long desk of gauges and red valves, needles green once safe
      const safe = !!o.safe;
      g.add(box(w - 0.2, 1.0, 1.0, mat(0x5a6a5a), cx, 0, 0.3), box(w - 0.2, 0.9, 0.2, DARK(), cx, 1.0, -0.1));
      for (let i = 0; i < 4; i++) { const x = cx - 1 + i * 0.66, gauge = cyl(0.2, 0.2, 0.05, mat(0xf2eee4), x, 1.4, 0.02); gauge.rotation.x = Math.PI / 2; g.add(gauge, box(0.03, 0.16, 0.02, lit(safe || i < (o.step || 0) ? 0x5fd08a : 0xe0503a), x, 1.38, 0.06)); }
      for (const x of [-0.8, 0.8]) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 14), RED()); v.rotation.x = Math.PI / 2; v.position.set(cx + x, 1.06, 0.55); g.add(v); }
      g.add(box(0.5, 0.3, 0.04, lit(safe ? 0x3fe07a : 0xffb03a), cx, 1.78, 0.02), cyl(0.5, 0.6, 2.6, mat(0x46525a, { metalness: 0.5 }), cx, 0, -0.9, 16));
      break;
    }
    case 'zero_g_arena': {                               // the training drum: a ring of rails on struts, two hoops, balls hanging in the air
      for (const y of [0.15, 3.4]) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.1, 6, 36), mat(0xd9a520, { metalness: 0.5 })); r.rotation.x = Math.PI / 2; r.position.set(cx, y, cz); g.add(r); }
      for (let i = 0; i < 8; i++) g.add(box(0.12, 3.3, 0.12, STEEL(), cx + Math.cos(i * 0.785) * 2.3, 0.1, cz + Math.sin(i * 0.785) * 2.3));
      for (const s2 of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 20), lit(s2 < 0 ? 0x7dffb0 : 0xff8fa3)); h.position.set(cx + s2 * 1.9, 2.2, cz); h.rotation.y = Math.PI / 2; g.add(h, box(0.1, 2.0, 0.1, DARK(), cx + s2 * 2.15, 0.2, cz)); }
      g.add(cyl(2.25, 2.25, 0.08, mat(0x2b3a4a, { metalness: 0.3 }), cx, 0, cz, 36));
      for (let i = 0; i < 4; i++) { const b = ball(0.16, lit([0xffd36a, 0x9ff4ff, 0xff8fa3, 0xffffff][i]), cx + Math.cos(i * 1.7) * 0.9, 1.2 + (i % 3) * 0.6, cz + Math.sin(i * 1.7) * 0.9); b.castShadow = false; g.add(b); }
      break;
    }
    case 'decimator_ring': {                             // what is left of the machine: a great broken ring, cold and quiet
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.32, 10, 36, Math.PI * 1.7), mat(0x46525a, { metalness: 0.6, roughness: 0.4 })); r.position.set(cx, 2.0, cz); r.rotation.z = 0.5; r.castShadow = true; g.add(r);
      for (let i = 0; i < 8; i++) g.add(box(0.12, 0.12, 0.7, BRASS(), cx + Math.cos(i * 0.68 + 0.5) * 1.7, 2.0 + Math.sin(i * 0.68 + 0.5) * 1.7, cz));
      g.add(box(w - 1, 0.3, d - 1, DARK(), cx, 0, cz), box(0.7, 0.3, 0.7, STONE(), cx, 0.3, cz), ball(0.12, lit(0x6ab0ff), cx, 0.75, cz));
      break;
    }
    case 'decor_lantern': g.add(cyl(0.09, 0.1, 0.04, BRASS(), 0, 0.86, 0), cyl(0.07, 0.07, 0.2, mat(0xbff8f0, { transparent: true, opacity: 0.6 }), 0, 0.9, 0, 8), ball(0.05, lit(0x4fe0d0), 0, 1.0, 0)); break;
    case 'decor_clock': { const c = cyl(0.28, 0.28, 0.06, BRASS(), 0, 1.7, 0); c.rotation.x = Math.PI / 2; c.position.set(0, 1.9, -0.42); const f2 = cyl(0.23, 0.23, 0.02, mat(0xf2eee4), 0, 1.9, -0.38); f2.rotation.x = Math.PI / 2; f2.position.set(0, 1.9, -0.38); g.add(c, f2, box(0.02, 0.18, 0.02, RED(), 0.04, 1.86, -0.36)); break; }
    case 'decor_model': g.add(box(0.7, 0.6, 0.6, mat(0x5a3e2a)), cyl(0.28, 0.28, 0.08, BRASS(), 0, 0.85, 0, 20), cyl(0.2, 0.2, 0.08, mat(0x9ad0e0, { transparent: true, opacity: 0.7 }), 0, 0.95, 0, 20), cyl(0.12, 0.12, 0.06, lit(0xffd38a), 0, 0.68, 0, 16), cyl(0.02, 0.02, 0.5, DARK(), 0, 0.6, 0, 6)); break;
    case 'decor_shelf': g.add(box(0.8, 0.05, 0.4, RUST(), 0, 0.5, 0), box(0.8, 0.05, 0.4, RUST(), 0, 1.1, 0), cyl(0.03, 0.03, 1.5, DARK(), -0.38, 0, -0.15, 6), cyl(0.03, 0.03, 1.5, DARK(), 0.38, 0, -0.15, 6), box(0.3, 0.3, 0.3, mat(0x9a7a4a), -0.2, 0.55, 0), box(0.15, 0.25, 0.15, lit(0xffd38a), 0.2, 1.15, 0)); break;
    default: return null;
  }
  return g;
}
