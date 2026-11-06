// Expansion battles: the base game's Battle on a custom map (mission.js), plus the expansion's
// rules (docs/EXPANSION.md):
//   * the general rides one unit: evasion x2 (capped at 96/128), power x2, level 9; if that unit
//     is destroyed the game is over
//   * objectives beyond the base game's: escape (get N units, the general among them, off an
//     edge; lost once too few units are left) and destroyType (destroy every enemy unit of one
//     type, cargo included; optionally lost if one of them reaches an edge)
//   * a turn limit from the mission
// The player is army 0 (pink, on the left in fights), the Union army 1, as in the original.
import { Battle, neighbours } from '../game/rules.js';
import { romView, deployList, arrivalList } from './mission.js';
import { mapPoints } from '../game/points.js';
import { loadExpansionData } from './data.js';
import * as campaign from './campaign.js';
import { EXPANSION_BATTLE } from '../game/savegame.js';

const GENERAL_EVASION_CAP = 96;
const OBJECTIVE_LINES = { annihilate: 'annihilate', command: 'tower', fortress: 'fortress', flagship: 'flagship', carriers: 'carriers', escape: 'annihilate', destroyType: 'annihilate' };

// Base-game script for the objectives scripts.js already knows (see SCRIPTS there).
function scriptOf(mission) {
  const o = mission.objective || { kind: 'annihilate' };
  const s = { line: OBJECTIVE_LINES[o.kind] || 'annihilate', goal: mission.goal || o.goal || defaultGoal(o) };
  if (o.kind === 'flagship') s.win = { flagship: o.type };
  if (o.kind === 'carriers') s.win = { carriers: true };
  if (mission.turnLimit) s.limit = mission.turnLimit;
  if (mission.guards) s.guards = mission.guards;
  return s;
}

function defaultGoal(o) {
  switch (o.kind) {
    case 'command': return "Destroy the Union's command centres.";
    case 'fortress': return 'Destroy the Union fortress.';
    case 'flagship': return 'Sink the Union flagship.';
    case 'carriers': return 'Sink every Union carrier.';
    case 'escape': return `Get the general and ${o.count ?? 3} more units off the ${o.edge || 'east'} edge.`;
    case 'destroyType': return 'Destroy every one of the marked Union units.';
    default: return 'Destroy the Union forces.';
  }
}

export class ExpansionBattle extends Battle {
  constructor(rom, mission, types, opts = {}) {
    const { rom: view, info } = romView(rom, mission);
    info.routes = mission.routes || null;
    info.chaseGeneral = !!mission.chaseGeneral;   // every Union machine but the carriers hunts the general (ai.js)
    const list = deployList(mission);
    super(view, info, types, list, arrivalList(mission), { script: scriptOf(mission), hard: opts.hard, tables: opts.tables });
    this.mission = mission;
    // campaign machines bring their pilot's level and their roster id (Battle spawns in list order)
    list.forEach((d, i) => { if (d.level !== undefined) this.units[i].level = d.level; if (d.rosterId !== undefined) this.units[i].rosterId = d.rosterId; if (d.hold) this.units[i].hold = d.hold; if (d.wakes) this.units[i].wakes = true; });
    // a damaged machine starts with what HP it has left (the colony's guardians: mission unit `hp`)
    list.forEach((d, i) => { if (d.hp !== undefined) this.units[i].hp = Math.max(1, Math.min(this.units[i].hp, d.hp)); });
    this.escaped = [];
    // the colony's raid (mission.flee): raiders who broke off and got off the map; whether they
    // are running for the edge (fleeing) and whether Eden is pulling back (retreating)
    this.fled = []; this.fleeing = false; this.retreating = false;
    const g = mission.general && this.units.find((u) => u.army === 0 && u.x === mission.general.x && u.y === mission.general.y && !u.carrier);
    this.general = g || null;
    if (g) { g.general = true; g.pilotLevel = g.level; g.level = 9; }   // level 9 only while the general is aboard
    this.boosted = new Map();
    // map events on expansion maps: cannons that fire straight down their column at every phase
    // change while their tower stands (events.js fireCannons, as the Buccaneer's on map 19);
    // mission.cannons [{ x, y, tower: [x, y] }], the tower being the unit standing there
    if (mission.cannons) this.cannons = mission.cannons.map((c) => {
      const t = this.units.find((u) => u.hp > 0 && !u.carrier && u.x === c.tower[0] && u.y === c.tower[1]);
      return { x: c.x, y: c.y, tower: t ? t.id : null };
    });
  }

