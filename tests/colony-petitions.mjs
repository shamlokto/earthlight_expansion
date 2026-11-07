// Version 8 (docs/COLONY-V8.md): Council petitions. A group in Eden asks for a building it can have (on a deck,
// near the dock); a generous deadline; granted in time: the Council's grant, happiness, a gift; let lapse: a small
// dip. None before day 40 (50 on Easy), rarer on Easy, at most two open (one on Easy); a Settings switch; the
// advisor lists them and warns near the deadline; their own dice; old saves.
//   node tests/colony-petitions.mjs
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { BUILDING } from '../js/colony/data/buildings.js';
import { advise } from '../js/colony/goals.js';
import { helpHtml, HELP_SECTIONS } from '../js/colony/ui.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };

function colony(seed = 1, difficulty = 'normal') {
  const s = newGame({ seed, difficulty });
  s.stock.credits = 1e5; s.stock.parts = 1e4; s.pending.length = 0; s.options.raids = false; s.options.incidents = false;
  return s;
}
const stand = (s, key, x = 0, y = 0, extra = {}) => { const b = { id: s.nextId++, key, x, y, level: 1, mode: BUILDING[key].modes?.[0]?.key ?? null, build: 0, off: false, ...extra }; s.buildings.push(b); return b; };
const fed = (s) => { const cap = R.storageCaps(s); for (const g of ['food', 'water', 'air']) s.stock[g] = cap[g]; };
const tick = (s, rng) => { fed(s); s.pending.length = 0; return dayTick(s, rng).events; };
const mood = (s, label) => s.happyParts.find((p) => p.label === label)?.value ?? 0;
// Open a petition `key` today (as petitionsDay would), with `days` to go.
function open(s, key, days = 40) {
  const n = R.ensurePetitions(s), def = R.PETITION_OF[key];
  const base = s.buildings.filter((b) => b.key === def.want.key && b.build === 0 && (!def.want.deck || (b.deck || 'main') === def.want.deck)).length;
  n.open.push({ id: s.nextId++, key, day: s.day, until: s.day + days, base });
  n.used[key] = { day: s.day, ok: false };
}

// ---------------------------------------------------------------- data, help, settings
{
  check(R.PETITIONS.length >= 12 && R.PETITIONS.every((p) => BUILDING[p.want.key] && p.who && p.speaker && p.text.length > 40 && typeof p.when === 'function'), `${R.PETITIONS.length} petitions, each asking for a real building`);
  check(['garden', 'pumps', 'market', 'marrow', 'venn'].every((k) => R.PETITION_OF[k]), 'survivors and their commanders have petitions of their own');
  check(R.PETITION.first.normal >= 40 && R.PETITION.first.easy > R.PETITION.first.normal && R.PETITION.every.easy[0] > R.PETITION.every.normal[0] && R.PETITION.maxOpen.easy === 1 && R.PETITION.maxOpen.normal === 2, 'not before day 40, rarer on Easy, at most two open (one on Easy)');
  check(R.PETITION.days.normal >= 30 && R.PETITION.lapse < 0 && R.PETITION.lapse > -5, 'a generous deadline and a gentle lapse');
  const help = helpHtml(null, null);
  check(HELP_SECTIONS.some(([id]) => id === 'petitions') && help.includes('id="help-petitions"') && /Settings › Petitions/.test(help), 'How to play: a Petitions section');
  check(R.wantText(R.PETITION_OF.garden.want) === 'a Park on the upper deck' && /within 30 tiles of the dock/.test(R.wantText(R.PETITION_OF.traders.want)), 'what is asked, in words');
}

// ---------------------------------------------------------------- the schedule
function run(seed, difficulty, days) {
  const s = colony(seed, difficulty), rng = stateRng(s), came = [];
  s.pop = 150; s.unlocked.push('canteen', 'clinic');
  let most = 0;
  for (let d = 0; d < days; d++) {
    tick(s, rng);
    const p = s.pending.find((x) => x.kind === 'petition');
    if (p) came.push({ day: s.day, key: p.petition, p });
    most = Math.max(most, s.petitions.open.length);
  }
  return { s, came, most };
}
{
  const n = run(1, 'normal', 300), e = run(1, 'easy', 300);
  console.log(`  normal: ${n.came.map((c) => `${c.key}@${c.day}`).join(' ')}`);
  console.log(`  easy:   ${e.came.map((c) => `${c.key}@${c.day}`).join(' ')}`);
  check(n.came.length >= 3 && n.came[0].day >= 40 && e.came[0].day >= 50, `none before day 40 / 50 (first ${n.came[0]?.day} / ${e.came[0]?.day})`);
  check(e.came.length < n.came.length, `rarer on Easy (${e.came.length} vs ${n.came.length})`);
  check(n.most <= 2 && e.most <= 1, `at most two open (one on Easy): ${n.most} / ${e.most}`);
  const p = n.came[0].p;
  check(p.speaker && p.show?.build && /They ask for/.test(p.text) && /Granted in time/.test(p.text), 'the window: who asks, what, the reward, and a Show me');
  check(n.came.every((c) => s0Can(n.s, c.key)), 'only what the colony can build is asked for');
  check(n.s.petitions.lapsed > 0 && n.s.petitions.log.some((l) => !l.ok), 'an unanswered petition lapses');
  check(n.came.every((c, i) => n.came.slice(0, i).every((x) => x.key !== c.key || c.day - x.day >= R.PETITION.days.normal + R.PETITION.again)), 'a lapsed petition comes back only long after');
}
function s0Can(s, key) { return s.unlocked.includes(R.PETITION_OF[key].want.key); }

