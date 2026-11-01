// The Hephaestus repair ship (expansion type 79, docs/EXPANSION.md): boarding (small craft, and
// cruisers and destroyers as at a dock; not battleships), the turn-start repair of the allies
// beside it, and the Union going for it right after the general. No ROM needed.
//   node tests/repair-ship.mjs
import { readFileSync } from 'node:fs';
import { loadExpansionData } from '../js/expansion/data.js';
import { ExpansionBattle } from '../js/expansion/battle.js';
import { aiTurn } from '../js/game/ai.js';
import { neighbours, distance } from '../js/game/rules.js';

const noRom = new Proxy({}, { get(_, k) { return () => { throw new Error(`ROM read: ${String(k)}`); }; } });
const { types, tables } = await loadExpansionData();
const mission = JSON.parse(readFileSync(new URL('../missions/asimov.json', import.meta.url), 'utf8'));
let fails = 0;
const check = (ok, what) => { console.log(ok ? 'ok  ' : 'FAIL', what); if (!ok) fails++; };
const H = 79;
check(types[H].name === 'Hephaestus' && types[H].weapons.every((w) => !w), 'type 79 is the unarmed Hephaestus');
check(Math.max(1, types[H].value) * types[H].hp >= 500, `price ${types[H].value * types[H].hp} (very expensive)`);

const b = new ExpansionBattle(noRom, mission, types, { tables });
// clear the field: keep only the Union, put the ship somewhere open
const open = (x, y) => b.inBounds(x, y) && !b.unitAt(x, y) && tables.moveCost(types[H].category, b.cls(x, y)) !== 0 && neighbours(x, y).every(([p, q]) => b.inBounds(p, q) && !b.unitAt(p, q) && tables.moveCost(3, b.cls(p, q)) !== 0);
for (const u of b.alive(0)) if (!u.general) u.hp = 0;   // the general stays, or the battle ends
let at = null;
for (let y = 2; y < 60 && !at; y++) for (let x = 2; x < 60 && !at; x++) if (open(x, y) && b.alive(1).every((e) => distance(e, { x, y }) > 6)) at = [x, y];
const ship = b.spawn(H, 0, ...at);
const [n1, n2, n3] = neighbours(...at);
const fenrir = b.spawn(49, 0, ...n1), lobster = b.spawn(8, 0, ...n2), tiamat = b.spawn(30, 0, ...n3);
check(b.canBoard(fenrir, ship), 'a destroyer (Fenrir) may board it');
check(b.canBoard(lobster, ship), 'a small craft (Lobster) may board it');
check(!b.canBoard(tiamat, ship), 'a battleship (Tiamat) may not');
check(b.boardable(fenrir).includes(ship), 'the Fenrir can reach it to board');
fenrir.hp = 2; lobster.hp = 1; tiamat.hp = 10;
b.army = 1; b.endTurn();
check(fenrir.hp === 6 && lobster.hp === Math.min(types[8].hp, 5) && tiamat.hp === 14, `repairs +4 at turn start (Fenrir ${fenrir.hp}, Lobster ${lobster.hp}, Tiamat ${tiamat.hp})`);
check(b.repaired.length === 3, 'the repairs are reported for the log');
fenrir.hp = 3; b.board(fenrir, ship);
check(fenrir.carrier === ship && fenrir.hp === types[49].hp, 'boarding it restores full HP');
ship.hp = 10; b.army = 1; b.endTurn();
check(ship.hp === 10, 'it does not repair itself');

// the Union: with the general out of reach, attacks go to the repair ship first
const b2 = new ExpansionBattle(noRom, mission, types, { tables });
const gen = b2.alive(0).find((u) => u.general), far = (e) => distance(e, gen.carrier || gen);
const foe = b2.alive(1).filter((e) => b2.type(e).weapons.some((w) => w) && b2.type(e).move > 0).reduce((a, e) => (far(e) > far(a) ? e : a));
for (const u of b2.alive(0)) if (!u.general && u !== gen.carrier) u.hp = 0;
for (const e of b2.alive(1)) if (e !== foe) e.hp = 0;
const ring2 = neighbours(foe.x, foe.y).flatMap(([x, y]) => neighbours(x, y)).filter(([x, y]) => b2.inBounds(x, y) && !b2.unitAt(x, y) && distance({ x, y }, foe) === 2 && tables.moveCost(1, b2.cls(x, y)) !== 0);
const s2 = b2.spawn(H, 0, ...ring2[0]), bait = b2.spawn(78, 0, ...ring2[1]);
bait.hp = 2;   // a nearly dead Azoras Kai carrying five craft: worth more to the ROM's priorities alone
for (let i = 0; i < 5; i++) b2.spawn(8, 0, bait.x, bait.y, bait);
b2.army = 1;
const hits = [...aiTurn(b2)].filter((s) => s.kind === 'attack').map((s) => s.def);
check(hits.length && hits[0] === s2, `the Union attacks the repair ship before a nearly dead, loaded Azoras Kai (${hits.map((u) => types[u.type].name).join(', ') || 'no attack'})`);
process.exit(fails ? 1 : 0);
