// The expansion's art and sound pack. The expansion draws with the original's graphics and plays
// its music, but it must run without the ROM: on the first run the assets and table bytes it
// uses (js/expansion/pack-manifest.json, recorded by tools/record-pack-manifest.mjs) are copied
// out of the player's own ROM into this browser's IndexedDB. After that a PackRom stands in for
// the ROM everywhere the renderers and the sound driver read it. Nothing from the ROM is ever
// shipped or committed: the pack is built on the player's machine from their copy.
//
//   const { rom, textRom, text } = await ensurePack();   // PackRom, PackRom | null, readEnglish() | null
//
// PackRom reads outside the pack throw, naming the asset or address, so a renderer that starts
// reading something new shows up at once (re-record the manifest and bump its version).
import { Rom, lorom } from '../rom.js';
import { readRomFile, readPatchFile } from '../romfile.js';
import { applyBps } from '../bps.js';
import { readEnglish } from '../text.js';

const DB = 'earthlight-expansion', STORE = 'pack', KEY = 'pack';
const MANIFEST_URL = new URL('./pack-manifest.json', import.meta.url);
const ROM_SIZE = 0x100000;

// ------------------------------------------------------------------ building
// The manifest lists asset ids and ROM file ranges in sections: `render` (graphics, sound and the
// tables the renderers read), `interim` (rule tables the expansion still reads from the ROM until
// it has its own data files) and `en` (assets the info screen takes from the English-patched ROM).
export function buildPack(manifest, rom, romEn = null, { interim = true } = {}) {
  const sections = [manifest.render, ...(interim && manifest.interim ? [manifest.interim] : [])];
  const take = (r, ids) => {
    const out = {};
    for (const k of ids) { const e = r.entry(k); out[k] = { kind: e.kind, type: e.type, lead: e.lead, data: e.data, trail: e.trail, bytes: r.asset(k).slice() }; }
    return out;
  };
  const ids = [...new Set(sections.flatMap((s) => s.assets))];
  const ranges = mergeRanges(sections.flatMap((s) => s.ranges)).map(([a, n]) => [a, rom.bytes.slice(a, a + n)]);
  return {
    version: manifest.version, made: Date.now(), title: rom.title, interim: !!(interim && manifest.interim),
    assets: take(rom, ids), ranges,
    en: romEn ? { assets: take(romEn, manifest.en.assets) } : null,
    text: romEn ? readEnglish(romEn.bytes.slice().buffer) : null,
  };
}

// [[offset, length]] sorted and joined where they touch or overlap
export function mergeRanges(list) {
  const s = [...list].sort((a, b) => a[0] - b[0]), out = [];
  for (const [a, n] of s) {
    const last = out[out.length - 1];
    if (last && a <= last[0] + last[1]) last[1] = Math.max(last[1], a + n - last[0]);
    else out.push([a, n]);
  }
  return out;
}

// ------------------------------------------------------------------ the stand-in ROM
// What the renderers and the sound code call on a Rom: asset, body, entry, byteAt, wordAt,
// bytes.subarray / bytes.slice (mapInfo and units.js read names straight from the file), title.
export class PackRom {
  constructor(assets, ranges = []) {
    this.assets = assets;
    this.ranges = ranges;     // [[file offset, Uint8Array]] sorted
    this.title = 'EARTH LIGHT';
    const self = this;
    this.bytes = {
      length: ROM_SIZE,
      subarray(a, b = ROM_SIZE) { return self.fileRange(a, b); },
      slice(a = 0, b = ROM_SIZE) { return self.fileRange(a, b).slice(); },
    };
  }
  isEarthLight() { return true; }

  fileRange(a, b) {
    const r = this.ranges;
    let lo = 0, hi = r.length - 1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1, [o, d] = r[m];
      if (a < o) hi = m - 1;
      else if (a >= o + d.length) lo = m + 1;
      else {
        if (b > o + d.length) break;
        return d.subarray(a - o, b - o);
      }
    }
    throw new Error(`expansion pack: ROM bytes $${a.toString(16)}-$${(b - 1).toString(16)} are not in the pack (pack-manifest.json)`);
  }
  byteAt(addr) { return this.fileRange(lorom(addr), lorom(addr) + 1)[0]; }
  wordAt(addr) { return this.byteAt(addr) | (this.byteAt(addr + 1) << 8); }

  has(k) { return !!this.assets[k]; }
  entry(k) {
    const a = this.assets[k];
    if (!a) throw new Error(`expansion pack: asset ${k} is not in the pack (pack-manifest.json)`);
    return { id: k, kind: a.kind, type: a.type, lead: a.lead, data: a.data, trail: a.trail };
  }
  asset(k) { this.entry(k); return this.assets[k].bytes; }
  body(k) { const e = this.entry(k); return this.assets[k].bytes.subarray(e.lead, e.lead + e.data); }
}

