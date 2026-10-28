# The Directorate Talos's map icon, its full-colour version and its board token, from the ready
# pose (tools/art/dirtalos/fight.json posesArt 0, built by tools/art/dirtalos-xai.py):
#   * icon: 24x16, colour numbers of the map icons' army rows (1 white, 2-6 light to dark, 7 near
#     black), facing right; * iconArt: the same in the pose's own colours;
#   * tokenArt: 32x32 in the pose's own colours, facing left like the poses (the modern board).
# Each is the 96x96 pose shrunk by a block majority (the commonest colour of each block, the
# blade and eye winning when they are there), so thin glowing parts survive.
#   python3 tools/art/dirtalos-icons.py   -> tools/art/dirtalos/icons.json
import json, os, colorsys, numpy as np

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dirtalos')
D36 = '0123456789abcdefghijklmnopqrstuvwxyz'
fight = json.load(open(os.path.join(HERE, 'fight.json')))
src = fight['posesArt']['0']
pal = src['palette']; idx = np.array([[int(c, 36) for c in r] for r in src['rows']])
rgb = [tuple(int(p[i:i + 2], 16) for i in (1, 3, 5)) for p in pal]
hls = [colorsys.rgb_to_hls(*(v / 255 for v in c)) for c in rgb]
hot = lambda v: v > 1 and ((hls[v][0] * 360 < 22 or hls[v][0] * 360 > 335) and hls[v][2] > 0.45 or hls[v][1] > 0.85)

def shrink(rows_idx, x0, y0, w, h, W, H, ox, oy, N):
    # the region (x0, y0, w, h) of the 96x96 pose into an N-wide frame of W x H at (ox, oy)
    out = np.zeros((N[1], N[0]), int)
    for y in range(H):
        for x in range(W):
            ya, yb = y0 + int(y * h / H), y0 + max(int(y * h / H) + 1, int((y + 1) * h / H))
            xa, xb = x0 + int(x * w / W), x0 + max(int(x * w / W) + 1, int((x + 1) * w / W))
            blk = rows_idx[ya:yb, xa:xb].ravel(); fg = blk[blk > 1]
            if len(fg) < max(2, len(blk) * 0.4): continue
            h_ = [v for v in fg if hot(v)]
            out[oy + y, ox + x] = np.bincount(h_).argmax() if len(h_) >= max(1, len(fg) // 4) else np.bincount(fg).argmax()
    return out

def outline(img, v):
    H, W = img.shape; o = img.copy()
    for y in range(H):
        for x in range(W):
            if img[y, x] == 0 and any(0 <= y + dy < H and 0 <= x + dx < W and img[y + dy, x + dx] > 1 for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))): o[y, x] = v
    return o

ys, xs = np.where(idx > 1); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
# icon: the machine 15 px tall, facing right (the poses face left)
H = 15; W = min(22, round((x1 - x0) * H / (y1 - y0)))
ic = shrink(idx[:, ::-1], 96 - x1, y0, x1 - x0, y1 - y0, W, H, (24 - W) // 2, 16 - H, (24, 16))
ic = outline(ic, 1)
# colour numbers: by brightness, the hot parts (blade, eye) brightest
lum = {v: hls[v][1] for v in set(ic.ravel()) if v > 1}
icon = np.zeros_like(ic)
if lum:
    # a dark machine: mostly the dark shades, the blade light, the crimson marks mid
    cuts = np.percentile(list(lum.values()), [40, 75, 93])
    for y, x in zip(*np.where(ic > 1)):
        v = ic[y, x]; ll = hls[v][1]
        icon[y, x] = 1 if hot(v) and ll > 0.8 else 2 if hot(v) and ll > 0.55 else 4 if hot(v) else [6, 5, 4, 3][np.searchsorted(cuts, ll)]
icon[ic == 1] = 7
# token: 32x32 facing left, the whole pose
tok = outline(shrink(idx, 0, 0, 96, 96, 32, 32, 0, 0, (32, 32)), 1)

def used(img):   # a compact palette of the colours an image uses
    keep = sorted(set(img.ravel()) - {0}); m = {0: 0, **{v: i + 1 for i, v in enumerate(keep)}}
    return [pal[0]] + [pal[v] for v in keep], [''.join(D36[m[v]] for v in r) for r in img]

ip, ir = used(ic); tp, tr = used(tok)
json.dump({'icon': [''.join(str(v) for v in r) for r in icon], 'iconArt': {'palette': ip, 'rows': ir}, 'tokenArt': {'palette': tp, 'rows': tr}},
          open(os.path.join(HERE, 'icons.json'), 'w'))
print('\n'.join(''.join(str(v) for v in r) for r in icon))
