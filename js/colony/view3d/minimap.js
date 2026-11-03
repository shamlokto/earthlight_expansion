// The colony's minimap (docs/COLONY-V2.md "View"): a corner canvas showing the whole map at one
// pixel per tile, made for trackpads (the owner plays on a laptop with no mouse). view.js creates
// it in createView and drives it; it keeps no game rules and never writes the state.
//   * layers: the terrain (terrain.js colours, a little noise) is drawn once into an offscreen
//     W×H canvas; chamber tints, roads, buildings (category dots) and the reach outline are
//     composed over it on refresh (one putImageData); the camera's ground footprint is stroked
//     over that on the visible canvas, only when the camera has moved
//   * input: pointer down / drag on it calls onMove(x, z, phase) in world units (one tile = 1),
//     phase 'start' | 'drag' | 'end'; wheel events go to onWheel(e) so a trackpad works over it too.
//     It sits in its own rectangle and takes no pointer events outside it
//   * position: bottom-right of the view by default, moved with CSS custom properties on the view
//     container (or any ancestor): --cv-minimap-right, --cv-minimap-bottom, --cv-minimap-left,
//     --cv-minimap-top (set left/top to a length and right/bottom to auto to use another corner),
//     or by styling `.cv-minimap` directly. 1 CSS px per tile, half that at phone widths.
//   * marks (version 3, from defence.js through view.js each frame): guardians as small blue dots,
//     raiders as red dots during a raid, and a red glow along the edge a coming raid comes from
import { TERRAIN, T } from '../data/terrain.js';
import { BUILDING, DOCK_REACH } from '../data/buildings.js';

// The build menu's category colours (ui.js CAT_COLOR), so a dot reads as its card.
export const CAT_COLOR = { core: '#f5c542', power: '#6fd3ff', life: '#5aa8ff', food: '#8fe38a', industry: '#ff9a52', homes: '#ff8fd8', services: '#c3a6ff', defence: '#ff6a5a' };
const ROAD_RGB = [176, 184, 198], REACH_RGB = [111, 211, 255], BUILD_RGB = [111, 216, 255];
const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const CAT_RGB = Object.fromEntries(Object.entries(CAT_COLOR).map(([k, v]) => [k, rgbOf(v)]));
const TERRAIN_RGB = TERRAIN.map((d) => rgbOf(d.color));
const hash = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// Space reach as a tile mask: Chebyshev DOCK_REACH around each finished dock's centre, then each
// finished Tether Mast standing inside the mask adds its own radius (masts chain). view.js uses
// the same mask for its 'reach' overlay.
export function reachMask(st) {
  const { w: W, h: H } = st.map, mask = new Uint8Array(W * H);
  const fill = (cx, cy, r) => {
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(H, Math.ceil(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(W, Math.ceil(cx + r)); x++)
        if (Math.max(Math.abs(x + 0.5 - cx), Math.abs(y + 0.5 - cy)) <= r) mask[y * W + x] = 1;
  };
  const fin = (key) => (st.buildings || []).filter((b) => b.key === key && !(b.build > 0));
  for (const d of fin('dock')) { const n = BUILDING.dock?.size || 2; fill(d.x + n / 2, d.y + n / 2, BUILDING.dock?.radius || DOCK_REACH); }
  const masts = fin('tether'), r = BUILDING.tether?.radius || 16, done = new Set();
  for (let grew = true; grew;) {
    grew = false;
    for (const m of masts) if (!done.has(m.id) && mask[m.y * W + m.x]) { done.add(m.id); fill(m.x + 0.5, m.y + 0.5, r); grew = true; }
  }
  return mask;
}

let styled = false;
function injectStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.id = 'cv-minimap-style';
  s.textContent = `
.cv-minimap { position: absolute; right: var(--cv-minimap-right, 16px); bottom: var(--cv-minimap-bottom, 84px);
  left: var(--cv-minimap-left, auto); top: var(--cv-minimap-top, auto); padding: 3px; line-height: 0;
  background: rgba(6, 10, 30, .82); border: 1px solid rgba(111, 211, 255, .45); border-radius: 4px;
  box-shadow: 0 0 18px rgba(0, 0, 0, .5), inset 0 0 0 1px rgba(0, 0, 0, .5); touch-action: none; user-select: none; -webkit-user-select: none; }
.cv-minimap[hidden] { display: none; }
.cv-minimap canvas { display: block; cursor: crosshair; touch-action: none; }
.cv-minimap.dragging canvas { cursor: grabbing; }
`;
  document.head.appendChild(s);
}

