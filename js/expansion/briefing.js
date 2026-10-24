// The expansion's briefing screen (game.html #sBrief): chapter header and story, the villain's
// transmission (villain.js), an annotated overview of the mission map, the suggested strategy
// and the objective. Mission JSON fields: briefing, chapter, transmission, strategy (steps) and
// plan (map annotations: { n, path: [[x, y], ...] } arrows and { n, at: [x, y], note } markers,
// in map cells; n is the strategy step they belong to).
import { cellOrigin } from '../maps.js';
import { VILLAIN, villainPortrait } from './villain.js';
import { SPEAKERS, portrait } from './portraits.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STRUCTURE = 52, CORTEX = 56, FORTRESSES = [53, 54, 55, 57];

// The briefing's parts, shared by game.html's briefing screen and the intermission's hero panel.
export const storyHtml = (mission) => `<article class="bStory">${(mission.briefing || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  .map((p, i) => `<p style="--d:${i}">${esc(p)}</p>`).join('')}</article>`;

export const transmissionHtml = (mission) => (mission.transmission ? `<aside class="bTx">
      <div class="txHead"><span class="rec"></span>Incoming transmission · Union Security Directorate</div>
      <div class="txFace">${villainPortrait()}<div class="txScan"></div><div class="txNoise"></div></div>
      <div class="txWho"><b>${esc(VILLAIN.name)}</b><span>${esc(VILLAIN.rank)}</span></div>
      <blockquote data-type="${esc(mission.transmission)}">${esc(mission.transmission)}</blockquote>
    </aside>` : '');

// The new campaign's briefing dialogue (mission JSON `comms`: [{ speaker, text }], docs/STORY.md):
// each line with its speaker's portrait; your side in a cool comms panel, the Directorate in the
// red incoming-transmission style, the cartel in amber. Lines type out one after another.
export const commsHtml = (mission) => ((mission.comms || []).length ? `<section class="bComms"><h2>Comms</h2>${mission.comms.map((c, i) => {
  const who = SPEAKERS[c.speaker] || { name: c.speaker, rank: '', side: 'ally' };
  return `<div class="cline ${who.side}" style="--d:${i}"><div class="cFace">${portrait(c.speaker)}<div class="txScan"></div></div>
    <div class="cBody"><div class="cWho">${who.side === 'ally' ? '' : '<span class="rec"></span>'}<b>${esc(who.name)}</b><span>${esc(who.rank)}</span></div>
    <p data-type="${esc(c.text)}">${esc(c.text)}</p></div></div>`;
}).join('')}</section>` : '');
// The voice beside the story: Kessrin's transmission, unless the mission has full comms.
export const voiceHtml = (mission) => ((mission.comms || []).length ? '' : transmissionHtml(mission));

export const mapHtml = () => `<section class="bMap"><h2>Theatre map</h2>
    <div class="mapWrap"><canvas id="briefMap"></canvas></div>
    <div class="legend"><span><i class="lg own"></i>Your forces</span><span><i class="lg foe"></i>Union</span><span><i class="lg grey"></i>Grey dock (capture)</span><span><i class="lg tgt"></i>Objective</span><span><i class="lg arr"></i>Plan, numbered as below</span><span><i class="lg rein"></i>Reinforcements (turn)</span></div>
  </section>`;

export const strategyHtml = (mission) => ((mission.strategy || []).length ? `<section class="bPlan"><h2>Suggested strategy <small>hover a step to see it on the map</small></h2><ol>${mission.strategy
  .map((s, i) => `<li data-step="${i + 1}" style="--d:${i}">${esc(s)}</li>`).join('')}</ol></section>` : '');

