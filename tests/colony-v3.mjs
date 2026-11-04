// Colony version 3 ("Guardians", docs/COLONY-V3.md): machine production, crews, upkeep and repairs,
// commanders, departments and wanderers, heat and the raid clock, raid tiers, the preview, fighting
// and tribute, damage, theft, shields, batteries, salvage and fear; fusion, mushroom walls, terrace
// homes; old saves; and the balance targets with scripted players.   node tests/colony-v3.mjs
import { readFileSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { BUILDING, BUILDINGS } from '../js/colony/data/buildings.js';
import { TECH, TECHS } from '../js/colony/data/tech.js';
import { MACHINE, MACHINES, MACHINE_COST } from '../js/colony/data/machines.js';
import { COMMANDER, WANDERERS, GENERAL, STARTERS, DEPARTMENTS } from '../js/colony/data/commanders.js';
// a small seeded generator (mulberry32) for side-by-side comparisons
const stateRngFor = (k) => { let a = (k * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
import { T } from '../js/colony/data/terrain.js';
import { goalStatus } from '../js/colony/goals.js';

let failed = 0, passed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const types = JSON.parse(readFileSync(new URL('../js/expansion/data/units.json', import.meta.url))).units.map((u) => ({ type: u.type, value: u.value, hp: u.hp }));
const refusals = [];
const act = (r) => { if (!r.ok) refusals.push(r.msg); return r; };

// ---------------------------------------------------------------- helpers

function rich(seed = 1, opts = {}) {
  const s = newGame({ seed, ...opts });
  s.stock.credits = 100000; s.stock.parts = 10000; s.pending.length = 0;
  return s;
}
function learn(s, ...keys) {
  for (const k of keys) {
    if (!s.research.done.includes(k)) s.research.done.push(k);
    for (const u of TECH[k].unlocks) if (!s.unlocked.includes(u)) s.unlocked.push(u);
  }
}
const cmdOf = (s) => s.buildings.find((b) => b.key === 'command');
const dockOf = (s) => s.buildings.find((b) => b.key === 'dock');
const landing = (s) => s.chambers.find((c) => c.status === 'open');
const ALL = (s) => ({ x0: 0, y0: 0, x1: s.map.w - 1, y1: s.map.h - 1 });
function put(s, key, { box, score } = {}) {
  const c = cmdOf(s), z = BUILDING[key].zone;
  const p = R.findSpot(s, key, { box: box || (z === 'interior' || z === 'road' ? landing(s) : ALL(s)), score: score || ((x, y) => Math.abs(x - c.x) + Math.abs(y - c.y)), free: true });
  if (!p) return null;
  const r = R.build(s, key, p.x, p.y);
  if (!r.ok) return null;
  const b = R.byId(s, r.id);
  b.build = 0;
  return b;
}
function power(s, n = 4) {
  const d = dockOf(s);
  for (let k = 0; k < n; k++) put(s, 'solar', { box: { x0: d.x - 24, y0: d.y - 24, x1: d.x + 24, y1: d.y + 24 }, score: (x, y) => (s.map.t[y * s.map.w + x] === T.HULL ? 0 : 50) + Math.abs(x - d.x) + Math.abs(y - d.y) });
}
function unlock80(s) { s.flags.unlock80 = true; R.upgradeState(s); }
const tick = (s, rng = stateRng(s)) => dayTick(s, rng);
const happy = (s, label) => s.happyParts.find((p) => p.label === label)?.value;
function walk(v, path, out) {
  if (typeof v === 'number') { if (!Number.isFinite(v)) out.push(path); }
  else if (ArrayBuffer.isView(v)) return out;
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const k in v) walk(v[k], `${path}.${k}`, out);
  return out;
}
// A raid at the gates now (as the sim makes it on arrival).
function raidNow(s, units, { from = 'earth', faction = 'scavengers', tier = 'scavengers' } = {}) {
  const strength = Math.round(units.reduce((t, u) => t + R.raiderPower(u), 0) * R.RAID.strength[s.difficulty === 'easy' ? 'easy' : 'normal']);
  s.raid.coming = { day: s.day, from, tier, units, faction, strength, arrived: true };
  return s.raid.coming;
}

// ---------------------------------------------------------------- data, new game, techs

{
  const s = newGame({ seed: 1 });
  check(BUILDINGS.filter((d) => d.cat === 'defence').length === 8 && ['fusion', 'mushroom', 'terrace', 'lodge', 'quarters'].every((k) => BUILDING[k]), 'data: version 3 buildings');
  check(TECHS.length === 30 && R.techStatus(s).length === 30, 'data: 30 techs');
  check(JSON.stringify(s.commanders.map((c) => c.key)) === '["general","sato"]' && s.commanders.every((c) => c.injured === 0 && c.dept === null), 'new game: the General and Sato serve');
  check(Array.isArray(s.production) && !s.production.length && Array.isArray(s.wanderers) && s.raid.heat === 0 && s.raid.next === null && s.raid.coming === null && s.raid.count === 0, 'new game: production, wanderers, raid clock');
  check(R.techEffect(s, 'machines') === 1, 'techEffect machines: tier 1 with no tech');
  learn(s, 'machineworks'); check(R.techEffect(s, 'machines') === 2, 'Machine Works: tier 2');
  learn(s, 'heavyworks', 'shipyard', 'kai'); check(R.techEffect(s, 'machines') === 4, 'Kai Refits: tier 4');
  const s2 = newGame({ seed: 1 });
  check(['arsenal', 'barracks', 'scrapyard', 'emplacement'].every((k) => !s2.unlocked.includes(k)) && /80 colonists/.test(R.canBuild(s2, 'arsenal', 0, 0)), 'defence buildings at 80 colonists');
  check(R.canBuild(s2, 'shipyard', 0, 0) === 'Research Shipyard.' && R.canBuild(s2, 'lodge', 0, 0) === 'Research Leadership.', 'tech-locked version 3 buildings');
  check(R.buildable(s2).filter((b) => b.cat === 'defence').length === 8, 'buildable: the Defence tab');
  check(!R.raidsPossible(s2) && R.raidPreview(s2) === null, 'no raids before 80 colonists');
}

// ---------------------------------------------------------------- production

{
  const s = rich(2);
  unlock80(s); power(s, 6);
  const list0 = R.machineList(s);
  check(list0.length === MACHINES.length && list0.every((m) => !m.ok && typeof m.why === 'string'), 'machineList: nothing without an Arsenal');
  check(list0.find((m) => m.type === 0).why === 'Build an Arsenal.' && list0.find((m) => m.type === 4).why === 'Research Machine Works.'
    && list0.find((m) => m.type === 30).why === 'Research Heavy Works.' && list0.find((m) => m.type === 78).why === 'Research Kai Refits.'
    && list0.find((m) => m.type === 39).why === 'Build a Shipyard.', 'machineList: lock reasons');
  const ars = put(s, 'arsenal');
  check(!!ars, 'an Arsenal is built');
  const mars = R.machineList(s).find((m) => m.type === 0);
  check(mars.ok && mars.cost.credits === Math.ceil(80 * 0.6) && mars.cost.parts === Math.ceil(8 * 0.6) && mars.days === 2, `Mars: ${mars.cost.credits} credits, ${mars.cost.parts} parts, 2 days (Easy)`);
  const c0 = s.stock.credits, p0 = s.stock.parts, r = act(R.orderMachine(s, 0));
  check(r.ok && s.stock.credits === c0 - mars.cost.credits && s.stock.parts === p0 - mars.cost.parts && s.production.length === 1 && s.production[0].at === ars.id, 'orderMachine pays and queues at the Arsenal');
  const r2 = act(R.orderMachine(s, 10)), brontes = s.production.find((o) => o.type === 10);
  check(r2.ok && brontes.days === 4 && /after 1 order/.test(r2.msg), 'a second order waits behind the first (Brontes: 4 days)');
  const c1 = s.stock.credits;
  check(act(R.cancelOrder(s, r2.id)).ok && s.stock.credits === c1 + Math.ceil(160 * 0.6) && s.production.length === 1, 'cancelOrder: full refund');
  check(!act(R.cancelOrder(s, 9999)).ok && !act(R.orderMachine(s, 999)).ok && !act(R.orderMachine(s, 4)).ok, 'production refusals');
  s.pop = 200;
  tick(s); check(s.guardians.length === 0 && s.production[0].days === 1, 'production advances a day a day at full staff and power');
  tick(s); check(s.guardians.length === 1 && s.guardians[0].type === 0 && s.guardians[0].hp === 8 && s.guardians[0].level === 0 && s.guardians[0].free === 0 && !s.production.length, 'the machine rolls out: level 0, full HP, no free days');
  check(s.log.some((l) => /Mars rolls out/.test(l.text)), 'production: logged');
  // a switched-off Arsenal builds nothing
  R.orderMachine(s, 1); R.toggle(s, ars.id); tick(s);
  check(s.production[0].days === 2, 'an Arsenal switched off does not build');
  R.toggle(s, ars.id);
  // two Arsenals: the least busy takes the order
  const ars2 = put(s, 'arsenal');
  R.orderMachine(s, 3);
  check(s.production.find((o) => o.type === 3).at === ars2.id, 'orders go to the least busy Arsenal');
  R.demolish(s, ars2.id);
  check(s.production.every((o) => o.at === ars.id), 'a demolished Arsenal\'s orders move to another');
  // shipyard machines need the Shipyard, unique machines one at a time
  learn(s, 'machineworks', 'shipyard', 'heavyworks', 'kai');
  check(R.machineList(s).find((m) => m.type === 39).why === 'Build a Shipyard.', 'ships need a finished Shipyard');
  const yard = put(s, 'shipyard');
  check(!!yard && R.machineList(s).find((m) => m.type === 78).ok, 'a Shipyard on the hull builds the Azoras Kai');
  check(act(R.orderMachine(s, 78)).ok && R.machineList(s).find((m) => m.type === 78).why === 'Only one Azoras Kai may serve at a time.', 'unique: one Azoras Kai at a time');
  check(s.production.find((o) => o.type === 78).at === yard.id && s.production.find((o) => o.type === 78).days === 88, 'Azoras Kai: 88 days at the Shipyard');
  const poor = rich(2); unlock80(poor); put(poor, 'arsenal'); poor.stock.credits = 10;
  check(/more credits/.test(R.machineList(poor).find((m) => m.type === 0).why), 'machineList: afford reason');
}

// ---------------------------------------------------------------- crews, upkeep, repairs, sales

{
  const s = rich(3);
  unlock80(s); power(s, 6);
  for (let k = 0; k < 6; k++) R.addGuardian(s, 23);   // Dragons
  check(R.crewCap(s) === 4 && R.crewed(s).size === 4 && R.defenceOf(s).idle === 2, 'crews: the Command Centre crews four');
  const bk = put(s, 'barracks');
  check(R.crewCap(s) === 10 && R.crewed(s).size === 6, 'a Barracks crews six more');
  bk.damaged = 3;
  check(R.crewCap(s) === 4, 'a damaged Barracks crews nobody');
  delete bk.damaged;
  // upkeep: ceil(price / 8) × the difficulty's upkeep; free while free days remain
  check(near(R.machineUpkeep(s), 6 * 1 * 0.5), `upkeep: ceil(8 / 8) × 0.5 each on Easy (${R.machineUpkeep(s)})`);
  s.guardians[0].free = 5;
  check(near(R.machineUpkeep(s), 5 * 0.5), 'no upkeep while free days remain');
  // the Quartermaster halves it
  s.commanders.push({ key: 'w_ilves', loyalty: 65, injured: 0, dept: null });
  R.assignCommander(s, 'w_ilves', s.guardians[1].id);
  check(near(R.guardianUpkeep(s, s.guardians[1]), 0.25), 'Quartermaster: upkeep halved');
  const sim0 = s.stock.credits; s.guardians[0].free = 0;
  tick(s);
  check(s.stats.last.machines > 0 && near(s.stats.last.machines, R.machineUpkeep(s)), 'the sim charges machine upkeep');
  // repairs need a Scrapyard: 2 HP a day, a part per HP
  const g = s.guardians[2]; g.hp = 3;
  tick(s); check(g.hp === 3, 'no repairs without a Scrapyard');
  const yard = put(s, 'scrapyard', { box: landing(s) });
  check(!!yard, 'a Scrapyard is built');
  const parts0 = s.stock.parts; tick(s);
  check(g.hp === 5, `a Scrapyard repairs 2 HP a day (${g.hp})`);
  check(near(parts0 + s.stats.last.produced.parts - s.stats.last.consumed.parts - s.stock.parts, 2, 1e-6) || parts0 - s.stock.parts < BUILDING.command.makes.parts, 'repairs cost a part per HP');
  // Mechanic: half the parts
  s.commanders.push({ key: 'w_oduya', loyalty: 70, injured: 0, dept: null });
  R.assignCommander(s, 'w_oduya', g.id); g.hp = 2;
  s.stock.parts = 1; tick(s);
  check(g.hp === 4 && s.stock.parts < 1e-6 + BUILDING.command.makes.parts, `Mechanic: repairs cost half (${g.hp}, parts ${s.stock.parts})`);
  // sale: 80% of the build cost for colony-built machines, +20% with a Scrapyard
  const d = s.guardians[3], v = R.saleValue(s, d), cost = R.costOf(s, MACHINE_COST(MACHINE[23]));
  check(v.credits === Math.floor(Math.floor(cost.credits * 0.8) * 1.2) && v.parts === Math.floor(Math.floor(cost.parts * 0.8) * 1.2), `sale value: built ×0.8, Scrapyard ×1.2 (${JSON.stringify(v)})`);
  const cr = s.stock.credits, sr = act(R.sellGuardian(s, d.id));
  check(sr.ok && s.stock.credits === cr + v.credits && !s.guardians.includes(d), 'sellGuardian pays the sale value');
}

// ---------------------------------------------------------------- commanders: power, the ceiling, departments, invitations

{
  const s = rich(4);
  unlock80(s);
  const plain = R.addGuardian(s, 0);   // Mars
  const p0 = R.guardianPower(s, plain);
  check(near(p0, 90), `power: attack + defence at level 0 (${p0})`);
  plain.level = 5; check(near(R.guardianPower(s, plain), 90 * 1.4), 'power: +8% a level');
  plain.level = 0; plain.hp = 4; check(near(R.guardianPower(s, plain), 45), 'power: scales with HP');
  plain.hp = 8;
  check(act(R.assignCommander(s, 'general', plain.id)).ok && near(R.guardianPower(s, plain) / p0, 3), 'the General: ×3');
  // no commander but the General ever exceeds ×1.6, in any machine
  let worst = 0, worstWho = '';
  for (const c of [...STARTERS, ...WANDERERS]) {
    s.commanders = [{ key: 'general', loyalty: 100, injured: 0, dept: null }, { key: c.key, loyalty: 60, injured: 0, dept: null }];
    for (const m of MACHINES) {
      const g = { id: -1, type: m.type, level: 0, hp: m.hp, commander: c.key };
      const ratio = (m.attack + m.defence) ? R.guardianPower(s, g) / (m.attack + m.defence) : 1;
      if (ratio > worst) { worst = ratio; worstWho = `${c.key} in ${m.name}`; }
    }
  }
  check(worst <= 1.6 + 1e-9 && worst > 1.5, `no other commander above ×1.6 (best ${worst.toFixed(3)}: ${worstWho})`);
  // grades and style: Ilves (ships S, missile) in a missile ship vs a beam ship
  s.commanders = [{ key: 'general', loyalty: 100, injured: 0, dept: null }, { key: 'w_ilves', loyalty: 60, injured: 0, dept: null }];
  const m1 = R.leadMult(s, 'w_ilves', MACHINE[41]), m2 = R.leadMult(s, 'w_ilves', MACHINE[39]);   // Palmyra missile, Hannibal beam
  check(near(m2, 1 + 0.6 * 0.6) && near(m1, Math.min(1.6, (1 + 0.6 * 0.6) * 1.15)), `grade × might, style +15% (${m1.toFixed(3)}, ${m2.toFixed(3)})`);
  check(R.leadMult(s, 'w_ilves', MACHINE[0]) === 1 && R.styleFits('melee', 0) && R.styleFits('gunner', 1) && !R.styleFits('beam', 0), 'grade C ×1; styles by range and mode');
  // injured commanders give nothing and cannot be assigned
  s.commanders[1].injured = 5;
  check(R.leadMult(s, 'w_ilves', MACHINE[41]) === 1 && /recovering/.test(act(R.assignCommander(s, 'w_ilves', plain.id)).msg), 'injured: no bonus, no new assignment');
  // one commander per machine, one machine per commander
  const s2 = rich(4); unlock80(s2);
  const a = R.addGuardian(s2, 0), b = R.addGuardian(s2, 1);
  R.assignCommander(s2, 'general', a.id); R.assignCommander(s2, 'sato', a.id);
  check(a.commander === 'sato' && b.commander === null, 'assigning a led machine: the other commander stands down');
  R.assignCommander(s2, 'sato', b.id);
  check(a.commander === null && b.commander === 'sato', 'a commander leads one machine');
  check(act(R.assignCommander(s2, 'sato', null)).ok && b.commander === null, 'assign null: stands down');
  check(!act(R.assignCommander(s2, 'w_hale', a.id)).ok && !act(R.assignCommander(s2, 'general', 999)).ok, 'assign refusals');
  // departments: one head each, + stat / 10 %
  check(act(R.setDepartment(s2, 'sato', 'security')).ok && near(R.deptMult(s2, 'security'), 1 + 74 / 1000), 'Security head: + might / 10 %');
  check(act(R.setDepartment(s2, 'general', 'security')).ok && s2.commanders.find((c) => c.key === 'sato').dept === null && near(R.deptMult(s2, 'security'), 1.1), 'one head per department');
  check(!act(R.setDepartment(s2, 'sato', 'nope')).ok && act(R.setDepartment(s2, 'general', null)).ok && R.deptMult(s2, 'security') === 1, 'department refusals and stepping down');
  // department effects in the sim: Agriculture +wits/10 % on farms; Welfare + charm / 20 happiness; Trade on sales
  const f1 = rich(5), f2 = rich(5);
  R.setDepartment(f2, 'sato', 'agriculture');
  tick(f1); tick(f2);
  check(near(f2.stats.last.produced.food - BUILDING.command.makes.food, (f1.stats.last.produced.food - BUILDING.command.makes.food) * 1.078, 1e-6), 'Agriculture head: farms +7.8%');
  R.setDepartment(f2, 'sato', 'welfare'); tick(f2);
  check(happy(f2, 'Welfare') === Math.round(66 / 20), 'Welfare head: + charm / 20 happiness');
  R.setDepartment(f2, 'sato', 'trade'); f1.stock.food = f2.stock.food = 200;
  const g1 = R.sell(f1, 'food', 50).credits, g2 = R.sell(f2, 'food', 50).credits;
  check(g2 === Math.floor(g2) && g2 > g1 && g2 <= Math.ceil(g1 * 1.066) + 1, `Trade head: better prices (${g1} -> ${g2})`);
  // commanderCap: 2 + 2 per Officers' Quarters
  const q = rich(6); unlock80(q); learn(q, 'safety', 'leadership');
  check(R.commanderCap(q) === 2, 'commanderCap: 2');
  put(q, 'quarters');
  check(R.commanderCap(q) === 4, 'commanderCap: +2 per Quarters');
  // invitations: the formula, the gift, refusals make the next try likelier, the cap
  q.wanderers.push({ key: 'w_hale', until: q.day + 20, asked: 0, loyalty: 50 });
  const p = R.inviteChance(q, 'w_hale');
  check(near(p, 0.3 + 80 / 220 + 50 / 400), `invite chance (${p.toFixed(3)})`);
  const cr = q.stock.credits;
  let r, k = 0;
  do { r = act(R.inviteWanderer(q, 'w_hale', () => (k++ < 2 ? 0.99 : 0))); } while (r.ok && r.joined === false);
  check(k === 3 && q.stock.credits === cr - 300 && q.commanders.some((c) => c.key === 'w_hale' && c.loyalty === 50) && !q.wanderers.length, 'refused twice (100 credits each), then joins');
  check(near(R.inviteChance({ ...q, wanderers: [{ key: 'w_x', loyalty: 34 }], commanders: q.commanders }, 'w_x'), Math.min(0.95, 0.3 + 80 / 220 - 0.03 + 66 / 400)), 'refusals lower loyalty by 8; crowding −0.03 a commander');
  q.wanderers.push({ key: 'w_kestrel', until: q.day + 20, asked: 0, loyalty: 55 }, { key: 'w_brann', until: q.day + 20, asked: 0, loyalty: 60 });
  R.inviteWanderer(q, 'w_kestrel', () => 0);
  check(q.commanders.length === 4 && /room for 4/.test(act(R.inviteWanderer(q, 'w_brann', () => 0)).msg), 'the commander cap holds');
  check(!act(R.inviteWanderer(q, 'w_maris')).ok, 'only wanderers at the Lodge can be invited');
  // dismissal: they leave and come back as wanderers later; the General stays
  check(!act(R.dismissCommander(q, 'general')).ok, 'the General cannot be dismissed');
  R.assignCommander(q, 'w_kestrel', R.addGuardian(q, 8).id);
  check(act(R.dismissCommander(q, 'w_kestrel')).ok && !q.commanders.some((c) => c.key === 'w_kestrel') && q.guardians.every((g) => g.commander !== 'w_kestrel') && q.flags.away.w_kestrel === q.day + 30, 'dismissal: unassigned, away 30 days');
}

// ---------------------------------------------------------------- commanders in the sim: wages, loyalty, leaving, injuries

{
  const s = rich(7); unlock80(s);
  s.commanders.push({ key: 'w_thorne', loyalty: 21, injured: 3, dept: null });
  const c0 = s.stock.credits;
  tick(s);
  check(s.stats.last.wages === 6 + 8, `wages paid daily (${s.stats.last.wages})`);
  const th = s.commanders.find((c) => c.key === 'w_thorne');
  check(th.injured === 2, 'injuries heal a day a day');
  // unpaid: loyalty −2 a day (Thorne twice as fast when falling)
  s.stock.credits = 0; s.happy = 0;
  const l0 = th.loyalty; tick(s);
  check(s.flags.wagesUnpaid && th.loyalty < l0, `unpaid wages: loyalty falls (${l0} -> ${th.loyalty})`);
  // below 20 they may leave; Steady never does
  let left = false;
  for (let d = 0; d < 80 && !left; d++) { s.stock.credits = 0; tick(s); left = !s.commanders.some((c) => c.key === 'w_thorne'); }
  check(left && s.pending.some((p) => p.kind === 'commander') && s.flags.away.w_thorne > s.day && s.commanders.some((c) => c.key === 'sato'), 'a disloyal commander leaves; Sato (Steady) stays');
  // loyalty drifts toward 40 + happiness / 2
  const t = rich(7); unlock80(t);
  t.commanders.push({ key: 'w_hale', loyalty: 25, injured: 0, dept: null });
  for (let d = 0; d < 5; d++) tick(t);
  check(t.commanders.find((c) => c.key === 'w_hale').loyalty === 30, 'loyalty drifts a point a day toward its target');
  // wages wait for the 80-colonist milestone
  const u = rich(7); tick(u);
  check(u.stats.last.wages === 0, 'no wages before 80 colonists');
}

// ---------------------------------------------------------------- wanderers at the Lodge

{
  const s = rich(8); unlock80(s); learn(s, 'safety', 'leadership'); power(s, 4);
  const lodge = put(s, 'lodge');
  put(s, 'quarters');
  s.pop = 120;
  tick(s);
  check(s.wanderers.length === 1 && s.pending.some((p) => p.kind === 'wanderer' && p.wanderer === s.wanderers[0].key && p.choices.some((c) => c.key === 'invite')), 'a wanderer arrives at a new Lodge, announced');
  const w0 = s.wanderers[0];
  check(w0.until === s.day + 20 && WANDERERS.some((w) => w.key === w0.key), 'stays 20 days');
  for (let d = 0; d < 14; d++) tick(s);
  check(s.wanderers.length === 1, 'the next one after 15 days (Lodge)');
  tick(s);
  check(s.wanderers.length === 2 && new Set(s.wanderers.map((w) => w.key)).size === 2, 'a second wanderer, a different one');
  for (let d = 0; d < 6; d++) tick(s);
  check(!s.wanderers.some((w) => w.key === w0.key), 'wanderers move on after 20 days');
  lodge.level = 3; s.flags.lodgeDay = s.day;
  for (let d = 0; d < 7; d++) tick(s);
  check(s.log.filter((l) => /arrives at the Lodge/.test(l.text)).length === 3, 'a Grand Lodge draws one every 7 days');
  // invite through the announcement
  const p = s.pending.filter((x) => x.kind === 'wanderer').at(-1);
  const r = R.answer(s, p.id, 'invite');
  check(r.ok && !s.pending.includes(p), `answer(invite): ${r.msg}`);
}

// ---------------------------------------------------------------- heat and the raid clock

{
  const s = rich(9);
  const h0 = R.heatTarget(s);
  check(near(h0.target, Math.min(100, 40 / 20 + (100000 + 300 * 3 + 300 + 200 * 2 + 10000 * 10) / 2000 + 2)), `heat target: pop, stored value, chambers (${h0.target.toFixed(1)})`);
  s.stock.credits = 1000; s.stock.parts = 100;
  const tgt = R.heatTarget(s).target;
  tick(s);
  check(near(s.raid.heat, tgt * 0.1, 0.5), `heat eases 10% a day toward its target (${s.raid.heat})`);
  learn(s, 'sensors', 'jamming'); unlock80(s);
  const j = put(s, 'jammer', { box: ALL(s), score: (x, y) => Math.abs(x - dockOf(s).x) + Math.abs(y - dockOf(s).y) });
  check(!!j && R.heatTarget(s).parts.some((p) => p.label === 'Jammers' && p.value === -10), 'a Jammer: heat −10');
  check(R.warnLead(s) === 3, 'warning 3 days ahead');
  put(s, 'sensormast'); put(s, 'sensormast'); put(s, 'sensormast'); put(s, 'sensormast');
  check(R.warnLead(s) === 9, 'Sensor Masts: +3 each, at most 9');
  s.commanders.push({ key: 'w_rook', loyalty: 40, injured: 0, dept: null });
  check(R.heatTarget(s).parts.some((p) => p.label === 'Cass Rook' && p.value === 5), 'Cass Rook serving: heat +5');
  // the clock: none before 80 colonists or day 60 (Easy); a warning, then the raid
  const c = rich(10); c.stock.credits = 3000; c.stock.parts = 200;
  const rng = stateRng(c);
  for (let d = 0; d < 30; d++) { tick(c, rng); c.pending.length = 0; }
  check(c.raid.next === null, 'no raid clock before 80 colonists');
  unlock80(c); tick(c, rng);
  check(c.raid.next >= 72, `first raid not before day 72 on Easy (warning not before 60): next ${c.raid.next}`);
  let warnDay = null, arriveDay = null, warn = null, raid = null;
  for (let d = 0; d < 200 && !raid; d++) {
    tick(c, rng);
    for (const p of c.pending) { if (p.kind === 'raidwarn') { warnDay = c.day; warn = p; } if (p.kind === 'raid') { arriveDay = c.day; raid = p; } }
    if (!raid) c.pending = c.pending.filter((p) => p.kind === 'raid');
  }
  check(warn && warn.speaker === 'sato' && /coming from/.test(warn.text) && /days?\./.test(warn.text) && /Barracks/.test(warn.text) && /Battery Emplacements/.test(warn.text), `the warning: from where, who, how many days, what defends (${warn?.text})`);
  check(warnDay >= 60 && arriveDay - warnDay === 3, `warned 3 days ahead (day ${warnDay} -> ${arriveDay})`);
  check(raid && raid.speaker === 'sato' && raid.choices.map((x) => x.key).join() === 'fight,tribute' && /Chance to win: \d+%/.test(raid.text) && /Tribute: \d+ credits/.test(raid.text), `the raid event: choices and the preview (${raid?.text})`);
  check(c.raid.coming && c.raid.coming.arrived && R.raidPreview(c).winChance === 0 && R.raidPreview(c).tribute.credits === Math.ceil(c.raid.coming.strength * 3), 'raidPreview: no defence, no chance; tribute = strength × 3');
  // unanswered: the sim fights it the next day
  const count = c.raid.count;
  tick(c, rng);
  check(c.raid.count === count + 1 && c.raid.last && c.raid.last.won === false && c.raid.coming === null && !c.pending.some((p) => p.kind === 'raid'), 'an unanswered raid is fought when the clock moves on');
  check(c.raid.next > c.day && c.raid.next - c.day >= 10, 'the next raid is scheduled');
}

// ---------------------------------------------------------------- raid tiers and factions

{
  const s = rich(11); unlock80(s);
  const rng = stateRng(s), seen = {};
  for (const [day, heat, diff] of [[70, 10, 'easy'], [200, 20, 'easy'], [300, 30, 'easy'], [420, 40, 'easy'], [60, 10, 'normal'], [150, 30, 'normal'], [320, 20, 'normal']]) {
    s.difficulty = diff; s.raid.heat = heat;
    const raids = Array.from({ length: 40 }, () => R.makeRaid(s, rng, day));
    const tiers = {}; for (const r of raids) tiers[r.tier] = (tiers[r.tier] || 0) + 1;
    seen[`${diff} day ${day}`] = { tiers, mean: Math.round(raids.reduce((t, r) => t + r.strength, 0) / raids.length) };
  }
  console.log('raid tiers (40 draws each):', JSON.stringify(seen));
  check(Object.keys(seen['easy day 70'].tiers).join() === 'scavengers' && seen['easy day 420'].tiers.remnant > 20, 'Easy: scavengers first, the remnant late');
  check(seen['normal day 150'].tiers.warbands > 0 || seen['normal day 150'].tiers.pirates > 20, 'Normal: tougher sooner');
  const sc = R.makeRaid({ ...s, difficulty: 'easy', raid: { ...s.raid, heat: 0 } }, () => 0.5, 50);
  check(sc.tier === 'scavengers' && sc.faction === 'scavengers' && sc.units.length >= 1 && sc.units.length <= 3 && sc.units.every((u) => MACHINE[u.type].tier === 1 && u.level === 0), 'scavengers: 1–3 tier-1 machines, level 0');
  const rem = R.makeRaid({ ...s, difficulty: 'normal', raid: { ...s.raid, heat: 50 } }, () => 0.6, 500);
  check(rem.tier === 'remnant' && rem.faction === 'remnant' && rem.units.length >= 15 && MACHINE[rem.units[0].type].cls === 'ships' && rem.units.every((u) => u.level >= 4 && u.level <= 6), 'remnant: 15+, a capital ship, levels 4–6');
  const easy = R.makeRaid({ ...s, difficulty: 'easy', raid: { ...s.raid, heat: 0 } }, () => 0.3, 50), norm = R.makeRaid({ ...s, difficulty: 'normal', raid: { ...s.raid, heat: 0 } }, () => 0.3, 50);
  check(JSON.stringify(easy.units) === JSON.stringify(norm.units) && near(easy.strength, Math.round(norm.strength * 0.6), 1), 'Easy: strength × 0.6');
  const war = R.makeRaid({ ...s, difficulty: 'normal', raid: { ...s.raid, heat: 0 } }, (() => { let k = 0; return () => [0.9, 0.2][k++] ?? 0.5; })(), 260);
  check(war.tier === 'warbands' && (war.faction === 'union' || war.faction === 'galt'), 'warbands: Union or Galt deserters');
  const cartel = { ...s, difficulty: 'easy', imported: { choice: 'refuse' }, raid: { ...s.raid, heat: 0 } };
  check(R.makeRaid(cartel, () => 0.1, 70).faction === 'cartel', 'refusing Moraine: the cartel comes sooner');
}

// ---------------------------------------------------------------- fighting: defence, emplacements, salvage, damage, theft, shields, fear, tribute

{
  const s = rich(12); unlock80(s); power(s, 6);
  for (const t of [23, 23, 24]) R.addGuardian(s, t);
  const raid = raidNow(s, [{ type: 0, level: 0 }, { type: 1, level: 0 }]);
  const d = R.defenceOf(s, raid);
  check(near(d.total, 205 + 205 + 190) && d.crewed === 3, `defence: crewed guardians (${d.total})`);
  const e1 = put(s, 'emplacement'), e2 = put(s, 'emplacement');
  R.setMode(s, e2.id, 'hydra');
  check(near(R.defenceOf(s, raid).emplacements, 40 + 40 * 1.3), 'emplacements: 40 each; Hydra ×1.3 against small craft');
  const shipRaid = { ...raid, units: [{ type: 39, level: 0 }] };
  check(near(R.defenceOf(s, shipRaid).emplacements, 40 * 1.3 + 40), 'Dragon ×1.3 against ships');
  R.setDepartment(s, 'sato', 'security');
  check(near(R.defenceOf(s, raid).total, (600 + 92) * 1.074), 'Security head multiplies the defence');
  const pv = R.raidPreview(s);
  check(pv && near(pv.winChance, pv.defence ** 2 / (pv.defence ** 2 + pv.attack ** 2)) && pv.attack === raid.strength && pv.expectedLost.length === 0 && pv.tribute.credits === Math.ceil(raid.strength * 3), `preview: ${JSON.stringify({ w: pv.winChance.toFixed(3), d: Math.round(pv.defence), a: pv.attack, lost: pv.expectedLost, dmg: pv.expectedDamage, t: pv.tribute })}`);
  // a win: salvage, levels, a little fear
  const c0 = s.stock.credits, pa0 = s.stock.parts;
  R.assignCommander(s, 'general', s.guardians[0].id);
  const res = R.answerRaid(s, 'fight', () => 0.01);
  check(res.ok && res.report.won && s.raid.won === 1 && s.raid.count === 1 && s.raid.coming === null, `a won fight: ${res.msg}`);
  check(res.report.salvage.credits === (8 + 8) * 5 && res.report.salvage.parts === 8 && s.stock.credits === c0 + 80 && s.stock.parts === pa0 + 8, 'salvage: prices × 5 credits, × 0.5 parts');
  check(s.guardians[0].level === 2 && s.guardians[1].level === 1 && s.guardians.every((g) => g.hp < 8), 'survivors gain levels (+2 led by a commander) and take damage');
  tick(s);
  check(happy(s, 'Raid') === -5, `a won raid: fear −5 (${happy(s, 'Raid')})`);
  // Hunter: +20% salvage
  s.commanders.push({ key: 'w_vashti', loyalty: 60, injured: 0, dept: null });
  raidNow(s, [{ type: 0, level: 0 }, { type: 1, level: 0 }]);
  check(R.answerRaid(s, 'fight', () => 0.01).report.salvage.credits === 96, 'Hunter: salvage +20%');
  // a loss: theft 10–30%, buildings knocked out (never homes, food, life support or power), fear −15
  const L = rich(13); unlock80(L); learn(L, 'smelting', 'medicine', 'canteens');
  for (const k of ['lab', 'clinic', 'canteen', 'depot', 'repairyard', 'smelter']) put(L, k);
  L.stock = { ...L.stock, food: 300, parts: 300, alloy: 100, credits: 5000 };
  const st0 = { ...L.stock };
  raidNow(L, [{ type: 30, level: 4 }, { type: 32, level: 4 }]);
  const lr = R.answerRaid(L, 'fight', () => 0.5);
  check(lr.ok && !lr.report.won && L.raid.lost === 1, `a lost fight: ${lr.msg}`);
  const frac = 0.1 + 0.5 * 0.2;
  check(['food', 'parts', 'alloy', 'credits'].every((g) => lr.report.stolen[g] === Math.floor(st0[g] * frac) && near(L.stock[g], st0[g] - lr.report.stolen[g])), `theft: 20% of food, parts, alloy, credits (${JSON.stringify(lr.report.stolen)})`);
  const hit = lr.report.damaged.map((id) => R.byId(L, id));
  check(hit.length >= 1 && hit.length <= 4 && hit.every((b) => b.damaged >= 5 && b.damaged <= 15 && !['life', 'food', 'homes', 'power'].includes(BUILDING[b.key].cat) && !['road', 'seal', 'command', 'dock'].includes(b.key)), `damage: ${hit.map((b) => `${b.key} ${b.damaged}d`).join(', ')}`);
  check(hit.every((b) => !R.active(b)), 'a damaged building is out of action');
  tick(L);
  check(happy(L, 'Raid fear') === -15, `fear −15 (${happy(L, 'Raid fear')})`);
  for (let d = 0; d < 7; d++) tick(L);
  check(happy(L, 'Raid fear') === -8, `fear fades over 15 days (${happy(L, 'Raid fear')})`);
  for (let d = 0; d < 8; d++) tick(L);
  check(happy(L, 'Raid fear') === undefined, 'fear gone after 15 days');
  // a crew repairs a damaged building a day a day (before new construction)
  const dm = rich(14); unlock80(dm);
  const lab = put(dm, 'lab'); lab.damaged = 2;
  const hab = R.byId(dm, R.build(dm, 'habitat', ...Object.values(R.findSpot(dm, 'habitat', { box: landing(dm), free: true }))).id);
  dm.buildings.find((b) => b.key === 'command') && tick(dm);
  check(lab.damaged === 1 && hab.build === 1, 'repairs take a crew (two crews: one repairs, one builds)');
  tick(dm);
  check(lab.damaged === undefined && R.active(lab) && dm.log.some((l) => /repaired/.test(l.text)), 'repaired after its days');
  // shield pylons keep raiders' fire off the buildings in range
  const sh = rich(13); unlock80(sh); learn(sh, 'smelting', 'medicine', 'canteens', 'sensors', 'shields'); power(sh, 6);
  for (const k of ['lab', 'clinic', 'canteen', 'depot', 'repairyard', 'smelter']) put(sh, k);
  const before = R.raidTargets(sh, 'earth').exposed.length;
  const py = put(sh, 'shieldpylon');
  const t1 = R.raidTargets(sh, 'earth');
  check(py && t1.shielded.length > 0 && t1.exposed.length < before + 1 && t1.shielded.every((b) => R.shielded(sh, b)), `a Shield Pylon covers buildings in range (${t1.shielded.length} shielded, ${t1.exposed.length} exposed)`);
  for (const b of sh.buildings.filter((x) => !['road', 'seal', 'command', 'dock'].includes(x.key) && !['life', 'food', 'homes', 'power'].includes(BUILDING[x.key].cat) && !R.shielded(sh, x))) sh.buildings.splice(sh.buildings.indexOf(b), 1);
  raidNow(sh, [{ type: 30, level: 6 }]);
  const shr = R.answerRaid(sh, 'fight', () => 0.5);
  check(!shr.report.won && shr.report.damaged.length === 0, 'everything shielded: nothing damaged');
  // losses: a destroyed machine's commander is injured 20–40 days
  const ls = rich(15); unlock80(ls);
  const weak = R.addGuardian(ls, 3); weak.hp = 1;
  R.assignCommander(ls, 'sato', weak.id);
  raidNow(ls, [{ type: 30, level: 6 }, { type: 32, level: 6 }]);
  check(R.raidPreview(ls).expectedLost.includes(3), 'preview: likely losses');
  const lsr = R.answerRaid(ls, 'fight', () => 0.6);
  const sato = ls.commanders.find((c) => c.key === 'sato');
  check(lsr.report.lostGuardians.join() === '3' && !ls.guardians.length && sato.injured >= 20 && sato.injured <= 40, `a destroyed machine; its commander injured ${sato.injured} days`);
  // Bulwark: a quarter less damage
  const bw = rich(16), bw2 = rich(16);
  for (const x of [bw, bw2]) { unlock80(x); R.addGuardian(x, 0); raidNow(x, [{ type: 1, level: 0 }]); }
  bw2.commanders.push({ key: 'w_brann', loyalty: 60, injured: 0, dept: null }); R.assignCommander(bw2, 'w_brann', bw2.guardians[0].id);
  const hpA = (R.answerRaid(bw, 'fight', () => 0.3), 8 - bw.guardians[0].hp);
  const hpB = (R.answerRaid(bw2, 'fight', () => 0.3), 8 - bw2.guardians[0].hp);
  check(hpB < hpA && hpB > 0, `Bulwark takes less damage (${hpA} vs ${hpB})`);
  // tribute through answer(): credits, heat +10, −5 happiness; food when credits are short
  const tr = rich(17); unlock80(tr);
  const traid = raidNow(tr, [{ type: 0, level: 0 }]);
  const p = { id: tr.nextId++, kind: 'raid', title: 'Raiders', text: '', choices: [{ key: 'fight', label: 'Fight' }, { key: 'tribute', label: 'Pay' }] };
  tr.pending.push(p);
  tr.raid.heat = 20;
  const cr = tr.stock.credits, ta = R.answer(tr, p.id, 'tribute');
  check(ta.ok && tr.stock.credits === cr - traid.strength * 3 && tr.raid.heat === 30 && tr.raid.paid === 1 && tr.raid.count === 1 && tr.raid.last.tribute.credits === traid.strength * 3 && !tr.pending.includes(p), `tribute through answer(): ${ta.msg}`);
  tick(tr);
  check(happy(tr, 'Tribute paid') === -5, 'tribute: −5 happiness');
  const tf = rich(18); unlock80(tf);
  const fraid = raidNow(tf, [{ type: 0, level: 0 }]);
  tf.stock.credits = 10; tf.stock.food = 280;
  check(R.answerRaid(tf, 'tribute').ok && tf.stock.food === 280 - Math.ceil(fraid.strength * 3 / 3) && tf.stock.credits === 10, 'tribute in food when credits are short');
  const tn = rich(18); unlock80(tn); raidNow(tn, [{ type: 30, level: 6 }]); tn.stock.credits = 0; tn.stock.food = 0;
  check(/cannot pay/.test(act(R.answerRaid(tn, 'tribute')).msg) && tn.raid.coming, 'no tribute without the means');
  check(!act(R.answerRaid(rich(19), 'fight')).ok, 'answerRaid without raiders refused');
  const early = rich(19); early.raid.coming = { day: early.day + 2, from: 'west', tier: 'scavengers', units: [{ type: 0, level: 0 }], faction: 'scavengers', strength: 54 };
  check(/still 2 days out/.test(act(R.answerRaid(early, 'fight')).msg), 'answerRaid before the raiders arrive refused');
}

// ---------------------------------------------------------------- fusion, mushroom walls, terrace homes

{
  const s = rich(20); learn(s, 'smelting', 'fabrication', 'plasma', 'fusion');
  const fu = put(s, 'fusion');
  s.pop = 200; s.stock.helium = 40;
  check(!!fu, 'a Fusion Reactor is built');
  tick(s);
  check(near(s.stats.last.power.supply - R.powerOf({ ...s, buildings: s.buildings.filter((b) => b !== fu) }).supply, 200, 1e-6) && near(40 - s.stock.helium, 2), `fusion: 200 power for 2 helium (${s.stats.last.power.supply})`);
  R.setMode(s, fu.id, 'overdrive');
  const he = s.stock.helium; tick(s, () => 0.99);
  check(near(he - s.stock.helium, 4) && near(R.powerOf(s).supply, R.powerOf({ ...s, buildings: s.buildings.filter((b) => b !== fu) }).supply + 300), 'overdrive: +50% power, twice the helium');
  tick(s, () => 0.001);
  check(fu.down === 5 && s.log.some((l) => /tripped/.test(l.text)), 'overdrive: a chance of a 5-day shutdown');
  const t = rich(20); learn(t, 'smelting', 'fabrication', 'plasma', 'fusion');
  const f2 = put(t, 'fusion'); t.pop = 200; t.stock.helium = 0;
  tick(t);
  check(f2.fuel === 0 && near(R.powerOf(t).supply, R.powerOf({ ...t, buildings: t.buildings.filter((b) => b !== f2) }).supply), 'no helium, no fusion power');
  // mushroom walls: food with no water
  const m = rich(21); learn(m, 'reclaim', 'hydro2', 'fungi'); power(m, 4);
  const mw = put(m, 'mushroom'); m.pop = 120;
  tick(m);
  check(mw && !BUILDING.mushroom.uses && m.stats.last.produced.food > BUILDING.command.makes.food + 12 * 1.1, 'Mushroom Wall: food, no water');
  // terrace homes: 60 housing on hills, a service for homes nearby
  const h = rich(22); learn(h, 'orchards', 'terraces');
  let ter = put(h, 'terrace', { box: ALL(h) });
  if (!ter) {   // no open hills on this map: make some in the landing chamber
    const p = R.findSpot(h, 'habitat', { box: landing(h), score: (x, y) => Math.abs(x - cmdOf(h).x - 8) + Math.abs(y - cmdOf(h).y), free: true });
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) h.map.t[(p.y + dy) * h.map.w + p.x + dx] = T.HILLS;
    ter = put(h, 'terrace', { box: landing(h) });
  }
  tick(h);
  check(ter && R.housingOf(h) >= 60 + 20 * 2 + 20 && R.spec(ter).housing === 60, 'Terrace Homes: housing 60');
  check(h.happyParts.some((p) => p.label === 'Terraces' && p.value > 0), 'Terrace Homes: a service line for homes nearby');
}

// ---------------------------------------------------------------- old saves

{
  const s = newGame({ seed: 23 });
  const rng = stateRng(s);
  for (let d = 0; d < 20; d++) { dayTick(s, rng); s.pending.length = 0; }
  const v1 = JSON.parse(saveState(s));
  for (const k of ['research', 'production', 'commanders', 'wanderers', 'raid']) delete v1[k];
  v1.guardians = [{ id: 7, type: 78, level: 9 }];
  const b1 = loadState(JSON.stringify(v1));
  check(b1.commanders.length === 2 && b1.raid.count === 0 && b1.guardians[0].hp === 44 && b1.guardians[0].free === 60 && b1.guardians[0].commander === null && b1.research.done.length === 0, 'a version-1 save gains the version 2 and 3 defaults (beta guardians: full HP, 60 free days)');
  check(R.guardianPower(b1, b1.guardians[0]) > 0 && R.machineList(b1).length === MACHINES.length, 'old save: read-outs work');
}

// ---------------------------------------------------------------- the scripted players

// The goal-following player of tests/colony-v2.mjs, plus research, and (for some) defence.
function placeAny(s, key, score) {
  const cc = cmdOf(s), dock = dockOf(s);
  const zone = R.spec({ key }).zone, nearB = zone === 'space' ? dock : cc;
  const box = zone === 'space' ? { x0: nearB.x - 26, y0: nearB.y - 26, x1: nearB.x + 26, y1: nearB.y + 26 } : { x0: 0, y0: 0, x1: s.map.w - 1, y1: s.map.h - 1 };
  const p = R.findSpot(s, key, { box, score: score || ((x, y) => Math.abs(x - nearB.x) + Math.abs(y - nearB.y)) });
  return p ? R.build(s, key, p.x, p.y) : { ok: false };
}
function roadInto(s, c, fromAnywhere = false) {
  const { w, h, ch } = s.map, road = new Set(s.buildings.filter((b) => b.key === 'road').map((b) => b.y * w + b.x));
  const seeds = fromAnywhere ? [...Array(w * h).keys()].filter((i) => ch[i] !== 255 && ch[i] !== c.id && R.chamberOf(s, ch[i])?.status === 'open' && R.canBuild(s, 'road', i % w, (i / w) | 0) === null) : [...road];
  const prev = new Int32Array(w * h).fill(-2), q = seeds;
  for (const i of q) prev[i] = -1;
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    if (ch[i] === c.id && !road.has(i)) { for (let j = i; j >= 0 && !road.has(j); j = prev[j]) R.build(s, 'road', j % w, (j / w) | 0); return true; }
    for (const j of [i - 1, i + 1, i - w, i + w]) if (prev[j] === -2 && R.canBuild(s, 'road', j % w, (j / w) | 0) === null) { prev[j] = i; q.push(j); }
  }
  return fromAnywhere ? false : roadInto(s, c, true);
}
const queued = (s, key) => s.buildings.some((b) => b.key === key && b.build > 0);
const count = (s, key) => s.buildings.filter((b) => b.key === key).length;
const DEFENCE = new Set(['arsenal', 'barracks', 'emplacement', 'scrapyard', 'shipyard', 'sensormast', 'shieldpylon', 'jammer']);
function upkeep(s) {
  const m = R.summary(s), place = (key) => (queued(s, key) ? null : placeAny(s, key));
  if (s.stock.credits < 150 && s.stock.food > 150) R.sell(s, 'food', Math.floor(s.stock.food - 120));
  if (m.stock.food.delta < 0) place('farm');
  if (m.stock.air.delta < 0) place('airplant');
  if (m.stock.water.delta < 0) place('riverpump');
  if (m.power.demand > m.power.supply * 0.95) place('solar');
  if (m.housing - s.pop < 10) place('habitat');
  if (s.happy < 60 && m.stock.credits.have > 400) place('park');
  const keepOre = count(s, 'smelter') ? 120 : 0;
  if (s.stock.ore > keepOre + 50) R.sell(s, 'ore', Math.floor(s.stock.ore - keepOre));
  const keepAlloy = count(s, 'fabricator') ? 60 : 0;
  if (s.stock.alloy > keepAlloy + 30) R.sell(s, 'alloy', Math.floor(s.stock.alloy - keepAlloy));
}
function followGoal(s, defend) {
  const g = goalStatus(s).current, sh = g?.show;
  if (!sh) return;
  if (sh.build) { if (!queued(s, sh.build) && (sh.build !== 'lab' || !count(s, 'lab')) && (defend || !DEFENCE.has(sh.build))) { const r = placeAny(s, sh.build); if (sh.build === 'depot' && r?.id) R.setMode(s, r.id, 'air'); } }
  else if (sh.chamber !== undefined) {
    const c = R.chamberOf(s, sh.chamber);
    if (c.status === 'sealed') R.chamberAction(s, c.id, 'survey');
    else if (c.status === 'surveyed' && R.openBreaches(s, c).length === 0) R.chamberAction(s, c.id, 'pressurise');
    else if (c.status === 'surveyed') for (const i of R.openBreaches(s, c)) R.build(s, 'seal', i % s.map.w, (i / s.map.w) | 0);
  } else if (sh.tile && g.id === 'seal') R.build(s, 'seal', sh.tile.x, sh.tile.y);
  else if (sh.roads) { const c = s.chambers.find((k) => k.status === 'open' && k.kind !== 'landing'); c && roadInto(s, c); }
  else if (sh.market) { if (s.stock.ore) R.sell(s, 'ore', s.stock.ore); else R.sell(s, 'food', 10); }
}
const ORDER = ['smelting', 'fabrication', 'medicine', 'canteens', 'deepdrill', 'machineworks', 'reclaim', 'safety', 'sensors', 'shields'];
function v2(s) {
  if (s.unlocked.includes('lab') && !count(s, 'lab')) placeAny(s, 'lab');
  if (!s.research.focus) { const t = ORDER.find((k) => R.techStatus(s).find((x) => x.key === k)?.available); if (t) R.research(s, t); }
  if (s.unlocked.includes('smelter') && !count(s, 'smelter')) placeAny(s, 'smelter');
  if (count(s, 'smelter') && count(s, 'oremine') < 2 && !queued(s, 'oremine')) {
    const seam = (x, y) => { let n = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (s.map.r[(y + dy) * s.map.w + x + dx] === 1) n++; const d = dockOf(s); return -n * 100 + Math.abs(x - d.x) + Math.abs(y - d.y); };
    placeAny(s, 'oremine', seam);
  }
  if (s.unlocked.includes('fabricator') && count(s, 'smelter') && !count(s, 'fabricator')) placeAny(s, 'fabricator');
  if (s.unlocked.includes('clinic') && !count(s, 'clinic')) {
    const homes = s.buildings.filter((b) => b.key === 'habitat');
    placeAny(s, 'clinic', (x, y) => -homes.filter((h) => Math.max(Math.abs(h.x - x), Math.abs(h.y - y)) <= 8).length * 100 + Math.abs(x - cmdOf(s).x) + Math.abs(y - cmdOf(s).y));
  }
}
// Defence, soon after 80 colonists: an Arsenal, a Barracks, two Battery Emplacements, a few tier-1
// machines; later a Scrapyard, more machines up to the crews, and another Barracks when rich.
function defend(s, { machines = 4, barracksMax = 2 } = {}) {
  if (!s.unlocked.includes('arsenal')) return;
  const fin = (k) => s.buildings.filter((b) => b.key === k && b.build === 0).length;
  if (!count(s, 'arsenal')) return placeAny(s, 'arsenal');
  if (!count(s, 'barracks')) placeAny(s, 'barracks');
  if (count(s, 'emplacement') < 2 && !queued(s, 'emplacement')) { const r = placeAny(s, 'emplacement'); if (r.ok && count(s, 'emplacement') === 2) R.setMode(s, r.id, 'hydra'); }
  if (fin('arsenal') && count(s, 'scrapyard') === 0 && s.guardians.length >= 2 && s.stock.credits > 800) placeAny(s, 'scrapyard');
  const want = Math.min(R.crewCap(s), machines + Math.floor(Math.max(0, s.day - 60) / 30) * 2);
  if (fin('arsenal') && s.guardians.length + s.production.length < want && s.stock.credits > 700) {
    const best = R.machineList(s).filter((m) => m.ok && m.at === 'arsenal' && m.cost.credits < s.stock.credits - 600).sort((a, b) => (b.attack + b.defence) - (a.attack + a.defence))[0];
    if (best) R.orderMachine(s, best.type);
  }
  if (s.guardians.length >= R.crewCap(s) && count(s, 'barracks') < barracksMax && !queued(s, 'barracks') && s.stock.credits > 2500) placeAny(s, 'barracks');
  // the General leads the strongest machine, Sato heads Security
  const top = [...s.guardians].sort((a, b) => R.guardianPower(s, b) - R.guardianPower(s, a))[0];
  if (top && !s.guardians.some((g) => g.commander === 'general')) R.assignCommander(s, 'general', top.id);
  if (!s.commanders.find((c) => c.key === 'sato').dept) R.setDepartment(s, 'sato', 'security');
}
function play(seed, { days = 250, difficulty = 'easy', defence = false, beta = null, answer = 'fight', each } = {}) {
  const s = newGame({ seed, difficulty, ...(beta ? { beta: true, importSave: beta, types } : {}) }), rng = stateRng(s), raids = [], t0 = performance.now();
  let deaths = 0, raidDeaths = 0, minCredits = Infinity, firstWarn = null;
  for (let d = 0; d < days; d++) {
    followGoal(s, defence); upkeep(s); v2(s);
    if (defence) defend(s, defence === true ? {} : defence);
    each?.(s);
    // the raid at the gates: fight (or the player's choice); record the preview
    for (const p of [...s.pending]) if (p.kind === 'raid') {
      const pv = R.raidPreview(s), c = s.raid.coming, choice = typeof answer === 'function' ? answer(s, pv) : answer;
      const r = R.answer(s, p.id, choice);
      raids.push({ day: s.day, tier: c.tier, faction: c.faction, strength: c.strength, defence: Math.round(pv.defence), win: pv.winChance, tribute: pv.tribute.credits, credits: Math.round(s.stock.credits + (r.report?.tribute?.credits || 0)), result: r.report ? (r.report.tribute ? 'paid' : r.report.won ? 'won' : 'lost') : 'refused', lost: r.report?.lostGuardians.length || 0, damaged: r.report?.damaged.length || 0, stolen: r.report?.stolen });
    }
    s.pending = s.pending.filter((p) => p.kind !== 'raid');
    const before = s.pop, raidDay = s.raid.last?.day === s.day;
    dayTick(s, rng);
    if (s.pending.some((p) => p.kind === 'raidwarn')) firstWarn ??= s.day;
    if (s.pop < before && s.log.some((l) => l.day === s.day && /died/.test(l.text))) { deaths += before - s.pop; if (s.raid.lost && s.day - (s.raid.last?.day ?? -99) <= 20) raidDeaths += before - s.pop; }
    minCredits = Math.min(minCredits, s.stock.credits);
    s.pending = s.pending.filter((p) => p.kind === 'raid');   // the player reads the rest
  }
  return { s, raids, deaths, raidDeaths, minCredits, firstWarn, ms: performance.now() - t0 };
}
const fmt = (r) => r.raids.map((x) => `d${x.day} ${x.faction} ${x.strength} vs ${x.defence} (${Math.round(x.win * 100)}%) ${x.result}${x.lost ? ` -${x.lost}` : ''}${x.damaged ? ` dmg${x.damaged}` : ''}`).join(' | ');

