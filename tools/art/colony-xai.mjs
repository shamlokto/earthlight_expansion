// Generates the colony game's pictures (js/colony/art.js MANIFEST) with xAI's image model.
//   node tools/art/colony-xai.mjs [options] [slot or kind ...]      e.g.  card   card/farm   terrain/hull
// For each chosen slot without a picture: style bible (tools/art/colony/style.txt) + the kind's
// preamble (prompts/_<kind>.txt) + the slot's prompt file → tools/art/xai-gen.py (with the slot's
// reference pictures, edits endpoint, once they exist) → tools/art/colony/post.py (crop, resize,
// seamless tiling for terrain, compact WebP) → art/colony/<kind>/<name>.webp, and the FILES list in
// js/colony/art.js is refreshed. Every image counts against the budget in XAI_QUOTA (default
// tools/art/colony/quota.txt; xai-gen.py refuses beyond 100).
// Options:
//   --n N          candidates per slot (default 1); the first is installed unless --review
//   --review       only generate; look at the raw files, then install one with --install
//   --force        also regenerate slots that already have a picture
//   --max K        stop after K images in this run
//   --dry          print what would be sent, spend nothing
//   --install SLOT RAW   post-process RAW into SLOT (no image spent)
//   --index        refresh the FILES list in js/colony/art.js from art/colony/
// Env: XMODEL (default grok-imagine-image-2.0), COLONY_RAW (raw outputs; default a temp folder).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ART_JS = join(ROOT, 'js/colony/art.js');
const { MANIFEST } = await import(pathToFileURL(ART_JS).href);
const COL = join(ROOT, 'tools/art/colony');
const RAW = process.env.COLONY_RAW || join(tmpdir(), 'earthlight-colony-raw');
const env = { ...process.env, XAI_LIMIT: process.env.XAI_LIMIT || '200', XMODEL: process.env.XMODEL || 'grok-imagine-image-2.0', XAI_QUOTA: process.env.XAI_QUOTA || join(COL, 'quota.txt') };

const ASPECT = { card: '1:1', terrain: '1:1', portrait: '3:4', sky: '2:1', title: '16:9', scene: '16:9', site: '16:9', vault: '16:9', danger: '16:9' };
const MAX_KB = { card: 40, terrain: 50, portrait: 50, sky: 60, title: 100, scene: 120, site: 30, vault: 30, danger: 30 };
const FOCUS = { portrait: 0 };                        // 3:4 → 4:5 crop: keep the top (the head)
const TILE = {};                                 // per-slot tiling override ('blend' | 'mirror'); default 'auto'
// approved pictures that become the reference of a set: ref file ← slot whose raw it is made from
const REF_FROM = { 'tools/art/colony/ref/card.png': 'card/command' };

const outFile = (slot, ext = 'webp') => `art/colony/${slot}.${ext}`;

function index() {
  const files = {};
  for (const slot of Object.keys(MANIFEST)) {
    for (const ext of ['webp', 'png', 'jpg']) if (existsSync(join(ROOT, outFile(slot, ext)))) { files[slot] = outFile(slot, ext); break; }
  }
  const body = Object.entries(files).map(([s, f]) => `  '${s}': '${f}',`).join('\n');
  const src = readFileSync(ART_JS, 'utf8');
  const next = src.replace(/(\/\/ @files-begin\n)[\s\S]*?(\/\/ @files-end)/, `$1const FILES = {\n${body}${body ? '\n' : ''}};\n$2`);
  if (next !== src) writeFileSync(ART_JS, next);
  console.log(`index: ${Object.keys(files).length}/${Object.keys(MANIFEST).length} slots have pictures`);
  return files;
}

