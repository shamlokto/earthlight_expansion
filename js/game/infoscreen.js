// Pre-fight info screen (first ~4 s of every fight), rewritten from emulator captures of
// the bank $03/$04 fight engine. Everything is drawn on BG3 (2bpp, 32x28 tiles; the frame
// from asset 114 has the priority bit, the phase panels do not) plus 24x16 map icons as
// sprites in the hex diagrams.
//   tiles   assets 105 + 106 + 112 (one 4 KB block, char base) and 113 (+$1000)
//   tilemap asset 114 (frame, labels) ; palette asset 110 (BG3 palettes 0-3)
//   icons   map unit icons (assets 0/1), OBJ palettes from asset 192 (rows 0 / 2)
// With the English patch loaded the same assets come from the patched ROM, which
// redraws the labels ("Flank Bonus", "Support Bonus", "Attack", ...).
import { decodeTile, paletteFromBytes } from '../gfx.js';
import { unitIcon, unitTypeGfx } from '../maps.js';

const W = 256, H = 224;
const NAMES = 0x01ee66, CODES = 0x01f036, EMBLEMS = 0x04ce0e;

// Phase panels, rows 18-26 x cols 9-22, as captured (tile | palette << 10 | h-flip << 14).
// E = 包囲効果 (encirclement, one hex), S = 支援効果 (support, two hexes), T = 地形効果
// (terrain: weapon-mode pill, terrain %, EXP frame with the level emblem).
const PANEL = {
  E: '00eb,0124,0125,0126,40eb,0,0,0,0,eb,0124,0125,0126,40eb ec,0,0,0,ef,0937,0938,0939,093a,40ef,0,0,0,40ec ed,ee,ee,ee,f0,093b,093c,093d,093e,40f0,ee,ee,ee,40ed 0,0,0,0800,013f,0140,0141,4141,4140,413f,4800,0,0,0 0,0,0,0142,0143,0144,0145,4145,4144,4143,4142,0,0,0 0,0,0,0146,0147,0148,0149,4149,4148,4147,4146,0,0,0 0,0,0,0142,0143,0144,0145,4145,4144,4143,4142,0,0,0 0,0,0,0146,0147,0148,0149,4149,4148,4147,4146,0,0,0 0,0,0,0800,014a,014b,014c,414c,414b,414a,0800,0,0,0',
  S: '00eb,0124,0125,0126,40eb,0,0,0,0,eb,0124,0125,0126,40eb ec,0,0,0,ef,0d2f,0d30,0d31,0d32,40ef,0,0,0,40ec ed,ee,ee,ee,f0,0d33,0d34,0d35,0d36,40f0,ee,ee,ee,40ed 0800,014d,014e,014f,414e,414d,4800,0800,014d,014e,014f,414e,414d,4800 0150,0151,0152,0153,4152,4151,4150,0150,0151,0152,0153,4152,4151,4150 0154,0155,0156,0157,4156,4155,4154,0154,0155,0156,0157,4156,4155,4154 0150,0151,0152,0153,4152,4151,4150,0150,0151,0152,0153,4152,4151,4150 0154,0155,0156,0157,4156,4155,4154,0154,0155,0156,0157,4156,4155,4154 0158,0159,015a,015b,415a,4159,4958,0158,0159,015a,015b,415a,4159,4958',
  T: '00eb,0124,0125,0126,40eb,0,0,0,0,eb,0124,0125,0126,40eb ec,0,0,0,ef,0927,0928,0929,092a,40ef,0,0,0,40ec ed,ee,ee,ee,f0,092b,092c,092d,092e,40f0,ee,ee,ee,40ed 0,0,0,0,0,0,0,0,0,0,0,0,0,0 0,0,0,0,0,0,0,0,0,0,0,0,0,0 0d78,0180,0181,0182,4d78,0,0,0,0,0d7c,0180,0181,0182,4d7c 0d79,0,0,0,4d79,0,0,0,0,0d7d,0,0,0,4d7d 0d79,0,0,0,4d79,0,0,0,0,0d7d,0,0,0,4d7d 0d7a,0d7b,0d7b,0d7b,4d7a,0,0,0,0,0d7e,0d7f,0d7f,0d7f,4d7e',
};
const parsePanel = (s) => s.split(' ').map((r) => r.split(',').map((v) => parseInt(v, 16)));

// Hex-diagram icon positions (top-left of the 24x16 icon): centre of the one 包囲 hex and
// of the two 支援 hexes, and the neighbour offsets in the game's scan order SW, NW, N, NE, SE, S.
const ENC_CENTRE = [116, 183], SUP_CENTRE = [[88, 183], [144, 183]];
const DIR = [[-16, 8], [-16, -8], [0, -16], [16, -8], [16, 8], [0, 16]];

