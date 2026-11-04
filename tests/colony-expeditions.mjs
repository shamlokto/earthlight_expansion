// Colony version 4, stage 3 (docs/COLONY-V4.md "Stage 3 build contract: expeditions (lean)"): the sector
// map (deterministic, three rings, every site type, ring 1 known), launch refusals, travel times, guardians
// away not defending, each site type's result, a pirate den lowering heat and slowing raids, recall,
// save / load mid-expedition, an old save gaining the chart, and the balance (tier 1 for ring 1, a strong
// squadron or a commander for ring 3, the beta army everywhere).
//   node tests/colony-expeditions.mjs
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { mulberry32 } from '../js/colony/mapgen.js';

let failed = 0, passed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const TYPES = ['belt', 'comet', 'derelict', 'babylon', 'bunker', 'den', 'outpost', 'listening', 'relief'];
const T1 = [0, 1, 14, 16];   // Mars, Titan, Vulcan, Cyclops: a plain tier-1 squadron (power ≈ 475)
const STRONG = [32, 32, 32, 32, 32, 32];   // six Nodens battleships
const tick = (s, rng, n = 1) => { for (let k = 0; k < n; k++) dayTick(s, rng); };
// A colony with crews for 16 machines (two Barracks put down by hand) and the guardians given.
function colony(seed = 1, types = [], opts = {}) {
  const s = newGame({ seed, ...opts });
  s.stock.credits = 50000; s.stock.parts = 5000; s.stock.food = 2000; s.pending.length = 0;
  for (let k = 0; k < 2; k++) s.buildings.push({ id: s.nextId++, key: 'barracks', x: 0, y: 0, level: 1, mode: null, build: 0, off: false });
  for (const t of types) R.addGuardian(s, t, { level: opts.level || 0 });
  return s;
}
const ids = (s, n = 99) => s.guardians.slice(0, n).map((g) => g.id);
const sectorOfType = (s, site, ring) => s.expeditions.sectors.find((x) => x.site === site && (!ring || x.ring === ring));
// Send a squadron and run the clock until it is home: { launch, report, event, s }.
function voyage(s, sector, gids = ids(s, 6), cmd = null, rng = stateRng(s)) {
  sector.known = true;
  const launch = R.launchExpedition(s, sector.id, gids, cmd);
  if (!launch.ok) return { launch };
  const e = launch.expedition;
  while (s.expeditions.away.includes(e)) tick(s, rng);
  const event = s.pending.filter((p) => p.kind === 'expedition').pop();
  return { launch, e, report: event?.report, event, s };
}

// ---------------------------------------------------------------- the sector map

for (let seed = 1; seed <= 10; seed++) {
  const s = newGame({ seed }), sec = s.expeditions.sectors;
  check(sec.length === 20 && [1, 2, 3].every((r) => sec.some((x) => x.ring === r)), `seed ${seed}: 20 sectors in three rings`);
  check(TYPES.every((t) => sec.some((x) => x.site === t)) && sec.filter((x) => x.site === 'babylon').length === 1 && sec.filter((x) => x.site === 'listening').length === 1, `seed ${seed}: every site type, one Babylon, one listening post`);
  check(sec.every((x) => x.known === (x.ring === 1) && !x.visited && !x.cleared), `seed ${seed}: ring 1 known, the rest unknown`);
  check(sec.filter((x) => x.ring > 1).every((x) => sec.find((p) => p.id === x.parent)?.ring === x.ring - 1), `seed ${seed}: every outer sector hangs off one in the ring inside`);
  check(sec.every((x) => x.angle >= 0 && x.angle < Math.PI * 2) && new Set(sec.map((x) => x.name)).size === 20, `seed ${seed}: angles on the circle, names unique`);
  check(JSON.stringify(R.makeSectors(seed)) === JSON.stringify(sec), `seed ${seed}: deterministic from the seed`);
  const reliefs = sec.filter((x) => x.site === 'relief');
  check(reliefs.every((x) => Math.abs(x.angle - Math.PI / 2) < 1.2), `seed ${seed}: relief stations on the Earth side`);
}
check(JSON.stringify(R.makeSectors(1)) !== JSON.stringify(R.makeSectors(2)), 'different seeds, different charts');

