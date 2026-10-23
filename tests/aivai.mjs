// Regression run: the original AI plays both armies on every ROM map (army 0 in its test
// mode, which has no routes or scripts, so many maps stall or end early). Catches exceptions
// and slow turns in the rules, scenario tables, map events and AI.
//   EARTHLIGHT_ROM="Earth Light (Japan).sfc" node tests/aivai.mjs [map numbers, 1-based, comma-separated]
// MAXT sets the turn cap (default 40). Needs the unzipped .sfc.
import { readFileSync } from 'node:fs';
import { Rom } from '../js/rom.js';
import { allUnitTypes } from '../js/units.js';
import { mapInfo, MAP_COUNT } from '../js/maps.js';
import { scenario } from '../js/game/scenario.js';
import { Battle } from '../js/game/rules.js';
import { aiTurn } from '../js/game/ai.js';

const buf = readFileSync(process.env.EARTHLIGHT_ROM);
const rom = new Rom(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
if (!rom.isEarthLight()) throw new Error('EARTHLIGHT_ROM is not Earth Light (Japan)');
const types = allUnitTypes(rom);
const maps = process.argv[2] ? process.argv[2].split(',').map((n) => +n - 1) : [...Array(MAP_COUNT).keys()];
const MAXT = +(process.env.MAXT || 40);
let seed = 12345;
Math.random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;   // repeatable runs

let failures = 0;
for (const m of maps) {
  const info = mapInfo(rom, m), sc = scenario(rom, info);
  const b = new Battle(rom, info, types, sc.units, sc.arrivals, {});
  let err = null, worst = 0;
  try {
    while (b.winner() === null && b.turn <= MAXT) {
      const t0 = performance.now();
      for (const _ of aiTurn(b)) if (b.winner() !== null) break;
      worst = Math.max(worst, performance.now() - t0);
      if (b.winner() !== null) break;
      b.endTurn();
    }
  } catch (e) { err = e.stack.split('\n').slice(0, 3).join(' | '); failures++; }
  const w = b.winner();
  const end = err ? `ERROR ${err}` : w === null ? `no result by turn ${b.turn}` : `army ${w} wins (${b.result.reason}) on turn ${b.turn}`;
  console.log(`${String(m + 1).padStart(2)} ${info.name.padEnd(9)} ${end} | units ${b.forces(0).length} v ${b.forces(1).length} | slowest AI turn ${worst.toFixed(0)} ms`);
}
process.exit(failures ? 1 : 0);
