# Fight poses for the Mars Kai (type 69) and the Cyclops Kai (type 70) from the xAI pose sheets in
# tools/art/kai2/ (3x3 grids of poses facing left, prompts beside them), cut out, scaled alike and
# written to tools/art/kai2/<unit>-fight.json:
#   Mars Kai (the Mars's choreography, js/game/fightscene.js BASE)
#     `poses`, the first sheet (slot 0, the beam rifle): 0 ready, 64 firing with the muzzle flash;
#       the walk from its own strip (sheet-mars-walk.jpg): 4 contact (left foot planted ahead, also
#       the flight in), 8 passing (the right knee swinging through, the body at its highest), 12
#       contact the other way;
#     `poses2`, the second sheet (slot 2, the bayonet and point-blank railgun: js/game/fightdata.js
#       MELEE): 4 the dash in, 0 ready, 72 the wind-up, 68 the bayonet lunge, 128 pulled back, 76 the
#       rising slash, 8 backing off; 12 (hovering) and 64 (block) in mutual melees; 132 the strike
#       effect the recordings draw over the cuts, a cyan crescent.
#   Cyclops Kai (VARIANT 16), a missile boat: 0 idle (side view, hatches shut, engines cold), 8 its
#     flight (the same view, engines blazing, the launch hatches open on red-tipped missiles); one
#     generated picture each (sheet-cyclops-idle.jpg, sheet-cyclops-fly.jpg), scaled by the hull's
#     length (30 of 32 px) and centred on the frame's middle instead of a ground line; its
#     hazard-yellow stripes become the light army tones in the classic poses (the trim colours 8-11
#     turn blue on the player's side).
# Each pose is 32x32 in the craft fight rows' colour numbers (1 black, 2-7 the army colour light to
# dark, 8-11 the trim, 12-14 cyan, 15 white) and 96x96 full colour (`posesArt`, `posesArt2`; index 0
# clear, 1 outline) for the modern renderer. One scale per unit (the ready pose's body is 26 px of
# 32) and one ground line, so the machine keeps its size from frame to frame.
#   python3 tools/art/kai2-poses.py && node tools/art/kai2.mjs
import json, colorsys, os, numpy as np
from collections import deque
from PIL import Image

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kai2')
D36 = '0123456789abcdefghijklmnopqrstuvwxyz'

UNITS = {
    'mars': {
        'poses': {0: ('mars-move', 0, 0), 4: ('mars-walk', 0, 0), 8: ('mars-walk', 0, 1), 12: ('mars-walk', 0, 2), 64: ('mars-move', 1, 1)},
        'poses2': {0: ('mars-move', 0, 0), 4: ('mars-melee', 1, 2), 8: ('mars-move', 2, 0), 12: ('mars-melee', 1, 2), 64: ('mars-melee', 1, 1),
                   68: ('mars-melee', 0, 1), 72: ('mars-melee', 0, 0), 76: ('mars-melee', 1, 0), 128: ('mars-melee', 0, 2), 132: ('mars-melee', 2, 0)},
    },
    'cyclops': {
        'poses': {0: ('cyclops-idle', None, None), 8: ('cyclops-fly', None, None)},
        'boat': True, 'goldArmy': True,
    },
}
EFFECTS = {132}   # not a body: scaled to fill the frame, no ground line

TRIM = {('mars-move', 1, 1): (0, 0, 45, 0)}   # px cut from a cell's left, top, right, bottom: the next pose's rifle tip reaches in
# a strip's own cells (left, top, right, bottom), set in the gaps between its poses and above its drawn
# ground line, and the cell whose body is as tall as the move sheet's ready pose, which sets the
# strip's scale so every pose keeps the machine's size
CELLS = {'mars-walk': [(40, 0, 537, 603), (537, 0, 1000, 603), (1000, 0, 1530, 603)]}
MATCH = {'mars-walk': ((0, 1), ('mars-move', 0, 0))}