// Easy, defended: wins most early raids (scavengers, pirates), never loses the colony; first warning
// not before day 60.
const easyDef = [];
for (const seed of [1, 2, 3]) {
  const r = play(seed, { defence: true });
  easyDef.push(r);
  const { s } = r, early = r.raids.filter((x) => x.tier === 'scavengers' || x.tier === 'pirates');
  console.log(`easy defended seed ${seed}: day ${s.day} pop ${s.pop} guardians ${s.guardians.length} (crews ${R.crewCap(s)}) heat ${Math.round(s.raid.heat)} first warning day ${r.firstWarn} deaths ${r.deaths} (${r.ms.toFixed(0)} ms)`);
  console.log('    raids:', fmt(r));
  check(r.firstWarn === null || r.firstWarn >= 60, `seed ${seed}: first warning not before day 60 (${r.firstWarn})`);
  check(r.raids.length >= 3, `seed ${seed}: raids come (${r.raids.length})`);
  check(early.length && early.filter((x) => x.result === 'won').length / early.length >= 0.6, `seed ${seed}: wins most early raids (${early.filter((x) => x.result === 'won').length}/${early.length})`);
  check(s.pop >= 150 && !s.flags.lost && r.deaths === 0, `seed ${seed}: the colony stands, no deaths (pop ${s.pop}, deaths ${r.deaths})`);
  check(!walk(s, 'state', []).length && R.GOODS.every((g) => s.stock[g] >= 0), `seed ${seed}: no NaN, nothing negative`);
}

