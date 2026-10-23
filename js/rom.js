// Earth Light (Japan) ROM access: LoROM mapping, asset table and decompressors.
// Formats were reverse-engineered from the game's own loader at $00:CFDE and
// verified byte-for-byte against the game's output in an emulator trace.

export const ASSET_TABLE = 0x00AEF5; // 10-byte entries, indexed by $0FD7
export const ASSET_COUNT = 835;

export const KIND_NAMES = {
  0: 'tiles', 1: 'tiles', 2: 'tiles', 4: 'tiles (8bpp)',
  5: 'palette', 6: 'tilemap', 7: 'data',
};
export const TYPE_NAMES = { 0: 'raw', 1: 'bitplane-xor', 2: 'lzss', 3: 'lzss+xor' };

export function lorom(addr) {
  return ((addr >> 16) & 0x7f) * 0x8000 + (addr & 0x7fff);
}

export class Rom {
  constructor(buffer) {
    let bytes = new Uint8Array(buffer);
    // Strip a 512-byte copier header if present.
    if (bytes.length % 0x8000 === 512) bytes = bytes.subarray(512);
    this.bytes = bytes;
    this.title = String.fromCharCode(...bytes.subarray(0x7fc0, 0x7fc0 + 21)).trim();
    this.cache = new Map();
  }

  isEarthLight() {
    return this.title === 'EARTH LIGHT' && this.bytes.length === 0x100000;
  }

  byteAt(addr) { return this.bytes[lorom(addr)]; }
  wordAt(addr) { return this.byteAt(addr) | (this.byteAt(addr + 1) << 8); }

  entry(k) {
    const e = lorom(ASSET_TABLE) + k * 10;
    const b = this.bytes;
    const w = (i) => b[e + i] | (b[e + i + 1] << 8);
    return {
      id: k, kind: b[e] >> 4, type: b[e] & 15,
      lead: w(1), data: w(3), trail: w(5),
      ptr: b[e + 7] | (b[e + 8] << 8) | (b[e + 9] << 16),
    };
  }

  // Returns the asset exactly as the game lays it out: `lead` zero bytes,
  // the decoded body, then `trail` zero bytes.
  asset(k) {
    if (this.cache.has(k)) return this.cache.get(k);
    const E = this.entry(k);
    const body = decodeBody(this, E);
    const out = new Uint8Array(E.lead + body.length + E.trail);
    out.set(body, E.lead);
    this.cache.set(k, out);
    return out;
  }

  // Body only (without lead/trail padding).
  body(k) {
    const E = this.entry(k);
    return this.asset(k).subarray(E.lead, E.lead + E.data);
  }
}

class Reader {
  constructor(rom, addr) { this.rom = rom; this.a = addr; }
  byte() {
    const v = this.rom.bytes[lorom(this.a)];
    let a = this.a + 1;
    if ((a & 0xffff) === 0) a |= 0x8000; // $xx:FFFF -> $(xx+1):8000
    this.a = a;
    return v;
  }
}

// 256-byte ring-buffer LZSS (routine at $00:9C55). Ring starts zeroed with the
// write position at $EF. Each flag bit (MSB first): 1 = literal byte,
// 0 = copy from absolute ring position. Copy lengths are 4-bit nibbles shared by
// two consecutive copies (low nibble first), length = nibble + 2.
class Lzss {
  constructor(reader) {
    this.r = reader; this.ring = new Uint8Array(256); this.w = 0xef;
    this.flags = 0; this.nflags = 0; this.run = 0; this.src = 0;
    this.half = 0; this.lenbyte = 0;
  }
  byte() {
    if (this.run) { this.run--; return this.copy(); }
    if (--this.nflags < 0) { this.flags = this.r.byte(); this.nflags = 7; }
    const bit = this.flags & 0x80;
    this.flags = (this.flags << 1) & 0xff;
    const v = this.r.byte();
    if (bit) { this.ring[this.w] = v; this.w = (this.w + 1) & 255; return v; }
    this.src = v;
    if (this.half) { this.half = 0; this.run = (this.lenbyte >> 4) + 1; }
    else { this.half = 1; this.lenbyte = this.r.byte(); this.run = (this.lenbyte & 15) + 1; }
    return this.copy();
  }
  copy() {
    const v = this.ring[this.src]; this.src = (this.src + 1) & 255;
    this.ring[this.w] = v; this.w = (this.w + 1) & 255;
    return v;
  }
}

// Bitplane row coder (routine at $00:D280): per 16 bytes (one 2-plane tile),
// two mask bytes; for each of 8 rows and each plane, a set mask bit means
// "read a byte", which is XORed into the running row value.
function xorPlanes(get, n) {
  const out = new Uint8Array(n);
  let o = 0;
  for (let t = 0; t < n >> 4; t++) {
    let m0 = get(), m1 = get(), r0 = 0, r1 = 0;
    for (let y = 0; y < 8; y++) {
      r0 ^= (m0 & 0x80) ? get() : 0; m0 = (m0 << 1) & 0xff; out[o++] = r0;
      r1 ^= (m1 & 0x80) ? get() : 0; m1 = (m1 << 1) & 0xff; out[o++] = r1;
    }
  }
  return out;
}

function decodeBody(rom, E) {
  const r = new Reader(rom, E.ptr);
  const n = E.data;
  const out = new Uint8Array(n);
  switch (E.type) {
    case 0: for (let i = 0; i < n; i++) out[i] = r.byte(); return out;
    case 1: return xorPlanes(() => r.byte(), n);
    case 2: { const lz = new Lzss(r); for (let i = 0; i < n; i++) out[i] = lz.byte(); return out; }
    case 3: { const lz = new Lzss(r); return xorPlanes(() => lz.byte(), n); }
    default: throw new Error(`asset ${E.id}: unknown type ${E.type}`);
  }
}
