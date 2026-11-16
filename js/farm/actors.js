// Sato's Harvest: people and machines that walk. An actor shows, in order of preference: a 3D model,
// photographed stills (front / back / side, with walk-cycle sheets when they exist), or a simple
// built figure. dir: 0 south (towards the default camera), 1 north, 2 west, 3 east.
import * as THREE from 'three';
import * as art from './art.js';

export const DIRV = [[0, 1], [0, -1], [-1, 0], [1, 0]];
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });

function figure(look, tall = 1.62) {
  const g = new THREE.Group(), skin = std({ color: look.skin || '#e0b896' }), hair = std({ color: look.hair || '#222' }), top = std({ color: look.top || '#667' }), bot = std({ color: look.bottom || '#334' });
  const part = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  const leg = () => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.5, 3, 8), bot); m.position.y = -0.33; m.castShadow = true; p.add(m); return p; };
  const arm = () => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.42, 3, 8), top); m.position.y = -0.26; m.castShadow = true; p.add(m); const h = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), skin); h.position.y = -0.55; p.add(h); return p; };
  const L = leg(), R = leg(); L.position.set(-0.11, 0.72, 0); R.position.set(0.11, 0.72, 0); g.add(L, R);
  part(new THREE.CapsuleGeometry(0.2, 0.36, 4, 10), top, 0, 1.0, 0);
  const A = arm(), B = arm(); A.position.set(-0.27, 1.26, 0); B.position.set(0.27, 1.26, 0); g.add(A, B);
  part(new THREE.SphereGeometry(0.17, 14, 12), skin, 0, 1.47, 0);
  const st = look.style || 'short';
  if (st !== 'bald') {
    const cap = part(new THREE.SphereGeometry(0.185, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), st === 'bandana' ? std({ color: '#a8322a' }) : st === 'cap' ? std({ color: look.top }) : hair, 0, 1.49, -0.015);
    cap.rotation.x = -0.25;
    if (st === 'bob') part(new THREE.CylinderGeometry(0.19, 0.2, 0.2, 12, 1, true, Math.PI * 0.62, Math.PI * 1.76), std({ color: look.hair, side: THREE.DoubleSide }), 0, 1.42, -0.01);
    if (st === 'long' || st === 'bandana') part(new THREE.CapsuleGeometry(0.07, 0.4, 3, 6), hair, 0, 1.2, -0.17);
    if (st === 'bun') part(new THREE.SphereGeometry(0.08, 8, 6), hair, 0, 1.62, -0.12);
  }
  for (const x of [-0.06, 0.06]) part(new THREE.SphereGeometry(0.018, 6, 4), std({ color: '#1a1a1a' }), x, 1.49, 0.16);
  g.scale.setScalar(tall / 1.66);
  g.userData.limbs = { L, R, A, B };
  return g;
}
function robot() {                                  // Sato's Pallas, built: navy and rose
  const g = new THREE.Group(), navy = std({ color: '#1f3a78', metalness: 0.4, roughness: 0.55 }), rose = std({ color: '#d85a8c', metalness: 0.3, roughness: 0.5 }), grey = std({ color: '#59626e', metalness: 0.5 });
  const b = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const leg = (x) => { const p = new THREE.Group(); const u = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.0, 0.36), navy); u.position.y = -0.5; u.castShadow = true; const f = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.6), grey); f.position.set(0, -1.05, 0.1); f.castShadow = true; p.add(u, f); p.position.set(x, 1.15, 0); g.add(p); return p; };
  const L = leg(-0.3), R = leg(0.3);
  b(0.95, 0.75, 0.6, navy, 0, 1.6, 0); b(0.5, 0.3, 0.2, rose, 0, 1.7, 0.31); b(0.36, 0.3, 0.36, navy, 0, 2.15, 0); b(0.3, 0.07, 0.05, new THREE.MeshBasicMaterial({ color: '#7dffb0' }), 0, 2.17, 0.19);
  b(0.7, 0.6, 0.4, grey, 0, 1.65, -0.5);                                                       // cargo basket
  const arm = (x) => { const p = new THREE.Group(); const u = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.26), x < 0 ? navy : rose); u.position.y = -0.4; u.castShadow = true; p.add(u); p.position.set(x, 1.92, 0); g.add(p); return p; };
  const A = arm(-0.62), B = arm(0.62);
  g.userData.limbs = { L, R, A, B };
  return g;
}