  // The general's unit fights with doubled evasion (capped) and doubled power.
  type(u) {
    const t = super.type(u);
    if (!u.general) return t;
    if (!this.boosted.has(t)) this.boosted.set(t, { ...t, evasion: Math.min(GENERAL_EVASION_CAP, t.evasion * 2) });
    return this.boosted.get(t);
  }
  damage(att, def, w, counter = false) {
    const p = super.damage(att, def, w, counter);
    return att.general ? p * 2 : p;
  }
  // The info screen shows the general's doubled attack too.
  fightInfo(att, def, w) {
    const fi = super.fightInfo(att, def, w);
    for (const s of [fi.att, fi.def]) if (s.unit.general) s.atk = s.atk.map((v) => v * 2);
    return fi;
  }

  // (x, y) on the playfield's edge ('east', 'west', 'north' or 'south').
  onEdge(edge, x, y) {
    const c = this.info.cols - 1, r = this.info.rows;
    return edge === 'east' ? x === c : edge === 'west' ? x === 1 : edge === 'north' ? y === 1 : y === r;
  }
  // Escape: a player unit that ends its move on the exit edge leaves the map.
  exitCells() {
    const o = this.mission.objective;
    if (o?.kind !== 'escape') return null;
    return (x, y) => this.onEdge(o.edge || 'east', x, y);
  }
  move(u, x, y) {
    super.move(u, x, y);
    if (this.mission.flee) { if (this.running(u.army) && this.edgeHex(x, y)) this.leave(u); return; }
    const exit = this.exitCells();
    if (exit && u.army === 0 && exit(x, y)) {
      // whatever rides inside leaves with it (the general may be aboard a carrier)
      const leaving = [u, ...this.cargo(u)];
      u.carrier = EXIT; u.x = -1; u.y = -1;
      for (const v of leaving) { v.escaped = true; this.escaped.push(v); }
      this.log.push({ kind: 'escape', u });
    }
  }