def cell(sheet, r, c):   # a pose sheet's cell (3x3 grid), or the whole picture when r is None
    im = Image.open(os.path.join(HERE, f'sheet-{sheet}.jpg')).convert('RGB')
    if r is None: return im
    if sheet in CELLS: return im.crop(CELLS[sheet][c])
    w, h = im.size; l, t, rr, b = TRIM.get((sheet, r, c), (0, 0, 0, 0))
    return im.crop((c * w // 3 + l, r * h // 3 + t, (c + 1) * w // 3 - rr, (r + 1) * h // 3 - b))

def components(mask):
    h, w = mask.shape; lab = np.zeros((h, w), int); sizes = [0]; n = 0
    for y0, x0 in zip(*np.where(mask)):
        if lab[y0, x0]: continue
        n += 1; lab[y0, x0] = n; q = deque([(y0, x0)]); s = 0
        while q:
            y, x = q.popleft(); s += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
        sizes.append(s)
    return lab, sizes

def cutout(im, effect=False):
    # the cell's machine: its largest connected part (a neighbour's flash or rifle tip reaching in is
    # cut off), plus any part touching it once grown by 3 px (a bayonet's glow just apart from it);
    # an effect keeps every big part. Enclosed background is filled.
    a = np.asarray(im).astype(float); h, w, _ = a.shape
    edge = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    mask = np.sqrt(((a - np.median(edge, 0)) ** 2).sum(2)) > 40
    lab, sizes = components(mask)
    if effect: keep = np.isin(lab, [i for i, s in enumerate(sizes) if i and s > 300])
    else:
        big = int(np.argmax(sizes)); core = lab == big
        grown = core.copy()
        for _ in range(3): grown = grown | np.roll(grown, 1, 0) | np.roll(grown, -1, 0) | np.roll(grown, 1, 1) | np.roll(grown, -1, 1)
        near = set(np.unique(lab[grown & mask])) - {0}
        keep = np.isin(lab, [i for i in near if sizes[i] > 250 or i == big])
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
    # the machine without its glow (the cyan bayonet and flash, thruster flames): its top, bottom
    # and middle
    a = rgb.astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    glow = ((b > 170) & (g > 170) & (b - r > 40)) | ((r > 200) & (g > 120) & (b < 110))
    ys, xs = np.where(fg & ~glow)
    return ys.min(), ys.max() + 1, np.percentile(xs, 50), xs.min(), xs.max() + 1

def place(rgb, fg, N, scale, anchor):
    # the cut-out scaled by `scale`, its body's middle at anchor x, its feet on anchor y
    ys, xs = np.where(fg); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    tw, th = max(1, round((x1 - x0) * scale)), max(1, round((y1 - y0) * scale))
    im = Image.fromarray(rgb).crop((x0, y0, x1, y1)).resize((tw, th), Image.LANCZOS)
    al = Image.fromarray((fg * 255).astype(np.uint8)).crop((x0, y0, x1, y1)).resize((tw, th), Image.LANCZOS)
    by0, by1, bx = anchor[2][:3]
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

def kind(c):   # a colour's role: 'cyan', 'fire', 'gold', 'white', 'black' or 'army'
    r, g, b = (v / 255 for v in c); hh, ll, ss = colorsys.rgb_to_hls(r, g, b); hue = hh * 360
    if 165 <= hue <= 215 and ss > 0.45 and ll > 0.35: return 'cyan', ll
    if ll > 0.9: return 'white', ll
    if ll < 0.1: return 'black', ll
    if 15 <= hue <= 60 and ss > 0.5 and ll > 0.55: return 'fire', ll
    if 28 <= hue <= 60 and ss > 0.35 and ll > 0.25: return 'gold', ll
    if (hue < 15 or hue > 345) and ss > 0.5 and ll > 0.25: return 'red', ll
    return 'army', ll

def classic(idx3, pal, gold_army=False):
    # gold_army (the charcoal missile boat): the hull in the three darkest army tones, its hazard
    # stripes in the lightest, its red missile tips between, so the dark boat doesn't wash out
    # shrunk 3x: each pixel its block's commonest colour (cyan glow and flame win over the armour so
    # thin glowing lines survive), mapped by role; the armour in five army bands by this pose's own
    # brightness spread, then a 3x3 majority so the shading reads as bands, not speckle
    idx = np.zeros((32, 32), int); body = np.zeros((32, 32), bool); lums = {}
    pk = [kind(tuple(int(p[i:i + 2], 16) for i in (1, 3, 5))) for p in pal]
    for y in range(32):
        for x in range(32):
            blk = idx3[y * 3:y * 3 + 3, x * 3:x * 3 + 3].ravel(); fgb = blk[blk > 1]
            if len(fgb) < 4: continue
            body[y, x] = True
            hot = [v for v in fgb if pk[v][0] in ('cyan', 'fire')]
            v = np.bincount(hot).argmax() if len(hot) >= 3 else np.bincount(fgb).argmax()
            role, ll = pk[v]
            if role == 'cyan': idx[y, x] = 12 if ll < 0.5 else 13 if ll < 0.72 else 14
            elif role == 'fire': idx[y, x] = 14 if ll < 0.75 else 15   # thrust and flashes white-hot (8-11 turn blue for army A)
            elif role == 'gold' and gold_army: idx[y, x] = 2
            elif role == 'red' and gold_army: idx[y, x] = 3
            elif role == 'gold': idx[y, x] = 9 if ll < 0.45 else 10
            elif role == 'white': idx[y, x] = 15
            elif role == 'black': idx[y, x] = 1
            else: idx[y, x] = -1; lums[(y, x)] = ll
    if lums:
        v = np.array(list(lums.values()))
        if gold_army:
            cuts = np.percentile(v, [35, 75])
            for (y, x), ll in lums.items(): idx[y, x] = [7, 6, 5][np.searchsorted(cuts, ll)]
        else:
            cuts = np.percentile(v, [18, 40, 62, 82])
            for (y, x), ll in lums.items(): idx[y, x] = [7, 5, 4, 3, 2][np.searchsorted(cuts, ll)]
        sm = idx.copy()
        for (y, x) in lums:
            nb = idx[max(0, y - 1):y + 2, max(0, x - 1):x + 2].ravel(); nb = nb[(nb >= 2) & (nb <= 7)]
            c = np.bincount(nb); sm[y, x] = idx[y, x] if c[idx[y, x]] >= 3 else c.argmax()
        idx = sm
    outline(body, idx, 1)
    return idx

def sheet_scale(sheet):   # a strip's size relative to the move sheet's (MATCH)
    if sheet not in MATCH: return 1.0
    (r, c), ref = MATCH[sheet]
    a = body_box(*cutout(cell(sheet, r, c))); b = body_box(*cutout(cell(*ref)))
    return (b[1] - b[0]) / (a[1] - a[0])

def build(unit, key, scale32):
    spec = UNITS[unit]; poses, art = {}, {}
    for tile, src in spec[key].items():
        eff = tile in EFFECTS
        rgb, fg = cutout(cell(*src), eff)
        k = sheet_scale(src[0])
        if eff:
            ys, xs = np.where(fg); s = 30.0 / max(ys.max() - ys.min() + 1, xs.max() - xs.min() + 1)
            P3, C3 = place(rgb, fg, 96, s * 3, (48, 48 + (ys.max() - ys.min() + 1) * s * 3 / 2, ((ys.min() + ys.max()) // 2, ys.max() + 1, (xs.min() + xs.max()) / 2)))
        else:
            box = body_box(rgb, fg); bob = spec.get('bob', {}).get((key, tile), 0)
            # a boat floats: its hull's middle on the frame's middle; a mecha stands on the ground line
            foot = 16 + (box[1] - box[0]) * scale32 * k / 2 if spec.get('boat') else 31 - bob
            P3, C3 = place(rgb, fg, 96, scale32 * k * 3, (16 * 3, foot * 3, box))
        idx3, pal = full(P3, C3)
        poses[tile] = [''.join(D36[v] for v in r) for r in classic(idx3, pal, spec.get('goldArmy'))]
        art[tile] = {'palette': pal, 'rows': [''.join(D36[v] for v in r) for r in idx3]}
    return poses, art

for unit, spec in UNITS.items():
    rgb0, fg0 = cutout(cell(*spec['poses'][0]))
    by0, by1, _, bx0, bx1 = body_box(rgb0, fg0)
    scale32 = 30.0 / (bx1 - bx0) if spec.get('boat') else 26.0 / (by1 - by0)
    out = {}
    out['poses'], out['posesArt'] = build(unit, 'poses', scale32)
    if 'poses2' in spec: out['poses2'], out['posesArt2'] = build(unit, 'poses2', scale32)
    json.dump(out, open(os.path.join(HERE, f'{unit}-fight.json'), 'w'))
    print(unit, 'poses', list(out['poses']), 'poses2', list(out.get('poses2', {})))
