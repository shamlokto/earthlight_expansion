# The Directorate Talos's fight poses (expansion type 60) from the xAI pose sheets in
# tools/art/dirtalos/ (sheet-move.jpg, sheet-melee-a.jpg, sheet-melee-b.jpg: 3x3 grids of poses
# facing left, prompts beside them), cut out, scaled alike and written to tools/art/dirtalos/fight.json:
#   * `poses`: the first sheet (weapon slot 0, the wrist beam): 0 ready, 4/8/12 the walk, 64 firing;
#     68/72/76/128 as on the second sheet.
#   * `poses2`: the second sheet (slot 2, the beam sabre: js/game/fightdata.js MELEE): 4 the dash
#     in, 0 ready, 68 the first cut, 72 the wind-up, 128 the sabre cocked again, 76 the second cut,
#     8 backing off; 12 and 64 (hovering, guarding) in mutual melees; 132 the slash itself (the
#     recordings draw it as an effect over the cuts, in the body's palette row).
# Each pose is 32x32 in the craft fight rows' colour numbers (1 black, 2-7 the army colour light to
# dark, 8-11 red to gold for army B, 12-14 cyan, 15 white) and 96x96 full colour (`posesArt`,
# `posesArt2`; index 0 clear, 1 outline) for the modern renderer.
#   python3 tools/art/dirtalos-xai.py && node tools/art/dirtalos-xai.mjs
import json, colorsys, os, numpy as np
from collections import deque
from PIL import Image

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dirtalos')
D36 = '0123456789abcdefghijklmnopqrstuvwxyz'

# (sheet, row, column): a cell of a 3x3 sheet
POSES = {0: ('move', 0, 0), 4: ('move', 0, 1), 8: ('move', 0, 2), 12: ('move', 1, 0), 64: ('move', 1, 1),
         68: ('melee-b', 0, 1), 72: ('melee-a', 0, 0), 76: ('melee-a', 1, 0), 128: ('melee-b', 0, 0)}
POSES2 = {0: ('move', 0, 0), 4: ('move', 1, 2), 8: ('move', 2, 0), 12: ('melee-b', 1, 2), 64: ('melee-b', 1, 1),
          68: ('melee-b', 0, 1), 72: ('melee-a', 0, 0), 76: ('melee-a', 1, 0), 128: ('melee-b', 0, 0), 132: ('melee-a', 2, 0)}
EFFECTS = {132}   # not a body: scaled to fill the frame, no ground line

TRIM = {('move', 1, 0): (0, 0, 40, 0)}   # px cut from a cell's left, top, right, bottom: a neighbour's muzzle flash reaches in

def cell(sheet, r, c):
    im = Image.open(os.path.join(HERE, f'sheet-{sheet}.jpg')).convert('RGB')
    w, h = im.size; l, t, rr, b = TRIM.get((sheet, r, c), (0, 0, 0, 0))
    return im.crop((c * w // 3 + l, r * h // 3 + t, (c + 1) * w // 3 - rr, (r + 1) * h // 3 - b))

def cutout(im):
    a = np.asarray(im).astype(float); h, w, _ = a.shape
    edge = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    mask = np.sqrt(((a - np.median(edge, 0)) ** 2).sum(2)) > 40
    # keep the big parts (the machine, its blade, the thrust), drop specks
    lab = np.zeros((h, w), int); keep = np.zeros((h, w), bool); n = 0
    for y0, x0 in zip(*np.where(mask)):
        if lab[y0, x0]: continue
        n += 1; lab[y0, x0] = n; q = deque([(y0, x0)]); pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
        if len(pts) > 400:
            ys, xs = zip(*pts); keep[list(ys), list(xs)] = True
    # fill holes (enclosed background)
    out = np.zeros((h, w), bool); q = deque()
    for y in range(h):
        for x in (0, w - 1):
            if not keep[y, x]: out[y, x] = 1; q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if not keep[y, x] and not out[y, x]: out[y, x] = 1; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not keep[ny, nx] and not out[ny, nx]: out[ny, nx] = 1; q.append((ny, nx))
    return np.asarray(im), ~out

def body_box(rgb, fg):
    # the machine without its glowing blade or thrust: not bright red/orange
    a = rgb.astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    glow = (r > 150) & (r - g > 60) | (r > 200) & (g > 120) & (b < 120)
    m = fg & ~glow
    ys, xs = np.where(m)
    return ys.min(), ys.max() + 1, np.percentile(xs, 50)

def place(rgb, fg, N, scale, anchor):
    # the cut-out scaled by `scale`, its body's middle at anchor x, its feet on anchor y
    ys, xs = np.where(fg); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    tw, th = max(1, round((x1 - x0) * scale)), max(1, round((y1 - y0) * scale))
    im = Image.fromarray(rgb).crop((x0, y0, x1, y1)).resize((tw, th), Image.LANCZOS)
    al = Image.fromarray((fg * 255).astype(np.uint8)).crop((x0, y0, x1, y1)).resize((tw, th), Image.LANCZOS)
    by0, by1, bx = anchor[2]
    X = round(anchor[0] - (bx - x0) * scale); Y = round(anchor[1] - (by1 - y0) * scale)
    P = np.zeros((N, N), bool); C = np.zeros((N, N, 3))
    sx0, sy0 = max(0, -X), max(0, -Y); dx0, dy0 = max(0, X), max(0, Y)
    w, h = min(tw - sx0, N - dx0), min(th - sy0, N - dy0)
    if w > 0 and h > 0:
        P[dy0:dy0 + h, dx0:dx0 + w] = np.asarray(al)[sy0:sy0 + h, sx0:sx0 + w] > 120
        C[dy0:dy0 + h, dx0:dx0 + w] = np.asarray(im)[sy0:sy0 + h, sx0:sx0 + w]
    return P, C

def outline(P, idx, v):
    N = P.shape[0]
    for y in range(N):
        for x in range(N):
            if not P[y, x] and any(0 <= y + dy < N and 0 <= x + dx < N and P[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))): idx[y, x] = v

def full(P, C, K=30):
    pts = C[P]; rng = np.random.default_rng(1); K = min(K, len(pts)); cent = pts[rng.choice(len(pts), K, replace=False)]
    for _ in range(25):
        lab = ((pts[:, None] - cent[None]) ** 2).sum(2).argmin(1)
        for k in range(K):
            if (lab == k).any(): cent[k] = pts[lab == k].mean(0)
    cent = np.clip(np.round(cent), 0, 255)
    idx = np.zeros(P.shape, int); idx[P] = lab + 2; outline(P, idx, 1)
    return idx, ['#000000', '#100c18'] + ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in cent]

