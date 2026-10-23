// The computer opponent, following the game's own AI (bank $01, phase table $01:9077,
// set up each turn by $02:894B). The original drives the cursor like a player; here the
// same decisions call the Battle API. A turn runs these phases in order:
//
//   scripts     $01:E46C   per-map orders for chosen Galt units ($00:E900[map])
//   dock return $01:8B3C   spent bombers and units at <= 1/4 HP head for a dock or carrier
//   attacks     $01:80A9   highest-priority target first, best attacker against it
//   scripts     again (orders that were blocked earlier)
//   advance     $01:87DC   the others walk the map's waypoint routes ($02:89B1[map])
//   launch      $01:8D37   docks and carriers put all their cargo out
//
// Target priority ($02:89ED + $01:9089): a per-type value ($02:8AB8), +$80 for the
// mission's key units ($02:E64F[map] for the Union, $02:E631[map] for Galt), +4 per unit
// carried, and for every enemy the highest priority of the units it could hurt this turn.
// An attack is scored ($01:86BA) as damage dealt minus the counter-attack, both raw
// ($01:A871), tried from every free hex in weapon range the unit can reach; it is only
// made when it scores above zero.
//
// Differences from the original: the Siren's carrier form 36 is not offered to returning
// units, command 5 (Abaddon order) fires at a unit on the listed hex only, and neighbour
// scan orders follow hexRing (the ROM's own direction tables were not compared). When the
// AI plays the Union (army 0, test mode) it has no routes or scripts: it advances on the
// enemy units, using their priority as the waypoint value. Guards (scripts.js) keep their
// post: they only fire at units within GUARD_ZONE of what they guard and never advance.
import { distance, neighbours, hexRing } from './rules.js';
import { inLane, decimator, blast } from './events.js';

const ROUTES = 0x0289b1, SCRIPTS = 0x00e900, VIP_UNION = 0x02e64f, VIP_GALT = 0x02e631;
const SPENT_FORMS = new Set([5, 7, 11, 44]);     // $01:8C10
const ABADDON = 43, SIREN = 36, ERINYES = 34;
const DOCK_CAT = 7, CARRIER_CAT = 1, GUARD_ZONE = 3;

// $02:E52D: unit types [from, to) of each key-unit class (0 = none)
function vipRange(c) {
  if (c === 1 || c === 8) return [0x38, 0x3a];   // command centres
  if (c === 2) return [0x35, 0x38];              // fortresses
  if (c === 3) return [0x27, 0x34];
  if (c === 4) return [0x1e, 0x22];
  if (c === 5 || c === 6) return [0x22, 0x27];   // carriers
  if (c === 9) return [0x35, 0x3a];
  return [0x1f, 0x20];
}

// Waypoints: (priority, cell) until priority 0; cell = y*64 + x.
function routes(rom, m) {
  let a = 0x020000 | rom.wordAt(ROUTES + m * 2);
  const out = [];
  for (let p; (p = rom.byteAt(a)); a += 3) {
    const c = rom.wordAt(a + 1);
    out.push({ prio: p, x: c & 63, y: c >> 6 });
  }
  return out;
}

const key = (x, y) => `${x},${y}`;
const K = (x, y) => y * 64 + x;

// Hexes at exactly r from (x, y), in the ROM's walk order ($01:8E7A): r steps in
// direction 0, then r steps in each of directions 2, 3, 4, 5, 0, 1.
function ring(x, y, r) {
  if (!r) return [[x, y]];
  for (let i = 0; i < r; i++) [x, y] = hexRing(x, y)[0];
  const out = [];
  for (const d of [2, 3, 4, 5, 0, 1]) for (let i = 0; i < r; i++) { [x, y] = hexRing(x, y)[d]; out.push([x, y]); }
  return out;
}

