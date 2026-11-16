// Sato's Harvest: people and machines that walk. An actor shows, in order of preference: a 3D model,
// photographed stills (front / back / side, with walk-cycle sheets when they exist), or a simple
// built figure. dir: 0 south (towards the default camera), 1 north, 2 west, 3 east.
import * as THREE from 'three';
import * as art from './art.js';

export const DIRV = [[0, 1], [0, -1], [-1, 0], [1, 0]];
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });

// The built figure: a cute chibi (about three heads tall) with a drawn anime face, cel shading and
// an ink outline. Used for anyone who has no 3D model in the art pack.
let ramp = null;
function toon(color, o = {}) {
  if (!ramp) { ramp = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true; }
  return new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...o });
}
const INK = new THREE.MeshBasicMaterial({ color: 0x3a2a22, side: THREE.BackSide });
function faceTexture(look, blink) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  g.fillStyle = look.skin || '#f8dcc4'; g.fillRect(0, 0, N, N);
  const ink = '#3a2620', iris = look.eye || '#8a5a2e', ex = 100, ey = 268, rx = look.age === 'old' ? 36 : 54, ry = look.age === 'old' ? 42 : 68;
  const eye = (x, flip) => {
    if (blink) { g.strokeStyle = ink; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.arc(x, ey - 6, rx * 0.8, 0.12 * Math.PI, 0.88 * Math.PI); g.stroke(); return; }
    g.save(); g.beginPath(); g.ellipse(x, ey, rx, ry, 0, 0, 7); g.clip();
    g.fillStyle = '#fffdf8'; g.fillRect(x - rx, ey - ry, rx * 2, ry * 2);
    const gr = g.createLinearGradient(0, ey - ry, 0, ey + ry); gr.addColorStop(0, '#2a1a12'); gr.addColorStop(0.45, iris); gr.addColorStop(1, '#e0a878');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, ey + 6, rx * 0.8, ry * 0.9, 0, 0, 7); g.fill();
    g.fillStyle = '#1a0f0a'; g.beginPath(); g.ellipse(x, ey + 4, rx * 0.36, ry * 0.46, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(40,20,10,.35)'; g.fillRect(x - rx, ey - ry, rx * 2, ry * 0.42);                         // lid shadow
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x - flip * rx * 0.3, ey - ry * 0.38, rx * 0.27, ry * 0.24, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(x + flip * rx * 0.34, ey + ry * 0.48, rx * 0.13, 0, 7); g.fill();
    g.restore();
    g.strokeStyle = ink; g.lineCap = 'round'; g.lineWidth = 11; g.beginPath(); g.ellipse(x, ey, rx, ry, 0, 1.08 * Math.PI, 1.92 * Math.PI); g.stroke();   // upper lash
    g.lineWidth = 7; g.beginPath(); g.moveTo(x + flip * rx * 0.98, ey - ry * 0.22); g.lineTo(x + flip * (rx + 15), ey - ry * 0.5); g.stroke();
    g.lineWidth = 3; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(x, ey, rx, ry, 0, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); g.globalAlpha = 1;
  };
  eye(N / 2 - ex, -1); eye(N / 2 + ex, 1);
  g.strokeStyle = look.brow || ink; g.lineWidth = 7; g.lineCap = 'round';
  for (const f of [-1, 1]) { g.beginPath(); g.moveTo(N / 2 + f * (ex - 34), ey - ry - 26); g.quadraticCurveTo(N / 2 + f * ex, ey - ry - 40, N / 2 + f * (ex + 38), ey - ry - 22); g.stroke(); }
  const bl = (x) => { const r = g.createRadialGradient(x, ey + 82, 2, x, ey + 82, 44); r.addColorStop(0, 'rgba(255,110,120,.6)'); r.addColorStop(1, 'rgba(255,110,120,0)'); g.fillStyle = r; g.fillRect(x - 50, ey + 36, 100, 92); };
  bl(N / 2 - ex - 22); bl(N / 2 + ex + 22);
  g.strokeStyle = '#b0503f'; g.lineWidth = 6; g.beginPath(); g.arc(N / 2, ey + 100, 17, 0.12 * Math.PI, 0.88 * Math.PI); g.stroke();
  if (look.moustache) { g.fillStyle = look.moustache; g.beginPath(); g.ellipse(N / 2 - 30, ey + 98, 36, 14, -0.25, 0, 7); g.ellipse(N / 2 + 30, ey + 98, 36, 14, 0.25, 0, 7); g.fill(); }
  if (look.age === 'old') { g.strokeStyle = 'rgba(120,80,60,.4)'; g.lineWidth = 3; for (const f of [-1, 1]) { g.beginPath(); g.moveTo(N / 2 + f * (ex + 50), ey + 30); g.lineTo(N / 2 + f * (ex + 64), ey + 40); g.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function figure(look, tall = 1.62) {
  const g = new THREE.Group(), skinC = look.skin || '#f3d3b8', skin = toon(skinC), hair = toon(look.hair || '#222'), top = toon(look.top || '#e8e2d0'), bot = toon(look.bottom || '#2c3a66'), boot = toon('#6a452c');
  const part = (geo, mat, x, y, z, ink = 0, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); if (ink) { const o = new THREE.Mesh(geo, INK); o.scale.setScalar(1 + ink); m.add(o); } return m; };
  const st = look.style || 'short', isSato = st === 'bob';
  // legs and boots
  const leg = (x) => { const p = new THREE.Group(); p.position.set(x, 0.42, 0); part(new THREE.CapsuleGeometry(0.085, 0.2, 3, 8), bot, 0, -0.16, 0, 0.1, p); part(new THREE.SphereGeometry(0.105, 10, 8), boot, 0, -0.36, 0.035, 0.1, p).scale.set(1, 0.72, 1.35); g.add(p); return p; };
  const L = leg(-0.105), R = leg(0.105);
  // body: shirt, with dungarees (a bib) for farmers
  part(new THREE.CapsuleGeometry(0.19, 0.2, 4, 12), top, 0, 0.62, 0, 0.06);
  part(new THREE.CylinderGeometry(0.2, 0.215, 0.2, 14), bot, 0, 0.5, 0, 0.06);
  if (look.bib) { part(new THREE.BoxGeometry(0.2, 0.19, 0.05), bot, 0, 0.68, 0.165); for (const x of [-0.08, 0.08]) part(new THREE.BoxGeometry(0.035, 0.26, 0.4), bot, x, 0.74, 0).scale.z = 1; }
  if (look.apron) part(new THREE.BoxGeometry(0.3, 0.34, 0.04), toon(look.apron), 0, 0.56, 0.19);
  // arms
  const arm = (x) => { const p = new THREE.Group(); p.position.set(x, 0.78, 0); p.rotation.z = x < 0 ? -0.22 : 0.22; part(new THREE.CapsuleGeometry(0.058, 0.2, 3, 8), top, 0, -0.14, 0, 0.12, p); part(new THREE.SphereGeometry(0.062, 8, 6), skin, 0, -0.31, 0, 0.12, p); g.add(p); return p; };
  const A = arm(-0.245), B = arm(0.245);
  // head: a big round one, with the drawn face on the front
  const head = new THREE.Group(); head.position.y = 1.13; g.add(head);
  const HR = 0.32, shape = (m) => { m.scale.set(1.04, 0.95, 0.98); return m; };
  shape(part(new THREE.SphereGeometry(HR, 28, 20), skin, 0, 0, 0, 0.04, head));
  const fOpen = faceTexture(look, false), fShut = faceTexture(look, true);
  const fm = toon('#ffffff', { map: fOpen });
  shape(part(new THREE.SphereGeometry(HR * 1.004, 28, 16, Math.PI / 2 - 0.95, 1.9, Math.PI * 0.2, Math.PI * 0.62), fm, 0, 0, 0, 0, head)).castShadow = false;
  for (const x of [-1, 1]) part(new THREE.SphereGeometry(0.05, 8, 6), skin, x * HR * 1.0, -0.04, 0, 0, head);
  // hair: smooth shells around the head (a cap, a fringe, sides and back)
  if (st !== 'bald') {
    const hc = st === 'bandana' ? '#c8402f' : (look.hair || '#222'), hm = toon(hc, { side: THREE.DoubleSide }), R2 = HR * 1.09;
    const shell = (phi0, phiL, th0, thL, ink = 0) => shape(part(new THREE.SphereGeometry(R2, 24, 14, phi0, phiL, th0, thL), hm, 0, 0.005, -0.004, ink, head));
    const longish = st === 'bob' || st === 'long' || st === 'bun';
    shell(0, Math.PI * 2, 0, Math.PI * 0.3, 0.035);                                                  // cap
    shell(Math.PI, Math.PI, Math.PI * 0.28, Math.PI * (longish ? 0.5 : 0.32));                       // back
    if (st !== 'bandana') {
      shell(Math.PI / 2 - 0.82, 1.64, Math.PI * 0.28, Math.PI * 0.035);                              // fringe band
      for (let i = -2; i <= 2; i++) { const f = part(new THREE.SphereGeometry(0.075, 10, 8), toon(hc), Math.sin(i * 0.36) * R2 * 0.93, HR * 0.66 - Math.abs(i) * 0.012, Math.cos(i * 0.36) * R2 * 0.87 - 0.004, 0, head); f.scale.set(1.5, 0.85, 0.45); f.rotation.y = i * 0.36; f.rotation.z = i * -0.1; }   // fringe tips
    }
    for (const f of [-1, 1]) shell(f > 0 ? -0.62 : Math.PI - 0.32, 0.94, Math.PI * 0.28, Math.PI * (longish ? 0.47 : 0.22));   // sides
    if (st === 'bob') for (const f of [-1, 1]) part(new THREE.SphereGeometry(0.075, 10, 8), toon(hc), f * HR * 0.93, -HR * 0.62, 0.08, 0.05, head).scale.set(0.7, 1.1, 1.3);   // curled-in tips
    if (st === 'long' || st === 'bandana') part(new THREE.CapsuleGeometry(0.07, 0.34, 3, 8), toon(hc === '#c8402f' ? look.hair : hc), 0, -0.36, -0.26, 0.06, head).rotation.x = 0.18;
    if (st === 'bun') part(new THREE.SphereGeometry(0.11, 10, 8), toon(hc), 0, 0.3, -0.16, 0.06, head);
    if (st === 'cap') { part(new THREE.SphereGeometry(HR * 1.13, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), toon(look.cap || look.top), 0, 0.03, 0, 0.04, head); part(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 14), toon(look.cap || look.top), 0, 0.15, 0.29, 0, head); }
  }
  if (look.hat || isSato) {            // the straw hat, hanging on her back as in her picture
    const straw = toon('#e3bf6a'), hat = new THREE.Group(); hat.position.set(0, 0.86, -0.25); hat.rotation.x = -1.32; g.add(hat);
    part(new THREE.CylinderGeometry(0.34, 0.36, 0.026, 26), straw, 0, 0, 0, 0.04, hat);
    part(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), straw, 0, 0, 0, 0.05, hat);
    part(new THREE.CylinderGeometry(0.203, 0.205, 0.045, 20), toon(look.band || '#d94a4a'), 0, 0.03, 0, 0, hat);
  }
  if (look.glasses) for (const x of [-0.12, 0.12]) part(new THREE.TorusGeometry(0.075, 0.012, 6, 16), toon('#3a3a3a'), x, -0.03, HR * 0.97, 0, head);
  g.scale.setScalar(tall / 1.52);
  g.userData.limbs = { L, R, A, B, head };
  g.userData.blink = (shut) => { fm.map = shut ? fShut : fOpen; };
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
    this.id = id; this.x = 0; this.y = 0; this.dir = 0; this.moving = false; this.phase = Math.random() * 6; this.tall = o.tall || 1.5;
    this.group = new THREE.Group(); world.dyn.add(this.group); this.world = world;
    this.group.add(world.blob(o.pallas ? 0.8 : 0.3));
    const key = o.pallas ? 'sprites/pallas' : 'people/' + id;
    this.views = { front: art.pic(key + '_front'), back: art.pic(key + '_back'), side: art.pic(key + '_side') };
    this.sheets = o.pallas ? {} : { front: art.sheet(key + '_walk_front'), back: art.sheet(key + '_walk_back'), side: art.sheet(key + '_walk_side') };
    this.idle = o.pallas ? null : art.sheet(key + '_idle_front');
    this.acts = {}; if (!o.pallas) for (const a of ['hoe', 'water', 'fish']) this.acts[a] = art.sheet(`${key}_${a}`);
    this.act = null; this.actT = 0;
    const mname = o.pallas ? 'pallas' : id;
    if (mname && art.hasModel(mname)) {
      this.mode = 'model'; this.body = new THREE.Group(); this.inner = new THREE.Group(); this.body.add(this.inner); this.group.add(this.body);
      art.model(mname).then((m) => { if (!m) return; const s = art.modelInfo(mname).size || [1, 1, 1]; m.scale.setScalar(this.tall / (s[1] || 1)); this.inner.add(m); });
    } else if (o.pallas && this.views.front) {
      this.mode = 'pic'; this.mat = world.spriteMat(this.views.front.tex);
      this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat); this.plane.geometry.translate(0, 0.5, 0);
      this.body = new THREE.Group(); this.body.add(this.plane); this.group.add(this.body); world.facers.push(this.body);
    } else { this.mode = 'figure'; this.body = o.pallas ? robot() : figure(look, this.tall); if (o.pallas) this.body.scale.setScalar(this.tall / 2.4); this.group.add(this.body); }
    this.frame = 0;
  }
  dispose() { this.world.dyn.remove(this.group); const k = this.world.facers.indexOf(this.body); if (k >= 0) this.world.facers.splice(k, 1); }
  // Play an action loop (hoe, water, fish) for `secs`, if there is art for it.
  play(action, secs = 0.9) { if (this.acts && this.acts[action]) { this.act = action; this.actT = secs; } }
  face(x, y) { const dx = x - this.x, dy = y - this.y; this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); }
  update(dt, world) {
    this.group.position.set(this.x, 0, this.y);
    this.phase += dt * (this.moving ? 9 : 1.6);
    const [dx, dz] = DIRV[this.dir], fa = Math.atan2(dx, dz);
    if (this.mode === 'figure' || this.mode === 'model') {
      let d = fa - this.body.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); this.body.rotation.y += d * Math.min(1, dt * 14);
      const l = this.body.userData.limbs, s = this.moving ? Math.sin(this.phase) * 0.7 : 0;
      if (l) { l.L.rotation.x = s; l.R.rotation.x = -s; l.A.rotation.x = -s * 0.8; l.B.rotation.x = s * 0.8 - (this.swing || 0) * 2.2; if (l.head) { l.head.rotation.z = this.moving ? Math.sin(this.phase) * 0.05 : Math.sin(this.phase * 0.6) * 0.025; l.head.rotation.x = this.swing ? this.swing * 0.25 : 0; } }
      if (this.body.userData.blink) this.body.userData.blink((this.phase * 0.37) % 4.2 > 4.05 || (this.world.t * 0.9 + this.tall * 7) % 3.7 > 3.58);
      this.body.position.y = this.moving ? Math.abs(Math.sin(this.phase)) * 0.05 : Math.sin(this.phase * 0.6) * 0.008;
      if (this.inner) {                                  // a model with no joints moves like a little toy: hop, waddle, lean
        const k = this.moving ? 1 : 0, w = Math.sin(this.phase);
        this.inner.position.y = k * Math.abs(w) * 0.07; this.inner.rotation.z = k * w * 0.075; this.inner.rotation.x = k * 0.07 + (this.swing || 0) * 0.3;
        const sq = 1 + (k ? Math.cos(this.phase * 2) * 0.03 : Math.sin(this.phase) * 0.012); this.inner.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      }
      if (this.swing) this.swing = Math.max(0, this.swing - dt * 5);
      return;
    }
    const rel = fa - world.yaw, c = Math.cos(rel), s = Math.sin(rel);
    let view = c > 0.5 ? 'front' : c < -0.5 ? 'back' : 'side', flip = view === 'side' && s > 0;
    if (!this.views[view]) { view = 'front'; flip = false; }
    if (this.act && (this.moving || (this.actT -= dt) <= 0)) this.act = null;
    const acting = this.act && this.acts[this.act];
    if (acting) { view = 'front'; flip = false; }
    const sh = acting || (this.moving ? this.sheets[view] : (view === 'front' && this.idle));
    let p = this.views[view], w, h = this.tall;
    if (sh) {
      if (sh !== this.lastSheet) { this.frame = 0; this.lastSheet = sh; }
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
