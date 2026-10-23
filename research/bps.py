# Minimal BPS patcher (beat format). usage: bps.py patch.bps source out
import sys, zlib
def num(p, i):
    v, s = 0, 1
    while True:
        x = p[i]; i += 1
        v += (x & 0x7f) * s
        if x & 0x80: return v, i
        s <<= 7; v += s
p = open(sys.argv[1], 'rb').read(); src = open(sys.argv[2], 'rb').read()
assert p[:4] == b'BPS1'
i = 4
ss, i = num(p, i); ts, i = num(p, i); ms, i = num(p, i); i += ms
assert len(src) == ss, (len(src), ss)
out = bytearray(ts); o = 0; so = to = 0; end = len(p) - 12
while i < end:
    d, i = num(p, i); n = (d >> 2) + 1; a = d & 3
    if a == 0: out[o:o+n] = src[o:o+n]; o += n
    elif a == 1: out[o:o+n] = p[i:i+n]; i += n; o += n
    else:
        off, i = num(p, i); off = (-1 if off & 1 else 1) * (off >> 1)
        if a == 2:
            so += off
            for _ in range(n): out[o] = src[so]; o += 1; so += 1
        else:
            to += off
            for _ in range(n): out[o] = out[to]; o += 1; to += 1
import struct
sc, tc, pc = struct.unpack('<III', p[-12:])
assert zlib.crc32(src) & 0xffffffff == sc, 'source CRC mismatch'
assert zlib.crc32(out) & 0xffffffff == tc, 'target CRC mismatch'
open(sys.argv[3], 'wb').write(out)
print('ok', len(out), 'bytes, target crc %08x' % tc)
