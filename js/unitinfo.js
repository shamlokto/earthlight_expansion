// Unit info screen, laid out like the original's ($04:E4E0): the description picture top
// left, name and model code top right with the weapon table, movement / defence / HP and the
// map icon with the unit's role, and the description text across the bottom.
import { paintUnitArt } from './unitart.js';
import { paint } from './gfx.js';
import { unitIcon, battlePalette } from './maps.js';
import { unitText } from './text.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const MODES = 'BNM';
let pal = null;

function css() {
  if (document.getElementById('unitinfo-css')) return;
  const s = document.createElement('style');
  s.id = 'unitinfo-css';
  s.textContent = `
  .uinfo { position: fixed; inset: 0; background: rgba(0,0,0,.75); display: flex; align-items: safe center; justify-content: center; z-index: 20; padding: 16px; overflow: auto; }
  .uinfo .scr { width: min(768px, 100%); background: #8a5a5a; border: 6px solid #f2b8a8; border-radius: 6px; color: #fff;
    font: 600 15px/1.35 ui-monospace, Menlo, monospace; display: grid; grid-template-columns: auto 1fr; gap: 10px 14px; padding: 12px; }
  .uinfo canvas { image-rendering: pixelated; border: 3px solid #f2b8a8; display: block; }
  .uinfo .name { font-size: 18px; } .uinfo .code { color: #ffe9a6; }
  .uinfo table { border-collapse: collapse; margin-top: 6px; } .uinfo th { color: #ffd0d0; font-weight: 600; text-align: left; padding: 0 10px 0 0; }
  .uinfo td { padding: 0 10px 0 0; } .uinfo .mode { color: #a8f0ff; }
  .uinfo .desc { grid-column: 1 / -1; border-top: 3px solid #f2b8a8; padding-top: 8px; white-space: pre-line; }
  .uinfo .row { display: flex; gap: 12px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
  .uinfo .close { grid-column: 1 / -1; justify-self: end; }
  @media (max-width: 560px) { .uinfo .scr { grid-template-columns: 1fr; } }`;
  document.head.append(s);
}

// u: battle unit { type, army, hp, level } ; types: allUnitTypes(rom) ; en: readEnglish() or null
export function showUnitInfo(rom, types, en, u) {
  css();
  pal = pal || battlePalette(rom);
  const t = types[u.type], text = en ? unitText(en, u.type) : null;
  const ov = document.createElement('div');
  ov.className = 'uinfo';
  ov.innerHTML = `<div class="scr">
    <div class="pic"></div>
    <div>
      <div class="name">${esc(text ? text.name : t.name)}</div><div class="code">${esc(t.code)}</div>
      <table><tr><th>Weapon</th><th>Mode</th><th>Power</th><th>Range</th></tr>
      ${t.weapons.map((w, i) => (w ? `<tr><td>${i + 1}</td><td class="mode">${MODES[w.mode]}</td><td>${w.power}</td><td>${w.min === w.max ? w.min : `${w.min}–${w.max}`}</td></tr>` : '')).join('')}
      </table>
      <div class="row"><span>Move ${t.move}</span><span>Defence ${Math.round((t.evasion * 100) / 128)}</span><span>HP ${u.hp}/${t.hp}</span><span>Lv ${u.level}</span></div>
      <div class="row"><span class="icon"></span><span>${text && text.info ? esc(text.info[0].replace(/\s*\n\s*/g, ' ')) : ''}</span></div>
    </div>
    <div class="desc">${text && text.info ? esc(text.info.slice(1).join('\n\n')) : '<span style="opacity:.7">Load the English patch in the lab for the description.</span>'}</div>
    <button class="btn close">Close</button></div>`;
  const c = document.createElement('canvas');
  paintUnitArt(c, rom, u.type, 2);
  ov.querySelector('.pic').append(c);
  const ic = document.createElement('canvas');
  paint(ic, unitIcon(rom, u.army, t.gfx, 0), pal, { scale: 2 });
  ov.querySelector('.icon').append(ic);
  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.classList.contains('close')) close(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  document.body.append(ov);
  return ov;
}