export function createMinimap(host, { onMove = () => {}, onWheel = null } = {}) {
  injectStyle();
  const el = document.createElement('div');
  el.className = 'cv-minimap';
  el.title = 'Minimap: click or drag to move the view';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Minimap of the whole colony; click or drag to move the view');
  canvas.setAttribute('role', 'img');
  el.appendChild(canvas);
  host.appendChild(el);
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas'), bctx = base.getContext('2d');

  let W = 0, H = 0, st = null, terr = null, img = null, visible = true;
  let baseDirty = true, drawSig = '', poly = null, target = null, marks = null;
  const phone = typeof matchMedia === 'function' ? matchMedia('(max-width: 760px)') : null;
  let scale = 1;

  // ---- layout -----------------------------------------------------------------------------------
  function layout() {
    if (!W) return;
    scale = phone?.matches ? 0.5 : 1;
    const dpr = Math.min(3, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    const cw = Math.round(W * scale), ch = Math.round(H * scale);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    const pw = Math.max(1, Math.round(cw * dpr)), ph = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; drawSig = ''; }
  }
  phone?.addEventListener?.('change', layout);

  // ---- terrain: once per map ------------------------------------------------------------------------
  function buildTerrain() {
    const { t } = st.map;
    terr = new Uint8ClampedArray(W * H * 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, id = t[i], c = TERRAIN_RGB[id] || [0, 0, 0];
      let k = 0.9 + 0.2 * hash(x, y), r = c[0], g = c[1], b = c[2];
      if (id === T.ATMOSPHERE) {   // black space fading to blue over Earth, as in the 3D view
        const f = Math.min(1, Math.max(0, (y - 143) / 11)); k = 0.12 + 0.75 * f * f;
      } else if (id === T.EARTH) {   // ocean and cloud, a bright limb on the first row
        const cl = hash(x >> 2, y >> 1) > 0.7 ? 0.5 : 0;
        r += (200 - r) * cl; g += (220 - g) * cl; b += (240 - b) * cl;
        if (y > 0 && t[i - W] !== T.EARTH) { r = 120; g = 190; b = 255; }
      } else if (id === T.VOID) k = 0.8 + 0.4 * hash(x, y);
      terr[i * 3] = r * k; terr[i * 3 + 1] = g * k; terr[i * 3 + 2] = b * k;
    }
  }

  // ---- composition: chambers, roads, buildings, reach -------------------------------------------
  function compose() {
    const { t, ch } = st.map, N = W * H, d = img.data;
    const status = new Map();
    for (const c of st.chambers || []) status.set(c.id, c);
    const breachSeen = new Map();   // breach tile → seen by a chamber that is not sealed
    for (const c of st.chambers || []) for (const i of c.breaches || []) breachSeen.set(i, !!breachSeen.get(i) || c.status !== 'sealed');
    for (let i = 0; i < N; i++) {
      let r = terr[i * 3], g = terr[i * 3 + 1], b = terr[i * 3 + 2];
      if (t[i] === T.BREACH) {
        const k = breachSeen.get(i);
        if (k === undefined) { r = 70; g = 70; b = 76; } else if (!k) { r = 40; g = 22; b = 20; }
      } else if (ch[i] !== 255) {
        const c = status.get(ch[i]);
        if (c && c.status === 'sealed') { r = r * 0.16 + 4; g = g * 0.16 + 5; b = b * 0.16 + 10; }
        else if (c && c.status !== 'open') {
          const l = 0.3 * r + 0.59 * g + 0.11 * b, keep = c.status === 'pressurising' ? 0.25 + 0.6 * (1 - (c.work || 0) / 5) : 0.15;
          r = (l * 0.62 + 8) * (1 - keep) + r * keep; g = (l * 0.72 + 12) * (1 - keep) + g * keep; b = (l * 0.95 + 30) * (1 - keep) + b * keep;
        }
      }
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
    // the reach outline: mask tiles with a 4-neighbour outside the mask
    const mask = reachMask(st);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && mask[i - 1] && mask[i + 1] && mask[i - W] && mask[i + W]) continue;
      for (let j = 0; j < 3; j++) d[i * 4 + j] += (REACH_RGB[j] - d[i * 4 + j]) * 0.45;
    }
    // roads first, then buildings over them
    const put = (i, c, a = 1) => { for (let j = 0; j < 3; j++) d[i * 4 + j] += (c[j] - d[i * 4 + j]) * a; };
    for (const b of st.buildings || []) if (b.key === 'road' && b.x >= 0 && b.y >= 0 && b.x < W && b.y < H) put(b.y * W + b.x, ROAD_RGB, b.build > 0 ? 0.5 : 1);
    for (const b of st.buildings || []) {
      if (b.key === 'road') continue;
      const def = BUILDING[b.key], n = def?.size || 1, c = CAT_RGB[def?.cat] || [220, 220, 220];
      const col = b.build > 0 ? BUILD_RGB : b.off ? c.map((v) => v * 0.45) : c;
      for (let y = b.y; y < b.y + n; y++) for (let x = b.x; x < b.x + n; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        // a darker rim on big footprints, so neighbours stay apart
        const rim = n > 2 && (x === b.x || y === b.y || x === b.x + n - 1 || y === b.y + n - 1);
        put(y * W + x, rim ? col.map((v) => v * 0.7) : col, b.build > 0 ? 0.6 : 1);
      }
    }
    bctx.putImageData(img, 0, 0);
    baseDirty = false; drawSig = '';
  }

  // ---- drawing ----------------------------------------------------------------------------------
  function draw() {
    if (!visible || !st || !W) return;
    if (baseDirty) compose();
    const q = (a) => { let s = ''; for (let k = 0; k < a.length; k++) s += ((a[k] * 2) | 0) + ','; return s; };
    const msig = marks ? `${marks.edge || ''}|${q(marks.raiders || [])}|${q(marks.guardians || [])}|${marks.edge ? Math.floor(performance.now() / 120) : ''}` : '';
    const sig = (poly ? poly.map((v) => v.toFixed(1)).join(',') : '') + msig;
    if (sig === drawSig) return;
    drawSig = sig;
    const cw = canvas.width, chh = canvas.height, sx = cw / W, sz = chh / H;
    ctx.imageSmoothingEnabled = cw < W;   // downscaled on a phone at 1x: smooth; otherwise crisp
    ctx.clearRect(0, 0, cw, chh);
    ctx.drawImage(base, 0, 0, cw, chh);
    if (marks) drawMarks(sx, sz, cw, chh);
    if (poly && poly.length >= 6) {
      ctx.save();
      ctx.beginPath();
      for (let k = 0; k < poly.length; k += 2) ctx[k ? 'lineTo' : 'moveTo'](poly[k] * sx, poly[k + 1] * sz);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 242, 184, 0.12)';
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1, sx * 2.2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.stroke();
      ctx.lineWidth = Math.max(1, sx * 1.1);
      ctx.strokeStyle = '#fff2b8';
      ctx.stroke();
      if (target) {
        ctx.fillStyle = '#f5c542';
        ctx.beginPath(); ctx.arc(target[0] * sx, target[1] * sz, Math.max(1.5, sx * 1.6), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  // The coming raid's edge glows red (pulsing), guardians are blue dots, raiders red dots.
  function drawMarks(sx, sz, cw, chh) {
    ctx.save();
    if (marks.edge) {
      const k = 0.55 + 0.35 * Math.sin(performance.now() / 260), d = Math.max(6, Math.min(cw, chh) * 0.09);
      const [x0, y0, x1, y1] = marks.edge === 'north' ? [0, 0, 0, d] : marks.edge === 'east' ? [cw, 0, cw - d, 0] : marks.edge === 'west' ? [0, 0, d, 0] : [0, chh, 0, chh - d];
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(255, 40, 30, ${0.85 * k})`); g.addColorStop(1, 'rgba(255, 40, 30, 0)');
      ctx.fillStyle = g;
      if (marks.edge === 'north') ctx.fillRect(0, 0, cw, d); else if (marks.edge === 'east') ctx.fillRect(cw - d, 0, d, chh);
      else if (marks.edge === 'west') ctx.fillRect(0, 0, d, chh); else ctx.fillRect(0, chh - d, cw, d);
    }
    const dot = (a, r, fill, rim) => {
      for (let k = 0; k + 1 < a.length; k += 2) {
        ctx.beginPath(); ctx.arc(a[k] * sx, a[k + 1] * sz, r, 0, Math.PI * 2);
        ctx.fillStyle = rim; ctx.fill();
        ctx.beginPath(); ctx.arc(a[k] * sx, a[k + 1] * sz, r * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = fill; ctx.fill();
      }
    };
    dot(marks.guardians || [], Math.max(1.4, sx * 1.3), '#7fc8ff', 'rgba(10, 30, 80, 0.85)');
    dot(marks.raiders || [], Math.max(2, sx * 1.9), '#ff3a2a', 'rgba(60, 0, 0, 0.9)');
    ctx.restore();
  }

  // ---- input ------------------------------------------------------------------------------------
  let drag = null;
  const worldAt = (e) => {
    const rc = canvas.getBoundingClientRect();
    return [Math.min(W, Math.max(0, ((e.clientX - rc.left) / rc.width) * W)), Math.min(H, Math.max(0, ((e.clientY - rc.top) / rc.height) * H))];
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!st || (e.button !== 0 && e.pointerType === 'mouse')) return;
    e.preventDefault(); e.stopPropagation();
    canvas.setPointerCapture?.(e.pointerId);
    drag = e.pointerId; el.classList.add('dragging');
    onMove(...worldAt(e), 'start');
  });
  canvas.addEventListener('pointermove', (e) => { if (drag === e.pointerId) { e.preventDefault(); onMove(...worldAt(e), 'drag'); } });
  const end = (e) => { if (drag !== e.pointerId) return; drag = null; el.classList.remove('dragging'); onMove(...worldAt(e), 'end'); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); onWheel?.(e); }, { passive: false });

  // ---- API ----------------------------------------------------------------------------------------
  return {
    el,
    // A new map (or new terrain): redraw everything.
    setState(state) {
      st = state;
      if (state.map.w !== W || state.map.h !== H) {
        W = state.map.w; H = state.map.h;
        base.width = W; base.height = H;
        img = bctx.createImageData(W, H);
        layout();
      }
      buildTerrain();
      baseDirty = true;
    },
    // Chambers or buildings changed: recompose on the next draw (only if shown).
    refresh(state) { st = state; baseDirty = true; },
    // The camera's ground footprint [x0, z0, x1, z1, ...] and target [x, z], in tiles, and the
    // defence marks ({ raiders: [x, z, ...], guardians: [x, z, ...], edge }); drawn only when changed.
    frame(footprint, at, m = null) { poly = footprint; target = at; marks = m; draw(); },
    setVisible(on) { visible = !!on; el.hidden = !visible; drawSig = ''; },
    get visible() { return visible; },
    layout,
    // The composed picture as a data URL (tests).
    snapshot() { if (baseDirty && st) compose(); return base.toDataURL(); },
    destroy() { phone?.removeEventListener?.('change', layout); el.remove(); },
  };
}
