// Records which ROM assets and bytes the expansion reads, by driving every rendering and sound
// path it uses over a recording ROM, and writes js/expansion/pack-manifest.json (asset ids and
// file ranges only, no ROM data). js/expansion/pack.js copies exactly those out of the player's
// ROM on their first run.
//
//   node tools/record-pack-manifest.mjs --rom "Earth Light (Japan).zip" --patch Earthlight_1_English.zip
//
// Sections: `render` (graphics, music, effects and the tables the renderers read), `interim`
// (terrain tables the map editor reads to describe the ROM maps' terrain; battles take their rules
// from js/expansion/data and read none) and `en` (info-screen graphics from the English-patched ROM).
// Bump `version` whenever the list changes so stored packs are rebuilt.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const VERSION = 3;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

// the renderers create ImageData; a 2d context is only written to
globalThis.ImageData ??= class { constructor(a, w, h) { if (typeof a === 'number') { h = w; w = a; a = new Uint8ClampedArray(w * h * 4); } this.data = a; this.width = w; this.height = h; } };
const ctx = { fillStyle: '', fillRect() {}, putImageData() {}, drawImage() {} };

const { Rom, lorom, ASSET_COUNT } = await imp('js/rom.js');
const { readRomFile, readPatchFile } = await imp('js/romfile.js');
const { applyBps } = await imp('js/bps.js');
const maps = await imp('js/maps.js');
const terrain = await imp('js/terrain.js');
const { allUnitTypes, levelBonus } = await imp('js/units.js');
const { FightScene } = await imp('js/game/fightscene.js');
const { InfoScreen } = await imp('js/game/infoscreen.js');
const { unitArt } = await imp('js/unitart.js');
const { composeScreen, SCREENS } = await imp('js/screens.js');
const sound = await imp('js/audio/sound.js');
const { romView, terrainPalette } = await imp('js/expansion/mission.js');
const { ExpansionBattle } = await imp('js/expansion/battle.js');
const { aiTurn } = await imp('js/game/ai.js');
const { mapPoints } = await imp('js/game/points.js');

const file = async (p, read) => { const f = readFileSync(p); return read({ arrayBuffer: async () => f.buffer.slice(f.byteOffset, f.byteOffset + f.length) }); };
const realRom = new Rom(await file(opt('--rom'), readRomFile));
const realEn = new Rom(applyBps(await file(opt('--patch'), readPatchFile), realRom.bytes.slice().buffer));

// A Rom that logs what is read, into the current section.
class RecordingRom {
  constructor(rom) {
    this.rom = rom; this.title = rom.title; this.log = {}; this.section = null;
    const self = this;
    this.bytes = {
      length: rom.bytes.length,
      subarray(a, b) { self.range(a, b - a); return rom.bytes.subarray(a, b); },
      slice(a = 0, b = rom.bytes.length) { self.range(a, b - a); return rom.bytes.slice(a, b); },
    };
  }
  sec() { if (!this.section) throw new Error('read outside a section'); return (this.log[this.section] ||= { assets: new Set(), ranges: [] }); }
  range(a, n) { this.sec().ranges.push([a, n]); }
  isEarthLight() { return this.rom.isEarthLight(); }
  byteAt(addr) { this.range(lorom(addr), 1); return this.rom.byteAt(addr); }
  wordAt(addr) { return this.byteAt(addr) | (this.byteAt(addr + 1) << 8); }
  entry(k) { this.sec().assets.add(k); return this.rom.entry(k); }
  asset(k) { this.sec().assets.add(k); return this.rom.asset(k); }
  body(k) { this.sec().assets.add(k); return this.rom.body(k); }
}
const rec = new RecordingRom(realRom), recEn = new RecordingRom(realEn);
const during = (section, fn) => { rec.section = recEn.section = section; fn(); rec.section = recEn.section = null; };
const types = allUnitTypes(realRom), T = types.length;

