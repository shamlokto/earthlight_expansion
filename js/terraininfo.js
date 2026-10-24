// Terrain facts for the battle's terrain card and the wiki: name, description, defence per
// weapon mode, which modes can hit a unit there and the movement cost for each kind of unit.
// Everything goes through a Battle's rule tables (game/tables.js), so the original campaign
// reads the ROM and expansion battles read the expansion's own data; text comes from the English
// patch (original) or the expansion's terrain.json.
import { nameIndex } from './terrain.js';
import { LAYOUT } from './text.js';

export const MODES = ['Beam', 'Railgun', 'Missile'];
export const CLASSES = 16;

// Unit categories that move, in the order players think of them, with a short plain label.
// Categories 5-7 (fortresses, command centres, docks), 12 (cut turrets) and 15 (mines) never move.
export const MOVERS = [
  { cat: 8, label: 'Hunters' }, { cat: 9, label: 'Fighters' }, { cat: 10, label: 'Bombers' },
  { cat: 11, label: 'Gunboats' }, { cat: 13, label: 'Transports' }, { cat: 14, label: 'Rail cannons' },
  { cat: 3, label: 'Cruisers' }, { cat: 4, label: 'Missile ships' }, { cat: 2, label: 'Battleships' }, { cat: 1, label: 'Carriers' },
];

// The two classes the original never names (built structures on fortress and dock maps).
const UNNAMED = { 14: ['Base Hatch', 'Hatches and gates of a base. Units can cross them, but they give no cover.'],
  15: ['Base Machinery', 'Reactors and machinery of a base. Nothing can enter.'] };

// The original's lines are separate phrases without full stops ("Ships can't enter\nOther units ..."):
// a line break before a capital letter starts a new sentence.
const oneLine = (s) => (s || '').replace(/(\w)-\s*\n\s*(\w)/g, '$1$2').replace(/([a-z0-9])\s*\n\s*([A-Z])/g, '$1. $2').replace(/\s*\n\s*/g, ' ').trim();

// The original's descriptions open with a short tag line ("Open Space") and a blank line.
function described(name, raw, ours = false) {
  const [first, ...rest] = (raw || '').split(/\n\s*\n/);
  return rest.length ? { name, tag: oneLine(first), description: oneLine(rest.join(' ')), ours } : { name, tag: '', description: oneLine(raw), ours };
}

// Name, tag line and description of a terrain type. `terrainData` is the expansion's terrain.json;
// `en` the English text (readEnglish) and `rom` the ROM for the type -> text index ($01:CEF0).
export function terrainText(type, cls, { terrainData = null, en = null, rom = null } = {}) {
  const d = terrainData?.types?.[type];
  if (d?.name) return described(d.name, d.description);
  if (en?.main && rom) {
    const n = nameIndex(rom, type);
    if (n < LAYOUT.terrainNames) return described(oneLine(en.main[LAYOUT.terrainName + n]).replace(/- /g, ''), en.main[LAYOUT.terrainDesc + n]);
  }
  const u = UNNAMED[cls];
  return u ? described(u[0], u[1], true) : described(`Terrain class ${cls}`, '', true);
}

export const slug = (name) => `terrain-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

// The facts for one terrain class through a tables object (Battle.tables).
export function classFacts(tables, cls) {
  return {
    defence: [0, 1, 2].map((m) => tables.displayDefence(cls, m)),
    targetable: [0, 1, 2].map((m) => !!tables.targetable(cls, m)),
    move: MOVERS.map((g) => ({ ...g, cost: tables.moveCost(g.cat, cls) })),
  };
}

// The terrain under hex (x, y) of a battle.
export function cellTerrain(b, x, y) {
  const v = b.grid[y * 62 + x], id = b.header[80 + v], gfx = b.header[v];
  const { type, cls } = b.tables.terrain(id);
  return { v, id, gfx, type, cls };
}

// Plain words for a movement cost.
export function costWords(c) {
  if (c === 0) return { short: 'No entry', long: "can't enter", kind: 'blocked' };
  if (c === 'stop') return { short: 'Stops', long: 'entering ends its move', kind: 'stop' };
  return { short: `${c} pt${c > 1 ? 's' : ''}`, long: `costs ${c} movement point${c > 1 ? 's' : ''}`, kind: c > 1 ? 'slow' : 'free' };
}

// A representative map icon (gfx index) for each moving category: its first placed, uncut type.
export function categoryIcons(types) {
  const out = {};
  for (const g of MOVERS) {
    const t = types.find((u) => u.category === g.cat && !u.cut && u.move > 0 && u.armed === undefined && u.formOf === undefined && u.empty === undefined);
    if (t) out[g.cat] = t;
  }
  return out;
}

// Unit names in each moving category (for the wiki).
export function categoryUnits(types, names) {
  const out = {};
  for (const g of MOVERS) {
    out[g.cat] = [...new Set(types.filter((u) => u.category === g.cat && !u.cut && u.move > 0).map((u) => (names ? names[u.type] : u.name)))];
  }
  return out;
}
