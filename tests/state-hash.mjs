// Determinism check: seeded AI-vs-AI on every ROM map for MAXT turns (default 15), then a hash
// of every unit's final state per map. Run before and after an engine refactor; the output must
// not change.   EARTHLIGHT_ROM="Earth Light (Japan).sfc" node tests/state-hash.mjs
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Rom } from '../js/rom.js';
import { allUnitTypes } from '../js/units.js';
import { mapInfo, MAP_COUNT } from '../js/maps.js';
import { scenario } from '../js/game/scenario.js';
import { Battle } from '../js/game/rules.js';
import { aiTurn } from '../js/game/ai.js';

const buf = readFileSync(process.env.EARTHLIGHT_ROM);
const rom = new Rom(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
const types = allUnitTypes(rom);
const MAXT = +(process.env.MAXT || 15);
let seed = 4242;
Math.random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
const all = createHash('sha256');
for (let m = 0; m < MAP_COUNT; m++) {
  const info = mapInfo(rom, m), sc = scenario(rom, info);
  const b = new Battle(rom, info, types, sc.units, sc.arrivals, {});
  while (b.winner() === null && b.turn <= MAXT) {
    for (const _ of aiTurn(b)) if (b.winner() !== null) break;
    if (b.winner() !== null) break;
    b.endTurn();
  }
  const st = b.units.map((u) => [u.id, u.type, u.army, u.x, u.y, u.hp, u.level, u.carrier ? u.carrier.id : -1].join(',')).join(';')
    + `|${b.turn}|${b.army}|${JSON.stringify(b.result)}|${JSON.stringify(b.points || null)}`;
  const h = createHash('sha256').update(st).digest('hex').slice(0, 16);
  all.update(h);
  console.log(String(m + 1).padStart(2), info.name.padEnd(9), h, `turn ${b.turn}`, b.result ? `${b.result.winner}:${b.result.reason}` : '-');
}
console.log('ALL', all.digest('hex').slice(0, 16));
