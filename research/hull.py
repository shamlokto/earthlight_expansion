# Settled sprite layout of the left side (body palettes 0/1) in a recorded fight, relative
# to the leftmost body sprite, plus when it arrives. For capital ships and structures.
# usage: hull.py prefix [frame]   (frame relative to the battle start, default 150)
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
f0 = fr[0][0] + 354; at = int(sys.argv[2]) if len(sys.argv) > 2 else 150
for f, oam, *_ in fr:
    if f - f0 != at: continue
    body = [s for s in sprites(oam) if s[3] in (0, 1)]
    if not body: print('no body sprites'); break
    x0 = min(s[0] for s in body)
    print('x0', x0, 'n', len(body), sorted((x - x0, y, t, sz, fl) for x, y, t, p, sz, fl in body))
# arrival: first frame where the leftmost body x stops changing
xs = []
for f, oam, *_ in fr:
    if f < f0: continue
    b = [s[0] for s in sprites(oam) if s[3] in (0, 1) and s[4] == 32]
    xs.append((f - f0, min(b) if b else None))
moves = [k for (k, x), (_, y) in zip(xs, xs[1:]) if x != y and x is not None and y is not None]
print('leftmost x first/last change', moves[:1], moves[-1:], 'x at 0/30/60/100:', [x for k, x in xs if k in (0, 30, 60, 100)])