// Easy, no defences at all: loses raids but survives them (stolen stores, damaged buildings, no
// deaths from raids); tribute is affordable for early raids.
for (const seed of [1, 2]) {
  const r = play(seed, { defence: false });
  const { s } = r, early = r.raids.slice(0, 3);
  console.log(`easy undefended seed ${seed}: day ${s.day} pop ${s.pop} heat ${Math.round(s.raid.heat)} deaths ${r.deaths} (raids ${r.raidDeaths})`);
  console.log('    raids:', fmt(r));
  check(r.raids.length >= 3 && r.raids.every((x) => x.result === 'lost'), `undefended seed ${seed}: loses every raid (${r.raids.length})`);
  check(r.raids.some((x) => x.stolen && Object.keys(x.stolen).length) && r.raids.some((x) => x.damaged > 0), `undefended seed ${seed}: stores stolen, buildings damaged`);
  check(r.raidDeaths === 0 && r.deaths === 0 && !s.flags.lost && s.pop >= 120, `undefended seed ${seed}: survives, no deaths (pop ${s.pop})`);
  check(early.every((x) => x.tribute <= x.credits * 0.5), `undefended seed ${seed}: early tribute affordable (${early.map((x) => `${x.tribute}/${x.credits}`).join(', ')})`);
}
// ...and paying tribute instead works too
{
  const r = play(4, { defence: false, answer: 'tribute' });
  console.log(`easy tribute-payer seed 4: pop ${r.s.pop} credits ${Math.round(r.s.stock.credits)} heat ${Math.round(r.s.raid.heat)}`);
  console.log('    raids:', fmt(r));
  check(r.raids.length >= 2 && r.raids.slice(0, 3).every((x) => x.result === 'paid') && r.s.raid.paid >= 2 && r.deaths === 0, 'a tribute-payer pays the early raids off');
}

