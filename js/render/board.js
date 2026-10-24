// The battle board, drawn as a modern battlefield from the ROM's own art (game.html):
//   * terrain: the ROM's cell graphics upscaled with Scale3x, dropping soft shadows onto a
//     parallax starfield, with animated light on the live terrain (twinkling stars, flowing
//     plasma, shimmering magnetic fields, pulsing gravity flux, glinting comet tails)
//   * units: tokens from the ROM's fight sprites and unit art (js/render/tokens.js) with an army
//     rim, a shadow and badges; they glide along their path when they move, and the board shows
//     hits, explosions and damage numbers
//   * overlays as clean vector hexes; zoom (buttons, ctrl+wheel) and smooth camera pans
// Only drawing lives here: gameapp.js passes the battle state in update() and keeps every rule.
// "Classic" (the button on the board, remembered) draws the original map icons and plain cells.
import { cellOrigin, cellAt, HEX_POINTS } from '../maps.js';
import { neighbours } from '../game/rules.js';
import { scale3x, indexedToRgba } from './upscale.js';
import { tokenPixels, ownTokenPixels } from './tokens.js';
import { lookOf } from '../look.js';
import { ownArt, ownToken } from '../art/own.js';

export const S = 3;                  // internal pixels per ROM pixel
const OFF = 16;                      // the playfield starts at cell (1, 1)
const VOID_BLACK = 32;               // battle palette index of open space's black
const ARMY = ['#ff6fd2', '#6fe36a', '#cfd3dc'];
const CLASSIC_KEY = 'earthlight-classic-board', ZOOM_KEY = 'earthlight-board-zoom';
const ZOOMS = [0.4, 0.5, 0.65, 0.8, 1, 1.25, 1.5];
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* no storage */ } } };

// Pixel origin of a cell on the board (internal pixels).
export const boardPx = (x, y) => { const [X, Y] = cellOrigin(x, y); return [(X - OFF) * S, (Y - OFF) * S]; };
const centre = (x, y) => { const [X, Y] = boardPx(x, y); return [X + 12 * S, Y + 8 * S]; };

function hexPath(ctx, x, y, inset = 0) {
  const [X, Y] = boardPx(x, y), cx = X + 12 * S, cy = Y + 8 * S;
  ctx.beginPath();
  HEX_POINTS.forEach(([a, b], i) => {
    const px = X + a * S, py = Y + b * S, k = inset ? 1 - inset / 30 : 1;
    const qx = cx + (px - cx) * k, qy = cy + (py - cy) * k;
    i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy);
  });
  ctx.closePath();
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// A soft round glow, drawn additively for light effects.
function glowSprite(colour, r) {
  const c = canvas(r * 2, r * 2), g = c.getContext('2d'), grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, colour); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, r * 2, r * 2);
  return c;
}

// Two star layers and a faint nebula for the parallax background (CSS backgrounds of the board).
function starfield(w, h, n, seed, big) {
  const c = canvas(w, h), g = c.getContext('2d');
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  if (big) {
    for (let i = 0; i < 5; i++) {
      const x = r() * w, y = r() * h, rad = 120 + r() * 220, grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `hsla(${220 + r() * 80}, 70%, 40%, .16)`); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    }
  }
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, a = 0.35 + r() * 0.65, size = big ? (r() < 0.12 ? 2 : 1) : 1;
    g.fillStyle = `hsla(${200 + r() * 60}, 80%, ${80 + r() * 20}%, ${a})`; g.fillRect(x, y, size, size);
  }
  return c.toDataURL();
}

