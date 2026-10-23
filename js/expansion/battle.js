// Expansion battles: the base game's Battle on a custom map (mission.js), plus the expansion's
// rules (docs/EXPANSION.md):
//   * the general rides one unit: evasion x2 (capped at 96/128), power x2, level 9; if that unit
//     is destroyed the game is over
//   * objectives beyond the base game's: escape (get N units, the general among them, off an
//     edge) and destroyType (destroy every enemy unit of one type, cargo included)
//   * a turn limit from the mission
// The player is army 0 (pink, on the left in fights), the Union army 1, as in the original.
import { Battle } from '../game/rules.js';
import { romView, deployList, arrivalList } from './mission.js';
import { mapPoints } from '../game/points.js';
import * as campaign from './campaign.js';

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
    const list = deployList(mission);
    super(view, info, types, list, arrivalList(mission), { script: scriptOf(mission), hard: opts.hard });
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
  damage(att, def, w) {
    const p = super.damage(att, def, w);
    return att.general ? p * 2 : p;
  }

  // Escape: a player unit that ends its move on the exit edge leaves the map.
  exitCells() {
    const o = this.mission.objective;
    if (o?.kind !== 'escape') return null;
    const edge = o.edge || 'east', c = this.info.cols - 1, r = this.info.rows;
    return (x, y) => (edge === 'east' ? x === c : edge === 'west' ? x === 1 : edge === 'north' ? y === 1 : y === r);
  }
  move(u, x, y) {
    super.move(u, x, y);
    const exit = this.exitCells();
    if (exit && u.army === 0 && exit(x, y)) {
      u.escaped = true; u.carrier = EXIT; u.x = -1; u.y = -1;
      this.escaped.push(u);
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
    }
    if (o.kind === 'destroyType') {
      const marked = this.units.filter((u) => u.army === 1 && u.type === o.type);
      if (marked.length && marked.every((u) => u.hp <= 0)) return { winner: 0, reason: 'annihilate' };
    }
    return null;
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

// ?mission=missions/asimov.json on game.html plays that mission.
export async function expansionFromUrl(rom, types) {
  const q = new URLSearchParams(location.search), url = q.get('mission');
  if (!url) return null;
  let mission = await (await fetch(url)).json(), state = null;
  const missionNo = +(q.get('no') || 0);
  if (q.get('campaign')) { state = campaign.load(); if (state) mission = campaign.applyRoster(mission, state); }
  const { rom: view, info } = romView(rom, mission);
  return {
    mission, rom: view, info, musicMap: mission.music ?? 0, names: ARMY_NAMES, campaign: !!state,
    // a won campaign battle goes into the saved campaign; returns the supply gained
    finish: (b) => { const s = campaign.load(); const gain = campaign.finish(s, b, mapPoints(b, missionNo).total, missionNo); campaign.save(s); return gain; },
    newBattle: (opts) => new ExpansionBattle(rom, mission, types, opts),
    briefing: () => briefingPages(mission, scriptOf(mission).goal),
    hud: expansionHud,
  };
}
