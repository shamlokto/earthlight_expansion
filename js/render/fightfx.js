// Modern renderer for the fight cut-ins. The choreography stays the original's: FightScene
// (js/game/fightscene.js) decides every frame what is where, and frameState() hands this renderer
// the sprites it would draw. Here they are drawn at high resolution: the ROM's own sprites and
// backdrops upscaled with Scale2x applied twice (a pixel-art filter that rounds diagonals instead
// of blowing pixels up into blocks), lit and shadowed, over a deep starfield, with additive glow
// on shots, trails, muzzle flashes, particle explosions with debris and smoke, screen shake on
// heavy hits (not with prefers-reduced-motion), motion interpolated between the game's 60 fps
// frames, and eased transitions around the info screen.
//
//   const fx = new FightRenderer(scene, canvas);   // after each scene.step(): fx.update();
//   fx.render(alpha);                              // alpha: 0..1 between the last two steps
const W = 256, H = 224, UP = 4;   // the scene's coordinates; sprites are cached at 4x
const BOOM_TILES = new Set([192, 196, 200]);

// ------------------------------------------------------------------ Scale2x / Scale4x
// Scale2x (EPX) on an array of colour keys (palette indices or packed RGBA): each pixel becomes
// 2x2, taking a neighbour's colour on a corner where two neighbours agree and the others don't.
function scale2x(src, w, h) {
  const out = new (src.constructor)(w * h * 4), W2 = w * 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = src[y * w + x];
      const a = y > 0 ? src[(y - 1) * w + x] : p, b = x < w - 1 ? src[y * w + x + 1] : p;
      const c = x > 0 ? src[y * w + x - 1] : p, d = y < h - 1 ? src[(y + 1) * w + x] : p;
      let e0 = p, e1 = p, e2 = p, e3 = p;
      if (c === a && c !== d && a !== b) e0 = a;
      if (a === b && a !== c && b !== d) e1 = b;
      if (d === c && d !== b && c !== a) e2 = c;
      if (b === d && b !== a && d !== c) e3 = d;
      const o = y * 2 * W2 + x * 2;
      out[o] = e0; out[o + 1] = e1; out[o + W2] = e2; out[o + W2 + 1] = e3;
    }
  }
  return out;
}
const scale4x = (src, w, h) => scale2x(scale2x(src, w, h), w * 2, h * 2);

// Document canvases where there is a document: drawing an OffscreenCanvas onto the page canvas
// forces a readback on software-rendered browsers (seconds per frame in headless Chromium).
function canvasOf(w, h) {
  if (typeof document !== 'undefined') return Object.assign(document.createElement('canvas'), { width: w, height: h });
  return new OffscreenCanvas(w, h);
}

// A soft round blob of one colour (centre alpha 1 fading to 0), cached by colour: particles
// draw it scaled with globalAlpha instead of building a radial gradient each frame.
const BLOBS = new Map();
function blob(r, g, b) {
  const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
  let c = BLOBS.get(key);
  if (!c) {
    c = canvasOf(64, 64);
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    const col = `${(r >> 4) * 17},${(g >> 4) * 17},${(b >> 4) * 17}`;
    gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.35, `rgba(${col},0.55)`); gr.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    BLOBS.set(key, c);
  }
  return c;
}

