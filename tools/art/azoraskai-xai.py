# The Azoras Kai's (type 78) picture, fight hulls and board tokens from its generated sources
# (tools/art/azoraskai/: picture-src.jpg, a three-quarter view, and top-src.jpg, the same ship from
# directly above with the bow to the right; made with tools/art/xai-gen.py from the prompts beside
# them, the Azoras's picture as the reference). Writes azoraskai/azoraskai-art.json, which
# tools/art/azoraskai-xai.mjs turns into js/art/azoraskai.js with the map icons.
#   python3 tools/art/azoraskai-xai.py && node tools/art/azoraskai-xai.mjs
# The same reduction and alignment as the Azoras's (tools/art/ships-xai.py azoras()), whose fight
# moves (the Tiamat's) it shares:
#   `hull2` (96x128, top-down against ships, bow right): the wing cannons' muzzles drawn out to box
#     x 89-96 on y 3-19 and 101-116, where the beams start;
#   `hull` (64x128, against craft, bow up): the top view turned a quarter, its left flank over box
#     x 15-28, y 22-110, where the batteries' shots leave.
import json, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module
S = import_module('ships-xai')   # the ships fork's helpers (its build runs only as a script)

UNIT = 'azoraskai'

def azoras_kai():
    im, fg = S.load(UNIT, 'top-src.jpg')
    x0, y0, x1, y1 = S.bbox(fg); ct, cb = S.band_centre(fg, True, 0.14), S.band_centre(fg, False, 0.14)
    k = (108.5 - 11) / (cb - ct) * 3
    dst = (3, 33 - (ct - y0) * k, 285, 33 + (y1 - ct) * k)
    P, C = S.warp(im, fg, (x0, y0, x1, y1), dst, 288, 384)
    for yc in (33, 325.5):
        rows = [y for y in range(int(yc - 24), int(yc + 25)) if 0 <= y < 384 and P[y].any()]
        m = max(np.where(P[y])[0].max() for y in rows)
        half = max(abs(y - yc) for y in rows if P[y, max(0, m - 9):m + 1].any()) + 1
        S.stretch_band(P, C, yc, half, m - 30, m, 287)
    idx3_2, pal2 = S.full(P, C)
    hull2 = S.classic(idx3_2, pal2, 96, 128)
    rim = im.rotate(90, expand=True); rfg = np.rot90(fg)
    rx0, ry0, rx1, ry1 = S.bbox(rfg)
    P, C = S.warp(rim, rfg, (rx0, ry0, rx1, ry1), (3, 3, 177, 381), 192, 384)
    idx3, pal = S.full(P, C)
    hull = S.classic(idx3, pal, 64, 128)
    tok_art, tok = S.token(im, fg, 36, 24)
    r36 = S.rows36
    return {'art': S.picture(UNIT), 'hull': {'w': 64, 'h': 128, 'rows': r36(hull)}, 'hull2': {'w': 96, 'h': 128, 'rows': r36(hull2)},
            'hullArt': {'w': 192, 'h': 384, 'palette': pal, 'rows': r36(idx3)}, 'hull2Art': {'w': 288, 'h': 384, 'palette': pal2, 'rows': r36(idx3_2)},
            'token': tok, 'tokenArt': tok_art}

if __name__ == '__main__':
    json.dump(azoras_kai(), open(os.path.join(S.HERE, UNIT, f'{UNIT}-art.json'), 'w'))
    print('wrote', f'tools/art/{UNIT}/{UNIT}-art.json')
