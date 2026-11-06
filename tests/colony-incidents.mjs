// Version 8 (docs/COLONY-V8.md): incidents you can prepare for. Each is announced days ahead with exactly what
// helps (an 'incidentwarn' event, repeated by the advisor with a Show me), then comes (an 'incident' event):
// a meteor shower, a solar flare, a burst main, a fever, and two good ones, a trade caravan and a comet pass.
// None before day 60 (75 on Easy), rarer on Easy, a Settings switch, their own dice, old saves.
//   node tests/colony-incidents.mjs
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { BUILDING } from '../js/colony/data/buildings.js';
import { T } from '../js/colony/data/terrain.js';
import { advise } from '../js/colony/goals.js';
import { helpHtml, HELP_SECTIONS } from '../js/colony/ui.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };

function colony(seed = 1, difficulty = 'normal') {
  const s = newGame({ seed, difficulty });
  s.stock.credits = 1e5; s.stock.parts = 1e4; s.pending.length = 0; s.options.raids = false;
  return s;
}
const stand = (s, key, x = 0, y = 0, extra = {}) => { const b = { id: s.nextId++, key, x, y, level: 1, mode: BUILDING[key].modes?.[0]?.key ?? null, build: 0, off: false, ...extra }; s.buildings.push(b); return b; };
// Hull tiles in a row (for the meteor shower's targets), and a tile next to them for a pylon.
function hullRow(s, n) {
  const { w, h, t } = s.map, out = [];
  for (let y = 0; y < h && out.length < n; y++) for (let x = 0; x < w && out.length < n; x++) if (t[y * w + x] === T.HULL && !out.some((o) => Math.abs(o.x - x) < 2 && Math.abs(o.y - y) < 2)) out.push({ x, y });
  return out;
}
// Bring the incident `kind` forward: it is sighted today and comes `in` days later (default: tomorrow).
function force(s, kind, inDays = 1) {
  const n = R.ensureIncidents(s), k = R.INCIDENTS[kind];
  n.coming = { kind, day: s.day + inDays };
  if (k.target) n.coming.target = k.target(s);
}
const fed = (s) => { const cap = R.storageCaps(s); for (const g of ['food', 'water', 'air']) s.stock[g] = Math.max(s.stock[g], cap[g] * 0.8); };
const tick = (s, rng) => { s.pending.length = 0; return dayTick(s, rng).events; };
const outcome = (s) => s.pending.find((p) => p.kind === 'incident');

// ---------------------------------------------------------------- data, help, settings
{
  check(R.INCIDENT_KINDS.length === 6 && ['meteor', 'flare', 'burst', 'outbreak', 'caravan', 'comet'].every((k) => R.INCIDENTS[k]), 'six incidents');
  check(R.INCIDENT_KINDS.filter((k) => R.INCIDENTS[k].good).length === 2, 'two of them good news');
  check(R.INCIDENT.first.normal >= 60 && R.INCIDENT.first.easy > R.INCIDENT.first.normal && R.INCIDENT.every.easy[0] > R.INCIDENT.every.normal[1], 'none before day 60; rarer on Easy');
  const help = helpHtml(null, null);
  check(HELP_SECTIONS.some(([id]) => id === 'incidents') && help.includes('id="help-incidents"') && /Shield Pylons/.test(help) && /Flare Shelter/.test(help) && /Settings › Incidents/.test(help), 'How to play: an Incidents section');
  check(BUILDING.flareshelter.tech === 'forecasting' && BUILDING.flareshelter.storage.power === 150, 'the Flare Shelter (Hazard Forecasting) stores power too');
  const s = colony();
  check(R.incidentsOn(s) && s.options.incidents === undefined, 'a new colony: incidents on');
  check(R.setIncidents(s, false).ok && !R.incidentsOn(s) && R.setIncidents(s, true).ok && R.incidentsOn(s), 'Settings › Incidents switches them');
}

