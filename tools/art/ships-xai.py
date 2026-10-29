# The Azoras's and the Selene Kai's pictures, fight hulls and board tokens from their generated
# sources (tools/art/azoras/, tools/art/selenekai/: picture-src.jpg, a three-quarter view, and
# top-src.jpg, the same ship from directly above with the bow to the right; made with
# tools/art/xai-gen.py from the prompts beside them). Writes <unit>/<unit>-art.json, which
# tools/art/ships-xai.mjs turns into js/art/azoras.js and js/art/selenekai.js with the map icons.
#   python3 tools/art/ships-xai.py
# Every hull is built at three times its size in full colour (the modern fight renderer's
# `hullArt`), then shrunk to the classic hull in the ships' fight-row colour numbers (2-7 hull
# light to dark, 8-11 metal dark to light, outline 7), so both show the same ship. The hulls keep
# the alignment the recorded fights need:
#   Selene Kai `hull` (64x128, bow right): the launch rails centred on box y 11 and 121, where the
#     Selene's barrels fire from;
#   Azoras `hull` (64x128, the Tiamat's broadside against craft, bow up): the hull's left flank
#     over box x 15-28, y 22-110, where the batteries' shots leave;
#   Azoras `hull2` (96x128, the Tiamat's top-down hull against ships, bow right): the wing cannons'
#     muzzles at box x 89-96 on y 3-19 and 101-116, where the beams start (the cannons' barrels
#     are drawn out to the box's right edge).
import json, os, subprocess, sys, colorsys
import numpy as np
from collections import deque
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
D36 = '0123456789abcdefghijklmnopqrstuvwxyz'
BACK = '#7b7bde'   # picture backdrop, index 0 (clear in hulls and tokens)

def silhouette(im):
    a = np.asarray(im).astype(float); h, w, _ = a.shape
    edge = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    mask = np.sqrt(((a - np.median(edge, 0)) ** 2).sum(2)) > 38
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
    lab = np.zeros(fg.shape, int); sizes = {}
    n = 0
    for y0, x0 in zip(*np.where(fg)):
        if lab[y0, x0]: continue
        n += 1; lab[y0, x0] = n; q = deque([(y0, x0)]); size = 0
        while q:
            y, x = q.popleft(); size += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
        sizes[n] = size
    big = max(sizes.values())
    return np.isin(lab, [k for k, v in sizes.items() if v > big * 0.02])   # the ship and its detached parts, no specks

def warp(im, fg, src, dst, W, H):
    """Map the source rectangle src (x0, y0, x1, y1) onto dst in a W x H frame (each axis scaled on its own)."""
    sx0, sy0, sx1, sy1 = src; dx0, dy0, dx1, dy1 = dst
    tw, th = round(dx1 - dx0), round(dy1 - dy0)
    rgb = np.asarray(im.crop((sx0, sy0, sx1, sy1)).resize((tw, th), Image.LANCZOS)).astype(float)
    al = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).crop((sx0, sy0, sx1, sy1)).resize((tw, th), Image.LANCZOS)) > 120
    P = np.zeros((H, W), bool); C = np.zeros((H, W, 3))
    X, Y = round(dx0), round(dy0)
    ys, xs = slice(max(0, Y), min(H, Y + th)), slice(max(0, X), min(W, X + tw))
    P[ys, xs] = al[ys.start - Y:ys.stop - Y, xs.start - X:xs.stop - X]; C[ys, xs] = rgb[ys.start - Y:ys.stop - Y, xs.start - X:xs.stop - X]
    return P, C

def bbox(fg):
    ys, xs = np.where(fg); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def band_centre(fg, top, frac=0.2):
    """Weighted centre row of the outermost band (top or bottom) of the silhouette."""
    x0, y0, x1, y1 = bbox(fg); span = y1 - y0
    rows = range(y0, y0 + int(span * frac)) if top else range(y1 - int(span * frac), y1)
    w = np.array([fg[y].sum() for y in rows], float); r = np.array(list(rows), float)
    return (w * r).sum() / w.sum()

def kmeans(pts, K, seed=1):
    rng = np.random.default_rng(seed); cent = pts[rng.choice(len(pts), min(K, len(pts)), replace=False)].copy()
    for _ in range(25):
        lab = ((pts[:, None] - cent[None]) ** 2).sum(2).argmin(1)
        for k in range(len(cent)):
            if (lab == k).any(): cent[k] = pts[lab == k].mean(0)
    return np.clip(np.round(cent), 0, 255), lab