class Brain {
  constructor(b) {
    this.b = b; this.rom = b.rom; this.army = b.army;
    this.done = new Set();      // units finished this turn
    this.passive = new Set();   // script commands 4/6: no attack this turn
    this.reach = new Map();     // reachable() per unit and form, until the next action
    this.cls = new Uint8Array(64 * 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) this.cls[K(x, y)] = b.cls(x, y);
    this.lanes = b.info.index === 19;   // Buccaneer cannon map: keep out of the lanes ($01:9340)
  }

  changed() { this.reach.clear(); }
  mine(u) { return u.hp > 0 && !u.carrier && u.army === this.army; }
  // units the AI moves itself ($02:894B): not structures (types $34+) or type $12
  mobile(u) { return this.mine(u) && u.type !== 0x12 && u.type < 0x34; }
  free(u) { return !this.done.has(u) && !u.moved && !u.acted; }
  blocked(x, y) { return this.lanes && inLane(this.b, x, y); }

  reachable(u) {
    const k = `${u.id}:${u.type}`;
    if (!this.reach.has(k)) this.reach.set(k, this.b.reachable(u));
    return this.reach.get(k);
  }

  // ---------------------------------------------------------------- priorities
  priorities() {
    const b = this.b, rom = this.rom, m = b.info.index, prio = new Map();
    const vip = b.info.custom ? [0, 0] : [rom.byteAt(VIP_UNION + m), rom.byteAt(VIP_GALT + m)];   // expansion maps have no ROM tables
    for (const u of b.units) {
      if (u.hp <= 0) continue;
      let p = 0;
      const c = u.army < 2 ? vip[u.army] : 0;
      if (c) { const [lo, hi] = vipRange(c); if (u.type >= lo && u.type < hi) p = 0x80; }
      const cat = b.type(u).category, carried = b.cargo(u).length * 4;
      if (cat === DOCK_CAT) p += carried ? carried + 0x40 : 0;
      else p += (cat === CARRIER_CAT ? carried : 0) + b.tables.aiValue(u.type);
      prio.set(u, Math.min(255, p));
    }
    // $01:9089: an enemy is worth as much again as the best unit of ours it could hurt
    const own = b.alive(this.army), foes = b.alive().filter((e) => e.army !== this.army);
    for (const e of foes) {
      let threat = 0;
      for (const o of own) {
        if (prio.get(o) <= threat) continue;
        for (let s = 0; s < 4; s++) if (this.evaluate(e, o, s)) { threat = prio.get(o); break; }
      }
      prio.set(e, Math.min(255, prio.get(e) + threat));
    }
    this.prio = prio;
  }

  // ---------------------------------------------------------------- attack evaluation
  // Form a unit fights slot s in ($01:84E0), or null when it can't use that slot.
  form(u, s) {
    const t = u.type;
    if (t >= 4 && t <= 7) {        // Athena: slots 0/2 as HU, slot 3 (bomb) as fighter, slot 1 never
      if (s === 1) return null;
      if (s === 3) return t === 6 || t === 4 ? 4 : null;
      return t < 6 ? t + 2 : t;
    }
    if (t === SIREN) return this.b.tables.hasWeapon(37, s) ? 37 : null;
    return this.b.types[t].weapons[s] ? t : null;
  }