  // ------------------------------------------------------------ the colony's raid (mission.flee)
  // Nobody leaves a raid by a button: a side that breaks off (the raiders under the flee rule, Eden
  // after Retreat) has to get each machine onto an edge hex, the map's border or the hexes beside
  // Earth's gravity field on the Earth side. A machine of a running side that ends its move on an
  // edge hex leaves the map with whatever rides inside it (leave(); one already standing on an edge
  // hex may leave instead of moving). Escaped machines keep their HP; the other side shoots at
  // whoever is still on the map.
  running(army) { return !!this.mission.flee && (army === 1 ? this.fleeing : army === 0 && this.retreating); }
  edgeHex(x, y) {
    if (!this.inBounds(x, y)) return false;
    if (x === 1 || y === 1 || x === this.info.cols - 1 || y === this.info.rows) return true;
    return neighbours(x, y).some(([a, b]) => this.inBounds(a, b) && this.cls(a, b) === EARTH_CLS);
  }
  // Still in the battle: alive and not off the map (cargo included).
  onMap(army) { return this.forces(army).filter((u) => !u.escaped && !u.fled); }
  // May u leave from where it stands? (its side running, on an edge hex, its move not spent)
  canLeave(u) { return this.running(u.army) && u.hp > 0 && !u.carrier && !u.moved && !u.acted && this.edgeHex(u.x, u.y); }
  leave(u) {
    const going = [u, ...this.cargo(u)];
    u.carrier = u.army === 1 ? FLED : EXIT; u.x = -1; u.y = -1;
    for (const v of going) {
      if (v.army === 1) { v.fled = true; v.fleeing = false; this.fled.push(v); } else { v.escaped = true; this.escaped.push(v); }
    }
    this.log.push({ kind: 'leave', u, units: going });
    return going;
  }
  // A machine that can't reach any edge hex over the terrain (the rail guns on Eden's railway):
  // it stays at the dock when Eden retreats, and the retreat ends without it.
  stranded(u) {
    if (u.carrier) return u.carrier.x > 0 && this.stranded(u.carrier);
    const t = this.type(u), cat = t.moveCat ?? t.category;
    if (!t.move) return true;
    const seen = new Set([`${u.x},${u.y}`]), q = [[u.x, u.y]];
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      if (this.edgeHex(x, y)) return false;
      for (const [a, b] of neighbours(x, y)) {
        if (!this.inBounds(a, b) || seen.has(`${a},${b}`) || this.tables.moveCost(cat, this.cls(a, b)) === 0) continue;
        seen.add(`${a},${b}`); q.push([a, b]);
      }
    }
    return true;
  }
  // Eden's Retreat (gameapp.js, after a confirmation): cannot be undone. Not while the raiders run.
  retreat() {
    if (!this.mission.flee || this.retreating || this.fleeing || this.winner() !== null) return false;
    this.retreating = true;
    for (const u of this.onMap(0)) u.retreating = true;
    this.log.push({ kind: 'retreat' });
    return true;
  }

  // The colony's flee rule (mission.flee): checked after every destruction and at every phase change.
  attack(att, def, w, rnd) {
    const e = super.attack(att, def, w, rnd);
    if (this.mission.flee && (!e.after[0] || !e.after[1])) this.checkFlee();
    return e;
  }
  endTurn() {
    const arrived = super.endTurn();
    if (this.mission.flee) {
      // the turn limit while the raiders run: the ones still on the map get away
      if (this.fleeing && this.result?.reason === 'timeup') {
        for (const u of this.alive(1)) this.leave(u);
        this.result = { winner: 0, reason: 'fled' };
      }
      this.checkFlee();
    }
    return arrived;
  }
  // Raiders outnumbered two to one by Eden's machines still on the map break off: from then on they
  // run for the edge (ai.js flee) and leave the map one by one; the battle goes on until none is
  // left on it. Not while Eden retreats; once they run they don't turn back.
  checkFlee() {
    if (this.fleeing || this.retreating || this.winner() !== null) return false;
    // not before the raiders have had one full turn: a band that came in outnumbered still tries its luck once
    if ((this.turn || 1) < 2) return false;
    const theirs = this.onMap(1);
    if (!raidersFlee(this.onMap(0).length, theirs.length)) return false;
    this.fleeing = true;
    for (const u of theirs) u.fleeing = true;
    this.log.push({ kind: 'flee', units: theirs });
    return true;
  }
  // How a colony raid ends besides annihilation (scripts.js outcome): the General's machine lost;
  // Eden retreating with nothing left on the map that could still get away (escaped, destroyed or
  // stranded at the dock); the raiders all gone from the map with some of them escaped.
  colonyOutcome() {
    if (this.general && this.general.hp <= 0) return { winner: 1, reason: 'general' };
    if (this.retreating && !this.onMap(0).some((u) => !this.stranded(u))) return { winner: 1, reason: 'retreat' };
    if (!this.onMap(1).length && this.fled.length) return { winner: 0, reason: 'fled' };
    return null;
  }

  winner() {
    if (!this.result) this.result = this.expansionOutcome();
    return super.winner();
  }
  expansionOutcome() {
    if (this.mission.flee) return this.colonyOutcome();
    if (this.general && this.general.hp <= 0) return { winner: 1, reason: 'general' };
    const o = this.mission.objective || {};
    if (o.kind === 'escape') {
      const need = (o.count ?? 3) + (this.general ? 1 : 0);
      if (this.escaped.length >= need && (!this.general || this.general.escaped)) return { winner: 0, reason: 'escape' };
      // lost once fewer machines are left (escaped ones included) than the escape needs
      if (this.forces(0).filter((u) => this.type(u).move > 0).length < need) return { winner: 1, reason: 'escapeFailed' };
    }
    if (o.kind === 'destroyType') {
      // a transport's loaded and empty forms count as the same type
      const base = (t) => this.types[t].empty ?? t;
      const marked = this.units.filter((u) => u.army === 1 && base(u.type) === base(o.type));
      if (marked.length && marked.every((u) => u.hp <= 0)) return { winner: 0, reason: 'annihilate' };
      if (o.edge && marked.some((u) => u.hp > 0 && !u.carrier && this.onEdge(o.edge, u.x, u.y))) return { winner: 1, reason: 'breakthrough' };
    }
    return null;
  }

  // After savegame.restoreBattle: relink the general and the escaped units.
  restored() {
    this.general = this.units.find((u) => u.general) || null;
    this.escaped = this.units.filter((u) => u.escaped);
    for (const u of this.escaped) if (!u.carrier) u.carrier = EXIT;   // left the map themselves (saved as id -1)
    this.fled = this.units.filter((u) => u.fled);
    for (const u of this.fled) if (!u.carrier) u.carrier = FLED;
    this.fleeing = this.units.some((u) => u.fleeing || u.fled) && !!this.mission.flee;
    this.retreating = this.units.some((u) => u.retreating) && !!this.mission.flee;
    return this;
  }
}