def outline(P, idx, v):
    H, W = P.shape; out = idx.copy()
    for y in range(H):
        for x in range(W):
            if not P[y, x] and any(0 <= y + dy < H and 0 <= x + dx < W and P[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))): out[y, x] = v
    return out

hexc = lambda c: '#%02x%02x%02x' % tuple(int(v) for v in c)
rows36 = lambda idx: [''.join(D36[v] for v in r) for r in idx]

def full(P, C, K=30):
    """A full-colour picture: index 0 clear, 1 outline, then K colours."""
    cent, lab = kmeans(C[P], K)
    idx = np.zeros(P.shape, int); idx[P] = lab + 2
    return outline(P, idx, 1), [BACK, '#100c18'] + [hexc(c) for c in cent]

def ship_number(c):
    """A picture colour as a colour number of the ships' fight rows."""
    r, g, b = (v / 255 for v in c); hh, ll, ss = colorsys.rgb_to_hls(r, g, b); hue = hh * 360
    metal = (ss > 0.35 and (28 <= hue <= 60 or 165 <= hue <= 215)) or (ss < 0.12 and ll < 0.42)
    if metal: return 8 if ll < 0.3 else 9 if ll < 0.5 else 10 if ll < 0.7 else 11
    return 2 if ll > 0.8 else 3 if ll > 0.66 else 4 if ll > 0.52 else 5 if ll > 0.38 else 6 if ll > 0.24 else 7

def classic(idx3, pal, W, H):
    """The 3x full-colour picture shrunk to W x H: each pixel its block's commonest colour, mapped to the ship rows."""
    rgb = [tuple(int(p[i:i + 2], 16) for i in (1, 3, 5)) for p in pal]
    idx = np.zeros((H, W), int); body = np.zeros((H, W), bool)
    for y in range(H):
        for x in range(W):
            blk = idx3[y * 3:y * 3 + 3, x * 3:x * 3 + 3].ravel(); b = blk[blk > 1]
            if (blk > 0).sum() < 4: continue
            body[y, x] = True
            idx[y, x] = ship_number(rgb[np.bincount(b).argmax()]) if len(b) else 7
    return outline(body, idx, 7)

def stretch_band(P, C, yc, half, x_from, x_to, x_end):
    """Draw a horizontal band (rows yc +- half) out: columns x_from..x_to become x_from..x_end."""
    H, W = P.shape
    for y in range(max(0, int(yc - half)), min(H, int(yc + half) + 1)):
        srcP, srcC = P[y].copy(), C[y].copy()
        for x in range(x_from, min(W, x_end + 1)):
            sx = x_from + (x - x_from) * (x_to - x_from) / max(1, x_end - x_from)
            P[y, x] = srcP[int(round(sx))]; C[y, x] = srcC[int(round(sx))]

def load(unit, name):
    im = Image.open(os.path.join(HERE, unit, name)).convert('RGB')
    return im, silhouette(im)

def picture(unit):
    out = os.path.join(HERE, unit, 'picture.json')
    subprocess.run([sys.executable, os.path.join(HERE, 'kai-convert.py'), os.path.join(HERE, unit, 'picture-src.jpg'), out, '96', '32', BACK], check=True)
    os.remove(out.replace('.json', '.png'))
    art = json.load(open(out)); os.remove(out)
    return art

def token(im, fg, W, H):
    """A board token (bow right): the top view fitted into W x H, in full colour and in the ship rows."""
    x0, y0, x1, y1 = bbox(fg); s = min((W * 3 - 3) / (x1 - x0), (H * 3 - 3) / (y1 - y0))
    w, h = (x1 - x0) * s, (y1 - y0) * s; X, Y = (W * 3 - w) / 2, (H * 3 - h) / 2
    P, C = warp(im, fg, (x0, y0, x1, y1), (X, Y, X + w, Y + h), W * 3, H * 3)
    idx3, pal = full(P, C, 24)
    small = np.zeros((H, W), int); body = np.zeros((H, W), bool)
    for y in range(H):
        for x in range(W):
            blk = idx3[y * 3:y * 3 + 3, x * 3:x * 3 + 3].ravel(); b = blk[blk > 1]
            if (blk > 0).sum() >= 4: body[y, x] = True; small[y, x] = np.bincount(b).argmax() if len(b) else 1
    art = outline(body, small, 1)
    rgb = [tuple(int(p[i:i + 2], 16) for i in (1, 3, 5)) for p in pal]
    num = np.where(art > 1, np.vectorize(lambda v: ship_number(rgb[v]) if v > 1 else 0)(art), np.where(art == 1, 7, 0))
    return {'w': W, 'h': H, 'palette': pal, 'rows': rows36(art)}, {'w': W, 'h': H, 'rows': rows36(num)}

