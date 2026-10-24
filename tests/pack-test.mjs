// Checks that the expansion pack (js/expansion/pack.js + pack-manifest.json) is enough: maps,
// icons, fight scenes with the info screen, unit art, screens, sound uploads and an expansion
// battle with the AI give byte-identical results from a PackRom and from the real ROM.
//   node tests/pack-test.mjs --rom ROM.zip --patch PATCH.zip
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(join(root, p)).href);
const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
globalThis.ImageData ??= class { constructor(a, w, h) { if (typeof a === 'number') { h = w; w = a; a = new Uint8ClampedArray(w * h * 4); } this.data = a; this.width = w; this.height = h; } };

const { Rom } = await imp('js/rom.js');
const { readRomFile, readPatchFile } = await imp('js/romfile.js');
const { applyBps } = await imp('js/bps.js');
const maps = await imp('js/maps.js');
const { allUnitTypes } = await imp('js/units.js');
const { FightScene } = await imp('js/game/fightscene.js');
const { unitArt } = await imp('js/unitart.js');
const { composeScreen, SCREENS } = await imp('js/screens.js');
const sound = await imp('js/audio/sound.js');
const { romView, terrainPalette } = await imp('js/expansion/mission.js');
const { ExpansionBattle } = await imp('js/expansion/battle.js');
const { aiTurn } = await imp('js/game/ai.js');
const { buildPack, packRoms } = await imp('js/expansion/pack.js');

const file = async (p, read) => { const f = readFileSync(p); return read({ arrayBuffer: async () => f.buffer.slice(f.byteOffset, f.byteOffset + f.length) }); };
const real = new Rom(await file(opt('--rom'), readRomFile));
const realEn = new Rom(applyBps(await file(opt('--patch'), readPatchFile), real.bytes.slice().buffer));
const manifest = JSON.parse(readFileSync(join(root, 'js/expansion/pack-manifest.json'), 'utf8'));
const pack = buildPack(manifest, real, realEn);
const { rom: packRom, textRom } = packRoms(structuredClone(pack));   // as it comes back from IndexedDB
const mission = JSON.parse(readFileSync(join(root, 'missions/asimov.json'), 'utf8'));

// the expansion's own unit data and rule tables (battles read no rules from the ROM or pack)
const data = await (await imp('js/expansion/data.js')).loadExpansionData();
const terrainArt = await imp('js/terrainart.js');

// everything below runs once per ROM and is hashed
function run(rom, romEn) {
  const h = createHash('sha256'), add = (x) => h.update(typeof x === 'string' ? x : Buffer.from(x.buffer ?? x, x.byteOffset ?? 0, x.byteLength ?? x.length));
  const ctx = { fillStyle: '', fillRect() {}, drawImage() {}, putImageData(img) { add(img.data); } };
  const types = data.types;
  add(JSON.stringify(types));
  add(new Uint8Array(maps.battlePalette(rom).flat()));
  for (let m = 0; m < 30; m += 7) add(maps.renderMap(rom, maps.mapInfo(rom, m), { units: true }).img.px);
  const v = romView(rom, mission); add(maps.renderMap(v.rom, v.info, { units: true }).img.px);
  add(JSON.stringify(terrainPalette(rom).map((p) => [p.gfx, p.id, p.cls, p.count])));
  for (let g = 0; g < 40; g++) add(maps.unitIcon(rom, g & 1, g, g & 2 ? 1 : 0).px);
  const u = (type, army) => ({ type, army, hp: types[type].hp, level: 2, x: 5, y: 5 });
  // [attacker, defender, terrain class, attacker's weapon slot]: ranged, melee (slot 2), ship batteries (slot 1)
  for (const [a, d, c, w = 0] of [[0, 2, 0], [9, 30, 3], [30, 34, 5], [24, 53, 8], [56, 43, 6], [16, 39, 2], [2, 0, 7, 2], [1, 30, 4, 2], [30, 34, 15, 1], [31, 0, 7, 1]]) {
    const A = u(a, 0), D = u(d, 1);
    const info = { att: { unit: A, hp: A.hp, level: 2, atk: [90, 90, 120], def: [30, 30, 30], mode: 0, pct: 15 }, def: { unit: D, hp: D.hp, level: 1, atk: [60, 60, 60], def: [40, 20, 20], mode: 0, pct: 5 },
      encircle: { centre: D, around: [{ dir: 1, u: u(1, 0) }] }, support: [{ centre: A, around: [{ dir: 4, u: u(3, 1) }] }, { centre: D, around: [] }] };
    const s = new FightScene(rom, { type: a, army: 0, hp: A.hp, hpAfter: 2, cls: c, slot: w }, { type: d, army: 1, hp: D.hp, hpAfter: 0, cls: c, slot: 2 },
      { counter: true, info, textRom: romEn, names: romEn ? types.map((t) => t.code) : null });
    let n = 0;
    while (!s.done) { s.step(); add(JSON.stringify(s.sounds())); if (n++ % 37 === 0) s.render(ctx); }
  }
  for (let t = 0; t < 58; t += 5) add(unitArt(rom, t).data);
  for (let c = 0; c < 16; c++) { const bg = terrainArt.terrainBackdrop(rom, c); if (bg) add(bg.data); }   // terrain card pictures
  for (const g of [0, 5, 6, 27, 64, 124, 159, 221]) { add(terrainArt.cellImage(rom, g).data); add(terrainArt.cellField(rom, g).data); }
  for (const S of Object.values(SCREENS)) add(composeScreen(rom, S.layers, S.pal, { h: S.h || 28 }).img.px);
  for (const a of sound.SLOT_ASSETS) for (const [addr, d] of sound.uploadBlocks(rom.body(a)).blocks) { add(String(addr)); add(d); }
  for (let g = 1; g < 12; g++) add(JSON.stringify(sound.trackTable(rom, g)));
  for (let m = 0; m < 30; m++) add(JSON.stringify(sound.mapMusic(rom, m, m & 1, 3, 1)));
  // an expansion battle, AI on both sides, with a seeded random term
  let seed = 7; const rnd = Math.random; Math.random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000);
  const b = new ExpansionBattle(rom, mission, types, { tables: data.tables });
  for (let t = 0; t < 20 && b.winner() === null; t++) { for (const _ of aiTurn(b)) if (b.winner() !== null) break; if (b.winner() === null) b.endTurn(); }
  Math.random = rnd;
  add(JSON.stringify([b.turn, b.result, b.units.map((x) => [x.type, x.hp, x.x, x.y, x.level])]));
  return h.digest('hex');
}

const a = run(real, realEn), b = run(packRom, textRom);
const size = Object.values(pack.assets).reduce((t, x) => t + x.bytes.length, 0) + pack.ranges.reduce((t, [, d]) => t + d.length, 0)
  + Object.values(pack.en.assets).reduce((t, x) => t + x.bytes.length, 0);
console.log(`real ROM ${a.slice(0, 16)}\npack     ${b.slice(0, 16)}\n${a === b ? 'PASS identical' : 'FAIL differ'} · pack ${(size / 1024).toFixed(0)} KB of ROM data (+ English text ${(JSON.stringify(pack.text).length / 1024).toFixed(0)} KB)`);
// leaks throw: something outside the manifest
let threw = false; try { packRom.byteAt(0x008000); } catch { threw = true; }
console.log(threw ? 'PASS reads outside the pack throw' : 'FAIL read outside the pack did not throw');
process.exit(a === b && threw ? 0 : 1);
