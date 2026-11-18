// Sato's Harvest: the town map (M, or the map button) and the small minimap in the corner of the HUD.
// Both are drawn on canvases straight from the map data (js/farm/maps.js): ground colours, buildings
// as labelled blocks, trees, the river and paths, Sato as a pulsing dot and the villagers who are on
// that map now. The map screen has a tab for each outdoor map; indoors it opens on the map whose door
// Sato is behind. Art: scenes/townmap (optional), shown as a header picture.
import { allMaps, outsideOf, findSpot } from './maps.js';
import * as story from './story.js';
import * as art from './art.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const OUTDOOR = [['farm', 'The Hollin field'], ['village', 'Willowfall'], ['hill', 'Terrace Hill']];
const GROUND = { g: '#93c870', f: '#a8805a', p: '#e6d3a4', c: '#ddd5c4', s: '#ecdfb2', w: '#72b9de', k: '#bb8c5a', r: '#8c877f', o: '#c4c0b6', h: '#dcc06c', b: '#b48a5c', d: '#c6d0d6', a: '#8c877e', x: '#33302c' };
const ROOF = { house: '#e0905a', barn: '#c8553e', coop: '#dca85e', silo: '#a3b0ba', greenhouse: '#c3eaee', store: '#ea8762', cafe: '#8299b4', workshop: '#cba36c', hall: '#c45c4a', ranch: '#bc543f', clinic: '#f2efe8', library: '#9378b4', pumphouse: '#93a7b4', post: '#e6c454', guard: '#7393ac', lift: '#8c7c6c' };
const TILE = 12;                                                  // pixels per tile in the cached base picture
let hooks = null, base = new Map(), mini = null, open = null, lastMini = 0;

