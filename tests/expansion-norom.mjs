// Standalone check: expansion battles must read no rule data from the ROM. Plays seeded games
// of each mission (Union AI against a simple player) with a stand-in ROM that throws on every
// read, using only js/expansion/data; also scores the result and runs the campaign update.
//   node tests/expansion-norom.mjs [missions/asimov.json ...] [runs]
import { readFileSync } from 'node:fs';
import { loadExpansionData } from '../js/expansion/data.js';
import { ExpansionBattle } from '../js/expansion/battle.js';
import { aiTurn } from '../js/game/ai.js';
import { mapPoints } from '../js/game/points.js';
import * as campaign from '../js/expansion/campaign.js';

const files = process.argv.slice(2).filter((a) => a.endsWith('.json'));
const runs = +(process.argv.slice(2).find((a) => /^\d+$/.test(a)) || 20);
const reads = [];
const noRom = new Proxy({}, { get(_, k) { return (...a) => { reads.push(`${String(k)}(${a.join(',')})`); throw new Error(`ROM read: ${String(k)}(${a.join(',')})`); }; } });
const { types, tables } = await loadExpansionData();
let seed = 31337;
Math.random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;

let failed = 0;
for (const f of files.length ? files : ['missions/asimov.json']) {
  const mission = JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
  const tally = {};
  for (let r = 0; r < runs; r++) {
    try {
      const b = new ExpansionBattle(noRom, mission, types, { tables });
      let guard = 0;
      while (b.winner() === null && guard++ < 100) {
        if (b.army === 0) {
          for (const u of b.alive(0)) {
            if (b.winner() !== null || u.carrier) continue;
            const reach = [...b.reachable(u).keys()];
            if (reach.length) b.move(u, ...reach[Math.floor(Math.random() * reach.length)].split(',').map(Number));
            if (u.carrier || b.winner() !== null) continue;
            const t = b.targets(u)[0];
            if (t) b.attack(u, t, b.weaponsAgainst(u, t)[0]);
          }
        } else for (const _ of aiTurn(b)) if (b.winner() !== null) break;
        if (b.winner() !== null) break;
        b.endTurn();
      }
      const pts = mapPoints(b, 0).total;
      const s = campaign.newCampaign(mission);
      if (b.winner() === 0) campaign.finish(s, b, pts, 0);
      const k = `${b.winner()}:${b.result?.reason}`; tally[k] = (tally[k] || 0) + 1;
    } catch (e) { failed++; console.log('FAIL', f, e.stack.split('\n').slice(0, 4).join(' | ')); break; }
  }
  console.log(f, runs, 'games without the ROM:', tally);
}
console.log(reads.length ? `ROM reads: ${[...new Set(reads)].slice(0, 10).join(' ')}` : 'ROM reads: none');
process.exit(failed || reads.length ? 1 : 0);
