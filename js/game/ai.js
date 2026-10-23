// Simple opponent (not the original AI, which is not decoded yet): each unit
// attacks the target with the best damage trade it can reach, otherwise moves
// toward the nearest enemy. Two habits come from the game's own AI ($01:8C10): spent
// bombers and units down to a quarter of their HP head for a friendly dock or carrier.
// Guards (scripts.js) never leave their post and only fire at units that come close to
// the command centre or fortress they guard.
import { distance } from './rules.js';

const SPENT_FORMS = new Set([5, 7, 11, 44]);
const GUARD_ZONE = 3;

function bestAttack(b, u) {
  let best = null;
  for (const e of b.targets(u)) {
    if (u.guard && distance(e, u.guard) > GUARD_ZONE) continue;
    for (const w of b.weaponsAgainst(u, e)) {
      const f = b.forecast(u, e, w);
      const score = f.dealt * 2 - f.taken + (f.dealt >= e.hp ? 10 : 0);
      if (!best || score > best.score) best = { e, w, score };
    }
  }
  return best;
}

const wantsDock = (b, u) => SPENT_FORMS.has(u.type) || u.hp <= b.type(u).hp >> 2;

// Free hex in reach that minimises score([x, y]).
function bestHex(b, u, score) {
  let best = null, bestScore = Infinity;
  for (const key of b.reachable(u).keys()) {
    const [x, y] = key.split(',').map(Number), s = score([x, y]);
    if (s < bestScore) { bestScore = s; best = [x, y]; }
  }
  return best && (best[0] !== u.x || best[1] !== u.y) ? best : null;
}

export function* aiTurn(b) {
  // launch cargo first, onto the free hex next to its carrier closest to an enemy
  for (const u of b.forces(b.army).filter((x) => x.carrier)) {
    if (wantsDock(b, u)) continue;
    const cells = b.launchCells(u), enemies = b.hostiles(u);
    if (!cells.length || !enemies.length) continue;
    const near = ([x, y]) => Math.min(...enemies.map((e) => distance({ x, y }, e)));
    const [x, y] = cells.sort((p, q) => near(p) - near(q))[0];
    b.launch(u, x, y);
    yield { kind: 'launch', u };
  }
  for (const u of b.alive(b.army)) {
    if (b.winner() !== null) return;
    if (u.acted) continue;
    if (wantsDock(b, u)) {
      const host = b.boardable(u).sort((p, q) => distance(u, p) - distance(u, q))[0];
      if (host) { b.board(u, host); yield { kind: 'board', u, host }; continue; }
    }
    let a = bestAttack(b, u);
    if (!a && !u.guard) {
      const enemies = b.hostiles(u).filter((e) => e.army !== 2 || b.type(u).category >= 8);
      const to = enemies.length && bestHex(b, u, (p) => Math.min(...enemies.map((e) => distance({ x: p[0], y: p[1] }, e))));
      if (to) { b.move(u, ...to); yield { kind: 'move', u }; }
      a = bestAttack(b, u);
    }
    if (!a) continue;
    yield { kind: 'attack', ...b.attack(u, a.e, a.w) };
    // move again after firing (bombers, missile ships, destroyers): head home if spent,
    // otherwise step away from the enemy
    if (u.hp && u.reMove && b.winner() === null) {
      const host = wantsDock(b, u) && b.boardable(u)[0];
      if (host) { b.board(u, host); yield { kind: 'board', u, host }; continue; }
      const enemies = b.hostiles(u);
      const to = bestHex(b, u, (p) => -Math.min(...enemies.map((e) => distance({ x: p[0], y: p[1] }, e))));
      if (to) { b.move(u, ...to); yield { kind: 'move', u }; }
    }
  }
}
