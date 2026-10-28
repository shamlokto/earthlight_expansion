// Modern renderer for the fight cut-ins. The choreography stays the original's: FightScene
// (js/game/fightscene.js) decides every frame what is where, and frameState() hands this renderer
// the sprites it would draw; timing, hits, losses and sounds are untouched. What changes is how
// it looks:
//   * machines remastered at 4x (js/render/fightart.js): smooth outlines, normal-mapped lighting,
//     metal highlights, army-coloured rim light, glowing engines and sensors, and dynamic light
//     from every shot and explosion near them; motion blur on fast moves
//   * weapons as light: hot-core beams and tracers with bloom, missiles trailing smoke, muzzle
//     flares, impact sparks
//   * multi-stage explosions: flash, fireball, shockwave, embers, tumbling debris, rising smoke,
//     scorch glow; heavy hits punch the camera in and shake it (not with reduced motion)
//   * a sinking capital ship (the original's sink, js/game/sinkdata.js) breaks up: a chain of
//     blasts walks down its hull, the hull splits into burning pieces that drift and tumble apart,
//     and a last big blast flashes the screen; all of it scales with the ship's size
//   * a cinematic frame: a painted deep-space backdrop (nebula and planet in the terrain's
//     colours) behind the original terrain layers, which are set back with depth of field; light
//     shafts, colour grading, letterbox bars and a HUD with each side's name and HP
//
//   const fx = new FightRenderer(scene, canvas);   // after each scene.step(): fx.update();
//   fx.render(alpha);                              // alpha: 0..1 between the last two steps
import { remastered, UP, canvasOf, scale2x } from './fightart.js';
import { SINK } from '../game/sinkdata.js';

const W = 256, H = 224;
const BOOM_TILES = new Set([192, 196, 200]);
const ARMY = [[255, 96, 210], [96, 255, 150]];   // rim and HUD colours: army A pink, army B green
const BAR = 9;                                    // letterbox bar height (scene px)

// ------------------------------------------------------------------ helpers
const scale4x = (src, w, h) => scale2x(scale2x(src, w, h), w * 2, h * 2);

// A soft round blob of one colour, cached: particles draw it scaled instead of building a
// gradient each frame.
const BLOBS = new Map();
function blob(r, g, b, hard = false) {
  const key = (((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)) * 2 + (hard ? 1 : 0);
  let c = BLOBS.get(key);
  if (!c) {
    c = canvasOf(64, 64);
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    const col = `${(r >> 4) * 17},${(g >> 4) * 17},${(b >> 4) * 17}`;
    if (hard) { gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.6, `rgba(${col},0.85)`); gr.addColorStop(1, `rgba(${col},0)`); }
    else { gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.3, `rgba(${col},0.5)`); gr.addColorStop(1, `rgba(${col},0)`); }
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    BLOBS.set(key, c);
  }
  return c;
}
// A lumpy smoke puff (a few overlapping blobs), cached per shade.
const PUFFS = new Map();
function puff(shade, v = 0) {
  const k = (shade >> 3) * 4 + (v & 3);
  let c = PUFFS.get(k);
  if (!c) {
    c = canvasOf(64, 64);
    const x = c.getContext('2d'); let s = k * 7919 + 1; shade = (k >> 2) * 8;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 7; i++) {
      const rad = 12 + r() * 12, px = 32 + (r() - 0.5) * 22, py = 32 + (r() - 0.5) * 22, v = shade + (r() * 30 | 0);
      const gr = x.createRadialGradient(px, py, 0, px, py, rad);
      gr.addColorStop(0, `rgba(${v},${v},${v + 8},0.55)`); gr.addColorStop(1, `rgba(${v},${v},${v + 8},0)`);
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    }
    PUFFS.set(k, c);
  }
  return c;
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const rgbStr = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

