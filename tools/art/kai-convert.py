# Reduces a generated picture (tools/art/xai-gen.py) to the game's indexed unit-info picture.
#   python3 tools/art/kai-convert.py SRC OUT.json [size=96] [colours=24] [flip] [#backdrop]
# The Kai refits use 96 32 (tools/art/kai/<unit>.json); a 4x preview PNG is written next to OUT.
# Downscales a generated picture on a flat background to the game's indexed unit picture:
# index 0 the backdrop, 1 the outline, the rest a k-means palette of the machine's colours.
import sys, json, numpy as np
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 96
K = int(sys.argv[4]) if len(sys.argv) > 4 else 24
flip = 'flip' in sys.argv
im = Image.open(src).convert('RGB')
if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
a = np.asarray(im).astype(float)
h, w, _ = a.shape
edge = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
bg = np.median(edge, 0)
d = np.sqrt(((a - bg) ** 2).sum(2))
mask = d > 38
# keep the connected silhouette: fill holes from outside by flood fill of background
from collections import deque
outside = np.zeros_like(mask); q = deque()
for y in range(h):
    for x in (0, w - 1):
        if not mask[y, x] and not outside[y, x]: outside[y, x] = 1; q.append((y, x))
for x in range(w):
    for y in (0, h - 1):
        if not mask[y, x] and not outside[y, x]: outside[y, x] = 1; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and not outside[ny, nx]: outside[ny, nx] = 1; q.append((ny, nx))
fg = ~outside.astype(bool)
ys, xs = np.where(fg); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
side = max(y1 - y0, x1 - x0); inner = N - 6
cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)
rgb = im.crop(box).resize((inner, inner), Image.LANCZOS)
al = Image.fromarray((fg * 255).astype(np.uint8)).crop(box).resize((inner, inner), Image.LANCZOS)
rgb = np.asarray(rgb).astype(float); al = np.asarray(al) > 110
P = np.zeros((N, N), bool); C = np.zeros((N, N, 3)); o = 3
P[o:o + inner, o:o + inner] = al; C[o:o + inner, o:o + inner] = rgb
# k-means on the machine's pixels
pts = C[P]; rng = np.random.default_rng(1)
cent = pts[rng.choice(len(pts), K, replace=False)]
for _ in range(30):
    lab = ((pts[:, None] - cent[None]) ** 2).sum(2).argmin(1)
    for k in range(K):
        if (lab == k).any(): cent[k] = pts[lab == k].mean(0)
cent = np.clip(np.round(cent), 0, 255)
order = np.argsort(cent.sum(1)); cent = cent[order]; inv = np.argsort(order); lab = inv[lab]
idx = np.zeros((N, N), int); idx[P] = lab + 2
# 1-px dark outline around the silhouette
sil = P.copy()
for y in range(N):
    for x in range(N):
        if not sil[y, x] and any(0 <= y + dy < N and 0 <= x + dx < N and sil[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))): idx[y, x] = 1
hexc = lambda c: '#%02x%02x%02x' % tuple(int(v) for v in c)
back = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5].startswith('#') else '#6b6b9c'
pal = [back, '#100c18'] + [hexc(c) for c in cent]
assert len(pal) <= 36
d36 = '0123456789abcdefghijklmnopqrstuvwxyz'
rows = [''.join(d36[v] for v in r) for r in idx]
json.dump({'w': N, 'h': N, 'palette': pal, 'rows': rows}, open(out, 'w'))
# preview PNG at 4x
pv = np.array([[tuple(int(pal[v][i:i + 2], 16) for i in (1, 3, 5)) for v in r] for r in idx], np.uint8)
Image.fromarray(pv).resize((N * 4, N * 4), Image.NEAREST).save(out.replace('.json', '.png'))
print(out, len(pal), 'colours')
