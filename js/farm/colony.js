// Sato's Harvest: the space-colony look (docs/FARM.md §1, §5). Eden's Upper deck is the inside of a
// turning cylinder: the land curves up on both sides and over the top, the sun-line runs along the
// axis overhead, and a long window band shows the stars (and a sliver of the Earth) after dusk.
// This module builds that sky, the terraced land beyond each map's edge, the built stand-ins for
// the colony's props (solar panels, hydroponic towers, lamps, pipes, the lift kiosk…) and the little
// maintenance bots. Every art slot it reads has a procedural fallback, so it works with no art.
import * as THREE from 'three';
import * as art from './art.js';

// The cylinder: radius, the angle (from the bottom) where the terraced valley meets the curved land,
// the window band (angles from the bottom, on the north side), and its length along x.
export const COLONY = { R: 350, theta0: 0.55, win: [0.64, 0.92], len: 6000, period: 160 };
const yC = COLONY.R - 8;                                                     // the axis height (the floor of the cylinder is 8 below the map)
export const SEAM = { z: COLONY.R * Math.sin(COLONY.theta0), y: yC - COLONY.R * Math.cos(COLONY.theta0) };
const SEASON_LEAF = [0x9ed06a, 0x4f9a3a, 0xd0792a, 0xe2ebf0];

