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

// Convoys: refused without a reached relief station, then one a day, with cost and pay.
{
  const s = colony(3);
  check(!R.sendConvoy(s, 'food').ok && /relief station/.test(R.convoyWhy(s, 'food')), 'no convoy before a relief station is reached');
  check(/Earth does not need/.test(R.convoyWhy(s, 'ore')), 'ore is not a relief good');
  relief(s).visited = true;
  const before = { food: s.stock.food, credits: s.stock.credits, parts: s.stock.parts }, c = R.convoyCost(s);
  const r = R.sendConvoy(s, 'food');
  check(r.ok, `a food convoy leaves (${r.msg})`);
  check(s.stock.food === before.food - 100, 'it carries 100 food');
  check(s.stock.credits === before.credits - c.credits + R.convoyPay('food') && s.stock.parts === before.parts - c.parts, 'it costs credits and parts, and Earth pays');
  check(s.relief.sent === 1 && s.relief.byGood.food === 1, 'the convoy is counted');
  check(!R.sendConvoy(s, 'water').ok && /One convoy a day/.test(R.convoyWhy(s, 'water')), 'only one convoy a day');
  s.day++;
  check(R.sendConvoy(s, 'helium').ok && s.relief.sent === 2, 'the next day a helium convoy leaves');
  s.day++; s.stock.air = 50;
  check(/there are 50 in store/.test(R.convoyWhy(s, 'air') || ''), 'a convoy needs a full load');
  const st = R.convoyStatus(s);
  check(st.sent === 2 && st.goods.length === 4 && st.station === relief(s).name, 'convoyStatus reads it');
  s.buildings = s.buildings.filter((b) => b.key !== 'dock');
  check(/dock/.test(R.convoyWhy(s, 'food')), 'convoys need a dock');
}

// Quotas and targets by difficulty.
{
  const e = colony(2, 'easy'), n = colony(2, 'normal');
  check(R.quotaOf(e) === 12 && R.quotaOf(n) === 20, 'quota: 12 convoys on Easy, 20 on Normal');
  check(R.popTargetOf(e) === 1500 && R.popTargetOf(n) === 2000, 'population: 1,500 on Easy, 2,000 on Normal');
  check(R.convoyCost(e).credits < R.convoyCost(n).credits, 'convoys are cheaper on Easy');
}

// The win: all three parts, once; the colony carries on and the save remembers it.
{
  const s = colony(5, 'easy');
  const v0 = R.victoryStatus(s);
  check(!v0.met && v0.chambers.need === s.chambers.length && v0.chambers.need > 40, `the win needs every chamber on every deck (${v0.chambers.need})`);
  dayTick(s);
  check(!s.victory, 'no win at the start');
  // meet two parts of three: still no win
  for (const c of s.chambers) c.status = 'open';
  s.relief = { sent: 12, byGood: { food: 12 }, last: null };
  dayTick(s);
  check(!s.victory, 'no win without the population');
  s.pop = 1600;
  check(R.victoryStatus(s).pop.met, 'population part met');
  s.relief.sent = 11;
  check(!R.victoryStatus(s).met, 'no win one convoy short');
  s.relief.sent = 12; s.pending.length = 0;
  dayTick(s);
  check(!!s.victory && s.victory.day >= 1 && s.victory.convoys === 12, 'every part met: Eden Restored');
  const ev = s.pending.find((p) => p.kind === 'victory');
  check(!!ev && ev.choices[0].key === 'keep', 'the ending is a victory event with "keep building"');
  check(R.answer(s, ev.id, 'keep').ok && !s.pending.some((p) => p.kind === 'victory'), 'answering it closes the ending');
  const day = s.victory.day;
  s.pending.length = 0;
  for (let k = 0; k < 5; k++) dayTick(s);
  check(!s.pending.some((p) => p.kind === 'victory') && s.victory.day === day, 'the ending plays once; the days go on');
  const l = loadState(saveState(s));
  check(l.victory?.day === day && l.relief.sent === 12, 'the save keeps the victory and the convoys');
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
  check(st.current?.id === 'restored' && /chambers .* colonists .* convoys/.test(st.current.progress), `the win goal shows its progress (${st.current?.progress})`);
}

console.log(`colony-victory: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
