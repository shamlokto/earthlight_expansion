// node render.mjs OUTDIR name ... : screenshot view.html for <DIR>/<name>.glb.
// Serve the repo root first:  python3 serve.py  (or python3 -m http.server 8765 --directory <repo>)
// CHR=1 uses character framing (face close-up). PORT env overrides 8765; DIR env overrides /art/farm/models
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out, ...names] = process.argv.slice(2);
const port = process.env.PORT || 8765, dir = process.env.DIR || '/art/farm/models';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 640 } });
for (const n of names) {
  await p.goto(`http://localhost:${port}/tools/art/farm/mesh/view.html?f=${dir}/${n}.glb${process.env.CHR ? '&c=1' : ''}`);
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  console.log(n, JSON.stringify(await p.evaluate('window.__done')));
  await p.screenshot({ path: `${out}/${n}.png`, clip: { x: 0, y: 100, width: 1280, height: 440 } });
}
await b.close();
