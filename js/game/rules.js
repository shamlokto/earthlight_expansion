// Battle rules, implemented from the decoded game code:
//   movement flood fill  $01:B605   (costs $01:CF12, zone of control via $7E:2DD2 bits)
//   weapon choice/range  $01:853A   (F2B4 mode, F39C/F484 range, F56C move-or-fire)
//   damage + counter     $01:A976   (F6B0 power, F798 evasion, D042 terrain, F676 HP, AC3D level)
// Things the decode did not settle (random term range, level gain, $06E9 doubling,
// map scripts) are marked TODO/ASSUMED.
import { terrainOf, moveCost, EDGE_CLASS } from '../terrain.js';

const D042 = 0x01d042, D0C2 = 0x01d0c2, LEVEL = 0x01ac3d;
const TOWERS = new Set([56, 57]);   // command towers
// Info-screen tables (read by $02:9157): display attack per slot, display defence,
// category byte, minimum range, terrain defence % per weapon mode.
const F7D2 = 0x01f7d2, F8BA = 0x01f8ba, F206 = 0x01f206, F39C = 0x01f39c, D002 = 0x01d002;

// ---------------------------------------------------------------- hex grid
// Flat-top hexes, columns 16 px apart, odd columns shifted down half a hex.
export function neighbours(x, y) {
  const odd = x & 1;
  return [
    [x, y - 1], [x, y + 1],
    [x - 1, odd ? y : y - 1], [x - 1, odd ? y + 1 : y],
    [x + 1, odd ? y : y - 1], [x + 1, odd ? y + 1 : y],
  ];
}

// The six neighbours in the order the game scans them ($01:AC47): SW, NW, N, NE, SE, S.
export function hexRing(x, y) {
  const odd = x & 1;
  return [[x - 1, odd ? y + 1 : y], [x - 1, odd ? y : y - 1], [x, y - 1], [x + 1, odd ? y : y - 1], [x + 1, odd ? y + 1 : y], [x, y + 1]];
}

function cube(x, y) { const q = x, r = y - ((x - (x & 1)) >> 1); return [q, r, -q - r]; }
export function distance(a, b) {
  const [q1, r1, s1] = cube(a.x, a.y), [q2, r2, s2] = cube(b.x, b.y);
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
}

// ---------------------------------------------------------------- battle state
export class Battle {
  // deploy: [{ type, army, x, y, carrier? }] (maps.deployment or scenario.units);
  // arrivals: scenario.arrivals (turn-keyed reinforcements), optional.
  constructor(rom, info, unitTypes, deploy, arrivals = []) {
    this.rom = rom; this.info = info; this.types = unitTypes;
    this.header = rom.body(info.headerId);
    this.grid = rom.body(info.gridId);
    this.units = [];
    const made = new Map();
    for (const d of deploy) made.set(d, this.spawn(d.type, d.army, d.x, d.y, d.carrier ? made.get(d.carrier) : null));
    this.arrivals = arrivals;
    this.turn = 1; this.army = 0; this.log = [];
    this.hadTower = [0, 1].map((a) => this.units.some((u) => u.army === a && TOWERS.has(u.type)));
  }

  spawn(type, army, x, y, carrier = null) {
    const t = this.types[type];
    const u = { id: this.units.length, type, army, x, y, hp: t.hp, level: t.startLevel, moved: false, acted: false, carrier };
    this.units.push(u);
    return u;
  }

  // ------------------------------------------------------------ docks and carriers
  // Units inside a dock or carrier (`carrier` set) are off the map until launched onto a
  // free hex next to it; they are lost with their carrier.
  cargo(c) { return this.units.filter((u) => u.hp > 0 && u.carrier === c); }
  launchCells(u) {
    const c = u.carrier, cat = this.type(u).category;
    if (!c) return [];
    return neighbours(c.x, c.y).filter(([x, y]) => this.inBounds(x, y) && !this.unitAt(x, y) && moveCost(this.rom, cat, this.cls(x, y)) !== 0);
  }
  launch(u, x, y) { u.carrier = null; u.x = x; u.y = y; u.moved = true; }

