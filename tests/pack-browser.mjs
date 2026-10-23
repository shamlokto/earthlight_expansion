// Browser test of the expansion pack (Playwright): first run builds it from serve.py's test ROM,
// then expansion.html and editor.html run with no ROM anywhere; a fresh browser gets the
// one-time ROM dialog. PROJ=project U=dir-with-rom-zips OUT=screenshot-dir node tests/pack-browser.mjs
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const PROJ = process.env.PROJ, U = process.env.U, OUT = process.env.OUT, PORT = 8792, BASE = `http://127.0.0.1:${PORT}`;
const ROM = `${U}/c929c004-Earth_Light_Japan.zip`, PATCH = `${U}/8b12c538-Earthlight_1_English.zip`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let server = null;
async function serve(withRom) {
  if (server) { server.kill(); await sleep(400); }
  server = spawn('python3', ['serve.py', '--port', String(PORT), ...(withRom ? ['--rom', ROM, '--patch', PATCH] : [])], { cwd: PROJ, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/serve.py'); return; } catch { await sleep(150); } }
}
const ok = (n, c, e = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}${e ? ' — ' + e : ''}`); if (!c) process.exitCode = 1; };
const browser = await chromium.launch();
async function newPage(ctx) {
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 404s are only allowed for serve.py's optional test files (/__test_rom, /__test_patch)
  const bad404 = [];
  page.on('response', (r) => { if (r.status() === 404 && !/__test_(rom|patch)|favicon/.test(r.url())) bad404.push(r.url()); });
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource: the server responded with a status of 404/.test(m.text())) errors.push(m.text()); });
  errors.bad404 = bad404;
  return { page, errors };
}
const rosterRows = (page) => page.evaluate(() => document.querySelectorAll('#app table tr').length);
const packInfo = (page) => page.evaluate(() => new Promise((res) => { const q = indexedDB.open('earthlight-expansion', 1); q.onupgradeneeded = () => q.result.createObjectStore('pack'); q.onsuccess = () => { const g = q.result.transaction('pack').objectStore('pack').get('pack'); g.onsuccess = () => res(g.result ? { version: g.result.version, assets: Object.keys(g.result.assets).length, text: !!g.result.text } : null); }; }));
const labRom = (page) => page.evaluate(() => new Promise((res) => { const q = indexedDB.open('earthlight-lab', 1); q.onupgradeneeded = () => q.result.createObjectStore('rom'); q.onsuccess = () => { const g = q.result.transaction('rom').objectStore('rom').get('rom'); g.onsuccess = () => res(!!g.result); }; }));

// 1. first run: the pack is built from serve.py's test ROM
await serve(true);
const ctx = await browser.newContext();
let { page, errors } = await newPage(ctx);
await page.goto(`${BASE}/expansion.html`);
await page.waitForSelector('#app table', { timeout: 30000 });
ok('first run: intermission renders', (await rosterRows(page)) > 1);
const pi = await packInfo(page);
ok('pack stored in IndexedDB', pi && pi.assets > 500 && pi.text, JSON.stringify(pi));
ok('first run: no page errors', !errors.length, errors.join(' | '));

// 2. no ROM anywhere: server without --rom, nothing in the lab's store
await serve(false);
ok('test ROM no longer served', (await fetch(`${BASE}/__test_rom`)).status === 404);
ok('no ROM in the browser', !(await labRom(page)));
({ page, errors } = await newPage(ctx));
await page.goto(`${BASE}/expansion.html`);
await page.waitForSelector('#app table', { timeout: 30000 });
ok('without ROM: intermission renders with icons and English names', (await rosterRows(page)) > 1 && /Athena/.test(await page.textContent('#app')));
await page.screenshot({ path: `${OUT}/expansion-noROM.png`, fullPage: true });
ok('without ROM: intermission no errors', !errors.length, errors.join(' | '));
({ page, errors } = await newPage(ctx));
await page.goto(`${BASE}/editor.html`);
await page.waitForFunction(() => /Paint with/.test(document.getElementById('status').textContent), null, { timeout: 30000 });
const ed = await page.evaluate(() => ({ pal: document.querySelectorAll('#pal canvas').length, units: document.querySelectorAll('#units canvas').length, map: document.getElementById('map').width, rom: document.getElementById('romMap').width }));
ok('without ROM: editor renders palette, units, map and ROM map', ed.pal > 200 && ed.units > 30 && ed.map > 0 && ed.rom > 0, JSON.stringify(ed));
// paint with the stamp source: pick another ROM map
await page.selectOption('#romSel', '24');
await page.screenshot({ path: `${OUT}/editor-noROM.png`, fullPage: true });
ok('without ROM: editor no errors', !errors.length, errors.join(' | '));

// 3. a fresh browser and no ROM served: the one-time dialog asks for it
const ctx2 = await browser.newContext();
({ page, errors } = await newPage(ctx2));
await page.goto(`${BASE}/expansion.html`);
await page.waitForSelector('input[name=rom]', { timeout: 20000 });
await page.screenshot({ path: `${OUT}/first-run-dialog.png` });
await page.setInputFiles('input[name=rom]', ROM);
await page.waitForFunction(() => /recognised/.test(document.querySelector('form .msg').textContent));
await page.setInputFiles('input[name=patch]', PATCH);
await page.waitForFunction(() => /Patch read/.test(document.querySelector('form .msg').textContent));
await page.click('form button[type=submit]');
await page.waitForSelector('#app table', { timeout: 30000 });
ok('dialog path: intermission renders', (await rosterRows(page)) > 1 && /Athena/.test(await page.textContent('#app')));
ok('dialog path: ROM itself not stored', !(await labRom(page)));
ok('dialog path: no errors (404s only for the test-ROM probes)', !errors.length && !errors.bad404.length, [...errors, ...errors.bad404].join(' | '));
await browser.close(); server.kill();