// Font on this screen: A-Z = 1-26, half-width katakana (JIS X 0201 $A7-$DF) = code - $8C,
// '-' = $24, digits = $54-$5D, '%' = $5E.
function glyph(c) {
  if (c >= 0x41 && c <= 0x5a) return c - 0x40;
  if (c >= 0x61 && c <= 0x7a) return c - 0x60;
  if (c >= 0x30 && c <= 0x39) return c + 0x24;
  if (c >= 0xa7 && c <= 0xdf) return c - 0x8c;
  if (c === 0x2d) return 0x24;
  if (c === 0x25) return 0x5e;
  return 0;
}

export class InfoScreen {
  // info: Battle.fightInfo() result; left/right: which of info.att/info.def is on each side.
  // opts.textRom: patched ROM for English graphics; opts.names: English unit names.
  constructor(rom, info, opts = {}) {
    const g = opts.textRom || rom;
    this.rom = rom; this.info = info;
    this.left = info.att.unit.army === 0 ? info.att : info.def;
    this.right = this.left === info.att ? info.def : info.att;
    // 2bpp character block as the game uploads it
    const chr = new Uint8Array(0x2000);
    for (const [id, at] of [[105, 0], [106, 0], [112, 0], [113, 0x1000]]) {
      const a = g.asset(id);
      for (let i = 0; i < a.length && at + i < chr.length; i++) if (a[i]) chr[at + i] = a[i];
    }
    this.chr = chr; this.tiles = new Map();
    this.pal = paletteFromBytes(g.body(110));
    this.objPal = paletteFromBytes(rom.body(192));
    this.base = g.body(114);
    this.english = !!opts.names;
    this.names = opts.names;
    this.emblems = [];
    for (let k = 0; k < 10; k++) {
      const row = (o) => [0, 2, 4].map((i) => rom.byteAt(EMBLEMS + k * 16 + o + i) | (rom.byteAt(EMBLEMS + k * 16 + o + i + 1) << 8));
      this.emblems.push([row(0), row(8)]);
    }
    this.buildTimeline();
  }

  // Phase timing, from the captures (frames since the fight started): the screen opens at
  // 30 with a 10-frame brightness ramp, 包囲 at 58 with icons from 80, 支援 at 128 or later,
  // icons every ~8 frames, 地形 about 38 frames after the last icon. ~16 frames later the
  // battle graphics overwrite the BG3 tiles and the battlefield takes over.
  buildTimeline() {
    const icons = [];
    const enc = this.info.encircle;
    let t = 80;
    for (const n of [{ dir: -1, u: enc.centre }, ...enc.around]) { icons.push({ phase: 'E', t, at: ENC_CENTRE, ...n }); t += 10; }
    const tS = Math.max(128, t + 30);
    t = tS + 12;
    const sides = [this.left, this.right].map((s) => this.info.support.find((d) => d.centre === s.unit));
    sides.forEach((d, k) => {
      for (const n of [{ dir: -1, u: d.centre }, ...d.around]) { icons.push({ phase: 'S', t, at: SUP_CENTRE[k], ...n }); t += 8; }
    });
    const tT = Math.max(212, t + 30);
    this.icons = icons;
    this.T = { open: 30, E: 58, S: tS, T: tT, end: tT + 16 };
    this.length = this.T.end;
  }

  tile(n) {
    if (!this.tiles.has(n)) this.tiles.set(n, n * 16 + 16 <= this.chr.length ? decodeTile(this.chr, n * 16, 2) : new Uint8Array(64));
    return this.tiles.get(n);
  }