  // Best hex for att to fire slot s at tgt ($01:84A2): { x, y, score, form } or null.
  // `here` limits the search to the hex att stands on.
  evaluate(att, tgt, s, here = false) {
    const b = this.b, form = this.form(att, s);
    if (form === null) return null;
    const ft = b.types[form], w = ft.weapons[s];
    if (!w || !w.power) return null;
    const small = b.type(tgt).category >= 7;                       // $01:85BD
    if ((s === 0 && !small) || ((s === 1 || s === 3) && small)) return null;
    if (distance(att, tgt) > ft.move + w.max && !here) return null;   // $01:858B
    const t0 = att.type, x0 = att.x, y0 = att.y, m0 = att.moved;
    if (form !== t0 && !b.canTransform(att)) return null;
    att.type = form;
    const stay = here || (w.min >= 2 && ft.moveOrFire);           // $01:85DF
    const reach = stay ? null : this.reachable(att);
    let best = null;
    const special = form === ABADDON && s === 3;                   // $01:81D7: fire on sight
    for (let r = w.max; r >= w.min && !(special && best); r--) {
      for (const [x, y] of ring(tgt.x, tgt.y, r)) {
        if (stay ? x !== x0 || y !== y0 : !reach.has(key(x, y))) continue;
        if (this.blocked(x, y)) continue;
        att.x = x; att.y = y; att.moved = m0 || x !== x0 || y !== y0;
        const ok = b.weaponsAgainst(att, tgt).some((v) => v.slot === s);
        if (ok) {
          const cw = b.counterWeapon(att, tgt, w);
          const score = b.damage(att, tgt, w) - (cw ? b.damage(tgt, att, cw) : 0);
          if (special) { best = { x, y, score: 1, form, special }; break; }
          if (!best || score >= best.score) best = { x, y, score, form };
        }
      }
    }
    att.type = t0; att.x = x0; att.y = y0; att.moved = m0;
    return best && best.score > 0 ? best : null;
  }

  * strike(u, tgt, s, a) {
    const b = this.b, x0 = u.x, y0 = u.y;
    if (a.form !== u.type) { b.transform(u); yield { kind: 'transform', u }; }
    if (a.x !== u.x || a.y !== u.y) { b.move(u, a.x, a.y); yield { kind: 'move', u }; }
    this.done.add(u); this.changed();
    if (u.type === ABADDON && s === 3) {   // the Quantum Decimator ($01:A064): clears the hex and its ring
      if (!decimator(b, u).some(([x, y]) => x === tgt.x && y === tgt.y)) return;
      const r = blast(b, u, tgt.x, tgt.y);
      for (const [x, y] of r.cells) this.cls[K(x, y)] = b.cls(x, y);
      yield { kind: 'blast', ...r };
    } else {
      const w = b.type(u).weapons[s];
      if (!w || !b.weaponsAgainst(u, tgt).includes(w)) return;
      yield { kind: 'attack', ...b.attack(u, tgt, w) };
    }
    this.changed();
    // move again after firing ($01:8FF2): to a dock if due, else back toward where it started
    if (u.hp && u.reMove && b.winner() === null) {
      if (this.wantsDock(u)) { yield* this.toDock(u, u.reMove); return; }
      if (u.x === x0 && u.y === y0) return;
      const reach = b.reachable(u);
      let to = null, d = Infinity;
      for (const k of reach.keys()) {
        const [x, y] = k.split(',').map(Number), e = distance({ x, y }, { x: x0, y: y0 });
        if (e < d && !this.blocked(x, y)) { d = e; to = [x, y]; }
      }
      if (to && (to[0] !== u.x || to[1] !== u.y)) { b.move(u, ...to); this.changed(); yield { kind: 'move', u }; }
    }
  }

