# Fight poses for the Pallas (expansion types 62-65) from its generated side views
# (tools/art/pallas/*-side.jpg and robot-<pose>.jpg, facing right), turned to face left like the
# ROM's sheets, each as
#   * a 32x32 pose in the small craft's fight-row colour numbers (classic fights, board token):
#     1 black, 2-7 the army colour light to dark, 8-11 the trim, 12-14 cyan, 15 white;
#   * a 96x96 full-colour pose (`posesArt` / `posesArt2`, the modern fight renderer), index 0
#     clear, 1 outline.
#   python3 tools/art/pallas-poses.py   -> tools/art/pallas/poses.json
# The sheet tiles each set stands in for (the Athena's choreography, `look` 4-7;
# js/game/fightscene.js BASE/VARIANT and the melee recordings in js/game/fightdata.js):
#   jet         0 flying
#   jet, spent  0 flying, 64 firing the nose guns
#   robot, slot-0 sheet    0 at rest, 4/8/12 the stride (4 is also its fly-in pose), 64 firing
#   robot, sabre sheet (slots 1-3 load it; the melee recordings draw it)
#                          0/4/8 sabre ready, 12 wind-up, 64 guard, 68 the down-cut,
#                          72 the overhead sweep, 76 the thrust, 128 struck
# The robot frames share one scale (from its body height, blade left out) and stand on the same
# baseline, so the choreography's moves don't make it jitter; anything past the 32x32 frame is cut,
# as on the ROM's sheets.
import json, colorsys, os, numpy as np
from collections import deque
from PIL import Image

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pallas')
D36 = '0123456789abcdefghijklmnopqrstuvwxyz'
N3 = 96   # full-colour size (3x the classic 32)

def is_blade(a):   # the beam sabre: bright cyan-white
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (b > 170) & (g > 170) & (b - r > 20)

def silhouette(a):
    h, w, _ = a.shape
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
    lab = np.zeros(fg.shape, int); best, n = (0, 0), 0   # keep the largest connected part (drops sparks)
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

def outline(P, idx, v):
    N = P.shape[0]
    for y in range(N):
        for x in range(N):
            if not P[y, x] and any(0 <= y + dy < N and 0 <= x + dx < N and P[y + dy, x + dx] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))): idx[y, x] = v

def place(a, fg, scale, cx, base):
    # scale the picture by `scale` (output px per source px), put the point `cx` (source x) at
    # output x 16*3 and the silhouette's bottom on output row `base` (in the 96 frame)
    ys, xs = np.where(fg); y1 = ys.max() + 1
    im = Image.fromarray(a.astype(np.uint8)); W, H = a.shape[1], a.shape[0]
    tw, th = max(1, round(W * scale)), max(1, round(H * scale))
    rgb = np.asarray(im.resize((tw, th), Image.LANCZOS)).astype(float)
    al = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).resize((tw, th), Image.LANCZOS)) > 120
    bl = np.asarray(Image.fromarray((fg & is_blade(a)).astype(np.uint8) * 255).resize((tw, th), Image.BOX)) > 40
    ox, oy = round(48 - cx * scale), round(base - y1 * scale)
    P = np.zeros((N3, N3), bool); C = np.zeros((N3, N3, 3)); B = np.zeros((N3, N3), bool)
    for y in range(th):
        Y = y + oy
        if not 0 <= Y < N3: continue
        x0, x1 = max(0, -ox), min(tw, N3 - ox)
        if x0 >= x1: continue
        P[Y, ox + x0:ox + x1] = al[y, x0:x1] | bl[y, x0:x1]; C[Y, ox + x0:ox + x1] = rgb[y, x0:x1]; B[Y, ox + x0:ox + x1] = bl[y, x0:x1]
    return P, C, B

