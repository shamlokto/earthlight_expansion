// Version 4, stage 4: relief convoys and the win, Eden Restored (docs/COLONY-V4.md §4, D24, D25).
//   node tests/colony-victory.mjs
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick as tick0, stateRng } from '../js/colony/sim.js';
const dayTick = (s) => tick0(s, stateRng(s));
import { GOALS, goalStatus } from '../js/colony/goals.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };

function colony(seed = 1, difficulty) {
  const s = newGame({ seed, ...(difficulty ? { difficulty } : {}) });
  s.stock.credits = 50000; s.stock.parts = 5000; s.stock.food = 3000; s.stock.water = 3000; s.stock.air = 3000; s.stock.helium = 100;
  s.pending.length = 0;
  return s;
}
const relief = (s) => s.expeditions.sectors.find((x) => x.site === 'relief' && x.ring === 1);

// Convoys: refused without a reached relief station, then one a day, with cost and pay (version 6 numbers).
{
  const s = colony(3);
  check(!R.sendConvoy(s, 'food').ok && /relief station/.test(R.convoyWhy(s, 'food')), 'no convoy before a relief station is reached');
  check(/Earth does not need/.test(R.convoyWhy(s, 'ore')), 'ore is not a relief good');
  relief(s).visited = true;
  const before = { food: s.stock.food, credits: s.stock.credits, parts: s.stock.parts }, c = R.convoyCost(s);
  const r = R.sendConvoy(s, 'food');
  check(r.ok && !r.heavy, `a food convoy leaves from the dock (${r.msg})`);
  check(s.stock.food === before.food - 500, 'it carries 500 food');
  check(s.stock.credits === before.credits - c.credits + R.convoyPay('food') && s.stock.parts === before.parts - c.parts, 'it costs credits and parts, and Earth pays');
  check(s.relief.sent === 1 && s.relief.loads === 1 && s.relief.byGood.food === 1, 'the convoy is counted as one load');
  check(!R.sendConvoy(s, 'water').ok && /One convoy a day/.test(R.convoyWhy(s, 'water')), 'only one convoy a day');
  s.day++;
  check(R.sendConvoy(s, 'helium').ok && s.relief.loads === 2 && s.stock.helium === 0, 'the next day a helium convoy (100) leaves');
  s.day++; s.stock.air = 50;
  check(/there are 50 in store/.test(R.convoyWhy(s, 'air') || ''), 'a convoy needs a full load');
  check(/Mass Driver/.test(R.convoyWhy(s, 'food', true) || ''), 'heavy launches need a Mass Driver');
  const st = R.convoyStatus(s);
  check(st.sent === 2 && st.loads === 2 && st.goods.length === 4 && st.station === relief(s).name && !st.driver, 'convoyStatus reads it');
  // a Mass Driver: heavy launches of three loads, and on Automatic it launches by itself
  const md = { id: s.nextId++, key: 'massdriver', x: 0, y: 0, level: 1, mode: 'manual', build: 0, off: false };
  s.buildings.push(md);
  s.stock.food = 3000; s.stock.credits = 50000; s.stock.parts = 5000;
  const hc = R.convoyCost(s, true), cr0 = s.stock.credits;
  const h = R.sendConvoy(s, 'food');
  check(h.ok && h.heavy && s.stock.food === 1500 && s.relief.loads === 5 && s.stock.credits === cr0 - hc.credits + R.convoyPay('food', true), `with a Mass Driver a convoy is a heavy launch of 1,500 (${h.msg})`);
  check(hc.credits > c.credits && hc.credits < 3 * c.credits, 'a heavy launch costs more than one convoy, less than three');
  md.mode = 'auto'; s.pending.length = 0;
  s.buildings.push({ id: s.nextId++, key: 'granary', x: 0, y: 4, level: 1, mode: null, build: 0, off: false });   // room for 2,500 more food
  s.stock.food = 2700; s.pop = 10;
  const l0 = s.relief.loads;
  dayTick(s);
  check(s.relief.loads === l0 + 3 && s.relief.last === s.day, `an automatic Mass Driver launches by itself (${s.relief.loads - l0} loads)`);
  dayTick(s);
  check(s.relief.loads <= l0 + 6, 'still one a day');
  s.stock.water = 0; s.stock.food = 0; s.stock.air = 0; s.stock.helium = 0;
  const l1 = s.relief.loads;
  dayTick(s);
  check(s.relief.loads === l1, 'it keeps ten days of needs at home: nothing to spare, no launch');
  s.buildings = s.buildings.filter((b) => b.key !== 'dock');
  check(/dock/.test(R.convoyWhy(s, 'food')), 'dock convoys need a dock');
}

