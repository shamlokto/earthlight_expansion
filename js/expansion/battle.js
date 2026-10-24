// Expansion battles: the base game's Battle on a custom map (mission.js), plus the expansion's
// rules (docs/EXPANSION.md):
//   * the general rides one unit: evasion x2 (capped at 96/128), power x2, level 9; if that unit
//     is destroyed the game is over
//   * objectives beyond the base game's: escape (get N units, the general among them, off an
//     edge; lost once too few units are left) and destroyType (destroy every enemy unit of one
//     type, cargo included; optionally lost if one of them reaches an edge)
//   * a turn limit from the mission
// The player is army 0 (pink, on the left in fights), the Union army 1, as in the original.
import { Battle } from '../game/rules.js';
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
    list.forEach((d, i) => { if (d.level !== undefined) this.units[i].level = d.level; if (d.rosterId !== undefined) this.units[i].rosterId = d.rosterId; });
    this.escaped = [];
    const g = mission.general && this.units.find((u) => u.army === 0 && u.x === mission.general.x && u.y === mission.general.y && !u.carrier);
    this.general = g || null;
    if (g) { g.general = true; g.pilotLevel = g.level; g.level = 9; }   // level 9 only while the general is aboard
    this.boosted = new Map();
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
    const exit = this.exitCells();
    if (exit && u.army === 0 && exit(x, y)) {
      // whatever rides inside leaves with it (the general may be aboard a carrier)
      const leaving = [u, ...this.cargo(u)];
      u.carrier = EXIT; u.x = -1; u.y = -1;
      for (const v of leaving) { v.escaped = true; this.escaped.push(v); }
      this.log.push({ kind: 'escape', u });
    }
  }

  winner() {
    if (!this.result) this.result = this.expansionOutcome();
    return super.winner();
  }
  expansionOutcome() {
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
    return this;
  }
}

// Escaped units ride in this placeholder host: off the map, never drawn, never targeted.
const EXIT = { id: -1, type: 0, army: 0, x: -1, y: -1, hp: 1, carrier: null, exit: true };

// HUD and briefing helpers for gameapp.js's expansion branch.
export const ARMY_NAMES = ['Galt remnant', 'Union'];

export function expansionHud(b) {
  const o = b.mission.objective || {}, parts = [];
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

// ?mission=missions/asimov.json on game.html plays that mission.
// Units, rule tables and text come from the expansion's own data (data.js), not the ROM.
export async function expansionFromUrl(rom) {
  const q = new URLSearchParams(location.search), url = q.get('mission');
  if (!url) return null;
  const data = await loadExpansionData(), { types, tables } = data;
  let mission = await (await fetch(url)).json(), state = null;
  const missionNo = +(q.get('no') || 0);
  // &c=remnant|classic: which campaign's save the battle reads and writes (campaign.js CAMPAIGNS)
  const camp = campaign.use(q.get('c') || 'classic');
  let total = null;
  if (q.get('campaign')) {
    state = campaign.load();
    if (state) {
      mission = campaign.applyRoster(mission, state, standChecker(rom, mission, types, tables), types);
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
    finish: (b) => { const s = campaign.load(); const gain = campaign.finish(s, b, mapPoints(b, missionNo).total, missionNo); campaign.save(s); return gain; },
    newBattle: (opts) => new ExpansionBattle(rom, mission, types, { ...opts, tables }),
    briefing: () => briefingPages(mission, scriptOf(mission).goal),
    hud: expansionHud,
  };
}
