// Battle rules, implemented from the decoded game code:
//   movement flood fill  $01:B605   (costs $01:CF12, zone of control via $7E:2DD2 bits)
//   weapon choice/range  $01:853A   (F2B4 mode, F39C/F484 range, F56C move-or-fire)
//   damage + counter     $01:A976   (F6B0 power, F798 evasion, D042 terrain, F676 HP, AC3D level)
//   levels after a fight $01:9EA9  (attacker +1, +2 for a kill; defender +1, +2 if unhurt; max 9)
//   boarding / re-arm    $01:A5F2   (full HP on boarding, spent forms 5/7/11/44 go back one type)
//   dock capture         $01:A626   (HP 0 -> capturer's army at full HP, cargo included)
//   dock self-repair     $02:94DD   (+2 HP a turn, paused for 2 turns after taking damage)
//   bomb used            $01:A00A   (type + 1, movement grows by the difference: re-move)
// Map objectives live in scripts.js. Things the decode did not settle (random term range,
// the exact transform menu) are marked TODO/ASSUMED.
import { EDGE_CLASS } from '../terrain.js';
import { romTables } from './tables.js';
import { scriptFor, setupScript, outcome } from './scripts.js';
import { TRANSFORM, SPENT } from '../units.js';
import { setupEvents, burnerMove, fireCannons } from './events.js';
import { tally } from './points.js';

