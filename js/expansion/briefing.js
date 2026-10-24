// The expansion's briefing screen (game.html #sBrief): chapter header and story, the villain's
// transmission (villain.js), an annotated overview of the mission map, the suggested strategy
// and the objective. Mission JSON fields: briefing, chapter, transmission, strategy (steps) and
// plan (map annotations: { n, path: [[x, y], ...] } arrows and { n, at: [x, y], note } markers,
// in map cells; n is the strategy step they belong to).
import { cellOrigin } from '../maps.js';
import { VILLAIN, villainPortrait } from './villain.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STRUCTURE = 52, CORTEX = 56, FORTRESSES = [53, 54, 55, 57];

export function briefingHtml(mission, { goal, no = null, total = null }) {
  const story = (mission.briefing || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const steps = mission.strategy || [];
  const chips = [mission.turnLimit ? `Turn limit ${mission.turnLimit}` : 'No turn limit', mission.cap ? `Deploy up to ${mission.cap}` : null,
    (mission.arrivals || []).length ? `${mission.arrivals.length} reinforcement wave${mission.arrivals.length > 1 ? 's' : ''}` : null].filter(Boolean);
  return `<div class="brief">
  <header class="bHead">
    <div class="bNo">${no !== null ? String(no + 1).padStart(2, '0') : ''}</div>
    <div class="bChap">${esc(mission.chapter || 'Expansion · Galt remnant')}${total ? ` · mission ${no + 1} of ${total}` : ''}</div>
    <h1>${esc(mission.title || mission.name)}</h1>
    <div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
  </header>
  <div class="bTop">
    <article class="bStory">${story.map((p, i) => `<p style="--d:${i}">${esc(p)}</p>`).join('')}</article>
    ${mission.transmission ? `<aside class="bTx">
      <div class="txHead"><span class="rec"></span>Incoming transmission · Union Security Directorate</div>
      <div class="txFace">${villainPortrait()}<div class="txScan"></div></div>
      <div class="txWho"><b>${esc(VILLAIN.name)}</b><span>${esc(VILLAIN.rank)}</span></div>
      <blockquote>${esc(mission.transmission)}</blockquote>
    </aside>` : ''}
  </div>
  <section class="bMap"><h2>Theatre map</h2>
    <div class="mapWrap"><canvas id="briefMap"></canvas></div>
    <div class="legend"><span><i class="lg own"></i>Your forces</span><span><i class="lg foe"></i>Union</span><span><i class="lg grey"></i>Grey dock (capture)</span><span><i class="lg tgt"></i>Objective</span><span><i class="lg arr"></i>Plan, numbered as below</span><span><i class="lg rein"></i>Reinforcements (turn)</span></div>
  </section>
  <div class="bBottom">
    ${steps.length ? `<section class="bPlan"><h2>Suggested strategy</h2><ol>${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></section>` : ''}
    <section class="bObj"><h2>Objective</h2><p>${esc(goal)}</p>
      <div class="row"><button class="btn primary big" id="bBriefGo">Launch mission</button><button class="btn" id="bBriefBack">Back</button></div></section>
  </div>
</div>`;
}

// Draws the map overview: the terrain (already rendered by maps.renderMap, painted on `terrain`),
// every unit's map icon (`icon(u)` returns a canvas), and the annotations on top.
export function drawOverview(canvas, { terrain, mission, types, icon, scale = 2 }) {
  const W = terrain.width, H = terrain.height, S = scale;
  canvas.width = W * S; canvas.height = H * S;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(terrain, 0, 0, W * S, H * S);
  g.fillStyle = 'rgba(4,6,16,.28)'; g.fillRect(0, 0, W * S, H * S);
  const org = (x, y) => { const [X, Y] = cellOrigin(x, y); return [(X - 16) * S, (Y - 16) * S]; };
  const ctr = (x, y) => { const [X, Y] = org(x, y); return [X + 12 * S, Y + 8 * S]; };

  // objective edge: where the general must escape, or where the marked units must not get to
  const o = mission.objective || {};
  if (o.edge) {
    const good = o.kind === 'escape', c = good ? '80,255,170' : '255,70,90';
    const grd = o.edge === 'east' ? g.createLinearGradient(W * S - 60 * S, 0, W * S, 0) : g.createLinearGradient(60 * S, 0, 0, 0);
    grd.addColorStop(0, `rgba(${c},0)`); grd.addColorStop(1, `rgba(${c},.55)`);
    g.fillStyle = grd;
    if (o.edge === 'east') g.fillRect(W * S - 60 * S, 0, 60 * S, H * S); else g.fillRect(0, 0, 60 * S, H * S);
    label(g, o.edge === 'east' ? W * S - 8 * S : 8 * S, 14 * S, good ? 'EXIT ▶' : 'MUST NOT REACH', `rgb(${c})`, S, o.edge === 'east' ? 'right' : 'left');
  }

  // units: icons, with rings on the objective targets, the general and grey docks
  const target = (u) => u.army === 1 && (o.kind === 'command' ? u.type === CORTEX : o.kind === 'fortress' ? FORTRESSES.includes(u.type)
    : o.kind === 'flagship' ? u.type === o.type : o.kind === 'destroyType' ? (types[u.type].empty ?? u.type) === (types[o.type].empty ?? o.type) : false);
  for (const u of mission.units) {
    const [X, Y] = org(u.x, u.y), army = u.neutral ? 2 : u.army;
    g.drawImage(icon({ type: u.type, army }), X, Y, 24 * S, 16 * S);
  }
  for (const u of mission.units) {
    const [cx, cy] = ctr(u.x, u.y);
    if (target(u)) { ring(g, cx, cy, 15 * S, '#ff3d5a', S); label(g, cx, cy - 17 * S, 'TARGET', '#ff3d5a', S); }
    else if (u.neutral) ring(g, cx, cy, 13 * S, '#c8cbd6', S, [3 * S, 3 * S]);
    if (mission.general && u.x === mission.general.x && u.y === mission.general.y) { ring(g, cx, cy, 14 * S, '#ffd257', S); label(g, cx, cy + 22 * S, '★ GENERAL', '#ffd257', S); }
  }

  // reinforcements: where each wave comes in, and on which turn (event turn + 1)
  for (const a of mission.arrivals || []) {
    const pts = a.units.map((u) => ctr(u.x, u.y)), mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const r = Math.max(18 * S, ...pts.map(([x, y]) => Math.hypot(x - mx, y - my) + 12 * S));
    const c = a.army === 0 ? '#5cf2ff' : '#ff7a45';
    g.save(); g.setLineDash([6 * S, 4 * S]); ring(g, mx, my, r, c, S); g.restore();
    for (const u of a.units) { const [X, Y] = org(u.x, u.y); g.globalAlpha = .75; g.drawImage(icon({ type: u.type, army: a.army }), X, Y, 24 * S, 16 * S); g.globalAlpha = 1; }
    label(g, Math.min(Math.max(mx, 60 * S), W * S - 60 * S), Math.max(my - r - 6 * S, 12 * S), `${a.army === 0 ? 'ALLIES' : 'UNION'} · TURN ${a.turn + 1}`, c, S);
  }

  // the plan: numbered arrows and markers
  for (const p of mission.plan || []) {
    if (p.path) {
      const pts = p.path.map(([x, y]) => ctr(x, y));
      arrow(g, pts, S);
      const [x0, y0] = pts[0]; badge(g, x0, y0, p.n, S);
    } else if (p.at) {
      const [cx, cy] = ctr(...p.at);
      g.fillStyle = 'rgba(255,210,87,.18)'; g.beginPath(); g.arc(cx, cy, 14 * S, 0, 7); g.fill();
      ring(g, cx, cy, 14 * S, '#ffd257', S, [2 * S, 3 * S]);
      badge(g, cx, cy, p.n, S);
      if (p.note) label(g, Math.min(Math.max(cx, 70 * S), W * S - 70 * S), cy + (cy > H * S - 30 * S ? -22 : 24) * S, p.note, '#ffe7a3', S);
    }
  }
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

function badge(g, x, y, n, S) {
  g.save();
  g.fillStyle = '#ffd257'; g.shadowColor = '#ffd257'; g.shadowBlur = 10 * S;
  g.beginPath(); g.arc(x, y, 6.5 * S, 0, 7); g.fill();
  g.shadowBlur = 0; g.fillStyle = '#1a1206'; g.font = `700 ${8 * S}px "Chakra Petch", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), x, y + .5 * S);
  g.restore();
}

// A thick glowing arrow through the points (a smooth curve through the midpoints).
function arrow(g, pts, S) {
  if (pts.length < 2) return;
  const path = () => {
    g.beginPath(); g.moveTo(...pts[0]);
    for (let i = 1; i < pts.length - 1; i++) { const [x, y] = pts[i], [nx, ny] = pts[i + 1]; g.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2); }
    g.lineTo(...pts[pts.length - 1]);
  };
  const [ax, ay] = pts[pts.length - 2], [bx, by] = pts[pts.length - 1], ang = Math.atan2(by - ay, bx - ax);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 7 * S; path(); g.stroke();
  g.strokeStyle = '#ffd257'; g.shadowColor = '#ffb020'; g.shadowBlur = 12 * S; g.lineWidth = 3.2 * S; g.setLineDash([9 * S, 4 * S]); path(); g.stroke();
  g.setLineDash([]); g.fillStyle = '#ffd257';
  g.beginPath(); g.moveTo(bx + Math.cos(ang) * 4 * S, by + Math.sin(ang) * 4 * S);
  g.lineTo(bx + Math.cos(ang + 2.5) * 10 * S, by + Math.sin(ang + 2.5) * 10 * S);
  g.lineTo(bx + Math.cos(ang - 2.5) * 10 * S, by + Math.sin(ang - 2.5) * 10 * S); g.closePath(); g.fill();
  g.restore();
}
