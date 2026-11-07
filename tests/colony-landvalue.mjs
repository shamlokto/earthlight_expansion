// Version 8 (docs/COLONY-V8.md): land value (js/colony/landvalue.js), the SimCity read of the city. Values move the
// right way: parks, services, transit, water and happiness raise them; workshop noise, industry, exposed hull and an
// unsealed breach lower them; sealed chambers have none. The grid and a tile's reasons agree; the cache refreshes;
// a Grand Hotel waits on land value and Habitats grow sooner on it (version 9; the quads' gates are gone); the overlay and the help.
//   node tests/colony-landvalue.mjs
import { newGame } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { landValueGrid, landValueParts, landValue, valueOf, LV } from '../js/colony/landvalue.js';
import { BUILDING } from '../js/colony/data/buildings.js';
import { T } from '../js/colony/data/terrain.js';
import { helpHtml } from '../js/colony/ui.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };

const s = newGame({ seed: 1 });
s.pending.length = 0; s.options.raids = false; s.happy = 50; s.stock.credits = 1e6; s.stock.parts = 1e5;
const m = s.map, { w } = m;
const land = s.chambers.find((c) => c.status === 'open' && !c.deck);
const cmd = s.buildings.find((b) => b.key === 'command');
let nextId = 1e6;
const push = (key, x, y, extra = {}) => { const b = { id: nextId++, key, x, y, level: 1, mode: null, build: 0, off: false, ...extra }; s.buildings.push(b); return b; };
const drop = (b) => { s.buildings.splice(s.buildings.indexOf(b), 1); };
const at = (x, y) => landValueGrid(s)[y * w + x];
// A free 1-tile spot in the landing chamber, far from what stands there: the probe tile, and room for a 2×2 beside it.
const occ = R.occupancy(s);
const free = (x, y, n = 1) => { for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) { const i = (y + dy) * w + x + dx; if (occ[i] || m.ch[i] !== land.id || ![T.PLAIN, T.FERTILE, T.POOR, T.DECK].includes(m.t[i])) return false; } return true; };
let probe = null;
for (let y = 1; y < m.h - 8 && !probe; y++) for (let x = 1; x < w - 8 && !probe; x++) if (free(x, y) && free(x + 2, y, 2) && free(x + 5, y, 2)) probe = { x, y };

// ---------------------------------------------------------------- open and sealed
{
  const g = landValueGrid(s);
  const sealed = s.chambers.find((c) => c.status === 'sealed' && !c.deck);
  const si = [...Array(w * m.h).keys()].find((i) => m.ch[i] === sealed.id);
  check(g.length === w * m.h && g[si] === -1, 'a sealed chamber has no land value (-1)');
  const li = [...Array(w * m.h).keys()].filter((i) => m.ch[i] === land.id);
  check(li.every((i) => g[i] >= 0 && g[i] <= 100), 'every tile of the open landing chamber has a value 0–100');
  check(landValueParts(s, 'main', si % w, (si / w) | 0).open === false, 'a sealed tile explains that it has none');
  check(probe && at(probe.x, probe.y) >= 0, `a quiet probe tile in the landing chamber (${probe?.x}, ${probe?.y}: ${probe && at(probe.x, probe.y).toFixed(1)})`);
}