// ------------------------------------------------------------------ the renderer
export class FightRenderer {
  constructor(scene, canvas, opts = {}) {
    this.scene = scene; this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.S = canvas.width / W;                     // screen pixels per scene pixel
    this.reduced = opts.reducedMotion ?? (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.sprites = new Map();                      // cache key -> { c: canvas, glow: [r,g,b], lit }
    this.tilesId = new WeakMap(); this.nTiles = 0;
    this.particles = [];
    this.trails = new Map();                       // shot id -> recent centres
    this.shake = 0; this.seed = 1;
    this.prev = null; this.cur = scene.frameState(); this.hulls = [];
    this.introImg = null; this.introCanvas = null; this.lastIntro = null; this.introEnd = null;
    this.stars = this.makeStars();
    this.buildBackdrop();
  }

  rnd() { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x80000000; }

  // ---------------------------------------------------------------- backdrop
  // The two terrain layers of the original (left side's terrain over the right side's), upscaled
  // once, transparent where the original shows the backdrop colour, so a starfield shows through.
  buildBackdrop() {
    const s = this.scene;
    const layer = (L) => {
      if (!L.pal.length) return null;
      const up = scale4x(L.px, 256, 256), n = 256 * UP, c = canvasOf(n, n), g = c.getContext('2d');
      const img = g.createImageData(n, n), d = img.data;
      for (let i = 0; i < up.length; i++) {
        const k = up[i];
        if (!k) continue;
        const col = L.pal[k], o = i * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      if (this.S === UP) return c;
      // resampled once to screen resolution, so each frame's blits are 1:1
      const m = 256 * this.S, o = canvasOf(m, m), og = o.getContext('2d');
      og.imageSmoothingQuality = 'high'; og.drawImage(c, 0, 0, m, m);
      return o;
    };
    this.bgL = layer(s.bgL); this.bgR = layer(s.bgR);
    this.buildOverlays();
  }
  // The full-screen gradients never change, so they are drawn once: deep space under everything,
  // and one overlay on top (light from above, atmosphere below, a vignette).
  buildOverlays() {
    const w = W * this.S, h = H * this.S;
    this.space = canvasOf(w, h);
    let g = this.space.getContext('2d'), gr = g.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, w * 0.75);
    gr.addColorStop(0, '#1a2a6c'); gr.addColorStop(0.55, '#0c1440'); gr.addColorStop(1, '#03051a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    this.overlay = canvasOf(w, h);
    g = this.overlay.getContext('2d');
    gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(120,160,255,0.10)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,20,0.30)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    gr = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.72);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,8,0.45)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }

  makeStars() {
    const out = [];
    for (let i = 0; i < 160; i++) out.push({ x: this.rnd() * W, y: this.rnd() * H, z: 0.2 + this.rnd() * 0.8, tw: this.rnd() * 6.28 });
    return out;
  }

  drawBackdrop(ctx, st, t) {
    const S = this.S, [h1, v1, h2, v2] = st.scroll;
    // deep space: a navy gradient around the original's backdrop colour, with parallax stars
    ctx.drawImage(this.space, -S * 4, -S * 4, (W + 8) * S, (H + 8) * S);   // a margin for the shake
    const drift = (h1 - h2) * 0.25;
    for (const p of this.stars) {
      const x = ((p.x + drift * p.z + t * 0.05 * p.z) % W + W) % W, y = p.y;
      const a = 0.35 + 0.65 * p.z * (0.6 + 0.4 * Math.sin(t * 0.08 + p.tw));
      ctx.fillStyle = `rgba(200,220,255,${a.toFixed(3)})`;
      const r = (0.4 + p.z * 0.9) * S * 0.5;
      ctx.fillRect(x * S - r, y * S - r, r * 2, r * 2);
    }
    // the terrain layers, scrolled as in the original (BG2 under BG1, both 8 px down)
    // each layer wraps at 256 px: drawn as up to four plain blits rather than a pattern fill,
    // which software canvases rasterise slowly
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

  sprite(sp, lit = true) {
    if (!this.tilesId.has(sp.tiles)) this.tilesId.set(sp.tiles, ++this.nTiles);
    const key = `${this.tilesId.get(sp.tiles)}:${sp.base}:${sp.size}:${sp.flip}:${sp.vflip}:${sp.row}:${lit}`;
    let e = this.sprites.get(key);
    if (e) return e;
    const n = sp.size, idx = new Uint8Array(n * n), obj = this.scene.obj;
    for (let py = 0; py < n; py++) {
      for (let px = 0; px < n; px++) {
        const sx = sp.flip ? n - 1 - px : px, sy = sp.vflip ? n - 1 - py : py;
        idx[py * n + px] = sp.tiles(sp.base + (sy >> 3) * 16 + (sx >> 3))[(sy & 7) * 8 + (sx & 7)];
      }
    }
    const up = scale4x(idx, n, n), m = n * UP, c = canvasOf(m, m), g = c.getContext('2d');
    const img = g.createImageData(m, m), d = img.data;
    let r = 0, gg = 0, b = 0, cnt = 0, any = false;
    for (let i = 0; i < up.length; i++) {
      const k = up[i];
      if (!k) continue;
      const col = obj[sp.row * 16 + k], o = i * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; any = true;
      const lum = col[0] + col[1] + col[2];
      if (lum > 300) { r += col[0]; gg += col[1]; b += col[2]; cnt++; }
    }
    g.putImageData(img, 0, 0);
    const fx = this.isFx(sp);
    if (!fx && any && lit !== false) {
      g.globalCompositeOperation = 'source-atop';
      let lg;
      if (lit === true) {   // small craft: light from the top left, shade towards the bottom right
        lg = g.createLinearGradient(0, 0, m, m);
        lg.addColorStop(0, 'rgba(255,255,255,0.22)'); lg.addColorStop(0.45, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,30,0.32)');
      } else {              // a hull part at screen height `lit`: one gradient down the whole screen
        lg = g.createLinearGradient(0, -lit * UP, 0, (H - lit) * UP);
        lg.addColorStop(0, 'rgba(255,255,255,0.24)'); lg.addColorStop(0.35, 'rgba(255,255,255,0.04)'); lg.addColorStop(0.7, 'rgba(0,0,20,0.12)'); lg.addColorStop(1, 'rgba(60,110,255,0.26)');
      }
      g.fillStyle = lg; g.fillRect(0, 0, m, m);
      g.globalCompositeOperation = 'source-over';
    }
    // a soft shadow: the silhouette drawn tiny and scaled back up (smoothing blurs it)
    let shadow = null;
    if (!fx && any) {
      const q = Math.max(4, n / 2), sc = canvasOf(q, q), sg = sc.getContext('2d');
      sg.drawImage(c, 0, 0, q, q);
      sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(0,0,10,0.55)'; sg.fillRect(0, 0, q, q);
      shadow = sc;
    }
    const glow = cnt ? [r / cnt, gg / cnt, b / cnt] : [255, 220, 160];
    e = { c, glow, shadow, any };
    this.sprites.set(key, e);
    return e;
  }

  // ---------------------------------------------------------------- simulation (once per game frame)
  update() {
    this.prev = this.cur;
    this.cur = this.scene.frameState();
    const cur = this.cur, prev = this.prev;
    if (cur.intro) { this.particles.length = 0; return; }
    if (prev && prev.intro && this.introEnd === null) this.introEnd = cur.f;
    const before = new Set(prev && !prev.intro ? prev.sprites.map((sp) => sp.id) : []);
    this.hulls = this.findHulls(cur);
    const seen = new Set();
    for (const sp of cur.sprites) {
      seen.add(sp.id);
      if (!this.isFx(sp)) continue;
      const cx = sp.x + sp.size / 2, cy = sp.y + sp.size / 2;
      if (this.isBoom(sp)) {
        if (!before.has(sp.id)) this.explode(cx, cy, this.sprite(sp).glow, sp);
      } else {
        if (!before.has(sp.id)) this.flash(cx, cy, this.sprite(sp).glow, sp.size);
        const tr = this.trails.get(sp.id) || [];
        tr.push([cx, cy]); if (tr.length > 7) tr.shift();
        this.trails.set(sp.id, tr);
      }
    }
    for (const id of this.trails.keys()) if (!seen.has(id)) this.trails.delete(id);
    // particles
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.life--; p.rot += p.vr;
      if (p.kind === 'smoke') p.r += 0.18;
      if (p.kind === 'ring') p.r += p.vr;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.shake *= 0.86;
  }

  flash(x, y, glow, size) {
    this.particles.push({ kind: 'flash', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: size * 0.9, life: 6, max: 6, col: glow, rot: 0, vr: 0 });
  }

  explode(x, y, glow, sp) {
    const big = this.isBig(sp), n = this.reduced ? 10 : big ? 34 : 22;
    const col = [Math.min(255, glow[0] * 1.1), Math.min(255, glow[1]), Math.min(255, glow[2] * 0.8)];
    this.particles.push({ kind: 'ring', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: 4, vr: big ? 2.2 : 1.6, life: 16, max: 16, col, rot: 0 });
    this.particles.push({ kind: 'flash', x, y, vx: 0, vy: 0, drag: 1, g: 0, r: big ? 46 : 32, life: 9, max: 9, col: [255, 240, 200], rot: 0, vr: 0 });
    for (let i = 0; i < n; i++) {
      const a = this.rnd() * Math.PI * 2, v = (0.6 + this.rnd() * 2.6) * (big ? 1.3 : 1);
      this.particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.93, g: 0.02, life: 14 + (this.rnd() * 18 | 0), max: 32, col, rot: 0, vr: 0, r: 1 });
    }
    for (let i = 0; i < (this.reduced ? 3 : 8); i++) {
      const a = this.rnd() * Math.PI * 2, v = 0.4 + this.rnd() * 1.6;
      this.particles.push({ kind: 'debris', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.3, drag: 0.97, g: 0.03, life: 30 + (this.rnd() * 20 | 0), max: 50, col: [120 + this.rnd() * 60, 110, 100], rot: this.rnd() * 6, vr: (this.rnd() - 0.5) * 0.4, r: 1 + this.rnd() * 1.6 });
    }
    for (let i = 0; i < (this.reduced ? 2 : 5); i++) {
      this.particles.push({ kind: 'smoke', x: x + (this.rnd() - 0.5) * 10, y: y + (this.rnd() - 0.5) * 10, vx: (this.rnd() - 0.5) * 0.3, vy: -0.15 - this.rnd() * 0.25, drag: 0.98, g: 0, r: 4 + this.rnd() * 4, life: 40 + (this.rnd() * 30 | 0), max: 70, col: [40, 40, 55], rot: 0, vr: 0 });
    }
    if (!this.reduced) this.shake = Math.min(6, this.shake + (big ? 3.2 : 1.4));
  }

  // explosions on a capital ship or structure (an actor or track drawn from several 32 px body
  // sprites) are bigger and shake harder
  isBig(sp) {
    return this.hulls.some((o) => Math.abs(o.x - sp.x) < 36 && Math.abs(o.y - sp.y) < 36);
  }
  findHulls(st) {
    const groups = new Map();
    for (const sp of st.sprites) if (!this.isFx(sp) && sp.size === 32) { const g = sp.id.split('#')[0]; (groups.get(g) || groups.set(g, []).get(g)).push(sp); }
    return [...groups.values()].filter((g) => g.length >= 2 || g[0].id.startsWith('t')).flat();
  }

  // ---------------------------------------------------------------- drawing
  render(alpha = 1) {
    const ctx = this.ctx, S = this.S, st = this.cur, t = (this.scene.clock || 0) + alpha;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (st.intro) { this.renderIntro(ctx, st); ctx.restore(); return; }
    // camera: a slow drift, shake on heavy hits
    const sx = this.shake ? Math.round((this.rnd() - 0.5) * this.shake * S) : 0, sy = this.shake ? Math.round((this.rnd() - 0.5) * this.shake * S) : 0;
    ctx.translate(sx, sy);
    this.drawBackdrop(ctx, st, t);
    // shadows, then bodies (interpolated), then effects
    const prev = this.prev && !this.prev.intro ? new Map(this.prev.sprites.map((sp) => [sp.id, sp])) : new Map();
    const pos = (sp) => {
      const p = prev.get(sp.id);
      if (!p || alpha >= 1 || Math.abs(p.x - sp.x) > 24 || Math.abs(p.y - sp.y) > 24) return [sp.x, sp.y];
      return [p.x + (sp.x - p.x) * alpha, p.y + (sp.y - p.y) * alpha];
    };
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    for (const sp of st.sprites) {
      if (this.isFx(sp)) continue;
      const e = this.sprite(sp, false);
      if (!e.shadow) continue;
      const [x, y] = pos(sp);
      ctx.drawImage(e.shadow, (x + 3) * S, (y + 5) * S, sp.size * S, sp.size * S);
    }
    const hull = new Set(this.hulls);
    for (const sp of st.sprites) {
      const [x, y] = pos(sp), e = this.sprite(sp, hull.has(sp) ? Math.round(y) : true);
      if (this.isFx(sp)) {
        // trails and glow behind the shot, the sprite itself added on top
        const tr = this.trails.get(sp.id);
        ctx.globalCompositeOperation = 'lighter';
        const [r, g, b] = e.glow;
        if (tr && tr.length > 1 && !this.isBoom(sp)) {
          ctx.lineCap = 'round';
          for (let i = 1; i < tr.length; i++) {
            const a = i / tr.length;
            ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${(a * 0.35).toFixed(3)})`;
            ctx.lineWidth = Math.max(1, sp.size * 0.35 * a) * S;
            ctx.beginPath(); ctx.moveTo(tr[i - 1][0] * S, tr[i - 1][1] * S); ctx.lineTo(tr[i][0] * S, tr[i][1] * S); ctx.stroke();
          }
        }
        const cx = (x + sp.size / 2) * S, cy = (y + sp.size / 2) * S, rad = sp.size * (this.isBoom(sp) ? 1.3 : 1.1) * S;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(blob(r | 0, g | 0, b | 0), cx - rad, cy - rad, rad * 2, rad * 2);
        ctx.globalAlpha = 1;
        ctx.drawImage(e.c, x * S, y * S, sp.size * S, sp.size * S);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(e.c, x * S, y * S, sp.size * S, sp.size * S);
      } else ctx.drawImage(e.c, x * S, y * S, sp.size * S, sp.size * S);
    }
    this.drawParticles(ctx, S);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // lighting and vignette, then the original's fade-out
    ctx.drawImage(this.overlay, 0, 0);
    // the info screen dissolves into the battle
    if (this.lastIntro && this.introEnd !== null) {
      const k = (st.f - this.introEnd + alpha) / 14;
      if (k < 1) { ctx.globalAlpha = 1 - k; this.blitIntro(ctx, 1 + k * 0.08); ctx.globalAlpha = 1; }
    }
    if (st.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - st.fade).toFixed(3)})`; ctx.fillRect(0, 0, W * S, H * S); }
    ctx.restore();
  }

  drawParticles(ctx, S) {
    ctx.globalCompositeOperation = 'source-over';
    for (const p of this.particles) {
      if (p.kind !== 'smoke' && p.kind !== 'debris') continue;
      const a = p.life / p.max;
      if (p.kind === 'smoke') {
        ctx.globalAlpha = a * 0.45;
        ctx.drawImage(blob(p.col[0] | 0, p.col[1] | 0, p.col[2] | 0), (p.x - p.r) * S, (p.y - p.r) * S, p.r * 2 * S, p.r * 2 * S);
        ctx.globalAlpha = 1;
      } else {
        ctx.save(); ctx.translate(p.x * S, p.y * S); ctx.rotate(p.rot);
        ctx.fillStyle = `rgba(${p.col[0] | 0},${p.col[1] | 0},${p.col[2] | 0},${Math.min(1, a * 1.5).toFixed(3)})`;
        ctx.fillRect(-p.r * S, -p.r * 0.6 * S, p.r * 2 * S, p.r * 1.2 * S);
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = p.life / p.max, [r, g, b] = p.col;
      if (p.kind === 'spark') {
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`; ctx.lineWidth = 1.2 * S;
        ctx.beginPath(); ctx.moveTo(p.x * S, p.y * S); ctx.lineTo((p.x - p.vx * 2.5) * S, (p.y - p.vy * 2.5) * S); ctx.stroke();
      } else if (p.kind === 'flash') {
        const rad = p.r * S * (0.6 + 0.4 * a);
        ctx.globalAlpha = a * 0.9;
        ctx.drawImage(blob(r | 0, g | 0, b | 0), p.x * S - rad, p.y * S - rad, rad * 2, rad * 2);
        ctx.drawImage(blob(255, 255, 240), p.x * S - rad * 0.45, p.y * S - rad * 0.45, rad * 0.9, rad * 0.9);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${(a * 0.6).toFixed(3)})`; ctx.lineWidth = 2 * S * a;
        ctx.beginPath(); ctx.arc(p.x * S, p.y * S, p.r * S, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------------- the info screen
  // The original info screen (js/game/infoscreen.js) rendered at 256x224, upscaled with the same
  // filter, eased in with a slight zoom; it dissolves into the battle when the fight starts.
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
  return Math.max(2, Math.min(4, Math.round((cssWidth * dpr) / W)));   // the sprites are upscaled 4x, more buys nothing
}
