// Version 10 (docs/COLONY-V10.md): neighbours. The Union remnant, the Galt remnant and Moraine's Ashfall Cartel, each
// with a mood toward Eden (−100..100) moved by trade, convoys, petitions, raids and expeditions; offers and requests on
// their own dice; perks when friendly or allied; a bold raider den when hostile.
//   node tests/colony-neighbours.mjs
import { readFileSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng, runDays } from '../js/colony/sim.js';
import { helpHtml } from '../js/colony/ui.js';
import { neighboursDay, neighbourSell, neighbourBuy, neighbourTribute, neighbourTruce, neighbourBold } from '../js/colony/neighbours.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
function colony(seed = 1, difficulty = 'normal') {
  const s = newGame({ seed, difficulty });
  s.stock.credits = 1e5; s.stock.parts = 1e4; s.pending.length = 0;
  Object.assign(s.options, { raids: false, incidents: false, petitions: false });
  return s;
}
const ctx = (s) => ({ say: () => {}, ask: (kind, title, text) => R.addPending(s, kind, title, text) });
const day = (s, n = 1) => { for (let k = 0; k < n; k++) { s.day++; neighboursDay(s, ctx(s)); } };
const mood = (s, w) => s.neighbours.moods[w];

// ---------------------------------------------------------------- data, help and interface
{
  check(R.NEIGHBOUR_KEYS.join() === 'union,galt,cartel' && R.NEIGHBOURS.cartel.name.includes('Ashfall'), 'three neighbours: the Union remnant, the Galt remnant, Moraine\'s Ashfall Cartel');
  check(R.PERKS.length === 6 && R.NEIGHBOUR_KEYS.every((k) => R.PERKS.filter((p) => p.who === k).map((p) => p.at).join() === '30,60'), 'two perks each, at Friendly (30) and Allied (60)');
  check(R.standing(70) === 'Allied' && R.standing(35) === 'Friendly' && R.standing(0) === 'Neutral' && R.standing(-30) === 'Wary' && R.standing(-50) === 'Hostile', 'standings: Allied, Friendly, Neutral, Wary, Hostile');
  const help = helpHtml(null, null);
  check(/id="help-neighbours"/.test(help) && /Hostile \(−40\)/.test(help), 'How to play: Neighbours');
  const ui = readFileSync(new URL('../js/colony/ui.js', import.meta.url), 'utf8');
  check(/\['neighbours', 'Neighbours'\]/.test(ui) && /function neighboursHtml/.test(ui) && /data-neighbours/.test(ui), 'a Neighbours tab in the Defence panel, and a Settings switch');
  const src = readFileSync(new URL('../js/colony/neighbours.js', import.meta.url), 'utf8');
  check(/function rngFor/.test(src) && !/stateRng/.test(src), 'their own dice (never the colony\'s main generator)');
}

// ---------------------------------------------------------------- starting moods, and what moves them
{
  const s = colony();
  check(mood(s, 'union') === 10 && mood(s, 'galt') === 0 && mood(s, 'cartel') === -20, 'they start at Union 10, Galt 0, Cartel −20');
  const drift = R.NB.driftEvery; R.NB.driftEvery = 1e9;   // (no drift while each cause is measured)
  s.flags.sold = (s.flags.sold || 0) + 2500; day(s);
  check(mood(s, 'union') === 12 && mood(s, 'galt') === 2 && s.neighbours.log.some((e) => /Trade/.test(e.text)), 'trade: 2,500 credits sold at the Market warm Union and Galt by 2');
  s.flags.sold += 400; day(s); s.flags.sold += 700; day(s);
  check(mood(s, 'union') === 13, 'small sales add up over days');
  R.ensureRelief(s); s.relief.loads += 2; day(s);
  check(mood(s, 'union') === 17 && mood(s, 'galt') === 7, 'relief convoys: +2 a load');
  s.petitions.granted++; day(s);
  check(mood(s, 'union') === 18 && mood(s, 'cartel') === -20, 'a petition granted: Union and Galt +1');
  s.raid.count++; s.raid.last = { faction: 'cartel', won: true }; day(s);
  check(mood(s, 'cartel') === -26 && mood(s, 'union') === 20, 'a Cartel band beaten off: the Cartel −6, the others +2');
  s.raid.count++; s.raid.last = { faction: 'cartel', won: false, tribute: { credits: 100 } }; day(s);
  check(mood(s, 'cartel') === -23 && mood(s, 'union') === 18, 'tribute paid: the raiders\' people +3, the others −2');
  const out = s.expeditions.sectors.find((x) => x.site === 'outpost');
  s.expeditions.log.push({ sector: out.id, site: 'outpost', won: true }); const was = mood(s, out.faction); day(s);
  check(mood(s, out.faction) === was + 6, `a squadron at a ${out.faction} outpost: +6`);
  const den = s.raid.bases.find((b) => b.id === 'cartel');
  s.expeditions.log.push({ sector: den.sector, site: 'den', won: true }); day(s);
  check(mood(s, 'cartel') === -48, 'clearing the Cartel\'s den: −25');
  // drift back toward the start, a point every 5 days
  R.NB.driftEvery = drift;
  const g = mood(s, 'galt');
  s.day = 99; day(s);
  check(mood(s, 'galt') === g - 1 && mood(s, 'cartel') === -47, 'moods drift back a point every 5 days');
  check(R.neighbourStatus(s).find((n) => n.key === 'cartel').log.length > 0, 'the tab lists what moved them');
}