// ---------------------------------------------------------------- the base picture of a map (cached)
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function baseOf(m, season) {
  const key = m.id + ':' + season; if (base.has(key)) return base.get(key);
  const c = document.createElement('canvas'); c.width = m.w * TILE; c.height = m.h * TILE; const g = c.getContext('2d'), T = TILE;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const k = m.at(x, y); g.fillStyle = k === 'g' && season === 3 ? '#e9eff3' : GROUND[k] || '#999'; g.fillRect(x * T, y * T, T + 0.5, T + 0.5); }
  // soft edges: water gets a lighter rim and ripples, deck plating a seam grid
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const k = m.at(x, y);
    if (k === 'w') { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x * T + 2, y * T + T * 0.5); g.quadraticCurveTo(x * T + T * 0.5, y * T + T * 0.3, x * T + T - 2, y * T + T * 0.5); g.stroke(); }
    if (k === 'd') { g.strokeStyle = 'rgba(60,80,95,.25)'; g.strokeRect(x * T + 0.5, y * T + 0.5, T - 1, T - 1); }
  }
  if (m.field) { g.fillStyle = 'rgba(80,50,25,.25)'; for (let y = 0; y < m.field.h; y++) g.fillRect(m.field.x * T, (m.field.y + y) * T + T * 0.45, m.field.w * T, 2); }
  for (const p of m.props) {
    const x = (p.x + p.w / 2) * T, y = (p.y + p.d / 2) * T, k = p.kind;
    if (k === 'tree' || k === 'pine' || k === 'bush') { const r = (k === 'bush' ? 0.32 : 0.5) * T * (p.scale || 1); g.fillStyle = k === 'pine' ? '#3f7a4a' : season === 3 ? '#b9c9c2' : season === 2 ? '#c9853a' : '#5a9a48'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, 7); g.fill(); }
    else if (k === 'fence') { g.strokeStyle = '#8a6a45'; g.lineWidth = 2; g.beginPath(); if (p.rot) { g.moveTo(x, y - T / 2); g.lineTo(x, y + T / 2); } else { g.moveTo(x - T / 2, y); g.lineTo(x + T / 2, y); } g.stroke(); }
    else if (k === 'solar_panel') { g.fillStyle = '#2c4f8c'; rr(g, p.x * T + 1, p.y * T + 2, p.w * T - 2, p.d * T - 4, 2); g.fill(); }
    else if (k === 'hydro_tower') { g.fillStyle = '#5fae4a'; g.strokeStyle = '#5fb3b0'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, T * 0.32, 0, 7); g.fill(); g.stroke(); }
    else if (k === 'water_tank' || k === 'fan_tower') { g.fillStyle = '#f3ecdc'; g.strokeStyle = '#5fb3b0'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, Math.min(p.w, p.d) * T * 0.4, 0, 7); g.fill(); g.stroke(); }
    else if (k === 'fountain') { g.fillStyle = '#d7d2c6'; g.beginPath(); g.arc(x, y, T * 0.95, 0, 7); g.fill(); g.fillStyle = '#8fd3e8'; g.beginPath(); g.arc(x, y, T * 0.7, 0, 7); g.fill(); }
    else if (k === 'lift_kiosk' || k === 'liftpad') { g.fillStyle = '#5fb3b0'; g.beginPath(); g.arc(x, y, T * (k === 'liftpad' ? 0.8 : 0.9), 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - T * 0.5); g.lineTo(x + T * 0.4, y + T * 0.2); g.lineTo(x - T * 0.4, y + T * 0.2); g.fill(); }
    else if (k === 'barge') { g.fillStyle = '#8a5a3a'; rr(g, p.x * T + 2, p.y * T + 3, p.w * T - 4, p.d * T - 6, 6); g.fill(); }
    else if (k === 'pipe_run') { g.strokeStyle = '#8fb1b8'; g.lineWidth = 3; g.beginPath(); if (p.d > p.w) { g.moveTo(x, p.y * T); g.lineTo(x, (p.y + p.d) * T); } else { g.moveTo(p.x * T, y); g.lineTo((p.x + p.w) * T, y); } g.stroke(); }
    else if (k === 'lantern' || k === 'colony_lamp') { g.fillStyle = '#ffd36a'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
    else if (['market_stall', 'cargo_crate', 'noticeboard', 'memorial', 'airlock_door', 'well', 'bin', 'wind_turbine_small', 'bench'].includes(k)) { g.fillStyle = { market_stall: '#f08a6c', cargo_crate: '#d9a35a', noticeboard: '#c9a26e', memorial: '#a9a69d', airlock_door: '#8a98a6', well: '#9a9790', bin: '#a07a4a', wind_turbine_small: '#f3ecdc', bench: '#a07a4a' }[k]; rr(g, p.x * T + 2, p.y * T + 2, p.w * T - 4, p.d * T - 4, 2); g.fill(); }
  }
  for (const b of m.buildings) {
    const x = b.x * T, y = b.y * T, w = b.w * T, h = b.d * T;
    g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, x + 3, y + 4, w, h, 6); g.fill();
    g.fillStyle = ROOF[b.kind] || (b.kind.startsWith('cottage') ? ['#e6a070', '#7fa3c4', '#d98a6a', '#8fb38a'][b.kind.charCodeAt(8) % 4] : '#c9a06a');
    rr(g, x, y, w, h, 6); g.fill(); g.strokeStyle = 'rgba(60,40,25,.55)'; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x + 4, y + h / 2); g.lineTo(x + w - 4, y + h / 2); g.stroke();
  }
  for (const d of m.doors) { g.fillStyle = '#5a3a24'; g.fillRect(d.x * T + 2, d.y * T - 2, T - 4, 4); }
  base.set(key, c); return c;
}

// ---------------------------------------------------------------- who is where
function villagers(mapId) {
  const st = hooks.get(), out = [];
  if (!st.S) return out;
  if (st.map && st.map.id === mapId) { for (const [id, n] of st.npcs || []) out.push({ id, x: n.actor.x, y: n.actor.y }); return out; }
  const c = hooks.ctx ? hooks.ctx() : null; if (!c) return out;
  for (const id of story.VILLAGERS || Object.keys(story.NPCS).filter((k) => k !== 'sato')) {
    const w = story.whereIs(id, c), at = w && findSpot(w.spot);
    if (at && at.map === mapId) out.push({ id, x: at.x, y: at.y });
  }
  return out;
}
function whereAmI() {                                             // { map, x, y } on an outdoor map, or null (the Old World)
  const { map, me } = hooks.get(); if (!map || !me || map.ruins) return null;
  if (!map.indoor) return { map: map.id, x: me.x, y: me.y };
  const o = outsideOf(map.id); return { map: o.map, x: o.x, y: o.y - 0.6 };
}
const nameOf = (id) => { const st = hooks.get(), n = story.NPCS[id]; return st.S && st.S.npc[id] && st.S.npc[id].met ? n.short || n.name : '???'; };
const colourOf = (id) => (story.NPCS[id].look && story.NPCS[id].look.top) || '#fff';

