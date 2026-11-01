// The Nineveh (expansion type 77, hidden mission 13) must be able to leave her hull and use her
// anti-ship guns (owner, 2026-11-01: she never moved, so her railgun never fired). Checks that she
// crosses her own decks (units.json moveCat) to the open field, sleeps until attacked (wakes), then
// hunts the general (hunts), moving first and firing at what is in range. No ROM needed.
//   node tests/nineveh-moves.mjs
import { readFileSync } from 'node:fs';
import { loadExpansionData } from '../js/expansion/data.js';
import { ExpansionBattle } from '../js/expansion/battle.js';
import { aiTurn } from '../js/game/ai.js';
import { neighbours, distance } from '../js/game/rules.js';

const noRom = new Proxy({}, { get(_, k) { return () => { throw new Error(`ROM read: ${String(k)}`); }; } });
const { types, tables } = await loadExpansionData();
const mission = JSON.parse(readFileSync(new URL('../missions/remnant/nineveh.json', import.meta.url), 'utf8'));
let fails = 0;
const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) fails++; };
const fresh = () => new ExpansionBattle(noRom, mission, types, { tables });

// 1. a path for her from her berth to hexes the remnant's capital ships can reach from the south
let b = fresh();
const nv = b.units.find((u) => u.type === 77), cat = types[77].moveCat ?? types[77].category;
const flood = (x0, y0, c) => { const d = new Map([[`${x0},${y0}`, 0]]), q = [[x0, y0]]; for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [a, e] of neighbours(x, y)) { const k = `${a},${e}`; if (!d.has(k) && b.inBounds(a, e) && tables.moveCost(c, b.cls(a, e)) !== 0) { d.set(k, d.get(`${x},${y}`) + 1); q.push([a, e]); } } } return d; };
const hers = flood(nv.x, nv.y, cat), sea = flood(31, 34, 1);
const out = [...hers.keys()].filter((k) => sea.has(k)).map((k) => hers.get(k));
check(out.length > 0 && Math.min(...out) <= 20, `she can reach the open field (${Math.min(...out)} steps)`);

// 2. untouched she stays in her berth; hit once, she wakes and sails for the general
const gen = b.units.find((u) => u.general);
let seed = 7; Math.random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
const start = [nv.x, nv.y];
const play = (turns) => { const end = b.turn + turns; while (b.turn < end && b.winner() === null) { gen.hp = 9999; if (gen.carrier) gen.carrier.hp = 9999; if (b.army === 1) for (const _ of aiTurn(b)) if (b.winner() !== null) break; b.endTurn(); } };
play(20);
check(nv.x === start[0] && nv.y === start[1] && !nv.engaged, `untouched, she stays in her berth (turn ${b.turn})`);
const lob = b.spawn(66, 0, nv.x, nv.y + 1); b.army = 0;   // a Lobster Kai on her deck takes a shot at her
const w = b.weaponsAgainst(lob, nv)[0];
if (w) b.attack(lob, nv, w);
check(!!nv.engaged, 'an attack wakes her');
b.endTurn(); const d0 = distance(nv, gen); play(4);
check(nv.hp > 0 && distance(nv, gen) < d0, `awake, she closes on the general (${d0} -> ${distance(nv, gen)} hexes)`);

// 3. dormant, she fires from her berth at a battleship four hexes away; engaged, she moves and still fires
for (const engaged of [false, true]) {
  b = fresh();
  const n2 = b.units.find((u) => u.type === 77);
  for (const e of b.alive(1)) { const c = types[e.type].category; if (e !== n2 && (c < 5 || c > 7)) e.hp = 0; }   // the towers stay (the win needs them)
  for (const u of b.alive(0)) if (!u.general) u.hp = 0;
  n2.x = 19; n2.y = 24; n2.engaged = engaged;
  let spot = null;
  for (let y = 15; y < 38 && !spot; y++) for (let x = 10; x < 30 && !spot; x++) if (distance({ x, y }, n2) === 4 && !b.unitAt(x, y) && tables.moveCost(1, b.cls(x, y)) === 1) spot = [x, y];
  const tiamat = b.spawn(30, 0, ...spot), hp0 = tiamat.hp, at = [n2.x, n2.y];
  b.army = 1; b.turn = 14;
  const steps = [...aiTurn(b)].filter((s) => s.att === n2 || s.u === n2).map((s) => s.kind);
  const hit = tiamat.hp < hp0, moved = n2.x !== at[0] || n2.y !== at[1];
  check(hit && moved === engaged, `${engaged ? 'engaged' : 'dormant'}: ${moved ? 'moves, then ' : 'stays and '}fires on a Tiamat in range (HP ${hp0} -> ${tiamat.hp}; ${steps.join(', ')})`);
}
process.exit(fails ? 1 : 0);