export function briefingHtml(mission, { goal, no = null, total = null }) {
  const chips = [mission.turnLimit ? `Turn limit ${mission.turnLimit}` : 'No turn limit', mission.cap ? `Deploy up to ${mission.cap}` : null,
    (mission.arrivals || []).length ? `${mission.arrivals.length} reinforcement wave${mission.arrivals.length > 1 ? 's' : ''}` : null].filter(Boolean);
  return `<div class="brief fxIntro">
  <header class="bHead">
    <div class="bNo">${no !== null ? String(no + 1).padStart(2, '0') : ''}</div>
    <div class="bChap">${esc(mission.chapter || 'Expansion · Galt remnant')}${total ? ` · mission ${no + 1} of ${total}` : ''}</div>
    <h1 data-text="${esc(mission.title || mission.name)}">${esc(mission.title || mission.name)}</h1>
    <div class="chips">${chips.map((c, i) => `<span class="chip" style="--d:${i}">${esc(c)}</span>`).join('')}</div>
  </header>
  <div class="bTop${voiceHtml(mission) ? '' : ' solo'}">
    ${storyHtml(mission)}
    ${voiceHtml(mission)}
  </div>
  ${commsHtml(mission)}
  ${mapHtml()}
  <div class="bBottom">
    ${strategyHtml(mission)}
    <section class="bObj"><h2>Objective</h2><p>${esc(goal)}</p>
      <div class="row"><button class="btn primary big" id="bBriefGo">Launch mission</button><button class="btn" id="bBriefBack">Back</button></div></section>
  </div>
</div>`;
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Timeline of the briefing (seconds since it opened): the map's terrain fades in, the armies
// pop in, then the objectives, the reinforcements, and the plan step by step. The strategy
// steps and the villain's typed quote follow the same clock.
const T = { terrain: 0.15, own: 0.9, neutral: 1.2, foe: 1.4, marks: 2.3, rein: 2.7, plan: 3.4, step: 1.25, quote: 1.6, cps: 38, gap: 0.6 };
export const stepTime = (n) => T.plan + (n - 1) * T.step;

// Starts the briefing's animations in `root` (a .brief or the intermission's hero): the theatre
// map on `#briefMap` (see animateOverview), the strategy steps revealed with their arrows (and
// highlighted on the map when hovered), and the villain's line typed out. `t0` is when the
// briefing first opened (performance.now()), so a re-rendered page carries on where it was.
// Returns { stop() }.
export function startBriefingFx(root, map, t0 = performance.now()) {
  const reduced = reducedMotion(), steps = [...root.querySelectorAll('.bPlan li[data-step]')];
  const canvas = root.querySelector('#briefMap');
  const ov = canvas && map ? animateOverview(canvas, { ...map, t0, reduced }) : null;
  const mark = (cur) => { for (const o of steps) o.classList.toggle('hl', +o.dataset.step === cur); };
  for (const li of steps) {
    const n = +li.dataset.step;
    li.onmouseenter = li.onfocus = () => mark(ov ? ov.highlight(n) : n);
    li.onmouseleave = li.onblur = () => mark(ov ? ov.highlight(null) : null);
    li.onclick = () => { mark(ov ? ov.highlight(n, true) : n); if (canvas && canvas.getBoundingClientRect().bottom < 0) canvas.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }); };
    li.tabIndex = 0;
  }
  // the villain's quote and the comms lines type out one after another, a short pause between
  const quotes = [...root.querySelectorAll('.bTx blockquote[data-type], .bComms .cline [data-type]')];
  let at = T.quote;
  const lines = quotes.map((el) => { const text = el.dataset.type, start = at; at += text.length / T.cps + T.gap; return { el, text, start, line: el.closest('.cline') }; });
  let raf = 0, stopped = false;
  const tick = () => {
    if (stopped) return;
    const t = reduced ? Infinity : (performance.now() - t0) / 1000;
    for (const li of steps) li.classList.toggle('on', t >= stepTime(+li.dataset.step));
    for (const { el, text, start, line } of lines) {
      const n = Math.max(0, Math.min(text.length, Math.floor((t - start) * T.cps)));
      line?.classList.toggle('on', t >= start - 0.3);
      if (el.dataset.n !== String(n)) { el.dataset.n = n; el.innerHTML = `${esc(text.slice(0, n))}${n < text.length && t >= start ? '<span class="caret"></span>' : ''}`; }
    }
    const done = t >= stepTime(steps.length + 1) && t >= at;
    if (!done) raf = requestAnimationFrame(tick);
  };
  tick();
  if (!reduced) root.querySelector('.bPlan')?.classList.add('fxSteps');   // after tick(): steps already due show at once
  return { stop() { stopped = true; cancelAnimationFrame(raf); ov?.stop(); } };
}