// ---------------------------------------------------------------- the schedule: warned first, never before day 60, rarer on Easy
function idle(seed, difficulty, days) {
  const s = colony(seed, difficulty), rng = stateRng(s), warns = [], hits = [];
  // a colony that just lives: stand-ins for power, water, food and a hull array and a dock, so every kind is eligible
  for (const key of ['sunmirror', 'solar', 'dock', 'riverpump', 'waterworks', 'towerblock', 'towerblock']) stand(s, key);
  s.pop = 200;
  let deaths = 0;
  for (let d = 0; d < days; d++) {
    fed(s);
    for (const e of tick(s, rng)) if (e.kind === 'deaths') deaths++;
    const w = s.pending.find((p) => p.kind === 'incidentwarn'), o = outcome(s);
    if (w) warns.push({ day: s.day, kind: w.incident, show: w.show, text: w.text, at: s.incidents.coming.day });
    if (o) hits.push({ day: s.day, kind: o.incident });
  }
  return { s, warns, hits, deaths };
}
{
  const n = idle(1, 'normal', 700), e = idle(1, 'easy', 700);
  console.log(`  normal: ${n.hits.length} incidents in 700 days (${n.hits.map((h) => `${h.kind}@${h.day}`).join(' ')})`);
  console.log(`  easy:   ${e.hits.length} incidents in 700 days (${e.hits.map((h) => `${h.kind}@${h.day}`).join(' ')})`);
  check(n.hits.length >= 6 && n.hits[0].day >= 60 && e.hits[0].day >= 75, `none before day 60 (Normal, first ${n.hits[0]?.day}) or 75 (Easy, first ${e.hits[0]?.day})`);
  check(e.hits.length < n.hits.length, `rarer on Easy (${e.hits.length} vs ${n.hits.length})`);
  check(n.hits.every((h) => { const w = n.warns.find((x) => x.at === h.day && x.kind === h.kind); return w && h.day - w.day >= R.INCIDENT.warn; }), 'every incident was warned at least 5 days ahead');
  check(n.warns.every((w) => w.show && w.text.length > 80), 'every warning has a Show me and says what helps');
  check(new Set(n.hits.map((h) => h.kind)).size >= 4 && n.hits.every((h, i) => i === 0 || h.kind !== n.hits[i - 1].kind), 'a mix, never the same twice running');
  check(n.deaths === 0 && e.deaths === 0, 'a fed colony loses nobody to incidents');
  // Settings off: nothing at all
  const off = colony(1, 'normal'); R.setIncidents(off, false);
  const rng = stateRng(off); let any = 0;
  for (let d = 0; d < 400; d++) { fed(off); tick(off, rng); if (off.pending.some((p) => /incident/.test(p.kind))) any++; }
  check(any === 0 && off.incidents.count === 0, 'incidents off: none in 400 days');
}

// ---------------------------------------------------------------- the warning: what helps, the advisor, switching off
{
  const s = colony(2), rng = stateRng(s);
  for (const p of hullRow(s, 3)) stand(s, 'solar', p.x, p.y);
  s.day = 60; s.incidents.next = s.day + 1 + R.incidentLead(s);   // sighted tomorrow
  s.incidents.last = 'flare'; s.pop = 40;
  // only the meteor shower and the comet are eligible here (no dock, no water plant, under 150 colonists; the flare was last)
  let w = null;
  for (let d = 0; d < 3 && !w; d++) { tick(s, rng); w = s.pending.find((p) => p.kind === 'incidentwarn'); }
  check(!!w && ['meteor', 'comet'].includes(w.incident), `a warning comes (${w?.incident})`);
  if (w?.incident !== 'meteor') { s.pending.length = 0; force(s, 'meteor', 5); }
  const st = R.incidentStatus(s);
  check(st && st.kind === 'meteor' && st.days === s.incidents.coming.day - s.day && !st.ready && /^0 of \d+ hull/.test(st.text), `incidentStatus: ${st?.name} in ${st?.days} days, ${st?.text}`);
  const adv = advise(s).find((a) => /Meteor shower/.test(a.text));
  check(adv && adv.level === 'warn' && adv.show && (adv.show.build === 'shieldpylon' || adv.show.research === 'shields'), `the advisor mentions it with a fix (${adv?.text})`);
  check(/Shield Pylons/.test(R.INCIDENTS.meteor.warn(s, 5)) && /research Shield Pylons first/.test(R.INCIDENTS.meteor.warn(s, 5)), 'the warning names the fix (and its research)');
  s.pending.push({ id: s.nextId++, kind: 'incidentwarn', title: 'x', text: 'x', choices: [] });
  R.setIncidents(s, false);
  check(!s.incidents.coming && !s.pending.some((p) => p.kind === 'incidentwarn') && !R.incidentStatus(s), 'switched off: the one coming is called off, its warning gone');
}

