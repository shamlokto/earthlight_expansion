// Version 10 (docs/COLONY-V10.md): Eden's gardens. A greenery score from parks, groves, gardens, orchards, forests, water,
// Garden Districts and the Grand Arboretum; wildlife returns at thresholds with a moment and a small bonus; the Garden
// of Eden is an optional ending (greenery 600 and happiness 70), kept in the save, never in the way of the others.
//   node tests/colony-gardens.mjs
import { readFileSync, existsSync } from 'node:fs';
import { newGame, saveState, loadState } from '../js/colony/state.js';
import * as R from '../js/colony/rules.js';
import { dayTick, stateRng } from '../js/colony/sim.js';
import { helpHtml } from '../js/colony/ui.js';
import { gardenOutput, gardensDay } from '../js/colony/gardens.js';
import { MANIFEST } from '../js/colony/art.js';

let passed = 0, failed = 0;
const check = (ok, what) => { if (ok) passed++; else { failed++; console.log('FAIL', what); } };
function colony(seed = 1) {
  const s = newGame({ seed });
  s.stock.credits = 1e6; s.stock.parts = 1e5; s.pending.length = 0;
  Object.assign(s.options, { raids: false, incidents: false, petitions: false, neighbours: false });
  return s;
}
const stand = (s, key, extra = {}) => { const b = { id: s.nextId++, key, x: 2, y: 2, level: 1, mode: null, build: 0, off: false, ...extra }; s.buildings.push(b); return b; };
const feed = (s) => { const cap = R.storageCaps(s); for (const g of ['food', 'water', 'air']) s.stock[g] = cap[g]; };
const tick = (s) => dayTick(s, stateRng(s));
const score = (s) => R.greeneryOf(s).score;
const asks = (s) => ({ ask: (kind, title, text) => R.addPending(s, kind, title, text) });

// ---------------------------------------------------------------- data, help and interface
{
  const ats = R.WILDLIFE.map((w) => w.at);
  check(ats.join() === '80,160,280,420' && R.WILDLIFE.every((w) => w.line && w.bonus && w.speaker), 'four wildlife moments at 80, 160, 280 and 420, each with a line and a bonus');
  check(R.GARDEN.target === 600 && R.GARDEN.happy === 70 && R.GARDEN_ENDING.length === 3 && R.GARDEN_TEXT, 'the Garden of Eden: greenery 600 and happiness 70, three voices');
  const help = helpHtml(null, null);
  check(/id="help-gardens"/.test(help) && /Garden of Eden/.test(help) && /bees and butterflies/.test(help), 'How to play: Eden\'s gardens');
  const ui = readFileSync(new URL('../js/colony/ui.js', import.meta.url), 'utf8'), main = readFileSync(new URL('../js/colony/main.js', import.meta.url), 'utf8');
  check(/function gardensHtml/.test(ui) && /p\.kind === 'garden'/.test(ui) && /GARDEN_ENDING/.test(ui) && /kind === 'wildlife'/.test(ui), 'the interface: greenery in the Happiness panel, the wildlife moment, the ending in the victory screen\'s style');
  check(/p\?\.kind === 'garden'\) save\(true\)/.test(main), 'the ending is saved at once when answered');
  check(MANIFEST['scene/garden']?.prompt && existsSync(new URL(`../${MANIFEST['scene/garden'].prompt}`, import.meta.url)), 'an art slot for the ending, scene/garden, with its prompt');
}

// ---------------------------------------------------------------- the score
{
  const s = colony(), g0 = R.greeneryOf(s);
  check(g0.score > 0 && g0.parts.some((p) => /Rivers and lakes/.test(p.label)), `a new colony: greenery ${g0.score} (${g0.parts.map((p) => `${p.label} ${p.value}`).join(', ')})`);
  const base = g0.score;
  stand(s, 'park');
  check(score(s) === base + 8, 'a Park: its park rating, 8');
  stand(s, 'grove'); stand(s, 'skygarden', { deck: 'upper' });
  check(score(s) === base + 8 + 6 + 10, 'a Grove 6, a Sky Garden 10');
  stand(s, 'orchard'); stand(s, 'vineyard', { deck: 'upper' });
  check(score(s) === base + 24 + 4 + 4, 'an Orchard and a Vineyard Dome 4 each');
  const off = stand(s, 'park', { off: true });
  check(score(s) === base + 32, 'a park switched off adds nothing');
  off.off = false;
  const arb = stand(s, 'arboretum', { level: 1, deck: 'upper' });
  check(score(s) === base + 40, 'a wonder adds nothing before its last stage');
  arb.level = 3;
  check(score(s) === base + 40 + 14 + R.GARDEN.arboretum, 'the finished Grand Arboretum: its park 14 and 40 more');
}

