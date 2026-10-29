# Fight poses for the Kai refits from their generated side views (tools/art/kai/<unit>-side.jpg,
# facing right): turned to face left like the ROM's sheets, then
#   * a 32x32 pose in the small craft's fight-row colour numbers (classic fights, board token),
#     the full-colour pose shrunk 3x (each pixel its block's commonest colour), mapped by hue:
#     1 black, 2-7 the army colour light to dark, 8-11 the trim (red to gold for army B, blues for
#     army A), 12-14 cyan, 15 white;
#   * a 96x96 full-colour pose (`posesArt`, the modern fight renderer), index 0 clear, 1 outline.
#   python3 tools/art/kai-poses.py   -> tools/art/kai/<unit>-poses.json
# Which sheet tiles each unit's choreography draws (js/game/fightscene.js VARIANT): Lobster 0
# (fly, idle; the engine draws its own flame tiles), Crane 0 and 136 (the flying frame shown 3
# frames in 4), Titan 72 (fly, idle) and 68 (fire, with a muzzle flash).
import json, colorsys, os, numpy as np
from collections import deque
from PIL import Image, ImageFilter

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kai')
D36 = '0123456789abcdefghijklmnopqrstuvwxyz'

def silhouette(im, drop_flame):
    a = np.asarray(im).astype(float); h, w, _ = a.shape
    edge = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    mask = np.sqrt(((a - np.median(edge, 0)) ** 2).sum(2)) > 38
    if drop_flame:   # the bright cyan-white exhaust plume behind the engine
        mask &= ~((a[:, :, 2] > 190) & (a[:, :, 1] > 160) & (a[:, :, 0] < 200) & (a[:, :, 2] - a[:, :, 0] > 25))
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
    fg = ~out.astype(bool)
    # drop specks: keep the largest connected part
    lab = np.zeros(fg.shape, int); best, n = (0, 0), 0
    for y0, x0 in zip(*np.where(fg)):
        if lab[y0, x0]: continue
        n += 1; lab[y0, x0] = n; q = deque([(y0, x0)]); size = 0
        while q:
            y, x = q.popleft(); size += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
        if size > best[1]: best = (n, size)
    return lab == best[0]

def fit(im, fg, N, box, ox, oy):
    ys, xs = np.where(fg); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    s = min(box[0] / (x1 - x0), box[1] / (y1 - y0)); tw, th = max(1, round((x1 - x0) * s)), max(1, round((y1 - y0) * s))
    rgb = np.asarray(im.crop((x0, y0, x1, y1)).resize((tw, th), Image.LANCZOS)).astype(float)
    al = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).crop((x0, y0, x1, y1)).resize((tw, th), Image.LANCZOS)) > 120
    P = np.zeros((N, N), bool); C = np.zeros((N, N, 3))
    X, Y = ox + (box[0] - tw) // 2, oy + (box[1] - th) // 2
    P[Y:Y + th, X:X + tw] = al; C[Y:Y + th, X:X + tw] = rgb
    return P, C

def outline(P, idx, v):
    N = P.shape[0]
    for y in range(N):
        for x in range(N):
            if not P[y, x] and any(0 <= y + dy < N and 0 <= x + dx < N and P[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))): idx[y, x] = v

def fight_number(hexc):   # a picture colour as a craft fight-row colour number
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5)); hh, ll, ss = colorsys.rgb_to_hls(r, g, b); hue = hh * 360
    if ll < 0.13: return 1
    if ll > 0.88 and ss < 0.5: return 15
    if 165 <= hue <= 215 and ss > 0.45 and ll > 0.35: return 12 if ll < 0.5 else 13 if ll < 0.7 else 14
    if 28 <= hue <= 60 and ss > 0.35: return 8 if ll < 0.3 else 9 if ll < 0.45 else 10 if ll < 0.6 else 11
    return 2 if ll > 0.75 else 3 if ll > 0.6 else 4 if ll > 0.45 else 5 if ll > 0.3 else 6 if ll > 0.18 else 7