// ---------------------------------------------------------------- shared bits: haze, glow, materials
// One set of uniforms drives the haze on everything far away (sky, walls, terrain), so seams vanish.
export const U = {
  haze: { value: new THREE.Color(0xb4cde6) }, hazeNear: { value: 40 }, hazeFar: { value: 420 }, hazeCap: { value: 0.6 },
  tint: { value: new THREE.Color(1, 1, 1) }, day: { value: 1 }, dusk: { value: 0 }, night: { value: 0 },
};
// Soft colony lights: shared materials, brightened at night by setColonyTime().
export const GLOW = { cyan: new THREE.MeshBasicMaterial({ color: 0x7fe9ff }), warm: new THREE.MeshBasicMaterial({ color: 0xfff0c8 }), screen: new THREE.MeshBasicMaterial({ color: 0x7fe9ff }) };
const matCache = new Map(), geoCache = new Map(), texCache = new Map();
function M(color, o = {}) { const k = color + '|' + JSON.stringify(o); let m = matCache.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o }); matCache.set(k, m); } return m; }
function TM(key, make) { let m = matCache.get(key); if (!m) { m = make(); matCache.set(key, m); } return m; }
function G(key, make) { let g = geoCache.get(key); if (!g) { g = make(); g.userData.keep = true; geoCache.set(key, g); } return g; }
const CREAM = () => M(0xf3ecdc), TEAL = () => M(0x5fb3b0), CORAL = () => M(0xf08a6c), SLATE = () => M(0x4a5a66, { metalness: 0.3, roughness: 0.55 }), STEEL = () => M(0xa9b8c0, { metalness: 0.35, roughness: 0.5 });
const GLASS = () => TM('glass', () => new THREE.MeshStandardMaterial({ color: 0xcff3f6, transparent: true, opacity: 0.28, roughness: 0.08, metalness: 0.1, depthWrite: false }));
function mesh(geo, mat, x = 0, y = 0, z = 0, cast = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; return m; }
function bx(w, h, d, mat, x = 0, y = 0, z = 0) { const m = mesh(G('box', () => new THREE.BoxGeometry(1, 1, 1)), mat, x, y + h / 2, z); m.scale.set(w, h, d); return m; }
function cy(r0, r1, h, mat, x = 0, y = 0, z = 0, seg = 12) { return mesh(G(`cy${r0},${r1},${h},${seg}`, () => new THREE.CylinderGeometry(r0, r1, h, seg)), mat, x, y + h / 2, z); }
function sp(r, mat, x = 0, y = 0, z = 0, detail = 1) { return mesh(G(`sp${r},${detail}`, () => new THREE.IcosahedronGeometry(r, detail)), mat, x, y, z); }
function canvasTex(key, w, h, paint, repeat = null) {
  const k = key + (repeat ? '|' + repeat.join(',') : ''); if (texCache.has(k)) return texCache.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  texCache.set(k, t); return t;
}
const hashN = (n) => { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

// The sky, the walls and the far land use a small shader: lit by the colony's schedule, hazed with distance.
const VS = `varying vec2 vUv; varying vec3 vW; varying float vDepth;
void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 v = viewMatrix * w; vDepth = -v.z; gl_Position = projectionMatrix * v; }`;
const FS_HEAD = `uniform vec3 haze; uniform float hazeNear, hazeFar, hazeCap, day, dusk, night; uniform vec3 tint;
varying vec2 vUv; varying vec3 vW; varying float vDepth;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 finish(vec3 c) { float f = smoothstep(hazeNear, hazeFar, vDepth) * hazeCap; f = max(f, smoothstep(1300.0, 2900.0, abs(vW.x - cameraPosition.x))); return mix(c, haze, f); }`;
const FS_TAIL = `#include <tonemapping_fragment>
#include <colorspace_fragment>`;
function hazeMat(fs, uniforms = {}, o = {}) {
  return new THREE.ShaderMaterial({ uniforms: { ...U, ...uniforms }, vertexShader: VS, fragmentShader: FS_HEAD + fs, side: THREE.BackSide, fog: false, depthWrite: true, ...o });
}

// ---------------------------------------------------------------- procedural pictures
// The far land: patchwork fields, hedges, a meandering river, roads and tiny towns, seamless.
function paintLand(g, N, lights) {
  const r = (() => { let s = 1234567; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); })();
  g.fillStyle = lights ? '#000' : '#6faa52'; g.fillRect(0, 0, N, N);
  const towns = [[0.18, 0.22], [0.62, 0.58], [0.84, 0.12], [0.36, 0.86]];
  if (!lights) {
    const pal = ['#78b357', '#8cc266', '#5f9c48', '#a9c96a', '#c9c27a', '#6fa85a', '#97b86a', '#e0cf8a', '#4f8a40'];
    let y = 0;
    while (y < N) {                                                             // rows of fields; widths sum to N, so it tiles
      const rh = Math.min(N - y, 40 + Math.floor(r() * 70)); let x = 0;
      while (x < N) { const fw = Math.min(N - x, 50 + Math.floor(r() * 110)); g.fillStyle = pal[Math.floor(r() * pal.length)]; g.fillRect(x, y, fw, rh);
        if (r() < 0.45) { g.globalAlpha = 0.18; g.fillStyle = '#2f5a2a'; for (let k = 4; k < (r() < 0.5 ? fw : rh); k += 7) r() < 0.5 ? g.fillRect(x + k, y, 2, rh) : g.fillRect(x, y + k, fw, 2); g.globalAlpha = 1; }
        g.strokeStyle = 'rgba(40,70,35,.55)'; g.lineWidth = 3; g.strokeRect(x + 1, y + 1, fw - 2, rh - 2); x += fw; }
      y += rh;
    }
    for (let i = 0; i < 26; i++) {                                              // woods
      const cx = r() * N, cy = r() * N, rad = 18 + r() * 40;
      for (let k = 0; k < 40; k++) { const a = r() * 6.28, d = r() * rad; g.fillStyle = r() < 0.5 ? '#3f7a3a' : '#4d8c42'; g.beginPath(); for (const ox of [0, N, -N]) for (const oy of [0, N, -N]) { g.moveTo(cx + Math.cos(a) * d + ox + 7, cy + Math.sin(a) * d + oy); g.arc(cx + Math.cos(a) * d + ox, cy + Math.sin(a) * d + oy, 6 + r() * 6, 0, 7); } g.fill(); }
    }
  }
  // the river runs along the cylinder (texture y), with a road beside it
  const riverX = (y) => N * 0.42 + Math.sin(y / N * Math.PI * 2) * N * 0.12 + Math.sin(y / N * Math.PI * 6) * N * 0.03;
  if (!lights) {
    g.strokeStyle = '#d9c79a'; g.lineWidth = 16; g.beginPath(); for (let y = -4; y <= N + 4; y += 4) g.lineTo(riverX(y), y); g.stroke();
    g.strokeStyle = '#4f9fc4'; g.lineWidth = 11; g.beginPath(); for (let y = -4; y <= N + 4; y += 4) g.lineTo(riverX(y), y); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); for (let y = -4; y <= N + 4; y += 4) g.lineTo(riverX(y) - 2, y); g.stroke();
  }
  g.strokeStyle = lights ? 'rgba(255,214,140,.35)' : '#cdbb94'; g.lineWidth = lights ? 2 : 4; g.setLineDash(lights ? [3, 9] : []);
  g.beginPath(); for (let y = -4; y <= N + 4; y += 4) g.lineTo(riverX(y) + 34 + Math.sin(y / 60) * 6, y); g.stroke();
  g.beginPath(); g.moveTo(0, N * 0.3); g.bezierCurveTo(N * 0.3, N * 0.25, N * 0.6, N * 0.4, N, N * 0.3); g.stroke(); g.setLineDash([]);
  for (const [tx, ty] of towns) {                                              // little towns: roofs by day, windows at night
    for (let k = 0; k < 38; k++) {
      const a = r() * 6.28, d = Math.pow(r(), 0.7) * 46, x = tx * N + Math.cos(a) * d, y = ty * N + Math.sin(a) * d * 0.8, w = 5 + r() * 7, h = 4 + r() * 5;
      if (lights) { g.fillStyle = r() < 0.75 ? `rgba(255,${200 + Math.floor(r() * 40)},130,.95)` : 'rgba(150,230,255,.9)'; g.fillRect(x, y, 2 + r() * 2, 2 + r() * 2); }
      else { g.fillStyle = '#f2ead8'; g.fillRect(x, y, w, h); g.fillStyle = ['#c9583a', '#5fa3b3', '#d98a4a', '#7a8ea8', '#b8483c'][Math.floor(r() * 5)]; g.fillRect(x, y, w, h * 0.55); }
    }
  }
}
function landTexture(lights) {
  const t = canvasTex(lights ? 'land_lights' : 'land', 1024, 1024, (g, N) => paintLand(g, N, lights));
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t;
}
function picTex(slot) { const p = art.pic(slot); if (!p) return null; p.tex.wrapS = p.tex.wrapT = THREE.RepeatWrapping; return p.tex; }
function paintPanel(g, w, h) { g.fillStyle = '#e8eef2'; g.fillRect(0, 0, w, h); for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) { const gr = g.createLinearGradient(0, 0, w / 4, h / 2); gr.addColorStop(0, '#2c4f8c'); gr.addColorStop(1, '#1b335e'); g.fillStyle = gr; g.fillRect(x * w / 4 + 3, y * h / 2 + 3, w / 4 - 6, h / 2 - 6); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x * w / 4 + 3, y * h / 2 + 3, w / 4 - 6, 4); } }
function paintHazard(g, w, h) { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2b2b'; for (let i = -h; i < w + h; i += 24) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 12, 0); g.lineTo(i + 12 - h, h); g.lineTo(i - h, h); g.fill(); } }
function paintPlates(g, w, h) { g.fillStyle = '#8a98a6'; g.fillRect(0, 0, w, h); let s = 7; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 128 + Math.floor(r() * 26); g.fillStyle = `rgb(${v - 10},${v + 2},${v + 14})`; g.fillRect(x * w / 4 + 2, y * h / 4 + 2, w / 4 - 4, h / 4 - 4); g.fillStyle = 'rgba(40,50,60,.5)'; for (const [a, b] of [[6, 6], [w / 4 - 8, 6], [6, h / 4 - 8], [w / 4 - 8, h / 4 - 8]]) g.fillRect(x * w / 4 + a, y * h / 4 + b, 3, 3); } }
function paintStripes(g, w, h, a, b) { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * w / 8, 0, w / 8, h); } g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h - 6, w, 6); }
function paintSign(g, w, h, text) { g.fillStyle = '#2f6f78'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f3ecdc'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#f3ecdc'; g.font = `700 ${Math.floor(h * 0.5)}px "Chakra Petch", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); }
function paintGlow(g, w, h) { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
// A textured hull material for walls and ribs: art slot textures/hull_plate, else painted plates.
function hullTex() { return art.has('textures/hull_plate') ? art.tex('hull_plate', { repeat: 1 }) : canvasTex('plates', 256, 256, paintPlates); }

// ---------------------------------------------------------------- the sky
export class ColonySky {
  constructor(scene) {
    const { R, theta0, win, len, period } = COLONY, g = this.group = new THREE.Group(); scene.add(g);
    const seg = (t0, tl, mat, r = R, n = 96) => { const geo = new THREE.CylinderGeometry(r, r, len, n, 1, true, t0, tl); geo.rotateZ(Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.position.y = yC; m.frustumCulled = false; m.renderOrder = -5; g.add(m); return m; };
    // theta: world y = r sin θ, z = r cos θ (after the turn onto the x axis); the floor is at θ = 3π/2.
    const B = 1.5 * Math.PI, south = B + theta0, nw1 = B - win[1] + 2 * Math.PI, nw0 = B - win[0] + 2 * Math.PI, north = B - theta0 + 2 * Math.PI;
    const day = null, dusk = null, nightP = null;                // the colony paintings are axis views: see the far ends below
    const landFS = `uniform sampler2D map, lights, duskMap, nightMap; uniform vec2 rep;
void main() { vec2 uv = vec2(vUv.x * rep.x, vW.x / rep.y); vec3 c = texture2D(map, uv).rgb * tint;
  #ifdef HAS_DUSK
  c = mix(c, texture2D(duskMap, uv).rgb, dusk * 0.7);
  #endif
  #ifdef HAS_NIGHT
  c = mix(c, texture2D(nightMap, uv).rgb, night);
  #else
  c += texture2D(lights, uv).rgb * night * 1.15;
  #endif
  gl_FragColor = vec4(finish(c), 1.0);
  ${FS_TAIL} }`;
    const land = (tl) => hazeMat(landFS, { map: { value: day || landTexture(false) }, lights: { value: landTexture(true) }, duskMap: { value: dusk }, nightMap: { value: nightP }, rep: { value: new THREE.Vector2(R * tl / period, period) } }, { defines: { ...(dusk ? { HAS_DUSK: 1 } : {}), ...(nightP ? { HAS_NIGHT: 1 } : {}) } });
    seg(south, nw1 - south, land(nw1 - south));
    seg(nw0, north - nw0, land(north - nw0), R, 24);
    // the window band: pale glass by day; stars and a sliver of the Earth after dusk (art: textures/glass_window)
    const gw = picTex('textures/glass_window'), arcW = R * (win[1] - win[0]);
    const winFS = `uniform sampler2D map; uniform float arcW;
void main() {
  float along = vW.x - cameraPosition.x, across = (vUv.x - 0.5) * arcW;
  vec2 sc = vec2(vW.x, across) / 5.0; vec2 cell = floor(sc); float h = hash(cell); vec2 f = fract(sc) - 0.5;
  float star = step(0.93, h) * smoothstep(0.3, 0.0, length(f)) * (0.45 + 0.55 * hash(cell + 7.0));
  vec3 space = vec3(0.012, 0.02, 0.05) + vec3(star) * vec3(0.9, 0.95, 1.0);
  #ifdef HAS_MAP
  space = texture2D(map, vec2(vW.x / 90.0, 1.0 - 0.68 * vUv.x)).rgb;
  #endif
  {
  vec2 e = vec2(along + 60.0, across - arcW * 0.5 - 30.0) / 78.0; float r = length(e);
  if (r < 1.0) { vec3 n = vec3(e, sqrt(1.0 - r * r)); float lit = clamp(dot(n, normalize(vec3(-0.75, 0.55, 0.35))), 0.0, 1.0);
    float landN = step(0.58, hash(floor(e * 7.0 + 3.0)) * 0.6 + hash(floor(e * 15.0)) * 0.4);
    vec3 surf = mix(vec3(0.10, 0.32, 0.62), vec3(0.55, 0.47, 0.30), landN * 0.8); surf = mix(surf, vec3(0.95), step(0.82, hash(floor(e * 11.0 + 9.0))) * 0.6);
    space = mix(space, surf * (0.05 + 1.1 * lit), 1.0); }
  float rim = smoothstep(1.09, 1.0, r) * smoothstep(0.93, 1.0, r); space += vec3(0.35, 0.6, 1.0) * rim * 0.8;
  }
  vec3 glass = mix(vec3(0.62, 0.78, 0.95), vec3(0.98, 0.70, 0.55), dusk);
  float show = clamp(night + dusk * 0.55, 0.0, 1.0);
  vec3 c = mix(glass * (0.5 + 0.45 * day), space, show);
  float frame = max(step(arcW * 0.5 - 2.2, abs(across)), step(fract(vW.x / 48.0), 0.035)); frame = max(frame, step(abs(across), 0.6));
  c = mix(c, mix(vec3(0.42, 0.48, 0.55) * (0.25 + 0.75 * day), vec3(0.35, 0.75, 0.85), night * 0.5), frame);
  gl_FragColor = vec4(mix(c, finish(c), 0.55), 1.0);
  ${FS_TAIL} }`;
    this.window = seg(nw1, nw0 - nw1, hazeMat(winFS, { map: { value: gw }, arcW: { value: arcW } }, { defines: gw ? { HAS_MAP: 1 } : {} }), R, 16);
    // the far ends of the tunnel (art: sky/sky_colony_day, _dusk, _night: an axis view mirrored into a
    // panorama; each half is cropped round its vanishing point and set far down the axis, so the mirror
    // joints never show). Without the art the haze simply closes the tunnel.
    const pd = picTex('sky/sky_colony_day');
    if (pd) {
      const pk = picTex('sky/sky_colony_dusk') || pd, pn = picTex('sky/sky_colony_night') || pd;
      const capFS = `uniform sampler2D pDay, pDusk, pNight; uniform float side;
void main() { vec2 q = vUv - vec2(0.5, 0.36); vec2 uv = vec2(0.32 + side * 0.36 + q.x * 0.36 * (side > 0.5 ? -1.0 : 1.0), max(0.01, 0.234 + q.y * 0.6));
  vec3 c = texture2D(pDay, uv).rgb * (1.0 - dusk) * day + texture2D(pDusk, uv).rgb * dusk + texture2D(pNight, uv).rgb * night;
  float a = 1.0 - smoothstep(0.22, 0.5, length(q * vec2(1.0, 1.15)));
  gl_FragColor = vec4(mix(c, haze, 0.35 + 0.25 * night), a);
  ${FS_TAIL} }`;
      this.caps = [0, 1].map((side) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1300, 1180), hazeMat(capFS, { pDay: { value: pd }, pDusk: { value: pk }, pNight: { value: pn }, side: { value: side } }, { side: THREE.DoubleSide, transparent: true, depthWrite: false }));
        m.rotation.y = side ? -Math.PI / 2 : Math.PI / 2; m.renderOrder = -3; m.frustumCulled = false; m.userData.dir = side ? 1 : -1; g.add(m); return m; });
    }
    // the sun-line along the axis, and its glow
    this.sunMat = new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: false, toneMapped: false });
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, fog: false, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    for (const [r, m] of [[1.3, this.sunMat], [3.5, this.glowMat], [9, this.glowMat]]) { const geo = new THREE.CylinderGeometry(r, r, len, 16, 1, true); geo.rotateZ(Math.PI / 2); const s = new THREE.Mesh(geo, m); s.position.y = yC; s.frustumCulled = false; s.renderOrder = -4; g.add(s); }
    // the hull ribs: great rings that hold the cylinder, every 240 units, with lights
    const ribFS = `uniform sampler2D map;
void main() { vec3 c = texture2D(map, vec2(vUv.x * 900.0, vUv.y)).rgb * (0.55 + 0.45 * sin(vUv.y * 6.2832)) * (0.35 + 0.65 * day + dusk * 0.2);
  float l = step(0.985, fract(vUv.x * 260.0)) * step(0.4, vUv.y) * step(vUv.y, 0.6); c = mix(c, vec3(0.5, 0.95, 1.0), l * (0.4 + 0.6 * night));
  gl_FragColor = vec4(finish(c), 1.0);
  ${FS_TAIL} }`;
    const hull = hullTex(); this.ribs = [];
    const ribMat = hazeMat(ribFS, { map: { value: hull } }, { side: THREE.FrontSide });
    const ribGeo = new THREE.TorusGeometry(R - 3, 3.4, 8, 160, 2 * Math.PI - 2 * theta0); ribGeo.rotateZ(1.5 * Math.PI + theta0); ribGeo.rotateY(Math.PI / 2);
    for (let i = -12; i <= 12; i++) { const m = new THREE.Mesh(ribGeo, ribMat); m.position.set(-90 + i * 240, yC, 0); m.frustumCulled = false; g.add(m); this.ribs.push(m); }
    // the ring walls where the terraced valley ends and the curving land begins
    const wallFS = `uniform sampler2D map;
void main() { vec3 c = texture2D(map, vec2(vW.x, vW.y) / 9.0).rgb * (0.5 + 0.5 * day + dusk * 0.15);
  float l = step(0.9, fract(vW.x / 14.0)) * step(abs(vW.y - ${(SEAM.y - 1.5).toFixed(1)}), 0.5); c = mix(c, vec3(0.55, 0.95, 1.0), l * (0.3 + 0.7 * night));
  gl_FragColor = vec4(finish(c), 1.0);
  ${FS_TAIL} }`;
    const wallMat = hazeMat(wallFS, { map: { value: hull } }, { side: THREE.FrontSide });
    this.walls = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(len, 15, 5), wallMat); m.position.set(0, SEAM.y - 9, s * (SEAM.z + 1.5)); m.frustumCulled = false; g.add(m); return m; });
  }
  setCentre(zc) { this.group.position.z = zc; }
  // day 0..1, dusk 0..1, night 0..1, wet: the colony dims the sun-line for rain days
  setTime(day, dusk, night, wet) {
    U.day.value = day; U.dusk.value = dusk; U.night.value = night;
    const t = U.tint.value.setRGB(1, 1, 1).multiplyScalar(0.13 + 0.87 * day).lerp(new THREE.Color(1.0, 0.72, 0.55), dusk * 0.45);
    if (night > 0.5) t.lerp(new THREE.Color(0.10, 0.13, 0.26), (night - 0.5) * 2 * 0.6);
    if (wet) t.multiplyScalar(0.75);
    this.sunMat.color.setRGB(1, 0.97, 0.86).lerp(new THREE.Color(1.0, 0.62, 0.32), dusk * 0.8).lerp(new THREE.Color(0.32, 0.46, 0.85), night);
    this.glowMat.color.copy(this.sunMat.color); this.glowMat.opacity = 0.05 + 0.13 * day + 0.06 * dusk;
  }
  update(camera) {
    for (const c of this.caps || []) c.position.set(camera.position.x + c.userData.dir * 1500, camera.position.y + 1180 * 0.14, camera.position.z - this.group.position.z); this.group.position.x = 0; for (const k of ['window']) this[k].position.x = camera.position.x; for (const w of this.walls) w.position.x = camera.position.x; for (const c of this.group.children) if (c.geometry && c.geometry.type === 'CylinderGeometry') c.position.x = camera.position.x; }
}

// ---------------------------------------------------------------- the land beyond a map's edge
// Flat under the map, then terraces climbing to the ring walls on both sides (the cylinder's curve),
// and gentle terraced hills off the map's other two edges. Farms, woods and hamlets on the terraces.
export function buildSurroundings(map, season) {
  const W = map.w, H = map.h, xc = W / 2, zc = H / 2, halfW = W / 2 + 2.5, halfH = H / 2 + 2.5, Lz = SEAM.z - halfH, yE = SEAM.y;
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const height = (x, z) => {
    const dz = Math.abs(z - zc) - halfH, dx = Math.abs(x - xc) - halfW; let y = 0;
    if (dz > 0) { const t = Math.min(1, dz / Lz), N = 6, s = t * N, k = Math.floor(s), f = s - k, st = (k + sm(0.5, 1, f)) / N, tt = st + (t - st) * t * t; y = yE * tt * tt; }
    if (dx > 0) { const t = Math.min(1, dx / 56), k = Math.floor(t * 3), f = t * 3 - k, st = Math.min(1, (k + sm(0.55, 1, f)) / 3); y = Math.max(y, (4.5 + 2.5 * Math.sin(z * 0.06 + x * 0.011)) * st); }
    return y;
  };
  const xs = [], zs = [];
  for (let x = xc - halfW - 160; x <= xc + halfW + 160; x += 4) xs.push(x);
  for (let x = xs[0], s = 6; x > -3000; s *= 1.22) xs.unshift(x -= s);
  for (let x = xs[xs.length - 1], s = 6; x < 3000 + W; s *= 1.22) xs.push(x += s);
  for (let z = zc - SEAM.z; z <= zc + SEAM.z + 0.01; z += 2.5) zs.push(z);
  const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), colr = new Float32Array(nx * nz * 3);
  const leaf = new THREE.Color(season === 3 ? 0xe9eef2 : [0xa6d47a, 0x7fbf5a, 0xc9b25a, 0xe9eef2][season]);
  const pal = season === 3 ? [0xf2f5f7, 0xe3eaee, 0xd7e0e6] : [[0xa6d47a, 0x8cc266, 0xc9d67a, 0x78b357, 0xe8d79a], [0x6fb04f, 0x88c25e, 0xd9c26a, 0x5f9c48, 0xa9c96a], [0xc9a24e, 0xb88a3e, 0xd9b45a, 0x9a8a4a, 0xe0c27a]][season];
  const rock = new THREE.Color(season === 3 ? 0xb7c0c6 : 0x9c8a68), tmp = new THREE.Color();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = xs[i], z = zs[j], y = height(x, z), k = (j * nx + i);
    pos[k * 3] = x; pos[k * 3 + 1] = y - 0.07; pos[k * 3 + 2] = z; uv[k * 2] = x * 0.25; uv[k * 2 + 1] = -z * 0.25;
    const dz = Math.abs(z - zc) - halfH, band = dz > 0 ? Math.floor(Math.min(1, dz / Lz) * 6) : -1;
    const slope = Math.abs(height(x, z + 1.2) - height(x, z - 1.2)) / 2.4 + Math.abs(height(x + 1.2, z) - height(x - 1.2, z)) / 2.4;
    tmp.set(dz > 0 || Math.abs(x - xc) > halfW ? pal[Math.floor(hashN(band * 131 + Math.floor((x + 4000) / (14 + (band & 3) * 5)) * 7 + (z > zc ? 3 : 0)) * pal.length)] : 0xffffff);
    if (dz > 0 || Math.abs(x - xc) > halfW) tmp.lerp(leaf, 0.35);
    tmp.lerp(rock, Math.min(1, Math.max(0, (slope - 0.35) * 1.6)));
    colr[k * 3] = tmp.r * 1.2; colr[k * 3 + 1] = tmp.g * 1.2; colr[k * 3 + 2] = tmp.b * 1.2;
  }
  const idx = []; for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const gslot = season !== 3 && art.has('textures/grass_colony') ? 'grass_colony' : 'grass_' + ['spring', 'summer', 'autumn', 'winter'][season];
  const mat = new THREE.MeshStandardMaterial({ map: art.tex(gslot, { repeat: 1 }), vertexColors: true, roughness: 0.95 });
  capFog(mat);
  const out = new THREE.Group(), ground = new THREE.Mesh(geo, mat); ground.receiveShadow = true; ground.frustumCulled = false; out.add(ground);
  // woods and lone trees, as two instanced meshes; hamlets of little houses on the terraces
  const trees = [], houses = [];
  for (let i = 0; i < 9000 && trees.length < 1800; i++) {
    const x = xc + (hashN(i * 3 + 1) - 0.5) * 760, z = zc + (hashN(i * 3 + 2) - 0.5) * 2 * (SEAM.z - 6);
    if (Math.abs(x - xc) < halfW + 1.5 && Math.abs(z - zc) < halfH + 1.5) continue;
    const wood = Math.sin(x * 0.045 + Math.sin(z * 0.03) * 2) * Math.cos(z * 0.05 - x * 0.012) > 0.25;
    if (!wood && hashN(i * 7 + 5) > 0.12) continue;
    const y = height(x, z), sl = Math.abs(height(x, z + 1) - height(x, z - 1)); if (sl > 0.9) continue;
    trees.push([x, y, z, 0.8 + hashN(i * 11) * 0.8]);
  }
  for (let h = 0; h < 14; h++) {
    const side = h % 2 ? 1 : -1, t = 0.2 + hashN(h * 17) * 0.62, cx = xc + (hashN(h * 19) - 0.5) * 420, cz = zc + side * (halfH + t * Lz);
    for (let k = 0; k < 7; k++) { const x = cx + (hashN(h * 31 + k) - 0.5) * 22, z = cz + (hashN(h * 37 + k) - 0.5) * 6; if (Math.abs(x - xc) < halfW + 4 && Math.abs(z - zc) < halfH + 4) continue; houses.push([x, height(x, z), z, hashN(h * 41 + k)]); }
  }
  const q = new THREE.Object3D(), c2 = new THREE.Color();
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 1.6, 6).translate(0, 0.8, 0), M(0x6b4a30), trees.length);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.25, 1).translate(0, 2.5, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), trees.length);
  trees.forEach(([x, y, z, s], i) => { q.position.set(x, y - 0.1, z); q.scale.set(s, s * (0.9 + hashN(i) * 0.4), s); q.rotation.y = i; q.updateMatrix(); trunk.setMatrixAt(i, q.matrix); crown.setMatrixAt(i, q.matrix); crown.setColorAt(i, c2.set(SEASON_LEAF[season]).multiplyScalar(0.75 + hashN(i * 5) * 0.4).lerp(c2.clone().set(season === 2 ? 0xc0442a : season === 0 ? 0xf2a0b8 : 0x3f7a3a), season === 1 ? 0.2 : hashN(i * 9) < 0.3 ? 0.5 : 0)); });
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), houses.length);
  const roofs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.78, 0.7, 4).rotateY(Math.PI / 4).translate(0, 0.35, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), houses.length);
  houses.forEach(([x, y, z, r], i) => { const w = 2 + r * 1.2; q.position.set(x, y - 0.1, z); q.rotation.y = 0; q.scale.set(w, 1.6, 1.8); q.updateMatrix(); walls.setMatrixAt(i, q.matrix); walls.setColorAt(i, c2.set([0xf6efe0, 0xeee3cc, 0xe8f0f2][i % 3]));
    q.position.y = y + 1.5; q.scale.set(w * 0.92, 1.4, 1.8 * 1.25); q.updateMatrix(); roofs.setMatrixAt(i, q.matrix); roofs.setColorAt(i, c2.set([0xc9583a, 0x5fa3b3, 0xd98a4a, 0x7a8ea8, 0xb8483c][Math.floor(r * 5)])); });
  for (const m of [trunk, crown, walls, roofs]) { m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; out.add(m); }
  return out;
}
// Far things in the near scene are hazed like the sky (capped), so the valley floor and the walls agree.
export function capFog(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.hazeCap = U.hazeCap;
    sh.fragmentShader = 'uniform float hazeCap;\n' + sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
      float fogFactor = min(smoothstep(fogNear, fogFar, vFogDepth), hazeCap);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
    #endif`);
  };
  mat.customProgramCacheKey = () => 'capfog';
}
// Colony lights by the time of day (the shared glow materials).
export function setColonyTime(night) {
  GLOW.cyan.color.setRGB(0.32, 0.62, 0.66).lerp(new THREE.Color(0.55, 1.0, 1.0), night);
  GLOW.warm.color.setRGB(0.92, 0.88, 0.78).lerp(new THREE.Color(1.0, 0.86, 0.55), night).multiplyScalar(1);
  GLOW.screen.color.setRGB(0.45, 0.85, 0.95).lerp(new THREE.Color(0.6, 1.0, 1.0), night);
}

