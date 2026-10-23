# Offsets of the left side's 8x8 body-palette sprites (thruster flames etc.) relative to the
# nearest 32x32 body sprite, during the fly-in. usage: flame.py prefix
import sys, pickle, collections
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from snes import OUT


def sprites(oam):
    out = []
    for i in range(128):
        x, y, t, a = oam[i*4:i*4+4]; hi = (oam[512 + i//4] >> ((i & 3)*2)) & 3
        x |= (hi & 1) << 8
        if y >= 224: continue
        if x >= 256: x -= 512
        out.append((x, y, t | ((a & 1) << 8), (a >> 1) & 7, 32 if hi & 2 else 8, a >> 6))
    return out
fr = pickle.load(open(OUT + sys.argv[1] + '_frames.pkl', 'rb'))
f0 = fr[0][0]; c = collections.Counter(); poses = collections.Counter()
for f, oam, *_ in fr:
    if not 354 <= f - f0 < 420: continue
    sp = sprites(oam)
    bodies = [s for s in sp if s[3] in (0, 1) and s[4] == 32]
    for x, y, t, p, sz, fl in sp:
        if p in (0, 1) and sz == 8 and bodies:
            b = min(bodies, key=lambda b: abs(b[0] - x) + abs(b[1] - y))
            c[(t, x - b[0], y - b[1], b[2], (f - f0) & 3)] += 1
    for b in bodies: poses[(b[2], (f - f0) & 3)] += 1
print('flames (tile, dx, dy, body tile, frame&3):', c.most_common(8))
print('body poses (tile, frame&3):', poses.most_common(8))