// The animated theatre map. Static layers (terrain, then terrain plus every unit once the
// armies are in) are drawn once; each frame only adds the overlays: the scan sweep, pulsing
// objective rings, blinking reinforcement waves and the plan's arrows drawing themselves in
// step order. Pauses while off screen or the tab is hidden; stops when the canvas leaves the
// page. With reduced motion it draws the finished map once.
export function animateOverview(canvas, { terrain, mission, types, icon, scale = 2, t0 = performance.now(), reduced = reducedMotion() }) {
  const W = terrain.width, H = terrain.height, S = scale, CW = W * S, CH = H * S;
  canvas.width = CW; canvas.height = CH;
  const g = canvas.getContext('2d');
  const org = (x, y) => { const [X, Y] = cellOrigin(x, y); return [(X - 16) * S, (Y - 16) * S]; };
  const ctr = (x, y) => { const [X, Y] = org(x, y); return [X + 12 * S, Y + 8 * S]; };
  const layer = () => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  const ease = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : 1 - (1 - v) ** 3);
  const back = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : 1 + 2.2 * (v - 1) ** 3 + 1.2 * (v - 1) ** 2);   // overshoots a little: a "pop"

  // terrain, dimmed
  const [base, bg] = layer();
  bg.drawImage(terrain, 0, 0, CW, CH); bg.fillStyle = 'rgba(4,6,16,.28)'; bg.fillRect(0, 0, CW, CH);

  const o = mission.objective || {};
  const target = (u) => u.army === 1 && (o.kind === 'command' ? u.type === CORTEX : o.kind === 'fortress' ? FORTRESSES.includes(u.type)
    : o.kind === 'flagship' ? u.type === o.type : o.kind === 'destroyType' ? (types[u.type].empty ?? u.type) === (types[o.type].empty ?? o.type) : false);
  // units, each with the moment it pops in (its army's wave, spread west to east)
  const groups = { own: [], neutral: [], foe: [] };
  for (const u of mission.units) (u.neutral ? groups.neutral : u.army === 0 ? groups.own : groups.foe).push(u);
  const units = [];
  for (const [k, list] of Object.entries(groups)) {
    const sorted = [...list].sort((a, b) => a.x - b.x || a.y - b.y);
    sorted.forEach((u, i) => units.push({ u, img: icon({ type: u.type, army: u.neutral ? 2 : u.army }), at: T[k] + (sorted.length > 1 ? (i / (sorted.length - 1)) * 0.7 : 0), pos: org(u.x, u.y), c: ctr(u.x, u.y) }));
  }
  const unitsIn = Math.max(...units.map((v) => v.at), 0) + 0.45;
  let baked = null;   // terrain + all units, once they have all popped in
  const bake = () => { const [c, x] = layer(); x.drawImage(base, 0, 0); for (const v of units) x.drawImage(v.img, ...v.pos, 24 * S, 16 * S); return c; };

  // marks: objective targets, grey docks, the general
  const marks = [];
  for (const v of units) {
    const { u } = v, [cx, cy] = v.c;
    if (target(u)) marks.push({ kind: 'target', cx, cy });
    else if (u.neutral) marks.push({ kind: 'grey', cx, cy });
    if (mission.general && u.x === mission.general.x && u.y === mission.general.y) marks.push({ kind: 'general', cx, cy });
  }
  // reinforcement waves
  const waves = (mission.arrivals || []).map((a) => {
    const pts = a.units.map((u) => ctr(u.x, u.y)), mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return { a, mx, my, r: Math.max(18 * S, ...pts.map(([x, y]) => Math.hypot(x - mx, y - my) + 12 * S)), c: a.army === 0 ? '#5cf2ff' : '#ff7a45',
      icons: a.units.map((u) => ({ img: icon({ type: u.type, army: a.army }), pos: org(u.x, u.y) })) };
  });
  // the plan: arrows flattened into polylines (for drawing them a bit at a time) and markers
  const plan = (mission.plan || []).map((p) => (p.path ? { ...p, line: flatten(p.path.map(([x, y]) => ctr(x, y))) } : { ...p, c: ctr(...p.at) }));

  let hl = null, pinned = null, raf = 0, last = 0, visible = true, stopped = false;
  const draw = (t) => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    g.fillStyle = '#000'; g.fillRect(0, 0, CW, CH);
    if (t >= unitsIn) { baked ||= bake(); g.drawImage(baked, 0, 0); }
    else {
      g.globalAlpha = ease((t - T.terrain) / 0.8); g.drawImage(base, 0, 0); g.globalAlpha = 1;
      for (const v of units) {
        const k = back((t - v.at) / 0.45);
        if (k <= 0) continue;
        const [X, Y] = v.pos, w = 24 * S, h = 16 * S;
        g.save(); g.globalAlpha = Math.min(1, k * 1.5); g.translate(X + w / 2, Y + h / 2); g.scale(k, k); g.drawImage(v.img, -w / 2, -h / 2, w, h); g.restore();
        if (k < 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - k) * .8; g.fillStyle = v.u.army === 0 && !v.u.neutral ? '#ff6ad5' : v.u.neutral ? '#c8cbd6' : '#5cff8a';
          g.beginPath(); g.arc(...v.c, 16 * S * (1.4 - k * .4), 0, 7); g.fill(); g.restore(); }
      }
    }
    const pulse = reduced ? 0 : Math.sin(t * 3.2);
    // objective edge
    if (o.edge) {
      const good = o.kind === 'escape', c = good ? '80,255,170' : '255,70,90', a = ease((t - 0.6) / 0.8) * (reduced ? 1 : .8 + .2 * Math.sin(t * 2));
      const east = o.edge === 'east', grd = east ? g.createLinearGradient(CW - 60 * S, 0, CW, 0) : g.createLinearGradient(60 * S, 0, 0, 0);
      grd.addColorStop(0, `rgba(${c},0)`); grd.addColorStop(1, `rgba(${c},${.55 * a})`);
      g.fillStyle = grd; g.fillRect(east ? CW - 60 * S : 0, 0, 60 * S, CH);
      if (a > .05) { g.globalAlpha = Math.min(1, a); label(g, east ? CW - 8 * S : 8 * S, 14 * S, good ? 'EXIT ▶' : 'MUST NOT REACH', `rgb(${c})`, S, east ? 'right' : 'left'); g.globalAlpha = 1; }
    }
    // marks, popping in, then pulsing
    const mk = back((t - T.marks) / 0.5);
    if (mk > 0) for (const m of marks) {
      const r = (m.kind === 'target' ? 15 : m.kind === 'general' ? 14 : 13) * S * mk * (1 + .06 * pulse);
      if (m.kind === 'target') {
        ring(g, m.cx, m.cy, r, '#ff3d5a', S);
        if (!reduced) { const ph = ((t - T.marks) % 1.6) / 1.6; g.save(); g.globalAlpha = (1 - ph) * .7; ring(g, m.cx, m.cy, r * (1 + ph * 1.2), '#ff3d5a', S); g.restore(); }
        label(g, m.cx, m.cy - 17 * S, 'TARGET', '#ff3d5a', S);
      } else if (m.kind === 'grey') ring(g, m.cx, m.cy, r, '#c8cbd6', S, [3 * S, 3 * S]);
      else { ring(g, m.cx, m.cy, r, '#ffd257', S); label(g, m.cx, m.cy + 22 * S, '★ GENERAL', '#ffd257', S); }
    }
    // reinforcements: blinking, dashed rings that turn slowly
    const rk = ease((t - T.rein) / 0.6);
    if (rk > 0) for (const w of waves) {
      const blink = reduced ? 1 : .55 + .45 * (0.5 + 0.5 * Math.sin(t * 4.5));
      g.save(); g.globalAlpha = rk; g.setLineDash([6 * S, 4 * S]); g.lineDashOffset = reduced ? 0 : -t * 12 * S; ring(g, w.mx, w.my, w.r, w.c, S); g.restore();
      g.save(); g.globalAlpha = rk * .8 * blink; for (const ic of w.icons) g.drawImage(ic.img, ...ic.pos, 24 * S, 16 * S); g.restore();
      g.save(); g.globalAlpha = rk; label(g, Math.min(Math.max(w.mx, 60 * S), CW - 60 * S), Math.max(w.my - w.r - 6 * S, 12 * S), `${w.a.army === 0 ? 'ALLIES' : 'UNION'} · TURN ${w.a.turn + 1}`, w.c, S); g.restore();
    }
    // the plan, step by step; a highlighted step stands out, the others fade back
    for (const p of plan) {
      const st = stepTime(p.n), k = (t - st) / 1.0;
      if (k <= 0) continue;
      const dim = hl !== null && hl !== p.n, glow = hl === p.n;
      g.save(); g.globalAlpha = dim ? .28 : 1;
      if (p.line) {
        arrow(g, p.line, S, ease(k), reduced ? 0 : t, glow);
        const [x0, y0] = p.line.pts[0]; badge(g, x0, y0, p.n, S * back(k * 2.5), glow);
      } else {
        const [cx, cy] = p.c, b = back(k * 2), rr = 14 * S * b * (glow ? 1.15 + .08 * pulse : 1);
        g.fillStyle = glow ? 'rgba(255,210,87,.32)' : 'rgba(255,210,87,.18)'; g.beginPath(); g.arc(cx, cy, Math.max(0, rr), 0, 7); g.fill();
        g.save(); g.setLineDash([2 * S, 3 * S]); g.lineDashOffset = reduced ? 0 : -t * 8 * S; ring(g, cx, cy, Math.max(0, rr), '#ffd257', S); g.restore();
        badge(g, cx, cy, p.n, S * b, glow);
        if (p.note && k > .3) { g.globalAlpha *= ease((k - .3) / .4); label(g, Math.min(Math.max(cx, 70 * S), CW - 70 * S), cy + (cy > CH - 30 * S ? -22 : 24) * S, p.note, '#ffe7a3', S); }
      }
      g.restore();
    }
    // a slow radar sweep across the map, and a faint scanline texture
    if (!reduced) {
      const sx = ((t / 7) % 1) * (CW + 200 * S) - 100 * S, grd = g.createLinearGradient(sx - 80 * S, 0, sx, 0);
      grd.addColorStop(0, 'rgba(92,242,255,0)'); grd.addColorStop(1, 'rgba(92,242,255,.13)');
      g.fillStyle = grd; g.fillRect(sx - 80 * S, 0, 80 * S, CH);
      g.fillStyle = 'rgba(160,250,255,.45)'; g.fillRect(sx, 0, Math.max(1, S), CH);
    }
  };

  const frame = (now) => {
    raf = 0;
    if (stopped) return;
    if (!canvas.isConnected) { api.stop(); return; }
    if (now - last >= 30) { last = now; draw((now - t0) / 1000); }   // ~30 fps is plenty for a map
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible && !raf && !reduced) raf = requestAnimationFrame(frame); }) : null;
  const onVis = () => { if (!document.hidden && visible && !raf && !reduced && !stopped) raf = requestAnimationFrame(frame); };
  const api = {
    // a strategy step to bring forward on the map (null: none); `pin` keeps it after the hover ends
    highlight(n, pin = false) {
      if (pin) pinned = pinned === n ? null : n;
      hl = n === null || pin ? pinned : n;
      if (reduced) draw(Infinity);
      return hl;
    },
    stop() { stopped = true; if (raf) cancelAnimationFrame(raf); raf = 0; io?.disconnect(); document.removeEventListener('visibilitychange', onVis); },
  };
  if (reduced) draw(Infinity);
  else { io?.observe(canvas); document.addEventListener('visibilitychange', onVis); raf = requestAnimationFrame(frame); }
  return api;
}