// ---------------------------------------------------------------- the colony's props, built
// kind → a group standing on y = 0, centred on its footprint (w × d tiles). `fx` collects moving
// parts ({ o, axis, speed }) and lamp glows ({ x, z, warm }) in the prop's own coordinates.
export const COLONY_KINDS = new Set(['airlock_door', 'solar_panel', 'hydro_tower', 'colony_lamp', 'pipe_run', 'vent', 'maint_bot', 'cargo_crate', 'lift_kiosk', 'water_tank', 'wind_turbine_small', 'noticeboard', 'fountain', 'fan_tower', 'market_stall']);
export function colonyProp(kind, o = {}, fx = { spin: [], glow: [] }) {
  const g = new THREE.Group(), w = o.w || 1, d = o.d || 1;
  switch (kind) {
    case 'solar_panel': {
      const W = w * 0.94, frame = M(0xe9edf0, { metalness: 0.2 });
      for (const sx of [-1, 1]) { g.add(bx(0.07, 0.62, 0.07, frame, sx * W * 0.38, 0, 0.22), bx(0.07, 1.02, 0.07, frame, sx * W * 0.38, 0, -0.22)); }
      const p = new THREE.Group(); p.position.set(0, 0.86, 0); p.rotation.x = 0.42;
      const face = TM('panel' + w, () => new THREE.MeshStandardMaterial({ map: canvasTex('panel', 256, 128, paintPanel, [w, 1]), roughness: 0.3, metalness: 0.35 }));
      p.add(bx(W, 0.06, 0.92, frame, 0, -0.03), mesh(G('pl' + w, () => new THREE.PlaneGeometry(W - 0.06, 0.86).rotateX(-Math.PI / 2)), face, 0, 0.035, 0, false));
      p.add(bx(0.12, 0.04, 0.12, GLOW.cyan, W / 2 - 0.12, 0.04, 0.4)); g.add(p); break;
    }
    case 'hydro_tower': {
      g.add(cy(0.34, 0.38, 0.26, CREAM()), cy(0.36, 0.36, 0.05, GLOW.cyan, 0, 0.26), cy(0.27, 0.27, 1.6, GLASS(), 0, 0.3, 0, 14), cy(0.05, 0.05, 1.6, M(0xffffff), 0, 0.3));
      const leaf = M(0x5fae4a), leaf2 = M(0x7fc65a);
      for (let i = 0; i < 9; i++) { const a = i * 2.2, y = 0.45 + i * 0.16; g.add(sp(0.12 + (i % 3) * 0.02, i % 2 ? leaf : leaf2, Math.cos(a) * 0.14, y, Math.sin(a) * 0.14, 0)); if (i % 3 === 1) g.add(sp(0.045, M(i % 2 ? 0xe2463a : 0xf2c230), Math.cos(a) * 0.2, y - 0.05, Math.sin(a) * 0.2, 0)); }
      g.add(cy(0.3, 0.3, 0.12, CREAM(), 0, 1.9), cy(0.18, 0.28, 0.12, TEAL(), 0, 2.02), cy(0.035, 0.035, 0.3, STEEL(), 0.2, 1.9, 0.2, 6)); break;
    }
    case 'colony_lamp': {
      g.add(cy(0.17, 0.21, 0.16, TEAL()), cy(0.055, 0.075, 2.3, CREAM(), 0, 0.16, 0, 8), cy(0.085, 0.085, 0.07, GLOW.cyan, 0, 1.1, 0, 10));
      g.add(bx(0.5, 0.06, 0.07, CREAM(), 0.22, 2.36), cy(0.2, 0.12, 0.1, TEAL(), 0.44, 2.3, 0, 12));
      const b = sp(0.15, GLOW.warm, 0.44, 2.2, 0, 1); b.castShadow = false; g.add(b); fx.glow.push({ x: 0.44, z: 0, warm: true }); break;
    }
    case 'pipe_run': {
      const L = Math.max(w, d) * 0.98, along = new THREE.Group(), pipe = M(0xa9c3c8, { metalness: 0.3, roughness: 0.45 }), pipe2 = M(0x6fa8b0, { metalness: 0.3, roughness: 0.5 });
      const p1 = cy(0.15, 0.15, L, pipe, 0, -L / 2, 0, 12); p1.rotation.z = Math.PI / 2; p1.position.set(0, 0.46, -0.08); along.add(p1);
      const p2 = cy(0.08, 0.08, L, pipe2, 0, -L / 2, 0, 8); p2.rotation.z = Math.PI / 2; p2.position.set(0, 0.24, 0.2); along.add(p2);
      for (let x = -L / 2 + 0.5; x <= L / 2 - 0.4; x += 1.5) { along.add(bx(0.1, 0.46, 0.5, SLATE(), x, 0, 0.04)); const f = cy(0.2, 0.2, 0.07, CREAM(), 0, 0, 0, 12); f.rotation.z = Math.PI / 2; f.position.set(x + 0.75, 0.46, -0.08); along.add(f); }
      const wheel = new THREE.Mesh(G('valve', () => new THREE.TorusGeometry(0.14, 0.03, 6, 14)), CORAL()); wheel.position.set(0.1, 0.78, -0.08); wheel.rotation.x = Math.PI / 2; along.add(wheel, bx(0.04, 0.16, 0.04, STEEL(), 0.1, 0.6, -0.08));
      along.add(bx(0.1, 0.06, 0.1, GLOW.cyan, -0.3, 0.62, -0.08));
      if (d > w) along.rotation.y = Math.PI / 2; g.add(along); break;
    }
    case 'vent': {                                                   // a low cooling unit with a grille on top
      g.add(bx(0.86, 0.4, 0.86, M(0xb9c6cc, { metalness: 0.25 })), bx(0.9, 0.06, 0.9, CREAM(), 0, 0.4));
      for (let i = -2; i <= 2; i++) g.add(bx(0.7, 0.03, 0.07, M(0x2c3640), 0, 0.46, i * 0.14));
      g.add(bx(0.88, 0.05, 0.02, GLOW.cyan, 0, 0.2, 0.435)); break;
    }
    case 'maint_bot': {
      const body = sp(0.28, CREAM(), 0, 0.42, 0, 2); body.scale.set(1, 0.86, 1); g.add(body, cy(0.286, 0.286, 0.08, CORAL(), 0, 0.37, 0, 16));
      const face = mesh(G('botface', () => new THREE.CircleGeometry(0.15, 18)), M(0x1d2a3a), 0, 0.47, 0.262, false); face.rotation.x = -0.08; g.add(face);
      for (const sx of [-1, 1]) { const e = mesh(G('boteye', () => new THREE.CircleGeometry(0.035, 10)), GLOW.screen, sx * 0.055, 0.485, 0.27, false); g.add(e); const wh = cy(0.1, 0.1, 0.07, M(0x3a4048), 0, 0, 0, 12); wh.rotation.z = Math.PI / 2; wh.position.set(sx * 0.22, 0.1, 0); g.add(wh); }
      g.add(cy(0.012, 0.012, 0.22, STEEL(), 0.08, 0.66, 0, 4), sp(0.04, GLOW.warm, 0.08, 0.9, 0, 0)); break;
    }
    case 'cargo_crate': {
      const c = [0xf08a4c, 0x5fb3b0, 0xe8d9b0, 0x8fa46a][Math.floor(hashN(Math.floor(o.x * 13 + o.y * 7)) * 4)];
      g.add(bx(0.8, 0.76, 0.8, M(c)), bx(0.84, 0.12, 0.84, CREAM(), 0, 0.46));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(bx(0.09, 0.78, 0.09, SLATE(), x * 0.38, 0, z * 0.38));
      g.add(bx(0.3, 0.16, 0.01, M(0x2c3640), 0, 0.2, 0.405)); break;
    }
    case 'lift_kiosk': {
      g.add(bx(w * 0.98, 0.14, d * 0.98, M(0xb9c6cc, { metalness: 0.2 })), bx(w * 0.98, 0.03, 0.12, GLOW.cyan, 0, 0.14, d * 0.49 - 0.06));
      g.add(cy(0.95, 0.95, 0.14, CREAM(), 0, 0.14, -0.1, 24), cy(0.9, 0.9, 2.2, GLASS(), 0, 0.28, -0.1, 24), cy(0.95, 0.95, 0.12, CREAM(), 0, 2.45, -0.1, 24), cy(1.05, 0.9, 0.3, TEAL(), 0, 2.57, -0.1, 24));
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.26; g.add(bx(0.08, 2.2, 0.08, CREAM(), Math.cos(a) * 0.9, 0.28, -0.1 + Math.sin(a) * 0.9)); }
      g.add(bx(1.1, 2.0, 0.6, M(0x7f9aa6, { metalness: 0.3 }), 0, 0.28, -0.6), bx(0.5, 1.8, 0.04, M(0xdbe6ea, { metalness: 0.4, roughness: 0.3 }), 0, 0.3, 0.8));
      // the spoke: a glass tube rising all the way up to the hub, ringed with lights
      const spoke = cy(0.5, 0.5, 330, GLASS(), 0, 2.85, -0.1, 16); spoke.castShadow = false; g.add(spoke, cy(0.12, 0.12, 330, CREAM(), 0.45, 2.85, -0.1, 6));
      for (let y = 3.5; y < 40; y += 1.6) g.add(cy(0.56, 0.56, 0.09, GLOW.cyan, 0, y, -0.1, 16));
      const sign = mesh(G('liftsign', () => new THREE.PlaneGeometry(1.3, 0.42)), TM('liftsignM', () => new THREE.MeshBasicMaterial({ map: canvasTex('liftsign', 256, 84, (q, W2, H2) => paintSign(q, W2, H2, 'LIFT ▲')) })), 0, 2.1, 0.86, false);
      g.add(sign, bx(0.1, 1.3, 0.1, CREAM(), -1.15, 0.14, 0.75), bx(0.1, 1.3, 0.1, CREAM(), 1.15, 0.14, 0.75), bx(2.4, 0.1, 0.14, TEAL(), 0, 1.44, 0.75));
      for (const sx of [-1, 1]) { const b = sp(0.1, GLOW.warm, sx * 1.15, 1.6, 0.75, 1); b.castShadow = false; g.add(b); fx.glow.push({ x: sx * 1.15, z: 0.75, warm: false }); }
      break;
    }
    case 'water_tank': {
      const k = Math.max(0.55, Math.min(w, d) / 2), t = new THREE.Group(); t.scale.setScalar(k);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) t.add(bx(0.09, 0.62, 0.09, SLATE(), x * 0.5, 0, z * 0.5));
      t.add(cy(0.78, 0.78, 1.5, CREAM(), 0, 0.6, 0, 20), cy(0.8, 0.8, 0.22, TEAL(), 0, 1.25, 0, 20), cy(0.8, 0.8, 0.06, GLOW.cyan, 0, 0.8, 0, 20), cy(0.78, 0.25, 0.4, M(0xe2dccb), 0, 2.1, 0, 20), bx(0.28, 1.9, 0.05, SLATE(), 0.2, 0.5, 0.8));
      g.add(t); break;
    }
    case 'wind_turbine_small': {
      g.add(cy(0.22, 0.26, 0.2, TEAL()), cy(0.065, 0.1, 3.4, CREAM(), 0, 0.2, 0, 10), bx(0.24, 0.22, 0.56, CREAM(), 0, 3.5, -0.05), cy(0.08, 0.08, 0.06, GLOW.cyan, 0, 2.2, 0, 10));
      const rotor = new THREE.Group(); rotor.position.set(0, 3.62, 0.26); rotor.add(sp(0.1, TEAL(), 0, 0, 0.02, 1));
      for (let i = 0; i < 3; i++) { const b = bx(0.12, 1.05, 0.03, M(0xffffff), 0, 0, 0); b.position.set(0, 0, 0); b.geometry = G('blade', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)); b.scale.set(0.12, 1.05, 0.03); b.rotation.z = i * 2.094; rotor.add(b); }
      g.add(rotor); fx.spin.push({ o: rotor, axis: 'z', speed: 2.2 + hashN(Math.floor(o.x * 3 + o.y)) }); break;
    }
    case 'noticeboard': {
      const W = Math.min(w * 0.9, 1.7), wood = M(0x9a6a45);
      g.add(bx(0.08, 1.7, 0.08, wood, -W / 2 + 0.06, 0, 0), bx(0.08, 1.7, 0.08, wood, W / 2 - 0.06, 0, 0), bx(W, 0.85, 0.07, M(0xc9a26e), 0, 0.75, 0), bx(W + 0.16, 0.06, 0.32, TEAL(), 0, 1.68, 0));
      const papers = [0xfff6dc, 0xffd6d6, 0xd6f0ff, 0xfff1a8, 0xdaf5d0];
      for (let i = 0; i < Math.round(W * 4); i++) g.add(bx(0.18, 0.22, 0.01, M(papers[i % 5]), -W / 2 + 0.16 + (i % Math.round(W * 2)) * 0.24 + (i > W * 2 ? 0.08 : 0), i < W * 2 ? 1.18 : 0.86, 0.04));
      break;
    }
    case 'fountain': {
      const stone = M(0xd7d2c6);
      g.add(cy(1.0, 1.05, 0.42, stone, 0, 0, 0, 28), cy(0.88, 0.88, 0.04, TM('water', () => new THREE.MeshStandardMaterial({ color: 0x8fd3e8, transparent: true, opacity: 0.85, roughness: 0.08, metalness: 0.1 })), 0, 0.34, 0, 28));
      g.add(cy(0.16, 0.24, 0.95, stone, 0, 0.3, 0, 12), cy(0.42, 0.14, 0.18, stone, 0, 1.18, 0, 16), cy(0.36, 0.36, 0.03, TM('water'), 0, 1.33, 0, 16), cy(1.02, 1.02, 0.05, GLOW.cyan, 0, 0.42, 0, 28));
      // Eden in miniature: a little turning ring on top
      const ring = new THREE.Group(); ring.position.y = 1.72; const t = new THREE.Mesh(G('minieden', () => new THREE.TorusGeometry(0.26, 0.07, 8, 24)), M(0xf3ecdc, { metalness: 0.2 })); t.castShadow = true; ring.add(t, mesh(G('minisun', () => new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6).rotateX(Math.PI / 2)), GLOW.warm, 0, 0, 0, false));
      ring.rotation.y = Math.PI / 2; g.add(ring); fx.spin.push({ o: t, axis: 'z', speed: 0.8 }); break;
    }
    case 'airlock_door': {
      const W = w * 0.95, hull = TM('hullM', () => new THREE.MeshStandardMaterial({ map: hullTex(), roughness: 0.6, metalness: 0.3 }));
      g.add(bx(W, 2.1, 0.9, hull, 0, 0, -0.05), bx(W + 0.2, 0.16, 1.1, CREAM(), 0, 2.1, -0.05));
      const hz = TM('hazard', () => new THREE.MeshStandardMaterial({ map: canvasTex('hazard', 128, 128, paintHazard), roughness: 0.6 }));
      g.add(bx(1.36, 1.7, 0.05, hz, 0, 0.1, 0.42));
      const door = cy(0.56, 0.56, 0.08, M(0x3f6f78, { metalness: 0.4, roughness: 0.45 }), 0, 0, 0, 20); door.rotation.x = Math.PI / 2; door.position.set(0, 0.95, 0.47); g.add(door);
      const wheel = new THREE.Mesh(G('hatchwheel', () => new THREE.TorusGeometry(0.22, 0.04, 6, 16)), CREAM()); wheel.position.set(0, 0.95, 0.53); g.add(wheel);
      for (const sx of [-1, 1]) g.add(sp(0.06, GLOW.cyan, sx * 0.62, 1.95, 0.42, 1)); break;
    }
    case 'fan_tower': {
      const hull = TM('hullM', () => new THREE.MeshStandardMaterial({ map: hullTex(), roughness: 0.6, metalness: 0.3 }));
      g.add(bx(1.7, 0.4, 1.7, hull), cy(0.42, 0.6, 4.3, CREAM(), 0, 0.4, 0, 14));
      for (const y of [1.5, 3.0]) g.add(cy(0.55, 0.55, 0.08, GLOW.cyan, 0, y, 0, 14));
      const rim = new THREE.Mesh(G('fanrim', () => new THREE.TorusGeometry(0.98, 0.13, 8, 28)), TEAL()); rim.rotation.x = Math.PI / 2; rim.position.y = 4.9; rim.castShadow = true; g.add(rim);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.785; g.add(bx(0.07, 0.9, 0.07, CREAM(), Math.cos(a) * 0.7, 4.1, Math.sin(a) * 0.7)); }
      const fan = new THREE.Group(); fan.position.y = 4.92; fan.add(sp(0.16, CREAM(), 0, 0, 0, 1));
      for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(G('fanblade', () => new THREE.BoxGeometry(0.8, 0.03, 0.22).translate(0.45, 0, 0)), M(0xe9edf0)); b.rotation.y = i * 1.2566; b.rotation.x = 0.3; b.castShadow = true; fan.add(b); }
      g.add(fan); fx.spin.push({ o: fan, axis: 'y', speed: 3.2 }); break;
    }
    case 'market_stall': {
      const W = w * 0.92, wood = M(0xb07a4a), cols = [['#f08a6c', '#fff3e0'], ['#5fb3b0', '#fff3e0'], ['#f2c230', '#fff6dc'], ['#8fb8e8', '#ffffff']][Math.floor(hashN(o.tint || o.x) * 4)];
      g.add(bx(W, 0.72, 0.7, wood, 0, 0, 0.05), bx(W + 0.06, 0.06, 0.78, M(0xd9b98a), 0, 0.72, 0.05));
      const fruit = [0xe2463a, 0xf2c230, 0x7fbf5a, 0xf08a4c, 0xa35ad0];
      for (let i = 0; i < 7; i++) g.add(sp(0.1, M(fruit[(i + Math.floor(o.x)) % 5]), -W / 2 + 0.2 + i * (W - 0.4) / 6, 0.85, 0.1 + (i % 2) * 0.16, 0));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(bx(0.06, z > 0 ? 1.7 : 2.0, 0.06, wood, x * W / 2, 0, z * 0.38));
      const aw = mesh(G('awning' + w, () => new THREE.BoxGeometry(W + 0.3, 0.05, 1.05)), TM('awn' + cols[0], () => new THREE.MeshStandardMaterial({ map: canvasTex('stripe' + cols[0], 128, 64, (q, a, b) => paintStripes(q, a, b, cols[0], cols[1])), roughness: 0.8 })), 0, 1.86, 0.02);
      aw.rotation.x = 0.28; g.add(aw);
      const l = sp(0.08, GLOW.warm, W / 2 - 0.1, 1.5, 0.48, 1); l.castShadow = false; g.add(l); fx.glow.push({ x: W / 2 - 0.1, z: 0.48, warm: true }); break;
    }
    default: return null;
  }
  return g;
}
// Extra touches for the colony's own buildings when they are built (no 3D model): pipes, a dish, a chute.
export function buildingExtras(b, g) {
  const W = b.w, D = b.d, H = b.height;
  if (b.kind === 'pumphouse') { for (const z of [-0.6, 0.4]) { const p = cy(0.14, 0.14, 2.2, M(0xa9c3c8, { metalness: 0.3 }), 0, 0, 0, 10); p.rotation.z = Math.PI / 2; p.position.set(W / 2 + 0.9, 0.5 + (z > 0 ? 0.3 : 0), z); g.add(p); } g.add(bx(0.6, 0.9, 0.6, SLATE(), W / 2 + 1.8, 0, -0.1)); }
  if (b.kind === 'guard') { g.add(cy(0.05, 0.05, 2.4, STEEL(), W / 2 - 0.6, H * 0.62, -D / 4, 6)); const dish = new THREE.Mesh(G('dish', () => new THREE.SphereGeometry(0.5, 14, 6, 0, Math.PI * 2, 0, 1.0)), CREAM()); dish.position.set(-W / 2 + 1, H * 0.62 + 0.6, -D / 4); dish.rotation.x = -0.9; g.add(dish, sp(0.07, GLOW.cyan, W / 2 - 0.6, H * 0.62 + 2.45, -D / 4, 1)); g.add(bx(0.7, 0.45, 0.04, TM('gsign', () => new THREE.MeshBasicMaterial({ map: canvasTex('gsign', 192, 96, (q, a, c) => paintSign(q, a, c, 'GUARD')) })), W / 2 - 0.9, 1.5, D / 2 + 0.02)); }
  if (b.kind === 'post') { g.add(bx(0.5, 0.9, 0.4, M(0xd9583a), W / 2 - 0.5, 0, D / 2 + 0.35), cy(0.6, 0.6, 0.05, M(0xf2c230), -W / 4, H * 0.62 + 0.05, -D / 4, 16)); }
}