// ---------------------------------------------------------------- wildlife
{
  const s = colony(), base = score(s);
  for (let k = 0; k < Math.ceil((80 - base) / 8); k++) stand(s, 'park');
  feed(s); tick(s);
  const p = s.pending.find((q) => q.kind === 'wildlife');
  check(s.gardens.wildlife.bees === s.day && p && /Bees/.test(p.title) && p.quote && p.speaker === 'ruess' && p.show?.tile, `bees and butterflies at greenery ${s.gardens.score}: a moment with Ruess's line and Show me`);
  check(Math.abs(gardenOutput(s, 'orchard') - 1.1) < 1e-9 && gardenOutput(s, 'farm') === 1, 'bees: orchards make a tenth more');
  for (let k = 0; k < 40; k++) stand(s, 'park');
  s.pending.length = 0; feed(s); tick(s);
  check(s.gardens.wildlife.birds === s.day && s.gardens.wildlife.fish == null && s.pending.filter((q) => q.kind === 'wildlife').length === 1, 'one moment a day: the birds today, the fish tomorrow');
  s.pending.length = 0; feed(s); tick(s);
  check(s.gardens.wildlife.fish === s.day, 'fish in the canals the next day');
  check(s.happyParts.some((q) => q.label === 'Wildlife in Eden' && q.value === 2), 'birds: +2 happiness');
  check(gardenOutput(s, 'fishery') === 1.25, 'fish: Fisheries make a quarter more');
  check(R.tourismOf(s).parts.some((q) => q.label === 'Wildlife' && q.value === 5), 'birds: +5 attraction for visitors');
  const n = Object.keys(s.gardens.wildlife).length;
  s.pending.length = 0; feed(s); tick(s); s.pending.length = 0; feed(s); tick(s);
  check(Object.keys(s.gardens.wildlife).length === n + (score(s) >= 420 ? 1 : 0) && s.pending.filter((q) => q.kind === 'wildlife').length <= 1, 'each moment comes once');
}

// ---------------------------------------------------------------- the Garden of Eden
{
  const s = colony();
  for (let k = 0; k < 80; k++) stand(s, 'park');
  const g = R.ensureGardens(s), says = asks(s);
  s.happy = 60;
  for (const w of R.WILDLIFE) g.wildlife[w.key] = 0;
  check(score(s) >= 600 && !gardensDay(s, says) && !g.eden, `greenery ${score(s)} but happiness 60: not yet`);
  s.happy = 75;
  check(gardensDay(s, says) && g.eden?.day === s.day && g.eden.greenery >= 600 && g.eden.happy === 75, 'greenery 600 and happiness 70: the Garden of Eden');
  const p = s.pending.find((q) => q.kind === 'garden');
  check(p && p.choices[0].key === 'keep' && s.victory == null && s.ark == null, 'a garden event in the victory screen\'s style; Eden Restored and the Ark untouched');
  check(!gardensDay(s, says) && s.pending.filter((q) => q.kind === 'garden').length === 1, 'it plays once');
  const back = loadState(saveState(s));
  check(back.gardens.eden?.day === g.eden.day && back.gardens.wildlife.deer === 0, 'kept in the save');
  // through the sim: an event that pauses
  const t = colony();
  for (let k = 0; k < 80; k++) stand(t, 'park');
  for (const w of R.WILDLIFE) R.ensureGardens(t).wildlife[w.key] = 0;
  feed(t); t.tax = 0;
  let ev = null;
  for (let d = 0; d < 6 && !ev; d++) { t.pending.length = 0; feed(t); ev = tick(t).events.find((e) => e.kind === 'garden'); }
  check(ev?.pause && t.gardens.eden, `in a running colony (happiness ${Math.round(t.happy)}): the garden event pauses the clock`);
}

// ---------------------------------------------------------------- old saves
{
  const s = colony(), old = JSON.parse(saveState(s));
  delete old.gardens;
  const o = loadState(JSON.stringify(old));
  check(o.gardens && o.gardens.eden === null && Object.keys(o.gardens.wildlife).length === 0, 'an old save gains empty gardens');
}

console.log(`colony-gardens: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
