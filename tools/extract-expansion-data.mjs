// Seeds the expansion's own data files (js/expansion/data/*.json) from the original game:
//
//   node tools/extract-expansion-data.mjs --rom "Earth Light (Japan).zip" --patch Earthlight_1_English.zip
//
// Run once. From then on the JSON files belong to the expansion's design and are edited by
// hand; re-running overwrites them with the original's values. Every rule value is copied
// unchanged, so the expansion plays by the original's rules until we decide otherwise.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const { Rom, lorom } = await imp('js/rom.js');
const { readRomFile, readPatchFile } = await imp('js/romfile.js');
const { applyBps } = await imp('js/bps.js');
const { readEnglish, unitText, LAYOUT } = await imp('js/text.js');
const { allUnitTypes } = await imp('js/units.js');
const { romTables } = await imp('js/game/tables.js');
const { CLASSES, CATEGORIES, TYPES, nameIndex } = await imp('js/terrain.js');

const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const file = (p) => { const b = readFileSync(p); return { arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length) }; };
if (!opt('--rom') || !opt('--patch')) { console.error('usage: node tools/extract-expansion-data.mjs --rom ROM --patch PATCH'); process.exit(1); }
const rom = new Rom(await readRomFile(file(opt('--rom'))));
if (!rom.isEarthLight()) throw new Error('not Earth Light (Japan)');
const en = readEnglish(applyBps(await readPatchFile(file(opt('--patch'))), rom.bytes.slice().buffer));
const T = romTables(rom), types = allUnitTypes(rom);
const out = join(root, 'js/expansion/data');
mkdirSync(out, { recursive: true });
const NOTE = 'Seeded from Earth Light (Japan) by tools/extract-expansion-data.mjs; the expansion\'s own data from here on (may diverge from the original).';
const bytes = (addr, n) => [...rom.bytes.subarray(lorom(addr), lorom(addr) + n)];

// ------------------------------------------------------------------ units
const units = types.map((t) => ({
  type: t.type, name: en.unitNames[t.type], nameJp: t.name, code: t.code,
  category: t.category, startLevel: t.startLevel, hp: t.hp, move: t.move, evasion: t.evasion,
  value: t.value, moveOrFire: t.moveOrFire, cut: t.cut,
  weapons: t.weapons,   // per slot { slot, mode (0 B / 1 N / 2 M), min, max, power } or null
  ...(t.form !== undefined ? { form: t.form } : {}), ...(t.otherForm !== undefined ? { otherForm: t.otherForm } : {}),
  ...(t.formOf !== undefined ? { formOf: t.formOf } : {}), ...(t.spent !== undefined ? { spent: t.spent } : {}),
  ...(t.armed !== undefined ? { armed: t.armed } : {}), ...(t.loaded !== undefined ? { loaded: t.loaded } : {}),
  ...(t.empty !== undefined ? { empty: t.empty } : {}),
  aiValue: T.aiValue(t.type),
  info: { attack: [0, 1, 2, 3].map((s) => T.infoAttack(t.type, s)), defence: T.infoDefence(t.type), minRange: [0, 1, 2, 3].map((s) => T.minRange(t.type, s)) },
  // graphics references, read by the renderers (asset pack): map icon, fight sprite sheet,
  // unit-info art (tiles asset, palette asset, sprite frame), name/code bytes on the info screen
  gfx: t.gfx,
  art: { fightSheet: rom.byteAt(0x04d038 + t.type), tiles: rom.wordAt(0x04f172 + t.type * 2), palette: rom.wordAt(0x04f1e6 + t.type * 2), frame: rom.byteAt(0x04f25a + t.type) },
  nameBytes: bytes(0x01ee66 + t.type * 8, 8), codeBytes: bytes(0x01f036 + t.type * 8, 8),
}));
writeFileSync(join(out, 'units.json'), JSON.stringify({ note: NOTE, units }, null, 1));

// ------------------------------------------------------------------ terrain
const termName = (n) => (n < LAYOUT.terrainNames ? en.main[LAYOUT.terrainName + n].replace(/\s*\n\s*/g, ' ').replace(/- /g, '').trim() : null);
const tTypes = Array.from({ length: TYPES }, (_, ty) => {
  const n = nameIndex(rom, ty);
  return { type: ty, cls: rom.byteAt(0x01cece + ty), nameIndex: n, name: termName(n), description: n < LAYOUT.terrainNames ? en.main[LAYOUT.terrainDesc + n] : null };
});
const classes = Array.from({ length: CLASSES }, (_, c) => ({
  cls: c, names: [...new Set(tTypes.filter((t) => t.cls === c && t.name).map((t) => t.name))],
  defence: [0, 1, 2].map((m) => T.defence(c, m)),
  display: [0, 1, 2].map((m) => T.displayDefence(c, m)),
  targetable: [0, 1, 2].map((m) => T.targetable(c, m)),
  moveCost: Array.from({ length: CATEGORIES }, (_, k) => T.moveCost(k + 1, c)),
}));
const ids = Array.from({ length: 128 }, (_, id) => T.terrain(id).type);
writeFileSync(join(out, 'terrain.json'), JSON.stringify({
  note: NOTE,
  legend: 'ids[terrain id] = terrain type; types[type].cls = class; classes[cls]: defence = combat reduction /128 per mode (B, N, M), display = % shown, targetable per mode, moveCost[category-1] (0 blocked, "stop" ends movement)',
  ids, types: tTypes, classes,
}, null, 1));

// ------------------------------------------------------------------ rules
writeFileSync(join(out, 'rules.json'), JSON.stringify({
  note: NOTE,
  levelBonus: Array.from({ length: 16 }, (_, l) => T.levelBonus(l)),   // damage x bonus/16 by level
  maxLevel: 9,
}, null, 1));

// ------------------------------------------------------------------ text
// The English lines the battle pages show (labels and messages), unit names and the unit info
// screen's texts per type. Spent and loaded forms use their base type's texts, as the wiki does.
const unitInfo = types.map((t) => {
  const own = unitText(en, t.type), base = t.armed ?? t.empty, b = base !== undefined ? unitText(en, base) : null;
  return { type: t.type, name: own.name, short: own.short ?? b?.short ?? null, info: own.info ?? b?.info ?? null };
});
writeFileSync(join(out, 'text.json'), JSON.stringify({
  note: `${NOTE} English text from Nezz's fan translation (GPL-3.0, github.com/HoratioVex/Earthlight-1-Translation).`,
  armyNames: ['Galt remnant', 'Union'],
  unitNames: en.unitNames, unitInfo, labels: en.labels, main: en.main,
}, null, 1));
console.log(`wrote ${units.length} units, ${classes.length} terrain classes, ${tTypes.length} terrain types, text (${en.labels.length} labels, ${en.main.length} messages) to js/expansion/data/`);