export class Board {
  // container: the scrolling #board element; cv: the canvas that takes the clicks (#cv)
  constructor(container, cv, { rom, icon }) {
    this.el = container; this.cv = cv; this.rom = rom; this.icon = icon;
    this.classic = store.get(CLASSIC_KEY) === '1';
    this.zoom = +store.get(ZOOM_KEY) || 0.8;
    this.tokens = new Map(); this.anim = new Map(); this.fx = []; this.state = null; this.active = () => true;
    this.stage = document.createElement('div');
    this.stage.style.cssText = 'position:relative;transform-origin:0 0';
    this.terrain = canvas(1, 1);
    for (const c of [this.terrain, cv]) { c.style.cssText = 'position:absolute;left:0;top:0;display:block;image-rendering:auto'; }
    cv.style.cursor = 'pointer';
    container.textContent = '';
    this.controls = this.buildControls();
    container.append(this.controls, this.stage);
    this.stage.append(this.terrain, cv);
    container.style.backgroundColor = '#04050d';
    if (!this.bgReady) {
      this.bgFar = starfield(512, 512, 220, 7, false); this.bgNear = starfield(768, 768, 140, 99, true); this.bgReady = true;
    }
    container.addEventListener('scroll', () => this.parallax(), { passive: true });
    container.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    this.glow = {
      plasma: glowSprite('rgba(90,150,255,.55)', 40), magnetic: glowSprite('rgba(170,110,255,.5)', 36),
      gravity: glowSprite('rgba(200,90,255,.4)', 30), comet: glowSprite('rgba(140,230,255,.5)', 40),
      star: glowSprite('rgba(220,235,255,.9)', 7), boom: glowSprite('rgba(255,190,90,.95)', 48), hit: glowSprite('rgba(255,240,200,.9)', 22),
    };
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  buildControls() {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:sticky;left:8px;top:8px;height:0;z-index:5;width:0';
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;display:flex;gap:4px;padding:4px;border-radius:8px;background:rgba(8,10,24,.72);border:1px solid rgba(160,170,255,.25);backdrop-filter:blur(4px);font:12px system-ui;color:#dfe3ff;white-space:nowrap';
    const btn = (label, title, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.title = title; b.className = 'btn'; b.style.cssText = 'padding:2px 9px;font-size:13px;line-height:1.4'; b.onclick = (e) => { e.stopPropagation(); fn(); }; return b; };
    box.append(btn('−', 'Zoom out (ctrl + wheel)', () => this.zoomBy(-1)), btn('+', 'Zoom in (ctrl + wheel)', () => this.zoomBy(1)));
    this.classicBtn = btn('', 'Switch between the modern board and the original map graphics', () => this.setClassic(!this.classic));
    box.append(this.classicBtn);
    bar.append(box);
    this.updateControls();
    return bar;
  }
  updateControls() { if (this.classicBtn) this.classicBtn.textContent = this.classic ? 'Modern' : 'Classic'; }

  setClassic(on) {
    this.classic = on; store.set(CLASSIC_KEY, on ? '1' : '0'); this.updateControls();
    this.tokens.clear();
    if (this.img) this.paint();
  }

  zoomBy(d) {
    const i = ZOOMS.findIndex((z) => z >= this.zoom - 1e-6), j = Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? ZOOMS.length - 1 : i) + d));
    const el = this.el, cx = (el.scrollLeft + el.clientWidth / 2) / this.zoom, cy = (el.scrollTop + el.clientHeight / 2) / this.zoom;
    this.zoom = ZOOMS[j]; store.set(ZOOM_KEY, String(this.zoom));
    this.applyZoom();
    el.scrollLeft = cx * this.zoom - el.clientWidth / 2; el.scrollTop = cy * this.zoom - el.clientHeight / 2;
  }
  applyZoom() {
    const w = this.cv.width * this.zoom, h = this.cv.height * this.zoom;
    this.stage.style.width = `${w}px`; this.stage.style.height = `${h}px`;
    for (const c of [this.terrain, this.cv]) { c.style.width = `${w}px`; c.style.height = `${h}px`; }
    this.parallax();
  }
  parallax() {
    const el = this.el;
    el.style.backgroundImage = `url(${this.bgNear}), url(${this.bgFar}), radial-gradient(ellipse at 30% 20%, #10153a 0%, #04050d 70%)`;
    el.style.backgroundAttachment = 'local, local, local';
    el.style.backgroundPosition = `${-el.scrollLeft * 0.35}px ${-el.scrollTop * 0.35}px, ${-el.scrollLeft * 0.15}px ${-el.scrollTop * 0.15}px, 0 0`;
  }

  // The map's terrain: an Indexed image from renderMap (playfield crop) and its palette.
  // cls(x, y) gives a cell's terrain class for the animated light (null: none yet).
  setTerrain(img, pal, cls = null) {
    this.img = img; this.pal = pal; this.clsOf = cls; this.state = null;
    this.cv.width = img.w * S; this.cv.height = img.h * S;
    this.paint();
    this.applyZoom();
  }

  paint() {
    const { img, pal } = this, W = img.w * S, H = img.h * S;
    this.terrain.width = W; this.terrain.height = H;
    const g = this.terrain.getContext('2d');
    g.clearRect(0, 0, W, H);
    if (this.classic) {
      const src = canvas(img.w, img.h), sg = src.getContext('2d'), id = sg.createImageData(img.w, img.h);
      new Uint32Array(id.data.buffer).set(indexedToRgba(img, pal, false)); sg.putImageData(id, 0, 0);
      g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, W, H);
      this.cells = null;
      return;
    }
    const rgb = indexedToRgba(img, pal, true);
    // open space is see-through, so the parallax starfield and the terrain's shadows show:
    // the void cells' black (colour 32) is cleared, only inside void cells (asteroids use it too)
    if (this.clsOf) {
      const memo = new Map();
      for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        const i = y * img.w + x;
        if (img.px[i] !== VOID_BLACK) continue;
        const [cx, cy] = cellAt(x + OFF, y + OFF), k = cy * 64 + cx;
        if (!memo.has(k)) memo.set(k, this.clsOf(cx, cy) === 0);
        if (memo.get(k)) rgb[i] = 0;
      }
    }
    const up = scale3x(rgb, img.w, img.h);
    const src = canvas(up.w, up.h), sg = src.getContext('2d'), id = sg.createImageData(up.w, up.h);
    new Uint32Array(id.data.buffer).set(up.px); sg.putImageData(id, 0, 0);
    // depth: the solid terrain drops a soft shadow onto the starfield behind it
    g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 14; g.shadowOffsetX = 5; g.shadowOffsetY = 9;
    g.drawImage(src, 0, 0); g.restore();
    g.drawImage(src, 0, 0);
    this.indexCells();
  }

  // cells by terrain class, with a phase each, for the ambient light
  indexCells() {
    this.cells = null;
    if (!this.clsOf || !this.img) return;
    const cols = Math.round(this.img.w / 16), rows = Math.round((this.img.h - 8) / 16), by = { 0: [], 1: [], 4: [], 5: [], 11: [] };
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = 1; y <= rows; y++) for (let x = 1; x < cols; x++) {
      const c = this.clsOf(x, y);
      if (!(c in by)) continue;
      if (c === 0 && rnd() > 0.28) continue;   // a star sparkles in about one void cell in four
      const [cx, cy] = centre(x, y);
      by[c].push({ x, y, cx: cx + (c === 0 ? (rnd() - 0.5) * 40 : 0), cy: cy + (c === 0 ? (rnd() - 0.5) * 26 : 0), ph: rnd() * Math.PI * 2 });
    }
    this.cells = by;
  }

  // The battle and what gameapp.js highlights; called from its draw().
  update(state) {
    const prev = this.state;
    this.state = state;
    if (!prev || prev.battle !== state.battle) {
      this.anim.clear(); this.fx = []; this.seen = new Map();
      if (!this.clsOf) { this.clsOf = (x, y) => state.battle.cls(x, y); if (!this.classic) this.paint(); }
    }
    this.track(state.battle);
  }

  // Positions, hits and losses since the last update, turned into movement and effects.
  track(b) {
    const now = performance.now(), live = new Set();
    for (const u of b.alive()) {
      live.add(u.id);
      const last = this.seen.get(u.id);
      if (!last) { this.anim.set(u.id, { path: [[u.x, u.y]], t0: now, fade: !reduced }); }
      else {
        if (last.x !== u.x || last.y !== u.y) {
          const path = reduced || this.classic ? [[u.x, u.y]] : hexRoute(b, last.x, last.y, u.x, u.y);
          this.anim.set(u.id, { path, t0: now });
          if (u.army !== 0 && b.army === u.army) this.follow(u.x, u.y);
        }
        if (u.hp < last.hp && !this.classic) this.hit(u.x, u.y, last.hp - u.hp);
      }
      this.seen.set(u.id, { x: u.x, y: u.y, hp: u.hp });
    }
    for (const [id, s] of [...this.seen]) {
      if (live.has(id)) continue;
      const u = b.units[id];
      if (u && u.hp <= 0 && !this.classic) { if (s.hp > 0) this.hit(s.x, s.y, s.hp); this.explode(s.x, s.y); }
      this.seen.delete(id); this.anim.delete(id);
    }
  }

  hit(x, y, dmg) {
    const [cx, cy] = centre(x, y), now = performance.now();
    this.fx.push({ kind: 'hit', cx, cy, t0: now, life: 500 }, { kind: 'dmg', cx, cy: cy - 10, t0: now, life: 1100, text: `−${dmg}` });
  }
  explode(x, y) {
    const [cx, cy] = centre(x, y), now = performance.now(), parts = [];
    for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 90; parts.push([Math.cos(a) * v, Math.sin(a) * v, 2 + Math.random() * 3]); }
    this.fx.push({ kind: 'boom', cx, cy, t0: now, life: 900, parts });
  }

  // Briefly highlights hexes (cannon fire, Decimator); resolves when done.
  flash(cells, colour) {
    return new Promise((done) => {
      this.fx.push({ kind: 'flash', cells, colour, t0: performance.now(), life: 660 });
      setTimeout(done, 660);
    });
  }

  // Scrolls the board so (x, y) is in view; smooth unless reduced motion.
  centerOn(x, y, smooth = false) {
    const [cx, cy] = centre(x, y), el = this.el;
    el.scrollTo({ left: cx * this.zoom - el.clientWidth / 2, top: cy * this.zoom - el.clientHeight / 2, behavior: smooth && !reduced ? 'smooth' : 'auto' });
  }
  follow(x, y) {
    const [cx, cy] = centre(x, y), el = this.el, X = cx * this.zoom, Y = cy * this.zoom, m = 80;
    if (X < el.scrollLeft + m || X > el.scrollLeft + el.clientWidth - m || Y < el.scrollTop + m || Y > el.scrollTop + el.clientHeight - m) this.centerOn(x, y, true);
  }
  ensureVisible(x, y) { this.follow(x, y); }

  // The cell under a mouse event on the board.
  cellAt(ev) {
    const r = this.cv.getBoundingClientRect(), k = this.cv.width / r.width;
    return cellAt(((ev.clientX - r.left) * k) / S + OFF, ((ev.clientY - r.top) * k) / S + OFF);
  }

  // ---------------------------------------------------------------- tokens
  token(u) {
    const army = u.army === 2 ? 2 : u.army, key = `${this.classic ? 'c' : 'm'}:${army}:${u.type}`;
    if (this.tokens.has(key)) return this.tokens.get(key);
    let t;
    if (this.classic) {
      const ic = this.icon(u), c = canvas(24 * S, 16 * S), g = c.getContext('2d');
      g.imageSmoothingEnabled = false; g.drawImage(ic, 0, 0, c.width, c.height);
      t = { c, ox: 0, oy: 0 };
    } else t = this.modernToken(u.type, army);
    this.tokens.set(key, t);
    return t;
  }

  modernToken(type, army) {
    const types = this.state && this.state.battle.types, own = ownArt(types, type);
    type = lookOf(types, type);   // borrowed graphics (js/look.js), or the type's own token (js/art/own.js)
    const p = own ? ownTokenPixels(this.rom, ownToken(own, army === 1 ? 1 : 0), army === 1 ? 1 : 0) : tokenPixels(this.rom, type, army), up = scale3x(p.px, p.w, p.h);
    const src = canvas(up.w, up.h), sg = src.getContext('2d'), id = sg.createImageData(up.w, up.h);
    new Uint32Array(id.data.buffer).set(up.px); sg.putImageData(id, 0, 0);
    // fit: craft about 58 px tall, ships and structures a little larger than a hex
    const kindShip = type >= 30, maxW = own ? 78 : kindShip ? 84 : 66, maxH = own ? 52 : 58;   // an own token: about a ROM ship's size
    const k = Math.min(maxW / up.w, maxH / up.h, 1), w = Math.round(up.w * k), h = Math.round(up.h * k), pad = 6;
    const fit = canvas(w, h), fg = fit.getContext('2d');
    fg.imageSmoothingQuality = 'high'; fg.drawImage(src, 0, 0, w, h);
    if (army === 2) { const gr = canvas(w, h), gg = gr.getContext('2d'); gg.filter = 'grayscale(1) brightness(1.15)'; gg.drawImage(fit, 0, 0); fg.clearRect(0, 0, w, h); fg.drawImage(gr, 0, 0); }
    // army rim: the silhouette in the army colour around the sprite, with a soft glow
    const sil = canvas(w, h), sl = sil.getContext('2d');
    sl.drawImage(fit, 0, 0); sl.globalCompositeOperation = 'source-in'; sl.fillStyle = ARMY[army]; sl.fillRect(0, 0, w, h);
    const c = canvas(w + pad * 2, h + pad * 2), g = c.getContext('2d');
    g.save(); g.shadowColor = ARMY[army]; g.shadowBlur = 8;
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1.5, -1.5], [1.5, 1.5], [-1.5, 1.5], [1.5, -1.5]]) g.drawImage(sil, pad + dx, pad + dy);
    g.restore();
    g.drawImage(fit, pad, pad);
    return { c, ox: (24 * S - c.width) / 2, oy: (16 * S - c.height) / 2 - 4, flying: type < 30 && type !== 18 && !(type >= 23 && type <= 25) };
  }

  // ---------------------------------------------------------------- the frame
  frame(t) {
    requestAnimationFrame(this.frame);
    const st = this.state;
    if (!st || !this.active()) return;
    const b = st.battle, ctx = this.cv.getContext('2d'), sec = t / 1000, el = this.el;
    ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    // what is in view, in board pixels (with a margin)
    const z = this.zoom, vx = el.scrollLeft / z - 80, vy = el.scrollTop / z - 80, vw = el.clientWidth / z + 160, vh = el.clientHeight / z + 160;
    const inView = (x, y) => x > vx && x < vx + vw && y > vy && y < vy + vh;
    if (!this.classic && this.cells && !reduced) this.ambient(ctx, sec, inView);
    this.overlays(ctx, st, sec);
    // units, back to front
    const units = b.alive().slice().sort((p, q) => p.y - q.y || p.x - q.x);
    for (const u of units) {
      const [X, Y] = this.position(u, t);
      if (!inView(X + 36, Y + 24)) continue;
      this.drawUnit(ctx, u, X, Y, sec, b, t);
    }
    if (st.sel) this.ring(ctx, st.sel.x, st.sel.y, '#ffd84a', sec, 3);
    if (st.cursor) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([10, 7]); ctx.lineDashOffset = -sec * 30; hexPath(ctx, ...st.cursor); ctx.stroke(); ctx.restore(); }
    this.effects(ctx, t);
  }

  position(u, t) {
    const a = this.anim.get(u.id);
    const end = boardPx(u.x, u.y);
    if (!a || a.path.length < 2) return end;
    const per = 110, i = Math.max(0, (t - a.t0) / per);   // the frame time can be a little older than t0
    if (i >= a.path.length - 1) { a.path = [[u.x, u.y]]; return end; }
    const k = Math.floor(i), f = i - k, e = f * f * (3 - 2 * f);
    const [x0, y0] = boardPx(...a.path[k]), [x1, y1] = boardPx(...a.path[k + 1]);
    return [x0 + (x1 - x0) * e, y0 + (y1 - y0) * e];
  }

  drawUnit(ctx, u, X, Y, sec, b, t) {
    const tk = this.token(u), a = this.anim.get(u.id);
    const dim = u.acted && !u.reMove && u.army === b.army;
    const fadeIn = a && a.fade ? Math.max(0, Math.min(1, (t - a.t0) / 300)) : 1;
    const bob = !this.classic && tk.flying && !reduced ? Math.sin(sec * 2.2 + u.id) * 2 : 0;
    ctx.save();
    ctx.globalAlpha = (dim ? 0.55 : 1) * fadeIn;
    if (!this.classic) {   // shadow on the ground
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.ellipse(X + 36, Y + 40, tk.flying ? 20 : 26, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (dim && !this.classic) ctx.filter = 'saturate(.35)';
    ctx.drawImage(tk.c, X + tk.ox, Y + tk.oy + bob);
    ctx.filter = 'none';
    ctx.restore();
    this.badges(ctx, u, X, Y, b);
  }

  badges(ctx, u, X, Y, b) {
    const n = b.cargo(u).length, txt = n ? `${u.hp}+${n}` : `${u.hp}`;
    ctx.save();
    ctx.font = '700 15px system-ui, sans-serif'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 10, bx = X + 72 - w + 2, by = Y + 38;
    ctx.fillStyle = 'rgba(6,8,20,.82)'; roundRect(ctx, bx, by - 9, w, 18, 6); ctx.fill();
    ctx.strokeStyle = ARMY[u.army === 2 ? 2 : u.army]; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, bx + 5, by + 1);
    if (u.level) {   // level chevrons
      ctx.fillStyle = 'rgba(6,8,20,.82)'; roundRect(ctx, X + 2, Y + 1, 26, 16, 5); ctx.fill();
      ctx.fillStyle = '#ffd84a'; ctx.font = '700 12px system-ui, sans-serif'; ctx.fillText(`L${u.level}`, X + 6, Y + 10);
    }
    if (u.general) { ctx.font = '700 20px system-ui, sans-serif'; ctx.shadowColor = '#ffb800'; ctx.shadowBlur = 10; ctx.fillStyle = '#ffd84a'; ctx.fillText('★', X + 50, Y + 8); ctx.shadowBlur = 0; }
    // bombers: a loaded missile on the armed form, an empty rack once it has been dropped (the
    // spent form's sprite differs from the armed one only slightly, or not at all)
    const t = b.types[u.type];
    if (t.armed !== undefined || this.spentOf(b, u.type)) missileBadge(ctx, X + 2, Y + 31, t.armed === undefined);
    if (t.tag) {   // a unit drawn with another type's graphics: its own model tag, right
      ctx.font = '700 10px system-ui, sans-serif'; const tw = ctx.measureText(t.tag).width + 8;
      ctx.fillStyle = 'rgba(6,8,20,.85)'; roundRect(ctx, X + 70 - tw, Y + 17, tw, 14, 4); ctx.fill();
      ctx.strokeStyle = '#6fd3ff'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#bfefff'; ctx.fillText(t.tag, X + 74 - tw, Y + 25);
    }
    if (u.burner) { ctx.font = '700 11px system-ui, sans-serif'; ctx.fillStyle = 'rgba(6,8,20,.82)'; roundRect(ctx, X + 2, Y + 16, 22, 15, 5); ctx.fill(); ctx.fillStyle = '#ffa040'; ctx.fillText('AB', X + 5, Y + 24); }
    ctx.restore();
  }

  // whether some type is this one after dropping its payload
  spentOf(b, type) {
    if (!this.armedTypes || this.armedTypes.types !== b.types) this.armedTypes = { types: b.types, set: new Set(b.types.filter((t) => t.armed !== undefined).map((t) => t.armed)) };
    return this.armedTypes.set.has(type);
  }

  ambient(ctx, sec, inView) {
    const { cells, glow } = this;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const c of cells[4]) if (inView(c.cx, c.cy)) {   // plasma: light flowing across the stream
      ctx.globalAlpha = 0.22 + 0.2 * Math.sin(sec * 1.6 - c.x * 0.6 + c.y * 0.35); ctx.drawImage(glow.plasma, c.cx - 40, c.cy - 40);
    }
    for (const c of cells[1]) if (inView(c.cx, c.cy)) {   // magnetic field: a shimmer sweeping across
      ctx.globalAlpha = Math.max(0, 0.05 + 0.3 * Math.sin(sec * 2.4 + c.x * 0.8 - c.y * 0.3)); ctx.drawImage(glow.magnetic, c.cx - 36, c.cy - 36);
    }
    for (const c of cells[11]) if (inView(c.cx, c.cy)) { ctx.globalAlpha = 0.18 + 0.14 * Math.sin(sec * 3 + c.ph); ctx.drawImage(glow.comet, c.cx - 40, c.cy - 40); }
    ctx.globalCompositeOperation = 'source-over';
    for (const c of cells[5]) if (inView(c.cx, c.cy)) {   // gravity flux: rings drawn inward, pulsing
      const f = ((sec * 0.45 + c.ph / 6.28) % 1);
      ctx.globalAlpha = 0.35 * (1 - f); ctx.strokeStyle = '#c77dff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(c.cx, c.cy, 30 * (1 - f) + 2, 20 * (1 - f) + 1, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const c of cells[0]) if (inView(c.cx, c.cy)) {   // twinkling stars
      const a = Math.sin(sec * (1.2 + (c.ph % 1)) + c.ph);
      if (a <= 0.3) continue;
      ctx.globalAlpha = (a - 0.3) * 1.2; ctx.drawImage(glow.star, c.cx - 7, c.cy - 7);
      ctx.fillStyle = 'rgba(230,240,255,.8)'; ctx.fillRect(c.cx - 6 * a, c.cy - 0.5, 12 * a, 1); ctx.fillRect(c.cx - 0.5, c.cy - 6 * a, 1, 12 * a);
    }
    ctx.restore();
  }

  overlays(ctx, st, sec) {
    const b = st.battle, key = (k) => k.split(',').map(Number);
    const area = (list, fill, edge, inset = 1.5) => {
      if (!list.length) return;
      ctx.save(); ctx.fillStyle = fill; ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
      for (const [x, y] of list) { hexPath(ctx, x, y, inset); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    };
    if (b.cannons && b.cannons.length && st.inLane) {
      const lanes = [];
      for (const c of b.cannons) for (let y = c.y; y <= b.info.rows; y++) if (st.inLane(b, c.x, y)) lanes.push([c.x, y]);
      area(lanes, `rgba(255,110,40,${0.14 + 0.06 * Math.sin(sec * 3)})`, 'rgba(255,140,60,.35)');
    }
    if (st.threat) {
      area([...st.threat.fire].filter((k) => !st.threat.move.has(k)).map(key), 'rgba(255,60,70,.2)', 'rgba(255,90,90,.35)');
      area([...st.threat.move.keys()].map(key), 'rgba(255,165,60,.28)', 'rgba(255,190,90,.5)');
      this.ring(ctx, st.threat.u.x, st.threat.u.y, '#ff6a3d', sec, 3);
    }
    if (st.range) area([...st.range].filter((k) => !(st.reach && st.reach.has(k))).map(key), 'rgba(255,70,90,.13)', 'rgba(255,110,120,.3)');
    if (st.reach) area([...st.reach.keys()].map(key), st.launching ? 'rgba(110,255,160,.28)' : 'rgba(80,165,255,.26)', st.launching ? 'rgba(150,255,190,.6)' : 'rgba(130,200,255,.55)');
    if (st.blastCells) area(st.blastCells, `rgba(200,90,255,${0.25 + 0.1 * Math.sin(sec * 5)})`, 'rgba(230,160,255,.7)');
    if (st.hosts && st.hosts.length) area(st.hosts.map((h) => [h.x, h.y]), 'rgba(255,214,74,.3)', 'rgba(255,230,120,.8)');
    for (const u of st.targets || []) {   // targets: a pulsing reticle
      const [cx, cy] = centre(u.x, u.y), r = 26 + 3 * Math.sin(sec * 5);
      ctx.save(); ctx.fillStyle = 'rgba(255,50,60,.22)'; hexPath(ctx, u.x, u.y, 1.5); ctx.fill();
      ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 3; ctx.shadowColor = '#ff2040'; ctx.shadowBlur = 10;
      for (let i = 0; i < 4; i++) { const a0 = i * Math.PI / 2 + sec; ctx.beginPath(); ctx.arc(cx, cy, r, a0 + 0.25, a0 + 1.2); ctx.stroke(); }
      ctx.restore();
    }
  }

  ring(ctx, x, y, colour, sec, width) {
    ctx.save(); ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.shadowColor = colour; ctx.shadowBlur = 8 + 6 * Math.sin(sec * 4);
    hexPath(ctx, x, y); ctx.stroke(); ctx.restore();
  }

  effects(ctx, t) {
    this.fx = this.fx.filter((e) => t - e.t0 < e.life);
    for (const e of this.fx) {
      const f = Math.max(0, (t - e.t0) / e.life);
      ctx.save();
      if (e.kind === 'flash') {
        if (Math.floor(f * 6) % 2 === 0) { ctx.fillStyle = e.colour; for (const [x, y] of e.cells) { hexPath(ctx, x, y); ctx.fill(); } }
      } else if (e.kind === 'hit') {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - f;
        const r = 22 * (0.6 + f); ctx.drawImage(this.glow.hit, e.cx - r, e.cy - r, r * 2, r * 2);
      } else if (e.kind === 'dmg') {
        ctx.globalAlpha = Math.min(1, 2 * (1 - f)); ctx.font = '800 22px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = '#1a0006'; const y = e.cy - 30 * f;
        ctx.strokeText(e.text, e.cx, y); ctx.fillStyle = '#ff5a6a'; ctx.fillText(e.text, e.cx, y);
      } else if (e.kind === 'boom') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - f; const r = 48 * (0.5 + f); ctx.drawImage(this.glow.boom, e.cx - r, e.cy - r, r * 2, r * 2);
        ctx.fillStyle = `rgba(255,${200 - 120 * f | 0},80,${1 - f})`;
        for (const [vx, vy, s] of e.parts) ctx.fillRect(e.cx + vx * f, e.cy + vy * f, s, s);
        ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = `rgba(255,230,200,${0.6 * (1 - f)})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(e.cx, e.cy, 70 * f, 44 * f, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// A hex-by-hex route for drawing a move (breadth-first over the map; the rules already decided
// the move, this only shapes the animation).
function hexRoute(b, x0, y0, x1, y1) {
  const key = (x, y) => y * 64 + x, from = new Map([[key(x0, y0), null]]), q = [[x0, y0]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === x1 && y === y1) break;
    for (const [nx, ny] of neighbours(x, y)) {
      if (!b.inBounds(nx, ny) || from.has(key(nx, ny))) continue;
      from.set(key(nx, ny), [x, y]); q.push([nx, ny]);
    }
  }
  const path = [];
  for (let p = [x1, y1]; p; p = from.get(key(...p))) path.unshift(p);
  return path.length > 1 && path.length <= 14 ? path : [[x0, y0], [x1, y1]];
}

// A 28x18 munitions badge at the token's lower left: a lit missile when loaded, an empty dashed
// outline struck through in red once it has been dropped.
function missileBadge(ctx, x, y, loaded) {
  ctx.save();
  ctx.fillStyle = loaded ? 'rgba(6,8,20,.85)' : 'rgba(60,10,16,.9)'; roundRect(ctx, x, y, 28, 18, 5); ctx.fill();
  ctx.strokeStyle = loaded ? '#ffc860' : '#ff5050'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 6.5); ctx.lineTo(x + 19, y + 6.5); ctx.lineTo(x + 24, y + 9); ctx.lineTo(x + 19, y + 11.5); ctx.lineTo(x + 7, y + 11.5);
  ctx.closePath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 9, y + 6.5); ctx.lineTo(x + 9, y + 11.5); ctx.lineTo(x + 4, y + 14); ctx.closePath();
  if (loaded) { ctx.shadowColor = '#ffb040'; ctx.shadowBlur = 6; ctx.fillStyle = '#ffd070'; ctx.fill(); }
  else {
    ctx.setLineDash([2, 1.5]); ctx.strokeStyle = '#aab0c8'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 5, y + 15); ctx.lineTo(x + 23, y + 3); ctx.stroke();
  }
  ctx.restore();
}