// Escaped units ride in this placeholder host: off the map, never drawn, never targeted.
const EXIT = { id: -1, type: 0, army: 0, x: -1, y: -1, hp: 1, carrier: null, exit: true };
const FLED = { id: -1, type: 0, army: 1, x: -1, y: -1, hp: 1, carrier: null, exit: true };
const EARTH_CLS = 12;   // Earth's gravity field (and comet bodies): the colony's Earth-side edge band

// The colony's flee rule (js/colony/battle.js has the same): the player's living units at least
// twice the raiders' living units.
export const raidersFlee = (mine, theirs) => theirs > 0 && mine >= 2 * theirs;

// The colony battle's result for colony.html (localStorage COLONY_RESULT, docs/COLONY-V5.md §2):
// { day, won, fled, turns, killed: [raid.units indices destroyed], guardians: [{ id, hp: 0..1, lost }] }.
// fled: some raiders got off the map; they are not in killed. Guardians who got off the map in a
// retreat keep their HP. A retreat is a loss.
export function colonyResult(b, won = b.winner() === 0) {
  const c = b.mission.colony || {};
  const raiders = b.units.filter((u) => u.army === 1 && u.rosterId !== undefined);
  return {
    day: c.day ?? null, won: !!won, fled: !!(won && raiders.some((u) => u.fled && u.hp > 0)), turns: b.turn,
    killed: raiders.filter((u) => u.hp <= 0).map((u) => u.rosterId).sort((x, y) => x - y),
    guardians: b.units.filter((u) => u.army === 0 && u.rosterId !== undefined).map((u) => ({
      id: u.rosterId, hp: u.hp > 0 ? Math.round((u.hp / b.types[u.type].hp) * 1000) / 1000 : 0, lost: u.hp <= 0,
    })),
  };
}

// HUD and briefing helpers for gameapp.js's expansion branch.
export const ARMY_NAMES = ['Galt remnant', 'Union'];

export function expansionHud(b) {
  const o = b.mission.objective || {}, parts = [];
  if (b.mission.flee && b.fleeing) parts.push(`<b>The raiders are running for the edge</b>: ${b.onMap(1).length} still on the map, ${b.fled.length} got away. Chase them down.`);
  if (b.mission.flee && b.retreating) {
    const left = b.onMap(0).filter((u) => !b.stranded(u)).length;
    parts.push(`<b>Retreat</b>: ${b.escaped.length} off the map, ${left} still to go. Move each machine onto an edge hex (the map's border${b.mission.colony?.from === 'earth' ? ', or beside the atmosphere' : ''}) to leave.`);
  }
  if (b.general) parts.push(`General aboard: ${b.general.hp > 0 ? (b.general.escaped ? 'escaped' : 'on the map') : 'lost'}`);
  if (o.kind === 'escape') {
    const need = (o.count ?? 3) + (b.general ? 1 : 0), names = b.escaped.map((u) => (u.general ? `${b.types[u.type].code.trim()} ★` : b.types[u.type].code.trim()));
    parts.push(`Escaped ${b.escaped.length}/${need}${names.length ? ': ' + names.join(', ') : ''}`);
  }
  return parts.length ? `<div class="small">${parts.join('<br>')}</div>` : '';
}

