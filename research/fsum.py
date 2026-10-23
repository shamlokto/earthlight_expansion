# Compact timeline of a recorded fight: per sample, sprite groups by (palette, size).
import sys, pickle, collections; sys.path.insert(0, __file__.rsplit('/',1)[0])
from snes import OUT
fr = pickle.load(open(OUT + sys.argv[1], 'rb'))
def sprites(oam):
    out = []
    for i in range(128):
        x, y, t, a = oam[i*4:i*4+4]; hi = (oam[512 + i//4] >> ((i & 3)*2)) & 3
        x |= (hi & 1) << 8
        if y >= 224: continue
        if x >= 256: x -= 512
        out.append((x, y, t | ((a & 1) << 8), (a >> 1) & 7, (hi >> 1) & 1, a >> 6))
    return out
step = int(sys.argv[2]) if len(sys.argv) > 2 else 30
for k in range(0, len(fr), step):
    f, oam, cg, reg, sc = fr[k]
    g = collections.Counter((p, sz) for x, y, t, p, sz, fl in sprites(oam))
    print(f - fr[0][0], 'm%d' % reg[5], dict(g))