// Quotas and targets by difficulty.
{
  const e = colony(2, 'easy'), n = colony(2, 'normal');
  check(R.quotaOf(e) === 60 && R.quotaOf(n) === 90, 'quota: 60 loads on Easy, 90 on Normal');
  check(R.popTargetOf(e) === 25000 && R.popTargetOf(n) === 25000, 'population: 25,000 on both');
  check(R.HAPPY_TARGET.above === 85 && R.HAPPY_TARGET.days === 30, 'happiness above 85 for 30 days');
  check(R.convoyCost(e).credits < R.convoyCost(n).credits, 'convoys are cheaper on Easy');
}

// The happiness clock: +1 a day above 85, −3 a day at or below, capped at 30.
{
  const s = colony(6, 'easy');
  R.ensureRelief(s);
  s.relief.happyDays = 0;
  // drive victoryDay directly (dayTick recomputes happiness)
  const tick = (h) => { s.happy = h; s.day++; R.victoryStatus(s); return import('../js/colony/victory.js').then((m) => m.victoryDay(s)); };
  for (let k = 0; k < 10; k++) await tick(90);
  check(s.relief.happyDays === 10, `ten happy days count ten (${s.relief.happyDays})`);
  await tick(85);
  check(s.relief.happyDays === 7, 'a day at 85 takes three away');
  for (let k = 0; k < 40; k++) await tick(99);
  check(s.relief.happyDays === 30 && R.victoryStatus(s).happy.met, 'capped at 30: the happiness part is met');
}

// The win: all four parts, once; the colony carries on and the save remembers it.
{
  const s = colony(5, 'easy');
  const v0 = R.victoryStatus(s);
  check(!v0.met && v0.chambers.need === s.chambers.length && v0.chambers.need > 40, `the win needs every chamber on every deck (${v0.chambers.need})`);
  dayTick(s);
  check(!s.victory, 'no win at the start');
  // meet three parts of four: still no win
  for (const c of s.chambers) c.status = 'open';
  s.relief = { sent: 20, loads: 60, byGood: { food: 60 }, last: null, happyDays: 30 };
  s.happy = 95;
  dayTick(s);
  check(!s.victory, 'no win without the population');
  s.pop = 26000;
  check(R.victoryStatus(s).pop.met, 'population part met');
  s.relief.loads = 59;
  check(!R.victoryStatus(s).met, 'no win one load short');
  s.relief.loads = 60; s.relief.happyDays = 29;
  check(!R.victoryStatus(s).met, 'no win a happy day short');
  // the last day: force the happiness above 85 by checking the status directly after the clock runs
  s.relief.happyDays = 30; s.pending.length = 0;
  const { victoryDay } = await import('../js/colony/victory.js');
  s.happy = 95;
  check(victoryDay(s) && !!s.victory && s.victory.convoys === 60 && s.victory.happy === 95, 'every part met: Eden Restored');
  const ev = s.pending.find((p) => p.kind === 'victory');
  check(!!ev && ev.choices[0].key === 'keep', 'the ending is a victory event with "keep building"');
  check(R.answer(s, ev.id, 'keep').ok && !s.pending.some((p) => p.kind === 'victory'), 'answering it closes the ending');
  const day = s.victory.day;
  s.pending.length = 0;
  for (let k = 0; k < 5; k++) dayTick(s);
  check(!s.pending.some((p) => p.kind === 'victory') && s.victory.day === day, 'the ending plays once; the days go on');
  const l = loadState(saveState(s));
  check(l.victory?.day === day && l.relief.loads === 60, 'the save keeps the victory and the convoys');
  // a version-4 save: its convoys count a load each
  const old = colony(7); old.relief = { sent: 9, byGood: { food: 9 }, last: 3 };
  check(R.ensureRelief(old).loads === 9 && old.relief.happyDays === 0, 'an old save\'s convoys count a load each');
}

// The goals: station, convoy and Eden Restored come after the den, before the Ninefold vault.
{
  const order = GOALS.map((g) => g.id);
  check(order.indexOf('station') === order.indexOf('den') + 1 && order.indexOf('convoy') === order.indexOf('station') + 1
    && order.indexOf('restored') === order.indexOf('convoy') + 1 && order.indexOf('finalvault') === order.indexOf('restored') + 1, `stage 4 goals in order (${order.slice(-6).join(', ')})`);
  const s = colony(4);
  s.goals = { done: order.slice(0, order.indexOf('station')) };
  let st = goalStatus(s);
  check(st.current?.id === 'station' && st.current.show?.chart === relief(s).id, `the station goal points at the ring-1 relief station (${JSON.stringify(st.current?.show)})`);
  relief(s).visited = true;
  s.goals.done.push('station');
  st = goalStatus(s);
  check(st.current?.id === 'convoy' && st.current.show?.market, 'the convoy goal opens the Market');
  R.sendConvoy(s, 'water'); s.goals.done.push('convoy');
  st = goalStatus(s);
  check(st.current?.id === 'restored' && /chambers .* colonists .* happiness .* convoy loads/.test(st.current.progress), `the win goal shows its progress (${st.current?.progress})`);
}

console.log(`colony-victory: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
