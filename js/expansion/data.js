// The expansion's own game data (js/expansion/data/*.json): units, terrain, rules and text.
// Seeded from the original by tools/extract-expansion-data.mjs and edited from then on, so
// expansion battles read no rule tables from the ROM. Works in the browser (fetch) and in
// Node (tests, tools).
import { dataTables } from '../game/tables.js';

const FILES = ['units', 'terrain', 'rules', 'text'];

async function readJson(name) {
  const url = new URL(`./data/${name}.json`, import.meta.url);
  if (url.protocol === 'file:') {
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(url, 'utf8'));
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`expansion data ${name}.json: HTTP ${r.status}`);
  return r.json();
}

let loaded = null;

// { units, terrain, rules, text, types, tables }: `types` has the shape of units.js
// allUnitTypes() (indexed by type), `tables` the Battle tables interface (game/tables.js),
// `text` the shape of text.js readEnglish() for the parts the battle pages use, plus
// unitInfo[type] { name, short, info } and armyNames.
export function loadExpansionData() {
  if (!loaded) {
    loaded = Promise.all(FILES.map(readJson)).then(([units, terrain, rules, text]) => {
      const types = [];
      for (const u of units.units) types[u.type] = { ...u };
      return { units: units.units, terrain, rules, text, types, tables: dataTables({ units: units.units, terrain, rules }) };
    });
  }
  return loaded;
}
