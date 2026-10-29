# The Nineveh's generated art (expansion type 77, Ahriman's fortress ship, the hidden boss),
# reduced to the formats js/art/nineveh.js holds. Sources in tools/art/nineveh/ (made with
# tools/art/xai-gen.py; prompts p-*.txt):
#   picture-src.jpg  three-quarter view (the unit-info picture, its dark tones lifted first)
#   hull.jpg         top-down plan, bow to the right, 3:4 (the fight hull)
#   side.jpg         side profile, bow to the right (the modern board's token)
# Writes tools/art/nineveh/parts.json; tools/art/nineveh-xai.mjs adds the shape-drawn map icons
# and writes js/art/nineveh.js.
#   python3 tools/art/nineveh-xai.py && node tools/art/nineveh-xai.mjs
# The hull is fitted to the 96x128 box the Nodens's recorded hull settles in (left side: x 1-65,
# y 4-132; js/game/fightdata.js SHIP_ATTACKS['32/1/s']), its main cannon's white-gold muzzle on row
# MUZZLE_Y so the recorded beam (y 60-68 on screen, hull rows 56-64) leaves from it, as the
# Leviathan's does (tools/art/leviathan-xai.py, which this follows).
import json, colorsys, os, subprocess, sys, numpy as np
from collections import deque
from PIL import Image, ImageFilter

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'nineveh')
D36 = '0123456789abcdefghijklmnopqrstuvwxyz'
MUZZLE_Y = 60

def silhouette(im, keep_glow=True):
    a = np.asarray(im).astype(float); h, w, _ = a.shape
    edge = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    mask = np.sqrt(((a - np.median(edge, 0)) ** 2).sum(2)) > 34
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
    # the largest connected part (drops stray sparks of the muzzle's lightning)
    lab = np.zeros(fg.shape, np.int32); best, n = (0, 0), 0
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

def fit(im, fg, W, H, stretch=1.0, dy=0):
    """The machine scaled into W x H (aspect kept, height times `stretch`), centred; dy shifts it."""
    ys, xs = np.where(fg); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    s = min(W / (x1 - x0), H / ((y1 - y0) * stretch))
    tw, th = max(1, round((x1 - x0) * s)), max(1, round((y1 - y0) * s * stretch))
    rgb = np.asarray(im.crop((x0, y0, x1, y1)).resize((tw, th), Image.LANCZOS)).astype(float)
    al = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).crop((x0, y0, x1, y1)).resize((tw, th), Image.LANCZOS)) > 120
    P = np.zeros((H, W), bool); C = np.zeros((H, W, 3))
    X, Y = (W - tw) // 2, (H - th) // 2 + dy
    ys0, ys1 = max(0, Y), min(H, Y + th)
    P[ys0:ys1, X:X + tw] = al[ys0 - Y:ys1 - Y]; C[ys0:ys1, X:X + tw] = rgb[ys0 - Y:ys1 - Y]
    return P, C

def outline(P, idx, v):
    H, W = P.shape
    for y in range(H):
        for x in range(W):
            if not P[y, x] and any(0 <= y + dy < H and 0 <= x + dx < W and P[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))): idx[y, x] = v

def kmeans(P, C, K):
    pts = C[P]; rng = np.random.default_rng(1); cent = pts[rng.choice(len(pts), K, replace=False)]
    for _ in range(25):
        lab = ((pts[:, None] - cent[None]) ** 2).sum(2).argmin(1)
        for k in range(K):
            if (lab == k).any(): cent[k] = pts[lab == k].mean(0)
    cent = np.clip(np.round(cent), 0, 255)
    order = np.argsort(cent.sum(1)); cent = cent[order]; lab = np.argsort(order)[lab]
    idx = np.zeros(P.shape, int); idx[P] = lab + 2; outline(P, idx, 1)
    return idx, ['#000000', '#0c0810'] + ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in cent]

def ship_number(c, bands, lum):
    """A picture colour as a ships' fight-row colour number: 2-7 hull (light to dark), 8-11 the
    accents (dark to light; reds for army B, blues for army A): the gold trim, the engines and the
    cannon's white-gold glow."""
    r, g, b = (v / 255 for v in c); hh, ll, ss = colorsys.rgb_to_hls(r, g, b); hue = hh * 360
    if ss > 0.35 and ll > 0.22 and 25 <= hue <= 65:
        return 8 if ll < 0.32 else 9 if ll < 0.45 else 10 if ll < 0.62 else 11
    if ll > 0.85: return 11
    return [6, 5, 4, 3][int(np.searchsorted(bands, lum))]

