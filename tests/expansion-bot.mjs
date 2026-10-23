// Playtest bot for expansion missions: plays the player's side with simple rules against the
// real Union AI, many times, and reports how often each mission is won and how.
//   EARTHLIGHT_ROM=... node tests/expansion-bot.mjs missions/asimov.json [runs]
// It is a weak player (no boarding, no transforming, greedy moves), so its win rate is a floor.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const { Rom } = await imp('js/rom.js');
const { readRomFile } = await imp('js/romfile.js');
const { allUnitTypes } = await imp('js/units.js');
const { ExpansionBattle } = await imp('js/expansion/battle.js');
const { aiTurn } = await imp('js/game/ai.js');
const { distance } = await imp('js/game/rules.js');

const f = readFileSync(process.env.EARTHLIGHT_ROM);
const rom = new Rom(await readRomFile({ arrayBuffer: async () => f.buffer.slice(f.byteOffset, f.byteOffset + f.length) }));
const types = allUnitTypes(rom);
const mission = JSON.parse(readFileSync(join(root, process.argv[2]), 'utf8'));
const runs = +(process.argv[3] || 50);

// One player turn. Escape maps: everyone heads for the exit edge, the general first; attack on
// the way when the forecast favours us. Other maps: close in on the nearest enemy and attack.
function playerTurn(b) {
  const o = mission.objective || {}, escape = o.kind === 'escape';
  const exitX = b.info.cols - 1;
  const mine = () => b.alive(0).filter((u) => !u.acted && b.type(u).move > 0);
  // on escape maps slow units ride a carrier that hasn't moved yet; carriers move last
  if (escape) for (const u of mine()) {
    if (u.general || b.type(u).move >= 7 || process.env.NOBOARD) continue;
    const host = b.boardable(u).find((h) => !h.moved && b.cargo(h).length < 6);
    if (host) b.board(u, host);
  }
  const isHost = (u) => b.type(u).category === 1;
  const order = mine().sort((p, q) => (isHost(p) ? 1 : 0) - (isHost(q) ? 1 : 0) || (q.general ? 1 : 0) - (p.general ? 1 : 0) || q.x - p.x);
  for (const u of order) {
    if (u.hp <= 0 || u.carrier || b.winner() !== null) continue;
    const foes = b.hostiles(u);
    const score = (x, y) => {
      if (escape) {
        // enemies that could move next to this hex and fire next turn
        const danger = foes.filter((e) => distance(e, { x, y }) <= b.type(e).move + Math.max(1, ...b.type(e).weapons.filter(Boolean).map((w) => w.max))).length;
        return x * 10 - danger * (u.general || isHost(u) ? +(process.env.WV ?? 40) : +(process.env.WO ?? 8));
      }
      const d = Math.min(...foes.map((e) => distance(e, { x, y })), 99);
      return -d;
    };
    const reach = b.reachable(u);
    let best = null, bs = -Infinity;
    for (const k of reach.keys()) { const [x, y] = k.split(',').map(Number); const s = score(x, y); if (s > bs) { bs = s; best = [x, y]; } }
    if (best && (best[0] !== u.x || best[1] !== u.y)) b.move(u, ...best);
    if (u.escaped || b.winner() !== null) continue;
    let pick = null, ps = 0;
    for (const e of b.targets(u)) for (const w of b.weaponsAgainst(u, e)) {
      const fc = b.forecast(u, e, w), s = fc.dealt - fc.taken * (u.general ? 2 : 1);
      if (s > ps) { ps = s; pick = [e, w]; }
    }
    if (pick) b.attack(u, ...pick);
  }
}

const tally = new Map(); let turns = 0;
for (let r = 0; r < runs; r++) {
  const b = new ExpansionBattle(rom, mission, types);
  let guard = 0;
  while (b.winner() === null && guard++ < 200) {
    if (b.army === 0) { playerTurn(b); if (process.env.TRACE && r === 0) console.log(`turn ${b.turn}:`, b.units.filter((u) => u.army === 0 && u.hp > 0).map((u) => `${types[u.type].code}${u.general ? "*" : ""}${u.escaped ? "!esc" : `(${u.x},${u.y})`}`).join(" "), "| union", b.alive(1).length); }
    else for (const _ of aiTurn(b)) if (b.winner() !== null) break;
    if (b.winner() !== null) break;
    b.endTurn();
  }
  const k = `${b.winner() === 0 ? 'win' : b.winner() === 1 ? 'loss' : 'none'}:${b.result?.reason}`;
  tally.set(k, (tally.get(k) || 0) + 1); turns += b.turn;
}
console.log(`${mission.name} x${runs}:`, Object.fromEntries(tally), `avg turn ${(turns / runs).toFixed(1)}`);