// Normal: tougher, but beatable with defences. The player is tests/colony-sim.mjs's Normal-tuned
// builder (the goal-follower above is tuned for Easy), with the same defence plan.
const net = (s, g) => (s.stats.last.produced?.[g] || 0) - (s.stats.last.consumed?.[g] || 0);
function pending(s) {
  const q = { food: 0, water: 0, air: 0, power: 0, housing: 0 };
  for (const b of s.buildings) {
    if (!b.build) continue;
    const d = R.spec(b);
    for (const [g, n] of Object.entries(d.makes || {})) if (g in q) q[g] += n;
    for (const [g, n] of Object.entries(d.uses || {})) if (g in q) q[g] -= n;
    q.power += d.power || 0; q.housing += d.housing || 0;
  }
  return q;
}
function soilOf(s, x, y, size) {
  const { t, w } = s.map;
  let sum = 0, river = false;
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
    sum += { [T.FERTILE]: 1.8, [T.PLAIN]: 1.1, [T.POOR]: 0.55 }[t[(y + dy) * w + x + dx]] || 0;
    for (const [ax, ay] of [[x + dx + 1, y + dy], [x + dx - 1, y + dy], [x + dx, y + dy + 1], [x + dx, y + dy - 1]]) if (t[ay * w + ax] === T.RIVER) river = true;
  }
  return (sum / size / size) * (river ? 1.25 : 1);
}
const cramped = new WeakMap();
function placeIn(s, key, boxes, score) {
  let best = null;
  for (const c of boxes) {
    const p = R.findSpot(s, key, { box: c, score, free: true });
    if (p) { const v = score(p.x, p.y); if (!best || v < best.v) best = { ...p, v }; }
  }
  if (!best) { cramped.set(s.map.t, s.day); return false; }
  const cost = R.costOf(s, BUILDING[key].cost, key);
  if (s.stock.credits < cost.credits || s.stock.parts < cost.parts) return false;
  return R.build(s, key, best.x, best.y).ok;
}
const reachBox = (s) => { const d = dockOf(s); return { x0: Math.max(0, d.x - 24), y0: Math.max(0, d.y - 24), x1: Math.min(s.map.w - 1, d.x + 25), y1: Math.min(s.map.h - 1, d.y + 25) }; };
function builder(s) {
  const q = pending(s), sum = R.summary(s), cmd = cmdOf(s);
  const busy = s.buildings.filter((b) => b.build > 0).length, crews = R.crewsOf(s);
  let did = 0;
  const can = () => busy + did < crews + 1 && s.stock.credits > 200;
  const go = (ok) => { if (ok) did++; return ok; };
  const home = (x, y) => Math.abs(x - cmd.x) + Math.abs(y - cmd.y);
  const boxes = s.chambers.filter((c) => c.status === 'open');
  const powerLeft = sum.power.supply - sum.power.demand + q.power, pop = s.pop, grow = Math.max(10, pop * 0.12);
  if (s.day === 60) R.setTax(s, 0.15);
  if (can() && net(s, 'air') + q.air < grow * 0.6) go(placeIn(s, 'airplant', boxes, (x, y) => home(x, y) + (soilOf(s, x, y, 2) > 1.2 ? 40 : 0)));
  if (can() && powerLeft < 8) {
    if (s.unlocked.includes('induction') && s.stock.credits > 900) go(placeIn(s, 'induction', [reachBox(s)], home));
    if (!did) go(placeIn(s, 'solar', [reachBox(s)], (x, y) => (s.map.t[y * s.map.w + x] === T.HULL ? 0 : 50) + home(x, y) / 4));
  }
  if (can() && net(s, 'water') + q.water < 8 + grow * 0.5) go(placeIn(s, 'riverpump', boxes, home));
  if (can() && net(s, 'food') + q.food < grow) {
    if (!go(placeIn(s, 'farm', boxes, (x, y) => { const v = soilOf(s, x, y, 2); return v < 1.6 ? null : -v * 100 + home(x, y) / 10; }))) go(placeIn(s, 'hydro', boxes, (x, y) => home(x, y) + (soilOf(s, x, y, 1) > 1.2 ? 30 : 0)));
  }
  const fed = net(s, 'food') >= 0 && net(s, 'water') >= 0 && net(s, 'air') >= 0;
  if (can() && fed && sum.housing + q.housing - pop < Math.max(15, pop * 0.15)) {
    const field = R.parkField(s);
    go(placeIn(s, 'habitat', boxes, (x, y) => home(x, y) + (field[y * s.map.w + x] ? 0 : 25) + (soilOf(s, x, y, 1) > 1.2 ? 30 : 0)));
  }
  if (can()) {
    const field = R.parkField(s), bare = s.buildings.find((b) => b.key === 'habitat' && !field[b.y * s.map.w + b.x] && !b.build);
    if (bare && !queued(s, 'park')) go(placeIn(s, 'park', boxes, (x, y) => Math.abs(x - bare.x) + Math.abs(y - bare.y) + (soilOf(s, x, y, 1) > 1.2 ? 4 : 0)));
  }
  if (can() && s.day >= 8 && !count(s, 'repairyard')) go(placeIn(s, 'repairyard', boxes, (x, y) => home(x, y) + (soilOf(s, x, y, 2) > 1.2 ? 40 : 0)));
  if (s.day >= 25) {
    const work = s.chambers.find((c) => ['surveying', 'surveyed', 'pressurising'].includes(c.status));
    const roomy = boxes.reduce((t, c) => t + c.tiles, 0) / 5 > pop + 40 && s.day - (cramped.get(s.map.t) ?? -99) > 10;
    if (!work && s.stock.credits > 400 && !roomy) {
      const links = R.chamberLinks(s);
      const cand = s.chambers.filter((c) => c.status === 'sealed' && [...links.get(c.id)].some((id) => R.chamberOf(s, id).status === 'open')).sort((a, b) => a.breaches.length - b.breaches.length);
      if (cand.length) R.chamberAction(s, cand[0].id, 'survey');
    } else if (work?.status === 'surveyed') {
      for (const i of R.openBreaches(s, work)) { const x = i % s.map.w, y = (i / s.map.w) | 0; if (!s.buildings.some((b) => b.x === x && b.y === y) && s.stock.credits > 60) R.build(s, 'seal', x, y); }
      if (!R.openBreaches(s, work).length) {
        const air = R.pressuriseAir(s, work);
        if (R.storageCaps(s).air < air && !queued(s, 'depot') && placeIn(s, 'depot', boxes, home)) R.setMode(s, s.buildings.at(-1).id, 'air');
        if (s.stock.air >= air) R.chamberAction(s, work.id, 'pressurise');
      }
    }
  }
  if (s.unlocked.includes('oremine')) {
    if (can() && count(s, 'oremine') < 2 + (pop >= 160) && s.stock.credits > 500) {
      const seam = (x, y) => { let n = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (s.map.r[(y + dy) * s.map.w + x + dx] === 1) n++; return -n * 100 + Math.abs(x - dockOf(s).x) + Math.abs(y - dockOf(s).y); };
      go(placeIn(s, 'oremine', [reachBox(s)], seam));
    }
    if (s.stock.ore >= 30) R.sell(s, 'ore', Math.floor(s.stock.ore));
  }
  const cap = R.storageCaps(s);
  if (s.stock.food > cap.food * 0.9 && net(s, 'food') > 0) R.sell(s, 'food', Math.floor(s.stock.food - cap.food * 0.7));
  else if (s.stock.credits < 300 && s.stock.food > 150 && net(s, 'food') > 0) R.sell(s, 'food', Math.floor(s.stock.food - 150));
}
function playNormal(seed, { days = 250, defence = null } = {}) {
  const s = newGame({ seed, difficulty: 'normal' }), rng = stateRng(s), raids = [];
  let deaths = 0, firstWarn = null;
  for (let d = 0; d < days; d++) {
    builder(s);
    if (defence && s.stock.credits > 900) defend(s, defence);
    for (const p of [...s.pending]) if (p.kind === 'raid') {
      const pv = R.raidPreview(s), c = s.raid.coming, r = R.answer(s, p.id, 'fight');
      raids.push({ day: s.day, tier: c.tier, faction: c.faction, strength: c.strength, defence: Math.round(pv.defence), win: pv.winChance, result: r.report.won ? 'won' : 'lost', lost: r.report.lostGuardians.length, damaged: r.report.damaged.length });
    }
    const before = s.pop;
    dayTick(s, rng);
    if (s.pending.some((p) => p.kind === 'raidwarn')) firstWarn ??= s.day;
    if (s.pop < before && s.log.some((l) => l.day === s.day && /died/.test(l.text))) deaths += before - s.pop;
    s.pending = s.pending.filter((p) => p.kind === 'raid');
  }
  return { s, raids, deaths, firstWarn };
}
{
  const r = playNormal(1, { defence: { machines: 6, barracksMax: 3 } });
  const { s } = r, won = r.raids.filter((x) => x.result === 'won').length;
  console.log(`normal defended seed 1: day ${s.day} pop ${s.pop} guardians ${s.guardians.length} (crews ${R.crewCap(s)}) heat ${Math.round(s.raid.heat)} first warning ${r.firstWarn} deaths ${r.deaths}`);
  console.log('    raids:', fmt(r));
  const un = playNormal(1);
  console.log(`normal undefended seed 1: pop ${un.s.pop} deaths ${un.deaths}; raids:`, fmt(un));
  check(r.raids.length >= 4 && won / r.raids.length >= 0.6 && !s.flags.lost && r.deaths === 0, `Normal with defences: beatable (${won}/${r.raids.length} won)`);
  check(un.raids.every((x) => x.result === 'lost') && un.deaths === 0 && un.s.pop >= 150, `Normal without defences: every raid lost, the colony survives (pop ${un.s.pop})`);
  const mean = (list, k) => list.reduce((t, x) => t + x[k], 0) / list.length, e = easyDef.flatMap((x) => x.raids.slice(0, 4));
  const meanE = mean(e, 'strength'), meanN = mean(r.raids.slice(0, 4), 'strength'), winE = mean(e, 'win'), winN = mean(r.raids.slice(0, 4), 'win');
  console.log(`  first raids (info): Normal average ${Math.round(meanN)} vs Easy ${Math.round(meanE)}; win chance ${Math.round(winN * 100)}% vs ${Math.round(winE * 100)}%`);
  // Normal is tougher for the same colony: the same state and dice, only the difficulty changed
  // (comparing two different colonies isn't fair: a healthier Easy colony draws more heat).
  {
    const base = JSON.parse(JSON.stringify(r.s)), seeds = [11, 12, 13, 14, 15];
    const strength = (diff) => mean(seeds.map((k) => { const t = JSON.parse(JSON.stringify(base)); t.difficulty = diff; return R.makeRaid(t, stateRngFor(k), t.day + 30); }), 'strength');
    const sN = strength('normal'), sE = strength('easy');
    check(sN > sE * 1.15, `Normal is tougher: the same colony draws raids of ${Math.round(sN)} on Normal vs ${Math.round(sE)} on Easy`);
  }
}