// ---------------------------------------------------------------- the map screen
function drawScreen(t) {
  if (!open) return;
  if (!open.cv.isConnected) { open = null; return; }                 // another window took its place
  const cv = open.cv, m = allMaps()[open.tab], season = hooks.get().S ? hooks.get().S.cal.season : 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.round(Math.min(cv.parentElement.clientWidth || 640, Math.max(260, window.innerHeight * 0.9 - (art.url('scenes/townmap') ? 250 : 170)) * m.w / m.h)), s = cw / m.w, ch = Math.round(m.h * s);
  if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, ch);
  g.imageSmoothingEnabled = true; g.drawImage(baseOf(m, season), 0, 0, cw, ch);
  const label = (txt, x, y, font, fill = '#2b2118', halo = 'rgba(255,250,235,.9)') => { g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3.5; g.strokeStyle = halo; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y); };
  for (const [txt, x, y] of m.areas || []) label(txt, x * s, y * s, `italic 600 ${Math.max(10, s * 0.95)}px "Spectral", Georgia, serif`, '#4a5a3a');
  for (const b of m.buildings) if (b.label) { const lines = b.label.length > 14 && b.w * s < 110 ? b.label.replace(/^(\S+\s\S+)\s/, '$1\n').split('\n') : [b.label]; lines.forEach((l, i) => label(l, (b.x + b.w / 2) * s, (b.y + b.d / 2) * s + (i - (lines.length - 1) / 2) * s * 1.05, `600 ${Math.max(9, Math.min(13, s * 0.92))}px "IBM Plex Sans", sans-serif`)); }
  for (const p of m.props) if (p.label && p.kind !== 'memorial') label(p.label, (p.x + p.w / 2) * s, (p.y + p.d + 0.7) * s, `600 ${Math.max(9, s * 0.8)}px "IBM Plex Sans", sans-serif`, '#24565a');
  for (const e of m.exits) { const to = allMaps()[e.to.map], x = ((e.x0 + e.x1) / 2 + 0.5) * s, y = ((e.y0 + e.y1) / 2 + 0.5) * s; const nm = '➜ ' + (to ? to.name.split(' · ')[0] : e.to.map); label(nm, Math.min(cw - 50, Math.max(50, x)), Math.min(ch - 10, Math.max(10, y + (e.y0 === 0 ? s * 0.9 : e.y0 >= m.h - 1 ? -s * 0.9 : 0))), `700 ${Math.max(10, s * 0.85)}px "Chakra Petch", sans-serif`, '#7a5410'); }
  open.dots = [];
  for (const v of villagers(open.tab)) { const x = v.x * s, y = v.y * s; g.fillStyle = colourOf(v.id); g.strokeStyle = '#2b2118'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, Math.max(4, s * 0.38), 0, 7); g.fill(); g.stroke(); open.dots.push({ x, y, text: nameOf(v.id) }); }
  const me = whereAmI();
  if (me && me.map === open.tab) {
    const x = me.x * s, y = me.y * s, p = (t / 900) % 1;
    g.fillStyle = `rgba(232,72,58,${0.45 * (1 - p)})`; g.beginPath(); g.arc(x, y, s * (0.5 + p * 1.6), 0, 7); g.fill();
    g.fillStyle = '#e8483a'; g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, Math.max(5, s * 0.48), 0, 7); g.fill(); g.stroke();
    label('Sato', x, y - s * 1.3, `700 ${Math.max(10, s * 0.85)}px "Chakra Petch", sans-serif`, '#b9402e');
    open.dots.push({ x, y, text: 'Sato (you)' });
  }
  if (open.hover) { const h = open.hover; g.font = '600 12px "IBM Plex Sans", sans-serif'; const w = g.measureText(h.text).width + 14; g.fillStyle = 'rgba(30,22,14,.9)'; rr(g, Math.min(cw - w - 4, h.x + 10), h.y - 26, w, 20, 8); g.fill(); g.fillStyle = '#fff6dd'; g.textAlign = 'left'; g.fillText(h.text, Math.min(cw - w - 4, h.x + 10) + 7, h.y - 16); }
  open.raf = requestAnimationFrame(drawScreen);
}
export function isOpen() { return !!open; }
export function openMap(tab) {
  if (!hooks) return;
  const me = whereAmI(); tab = tab || (me ? me.map : 'village');
  const head = art.url('scenes/townmap');
  const html = `${head ? `<img class="fm-maphead" src="${head}" alt="">` : ''}<nav class="fm-tabs fm-maptabs">${OUTDOOR.map(([id, n]) => `<button data-map="${id}" class="${id === tab ? 'on' : ''}">${esc(n)}${me && me.map === id ? ' <em>You are here</em>' : ''}</button>`).join('')}</nav>
    <canvas class="fm-mapcv" id="mapCv"></canvas><p class="fm-dim fm-maplegend"><i style="background:#e8483a"></i>Sato <i style="background:#c9a06a;border-radius:3px"></i>Buildings <i style="background:#ffd36a"></i>Lamps · hover a dot to see who it is · M or Esc to close</p>`;
  const body = hooks.openWin('Map of the Lantern Ring', html, () => { if (open) cancelAnimationFrame(open.raf); open = null; }, 'map');
  open = { tab, cv: $('mapCv'), dots: [], hover: null, raf: 0 };
  body.onclick = (e) => { const b = e.target.closest('[data-map]'); if (!b) return; open.tab = b.dataset.map; for (const x of body.querySelectorAll('[data-map]')) x.classList.toggle('on', x === b); open.cv.width = 0; };
  open.cv.onmousemove = (e) => { const r = open.cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; open.hover = open.dots.find((d) => Math.hypot(d.x - x, d.y - y) < 9) || null; };
  open.cv.onmouseleave = () => { open.hover = null; };
  open.raf = requestAnimationFrame(drawScreen);
}
export function toggleMap() { if (open) hooks.closeWin(); else if (!hooks.canOpen || hooks.canOpen()) { if (hooks.get().map && hooks.get().map.ruins) return hooks.toast && hooks.toast('No maps down here: the Old World has changed too much.'); openMap(); } }