export const NEUTRAL = 2;           // army of the neutral docks (deployment flag $40)
const DOCK_CAT = 7, CARRIER_CAT = 1, CRAB = 26;   // CR-1: 26 empty, 27 loaded
export { TRANSFORM };   // form tables live in units.js
const REARM = { 5: 4, 7: 6, 11: 10, 44: 43 };   // $01:A60C re-arms only these on boarding
const DESTROYERS = new Set([49, 50, 51]);   // may move again with what is left after firing

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
  // opts: { script (default: scripts.js entry for the map), hard (attack x2, $06E9),
  //         tables (rule tables, tables.js; default: read from the ROM) }
  constructor(rom, info, unitTypes, deploy, arrivals = [], opts = {}) {
    this.rom = rom; this.info = info; this.types = unitTypes;
    this.tables = opts.tables || romTables(rom);
    this.script = opts.script || scriptFor(info.index); this.hard = !!opts.hard;
    this.header = rom.body(info.headerId);
    this.grid = rom.body(info.gridId).slice();   // own copy: the Decimator clears cells (events.js)
    this.units = [];
    const made = new Map();
    for (const d of deploy) {
      const host = d.carrier ? made.get(d.carrier) : null;
      const army = host ? host.army : (d.flag40 && this.types[d.type].category === DOCK_CAT ? NEUTRAL : d.army);
      made.set(d, this.spawn(d.type, army, d.x, d.y, host));
    }
    this.arrivals = arrivals.map((e) => ({ ...e, done: false }));
    this.turn = 1; this.army = 0; this.log = [];
    setupScript(this);
    setupEvents(this);
    this.result = null;
  }

  // mp: movement left after moving (null = not moved); reMove: points for a move after firing;
  // hold: turns before a damaged dock repairs itself again.
  spawn(type, army, x, y, carrier = null) {
    const t = this.types[type];
    const u = { id: this.units.length, type, army, x, y, hp: t.hp, level: t.startLevel, moved: false, acted: false, carrier, mp: null, reMove: 0, hold: 0 };
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
    return neighbours(c.x, c.y).filter(([x, y]) => this.inBounds(x, y) && !this.unitAt(x, y) && this.tables.moveCost(cat, this.cls(x, y)) !== 0);
  }
  launch(u, x, y) {
    const c = u.carrier;
    u.carrier = null; u.x = x; u.y = y; u.moved = true; u.mp = 0;
    if (c.type === CRAB + 1) this.setType(c, CRAB);
  }

  // Who may board what ($01:A554): docks take ships from cruisers down and all small craft,
  // not battleships, carriers or structures; carriers take small craft (not the Siren in its
  // battleship form, which is category 2); the CR-1 takes one small craft.
  canBoard(u, host) {
    if (!host || host === u || host.army !== u.army || host.hp <= 0 || host.carrier || (u.acted && !u.reMove)) return false;
    const uc = this.type(u).category, hc = this.type(host).category;
    if (hc === DOCK_CAT) return uc >= 3 && uc !== 5 && uc !== 6 && uc !== 7;
    if (host.type === CRAB) return uc >= 8 && uc !== 13;
    if (hc === CARRIER_CAT) return uc >= 8 && !u.burner;   // no boarding with an afterburner ($01:A576)
    return false;
  }
  // Hosts u can reach this turn (moving onto a friendly host's hex boards it).
  boardable(u) {
    const f = this.flood(u);
    return this.alive(u.army).filter((h) => f.has(`${h.x},${h.y}`) && this.canBoard(u, h));
  }
  // Boarding restores full HP and re-arms spent bombers ($01:A5F2).
  board(u, host) {
    u.carrier = host; u.x = host.x; u.y = host.y; u.moved = true; u.acted = true; u.reMove = 0;
    if (REARM[u.type] !== undefined) this.setType(u, REARM[u.type]);
    u.hp = this.type(u).hp;
    if (host.type === CRAB) this.setType(host, CRAB + 1);
  }
  setType(u, type) { u.type = type; }

  // ------------------------------------------------------------ transformation
  canTransform(u) {
    const to = TRANSFORM[u.type];
    if (to === undefined || u.moved || u.acted || u.carrier) return false;
    return !(this.types[to].category !== CARRIER_CAT && this.cargo(u).length);   // Siren: empty hangar first
  }
  transform(u) { if (this.canTransform(u)) this.setType(u, TRANSFORM[u.type]); }

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
      if (this.inBounds(x, y) && !this.unitAt(x, y) && this.tables.moveCost(cat, this.cls(x, y)) !== 0) return [x, y];
      for (const [nx, ny] of neighbours(x, y)) if (!seen.has(`${nx},${ny}`) && this.inBounds(nx, ny)) { seen.add(`${nx},${ny}`); q.push([nx, ny]); }
    }
    return [x0, y0];
  }

  inBounds(x, y) { return x >= 1 && y >= 1 && x < this.info.cols && y <= this.info.rows; }
  cls(x, y) {
    if (!this.inBounds(x, y)) return EDGE_CLASS;
    return this.tables.terrain(this.header[80 + this.grid[y * 62 + x]]).cls;
  }
  type(u) { return this.types[u.type]; }
  unitAt(x, y) { return this.units.find((u) => u.hp > 0 && !u.carrier && u.x === x && u.y === y) || null; }
  // units on the map (not inside a carrier)
  alive(army) { return this.units.filter((u) => u.hp > 0 && !u.carrier && (army === undefined || u.army === army)); }
  // everything still in play, including cargo
  forces(army) { return this.units.filter((u) => u.hp > 0 && u.army === army); }
  // units on the map that `u` may attack (the other army and neutral docks)
  hostiles(u) { return this.alive().filter((e) => e.army !== u.army); }
  distance(a, b) { return distance(a, b); }

  // ------------------------------------------------------------ movement
  // Points u can still move with: its full move, or what is left for a move after firing.
  movePoints(u) {
    if (u.carrier) return 0;
    if (u.acted) return u.reMove;
    return u.moved ? 0 : (burnerMove(u) ?? this.type(u).move);
  }

  // Dijkstra over movement points. Returns Map "x,y" -> remaining points (free hexes only).
  reachable(u) {
    const res = this.flood(u);
    // Can pass through friends but not stop on them.
    for (const key of [...res.keys()]) {
      const [x, y] = key.split(',').map(Number);
      const occ = this.unitAt(x, y);
      if (occ && occ !== u) res.delete(key);
    }
    return res;
  }

  flood(u) {
    const t = this.type(u), cat = t.category, mp0 = this.movePoints(u);
    const res = new Map([[`${u.x},${u.y}`, mp0]]);
    if (!mp0) return res;
    const enemyAdj = new Set();
    for (const e of this.hostiles(u)) for (const [nx, ny] of neighbours(e.x, e.y)) enemyAdj.add(`${nx},${ny}`);
    const open = [[mp0, u.x, u.y]];
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
        const c = this.tables.moveCost(cat, this.cls(nx, ny));
        if (c === 0) continue;
        const left = c === 'stop' ? 0 : mp - c;
        if (left < 0 || (c === 'stop' && mp <= 0)) continue;
        const key = `${nx},${ny}`;
        if (res.has(key) && res.get(key) >= left) continue;
        res.set(key, left);
        open.push([left, nx, ny]);
      }
    }
    return res;
  }

  move(u, x, y) {
    const left = this.flood(u).get(`${x},${y}`) ?? 0;
    if (u.acted) u.reMove = 0; else u.mp = left;
    u.x = x; u.y = y; u.moved = true;
  }

  // ------------------------------------------------------------ combat
  canTarget(cls, mode) { return this.tables.targetable(cls, mode); }

  // Weapons of u usable against target from u's current hex.
  weaponsAgainst(u, target) {
    const t = this.type(u), d = distance(u, target), out = [];
    // Target marking ($01:E0F1, the AI's $01:85BD alike): slot 0 only hits small craft and
    // docks (category >= 7), slots 1 and 3 only capital ships and structures, slot 2 anything.
    const small = this.type(target).category >= 7;
    for (const w of t.weapons) {
      if (!w || !w.power) continue;
      if (w.slot === 0 ? !small : w.slot !== 2 && small) continue;
      if (d < w.min || d > w.max) continue;
      if (w.min >= 2 && u.moved && t.moveOrFire) continue;
      if (!this.canTarget(this.cls(target.x, target.y), w.mode)) continue;
      out.push(w);
    }
    return out;
  }

  targets(u) {
    if (u.acted || u.carrier) return [];
    return this.hostiles(u).filter((e) => this.weaponsAgainst(u, e).length);
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
    const td = this.tables.defence(this.cls(def.x, def.y), w.mode);
    p = Math.floor((p * (128 - td) * 2) / 256);
    p = this.hpScale(att, p);
    // support from the attacker's allies next to the defender (power/4)
    for (const s of this.supporters(def, att.army, w.slot, att)) p += s >> 2;
    if (at.category !== 7) p = Math.floor((p * this.tables.levelBonus(Math.min(9, att.level))) / 16);
    return this.hard ? p * 2 : p;
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
    const T = this.tables;
    const x2 = this.hard ? 2 : 1;   // $06E9 doubles attack only
    const scaled = (u, v) => (T.catByte(u.type) === 0x70 ? v : (v * T.levelBonus(u.level & 15)) >> 4);
    // $02:9269: HP * 8 * F7D2[type*4+slot] / max HP, then the level factor
    const atk = (u, slot) => scaled(u, Math.floor((u.hp * 8 * T.infoAttack(u.type, slot)) / this.type(u).hp)) * x2;
    // $02:92E2: F8BA[type] with the level factor, capped at 128
    const dfn = (u) => (T.catByte(u.type) === 0x70 ? T.infoDefence(u.type) : Math.min(128, scaled(u, T.infoDefence(u.type))));
    // $02:931D: attack of every unit of `army` next to `about` (except `skip`) with a direct weapon in `slot`
    const support = (about, army, skip, slot) => neighbours(about.x, about.y).reduce((sum, [x, y]) => {
      const s = this.unitAt(x, y);
      if (!s || s === skip || s.army !== army || !T.infoAttack(s.type, slot) || T.minRange(s.type, slot) >= 2) return sum;
      return sum + atk(s, slot);
    }, 0);
    const cslot = w.slot >= 2 ? w.slot : (this.type(att).category < 7 ? 1 : 0);   // $06B9
    const A = atk(att, w.slot), B = atk(def, cslot), dA = dfn(att), dB = dfn(def);
    const surrounded = neighbours(def.x, def.y).every(([x, y]) => this.unitAt(x, y));
    const dB1 = surrounded ? dB >> 1 : dB;
    const pct = (u) => T.displayDefence(this.cls(u.x, u.y), w.mode);   // both sides use the attacker's mode ($06BA)
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
  // TODO: exact range of the random term ($00:CF93, a signed byte added to the damage).
  attack(att, def, w, rnd = Math.random) {
    const cw = this.counterWeapon(att, def, w);
    const info = this.fightInfo(att, def, w);
    const jitter = () => Math.floor(rnd() * 256) - 128;
    const dmg = Math.max(0, this.damage(att, def, w) + jitter());
    const back = cw ? Math.max(0, this.damage(def, att, cw) + jitter()) : 0;
    const before = [att.hp, def.hp];
    def.hp = Math.max(0, Math.floor((def.hp * 128 - dmg) / 128));
    if (cw) att.hp = Math.max(0, Math.floor((att.hp * 128 - back) / 128));
    const entry = { turn: this.turn, att, def, w, cw, before, after: [att.hp, def.hp], info, levels: [att.level, def.level] };
    this.afterFight(att, def, before, entry);
    for (const c of [att, def]) if (!c.hp) for (const u of this.cargo(c)) u.hp = 0;   // cargo goes down with its carrier
    tally(this, entry);   // victory points (points.js)
    // bomb or missile fired: switch to the spent form; bombers, missile ships and destroyers
    // may move again with what is left (plus the spent form's extra movement)
    if (att.hp) entry.spent = this.spend(att, w);
    else { att.acted = true; att.moved = true; att.reMove = 0; }
    this.log.push(entry);
    this.result = outcome(this);
    return entry;
  }

  // After firing: a bomb or missile (slot 3) switches to the spent form; bombers, missile
  // ships and destroyers may move again with what is left (plus the spent form's extra
  // movement). Returns true when the unit switched to its spent form.
  spend(att, w) {
    const mpLeft = att.moved ? (att.mp ?? 0) : this.movePoints(att);
    let reMove = 0, spent = false;
    if (SPENT[att.type] !== undefined && w.slot === 3) {
      const old = this.type(att).move;
      this.setType(att, SPENT[att.type]);
      reMove = mpLeft + this.type(att).move - old;
      spent = true;
    } else if (DESTROYERS.has(att.type)) reMove = mpLeft;
    att.acted = true; att.moved = true; att.reMove = Math.max(0, reMove);
    return spent;
  }

  // $01:9EA9: levels, then dock capture ($01:A626) or the dock's repair pause.
  afterFight(att, def, before, entry) {
    const up = (u, n) => { if (this.type(u).category !== DOCK_CAT) u.level = Math.min(9, u.level + n); };
    up(att, def.hp === 0 ? 2 : 1);
    up(def, def.hp === before[1] ? 2 : 1);
    for (const d of [att, def]) if (this.type(d).category === DOCK_CAT && d.hp < (d === att ? before[0] : before[1])) d.hold = 2;
    if (def.hp === 0 && this.type(def).category === DOCK_CAT && att.hp) {
      def.army = att.army; def.hp = this.type(def).hp; def.hold = 0;
      for (const u of this.cargo(def)) u.army = att.army;
      entry.captured = def;
    }
    entry.levels = [att.level, def.level];
  }

  // Start of a side's turn: its docks repair themselves ($02:94DD).
  repairDocks(army) {
    for (const d of this.alive(army)) {
      if (this.type(d).category !== DOCK_CAT) continue;
      if (d.hold) d.hold--;
      else d.hp = Math.min(this.type(d).hp, d.hp + 2);
    }
  }

  // Returns the units that arrived for the side whose turn starts.
  endTurn() {
    for (const u of this.units) { u.moved = false; u.acted = false; u.mp = null; u.reMove = 0; }
    this.army = 1 - this.army;
    if (this.army === 0) this.turn++;
    this.repairDocks(this.army);
    this.phaseEvent = fireCannons(this);   // map events run at every phase change ($01:9E4E)
    const arrived = this.arrive();
    this.eventMusic = arrived.length > 0;   // $06EC/$06ED: event song for this phase ($02:9B70)
    this.result = outcome(this);
    return arrived;
  }

  // 0 or 1 once the map script says the battle is decided (reason in this.result).
  winner() {
    if (!this.result) this.result = outcome(this);
    return this.result ? this.result.winner : null;
  }
}