export class Actor {
  constructor(world, id, look = {}, o = {}) {
    this.id = id; this.x = 0; this.y = 0; this.dir = 0; this.moving = false; this.phase = Math.random() * 6; this.tall = o.tall || 1.62;
    this.group = new THREE.Group(); world.dyn.add(this.group); this.world = world;
    this.group.add(world.blob(o.pallas ? 0.8 : 0.3));
    const key = o.pallas ? 'sprites/pallas' : 'people/' + id;
    this.views = { front: art.pic(key + '_front'), back: art.pic(key + '_back'), side: art.pic(key + '_side') };
    this.sheets = o.pallas ? {} : { front: art.sheet(key + '_walk_front'), back: art.sheet(key + '_walk_back'), side: art.sheet(key + '_walk_side') };
    const mname = o.pallas ? 'pallas' : null;
    if (mname && art.hasModel(mname)) {
      this.mode = 'model'; this.body = new THREE.Group(); this.group.add(this.body);
      art.model(mname).then((m) => { if (!m) return; const s = art.modelInfo(mname).size || [1, 1, 1]; m.scale.setScalar(this.tall / (s[1] || 1)); this.body.add(m); });
    } else if (this.views.front) {
      this.mode = 'pic'; this.mat = world.spriteMat(this.views.front.tex);
      this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat); this.plane.geometry.translate(0, 0.5, 0);
      this.body = new THREE.Group(); this.body.add(this.plane); this.group.add(this.body); world.facers.push(this.body);
    } else { this.mode = 'figure'; this.body = o.pallas ? robot() : figure(look, this.tall); if (o.pallas) this.body.scale.setScalar(this.tall / 2.4); this.group.add(this.body); }
    this.frame = 0;
  }
  dispose() { this.world.dyn.remove(this.group); const k = this.world.facers.indexOf(this.body); if (k >= 0) this.world.facers.splice(k, 1); }
  face(x, y) { const dx = x - this.x, dy = y - this.y; this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); }
  update(dt, world) {
    this.group.position.set(this.x, 0, this.y);
    this.phase += dt * (this.moving ? 9 : 1.6);
    const [dx, dz] = DIRV[this.dir], fa = Math.atan2(dx, dz);
    if (this.mode === 'figure' || this.mode === 'model') {
      let d = fa - this.body.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); this.body.rotation.y += d * Math.min(1, dt * 14);
      const l = this.body.userData.limbs, s = this.moving ? Math.sin(this.phase) * 0.7 : 0;
      if (l) { l.L.rotation.x = s; l.R.rotation.x = -s; l.A.rotation.x = -s * 0.8 + (this.swing || 0); l.B.rotation.x = s * 0.8; }
      this.body.position.y = this.moving ? Math.abs(Math.sin(this.phase)) * 0.03 : 0;
      if (this.swing) this.swing = Math.max(0, this.swing - dt * 5);
      return;
    }
    const rel = fa - world.yaw, c = Math.cos(rel), s = Math.sin(rel);
    let view = c > 0.5 ? 'front' : c < -0.5 ? 'back' : 'side', flip = view === 'side' && s > 0;
    if (!this.views[view]) { view = 'front'; flip = false; }
    const sh = this.moving && this.sheets[view];
    let p = this.views[view], w, h = this.tall;
    if (sh) {
      this.frame = (this.frame + dt * sh.fps) % sh.frames; const f = Math.floor(this.frame);
      sh.tex.offset.set((f % sh.cols) / sh.cols, 1 - (Math.floor(f / sh.cols) + 1) / sh.rows);
      if (this.mat.map !== sh.tex) { this.mat.map = sh.tex; this.mat.needsUpdate = true; }
      w = h * (sh.fw / sh.fh);
    } else {
      if (this.mat.map !== p.tex) { this.mat.map = p.tex; this.mat.needsUpdate = true; }
      w = h * (p.w / p.h);
    }
    this.plane.scale.set(flip ? -w : w, h, 1);
    this.plane.position.y = this.moving && !sh ? Math.abs(Math.sin(this.phase)) * 0.06 : 0;
    this.plane.rotation.z = this.moving && !sh ? Math.sin(this.phase) * 0.035 : (this.swing ? Math.sin(this.swing * 3) * 0.12 : 0);
    if (this.swing) this.swing = Math.max(0, this.swing - dt * 5);
  }
}