// A smooth curve through the points (quadratic through the midpoints), as a polyline with its
// running length, so it can be drawn up to any fraction.
function flatten(pts) {
  const out = [pts[0]];
  if (pts.length > 1) {
    let [px, py] = pts[0];
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i], [nx, ny] = pts[i + 1], ex = (x + nx) / 2, ey = (y + ny) / 2;
      for (let k = 1; k <= 12; k++) { const t = k / 12, a = (1 - t) ** 2, b = 2 * (1 - t) * t, c = t * t; out.push([a * px + b * x + c * ex, a * py + b * y + c * ey]); }
      [px, py] = [ex, ey];
    }
    out.push(pts[pts.length - 1]);
  }
  const len = [0];
  for (let i = 1; i < out.length; i++) len.push(len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { pts: out, len, total: len[len.length - 1] };
}

// A thick glowing arrow along the polyline, drawn up to `frac` of its length (head at the tip);
// its dashes flow forward with time `t` once drawn.
function arrow(g, line, S, frac = 1, t = 0, glow = false) {
  const { pts, len, total } = line;
  if (pts.length < 2 || frac <= 0) return;
  const L = total * frac, cut = [];
  for (let i = 0; i < pts.length; i++) {
    if (len[i] <= L) { cut.push(pts[i]); continue; }
    const k = (L - len[i - 1]) / (len[i] - len[i - 1] || 1);
    cut.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]);
    break;
  }
  if (cut.length < 2) return;
  const path = () => { g.beginPath(); g.moveTo(...cut[0]); for (let i = 1; i < cut.length; i++) g.lineTo(...cut[i]); };
  const [ax, ay] = cut[Math.max(0, cut.length - 3)], [bx, by] = cut[cut.length - 1], ang = Math.atan2(by - ay, bx - ax);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = (glow ? 9 : 7) * S; path(); g.stroke();
  g.strokeStyle = glow ? '#fff1b8' : '#ffd257'; g.shadowColor = '#ffb020'; g.shadowBlur = (glow ? 20 : 12) * S; g.lineWidth = (glow ? 4.2 : 3.2) * S;
  g.setLineDash([9 * S, 4 * S]); g.lineDashOffset = -t * 26 * S; path(); g.stroke();
  g.setLineDash([]); g.fillStyle = glow ? '#fff1b8' : '#ffd257';
  const hs = frac < 1 ? 7 : 10;
  g.beginPath(); g.moveTo(bx + Math.cos(ang) * 4 * S, by + Math.sin(ang) * 4 * S);
  g.lineTo(bx + Math.cos(ang + 2.5) * hs * S, by + Math.sin(ang + 2.5) * hs * S);
  g.lineTo(bx + Math.cos(ang - 2.5) * hs * S, by + Math.sin(ang - 2.5) * hs * S); g.closePath(); g.fill();
  if (frac < 1) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,230,150,.8)'; g.beginPath(); g.arc(bx, by, 5 * S, 0, 7); g.fill(); }
  g.restore();
}