def full(P, C, B, K=27):
    pts = C[P & ~B]; rng = np.random.default_rng(1); cent = pts[rng.choice(len(pts), K, replace=False)]
    for _ in range(25):
        lab = ((pts[:, None] - cent[None]) ** 2).sum(2).argmin(1)
        for k in range(K):
            if (lab == k).any(): cent[k] = pts[lab == k].mean(0)
    cent = np.clip(np.round(cent), 0, 255)
    idx = np.zeros(P.shape, int); idx[P & ~B] = lab + 2
    pal = ['#000000', '#100c18'] + ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in cent]
    # the blade in three fixed glows, core white: it must read at any size
    pal += ['#3ad6ff', '#a5f7ff', '#ffffff']; nb = len(pal) - 3
    for y, x in zip(*np.where(B)):
        core = sum(B[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if 0 <= y + dy < N3 and 0 <= x + dx < N3)
        idx[y, x] = nb + (2 if core >= 8 else 1 if core >= 5 else 0)
    outline(P, idx, 1)
    return idx, pal

def fight_number(hexc):
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5)); hh, ll, ss = colorsys.rgb_to_hls(r, g, b); hue = hh * 360
    if ll < 0.13: return 1
    if ll > 0.93 and ss < 0.3: return 15
    if 165 <= hue <= 215 and ss > 0.45 and ll > 0.35: return 12 if ll < 0.5 else 13 if ll < 0.7 else 14
    if 200 < hue <= 260 and ss > 0.35: return 8 if ll < 0.3 else 9 if ll < 0.45 else 10 if ll < 0.6 else 11   # blue panels: trim
    if 28 <= hue <= 60 and ss > 0.35: return 9 if ll < 0.45 else 10
    return 0   # army colour: banded below

def classic(idx3, pal, B):
    rgb = np.array([[[int(pal[v][i:i + 2], 16) for i in (1, 3, 5)] for v in r] for r in idx3], np.uint8)
    sm = np.asarray(Image.fromarray(rgb).resize((32, 32), Image.BOX)).astype(float)
    body = np.array([[(idx3[y * 3:y * 3 + 3, x * 3:x * 3 + 3] > 1).sum() >= 4 for x in range(32)] for y in range(32)])
    blade = np.array([[B[y * 3:y * 3 + 3, x * 3:x * 3 + 3].sum() >= 2 for x in range(32)] for y in range(32)])
    # each pixel's kind from the block's average colour (0 army, 1 dark, 8+ trim, 12+ cyan, 15
    # white), then a 3x3 majority of kinds so armour and trim come out as patches, not speckle
    m = body & ~blade
    kind = np.zeros((32, 32), int)
    for y, x in zip(*np.where(m)): kind[y, x] = fight_number('#%02x%02x%02x' % tuple(int(v) for v in sm[y, x]))
    grp = np.where(kind >= 12, 12, np.where(kind >= 8, 8, kind))
    g2 = grp.copy()
    for y, x in zip(*np.where(m & (grp != 1))):
        nb = grp[max(0, y - 1):y + 2, max(0, x - 1):x + 2][m[max(0, y - 1):y + 2, max(0, x - 1):x + 2]]
        nb = nb[nb != 1]; c = np.bincount(nb, minlength=16); g2[y, x] = grp[y, x] if c[grp[y, x]] >= 4 else c.argmax()
    lum = sm @ [0.3, 0.55, 0.15]
    idx = np.zeros((32, 32), int); idx[m & (g2 == 1)] = 1
    for g, tones, q in [(0, [7, 5, 4, 3, 2], [15, 38, 62, 85]), (8, [8, 9, 10], [35, 75]), (12, [12, 13, 14], [35, 75]), (15, [15], [])]:
        s = m & (g2 == g)
        if s.any(): idx[s] = np.array(tones)[np.searchsorted(np.percentile(lum[s], q), lum[s])] if q else tones[0]
    out = idx.copy()
    for y, x in zip(*np.where(m & (idx > 1))):   # and a majority of tones within each kind
        same = g2[max(0, y - 1):y + 2, max(0, x - 1):x + 2] == g2[y, x]
        nb = idx[max(0, y - 1):y + 2, max(0, x - 1):x + 2][same]; c = np.bincount(nb, minlength=16)
        out[y, x] = idx[y, x] if c[idx[y, x]] >= 3 else c.argmax()
    for y, x in zip(*np.where(blade)): out[y, x] = 15 if B[y * 3:y * 3 + 3, x * 3:x * 3 + 3].sum() >= 6 else 14
    outline(body | blade, out, 1)
    return out

def flash(idx, scale, row_hint=None):   # muzzle flash ahead of the gun's tip (the pose's leftmost point)
    N = idx.shape[0]; cols = np.where((idx > 1).any(0))[0]; x0 = cols.min()
    rows = np.where(idx[:, x0] > 1)[0]; yc = int(rows.mean())
    pts = [(0, -1, 'w'), (0, -2, 'w'), (0, -3, 'g'), (-1, -2, 'g'), (1, -2, 'g'), (-2, -2, 'o'), (2, -2, 'o'), (0, -4, 'o')]
    return [(yc + dy * scale + sy, x0 + dx * scale + sx, c) for dy, dx, c in pts for sy in range(scale) for sx in range(scale)
            if 0 <= yc + dy * scale + sy < N and 0 <= x0 + dx * scale + sx < N]