// Beta: a large expansion army (30 machines with the Azoras Kai and the Kai series) wins every raid
// easily; its upkeep is free for 60 days, then real; selling machines brings credits and parts.
{
  const kai = [78, 72, 72, 58, 58, 71, 71, 71, 66, 66, 67, 67, 68, 68, 69, 69, 70, 70, 73, 73, 75, 31, 32, 30, 42, 43, 39, 2, 4, 16];
  const roster = kai.map((type, i) => ({ id: i + 1, type, level: 3 + (i % 7) }));
  const save = { 'el-expansion-campaign-remnant': JSON.stringify({ roster }) };
  const s0 = newGame({ seed: 5, beta: true, importSave: save, types });
  check(s0.guardians.length === 30 && s0.guardians.every((g) => g.free === 60 && g.hp === R.maxHp(s0, g) && g.commander === null), 'beta: the original army, full HP, 60 free days');
  check(R.machineUpkeep(s0) === 0, 'beta: no upkeep at first');
  const upkeepAt = {};
  const r = play(5, { beta: save, days: 220, defence: { machines: 0, barracksMax: 5 }, each: (s) => {
    if (s.day === 59 || s.day === 61) upkeepAt[s.day] = R.machineUpkeep(s);
    // a beta tester keeps crews for the army and sells what the colony can't feed
    if (s.unlocked.includes('barracks') && s.guardians.length > R.crewCap(s) && count(s, 'barracks') < 4 && !queued(s, 'barracks')) placeAny(s, 'barracks');
    if (s.day > 60 && s.stock.credits < 1500 && s.guardians.length > 12) {
      const cheap = [...s.guardians].filter((g) => !g.commander).sort((a, b) => R.guardianUpkeep(s, b) / R.guardianPower(s, b) - R.guardianUpkeep(s, a) / R.guardianPower(s, a))[0];
      const c0 = s.stock.credits, p0 = s.stock.parts, v = R.sellGuardian(s, cheap.id);
      if (v.ok) upkeepAt.sold = (upkeepAt.sold || 0) + 1, upkeepAt.gain = (upkeepAt.gain || 0) + s.stock.credits - c0, upkeepAt.parts = (upkeepAt.parts || 0) + s.stock.parts - p0;
    }
  } });
  const { s } = r;
  console.log(`beta seed 5: day ${s.day} pop ${s.pop} guardians ${s.guardians.length} (crews ${R.crewCap(s)}) upkeep day 59 ${upkeepAt[59]} day 61 ${upkeepAt[61]?.toFixed(1)}; sold ${upkeepAt.sold || 0} for ${upkeepAt.gain || 0} credits, ${upkeepAt.parts || 0} parts; deaths ${r.deaths}`);
  console.log('    raids:', fmt(r));
  check(upkeepAt[59] === 0 && upkeepAt[61] > 20, `beta: upkeep free for 60 days, then real (${upkeepAt[59]} -> ${upkeepAt[61]})`);
  check(r.raids.length >= 3 && r.raids.every((x) => x.result === 'won' && x.win > 0.9 && x.lost === 0), 'beta: wins every raid easily, losing nothing');
  check((upkeepAt.gain || 0) > 0 && (upkeepAt.parts || 0) > 0, 'beta: selling machines brings credits and parts');
  check(r.deaths === 0 && !s.flags.lost, 'beta: no deaths');
}