  // The BG3 tilemap at frame f.
  map(f) {
    const m = new Uint16Array(32 * 28);
    for (let i = 0; i < m.length; i++) m[i] = this.base[i * 2] | (this.base[i * 2 + 1] << 8);
    const put = (r, c, v) => { if (r >= 0 && r < 28 && c >= 0 && c < 32) m[r * 32 + c] = v; };
    const text = (r, c, s) => [...s].forEach((ch, i) => put(r, c + i, glyph(ch.charCodeAt(0))));
    const bytes = (r, c, addr, n) => { for (let i = 0; i < n; i++) put(r, c + i, glyph(this.rom.byteAt(addr + i))); };
    const num = (r, cEnd, v, w = 4) => { const s = String(v); for (let i = 0; i < w; i++) put(r, cEnd - i, i < s.length ? glyph(s.charCodeAt(s.length - 1 - i)) : 0); };
    // panel divider between the two (empty) upper panels
    for (let r = 1; r <= 16; r++) {
      const [a, b] = r === 1 ? [0x185, 0x186] : r === 16 ? [0x183, 0x184] : r & 1 ? [0x189, 0x18a] : [0x187, 0x188];
      put(r, 15, a | 0x400); put(r, 16, b | 0x400);
    }
    const T = this.T;
    const panel = f >= T.T ? 'T' : f >= T.S ? 'S' : f >= T.E ? 'E' : null;
    if (panel) parsePanel(PANEL[panel]).forEach((row, r) => row.forEach((v, c) => put(18 + r, 9 + c, v)));
    // names and model codes; the English patch prints 8-letter names one column further left
    const sides = [[this.left, 2, 11, 8], [this.right, 23, 20, 30]];
    for (const [s, col, kcol, ncol] of sides) {
      const u = s.unit;
      // (u.label / u.code: an expansion unit drawn with another type's graphics, js/look.js)
      if (u.label || this.english) text(19, col - (col === 2 ? 1 : 0), (u.label || this.names[u.type]).toUpperCase().slice(0, 8));
      else bytes(19, col, NAMES + u.type * 8, 8);
      if (u.code) text(20, col - (col === 2 ? 1 : 0), u.code.toUpperCase().slice(0, 7));
      else bytes(20, col - (this.english && col === 2 ? 1 : 0), CODES + u.type * 8, 7);
      // 機数 (machine count): HP for small craft, HP x 2 for ships and structures (captured)
      const t = this.rom.byteAt(0x01f206 + u.type) >> 4;
      text(19, kcol, String(t < 8 ? s.hp * 2 : s.hp));
      // 攻撃力 / 防御力: stage 0 on open, 1 at the support panel, 2 at the terrain panel
      const k = f >= T.T ? 2 : f >= T.S ? 1 : 0;
      num(22, ncol, s.atk[k]); num(25, ncol, s.def[k]);
    }
    if (panel === 'T') {
      [[this.left, 11, 10], [this.right, 17, 19]].forEach(([s, c, ec]) => {
        // weapon-mode pill (B / N / M) and the terrain defence %
        for (let i = 0; i < 4; i++) put(21, c + i, (0x16c + s.mode * 4 + i) | 0x800);
        num(22, c + 2, s.pct, 3); put(22, c + 3, 0x5e);
        // EXP frame: the unit's level emblem ($04:CE0E, 10 levels x 2 rows of 3 tiles)
        const [top, bot] = this.emblems[s.level & 15] || this.emblems[0];
        top.forEach((v, i) => put(24, ec + i, v & 0xff | 0x800)); bot.forEach((v, i) => put(25, ec + i, v & 0xff | 0x800));
      });
    }
    return m;
  }

  render(ctx, f) {
    const img = new ImageData(W, H);
    const d = img.data, back = this.pal[0];
    for (let i = 0; i < W * H; i++) { d[i * 4] = back[0]; d[i * 4 + 1] = back[1]; d[i * 4 + 2] = back[2]; d[i * 4 + 3] = 255; }
    if (f < this.T.open + 2) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
    const m = this.map(f);
    for (let ty = 0; ty < 28; ty++) for (let tx = 0; tx < 32; tx++) {
      const e = m[ty * 32 + tx], n = e & 0x3ff;
      if (!n) continue;
      const px = this.tile(n), p = ((e >> 10) & 7) * 4;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const c = px[(e & 0x8000 ? 7 - y : y) * 8 + (e & 0x4000 ? 7 - x : x)];
        if (!c) continue;
        const col = this.pal[p + c], o = ((ty * 8 + y) * W + tx * 8 + x) * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2];
      }
    }
    // icons: the panel tiles are written without the priority bit, so the sprites show over them
    const phase = f >= this.T.T ? 'T' : f >= this.T.S ? 'S' : 'E';
    for (const ic of this.icons) {
      if (ic.phase !== phase || f < ic.t) continue;
      const u = ic.u, icon = unitIcon(this.rom, u.army, unitTypeGfx(this.rom, u.type));
      const [ox, oy] = ic.dir < 0 ? [0, 0] : DIR[ic.dir];
      const X = ic.at[0] + ox, Y = ic.at[1] + oy;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) {
        const i = y * 24 + x;
        if (!icon.opaque[i]) continue;
        const c = this.objPal[(u.army ? 32 : 0) + (icon.px[i] & 15)], o = ((Y + y) * W + X + x) * 4;
        if (X + x >= 0 && X + x < W && Y + y < H) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; }
      }
    }
    // brightness ramp 0 -> 15 in steps of 4 every 2 frames (INIDISP), from frame 32
    const b = Math.min(15, ((f - this.T.open - 2) >> 1) * 4) / 15;
    if (b < 1) for (let i = 0; i < d.length; i += 4) { d[i] *= b; d[i + 1] *= b; d[i + 2] *= b; }
    ctx.putImageData(img, 0, 0);
  }
}