  // ---------------------------------------------------------------- movement field
  // Movement over several turns from u ($01:B606): value = turns left * 16 + points left + 1,
  // 0 = out of reach. The search covers 12/move turns; a turn's points refill when spent.
  // `span` is the movement the turn count is taken from (the type's, or 10 with an afterburner).
  field(u, mp0, span = u.burner ? 10 : this.b.type(u).move) {
    const b = this.b, t = b.type(u), cat = t.category, move = t.move || mp0;
    const T = Math.max(0, Math.floor(12 / (span || 1)) - 1);
    const val = new Uint8Array(64 * 64), foe = new Uint8Array(64 * 64), zoc = new Uint8Array(64 * 64);
    for (const e of b.hostiles(u)) {
      foe[K(e.x, e.y)] = 1;
      for (const [x, y] of neighbours(e.x, e.y)) if (x >= 0 && y >= 0 && x < 64 && y < 64) zoc[K(x, y)] = 1;
    }
    const costs = [];
    for (let c = 0; c < 16; c++) costs.push(b.tables.moveCost(cat, c));
    const step = (c, mp, z) => {
      let left = c === 'stop' ? (mp > 0 ? 0 : -1) : mp - c;
      if (left >= 0 && z) left = 0;
      return left;
    };
    const buckets = [];
    const push = (k, v) => { (buckets[v] || (buckets[v] = [])).push(k); };
    const start = K(u.x, u.y);
    val[start] = T * 16 + Math.min(15, mp0) + 1; push(start, val[start]);
    for (let v = val[start]; v > 0; v--) {
      const list = buckets[v];
      if (!list) continue;
      while (list.length) {
        const k = list.pop();
        if (val[k] !== v) continue;
        const turns = (v - 1) >> 4, mp = (v - 1) & 15, x = k & 63, y = k >> 6;
        for (const [nx, ny] of neighbours(x, y)) {
          if (!b.inBounds(nx, ny)) continue;
          const n = K(nx, ny);
          if (foe[n]) continue;
          const c = costs[this.cls[n]];
          if (c === 0) continue;
          let tl = turns, left = step(c, mp, zoc[n]);
          if (left < 0 && turns > 0) { tl = turns - 1; left = step(c, Math.min(15, move), zoc[n]); }
          if (left < 0) continue;
          const nv = tl * 16 + left + 1;
          if (nv > val[n]) { val[n] = nv; push(n, nv); }
        }
      }
    }
    return { val, T, now: T * 16 + 1 };
  }

  // This turn's hex on the way to (gx, gy) ($01:B866 path back, $01:89D8 free hex), or null.
  stepToward(u, f, gx, gy) {
    const { val, now } = f;
    let x = gx, y = gy;
    while (val[K(x, y)] < now) {
      let bx = -1, by = -1, bv = val[K(x, y)] + 1;
      for (const [nx, ny] of hexRing(x, y)) {
        if (nx < 0 || ny < 0 || nx > 63 || ny > 63) continue;
        if (val[K(nx, ny)] >= bv) { bv = val[K(nx, ny)]; bx = nx; by = ny; }
      }
      if (bx < 0) return null;
      x = bx; y = by;
    }
    if (x === u.x && y === u.y) return null;
    const reach = this.reachable(u);
    const ok = (px, py) => reach.has(key(px, py)) && !(px === u.x && py === u.y) && !this.blocked(px, py);
    if (ok(x, y)) return [x, y];
    for (let r = 1; r < 3; r++) for (const [px, py] of ring(x, y, r)) if (val[K(px, py)] >= now && ok(px, py)) return [px, py];
    return null;
  }

  // ---------------------------------------------------------------- docks ($01:8C10)
  wantsDock(u) {
    return SPENT_FORMS.has(u.type) || u.hp <= this.b.type(u).hp >> 2;
  }

  * toDock(u, mp0) {
    const b = this.b;
    if (!b.type(u).move || !mp0) return false;
    const f = this.field(u, mp0);
    let host = null, hv = 0;
    for (const h of b.alive(this.army)) {
      const v = f.val[K(h.x, h.y)];
      if (v && v >= hv && b.canBoard(u, h)) { hv = v; host = h; }
    }
    if (!host) return false;
    this.done.add(u);
    if (hv >= f.now && b.boardable(u).includes(host)) {
      b.board(u, host); u.aiBoarded = b.turn; this.changed();
      yield { kind: 'board', u, host };
      return true;
    }
    const to = this.stepToward(u, f, host.x, host.y);
    if (to) { b.move(u, ...to); this.changed(); yield { kind: 'move', u }; }
    return true;
  }