  // Turn-keyed arrivals ($02:9B70): the game fires an event when turn counter + army
  // flag equals its key; the counter is 0 on the first turn. Units take the nearest free
  // passable hex to their listed position.
  arrive() {
    const out = [];
    for (const ev of this.arrivals) {
      if (ev.done || ev.turn !== this.turn - 1 || ev.army !== this.army) continue;
      ev.done = true;
      for (const a of ev.units) {
        const [x, y] = this.freeNear(a.x, a.y, a.type);
        const u = this.spawn(a.type, this.army, x, y);
        for (const t of a.cargo) this.spawn(t, this.army, x, y, u);
        out.push(u);
      }
    }
    return out;
  }
  freeNear(x0, y0, type) {
    const cat = this.type({ type }).category, seen = new Set([`${x0},${y0}`]), q = [[x0, y0]];
    while (q.length) {
      const [x, y] = q.shift();
      if (this.inBounds(x, y) && !this.unitAt(x, y) && moveCost(this.rom, cat, this.cls(x, y)) !== 0) return [x, y];
      for (const [nx, ny] of neighbours(x, y)) if (!seen.has(`${nx},${ny}`) && this.inBounds(nx, ny)) { seen.add(`${nx},${ny}`); q.push([nx, ny]); }
    }
    return [x0, y0];
  }

  inBounds(x, y) { return x >= 1 && y >= 1 && x < this.info.cols && y <= this.info.rows; }
  cls(x, y) {
    if (!this.inBounds(x, y)) return EDGE_CLASS;
    return terrainOf(this.rom, this.header, this.grid[y * 62 + x]).cls;
  }
  type(u) { return this.types[u.type]; }
  unitAt(x, y) { return this.units.find((u) => u.hp > 0 && !u.carrier && u.x === x && u.y === y) || null; }
  // units on the map (not inside a carrier)
  alive(army) { return this.units.filter((u) => u.hp > 0 && !u.carrier && (army === undefined || u.army === army)); }
  // everything still in play, including cargo
  forces(army) { return this.units.filter((u) => u.hp > 0 && u.army === army); }

  // ------------------------------------------------------------ movement
  // Dijkstra over movement points. Returns Map "x,y" -> remaining points.
  reachable(u) {
    const t = this.type(u), cat = t.category;
    const res = new Map([[`${u.x},${u.y}`, t.move]]);
    if (u.moved || u.acted || t.move === 0) return res;
    const enemyAdj = new Set();
    for (const e of this.alive(1 - u.army)) for (const [nx, ny] of neighbours(e.x, e.y)) enemyAdj.add(`${nx},${ny}`);
    const open = [[t.move, u.x, u.y]];
    while (open.length) {
      open.sort((a, b) => b[0] - a[0]);
      const [mp, x, y] = open.shift();
      if (mp < res.get(`${x},${y}`)) continue;
      // Zone of control: a unit that starts its step next to an enemy stops there,
      // except on its own starting hex. ASSUMED from the ZOC bits in $7E:2DD2.
      if ((x !== u.x || y !== u.y) && enemyAdj.has(`${x},${y}`)) continue;
      for (const [nx, ny] of neighbours(x, y)) {
        if (!this.inBounds(nx, ny)) continue;
        const occ = this.unitAt(nx, ny);
        if (occ && occ.army !== u.army) continue;
        const c = moveCost(this.rom, cat, this.cls(nx, ny));
        if (c === 0) continue;
        const left = c === 'stop' ? 0 : mp - c;
        if (left < 0 || (c === 'stop' && mp <= 0)) continue;
        const key = `${nx},${ny}`;
        if (res.has(key) && res.get(key) >= left) continue;
        res.set(key, left);
        open.push([left, nx, ny]);
      }
    }
    // Can pass through friends but not stop on them.
    for (const key of [...res.keys()]) {
      const [x, y] = key.split(',').map(Number);
      const occ = this.unitAt(x, y);
      if (occ && occ !== u) res.delete(key);
    }
    return res;
  }

  move(u, x, y) {
    u.x = x; u.y = y; u.moved = true;
  }

  // ------------------------------------------------------------ combat
  canTarget(cls, mode) { return !!this.rom.byteAt(D0C2 + cls * 4 + mode); }

  // Weapons of u usable against target from u's current hex.
  weaponsAgainst(u, target) {
    const t = this.type(u), d = distance(u, target), out = [];
    for (const w of t.weapons) {
      if (!w || !w.power) continue;
      if (d < w.min || d > w.max) continue;
      if (w.min >= 2 && u.moved && t.moveOrFire) continue;
      if (!this.canTarget(this.cls(target.x, target.y), w.mode)) continue;
      out.push(w);
    }
    return out;
  }

