// Simple opponent (not the original AI, which is not decoded yet): each unit
// attacks the target with the best damage trade it can reach, otherwise moves
// toward the nearest enemy.
import { distance } from './rules.js';

function bestAttack(b, u) {
  let best = null;
  for (const e of b.targets(u)) {
    for (const w of b.weaponsAgainst(u, e)) {
      const f = b.forecast(u, e, w);
      const score = f.dealt * 2 - f.taken + (f.dealt >= e.hp ? 10 : 0);
      if (!best || score > best.score) best = { e, w, score };
    }
  }
  return best;
}

export function* aiTurn(b) {
  // launch cargo first, onto the free hex next to its carrier closest to an enemy
  for (const u of b.forces(b.army).filter((x) => x.carrier)) {
    const cells = b.launchCells(u), enemies = b.alive(1 - u.army);
    if (!cells.length || !enemies.length) continue;
    const near = ([x, y]) => Math.min(...enemies.map((e) => distance({ x, y }, e)));
    const [x, y] = cells.sort((p, q) => near(p) - near(q))[0];
    b.launch(u, x, y);
    yield { kind: 'launch', u };
  }
  for (const u of b.alive(b.army)) {
    if (b.winner() !== null) return;
    let a = bestAttack(b, u);
    if (!a) {
      const reach = b.reachable(u), enemies = b.alive(1 - u.army);
      let bestKey = null, bestScore = Infinity;
      for (const key of reach.keys()) {
        const [x, y] = key.split(',').map(Number);
        const d = Math.min(...enemies.map((e) => distance({ x, y }, e)));
        if (d < bestScore) { bestScore = d; bestKey = [x, y]; }
      }
      if (bestKey && (bestKey[0] !== u.x || bestKey[1] !== u.y)) { b.move(u, ...bestKey); yield { kind: 'move', u }; }
      a = bestAttack(b, u);
    }
    if (a) yield { kind: 'attack', ...b.attack(u, a.e, a.w) };
  }
}
