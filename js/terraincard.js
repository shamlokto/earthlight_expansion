// The terrain card shown in the battle's side panel when an empty hex is clicked: the terrain's
// ROM picture (its fight backdrop) with the hex itself, name and description, defence per weapon
// mode, which modes can hit a unit there, and what each kind of unit pays to enter it, with a
// link to the terrain's wiki entry. Styles are injected once, so the page needs no CSS for it.
import { bannerUrl, cellUrl } from './terrainart.js';
import { MODES, classFacts, costWords, categoryIcons, terrainText, slug } from './terraininfo.js';
import { paint } from './gfx.js';
import { unitIcon, battlePalette } from './maps.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const TERRAIN_CSS = `
.tcard { display: flex; flex-direction: column; gap: 12px; }
.tban { position: relative; aspect-ratio: 2 / 1; max-width: 100%; border-radius: 8px; overflow: hidden; background-size: cover; background-position: center;
  image-rendering: pixelated; border: 1px solid var(--line, #2b3160); box-shadow: inset 0 -60px 50px -20px rgba(4, 6, 18, .92); }
.tban .tcell { position: absolute; left: 10px; bottom: 10px; width: 72px; height: 48px; image-rendering: pixelated; filter: drop-shadow(0 2px 4px rgba(0,0,0,.7)); }
.tban .ttl { position: absolute; left: 92px; right: 10px; bottom: 10px; display: flex; flex-direction: column; gap: 1px; }
.tban h3 { margin: 0; font-size: 19px; letter-spacing: .02em; color: #fff; text-shadow: 0 1px 3px #000; text-wrap: balance; }
.tban .ttag { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #ffd84a; text-shadow: 0 1px 2px #000; }
.tban .tco { position: absolute; right: 8px; top: 6px; font: 11px ui-monospace, monospace; color: #fff; background: rgba(0,0,0,.45); padding: 1px 6px; border-radius: 999px; }
.tdesc { margin: 0; font-size: 12.5px; line-height: 1.5; opacity: .9; }
.tdesc .ours { color: var(--muted, #9097c0); font-size: 11px; }
.tsec h4 { margin: 0 0 6px; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted, #9097c0); font-weight: 600; }
.tdef { display: grid; grid-template-columns: 5.2em 1fr 3.2em; gap: 5px 8px; align-items: center; font-size: 12px; font-variant-numeric: tabular-nums; }
.tdef .tm { font-size: 11px; padding: 0 6px; border-radius: 3px; text-align: center; }
.tdef .m0 { background: #13306b; color: #9fd0ff; } .tdef .m1 { background: #4a3a0e; color: #ffd86a; } .tdef .m2 { background: #561a1a; color: #ff9a8a; }
.tdef .tb { height: 8px; border-radius: 4px; background: var(--panel-2, #1b1f3a); overflow: hidden; }
.tdef .tb span { display: block; height: 100%; border-radius: 4px; }
.tdef .m0b { background: linear-gradient(90deg, #2f6fd8, #9fd0ff); } .tdef .m1b { background: linear-gradient(90deg, #b8901c, #ffd86a); } .tdef .m2b { background: linear-gradient(90deg, #b8402c, #ff9a8a); }
.tdef .tv { text-align: right; font-weight: 600; } .tdef .immune { color: #7fe3a0; font-size: 11px; text-align: right; }
.tmove { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 5px; }
.tchip { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 5px 2px 4px; border-radius: 6px; background: var(--panel-2, #1b1f3a); min-width: 0; text-align: center; }
.tchip img { width: 36px; height: 24px; image-rendering: pixelated; flex: none; }
.tchip div { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
.tchip b { font-size: 10px; font-weight: 600; overflow-wrap: anywhere; }
.tchip span { font-size: 10.5px; font-variant-numeric: tabular-nums; }
.tchip.free span { color: #7fe3a0; } .tchip.slow span { color: #ffd86a; } .tchip.stop span { color: #ffa040; }
.tchip.blocked { opacity: .45; } .tchip.blocked span { color: #ff8a8a; } .tchip.blocked img { filter: grayscale(1); }
  .tnone { margin: 0; font-size: 12.5px; padding: 8px 10px; border-radius: 6px; background: var(--panel-2, #1b1f3a); color: #ff9a8a; }
.twiki { align-self: flex-start; font-size: 12px; color: var(--accent-2, #4fc3f7); text-decoration: none; border: 1px solid var(--line, #2b3160); padding: 4px 10px; border-radius: 999px; }
.twiki:hover, .twiki:focus { background: var(--panel-2, #1b1f3a); }
`;

let cssDone = false;
function css() {
  if (cssDone || typeof document === 'undefined') return;
  const s = document.createElement('style'); s.id = 'terrain-card-css'; s.textContent = TERRAIN_CSS; document.head.append(s); cssDone = true;
}

const iconCache = new WeakMap();
export function iconUrl(rom, gfx, army = 0) {
  if (!iconCache.has(rom)) iconCache.set(rom, new Map());
  const m = iconCache.get(rom), k = `${army}:${gfx}`;
  if (!m.has(k)) {
    let url = '';
    try { const c = document.createElement('canvas'); paint(c, unitIcon(rom, army, gfx, 0), battlePalette(rom), { scale: 2 }); url = c.toDataURL(); } catch { }
    m.set(k, url);
  }
  return m.get(k);
}

// The defence rows and movement chips (shared with the wiki).
export function factsHtml(rom, tables, cls, types) {
  const f = classFacts(tables, cls), icons = categoryIcons(types);
  if (f.move.every((g) => g.cost === 0)) return '<p class="tnone">No unit can enter this terrain: it blocks movement for everything.</p>';
  const def = f.defence.map((p, m) => `<span class="tm m${m}">${MODES[m]}</span>`
    + (f.targetable[m] ? `<span class="tb"><span class="m${m}b" style="width:${Math.max(2, p)}%"></span></span><span class="tv">${p}%</span>`
      : `<span class="tb"></span><span class="immune">immune</span>`)).join('');
  const move = f.move.map((g) => {
    const w = costWords(g.cost), t = icons[g.cat];
    return `<div class="tchip ${w.kind}" title="${esc(`${g.label}: ${w.long}`)}">${t ? `<img src="${iconUrl(rom, t.gfx)}" alt="">` : ''}<div><b>${esc(g.label)}</b><span>${esc(w.short)}</span></div></div>`;
  }).join('');
  return `<div class="tsec"><h4>Defence of a unit standing here</h4><div class="tdef">${def}</div></div>
    <div class="tsec"><h4>Movement</h4><div class="tmove">${move}</div></div>`;
}

// The card for terrain { type, cls, gfx } at (x, y). text: { terrainData, en, rom } for terrainText.
export function terrainCardHtml({ rom, tables, types, cell, x, y, text, wiki = 'wiki.html' }) {
  css();
  const tx = terrainText(cell.type, cell.cls, text);
  return `<div class="tcard">
    <div class="tban" style="background-image:url(${bannerUrl(rom, cell.cls, cell.gfx)})">
      <span class="tco">${x}, ${y}</span><img class="tcell" src="${cellUrl(rom, cell.gfx)}" alt="">
      <div class="ttl">${tx.tag ? `<span class="ttag">${esc(tx.tag)}</span>` : ''}<h3>${esc(tx.name)}</h3></div></div>
    ${tx.description ? `<p class="tdesc">${esc(tx.description)}${tx.ours ? ' <span class="ours">(not named in the original)</span>' : ''}</p>` : ''}
    ${factsHtml(rom, tables, cell.cls, types)}
    <a class="twiki" href="${wiki}#${slug(tx.name)}" target="_blank" rel="noopener">Terrain wiki →</a>
  </div>`;
}