// ---------------------------------------------------------------- launch refusals

{
  const s = colony(1), sec = sectorOfType(s, 'belt', 1);
  check(!R.launchExpedition(s, sec.id, []).ok, 'no guardians: refused');
  check(/no such/i.test(R.launchExpedition(s, 'nope', [1]).msg), 'unknown sector id: refused');
  const t = colony(1, [0, 1, 2, 3, 8, 9, 10, 12, 14, 15, 16, 20, 21, 22, 23, 24, 25]);   // 17 machines, 16 crews
  const crew = R.crewed(t), loose = t.guardians.find((g) => !crew.has(g.id));
  const tb = sectorOfType(t, 'belt', 1);
  check(/crew/i.test(R.launchExpedition(t, tb.id, [loose.id]).msg), `uncrewed: refused (${R.launchExpedition(t, tb.id, [loose.id]).msg})`);
  const hurt = t.guardians.find((g) => crew.has(g.id)); hurt.hp -= 2;
  check(/damaged/i.test(R.launchExpedition(t, tb.id, [hurt.id]).msg), 'damaged: refused');
  hurt.hp += 2;
  const seven = [...crew].slice(0, 7);
  check(/at most 6/i.test(R.launchExpedition(t, tb.id, seven).msg), 'seven machines: refused');
  const far = t.expeditions.sectors.find((x) => !x.known);
  check(/not charted/i.test(R.launchExpedition(t, far.id, seven.slice(0, 2)).msg), 'an uncharted sector: refused');
  const pv = R.expeditionPreview(t, tb.id, seven.slice(0, 6));
  check(pv.ok && pv.days === 4 && pv.roundTrip === 8 && pv.winChance === 1 && pv.lootText.length > 0, 'preview: days, a sure thing for a belt, the loot');
  const go = R.launchExpedition(t, tb.id, seven.slice(0, 3));
  check(go.ok && t.guardians.filter((g) => g.away === go.expedition.id).length === 3, 'launched: three machines away');
  check(/away/i.test(R.launchExpedition(t, sectorOfType(t, 'comet', 1).id, seven.slice(0, 1)).msg), 'a machine already away: refused');
  check(/already/i.test(R.launchExpedition(t, tb.id, seven.slice(3, 4)).msg), 'a second squadron to the same sector: refused');
  check(!R.sellGuardian(t, seven[0]).ok, 'a machine away cannot be sold');
}

// ---------------------------------------------------------------- travel times

for (const ring of [1, 2, 3]) {
  const s = colony(2, T1), rng = stateRng(s), sec = s.expeditions.sectors.find((x) => x.ring === ring && ['belt', 'comet', 'outpost'].includes(x.site));
  sec.known = true;
  const d0 = s.day, r = R.launchExpedition(s, sec.id, ids(s)), e = r.expedition;
  check(r.ok && e.arrive === d0 + 4 * ring && e.back === d0 + 8 * ring, `ring ${ring}: ${4 * ring} days out, ${4 * ring} back`);
  tick(s, rng, 4 * ring - 1);
  check(!e.report, `ring ${ring}: not there a day early`);
  tick(s, rng);
  check(!!e.report && s.guardians.every((g) => g.away), `ring ${ring}: arrived on day ${e.arrive}, still away`);
  tick(s, rng, 4 * ring - 1);
  check(s.guardians.every((g) => g.away), `ring ${ring}: not home a day early`);
  tick(s, rng);
  check(s.guardians.every((g) => !g.away) && !s.expeditions.away.length && s.pending.some((p) => p.kind === 'expedition' && p.report), `ring ${ring}: home on day ${e.back} with a report`);
}