// ---------------------------------------------------------------- the minimap in the corner
function drawMini(t) {
  requestAnimationFrame(drawMini);
  if (!mini || !hooks) return;
  const st = hooks.get(), m = st.map, hud = $('hud');
  const show = !!(m && st.me && !m.indoor && !m.ruins && hud && !hud.hidden);
  mini.wrap.hidden = !show; if (!show || t - lastMini < 66) return; lastMini = t;
  const cv = mini.cv, dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth || 160;
  if (cv.width !== Math.round(W * dpr)) { cv.width = cv.height = Math.round(W * dpr); }
  const g = cv.getContext('2d'), s = 4.2, cx = st.me.x, cy = st.me.y; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#5f7f55'; g.fillRect(0, 0, W, W);
  const b = baseOf(m, st.S ? st.S.cal.season : 0), sx = (cx - W / 2 / s) * TILE, sy = (cy - W / 2 / s) * TILE, sw = (W / s) * TILE;
  g.drawImage(b, sx, sy, sw, sw, 0, 0, W, W);
  const P = (x, y) => [W / 2 + (x - cx) * s, W / 2 + (y - cy) * s];
  // the camera's view, as a soft cone
  const yaw = st.W ? st.W.yaw : 0, a = Math.atan2(-Math.cos(yaw), -Math.sin(yaw));
  const gr = g.createRadialGradient(W / 2, W / 2, 2, W / 2, W / 2, W * 0.42); gr.addColorStop(0, 'rgba(255,250,220,.55)'); gr.addColorStop(1, 'rgba(255,250,220,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(W / 2, W / 2); g.arc(W / 2, W / 2, W * 0.42, a - 0.55, a + 0.55); g.closePath(); g.fill();
  for (const [id, n] of st.npcs || []) { const [x, y] = P(n.actor.x, n.actor.y); if (x < -4 || y < -4 || x > W + 4 || y > W + 4) continue; g.fillStyle = colourOf(id); g.strokeStyle = '#2b2118'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 3.4, 0, 7); g.fill(); g.stroke(); }
  const p = (t / 900) % 1; g.fillStyle = `rgba(232,72,58,${0.5 * (1 - p)})`; g.beginPath(); g.arc(W / 2, W / 2, 4 + p * 9, 0, 7); g.fill();
  g.fillStyle = '#e8483a'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, W / 2, 4.5, 0, 7); g.fill(); g.stroke();
  g.font = '700 10px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(30,22,14,.8)'; g.lineWidth = 3; g.strokeText('N', W / 2, 9); g.fillText('N', W / 2, 9);
  mini.name.textContent = m.name.split(' · ')[0];
}

// main.js calls this once: get() → { S, map, me, npcs, W }, ctx() → the story context, openWin/closeWin
// from ui.js, canOpen() → whether the game may open a window now, toast(text).
export function initMap(h) {
  hooks = h;
  mini = { wrap: $('minimap'), cv: $('miniCv'), name: $('miniName') };
  if (mini.wrap) mini.wrap.addEventListener('click', () => toggleMap());
  const btn = $('bMap'); if (btn) btn.addEventListener('click', () => toggleMap());
  requestAnimationFrame(drawMini);
}