def kind(c):   # a colour's role: 'red', 'gold', 'cyan', 'white', 'black' or 'army'
    r, g, b = (v / 255 for v in c); hh, ll, ss = colorsys.rgb_to_hls(r, g, b); hue = hh * 360
    if ll > 0.86 and (ss < 0.6 or ll > 0.93): return 'white', ll
    if ll < 0.1: return 'black', ll
    if (hue < 22 or hue > 335) and ss > 0.45 and ll > 0.2: return 'red', ll
    if 22 <= hue <= 60 and ss > 0.45 and ll > 0.3: return 'gold', ll
    if 165 <= hue <= 215 and ss > 0.45 and ll > 0.35: return 'cyan', ll
    return 'army', ll

def classic(idx3, pal):
    # shrunk 3x: each pixel its block's commonest colour (blades and eye win over the armour so
    # thin glowing lines survive), mapped by role
    idx = np.zeros((32, 32), int); body = np.zeros((32, 32), bool); lums = {}
    pk = [kind(tuple(int(p[i:i + 2], 16) for i in (1, 3, 5))) for p in pal]
    for y in range(32):
        for x in range(32):
            blk = idx3[y * 3:y * 3 + 3, x * 3:x * 3 + 3].ravel(); fgb = blk[blk > 1]
            if len(fgb) < 4: continue
            body[y, x] = True
            hot = [v for v in fgb if pk[v][0] in ('red', 'white', 'cyan')]
            v = np.bincount(hot).argmax() if len(hot) >= 3 else np.bincount(fgb).argmax()
            role, ll = pk[v]
            if role == 'red': idx[y, x] = 8 if ll < 0.32 else 9 if ll < 0.75 else 15   # the blade: red, a white core
            elif role == 'gold': idx[y, x] = 11
            elif role == 'cyan': idx[y, x] = 12 if ll < 0.5 else 13 if ll < 0.7 else 14
            elif role == 'white': idx[y, x] = 15
            elif role == 'black': idx[y, x] = 1
            else: idx[y, x] = -1; lums[(y, x)] = ll
    # the armour: a dark machine, so the army colour's darker half (4-7) with 3 for highlights,
    # banded by this pose's own brightness spread
    if lums:
        v = np.array(list(lums.values())); cuts = np.percentile(v, [25, 55, 85])
        for (y, x), ll in lums.items(): idx[y, x] = [7, 6, 5, 3][np.searchsorted(cuts, ll)]
        # a 3x3 majority among the armour tones, so the shading reads as bands, not speckle
        sm = idx.copy()
        for (y, x) in lums:
            nb = idx[max(0, y - 1):y + 2, max(0, x - 1):x + 2].ravel(); nb = nb[(nb >= 2) & (nb <= 7)]
            c = np.bincount(nb); sm[y, x] = idx[y, x] if c[idx[y, x]] >= 3 else c.argmax()
        idx = sm
    outline(body, idx, 1)
    return idx

def build(table):
    # one scale for every body pose, from the ready pose's height: about 27 px of 32
    rgb0, fg0 = cutout(cell(*POSES[0]))
    by0, by1, _ = body_box(rgb0, fg0); scale32 = 26.0 / (by1 - by0)
    poses, art = {}, {}
    for tile, src in table.items():
        rgb, fg = cutout(cell(*src))
        if tile in EFFECTS:
            ys, xs = np.where(fg); s = 30.0 / max(ys.max() - ys.min() + 1, xs.max() - xs.min() + 1)
            anchor = lambda N, k: (N / 2, N / 2 + (ys.max() - ys.min() + 1) * s * k / 2, ((ys.min() + ys.max()) // 2, ys.max() + 1, (xs.min() + xs.max()) / 2))
            P3, C3 = place(rgb, fg, 96, s * 3, anchor(96, 3))
        else:
            box = body_box(rgb, fg)
            P3, C3 = place(rgb, fg, 96, scale32 * 3, (16 * 3, 31 * 3, box))
        idx3, pal = full(P3, C3)
        poses[tile] = [''.join(D36[v] for v in r) for r in classic(idx3, pal)]
        art[tile] = {'palette': pal, 'rows': [''.join(D36[v] for v in r) for r in idx3]}
    return poses, art

out = {}
out['poses'], out['posesArt'] = build(POSES)
out['poses2'], out['posesArt2'] = build(POSES2)
json.dump(out, open(os.path.join(HERE, 'fight.json'), 'w'))
print('poses', list(out['poses']), 'poses2', list(out['poses2']))