// ---------------------------------------------------------------- away guardians don't defend

{
  const s = colony(3, [...T1, 15, 23]), rng = stateRng(s);
  const all = R.defenceOf(s, null).guardians;
  const go = R.launchExpedition(s, sectorOfType(s, 'belt', 1).id, ids(s, 4));
  const raid = R.makeRaid(s, mulberry32(7));
  s.raid.coming = { ...raid, day: s.day };
  const d = R.defenceOf(s, raid), home = s.guardians.filter((g) => !g.away);
  check(go.ok && d.crewed === 2 && d.away === 4 && Math.abs(d.guardians - home.reduce((t, g) => t + R.guardianPower(s, g), 0)) < 1e-6 && d.guardians < all, `the defence counts only the machines at home (${Math.round(d.guardians)} of ${Math.round(all)})`);
  const before = s.guardians.filter((g) => g.away).map((g) => `${g.id}:${g.hp}:${g.level}`).join();
  const r = R.answerRaid(s, 'fight', rng);
  check(r.ok && s.guardians.filter((g) => g.away).map((g) => `${g.id}:${g.hp}:${g.level}`).join() === before, 'the raid fight leaves the squadron away untouched');
  check(R.dronesPreview(s, { strength: 100 }).crewed === s.guardians.filter((g) => !g.away && R.crewed(s).has(g.id)).length, 'the sentries meet only the machines at home');
  const g0 = s.guardians.find((g) => g.away);
  check(!R.assignCommander(s, 'sato', g0.id).ok, 'a commander cannot board a machine away');
  // repairs skip machines away
  s.buildings.push({ id: s.nextId++, key: 'scrapyard', x: 0, y: 0, level: 1, mode: null, build: 0, off: false });
  g0.hp -= 3; const hp = g0.hp;
  tick(s, rng);
  check(g0.hp === hp, 'the Scrapyard cannot reach a machine away');
}

// ---------------------------------------------------------------- each site type

{
  const results = {};
  for (const site of TYPES) {
    const s = colony(4, STRONG, { level: 6 }), sec = sectorOfType(s, site);
    const before = { ...s.stock }, pop = s.pop, pts = s.research.points, techs = s.research.done.length, wand = s.wanderers.length, nG = s.guardians.length;
    s.raid.heat = 60;
    const v = voyage(s, sec, ids(s), 'general');
    const r = v.report;
    results[site] = r;
    check(v.launch.ok && r && r.won && !r.lost.length, `${site}: the strong squadron wins without loss (${v.launch.msg})`);
    check(sec.visited && v.event.text.includes(sec.name), `${site}: visited, the report names it`);
    check(r.loot.reveal.every((id) => R.sectorOf(s, id).known), `${site}: the next ring's neighbours charted`);
    if (site === 'belt') check(s.stock.ore > before.ore && r.loot.goods.ore > 0 && r.loot.goods.water > 0 && !sec.cleared, 'belt: ore and ice, and it can be mined again');
    if (site === 'comet') check(r.loot.goods.water > 0 && (s.stock.water > before.water || s.stock.credits > before.credits), 'comet: water');
    if (site === 'derelict') check(r.loot.goods.parts > 0 && r.loot.goods.credits > 0 && sec.cleared, 'derelict: salvage, cleared');
    if (site === 'babylon') {
      const j = s.secrets.journal.find((x) => x.kind === 'expedition' && x.ref === 'babylon');
      check(r.loot.machines.length === 1 && s.guardians.length === nG + 1 && R.machineOf(s, r.loot.machines[0]).cls === 'ships', 'babylon: a great ship towed home');
      check(j && /Galt flag/.test(j.text) && /cannon/.test(j.text) && /Babylon/.test(j.text) && s.research.points >= pts + 300, 'babylon: the story in the journal, research');
    }
    if (site === 'bunker') check(s.pop >= pop + r.loot.pop && r.loot.pop > 0 && (r.loot.blueprint ? s.research.done.length === techs + 1 : true) && s.research.points > pts, `bunker: survivors, research, blueprints (${r.loot.blueprint})`);
    if (site === 'den') check(sec.cleared && R.densCleared(s) === 1 && s.raid.heat < 60 - 15 && r.loot.goods.credits > 0, `den: cleared, heat down (${s.raid.heat})`);
    if (site === 'outpost') check(s.wanderers.length === wand + 1 && r.loot.goods.food > 0 && !sec.cleared, 'outpost: a wanderer at the Lodge, trade goods');
    if (site === 'listening') check(s.research.points >= pts + 800 && s.expeditions.sectors.every((x) => x.known) && sec.cleared, 'listening post: research, the whole chart');
    if (site === 'relief') check(sec.cleared && sec.visited, 'relief station: visited and marked');
  }
  // cleared sites are empty on a second visit; a belt pays again
  const s = colony(4, STRONG, { level: 6 }), d = sectorOfType(s, 'derelict', 1), b = sectorOfType(s, 'belt', 1);
  const heal = () => { for (const g of s.guardians) g.hp = R.maxHp(s, g); };
  voyage(s, d); heal(); const again = voyage(s, d); heal();
  check(again.report.strength === 0 && !Object.keys(again.report.loot.goods).length, 'a cleared derelict: no fight, nothing left');
  voyage(s, b); heal(); const belt2 = voyage(s, b);
  check(belt2.report.loot.goods.ore > 0, 'a belt pays every run');
}