// Old saves: a version-2 save with all 19 version-2 techs done loads, offers the new techs, and runs
// 100 days with raids.
{
  const base = play(2, { days: 120, defence: false }).s;
  const v2save = JSON.parse(saveState(base));
  for (const k of ['production', 'commanders', 'wanderers', 'raid']) delete v2save[k];
  const v2techs = TECHS.filter((t) => t.branch !== 'defence' && !['fungi', 'fusion', 'terraces', 'leadership'].includes(t.key)).map((t) => t.key);
  v2save.research = { points: 3, focus: null, progress: Object.fromEntries(v2techs.map((k) => [k, TECH[k].cost])), done: v2techs };
  v2save.unlocked = [...new Set([...v2save.unlocked, ...v2techs.flatMap((k) => TECH[k].unlocks)])].filter((k) => !['arsenal', 'barracks', 'scrapyard', 'emplacement'].includes(k));
  v2save.pending = [];
  const s = loadState(JSON.stringify(v2save));
  check(v2techs.length === 19 && s.research.done.length === 19, 'old save: all 19 version-2 techs done');
  const avail = R.techStatus(s).filter((t) => t.available).map((t) => t.key).sort().join();
  check(avail === 'fungi,fusion,leadership,machineworks,sensors,terraces', `old save: the new techs are offered (${avail})`);
  check(['arsenal', 'barracks', 'scrapyard', 'emplacement'].every((k) => s.unlocked.includes(k)) && s.commanders.length === 2 && s.raid.count === 0, 'old save: defence buildings unlocked (past 80), commanders and the raid clock');
  const rng = stateRng(s);
  let err = null;
  const day0 = s.day;
  try {
    for (let d = 0; d < 100; d++) {
      for (const p of [...s.pending]) R.answer(s, p.id, p.choices[0].key);
      dayTick(s, rng);
    }
  } catch (e) { err = e; }
  console.log(`old version-2 save: day ${day0} -> ${s.day}, raids ${s.raid.count} (won ${s.raid.won}, lost ${s.raid.lost}), pop ${s.pop}${err ? ` ERROR ${err.stack}` : ''}`);
  check(!err && s.day === day0 + 100 && s.raid.count >= 1 && !walk(s, 'state', []).length, 'old save: runs 100 days with raids');
  check(saveState(loadState(saveState(s))) === saveState(s), 'save/load round trip keeps version 3');
}

