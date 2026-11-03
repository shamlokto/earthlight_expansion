# Post-processing of one generated picture for tools/art/colony-xai.mjs:
#   python3 post.py SRC DST W H [--tile auto|blend|mirror] [--max-kb 60] [--preview PNG] [--focus 0.0-1.0]
# Crops SRC to the aspect of W x H (centred; --focus moves a tall crop's window, 0 = top), resizes
# with Lanczos, optionally makes it tile seamlessly, and writes a compact WebP (quality lowered
# until it is under --max-kb). --preview writes a 3x3 tiling (or a copy) to check the seams.
# Tiling: 'auto' first looks for a repeat inside the picture (the image model often draws its
# 'seamless texture' as two repeats across the frame) and crops exactly one, which tiles by itself;
# whatever still has a seam is offset-and-blended. 'blend' only blends; 'mirror' mirrors into 2x2.
import sys, io, argparse
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('w', type=int); ap.add_argument('h', type=int)
ap.add_argument('--tile', choices=['auto', 'blend', 'mirror']); ap.add_argument('--max-kb', type=float, default=60)
ap.add_argument('--preview'); ap.add_argument('--focus', type=float, default=0.5)
a = ap.parse_args()

im = Image.open(a.src).convert('RGB')
exact = set()                          # axes already cut to an exact repeat (no blending needed)

def find_period(g, axis):
    # strongest self-repeat between 30% and 75% of the side: (period, correlation)
    n = g.shape[axis]; best = (0, 0.0)
    for p in range(int(n * 0.3), int(n * 0.75)):
        x = np.take(g, range(0, n - p), axis=axis).ravel(); y = np.take(g, range(p, n), axis=axis).ravel()
        c = float(np.corrcoef(x, y)[0, 1])
        if c > best[1]: best = (p, c)
    return best

def seam(x, axis):
    # mean jump across the wrap edge relative to the mean jump between neighbours
    inner = np.abs(np.diff(x, axis=axis)).mean()
    edge = np.abs(np.take(x, 0, axis=axis) - np.take(x, -1, axis=axis)).mean()
    return edge / max(inner, 1e-6)

if a.tile == 'auto':
    S = 512; g = np.asarray(im.convert('L').resize((S, S), Image.LANCZOS)).astype(np.float32)
    px, cx = find_period(g, 1); py, cy = find_period(g, 0)
    k = im.width / S
    full = np.asarray(im.convert('L')).astype(np.float32)
    def refine(p, axis):
        # the exact period at full resolution, near the estimate
        n = full.shape[axis]; best = (round(p * k), -1.0)
        for q in range(round(p * k) - 6, round(p * k) + 7):
            x = np.take(full, range(0, n - q), axis=axis).ravel(); y = np.take(full, range(q, n), axis=axis).ravel()
            c = float(np.corrcoef(x, y)[0, 1])
            if c > best[1]: best = (q, c)
        return best[0]
    if cx > 0.7 or cy > 0.7:
        fx = refine(px, 1) if cx > 0.7 else None; fy = refine(py, 0) if cy > 0.7 else None
        if cx > 0.8: exact.add(1)
        if cy > 0.8: exact.add(0)
        fx = fx or fy; fy = fy or fx
        # start the crop a quarter in, away from the picture's own border
        x0 = min(im.width - fx, im.width // 4); y0 = min(im.height - fy, im.height // 4)
        im = im.crop((x0, y0, x0 + fx, y0 + fy)); wx, wy = fx / k, fy / k
        print(f'repeat found: {round(wx * k)}x{round(wy * k)} (corr {cx:.2f}, {cy:.2f})')
W, H = im.size
want = a.w / a.h
if a.tile and abs(W / H - want) < 0.15:  # a texture repeat: stretch a little rather than cut the repeat
    pass
elif W / H > want:                     # too wide: crop the sides
    nw = round(H * want); x0 = (W - nw) // 2; im = im.crop((x0, 0, x0 + nw, H))
elif W / H < want:                     # too tall: crop top/bottom around the focus
    nh = round(W / want); y0 = round((H - nh) * a.focus); im = im.crop((0, y0, W, y0 + nh))

def smooth(t): return t * t * (3 - 2 * t)

def blend_axis(x, axis, frac=0.3):
    """Offset-and-blend along one axis: the edges come from the image rolled by half (whose wrap is
    continuous), the middle from the original; variance-preserving so the blend zone is not blurred."""
    n = x.shape[axis]
    d = np.minimum(np.arange(n), n - 1 - np.arange(n)) / (frac * n)
    w = smooth(np.clip(d, 0, 1))
    shape = [1, 1, 1]; shape[axis] = n; w = w.reshape(shape)
    r = np.roll(x, n // 2, axis=axis)
    m = x.mean(axis=(0, 1), keepdims=True)
    k = np.sqrt(w * w + (1 - w) * (1 - w))
    return m + (w * (x - m) + (1 - w) * (r - m)) / k

if a.tile == 'mirror':
    # mirror into 2x2 (tiles trivially), then back to the target size
    x = np.asarray(im)
    top = np.concatenate([x, x[:, ::-1]], axis=1)
    x = np.concatenate([top, top[::-1]], axis=0)
    im = Image.fromarray(x).resize((a.w, a.h), Image.LANCZOS)
elif a.tile in ('blend', 'auto'):
    s = 2 * max(a.w, a.h)              # blend at twice the size, then reduce
    x = np.asarray(im.resize((s, s * a.h // a.w), Image.LANCZOS)).astype(np.float32)
    for axis in (1, 0):
        sm = seam(x, axis)
        do = a.tile == 'blend' or (axis not in exact and sm > 1.3)
        if do: x = blend_axis(x, axis)
        print(f'axis {"xy"[1 - axis]}: seam {sm:.2f}' + (' (exact repeat)' if axis in exact else '') + (' -> blended' if do else ' ok'))
    im = Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).resize((a.w, a.h), Image.LANCZOS)
else:
    im = im.resize((a.w, a.h), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1, percent=40, threshold=2))

for q in range(85, 39, -5):
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
    if buf.tell() <= a.max_kb * 1024: break
open(a.dst, 'wb').write(buf.getvalue())
print(f'{a.dst} {a.w}x{a.h} q{q} {buf.tell() // 1024} KB')

if a.preview:
    if a.tile:
        p = Image.new('RGB', (a.w * 3, a.h * 3))
        for i in range(3):
            for j in range(3): p.paste(im, (i * a.w, j * a.h))
        p.save(a.preview)
    else:
        im.save(a.preview)
