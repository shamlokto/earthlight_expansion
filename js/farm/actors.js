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
const FACES = new Map();   // one painted face per look and eyelid, shared by every appearance (not re-painted on each map)
function faceTexture(look, blink) {
  const key = JSON.stringify(look) + '|' + !!blink; if (!FACES.has(key)) FACES.set(key, paintFace(look, blink)); return FACES.get(key);
}
function paintFace(look, blink) {
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
  if (look.freckles) { g.fillStyle = 'rgba(170,100,60,.55)'; for (const f of [-1, 1]) for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(N / 2 + f * (ex + 4 + (k % 3) * 16), ey + 70 + (k >> 1) * 13 - (k % 3) * 3, 4.5, 0, 7); g.fill(); } }   // Lark's freckles
  if (look.smudge) { g.fillStyle = 'rgba(50,46,44,.55)'; g.beginPath(); g.ellipse(N / 2 + ex + 30, ey + 96, 30, 12, -0.4, 0, 7); g.fill(); g.beginPath(); g.ellipse(N / 2 + ex + 8, ey + 112, 14, 6, -0.3, 0, 7); g.fill(); }   // grease on her cheek (Tika)
  g.strokeStyle = '#b0503f'; g.lineWidth = 6; g.beginPath(); g.arc(N / 2, ey + 100, 17, 0.12 * Math.PI, 0.88 * Math.PI); g.stroke();
  if (look.moustache) { g.fillStyle = look.moustache; g.beginPath(); g.ellipse(N / 2 - 30, ey + 98, 36, 14, -0.25, 0, 7); g.ellipse(N / 2 + 30, ey + 98, 36, 14, 0.25, 0, 7); g.fill(); }
  if (look.age === 'old') { g.strokeStyle = 'rgba(120,80,60,.4)'; g.lineWidth = 3; for (const f of [-1, 1]) { g.beginPath(); g.moveTo(N / 2 + f * (ex + 50), ey + 30); g.lineTo(N / 2 + f * (ex + 64), ey + 40); g.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function figure(look, tall = 1.62) {
  if (look.suit) look = { ...look, top: '#f2f0ea', bottom: '#e9e6de', bib: false, apron: null };
  const g = new THREE.Group(), skinC = look.skin || '#f3d3b8', skin = toon(skinC), hair = toon(look.hair || '#222'), top = toon(look.top || '#e8e2d0'), bot = toon(look.bottom || '#2c3a66'), boot = toon(look.suit ? '#7b8794' : '#6a452c');
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
  // a pastor's stole and white collar tab; a constable's badge and duty belt
  if (look.stole) for (const x of [-0.075, 0.075]) part(new THREE.BoxGeometry(0.06, 0.4, 0.03), toon(look.stole), x, 0.6, 0.185);
  if (look.collar) { part(new THREE.TorusGeometry(0.105, 0.022, 6, 16), toon('#2a2d36'), 0, 0.88, 0).rotation.x = Math.PI / 2; part(new THREE.BoxGeometry(0.06, 0.045, 0.02), toon('#ffffff'), 0, 0.86, 0.11); }
  if (look.badge) part(new THREE.BoxGeometry(0.06, 0.07, 0.02), toon('#e8c45a', { emissive: 0x3a2a00 }), 0.09, 0.71, 0.185);
  if (look.belt) { part(new THREE.CylinderGeometry(0.205, 0.205, 0.05, 14), toon('#1a1c22'), 0, 0.47, 0); part(new THREE.BoxGeometry(0.05, 0.04, 0.02), toon('#cfd6dc'), 0, 0.47, 0.205); }
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
    const longish = st === 'bob' || st === 'long' || st === 'bun' || st === 'braid' || st === 'twintails' || st === 'odango';
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
    // Market Lane's styles (2026-11-19): a side braid, a high ponytail, two buns, twin tails; ties in look.ribbon
    const tie = toon(look.ribbon || '#f2f0ea');
    if (st === 'braid') { for (let k = 0; k < 6; k++) part(new THREE.SphereGeometry(0.075 - k * 0.006, 10, 8), toon(hc), 0.2 + k * 0.012, -0.22 - k * 0.1, 0.12 + k * 0.025, 0.05, head); part(new THREE.SphereGeometry(0.04, 8, 6), tie, 0.27, -0.8, 0.26, 0.04, head); }
    if (st === 'ponytail') { part(new THREE.TorusGeometry(0.06, 0.025, 6, 12), tie, 0, 0.22, -0.29, 0, head); const t = part(new THREE.CapsuleGeometry(0.085, 0.34, 4, 10), toon(hc), 0, -0.04, -0.4, 0.05, head); t.rotation.x = 0.5; part(new THREE.SphereGeometry(0.07, 8, 6), toon(hc), 0, -0.3, -0.48, 0.04, head); }
    if (st === 'odango') for (const f of [-1, 1]) { part(new THREE.SphereGeometry(0.105, 12, 10), toon(hc), f * 0.21, 0.27, -0.05, 0.06, head); part(new THREE.TorusGeometry(0.07, 0.02, 6, 12), tie, f * 0.17, 0.2, -0.04, 0, head).rotation.z = f * 0.9; }
    if (st === 'twintails') for (const f of [-1, 1]) { part(new THREE.SphereGeometry(0.05, 8, 6), tie, f * 0.3, 0.12, -0.08, 0.04, head); const t = part(new THREE.CapsuleGeometry(0.08, 0.5, 4, 10), toon(hc), f * 0.4, -0.2, -0.12, 0.05, head); t.rotation.z = f * 0.28; t.rotation.x = 0.12; part(new THREE.SphereGeometry(0.065, 8, 6), toon(hc), f * 0.48, -0.5, -0.07, 0.04, head); }
    if (look.kerchief) { shape(part(new THREE.SphereGeometry(R2 * 1.03, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.2), toon(look.kerchief), 0, 0.01, -0.01, 0.03, head)); part(new THREE.SphereGeometry(0.05, 8, 6), toon(look.kerchief), 0.05, 0.18, -0.31, 0.03, head); }
    if (look.flowerPin) { const fp = new THREE.Group(); fp.position.set(-0.27, 0.12, 0.17); head.add(fp); for (let k = 0; k < 5; k++) part(new THREE.SphereGeometry(0.035, 6, 5), toon(look.flowerPin), Math.cos(k * 1.26) * 0.045, Math.sin(k * 1.26) * 0.045, 0, 0, fp); part(new THREE.SphereGeometry(0.025, 6, 5), toon('#fff4c0'), 0, 0, 0.02, 0, fp); }
    if (st === 'cap') { part(new THREE.SphereGeometry(HR * 1.13, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), toon(look.cap || look.top), 0, 0.03, 0, 0.04, head); part(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 14), toon(look.cap || look.top), 0, 0.15, 0.29, 0, head); }
    if (st === 'cap' && look.capBadge) { part(new THREE.CylinderGeometry(HR * 1.1, HR * 1.1, 0.06, 20), toon('#111827'), 0, 0.13, 0, 0, head); part(new THREE.BoxGeometry(0.07, 0.08, 0.02), toon('#e8c45a', { emissive: 0x3a2a00 }), 0, 0.22, HR * 1.06, 0, head); const vis = part(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 18, 1, false, -Math.PI / 2, Math.PI), toon('#0d1424'), 0, 0.12, HR * 0.86, 0.08, head); vis.rotation.x = 0.25; }
  }
  if (look.suit) {                     // the belt: a white space suit with orange trim, a round glass helmet and a pack
    const suit = toon('#f2f0ea'), trim = toon('#e0782a'), grey = toon('#7b8794');
    part(new THREE.TorusGeometry(0.17, 0.05, 8, 18), grey, 0, 0.86, 0).rotation.x = Math.PI / 2;
    part(new THREE.CylinderGeometry(0.205, 0.205, 0.05, 14), trim, 0, 0.57, 0);
    part(new THREE.BoxGeometry(0.12, 0.09, 0.03), toon('#3fa7a3', { emissive: 0x0a2a28 }), -0.06, 0.7, 0.19);
    const pack = new THREE.Group(); pack.position.set(0, 0.68, -0.2); g.add(pack);
    part(new THREE.BoxGeometry(0.34, 0.36, 0.16), suit, 0, 0, 0, 0.06, pack);
    for (const x of [-0.09, 0.09]) part(new THREE.CapsuleGeometry(0.055, 0.22, 3, 8), trim, x, 0, -0.1, 0.06, pack);
    for (const x of [-0.11, 0.11]) part(new THREE.CylinderGeometry(0.035, 0.05, 0.08, 8), grey, x, -0.22, -0.06, 0, pack);
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: '#7dffb0' })); blink.position.set(0.12, 0.16, 0.085); pack.add(blink);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.42, 28, 20), new THREE.MeshStandardMaterial({ color: '#cfeefa', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.2, depthWrite: false }));
    glass.renderOrder = 3; head.add(glass);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(HR * 1.43, 28, 20, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0), toon('#f2f0ea')); shell.castShadow = true; head.add(shell);   // the back of the helmet; the visor is the front
    const rim = new THREE.Mesh(new THREE.TorusGeometry(HR * 1.36, 0.035, 8, 28), grey); rim.rotation.x = Math.PI / 2; rim.position.y = -HR * 0.55; head.add(rim);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 })); shine.position.set(-0.2, 0.22, 0.36); shine.scale.set(1, 1.6, 0.4); head.add(shine);
    const ant = part(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4), grey, 0.2, 0.42, -0.1, 0, head); ant.rotation.z = -0.3;
    part(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff6a5a' }), 0.23, 0.52, -0.1, 0, head);
  } else if (look.hat || isSato) {            // the straw hat, hanging on her back as in her picture
    const straw = toon('#e3bf6a'), hat = new THREE.Group(); hat.position.set(0, 0.86, -0.25); hat.rotation.x = -1.32; g.add(hat);
    part(new THREE.CylinderGeometry(0.34, 0.36, 0.026, 26), straw, 0, 0, 0, 0.04, hat);
    part(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), straw, 0, 0, 0, 0.05, hat);
    part(new THREE.CylinderGeometry(0.203, 0.205, 0.045, 20), toon(look.band || '#d94a4a'), 0, 0.03, 0, 0, hat);
  }
  if (look.goggles) { part(new THREE.TorusGeometry(HR * 1.02, 0.025, 6, 24), toon('#3a3a3a'), 0, 0.17, 0, 0, head).rotation.x = Math.PI / 2 - 0.25; for (const x of [-0.11, 0.11]) part(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14), toon('#c9a14a', { emissive: 0x2a2010 }), x, 0.2, HR * 0.95, 0, head).rotation.x = Math.PI / 2 - 0.3; }   // an engineer's goggles, pushed up
  if (look.lantern) { const l = new THREE.Group(); l.position.set(0.3, 0.42, 0.08); g.add(l); part(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 4), toon('#3a3a3a'), 0, 0.1, 0, 0, l); const b = part(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd98a' }), 0, -0.02, 0, 0, l); b.castShadow = false; part(new THREE.CylinderGeometry(0.045, 0.06, 0.03, 8), toon('#c9a14a'), 0, 0.045, 0, 0, l); }   // a little lantern on a string (Moth)
  if (look.headphones) { const hp = toon(look.headphones); const band = part(new THREE.TorusGeometry(HR * 1.12, 0.03, 6, 24, Math.PI), hp, 0, 0.02, 0, 0, head); band.rotation.z = 0; for (const f of [-1, 1]) { part(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 14), hp, f * HR * 1.1, 0, 0, 0.05, head).rotation.z = Math.PI / 2; part(new THREE.CylinderGeometry(0.06, 0.06, 0.075, 12), toon(look.headphonesTrim || '#e05c8a'), f * HR * 1.12, 0, 0, 0, head).rotation.z = Math.PI / 2; } }
  if (look.skirt) { const sk = part(new THREE.CylinderGeometry(0.2, 0.31, 0.28, 16), toon(look.skirt), 0, 0.37, 0, 0.05); sk.scale.z = 0.92; }
  if (look.measure) for (const x of [-0.07, 0.07]) part(new THREE.BoxGeometry(0.035, 0.3, 0.012), toon('#e8c840'), x, 0.68, 0.19);   // a tailor's tape round the neck
  if (look.glasses) for (const x of [-0.12, 0.12]) part(new THREE.TorusGeometry(0.075, 0.012, 6, 16), toon('#3a3a3a'), x, -0.03, HR * 0.97, 0, head);
  g.scale.setScalar(tall / 1.52);
  g.userData.limbs = { L, R, A, B, head };
  g.userData.blink = (shut) => { fm.map = shut ? fShut : fOpen; };
  return g;
}
// A generated figurine has no skeleton. This gives it one: it is cut by position into legs, arms
// (it stands with its arms out) and head, each bound to a bone with soft seams, so it can walk.
export function rigFigurine(model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), H = box.max.y - box.min.y, cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2, y0 = box.min.y;
  const root = new THREE.Bone(), bone = (x, y) => { const b = new THREE.Bone(); b.position.set(cx + x * H, y0 + y * H, cz); root.add(b); return b; };
  const HIP = 0.27, NECK = 0.55, L = bone(-0.06, HIP), R = bone(0.06, HIP), A = bone(-0.11, 0.5), B = bone(0.11, 0.5), head = bone(0, NECK);
  const out = new THREE.Group(); out.add(root); out.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton([root, L, R, A, B, head]);
  const ss = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const meshes = []; model.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const g = o.geometry.clone(); g.userData.keep = false; g.applyMatrix4(o.matrixWorld);
    const pos = g.attributes.position, n = pos.count, idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const x = (pos.getX(i) - cx) / H, y = (pos.getY(i) - y0) / H, ax = Math.abs(x);
      const arm = ss(0.1, 0.15, ax) * (1 - ss(NECK - 0.03, NECK + 0.005, y)) * ss(HIP - 0.02, HIP + 0.04, y), leg = 1 - ss(HIP - 0.05, HIP + 0.03, y), hd = ss(NECK - 0.02, NECK + 0.04, y);
      let b = 0, w = 0;
      if (arm > 0.01) { b = x < 0 ? 3 : 4; w = arm; } else if (leg > 0.01) { b = x < 0 ? 1 : 2; w = leg; } else if (hd > 0.01) { b = 5; w = hd; }
      idx[i * 4] = b; wt[i * 4] = w; idx[i * 4 + 1] = 0; wt[i * 4 + 1] = 1 - w;
    }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(wt, 4));
    const sm = new THREE.SkinnedMesh(g, o.material); sm.castShadow = true; sm.receiveShadow = false; sm.frustumCulled = false; out.add(sm); sm.bind(skeleton, new THREE.Matrix4());
  }
  A.rotation.z = 0.5; B.rotation.z = -0.5;                    // arms down from the modelling pose
  out.userData.limbs = { L, R, A, B, head }; out.userData.height = H;
  return out;
}