// Determinism and speed.
{
  const a = play(3, { days: 160, defence: true }).s, b = play(3, { days: 160, defence: true }).s;
  check(saveState(a) === saveState(b), 'same seed, same colony (raids and all)');
  const back = loadState(saveState(a)), ra = stateRng(a), rb = stateRng(back);
  for (let d = 0; d < 60; d++) { for (const x of [[a, ra], [back, rb]]) { for (const p of [...x[0].pending]) R.answer(x[0], p.id, p.choices[0].key); dayTick(x[0], x[1]); } }
  check(saveState(a) === saveState(back), 'a loaded colony continues identically');
  const s = easyDef[0].s, rng = stateRng(s), t = performance.now();
  for (let d = 0; d < 500; d++) { for (const p of [...s.pending]) R.answer(s, p.id, p.choices[0].key); dayTick(s, rng); }
  const ms = performance.now() - t;
  console.log(`500 more days of the defended colony (${s.buildings.length} buildings, ${s.guardians.length} guardians, ${s.raid.count} raids in all): ${ms.toFixed(0)} ms`);
  check(ms < 1500, `500 days well under 2 s (${ms.toFixed(0)} ms)`);
}

const bad = refusals.filter((m) => typeof m !== 'string' || m.length < 8 || !/[.!?]$/.test(m) || /undefined|NaN|null|\[object/.test(m));
check(!bad.length, `refusal messages readable: ${JSON.stringify([...new Set(bad)].slice(0, 5))}`);
console.log(failed ? `${failed} of ${failed + passed} checks FAILED` : `all ${passed} checks passed`);
process.exit(failed ? 1 : 0);