// ------------------------------------------------------------------ the renderer
export class FightRenderer {
  constructor(scene, canvas, opts = {}) {
    this.scene = scene; this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.S = canvas.width / W;
    this.reduced = opts.reducedMotion ?? (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.sprites = new Map();
    this.tilesId = new WeakMap(); this.nTiles = 0;
    this.particles = []; this.lights = []; this.decals = [];
    this.trails = new Map(); this.shotAge = new Map(); this.lastShot = new Map(); this.shotOrigin = new Map(); this.lanes = new Map(); this.missilePos = new Map();
    this.shake = 0; this.seed = 7; this.punch = null; this.whiteout = 0;
    // sides whose capital ship sinks in this fight, and its wreck once the sinking starts
    this.sinking = [scene.left, scene.right].map((acts) => !!(acts[0] && acts[0].ship && acts[0].dies));
    this.wrecks = [null, null];
    this.lev = [null, null];   // the Leviathan's cannon per side (levCannonTick)
    this.prev = null; this.cur = scene.frameState(); this.hulls = []; this.hullGroups = [];
    this.introImg = null; this.introCanvas = null; this.lastIntro = null; this.introEnd = null;
    this.hpShown = [this.scene.leftSide.hp, this.scene.rightSide.hp]; this.drain = [null, null];
    const names = scene.intro && scene.intro.names;
    this.labels = [scene.leftSide, scene.rightSide].map((s) => (s.label ? s.label.toUpperCase() : names && names[s.type] ? String(names[s.type]).toUpperCase() : ''));
    this.stars = this.makeStars();
    this.buildBackdrop();
  }

  rnd() { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x80000000; }

  // ---------------------------------------------------------------- backdrop
  buildBackdrop() {
    const s = this.scene, S = this.S;
    // the terrains' own colours tint the painted sky
    const tint = (L) => {
      if (!L.pal.length) return null;
      const cnt = new Map();
      for (let i = 0; i < L.px.length; i += 37) { const k = L.px[i]; if (k) cnt.set(k, (cnt.get(k) || 0) + 1); }
      const top = [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => L.pal[k]);
      return top.length ? top : null;
    };
    this.hues = [...(tint(s.bgL) || []), ...(tint(s.bgR) || [])];
    if (!this.hues.length) this.hues = [[60, 80, 200], [140, 60, 180]];
    const layer = (L) => {
      if (!L.pal.length) return null;
      // a dark colour filling most of the layer is empty space: the painted sky shows through it
      const cnt = new Map();
      for (let i = 0; i < L.px.length; i += 5) cnt.set(L.px[i], (cnt.get(L.px[i]) || 0) + 1);
      const [top, topN] = [...cnt].sort((a, b) => b[1] - a[1])[0], tc = L.pal[top];
      const keyed = top && tc && topN > L.px.length / 5 * 0.35 && tc[0] * 0.3 + tc[1] * 0.55 + tc[2] * 0.15 < 48 ? top : -1;
      const up = scale4x(L.px, 256, 256), n = 256 * UP, c = canvasOf(n, n), g = c.getContext('2d');
      const img = g.createImageData(n, n), d = img.data;
      for (let i = 0; i < up.length; i++) {
        const k = up[i];
        if (!k || k === keyed) continue;
        const col = L.pal[k], o = i * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      let holes = 0;
      for (let i = 0; i < L.px.length; i += 3) if (!L.px[i] || L.px[i] === keyed) { holes++; if (holes > 40) break; }
      c.opaque = holes <= 40;
      // set back: depth-of-field blur, darker and cooler, a little more contrast
      const m = 256 * S, o = canvasOf(m, m), og = o.getContext('2d');
      og.imageSmoothingQuality = 'high';
      og.filter = `blur(${(S * 0.9).toFixed(1)}px) brightness(0.62) saturate(0.85) contrast(1.12)`;
      og.drawImage(c, 0, 0, m, m);
      og.filter = 'none';
      // cool haze from above
      og.globalCompositeOperation = 'source-atop';
      const gr = og.createLinearGradient(0, 0, 0, m);
      gr.addColorStop(0, 'rgba(70,110,200,0.18)'); gr.addColorStop(1, 'rgba(10,10,40,0.25)');
      og.fillStyle = gr; og.fillRect(0, 0, m, m);
      o.opaque = c.opaque;
      return o;
    };
    this.bgL = layer(s.bgL); this.bgR = layer(s.bgR);
    // the left layer only covers its half; the right one, scrolled, fills the screen
    this.sky = !(this.bgR && this.bgR.opaque);
    this.buildSpace();
    this.buildOverlays();
  }

  // A painted sky, once per fight: deep gradient, nebula clouds in the terrain's hues, a distant
  // planet with its atmosphere, and a dense static star layer.
  buildSpace() {
    const S = this.S, w = (W + 16) * S, h = (H + 16) * S;
    const c = canvasOf(w, h), g = c.getContext('2d');
    let gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#05081c'); gr.addColorStop(0.5, '#0a0f30'); gr.addColorStop(1, '#03040f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const hue = this.hues[i % this.hues.length], cx = this.rnd() * w, cy = this.rnd() * h * 0.9, r = (30 + this.rnd() * 90) * S;
      const col = mix(hue, [90, 60, 200], 0.35);
      g.globalAlpha = 0.05 + this.rnd() * 0.07;
      g.drawImage(blob(col[0] | 0, col[1] | 0, col[2] | 0), cx - r, cy - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 420; i++) {
      const x = this.rnd() * w, y = this.rnd() * h, b = this.rnd(), r = (0.25 + b * b * 0.8) * S * 0.5;
      g.fillStyle = `rgba(${200 + b * 55 | 0},${210 + b * 45 | 0},255,${(0.25 + b * 0.6).toFixed(2)})`;
      g.fillRect(x, y, r * 2, r * 2);
    }
    // the planet: lit from the top left like everything else
    const px = w * 0.82, py = h * 0.2, pr = 44 * S, base = mix(this.hues[0], [80, 120, 220], 0.5);
    g.globalCompositeOperation = 'source-over';
    gr = g.createRadialGradient(px - pr * 0.45, py - pr * 0.45, pr * 0.1, px, py, pr);
    gr.addColorStop(0, rgbStr(mix(base, [255, 255, 255], 0.35))); gr.addColorStop(0.55, rgbStr(base)); gr.addColorStop(1, rgbStr(mix(base, [0, 0, 10], 0.85)));
    g.fillStyle = gr; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'lighter';
    gr = g.createRadialGradient(px, py, pr * 0.92, px, py, pr * 1.25);
    gr.addColorStop(0, 'rgba(120,180,255,0.45)'); gr.addColorStop(1, 'rgba(120,180,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(px, py, pr * 1.25, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
    this.space = c;
  }

  // Light shafts from the key light (drawn additively over the backdrop), and the grading on top
  // of everything (warm highlights, cool shadows, vignette).
  buildOverlays() {
    const S = this.S, w = W * S, h = H * S;
    this.overlay = canvasOf(w, h);
    const g = this.overlay.getContext('2d');
    g.save(); g.translate(-w * 0.1, -h * 0.15); g.rotate(-0.55);
    for (let i = 0; i < 7; i++) {
      const x = (i * 0.17 + this.rnd() * 0.08) * w * 1.3, bw = (6 + this.rnd() * 18) * S;
      const sg = g.createLinearGradient(0, 0, 0, h * 1.6);
      sg.addColorStop(0, 'rgba(255,232,196,0.06)'); sg.addColorStop(1, 'rgba(255,232,196,0)');
      g.fillStyle = sg; g.fillRect(x, 0, bw, h * 1.6);
    }
    g.restore();
    let gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, 'rgba(255,200,140,0.07)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,40,120,0.14)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    gr = g.createRadialGradient(w / 2, h / 2, h * 0.32, w / 2, h / 2, w * 0.74);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,10,0.62)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }

  makeStars() {
    const out = [];
    for (let i = 0; i < 90; i++) out.push({ x: this.rnd() * W, y: this.rnd() * H, z: 0.2 + this.rnd() * 0.8, tw: this.rnd() * 6.28 });
    return out;
  }

  drawBackdrop(ctx, st, t) {
    const S = this.S, [h1, v1, h2, v2] = st.scroll;
    const drift = (h1 - h2) * 0.08;
    if (this.sky) ctx.drawImage(this.space, (-8 - (((drift * 0.3) % 8) + 8) % 8) * S, -8 * S);
    else { ctx.fillStyle = '#05081c'; ctx.fillRect(-8 * S, -8 * S, (W + 16) * S, (H + 16) * S); }
    if (this.sky) for (const p of this.stars) {
      const x = ((p.x + drift * p.z * 3 + t * 0.04 * p.z) % W + W) % W, y = p.y;
      const a = 0.3 + 0.7 * p.z * (0.55 + 0.45 * Math.sin(t * 0.09 + p.tw));
      ctx.fillStyle = `rgba(210,225,255,${a.toFixed(3)})`;
      const r = (0.4 + p.z * 0.8) * S * 0.5;
      ctx.fillRect(x * S - r, y * S - r, r * 2, r * 2);
    }
    const m = 256 * S;
    const draw = (c, hx, vy) => {
      if (!c) return;
      const ox = (hx & 255) * S, oy = ((vy - 8) & 255) * S;
      for (let y = -oy; y < H * S; y += m) for (let x = -ox; x < W * S; x += m) ctx.drawImage(c, x, y, m, m);
    };
    draw(this.bgR, h2 + 128, v2);
    draw(this.bgL, h1, v1);
  }

  // ---------------------------------------------------------------- sprites
  isFx(sp) { return sp.row % 3 === 2; }
  isBoom(sp) { return this.isFx(sp) && sp.size === 32 && BOOM_TILES.has(sp.base & 255); }
  sideOf(sp) { return sp.row < 3 ? 0 : 1; }

  spriteKey(sp) {
    if (!this.tilesId.has(sp.tiles)) this.tilesId.set(sp.tiles, ++this.nTiles);
    return `${this.tilesId.get(sp.tiles)}:${sp.base}:${sp.size}:${sp.flip}:${sp.vflip}:${sp.row}`;
  }
  // The sprite's colour numbers (palette row * 16 + index, 0 transparent) into scene.obj.
  pixels(sp, out, ow, ox, oy) {
    const n = sp.size, base = sp.row * 16;
    for (let py = 0; py < n; py++) {
      for (let px = 0; px < n; px++) {
        const sx = sp.flip ? n - 1 - px : px, sy = sp.vflip ? n - 1 - py : py;
        const k = sp.tiles(sp.base + (sy >> 3) * 16 + (sx >> 3))[(sy & 7) * 8 + (sx & 7)];
        if (k) out[(oy + py) * ow + ox + px] = base + k;
      }
    }
  }
  sprite(sp) {
    const art = sp.size === 32 && sp.tiles && sp.tiles.posesArt && sp.tiles.posesArt[sp.base & 255];
    if (art) return this.fullColour(art, 32, 32, sp.flip);   // a unique craft's own pose in its own colours
    const key = this.spriteKey(sp);
    let e = this.sprites.get(key);
    if (e !== undefined) return e;
    const n = sp.size, idx = new Uint8Array(n * n);
    this.pixels(sp, idx, n, 0, 0);
    e = remastered(idx, n, n, this.scene.obj, { fx: this.isFx(sp), rim: ARMY[this.sideOf(sp)] });
    this.sprites.set(key, e);
    return e;
  }
  // A capital ship or structure: its parts put together and remastered as one picture.
  group(parts) {
    const x0 = Math.min(...parts.map((p) => p.x)), y0 = Math.min(...parts.map((p) => p.y));
    const key = parts.map((p) => `${this.spriteKey(p)}@${p.x - x0},${p.y - y0}`).join('|');
    let e = this.sprites.get(key);
    if (e === undefined) {
      const w = Math.max(...parts.map((p) => p.x + p.size)) - x0, h = Math.max(...parts.map((p) => p.y + p.size)) - y0, idx = new Uint8Array(w * h);
      for (const p of parts) this.pixels(p, idx, w, p.x - x0, p.y - y0);
      e = remastered(idx, w, h, this.scene.obj, { rim: ARMY[this.sideOf(parts[0])] });
      this.sprites.set(key, e);
    }
    return { e, x0, y0, first: parts[0] };
  }

  // ---------------------------------------------------------------- simulation (once per game frame)
  update() {
    this.prev = this.cur;
    this.cur = this.scene.frameState();
    const cur = this.cur, prev = this.prev;
    if (cur.intro) { this.particles.length = 0; return; }
    if (prev && prev.intro && this.introEnd === null) this.introEnd = cur.f;
    const before = prev && !prev.intro ? new Map(prev.sprites.map((sp) => [sp.id, sp])) : new Map();
    this.hulls = this.findHulls(cur);
    const seen = new Set();
    this.booms = 0;
    for (const sp of cur.sprites) {
      seen.add(sp.id);
      const cx = sp.x + sp.size / 2, cy = sp.y + sp.size / 2;
      if (!this.isFx(sp)) {
        // thrusters: small bright body sprites (the flames) shed hot particles
        if (sp.size === 8 && !this.reduced && (cur.f & 1)) {
          const e = this.sprite(sp);
          if (e && e.glowC) {
            const dir = this.sideOf(sp) === 0 ? -1 : 1;
            this.particles.push({ kind: 'ember', x: cx + dir * 3, y: cy + (this.rnd() - 0.5) * 4, vx: dir * (0.8 + this.rnd()), vy: (this.rnd() - 0.5) * 0.3, drag: 0.9, g: 0, life: 8, max: 8, col: e.glow, r: 1.4 });
          }
        }
        continue;
      }
      const e = this.sprite(sp);
      if (!e) continue;
      if (this.isBoom(sp)) {
        if (!before.has(sp.id)) this.explode(cx, cy, e.glow, sp);
        continue;
      }
      if (!this.shotOrigin.has(sp.id)) this.shotOrigin.set(sp.id, [cx, cy]);
      const age = (this.shotAge.get(sp.id) || 0) + 1;
      this.shotAge.set(sp.id, age);
      // melee effects are numbered afresh every frame: no muzzle flashes, and a trail only while
      // the sprite with that number keeps moving smoothly
      const melee = sp.id.startsWith('fx');
      if (!before.has(sp.id) && !melee && this.shotKind(sp) !== 'missile') this.muzzle(cx, cy, e.glow, sp.size);   // missiles flash at launch (homing)
      let tr = this.trails.get(sp.id) || [];
      const last = tr[tr.length - 1];
      if (last && Math.hypot(last[0] - cx, last[1] - cy) > (melee ? 10 : 28)) { tr = []; this.missilePos.delete(sp.id); }   // a new shot on the same track
      tr.push([cx, cy]); if (tr.length > 12) tr.shift();
      this.trails.set(sp.id, tr);
      this.lastShot.set(sp.id, { x: cx, y: cy, col: e.glow, size: sp.size, moved: tr.length > 2 && Math.hypot(tr[tr.length - 1][0] - tr[0][0], tr[tr.length - 1][1] - tr[0][1]) > 6 });
      // a slow, long-lived shot is a missile: it smokes
      const sp1 = tr.length > 1 ? Math.hypot(tr[tr.length - 1][0] - tr[tr.length - 2][0], tr[tr.length - 1][1] - tr[tr.length - 2][1]) : 0;
      const kind = this.shotKind(sp);
      if (kind === 'missile') {   // the Azoras's missiles home in on their robot (homing), and always smoke
        const m = this.homing(sp, cx, cy), [hx, hy] = m.at(cx, cy), prev = this.missilePos.get(sp.id), [px, py] = prev || [hx, hy];
        this.missilePos.set(sp.id, [hx, hy]);
        this.lastShot.set(sp.id, { ...this.lastShot.get(sp.id), x: hx, y: hy });
        if (!this.reduced && prev) this.particles.push({ kind: 'smoke', x: px, y: py, vx: (this.rnd() - 0.5) * 0.25, vy: -0.05 - this.rnd() * 0.12, drag: 0.95, g: 0, r: 1.8 + this.rnd(), grow: 0.2, life: 30, max: 30, shade: 170, rot: this.rnd() * 6, vr: 0.02 });
      } else if (sp1 > 0.4 && sp1 < 2.2 && age > 3 && !this.reduced) {
        const [tx, ty] = tr[tr.length - 2];
        this.particles.push({ kind: 'smoke', x: tx, y: ty, vx: (this.rnd() - 0.5) * 0.25, vy: -0.05 - this.rnd() * 0.12, drag: 0.95, g: 0, r: 1.8 + this.rnd(), grow: 0.2, life: 30, max: 30, shade: 170, rot: this.rnd() * 6, vr: 0.02 });
      } else if (sp1 > 0.4 && sp1 < 2.2 && age > 3 && !this.reduced) {
        const [tx, ty] = tr[tr.length - 2];
        this.particles.push({ kind: 'smoke', x: tx, y: ty, vx: (this.rnd() - 0.5) * 0.2, vy: -0.05 - this.rnd() * 0.1, drag: 0.96, g: 0, r: 1.5 + this.rnd(), grow: 0.16, life: 26, max: 26, shade: 150, rot: this.rnd() * 6, vr: 0.02 });
      }
      this.lights.push({ x: cx, y: cy, col: e.glow, i: 0.35, r: 34, life: 1, max: 1 });
    }
    // shots that vanished without exploding hit something: sparks
    for (const id of [...this.trails.keys()]) {
      if (seen.has(id)) continue;
      const s = this.lastShot.get(id);
      if (s && s.moved) this.impact(s.x, s.y, s.col);
      this.trails.delete(id); this.shotAge.delete(id); this.lastShot.delete(id); this.shotOrigin.delete(id); this.missilePos.delete(id);
    }
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.life--;
      if (p.vr) p.rot += p.vr;
      if (p.grow) p.r += p.grow;
      if (p.kind === 'ring') p.r += p.speed;
      if (p.kind === 'fire') { p.r += p.grow2; }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const l of this.lights) l.life--;
    this.lights = this.lights.filter((l) => l.life > 0);
    for (const d of this.decals) d.life--;
    this.decals = this.decals.filter((d) => d.life > 0);
    this.shake *= 0.85; this.whiteout *= 0.8;
    if (this.punch) { this.punch.t++; if (this.punch.t > 40) this.punch = null; }
    for (const w of this.wrecks) if (w) this.updateWreck(w, cur.f);
    this.levCannonTick(cur);
    this.updateHud(cur.f);
  }

  muzzle(x, y, glow, size) {
    this.particles.push({ kind: 'flare', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: Math.min(16, size * 1.4 + 6), life: 7, max: 7, col: glow, rot: this.rnd() * 3 });
    this.lights.push({ x, y, col: glow, i: 1.1, r: 60, life: 7, max: 7 });
  }

  impact(x, y, col) {
    const n = this.reduced ? 4 : 12;
    for (let i = 0; i < n; i++) {
      const a = this.rnd() * Math.PI * 2, v = 0.8 + this.rnd() * 2.8;
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.88, g: 0.05, life: 8 + (this.rnd() * 10 | 0), max: 18, col: mix(col, [255, 255, 220], 0.5) });
    }
    this.particles.push({ kind: 'flash', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: 14, life: 6, max: 6, col: mix(col, [255, 255, 255], 0.4) });
    this.lights.push({ x, y, col, i: 1.0, r: 50, life: 8, max: 8 });
  }

  explode(x, y, glow, sp) {
    // a salvo sets off many at once: each gets fewer particles so the whole stays readable
    const crowd = ++this.booms, big = this.isBig(sp), k = big ? 1.4 : 1, few = this.reduced || crowd > 3;
    const hot = [255, 226, 170], fire = mix(glow, [255, 120, 30], 0.7);
    if (crowd <= 3) this.particles.push({ kind: 'flash', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: 26 * k, life: 7, max: 7, col: hot });
    if (crowd <= 2) this.particles.push({ kind: 'ring', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: 3, speed: 2.6 * k, life: 16, max: 16, col: mix(glow, [200, 230, 255], 0.5) });
    for (let i = 0; i < (few ? 3 : big ? 9 : 6); i++) {   // the fireball: hot cores that swell and cool
      const a = this.rnd() * Math.PI * 2, v = this.rnd() * 0.9 * k;
      this.particles.push({ kind: 'fire', x: x + Math.cos(a) * 3, y: y + Math.sin(a) * 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.1, drag: 0.9, g: -0.01, r: (3 + this.rnd() * 4) * k, grow2: 0.35 * k, life: 18 + (this.rnd() * 10 | 0), max: 28, col: fire });
    }
    for (let i = 0; i < (few ? 6 : big ? 22 : 16); i++) {
      const a = this.rnd() * Math.PI * 2, v = (0.8 + this.rnd() * 3.2) * k;
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.92, g: 0.03, life: 12 + (this.rnd() * 22 | 0), max: 34, col: mix(fire, hot, this.rnd()) });
    }
    for (let i = 0; i < (few ? 2 : big ? 12 : 7); i++) {
      const a = this.rnd() * Math.PI * 2, v = 0.5 + this.rnd() * 2;
      this.particles.push({ kind: 'debris', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, drag: 0.975, g: 0.045, life: 34 + (this.rnd() * 26 | 0), max: 60, col: [110 + this.rnd() * 70, 105 + this.rnd() * 40, 100], rot: this.rnd() * 6, vr: (this.rnd() - 0.5) * 0.5, r: 1 + this.rnd() * 2, hot: this.rnd() < 0.5 });
    }
    for (let i = 0; i < (few ? 2 : big ? 9 : 5); i++) {
      this.particles.push({ kind: 'smoke', x: x + (this.rnd() - 0.5) * 12 * k, y: y + (this.rnd() - 0.5) * 12 * k, vx: (this.rnd() - 0.5) * 0.3, vy: -0.12 - this.rnd() * 0.25, drag: 0.985, g: 0, r: (5 + this.rnd() * 5) * k, grow: 0.22, life: 50 + (this.rnd() * 40 | 0), max: 90, shade: 40 + (this.rnd() * 40 | 0), rot: this.rnd() * 6, vr: (this.rnd() - 0.5) * 0.03, delay: 6 });
    }
    this.lights.push({ x, y, col: fire, i: big ? 2.2 : 1.6, r: big ? 120 : 80, life: 22, max: 22 });
    this.decals.push({ x: x + (this.rnd() - 0.5) * 6, y: y + (this.rnd() - 0.5) * 6, r: (7 + this.rnd() * 5) * k, life: 90, max: 90 });
    if (!this.reduced) {
      this.shake = Math.min(7, this.shake + (big ? 3.6 : 1.5));
      if (big && crowd === 1) { this.punch = { x, y, t: 0 }; this.whiteout = Math.min(0.22, this.whiteout + 0.14); }
    }
  }

  // ---------------------------------------------------------------- a capital ship breaking up
  // The hull picture (as drawn the frame the original starts to sink it) cut into pieces that
  // break off one after another from the bow down, as a chain of blasts walks along it; then they
  // drift outwards, tumble and burn out, and a last big blast flashes the screen.
  makeWreck(it, x, y, side, f) {
    const e = it.e, pw = e.c.width / UP, ph = e.c.height / UP, x0 = x - e.pad, y0 = y - e.pad;
    const size = Math.max(0.8, Math.min(1.9, Math.sqrt(pw * ph) / 92));
    const cols = Math.max(2, Math.min(5, Math.round(pw / 24))), rows = Math.max(2, Math.min(6, Math.round(ph / 26)));
    const out = side ? 1 : -1, cx = x0 + pw / 2, cy = y0 + ph / 2, pieces = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const sx = (i * pw) / cols, sy = (j * ph) / rows, sw = pw / cols, sh = ph / rows;
      const px = x0 + sx + sw / 2, py = y0 + sy + sh / 2, ox = (px - cx) / pw, oy = (py - cy) / ph;
      pieces.push({ sx, sy, sw, sh, x: px, y: py, vx: out * (0.08 + this.rnd() * 0.22) + ox * 0.35, vy: oy * 0.45 - 0.06 + (this.rnd() - 0.5) * 0.1,
        rot: 0, vr: (this.rnd() - 0.5) * (this.reduced ? 0 : 0.035), free: f + 10 + j * 9 + (this.rnd() * 6 | 0), glow: 0, row: j });
    }
    // the finale's flagship (units.json `finale`, the Leviathan) goes the longest and the hardest:
    // the chain runs the whole sinking, the hull breaks in three stages, then the core blows
    const finale = !!(side ? this.scene.rightSide : this.scene.leftSide).finale;
    if (finale) for (const p of pieces) p.free = f + [50, 125, 195][Math.min(2, Math.floor((p.row * 3) / rows))] + (this.rnd() * 14 | 0);
    const chain = finale ? 40 : Math.round((6 + rows * 2) * size), step = finale ? 6 : 7;
    return { e, side, born: f, x0, y0, pw, ph, size, pieces, chain, step, finale, last: f + (finale ? 262 : 12 + chain * step + 16) };
  }
  updateWreck(w, f) {
    const k = f - w.born;
    // the chain: blasts walking down the hull, a little faster than the pieces break off
    if (k >= 8 && (k - 8) % w.step === 0 && (k - 8) / w.step < w.chain) {
      const n = (k - 8) / w.step, u = w.finale ? (n * 0.37) % 1 : n / Math.max(1, w.chain - 1);   // the finale's blasts walk the hull over and over
      const x = w.x0 + w.pw * (0.2 + 0.6 * this.rnd()), y = w.y0 + w.ph * (0.1 + 0.8 * u) + (this.rnd() - 0.5) * 10;
      this.explode(x, y, [255, 150, 70], { x: x - 16, y: y - 16, size: 32 });
    }
    // the finale escalates: secondary blasts all over the hull, the ship shuddering harder
    if (w.finale && k > 60 && f < w.last && k % (k > 180 ? 3 : 5) === 0 && !this.reduced) {
      const x = w.x0 + w.pw * (0.1 + 0.8 * this.rnd()), y = w.y0 + w.ph * (0.05 + 0.9 * this.rnd());
      this.explode(x, y, [255, 170, 90], { x: x - 16, y: y - 16, size: 32 });
      this.shake = Math.max(this.shake, 1 + (k / 260) * 3);
    }
    if (w.finale && f > w.last && f < w.last + 70 && !this.reduced) this.shake = Math.max(this.shake, 6 * (1 - (f - w.last) / 70));   // the quake rolls on
    // the last blast: the core goes up
    if (f === w.last && w.finale) {   // the reactor: white-out, a huge shockwave, the wreck flung apart
      const x = w.x0 + w.pw / 2, y = w.y0 + w.ph / 2;
      for (let i = 0; i < (this.reduced ? 2 : 7); i++) this.explode(x + (this.rnd() - 0.5) * w.pw * 0.8, y + (this.rnd() - 0.5) * w.ph * 0.8, [255, 230, 180], { x: x - 16, y: y - 16, size: 32 });
      this.particles.push({ kind: 'flash', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: 190, life: 26, max: 26, col: [255, 252, 240] });
      for (const sp2 of [1.6, 2.6, 3.8, 5.2]) this.particles.push({ kind: 'ring', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: 8, speed: sp2, life: 60, max: 60, col: [255, 220, 170] });
      for (let i = 0; i < (this.reduced ? 10 : 46); i++) {
        const a = this.rnd() * Math.PI * 2, v = 1 + this.rnd() * 4.5;
        this.particles.push({ kind: 'debris', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.985, g: 0.02, life: 80 + (this.rnd() * 60 | 0), max: 140, col: [90 + this.rnd() * 60, 80 + this.rnd() * 40, 80], rot: this.rnd() * 6, vr: (this.rnd() - 0.5) * 0.4, r: 1.5 + this.rnd() * 3, hot: this.rnd() < 0.7 });
      }
      this.lights.push({ x, y, col: [255, 230, 200], i: 4, r: 340, life: 50, max: 50 });
      if (!this.reduced) { this.whiteout = 0.95; this.shake = 7; this.punch = { x, y, t: 0 }; }
      for (const p of w.pieces) { p.free = Math.min(p.free, f); p.vx = p.vx * 2.6 + (p.x - x) * 0.012; p.vy = p.vy * 2.6 + (p.y - y) * 0.012; p.vr *= 2.5; p.glow = 1; }
    } else if (f === w.last) {
      const x = w.x0 + w.pw / 2, y = w.y0 + w.ph / 2, s = w.size;
      for (let i = 0; i < (this.reduced ? 1 : 3); i++) this.explode(x + (this.rnd() - 0.5) * 20 * s, y + (this.rnd() - 0.5) * 30 * s, [255, 200, 120], { x: x - 16, y: y - 16, size: 32 });
      this.particles.push({ kind: 'flash', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: 70 * s, life: 14, max: 14, col: [255, 245, 220] });
      for (const sp2 of [2.2, 3.4]) this.particles.push({ kind: 'ring', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: 6, speed: sp2 * s, life: 30, max: 30, col: [255, 210, 160] });
      this.lights.push({ x, y, col: [255, 190, 120], i: 3, r: 200 * s, life: 30, max: 30 });
      if (!this.reduced) { this.whiteout = Math.min(0.55, this.whiteout + 0.4); this.shake = 7; this.punch = { x, y, t: 0 }; }
      for (const p of w.pieces) { p.vx *= 1.8; p.vy *= 1.8; p.vr *= 1.5; }
    }
    for (const p of w.pieces) {
      if (f < p.free) continue;
      if (f === p.free) {
        p.glow = 1;
        if (!this.reduced) for (let i = 0; i < 5; i++) {
          const a = this.rnd() * Math.PI * 2, v = 0.6 + this.rnd() * 1.8;
          this.particles.push({ kind: 'spark', x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.9, g: 0.03, life: 10 + (this.rnd() * 10 | 0), max: 20, col: [255, 190, 110] });
        }
      }
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.glow *= 0.985;
      // burning pieces trail smoke and embers
      if (!this.reduced && (f + (p.sx | 0)) % (w.finale ? 2 : 4) === 0 && f < w.born + 360) {
        this.particles.push({ kind: 'smoke', x: p.x, y: p.y, vx: -p.vx * 0.3, vy: -0.1 - this.rnd() * 0.1, drag: 0.97, g: 0, r: (2.5 + this.rnd() * 2.5) * w.size, grow: 0.15, life: 40, max: 40, shade: 50 + (this.rnd() * 30 | 0), rot: this.rnd() * 6, vr: 0.02 });
        this.particles.push({ kind: 'ember', x: p.x + (this.rnd() - 0.5) * p.sw * 0.6, y: p.y + (this.rnd() - 0.5) * p.sh * 0.6, vx: (this.rnd() - 0.5) * 0.5, vy: -0.2 - this.rnd() * 0.3, drag: 0.95, g: 0, life: 14, max: 14, col: [255, 140, 60], r: 1.3 });
      }
    }
  }
  drawWreck(ctx, w, f, alpha) {
    const S = this.S, e = w.e, fade = Math.max(0, Math.min(1, 1 - (f - (w.born + (w.finale ? 330 : 240))) / 80));
    if (fade <= 0) return;
    for (const p of w.pieces) {
      const loose = f >= p.free, a = loose ? alpha : 0;
      const x = p.x + (loose ? p.vx * a : 0), y = p.y + (loose ? p.vy * a : 0);
      const jx = !loose && !this.reduced && f >= w.born ? (this.rnd() - 0.5) * (w.finale ? 0.8 + (f - w.born) / 60 : 0.8) : 0;   // the hull shudders before it splits
      ctx.save();
      ctx.translate((x + jx) * S, y * S); ctx.rotate(p.rot + (loose ? p.vr * a : 0));
      ctx.globalAlpha = fade;
      ctx.drawImage(e.c, p.sx * UP, p.sy * UP, p.sw * UP, p.sh * UP, (-p.sw / 2) * S, (-p.sh / 2) * S, p.sw * S, p.sh * S);
      if (p.glow > 0.05) {   // hot torn edges
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * p.glow * 0.8;
        const r = Math.max(p.sw, p.sh) * 0.7 * S;
        ctx.drawImage(blob(255, 120, 40), -r, -r, r * 2, r * 2);
      }
      ctx.restore();
    }
  }

  // A ship's own hull in full colour (js/art/own.js `hullArt`, drawn three times the classic
  // size; the Azoras): drawn in place of the remastered palette version, where the classic
  // renderer puts its 128 px hull sprite (the picture at the sheet's left end, or mirrored at its
  // right end).
  ownHullArt(sp) {
    const m = /^([LR])(\d+)own#/.exec(sp.id);
    if (!m) return null;
    const a = (m[1] === 'L' ? this.scene.left : this.scene.right)[+m[2]], set = a && a.own;
    if (!set || !set.hullArt) return null;
    const e = this.fullColour(set.hullArt, set.hull.w, set.hull.h, sp.flip);
    return { e, sp, ox: sp.flip ? 128 - set.hull.w : 0, oy: 0 };
  }
  // A full-colour picture (js/art/own.js hullArt, posesArt; drawn larger than the classic sprite)
  // as a body entry like remastered()'s, w x h classic pixels, mirrored when `flip`.
  fullColour(A, w, h, flip) {
    this.fullArt = this.fullArt || new WeakMap();
    let per = this.fullArt.get(A);
    if (!per) { per = new Map(); this.fullArt.set(A, per); }
    const key = `${w}:${h}:${flip ? 1 : 0}`;
    if (!per.has(key)) {
      const src = canvasOf(A.w, A.h), g = src.getContext('2d'), im = g.createImageData(A.w, A.h);
      const pal = A.palette.map((x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)));
      A.rows.forEach((r, y) => { for (let x = 0; x < A.w; x++) { const v = parseInt(r[x], 36); if (!v) continue; const o = (y * A.w + x) * 4; [im.data[o], im.data[o + 1], im.data[o + 2]] = pal[v]; im.data[o + 3] = 255; } });
      g.putImageData(im, 0, 0);
      const c = canvasOf(w * UP, h * UP), cg = c.getContext('2d');
      cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = 'high';
      if (flip) { cg.translate(w * UP, 0); cg.scale(-1, 1); }
      cg.drawImage(src, 0, 0, w * UP, h * UP);
      const sc = canvasOf(w * 2, h * 2), sg = sc.getContext('2d');
      sg.drawImage(c, 0, 0, w * 2, h * 2); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(0,0,12,0.62)'; sg.fillRect(0, 0, w * 2, h * 2);
      per.set(key, { c, pad: 0, fx: false, shadow: sc, glowC: null, glow: [255, 220, 200] });
    }
    return per.get(key);
  }

  // How a shot sprite is drawn: 'missile' or 'redBeam' when its side's own art asks for it for the
  // weapon slot in use (js/art/own.js `shots`), else null (the shot as recorded).
  shotKind(sp) {
    if (!this.isFx(sp) || this.isBoom(sp) || sp.size > 16) return null;
    const sc = this.scene, side = this.sideOf(sp) ? sc.rightSide : sc.leftSide;
    return (side && side.own && side.own.shots && side.own.shots[sc.slotOf(side)]) || null;
  }

  isBig(sp) {
    return this.hulls.some((o) => Math.abs(o.x - sp.x) < 36 && Math.abs(o.y - sp.y) < 36);
  }
  // The 32 px body sprites of each side's capital ship or structure (its own parts and its
  // recorded tracks), grouped per side.
  findHulls(st) {
    const groups = [[], []], sc = this.scene;
    for (const sp of st.sprites) {
      if (this.isFx(sp) || sp.size !== 32) continue;
      const g = sp.id.split('#')[0], side = this.sideOf(sp);
      const a = g[0] === 'L' ? sc.left[+g.slice(1)] : g[0] === 'R' ? sc.right[+g.slice(1)] : null;
      const own = (side ? sc.right : sc.left)[0];
      if (g[0] === 't' ? own && (own.ship || own.struct) : a && (a.ship || a.struct)) groups[side].push(sp);
    }
    this.hullGroups = groups.filter((g) => g.length >= 2);
    // a ship's own hull (js/art/own.js) is one 128 px sprite holding a 64 px wide picture: it
    // counts as the 32 px blocks it covers, so explosions on it are drawn as big as on a hull
    const own = st.sprites.filter((sp) => /^[LR]\d+own#/.test(sp.id)).flatMap((sp) => {
      const x = sp.flip ? sp.x + 64 : sp.x;
      return [0, 1].flatMap((i) => [0, 1, 2, 3].map((j) => ({ x: x + i * 32, y: sp.y + j * 32 })));
    });
    return [...groups.flat(), ...own];
  }

  // HP shown in the HUD: a craft formation loses a machine as each one explodes; a ship or
  // structure drains from its first explosion on.
  updateHud(f) {
    const sc = this.scene;
    [[sc.leftSide, sc.left], [sc.rightSide, sc.right]].forEach(([side, acts], i) => {
      if (!acts.length) return;
      if (!acts[0].ship && !acts[0].struct) {
        const dead = acts.filter((a) => a.dies && a.tDie !== undefined && f >= a.tDie).length;
        this.hpShown[i] = Math.max(side.hpAfter, side.hp - dead);
        if (f >= sc.end - 2) this.hpShown[i] = side.hpAfter;
        return;
      }
      if (this.drain[i] === null && side.hp > side.hpAfter && this.particles.some((p) => p.kind === 'ring' && p.life === p.max - 1 && (p.x < 128) === (i === 0))) this.drain[i] = f;
      if (this.drain[i] !== null) this.hpShown[i] = lerp(side.hp, side.hpAfter, Math.min(1, (f - this.drain[i]) / 50));
      if (f >= sc.end - 2) this.hpShown[i] = side.hpAfter;
    });
  }

  // ---------------------------------------------------------------- drawing
  render(alpha = 1) {
    const ctx = this.ctx, S = this.S, st = this.cur, t = (this.scene.clock || 0) + alpha;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (st.intro) { this.renderIntro(ctx, st); ctx.restore(); return; }
    // camera: shake, and a punch-in towards a heavy hit
    const sx = this.shake ? (this.rnd() - 0.5) * this.shake * S : 0, sy = this.shake ? (this.rnd() - 0.5) * this.shake * S : 0;
    let zoom = 1, fx0 = W / 2, fy0 = H / 2;
    if (this.punch) {
      const u = (this.punch.t + alpha) / 40, e = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
      zoom = 1 + 0.07 * Math.max(0, e) ** 1.5; fx0 = this.punch.x; fy0 = this.punch.y;
    }
    ctx.translate(sx + fx0 * S, sy + fy0 * S); ctx.scale(zoom, zoom); ctx.translate(-fx0 * S, -fy0 * S);
    this.drawBackdrop(ctx, st, t);
    const prev = this.prev && !this.prev.intro ? new Map(this.prev.sprites.map((sp) => [sp.id, sp])) : new Map();
    const pos = (sp) => {
      const p = prev.get(sp.id);
      if (!p || alpha >= 1 || Math.abs(p.x - sp.x) > 24 || Math.abs(p.y - sp.y) > 24) return [sp.x, sp.y];
      return [p.x + (sp.x - p.x) * alpha, p.y + (sp.y - p.y) * alpha];
    };
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    // scorched ground glow under the smoke
    ctx.globalCompositeOperation = 'lighter';
    for (const d of this.decals) {
      const a = d.life / d.max;
      ctx.globalAlpha = 0.35 * a * a;
      ctx.drawImage(blob(255, 90, 20), (d.x - d.r) * S, (d.y - d.r) * S, d.r * 2 * S, d.r * 2 * S);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // what to draw: effects, single machines, and whole hulls (their parts as one picture)
    const groupOf = new Map();
    for (const g of this.hullGroups) for (const sp of g) groupOf.set(sp.id, g);
    const items = [], done = new Set();
    for (const sp of st.sprites) {
      if (this.isFx(sp)) { items.push({ fx: sp }); continue; }
      const g = groupOf.get(sp.id);
      if (!g) { const own = this.ownHullArt(sp); if (own) { items.push(own); continue; } const e = this.sprite(sp); if (e) items.push({ e, sp, ox: 0, oy: 0 }); continue; }
      if (done.has(g)) continue;
      done.add(g);
      const G = this.group(g);
      if (G.e) items.push({ e: G.e, sp: G.first, ox: G.x0 - G.first.x, oy: G.y0 - G.first.y });
    }
    const place = (it) => { const [x, y] = pos(it.sp); return [x + it.ox, y + it.oy]; };
    // a sinking ship: from the original's sink frame its hull is a wreck breaking up (makeWreck)
    if (st.f >= SINK.t0) for (const side of [0, 1]) {
      if (!this.sinking[side]) continue;
      const hull = (it) => !it.fx && it.e && this.sideOf(it.sp) === side && (groupOf.has(it.sp.id) || /^[LR]\d+own#/.test(it.sp.id));
      if (!this.wrecks[side]) { const it = items.find(hull); if (it) { const [x, y] = place(it); this.wrecks[side] = this.makeWreck(it, x, y, side, st.f); } }
      for (let i = items.length - 1; i >= 0; i--) if (hull(items[i])) items.splice(i, 1);
    }
    const blit = (c, x, y, pad) => ctx.drawImage(c, (x - pad) * S, (y - pad) * S, (c.width / UP) * S, (c.height / UP) * S);
    // shadows
    for (const it of items) {
      if (it.fx || !it.e.shadow || this.sabreOf(it.sp)?.slash) continue;   // a sabre's slash casts no shadow
      const [x, y] = place(it), e = it.e;
      ctx.drawImage(e.shadow, (x - e.pad + 4) * S, (y - e.pad + 7) * S, (e.c.width / UP) * S, (e.c.height / UP) * S);
    }
    // bodies, with motion blur, dynamic light and emissive glow
    for (const it of items) {
      if (it.fx) { this.drawShot(ctx, it.fx, pos(it.fx)); continue; }
      const { e, sp } = it, [x, y] = place(it), p = prev.get(sp.id);
      const bw = e.c.width / UP, bh = e.c.height / UP;
      if (p && !this.reduced) {
        const dx = sp.x - p.x, dy = sp.y - p.y, v = Math.hypot(dx, dy);
        if (v > 2.2 && v < 24) for (let k = 3; k >= 1; k--) {
          ctx.globalAlpha = 0.1 * (4 - k);
          blit(e.c, x - dx * k * 0.45, y - dy * k * 0.45, e.pad);
        }
        ctx.globalAlpha = 1;
      }
      blit(e.c, x, y, e.pad);
      this.drawSabre(ctx, sp, x, y, e);
      if (e.litL && this.lights.length) {
        let wl = 0, wr = 0;
        const cx = x - e.pad + bw / 2, cy = y - e.pad + bh / 2, ext = Math.max(bw, bh) / 2;
        for (const l of this.lights) {
          const d = Math.max(0, Math.hypot(l.x - cx, l.y - cy) - ext * 0.6);
          if (d > l.r) continue;
          const w = l.i * (l.life / l.max) * (1 - d / l.r) ** 2;
          if (l.x < cx - 2) wl += w; else if (l.x > cx + 2) wr += w; else { wl += w * 0.6; wr += w * 0.6; }
        }
        ctx.globalCompositeOperation = 'lighter';
        if (wl > 0.03) { ctx.globalAlpha = Math.min(0.7, wl); blit(e.litL, x, y, e.pad); }
        if (wr > 0.03) { ctx.globalAlpha = Math.min(0.7, wr); blit(e.litR, x, y, e.pad); }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      if (e.glowC) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 0.5 + sp.x);
        blit(e.glowC.c, x, y, e.glowC.pad);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    for (const w of this.wrecks) if (w) this.drawWreck(ctx, w, st.f, alpha);
    this.drawLevCannon(ctx, st, alpha);
    this.drawParticles(ctx, S, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.overlay, 0, 0);
    if (this.whiteout > 0.02) { ctx.fillStyle = `rgba(255,245,230,${this.whiteout.toFixed(3)})`; ctx.fillRect(0, 0, W * S, H * S); }
    this.drawFrame(ctx, st, alpha);
    if (this.lastIntro && this.introEnd !== null) {
      const k = (st.f - this.introEnd + alpha) / 14;
      if (k < 1) { ctx.globalAlpha = 1 - k; this.blitIntro(ctx, 1 + k * 0.08); ctx.globalAlpha = 1; }
    }
    if (st.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - st.fade).toFixed(3)})`; ctx.fillRect(0, 0, W * S, H * S); }
    ctx.restore();
  }

  // A shot as light: a long bloom streak along its path with a white-hot core, then the sprite
  // itself on top; still shots (muzzle blasts at the gun ports) flare instead.
  drawShot(ctx, sp, [x, y]) {
    const S = this.S, e = this.sprite(sp);
    if (!e) return;
    const kind = this.shotKind(sp);
    if (kind === 'redBeam') return this.drawRedBeam(ctx, sp, x, y);
    if (kind === 'missile') return this.drawMissile(ctx, sp, x, y);
    if (kind === 'levCannon') return;   // the Leviathan's cannon fire is drawn whole (drawLevCannon)
    const [r, g, b] = e.glow, n = sp.size * S;
    const cx = (x + sp.size / 2) * S, cy = (y + sp.size / 2) * S;
    ctx.globalCompositeOperation = 'lighter';
    if (!this.isBoom(sp)) {
      const tr = this.trails.get(sp.id);
      if (tr && tr.length > 1) {
        const [tx, ty] = tr[0], len = Math.hypot(tr[tr.length - 1][0] - tx, tr[tr.length - 1][1] - ty);
        if (len > 3) {
          ctx.lineCap = 'round';
          const pts = tr.map(([px, py]) => [px * S, py * S]); pts[pts.length - 1] = [cx, cy];
          const stroke = (wd, col, a) => {
            for (let i = 1; i < pts.length; i++) {
              const f = i / (pts.length - 1);
              ctx.strokeStyle = rgbStr(col, a * f); ctx.lineWidth = Math.max(1, wd * (0.35 + 0.65 * f));
              ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
            }
          };
          stroke(sp.size * 0.9 * S, e.glow, 0.16);
          stroke(sp.size * 0.42 * S, e.glow, 0.42);
          stroke(sp.size * 0.14 * S, [255, 255, 245], 0.85);
        }
      }
    }
    const q = (sp.size + 2 * e.pad) * S;
    if (this.isBoom(sp)) {
      // the ROM's explosion sprite becomes the fireball's shape, under the particle fire
      const rad = sp.size * 1.1 * S;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(blob(255, 150, 60), cx - rad, cy - rad, rad * 2, rad * 2);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.55;
      ctx.drawImage(e.c, (x - e.pad) * S, (y - e.pad) * S, q, q);
      ctx.globalAlpha = 1;
      return;
    }
    const rad = Math.min(14, sp.size * 1.5) * S;
    ctx.globalAlpha = sp.size > 16 ? 0.4 : 0.7;
    ctx.drawImage(blob(r | 0, g | 0, b | 0), cx - rad, cy - rad, rad * 2, rad * 2);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(blob(255, 255, 240), cx - rad * 0.25, cy - rad * 0.25, rad * 0.5, rad * 0.5);
    ctx.globalAlpha = 1;
    ctx.drawImage(e.c, (x - e.pad) * S, (y - e.pad) * S, q, q);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(e.c, (x - e.pad) * S, (y - e.pad) * S, q, q);
  }

  // A melee sprite of a machine whose own art carries a `sabre` (js/art/own.js; the Directorate
  // Talos): { set, slash } when it is that side's body or slash in a melee, else null.
  sabreOf(sp) {
    const sc = this.scene;
    if (!sc.melee || sp.size !== 32 || this.isFx(sp)) return null;
    const side = this.sideOf(sp) ? sc.rightSide : sc.leftSide, set = side && side.own && side.own.sabre;
    return set ? { set, slash: (sp.base & 255) === set.slash } : null;
  }
  // The Directorate Talos's beam sabre (visual only; the recording's poses and timings): the slash
  // sprite blazes with a crimson bloom and lights the scene; on the cuts the blade glows, and its
  // tip leaves a fading crimson swing trail from frame to frame.
  drawSabre(ctx, sp, x, y, e) {
    const sab = this.sabreOf(sp);
    if (!sab) return;
    const S = this.S, col = sab.set.col, f = this.cur ? this.cur.f : 0, tile = sp.base & 255;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (sab.slash) {
      ctx.globalAlpha = 0.75;
      ctx.drawImage(e.c, (x - e.pad) * S, (y - e.pad) * S, (e.c.width / UP) * S, (e.c.height / UP) * S);
      const r = 26 * S, cx = (x + 16) * S, cy = (y + 16) * S;
      ctx.globalAlpha = 0.55; ctx.drawImage(blob(col[0], col[1], col[2]), cx - r, cy - r, r * 2, r * 2);
      ctx.globalAlpha = 0.5; ctx.drawImage(blob(255, 235, 235), cx - r * 0.3, cy - r * 0.3, r * 0.6, r * 0.6);
      ctx.restore();
      this.lights.push({ x: x + 16, y: y + 16, col, i: 0.7, r: 60, life: 1, max: 1 });
      return;
    }
    // the blade's tip in this pose: the hot pixel farthest from the body's middle (cached per pose)
    const A = sp.tiles && sp.tiles.posesArt && sp.tiles.posesArt[tile];
    this.sabreTips = this.sabreTips || new WeakMap();
    if (A && !this.sabreTips.has(A)) {
      const pal = A.palette.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
      let best = null, far = -1;
      A.rows.forEach((row, py) => { for (let px = 0; px < A.w; px++) {
        const c = pal[parseInt(row[px], 36)];
        if (!parseInt(row[px], 36) || !(c[0] > 180 && c[0] - c[1] > 70)) continue;
        const d = Math.hypot(px - A.w / 2, py - A.h / 2);
        if (d > far) { far = d; best = [px * 32 / A.w, py * 32 / A.h]; }
      } });
      this.sabreTips.set(A, best);
    }
    const tip = A ? this.sabreTips.get(A) : null;
    if (tip) {
      const tx = x + (sp.flip ? 32 - tip[0] : tip[0]), ty = y + tip[1];
      // the trail: the tip's places over the last frames of this body
      this.sabreTrail = this.sabreTrail || new Map();
      const tr = this.sabreTrail.get(sp.id) || [];
      if (!tr.length || tr[tr.length - 1].f !== f) { tr.push({ f, x: tx, y: ty }); while (tr.length && f - tr[0].f > 7) tr.shift(); this.sabreTrail.set(sp.id, tr); }
      if (tr.length > 1) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const [wd, a, c] of [[7, 0.18, col], [3.5, 0.45, col], [1.2, 0.8, [255, 235, 235]]]) {
          for (let i = 1; i < tr.length; i++) {
            const k = i / (tr.length - 1);
            ctx.strokeStyle = rgbStr(c, a * k); ctx.lineWidth = wd * S * (0.4 + 0.6 * k);
            ctx.beginPath(); ctx.moveTo(tr[i - 1].x * S, tr[i - 1].y * S); ctx.lineTo(tr[i].x * S, tr[i].y * S); ctx.stroke();
          }
        }
      }
      const cut = sab.set.cuts.includes(tile), r = (cut ? 16 : 8) * S;
      ctx.globalAlpha = cut ? 0.7 : 0.35;
      ctx.drawImage(blob(col[0], col[1], col[2]), tx * S - r, ty * S - r, r * 2, r * 2);
      if (cut) this.lights.push({ x: tx, y: ty, col, i: 0.45, r: 40, life: 1, max: 1 });
    }
    ctx.restore();
  }

  // The Azoras's anti-ship gun: a thick red beam from where the shot left the cannon to where it is
  // now, with a glowing halo and a white-hot core (visual only: the recorded shot's timing).
  drawRedBeam(ctx, sp, x, y) {
    const S = this.S, cx = (x + sp.size / 2) * S, cy = (y + sp.size / 2) * S;
    const o = this.shotOrigin.get(sp.id) || [x + sp.size / 2, y + sp.size / 2], ox = o[0] * S, oy = o[1] * S;
    // the beam reaches across to the target: the nearest edge of the other side's machines
    const right = this.sideOf(sp) === 0, foes = (this.cur.sprites || []).filter((q) => !this.isFx(q) && this.sideOf(q) !== this.sideOf(sp));
    const edge = foes.length ? (right ? Math.min(...foes.map((q) => q.x + 6)) : Math.max(...foes.map((q) => q.x + q.size - 6))) : null;
    const reach = edge === null ? cx : Math.max(right ? cx : -Infinity, Math.min(right ? Infinity : cx, edge * S));
    const tx = right ? Math.max(cx, reach) : Math.min(cx, reach), ty = cy;
    const flick = 0.85 + 0.15 * Math.sin((this.scene.clock || 0) * 1.7 + sp.y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [wd, col, a] of [[14, [255, 30, 40], 0.18], [8, [255, 50, 50], 0.45], [4.5, [255, 120, 110], 0.8], [1.8, [255, 245, 235], 1]]) {
      ctx.strokeStyle = rgbStr(col, a * flick); ctx.lineWidth = wd * S;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, ty); ctx.stroke();
    }
    const rad = 12 * S;
    ctx.globalAlpha = 0.8; ctx.drawImage(blob(255, 40, 40), tx - rad, ty - rad, rad * 2, rad * 2);
    ctx.globalAlpha = 0.6; ctx.drawImage(blob(255, 60, 60), ox - rad * 0.7, oy - rad * 0.7, rad * 1.4, rad * 1.4);
    ctx.restore();
    this.lights.push({ x: x + sp.size / 2, y: y + sp.size / 2, col: [255, 40, 40], i: 0.5, r: 40, life: 1, max: 1 });
  }
  // The Leviathan's guns (js/art/leviathan.js `shots`: 'levCannon'; visual only). Its recorded
  // shots (the Nodens's: every one of its weapons fights with that one recording) are not drawn;
  // instead, from the muzzle of the spinal cannon (`muzzle`, in the hull picture's box) to the
  // other side: by the weapon the Leviathan really uses (the side's ownSlot),
  //   1 the super-cannon: a 48-frame charge (a violet orb swelling, energy drawn in, arcs), then a
  //     thick violet beam with a white core and pulses running down it, a flash and quake as it
  //     fires, shock rings and sparks where it lands, and the muzzle glowing as it dies down;
  //   0 the beam: a short charge and a thinner violet lance;
  //   2 the railgun: no charge, three red rail streaks.
  // The beam lasts from the recorded fire frame while the recording's shots are on screen; hits,
  // explosions and their timing stay as recorded.
  levCannon(st) {
    const sc = this.scene, out = [];
    [sc.leftSide, sc.rightSide].forEach((side, i) => {
      const own = side && side.own;
      if (!own || !own.muzzle || own.shots?.[sc.slotOf(side)] !== 'levCannon' || !(i ? sc.shooters.right : sc.shooters.left)) return;
      const a = (i ? sc.right : sc.left)[0], hull = st.sprites.find((sp) => this.sideOf(sp) === i && /^[LR]\d+own#/.test(sp.id));
      if (!a || !hull) return;
      const mx = i ? hull.x + 127 - own.muzzle[0] : hull.x + own.muzzle[0], my = hull.y + own.muzzle[1];
      const foes = st.sprites.filter((sp) => !this.isFx(sp) && this.sideOf(sp) !== i);
      const tx = foes.length ? (i ? Math.max(...foes.map((q) => q.x + q.size - 6)) : Math.min(...foes.map((q) => q.x + 6))) : (i ? 30 : 194);
      // against a ship or structure the beam runs level (as recorded); against craft, at the squad
      const ship = !!(i ? sc.left : sc.right)[0]?.ship || !!(i ? sc.left : sc.right)[0]?.struct;
      const ty = !foes.length || ship ? my : foes.reduce((t, q) => t + q.y + q.size / 2, 0) / foes.length;
      const slot = side.ownSlot ?? 1, st0 = this.lev?.[i];
      out.push({ i, mx, my, tx, ty, slot, fire: a.rec ? a.rec.fire : 129, last: st0 ? st0.last : -1, fired: st0 ? st0.fired : false });
    });
    return out;
  }
  levCannonTick(cur) {
    if (cur.intro) return;
    this.lev = this.lev || [null, null];
    for (const c of this.levCannon(cur)) {
      const shots = cur.sprites.some((sp) => this.isFx(sp) && !this.isBoom(sp) && this.sideOf(sp) === c.i && sp.size <= 16);
      const s = this.lev[c.i] = this.lev[c.i] || { last: -1, fired: false };
      if (shots && cur.f >= c.fire) s.last = cur.f;
      const on = cur.f >= c.fire && cur.f <= Math.max(c.fire + 24, s.last + 4);
      if (!on || this.reduced) continue;
      const main = c.slot === 1, col = c.slot === 2 ? [255, 70, 60] : [190, 120, 255];
      if (!s.fired) {   // the shot leaves: flash, quake, a burst at the muzzle
        s.fired = true;
        if (main) { this.whiteout = Math.min(0.5, this.whiteout + 0.35); this.shake = Math.max(this.shake, 6); this.punch = { x: c.tx, y: c.ty, t: 0 }; }
        else this.shake = Math.max(this.shake, 2.5);
        this.particles.push({ kind: 'flash', x: c.mx, y: c.my, vx: 0, vy: 0, drag: 1, g: 0, r: main ? 34 : 16, life: 9, max: 9, col: mix(col, [255, 255, 255], 0.5) });
      }
      // sparks spray from where it lands
      for (let k = 0; k < (main ? 4 : 2); k++) {
        const ang = (c.i ? 0 : Math.PI) + (this.rnd() - 0.5) * 2.2, v = 1.5 + this.rnd() * (main ? 4 : 2.5);
        this.particles.push({ kind: 'spark', x: c.tx, y: c.ty + (this.rnd() - 0.5) * 10, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, drag: 0.88, g: 0.04, life: 10 + (this.rnd() * 10 | 0), max: 20, col: mix(col, [255, 255, 230], 0.5) });
      }
      this.lights.push({ x: c.tx, y: c.ty, col, i: main ? 0.9 : 0.5, r: main ? 70 : 40, life: 1, max: 1 });
      this.lights.push({ x: c.mx, y: c.my, col, i: 0.6, r: 40, life: 1, max: 1 });
    }
  }
  drawLevCannon(ctx, st, alpha) {
    if (st.intro) return;
    const S = this.S, f = st.f + alpha;
    for (const c of this.levCannon(st)) {
      const main = c.slot === 1, rail = c.slot === 2, charge = main ? 48 : rail ? 0 : 14;
      const end = Math.max(c.fire + 24, c.last + 4), mx = c.mx * S, my = c.my * S, tx = c.tx * S, ty = c.ty * S;
      const seed = (n) => { const x = Math.sin(n * 12.9898 + c.i * 78.233) * 43758.5453; return x - Math.floor(x); };
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (charge && f >= c.fire - charge && f < c.fire + 2) {
        // the charge: an orb swelling at the muzzle, streaks of energy drawn into it, crackling arcs
        const k = Math.min(1, (f - (c.fire - charge)) / charge), rad = (3 + (main ? 16 : 7) * k * k) * S;
        ctx.globalAlpha = 0.55 + 0.35 * k; ctx.drawImage(blob(150, 70, 255), mx - rad * 2, my - rad * 2, rad * 4, rad * 4);
        ctx.globalAlpha = 0.9; ctx.drawImage(blob(240, 220, 255), mx - rad * 0.7, my - rad * 0.7, rad * 1.4, rad * 1.4);
        ctx.globalAlpha = 1;
        for (let n = 0; n < (main ? 8 : 4); n++) {
          const ang = seed(n) * 6.283 + f * 0.05, u = ((f * 0.045 + seed(n + 9)) % 1), r0 = (46 * (1 - u) + 4) * S * (main ? 1 : 0.6);
          ctx.strokeStyle = rgbStr([200, 150, 255], 0.75 * u); ctx.lineWidth = (0.8 + 1.4 * u) * S;
          ctx.beginPath(); ctx.moveTo(mx + Math.cos(ang) * r0, my + Math.sin(ang) * r0);
          ctx.lineTo(mx + Math.cos(ang) * (r0 * 0.55 + rad * 0.4), my + Math.sin(ang) * (r0 * 0.55 + rad * 0.4)); ctx.stroke();
        }
        if (main && k > 0.25) for (let n = 0; n < 3; n++) {   // arcs, re-forming every 3 frames
          const fr = Math.floor(f / 3) * 7 + n * 31, ang = seed(fr) * 6.283, len = (10 + 18 * k) * S;
          ctx.strokeStyle = rgbStr([230, 200, 255], 0.85); ctx.lineWidth = 0.9 * S; ctx.beginPath(); ctx.moveTo(mx, my);
          for (let s = 1; s <= 4; s++) ctx.lineTo(mx + Math.cos(ang) * len * s / 4 + (seed(fr + s) - 0.5) * 7 * S, my + Math.sin(ang) * len * s / 4 + (seed(fr + s + 5) - 0.5) * 7 * S);
          ctx.stroke();
        }
      }
      if (f >= c.fire && f <= end + 10) {
        const on = Math.min(1, (f - c.fire) / 3) * Math.max(0, Math.min(1, (end + 10 - f) / 10));
        if (rail) {
          // three red rail streaks, flickering
          for (let n = 0; n < 3; n++) {
            const dy = (n - 1) * 5 * S, fl = 0.6 + 0.4 * seed(Math.floor(f) * 3 + n);
            for (const [wd, col, a] of [[5, [255, 40, 30], 0.3], [2, [255, 110, 90], 0.8], [0.8, [255, 245, 235], 1]]) {
              ctx.strokeStyle = rgbStr(col, a * on * fl); ctx.lineWidth = wd * S;
              ctx.beginPath(); ctx.moveTo(mx, my + dy * 0.3); ctx.lineTo(tx, ty + dy); ctx.stroke();
            }
          }
        } else {
          // the beam: a wide violet halo, a magenta body, a white-hot core; it throbs
          const thick = main ? 1 : 0.45, throb = 0.88 + 0.12 * Math.sin(f * 1.9) + 0.05 * Math.sin(f * 5.3);
          for (const [wd, col, a] of [[30, [110, 40, 255], 0.16], [19, [170, 80, 255], 0.35], [11, [220, 120, 255], 0.6], [6, [255, 200, 255], 0.85], [2.6, [255, 255, 255], 1]]) {
            ctx.strokeStyle = rgbStr(col, a * on); ctx.lineWidth = wd * thick * throb * on * S;
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty); ctx.stroke();
          }
          // energy pulses running down the beam
          const len = Math.hypot(tx - mx, ty - my), ux = (tx - mx) / (len || 1), uy = (ty - my) / (len || 1);
          for (let n = 0; n < (main ? 5 : 2); n++) {
            const d = ((f - c.fire) * 14 * S + n * len / (main ? 5 : 2)) % len, pr = (main ? 9 : 5) * S * on;
            ctx.globalAlpha = 0.8 * on; ctx.drawImage(blob(255, 230, 255), mx + ux * d - pr, my + uy * d - pr, pr * 2, pr * 2);
          }
          ctx.globalAlpha = 1;
          // the muzzle burning, and the shock rings where it lands
          const mr = (main ? 16 : 8) * S * throb * on;
          ctx.globalAlpha = 0.9; ctx.drawImage(blob(200, 140, 255), mx - mr, my - mr, mr * 2, mr * 2);
          ctx.drawImage(blob(255, 255, 255), mx - mr * 0.4, my - mr * 0.4, mr * 0.8, mr * 0.8);
          const ir = (main ? 22 : 11) * S * throb * on;
          ctx.drawImage(blob(230, 150, 255), tx - ir, ty - ir, ir * 2, ir * 2);
          ctx.globalAlpha = 1;
          if (main) for (let n = 0; n < 3; n++) {
            const u = ((f - c.fire) / 16 + n / 3) % 1, rr = (6 + 40 * u) * S;
            if (f > end) continue;
            ctx.strokeStyle = rgbStr([220, 170, 255], 0.55 * (1 - u) * on); ctx.lineWidth = (3 * (1 - u) + 0.6) * S;
            ctx.beginPath(); ctx.ellipse(tx, ty, rr * 0.55, rr, 0, 0, Math.PI * 2); ctx.stroke();
          }
        }
      }
      if (main && f > end && f < end + 40) {   // afterglow: the muzzle cools
        const k = 1 - (f - end) / 40, rad = 10 * k * S;
        ctx.globalAlpha = 0.7 * k; ctx.drawImage(blob(160, 90, 255), mx - rad, my - rad, rad * 2, rad * 2); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }
  // A missile's homing path (the Azoras's slot 0; visual only). The recorded battery shots fly
  // straight along lanes towards the robots, each lane's flight made of short-lived sprites; the
  // missiles are drawn on one curve per lane instead: launched angled out and up from the hull,
  // weaving a little (staggered per lane), then curving in onto the robot in that lane. A shot's
  // place on the curve is its recorded progress from the hull to that robot, so the missile
  // arrives on the frame the recorded shot would hit; past it (a miss) it flies on along the
  // curve's end tangent. A lane is forgotten after 20 frames without shots (the next volley).
  // Returns the lane's { at(x) -> [x, y] } for a recorded shot centre x.
  homing(sp, cx, cy) {
    const side = this.sideOf(sp), dir = side === 0 ? 1 : -1, f = this.cur.f, key = `${side}:${Math.round(cy / 4)}`;
    const centre = (q) => [q.x + q.size / 2, q.y + q.size / 2];
    let m = this.lanes.get(key);
    if (!m || f - m.seen > 20) {
      let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      h = (h ^ (f * 2654435761)) >>> 0;
      const own = (this.cur.sprites || []).filter((q) => !this.isFx(q) && this.sideOf(q) === side);
      const edge = own.length ? (dir > 0 ? Math.max(...own.map((q) => q.x + q.size)) : Math.min(...own.map((q) => q.x))) : cx;
      const ox = dir > 0 ? Math.min(cx, edge - 24) : Math.max(cx, edge + 24);
      const foes = (this.cur.sprites || []).filter((q) => !this.isFx(q) && this.sideOf(q) !== side && (q.x + q.size / 2 - ox) * dir > 8);
      let best = null, bd = Infinity;
      for (const q of foes) { const [qx, qy] = centre(q), d = Math.abs(qy - cy) * 3 + Math.abs(qx - ox) * 0.25; if (d < bd) { bd = d; best = q; } }
      m = { O: [ox, cy], tid: best && best.id, T: best ? centre(best) : [ox + dir * 140, cy], s: h & 1 ? 1 : -1, amp: 18 + (h >> 3) % 16, k: 1 + ((h >> 7) % 10) / 10, ph: ((h >> 11) % 628) / 100 };
      this.lanes.set(key, m);
      this.muzzle(ox, cy, [255, 180, 90], 10);   // launch
    }
    m.seen = f;
    const cur = m.tid && (this.cur.sprites || []).find((q) => q.id === m.tid);
    if (cur) m.T = centre(cur);
    const [Ox, Oy] = m.O, [Tx, Ty] = m.T;
    const C1 = [Ox + dir * 14, Oy - m.s * m.amp * 2.4], C2 = [Tx - dir * 34, Ty + m.s * m.amp * 0.6];
    const bez = (t) => { const u = 1 - t; return [0, 1].map((i) => u * u * u * [Ox, Oy][i] + 3 * u * u * t * C1[i] + 3 * u * t * t * C2[i] + t * t * t * [Tx, Ty][i]); };
    m.at = (x) => {
      const span = Tx - Ox, t = Math.abs(span) > 1 ? (x - Ox) / span : 1;
      if (t <= 1) {
        const tt = Math.max(0, t), [bx, by] = bez(tt), w = Math.sin(tt * Math.PI * m.k * 2 + m.ph) * 5 * 4 * tt * (1 - tt);
        const [ax, ay] = bez(Math.max(0, tt - 0.02)), nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny) || 1;
        return [bx + (nx / nl) * w, by + (ny / nl) * w];
      }
      const ex = Tx - C2[0], ey = Ty - C2[1], el = Math.hypot(ex, ey) || 1, over = (t - 1) * Math.abs(span);   // a miss flies on
      return [Tx + (ex / el) * over, Ty + (ey / el) * over];
    };
    return m;
  }

  // The Azoras's anti-robot weapon: a missile (white body, red nose, a flame behind) pointing
  // along its flight, in place of the borrowed battery shot.
  drawMissile(ctx, sp, x, y) {
    const S = this.S, m = this.lanes.get(`${this.sideOf(sp)}:${Math.round((y + sp.size / 2) / 4)}`), rx = x + sp.size / 2, ry = y + sp.size / 2, dir = this.sideOf(sp) ? -1 : 1;
    // on its homing curve (homing()), rotated along its velocity there
    const [hx, hy] = m && m.at ? m.at(rx, ry) : [rx, ry], [px, py] = m && m.at ? m.at(rx - dir * 1.5, ry) : [rx - dir, ry];
    const cx = hx * S, cy = hy * S, ang = Math.atan2(hy - py, hx - px);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(1.6, 1.6);
    ctx.globalCompositeOperation = 'lighter';
    const fr = 6 * S; ctx.globalAlpha = 0.9; ctx.drawImage(blob(255, 150, 50), -9 * S - fr, -fr, fr * 2, fr * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#e9ecf7'; ctx.strokeStyle = '#2a2d44'; ctx.lineWidth = 0.6 * S;
    ctx.beginPath(); ctx.moveTo(-6 * S, -1.6 * S); ctx.lineTo(3 * S, -1.6 * S); ctx.lineTo(6 * S, 0); ctx.lineTo(3 * S, 1.6 * S); ctx.lineTo(-6 * S, 1.6 * S); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.moveTo(3 * S, -1.6 * S); ctx.lineTo(6 * S, 0); ctx.lineTo(3 * S, 1.6 * S); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9aa0bd'; ctx.beginPath(); ctx.moveTo(-6 * S, -1.6 * S); ctx.lineTo(-7.5 * S, -3.2 * S); ctx.lineTo(-4 * S, -1.6 * S); ctx.moveTo(-6 * S, 1.6 * S); ctx.lineTo(-7.5 * S, 3.2 * S); ctx.lineTo(-4 * S, 1.6 * S); ctx.fill();
    ctx.restore();
  }

  drawParticles(ctx, S, t) {
    // smoke and debris first (they block light), then everything that glows
    for (const p of this.particles) {
      const a = p.life / p.max;
      if (p.kind === 'smoke') {
        const age = p.max - p.life, fadeIn = Math.min(1, age / 6);
        ctx.globalAlpha = Math.min(1, a * 1.4) * fadeIn * 0.85;
        ctx.drawImage(puff(p.shade, (p.rot * 3) | 0), (p.x - p.r) * S, (p.y - p.r) * S, p.r * 2 * S, p.r * 2 * S);
      } else if (p.kind === 'fire') {
        // hot yellow cooling to orange, then dark red as it swells
        const col = a > 0.7 ? mix([255, 160, 50], [255, 236, 160], (a - 0.7) / 0.3) : mix([110, 25, 10], [255, 160, 50], a / 0.7);
        const rad = p.r * S;
        ctx.globalAlpha = Math.min(1, a * 1.2);
        ctx.drawImage(blob(col[0] | 0, col[1] | 0, col[2] | 0, true), p.x * S - rad, p.y * S - rad, rad * 2, rad * 2);
      } else if (p.kind === 'debris') {
        // tumbling: the chip's width and height swap as it turns
        const cw = p.r * (0.4 + 1.6 * Math.abs(Math.cos(p.rot))), ch = p.r * (0.4 + 0.9 * Math.abs(Math.sin(p.rot)));
        ctx.globalAlpha = Math.min(1, a * 1.6);
        ctx.fillStyle = rgbStr(p.col); ctx.fillRect((p.x - cw / 2) * S, (p.y - ch / 2) * S, cw * S, ch * S);
        if (p.hot) { ctx.fillStyle = `rgba(255,150,60,${(a * 0.9).toFixed(3)})`; ctx.fillRect((p.x - cw / 4) * S, (p.y - ch / 4) * S, cw * 0.5 * S, ch * 0.5 * S); }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    const sparks = new Map();
    for (const p of this.particles) {
      const a = p.life / p.max, c = p.col;
      if (p.kind === 'spark' || p.kind === 'ember') {
        // batched: one path per colour and brightness step
        const key = `${c[0] >> 5},${c[1] >> 5},${c[2] >> 5},${(a * 4) | 0},${p.kind}`;
        (sparks.get(key) || sparks.set(key, { c, a: ((a * 4) | 0) / 4 + 0.125, w: p.kind === 'ember' ? 1.6 : 1.1, pts: [] }).get(key)).pts.push(p);
      } else if (p.kind === 'flash') {
        const rad = p.r * S * (0.5 + 0.5 * a);
        ctx.globalAlpha = a * 0.75;
        ctx.drawImage(blob(c[0] | 0, c[1] | 0, c[2] | 0), p.x * S - rad, p.y * S - rad, rad * 2, rad * 2);
        ctx.drawImage(blob(255, 255, 255, true), p.x * S - rad * 0.3, p.y * S - rad * 0.3, rad * 0.6, rad * 0.6);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'flare') {
        const rad = p.r * S * (0.4 + 0.6 * a);
        ctx.globalAlpha = a;
        ctx.drawImage(blob(c[0] | 0, c[1] | 0, c[2] | 0), p.x * S - rad * 0.6, p.y * S - rad * 0.6, rad * 1.2, rad * 1.2);
        // anamorphic streak: a long thin horizontal glint and a short vertical one
        const hb = blob(255, 250, 235), wl = rad * 2.6, hl = rad * 0.12;
        ctx.drawImage(hb, p.x * S - wl, p.y * S - hl, wl * 2, hl * 2);
        ctx.drawImage(hb, p.x * S - hl * 0.8, p.y * S - rad * 0.9, hl * 1.6, rad * 1.8);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = rgbStr(mix(c, [255, 190, 120], 0.5), a * 0.4); ctx.lineWidth = 2 * S * a;
        ctx.beginPath(); ctx.arc(p.x * S, p.y * S, p.r * S, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = rgbStr([255, 255, 255], a * 0.4); ctx.lineWidth = 1 * S * a;
        ctx.beginPath(); ctx.arc(p.x * S, p.y * S, p.r * S * 0.96, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'fire') {
        // a little light of its own on top of the (normally blended) fireball
        const rad = p.r * S * 1.6;
        ctx.globalAlpha = a * 0.25;
        ctx.drawImage(blob(255, 150, 60), p.x * S - rad, p.y * S - rad, rad * 2, rad * 2);
        ctx.globalAlpha = 1;
      }
    }
    ctx.lineCap = 'round';
    for (const b of sparks.values()) {
      ctx.strokeStyle = rgbStr(b.c, b.a); ctx.lineWidth = b.w * S;
      ctx.beginPath();
      for (const p of b.pts) { ctx.moveTo(p.x * S, p.y * S); ctx.lineTo((p.x - p.vx * 2.2) * S, (p.y - p.vy * 2.2) * S); }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Letterbox bars that close in as the battle starts, and the HUD inside them: each side's name
  // and HP, in its army's colour.
  drawFrame(ctx, st, alpha) {
    const S = this.S, f = Math.max(0, st.f + alpha), k = Math.min(1, f / 20), e = 1 - (1 - k) ** 3, bh = BAR * S * e;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W * S, bh); ctx.fillRect(0, H * S - bh, W * S, bh);
    if (k < 0.3) return;
    ctx.globalAlpha = Math.min(1, (k - 0.3) / 0.4);
    const sc = this.scene, fs = Math.max(8, Math.round(4.2 * S));
    ctx.font = `700 ${fs}px "Chakra Petch", "Rajdhani", system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    [sc.leftSide, sc.rightSide].forEach((side, i) => {
      const col = ARMY[side.army === 1 ? 1 : 0], right = i === 1, y = H * S - bh / 2;
      const hp = this.hpShown[i], max = Math.max(1, side.hp), bw = 64 * S, x0 = right ? W * S - 8 * S - bw : 8 * S;
      // name
      ctx.fillStyle = rgbStr(col); ctx.textAlign = right ? 'right' : 'left';
      const label = this.labels[i] || (right ? 'TARGET' : 'UNIT');
      ctx.fillText(label, right ? W * S - 8 * S : 8 * S, bh / 2);
      // hp: segmented bar with the number
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0, y - 1.4 * S, bw, 2.8 * S);
      const segs = Math.min(16, max), gap = 0.6 * S, sw = (bw - gap * (segs - 1)) / segs, frac = hp / max;
      for (let s = 0; s < segs; s++) {
        const on = Math.min(1, Math.max(0, frac * segs - s));
        if (on <= 0) continue;
        const sx = right ? x0 + bw - (s + 1) * sw - s * gap : x0 + s * (sw + gap);
        ctx.fillStyle = rgbStr(mix(col, [255, 255, 255], 0.15), 0.95);
        ctx.fillRect(right ? sx + sw * (1 - on) : sx, y - 1.4 * S, sw * on, 2.8 * S);
      }
      ctx.fillStyle = '#fff'; ctx.textAlign = right ? 'right' : 'left';
      ctx.font = `600 ${Math.round(fs * 0.9)}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.fillText(`HP ${Math.round(hp)}`, right ? x0 - 3 * S : x0 + bw + 3 * S, y);
      ctx.font = `700 ${fs}px "Chakra Petch", "Rajdhani", system-ui, sans-serif`;
    });
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- the info screen
  renderIntro(ctx, st) {
    const I = this.scene.intro, S = this.S;
    if (!this.introCanvas) { this.introCanvas = canvasOf(W, H); this.introCanvas.width = W; this.introCanvas.height = H; }
    const g = this.introCanvas.getContext('2d');
    I.render(g, st.clock);
    const img = g.getImageData(0, 0, W, H), u32 = new Uint32Array(img.data.buffer);
    let hash = 0; for (let i = 0; i < u32.length; i += 7) hash = (hash * 31 + u32[i]) | 0;
    if (hash !== this.introHash) {
      this.introHash = hash;
      const up = scale2x(u32, W, H), n = W * 2, m = H * 2;
      if (!this.lastIntro) this.lastIntro = canvasOf(n, m);
      const lg = this.lastIntro.getContext('2d'), out = lg.createImageData(n, m);
      new Uint32Array(out.data.buffer).set(up);
      lg.putImageData(out, 0, 0);
    }
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W * S, H * S);
    const k = Math.min(1, st.clock / 24), ease = 1 - (1 - k) ** 3;
    ctx.globalAlpha = ease;
    this.blitIntro(ctx, 0.94 + 0.06 * ease);
    ctx.globalAlpha = 1;
  }

  blitIntro(ctx, zoom) {
    const S = this.S, w = W * S * zoom, h = H * S * zoom;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(this.lastIntro, (W * S - w) / 2, (H * S - h) / 2, w, h);
  }
}

// Screen pixels per scene pixel for a canvas shown `cssWidth` px wide on this display.
export function fightScale(cssWidth = 768) {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  return Math.max(2, Math.min(4, Math.round((cssWidth * dpr) / W)));
}
