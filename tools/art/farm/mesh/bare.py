#!/usr/bin/env python3
"""bare.py name ... : a "picked" variant of a model whose fruit is painted into its texture (bush, fruit trees).

Reads art/farm/models/<name>.glb, finds the texture pixels that are fruit-coloured (by hue and saturation, per model:
red berries, red apples, peaches, cherries, orange persimmons), repaints them in the tree's own leaf green (keeping each
pixel's light and shade), and writes art/farm/models/<name>_bare.glb plus a manifest entry. The mesh is untouched:
the fruit bumps stay as little leafy knots, which reads well at game distance.
Usage: python3 bare.py bush fruit_tree_apple fruit_tree_peach fruit_tree_cherry fruit_tree_persimmon"""
import io, json, os, struct, sys, colorsys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', 'art', 'farm', 'models')
# hue ranges (0-1) that count as fruit, per model; leaves are greens (~0.2-0.45), trunks are low-saturation browns
FRUIT = {
    'bush': [(0.94, 1.0), (0.0, 0.05)],
    'fruit_tree_apple': [(0.94, 1.0), (0.0, 0.06)],
    'fruit_tree_peach': [(0.9, 1.0), (0.0, 0.14)],
    'fruit_tree_cherry': [(0.94, 1.0), (0.0, 0.04)],
    'fruit_tree_persimmon': [(0.0, 0.12)],
}

SAT = {'fruit_tree_peach': 0.22}   # peaches are pale: a lower saturation threshold catches their highlights

def read_glb(path):
    b = open(path, 'rb').read()
    magic, ver, total = struct.unpack_from('<4sII', b, 0); assert magic == b'glTF'
    off, js, binc = 12, None, None
    while off < total:
        ln, typ = struct.unpack_from('<II', b, off); data = b[off + 8: off + 8 + ln]
        if typ == 0x4E4F534A: js = json.loads(data)
        elif typ == 0x004E4942: binc = bytearray(data)
        off += 8 + ln
    return js, binc

def write_glb(path, js, binc):
    while len(binc) % 4: binc += b'\0'
    j = json.dumps(js, separators=(',', ':')).encode()
    while len(j) % 4: j += b' '
    out = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(j) + 8 + len(binc)) + struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(binc), 0x004E4942) + bytes(binc)
    open(path, 'wb').write(out)

def replace_view(js, binc, vi, new):
    """Swap bufferView vi's bytes for `new`, shifting every later view."""
    v = js['bufferViews'][vi]; start, old = v.get('byteOffset', 0), v['byteLength']
    pad = (-len(new)) % 4; new = new + b'\0' * pad; delta = len(new) - old
    binc[start:start + old] = new
    for w in js['bufferViews']:
        if w is not v and w.get('byteOffset', 0) > start: w['byteOffset'] = w.get('byteOffset', 0) + delta
    v['byteLength'] = len(new) - pad
    js['buffers'][0]['byteLength'] = len(binc)

def bare(name):
    js, binc = read_glb(os.path.join(ROOT, name + '.glb'))
    img = js['images'][0]; vi = img['bufferView']; v = js['bufferViews'][vi]; s = v.get('byteOffset', 0)
    im = Image.open(io.BytesIO(bytes(binc[s:s + v['byteLength']]))).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255
    hsv = np.asarray(im.convert('HSV')).astype(np.float32) / 255
    h, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    fruit = np.zeros(h.shape, bool)
    for lo, hi in FRUIT[name]: fruit |= (h >= lo) & (h <= hi)
    fruit &= (sat > SAT.get(name, 0.42)) & (val > 0.22)
    leaf = (h > 0.17) & (h < 0.45) & (sat > 0.25)
    if not leaf.any(): raise SystemExit(f'{name}: no leaf colour found')
    # cherry and peach blossoms are pink: keep low-saturation pinks (blossom) but not the deep fruit reds
    lc = np.median(a[leaf], axis=0)                       # the tree's leaf green
    lum = (a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11)[..., None]
    llum = float(lc @ np.array([0.3, 0.59, 0.11]))
    green = np.clip(lc[None, None, :] * (0.55 + 0.9 * lum / max(llum, 1e-3)) * 0.85, 0, 1)
    # grow the mask a little so fruit edges and highlights go too
    from PIL import ImageFilter
    m = Image.fromarray((fruit * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
    k = (np.asarray(m).astype(np.float32) / 255)[..., None]
    out = a * (1 - k) + green * k
    buf = io.BytesIO(); Image.fromarray((out * 255).astype(np.uint8)).save(buf, 'JPEG', quality=90)
    replace_view(js, binc, vi, buf.getvalue()); img['mimeType'] = 'image/jpeg'
    dst = os.path.join(ROOT, name + '_bare.glb'); write_glb(dst, js, binc)
    man_p = os.path.join(ROOT, 'manifest.json'); man = json.load(open(man_p))
    e = dict(man[name]); e['file'] = name + '_bare.glb'; e['note'] = f'{name} with its fruit picked (bare.py: fruit repainted leaf green)'; man[name + '_bare'] = e
    json.dump(man, open(man_p, 'w'), indent=1)
    print(name, 'fruit pixels', int(fruit.sum()), '->', dst)

for n in sys.argv[1:]: bare(n)