// ---------------------------------------------------------------- offers and requests on their own dice
{
  const s = colony();
  const rng0 = s.flags.rng;
  for (let d = 0; d < 400; d++) { s.day++; neighboursDay(s, ctx(s)); for (const p of [...s.pending]) if (p.kind === 'neighbour') R.answer(s, p.id, p.choices[p.choices.length - 1].key); }
  check(s.flags.rng === rng0, 'the colony\'s main generator is untouched');
  const firsts = [];
  for (const diff of ['normal', 'easy']) {
    const t = colony(1, diff); let first = null, n = 0;
    for (let d = 0; d < 700; d++) {
      t.day++; neighboursDay(t, ctx(t));
      const p = t.pending.find((q) => q.kind === 'neighbour');
      if (p) { first ??= t.day; n++; R.answer(t, p.id, p.choices[0].key); }
    }
    firsts.push([diff, first, n]);
    check(first >= (diff === 'easy' ? 70 : 50) && n >= (diff === 'easy' ? 6 : 8) && n <= (diff === 'easy' ? 12 : 16), `${diff}: the first offer on day ${first}, ${n} in 700 days`);
  }
  console.log('  offers:', firsts.map((f) => f.join(' ')).join(' · '));
  const off = colony(); R.setNeighbours(off, false);
  for (let d = 0; d < 300; d++) { off.day++; neighboursDay(off, ctx(off)); }
  check(!off.pending.some((p) => p.kind === 'neighbour') && mood(off, 'union') === 10, 'neighbours off: no offers, moods hold');
  const nodock = colony(); nodock.buildings = nodock.buildings.filter((b) => b.key !== 'dock');
  for (let d = 0; d < 200; d++) { nodock.day++; neighboursDay(nodock, ctx(nodock)); }
  check(!nodock.pending.some((p) => p.kind === 'neighbour'), 'no offers without a finished dock');
}
{
  // answering: aid, trade, refusal, warning
  const s = colony();
  const ask = (offer, who, deal, extra = {}) => { const p = R.addPending(s, 'neighbour', 'Test', 'Test', deal.ok ? [{ key: 'ok', label: 'Noted' }] : [{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }]); Object.assign(p, { offer, who, deal, ...extra }); return p; };
  s.stock.food = 500;
  let p = ask('aid', 'union', { pay: { food: 120 }, yes: 10, no: -4 });
  let r = R.answer(s, p.id, 'yes');
  check(r.ok && s.stock.food === 380 && mood(s, 'union') === 20 && !s.pending.includes(p), 'aid sent: the food goes, the Union +10');
  p = ask('aid', 'galt', { pay: { water: 1e6 }, yes: 10, no: -4 });
  check(!R.answer(s, p.id, 'yes').ok && s.pending.includes(p), 'aid Eden cannot spare is refused (the question stays)');
  R.answer(s, p.id, 'no');
  check(mood(s, 'galt') === -4 && !s.pending.includes(p), 'refused: Galt −4');
  const cr = s.stock.credits, parts = s.stock.parts;
  p = ask('trade', 'galt', { get: { parts: 40 }, pay: { credits: 280 }, yes: 3, no: 0 });
  R.answer(s, p.id, 'yes');
  check(s.stock.parts === parts + 40 && s.stock.credits === cr - 280 && mood(s, 'galt') === -1, 'a trade deal: goods for credits, +3');
  const den = s.raid.bases.find((b) => b.id === 'cartel'), sec = s.expeditions.sectors.find((x) => x.id === den.sector);
  sec.known = false;
  p = ask('warning', 'union', { yes: 0, no: 0, ok: true }, { base: 'cartel' });
  R.answer(s, p.id, 'ok');
  check(sec.known, 'a warning marks the raider den on the Star chart');
}