def classic(idx3, pal):   # the 96x96 pose shrunk 3x into broad bands like the ROM's sprites
    rgb = np.array([[[int(pal[v][i:i + 2], 16) for i in (1, 3, 5)] for v in r] for r in idx3], np.uint8)
    sm = np.asarray(Image.fromarray(rgb).resize((32, 32), Image.BOX)).astype(float)
    body = np.array([[(idx3[y * 3:y * 3 + 3, x * 3:x * 3 + 3] > 1).sum() >= 4 for x in range(32)] for y in range(32)])
    idx = np.zeros((32, 32), int)
    for y, x in zip(*np.where(body)): idx[y, x] = fight_number('#%02x%02x%02x' % tuple(int(v) for v in sm[y, x]))
    # the army colour in five bands set by this sprite's own brightness spread, then a 3x3
    # majority so the shading reads as bands, not speckle
    army = (idx >= 2) & (idx <= 7)
    lum = sm @ [0.3, 0.55, 0.15]; cuts = np.percentile(lum[army], [18, 40, 65, 85])
    idx[army] = np.array([7, 5, 4, 3, 2])[np.searchsorted(cuts, lum[army])]
    out = idx.copy()
    for y, x in zip(*np.where(army)):
        nb = idx[max(0, y - 1):y + 2, max(0, x - 1):x + 2].ravel(); nb = nb[(nb >= 2) & (nb <= 7)]
        c = np.bincount(nb); out[y, x] = idx[y, x] if c[idx[y, x]] >= 3 else c.argmax()
    outline(body, out, 1)
    return out

def full(P, C, K=30):
    pts = C[P]; rng = np.random.default_rng(1); cent = pts[rng.choice(len(pts), K, replace=False)]
    for _ in range(25):
        lab = ((pts[:, None] - cent[None]) ** 2).sum(2).argmin(1)
        for k in range(K):
            if (lab == k).any(): cent[k] = pts[lab == k].mean(0)
    cent = np.clip(np.round(cent), 0, 255)
    idx = np.zeros(P.shape, int); idx[P] = lab + 2; outline(P, idx, 1)
    pal = ['#000000', '#100c18'] + ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in cent]
    return idx, pal

def flash(idx, scale):   # muzzle flash just ahead of the gun's tip (the leftmost point of the pose)
    N = idx.shape[0]; cols = np.where((idx > 1).any(0))[0]; x0 = cols.min()
    rows = np.where(idx[:, x0] > 1)[0]; yc = int(rows.mean())
    pts = [(0, -1, 'w'), (0, -2, 'w'), (0, -3, 'g'), (-1, -2, 'g'), (1, -2, 'g'), (-2, -2, 'o'), (2, -2, 'o'), (0, -4, 'o')]
    return [(yc + dy * scale + sy, x0 + dx * scale + sx, c) for dy, dx, c in pts for sy in range(scale) for sx in range(scale)
            if 0 <= yc + dy * scale + sy < N and 0 <= x0 + dx * scale + sx < N]

UNITS = {
    # unit: (side view, {tile: options}), box (w, h) and offset in the 32x32 frame
    'lobster': ('lobster-side.jpg', {0: {}}, (31, 22), 1, 5),
    'crane': ('crane-side.jpg', {0: {}, 136: {'flame': True}}, (31, 26), 1, 3),
    'titan': ('titan-side.jpg', {72: {}, 68: {'fire': True}}, (27, 31), 5, 1),
}
for u, (src, tiles, box, ox, oy) in UNITS.items():
    im = Image.open(os.path.join(HERE, src)).convert('RGB').transpose(Image.FLIP_LEFT_RIGHT)
    out = {'poses': {}, 'posesArt': {}}
    for tile, opt in tiles.items():
        fg = silhouette(im, drop_flame=not opt.get('flame'))
        P3, C3 = fit(im, fg, 96, (box[0] * 3, box[1] * 3), ox * 3, oy * 3); idx3, pal = full(P3, C3)
        idx = classic(idx3, pal)
        if opt.get('fire'):
            for y, x, c in flash(idx, 1): idx[y, x] = {'w': 15, 'g': 11, 'o': 10}[c]
            extra = {'w': '#ffffff', 'g': '#ffe08a', 'o': '#ff9a2e'}
            for k, v in extra.items(): pal.append(v)
            for y, x, c in flash(idx3, 3): idx3[y, x] = len(pal) - 3 + 'wgo'.index(c)
        out['poses'][tile] = [''.join(D36[v] for v in r) for r in idx]
        out['posesArt'][tile] = {'palette': pal, 'rows': [''.join(D36[v] for v in r) for r in idx3]}
        assert len(pal) <= 36
    json.dump(out, open(os.path.join(HERE, f'{u}-poses.json'), 'w'))
    print(u, 'poses', list(tiles))