function ring(g, x, y, r, c, S, dash = null) {
  g.save(); if (dash) g.setLineDash(dash);
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 4 * S; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  g.strokeStyle = c; g.lineWidth = 1.6 * S; g.shadowColor = c; g.shadowBlur = 8 * S; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  g.restore();
}

function label(g, x, y, text, c, S, align = 'center') {
  g.save();
  g.font = `600 ${7 * S}px "Chakra Petch", "IBM Plex Sans", sans-serif`;
  const w = g.measureText(text).width + 8 * S, h = 11 * S, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  g.fillStyle = 'rgba(6,8,20,.82)'; g.strokeStyle = c; g.lineWidth = S;
  g.beginPath(); g.roundRect(x0, y - h / 2, w, h, 3 * S); g.fill(); g.stroke();
  g.fillStyle = c; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(text, x0 + 4 * S, y + .5 * S);
  g.restore();
}

function badge(g, x, y, n, S, glow = false) {
  if (S <= 0.05) return;
  g.save();
  g.fillStyle = glow ? '#fff1b8' : '#ffd257'; g.shadowColor = '#ffd257'; g.shadowBlur = (glow ? 18 : 10) * S;
  g.beginPath(); g.arc(x, y, 6.5 * S, 0, 7); g.fill();
  g.shadowBlur = 0; g.fillStyle = '#1a1206'; g.font = `700 ${8 * S}px "Chakra Petch", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), x, y + .5 * S);
  g.restore();
}