def rows(idx): return [''.join(D36[v] for v in r) for r in idx]

def hull():
    im = Image.open(os.path.join(HERE, 'hull.jpg')).convert('RGB')
    fg = silhouette(im)
    # full colour, three times the classic size, for the modern fight renderer
    P3, C3 = fit(im, fg, 288, 384)
    # move the muzzle (the bow's white-gold glow) onto MUZZLE_Y
    glow = lambda P, a: P & (a[:, :, 0] > 235) & (a[:, :, 1] > 205) & (np.arange(a.shape[1])[None, :] > a.shape[1] * 0.72)
    a = C3; vio = glow(P3, a)
    my = int(np.where(vio)[0].mean()) if vio.any() else 192
    dy = MUZZLE_Y * 3 + 1 - my
    P3, C3 = fit(im, fg, 288, 384, dy=dy)
    idx3, pal = kmeans(P3, C3, 32)
    # classic: shrunk 3x (box average), hull tones in bands of this ship's own brightness spread
    rgb = np.array([[[int(pal[v][i:i + 2], 16) for i in (1, 3, 5)] for v in r] for r in idx3], np.uint8)
    sm = np.asarray(Image.fromarray(rgb).filter(ImageFilter.MedianFilter(3)).resize((96, 128), Image.BOX)).astype(float)
    body = np.array([[(idx3[y * 3:y * 3 + 3, x * 3:x * 3 + 3] > 1).sum() >= 4 for x in range(96)] for y in range(128)])
    lum = sm @ [0.3, 0.55, 0.15]; bands = np.percentile(lum[body], [25, 55, 82])
    idx = np.zeros((128, 96), int)
    for y, x in zip(*np.where(body)): idx[y, x] = ship_number(sm[y, x], bands, lum[y, x])
    hullc = (idx >= 3) & (idx <= 7); out = idx.copy()   # majority among the hull tones: bands, not speckle
    for y, x in zip(*np.where(hullc)):
        nb = idx[max(0, y - 1):y + 2, max(0, x - 1):x + 2].ravel(); nb = nb[(nb >= 3) & (nb <= 7)]
        c = np.bincount(nb); out[y, x] = idx[y, x] if c[idx[y, x]] >= 3 else c.argmax()
    outline(body, out, 7)
    ys = np.where(vio)[0] if vio.any() else []
    vy = np.where(glow(P3, C3))
    muzzle = [round(float(vy[1].mean()) / 3, 1), round(float(vy[0].mean()) / 3, 1)] if len(vy[0]) else None
    return {'w': 96, 'h': 128, 'rows': rows(out)}, {'w': 288, 'h': 384, 'palette': pal, 'rows': rows(idx3)}, muzzle

def token():
    im = Image.open(os.path.join(HERE, 'side.jpg')).convert('RGB')
    P, C = fit(im, silhouette(im), 40, 22, stretch=1.45)
    idx, pal = kmeans(P, C, 24)
    pad = np.zeros((24, 40), int); pad[1:23] = idx   # 40x24 with a clear row above and below
    return {'w': 40, 'h': 24, 'palette': pal, 'rows': rows(pad)}

if __name__ == '__main__':
    pic = os.path.join(HERE, 'picture-tmp.json')   # kai-convert.py also writes picture-tmp.png, a preview
    lifted = os.path.join(HERE, 'picture.png')   # the dark obsidian lifted a little so it survives the reduction
    a = np.asarray(Image.open(os.path.join(HERE, 'picture-src.jpg')).convert('RGB')).astype(float) / 255
    Image.fromarray((255 * a ** 0.82).astype(np.uint8)).save(lifted)
    subprocess.run([sys.executable, os.path.join(os.path.dirname(HERE), 'kai-convert.py'), lifted, pic, '96', '32', '#5a5a7b'], check=True)
    h, ha, muzzle = hull()
    json.dump({'art': json.load(open(pic)), 'hull': h, 'hullArt': ha, 'tokenArt': token(), 'muzzle': muzzle}, open(os.path.join(HERE, 'parts.json'), 'w'))
    os.remove(pic); os.remove(pic.replace('.json', '.png'))
    print('muzzle (hull box x, y):', muzzle)