// ---------------------------------------------------------------- dens: heat and the raid clock

{
  const s = colony(5, STRONG, { level: 6 }), rng = stateRng(s), den = sectorOfType(s, 'den', 1);
  s.raid.heat = 50;
  const iBefore = R.raidInterval(s, mulberry32(3)), tBefore = R.heatTarget(s).target;
  den.known = true;
  const e = R.launchExpedition(s, den.id, ids(s)).expedition;
  tick(s, rng, e.back - s.day - 1);
  const h0 = s.raid.heat;
  tick(s, rng);
  check(den.cleared && s.raid.heat <= h0 - 15, `den cleared: heat ${h0.toFixed(1)} → ${s.raid.heat.toFixed(1)}`);
  check(R.heatTarget(s).parts.some((p) => p.label === 'Pirate dens cleared' && p.value < 0) && R.heatTarget(s).target <= tBefore, 'a lasting cut in the heat target');
  s.raid.heat = 50;
  check(R.raidInterval(s, mulberry32(3)) > iBefore, `raids come less often (${iBefore} → ${R.raidInterval(s, mulberry32(3))} days)`);
}

// ---------------------------------------------------------------- recall

{
  const s = colony(6, T1), rng = stateRng(s), sec = sectorOfType(s, 'den', 2);
  sec.known = true;
  const e = R.launchExpedition(s, sec.id, ids(s)).expedition;
  tick(s, rng, 3);
  const r = R.recallExpedition(s, e.id);
  check(r.ok && e.recalled && e.back === s.day + 3, `recalled after 3 days: back in 3 (${r.msg})`);
  check(!R.recallExpedition(s, e.id).ok, 'cannot recall twice');
  tick(s, rng, 2);
  check(s.guardians.every((g) => g.away) && !e.report, 'still on the way home, never arrived');
  tick(s, rng);
  const ev = s.pending.find((p) => p.kind === 'expedition');
  check(s.guardians.every((g) => !g.away) && ev?.report?.recalled && !sec.visited && s.guardians.every((g) => g.hp === R.maxHp(s, g)), 'home unharmed with an empty report, the sector not visited');
  const s2 = colony(6, T1), b = sectorOfType(s2, 'belt', 1);
  const e2 = R.launchExpedition(s2, b.id, ids(s2)).expedition;
  check(R.recallExpedition(s2, e2.id).ok && !s2.expeditions.away.length && s2.guardians.every((g) => !g.away), 'recalled the day it left: stands down at once');
}