export function packRoms(pack) {
  return { rom: new PackRom(pack.assets, pack.ranges), textRom: pack.en ? new PackRom(pack.en.assets) : null, text: pack.text, pack };
}

// ------------------------------------------------------------------ storage
function idb(name, store, mode, fn) {
  return new Promise((res) => {
    try {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(store);
      r.onsuccess = () => {
        const tx = r.result.transaction(store, mode), q = fn(tx.objectStore(store));
        tx.oncomplete = () => res(q.result ?? null); tx.onerror = () => res(null); tx.onabort = () => res(null);
      };
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}
export const loadPack = () => idb(DB, STORE, 'readonly', (s) => s.get(KEY));
export const savePack = (pack) => idb(DB, STORE, 'readwrite', (s) => s.put(pack, KEY));
export const clearPack = () => idb(DB, STORE, 'readwrite', (s) => s.delete(KEY));
const labGet = (key) => idb('earthlight-lab', 'rom', 'readonly', (s) => s.get(key));

// serve.py --rom/--patch exposes test files on localhost
async function testFile(url, read) {
  try { const r = await fetch(url); return r.ok ? await read(new File([await r.arrayBuffer()], 'f')) : null; } catch { return null; }
}

// ------------------------------------------------------------------ first run
// The pack from IndexedDB, or built once from a ROM: the one the lab or the original game already
// stored, serve.py's test files, or one the player picks (onNeedRom, default: a small dialog).
// onProgress(text) reports what it is doing.
export async function ensurePack({ onNeedRom = pickRomDialog, onProgress = () => {} } = {}) {
  const manifest = await (await fetch(MANIFEST_URL)).json();
  const stored = await loadPack();
  if (stored && stored.version === manifest.version) return packRoms(stored);
  let romBuf = (await labGet('rom')) || (await testFile('/__test_rom', readRomFile));
  let patchBuf = (await labGet('patch')) || (await testFile('/__test_patch', readPatchFile));
  if (!romBuf) ({ rom: romBuf, patch: patchBuf = patchBuf } = await onNeedRom());
  onProgress('Extracting the original graphics and sound from your ROM…');
  const rom = new Rom(romBuf);
  if (!rom.isEarthLight()) throw new Error('That ROM is not Earth Light (Japan).');
  let romEn = null;
  if (patchBuf) { try { romEn = new Rom(applyBps(patchBuf, rom.bytes.slice().buffer)); } catch { romEn = null; } }
  const pack = buildPack(manifest, rom, romEn);
  await savePack(pack);
  return packRoms(pack);
}

// Asks for the ROM (and optionally Nezz's English patch) once. Resolves { rom, patch }.
export function pickRomDialog() {
  return new Promise((resolve) => {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75)';
    box.innerHTML = `<form style="background:var(--panel,#13162b);color:var(--text,#e6e8f5);border:1px solid var(--line,#2b3160);border-radius:8px;padding:16px 18px;max-width:520px;display:flex;flex-direction:column;gap:10px;font:14px/1.5 system-ui,sans-serif">
      <b style="color:var(--accent,#f5c542)">One-time setup</b>
      <span>The expansion uses the original game's graphics and music. Choose your <b>Earth Light (Japan)</b> ROM (<code>.sfc</code> or its <code>.zip</code>) once; they are copied into this browser and the ROM isn't needed again. Nothing is uploaded.</span>
      <label>ROM <input type="file" name="rom" accept=".sfc,.smc,.zip"></label>
      <label>English patch (optional, Nezz's <code>.bps</code> or <code>.zip</code>) <input type="file" name="patch" accept=".bps,.zip"></label>
      <span class="msg" style="color:var(--muted,#9097c0)"></span>
      <button class="btn primary" type="submit" disabled>Continue</button></form>`;
    document.body.append(box);
    const f = box.querySelector('form'), msg = box.querySelector('.msg'), go = f.querySelector('button');
    let rom = null, patch = null;
    f.rom.onchange = async () => {
      rom = null; go.disabled = true;
      try { const b = await readRomFile(f.rom.files[0]); if (new Rom(b).isEarthLight()) { rom = b; msg.textContent = 'ROM recognised.'; go.disabled = false; } else msg.textContent = 'That file is not Earth Light (Japan).'; } catch (e) { msg.textContent = `Could not read it: ${e.message}`; }
    };
    f.patch.onchange = async () => { try { patch = await readPatchFile(f.patch.files[0]); msg.textContent = 'Patch read.'; } catch (e) { patch = null; msg.textContent = `Could not read the patch: ${e.message}`; } };
    f.onsubmit = (e) => { e.preventDefault(); if (!rom) return; box.remove(); resolve({ rom, patch }); };
  });
}