  targets(u) {
    if (u.acted) return [];
    return this.alive(1 - u.army).filter((e) => this.weaponsAgainst(u, e).length);
  }

  // HP scaling ($01:ABCA): small craft (category >= 7) multiply by HP,
  // capital ships by HP*8/maxHP.
  hpScale(u, p) {
    const t = this.type(u);
    return t.category >= 7 ? p * u.hp : p * Math.floor((u.hp * 8) / t.hp);
  }

  // Adjacent support ($01:AAF6 / $01:AB18): units next to `about` that belong to
  // `army` and have a direct weapon in `slot`. The game scans the neighbours of the
  // *opponent*: attack support comes from the attacker's allies next to the defender
  // (loop at $01:A8E0), defence support from the defender's allies next to the
  // attacker (loop at $01:A929). Checked in the emulator: an ally next to the defender
  // raised the damage, an ally next to the attacker did not.
  supporters(about, army, slot, exclude) {
    const out = [];
    for (const [nx, ny] of neighbours(about.x, about.y)) {
      const s = this.unitAt(nx, ny);
      if (!s || s.army !== army || s === exclude) continue;
      const w = this.type(s).weapons[slot];
      if (w && w.power && w.min < 2) out.push(this.hpScale(s, w.power));
    }
    return out;
  }

  // Raw damage in 1/128 HP, before the random term.
  damage(att, def, w) {
    const at = this.type(att), dt = this.type(def);
    let p = w.power;
    // defender evasion + support from the defender's allies next to the attacker (power/16, cap 128)
    let eva = dt.evasion;
    for (const s of this.supporters(att, def.army, w.slot, def)) eva = Math.min(128, eva + (s >> 4));
    eva = Math.min(128, eva);
    // Surrounded ($06CF, set at $01:A91A): all 6 neighbouring hexes occupied halves evasion.
    if (neighbours(def.x, def.y).every(([nx, ny]) => this.unitAt(nx, ny))) eva >>= 1;
    p = Math.floor((p * (128 - eva) * 2) / 256);
    // terrain defence of the defender's hex
    const td = this.rom.byteAt(D042 + this.cls(def.x, def.y) * 4 + w.mode);
    p = Math.floor((p * (128 - td) * 2) / 256);
    p = this.hpScale(att, p);
    // support from the attacker's allies next to the defender (power/4)
    for (const s of this.supporters(def, att.army, w.slot, att)) p += s >> 2;
    if (at.category !== 7) p = Math.floor((p * this.rom.byteAt(LEVEL + Math.min(9, att.level))) / 16);
    return p;
  }

  // Counter-attack weapon ($01:A9D8): none after indirect fire or slot 4;
  // slot 3 answers slot 3; otherwise slot 2 vs capital ships, slot 1 vs small craft.
  counterWeapon(att, def, used) {
    if (used.min >= 2 || used.slot >= 3) return null;
    const slot = used.slot === 2 ? 2 : (this.type(att).category < 7 ? 1 : 0);
    const w = this.type(def).weapons[slot];
    if (!w || !w.power || w.min >= 2) return null;
    if (distance(att, def) > w.max) return null;
    if (!this.canTarget(this.cls(att.x, att.y), w.mode)) return null;
    return w;
  }