// ---------------------------------------------------------------- save / load mid-expedition, old saves

{
  const a = colony(7, [...T1, 15]), sec = sectorOfType(a, 'den', 1);
  sec.known = true;
  R.launchExpedition(a, sec.id, ids(a, 3), 'general');
  tick(a, stateRng(a), 2);
  const b = loadState(saveState(a));
  check(b.expeditions.away.length === 1 && b.guardians.filter((g) => g.away).length === 3, 'loaded mid-expedition: the squadron is still away');
  tick(a, stateRng(a), 10); tick(b, stateRng(b), 10);
  const sig = (s) => JSON.stringify([s.expeditions, s.guardians, s.stock.credits]);
  check(sig(a) === sig(b) && !b.expeditions.away.length && b.expeditions.log.length === 1, 'the saved and the unsaved colony come home alike');

  const old = newGame({ seed: 8 });
  delete old.expeditions;
  const o = JSON.parse(saveState(old));
  check(!('expeditions' in o), 'an old save without the chart');
  const l = loadState(JSON.stringify(o));
  check(l.expeditions && JSON.stringify(l.expeditions.sectors) === JSON.stringify(R.makeSectors(8)) && Array.isArray(l.expeditions.away), 'an old save gets the chart from its seed on load');
  l.stock.credits = 9999;
  R.addGuardian(l, 0); R.addGuardian(l, 1);
  const v = voyage(l, sectorOfType(l, 'belt', 1), ids(l));
  check(v.launch.ok && v.report && !l.guardians.some((g) => g.away), 'an old save sends and receives a squadron');
}

// ---------------------------------------------------------------- balance