// ---------------------------------------------------------------- what raises it
{
  const { x, y } = probe, v0 = at(x, y);
  const park = push('park', x + 2, y);
  const v1 = at(x, y);
  check(v1 > v0, `a park beside it raises it (${v0.toFixed(1)} → ${v1.toFixed(1)})`);
  check(landValueParts(s, 'main', x, y).parts.some((p) => p.label === 'Parks in reach' && p.value > 0), 'the reasons name the park');
  drop(park);
  const clinic = push('clinic', x + 2, y);
  const v2 = at(x, y);
  check(v2 > v0 && landValueParts(s, 'main', x, y).parts.some((p) => /Clinic/.test(p.label)), `a Clinic in reach raises it and is named (${v2.toFixed(1)})`);
  const transit = push('transit', x + 5, y);
  check(at(x, y) > v2, 'transit in reach raises it more');
  drop(transit); drop(clinic);
  s.happy = 90;
  const v3 = at(x, y);
  check(Math.abs(v3 - v0 - 40 * LV.happy) < 0.01, `happiness 90 raises it by ${40 * LV.happy} (${v0.toFixed(1)} → ${v3.toFixed(1)})`);
  s.happy = 10;
  check(at(x, y) < v0, 'happiness 10 lowers it');
  s.happy = 50;
  // water: a tile beside the river has the view, one far off has not
  const g = landValueGrid(s);
  let bank = null;
  for (let i = 0; i < w * m.h && !bank; i++) if (g[i] >= 0 && m.t[i] !== T.RIVER && [i - 1, i + 1, i - w, i + w].some((j) => m.t[j] === T.RIVER)) bank = { x: i % w, y: (i / w) | 0 };
  const bp = bank && landValueParts(s, 'main', bank.x, bank.y);
  check(bp?.parts.some((p) => p.label === 'A view of the water' && Math.abs(p.value - LV.waterRange * LV.water) < 0.01), `a river bank has the full water view (+${LV.waterRange * LV.water})`);
  check(!landValueParts(s, 'main', x, y).parts.some((p) => p.label === 'A view of the water') || at(x, y) < at(bank.x, bank.y) + 99, 'far tiles have less of a view');
}

// ---------------------------------------------------------------- what lowers it
{
  const { x, y } = probe, v0 = at(x, y);
  const ws = push('workshopquad', x + 2, y, { level: 2 });   // Workshops: noise 2
  const v1 = at(x, y);
  check(v1 < v0 && landValueParts(s, 'main', x, y).parts.some((p) => p.label === 'Workshop noise' && p.value < 0), `a Workshop Quad next door lowers it and is named (${v0.toFixed(1)} → ${v1.toFixed(1)})`);
  ws.level = 6;   // a Factory: noise 6
  check(at(x, y) < v1, 'a Factory is louder than Workshops');
  ws.level = 1;
  check(Math.abs(at(x, y) - v0) < 0.01, 'an empty industrial lot makes no noise');
  drop(ws);
  const sm = push('smelter', x + 2, y);
  check(at(x, y) < v0 && landValueParts(s, 'main', x, y).parts.some((p) => p.label === 'Industry next door'), 'a Smelter next door lowers it');
  drop(sm);
  // exposed hull: the landing chamber's tiles nearest the outer wall
  const g = landValueGrid(s);
  let edge = null;
  for (let i = 0; i < w * m.h && !edge; i++) {
    if (g[i] < 0) continue;
    const p = landValueParts(s, 'main', i % w, (i / w) | 0);
    if (p.parts.some((q) => /Exposed hull/.test(q.label) && q.value <= -LV.hull * LV.hullRange)) edge = i;
  }
  check(edge != null, 'tiles beside exposed hull (facing space or Earth) lose value');
  // an unsealed breach in the chamber
  const wall = [...Array(w * m.h).keys()].find((i) => m.t[i] === T.HULL);
  land.breaches.push(wall);
  check(Math.abs(at(x, y) - (v0 - LV.breach)) < 0.01, `an unsealed breach costs the chamber ${LV.breach}`);
  land.breaches.pop();
}

// ---------------------------------------------------------------- the grid and the reasons agree
{
  const g = landValueGrid(s);
  push('park', probe.x + 2, probe.y); push('workshopquad', probe.x + 5, probe.y, { level: 3 });
  const g2 = landValueGrid(s);
  let worst = 0, n = 0;
  for (let i = 0; i < w * m.h; i += 37) {
    const p = landValueParts(s, 'main', i % w, (i / w) | 0);
    worst = Math.max(worst, Math.abs((g2[i] < 0 ? -1 : g2[i]) - p.value)); n++;
  }
  check(worst < 0.2, `grid and reasons agree on ${n} tiles (worst ${worst.toFixed(3)})`);
  check(g.some((v, i) => v !== g2[i]), 'new buildings change the grid');
  s.buildings.length -= 2;
}

