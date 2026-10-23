// Wiki page: story, missions and every unit type, all read from the user's ROM
// (stats, icons, forces) and the English patch (names, descriptions, briefings).
import { Rom } from './rom.js';
import { paint } from './gfx.js';
import { MAP_COUNT, mapInfo, battlePalette, unitIcon } from './maps.js';
import { allUnitTypes } from './units.js';
import { applyBps } from './bps.js';
import { readEnglish, unitText, LAYOUT } from './text.js';
import { scenario } from './game/scenario.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// Strings are laid out for the game's text window; rejoin lines and words hyphenated at line ends.
const prose = (s) => s.replace(/\s*\n\s*/g, ' ').replace(/(\w)- (\w)/g, '$1$2').replace(/\s+/g, ' ').trim();

const MODES = ['Beam', 'Railgun', 'Missile'];
const MAP_TITLES = 97; // labels block

// Unit families, by contiguous type ranges (model-code prefixes in brackets).
const FAMILIES = [
  ['hunters', 'Hunters', 0, 7, 'HU, CHU: humanoid mecha; the convertible CHU-03 switches between walker and fighter form.'],
  ['fighters', 'Fighters & bombers', 8, 13, 'FS, FFA, FB'],
  ['gunboats', 'Gunboats', 14, 16, 'CUB, CUN, CUM'],
  ['mines', 'Space mines', 17, 19, 'SBB'],
  ['turrets', 'Turrets', 20, 22, 'BS, BSF'],
  ['cannons', 'Train cannons', 23, 25, 'SG'],
  ['transports', 'Transports', 26, 29, 'CR'],
  ['capital', 'Battleships & carriers', 30, 38, 'BB, CV'],
  ['escorts', 'Cruisers & destroyers', 39, 51, 'SCG, MSP, MSNP, MSFB, DDG'],
  ['bases', 'Docks, fortresses & command centers', 52, 57, 'DOC, FOR, CT'],
];

// Story synopsis (written for this wiki from the game's briefings).
const ACTS = [
  ['Act I · The defence of Olympos and Operation Hercules', 0, 9,
    `The Galt Empire under Emperor Ahriman has overrun most of the Foundries. The Liberation Union gathers at
     F1 Olympos, the last independent Foundry, to strike back at Assault Fortress Nemea. First it must survive:
     Hamilton Command holds against a Galt raid, scattered units break through the siege, rebels escape occupied
     Eden in stolen Hunters, and commandos are driven out of Fort Rucker. Operation Hercules then opens the Raymond
     sector, a surgical strike at Le Guin destroys the new Galt admiral's battleship Tiamat, and the fleet forces
     the Gate of Eden and storms Nemea.`],
  ['Act II · Operation Erebos', 10, 21,
    `Now the Terran Union under Secretary Bert, the fleet turns on Grand Fortress Basilisk, the Empire's
     headquarters for the invasion of Earth. It runs mine blockades at Van Vogt and an ambush at Arthur's Belt,
     liberates the industrial Foundry Luggnagg dock by dock, stops Galt from seizing Quantum Decimators at the
     Verne Docks, and meets the secret Corvus cruisers at Fort Stanley. A flanking run along Earth's atmosphere
     leads to F4 Arcadia, where the Union survives a surprise attack, slips past the Buccaneer long-range cannon and
     takes Basilisk. Ahriman flees, and his last thrust through the mined Pandora sector is turned back.`],
  ['Act III · Operation Ragnarok', 22, 29,
    `The Union carries the war to Balam, capital of F3 Galt. New turretless Galt battleships appear at Panshin, a
     passing comet cracks Fortress Sturgeon open, carriers strike Fortress Alfred, Quantum Decimators blast a path
     through the Aldiss asteroids, and an artillery duel breaks the battle line at Derleth. Balam falls, but its
     archives reveal Ahriman's last card: the 20-kilometre superdreadnought Babylon, being finished in the shipyards
     of F7 Asgard. The Union fails to stop its launch and meets it in Earth orbit. Its command centers destroyed,
     Babylon is dragged down by Earth's gravity and swallowed by the sea without ever firing its main cannon.`],
];
const FOUNDRIES = ['F1 Olympos', 'F2 Eden', 'F3 Galt', 'F4 Arcadia', 'F5 Atlantis', 'F6 Luggnagg', 'F7 Asgard'];