// ---------------------------------------------------------------- each incident: prepared against unprepared
{
  // meteor shower: exposed hull buildings get a few days of damage; a Shield Pylon in range keeps them safe
  const run = (pylon) => {
    const s = colony(3), rng = stateRng(s), spots = hullRow(s, 3);
    spots.map((p) => stand(s, 'solar', p.x, p.y));
    const out = s.buildings.filter((b) => b.key !== 'road' && !BUILDING[b.key].fixed && s.map.t[b.y * s.map.w + b.x] === T.HULL);
    if (pylon) for (const b of out) stand(s, 'shieldpylon', b.x, b.y);   // (stand-ins on the same tiles)
    force(s, 'meteor'); tick(s, rng);
    return { s, hit: out.filter((b) => b.damaged > 0).length, o: outcome(s) };
  };
  const bare = run(false), safe = run(true);
  check(bare.hit === 3 && bare.o?.tone === 'bad' && /Shield Pylons/.test(bare.o.text), `meteor shower, no pylons: ${bare.hit} arrays knocked out, told what would have helped`);
  check(safe.hit === 0 && safe.o?.tone === 'good', 'meteor shower, under Shield Pylons: nothing hit');
  check(bare.s.buildings.filter((b) => b.damaged > 0).every((b) => b.damaged <= 3), 'damage is a few days of repairs, never a lost building');
}
{
  // solar flare: half solar power for a few days, a quarter with a Flare Shelter, happiness only without one
  const run = (shelter) => {
    const s = colony(4), rng = stateRng(s);
    stand(s, 'sunmirror');
    if (shelter) stand(s, 'flareshelter');
    const before = R.powerOf(s).supply;
    force(s, 'flare'); tick(s, rng);
    return { s, rng, before, during: R.powerOf(s).supply, o: outcome(s) };
  };
  const bare = run(false), safe = run(true);
  check(Math.abs(bare.during - bare.before / 2 - 10) < 1e-6 || Math.abs(bare.during - (bare.before - 350 * 0.5)) < 1e-6, `solar flare: the Sun Mirror makes half (${bare.before} → ${bare.during})`);
  check(Math.abs(safe.during - (safe.before - 350 * 0.25)) < 1e-6, `with a Flare Shelter, three quarters (${safe.before} → ${safe.during})`);
  tick(bare.s, bare.rng); tick(safe.s, safe.rng);
  check(bare.s.happyParts.some((p) => p.label === 'Solar flare' && p.value < 0) && !safe.s.happyParts.some((p) => p.label === 'Solar flare'), 'people worry without a shelter, not with one');
  for (let d = 0; d < 4; d++) tick(bare.s, bare.rng);
  check(Math.abs(R.powerOf(bare.s).supply - bare.before) < 1e-6 && !bare.s.incidents.flare, 'after the flare, full power again');
}
{
  // burst main: the biggest water plant is down for days; a Safety Post in range clamps it to one
  const run = (post) => {
    const s = colony(5), rng = stateRng(s), c = s.buildings.find((b) => b.key === 'command');
    const p = R.findSpot(s, 'riverpump', { free: true }) || { x: c.x + 4, y: c.y };
    stand(s, 'waterworks', p.x, p.y);   // the biggest water plant: the one whose main cracks
    if (post) { s.unlocked.push('safetypost'); stand(s, 'safetypost', p.x + 1, p.y + 1); }
    force(s, 'burst', 3);
    const pump = s.buildings.find((b) => b.id === s.incidents.coming.target);
    const warn = R.INCIDENTS.burst.warn(s, 3, s.incidents.coming);
    tick(s, rng); tick(s, rng);
    check(!(pump.damaged > 0), 'nothing happens before the day');
    tick(s, rng);
    return { pump, warn, o: outcome(s) };
  };
  const bare = run(false), safe = run(true);
  check(bare.pump?.key === 'waterworks' && /Water Works/.test(bare.warn) && /Safety Post/.test(bare.warn), 'burst main: the warning names the plant and the fix');
  check(bare.pump.damaged === R.INCIDENT.burst.days.normal && bare.o?.tone === 'bad', `no Safety Post: the Water Works is down for ${bare.pump.damaged} days of repairs`);
  check(safe.pump.damaged === R.INCIDENT.burst.clamped && safe.o?.tone === 'good', 'a Safety Post in range: clamped, a day of repairs');
}
{
  // fever: contained when Clinics cover 80% of homes; otherwise some off work for days and a dip in happiness
  const run = (clinic) => {
    const s = colony(6), rng = stateRng(s), c = s.buildings.find((b) => b.key === 'command');
    s.pop = 200;
    for (const b of s.buildings.filter((x) => x.key === 'habitat')) b.level = 1;
    stand(s, 'towerblock', c.x + 3, c.y);
    if (clinic) stand(s, 'clinic', c.x + 2, c.y + 2, { level: 3 });
    force(s, 'outbreak'); fed(s); tick(s, rng);
    const o = outcome(s), sick = R.sickShare(s);
    fed(s); tick(s, rng);
    return { s, o, sick, staffing: s.stats.last.staffing, fever: s.happyParts.find((p) => p.label === 'Fever')?.value ?? 0 };
  };
  const bare = run(false), safe = run(true);
  check(bare.o?.tone === 'bad' && bare.sick > 0.1 && bare.fever < 0, `fever, no Clinics: ${Math.round(bare.sick * 100)}% off sick, happiness ${bare.fever}`);
  check(safe.o?.tone === 'good' && safe.sick === 0 && safe.fever === 0, 'Clinics covering the homes: contained');
  check(bare.s.pop === 200, 'nobody dies of it');
}
{
  // the good ones: a caravan lifts prices and leaves parts; a comet fills the water stores, up to what they hold
  const s = colony(7), rng = stateRng(s);
  stand(s, 'dock');
  s.stock.parts = 50;
  force(s, 'caravan'); tick(s, rng);
  check(outcome(s)?.tone === 'good' && s.market.ore >= 1.4 && s.market.alloy >= 1.4 && s.stock.parts >= 50 + 30 - 5, 'trade caravan: prices up by half, 30 parts');
  const cap = R.storageCaps(s).water;
  s.stock.water = cap - 100;
  force(s, 'comet'); tick(s, rng);
  check(outcome(s)?.tone === 'good' && s.stock.water <= cap + 1e-6 && /stores were full/.test(outcome(s).text), 'comet pass: only what the stores hold, and it says so');
}

// ---------------------------------------------------------------- old saves, save and load
{
  const s = colony(8);
  force(s, 'flare', 4);
  const back = loadState(saveState(s));
  check(back.incidents.coming?.kind === 'flare' && R.incidentStatus(back)?.days === 4, 'save and load keep the incident on its way');
  const old = JSON.parse(saveState(s)); delete old.incidents; delete old.options.incidents;
  const up = loadState(JSON.stringify(old)), rng = stateRng(up);
  for (let d = 0; d < 5; d++) tick(up, rng);
  check(up.incidents && R.incidentsOn(up) && up.incidents.next >= R.INCIDENT.first.normal, 'an older save: incidents on, scheduled from the rules');
}

console.log(`colony-incidents: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
