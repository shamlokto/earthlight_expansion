# The Naga's fight poses from its generated side view (tools/art/naga/side-src.jpg, guns level,
# facing left like the ROM's sheets).
#   python3 tools/art/naga-poses.py   -> tools/art/naga/poses.json (then node tools/art/naga-xai.mjs)
# The Naga keeps the Phoibos's choreography (`look` 15), whose fights draw four 32x32 poses
# (js/game/fightscene.js VARIANT[15]: walk [4, 8, 12, 8], fly/idle 0): 0 level, 4 and 8 the pod
# tilting its guns up, 12 full elevation with the recoil jets firing. As in the shape-drawn
# version (tools/art/naga.mjs), the whole pod turns about a pivot in its body and lifts a little;
# one scale for all four, chosen so the most raised pose still fits the frame. Each pose comes as
#   * 96x96 full colour (`posesArt`, the modern fight renderer): index 0 clear, 1 outline;
#   * 32x32 in the craft fight rows' colour numbers (classic fights, the modern board's token):
#     1 black, 2-7 the army colour light to dark, 8-11 the trim, 12-14 cyan, 15 white.
import json, colorsys, os, numpy as np
from collections import deque
from PIL import Image, ImageDraw

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'naga')
D36 = '0123456789abcdefghijklmnopqrstuvwxyz'
POSES = {0: (0, 0), 4: (9, -1), 8: (20, -2), 12: (27, -2.5)}   # tile: (degrees up, lift in 32-px units)
JETS = 12

def silhouette(a):
    h, w, _ = a.shape
    edge = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    mask = np.sqrt(((a - np.median(edge, 0)) ** 2).sum(2)) > 40
    out = np.zeros_like(mask); q = deque()
    for y in range(h):
        for x in (0, w - 1):
            if not mask[y, x]: out[y, x] = 1; q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if not mask[y, x] and not out[y, x]: out[y, x] = 1; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and not out[ny, nx]: out[ny, nx] = 1; q.append((ny, nx))
    return ~out.astype(bool)

def outline(P, idx, v):
    N = P.shape[0]
    for y in range(N):
        for x in range(N):
            if not P[y, x] and any(0 <= y + dy < N and 0 <= x + dx < N and P[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))): idx[y, x] = v

def fight_number(c):   # a picture colour as a craft fight-row colour number
    r, g, b = (v / 255 for v in c); hh, ll, ss = colorsys.rgb_to_hls(r, g, b); hue = hh * 360
    if ll < 0.1: return 1
    if ll > 0.88 and ss < 0.5: return 15
    if 165 <= hue <= 225 and ss > 0.45 and ll > 0.3: return 12 if ll < 0.5 else 13 if ll < 0.7 else 14
    if 28 <= hue <= 60 and ss > 0.3 and ll > 0.25: return 8 if ll < 0.35 else 9 if ll < 0.45 else 10 if ll < 0.6 else 11
    return 0   # army colour: banded below

def kmeans(pts, K):
    rng = np.random.default_rng(1); cent = pts[rng.choice(len(pts), K, replace=False)]
    for _ in range(25):
        lab = ((pts[:, None] - cent[None]) ** 2).sum(2).argmin(1)
        for k in range(K):
            if (lab == k).any(): cent[k] = pts[lab == k].mean(0)
    return np.clip(np.round(cent), 0, 255), lab

src = Image.open(os.path.join(HERE, 'side-src.jpg')).convert('RGB')
a = np.asarray(src).astype(float); fg = silhouette(a)
ys, xs = np.where(fg); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
rgba = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); rgba[..., :3] = a[y0:y1, x0:x1]; rgba[..., 3] = fg[y0:y1, x0:x1] * 255
pod = Image.fromarray(rgba, 'RGBA'); W, H = pod.size
pivot = (W * 0.72, H * 0.62)   # in the body, behind the guns' root
pad = max(W, H); canvas = (W + 2 * pad, H + 2 * pad)
def posed(deg, lift_frac):
    c = Image.new('RGBA', canvas); c.paste(pod, (pad, pad))
    c = c.rotate(-deg, resample=Image.BICUBIC, center=(pad + pivot[0], pad + pivot[1]))   # clockwise: the muzzles rise
    return c.transform(c.size, Image.AFFINE, (1, 0, 0, 0, 1, -lift_frac * H), resample=Image.BICUBIC)
