// Colony version 4, stage 2 (docs/COLONY-V4.md "Stage 2 build contract: the secrets"): placement on
// seeds 1–20, discoveries on survey, every danger cleared (drones, toxic air, radiation with and without
// a Shield Pylon, flooding), the reactor's deadline failing and met, every vault's requirements and
// reward, survivors joining (Warden Marrow and Tobias Venn as commanders), the final vault, save / load,
// an old stage-1 save gaining its secrets, and a scripted Easy player who reads every log and opens the
// final vault by day 400 without a death.
//   node tests/colony-secrets.mjs
import { newGame, saveState, loadState, mapOf } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { placeSecrets, SECRET } from '../js/colony/secrets.js';
import { LOGS, VAULTS, SURVIVORS, DANGERS } from '../js/colony/data/secrets.js';
import { T } from '../js/colony/data/terrain.js';
import { BUILDING } from '../js/colony/data/buildings.js';
import { TECH } from '../js/colony/data/tech.js';
import { goalStatus } from '../js/colony/goals.js';

let failed = 0, passed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
const SITE_FLOOR = new Set([T.DECK, T.PLAIN, T.FERTILE, T.POOR, T.ROCK, T.CONDUIT, T.HILLS, T.CATACOMB]);
const PREF = Object.fromEntries([...LOGS, ...VAULTS, ...SURVIVORS].map((x) => [x.id, x.deck]));
const landingOf = (s) => s.chambers.find((c) => c.kind === 'landing');
const home = (s) => R.shaftsOf(s).find((k) => k.landing);
const chAt = (s, deck, x, y) => R.chamberOf(s, mapOf(s, deck).ch[y * s.map.w + x]);
const site = (s, ref) => s.secrets.sites.find((x) => x.ref === ref);
const chamberOfSite = (s, ref) => R.chamberOf(s, site(s, ref).chamber);
function rich(seed = 1, opts = {}) {
  const s = newGame({ seed, ...opts });
  s.stock.credits = 100000; s.stock.parts = 10000; s.stock.air = 300; s.pending.length = 0;
  return s;
}
const tick = (s, rng, n = 1) => { for (let k = 0; k < n; k++) dayTick(s, rng); };
// Survey a chamber by hand (whatever its reach) and let a day pass: the discovery happens.
function reveal(s, rng, c) { if (c.status === 'sealed') { c.status = 'surveying'; c.work = 1; } tick(s, rng); }
function walk(v, path, out) {
  if (typeof v === 'number') { if (!Number.isFinite(v)) out.push(path); }
  else if (ArrayBuffer.isView(v)) return out;
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const k in v) walk(v[k], `${path}.${k}`, out);
  return out;
}
const marshIn = (s, c) => R.marshLeft(s, c);
// A finished building put down by hand (tests only): no placement rules.
const putRaw = (s, key, x, y, deck) => { const b = { id: s.nextId++, key, x, y, ...(deck && deck !== 'main' ? { deck } : {}), level: 1, mode: BUILDING[key].modes?.[0].key ?? null, build: 0, off: false }; s.buildings.push(b); return b; };

// ---------------------------------------------------------------- placement, seeds 1–20

for (let seed = 1; seed <= 20; seed++) {
  const s = newGame({ seed }), sec = s.secrets, w = s.map.w, land = landingOf(s);
  const all = [...LOGS.map((l) => l.id), ...VAULTS.map((v) => v.id), ...SURVIVORS.map((g) => g.id)];
  check(sec && sec.sites.length === all.length && all.every((id) => sec.sites.filter((x) => x.ref === id).length === 1), `seed ${seed}: every log, vault and survivor group placed once (${sec?.sites.length})`);
  check(sec.sites.every((x) => x.deck === PREF[x.ref]), `seed ${seed}: every site on its preferred deck (${sec.sites.filter((x) => x.deck !== PREF[x.ref]).map((x) => x.ref).join(', ')})`);
  check(sec.sites.every((x) => x.kind === (x.ref[0] === 'l' ? 'log' : x.ref[0] === 'v' ? 'vault' : 'survivors') && x.id === x.ref && !x.found && !x.done), `seed ${seed}: sites start hidden`);
  const tiles = new Set();
  let bad = [];
  for (const x of sec.sites) {
    const m = mapOf(s, x.deck), i = x.y * w + x.x, c = R.chamberOf(s, x.chamber);
    if (!(m.ch[i] === x.chamber && SITE_FLOOR.has(m.t[i]) && R.deckOf(c) === x.deck && !R.occupancy(s, -1, x.deck)[i] && !tiles.has(`${x.deck}${i}`))) bad.push(x.ref);
    tiles.add(`${x.deck}${i}`);
  }
  check(!bad.length, `seed ${seed}: each site on a free floor tile of its chamber (${bad.join(', ')})`);
  check(!sec.sites.some((x) => x.chamber === land.id) && !sec.dangers.some((d) => d.chamber === land.id), `seed ${seed}: nothing in the landing chamber`);
  const kinds = {};
  for (const d of sec.dangers) kinds[d.kind] = (kinds[d.kind] || 0) + 1;
  check(new Set(sec.dangers.map((d) => d.chamber)).size === sec.dangers.length, `seed ${seed}: at most one danger a chamber`);
  check(sec.dangers.every((d) => d.deck === 'lower' && R.chamberOf(s, d.chamber).deck === 'lower' && R.chamberOf(s, d.chamber).status === 'sealed' && !d.found && !d.done && d.work === 0), `seed ${seed}: dangers on sealed lower chambers`);
  check(kinds.drones >= 3 && kinds.drones <= 4 && kinds.reactor === 1 && kinds.radiation >= 1 && kinds.radiation <= 2 && kinds.toxic >= 2 && kinds.toxic <= 3 && kinds.flooded >= 1 && kinds.flooded <= 3, `seed ${seed}: dangers ${JSON.stringify(kinds)}`);
  const hs = home(s), homeLower = chAt(s, 'lower', hs.x, hs.y), links = R.chamberLinks(s);
  check(!sec.dangers.some((d) => d.chamber === homeLower.id), `seed ${seed}: no danger under the landing lift`);
  check(!sec.dangers.some((d) => d.kind !== 'reactor' && d.kind !== 'radiation' && links.get(homeLower.id).has(d.chamber)), `seed ${seed}: the landing lift's lower neighbours are safe`);
  const core = R.chamberOf(s, sec.core), reactor = sec.dangers.find((d) => d.kind === 'reactor');
  const hasCore = s.chambers.some((c) => c.deck === 'lower' && c.kind === 'core');
  check(reactor.chamber === core.id && (!hasCore || core.kind === 'core'), `seed ${seed}: the reactor in the old core (${core.name}, ${core.kind})`);
  check(sec.dangers.filter((d) => d.kind === 'radiation').every((d) => links.get(core.id).has(d.chamber)), `seed ${seed}: radiation around the core`);
  const dIn = (ref) => R.dangerIn(s, site(s, ref).chamber);
  check(['v_final', 'v_msnp', 'v_msfb'].every((v) => dIn(v)?.kind === 'drones') && dIn('v_final').strength === DANGERS.drones.strength[1] && dIn('v_msnp').strength === DANGERS.drones.strength[0], `seed ${seed}: drones guard the hangars and the final vault (${dIn('v_final').strength})`);
  check(dIn('v_stores')?.kind === 'flooded' && dIn('v_helium')?.kind === 'radiation', `seed ${seed}: the stores behind flooding, the fuel cache behind radiation`);
  check(sec.dangers.filter((d) => d.kind === 'flooded').every((d) => { const c = R.chamberOf(s, d.chamber), n = marshIn(s, c); return n / c.tiles >= SECRET.flooded.share || n >= SECRET.flooded.least; }), `seed ${seed}: flooding where a chamber is mostly under water`);
  // deterministic: the same seed places the same secrets, and placeSecrets again gives the same
  const first = JSON.stringify(sec), again = JSON.stringify(placeSecrets(s));
  check(JSON.stringify(newGame({ seed }).secrets) === first && again === first, `seed ${seed}: deterministic`);
}