def selene_kai():
    im, fg = load('selenekai', 'top-src.jpg')
    x0, y0, x1, y1 = bbox(fg)
    # the rails: in the outer fifth of the ship on each side, the rows that reach furthest forward
    reach = np.array([np.where(r)[0].max() if r.any() else 0 for r in fg])
    edge = (y1 - y0) // 5
    rail = lambda ys: np.mean([y for y in ys if reach[y] >= reach[ys].max() - (x1 - x0) * 0.03])
    rt, rb = rail(np.arange(y0, y0 + edge)), rail(np.arange(y1 - edge, y1))
    k = (121 - 11) / (rb - rt) * 3                     # rails on box y 11 and 121 (at 3x: 33 and 363)
    dst = (0, 33 - (rt - y0) * k, 192, 33 + (y1 - rt) * k)
    P, C = warp(im, fg, (x0, y0, x1, y1), dst, 192, 384)
    idx3, pal = full(P, C)
    hull = classic(idx3, pal, 64, 128)
    tok_art, tok = token(im, fg, 32, 21)
    return {'art': picture('selenekai'), 'hull': {'w': 64, 'h': 128, 'rows': rows36(hull)},
            'hullArt': {'w': 192, 'h': 384, 'palette': pal, 'rows': rows36(idx3)}, 'token': tok, 'tokenArt': tok_art}

def azoras():
    im, fg = load('azoras', 'top-src.jpg')
    x0, y0, x1, y1 = bbox(fg); ct, cb = band_centre(fg, True, 0.14), band_centre(fg, False, 0.14)
    # hull2 (against ships, bow right): cannons centred on y 11 and 108.5, stern at x 1, prow at x 95
    k = (108.5 - 11) / (cb - ct) * 3
    dst = (3, 33 - (ct - y0) * k, 285, 33 + (y1 - ct) * k)
    P, C = warp(im, fg, (x0, y0, x1, y1), dst, 288, 384)
    # draw the cannons' barrels out to the box's right edge: each band's muzzle is its rightmost
    # pixel; the last stretch of barrel before it is pulled out to x 95 (285 at 3x)
    for yc in (33, 325.5):
        rows = [y for y in range(int(yc - 24), int(yc + 25)) if 0 <= y < 384 and P[y].any()]
        m = max(np.where(P[y])[0].max() for y in rows)
        half = max(abs(y - yc) for y in rows if P[y, max(0, m - 9):m + 1].any()) + 1
        stretch_band(P, C, yc, half, m - 30, m, 287)
    idx3_2, pal2 = full(P, C)
    hull2 = classic(idx3_2, pal2, 96, 128)
    # hull (against craft, bow up): the top view turned a quarter, the drum's axis on box x 30,
    # wings out to x 1 and 59, prow at y 1, stern at y 127
    rim = im.rotate(90, expand=True); rfg = np.rot90(fg)
    rx0, ry0, rx1, ry1 = bbox(rfg)
    P, C = warp(rim, rfg, (rx0, ry0, rx1, ry1), (3, 3, 177, 381), 192, 384)
    idx3, pal = full(P, C)
    hull = classic(idx3, pal, 64, 128)
    tok_art, tok = token(im, fg, 36, 24)
    return {'art': picture('azoras'), 'hull': {'w': 64, 'h': 128, 'rows': rows36(hull)}, 'hull2': {'w': 96, 'h': 128, 'rows': rows36(hull2)},
            'hullArt': {'w': 192, 'h': 384, 'palette': pal, 'rows': rows36(idx3)}, 'hull2Art': {'w': 288, 'h': 384, 'palette': pal2, 'rows': rows36(idx3_2)},
            'token': tok, 'tokenArt': tok_art}

if __name__ == '__main__':   # (tools/art/kai3-xai.py imports the helpers above)
    for unit, fn in (('selenekai', selene_kai), ('azoras', azoras)):
        json.dump(fn(), open(os.path.join(HERE, unit, f'{unit}-art.json'), 'w'))
        print('wrote', f'tools/art/{unit}/{unit}-art.json')