// ---------------------------------------------------------------- maintenance bots
// Cosmetic: a few bots trundle back and forth along routes the map gives (map.bots: polylines).
export class Bots {
  constructor(routes, parent, make) {
    this.list = (routes || []).map((pts, i) => {
      const o = make(); parent.add(o); let L = 0; const seg = [];
      for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(l); L += l; }
      return { o, pts, seg, L, s: hashN(i * 13 + 3) * L, dir: i % 2 ? -1 : 1, speed: 0.9 + hashN(i) * 0.4, pause: 0 };
    });
  }
  update(dt, t) {
    for (const b of this.list) {
      if (b.pause > 0) { b.pause -= dt; b.o.rotation.y += dt * 1.5 * b.dir; continue; }
      b.s += b.dir * b.speed * dt;
      if (b.s > b.L || b.s < 0) { b.s = Math.max(0, Math.min(b.L, b.s)); b.dir *= -1; b.pause = 1.2; }
      let s = b.s, k = 0; while (k < b.seg.length - 1 && s > b.seg[k]) s -= b.seg[k++];
      const [x0, y0] = b.pts[k], [x1, y1] = b.pts[k + 1], f = b.seg[k] ? s / b.seg[k] : 0, dx = (x1 - x0) * b.dir, dy = (y1 - y0) * b.dir;
      b.o.position.set(x0 + (x1 - x0) * f + (b.dir > 0 ? 0.35 : -0.35) * (dy ? 1 : 0), Math.abs(Math.sin(t * 9 + b.s)) * 0.03, y0 + (y1 - y0) * f + (b.dir > 0 ? -0.35 : 0.35) * (dx ? 1 : 0));
      b.o.rotation.y = Math.atan2(dx, dy);
    }
  }
}

