# Track projectiles and effects in a recorded fight (fight3.py <prefix>_frames.pkl).
# Effect sprites use OBJ palettes 2 (left side) and 5 (right side); some units also fire
# 8x8 sprites in their body palettes (0/1 left, 3/4 right), so all 8x8 sprites are tracked. Sprites are linked
# frame to frame by nearest predicted position; each track prints its palette, size,
# tiles, first/last frame (relative to the first frame with a body sprite), start and end
# position and mean velocity. Also prints each side's body-sprite tile sequence.
# usage: proj.py prefix [min_track_len]
import sys, pickle, collections
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from snes import OUT

fr = pickle.load(open(OUT + sys.argv[1] + '_frames.pkl', 'rb'))
minlen = int(sys.argv[2]) if len(sys.argv) > 2 else 3


def sprites(oam):
    out = []
    for i in range(128):
        x, y, t, a = oam[i*4:i*4+4]; hi = (oam[512 + i//4] >> ((i & 3)*2)) & 3
        x |= (hi & 1) << 8
        if y >= 224: continue
        if x >= 256: x -= 512
        out.append((x, y, t | ((a & 1) << 8), (a >> 1) & 7, 32 if hi & 2 else 8, a >> 6))
    return out


# battle start: first frame with sprites in body palettes after the info screen
f0 = fr[0][0]; start = None
for f, oam, *_ in fr:
    if f - f0 > 240 and any(p in (0, 1, 3, 4) for *_, p, sz, fl in [(s[0], s[1], s[2], s[3], s[4], s[5]) for s in sprites(oam)]):
        start = f; break
start = start or f0
print('battle sprites from frame', start - f0)

tracks, live = [], []
for f, oam, *_ in fr:
    if f < start: continue
    cur = [s for s in sprites(oam) if s[3] in (2, 5) or s[4] == 8]   # effects, plus any 8x8 sprite
    used = set(); nxt = []
    for tr in live:
        lx, ly = tr['pos'][-1]; vx, vy = tr['v']
        best, bd = None, 24
        for k, (x, y, t, p, sz, fl) in enumerate(cur):
            if k in used or p != tr['pal'] or sz != tr['sz']: continue
            d = abs(x - lx - vx) + abs(y - ly - vy)
            if d < bd: best, bd = k, d
        if best is None:
            tracks.append(tr); continue
        used.add(best); x, y, t, p, sz, fl = cur[best]
        tr['v'] = (x - lx, y - ly); tr['pos'].append((x, y)); tr['tiles'][t] += 1; tr['end'] = f; tr['fl'].add(fl)
        nxt.append(tr)
    for k, (x, y, t, p, sz, fl) in enumerate(cur):
        if k not in used:
            nxt.append({'pal': p, 'sz': sz, 'pos': [(x, y)], 'v': (0, 0), 'tiles': collections.Counter({t: 1}), 'beg': f, 'end': f, 'fl': {fl}})
    live = nxt
tracks += live

# group tracks with the same palette/size/tiles and similar velocity
groups = collections.defaultdict(list)
for tr in tracks:
    if len(tr['pos']) < minlen: continue
    n = len(tr['pos']) - 1
    vx = (tr['pos'][-1][0] - tr['pos'][0][0]) / n; vy = (tr['pos'][-1][1] - tr['pos'][0][1]) / n
    key = (tr['pal'], tr['sz'], tuple(sorted(tr['tiles'])), round(vx), round(vy))
    P = tr['pos']; v0 = (P[1][0] - P[0][0], P[1][1] - P[0][1]); v1 = (P[-1][0] - P[-2][0], P[-1][1] - P[-2][1])
    groups[key].append((tr['beg'] - start, tr['end'] - start, P[0], P[-1], sorted(tr['fl']), v0, v1))
for key in sorted(groups, key=lambda k: min(g[0] for g in groups[k])):
    g = groups[key]; pal, sz, tiles, vx, vy = key
    print('pal %d %2dpx tiles %s v=(%d,%d) n=%d frames %d-%d first %s->%s v0 %s v1 %s flip %s' % (
        pal, sz, list(tiles)[:8], vx, vy, len(g), min(x[0] for x in g), max(x[1] for x in g), g[0][2], g[0][3], g[0][5], g[0][6], g[0][4]))

# body tile sequence per side (palettes 0-1 left, 3-4 right): tile set changes over time
for side, pals in (('L', (0, 1)), ('R', (3, 4))):
    prev, seq = None, []
    for f, oam, *_ in fr:
        if f < start: continue
        ts = tuple(sorted(set(t for x, y, t, p, sz, fl in sprites(oam) if p in pals)))
        if ts != prev: seq.append((f - start, ts[:6])); prev = ts
    print(side, 'body tiles:', seq[:14])