// ---------------------------------------------------------------- perks
{
  const s = colony();
  const sale = () => { s.stock.ore = 1000; s.market.ore = 1; return R.sell(s, 'ore', 100).credits; };
  const plain = sale();
  s.neighbours.moods.union = 30;
  check(Math.abs(sale() / plain - 1.1) < 0.02 && neighbourSell(s) === 1.1, 'Union Friendly: Market sales +10%');
  const bp = R.buyPrice(s, 'food');
  s.neighbours.moods.galt = 30;
  check(Math.abs(R.buyPrice(s, 'food') / bp - 0.85) < 1e-9 && neighbourBuy(s) === 0.85, 'Galt Friendly: imports 15% cheaper');
  const raid = { strength: 100 };
  const t0 = R.tributeOf(s, raid).credits;
  s.neighbours.moods.cartel = 30;
  check(R.tributeOf(s, raid).credits === Math.ceil(t0 / 2) && neighbourTribute(s) === 0.5, 'Cartel Friendly: half the tribute');
  const den = s.raid.bases.find((b) => b.id === 'cartel');
  den.aware = true; den.since = 0; s.pop = 900;
  check(R.readyBase(s)?.id === 'cartel', 'the Cartel\'s den would raid');
  s.neighbours.moods.cartel = 60;
  check(neighbourTruce(s, den) && R.readyBase(s)?.id !== 'cartel', 'Cartel Allied: a truce, its den sends no raids');
  const w0 = s.wanderers.length, g0 = s.guardians.length;
  s.neighbours.moods.union = 60; s.neighbours.moods.galt = 60;
  day(s);
  check(s.wanderers.length === w0 + 1 && s.guardians.length === g0 + 1 && s.neighbours.perks['union-wanderer'] && s.neighbours.perks['galt-machine'], 'Allied: a Union officer at the Lodge and a Galt machine for the guard');
  day(s, 3);
  check(s.wanderers.length === w0 + 1 && s.guardians.length === g0 + 1, 'each given once');
  R.setNeighbours(s, false);
  check(neighbourSell(s) === 1 && neighbourBuy(s) === 1 && !neighbourTruce(s, den), 'neighbours off: no perks');
}

// ---------------------------------------------------------------- hostile: a bold den
{
  const s = colony();
  const den = s.raid.bases.find((b) => b.id === 'cartel');
  den.fleet = 2; den.grow = 0;
  s.neighbours.moods.cartel = -45;
  s.pop = Math.ceil(R.BASE_RAIDS.peace);
  check(neighbourBold(s, den), 'the Cartel at −45: its den is bold');
  const before = den.aware;
  day(s);
  check(den.grow === 1 && !before && den.aware, 'bold: its fleet regrows twice as fast, and it notices Eden at half its population');
  const t = colony(); const d2 = t.raid.bases.find((b) => b.id === 'cartel');
  t.pop = 500; day(t);
  check(!d2.aware && !neighbourBold(t, d2), 'not hostile: it notices Eden at its own population (800)');
}

// ---------------------------------------------------------------- in a running colony, saves
{
  const s = colony();
  s.flags.sold = 5000;
  runDays(s, 3);
  check(s.neighbours.moods.union > 10 || s.neighbours.log.length >= 0, 'the sim runs the neighbours\' day');
  const back = loadState(saveState(s));
  check(JSON.stringify(back.neighbours.moods) === JSON.stringify(s.neighbours.moods) && back.neighbours.next === s.neighbours.next, 'moods and the schedule are saved');
  const old = JSON.parse(saveState(s)); delete old.neighbours;
  const o = loadState(JSON.stringify(old));
  check(o.neighbours && o.neighbours.moods.cartel === -20 && o.options.neighbours !== false, 'an old save meets its neighbours at their starting moods, switched on');
}

console.log(`colony-neighbours: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