function install(slot, raw) {
  const m = MANIFEST[slot];
  if (!m) throw new Error(`no slot ${slot}`);
  const dst = join(ROOT, outFile(slot));
  mkdirSync(dirname(dst), { recursive: true });
  const args = [join(COL, 'post.py'), raw, dst, String(m.size[0]), String(m.size[1]), '--max-kb', String(MAX_KB[m.kind] || 60)];
  if (m.seamless) args.push('--tile', TILE[slot] || 'auto', '--preview', raw.replace(/\.\w+$/, '-tiled.png'));
  if (FOCUS[m.kind] !== undefined) args.push('--focus', String(FOCUS[m.kind]));
  process.stdout.write(execFileSync('python3', args, { encoding: 'utf8' }));
  for (const [ref, from] of Object.entries(REF_FROM)) {
    if (from !== slot) continue;
    const p = join(ROOT, ref);
    mkdirSync(dirname(p), { recursive: true });
    execFileSync('python3', ['-c', 'import sys; from PIL import Image; im = Image.open(sys.argv[1]).convert("RGB"); im.thumbnail((384, 384)); im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(sys.argv[2], optimize=True)', raw, p]);
    console.log(`reference ${ref} made from ${raw}`);
  }
}

function prompt(slot) {
  const m = MANIFEST[slot];
  const parts = [readFileSync(join(COL, 'style.txt'), 'utf8').trim()];
  const pre = join(COL, `prompts/_${m.kind}.txt`);
  if (existsSync(pre)) parts.push(readFileSync(pre, 'utf8').trim());
  const refs = m.refs.filter((r) => existsSync(join(ROOT, r)));
  if (refs.length) parts.push('Match the art style, rendering, palette, lighting, camera angle, framing and background of the reference image exactly, but draw this different subject instead (do not copy the reference building):');
  parts.push(readFileSync(join(ROOT, m.prompt), 'utf8').trim());
  return { text: parts.join('\n\n'), refs: refs.map((r) => join(ROOT, r)) };
}

const argv = process.argv.slice(2);
const opt = { n: 1, max: Infinity };
const picks = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--n') opt.n = +argv[++i];
  else if (a === '--max') opt.max = +argv[++i];
  else if (a === '--review' || a === '--force' || a === '--dry') opt[a.slice(2)] = true;
  else if (a === '--index') opt.index = true;
  else if (a === '--install') { opt.install = [argv[++i], argv[++i]]; }
  else picks.push(a);
}

if (opt.index) { index(); process.exit(0); }
if (opt.install) { install(...opt.install); index(); process.exit(0); }

const slots = Object.keys(MANIFEST).filter((s) => (!picks.length || picks.some((p) => s === p || s.startsWith(p + '/')))
  && (opt.force || !existsSync(join(ROOT, outFile(s)))));
mkdirSync(RAW, { recursive: true });
let spent = 0;
for (const slot of slots) {
  if (spent + opt.n > opt.max) break;
  const m = MANIFEST[slot];
  const { text, refs } = prompt(slot);
  if (opt.dry) { console.log(`--- ${slot} (${refs.length ? 'edits, refs ' + refs.join(' ') : 'generations'}, ${ASPECT[m.kind]})\n${text}\n`); continue; }
  const pf = join(RAW, `${slot.replace('/', '-')}.prompt.txt`);
  writeFileSync(pf, text);
  const prefix = join(RAW, `${slot.replace('/', '-')}-${Date.now().toString(36)}`);
  let out;
  try {
    out = execFileSync('python3', [join(ROOT, 'tools/art/xai-gen.py'), prefix, String(opt.n), pf, ...refs],
      { encoding: 'utf8', env: { ...env, XASPECT: ASPECT[m.kind] || '1:1' } });
  } catch (e) { console.error(`${slot}: ${e.stderr || e.message}`); break; }
  spent += opt.n;
  const raws = out.split('\n').filter((l) => /\.(png|jpg)$/.test(l));
  console.log(`${slot}: ${raws.join(' ')}  (${out.match(/images used \d+/)?.[0] || ''})`);
  if (!opt.review && raws[0]) install(slot, raws[0]);
}
if (!opt.dry && !opt.review) index();
