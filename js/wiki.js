// Wiki page: story, missions and every unit type, all read from the user's ROM
// (stats, icons, forces) and the English patch (names, descriptions, briefings).
import { Rom } from './rom.js';
import { paint } from './gfx.js';
import { MAP_COUNT, mapInfo, battlePalette, unitIcon } from './maps.js';
import { allUnitTypes } from './units.js';
import { applyBps } from './bps.js';
import { readEnglish, unitText, LAYOUT } from './text.js';
import { scenario } from './game/scenario.js';
import { terrainOf } from './terrain.js';
import { romTables } from './game/tables.js';
import { terrainText, categoryUnits, slug, MOVERS } from './terraininfo.js';
import { bannerUrl, cellUrl } from './terrainart.js';
import { factsHtml, TERRAIN_CSS } from './terraincard.js';
import { loadExpansionData } from './expansion/data.js';
import { paintLookArt, lookOf, typeIcon } from './look.js';
import { price, marketTypes } from './expansion/campaign.js';

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

let rom, pal, types, en = null, xp = null;   // xp: the expansion's own data (js/expansion/data)
let xpIndex = null, xpMissions = [];         // the expansion's missions (missions/index.json and each file)

(async () => {
  const buf = await idbGet('rom');
  if (!buf) { $('status').innerHTML = 'No ROM loaded yet — open the <a href="index.html">lab</a> and load it first.'; return; }
  rom = new Rom(buf); pal = battlePalette(rom); types = allUnitTypes(rom);
  const patch = await idbGet('patch');
  if (patch) { try { en = readEnglish(applyBps(patch, rom.bytes.slice().buffer)); } catch { } }
  try { xp = await loadExpansionData(); } catch { xp = null; }
  if (xp) try {
    xpIndex = await (await fetch('missions/index.json')).json();
    xpMissions = await Promise.all(xpIndex.missions.map(async (m) => { try { return await (await fetch(m.file)).json(); } catch { return null; } }));
  } catch { xpIndex = null; }
  render();
})();

function icon(type, army, scale = 2) {
  const c = document.createElement('canvas');
  paint(c, unitIcon(rom, army, types[type].gfx, 0), pal, { scale });
  c.dataset.type = type;
  return c;
}

const nameOf = (t) => (en ? en.unitNames[t] : types[t].name);
const hasIcon = (t) => !types[t].cut; // cut types point at Mars's icon
const placed = new Set(); // types any map deploys or brings in