// ---------------------------------------------------------------- discovery on survey; logs

{
  const s = rich(1), rng = stateRng(s);
  const l = site(s, 'l03'), c = R.chamberOf(s, l.chamber), inC = R.sitesIn(s, c.id), dz = R.dangerIn(s, c.id);
  check(!R.readLog(s, 'l03').ok, 'a log not found cannot be read');
  check(R.secretStatus(s).logs.list.every((x) => !x.found && x.title === null), 'the journal hides logs not found yet');
  reveal(s, rng, c);
  const p = s.pending.find((x) => x.kind === 'discovery');
  check(l.found && inC.every((x) => x.found) && (!dz || dz.found), `surveying ${c.name} finds its ${inC.length} site(s)${dz ? ' and its danger' : ''}`);
  check(p && ['ruess', 'sato'].includes(p.speaker) && /Warden's log: the requisition/.test(p.text) && p.found.some((f) => f.ref === 'l03') && p.chamber === c.id, `a discovery event (${p?.speaker}): ${p?.text.slice(0, 140)}`);
  check(s.secrets.journal.some((j) => j.kind === 'log' && j.ref === 'l03' && j.day === s.day), 'the journal records the find');
  const r = R.readLog(s, 'l03');
  check(r.ok && r.msg === LOGS.find((x) => x.id === 'l03').text && r.key === 1 && r.keys === 1 && s.secrets.read.includes('l03'), 'readLog gives the text and counts a code part');
  check(R.readLog(s, 'l03').ok && s.secrets.read.filter((x) => x === 'l03').length === 1 && !R.readLog(s, 'nope').ok, 'reading again is harmless; unknown logs refused');
  const st = R.secretStatus(s);
  check(st.logs.read === 1 && st.logs.found >= 1 && st.keys === 1 && st.logs.list.find((x) => x.id === 'l03').title && st.logs.total === 20 && st.vaults.total === 7 && st.survivors.total === 5 && !st.finalOpened, 'secretStatus counts');
  // a whole-colony sweep: one discovery event for several chambers found on the same day
  s.pending.length = 0;
  const more = s.chambers.filter((k) => k.deck === 'upper' && k.status === 'sealed').slice(0, 3);
  for (const k of more) { k.status = 'surveying'; k.work = 1; }
  tick(s, rng);
  check(s.pending.filter((x) => x.kind === 'discovery').length === (more.some((k) => R.sitesIn(s, k.id).length) ? 1 : 0), 'finds of one day come in one event');
  // survey through the real path: the landing lift reaches the lower chamber under it
  const s2 = rich(2), rng2 = stateRng(s2), hs = home(s2), lift = R.build(s2, 'lift', hs.x, hs.y);
  R.byId(s2, lift.id).build = 0;
  const lo = chAt(s2, 'lower', hs.x, hs.y);
  check(R.chamberAction(s2, lo.id, 'survey').ok, 'survey the chamber below the lift');
  tick(s2, rng2, 3);
  check(lo.status === 'surveyed' && R.sitesIn(s2, lo.id).every((x) => x.found), `its sites found (${R.sitesIn(s2, lo.id).length})`);
}

// ---------------------------------------------------------------- dangers

// drones: blocked pressurising, refused without crews, a lost fight wears them down, a won one clears them
{
  const s = rich(3), rng = stateRng(s);
  const d = s.secrets.dangers.find((x) => x.kind === 'drones' && x.strength === DANGERS.drones.strength[0]), c = R.chamberOf(s, d.chamber);
  check(!R.clearDanger(s, c.id).ok && /Survey/.test(R.clearDanger(s, c.id).msg), 'drones not found: nothing to clear');
  reveal(s, rng, c);
  for (const i of c.breaches) putRaw(s, 'seal', i % s.map.w, (i / s.map.w) | 0, 'lower');
  const pr = R.chamberAction(s, c.id, 'pressurise');
  check(!pr.ok && /sentries/.test(pr.msg), `drones block pressurising (${pr.msg})`);
  const none = R.clearDanger(s, c.id);
  check(!none.ok && /crew/.test(none.msg), `no crewed guardians: refused (${none.msg})`);
  // Easy: strength 300 × 0.6 = 180; one Mars (90) against it
  R.addGuardian(s, 0);
  const pv = R.dangerPreview(s, c.id);
  check(pv.attack === 180 && Math.abs(pv.defence - 90) < 1e-6 && Math.abs(pv.winChance - 0.2) < 1e-6 && pv.crewed === 1 && pv.salvage.credits === 150, `preview: ${pv.attack} vs ${pv.defence}, ${Math.round(pv.winChance * 100)}%`);
  const lost = R.clearDanger(s, c.id, () => 0.99);   // dice that always lose
  check(lost.ok && !lost.won && !d.done && d.strength === 250 && lost.report.lostGuardians.length === 1 && !s.guardians.length && s.pending.some((x) => x.kind === 'dronefight'), `a lost fight costs the Mars and wears the drones down (${d.strength}): ${lost.msg}`);
  // three Phoibos and the General: a sure thing
  s.guardians.length = 0;
  for (let k = 0; k < 3; k++) R.addGuardian(s, 15);
  R.assignCommander(s, 'general', s.guardians[0].id);
  const pv2 = R.dangerPreview(s, c.id), c0 = s.stock.credits;
  check(pv2.winChance > 0.9, `three Phoibos and the General: ${Math.round(pv2.winChance * 100)}%`);
  const won = R.clearDanger(s, c.id, () => 0);   // dice that always win
  check(won.ok && won.won && d.done && s.stock.credits > c0 && s.guardians.length === 3 && s.guardians.every((g) => g.level >= 1), `a won fight clears them, pays salvage (${won.msg})`);
  check(R.dangerBlocks(s, c) === null && !/sentries/.test(R.chamberAction(s, c.id, 'pressurise').msg), 'then the chamber can be pressurised');
  check(!R.clearDanger(s, c.id).ok, 'cleared dangers stay cleared');
}
// toxic air and radiation: paid crew work; a Shield Pylon on the deck halves radiation
{
  const s = rich(4), rng = stateRng(s);
  const tox = s.secrets.dangers.find((x) => x.kind === 'toxic'), tc = R.chamberOf(s, tox.chamber);
  reveal(s, rng, tc);
  check(/toxic/.test(R.chamberAction(s, tc.id, 'pressurise').msg) || R.openBreaches(s, tc).length > 0, 'toxic air blocks pressurising');
  for (const i of tc.breaches) putRaw(s, 'seal', i % s.map.w, (i / s.map.w) | 0, 'lower');
  check(/toxic/.test(R.chamberAction(s, tc.id, 'pressurise').msg), 'toxic air blocks pressurising (sealed)');
  const cost = R.costOf(s, DANGERS.toxic.cost), c0 = s.stock.credits, p0 = s.stock.parts;
  const r = R.clearDanger(s, tc.id);
  check(r.ok && tox.work === DANGERS.toxic.days && s.stock.credits === c0 - cost.credits && s.stock.parts === p0 - cost.parts && cost.credits === 180, `decontamination paid (${cost.credits} credits, ${cost.parts} parts on Easy) and started: ${r.msg}`);
  check(!R.clearDanger(s, tc.id).ok, 'no double order');
  tick(s, rng, DANGERS.toxic.days - 1);
  check(!tox.done && tox.work === 1, 'a day of crew work a day');
  tick(s, rng);
  check(tox.done && R.dangerBlocks(s, tc) === null, `decontaminated in ${DANGERS.toxic.days} days: it may be pressurised`);
  const rad = s.secrets.dangers.find((x) => x.kind === 'radiation'), rc = R.chamberOf(s, rad.chamber);
  reveal(s, rng, rc);
  check(R.dangerPreview(s, rc.id).days === DANGERS.radiation.days && !R.dangerPreview(s, rc.id).shielded, 'radiation: 10 days unshielded');
  // a Shield Pylon on the lower deck (it may stand there since stage 2) halves it
  check(R.decksOf(BUILDING.shieldpylon).includes('lower'), 'Shield Pylons stand on the lower deck');
  putRaw(s, 'shieldpylon', 1, 1, 'lower');
  const pv = R.dangerPreview(s, rc.id);
  check(pv.shielded && pv.days === Math.ceil(DANGERS.radiation.days * SECRET.shield), `with a Shield Pylon: ${pv.days} days`);
  R.clearDanger(s, rc.id);
  tick(s, rng, pv.days);
  check(rad.done, 'radiation cleared');
  // the crews on dangers come before construction
  const s2 = rich(4), rng2 = stateRng(s2), t2 = s2.secrets.dangers.find((x) => x.kind === 'toxic');
  reveal(s2, rng2, R.chamberOf(s2, t2.chamber));
  R.clearDanger(s2, t2.chamber);
  const b = R.build(s2, 'depot', ...Object.values(R.findSpot(s2, 'depot', { box: landingOf(s2) })));
  const crews = R.crewsOf(s2);
  tick(s2, rng2);
  check(t2.work === DANGERS.toxic.days - 1 && crews >= 2 && b.ok, 'decontamination takes a crew first');
}
// flooding: Pump Stations may stand in the flooded chamber once surveyed; it clears when dry
{
  const s = rich(5), rng = stateRng(s);
  const fl = s.secrets.dangers.find((x) => x.kind === 'flooded'), c = R.chamberOf(s, fl.chamber);
  const where = () => R.findSpot(s, 'pumpstation', { deck: 'lower', box: c });
  check(!where(), 'no pump in a sealed flooded chamber');
  reveal(s, rng, c);
  const cf = R.clearDanger(s, c.id);
  check(!cf.ok && /Pump Stations/.test(cf.msg), `flooding is not cleared by order (${cf.msg})`);
  for (const i of c.breaches) putRaw(s, 'seal', i % s.map.w, (i / s.map.w) | 0, 'lower');
  check(/flooded/.test(R.chamberAction(s, c.id, 'pressurise').msg), 'flooding blocks pressurising');
  const other = s.chambers.find((k) => k.deck === 'lower' && k.status === 'sealed' && !R.dangerIn(s, k.id));
  other.status = 'surveyed';
  check(!R.findSpot(s, 'pumpstation', { deck: 'lower', box: other }), 'a pump is refused in a dry chamber that is not open');
  const pumps = [];
  for (let k = 0; k < 3; k++) { const p = where(); const r = p && R.build(s, 'pumpstation', p.x, p.y, 'lower'); if (r?.ok) { pumps.push(R.byId(s, r.id)); R.byId(s, r.id).build = 0; } }
  const m0 = marshIn(s, c);
  tick(s, rng);
  const m1 = marshIn(s, c);
  check(pumps.length === 3 && m0 - m1 === 3 * SECRET.pumpOut, `three pumps in the flooded chamber pump out ${m0 - m1} tiles a day (${m0} -> ${m1})`);
  let days = 1;
  while (!fl.done && days < 400) { tick(s, rng); days++; s.pending.length = 0; }
  check(fl.done && marshIn(s, c) === 0 && R.dangerBlocks(s, c) === null, `dry after ${days} days: the danger is gone, the chamber may be pressurised`);
}
// the reactor: found -> a deadline (Easy 90, Normal 60); missed -> damage and resealed chambers; met -> safe
{
  const s = rich(6), rng = stateRng(s);
  const d = s.secrets.dangers.find((x) => x.kind === 'reactor'), c = R.chamberOf(s, d.chamber);
  reveal(s, rng, c);
  check(d.found && d.deadline === s.day + 90, `Easy: the reactor's deadline is 90 days (${d.deadline - s.day})`);
  check(s.pending.some((p) => p.kind === 'discovery' && /stabilise it within 90 days/.test(p.text) && p.speaker === 'sato'), 'the discovery tells the deadline');
  for (const i of c.breaches) putRaw(s, 'seal', i % s.map.w, (i / s.map.w) | 0, 'lower');
  check(R.dangerBlocks(s, c) === null && !/core/.test(R.chamberAction(s, c.id, 'pressurise').msg), 'the reactor does not block pressurising');
  check(R.secretStatus(s).reactor?.left === 90, 'the countdown in secretStatus');
  // buildings on the lower deck and two chambers sealed off but not open
  const lowerB = [putRaw(s, 'depot', 2, 2, 'lower'), putRaw(s, 'depot', 3, 2, 'lower'), putRaw(s, 'battery', 4, 2, 'lower')];
  const shut = s.chambers.filter((k) => k.deck === 'lower' && k.status === 'sealed' && k.id !== c.id).slice(0, 3);
  for (const k of shut) k.status = 'surveyed';
  const warn = [];
  for (let k = 0; k < 90; k++) { tick(s, rng); for (const p of s.pending) if (p.kind === 'reactor') warn.push(p); s.pending.length = 0; }
  check(warn.length === 3 && /30 days/.test(warn[0].text) && /15 days/.test(warn[1].text) && /tore loose/.test(warn[2].text), `two reminders, then the failure (${warn.map((p) => p.title).join(' / ')})`);
  check(d.done && d.failed && s.secrets.journal.some((j) => j.kind === 'failed'), 'the core burned out (failed)');
  const dmg = lowerB.filter((b) => b.damaged > 0).length;
  check(dmg >= 1 && dmg <= 3, `buildings on its deck knocked out (${dmg})`);
  check(shut.filter((k) => k.status === 'sealed').length === 2, 'two sealed-off chambers there sealed again');
  check(!s.buildings.some((b) => R.deckOf(b) !== 'lower' && b.damaged > 0), 'the main deck untouched');
  // Normal: 60 days; stabilised in time -> nothing happens
  const n = rich(6, { difficulty: 'normal' }), rn = stateRng(n);
  const dn = n.secrets.dangers.find((x) => x.kind === 'reactor');
  reveal(n, rn, R.chamberOf(n, dn.chamber));
  check(dn.deadline === n.day + 60, 'Normal: 60 days');
  tick(n, rn, 40);
  const cost = R.costOf(n, DANGERS.reactor.cost), r = R.clearDanger(n, dn.chamber);
  check(r.ok && dn.work === DANGERS.reactor.days && cost.credits === 1000, `stabilising: ${r.msg}`);
  n.pending.length = 0;
  tick(n, rn, DANGERS.reactor.days);
  check(dn.done && !dn.failed && n.pending.some((p) => p.kind === 'reactor' && /safe/.test(p.title)), 'stabilised in time');
  tick(n, rn, 30);
  check(!dn.failed && !n.buildings.some((b) => b.damaged > 0), 'the deadline passes harmlessly');
}

// ---------------------------------------------------------------- vaults

function openUp(s, rng, ref) {   // the vault's chamber surveyed (finds) and open (by hand)
  const c = chamberOfSite(s, ref);
  reveal(s, rng, c);
  c.status = 'open';
  return c;
}
function readOne(s, rng, id) { const c = chamberOfSite(s, id); if (!site(s, id).found) reveal(s, rng, c); return R.readLog(s, id); }
{
  const s = rich(7), rng = stateRng(s);
  // the quarantine stores: drained
  const sc = chamberOfSite(s, 'v_stores');
  check(!R.openVault(s, 'v_stores').ok && /found/.test(R.openVault(s, 'v_stores').msg), 'a vault not found stays shut');
  reveal(s, rng, sc);
  check(/open \(pressurised\)/.test(R.openVault(s, 'v_stores').msg), 'its chamber must be open');
  sc.status = 'open';
  const r0 = R.openVault(s, 'v_stores');
  check(!r0.ok && /no flooded ground/.test(r0.msg), `drained first (${r0.msg})`);
  const m = mapOf(s, 'lower');
  for (let i = 0; i < m.t.length; i++) if (m.ch[i] === sc.id && m.t[i] === T.MARSH) m.t[i] = T.DECK;
  tick(s, rng);
  const p0 = s.stock.parts, cr0 = s.stock.credits, cap = R.storageCaps(s);
  s.stock.alloy = cap.alloy - 20;
  const r1 = R.openVault(s, 'v_stores');
  check(r1.ok && site(s, 'v_stores').done && s.stock.parts === Math.min(cap.parts, p0 + 300) && s.stock.alloy === cap.alloy && s.stock.credits > cr0, `stores opened: ${r1.msg}`);
  check(!R.openVault(s, 'v_stores').ok, 'opened once');
  // the reactor fuel cache: cleared
  const hc = openUp(s, rng, 'v_helium');
  check(/radiation dealt with/.test(R.openVault(s, 'v_helium').msg), 'the fuel cache waits for the radiation');
  R.clearDanger(s, hc.id); tick(s, rng, DANGERS.radiation.days);
  const he0 = s.stock.helium, rp0 = s.research.points;
  const r2 = R.openVault(s, 'v_helium');
  check(r2.ok && s.stock.helium > he0 && s.research.points === rp0 + 80, `fuel cache: ${r2.msg}`);
  // hangar A: key l07 and cleared -> the MSNP-II
  const ac = openUp(s, rng, 'v_msnp');
  check(/read "Venn: the 60% test"/.test(R.openVault(s, 'v_msnp').msg), `hangar A wants Venn's log (${R.openVault(s, 'v_msnp').msg})`);
  check(readOne(s, rng, 'l07').ok && /sentries dealt with/.test(R.openVault(s, 'v_msnp').msg), 'then the sentries');
  for (let k = 0; k < 6; k++) R.addGuardian(s, 15);
  R.clearDanger(s, ac.id, () => 0);
  const g0 = s.guardians.length, r3 = R.openVault(s, 'v_msnp'), proto = s.guardians.at(-1);
  check(r3.ok && s.guardians.length === g0 + 1 && proto.type === 46 && proto.proto && R.machineOf(s, 46).name === 'MSNP-II' && R.guardianPower(s, proto) === 225 && R.maxHp(s, proto) === 8, `the MSNP-II joins the guardians (power ${R.guardianPower(s, proto)}): ${r3.msg}`);
  check(R.guardianList(s).some((g) => g.type === 46 && g.machine.code === 'MSNP-II' && g.upkeep > 0), 'it shows in the guard list');
  // hangar B: key l10 and 40 spare power -> the MSFB-5
  openUp(s, rng, 'v_msfb');
  check(readOne(s, rng, 'l10').ok, 'Venn: 0302 read');
  const pw = R.powerOf(s);
  const need = R.openVault(s, 'v_msfb');
  check(pw.supply - pw.demand < 40 ? !need.ok && /40 spare power/.test(need.msg) : true, `hangar B needs spare power (${need.msg})`);
  for (let k = 0; k < 8; k++) putRaw(s, 'solar', k, 0);
  const r4 = R.openVault(s, 'v_msfb');
  check(r4.ok && s.guardians.at(-1).type === 48 && R.machineOf(s, 48).name === 'MSFB-5' && R.guardianPower(s, s.guardians.at(-1)) === 216, `the MSFB-5 too: ${r4.msg}`);
  // the seed archive: key l02 -> fertile soil and food
  const fc = openUp(s, rng, 'v_seeds'), um = mapOf(s, 'upper');
  const fert = () => { let n = 0; for (let i = 0; i < um.t.length; i++) if (um.ch[i] === fc.id && um.t[i] === T.FERTILE) n++; return n; };
  check(!R.openVault(s, 'v_seeds').ok && readOne(s, rng, 'l02').ok, 'the seed archive wants Pim\'s diary');
  const f0 = fert(), r5 = R.openVault(s, 'v_seeds');
  check(r5.ok && fert() === f0 + 40, `seed archive: 40 tiles made fertile (${f0} -> ${fert()}): ${r5.msg}`);
  // the drafting room: key l14 -> research and Heavy Works
  openUp(s, rng, 'v_blue');
  check(!R.openVault(s, 'v_blue').ok && readOne(s, rng, 'l14').ok, 'the drafting room wants Venn\'s last core log');
  const rp1 = s.research.points, r6 = R.openVault(s, 'v_blue');
  check(r6.ok && s.research.points === rp1 + 200 && s.research.done.includes('heavyworks') && R.techEffect(s, 'machines') >= 3, `drafting room: ${r6.msg}`);
  // the final vault: every code part and its sentries cleared
  const vc = openUp(s, rng, 'v_final');
  const fin0 = R.openVault(s, 'v_final');
  check(!fin0.ok && /code/.test(fin0.msg), `the final vault wants the code (${fin0.msg})`);
  for (const id of ['l03', 'l13', 'l18']) readOne(s, rng, id);
  check(R.secretStatus(s).keys === 5 && /sentries/.test(R.openVault(s, 'v_final').msg), 'five parts read; the sentries remain');
  R.clearDanger(s, vc.id, () => 0);
  s.pending.length = 0;
  const r7 = R.openVault(s, 'v_final'), fv = s.pending.find((p) => p.kind === 'finalvault');
  check(r7.ok && r7.final && s.secrets.finalOpened && fv && fv.speakers.join() === 'ruess,sato,marrow' && s.secrets.journal.some((j) => j.kind === 'final'), `the final vault opens: ${r7.msg.slice(0, 120)}`);
  const st = R.secretStatus(s);
  check(st.finalOpened && st.vaults.opened === 7 && st.vaults.list.every((v) => v.opened), 'every vault open');
  check(!!goalStatus(s).list.find((g) => g.id === 'finalvault'), 'the goals read the secrets');
}

// ---------------------------------------------------------------- survivors

{
  const s = rich(8), rng = stateRng(s);
  const cap0 = R.commanderCap(s), pop0 = s.pop;
  const cc = chamberOfSite(s, 's_crypt');
  reveal(s, rng, cc);
  check(!s.commanders.some((c) => c.key === 'marrow') && s.pop === pop0, 'survivors found wait for their chamber to open');
  cc.status = 'open'; s.pending.length = 0;
  tick(s, rng);
  const mp = s.pending.find((p) => p.kind === 'survivors');
  check(site(s, 's_crypt').done && s.commanders.some((c) => c.key === 'marrow') && mp?.commander === 'marrow', `the catacomb survivors join with Warden Marrow (${mp?.text.slice(0, 100)})`);
  check(R.commanderCap(s) === cap0 + 1 && R.commanderList(s).find((c) => c.key === 'marrow')?.name === 'Warden Ilse Marrow', 'Marrow brings her own room');
  // Venn waits for his log
  const vc = chamberOfSite(s, 's_venn');
  reveal(s, rng, vc); vc.status = 'open'; tick(s, rng);
  check(!site(s, 's_venn').done && /wait for word/.test(R.secretStatus(s).survivors.list.find((g) => g.ref === 's_venn').waiting), 'Venn waits for "Venn: for whoever comes"');
  readOne(s, rng, 'l20'); tick(s, rng);
  check(site(s, 's_venn').done && s.commanders.some((c) => c.key === 'venn') && R.commanderCap(s) === cap0 + 2, 'then Tobias Venn joins');
  // they serve like any commander: lead a machine, head a department, draw wages
  const g = R.addGuardian(s, 16);
  check(R.assignCommander(s, 'venn', g.id).ok && R.leadMult(s, 'venn', R.machineOf(s, 16)) > 1 && R.setDepartment(s, 'marrow', 'welfare').ok, 'Venn leads a Cyclops, Marrow heads Welfare');
  const others = ['s_garden', 's_pumps', 's_market'].map((id) => chamberOfSite(s, id));
  for (const c of others) reveal(s, rng, c);
  const p1 = s.pop;
  for (const c of others) c.status = 'open';
  tick(s, rng);
  check(R.secretStatus(s).survivors.joined === 5 && s.pop >= p1 + 24 + 15 + 18 - 5, `every group joins (pop ${p1} -> ${s.pop})`);
}

// ---------------------------------------------------------------- save / load; an old stage-1 save

{
  const s = rich(9), rng = stateRng(s);
  reveal(s, rng, chamberOfSite(s, 'l05')); R.readLog(s, 'l05');
  const text = saveState(s), back = loadState(text);
  check(saveState(back) === text && JSON.stringify(back.secrets) === JSON.stringify(s.secrets), 'save/load round trip keeps the secrets');
  const ra = stateRng(s), rb = stateRng(back);
  for (let k = 0; k < 20; k++) { dayTick(s, ra); dayTick(back, rb); }
  check(saveState(s) === saveState(back), 'a loaded colony continues identically');
  // a stage-1 save (no secrets): placed on load, the same as a new game's
  const fresh = newGame({ seed: 9 }), old = JSON.parse(saveState(fresh));
  delete old.secrets;
  const loaded = loadState(JSON.stringify(old));
  check(loaded.secrets && JSON.stringify(loaded.secrets) === JSON.stringify(fresh.secrets), 'an old stage-1 save gains the same secrets on load');
  // a played stage-1 save: chambers already open hold no danger; what they hide is found on the next day
  const played = newGame({ seed: 9 }), rp = stateRng(played);
  for (const c of played.chambers.filter((k) => !k.deck && k.status === 'sealed').slice(0, 4)) c.status = 'open';
  for (const c of played.chambers.filter((k) => k.deck === 'lower').slice(0, 5)) c.status = 'open';
  const ps = JSON.parse(saveState(played));
  delete ps.secrets;
  const pl = loadState(JSON.stringify(ps)), rl = stateRng(pl);
  check(pl.secrets.dangers.every((d) => R.chamberOf(pl, d.chamber).status === 'sealed') && pl.secrets.dangers.some((d) => d.kind === 'drones'), 'old save: dangers only behind sealed doors');
  tick(pl, rl);
  const openSites = pl.secrets.sites.filter((x) => R.chamberOf(pl, x.chamber).status === 'open');
  check(openSites.length > 0 && openSites.every((x) => x.found) && pl.pending.filter((p) => p.kind === 'discovery').length === 1, `old save: ${openSites.length} sites in open chambers found the next day, one event`);
  check(!walk(pl, 'state', []).length, 'no NaN');
}

// ---------------------------------------------------------------- the scripted Easy player

// The goal-following player of tests/colony-v3.mjs (farms, air, water, power, homes, research, a
// guard), plus the secrets: lifts on every shaft it can reach, every reachable chamber surveyed, the
// chambers opened one per deck at a time (those with sites and the way onward first), dangers
// cleared as found (decontamination paid, sentries fought at 80%+, pumps in flooded chambers, the
// reactor stabilised), logs read and vaults opened when they can be.
function placeAny(s, key, score, deck = 'main', box) {
  const cc = s.buildings.find((b) => b.key === 'command'), dock = s.buildings.find((b) => b.key === 'dock');
  const zone = R.spec({ key }).zone, nearB = zone === 'space' ? dock : cc;
  box ||= zone === 'space' ? { x0: nearB.x - 26, y0: nearB.y - 26, x1: nearB.x + 26, y1: nearB.y + 26 } : { x0: 0, y0: 0, x1: s.map.w - 1, y1: s.map.h - 1 };
  const p = R.findSpot(s, key, { box, deck, score: score || ((x, y) => Math.abs(x - nearB.x) + Math.abs(y - nearB.y)) });
  return p ? R.build(s, key, p.x, p.y, deck) : { ok: false };
}
const queued = (s, key) => s.buildings.some((b) => b.key === key && b.build > 0);
const count = (s, key) => s.buildings.filter((b) => b.key === key).length;
const fin = (s, key) => s.buildings.filter((b) => b.key === key && b.build === 0).length;
function upkeep(s) {
  const m = R.summary(s), place = (key) => (queued(s, key) ? null : placeAny(s, key));
  if (s.stock.credits < 150 && s.stock.food > 150) R.sell(s, 'food', Math.floor(s.stock.food - 120));
  const queuedF = s.buildings.filter((b) => b.key === 'farm' && b.build > 0).length;
  if ((m.stock.food.delta < 3 || s.stock.food < 150) && queuedF < (s.stock.food < 150 ? 3 : 1)) placeAny(s, 'farm');
  // more crews once there is money: the secrets keep them busy (seals, decontamination, the core)
  if (s.stock.credits > 2500 && count(s, 'repairyard') < 4 && !queued(s, 'repairyard')) placeAny(s, 'repairyard');
  // air (and the water it is made from) ahead of need: survivors arrive by the dozen, chambers leak
  const queuedN = (key) => s.buildings.filter((b) => b.key === key && b.build > 0).length;
  if ((m.stock.air.delta < 3 || s.stock.air < 120) && queuedN('airplant') < (s.stock.air < 60 ? 2 : 1)) placeAny(s, 'airplant');
  if ((m.stock.water.delta < 2 || s.stock.water < 100) && queuedN('riverpump') < 1) placeAny(s, 'riverpump');
  if (m.power.demand > m.power.supply * 0.9) place('solar');
  if (m.housing - s.pop < 12) place('habitat');
  if (s.happy < 60 && m.stock.credits.have > 400) place('park');
  const keepOre = count(s, 'smelter') ? 120 : 0;
  if (s.stock.ore > keepOre + 50) R.sell(s, 'ore', Math.floor(s.stock.ore - keepOre));
  const keepAlloy = count(s, 'fabricator') ? 60 : 0;
  if (s.stock.alloy > keepAlloy + 30) R.sell(s, 'alloy', Math.floor(s.stock.alloy - keepAlloy));
  if (s.stock.helium > 40 && !count(s, 'fusion')) R.sell(s, 'helium', Math.floor(s.stock.helium - 20));
}
function work(s, c) {   // one step on a chamber: survey, seal, pressurise (an air depot when the stores are too small)
  if (c.status === 'sealed') return R.chamberAction(s, c.id, 'survey');
  if (c.status !== 'surveyed') return null;
  const open = R.openBreaches(s, c);
  if (open.length) { for (const i of open) if (!s.buildings.some((b) => b.key === 'seal' && R.deckOf(b) === R.deckOf(c) && b.y * s.map.w + b.x === i)) R.build(s, 'seal', i % s.map.w, (i / s.map.w) | 0, c.deck); return null; }
  if (R.dangerBlocks(s, c)) return null;
  if (s.day > 40 && s.stock.air - R.pressuriseAir(s, c) < 40) return null;   // never pressurise the stores dry
  if (R.pressuriseAir(s, c) > (R.storageCaps(s).air || 0) && !queued(s, 'depot')) { const r = placeAny(s, 'depot'); if (r.id) R.setMode(s, r.id, 'air'); }
  return R.chamberAction(s, c.id, 'pressurise');
}
function followGoal(s) {
  const g = goalStatus(s).current, sh = g?.show;
  if (!sh) return;
  if (sh.build) { if (!queued(s, sh.build) && (sh.build !== 'lab' || !count(s, 'lab')) && sh.build !== 'lift') { const r = placeAny(s, sh.build); if (sh.build === 'depot' && r?.id) R.setMode(s, r.id, 'air'); } }
  else if (sh.chamber !== undefined) { const c = R.chamberOf(s, sh.chamber); if (!c.deck) work(s, c); }
  else if (sh.tile && g.id === 'seal') R.build(s, 'seal', sh.tile.x, sh.tile.y);
  else if (sh.roads) { const c = s.chambers.find((k) => !k.deck && k.status === 'open' && k.kind !== 'landing'); c && roadInto(s, c); }
  else if (sh.market) { if (s.stock.ore) R.sell(s, 'ore', s.stock.ore); else R.sell(s, 'food', 10); }
}
function roadInto(s, c, fromAnywhere = false) {   // tests/colony-v3.mjs's: the shortest road from ours into chamber c
  const { w, h, ch } = s.map, road = new Set(s.buildings.filter((b) => b.key === 'road' && !b.deck).map((b) => b.y * w + b.x));
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
const ORDER = ['smelting', 'fabrication', 'medicine', 'machineworks', 'canteens', 'deepdrill', 'reclaim', 'safety', 'sensors', 'shields'];
function v2(s) {
  if (s.unlocked.includes('lab') && !count(s, 'lab')) placeAny(s, 'lab');
  if (!s.research.focus) { const t = ORDER.find((k) => R.techStatus(s).find((x) => x.key === k)?.available); if (t) R.research(s, t); }
  if (s.unlocked.includes('smelter') && !count(s, 'smelter')) placeAny(s, 'smelter');
  if (count(s, 'smelter') && count(s, 'oremine') < 2 && !queued(s, 'oremine')) {
    const seam = (x, y) => { let n = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (s.map.r[(y + dy) * s.map.w + x + dx] === 1) n++; const d = s.buildings.find((b) => b.key === 'dock'); return -n * 100 + Math.abs(x - d.x) + Math.abs(y - d.y); };
    placeAny(s, 'oremine', seam);
  }
  if (s.unlocked.includes('fabricator') && count(s, 'smelter') && !count(s, 'fabricator')) placeAny(s, 'fabricator');
}
function defend(s) {
  if (!s.unlocked.includes('arsenal')) return;
  if (!count(s, 'arsenal')) return placeAny(s, 'arsenal');
  if (!count(s, 'barracks') && s.stock.credits > 600) placeAny(s, 'barracks');
  if (fin(s, 'arsenal') && !count(s, 'scrapyard') && s.guardians.length >= 2 && s.stock.credits > 800) placeAny(s, 'scrapyard');
  const want = Math.min(R.crewCap(s), 4 + Math.floor(Math.max(0, s.day - 60) / 30) * 2);
  if (fin(s, 'arsenal') && s.guardians.length + s.production.length < want && s.stock.credits > 900 && !saving) {
    const best = R.machineList(s).filter((m) => m.ok && m.at === 'arsenal' && m.cost.credits < s.stock.credits - 700).sort((a, b) => (b.attack + b.defence) - (a.attack + a.defence))[0];
    if (best) R.orderMachine(s, best.type);
  }
  if (s.guardians.length >= R.crewCap(s) && count(s, 'barracks') < 2 && !queued(s, 'barracks') && s.stock.credits > 2500) placeAny(s, 'barracks');
  const top = [...s.guardians].sort((a, b) => R.guardianPower(s, b) - R.guardianPower(s, a))[0];
  if (top && !s.guardians.some((g) => g.commander === 'general')) R.assignCommander(s, 'general', top.id);
  if (!s.commanders.find((c) => c.key === 'sato').dept) R.setDepartment(s, 'sato', 'security');
}
const reserve = 500;
let saving = false;   // the old core is stirring: every credit goes to stabilising it
function secrets(s, when) {
  const st = R.secretStatus(s), w = s.map.w;
  saving = !!st.reactor && !st.reactor.working;
  for (const l of st.logs.list) if (l.found && !l.read) R.readLog(s, l.id);
  for (const v of st.vaults.list) if (v.canOpen) { const r = R.openVault(s, v.id); if (r.ok) when[v.ref] = s.day; }
  for (const d of st.dangers) {
    if (d.done) continue;
    if (d.kind === 'drones') {
      const healthy = s.guardians.every((g) => g.hp >= R.maxHp(s, g) * 0.7);
      if (d.winChance >= 0.8 && healthy && !s.raid.coming) { const r = R.clearDanger(s, d.chamber); when.fights = (when.fights || 0) + 1; if (r.won) when[`drones${d.strength}`] ??= s.day; }
    } else if (d.kind === 'flooded') {
      const c = R.chamberOf(s, d.chamber), pumps = s.buildings.filter((b) => b.key === 'pumpstation' && R.deckOf(b) === 'lower' && s.decks.lower.ch[b.y * w + b.x] === c.id).length;
      if (c.status === 'surveyed' && pumps < 3 && s.stock.credits > reserve && !saving) placeAny(s, 'pumpstation', null, 'lower', c);
    } else if (!d.work && !d.why && (d.kind === 'reactor' ? s.stock.parts - d.cost.parts >= 30 || d.left <= 30 : !saving && s.stock.credits - d.cost.credits > reserve && s.stock.parts - d.cost.parts >= 60)) R.clearDanger(s, d.chamber);
  }
  // parts are for air plants and farms first: the secrets wait while the stores hold under 60
  if (s.day < 30 || saving || s.stock.parts < 60) return;
  // lifts: the landing shaft first, then any shaft through an open chamber
  for (const sh of R.shaftsOf(s)) {
    if (R.liftAt(s, sh.x, sh.y) || s.buildings.some((b) => b.key === 'lift' && b.x === sh.x && b.y === sh.y)) continue;
    const deck = ['main', 'lower', 'upper'].find((dk) => chAt(s, dk, sh.x, sh.y)?.status === 'open');
    if (deck && s.stock.credits > reserve + 400) { R.build(s, 'lift', sh.x, sh.y, deck); break; }
  }
  // surveys: everything in reach
  for (const c of s.chambers) if (c.status === 'sealed' && s.stock.credits > reserve + 100) { const r = R.chamberAction(s, c.id, 'survey'); if (r.ok) when.surveys = (when.surveys || 0) + 1; }
  // opening: one chamber per deck at a time, the one already begun first, else those with something
  // inside and a way onward; pressurised only with air to spare (a buffer of 80 in the stores, the
  // plants ahead of the use) and another air depot when the stores are too small for it
  const links = R.chamberLinks(s);
  const airOk = (c) => R.summary(s).stock.air.delta >= 3 && s.stock.air - R.pressuriseAir(s, c) >= 80;
  for (const deck of ['lower', 'upper', 'main']) {
    if (deck === 'main' && s.day < 80) continue;
    const on = s.chambers.filter((c) => R.deckOf(c) === deck);
    if (on.some((c) => c.status === 'pressurising')) continue;
    const begun = (c) => c.status === 'surveyed' && !R.dangerBlocks(s, c) && (s.buildings.some((b) => b.key === 'seal' && R.deckOf(b) === deck && c.breaches.includes(b.y * w + b.x)) || !c.breaches.length);
    const want = (c) => {
      const sites = R.sitesIn(s, c.id).filter((x) => !x.done).length, onward = [...links.get(c.id)].filter((id) => R.chamberOf(s, id).status === 'sealed').length;
      return -(sites * 3 + onward * 2) + c.tiles / 400;
    };
    const c = on.find(begun) || (s.stock.credits > reserve + 300 ? on.filter((k) => k.status === 'surveyed' && !R.dangerBlocks(s, k)).sort((a, b) => want(a) - want(b))[0] : null);
    if (!c) continue;
    if (R.openBreaches(s, c).length) { work(s, c); continue; }
    if (R.pressuriseAir(s, c) + 100 > (R.storageCaps(s).air || 0)) { if (!queued(s, 'depot')) { const r = placeAny(s, 'depot'); if (r.id) R.setMode(s, r.id, 'air'); } continue; }
    if (airOk(c)) work(s, c);
  }
}
function play(seed, days = 400) {
  const s = newGame({ seed }), rng = stateRng(s), when = {}, t0 = performance.now();
  let deaths = 0;
  for (let d = 0; d < days; d++) {
    followGoal(s); upkeep(s); v2(s); defend(s); secrets(s, when);
    const before = s.pop;
    dayTick(s, rng);
    if (s.pop < before && s.log.some((l) => l.day === s.day && /died/.test(l.text))) deaths += before - s.pop;
    const st = s.secrets;
    if (st.read.length >= 5) when.logs5 ??= s.day;
    if (st.read.length >= LOGS.length) when.logsAll ??= s.day;
    if (st.read.filter((id) => R.KEY_LOGS.includes(id)).length >= 5) when.code ??= s.day;
    if (st.finalOpened) when.final ??= s.day;
    for (const x of st.sites) if (x.kind === 'survivors' && x.done) when[x.ref] ??= s.day;
    for (const dz of st.dangers) if (dz.done) when[`${dz.kind}@${dz.chamber}`] ??= s.day;
    for (const p of [...s.pending]) if (p.kind === 'raid') R.answer(s, p.id, 'fight');
    s.pending.length = 0;
  }
  return { s, when, deaths, ms: performance.now() - t0 };
}
for (const seed of process.env.QUICK ? [] : process.env.SEEDS ? process.env.SEEDS.split(",").map(Number) : [1, 2, 3]) {
  const { s, when, deaths, ms } = play(seed);
  const st = R.secretStatus(s), ds = R.deckSummary(s);
  console.log(`secrets player seed ${seed} (easy): day ${s.day} pop ${s.pop} happy ${Math.round(s.happy)} deaths ${deaths} guardians ${s.guardians.length}; logs ${st.logs.read}/${st.logs.total}, vaults ${st.vaults.opened}/${st.vaults.total}, survivors ${st.survivors.joined}/${st.survivors.total}, dangers cleared ${s.secrets.dangers.filter((d) => d.done && !d.failed).length}/${s.secrets.dangers.length}${s.secrets.dangers.some((d) => d.failed) ? ' (reactor failed)' : ''}; open upper ${ds.upper.open}/${ds.upper.total}, main ${ds.main.open}/${ds.main.total}, lower ${ds.lower.open}/${ds.lower.total} (${ms.toFixed(0)} ms)`);
  console.log('   ', Object.entries(when).map(([k, d]) => `${k}@${d}`).join(' '));
  check(st.logs.read === LOGS.length && when.final && when.final <= 400, `seed ${seed}: every log read (${st.logs.read}) and the final vault open by day 400 (${when.final})`);
  check(deaths === 0 && !s.flags.lost, `seed ${seed}: no deaths (${deaths})`);
  check(s.commanders.some((c) => c.key === 'marrow'), `seed ${seed}: Warden Marrow serves`);
  check(!s.secrets.dangers.some((d) => d.failed), `seed ${seed}: the reactor made safe in time`);
  check(!walk(s, 'state', []).length && R.GOODS.every((g) => s.stock[g] >= 0), `seed ${seed}: no NaN, no negative stock`);
}

console.log(`\n${failed ? `${failed} of ${failed + passed} checks FAILED` : `all ${passed} checks passed`}`);
process.exitCode = failed ? 1 : 0;