// ---------------------------------------------------------------- merging static meshes
// Bakes the static meshes under `holders` into one mesh per material (fewer draw calls).
export function mergeStatic(holders, parent) {
  parent.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert(), groups = new Map(), drop = [];
  for (const h of holders) h.traverse((m) => {
    if (!m.isMesh || m.userData.keep || m.isInstancedMesh) return;
    let p = m, moving = false; while (p && p !== h) { if (p.userData.moving) { moving = true; break; } p = p.parent; } if (moving) return;
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const key = m.material.uuid + (m.castShadow ? 's' : 'n'); if (!groups.has(key)) groups.set(key, { mat: m.material, cast: m.castShadow, geos: [] }); groups.get(key).geos.push(geo); drop.push(m);
  });
  for (const m of drop) m.parent.remove(m);
  const out = new THREE.Group();
  for (const { mat, cast, geos } of groups.values()) {
    let n = 0; for (const q of geos) n += q.attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), T = new Float32Array(n * 2); let o = 0;
    for (const q of geos) { P.set(q.attributes.position.array, o * 3); N.set(q.attributes.normal.array, o * 3); T.set(q.attributes.uv.array, o * 2); o += q.attributes.position.count; q.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(T, 2)); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; out.add(m);
  }
  parent.add(out); return out;
}
// One mesh of soft light pools on the ground under the lamps (additive, brighter at night).
export function lightPools(spots) {
  if (!spots.length) return null;
  const P = [], C = [], T = [], I = [];
  spots.forEach(({ x, z, warm, r = 1.6 }, i) => { const c = warm ? [1, 0.82, 0.55] : [0.45, 0.95, 1]; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { P.push(x + a * r, 0.04, z + b * r); C.push(...c); T.push((a + 1) / 2, (b + 1) / 2); } I.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4, i * 4 + 3, i * 4 + 2); });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(T, 2)); geo.setIndex(I);
  const mat = new THREE.MeshBasicMaterial({ map: canvasTex('glow', 128, 128, paintGlow), vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 3; return m;
}