  // Values for the pre-fight info screen, as computed by $02:9157 (called from $01:9C54).
  // Per side, stage 0 = base, 1 = after encirclement, 2 = after support; the game prints
  // stage 0 when the screen opens, 1 when the support panel opens, 2 at the terrain panel.
  fightInfo(att, def, w) {
    const rom = this.rom;
    const scaled = (u, v) => (rom.byteAt(F206 + u.type) === 0x70 ? v : (v * rom.byteAt(LEVEL + (u.level & 15))) >> 4);
    // $02:9269: HP * 8 * F7D2[type*4+slot] / max HP, then the level factor
    const atk = (u, slot) => scaled(u, Math.floor((u.hp * 8 * rom.byteAt(F7D2 + u.type * 4 + slot)) / this.type(u).hp));
    // $02:92E2: F8BA[type] with the level factor, capped at 128
    const dfn = (u) => (rom.byteAt(F206 + u.type) === 0x70 ? rom.byteAt(F8BA + u.type) : Math.min(128, scaled(u, rom.byteAt(F8BA + u.type))));
    // $02:931D: attack of every unit of `army` next to `about` (except `skip`) with a direct weapon in `slot`
    const support = (about, army, skip, slot) => neighbours(about.x, about.y).reduce((sum, [x, y]) => {
      const s = this.unitAt(x, y);
      if (!s || s === skip || s.army !== army || !rom.byteAt(F7D2 + s.type * 4 + slot) || rom.byteAt(F39C + s.type * 4 + slot) >= 2) return sum;
      return sum + atk(s, slot);
    }, 0);
    const cslot = w.slot >= 2 ? w.slot : (this.type(att).category < 7 ? 1 : 0);   // $06B9
    const A = atk(att, w.slot), B = atk(def, cslot), dA = dfn(att), dB = dfn(def);
    const surrounded = neighbours(def.x, def.y).every(([x, y]) => this.unitAt(x, y));
    const dB1 = surrounded ? dB >> 1 : dB;
    const pct = (u) => rom.byteAt(D002 + this.cls(u.x, u.y) * 4 + w.mode);   // both sides use the attacker's mode ($06BA)
    const side = (u, atkS, defS) => ({ unit: u, hp: u.hp, level: u.level, atk: atkS, def: defS, mode: w.mode, pct: pct(u) });
    // hex diagrams: neighbours in the game's scan order ($01:AC47): SW, NW, N, NE, SE, S
    const ring = (c, keep) => hexRing(c.x, c.y).map(([x, y], dir) => ({ dir, u: this.unitAt(x, y) })).filter((n) => n.u && keep(n.u));
    return {
      att: side(att, [A, A, A + (support(def, att.army, att, w.slot) >> 2)], [dA, dA, dA]),
      def: side(def, [B, B, B + (support(att, def.army, def, cslot) >> 4)], [dB, dB1, dB1]),
      encircle: { centre: def, around: ring(def, (u) => u.army === att.army) },
      support: [att, def].map((c) => ({ centre: c, around: ring(c, (u) => u.army !== c.army) })),
    };
  }

  forecast(att, def, w) {
    const cw = this.counterWeapon(att, def, w);
    return { dealt: this.damage(att, def, w) / 128, taken: cw ? this.damage(def, att, cw) / 128 : 0, counter: cw };
  }

  // Both blows are computed from pre-combat HP, then applied together.
  // TODO: exact range of the random term ($00:CF93, a signed byte added to the
  // damage); level gain; the x2 flag $06E9.
  attack(att, def, w, rnd = Math.random) {
    const cw = this.counterWeapon(att, def, w);
    const info = this.fightInfo(att, def, w);
    const jitter = () => Math.floor(rnd() * 256) - 128;
    const dmg = Math.max(0, this.damage(att, def, w) + jitter());
    const back = cw ? Math.max(0, this.damage(def, att, cw) + jitter()) : 0;
    const before = [att.hp, def.hp];
    def.hp = Math.max(0, Math.floor((def.hp * 128 - dmg) / 128));
    if (cw) att.hp = Math.max(0, Math.floor((att.hp * 128 - back) / 128));
    for (const c of [att, def]) if (!c.hp) for (const u of this.cargo(c)) u.hp = 0;   // cargo goes down with its carrier
    att.acted = true; att.moved = true;
    const entry = { turn: this.turn, att, def, w, cw, before, after: [att.hp, def.hp], info };
    this.log.push(entry);
    return entry;
  }

  // Returns the units that arrived for the side whose turn starts.
  endTurn() {
    for (const u of this.units) { u.moved = false; u.acted = false; }
    this.army = 1 - this.army;
    if (this.army === 0) this.turn++;
    return this.arrive();
  }

  // A side loses when all its units (cargo included) are gone, or when it had a command
  // tower (types 56/57) and lost it. (The game's mission screens: UNION must wipe out the
  // enemy, GALT must destroy the command tower.)
  winner() {
    const lost = (a) => !this.forces(a).length || (this.hadTower[a] && !this.forces(a).some((u) => TOWERS.has(u.type)));
    if (lost(1) && this.units.some((u) => u.army === 1)) return 0;
    if (lost(0)) return 1;
    return null;
  }
}