// ------------------------------------------------------------------ render: maps, icons, palette
// the battle board's unit tokens (js/render/tokens.js), every type in every army
const { tokenPixels } = await imp('js/render/tokens.js');
during('render', () => { for (let t = 0; t < 58; t++) for (const a of [0, 1, 2]) tokenPixels(rec, t, a); });

during('render', () => {
  maps.battlePalette(rec);
  for (let m = 0; m < maps.MAP_COUNT; m++) maps.renderMap(rec, maps.mapInfo(rec, m), { units: true });   // editor: ROM maps to copy from
  const gfx = new Set();
  for (let m = 0; m < maps.MAP_COUNT; m++) { const info = maps.mapInfo(realRom, m); for (const v of realRom.body(info.headerId).subarray(0, 80)) gfx.add(v); }
  for (const g of gfx) if (485 + g < ASSET_COUNT) maps.cellGraphic(rec, g);
  for (let t = 0; t < T; t++) maps.unitTypeGfx(rec, t);
  for (let g = 0; g < maps.UNIT_ICONS; g++) for (const army of [0, 1]) for (const fr of [0, 1]) maps.unitIcon(rec, army, g, fr);
});
// an expansion map through its ROM view (mission.js)
const mission = JSON.parse(readFileSync(join(root, 'missions/asimov.json'), 'utf8'));
during('render', () => { const v = romView(rec, mission); maps.renderMap(v.rom, v.info, { units: true }); });
// the battle's terrain card (js/terraincard.js): each class's fight backdrop, or a field of hex cells
const terrainArt = await imp('js/terrainart.js');
during('render', () => {
  for (let c = 0; c < 16; c++) terrainArt.terrainBackdrop(rec, c);
  for (const g of new Set(terrainPalette(realRom).map((p) => p.gfx))) { terrainArt.cellImage(rec, g); terrainArt.cellField(rec, g); }   // the graphics maps use
});

// ------------------------------------------------------------------ render: fights and the info screen
const unit = (type, army, extra = {}) => ({ type, army, hp: types[type].hp, level: 3, x: 5, y: 5, ...extra });
function fakeInfo(att, def) {
  const side = (u) => ({ unit: u, hp: u.hp, level: u.level, atk: [100, 120, 140], def: [40, 30, 30], mode: 1, pct: 25 });
  const around = (army) => [0, 1, 2, 3, 4, 5].map((dir) => ({ dir, u: unit((dir * 7) % T, army) }));
  return { att: side(att), def: side(def), encircle: { centre: def, around: around(att.army) }, support: [{ centre: att, around: around(def.army) }, { centre: def, around: around(att.army) }] };
}
function playFight(attType, defType, cls, english, slot = 0) {
  const a = unit(attType, 0), d = unit(defType, 1);
  const side = (u, cut, slot) => ({ type: u.type, army: u.army, hp: u.hp, hpAfter: Math.max(0, u.hp - cut), cls, slot });
  const s = new FightScene(rec, side(a, 2, slot), side(d, 3, 2), { counter: true, info: fakeInfo(a, d), textRom: english ? recEn : null, names: english ? types.map((t) => t.code) : null });
  const stops = new Set([0, 31, 40, 60, 90, 140, 200, 240, s.introLen - 1, s.introLen + 1, s.introLen + 100, s.introLen + 200]);
  while (!s.done) { s.step(); s.sounds(); if (stops.has(s.clock)) s.render(ctx); }
  s.render(ctx);
}
during('render', () => {
  // every weapon slot: slots 1-3 load the second sprite sheets ($04:D072), for both sides
  for (let t = 0; t < T; t++) for (const slot of [0, 1, 2, 3]) { playFight(t, 0, 0, t & 1, slot); playFight(t, 34, 0, t & 1, slot); playFight(0, t, 0, !(t & 1), slot); playFight(34, t, 0, t & 1, slot); }
  for (let c = 0; c < 16; c++) playFight(0, 0, c, false);
  for (let t = 0; t < T; t++) for (const en of [false, true]) {   // info screen names and codes for every type, both languages
    const info = fakeInfo(unit(t, 0), unit((t + 9) % T, 1)), I = new InfoScreen(rec, info, { textRom: en ? recEn : null, names: en ? types.map((x) => x.code) : null });
    for (const f of [0, 40, I.T.E, I.T.S, I.T.T, I.T.end - 1]) I.render(ctx, f);
  }
  for (let t = 0; t < T; t++) unitArt(rec, t);
  for (const S of Object.values(SCREENS)) composeScreen(rec, S.layers, S.pal, { h: S.h || 28 });
});