function idbGet(key) {
  return new Promise((res) => {
    try {
      const r = indexedDB.open('earthlight-lab', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rom');
      r.onsuccess = () => {
        const g = r.result.transaction('rom').objectStore('rom').get(key);
        g.onsuccess = () => res(g.result || null); g.onerror = () => res(null);
      };
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}

let rom, pal, types, en = null;

(async () => {
  const buf = await idbGet('rom');
  if (!buf) { $('status').innerHTML = 'No ROM loaded yet — open the <a href="index.html">lab</a> and load it first.'; return; }
  rom = new Rom(buf); pal = battlePalette(rom); types = allUnitTypes(rom);
  const patch = await idbGet('patch');
  if (patch) { try { en = readEnglish(applyBps(patch, rom.bytes.slice().buffer)); } catch { } }
  render();
})();

function icon(type, army, scale = 2) {
  const c = document.createElement('canvas');
  paint(c, unitIcon(rom, army, types[type].gfx, 0), pal, { scale });
  c.dataset.type = type;
  return c;
}

const nameOf = (t) => (en ? en.unitNames[t] : types[t].name);

function render() {
  const toc = [['h', 'Story'], ['story', 'Synopsis'], ['missions', 'Missions'], ['h', 'Units'],
    ...FAMILIES.map(([id, title]) => [id, title])];
  $('toc').innerHTML = toc.map(([id, t]) => (id === 'h' ? `<div class="h">${t}</div>` : `<a href="#${id}">${t}</a>`)).join('');

  let html = `<h1>Earth Light <span class="dim">アースライト</span></h1>
    <p class="lede">Hudson Soft, Super Famicom, 1992. A hex-based space tactics game: the Union against the Galt Empire
    across the asteroid Foundries in Earth's orbit. Everything below is read from your ROM${en ? ' and the English patch' : ''}.</p>`;
  if (!en) html += `<p class="warn">The English patch isn't loaded, so names are in Japanese and unit descriptions and
    briefings are missing. Load the patch in the <a href="index.html">lab</a>'s Text tab.</p>`;

  html += `<h2 id="story">Story</h2>`;
  if (en) html += LAYOUT.intro ? `<p>${en.main.slice(LAYOUT.intro[0], LAYOUT.intro[1] - 2).map(prose).map(esc).join(' ')}</p>` : '';
  html += `<ul class="foundries">${FOUNDRIES.map((f) => `<li>${f}</li>`).join('')}</ul>`;
  for (const [title, a, b, text] of ACTS) {
    html += `<div class="act"><h3>${title}</h3><p>${prose(text)}</p><p class="dim small">Missions ${a + 1}–${b + 1}</p></div>`;
  }
  if (en) html += `<p class="dim">Ending: “${esc(prose(en.labels[139]))}”</p>`;

  html += `<h2 id="missions">Missions</h2>`;
  for (let m = 0; m < MAP_COUNT; m++) html += missionHtml(m);

  for (const [id, title, a, b, codes] of FAMILIES) {
    html += `<h2 id="${id}">${title} <small>${codes}</small></h2><div class="grid">`;
    for (let t = a; t <= b; t++) html += unitHtml(t);
    html += '</div>';
  }
  $('wiki').innerHTML = html;
  // Icons go in after the markup exists.
  for (const el of document.querySelectorAll('[data-icons]')) {
    const t = +el.dataset.icons;
    el.append(icon(t, 0), icon(t, 1));
  }
  for (const el of document.querySelectorAll('[data-icon]')) {
    const [t, army] = el.dataset.icon.split(',').map(Number);
    el.prepend(icon(t, army, 1));
  }
}

// Unit counts as "icon ×n name" chips for one army.
function forceList(units, army) {
  const n = new Map();
  for (const u of units) if (u.army === army) n.set(u.type, (n.get(u.type) || 0) + 1);
  return [...n].map(([t, c]) => `<span data-icon="${t},${army}">${c > 1 ? `${c}× ` : ''}${esc(nameOf(t))}</span>`).join('');
}

function missionHtml(m) {
  const info = mapInfo(rom, m);
  const title = en ? en.labels[MAP_TITLES + m] : info.name;
  let sc = null;
  try { sc = scenario(rom, info); } catch { }
  let body = '';
  if (en) {
    const i = LAYOUT.briefings + m * 4;
    body += en.brief.slice(i, i + 4).map((p) => `<p>${esc(prose(p))}</p>`).join('');
  }
  if (sc) {
    body += `<div class="forces"><b class="armyA">Union</b>${forceList(sc.units, 0) || '—'}</div>`
      + `<div class="forces"><b class="armyB">Galt</b>${forceList(sc.units, 1) || '—'}</div>`;
    for (const ev of sc.arrivals || []) {
      body += `<div class="forces"><b class="${ev.army ? 'armyB' : 'armyA'}">Turn ${ev.turn} reinforcements</b>${forceList(ev.units.map((u) => ({ ...u, army: ev.army })), ev.army)}</div>`;
    }
  }
  return `<details class="mission" id="mission-${m + 1}"${m === 0 ? ' open' : ''}><summary><b>${m + 1}. ${esc(title)}</b>
    <span class="dim mono">MAP-${esc(info.name)}</span></summary><div class="body">${body}</div></details>`;
}

function unitHtml(t) {
  const u = types[t];
  // The second form of a transforming unit shares the first form's text.
  const tx = en ? unitText(en, t) : null;
  const tx0 = en && u.formOf !== undefined ? unitText(en, u.formOf) : null;
  const short = tx?.short || tx0?.short;
  const info = tx?.info || tx0?.info;
  const weapons = u.weapons.filter(Boolean);
  const range = (w) => (w.max > w.min ? `${w.min}–${w.max}` : w.min);
  let html = `<section class="unit" id="unit-${t}"><header><span class="icons" data-icons="${t}"></span><div>
    <h3>${esc(nameOf(t))}${en ? `<span class="jp">${esc(u.name)}</span>` : ''}</h3>
    <div class="role"><span class="mono">${esc(u.code)}</span>${short ? ` · ${esc(prose(short))}` : ''}</div></div></header>
    <div class="stats"><span>HP <b>${u.hp}</b></span><span>Move <b>${u.move}</b></span>
    <span>Evasion <b>${Math.round(u.evasion * 100 / 128)}%</b></span><span>Start level <b>${u.startLevel}</b></span>
    <span>Value <b>${u.value}</b></span></div>`;
  if (weapons.length) {
    html += `<table><tr><th>Slot</th><th>Type</th><th>Range</th><th>Power</th></tr>${weapons.map((w) =>
      `<tr><td>W${w.slot + 1}</td><td>${MODES[w.mode]}</td><td>${range(w)}</td><td>${w.power}</td></tr>`).join('')}</table>`;
  } else html += '<p class="note">Unarmed.</p>';
  if (info) html += `<p>${esc(prose(info[1]))}</p><p>${esc(prose(info[2]))}</p>`;
  const notes = [];
  if (u.form) notes.push(`Transforming unit, form ${u.form} (other form: ${esc(nameOf(u.form === 1 ? u.otherForm : u.formOf))} <span class="mono">${esc(types[u.form === 1 ? u.otherForm : u.formOf].code)}</span>).`);
  if (u.moveOrFire) notes.push('Can\'t move in a turn it fires its long-range weapon.');
  if (notes.length) html += `<p class="note">${notes.join(' ')}</p>`;
  return html + '</section>';
}