def load(name):
    return np.asarray(Image.open(os.path.join(HERE, name)).convert('RGB').transpose(Image.FLIP_LEFT_RIGHT)).astype(float)

def pose(a, fg, scale, cx, base, fire=False):
    P, C, B = place(a, fg, scale, cx, base)
    idx3, pal = full(P, C, B); idx = classic(idx3, pal, B)
    if fire:
        for y, x, c in flash(idx, 1): idx[y, x] = {'w': 15, 'g': 11, 'o': 10}[c]
        pal = pal + ['#ffffff', '#ffe08a', '#ff9a2e']
        for y, x, c in flash(idx3, 3): idx3[y, x] = len(pal) - 3 + 'wgo'.index(c)
    assert len(pal) <= 36
    return [''.join(D36[v] for v in r) for r in idx], {'w': N3, 'h': N3, 'palette': pal, 'rows': [''.join(D36[v] for v in r) for r in idx3]}

def jet_poses(src, tiles):
    a = load(src); fg = silhouette(a); ys, xs = np.where(fg)
    scale = min(93 / (xs.max() - xs.min() + 1), 66 / (ys.max() - ys.min() + 1))
    cx = (xs.min() + xs.max()) / 2; base = round(48 + (ys.max() - ys.min() + 1) * scale / 2) + 2
    out = {'poses': {}, 'posesArt': {}}
    for t, fire in tiles:
        out['poses'][t], out['posesArt'][t] = pose(a, fg, scale, cx, base, fire)
    return out

def body_metrics(a, fg):
    body = fg & ~is_blade(a); ys, xs = np.where(body)
    feet = ys >= ys.max() - (ys.max() - ys.min()) * 0.15   # the bottom 15%: the feet
    return ys.max() - ys.min() + 1, xs[feet].mean() * 0.5 + np.median(xs) * 0.5

# the robot: one scale for every frame, from the rest pose's body height (blade left out)
ROBOT_H = 84          # body height in the 96 frame (28 classic pixels)
BASE = 94             # the feet's bottom row in the 96 frame
rest = load('robot-side.jpg'); rest_fg = silhouette(rest); rest_h, _ = body_metrics(rest, rest_fg)

def robot(src, fire=False):
    a = load(src); fg = silhouette(a); h, cx = body_metrics(a, fg)
    # every picture draws the robot at about the same size; correct for the frame-to-frame drift
    # with the standing height (crouched and lunging poses are lower on purpose: keep their scale
    # within 15% of the rest pose's)
    k = ROBOT_H / rest_h * float(np.clip(rest_h / h, 0.87, 1.15)) if src in ('robot-side.jpg', 'robot-walkA.jpg', 'robot-walkB.jpg', 'robot-sready.jpg', 'robot-sraise.jpg') else ROBOT_H / rest_h
    return pose(a, fg, k, cx + 3 / k, BASE, fire)

out = {'jet': jet_poses('jet-side.jpg', [(0, False)]), 'spent': jet_poses('spent-side.jpg', [(0, False), (64, True)]),
       'robot': {'poses': {}, 'posesArt': {}, 'poses2': {}, 'posesArt2': {}}}
R = out['robot']
for t, src, fire in [(0, 'robot-side.jpg', False), (4, 'robot-walkA.jpg', False), (8, 'robot-side.jpg', False), (12, 'robot-walkB.jpg', False), (64, 'robot-side.jpg', True)]:
    R['poses'][t], R['posesArt'][t] = robot(src, fire)
for t, src in [(0, 'robot-sready.jpg'), (4, 'robot-sready.jpg'), (8, 'robot-sready.jpg'), (12, 'robot-sraise.jpg'), (64, 'robot-sguard.jpg'),
               (68, 'robot-scut.jpg'), (72, 'robot-sover.jpg'), (76, 'robot-sthrust.jpg'), (128, 'robot-struck.jpg')]:
    R['poses2'][t], R['posesArt2'][t] = robot(src)
json.dump(out, open(os.path.join(HERE, 'poses.json'), 'w'))
print({k: {kk: list(v) for kk, v in s.items()} for k, s in out.items()})