  // ---------------------------------------------------------------- map scripts ($01:E46C)
  // Units listed for the map by start hex and type get a command list:
  //   1 T x y / 3 T x y  put carried unit of type T out on (x, y)
  //   2 x y   move to (x, y), or the nearest free reachable hex of the 37 around it
  //   4       wait this turn       5 x y   Abaddon: fire its missile at (x, y)
  //   6       hold fire this turn  0       end; the unit then fights but never advances
  setupScripts() {
    const b = this.b, rom = this.rom;
    for (const u of b.units) if (!('aiScripted' in u)) u.aiScripted = false;
    // matched once, on Galt's first turn ($02:D724 at map start), for units of any army
    // (a neutral dock's orders run once Galt has taken it)
    if (this.army !== 1 || b.turn !== 1 || b.info.custom) return;
    let a = rom.wordAt(SCRIPTS + b.info.index * 2), seq = 0;
    for (; rom.byteAt(a); a += 5) {
      const x = rom.byteAt(a), y = rom.byteAt(a + 1), t = rom.byteAt(a + 2);
      const u = b.units.find((v) => v.hp > 0 && v.x === x && v.y === y && v.type === t && !v.aiScripted);
      if (u) { u.aiScripted = true; u.aiScript = rom.wordAt(a + 3); u.aiSeq = seq++; }
    }
  }

  * scripts() {
    const b = this.b, rom = this.rom;
    const list = b.units.filter((u) => this.mine(u) && u.aiScripted && u.aiScript).sort((p, q) => p.aiSeq - q.aiSeq);
    for (const u of list) {
      for (;;) {
        if (b.winner() !== null || u.hp <= 0) return;
        const a = u.aiScript, cmd = rom.byteAt(a);
        if (cmd === 1 || cmd === 3) {
          const t = rom.byteAt(a + 1), x = rom.byteAt(a + 2), y = rom.byteAt(a + 3);
          const c = b.cargo(u).find((v) => v.type === t && v.aiBoarded !== b.turn);
          if (!c || !this.launchable(c, x, y)) break;
          b.launch(c, x, y); this.done.add(c); this.changed();
          yield { kind: 'launch', u: c };
          u.aiScript = a + 4;
        } else if (cmd === 2) {
          if (!this.free(u)) break;
          const x = rom.byteAt(a + 1), y = rom.byteAt(a + 2), reach = this.reachable(u);
          let to = null;
          for (let r = 0; r <= 3 && !to; r++) {
            for (const [px, py] of ring(x, y, r)) {
              if (reach.has(key(px, py)) && !(px === u.x && py === u.y) && !this.blocked(px, py)) { to = [px, py]; break; }
            }
          }
          if (!to) break;
          b.move(u, ...to); this.done.add(u); this.changed();
          yield { kind: 'move', u };
          u.aiScript = a + 3;
        } else if (cmd === 4 || cmd === 6) {
          this.passive.add(u); u.aiScript = a + 1;
          break;
        } else if (cmd === 5) {
          const tgt = b.unitAt(rom.byteAt(a + 1), rom.byteAt(a + 2));
          const hit = u.type === ABADDON && tgt && tgt.army !== u.army && this.free(u) && this.evaluate(u, tgt, 3);
          if (!hit) break;
          u.aiScript = a + 3;
          yield* this.strike(u, tgt, 3, hit);
          break;
        } else break;   // 0: end of the list
      }
    }
  }

  launchable(c, x, y) {
    const b = this.b;
    return b.inBounds(x, y) && !b.unitAt(x, y) && b.tables.moveCost(b.type(c).category, b.cls(x, y)) !== 0 && !this.blocked(x, y);
  }

