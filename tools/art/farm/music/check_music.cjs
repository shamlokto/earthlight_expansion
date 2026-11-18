const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !(process.env.NOMUSIC && /404/.test(m.text()))) errs.push('console ' + m.text()); });
  p.on('dialog', (d) => d.accept());
  if (process.env.NOMUSIC) await p.route('**/art/farm/music/**', (r) => r.fulfill({ status: 404, body: 'nope' }));
  await p.goto('http://localhost:8769/farm.html'); await p.waitForFunction(() => window.__farm && window.__farmMusic, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  const M = () => p.evaluate(() => window.__farmMusic());
  const want = async (track, label) => {
    try { await p.waitForFunction((t) => { const m = window.__farmMusic(); return m.track === t; }, track, { timeout: 20000 }); } catch { /* report below */ }
    const m = await M(); const ok = m.track === track; console.log(ok ? 'OK  ' : 'FAIL', label.padEnd(18), JSON.stringify(m)); return ok;
  };
  let ok = true;
  console.log('before gesture', JSON.stringify(await M()));
  await p.mouse.click(5, 5); ok = (await want('title', 'title screen')) && ok;
  await p.click('#bNew');
  for (let i = 0; i < 200 && (await p.evaluate(() => window.__farm.mode)) !== 'play'; i++) { await p.evaluate(() => window.__farm.ui.advance()); await p.waitForTimeout(60); }
  await p.waitForTimeout(800);
  for (let i = 0; i < 80 && (await p.evaluate(() => window.__farm.ui.talking())); i++) { await p.evaluate(() => window.__farm.ui.advance()); await p.waitForTimeout(60); }
  ok = (await want('spring', 'farm, spring day')) && ok;
  await p.evaluate(() => window.__farm.go({ map: 'village' })); ok = (await want('village', 'village by day')) && ok;
  await p.evaluate(() => window.__farm.go({ map: 'central' })); ok = (await want('central', 'Eden Central')) && ok;
  await p.evaluate(() => { const f = window.__farm; f.sim.enterMine(f.S, 1); return f.go({ map: 'ruins' }); }); ok = (await want('ruins', 'ruins')) && ok;
  await p.evaluate(() => { const f = window.__farm; f.sim.leaveMine(f.S); f.S.cal.minute = 1200; return f.go({ map: 'farm' }); }); ok = (await want('night', 'farm at night')) && ok;
  await p.evaluate(() => { const f = window.__farm; f.S.cal.minute = 600; f.S.cal.season = 2; return f.go({ map: 'farm' }); }); ok = (await want('autumn', 'farm, autumn day')) && ok;
  await p.evaluate(async () => { const m = await import('./js/farm/sfx.js'); m.setMood({ festival: 'lantern' }); }); ok = (await want('lantern', 'Lantern Night')) && ok;
  await p.evaluate(async () => { const m = await import('./js/farm/sfx.js'); m.setMood({ festival: 'harvest' }); }); ok = (await want('festival', 'Harvest Fair')) && ok;
  await p.evaluate(async () => { const m = await import('./js/farm/sfx.js'); m.setMood({ festival: 'wedding' }); }); ok = (await want('wedding', 'wedding')) && ok;
  await p.evaluate(async () => { const m = await import('./js/farm/sfx.js'); m.setMood({ festival: null }); }); ok = (await want('autumn', 'after the scene')) && ok;
  for (let i = 0; i < 80 && (await p.evaluate(() => window.__farm.ui.talking())); i++) { await p.evaluate(() => window.__farm.ui.advance()); await p.waitForTimeout(60); }
  console.log('mode', await p.evaluate(() => window.__farm.mode), 'win open', await p.evaluate(() => !document.querySelector('#win').hidden));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const slider = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-tab="sys"]')][0]; if (b) b.click(); const v = document.querySelector('#fmVol'); return v ? v.value : null; });
  console.log('volume slider', slider); ok = ok && slider !== null;
  // switch off and on through the menu hook; volume slider
  const offOn = await p.evaluate(async () => { const m = await import('./js/farm/sfx.js'); m.music(false); const a = window.__farmMusic().on; m.setMusicVolume(0.3); const s = localStorage.getItem('satoHarvest.music'); m.music(true); return { offWas: a, stored: s, vol: m.musicVolume() }; });
  console.log('toggle', JSON.stringify(offOn)); ok = ok && offOn.offWas === false && offOn.vol === 0.3;
  await p.keyboard.press('Escape').catch(() => {});
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors');
  console.log(ok && !errs.length ? 'ALL OK' : 'SOME FAILED');
  await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