// The tool she carries, as a little built model in her right hand.
function toolMesh(id) {
  const g = new THREE.Group(), wood = toon('#a9774a'), iron = toon('#9aa6b2'), m = (geo, mat, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; g.add(o); return o; };
  const handle = (len = 0.62) => m(new THREE.CylinderGeometry(0.02, 0.022, len, 6), wood, 0, len / 2 - 0.12, 0);
  switch (id) {
    case 'hoe': handle(0.78); m(new THREE.BoxGeometry(0.17, 0.035, 0.1), iron, 0, 0.64, 0.05, 0.5); break;
    case 'axe': handle(); m(new THREE.BoxGeometry(0.03, 0.15, 0.17), iron, 0, 0.44, 0.08); break;
    case 'hammer': handle(); m(new THREE.BoxGeometry(0.1, 0.1, 0.22), toon('#6f7a86'), 0, 0.5, 0); break;
    case 'sickle': handle(0.3); m(new THREE.TorusGeometry(0.11, 0.014, 5, 12, Math.PI * 1.1), iron, 0, 0.28, 0.1, 0, 0).rotation.y = Math.PI / 2; break;
    case 'can': m(new THREE.CylinderGeometry(0.1, 0.11, 0.17, 12), toon('#5fa8d3'), 0, -0.02, 0.1); m(new THREE.CylinderGeometry(0.018, 0.026, 0.2, 6), toon('#5fa8d3'), 0, 0.03, 0.25, 1.0); m(new THREE.TorusGeometry(0.07, 0.012, 5, 10, Math.PI), toon('#4a8fb8'), 0, 0.08, 0.06).rotation.y = Math.PI / 2; break;
    case 'rod': m(new THREE.CylinderGeometry(0.008, 0.02, 1.25, 5), toon('#c8a05a'), 0, 0.35, 0.3, 0.75); break;
    case 'milker': m(new THREE.CylinderGeometry(0.07, 0.09, 0.15, 10), toon('#dfe6ea'), 0, -0.02, 0.08); break;
    case 'brush': m(new THREE.BoxGeometry(0.08, 0.05, 0.17), wood, 0, -0.02, 0.08); break;
    default: return null;
  }
  return g;
}