# one transform for every pose: the union of their bounding boxes fitted into 30x30 of the frame
lift_unit = 1 / 22   # a 32-px unit of lift, relative to the pod's height at its usual ~22 px
imgs = {t: posed(d, l * lift_unit) for t, (d, l) in POSES.items()}
boxes = [np.argwhere(np.asarray(im)[..., 3] > 100) for im in imgs.values()]
lo = np.min([b.min(0) for b in boxes], 0); hi = np.max([b.max(0) for b in boxes], 0) + 1
s = min(90 / (hi[1] - lo[1]), 80 / (hi[0] - lo[0]))
ox, oy = 3 + (90 - (hi[1] - lo[1]) * s) / 2, 84 - (hi[0] - lo[0]) * s   # above the floor: room for the jets

def at96(im):
    crop = im.crop((lo[1], lo[0], hi[1], hi[0])); tw, th = round(crop.width * s), round(crop.height * s)
    crop = crop.resize((tw, th), Image.LANCZOS); c = Image.new('RGBA', (96, 96)); c.paste(crop, (round(ox), round(oy))); return c

def jets(draw, P, k):   # recoil jets: two short cyan-white plumes under the body's rear
    ys, xs = np.where(P); bottom = ys.max(); rear = xs.max(); cols = [rear - int(26 * k / 3), rear - int(12 * k / 3)]
    for cx in cols:
        rows = np.where(P[:, cx])[0]; top = rows.max() if len(rows) else bottom
        for i, (col, w) in enumerate([((255, 255, 255), 1.0), ((140, 240, 255), 1.6), ((40, 170, 230), 2.2)][::-1]):
            draw.polygon([(cx - w * k, top), (cx + w * k, top), (cx, top + 7 * k * (1 - i * 0.18))], fill=col)

D = {'poses': {}, 'posesArt': {}}
cache = {}
for t in POSES:
    im = at96(imgs[t]); arr = np.asarray(im); P = arr[..., 3] > 110; C = arr[..., :3].astype(float)
    if t == JETS:
        base = Image.fromarray(np.where(P[..., None], arr[..., :3], 0).astype(np.uint8)); d = ImageDraw.Draw(base); jets(d, P, 3)
        jet = np.asarray(base).astype(float); new = (jet.sum(2) > 0) & ~P; C[new] = jet[new]; P = P | new
    cent, lab = kmeans(C[P], 30)
    idx3 = np.zeros((96, 96), int); idx3[P] = lab + 2; outline(P, idx3, 1)
    pal = ['#000000', '#141a12'] + ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in cent]
    D['posesArt'][t] = {'palette': pal, 'rows': [''.join(D36[v] for v in r) for r in idx3]}
    # classic: shrink 3x (box average), cyan/gold/white by hue, the rest as army bands
    sm = np.asarray(Image.fromarray(np.where(P[..., None], C, 0).astype(np.uint8)).resize((32, 32), Image.BOX)).astype(float)
    cover = P.reshape(32, 3, 32, 3).sum((1, 3)); body = cover >= 4
    sm = np.where(cover[..., None] > 0, sm * 9 / np.maximum(cover, 1)[..., None], 0)
    idx = np.zeros((32, 32), int)
    for y, x in zip(*np.where(body)): idx[y, x] = fight_number(np.clip(sm[y, x], 0, 255))
    # army colour: the gun metal (grey) in the dark tones by its own brightness, the armour (the
    # coloured plates) in the light ones by its brightness spread, so guns and body read apart
    army = body & (idx == 0); lum = sm @ [0.3, 0.55, 0.15] / 255
    sat = np.array([[colorsys.rgb_to_hls(*(np.clip(sm[y, x], 0, 255) / 255))[2] for x in range(32)] for y in range(32)])
    metal = army & (sat < 0.22); plate = army & ~metal
    idx[metal] = np.select([lum[metal] < 0.17, lum[metal] < 0.3, lum[metal] < 0.5], [7, 6, 5], 4)
    if plate.any():
        cuts = np.percentile(lum[plate], [25, 55, 85]); idx[plate] = np.array([5, 4, 3, 2])[np.searchsorted(cuts, lum[plate])]
    out = idx.copy()
    for y, x in zip(*np.where(army)):
        nb = idx[max(0, y - 1):y + 2, max(0, x - 1):x + 2].ravel(); nb = nb[(nb >= 2) & (nb <= 7)]
        c = np.bincount(nb); out[y, x] = idx[y, x] if c[idx[y, x]] >= 3 else c.argmax()
    outline(body, out, 1)
    D['poses'][t] = [''.join(D36[v] for v in r) for r in out]
json.dump(D, open(os.path.join(HERE, 'poses.json'), 'w'))
print('poses', list(POSES))