  // ---------------------------------------------------------------- the turn
  * turn() {
    const b = this.b;
    this.setupScripts();
    this.priorities();
    const end = () => b.winner() !== null;

    yield* this.scripts();
    if (end()) return;

    // dock return ($01:8B3C)
    for (const u of b.units) {
      if (!this.mobile(u) || !this.free(u) || u.guard || !this.wantsDock(u)) continue;
      yield* this.toDock(u, b.movePoints(u));
      if (end()) return;
    }

    // attacks ($01:80A9)
    const skip = new Set();
    for (;;) {
      let tgt = null;
      for (const e of b.alive()) {
        if (e.army === this.army || skip.has(e)) continue;
        if (!tgt || (this.prio.get(e) ?? 0) >= (this.prio.get(tgt) ?? 0)) tgt = e;
      }
      if (!tgt) break;
      let best = null;
      for (const u of b.units) {
        if (!this.mobile(u) || !this.free(u) || this.passive.has(u) || u.burner) continue;
        if (u.guard && distance(tgt, u.guard) > GUARD_ZONE) continue;
        for (let s = 0; s < 4; s++) {
          const a = this.evaluate(u, tgt, s);
          if (a && (a.special || !best || a.score > best.a.score)) best = { u, s, a };
          if (a && a.special) break;
        }
        if (best && best.a.special) break;
      }
      if (!best) { skip.add(tgt); continue; }
      yield* this.strike(best.u, tgt, best.s, best.a);
      if (end()) return;
      if (tgt.hp <= 0 || tgt.army === this.army) skip.add(tgt);
    }

    yield* this.scripts();
    if (end()) return;

    // advance along the routes ($01:87DC)
    const goals = this.army !== 1 ? null : b.info.custom ? b.info.routes : routes(this.rom, b.info.index);
    for (const u of b.units) {
      if (!this.mobile(u) || !this.free(u) || u.aiScripted || u.guard || this.passive.has(u)) continue;
      const t0 = u.type, athena = t0 === 6 || t0 === 7;
      if (athena && !u.burner && b.canTransform(u)) u.type -= 2;   // moves in fighter form, unless it has an afterburner ($01:880D)
      const mp0 = b.movePoints(u);
      let goal = null;
      if (mp0) {
        const f = this.field(u, mp0), list = goals || b.alive().filter((e) => e.army !== this.army).map((e) => ({ prio: (this.prio.get(e) ?? 0) + 1, x: e.x, y: e.y }));
        let gp = 1, gv = 0;
        for (const g of list) {
          const v = f.val[K(g.x, g.y)];
          if (!v || g.prio < gp || (g.prio === gp && v <= gv)) continue;
          gp = g.prio; gv = v; goal = g;
        }
        goal = goal && this.stepToward(u, f, goal.x, goal.y);
      }
      if (u.type !== t0) {
        u.type = t0;
        if (goal) { b.transform(u); this.changed(); yield { kind: 'transform', u }; }
      }
      if (goal) {
        b.move(u, ...goal); this.done.add(u); this.changed();
        yield { kind: 'move', u };
        if (u.burner) {   // afterburner units fire after moving ($01:8A93)
          for (const e of b.alive()) {
            if (e.army === this.army) continue;
            const s = [0, 1, 2, 3].find((i) => this.evaluate(u, e, i, true));
            if (s !== undefined) { yield* this.strike(u, e, s, this.evaluate(u, e, s, true)); break; }
          }
        }
        if (end()) return;
      }
    }

    // launch ($01:8D37): every dock, and every carrier without an afterburner
    for (const h of b.units) {
      if (!this.mine(h)) continue;
      const cat = b.type(h).category;
      if (cat !== DOCK_CAT && !(cat === CARRIER_CAT && !h.burner)) continue;
      for (const c of b.cargo(h)) {
        if (c.aiBoarded === b.turn || this.done.has(c)) continue;
        const cells = [...ring(h.x, h.y, 1), ...(h.type === ERINYES ? ring(h.x, h.y, 2) : [])];
        const cell = cells.find(([x, y]) => this.launchable(c, x, y));
        if (!cell) break;
        b.launch(c, ...cell); this.done.add(c); this.changed();
        yield { kind: 'launch', u: c };
      }
    }
  }
}

export function* aiTurn(b) {
  yield* new Brain(b).turn();
}