function robot() {                                  // Sato's Pallas, built in the expansion's colours: white and blue, magenta and gold
  const g = new THREE.Group(), white = std({ color: '#e9edf5', metalness: 0.3, roughness: 0.45 }), blue = std({ color: '#2457b8', metalness: 0.35, roughness: 0.45 }), mag = std({ color: '#c8346f', metalness: 0.3, roughness: 0.5 }), gold = std({ color: '#d9a43a', metalness: 0.6, roughness: 0.35 }), grey = std({ color: '#4a5260', metalness: 0.5 });
  const b = (w, h, d, m, x, y, z, p = g) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };
  const leg = (x) => { const p = new THREE.Group(); b(0.3, 0.55, 0.34, white, 0, -0.3, 0, p); b(0.34, 0.5, 0.38, blue, 0, -0.8, 0, p); b(0.38, 0.18, 0.6, white, 0, -1.08, 0.08, p); b(0.2, 0.08, 0.06, gold, 0, -0.55, 0.19, p); p.position.set(x, 1.15, 0); g.add(p); return p; };
  const L = leg(-0.28), R = leg(0.28);
  b(0.5, 0.3, 0.36, mag, 0, 1.2, 0); b(0.92, 0.62, 0.56, blue, 0, 1.62, 0); b(0.42, 0.3, 0.06, white, 0, 1.66, 0.29); b(0.5, 0.06, 0.07, gold, 0, 1.4, 0.29);
  b(0.34, 0.3, 0.34, white, 0, 2.08, 0); b(0.26, 0.06, 0.04, new THREE.MeshBasicMaterial({ color: '#7dffb0' }), 0, 2.1, 0.18);
  for (const s2 of [-1, 1]) { const f = b(0.04, 0.26, 0.04, gold, s2 * 0.1, 2.32, 0.12); f.rotation.z = -s2 * 0.6; }                      // the V-fin
  for (const s2 of [-1, 1]) { const w = b(0.12, 0.7, 0.36, white, s2 * 0.42, 2.0, -0.32); w.rotation.z = s2 * 0.35; b(0.05, 0.55, 0.37, mag, s2 * 0.47, 2.0, -0.32).rotation.z = s2 * 0.35; }   // back wings
  const arm = (x, right) => { const p = new THREE.Group(); b(0.34, 0.28, 0.36, white, 0, 0, 0, p); b(0.24, 0.72, 0.26, right ? blue : white, 0, -0.45, 0, p); b(0.1, 0.06, 0.27, gold, 0, -0.2, 0, p);
    if (right) { const sab = b(0.05, 1.1, 0.05, new THREE.MeshBasicMaterial({ color: '#8ff4ff' }), 0, -1.2, 0.25, p); sab.rotation.x = 0.6; b(0.08, 0.18, 0.08, grey, 0, -0.78, 0.05, p); }
    else { b(0.12, 0.14, 0.9, grey, 0, -0.75, 0.3, p); }   // the rifle
    p.position.set(x, 1.92, 0); g.add(p); return p; };
  const A = arm(-0.62, false), B = arm(0.62, true);
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
    const mname = o.pallas ? 'pallas' : o.suit ? null : id;      // in the suit she is the built figure (no suit model yet)
    if (mname && art.hasModel(mname)) {
      this.mode = 'model'; this.body = new THREE.Group(); this.inner = new THREE.Group(); this.body.add(this.inner); this.group.add(this.body);
      art.model(mname).then((m) => {
        if (!m) return; const s = art.modelInfo(mname).size || [1, 1, 1];
        if (!o.pallas) { const r = rigFigurine(m); r.scale.setScalar(this.tall / r.userData.height); this.body.userData.limbs = r.userData.limbs; this.inner.add(r); this.rigged = true; this.rigH = r.userData.height; this.applyTool(); }
        else { m.scale.setScalar(this.tall / (s[1] || 1)); this.inner.add(m); }
      });
    } else if (o.pallas && this.views.front && !o.suit) {
      this.mode = 'pic'; this.mat = world.spriteMat(this.views.front.tex);
      this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat); this.plane.geometry.translate(0, 0.5, 0);
      this.body = new THREE.Group(); this.body.add(this.plane); this.group.add(this.body); world.facers.push(this.body);
    } else { this.mode = 'figure'; this.body = o.pallas ? robot() : figure(look, this.tall); if (o.pallas) this.body.scale.setScalar(this.tall / 2.4); this.group.add(this.body); }
    this.frame = 0;
  }
  dispose() { this.world.dyn.remove(this.group); this.group.traverse((o) => { const g = o.geometry; if (g && !g.userData.keep && g.dispose) g.dispose(); }); const k = this.world.facers.indexOf(this.body); if (k >= 0) this.world.facers.splice(k, 1); }
  // Play an action loop (hoe, water, fish) for `secs`, if there is art for it.
  play(action, secs = 0.9) { if (this.acts && this.acts[action]) { this.act = action; this.actT = secs; } }
  // Show the held tool (or nothing) in her hand.
  setTool(id) {
    if (this.toolId === id) return; this.toolId = id; this.wantTool = id; this.applyTool();
  }
  applyTool() {
    const l = this.body && this.body.userData.limbs; if (!l || !l.B) return;
    if (this.tool) { this.tool.parent && this.tool.parent.remove(this.tool); this.tool = null; }
    const t = this.wantTool && toolMesh(this.wantTool); if (!t) return;
    if (this.rigged) { const H = this.rigH || 1; t.scale.setScalar(H / this.tall * 1.1); t.position.set(0.2 * H, -0.17 * H, 0.03 * H); t.rotation.z = 0.5; }
    else { t.scale.setScalar(1.52 / this.tall); t.position.set(0, -0.31, 0.03); t.rotation.z = -0.22; }
    l.B.add(t); this.tool = t;
  }
  face(x, y) { const dx = x - this.x, dy = y - this.y; this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); }
  update(dt, world) {
    this.group.position.set(this.x, 0, this.y);
    this.phase += dt * (this.moving ? (this.running ? 15 : 9) : 1.6);   // running: a quicker, longer stride (2026-11-22)
    const [dx, dz] = DIRV[this.dir], fa = Math.atan2(dx, dz);
    if (this.mode === 'figure' || this.mode === 'model') {
      let d = fa - this.body.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); this.body.rotation.y += d * Math.min(1, dt * 14);
      const l = this.body.userData.limbs, s = this.moving ? Math.sin(this.phase) * (this.running ? 1.05 : 0.7) : 0;
      if (l) { l.L.rotation.x = s; l.R.rotation.x = -s; l.A.rotation.x = -s * 0.8; l.B.rotation.x = s * 0.8 - (this.swing || 0) * 2.2; if (l.head) { l.head.rotation.z = this.moving ? Math.sin(this.phase) * 0.05 : Math.sin(this.phase * 0.6) * 0.025; l.head.rotation.x = this.swing ? this.swing * 0.25 : 0; } }
      if (this.body.userData.blink) this.body.userData.blink((this.phase * 0.37) % 4.2 > 4.05 || (this.world.t * 0.9 + this.tall * 7) % 3.7 > 3.58);
      this.body.position.y = this.moving ? Math.abs(Math.sin(this.phase)) * (this.running ? 0.09 : 0.05) : Math.sin(this.phase * 0.6) * 0.008;
      this.lean = (this.lean || 0) + (((this.moving && this.running) ? 0.22 : 0) - (this.lean || 0)) * Math.min(1, dt * 10);   // a runner leans into it
      if (this.inner) this.inner.rotation.x = this.lean; else if (l) this.body.rotation.x = this.lean;
      if (this.inner && !this.rigged) {                  // a model with no joints moves like a little toy: hop, waddle, lean
        const k = this.moving ? 1 : 0, w = Math.sin(this.phase);
        this.inner.position.y = k * Math.abs(w) * 0.07; this.inner.rotation.z = k * w * 0.075; this.inner.rotation.x = k * 0.07 + (this.swing || 0) * 0.3 + (this.lean || 0);
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
