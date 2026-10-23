# Compact analysis of a recorded fight: settled layout per side and effect-tile timeline.
# usage: anl.py prefix
import sys, pickle, collections; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from snes import OUT
fr = pickle.load(open(OUT + sys.argv[1] + '_frames.pkl', 'rb'))
f0 = fr[0][0]

def sprites(oam):
    out = []
    for i in range(128):
        x, y, t, a = oam[i*4:i*4+4]; hi = (oam[512 + i//4] >> ((i & 3)*2)) & 3
        x |= (hi & 1) << 8
        if y >= 224: continue
        if x >= 256: x -= 512
        out.append((x, y, t | ((a & 1) << 8), (a >> 1) & 7, 32 if hi & 2 else 8, a >> 6))
    return out

# battle frames only (mode 1 with sprites in body palettes 0 or 3)
body = {0: 'L', 3: 'R'}
first = {}
for f, oam, cg, reg, sc in fr:
    for x, y, t, p, sz, fl in sprites(oam):
        if p in body and body[p] not in first and f - f0 > 300: first[body[p]] = f - f0
print('first body sprite frame', first)

# settled layout: the most common body-sprite arrangement in the last third
tail = fr[len(fr) * 2 // 3:]
for side, pal in (('L', 0), ('R', 3)):
    c = collections.Counter(tuple(sorted((x, y, t, sz, fl) for x, y, t, p, sz, fl in sprites(o) if p == pal)) for _, o, *_ in tail)
    if c:
        lay, n = c.most_common(1)[0]
        print(side, 'settled', len(lay), 'sprites:', list(lay)[:12])

# effect tiles over time (palettes 2 and 5), first frame each tile appears
fx = {}
for f, oam, *_ in fr:
    for x, y, t, p, sz, fl in sprites(oam):
        if p in (2, 5) and (p, t, sz) not in fx and f - f0 > 300: fx[(p, t, sz)] = (f - f0, x, y)
print('effects (pal, tile, size) -> (frame, x, y):', sorted(fx.items(), key=lambda kv: kv[1][0])[:14])
