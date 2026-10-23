# Earth Light asset decoder (Python reference implementation)
import sys
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from snes import rom, lorom

TABLE = 0x00AEF5


class Reader:
    """Sequential LoROM reader that skips to $8000 of the next bank on wrap."""
    def __init__(self, d, addr): self.d = d; self.a = addr
    def byte(self):
        v = self.d[lorom(self.a)]
        a = self.a + 1
        if a & 0xFFFF == 0: a |= 0x8000   # $xx:FFFF -> $(xx+1):8000
        self.a = a; return v


class LZ:
    """256-byte ring LZSS: flag bit 1=literal, 0=copy(pos byte, shared length nibbles)."""
    def __init__(self, r):
        self.r = r; self.ring = bytearray(256); self.w = 0xEF
        self.flags = 0; self.nflags = 0; self.run = 0; self.src = 0
        self.half = 0; self.lenbyte = 0

    def byte(self):
        if self.run:
            self.run -= 1
            return self.copy()
        self.nflags -= 1
        if self.nflags < 0:
            self.flags = self.r.byte(); self.nflags = 7
        bit = self.flags & 0x80; self.flags = (self.flags << 1) & 0xFF
        v = self.r.byte()
        if bit:
            self.ring[self.w] = v; self.w = (self.w + 1) & 255; return v
        self.src = v
        if self.half:
            self.half = 0; self.run = (self.lenbyte >> 4) + 1
        else:
            self.half = 1; self.lenbyte = self.r.byte(); self.run = (self.lenbyte & 15) + 1
        return self.copy()

    def copy(self):
        v = self.ring[self.src]; self.src = (self.src + 1) & 255
        self.ring[self.w] = v; self.w = (self.w + 1) & 255; return v


def xor_planes(get, n):
    """Bitplane row coder: per 16-byte tile-pair: 2 mask bytes; set bit -> read byte, XOR running row."""
    out = bytearray()
    for _ in range(n // 16):
        m0 = get(); m1 = get(); r0 = r1 = 0
        for _ in range(8):
            v = get() if m0 & 0x80 else 0; m0 = (m0 << 1) & 0xFF; r0 ^= v; out.append(r0)
            v = get() if m1 & 0x80 else 0; m1 = (m1 << 1) & 0xFF; r1 ^= v; out.append(r1)
    return out


def entry(d, k):
    e = lorom(TABLE) + k * 10
    w = lambda i: d[e + i] | (d[e + i + 1] << 8)
    return dict(kind=d[e] >> 4, type=d[e] & 15, lead=w(1), data=w(3), trail=w(5),
                ptr=d[e + 7] | (d[e + 8] << 8) | (d[e + 9] << 16))


def decode(d, k, variant=None):
    E = entry(d, k); t = E['type'] if variant is None else variant
    r = Reader(d, E['ptr']); n = E['data']
    if t == 0: body = bytes(r.byte() for _ in range(n))
    elif t == 1: body = xor_planes(r.byte, n)
    elif t == 2: lz = LZ(r); body = bytes(lz.byte() for _ in range(n))
    elif t == 3: lz = LZ(r); body = xor_planes(lz.byte, n)
    return bytes(E['lead']) + bytes(body) + bytes(E['trail']), E