function render() {
  for (let m = 0; m < MAP_COUNT; m++) {
    try {
      const sc = scenario(rom, mapInfo(rom, m));
      for (const u of sc.units) placed.add(u.type);
      for (const ev of sc.arrivals || []) for (const u of ev.units) placed.add(u.type);
    } catch { }
  }
  const terrains = terrainEntries();
  const toc = [['h', 'Story'], ['story', 'Synopsis'], ['missions', 'Missions'], ['h', 'Terrain'], ...terrains.map((t) => [t.slug, t.name]), ['h', 'Units'],
    ...FAMILIES.map(([id, title]) => [id, title]), ...(xp ? [['expansion-units', 'Expansion units']] : [])];
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
  html += terrainHtml(terrains);

  for (const [id, title, a, b, codes] of FAMILIES) {
    html += `<h2 id="${id}">${title} <small>${codes}</small></h2><div class="grid">`;
    for (let t = a; t <= b; t++) html += unitHtml(t);
    html += '</div>';
  }
  if (xp) html += expansionUnitsHtml();
  $('wiki').innerHTML = html;
  for (const c of document.querySelectorAll('canvas[data-xart]')) try { paintLookArt(c, rom, xp.types, +c.dataset.xart, 1); } catch { }
  for (const el of document.querySelectorAll('[data-xicons]')) try { el.append(xpIcon(+el.dataset.xicons, 0), xpIcon(+el.dataset.xicons, 1)); } catch { }
  wireXTable();
  // Icons go in after the markup exists.
  for (const el of document.querySelectorAll('[data-icons]')) {
    const t = +el.dataset.icons;
    if (hasIcon(t)) el.append(icon(t, 0), icon(t, 1));
  }
  for (const el of document.querySelectorAll('[data-icon]')) {
    const [t, army] = el.dataset.icon.split(',').map(Number);
    el.prepend(icon(t, army, 1));
  }
  // the page fills in after the ROM loads, so jump to a linked section (e.g. #terrain-asteroid) now
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

// ---------------------------------------------------------------- terrain
// One entry per named terrain type, with every hex graphic the maps use for it and the maps it is on.
function terrainEntries() {
  const byName = new Map();
  for (let m = 0; m < MAP_COUNT; m++) {
    const info = mapInfo(rom, m), header = rom.body(info.headerId), grid = rom.body(info.gridId);
    for (let y = 1; y <= info.rows; y++) {
      for (let x = 1; x < info.cols; x++) {
        const v = grid[y * 62 + x], t = terrainOf(rom, header, v), tx = terrainText(t.type, t.cls, { en, rom });
        let e = byName.get(tx.name);
        if (!e) byName.set(tx.name, e = { ...tx, cls: t.cls, slug: slug(tx.name), gfx: new Map(), maps: new Set() });
        e.gfx.set(header[v], (e.gfx.get(header[v]) || 0) + 1);
        e.maps.add(m);
      }
    }
  }
  return [...byName.values()].sort((a, b) => a.cls - b.cls || a.name.localeCompare(b.name))
    .map((e) => ({ ...e, gfx: [...e.gfx].sort((a, b) => b[1] - a[1]).map(([g]) => g) }));
}

function terrainHtml(list) {
  if (!document.getElementById('terrain-css')) { const s = document.createElement('style'); s.id = 'terrain-css'; s.textContent = TERRAIN_CSS; document.head.append(s); }
  const tables = romTables(rom), who = categoryUnits(types, en ? en.unitNames : null);
  let html = `<h2 id="terrain">Terrain</h2>
    <p>Every hex of a map is one of these terrains. A unit's defence depends on the terrain it stands on and on the
    weapon mode it is hit with (Beam, Railgun or Missile); some terrain can't be targeted by a mode at all, and each kind
    of unit pays its own price to enter. The pictures are the scenes the original fights in on that terrain.</p><div class="terrains">`;
  for (const e of list) {
    const units = MOVERS.filter((g) => who[g.cat]?.length).map((g) => `<b>${g.label}</b> ${who[g.cat].map(esc).join(', ')}`).join(' · ');
    html += `<section class="terrain" id="${e.slug}">
      <div class="tban" style="background-image:url(${bannerUrl(rom, e.cls, e.gfx[0])})">
        <div class="ttl" style="left:14px">${e.tag ? `<span class="ttag">${esc(e.tag)}</span>` : ''}<h3>${esc(e.name)}</h3></div>
        <span class="tco">class ${e.cls}</span></div>
      <div class="tbody">
        ${e.description ? `<p class="tdesc">${esc(e.description)}${e.ours ? ' <span class="ours">(not named in the original)</span>' : ''}</p>` : ''}
        <div class="tcells">${e.gfx.slice(0, 10).map((g) => `<img src="${cellUrl(rom, g)}" alt="" title="hex graphic #${g}">`).join('')}</div>
        ${factsHtml(rom, tables, e.cls, types)}
        <details class="twho"><summary>Units in each class</summary><p>${units}</p></details>
        <p class="tmaps"><span>On ${e.maps.size} of ${MAP_COUNT} maps:</span> ${[...e.maps].map((m) => `<a href="#mission-${m + 1}">${m + 1}</a>`).join(' ')}</p>
      </div></section>`;
  }
  return html + '</div>';
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
  // Spent and loaded variants share the base entry's text.
  const tx = en ? unitText(en, t) : null;
  const base = u.armed ?? u.empty;
  const tx0 = en && base !== undefined ? unitText(en, base) : null;
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
  const ref = (o) => `${esc(nameOf(o))} <span class="mono">${esc(types[o].code)}</span> (type ${o})`;
  if (u.cut) notes.push('No map icon of its own (the icon table points at the Mars icon), and no map places it: probably cut from the game.'
    + (xp && xp.types[t]?.look !== undefined ? ` Revived in the expansion: see <a href="#xunit-${t}">${esc(nameOf(t))} (expansion)</a>.` : ''));
  else if (!placed.has(t) && u.armed === undefined && u.empty === undefined && u.formOf === undefined) notes.push('No map places it at the start or as reinforcements.');
  if (u.form) notes.push(`Transforms into ${ref(u.form === 1 ? u.otherForm : u.formOf)}.`);
  if (u.spent !== undefined) notes.push(`After firing its one-shot W4 it becomes ${ref(u.spent)}.`);
  if (u.armed !== undefined) notes.push(`Spent form of ${ref(u.armed)}, after its one-shot W4 is fired; re-armed on boarding.`);
  if (u.loaded !== undefined) notes.push(`Empty; becomes ${ref(u.loaded)} when units board.`);
  if (u.empty !== undefined) notes.push(`Loaded form of ${ref(u.empty)}, carrying units.`);
  if (u.moveOrFire) notes.push('Can\'t move in a turn it fires its long-range weapon.');
  if (xp && XP_RULES[t]) notes.push(`<b>Expansion:</b> ${XP_RULES[t]}`);
  if (xp && u.cut && xp.types[t]?.cut) notes.push('<b>Expansion:</b> cut, not used (its bombs never worked with the AI).');
  if (notes.length) html += `<p class="note">${notes.join(' ')}</p>`;
  return html + '</section>';
}

// ---------------------------------------------------------------- expansion units
// The cut units the expansion revives and its new machines (js/expansion/data): they have no
// graphics of their own, so each borrows another type's (its `look`, js/look.js), hue-shifted.
// Plus the expansion's rule changes on ROM units (XP_RULES, shown on their ROM entries too).
const XP_RULES = {
  23: 'buildable. A fixed battery: at the intermission, load it into a Crab from the Crab\'s <i>Carries</i> menu. It takes no deploy slot and goes into battle aboard that Crab, which sets it down on an asteroid, bedrock, a fortress deck or a turret railway. Once set down it can never be picked up again: it has no movement, so it can\'t board.',
  24: 'buildable. A fixed battery: at the intermission, load it into a Crab from the Crab\'s <i>Carries</i> menu. It takes no deploy slot and goes into battle aboard that Crab, which sets it down on an asteroid, bedrock, a fortress deck or a turret railway. Once set down it can never be picked up again: it has no movement, so it can\'t board.',
  26: 'its only use is carrying a battery. At the intermission its <i>Carries</i> menu loads a Dragon or Hydra, which then needs no deploy slot; in battle the Crab sets it down on an asteroid, bedrock, a fortress deck or a turret railway. A battery once set down can\'t be picked up again.',
  34: 'launches its cargo up to two hexes away (18 hexes), as the ROM\'s launch routine does for it.',
};

// Where the campaign gets a type: production (from which mission), and which missions field it for the Union.
function xpSources(type) {
  const T = xp.types, base = (t) => T[t]?.armed ?? T[t]?.empty ?? t, out = { buy: null, union: [] };
  if (xpIndex && marketTypes(T).some((t) => t.type === type)) {
    if ((xpIndex.start || []).includes(type)) out.buy = 1;
    else {
      const i = xpIndex.missions.findIndex((m) => (m.unlocks || []).includes(type));
      out.buy = i >= 0 ? i + 2 : (xpIndex.allFrom ?? 99) + 1;
    }
  }
  xpMissions.forEach((m, i) => {
    if (!m) return;
    const all = [...m.units, ...(m.arrivals || []).flatMap((a) => a.units.map((u) => ({ ...u, army: a.army })))];
    const here = all.some((u) => u.army === 1 && (base(u.type) === type || (u.cargo || []).some((c) => base(typeof c === 'number' ? c : c.type) === type)));
    if (here) out.union.push(i + 1);
  });
  return out;
}

function xpIcon(type, army) {
  const c = document.createElement('canvas');
  // its own icon (js/art/own.js), else its look's
  paint(c, xp.types[type].ownArt ? typeIcon(rom, xp.types, type, army) : unitIcon(rom, army, xp.types[lookOf(xp.types, type)].gfx, 0), pal, { scale: 2 });
  return c;
}

function expansionUnitsHtml() {
  const T = xp.types, xname = (t) => xp.text.unitNames[t] || T[t].name;
  const list = T.filter((u) => u && !u.cut && u.look !== undefined && u.armed === undefined && u.empty === undefined);
  const extra = [23, 24].filter((t) => T[t] && !T[t].cut);   // ROM units the expansion makes buildable
  const range = (w) => (w.max > w.min ? `${w.min}–${w.max}` : w.min);
  const wtxt = (u) => u.weapons.filter((w) => w && w.power).map((w) => `${MODES[w.mode][0]}${w.power} @${range(w)}`).join(', ') || '—';
  const sideOf = (src) => [src.buy ? `Galt (build from mission ${src.buy})` : '', src.union.length ? `Union (missions ${src.union.join(', ')})` : ''].filter(Boolean).join(' · ') || 'not fielded';
  let html = `<h2 id="expansion-units">Expansion units <small>Galt remnant</small></h2>
    <p class="lede">Units the original ROM defines but never uses, brought back by the expansion, its new machines, and ROM units the
    expansion lets you build. The ROM gives the cut units no graphics of their own, so each one borrows another unit's art, recoloured, and is tagged with its model on the map.
    Prices are in supply (in beta mode everything is free).</p>`;
  // compact table, sortable by clicking a header
  html += `<table class="xtable" id="xtable"><thead><tr>${['Unit', 'Side', 'Price', 'HP', 'Move', 'Evasion', 'Weapons'].map((h, i) => `<th data-col="${i}">${h}</th>`).join('')}</tr></thead><tbody>`;
  for (const u of [...list, ...extra.map((t) => T[t])]) {
    const src = xpSources(u.type), anchor = list.includes(u) ? `xunit-${u.type}` : `unit-${u.type}`;
    html += `<tr><td data-v="${esc(xname(u.type))}"><a href="#${anchor}">${esc(xname(u.type))}</a> <span class="mono dim">${esc(u.code)}</span></td>
      <td data-v="${src.buy ? 'a' : 'b'}${esc(sideOf(src))}">${esc(sideOf(src))}</td><td data-v="${price(T, u.type)}">${price(T, u.type)}</td><td data-v="${u.hp}">${u.hp}</td>
      <td data-v="${u.move}">${u.move}</td><td data-v="${u.evasion}">${Math.round(u.evasion * 100 / 128)}%</td><td data-v="${esc(wtxt(u))}" class="mono">${esc(wtxt(u))}</td></tr>`;
  }
  html += `</tbody></table><p class="note">Expansion rules on ROM units: ${[34, 26, 23, 24].map((t) => `<a href="#unit-${t}">${esc(nameOf(t))}</a>`).join(', ')} (see the notes on their entries).</p><div class="grid">`;
  for (const u of list) {
    const tx = xp.text.unitInfo.find((e) => e.type === u.type), weapons = u.weapons.filter(Boolean), src = xpSources(u.type);
    const spent = T.find((v) => v && v.armed === u.type), loaded = T.find((v) => v && v.empty === u.type);
    html += `<section class="unit" id="xunit-${u.type}"><header><canvas data-xart="${u.type}" style="width:64px;height:64px;image-rendering:pixelated"></canvas><div>
      <h3>${esc(xname(u.type))}</h3><div class="role"><span class="mono">${esc(u.code)}</span>${tx?.short ? ` · ${esc(tx.short)}` : ''}</div>
      <span class="icons" data-xicons="${u.type}"></span></div></header>
      <div class="stats"><span>HP <b>${u.hp}</b></span><span>Move <b>${u.move}</b></span><span>Evasion <b>${Math.round(u.evasion * 100 / 128)}%</b></span><span>Price <b>${price(T, u.type)}</b></span></div>
      <p class="note">${esc(sideOf(src))}</p>`;
    html += weapons.length ? `<table><tr><th>Slot</th><th>Type</th><th>Range</th><th>Power</th></tr>${weapons.map((w) =>
      `<tr><td>W${w.slot + 1}</td><td>${MODES[w.mode]}</td><td>${range(w)}</td><td>${w.power}</td></tr>`).join('')}</table>` : '<p class="note">Unarmed.</p>';
    if (tx?.info) html += `<p>${esc(prose(tx.info[1]))}</p><p>${esc(prose(tx.info[2]))}</p>`;
    const notes = [u.ownArt ? `Its own art (picture, map icon and fight hull, drawn for the expansion); it fights with the <a href="#unit-${u.look}">${esc(nameOf(u.look))}</a>'s moves. Map tag <span class="mono">${esc(u.tag || '')}</span>.`
      : `Borrows the <a href="#unit-${u.look}">${esc(nameOf(u.look))}</a>'s graphics; map tag <span class="mono">${esc(u.tag || '')}</span>.`];
    if (u.type < types.length) notes.push(`Cut from the original: <a href="#unit-${u.type}">ROM entry</a>.`);
    else notes.push('New in the expansion.');
    if (spent) notes.push(`After firing its one-shot W4 it becomes its spent form (type ${spent.type}); re-armed on boarding.`);
    if (loaded) notes.push('A one-unit transport like the Crab: carries one small unit, and can set down a Dragon or Hydra.');
    if (T[u.type].category === 1) notes.push('Carrier: launches small craft next to itself; the general can ride it.');
    html += `<p class="note">${notes.join(' ')}</p></section>`;
  }
  return html + '</div>';
}

// Click a header of the expansion table to sort by it (again to reverse).
function wireXTable() {
  const t = document.getElementById('xtable');
  if (!t) return;
  for (const th of t.querySelectorAll('th')) th.onclick = () => {
    const col = +th.dataset.col, dir = th.dataset.dir === 'asc' ? -1 : 1;
    for (const o of t.querySelectorAll('th')) delete o.dataset.dir;
    th.dataset.dir = dir === 1 ? 'asc' : 'desc';
    const rows = [...t.tBodies[0].rows], val = (r) => r.cells[col].dataset.v, num = rows.every((r) => !isNaN(+val(r)));
    rows.sort((a, b) => dir * (num ? +val(a) - +val(b) : val(a).localeCompare(val(b))));
    t.tBodies[0].append(...rows);
  };
}