// ------------------------------------------------------------------ render: sound
during('render', () => {
  for (const v of sound.SLOT_ASSETS) sound.uploadBlocks(rec.body(v));
  for (let g = 0; g < sound.GROUPS.length; g++) sound.trackTable(rec, g);
  for (let m = 0; m < 30; m++) for (const side of [0, 1]) sound.mapMusic(rec, m, side, 4, 1), sound.mapMusic(rec, m, side, 1, 4), sound.mapMusic(rec, m, side);
  sound.soundTest(rec);
});

// ------------------------------------------------------------------ interim: rule tables
const data = await (await imp('js/expansion/data.js')).loadExpansionData();
during('interim', () => {
  terrainPalette(rec);
  for (let t = 0; t < terrain.TYPES; t++) terrain.nameIndex(rec, t), terrain.classOfType(rec, t);
  for (let c = 0; c < terrain.CLASSES; c++) for (let m = 0; m < 3; m++) terrain.defence(rec, c, m), terrain.targetable(rec, c, m);
  for (let k = 1; k <= terrain.CATEGORIES; k++) for (let c = 0; c < terrain.CLASSES; c++) terrain.moveCost(rec, k, c);
  // battles: the expansion engine on a custom map, AI on both sides, points at the end
  for (let run = 0; run < 6; run++) {
    const b = new ExpansionBattle(rec, mission, data.types, { tables: data.tables });
    for (let turn = 0; turn < 24 && b.winner() === null; turn++) {
      b.army = b.army;   // AI plays whichever army is up
      for (const _ of aiTurn(b)) if (b.winner() !== null) break;
      if (b.winner() !== null) break;
      b.endTurn();
    }
    mapPoints(b, 0);
  }
});

// ------------------------------------------------------------------ write
const { mergeRanges } = await imp('js/expansion/pack.js');
const out = (L) => ({ assets: [...L.assets].sort((a, b) => a - b), ranges: mergeRanges(L.ranges) });
const render = out(rec.log.render), interim = out(rec.log.interim);
// interim keeps only what render doesn't already have
const inRender = (a) => render.ranges.some(([o, n]) => a >= o && a < o + n);
interim.assets = interim.assets.filter((k) => !render.assets.includes(k));
interim.ranges = mergeRanges(interim.ranges.flatMap(([o, n]) => Array.from({ length: n }, (_, i) => o + i)).filter((a) => !inRender(a)).map((a) => [a, 1]));
const manifest = { version: VERSION, note: 'Asset ids and ROM file ranges the expansion reads; js/expansion/pack.js copies them from the player\'s own ROM. No ROM data here.', render, interim, en: { assets: [...(recEn.log.render?.assets || [])].sort((a, b) => a - b) } };
writeFileSync(join(root, 'js/expansion/pack-manifest.json'), JSON.stringify(manifest, null, 1).replace(/\n\s+(\d+,?)/g, ' $1').replace(/\[\s+(\d)/g, '[$1').replace(/(\d)\s+\]/g, '$1]') + '\n');
const bytes = (s) => s.ranges.reduce((t, [, n]) => t + n, 0);
const assetBytes = (ids, r) => ids.reduce((t, k) => t + r.asset(k).length, 0);
console.log(`render: ${render.assets.length} assets (${(assetBytes(render.assets, realRom) / 1024).toFixed(0)} KB), ${render.ranges.length} ranges (${bytes(render)} bytes)`);
console.log(`interim: ${interim.assets.length} assets, ${interim.ranges.length} ranges (${bytes(interim)} bytes)`);
console.log(`en: ${manifest.en.assets.join(', ')}`);