{
  // a plain tier-1 squadron of four: every ring-1 site is safe (Normal)
  let wins = 0, runs = 0, losses = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const s0 = colony(seed, T1, { difficulty: 'normal' });
    for (const x of s0.expeditions.sectors.filter((q) => q.ring === 1)) {
      check(R.expeditionPreview(s0, x.id, ids(s0)).winChance >= 0.85, `seed ${seed}: four tier-1 machines vs ring-1 ${x.site} ≥ 85%`);
      const s = colony(seed, T1, { difficulty: 'normal' }), v = voyage(s, R.sectorOf(s, x.id));
      runs++; if (v.report.won) wins++; losses += v.report.lost.length;
    }
  }
  check(losses === 0 && wins >= runs * 0.85, `ring 1 with tier 1: ${wins}/${runs} won, ${losses} machines lost`);
  // three tier-1 machines manage the ring-1 den too
  const s3 = colony(1, [0, 14, 16], { difficulty: 'normal' });
  check(R.expeditionPreview(s3, sectorOfType(s3, 'den', 1).id, ids(s3)).winChance >= 0.75, 'three tier-1 machines vs the ring-1 den ≥ 75%');
  // ring 3 and the listening post: tier 1 alone is not enough; a commander or a strong squadron is
  const s = colony(1, [...T1, 15, 23], { difficulty: 'normal' }), six = ids(s);
  const den3 = sectorOfType(s, 'den', 3), lp = sectorOfType(s, 'listening');
  den3.known = true; lp.known = true;
  const plain = R.expeditionPreview(s, den3.id, six), led = R.expeditionPreview(s, den3.id, six, 'general'), lpPlain = R.expeditionPreview(s, lp.id, six);
  check(plain.winChance < 0.6 && lpPlain.winChance < 0.45, `six tier-1 machines: ring-3 den ${Math.round(plain.winChance * 100)}%, listening post ${Math.round(lpPlain.winChance * 100)}%`);
  check(led.winChance > plain.winChance + 0.15 && led.winChance >= 0.6 && led.hazard === null, `the General leading: ring-3 den ${Math.round(led.winChance * 100)}%`);
  const lpLed = R.expeditionPreview(s, lp.id, six, 'general');
  check(lpLed.hazard?.avoided && lpLed.winChance > lpPlain.winChance + 0.15, `the General through the listening post's radiation: ${Math.round(lpLed.winChance * 100)}%`);
  const lpSato = R.expeditionPreview(s, lp.id, six, 'sato');
  check(lpSato.hazard?.avoided && lpPlain.hazard && !lpPlain.hazard.avoided && lpPlain.hazard.hurt > 0, 'Sato\'s wits beat ring-3 hazards; without a commander they cost hull');
  const strong = colony(1, STRONG, { difficulty: 'normal', level: 3 }), lpS = sectorOfType(strong, 'listening');
  lpS.known = true;
  check(R.expeditionPreview(strong, lpS.id, ids(strong)).winChance >= 0.6, `six battleships (level 3) vs the listening post: ${Math.round(R.expeditionPreview(strong, lpS.id, ids(strong)).winChance * 100)}%`);
  // the beta army sweeps everything
  const kai = [78, 72, 72, 58, 58, 71, 71, 71, 66, 66, 67, 67, 68, 68, 69, 69, 70, 70, 73, 73, 75, 31, 32, 30, 42, 43, 39, 2, 4, 16];
  const roster = kai.map((type, i) => ({ id: i + 1, type, level: 3 + (i % 7) }));
  const beta = colony(1, [], { beta: true, importSave: { 'el-expansion-campaign-remnant': JSON.stringify({ roster }) }, difficulty: 'normal' });
  const best = [...beta.guardians].filter((g) => R.crewed(beta).has(g.id)).sort((a, b) => R.guardianPower(beta, b) - R.guardianPower(beta, a)).slice(0, 6).map((g) => g.id);
  const worst = Math.min(...beta.expeditions.sectors.map((x) => { x.known = true; return R.expeditionPreview(beta, x.id, best, 'general').winChance; }));
  check(worst >= 0.8, `the beta army's best six under the General: every sector ≥ 80% (worst ${Math.round(worst * 100)}%)`);
  let bw = 0;
  for (const x of beta.expeditions.sectors.filter((q) => q.ring === 3)) { const v = voyage(beta, x, best.filter((id) => beta.guardians.some((g) => g.id === id)), 'general'); if (v.report?.won) bw++; for (const g of beta.guardians) g.hp = R.maxHp(beta, g); }
  check(bw >= 6, `the beta army clears ring 3 (${bw}/7)`);
}

// The goals (version 4, stage 3): "Send out a squadron" and "Clear a pirate den" come after the first
// vault, point the Star chart at the nearest fitting sector, and are met by a visit and a cleared den.
{
  const { GOALS, goalStatus } = await import('../js/colony/goals.js');
  const s = colony(4, [0, 0, 0, 0]);
  const order = GOALS.map((g) => g.id);
  check(order.indexOf('scout') === order.indexOf('vault') + 1 && order.indexOf('den') === order.indexOf('scout') + 1, 'scout and den goals follow the first vault');
  s.goals = { done: order.slice(0, order.indexOf('scout')) };
  let st = goalStatus(s);
  check(st.current?.id === 'scout' && st.current.show?.chart, `the scout goal shows the Star chart (${JSON.stringify(st.current?.show)})`);
  const den = sectorOfType(s, 'den', 1);
  voyage(s, den);
  check(GOALS.find((g) => g.id === 'scout').done(s), 'a visit meets the scout goal');
  check(GOALS.find((g) => g.id === 'den').done(s) === !!den.cleared, 'clearing the ring-1 den meets the den goal');
  s.goals.done.push('scout');
  if (!den.cleared) { st = goalStatus(s); check(st.current?.show?.chart === den.id, 'the den goal points at the uncleared den'); }
}

console.log(`colony-expeditions: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