// ---------------------------------------------------------------- granted, lapsed, the advisor
{
  const s = colony(2), rng = stateRng(s), c = s.buildings.find((b) => b.key === 'command');
  s.unlocked.push('canteen');
  open(s, 'workers', 40);
  check(R.petitionStatus(s)[0]?.who === 'The field and pump workers' && R.petitionStatus(s)[0].days === 40 && !R.petitionStatus(s)[0].met, 'petitionStatus: who, how long, not met yet');
  let adv = advise(s).find((a) => a.petition === 'workers');
  check(adv && adv.level === 'tip' && adv.show?.build === 'canteen' && /40 days left/.test(adv.text), `the advisor lists it with a fix (${adv?.text})`);
  for (let d = 0; d < 33; d++) tick(s, rng);
  adv = advise(s).find((a) => a.petition === 'workers');
  check(adv && adv.level === 'warn' && s.log.some((l) => /7 days left on the petition/.test(l.text)), 'a week before the deadline: a reminder, and the advisor warns');
  const cr = s.stock.credits;
  const p = R.findSpot(s, 'canteen', { free: true, box: { x0: c.x - 12, y0: c.y - 12, x1: c.x + 12, y1: c.y + 12 } });
  stand(s, 'canteen', p.x, p.y);
  tick(s, rng);
  check(s.petitions.granted === 1 && !s.petitions.open.length && s.stock.credits > cr && s.log.some((l) => /Petition granted/.test(l.text)), 'granted: the Council pays');
  tick(s, rng);
  check(mood(s, 'Petition granted') >= 3, `and happiness rises (${mood(s, 'Petition granted')})`);
  check(s.petitions.used.workers.ok, 'a granted petition is never asked again');
}
{
  const s = colony(3), rng = stateRng(s);
  open(s, 'families', 3);
  for (let d = 0; d < 4; d++) tick(s, rng);
  check(s.petitions.lapsed === 1 && !s.petitions.open.length && s.log.some((l) => /has lapsed/.test(l.text)), 'not granted by the deadline: it lapses');
  check(mood(s, 'Petition ignored') < 0 && mood(s, 'Petition ignored') >= R.PETITION.lapse, `a small dip in happiness (${mood(s, 'Petition ignored')})`);
  for (let d = 0; d < 12; d++) tick(s, rng);
  check(mood(s, 'Petition ignored') === 0, 'that fades');
}
{
  // a petition with a place: a Warehouse near the dock counts only near the dock; one far away does not
  const s = colony(4), rng = stateRng(s), dock = s.buildings.find((b) => b.key === 'dock');
  open(s, 'traders', 40);
  stand(s, 'warehouse', (dock.x + 100) % s.map.w, dock.y);
  tick(s, rng);
  check(s.petitions.open.length === 1, 'a Warehouse far from the dock does not answer the traders');
  stand(s, 'warehouse', dock.x + 3, dock.y - 3);
  tick(s, rng);
  check(s.petitions.granted === 1 && s.stock.parts > 0, 'one within reach of the dock does');
  // a deck: a park on the main deck does not answer the garden families
  open(s, 'garden', 40);
  stand(s, 'park', 1, 1);
  tick(s, rng);
  check(s.petitions.open.some((o) => o.key === 'garden'), 'the garden families want theirs on the upper deck');
  stand(s, 'park', 1, 1, { deck: 'upper' });
  const food = s.stock.food;
  tick(s, rng);
  check(!s.petitions.open.length && s.petitions.granted === 2, 'a park on the upper deck answers them');
  void food;
}

// ---------------------------------------------------------------- switching off, saves, old saves
{
  const s = colony(5);
  open(s, 'families', 40);
  s.pending.push({ id: s.nextId++, kind: 'petition', title: 'x', text: 'x', choices: [] });
  R.setPetitions(s, false);
  check(!R.petitionsOn(s) && !s.petitions.open.length && !s.pending.some((p) => p.kind === 'petition'), 'switched off: withdrawn, without penalty');
  const rng = stateRng(s);
  for (let d = 0; d < 200; d++) tick(s, rng);
  check(s.petitions.lapsed === 0 && !s.petitions.open.length, 'and none come');
  R.setPetitions(s, true);
  open(s, 'families', 40);
  const back = loadState(saveState(s));
  check(back.petitions.open[0]?.key === 'families', 'save and load keep the open petitions');
  const old = JSON.parse(saveState(s)); delete old.petitions; delete old.options.petitions;
  const up = loadState(JSON.stringify(old));
  check(up.petitions && Array.isArray(up.petitions.open) && R.petitionsOn(up) && Array.isArray(advise(up)), 'an older save gets petitions (on)');
}

console.log(`colony-petitions: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
