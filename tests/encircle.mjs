// Encirclement (包囲効果, $01:A8E5-A926): a defender whose six neighbouring hexes all lie in the
// attacking army's zone of control (own hex + neighbours of each of its units on the map, not
// carried, not fortress/command centre/dock) has its evasion halved, in the attack only.
//   EARTHLIGHT_ROM="Earth Light (Japan).sfc" node tests/encircle.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const { Rom } = await imp('js/rom.js');
const { readRomFile } = await imp('js/romfile.js');
const { allUnitTypes } = await imp('js/units.js');
const { mapInfo } = await imp('js/maps.js');
const { Battle, hexRing } = await imp('js/game/rules.js');

const f = readFileSync(process.env.EARTHLIGHT_ROM);
const rom = new Rom(await readRomFile({ arrayBuffer: async () => f.buffer.slice(f.byteOffset, f.byteOffset + f.length) }));
const types = allUnitTypes(rom), info = mapInfo(rom, 0);   // HAMILTON: open space around (6,4)
const MARS = 0, DOCK = 52, SELENE = 38;
const D = [6, 4];
const ring = hexRing(...D);   // SW NW N NE SE S
let fails = 0;
const check = (name, b, def, att, expect) => {
  const w = b.type(att).weapons[0];
  const got = b.encircled(def, att.army), dmg = b.damage(att, def, w), cw = b.counterWeapon(att, def, w);
  const back = cw ? b.damage(def, att, cw, true) : 0, info = b.fightInfo(att, def, w);
  const ok = got === expect;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name.padEnd(46)} encircled=${got} damage=${dmg} counter=${back} infoDef=${info.def.def.join('/')}`);
  return dmg;
};
const battle = (placed) => {
  const b = new Battle(rom, info, types, []);
  b.units = [];
  const put = (type, army, x, y, carrier = null) => b.spawn(type, army, x, y, carrier);
  const def = put(MARS, 1, ...D);
  const out = placed(put);
  return { b, def, att: out[0] };
};
// the attacker alone, next to the defender: it covers only some of the six hexes
let r = battle((put) => [put(MARS, 0, ...ring[2])]);
const plain = check('attacker alone (N)', r.b, r.def, r.att, false);
// attacker N + one unit S: N covers NW, N, NE; S covers SW, S, SE -> all six
r = battle((put) => [put(MARS, 0, ...ring[2]), put(MARS, 0, ...ring[5])]);
const enc = check('attacker N + ally S (opposite sides)', r.b, r.def, r.att, true);
// attacker N + ally SE: SW is left out of the zones
r = battle((put) => [put(MARS, 0, ...ring[2]), put(MARS, 0, ...ring[4])]);
check('attacker N + ally SE', r.b, r.def, r.att, false);
// an ally two hexes south only covers the defender's S neighbour (not SW or SE)
const far = hexRing(...ring[5])[5];
r = battle((put) => [put(MARS, 0, ...ring[2]), put(MARS, 0, ...far)]);
check('attacker N + ally 2 hexes S (covers S only)', r.b, r.def, r.att, false);
// ...but with allies two hexes SW and SE as well, every hex is covered
r = battle((put) => [put(MARS, 0, ...ring[2]), put(MARS, 0, ...hexRing(...ring[0])[0]), put(MARS, 0, ...far), put(MARS, 0, ...hexRing(...ring[4])[4])]);
check('attacker N + allies 2 hexes SW, S, SE', r.b, r.def, r.att, true);
// all six hexes occupied by the DEFENDER's own army plus the attacker N: old rule said surrounded
r = battle((put) => { const a = put(MARS, 0, ...ring[2]); for (const i of [0, 1, 3, 4, 5]) put(MARS, 1, ...ring[i]); return [a]; });
check('5 defender allies + attacker N (old rule: yes)', r.b, r.def, r.att, false);
// a dock of the attacker's army on the S side gives no zone
r = battle((put) => [put(MARS, 0, ...ring[2]), put(DOCK, 0, ...ring[5])]);
check('attacker N + own dock S', r.b, r.def, r.att, false);
// a carrier exerts a zone; units carried inside a dock don't (and the dock doesn't either)
r = battle((put) => { const a = put(MARS, 0, ...ring[2]); const c = put(SELENE, 0, ...ring[5]); put(MARS, 0, ...ring[5], c); return [a]; });
check('attacker N + loaded Selene S (carrier counts)', r.b, r.def, r.att, true);
r = battle((put) => { const a = put(MARS, 0, ...ring[2]); const d = put(DOCK, 0, ...ring[5]); put(MARS, 0, ...ring[5], d); return [a]; });
check('attacker N + Mars carried in own dock S', r.b, r.def, r.att, false);
console.log(`evasion ${types[MARS].evasion}/128 -> damage ${plain} plain vs ${enc} encircled`);
if (enc <= plain) { fails++; console.log('FAIL encircled damage not higher'); }
process.exit(fails ? 1 : 0);
