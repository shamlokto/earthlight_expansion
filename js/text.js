// Game text. English comes from Nezz's translation patch (GPL-3.0,
// github.com/HoratioVex/Earthlight-1-Translation), applied in memory to the
// user's ROM. Each English block keeps the index order of the original Japanese
// block, whose pointer table is noted alongside.
//
// The original Japanese strings are glyph indices into pre-rendered 12x12 kanji
// sheets (bank $19/$1A), not character codes; rendering them is still to do.

export const BLOCKS = {
  // name: [English pointer table (file offset), count, original Japanese table (SNES)]
  main: [0x108000, 198, 0x07a800],
  labels: [0x110000, 145, 0x07e64a],
  brief: [0x118000, 143, 0x07c5cf],
};
const UNIT_NAMES = 0x00f8f6; // file offset, 58 pointers (lower-case ASCII table)

// Character table used by the patch's text printer ("steely" font).
function steely(b) {
  if (b < 0x5f) return String.fromCharCode(b + 0x20);
  return ({
    0x5f: '©', 0x60: 'in', 0x61: 'il', 0x62: 'li', 0x63: 'll', 0x64: 'ie', 0x65: 'it', 0x66: 'is',
    0x67: "'s", 0x68: "'r", 0x69: "'t", 0x6a: 'ft', 0x6b: 'fi', 0x6f: '…', 0xfe: '\n',
  })[b] ?? `{${b.toString(16)}}`;
}

function readTable(bytes, table, count, decode, endByte) {
  const out = [];
  const bank = table & ~0x7fff;
  for (let i = 0; i < count; i++) {
    const p = bytes[table + i * 2] | (bytes[table + i * 2 + 1] << 8);
    let a = bank + (p - 0x8000), s = '';
    while (bytes[a] !== endByte && s.length < 1000) s += decode(bytes[a++]);
    out.push(tidy(s));
  }
  return out;
}

// Lines are space-padded to the window width; trim the padding.
function tidy(s) {
  return s.split('\n').map((l) => l.trimEnd()).join('\n').replace(/\n+$/, '');
}

export function readEnglish(patched) {
  const b = new Uint8Array(patched);
  const t = {};
  for (const [name, [table, count]] of Object.entries(BLOCKS)) t[name] = readTable(b, table, count, steely, 0xff);
  // ASCII codes; the patch's font draws upper-case letter codes as small caps.
  const ascii = (c) => (c >= 0x41 && c <= 0x5a ? String.fromCharCode(c + 0x20) : String.fromCharCode(c));
  t.unitNames = readTable(b, UNIT_NAMES, 58, ascii, 0x00)
    .map((s) => s.trim().replace(/\b\w/g, (m) => m.toUpperCase()));
  return t;
}

// Indices into the text blocks (structure of the original game's script).
export const LAYOUT = {
  intro: [5, 12],                 // main
  unitInfoStart: 0x0d,            // main: 3 strings per entry (mount label, stats, flavour)
  // Unit types in the order of the unit-info entries.
  unitInfoTypes: [0, 1, 2, 3, 4, 6, 8, 9, 10, 14, 15, 16, 18, 23, 24, 25, 26, 30, 31, 32, 33, 34, 35, 36, 37,
    38, 39, 40, 42, 43, 49, 50, 51, 52, 53, 54, 55, 56, 57],
  // Short dock descriptions (brief 0-22), by unit type.
  shortDescTypes: [0, 1, 2, 3, 4, 8, 9, 10, 14, 15, 16, 18, 23, 24, 25, 26, 39, 40, 42, 43, 49, 50, 51],
  terrainDesc: 130,               // main, by terrain name index ($01:CEF0[type])
  terrainName: 145,
  terrainNames: 15,
  briefings: 23,                  // brief: 4 pages per map
  mapTitles: 97,                  // labels: mission title per map
  missionLost: 68,                // labels: first line after a defeat
  ending: 139,                    // labels: ending, 6 strings
  labelSections: [
    ['Mission won', 0, 9], ['After a loss', 9, 14], ['Points screen', 14, 68], ['Mission lost', 68, 87],
    ['In-game alerts', 87, 97], ['Map titles', 97, 139], ['Ending', 139, 145],
  ],
};

export function unitText(en, type) {
  const k = LAYOUT.unitInfoTypes.indexOf(type);
  const s = LAYOUT.shortDescTypes.indexOf(type);
  return {
    name: en.unitNames[type],
    short: s >= 0 ? en.brief[s] : null,
    info: k >= 0 ? en.main.slice(LAYOUT.unitInfoStart + k * 3, LAYOUT.unitInfoStart + k * 3 + 3) : null,
  };
}