// ---------------------------------------------------------------- the cache
{
  const a = landValue(s), b = landValue(s);
  check(a === b, 'landValue caches the grid');
  const p = push('park', probe.x + 2, probe.y);
  const c = landValue(s);
  check(c !== a && c[probe.y * w + probe.x] > a[probe.y * w + probe.x], 'placing a building refreshes it');
  s.happy = 80;
  check(landValue(s) === c, 'a change of happiness waits for the refresh');
  s.day += LV.refreshDays;
  check(landValue(s) !== c, `it refreshes every ${LV.refreshDays} days`);
  s.happy = 50; drop(p);
}

// ---------------------------------------------------------------- growth (version 9: the quads' land-value gates dropped; reinstated quads still have none)
{
  const h = push('hotel', probe.x + 2, probe.y, { level: 2 });
  const need = R.habitatNeeds(s, h, R.parkField(s)).find((n) => n.need.startsWith('value:'));
  check(need && need.need === 'value:55' && need.grow === true, 'a Hotel needs land value 55 to grow into a Grand Hotel (only gates growth)');
  check(need && need.met === (valueOf(s, h) >= 55) && /^Land value \d+ \(now \d+\)$/.test(need.label), `…and says so: "${need?.label}"`);
  h.level = 1;
  check(!R.habitatNeeds(s, h, R.parkField(s)).some((n) => n.need.startsWith('value:')), 'a Guest House does not');
  drop(h);
  const lq = push('livingquad', probe.x + 2, probe.y, { level: 4 });
  check(!R.habitatNeeds(s, lq, R.parkField(s)).some((n) => n.need.startsWith('value:')) && !Object.keys(R.QUAD_VALUE).length, 'a quad no longer waits on land value (the gates stay dropped since the quads were reinstated)');
  drop(lq);
  check(R.habitatLevelReachable({ needs: ['value:40'] }), "'value:N' is a known need word");
  // Habitats and Tower Blocks on land worth 60 or more grow a day sooner (sim.js step 8)
  const low = push('habitat', probe.x + 2, probe.y);
  const loud = push('workshopquad', probe.x + 4, probe.y, { level: 6 });
  s.happy = 20; s.day += LV.refreshDays;
  const v0 = valueOf(s, low);
  check(v0 < R.VALUE_GROW.at, `beside a Factory, unhappy: value ${Math.round(v0)}, no faster growth`);
  drop(loud);
  for (const k of ['park', 'clinic', 'school', 'canteen', 'transit']) push(k, probe.x + 2 + ({ park: 0, clinic: 2, school: 4, canteen: 6, transit: 8 }[k]), probe.y + 3);
  s.happy = 90; s.day += LV.refreshDays;
  check(valueOf(s, low) > v0 + 20, `with parks, services and transit, happy: value ${Math.round(valueOf(s, low))}`);
  check(R.VALUE_GROW.at === 60 && R.VALUE_GROW.days === 1 && R.VALUE_GROW.keys.has('habitat'), 'at 60 or more a Habitat grows a day sooner');
}

// ---------------------------------------------------------------- overlay, help
{
  const ov = R.coverage(s, 'value', 'main'), g = landValue(s);
  check(ov.length === w * m.h && ov.every((v, i) => (g[i] < 0 ? v === 0 : v > 0 && v <= 1)), "coverage 'value': value / 100 on open tiles, 0 elsewhere");
  check(R.coverage(s, 'value', 'upper').length === w * m.h, 'the upper deck has its own');
  const t0 = Date.now(); for (let k = 0; k < 5; k++) landValueGrid(s); const ms = (Date.now() - t0) / 5;
  check(ms < 60, `a whole deck takes ${ms.toFixed(1)} ms`);
  check(/id="help-landvalue"/.test(helpHtml()) && /Land value/.test(helpHtml()), 'How to play has a Land value section');
}

console.log(`colony-landvalue: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