export function briefingPages(mission, goal) {
  const pages = (mission.briefing || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  pages.push(`Objective\n\n${goal}`);
  return pages;
}

// Whether a unit of `type` may stand on (x, y) of the mission's map (start hexes for the roster).
export function standChecker(rom, mission, types, tables) {
  const { rom: view, info } = romView(rom, mission), header = view.body(info.headerId), grid = view.body(info.gridId);
  return (type, x, y) => tables.moveCost(types[type].category, tables.terrain(header[80 + grid[y * 62 + x]]).cls) !== 0;
}

// The colony's raid battle (game.html?colony=1): the mission js/colony/battle.js stored, its
// mid-battle save slot and its result's key.
export const COLONY_MISSION = 'el-colony-raid', COLONY_RESULT = 'el-colony-raid-result', COLONY_BATTLE = 'el-colony-battle';
export function colonyMission() {
  try { const v = localStorage.getItem(COLONY_MISSION); return v ? JSON.parse(v) : null; } catch { return null; }
}

// ?mission=missions/asimov.json on game.html plays that mission (?colony=1: the colony's raid).
// Units, rule tables and text come from the expansion's own data (data.js), not the ROM.
export async function expansionFromUrl(rom) {
  const q = new URLSearchParams(location.search), colony = q.has('colony');
  const url = colony ? 'colony' : q.get('mission');
  if (!url) return null;
  const data = await loadExpansionData(), { types, tables } = data;
  if (colony) return colonyBattle(rom, data);
  let mission = await (await fetch(url, { cache: 'no-cache' })).json(), state = null;
  const missionNo = +(q.get('no') || 0);
  // &c=remnant|classic: which campaign's save the battle reads and writes (campaign.js CAMPAIGNS)
  const camp = campaign.use(q.get('c') || 'classic');
  let total = null;
  if (q.get('campaign')) {
    state = campaign.load();
    if (state) {
      mission = campaign.applyRoster(mission, state, standChecker(rom, mission, types, tables), types);
      // arrivals for one story choice only (`when: { choice }`; the hidden battle's cartel)
      if (mission.arrivals) mission = { ...mission, arrivals: mission.arrivals.filter((e) => !e.when || e.when.choice === state.choice) };
      const index = await campaign.missionIndex();
      if (index) total = campaign.missionList(index, state).length;
    }
  }
  const { rom: view, info } = romView(rom, mission);
  return {
    url, mission, rom: view, info, musicMap: mission.music ?? 0, names: ARMY_NAMES, campaign: !!state,
    // the campaign's mid-battle save slot (each campaign has its own), its length, and the
    // story choice made so far (the finale's epilogue depends on it)
    battleKey: state ? camp.battle : EXPANSION_BATTLE, campaignId: state ? camp.id : null, total, choice: state?.choice,
    ending: (state?.choice !== undefined && mission.endings?.[state.choice]) || mission.ending || null,
    types, tables, text: data.text, terrain: data.terrain,
    // a won campaign battle goes into the saved campaign; returns the supply gained
    finish: (b) => {
      const s = campaign.load(), gain = campaign.finish(s, b, mapPoints(b, missionNo).total, missionNo);
      if (mission.secret && b.turn <= mission.secret.maxTurns) s.secret = true;   // a hidden mission opens (missionList)
      campaign.save(s); return gain;
    },
    // the finale's hidden mission: { maxTurns, unlocked, teaser } (the result screen says which)
    secret: mission.secret || null,
    newBattle: (opts) => new ExpansionBattle(rom, mission, types, { ...opts, tables }),
    briefing: () => briefingPages(mission, scriptOf(mission).goal),
    hud: expansionHud,
  };
}

// The colony's raid (expansionFromUrl with ?colony=1): no campaign, the colony's own names, its
// own save slot; the end writes COLONY_RESULT for colony.html (gameapp.js colonyEnd).
function colonyBattle(rom, data) {
  const mission = colonyMission();
  if (!mission) throw new Error('No raid battle is waiting.');
  const { types, tables } = data, c = mission.colony || {};
  const { rom: view, info } = romView(rom, mission);
  return {
    url: `colony:${c.day}:${c.from}`, mission, rom: view, info, musicMap: mission.music ?? 0, names: ['Eden', 'Raiders'],
    campaign: false, colony: true, battleKey: COLONY_BATTLE, campaignId: null, total: null, choice: undefined, ending: null,
    types, tables, text: data.text, terrain: data.terrain, finish: () => 0, secret: null,
    newBattle: (opts) => new ExpansionBattle(rom, mission, types, { ...opts, tables }),
    briefing: () => briefingPages(mission, scriptOf(mission).goal),
    hud: expansionHud,
    // the result for colony.html; retreat = a loss
    result: (b, won) => colonyResult(b, won),
    store: (result) => { try { localStorage.setItem(COLONY_RESULT, JSON.stringify(result)); localStorage.removeItem(COLONY_MISSION); return true; } catch { return false; } },
  };
}
